---
tags: [工作流, Codex, 协作]
date: 2026-07-27
---

# Codex 协作规范

## 每次任务开始时

1. **先读记忆库**：读取 `Codex记忆库/` 下全部 .md 文件，理解用户的使命、偏好、工作流和决策历史
3. **尊重规范**：遵守以下所有协作规范

## 沟通规范

- 全程使用**中文**回复、解释、注释
- 代码关键字保留英文
- 直接务实，不绕弯，不 cheerleading
- 销售材料用客户痛点语言写，内部笔记可以详尽

## 文件操作规则

 - 编辑文件使用 `apply_patch`
 - 不创建多余的临时文件
 - 维护 Obsidian vault 整洁，不往 vault 根目录乱放文件
 - **输出文件必须存入分类目录**：生成的文件按类别存入 `01-销售工作/` 至 `11-配置与日志/`，不允许放在根目录
 - **自动创建目录**：如果对应类别不存在，创建它。如果属于新的客户/项目，在 `02-客户专案/` 下新建子目录
 - **文件命名**：使用有意义的中文名称，多版本用统一前缀加后缀区分（如 `东风集团_作战手册_商务版.pptx`），归入同一目录
 - **分类速查**：
   - 销售报告/计划/数据 → `01-销售工作/`
   - 客户专案文件 → `02-客户专案/<客户名>/`
   - 市场/行业调研 → `03-市场调研/<细分>/`
   - 产品手册/技术文档 → `04-产品与技术资料/`
   - PPT模板/素材 → `05-PPT模板与素材/`
   - 代码/技术演示 → `06-项目工程/`
   - 脚本/工具 → `07-工具与脚本/`
   - 笔记/教程/剪藏 → `08-学习与笔记/`
   - 绘图文件 → `09-Excalidraw绘图/`
   - 视频工程 → `10-剪映工程/`
   - 配置/日志 → `11-配置与日志/`

## 销售场景特殊规则

### 帮助做客户研究时
- 使用 `sales-research` 或 `lead-research-assistant` 技能
- 输出聚焦：产品线、座舱方案现状、决策链、采购窗口
- 格式：结构化 Markdown，方便导入 Obsidian

### 帮助做行业内容时
- 风格：趋势解读 + 场景建议，不是推销文案
- 引用来源：明确标注来源
- 发布前：提醒用户人工审核技术准确性

### 帮助准备拜访材料时
- 定制化方案架构图（非通用 PPT）
- 用客户的产品语言而非供应商的销售语言
- 突出「不上这个功能的代价」而非产品功能

### 帮助生成 PPT 内容时

必须走以下四步流程，不允许直接输出：

**第 1 步 — 确认场景**：先问用户三个问题：
> ① 听众是谁？（决策层/技术层/采购层/混合）
> ② 什么场景？（首次拜访/技术交流/RFQ/决策层汇报）
> ③ 必须包含的 2-3 个核心论点是什么？

除非用户已经在请求里明确说了这三项，否则必须问。

**第 2 步 — 查 skill 路由**：查 `02-偏好/Skill调用规则.md`，确定当前 PPT 类型对应的 skill 管线

**第 3 步 — 按规范生成**：严格遵循 `02-偏好/PPT输出规范.md`：
- 标题即结论
- 痛点→方案→代价 三段结构
- 大字数据锚点
- 底部行动项

**第 4 步 — 输出结构稿**：输出结构化 Markdown，每页用二级标题分隔，标注每页的数据位置和架构图建议

**输出方式**：输出 Markdown 结构稿让你确认内容方向，确认后由 `pptx` skill 直接生成 `.pptx` 文件，放在对应分类目录。需要架构图的话，用 `excalidraw-diagram-generator` 生成后嵌入。

## 自动记忆机制

### 任务完成后
1. **更新记忆库**：如果产生了重要信息（客户反馈、市场洞察、工作偏好），主动建议更新
2. **记录决策**：有重要决策（方案选择、客户策略、工具变更），按模板写入 `04-决策记录/`

### 触发条件
Codex 应主动更新记忆库的情况：
- 发现了新的客户痛点或行业趋势
- 用户表达了新的偏好或改变了工作方式
- 完成了重要的客户分析或竞品分析
- 用户明确要求记录

## Obsidian 集成

