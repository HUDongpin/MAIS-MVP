import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildFrameRightsPolicyV5,
  persistProtectedFrameReadinessV5,
  runCaliforniaFrameReadinessV5,
  scanNaturalItemV5,
} from "./frame-readiness-v5";
import { parseCreatedAt } from "./frame-readiness-v5-cli";

test("frame-readiness CLI requires a canonical explicit execution timestamp", () => {
  assert.throws(() => parseCreatedAt([]), /--created-at/u);
  assert.throws(() => parseCreatedAt(["--created-at", "2026-08-26T12:00:00Z"]), /canonical RFC3339/u);
  assert.equal(
    parseCreatedAt(["--created-at", "2026-08-26T12:00:00.000Z"]),
    "2026-08-26T12:00:00.000Z",
  );
});

test("frozen conservative rights policy requests three exact approvals and denies every other current source", () => {
  const policy = buildFrameRightsPolicyV5();
  assert.equal(policy.designId, "MAIS-NATURAL-CA60-V5");
  assert.equal(policy.registrationHash, "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632");
  assert.deepEqual(policy.ownerApprovalRequiredSourceIds, [
    "california-math-common-core-skill",
    "cde-ca-ccss-math-resources",
    "common-core-state-standards-public-license",
  ]);
  assert.equal(policy.deniedSourceIds.length, 8);
  assert.equal(policy.deniedSourceIds.includes("ccss-math-textbook-app"), true);
  assert.equal(policy.deniedSourceIds.includes("owner-provided-authorized-us-math-materials"), true);
  assert.equal(policy.providerEgressAuthorized, false);
  assert.match(policy.selfHash, /^[0-9a-f]{64}$/u);
});

test("local scanner records hashes and counts without retaining matched secret or PII text", () => {
  const result = scanNaturalItemV5({
    itemId: "fixture-sensitive",
    itemHash: "a".repeat(64),
    payload: {
      prompt: "Contact learner@example.org; token sk-forbidden-sentinel.",
      explanation: "Local path /Users/example/private.txt",
    },
  });
  assert.equal(result.piiFindingCount, 1);
  assert.equal(result.secretFindingCount, 2);
  assert.equal(result.passed, false);
  assert.equal(JSON.stringify(result).includes("learner@example.org"), false);
  assert.equal(JSON.stringify(result).includes("sk-forbidden-sentinel"), false);
  assert.equal(JSON.stringify(result).includes("/Users/example/private.txt"), false);
  assert.equal(result.findings.every((finding) => /^[0-9a-f]{64}$/u.test(finding.evidenceHash)), true);
});

test("real CA runtime readiness remains descriptive, content-protected, and provider-free", async () => {
  const result = await runCaliforniaFrameReadinessV5({
    sourceCommit: "5".repeat(40),
    runnerCommit: "6".repeat(40),
    runnerHash: "7".repeat(64),
    createdAt: "2026-08-25T18:30:00.000Z",
  });
  assert.equal(result.receipt.status, "OWNER_RIGHTS_AND_LINEAGE_CONFIRMATION_REQUIRED");
  assert.equal(result.receipt.formalFrameFrozen, false);
  assert.equal(result.receipt.formalSampleFrozen, false);
  assert.equal(result.receipt.providerRequestCount, 0);
  assert.equal(result.receipt.credentialReadCount, 0);
  assert.equal(result.receipt.runtimeVisibleItemCount, 2802);
  assert.equal(result.receipt.fullFrameClusterCount, 694);
  assert.equal(result.receipt.frameFailureCount, 0);
  assert.equal(result.receipt.potentialEligibleItemCount, 482);
  assert.equal(result.receipt.potentialEligibleClusterCount, 106);
  assert.equal(result.receipt.visualOrAssetRestrictedCount, 10);
  assert.equal(result.receipt.piiRestrictedCount, 0);
  assert.equal(result.receipt.secretRestrictedCount, 0);
  assert.equal(result.receipt.potentialEligibleClusterCount >= 60, true);
  assert.equal(result.receipt.nonemptyPotentialStrata >= 7, true);
  assert.equal(result.ownerDecisionRequest.providerExecutionAuthorized, false);
  assert.equal(result.ownerDecisionRequest.questionEgressAuthorized, false);
  assert.equal(JSON.stringify(result.receipt).includes("\"prompt\":"), false);
  assert.equal(JSON.stringify(result.receipt).includes("\"answer\":"), false);
  assert.equal(JSON.stringify(result.receipt).includes("\"explanation\":"), false);
});

