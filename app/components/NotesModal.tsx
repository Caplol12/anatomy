"use client";

import { useMemo, useState } from "react";
import {
  NotebookPen,
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Star,
  CheckSquare,
  Square,
  Stethoscope,
  Lightbulb,
  CheckCircle2,
  Microscope,
} from "lucide-react";
import type { Organ } from "../i18n/merge";
import type { UiDictionary } from "../i18n/types";
import { format } from "../i18n/types";
import {
  NOTE_COLORS,
  createNote,
  saveNotes,
  getNoteColorConfig,
  type Note,
  type NoteColor,
  type NoteCategory,
} from "../lib/notes";

interface NotesModalProps {
  currentOrgan: Organ;
  organs: Organ[];
  t: UiDictionary;
  notes: Note[];
  onUpdateNotes: (notes: Note[]) => void;
  onSelectOrgan: (id: Organ["id"]) => void;
  onClose: () => void;
  initialDraft?: { organId: string; hotspotId?: string };
}

const STUDY_MOODS = [
  { id: "focus", icon: "🎯", labelFa: "تمرکز عمیق", labelEn: "Deep Focus" },
  { id: "exam", icon: "⚡", labelFa: "نکات امتحانی", labelEn: "Exam Prep" },
  { id: "clinical", icon: "🩺", labelFa: "دیدگاه بالینی", labelEn: "Clinical" },
  { id: "explore", icon: "💡", labelFa: "ایده و کاوش", labelEn: "Exploring" },
];

const NOTE_TEMPLATES = [
  {
    id: "clinical",
    icon: Stethoscope,
    labelFa: "نکته بالینی",
    labelEn: "Clinical",
    color: "sakura" as NoteColor,
    category: "clinical" as NoteCategory,
    getText: (organName: string) =>
      `🩺 نکات بالینی (${organName}):\n• نشانه یا علامت بالینی شایع:\n• پاتولوژی و بیماری مرتبط:\n• نکته کلیدی تشخیصی:`,
  },
  {
    id: "highyield",
    icon: Lightbulb,
    labelFa: "نکته طلایی",
    labelEn: "High-Yield",
    color: "lemon" as NoteColor,
    category: "highyield" as NoteCategory,
    getText: (organName: string) =>
      `⚡ نکته پرتکرار آزمون (${organName}):\n★ مهم‌ترین نکته آناتومیک:\n★ تله تستی یا استثنای ساختاری:`,
  },
  {
    id: "checklist",
    icon: CheckCircle2,
    labelFa: "چک‌لیست تسلط",
    labelEn: "Checklist",
    color: "mint" as NoteColor,
    category: "checklist" as NoteCategory,
    getText: (organName: string) =>
      `📋 چک‌لیست تسلط بر ${organName}:\n[ ] ساختار و موقعیت قرارگیری\n[ ] شریان‌ها، وریدها و خون‌رسانی\n[ ] عصب‌دهی و کارکرد فیزیولوژیک\n[ ] بیماری‌ها و ارتباط بالینی`,
  },
  {
    id: "histology",
    icon: Microscope,
    labelFa: "بافت‌شناسی",
    labelEn: "Histology",
    color: "lavender" as NoteColor,
    category: "histology" as NoteCategory,
    getText: (organName: string) =>
      `🔬 ساختار بافتی (${organName}):\n• نوع بافت پوششی / سلول‌ها:\n• لایه‌های اصلی بافت:\n• مشخصه ویژه زیر میکروسکوپ:`,
  },
];

