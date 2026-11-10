---
tags: [决策记录, Codex, 工具, DeepSeek, 视觉增强]
date: 2026-08-10
---

# 2026-08-10 ds-vision-skill-plus 安装与 macOS 适配

## 背景

- 需要给 DeepSeek 等纯文本模型补上图片理解与生图能力。
- 用户机器是 macOS（Apple M1 Pro），原仓库只做过 Windows 测试。

## 决策

- 技能安装到 `~/.codex/skills/ds-vision-skill-plus`，Codex 新任务自动加载。
- 保留原 PowerShell 脚本，同时新增 Python 版核心脚本，并让 `SKILL.md` 路由优先走 Python。
- macOS 配置写入 `~/.ds-vision/config.json`（权限 0600），环境变量仍可覆盖。
- 离线 OCR 使用 macOS Vision，并预编译了 `macos_ocr` 可执行文件。

## 已验证

- 识图、生图、配置保存/移除、缓存、预检脚本均通过本地模拟服务验证。
- 已启用 Pollinations 免费生图通道（`image.pollinations.ai/prompt`，model=flux），并用真实图片请求验证成功。
- 没有 API Key 时会给出明确提示，不会误报成功。
- 本机 Swift 工具链可用；沙箱内直接编译 Swift 受限，因此使用预编译版本。

## 待办

- Pollinations 匿名识图目前只开放纯文本模型，图片理解需要付费额度，因此改用本地 LM Studio 下载 Qwen2.5-VL-7B。
- Qwen2.5-VL-7B 主模型与视觉投影文件正在后台下载，LM Studio 本地服务已启动（127.0.0.1:1234）。
- 下载完成后：运行 `lms load qwen2.5-vl-7b-instruct`，再执行 `setup.py -Verify -Channel local` 验证本地识图。
- 可选：安装 Ollama 或 `mineru-open-api`，补齐本地视觉备选与长文档解析。
