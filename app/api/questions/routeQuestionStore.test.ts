import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("questions route uses the lightweight public question store", async () => {
  const source = await readFile(join(process.cwd(), "app/api/questions/route.ts"), "utf8");

  assert.match(source, /questionStore/);

  // The point is that anonymous traffic must not pull the authenticated store into this hot
  // route's STATIC graph. The accommodations lookup is deliberately a guarded dynamic import
  // (see reducedAnswerChoiceCap, which returns early for non-students), so assert on static
  // import lines rather than on any mention of the name.
  const staticImports = source
    .split("\n")
    .filter((line) => /^\s*import\b/.test(line))
    .join("\n");

  assert.doesNotMatch(
    staticImports,
    /requireAuthenticatedUser|getPublicQuestions\s+from|@\/lib\/server\/userStore/,
    "the userStore must never be statically imported by the public questions route"
  );
  assert.match(
    source,
    /if \(authenticated\?\.user\.role !== "student"\) return 0;/,
    "the dynamic userStore import must stay behind a student-only guard"
  );
});
