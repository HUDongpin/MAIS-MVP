import assert from "node:assert/strict";
import { lstat, mkdtemp, realpath, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import { createAtomicExecutionLedgerV5R4 } from "./atomic-execution-ledger-v5-r4.mjs";
import { buildProviderRequestArtifactV5R4 } from "./provider-request-v5-r4.mjs";
import {
  createExactProviderTransportV5R4,
  GUARDED_PROVIDER_ATTEMPT_V5_R4_CONSTANTS,
  runGuardedProviderAttemptV5R4,
} from "./guarded-provider-attempt-v5-r4.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
  credentialBundleFixtureV5R4,
  deepSeekResponseEnvelopeV5R4,
  openAIResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";

async function temporaryRoot(t, prefix) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return realpath(root);
}

function requestFor(fixture, itemIndex, attemptId, ledgerEntries = []) {
  return buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[itemIndex],
    role: "A_SOLVE",
    attemptId,
    ledgerEntries,
  });
}

async function ledgerFor(t, fixture, suffix) {
  const root = await temporaryRoot(t, `ca60-v5-r4-${suffix}-`);
  const trustedRoot = await establishProtectedRootV5R4(path.join(root, "protected"));
  const ledger = await createAtomicExecutionLedgerV5R4({
    trustedRoot,
    ledgerRelativePath: "ledger",
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    priceSnapshot: fixture.priceSnapshot,
  });
  return { root, trustedRoot, ledger };
}

test("protected storage is 0700/0600, append-only, canonical, and rejects symlink leaves", async (t) => {
  const root = await temporaryRoot(t, "ca60-v5-r4-storage-");
  const trustedRoot = await establishProtectedRootV5R4(path.join(root, "protected"));
  const target = await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: "evidence/value.json", value: { a: 1, z: "frozen" } });
  assert.equal((await stat(trustedRoot.root)).mode & 0o777, 0o700);
  assert.equal((await stat(path.dirname(target))).mode & 0o777, 0o700);
  assert.equal((await stat(target)).mode & 0o777, 0o600);
  assert.deepEqual(await readProtectedJsonV5R4({ trustedRoot, relativePath: "evidence/value.json" }), { a: 1, z: "frozen" });
  await assert.rejects(atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: "evidence/value.json", value: { a: 2 } }), /append-only/iu);

  await symlink(target, path.join(trustedRoot.root, "linked.json"));
  assert.equal((await lstat(path.join(trustedRoot.root, "linked.json"))).isSymbolicLink(), true);
  await assert.rejects(readProtectedJsonV5R4({ trustedRoot, relativePath: "linked.json" }), /non-symlink/iu);
});

test("invalid authorization stops before reservation, credential lookup, and HTTP", async () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const requestArtifact = requestFor(fixture, 0, "invalid-authorization-attempt");
  const badAuthorization = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(fixture.authorization).filter(([key]) => key !== "selfHash")),
    model: "deepseek-v4-pro",
  });
  let reservations = 0;
  let transportCalls = 0;
  const result = await runGuardedProviderAttemptV5R4({
    ...fixture,
    authorization: badAuthorization,
    requestArtifact,
    itemLeaf: fixture.itemLeaves[0],
    ledgerEntries: [],
    ledger: { reserve: async () => { reservations += 1; }, complete: async () => {} },
    transport: { send: async () => { transportCalls += 1; } },
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(reservations, 0);
  assert.equal(transportCalls, 0);
});

test("missing credential consumes one item-role attempt but creates zero provider events and zero HTTP requests", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "missing-credential");
  const requestArtifact = requestFor(fixture, 0, "missing-credential-attempt");
  let credentialReads = 0;
  let fetchCalls = 0;
  const clockValues = ["2026-08-26T01:00:00.000Z", "2026-08-26T01:00:00.010Z"];
  const transport = createExactProviderTransportV5R4({
    credentialReader: async () => { credentialReads += 1; return null; },
    fetchImplementation: async () => { fetchCalls += 1; throw new Error("must not dispatch"); },
    clock: () => new Date(clockValues.shift() ?? "2026-08-26T01:00:00.010Z"),
  });
  const result = await runGuardedProviderAttemptV5R4({
    ...fixture,
    requestArtifact,
    itemLeaf: fixture.itemLeaves[0],
    ledgerEntries: [],
    ledger,
    transport,
    failureClock: () => fixture.at,
  });
  assert.equal(result.status, "CREDENTIAL_UNAVAILABLE");
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(credentialReads, 1);
  assert.equal(fetchCalls, 0);
  const verified = await ledger.verify();
  assert.deepEqual(verified.errors, []);
  assert.equal(verified.accounting.reservations.length, 1);
  assert.equal(verified.accounting.active.length, 0);
  assert.equal(verified.accounting.accountedTokens, 0);
  assert.equal(verified.accounting.accountedUsd, 0);
  assert.equal(verified.entries.at(-1).attemptStatus, "CREDENTIAL_UNAVAILABLE");
});

