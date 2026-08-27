import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  applyReceipt,
  createPreviewPilotApprovalEnvelope,
  createReceipt,
  createReleaseState,
  getGraphSpecDigest,
  getRunnerRegistry,
  getRunnerRegistryDigest,
  sha256Digest,
  validateGraphManifest,
  verifyReceipt,
} from "./index";

const contracts = {
  "graph-manifest.schema.json": {
    version: "mais-graphops-manifest.v1",
    required: ["schemaVersion", "registryVersion", "graphId", "graphVersion", "graphSpecDigest", "runnerRegistryDigest", "runId", "candidate", "authorizations", "runnerIds"],
  },
  "node-spec.schema.json": {
    version: "mais-graphops-node-spec.v1",
    required: ["id", "version", "ownerRole", "reviewerRoles", "runnerId", "dependsOn", "inputSchema", "outputSchema", "requiredEvidence", "allowedReadScopes", "allowedWriteScopes", "sideEffectClass", "authorizationClass", "timeoutMs", "retryPolicy", "terminalOutcomes"],
  },
  "release-state.schema.json": {
    version: "mais-graphops-release-state.v1",
    required: ["schemaVersion", "registryVersion", "graphId", "graphVersion", "graphSpecDigest", "runnerRegistryDigest", "runId", "threadId", "candidate", "manifestDigest", "lifecycle", "evidenceLevel", "nodeReceipts", "preview", "approval", "productionCandidate", "previousProduction", "schema", "sideEffects", "blocker"],
  },
  "receipt.schema.json": {
    version: "mais-graphops-receipt.v1",
    required: ["schemaVersion", "registryVersion", "graphId", "graphVersion", "graphSpecDigest", "runnerRegistryDigest", "runId", "manifestDigest", "runnerId", "sequence", "attempt", "correlationId", "causationEventId", "sourceSha", "treeSha", "runnerReleaseDigest", "outcome", "evidenceDigest", "rawInputDigest", "semanticInputDigest", "rawOutputDigest", "semanticOutputDigest", "stateBefore", "stateAfter", "artifactRefs", "sideEffects", "approvalEnvelopeDigest", "previousRawReceiptDigest", "previousSemanticReceiptDigest", "producedAt", "rawReceiptDigest", "semanticReceiptDigest"],
  },
  "approval-envelope.schema.json": {
    version: "mais-graphops-approval-envelope.v1",
    required: ["runId", "candidateSha", "candidateTreeSha", "graphVersion", "graphSpecDigest", "runnerRegistryDigest", "previewDeploymentId", "previewEvidenceDigest", "requiredChecksDigest", "changedPathPolicyDigest", "schemaSourcePlanDigest", "previousProductionBinding", "approvalExpiresAt", "rollbackAuthorization", "approvalDigest"],
  },
} as const;

function loadSchema(filename: keyof typeof contracts) {
  const path = join(process.cwd(), "coordination", "graphops", "schemas", filename);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
}

function receiptFixture(
  evidenceDigest = sha256Digest({
    checks: [{ name: "binding", verified: true }],
  }),
) {
  const manifest = validateGraphManifest({
    schemaVersion: "mais-graphops-manifest.v1",
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runId: "run-schema-receipt-001",
    candidate: { commitSha: "c".repeat(40), treeSha: "d".repeat(40) },
    authorizations: { previewAllowed: false, productionAllowed: false },
    runnerIds: [...GRAPHOPS_RUNNER_IDS],
  });
  const state = createReleaseState(manifest);
  const receipt = createReceipt({
    manifest,
    state,
    runnerId: "git.bind-protected-main",
    outcome: "PASS",
    evidenceDigest,
    producedAt: "2026-08-27T10:00:00.000Z",
  });
  return { manifest, state, receipt };
}

function createSchemaRegistry() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  ajv.addKeyword({
    keyword: "x-mais-contract-version",
    schemaType: "string",
    valid: true,
  });
  ajv.addFormat("date-time", {
    type: "string",
    validate(value: string) {
      return (
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value
      );
    },
  });
  for (const filename of Object.keys(contracts) as (keyof typeof contracts)[]) {
    ajv.addSchema(loadSchema(filename));
  }
  return ajv;
}

