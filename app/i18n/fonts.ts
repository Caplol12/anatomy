import {
  Cormorant_Garamond,
  DM_Sans,
} from "next/font/google";
import type { ScriptGroup } from "./config";

// The display pair for Latin & Cyrillic scripts.
const cormorant = Cormorant_Garamond({ variable: "--font-serif", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"] });
const dmSans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });

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
};

/** Font classes for a script — keeps initial HTML payloads light. */
export function fontClassName(script: ScriptGroup) {
  const customStack = scriptFontClass[script];
  if (customStack) return customStack;
  return `${cormorant.variable} ${dmSans.variable}`;
}

