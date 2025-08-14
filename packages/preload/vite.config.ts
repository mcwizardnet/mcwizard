import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";

const handlePreloadHotReload = (): Plugin => {
  let watchServer: ViteDevServer | null = null;
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
      return {
        build: {
          watch: {},
        },
      };
    },
    writeBundle() {
      if (!watchServer) {
        return;
      }
      watchServer.ws.send({
        type: "full-reload",
      });
    },
  };
};

export default defineConfig({
  plugins: [handlePreloadHotReload()],
  build: {
    ssr: true,
    sourcemap: "inline",
    outDir: "dist",
    target: "chrome105",
    lib: {
      entry: { exposed: "src/index.ts" },
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
