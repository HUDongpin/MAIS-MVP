import assert from "node:assert/strict";
import test from "node:test";

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import {
  V5_R4_SCHEMA_CATALOG,
  validateClosedSelfHashedArtifactV5R4,
  validateFreshA11RunnerReviewV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  validateRunnerRegistrationV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { validateProviderAuthorizationV5R4 } from "./route-authorization-v5-r4.mjs";
import {
  buildProviderRequestArtifactV5R4,
  exactProviderWireBytesV5R4,
  validateAndRebuildProviderRequestArtifactV5R4,
} from "./provider-request-v5-r4.mjs";
import { planOpenAIReferenceResumeV5R4 } from "./execution-state-v5-r4.mjs";
import { runCliV5R4 } from "./runner-v5-r4-cli.mjs";
import {
  buildProtectedWorkflowIndexV5R4,
  createRunnerRuntimeV5R4,
} from "./runner-v5-r4-runtime.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";

test("V5-R4 closed schemas accept the exact offline registration, inventory, and fresh review", () => {
  const core = buildRunnerFixtureV5R4();
  assert.deepEqual(validateRunnerRegistrationV5R4(core.registration), []);
  assert.deepEqual(validateSampleExecutionInventoryV2(core), []);
  assert.deepEqual(validateFreshA11RunnerReviewV5R4(core), []);

  const withUnexpectedField = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(core.review).filter(([key]) => key !== "selfHash")),
    unexpectedAuthority: true,
  });
  assert.match(validateClosedSelfHashedArtifactV5R4(withUnexpectedField, "IndependentExecutionRunnerReviewReceiptV2").join("; "), /additional property forbidden/u);
});

test("closed validator enforces nested role-map cardinality as well as property allowlists", () => {
  const roleMapSchema = V5_R4_SCHEMA_CATALOG.MachineReferenceSealV3.properties.itemSummaries.items.properties.roleOutputHashes;
  assert.equal(roleMapSchema.maxProperties, 5);
  const schema = V5_R4_SCHEMA_CATALOG.MachineReferenceSealV3;
  const summary = schema.properties.itemSummaries.items;
  assert.equal(summary.additionalProperties, false);
});

test("every V5-R4 trust-boundary schema is top-level closed, self-hashed, and has no optional undeclared state", () => {
  assert.ok(Object.keys(V5_R4_SCHEMA_CATALOG).length >= 30);
  for (const [name, schema] of Object.entries(V5_R4_SCHEMA_CATALOG)) {
    assert.equal(schema.type, "object", `${name} must be an object schema`);
    assert.equal(schema.additionalProperties, false, `${name} must reject extra top-level fields`);
    assert.ok(schema.required.includes("selfHash"), `${name} must require selfHash`);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), `${name} may not carry optional trust state`);
  }
});

test("offline runner registration is immutably zero-authority and rejects a resealed execution claim", () => {
  const core = buildRunnerFixtureV5R4();
  const registration = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(core.registration).filter(([key]) => key !== "selfHash")),
    authorizationState: { ...core.registration.authorizationState, providerEventCount: 1 },
  });
  assert.match(validateRunnerRegistrationV5R4(registration).join("; "), /zero[- ]authority|offline registration|provider event/iu);
});

test("full synthetic OpenAI authorization validates only against exact GPT-5.6 Luna US tuple", () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  assert.deepEqual(validateProviderAuthorizationV5R4(fixture), []);

  const authorization = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(fixture.authorization).filter(([key]) => key !== "selfHash")),
    endpoint: "https://api.openai.com/v1/responses",
  });
  assert.notDeepEqual(validateProviderAuthorizationV5R4({ ...fixture, authorization }), []);
});

test("V5-native provider request binds a V5 manifest, exact allowlist, and immutable wire bytes", () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const requestArtifact = buildProviderRequestArtifactV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[0],
    role: "A_SOLVE",
    attemptId: "fixture-openai-a-solve-001",
    ledgerEntries: [],
  });
  assert.equal(requestArtifact.provider, "OPENAI_DIRECT");
  assert.equal(requestArtifact.model, "gpt-5.6-luna");
  assert.equal(requestArtifact.endpoint, "https://us.api.openai.com/v1/responses");
  assert.deepEqual(requestArtifact.providerInputFieldNames, ["grade", "locale", "options", "prompt", "responseForm", "topic"]);
  assert.equal(requestArtifact.referenceInputCount, 0);
  assert.equal(requestArtifact.deepSeekInputCount, 0);
  assert.ok(exactProviderWireBytesV5R4(requestArtifact).byteLength > 0);
  assert.deepEqual(validateAndRebuildProviderRequestArtifactV5R4({
    ...fixture,
    requestArtifact,
    itemLeaf: fixture.itemLeaves[0],
    role: "A_SOLVE",
    ledgerEntries: [],
  }), []);

  const changed = structuredClone(requestArtifact);
  changed.providerInput.prompt.en = "result-dependent mutation";
  const resealed = sealV5R3Artifact(Object.fromEntries(Object.entries(changed).filter(([key]) => key !== "selfHash")));
  assert.match(validateAndRebuildProviderRequestArtifactV5R4({
    ...fixture,
    requestArtifact: resealed,
    itemLeaf: fixture.itemLeaves[0],
    role: "A_SOLVE",
    ledgerEntries: [],
  }).join("; "), /differs from exact protected-item reconstruction/iu);
});

