import { ToolLoopAgent, stepCountIs } from "ai";
import { ollama } from "ai-sdk-ollama";
import { resolve } from "node:path";
import { read } from "./tools/readTool";
import { grep } from "./tools/grepTool";
import { bash } from "./tools/bashTool";

const cwd = resolve(process.argv[2] || process.cwd());

const agent = new ToolLoopAgent({
  model: ollama("qwen3.5:9b"),
  instructions: `You are a coding agent.\nWorking directory: ${cwd}`,
  tools: { read, grep, bash },
  stopWhen: stepCountIs(10),
});

const prompt = process.argv.slice(3).join(" ") || "None";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
