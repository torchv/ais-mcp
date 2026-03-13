# `@torchv/kb-mcp`

MCP server for TorchV AIS Knowledge Base.

## Install / Run

```bash
npx -y @torchv/kb-mcp
```

## Startup Modes

STDIO mode for local MCP clients:

```bash
npm run build
node dist/cli.js
```

Equivalent npm scripts:

```bash
npm run dev
npm run start
```

Streamable HTTP mode for network clients:

```bash
npm run build
node dist/cli.js --transport streamable-http --host 127.0.0.1 --port 3000 --path /mcp
```

Equivalent npm scripts:

```bash
npm run dev:http
npm run start:http
```

For local inspection during development:

```bash
npm run build
npm run inspect
```

The bundled inspector script forces `stdio` transport so it connects to the local MCP process instead of a previously cached HTTP endpoint. For HTTP mode, start the server separately and then open:

```bash
npm run inspect:http
```

To verify the expanded tool surface locally:

```bash
KB_EXECUTE_URL=http://127.0.0.1:9 KB_TOKEN=test npm run inspect:cli
KB_EXECUTE_URL=http://127.0.0.1:9 KB_TOKEN=test npm run inspect:cli:write
KB_EXECUTE_URL=http://127.0.0.1:9 KB_TOKEN=test npm run inspect:cli:admin
```

## Required Environment Variables

```bash
export KB_EXECUTE_URL="https://aisdevserver.dev.torchv.com/kb/atomix/execute"
export KB_TOKEN="your-token"
```

If you do not have a token yet:

```text
Recommended: AIS -> 管理中心 -> 开放密钥 -> 创建密钥
Temporary fallback: copy the token header from an authenticated AIS web request
```

Optional:

```bash
export KB_MODE="readonly"   # readonly | write | admin
export KB_TIMEOUT_SECONDS="30"
export KB_DEFAULT_REPO_CODE="TEAM_DOCS"
export KB_EXTRA_HEADERS_JSON='{"x-foo":"bar"}'
```

HTTP mode also accepts CLI flags:

```bash
--transport streamable-http
--host 127.0.0.1
--port 3000
--path /mcp
```

## Claude / Codex MCP Config

STDIO transport:

```json
{
  "mcpServers": {
    "kb": {
      "command": "npx",
      "args": ["-y", "@torchv/kb-mcp"],
      "env": {
        "KB_EXECUTE_URL": "https://aisdevserver.dev.torchv.com/kb/atomix/execute",
        "KB_TOKEN": "your-token",
        "KB_MODE": "readonly"
      }
    }
  }
}
```

Streamable HTTP transport:

```json
{
  "mcpServers": {
    "kb-http": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

## Tool Surface

- `kb_list_repos`
- `kb_list_path`
- `kb_tree`
- `kb_search`
- `kb_read_document`
- `kb_render_link`
- `kb_write_document`
- `kb_patch_document`
- `kb_create_directory`
- `kb_publish_document`
- `kb_move_document`
- `kb_delete_document`

Write tools are only available when `KB_MODE=write` or `KB_MODE=admin`.
Destructive tools are only available when `KB_MODE=admin`.

Mode summary:

- `readonly`: `kb_list_repos`, `kb_list_path`, `kb_tree`, `kb_search`, `kb_read_document`, `kb_render_link`
- `write`: readonly tools plus `kb_write_document`, `kb_patch_document`, `kb_create_directory`, `kb_publish_document`
- `admin`: write tools plus `kb_move_document`, `kb_delete_document`

`kb_patch_document` takes the full patch body and sends it as:

```text
kb edit --patch
*** Begin Patch
...
*** End Patch
```

The target file is defined inside the patch header, matching the skill's `update.md`.