test("fixture HTTP success produces a bound role output without exposing the credential", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "success");
  const requestArtifact = requestFor(fixture, 0, "successful-fixture-attempt");
  let observedAuthorizationHeader = null;
  let observedProjectHeader = null;
  const responseEnvelope = openAIResponseEnvelopeV5R4({ solution: "2", solvability: "SOLVABLE", uncertain: false });
  const clockValues = ["2026-08-26T01:00:00.000Z", "2026-08-26T01:00:00.020Z"];
  const transport = createExactProviderTransportV5R4({
    credentialReader: async () => credentialBundleFixtureV5R4(fixture, "fixture-secret-never-persisted"),
    fetchImplementation: async (_url, init) => {
      observedAuthorizationHeader = init.headers.authorization;
      observedProjectHeader = init.headers["openai-project"];
      return new Response(JSON.stringify(responseEnvelope), { status: 200, headers: { "content-type": "application/json", "x-request-id": "fixture-request-id" } });
    },
    clock: () => new Date(clockValues.shift() ?? "2026-08-26T01:00:00.020Z"),
  });
  const result = await runGuardedProviderAttemptV5R4({
    ...fixture,
    requestArtifact,
    itemLeaf: fixture.itemLeaves[0],
    ledgerEntries: [],
    ledger,
    transport,
    failureClock: () => fixture.at,
  });
  assert.equal(observedAuthorizationHeader, "Bearer fixture-secret-never-persisted");
  assert.equal(observedProjectHeader, fixture.subjectIdentity);
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.roleOutput.parsedPayload.solution, "2");
  const durable = JSON.stringify((await ledger.verify()).entries);
  assert.equal(durable.includes("fixture-secret-never-persisted"), false);
  assert.equal(durable.includes(fixture.subjectIdentity), false);
  assert.equal(result.providerEventReceipt.projectIdentityHash, fixture.authorization.projectIdentityHash);
  assert.equal(result.permit.projectIdentityHash, fixture.authorization.projectIdentityHash);
});

test("credential subject or OpenAI project mismatch fails before HTTP and is never persisted", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "project-mismatch");
  const requestArtifact = requestFor(fixture, 0, "project-mismatch-attempt");
  let fetchCalls = 0;
  const transport = createExactProviderTransportV5R4({
    credentialReader: async () => ({ apiKey: "fixture-mismatch-secret", subjectIdentity: "wrong-project", openAIProjectId: "wrong-project" }),
    fetchImplementation: async () => { fetchCalls += 1; throw new Error("must not dispatch"); },
    clock: () => new Date("2026-08-26T01:00:00.000Z"),
  });
  const result = await runGuardedProviderAttemptV5R4({
    ...fixture, requestArtifact, itemLeaf: fixture.itemLeaves[0], ledgerEntries: [], ledger, transport,
    failureClock: () => fixture.at,
  });
  assert.equal(result.status, "CREDENTIAL_UNAVAILABLE");
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(fetchCalls, 0);
  const durable = JSON.stringify((await ledger.verify()).entries);
  assert.equal(durable.includes("fixture-mismatch-secret"), false);
  assert.equal(durable.includes("wrong-project"), false);
});

test("dispatch timeout is a conservative provider event with bounded signal and worst-case budget accounting", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "timeout");
  const requestArtifact = requestFor(fixture, 0, "timeout-fixture-attempt");
  let signalSeen = false;
  const times = ["2026-08-26T01:00:00.000Z", "2026-08-26T01:00:05.000Z"];
  const transport = createExactProviderTransportV5R4({
    credentialReader: async () => credentialBundleFixtureV5R4(fixture),
    fetchImplementation: async (_url, init) => {
      signalSeen = init.signal instanceof AbortSignal;
      const error = new Error("fixture timeout");
      error.name = "AbortError";
      throw error;
    },
    clock: () => new Date(times.shift() ?? "2026-08-26T01:00:05.000Z"),
  });
  const result = await runGuardedProviderAttemptV5R4({
    ...fixture,
    requestArtifact,
    itemLeaf: fixture.itemLeaves[0],
    ledgerEntries: [],
    ledger,
    transport,
    failureClock: () => fixture.at,
  });
  assert.equal(GUARDED_PROVIDER_ATTEMPT_V5_R4_CONSTANTS.requestTimeoutMs, 120_000);
  assert.equal(signalSeen, true);
  assert.equal(result.status, "CONNECTION_LOST_AFTER_DISPATCH");
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  const verified = await ledger.verify();
  assert.deepEqual(verified.errors, []);
  assert.equal(verified.accounting.accountedTokens, requestArtifact.reservedTokens);
  assert.ok(verified.accounting.accountedUsd > 0);
});

