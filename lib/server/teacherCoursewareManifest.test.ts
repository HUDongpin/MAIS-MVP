import assert from "node:assert/strict";
import test from "node:test";
import { buildTeacherCoursewareManifest, stableTeacherCoursewareJson } from "./teacherCoursewareManifest";
import { coursewareFixture } from "./teacherCoursewareTestFixture";

test("buildTeacherCoursewareManifest is deterministic and preserves one source revision", () => {
  const first = buildTeacherCoursewareManifest(coursewareFixture());
  const second = buildTeacherCoursewareManifest(coursewareFixture());

  assert.equal(first.version.contentHash, second.version.contentHash);
  assert.equal(stableTeacherCoursewareJson(first), stableTeacherCoursewareJson(second));
  assert.equal(first.version.sourceRevision, "2026-08-27T08:30:00.000Z");
  assert.equal(first.source.kitId, "lesson-kit-courseware-test");
  assert.equal(first.objectives.length, 2);
  assert.equal(first.alignment.every((entry) => entry.status === "covered"), true);
  assert.equal(first.exportContracts.every((contract) => contract.contentSource === "canonical-manifest"), true);
  assert.equal(first.quality.status, "review-required", "kit-level inferred alignment must remain explicit even when coverage is complete");
});

test("manifest hash changes when substantive lesson content changes", () => {
  const original = buildTeacherCoursewareManifest(coursewareFixture());
  const changedKit = coursewareFixture();
  changedKit.sections = changedKit.sections.map((section) => section.id === "section-key-points"
    ? { ...section, content: { ...section.content, en: "Use inverse operations on both sides." } }
    : section);
  const changed = buildTeacherCoursewareManifest(changedKit);
  assert.notEqual(changed.version.contentHash, original.version.contentHash);
});

test("quality rubric blocks a kit without practice and assessment evidence", () => {
  const kit = coursewareFixture({
    sections: coursewareFixture().sections.filter((section) => section.kind !== "class-practice")
  });
  const manifest = buildTeacherCoursewareManifest(kit);
  assert.equal(manifest.quality.status, "blocked");
  assert.equal(manifest.quality.issues.some((issue) => issue.code === "practice.missing"), true);
  assert.equal(manifest.quality.issues.some((issue) => issue.code === "assessment.missing"), true);
  assert.equal(manifest.alignment.every((entry) => entry.status === "partial"), true);
});

test("unreviewed generated questions remain visible in the source ledger and rubric", () => {
  const kit = coursewareFixture({ source: "ai", reviewStatus: "needs-review" });
  kit.sections = kit.sections.map((section) => section.id === "section-practice"
    ? { ...section, questions: section.questions?.map((question) => ({ ...question, source: "ai-generated", validationStatus: "needs-review" })) }
    : section);
  const manifest = buildTeacherCoursewareManifest(kit);
  assert.equal(manifest.sourceLedger.some((entry) => entry.kind === "ai-generated" && entry.reviewStatus === "needs-review"), true);
  assert.equal(manifest.quality.issues.some((issue) => issue.code === "ai.review-required"), true);
  assert.equal(manifest.quality.issues.some((issue) => issue.code === "assessment.needs-review"), true);
});
