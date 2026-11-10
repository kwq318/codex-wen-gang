---
title: "语音 Agent 选型：S2S 还是三段级联"
source: "https://mp.weixin.qq.com/s/KiFiVI8bAAgUuDaq7jAWuQ"
author:
  - "[[Yuguo]]"
published:
created: 2026-09-23
description: "直接上端到端实时语音模型，还是拼一条 STT、LLM、TTS 流水线？本文用 2026 年的延迟、价格和工程约束把两条路拆开讲，附可运行代码，最后给出一套不押注单一路线的混合架构。"
tags:
  - "clippings"
---
Yuguo Feed *2026年9月14日 22:53*

用户说完一句话，你的 Agent 要多久开口？

如果答案是 1 秒以上，用户会觉得自己在跟一台语音信箱说话；压到 500 毫秒以内，体感就开始接近真人。这中间的几百毫秒，决定了产品是"能用"还是"想用"。

拿到这几百毫秒的方式只有两条路：把语音识别、大模型、语音合成三个服务串成流水线（级联，Cascaded），或者让一个模型直接吃音频、吐音频（Speech-to-Speech，简称 S2S）。两条路我在预研里都跑了一遍，这篇把结论和数据一起摆出来。读完你会知道自己的场景该选哪条，以及怎么设计架构才能在两条路之间随时切换。

## 先纠正一个顺序：是 STT→LLM→TTS，不是反过来

很多人口头会把这条链说成 "TTS → LLM → STT"，顺序其实是反的。正确方向是：用户音频先进 STT（语音识别，也叫 ASR）变成文本，文本进 LLM 生成回复，回复再进 TTS（语音合成）播出去。

每一段都是独立可替换的组件，文本是它们之间的通用接口。这既是最大优点也是最大代价：任何一段都能换供应商、单独调优，但三段串行，延迟只能叠加。

一条典型级联的延迟预算：STT 首字 100 到 300 毫秒，LLM 首 token 200 到 600 毫秒，TTS 首包 75 到 300 毫秒，再加 50 到 200 毫秒网络。从用户说完到 Agent 开口（TTFA，Time-to-First-Audio）通常在 600 到 1200 毫秒，没做流式优化的生产系统跑到 1.5 到 3 秒也很常见。

用 Pipecat 这类编排框架写一条级联，核心代码大概是这个样子：

```
# Pipecat 风格的级联 pipeline，每个节点都是可替换的服务
pipeline = Pipeline([
    transport.input(),           # WebRTC 音频进
    stt_service,                 # Deepgram / 火山 ASR / SenseVoice
    context_aggregator.user(),   # 拼用户消息进上下文
    llm_service,                 # GPT / 千问 / 豆包，流式输出
    tts_service,                 # ElevenLabs / 豆包 TTS / CosyVoice，流式合成
    transport.output(),          # 音频出
    context_aggregator.assistant(),
])
```

每一行都是一个供应商决策，每一个箭头都是一次流式交接。级联的工程量主要就花在这些交接上：缓冲、打断、状态机、半句话怎么送进 TTS。

## S2S 用一次推理换掉三次交接

端到端实时语音模型的思路是直接砍掉中间环节：音频 token 进，音频 token 出，一条 WebRTC 或 WebSocket 连接搞定。OpenAI 的 gpt-realtime、Google 的 Gemini Live、火山引擎的豆包端到端实时语音、阿里云的 Qwen-Omni-Realtime，都属于这一类。

它带来两件级联给不了的东西。

第一是延迟。S2S 的 TTFA 典型值在 300 到 500 毫秒，基本不需要调优就能拿到。开源的全双工模型更激进，Kyutai 的 Moshi 做到了 160 毫秒左右，NVIDIA 的 PersonaPlex 大约 205 毫秒。这些数字级联即便拼尽全力也很难摸到。

