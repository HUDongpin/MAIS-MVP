import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { ccssLessonMetasForTopic } from "@/data/ccssLessonAssignments";
import { signatureLabCcssOverrides } from "@/data/signatureLabCcssOverrides";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { visualizationLabCatalog } from "@/data/visualizationLabs";
import {
  californiaAssignedCoreStandardsByTopic,
  getSignatureLabAssignment,
  hasSignatureLab,
  signatureLabAssignments,
  signatureLabIds
} from "@/data/signatureLabAssignments";

/**
 * Contract test for the signature-lab assignments (Phase 0 QA gate — the
 * "contract" gate from the migration plan §6).
 *
 * These are pure-data invariants that keep the assignment table honest as it
 * grows: no assignment can point at a bench that was never ported, no lab can
 * be marked signature-lab without a curated primary, and every curation choice
 * must carry a rationale. The runtime-probe half of the contract is proven
 * live in the browser; this half is proven statically here so it runs in CI
 * without a DOM.
 *
 * `SignatureLabRoutes` in VisualizationLabPage.tsx already covers every
 * SignatureLabId at compile time via `satisfies Record<SignatureLabId, ...>`,
 * so route coverage is a type-level guarantee and is not re-checked here.
 */

const ported = new Set<string>(signatureLabIds);
const labsByTopicId = new Map(visualizationLabCatalog.map((lab) => [lab.topicId, lab]));
const assignmentEntries = Object.entries(signatureLabAssignments);

function normalizeCcssId(standardId: string) {
  if (standardId === "Modeling") return standardId;
  const parts = standardId.replace(/^HS(?=[NAFGS]-)/, "").split(".");
  const standardNumber = parts.at(-1)?.replace(/[a-z]$/i, "");
  if (parts[0]?.includes("-")) return `${parts[0]}.${standardNumber}`;
  return `${parts[0]}.${parts[1]}.${standardNumber}`;
}

function standardsNamedBySignatureBench(labId: string) {
  const sourcePath = `components/visualizations/signature/${labId}.jsx`;
  assert.equal(existsSync(sourcePath), true, `${labId} has a ported JSX source`);
  const source = readFileSync(sourcePath, "utf8");
  const sourceStandards = source.match(
    /\b(?:(?:K|\d{1,2})\.[A-Z]{1,3}(?:\.[A-Z])?\.\d+[a-z]?|(?:HS)?[NAFGS]-[A-Z]{1,4}(?:\.[A-Z])?\.\d+[a-z]?|Modeling)\b/g
  ) ?? [];
  return new Set(
    [...sourceStandards, ...(signatureLabCcssOverrides[labId] ?? [])].map(normalizeCcssId)
  );
}

test("every referenced bench is actually ported", () => {
  for (const [topicId, assignment] of assignmentEntries) {
    assert.ok(ported.has(assignment.primary), `${topicId}: primary "${assignment.primary}" is not in signatureLabIds`);
    for (const related of assignment.related ?? []) {
      assert.ok(ported.has(related), `${topicId}: related "${related}" is not in signatureLabIds`);
    }
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
    assert.equal(typeof assignment.rationale, "string");
    assert.ok(assignment.rationale.trim().length >= 20, `${topicId}: rationale is missing or too short to be an audit trail`);
  }
});

test("every assigned topic id exists in the visualization catalog", () => {
  for (const [topicId] of assignmentEntries) {
    assert.ok(labsByTopicId.has(topicId), `assignment key "${topicId}" matches no lab in visualizationLabCatalog`);
  }
});

test("assigned topics render as signature labs; unassigned topics do not", () => {
  // The data layer and the render decision must agree: a topic gets the
  // signature module id iff it has an assignment. This is the invariant that
  // guarantees no signature lab silently falls back to the template, and no
  // template lab is mislabelled as a bench.
  for (const lab of visualizationLabCatalog) {
    const assigned = hasSignatureLab(lab.topicId);
    if (lab.moduleId === "signature-lab") {
      assert.ok(assigned, `${lab.topicId} has moduleId "signature-lab" but no assignment — it would fall back to the template`);
    } else {
      assert.ok(!assigned, `${lab.topicId} has an assignment but moduleId "${lab.moduleId}" — it would not render its bench`);
    }
  }
});

test("getSignatureLabAssignment resolves assigned topics and rejects others", () => {
  const [firstTopicId] = assignmentEntries[0] ?? [];
  assert.ok(firstTopicId, "expected at least one assignment in Phase 0");
  assert.equal(getSignatureLabAssignment(firstTopicId)?.primary, signatureLabAssignments[firstTopicId!].primary);
  assert.equal(getSignatureLabAssignment(null), null);
  assert.equal(getSignatureLabAssignment("does-not-exist"), null);
});

