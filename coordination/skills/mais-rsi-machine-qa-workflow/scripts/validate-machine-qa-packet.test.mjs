import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  collectLiveRuntimeEvidence,
  canonicalSha256,
  C0_ROLES,
  NEXT_ALLOWED_ACTIONS,
  computeActiveReceiptManifestSha256,
  computeAuthorizationSha256,
  computeBoundReceiptSha256,
  computeDPrimeValidationReceiptSha256,
  computeExecutableCodeManifestSha256,
  computeReceiptArtifactSha256,
  computeResultSha256,
  computeTrustReceiptIdentitySha256,
  computeValidationReceiptSha256,
  resolveMachineQaTransition,
  validateMachineQaPacket,
  validatePacketSchema,
} from "./machine-qa-contract.mjs";
import {
  clone,
  activeManifestBindings,
  applyActiveReceiptManifest,
  buildActiveReceiptManifest,
  hash,
  rebindTrustAnchor,
  refreshEvidenceHashes,
  timestamp,
  validLivePacket,
  validMutatedPacket,
  validPacket,
  withRequiredC0,
} from "./test-fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "validate-machine-qa-packet.mjs");
const SCHEMA = path.join(HERE, "..", "assets", "machine-qa-evidence.schema.json");

async function withTempFile(content, fn) {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-machine-qa-test-"));
  const file = path.join(directory, "packet.json");
  await writeFile(file, content, "utf8");
  try {
    return await fn(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function run(file) {
  return spawnSync(process.execPath, [SCRIPT, file], { encoding: "utf8" });
}

function parseOutput(result) {
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function issueCodes(packet, options) {
  return validateMachineQaPacket(packet, options).map((item) => item.code);
}

function rebindControlPlaneWithoutReplacingReceipts(packet, mutate) {
  mutate(packet.identity);
  packet.currentness.boundCandidateSha256 = packet.identity.candidateSha256;
  packet.independentReviewState.boundCandidateSha256 = packet.identity.candidateSha256;
  packet.activeReceiptManifest.controlPlane = clone(packet.identity);
  packet.activeReceiptManifest.controlPlaneSha256 = canonicalSha256(packet.identity);
  for (const binding of activeManifestBindings(packet.activeReceiptManifest)) {
    binding.controlPlaneSha256 = packet.activeReceiptManifest.controlPlaneSha256;
  }
  packet.activeReceiptManifest.manifestSha256 = computeActiveReceiptManifestSha256(
    packet.activeReceiptManifest,
  );
  refreshEvidenceHashes(packet);
  return packet;
}

function recomputeActiveBinding(packet, binding) {
  const projection = binding.resultBody.validationProjection;
  projection.validationReceiptSha256 = computeValidationReceiptSha256(
    projection.validationReceiptBody,
  );
  binding.resultBody.validationProjectionSha256 = canonicalSha256(projection);
  binding.resultSha256 = computeResultSha256(binding.resultBody);
  binding.artifactSha256 = computeReceiptArtifactSha256(
    binding.slot,
    binding.resultSha256,
    binding.controlPlaneSha256,
  );
  binding.bindingSha256 = computeBoundReceiptSha256(
    binding.slot,
    binding.artifactSha256,
    binding.controlPlaneSha256,
  );
  if (binding.slot === "deterministic") {
    packet.deterministic.receiptSha256 = binding.bindingSha256;
  }
  packet.activeReceiptManifest.manifestSha256 = computeActiveReceiptManifestSha256(
    packet.activeReceiptManifest,
  );
  refreshEvidenceHashes(packet);
  return packet;
}

function recomputeDPrimeValidationReceipt(packet) {
  const digest = computeDPrimeValidationReceiptSha256(
    packet.remediation.validationReceiptBody,
  );
  packet.remediation.validationReceiptSha256 = digest;
  packet.remediation.newReceiptBindings.dPrimeValidationReceiptSha256 = digest;
  refreshEvidenceHashes(packet);
  return packet;
}

function rebindExecutableManifest(live, label = "rebound-live-code") {
  const digest = computeExecutableCodeManifestSha256(
    live.packet.executableCodeManifest,
  );
  live.packet.identity.codeManifestSha256 = digest;
  applyActiveReceiptManifest(
    live.packet,
    buildActiveReceiptManifest(live.packet.identity, { label }),
  );
  live.packet.authorization.codeManifestSha256 = digest;
  live.packet.authorization.authorizationProjection.codeManifestSha256 = digest;
  live.packet.liveExecution.codeManifestSha256 = digest;
  live.packet.authorization.authorizationSha256 = computeAuthorizationSha256(
    live.packet.authorization.authorizationProjection,
  );
  rebindTrustAnchor(
    live.packet.authorization.authorizationTrustAnchor,
    live.packet.authorization.authorizationSha256,
  );
  live.runtimeEvidence.codeManifestSha256 = digest;
  refreshEvidenceHashes(live.packet);
  return live;
}

function rebindLiveRoles(live, allowedRoles, performedRoles) {
  live.packet.authorization.allowedRoles = [...allowedRoles];
  live.packet.authorization.authorizationProjection.allowedRoles = [...allowedRoles];
  live.packet.liveExecution.performedRoles = [...performedRoles];
  live.packet.authorization.authorizationSha256 = computeAuthorizationSha256(
    live.packet.authorization.authorizationProjection,
  );
  rebindTrustAnchor(
    live.packet.authorization.authorizationTrustAnchor,
    live.packet.authorization.authorizationSha256,
  );
  refreshEvidenceHashes(live.packet);
  return live;
}

async function withExecutableClosureRepository(options, callback) {
  const directory = await mkdtemp("/private/tmp/mais-rsi-code-closure-");
  const outsideDirectory = await mkdtemp("/private/tmp/mais-rsi-code-outside-");
  const runnerPath = "scripts/fixture-runner.mjs";
  const runnerBytes = options.runnerBytes ?? "export const fixtureOnly = true;\n";
  const packageBytes = '{"name":"fixture","private":true,"type":"module"}\n';
  const lockBytes = '{"name":"fixture","lockfileVersion":3,"packages":{}}\n';
  const modules = options.modules ?? [];
  try {
    await mkdir(path.join(directory, "scripts"), { recursive: true });
    await mkdir(path.join(directory, ".local"), { recursive: true });
    await writeFile(path.join(directory, ".gitignore"), ".local/\n", "utf8");
    await writeFile(path.join(directory, "package.json"), packageBytes, "utf8");
    await writeFile(path.join(directory, "package-lock.json"), lockBytes, "utf8");
    await writeFile(path.join(directory, runnerPath), runnerBytes, "utf8");
    await chmod(path.join(directory, runnerPath), 0o755);

    for (const module of modules) {
      const absolute = path.join(directory, module.path);
      await mkdir(path.dirname(absolute), { recursive: true });
      if (module.symlinkOutside === true) {
        const outside = path.join(outsideDirectory, path.basename(module.path));
        await writeFile(outside, module.bytes, "utf8");
        await symlink(outside, absolute);
      } else {
        await writeFile(absolute, module.bytes, "utf8");
      }
    }

    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "fixture@example.invalid"],
      ["config", "user.name", "Fixture"],
    ]) {
      const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const tracked = [
      ".gitignore",
      "package.json",
      "package-lock.json",
      runnerPath,
      ...modules.filter((module) => module.tracked !== false).map((module) => module.path),
    ];
    for (const args of [
      ["add", "--", ...tracked],
      ["commit", "-qm", "fixture executable closure"],
    ]) {
      const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const head = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: directory,
      encoding: "utf8",
    }).stdout.trim();
    const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directory,
      encoding: "utf8",
    }).stdout.trim();
    const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
    const omitted = new Set(options.omitFromManifest ?? []);
    const fileDescriptors = [
      {
        path: "package-lock.json",
        kind: "dependency-lock",
        mode: "100644",
        sha256: digest(lockBytes),
      },
      {
        path: "package.json",
        kind: "package-manifest",
        mode: "100644",
        sha256: digest(packageBytes),
      },
      {
        path: runnerPath,
        kind: "entrypoint",
        mode: "100755",
        sha256: digest(runnerBytes),
      },
      ...modules.map((module) => ({
        path: module.path,
        kind: "local-module",
        mode: "100644",
        sha256: digest(module.bytes),
      })),
    ]
      .filter((descriptor) => !omitted.has(descriptor.path))
      .sort((a, b) => a.path.localeCompare(b.path));
    const live = validLivePacket();
    live.packet.repository = { head, branch, clean: true };
    live.packet.executableCodeManifest = {
      manifestVersion: "1.0.0",
      manifestDomain: "mais-rsi-executable-code-manifest-v1",
      repositoryCommit: head,
      entrypoint: runnerPath,
      resolutionPolicy: options.resolutionPolicy ?? "static-esm-literal-require-v1",
      runtime: { engine: "node", version: process.version },
      files: fileDescriptors,
      unresolvedImports: [],
      computedDynamicImports: [],
      customLoaders: [],
    };
    live.packet.liveExecution.repositoryCommit = head;
    live.packet.liveExecution.runnerSha256 = digest(runnerBytes);
    live.packet.authorization.runnerSha256 = digest(runnerBytes);
    live.packet.authorization.authorizationProjection.repositoryCommit = head;
    live.packet.authorization.authorizationProjection.runnerSha256 = digest(runnerBytes);
    rebindExecutableManifest(live, options.label ?? "temp-static-closure");

    const packetRelative = options.packetRelative ?? ".local/packet.json";
    const packetPath = path.join(directory, packetRelative);
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(packetPath, JSON.stringify(live.packet), "utf8");
    if (typeof options.mutateAfterPacket === "function") {
      await options.mutateAfterPacket({ directory, packetPath });
    }
    const evidence = await collectLiveRuntimeEvidence(packetPath, live.packet);
    await callback({ directory, packetPath, live, evidence });
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(outsideDirectory, { recursive: true, force: true });
  }
}

test("--help is offline and exits 0", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /never\s+calls a provider/);
});

