import type { KbConfig } from "./config.js";

export class KbClient {
  constructor(private readonly config: KbConfig) {}

  async execute(command: string): Promise<unknown> {
    const response = await fetch(this.config.executeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: this.config.token,
        ...this.config.extraHeaders,
      },
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const rawBody = await response.text();
    const body = tryParseJson(rawBody);
    if (!response.ok) {
      const renderedBody = typeof body === "string" ? body : JSON.stringify(body, null, 2);
      throw new Error(`KB execute failed with HTTP ${response.status}: ${renderedBody}`);
    }

    return body;
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