test("protected readiness persistence is 0600, content-addressed, and idempotent", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-ca60-frame-readiness-"));
  try {
    const result = await runCaliforniaFrameReadinessV5({
      sourceCommit: "5".repeat(40),
      runnerCommit: "6".repeat(40),
      runnerHash: "7".repeat(64),
      createdAt: "2026-08-25T18:30:00.000Z",
    });
    const first = await persistProtectedFrameReadinessV5({ outputRoot: temporaryRoot, result });
    const second = await persistProtectedFrameReadinessV5({ outputRoot: temporaryRoot, result });
    assert.deepEqual(second, first);
    assert.match(first.custodyManifestHash, /^[0-9a-f]{64}$/u);
    assert.match(first.runCompletionHash, /^[0-9a-f]{64}$/u);
    assert.equal(first.receipt.selfHash, first.persistedReceiptHash);
    assert.equal(first.receipt.protectedCustodyManifestHash, first.custodyManifestHash);
    assert.equal(first.ownerDecisionRequest.requestHash, first.ownerDecisionRequestHash);
    assert.equal(first.ownerDecisionRequest.readinessReceiptHash, first.persistedReceiptHash);
    for (const relativePath of first.files) {
      const file = await stat(path.join(temporaryRoot, relativePath));
      assert.equal(file.mode & 0o777, 0o600, relativePath);
    }
    const receipt = JSON.parse(await readFile(path.join(temporaryRoot, "frame-readiness-receipt.json"), "utf8"));
    const request = JSON.parse(await readFile(path.join(temporaryRoot, "owner-decision-request.json"), "utf8"));
    assert.equal(receipt.providerRequestCount, 0);
    assert.equal(receipt.selfHash, first.persistedReceiptHash);
    assert.equal(request.requestHash, first.ownerDecisionRequestHash);
    assert.equal(request.readinessReceiptHash, receipt.selfHash);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("public readiness, owner-request, and rights schemas are closed and mirror their exact root fields", async () => {
  const result = await runCaliforniaFrameReadinessV5({
    sourceCommit: "5".repeat(40),
    runnerCommit: "6".repeat(40),
    runnerHash: "7".repeat(64),
    createdAt: "2026-08-25T18:30:00.000Z",
  });
  const schemaRoot = path.join(import.meta.dirname, "schemas");
  const pairs = [
    ["NaturalCaFrameReadinessReceiptV1.schema.json", result.receipt],
    ["NaturalCaFrameOwnerDecisionRequestV1.schema.json", result.ownerDecisionRequest],
    ["NaturalCaFrameRightsPolicyV1.schema.json", result.rightsPolicy],
  ] as const;
  for (const [filename, artifact] of pairs) {
    const schema = JSON.parse(await readFile(path.join(schemaRoot, filename), "utf8"));
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(artifact).sort(), filename);
    assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(artifact).sort(), filename);
  }
});

test("frame readiness implementation and CLI expose no network, SDK, credential, or environment-variable primitive", async () => {
  const source = [
    await readFile(path.join(import.meta.dirname, "frame-readiness-v5.ts"), "utf8"),
    await readFile(path.join(import.meta.dirname, "frame-readiness-v5-cli.ts"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(source, /\bfetch\s*\(|https\.request|http\.request|node:net|node:tls/u);
  assert.doesNotMatch(source, /process\.env|OPENAI_API_KEY|DEEPSEEK_API_KEY/u);
  assert.doesNotMatch(source, /from\s+["'](?:openai|axios|undici)["']/u);
});
