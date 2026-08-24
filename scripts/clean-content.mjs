#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: node scripts/clean-content.mjs <dir>");
  process.exit(1);
}

const SECTIONS_TO_STRIP = [
  "Tenpa's critical notes",
  "Tenpa's working notes",
  "Tenpa's assessment",
  "Role in Tenpa's argument",
  "Open questions",
  "Open questions / points of contention",
  "Open questions / pending verification",
  "Current confidence level",
  "Confidence level",
  "What would change Tenpa's mind\\?",
  "Why it matters",
];

const WORD_REPLACEMENTS = [
  [/\bingested\b/gi, "added"],
  [/\bingesting\b/gi, "adding"],
  [/\bingestion\b/gi, "addition"],
  [/\bingest\b/gi, "addition"],
  [/\bclaude\b/gi, ""],
];

function escapeForApostrophes(title) {
  // Match both straight and curly apostrophes interchangeably.
  return title.replace(/'/g, "['’]");
}

function stripSections(text) {
  for (const title of SECTIONS_TO_STRIP) {
    const pattern = new RegExp(
      `^#{2,3}\\s+${escapeForApostrophes(title)}\\s*$[\\s\\S]*?(?=^#{1,3}[ \\t]|$(?![\\s\\S]))`,
      "gm",
    );
    text = text.replace(pattern, "");
  }
  return text;
}

function applyWordReplacements(text) {
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function stripTenpa(text) {
  text = text.replace(/\bTenpa(['’]s)\s*paper\b/g, "the argument of framework necessity");
  text = text.replace(/\bTenpa(['’]s)\b/g, "the wiki author's");
  return text.replace(/\bTenpa\swants\b/g, "we want");
}

function stripPaperRefs(text) {
  text = text.replace(/§\s*\d+(\.\d+)?/g, "");
  text = text.replace(/\bSection\s+\d+(\.\d+)?\b/g, "");
  text = text.replace(/^- (\*\*)?Paper outline.*$/gm, "");
  text = text.replace(/\bthe paper['’]s\b/g, "this wiki's");
  text = text.replace(/\bthe paper\b/g, "this wiki");
  return text;
}

function tidy(text) {
  text = text.replace(/[ \t]+$/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.replace(/\s+$/, "") + "\n";
}

function clean(text) {
  let out = stripSections(text);
  out = applyWordReplacements(out);
  out = stripTenpa(out);
  out = stripPaperRefs(out);
  return tidy(out);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path);
    } else if (st.isFile() && path.endsWith(".md")) {
      const original = readFileSync(path, "utf8");
      const cleaned = clean(original);
      if (cleaned !== original) {
        writeFileSync(path, cleaned);
        console.log(`cleaned: ${path}`);
      }
    }
  }
}

walk(root);
