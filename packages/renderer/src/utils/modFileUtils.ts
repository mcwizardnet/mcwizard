// Shared helpers for CurseForge file filtering and labeling

export const SUPPORTED_MAJORS = ["1.21", "1.20.1", "1.19.2"] as const;

export function extractVersionStrings(file: any): string[] {
  const collected = new Set<string>();
  if (Array.isArray(file?.sortableGameVersion)) {
    for (const v of file.sortableGameVersion) {
      const name = String(v?.gameVersionName || "");
      const gv = String(v?.gameVersion || "");
      if (/^\d+\.\d+(?:\.\d+)?/.test(name)) collected.add(name);
      if (/^\d+\.\d+(?:\.\d+)?/.test(gv)) collected.add(gv);
    }
  }
  if (Array.isArray(file?.gameVersion)) {
    for (const s of file.gameVersion) {
      const str = String(s || "");
      if (/^\d+\.\d+(?:\.\d+)?/.test(str)) collected.add(str);
    }
  }
  if (Array.isArray(file?.gameVersions)) {
    for (const s of file.gameVersions) {
      const str = String(s || "");
      if (/^\d+\.\d+(?:\.\d+)?/.test(str)) collected.add(str);
    }
  }
  return Array.from(collected);
}

export function matchesAnyMajor(file: any, majors: string[]): boolean {
  const versions = extractVersionStrings(file);
  if (versions.length === 0) return false;
  return majors.some((maj) =>
    versions.some((v) => v === maj || v.startsWith(maj)),
  );
}

export function getForgeAndMcFromFile(file: any): {
  mc?: string;
  loader?: string;
  loaderVersion?: string;
} {
  let loader: string | undefined;
  if (Array.isArray(file?.sortableGameVersion)) {
    for (const v of file.sortableGameVersion) {
      const name = String(v?.gameVersionName || "");
      // Prefer Forge for now
      if (name.toLowerCase() === "forge") {
        loader = "forge";
        break;
      }
    }
  }
  const versions = extractVersionStrings(file);
  // Prefer longest numeric version as mc
  let mc: string | undefined;
  for (const v of versions) {
    if (!mc || v.length > mc.length) mc = v;
  }
  // Try to infer loader version from fileName if present
  let loaderVersion: string | undefined;
  const base = String(file?.fileName || "");
  if (loader === "forge") {
    const m = base.match(/forge[-_]?([0-9A-Za-z+_.-]+)/i);
    if (m) loaderVersion = m[1];
  }
  return { mc, loader, loaderVersion };
}

export function buildJarLabel(
  modName: string | undefined,
  info: { mc?: string; loader?: string; loaderVersion?: string },
): string {
  const safeMod = (modName || "mod").trim().replace(/\s+/g, "-").toLowerCase();
  const mc = info.mc ? `mc${info.mc}` : undefined;
  const loader = info.loader
    ? `${info.loader}${info.loaderVersion ? info.loaderVersion : ""}`
    : undefined;
  const parts = [safeMod, mc, loader].filter(Boolean);
  return `${parts.join("-")}.jar`;
}

// Best-effort parse from an existing filename to extract mc/forge version
export function parseForgeMcFromFileName(filename: string): {
  mc?: string;
  loader?: string;
  loaderVersion?: string;
} {
  const out: { mc?: string; loader?: string; loaderVersion?: string } = {};
  const base = String(filename || "");
  const mcMatch =
    base.match(/mc(\d+\.\d+(?:\.\d+)?)/i) || base.match(/(\d+\.\d+(?:\.\d+)?)/);
  if (mcMatch) out.mc = mcMatch[1];
  const forgeMatch = base.match(/forge[-_]?([0-9A-Za-z+_.-]+)/i);
  if (forgeMatch) {
    out.loader = "forge";
    out.loaderVersion = forgeMatch[1];
  }
  return out;
}