test("schema is self-contained and declares the corrected evidence axes", async () => {
  const schema = JSON.parse(await readFile(SCHEMA, "utf8"));
  assert.equal(schema.properties.schemaVersion.const, "1.0");
  for (const field of ["activeReceiptManifest", "independentReviewState", "proofBoundaries", "liveExecution"]) {
    assert.ok(schema.properties[field], `missing ${field}`);
  }
  assert.deepEqual(schema.$defs.proofBoundaries.required, [
    "localTest",
    "receipt",
    "trackedCommitted",
    "main",
    "ci",
    "deployment",
    "live",
  ]);
  assert.equal(schema.$defs.sourceIdentity.required.length, 1);
  assert.equal(schema.$defs.sourceIdentity.required[0], "logicalId");
  assert.ok(schema.$defs.sourceIdentity.properties.sha256);
  assert.ok(schema.$defs.sourceIdentity.properties.commit);
  assert.ok(schema.$defs.check.properties.evidenceRef);
  assert.ok(schema.$defs.receiptBinding.required.includes("resultBody"));
  assert.deepEqual(schema.$defs.resultBody.required, [
    "resultVersion",
    "slot",
    "status",
    "inspectionComplete",
    "findingsCount",
    "outputDigestSha256",
    "controlPlane",
    "controlPlaneSha256",
    "validationProjection",
    "validationProjectionSha256",
  ]);
  assert.ok(schema.$defs.trustAnchor.required.includes("receiptIdentitySha256"));
  assert.ok(schema.$defs.priorReceiptBindings.required.includes("priorEnvelopeBody"));
  assert.ok(schema.$defs.priorReceiptBindings.required.includes("priorTrustAnchor"));
  assert.equal(schema.$defs.sha256.not.const, createHash("sha256").update("").digest("hex"));
  assert.deepEqual(schema.$defs.authorityCode.enum, [
    "OFFLINE_AUDIT_AUTHORITY",
    "LIVE_AUTHORIZATION_RECEIPT",
  ]);
  assert.ok(schema.$defs.blockerCode.enum.length > 0);
  assert.deepEqual(schema.$defs.checkCode.enum, ["IDENTITY_BOUND", "REVIEW_COMPLETE"]);
  assert.deepEqual(schema.$defs.deviationCode.enum, [
    "DECLARED_DEVIATION",
    "STREAM_MODE_DEVIATION",
  ]);
  assert.ok(schema.$defs.c0TriggerCode.enum.includes("P1_SCHEMA_RISK"));
  assert.ok(schema["x-resolver-only-checks"].includes(
    "top-level finding-count equality with bound active result bodies",
  ));
  for (const field of [
    "skill",
    "mode",
    "evidenceClass",
    "resolvedState",
    "claimCeiling",
    "nextAllowedAction",
  ]) {
    assert.equal(schema.properties[field].type, "string", `${field} must state its common type`);
  }
  assert.equal(
    schema.$defs.dateTime.pattern,
    "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
  );
});

test("schema string-field inventory is closed and every broad common string has an RSI overlay", async () => {
  const schema = JSON.parse(await readFile(SCHEMA, "utf8"));
  const stringPaths = [];
  const opaqueRefPaths = [];
  function walk(value, pathName) {
    if (value === null || typeof value !== "object") return;
    const types = Array.isArray(value.type) ? value.type : [value.type];
    if (
      types.includes("string") ||
      typeof value.const === "string" ||
      (Array.isArray(value.enum) && value.enum.some((item) => typeof item === "string"))
    ) {
      stringPaths.push(pathName);
      assert.ok(
        typeof value.const === "string" ||
          Array.isArray(value.enum) ||
          typeof value.pattern === "string",
        `unclassified string schema at ${pathName}`,
      );
    }
    if (value.$ref === "#/$defs/opaqueId") opaqueRefPaths.push(pathName);
    for (const [key, child] of Object.entries(value)) {
      walk(child, `${pathName}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`);
    }
  }
  walk(schema, "$" );
  const expectedStringPaths = `
$/properties/schemaVersion
$/properties/skill
$/properties/mode
$/properties/evidenceClass
$/properties/resolvedState
$/properties/status
$/properties/machineDisposition
$/properties/claimCeiling
$/properties/nextAllowedAction
$/allOf/2/if/properties/status
$/allOf/2/then/oneOf/0/properties/evidenceClass
$/allOf/2/then/oneOf/0/properties/machineDisposition
$/allOf/2/then/oneOf/0/properties/nextAllowedAction
$/allOf/2/then/oneOf/1/properties/evidenceClass
$/allOf/2/then/oneOf/1/properties/machineDisposition
$/allOf/2/then/oneOf/1/properties/nextAllowedAction
$/allOf/2/then/oneOf/2/properties/evidenceClass
$/allOf/2/then/oneOf/2/properties/machineDisposition
$/allOf/2/then/oneOf/2/properties/nextAllowedAction
$/allOf/2/then/oneOf/3/properties/evidenceClass
$/allOf/2/then/oneOf/3/properties/machineDisposition
$/allOf/2/then/oneOf/3/properties/nextAllowedAction
$/allOf/2/then/properties/independentReviewState/properties/status
$/allOf/2/then/properties/proofBoundaries/properties/receipt/properties/status
$/allOf/2/then/properties/resolvedState
$/allOf/3/if/properties/status
$/allOf/3/then/properties/independentReviewState/properties/status
$/allOf/3/then/properties/machineDisposition
$/allOf/3/then/properties/nextAllowedAction
$/allOf/3/then/properties/proofBoundaries/properties/receipt/properties/status
$/allOf/3/then/properties/resolvedState
$/allOf/4/if/properties/status
$/allOf/4/then/properties/independentReviewState/properties/status
$/allOf/4/then/properties/machineDisposition
$/allOf/4/then/properties/nextAllowedAction
$/allOf/4/then/properties/proofBoundaries/properties/receipt/properties/status
$/allOf/4/then/properties/resolvedState
$/$defs/activeReceiptManifest/allOf/0/else/properties/c0Status
$/$defs/activeReceiptManifest/allOf/0/then/properties/c0Status
$/$defs/activeReceiptManifest/properties/c0Status
$/$defs/activeReceiptManifest/properties/manifestVersion
$/$defs/opaqueId
$/$defs/dateTime
$/$defs/sha256
$/$defs/sha256/not
$/$defs/commit
$/$defs/dPrimeC0State/oneOf/0/properties/status
$/$defs/dPrimeC0State/oneOf/1/properties/status
$/$defs/dPrimeValidationReceiptBody/properties/receiptDomain
$/$defs/dPrimeValidationReceiptBody/properties/receiptVersion
$/$defs/candidateId
$/$defs/evidenceId
$/$defs/authorizationId
$/$defs/runnerLogicalId
$/$defs/version
$/$defs/protocolId
$/$defs/providerId
$/$defs/modelId
$/$defs/authorityCode
$/$defs/blockerCode
$/$defs/checkCode
$/$defs/deviationCode
$/$defs/evidenceRef
$/$defs/executableCodeManifest/properties/manifestDomain
$/$defs/executableCodeManifest/properties/manifestVersion
$/$defs/executableCodeManifest/properties/resolutionPolicy
$/$defs/executableFile/properties/kind
$/$defs/executableFile/properties/mode
$/$defs/executablePath
$/$defs/executableRuntime/properties/engine
$/$defs/executableRuntime/properties/version
$/$defs/rsiRepositoryBranch
$/$defs/rsiSourceLogicalId
$/$defs/runnerPath
$/$defs/repository/properties/head
$/$defs/repository/properties/branch
$/$defs/sourceIdentity/properties/logicalId
$/$defs/sourceIdentity/properties/commit
$/$defs/authorization/oneOf/1/properties/credentialAccessScope
$/$defs/authorization/oneOf/1/properties/egressScope
$/$defs/authorization/oneOf/1/properties/privacyRightsScope
$/$defs/authorizationProjection/properties/credentialAccessScope
$/$defs/authorizationProjection/properties/egressScope
$/$defs/authorizationProjection/properties/privacyRightsScope
$/$defs/authorizationProjection/properties/projectionVersion
$/$defs/liveRole
$/$defs/deterministic/properties/status
$/$defs/bPrime/properties/status
$/$defs/c0RoleReceipt/properties/status
$/$defs/c0TriggerAssessment/properties/assessmentVersion
$/$defs/c0TriggerCode
$/$defs/c0Prime/oneOf/0/properties/status
$/$defs/c0Prime/oneOf/1/properties/status
$/$defs/independentReviewState/properties/status
$/$defs/independentReviewState/properties/reviewerRole
$/$defs/independentReviewState/allOf/0/if/properties/status
$/$defs/proofBoundary/properties/status
$/$defs/proofBoundary/allOf/0/if/properties/status
$/$defs/proofBoundary/allOf/1/if/properties/status
$/$defs/check/properties/id
$/$defs/check/properties/status
$/$defs/check/properties/evidenceRef
$/$defs/deviation/properties/status
$/$defs/priorEnvelopeBody/properties/c0Status
$/$defs/priorEnvelopeBody/properties/envelopeVersion
$/$defs/priorReceiptBindings/allOf/0/else/properties/c0Status
$/$defs/priorReceiptBindings/allOf/0/then/properties/c0Status
$/$defs/priorReceiptBindings/properties/c0Status
$/$defs/receiptSlot
$/$defs/resultBody/allOf/0/if/properties/slot
$/$defs/resultBody/properties/resultVersion
$/$defs/resultBody/properties/status
$/$defs/rsiEvidenceRef/oneOf/0
$/$defs/rsiEvidenceRef/oneOf/0/not
$/$defs/rsiEvidenceRef/oneOf/1
$/$defs/trustAnchor/properties/receiptKind
$/$defs/trustAnchor/properties/status
$/$defs/trustAnchor/properties/trustVersion
$/$defs/validationProjection/properties/projectionVersion
$/$defs/validationProjection/properties/status
$/$defs/validationReceiptBody/properties/parseStatus
$/$defs/validationReceiptBody/properties/projectionStatus
$/$defs/validationReceiptBody/properties/receiptDomain
$/$defs/validationReceiptBody/properties/receiptVersion
$/$defs/validationReceiptBody/properties/roleStatus
$/$defs/validationReceiptBody/properties/schemaStatus
$/$defs/validationReceiptBody/properties/taxonomyStatus
$/$defs/validationRole
$/$defs/validationSurfaceCoverage/properties/status
$/$defs/claimCeiling
`.trim().split("\n");
  assert.deepEqual(stringPaths.sort(), expectedStringPaths.sort());
  assert.deepEqual(opaqueRefPaths.sort(), [
    "$/$defs/authority/properties/missing/items",
    "$/$defs/authority/properties/proven/items",
    "$/$defs/authority/properties/required/items",
    "$/properties/blockers/items",
  ]);
  const overlay = schema.allOf[1].properties;
  assert.equal(overlay.sourceIdentity.items.properties.logicalId.$ref, "#/$defs/rsiSourceLogicalId");
  assert.equal(overlay.repository.properties.branch.oneOf[1].$ref, "#/$defs/rsiRepositoryBranch");
  assert.equal(overlay.authority.properties.required.items.$ref, "#/$defs/authorityCode");
  assert.equal(overlay.checks.items.properties.id.$ref, "#/$defs/checkCode");
  assert.equal(overlay.checks.items.properties.evidenceRef.$ref, "#/$defs/rsiEvidenceRef");
  assert.equal(overlay.blockers.items.$ref, "#/$defs/blockerCode");
});

