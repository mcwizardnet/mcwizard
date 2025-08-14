import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DownloadIcon from "@mui/icons-material/Download";

interface ModFilesProps {
  modId: number;
}

const SUPPORTED = ["1.21", "1.20.1", "1.19.2"];

export default function ModFiles({ modId }: ModFilesProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"date" | "version">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const [installedFiles, setInstalledFiles] = useState<Set<number>>(new Set());
  const [progressByFileId, setProgressByFileId] = useState<Map<number, number>>(
    new Map(),
  );

  const UI_PAGE_SIZE = 20;
  const API_PAGE_SIZE = 50;

  // Extract all Minecraft version strings from robust file fields
  const extractVersionStrings = (f: any): string[] => {
    const collected = new Set<string>();
    if (Array.isArray(f?.sortableGameVersion)) {
      for (const v of f.sortableGameVersion) {
        const name = String(v?.gameVersionName || "");
        const gv = String(v?.gameVersion || "");
        if (/^\d+\.\d+(?:\.\d+)?/.test(name)) collected.add(name);
        if (/^\d+\.\d+(?:\.\d+)?/.test(gv)) collected.add(gv);
      }
    }
    if (Array.isArray(f?.gameVersion)) {
      for (const s of f.gameVersion) {
        const str = String(s || "");
        if (/^\d+\.\d+(?:\.\d+)?/.test(str)) collected.add(str);
      }
    }
    if (Array.isArray(f?.gameVersions)) {
      for (const s of f.gameVersions) {
        const str = String(s || "");
        if (/^\d+\.\d+(?:\.\d+)?/.test(str)) collected.add(str);
      }
    }
    return Array.from(collected);
  };

  const matchesAnyMajor = (f: any, majors: string[]): boolean => {
    const versions = extractVersionStrings(f);
    if (versions.length === 0) return false;
    return majors.some((maj) =>
      versions.some((v) => v === maj || v.startsWith(maj)),
    );
  };

  // Clear cache when the mod changes
  useEffect(() => {
    cacheRef.current.clear();
  }, [modId]);

  // Load installed store and subscribe to updates
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const store = await window.api.getInstalledMods();
        const ids = new Set<number>(
          store.entries.map((e: any) => Number(e.fileId)),
        );
        if (mounted) setInstalledFiles(ids);
      } catch {
        // ignore
      }
    })();
    const unsub = window.api.onInstalledStoreUpdated?.((data: any) => {
      const ids = new Set<number>(
        (data?.entries || []).map((e: any) => Number(e.fileId)),
      );
      setInstalledFiles(ids);
    });
    // Subscribe to download progress/complete/failed
    const offProgress = window.api.onDownloadProgress?.((data: any) => {
      if (typeof data?.fileId === "number") {
        setProgressByFileId((prev) => {
          const next = new Map(prev);
          next.set(Number(data.fileId), Number(data.percent ?? 0));
          return next;
        });
      }
    });
    const offComplete = window.api.onDownloadComplete?.((data: any) => {
      if (typeof data?.fileId === "number") {
        setProgressByFileId((prev) => {
          const next = new Map(prev);
          next.delete(Number(data.fileId));
          return next;
        });
      }
    });
    const offFailed = window.api.onDownloadFailed?.((data: any) => {
      setProgressByFileId((prev) => {
        const next = new Map(prev);
        if (typeof data?.fileId === "number") {
          next.delete(Number(data.fileId));
        } else {
          // Fallback: clear all to avoid indefinite spinners
          next.clear();
        }
        return next;
      });
    });
    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
      if (typeof offProgress === "function") offProgress();
      if (typeof offComplete === "function") offComplete();
      if (typeof offFailed === "function") offFailed();
    };
  }, []);

  // Helper sorting
  const sortFiles = (list: any[]) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortKey === "date") {
      return list.sort(
        (a, b) =>
          mul *
          (new Date(a.fileDate).getTime() - new Date(b.fileDate).getTime()),
      );
    }
    const parseVer = (s: string): number[] => {
      const m = String(s || "").match(
        /(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?/,
      );
      if (!m) return [0];
      return [1, 2, 3, 4].map((i) => parseInt(m[i] || "0", 10));
    };
    return list.sort((a, b) => {
      const av = parseVer(a.fileName);
      const bv = parseVer(b.fileName);
      for (let i = 0; i < Math.max(av.length, bv.length); i++) {
        const d = (av[i] || 0) - (bv[i] || 0);
        if (d !== 0) return mul * d;
      }
      return (
        mul * (new Date(a.fileDate).getTime() - new Date(b.fileDate).getTime())
      );
    });
  };

  // Load with batching and in-memory cache
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const cacheKey = version === "all" ? "all" : `v:${version}`;
        let allFiles: any[] | undefined = cacheRef.current.get(cacheKey);

        async function fetchAllPagesForVersion(v: string): Promise<any[]> {
          const first = (await window.api.getCurseForgeModFiles(modId, {
            pageSize: API_PAGE_SIZE,
            index: 0,
            gameVersion: v,
            modLoaderType: 1,
          })) as any;
          const firstData: any[] = (first?.data as any[]) || [];
          const totalCount: number =
            first?.pagination?.totalCount ?? firstData.length;
          const pages = Math.ceil(totalCount / API_PAGE_SIZE);
          let acc = [...firstData];
          for (let p = 1; p < pages; p++) {
            const res = (await window.api.getCurseForgeModFiles(modId, {
              pageSize: API_PAGE_SIZE,
              index: p * API_PAGE_SIZE,
              gameVersion: v,
              modLoaderType: 1,
            })) as any;
            const data: any[] = (res?.data as any[]) || [];
            acc = acc.concat(data);
          }
          return acc;
        }

        if (!allFiles) {
          if (version === "all") {
            let agg: any[] = [];
            for (const v of SUPPORTED) {
              const data = await fetchAllPagesForVersion(v);
              agg = agg.concat(data);
            }
            const filtered = agg.filter((f) => matchesAnyMajor(f, SUPPORTED));
            const byId = new Map<number, any>();
            for (const it of filtered) byId.set(it.id, it);
            allFiles = Array.from(byId.values());
          } else {
            allFiles = await fetchAllPagesForVersion(version);
            allFiles = allFiles.filter((f) => matchesAnyMajor(f, [version]));
          }
          cacheRef.current.set(cacheKey, allFiles);
        }

        const sorted = sortFiles([...allFiles!]);
        const start = (page - 1) * UI_PAGE_SIZE;
        const pageItems = sorted.slice(start, start + UI_PAGE_SIZE);
        if (mounted) {
          setFiles(pageItems);
          setTotal(sorted.length);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load files");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [modId, page, version, sortKey, sortDir]);

  // Helpers for UI chips
  const formatBytes = (bytes?: number): string => {
    const b = typeof bytes === "number" ? bytes : 0;
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
  };

  const getForgeVersion = (f: any): string | undefined => {
    if (Array.isArray(f?.sortableGameVersion)) {
      for (const v of f.sortableGameVersion) {
        if (String(v?.gameVersionName).toLowerCase() === "forge") {
          // Try to parse from filename when available
          const base = String(f?.fileName || "");
          const m = base.match(/forge[-_]?([0-9A-Za-z+_.-]+)/i);
          if (m) return m[1];
          return "Forge";
        }
      }
    }
    return undefined;
  };

  const getMcVersion = (f: any): string | undefined => {
    const versions = extractVersionStrings(f);
    // Prefer the longest numeric version
    let best: string | undefined;
    for (const v of versions) {
      if (!best) best = v;
      else if (v.length > best.length) best = v;
    }
    return best;
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="files-mc">MC Version</InputLabel>
          <Select
            labelId="files-mc"
            label="MC Version"
            value={version}
            onChange={(e) => {
              setPage(1);
              setVersion(e.target.value as string);
            }}>
            <MenuItem value="all">All</MenuItem>
            {SUPPORTED.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="files-sort">Sort By</InputLabel>
          <Select
            labelId="files-sort"
            label="Sort By"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}>
            <MenuItem value="date">Release Date</MenuItem>
            <MenuItem value="version">Version</MenuItem>
          </Select>
        </FormControl>
        <IconButton
          aria-label="toggle sort direction"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
          {sortDir === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
      {!loading && files.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No files found.
        </Typography>
      )}
      {!loading && files.length > 0 && (
        <Stack spacing={1}>
          {files.map((f) => {
            const sizeChip = (
              <Chip size="small" label={formatBytes(f.fileLength)} />
            );

            const forgeVer = getForgeVersion(f);
            const mcVer = getMcVersion(f);
            const forgeChip = forgeVer ? (
              <Chip
                size="small"
                variant="outlined"
                label={`Forge ${forgeVer}`}
              />
            ) : null;
            const mcChip = mcVer ? (
              <Chip size="small" variant="outlined" label={`MC ${mcVer}`} />
            ) : null;
            return (
              <Stack
                key={f.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}>
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {f.fileName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    alignItems: "center",
                    flexWrap: "nowrap",
                  }}>
                  {forgeChip}
                  {sizeChip}
                  {mcChip}
                </Box>
                {installedFiles.has(Number(f.id)) && (
                  <IconButton
                    size="small"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                    }}
                    onClick={() =>
                      window.api
                        .revealDownloadedFile({ fileId: Number(f.id) })
                        .catch(console.error)
                    }>
                    <FolderOpenIcon fontSize="small" />
                  </IconButton>
                )}
                {!installedFiles.has(Number(f.id)) && (
                  <IconButton
                    aria-label="download"
                    size="small"
                    disabled={progressByFileId.has(Number(f.id))}
                    onClick={() => {
                      setProgressByFileId((prev) => {
                        const next = new Map(prev);
                        next.set(Number(f.id), 0);
                        return next;
                      });
                      window.api
                        .startDownloadByFileId(Number(modId), Number(f.id))
                        .catch((err) => {
                          console.error(err);
                          setProgressByFileId((prev) => {
                            const next = new Map(prev);
                            next.delete(Number(f.id));
                            return next;
                          });
                        });
                    }}>
                    {progressByFileId.has(Number(f.id)) ? (
                      <CircularProgress size={18} thickness={5} />
                    ) : (
                      <DownloadIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Pagination
          showFirstButton
          showLastButton
          count={Math.max(1, Math.ceil(total / UI_PAGE_SIZE))}
          page={page}
          onChange={(_e, v) => setPage(v)}
          color="primary"
        />
      </Box>
    </Stack>
  );
}