test("HTTP 429 and malformed 200 are completed failed attempts and never become role outputs", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "http-failures");
  const runFailure = async ({ itemIndex, attemptId, response }) => {
    const before = await ledger.verify();
    const requestArtifact = requestFor(fixture, itemIndex, attemptId, before.entries);
    const transport = createExactProviderTransportV5R4({
      credentialReader: async () => credentialBundleFixtureV5R4(fixture),
      fetchImplementation: async () => response,
      clock: () => new Date("2026-08-26T01:00:00.000Z"),
    });
    return runGuardedProviderAttemptV5R4({
      ...fixture,
      requestArtifact,
      itemLeaf: fixture.itemLeaves[itemIndex],
      ledgerEntries: before.entries,
      ledger,
      transport,
      failureClock: () => fixture.at,
    });
  };
  const limited = await runFailure({ itemIndex: 0, attemptId: "http-429-attempt", response: new Response("rate limited", { status: 429 }) });
  const malformed = await runFailure({ itemIndex: 1, attemptId: "malformed-200-attempt", response: new Response("not-json", { status: 200 }) });
  assert.equal(limited.status, "HTTP_FAILURE");
  assert.equal(limited.roleOutput, null);
  assert.equal(malformed.status, "SCHEMA_FAILURE");
  assert.equal(malformed.roleOutput, null);
  assert.deepEqual((await ledger.verify()).errors, []);
});

test("atomic reservations count active attempts globally while the retry cap remains per item-role", async (t) => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const { ledger } = await ledgerFor(t, fixture, "reservations");
  const first = requestFor(fixture, 0, "active-item-one-attempt-one");
  const second = requestFor(fixture, 1, "active-item-two-attempt-one");
  await ledger.reserve({ requestArtifact: first });
  await ledger.reserve({ requestArtifact: second });
  let verified = await ledger.verify();
  assert.deepEqual(verified.errors, []);
  assert.equal(verified.accounting.active.length, 2);

  const sameRoleRetry = requestFor(fixture, 0, "active-item-one-attempt-two", verified.entries);
  await ledger.reserve({ requestArtifact: sameRoleRetry });
  verified = await ledger.verify();
  assert.deepEqual(verified.errors, []);
  assert.equal(verified.accounting.active.length, 3);
  const forbiddenThird = requestFor(fixture, 0, "active-item-one-attempt-three", verified.entries);
  await assert.rejects(ledger.reserve({ requestArtifact: forbiddenThird }), /per-item-role attempt cap exhausted/iu);
});

test("DeepSeek revision receives only a pseudonymous sealed critique projection with its echo hash", async (t) => {
  const referenceHash = "f".repeat(64);
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4(), "DEEPSEEK_DIRECT", {
    referenceSealHash: referenceHash,
    referenceAttemptChainHash: referenceHash,
  });
  const { ledger } = await ledgerFor(t, fixture, "deepseek-critique");
  const critiqueRequest = buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "B_PRIME_CRITIQUE",
    attemptId: "deepseek-critique-attempt",
    ledgerEntries: [],
  });
  const responseEnvelope = deepSeekResponseEnvelopeV5R4();
  let deepSeekHeaders = null;
  const times = ["2026-08-26T01:00:00.000Z", "2026-08-26T01:00:00.020Z"];
  const transport = createExactProviderTransportV5R4({
    credentialReader: async () => credentialBundleFixtureV5R4(fixture),
    fetchImplementation: async (_url, init) => {
      deepSeekHeaders = init.headers;
      return new Response(JSON.stringify(responseEnvelope), { status: 200, headers: { "content-type": "application/json" } });
    },
    clock: () => new Date(times.shift() ?? "2026-08-26T01:00:00.020Z"),
  });
  const critiqueRun = await runGuardedProviderAttemptV5R4({
    ...fixture,
    requestArtifact: critiqueRequest,
    itemLeaf: fixture.itemLeaves[0],
    ledgerEntries: [],
    ledger,
    transport,
    failureClock: () => fixture.at,
  });
  assert.equal(critiqueRun.status, "SUCCEEDED");
  assert.equal(Object.hasOwn(deepSeekHeaders, "openai-project"), false);
  const entries = (await ledger.verify()).entries;
  const revisionRequest = buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "B_PRIME_REVISION",
    attemptId: "deepseek-revision-attempt",
    ledgerEntries: entries,
  });
  const projected = revisionRequest.providerInput.bPrimeCritiqueArtifact;
  assert.equal(projected.itemPseudonym, fixture.inventory.items[0].itemIdPseudonym);
  assert.equal(projected.role, "B_PRIME_CRITIQUE");
  assert.match(projected.critiqueArtifactHash, /^[0-9a-f]{64}$/u);
  assert.deepEqual(projected.parsedPayload, critiqueRun.roleOutput.parsedPayload);
  assert.equal(Object.hasOwn(projected, "itemHash"), false);
  assert.equal(Object.hasOwn(projected, "sourceOutputHash"), false);
  assert.equal(revisionRequest.referenceInputCount, 0);
  assert.doesNotMatch(JSON.stringify(revisionRequest.providerInput), /reference(?:Label|Seal)|qwen|goldLabel/iu);
});
