import { spawnSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

const fs = await import("node:fs");

// Decode and prepare Apple credentials if provided in base64 secrets
function decodeToFileIfBase64(
  envVar: string,
  outPath: string,
): string | undefined {
  const val = process.env[envVar];
  if (!val) return undefined;
  try {
    const buf = Buffer.from(val, "base64");
    if (!buf || buf.length === 0) return undefined;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    const stat = fs.statSync(outPath);
    if (stat.size > 0) {
      process.env[envVar + "_FILE"] = outPath;
      return outPath;
    }
  } catch {}
  return undefined;
}

// electron-builder env expectations
// - For Developer ID Application certificate (pkcs12): set CSC_LINK (file path or base64) and CSC_KEY_PASSWORD
// - For notarization with API key: set APPLE_API_KEY (path to .p8) and APPLE_API_ISSUER, APPLE_API_KEY_ID

// Map provided secrets into expected vars
// Write p12 to disk and point CSC_LINK to it
const p12Path = path.resolve(process.cwd(), "tmp", "cert.p12");
const wroteP12 = decodeToFileIfBase64("APPLE_CSC_LINK_BASE64", p12Path);
if (wroteP12) {
  process.env.CSC_LINK = wroteP12;
}
if (process.env.APPLE_CSC_KEY_PASSWORD) {
  process.env.CSC_KEY_PASSWORD = process.env.APPLE_CSC_KEY_PASSWORD;
}

let apiKeyPath: string | undefined;
const p8Path = path.resolve(process.cwd(), "tmp", "AuthKey.p8");

// 1) If APPLE_API_KEY is a path to a file, use it directly
if (process.env.APPLE_API_KEY && fs.existsSync(process.env.APPLE_API_KEY)) {
  apiKeyPath = process.env.APPLE_API_KEY;
}

// 2) If APPLE_API_KEY looks like raw key content or base64, persist it
if (!apiKeyPath && process.env.APPLE_API_KEY) {
  const keyVal = process.env.APPLE_API_KEY;
  try {
    const looksLikePem = /BEGIN [A-Z\s]*PRIVATE KEY/.test(keyVal);
    const looksLikeB64 = /^[A-Za-z0-9+/=\r\n]+$/.test(keyVal) && keyVal.length > 200;
    if (looksLikePem) {
      fs.mkdirSync(path.dirname(p8Path), { recursive: true });
      fs.writeFileSync(p8Path, keyVal);
      apiKeyPath = p8Path;
    } else if (looksLikeB64) {
      const decoded = Buffer.from(keyVal, "base64");
      fs.mkdirSync(path.dirname(p8Path), { recursive: true });
      fs.writeFileSync(p8Path, decoded);
      apiKeyPath = p8Path;
    }
  } catch {}
}

// 3) Else if APPLE_API_KEY_BASE64 is provided, decode it
if (!apiKeyPath) {
  const wroteP8 = decodeToFileIfBase64("APPLE_API_KEY_BASE64", p8Path);
  if (wroteP8) apiKeyPath = wroteP8;
}

if (apiKeyPath) {
  process.env.APPLE_API_KEY = apiKeyPath;
}
// If signing inputs are missing locally, allow unsigned builds
if (!process.env.CSC_LINK && !process.env.CSC_IDENTITY_AUTO_DISCOVERY) {
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "true";
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
