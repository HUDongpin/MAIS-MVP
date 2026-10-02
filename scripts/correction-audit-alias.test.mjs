import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { correctedArkansasIds, solveArkansasCorrection } from "./arkansas-correctness-solvers.mjs";
import { numericCorrectionAuditAlias } from "./correction-audit-alias.mjs";

test("only correctly grouped numeric aliases normalize to the prompt-derived value", () => {
  for (const text of ["38000", "38,000", "38,000 dollars", "$38,000", "1,234,567", "-1,234.5"]) {
    assert.notEqual(numericCorrectionAuditAlias(text), null, text);
  }
  assert.equal(numericCorrectionAuditAlias("38,000"), 38000);
  assert.equal(numericCorrectionAuditAlias("38,000 dollars"), 38000);
  assert.equal(numericCorrectionAuditAlias("$38,000"), 38000);
  assert.equal(numericCorrectionAuditAlias("1,234,567"), 1234567);
  assert.equal(numericCorrectionAuditAlias("-1,234.5"), -1234.5);
  for (const text of ["38,00", "3,80,000", "1,,000", "1,0000", "12,345,67", "01,000", "38,5", "38,000/2", "38,000 cats"]) {
    assert.equal(numericCorrectionAuditAlias(text), null, text);
  }
  assert.equal(numericCorrectionAuditAlias("38,001"), 38001);
  assert.equal(numericCorrectionAuditAlias("38"), 38);
});

test("all reviewed Arkansas correction aliases match independent prompt solutions", () => {
  const pack = JSON.parse(readFileSync(new URL("../data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json", import.meta.url), "utf8"));
  const items = pack.questions.filter((question) => correctedArkansasIds.has(question.id));
  assert.equal(items.length, 21);
  let aliasCount = 0;
  for (const question of items) {
    const solved = solveArkansasCorrection(question);
    assert.ok(solved && Number.isFinite(solved.value), question.id);
    const expected = solved.decimals == null ? solved.value : Number(solved.value.toFixed(solved.decimals));
    const tolerance = solved.decimals == null ? 1e-8 : 1e-9;
    const answerValue = numericCorrectionAuditAlias(question.answer);
    assert.ok(answerValue != null && Math.abs(answerValue - expected) <= tolerance, question.id);
    for (const alias of question.acceptedAnswers ?? []) {
      const aliasValue = numericCorrectionAuditAlias(alias);
      assert.ok(aliasValue != null && Math.abs(aliasValue - expected) <= tolerance, `${question.id}: ${alias}`);
      aliasCount += 1;
    }
  }
  assert.equal(aliasCount, 56);
});
