<!-- ppt-master-schema: design-spec/v1 -->
# 东风集团-90天商务版 - Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | 东风集团-90天商务版 |
| Canvas Format | PPT 16:9 (1280x720) |
| Page Count | 12 |
| Primary Language | zh-CN |
| Target Audience | 销售总监，负责审批工作计划、资源投入和阶段复盘 |
| Communication Intent | 对齐90天工作计划的逻辑、里程碑与资源需求；先说明为什么东风出口座舱机会值得验证，再给出四阶段路径和决策点；请总监确认优先级、支持资源和复盘机制 |
| Desired Audience Outcome | 总监认可计划，明确“继续推进、调整优先级、补充资源”的具体意见，并约定每周复盘和四个关键检查点 |
| Core Message / Ask / Action | 90天内用四阶段验证东风出口座舱机会，锁定“付费POC、联合预研或正式供应商评估”任一可量化结果；华为仅作为合作伙伴，不假设其商务作用 |
| Delivery Context | 销售总监汇报会，presenter-led，15-20分钟；同时作为后续执行底稿和每周复盘依据 |
| Artifact Afterlife | 用于入职工作计划汇报，确认后作为90天执行底稿和阶段复盘工具 |
| Reading Mode | balanced |
| Content Strategy | balanced default：在源材料基础上重构为更清晰的商务叙事，保留事实、路径、里程碑和风险，不新增未经来源支持的承诺 |
| Design Style | pyramid + swiss-minimal |
| Formula Policy | text-only |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | enabled - proactive default |
| Custom Animations | disabled - proactive default |
| Narration Audio | disabled - proactive default |
| Created Date | 2026-08-03 |

## II. Canvas Specification

| Property | Value |
| --- | --- |
| Format | PPT 16:9 |
| Dimensions | 1280 x 720 |
| viewBox | `0 0 1280 720` |
| Margins | 64px safe margin |
| Content Area | 1152 x 592 |

## III. Visual Theme

### Theme Style

- **Mode**: pyramid
- **Visual style**: swiss-minimal
- **Theme**: 商务决策简报
- **Tone**: 结论先行、克制、可信

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | [[F6F4EF]] | 主背景，暖白底 |
| Secondary background | [[FFFFFF]] | 卡片、信息区块 |
| Primary | [[17211F]] | 标题、强调文字、深色区域 |
| Accent | [[C34A3D]] | 关键结论、里程碑、风险 |
| Secondary accent | [[2E6F68]] | 备线、验证通过、次要行动 |
| Body text | [[3E403D]] | 正文 |
| Surface | [[EFECE5]] | 浅灰面、阶段色块 |
| Grid | [[D8D4CB]] | 网格线、分隔线 |

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | bold grotesque | PingFang SC | Arial | Microsoft YaHei, sans-serif |
| Body | regular sans | PingFang SC | Arial | Microsoft YaHei, sans-serif |

- **Title stack**: PingFang SC, Microsoft YaHei, Arial, sans-serif
- **Body stack**: PingFang SC, Microsoft YaHei, Arial, sans-serif

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Body | 24 |
| Title | 42 |
| Subtitle | 30 |
| Lead | 28 |
| Data | 48 |
| Annotation | 18 |
| Footnote | 16 |

## V. Layout Principles

### Page Structure

- **Header area**: 顶部留白充足；页面标题左对齐，标题下方用单条强调线建立层级；章节号或英文副题放右上。
- **Content area**: 以 12 列网格组织内容；数据锚点独立成块，正文保持在可扫读的信息密度内。
- **Footer area**: 底部左侧放来源或辅助说明，右侧放页码；仅使用细线分隔，不做装饰。

### Spacing Specification

| Element | Current Project |
| --- | --- |
| Safe margin | 64px |
| Content block gap | 24px |
| Icon-text gap | 12px |

## VI. Icon Usage Specification

- **Primary bundled library**: none

