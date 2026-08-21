export interface JournalSheetData {
  date: string;
  componentsChecked: Record<number, boolean>;
  functionNotes: string;
  goldenCheckboxes: boolean[];
  goldenNotes: string;
  diseasesNotes: string;
  extraNotes: string;
  vocabTerms: Array<{ term: string; def: string }>;
}

export interface JournalSheetConfig {
  id: string;
  nameFa: string;
  nameEn: string;
  image: string;
  componentsCount: number;
}

export const JOURNAL_SHEETS: JournalSheetConfig[] = [
  {
    id: "brain",
    nameFa: "مغز",
    nameEn: "Brain",
    image: "/journal-sheets/brain.jpg",
    componentsCount: 8,
  },
  {
    id: "liver",
    nameFa: "کبد",
    nameEn: "Liver",
    image: "/journal-sheets/liver.jpg",
    componentsCount: 9,
  },
  {
    id: "kidneys",
    nameFa: "کلیه",
    nameEn: "Kidney",
    image: "/journal-sheets/kidneys.jpg",
    componentsCount: 9,
  },
  {
    id: "eyeball",
    nameFa: "چشم",
    nameEn: "Eye",
    image: "/journal-sheets/eyeball.jpg",
    componentsCount: 6,
  },
  {
    id: "intestine",
    nameFa: "روده",
    nameEn: "Intestine",
    image: "/journal-sheets/intestine.jpg",
    componentsCount: 11,
  },
  {
    id: "pancreas",
    nameFa: "پانکراس",
    nameEn: "Pancreas",
    image: "/journal-sheets/pancreas.jpg",
    componentsCount: 7,
  },
  {
    id: "skin",
    nameFa: "پوست",
    nameEn: "Skin",
    image: "/journal-sheets/skin.jpg",
    componentsCount: 8,
  },
];

const JOURNAL_STORAGE_KEY = "anatomy_journal_worksheets_v1";

export function getDefaultSheetData(): JournalSheetData {
  return {
    date: "",
    componentsChecked: {},
    functionNotes: "",
    goldenCheckboxes: [false, false, false],
    goldenNotes: "",
    diseasesNotes: "",
    extraNotes: "",
    vocabTerms: [
      { term: "", def: "" },
      { term: "", def: "" },
    ],
  };
}

export function loadAllJournalData(): Record<string, JournalSheetData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveJournalSheetData(organId: string, data: JournalSheetData): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllJournalData();
    all[organId] = data;
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore storage quota errors
  }
}

export function resetJournalSheetData(organId: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllJournalData();
    delete all[organId];
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
