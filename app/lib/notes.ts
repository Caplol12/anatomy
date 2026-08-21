export type NoteColor = "amber" | "teal" | "coral" | "indigo" | "emerald";

export interface Note {
  id: string;
  organId: string;
  hotspotId?: string;
  text: string;
  color: NoteColor;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_STORAGE_KEY = "anatomy_personal_notes_v1";

export const NOTE_COLORS: Array<{ id: NoteColor; label: string; bg: string; border: string; accent: string }> = [
  { id: "amber", label: "Amber", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.35)", accent: "#f59e0b" },
  { id: "teal", label: "Teal", bg: "rgba(20, 184, 166, 0.08)", border: "rgba(20, 184, 166, 0.35)", accent: "#14b8a6" },
  { id: "coral", label: "Coral", bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.35)", accent: "#f43f5e" },
  { id: "indigo", label: "Indigo", bg: "rgba(99, 102, 241, 0.08)", border: "rgba(99, 102, 241, 0.35)", accent: "#6366f1" },
  { id: "emerald", label: "Emerald", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.35)", accent: "#10b981" },
];

let cachedNotesRaw: string | null = null;
let cachedNotes: Note[] = [];
const EMPTY_NOTES: Note[] = [];

export function subscribeNotes(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-notes-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-notes-change", callback);
  };
}

export function getNotesSnapshot(): Note[] {
  if (typeof window === "undefined") return EMPTY_NOTES;
  try {
    const raw = localStorage.getItem(NOTE_STORAGE_KEY) || "[]";
    if (raw !== cachedNotesRaw) {
      cachedNotesRaw = raw;
      const parsed = JSON.parse(raw);
      cachedNotes = Array.isArray(parsed) ? parsed : [];
    }
    return cachedNotes;
  } catch {
    return EMPTY_NOTES;
  }
}

export function getNotesServerSnapshot(): Note[] {
  return EMPTY_NOTES;
}

export function loadNotes(): Note[] {
  return getNotesSnapshot();
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(notes);
    localStorage.setItem(NOTE_STORAGE_KEY, raw);
    cachedNotesRaw = raw;
    cachedNotes = notes;
    window.dispatchEvent(new Event("local-notes-change"));
  } catch {
    // ignore quota/storage errors
  }
}

export function createNote(organId: string, text: string, color: NoteColor = "amber", hotspotId?: string): Note {
  const now = Date.now();
  return {
    id: `note_${now}_${Math.random().toString(36).substring(2, 7)}`,
    organId,
    hotspotId: hotspotId || undefined,
    text: text.trim(),
    color,
    createdAt: now,
    updatedAt: now,
  };
}
