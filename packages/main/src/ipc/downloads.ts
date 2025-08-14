import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { CURSEFORGE_API_URL } from "./cache";

type InstalledEntry = {
  modExternalId: number;
  fileId: number;
  filename: string;
  path: string;
  installedAt: number;
};
type InstalledStore = { entries: InstalledEntry[] };

export function registerDownloadIPC() {
  console.log("[ipc] registering Download IPC handlers");
  const userDataDir = app.getPath("userData");
  const modsDir = path.join(userDataDir, "mods");
  const storePath = path.join(userDataDir, "installed-mods.json");
  try {
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
  } catch {}

  function readStore(): InstalledStore {
    try {
      const raw = fs.existsSync(storePath)
        ? fs.readFileSync(storePath, "utf8")
        : "";
      if (!raw) return { entries: [] };
      return JSON.parse(raw);
    } catch {
      return { entries: [] };
    }
  }
  function writeStore(store: InstalledStore) {
    try {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
    } catch {}
  }

  function syncStoreWithDisk(): InstalledStore {
    const store = readStore();
    const updated = store.entries.filter((e) => fs.existsSync(e.path));
    if (updated.length !== store.entries.length) {
      const next = { entries: updated } satisfies InstalledStore;
      writeStore(next);
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        "downloads:storeUpdated",
        next,
      );
      return next;
    }
    return store;
  }

  const normalizeName = (s: string) =>
    decodeURIComponent(String(s || "").toLowerCase())
      .replace(/\s+/g, " ")
      .trim();

  const pendingByUrl = new Map<
    string,
    {
      modExternalId: number;
      fileId: number;
      filename: string;
      savePath: string;
    }
  >();
  const pendingByFilename = new Map<
    string,
    {
      modExternalId: number;
      fileId: number;
      filename: string;
      savePath: string;
    }
  >();
  // Extra index for robust filename matching across encodings and redirects
  const pendingByNormFilename = new Map<
    string,
    {
      modExternalId: number;
      fileId: number;
      filename: string;
      savePath: string;
    }
  >();
  const pendingBySavePath = new Map<
    string,
    {
      modExternalId: number;
      fileId: number;
      filename: string;
      savePath: string;
    }
  >();

  const attachDownloadHook = () => {
    const ses = session.defaultSession;
    if (!ses) return;
    if ((ses as any).__mcwizardDownloadsHooked) return;
    (ses as any).__mcwizardDownloadsHooked = true;
    ses.on("will-download", (event, item, webContents) => {
      try {
        console.log("[downloads] will-download", {
          url: item.getURL(),
          filename: item.getFilename(),
        });
      } catch {}
      const url = item.getURL();
      const filename = item.getFilename();
      const filenameKey = String(filename || "").toLowerCase();
      let pending = pendingByUrl.get(url) || pendingByFilename.get(filenameKey);
      if (!pending) {
        // Try normalized filename matching (accounts for %20 vs spaces, case, etc.)
        const norm = normalizeName(item.getFilename());
        const entry = pendingByNormFilename.get(norm);
        if (entry) pending = entry;
      }
      if (pending) {
        item.setSavePath(pending.savePath);
        // Ensure we can resolve by the final suggested filename on 'done'
        try {
          const suggested = item.getFilename();
          pendingByFilename.set(String(suggested || "").toLowerCase(), pending);
          pendingByNormFilename.set(normalizeName(suggested), pending);
          const sPath = (item as any).getSavePath?.() || pending.savePath;
          if (sPath) pendingBySavePath.set(String(sPath), pending);
        } catch {}
      } else item.setSavePath(path.join(modsDir, filename));
      item.on("updated", (_e, state) => {
        if (state === "interrupted") return;
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const percent = total > 0 ? received / total : 0;
        try {
          if (Number.isFinite(percent)) {
            console.log("[downloads] progress", Math.round(percent * 100));
          }
        } catch {}
        try {
          webContents.send("downloads:progress", {
            url,
            received,
            total,
            percent,
            modExternalId: pending?.modExternalId,
            fileId: pending?.fileId,
          });
        } catch {}
      });
      item.once("done", (_e, state) => {
        try {
          console.log("[downloads] done", { state, url: item.getURL() });
        } catch {}
        const urlKey = item.getURL();
        const doneFilename = item.getFilename();
        const doneKey = String(doneFilename || "").toLowerCase();
        const finalPath = (item as any).getSavePath?.();
        let pending =
          pendingByUrl.get(urlKey) ||
          pendingByFilename.get(doneKey) ||
          pendingByNormFilename.get(normalizeName(doneFilename)) ||
          (finalPath ? pendingBySavePath.get(String(finalPath)) : undefined);
        let handled = false;
        if (state === "completed") {
          const entry = pending ?? pendingByUrl.get(urlKey);
          if (entry) {
            const store = readStore();
            const filtered = store.entries.filter(
              (e) => e.fileId !== entry.fileId,
            );
            filtered.push({
              modExternalId: entry.modExternalId,
              fileId: entry.fileId,
              filename: entry.filename,
              path: entry.savePath,
              installedAt: Date.now(),
            });
            const nextStore = { entries: filtered } as const;
            writeStore(nextStore);
            // Immediate broadcast so UI flips without waiting for watcher
            BrowserWindow.getAllWindows()[0]?.webContents.send(
              "downloads:storeUpdated",
              nextStore,
            );
            try {
              console.log("[downloads] complete persisted", entry.filename);
            } catch {}
            BrowserWindow.getAllWindows()[0]?.webContents.send(
              "downloads:complete",
              {
                modExternalId: entry.modExternalId,
                fileId: entry.fileId,
                path: entry.savePath,
                filename: entry.filename,
              },
            );
            handled = true;
          }
        }
        if (!handled) {
          try {
            console.warn("[downloads] failed", {
              url: urlKey,
              state,
              fileId: pending?.fileId,
            });
          } catch {}
          BrowserWindow.getAllWindows()[0]?.webContents.send(
            "downloads:failed",
            {
              url: urlKey,
              state,
              fileId: pending?.fileId,
              modExternalId: pending?.modExternalId,
              filename: doneFilename,
            },
          );
        }
        pendingByUrl.delete(urlKey);
        pendingByFilename.delete(doneKey);
        pendingByNormFilename.delete(normalizeName(doneFilename));
        if (finalPath) pendingBySavePath.delete(String(finalPath));
        syncStoreWithDisk();
      });
    });
  };
  if (app.isReady()) attachDownloadHook();
  else app.once("ready", attachDownloadHook);

  const startModsWatcher = () => {
    try {
      let debounce: NodeJS.Timeout | null = null;
      fs.watch(modsDir, { persistent: true }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => syncStoreWithDisk(), 200);
      });
    } catch {}
  };
  if (app.isReady()) startModsWatcher();
  else app.once("ready", startModsWatcher);

  ipcMain.handle("downloads:getInstalled", async () => syncStoreWithDisk());
  ipcMain.handle("downloads.getInstalled", async () => syncStoreWithDisk());
  ipcMain.handle("downloads_getInstalled", async () => syncStoreWithDisk());

  ipcMain.handle("downloads:openModsFolder", async () => {
    await shell.openPath(modsDir);
    return { opened: true as const };
  });
  ipcMain.handle("downloads.openModsFolder", async () => ({
    opened: true as const,
  }));
  ipcMain.handle("downloads_openModsFolder", async () => ({
    opened: true as const,
  }));

  ipcMain.handle(
    "downloads:revealFile",
    async (_e, args: { fileId?: number; path?: string }) => {
      try {
        let targetPath = args?.path;
        if (!targetPath && typeof args?.fileId === "number") {
          const store = readStore();
          targetPath = store.entries.find(
            (e) => e.fileId === args.fileId,
          )?.path;
        }
        if (!targetPath) throw new Error("No known path for file");
        await shell.showItemInFolder(targetPath);
        return { opened: true as const };
      } catch (err) {
        return {
          opened: false as const,
          error: String((err as any)?.message || err),
        };
      }
    },
  );

  // Start download of latest file for a mod
  ipcMain.handle(
    "downloads:startLatest",
    async (_e, args: { modExternalId: number }) => {
      const filesUrl = `${CURSEFORGE_API_URL}/mods/${args.modExternalId}/files?pageSize=1&index=0`;
      const res = await fetch(filesUrl, {
        headers: {
          Accept: "application/json",
          "x-api-key": __CURSEFORGE_API_KEY__,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`CurseForge files failed: ${res.status} ${text}`);
      }
      const json = await res.json();
      const file = json?.data?.[0];
      if (!file?.downloadUrl) throw new Error("No downloadable file found");
      const url = file.downloadUrl as string;
      const filename = String(file.fileName || `mod-${file.id}.jar`);
      const ext = path.extname(filename) || ".jar";
      const base = path.basename(filename, ext);
      const entry = {
        modExternalId: args.modExternalId,
        fileId: file.id,
        filename: base + ext,
        savePath: path.join(modsDir, base + ext),
      };
      pendingByUrl.set(url, entry);
      pendingByFilename.set(String(entry.filename || "").toLowerCase(), entry);
      pendingByNormFilename.set(normalizeName(entry.filename), entry);
      try {
        const remoteName = new URL(url).pathname.split("/").pop();
        if (remoteName) {
          pendingByFilename.set(String(remoteName).toLowerCase(), entry);
          pendingByNormFilename.set(normalizeName(remoteName), entry);
        }
      } catch {}
      pendingBySavePath.set(entry.savePath, entry);
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error("No window available to start download");
      win.webContents.downloadURL(url);
      return { started: true } as const;
    },
  );

  // Start download by specific file id
  ipcMain.handle(
    "downloads:startByFileId",
    async (_e, args: { modExternalId: number; fileId: number }) => {
      const urlMeta = `${CURSEFORGE_API_URL}/files/${args.fileId}`;
      let res = await fetch(urlMeta, {
        headers: {
          Accept: "application/json",
          "x-api-key": __CURSEFORGE_API_KEY__,
        },
      });
      let file: any | undefined;
      let url: string | undefined;
      if (res.ok) {
        const json = await res.json();
        file = json?.data;
        url = file?.downloadUrl;
      } else {
        const alt = await fetch(
          `${CURSEFORGE_API_URL}/mods/${args.modExternalId}/files/${args.fileId}/download-url`,
          {
            headers: {
              Accept: "application/json",
              "x-api-key": __CURSEFORGE_API_KEY__,
            },
          },
        );
        if (alt.ok) {
          const j = await alt.json();
          url = String(j?.data || "");
        } else {
          const text = await res.text().catch(() => "");
          throw new Error(
            `CurseForge file details failed: ${res.status} ${text}`,
          );
        }
      }
      if (!url) throw new Error("No downloadable file found");
      const orig = String(
        file?.fileName || `mod-${args.modExternalId}-file-${args.fileId}.jar`,
      );
      const ext = path.extname(orig) || ".jar";
      const base = path.basename(orig, ext);
      const entry = {
        modExternalId: args.modExternalId,
        fileId: Number(file?.id ?? args.fileId),
        filename: `${base}${ext}`,
        savePath: path.join(modsDir, `${base}${ext}`),
      };
      pendingByUrl.set(url, entry);
      pendingByFilename.set(String(entry.filename || "").toLowerCase(), entry);
      pendingByNormFilename.set(normalizeName(entry.filename), entry);
      try {
        const remoteName = new URL(url).pathname.split("/").pop();
        if (remoteName) {
          pendingByFilename.set(String(remoteName).toLowerCase(), entry);
          pendingByNormFilename.set(normalizeName(remoteName), entry);
        }
      } catch {}
      pendingBySavePath.set(entry.savePath, entry);
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error("No window available to start download");
      win.webContents.downloadURL(url);
      return { started: true } as const;
    },
  );
  console.log("[ipc] Download IPC handlers registered");
}
