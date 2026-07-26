import assert from "node:assert/strict";
import test from "node:test";
import {
  authPasswordMatches,
  authPasswordMatchesAsync,
  hashAuthPassword,
  hashAuthPasswordAsync
} from "./userStore/authSessionPersistence";

test("hashAuthPasswordAsync matches the sync hash for the same salt", async () => {
  const { salt } = hashAuthPassword("correct horse battery staple");
  const sync = hashAuthPassword("correct horse battery staple", salt);
  const async = await hashAuthPasswordAsync("correct horse battery staple", salt);
  assert.equal(async.salt, salt);
  assert.equal(async.hash, sync.hash);
});

test("authPasswordMatchesAsync accepts the correct password", async () => {
  const { hash, salt } = hashAuthPassword("s3cret-pass");
  const record = { password_hash: hash, password_salt: salt };
  assert.equal(await authPasswordMatchesAsync("s3cret-pass", record), true);
  // Parity with the synchronous verifier.
  assert.equal(authPasswordMatches("s3cret-pass", record), true);
});

test("authPasswordMatchesAsync rejects a wrong password", async () => {
  const { hash, salt } = hashAuthPassword("s3cret-pass");
  const record = { password_hash: hash, password_salt: salt };
  assert.equal(await authPasswordMatchesAsync("wrong-pass", record), false);
});

test("authPasswordMatchesAsync rejects records without a stored hash", async () => {
  assert.equal(await authPasswordMatchesAsync("anything", {}), false);
  assert.equal(await authPasswordMatchesAsync("anything", { password_hash: "abc" }), false);
});
