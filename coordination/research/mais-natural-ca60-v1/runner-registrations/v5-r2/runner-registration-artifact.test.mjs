import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { jcsHash } from "../../versions/design-v5/design-contract.mjs";
import { buildNaturalCaExecutionRunnerRegistrationV5R2 } from "./build-runner-registration.mjs";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../../..");

async function artifact() {
  return JSON.parse(await readFile(path.join(HERE, "runner-registration.json"), "utf8"));
}

test("sealed V5-R2 registration exactly rebuilds from its bound runner commit and source bytes", async () => {
  const registration = await artifact();
  const rebuilt = await buildNaturalCaExecutionRunnerRegistrationV5R2({
    repoRoot: REPO_ROOT,
    runnerCommit: registration.sourceRoots.runnerCommit,
    createdAt: registration.createdAt,
  });
  assert.deepEqual(rebuilt, registration);
  const body = structuredClone(registration);
  delete body.registrationHash;
  assert.equal(registration.registrationHash, jcsHash(body));

  for (const row of [
    ...registration.sourceRoots.productionSourceManifest,
    ...registration.sourceRoots.testSourceManifest,
  ]) {
    const { stdout } = await execFileAsync("git", ["show", `${registration.sourceRoots.runnerCommit}:${row.path}`], {
      cwd: REPO_ROOT,
      encoding: "buffer",
      maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(stdout.byteLength, row.byteLength, row.path);
    assert.equal(createHash("sha256").update(stdout).digest("hex"), row.sha256, row.path);
  }
});

test("sealed V5-R2 registration grants no provider, credential, egress, token, attempt, or USD authority", async () => {
  const registration = await artifact();
  assert.deepEqual(registration.authorityBoundary, {
    providerExecutionAuthorized: false,
    credentialReadAuthorized: false,
    naturalQuestionEgressAuthorized: false,
    tokenAuthorizationCreated: false,
    attemptAuthorizationCreated: false,
    usdAuthorizationCreated: false,
    providerEventCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    referenceLabelCount: 0,
    naturalQuestionResultCount: 0,
  });
  assert.equal(registration.authorizationState.freshA11RunnerReviewHash, null);
  assert.equal(registration.authorizationState.openAIProjectRoutePreflightAuthorizationHash, null);
  assert.equal(registration.authorizationState.openAIReferenceAuthorizationHash, null);
  assert.equal(registration.authorizationState.referenceSealHash, null);
  assert.equal(registration.authorizationState.deepSeekEvaluationAuthorizationHash, null);
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
});