| Purpose | Icon Path | Page |
| --- | --- |

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Layout pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## IX. Content Outline

### Part 1: 结论与机会

#### Slide 01 - 封面

- **Audience move**: 从无背景进入汇报主题 → 明确这是一份“90天机会验证与POC推进”的入职工作计划
- **Layout**: 左对齐大标题，右侧细线留白；深色标题与红色结论线构成视觉锚点
- **Title**: 东风集团 90天客户机会验证与POC推进计划
- **Core message**: 用90天验证东风出口座舱机会，并推进到可商务化结果
- **Content**:
  - 主标题：东风集团 90天客户机会验证与POC推进计划
  - 副题：入职90天工作计划 · 销售总监汇报版
  - 定位：先验证再承诺，先价值再交易
  - 日期：2026-08-03
  - 版本：商务版 V1.0

#### Slide 02 - 管理摘要

- **Audience move**: 从“逐页看任务” → 先理解计划的核心结论和所需决策
- **Layout**: 左侧结论区，右侧三张决策卡；重点数字和红线保持大字号
- **Title**: 用90天验证东风出口座舱机会，目标锁定一个可商务化的POC结果
- **Core message**: 90天不是销售动作清单，而是一个有里程碑、有退出机制、有明确产出的机会验证过程
- **Content**:
  - 主线：东风出口座舱智能化机会，目标形成付费POC、联合预研或正式供应商评估任一结果
  - 备线：国内车型AI Link体验增强，主线受阻时自动激活
  - 华为定位：仅作为合作伙伴，第1周确认边界；不假设其引荐或商务杠杆可用
  - 节奏：第7天 / 第30天 / 第60天 / 第90天四个检查点
  - 本次汇报决策点：确认目标项目优先级、产品与合规支持资源、每周复盘机制

#### Slide 03 - 机会判断

- **Audience move**: 从“为什么值得投入” → 认同东风出口是当前最值得优先验证的客户机会
- **Layout**: 顶部一句结论，中部三个数据锚点，底部一句前提说明
- **Title**: 东风出口是当前最值得优先验证的客户机会
- **Core message**: 出口规模、欧洲量产节点和座舱合规复杂度共同构成可验证的需求窗口
- **Content**:
  - 2026年东风出口目标60万辆
  - 2026年Q1出口9.6万辆，同比+75.6%
  - 岚图欧洲量产与Stellantis合资进入实操阶段
  - 前提：仍需验证产品与华为HMS的真实集成深度，以及东风出口车型的座舱决策链和采购窗口

#### Slide 04 - 三个关键验证问题

- **Audience move**: 从“机会很真实” → 理解真正决定成败的是三个前提，而不是销售动作数量
- **Layout**: 三列卡片，每列一个问题、一个判断、一个验证动作；顶部结论红线贯穿
- **Title**: 先验证三个前提，再决定是否投入POC
- **Core message**: 需求、产品匹配和商务路径三者都成立时，才把资源推向POC
- **Content**:
  - 需求是否真实：东风出口车型是否面对海外合规、生态本地化和软件升级合规痛点
  - 产品是否匹配：艾博连全球化座舱方案与华为HMS的集成深度是否支撑对外演示
  - 路径是否可走通：东风供应商准入、决策链、目标车型SOP窗口是否可进入
  - 验证产出：需求假设、产品证据矩阵、目标车型资格评分

### Part 2: 90天执行路径

#### Slide 05 - 90天四阶段总览

- **Audience move**: 从“三个验证问题” → 看到90天如何分阶段落地和推进
- **Layout**: 横向四阶段时间轴，每阶段包含时间、任务主题、关键产出；下方用里程碑条收口
- **Title**: 90天分四阶段：内部验证 → 客户发现 → 技术适配 → 商务立项
- **Core message**: 四阶段按“先内部、再客户、后商务”的顺序推进，每阶段有明确出口
- **Content**:
  - 第1阶段 内部验证，第1周：确认华为合作边界、产品能力自评、确定目标项目
  - 第2阶段 客户发现，第2-4周：完成有效客户沟通、梳理决策链、筛选目标项目
  - 第3阶段 技术适配，第5-8周：合规预审、POC定义、三方职责确认
  - 第4阶段 商务立项，第9-12周：供应商准入、商务提案、下一阶段锁定
  - 底线结果：付费POC / 联合预研或技术合作协议 / 进入正式供应商评估

