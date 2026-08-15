import type { OrganId } from "./anatomy-data";

const FAVORITES_STORAGE_KEY = "anatomy_favorites_v1";

let cachedFavoritesRaw: string | null = null;
let cachedFavorites: OrganId[] = [];
const EMPTY_FAVORITES: OrganId[] = [];

export function subscribeFavorites(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-favorites-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-favorites-change", callback);
  };
}

export function getFavoritesSnapshot(): OrganId[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]";
    if (raw !== cachedFavoritesRaw) {
      cachedFavoritesRaw = raw;
      const parsed = JSON.parse(raw);
      cachedFavorites = Array.isArray(parsed) ? (parsed as OrganId[]) : [];
    }
    return cachedFavorites;
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function getFavoritesServerSnapshot(): OrganId[] {
  return EMPTY_FAVORITES;
}

export function toggleFavorite(organId: OrganId): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getFavoritesSnapshot();
    const isFav = current.includes(organId);
    const updated = isFav ? current.filter((id) => id !== organId) : [...current, organId];
    const raw = JSON.stringify(updated);
    localStorage.setItem(FAVORITES_STORAGE_KEY, raw);
    cachedFavoritesRaw = raw;
    cachedFavorites = updated;
    window.dispatchEvent(new Event("local-favorites-change"));
    return !isFav;
  } catch {
    return false;
  }
}

export function isOrganFavorite(organId: OrganId): boolean {
  return getFavoritesSnapshot().includes(organId);
}
