import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import fs from "node:fs";
import mime from "mime";

/** Register modern app:// protocol using protocol.handle (replaces deprecated registerFileProtocol) */
function registerAppProtocol() {
  // Must be called before 'ready'
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true, // proper URL semantics
        secure: true, // treated like https
        supportFetchAPI: true, // window.fetch/XHR work
        corsEnabled: true,
        stream: true, // allow streaming large files
      },
    },
  ]);

  app.on("ready", () => {
    const clientRoot = path.join(
      app.getAppPath(),
      "packages",
      "renderer",
      "dist",
      "client",
    );

    protocol.handle("app", async (request) => {
      try {
        const url = new URL(request.url); // app://host/path
        const host = url.host; // e.g. '-', 'previews'
        const relPath = url.pathname.replace(/^\/+/, ""); // strip leading slash
        const ext = path.extname(relPath).toLowerCase();

        // Serve previews stored under userData safely:
        // - app://previews/<filename>
        // - app://-/previews/<filename>
        if (host === "previews" || relPath.startsWith("previews/")) {
          const previewRel =
            host === "previews" ? relPath : relPath.replace(/^previews\//, "");
          const userPath = path.join(
            app.getPath("userData"),
            "previews",
            previewRel,
          );
          if (!fs.existsSync(userPath) || !fs.statSync(userPath).isFile()) {
            return new Response("Not Found", { status: 404 });
          }
          const contentType =
            mime.getType(userPath) || "application/octet-stream";
          return new Response(fs.createReadStream(userPath) as any, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000",
            },
          });
        }

        let targetPath = path.join(clientRoot, relPath || "index.html");

        // If target is a directory, serve its index.html
        if (
          fs.existsSync(targetPath) &&
          fs.statSync(targetPath).isDirectory()
        ) {
          targetPath = path.join(targetPath, "index.html");
        }

        // If the file does not exist AND it's a "route-like" path (no extension),
        // fall back to SPA entry point. This preserves BrowserRouter deep links.
        if (!fs.existsSync(targetPath) && !ext) {
          targetPath = path.join(clientRoot, "index.html");
        }

        // If still not found, 404
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
          return new Response("Not Found", { status: 404 });
        }

        // MIME + simple caching (immutable for hashed assets)
        const contentType =
          mime.getType(targetPath) || "application/octet-stream";
        const headers: Record<string, string> = { "Content-Type": contentType };
        if (/\.[a-f0-9]{8,}\./i.test(path.basename(targetPath))) {
          headers["Cache-Control"] = "public, max-age=31536000, immutable";
        } else {
          headers["Cache-Control"] = "public, max-age=3600";
        }

        return new Response(fs.createReadStream(targetPath) as any, {
          headers,
        });
      } catch (err) {
        console.error("app:// handler error:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    });
  });
}

export default registerAppProtocol;
