import { contextBridge, ipcRenderer } from "electron";

const api = {
  getVersion: async () => {
    console.log("Getting App Version...");
    const v = await ipcRenderer.invoke("app-version");
    console.log("App Version: ", v);
    return String(v);
  },
  revealDownloadedFile: async (opts: { fileId?: number; path?: string }) => {
    const channels = [
      "downloads:revealFile",
      "downloads.revealFile",
      "downloads_revealFile",
    ];
    let lastErr: any = null;
    for (const ch of channels) {
      try {
        return (await ipcRenderer.invoke(ch, opts)) as {
          opened: boolean;
          error?: string;
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("revealDownloadedFile failed");
  },
  checkForUpdates: async () => {
    try {
      const res = await ipcRenderer.invoke("check-for-updates");
      return res;
    } catch (err) {
      console.error("checkForUpdates failed", err);
      return { status: "error" } as const;
    }
  },
  getFeaturedMods: async (params?: {
    gameId?: number;
    excludedModIds?: number[];
    gameVersionTypeId?: number;
  }) => {
    const res = await ipcRenderer.invoke(
      "curseforge:getFeaturedMods",
      params ?? {},
    );
    return res as {
      data: {
        featured: unknown[];
        popular: unknown[];
        recentlyUpdated: unknown[];
      };
    };
  },
  searchMods: async (params: {
    gameId?: number;
    classId?: number;
    categoryId?: number;
    gameVersion?: string;
    modLoaderType?: number;
    searchFilter?: string;
    sortField?: string;
    sortOrder?: "asc" | "desc";
    pageSize?: number;
    index?: number;
  }) => {
    const res = await ipcRenderer.invoke("curseforge:searchMods", params ?? {});
    return res as {
      data: unknown[];
      pagination: {
        index: number;
        pageSize: number;
        resultCount: number;
        totalCount: number;
      };
    };
  },
  getLatestFileAndDownloadUrl: async (modId: number) => {
    const res = await ipcRenderer.invoke(
      "curseforge:getLatestFileAndDownloadUrl",
      { modId },
    );
    return res as { fileId: number; filename: string; downloadUrl: string };
  },
  getCurseForgeMod: async (modId: number) => {
    return (await ipcRenderer.invoke("curseforge:getMod", { modId })) as {
      data: unknown;
    };
  },
  getCurseForgeModFiles: async (
    modId: number,
    opts?: {
      pageSize?: number;
      index?: number;
      gameVersion?: string;
      modLoaderType?: number;
    },
  ) => {
    const params = { modId, ...(opts || {}) } as any;
    return (await ipcRenderer.invoke("curseforge:getModFiles", params)) as {
      data: unknown[];
      pagination?: {
        index: number;
        pageSize: number;
        resultCount: number;
        totalCount: number;
      };
    };
  },
  getCurseForgeFile: async (fileId: number) => {
    return (await ipcRenderer.invoke("curseforge:getFile", { fileId })) as {
      data: unknown;
    };
  },
  startDownloadByFileId: async (modExternalId: number, fileId: number) => {
    return (await ipcRenderer.invoke("downloads:startByFileId", {
      modExternalId,
      fileId,
    })) as { started: boolean };
  },
  checkJava: async () => {
    return (await ipcRenderer.invoke("env:checkJava")) as {
      ok: boolean;
      version?: string;
    };
  },
  getCurseForgeModDescription: async (modId: number) => {
    return (await ipcRenderer.invoke("curseforge:getModDescription", {
      modId,
    })) as {
      data: string; // HTML
    };
  },
  startLatestDownload: async (modExternalId: number) => {
    // Try multiple channel name variants to bypass any packaging quirks
    const channels = [
      "downloads:startLatest",
      "downloads.startLatest",
      "downloads_startLatest",
    ];
    let lastErr: any = null;
    for (const ch of channels) {
      try {
        return (await ipcRenderer.invoke(ch, { modExternalId })) as {
          started: boolean;
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("startLatestDownload failed");
  },
  getInstalledMods: async () => {
    // Try multiple channel variants too
    const channels = [
      "downloads:getInstalled",
      "downloads.getInstalled",
      "downloads_getInstalled",
    ];
    let lastErr: any = null;
    for (const ch of channels) {
      try {
        return (await ipcRenderer.invoke(ch)) as {
          entries: {
            modExternalId: number;
            fileId: number;
            filename: string;
            path: string;
            installedAt: number;
          }[];
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("getInstalledMods failed");
  },
  onDownloadProgress: (
    callback: (data: {
      url: string;
      received: number;
      total: number;
      percent: number;
      modExternalId?: number;
      fileId?: number;
    }) => void,
  ) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on("downloads:progress", handler);
    return () => ipcRenderer.removeListener("downloads:progress", handler);
  },
  onDownloadComplete: (
    callback: (data: {
      modExternalId: number;
      fileId: number;
      path: string;
      filename: string;
    }) => void,
  ) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on("downloads:complete", handler);
    return () => ipcRenderer.removeListener("downloads:complete", handler);
  },
  onDownloadFailed: (
    callback: (data: { url: string; state: string; fileId?: number }) => void,
  ) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on("downloads:failed", handler);
    return () => ipcRenderer.removeListener("downloads:failed", handler);
  },
  onInstalledStoreUpdated: (
    callback: (data: {
      entries: {
        modExternalId: number;
        fileId: number;
        filename: string;
        path: string;
        installedAt: number;
      }[];
    }) => void,
  ) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on("downloads:storeUpdated", handler);
    return () => ipcRenderer.removeListener("downloads:storeUpdated", handler);
  },
  rescanInstalled: async () => {
    const channels = [
      "downloads:rescan",
      "downloads.rescan",
      "downloads_rescan",
    ];
    let lastErr: any = null;
    for (const ch of channels) {
      try {
        return (await ipcRenderer.invoke(ch)) as {
          entries: {
            modExternalId: number;
            fileId: number;
            filename: string;
            path: string;
            installedAt: number;
          }[];
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("rescanInstalled failed");
  },
  onScannerProgress: (
    callback: (data: {
      phase: string;
      message?: string;
      percent?: number;
      details?: Record<string, unknown>;
    }) => void,
  ) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on("scanner:progress", handler);
    return () => ipcRenderer.removeListener("scanner:progress", handler);
  },
  staticScanJar: async (path: string) => {
    return (await ipcRenderer.invoke("scanner:staticScanJar", { path })) as {
      ok: boolean;
      data?: any;
      error?: string;
    };
  },
  openModsFolder: async () => {
    const channels = [
      "downloads:openModsFolder",
      "downloads.openModsFolder",
      "downloads_openModsFolder",
    ];
    let lastErr: any = null;
    for (const ch of channels) {
      try {
        return (await ipcRenderer.invoke(ch)) as { opened: true };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("openModsFolder failed");
  },
};

contextBridge.exposeInMainWorld("api", api);
export type IPCAPI = typeof api;
