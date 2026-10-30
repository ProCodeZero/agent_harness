//import type { Sandbox } from "./sandbox";

//export async function createCloudSandbox(config: {
//  template?: string;
//  snapshotId?: string;
//}): Promise<Sandbox> {
//  const vm = await VercelSandbox.create(config);
//
//  return {
//    type: "cloud",
//    workingDirectory: "/workspace",
//    expiresAt: Date.now() + 30 * 60 * 1000,
//
//    readFile: async (p) => {
//      return vm.files.read(resolve("/workspace", p));
//    },
//
//    exec: async (command) => {
//      const result = await vm.commands.run(command, { cwd: "/workspace" });
//      return {
//        stdout: result.stdout + result.stderr,
//        exitCode: result.exitCode,
//      };
//    },
//
//    stop: async () => {
//      await vm.close();
//    },
//
//    snapshot: async () => {
//      const snap = await vm.snapshot();
//      return { snapshotId: snap.id };
//    },
//  };
//}
