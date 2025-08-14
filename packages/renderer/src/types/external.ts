export interface CurseForgeModCategory {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  url: string;
  iconUrl: string;
  dateModified: string;
  isClass: boolean;
  classId: number;
  parentCategoryId: number;
  displayIndex: number;
}

export interface CurseForgeModFile {
  id: number;
  gameId: number;
  modId: number;
  isAvailable: boolean;
  displayName: string;
  fileName: string;
  releaseType: number;
  fileStatus: number;
  hashes: {
    value: string;
    algo: number;
  }[];
  fileDate: string;
  fileLength: number;
  downloadCount: number;
  fileSizeOnDisk: number;
  downloadUrl: string;
  gameVersion: string[];
  sortableGameVersion: {
    gameVersionName: string;
    gameVersionPadded: string;
    gameVersion: string;
    gameVersionTypeId: number;
  }[];
  dependencies: {
    modId: number;
    relationType: number;
  }[];
  exposeAsAlternative: boolean;
  parentProjectFileId: number;
  alternateFileId: number;
  isServerPack: boolean;
  serverPackFileId: number;
  isEarlyAccessContent: true;
  earlyAccessEndDate: string;
  fileFingerprint: number;
  modules: { name: string; fingerprint: number }[];
}

export interface CurseForgeModFileIndex {
  gameVersion: string;
  fileId: number;
  filename: string;
  releaseType: number;
  gameVersionTypeId: number;
}

// https://docs.curseforge.com/rest-api/#get-mod
export interface CurseForgeMod {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  link: {
    websiteURL: string;
    wikiURL: string;
    issuesURL: string;
    sourceURL: string;
  };
  summary: string;
  status: number;
  downloadCount: number;
  isFeatured: boolean;
  primaryCategoryID: number;
  categories: CurseForgeModCategory[];
  classID: number;
  authors: {
    id: number;
    name: string;
    url: string;
  }[];
  logo: {
    id: number;
    modId: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    url: string;
  };
  screenshots: {
    id: number;
    modId: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    url: string;
  }[];
  mainFileId: number;
  latestFiles: CurseForgeModFile[];
  latestFilesIndexes: CurseForgeModFileIndex[];
  latestEarlyAccessFilesIndexs: CurseForgeModFileIndex[];
  dateCreated: string;
  dateModified: string;
  dateReleased: string;
  allowModDistribution: boolean;
  gamePopularityRank: number;
  isAvailable: boolean;
  thumbsUpCount: number;
  rating: number;
}

// https://docs.curseforge.com/rest-api/#get-featured-mods
// Endpoint: POST /v1/mods/featured
export interface CurseForgeGetFeaturedModsRequest {
  gameId: number; // Minecraft = 432
  excludedModIds?: number[];
  gameVersionTypeId?: number; // e.g., 1 = release, varies by game
}

export interface CurseForgeFeaturedModsBuckets {
  featured: CurseForgeMod[];
  popular: CurseForgeMod[];
  recentlyUpdated: CurseForgeMod[];
}

export interface CurseForgeGetFeaturedModsResponse {
  data: CurseForgeFeaturedModsBuckets;
}

// ---- Search Mods ----
export interface CurseForgeSearchModsParams {
  gameId: number; // required (432 for Minecraft)
  classId?: number;
  categoryId?: number;
  gameVersion?: string;
  modLoaderType?: number; // 1 Forge, 4 Fabric, 5 Quilt, 6 NeoForge (subject to API constants)
  searchFilter?: string;
  sortField?:
    | "featured"
    | "popularity"
    | "lastUpdated"
    | "name"
    | "author"
    | "totalDownloads"
    | "rating";
  sortOrder?: "asc" | "desc";
  pageSize?: number; // default 20 max 50/100 depending on API
  index?: number; // offset-based pagination
}

export interface CurseForgePagination {
  index: number;
  pageSize: number;
  resultCount: number;
  totalCount: number;
}

export interface CurseForgeSearchModsResponse {
  data: CurseForgeMod[];
  pagination: CurseForgePagination;
}

export interface CurseForgeListResponse<T> {
  data: T[];
  pagination?: CurseForgePagination;
}
