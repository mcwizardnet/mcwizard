import { useEffect, useMemo, useRef, useState } from "react";
import type { Mod } from "@/types/domain";
import type { CurseForgeMod } from "@/types/external";
import CollectionLayout from "@/layouts/CollectionLayout";
import ModCard, { ModCardSkeleton } from "@/components/mods/ModCard";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
} from "@mui/material";
// @ts-ignore - use untyped import for fuse.js
import Fuse from "fuse.js";

function extractLoaders(mod: CurseForgeMod): string[] | undefined {
  // Best-effort: look through latest files' sortableGameVersion for loaders
  const loaderNames = new Set<string>();
  for (const idx of mod.latestFilesIndexes ?? []) {
    // Not directly available; keep placeholder for future enrichment
    // loaderNames.add('Forge') ...
  }
  return loaderNames.size ? Array.from(loaderNames) : undefined;
}

function mapCurseForgeModToDomain(mod: CurseForgeMod): Mod {
  return {
    id: String(mod.id),
    name: mod.name,
    photoUrl: mod.logo?.url ?? mod.logo?.thumbnailUrl,
    description: mod.summary,
    createdAt: mod.dateCreated,
    updatedAt: mod.dateModified,
    version: mod.latestFilesIndexes?.[0]?.filename ?? "",
    tags: mod.categories?.map((c) => c.name) ?? [],
    mcVersions: mod.latestFilesIndexes?.map((i) => i.gameVersion) ?? [],
    loaders: extractLoaders(mod),
    downloadCount: mod.downloadCount,
    thumbsUpCount: undefined,
    rating: mod.rating,
    websiteUrl: mod.link?.websiteURL,
    source: "curseforge",
    externalId: mod.id,
    mainFileId: mod.mainFileId,
    isInstalled: false,
  };
}

export default function Mods() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [installedMap, setInstalledMap] = useState<
    Map<number, { fileId: number; path: string }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [version, setVersion] = useState<string>("1.19.2");
  const [query, setQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [sort, setSort] = useState<
    "rating" | "totalDownloads" | "popularity" | "lastUpdated"
  >("totalDownloads");
  const debounceRef = useRef<number | null>(null);
  const [isServerSearching, setIsServerSearching] = useState(false);
  const [downloadPercents, setDownloadPercents] = useState<Map<number, number>>(
    new Map(),
  );

  // Debounce networked full-text search (while keeping instant fuzzy client search)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setQuery(searchInput.trim());
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset to first page when major filters change
  useEffect(() => {
    setPage(1);
  }, [version, sort, query]);

  // Load installed store once (with retry) and subscribe to download completion
  useEffect(() => {
    let mounted = true;
    (async () => {
      let attempt = 0;
      while (mounted && attempt < 8) {
        try {
          const store = await window.api.getInstalledMods();
          if (!mounted) return;
          const map = new Map<number, { fileId: number; path: string }>();
          for (const e of store.entries) {
            map.set(e.modExternalId, { fileId: e.fileId, path: e.path });
          }
          setInstalledMap(map);
          break;
        } catch (err) {
          attempt += 1;
          await new Promise((r) =>
            setTimeout(r, Math.min(1500, 150 * attempt)),
          );
        }
      }
    })();
    const offProg = window.api.onDownloadProgress?.(
      ({ modExternalId, percent }) => {
        if (typeof modExternalId === "number") {
          setDownloadPercents((prev) => {
            const m = new Map(prev);
            m.set(modExternalId, percent);
            return m;
          });
        }
      },
    );
    const offComp = window.api.onDownloadComplete?.(
      ({ modExternalId, fileId, path }) => {
        setInstalledMap((prev) =>
          new Map(prev).set(modExternalId, { fileId, path }),
        );
        setDownloadPercents((prev) => {
          const m = new Map(prev);
          m.delete(modExternalId);
          return m;
        });
      },
    );
    const offStore = window.api.onInstalledStoreUpdated?.((data) => {
      const map = new Map<number, { fileId: number; path: string }>();
      for (const e of data.entries) {
        map.set(e.modExternalId, { fileId: e.fileId, path: e.path });
      }
      setInstalledMap(map);
    });
    return () => {
      mounted = false;
      offProg && offProg();
      offComp && offComp();
      offStore && offStore();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsServerSearching(true);
        const index = (page - 1) * pageSize;
        const res = await window.api.searchMods({
          gameId: 432,
          gameVersion: version || undefined,
          searchFilter: query || undefined,
          sortField: sort,
          sortOrder: "desc",
          pageSize,
          index,
        });
        const data = (res as any).data as CurseForgeMod[];
        const mapped = data.map(mapCurseForgeModToDomain).map((m) => ({
          ...m,
          isInstalled: installedMap.has(Number(m.externalId ?? m.id)),
        }));
        if (isMounted) {
          setMods(mapped);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? "Failed to load mods");
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsServerSearching(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize, version, sort, query]);

  const uniqMods = useMemo(() => {
    const seen = new Set<string>();
    const out: Mod[] = [];
    for (const m of mods) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [mods]);

  const fuse = useMemo(() => {
    return new Fuse(uniqMods, {
      includeScore: false,
      threshold: 0.33,
      ignoreLocation: true,
      keys: [
        { name: "name", weight: 0.6 },
        { name: "description", weight: 0.4 },
        { name: "tags", weight: 0.2 },
      ],
    });
  }, [uniqMods]);

  const filteredMods = useMemo(() => {
    const q = searchInput.trim();
    if (!q) return uniqMods;
    return fuse.search(q).map((r: any) => r.item as Mod);
  }, [fuse, searchInput, uniqMods]);

  if (error) {
    console.error(error);
  }

  const header = (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}>
        <TextField
          size="small"
          label="Search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-by">Sort By</InputLabel>
          <Select
            labelId="sort-by"
            label="Sort By"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}>
            <MenuItem value="rating">Top Rated</MenuItem>
            <MenuItem value="totalDownloads">Most Downloaded</MenuItem>
            <MenuItem value="popularity">Popularity</MenuItem>
            <MenuItem value="lastUpdated">Recently Updated</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="mc-ver">MC Version</InputLabel>
          <Select
            labelId="mc-ver"
            label="MC Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="1.21">1.21</MenuItem>
            <MenuItem value="1.20.1">1.20.1</MenuItem>
            <MenuItem value="1.19.2">1.19.2</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );

  return (
    <>
      <CollectionLayout
        type="mods"
        items={
          isServerSearching
            ? Array.from({ length: 12 }).map(
                (_, i) => ({ id: String(i) }) as any,
              )
            : filteredMods
        }
        renderItem={(m) =>
          isServerSearching ? (
            <ModCardSkeleton />
          ) : (
            <ModCard
              mod={{
                ...(m as Mod),
                isInstalled: installedMap.has(
                  Number((m as any).externalId ?? (m as any).id),
                ),
              }}
              downloadPercent={downloadPercents.get(
                Number((m as any).externalId ?? (m as any).id),
              )}
            />
          )
        }
        hideSearch
        header={header}
      />
      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <Pagination
          page={page}
          onChange={(_e, v) => setPage(v)}
          count={50}
          color="primary"
        />
      </Box>
    </>
  );
}
