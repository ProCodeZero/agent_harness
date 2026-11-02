import { tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "../src/sandbox";

export interface GrepToolConfig {
  caps?: {
    maxMatches?: number;
  };
}

export function createGrepTool(sandbox: Sandbox, config?: GrepToolConfig) {
  const maxMatches = config?.caps?.maxMatches ?? 50;

  return tool({
    description: `Search file contents using regex. Returns matching lines with file paths.
WHEN TO USE: finding patterns across multiple files, locating function definitions,
searching for imports, finding TODOs or error messages.
WHEN NOT TO USE: reading a known file (use read instead).
Running commands (use bash instead).
DO NOT USE FOR: reading files (use read), listing directories (use bash),
modifying files (use edit).
USAGE: pattern is a regex string. glob filters by file extension.
Results are capped.`,
    inputSchema: z.object({
      pattern: z.string().describe("Regex pattern to search for"),
      path: z
        .string()
        .optional()
        .describe("Directory to search (default: working dir)"),
      glob: z.string().optional().describe("File glob filter, e.g. '*.ts'"),
    }),
    execute: async ({ pattern, path: searchPath, glob: globFilter }) => {
      const dir = searchPath || ".";
      const escapedPattern = pattern.replace(/'/g, `'\\''`);
      const escapedGlob = (globFilter || "*").replace(/'/g, `'\\''`);

      // Note: 2>/dev/null suppresses permission errors, and sandbox.exec
      // safely handles grep's exit code 1 (when no matches are found).
      const cmd = `grep -rn --exclude-dir=node_modules --exclude-dir=.git --include='${escapedGlob}' -E '${escapedPattern}' '${dir}' 2>/dev/null`;
      const { stdout } = await sandbox.exec(cmd);
      const output = stdout?.trim();

      if (!output) {
        return "No matches found.";
      }

      const lines = output.split("\n").filter(Boolean);
      const truncated = lines.length > maxMatches;
      const result = truncated ? lines.slice(0, maxMatches) : lines;

      return truncated
        ? result.join("\n") +
            `\n... (${lines.length} total, showing first ${maxMatches})`
        : result.join("\n");
    },
  });
}
