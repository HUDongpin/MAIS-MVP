import assert from "node:assert/strict";
import test from "node:test";
import { shouldRetryDemoLoginAfterFastInvalid } from "@/lib/server/userStore";

test("public demo credentials retry after a Postgres fast-login miss", () => {
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Student Peter", "12345"), true);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Teacher Phoebe", "12345"), true);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Teacher Scott", "12345"), true);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Student Jon", "12345"), true);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Teacher Rhi", "12345"), true);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("Student Peter", "wrong-password"), false);
  assert.equal(shouldRetryDemoLoginAfterFastInvalid("unknown-user", "12345"), false);
});
