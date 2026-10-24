/**
 * build-ccss-claude-snapshot.mjs — assemble the MAIS-authored interactive
 * lesson snapshot `data/generated-content/ccss-textbook-claude-v1/source.json`
 * from the per-lesson records committed under
 * `data/generated-content/ccss-textbook-claude-v1/lessons/<slug>.meta.json`.
 *
 * The snapshot has the same shape as the upstream port snapshot
 * (`ccss-textbook-source-v1/source.json`) so the existing generators
 * (`generate-ccss-registry.mjs`, `build-ccss-lesson-assignments.mjs`) can merge
 * it, plus per-lesson `topicId` (the California chapter the lesson opens) and
 * an authored read-aloud `narration`. `practiceBySlug` carries the hand-checked
 * chapter checks rendered on the textbook routes; it is NOT a question-bank
 * pack (promotion into the live bank runs through the A21 -> A18 -> A23 chain).
 *
 * Every record is validated against the lesson file it describes: the body must
 * exist, be a client component with a default export, cite only the standards
 * the record lists, and ship its per-lesson mathematics test.
 *
 * Run: node scripts/build-ccss-claude-snapshot.mjs
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packDir = path.join(maisRoot, "data", "generated-content", "ccss-textbook-claude-v1");
const recordsDir = path.join(packDir, "lessons");
const lessonDir = path.join(maisRoot, "components", "lesson", "ccss", "lessons");
const ccssDir = path.join(maisRoot, "data", "ccss");

const knownStandardIds = new Set(
  readdirSync(ccssDir)
    .filter((name) => /^grade/.test(name) && name.endsWith(".ts"))
    .flatMap((name) => [...readFileSync(path.join(ccssDir, name), "utf8").matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]))
);
const allowedGradeIds = new Set(["6", "7", "8", "HS"]);
const chapterTopicPattern = /^us-ca-math-(?:p6|s[1-6])-chapter-\d{2}$/;
const problems = [];

const records = existsSync(recordsDir)
  ? readdirSync(recordsDir)
      .filter((name) => name.endsWith(".meta.json"))
      .sort()
      .map((name) => JSON.parse(readFileSync(path.join(recordsDir, name), "utf8")))
  : [];

const seenTopics = new Map();
for (const record of records) {
  const where = `${record.slug ?? "?"}`;
  if (!/^[a-z0-9-]+$/.test(record.slug ?? "")) problems.push(`${where}: slug must be kebab-case`);
  if (!allowedGradeIds.has(record.gradeId)) problems.push(`${where}: gradeId must be one of 6, 7, 8, HS`);
  if (!chapterTopicPattern.test(record.topicId ?? "")) problems.push(`${where}: topicId must be a California chapter topic`);
  if (seenTopics.has(record.topicId)) problems.push(`${where}: chapter ${record.topicId} already has opener ${seenTopics.get(record.topicId)}`);
  seenTopics.set(record.topicId, record.slug);
  if (typeof record.title !== "string" || !record.title.trim()) problems.push(`${where}: title required`);
  if (typeof record.summary !== "string" || record.summary.length > 160) problems.push(`${where}: summary must be a short sentence (<=160 chars)`);
  if (typeof record.emoji !== "string" || [...record.emoji].length > 2) problems.push(`${where}: emoji must be a single emoji`);
  if (typeof record.narration !== "string" || record.narration.length < 40) problems.push(`${where}: narration must be a read-aloud script`);
  if (!Array.isArray(record.standardIds) || record.standardIds.length === 0) problems.push(`${where}: standardIds required`);
  for (const id of record.standardIds ?? []) {
    if (!knownStandardIds.has(id)) problems.push(`${where}: unknown CCSS id ${id}`);
  }
  if (/[㐀-鿿豈-﫿]/.test(JSON.stringify(record))) problems.push(`${where}: CJK text in an English-only record`);

  const lessonPath = path.join(lessonDir, `${record.slug}.tsx`);
  const testPath = path.join(lessonDir, `${record.slug}.test.ts`);
  if (!existsSync(lessonPath)) {
    problems.push(`${where}: missing lesson body ${path.relative(maisRoot, lessonPath)}`);
  } else {
    const source = readFileSync(lessonPath, "utf8");
    if (!/^"use client";/.test(source)) problems.push(`${where}: lesson body must start with "use client"`);
    if (!/export default function Lesson\b/.test(source)) problems.push(`${where}: lesson body must default-export Lesson`);
    const cited = new Set([...source.matchAll(/\b((?:[K1-8]\.[A-Z]+\.[A-Z]\.\d+)|(?:[A-Z]-[A-Z]+\.\d+))\b/g)].map((m) => m[1]));
    const listed = new Set(record.standardIds ?? []);
    for (const id of cited) {
      if (knownStandardIds.has(id) && !listed.has(id)) problems.push(`${where}: lesson cites ${id}, which is not in its standardIds`);
    }
  }
  if (!existsSync(testPath)) problems.push(`${where}: missing mathematics test ${path.relative(maisRoot, testPath)}`);

  const practice = record.practice ?? [];
  if (practice.length !== 3) problems.push(`${where}: exactly 3 chapter-check questions required, has ${practice.length}`);
  practice.forEach((question, index) => {
    const key = `${where}#${index}`;
    if (question.kind === "mc") {
      if (!Array.isArray(question.choices) || question.choices.length !== 4) problems.push(`${key}: mc needs exactly 4 choices`);
      if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) problems.push(`${key}: mc answer must be a choice index 0-3`);
      if (new Set((question.choices ?? []).map((c) => String(c).trim().toLowerCase())).size !== (question.choices ?? []).length) problems.push(`${key}: duplicate choices`);
    } else if (question.kind === "numeric") {
      if (typeof question.answer !== "number" || !Number.isFinite(question.answer)) problems.push(`${key}: numeric answer must be a finite number`);
    } else {
      problems.push(`${key}: kind must be numeric or mc`);
    }
    if (typeof question.prompt !== "string" || !question.prompt.trim()) problems.push(`${key}: prompt required`);
    if (typeof question.explanation !== "string" || !question.explanation.trim()) problems.push(`${key}: explanation required`);
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\nbuild-ccss-claude-snapshot: ${problems.length} problem(s).`);
  process.exit(1);
}

const lessons = records.map((record) => ({
  slug: record.slug,
  gradeId: record.gradeId,
  topicId: record.topicId,
  title: record.title,
  standardIds: record.standardIds,
  summary: record.summary,
  emoji: record.emoji,
  narration: record.narration
}));
const practiceBySlug = Object.fromEntries(records.map((record) => [record.slug, record.practice]));

const existing = existsSync(path.join(packDir, "source.json"))
  ? JSON.parse(readFileSync(path.join(packDir, "source.json"), "utf8"))
  : {};

const snapshot = {
  packageId: "ccss-textbook-claude-v1",
  generatedAt: existing.generatedAt ?? "2026-09-02",
  generator:
    "Claude Fable 5.1 authoring workflow, session 2026-09-02 (one author per chapter + three adversarial verifiers per lesson + repair loop); assembled by scripts/build-ccss-claude-snapshot.mjs from lessons/*.meta.json",
  scope: { grades: ["6", "7", "8", "HS"], lessonCount: lessons.length },
  lessons,
  practiceBySlug
};
writeFileSync(path.join(packDir, "source.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`build-ccss-claude-snapshot: wrote ${lessons.length} MAIS-authored lesson(s), ${Object.values(practiceBySlug).flat().length} chapter-check question(s)`);
