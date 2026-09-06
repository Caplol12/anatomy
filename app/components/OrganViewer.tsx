"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Box,
  CircleDashed,
  Layers3,
  Maximize2,
  RotateCcw,
  ScanLine,
  Search,
  Check,
  Crosshair,
  Sparkles,
  X,
  Timer,
  Trophy,
  BookOpen,
  Share2,
  SlidersHorizontal,
  Award,
  Clock,
  Compass,
  Play,
  NotebookPen,
} from "lucide-react";
import type { Hotspot, Organ } from "../i18n/merge";
import { format, type UiDictionary } from "../i18n/types";
import type { AnatomyViewer } from "../lib/three/viewer";
import type { Note } from "../lib/notes";

type Props = {
  organ: Organ;
  t: UiDictionary;
  autoRotate: boolean;
  onAutoRotate: (enabled: boolean) => void;
  compare: boolean;
  onCompare: () => void;
  quizActive: boolean;
  onQuizExit: () => void;
  notes?: Note[];
  onAddNote?: (organId: string, hotspotId?: string) => void;
};

/** Fisher–Yates. The quiz asks for every structure once, in a fresh order. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type PickRef = { current: (hotspot: Hotspot) => void };

type QuizMode = "standard" | "timed" | "practice";
type QuizDifficulty = "easy" | "hard";
type QuizPhase = "setup" | "playing" | "finished";

type QuizRecord = {
  bestScore: number;
  totalPossible: number;
  fastestSeconds?: number;
  lastPlayed: number;
};

const QUIZ_STORAGE_KEY = "anatomy_quiz_records_v1";

let cachedQuizRaw: string | null = null;
let cachedQuizData: Record<string, QuizRecord> = {};
const EMPTY_QUIZ_RECORDS: Record<string, QuizRecord> = {};

function subscribeQuiz(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-quiz-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-quiz-change", callback);
  };
}

function getQuizSnapshot(): Record<string, QuizRecord> {
  if (typeof window === "undefined") return EMPTY_QUIZ_RECORDS;
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY) || "{}";
    if (raw !== cachedQuizRaw) {
      cachedQuizRaw = raw;
      const parsed = JSON.parse(raw);
      cachedQuizData = typeof parsed === "object" && parsed !== null ? parsed : {};
    }
    return cachedQuizData;
  } catch {
    return EMPTY_QUIZ_RECORDS;
  }
}

function getQuizServerSnapshot(): Record<string, QuizRecord> {
  return EMPTY_QUIZ_RECORDS;
}

function saveOrganRecord(organId: string, score: number, total: number, timeSec: number): { isNewBest: boolean; isNewFastest: boolean } {
  if (typeof window === "undefined") return { isNewBest: false, isNewFastest: false };
  try {
    const data = { ...getQuizSnapshot() };
    const prev: QuizRecord | undefined = data[organId];
    let isNewBest = false;
    let isNewFastest = false;

    if (!prev || score > prev.bestScore) {
      isNewBest = true;
    }
    if (score === total && (!prev?.fastestSeconds || timeSec < prev.fastestSeconds)) {
      isNewFastest = true;
    }

    data[organId] = {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      totalPossible: total,
      fastestSeconds:
        score === total
          ? Math.min(prev?.fastestSeconds ?? Infinity, timeSec)
          : prev?.fastestSeconds,
      lastPlayed: Date.now(),
    };
    const raw = JSON.stringify(data);
    localStorage.setItem(QUIZ_STORAGE_KEY, raw);
    cachedQuizRaw = raw;
    cachedQuizData = data;
    window.dispatchEvent(new Event("local-quiz-change"));
    return { isNewBest, isNewFastest };
  } catch {
    return { isNewBest: false, isNewFastest: false };
  }
}

const QUESTION_TIME_LIMIT = 12; // 12 seconds per question in timed mode

/**
 * The labelling quiz. Owns its own round state and is mounted with a `key` per
 * organ, so switching specimens restarts it without a resetting effect.
 */
