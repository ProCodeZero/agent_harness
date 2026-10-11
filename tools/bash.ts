import { tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "../src/sandbox";

export function createBashTool(
  sandbox: Sandbox,
  needsApproval: (input: { command: string }) => boolean,
) {
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
      if (needsApproval({ command })) {
        return `Blocked: "${command}" requires approval.`;
      }

      const { stdout } = await sandbox.exec(command);
      return stdout || "(no output)";
    },
  });
}
