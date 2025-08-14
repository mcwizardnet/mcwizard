import { SUPPORTED_MAJORS, matchesAnyMajor } from "@/utils/modFileUtils";

type CurseForgeFilesResponse = {
  data?: any[];
  pagination?: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
};

const cache = new Map<string, { ts: number; files: any[] }>();
const TTL_MS = 2 * 60 * 1000; // 2 minutes

async function fetchPage(
  modId: number,
  index: number,
  pageSize: number,
  major?: string,
) {
  const params: any = { index, pageSize, modLoaderType: 1 };
  if (major && major !== "all") params.gameVersion = major;
  return (await window.api.getCurseForgeModFiles(
    modId,
    params,
  )) as CurseForgeFilesResponse;
}

export async function fetchSupportedForgeFiles(modId: number): Promise<any[]> {
  const key = `mod:${modId}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL_MS) return hit.files;

  const pageSize = 50;
  const dedupe = new Map<number, any>();

  for (const major of SUPPORTED_MAJORS) {
    let index = 0;
    for (let guard = 0; guard < 50; guard++) {
      const res = await fetchPage(modId, index, pageSize, major);
      const arr = ((res?.data as any[]) || []) as any[];
      for (const f of arr) {
        if (matchesAnyMajor(f, SUPPORTED_MAJORS)) dedupe.set(Number(f.id), f);
      }
      if (arr.length < pageSize) break;
      index += pageSize;
    }
  }

  const files = Array.from(dedupe.values());
  // Newest first by fileDate if present
  files.sort(
    (a: any, b: any) =>
      new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime(),
  );
  cache.set(key, { ts: now, files });
  return files;
}
