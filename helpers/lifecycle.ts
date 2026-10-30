import type { SandboxLifecycle } from "../src/sandbox";

export function createLifecycle(
  sandboxType: string,
  gName: string,
  gEmail: string,
): SandboxLifecycle {
  if (sandboxType === "cloud") {
    const cloudLifecycle: SandboxLifecycle = {
      afterStart: async (sandbox) => {
        await sandbox.exec(`git config user.name "${gName}"`);
        await sandbox.exec(`git config user.email "${gEmail}"`);
        await sandbox.exec("bun install");
        await sandbox.exec("cp .env.example .env");
      },

      beforeStop: async (sandbox) => {
        const { stdout } = await sandbox.exec("git status --porcelain");
        if (stdout.trim()) {
          await sandbox.exec('git add -A && git commit -m "WIP: auto-save"');
        }
        if (sandbox.snapshot) {
          await sandbox.snapshot();
        }
      },

      onTimeout: async (sandbox) => {
        console.error("Sandbox timed out, saving state");
        await cloudLifecycle.beforeStop?.(sandbox);
      },
    };

    return cloudLifecycle;
  } else {
    const localLifecycle: SandboxLifecycle = {};
    return localLifecycle;
  }
}