test("valid packet with logicalId-only common source identity passes", async () => {
  const packet = validPacket();
  assert.deepEqual(packet.sourceIdentity, [
    { logicalId: `source-candidate-${hash("source-candidate").slice(0, 16)}` },
  ]);
  assert.deepEqual(validateMachineQaPacket(packet), []);
  await withTempFile(JSON.stringify(packet), async (file) => {
    const result = run(file);
    assert.equal(result.status, 0, result.stdout);
    const output = parseOutput(result);
    assert.equal(output.result, "valid");
    assert.equal(output.contract, "EvidenceEnvelopeV1+RSI-v2");
  });
});

test("old receipts cannot be rebound to a new candidate or control plane when mutation is declared false", () => {
  const candidateRebound = rebindControlPlaneWithoutReplacingReceipts(
    validPacket(),
    (identity) => {
      identity.candidateId = `candidate-${hash("rebound-candidate-id").slice(0, 16)}`;
      identity.candidateVersion = "2.0.1";
      identity.candidateSha256 = hash("rebound-candidate");
    },
  );
  assert.equal(candidateRebound.remediation.candidateMutated, false);
  assert.ok(
    issueCodes(candidateRebound).includes("ACTIVE_RECEIPT_BINDING_DIGEST_MISMATCH"),
  );

  const policyRebound = rebindControlPlaneWithoutReplacingReceipts(
    validPacket(),
    (identity) => {
      identity.policyVersion = "2.1.0";
      identity.protocolVersion = "2.1.0";
      identity.promptManifestSha256 = hash("rebound-prompt-manifest");
    },
  );
  assert.equal(policyRebound.remediation.candidateMutated, false);
  assert.ok(
    issueCodes(policyRebound).includes("ACTIVE_RECEIPT_BINDING_DIGEST_MISMATCH"),
  );

  const artifactRetained = rebindControlPlaneWithoutReplacingReceipts(
    validPacket(),
    (identity) => {
      identity.codeManifestSha256 = hash("rebound-code-manifest");
    },
  );
  for (const binding of activeManifestBindings(artifactRetained.activeReceiptManifest)) {
    binding.bindingSha256 = computeBoundReceiptSha256(
      binding.slot,
      binding.artifactSha256,
      binding.controlPlaneSha256,
    );
  }
  artifactRetained.deterministic.receiptSha256 =
    artifactRetained.activeReceiptManifest.bindings.deterministic.bindingSha256;
  artifactRetained.bPrime.critiqueReceiptSha256 =
    artifactRetained.activeReceiptManifest.bindings.bPrimeCritique.bindingSha256;
  artifactRetained.bPrime.revisionReceiptSha256 =
    artifactRetained.activeReceiptManifest.bindings.bPrimeRevision.bindingSha256;
  artifactRetained.independentReviewState.reviewReceiptSha256 =
    artifactRetained.activeReceiptManifest.bindings.independentReview.bindingSha256;
  artifactRetained.activeReceiptManifest.manifestSha256 = computeActiveReceiptManifestSha256(
    artifactRetained.activeReceiptManifest,
  );
  refreshEvidenceHashes(artifactRetained);
  assert.ok(
    issueCodes(artifactRetained).includes("ACTIVE_RECEIPT_ARTIFACT_DIGEST_MISMATCH"),
  );
});

test("closed result bodies prevent an old result digest from surviving a control-plane rebound", () => {
  const packet = rebindControlPlaneWithoutReplacingReceipts(
    validPacket(),
    (identity) => {
      identity.codeManifestSha256 = hash("result-body-rebound-code-manifest");
    },
  );
  const manifest = packet.activeReceiptManifest;
  for (const binding of activeManifestBindings(manifest)) {
    binding.resultBody.controlPlane = clone(manifest.controlPlane);
    binding.resultBody.controlPlaneSha256 = manifest.controlPlaneSha256;
    // Deliberately retain the old resultSha256 while recomputing every wrapper.
    binding.artifactSha256 = computeReceiptArtifactSha256(
      binding.slot,
      binding.resultSha256,
      binding.controlPlaneSha256,
    );
    binding.bindingSha256 = computeBoundReceiptSha256(
      binding.slot,
      binding.artifactSha256,
      binding.controlPlaneSha256,
    );
  }
  packet.deterministic.receiptSha256 = manifest.bindings.deterministic.bindingSha256;
  packet.bPrime.critiqueReceiptSha256 = manifest.bindings.bPrimeCritique.bindingSha256;
  packet.bPrime.revisionReceiptSha256 = manifest.bindings.bPrimeRevision.bindingSha256;
  packet.independentReviewState.reviewReceiptSha256 =
    manifest.bindings.independentReview.bindingSha256;
  manifest.manifestSha256 = computeActiveReceiptManifestSha256(manifest);
  refreshEvidenceHashes(packet);

  assert.ok(issueCodes(packet).includes("ACTIVE_RECEIPT_RESULT_DIGEST_MISMATCH"));
});

test("every active result binds a closed redacted validation projection and rejects SHA256 empty", () => {
  const packet = validPacket();
  for (const binding of activeManifestBindings(packet.activeReceiptManifest)) {
    assert.deepEqual(binding.resultBody.validationProjection.redaction, {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    });
    assert.equal(
      binding.resultBody.validationProjection.projectionManifestSha256,
      packet.identity.projectionManifestSha256,
    );
  }
  assert.deepEqual(validateMachineQaPacket(packet), []);

  const emptyDigest = createHash("sha256").update("", "utf8").digest("hex");
  const invalid = validPacket();
  invalid.activeReceiptManifest.bindings.deterministic.resultBody
    .validationProjection.validationReceiptSha256 = emptyDigest;
  assert.ok(issueCodes(invalid).includes("EMPTY_SHA256_FORBIDDEN"));
});

test("every active result carries a canonical validation receipt body", () => {
  const packet = validPacket();
  for (const binding of activeManifestBindings(packet.activeReceiptManifest)) {
    const projection = binding.resultBody.validationProjection;
    assert.ok(projection.validationReceiptBody, `${binding.slot} missing validation body`);
    assert.equal(
      projection.validationReceiptSha256,
      canonicalSha256({
        domain: "mais-rsi-active-validation-receipt-v1",
        body: projection.validationReceiptBody,
      }),
    );
    assert.equal(
      projection.validationReceiptBody.responseDigestSha256,
      binding.resultBody.outputDigestSha256,
    );
  }
  assert.deepEqual(validateMachineQaPacket(packet), []);
});

test("active validation receipt digests cannot reuse identity-domain hashes", () => {
  const packet = validPacket();
  const binding = packet.activeReceiptManifest.bindings.deterministic;
  binding.resultBody.validationProjection.validationReceiptSha256 =
    packet.identity.candidateSha256;
  binding.resultBody.validationProjectionSha256 = canonicalSha256(
    binding.resultBody.validationProjection,
  );
  binding.resultSha256 = computeResultSha256(binding.resultBody);
  binding.artifactSha256 = computeReceiptArtifactSha256(
    binding.slot,
    binding.resultSha256,
    binding.controlPlaneSha256,
  );
  binding.bindingSha256 = computeBoundReceiptSha256(
    binding.slot,
    binding.artifactSha256,
    binding.controlPlaneSha256,
  );
  packet.activeReceiptManifest.manifestSha256 = computeActiveReceiptManifestSha256(
    packet.activeReceiptManifest,
  );
  packet.deterministic.receiptSha256 = binding.bindingSha256;
  refreshEvidenceHashes(packet);

  assert.ok(
    issueCodes(packet).includes("ACTIVE_VALIDATION_RECEIPT_DOMAIN_COLLISION"),
  );
});

test("active validation receipt bodies require every successful validation axis", () => {
  const cases = [
    ["responseByteLength", (body) => { body.responseByteLength = 0; }, "ACTIVE_VALIDATION_RECEIPT_RESPONSE_EMPTY"],
    ["responseDigest", (body) => { body.responseDigestSha256 = hash("wrong-response"); }, "ACTIVE_VALIDATION_RECEIPT_RESPONSE_MISMATCH"],
    ["parse", (body) => { body.parseStatus = "failed"; }, "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED"],
    ["projection", (body) => { body.projectionStatus = "failed"; }, "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED"],
    ["schema", (body) => { body.schemaStatus = "failed"; }, "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED"],
    ["role", (body) => { body.roleStatus = "failed"; }, "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED"],
    ["taxonomy", (body) => { body.taxonomyStatus = "failed"; }, "ACTIVE_VALIDATION_RECEIPT_CHECK_NOT_PASSED"],
    ["expectedRole", (body) => { body.expectedRole = "b-prime-reviewer"; }, "ACTIVE_VALIDATION_RECEIPT_ROLE_MISMATCH"],
    ["observedRole", (body) => { body.observedRole = "b-prime-reviewer"; }, "ACTIVE_VALIDATION_RECEIPT_ROLE_MISMATCH"],
    ["schemaBinding", (body) => { body.evidenceSchemaVersion = "9.9.9"; }, "ACTIVE_VALIDATION_RECEIPT_SCHEMA_MISMATCH"],
    ["taxonomyBinding", (body) => { body.taxonomyVersion = "9.9.9"; }, "ACTIVE_VALIDATION_RECEIPT_TAXONOMY_MISMATCH"],
    ["controlPlaneBinding", (body) => { body.controlPlaneSha256 = hash("wrong-control-plane"); }, "ACTIVE_VALIDATION_RECEIPT_CONTROL_PLANE_MISMATCH"],
    ["surfaceCount", (body) => { body.surfaceCoverage.inspectedCount = 2; }, "ACTIVE_VALIDATION_RECEIPT_COVERAGE_MISMATCH"],
    ["surfaceSet", (body) => { body.surfaceCoverage.inspectedSurfaceSetSha256 = hash("wrong-surface-set"); }, "ACTIVE_VALIDATION_RECEIPT_COVERAGE_MISMATCH"],
    ["redaction", (body) => { body.redaction.rawProviderResponsesIncluded = true; }, "ACTIVE_VALIDATION_RECEIPT_REDACTION_MISMATCH"],
  ];
  for (const [name, mutate, expectedCode] of cases) {
    const packet = validPacket();
    const binding = packet.activeReceiptManifest.bindings.deterministic;
    mutate(binding.resultBody.validationProjection.validationReceiptBody);
    recomputeActiveBinding(packet, binding);
    assert.ok(issueCodes(packet).includes(expectedCode), `${name} was not blocked`);
  }
});

