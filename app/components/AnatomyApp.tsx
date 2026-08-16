"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  BrainCircuit,
  ChevronDown,
  CircleHelp,
  Compass,
  FileText,
  Globe,
  Heart,
  History,
  Layers,
  LibraryBig,
  Microscope,
  NotebookPen,
  Play,
  Search,
  Share2,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { OrganViewer } from "./OrganViewer";
import { NotesModal } from "./NotesModal";
import { SystemsExplorer } from "./SystemsExplorer";
import { AtelierLogoIcon } from "./AtelierIcons";
import { AtelierSplashLoader } from "./AtelierSplashLoader";
import { ThemeToggle } from "./ThemeToggle";
import { TypewriterText } from "./TypewriterText";
import type { OrganId, SystemId } from "../lib/anatomy-data";
import { BODY_SYSTEMS, SYSTEM_CONFIG_BY_ID } from "../lib/systems";
import type { LocaleConfig } from "../i18n/config";
import { locales } from "../i18n/config";
import { buildOrgans, indexOrgans, type Organ } from "../i18n/merge";
import { format, type Dictionary, type UiDictionary } from "../i18n/types";
import { getNotesServerSnapshot, getNotesSnapshot, saveNotes, subscribeNotes } from "../lib/notes";
import { getFavoritesServerSnapshot, getFavoritesSnapshot, subscribeFavorites, toggleFavorite } from "../lib/favorites";
import { getRecentsServerSnapshot, getRecentsSnapshot, recordOrganVisit, subscribeRecents } from "../lib/recents";

type Modal = "lesson" | "quiz" | "animation" | "system" | "notes" | null;
type NavView = "explore" | "systems";

/**
 * Renders an organ illustration, or its accent glyph for organs that ship as a
 * 3D model without the painted asset set. Keeps every image slot filled instead
 * of leaving a broken `<img>` behind.
 */
function OrganArt({
  organ,
  asset,
  alt,
  size,
}: {
  organ: Organ;
  asset: "thumb" | "organ" | "microscopic" | "compare" | "location";
  alt: string;
  size?: number;
}) {
  if (!organ.illustrated) {
    // An empty alt means a surrounding control already names this, so the
    // glyph should be skipped rather than announced with no label.
    const labelling = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
    return (
      <span className="art-fallback" style={{ "--art-accent": organ.accent } as React.CSSProperties} {...labelling}>
        {organ.icon}
      </span>
    );
  }
  return (
    <img
      key={`${organ.id}-${asset}`}
      src={`/anatomy/${organ.id}/${asset}.webp`}
      alt={alt}
      width={size}
      height={size}
      loading={asset === "thumb" ? "eager" : "lazy"}
      decoding="async"
    />
  );
}


/**
 * Measurements like "250–350 g" begin with a digit, which Unicode treats as
 * neutral — inside an RTL paragraph the range gets visually reversed. Digits
 * are not "strong" characters, so `unicode-bidi: plaintext` cannot rescue it;
 * the run has to be isolated as LTR explicitly.
 */
