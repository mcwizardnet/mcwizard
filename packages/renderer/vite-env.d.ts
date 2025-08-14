/// <reference types="vite/client" />
import type { IPCAPI } from "@app/preload";

declare global {
  interface Window {
    api: IPCAPI;
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
