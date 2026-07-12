import assert from "node:assert/strict";
import test from "node:test";

import { hasCanonicalMathSceneV2FinalAuditEvidenceId } from "./mathSceneV2FinalAuditEvidenceId";

test("MAIS Manim v2 final audit evidence id validator keeps accepted proof ids and blocked revision ids distinct", () => {
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "accepted-final-objective-audit-4-of-4",
      provenRequirementCount: 4,
      requirementCount: 4,
      status: "accepted"
    }),
    true
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "accepted-final-objective-audit-4-of-4-rerun",
      provenRequirementCount: 4,
      requirementCount: 4,
      status: "accepted"
    }),
    true
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "accepted-final-objective-audit-3-of-4",
      provenRequirementCount: 4,
      requirementCount: 4,
      status: "accepted"
    }),
    false
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "accepted-final-objective-audit-4-of-4-",
      provenRequirementCount: 4,
      requirementCount: 4,
      status: "accepted"
    }),
    false
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "blocked-final-objective-audit-a18-revision-needed",
      provenRequirementCount: 3,
      requirementCount: 4,
      status: "blocked"
    }),
    true
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "blocked-final-objective-audit-4-of-4",
      provenRequirementCount: 3,
      requirementCount: 4,
      status: "blocked"
    }),
    false
  );
  assert.equal(
    hasCanonicalMathSceneV2FinalAuditEvidenceId({
      evidenceId: "blocked-final-objective-audit-4-of-4-a18-revision-needed",
      provenRequirementCount: 3,
      requirementCount: 4,
      status: "blocked"
    }),
    false
  );
});