test("reference resume begins at manifest row one A_SOLVE and never rerolls", () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  const plan = planOpenAIReferenceResumeV5R4({
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    ledgerEntries: [],
    generatedAt: fixture.at,
  });
  assert.equal(plan.planStatus, "NEXT_ACTION");
  assert.equal(plan.manifestOrdinal, 1);
  assert.equal(plan.itemHash, fixture.inventory.items[0].itemHash);
  assert.equal(plan.role, "A_SOLVE");
});

test("CLI rejects ignored or ambiguous provider flags before loading any context", async () => {
  let contextLoads = 0;
  const deps = { loadWorkflowContext: async () => { contextLoads += 1; return {}; } };
  const badCanary = await runCliV5R4(["execute-deepseek", "--context", "/fixture/index.json", "--canary", "2"], deps);
  const mixedModes = await runCliV5R4(["execute-deepseek", "--context", "/fixture/index.json", "--canary", "1", "--resume"], deps);
  const missingResume = await runCliV5R4(["label-openai", "--context", "/fixture/index.json"], deps);
  assert.equal(badCanary.receipt.status, "USAGE_ERROR_DEEPSEEK_REQUIRES_EXACT_CANARY_1_OR_RESUME");
  assert.equal(mixedModes.receipt.status, "USAGE_ERROR_DEEPSEEK_REQUIRES_EXACT_CANARY_1_OR_RESUME");
  assert.equal(missingResume.receipt.status, "USAGE_ERROR_LABEL_OPENAI_REQUIRES_RESUME");
  assert.equal(contextLoads, 0);
  for (const outcome of [badCanary, mixedModes, missingResume]) {
    assert.equal(outcome.receipt.providerEventCount, 0);
    assert.equal(outcome.receipt.httpRequestCount, 0);
    assert.equal(outcome.receipt.credentialReadCount, 0);
    assert.equal(outcome.receipt.passClaimAllowed, false);
  }
});

test("protected workflow index binds canonical artifact bytes and rejects ambiguous kinds or paths", () => {
  const core = buildRunnerFixtureV5R4();
  const entries = [
    { kind: "SAMPLE_MANIFEST", relativePath: "frozen/sample-manifest.json", value: core.sampleManifest },
    { kind: "SAMPLE_INVENTORY", relativePath: "frozen/sample-inventory.json", value: core.inventory },
  ];
  const index = buildProtectedWorkflowIndexV5R4({ registration: core.registration, artifactEntries: entries, createdAt: "2026-08-26T00:30:00.000Z" });
  assert.equal(index.runnerRegistrationHash, core.registration.selfHash);
  assert.equal(index.artifactEntries.length, 2);
  assert.match(index.artifactEntries[0].contentHash, /^[0-9a-f]{64}$/u);
  assert.throws(() => buildProtectedWorkflowIndexV5R4({
    registration: core.registration,
    artifactEntries: [...entries, { ...entries[0], relativePath: "frozen/duplicate-kind.json" }],
    createdAt: "2026-08-26T00:30:00.000Z",
  }), /unique/iu);
});

test("runtime dry-run and blocked authorization-check never touch credential readers or fetch", async () => {
  const core = buildRunnerFixtureV5R4();
  const registrationEvidence = sealV5R3Artifact({
    schemaVersion: "ExactRunnerRegistrationEvidenceV1",
    registrationCommit: "c".repeat(40),
    registrationPath: "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r4/runner-registration.json",
    registrationHash: core.registration.selfHash,
    runnerSourceCommit: core.registration.runnerSourceCommit,
    productionSourceRootHash: core.registration.productionSourceRootHash,
    testSourceRootHash: core.registration.testSourceRootHash,
    verifiedFromGitObjects: true,
    registration: core.registration,
  });
  const context = { registration: core.registration, registrationEvidence, artifacts: new Map([["SAMPLE_INVENTORY", core.inventory]]) };
  let credentialReads = 0;
  let fetchCalls = 0;
  const runtime = createRunnerRuntimeV5R4({
    fetchImplementation: async () => { fetchCalls += 1; throw new Error("offline test must not fetch"); },
    credentialReaders: { OPENAI_DIRECT: async () => { credentialReads += 1; return "forbidden"; } },
    clock: () => new Date("2026-08-26T01:00:00.000Z"),
  });
  const dryRun = await runtime.dryRun(context);
  const authorization = await runtime.authorizeCheck(context, "OPENAI_DIRECT");
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.status, "OFFLINE_DRY_RUN_VERIFIED_NO_CREDENTIAL_READ_NO_PROVIDER_EVENT_NO_EGRESS");
  assert.equal(authorization.status, "AUTHORIZATION_BLOCKED");
  assert.equal(credentialReads, 0);
  assert.equal(fetchCalls, 0);
});
