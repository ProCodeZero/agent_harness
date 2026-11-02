import { tool } from "ai";
import type { Sandbox } from "../src/sandbox";
import { z } from "zod";

export interface ReadToolConfig {
  caps?: {
    maxLines?: number;
  };
}

export function createReadTool(sandbox: Sandbox, config?: ReadToolConfig) {
  const maxLines = config?.caps?.maxLines ?? 500;

  return tool({
    description: `Read file contents.
WHEN TO USE: inspecting code, reading configuration files, understanding file structure.
WHEN NOT TO USE: searching for patterns across multiple files (use grep instead), running commands (use bash instead).
USAGE: path is the file path relative to working directory. Use offset and limit for pagination on large files.`,
    inputSchema: z.object({
      path: z.string().describe("File path relative to working directory"),
      offset: z.number().optional().describe("Start line (1-indexed)"),
      limit: z.number().optional().describe("Max lines to return"),
    }),
    execute: async ({ path: filePath, offset, limit }) => {
      const content = await sandbox.readFile(filePath);
      if (!content) return "(empty file)";

      let lines = content.split("\n");
      if (offset) lines = lines.slice(offset - 1);
      if (limit) lines = lines.slice(0, limit);

      const truncated = lines.length > maxLines;
      if (truncated) lines = lines.slice(0, maxLines);

      const numbered = lines.map((l, i) => `${(offset || 1) + i}: ${l}`);
      return truncated
        ? numbered.join("\n") +
            `\n... (truncated, showing first ${maxLines} lines)`
        : numbered.join("\n");
    },
  });
}
