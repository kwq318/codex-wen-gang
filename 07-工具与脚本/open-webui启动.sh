#!/bin/zsh
# Open WebUI 本地启动脚本：数据存 ~/.open-webui，模型后端默认接 LM Studio
set -e

export HF_ENDPOINT="https://hf-mirror.com"
export DATA_DIR="$HOME/.open-webui/data"
export OPENAI_API_BASE_URLS="https://api.deepseek.com/v1;https://millionengine.com/v1;http://127.0.0.1:1234/v1"

if [[ -f "$HOME/.open-webui/.env" ]]; then
  source "$HOME/.open-webui/.env"
fi

if [[ -f "$HOME/.open-webui/.webui_secret_key" ]]; then
  export WEBUI_SECRET_KEY="$(cat "$HOME/.open-webui/.webui_secret_key")"
fi

exec "$HOME/.local/bin/open-webui" serve --host 127.0.0.1 --port 8080
