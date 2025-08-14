import { app, ipcMain } from "electron";
import {
  checkForUpdates as updaterCheckForUpdates,
  downloadUpdate as updaterDownloadUpdate,
  quitAndInstall as updaterQuitAndInstall,
} from "./autoUpdate";
import { registerCurseForgeIPC } from "../ipc/curseforge";
import { registerDownloadIPC } from "../ipc/downloads";
import { registerJavaIPC } from "../ipc/java";
import { registerScannerIPC } from "../ipc/scanner";

const registerIPCHandlers = () => {
  // Basic app handlers
  ipcMain.handle("app-version", async () => app.getVersion());
  ipcMain.handle("check-for-updates", async () => {
    try {
      const res = await updaterCheckForUpdates();
      return { status: "ok", info: res?.updateInfo } as const;
    } catch (err) {
      return { status: "error", error: String(err) } as const;
    }
  });
  ipcMain.handle("download-update", async () => {
    try {
      const res = await updaterDownloadUpdate();
      return { status: "ok", info: res } as const;
    } catch (err) {
      return { status: "error", error: String(err) } as const;
    }
  });
  ipcMain.handle("quit-and-install", async () => {
    try {
      updaterQuitAndInstall();
      return { status: "ok" } as const;
    } catch (err) {
      return { status: "error", error: String(err) } as const;
    }
  });

  // Delegate to modular IPC registrars
  registerCurseForgeIPC();
  registerDownloadIPC();
  registerJavaIPC();
  registerScannerIPC();
};

export default registerIPCHandlers;
