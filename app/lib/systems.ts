import type { SystemId } from "./anatomy-data";
import type { LucideIcon } from "lucide-react";
import {
  HeartPulse,
  Wind,
  BrainCircuit,
  UtensilsCrossed,
  Droplets,
  Eye,
  Shield,
  Dna,
} from "lucide-react";

export interface BodySystemConfig {
  id: SystemId;
  icon: LucideIcon;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  cardGradient: string;
  pattern: "pulse" | "wind" | "network" | "wave" | "filter" | "ray" | "layer" | "helix";
}

export const BODY_SYSTEMS: BodySystemConfig[] = [
  {
    id: "cardiovascular",
    icon: HeartPulse,
    accent: "#e11d48",
    badgeBg: "rgba(225, 29, 72, 0.12)",
    badgeBorder: "rgba(225, 29, 72, 0.28)",
    badgeColor: "#be123c",
    cardGradient: "linear-gradient(135deg, rgba(225, 29, 72, 0.09) 0%, rgba(244, 63, 94, 0.03) 100%)",
    pattern: "pulse",
  },
  {
    id: "respiratory",
    icon: Wind,
    accent: "#0284c7",
    badgeBg: "rgba(2, 132, 199, 0.12)",
    badgeBorder: "rgba(2, 132, 199, 0.28)",
    badgeColor: "#0369a1",
    cardGradient: "linear-gradient(135deg, rgba(2, 132, 199, 0.09) 0%, rgba(56, 189, 248, 0.03) 100%)",
    pattern: "wind",
  },
  {
    id: "nervous",
    icon: BrainCircuit,
    accent: "#7c3aed",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    badgeBorder: "rgba(124, 58, 237, 0.28)",
    badgeColor: "#6d28d9",
    cardGradient: "linear-gradient(135deg, rgba(124, 58, 237, 0.09) 0%, rgba(168, 85, 247, 0.03) 100%)",
    pattern: "network",
  },
  {
    id: "digestive",
    icon: UtensilsCrossed,
    accent: "#d97706",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    badgeBorder: "rgba(217, 119, 6, 0.28)",
    badgeColor: "#b45309",
    cardGradient: "linear-gradient(135deg, rgba(217, 119, 6, 0.09) 0%, rgba(245, 158, 11, 0.03) 100%)",
    pattern: "wave",
  },
  {
    id: "urinary",
    icon: Droplets,
    accent: "#0d9488",
    badgeBg: "rgba(13, 148, 136, 0.12)",
    badgeBorder: "rgba(13, 148, 136, 0.28)",
    badgeColor: "#0f766e",
    cardGradient: "linear-gradient(135deg, rgba(13, 148, 136, 0.09) 0%, rgba(20, 184, 166, 0.03) 100%)",
    pattern: "filter",
  },
  {
    id: "sensory",
    icon: Eye,
    accent: "#2563eb",
    badgeBg: "rgba(37, 99, 235, 0.12)",
    badgeBorder: "rgba(37, 99, 235, 0.28)",
    badgeColor: "#1d4ed8",
    cardGradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.09) 0%, rgba(96, 165, 250, 0.03) 100%)",
    pattern: "ray",
  },
  {
    id: "integumentary",
    icon: Shield,
    accent: "#c2410c",
    badgeBg: "rgba(194, 65, 12, 0.12)",
    badgeBorder: "rgba(194, 65, 12, 0.28)",
    badgeColor: "#9a3412",
    cardGradient: "linear-gradient(135deg, rgba(194, 65, 12, 0.09) 0%, rgba(249, 115, 22, 0.03) 100%)",
    pattern: "layer",
  },
  {
    id: "endocrine",
    icon: Dna,
    accent: "#9333ea",
    badgeBg: "rgba(147, 51, 234, 0.12)",
    badgeBorder: "rgba(147, 51, 234, 0.28)",
    badgeColor: "#7e22ce",
    cardGradient: "linear-gradient(135deg, rgba(147, 51, 234, 0.09) 0%, rgba(192, 132, 252, 0.03) 100%)",
    pattern: "helix",
  },
];

export const SYSTEM_CONFIG_BY_ID: Record<SystemId, BodySystemConfig> = Object.fromEntries(
  BODY_SYSTEMS.map((s) => [s.id, s]),
) as Record<SystemId, BodySystemConfig>;
