import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { KbConfig } from "./config.js";
import { createKbServer } from "./server.js";

export interface HttpOptions {
  host: string;
  port: number;
  path: string;
}

interface SessionContext {
  server: ReturnType<typeof createKbServer>;
  transport: StreamableHTTPServerTransport;
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getSessionId(req: IncomingMessage): string | undefined {
  const raw = req.headers["mcp-session-id"];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function readParsedBody(req: IncomingMessage): Promise<unknown> {
  if (req.method !== "POST") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (!chunks.length) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

export async function startStreamableHttpServer(config: KbConfig, options: HttpOptions): Promise<Server> {
  const sessions = new Map<string, SessionContext>();
  const routePath = normalizePath(options.path);

  const httpServer = createServer(async (req, res) => {
    if (!req.url) {
      writeJson(res, 400, { error: "Missing request URL." });
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host ?? `${options.host}:${options.port}`}`);
    if (requestUrl.pathname !== routePath) {
      writeJson(res, 404, { error: "Not found." });
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = await readParsedBody(req);
    } catch (error) {
      writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      return;
    }

    const sessionId = getSessionId(req);
    let transport = sessionId ? sessions.get(sessionId)?.transport : undefined;

    if (!transport) {
      if (req.method !== "POST" || !isInitializeRequest(parsedBody)) {
        writeJson(res, 400, {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      const server = createKbServer(config);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { server, transport: transport! });
          console.error(`MCP streamable-http session initialized: ${newSessionId}`);
        },
        onsessionclosed: (closedSessionId) => {
          sessions.delete(closedSessionId);
        },
      });
      transport.onclose = () => {
        const closedSessionId = transport?.sessionId;
        if (closedSessionId) {
          sessions.delete(closedSessionId);
        }
      };
      transport.onerror = (error) => {
        console.error(`Streamable HTTP transport error: ${error.message}`);
      };
      await server.connect(transport);
    }

    try {
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("Error handling streamable-http request:", error);
      if (!res.headersSent) {
        writeJson(res, 500, {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  console.error(`kb-mcp streamable-http listening at http://${options.host}:${options.port}${routePath}`);

  const shutdown = async () => {
    const closers = Array.from(sessions.values(), async ({ transport, server }) => {
      try {
        await transport.close();
      } catch {}
      try {
        await server.close();
      } catch {}
    });
    await Promise.allSettled(closers);
  };

  httpServer.on("close", () => {
    void shutdown();
  });

  return httpServer;
}
