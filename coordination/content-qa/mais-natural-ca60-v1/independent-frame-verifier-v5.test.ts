import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseIndependentFrameVerifierArgsV5,
} from "./independent-frame-verifier-v5";

test("independent verifier CLI requires an absolute protected root and canonical review time", () => {
  assert.throws(() => parseIndependentFrameVerifierArgsV5([]), /--protected-root/u);
  assert.throws(() => parseIndependentFrameVerifierArgsV5([
    "--protected-root", "relative/path", "--a22-receipt", "/tmp/a22.json",
    "--reviewed-at", "2026-08-26T00:00:00.000Z",
  ]), /absolute/u);
  assert.throws(() => parseIndependentFrameVerifierArgsV5([
    "--protected-root", "/tmp/protected", "--a22-receipt", "/tmp/a22.json",
    "--reviewed-at", "2026-08-26T00:00:00Z",
  ]), /canonical RFC3339/u);
  assert.deepEqual(parseIndependentFrameVerifierArgsV5([
    "--protected-root", "/tmp/protected", "--a22-receipt", "/tmp/a22.json",
    "--reviewed-at", "2026-08-26T00:00:00.000Z",
  ]), {
    protectedRoot: "/tmp/protected",
    a22ReceiptPath: "/tmp/a22.json",
    reviewedAt: "2026-08-26T00:00:00.000Z",
  });
});

test("independent verifier does not import A21 orchestration or expose network and credential primitives", async () => {
  const source = await readFile(path.join(import.meta.dirname, "independent-frame-verifier-v5.ts"), "utf8");
  assert.doesNotMatch(source, /from\s+["'].+\/(?:runtime-extractor|question-store-source|clustering-audit|frame-readiness-v5)["']/u);
  assert.doesNotMatch(source, /\bfetch\s*\(|https\.request|http\.request|node:net|node:tls/u);
  assert.doesNotMatch(source, /process\.env|OPENAI_API_KEY|DEEPSEEK_API_KEY/u);
  assert.doesNotMatch(source, /from\s+["'](?:openai|axios|undici)["']/u);
});
