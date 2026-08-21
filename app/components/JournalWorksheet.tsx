"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Sparkles,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  JOURNAL_SHEETS,
  loadAllJournalData,
  saveJournalSheetData,
  resetJournalSheetData,
  getDefaultSheetData,
  type JournalSheetData,
} from "../lib/journal";
import type { UiDictionary } from "../i18n/types";

interface JournalWorksheetProps {
  initialOrganId?: string;
  t: UiDictionary;
}

export function JournalWorksheet({ initialOrganId, t }: JournalWorksheetProps) {
  // Find initial sheet index
  const initialIndex = useMemo(() => {
    if (!initialOrganId) return 0;
    const idx = JOURNAL_SHEETS.findIndex((s) => s.id === initialOrganId);
    return idx !== -1 ? idx : 0;
  }, [initialOrganId]);

  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(initialIndex);
  const [allData, setAllData] = useState<Record<string, JournalSheetData>>({});
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setAllData(loadAllJournalData());
  }, []);

  const currentSheet = JOURNAL_SHEETS[activeSheetIndex] || JOURNAL_SHEETS[0];
  const currentData: JournalSheetData = allData[currentSheet.id] || getDefaultSheetData();

  const handleUpdate = (updater: (prev: JournalSheetData) => JournalSheetData) => {
    const updated = updater(currentData);
    const newAll = { ...allData, [currentSheet.id]: updated };
    setAllData(newAll);
    saveJournalSheetData(currentSheet.id, updated);
  };

  const handleReset = () => {
    if (window.confirm("آیا مایلید تمام نوشته‌های این برگه را پاک کنید؟")) {
      resetJournalSheetData(currentSheet.id);
      const newAll = { ...allData };
      delete newAll[currentSheet.id];
      setAllData(newAll);
    }
  };

  const checklistAreaConfig = useMemo(() => {
    switch (currentSheet.id) {
      case "kidneys":
        return { top: "32.0%", left: "36.6%", width: "12.6%", height: "38.5%" };
      case "intestine":
        return { top: "32.0%", left: "37.0%", width: "12.2%", height: "40.0%" };
      case "pancreas":
        return { top: "32.0%", left: "37.0%", width: "12.2%", height: "39.0%" };
      case "eyeball":
        return { top: "32.0%", left: "41.2%", width: "8.0%", height: "27.5%" };
      case "liver":
        return { top: "32.0%", left: "40.8%", width: "8.4%", height: "38.5%" };
      case "skin":
        return { top: "32.0%", left: "40.8%", width: "8.4%", height: "38.5%" };
      case "brain":
      default:
        return { top: "31.8%", left: "40.8%", width: "8.4%", height: "37.0%" };
    }
  }, [currentSheet.id]);

  return (
    <div className="worksheet-viewer-root">
      {/* Navigation Top Toolbar */}
      <div className="worksheet-nav-toolbar">
        <div className="worksheet-sheet-switcher">
          <button
            type="button"
            className="sheet-nav-arrow"
            onClick={() =>
              setActiveSheetIndex((prev) =>
                prev > 0 ? prev - 1 : JOURNAL_SHEETS.length - 1
              )
            }
            title="برگه قبلی"
            aria-label="برگه قبلی"
          >
            <ChevronRight size={17} />
          </button>

          <div className="sheet-selector-wrap">
            <span className="sheet-current-name">
              📖 برگه {activeSheetIndex + 1} از {JOURNAL_SHEETS.length}:{" "}
              <strong>{currentSheet.nameFa}</strong> ({currentSheet.nameEn})
            </span>
            <select
              value={activeSheetIndex}
              onChange={(e) => setActiveSheetIndex(Number(e.target.value))}
              aria-label="انتخاب برگه ارگان"
              className="sheet-quick-select"
            >
              {JOURNAL_SHEETS.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {idx + 1}. {s.nameFa} ({s.nameEn})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="sheet-nav-arrow"
            onClick={() =>
              setActiveSheetIndex((prev) =>
                prev < JOURNAL_SHEETS.length - 1 ? prev + 1 : 0
              )
            }
            title="برگه بعدی"
            aria-label="برگه بعدی"
          >
            <ChevronLeft size={17} />
          </button>
        </div>

        <div className="worksheet-toolbar-actions">
          <button
            type="button"
            className="worksheet-reset-btn"
            onClick={handleReset}
            title="پاک کردن و ریست برگه فعلی"
          >
            <RotateCcw size={13} />
            <span>پاک کردن برگه</span>
          </button>
        </div>
      </div>

      {/* Interactive Sheet Canvas Container (16:9 aspect ratio) */}
      <div className="worksheet-canvas-wrapper">
        <div className="worksheet-canvas-inner">
          {/* Base Background Image */}
          <img
            key={currentSheet.image}
            src={currentSheet.image}
            alt={`کاربرگ ژورنال آناتومی ${currentSheet.nameFa}`}
            className="worksheet-base-image"
          />

          {/* OVERLAY FIELD 1: Date Input (Top-Left in LTR / Top Header) */}
          <div className="overlay-field overlay-date-field">
            <input
              type="text"
              value={currentData.date}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, date: e.target.value }))
              }
              placeholder="مثال: ۱۴۰۵/۰۲/۱۵"
              className="overlay-input overlay-input-date"
            />
          </div>

          {/* OVERLAY FIELD 2: Interactive Checklist for Main Components */}
          <div
            className="overlay-field overlay-components-checklist"
            style={
              {
                top: checklistAreaConfig.top,
                left: checklistAreaConfig.left,
                width: checklistAreaConfig.width,
                height: checklistAreaConfig.height,
              } as React.CSSProperties
            }
          >
            {Array.from({ length: currentSheet.componentsCount }).map((_, i) => {
              const isChecked = Boolean(currentData.componentsChecked[i]);
              return (
                <div
                  key={i}
                  className="component-check-row"
                  onClick={() =>
                    handleUpdate((prev) => ({
                      ...prev,
                      componentsChecked: {
                        ...prev.componentsChecked,
                        [i]: !prev.componentsChecked[i],
                      },
                    }))
                  }
                  role="button"
                  tabIndex={0}
                  title={`تیک زدن جزء ${i + 1}`}
                >
                  <span className={`component-check-box ${isChecked ? "checked" : ""}`}>
                    {isChecked && <Check size={11} strokeWidth={3.5} />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* OVERLAY FIELD 3: Function Notes (عملکرد اجزا) */}
          <div className="overlay-field overlay-function-field">
            <textarea
              value={currentData.functionNotes}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, functionNotes: e.target.value }))
              }
              placeholder="توضیحات و عملکرد فیزیولوژیک این عضو را اینجا یادداشت کنید..."
              className="overlay-textarea overlay-textarea-lines overlay-textarea-function"
            />
          </div>

          {/* OVERLAY FIELD 4: Golden Learning Tips (نکات طلایی برای یادگیری) */}
          <div className="overlay-field overlay-golden-checkboxes">
            {[0, 1, 2].map((idx) => {
              const isChecked = Boolean(currentData.goldenCheckboxes?.[idx]);
              return (
                <div
                  key={idx}
                  className="golden-check-row"
                  onClick={() =>
                    handleUpdate((prev) => {
                      const updatedBoxes = [...(prev.goldenCheckboxes || [false, false, false])];
                      updatedBoxes[idx] = !updatedBoxes[idx];
                      return { ...prev, goldenCheckboxes: updatedBoxes };
                    })
                  }
                  role="button"
                  tabIndex={0}
                  title={`تیک نکته ${idx + 1}`}
                >
                  <span className={`golden-check-box ${isChecked ? "checked" : ""}`}>
                    {isChecked && <Check size={13} strokeWidth={3.5} />}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="overlay-field overlay-golden-notes">
            <textarea
              value={currentData.goldenNotes}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, goldenNotes: e.target.value }))
              }
              placeholder="نکات مهم و طلایی کنکوری/امتحانی..."
              className="overlay-textarea overlay-textarea-lines overlay-textarea-golden"
            />
          </div>

          {/* OVERLAY FIELD 5: Common Diseases (بیماری‌ها و اختلالات شایع) */}
          <div className="overlay-field overlay-diseases-field">
            <textarea
              value={currentData.diseasesNotes}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, diseasesNotes: e.target.value }))
              }
              placeholder="بیماری‌ها، پاتولوژی‌ها و تظاهرات بالینی..."
              className="overlay-textarea overlay-textarea-diseases"
            />
          </div>

          {/* OVERLAY FIELD 6: Extra Notes (یادداشت‌های اضافی) */}
          <div className="overlay-field overlay-extra-notes-field">
            <textarea
              value={currentData.extraNotes}
              onChange={(e) =>
                handleUpdate((prev) => ({ ...prev, extraNotes: e.target.value }))
              }
              placeholder="یادداشت‌های آزاد، منابع و نکات مکمل..."
              className="overlay-textarea overlay-textarea-lines overlay-textarea-extra"
            />
          </div>

          {/* OVERLAY FIELD 7: Key Vocabulary Table (مرور واژگان کلیدی) */}
          <div className="overlay-field overlay-vocab-table">
            <div className="vocab-row">
              <input
                type="text"
                value={currentData.vocabTerms?.[0]?.term || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdate((prev) => {
                    const terms = [...(prev.vocabTerms || [{ term: "", def: "" }, { term: "", def: "" }])];
                    terms[0] = { ...terms[0], term: val };
                    return { ...prev, vocabTerms: terms };
                  });
                }}
                placeholder="واژه ۱"
                className="overlay-input overlay-vocab-input overlay-vocab-term"
              />
              <input
                type="text"
                value={currentData.vocabTerms?.[0]?.def || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdate((prev) => {
                    const terms = [...(prev.vocabTerms || [{ term: "", def: "" }, { term: "", def: "" }])];
                    terms[0] = { ...terms[0], def: val };
                    return { ...prev, vocabTerms: terms };
                  });
                }}
                placeholder="تعریف و مفهوم ۱"
                className="overlay-input overlay-vocab-input overlay-vocab-def"
              />
            </div>

            <div className="vocab-row">
              <input
                type="text"
                value={currentData.vocabTerms?.[1]?.term || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdate((prev) => {
                    const terms = [...(prev.vocabTerms || [{ term: "", def: "" }, { term: "", def: "" }])];
                    terms[1] = { ...terms[1], term: val };
                    return { ...prev, vocabTerms: terms };
                  });
                }}
                placeholder="واژه ۲"
                className="overlay-input overlay-vocab-input overlay-vocab-term"
              />
              <input
                type="text"
                value={currentData.vocabTerms?.[1]?.def || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdate((prev) => {
                    const terms = [...(prev.vocabTerms || [{ term: "", def: "" }, { term: "", def: "" }])];
                    terms[1] = { ...terms[1], def: val };
                    return { ...prev, vocabTerms: terms };
                  });
                }}
                placeholder="تعریف و مفهوم ۲"
                className="overlay-input overlay-vocab-input overlay-vocab-def"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