function LabelQuiz({
  organ,
  hotspots,
  t,
  pickRef,
  flash,
  screenY,
  getHotspotPos,
  onExit,
}: {
  organ: Organ;
  hotspots: Hotspot[];
  t: UiDictionary;
  pickRef: PickRef;
  flash: (id: string, correct: boolean) => void;
  screenY: (id: string) => number | null;
  getHotspotPos: (id: string) => { x: number; y: number } | null;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [mode, setMode] = useState<QuizMode>("standard");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("easy");
  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [speedBonus, setSpeedBonus] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [answer, setAnswer] = useState<{ correct: boolean; picked: string; target: string; atTop: boolean; timeout?: boolean } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [history, setHistory] = useState<Array<{ target: Hotspot; picked: string; correct: boolean }>>([]);
  const [errorCurve, setErrorCurve] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const quizRecords = useSyncExternalStore(subscribeQuiz, getQuizSnapshot, getQuizServerSnapshot);
  const record = quizRecords[organ.id] ?? null;
  const [newRecordAlert, setNewRecordAlert] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const order = useMemo(() => shuffle(hotspots), [hotspots, seed]);
  const target = order[step];

  // Start round
  const startQuiz = (selectedMode: QuizMode = mode, selectedDifficulty: QuizDifficulty = difficulty) => {
    setMode(selectedMode);
    setDifficulty(selectedDifficulty);
    setPhase("playing");
    setStep(0);
    setScore(0);
    setSpeedBonus(0);
    setResults([]);
    setHistory([]);
    setAnswer(null);
    setErrorCurve(null);
    setTimeRemaining(QUESTION_TIME_LIMIT);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setNewRecordAlert(false);
    setSeed((s) => s + 1);
  };

  // Finish round
  const finishQuiz = useCallback((finalScore: number) => {
    setPhase("finished");
    const totalTime = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setElapsedSeconds(totalTime);

    if (mode !== "practice") {
      const { isNewBest, isNewFastest } = saveOrganRecord(organ.id, finalScore, order.length, totalTime);
      if (isNewBest || isNewFastest) {
        setNewRecordAlert(true);
      }
    }
  }, [startTime, mode, organ.id, order.length]);

  // Handle timeout in timed mode
  const handleTimeout = useCallback(() => {
    if (!target || answer) return;
    flash(target.id, true);
    const revealed = screenY(target.id);

    setAnswer({
      correct: false,
      picked: t.quiz.wrong,
      target: target.label,
      atTop: (revealed ?? 0) > 0.55,
      timeout: true,
    });
    setResults((list) => [...list, false]);
    setHistory((list) => [...list, { target, picked: t.quiz.wrong, correct: false }]);

    window.setTimeout(() => {
      setAnswer(null);
      setErrorCurve(null);
      setTimeRemaining(QUESTION_TIME_LIMIT);
      if (step + 1 >= order.length) {
        finishQuiz(score);
      } else {
        setStep((v) => v + 1);
      }
    }, 2200);
  }, [target, answer, flash, screenY, t.quiz.wrong, order.length, step, finishQuiz, score]);

  // Timed mode countdown ticker
  useEffect(() => {
    if (phase !== "playing" || mode !== "timed" || !target || answer) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, mode, target, answer, handleTimeout]);

  // Refreshed after every render so the viewer's long-lived callback always
  // sees the current question.
  useEffect(() => {
    pickRef.current = (hotspot) => {
      if (phase !== "playing" || !target || answer) return; // ignore extra clicks while feedback shows

      const correct = hotspot.id === target.id;
      flash(hotspot.id, correct);

      // In practice mode, incorrect answers don't penalize; they just guide
      if (!correct) {
        flash(target.id, true);
        const pickedPos = getHotspotPos(hotspot.id);
        const targetPos = getHotspotPos(target.id);
        if (pickedPos && targetPos) {
          setErrorCurve({ from: pickedPos, to: targetPos });
        }
      }

      // Calculate speed bonus in timed mode
      if (correct && mode === "timed") {
        const bonus = Math.max(10, Math.round((timeRemaining / QUESTION_TIME_LIMIT) * 60));
        setSpeedBonus((prev) => prev + bonus);
      }

      const revealed = screenY(correct ? hotspot.id : target.id);
      setAnswer({
        correct,
        picked: hotspot.label,
        target: target.label,
        atTop: (revealed ?? 0) > 0.55,
      });

      const nextScore = correct ? score + 1 : score;
      if (mode !== "practice") {
        setResults((list) => [...list, correct]);
        if (correct) setScore((value) => value + 1);
      } else {
        setResults((list) => [...list, true]); // Practice gives continuous positive flow
        if (correct) setScore((value) => value + 1);
      }

      setHistory((list) => [...list, { target, picked: hotspot.label, correct }]);

      window.setTimeout(
        () => {
          setAnswer(null);
          setErrorCurve(null);
          setTimeRemaining(QUESTION_TIME_LIMIT);
          if (step + 1 >= order.length) {
            finishQuiz(nextScore);
          } else {
            setStep((value) => value + 1);
          }
        },
        correct ? 1300 : 2500, // a miss carries more to read
      );
    };
  });

  const handleShare = () => {
    const accuracy = order.length > 0 ? Math.round((score / order.length) * 100) : 0;
    const modeLabel = mode === "timed" ? t.quiz.timedMode : mode === "practice" ? t.quiz.practiceMode : t.quiz.standardMode;
    const shareText = `🎯 Digi Anatomy — ${organ.name} Quiz (${modeLabel})\n` +
      `🏆 Score: ${score}/${order.length} (${accuracy}%)\n` +
      (mode === "timed" ? `⏱️ Time: ${elapsedSeconds}s | ⚡ Speed Bonus: +${speedBonus}\n` : `⏱️ Time: ${elapsedSeconds}s\n`) +
      `✨ Test your anatomical knowledge in interactive 3D!`;

    if (navigator.share) {
      navigator.share({ title: `${organ.name} Quiz Result`, text: shareText }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Medal indicator
  const accuracyPct = order.length > 0 ? Math.round((score / order.length) * 100) : 0;
  const isPerfect = score === order.length && order.length > 0 && mode !== "practice";

  return (
    <>
      {/* 2D Error Vector Overlay from picked structure to correct target */}
      {errorCurve && (
        <svg className="quiz-error-overlay" aria-hidden="true">
          <defs>
            <linearGradient id="quizErrorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1584f" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.9" />
            </linearGradient>
            <filter id="quizGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 1 1 L 7 4 L 1 7 Z" fill="#0d9488" />
            </marker>
          </defs>
          {/* Quadratic Bezier Curve with arched midpoint */}
          {(() => {
            const dx = errorCurve.to.x - errorCurve.from.x;
            const dy = errorCurve.to.y - errorCurve.from.y;
            const midX = (errorCurve.from.x + errorCurve.to.x) / 2 - dy * 0.15;
            const midY = (errorCurve.from.y + errorCurve.to.y) / 2 + dx * 0.15 - 30;
            return (
              <>
                <path
                  d={`M ${errorCurve.from.x} ${errorCurve.from.y} Q ${midX} ${midY} ${errorCurve.to.x} ${errorCurve.to.y}`}
                  className="quiz-error-curve"
                  filter="url(#quizGlow)"
                  markerEnd="url(#arrowHead)"
                />
                {/* Red pulse on wrong pick */}
                <circle cx={errorCurve.from.x} cy={errorCurve.from.y} r="14" className="quiz-error-origin" />
                <circle cx={errorCurve.from.x} cy={errorCurve.from.y} r="5" fill="#d1584f" />
                {/* Green beacon on target */}
                <circle cx={errorCurve.to.x} cy={errorCurve.to.y} r="18" className="quiz-error-target" />
                <circle cx={errorCurve.to.x} cy={errorCurve.to.y} r="6" fill="#0d9488" />
              </>
            );
          })()}
        </svg>
      )}

      {/* PHASE: SETUP / MODE SELECTOR */}
      {phase === "setup" && (
        <div className="quiz-setup-dialog" role="dialog" aria-modal="true">
          <div className="quiz-setup-header">
            <div className="quiz-badge-icon">
              <Sparkles size={22} className="text-teal-600" />
            </div>
            <div>
              <h3>{organ.name}</h3>
              <p>{t.quiz.start}</p>
            </div>
            <button type="button" className="quiz-close-btn" onClick={onExit} aria-label={t.quiz.exit}>
              <X size={16} />
            </button>
          </div>

          <div className="quiz-setup-section">
            <label className="quiz-section-label">{t.quiz.mode}</label>
            <div className="quiz-mode-grid">
              <button
                type="button"
                className={`quiz-mode-pill ${mode === "standard" ? "active" : ""}`}
                onClick={() => setMode("standard")}
              >
                <Trophy size={16} />
                <div>
                  <strong>{t.quiz.standardMode}</strong>
                  <small>{format(t.quiz.progress, { current: "1", total: String(hotspots.length) })}</small>
                </div>
              </button>

              <button
                type="button"
                className={`quiz-mode-pill ${mode === "timed" ? "active" : ""}`}
                onClick={() => setMode("timed")}
              >
                <Timer size={16} />
                <div>
                  <strong>{t.quiz.timedMode}</strong>
                  <small>{t.quiz.timedDesc}</small>
                </div>
              </button>

              <button
                type="button"
                className={`quiz-mode-pill ${mode === "practice" ? "active" : ""}`}
                onClick={() => setMode("practice")}
              >
                <BookOpen size={16} />
                <div>
                  <strong>{t.quiz.practiceMode}</strong>
                  <small>{t.quiz.practiceDesc}</small>
                </div>
              </button>
            </div>
          </div>

          <div className="quiz-setup-section">
            <label className="quiz-section-label">{t.quiz.difficulty}</label>
            <div className="quiz-difficulty-toggle">
              <button
                type="button"
                className={`quiz-diff-btn ${difficulty === "easy" ? "active" : ""}`}
                onClick={() => setDifficulty("easy")}
              >
                <strong>{t.quiz.easy}</strong>
                <span>{t.quiz.easyDesc}</span>
              </button>
              <button
                type="button"
                className={`quiz-diff-btn ${difficulty === "hard" ? "active" : ""}`}
                onClick={() => setDifficulty("hard")}
              >
                <strong>{t.quiz.hard}</strong>
                <span>{t.quiz.hardDesc}</span>
              </button>
            </div>
          </div>

          {/* Organ records preview if exists */}
          {record && (
            <div className="quiz-record-preview">
              <div className="record-chip">
                <Award size={14} />
                <span>
                  {t.quiz.bestScore}: <strong>{record.bestScore}/{record.totalPossible}</strong>
                </span>
              </div>
              {record.fastestSeconds && (
                <div className="record-chip">
                  <Clock size={14} />
                  <span>
                    {t.quiz.fastestTime}: <strong>{record.fastestSeconds}s</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="quiz-setup-actions">
            <button type="button" className="quiz-start-cta" onClick={() => startQuiz(mode, difficulty)}>
              <Play size={16} />
              <span>{t.quiz.startQuiz}</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE: PLAYING / ACTIVE QUESTION BAR */}
      {phase === "playing" && target && (
        <div className="quiz-bar" role="status" aria-live="polite">
          {/* Mode Icon & Halo Timer if timed */}
          {mode === "timed" ? (
            <div className="quiz-timer-wrap" title={`${timeRemaining}s`}>
              <svg className="quiz-timer-svg" viewBox="0 0 36 36">
                <circle className="quiz-timer-bg" cx="18" cy="18" r="15.5" />
                <circle
                  className={`quiz-timer-progress ${timeRemaining <= 3 ? "urgent" : timeRemaining <= 6 ? "warning" : ""}`}
                  cx="18"
                  cy="18"
                  r="15.5"
                  strokeDasharray={97.38}
                  strokeDashoffset={97.38 * (1 - timeRemaining / QUESTION_TIME_LIMIT)}
                />
              </svg>
              <span className="quiz-timer-count">{timeRemaining}</span>
            </div>
          ) : mode === "practice" ? (
            <div className="quiz-mode-badge practice" title={t.quiz.practiceMode}>
              <BookOpen size={18} />
            </div>
          ) : (
            <div className="quiz-mode-badge standard" title={t.quiz.standardMode}>
              <Trophy size={18} />
            </div>
          )}

          <div className="quiz-prompt">
            <em>
              {difficulty === "hard" ? t.quiz.clue : t.quiz.find}
              {mode === "timed" && speedBonus > 0 && (
                <span className="quiz-speed-chip">+{speedBonus} pts</span>
              )}
            </em>
            <strong>
              {difficulty === "hard" ? target.detail : target.label}
            </strong>
            {difficulty === "easy" && target.detail && (
              <small className="quiz-sub-detail">{target.detail}</small>
            )}
          </div>

          <div className="quiz-meta">
            <div className="quiz-meta-top">
              <span className="quiz-progress">
                {format(t.quiz.progress, { current: String(step + 1), total: String(order.length) })}
              </span>
              <button
                type="button"
                className="quiz-options-toggle"
                onClick={() => setPhase("setup")}
                title={t.quiz.changeSettings}
                aria-label={t.quiz.changeSettings}
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>

            {/* Pips */}
            {mode !== "practice" ? (
              <ol className="quiz-pips" aria-hidden>
                {order.map((hotspot, index) => (
                  <li
                    key={hotspot.id}
                    className={
                      index < results.length
                        ? results[index]
                          ? "ok"
                          : "no"
                        : index === step
                        ? "now"
                        : ""
                    }
                  />
                ))}
              </ol>
            ) : (
              <div className="quiz-practice-counter">
                <span>{step + 1} / {order.length}</span>
              </div>
            )}
            <small>{t.quiz.hint}</small>
          </div>

          <button type="button" onClick={onExit} aria-label={t.quiz.exit}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ANSWER TOAST FEEDBACK */}
      {phase === "playing" && answer && (
        <div
          className={`quiz-answer ${answer.correct ? "ok" : "no"} ${answer.atTop ? "at-top" : ""}`}
          role="status"
          aria-live="assertive"
        >
          <span className="quiz-answer-icon">
            {answer.correct ? <Check size={22} /> : <X size={22} />}
          </span>
          <div>
            <strong>{answer.correct ? t.quiz.correct : t.quiz.wrong}</strong>
            {answer.correct ? (
              <span>{answer.target}</span>
            ) : (
              <>
                <span>{format(t.quiz.reveal, { label: answer.picked })}</span>
                <span className="quiz-answer-hint">{format(t.quiz.answer, { label: answer.target })}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* PHASE: FINISHED / SUMMARY CARD */}
      {phase === "finished" && (
        <div className="quiz-summary" role="dialog" aria-modal="true">
          {/* Confetti effect for perfect score */}
          {isPerfect && (
            <div className="quiz-confetti" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className={`confetti-piece piece-${i % 6}`} />
              ))}
            </div>
          )}

          {/* Trophy Badge */}
          <div className={`quiz-summary-medal ${isPerfect ? "gold" : accuracyPct >= 75 ? "silver" : accuracyPct >= 50 ? "bronze" : "leaf"}`}>
            {isPerfect ? (
              <Trophy size={36} className="text-amber-500" />
            ) : accuracyPct >= 75 ? (
              <Award size={36} className="text-teal-600" />
            ) : accuracyPct >= 50 ? (
              <Sparkles size={36} className="text-orange-500" />
            ) : (
              <Compass size={36} className="text-slate-500" />
            )}
          </div>

          {newRecordAlert && (
            <div className="quiz-new-record-pill">
              <Sparkles size={13} />
              <span>{t.quiz.newRecord}</span>
            </div>
          )}

          <h2>
            {isPerfect ? t.quiz.perfectScore : accuracyPct >= 75 ? t.quiz.greatJob : t.quiz.done}
          </h2>

          <p className="quiz-score-highlight">
            {mode === "practice"
              ? format(t.quiz.score, { score: String(score), total: String(order.length) })
              : format(t.quiz.score, { score: String(score), total: String(order.length) })}
          </p>

          {/* Stats Bento Grid */}
          <div className="quiz-stats-bento">
            <div className="stat-card">
              <small>{t.quiz.accuracy}</small>
              <strong>{accuracyPct}%</strong>
            </div>
            <div className="stat-card">
              <small>{t.quiz.time}</small>
              <strong>{elapsedSeconds}s</strong>
            </div>
            {mode === "timed" && (
              <div className="stat-card highlight">
                <small>{t.quiz.speedBonus}</small>
                <strong>+{speedBonus}</strong>
              </div>
            )}
            {record?.bestScore !== undefined && (
              <div className="stat-card">
                <small>{t.quiz.bestScore}</small>
                <strong>{record.bestScore}/{order.length}</strong>
              </div>
            )}
          </div>

          {/* Breakdown Review of Structures */}
          {history.length > 0 && (
            <div className="quiz-review-wrap">
              <ol className="quiz-review-list">
                {history.map((item, idx) => (
                  <li key={idx} className={item.correct ? "review-ok" : "review-no"}>
                    <span className="review-icon">
                      {item.correct ? <Check size={12} /> : <X size={12} />}
                    </span>
                    <span className="review-label">{item.target.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="quiz-summary-actions">
            <button type="button" className="lesson-button" onClick={() => startQuiz(mode, difficulty)}>
              <RotateCcw size={15} />
              <span>{t.quiz.retry}</span>
            </button>

            <div className="quiz-actions-subrow">
              <button
                type="button"
                className="quiz-sub-btn"
                onClick={handleShare}
                title={t.quiz.share}
              >
                <Share2 size={14} />
                <span>{copied ? t.quiz.copied : t.quiz.share}</span>
              </button>

              <button
                type="button"
                className="quiz-sub-btn"
                onClick={() => setPhase("setup")}
                title={t.quiz.changeSettings}
              >
                <SlidersHorizontal size={14} />
                <span>{t.quiz.changeSettings}</span>
              </button>
            </div>

            <button type="button" className="quiz-exit-btn" onClick={onExit}>
              {t.quiz.exit}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** `?authoring=1` is read from the URL without a hydration mismatch. */
function useAuthoringFlag() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("authoring") === "1",
    () => false,
  );
}

export function OrganViewer({
  organ,
  t,
  autoRotate,
  onAutoRotate,
  compare,
  onCompare,
  quizActive,
  onQuizExit,
  notes = [],
  onAddNote,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<AnatomyViewer | null>(null);
  const organRef = useRef(organ);
  const autoRotateRef = useRef(autoRotate);
  const canvasLabelRef = useRef(t.viewer.canvas);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Opt-in coordinate probe for placing hotspots — not a user-facing feature.
  const authoring = useAuthoringFlag();
  const authoringRef = useRef(authoring);
  const [authorPoint, setAuthorPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // The viewer captures its callbacks once, so live handlers go through refs.
  const pickRef = useRef<(hotspot: Hotspot) => void>(() => {});
  const authorRef = useRef<(point: { x: number; y: number; z: number }) => void>(() => {});
  useEffect(() => {
    authorRef.current = setAuthorPoint;
  }, []);
  useEffect(() => {
    authoringRef.current = authoring;
  }, [authoring]);

  // A typical organ is ready well inside a second — flashing a loading panel for
  // that reads as jank. It only appears if the fetch is genuinely slow; the flag
  // is cleared by onLoading when the next load starts.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlowLoad(true), 900);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    organRef.current = organ;
  }, [organ]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    canvasLabelRef.current = t.viewer.canvas;
    viewerRef.current?.setCanvasLabel(t.viewer.canvas);
  }, [t.viewer.canvas]);

  useEffect(() => {
    let cancelled = false;
    let viewer: AnatomyViewer | null = null;

    void import("../lib/three/viewer").then(({ AnatomyViewer: Viewer }) => {
      if (cancelled || !mountRef.current) return;
      viewer = new Viewer(mountRef.current, {
        onSelect: setSelected,
        onLoading: (isLoading, value) => {
          setLoading(isLoading);
          setProgress(value);
          if (isLoading) setSlowLoad(false);
        },
        onPick: (hotspot) => pickRef.current(hotspot),
        onAuthorPoint: (point) => authorRef.current(point),
      });
      viewerRef.current = viewer;
      viewer.setCanvasLabel(canvasLabelRef.current);
      viewer.setAutoRotate(autoRotateRef.current);
      viewer.setAuthoring(authoringRef.current);
      const current = organRef.current;
      viewer.setOrgan(current.model, current.hotspots, current.accent).catch(() => {
        setLoading(false);
        setProgress(0);
      });
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      viewer?.dispose();
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setOrgan(organ.model, organ.hotspots, organ.accent).catch(() => {
      setLoading(false);
      setProgress(0);
    });
  }, [organ]);

  // A spinning specimen makes "click the mitral valve" a game of chance, so the
  // quiz holds the model still and restores the user's setting on exit.
  useEffect(() => viewerRef.current?.setAutoRotate(autoRotate && !quizActive), [autoRotate, quizActive]);
  useEffect(() => viewerRef.current?.setQuizMode(quizActive), [quizActive]);
  useEffect(() => viewerRef.current?.setAuthoring(authoring), [authoring]);


  // The viewer drives the callout's position directly, so a spinning model
  // never costs a React render.
  const calloutRef = useCallback((node: HTMLDivElement | null) => {
    viewerRef.current?.attachCallout(node);
  }, []);

  const handleTool = (tool: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (tool === "rotate") onAutoRotate(!autoRotate);
    if (tool === "zoom") viewer.zoom(-1);
    if (tool === "isolate") setActiveTool(viewer.toggleIsolate() ? tool : null);
    if (tool === "section") setActiveTool(viewer.toggleCrossSection() ? tool : null);
    if (tool === "layers") setActiveTool(viewer.toggleLayers() ? tool : null);
    if (tool === "compare") onCompare();
    if (tool === "reset") {
      viewer.reset();
      setActiveTool(null);
    }
  };

  const tools = [
    { id: "rotate", label: t.tools.rotate, icon: RotateCcw },
    { id: "zoom", label: t.tools.zoom, icon: Search },
    { id: "isolate", label: t.tools.isolate, icon: CircleDashed },
    { id: "section", label: t.tools.section, icon: ScanLine },
    { id: "layers", label: t.tools.layers, icon: Layers3 },
    { id: "compare", label: t.tools.compare, icon: Box },
    { id: "reset", label: t.tools.reset, icon: RotateCcw },
  ];

  return (
    <section className="viewer-shell" aria-label={format(t.viewer.title, { organ: organ.name })}>
      <div className="viewer-glow" style={{ "--organ-accent": organ.accent } as React.CSSProperties} />
      <div ref={mountRef} className="three-mount" />

      {/* 2D Signature Watermark in the 3D Viewer container */}
      <div className="viewer-watermark" aria-hidden="true">
        <span className="watermark-mark">✦</span>
        <span className="watermark-specimen">
          {t.brand.home.includes("دیجی") || t.brand.tagline.includes("هنرمندانه")
            ? `نمونه‌ی دیجی آناتومی · ${organ.scientificName}`
            : `Digi Anatomy · ${organ.scientificName}`}
        </span>
      </div>

      <div className="viewer-tools" aria-label={t.tools.label}>
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tool-button ${(activeTool === id || (id === "compare" && compare)) ? "active" : ""}`}
            onClick={() => handleTool(id)}
            aria-pressed={activeTool === id || (id === "compare" && compare)}
            title={label}
          >
            <Icon size={19} strokeWidth={1.65} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {!quizActive && (
      <aside className="tip-note" aria-label={t.viewer.tip}>
        <span><Sparkles size={15} /> {t.viewer.tip}</span>
        <p>{t.viewer.tipDrag}<br />{t.viewer.tipScroll}<br />{t.viewer.tipClick}</p>
      </aside>
      )}

      {selected && !quizActive && (() => {
        const hotspotNotes = notes.filter((n) => n.organId === organ.id && n.hotspotId === selected.id);
        const hasNote = hotspotNotes.length > 0;
        return (
          <div className="hotspot-callout" ref={calloutRef} data-side="right">
            <div className="callout-body" style={{ "--hotspot-color": selected.color } as React.CSSProperties}>
              <div className="callout-top-row">
                <span className="callout-badge">{organ.name}</span>
                <button className="callout-close" type="button" onClick={() => viewerRef.current?.clearSelection()} aria-label={t.modal.close}>
                  <X size={13} />
                </button>
              </div>
              <b>{selected.label}</b>
              <small>{selected.detail}</small>

              {hasNote && (
                <div className="callout-note-preview">
                  <NotebookPen size={12} />
                  <span>{hotspotNotes[0].text}</span>
                </div>
              )}

              {onAddNote && (
                <button
                  type="button"
                  className="callout-note-btn"
                  onClick={() => onAddNote(organ.id, selected.id)}
                >
                  <NotebookPen size={13} />
                  <span>{hasNote ? t.notes.editNote : t.notes.addNote}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Screen-reader equivalent of the dots, which live in the canvas. */}
      <ul className="hotspot-index" aria-label={t.viewer.structures}>
        {organ.hotspots.map((hotspot) => (
          <li key={hotspot.id}>{hotspot.label}: {hotspot.detail}</li>
        ))}
      </ul>

      {quizActive && (
        <LabelQuiz
          key={organ.id}
          organ={organ}
          hotspots={organ.hotspots}
          t={t}
          pickRef={pickRef}
          flash={(id, correct) => viewerRef.current?.flash(id, correct)}
          screenY={(id) => viewerRef.current?.hotspotScreenY(id) ?? null}
          getHotspotPos={(id) => {
            const v = viewerRef.current as unknown as {
              hotspots?: { screenPosition?: (id: string, cam: unknown, w: number, h: number) => { x: number; y: number } | null };
              camera?: unknown;
              width?: number;
              height?: number;
            };
            if (v?.hotspots?.screenPosition && v.camera && v.width && v.height) {
              const pos = v.hotspots.screenPosition(id, v.camera, v.width, v.height);
              return pos ? { x: pos.x, y: pos.y } : null;
            }
            return null;
          }}
          onExit={onQuizExit}
        />
      )}

      {authoring && (
        <div className="authoring-panel">
          <span><Crosshair size={13} /> authoring</span>
          {authorPoint ? (
            <>
              <code>{`{ id: "", ta: "", position: [${authorPoint.x}, ${authorPoint.y}, ${authorPoint.z}], color: "#ee7c6a" },`}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`{ id: "", ta: "", position: [${authorPoint.x}, ${authorPoint.y}, ${authorPoint.z}], color: "#ee7c6a" },`)
                    .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); });
                }}
              >
                {copied ? "copied" : "copy"}
              </button>
            </>
          ) : (
            <code>click the model to sample a point</code>
          )}
        </div>
      )}

      {loading && slowLoad && (
        <div className="model-loader" role="status" aria-live="polite">
          <div className="loader-orbit"><Maximize2 size={20} /></div>
          <strong>{format(t.viewer.loading, { organ: organ.name })}</strong>
          <span>{Math.max(8, Math.round(progress * 100))}%</span>
        </div>
      )}

      {!quizActive && (
      <button className="auto-rotate" type="button" onClick={() => onAutoRotate(!autoRotate)} aria-pressed={autoRotate}>
        <RotateCcw size={14} />
        <span>{t.viewer.autoRotate}</span>
        <span className={`switch ${autoRotate ? "on" : ""}`} aria-hidden="true"><i /></span>
      </button>
      )}

      <div className="view-caption">
        <span>{t.viewer.caption}</span>
        <strong>{organ.scientificName}</strong>
      </div>
    </section>
  );
}
