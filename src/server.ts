import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KbConfig } from "./config.js";
import { KbClient } from "./kb-client.js";
import {
  buildCopyCommand,
  buildCreateDirectoryCommand,
  buildDeleteCommand,
  buildListPathCommand,
  buildListReposCommand,
  buildMoveCommand,
  buildPatchDocumentCommand,
  buildPublishCommand,
  buildReadDocumentCommand,
  buildRenderLinkCommand,
  buildSearchCommand,
  buildTreeCommand,
  buildWriteDocumentCommand,
} from "./commands.js";

function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function createKbServer(config: KbConfig): McpServer {
  const client = new KbClient(config);
  const server = new McpServer({
    name: "torchv-kb",
    version: "0.1.0",
  });

  const runTool = async (command: string) => {
    try {
      const result = await client.execute(command);
      return {
        content: [{ type: "text" as const, text: toText(result) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
      };
    }
  };

  server.tool(
    "kb_list_repos",
    {
      sort: z.enum(["name", "updated", "size"]).optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ sort, limit }) => runTool(buildListReposCommand(sort, limit)),
  );

  server.tool(
    "kb_list_path",
    {
      path: z.string().min(1),
      sort: z.enum(["name", "updated", "size"]).optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ path, sort, limit }) => runTool(buildListPathCommand(path, sort, limit)),
  );

  server.tool(
    "kb_tree",
    {
      path: z.string().min(1),
      depth: z.number().int().positive().optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ path, depth, limit }) => runTool(buildTreeCommand(path, depth, limit)),
  );

  server.tool(
    "kb_search",
    {
      query: z.string().min(1),
      repoCode: z.string().min(1).optional(),
      path: z.string().min(1).optional(),
      file: z.string().min(1).optional(),
      docCode: z.string().min(1).optional(),
      codes: z.array(z.string().min(1)).optional(),
      mode: z.enum(["lex", "sem", "hybrid"]).optional(),
      topk: z.number().int().positive().optional(),
    },
    async (input) => runTool(buildSearchCommand(input, config.defaultRepoCode)),
  );

  server.tool(
    "kb_read_document",
    {
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      range: z.string().min(1).optional(),
      head: z.number().int().positive().optional(),
      tail: z.number().int().positive().optional(),
      lineNumbers: z.boolean().optional(),
    },
    async (input) => runTool(buildReadDocumentCommand(input)),
  );

  server.tool(
    "kb_render_link",
    {
      codes: z.array(z.string().min(1)).min(1),
    },
    async ({ codes }) => runTool(buildRenderLinkCommand(codes)),
  );

  server.tool(
    "kb_download_file",
    {
      code: z.string().min(1),
      localPath: z.string().min(1),
      extractIs: z.boolean().optional(),
      overwrite: z.boolean().optional(),
    },
    async ({ code, localPath, extractIs, overwrite }) => {
      try {
        const result = await client.downloadFile({ code, localPath, extractIs, overwrite });
        return {
          content: [{ type: "text" as const, text: toText(result) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
        };
      }
    },
  );

  server.tool(
    "kb_get_download_link",
    {
      code: z.string().min(1),
      extractIs: z.boolean().optional(),
    },
    async ({ code, extractIs }) => {
      try {
        const result = await client.getDownloadLink({ code, extractIs });
        return {
          content: [{ type: "text" as const, text: toText(result) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
        };
      }
    },
  );

  if (config.mode === "write" || config.mode === "admin") {
    server.tool(
      "kb_write_document",
      {
        name: z.string().min(1).optional(),
        repoCode: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
        html: z.string().min(1),
        status: z.string().min(1).optional(),
      },
      async (input) => runTool(buildWriteDocumentCommand(input)),
    );

    server.tool(
      "kb_patch_document",
      {
        patch: z.string().min(1),
      },
      async ({ patch }) => runTool(buildPatchDocumentCommand(patch)),
    );

    server.tool(
      "kb_create_directory",
      {
        name: z.string().min(1).optional(),
        repoCode: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
        parents: z.boolean().optional(),
        existOk: z.boolean().optional(),
      },
      async (input) => runTool(buildCreateDirectoryCommand(input)),
    );

    server.tool(
      "kb_copy_document",
      {
        from: z.string().min(1).optional(),
        docCode: z.string().min(1).optional(),
        to: z.string().min(1),
        recursive: z.boolean().optional(),
      },
      async (input) => runTool(buildCopyCommand(input)),
    );

    server.tool(
      "kb_publish_document",
      {
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
      },
      async (input) => runTool(buildPublishCommand(input)),
    );

    server.tool(
      "kb_upload_file",
      {
        localPath: z.string().min(1),
        pathName: z.string().min(1),
        fileName: z.string().min(1).optional(),
      },
      async ({ localPath, pathName, fileName }) => {
        try {
          const result = await client.uploadFile({ localPath, pathName, fileName });
          return {
            content: [{ type: "text" as const, text: toText(result) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    );
  }

  if (config.mode === "admin") {
    server.tool(
      "kb_move_document",
      {
        from: z.string().min(1).optional(),
        docCode: z.string().min(1).optional(),
        to: z.string().min(1),
      },
      async (input) => runTool(buildMoveCommand(input)),
    );

    server.tool(
      "kb_delete_document",
      {
        path: z.string().min(1).optional(),
        docCode: z.string().min(1).optional(),
      },
      async (input) => runTool(buildDeleteCommand(input)),
    );
  }

  return server;
}
