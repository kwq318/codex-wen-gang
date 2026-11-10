#!/bin/bash
# 一键打开 Obsidian 并加载 codex文稿 vault
cd "$(dirname "$0")/.."
open -a Obsidian "$(pwd)"
echo "Obsidian 记忆库已打开"
echo "路径: $(pwd)"
