import { BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

/**
 * Initialize auto-updater: configure logging, wire events to renderer,
 * and optionally kick off a background update check.
 */
export function initAutoUpdater(mainWindow: BrowserWindow | null): void {
  // Use default electron-log via electron-updater if available
  try {
    // Lazy import to avoid hard dependency if not present at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const log = require("electron-log");
    if (log && log.default) {
      autoUpdater.logger = log.default;
      (autoUpdater.logger as any).transports.file.level = "info";
    }
  } catch {}

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

  // Background check and notify on first run
  try {
    autoUpdater.autoDownload = true;
    void autoUpdater.checkForUpdatesAndNotify();
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


