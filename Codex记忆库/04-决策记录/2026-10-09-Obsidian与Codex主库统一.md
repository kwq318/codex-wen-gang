---
tags: [决策, Obsidian, Codex, 工作流]
date: 2026-10-09
status: 已决定
---

# Obsidian 与 Codex 主库统一

## 背景

Obsidian 当前打开的主知识库位于 `/Users/kangweiqing/Desktop/桌面文稿/codex文稿`，但 Codex 的 `AGENTS.md`、协作规范及若干快捷工具仍引用旧路径 `/Users/kangweiqing/Desktop/桌面/codex文稿`。Obsidian 的 Claudian 插件已启用 Codex 提供方，工作区本身就是当前知识库。

## 决策

以 `/Users/kangweiqing/Desktop/桌面文稿/codex文稿` 作为 Obsidian 与 Codex 共用的主库路径；不迁移或合并其他 Obsidian 库，不改变权限模式。

## 已执行

- 修正 `AGENTS.md` 中的 `obsidian_vault` 路径。
- 修正本协作规范中的 Vault 路径。
- 修正侧栏修复脚本及 Codex 技能/工具快捷方式中的过期路径。
- 修正 Obsidian 与 Codex 闭环说明中的示例路径。
- 确认 Claudian 已启用且 Codex 提供方已启用；其当前工作区为本 Vault，因此无需另设外部上下文路径。

## 后续注意

Obsidian 仍登记有其他 Vault（包括桌面目录）。本次不删除、不迁移这些登记；今后从 Obsidian 内启动 Codex 时，确认 Claudian 所在 Vault 为本主库。
