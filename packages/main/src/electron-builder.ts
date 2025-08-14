import type { Configuration } from "electron-builder";

export const getAllFilePatterns = (): string[] => {
  return [
    // Include workspace build outputs directly so root "main" path works
    "packages/main/dist/**",
    "packages/main/package.json",
    "packages/preload/dist/**",
    "packages/preload/package.json",
    "packages/renderer/dist/**",
    "packages/renderer/package.json",

    // Also include via workspace symlinks under node_modules for safety
    "node_modules/@app/main/dist/**",
    "node_modules/@app/main/package.json",
    "node_modules/@app/preload/dist/**",
    "node_modules/@app/preload/package.json",
    "node_modules/@app/renderer/dist/**",
    "node_modules/@app/renderer/package.json",
  ];
};

export const config: Configuration = {
  appId: "net.mcwizard.app",
  productName: "mcwizard",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  afterSign:
    process.platform === "darwin"
      ? "packages/main/dist/build/notarize.mjs"
      : undefined,
  publish: [
    {
      provider: "github",
      owner: "mcwizardnet",
      repo: "mcwizard",
      releaseType: "release",
      vPrefixedTagName: true,
    },
  ],
  artifactName: "${name}-${version}-${os}-${arch}.${ext}",
  files: getAllFilePatterns(),
  win: {
    target: ["nsis"],
  },
  nsis: {
    oneClick: false,
  },
  mac: {
    category: "public.app-category.utilities",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.mac.plist",
    entitlementsInherit: "resources/entitlements.mac.plist",
    target: [
      {
        target: "default",
        arch: ["arm64", "x64"],
      },
    ],
    notarize: false,
  },
};

export default config;