test("a fabricated active validation receipt digest is rejected after wrapper rehash", () => {
  const packet = validPacket();
  const binding = packet.activeReceiptManifest.bindings.deterministic;
  binding.resultBody.validationProjection.validationReceiptSha256 = hash(
    "fabricated-validation-receipt",
  );
  binding.resultBody.validationProjectionSha256 = canonicalSha256(
    binding.resultBody.validationProjection,
  );
  binding.resultSha256 = computeResultSha256(binding.resultBody);
  binding.artifactSha256 = computeReceiptArtifactSha256(
    binding.slot,
    binding.resultSha256,
    binding.controlPlaneSha256,
  );
  binding.bindingSha256 = computeBoundReceiptSha256(
    binding.slot,
    binding.artifactSha256,
    binding.controlPlaneSha256,
  );
  packet.activeReceiptManifest.manifestSha256 = computeActiveReceiptManifestSha256(
    packet.activeReceiptManifest,
  );
  packet.deterministic.receiptSha256 = binding.bindingSha256;
  refreshEvidenceHashes(packet);
  assert.ok(
    issueCodes(packet).includes("ACTIVE_VALIDATION_RECEIPT_DIGEST_MISMATCH"),
  );
});

test("common nullable repository shape is schema-valid but unresolved complete RSI evidence blocks", () => {
  const packet = validPacket();
  packet.repository = { head: null, branch: null, clean: null };
  assert.deepEqual(validatePacketSchema(packet), []);
  const codes = issueCodes(packet);
  assert.ok(codes.includes("REPOSITORY_HEAD_UNRESOLVED"));
  assert.ok(codes.includes("REPOSITORY_BRANCH_UNRESOLVED"));
  assert.ok(codes.includes("REPOSITORY_CLEAN_STATE_UNRESOLVED"));
});

test("unknown root property is rejected without echoing its key or value", async () => {
  const packet = validPacket();
  packet.unknownCanaryProperty = "UNKNOWN-CANARY-VALUE-734";
  await withTempFile(JSON.stringify(packet), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /unknownCanaryProperty|UNKNOWN-CANARY-VALUE-734/);
    assert.ok(parseOutput(result).issues.some((item) => item.code === "SCHEMA_UNKNOWN_PROPERTY"));
  });
});

test("schema-driven validator rejects unknown properties throughout nested contract objects", () => {
  const builders = [
    (packet) => packet.repository,
    (packet) => packet.sourceIdentity[0],
    (packet) => packet.authority,
    (packet) => packet.identity,
    (packet) => packet.activeReceiptManifest,
    (packet) => packet.activeReceiptManifest.controlPlane,
    (packet) => packet.activeReceiptManifest.bindings,
    (packet) => packet.activeReceiptManifest.bindings.deterministic,
    (packet) => packet.activeReceiptManifest.bindings.deterministic.resultBody,
    (packet) => packet.currentness,
    (packet) => packet.authorization,
    (packet) => packet.deterministic,
    (packet) => packet.bPrime,
    (packet) => packet.c0Prime,
    (packet) => packet.independentReviewState,
    (packet) => packet.proofBoundaries,
    (packet) => packet.proofBoundaries.localTest,
    (packet) => packet.checks[0],
    (packet) => {
      packet.deviations = [{ code: "DECLARED_DEVIATION", status: "open" }];
      return packet.deviations[0];
    },
    (packet) => packet.redaction,
    (packet) => packet.remediation,
  ];
  for (const locate of builders) {
    const packet = validPacket();
    locate(packet).unexpectedNestedCanary = 1;
    assert.ok(
      issueCodes(packet).includes("SCHEMA_UNKNOWN_PROPERTY"),
      "nested unknown property was accepted",
    );
  }
});

test("conditional live, C0, and D-prime object branches also reject unknown properties", () => {
  const live = validLivePacket();
  for (const locate of [
    (packet) => packet.authorization,
    (packet) => packet.authorization.authorizationProjection,
    (packet) => packet.authorization.authorizationTrustAnchor,
    (packet) => packet.liveExecution,
  ]) {
    const packet = clone(live.packet);
    locate(packet).unexpectedBranchCanary = 1;
    assert.ok(
      issueCodes(packet, { runtimeEvidence: live.runtimeEvidence }).includes(
        "SCHEMA_UNKNOWN_PROPERTY",
      ),
    );
  }

  const c0 = withRequiredC0(validPacket());
  c0.c0Prime.roles["answer-blind-solver"].unexpectedBranchCanary = 1;
  assert.ok(issueCodes(c0).includes("SCHEMA_UNKNOWN_PROPERTY"));

  for (const locate of [
    (packet) => packet.remediation.priorCandidate,
    (packet) => packet.remediation.priorReceiptBindings,
    (packet) => packet.remediation.priorReceiptBindings.priorEnvelopeBody,
    (packet) => packet.remediation.priorReceiptBindings.priorTrustAnchor,
    (packet) => packet.remediation.priorReceiptBindings.activeReceiptManifest,
    (packet) => packet.remediation.priorReceiptBindings.activeReceiptManifest.bindings.deterministic,
    (packet) => packet.remediation.newCandidate,
    (packet) => packet.remediation.newReceiptBindings,
  ]) {
    const packet = validMutatedPacket();
    locate(packet).unexpectedBranchCanary = 1;
    assert.ok(issueCodes(packet).includes("SCHEMA_UNKNOWN_PROPERTY"));
  }
});

test("deviations must contain closed objects, not primitive values", () => {
  const packet = validPacket();
  packet.deviations = [42];
  assert.ok(issueCodes(packet).includes("SCHEMA_TYPE_MISMATCH"));
});

test("C0 triggers must be unique uppercase codes", () => {
  const packet = withRequiredC0(validPacket());
  packet.c0Prime.triggers = [null];
  assert.ok(issueCodes(packet).includes("SCHEMA_TYPE_MISMATCH"));

  const duplicate = withRequiredC0(validPacket());
  duplicate.c0Prime.triggers = ["P0_ANSWER_RISK", "P0_ANSWER_RISK"];
  assert.ok(issueCodes(duplicate).includes("SCHEMA_ITEMS_NOT_UNIQUE"));
});

test("every code field uses its closed registry and rejects generalized approval or readiness claims", () => {
  const cases = [
    (packet) => { packet.authority.required = ["QA_READY"]; },
    (packet) => { packet.blockers = ["REVIEW_APPROVAL_GRANTED"]; },
    (packet) => { packet.checks[0].id = "CONTENT_READINESS_CONFIRMED"; },
    (packet) => { packet.checks[0].evidenceRef = "ref:CONTENT_READY"; },
    (packet) => { packet.deviations = [{ code: "PRODUCTION_APPROVAL", status: "open" }]; },
    (packet) => {
      withRequiredC0(packet);
      packet.c0Prime.triggers = ["RELEASE_READY"];
    },
  ];
  for (const mutate of cases) {
    const packet = validPacket();
    mutate(packet);
    const codes = issueCodes(packet);
    assert.ok(codes.includes("CODE_REGISTRY_INVALID"), codes.join(","));
    assert.ok(codes.includes("FORBIDDEN_APPROVAL_CLAIM"), codes.join(","));
  }

  const unknown = validPacket();
  unknown.checks[0].id = "UNKNOWN_WELL_FORMED_CHECK";
  assert.ok(issueCodes(unknown).includes("CODE_REGISTRY_INVALID"));
});

test("C0 requires the exact unique five-role set and distinct receipts", () => {
  const packet = withRequiredC0(validPacket());
  delete packet.c0Prime.roles["evidence-verifier"];
  const codes = issueCodes(packet);
  assert.ok(codes.includes("C0_FIVE_ROLE_SET_INCOMPLETE"));

  const duplicate = withRequiredC0(validPacket());
  duplicate.c0Prime.roles["evidence-verifier"].receiptSha256 =
    duplicate.c0Prime.roles["answer-blind-solver"].receiptSha256;
  const duplicateCodes = issueCodes(duplicate);
  assert.ok(duplicateCodes.includes("C0_ROLE_RECEIPT_REUSED"));
});

test("control-plane trigger assessment derives mandatory C0 for P0/P1 answer math coverage and schema risk", () => {
  const baseline = validPacket();
  assert.deepEqual(baseline.identity.c0TriggerAssessment, {
    assessmentVersion: "1.0.0",
    assessed: true,
    triggerCodes: [],
    c0Required: false,
  });

  for (const triggerCode of [
    "P0_ANSWER_RISK",
    "P1_MATH_RISK",
    "P0_COVERAGE_RISK",
    "P1_SCHEMA_RISK",
  ]) {
    const packet = validPacket();
    packet.identity.c0TriggerAssessment = {
      assessmentVersion: "1.0.0",
      assessed: true,
      triggerCodes: [triggerCode],
      c0Required: false,
    };
    const codes = issueCodes(packet);
    assert.ok(codes.includes("C0_TRIGGER_ASSESSMENT_MISMATCH"), codes.join(","));
    assert.ok(codes.includes("C0_TRIGGER_REQUIRES_FIVE_ROLE_REVIEW"), codes.join(","));
  }

  assert.deepEqual(validateMachineQaPacket(withRequiredC0(validPacket())), []);
});

test("schema-level hard gates match CLI semantics for C0, proof, and independent review", () => {
  const repeatedRoleArray = withRequiredC0(validPacket());
  repeatedRoleArray.c0Prime.roles = Array.from({ length: 5 }, (_, index) => ({
    role: "answer-blind-solver",
    status: "complete",
    inspectionComplete: true,
    receiptSha256: hash(`schema-old-array-${index}`),
  }));
  assert.ok(validatePacketSchema(repeatedRoleArray).length > 0);

  const nullPassedProof = validPacket();
  nullPassedProof.proofBoundaries.ci = { status: "passed", evidenceSha256: null };
  assert.ok(
    validatePacketSchema(nullPassedProof).some((issue) =>
      ["SCHEMA_TYPE_MISMATCH", "SCHEMA_ONE_OF_MISMATCH"].includes(issue.code),
    ),
  );

  const staleReviewContext = validPacket();
  staleReviewContext.independentReviewState.freshContext = false;
  assert.ok(
    validatePacketSchema(staleReviewContext).some((issue) => issue.code === "SCHEMA_CONST_MISMATCH"),
  );

  assert.deepEqual(validatePacketSchema(validPacket()), []);
});

test("passed independent review requires fresh context, exact candidate, and distinct receipt", () => {
  const notFresh = validPacket();
  notFresh.independentReviewState.freshContext = false;
  assert.ok(issueCodes(notFresh).includes("INDEPENDENT_REVIEW_NOT_FRESH"));

  const wrongCandidate = validPacket();
  wrongCandidate.independentReviewState.boundCandidateSha256 = hash("other-candidate");
  assert.ok(issueCodes(wrongCandidate).includes("INDEPENDENT_REVIEW_CANDIDATE_MISMATCH"));

  const reused = validPacket();
  reused.independentReviewState.reviewReceiptSha256 = reused.bPrime.revisionReceiptSha256;
  assert.ok(issueCodes(reused).includes("INDEPENDENT_REVIEW_RECEIPT_REUSED"));
});

