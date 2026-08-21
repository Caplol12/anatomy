export type NoteColor =
  | "amber"
  | "teal"
  | "coral"
  | "indigo"
  | "emerald"
  | "lemon"
  | "sakura"
  | "mint"
  | "lavender"
  | "sky"
  | "peach";

export type NoteCategory = "general" | "clinical" | "highyield" | "checklist" | "histology";

export interface Note {
  id: string;
  organId: string;
  hotspotId?: string;
  text: string;
  color: NoteColor;
  createdAt: number;
  updatedAt: number;
  rating?: number; // 1 to 5 stars
  category?: NoteCategory;
  completedChecklistIndices?: number[];
}

export const NOTE_STORAGE_KEY = "anatomy_personal_notes_v1";

export const NOTE_COLORS: Array<{
  id: NoteColor;
  label: string;
  bg: string;
  border: string;
  accent: string;
  tape: string;
}> = [
  {
    id: "lemon",
    label: "Lemon / عسلی",
    bg: "rgba(254, 243, 199, 0.88)",
    border: "rgba(245, 158, 11, 0.38)",
    accent: "#f59e0b",
    tape: "rgba(253, 224, 71, 0.7)",
  },
  {
    id: "sakura",
    label: "Sakura / صورتی",
    bg: "rgba(255, 228, 230, 0.88)",
    border: "rgba(244, 63, 94, 0.38)",
    accent: "#f43f5e",
    tape: "rgba(253, 164, 175, 0.7)",
  },
  {
    id: "mint",
    label: "Mint / نعنایی",
    bg: "rgba(209, 250, 229, 0.88)",
    border: "rgba(16, 185, 129, 0.38)",
    accent: "#10b981",
    tape: "rgba(110, 231, 183, 0.7)",
  },
  {
    id: "lavender",
    label: "Lavender / یاسی",
    bg: "rgba(237, 233, 254, 0.88)",
    border: "rgba(139, 92, 246, 0.38)",
    accent: "#8b5cf6",
    tape: "rgba(196, 181, 253, 0.7)",
  },
  {
    id: "sky",
    label: "Sky / آسمانی",
    bg: "rgba(224, 242, 254, 0.88)",
    border: "rgba(14, 165, 233, 0.38)",
    accent: "#0ea5e9",
    tape: "rgba(125, 211, 252, 0.7)",
  },
  {
    id: "peach",
    label: "Peach / هلویی",
    bg: "rgba(255, 237, 213, 0.88)",
    border: "rgba(249, 115, 22, 0.38)",
    accent: "#f97316",
    tape: "rgba(253, 186, 116, 0.7)",
  },
];

export function getNoteColorConfig(colorId: NoteColor | string) {
  const match = NOTE_COLORS.find((c) => c.id === colorId);
  if (match) return match;
  // Legacy color fallback
  if (colorId === "amber") return NOTE_COLORS[0];
  if (colorId === "coral") return NOTE_COLORS[1];
  if (colorId === "emerald" || colorId === "teal") return NOTE_COLORS[2];
  if (colorId === "indigo") return NOTE_COLORS[3];
  return NOTE_COLORS[0];
}

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

export function createNote(
  organId: string,
  text: string,
  color: NoteColor = "lemon",
  hotspotId?: string,
  rating: number = 0,
  category: NoteCategory = "general",
  completedChecklistIndices: number[] = []
): Note {
  const now = Date.now();
  return {
    id: `note_${now}_${Math.random().toString(36).substring(2, 7)}`,
    organId,
    hotspotId: hotspotId || undefined,
    text: text.trim(),
    color,
    createdAt: now,
    updatedAt: now,
    rating,
    category,
    completedChecklistIndices,
  };
}
