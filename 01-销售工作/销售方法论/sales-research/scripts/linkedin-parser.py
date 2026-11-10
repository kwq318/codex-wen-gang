#!/usr/bin/env python3
"""把用户提供的职业资料解析为联系人研究字段；不抓取或绕过平台限制。"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


LABELS = {
    "姓名": "name",
    "当前职位": "current_role",
    "公司": "company",
    "任职时间": "tenure",
    "所在地": "location",
    "经历": "experience",
    "教育": "education",
    "公开内容": "public_content",
    "来源": "sources",
}


def parse_lines(text: str) -> dict[str, Any]:
    result: dict[str, Any] = {key: None for key in LABELS.values()}
    result["experience"] = []
    result["education"] = []
    result["public_content"] = []
    result["sources"] = []
    unmatched = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        match = re.match(r"^([^：:]+)[：:](.+)$", line)
        if not match:
            unmatched.append(line)
            continue
        label, value = match.group(1).strip(), match.group(2).strip()
        key = LABELS.get(label)
        if not key:
            unmatched.append(line)
            continue
        if key in {"experience", "education", "public_content", "sources"}:
            result[key].append(value)
        else:
            result[key] = value

    result["unmatched_lines"] = unmatched
    result["metadata"] = {
        "schema_version": "1.0",
        "note": "解析结果仅来自输入文本；请人工核验身份、日期和同名匹配。",
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="解析用户提供的联系人职业资料")
    parser.add_argument("input", help="输入文本或 JSON 文件路径；使用 - 表示从标准输入读取")
    parser.add_argument("-o", "--output", help="输出 JSON 文件路径；默认写入标准输出")
    args = parser.parse_args()

    try:
        text = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8")
        result = parse_lines(text)
    except OSError as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
