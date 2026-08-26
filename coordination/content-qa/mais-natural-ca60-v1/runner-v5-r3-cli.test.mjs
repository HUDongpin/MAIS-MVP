import assert from "node:assert/strict";
import test from "node:test";

import { runCliV5R3 } from "./runner-v5-r3-cli.mjs";

test("provider commands fail closed before credential access when workflow evidence is absent", async () => {
  let credentialReads = 0;
  let executions = 0;
  const deps = {
    loadWorkflowContext: async () => null,
    readCredential: async () => { credentialReads += 1; return "fake"; },
    executeOpenAIResumeStep: async () => { executions += 1; },
    executeDeepSeekResumeStep: async () => { executions += 1; },
  };
  const openai = await runCliV5R3(["label-openai", "--context", "/protected/context.json"], deps);
  const deepseek = await runCliV5R3(["execute-deepseek", "--resume", "--context", "/protected/context.json"], deps);
  assert.equal(openai.exitCode, 3);
  assert.equal(deepseek.exitCode, 3);
  assert.equal(credentialReads, 0);
  assert.equal(executions, 0);
});

test("upstream registration/frame/sample commands require a loaded context and a real verifier", async () => {
  const missing = await runCliV5R3(["freeze-sample"], {});
  assert.equal(missing.exitCode, 3);
  const calls = [];
  const verified = await runCliV5R3(["freeze-sample", "--context", "/protected/context.json"], {
    loadWorkflowContext: async () => ({ schemaVersion: "NaturalCaProtectedWorkflowContextV1" }),
    verifyFrozenUpstream: async (_context, options) => {
      calls.push(options.argv[0]);
      return { ok: true, status: "UPSTREAM_V5_FRAME_SAMPLE_AND_RUNNER_REGISTRATION_VERIFIED" };
    },
  });
  assert.equal(verified.exitCode, 0);
  assert.deepEqual(calls, ["freeze-sample"]);
});

test("provider commands invoke the actual guarded workflow dependency once with a loaded context", async () => {
  const calls = [];
  const context = { schemaVersion: "NaturalCaProtectedWorkflowContextV1", authorizationReady: true };
  const deps = {
    loadWorkflowContext: async (path) => { calls.push(["load", path]); return context; },
    executeOpenAIResumeStep: async (value) => { calls.push(["openai", value]); return { status: "FIXTURE_SUCCEEDED", dispatchAllowed: true, providerEventCount: 0 }; },
    executeDeepSeekResumeStep: async (value) => { calls.push(["deepseek", value]); return { status: "FIXTURE_SUCCEEDED", providerEventCount: 0 }; },
  };
  const result = await runCliV5R3(["label-openai", "--context", "/protected/context.json"], deps);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(calls.map((entry) => entry[0]), ["load", "openai"]);
  assert.equal(result.receipt.providerCommandInvoked, true);
});

test("a delivered but schema-failed provider event remains visible in the command receipt", async () => {
  const result = await runCliV5R3(["label-openai", "--context", "/protected/context.json"], {
    loadWorkflowContext: async () => ({ schemaVersion: "NaturalCaProtectedWorkflowContextV1" }),
    executeOpenAIResumeStep: async () => ({
      ok: false,
      status: "SCHEMA_FAILURE",
      dispatchAllowed: true,
      providerEventCount: 1,
      httpRequestCount: 1,
      credentialReadCount: 1,
    }),
  });
  assert.equal(result.exitCode, 3);
  assert.equal(result.receipt.providerCommandInvoked, true);
  assert.equal(result.receipt.providerEventCount, 1);
  assert.equal(result.receipt.httpRequestCount, 1);
  assert.equal(result.receipt.credentialReadCount, 1);
});

test("a loaded context with a blocked engine exits nonzero and does not claim provider invocation", async () => {
  const result = await runCliV5R3(["label-openai", "--context", "/protected/context.json"], {
    loadWorkflowContext: async () => ({ schemaVersion: "NaturalCaProtectedWorkflowContextV1" }),
    executeOpenAIResumeStep: async () => ({ ok: false, status: "AUTHORIZATION_BLOCKED", providerEventCount: 0 }),
  });
  assert.equal(result.exitCode, 3);
  assert.equal(result.receipt.providerCommandInvoked, false);
});

test("score, verify, and aggregate export call real injected engines and never fabricate success", async () => {
  const calls = [];
  const deps = {
    loadWorkflowContext: async () => ({ schemaVersion: "NaturalCaProtectedWorkflowContextV1" }),
    score: async () => { calls.push("score"); return { status: "INCONCLUSIVE_MACHINE_REFERENCE" }; },
    verify: async () => { calls.push("verify"); return { status: "CONCURRED" }; },
    exportAggregateReport: async () => { calls.push("export"); return { status: "EXPORTED_AGGREGATE_ONLY" }; },
  };
  assert.equal((await runCliV5R3(["score", "--context", "/p"], deps)).exitCode, 0);
  assert.equal((await runCliV5R3(["verify", "--context", "/p"], deps)).exitCode, 0);
  assert.equal((await runCliV5R3(["export-aggregate-report", "--context", "/p"], deps)).exitCode, 0);
  assert.deepEqual(calls, ["score", "verify", "export"]);
  const missing = await runCliV5R3(["score", "--context", "/p"], { loadWorkflowContext: deps.loadWorkflowContext });
  assert.equal(missing.exitCode, 3);
});
