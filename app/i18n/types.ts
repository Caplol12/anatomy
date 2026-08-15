import type { OrganId } from "../lib/anatomy-data";

/** Prose for one organ. Structure (positions, colours, model) lives in
 *  `anatomy-data.ts`; only translatable text belongs here. */
export type OrganContent = {
  name: string;
  system: string;
  description: string;
  poetic: string;
  size: string;
  weight: string;
  location: string;
  function: string;
  dailyFact: string;
  medical: string;
  bloodSupply: string;
  funFact: string;
  tissue: string;
  comparison: string;
  conditions: string[];
  /** Keyed by hotspot id — the Terminologia Anatomica term is the anchor. */
  hotspots: Record<string, { label: string; detail: string }>;
};

export type OrganContentDictionary = Record<OrganId, OrganContent>;

export type UiDictionary = {
  meta: { title: string; description: string; ogTitle: string; ogDescription: string; imageAlt: string };
  brand: { tagline: string; home: string };
  nav: { explore: string; systems: string; lessons: string; library: string; notes: string };
  search: { placeholder: string };
  profile: { open: string };
  language: { label: string; choose: string };
  library: {
    title: string;
    open: string;
    close: string;
    saved: string;
    viewAll: string;
    quoteLine1: string;
    quoteLine2: string;
    quoteSign: string;
    quote2Line1: string;
    quote2Line2: string;
    quote2Sign: string;
    quote3Line1: string;
    quote3Line2: string;
    quote3Sign: string;
    favoritesOnly: string;
    noFavorites: string;
    noFavoritesDesc: string;
    addToFavorites: string;
    removeFromFavorites: string;
    sortBy: string;
    sortByName: string;
    sortBySystem: string;
    sortByRecent: string;
    groupBySystem: string;
    recentlyViewed: string;
    clearFilters: string;
    noResults: string;
    organsCount: string;
  };
  tools: { label: string; rotate: string; zoom: string; isolate: string; section: string; layers: string; compare: string; reset: string };
  viewer: {
    title: string; canvas: string; tip: string; tipDrag: string; tipScroll: string; tipClick: string;
    loading: string; autoRotate: string; caption: string; structures: string;
  };
  info: {
    kicker: string; keyFacts: string; size: string; weight: string; daily: string;
    location: string; bloodSupply: string; function: string; medical: string;
    didYouKnow: string; viewLesson: string; animate: string; quiz: string; compare: string;
  };
  compare: { title: string; comparing: string; reference: string; primaryRole: string; scale: string; vs: string; close: string };
  cards: {
    resources: string; microscopic: string; compareOrgans: string; functionAnimation: string;
    clinicalNotes: string; whereItWorks: string; commonConditions: string;
    exploreTissue: string; openComparison: string; playAnimation: string; seeAll: string; seeSystem: string;
    playAria: string; systemAria: string;
  };
  quiz: {
    start: string; find: string; progress: string; correct: string; wrong: string;
    reveal: string; answer: string; done: string; score: string; retry: string; exit: string; hint: string;
    mode: string;
    standardMode: string;
    timedMode: string;
    practiceMode: string;
    difficulty: string;
    easy: string;
    hard: string;
    easyDesc: string;
    hardDesc: string;
    practiceDesc: string;
    timedDesc: string;
    startQuiz: string;
    newRecord: string;
    bestScore: string;
    fastestTime: string;
    time: string;
    accuracy: string;
    speedBonus: string;
    totalScore: string;
    share: string;
    copied: string;
    perfectScore: string;
    greatJob: string;
    keepPracticing: string;
    clue: string;
    changeSettings: string;
  };
  modal: {
    guided: string; close: string; continueExploring: string;
    quizTitle: string; motionTitle: string; bodyTitle: string; insideTitle: string;
    quizPrompt: string; quizA: string; quizB: string; quizC: string;
    lessonBody: string; systemIntro: string; system: string; primaryRole: string; bloodSupply: string;
  };
  notes: {
    title: string;
    addNote: string;
    editNote: string;
    deleteNote: string;
    confirmDelete: string;
    saveNote: string;
    savedSuccess: string;
    cancel: string;
    allOrgans: string;
    filterByOrgan: string;
    noNotesTitle: string;
    noNotesDesc: string;
    placeholder: string;
    colorLabel: string;
    goToOrgan: string;
    noteForHotspot: string;
    noteForOrgan: string;
    generalNote: string;
    count: string;
    createFirst: string;
  };
  systems: {
    title: string;
    subtitle: string;
    allSystems: string;
    filterBySystem: string;
    backToSystems: string;
    organsCount: string;
    systemBadge: string;
    primarySystem: string;
    secondarySystem: string;
    exploreSystem: string;
    cardiovascular: string;
    cardiovascularDesc: string;
    respiratory: string;
    respiratoryDesc: string;
    nervous: string;
    nervousDesc: string;
    digestive: string;
    digestiveDesc: string;
    urinary: string;
    urinaryDesc: string;
    sensory: string;
    sensoryDesc: string;
    integumentary: string;
    integumentaryDesc: string;
    endocrine: string;
    endocrineDesc: string;
  };
};

export type Dictionary = { ui: UiDictionary; organs: OrganContentDictionary };

/** Minimal `{name}` interpolation — the copy has no plurals or dates. */
export function format(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}
