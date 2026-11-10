#!/usr/bin/env python3
"""
微信自动化脚本 — 打开微信并搜索指定联系人。
从本地终端运行，Codex 沙箱内无法操控 GUI。

依赖: pip install pyautogui
"""

import subprocess
import time
import pyautogui as gui


def open_wechat():
    """打开微信应用。"""
    subprocess.run(
        ["open", "-a", "WeChat"],
        check=True,
    )
    # 等窗口加载
    time.sleep(2)


def search_contact(keyword: str):
    """在微信搜索框中搜索联系人。"""
    # Cmd+F 聚焦到搜索框（微信快捷键）
    gui.hotkey("command", "f")
    time.sleep(0.3)

    # 清空已有内容
    gui.hotkey("command", "a")
    time.sleep(0.1)

    # 输入搜索关键词
    gui.write(keyword)
    time.sleep(0.5)

    # 按回车确认搜索
    gui.press("enter")


def main():
    keyword = "王"
    print(f"正在打开微信…")
    open_wechat()

    print(f"搜索联系人: {keyword}")
    search_contact(keyword)

    print("搜索结果已显示在微信窗口中。")


if __name__ == "__main__":
    main()
