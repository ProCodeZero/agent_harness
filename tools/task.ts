import { ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "../src/sandbox";
import { createBashTool } from "./bash";
import { createApproval } from "./approvalConfig";
import { ollama } from "ai-sdk-ollama";

function buildExplorer(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  return new ToolLoopAgent({
    model: ollama("qwen2.5:3b"),
    instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}`,
    tools: { read: parentTools.read, grep: parentTools.grep },
    stopWhen: isStepCount(5),
  });
}

function buildExecutor(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  const executorBash = createBashTool(
    sandbox,
    createApproval({
      mode: "delegated",
      trust: ["npm test", "npm run build", "npx tsc"],
    }),
  );
  return new ToolLoopAgent({
    model: ollama("qwen3.5:9b"),
    instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Do NOT ask questions. Do NOT explore beyond what's needed. Execute the task.`,
    tools: {
      read: parentTools.read,
      grep: parentTools.grep,
      bash: executorBash,
    },
    stopWhen: isStepCount(15),
  });
}

// FIX: Changed `agent: ToolLoopAgent` to `agent: any` to resolve generic type mismatch
async function runSubagent(role: string, agent: any, description: string) {
  try {
    const { text, steps } = await agent.generate({ prompt: description });
    return text
      ? `[${role}: ${steps.length} steps]\n${text}`
      : `(no response from ${role})`;
  } catch (e: any) {
    return `${role} error: ${e.message}`;
  }
}

export function createTaskTool(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  return tool({
    description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast model (qwen2.5:3b). Use for searching across files,
  understanding patterns, and gathering context.
Executor: implementation with a stronger model (qwen3.5:9b) and delegated bash. Use for focused
  changes with explicit instructions and a known verification step.

WHEN TO USE: research across many files (explorer), bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser), architectural decisions
  (the parent decides).
DO NOT USE FOR: single-step tasks the parent can do directly.`,
    inputSchema: z.object({
      description: z.string().describe("Task instructions for the subagent"),
      subagentType: z
        .enum(["explorer", "executor"])
        .default("explorer")
        .describe("Subagent role"),
    }),
    execute: async ({ description, subagentType }) => {
      const agent =
        subagentType === "executor"
          ? buildExecutor(sandbox, parentTools)
          : buildExplorer(sandbox, parentTools);

      return runSubagent(subagentType, agent, description);
    },
  });
}
