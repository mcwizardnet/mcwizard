import path from "node:path";
import { notarize } from "@electron/notarize";

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
  await notarize({
    appBundleId: "net.mcwizard.app",
    appPath,
    tool: "notarytool",
    appleApiKey,
    appleApiIssuer,
    appleApiKeyId,
  });
  console.log("Notarization complete.");
}


