import path from "node:path";
import { notarize } from "@electron/notarize";

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
  console.log("Notarizing with @electron/notarize...", appPath);
  // @electron/notarize handles zipping + waiting + stapling internally
  await notarize({
    appPath,
    appleApiKey,
    appleApiKeyId,
    appleApiIssuer,
  });

  // Staple on success
  console.log("Notarization complete.");
}
