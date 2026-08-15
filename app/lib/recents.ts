import type { OrganId } from "./anatomy-data";

const RECENTS_STORAGE_KEY = "anatomy_recents_v1";
const MAX_RECENTS = 5;

let cachedRecentsRaw: string | null = null;
let cachedRecents: OrganId[] = [];
const EMPTY_RECENTS: OrganId[] = [];

export function subscribeRecents(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-recents-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-recents-change", callback);
  };
}

export function getRecentsSnapshot(): OrganId[] {
  if (typeof window === "undefined") return EMPTY_RECENTS;
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY) || "[]";
    if (raw !== cachedRecentsRaw) {
      cachedRecentsRaw = raw;
      const parsed = JSON.parse(raw);
      cachedRecents = Array.isArray(parsed) ? (parsed as OrganId[]) : [];
    }
    return cachedRecents;
  } catch {
    return EMPTY_RECENTS;
  }
}

export function getRecentsServerSnapshot(): OrganId[] {
  return EMPTY_RECENTS;
}

export function recordOrganVisit(organId: OrganId): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentsSnapshot();
    const filtered = current.filter((id) => id !== organId);
    const updated = [organId, ...filtered].slice(0, MAX_RECENTS);
    const raw = JSON.stringify(updated);
    localStorage.setItem(RECENTS_STORAGE_KEY, raw);
    cachedRecentsRaw = raw;
    cachedRecents = updated;
    window.dispatchEvent(new Event("local-recents-change"));
  } catch {
    // ignore
  }
}
