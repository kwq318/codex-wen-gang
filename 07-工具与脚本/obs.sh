#!/bin/bash
# Obsidian Vault CLI — 命令行笔记管理工具
# 用法: ./obs.sh <命令> [参数]

VAULT_DIR="$HOME/Desktop/桌面文稿/codex文稿"
OBSIDIAN_APP="/Applications/Obsidian.app"

# 颜色定义
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

usage() {
  echo "Obsidian Vault CLI"
  echo ""
  echo "用法: obs <命令> [参数]"
  echo ""
  echo "命令:"
  echo "  list              列出所有笔记（默认按修改时间倒序）"
  echo "  search <关键词>   搜索笔记内容（支持多个关键词）"
  echo "  new <标题>        创建新笔记并打开"
  echo "  open <笔记名>     在 Obsidian 中打开指定笔记"
  echo "  recent [数量]     显示最近修改的笔记（默认10篇）"
  echo "  todo              查找所有待办事项 [- [ ]] "
  echo "  links <笔记名>    查找引用了指定笔记的其他笔记"
  echo "  stats             显示 vault 统计信息"
  echo "  today             打开或创建今天的日记"
}

list_notes() {
  echo -e "${BOLD}📒 所有笔记${RESET}"
  echo "──────────────────────────────────────"
  find "$VAULT_DIR" -maxdepth 1 -name "*.md" -not -name "未命名*" \
    -exec stat -f "%Sm %N" -t "%Y-%m-%d %H:%M" {} \; \
    | sort -r | while read date time filename; do
      echo -e "  ${CYAN}$date $time${RESET}  ${GREEN}$(basename "$filename" .md)${RESET}"
    done
  echo "──────────────────────────────────────"
  count=$(find "$VAULT_DIR" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
  echo "共 $count 篇笔记"
}

search_notes() {
  if [ $# -eq 0 ]; then
    echo "请提供搜索关键词"
    return 1
  fi
  echo -e "${BOLD}🔍 搜索: $*${RESET}"
  echo "──────────────────────────────────────"
  rg --no-heading --line-number --color=always \
    --max-columns=120 \
    "$@" "$VAULT_DIR"/*.md 2>/dev/null | while IFS= read -r line; do
      file=$(echo "$line" | cut -d: -f1)
      lineno=$(echo "$line" | cut -d: -f2)
      rest=$(echo "$line" | cut -d: -f3-)
      echo -e "  ${CYAN}$(basename "$file" .md):$lineno${RESET}"
      echo -e "    $rest"
      echo ""
    done
}

new_note() {
  if [ $# -eq 0 ]; then
    echo "请提供笔记标题"
    return 1
  fi
  title="$*"
  filename="$VAULT_DIR/${title}.md"
  if [ -f "$filename" ]; then
    echo "笔记已存在: $title"
    open "$filename"
  else
    echo "# $title" > "$filename"
    echo "" >> "$filename"
    echo "✅ 已创建: ${title}.md"
    open "$filename"
  fi
}

open_note() {
  if [ $# -eq 0 ]; then
    echo "请提供笔记名"
    return 1
  fi
  pattern="$*"
  # 精确匹配优先
  exact="$VAULT_DIR/${pattern}.md"
  if [ -f "$exact" ]; then
    open -a "$OBSIDIAN_APP" "$VAULT_DIR"
    return
  fi
  # 模糊匹配
  matches=$(find "$VAULT_DIR" -maxdepth 1 -name "*${pattern}*.md" | head -5)
  if [ -z "$matches" ]; then
    echo "未找到匹配的笔记: $pattern"
    return 1
  fi
  count=$(echo "$matches" | wc -l | tr -d ' ')
  if [ "$count" -eq 1 ]; then
    open -a "$OBSIDIAN_APP" "$VAULT_DIR"
  else
    echo "找到多个匹配:"
    echo "$matches" | while read f; do
      echo "  $(basename "$f" .md)"
    done
  fi
}

recent_notes() {
  limit=${1:-10}
  echo -e "${BOLD}🕐 最近 $limit 篇笔记${RESET}"
  echo "──────────────────────────────────────"
  find "$VAULT_DIR" -maxdepth 1 -name "*.md" -not -name "未命名*" \
    -exec stat -f "%Sm§%N" -t "%Y-%m-%d %H:%M" {} \; \
    | sort -r | head -n "$limit" | while IFS='§' read -r date filename; do
      size=$(wc -c < "$filename" | tr -d ' ')
      words=$(wc -m < "$filename" | tr -d ' ')
      echo -e "  ${CYAN}$date${RESET}  ${GREEN}$(basename "$filename" .md)${RESET}  (${words}字)"
    done
}

find_todos() {
  echo -e "${BOLD}✅ 待办事项${RESET}"
  echo "──────────────────────────────────────"
  rg --no-heading --line-number --color=always \
    '\- \[ \]' "$VAULT_DIR"/*.md 2>/dev/null | while IFS= read -r line; do
      file=$(echo "$line" | cut -d: -f1)
      lineno=$(echo "$line" | cut -d: -f2)
      rest=$(echo "$line" | cut -d: -f3-)
      echo -e "  ${CYAN}$(basename "$file" .md):$lineno${RESET} $rest"
    done
  echo ""
  done_count=$(rg -c '\- \[x\]' "$VAULT_DIR"/*.md 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
  todo_count=$(rg -c '\- \[ \]' "$VAULT_DIR"/*.md 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
  echo "已完成: ${done_count:-0} / 待处理: ${todo_count:-0}"
}

find_links() {
  if [ $# -eq 0 ]; then
    echo "请提供笔记名"
    return 1
  fi
  target="$*"
  echo -e "${BOLD}🔗 引用了「${target}」的笔记${RESET}"
  echo "──────────────────────────────────────"
  rg --no-heading --files-with-matches "\[\[${target}\]\]" "$VAULT_DIR"/*.md 2>/dev/null | while read f; do
    echo -e "  ${GREEN}$(basename "$f" .md)${RESET}"
  done
}

show_stats() {
  total=$(find "$VAULT_DIR" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
  total_words=$(cat "$VAULT_DIR"/*.md 2>/dev/null | wc -m | tr -d ' ')
  total_lines=$(cat "$VAULT_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
  tags_count=$(rg -o '#[\w\u4e00-\u9fff]+' "$VAULT_DIR"/*.md --no-filename 2>/dev/null | sort -u | wc -l | tr -d ' ')
  echo -e "${BOLD}📊 Vault 统计${RESET}"
  echo "──────────────────────────────────────"
  echo -e "  笔记数量: ${GREEN}$total${RESET} 篇"
  echo -e "  总字数　: ${GREEN}$total_words${RESET} 字"
  echo -e "  总行数　: ${GREEN}$total_lines${RESET} 行"
  echo -e "  标签数量: ${GREEN}$tags_count${RESET} 个"
  echo ""
  echo "最近活跃:"
  # 统计每月笔记数量
  for f in "$VAULT_DIR"/*.md; do
    [ -f "$f" ] || continue
    stat -f "%Sm" -t "%Y-%m" "$f"
  done | sort -r | uniq -c | head -6 | while read -r count month; do
    echo -e "  $month: ${GREEN}$count${RESET} 篇"
  done
}

today_note() {
  today=$(date +%Y-%m-%d)
  filename="$VAULT_DIR/${today}.md"
  if [ -f "$filename" ]; then
    echo "打开今天的日记: ${today}.md"
  else
    echo "# $today" > "$filename"
    echo "" >> "$filename"
    echo "✅ 已创建日记: ${today}.md"
  fi
  open -a "$OBSIDIAN_APP" "$VAULT_DIR"
}

# 主命令路由
case "${1:-}" in
  list|ls)     list_notes ;;
  search|s)    shift; search_notes "$@" ;;
  new|n)       shift; new_note "$@" ;;
  open|o)      shift; open_note "$@" ;;
  recent|r)    shift; recent_notes "$@" ;;
  todo|t)      find_todos ;;
  links|l)     shift; find_links "$@" ;;
  stats|st)    show_stats ;;
  today)       today_note ;;
  help|h|-h|--help)
               usage ;;
  *)           usage ;;
esac
