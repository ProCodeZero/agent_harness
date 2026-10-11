import { readFileSync, existsSync } from "node:fs";
import { ToolLoopAgent, stepCountIs } from "ai";
import { ollama } from "ai-sdk-ollama";
import { resolve } from "node:path";
import { join } from "node:path";
import { buildSystemPrompt } from "./src/system";
import { createLocalSandbox } from "./src/sandbox-local";
import { createReadTool } from "./tools/read";
import { createGrepTool } from "./tools/grep";
import { createBashTool } from "./tools/bash";
import { createApproval } from "./tools/approvalConfig";

export const cwd = resolve(process.argv[2] || process.cwd());

const sandbox = createLocalSandbox(cwd);
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
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