function schemaValidator(
  ajv: ReturnType<typeof createSchemaRegistry>,
  filename: keyof typeof contracts,
) {
  const schema = loadSchema(filename);
  const validate = ajv.getSchema(schema.$id);
  assert.ok(validate, `${filename} was not compiled into the schema registry`);
  return validate;
}

function compileReceiptSchema() {
  return schemaValidator(createSchemaRegistry(), "receipt.schema.json");
}

test("ships parseable Draft 2020-12 schemas bound to every public Foundation contract", () => {
  for (const [filename, expected] of Object.entries(contracts)) {
    const schema = loadSchema(filename as keyof typeof contracts);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^https:\/\/mais\.local\/graphops\/schemas\/.+\.v1\.schema\.json$/);
    assert.equal(schema["x-mais-contract-version"], expected.version);
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), [...expected.required].sort(), filename);
  }
});

test("compiles all Foundation schemas together and accepts canonical runtime contracts", () => {
  const ajv = createSchemaRegistry();
  const { manifest, state, receipt } = receiptFixture();
  const approval = createPreviewPilotApprovalEnvelope({
    runId: manifest.runId,
    candidateSha: manifest.candidate.commitSha,
    candidateTreeSha: manifest.candidate.treeSha,
    previewDeploymentId: "preview-schema-parity",
    previewEvidenceDigest: "1".repeat(64),
    requiredChecksDigest: "2".repeat(64),
    changedPathPolicyDigest: "3".repeat(64),
    schemaSourcePlanDigest: "4".repeat(64),
    previousProductionBinding: {
      deploymentId: "production-schema-parity",
      candidateSha: "5".repeat(40),
    },
    approvalExpiresAt: "2026-08-28T10:00:00.000Z",
    rollbackAuthorization: true,
  });

  const manifestValidator = schemaValidator(
    ajv,
    "graph-manifest.schema.json",
  );
  assert.equal(
    manifestValidator(manifest),
    true,
    JSON.stringify(manifestValidator.errors, null, 2),
  );

  const nodeSpecValidator = schemaValidator(ajv, "node-spec.schema.json");
  for (const spec of getRunnerRegistry()) {
    assert.equal(
      nodeSpecValidator(spec),
      true,
      `${spec.runnerId}: ${JSON.stringify(nodeSpecValidator.errors, null, 2)}`,
    );
  }

  const releaseStateValidator = schemaValidator(
    ajv,
    "release-state.schema.json",
  );
  assert.equal(
    releaseStateValidator(state),
    true,
    JSON.stringify(releaseStateValidator.errors, null, 2),
  );

  const receiptValidator = schemaValidator(ajv, "receipt.schema.json");
  assert.equal(
    receiptValidator(receipt),
    true,
    JSON.stringify(receiptValidator.errors, null, 2),
  );

  let advancedState = state;
  for (const [index, runnerId] of GRAPHOPS_RUNNER_IDS.slice(0, 3).entries()) {
    const nextReceipt = createReceipt({
      manifest,
      state: advancedState,
      runnerId,
      outcome: "PASS",
      evidenceDigest: sha256Digest({ runnerId, verified: true }),
      producedAt: new Date(Date.UTC(2026, 7, 27, 11, index)).toISOString(),
    });
    assert.equal(
      receiptValidator(nextReceipt),
      true,
      `${runnerId}: ${JSON.stringify(receiptValidator.errors, null, 2)}`,
    );
    advancedState = applyReceipt(advancedState, nextReceipt, { manifest });
  }
  assert.equal(advancedState.evidenceLevel, "E3");
  assert.equal(
    releaseStateValidator(advancedState),
    true,
    JSON.stringify(releaseStateValidator.errors, null, 2),
  );

  const approvalValidator = schemaValidator(
    ajv,
    "approval-envelope.schema.json",
  );
  assert.equal(
    approvalValidator(approval),
    true,
    JSON.stringify(approvalValidator.errors, null, 2),
  );
});