test("each passed proof boundary requires its own non-null evidence hash", () => {
  const missing = validPacket();
  missing.proofBoundaries.ci = { status: "passed", evidenceSha256: null };
  assert.ok(issueCodes(missing).includes("PROOF_BOUNDARY_HASH_MISSING"));

  const reused = validPacket();
  reused.proofBoundaries.ci = {
    status: "passed",
    evidenceSha256: reused.proofBoundaries.localTest.evidenceSha256,
  };
  assert.ok(issueCodes(reused).includes("PROOF_BOUNDARY_HASH_REUSED"));
});

test("every sha256 check reference is covered by evidenceHashes", () => {
  const packet = validPacket();
  packet.checks[0].evidenceRef = `sha256:${hash("uncovered-check-evidence")}`;
  const codes = issueCodes(packet);
  assert.ok(codes.includes("CHECK_EVIDENCE_HASH_UNCOVERED"));
  assert.ok(codes.includes("EVIDENCE_HASH_COVERAGE_INCOMPLETE"));
});

test("all active review receipts are globally unique and proof hashes are disjoint", () => {
  const duplicateBPrime = validPacket();
  duplicateBPrime.bPrime.revisionReceiptSha256 = duplicateBPrime.bPrime.critiqueReceiptSha256;
  assert.ok(issueCodes(duplicateBPrime).includes("ACTIVE_RECEIPT_HASH_NOT_UNIQUE"));

  const c0ReusesDeterministic = withRequiredC0(validPacket());
  c0ReusesDeterministic.c0Prime.roles["tool-verifier"].receiptSha256 =
    c0ReusesDeterministic.deterministic.receiptSha256;
  assert.ok(issueCodes(c0ReusesDeterministic).includes("ACTIVE_RECEIPT_HASH_NOT_UNIQUE"));

  const proofReusesDeterministic = validPacket();
  proofReusesDeterministic.proofBoundaries.localTest.evidenceSha256 =
    proofReusesDeterministic.deterministic.receiptSha256;
  assert.ok(
    issueCodes(proofReusesDeterministic).includes("PROOF_HASH_REUSES_ACTIVE_RECEIPT"),
  );
});

test("top-level deterministic and B-prime finding counts equal their bound active result counts", () => {
  const deterministicMismatch = validPacket();
  deterministicMismatch.deterministic.findingsCount = 1;
  assert.ok(issueCodes(deterministicMismatch).includes("FINDING_COUNT_BINDING_MISMATCH"));

  const bPrimeMismatch = validPacket();
  bPrimeMismatch.bPrime.findingsCount = 1;
  assert.ok(issueCodes(bPrimeMismatch).includes("FINDING_COUNT_BINDING_MISMATCH"));

  assert.deepEqual(validateMachineQaPacket(validPacket()), []);
});

test("approval claim synonym is blocked and never echoed", async () => {
  const packet = validPacket();
  packet.machineDisposition = "approved-for-production";
  await withTempFile(JSON.stringify(packet), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /approved-for-production/);
    const codes = parseOutput(result).issues.map((item) => item.code);
    assert.ok(codes.includes("FORBIDDEN_APPROVAL_CLAIM"));
    assert.ok(codes.includes("SCHEMA_ENUM_MISMATCH"));
  });
});

test("rawProviderResponse singular is blocked without key or value disclosure", async () => {
  const packet = validPacket();
  packet.rawProviderResponse = "PROTECTED-PROVIDER-CANARY-91";
  await withTempFile(JSON.stringify(packet), async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /rawProviderResponse|PROTECTED-PROVIDER-CANARY-91/);
    const codes = parseOutput(result).issues.map((item) => item.code);
    assert.ok(codes.includes("UNSAFE_FIELD_PRESENT"));
    assert.ok(codes.includes("SCHEMA_UNKNOWN_PROPERTY"));
  });
});

test("malformed protected input exits 2 without disclosure", async () => {
  await withTempFile('{"rawProviderResponse":"MALFORMED-CANARY"', async (file) => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /rawProviderResponse|MALFORMED-CANARY/);
    assert.equal(parseOutput(result).issues[0].code, "JSON_MALFORMED");
  });
});

test("future observedAt and checkedAt are independently rejected", () => {
  const nowMs = Date.now();
  const futureObserved = validPacket(nowMs);
  futureObserved.observedAt = timestamp(nowMs + 5_000);
  assert.ok(issueCodes(futureObserved, { nowMs }).includes("OBSERVED_AT_IN_FUTURE"));

  const futureChecked = validPacket(nowMs);
  futureChecked.currentness.checkedAt = timestamp(nowMs + 5_000);
  assert.ok(issueCodes(futureChecked, { nowMs }).includes("CURRENTNESS_CHECK_IN_FUTURE"));
});

test("published timestamp schema accepts canonical UTC milliseconds only", () => {
  const canonical = validPacket();
  assert.deepEqual(validatePacketSchema(canonical), []);

  const noFraction = validPacket();
  noFraction.observedAt = "2026-08-27T01:02:03Z";
  assert.ok(validatePacketSchema(noFraction).some((issue) => issue.code === "SCHEMA_PATTERN_MISMATCH"));

  const offset = validPacket();
  offset.observedAt = "2026-08-27T09:02:03.000+08:00";
  assert.ok(validatePacketSchema(offset).some((issue) => issue.code === "SCHEMA_PATTERN_MISMATCH"));
});

test("nextAllowedAction accepts only positive bounded transitions", () => {
  const allowed = [
    validPacket(),
    Object.assign(validPacket(), {
      machineDisposition: "needs-repair",
      nextAllowedAction: "repair-candidate",
    }),
    Object.assign(validPacket(), {
      evidenceClass: "synthetic-calibration",
      nextAllowedAction: "record-calibration-result",
    }),
    Object.assign(validPacket(), {
      evidenceClass: "synthetic-calibration",
      machineDisposition: "needs-repair",
      nextAllowedAction: "revise-machine-qa-policy",
    }),
  ];
  for (const packet of allowed) assert.deepEqual(validatePacketSchema(packet), []);
  for (const forbidden of [
    "integration-review-approved",
    "production-ready",
    "release-ready",
  ]) {
    const packet = validPacket();
    packet.nextAllowedAction = forbidden;
    assert.ok(issueCodes(packet).includes("SCHEMA_ENUM_MISMATCH"));
    assert.ok(issueCodes(packet).includes("FORBIDDEN_APPROVAL_CLAIM"));
  }
});

test("complete packet transitions are evidence-class and disposition specific", () => {
  const exactMismatch = validPacket();
  exactMismatch.nextAllowedAction = "repair-candidate";
  assert.ok(issueCodes(exactMismatch).includes("STATE_TRANSITION_INVALID"));

  const syntheticA18Escalation = validPacket();
  syntheticA18Escalation.evidenceClass = "synthetic-calibration";
  syntheticA18Escalation.nextAllowedAction = "handoff-to-a18";
  assert.ok(issueCodes(syntheticA18Escalation).includes("STATE_TRANSITION_INVALID"));
});

test("the shared transition resolver closes the evidence/status/disposition/action/proof/review cross-product", () => {
  const classes = ["exact-package-machine-review", "synthetic-calibration"];
  const statuses = ["complete", "blocked", "invalid"];
  const dispositions = ["candidate-only", "needs-repair", "blocked"];
  const actions = [...NEXT_ALLOWED_ACTIONS];
  const proofStates = ["passed", "unverified"];
  const reviewStates = ["passed", "unverified"];
  const valid = new Set();
  const add = (evidenceClass, status, disposition, action, proof, review) => {
    valid.add(JSON.stringify([evidenceClass, status, disposition, action, proof, review]));
  };
  add(
    "exact-package-machine-review",
    "complete",
    "candidate-only",
    "handoff-to-a18",
    "passed",
    "passed",
  );
  add(
    "exact-package-machine-review",
    "complete",
    "needs-repair",
    "repair-candidate",
    "passed",
    "passed",
  );
  add(
    "synthetic-calibration",
    "complete",
    "candidate-only",
    "record-calibration-result",
    "passed",
    "passed",
  );
  add(
    "synthetic-calibration",
    "complete",
    "needs-repair",
    "revise-machine-qa-policy",
    "passed",
    "passed",
  );
  for (const evidenceClass of classes) {
    for (const action of [
      "renew-exact-authorization",
      "stop-blocked",
      "supply-missing-evidence",
    ]) {
      add(evidenceClass, "blocked", "blocked", action, "unverified", "unverified");
    }
    for (const action of ["revalidate-packet", "stop-blocked"]) {
      add(evidenceClass, "invalid", "blocked", action, "unverified", "unverified");
    }
  }

  for (const evidenceClass of classes) {
    for (const status of statuses) {
      for (const machineDisposition of dispositions) {
        for (const nextAllowedAction of actions) {
          for (const receiptProofStatus of proofStates) {
            for (const independentReviewStatus of reviewStates) {
              const key = JSON.stringify([
                evidenceClass,
                status,
                machineDisposition,
                nextAllowedAction,
                receiptProofStatus,
                independentReviewStatus,
              ]);
              const resolution = resolveMachineQaTransition({
                evidenceClass,
                status,
                machineDisposition,
                nextAllowedAction,
                receiptProofStatus,
                independentReviewStatus,
              });
              assert.equal(resolution.valid, valid.has(key), key);
              assert.equal(
                resolution.exitCode,
                valid.has(key) && status === "complete" ? 0 : 2,
                key,
              );
            }
          }
        }
      }
    }
  }
});

test("schema and semantic conditionals agree for every complete class/disposition/action tuple", () => {
  const expected = new Map([
    ["exact-package-machine-review:candidate-only", "handoff-to-a18"],
    ["exact-package-machine-review:needs-repair", "repair-candidate"],
    ["synthetic-calibration:candidate-only", "record-calibration-result"],
    ["synthetic-calibration:needs-repair", "revise-machine-qa-policy"],
  ]);
  for (const evidenceClass of [
    "exact-package-machine-review",
    "synthetic-calibration",
  ]) {
    for (const machineDisposition of ["candidate-only", "needs-repair"]) {
      for (const nextAllowedAction of NEXT_ALLOWED_ACTIONS) {
        const packet = validPacket();
        packet.evidenceClass = evidenceClass;
        packet.machineDisposition = machineDisposition;
        packet.nextAllowedAction = nextAllowedAction;
        const isExpected = expected.get(`${evidenceClass}:${machineDisposition}`) ===
          nextAllowedAction;
        const semanticCodes = issueCodes(packet);
        const schemaIssues = validatePacketSchema(packet);
        assert.equal(
          semanticCodes.includes("STATE_TRANSITION_INVALID"),
          !isExpected,
          `${evidenceClass}/${machineDisposition}/${nextAllowedAction}`,
        );
        assert.equal(
          schemaIssues.length === 0,
          isExpected,
          `${evidenceClass}/${machineDisposition}/${nextAllowedAction}`,
        );
      }
    }
  }
});

