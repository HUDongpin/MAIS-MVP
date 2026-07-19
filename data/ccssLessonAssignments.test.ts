import assert from "node:assert/strict";
import { test } from "node:test";
import { ccssLessonAssignments, ccssLessonSequenceForTopic } from "@/data/ccssLessonAssignments";
import { ccssTextbookLessons, ccssTextbookLessonIds } from "@/data/ccssTextbookRegistry";
import g6G12QuestionPackJson from "@/data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json";
import kG5TextbookLessonPackJson from "@/data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json";

/**
 * Contract test for the CCSS textbook lesson assignments (Phase 0 QA gate).
 *
 * Pure-data invariants that keep the assignment table honest as the port
 * grows: no assignment can point at a lesson that was never ported, every
 * assignment must target a real K–G5 textbook topic, and every assigned
 * lesson must genuinely share a CCSS standard with its topic (the join that
 * justifies the assignment). Rendering is proven live in the browser; this
 * half runs in CI without a DOM.
 *
 * `ccssLessonRoutes` in components/lesson/ccss/registry.ts covers every
 * CcssTextbookLessonId at compile time via `satisfies`, so route coverage is
 * a type-level guarantee and is not re-checked here.
 */

type PackLesson = {
  metadata: { topicId: string; grade: string; standardIds: string[] };
};

const packLessons = (kG5TextbookLessonPackJson as { lessons: PackLesson[] }).lessons;
const topicStandards = new Map(packLessons.map((lesson) => [lesson.metadata.topicId, lesson.metadata.standardIds]));
const chapterTopicIds = new Set(
  (g6G12QuestionPackJson as { questions: Array<{ topicId: string }> }).questions.map((question) => question.topicId)
);
const ported = new Set<string>(ccssTextbookLessonIds);
const assignmentEntries = Object.entries(ccssLessonAssignments);

test("every referenced lesson is actually ported", () => {
  for (const [topicId, assignment] of assignmentEntries) {
    assert.ok(ported.has(assignment.primary), `${topicId}: primary "${assignment.primary}" is not in ccssTextbookLessons`);
    for (const related of assignment.related ?? []) {
      assert.ok(ported.has(related), `${topicId}: related "${related}" is not in ccssTextbookLessons`);
    }
  }
});

test("every assignment targets a real K–G5 textbook topic or G6–G12 chapter topic", () => {
  for (const [topicId] of assignmentEntries) {
    assert.ok(
      topicStandards.has(topicId) || chapterTopicIds.has(topicId),
      `${topicId}: not a topic in us-ca-math-k-g5-textbooks-v1/lessons.json or the G6–G12 bank`
    );
  }
});

test("every assigned K–G5 lesson shares at least one CCSS standard with its topic", () => {
  // Chapter topics (G6–G12) join at domain level with title-over-tag
  // curation, so the per-standard intersection applies to K–G5 topics only;
  // the chapter rationale strings carry that curation audit trail instead.
  for (const [topicId] of assignmentEntries) {
    if (!topicStandards.has(topicId)) continue;
    const standards = new Set(topicStandards.get(topicId) ?? []);
    for (const slug of ccssLessonSequenceForTopic(topicId)) {
      const lesson = ccssTextbookLessons[slug];
      assert.ok(
        lesson.standardIds.some((id) => standards.has(id)),
        `${topicId}: lesson "${slug}" (${lesson.standardIds.join(", ")}) shares no standard with the topic (${[...standards].join(", ")})`
      );
    }
  }
});

test("every ported lesson is reachable from some topic", () => {
  const reachable = new Set<string>();
  for (const [, assignment] of assignmentEntries) {
    reachable.add(assignment.primary);
    for (const related of assignment.related ?? []) reachable.add(related);
  }
  for (const slug of ccssTextbookLessonIds) {
    assert.ok(reachable.has(slug), `${slug}: orphaned — no topic renders this lesson`);
  }
});

test("primary is never also listed as related, and related has no duplicates", () => {
  for (const [topicId, assignment] of assignmentEntries) {
    const related = assignment.related ?? [];
    assert.ok(!related.includes(assignment.primary), `${topicId}: primary "${assignment.primary}" is duplicated in related`);
    assert.equal(new Set(related).size, related.length, `${topicId}: related has duplicate entries`);
  }
});

test("every assignment carries a curation rationale", () => {
  for (const [topicId, assignment] of assignmentEntries) {
    assert.equal(typeof assignment.rationale, "string", `${topicId}: missing rationale`);
    assert.ok(assignment.rationale.length >= 20, `${topicId}: rationale too thin to audit`);
  }
});

test("every ported lesson has a non-empty read-aloud narration and metadata", () => {
  for (const slug of ccssTextbookLessonIds) {
    const lesson = ccssTextbookLessons[slug];
    assert.equal(lesson.slug, slug, `${slug}: registry key and slug disagree`);
    assert.ok(lesson.narration.trim().length >= 40, `${slug}: narration missing or too short for the audio guide`);
    assert.ok(lesson.standardIds.length > 0, `${slug}: no standardIds`);
    assert.ok(lesson.emoji.trim().length > 0, `${slug}: no emoji`);
  }
});

test("every K–2 lesson has a hand-authored narration, not the summary fallback", () => {
  // Phase 2 (2026-07-19): read-aloud matters most in the early band, so K–P2
  // narrations are authored in data/ccssTextbookNarrations.ts. Upper grades
  // may still fall back to the lesson summary until their authoring pass.
  const earlyGrades = new Set(["K", "P1", "P2"]);
  for (const slug of ccssTextbookLessonIds) {
    const lesson = ccssTextbookLessons[slug];
    if (!earlyGrades.has(lesson.grade)) continue;
    assert.notEqual(
      lesson.narration,
      lesson.summary,
      `${slug}: K–2 narration should be hand-authored, not the summary fallback`
    );
  }
});
