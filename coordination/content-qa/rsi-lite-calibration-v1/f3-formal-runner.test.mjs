import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalSha256,
  createBudgetLedger,
  readCommittedF3Run,
  runDeterministicBaseline,
  runF3Package,
  writeCommittedF3Run
} from "./f3-formal-runner.mjs";

const PRICES = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const CAPS = Object.freeze({ providerCallCap: 200, tokenCap: 30_000_000, currencyCapUsd: 50 });

function localized(value) {
  return { en: String(value), zh: String(value), zhHans: String(value) };
}

function packageContent(packageId = "pkg-test") {
  return {
    packageId,
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    region: "CA",
    curriculumTrack: "US_CA_MATH",
    publisher: "CA",
    gradeBand: "2",
    questions: [
      {
        id: "q-1",
        type: "multiple-choice",
        gradeBand: "2",
        standardIds: ["2.NBT.5"],
        prompt: { en: "2 + 2", zh: "2 + 2", zhHans: "99 + 1" },
        answer: "4",
        acceptedAnswers: ["5"],
        answerContract: { canonicalAnswer: "4" },
        options: ["4", "5", "6", "7"].map(localized),
        explanation: { en: "incorrect intermediate calculation", zh: "錯誤", zhHans: "错误" },
        evidenceSurface: { expectedLabel: "4", visibleLabel: "9" },
        validation: { independentAnswer: "4", independentAnswerProvenance: "tool-derived-from-structured-model" },
        alignment: { grade: "UNALIGNED-GRADE", primaryStandardId: "MISMATCHED.INTERNAL.STANDARD" },
        templateTrace: { publicLabel: "internal-template:test" },
        misconceptionMap: {}
      },
      {
        id: "q-2",
        type: "short-answer",
        gradeBand: "2",
        standardIds: ["2.NBT.5"],
        prompt: { en: "2 + 3", zh: "2 + 3", zhHans: "2 + 3" },
        answer: "6",
        acceptedAnswers: ["6"],
        answerContract: { canonicalAnswer: "5" },
        explanation: { en: "2 + 3 = 5", zh: "2 + 3 = 5", zhHans: "2 + 3 = 5" },
        evidenceSurface: { expectedLabel: "5", visibleLabel: "5" },
        validation: { independentAnswer: "5", independentAnswerProvenance: "metadata-copy-from-candidate-answer" },
        alignment: { grade: "2", primaryStandardId: "2.NBT.5" },
        templateTrace: { publicLabel: null },
        misconceptionMap: {}
      }
    ],
    lessons: [{
      id: "lesson-1",
      gradeBand: "2",
      title: { en: "Addition", zh: "加法", zhHans: "加法" },
      alignment: { grade: "2", primaryStandardId: "2.NBT.5" },
      workedExample: { questionId: "q-2", answer: "5", explanation: { en: "2 + 3 = 5", zh: "2 + 3 = 5", zhHans: "2 + 3 = 5" } }
    }],
    browserRoutes: []
  };
}

function planRow(arm, content = packageContent()) {
  return {
    packageId: content.packageId,
    latentBundleId: "CA-L1",
    region: "CA",
    variantId: "V1",
    arm,
    contentSha256: canonicalSha256(content)
  };
}

function fakeAdapter(callLog) {
  return {
    provider: "fixture-provider",
    model: "fixture-model",
    async runRole({ role, packageId, projection }) {
      callLog.push({ role, packageId, projection: structuredClone(projection) });
      const inspectedSurfaceIds = [
        ...(projection.questions ?? []).map((row) => row.id),
        ...(projection.lessons ?? []).map((row) => row.id)
      ];
      return {
        provider: "fixture-provider",
        model: "fixture-model",
        systemFingerprint: "fixture-fingerprint",
        providerRequestId: `fixture-${callLog.length}`,
        finishReason: "stop",
        latencyMs: 1,
        usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 },
        providerResponseSha256: "a".repeat(64),
        roleResult: {
          schemaVersion: 1,
          role,
          packageId,
          inspectionComplete: true,
          inspectedSurfaceIds,
          findings: role === "same-reviewer-critique"
            ? [{ findingId: "critique:q-1", surfaceId: "q-1", severity: "P1", code: "critique-defect", detail: "A fixture critique." }]
            : []
        }
      };
    }
  };
}

test("A applies only its frozen deterministic surfaces and does not smuggle reflective, language, alignment, or template checks into baseline", () => {
  const result = runDeterministicBaseline(packageContent());
  const codes = result.findings.map((row) => row.code);
  assert.ok(codes.includes("accepted-answer-false-reject"));
  assert.ok(codes.includes("answer-independent-mismatch"));
  assert.ok(codes.includes("evidence-label-mismatch"));
  assert.ok(codes.includes("oracle-provenance-contamination"));
  for (const forbidden of ["explanation-step-mismatch", "cross-language-numeric-mismatch", "alignment-contract-mismatch", "internal-template-label-visible"]) {
    assert.equal(codes.includes(forbidden), false);
  }
  assert.deepEqual(result.inspectedSurfaceIds.sort(), ["lesson-1", "q-1", "q-2"]);
});

