import { tool } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(process.argv[2] || process.cwd());

export const read = tool({
  description: `Execute a shell command in the working directory.

WHEN TO USE: running build commands, installing packages, running tests,
  git operations, directory listings.

WHEN NOT TO USE: reading file contents (use read instead).
  Searching for patterns (use grep instead).

DO NOT USE FOR: reading files (use read), searching code (use grep).

USAGE: command is a single shell string. Commands not in the safe-prefix
  allowlist are blocked and return a clear error message.

EXAMPLES:
  - List files: command "ls -la"
  - Check git status: command "git status"
  - Run a test suite: command "npm test"`,
  inputSchema: z.object({
    path: z.string().describe("File path relative to working directory"),
    offset: z.number().optional().describe("Start line (1-indexed)"),
    limit: z.number().optional().describe("Max lines to return"),
  }),
  execute: async ({ path: filePath, offset, limit }) => {
    const abs = resolve(cwd, filePath);
    const content = readFileSync(abs, "utf-8");
    let lines = content.split("\n");

    if (offset) lines = lines.slice(offset - 1);
    if (limit) lines = lines.slice(0, limit);

    const MAX_LINES = 500;
    const truncated = lines.length > MAX_LINES;
    if (truncated) lines = lines.slice(0, MAX_LINES);

    const numbered = lines.map((l, i) => `${(offset || 1) + i}: ${l}`);
    return truncated
      ? numbered.join("\n") + `\n... (truncated at ${MAX_LINES} lines)`
      : numbered.join("\n");
  },
});
