#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { startStreamableHttpServer } from "./http.js";
import { createKbServer } from "./server.js";

function printHelp(): void {
  const help = [
    "kb-mcp",
    "",
    "MCP server for TorchV AIS Knowledge Base.",
    "",
    "Usage:",
    "  kb-mcp [--transport stdio|streamable-http] [--host 127.0.0.1] [--port 3000] [--path /mcp]",
    "",
    "Required environment variables:",
    "  KB_EXECUTE_URL   Remote KB execute endpoint",
    "  KB_TOKEN         KB token header value",
    "",
    "Optional environment variables:",
    "  KB_MODE=readonly|write|admin",
    "  KB_TIMEOUT_SECONDS=30",
    "  KB_DEFAULT_REPO_CODE=TEAM_DOCS",
    "  KB_EXTRA_HEADERS_JSON={\"x-foo\":\"bar\"}",
    "",
    "Transport options:",
    "  --transport stdio|streamable-http   Default: stdio",
    "  --host 127.0.0.1                    HTTP mode only",
    "  --port 3000                         HTTP mode only",
    "  --path /mcp                         HTTP mode only",
    "",
    "Token guidance:",
    "  Recommended: AIS -> 管理中心 -> 开放密钥 -> 创建密钥",
    "  Temporary fallback: copy the token header from an authenticated AIS web request",
  ].join("\n");
  console.error(help);
}

interface CliOptions {
  transport: "stdio" | "streamable-http";
  host: string;
  port: number;
  path: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    transport: "stdio",
    host: "127.0.0.1",
    port: 3000,
    path: "/mcp",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    const next = argv[index + 1];
    if (arg === "--transport") {
      if (next !== "stdio" && next !== "streamable-http") {
        throw new Error("Invalid --transport value. Expected stdio or streamable-http.");
      }
      options.transport = next;
      index += 1;
      continue;
    }
    if (arg === "--host") {
      if (!next) {
        throw new Error("Missing value for --host.");
      }
      options.host = next;
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const port = Number(next);
      if (!next || !Number.isInteger(port) || port <= 0) {
        throw new Error("Invalid --port value. Expected a positive integer.");
      }
      options.port = port;
      index += 1;
      continue;
    }
    if (arg === "--path") {
      if (!next) {
        throw new Error("Missing value for --path.");
      }
      options.path = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const cliOptions = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  if (cliOptions.transport === "streamable-http") {
    await startStreamableHttpServer(config, {
      host: cliOptions.host,
      port: cliOptions.port,
      path: cliOptions.path,
    });
    return;
  }

  const server = createKbServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
