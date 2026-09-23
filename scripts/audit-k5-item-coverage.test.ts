import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { k5TemplatesById } from "../lib/itemTemplates/k5Templates";
import { auditK5Pack } from "./audit-k5-item-coverage";

const template = k5TemplatesById.get("k5_add_within_10")!;
const item = template.generate(3);
const row = {
  id: "candidate-001",
  grade: "K",
  generationTemplate: template.id,
  standardIds: [...template.ccss],
  prompt: { en: item.prompt },
  answer: String(item.answer),
  acceptedAnswers: [String(item.answer)]
};

function withPack(data: unknown, run: (file: string) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), "mais-k5-audit-"));
  const file = path.join(dir, "question-pack.json");
  try {
    if (data !== undefined) writeFileSync(file, JSON.stringify(data));
    run(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("candidate audit accepts a solved, keyed row", () => {
  withPack({ questions: [row] }, (file) => {
    const report = auditK5Pack(file, { minCoverage: 1, minFamilies: 1 });
    assert.equal(report.ok, true);
    assert.equal(report.verified, 1);
  });
});

test("candidate audit fails closed on missing and unreadable packs", () => {
  withPack(undefined, (file) => assert.equal(auditK5Pack(file).ok, false));
  withPack({ questions: "wrong-shape" }, (file) => assert.equal(auditK5Pack(file).ok, false));
  withPack({ questions: [null] }, (file) => assert.equal(auditK5Pack(file).ok, false));
});

test("candidate audit fails on zero solver coverage", () => {
  withPack({ questions: [{ ...row, prompt: { en: "Unknown prompt" } }] }, (file) => {
    const report = auditK5Pack(file, { minCoverage: 1, minFamilies: 1 });
    assert.equal(report.ok, false);
    assert.equal(report.verified, 0);
  });
});

test("candidate audit fails on a wrong answer key", () => {
  withPack({ questions: [{ ...row, answer: String(item.answer + 1) }] }, (file) => {
    const report = auditK5Pack(file, { minCoverage: 1, minFamilies: 1 });
    assert.equal(report.ok, false);
    assert.equal(report.mismatched, 1);
  });
});

test("candidate audit checks the visible pattern terms, not only the stated rule", () => {
  const pattern = k5TemplatesById.get("k5_arithmetic_pattern")!.generate(1);
  const changedPrompt = pattern.prompt.replace(/: (\d+), (\d+), (\d+), (\d+)\./, ": $1, $2, 999, $4.");
  withPack({ questions: [{ ...row, grade: "P4", generationTemplate: "k5_arithmetic_pattern",
    standardIds: ["4.OA.C.5"], prompt: { en: changedPrompt }, answer: String(pattern.answer),
    acceptedAnswers: [String(pattern.answer)] }] }, (file) => {
    assert.equal(auditK5Pack(file, { minCoverage: 1, minFamilies: 1 }).ok, false);
  });
});

test("the command gate rejects unreadable, uncovered, and wrong-key packs", () => {
  const cli = path.join(process.cwd(), "scripts/audit-k5-item-coverage.ts");
  const exitFor = (file: string) => spawnSync(process.execPath, ["--import", "tsx", cli, "--pack", file], {
    cwd: process.cwd(), encoding: "utf8"
  }).status;
  withPack(undefined, (file) => assert.equal(exitFor(file), 1));
  withPack({ questions: [{ ...row, prompt: { en: "Unknown prompt" } }] }, (file) => assert.equal(exitFor(file), 1));
  withPack({ questions: [{ ...row, answer: String(item.answer + 1) }] }, (file) => assert.equal(exitFor(file), 1));
  assert.equal(exitFor(path.join(process.cwd(), "coordination/content-qa/us-ca-k5-verified-templates-v4/question-pack.json")), 0);
});
