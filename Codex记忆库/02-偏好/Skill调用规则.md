
---
tags: [偏好, Skill, 技能路由, 调用规范]
date: 2026-07-30
---

# Skill 调用规则

## 核心原则

不同任务需要不同的 skill 组合。以下路由表定义了我遇到每种任务时，按什么顺序调用哪些 skill。

**路由流程**：你提出任务 → 我识别任务类型 → 查此表确定 skill 管线 → 按顺序调用 → 输出结果。

---

## 一、PPT 生成管线（核心）

这是你最常用的任务类型。每次生成 PPT 内容时，必须走以下流水线：

| 阶段 | Skill | 产出 | 耗时 |
|------|-------|------|------|
| **① 客户/行业研究** | `market-research` 或 `deep-research` + vault_search.py | 市场数据、客户背景、竞品定位 | 先做 |
| **② 叙事结构设计** | `article-writing` 或 `investor-materials` | 故事线、每页论点链 | 第二阶段 |
| **③ 逐页内容生成** | `PPT输出规范.md`（偏好文件） | 每页稿：标题→数据→要点→行动项 | 第三阶段 |
| **④ 可选：视觉增强** | `excalidraw-diagram-generator` 或 Mermaid | 架构图、流程图 | 需要时说 |
| **⑤ 生成 .pptx 文件** | `pptx` 或 `presentations` | 可打开、可打印、可投屏的 PowerPoint 文件 | 你确认稿子后 |

> **选择哪个 skill**：`pptx` 优先（功能更强、自带校验、支持图表），`presentations` 备选（需要更简单的输出时用）。
>
> **流程**：你确认第③步的内容稿后 → 用 `pptx` 生成 `.pptx` 文件 → 自动运行校验脚本 → 没问题告诉你文件位置。
>
> **架构图**：用 `excalidraw-diagram-generator` 生成 PNG，嵌入 PPT 对应页。

**什么时候用哪个研究 skill**：
- 客户是已知的（如东风）→ 先跑 `vault_search.py` 查记忆库，不够再用 `market-research`
- 客户是新的 → 直接用 `market-research` + `lead-intelligence`
- 需要深度验证（技术合规、法规）→ 用 `deep-research`

**PPT 类型对应哪个叙事 skill**：
- 首次拜访/破冰 → `article-writing`（趋势解读驱动）
- 技术交流 → 直接走 `PPT输出规范.md` 场景 B 模板，不用额外叙事 skill
- RFQ/竞标 → `investor-materials`（商业模型 + 竞争定位）
- 决策层汇报 → `investor-materials`（ROI/TCO 叙事）

---

## 二、其他任务的 Skill 路由

| 你的需求 | Skill 组合 | 说明 |
|----------|-----------|------|
| 行业动态/新闻监控 | `business-news-monitor` | 按 skill 中定义的三维度（客户/竞品/趋势）自动搜索，输出每日简报或周报 |
| 行业内容（脉脉/LinkedIn） | `business-news-monitor` → `article-writing` → `brand-voice` | 先用新闻监控搜集素材，再写叙事，最后调语调 |
| 竞品分析 | `market-research` + vault_search + 表格输出 | 用表格做 TCO 对比，不要段落式 |
| 客户拜访材料 | `lead-intelligence` 或 vault_search → `excalidraw-diagram-generator` | 定制化方案架构图，不是通用 PPT |
| 冷邮件/跟进函 | `investor-outreach` → 用户确认 → `email-ops` | 先草稿再发出 |
| 产品技术文档 | vault_search(艾博连产品资料) → `documentation-writer` | 基于已有材料整理，不编造 |
| 数据分析/报告 | `spreadsheet-analysis` 或 `datanalysis-credit-risk` | 结构化表格 + 结论 |
| 自动化脚本 | 对应脚本语言 skill（如 `python-pypi-package-builder`） | 不调不需要的 skill |

---

## 三、不需要调 skill 的情况

以下任务直接用我自己的知识处理，不要走 skill 管线：
- 简单的文本整理、格式调整
- 记忆库笔记的创建和更新
- 对已有材料的小幅修改
- 不需要外部数据和研究的纯逻辑任务

---

## 四、Skill 调用优先级规则

1. **用户记忆库优先** — 任何任务开始前，先检查记忆库里有没有现成的资料。有的话先用 vault_search 搜索，不够再调外部 skill
2. **一个管线只调一个研究 skill** — 不要同时调 `market-research` 和 `deep-research`，选一个就够了，除非用户明确要求多源交叉验证
3. **产出格式绑定偏好文件** — PPT 相关的产出必须走 `PPT输出规范.md`，不允许自由发挥
4. **每次出稿前问一次** — 每次 PPT 类任务必须先问用户：「听众是谁？什么场景？」除非用户已经在请求里说清楚了

---

*更新于 2026-07-30 — 首次创建，覆盖 PPT 生成和常见销售任务的 skill 路由*
