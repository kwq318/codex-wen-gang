#!/usr/bin/env python3
"""将公司公开研究资料整理为统一的销售研究结构。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


FIELDS = (
    "company",
    "domain",
    "industry",
    "size",
    "headquarters",
    "founded",
    "stage",
    "products",
    "recent_developments",
    "technology",
    "signals",
    "sources",
    "research_date",
)


def load_data(path: str) -> dict[str, Any]:
    if path == "-":
        raw = sys.stdin.read()
    else:
        raw = Path(path).read_text(encoding="utf-8")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("输入必须是 JSON 对象")
    return value


def normalize(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, dict):
        return {str(key): normalize(item) for key, item in value.items()}
    return value


def enrich(data: dict[str, Any]) -> dict[str, Any]:
    output = {field: normalize(data.get(field)) for field in FIELDS}
    output["company"] = output["company"] or "未提供"
    output["sources"] = output["sources"] or []
    output["signals"] = output["signals"] or []
    output["metadata"] = {
        "schema_version": "1.0",
        "missing_fields": [field for field in FIELDS if output[field] in (None, "", [])],
        "note": "本脚本只整理输入，不抓取网页、不绕过访问限制，也不推断缺失信息。",
    }
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="整理公司销售研究资料")
    parser.add_argument("input", help="输入 JSON 文件路径；使用 - 表示从标准输入读取")
    parser.add_argument("-o", "--output", help="输出 JSON 文件路径；默认写入标准输出")
    args = parser.parse_args()

    try:
        result = enrich(load_data(args.input))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
