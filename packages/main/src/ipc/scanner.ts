import { app, ipcMain } from "electron";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

function execFileAsync(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        maxBuffer: 256 * 1024 * 1024, // accommodate large base64 on Windows
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
      },
    );
  });
}

function execFileBufferAsync(cmd: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        encoding: "buffer",
        maxBuffer: 200 * 1024 * 1024, // allow large texture/base64 payloads
        windowsHide: true,
      },
      (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout as unknown as Buffer);
      },
    );
  });
}

// Cross-platform ZIP helpers
function hasFile(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function escapePsString(s: string): string {
  return s.replace(/'/g, "''");
}

async function listZipEntriesPortable(zipPath: string): Promise<string[]> {
  try {
    if (process.platform === "win32") {
      const ps = `Add-Type -A 'System.IO.Compression.FileSystem'; $z=[IO.Compression.ZipFile]::OpenRead('${escapePsString(zipPath)}'); $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose();`;
      const { stdout } = await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        ps,
      ]);
      return stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const unzipCmd = hasFile("/usr/bin/unzip") ? "/usr/bin/unzip" : "unzip";
    const { stdout } = await execFileAsync(unzipCmd, ["-Z1", zipPath]);
    return stdout.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    // Fallback to jar tool if available
    try {
      const { stdout } = await execFileAsync("jar", ["tf", zipPath]);
      return stdout.split(/\r?\n/).filter(Boolean);
    } catch {}
    throw e;
  }
}

async function readZipEntryPortable(
  zipPath: string,
  entryPath: string,
): Promise<Buffer> {
  if (process.platform === "win32") {
    const ps = `Add-Type -A 'System.IO.Compression.FileSystem'; $z=[IO.Compression.ZipFile]::OpenRead('${escapePsString(zipPath)}'); $e=$z.Entries | Where-Object { $_.FullName -eq '${escapePsString(entryPath)}' }; if ($e -ne $null) { $ms = New-Object System.IO.MemoryStream; $s=$e.Open(); $s.CopyTo($ms); $s.Close(); $bytes=$ms.ToArray(); $b64=[Convert]::ToBase64String($bytes); [Console]::Out.Write($b64) } $z.Dispose();`;
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ps,
    ]);
    const base64 = String(stdout || "").trim();
    if (!base64) throw new Error("entry-not-found");
    return Buffer.from(base64, "base64");
  }
  const unzipCmd = hasFile("/usr/bin/unzip") ? "/usr/bin/unzip" : "unzip";
  return await execFileBufferAsync(unzipCmd, ["-p", zipPath, entryPath]);
}

