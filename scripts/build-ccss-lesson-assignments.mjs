/**
 * build-ccss-lesson-assignments.mjs — regenerate `data/ccssLessonAssignments.ts`
 * from the CCSS-standard join between the California K–G5 textbook topics and
 * the ported CCSS textbook lessons.
 *
 * Join: a lesson is a candidate for a topic when they share a grade and at
 * least one CCSS standard id. Candidates order by the document position of the
 * lesson's primary standard (upstream units.ts logic), so each topic's lessons
 * read in curriculum order; the first is `primary`, the rest `related`.
 * `curatedPrimaries` can pin a different primary per topic (the signature-lab
 * `curated` pattern); the join result is otherwise untouched.
 *
 * 2026-07-19 join result: 29/29 topics covered, 112/112 lessons reachable,
 * zero orphans — no curation currently needed.
 *
 * Run: node scripts/build-ccss-lesson-assignments.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(
  readFileSync(path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1", "source.json"), "utf8")
);
const topicPack = JSON.parse(
  readFileSync(path.join(maisRoot, "data", "generated-content", "us-ca-math-k-g5-textbooks-v1", "lessons.json"), "utf8")
);

/** Pin a topic's primary when the join order is not the right anchor. */
const curatedPrimaries = {
  // "Linear and Quadratic Models" should open with solving linear equations
  // (A-REI.1/3), not the expression-structure lesson document order puts first.
  "us-ca-math-s3-chapter-03": "solve-equations-steps"
};

