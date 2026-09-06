import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { canonicalSha256 } from "./candidate-set-builder.mjs";

async function subject() {
  return import("./formal-authorization-v2.mjs");
}

function fixture() {
  return {
    candidateReadinessReceipt: {
      protocolId: "MAIS-RSI-LITE-CAL-V2",
      protocolVersion: "2.0.0-candidate",
      candidateSetSha256: "a".repeat(64),
      receiptSha256: "b".repeat(64),
      packageFileCount: 72,
      coreSuccessfulProviderCalls: 168
    },
    repeatPlan: {
      protocolId: "MAIS-RSI-LITE-CAL-V2",
      protocolVersion: "2.0.0-candidate",
      candidateSetSha256: "a".repeat(64),
      repeatPlanSha256: "c".repeat(64),
      successfulProviderCalls: 21
    },
    codeManifest: [{ path: "reviewer.mjs", sha256: "d".repeat(64) }],
    worktreeIdentity: {
      absolutePath: "/isolated/worktree",
      branch: "codex/a16-test",
      head: "b6c7c347a49a813e454e707dd3c16399dcf29909",
      trackedDiffAbsent: true
    },
    createdAt: "2026-08-24T00:00:00.000Z"
  };
}

test("binds the exact owner authorization to candidate, repeat plan, code, and hard caps", async () => {
  const { OWNER_AUTHORIZATION_EXACT_V2, createFormalAuthorizationV2, validateFormalAuthorizationV2 } = await subject();
  const authorization = createFormalAuthorizationV2(fixture());
  assert.equal(authorization.ownerAuthorizationExact, OWNER_AUTHORIZATION_EXACT_V2);
  assert.deepEqual(authorization.hardCaps, { currencyCapUsd: 25, providerAttemptCap: 220, tokenCap: 40_000_000 });
  assert.deepEqual(authorization.successTargets, { core: 168, repeat: 21, total: 189 });
  assert.equal(authorization.egress.frozenCandidateReviewContentToDeepSeek, true);
  assert.equal(authorization.boundaries.deploymentAuthorized, false);
  assert.equal(authorization.boundaries.gitCommitAuthorized, false);
  assert.equal(authorization.boundaries.gitPushAuthorized, false);
  assert.deepEqual(validateFormalAuthorizationV2(authorization), []);
});

test("rejects altered caps, model, egress scope, or self-hash", async () => {
  const { createFormalAuthorizationV2, validateFormalAuthorizationV2 } = await subject();
  for (const mutate of [
    (row) => { row.hardCaps.currencyCapUsd = 26; },
    (row) => { row.provider.model = "deepseek-v4-flash"; },
    (row) => { row.egress.frozenCandidateReviewContentToDeepSeek = false; },
    (row) => { row.authorizationSha256 = "0".repeat(64); }
  ]) {
    const row = createFormalAuthorizationV2(fixture());
    mutate(row);
    assert.ok(validateFormalAuthorizationV2(row).length > 0);
  }
});

test("verifies every code hash against the isolated worktree", async () => {
  const { verifyAuthorizationCodeFilesV2 } = await subject();
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-v2-auth-code-"));
  try {
    await writeFile(path.join(root, "reviewer.mjs"), "export const value = 1;\n");
    const authorization = {
      codeManifest: [{ path: "reviewer.mjs", sha256: canonicalSha256(Buffer.from("export const value = 1;\n")) }]
    };
    await verifyAuthorizationCodeFilesV2({ authorization, worktreeRoot: root });
    await writeFile(path.join(root, "reviewer.mjs"), "export const value = 2;\n");
    await assert.rejects(() => verifyAuthorizationCodeFilesV2({ authorization, worktreeRoot: root }), /code drifted/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