test("complete live packet enforces exact temporal order and role universe", () => {
  const nowMs = Date.now();
  const valid = validLivePacket(nowMs);
  assert.deepEqual(
    validateMachineQaPacket(valid.packet, { nowMs, runtimeEvidence: valid.runtimeEvidence }),
    [],
  );

  const futureIssued = validLivePacket(nowMs);
  futureIssued.packet.authorization.issuedAt = timestamp(nowMs + 5_000);
  assert.ok(
    issueCodes(futureIssued.packet, {
      nowMs,
      runtimeEvidence: futureIssued.runtimeEvidence,
    }).includes("LIVE_AUTHORIZATION_TEMPORAL_ORDER_INVALID"),
  );

  const invalidRole = validLivePacket(nowMs);
  invalidRole.packet.authorization.allowedRoles.push("rogue-reviewer");
  invalidRole.packet.liveExecution.performedRoles.push("rogue-reviewer");
  assert.ok(
    issueCodes(invalidRole.packet, {
      nowMs,
      runtimeEvidence: invalidRole.runtimeEvidence,
    }).includes("LIVE_ROLE_SET_INVALID"),
  );
});

test("performed live roles are the exact canonical review set while allowed roles may be a superset", () => {
  const allRoles = ["b-prime-reviewer", ...C0_ROLES];

  const allowedSuperset = validLivePacket();
  rebindLiveRoles(allowedSuperset, allRoles, ["b-prime-reviewer"]);
  assert.deepEqual(
    validateMachineQaPacket(allowedSuperset.packet, {
      runtimeEvidence: allowedSuperset.runtimeEvidence,
    }),
    [],
  );

  const extraPerformed = validLivePacket();
  rebindLiveRoles(extraPerformed, allRoles, allRoles);
  assert.ok(
    issueCodes(extraPerformed.packet, {
      runtimeEvidence: extraPerformed.runtimeEvidence,
    }).includes("LIVE_PERFORMED_ROLE_SET_MISMATCH"),
  );

  const exactC0 = validLivePacket();
  withRequiredC0(exactC0.packet);
  rebindLiveRoles(exactC0, allRoles, [...allRoles].reverse());
  assert.deepEqual(
    validateMachineQaPacket(exactC0.packet, {
      runtimeEvidence: exactC0.runtimeEvidence,
    }),
    [],
  );

  const missingC0Role = validLivePacket();
  withRequiredC0(missingC0Role.packet);
  rebindLiveRoles(missingC0Role, allRoles, allRoles.slice(0, -1));
  assert.ok(
    issueCodes(missingC0Role.packet, {
      runtimeEvidence: missingC0Role.runtimeEvidence,
    }).includes("LIVE_PERFORMED_ROLE_SET_MISMATCH"),
  );

  const duplicate = validLivePacket();
  rebindLiveRoles(
    duplicate,
    allRoles,
    ["b-prime-reviewer", "b-prime-reviewer"],
  );
  const duplicateCodes = issueCodes(duplicate.packet, {
    runtimeEvidence: duplicate.runtimeEvidence,
  });
  assert.ok(duplicateCodes.includes("SCHEMA_ITEMS_NOT_UNIQUE"));
  assert.ok(duplicateCodes.includes("LIVE_PERFORMED_ROLE_SET_MISMATCH"));
});

test("authorization caps and projection fields are tamper-evident under the declared digest", () => {
  const nowMs = Date.now();
  const live = validLivePacket(nowMs);
  live.packet.authorization.attemptCap += 1;
  live.packet.authorization.authorizationProjection.attemptCap += 1;
  assert.ok(
    issueCodes(live.packet, { nowMs, runtimeEvidence: live.runtimeEvidence }).includes(
      "LIVE_AUTHORIZATION_DIGEST_MISMATCH",
    ),
  );
});

test("a live authorization projection change cannot retain the old external receipt identity", () => {
  const nowMs = Date.now();
  const live = validLivePacket(nowMs);
  const anchor = live.packet.authorization.authorizationTrustAnchor;
  const oldReceiptIdentity = anchor.receiptIdentitySha256;
  live.packet.authorization.attemptCap += 1;
  live.packet.authorization.authorizationProjection.attemptCap += 1;
  live.packet.authorization.authorizationSha256 = computeAuthorizationSha256(
    live.packet.authorization.authorizationProjection,
  );
  anchor.boundReceiptSha256 = live.packet.authorization.authorizationSha256;
  refreshEvidenceHashes(live.packet);
  assert.ok(
    issueCodes(live.packet, { nowMs, runtimeEvidence: live.runtimeEvidence }).includes(
      "TRUST_ANCHOR_RECEIPT_IDENTITY_MISMATCH",
    ),
  );

  anchor.receiptIdentitySha256 = computeTrustReceiptIdentitySha256(anchor);
  refreshEvidenceHashes(live.packet);
  assert.notEqual(anchor.receiptIdentitySha256, oldReceiptIdentity);
  assert.deepEqual(
    validateMachineQaPacket(live.packet, { nowMs, runtimeEvidence: live.runtimeEvidence }),
    [],
  );

  const uncovered = validLivePacket(nowMs);
  const trustIdentity = uncovered.packet.authorization.authorizationTrustAnchor.receiptIdentitySha256;
  uncovered.packet.evidenceHashes = uncovered.packet.evidenceHashes.filter(
    (value) => value !== trustIdentity,
  );
  assert.ok(
    issueCodes(uncovered.packet, { nowMs, runtimeEvidence: uncovered.runtimeEvidence }).includes(
      "EVIDENCE_HASH_COVERAGE_INCOMPLETE",
    ),
  );
});

test("expired common and projected live authority cannot support a complete current packet", () => {
  const nowMs = Date.now();
  const live = validLivePacket(nowMs);
  const expiredAt = timestamp(nowMs - 500);
  live.packet.authority.expiresAt = expiredAt;
  live.packet.authorization.expiresAt = expiredAt;
  live.packet.authorization.authorizationProjection.expiresAt = expiredAt;
  live.packet.authorization.authorizationSha256 = computeAuthorizationSha256(
    live.packet.authorization.authorizationProjection,
  );
  refreshEvidenceHashes(live.packet);
  const codes = issueCodes(live.packet, { nowMs, runtimeEvidence: live.runtimeEvidence });
  assert.ok(codes.includes("AUTHORITY_EXPIRED"));
  assert.ok(codes.includes("AUTHORITY_TEMPORAL_ORDER_INVALID"));
  assert.ok(codes.includes("LIVE_AUTHORIZATION_TEMPORAL_ORDER_INVALID"));
});

test("live runner must match the current tracked repository runner", () => {
  const live = validLivePacket();
  live.runtimeEvidence.runnerSha256 = hash("modified-working-runner");
  assert.ok(
    issueCodes(live.packet, { runtimeEvidence: live.runtimeEvidence }).includes(
      "LIVE_RUNNER_HASH_NOT_CURRENT",
    ),
  );
});

test("a tracked hash-matching live runner must also be executable in HEAD and the working tree", () => {
  const live = validLivePacket();
  live.runtimeEvidence.runnerExecutable = false;
  live.runtimeEvidence.trackedRunnerExecutable = false;
  live.runtimeEvidence.trackedRunnerMode = "100644";
  assert.ok(
    issueCodes(live.packet, { runtimeEvidence: live.runtimeEvidence }).includes(
      "LIVE_RUNNER_NOT_EXECUTABLE",
    ),
  );
});

test("live execution runner identity must exactly match fresh authorization binding", () => {
  const live = validLivePacket();
  live.packet.liveExecution.runnerLogicalId = `runner-machineqa-${hash("other-runner").slice(0, 16)}`;
  assert.ok(
    issueCodes(live.packet, { runtimeEvidence: live.runtimeEvidence }).includes(
      "LIVE_RUNNER_AUTHORIZATION_BINDING_MISMATCH",
    ),
  );
});

test("live validation requires both declared and observed repository state to be clean", () => {
  const live = validLivePacket();
  live.packet.repository.clean = false;
  live.runtimeEvidence.repositoryClean = false;
  assert.ok(
    issueCodes(live.packet, { runtimeEvidence: live.runtimeEvidence }).includes(
      "LIVE_REPOSITORY_NOT_CLEAN",
    ),
  );
});

test("live validation binds one canonical executable code manifest across every plane", () => {
  const live = validLivePacket();
  const manifest = live.packet.executableCodeManifest;
  assert.ok(manifest);
  const digest = canonicalSha256({
    domain: "mais-rsi-executable-code-manifest-v1",
    body: manifest,
  });
  assert.equal(live.packet.identity.codeManifestSha256, digest);
  assert.equal(live.packet.authorization.codeManifestSha256, digest);
  assert.equal(
    live.packet.authorization.authorizationProjection.codeManifestSha256,
    digest,
  );
  assert.equal(live.packet.liveExecution.codeManifestSha256, digest);
  assert.equal(live.runtimeEvidence.codeManifestSha256, digest);
  assert.deepEqual(
    validateMachineQaPacket(live.packet, { runtimeEvidence: live.runtimeEvidence }),
    [],
  );
});

test("the executable manifest requires the repository package-lock contract, not an arbitrary support file", () => {
  const live = validLivePacket();
  live.packet.executableCodeManifest.files[0].path = "not-a-lock.txt";
  rebindExecutableManifest(live, "arbitrary-lockfile-rejected");
  assert.ok(
    issueCodes(live.packet, { runtimeEvidence: live.runtimeEvidence }).includes(
      "EXECUTABLE_CODE_MANIFEST_REQUIRED_FILES_INVALID",
    ),
  );
});

test("a clean exact recursive static ESM and literal-require closure is current", async () => {
  await withExecutableClosureRepository({
    runnerBytes: 'import { value } from "./helper.mjs";\nexport { value };\n',
    modules: [
      {
        path: "scripts/helper.mjs",
        bytes: 'const nested = require("./nested.cjs");\nexport const value = nested;\n',
      },
      {
        path: "scripts/nested.cjs",
        bytes: "module.exports = 1;\n",
      },
    ],
  }, async ({ live, evidence }) => {
    assert.equal(evidence.available, true);
    assert.equal(evidence.repositoryClean, true);
    assert.equal(evidence.packetInputQuarantined, true);
    assert.equal(evidence.codeManifestCurrent, true);
    assert.equal(evidence.codeManifestClosureValid, true);
    assert.deepEqual(
      validateMachineQaPacket(live.packet, { runtimeEvidence: evidence }),
      [],
    );
  });
});