const gradeMap = { K: "K", 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5" };

// Document position of every K–5 standard (domain order, then standard order).
const standardPosition = new Map();
for (const grade of snapshot.ccssGrades) {
  let position = 0;
  for (const domain of grade.domains) {
    for (const standardId of domain.standardIds) {
      standardPosition.set(standardId, position);
      position += 1;
    }
  }
}

const lessons = snapshot.lessons.map((lesson) => ({
  slug: lesson.slug,
  grade: gradeMap[lesson.gradeId],
  standardIds: lesson.standardIds
}));

const assignments = [];
const homesBySlug = new Map(lessons.map((lesson) => [lesson.slug, []]));

for (const packLesson of topicPack.lessons) {
  const { topicId, grade, standardIds } = packLesson.metadata;
  const topicStandards = new Set(standardIds);
  const candidates = lessons
    .filter((lesson) => lesson.grade === grade && lesson.standardIds.some((id) => topicStandards.has(id)))
    .sort(
      (a, b) =>
        (standardPosition.get(a.standardIds[0]) ?? Infinity) - (standardPosition.get(b.standardIds[0]) ?? Infinity) ||
        a.slug.localeCompare(b.slug)
    );
  if (candidates.length === 0) {
    console.warn(`WARN ${topicId}: no candidate lessons`);
    continue;
  }

  let ordered = candidates.map((candidate) => candidate.slug);
  const curated = curatedPrimaries[topicId];
  if (curated) {
    if (!ordered.includes(curated)) throw new Error(`${topicId}: curated primary "${curated}" is not a candidate`);
    ordered = [curated, ...ordered.filter((slug) => slug !== curated)];
  }

  const sharedByLesson = ordered.map((slug) => {
    const lesson = lessons.find((candidate) => candidate.slug === slug);
    return `${slug} (${lesson.standardIds.filter((id) => topicStandards.has(id)).join(", ")})`;
  });
  assignments.push({
    topicId,
    primary: ordered[0],
    related: ordered.slice(1),
    rationale:
      `CCSS join on ${standardIds.join(", ")}: ${ordered.length} ported lesson(s) share these standards — ` +
      `${sharedByLesson.join("; ")}. ` +
      (curated
        ? `Primary pinned by curation.`
        : `Primary is first in document standard order (upstream units.ts ordering).`)
  });
  for (const slug of ordered) homesBySlug.get(slug).push(topicId);
}

// ---------------------------------------------------------------------------
// G6–G12 chapter topics (Phase 5). The generated bank tags chapters at DOMAIN
// level only (`CA.CCSS.Math.G6.RP`, `CA.CCSS.Math.HS.A-SSE`), and several
// chapters' tags contradict their titles. Per the owner's signature-lab
// precedent (s3-chapter-04, 2026-07-18): the chapter TITLE is the truth. The
// override table below curates title-derived standard prefixes for every
// misfit chapter; untouched chapters use their tag-derived domain prefix.
// ---------------------------------------------------------------------------
const bankPack = JSON.parse(
  readFileSync(
    path.join(maisRoot, "data", "generated-content", "us-ca-math-g6-g12-generated-bank-v2-1500", "question-pack.json"),
    "utf8"
  )
);

/**
 * Title-curated standard prefixes per chapter (title-over-tag). A lesson
 * matches a chapter when any of its standardIds equals a prefix or starts
 * with `<prefix>.`. Chapters absent here derive their prefix from the bank
 * tag ("CA.CCSS.Math.G6.RP" → "6.RP", "CA.CCSS.Math.HS.A-SSE" → "A-SSE").
 */
const chapterStandardPrefixes = {
  // S2 (G8): titles are shifted one domain relative to the tags.
  "us-ca-math-s2-chapter-01": { prefixes: ["8.EE.C", "8.NS"], why: "title 'Linear Equations and Systems Readiness' = 8.EE.C systems + 8.NS readiness (tag G8.NS is off-by-one)" },
  "us-ca-math-s2-chapter-02": { prefixes: ["8.F", "8.EE.B"], why: "title 'Functions and Rate of Change' = 8.F + 8.EE.B slope (tag G8.EE is off-by-one)" },
  "us-ca-math-s2-chapter-03": { prefixes: ["8.G.A"], why: "title 'Transformations and Similarity' = 8.G.A (tag G8.F is off-by-one)" },
  "us-ca-math-s2-chapter-04": { prefixes: ["8.G.B", "8.G.C", "8.EE.A"], why: "title 'Pythagorean Reasoning and Coordinate Geometry' = 8.G.B–C plus 8.EE.A roots/exponents readiness" },
  // S3: tags are rotated one chapter relative to the titles.
  "us-ca-math-s3-chapter-01": { prefixes: ["N-RN", "A-CED"], why: "title 'Equations from Context' = A-CED, keeping the tagged N-RN number work as course readiness" },
  "us-ca-math-s3-chapter-02": { prefixes: ["F-IF"], why: "title 'Function Notation and Interpretation' = F-IF (tag A-CED is rotated)" },
  "us-ca-math-s3-chapter-03": { prefixes: ["A-REI", "A-SSE.1", "A-SSE.2", "A-SSE.3"], why: "title 'Linear and Quadratic Models' = A-REI solving + quadratic expression structure; F-LE model-choice lessons live in S5 ch02, their natural home" },
  "us-ca-math-s3-chapter-04": { prefixes: ["G-GPE"], why: "title 'Coordinate Geometry Methods' = G-GPE (tag F-IF is rotated) — same owner curation as the signature labs" },
  "us-ca-math-s3-chapter-05": { prefixes: ["S-ID"], why: "title 'Modeling with Evidence' = S-ID data modeling (tag G-GPE is rotated)" },
  // S4 ch03 also hosts solid geometry (no chapter carries G-GMD otherwise).
  "us-ca-math-s4-chapter-03": { prefixes: ["G-C", "G-GMD"], why: "title 'Circle Geometry' = G-C; G-GMD solids join here as the course's measurement strand" },
  // S6: ch03/ch04 tags are swapped; ch02 takes complex numbers with polynomials;
  // ch05 capstone hosts modeling-adjacent domains with no other home.
  "us-ca-math-s6-chapter-02": { prefixes: ["A-APR", "N-CN"], why: "title 'Polynomial Structure and Behavior': N-CN complex roots complete the polynomial story" },
  "us-ca-math-s6-chapter-03": { prefixes: ["S-MD"], why: "title 'Decision Statistics' = S-MD (tag F-IF is swapped with ch04)" },
  "us-ca-math-s6-chapter-04": { prefixes: ["F-IF"], why: "title 'Function Analysis and Rates' = F-IF (tag S-MD is swapped with ch03)" },
  "us-ca-math-s6-chapter-05": { prefixes: ["Modeling", "G-MG", "N-VM"], why: "title 'Capstone Modeling': G-MG geometric modeling and N-VM vector/matrix tools join the capstone" }
};

function tagToPrefix(tag) {
  const short = tag.replace("CA.CCSS.Math.", "");
  if (short.startsWith("HS.")) return short.slice(3); // "HS.A-SSE" → "A-SSE"
  return short.replace(/^G(\d)\./, "$1."); // "G6.RP" → "6.RP"
}

const chapterGradeToLessonGrade = { P6: "6", S1: "7", S2: "8", S3: "HS", S4: "HS", S5: "HS", S6: "HS" };

const chapters = new Map();
for (const question of bankPack.questions) {
  const existing = chapters.get(question.topicId) ?? {
    topicId: question.topicId,
    grade: question.grade,
    chapterNumber: question.chapterNumber,
    title: typeof question.chapterTitle === "object" ? question.chapterTitle.en : question.chapterTitle,
    tags: new Set()
  };
  for (const tag of question.standardIds) existing.tags.add(tag);
  chapters.set(question.topicId, existing);
}

const chapterList = [...chapters.values()].sort(
  (a, b) => a.grade.localeCompare(b.grade) || a.chapterNumber - b.chapterNumber
);

function lessonMatchesPrefixes(candidate, prefixes) {
  return candidate.standardIds.some((id) =>
    prefixes.some((prefix) => id === prefix || id.startsWith(`${prefix}.`))
  );
}

for (const chapter of chapterList) {
  const override = chapterStandardPrefixes[chapter.topicId];
  const prefixes = override?.prefixes ?? [...chapter.tags].map(tagToPrefix);
  const lessonGrade = chapterGradeToLessonGrade[chapter.grade];
  const candidates = snapshot.lessons
    .filter((candidate) => candidate.gradeId === lessonGrade && lessonMatchesPrefixes(candidate, prefixes))
    .sort(
      (a, b) =>
        (standardPosition.get(a.standardIds[0]) ?? Infinity) - (standardPosition.get(b.standardIds[0]) ?? Infinity) ||
        a.slug.localeCompare(b.slug)
    );
  if (candidates.length === 0) {
    console.warn(`WARN ${chapter.topicId} ("${chapter.title}"): no candidate lessons for [${prefixes.join(", ")}]`);
    continue;
  }

  let ordered = candidates.map((candidate) => candidate.slug);
  const curated = curatedPrimaries[chapter.topicId];
  if (curated) {
    if (!ordered.includes(curated)) throw new Error(`${chapter.topicId}: curated primary "${curated}" is not a candidate`);
    ordered = [curated, ...ordered.filter((slug) => slug !== curated)];
  }

  assignments.push({
    topicId: chapter.topicId,
    primary: ordered[0],
    related: ordered.slice(1),
    rationale:
      `${chapter.grade} chapter ${chapter.chapterNumber} "${chapter.title}": ${ordered.length} ported lesson(s) match ` +
      `standard prefixes [${prefixes.join(", ")}]` +
      (override ? ` (title-over-tag curation: ${override.why})` : ` (from the chapter's bank domain tag)`) +
      `. Primary is first in document standard order.`
  });
  for (const slug of ordered) {
    const homes = homesBySlug.get(slug);
    if (homes) homes.push(chapter.topicId);
  }
}

const orphans = [...homesBySlug.entries()].filter(([, homes]) => homes.length === 0).map(([slug]) => slug);
if (orphans.length) {
  console.warn(`WARN orphan lessons with no topic home: ${orphans.join(", ")}`);
}

const quote = JSON.stringify;
const entries = assignments
  .map((assignment) => `  ${quote(assignment.topicId)}: {
    primary: ${quote(assignment.primary)},
    related: ${JSON.stringify(assignment.related)},
    rationale:
      ${quote(assignment.rationale)}
  }`)
  .join(",\n");

const output = `import { ccssTextbookLessons, type CcssTextbookLessonId } from "@/data/ccssTextbookRegistry";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/build-ccss-lesson-assignments.mjs
 *
 * Curated mapping from a MAIS topic id to the interactive CCSS textbook
 * lessons that render as that topic's lesson core.
 *
 * Same contract as \`signatureLabAssignments\` (the owner's fan-out strategy):
 * a topic listed here renders its assigned lessons instead of the generated
 * concept/worked-example text blocks; a topic absent here keeps the generated
 * blocks, so coverage is explicit and revertible per line. \`primary\` leads and
 * anchors the topic; \`related\` lessons follow in document standard order.
 * Every referenced slug must be ported — the contract test enforces it.
 *
 * Join result (${snapshot.generatedAt}): ${assignments.length} topics covered
 * (29 K–G5 textbook + ${assignments.length - 29} G6–G12 chapter topics),
 * ${lessons.length - orphans.length}/${lessons.length} lessons reachable${orphans.length ? ` (orphans: ${orphans.join(", ")})` : ", zero orphans"}.
 */

export type CcssLessonAssignment = {
  /** The lesson that leads the topic's lesson core. */
  primary: CcssTextbookLessonId;
  /** Further ported lessons matching this topic's standards, rendered after the primary. */
  related?: CcssTextbookLessonId[];
  /** Why this primary was chosen. Required — the curation audit trail. */
  rationale: string;
};

export const ccssLessonAssignments: Record<string, CcssLessonAssignment> = {
${entries}
};

export function hasCcssLessonAssignment(topicId: string): boolean {
  return topicId in ccssLessonAssignments;
}

export function getCcssLessonAssignment(topicId: string): CcssLessonAssignment | null {
  return ccssLessonAssignments[topicId] ?? null;
}

/** The topic's lessons in render order: primary first, then related. */
export function ccssLessonSequenceForTopic(topicId: string): CcssTextbookLessonId[] {
  const assignment = ccssLessonAssignments[topicId];
  if (!assignment) return [];
  return [assignment.primary, ...(assignment.related ?? [])];
}

/** Meta lookup for every lesson assigned to a topic, render-ordered. */
export function ccssLessonMetasForTopic(topicId: string) {
  return ccssLessonSequenceForTopic(topicId).map((slug) => ccssTextbookLessons[slug]);
}
`;

writeFileSync(path.join(maisRoot, "data", "ccssLessonAssignments.ts"), output);

// Machine-readable byproduct for downstream generators (practice pack builder).
writeFileSync(
  path.join(maisRoot, "data", "generated-content", "ccss-textbook-source-v1", "assignments.json"),
  `${JSON.stringify(
    {
      generatedAt: snapshot.generatedAt,
      assignments: assignments.map(({ topicId, primary, related }) => ({ topicId, primary, related }))
    },
    null,
    2
  )}\n`
);
console.log(
  `build-ccss-lesson-assignments: ${assignments.length} topics, ${lessons.length - orphans.length}/${lessons.length} lessons reachable`
);
