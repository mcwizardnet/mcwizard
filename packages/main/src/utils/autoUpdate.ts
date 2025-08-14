import { app, BrowserWindow } from "electron";
import updaterPkg from "electron-updater";

// electron-updater is CommonJS; access autoUpdater via default export namespace
const { autoUpdater } = updaterPkg as unknown as { autoUpdater: any };

/**
 * Initialize auto-updater: configure logging, wire events to renderer,
 * and optionally kick off a background update check.
 */
export function initAutoUpdater(mainWindow: BrowserWindow | null): void {
  // Default logging (console). Avoid hard deps to reduce packaging complexity.

  const send = (channel: string, payload?: any) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
      }
    } catch {}
  };

  autoUpdater.on("checking-for-update", () =>
    send("updates:status", { status: "checking" }),
  );
  autoUpdater.on("update-available", (info) =>
    send("updates:status", { status: "available", info }),
  );
  autoUpdater.on("update-not-available", (info) =>
    send("updates:status", { status: "none", info }),
  );
  autoUpdater.on("error", (error) =>
    send("updates:status", { status: "error", error: String(error) }),
  );
  autoUpdater.on("download-progress", (progress) =>
    send("updates:progress", progress),
  );
  autoUpdater.on("update-downloaded", (info) =>
    send("updates:status", { status: "downloaded", info }),
  );

  // Background check and notify on first run in production
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    if (app.isPackaged) {
      void autoUpdater.checkForUpdatesAndNotify();
    }
  } catch {}
}

export async function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export async function downloadUpdate() {
  // autoDownload true means download already starts on available; this ensures
  // explicit download when autoDownload is turned off in the future.
  return autoUpdater.downloadUpdate();
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
