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
  BookOpen,
} from "lucide-react";
import type { Organ } from "../i18n/merge";
import type { UiDictionary } from "../i18n/types";
import { format } from "../i18n/types";
import {
  NOTE_COLORS,
  createNote,
  saveNotes,
  type Note,
  type NoteColor,
} from "../lib/notes";
import { JournalWorksheet } from "./JournalWorksheet";

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
  const [activeTab, setActiveTab] = useState<"journal" | "notes">("journal");
  const [selectedFilter, setSelectedFilter] = useState<string>(
    initialDraft?.organId ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposing, setIsComposing] = useState<boolean>(Boolean(initialDraft));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form state
  const [formOrganId, setFormOrganId] = useState<string>(
    initialDraft?.organId || currentOrgan.id
  );
  const [formHotspotId, setFormHotspotId] = useState<string>(
    initialDraft?.hotspotId || ""
  );
  const [formText, setFormText] = useState<string>("");
  const [formColor, setFormColor] = useState<NoteColor>("amber");
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
    setActiveTab("notes");
    setEditingNoteId(null);
    setFormOrganId(targetOrganId || currentOrgan.id);
    setFormHotspotId(targetHotspotId || "");
    setFormText("");
    setFormColor("amber");
    setIsComposing(true);
    setSaveSuccess(false);
  };

  const handleStartEdit = (note: Note) => {
    setActiveTab("notes");
    setEditingNoteId(note.id);
    setFormOrganId(note.organId);
    setFormHotspotId(note.hotspotId || "");
    setFormText(note.text);
    setFormColor(note.color);
    setIsComposing(true);
    setSaveSuccess(false);
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
              updatedAt: Date.now(),
            }
          : n
      );
    } else {
      const newNote = createNote(formOrganId, formText, formColor, formHotspotId);
      updated = [newNote, ...notes];
    }

    saveNotes(updated);
    onUpdateNotes(updated);
    setSaveSuccess(true);

    setTimeout(() => {
      setIsComposing(false);
      setEditingNoteId(null);
      setSaveSuccess(false);
    }, 650);
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    onUpdateNotes(updated);
    setConfirmDeleteId(null);
  };

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`learning-modal notes-modal ${activeTab === "journal" ? "notes-journal-view" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label={t.modal.close}
          type="button"
        >
          <X size={18} />
        </button>

        {/* Modal Header & Tab Switcher */}
        <div className="notes-header">
          <div className="notes-title-group">
            <span className="notes-icon-badge">
              {activeTab === "journal" ? <BookOpen size={18} /> : <NotebookPen size={18} />}
            </span>
            <div>
              <h2 id="notes-modal-title" className="notes-title">
                {t.notes.title}
              </h2>
              <p className="notes-subtitle">
                {activeTab === "journal"
                  ? "دفترچه ژورنال و کاربرگ‌های اختصاصی آناتومی"
                  : format(t.notes.count, { count: String(notes.length) })}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="notes-mode-tab-group">
            <button
              type="button"
              className={`notes-mode-tab ${activeTab === "journal" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("journal");
                setIsComposing(false);
              }}
            >
              <BookOpen size={14} />
              <span>دفترچه ژورنال</span>
            </button>
            <button
              type="button"
              className={`notes-mode-tab ${activeTab === "notes" ? "active" : ""}`}
              onClick={() => setActiveTab("notes")}
            >
              <NotebookPen size={14} />
              <span>یادداشت‌های سریع</span>
              {notes.length > 0 && <span className="tab-badge">{notes.length}</span>}
            </button>
          </div>

          {activeTab === "notes" && !isComposing && (
            <button
              type="button"
              className="notes-new-btn"
              onClick={() => handleStartCompose(currentOrgan.id)}
            >
              <Plus size={15} />
              <span>{t.notes.addNote}</span>
            </button>
          )}
        </div>

        {/* Content View: Journal Sheets or Quick Notes */}
        {activeTab === "journal" ? (
          <JournalWorksheet initialOrganId={currentOrgan.id} t={t} />
        ) : (
          <>
            {/* Note Composer Form */}
            {isComposing && (
              <div className="note-composer-card">
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
                className="composer-textarea"
                autoFocus
              />
            </div>

            {/* Color Tag & Actions */}
            <div className="composer-footer">
              <div className="color-tag-picker" aria-label={t.notes.colorLabel}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`color-dot-btn ${formColor === c.id ? "active" : ""}`}
                    onClick={() => setFormColor(c.id)}
                    style={{ backgroundColor: c.accent }}
                    title={c.label}
                    aria-pressed={formColor === c.id}
                  >
                    {formColor === c.id && <Check size={11} strokeWidth={3} />}
                  </button>
                ))}
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
                  className={`composer-btn-primary ${saveSuccess ? "saved" : ""}`}
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

        {/* Filter & Search Bar */}
        {!isComposing && (
          <div className="notes-filter-bar">
            <div className="notes-organ-pills">
              <button
                type="button"
                className={`notes-pill ${selectedFilter === "all" ? "active" : ""}`}
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
                    className={`notes-pill ${selectedFilter === o.id ? "active" : ""}`}
                    onClick={() => setSelectedFilter(o.id)}
                  >
                    <span>{o.name}</span>
                    <span className="pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {notes.length > 2 && (
              <label className="notes-search-input">
                <Search size={14} />
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

        {/* Notes Cards List */}
        {!isComposing && (
          <div className="notes-list-container">
            {filteredNotes.length === 0 ? (
              <div className="notes-empty-state">
                <div className="empty-state-icon">
                  <Sparkles size={28} />
                </div>
                <h3>{t.notes.noNotesTitle}</h3>
                <p>{t.notes.noNotesDesc}</p>
                <button
                  type="button"
                  className="empty-state-btn"
                  onClick={() => handleStartCompose(currentOrgan.id)}
                >
                  <Plus size={15} />
                  <span>{t.notes.createFirst}</span>
                </button>
              </div>
            ) : (
              <div className="notes-grid">
                {filteredNotes.map((note) => {
                  const organ = organMap.get(note.organId);
                  const hotspot = organ?.hotspots.find(
                    (h) => h.id === note.hotspotId
                  );
                  const colorConfig =
                    NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                  const isConfirmingDelete = confirmDeleteId === note.id;

                  return (
                    <article
                      key={note.id}
                      className={`note-card note-card-${note.color}`}
                      style={
                        {
                          "--note-accent": colorConfig.accent,
                          "--note-bg": colorConfig.bg,
                          "--note-border": colorConfig.border,
                        } as React.CSSProperties
                      }
                    >
                      {/* Top metadata row */}
                      <header className="note-card-header">
                        <div className="note-tags">
                          <button
                            type="button"
                            className="note-organ-tag"
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
                            <span className="note-hotspot-tag">
                              ✦ {hotspot.label}
                            </span>
                          )}
                        </div>

                        <span className="note-date">
                          <Calendar size={12} />
                          <span>{formatDate(note.updatedAt)}</span>
                        </span>
                      </header>

                      {/* Note Content */}
                      <p className="note-card-text">{note.text}</p>

                      {/* Note Card Footer */}
                      <footer className="note-card-footer">
                        <button
                          type="button"
                          className="note-jump-btn"
                          onClick={() => {
                            onSelectOrgan(note.organId as Organ["id"]);
                            onClose();
                          }}
                        >
                          <span>{t.notes.goToOrgan}</span>
                          <ArrowRight size={13} />
                        </button>

                        <div className="note-card-actions">
                          {isConfirmingDelete ? (
                            <div className="delete-confirm-group">
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
                                className="note-action-icon-btn"
                                onClick={() => handleStartEdit(note)}
                                title={t.notes.editNote}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                className="note-action-icon-btn delete-btn"
                                onClick={() => setConfirmDeleteId(note.id)}
                                title={t.notes.deleteNote}
                              >
                                <Trash2 size={14} />
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
        </>
      )}
      </section>
    </div>
  );
}
