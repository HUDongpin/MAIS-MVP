import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("questions route uses the lightweight public question store", async () => {
  const source = await readFile(join(process.cwd(), "app/api/questions/route.ts"), "utf8");

  assert.match(source, /questionStore/);
  assert.doesNotMatch(source, /requireAuthenticatedUser|getPublicQuestions\s+from|@\/lib\/server\/userStore/);
});