export function NotesModal({
  currentOrgan,
  organs,
  t,
  notes,
  onUpdateNotes,
  onSelectOrgan,
  onClose,
  initialDraft,
}: NotesModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>(
    initialDraft?.organId ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposing, setIsComposing] = useState<boolean>(Boolean(initialDraft));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<string>("focus");

  // Form state
  const [formOrganId, setFormOrganId] = useState<string>(
    initialDraft?.organId || currentOrgan.id
  );
  const [formHotspotId, setFormHotspotId] = useState<string>(
    initialDraft?.hotspotId || ""
  );
  const [formText, setFormText] = useState<string>("");
  const [formColor, setFormColor] = useState<NoteColor>("lemon");
  const [formRating, setFormRating] = useState<number>(0);
  const [formCategory, setFormCategory] = useState<NoteCategory>("general");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const organMap = useMemo(() => {
    return new Map<string, Organ>(organs.map((o) => [o.id, o]));
  }, [organs]);

  const activeFormOrgan = organMap.get(formOrganId) || currentOrgan;

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (selectedFilter !== "all" && n.organId !== selectedFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const organName = organMap.get(n.organId)?.name?.toLowerCase() || "";
          const hotspotName =
            organMap.get(n.organId)?.hotspots?.find((h) => h.id === n.hotspotId)?.label?.toLowerCase() || "";
          const textMatch = n.text.toLowerCase().includes(q);
          return textMatch || organName.includes(q) || hotspotName.includes(q);
        }
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedFilter, searchQuery, organMap]);

  // Counts by organ
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      counts[note.organId] = (counts[note.organId] || 0) + 1;
    }
    return counts;
  }, [notes]);

  const handleStartCompose = (targetOrganId?: string, targetHotspotId?: string) => {
    setEditingNoteId(null);
    setFormOrganId(targetOrganId || currentOrgan.id);
    setFormHotspotId(targetHotspotId || "");
    setFormText("");
    setFormColor("lemon");
    setFormRating(0);
    setFormCategory("general");
    setIsComposing(true);
    setSaveSuccess(false);
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setFormOrganId(note.organId);
    setFormHotspotId(note.hotspotId || "");
    setFormText(note.text);
    setFormColor(note.color);
    setFormRating(note.rating || 0);
    setFormCategory(note.category || "general");
    setIsComposing(true);
    setSaveSuccess(false);
  };

  const handleApplyTemplate = (template: typeof NOTE_TEMPLATES[0]) => {
    const organName = activeFormOrgan.name;
    const templateContent = template.getText(organName);
    setFormText((prev) => (prev.trim() ? `${prev}\n\n${templateContent}` : templateContent));
    setFormColor(template.color);
    setFormCategory(template.category);
  };

  const handleSave = () => {
    if (!formText.trim()) return;

    let updated: Note[];
    if (editingNoteId) {
      updated = notes.map((n) =>
        n.id === editingNoteId
          ? {
              ...n,
              organId: formOrganId,
              hotspotId: formHotspotId || undefined,
              text: formText.trim(),
              color: formColor,
              rating: formRating,
              category: formCategory,
              updatedAt: Date.now(),
            }
          : n
      );
    } else {
      const newNote = createNote(
        formOrganId,
        formText,
        formColor,
        formHotspotId,
        formRating,
        formCategory
      );
      updated = [newNote, ...notes];
    }

    saveNotes(updated);
    onUpdateNotes(updated);
    setSaveSuccess(true);

    setTimeout(() => {
      setIsComposing(false);
      setEditingNoteId(null);
      setSaveSuccess(false);
    }, 600);
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    onUpdateNotes(updated);
    setConfirmDeleteId(null);
  };

  const handleToggleChecklistLine = (note: Note, lineIndex: number) => {
    const lines = note.text.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    if (line.includes("[ ]")) {
      lines[lineIndex] = line.replace("[ ]", "[x]");
    } else if (line.includes("[x]")) {
      lines[lineIndex] = line.replace("[x]", "[ ]");
    } else {
      return;
    }

    const updatedText = lines.join("\n");
    const updated = notes.map((n) =>
      n.id === note.id ? { ...n, text: updatedText, updatedAt: Date.now() } : n
    );
    saveNotes(updated);
    onUpdateNotes(updated);
  };

  const handleUpdateRating = (note: Note, newRating: number) => {
    const finalRating = note.rating === newRating ? 0 : newRating;
    const updated = notes.map((n) =>
      n.id === note.id ? { ...n, rating: finalRating, updatedAt: Date.now() } : n
    );
    saveNotes(updated);
    onUpdateNotes(updated);
  };

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const currentDateDisplay = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Study Log";
    }
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="learning-modal notes-modal journal-planner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Spiral Binder Spine on Edge */}
        <div className="journal-spiral-spine" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="spiral-ring-unit">
              <span className="punch-hole" />
              <span className="spiral-wire" />
            </div>
          ))}
        </div>

        {/* Inner Journal Page Container */}
        <div className="journal-page-content">
          <button
            className="modal-close journal-close-btn"
            onClick={onClose}
            aria-label={t.modal.close}
            type="button"
          >
            <X size={18} />
          </button>

          {/* Top Journal Planner Header */}
          <div className="journal-header">
            <div className="journal-meta-row">
              <div className="journal-date-badge">
                <Calendar size={13} />
                <span>{currentDateDisplay}</span>
              </div>

              {/* Study Mood Selector */}
              <div className="journal-mood-group" title="وضعیت مطالعه / Study Focus">
                {STUDY_MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    className={`journal-mood-btn ${activeMood === mood.id ? "active" : ""}`}
                    onClick={() => setActiveMood(mood.id)}
                    title={mood.labelFa}
                  >
                    <span>{mood.icon}</span>
                    <span className="mood-label">{mood.labelFa}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="journal-title-bar">
              <div className="notes-title-group">
                <span className="journal-icon-crest">
                  <NotebookPen size={18} />
                </span>
                <div>
                  <h2 id="notes-modal-title" className="notes-title journal-font-title">
                    {t.notes.title}
                  </h2>
                  <p className="notes-subtitle">
                    {format(t.notes.count, { count: String(notes.length) })}
                  </p>
                </div>
              </div>

              {!isComposing && (
                <button
                  type="button"
                  className="journal-new-note-btn"
                  onClick={() => handleStartCompose(currentOrgan.id)}
                >
                  <Plus size={15} />
                  <span>{t.notes.addNote}</span>
                </button>
              )}
            </div>
          </div>

          {/* Note Composer Form */}
          {isComposing && (
            <div className="journal-composer-card">
              <div className="washi-tape-accent" />
              <div className="composer-header">
                <span className="composer-title">
                  {editingNoteId ? t.notes.editNote : t.notes.addNote}
                </span>
                <button
                  type="button"
                  className="composer-cancel-btn"
                  onClick={() => {
                    setIsComposing(false);
                    setEditingNoteId(null);
                  }}
                  aria-label={t.notes.cancel}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Quick Note Templates */}
              <div className="composer-templates-bar">
                <span className="templates-label">
                  <Sparkles size={12} /> قالب‌های آماده:
                </span>
                <div className="templates-pills">
                  {NOTE_TEMPLATES.map((tmpl) => {
                    const TIcon = tmpl.icon;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        className="template-pill-btn"
                        onClick={() => handleApplyTemplate(tmpl)}
                      >
                        <TIcon size={12} />
                        <span>{tmpl.labelFa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Organ & Hotspot Selectors */}
              <div className="composer-selectors">
                <div className="composer-field">
                  <label htmlFor="note-organ-select">
                    <Layers size={13} /> {t.notes.noteForOrgan}
                  </label>
                  <select
                    id="note-organ-select"
                    value={formOrganId}
                    onChange={(e) => {
                      setFormOrganId(e.target.value);
                      setFormHotspotId("");
                    }}
                    className="composer-select"
                  >
                    {organs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeFormOrgan.hotspots.length > 0 && (
                  <div className="composer-field">
                    <label htmlFor="note-hotspot-select">
                      <span>✦</span> {t.notes.noteForHotspot}
                    </label>
                    <select
                      id="note-hotspot-select"
                      value={formHotspotId}
                      onChange={(e) => setFormHotspotId(e.target.value)}
                      className="composer-select"
                    >
                      <option value="">{t.notes.generalNote}</option>
                      {activeFormOrgan.hotspots.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="composer-textarea-wrap">
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder={t.notes.placeholder}
                  rows={4}
                  className="composer-textarea journal-textarea"
                  autoFocus
                />
              </div>

              {/* Footer: Color Picker & Rating & Actions */}
              <div className="journal-composer-footer">
                <div className="composer-sub-controls">
                  {/* Pastel Color Picker */}
                  <div className="color-tag-picker" aria-label={t.notes.colorLabel}>
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`pastel-color-dot ${formColor === c.id ? "active" : ""}`}
                        onClick={() => setFormColor(c.id)}
                        style={{ backgroundColor: c.accent }}
                        title={c.label}
                        aria-pressed={formColor === c.id}
                      >
                        {formColor === c.id && <Check size={11} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>

                  {/* Rating Stars Selector */}
                  <div className="composer-stars-picker" title="میزان تسلط">
                    <span className="stars-label">تسلط:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-pick-btn ${formRating >= star ? "filled" : ""}`}
                        onClick={() => setFormRating(formRating === star ? 0 : star)}
                        title={`${star} ستاره`}
                      >
                        <Star size={14} fill={formRating >= star ? "#f59e0b" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="composer-actions">
                  <button
                    type="button"
                    className="composer-btn-secondary"
                    onClick={() => {
                      setIsComposing(false);
                      setEditingNoteId(null);
                    }}
                  >
                    {t.notes.cancel}
                  </button>
                  <button
                    type="button"
                    className={`journal-btn-primary ${saveSuccess ? "saved" : ""}`}
                    onClick={handleSave}
                    disabled={!formText.trim()}
                  >
                    {saveSuccess ? (
                      <>
                        <Check size={15} />
                        <span>{t.notes.savedSuccess}</span>
                      </>
                    ) : (
                      <span>{t.notes.saveNote}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs & Search Bar */}
          {!isComposing && (
            <div className="journal-filter-bar">
              <div className="journal-tab-pills">
                <button
                  type="button"
                  className={`journal-tab-pill ${selectedFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedFilter("all")}
                >
                  <span>{t.notes.allOrgans}</span>
                  <span className="pill-count">{notes.length}</span>
                </button>
                {organs.map((o) => {
                  const count = noteCounts[o.id] || 0;
                  if (count === 0 && selectedFilter !== o.id) return null;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`journal-tab-pill ${selectedFilter === o.id ? "active" : ""}`}
                      onClick={() => setSelectedFilter(o.id)}
                    >
                      <span>{o.name}</span>
                      <span className="pill-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {notes.length > 2 && (
                <label className="journal-search-input">
                  <Search size={13} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search.placeholder}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label={t.notes.cancel}
                    >
                      <X size={12} />
                    </button>
                  )}
                </label>
              )}
            </div>
          )}

          {/* Sticky Notes Grid */}
          {!isComposing && (
            <div className="journal-notes-container">
              {filteredNotes.length === 0 ? (
                <div className="journal-empty-state">
                  <div className="empty-state-journal-icon">
                    <Sparkles size={28} />
                  </div>
                  <h3>{t.notes.noNotesTitle}</h3>
                  <p>{t.notes.noNotesDesc}</p>
                  <button
                    type="button"
                    className="journal-empty-create-btn"
                    onClick={() => handleStartCompose(currentOrgan.id)}
                  >
                    <Plus size={15} />
                    <span>{t.notes.createFirst}</span>
                  </button>
                </div>
              ) : (
                <div className="journal-notes-grid">
                  {filteredNotes.map((note) => {
                    const organ = organMap.get(note.organId);
                    const hotspot = organ?.hotspots.find((h) => h.id === note.hotspotId);
                    const colorConfig = getNoteColorConfig(note.color);
                    const isConfirmingDelete = confirmDeleteId === note.id;

                    const lines = note.text.split("\n");
                    const hasChecklist = lines.some(
                      (l) => l.includes("[ ]") || l.includes("[x]")
                    );

                    return (
                      <article
                        key={note.id}
                        className={`journal-sticky-card card-color-${note.color}`}
                        style={
                          {
                            "--card-accent": colorConfig.accent,
                            "--card-bg": colorConfig.bg,
                            "--card-border": colorConfig.border,
                            "--card-tape": colorConfig.tape,
                          } as React.CSSProperties
                        }
                      >
                        {/* Washi Tape Header Stripe */}
                        <div className="sticky-washi-tape" aria-hidden="true" />

                        {/* Card Header */}
                        <header className="sticky-card-header">
                          <div className="sticky-tags-row">
                            <button
                              type="button"
                              className="sticky-organ-tag"
                              onClick={() => {
                                onSelectOrgan(note.organId as Organ["id"]);
                                onClose();
                              }}
                              title={t.notes.goToOrgan}
                            >
                              <span>{organ?.name || note.organId}</span>
                              <ArrowRight size={11} />
                            </button>

                            {hotspot && (
                              <span className="sticky-hotspot-tag">
                                ✦ {hotspot.label}
                              </span>
                            )}
                          </div>

                          <div className="sticky-header-right">
                            {/* Star Rating Display & Toggle */}
                            <div className="sticky-stars-row" title="میزان تسلط">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="sticky-star-btn"
                                  onClick={() => handleUpdateRating(note, s)}
                                  title={`${s} ستاره`}
                                >
                                  <Star
                                    size={12}
                                    fill={(note.rating || 0) >= s ? "#f59e0b" : "none"}
                                    color={(note.rating || 0) >= s ? "#f59e0b" : "currentColor"}
                                  />
                                </button>
                              ))}
                            </div>

                            <span className="sticky-date">
                              <Calendar size={11} />
                              <span>{formatDate(note.updatedAt)}</span>
                            </span>
                          </div>
                        </header>

                        {/* Card Text / Interactive Checklist */}
                        <div className="sticky-card-body">
                          {hasChecklist ? (
                            <div className="sticky-checklist-lines">
                              {lines.map((line, lineIdx) => {
                                const isUnchecked = line.includes("[ ]");
                                const isChecked = line.includes("[x]");
                                if (isUnchecked || isChecked) {
                                  const textOnly = line.replace(/\[[ x]\]\s*/, "");
                                  return (
                                    <div
                                      key={lineIdx}
                                      className={`checklist-item ${isChecked ? "done" : ""}`}
                                      onClick={() => handleToggleChecklistLine(note, lineIdx)}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      <span className="checklist-box">
                                        {isChecked ? (
                                          <CheckSquare size={14} className="box-checked" />
                                        ) : (
                                          <Square size={14} className="box-unchecked" />
                                        )}
                                      </span>
                                      <span className="checklist-text">{textOnly}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <p key={lineIdx} className="checklist-non-item-line">
                                    {line}
                                  </p>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="sticky-text-content">{note.text}</p>
                          )}
                        </div>

                        {/* Card Footer */}
                        <footer className="sticky-card-footer">
                          <button
                            type="button"
                            className="sticky-jump-link"
                            onClick={() => {
                              onSelectOrgan(note.organId as Organ["id"]);
                              onClose();
                            }}
                          >
                            <span>{t.notes.goToOrgan}</span>
                            <ArrowRight size={12} />
                          </button>

                          <div className="sticky-card-actions">
                            {isConfirmingDelete ? (
                              <div className="sticky-delete-confirm">
                                <span className="delete-confirm-label">
                                  {t.notes.confirmDelete}
                                </span>
                                <button
                                  type="button"
                                  className="confirm-delete-yes"
                                  onClick={() => handleDelete(note.id)}
                                >
                                  {t.notes.deleteNote}
                                </button>
                                <button
                                  type="button"
                                  className="confirm-delete-no"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  {t.notes.cancel}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="sticky-action-btn"
                                  onClick={() => handleStartEdit(note)}
                                  title={t.notes.editNote}
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="sticky-action-btn delete-btn"
                                  onClick={() => setConfirmDeleteId(note.id)}
                                  title={t.notes.deleteNote}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
