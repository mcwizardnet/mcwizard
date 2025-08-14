#!/usr/bin/env node
const { notarize } = require('@electron/notarize');
const path = require('node:path');

exports.default = async function notarizeHook(context) {
  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;

  if (process.platform !== 'darwin') return;

  const appleApiKey = process.env.APPLE_API_KEY;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;

  if (!appleApiKey || !appleApiIssuer || !appleApiKeyId) {
    console.warn('Skipping notarization: APPLE_API_KEY(_ID)/APPLE_API_ISSUER not set');
    return;
  }

  console.log('Notarizing mac app with Apple API key...');
  await notarize({
    appBundleId: 'net.mcwizard.app',
    appPath: path.join(appOutDir, `${appName}.app`),
    tool: 'notarytool',
    appleApiKey,
    appleApiIssuer,
    appleApiKeyId,
  });
  console.log('Notarization complete.');
}


