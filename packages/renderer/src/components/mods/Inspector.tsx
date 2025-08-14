import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  LinearProgress,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
// Keep Inspector minimal: only operate on installed files for the current mod
import { fetchSupportedForgeFiles } from "@/state/files";

interface InspectorProps {
  onScan: () => void;
  javaInfo?: { ok: boolean; version?: string } | null;
  modExternalId?: number;
  modName?: string;
}

export default function Inspector({
  onScan,
  javaInfo,
  modExternalId,
}: InspectorProps) {
  const [selectedJar, setSelectedJar] = useState<string>("");
  const [installed, setInstalled] = useState<
    {
      modExternalId: number;
      fileId: number;
      filename: string;
      path: string;
      installedAt?: number;
    }[]
  >([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{
    phase: string;
    message?: string;
    percent?: number;
  } | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [fileNames, setFileNames] = useState<Map<number, string>>(new Map());
  const [available, setAvailable] = useState<any[]>([]);
  const [previews, setPreviews] = useState<
    { id: string; displayName: string; dataUri?: string; filePath?: string }[]
  >([]);
  const [allTextures, setAllTextures] = useState<
    { id: string; displayName: string; dataUri?: string; filePath?: string }[]
  >([]);
  const [logs, setLogs] = useState<{ id: number; ts: number; text: string }[]>(
    [],
  );
  const logIdRef = useRef(0);

  const appendLog = (text: string) => {
    const ts = Date.now();
    setLogs((prev) => {
      const id = ++logIdRef.current;
      const next = [...prev, { id, ts, text }];
      // keep last 500 entries max
      if (next.length > 500) return next.slice(next.length - 500);
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const store = await window.api.getInstalledMods();
        const mapped = (store.entries || [])
          .map((e: any) => ({
            modExternalId: Number(e.modExternalId),
            fileId: Number(e.fileId),
            filename: String(e.filename || ""),
            path: String(e.path || ""),
            installedAt: Number(e.installedAt || 0),
          }))
          .filter(
            (e: any) =>
              !modExternalId || e.modExternalId === Number(modExternalId),
          )
          .sort(
            (a: any, b: any) => (b.installedAt || 0) - (a.installedAt || 0),
          );
        setInstalled(mapped);
        if (!selectedJar && mapped[0]?.path) setSelectedJar(mapped[0].path);
      } catch {}
    })();
    const off = window.api.onInstalledStoreUpdated?.((data: any) => {
      const mapped = (data.entries || [])
        .map((e: any) => ({
          modExternalId: Number(e.modExternalId),
          fileId: Number(e.fileId),
          filename: String(e.filename || ""),
          path: String(e.path || ""),
          installedAt: Number(e.installedAt || 0),
        }))
        .filter(
          (e: any) =>
            !modExternalId || e.modExternalId === Number(modExternalId),
        )
        .sort((a: any, b: any) => (b.installedAt || 0) - (a.installedAt || 0));
      setInstalled(mapped);
      if (!selectedJar && mapped[0]?.path) setSelectedJar(mapped[0].path);
    });
    return () => {
      off && off();
    };
  }, [selectedJar, modExternalId]);

  // Enrich labels with actual CurseForge fileName when our stored filename
  // is a generic placeholder like "mod-<id>-file-<id>.jar"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending: number[] = [];
      for (const e of installed) {
        if (!fileNames.has(e.fileId)) {
          const current = String(e.filename || "");
          const looksGeneric = /mod-\d+-file-\d+\.jar$/i.test(current);
          if (looksGeneric) pending.push(e.fileId);
        }
      }
      if (pending.length === 0) return;

      await Promise.all(
        pending.map(async (id) => {
          // Try direct file lookup first
          try {
            const res = await window.api.getCurseForgeFile(id);
            const name = String((res as any)?.data?.fileName || "");
            if (!cancelled && name) {
              setFileNames((prev) => {
                const next = new Map(prev);
                next.set(id, name);
                return next;
              });
              return;
            }
          } catch {}

          // Fallback: search current mod's files if modExternalId available
          try {
            if (!modExternalId) return;
            const list = await window.api.getCurseForgeModFiles(modExternalId, {
              pageSize: 100,
              index: 0,
            });
            const arr = (((list as any)?.data as any[]) || []) as any[];
            const hit = arr.find((f) => Number(f.id) === Number(id));
            const alt = String(hit?.fileName || "");
            if (!cancelled && alt) {
              setFileNames((prev) => {
                const next = new Map(prev);
                next.set(id, alt);
                return next;
              });
            }
          } catch {}
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [installed, modExternalId]);

  // Load available Forge files for this mod (batched and filtered to supported majors)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!modExternalId) return;
      try {
        const files = await fetchSupportedForgeFiles(modExternalId);
        if (!cancelled) setAvailable(files);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [modExternalId]);

  // Subscribe to scanner progress
  useEffect(() => {
    const off = window.api.onScannerProgress?.((u: any) => {
      setProgress({
        phase: String(u?.phase || ""),
        message: String(u?.message || ""),
        percent: typeof u?.percent === "number" ? u.percent : undefined,
      });
      const msg = [u?.phase, u?.message].filter(Boolean).join(" - ");
      if (msg)
        appendLog(
          `[scan] ${msg}${typeof u?.percent === "number" ? ` (${u.percent}%)` : ""}`,
        );
    });
    return () => {
      off && off();
    };
  }, []);

  // Global download logging for better visibility
  useEffect(() => {
    const offP = window.api.onDownloadProgress?.((p: any) => {
      const pct = Math.round((p?.percent || 0) * 100);
      appendLog(`[download] fileId=${p?.fileId ?? "?"} ${pct}%`);
    });
    const offC = window.api.onDownloadComplete?.((d: any) => {
      appendLog(
        `[download] complete fileId=${d?.fileId} path=${d?.path || ""}`,
      );
    });
    const offF = window.api.onDownloadFailed?.((d: any) => {
      appendLog(
        `[download] failed fileId=${d?.fileId ?? "?"} state=${d?.state ?? "unknown"}`,
      );
    });
    return () => {
      offP && offP();
      offC && offC();
      offF && offF();
    };
  }, []);

  const labeledInstalled = useMemo(() => {
    return installed.map((e) => ({
      ...e,
      label:
        fileNames.get(e.fileId) ||
        e.filename ||
        e.path.split("/").pop() ||
        `mod-${e.modExternalId}-file-${e.fileId}.jar`,
    }));
  }, [installed, fileNames]);

  const installedIds = useMemo(() => {
    const s = new Set<number>();
    for (const e of installed) s.add(Number(e.fileId));
    return s;
  }, [installed]);

  const labeledAvailable = useMemo(() => {
    return available
      .filter((f: any) => !installedIds.has(Number(f.id)))
      .map((f: any) => ({
        id: Number(f.id),
        label: String(f.fileName || f.displayName || f.id),
      }));
  }, [available, installedIds]);

  // Avoid out-of-range Select value when available option disappears after install
  const selectValue = useMemo(() => {
    if (!selectedJar) return "";
    if (!selectedJar.startsWith("__fileId__:")) return selectedJar;
    const id = Number(selectedJar.split(":")[1]);
    const inst = installed.find((e) => Number(e.fileId) === id);
    if (inst) return inst.path;
    const stillAvailable = labeledAvailable.some((f) => Number(f.id) === id);
    return stillAvailable ? selectedJar : "";
  }, [selectedJar, installed, labeledAvailable]);

  const isSelectedInstalled = useMemo(() => {
    return installed.some((e) => e.path === selectedJar);
  }, [installed, selectedJar]);

  return (
    <Stack spacing={2}>
      <FormControl size="small" sx={{ minWidth: 280 }}>
        <InputLabel id="jar-select">Mod File</InputLabel>
        <Select
          labelId="jar-select"
          label="Mod File"
          value={selectValue}
          onChange={(e) => setSelectedJar(e.target.value)}>
          {labeledInstalled.length > 0 && (
            <MenuItem disabled value="__installed_header__">
              Installed
            </MenuItem>
          )}
          {labeledInstalled.map((e) => (
            <MenuItem key={`i:${e.modExternalId}:${e.fileId}`} value={e.path}>
              {e.label}
            </MenuItem>
          ))}
          {labeledAvailable.length > 0 && (
            <MenuItem disabled value="__available_header__">
              Available (not installed)
            </MenuItem>
          )}
          {labeledAvailable.map((f) => (
            <MenuItem key={`a:${f.id}`} value={`__fileId__:${f.id}`}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        disabled={!selectedJar || scanning}
        onClick={async () => {
          if (!selectedJar) return;
          try {
            setScanning(true);
            setProgress({
              phase: "start",
              message: selectedJar.startsWith("__fileId__:")
                ? "Preparing download…"
                : "Starting scan…",
              percent: 1,
            });
            appendLog(
              selectedJar.startsWith("__fileId__:")
                ? `[action] Download & Scan fileId=${Number(
                    selectedJar.split(":")[1],
                  )}`
                : `[action] Scan path=${selectedJar}`,
            );
            let target = selectedJar;
            if (selectedJar.startsWith("__fileId__:")) {
              const id = Number(selectedJar.split(":")[1]);
              const modId = Number(modExternalId);
              // Download then scan
              await new Promise<void>((resolve, reject) => {
                const offC = window.api.onDownloadComplete?.((d: any) => {
                  if (Number(d.fileId) === id) {
                    target = String(d.path || "");
                    offC && offC();
                    offF && offF();
                    offP && offP();
                    appendLog(
                      `[download] complete fileId=${id} path=${target}`,
                    );
                    resolve();
                  }
                });
                const offF = window.api.onDownloadFailed?.((d: any) => {
                  if (Number(d.fileId) === id) {
                    offC && offC();
                    offF && offF();
                    offP && offP();
                    reject(new Error("Download failed"));
                  }
                });
                const offP = window.api.onDownloadProgress?.((p: any) => {
                  if (Number(p.fileId) === id) {
                    setProgress({
                      phase: "download",
                      message: `Downloading… ${Math.round((p.percent || 0) * 100)}%`,
                      percent: Math.max(
                        1,
                        Math.min(20, Math.round((p.percent || 0) * 20)),
                      ),
                    });
                  }
                });
                appendLog(`[download] start fileId=${id} modId=${modId}`);
                window.api.startDownloadByFileId(modId, id).catch(reject);
              });
            }
            setProgress({
              phase: "invoke",
              message: "Scanning archive…",
              percent: 20,
            });
            appendLog(`[scan] start path=${target}`);
            const res = await window.api.staticScanJar(target);
            setScanResult(res?.data ?? null);
            const p = (res as any)?.data?.previews?.items || [];
            const a = (res as any)?.data?.previews?.assets || [];
            setPreviews(p);
            setAllTextures(a);
            appendLog(`[scan] done items=${p.length} textures=${a.length}`);
            if (!selectedJar || selectedJar.startsWith("__fileId__:")) {
              setSelectedJar(target);
            }
          } catch (err) {
            setScanResult({ error: String((err as any)?.message || err) });
            appendLog(`[error] ${String((err as any)?.message || err)}`);
          } finally {
            setScanning(false);
            setTimeout(() => setProgress(null), 1500);
          }
        }}>
        {selectedJar.startsWith("__fileId__:")
          ? scanning
            ? "Downloading…"
            : "Download & Scan"
          : isSelectedInstalled
            ? scanning
              ? "Scanning…"
              : "Scan"
            : scanning
              ? "Downloading…"
              : "Download & Scan"}
      </Button>

      {progress && (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {progress.message || progress.phase}
          </Typography>
          {typeof progress.percent === "number" ? (
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, progress.percent))}
            />
          ) : (
            <LinearProgress />
          )}
        </Stack>
      )}

      {logs.length > 0 && <ActivityLog logs={logs} />}

      {javaInfo && (
        <Typography
          variant="body2"
          color={javaInfo.ok ? "text.secondary" : "error"}>
          {javaInfo.ok
            ? `Java detected: ${javaInfo.version ?? "unknown version"}`
            : "Java not detected"}
        </Typography>
      )}

      {scanResult && (
        <div
          style={{
            maxHeight: "40vh",
            overflowY: "auto",
            border: "1px solid var(--mui-palette-divider)",
            borderRadius: 8,
            padding: 8,
          }}>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              margin: 0,
            }}>
            {JSON.stringify(scanResult, null, 2)}
          </pre>
        </div>
      )}

      {(previews.length > 0 || allTextures.length > 0) && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Assets preview</Typography>
          <div style={{ minHeight: "50vh" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 8,
              }}>
              {[...previews, ...allTextures].map((p) => (
                <AssetThumb
                  key={p.id + (p.filePath || p.dataUri || "")}
                  src={p.filePath || p.dataUri || ""}
                  label={p.displayName}
                />
              ))}
            </div>
          </div>
        </Stack>
      )}
    </Stack>
  );
}

