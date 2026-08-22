import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("attempts route uses revision-aware auth and keeps Postgres on the fast row-table store", async () => {
  const source = await readFile(join(process.cwd(), "app/api/attempts/route.ts"), "utf8");

  assert.match(source, /submitQuestionAttemptFast/);
  assert.match(source, /practiceAttemptFastPathPersistsRows/);
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /import\("@\/lib\/server\/userStore\/studentActivity"\)/);
  assert.doesNotMatch(source, /^import .*@\/lib\/server\/userStore/m);
  assert.doesNotMatch(source, /gradeSeedQuestionAttempt|@\/lib\/server\/answerGrading/);
});
