import path from "node:path";
import { stapleApp } from "@electron/notarize";
import { spawnSync } from "node:child_process";

// Electron Builder afterSign hook (must be default export)
export default async function notarizeHook(context: any) {
  if (process.platform !== "darwin") return;

  const appleApiKey = process.env.APPLE_API_KEY;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;

  if (!appleApiKey || !appleApiIssuer || !appleApiKeyId) {
    console.warn(
      "Skipping notarization: APPLE_API_KEY(_ID)/APPLE_API_ISSUER not set",
    );
    return;
  }

  const appOutDir: string = context.appOutDir;
  const appName: string = context.packager.appInfo.productFilename;

  const appPath = path.join(appOutDir, `${appName}.app`);
  console.log("Notarizing mac app with Apple API key...", appPath);

  // Prefer calling xcrun notarytool directly so we can control timeout and logs
  const minutes = Number(process.env.NOTARIZE_WAIT_MINUTES || (process.env.CI ? 20 : 8));
  const args = [
    "notarytool",
    "submit",
    appPath,
    "--key",
    appleApiKey,
    "--key-id",
    appleApiKeyId,
    "--issuer",
    appleApiIssuer,
    "--wait",
    "--timeout",
    `${minutes}m`,
  ];
  if (process.env.APPLE_TEAM_ID) {
    args.push("--team-id", process.env.APPLE_TEAM_ID);
  }

  const submit = spawnSync("xcrun", args, { stdio: "inherit" });
  if (submit.status !== 0) {
    throw new Error("notarytool submit failed");
  }

  // Staple on success
  try {
    console.log("Stapling notarization ticket...");
    await stapleApp(appPath);
  } catch (e) {
    console.warn("Stapling failed (continuing):", e);
  }
  console.log("Notarization complete.");
}


