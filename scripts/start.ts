import { build, createServer } from "vite";
import type { Plugin } from "vite";
import path from "node:path";
import dotenv from "dotenv";
const mode = "development";

dotenv.config();

// 1. Start the React Router dev server for renderer.
const rendererWatchServer = await createServer({
  mode,
  root: path.resolve("packages/renderer"),
});
await rendererWatchServer.listen();

// 2. Create plugin with access to the renderer dev server URL.
const rendererPlugin: Plugin = {
  name: "renderer-provider",
  api: {
    provideDevServer() {
      return rendererWatchServer;
    },
  },
};

// 3. Build the main package.
console.log("Building main and preload packages...");
await build({
  mode: "development",
  define: {
    __CURSEFORGE_API_KEY__: JSON.stringify(process.env.CURSEFORGE_API_KEY),
  },
  root: path.resolve(`packages/main`),
  plugins: [rendererPlugin],
});

// 4. Build the preload package.
await build({
  mode: "development",
  root: path.resolve(`packages/preload`),
  plugins: [rendererPlugin],
});
