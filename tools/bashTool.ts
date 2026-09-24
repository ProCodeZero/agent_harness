import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { createBashTool } from "../helpers/bashFacroty";
import type { BashOperations } from "../helpers/bashFacroty";

const cwd = resolve(process.argv[2] || process.cwd());

const SAFE_PREFIXES = [
  "ls",
  "cat",
  "echo",
  "pwd",
  "which",
  "find",
  "head",
  "tail",
  "wc",
  "git log",
  "git status",
  "git diff",
];

const localOps: BashOperations = {
  exec: async (command) => {
    try {
      const stdout = execSync(command, {
        cwd,
        encoding: "utf-8",
        timeout: 30_000,
      });
      return { stdout, exitCode: 0 };
    } catch (e: any) {
      return {
        stdout: e.stdout || e.stderr || e.message || "",
        exitCode: e.status ?? 1,
      };
    }
  },
};

export const bash = createBashTool(localOps, SAFE_PREFIXES);
