// electron-main.ts
import { app, BrowserWindow } from "electron";

import registerAppProtocol from "./utils/registerAppProtocol";
import createMainWindow from "./utils/createMainWindow";
import guardSingleInstance from "./utils/guardSingleInstance";
import registerIPCHandlers from "./utils/registerIPCHandlers";

export async function initApp() {
  // Register protocol now so it's ready by the time the window loads
  registerAppProtocol();
  // Create placeholder for mainWindow.
  let mainWindow: BrowserWindow | null = null;
  // When the app is ready, launch singleton window.
  app.on("ready", () => {
    mainWindow = createMainWindow(mainWindow);
    guardSingleInstance(mainWindow);
  });
  // Wait for IPC Messages
  registerIPCHandlers();
}
