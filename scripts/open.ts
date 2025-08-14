import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const distDir = path.resolve(process.cwd(), "dist");
const findMacApp = (): string | null => {
  // Prefer architecture folder first
  const candidates = ["mac-arm64", "mac"];
  for (const sub of candidates) {
    const base = path.join(distDir, sub);
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
      const apps = fs.readdirSync(base).filter((name) => name.endsWith(".app"));
      if (apps.length > 0) return path.join(base, apps[0]);
    }
  }
  // Fallback: look directly under dist
  const rootApps = fs
    .readdirSync(distDir)
    .filter((name) => name.endsWith(".app"));
  if (rootApps.length > 0) return path.join(distDir, rootApps[0]);
  return null;
};

const appPath = findMacApp();
if (!appPath) {
  console.error(
    "Could not find a .app bundle under dist/. Checked dist/mac-arm64, dist/mac, and dist/.",
  );
  process.exit(1);
}

// 4) Open the app bundle on macOS
spawnSync("open", [appPath], { stdio: "inherit" });