第二是副语言信息。STT 一旦把语音转成文字，语气、情绪、停顿、口音、方言腔调就全丢了。S2S 模型能"听出"用户在犹豫还是在生气，然后用相应的语气回应。做口语陪练、陪伴类产品的人，对这点体会最深：级联版本再流畅也像在念稿，S2S 版本才像在聊天。

接入方式也简单到让人不敢相信。以 OpenAI Realtime 为例，建立连接后只需要一条会话配置消息：

```
import json, websocket

ws = websocket.create_connection(
    "wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1-mini",
    header=[f"Authorization: Bearer {API_KEY}", "OpenAI-Beta: realtime=v1"],
)
ws.send(json.dumps({
    "type": "session.update",
    "session": {
        "modalities": ["audio", "text"],       # 同时要音频和文本转写
        "voice": "marin",
        "turn_detection": {"type": "semantic_vad"},  # 让模型判断用户是否说完
        "tools": [{"type": "function", "name": "lookup_order", "parameters": {...}}],
    },
}))
# 之后把 PCM16 音频块以 input_audio_buffer.append 事件持续推进去即可
```

注意其中的 `"modalities": ["audio", "text"]` ：这一行让 S2S 模型在输出音频的同时给你文本转写。后面讲混合架构时，这条"文本旁路"是关键。

## 但 S2S 是个黑盒，而且很贵吗

S2S 的短板同样明确，做决策前必须看清楚。

可控性是第一道坎。文本 LLM 那套成熟的手段，系统提示、few-shot、RAG、复杂的 function calling、输出校验，在 S2S 上要么打折，要么根本不适用。2026 年 7 月发布的 gpt-realtime-2.1 加上了可配置的推理档位，指令遵循比上一代好了不少，但跟同代文本模型比仍有差距。工具数量一多（经验上超过 3 到 5 个）就开始不稳定。开源全双工模型更夸张，Moshi 的任务遵循度评分只有 1.26 分（满分 5），基本只能闲聊。

可观测性是第二道坎。级联出问题时，你能看到是 STT 听错了、LLM 答错了还是 TTS 读错了，每一段都有独立的 span。S2S 是一次黑盒调用，只能靠转写抽样反推。教育、金融、医疗这类要逐段审计的场景，会天然倾向级联。

供应商锁定是第三道坎。级联的三段可以独立热替换，S2S 换供应商等于把 prompt 和体验调优全部重做。已经有一套文本 Agent、评测集、微调模型的团队，切到 S2S 意味着这些资产大部分作废。

那么价格呢？这是变化最快的一项，2026 年的数据已经和一年前完全不同：

| 方案 | 每分钟成本（USD，约） | 备注 |
| --- | --- | --- |
| 级联 BYOK（Deepgram + GPT 级 LLM + ElevenLabs） | 0.06 到 0.19 | TTS 是最大项 |
| 级联，TTS 换国产或开源 | 0.03 到 0.08 |  |
| OpenAI gpt-realtime-2.1，无缓存 | 0.18 到 0.46 | 上下文随轮次累积重复计费 |
| OpenAI gpt-realtime-2.1，启用缓存 | 0.05 到 0.10 | 缓存输入 $0.40/M token |
| Gemini 3.1 Flash Live | 0.012 到 0.023 | 输入 $0.005/min，输出 $0.018/min |
| 豆包、Qwen-Omni-Realtime | 低于 OpenAI | 按音频 token 计费，以当期报价为准 |

结论有点反直觉：S2S 和级联的成本差距已经不是数量级，Gemini Flash Live 和国产 S2S 甚至比海外级联组合还便宜。真正的成本风险不在单价，而在 S2S 的上下文累积：会话越长越贵，而且你没法像级联那样把"想"的部分换成一个便宜的 LLM。

用一段代码就能算清自己场景的账：

