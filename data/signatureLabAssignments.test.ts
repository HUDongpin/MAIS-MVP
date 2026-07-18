import assert from "node:assert/strict";
import { test } from "node:test";
import { visualizationLabCatalog } from "@/data/visualizationLabs";
import {
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