function Measure({ children }: { children: string }) {
  return <bdi dir={/^[\d(]/.test(children.trim()) ? "ltr" : "auto"}>{children}</bdi>;
}

/**
 * Switches language by swapping the leading path segment, so the current
 * document is preserved rather than bouncing through the root redirect.
 *
 * The native <select> is stretched transparently over the whole pill rather
 * than sitting inline. A <label> only *focuses* a select when clicked — it does
 * not open it — so anything outside the select's own box (the globe, the
 * chevron, the padding) would otherwise be a dead zone. Overlaying it means a
 * click anywhere on the control opens the picker, while the visible row
 * underneath stays fully styleable.
 */
function LanguageSwitcher({ locale, t }: { locale: LocaleConfig; t: UiDictionary }) {
  return (
    <div className="language-switcher" title={t.language.label}>
      <Globe size={16} aria-hidden />
      <span className="language-current">{locale.nativeName}</span>
      <ChevronDown size={14} aria-hidden />
      <select
        aria-label={t.language.choose}
        value={locale.code}
        onChange={(event) => {
          window.location.pathname = `/${event.target.value}`;
        }}
      >
        {locales.map((entry) => (
          <option key={entry.code} value={entry.code} lang={entry.code}>
            {entry.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AnatomyApp({ locale, dictionary }: { locale: LocaleConfig; dictionary: Dictionary }) {
  const t = dictionary.ui;
  const organs = useMemo(() => buildOrgans(dictionary.organs), [dictionary.organs]);
  const organById = useMemo(() => indexOrgans(organs), [organs]);

  const [organId, setOrganId] = useState<OrganId>("heart");
  const [navView, setNavView] = useState<NavView>("explore");
  const [selectedSystemId, setSelectedSystemId] = useState<SystemId | null>(null);
  const [systemFilter, setSystemFilter] = useState<SystemId | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<"system" | "name" | "recent">("system");
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [compare, setCompare] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState("");
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const notes = useSyncExternalStore(subscribeNotes, getNotesSnapshot, getNotesServerSnapshot);
  const favorites = useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, getFavoritesServerSnapshot);
  const recents = useSyncExternalStore(subscribeRecents, getRecentsSnapshot, getRecentsServerSnapshot);
  const [notesDraft, setNotesDraft] = useState<{ organId: string; hotspotId?: string } | undefined>(undefined);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLElement>(null);
  const prefetched = useRef(new Set<OrganId>());
  const organ = organById[organId];
  const reference = organById[organId === "heart" ? "brain" : "heart"];

  // Parallax subtle background movement
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId: number | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
        const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
        const moveX = `${(xPercent * 8).toFixed(1)}px`;
        const moveY = `${(yPercent * 8).toFixed(1)}px`;
        document.documentElement.style.setProperty("--bg-parallax-x", moveX);
        document.documentElement.style.setProperty("--bg-parallax-y", moveY);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  // Top viewport scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, window.scrollY / totalScroll)));
      } else {
        setScrollProgress(0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initial Brand Title Entry Stagger Animation (runs once on mount)
  useEffect(() => {
    if (!brandRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const chars = brandRef.current.querySelectorAll(".brand-char");
    const sparkle = brandRef.current.querySelector(".brand-sparkle");

    gsap.fromTo(
      chars,
      { opacity: 0, y: 12, rotate: 2 },
      { opacity: 1, y: 0, rotate: 0, duration: 0.5, stagger: 0.025, ease: "power2.out" }
    );
    if (sparkle) {
      gsap.fromTo(
        sparkle,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.4, delay: 0.3, ease: "back.out(2)" }
      );
    }
  }, []);

  const noteCountsByOrgan = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notes) {
      map[n.organId] = (map[n.organId] || 0) + 1;
    }
    return map;
  }, [notes]);

  const quotes = useMemo(
    () => [
      { line1: t.library.quoteLine1, line2: t.library.quoteLine2, sign: t.library.quoteSign },
      { line1: t.library.quote2Line1, line2: t.library.quote2Line2, sign: t.library.quote2Sign },
      { line1: t.library.quote3Line1, line2: t.library.quote3Line2, sign: t.library.quote3Sign },
    ],
    [t.library],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  useEffect(() => {
    recordOrganVisit(organId);
  }, [organId]);

  const recentOrgans = useMemo(() => {
    return recents
      .map((id) => organById[id])
      .filter(Boolean)
      .slice(0, 4);
  }, [recents, organById]);

  const filteredAndSortedOrgans = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase(locale.code);
    let list = organs.filter((item) => {
      const matchesQuery =
        !cleanQuery ||
        `${item.name} ${item.system}`.toLocaleLowerCase(locale.code).includes(cleanQuery);
      const matchesSystem =
        systemFilter === "all" ||
        (item.systems && item.systems.includes(systemFilter)) ||
        item.systemId === systemFilter;
      const matchesFavorites = !favoritesOnly || favorites.includes(item.id);
      return matchesQuery && matchesSystem && matchesFavorites;
    });

    if (sortMode === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, locale.code));
    } else if (sortMode === "recent") {
      list = [...list].sort((a, b) => {
        const idxA = recents.indexOf(a.id);
        const idxB = recents.indexOf(b.id);
        const rankA = idxA === -1 ? 999 : idxA;
        const rankB = idxB === -1 ? 999 : idxB;
        return rankA - rankB;
      });
    }

    return list;
  }, [organs, query, locale.code, systemFilter, favoritesOnly, favorites, sortMode, recents]);

  const groupedBySystem = useMemo(() => {
    if (sortMode !== "system" || systemFilter !== "all" || favoritesOnly) return null;
    const groups: Array<{ system: (typeof BODY_SYSTEMS)[number]; items: Organ[] }> = [];
    for (const sys of BODY_SYSTEMS) {
      const items = filteredAndSortedOrgans.filter((item) => item.systemId === sys.id);
      if (items.length > 0) {
        groups.push({ system: sys, items });
      }
    }
    return groups.length > 0 ? groups : null;
  }, [sortMode, systemFilter, favoritesOnly, filteredAndSortedOrgans]);

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current.querySelectorAll("[data-reveal]"),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.48, stagger: 0.035, ease: "power2.out", overwrite: true },
    );
  }, [organId]);

  const selectOrgan = (id: OrganId) => {
    if (organById[id].illustrated) {
      ["organ", "microscopic", "compare", "location"].forEach((asset) => {
        const image = new Image();
        image.src = `/anatomy/${id}/${asset}.webp`;
      });
    }
    setOrganId(id);
    recordOrganVisit(id);
    setMobileLibrary(false);
    setCompare(false);
    setQuizActive(false);
  };

  const handleOpenAddNote = (targetOrganId: string, hotspotId?: string) => {
    setNotesDraft({ organId: targetOrganId, hotspotId });
    setModal("notes");
  };

  // Warms the model in the HTTP cache while the pointer is still travelling,
  // so the switch usually renders without a visible loading pass.
  const prefetchOrgan = (id: OrganId) => {
    if (id === organId || prefetched.current.has(id)) return;
    prefetched.current.add(id);
    void fetch(organById[id].model, { priority: "low" } as RequestInit).catch(() => {});
  };

  const brandTitleText = locale.code === "fa" ? "دیجی آناتومی" : "Digi Anatomy";

  return (
    <>
      <AtelierSplashLoader
        brandTitle={brandTitleText}
        tagline={t.brand.tagline}
      />

      <div
        className="scroll-progress-indicator"
        style={{ transform: `scaleX(${scrollProgress})` }}
        aria-hidden="true"
      />

      <div className="ambient-canvas-decorations" aria-hidden="true">
        <div className="decor-orb decor-orb-1" />
        <div className="decor-orb decor-orb-2" />
        <div className="decor-grid-accent" />
      </div>

      <main className="app-shell">
        <header className="topbar">
          <button
            className="brand"
            type="button"
            onClick={() => {
              setNavView("explore");
              selectOrgan("heart");
            }}
            aria-label={t.brand.home}
          >
            <AtelierLogoIcon size={25} className="brand-crest" />
            <strong ref={brandRef}>
              {locale.dir === "rtl" || locale.script === "persian" || locale.script === "arabic" ? (
                brandTitleText.split(" ").map((word, i, arr) => (
                  <span key={i} className="brand-char brand-word">
                    {word}
                    {i < arr.length - 1 ? "\u00A0" : ""}
                  </span>
                ))
              ) : (
                brandTitleText.split("").map((ch, i) => (
                  <span key={i} className="brand-char">
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                ))
              )}
              <sup className="brand-sparkle">✦</sup>
            </strong>
            <em>{t.brand.tagline}</em>
          </button>
        <nav className="main-nav" aria-label="Primary navigation">
          <button
            className={navView === "explore" ? "active" : ""}
            onClick={() => setNavView("explore")}
          >
            <Compass size={17} /> {t.nav.explore}
          </button>
          <button
            className={navView === "systems" ? "active" : ""}
            onClick={() => {
              setNavView("systems");
              setSelectedSystemId(null);
            }}
          >
            <BrainCircuit size={17} /> {t.nav.systems}
          </button>
          <button onClick={() => setModal("lesson")}><BookOpen size={17} /> {t.nav.lessons}</button>
          <button onClick={() => {
            setNavView("explore");
            setMobileLibrary(true);
          }}><LibraryBig size={17} /> {t.nav.library}</button>
          <button
            onClick={() => {
              setNotesDraft(undefined);
              setModal("notes");
            }}
            className={`notes-nav-btn ${modal === "notes" ? "active" : ""}`}
          >
            <NotebookPen size={17} />
            <span>{t.nav.notes}</span>
            {notes.length > 0 && <span className="nav-note-count">{notes.length}</span>}
          </button>
        </nav>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search.placeholder} />
        </label>
        <LanguageSwitcher locale={locale} t={t} />
        <ThemeToggle t={t} />
        <button className="profile" aria-label={t.profile.open}><span>MA</span><ChevronDown size={15} /></button>
        <button className="mobile-library-trigger" onClick={() => setMobileLibrary(true)} aria-label={t.library.open}><LibraryBig size={20} /></button>
      </header>

      <div className="workspace">
        <aside className={`organ-library ${mobileLibrary ? "open" : ""}`}>
          <div className="panel-heading">
            <span className="panel-heading-title">
              {navView === "systems" ? t.systems.title : t.library.title}
              {navView !== "systems" && (
                <span className="library-count-tag">
                  {format(t.library.organsCount, { count: String(filteredAndSortedOrgans.length) })}
                </span>
              )}
            </span>
            <div className="panel-heading-actions">
              {navView !== "systems" && (
                <button
                  type="button"
                  aria-label={t.library.favoritesOnly}
                  title={t.library.favoritesOnly}
                  className={`library-header-btn ${favoritesOnly ? "active" : ""}`}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                >
                  <Bookmark size={15} fill={favoritesOnly ? "currentColor" : "none"} />
                  {favorites.length > 0 && <span className="fav-counter-badge">{favorites.length}</span>}
                </button>
              )}
              <button
                type="button"
                aria-label={t.notes.title}
                title={t.notes.title}
                className={`library-header-btn ${notes.length > 0 ? "has-notes" : ""}`}
                onClick={() => {
                  setNotesDraft(undefined);
                  setModal("notes");
                }}
              >
                <NotebookPen size={15} />
                {notes.length > 0 && <span className="library-note-dot" />}
              </button>
              <button aria-label={t.library.close} className="mobile-close" onClick={() => setMobileLibrary(false)}>
                <X size={17} />
              </button>
            </div>
          </div>

          {navView === "systems" ? (
            <SystemsExplorer
              organs={organs}
              activeOrganId={organId}
              selectedSystemId={selectedSystemId}
              onSelectSystem={setSelectedSystemId}
              onSelectOrgan={(id) => selectOrgan(id as OrganId)}
              t={t}
              locale={locale}
              noteCountsByOrgan={noteCountsByOrgan}
              onPrefetchOrgan={(id) => prefetchOrgan(id as OrganId)}
            />
          ) : (
            <>
              {/* Recently viewed horizontal strip */}
              {recentOrgans.length > 0 && (
                <div className="recent-organs-strip" aria-label={t.library.recentlyViewed}>
                  <div className="recent-strip-header">
                    <History size={12} />
                    <span>{t.library.recentlyViewed}</span>
                  </div>
                  <div className="recent-chips-list">
                    {recentOrgans.map((rOrgan) => (
                      <button
                        key={`recent-${rOrgan.id}`}
                        type="button"
                        className={`recent-organ-chip ${organId === rOrgan.id ? "active" : ""}`}
                        onClick={() => selectOrgan(rOrgan.id)}
                        onPointerEnter={() => prefetchOrgan(rOrgan.id)}
                        onFocus={() => prefetchOrgan(rOrgan.id)}
                        style={{ "--item-accent": rOrgan.accent } as React.CSSProperties}
                        title={rOrgan.name}
                      >
                        <span className="recent-chip-glyph">
                          <OrganArt organ={rOrgan} asset="thumb" alt="" size={22} />
                        </span>
                        <span className="recent-chip-name">{rOrgan.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sorting toolbar */}
              <div className="library-sort-bar">
                <div className="sort-pills-row" role="radiogroup" aria-label={t.library.sortBy}>
                  <button
                    type="button"
                    className={`sort-pill ${sortMode === "system" ? "active" : ""}`}
                    onClick={() => setSortMode("system")}
                  >
                    {t.library.sortBySystem}
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${sortMode === "name" ? "active" : ""}`}
                    onClick={() => setSortMode("name")}
                  >
                    {t.library.sortByName}
                  </button>
                  <button
                    type="button"
                    className={`sort-pill ${sortMode === "recent" ? "active" : ""}`}
                    onClick={() => setSortMode("recent")}
                  >
                    {t.library.sortByRecent}
                  </button>
                </div>
                {(favoritesOnly || systemFilter !== "all" || query.trim() !== "" || sortMode !== "system") && (
                  <button
                    type="button"
                    className="library-reset-btn"
                    onClick={() => {
                      setQuery("");
                      setSystemFilter("all");
                      setFavoritesOnly(false);
                      setSortMode("system");
                    }}
                    title={t.library.clearFilters}
                  >
                    <X size={11} />
                    <span>{t.library.clearFilters}</span>
                  </button>
                )}
              </div>

              {/* System Filter Chips */}
              <div className="system-filter-chips-bar">
                <button
                  type="button"
                  className={`system-chip-btn ${systemFilter === "all" ? "active" : ""}`}
                  onClick={() => setSystemFilter("all")}
                >
                  <Layers size={12} />
                  <span>{t.systems.allSystems}</span>
                </button>
                {BODY_SYSTEMS.map((sys) => {
                  const SysIcon = sys.icon;
                  const isChipActive = systemFilter === sys.id;
                  return (
                    <button
                      key={sys.id}
                      type="button"
                      className={`system-chip-btn ${isChipActive ? "active" : ""}`}
                      style={{
                        "--chip-color": sys.badgeColor,
                      } as React.CSSProperties}
                      onClick={() => setSystemFilter(isChipActive ? "all" : sys.id)}
                    >
                      <SysIcon size={12} />
                      <span>{t.systems[sys.id]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Organ Cards List or Grouped View */}
              {filteredAndSortedOrgans.length === 0 ? (
                <div className="library-empty-state">
                  {favoritesOnly ? (
                    <>
                      <div className="empty-state-icon bookmark-empty">
                        <Bookmark size={26} />
                      </div>
                      <h4 className="empty-state-title">{t.library.noFavorites}</h4>
                      <p className="empty-state-desc">{t.library.noFavoritesDesc}</p>
                      <button
                        type="button"
                        className="empty-state-btn"
                        onClick={() => setFavoritesOnly(false)}
                      >
                        {t.library.viewAll}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="empty-state-icon">
                        <Search size={26} />
                      </div>
                      <h4 className="empty-state-title">{t.library.noResults}</h4>
                      <button
                        type="button"
                        className="empty-state-btn"
                        onClick={() => {
                          setQuery("");
                          setSystemFilter("all");
                          setSortMode("system");
                        }}
                      >
                        {t.library.clearFilters}
                      </button>
                    </>
                  )}
                </div>
              ) : groupedBySystem ? (
                <div className="organ-list grouped-list">
                  {groupedBySystem.map((group) => {
                    const SysIcon = group.system.icon;
                    return (
                      <div key={group.system.id} className="system-organ-group">
                        <div
                          className="system-group-header"
                          style={{ "--group-color": group.system.badgeColor } as React.CSSProperties}
                        >
                          <span className="system-group-title">
                            <SysIcon size={13} />
                            <span>{t.systems[group.system.id]}</span>
                          </span>
                          <span className="system-group-count">{group.items.length}</span>
                        </div>
                        <div className="system-group-cards">
                          {group.items.map((item) => {
                            const isFav = favorites.includes(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                className={`organ-item ${organId === item.id ? "active" : ""} ${isFav ? "is-favorite" : ""}`}
                                onClick={() => selectOrgan(item.id)}
                                onPointerEnter={() => prefetchOrgan(item.id)}
                                onFocus={() => prefetchOrgan(item.id)}
                                style={{ "--item-accent": item.accent } as React.CSSProperties}
                              >
                                <span className="organ-accent-bar" />
                                <span className="organ-glyph">
                                  <OrganArt organ={item} asset="thumb" alt="" size={47} />
                                </span>
                                <span className="organ-meta">
                                  <b>{item.name}</b>
                                  <small>{item.system}</small>
                                </span>
                                <span className="organ-item-badges">
                                  {noteCountsByOrgan[item.id] > 0 && (
                                    <span
                                      className="organ-note-pill"
                                      title={format(t.notes.count, { count: String(noteCountsByOrgan[item.id]) })}
                                    >
                                      <NotebookPen size={11} />
                                      <span>{noteCountsByOrgan[item.id]}</span>
                                    </span>
                                  )}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className={`organ-fav-btn ${isFav ? "favorited" : ""}`}
                                    title={isFav ? t.library.removeFromFavorites : t.library.addToFavorites}
                                    aria-label={isFav ? t.library.removeFromFavorites : t.library.addToFavorites}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(item.id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        toggleFavorite(item.id);
                                      }
                                    }}
                                  >
                                    <Bookmark size={14} fill={isFav ? "currentColor" : "none"} />
                                  </span>
                                  {organId === item.id && <Heart className="favorite" size={14} fill="currentColor" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="organ-list">
                  {filteredAndSortedOrgans.map((item) => {
                    const isFav = favorites.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`organ-item ${organId === item.id ? "active" : ""} ${isFav ? "is-favorite" : ""}`}
                        onClick={() => selectOrgan(item.id)}
                        onPointerEnter={() => prefetchOrgan(item.id)}
                        onFocus={() => prefetchOrgan(item.id)}
                        style={{ "--item-accent": item.accent } as React.CSSProperties}
                      >
                        <span className="organ-accent-bar" />
                        <span className="organ-glyph">
                          <OrganArt organ={item} asset="thumb" alt="" size={47} />
                        </span>
                        <span className="organ-meta">
                          <b>{item.name}</b>
                          <small>{item.system}</small>
                        </span>
                        <span className="organ-item-badges">
                          {noteCountsByOrgan[item.id] > 0 && (
                            <span
                              className="organ-note-pill"
                              title={format(t.notes.count, { count: String(noteCountsByOrgan[item.id]) })}
                            >
                              <NotebookPen size={11} />
                              <span>{noteCountsByOrgan[item.id]}</span>
                            </span>
                          )}
                          <span
                            role="button"
                            tabIndex={0}
                            className={`organ-fav-btn ${isFav ? "favorited" : ""}`}
                            title={isFav ? t.library.removeFromFavorites : t.library.addToFavorites}
                            aria-label={isFav ? t.library.removeFromFavorites : t.library.addToFavorites}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFavorite(item.id);
                              }
                            }}
                          >
                            <Bookmark size={14} fill={isFav ? "currentColor" : "none"} />
                          </span>
                          {organId === item.id && <Heart className="favorite" size={14} fill="currentColor" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {(favoritesOnly || systemFilter !== "all" || query.trim() !== "" || sortMode !== "system") && filteredAndSortedOrgans.length > 0 && (
                <button
                  type="button"
                  className="view-all"
                  onClick={() => {
                    setQuery("");
                    setSystemFilter("all");
                    setFavoritesOnly(false);
                    setSortMode("system");
                  }}
                >
                  <span>{t.library.viewAll}</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {/* Rotating Quote Card */}
              <div className="library-quote-card">
                <div className="quote-header">
                  <span className="quote-icon-badge">
                    <Sparkles size={13} />
                  </span>
                  <span className="quote-sign">{quotes[activeQuoteIndex].sign}</span>
                </div>
                <p className="quote-text">
                  <span className="quote-l1">{quotes[activeQuoteIndex].line1}</span>
                  <strong className="quote-l2">{quotes[activeQuoteIndex].line2}</strong>
                </p>
                <div className="quote-dots" aria-label="Quote switcher">
                  {quotes.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`quote-dot ${i === activeQuoteIndex ? "active" : ""}`}
                      onClick={() => setActiveQuoteIndex(i)}
                      aria-label={`Quote ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>

        <OrganViewer
          organ={organ}
          t={t}
          autoRotate={autoRotate}
          onAutoRotate={setAutoRotate}
          compare={compare}
          onCompare={() => setCompare(!compare)}
          quizActive={quizActive}
          onQuizExit={() => setQuizActive(false)}
          notes={notes}
          onAddNote={handleOpenAddNote}
        />

        <aside className="info-panel" ref={contentRef}>
          <div className="info-kicker" data-reveal><Heart size={13} fill="currentColor" /> {format(t.info.kicker, { organ: organ.name })}</div>
          <div className="info-title-row" data-reveal>
            <div><h1>{organ.name}</h1><em>{organ.poetic}</em></div>
            <span className="specimen-stamp">
              <OrganArt organ={organ} asset="organ" alt="" size={92} />
            </span>
          </div>

          <div className="info-systems-badges" data-reveal>
            {organ.systems?.map((sysId) => {
              const sysCfg = SYSTEM_CONFIG_BY_ID[sysId];
              if (!sysCfg) return null;
              const SysIcon = sysCfg.icon;
              const isPrimary = sysId === organ.systemId;
              return (
                <button
                  key={sysId}
                  type="button"
                  className={`info-system-pill ${isPrimary ? "primary" : "secondary"}`}
                  style={{
                    "--pill-accent": sysCfg.accent,
                    "--pill-bg": sysCfg.badgeBg,
                    "--pill-border": sysCfg.badgeBorder,
                    "--pill-color": sysCfg.badgeColor,
                  } as React.CSSProperties}
                  onClick={() => {
                    setNavView("systems");
                    setSelectedSystemId(sysId);
                  }}
                  title={`${isPrimary ? t.systems.primarySystem : t.systems.secondarySystem}: ${t.systems[sysId]}`}
                >
                  <SysIcon size={13} />
                  <span>{t.systems[sysId]}</span>
                </button>
              );
            })}
          </div>

          <p className="description" data-reveal>{organ.description}</p>
          <div className="rule" />

          {noteCountsByOrgan[organ.id] > 0 && (
            <div
              className="organ-notes-badge-banner"
              data-reveal
              onClick={() => {
                setNotesDraft({ organId: organ.id });
                setModal("notes");
              }}
              role="button"
              tabIndex={0}
            >
              <div className="banner-left">
                <NotebookPen size={15} />
                <span>
                  {format(t.notes.count, { count: String(noteCountsByOrgan[organ.id]) })} {t.notes.title}
                </span>
              </div>
              <ArrowRight size={13} />
            </div>
          )}

          <h2 data-reveal>{t.info.keyFacts}</h2>
          <dl className="key-facts">
            <div data-reveal><dt><span>◇</span> {t.info.size}</dt><dd><Measure>{organ.size}</Measure></dd></div>
            <div data-reveal><dt><span>♙</span> {t.info.weight}</dt><dd><Measure>{organ.weight}</Measure></dd></div>
            <div data-reveal><dt><span>⌁</span> {t.info.daily}</dt><dd><Measure>{organ.dailyFact}</Measure></dd></div>
            <div data-reveal><dt><span>⌖</span> {t.info.location}</dt><dd><Measure>{organ.location}</Measure></dd></div>
            <div data-reveal><dt><span>❋</span> {t.info.bloodSupply}</dt><dd><Measure>{organ.bloodSupply}</Measure></dd></div>
            <div data-reveal><dt><span>◈</span> {t.info.function}</dt><dd><Measure>{organ.function}</Measure></dd></div>
          </dl>
          <div className="medical-note" data-reveal>
            <Stethoscope size={16} />
            <p>
              <b>{t.info.medical}</b>
              <TypewriterText key={`med-${organ.id}`} text={organ.medical} speedMs={12} />
            </p>
          </div>
          <div className="fun-note" data-reveal>
            <Sparkles size={15} />
            <p>
              <b>{t.info.didYouKnow}</b>
              <TypewriterText key={`fun-${organ.id}`} text={organ.funFact} speedMs={12} />
            </p>
          </div>
          <button className="lesson-button" data-reveal onClick={() => setModal("lesson")}>{t.info.viewLesson} <ArrowRight size={16} /></button>
          <div className="action-grid" data-reveal>
            <button onClick={() => setModal("animation")}><Play size={15} /> {t.info.animate}</button>
            <button onClick={() => { setQuizActive(true); setModal(null); }}><CircleHelp size={15} /> {t.info.quiz}</button>
            <button onClick={() => handleOpenAddNote(organ.id)}>
              <NotebookPen size={15} /> {t.notes.addNote}
            </button>
            <button onClick={() => setCompare(!compare)} className={compare ? "active" : ""}><Share2 size={15} /> {t.info.compare}</button>
          </div>
        </aside>
      </div>

      {compare && (
        <section className="compare-strip" aria-label={t.compare.title}>
          <div className="compare-organ"><OrganArt organ={organ} asset="thumb" alt="" /><span>{t.compare.comparing}</span><strong>{organ.name}</strong><small>{organ.system}</small></div>
          <b>{t.compare.vs}</b>
          <div className="compare-organ"><OrganArt organ={reference} asset="thumb" alt="" /><span>{t.compare.reference}</span><strong>{reference.name}</strong><small>{reference.system}</small></div>
          <dl><div><dt>{t.compare.primaryRole}</dt><dd><Measure>{organ.function}</Measure></dd></div><div><dt>{t.compare.scale}</dt><dd><Measure>{organ.size}</Measure></dd></div></dl>
          <button onClick={() => setCompare(false)} aria-label={t.compare.close}><X size={16} /></button>
        </section>
      )}

      <section className="learning-cards" aria-label={format(t.cards.resources, { organ: organ.name })}>
        <article className="curiosity-card">
          <span>✿</span><p>{t.library.quoteLine1}<br />{t.library.quoteLine2}</p><em>{t.library.quoteSign}</em>
        </article>
        <article>
          <header><div><em>{t.cards.microscopic}</em><h3>{organ.tissue}</h3></div><Microscope size={17} /></header>
          <div className="microscope-visual organ-card-image"><OrganArt organ={organ} asset="microscopic" alt="" /></div>
          <button onClick={() => setModal("lesson")}>{t.cards.exploreTissue} <ArrowRight size={14} /></button>
        </article>
        <article>
          <header><div><em>{t.cards.compareOrgans}</em><h3>{organ.comparison}</h3></div><Share2 size={17} /></header>
          <div className="comparison-visual organ-card-image"><OrganArt organ={organ} asset="compare" alt="" /></div>
          <button onClick={() => setCompare(true)}>{t.cards.openComparison} <ArrowRight size={14} /></button>
        </article>
        <article>
          <header><div><em>{t.cards.functionAnimation}</em><h3>{organ.function}</h3></div><Play size={17} /></header>
          {/* The artwork itself is the control, so the play badge inside it is
              decorative rather than a nested button. */}
          <button
            type="button"
            className="function-visual organ-card-image"
            onClick={() => setModal("animation")}
            aria-label={format(t.cards.playAria, { organ: organ.name })}
          >
            <OrganArt organ={organ} asset="organ" alt="" />
            <i className="function-pulse" />
            <span className="play-badge"><Play size={18} fill="currentColor" /></span>
          </button>
          <button onClick={() => setModal("animation")}>{t.cards.playAnimation} <ArrowRight size={14} /></button>
        </article>
        <article>
          <header><div><em>{t.cards.clinicalNotes}</em><h3>{t.cards.commonConditions}</h3></div><FileText size={17} /></header>
          <ul>{organ.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
          <button onClick={() => setModal("lesson")}>{t.cards.seeAll} <ArrowRight size={14} /></button>
        </article>
        <article className="system-card">
          <header><div><em>{t.cards.whereItWorks}</em><h3>{t.systems[organ.systemId] || organ.system}</h3></div><BrainCircuit size={17} /></header>
          <button
            type="button"
            className="system-visual organ-card-image"
            onClick={() => {
              setNavView("systems");
              setSelectedSystemId(organ.systemId);
            }}
            aria-label={format(t.cards.systemAria, { organ: organ.name })}
          >
            <OrganArt organ={organ} asset="location" alt="" />
          </button>
          <button onClick={() => {
            setNavView("systems");
            setSelectedSystemId(organ.systemId);
          }}>{t.cards.seeSystem} <ArrowRight size={14} /></button>
        </article>
      </section>

      {modal === "notes" ? (
        <NotesModal
          currentOrgan={organ}
          organs={organs}
          t={t}
          notes={notes}
          onUpdateNotes={saveNotes}
          onSelectOrgan={(id) => selectOrgan(id as OrganId)}
          onClose={() => {
            setModal(null);
            setNotesDraft(undefined);
          }}
          initialDraft={notesDraft}
        />
      ) : (
        modal && <LearningModal type={modal} organ={organ} t={t} onClose={() => setModal(null)} />
      )}
      {mobileLibrary && <button className="drawer-backdrop" aria-label={t.library.close} onClick={() => setMobileLibrary(false)} />}
    </main>
    </>
  );
}

type LearningModalType = "lesson" | "quiz" | "animation" | "system";

const MODAL_ICON: Record<LearningModalType, string> = {
  quiz: "?",
  animation: "▶",
  system: "⌖",
  lesson: "✦",
};

function LearningModal({
  type,
  organ,
  t,
  onClose,
}: {
  type: LearningModalType;
  organ: Organ;
  t: UiDictionary;
  onClose: () => void;
}) {
  const vars = { organ: organ.name, location: organ.location };
  const title =
    type === "quiz" ? format(t.modal.quizTitle, vars)
    : type === "animation" ? format(t.modal.motionTitle, vars)
    // Avoids gluing onto `system`, whose wording varies per organ, and stays
    // grammatical for the plural organs too.
    : type === "system" ? format(t.modal.bodyTitle, vars)
    : format(t.modal.insideTitle, vars);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`learning-modal ${type === "system" ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label={t.modal.close}><X size={18} /></button>
        <span className="modal-icon">{MODAL_ICON[type]}</span>
        <em>{t.modal.guided}</em>
        <h2 id="modal-title">{title}</h2>
        {type === "quiz" ? (
          <div className="quiz-options">
            <p>{format(t.modal.quizPrompt, vars)}</p>
            <button onClick={onClose}>{t.modal.quizA}</button>
            <button onClick={onClose}>{t.modal.quizB}</button>
            <button onClick={onClose}>{t.modal.quizC}</button>
          </div>
        ) : type === "system" ? (
          <>
            <p>{format(t.modal.systemIntro, vars)}</p>
            {/* Shown whole rather than cropped into the circular demo — the
                point of this view is the figure and its vessels. */}
            <figure className="modal-figure">
              <OrganArt organ={organ} asset="location" alt="" />
            </figure>
            <dl className="modal-facts">
              <div><dt>{t.modal.system}</dt><dd>{organ.system}</dd></div>
              <div><dt>{t.modal.primaryRole}</dt><dd><Measure>{organ.function}</Measure></dd></div>
              <div><dt>{t.modal.bloodSupply}</dt><dd><Measure>{organ.bloodSupply}</Measure></dd></div>
            </dl>
            <button className="lesson-button" onClick={onClose}>{t.modal.continueExploring} <ArrowRight size={16} /></button>
          </>
        ) : (
          <>
            <p>{t.modal.lessonBody}</p>
            <div className={`modal-demo ${type === "animation" ? "moving" : ""}`}><OrganArt organ={organ} asset="organ" alt="" /></div>
            <button className="lesson-button" onClick={onClose}>{t.modal.continueExploring} <ArrowRight size={16} /></button>
          </>
        )}
      </section>
    </div>
  );
}
