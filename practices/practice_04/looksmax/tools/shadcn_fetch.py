"""Забирает исходники shadcn/ui v4 через MCP-сервер shadcn и кладёт их в web/src/components/ui.

Тот же сервер (@jpisnice/shadcn-ui-mcp-server) подключён агенту в .mcp.json. Скрипт нужен, когда компоненты
надо получить без агента, и оставляет журнал вызовов tool get_component в docs/evidence/shadcn-mcp.json.

Запуск: .venv/bin/python tools/shadcn_fetch.py button card badge
"""
import argparse
import asyncio
import json
import os
import re
import shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERVER_COMMAND = "npx -y @jpisnice/shadcn-ui-mcp-server@3.0.0"
# Сервер отдаёт исходники с алиасами реестра shadcn; в проекте компоненты лежат в src/components/ui.
_REWRITES = [
    (r'from "cn"', 'from "@/lib/utils"'),
    (r"@/registry/new-york-v4/ui/", "@/components/ui/"),
    (r"@/registry/new-york-v4/lib/utils", "@/lib/utils"),
    (r"@/registry/new-york-v4/hooks/", "@/hooks/"),
]
# Клиент MCP запускает сервер с урезанным окружением: прокси, доверенный CA и токен надо пробросить.
_PASS_ENV = ("PATH", "HOME", "HTTPS_PROXY", "https_proxy", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "GITHUB_PERSONAL_ACCESS_TOKEN")


def rewrite_imports(source: str) -> str:
    for old, new in _REWRITES:
        source = re.sub(old, new, source)
    return source if source.endswith("\n") else source + "\n"


def imports_of(source: str) -> list[str]:
    return sorted(set(re.findall(r'from "([^"]+)"', source)))


async def fetch(names: list[str], dest: Path, command: str) -> dict:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    argv = shlex.split(command)
    params = StdioServerParameters(
        command=argv[0], args=argv[1:], env={k: os.environ[k] for k in _PASS_ENV if k in os.environ}
    )
    dest.mkdir(parents=True, exist_ok=True)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            info = await session.initialize()
            tools = await session.list_tools()
            calls = []
            for name in names:
                result = await session.call_tool("get_component", {"componentName": name})
                text = result.content[0].text if result.content else ""
                call = {"tool": "get_component", "args": {"componentName": name}, "isError": bool(result.isError), "chars": len(text)}
                if result.isError:
                    call["error"] = text[:200]
                else:
                    source = rewrite_imports(text)
                    (dest / f"{name}.tsx").write_text(source, encoding="utf-8")
                    call["imports"] = imports_of(source)
                calls.append(call)
                print(f"{name}: {'ОШИБКА ' + call['error'] if result.isError else str(len(text)) + ' символов'}")
    return {
        "server": f"{info.serverInfo.name} {info.serverInfo.version}",
        "tools": [t.name for t in tools.tools],
        "calls": calls,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("components", nargs="+", help="имена компонентов shadcn: button, card, tabs…")
    parser.add_argument("--dest", type=Path, default=ROOT / "web" / "src" / "components" / "ui")
    parser.add_argument("--log", type=Path, default=ROOT / "docs" / "evidence" / "shadcn-mcp.json")
    parser.add_argument("--server-command", default=SERVER_COMMAND)
    args = parser.parse_args()

    report = asyncio.run(fetch(args.components, args.dest, args.server_command))
    args.log.parent.mkdir(parents=True, exist_ok=True)
    args.log.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    failed = [c["args"]["componentName"] for c in report["calls"] if c["isError"]]
    if failed:
        raise SystemExit(f"не получилось: {', '.join(failed)}")


if __name__ == "__main__":
    main()
