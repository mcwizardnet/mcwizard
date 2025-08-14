import { ipcMain } from "electron";
import { CURSEFORGE_API_URL, cachedFetchJson } from "./cache";

export function registerCurseForgeIPC() {
  console.log("[ipc] registering CurseForge IPC handlers");
  // Featured mods (POST not cached here due to body)
  ipcMain.handle(
    "curseforge:getFeaturedMods",
    async (
      _event,
      args: {
        gameId?: number;
        excludedModIds?: number[];
        gameVersionTypeId?: number;
      },
    ) => {
      const res = await fetch(`${CURSEFORGE_API_URL}/mods/featured`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": __CURSEFORGE_API_KEY__,
        },
        body: JSON.stringify({
          gameId: args?.gameId ?? 432,
          excludedModIds: args?.excludedModIds ?? [],
          gameVersionTypeId: args?.gameVersionTypeId,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `CurseForge featured mods failed: ${res.status} ${text}`,
        );
      }
      return res.json();
    },
  );

  ipcMain.handle("curseforge:getMod", async (_e, args: { modId: number }) => {
    const url = `${CURSEFORGE_API_URL}/mods/${args.modId}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": __CURSEFORGE_API_KEY__,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CurseForge getMod failed: ${res.status} ${text}`);
    }
    return res.json();
  });

  ipcMain.handle(
    "curseforge:getModFiles",
    async (
      _e,
      args: {
        modId: number;
        pageSize?: number;
        index?: number;
        gameVersion?: string;
        modLoaderType?: number;
      },
    ) => {
      const params = new URLSearchParams();
      if (args?.pageSize != null) params.set("pageSize", String(args.pageSize));
      if (args?.index != null) params.set("index", String(args.index));
      if (args?.gameVersion) params.set("gameVersion", args.gameVersion);
      if (args?.modLoaderType != null)
        params.set("modLoaderType", String(args.modLoaderType));
      const url = `${CURSEFORGE_API_URL}/mods/${args.modId}/files?${params.toString()}`;
      return cachedFetchJson(url);
    },
  );

  ipcMain.handle("curseforge:getFile", async (_e, args: { fileId: number }) => {
    const url = `${CURSEFORGE_API_URL}/files/${args.fileId}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": __CURSEFORGE_API_KEY__,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CurseForge getFile failed: ${res.status} ${text}`);
    }
    return res.json();
  });

  ipcMain.handle(
    "curseforge:getModDescription",
    async (_e, args: { modId: number }) => {
      const url = `${CURSEFORGE_API_URL}/mods/${args.modId}/description`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "x-api-key": __CURSEFORGE_API_KEY__,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `CurseForge getModDescription failed: ${res.status} ${text}`,
        );
      }
      return res.json();
    },
  );

  // Search mods with filters + pagination (cached)
  ipcMain.handle(
    "curseforge:searchMods",
    async (
      _event,
      args: {
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
      },
    ) => {
      const params = new URLSearchParams();
      params.set("gameId", String(args?.gameId ?? 432));
      if (args?.classId != null) params.set("classId", String(args.classId));
      if (args?.categoryId != null)
        params.set("categoryId", String(args.categoryId));
      if (args?.gameVersion) params.set("gameVersion", args.gameVersion);
      if (args?.modLoaderType != null)
        params.set("modLoaderType", String(args.modLoaderType));
      if (args?.searchFilter) params.set("searchFilter", args.searchFilter);
      if (args?.sortField) params.set("sortField", String(args.sortField));
      if (args?.sortOrder) params.set("sortOrder", String(args.sortOrder));
      if (args?.pageSize != null) params.set("pageSize", String(args.pageSize));
      if (args?.index != null) params.set("index", String(args.index));

      const url = `${CURSEFORGE_API_URL}/mods/search?${params.toString()}`;
      return cachedFetchJson(url);
    },
  );
  console.log("[ipc] CurseForge IPC handlers registered");
}
