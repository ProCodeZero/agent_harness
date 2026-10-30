import { readFileSync, existsSync } from "node:fs";
import { ToolLoopAgent, stepCountIs } from "ai";
import { ollama } from "ai-sdk-ollama";
import { resolve } from "node:path";
import { join } from "node:path";
import { buildSystemPrompt } from "./src/system";
import { createLocalSandbox } from "./src/sandbox-local";
import { createJustBashSandbox } from "./src/sandbox-just-bash";
import { createReadTool } from "./tools/read";
import { createGrepTool } from "./tools/grep";
import { createBashTool } from "./tools/bash";
import { createApproval } from "./tools/approvalConfig";
import { createLifecycle } from "./helpers/lifecycle";
import type { SandboxLifecycle } from "./src/sandbox";

const sandboxType = process.env.SANDBOX_TYPE || "local";
const gitName = process.env.GIT_NAME || "username";
const gitEmail = process.env.GIT_EMAIL || "email";

export const cwd = resolve(process.argv[2] || process.cwd());

const sandbox =
  sandboxType === "just-bash"
    ? await createJustBashSandbox(cwd)
    : createLocalSandbox(cwd);

const lifecycle: SandboxLifecycle = createLifecycle(
  sandboxType,
  gitName,
  gitEmail,
);

lifecycle.afterStart?.(sandbox);

console.error(`Sandbox: ${sandbox.type}`);

const tools = {
  read: createReadTool(sandbox),
  grep: createGrepTool(sandbox),
  bash: createBashTool(sandbox, createApproval({ mode: "interactive" })),
};

const agentsPath = join(cwd, "AGENTS.md");
const projectContext = existsSync(agentsPath)
  ? readFileSync(agentsPath, "utf-8")
  : undefined;

const instructions = buildSystemPrompt({
  workingDirectory: cwd,
  sandboxType: "local",
  toolNames: Object.keys(tools),
  projectContext,
});

const agent = new ToolLoopAgent({
  model: ollama("qwen3.5:9b"),
  instructions,
  tools,
  stopWhen: stepCountIs(10),
});

const prompt = process.argv.slice(3).join(" ") || "None";

try {
  const { text, steps } = await agent.generate({ prompt });
  console.log(text);
  console.log(`\n(${steps.length} steps)`);
} finally {
  await lifecycle.beforeStop?.(sandbox);
  await sandbox.stop();
}