test("all non-Receipt schemas reject Foundation capability, registry, activation, and approval drift", () => {
  const ajv = createSchemaRegistry();
  const { manifest, state } = receiptFixture();
  const approval = createPreviewPilotApprovalEnvelope({
    runId: manifest.runId,
    candidateSha: manifest.candidate.commitSha,
    candidateTreeSha: manifest.candidate.treeSha,
    previewDeploymentId: "preview-schema-negative",
    previewEvidenceDigest: "1".repeat(64),
    requiredChecksDigest: "2".repeat(64),
    changedPathPolicyDigest: "3".repeat(64),
    schemaSourcePlanDigest: "4".repeat(64),
    previousProductionBinding: {
      deploymentId: "production-schema-negative",
      candidateSha: "5".repeat(40),
    },
    approvalExpiresAt: "2026-08-28T10:00:00.000Z",
    rollbackAuthorization: true,
  });

  const manifestValidator = schemaValidator(
    ajv,
    "graph-manifest.schema.json",
  );
  assert.equal(
    manifestValidator({
      ...manifest,
      authorizations: { previewAllowed: true, productionAllowed: false },
    }),
    false,
  );
  assert.equal(
    manifestValidator({
      ...manifest,
      runnerIds: [...manifest.runnerIds.slice(0, -1), "shell.arbitrary"],
    }),
    false,
  );

  const nodeSpecValidator = schemaValidator(ajv, "node-spec.schema.json");
  assert.equal(
    nodeSpecValidator({ ...getRunnerRegistry()[0], command: "echo unsafe" }),
    false,
  );
  assert.equal(
    nodeSpecValidator({
      ...getRunnerRegistry()[0],
      runnerId: "shell.arbitrary",
    }),
    false,
  );

  const releaseStateValidator = schemaValidator(
    ajv,
    "release-state.schema.json",
  );
  assert.equal(
    releaseStateValidator({
      ...state,
      preview: { deploymentId: "must-remain-null" },
    }),
    false,
  );

  const approvalValidator = schemaValidator(
    ajv,
    "approval-envelope.schema.json",
  );
  assert.equal(
    approvalValidator({ ...approval, rollbackAuthorization: false }),
    false,
  );
  assert.equal(
    approvalValidator({ ...approval, graphSpecDigest: "0".repeat(64) }),
    false,
  );
});

test("schema artifacts bind fixed graph, registry, capabilities, and public vocabularies", () => {
  const manifest = loadSchema("graph-manifest.schema.json");
  assert.equal(manifest.properties.graphId.const, "mais.release.v1");
  assert.equal(manifest.properties.graphVersion.const, "1.0.0");
  assert.equal(manifest.properties.graphSpecDigest.const, getGraphSpecDigest());
  assert.equal(manifest.properties.runnerRegistryDigest.const, getRunnerRegistryDigest());
  assert.equal(manifest.properties.authorizations.properties.previewAllowed.const, false);
  assert.equal(manifest.properties.authorizations.properties.productionAllowed.const, false);

  const nodeSpec = loadSchema("node-spec.schema.json");
  assert.deepEqual(nodeSpec.$defs.runnerId.enum, GRAPHOPS_RUNNER_IDS);
  assert.equal(nodeSpec.properties.version.const, "1.0.0");

  const approval = loadSchema("approval-envelope.schema.json");
  assert.equal(approval.properties.rollbackAuthorization.const, true);

  const receipt = loadSchema("receipt.schema.json");
  assert.deepEqual(receipt.properties.runnerId.enum, GRAPHOPS_RUNNER_IDS.slice(0, 3));
  assert.deepEqual(receipt.properties.outcome.enum, [
    "PASS",
    "BLOCKED",
    "REPAIR_REQUIRED",
    "INCONCLUSIVE",
    "CANCELLED",
    "FAILED_INTERNAL",
  ]);
  assert.equal(receipt.properties.graphSpecDigest.const, getGraphSpecDigest());
  assert.equal(
    receipt.properties.runnerRegistryDigest.const,
    getRunnerRegistryDigest(),
  );
  assert.ok(receipt.properties.evidenceDigest);
  assert.equal(receipt.properties.evidence, undefined);
});

