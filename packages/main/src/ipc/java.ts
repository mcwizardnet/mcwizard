import { ipcMain } from "electron";
import { execFile } from "node:child_process";

export function registerJavaIPC() {
  console.log("[ipc] registering Java IPC handlers");
  ipcMain.handle("env:checkJava", async () => {
    return await new Promise<{ ok: boolean; version?: string }>((resolve) => {
      execFile("java", ["-version"], (err, _stdout, stderr) => {
        if (err) return resolve({ ok: false });
        const m = String(stderr || "").match(/version\s+\"([^\"]+)\"/);
        resolve({ ok: true, version: m?.[1] });
      });
    });
  });
  console.log("[ipc] Java IPC handlers registered");
}
