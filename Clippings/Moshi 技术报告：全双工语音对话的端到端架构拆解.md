---
title: "Moshi 技术报告：全双工语音对话的端到端架构拆解"
source: "https://mp.weixin.qq.com/s/WkDeGa5MEVEpWAgbItjmFw"
author:
  - "[[张量行者]]"
published:
created: 2026-11-03
description: "Moshi 是 Kyutai 于 2024 年发布并开源的实时语音对话模型，也是第一个真正意义上的实时全双工口语对话大模型。本文从范式动机、四大组件、数学原理、训练流水线、实测性能到工程拆解Moshi。"
tags:
  - "clippings"
---
张量行者 张量织网 *2026年9月14日 10:00*

> **摘要**
> 
> Moshi 是 Kyutai 于 2024 年发布并开源的实时语音对话模型 <sup>[3]</sup> ，也是 **第一个真正意义上的实时全双工口语对话大模型** ：理论延迟 160 ms、实测 200 ms，与人类对话的轮转节奏同量级 <sup>[1]</sup> 。它不再使用"语音识别 → 文本大模型 → 语音合成"的级联管线，而是把语音对话建模成 **一条由 K = 17 条子序列构成的联合序列** ，每个 80 ms 时间步一次性预测文本、语义、声学三层 token；靠 **Inner Monologue** 让模型先想清楚"该说什么"再生成"该怎么说"，靠 **Mimi** 把语义与声学信息压进同一条 12.5 Hz 的因果 token 流，靠 **RQ-Transformer** 把 K× S 的扁平序列折成"时间 × 深度"两维。本文从范式动机、四大组件、数学原理、训练流水线、实测性能到工程拆解Moshi。

---

## 论文链接: 《Moshi: a speech-text foundation model for real-time dialogue》

## 一、为什么级联管线走不通

### 1.1 今天语音助手的三段式流水线

主流语音助手（Alexa、Siri、各类智能客服）本质上是一条 **流水线** ：

