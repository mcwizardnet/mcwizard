// Mods, Servers, and Worlds All Inherit This
export interface BaseCategory {
  // An id for the category's item.
  id: string;
  // The name of the category's item.
  name: string;
  // The photo url of the category's item.
  photoUrl?: string;
  // The description of the category's item.
  description?: string;
  // The date the category's item was created.
  createdAt: string;
  // The date the category's item was last updated.
  updatedAt: string;
  // The version of the category's item.
  version: string;
  // Tags to filter by the category.
  tags?: string[];
}
export interface Mod extends BaseCategory {
  // The minecraft version(s) the mod is compatible with.
  mcVersions?: string[];
  // The supported loaders (e.g., Forge, NeoForge, Fabric, Quilt)
  loaders?: string[];
  // Total download count.
  downloadCount?: number;
  // Upvotes/thumbs up.
  thumbsUpCount?: number;
  // Average rating (if provided by API).
  rating?: number;
  // Link to project page.
  websiteUrl?: string;
  // Source of this mod: curseforge or local (created in app)
  source: "curseforge" | "local";
  // External id (e.g., CurseForge id) when source is external
  externalId?: number;
  // Optional primary file id for download convenience
  mainFileId?: number;
  // Whether this mod has been downloaded/installed locally
  isInstalled?: boolean;
}

export interface Server extends BaseCategory {}

export interface World extends BaseCategory {}

export type AnyItem = Mod | Server | World;