```
def cost_per_minute(user_ratio=0.5, in_per_min=0.005, out_per_min=0.018):
    # 双方各说一半时，输入和输出都只计一半分钟
    return user_ratio * in_per_min + (1 - user_ratio) * out_per_min

print(f"Gemini Flash Live: ${cost_per_minute():.4f}/min")            # 0.0115
print(f"Cascade (国产 TTS): ${0.015 + 0.02 + 0.02:.4f}/min")          # 0.0550
```

跑一遍就会发现，多数场景下先纠结成本是浪费时间，该纠结的是可控性。

## 别选边，用半级联把两条路接在一起

预研做完，我的建议不是"选 S2S"或"选级联"，而是搭一个能在两者之间切换的骨架。

核心思路只有一句话： **业务逻辑只写在文本层一次** 。系统提示、RAG、工具定义、护栏、评测集，全部放在文本层；语音入口和出口作为可插拔节点，按场景决定用 S2S 还是 STT/TTS。

![半级联混合架构：会话路由按场景分流到 S2S 或级联，两条路径共享统一文本层与可观测层](https://mmbiz.qpic.cn/sz_mmbiz_png/JChBicc2ZnfvKYbPj1YExxl2vpu1Bewf8CJKhDPAKn6aqh2phLoB9fjfCictib3W4CbkTR1UatFLgwcjLg2fC1FfMtHcGZrxaXchKEpHpsZsw4/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=0)

这套骨架之下有几种具体玩法：

**S2S 加文本旁路** ：用 S2S 做语音 I/O，同时拿它的输入输出转写做日志、护栏和评测。前面那行 `"modalities": ["audio", "text"]` 就是干这个的。要 S2S 的体验，又要最基本的可观测，这是成本最低的方案。

**半级联（Half-cascade）** ：让 S2S 模型只负责"听"和"说"，"想"交给文本 LLM。Gemini Live 官方直接提供 native audio 和 half-cascade 两种模式，OpenAI Realtime 也可以配置成只输出文本再接自选 TTS。脚本敏感、需要 RAG 的场景，这是折中点。

**双引擎路由** ：同一产品里，闲聊和陪练走 S2S，查询和办事走级联，在会话路由层按意图切换。

**前台 S2S、后台 LLM** ：S2S 负责寒暄和即时反馈（"我帮你查一下"），复杂推理和多工具调用异步交给后台 LLM，结果再注入 S2S 上下文。复杂 Agent 又要低延迟，目前只有这条路。

Pipecat 和 LiveKit Agents 都支持把 S2S 模型当作一个节点接进 pipeline，所以传输层和编排框架的选型，应该排在模型选型之前。两者二选一即可，不要自研 WebRTC 传输层。

## 怎么落地：两周跑通三条路径

第一周搭骨架：用 Pipecat 或 LiveKit 起一个最小项目，接一个海外 S2S（gpt-realtime-2.1-mini 或 Gemini Flash Live）、一个国内 S2S（豆包或 Qwen3.5-Omni-Realtime）、一条国内级联（火山 ASR + 千问 + 豆包 TTS），三条路径共用同一份系统提示和工具定义。

第二周建评测：50 到 100 条中文对话样本，覆盖方言、打断、多轮、工具调用，每条路径跑一遍，记五个指标：TTFA、打断停播时间、转写字错率、任务完成率、每分钟成本。

拿到这张表再对照场景决定：短轮次强互动（口语陪练、陪伴、Live Demo）倾向 S2S；多工具、需审计、需私有化、要复用现有 LLM 资产倾向级联；两者都要的用半级联或双引擎。不管选哪条，三个原则从第一天守住：所有路径都有转写，供应商都抽象成接口，长会话都做摘要滚动。

---

S2S 拿走了延迟和自然度，级联守住了可控和可替换，2026 年的价格已经让两者站在同一条起跑线上。真正的分水岭从来不是哪条路更便宜，而是你的业务愿意把多少控制权交给一个黑盒。

语音 Agent 的架构选型，本质上是在回答一个问题：你更怕慢，还是更怕失控。

你的团队在用哪条路？踩过什么坑？留言聊聊。

AI 协作工程化 · 目录