import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  independentHamilton,
  parseIndependentReviewCliArgs,
} from "./independent-formal-freeze-verifier-v5.mjs";

test("independent Hamilton implementation reproduces the frozen CA60 allocation example", () => {
  const result = independentHamilton([12, 11, 9, 9, 30, 2, 0, 17, 16], 60, 2);
  assert.deepEqual(result.finalAllocation, [7, 6, 6, 6, 15, 2, 0, 9, 9]);
  assert.equal(result.finalAllocation.reduce((sum, value) => sum + value, 0), 60);
  assert.equal(result.baseAllocation[6], 0);
});

test("independent verifier CLI requires an absolute protected root and canonical timestamp", () => {
  assert.deepEqual(parseIndependentReviewCliArgs([
    "--protected-root",
    "/tmp/mais-protected-fixture",
    "--reviewed-at",
    "2026-08-25T20:30:00.000Z",
  ]), {
    protectedRoot: "/tmp/mais-protected-fixture",
    reviewedAt: "2026-08-25T20:30:00.000Z",
  });
  assert.throws(() => parseIndependentReviewCliArgs([]), /usage/u);
  assert.throws(() => parseIndependentReviewCliArgs([
    "--protected-root", "relative", "--reviewed-at", "2026-08-25T20:30:00Z",
  ]), /canonical/u);
});

test("A11 verifier source does not import or dynamically load the A21 formal builder, sample contract, storage, or scorer", async () => {
  const source = await readFile(path.join(import.meta.dirname, "independent-formal-freeze-verifier-v5.mjs"), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:formal-freeze-v5(?:-storage)?|sample-contract-v5|scorer|decision-engine)[^"']*["']/u);
  assert.doesNotMatch(source, /import\s*\([^)]*(?:formal-freeze-v5|sample-contract-v5|scorer|decision-engine)/u);
  assert.doesNotMatch(source, /\bfetch\s*\(|https\.request|http\.request|process\.env|OPENAI_API_KEY|DEEPSEEK_API_KEY/u);
});
