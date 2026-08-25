import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  canonicalJson,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildCommittedFormalFreezeRunnerIdentityV5,
  FORMAL_FREEZE_RUNNER_SOURCE_PATHS_V5,
  FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5,
  parseFormalFreezeStartedAt,
} from "./formal-freeze-v5-cli";
import {
  buildV5SourceEnumerationHashErratum,
  validateV5SourceEnumerationHashErratum,
} from "./source-enumeration-hash-erratum-v5.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const APPROVED_READINESS_SOURCE_COMMIT = "bd44971158979b5e31acf5bf0b1fabc360c9a53a";
const ERRATUM_PATH = path.join(
  REPO_ROOT,
  "coordination/research/mais-natural-ca60-v1/errata/2026-08-26-v5-source-enumeration-hash/erratum.json",
);

function git(args: string[]) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
}

test("formal-freeze CLI accepts only canonical UTC millisecond timestamps", () => {
  assert.equal(
    parseFormalFreezeStartedAt(["--started-at", "2026-08-25T20:00:00.000Z"]),
    "2026-08-25T20:00:00.000Z",
  );
  for (const argv of [
    [],
    ["--started-at"],
    ["--started-at", "2026-08-25T20:00:00Z"],
    ["--started-at", "2026-08-25T20:00:00.000+00:00"],
    ["--started-at", "not-a-timestamp"],
    ["--other", "2026-08-25T20:00:00.000Z"],
  ]) assert.throws(() => parseFormalFreezeStartedAt(argv), /started-at|usage/u);
});

test("all owner-bound runtime paths exist at the approved readiness source commit", () => {
  assert.equal(FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5.length, 17);
  assert.equal(new Set(FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5).size, FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5.length);
  for (const repoRelativePath of FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5) {
    assert.doesNotThrow(
      () => git(["cat-file", "-e", `${APPROVED_READINESS_SOURCE_COMMIT}:${repoRelativePath}`]),
      repoRelativePath,
    );
  }
});

test("committed identity fails on dirtiness and fully resolves on a clean exact-SHA worktree", () => {
  const status = git(["status", "--porcelain", "--untracked-files=all"]);
  if (status.length > 0) {
    assert.throws(
      () => buildCommittedFormalFreezeRunnerIdentityV5(),
      /clean exact-SHA worktree is required/u,
    );
    return;
  }
  const identity = buildCommittedFormalFreezeRunnerIdentityV5();
  assert.match(identity.sourceCommit, /^[0-9a-f]{40}$/u);
  assert.equal(identity.runnerCommit, identity.sourceCommit);
  assert.match(identity.runnerHash, /^[0-9a-f]{64}$/u);
  assert.equal(identity.approvedReadinessSourceCommit, APPROVED_READINESS_SOURCE_COMMIT);
  assert.equal(identity.sourceModuleFiles.length, FORMAL_FREEZE_RUNTIME_SOURCE_PATHS_V5.length);
  assert.match(identity.sourceClosureParityHash, /^[0-9a-f]{64}$/u);
  for (const value of Object.values(identity.implementationHashes)) assert.match(value, /^[0-9a-f]{64}$/u);
});

test("tracked source-enumeration erratum exactly matches its builder, self-hash, and closed schema", async () => {
  const tracked = JSON.parse(await readFile(ERRATUM_PATH, "utf8"));
  const expected = buildV5SourceEnumerationHashErratum({ recordedAt: "2026-08-25T19:37:37.000Z" });
  assert.equal(canonicalJson(tracked), canonicalJson(expected));
  assert.deepEqual(validateV5SourceEnumerationHashErratum(tracked), []);
  assert.equal(tracked.erratumHash, "d4050ab3070985dd4689dda4f51f44cf1d2f5f8f286cc548ac98919c8e8b540d");
  assert.notEqual(tracked.inheritedMethodContractHash, tracked.activeV5ProviderChronologyContractHash);
  assert.equal(tracked.providerEventCountAtDiscovery, 0);
  assert.equal(tracked.authorizesProviderExecution, false);

  const schema = JSON.parse(await readFile(
    path.join(import.meta.dirname, "schemas/NaturalCaV5SourceEnumerationHashErratumV1.schema.json"),
    "utf8",
  ));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(tracked).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(tracked).sort());
  for (const [field, definition] of Object.entries(schema.properties) as Array<[string, { const?: unknown }]>) {
    if (Object.hasOwn(definition, "const")) assert.deepEqual(tracked[field], definition.const, field);
  }
});

test("formal-freeze execution sources contain no network, SDK, environment, or credential primitive", async () => {
  for (const required of [
    "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeCustodyManifestV1.schema.json",
    "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeReceiptV1.schema.json",
    "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaV5SourceEnumerationHashErratumV1.schema.json",
    "coordination/research/mais-natural-ca60-v1/errata/2026-08-26-v5-source-enumeration-hash/erratum.json",
  ]) assert.ok(FORMAL_FREEZE_RUNNER_SOURCE_PATHS_V5.includes(required), required);

  const files = [
    "formal-freeze-v5.ts",
    "formal-freeze-v5-storage.ts",
    "formal-freeze-v5-cli.ts",
    "source-enumeration-hash-erratum-v5.mjs",
  ];
  for (const filename of files) {
    const source = await readFile(path.join(import.meta.dirname, filename), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|https\.request|http\.request|node:net|node:tls/u, filename);
    assert.doesNotMatch(source, /process\.env|OPENAI_API_KEY|DEEPSEEK_API_KEY/u, filename);
    assert.doesNotMatch(source, /from\s+["'](?:openai|axios|undici)["']/u, filename);
  }
});