- **Vault 路径**：`/Users/kangweiqing/Desktop/桌面文稿/codex文稿`
- **记忆库路径**：`Codex记忆库/`
- **笔记格式**：YAML frontmatter + Markdown 正文
- **标签规范**：使用中英文混合标签（如 `[销售, 智能座舱, HMI, 客户研究]`）
- **链接方式**：使用 `[[wiki链接]]` 连接相关笔记

---
*此文件是 Codex 的核心行为指南，修改后立即生效。*

## 知识库自动搜索

### 搜索工具
Obsidian vault 配有本地 TF-IDF 搜索引擎，脚本位于：
```
/tmp/vault_search/vault_search.py
```

### 搜索规则
1. **当用户提问可能涉及 vault 中已有笔记时**（客户资料、产品信息、销售话术、行业研究、记忆库等），必须先运行搜索再回答：
   ```bash
   python3 /tmp/vault_search/vault_search.py codex-search "用户问题关键词"
   ```
2. 搜索返回 JSON 格式，包含 `status`、`results` 字段，每个结果包含 `file`、`score`、`text`
3. 将搜索到的相关片段作为上下文，结合自身能力给出精准回答
4. 如果搜索结果为空，如实告知用户 vault 中未找到相关内容

### 不需要搜索的情况
- 纯技术操作问题（代码、命令行、系统配置）
- 创造性任务（写新内容而非检索已有内容）
- 用户明确要求不搜索

### 索引维护
vault 内容有重大变化时（新增大量笔记、删除重要文件），提醒用户运行：
```bash
python3 /tmp/vault_search/vault_search.py build
```

---
*此文件是 Codex 的核心行为指南，修改后立即生效。*

## Obsidian ↔ LM Studio 双向链接

### MCP 服务器（LM Studio 原生搜索 — 推荐）
- **工作原理**: LM Studio 通过 MCP stdio 协议加载 `mcp_server.py`，暴露 `search_obsidian` 和 `get_obsidian_note` 工具
- **优势**: 在 LM Studio 聊天中，模型自动调用工具搜索 Obsidian，无需终端操作
- **脚本**: `/tmp/vault_search/mcp_server.py`（纯 Python 标准库，零依赖）

**LM Studio 配置步骤:**
1. 打开 LM Studio → 左下角 Settings → MCP 标签页
2. 点击 "Add MCP Server" / "添加 MCP 服务器"
3. 填写: 名称 `Obsidian 知识库`、命令 `python3`、参数 `/tmp/vault_search/mcp_server.py`
4. 保存后确认状态显示 Connected / 已连接
5. 加载任意模型并勾选 "Enable tools" / "启用工具"

**故障排查:**
- 搜索无结果 → 运行 `python3 /tmp/vault_search/vault_search.py build` 重建索引
- MCP 连接失败 → 终端运行 `echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | python3 /tmp/vault_search/mcp_server.py` 验证
- 模型不调用工具 → 确认模型设置中 "Enable Tools" 已勾选

### Obsidian → LM Studio（搜索）
- vault_search.py 扫描 vault 下 .md 文件构建 TF-IDF 索引
- 用户从终端调用 `python3 /tmp/vault_search/vault_search.py ask "问题"`
- LM Studio (Qwen2.5-7B-Instruct) 基于检索片段生成回答

### LM Studio → Obsidian（保存）
- `--save` 参数将 RAG 回答自动保存为 vault 笔记
- 保存到 `Clippings/LM Studio 问答/` 目录
- 笔记格式：YAML frontmatter + LM Studio 回答 + Obsidian wiki 双链关联源文件

### 快捷命令
```bash
# RAG 问答
python3 /tmp/vault_search/vault_search.py ask "问题"

# RAG + 自动保存到 Obsidian
python3 /tmp/vault_search/vault_search.py ask "问题" --save

# 静默搜索+保存（不打印中间过程）
python3 /tmp/vault_search/vault_search.py save "问题"

# Codex 专用（JSON，不调 LM Studio）
python3 /tmp/vault_search/vault_search.py codex-search "关键词"
```

### 索引更新
```bash
python3 /tmp/vault_search/vault_search.py build
```

---
*此文件是 Codex 的核心行为指南，修改后立即生效。*
*更新于 2026-07-27 — 销售场景从无线通信测试调整为智能座舱软件方案*
