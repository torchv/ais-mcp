export type KbMode = "readonly" | "write" | "admin";

export interface KbConfig {
  executeUrl: string;
  token: string;
  timeoutMs: number;
  extraHeaders: Record<string, string>;
  defaultRepoCode?: string;
  mode: KbMode;
}

const VALID_MODES = new Set<KbMode>(["readonly", "write", "admin"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const EXECUTE_PATH = "/kb/atomix/execute";

function parseMode(rawMode: string | undefined): KbMode {
  if (!rawMode) {
    return "readonly";
  }

  if (VALID_MODES.has(rawMode as KbMode)) {
    return rawMode as KbMode;
  }

  throw new Error(`Invalid KB_MODE ${JSON.stringify(rawMode)}. Expected readonly, write, or admin.`);
}

function parseTimeoutMs(rawSeconds: string | undefined): number {
  if (!rawSeconds) {
    return DEFAULT_TIMEOUT_MS;
  }

  const seconds = Number(rawSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Invalid KB_TIMEOUT_SECONDS ${JSON.stringify(rawSeconds)}. Expected a positive number.`);
  }

  return Math.round(seconds * 1000);
}

function parseExtraHeaders(rawHeaders: string | undefined): Record<string, string> {
  if (!rawHeaders) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawHeaders);
  } catch (error) {
    throw new Error(
      `Invalid KB_EXTRA_HEADERS_JSON. Expected a JSON object string. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid KB_EXTRA_HEADERS_JSON. Expected a JSON object.");
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error(`Invalid KB_EXTRA_HEADERS_JSON value for ${JSON.stringify(key)}. Header values must be strings.`);
    }
    headers[key] = value;
  }

  return headers;
}

function missingTokenGuidance(): string {
  return [
    "Missing KB_TOKEN.",
    "Recommended: in AIS, open 管理中心 -> 开放密钥 -> 创建密钥 and grant the KB execute capability, then export KB_TOKEN.",
    "Temporary fallback: in a logged-in AIS web session, inspect a KB request and copy the token header value.",
  ].join(" ");
}

function normalizeExecuteUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    throw new Error(
      `Invalid KB_EXECUTE_URL ${JSON.stringify(rawUrl)}. Expected a full URL such as "https://bot.torchv.com". ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (parsed.pathname === EXECUTE_PATH) {
    return parsed.toString();
  }

  if (parsed.pathname === "/" || parsed.pathname === "") {
    parsed.pathname = EXECUTE_PATH;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  }

  return parsed.toString();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): KbConfig {
  const rawExecuteUrl = env.KB_EXECUTE_URL?.trim();
  if (!rawExecuteUrl) {
    throw new Error("Missing KB_EXECUTE_URL. Set it in the MCP server environment.");
  }

  const token = env.KB_TOKEN?.trim();
  if (!token) {
    throw new Error(missingTokenGuidance());
  }

  return {
    executeUrl: normalizeExecuteUrl(rawExecuteUrl),
    token,
    timeoutMs: parseTimeoutMs(env.KB_TIMEOUT_SECONDS),
    extraHeaders: parseExtraHeaders(env.KB_EXTRA_HEADERS_JSON),
    defaultRepoCode: env.KB_DEFAULT_REPO_CODE?.trim() || undefined,
    mode: parseMode(env.KB_MODE?.trim()),
  };
}
