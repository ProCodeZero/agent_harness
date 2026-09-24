import { tool } from "ai";
import { z } from "zod";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const cwd = resolve(process.argv[2] || process.cwd());

export const grep = tool({
  description: `Search file contents using regex. Returns matching lines with file paths.

WHEN TO USE: finding patterns across multiple files, locating function definitions,
  searching for imports, finding TODOs or error messages.

WHEN NOT TO USE: reading a known file (use read instead).
  Running commands (use bash instead).

DO NOT USE FOR: reading files (use read), listing directories (use bash),
  modifying files (use edit).

USAGE: pattern is a regex string. glob filters by file extension.
  Results are capped at 50 matches.

EXAMPLES:
  - Find all TODO comments: pattern "TODO" glob "*.ts"
  - Find function definitions: pattern "function \\w+" glob "*.ts"
  - Find imports of a package: pattern "from 'express'" glob "*.ts"`,
  inputSchema: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z
      .string()
      .optional()
      .describe("Directory to search (default: working dir)"),
    glob: z.string().optional().describe("File glob filter, e.g. '*.ts'"),
  }),
  execute: async ({ pattern, path: searchPath, glob: globFilter }) => {
    const dir = resolve(cwd, searchPath || ".");
    const escapedPattern = pattern.replace(/'/g, `'\\''`);
    const escapedGlob = (globFilter || "*").replace(/'/g, `'\\''`);
    const cmd = `grep -rn --exclude-dir=node_modules --exclude-dir=.git --include='${escapedGlob}' -E '${escapedPattern}' '${dir}' 2>/dev/null`;

    try {
      const stdout = execSync(cmd, { encoding: "utf-8", timeout: 10_000 });
      const lines = stdout.trim().split("\\n").filter(Boolean);

      const MAX_MATCHES = 50;
      const truncated = lines.length > MAX_MATCHES;
      const result = truncated ? lines.slice(0, MAX_MATCHES) : lines;

      return truncated
        ? result.join("\\n") +
            `\\n... (${lines.length} total, showing first ${MAX_MATCHES})`
        : result.join("\\n") || "No matches found.";
    } catch (error: any) {
      const stdout = String(error?.stdout || "").trim();
      if (stdout) {
        const lines = stdout.split("\\n").filter(Boolean);
        const MAX_MATCHES = 50;
        const truncated = lines.length > MAX_MATCHES;
        const result = truncated ? lines.slice(0, MAX_MATCHES) : lines;
        return truncated
          ? result.join("\\n") +
              `\\n... (${lines.length} total, showing first ${MAX_MATCHES})`
          : result.join("\\n");
      }
      return "No matches found.";
    }
  },
});
