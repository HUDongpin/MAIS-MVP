import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildIndependentDesignReviewReceiptV1,
  canonicalJsonIndependent,
  independentHash,
  verifyPreactivationPackage,
} from "./independent-preactivation-verifier.mjs";

const REPO_ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const CUSTODY_PATH = "/Volumes/Starship/MAIS-MVP/.worktrees/a21-natural-ca60-openai-runner-v5-20260826/.local/mais-natural-ca60-v1/custody/registry-v5.json";

test("A11 verifier independently reproduces exact V5 design, package, runner, adapter, and custody roots", async () => {
  const result = await verifyPreactivationPackage({ repoRoot: REPO_ROOT, custodyRegistryPath: CUSTODY_PATH });
  assert.equal(result.schemaVersion, "PreActivationIndependentVerificationV1");
  assert.equal(result.reviewerLane, "A11");
  assert.equal(result.provenanceType, "A11_INDEPENDENT_STATIC_AND_HASH_RECOMPUTATION");
  assert.equal(result.designRegistrationHash, "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632");
  assert.equal(result.designPackageRootHash, "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1");
  assert.equal(result.runnerCommit, "1dc093a1d0a300495dcd671091c849d24410fd5e");
  assert.equal(result.runnerHash, "cfef4f67e1c294e60f10de594dea59828c4f4a94b8465e55ab36b5b65285789c");
  assert.equal(result.adapterHash, "63beb1ca15a26c71563a73447f347383bdaa31cb27a2b932b33d534007767013");
  assert.equal(result.custodyRegistryHash, "aa48b5d02996ceed02daff2579b8961a4e5ea3c373dfdc023085fa181c2914a1");
  assert.equal(result.activeDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(result.activeV5AtReview, false);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.providerExecutionAuthorized, false);
  assert.equal(result.aggregatePublicationAuthorized, false);
  assert.equal(result.mainA21ModuleImported, false);
  assert.equal(result.networkPrimitiveDetected, false);
  assert.equal(result.credentialPrimitiveDetected, false);
  assert.equal(result.checks.every((check) => check.passed), true);
  assert.equal(result.decision, "CONCURRED");
  assert.equal(result.verificationHash, independentHash(Object.fromEntries(
    Object.entries(result).filter(([key]) => key !== "verificationHash"),
  )));
});

test("tampering a copied custody root produces DISCREPANCY without touching the source registry", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-ca60-a11-tamper-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const copied = path.join(directory, "registry-v5.json");
  const original = JSON.parse(await readFile(CUSTODY_PATH, "utf8"));
  await writeFile(copied, `${canonicalJsonIndependent({ ...original, runnerHash: "0".repeat(64) })}\n`, { mode: 0o600 });
  const result = await verifyPreactivationPackage({ repoRoot: REPO_ROOT, custodyRegistryPath: copied });
  assert.equal(result.decision, "DISCREPANCY");
  assert.equal(result.checks.some((check) => !check.passed && /custody|runner/iu.test(check.code)), true);
});

test("pre-activation review receipt is self-hashed and cannot be built from a discrepancy", async () => {
  const verification = await verifyPreactivationPackage({ repoRoot: REPO_ROOT, custodyRegistryPath: CUSTODY_PATH });
  const receipt = buildIndependentDesignReviewReceiptV1({
    verification,
    reviewedAt: "2026-08-26T02:00:00.000Z",
  });
  assert.deepEqual(Object.keys(receipt).sort(), [
    "adapterHash",
    "decision",
    "designId",
    "designRegistrationHash",
    "reviewHash",
    "reviewedAt",
    "reviewedDesignPackageRootHash",
    "reviewerLane",
    "runnerCommit",
    "runnerHash",
    "schemaVersion",
  ].sort());
  assert.equal(receipt.decision, "CONCURRED");
  assert.equal(receipt.reviewHash, independentHash(Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "reviewHash"),
  )));
  assert.throws(() => buildIndependentDesignReviewReceiptV1({
    verification: { ...verification, decision: "DISCREPANCY" },
    reviewedAt: "2026-08-26T02:00:00.000Z",
  }), /CONCURRED/iu);
});

test("independent verifier imports only Node built-ins and never imports A21 implementation modules", async () => {
  const source = await readFile(new URL("./independent-preactivation-verifier.mjs", import.meta.url), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  assert.deepEqual(imports.sort(), ["node:child_process", "node:crypto", "node:fs/promises", "node:path"].sort());
  assert.doesNotMatch(source, /from\s+["'][^"']*content-qa\/mais-natural-ca60-v1/gu);
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.env|OPENAI_API_KEY/u);
});

test("tracked verification and review receipt exactly reproduce from the current reviewed roots", async () => {
  const [trackedVerification, trackedReceipt] = await Promise.all([
    readFile(new URL("./independent-preactivation-verification.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("./independent-design-review-receipt.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const recomputed = await verifyPreactivationPackage({ repoRoot: REPO_ROOT, custodyRegistryPath: CUSTODY_PATH });
  assert.deepEqual(trackedVerification, recomputed);
  assert.deepEqual(trackedReceipt, buildIndependentDesignReviewReceiptV1({
    verification: recomputed,
    reviewedAt: trackedReceipt.reviewedAt,
  }));
  assert.equal(trackedReceipt.reviewHash, "2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9");
});
