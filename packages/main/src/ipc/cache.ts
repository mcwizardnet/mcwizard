import { app } from "electron";

export const CURSEFORGE_API_URL = "https://api.curseforge.com/v1";

// Simple in-memory cache with TTL for CurseForge GET requests
const cache = new Map<string, { data: any; ts: number }>();
const TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function cachedFetchJson(url: string): Promise<any> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.ts < TTL_MS) return hit.data;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": __CURSEFORGE_API_KEY__,
      "User-Agent": `mcwizard/${app.getVersion()}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CurseForge request failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  cache.set(url, { data: json, ts: now });
  return json;
}

export function clearCache() {
  cache.clear();
}
