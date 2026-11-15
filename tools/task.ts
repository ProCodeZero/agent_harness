import { ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "../src/sandbox";
import { createBashTool } from "./bash";
import { createApproval } from "../tools/approvalConfig";
import { ollama } from "ai-sdk-ollama";

export function createTaskTool(
  sandbox: Sandbox,
  parentTools: { read: any; grep: any },
) {
  return tool({
    description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast model.
Executor: implementation with a stronger model and delegated trust on bash.

WHEN TO USE: research across many files (explorer), bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser),
  architectural decisions (the parent decides).`,
    inputSchema: z.object({
      description: z.string().describe("Task instructions for the subagent"),
      subagentType: z
        .enum(["explorer", "executor"])
        .default("explorer")
        .describe("Subagent role"),
    }),

    execute: async ({ description, subagentType }) => {
      if (subagentType === "executor") {
        const executorBash = createBashTool(
          sandbox,
          createApproval({
            mode: "delegated",
            trust: ["npm test", "npm run build", "npx tsc"],
          }),
        );

        const executor = new ToolLoopAgent({
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

        try {
          const { text, steps } = await executor.generate({
            prompt: description,
          });
          return text
            ? `[Executor: ${steps.length} steps]\n${text}`
            : "(no response from executor)";
        } catch (e: any) {
          return `Executor error: ${e.message}`;
        }
      }

      const explorer = new ToolLoopAgent({
        model: ollama("qwen3.5:9b"),
        instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}`,
        tools: { read: parentTools.read, grep: parentTools.grep },
        stopWhen: isStepCount(5),
      });

      try {
        const { text, steps } = await explorer.generate({
          prompt: description,
        });
        return text
          ? `[Explorer: ${steps.length} steps]\n${text}`
          : "(no response from explorer)";
      } catch (e: any) {
        return `Explorer error: ${e.message}`;
      }
    },
  });
}