test("Draft 2020 Receipt schema accepts a canonical runtime receipt", () => {
  const validate = compileReceiptSchema();
  const { manifest, state, receipt } = receiptFixture();

  assert.equal(validate(receipt), true, JSON.stringify(validate.errors, null, 2));
  assert.doesNotThrow(() => verifyReceipt(receipt, { manifest, state }));
});

test("runtime creation rejects arbitrary evidence bodies and Receipt stores only a digest", () => {
  const forbiddenFields = [
    "command",
    "shell",
    "env",
    "rawSql",
    "targetUrl",
    "provider",
    "deployArgs",
    "networkEndpoint",
    "nested-C_m.D!",
    "build-E_n.V!",
    "target-U_r.I!",
    "origin-H_o.S-t!",
    "cİmd",
    "cmİd",
  ] as const;

  for (const field of forbiddenFields) {
    assert.throws(
      () => {
        const { manifest, state } = receiptFixture();
        return createReceipt({
          manifest,
          state,
          runnerId: "git.bind-protected-main",
          outcome: "PASS",
          evidenceDigest: "e".repeat(64),
          evidence: { safe: [{ nested: { [field]: "blocked" } }] },
          producedAt: "2026-08-27T10:00:00.000Z",
        } as unknown as Parameters<typeof createReceipt>[0]);
      },
      /must contain exactly/i,
      field,
    );
  }

  const validate = compileReceiptSchema();
  const { manifest, state, receipt } = receiptFixture();
  const drifted = { ...receipt, evidence: { message: "must-not-be-stored" } };
  assert.equal(validate(drifted), false);
  assert.ok(
    validate.errors?.some(
      (error) => error.params.additionalProperty === "evidence",
    ),
    JSON.stringify(validate.errors),
  );
  assert.throws(
    () => verifyReceipt(drifted, { manifest, state }),
    /exactly/i,
  );
});

test("Draft 2020 Receipt schema and runtime require a lowercase SHA-256 evidence digest", () => {
  for (const evidenceDigest of [
    "short",
    "E".repeat(64),
    "g".repeat(64),
    "e".repeat(63),
  ]) {
    const validate = compileReceiptSchema();
    const { manifest, state, receipt } = receiptFixture();
    const drifted = { ...receipt, evidenceDigest };
    assert.equal(validate(drifted), false, evidenceDigest);
    assert.throws(
      () =>
        createReceipt({
          manifest,
          state,
          runnerId: "git.bind-protected-main",
          outcome: "PASS",
          evidenceDigest,
          producedAt: "2026-08-27T10:00:00.000Z",
        }),
      /evidenceDigest.*lowercase SHA-256/i,
    );
  }
});

test("Draft 2020 Receipt schema and runtime reject outcome, runner, and fixed digest drift", () => {
  const cases = [
    {
      label: "outcome",
      patch: { outcome: "REJECTED" },
      errorPath: "/outcome",
    },
    {
      label: "rollback-only outcome",
      patch: { outcome: "ROLLED_BACK" },
      errorPath: "/outcome",
    },
    {
      label: "runner/sequence",
      patch: { runnerId: "release.owner-currentness" },
      errorPath: "/sequence",
    },
    {
      label: "non-public fourth runner",
      patch: { runnerId: "release.build-gate", sequence: 4 },
      errorPath: "/runnerId",
    },
    {
      label: "graph digest",
      patch: { graphSpecDigest: "0".repeat(64) },
      errorPath: "/graphSpecDigest",
    },
    {
      label: "registry digest",
      patch: { runnerRegistryDigest: "1".repeat(64) },
      errorPath: "/runnerRegistryDigest",
    },
  ] as const;

  for (const candidate of cases) {
    const validate = compileReceiptSchema();
    const { manifest, state, receipt } = receiptFixture();
    const drifted = { ...receipt, ...candidate.patch };

    assert.equal(validate(drifted), false, `${candidate.label} passed JSON Schema`);
    assert.ok(
      validate.errors?.some(
        (error) => error.instancePath === candidate.errorPath,
      ),
      `${candidate.label} was rejected only for an unrelated schema error: ${JSON.stringify(validate.errors)}`,
    );
    assert.throws(
      () => verifyReceipt(drifted, { manifest, state }),
      (error: unknown) => error instanceof Error,
      candidate.label,
    );
  }
});