#### Slide 06 - 第1阶段：内部验证

- **Audience move**: 从“马上拜访客户” → 先确认能展示什么、能承诺什么、走哪条路径
- **Layout**: 三列任务卡片，每列给出任务、动作和产出；底部标注第1周出口标准
- **Title**: 第1周先验证证据，不先承诺客户
- **Core message**: 华为边界、产品成熟度和目标项目三者确认后，才进入客户沟通
- **Content**:
  - 确认华为合作边界：是否允许公开合作、接口边界、报价模式、合同主体；产出《华为×艾博连合作边界确认表》
  - 产品能力自评：完成全球化Demo和产品成熟度评审；建立《出口座舱能力与证据矩阵》；分级标注已量产、预研中、规划中
  - 确定目标项目：至少确定一个目标车型，收集座舱方案、SOP窗口和当前项目阶段；产出《目标车型/项目假设表》
  - 出口标准：能回答“我们能展示什么、能承诺什么、优先走哪条路径”

#### Slide 07 - 第2阶段：客户发现

- **Audience move**: 从“内部准备完成” → 知道第2-4周如何获得真实客户信号
- **Layout**: 三列任务卡片，任务、动作、产出清晰对应；底部标注第30天出口标准
- **Title**: 第2-4周完成有效客户沟通，并锁定目标车型
- **Core message**: 客户发现不是泛泛拜访，而是验证痛点、决策链和项目资格
- **Content**:
  - 有效客户沟通：完成至少2次有效沟通，找到业务和技术联系人，识别至少3个真实痛点，获得第二次技术交流机会；产出《客户需求访谈纪要》
  - 决策链梳理：绘制东风智能座舱采购决策链，识别关键决策人、技术评估人、关注点和现有供应商关系；产出《东风账户地图》
  - 项目筛选：梳理东风出口车型矩阵，评估需求匹配度、预算、时间窗口，确认主线和备线；产出《目标项目资格评分表》

#### Slide 08 - 第3阶段：技术适配

- **Audience move**: 从“已经找到客户入口” → 看到如何把机会转成可执行POC
- **Layout**: 左列合规预审，中列POC定义，右列三方职责；底部输出物条
- **Title**: 第5-8周完成合规预审和POC定义
- **Core message**: 技术适配以“合规可表述、POC可验收、职责可确认”为完成标准
- **Content**:
  - 合规预审：GDPR需区分数据处理者与控制者责任；PDPA按目标国家确认数据本地化要求；UN R156需确认SUMS、软件更新证书和相关规程；不采用简化承诺
  - POC定义：确认功能、场景、车型；确认艾博连、华为和东风资源；确认分阶段交付节点和可量化验收指标；产出《POC任务书》
  - 三方职责：华为在已确认接口范围内提供海外车载生态与底层服务；艾博连负责跨品牌场景编排、HMI适配、Agent协同和运营管理；东风负责车型需求定义、实车验证和商务采购
  - 注意：华为角色以第1周确认的边界为准，不作为默认承诺

#### Slide 09 - 第4阶段：商务立项

