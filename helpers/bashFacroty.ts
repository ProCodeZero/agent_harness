import { tool } from "ai";
import { z } from "zod";

export interface BashOperations {
  exec(command: string): Promise<{ stdout: string; exitCode: number }>;
}

export function createBashTool(
  operations: BashOperations,
  safePrefixes: string[],
) {
  function isSafe(command: string): boolean {
    return safePrefixes.some((p) => command.trim().startsWith(p));
  }

  return tool({
    description: `Execute a shell command in the working directory.

WHEN TO USE: running build commands, installing packages, running tests,
  git operations, directory listings.

WHEN NOT TO USE: reading file contents (use read instead).
  Searching for patterns (use grep instead).

DO NOT USE FOR: reading files (use read), searching code (use grep).

USAGE: command is a single shell string. Commands not in the safe-prefix
  allowlist are blocked and return a clear error message.`,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
      if (!isSafe(command)) {
        return `Blocked: "${command}" requires approval.`;
      }
      const { stdout } = await operations.exec(command);
      return stdout || "(no output)";
    },
  });
}
