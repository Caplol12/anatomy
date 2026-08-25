"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  NotebookPen,
  Search,
} from "lucide-react";
import { BODY_SYSTEMS, SYSTEM_CONFIG_BY_ID } from "../lib/systems";
import type { SystemId } from "../lib/anatomy-data";
import type { Organ } from "../i18n/merge";
import type { UiDictionary } from "../i18n/types";
import { format } from "../i18n/types";
import type { LocaleConfig } from "../i18n/config";

import { LiquidMetalButton } from "./LiquidMetalButton";

interface SystemsExplorerProps {
  organs: Organ[];
  activeOrganId: string;
  selectedSystemId: SystemId | null;
  onSelectSystem: (id: SystemId | null) => void;
  onSelectOrgan: (id: string) => void;
  t: UiDictionary;
  locale: LocaleConfig;
  noteCountsByOrgan: Record<string, number>;
  onPrefetchOrgan: (id: string) => void;
}

export function SystemsExplorer({
  organs,
  activeOrganId,
  selectedSystemId,
  onSelectSystem,
  onSelectOrgan,
  t,
  locale,
  noteCountsByOrgan,
  onPrefetchOrgan,
}: SystemsExplorerProps) {
  const [systemSearch, setSystemSearch] = useState("");

  const organsBySystem = useMemo(() => {
    const map: Record<SystemId, Organ[]> = {
      cardiovascular: [],
      respiratory: [],
      nervous: [],
      digestive: [],
      urinary: [],
      sensory: [],
      integumentary: [],
      endocrine: [],
    };
    for (const organ of organs) {
      if (organ.systems && Array.isArray(organ.systems)) {
        for (const sysId of organ.systems) {
          if (map[sysId]) {
            map[sysId].push(organ);
          }
        }
      } else if (organ.systemId && map[organ.systemId]) {
        map[organ.systemId].push(organ);
      }
    }
    return map;
  }, [organs]);

  const filteredSystems = useMemo(() => {
    if (!systemSearch.trim()) return BODY_SYSTEMS;
    const q = systemSearch.toLocaleLowerCase(locale.code);
    return BODY_SYSTEMS.filter((sys) => {
      const name = (t.systems[sys.id] || "").toLocaleLowerCase(locale.code);
      const desc = (t.systems[`${sys.id}Desc` as keyof typeof t.systems] || "").toLocaleLowerCase(locale.code);
      const matchedOrgan = (organsBySystem[sys.id] || []).some((o) =>
        o.name.toLocaleLowerCase(locale.code).includes(q)
      );
      return name.includes(q) || desc.includes(q) || matchedOrgan;
    });
  }, [systemSearch, locale.code, t, organsBySystem]);

  // If a specific system is selected, show the detail view
  if (selectedSystemId) {
    const sysConfig = SYSTEM_CONFIG_BY_ID[selectedSystemId];
    const sysOrgans = organsBySystem[selectedSystemId] || [];
    const Icon = sysConfig.icon;
    const sysTitle = t.systems[selectedSystemId] || selectedSystemId;
    const sysDesc = t.systems[`${selectedSystemId}Desc` as keyof typeof t.systems] || "";

    return (
      <div className="systems-detail-container">
        <div className="systems-detail-header">
          <LiquidMetalButton
            size="sm"
            variant="silver"
            onClick={() => onSelectSystem(null)}
            aria-label={t.systems.backToSystems}
            icon={<ArrowLeft size={15} />}
          >
            {t.systems.backToSystems}
          </LiquidMetalButton>
        </div>

        <div
          className="system-hero-card"
          style={{
            borderColor: sysConfig.badgeBorder,
            background: sysConfig.cardGradient,
          }}
        >
          <div className="system-hero-top">
            <span
              className="system-hero-icon"
              style={{
                backgroundColor: sysConfig.badgeBg,
                borderColor: sysConfig.badgeBorder,
                color: sysConfig.badgeColor,
              }}
            >
              <Icon size={20} />
            </span>
            <span
              className="system-hero-count-badge"
              style={{
                backgroundColor: sysConfig.badgeBg,
                color: sysConfig.badgeColor,
              }}
            >
              {format(t.systems.organsCount, { count: String(sysOrgans.length) })}
            </span>
          </div>

          <h3 className="system-hero-title">{sysTitle}</h3>
          <p className="system-hero-desc">{sysDesc}</p>
        </div>

        <div className="systems-organs-section">
          <div className="systems-organs-title">
            <span>{t.library.title}</span>
            <small>{format(t.systems.organsCount, { count: String(sysOrgans.length) })}</small>
          </div>

          <div className="organ-list">
            {sysOrgans.map((item) => {
              const isPrimary = item.systemId === selectedSystemId;
              const hasNotes = noteCountsByOrgan[item.id] > 0;
              const isActive = activeOrganId === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`organ-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectOrgan(item.id)}
                  onPointerEnter={() => onPrefetchOrgan(item.id)}
                  onFocus={() => onPrefetchOrgan(item.id)}
                  style={{ "--item-accent": item.accent } as React.CSSProperties}
                >
                  <span className="organ-glyph">
                    {item.illustrated ? (
                      <img
                        src={`/anatomy/${item.id}/thumb.webp`}
                        alt=""
                        width={47}
                        height={47}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span className="art-fallback">{item.icon}</span>
                    )}
                  </span>

                  <span className="organ-item-text">
                    <b>{item.name}</b>
                    <small>
                      {isPrimary ? t.systems.primarySystem : t.systems.secondarySystem}
                    </small>
                  </span>

                  <span className="organ-item-badges">
                    {hasNotes && (
                      <span
                        className="organ-note-pill"
                        title={format(t.notes.count, {
                          count: String(noteCountsByOrgan[item.id]),
                        })}
                      >
                        <NotebookPen size={11} />
                        <span>{noteCountsByOrgan[item.id]}</span>
                      </span>
                    )}
                    {isActive && (
                      <Heart className="favorite" size={14} fill="currentColor" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // All Systems overview list
  return (
    <div className="systems-explorer-root">
      <div className="systems-search-row">
        <label className="systems-search-input-wrapper">
          <Search size={14} />
          <input
            type="text"
            value={systemSearch}
            onChange={(e) => setSystemSearch(e.target.value)}
            placeholder={t.systems.filterBySystem}
          />
        </label>
      </div>

      <div className="systems-cards-list">
        {filteredSystems.map((sys) => {
          const Icon = sys.icon;
          const sysTitle = t.systems[sys.id] || sys.id;
          const sysDesc = t.systems[`${sys.id}Desc` as keyof typeof t.systems] || "";
          const sysOrgans = organsBySystem[sys.id] || [];
          const containsActive = sysOrgans.some((o) => o.id === activeOrganId);

          return (
            <div
              key={sys.id}
              className={`system-overview-card ${containsActive ? "has-active" : ""}`}
              onClick={() => onSelectSystem(sys.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectSystem(sys.id);
                }
              }}
              style={{
                "--sys-accent": sys.accent,
                "--sys-badge-bg": sys.badgeBg,
                "--sys-badge-border": sys.badgeBorder,
                "--sys-badge-color": sys.badgeColor,
              } as React.CSSProperties}
            >
              <div className="system-card-top">
                <div className="system-card-identity">
                  <span className="system-card-icon">
                    <Icon size={18} />
                  </span>
                  <div className="system-card-names">
                    <h4>{sysTitle}</h4>
                    <span className="system-organ-count">
                      {format(t.systems.organsCount, { count: String(sysOrgans.length) })}
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="system-card-arrow" />
              </div>

              <p className="system-card-desc">{sysDesc}</p>

              {sysOrgans.length > 0 && (
                <div className="system-card-organs-preview">
                  {sysOrgans.map((o) => (
                    <span
                      key={o.id}
                      className={`system-organ-chip ${o.id === activeOrganId ? "active" : ""}`}
                      title={o.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrgan(o.id);
                      }}
                    >
                      {o.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
