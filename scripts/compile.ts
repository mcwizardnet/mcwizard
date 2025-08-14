import { spawnSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

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
