#!/usr/bin/env node
/**
 * Tailwind-4 → Tailwind-3.4 compatibility audit for ported CCSS textbook
 * lessons (`components/lesson/ccss/`).
 *
 * The source app runs Tailwind 4; MAIS runs 3.4. Ported lesson bodies are
 * never edited, so this audit fails loudly if a copied file uses syntax that
 * Tailwind 3.4 cannot compile — the fix is a mechanical rewrite recorded in
 * the port script, not a hand edit.
 *
 * Run: node scripts/audit-ccss-lesson-classes.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = join(root, "components", "lesson", "ccss");

/** Tailwind-4-only syntax that 3.4 silently drops or rejects. */
const forbidden = [
  { name: "v4 CSS-variable shorthand (use v3 arbitrary value `x-[var(--y)]`)", pattern: /(?:^|[\s"'`])[a-z-]+-\(--[a-z-]+\)/ },
  { name: "bg-linear-* gradient (v4 rename of bg-gradient-*)", pattern: /(?:^|[\s"'`])bg-linear-/ },
  { name: "inset-shadow-* utility (v4 only)", pattern: /(?:^|[\s"'`])inset-shadow-/ },
  { name: "text-shadow-* utility (v4 only)", pattern: /(?:^|[\s"'`])text-shadow-/ },
  { name: "field-sizing-* utility (v4 only)", pattern: /(?:^|[\s"'`])field-sizing-/ },
  { name: "not-* variant (v4 only)", pattern: /(?:^|[\s"'`])not-\[/ },
  { name: "@theme directive (v4 config-in-CSS)", pattern: /@theme\b/ },
  { name: "@import \"tailwindcss\" (v4 entrypoint)", pattern: /@import\s+"tailwindcss"/ }
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(tsx|ts|css)$/.test(entry.name) ? [path] : [];
  });
}

const files = walk(lessonDir);
if (files.length === 0) {
  console.error(`audit-ccss-lesson-classes: no files found under ${lessonDir}`);
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const rule of forbidden) {
      if (rule.pattern.test(line)) {
        failures += 1;
        console.error(`${file}:${index + 1} — ${rule.name}\n    ${line.trim()}`);
      }
    }
  });
}

if (failures > 0) {
  console.error(`\naudit-ccss-lesson-classes: ${failures} Tailwind-4-only usage(s) found.`);
  process.exit(1);
}
console.log(`audit-ccss-lesson-classes: ${files.length} file(s) clean.`);
