import { app } from "electron";
import type { BrowserWindow } from "electron";
import createMainWindow from "./createMainWindow";

const guardSingleInstance = (mainWindow: BrowserWindow | null) => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.on("activate", () => {
    if (mainWindow === null) mainWindow = createMainWindow(mainWindow);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
};

export default guardSingleInstance;