test("A completes with zero provider calls while B makes exactly critique then revision and binds revision to prior review context", async () => {
  const content = packageContent();
  const aCalls = [];
  const aLedger = createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES });
  const a = await runF3Package({ planRow: planRow("A", content), packageContent: content, providerAdapter: fakeAdapter(aCalls), budgetLedger: aLedger });
  assert.equal(aCalls.length, 0);
  assert.equal(a.resourceUsage.providerCalls, 0);
  assert.equal(a.coverage.notInspected, 0);

  const bCalls = [];
  const bLedger = createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES });
  const b = await runF3Package({ planRow: planRow("B", content), packageContent: content, providerAdapter: fakeAdapter(bCalls), budgetLedger: bLedger });
  assert.deepEqual(bCalls.map((row) => row.role), ["same-reviewer-critique", "same-reviewer-revision"]);
  assert.equal(bCalls[1].projection.reviewContext.priorRole, "same-reviewer-critique");
  assert.equal(bCalls[1].projection.reviewContext.priorRoleResult.findings.length, 1);
  assert.equal(b.resourceUsage.providerCalls, 2);
  assert.equal(b.roleExecutions.length, 3);
});

test("C0 and C make the same five role calls over byte-identical projections while only C uses credential-free child processes", async () => {
  const content = packageContent();
  const c0Calls = [];
  const cCalls = [];
  const c0 = await runF3Package({ planRow: planRow("C0", content), packageContent: content, providerAdapter: fakeAdapter(c0Calls), budgetLedger: createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES }) });
  const c = await runF3Package({ planRow: planRow("C", content), packageContent: content, providerAdapter: fakeAdapter(cCalls), budgetLedger: createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES }) });

  assert.equal(c0Calls.length, 5);
  assert.equal(cCalls.length, 5);
  assert.deepEqual(cCalls.map((row) => row.role), c0Calls.map((row) => row.role));
  for (let index = 0; index < cCalls.length; index += 1) {
    assert.equal(canonicalSha256(cCalls[index].projection), canonicalSha256(c0Calls[index].projection));
  }
  assert.equal(c.resourceUsage.childProcesses, 5);
  assert.equal(c0.resourceUsage.childProcesses, 0);
  assert.ok(c.roleExecutions.every((row) => row.credentialEnvironmentAbsent === true));
});

test("global budget ledger reserves before calls, accounts provider usage, and fails closed on an exhausted hard cap", () => {
  const ledger = createBudgetLedger({ caps: { providerCallCap: 1, tokenCap: 1_000, currencyCapUsd: 1 }, pricesUsdPerMillion: PRICES });
  const reservation = ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });
  assert.throws(() => ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 }), /provider-call cap/i);
  ledger.settleSuccess(reservation, { promptCacheHitTokens: 0, promptCacheMissTokens: 80, completionTokens: 20 });
  assert.deepEqual(ledger.snapshot(), {
    providerCalls: 1,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 80,
    outputTokens: 20,
    apiCostUsd: 0.0001848,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0,
    activeReservations: 0
  });
});

test("keeps an oversized-usage reservation recoverable for conservative failure settlement", () => {
  const ledger = createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES });
  const reservation = ledger.reserve({ maxInputTokens: 100, maxOutputTokens: 50 });

  assert.throws(
    () => ledger.settleSuccess(reservation, { promptCacheHitTokens: 0, promptCacheMissTokens: 101, completionTokens: 20 }),
    /usage above its pre-call token reservation/i
  );
  assert.deepEqual(ledger.settleFailure(reservation), {
    providerCalls: 1,
    conservativeFailureDebitTokens: 150,
    conservativeFailureDebitUsd: 0.00033
  });
  assert.equal(ledger.snapshot().activeReservations, 0);
  assert.equal(ledger.snapshot().conservativeFailureDebitTokens, 150);
});

