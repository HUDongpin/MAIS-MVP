import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./run-formal-v2.mjs");
}

test("requires the one exact formal execution flag and rejects deployment or Git flags", async () => {
  const { validateFormalCliArgsV2 } = await subject();
  assert.equal(validateFormalCliArgsV2(["node", "run-formal-v2.mjs", "--execute-formal-168-plus-21"]), true);
  assert.throws(() => validateFormalCliArgsV2(["node", "run-formal-v2.mjs"]), /exact formal execution flag/);
  for (const forbidden of ["--deploy", "--stage", "--commit", "--push", "--production"]) {
    assert.throws(() => validateFormalCliArgsV2(["node", "run-formal-v2.mjs", "--execute-formal-168-plus-21", forbidden]), /outside.*authorization/i);
  }
});
