import { app, BrowserWindow } from "electron";
import path from "node:path";

/** Resolve preload script path in dev/prod */
function getPreloadPath(): string {
  return app.isPackaged
    ? path.join(app.getAppPath(), "packages", "preload", "dist", "exposed.mjs")
    : path.resolve(process.cwd(), "node_modules/@app/preload/dist/exposed.mjs");
}

/** Create the main window and load renderer */
function createMainWindow(mainWindow: BrowserWindow | null): BrowserWindow {
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: getPreloadPath(),
    },
    autoHideMenuBar: true,
  });

  if (app.isPackaged) {
    // Production: serve via app:// custom protocol
    mainWindow.loadURL("app://-/");
  } else {
    // Development: serve via vite development server
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}
export default createMainWindow;
