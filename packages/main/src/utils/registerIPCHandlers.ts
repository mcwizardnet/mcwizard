import { app, ipcMain } from "electron";
import { registerCurseForgeIPC } from "../ipc/curseforge";
import { registerDownloadIPC } from "../ipc/downloads";
import { registerJavaIPC } from "../ipc/java";
import { registerScannerIPC } from "../ipc/scanner";

const registerIPCHandlers = () => {
  // Basic app handlers
  ipcMain.handle("app-version", async () => app.getVersion());
  ipcMain.handle("check-for-updates", async () => ({ status: "ok" }) as const);

  // Delegate to modular IPC registrars
  registerCurseForgeIPC();
  registerDownloadIPC();
  registerJavaIPC();
  registerScannerIPC();
};

export default registerIPCHandlers;
