import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeClosureKernelsV5R7,
  PRODUCTION_ENTRYPOINTS_V5_R7,
} from "./execution-evidence-v5-r7.mjs";
import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  collectFilesystemSourceClosureV5R6,
} from "./source-closure-v5-r6.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const packageRoot = "coordination/content-qa/mais-natural-ca60-v1/";
const HASH = /^[0-9a-f]{64}$/u;

async function manifestFor(paths) {
  const rows = [];
  for (const sourcePath of [...paths].sort()) {
    const bytes = await readFile(path.join(repoRoot, sourcePath));
    rows.push({ path: sourcePath, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) });
  }
  return rows;
}

test("V5-R7 production entrypoints have one deterministic complete transitive filesystem closure", async () => {
  assert.deepEqual(PRODUCTION_ENTRYPOINTS_V5_R7, [...PRODUCTION_ENTRYPOINTS_V5_R7].sort());
  const forward = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R7,
  });
  const reverse = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R7].reverse(),
  });
  assert.deepEqual(reverse, forward);
  assert.ok(forward.paths.length > PRODUCTION_ENTRYPOINTS_V5_R7.length);
  assert.ok(forward.importEdgeCount >= forward.paths.length - 1);
  assert.ok(HASH.test(forward.importClosureRootHash));
  for (const entrypoint of PRODUCTION_ENTRYPOINTS_V5_R7) {
    assert.ok(forward.paths.includes(entrypoint), `${entrypoint} is absent from its registered closure`);
  }
  for (const required of [
    `${packageRoot}atomic-execution-ledger-v5-r7.mjs`,
    `${packageRoot}dispatch-authority-v5-r7.mjs`,
    `${packageRoot}execution-freeze-v5-r7.mjs`,
    `${packageRoot}native-provider-attempt-v5-r7.mjs`,
    `${packageRoot}provider-request-v5-r6.mjs`,
    `${packageRoot}raw-response-custody-v5-r6.mjs`,
    `${packageRoot}schemas/NaturalCaRunnerCommandReceiptV6.schema.json`,
    `${packageRoot}schemas/ProviderAuthorizationV5.schema.json`,
    `${packageRoot}schemas/ProviderDispatchPermitV5.schema.json`,
    `${packageRoot}schemas/ResolvedProviderAttemptReceiptV2.schema.json`,
  ]) assert.ok(forward.paths.includes(required), `${required} is outside the production closure`);
  assert.equal(forward.paths.some((sourcePath) => sourcePath.endsWith(".test.mjs")), false);
  assert.equal(forward.paths.includes(
    "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r7/runner-registration.json"), false,
  "future immutable V5-R7 registration must not be hidden inside its own source closure");
});

test("V5-R7 closure kernels are complete deterministic hashes of the exact filesystem manifest", async () => {
  const closure = await collectFilesystemSourceClosureV5R6({
    repoRoot,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R7,
  });
  const manifest = await manifestFor(closure.paths);
  assert.equal(canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath)),
    canonicalJsonV5R3(closure.paths));
  const first = computeClosureKernelsV5R7(manifest);
  const second = computeClosureKernelsV5R7(await manifestFor([...closure.paths].reverse()));
  assert.deepEqual(second, first);
  assert.deepEqual(Object.keys(first).sort(), [
    "activityJournalHash",
    "atomicAttemptCustodyHash",
    "attemptGraphHash",
    "completeScorerVerifierHash",
    "exactRegistrationLoaderHash",
    "freshReviewAdoptionHash",
    "fullTransitiveSourceClosureHash",
    "normalCanaryC0Hash",
    "rawAuthoritativeReferenceHash",
    "routeEvidenceAndCostHash",
    "runtimeCliHash",
  ]);
  for (const [name, value] of Object.entries(first)) {
    assert.ok(HASH.test(value ?? ""), `${name} is missing or is not a SHA-256 hash`);
  }
});