test("compact California core metadata exactly mirrors all 64 assigned interactive lesson unions", () => {
  const assignedCaliforniaLessons = usCaliforniaLessonSeeds.filter(
    (lesson) => ccssLessonMetasForTopic(lesson.topicId).length > 0
  );

  assert.equal(usCaliforniaLessonSeeds.length, 76);
  assert.equal(assignedCaliforniaLessons.length, 64);
  assert.equal(Object.keys(californiaAssignedCoreStandardsByTopic).length, 64);

  assignedCaliforniaLessons.forEach((lesson) => {
    const expectedStandardIds = [
      ...new Set(ccssLessonMetasForTopic(lesson.topicId).flatMap((meta) => meta.standardIds))
    ];
    assert.deepEqual(
      californiaAssignedCoreStandardsByTopic[lesson.topicId],
      expectedStandardIds,
      `${lesson.topicId}: compact client metadata must equal the displayed interactive-core union`
    );
  });
});

test("Visualization Lab client data uses compact standards without importing the lesson registry or narrations", () => {
  const visualizationCatalogSource = readFileSync("data/visualizationLabs.ts", "utf8");
  const compactMetadataSource = readFileSync("data/signatureLabAssignments.ts", "utf8");

  assert.doesNotMatch(visualizationCatalogSource, /ccssLessonAssignments|ccssTextbookRegistry|ccssTextbookNarrations/);
  assert.match(visualizationCatalogSource, /getCaliforniaAssignedCoreStandardIds/);
  assert.doesNotMatch(compactMetadataSource, /from\s+["']\.\/ccssLessonAssignments["']/);
  assert.doesNotMatch(compactMetadataSource, /ccssTextbookRegistry|ccssTextbookNarrations/);
});

test("all 64 assigned California signature primaries overlap the displayed core", () => {
  let checkedPrimaryCount = 0;
  let overlappingPrimaryCount = 0;
  let assignmentLocalAlignmentCount = 0;

  usCaliforniaLessonSeeds.forEach((lesson) => {
    const assignedCore = californiaAssignedCoreStandardsByTopic[lesson.topicId];
    if (!assignedCore) return;
    checkedPrimaryCount += 1;

    const assignment = getSignatureLabAssignment(lesson.topicId);
    assert.ok(assignment, `${lesson.topicId} has a curated signature primary`);
    const normalizedCore = new Set(assignedCore.map(normalizeCcssId));
    const assignmentLocalStandards = (assignment.primaryCoreStandardIds ?? []).map(normalizeCcssId);
    const benchStandards = new Set([
      ...standardsNamedBySignatureBench(assignment.primary),
      ...assignmentLocalStandards
    ]);
    const overlaps = [...benchStandards].some((standardId) => normalizedCore.has(standardId));
    assert.equal(overlaps, true, `${lesson.topicId}: ${assignment.primary} must overlap the displayed interactive core`);
    overlappingPrimaryCount += 1;
    if (assignmentLocalStandards.length > 0) assignmentLocalAlignmentCount += 1;
  });

  assert.equal(checkedPrimaryCount, 64);
  assert.equal(overlappingPrimaryCount, 64);
  assert.equal(assignmentLocalAlignmentCount, 1);
  assert.deepEqual(signatureLabAssignments["us-ca-math-s6-chapter-01"].primaryCoreStandardIds, ["N-Q.1"]);
  assert.match(signatureLabAssignments["us-ca-math-s6-chapter-01"].rationale, /quantities, units, scale, and appropriate precision/i);
});

test("corrected California signature primaries keep the assigned core at the pedagogical center", () => {
  const expectedPrimaryByTopic = new Map([
    ["us-ca-math-p5-5-md-volume-data", "VolumeLab"],
    ["us-ca-math-s2-chapter-01", "RationalNumbersLab"],
    ["us-ca-math-s2-chapter-04", "PythagorasLab"],
    ["us-ca-math-s3-chapter-03", "EquationLab"],
    ["us-ca-math-s6-chapter-01", "UnitConversionLab"],
    ["us-ca-math-s6-chapter-05", "VectorLab"]
  ]);

  expectedPrimaryByTopic.forEach((expectedPrimary, topicId) => {
    const assignment = getSignatureLabAssignment(topicId);
    assert.equal(assignment?.primary, expectedPrimary, `${topicId} keeps the proven pedagogical center`);
    assert.match(assignment?.rationale ?? "", /rendered|lesson core|pedagogically|direct concept/i);
  });

  assert.deepEqual(signatureLabAssignments["us-ca-math-p5-5-md-volume-data"].related, ["UnitConversionLab", "FractionLinePlotLab"]);
  assert.deepEqual(signatureLabAssignments["us-ca-math-s6-chapter-05"].related, ["MatrixLab", "GeometricModelingLab"]);
});