test("a packet outside the repository is accepted only against the matching clean repository cwd", async () => {
  const packetDirectory = await mkdtemp("/private/tmp/mais-rsi-outside-packet-");
  try {
    await withExecutableClosureRepository({
      resolutionPolicy: "standalone-bundle-v1",
    }, async ({ directory, live }) => {
      const packetPath = path.join(packetDirectory, "packet.json");
      await writeFile(packetPath, JSON.stringify(live.packet), "utf8");
      const result = spawnSync(process.execPath, [SCRIPT, packetPath], {
        cwd: directory,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stdout);
    });
  } finally {
    await rm(packetDirectory, { recursive: true, force: true });
  }
});

test("runtime closure discovery fails closed across mutable and non-static dependency paths", async (t) => {
  const cases = [
    {
      name: "manifest omission",
      options: {
        runnerBytes: 'import "./helper.mjs";\n',
        modules: [{ path: "scripts/helper.mjs", bytes: "export const x = 1;\n" }],
        omitFromManifest: ["scripts/helper.mjs"],
      },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "computed dynamic import",
      options: {
        runnerBytes: 'const target = "./helper.mjs";\nexport const load = () => import(target);\n',
        modules: [{ path: "scripts/helper.mjs", bytes: "export const x = 1;\n" }],
      },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "unresolved local import",
      options: { runnerBytes: 'import "./missing.mjs";\n' },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "custom loader registration",
      options: {
        runnerBytes:
          'import { register } from "node:module";\nregister("./loader.mjs", import.meta.url);\n',
        modules: [{ path: "scripts/loader.mjs", bytes: "export const initialize = () => {};\n" }],
      },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "ignored untracked imported helper",
      options: {
        runnerBytes: 'import "../.local/helper.mjs";\n',
        modules: [
          {
            path: ".local/helper.mjs",
            bytes: "export const ignored = true;\n",
            tracked: false,
          },
        ],
      },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "tracked symlink escape",
      options: {
        runnerBytes: 'import "./helper.mjs";\n',
        modules: [
          {
            path: "scripts/helper.mjs",
            bytes: "export const outside = true;\n",
            symlinkOutside: true,
          },
        ],
      },
      expected: ["EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN"],
    },
    {
      name: "dirty imported helper",
      options: {
        runnerBytes: 'import "./helper.mjs";\n',
        modules: [{ path: "scripts/helper.mjs", bytes: "export const x = 1;\n" }],
        mutateAfterPacket: async ({ directory }) => {
          await writeFile(
            path.join(directory, "scripts/helper.mjs"),
            "export const x = 2;\n",
            "utf8",
          );
        },
      },
      expected: [
        "EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN",
        "LIVE_REPOSITORY_NOT_CLEAN",
      ],
    },
    {
      name: "dirty dependency lock",
      options: {
        runnerBytes: "export const cleanRunner = true;\n",
        mutateAfterPacket: async ({ directory }) => {
          await writeFile(
            path.join(directory, "package-lock.json"),
            '{"name":"fixture","lockfileVersion":3,"packages":{"dirty":{}}}\n',
            "utf8",
          );
        },
      },
      expected: [
        "EXECUTABLE_CODE_MANIFEST_CLOSURE_UNPROVEN",
        "LIVE_REPOSITORY_NOT_CLEAN",
      ],
    },
    {
      name: "unignored packet input",
      options: {
        runnerBytes: "export const cleanRunner = true;\n",
        packetRelative: "packet.json",
      },
      expected: [
        "LIVE_PACKET_INPUT_NOT_QUARANTINED",
        "LIVE_REPOSITORY_NOT_CLEAN",
      ],
    },
  ];
  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      await withExecutableClosureRepository(fixture.options, async ({ live, evidence }) => {
        const codes = issueCodes(live.packet, { runtimeEvidence: evidence });
        for (const code of fixture.expected) {
          assert.ok(codes.includes(code), `${fixture.name} missing ${code}: ${codes.join(",")}`);
        }
      });
    });
  }
});

test("manifest currentness and path-set shape remain tamper evident", () => {
  const staleBody = validLivePacket();
  staleBody.packet.executableCodeManifest.runtime.version = "v0.0.0";
  const staleCodes = issueCodes(staleBody.packet, {
    runtimeEvidence: staleBody.runtimeEvidence,
  });
  assert.ok(staleCodes.includes("EXECUTABLE_CODE_MANIFEST_DIGEST_MISMATCH"));
  assert.ok(staleCodes.includes("EXECUTABLE_CODE_MANIFEST_RUNTIME_MISMATCH"));

  for (const mutate of [
    (manifest) => manifest.files.reverse(),
    (manifest) => manifest.files.push({ ...manifest.files[0], sha256: hash("duplicate-path") }),
    (manifest) => { manifest.files[0].path = "../package-lock.json"; },
  ]) {
    const malformed = validLivePacket();
    mutate(malformed.packet.executableCodeManifest);
    rebindExecutableManifest(malformed, "malformed-code-path-set");
    assert.ok(
      issueCodes(malformed.packet, { runtimeEvidence: malformed.runtimeEvidence }).includes(
        "EXECUTABLE_CODE_MANIFEST_PATH_SET_INVALID",
      ),
    );
  }
});

