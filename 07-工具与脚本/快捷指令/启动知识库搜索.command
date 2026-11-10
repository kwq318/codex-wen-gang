#!/bin/zsh
# 双击此文件即可启动 Obsidian 知识库搜索网页
cd "$(dirname "$0")"
echo "正在启动知识库搜索..."
python3 /tmp/vault_search/web_server.py
