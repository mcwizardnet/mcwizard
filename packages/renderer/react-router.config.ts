import type { Config } from "@react-router/dev/config";

export default {
  // Cannot use relative basename due to this build error:
  // <Router basename="/./"> is not able to match the URL "/"
  // because it does not start with the basename, so the <Router>
  // won't render anything. DO NOT USE basename "./".

  // SSR Only in Development Mode
  ssr: process.env.NODE_ENV === "development",
  // Pre-Render
  prerender: process.env.NODE_ENV === "development",
  // Source Directory
  appDirectory: "src",
  // Output Directory
  buildDirectory: "dist",
} satisfies Config;