function AssetThumb({ src, label }: { src: string; label: string }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: 88,
          height: 88,
          background: "#1e1e1e",
          borderRadius: 6,
          margin: "0 auto",
        }}>
        <img
          src={src}
          alt={label}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onLoad={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el && el.naturalWidth && el.naturalHeight) {
              setDims({ w: el.naturalWidth, h: el.naturalHeight });
            }
          }}
        />
        {dims && (
          <div
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              borderRadius: 4,
              padding: "0 4px",
              fontSize: 10,
              lineHeight: "16px",
            }}>
            {dims.w}x{dims.h}
          </div>
        )}
      </div>
      <Typography
        variant="caption"
        title={label}
        style={{
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
        {label}
      </Typography>
    </div>
  );
}

function ActivityLog({
  logs,
}: {
  logs: { id: number; ts: number; text: string }[];
}) {
  const containerRef = useState<HTMLDivElement | null>(null)[0] as any;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [logs, container]);
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Activity</Typography>
      <div
        ref={setContainer as any}
        style={{
          maxHeight: 200,
          overflowY: "auto",
          border: "1px solid var(--mui-palette-divider)",
          borderRadius: 8,
          padding: 8,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          background: "#0f0f0f",
        }}>
        {logs.map((l) => (
          <div key={l.id}>{l.text}</div>
        ))}
      </div>
    </Stack>
  );
}
