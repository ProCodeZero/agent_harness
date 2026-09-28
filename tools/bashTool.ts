import { execSync } from "node:child_process";
import { createBashTool } from "../helpers/bashFacroty";
import type { BashOperations } from "../helpers/bashFacroty";
import { createApproval } from "../helpers/approvalConfig";
import { cwd } from "../index";

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

// Interactive: human approves anything not on the safe list
export const bash = createBashTool(
  localOps,
  createApproval({ mode: "interactive" }),
);

//// Background: auto-approve everything (CI, automation)
//export const bash = createBashTool(
//  localOps,
//  createApproval({ mode: "background" }),
//);
//
//// Delegated: subagent inherits a trust slice from its parent
//export const bash = createBashTool(
//  localOps,
//  createApproval({ mode: "delegated", trust: ["pwd", "find .", "git status"] }),
//);