export function registerScannerIPC() {
  ipcMain.handle("scanner:staticScanJar", async (e, args: { path: string }) => {
    const jarPath = String(args?.path || "").trim();
    if (!jarPath) throw new Error("No JAR path provided");

    try {
      const sendProgress = (update: {
        phase: string;
        message?: string;
        percent?: number;
        details?: Record<string, unknown>;
      }) => {
        try {
          e?.sender?.send?.("scanner:progress", update);
        } catch {}
      };

      sendProgress({
        phase: "enumerate",
        message: "Enumerating archive…",
        percent: 5,
      });
      const tryEnumerate = async (): Promise<string[]> => {
        const backoffMs = [0, 150, 300, 600];
        let lastErr: any = null;
        for (const ms of backoffMs) {
          if (ms) await new Promise((r) => setTimeout(r, ms));
          try {
            return await listZipEntriesPortable(jarPath);
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr ?? new Error("enumeration-failed");
      };
      const entries = await tryEnumerate();
      sendProgress({
        phase: "enumerate",
        message: `Using ${process.platform === "win32" ? "PowerShell" : "unzip"} for listing`,
        percent: 16,
      });
      sendProgress({
        phase: "enumerate",
        message: `Found ${entries.length} entries`,
        percent: 15,
      });

      const namespaces = new Set<string>();
      for (const f of entries) {
        const m = f.match(/^assets\/([^/]+)\//);
        if (m) namespaces.add(m[1]);
      }

      // Collect core assets per namespace
      const result: any = {
        path: jarPath,
        namespaces: Array.from(namespaces),
        assets: {},
      };

      for (const ns of result.namespaces) {
        sendProgress({
          phase: "analyze",
          message: `Analyzing assets namespace: ${ns}`,
        });
        const langFiles = entries.filter(
          (e) => e.startsWith(`assets/${ns}/lang/`) && e.endsWith(".json"),
        );
        const blockstates = entries.filter(
          (e) =>
            e.startsWith(`assets/${ns}/blockstates/`) && e.endsWith(".json"),
        );
        const modelItems = entries.filter(
          (e) =>
            e.startsWith(`assets/${ns}/models/item/`) && e.endsWith(".json"),
        );
        const modelBlocks = entries.filter(
          (e) =>
            e.startsWith(`assets/${ns}/models/block/`) && e.endsWith(".json"),
        );
        const textures = entries.filter(
          (e) =>
            e.startsWith(`assets/${ns}/textures/`) &&
            /\.(png|jpe?g|webp)$/i.test(e),
        );

        // Read en_us.json if present to get display names
        let lang: Record<string, string> = {};
        const en =
          langFiles.find((f) => /en_us\.json$/.test(f)) || langFiles[0];
        if (en) {
          try {
            const buf = await readZipEntryPortable(jarPath, en);
            lang = JSON.parse(buf.toString("utf8"));
          } catch {}
        }

        result.assets[ns] = {
          langKeys: Object.keys(lang).length ? lang : undefined,
          blockstates,
          models: {
            item: modelItems,
            block: modelBlocks,
          },
          textures,
        };
      }

      // Produce a very simple catalog stub for UI
      const catalog = {
        namespaces: result.namespaces,
        items: [],
        blocks: [] as any[],
      } as any;
      for (const ns of result.namespaces) {
        const assets = result.assets[ns];
        const lang: Record<string, string> = assets.langKeys || {};
        for (const m of assets.models.item) {
          const id = `${ns}:${m
            .split("/")
            .pop()
            ?.replace(/\.json$/, "")}`;
          const key = `item.${id.replace(":", ".")}`;
          catalog.items.push({ id, displayName: lang[key] || id });
        }
        for (const b of assets.blockstates) {
          const id = `${ns}:${b
            .split("/")
            .pop()
            ?.replace(/\.json$/, "")}`;
          const key = `block.${id.replace(":", ".")}`;
          catalog.blocks.push({ id, displayName: lang[key] || id });
        }
      }

      // Build lightweight previews for item models by resolving layer0 texture
      const previews: {
        items: {
          id: string;
          displayName: string;
          texturePath: string;
          dataUri?: string;
          filePath?: string;
        }[];
        assets: {
          id: string;
          displayName: string;
          texturePath: string;
          dataUri?: string;
          filePath?: string;
        }[];
      } = {
        items: [],
        assets: [],
      };

      const previewDir = path.join(app.getPath("userData"), "previews");
      try {
        if (!fs.existsSync(previewDir))
          fs.mkdirSync(previewDir, { recursive: true });
      } catch {}

      const resolveTextureEntry = (
        all: string[],
        ns: string,
        texRef: string,
      ): string | null => {
        const hasNs = /.+:.+/.test(texRef);
        const refNs = hasNs ? texRef.split(":")[0] : ns;
        const refPath = hasNs ? texRef.split(":")[1] : texRef;
        const base = refPath.replace(/^\//, "");
        const candidates = [
          `assets/${refNs}/textures/${base}.png`,
          `assets/${refNs}/textures/${base}.jpg`,
          `assets/${refNs}/textures/${base}.jpeg`,
          `assets/${refNs}/textures/${base}.webp`,
          `assets/${refNs}/textures/${base}`,
        ];
        for (const cand of candidates) {
          const hit = all.find((e) => e.toLowerCase() === cand.toLowerCase());
          if (hit) return hit;
        }
        const name = base.split("/").pop() || base;
        const byName = all.find(
          (e) =>
            e
              .toLowerCase()
              .startsWith(`assets/${refNs}/textures/`.toLowerCase()) &&
            e
              .toLowerCase()
              .replace(/\.(png|jpe?g|webp)$/i, "")
              .endsWith(`/${name.toLowerCase()}`),
        );
        return byName || null;
      };

      // Lower the initial limits slightly to be more responsive on Windows
      const MAX_PREVIEWS = 48;
      const MAX_ASSETS = process.platform === "win32" ? 200 : 400;
      let processedModels = 0;
      let totalModels = 0;
      for (const ns of result.namespaces)
        totalModels += result.assets[ns].models.item.length;
      outer: for (const ns of result.namespaces) {
        const assets = result.assets[ns];
        const lang: Record<string, string> = assets.langKeys || {};
        for (const m of assets.models.item) {
          try {
            const modelBuf = await readZipEntryPortable(jarPath, m);
            const model = JSON.parse(modelBuf.toString("utf8"));
            const layer0: string | undefined =
              model?.textures?.layer0 || model?.textures?.particle;
            if (!layer0) continue;
            const texturePath = resolveTextureEntry(entries, ns, layer0);
            if (!texturePath) continue;
            const buf = await readZipEntryPortable(jarPath, texturePath);
            const id = `${ns}:${m
              .split("/")
              .pop()
              ?.replace(/\.json$/, "")}`;
            const key = `item.${id.replace(":", ".")}`;
            const displayName = lang[key] || id;
            // Write a cached preview file and return its path
            let filePath: string | undefined;
            try {
              const h = createHash("md5")
                .update(jarPath + "|" + texturePath)
                .digest("hex");
              const out = path.join(previewDir, `${h}.png`);
              if (!fs.existsSync(out)) fs.writeFileSync(out, buf);
              // Reference via our custom app protocol so renderer can load
              filePath = `app://previews/${path.basename(out)}`;
            } catch {}
            const dataUri = filePath
              ? undefined
              : `data:image/png;base64,${buf.toString("base64")}`;
            previews.items.push({
              id,
              displayName,
              texturePath,
              filePath,
              dataUri,
            });
            processedModels += 1;
            const pct = Math.min(
              60,
              20 +
                Math.round((processedModels / Math.max(1, totalModels)) * 40),
            );
            sendProgress({
              phase: "models",
              message: `Model previews: ${processedModels}/${totalModels}`,
              percent: pct,
            });
            if (previews.items.length >= MAX_PREVIEWS) break outer;
          } catch {}
        }
      }

      // Bulk convert all textures to generic assets previews (png/jpg)
      const seenAsset = new Set<string>();
      let processedAssets = 0;
      for (const ns of result.namespaces) {
        const assets = result.assets[ns];
        const lang: Record<string, string> = assets.langKeys || {};
        for (const texturePath of assets.textures) {
          if (previews.assets.length >= MAX_ASSETS) break;
          if (seenAsset.has(texturePath)) continue;
          seenAsset.add(texturePath);
          try {
            const buf = await readZipEntryPortable(jarPath, texturePath);
            const id = `${ns}:${texturePath
              .split("/")
              .pop()
              ?.replace(/\.(png|jpe?g|webp)$/i, "")}`;
            const key = id.includes(":") ? id.replace(":", ".") : id;
            const displayName = lang[key] || id;
            let filePath: string | undefined;
            try {
              const h = createHash("md5")
                .update(jarPath + "|" + texturePath)
                .digest("hex");
              const out = path.join(previewDir, `${h}.png`);
              if (!fs.existsSync(out)) fs.writeFileSync(out, buf);
              filePath = `app://previews/${path.basename(out)}`;
            } catch {}
            const dataUri = filePath
              ? undefined
              : `data:image/png;base64,${buf.toString("base64")}`;
            previews.assets.push({
              id,
              displayName,
              texturePath,
              filePath,
              dataUri,
            });
            processedAssets += 1;
            const pct = Math.min(
              95,
              60 + Math.round((processedAssets / Math.max(1, MAX_ASSETS)) * 35),
            );
            if (processedAssets % 10 === 0) {
              sendProgress({
                phase: "assets",
                message: `Texture previews: ${processedAssets}/${Math.min(MAX_ASSETS, assets.textures.length)}`,
                percent: pct,
              });
            }
          } catch {}
        }
      }

      // Fallback: if nothing previewable detected, attempt generic texture preview across entire archive
      if (previews.items.length === 0 && previews.assets.length === 0) {
        try {
          sendProgress({
            phase: "fallback",
            message:
              "No assets detected in standard paths; scanning for common textures…",
            percent: 96,
          });
          const generic = entries.filter((e) => /\.(png|jpe?g|webp)$/i.test(e));
          const limit = Math.min(MAX_ASSETS, generic.length);
          for (let i = 0; i < limit; i++) {
            const texturePath = generic[i];
            try {
              const buf = await readZipEntryPortable(jarPath, texturePath);
              const base = texturePath.split("/").pop() || texturePath;
              const id = base.replace(/\.(png|jpe?g|webp)$/i, "");
              let filePath: string | undefined;
              try {
                const h = createHash("md5")
                  .update(jarPath + "|" + texturePath)
                  .digest("hex");
                const out = path.join(previewDir, `${h}.png`);
                if (!fs.existsSync(out)) fs.writeFileSync(out, buf);
                filePath = `app://previews/${path.basename(out)}`;
              } catch {}
              const dataUri = filePath
                ? undefined
                : `data:image/png;base64,${buf.toString("base64")}`;
              previews.assets.push({
                id,
                displayName: id,
                texturePath,
                filePath,
                dataUri,
              });
            } catch {}
          }
        } catch {}
      }

      sendProgress({
        phase: "finalize",
        message: "Finalizing results…",
        percent: 98,
      });
      const data = { summary: result, catalog, previews };
      try {
        sendProgress({
          phase: "complete",
          message: "Scan complete",
          percent: 100,
        });
      } catch {}
      return { ok: true as const, data };
    } catch (err: any) {
      return { ok: false as const, error: String(err?.message || err) };
    }
  });
}
