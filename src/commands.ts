export interface ReadDocumentInput {
  code?: string;
  name?: string;
  range?: string;
  head?: number;
  tail?: number;
  lineNumbers?: boolean;
}

export interface SearchInput {
  query: string;
  repoCode?: string;
  path?: string;
  file?: string;
  docCode?: string;
  codes?: string[];
  mode?: "lex" | "sem" | "hybrid";
  topk?: number;
}

export interface WriteDocumentInput {
  name?: string;
  repoCode?: string;
  path?: string;
  html: string;
  status?: string;
}

export interface CreateDirectoryInput {
  name?: string;
  repoCode?: string;
  path?: string;
  parents?: boolean;
  existOk?: boolean;
}

export interface PublishInput {
  code?: string;
  name?: string;
}

export interface MoveInput {
  from?: string;
  docCode?: string;
  to: string;
}

export interface CopyInput {
  from?: string;
  docCode?: string;
  to: string;
  recursive?: boolean;
}

export interface DeleteInput {
  path?: string;
  docCode?: string;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./,:=@-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function ensureExclusiveIdentifier(label: string, values: Record<string, string | undefined>): void {
  const provided = Object.entries(values).filter(([, value]) => value);
  if (provided.length !== 1) {
    const options = Object.keys(values).join(", ");
    throw new Error(`${label} requires exactly one of: ${options}.`);
  }
}

function pushFlag(parts: string[], flag: string, value: string | number | undefined): void {
  if (value === undefined || value === "") {
    return;
  }
  parts.push(flag, shellQuote(String(value)));
}

export function buildListReposCommand(sort?: string, limit?: number): string {
  const parts = ["kb", "ls"];
  pushFlag(parts, "--sort", sort);
  pushFlag(parts, "--limit", limit);
  return parts.join(" ");
}

export function buildListPathCommand(path: string, sort?: string, limit?: number): string {
  const parts = ["kb", "ls", shellQuote(path)];
  pushFlag(parts, "--sort", sort);
  pushFlag(parts, "--limit", limit);
  return parts.join(" ");
}

export function buildTreeCommand(path: string, depth?: number, limit?: number): string {
  const parts = ["kb", "tree", shellQuote(path)];
  pushFlag(parts, "--depth", depth);
  pushFlag(parts, "--limit", limit);
  return parts.join(" ");
}

export function buildSearchCommand(input: SearchInput, defaultRepoCode?: string): string {
  const parts = ["kb", "search", "--query", shellQuote(input.query)];
  pushFlag(parts, "--repo-code", input.repoCode ?? defaultRepoCode);
  pushFlag(parts, "--path", input.path);
  pushFlag(parts, "--file", input.file);
  pushFlag(parts, "--doc-code", input.docCode);
  if (input.codes?.length) {
    pushFlag(parts, "--codes", input.codes.join(","));
  }
  pushFlag(parts, "--mode", input.mode);
  pushFlag(parts, "--topk", input.topk);
  return parts.join(" ");
}

export function buildReadDocumentCommand(input: ReadDocumentInput): string {
  ensureExclusiveIdentifier("kb_read_document", { code: input.code, name: input.name });
  const parts = ["kb", "cat"];
  pushFlag(parts, "--code", input.code);
  pushFlag(parts, "--name", input.name);
  pushFlag(parts, "--range", input.range);
  pushFlag(parts, "--head", input.head);
  pushFlag(parts, "--tail", input.tail);
  if (input.lineNumbers) {
    parts.push("-n");
  }
  return parts.join(" ");
}

export function buildRenderLinkCommand(codes: string[]): string {
  if (!codes.length) {
    throw new Error("kb_render_link requires at least one code.");
  }
  return `kb render ${shellQuote(codes.join(","))}`;
}

export function buildWriteDocumentCommand(input: WriteDocumentInput): string {
  const hasName = Boolean(input.name);
  const hasRepoPath = Boolean(input.repoCode && input.path);
  if (hasName === hasRepoPath) {
    throw new Error("kb_write_document requires either name or repoCode+path.");
  }

  const parts = ["kb", "write"];
  pushFlag(parts, "--name", input.name);
  pushFlag(parts, "--repo-code", input.repoCode);
  pushFlag(parts, "--path", input.path);
  pushFlag(parts, "--content", input.html);
  pushFlag(parts, "--status", input.status);
  return parts.join(" ");
}

export function buildPatchDocumentCommand(patch: string): string {
  const normalizedPatch = patch.replace(/\r\n/g, "\n").trim();
  if (!normalizedPatch) {
    throw new Error("kb_patch_document requires a non-empty patch.");
  }

  return `kb edit --patch\n${normalizedPatch}`;
}

export function buildCreateDirectoryCommand(input: CreateDirectoryInput): string {
  const parts = ["kb", "mkdir"];
  if (input.name) {
    parts.push(shellQuote(input.name));
  } else if (input.repoCode && input.path) {
    pushFlag(parts, "--repo-code", input.repoCode);
    pushFlag(parts, "--path", input.path);
  } else {
    throw new Error("kb_create_directory requires either name or repoCode+path.");
  }

  if (input.parents) {
    parts.push("--parents");
  }
  if (input.existOk !== undefined) {
    parts.push("--exist-ok", input.existOk ? "true" : "false");
  }
  return parts.join(" ");
}

export function buildPublishCommand(input: PublishInput): string {
  ensureExclusiveIdentifier("kb_publish_document", { code: input.code, name: input.name });
  const parts = ["kb", "publish"];
  pushFlag(parts, "--doc-code", input.code);
  pushFlag(parts, "--name", input.name);
  return parts.join(" ");
}

export function buildMoveCommand(input: MoveInput): string {
  const hasFrom = Boolean(input.from);
  const hasDocCode = Boolean(input.docCode);
  if (hasFrom === hasDocCode) {
    throw new Error("kb_move_document requires either from or docCode, but not both.");
  }

  const parts = ["kb", "mv"];
  pushFlag(parts, "--from", input.from);
  pushFlag(parts, "--doc-code", input.docCode);
  pushFlag(parts, "--to", input.to);
  return parts.join(" ");
}

export function buildCopyCommand(input: CopyInput): string {
  const hasFrom = Boolean(input.from);
  const hasDocCode = Boolean(input.docCode);
  if (hasFrom === hasDocCode) {
    throw new Error("kb_copy_document requires either from or docCode, but not both.");
  }

  const parts = ["kb", "cp"];
  pushFlag(parts, "--from", input.from);
  pushFlag(parts, "--doc-code", input.docCode);
  pushFlag(parts, "--to", input.to);
  if (input.recursive !== undefined) {
    parts.push("--recursive", input.recursive ? "true" : "false");
  }
  return parts.join(" ");
}

export function buildDeleteCommand(input: DeleteInput): string {
  const hasPath = Boolean(input.path);
  const hasDocCode = Boolean(input.docCode);
  if (hasPath === hasDocCode) {
    throw new Error("kb_delete_document requires either path or docCode, but not both.");
  }

  const parts = ["kb", "rm"];
  if (input.path) {
    parts.push(shellQuote(input.path));
  } else {
    pushFlag(parts, "--doc-code", input.docCode);
  }
  return parts.join(" ");
}
