import type { Sandbox } from "./sandbox";
import { Sandbox as JustBashSandbox } from "just-bash";

const MOUNT = "/home/user/project";

export async function createJustBashSandbox(dir: string): Promise<Sandbox> {
  const jb = await JustBashSandbox.create({ overlayRoot: dir });
  return {
    type: "just-bash",
    workingDirectory: dir,
    readFile: async (f) => {
      return jb.readFile(`${MOUNT}/${f}`);
    },
    exec: async (command) => {
      const cmd = await jb.runCommand(command, { cwd: MOUNT });
      const finished = await cmd.wait();
      return {
        stdout: await cmd.output(),
        exitCode: finished.exitCode,
      };
    },
    stop: async () => {},
  };
}
