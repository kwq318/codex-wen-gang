---
title: "周刊第 020 期：实时语音从“边听边说”迈向“边对话边执行”，ASR 与 TTS 同时进入可适应、可推理阶段。"
source: "https://mp.weixin.qq.com/s/nlidbUtQtPUDITmO8hh5tg"
author:
published:
created: 2026-09-29
description:
tags:
  - "clippings"
---
Speech AI *2026年9月27日 12:46*

**统计窗口：** 2026-09-21 至 2026-09-27（以 arXiv announced date 为准）  
**本期精选：** 10 篇｜全双工/语音 Agent 2 篇｜ASR/流式翻译 4 篇｜TTS 4 篇

---

## 01｜Qwen-Audio-3.1-Realtime：迈向可靠的智能体语音交互

`全双工` `语音 Agent` `AudioLLM`

⭐⭐⭐⭐⭐

**英文标题：** Qwen-Audio-3.1-Realtime: Towards Reliable Agentic Voice Interaction  
**作者：** Lujia Bao、Qian Chen、Luyao Cheng 等（Alibaba Token Foundry）  
**发布日期：** 2026-09-23

**摘要：** 把实时语音助手从“低延迟聊天”推进到可思考、可调用工具、可持续执行任务的语音 Agent。系统以 Think、Act、Speak & Coordinate 三层组织能力，并用 M²-OPD、可执行环境和多粒度 GRPO 将语言推理、音频理解与工具使用统一起来。

**核心亮点：**

