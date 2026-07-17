import assert from "node:assert/strict";
import { test } from "node:test";

import {
  californiaMathematicalPracticeStandards,
  californiaMathematicalPracticeByCode,
  californiaMathematicalPracticeStandardIds
} from "./usCaliforniaMathematicalPractices";
import {
  californiaMathematicalPracticeStandards as reexportedFromKnowledgePoints
} from "./usCaliforniaKnowledgePoints";

test("all eight Standards for Mathematical Practice are present and ordered", () => {
  const codes = californiaMathematicalPracticeStandards.map((practice) => practice.code);
  assert.deepEqual(codes, ["MP1", "MP2", "MP3", "MP4", "MP5", "MP6", "MP7", "MP8"]);
});

test("each practice standard uses the canonical CCSS identifier", () => {
  for (const practice of californiaMathematicalPracticeStandards) {
    assert.equal(practice.standardId, `CCSS.MATH.PRACTICE.${practice.code}`);
  }
  assert.deepEqual(
    californiaMathematicalPracticeStandardIds(),
    [
      "CCSS.MATH.PRACTICE.MP1",
      "CCSS.MATH.PRACTICE.MP2",
      "CCSS.MATH.PRACTICE.MP3",
      "CCSS.MATH.PRACTICE.MP4",
      "CCSS.MATH.PRACTICE.MP5",
      "CCSS.MATH.PRACTICE.MP6",
      "CCSS.MATH.PRACTICE.MP7",
      "CCSS.MATH.PRACTICE.MP8"
    ]
  );
});

test("every practice standard carries trilingual title and description", () => {
  for (const practice of californiaMathematicalPracticeStandards) {
    for (const field of [practice.title, practice.description]) {
      assert.ok(field.en.trim().length > 0, `${practice.code} missing en`);
      assert.ok(field.zh.trim().length > 0, `${practice.code} missing zh`);
      assert.ok((field.zhHans ?? "").trim().length > 0, `${practice.code} missing zhHans`);
    }
  }
});

test("lookup map resolves every code", () => {
  for (const practice of californiaMathematicalPracticeStandards) {
    assert.equal(californiaMathematicalPracticeByCode.get(practice.code), practice);
  }
});

test("practice standards are re-exported from the California knowledge-points surface", () => {
  assert.equal(reexportedFromKnowledgePoints, californiaMathematicalPracticeStandards);
});