test("live CLI verifies a repo-relative tracked runner without executing it", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-live-runner-test-"));
  try {
    await mkdir(path.join(directory, "scripts"));
    const runnerBytes = "export const fixtureOnly = true;\n";
    const markdownBytes = "# Documentation fixture only\n";
    const packageBytes = '{"name":"fixture","private":true,"type":"module"}\n';
    const lockBytes = '{"name":"fixture","lockfileVersion":3,"packages":{}}\n';
    await writeFile(path.join(directory, "scripts", "fixture-runner.mjs"), runnerBytes, "utf8");
    await chmod(path.join(directory, "scripts", "fixture-runner.mjs"), 0o755);
    await writeFile(path.join(directory, "notes.md"), markdownBytes, "utf8");
    await writeFile(path.join(directory, "package.json"), packageBytes, "utf8");
    await writeFile(path.join(directory, "package-lock.json"), lockBytes, "utf8");
    await writeFile(path.join(directory, ".gitignore"), ".local/\n", "utf8");
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "fixture@example.invalid"],
      ["config", "user.name", "Fixture"],
      ["add", ".gitignore", "package.json", "package-lock.json", "scripts/fixture-runner.mjs", "notes.md"],
      ["commit", "-qm", "fixture runner"],
    ]) {
      const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).stdout.trim();
    const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directory,
      encoding: "utf8",
    }).stdout.trim();
    const live = validLivePacket();
    live.packet.repository = { head, branch, clean: true };
    const runnerSha256 = createHash("sha256").update(runnerBytes).digest("hex");
    const executableCodeManifest = {
      manifestVersion: "1.0.0",
      manifestDomain: "mais-rsi-executable-code-manifest-v1",
      repositoryCommit: head,
      entrypoint: "scripts/fixture-runner.mjs",
      resolutionPolicy: "standalone-bundle-v1",
      runtime: { engine: "node", version: process.version },
      files: [
        {
          path: "package-lock.json",
          kind: "dependency-lock",
          mode: "100644",
          sha256: createHash("sha256").update(lockBytes).digest("hex"),
        },
        {
          path: "package.json",
          kind: "package-manifest",
          mode: "100644",
          sha256: createHash("sha256").update(packageBytes).digest("hex"),
        },
        {
          path: "scripts/fixture-runner.mjs",
          kind: "entrypoint",
          mode: "100755",
          sha256: runnerSha256,
        },
      ],
      unresolvedImports: [],
      computedDynamicImports: [],
      customLoaders: [],
    };
    const codeManifestSha256 = canonicalSha256({
      domain: "mais-rsi-executable-code-manifest-v1",
      body: executableCodeManifest,
    });
    live.packet.identity.codeManifestSha256 = codeManifestSha256;
    applyActiveReceiptManifest(
      live.packet,
      buildActiveReceiptManifest(live.packet.identity, { label: "live-repository" }),
    );
    live.packet.executableCodeManifest = executableCodeManifest;
    live.packet.liveExecution.repositoryCommit = head;
    live.packet.liveExecution.codeManifestSha256 = codeManifestSha256;
    live.packet.liveExecution.runnerSha256 = runnerSha256;
    live.packet.authorization.codeManifestSha256 = codeManifestSha256;
    live.packet.authorization.runnerSha256 = live.packet.liveExecution.runnerSha256;
    live.packet.authorization.authorizationProjection.repositoryCommit = head;
    live.packet.authorization.authorizationProjection.codeManifestSha256 =
      codeManifestSha256;
    live.packet.authorization.authorizationProjection.runnerSha256 = live.packet.liveExecution.runnerSha256;
    live.packet.authorization.authorizationSha256 = computeAuthorizationSha256(
      live.packet.authorization.authorizationProjection,
    );
    rebindTrustAnchor(
      live.packet.authorization.authorizationTrustAnchor,
      live.packet.authorization.authorizationSha256,
    );
    refreshEvidenceHashes(live.packet);
    await mkdir(path.join(directory, ".local"));
    const packetPath = path.join(directory, ".local", "packet.json");
    await writeFile(packetPath, JSON.stringify(live.packet), "utf8");
    const evidence = await collectLiveRuntimeEvidence(packetPath, live.packet);
    assert.equal(evidence.available, true);
    assert.deepEqual(validateMachineQaPacket(live.packet, { runtimeEvidence: evidence }), []);
    const result = run(packetPath);
    assert.equal(result.status, 0, result.stdout);

    const markdown = clone(live.packet);
    markdown.liveExecution.runnerPath = "notes.md";
    markdown.authorization.runnerPath = "notes.md";
    markdown.liveExecution.runnerSha256 = createHash("sha256").update(markdownBytes).digest("hex");
    markdown.authorization.runnerSha256 = markdown.liveExecution.runnerSha256;
    markdown.authorization.authorizationProjection.runnerPath = "notes.md";
    markdown.authorization.authorizationProjection.runnerSha256 = markdown.liveExecution.runnerSha256;
    markdown.authorization.authorizationSha256 = computeAuthorizationSha256(
      markdown.authorization.authorizationProjection,
    );
    rebindTrustAnchor(
      markdown.authorization.authorizationTrustAnchor,
      markdown.authorization.authorizationSha256,
    );
    refreshEvidenceHashes(markdown);
    await writeFile(packetPath, JSON.stringify(markdown), "utf8");
    const markdownEvidence = await collectLiveRuntimeEvidence(packetPath, markdown);
    const markdownCodes = issueCodes(markdown, { runtimeEvidence: markdownEvidence });
    assert.ok(markdownCodes.includes("SCHEMA_PATTERN_MISMATCH"));
    assert.ok(markdownCodes.includes("LIVE_RUNNER_PATH_INVALID"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("D-prime accepts a fully rebound new candidate and rejects stale old top-level receipts", () => {
  const valid = validMutatedPacket();
  assert.deepEqual(validateMachineQaPacket(valid), []);

  const stale = validMutatedPacket();
  const oldReceipt = stale.remediation.invalidatedReceiptHashes[0];
  stale.evidenceHashes = stale.evidenceHashes.filter(
    (value) => value !== stale.deterministic.receiptSha256,
  );
  stale.deterministic.receiptSha256 = oldReceipt;
  stale.remediation.newReceiptBindings.deterministicReceiptSha256 = oldReceipt;
  stale.evidenceHashes.push(oldReceipt);
  assert.ok(issueCodes(stale).includes("REMEDIATION_STALE_RECEIPT_REUSED"));

  const invalidatedStillActive = validMutatedPacket();
  invalidatedStillActive.evidenceHashes.push(
    invalidatedStillActive.remediation.invalidatedReceiptHashes[0],
  );
  assert.ok(
    issueCodes(invalidatedStillActive).includes("REMEDIATION_INVALIDATED_HASH_STILL_ACTIVE"),
  );
});

test("B-prime binds critique before fresh revision and D-prime uses a fresh disjoint validation receipt", () => {
  const packet = validPacket();
  assert.equal(packet.bPrime.critiqueThenRevision, true);
  assert.equal(packet.bPrime.freshContext, true);
  assert.equal(
    packet.bPrime.revisionPredecessorReceiptSha256,
    packet.bPrime.critiqueReceiptSha256,
  );
  assert.equal(
    packet.activeReceiptManifest.bindings.bPrimeRevision.resultBody
      .predecessorReceiptSha256,
    packet.bPrime.critiqueReceiptSha256,
  );

  const brokenSequence = validPacket();
  brokenSequence.bPrime.revisionPredecessorReceiptSha256 = hash("wrong-b-prime-predecessor");
  assert.ok(issueCodes(brokenSequence).includes("B_PRIME_PREDECESSOR_MISMATCH"));

  const remediated = validMutatedPacket();
  assert.equal(remediated.remediation.freshContext, true);
  assert.equal(
    remediated.remediation.validationReceiptSha256,
    remediated.remediation.newReceiptBindings.dPrimeValidationReceiptSha256,
  );
  assert.deepEqual(validateMachineQaPacket(remediated), []);

  const staleContext = validMutatedPacket();
  staleContext.remediation.freshContext = false;
  assert.ok(issueCodes(staleContext).includes("REMEDIATION_NOT_FRESH"));

  const reused = validMutatedPacket();
  reused.remediation.validationReceiptSha256 = reused.independentReviewState.reviewReceiptSha256;
  reused.remediation.newReceiptBindings.dPrimeValidationReceiptSha256 =
    reused.remediation.validationReceiptSha256;
  assert.ok(issueCodes(reused).includes("REMEDIATION_VALIDATION_RECEIPT_REUSED"));
});

test("D-prime binds a canonical validation receipt body to the complete transition", () => {
  const packet = validMutatedPacket();
  const body = packet.remediation.validationReceiptBody;
  assert.ok(body);
  assert.equal(
    packet.remediation.validationReceiptSha256,
    canonicalSha256({
      domain: "mais-rsi-d-prime-validation-receipt-v1",
      body,
    }),
  );
  assert.deepEqual(body.priorCandidate, packet.remediation.priorCandidate);
  assert.deepEqual(body.newCandidate, packet.remediation.newCandidate);
  assert.equal(
    body.priorActiveReceiptManifestSha256,
    packet.remediation.priorReceiptBindings.activeReceiptManifestSha256,
  );
  assert.equal(
    body.currentActiveReceiptManifestSha256,
    packet.activeReceiptManifest.manifestSha256,
  );
  assert.deepEqual(validateMachineQaPacket(packet), []);
});

test("D-prime validation receipt digest cannot reuse identity-domain hashes", () => {
  const packet = validMutatedPacket();
  packet.remediation.validationReceiptSha256 = packet.identity.candidateSha256;
  packet.remediation.newReceiptBindings.dPrimeValidationReceiptSha256 =
    packet.identity.candidateSha256;
  refreshEvidenceHashes(packet);
  assert.ok(
    issueCodes(packet).includes("REMEDIATION_VALIDATION_RECEIPT_DIGEST_MISMATCH"),
  );
  assert.ok(
    issueCodes(packet).includes("REMEDIATION_VALIDATION_RECEIPT_DOMAIN_COLLISION"),
  );
});

test("D-prime validation receipt body binds every transition component", () => {
  const cases = [
    ["priorCandidate", (body) => { body.priorCandidate.sha256 = hash("wrong-prior-candidate"); }, "REMEDIATION_VALIDATION_RECEIPT_PRIOR_CANDIDATE_MISMATCH"],
    ["newCandidate", (body) => { body.newCandidate.sha256 = hash("wrong-new-candidate"); }, "REMEDIATION_VALIDATION_RECEIPT_NEW_CANDIDATE_MISMATCH"],
    ["priorManifest", (body) => { body.priorActiveReceiptManifestSha256 = hash("wrong-prior-manifest"); }, "REMEDIATION_VALIDATION_RECEIPT_MANIFEST_MISMATCH"],
    ["currentManifest", (body) => { body.currentActiveReceiptManifestSha256 = hash("wrong-current-manifest"); }, "REMEDIATION_VALIDATION_RECEIPT_MANIFEST_MISMATCH"],
    ["invalidatedSet", (body) => { body.invalidatedReceiptSetSha256 = hash("wrong-invalidated-set"); }, "REMEDIATION_VALIDATION_RECEIPT_SET_MISMATCH"],
    ["currentSet", (body) => { body.currentActiveReceiptSetSha256 = hash("wrong-current-set"); }, "REMEDIATION_VALIDATION_RECEIPT_SET_MISMATCH"],
    ["deterministic", (body) => { body.deterministicReceiptSha256 = hash("wrong-deterministic"); }, "REMEDIATION_VALIDATION_RECEIPT_BINDING_MISMATCH"],
    ["bPrime", (body) => { body.bPrime.revisionPredecessorReceiptSha256 = hash("wrong-predecessor"); }, "REMEDIATION_VALIDATION_RECEIPT_B_PRIME_MISMATCH"],
    ["c0", (body) => { body.c0Prime.status = "complete"; }, "REMEDIATION_VALIDATION_RECEIPT_C0_MISMATCH"],
    ["independentReview", (body) => { body.independentReviewReceiptSha256 = hash("wrong-independent"); }, "REMEDIATION_VALIDATION_RECEIPT_BINDING_MISMATCH"],
    ["freshContext", (body) => { body.freshContext = false; }, "REMEDIATION_VALIDATION_RECEIPT_NOT_FRESH"],
    ["redaction", (body) => { body.redaction.protectedContentIncluded = true; }, "REMEDIATION_VALIDATION_RECEIPT_REDACTION_MISMATCH"],
  ];
  for (const [name, mutate, expectedCode] of cases) {
    const packet = validMutatedPacket();
    mutate(packet.remediation.validationReceiptBody);
    recomputeDPrimeValidationReceipt(packet);
    assert.ok(issueCodes(packet).includes(expectedCode), `${name} was not blocked`);
  }
});

test("a different prior evidence source has a different externally compared receipt identity", () => {
  const packet = validMutatedPacket();
  const anchor = packet.remediation.priorReceiptBindings.priorTrustAnchor;
  const oldReceiptIdentity = anchor.receiptIdentitySha256;
  anchor.externalReceiptSha256 = hash("replacement-prior-external-receipt");
  refreshEvidenceHashes(packet);
  assert.ok(issueCodes(packet).includes("TRUST_ANCHOR_RECEIPT_IDENTITY_MISMATCH"));

  anchor.receiptIdentitySha256 = computeTrustReceiptIdentitySha256(anchor);
  refreshEvidenceHashes(packet);
  assert.notEqual(anchor.receiptIdentitySha256, oldReceiptIdentity);
  assert.deepEqual(validateMachineQaPacket(packet), []);

  const uncovered = validMutatedPacket();
  const trustIdentity =
    uncovered.remediation.priorReceiptBindings.priorTrustAnchor.receiptIdentitySha256;
  uncovered.evidenceHashes = uncovered.evidenceHashes.filter((value) => value !== trustIdentity);
  assert.ok(issueCodes(uncovered).includes("EVIDENCE_HASH_COVERAGE_INCOMPLETE"));
});

test("D-prime invalidation set must exactly cover every authoritative prior active receipt", () => {
  const packet = validMutatedPacket();
  const omitted = packet.remediation.priorReceiptBindings.deterministicReceiptSha256;
  packet.remediation.invalidatedReceiptHashes =
    packet.remediation.invalidatedReceiptHashes.filter((value) => value !== omitted);
  packet.remediation.newReceiptBindings.deterministicReceiptSha256 = omitted;
  packet.deterministic.receiptSha256 = packet.remediation.newReceiptBindings.deterministicReceiptSha256;
  packet.evidenceHashes = packet.evidenceHashes.filter((value) => value !== hash("deterministic"));
  packet.evidenceHashes.push(packet.deterministic.receiptSha256);
  const codes = issueCodes(packet);
  assert.ok(codes.includes("REMEDIATION_INVALIDATION_SET_MISMATCH"));
  assert.ok(codes.includes("REMEDIATION_STALE_RECEIPT_REUSED"));
  assert.ok(packet.evidenceHashes.includes(omitted));
});

test("D-prime prior C0 state is closed and cannot omit an active prior role receipt", () => {
  const packet = validMutatedPacket();
  const role = "evidence-verifier";
  const omitted = packet.remediation.priorReceiptBindings.c0RoleReceipts[role];
  delete packet.remediation.priorReceiptBindings.c0RoleReceipts[role];
  delete packet.remediation.priorReceiptBindings.activeReceiptManifest.bindings.c0Roles[role];
  packet.remediation.invalidatedReceiptHashes =
    packet.remediation.invalidatedReceiptHashes.filter((hashValue) => hashValue !== omitted);
  packet.remediation.priorReceiptBindings.activeReceiptManifest.manifestSha256 =
    computeActiveReceiptManifestSha256(
      packet.remediation.priorReceiptBindings.activeReceiptManifest,
    );
  packet.remediation.priorReceiptBindings.activeReceiptManifestSha256 =
    packet.remediation.priorReceiptBindings.activeReceiptManifest.manifestSha256;
  const codes = issueCodes(packet);
  assert.ok(codes.some((code) => ["SCHEMA_REQUIRED_MISSING", "SCHEMA_ONE_OF_MISMATCH"].includes(code)));
  assert.ok(codes.includes("ACTIVE_RECEIPT_SLOT_SET_MISMATCH"));
});

test("D-prime rejects a covered check reference to an invalidated prior receipt", () => {
  const packet = validMutatedPacket();
  const invalidated = packet.remediation.invalidatedReceiptHashes[0];
  packet.checks[0].evidenceRef = `sha256:${invalidated}`;
  packet.evidenceHashes.push(invalidated);
  const codes = issueCodes(packet);
  assert.ok(codes.includes("REMEDIATION_INVALIDATED_HASH_STILL_ACTIVE"));
  assert.ok(!codes.includes("CHECK_EVIDENCE_HASH_UNCOVERED"));
});