\`\` 麦克风 → VAD 判静音 → ASR 转文本 → 文本 LLM 生成回复 → TTS 合成语音 → 扬声器 \`\`

这套架构工程上成熟、可控、可复用文本 LLM 的全部能力，但它有三个 **结构性的** 代价。

### 1.2 延迟账本：人类对话的平均间隔只有 230 ms

人类对话的节奏之快常被低估。Stivers 等人在 10 种语言上统计日常对话 <sup>[1]</sup> ： **一个说话人停止后，另一个说话人开始的平均间隔约为 230 ms** ，且这一规律跨文化高度一致。Moshi 论文把 230 ms 当作延迟的参照基准——最终给出的理论延迟是 **160 ms** ，比人类还快。

再看级联管线的延迟账本（每一段都按乐观估计）：

| 环节 | 典型耗时 | 说明 |
| --- | --- | --- |
| VAD 判定句子结束 | 100–300 ms | 必须等静音窗口，否则截断 |
| ASR 转写 | 200–500 ms | 流式 ASR 也要等部分结果稳定 |
| 文本 LLM 生成 | 300–2000 ms | 首 token 延迟 + 自回归 |
| TTS 合成 | 200–800 ms | 首块音频延迟 |
| **合计** | **≥ 1–3 s** | 比人类对话慢一个数量级 |

这还只是"平均延迟"。级联架构里各模块 **串行执行** ，任一段抖动都会叠加，用户感知到的是明显的"机械感"。

### 1.3 文本瓶颈与轮次假设

比延迟更根本的是 **信息瓶颈** ：

• **语音 → 文本不可逆地丢信息** 。文本里没有音高、语速、叹息、笑意、犹豫，也没有背景里的键盘声和婴儿哭声。ASR 一旦把这些丢掉，后面的 LLM 再强也变不回来。

• **文本 → 语音也无中生有** 。TTS 只能从文本"平铺直叙"地合成，语气全靠预设的音色与风格标签，无法和对话上下文真正对上。

• **系统天然假设"轮次"** 。VAD 本质上是在猜"他说完了吗"——而 **重叠语音占到了口语对话时长的 10%–20%** （Çetin & Shriberg, 2006 <sup>[71]</sup> ），此外还有大量"嗯""对""我在听"这类非打断式反馈（backchanneling）。级联管线的每个组件都建立在"一个人说完另一个再说"的前提上，想支持打断只能在工程上打补丁。

### 1.4 三代语音对话范式

![三种语音对话范式对比](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEBRs73pAS8v12YtLQqGD41hL8ia89gGbWURKDwjmCjz4HXnNo9K29ForZTeC4k2viaU0mntrC3NVbyuJkGJIy5wQVvJcpTCb46sc/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=1)

上图中三种范式的分野一目了然：

• **① 级联管线** ：延迟最大、信息丢失最严重、无法重叠；

• **② 单一语音 LLM** ：把语音离散成 token 后交给一个自回归模型，延迟降下来了，但仍是 **单流 + 轮次式** ——它把"对话"建模成一条被告知"该谁说话"的序列，重叠与打断依然做不到；

• **③ Moshi** ：同时建模 **两条说话流** ，并且额外增加 **一条文本流** 作为"内部台词"。

### 1.5 Moshi 的答案：不做流水线，做一个"会说话的模型"

Moshi 的设计目标可以一句话概括：

> **让模型像人一样，边听边说。**
> 
> 不显式建模"轮到谁"，不依赖 VAD 判断轮次，静音和重叠都是模型自己学出来的行为。

为此它需要解决四个独立的技术问题，这也是本文后续章节的主线：

1\. **用什么骨架** ？—— 一个足够强的文本 LLM（Helium），因为对话的"智力"来自语言模型；

2\. **语音怎么变成 token** ？—— 一个把语义和声学统一进同一条流、且完全因果的音频编解码器（Mimi）；

3\. **token 太多了怎么自回归** ？—— 把 K× S 的扁平序列折成"时间 × 深度"两维（RQ-Transformer）；

4\. **怎么让语音有"内容规划"** ？—— 让模型先生成自己要说的话的文本（Inner Monologue）。

---

## 二、总体架构：四个组件与一条联合序列

![Moshi 总体架构](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEDPUURQnF2XfwTCbUyVFymNnIsoGXrPyutic1B9OdyRI3icBBoHBLjibRpydStpqyiabTicFvcQB5eeQiaj5ticsk5adSQke0wSVcQLqw/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=2)

### 2.1 四个组件

Moshi 由四个部分拼成，其中只有一个是"从零训练"的：

| 组件 | 角色 | 关键配置 |
| --- | --- | --- |
| **Helium** | 文本 LLM 主干，提供语言能力与对话智力 | 7B 参数，32 层，d=4096，32 头，上下文 4096 |
| **Mimi** | 音频编解码器：波形 ↔ 离散 token | 12.5 Hz，8 个码本 × 2048，1.1 kbps，全因果 |
| **RQ-Transformer** | 在"时间 × 深度"两维上做自回归 | Temporal：32 层 / 4096 维；Depth：6 层 / 1024 维 |
| **Inner Monologue** | 用文本 token 作为音频 token 的前缀 | 文本流与音频流共享同一条联合序列 |

### 2.2 关键超参数

论文 Table 1 给出了完整的架构与训练配置（节选）：

| 超参数 | Helium 预训练 | Moshi 预训练 | 多流后训练 | Fisher 微调 | 指令微调 |
| --- | --- | --- | --- | --- | --- |
| Temporal 模型维度 | 4096 | 同左 | 同左 | 同左 | 同左 |
| Temporal 层数 / 头数 | 32 / 32 | 同左 | 同左 | 同左 | 同左 |
| Depth 模型维度 | — | 1024 | 1024 | 1024 | 1024 |
| Depth 层数 / 头数 | — | 6 / 16 | 6 / 16 | 6 / 16 | 6 / 16 |
| 文本词表 / 音频码本 | 32000 / — | 32000 / 2048 | 同左 | 同左 | 同左 |
| 音频帧率 | — | 12.5 Hz | 同左 | 同左 | 同左 |
| 文本批大小 | 4.2M token | 1.2M token | 1.2M token | — | — |
| 音频批大小 | — | 16 h | 8 h | 40 min | 2.7 h |
| 训练步数 | 500k | 1M | 100k | 10k | 30k |
| 学习率（Temporal / Depth） | 3e-4 | 3e-5 / 2e-4 | 3e-6 / 5e-5 | 2e-6 / 4e-6 | 2e-6 / 2e-6 |
| 声学延迟 τ | — | 2 | 1 | 1 | 1 |

一个容易忽略的细节：Moshi 的 **上下文窗口是 4096 个时间步** ，按 12.5 Hz 计算相当于 **约 5 分钟** 的连续语音（预训练时实际使用 3000 步，约 4 分钟）。这是一个刻意的取舍——对话不需要百万级上下文，但需要 **极低的每步延迟** 。

### 2.3 一次前向走完全流程

推理时，每个 80 ms 时间步发生这些事：

1\. **用户音频** 从麦克风进入 Mimi **因果编码器** ，实时产出 8 个 token（1 语义 + 7 声学）；

2\. 与 Moshi 自己上一步生成的 token 拼成 **17 条子序列** ，喂给 Temporal Transformer；

3\. Temporal Transformer 输出上下文向量 z <sub>s</sub> ；

4\. Depth Transformer 以 z <sub>s</sub> 为条件，在 **列内串行** 生成 17 个 token 的概率分布；

5\. 只对 Moshi 自己的流采样（文本 1 + 语义 1 + 声学 7），交给 Mimi **因果解码器** 重建 24 kHz 波形；

6\. 用户侧的 8 条流 **只建模、不采样** ——推理时它们的输入来自真实音频，因此模型"永远在听"。

这就是"全双工"在架构层面的含义： **用户的流和模型的流共享同一个 Transformer 的注意力，不存在谁先谁后。**

---

## 三、Helium：被"语音化"的文本 LLM

### 3.1 一套"现代 LLM"的标准答案

Helium 是一个 7B 参数的自回归 Transformer <sup>[2]</sup> ，架构上没有魔法，全是当下主流选择，但每一处都服务于"要当语音模型的主干"这个目标：

| 设计 | 选择 | 参考文献 |
| --- | --- | --- |
| 归一化 | RMSNorm，放在注意力、FFN、输出线性层的 **输入** 处 | Zhang & Sennrich <sup>[16]</sup> |
| 位置编码 | RoPE 旋转位置编码 | Su 等 <sup>[17]</sup> |
| 注意力实现 | FlashAttention，上下文 4096 | Dao 等 <sup>[18]</sup> |
| 前馈层 | GLU 门控线性单元 + SiLU 门控 | Shazeer <sup>[19]</sup> 、Hendrycks & Gimpel <sup>[20]</sup> |
| 分词器 | SentencePiece unigram，32k 词表 | Kudo & Richardson <sup>[15]</sup> |
| 优化器 | AdamW + 固定学习率后余弦衰减 | Loshchilov & Hutter <sup>[21]</sup> |

两个细节值得一提：

• **MLP 维度是 11264** ，而不是常见的 4d = 16384。这是 GLU 类结构的常规做法——门控把前馈层拆成两路，参数量翻倍，因此单路维度要缩到 8/3 d ≈ 10923 附近保持总量不变。

• **数字被拆成单个字符，并且使用 byte-backoff** ，保证分词器在任何输入下都不丢信息。这是为指令微调准备的——语音对话里"多少钱""三点半"这类数字极多。

### 3.2 预训练数据流水线

Helium 在 **2.1T token** 上训练了 50 万步。数据构成： **12.5% 来自精选语料** （Wikipedia、Wikibooks、Wikisource、Wikinews、StackExchange、科学论文集 pes2o）， **87.5% 来自 CommonCrawl** （10 个不同年份的 crawl）。

清洗流水线有三道工序，都用 fastText <sup>[70]</sup> 当"裁判"：

1\. **去重** ：按行计算 FNV-1a 哈希，用布隆过滤器去掉网页模板（导航栏、页脚）；再训练一个 fastText 分类器做 **模糊去重** ，只有当连续 3 行以上被判为重复时才删除；

2\. **语言识别** ：fastText 文档级判别，只保留英文置信度 > 0.85 的文档；

3\. **质量过滤** ：用"高质量语料 vs 随机网页"训练一个 **9 类** fastText 分类器（对应 Wikipedia、Wikibooks、StackExchange 的不同学科子集等），在行级打分后再按行长度加权平均，阈值以上的文档才保留。

### 3.3 文本能力是语音能力的"天花板"

为什么要在语音模型报告里花一整节讲文本 LLM？因为 Moshi 的对话"智力"完全继承自 Helium。论文 Table 2 给出了 Helium 在标准文本基准上的成绩：

| 模型 | ARC-e | ARC-c | OBQA | HellaSwag | WinoGrande | PIQA | SIQA | TriviaQA | NQ | MMLU |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Helium（7B）** | 79.6 | 55.9 | 53.6 | 76.3 | 70.0 | 79.4 | 51.0 | 59.9/72.6 | 23.3 | **54.3** |
| Llama 2（7B） | 75.2 | 45.9 | 58.6 | 77.2 | 69.2 | 78.8 | 48.3 | —/72.1 | 25.7 | 45.3 |
| OLMo（7B） | 67.2 | 42.5 | 50.0 | 75.5 | 69.8 | 77.5 | — | — | — | 52.0 |
| MPT（7B） | 70.5 | 46.5 | 51.4 | 77.6 | 69.9 | 80.6 | 48.5 | —/61.2 | 20.8 | 30.8 |
| Falcon（7B） | 73.7 | 47.5 | 53.0 | 76.3 | 68.9 | 80.3 | 47.2 | —/64.6 | 21.0 | 28.0 |

在"训练 token 少于 2.5T"的同类模型里，Helium 在 ARC-e、ARC-c、SIQA、MMLU 上都拿到最好成绩（MMLU 54.3，高出 Llama 2 整整 9 分）。这个"文本底座"的强度，在后面口语问答评测里会直接体现为 **上限** （见第九章）。

---

## 四、Mimi：语义与声学的统一离散化

![Mimi 编码器与 split RVQ](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicED2micxZPMQS7W1ETR8nicmGkJafuFiaEWcoY7WYnKxOjT0wELe7xNDvcKUA4TJhPwnucFllicRUD7Gibcq7vh5vTtlWjZVvFReiaQuo/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=3)

### 4.1 问题：两类音频 token 各有致命缺陷

语音语言模型必须先回答"语音怎么变成离散 token"。文献里有两条路线，各自都有结构性缺陷 <sup>[4]</sup> ：

| 路线 | 做法 | 优点 | 致命缺陷 |
| --- | --- | --- | --- |
| **语义 token** | 从自监督语音模型（wav2vec 2.0 <sup>[10]</sup> 、HuBERT <sup>[8]</sup> 、WavLM <sup>[9]</sup> ）量化中间层特征 | 与语言内容强相关，纯音频无文本条件下也能生成可懂语音 | **非因果**  ，只能离线算；且丢失声学细节，重建音质差 |
| **声学 token** | 神经音频编解码器（SoundStream <sup>[5]</sup> 、Encodec <sup>[6]</sup> ）的 RVQ <sup>[7]</sup> 码本 | 重建音质高 | 不含语言结构，无条件生成容易"胡说" |

AudioLM <sup>[4]</sup> 的经典方案是 **混用** ：先用语义 token 生成"语音骨架"，再以其为前缀生成声学 token。但这在实时场景里直接不可行——语义 token 需要非因果的离线编码器，而且要跑两个独立编码器，算力开销叠加。

SpeechTokenizer <sup>[11]</sup> 给了一条更聪明的路： **用蒸馏把非因果的语义信息"灌"进因果模型的 token 里** 。Mimi 正是沿着这条路走到底，并且做了两处关键改造。

### 4.2 架构：全因果的 SeaNet + Transformer 瓶颈 + split RVQ

**编码器** ：单通道波形 x ∈ ℝ <sup>L</sup> 经 4 个残差卷积块（步长分别为 4、5、6、8）加一个步长 2 的末端一维卷积，投影到潜变量：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEBfJLqadOLQX5m7vZel6ynFaW1ibEmicrZoWMZfNwUeSWmHqlP6rh0OHlETObn7r8yuhkGyic6ml3MgkAm6crdEyjDQs4iayAxzTR4/640?wx_fmt=png&from=appmsg#imgIndex=4)

其中 T 为音频时长（秒），S 为帧数。四个步长相乘 4×5×6×8×2 = 1920，而 24000 / 1920 = 12.5 **Hz** ——采样率与步长正好构成 12.5 帧/秒的整数关系，每帧 80 ms。卷积全部 **因果** ，因此编码可以边录边算。卷积块采用 ELU <sup>[13]</sup> 激活与权重归一化 <sup>[14]</sup> ，架构沿用 SEANet <sup>[12]</sup> 。

**Transformer 瓶颈** ：量化前后各插入一个 Transformer，8 层、8 头、d=512、MLP 2048，RoPE 位置编码，GELU 激活， **因果掩码** ，上下文限 250 帧（20 秒）；为稳定训练使用 LayerScale <sup>[22]</sup> ，对角初值 0.01。这两个模块的作用是让潜变量在"压缩"与"重建"之间取得更好的平衡——论文 Table 3 显示，加上它们后感知音质提升， **编码器侧** 的那个还能改善语义蒸馏效果。

**split RVQ** ：这是 Mimi 最重要的结构创新。传统做法是 8 层级联 RVQ，第一层承担语义（蒸馏目标），后续层拟合残差。问题在于： **一旦第一层被要求"语义化"，它的残差就必须承载全部声学信息，语义与音质开始互相拉扯** ——论文实测到蒸馏显著提升音素区分度（ABX），但音质同时下降。

Mimi 的解法是把 8 层 **拆成两条并行分支** ：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEDftNHtNnzmphia2MOaE7Bcibm9AOJqZayKDFrET3Bwfl2ZswCzappA6QK0pIZia8lkdJAzNIP2t4JyX4iao6cqlxtaFuejRly6mc8/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=5) ![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicECWR1JfEgXVDgqMzw2MMWg9tccRnpY81ZsmV5WV0e5BBnZxwpHrbiaYcYiaGXib7SW4LyeCWNjx8nu59zr8OSG9JdrJeLicwXpJlEA/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=7)

换言之，8 层量化器被拆成"1 层语义 + 7 层声学"。两条分支的输出 **相加** 后送解码器。语义分支只负责"说了什么"，声学分支只负责"听起来像谁、什么情绪、什么环境"。这样一来， **声学信息不再被约束在语义码本的残差里** ，两条目标不再互斥。消融结果很干脆：split RVQ 把语义-声学权衡整体推向更好的位置（MUSHRA 57.8 → 64.0）。

### 4.3 语义蒸馏：把非因果信息灌进因果模型

蒸馏目标是 WavLM <sup>[9]</sup> 的特征：16 kHz 波形 → 1024 维、50 Hz。要接到 12.5 Hz 的潜变量上，需要先降采样：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicECGd6HMyUdicib7mZO2fUKXDkRE42icpTibUpN2wkUqSls8ohVJOD5495kaQxtX4R9uoSNYJjpo37A5DWgHn4g8maiaUmG9odxQo1y0/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=8)

论文特别强调一点： **这个平均池化必须是"非因果"的** （用未来帧的信息），因为它只在训练时使用，不会破坏推理的流式性。随后对第一级量化器的输出做线性投影到 1024 维（与送进解码器的嵌入 **并行** ），与 WavLM 特征计算余弦距离作为蒸馏损失：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEBdsdn5f82sylSRalYxX46oiaSwYdficxgx1QJElYTer7RhwvyuMmge1PicdIiacgJ0j4Ebth8zeqXMjHKuKNRccyOufmicokib6kACk/640?wx_fmt=png&from=appmsg#imgIndex=10)

### 4.4 训练目标：重建、对抗，以及一个反直觉的发现

Mimi 的总损失由三项构成（对应论文式 (8)–(10)）：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicED2mh38icaOlVQUYrWDI8FMbjQaurVbUzsJAwlSpiaPNG3Wd90KpiaNESu32wjVvLyiaA4qJJhVKzZYHCEZDavDLqjBEed3Gd5nUHc/640?wx_fmt=png&from=appmsg#imgIndex=11)

三项依次是 **多尺度 mel 重建损失** 、 **多尺度 STFT 判别器损失** 与 **语义蒸馏损失** 。基线配置与 Encodec <sup>[6]</sup> 一致：多尺度 mel 频谱重建损失 + 多尺度 STFT 判别器。但 Mimi 做了三个非标准的改动：

**① 纯对抗训练（去掉重建损失）。** 论文发现，把重建损失完全去掉、只留特征匹配损失与判别器损失后， **客观指标明显变差，但主观听感反而大幅提升** 。Table 4 的 MUSHRA 主观评测证实了这一点："只对抗"训练的 Mimi 拿到了 81.0 分，显著高于混合损失版本。这是一个典型的"客观指标与人类感知脱节"案例——也是 Mimi 最终配置。

**② 量化率 50%。** 训练时 **只在一半的序列上真正做量化** （per-sequence），另一半直接把未量化的嵌入送进解码器。论文引用 Kumar 等 <sup>[45]</sup> 的观察（不在所有时候量化能提升音质），但做法更进一步：不是"用量化后的嵌入"，而是 **直接传未量化嵌入** 。论文给出一个反直觉结论： **码率越低，这个技巧的收益越明显** 。

**③ 量化器 dropout 与码本重置。** 沿用 SoundStream <sup>[5]</sup> 的 quantizer dropout 让码本具备可变码率能力（推理时可以只用前几层，码率可缩放）；同时做码本重置，防止死码本。

其他训练超参：AdamW（权重衰减 5e-2， **只作用于 Transformer 参数** ）、学习率 8e-4、β=(0.5, 0.9)、权重 EMA 0.99、批大小 128 × 12 秒随机窗、 **400 万步** 。

### 4.5 结果与消融

附录 A 的 Table 17 用三个指标做了系统消融：ABX（音素区分错误率，越低越接近"语义可懂"）、VisQOL 与 MOSNet（客观音质，越高越好）。

| 配置 | ABX（↓） | VisQOL（↑） | MOSNet（↑） |
| --- | --- | --- | --- |
| 基线（无 Transformer、无蒸馏） | 31.3% | 2.37 | 2.85 |
| \+ 解码器侧 Transformer | 27.5% | 2.30 | 2.93 |
| \+ 编码器 + 解码器 Transformer | 29.0% | 2.25 | 2.94 |
| \+ 编码器 + 解码器 Transformer + WavLM 蒸馏 | **23.3%** | 2.82 | 2.89 |
| 再加 split RVQ（最终配置） | 8.1% | **2.72** | 2.89 |

可以看到：Transformer 瓶颈 + 蒸馏把 ABX 从 31.3% 压到 23.3%（语义可懂度跃升），而 split RVQ 再把 ABX 压到 **8.1%** ——语义与声学解耦后，音素区分错误率降到原来的三分之一。需要留意的是 VisQOL 这一列：最终配置只有 2.72，低于上一行的 2.82。这与 4.4 节"客观指标与主观听感脱节"的发现一致—— **两条原本互斥的目标，是靠结构设计加上一次有意识的取舍一起解开的** 。

最终 Mimi 的技术规格：

| 指标 | 数值 |
| --- | --- |
| 采样率 / 帧率 | 24 kHz / 12.5 Hz（80 ms/帧） |
| 潜变量维度 | 512（量化前投影到 256） |
| 码本 | 8 个 × 2048（1 语义 + 7 声学） |
| 码率 | **1.1 kbps** |
| 因果性 | 编码、解码全因果，可流式 |
| MUSHRA | **81.0**  （同等或更低码率下领先 SemantiCodec <sup>[46]</sup> 、SpeechTokenizer <sup>[11]</sup> 、RVQGAN <sup>[45]</sup> ） |

---

## 五、RQ-Transformer：把 K× S 折成"时间 × 深度"

![RQ-Transformer 的二维分解](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEC4KVec0lqC5BaVnH5UPHvicra8VaJtq2jRZHyoib96u3W0lcXuVj1ROkztwSEdFDXJ3PjK6Hhd6hYZAsrmiaIlCFR2Sc94k7ibCLU/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=12)

### 5.1 为什么不能扁平化

Mimi 每秒产出 12.5 × 8 = 100 个 token。若把它们 **扁平化** 成一条序列交给语言模型，模型必须一步一个 token 地预测：

•5 分钟音频 = 30000 个 token，序列长度暴涨；

•更致命的是 **速度** ：100 token/s 的串行解码与"实时"直接冲突——每 80 ms 只能走一步前向，而一步只够生成 1 个 token，8 个 token 就变成 640 ms 延迟。

但如果让模型 **一步并行预测 8 个 token** ，又会丢掉子序列之间的依赖建模（同一帧内 1 个语义 + 7 个声学 token 显然不是独立的）。

RQ-Transformer <sup>[23]</sup> 给出的答案是 **分维度** ：不要在一维上摊平，而是把它做成"时间 × 深度"的二维网格， **用两个 Transformer 分别负责两个维度** 。

### 5.2 两级分解

设 V <sub>s</sub> = (V <sub>s,1</sub>,…,V <sub>s,K</sub>) 表示第 s 个时间步上全部 K 条子序列的联合取值。Temporal Transformer（TrTemp）负责 **时间维** ，输出上下文向量：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEA9Voe556vuetUic9UiaTISLnhPBJhx6te6fpBw7OwutBYmgMcwf6edU6WzUgs4JI01fMSiaQqQ6ib22Xj2HSHfOtNtYTicoq6Zaf8A/640?wx_fmt=png&from=appmsg#imgIndex=13)

Depth Transformer（TrDepth）负责 **列内（深度维）** ，以 z <sub>s</sub> 与同一步内已生成的前几个子序列为条件，输出 logits：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEDYOgy1gaFs3oyEc5jzH9LzuhXsSzjicFDtiarrPfZqGUdDWVIZ0DqYibvibwHeLg2uatkg8leC3MHUcSawUHveUyiaficxhm7GS6Bow/640?wx_fmt=png&from=appmsg#imgIndex=14)

第一条子序列（文本）不走 Depth Transformer，只用一个线性层映射：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEDC83Bd9QA27dlbzKWYMLQsG1AAvyU1kVHl3IJl3G4uTxppkibOempkQQgEiccWLdBCiabWXytWryncLBxicmMicV2y5cSO2QDk2dHE/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=15)

训练目标是让这两个分布逼近真实条件分布：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEDicyS3GoVBtSPfVJRFWdQbJRVKOacibbw6ZMn99HoUFrdForuRM3OXF6XCSPQlIlx0j6HWAjeo0btjZPd97Zb1VNPRQGQwGJgdg/640?wx_fmt=png&from=appmsg#imgIndex=16)

**最关键的一点** （论文原文强调）：Temporal Transformer 的步数 **恒为 S** ，而不是 K · S；Depth Transformer 的步数 **最多为 K** 。也就是说：大模型只在时间维上跑 S 步（5 分钟 ≈ 3750 步），列内的串行预测交给一个 6 层 / 1024 维的小模型。这是 Moshi 能做到低延迟的结构性前提。

实现上还有两个细节：

•Temporal Transformer 在每一步的输入是 **K 个可学习嵌入表之和** ，代表上一时间步各子序列的取值；

•Depth Transformer 的输入是 z <sub>s</sub> **加上** 上一个子序列取值的学习嵌入。

### 5.3 per-codebook 参数化

与 Lee 等 <sup>[23]</sup> 、Yang 等 <sup>[26]</sup> 、Zhu 等 <sup>[25]</sup> 的做法不同，Moshi 的 Depth Transformer 里 **每一个子序列索引 k 使用各自独立的参数** （线性层、投影层、全连接层都分开）。

理由是：第 2 条流是语音语义、第 3–9 条是 7 层声学残差、第 10 条之后是用户侧流——它们的统计特性差异巨大，共用一套变换并不合理。由于 Depth Transformer 本身很小（6 层 / 1024 维），这份额外参数 **对训练与推理耗时几乎无影响** ，但论文 Table 6 显示收益明确（NLL 3.75 → 3.65）。

### 5.4 声学延迟 τ：让"小模型够用"的关键

最初的做法是直接令 V <sub>s,q</sub> = A <sub>s,q</sub> （语义与声学对齐）。但论文发现， **在语义与声学 token 之间引入 1–2 步延迟会显著提升生成质量** 。形式化地，给定延迟 τ ∈ {N}：

![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEDoM3hw0M0eOackTpH7icUTEUdJLo7ocWEljuBfMwCDiamibv5s6U4H9x9uVSX1mmPSbH1p4VBcnZtj14zTeicEeEDmbCQicWoMjQ2A/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=18) ![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEAoSISib5NpZOQ0Gdg05uZanCXTsicQK3x6GdGUlictTDKvTZRwibJ8Kbxb22NQdXAUO7ZNh92JtWU6oZwYhkWZQpGYJEvxEXHeBqg/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=20)

直觉：同一时间步内，语义 token 与声学 token 高度耦合（这把"说什么"和"怎么发声"绑死），要精确建模这种耦合需要非常强的列内模型。引入延迟后，声学 token 对应的是 **上一帧** 的语义内容，同一列内的互信息大幅下降，Depth Transformer 这个"小模型"才够用。Copet 等 <sup>[24]</sup> 与 Zhu 等 <sup>[25]</sup> 从子序列互信息的角度给出了理论解释。

![延迟与质量的权衡](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicECliaPN9ttEAf6lxoKzIedFDAAicZsAibgvXQ45rQl42QZMKZ9dGudWT2zGvkObicCOFDJlQK40L2ib3pqibHvQ0NzCeOXU1hcRlRiags/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=21)

代价是 **端到端延迟增加** 。Mimi 每帧 80 ms，延迟 τ 帧意味着"这一步生成的是 τ 帧之前的内容"，再叠加一帧的流水线，理论延迟为 (τ+1)× 80 ms：

| 延迟模式 | 理论延迟 | 转录 NLL（↓） | 生成转录长度（字符） |
| --- | --- | --- | --- |
| <sup>[0]</sup> × 8  （无延迟） | 80 ms | 4.36 | 486 |
| \[0,1,1,…\] | 160 ms | 4.12 | 529 |
| \[0,2,2,…\] | 240 ms | 4.09 | 519 |

80 ms 的额外延迟换来 NLL 从 4.36 降到 4.12、转录长度从 486 涨到 529（后者说明生成不"塌缩"、不会迅速输出结束符）。Moshi 的最终选择是： **预训练用 τ=2，后训练与微调用 τ=1** ，即 160 ms 理论延迟。

右侧那张消融图则说明了 RQ-Transformer 的 **必要性随延迟收紧而暴增** ：

•延迟宽松（640 ms）：无 RQ-Transformer 42.2、有 RQ-Transformer 40.3，只是"小幅更好"；

•延迟收紧到 240 ms：无 RQ-Transformer 直接崩到 **135.4** ，有 RQ-Transformer 仍保持 **36.8** 。

换句话说， **"低延迟"与"高保真音频"能同时成立，靠的正是这个二维分解** 。

---

## 六、双流联合序列：不建模"轮次"的对话

![双流联合序列](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEAo0szmRNsrpYFCg1oibRiakwUDFNxjcJB5xoVmDUAhzFLWiaJEeEuJhWiclp2TMqF3XiazWIkVTiazt0fMJvTKczsVtBzDR5mWdWGKs/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=22)

### 6.1 K = 17 的构成

把多流建模与 Inner Monologue 合起来，就得到 Moshi 真正要建模的联合序列（论文式 (6)）。设 Moshi 的音频流为 A、用户的音频流为 A'（各 8 条子序列，Q=8），文本流为 W：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEAdV9f2tvYSMY86Awk0NshqwUBApFqrYttKMzQ3Dh8zicHJoTBzsFuUUs9qmHxb7yKPB2Yfia63Fg6obwpj4lNTeIY5ymHg85rZc/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=23) ![公式](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEBgUVKTGssPibfe13dugH4unvicRcfH2KfDQbj2MjyvoxhFHYcbbicb3CeXZlsSHhKAj9zRkT4a3vjOO2PqqfGE9OIfpanBRu4wJQ/640?wx_fmt=png&from=appmsg#imgIndex=25) ![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEBWmBIC8kSfhicwu8jbHSFD2bjey3Xv9fA95RlZ4gs26EdkxxOibjE2ENvtczCichjaLnaNicibTjj5ibaZK7qibC6ZR60ePxqH3URAtU/640?wx_fmt=png&from=appmsg#imgIndex=27)

各条子序列的含义是：第 1 条为 **对齐后的文本 token** ；第 2 条为 **Moshi 自己的语义 token** ；第 3–9 条为 **Moshi 自己的延迟声学 token** （7 层残差）；第 10 条为 **用户的语义 token** ；第 11–17 条为 **用户的延迟声学 token** （7 层残差）。

总子序列数 **K = 2Q+1 = 17** ：1 条文本 + 8 条 Moshi 音频 + 8 条用户音频。

### 6.2 训练与推理的不对称（设计的精髓）

**训练时** ，17 条流全是预测目标——包括用户的那 8 条。模型要学会"预测用户会说什么"。

**推理时** ，只采样属于 Moshi 的流：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicECJDKM8lpq2o7JRRbkrMS8cSbGKFDdEuAiaA4uHWQUbnwDEnHhtEaq12Q2yEBZAQty8iaeGHqibLekLibXRdHuQI3SZ6hR5ftSicWbc/640?wx_fmt=png&from=appmsg#imgIndex=28)

用户侧那 8 条流的预测结果 **被直接丢弃** ，改用真实音频经 Mimi 编码后的 token 喂入。这个不对称带来了两个好处：

1\. **模型永远在听** ：用户的语音编码实时进入 Transformer 的注意力，Moshi 不需要 VAD 就知道对方在说话、说了多久、语气如何；

2\. **可离线评测** ：因为模型也能生成用户流，论文得以 **凭空生成完整双边对话** ，进而用外部语言模型与轮转统计指标做离线评估（见 9.3 节）。

### 6.3 静音、重叠与"立刻开口"

联合序列的建模方式带来几个很反直觉但很实用的性质：

• **没有轮次边界** 。论文原文：用户与 Moshi 之间 **不存在明确的转换边界** ，Moshi 可以随时说、随时听，也可以 **同时说和听** 。重叠语音不是一个需要特殊处理的分支，而是常态。

• **沉默是被建模的输出，不是空缺** 。当用户说话而 Moshi 保持沉默时，Moshi 的声学 token 会被解码成 **"自然静音"** ——一段接近无声的波形，而不是某个固定值；同时它的文本流被 PAD 填满。这意味着"什么时候不说话"也是模型学出来的行为 <sup>[34]</sup> 。

• **文本流是控制接口** 。既然文本 token 是联合序列的第一条子序列，就可以人为干预： **强制采样一个 EPAD token，就能让 Moshi 立刻开口说话** 。

### 6.4 双流训练数据从哪来

真实的双人对话语料稀缺，Moshi 用三步构造：

1\. **无监督多流后训练** ：用 pyannote.audio <sup>[30]</sup> 对海量无标注音频做 **说话人分离** ，随机抽取一位"主说话人"，生成二值掩码，把音频切成"主说话人波形"和"其余人波形"两路，分别经 Mimi 编码成两条流。文本流只保留主说话人的内容，文本-音频延迟固定为 0；

2\. **Fisher 真实通话微调** ：用 Fisher 数据集 <sup>[29]</sup> （2000 小时真实电话对话）学习 **真实的重叠与打断** ——论文指出，第 1 步造出来的数据里"没有重叠，不说话的流是完全静音"，与真实对话差距很大；

3\. **指令微调** ：把"主说话人"的身份固定成 Moshi（一个有用的对话助手），用合成对话脚本训练。

这套设计的巧妙之处在于： **用大量弱监督数据学"结构"（双流怎么并行），用少量强监督数据学"真实交互"（重叠、打断、语气）** 。

---

## 七、Inner Monologue：文本作为语音的"草稿"

![Inner Monologue 的对齐与双向开关](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicEAmCpP8qQylXoPiaG8dUwkO6ibarynKGM10ufrJzSQ1BlKtIOhz41KiaAzxiafsJr0bJa8SRY5icFS2nGQuEGw1IiadfchJOEL1MYFzc/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=29)

### 7.1 让模型"先想清楚要说什么"

纯音频域的生成已经可行（论文 Table 7 验证），但 Moshi 发现： **让模型同时预测自己语音的文本表示，会形成一个"脚手架"（scaffolding），显著提升生成语音的语言质量** 。

形式化地说，定义文本流 W ∈ {1,…,N <sub>W</sub> } <sup>T</sup> ，来自 Moshi 音频的转写（Whisper <sup>[27]</sup> 转写 + SentencePiece <sup>[15]</sup> 分词），并把它 **插入为 V 的第一条子序列** ，使其成为语义 token 生成的前缀：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEDoRXaCT00S7LD1wtPGWo6ibKBtJN2HnkSibXtFdk4kkpaAUlXGpU7Sd5PtyZyAuibP2vtX5iawEwh7rYGvE7jPhNjRdJKolyMO4kE/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=30)

这可以看作 AudioLM <sup>[4]</sup> 的"层级语义 → 声学生成"的直系延伸，但 Moshi 做了一处关键取舍： **只对 Moshi 自己的语音做文本对齐，不使用用户的文本流** 。论文给出的理由很硬：实时转写用户语音在工程上困难，而依赖一个外部 ASR 系统 **直接违背了端到端的初衷** 。消融研究（5.3 节）显示，在 Moshi 的所有设计选择中， **Inner Monologue 是对生成语音质量影响最大的一个** 。

### 7.2 对齐方法是关键：PAD 与 EPAD

要把文本 token 接到 12.5 Hz 的音频帧上，需要一套对齐规则。Moshi 用 Whisper 的 **词级时间戳** ：第 i 个词映射到 n <sub>i</sub> 个文本 token w <sub>i,1</sub>,…,w <sub>i,n <sub>i</sub></sub> ，起始帧索引为

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEB4LicJaI9ocmzXuf6JFfnNgxejqicDia5n7JzSKjvmLwvkfJaU8YEaamB2P0WSeYKjU3YdjkQ1RicLu8vCogOcX5H3j1PGYqOHJq4/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=31)

然后引入两个特殊 token： **PAD** 与 **EPAD** （都不出现在任何词里）。构造过程是 **先全部填 PAD，再逐词覆盖** （论文式 (5)）：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEBqqNdxO1WREDZSmLJ6UsibCHaeZTCVFr1sS2NfP2NPgcZyOicShbaZKrianflZkvvarPMiaGqmM1xibticzbic9CVUia6Os5ibBGzFrOiaQ/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=32)

两条边界规则：若 t <sub>i</sub> = 1，则把 EPAD 插在位置 1 并把文本 token 整体右移；若 EPAD 会覆盖上一个词的文本 token，则不插入。因为文本 token 比对应的音频 token 紧凑得多，词与词之间通常并不冲突。

为什么非要有 EPAD？论文的解释很精妙：

> **EPAD 把"当前这个词是否结束"与"下一个词是什么"这两个决策拆成了两步。**

从建模角度看，这降低了每一步的条件熵——"这一帧是否还在说同一个词"和"下一个词是哪个"是两类完全不同的判断，混在一条 PAD 流里会让模型难以把握节奏。

还有一个容易被忽略的数字：在英文对话语音中， **PAD 大约占了全部文本 token 的 65%** 。也就是说，这条文本流大部分时间在说"我还在这句话里"。

### 7.3 顺带的收获：一个超参切换 ASR 与 TTS

既然文本流与音频流在同一条序列里，就可以 **在两者之间人为引入延迟** ，而这个延迟决定了"由哪种模态来决定内容"：

| 配置 | 谁决定内容 | 得到的系统 | 实测 |
| --- | --- | --- | --- |
| 文本与音频对齐（Δ = 0） | 两者共同决定 | 对话模型 | — |
| **文本在前**  （音频延迟） | 文本决定音频"说什么" | **流式 TTS** | 4.7% WER |
| **音频在前**  （文本延迟） | 音频决定文本"是什么" | **流式 ASR** | 5.7% WER，词级对齐 80 ms |

以 ASR 为例：让音频先行， **只采样文本 token、把音频 token 替换为真值** ，就得到一个流式语音识别模型，而且它天然输出词级时间对齐。反过来，文本先行时，音频内容由文本决定，配合合适的 padding 策略（附录 C 给了如何让模型自己生成正确 padding 的文本序列），就得到零样本流式 TTS。

论文强调这是"框架能力的展示"而非与专用系统竞争： **损失函数、架构、训练数据一个都没改，只动了一个延迟超参** 。

### 7.4 结果：口语问答准确率接近三倍

Inner Monologue 的价值在"知识型口语问答"（Spoken QA）上体现得最彻底——这些基准要求模型 **在语音域直接回答事实性问题** （如 TriviaQA 的口语版本）：

| 模型 | Web Questions | LlaMA Questions | Audio Trivia QA |
| --- | --- | --- | --- |
| GSLM <sup>[33]</sup> | 1.5 | 4.0 | — |
| AudioLM <sup>[4]</sup> | 2.3 | 7.0 | — |
| TWIST（7B） <sup>[36]</sup> | 1.1 | 0.5 | — |
| **Moshi（无 IM）** | 9.2 | 21.0 | 7.3 |
| SpeechGPT（7B） <sup>[38]</sup> | 6.5 | 21.6 | 14.8 |
| Spectron（1B） <sup>[39]</sup> | 6.1 | 22.9 | — |
| **Moshi（有 IM）** | **26.6** | **62.3** | **22.8** |
| Helium（纯文本上界） | 32.3 | 75.0 | 56.4 |

三个结论：

1\. **Inner Monologue 让准确率接近三倍** （Web Q. 9.2 → 26.6，LlaMA Q. 21.0 → 62.3），而推理成本只多了 1 个 token（每步 17 个而非 16 个）。这是整篇论文"性价比最高"的设计。

2\. **Moshi 是这批模型里唯一同时建模语义与声学 token 的** ，因此能在任意音色与录音条件下工作；SpeechGPT、Spectron 采用"Chain-of-Modality"（先出完整文本再出语音）， **本质上是非流式的** ，而 Moshi 的文本与语音是同步流式生成的。

3\. **纯文本预训练的知识会遗忘** 。论文指出：如果预训练时不保留 50% 的纯文本批次，准确率会明显下降—— **"从 Helium 热启动"并不足以在整个音频训练过程中保住文本知识** 。

代价也很清楚：Moshi 的 MMLU 是 49.7，低于 Helium 的 54.3。实测中差距最大的是 TriviaQA——论文分析错误样本后发现， **多句长问句和特定句法结构** （如"On the human body, a keloid is a type of what?"）是主要失分点，因为指令微调数据都是口语风格对话，很少出现这种书面句法。论文给出的猜想是： **在微调阶段覆盖更多句法场景就能缩小这个差距** 。

### 7.5 生成对话的轮转统计：与人类几乎一致

因为模型能生成对话双方，论文得以 **离线生成 1000 段 5 分钟对话** ，用外部语言模型打分并统计轮转指标（IPU = 连续语音段，Pause = 同一说话人的段间静默，Gap = 不同说话人的段间静默，Overlap = 双方同时存在语音的时间）：

| 模型 / 采样温度 | PPL（↓） | IPU | Pause | Gap | Overlap |
| --- | --- | --- | --- | --- | --- |
| 最好的非级联基线 <sup>[34]</sup> | 195.9 | 41.4 s | 13.8 s | 10.7 s | 6.1 s |
| 级联基线 <sup>[34]</sup> | 45.9 | 54.8 s | **0.0 s** | 5.3 s | **0.0 s** |
| **Moshi（temp 0.8）** | **41.9** | 35.1 s | 13.2 s | 12.5 s | 1.2 s |
| **Moshi（temp 0.9）** | 56.7 | 44.7 s | 9.1 s | 7.5 s | 2.2 s |
| **Moshi（temp 1.0）** | 79.3 | 50.8 s | 7.0 s | 4.5 s | 4.1 s |
| 人类真值 | 59.6 | 51.1 s | 6.4 s | 4.2 s | 3.3 s |

两个观察非常有意思：

• **温度调低虽然让文本更"通顺"（PPL 41.9），但对话动态会退化** ：重叠从 4.1 s 掉到 1.2 s，模型变得"过于礼貌"、几乎不插话；

• **温度 1.0 时，Moshi 自发学出的轮转统计与人类真值高度吻合** （IPU 50.8 vs 51.1，Pause 7.0 vs 6.4，Gap 4.5 vs 4.2，Overlap 4.1 vs 3.3），文本困惑度也落在人类水平附近。

对比之下，级联基线 <sup>[34]</sup> 的 Pause 和 Overlap 都是 **0.0 s** ——因为它的轮次是"切"出来的，天然不存在重叠。这正是 Moshi 想解决的问题的量化体现。

---

## 八、训练流水线：五个阶段与一个损失函数

![训练流水线](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicECI33LiblGRPw8VqWDvkFTLia2E7c9kh2QZSq2emmx9AtlQXyrib7MO7eNJ6QBpEwhaEDpml1lQvfrBbw3aT2TJgwickzYYmuCOoYQ/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=34)

### 8.1 损失函数：文本与音频同等重要

Moshi 的损失很简单——就是每个子序列上的交叉熵，但 **文本流直接进总和，音频流按权重做平均** （论文式 (7)）：

![公式](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicECxXvUoWGVvruBibRHITwjkf3BZF3mPNATaDSE7sTkUnL0JsdS7SpXu7icGblDK0XVxJlZUj3XpCFuCOns1Wl9OxtxuRsj2QZjBM/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=35)

权重取 α <sub>k</sub> = 100（语义 token）与 α <sub>k</sub> = 1（声学 token）。为什么要拉开 100 倍？因为一条时间步里有 **8 条音频流但只有 1 条语义流** ：若不加权，7 层声学残差的损失会淹没语义流；加权后， **语义 token 与文本 token 在总损失里大致等权** ，模型才会同时在意"说得对不对"和"像不像人声"。

注意这里没有任何"轮次预测""静音检测""说话人分类"的辅助损失——所有对话行为都从这一个损失里涌现。

### 8.2 五个阶段

| 阶段 | 目标 | 数据与规模 | 关键超参 |
| --- | --- | --- | --- |
| **① Helium 文本预训练** | 建立一个足够强的语言底座 | 2.1T token 英文公开语料 | 500k 步，批 4.2M token，lr 3e-4，上下文 4096 |
| **② Moshi 音频预训练** | 学会"音频 → 音频"的自回归建模 | **7M 小时**  无监督音频（单流） | 1M 步，批 16 h，lr 3e-5 / Depth 2e-4，声学延迟 τ=2 |
| **③ 多流后训练** | 从单流扩展到双流 | 用 pyannote <sup>[30]</sup> 分离得到的伪双流数据 | 100k 步，批 8 h，lr 3e-6 / 5e-5，τ=1 |
| **④ Fisher 微调** | 学习真实的重叠与打断 | Fisher <sup>[29]</sup> ，2000 h 真实电话对话 | 10k 步，批 40 min，lr 2e-6 / 4e-6 |
| **⑤ 指令微调** | 变成有用的助手，学会自然静音与插话 | 20k 小时合成对话语音 | 30k 步，批 2.7 h，lr 2e-6 |

阶段 ② 有几个值得注意的技巧：

• **30% 概率屏蔽文本 token** ：训练时随机把部分文本 token 置为"不可用"，避免模型过度依赖 Inner Monologue 而忽略音频；

• **随机文本延迟 ± 0.6 s** ：让模型适应不同的文本-音频对齐关系，因为真实场景里转写时间戳并不完美；

• **一半的时间继续训练纯文本批** ：这就是 7.4 节提到的"防止遗忘"的关键措施。

阶段 ⑤ 的重点是 **增益与场景多样性** 。对用户侧音频施加多类增广（音量缩放 -24 ~ +15 dB、DNS 噪声 <sup>[31]</sup> 、最长 30 秒的长静音、回声、混响，以及回声与混响同时叠加等），同时对文本流做随机丢弃—— **目的是让模型在真实声学环境下依然稳定，并且不过度依赖"用户一定有清晰文本"这个假设** 。

### 8.3 为什么必须分阶段

论文给出了一个很实在的工程理由： **直接从海量无标注音频开始训练双流模型是行不通的** 。分阶段的作用是层层递进：

1\. 先用单流、无监督数据让模型学会"音频 token 世界的语法"（阶段 ②）；

2\. 再用弱监督的伪双流数据把模型"撑开"成两条流（阶段 ③）——论文特别指出这批数据 **没有重叠、静音是完全静音的** ，与真实对话差距明显；

3\. 然后用真实电话对话补齐"重叠、打断、犹豫"这些真实交互（阶段 ④）；

4\. 最后把"说话人身份"从"随机的主说话人"固定为"一个有用的助手"，并学会在恰当的时机保持沉默（阶段 ⑤）。

这个顺序也解释了 Moshi 为什么能把训练数据成本控制住： **700 万小时的弱监督数据只用来学结构，真正决定交互质量的只有 2000 小时真实通话 + 2 万小时合成语音** 。

---

## 九、实测性能

![实验结果汇总](https://mmbiz.qpic.cn/sz_mmbiz_png/GMXaw6ibcicECiao9lCsrOwfapBrPHmd2Wnd2V328aTpnhFqwzZStPwiaEnP0ic8CRctHh09R5T19ibuWZbTFuhApvCHVFdiblNATNQY1W8t1S5hmU/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=36)

### 9.1 延迟：理论 160 ms，实测 200 ms

延迟由三段构成，每一段都被架构钉死：

| 环节 | 延迟 | 来源 |
| --- | --- | --- |
| 声学 token 延迟 | 80 ms | 声学流相对语义流延迟 1 帧（τ=1） |
| 自回归流水线 | 80 ms | Depth Transformer 必须在下一帧到来前完成列内 17 个 token 的串行生成 |
| **理论合计** | **160 ms** | 论文口径 |
| 实测端到端 | **200 ms** | 含编解码与系统开销 |

对照人类对话的 230 ms 平均间隔 <sup>[1]</sup> ，Moshi 已经进入"不觉得在等机器"的区间。这是 **架构属性而非工程优化** ：只要把 τ 从 1 降到 0，延迟就变成 80 ms——代价是 5.4 节那张消融表里断崖式变差的生成质量。

### 9.2 音频质量与语音识别/合成

**音频质量（MUSHRA 主观评分）** ：Mimi 拿到 **81.0** 分，在同等或更低的码率（1.1 kbps）下领先 SemantiCodec <sup>[46]</sup> （64.8）、SpeechTokenizer <sup>[11]</sup> （74.3 @ 4.0 kbps）、RVQGAN <sup>[45]</sup> （31.3）。需要强调的是它 **全因果、可流式** ——这些优势并非来自更大的模型，而来自 4.4 节那三个反直觉的训练选择。

**流式 ASR** ：把音频放在文本之前、只采样文本，Moshi 在 LibriSpeech <sup>[47]</sup> test-clean 上达到 **5.7% WER** ，并提供 80 ms 精度的词级对齐。

**流式 TTS** ：把文本放在音频之前，用 ASR 模型评估合成语音的可懂度，得到 **4.7% WER** 。

再次强调：这三个系统用的是 **同一个模型、同一份损失、同一批训练数据** ，区别只是推理时的延迟配置。

### 9.3 小结

| 能力 | 结果 |
| --- | --- |
| 理论 / 实测延迟 | 160 ms / 200 ms |
| 口语问答（Web Q. / LLaMA Q. / Trivia QA） | 26.6 / 62.3 / 22.8（Inner Monologue 带来近 3 倍提升） |
| 生成对话的轮转统计 | 与人类真值高度吻合（Overlap 4.1 s vs 3.3 s） |
| 流式 ASR / TTS | 5.7% / 4.7% WER |
| 音频质量 | MUSHRA 81.0 @ 1.1 kbps |
| 文本能力 | MMLU 49.7（Helium 为 54.3） |

---

## 十、工程与部署：量化的代价

![后训练量化的影响](https://mmbiz.qpic.cn/mmbiz_png/GMXaw6ibcicEDpIYsxoTlrz1jAmicFt7Ep0rxywtVRg4hOESL6Qva6uGOfTwBTmOHpoa9yjNOr0iak5UPlKicqNr9R0wVJf2HajDvCicd1hhicj7ls/640?wx_fmt=png&from=appmsg&watermark=1#imgIndex=37)

实时对话模型要上线，量化几乎是必选项。论文用 LLM.int8 类方法 <sup>[76]</sup> （分块量化，块大小 32 / 64 / 128 / 256，可只量化 FFN 或全部权重）做了系统测试，结论对工程实践很有参考价值。

### 10.1 文本主干 Helium：W4 仍然安全

| 精度 | 模型体积 | MMLU |
| --- | --- | --- |
| BF16 基线 | — | **54.3** |
| W8 | 7.66 GB | 53.96 |
| W6 | 6.02 GB | 53.86 |
| W5 | 5.20 GB | 52.76 |
| **W4** | **4.37 GB** | **52.97** |
| W3 | 3.55 GB | 50.85 |
| W2 | 2.73 GB | 24.27 |

**W4 时 MMLU 仍在基线 2 分以内，体积压缩 3.4 倍** ；W3 开始明显退化，W2 直接崩塌。这与纯文本模型上量化研究的普遍结论一致（GPTQ <sup>[77]</sup> 等）。

### 10.2 语音模型 Moshi：对精度更敏感

| 精度 | 模型体积 | MMLU |
| --- | --- | --- |
| BF16 基线 | — | **49.7** |
| W8 | 9.20 GB | 47.6 |
| W6 | 7.70 GB | 48.3 |
| W5 | 6.69 GB | 47.2 |
| W4 | 5.18 GB | 42.2 |
| W3 | 4.18 GB | 29.9 |
| W2 | 3.17 GB | 24.9 |

同样的配方用在 Moshi 上损失更大（W4 掉 7.5 分，W3 直接崩掉 20 分）。论文的观察是： **音频 token 的预测比文本更依赖权重精度** ——声学残差 token 的概率分布本来就更"平"，量化误差会直接改变采样结果，进而反映为音质与韵律的退化。

因此官方在线 demo 采用的是 **8 比特权重 + 8 比特激活（W8A8）** 。论文也把"设计量化感知训练阶段与校准数据集"列为后续工作。

---

## 十一、安全与责任

Moshi 团队在论文中专门用一章讨论安全，围绕四个问题展开。

### 11.1 毒性内容

用 ALERT 基准 <sup>[73]</sup> 评估 Moshi 生成的 **文本** （因为音频毒性缺乏成熟评测方法），覆盖仇恨、自伤、武器、犯罪、性、成瘾等类别：

| 模型 | Moshi | GPT-3.5 | GPT-4 | Llama 2 | Alpaca | Vicuna | Falcon | Mistral | Mixtral | Zephyr | OLMo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 综合安全分 | 83.05 | 96.95 | 99.18 | 99.98 | 62.13 | 95.75 | 88.11 | 75.45 | 98.22 | 77.86 | 85.90 |

Moshi 处于中游，高于 Alpaca、Mistral、Zephyr，低于闭源工业模型。论文的解释很坦诚： **工业模型受益于海量私有标注、红队测试与反馈闭环，而 Moshi 没有做这类对齐** 。

### 11.2 训练数据回吐（Regurgitation）

语音模型的回吐风险比文本更复杂：不只是文本内容，还可能连带 **音高、语气，甚至训练数据里的背景音乐** 。

论文的做法是先开发一套音频片段匹配系统，找出训练集中 **最高频的重复片段** （选了一个 16 秒、便于检测的片段），然后测 10 万次生成中有多少次精确复现：

| 配置 | 回吐率 |
| --- | --- |
| 未去重的预训练模型（无条件生成，temp 0.6–1.0） | **最高 100%** |
| 未去重模型 + 3 秒 prompt | 98.4% |
| **去重后 + 对话微调** | **0.00%** |

结论： **训练数据去重** （把高频片段过滤掉）加上对话微调，即使给模型 3 秒的 prompt，也无法复现训练集片段 <sup>[74]</sup> 。论文也谨慎地补充：微调可能被绕过，因此"不能仅靠微调解决知识产权问题"。

### 11.3 系统音色一致性

一个语音模型应当说"自己的声音"，而不是模仿用户。论文生成 100 小时对话，用 WavLM <sup>[9]</sup> 提取说话人嵌入做验证：

• **98.7%** 的情况下，Moshi 的语音更接近自己的参考段，而非对方说话人（仅 1.3% 相反）；

•按时间窗口统计（20–25 s 至 40–45 s），一致性稳定在 **98.4%–99.3%** ， **没有随时间漂移** 。

这说明"指令微调时固定系统音色"这一简单做法，足以在推理时提供鲁棒性。

### 11.4 内容溯源与音频水印

论文给出两条互补路径：

• **音频索引** ：适用于能访问生成端机器的场景（如官方 demo 服务端），通过音频匹配系统反查；

• **音频水印** ：用 AudioSeal <sup>[72]</sup> 在生成语音中嵌入水印，1 秒以上的音频即可高置信度检测。

---

## 十二、局限与启示

### 12.1 论文承认的局限

1\. **文本知识退化** ：MMLU 从 Helium 的 54.3 掉到 49.7；TriviaQA 差距最大，原因是微调数据全是口语风格， **多句长问句和书面句法** 很少出现。

2\. **上下文只有约 5 分钟** （4096 帧 × 80 ms）。对闲聊足够，对长会议或长文档朗读不够。

3\. **量化敏感** ：W4 就掉了 7.5 分，音频任务对权重精度要求高于文本。

4\. **无对齐/RLHF 环节** ：安全分处于中游，也没有做偏好优化。

5\. **ASR / TTS 只是"能力展示"** ：论文明确表示不打算与专用系统竞争 SOTA。

### 12.2 对做语音/多模态系统的启示

回顾整个架构，有几点设计与工程判断值得记下来：

**① 抽象比模型更重要。** Moshi 真正的创新不是某个网络结构，而是 **把"对话"重新定义为一条由 K=17 条子序列构成的联合序列** 。一旦这样定义，"轮次""打断""静音""重叠"全都不再是需要专门处理的分支，而是序列建模的自然产物—— **问题定义变了，工程复杂度就降了一个量级** 。

**② 延迟是架构属性，不是优化指标。** 160 ms 不是调出来的，而是"12.5 Hz 帧率 + 1 帧声学延迟 + 一帧流水线"算出来的。反过来，延迟预算是 **自上而下分解** 到编解码器（必须因果、必须 80 ms 一帧）和生成结构（必须两步分解）的。

**③ 把最贵的串行计算放在最小的模型上。** Depth Transformer 只有 6 层 / 1024 维，却承担每帧 17 个 token 的串行生成；32 层 / 4096 维的大模型只在时间维上跑 S 步。 **计算预算的分配和计算的性质（可并行 vs 必须串行）匹配** ，这是低延迟的关键。

**④ 文本仍然是语音模型的智力来源。** Moshi 的对话能力、事实知识、推理能力几乎全部来自 Helium；Inner Monologue 的作用是把这份能力"翻译"到语音域。 **纯音频自监督数据能学到韵律和声学，但学不到知识。**

**⑤ 数据要分层使用。** 7M 小时弱监督数据学"结构"（双流怎么并行），2000 小时真实通话 + 20k 小时合成语音学"交互"（重叠、打断、静音）。 **用廉价数据解决廉价问题，用昂贵数据解决昂贵问题** ——而不是把所有数据混在一起训练。

**⑥ 别让客观指标替你决策。** Mimi 最终版本放弃了重建损失、只用对抗训练，客观指标全面变差， **主观 MUSHRA 反而从 58.8 涨到 81.0** 。论文坦率承认这是一个"与直觉相反"的发现——如果只盯着 PESQ / VisQOL，就永远得不到 Mimi。

---

## 参考文献

> 说明：为便于与原文对照，本文的参考文献编号与 Moshi 论文（arXiv:2410.00037）保持一致，此处仅列出正文引用到的条目。

<sup>[1]</sup> Stivers T, Enfield N J, Brown P, et al. Universals and cultural variation in turn-taking in conversation. \*Proceedings of the National Academy of Sciences\*, 106(26): 10587–10592, 2009.

<sup>[2]</sup> Vaswani A, Shazeer N, Parmar N, et al. Attention Is All You Need. \*NeurIPS\*, 2017.

<sup>[3]</sup> Défossez A, Mazaré L, Orsini M, et al. Moshi: a speech-text foundation model for real-time dialogue. \*arXiv:2410.00037\*, 2024.

<sup>[4]</sup> Borsos Z, Marinier R, Vincent D, et al. AudioLM: a Language Modeling Approach to Audio Generation. \*IEEE/ACM Transactions on Audio, Speech, and Language Processing\*, 2023.

<sup>[5]</sup> Zeghidour N, Luebs A, Omran A, et al. SoundStream: An End-to-End Neural Audio Codec. \*IEEE/ACM TASLP\*, 2022.

<sup>[6]</sup> Défossez A, Copet J, Synnaeve G, Adi Y. High Fidelity Neural Audio Compression (EnCodec). \*TMLR\*, 2023.

<sup>[7]</sup> van den Oord A, Vinyals O, Kavukcuoglu K. Neural Discrete Representation Learning. \*NeurIPS\*, 2017.

<sup>[8]</sup> Hsu W N, Bolte B, Tsai Y H, et al. HuBERT: Self-Supervised Speech Representation Learning by Masked Prediction of Hidden Units. \*IEEE/ACM TASLP\*, 2021.

<sup>[9]</sup> Chen S, Wang C, Chen Z, et al. WavLM: Large-Scale Self-Supervised Pre-Training for Full Stack Speech Processing. \*IEEE JSTSP\*, 2022.

<sup>[10]</sup> Baevski A, Zhou H, Mohamed A, Auli M. wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations. \*NeurIPS\*, 2020.

<sup>[11]</sup> Zhang X, Zhang D, Li S, et al. SpeechTokenizer: Unified Speech Tokenizer for Speech Large Language Models. \*ICLR\*, 2024.

<sup>[12]</sup> Tagliasacchi M, Li Y, Misiunas K, et al. SEANet: A Multi-modal Speech Enhancement Network. \*Interspeech\*, 2020.

<sup>[13]</sup> Clevert D A, Unterthiner T, Hochreiter S. Fast and Accurate Deep Network Learning by Exponential Linear Units (ELUs). \*ICLR\*, 2016.

<sup>[14]</sup> Salimans T, Kingma D P. Weight Normalization: A Simple Reparameterization to Accelerate Training of Deep Neural Networks. \*NeurIPS\*, 2016.

<sup>[15]</sup> Kudo T, Richardson J. SentencePiece: A Simple and Language Independent Subword Tokenizer and Detokenizer for Neural Text Processing. \*EMNLP (System Demonstrations)\*, 2018.

<sup>[16]</sup> Zhang B, Sennrich R. Root Mean Square Layer Normalization. \*NeurIPS\*, 2019.

<sup>[17]</sup> Su J, Ahmed M, Lu Y, et al. RoFormer: Enhanced Transformer with Rotary Position Embedding. \*Neurocomputing\*, 2024.

<sup>[18]</sup> Dao T, Fu D Y, Ermon S, et al. FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. \*NeurIPS\*, 2022.

<sup>[19]</sup> Shazeer N. GLU Variants Improve Transformer. \*arXiv:2002.05202\*, 2020.

<sup>[20]</sup> Hendrycks D, Gimpel K. Gaussian Error Linear Units (GELUs). \*arXiv:1606.08415\*, 2016.

<sup>[21]</sup> Loshchilov I, Hutter F. Decoupled Weight Decay Regularization. \*ICLR\*, 2019.

<sup>[22]</sup> Touvron H, Cord M, Sablayrolles A, et al. Going Deeper with Image Transformers. \*ICCV\*, 2021.

<sup>[23]</sup> Lee D, Kim S, Cho H, et al. Autoregressive Image Generation using Residual Quantization. \*CVPR\*, 2022.

<sup>[24]</sup> Copet J, Kreuk F, Gat I, et al. Simple and Controllable Music Generation. \*NeurIPS\*, 2023.

<sup>[25]</sup> Zhu X, Kang L, Yao Z, et al. Towards Speech Language Models with Hierarchical Transformers. \*arXiv\*, 2024.

<sup>[26]</sup> Yang D, Tian J, Tan X, et al. UniAudio: An Audio Foundation Model Toward Universal Audio Generation. \*ICML\*, 2024.

<sup>[27]</sup> Radford A, Kim J W, Xu T, et al. Robust Speech Recognition via Large-Scale Weak Supervision (Whisper). \*ICML\*, 2023.

<sup>[29]</sup> Cieri C, Miller D, Walker K. The Fisher Corpus: a Resource for the Next Generations of Speech-to-Text. \*LREC\*, 2004.

<sup>[30]</sup> Bredin H. pyannote.audio 2.1 Speaker Diarization Pipeline. 2023.

<sup>[31]</sup> Dubey H, Cutler R, Aichner R, et al. ICASSP 2023 Deep Speech Enhancement Challenge. \*ICASSP\*, 2023.

<sup>[33]</sup> Lakhotia K, Kharitonov E, Hsu W N, et al. On Generative Spoken Language Modeling from Raw Audio. \*TACL\*, 2021.

<sup>[34]</sup> Nguyen T A, Kharitonov E, Copet J, et al. Generative Spoken Dialogue Language Modeling. \*TACL\*, 2023.

<sup>[36]</sup> Hassid M, Remez T, Nguyen T A, et al. Textually Pretrained Speech Language Models. \*NeurIPS\*, 2023.

<sup>[38]</sup> Zhang D, Li S, Zhang X, et al. SpeechGPT: Empowering Large Language Models with Intrinsic Cross-Modal Conversational Abilities. \*EMNLP (Findings)\*, 2023.

<sup>[39]</sup> Nachmani E, Levkovitch A, Hirsch R, et al. Spoken Question Answering and Speech Continuation Using Spectrogram-Powered LLM. \*ACL\*, 2024.

<sup>[45]</sup> Kumar R, Seetharaman P, Luebs A, et al. High-Fidelity Audio Compression with Improved RVQGAN. \*NeurIPS\*, 2023.

<sup>[46]</sup> Liu H, Xu K, Wang T, et al. SemantiCodec: An Ultra Low Bitrate Semantic Audio Codec for General Sound. \*IEEE JSTSP\*, 2024.

<sup>[47]</sup> Panayotov V, Chen G, Povey D, Khudanpur S. LibriSpeech: An ASR Corpus Based on Public Domain Audio Books. \*ICASSP\*, 2015.

<sup>[70]</sup> Joulin A, Grave E, Bojanowski P, Mikolov T. Bag of Tricks for Efficient Text Classification. \*EACL\*, 2017.

<sup>[71]</sup> Çetin Ö, Shriberg E. Analysis of Overlaps in Meetings by Dialog Factors, Hot Spots, Speakers, and Collection Site. \*Interspeech\*, 2006.

<sup>[72]</sup> San Roman R, Fernandez P, Défossez A, et al. Proactive Detection of Voice Cloning with Localized Watermarking. \*ICML\*, 2024.

<sup>[73]</sup> Tedeschi S, Boschi G, Curcio F, et al. ALERT: A Comprehensive Benchmark for Assessing and Enhancing Large Language Model Safety. \*NeurIPS\*, 2024.

<sup>[74]</sup> Carlini N, Ippolito D, Jagielski M, et al. Quantifying Memorization Across Neural Language Models. \*ICLR\*, 2023.

<sup>[76]</sup> Dettmers T, Lewis M, Belkada Y, Zettlemoyer L. LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale. \*NeurIPS\*, 2022.

<sup>[77]</sup> Frantar E, Ashkboos S, Hoefler T, Alistarh D. GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers. \*ICLR\*, 2023.

Model Scope · 目录