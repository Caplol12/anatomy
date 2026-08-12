/**
 * CLI script to add a new i18n text key safely across all 13 locales.
 *
 * Usage:
 *   npm run i18n:add-key -- --path="modal.newField" --value="English text"
 *   npm run i18n:add-key -- --organ="heart" --path="funFact" --value="English text"
 *   npm run i18n:add-key -- --organ="heart" --path="hotspots.aorta.label" --value="Aorta"
 */
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { organStructures } from "../app/lib/anatomy-data.ts";
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

if (!values.path || values.value === undefined) {
  console.error(`\nError: Both --path and --value are required.\n`);
  console.log(`Usage:`);
  console.log(`  npm run i18n:add-key -- --path="modal.newField" --value="English default text"`);
  console.log(`  npm run i18n:add-key -- --organ="heart" --path="funFact" --value="English text"\n`);
  process.exit(1);
}

const targetPath = values.path.trim();
const englishValue = values.value;
const organId = values.organ ? values.organ.trim() : null;

// Validate organ if provided
if (organId) {
  const organObj = organStructures.find((o) => o.id === organId);
  if (!organObj) {
    console.error(`\nError: Organ '${organId}' is not valid. Available organs: ${organStructures.map((o) => o.id).join(", ")}\n`);
    process.exit(1);
  }

  // Hotspot check (Requirement 5)
  if (targetPath.startsWith("hotspots.")) {
    const parts = targetPath.split(".");
    const hotspotId = parts[1];
    const exists = organObj.hotspots.some((h) => h.id === hotspotId);
    if (!exists) {
      console.error(`\nError: Hotspot '${hotspotId}' is not defined in anatomy-data.ts for organ '${organId}'.`);
      console.error(`The spatial/geometric structure must be defined in anatomy-data.ts first before adding hotspot text.\n`);
      process.exit(1);
    }
  }
}

// 1. Ensure type definition in app/i18n/types.ts
const typesFilePath = new URL("../app/i18n/types.ts", import.meta.url);
let typesContent = await readFile(typesFilePath, "utf-8");

if (!organId) {
  // Target is UiDictionary
  typesContent = ensureUiTypeKey(typesContent, targetPath);
} else {
  // Target is OrganContent (unless hotspots which is already Record<string, ...>)
  if (!targetPath.startsWith("hotspots.")) {
    typesContent = ensureOrganTypeKey(typesContent, targetPath);
  }
}

await writeFile(typesFilePath, typesContent, "utf-8");
console.log(`✓ Updated app/i18n/types.ts`);

// 2. Update English file and all other 12 locales
for (const { code } of locales) {
  const isOrgan = Boolean(organId);
  const filePath = new URL(`../app/i18n/${isOrgan ? "organs" : "ui"}/${code}.ts`, import.meta.url);

  let dictModule;
  try {
    dictModule = await import(`../app/i18n/${isOrgan ? "organs" : "ui"}/${code}.ts`);
  } catch (err) {
    dictModule = null;
  }

  let dictData = dictModule ? (isOrgan ? dictModule.organs : dictModule.ui) : {};

  // Clone dictData to avoid mutating frozen module objects
  dictData = JSON.parse(JSON.stringify(dictData));

  if (isOrgan) {
    if (!dictData[organId]) dictData[organId] = {};
    const fullPath = `${organId}.${targetPath}`;
    const currentVal = getDeep(dictData, fullPath);
    if (code === "en" || currentVal === undefined) {
      setDeep(dictData, fullPath, englishValue);
    }
  } else {
    const currentVal = getDeep(dictData, targetPath);
    if (code === "en" || currentVal === undefined) {
      setDeep(dictData, targetPath, englishValue);
    }
  }

  const fileContent = isOrgan
    ? `import type { OrganContentDictionary } from "../types";\n\nexport const organs: OrganContentDictionary = ${formatTs(dictData)};\n`
    : `import type { UiDictionary } from "../types";\n\nexport const ui: UiDictionary = ${formatTs(dictData)};\n`;

  await writeFile(filePath, fileContent, "utf-8");
}
console.log(`✓ Added key '${targetPath}' across all 13 locales`);

// 3. Run audit (Requirement 6)
console.log(`\nRunning i18n audit...\n`);
try {
  execSync("node --experimental-strip-types scripts/i18n-audit.mjs", { stdio: "inherit" });
} catch (e) {
  // Audit logs errors and exits with status code
}

// Helpers
function getDeep(obj, path) {
  const parts = typeof path === "string" ? path.split(".") : path;
  let curr = obj;
  for (const p of parts) {
    if (curr && typeof curr === "object" && p in curr) {
      curr = curr[p];
    } else {
      return undefined;
    }
  }
  return curr;
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

function ensureUiTypeKey(typesContent, pathString) {
  const parts = pathString.split(".");
  const uiRegex = /(export\s+type\s+UiDictionary\s*=\s*\{)([\s\S]*?)(\n\};)/;
  const match = typesContent.match(uiRegex);
  if (!match) return typesContent;

  const header = match[1];
  let body = match[2];
  const footer = match[3];

  if (parts.length === 1) {
    const key = parts[0];
    if (!new RegExp(`\\b${key}\\b\\s*:`).test(body)) {
      body += `\n  ${key}: string;`;
    }
  } else if (parts.length === 2) {
    const [section, field] = parts;
    const secRegex = new RegExp(`(\\b${section}\\s*:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\};)`);
    const secMatch = body.match(secRegex);

    if (secMatch) {
      const secHeader = secMatch[1];
      let secBody = secMatch[2];
      const secFooter = secMatch[3];
      if (!new RegExp(`\\b${field}\\b\\s*:`).test(secBody)) {
        secBody += ` ${field}: string;`;
        body = body.replace(secMatch[0], `${secHeader}${secBody}${secFooter}`);
      }
    } else {
      body += `\n  ${section}: {\n    ${field}: string;\n  };`;
    }
  } else {
    const [section, ...subParts] = parts;
    const field = subParts.join("_");
    const secRegex = new RegExp(`(\\b${section}\\s*:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\};)`);
    const secMatch = body.match(secRegex);
    if (secMatch) {
      if (!new RegExp(`\\b${field}\\b\\s*:`).test(secMatch[2])) {
        body = body.replace(secMatch[0], `${secMatch[1]}${secMatch[2]} ${field}: string;${secMatch[3]}`);
      }
    } else {
      body += `\n  ${section}: {\n    ${field}: string;\n  };`;
    }
  }

  return typesContent.replace(match[0], `${header}${body}${footer}`);
}

function ensureOrganTypeKey(typesContent, pathString) {
  const field = pathString.split(".")[0];
  const organRegex = /(export\s+type\s+OrganContent\s*=\s*\{)([\s\S]*?)(\n\};)/;
  const match = typesContent.match(organRegex);
  if (!match) return typesContent;

  const header = match[1];
  let body = match[2];
  const footer = match[3];

  if (!new RegExp(`\\b${field}\\b\\s*:`).test(body)) {
    body += `\n  ${field}: string;`;
  }

  return typesContent.replace(match[0], `${header}${body}${footer}`);
}
