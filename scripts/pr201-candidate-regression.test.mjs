import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { questionAnswerMatches } from "../lib/server/answerMatching.ts";

const root = new URL("../", import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(file, root), "utf8"));
const rows = read("data/generated-content/us-ar-g6-g12-pr201-diversity-228-v2/revised-228.json");
const historical = read("coordination/integration/pr201-diversity-228-v1/a18/grading-compatibility.json");
test("all 228 approved rows replay all 1281 historical cases through the real answer matcher", () => {
  assert.equal(createHash("sha256").update(readFileSync(new URL("lib/server/answerMatching.ts", root))).digest("hex"), historical.matcherSha256);
  assert.equal(rows.length, 228);
  assert.equal(new Set(rows.map(row => row.id)).size, 228);
  const byId = new Map(rows.map(row => [row.id, row]));
  assert.deepEqual([...byId.keys()].sort(), historical.rows.map(row => row.id).sort());
  let cases = 0;
  for (const record of historical.rows) {
    const row = byId.get(record.id);
    const question = { answer: row.answer, accepted_answers: [...row.acceptedAnswers, row.independentAnswer], options: row.options };
    for (const example of record.cases) {
      assert.equal(questionAnswerMatches(question, example.answer), example.expected, `${row.id}: ${example.kind}`);
      cases++;
    }
  }
  assert.equal(cases, 1281);
});

test("revised q018 preserves year aliases and rejects a bare time coordinate", () => {
  const row = rows.find(row => row.id === "us-ar-g6-g12-v1-g12-c05-q018");
  const question = { answer: row.answer, accepted_answers: row.acceptedAnswers };
  for (const answer of ["2024", "year 2024", "t = 4", "t = 4 (year 2024)"]) assert.equal(questionAnswerMatches(question, answer), true, answer);
  for (const answer of ["2023", "2025", "4"]) assert.equal(questionAnswerMatches(question, answer), false, answer);
});