test("does not misclassify or retry a ledger settlement failure after a successful provider response", async () => {
  const content = packageContent();
  let providerCalls = 0;
  let failureSettlements = 0;
  const adapter = fakeAdapter([]);
  const budgetLedger = {
    reserve() {
      return Object.freeze({ id: "fixture-reservation" });
    },
    settleSuccess() {
      throw new Error("fixture persistent journal compare-and-swap failed");
    },
    settleFailure() {
      failureSettlements += 1;
      return { providerCalls: 1, conservativeFailureDebitTokens: 184_000, conservativeFailureDebitUsd: 0.4 };
    },
    snapshot() {
      return {};
    }
  };
  const provider = {
    ...adapter,
    async runRole(args) {
      providerCalls += 1;
      return adapter.runRole(args);
    }
  };

  await assert.rejects(
    runF3Package({
      planRow: planRow("B", content),
      packageContent: content,
      providerAdapter: provider,
      budgetLedger,
      maxTransientAttemptsPerRole: 3
    }),
    /compare-and-swap failed/i
  );
  assert.equal(providerCalls, 1);
  assert.equal(failureSettlements, 0);
});

test("retries only a transient provider failure at the same role boundary and accounts the failed attempt conservatively", async () => {
  const content = packageContent();
  const calls = [];
  const stable = fakeAdapter(calls);
  let failedOnce = false;
  const adapter = {
    ...stable,
    async runRole(args) {
      if (!failedOnce) {
        failedOnce = true;
        calls.push({ role: args.role, failed: true });
        const error = new Error("fixture transient stream interruption");
        error.retryable = true;
        throw error;
      }
      return stable.runRole(args);
    }
  };
  const ledger = createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES });
  const receipt = await runF3Package({
    planRow: planRow("B", content),
    packageContent: content,
    providerAdapter: adapter,
    budgetLedger: ledger,
    maxTransientAttemptsPerRole: 3
  });

  assert.equal(calls.filter((row) => row.failed).length, 1);
  assert.equal(receipt.resourceUsage.providerCalls, 2);
  assert.equal(receipt.resourceUsage.providerAttempts, 3);
  assert.equal(receipt.resourceUsage.failedProviderAttempts, 1);
  assert.equal(receipt.resourceUsage.conservativeFailureDebitTokens, 184_000);
  assert.equal(ledger.snapshot().providerCalls, 3);
});

test("does not retry a non-transient provider contract failure", async () => {
  const content = packageContent();
  let calls = 0;
  const adapter = {
    provider: "fixture-provider",
    async runRole() {
      calls += 1;
      const error = new Error("fixture contract rejection");
      error.retryable = false;
      throw error;
    }
  };
  await assert.rejects(
    runF3Package({
      planRow: planRow("B", content),
      packageContent: content,
      providerAdapter: adapter,
      budgetLedger: createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES }),
      maxTransientAttemptsPerRole: 3
    }),
    /contract rejection/i
  );
  assert.equal(calls, 1);
});

test("a formal run is atomically committed, byte-verified on resume, and refuses conflicting overwrite", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-runner-test-"));
  try {
    const content = packageContent();
    const receipt = await runF3Package({ planRow: planRow("A", content), packageContent: content, providerAdapter: fakeAdapter([]), budgetLedger: createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES }) });
    const first = await writeCommittedF3Run({ outputRoot: temporaryRoot, receipt });
    assert.equal(first.resumed, false);
    const marker = JSON.parse(await readFile(path.join(first.runDirectory, "COMMITTED.json"), "utf8"));
    assert.equal(marker.receiptSha256, receipt.receiptSha256);

    const resumed = await writeCommittedF3Run({ outputRoot: temporaryRoot, receipt });
    assert.equal(resumed.resumed, true);
    await assert.rejects(
      writeCommittedF3Run({ outputRoot: temporaryRoot, receipt: { ...receipt, receiptSha256: "f".repeat(64) } }),
      /conflicting committed run/i
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("resume accepts only an explicitly allowlisted predecessor authorization binding and preserves the original receipt", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-auth-continuity-"));
  try {
    const content = packageContent();
    const predecessorBinding = { entrypointReceiptSha256: "a".repeat(64) };
    const successorBinding = { entrypointReceiptSha256: "b".repeat(64) };
    const predecessorPlan = { ...planRow("A", content), candidateSetSha256: "c".repeat(64), authorizationBinding: predecessorBinding };
    const receipt = await runF3Package({
      planRow: predecessorPlan,
      packageContent: content,
      providerAdapter: fakeAdapter([]),
      budgetLedger: createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES })
    });
    await writeCommittedF3Run({ outputRoot: temporaryRoot, receipt });
    const successorPlan = { ...predecessorPlan, authorizationBinding: successorBinding };
    await assert.rejects(
      readCommittedF3Run({ outputRoot: temporaryRoot, planRow: successorPlan }),
      /resume verification/i
    );
    const resumed = await readCommittedF3Run({
      outputRoot: temporaryRoot,
      planRow: successorPlan,
      allowedAuthorizationBindingSha256: [canonicalSha256(predecessorBinding)]
    });
    assert.equal(resumed.receipt.receiptSha256, receipt.receiptSha256);
    assert.deepEqual(resumed.receipt.authorizationBinding, predecessorBinding);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
