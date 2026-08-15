import {
  Cormorant_Garamond,
  DM_Sans,
  Vazirmatn,
} from "next/font/google";
import type { ScriptGroup } from "./config";

// The display pair for Latin & Cyrillic scripts.
const cormorant = Cormorant_Garamond({ variable: "--font-serif", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"] });
const dmSans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });

// Vazirmatn font for Persian script with 5 weights: Light (300), Regular (400), Medium (500), Semi-Bold (600), Bold (700).
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/**
 * Other scripts use CSS font stacks or system fonts to keep font payloads lean
 * and prevent dev server response disconnects.
 */
const scriptFontClass: Partial<Record<ScriptGroup, string>> = {
  sc: "font-stack-sc",
  jp: "font-stack-jp",
  kr: "font-stack-kr",
  devanagari: "font-stack-devanagari",
  arabic: "font-stack-arabic",
  persian: `font-stack-persian ${vazirmatn.variable}`,
};

/** Font classes for a script — keeps initial HTML payloads light. */
export function fontClassName(script: ScriptGroup) {
  const customStack = scriptFontClass[script];
  if (customStack) return customStack;
  return `${cormorant.variable} ${dmSans.variable}`;
}

