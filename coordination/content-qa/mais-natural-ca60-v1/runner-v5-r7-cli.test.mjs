import assert from "node:assert/strict";
import test from "node:test";

import {
  runCliV5R7,
  V5_R7_CLI_COMMANDS,
} from "./runner-v5-r7-cli.mjs";
import {
  createRunnerRuntimeV5R7,
} from "./runner-v5-r7-runtime.mjs";
import {
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

const H = (value) => sha256V5R3(`r7-cli:${value}`);
const EXPECTED_COMMANDS = Object.freeze([
  "register",
  "freeze-frame",
  "audit-clusters",
  "freeze-sample",
  "register-route-evidence",
  "label-reference",
  "label-qwen",
  "seal-reference-labels",
  "dry-run",
  "authorize-check",
  "freeze-deepseek-registration",
  "execute-deepseek",
  "score",
  "verify",
  "export-aggregate-report",
]);

function context() {
  return { activeRegistration: { selfHash: H("registration") } };
}

test("V5-R7 public CLI freezes the full GPT-5.6 Luna command vocabulary and runtime engines", () => {
  assert.deepEqual([...V5_R7_CLI_COMMANDS], EXPECTED_COMMANDS);
  const runtime = createRunnerRuntimeV5R7();
  for (const method of ["adoptR7WorkflowIndex", "executeOpenAIResumeStep",
    "executeDeepSeekCanaryStep", "executeDeepSeekResumeStep", "sealReferenceLabels",
    "freezeDeepSeekExecutionRegistration", "score", "verify"]) {
    assert.equal(typeof runtime[method], "function", `${method} is not bound to the R7 runtime`);
  }
});

test("register reaches the append-only fresh-review adoption engine through --review", async () => {
  let adopted = 0;
  const review = { selfHash: H("review") };
  const current = context();
  const result = await runCliV5R7([
    "register", "--context", "/fixture/index.json", "--review", "/fixture/review.json",
  ], {
    loadWorkflowContext: async () => current,
    loadFreshReview: async (reviewPath) => {
      assert.equal(reviewPath, "/fixture/review.json");
      return review;
    },
    adoptR7WorkflowIndex: async (actualContext, actualReview) => {
      adopted += 1;
      assert.equal(actualContext, current);
      assert.equal(actualReview, review);
      return { ok: true, status: "V5_R7_WORKFLOW_ADOPTED_FIXTURE",
        providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
        activityAccountingStatus: "EXACT", transition: { nextIndex: { selfHash: H("next-index") } } };
    },
  });
  assert.equal(adopted, 1);
  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.observedDurableTransitionCount, 1);
  assert.equal(result.receipt.providerCommandInvoked, false);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R7(result.receipt,
    "NaturalCaRunnerCommandReceiptV6"), []);
});

test("legacy label-qwen is a zero-activity supersession result", async () => {
  const result = await runCliV5R7(["label-qwen", "--context", "/fixture/index.json"], {
    loadWorkflowContext: async () => context(),
    rejectLegacyQwenCommand: async () => ({ ok: false,
      status: "QWEN_COMMAND_SUPERSEDED_GPT_5_6_LUNA_ONLY_NO_PROVIDER_ACTIVITY",
      providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
      naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
      activityAccountingStatus: "EXACT" }),
  });
  assert.equal(result.receipt.providerCommandInvoked, false);
  assert.equal(result.receipt.providerEventCount, 0);
  assert.equal(result.receipt.claimCeiling,
    "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED");
});

test("unexpected provider-engine failure never fabricates exact zero activity", async () => {
  const result = await runCliV5R7([
    "label-reference", "--context", "/fixture/index.json", "--resume",
  ], {
    loadWorkflowContext: async () => context(),
    executeOpenAIResumeStep: async () => { throw new Error("post-dispatch fixture uncertainty"); },
  });
  assert.equal(result.exitCode, 3);
  assert.equal(result.receipt.activityAccountingStatus, "UNKNOWN_FAIL_CLOSED");
  assert.equal(result.receipt.providerCommandInvoked, true);
  assert.equal(result.receipt.providerEventCount, null);
  assert.equal(result.receipt.httpRequestCount, null);
  assert.equal(result.receipt.credentialReadCount, null);
  assert.equal(result.receipt.naturalQuestionEgressCount, null);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R7(result.receipt,
    "NaturalCaRunnerCommandReceiptV6"), []);
});

test("provider commands reject ambiguous flags before loading workflow state", async () => {
  let loads = 0;
  const deps = { loadWorkflowContext: async () => { loads += 1; } };
  for (const argv of [
    ["label-reference", "--context", "/fixture/index.json"],
    ["execute-deepseek", "--context", "/fixture/index.json", "--canary", "2"],
    ["authorize-check", "--context", "/fixture/index.json", "--provider", "openai", "--resume"],
    ["register", "--context", "/fixture/index.json"],
  ]) {
    const result = await runCliV5R7(argv, deps);
    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.providerCommandInvoked, false);
  }
  assert.equal(loads, 0);
});
