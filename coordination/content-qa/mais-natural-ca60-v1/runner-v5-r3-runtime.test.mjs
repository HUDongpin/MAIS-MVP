import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { canonicalJsonV5R3, sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import { createFilesystemCliDependenciesV5R3, loadProtectedWorkflowContextV5R3 } from "./runner-v5-r3-runtime.mjs";

test("filesystem runtime loads only sealed 0600 contexts inside the protected root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-context-"));
  const context = sealV5R3Artifact({ schemaVersion: "NaturalCaProtectedWorkflowContextV1", provider: "OPENAI_DIRECT" });
  const contextPath = path.join(root, "context.json");
  await writeFile(contextPath, canonicalJsonV5R3(context), { mode: 0o600 });
  assert.equal((await loadProtectedWorkflowContextV5R3(contextPath, { protectedRoot: root })).selfHash, context.selfHash);
  await chmod(contextPath, 0o644);
  await assert.rejects(loadProtectedWorkflowContextV5R3(contextPath, { protectedRoot: root }), /0600/u);
  await assert.rejects(loadProtectedWorkflowContextV5R3(path.join(tmpdir(), "outside.json"), { protectedRoot: root }), /protected root/u);
});

test("production dependency path performs a real guard check and reads no env credential on blocked context", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-runtime-"));
  let environmentReads = 0;
  const env = new Proxy({}, { get() { environmentReads += 1; return "must-not-be-read"; } });
  const deps = createFilesystemCliDependenciesV5R3({ protectedRoot: root, env, fetchImpl: async () => { throw new Error("must not fetch"); } });
  const context = sealV5R3Artifact({
    schemaVersion: "NaturalCaProtectedWorkflowContextV1",
    provider: "OPENAI_DIRECT",
    openAIState: { item: { itemHash: "a".repeat(64), itemIdPseudonym: "item-1" }, attempts: [], adjudicationTrigger: null },
    requests: {},
  });
  const result = await deps.executeOpenAIResumeStep(context);
  assert.equal(result.status, "REQUEST_NOT_FROZEN");
  assert.equal(environmentReads, 0);
});

test("authorize-check, verify, score, and export all fail until their complete sealed inputs exist", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-runtime-gates-"));
  const deps = createFilesystemCliDependenciesV5R3({ protectedRoot: root, env: {} });
  const context = sealV5R3Artifact({ schemaVersion: "NaturalCaProtectedWorkflowContextV1", provider: "OPENAI_DIRECT" });
  assert.equal((await deps.authorizeCheck(context)).status, "AUTHORIZATION_BLOCKED");
  assert.equal((await deps.verify(context)).status, "UPSTREAM_FROZEN_EVIDENCE_BLOCKED");
  assert.equal((await deps.score(context)).status, "SCORING_INPUT_BLOCKED");
  assert.equal((await deps.exportAggregateReport(context)).status, "AGGREGATE_EXPORT_BLOCKED");
});
