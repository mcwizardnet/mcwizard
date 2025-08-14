import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import electronPath from "electron";
import tsconfigPaths from "vite-tsconfig-paths";
import dotenv from "dotenv";
dotenv.config();

const handleMainHotReload = (): Plugin => {
  let watchServer: ViteDevServer | null = null;
  let electronApp: ChildProcess | null = null;
  return {
    name: "preload-hot-reload",
    config(config, env) {
      if (env.mode !== "development") {
        return;
      }
      const devServerProvider = config.plugins?.find(
        (plugin) =>
          plugin && "name" in plugin && plugin.name === "renderer-provider",
      );
      if (!devServerProvider) {
        throw new Error("Renderer plugin not found");
      }
      watchServer = (devServerProvider as any).api.provideDevServer();
      process.env.VITE_DEV_SERVER_URL = watchServer?.resolvedUrls?.local[0];
      return {
        build: {
          watch: {},
        },
      };
    },
    writeBundle() {
      if (process.env.NODE_ENV !== "development") {
        return;
      }

      /** Kill electron if a process already exists */
      if (electronApp !== null) {
        electronApp.removeListener("exit", process.exit);
        electronApp.kill("SIGINT");
        electronApp = null;
      }

      /** Spawn a new electron process */
      electronApp = spawn(String(electronPath), ["--inspect", "."], {
        stdio: "inherit",
      });

      /** Stops the watch script when the application has been quit */
      electronApp.addListener("exit", process.exit);
    },
  };
};

export default defineConfig({
  plugins: [handleMainHotReload(), tsconfigPaths()],
  define: {
    __CURSEFORGE_API_KEY__: JSON.stringify(process.env.CURSEFORGE_API_KEY),
  },
  build: {
    ssr: true,
    sourcemap: "inline",
    outDir: "dist",
    target: "node22",
    lib: {
      entry: [
        "src/index.ts",
        "src/entry.ts",
        "src/electron-builder.ts",
        "src/build/notarize.ts",
      ],
    },
    rollupOptions: {
      output: [
        {
          entryFileNames: "[name].mjs",
        },
      ],
    },
    emptyOutDir: true,
  },
});
