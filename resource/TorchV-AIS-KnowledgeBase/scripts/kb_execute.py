#!/usr/bin/env python3
"""Execute KB commands through the remote HTTP execute service."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def parse_header(raw_header: str) -> tuple[str, str]:
    if "=" in raw_header:
        key, value = raw_header.split("=", 1)
    elif ":" in raw_header:
        key, value = raw_header.split(":", 1)
    else:
        raise ValueError(f"invalid header format: {raw_header!r}")

    key = key.strip()
    value = value.strip()
    if not key:
        raise ValueError(f"header key is empty: {raw_header!r}")
    return key, value


def print_response(body: bytes) -> None:
    text = body.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        print(text)
        return

    print(json.dumps(parsed, ensure_ascii=False, indent=2))


def build_auth_headers(token: str) -> dict[str, str]:
    normalized = token.strip()
    if normalized.startswith("tk"):
        return {"Authorization": f"Bearer {normalized}"}
    if normalized.startswith("Bearer"):
        return {"Authorization": f"{normalized}"}
    return {"token": normalized}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send a KB command string to the remote execute endpoint.",
    )
    parser.add_argument(
        "command",
        nargs="?",
        help='KB command string, for example: "kb cat --code 2031630406710923264"',
    )
    parser.add_argument(
        "--command",
        dest="command_flag",
        help='KB command string, for example: "kb ls"',
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("KB_EXECUTE_URL"),
        help="KB execute endpoint. Defaults to env KB_EXECUTE_URL.",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("KB_TOKEN"),
        help="KB token header value. Defaults to env KB_TOKEN.",
    )
    parser.add_argument(
        "--header",
        action="append",
        default=[],
        help="Additional request header in key=value or key:value format.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Request timeout in seconds. Default: 30.",
    )
    args = parser.parse_args()

    command = args.command_flag or args.command
    if args.command_flag and args.command:
        parser.error("provide the KB command either as a positional argument or via --command")
    if not command:
        parser.error("missing KB command string")
    if not args.url:
        parser.error("missing KB execute URL; pass --url or set KB_EXECUTE_URL")
    if not args.token:
        parser.error("missing KB token; pass --token or set KB_TOKEN")

    headers = {"Content-Type": "application/json", **build_auth_headers(args.token)}
    try:
        for raw_header in args.header:
            key, value = parse_header(raw_header)
            headers[key] = value
    except ValueError as exc:
        parser.error(str(exc))

    payload = json.dumps({"command": command}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url=args.url,
        data=payload,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            print_response(response.read())
            return 0
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}", file=sys.stderr)
        print_response(exc.read())
        return 1
    except urllib.error.URLError as exc:
        print(f"request failed: {exc.reason}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
