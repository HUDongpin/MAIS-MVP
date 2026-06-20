import assert from "node:assert/strict";
import test from "node:test";
import { shouldCompleteCurriculumTrackSelectionForLogin } from "./authLoginFlow";

test("only legacy accounts requiring curriculum track selection use the slow completion path", () => {
  assert.equal(
    shouldCompleteCurriculumTrackSelectionForLogin({
      authenticatedStatus: "authenticated",
      flexibleExampleAccountApplied: false,
      hasCurriculumSelection: true
    }),
    false
  );
  assert.equal(
    shouldCompleteCurriculumTrackSelectionForLogin({
      authenticatedStatus: "requires-curriculum-track",
      flexibleExampleAccountApplied: false,
      hasCurriculumSelection: true
    }),
    true
  );
  assert.equal(
    shouldCompleteCurriculumTrackSelectionForLogin({
      authenticatedStatus: "requires-curriculum-track",
      flexibleExampleAccountApplied: false,
      hasCurriculumSelection: false
    }),
    false
  );
  assert.equal(
    shouldCompleteCurriculumTrackSelectionForLogin({
      authenticatedStatus: "requires-curriculum-track",
      flexibleExampleAccountApplied: true,
      hasCurriculumSelection: true
    }),
    false
  );
});
