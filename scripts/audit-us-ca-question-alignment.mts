/**
 * Gate: every checkpoint question belongs to the page that serves it.
 *
 * Three deterministic alignments, none of which had been checked mechanically:
 *
 *   1. every id in a page's `practiceQuestionIds` resolves to a real question
 *   2. the question's own `topicId` is the page it is served on
 *   3. the question's `grade` is the grade of that page's topic
 *   4. no `standardId` is ABOVE the question's grade
 *
 * (4) is the one with teeth. A CCSS id encodes its own grade — `K.CC.A.1` is
 * Kindergarten, `3.OA.A.1` is grade 3, `G-C.1` and `A-SSE.2` are high school — so
 * a Grade 1 question tagged `5.NF.A.1` is asking for a skill the student has not
 * been taught. Below-grade standards are NOT flagged: spiral review of an earlier
 * standard is normal and correct.
 *
 * What this gate deliberately does not do: check the question against the page's
 * DECLARED standards. `usCaliforniaLessons.ts:458` derives that list from the
 * page's own questions (`topicQuestions.flatMap(q => q.standardIds)`), so the
 * comparison is true by construction. An earlier version of this gate ran it and
 * reported "0 mismatches" from 0 actual comparisons — a pass with nothing behind
 * it, which is the failure mode of rounds 14, 17 and 19.
 */
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import * as topicsModule from "../data/usCaliforniaTopics";
import { generatedCaliforniaQuestions } from "../data/usCaliforniaTopics";

const byId = new Map((generatedCaliforniaQuestions as any[]).map((q: any) => [q.id, q]));

/** Topic records live under several exports; collect every one that has a grade. */
const topics: any[] = [];
for (const key of Object.keys(topicsModule)) {
  const value: any = (topicsModule as any)[key];
  if (Array.isArray(value) && value.length && typeof value[0] === "object" && value[0]?.grade && value[0]?.id && !("prompt" in value[0])) {
    topics.push(...value);
  }
}
const topicById = new Map(topics.map((t: any) => [t.id, t]));

/** K = 0, grades 1..8 = 1..8, high school = 9. */
function gradeOrdinal(grade: string): number | null {
  if (grade === "K") return 0;
  const primary = /^P([1-6])$/.exec(grade);
  if (primary) return Number(primary[1]);
  const secondary = /^S([1-6])$/.exec(grade);
  if (secondary) {
    const n = Number(secondary[1]);
    return n <= 2 ? n + 6 : 9;
  }
  return null;
}

function standardOrdinal(id: string): number | null {
  if (/^K\./.test(id)) return 0;
  const numbered = /^([1-8])\./.exec(id);
  if (numbered) return Number(numbered[1]);
  if (/^(HS)?[A-Z]-[A-Z]{1,3}/.test(id)) return 9;
  if (/^CA\.CCSS\.Math\.HS\b/i.test(id)) return 9;
  return null;
}

const defects: string[] = [];
let questions = 0;
let topicComparisons = 0;
let gradeComparisons = 0;
let standardComparisons = 0;
const unmappable = new Set<string>();

for (const seed of usCaliforniaLessonSeeds as any[]) {
  const topic: any = topicById.get(seed.topicId);
  if (!topic) {
    defects.push(`  ${seed.topicId}\n      the page has no topic record, so its grade cannot be checked`);
    continue;
  }
  for (const id of seed.practiceQuestionIds ?? []) {
    const question: any = byId.get(id);
    if (!question) {
      defects.push(`  ${seed.topicId}\n      practiceQuestionIds names "${id}", which resolves to no question`);
      continue;
    }
    questions += 1;

    if (question.topicId) {
      topicComparisons += 1;
      if (question.topicId !== seed.topicId) {
        defects.push(`  ${seed.topicId}\n      question ${id} declares topicId "${question.topicId}"`);
      }
    }
    if (question.grade && topic.grade) {
      gradeComparisons += 1;
      if (question.grade !== topic.grade) {
        defects.push(`  ${seed.topicId}\n      page grade ${topic.grade} but question ${id} is grade ${question.grade}`);
      }
    }

    const g = gradeOrdinal(question.grade);
    if (g === null) {
      unmappable.add(`grade "${question.grade}"`);
      continue;
    }
    for (const standard of question.standardIds ?? []) {
      const o = standardOrdinal(standard);
      if (o === null) {
        unmappable.add(`standard "${standard}"`);
        continue;
      }
      standardComparisons += 1;
      if (o > g) {
        defects.push(
          `  ${seed.topicId}\n      question ${id} is grade ${question.grade} but is tagged ${standard}, which is above that grade`
        );
      }
    }
  }
}

console.log(
  `audit-us-ca-question-alignment: ${questions} questions — ${topicComparisons} topic, ${gradeComparisons} grade, ${standardComparisons} standard-vs-grade comparisons`
);

if (questions === 0) {
  console.error("✗ inspected no questions — the seed-to-question linkage is broken, not clean");
  process.exit(2);
}
// A quiet narrowing of coverage is indistinguishable from clean content (round 19).
if (standardComparisons < 900) {
  console.error(`✗ only ${standardComparisons} standard comparisons; this corpus yields ~1095. Treat as broken, not clean.`);
  process.exit(2);
}
// An id shape nobody taught this gate must not silently reduce its coverage.
if (unmappable.size > 0) {
  console.error(`✗ ${unmappable.size} value(s) could not be mapped to a grade, so they were never checked:`);
  for (const value of unmappable) console.error(`    ${value}`);
  console.error("  Teach the gate the new shape rather than letting it skip.");
  process.exit(2);
}
// The above-grade rule must still fire, and below-grade must still be allowed.
if (!(standardOrdinal("5.NF.A.1")! > gradeOrdinal("P1")!)) {
  console.error("✗ the above-grade rule no longer fires on grade P1 vs 5.NF.A.1 — refusing to report a pass");
  process.exit(2);
}
if (standardOrdinal("K.CC.A.1")! > gradeOrdinal("P3")!) {
  console.error("✗ the rule now flags legitimate below-grade review — refusing to report a pass");
  process.exit(2);
}

if (defects.length) {
  console.error(`\n✗ ${defects.length} alignment defect(s)`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every question belongs to its page, at its grade, tagged at or below that grade");
