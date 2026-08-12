/**
 * CLI script to import translated flat JSON files back into strict TypeScript locale files.
 *
 * Usage:
 *   npm run i18n:import -- --locale=fa --file=outputs/i18n/fa.json
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { locales } from "../app/i18n/config.ts";

function getCliArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        result[key] = val;
      } else {
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
          result[key] = next;
          i++;
        } else {
          result[key] = "true";
        }
      }
    }
  }
  return result;
}

const values = getCliArgs();

if (!values.locale || !values.file) {
  console.error(`\nError: Both --locale and --file are required.\n`);
  console.log(`Usage:`);
  console.log(`  npm run i18n:import -- --locale=fa --file=outputs/i18n/fa.json\n`);
  process.exit(1);
}

const targetLocale = values.locale.trim();
const inputFilePath = values.file.trim();

const validLocale = locales.find((l) => l.code === targetLocale);
if (!validLocale) {
  console.error(`\nError: Locale '${targetLocale}' is invalid. Supported locales: ${locales.map((l) => l.code).join(", ")}\n`);
  process.exit(1);
}

if (!existsSync(inputFilePath)) {
  console.error(`\nError: Input file '${inputFilePath}' does not exist.\n`);
  process.exit(1);
}

// 1. Read flat JSON input
const rawContent = await readFile(inputFilePath, "utf-8");
let flatData;
try {
  flatData = JSON.parse(rawContent);
} catch (err) {
  console.error(`\nError: Failed to parse JSON from file '${inputFilePath}': ${err.message}\n`);
  process.exit(1);
}

// 2. Load base English dictionaries for key parity check
const baseUiModule = await import("../app/i18n/ui/en.ts");
const baseOrgansModule = await import("../app/i18n/organs/en.ts");
const baseUi = baseUiModule.ui;
const baseOrgans = baseOrgansModule.organs;

const englishFlatUi = flatten(baseUi, ["ui"]);
const englishFlatOrgans = flatten(baseOrgans, ["organs"]);
const allEnglishKeys = new Set([...Object.keys(englishFlatUi), ...Object.keys(englishFlatOrgans)]);

// Check for missing keys (Requirement 3)
const missingKeys = [];
for (const key of allEnglishKeys) {
  if (!(key in flatData)) {
    missingKeys.push(key);
  }
}

if (missingKeys.length > 0) {
  console.warn(`\n[WARNING] The following ${missingKeys.length} key(s) are missing in '${inputFilePath}' for locale '${targetLocale}'. Existing/placeholder values will be preserved:`);
  for (const k of missingKeys.slice(0, 10)) {
    console.warn(`  - ${k}`);
  }
  if (missingKeys.length > 10) {
    console.warn(`  ... and ${missingKeys.length - 10} more missing keys.`);
  }
  console.warn("");
}

// 3. Load existing target locale dictionaries to preserve missing keys
let existingUi = {};
let existingOrgans = {};
try {
  existingUi = (await import(`../app/i18n/ui/${targetLocale}.ts`)).ui;
} catch (e) {}
try {
  existingOrgans = (await import(`../app/i18n/organs/${targetLocale}.ts`)).organs;
} catch (e) {}

const newUiData = JSON.parse(JSON.stringify(existingUi));
const newOrgansData = JSON.parse(JSON.stringify(existingOrgans));

// 4. Reconstruct nested objects from flat keys
for (const [flatKey, value] of Object.entries(flatData)) {
  if (flatKey.startsWith("ui.")) {
    const subPath = flatKey.slice(3);
    setDeep(newUiData, subPath, value);
  } else if (flatKey.startsWith("organs.")) {
    const subPath = flatKey.slice(7);
    setDeep(newOrgansData, subPath, value);
  }
}

// Normalize numeric object keys back into JS arrays (Requirement 5)
const finalUi = normalizeArrays(newUiData);
const finalOrgans = normalizeArrays(newOrgansData);

// 5. Write to app/i18n/ui/<locale>.ts and app/i18n/organs/<locale>.ts
const uiPath = new URL(`../app/i18n/ui/${targetLocale}.ts`, import.meta.url);
const organsPath = new URL(`../app/i18n/organs/${targetLocale}.ts`, import.meta.url);

const uiContent = `import type { UiDictionary } from "../types";\n\nexport const ui: UiDictionary = ${formatTs(finalUi)};\n`;
const organsContent = `import type { OrganContentDictionary } from "../types";\n\nexport const organs: OrganContentDictionary = ${formatTs(finalOrgans)};\n`;

await writeFile(uiPath, uiContent, "utf-8");
await writeFile(organsPath, organsContent, "utf-8");

console.log(`✓ Imported translations into app/i18n/ui/${targetLocale}.ts and app/i18n/organs/${targetLocale}.ts`);

// 6. Automatically run audit and type-check (Requirement 4)
console.log(`\nRunning i18n audit...\n`);
try {
  execSync("node --experimental-strip-types scripts/i18n-audit.mjs", { stdio: "inherit" });
} catch (e) {}

console.log(`\nRunning TypeScript build check...\n`);
try {
  execSync("npx tsc --noEmit", { stdio: "inherit", shell: true });
  console.log(`\n✓ TypeScript type-check passed successfully!`);
} catch (e) {
  console.error(`\n✖ Type-check or build error after import.`);
}

// Helper Functions
function flatten(node, path = [], into = {}) {
  for (const [key, value] of Object.entries(node)) {
    const next = [...path, key];
    if (typeof value === "string") into[next.join(".")] = value;
    else if (Array.isArray(value)) value.forEach((item, i) => (into[[...next, i].join(".")] = item));
    else if (value && typeof value === "object") flatten(value, next, into);
  }
  return into;
}

function setDeep(obj, path, val) {
  const parts = typeof path === "string" ? path.split(".") : path;
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in curr) || typeof curr[p] !== "object" || curr[p] === null) {
      curr[p] = {};
    }
    curr = curr[p];
  }
  curr[parts[parts.length - 1]] = val;
}

function normalizeArrays(node) {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map(normalizeArrays);
  }
  const keys = Object.keys(node);
  const isNumericArray = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
  if (isNumericArray) {
    const maxIndex = Math.max(...keys.map((k) => parseInt(k, 10)));
    const arr = [];
    for (let i = 0; i <= maxIndex; i++) {
      arr[i] = normalizeArrays(node[String(i)]);
    }
    return arr;
  }
  const copy = {};
  for (const key of keys) {
    copy[key] = normalizeArrays(node[key]);
  }
  return copy;
}

function formatTs(val, depth = 1) {
  const indent = "  ".repeat(depth);
  const parentIndent = "  ".repeat(depth - 1);

  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean" || typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);

  if (Array.isArray(val)) {
    const items = val.map((item) => JSON.stringify(item));
    const singleLine = `[${items.join(", ")}]`;
    if (singleLine.length <= 100) return singleLine;
    return `[\n${indent}` + items.join(`,\n${indent}`) + `\n${parentIndent}]`;
  }

  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    const entries = keys.map((key) => {
      const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `${formattedKey}: ${formatTs(val[key], depth + 1)}`;
    });
    return `{\n${indent}` + entries.join(`,\n${indent}`) + `\n${parentIndent}}`;
  }

  return String(val);
}
