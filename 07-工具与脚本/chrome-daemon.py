#!/usr/bin/env python3
"""Chrome CDP 管道守护进程 v3 - 支持 GET/PUT"""
import json, os, time, http.client
from urllib.parse import quote

BASE = os.path.dirname(os.path.abspath(__file__))
CMD_FILE = os.path.join(BASE, ".chrome-cmd.json")
RESP_FILE = os.path.join(BASE, ".chrome-resp.json")
HOST = "localhost"
PORT = 9222

def cdp(method, path, body=None):
    try:
        conn = http.client.HTTPConnection(HOST, PORT, timeout=5)
        headers = {"Content-Type": "application/json"} if body else {}
        data = json.dumps(body).encode() if body else None
        conn.request(method, f"/{path}", body=data, headers=headers)
        resp = conn.getresponse()
        raw = resp.read().decode("utf-8")
        conn.close()
        return json.loads(raw) if raw else {"empty": True}
    except Exception as e:
        return {"error": str(e)}

def handle(cmd):
    a = cmd.get("action", "")
    url = cmd.get("url", "about:blank")

    if a == "ping":
        write(cdp("GET", "json/version"))

    elif a == "list":
        r = cdp("GET", "json")
        pages = []
        if isinstance(r, list):
            for p in r:
                pages.append({"title": p.get("title",""), "url": p.get("url",""),
                              "wsUrl": p.get("webSocketDebuggerUrl","")})
        write({"ok": True, "pages": pages})

    elif a == "open":
        # 同时尝试 GET 和 PUT
        r = cdp("GET", f"json/new?{quote(url, safe='')}")
        if "error" in r:
            r = cdp("PUT", f"json/new?{quote(url, safe='')}")
        write({"ok": "error" not in r, "result": r})

    elif a == "navigate":
        # 找到现有页面，用 CDP 导航
        tabs = cdp("GET", "json")
        ws_url = None
        if isinstance(tabs, list):
            for t in tabs:
                if t.get("type") == "page":
                    ws_url = t.get("webSocketDebuggerUrl")
                    break
        if ws_url:
            write({"ok": True, "wsUrl": ws_url, "note": "使用 WebSocket 导航需 puppeteer/playwright，此处只返回 wsUrl"})
        else:
            # 开新标签
            r = cdp("PUT", f"json/new?{quote(url, safe='')}")
            write({"ok": "error" not in r, "result": r})

    elif a == "ws-cmd":
        # 通过 WebSocket 发送原始 CDP 命令
        ws_url = cmd.get("wsUrl", "")
        cdp_method = cmd.get("method", "")
        cdp_params = cmd.get("params", {})
        if ws_url and cdp_method:
            try:
                import socket
                # 简化版 ws 客户端 (仅发送单条命令)
                # 这太复杂，改用 HTTP fallback
                write({"ok": False, "error": "WebSocket 暂未实现，请用 open/navigate"})
            except Exception as e:
                write({"ok": False, "error": str(e)})
        else:
            write({"ok": False, "error": "缺少 wsUrl 或 method"})

    else:
        write({"ok": False, "error": f"未知: {a}"})

def write(data):
    with open(RESP_FILE, "w") as f:
        json.dump(data, f, ensure_ascii=False)

def read_cmd():
    if not os.path.exists(CMD_FILE):
        return None
    with open(CMD_FILE, "r") as f:
        raw = f.read().strip()
    return json.loads(raw) if raw else None

print("🔌 Chrome CDP 守护 v3 | 命令文件管道模式", flush=True)
print(f"   CDP: {HOST}:{PORT} | CMD: {CMD_FILE}", flush=True)

last = None
while True:
    cmd = read_cmd()
    if cmd and cmd != last:
        print(f"📨 {cmd.get('action')} {cmd.get('url','')}", flush=True)
        handle(cmd)
        last = cmd
        with open(CMD_FILE, "w") as f:
            f.write("")
    time.sleep(0.3)
