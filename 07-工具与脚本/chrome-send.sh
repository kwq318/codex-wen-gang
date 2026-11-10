#!/bin/zsh
# Codex → Chrome CDP 管道发送脚本
# 用法: ./chrome-send.sh open https://www.baidu.com
#       ./chrome-send.sh list
#       ./chrome-send.sh ping

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CMD_FILE="$SCRIPT_DIR/.chrome-cmd.json"
RESP_FILE="$SCRIPT_DIR/.chrome-resp.json"

ACTION="${1:-ping}"
URL="${2:-https://www.google.com}"

# 清理旧响应
rm -f "$RESP_FILE"

# 写入命令
cat > "$CMD_FILE" <<EOFCMD
{"action": "$ACTION", "url": "$URL"}
EOFCMD

# 等待响应 (最多 10 秒)
for i in {1..20}; do
  if [ -f "$RESP_FILE" ]; then
    cat "$RESP_FILE"
    exit 0
  fi
  sleep 0.5
done

echo '{"error": "timeout: 守护进程未响应，请确认桌面终端已运行: python3 chrome-daemon.py"}'
exit 1