- **Audience move**: 从“技术验证完成” → 清楚第9-12周必须推动什么商务结果
- **Layout**: 三列任务卡片，每列明确任务与关键动作；底部显示三类可接受结果
- **Title**: 第9-12周推动至少一项可量化的商务结果
- **Core message**: 商务立项以具体结果收口，不以“持续跟进”作为结案
- **Content**:
  - 供应商准入：确认东风供应商准入流程和资质要求，准备公司资质、案例、方案报价，寻找内部推动人；产出《采购流程图和机会卡》
  - 商务提案：基于POC结果形成正式提案，明确按项目、按车型或按功能模块报价，准备TCO对比和“不上方案的代价”
  - 下一阶段锁定：争取付费POC、联合预研或技术合作协议、正式供应商评估流程任一结果；若未达成，记录原因、阻塞项和下次触达日期

### Part 3: 管理闭环与决策

#### Slide 10 - 90天里程碑检查点

- **Audience move**: 从“四阶段任务” → 用四个量化检查点评估进度是否真实推进
- **Layout**: 四列里程碑卡，每列日期、完成标准、关键产出；顶部为整体结论
- **Title**: 第7、30、60、90天用量化标准检查进度
- **Core message**: 每个检查点都有可验证的完成标准，避免模糊的pipeline管理
- **Content**:
  - 第7天：华为合作边界和对外话术确认，华为侧对接人及东风引荐路径确认，全球化Demo和产品成熟度评审完成，至少确定一个目标项目或车型
  - 第30天：完成至少2次有效客户沟通，找到业务和技术联系人，识别目标市场、车型、项目阶段和SOP窗口，识别至少3个真实客户痛点，获得第二次技术交流或POC讨论机会
  - 第60天：形成需求说明、接口清单、数据合规风险清单，明确三方职责，完成POC定义，启动供应商准入和商务流程确认
  - 第90天：争取付费POC、联合预研或技术合作协议、进入正式供应商评估流程任一结果；未达成则记录原因、阻塞项和下次触达日期

#### Slide 11 - 关键风险与对策

- **Audience move**: 从“计划看起来很顺” → 清楚主要风险都有提前识别和应对
- **Layout**: 风险矩阵表或四张风险卡，概率、影响、对策同页呈现；底部保留诚实边界原则
- **Title**: 主要风险提前识别，核心对策是“先验证再承诺”
- **Core message**: 最大的风险不是销售动作不够，而是证据、集成深度和商务路径未验证
- **Content**:
  - 华为合作无实际商务作用：概率中、影响高；对策是第1周确认边界，不依赖引荐，按独立渠道推进东风
  - 联合方案集成度不够：概率中、影响高；对策是第1周验证，如不够则话术降级为方案已谈妥、集成进行中
  - 产品成熟度不足以支撑POC：概率中、影响中；对策是诚实告知联合预研中，缩小POC范围
  - 合规能力证据不足：概率高、影响高；对策是第1-4周优先收集证据，必要时引入第三方合规咨询
  - 东风出口节奏或预算调整：概率中、影响高；对策是跟踪东风出口战略和预算周期，备线随时激活

#### Slide 12 - 下一步与需要的支持

- **Audience move**: 从“计划完整” → 明确给出总监需要拍板的三个决策和本周启动动作
- **Layout**: 左侧三项决策点，右侧第一周行动清单；底部以“本周启动”收口
- **Title**: 请确认三条边界，我按周启动执行
- **Core message**: 计划已具备可执行颗粒度，现在需要总监确认优先级、资源和复盘机制
- **Content**:
  - 决策1：确认目标项目优先级，以出口需求最明确的车型优先
  - 决策2：确认资源支持，包括产品Demo、合规咨询和技术对接
  - 决策3：确认每周复盘机制，以及第7、30、60、90天检查点
  - 第一周行动：完成华为合作边界确认、产品成熟度评审、目标项目初选、东风出口车型矩阵梳理
  - 收口：先验证再承诺，先价值再交易

## X. Speaker Notes Requirements

- **Generation**: enabled
- **Filename**: match each SVG filename under `notes/`
- **Content**: 每页以结论开头，再展开关键事实、阶段动作和决策点；不增加源材料未支持的外部承诺
- **Total duration**: 4-6分钟
- **Notes style**: formal
- **Presentation purpose**: report and align
