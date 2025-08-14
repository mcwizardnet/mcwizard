import { spawnSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

// Decode and prepare Apple credentials if provided in base64 secrets
function decodeToFileIfBase64(envVar: string, outPath: string) {
  const val = process.env[envVar];
  if (!val) return;
  try {
    // Treat as raw base64 and write to file
    const buf = Buffer.from(val, "base64");
    if (buf.length > 0) {
      const fs = require("node:fs");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      process.env[envVar + "_FILE"] = outPath;
    }
  } catch {}
}

// electron-builder env expectations
// - For Developer ID Application certificate (pkcs12): set CSC_LINK (file path or base64) and CSC_KEY_PASSWORD
// - For notarization with API key: set APPLE_API_KEY (path to .p8) and APPLE_API_ISSUER, APPLE_API_KEY_ID

// Map provided secrets into expected vars
if (process.env.APPLE_CSC_LINK_BASE64) {
  // Write p12 to disk and point CSC_LINK to it
  const p12Path = path.resolve(process.cwd(), "tmp", "cert.p12");
  decodeToFileIfBase64("APPLE_CSC_LINK_BASE64", p12Path);
  process.env.CSC_LINK = p12Path;
}
if (process.env.APPLE_CSC_KEY_PASSWORD) {
  process.env.CSC_KEY_PASSWORD = process.env.APPLE_CSC_KEY_PASSWORD;
}

if (process.env.APPLE_API_KEY_BASE64) {
  const p8Path = path.resolve(process.cwd(), "tmp", "AuthKey.p8");
  decodeToFileIfBase64("APPLE_API_KEY_BASE64", p8Path);
  process.env.APPLE_API_KEY = p8Path;
}
if (process.env.APPLE_API_ISSUER) {
  process.env.APPLE_API_ISSUER = process.env.APPLE_API_ISSUER;
}
if (process.env.APPLE_API_KEY_ID) {
  process.env.APPLE_API_KEY_ID = process.env.APPLE_API_KEY_ID;
}
if (process.env.APPLE_TEAM_ID) {
  process.env.APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
}

// 1) Build all workspaces
const buildResult = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

// 2) Build & package app.
const { build } = await import("electron-builder");
await build({
  config: path.resolve(
    process.cwd(),
    "packages",
    "main",
    "dist",
    "electron-builder.mjs",
  ),
  publish:
    process.env.GITHUB_ACTIONS === "true" || process.env.GH_TOKEN
      ? ("always" as any)
      : ("never" as any),
});
