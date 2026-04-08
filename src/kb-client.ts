import { openAsBlob } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import type { KbConfig } from "./config.js";

export interface UploadFileInput {
  localPath: string;
  pathName: string;
  fileName?: string;
}

export interface DownloadFileInput {
  code: string;
  localPath: string;
  extractIs?: boolean;
  overwrite?: boolean;
}

export interface DownloadFileResult {
  savedPath: string;
  fileName: string;
  size: number;
  contentType: string;
}

export interface DownloadLinkInput {
  code: string;
  extractIs?: boolean;
}

export class KbClient {
  constructor(private readonly config: KbConfig) {}

  async execute(command: string): Promise<unknown> {
    const response = await this.request(this.config.executeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });
    return readJsonOrText(response, "KB execute");
  }

  async uploadFile(input: UploadFileInput): Promise<unknown> {
    const info = await stat(input.localPath);
    if (!info.isFile()) {
      throw new Error(`kb_upload_file requires a file path, got ${JSON.stringify(input.localPath)}.`);
    }

    const fileName = input.fileName?.trim() || basename(input.localPath);
    const form = new FormData();
    form.append("file", await openAsBlob(input.localPath), fileName);
    form.append("fileName", fileName);
    form.append("pathName", input.pathName);

    const response = await this.request(this.getFileUploadUrl(), {
      method: "POST",
      body: form,
    });
    return readJsonOrText(response, "KB upload");
  }

  async downloadFile(input: DownloadFileInput): Promise<DownloadFileResult> {
    const response = await this.request(this.getFileDownloadUrl(input.code, input.extractIs), {
      method: "GET",
    });
    if (!response.ok) {
      throw await buildHttpError(response, "KB download");
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const suggestedName = getSuggestedFileName(response.headers.get("content-disposition")) ?? input.code;
    const outputPath = await resolveDownloadPath(input.localPath, suggestedName, input.overwrite ?? false);
    const content = new Uint8Array(await response.arrayBuffer());
    await writeFile(outputPath, content, { flag: input.overwrite ? "w" : "wx" });

    return {
      savedPath: outputPath,
      fileName: basename(outputPath),
      size: content.byteLength,
      contentType,
    };
  }

  async getDownloadLink(input: DownloadLinkInput): Promise<unknown> {
    const response = await this.request(this.getFileDownloadLinkUrl(input.code, input.extractIs), {
      method: "GET",
    });
    return readJsonOrText(response, "KB download link");
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: {
        token: this.config.token,
        ...this.config.extraHeaders,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }

  private getFileUploadUrl(): string {
    return new URL("/openapi/partner/sage/file/upload", this.config.executeUrl).toString();
  }

  private getFileDownloadUrl(code: string, extractIs?: boolean): string {
    const url = new URL("/openapi/partner/sage/file/download", this.config.executeUrl);
    url.searchParams.set("code", code);
    if (extractIs !== undefined) {
      url.searchParams.set("extractIs", String(extractIs));
    }
    return url.toString();
  }

  private getFileDownloadLinkUrl(code: string, extractIs?: boolean): string {
    const url = new URL("/openapi/partner/sage/file/downloadLink", this.config.executeUrl);
    url.searchParams.set("code", code);
    if (extractIs !== undefined) {
      url.searchParams.set("extractIs", String(extractIs));
    }
    return url.toString();
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readJsonOrText(response: Response, label: string): Promise<unknown> {
  const rawBody = await response.text();
  const body = tryParseJson(rawBody);
  if (!response.ok) {
    const renderedBody = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    throw new Error(`${label} failed with HTTP ${response.status}: ${renderedBody}`);
  }
  return body;
}

async function buildHttpError(response: Response, label: string): Promise<Error> {
  const rawBody = await response.text();
  const body = tryParseJson(rawBody);
  const renderedBody = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  return new Error(`${label} failed with HTTP ${response.status}: ${renderedBody}`);
}

function getSuggestedFileName(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
  return plainMatch?.[1]?.trim();
}

async function resolveDownloadPath(localPath: string, suggestedName: string, overwrite: boolean): Promise<string> {
  try {
    const existing = await stat(localPath);
    if (existing.isDirectory()) {
      return joinOutputPath(localPath, suggestedName);
    }
  } catch {}

  const targetDir = dirname(localPath);
  await mkdir(targetDir, { recursive: true });
  if (!overwrite) {
    try {
      await stat(localPath);
      throw new Error(`Download target already exists: ${localPath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return localPath;
}

function joinOutputPath(directoryPath: string, fileName: string): string {
  return `${directoryPath.replace(/\/+$/, "")}/${fileName}`;
}
