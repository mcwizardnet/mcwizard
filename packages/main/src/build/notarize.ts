import path from "node:path";
import { spawnSync } from "node:child_process";

// Electron Builder afterSign hook (must be default export)
export default async function notarizeHook(context: any) {
  if (process.platform !== "darwin") return;

  // Only notarize on CI by default. Locally, require NOTARIZE=true to opt-in.
  const shouldNotarize =
    process.env.CI === "true" || process.env.NOTARIZE === "true";
  if (!shouldNotarize) {
    console.log(
      "Skipping notarization: set NOTARIZE=true to enable locally (CI always on)",
    );
    return;
  }

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
  console.log("Preparing ZIP for notarization...", appPath);
  const zipPath = path.join(appOutDir, `${appName}.zip`);
  const zip = spawnSync("ditto", [
    "-c",
    "-k",
    "--sequesterRsrc",
    "--keepParent",
    appPath,
    zipPath,
  ], { stdio: "inherit" });
  if (zip.status !== 0) {
    throw new Error("Failed to create ZIP for notarization");
  }

  console.log("Submitting ZIP to Apple notary service...", zipPath);
  const minutes = Number(process.env.NOTARIZE_WAIT_MINUTES || (process.env.CI ? 20 : 8));
  const submitArgs = [
    "notarytool",
    "submit",
    zipPath,
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
    submitArgs.push("--team-id", process.env.APPLE_TEAM_ID);
  }
  const submit = spawnSync("xcrun", submitArgs, { stdio: "inherit" });
  if (submit.status !== 0) {
    throw new Error("notarytool submit failed");
  }

  // Staple on success
  try {
    console.log("Stapling notarization ticket with xcrun stapler...");
    const staple = spawnSync("xcrun", ["stapler", "staple", "-v", appPath], {
      stdio: "inherit",
    });
    if (staple.status !== 0) {
      console.warn("Stapler returned non-zero exit code, continuing");
    }
  } catch (e) {
    console.warn("Stapling failed (continuing):", e);
  }
  console.log("Notarization complete.");
}
