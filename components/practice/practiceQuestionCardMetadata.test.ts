import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
import { test } from "node:test";

const cardSource = readFileSync(join(process.cwd(), "components/practice/PracticeQuestionCard.tsx"), "utf8");

test("Practice Arena question cards omit item metadata badges", () => {
  for (const metadataExpression of [
    "formatGradeLabel(question.grade",
    "t(questionTypeLabels[question.type])",
    "localizedPracticeText(question.topic)"
  ]) {
    ok(!cardSource.includes(metadataExpression), `Expected PracticeQuestionCard to omit ${metadataExpression}`);
  }
});