- 相较 3.0，τ-Voice 半双工任务成功率由 78.4% 提升至 82.0%。
- Full-Duplex-Bench v1.5 中，对背景语音的误响应率从 73.0% 降至 13.0%。
- 双路 Audio Encoder + LLM：一路生成语义内容，一路控制听/说/打断/恢复，语音渲染器结合上下文流式出声。
![Qwen-Audio-3.1-Realtime：迈向可靠的智能体语音交互 架构图](https://mmbiz.qpic.cn/sz_mmbiz_png/NWpP0ib4giaEakeSNEibzcSnVNlHFFjHvSkqIRth0bztmmskhDIiawU2pegLZ1BoYxicJuoq49c0uVCVpJZbLutdzOo3c7OFT6HskxCdUPrRdIiaA/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=0)

Qwen-Audio-3.1-Realtime：迈向可靠的智能体语音交互 架构图

▲ **架构说明：** 流式音频同时进入全双工决策模型和语音到文本模型；前者决定何时听、说、打断和恢复，后者生成文本/语义 token，再由上下文感知的 Voice Renderer 结合历史、音色与声学状态生成流式语音。

📄 论文链接：https://arxiv.org/abs/2609.25176  
💻 代码：github.com/QwenAudio/qwen-audio-agent

---

## 02｜Qwen-Audio-Agent：全双工对话与异步任务执行解耦

`语音 Agent` `异步执行` `系统架构`

⭐⭐⭐⭐⭐

**英文标题：** Qwen-Audio-Agent Technical Report  
**作者：** Chong Deng、Yunjie Ji、Yuxiang Kong、Xiangang Li、Xu Li 等  
**发布日期：** 2026-09-23

**摘要：** 提出前台—后台语音 Agent 架构：前台维持低延迟全双工对话并做轻量工具调用，后台在独立上下文中执行多步任务，编排运行时负责状态、授权、事件与结果投递。它明确区分“打断说话”和“取消任务”，也区分“任务完成”和“何时把结果说给用户”。

**核心亮点：**

- 134 个座舱用例上，混合执行成功率 91.04%，高于纯前台 72.39% 与全委派 80.60%。
- 匹配成功轮次中，混合架构平均任务时延分别降低 26.73% 和 30.91%。
- 适合桌面助手、智能座舱、语音客服等需要边聊边持续执行的场景。
![Qwen-Audio-Agent：全双工对话与异步任务执行解耦 架构图](https://mmbiz.qpic.cn/sz_mmbiz_png/NWpP0ib4giaEYL3eHLBzxnA8elH874NaNia6riar7tFwzYLWZIIBxG4HzsaPIHn1xXQ2ThIQQb3LxuPTeEC6q2VukwceN8DW6jGQVNcNc89Ev20/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=1)

Qwen-Audio-Agent：全双工对话与异步任务执行解耦 架构图

▲ **架构说明：** Frontend Agent 保持实时交互；Orchestration Runtime 维护任务状态、事件路由和结果投递；Backend Agent 在独立工作区中规划、执行与迭代。直接工具调用和后台委派按任务复杂度动态选择。

📄 论文链接：https://arxiv.org/abs/2609.25195  
💻 代码：github.com/QwenAudio/qwen-audio-agent

---

## 03｜EditVoice：可变长非自回归零样本 TTS 与语音编辑

`零样本 TTS` `语音编辑` `非自回归`

⭐⭐⭐⭐

**英文标题：** EditVoice: Variable-Length Non-Autoregressive Zero-Shot TTS and Speech Editing with Edit Flows  
**作者：** Hongyao Deng、Wenhao Guan、Xuetao Lin、Peijie Chen 等  
**发布日期：** 2026-09-25

**摘要：** EditVoice 用 Edit Flows 在采样时联合更新语音内容与序列长度，通过插入、删除和替换摆脱传统非自回归 TTS 对预设长度的依赖。随机跨度语音填充把零样本 TTS 和文本驱动语音编辑统一到同一模型中。

**核心亮点：**

- 据作者称，这是首个可变长非自回归零样本 TTS 模型。
- Complementary Prompt Sampling 同时利用前缀与后缀提示，互补修正生成。
- 在 1 万小时 GigaSpeech 上训练，在 Seed-TTS Eval EN、LibriSpeech-PC 与 RealEdit 上表现具有竞争力。
![EditVoice：可变长非自回归零样本 TTS 与语音编辑 架构图](https://mmbiz.qpic.cn/mmbiz_svg/Q3auHgzwzM5K7BpSLJVqeVSHw7pXMXcgCjPylDba14mWghfHBRcicLatjVL3ac5oB3ZIDJWZpFV1qEdCxM0zapFvMCszl0tEGFLbOxfyN4KAyKxTe2ibVegw/640?wx_fmt=svg&from=appmsg#imgIndex=2)

EditVoice：可变长非自回归零样本 TTS 与语音编辑 架构图

▲ **架构说明：** 参考语音和文本分别编码为离散 token，Stage One 先建立内容与提示条件；后续 Edit Flow 通过插入、删除、替换并行调整语音 token，并以双侧提示实现生成与局部编辑。

📄 论文链接：https://arxiv.org/abs/2609.29889  
💻 暂无开源  
🌐 Demo / 项目页：https://dhy02.github.io/editvoice-demo/

---

## 04｜STAM-ASR：带说话人时序锚定与记忆的多说话人识别

`多说话人 ASR` `Diarization` `长上下文`

⭐⭐⭐⭐

**英文标题：** STAM-ASR: Speaker-Temporal Anchoring with Memory for Multi-Speaker ASR  
**作者：** Victor Tolulope Olufemi、Syeda Faiza Ahmed Sara、Shammur Absar Chowdhury  
**发布日期：** 2026-09-25

**摘要：** STAM-ASR 在预训练 AudioLLM 内部直接学习说话人活动与说话人表征，不依赖外部 diarization，也不显式做语音分离。固定大小的说话人记忆和会话记忆跨片段传播“谁在说”和“上下文说了什么”。

**核心亮点：**

- 同时建模重叠语音、说话人回归和长录音上下文。
- 在 AMI、ICSI、LibriCSS、NOTSOFAR-1 上覆盖近讲、远场、重叠及跨域条件。
- 实验指出：说话人时序条件与双记忆互补，但稳健说话人跟踪仍是主要瓶颈。
![STAM-ASR：带说话人时序锚定与记忆的多说话人识别 架构图](https://mmbiz.qpic.cn/sz_mmbiz_png/NWpP0ib4giaEZicYlQn2J8zrVxuwJBfT8lRIQgFS4aj7o20ibDXHoqib3K2StvRbhzhvDJCSc3w2ARjKaKtxmDfxibuyNJrv6qvccQ8DzU78H4TWo/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=3)

STAM-ASR：带说话人时序锚定与记忆的多说话人识别 架构图

▲ **架构说明：** AudioLLM 中间层特征驱动内部 diarization，活动矩阵和说话人嵌入调制语义特征；Q-Former 更新说话人记忆与会话记忆，再通过 LoRA 条件化识别器输出带说话人归属的文本。

📄 论文链接：https://arxiv.org/abs/2609.29805  
💻 暂无开源

---

## 05｜TS-OPD：兼顾 ASR 精度与问答能力的任务特定蒸馏

`Speech LLM` `ASR` `On-Policy Distillation`

⭐⭐⭐⭐

**英文标题：** TS-OPD: Reconciling ASR and QA in Speech Language Models via Task-Specific On-Policy Distillation  
**作者：** Yujie Guo、Hongjie Chen、Jian Kang、Jie Li、Yongxiang Li、Yong Qin  
**发布日期：** 2026-09-25

**摘要：** 针对 Speech LLM 做 ASR 专项训练后指令跟随能力下降的问题，TS-OPD 将专项训练前后的模型分别作为 QA 教师和 ASR 教师。学生自己生成任务条件轨迹，每条轨迹只接受对应教师监督，从而减少两种目标的直接竞争。

**核心亮点：**

- 覆盖基础 ASR、上下文热词 ASR 和语音问答三类任务。
- 采用 Whisper-large-v3 编码器、轻量适配器与 Qwen3-4B LLM。
- 对蒸馏权重变化较稳健，扩大蒸馏数据仍能持续获益。
![TS-OPD：兼顾 ASR 精度与问答能力的任务特定蒸馏 架构图](https://mmbiz.qpic.cn/mmbiz_svg/Q3auHgzwzM4648KFuoxMQT86XsnDl72iaFRkb2rCF0IyFRV5wetB1zbF56r4v2SJLTBic041toWkZMUWQj9sL1IiaFR4dlFsGBZib1NmJsQPtLhwwiabic6l6Ebg/640?wx_fmt=svg&from=appmsg#imgIndex=4)

TS-OPD：兼顾 ASR 精度与问答能力的任务特定蒸馏 架构图

▲ **架构说明：** 先得到保留问答能力的 πQA，再得到 ASR 专家 πASR；最终学生从 πQA 初始化，对 ASR/QA 分别采样轨迹，并按任务路由到对应教师做 token 级蒸馏。

📄 论文链接：https://arxiv.org/abs/2609.29464  
💻 暂无开源

---

## 06｜Looped Transformer：用循环深度压缩 Flow-Matching TTS

`TTS` `Flow Matching` `参数效率`

⭐⭐⭐⭐

**英文标题：** Depth through recurrence: Looped transformers for flow-matching TTS  
**作者：** Jiabao Ai、Peng Han、Yuchen Song、Zhengjun Yue  
**发布日期：** 2026-09-25

**摘要：** 研究 Flow-Matching TTS 中 Transformer 层的循环复用方式。在保持每次网络求值 18 次 block 调用一致的条件下，对比全不共享、整栈循环、相邻重复以及前/中/后缀局部复用七种布局。

**核心亮点：**

- SEQUENCE 9×2 在 32 步采样下以少 47.1% 的参数保持有竞争力的可懂度、音色相似度和质量。
- 采样步数会改变最佳共享布局；低步数下 Suffix 明显退化。
- Middle 在两个数据集、4/32 步设置下的平均 WER 都位列前二。
![Looped Transformer：用循环深度压缩 Flow-Matching TTS 架构图](https://mmbiz.qpic.cn/mmbiz_svg/Q3auHgzwzM6JqyCLQQ0rFZibb7P1RstUFibvb2FFYwuNeI3zUibeOeNia0iaeamooXMeVsDIBW96eSBCSiclliccAV8dI9yCDl4Q0jF8XI7sr5lNMoZeRxINaH6IQ/640?wx_fmt=svg&from=appmsg#imgIndex=5)

Looped Transformer：用循环深度压缩 Flow-Matching TTS 架构图

▲ **架构说明：** 所有方案保持执行深度不变，只改变独立 block 数量、复用顺序及共享位置，从而把模型参数效率与采样预算解耦分析。

📄 论文链接：https://arxiv.org/abs/2609.29768  
💻 暂无开源  
🌐 Demo / 项目页：https://jiabaoai67.github.io/loop-f5/

---

## 07｜无标注测试数据中学习新词：让 ASR 在线扩展词表

`ASR` `热词/OOV` `测试时自适应`

⭐⭐⭐⭐

**英文标题：** Learning New Words from Unlabeled Test Data in Automatic Speech Recognition  
**作者：** Mengqi Wang、Mark A. Hasegawa-Johnson、Haolong Zheng、Chang D. Yoo  
**发布日期：** 2026-09-25

**摘要：** 让 ASR 在测试阶段从无标注语音中发现并学习从未见过的新词。冻结 CTC 声学模型给出候选拼写，冻结语言模型提供上下文证据，适配模块只学习新 token 的词汇表示和拼写分布。

**核心亮点：**

- 通过 CTC–LM 偏好不一致定位潜在 OOV 片段，并缓存重复出现的上下文。
- LibriSpeech 重复 OOV 的字符错误率相对降低最高 14.97%。
- 在构音障碍 Speech Accessibility Project 数据上相对降低最高 6.67%。
![无标注测试数据中学习新词：让 ASR 在线扩展词表 架构图](https://mmbiz.qpic.cn/mmbiz_png/NWpP0ib4giaEYFkZgJaumhia6D0faPxaF0PwH0pN42IcXA7sfpDoPvA5o9srtvv98vSo5MBjtS0nCEZ31dOYQicmicHiaIoQPIvWdWTkia6IhZNOBM/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=6)

无标注测试数据中学习新词：让 ASR 在线扩展词表 架构图

▲ **架构说明：** CTC 生成 N-best 拼写，语言模型检测不匹配区间；系统把候选拼写初始化为新占位 token，在后续重复语境中更新其表示与概率，最终回放缓存并修正转写。

📄 论文链接：https://arxiv.org/abs/2609.28877  
💻 暂无开源

---

## 08｜PDO：面向可修订流式语音翻译的持久交付优化

`流式语音翻译` `强化学习` `低延迟`

⭐⭐⭐⭐

**英文标题：** Persistent Delivery Optimization for Streaming Speech-to-Text Translation with Revisions  
**作者：** Zixiang Wan、Delin Chen、Wei Shi、Haihua Xu、Youxi Xie、Yuexian Zou  
**发布日期：** 2026-09-23

**摘要：** 可修订流式翻译会撤回早期文本，普通过程奖励却可能继续奖励这些短暂内容。PDO 只给最终仍保留的早期内容分配中间奖励，同时单独评价最终质量，使“早点显示”和“真正交付”对齐。

**核心亮点：**

- 仅用 7.49 小时 FLEURS 任务数据适配，五个方向中四个 BLEU 最优，COMET 全部优于外部流式基线。
- 相对 History-SFT，平均/P90 最终确认时延降低 10.8%/11.3%。
- 归一化擦除量降低 15.8%，并保持最早允许的 2 秒更新时刻。
![PDO：面向可修订流式语音翻译的持久交付优化 架构图](https://mmbiz.qpic.cn/mmbiz_png/NWpP0ib4giaEZ77DkAOqjDOvOy1c982uzwoTdkvyp2icuoqTobicruvgEjF5m0nUq66UPpEYx3ibE2eicic0Nm7MrFiawuibRmj1ajvWOCrODAZCeicPA/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=7)

PDO：面向可修订流式语音翻译的持久交付优化 架构图

▲ **架构说明：** 训练时追踪每次修订后仍存在的最长稳定前缀，只对持续保留的内容累计早发奖励；最终质量、稳定性和时延分别计分。

📄 论文链接：https://arxiv.org/abs/2609.26427  
💻 代码：github.com/ggiggit/PDO\_S2TT

---

## 09｜StreamTN：面向对话 TTS 的低延迟中文流式文本规范化

`流式 TTS` `文本规范化` `中文`

⭐⭐⭐⭐

**英文标题：** StreamTN: A Low-Latency Streaming Chinese Text Normalization Model for Streaming TTS in Dialogue Systems  
**作者：** Wenhao Li、Jinrui Liang、Haoyu Zhang、Jingbin Hu、Lei Xie 等  
**发布日期：** 2026-09-22

**摘要：** 在 LLM 对话系统中，原始回复必须先转换为 TTS 可读文本。StreamTN 基于 Qwen3-0.6B，以输入/输出双轨并行方式处理不完整的流式文本，减少等待完整句子带来的首包时延。

**核心亮点：**

- 双轨 token 组织允许一边接收 LLM 增量输出，一边持续产出规范化文本。
- 专项微调避免直接提示通用 LLM 带来的高延迟、格式漂移与幻觉。
- 配套构建覆盖多类中文 TN 现象的评测基准，论文已被 IEEE SLT 2026 接收。
![StreamTN：面向对话 TTS 的低延迟中文流式文本规范化 架构图](https://mmbiz.qpic.cn/mmbiz_svg/Q3auHgzwzM5hX20oxxq7psiaOOT915uicE9mzxrFFricBEg2wAz0zBkAby0HtDiaIjplqerRC9Daqdbpjht9vSMB967YZA26l7533nBUUoeykQf6mH1S1BsNRA/640?wx_fmt=svg&from=appmsg#imgIndex=8)

StreamTN：面向对话 TTS 的低延迟中文流式文本规范化 架构图

▲ **架构说明：** 原始文本 token 在下轨逐步输入，延迟 token 控制首包等待；Qwen3-0.6B 在上轨同步生成规范化 token，再实时送入 TTS，形成端到端增量流水线。

📄 论文链接：https://arxiv.org/abs/2609.24267  
💻 暂无开源  
🌐 Demo / 项目页：https://supernova-neko.github.io/Stream-TN/

---

## 10｜COT-TTS：从对话音频推理说话方式再合成语音

`上下文 TTS` `CoT` `情感表达`

⭐⭐⭐⭐

**英文标题：** COT-TTS: Audio Context-Aware Text-to-Speech with Chain-of-Thought Reasoning  
**作者：** Weizhen Bian、Sitong Cheng、Rongxiu Zhong、Jiahao Pan、Liumeng Xue 等  
**发布日期：** 2026-09-22

**摘要：** 把历史多说话人对话音频、目标文本和参考音色一起输入模型，先显式推理情绪、动机、语速、重音与韵律，再生成目标语音。中间 CoT 可查看和编辑，使“为什么这样说”和“最终怎么说”分离。

**核心亮点：**

- 从约 10 万小时中英对话构造 900 万训练样本，其中 100 万为高质量子集。
- 提供 0.6B 与 1.7B 自回归模型，参数远少于多模型级联系统但整体性能可比。
- 统一输出情感标注转写、可编辑的说话方式推理与语音 token。
![COT-TTS：从对话音频推理说话方式再合成语音 架构图](https://mmbiz.qpic.cn/sz_mmbiz_png/NWpP0ib4giaEauHG9nk8UFSiclGSeDzuZ9ghOEL2JvVYuZZNGa4oQRI5iaLloQgHE6D30l7YB5GDlaRAJ22znW2S2bvIIfHj7CNt0kKIGTpgfls/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=9)

COT-TTS：从对话音频推理说话方式再合成语音 架构图

▲ **架构说明：** Qwen3 同时接收目标文本、历史对话音频 token 与参考音色 token；先生成带情绪的历史转写和多维 CoT，再预测全局/语义语音 token，经 BiCodec 解码为目标语音。

📄 论文链接：https://arxiv.org/abs/2609.22697  
💻 暂无开源  
🌐 Demo / 项目页：https://luckybian.github.io/COT-TTS/

---

## 本周趋势

1. 全双工从“边听边说”升级为“边对话边执行”：前台交互、后台任务与编排运行时成为新的系统分层。
2. Speech LLM 的核心矛盾从单项能力转向能力保持：ASR 专项化、问答与工具调用需要通过任务路由和在策略蒸馏协同。
3. 流式链路优化继续向细颗粒度推进：不仅优化解码，还覆盖文本规范化、修订稳定性和结果交付时机。
4. ASR 开始具备测试时词表生长能力，为线上热词、专有名词和个性化识别提供新的无标注适配路径。
5. TTS 一端追求参数/采样效率，另一端引入显式上下文推理，让生成语音的内容、音色与表达方式可独立控制。

---

*Speech AI FRONTIER · 第020期 · 2026-09-27*