/**
 * generate-ccss-registry.mjs — regenerate the two CCSS textbook registry
 * files from the committed source snapshot:
 *
 *   data/ccssTextbookRegistry.ts        (server-safe metadata + id union)
 *   components/lesson/ccss/registry.ts  (code-split dynamic routes)
 *
 * Narrations resolve at module level: hand-authored overrides from
 * data/ccssTextbookNarrations.ts win, the lesson summary is the fallback.
 * Do not hand-edit the outputs; re-run this generator.
 *
 * Run: node scripts/generate-ccss-registry.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(
  readFileSync(path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1", "source.json"), "utf8")
);

// HS lessons get a nominal S3 grade: their real course home (S3–S6) comes
// from the assignments join, and `grade` only drives the reading band, which
// is "high" for every HS course.
const gradeMap = { K: "K", 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5", 6: "P6", 7: "S1", 8: "S2", HS: "S3" };
const lessons = snapshot.lessons;

for (const lesson of lessons) {
  if (!gradeMap[lesson.gradeId]) throw new Error(`${lesson.slug}: unsupported gradeId ${lesson.gradeId}`);
}

const quote = JSON.stringify;

// ---------------------------------------------------------------- registry.ts
const metaEntries = lessons
  .map((lesson) => `  ${quote(lesson.slug)}: withNarration({
    slug: ${quote(lesson.slug)},
    grade: ${quote(gradeMap[lesson.gradeId])},
    ccssGrade: ${quote(lesson.gradeId)},
    title: ${quote(lesson.title)},
    standardIds: ${JSON.stringify(lesson.standardIds)},
    summary: ${quote(lesson.summary)},
    emoji: ${quote(lesson.emoji)}
  })`)
  .join(",\n");

const registryTs = `import { ccssTextbookNarrationOverrides } from "./ccssTextbookNarrations";
import type { GradeId } from "@/types";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/generate-ccss-registry.mjs
 *
 * Server-safe metadata for the ${lessons.length} interactive CCSS textbook lessons
 * ported from the CCSS-Math-Textbook app (snapshot: ccss-textbook-source-v1,
 * ${snapshot.generatedAt}). Mirrors the signature-lab port pattern: metadata
 * lives here and is importable anywhere; the interactive bodies live in
 * \`components/lesson/ccss/lessons/\` and load through the code-split routes in
 * \`components/lesson/ccss/registry.ts\`.
 *
 * Read-aloud narrations resolve from data/ccssTextbookNarrations.ts (hand-
 * authored overrides) with the lesson summary as fallback.
 */

export type CcssTextbookLessonId =
${lessons.map((lesson) => `  | ${quote(lesson.slug)}`).join("\n")};

export type CcssTextbookLessonMeta = {
  slug: CcssTextbookLessonId;
  /** MAIS grade id (upstream CCSS "1"–"5" map to P1–P5). */
  grade: GradeId;
  /** Canonical CCSS grade label from the source registry ("K", "1"–"8", "HS"). */
  ccssGrade: string;
  title: string;
  /** CCSS standard ids this lesson develops; first id is the primary standard. */
  standardIds: string[];
  summary: string;
  emoji: string;
  /** Read-aloud script for the AI audio guide (override ?? summary). */
  narration: string;
};

function withNarration(meta: Omit<CcssTextbookLessonMeta, "narration">): CcssTextbookLessonMeta {
  return { ...meta, narration: ccssTextbookNarrationOverrides[meta.slug] ?? meta.summary };
}

export const ccssTextbookLessons: Record<CcssTextbookLessonId, CcssTextbookLessonMeta> = {
${metaEntries}
};

export const ccssTextbookLessonIds = Object.keys(ccssTextbookLessons) as CcssTextbookLessonId[];

export function isCcssTextbookLessonId(value: string): value is CcssTextbookLessonId {
  return value in ccssTextbookLessons;
}

export function getCcssTextbookLesson(slug: string): CcssTextbookLessonMeta | null {
  return isCcssTextbookLessonId(slug) ? ccssTextbookLessons[slug] : null;
}

/** Grade band for reading-level typography (mirrors the upstream band system). */
export function ccssReadingBandForGrade(grade: GradeId): "early" | "upper" | "middle" | "high" {
  switch (grade) {
    case "K":
    case "P1":
    case "P2":
      return "early";
    case "P3":
    case "P4":
    case "P5":
      return "upper";
    case "P6":
    case "S1":
    case "S2":
      return "middle";
    default:
      return "high";
  }
}
`;

// ------------------------------------------------------------------ routes.ts
const routeEntries = lessons
  .map((lesson) => `  ${quote(lesson.slug)}: dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/${lesson.slug}")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  )`)
  .join(",\n");

const routesTs = `import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { CcssTextbookLessonId } from "@/data/ccssTextbookRegistry";
import type { CcssLessonHostProps } from "@/components/lesson/ccss/CcssLessonAdapter";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/generate-ccss-registry.mjs
 *
 * Code-split routes for the ${lessons.length} ported CCSS textbook lesson bodies. Each
 * lesson loads on its own chunk (with the shared adapter), so the lesson-page
 * shell bundle never carries lesson bodies the student didn't open — the same
 * pattern as \`SignatureLabRoutes\` in VisualizationLabPage.
 *
 * \`satisfies Record<CcssTextbookLessonId, …>\` keeps this map compile-time
 * exhaustive against the metadata registry.
 */
export const ccssLessonRoutes = {
${routeEntries}
} satisfies Record<CcssTextbookLessonId, ComponentType<CcssLessonHostProps>>;

export function getCcssLessonComponent(slug: string): ComponentType<CcssLessonHostProps> | null {
  return slug in ccssLessonRoutes ? ccssLessonRoutes[slug as CcssTextbookLessonId] : null;
}
`;

writeFileSync(path.join(maisRoot, "data", "ccssTextbookRegistry.ts"), registryTs);
writeFileSync(path.join(maisRoot, "components", "lesson", "ccss", "registry.ts"), routesTs);
console.log(`generate-ccss-registry: wrote registry (${lessons.length} lessons) + routes`);
