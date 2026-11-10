#!/bin/bash
cd "$(dirname "$0")"
echo "======================================"
echo "  Obsidian Vault CLI"
echo "======================================"
echo ""
echo "  1) list     列出所有笔记"
echo "  2) search   搜索笔记内容"
echo "  3) new      创建新笔记"
echo "  4) open     在 Obsidian 中打开笔记"
echo "  5) recent   显示最近修改的笔记"
echo "  6) todo     查找待办事项"
echo "  7) stats    Vault 统计信息"
echo "  8) today    打开/创建今日日记"
echo ""
read -p "请输入命令编号或直接输入命令: " choice
case "$choice" in
  1|list)   ./obs.sh list ;;
  2|search) read -p "搜索关键词: " kw; ./obs.sh search "$kw" ;;
  3|new)    read -p "笔记标题: " title; ./obs.sh new "$title" ;;
  4|open)   read -p "笔记名: " name; ./obs.sh open "$name" ;;
  5|recent) read -p "显示数量 (默认10): " n; ./obs.sh recent "${n:-10}" ;;
  6|todo)   ./obs.sh todo ;;
  7|stats)  ./obs.sh stats ;;
  8|today)  ./obs.sh today ;;
  *)       ./obs.sh "$choice" ;;
esac
echo ""
read -p "按回车键退出..."
