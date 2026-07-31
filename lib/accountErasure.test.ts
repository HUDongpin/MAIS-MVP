import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_ERASURE_CONFIRMATION_PHRASE,
  localKeysToClearForErasedUser
} from "@/lib/accountErasure";

const ERASED = "student-ada";
const KEPT = "student-ben";

/** Key shapes actually produced across the app, per their key builders. */
const storedKeys = [
  `mais-lesson-entry-target:${ERASED}:P3`,
  `mais-lesson-entry-target:${KEPT}:P3`,
  `hk-math-game-best:${ERASED}`,
  `hk-math-game-best:${KEPT}`,
  `hk-math-game-sound:${ERASED}`,
  `mais:viz-explored:${ERASED}:ellipse-lab`,
  `mais:viz-explored:${KEPT}:ellipse-lab`,
  "hk-math-user",
  "hk-math-mistakes",
  "hk-math-theme",
  "hk-math-language",
  "hk-math-grade",
  "mais.lesson-menu-coach-mark-seen",
  "mais.lesson-world-view",
  "mais:nova-lens-disabled"
];

test("every cached key belonging to the erased user is cleared", () => {
  const cleared = localKeysToClearForErasedUser(storedKeys, ERASED);

  assert.ok(cleared.includes(`mais-lesson-entry-target:${ERASED}:P3`));
  assert.ok(cleared.includes(`hk-math-game-best:${ERASED}`));
  assert.ok(cleared.includes(`hk-math-game-sound:${ERASED}`));
  assert.ok(cleared.includes(`mais:viz-explored:${ERASED}:ellipse-lab`));
});

test("another user's cached data on a shared device is left alone", () => {
  const cleared = localKeysToClearForErasedUser(storedKeys, ERASED);

  assert.equal(cleared.includes(`mais-lesson-entry-target:${KEPT}:P3`), false);
  assert.equal(cleared.includes(`hk-math-game-best:${KEPT}`), false);
  assert.equal(cleared.includes(`mais:viz-explored:${KEPT}:ellipse-lab`), false);
});

test("signed-in session keys are cleared even though they carry no user id", () => {
  const cleared = localKeysToClearForErasedUser(storedKeys, ERASED);

  for (const key of ["hk-math-user", "hk-math-mistakes", "hk-math-theme", "hk-math-language", "hk-math-grade"]) {
    assert.ok(cleared.includes(key), `${key} should be cleared`);
  }
});

test("device-level preferences that are not personal data survive", () => {
  const cleared = localKeysToClearForErasedUser(storedKeys, ERASED);

  assert.equal(cleared.includes("mais.lesson-menu-coach-mark-seen"), false);
  assert.equal(cleared.includes("mais.lesson-world-view"), false);
  assert.equal(cleared.includes("mais:nova-lens-disabled"), false);
});

test("an empty user id clears nothing rather than everything", () => {
  // Guards the substring match: "".includes() is true for every key, which
  // would wipe a shared device's entire storage on a malformed call.
  assert.deepEqual(localKeysToClearForErasedUser(storedKeys, ""), []);
});

test("the confirmation phrase is a fixed literal the UI and API both use", () => {
  assert.equal(ACCOUNT_ERASURE_CONFIRMATION_PHRASE, "DELETE MY DATA");
});
