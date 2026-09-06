"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Focus,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sliders,
  X
} from 'lucide-react';
import AnatomyScene from './scene';
import { ATLAS_BASE_URL } from './model-download';
import {
  DEFAULT_VISIBLE,
  SYSTEMS,
  explanation,
  type Atlas,
  type Concept,
  type SceneState,
  type SystemId,
  type View
} from './types';
import './atlas.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const initialScene: SceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0
};

export default function HumanAtlasView({ isOpen, onClose, theme }: Props) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState<SceneState>(initialScene);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Concept | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Fetch atlas catalogue
  useEffect(() => {
    if (!isOpen) return;
    const abort = new AbortController();
    setProgress(0);
    setError('');
    setAtlas(null);
    setChosen(null);
    setDetailsOpen(false);
    setState({ ...initialScene, visible: DEFAULT_VISIBLE });

    fetch(`${ATLAS_BASE_URL}/models/atlas/atlas.json`, { signal: abort.signal })
      .then(r => {
        if (!r.ok) throw new Error('فایل مانیفست آناتومی دریافت نشد.');
        return r.json();
      })
      .then(data => {
        setAtlas(data as Atlas);
      })
      .catch(e => {
        if (e.name !== 'AbortError') setError(e.message);
      });

    return () => abort.abort();
  }, [isOpen]);

  // Keyboard shortcut '/' for search and 'Escape' to close modals or exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (infoOpen) {
          setInfoOpen(false);
        } else if (detailsOpen) {
          setDetailsOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchOpen, infoOpen, detailsOpen, onClose]);

  const partsMap = useMemo(() => new Map(atlas?.parts.map(p => [p.id, p])), [atlas]);

  const counts = useMemo(
    () => Object.fromEntries(SYSTEMS.map(s => [s.id, atlas?.parts.filter(p => p.system === s.id).length ?? 0])),
    [atlas]
  );

  const selectedParts = state.selected.map(id => partsMap.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const selectedPart = selectedParts[0];
  const selectedSystem = SYSTEMS.find(s => s.id === selectedPart?.system);

  const visibleCount =
    atlas?.parts.filter(p =>
      state.isolate ? state.selected.includes(p.id) : state.visible.includes(p.system) || state.selected.includes(p.id)
    ).length ?? 0;

  // Search concepts
  const searchResults = useMemo(() => {
    if (!atlas) return [];
    const term = query.toLowerCase().trim();
    if (!term) {
      return ['heart', 'brain', 'liver', 'stomach', 'spleen', 'pancreas', 'urinary bladder', 'trachea']
        .map(name => atlas.concepts.find(c => c.name.toLowerCase() === name))
        .filter((x): x is Concept => !!x);
    }
    return atlas.concepts
      .filter(c => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 60);
  }, [atlas, query]);

  const chooseConcept = (concept: Concept) => {
    setChosen(concept);
    setState(s => ({ ...s, selected: concept.elements, isolate: false, rotate: false }));
    setDetailsOpen(true);
    setSearchOpen(false);
  };

  const choosePart = (id: string) => {
    const p = partsMap.get(id);
    if (!p) return;
    setChosen({ id: p.conceptId, name: p.name, elements: [id] });
    setState(s => ({ ...s, selected: [id], isolate: false, rotate: false }));
    setDetailsOpen(true);
  };

  const toggleSystem = (id: SystemId) => {
    setDetailsOpen(false);
    setState(s => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter(x => x !== id) : [...s.visible, id]
    }));
  };

  const selectPreset = (preset: 'all' | 'skeleton' | 'organs') => {
    if (preset === 'all') {
      setState(s => ({ ...s, visible: DEFAULT_VISIBLE, selected: [], isolate: false }));
    } else if (preset === 'skeleton') {
      setState(s => ({ ...s, visible: ['skeletal'], selected: [], isolate: false }));
    } else if (preset === 'organs') {
      setState(s => ({
        ...s,
        visible: ['cardiac', 'digestive', 'respiratory', 'urinary', 'endocrine', 'sensory'],
        selected: [],
        isolate: false
      }));
    }
  };

  const resetView = () => {
    setState(s => ({
      ...initialScene,
      visible: DEFAULT_VISIBLE,
      reset: s.reset + 1
    }));
    setChosen(null);
    setDetailsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className={`atlas-overlay ${theme}`} dir="ltr">
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{ ...state, inspectorOpen: detailsOpen && selectedParts.length > 0 }}
          theme={theme}
          onSelect={choosePart}
          onProgress={n => {
            setProgress(n);
            if (n === 100) setError('');
          }}
          onError={setError}
        />
      )}

      {/* Top Bar */}
      <div className="atlas-top-bar">
        <div className="atlas-brand">
          <div className="atlas-brand-badge">
            <span className="atlas-dot" />
            3D BODY MAP ATLAS
          </div>
          <h1 className="atlas-title">
            Human Atlas
            <span className="atlas-title-tag">2,234 Pieces</span>
          </h1>
          <div className="atlas-brand-meta">
            BodyParts3D 4.0 Reference Model · 15 Anatomical Systems
          </div>
        </div>

        <div className="atlas-top-actions">
          <button
            type="button"
            className="atlas-btn"
            onClick={() => setSearchOpen(true)}
            title="Search structures (/)"
          >
            <Search size={16} />
            <span>Search</span>
            <kbd>/</kbd>
          </button>

          <button
            type="button"
            className="atlas-btn"
            onClick={() => setLayersOpen(!layersOpen)}
            title="Toggle Layers Panel"
          >
            <Layers size={16} />
            <span>Layers</span>
          </button>

          <button
            type="button"
            className="atlas-btn"
            onClick={() => setInfoOpen(!infoOpen)}
            title="Information"
          >
            <Info size={16} />
          </button>

          {/* Prominent Back to DigiAnatomy Button */}
          <button
            type="button"
            className="atlas-btn atlas-btn-back"
            onClick={onClose}
            title="Return to DigiAnatomy"
          >
            <ArrowLeft size={16} />
            <span>بازگشت به دیجی‌آناتومی</span>
          </button>
        </div>
      </div>

      {/* Left Layers Panel */}
      {layersOpen && (
        <aside className="atlas-layers-panel atlas-glass">
          <div className="atlas-panel-head">
            <span className="atlas-panel-title">Anatomical Systems</span>
            <span className="atlas-panel-count">
              {visibleCount} / {atlas?.parts.length ?? 2234}
            </span>
          </div>

          <div className="atlas-presets">
            <button
              type="button"
              className="atlas-preset-btn"
              onClick={() => selectPreset('all')}
            >
              All
            </button>
            <button
              type="button"
              className="atlas-preset-btn"
              onClick={() => selectPreset('skeleton')}
            >
              Skeleton
            </button>
            <button
              type="button"
              className="atlas-preset-btn"
              onClick={() => selectPreset('organs')}
            >
              Organs
            </button>
          </div>

          <div className="atlas-systems-list">
            {SYSTEMS.map(sys => {
              const count = counts[sys.id] ?? 0;
              if (count === 0) return null;
              const isChecked = state.visible.includes(sys.id);
              return (
                <div
                  key={sys.id}
                  className="atlas-system-row"
                  onClick={() => toggleSystem(sys.id)}
                >
                  <div className="atlas-system-left">
                    <span className="atlas-system-dot" style={{ backgroundColor: sys.color }} />
                    <span>{sys.name}</span>
                  </div>
                  <button
                    type="button"
                    className={`atlas-switch ${isChecked ? 'checked' : ''}`}
                    aria-label={`Toggle ${sys.name}`}
                  >
                    <span className="atlas-switch-knob" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Right View Angle Controls */}
      <div className="atlas-view-controls atlas-glass">
        {(['three-quarter', 'front', 'side', 'back'] as View[]).map(v => (
          <button
            key={v}
            type="button"
            className={`atlas-view-btn ${state.view === v ? 'active' : ''}`}
            onClick={() => setState(s => ({ ...s, view: v }))}
            title={`View ${v}`}
          >
            {v === 'three-quarter' ? '3/4' : v[0].toUpperCase()}
          </button>
        ))}
      </div>

      {/* Bottom Dock (Explode Slider & Controls) */}
      <div className="atlas-bottom-dock atlas-glass">
        <div className="atlas-explode-wrap">
          <div className="atlas-explode-header">
            <span>Exploded View (نمای انفجاری)</span>
            <span className="atlas-explode-val">{Math.round(state.explode * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.explode}
            onChange={e => setState(s => ({ ...s, explode: parseFloat(e.target.value) }))}
            className="atlas-slider"
          />
        </div>

        <div className="atlas-dock-divider" />

        <div className="atlas-dock-actions">
          <button
            type="button"
            className={`atlas-icon-btn ${state.rotate ? 'active' : ''}`}
            onClick={() => setState(s => ({ ...s, rotate: !s.rotate }))}
            title={state.rotate ? 'Pause Rotation' : 'Auto Rotate'}
          >
            {state.rotate ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            type="button"
            className="atlas-icon-btn"
            onClick={resetView}
            title="Reset Camera & View"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Detail Sheet / Inspector */}
      {detailsOpen && (selectedPart || chosen) && (
        <aside className="atlas-detail-sheet atlas-glass">
          <div className="atlas-sheet-head">
            <h2 className="atlas-sheet-title">{chosen?.name ?? selectedPart?.name}</h2>
            <button
              type="button"
              className="atlas-sheet-close"
              onClick={() => setDetailsOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="atlas-sheet-badges">
            {selectedSystem && (
              <span
                className="atlas-badge"
                style={{
                  backgroundColor: `${selectedSystem.color}22`,
                  color: selectedSystem.color,
                  borderColor: selectedSystem.color
                }}
              >
                {selectedSystem.name} ({selectedSystem.nameFa})
              </span>
            )}
            {chosen?.id && (
              <span className="atlas-badge" style={{ opacity: 0.7 }}>
                {chosen.id}
              </span>
            )}
          </div>

          <p className="atlas-sheet-desc">
            {explanation(chosen?.name ?? selectedPart?.name ?? '', selectedPart?.system ?? 'skeletal')}
          </p>

          <div className="atlas-sheet-actions">
            <button
              type="button"
              className={`atlas-btn-isolate ${state.isolate ? 'isolated' : ''}`}
              onClick={() => setState(s => ({ ...s, isolate: !s.isolate }))}
            >
              <Focus size={15} />
              <span>{state.isolate ? 'Show Full Body' : 'Isolate Structure'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* Search Modal */}
      {searchOpen && (
        <div className="atlas-search-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="atlas-search-dialog atlas-glass" onClick={e => e.stopPropagation()}>
            <div className="atlas-search-input-wrap">
              <Search size={20} style={{ opacity: 0.6 }} />
              <input
                autoFocus
                type="text"
                placeholder="Search across 3,432 anatomical structures (e.g. Femur, Heart, Trachea)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="atlas-search-input"
              />
              <button
                type="button"
                className="atlas-sheet-close"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="atlas-search-results">
              {searchResults.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6, fontSize: '13px' }}>
                  No structures found matching "{query}"
                </div>
              ) : (
                searchResults.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="atlas-search-item"
                    onClick={() => chooseConcept(c)}
                  >
                    <span>{c.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>{c.id}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoOpen && (
        <div className="atlas-search-backdrop" onClick={() => setInfoOpen(false)}>
          <div className="atlas-search-dialog atlas-glass" onClick={e => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>About Human Atlas 3D</h3>
              <button type="button" className="atlas-sheet-close" onClick={() => setInfoOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.7, opacity: 0.85, margin: 0 }}>
              This interactive 3D human atlas is based on the <strong>BodyParts3D 4.0</strong> reference anatomical dataset (licensed CC BY 4.0).
              It renders 2,234 individually selectable meshes across 15 biological systems with high-performance GPU shaders and custom binary packing.
            </p>
          </div>
        </div>
      )}

      {/* Loading Bar */}
      {progress < 100 && !error && (
        <div className="atlas-loading-card atlas-glass">
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            در حال بارگذاری مدل‌های سه‌بعدی... {progress}%
          </div>
          <div className="atlas-progress-bar">
            <div className="atlas-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--atlas-text-muted)' }}>
            استریمینگ مستقیم فایل‌های باینری بدن انسان از سرور
          </div>
        </div>
      )}

      {/* Error Card */}
      {error && (
        <div className="atlas-loading-card atlas-glass" style={{ borderColor: '#ef4444' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>
            {error}
          </div>
          <button
            type="button"
            className="atlas-btn"
            onClick={() => {
              setError('');
              setProgress(0);
              setAtlas(null);
            }}
          >
            تلاش مجدد
          </button>
        </div>
      )}
    </div>
  );
}
