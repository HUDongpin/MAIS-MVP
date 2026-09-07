import assert from "node:assert/strict";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createPromotionTestSiblingSymlink, createPromotionTestTempDir } from "./promotion-test-temp.mjs";
import * as promotionDiscovery from "./discover-promotion-gate.mjs";
import {
  buildRepositoryValidatedReleaseHandoff,
  discoverNativePromotionContext,
  discoverPromotionGate,
  fingerprint,
  parsePromotionWorkflow,
  readJsonArtifactAtCommit,
  sha256,
  summarizeVerifiedReceipt,
  snapshotAuthoritativeState,
  strictJsonParse,
  validateJsonSchema,
  validateRepositoryBackedReleaseHandoff,
} from "./discover-promotion-gate.mjs";
import { fullReceiptTestSchema, makeFullReceipt, unsafeRehashReceipt } from "./promotion-receipt.test-helper.mjs";

const HEAD = "e".repeat(40);
const SOURCE = "1".repeat(40);
const BASELINE = "2".repeat(40);
const RELEASE = "3".repeat(40);
const EXECUTION = HEAD;
const EVIDENCE_COMMIT = "6".repeat(40);
const BINDING_COMMIT = "7".repeat(40);
const OLD_BASELINE = "5".repeat(40);
const CANDIDATE = "a".repeat(64);
const CHECKER_VERSION = "promotion-gate-shadow-fixture";

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function put(root, relativePath, value) {
  const absolute = join(root, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  const bytes = typeof value === "string" ? Buffer.from(value, "utf8") : jsonBytes(value);
  await writeFile(absolute, bytes);
  return { path: relativePath, bytes, rawSha256: sha256(bytes) };
}

function simpleSchema(schemaVersion) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: ["schemaVersion"],
    properties: { schemaVersion: { const: schemaVersion } },
    additionalProperties: true,
  };
}

function bindingFromManifest(manifest) {
  return {
    gateId: manifest.gateId,
    pilotUnitId: manifest.pilotUnitId,
    attemptId: manifest.attemptId,
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
    parentPackageId: manifest.parentPackage.id,
    parentPackageStatus: "candidate-only",
    liveAllowed: false,
  };
}

function receiptFor(manifest, manifestPath, manifestSha256, checkerFacts, runId = "fixture-canonical", executionCommit = EXECUTION) {
  return makeFullReceipt(runId, (value) => {
    value.schemaVersion = "promotion-receipt.fixture";
    value.manifest = { path: manifestPath, rawSha256: manifestSha256 };
    value.binding = bindingFromManifest(manifest);
    value.worktreeProof.executionCommit = executionCommit;
    value.worktreeProof.pre.headCommit = executionCommit;
    value.worktreeProof.post.headCommit = executionCommit;
    value.provenanceProof.candidateDigest = manifest.candidateDigest;
    value.provenanceProof.sourceCommit = manifest.sourceCommit;
    value.baselineProof.executionCommit = executionCommit;
    value.baselineProof.targetBaselineCommit = manifest.targetBaselineCommit;
    value.checkerReleaseProof.version = CHECKER_VERSION;
    value.checkerReleaseProof.releaseCommit = RELEASE;
    value.checkerReleaseProof.bundleDigest = checkerFacts.bundleDigest;
    value.checkerReleaseProof.bundlePathsDigest = checkerFacts.bundlePathsDigest;
    value.checkerReleaseProof.ledgerRawSha256 = checkerFacts.ledgerRawSha256;
    value.externalSideEffectProof.checkerBundleDigest = checkerFacts.bundleDigest;
    const { digest: _digest, ...externalWithoutDigest } = value.externalSideEffectProof;
    value.externalSideEffectProof.digest = fingerprint(externalWithoutDigest);
    value.manifestParentProof.manifestPath = manifestPath;
    value.manifestParentProof.manifestRawSha256 = manifestSha256;
    const candidateCheck = value.checks.find((check) => check.id === "candidate-binding-v2");
    candidateCheck.details.candidateDigest = manifest.candidateDigest;
    const { digest: _checkDigest, ...candidateWithoutDigest } = candidateCheck;
    candidateCheck.digest = fingerprint(candidateWithoutDigest);
  });
}

function withSelfDigest(value, field) {
  return { ...value, [field]: fingerprint(value) };
}

async function createValidClosurePair(root, attemptRoot, manifestArtifact, receiptArtifact, manifest, receipt) {
  const closureSchemaVersion = "promotion-shadow-closure.fixture";
  const registrySchemaVersion = "promotion-lifecycle-registry.fixture";
  await put(root, `coordination/integration/schemas/${closureSchemaVersion}.schema.json`, simpleSchema(closureSchemaVersion));
  await put(root, `coordination/integration/schemas/${registrySchemaVersion}.schema.json`, simpleSchema(registrySchemaVersion));
  const expected = {
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
  };
  const executionCommit = receipt.worktreeProof.executionCommit;
  const independentRawReceiptDigest = "9".repeat(64);
  const a11 = await put(root, `${attemptRoot}/closure-evidence/a11-replay.json`, {
    role: "A11", result: "pass", liveAllowed: false, binding: expected, executionCommit,
    manifest: { path: manifestArtifact.path, rawSha256: manifestArtifact.rawSha256 },
    canonicalReceipt: {
      path: receiptArtifact.path, fileRawSha256: receiptArtifact.rawSha256,
      rawReceiptDigest: receipt.rawReceiptDigest, semanticReceiptDigest: receipt.semanticReceiptDigest,
      runId: receipt.run.runId,
    },
    independentReplay: {
      runId: "fixture-independent-replay", result: "pass", semanticReceiptDigest: receipt.semanticReceiptDigest,
      rawReceiptDigest: independentRawReceiptDigest, semanticDigestMatchesCanonical: true,
      rawDigestDiffersFromCanonical: true, allHardGatesPass: true, candidateSourceByteIdentical: true,
      forbiddenChangedPathCount: 0, rollbackExactPreimage: true, externalSideEffectCount: 0,
    },
    canonicalVerification: {
      result: "pass", valid: true, semanticReplayMatches: true, executionCommitMatches: true, liveAllowed: false,
    },
  });
  const zeroEffects = {
    networkRequestCount: 0, providerCallCount: 0, databaseWriteCount: 0,
    deploymentCommandCount: 0, productionWriteCount: 0, liveRegistryWriteCount: 0,
  };
  const a22 = await put(root, `${attemptRoot}/closure-evidence/a22-isolation.json`, {
    role: "A22", result: "pass", liveAllowed: false, executionCommit,
    manifest: { path: manifestArtifact.path, rawSha256: manifestArtifact.rawSha256 },
    receipt: {
      path: receiptArtifact.path, fileRawSha256: receiptArtifact.rawSha256,
      rawReceiptDigest: receipt.rawReceiptDigest, semanticReceiptDigest: receipt.semanticReceiptDigest,
    },
    cleanSourceProof: {
      worktreeClean: true, exactExecutionCommit: true, candidateSnapshotMatchesReceipt: true,
      forbiddenSnapshotMatchesReceipt: true, candidateSourceByteIdentical: true, forbiddenChangedPathCount: 0,
    },
    outputIsolationProof: { exactPreimageRestored: true },
    preflightBuildProof: { deploymentPerformed: false },
    externalSideEffects: zeroEffects,
  });
  const workflowName = "promotion-shadow-fixture";
  const checkName = "promotion-shadow-fixture";
  const prCheck = await put(root, `${attemptRoot}/closure-evidence/pr-check.json`, {
    role: "A11", result: "pass", event: "pull_request", conclusion: "success", liveAllowed: false,
    candidateDigest: manifest.candidateDigest, manifestRawSha256: manifestArtifact.rawSha256,
    semanticReceiptDigest: receipt.semanticReceiptDigest, headCommit: HEAD, workflowName, checkName,
  });
  const requiredChecks = await put(root, `${attemptRoot}/closure-evidence/required-checks.json`, {
    role: "A22", result: "pass", branch: "main", required: true, enforceAdmins: true, strict: true,
    checks: [{ context: checkName }],
  });
  const mainPostMerge = await put(root, `${attemptRoot}/closure-evidence/main-postmerge.json`, {
    role: "A22", result: "pass", branch: "main", event: "push", conclusion: "success",
    requiredCheckObserved: true, workflowName, checkName, liveAllowed: false,
    candidateDigest: manifest.candidateDigest, manifestRawSha256: manifestArtifact.rawSha256,
    semanticReceiptDigest: receipt.semanticReceiptDigest, mergeCommit: HEAD,
  });
  const a25Closeout = await put(root, `${attemptRoot}/closure-evidence/a25-closeout.json`, {
    role: "A25", result: "pass", liveAllowed: false, finalDisposition: "reviewed commit",
    ownerPackageFinalStates: [{ finalState: "reviewed commit" }], reviewedHeadCommit: HEAD, mergeCommit: HEAD,
  });
  const references = {
    manifest: { path: manifestArtifact.path, rawSha256: manifestArtifact.rawSha256 },
    receipt: { path: receiptArtifact.path, rawSha256: receiptArtifact.rawSha256 },
    a11Replay: { path: a11.path, rawSha256: a11.rawSha256 },
    a22Isolation: { path: a22.path, rawSha256: a22.rawSha256 },
    prCheck: { path: prCheck.path, rawSha256: prCheck.rawSha256 },
    requiredChecks: { path: requiredChecks.path, rawSha256: requiredChecks.rawSha256 },
    mainPostMerge: { path: mainPostMerge.path, rawSha256: mainPostMerge.rawSha256 },
    a25Closeout: { path: a25Closeout.path, rawSha256: a25Closeout.rawSha256 },
  };
  const closurePath = `${attemptRoot}/shadow-closure.json`;
  const closure = withSelfDigest({
    schemaVersion: closureSchemaVersion,
    binding: { ...expected, executionCommit, compositionHeadCommit: HEAD, mergeCommit: HEAD },
    stateTransition: { toState: "shadow_passed", pilotUnitStatus: "shadow_passed", liveAllowed: false, liveEvidence: "none" },
    receiptDigests: {
      rawReceiptDigest: receipt.rawReceiptDigest, semanticReceiptDigest: receipt.semanticReceiptDigest,
      independentRawReceiptDigest,
    },
    artifacts: references,
  }, "closureDigest");
  const closureArtifact = await put(root, closurePath, closure);
  const readyEvent = withSelfDigest({
    sequence: 1, previousEventDigest: null, fromState: "candidate_hold", toState: "shadow_ready",
    evidence: { manifest: { path: manifestArtifact.path, rawSha256: manifestArtifact.rawSha256 } },
  }, "eventDigest");
  const passedEvent = withSelfDigest({
    sequence: 2, previousEventDigest: readyEvent.eventDigest, fromState: "shadow_ready", toState: "shadow_passed",
    evidence: { closure: { path: closureArtifact.path, digest: closure.closureDigest } },
  }, "eventDigest");
  const registry = withSelfDigest({
    schemaVersion: registrySchemaVersion, pilotUnitId: manifest.pilotUnitId, attemptId: manifest.attemptId,
    parentPackageStatus: "candidate-only", liveAllowed: false, liveEvidence: "none",
    pilotUnitStatus: "shadow_passed", events: [readyEvent, passedEvent],
  }, "registryDigest");
  const registryArtifact = await put(root, `${attemptRoot}/lifecycle-registry.json`, registry);
  return { closureArtifact, registryArtifact };
}

async function snapshotTree(root) {
  const records = new Map();
  async function walk(absolute) {
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (entry.isFile()) {
        const pathValue = relative(root, child).split(sep).join("/");
        const [bytes, stat] = await Promise.all([readFile(child), lstat(child)]);
        records.set(pathValue, {
          bytes,
          mode: (stat.mode & 0o111) === 0 ? "100644" : "100755",
          objectId: sha256(bytes).slice(0, 40),
        });
      }
    }
  }
  await walk(root);
  return records;
}

function makeAdapter(records, options = {}) {
  const excluded = new Set(options.excluded ?? []);
  const commits = new Set(["HEAD", HEAD, SOURCE, BASELINE, RELEASE, OLD_BASELINE, EVIDENCE_COMMIT, BINDING_COMMIT, ...(options.additionalCommits ?? [])]);
  return {
    async head() { return options.head ?? HEAD; },
    async branch() { return "codex/fixture"; },
    async status() { return options.status ?? ""; },
    async treeEntry(_commit, pathValue) {
      const record = excluded.has(pathValue) ? null : records.get(pathValue);
      return record ? { mode: record.mode, type: "blob", objectId: record.objectId, path: pathValue } : null;
    },
    async blob(commit, pathValue) {
      if (!commits.has(commit) || excluded.has(pathValue)) return null;
      if (commit === BINDING_COMMIT && pathValue === options.finalizedReceiptPath && options.receiptPrebound !== true) return null;
      const override = options.blobOverrides?.get(`${commit}:${pathValue}`);
      return override ?? records.get(pathValue)?.bytes ?? null;
    },
    async listTrackedPaths(prefix) {
      return [...records.keys()].filter((pathValue) => !excluded.has(pathValue) && (pathValue === prefix || pathValue.startsWith(`${prefix}/`))).sort();
    },
    async commitExists(commit) { return commits.has(commit) && commit !== options.missingCommit; },
    async isAncestor(ancestor, descendant) {
      return commits.has(ancestor) && commits.has(descendant) && `${ancestor}:${descendant}` !== options.invalidAncestry;
    },
    async changedPaths() { return [...(options.changedPaths ?? ["docs/unrelated-baseline-note.md"])].sort(); },
  };
}

function workflowSource({ manifestPath, receiptPath, reaffirmationPath = null, invalid = false, comparator = null }) {
  const compare = invalid
    ? "echo no-semantic-comparison"
    : comparator ?? 'node coordination/integration/promotion-cli.fixture.mjs compare-receipts --manifest "$PROMOTION_MANIFEST" --canonical "$PROMOTION_CANONICAL_RECEIPT" --fresh "$PROMOTION_FRESH_RECEIPT" --replay "$PROMOTION_REPLAY_RECEIPT" --fail-on-mismatch';
  return `name: Promotion fixture\njobs:\n  promotion:\n    runs-on: ubuntu-latest\n    env:\n      PROMOTION_MANIFEST: ${manifestPath}\n      PROMOTION_CANONICAL_RECEIPT: ${receiptPath}\n      PROMOTION_RUN_ID: fresh-static-run\n      PROMOTION_REPLAY_RUN_ID: replay-static-run\n${reaffirmationPath ? `      PROMOTION_REAFFIRMATION: ${reaffirmationPath}\n` : ""}    steps:\n      - name: Validate exact candidate\n        run: |\n          npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"\n      - name: Fresh Shadow\n        run: |\n          npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"\n      - name: Distinct replay Shadow\n        run: |\n          npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"\n      - name: Verify all Receipts\n        run: |\n          npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"\n          npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"\n          npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"\n      - name: Compare closed semantics\n        run: |\n          ${compare}\n`;
}

function closedInlineWorkflow() {
  const comparator = [
    "node --input-type=module -e '",
    '  import { readFileSync } from "node:fs";',
    "  const paths = process.argv.slice(1);",
    '  const receipts = paths.map((receiptPath) => JSON.parse(readFileSync(receiptPath, "utf8")));',
    '  if (receipts.length !== 3 || receipts.some((receipt) => receipt.result !== "pass" || receipt.binding?.liveAllowed !== false)) {',
    '    throw new Error("All three semantic comparison inputs must be passing non-live Receipts.");',
    "  }",
    "  const digests = receipts.map((receipt) => receipt.semanticReceiptDigest);",
    '  if (digests.some((digest) => !/^[a-f0-9]{64}$/.test(digest)) || !digests.every((digest) => digest === digests[0])) {',
    '    throw new Error(`Semantic Receipt digest mismatch: ${digests.join(", ")}`);',
    "  }",
    `' "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT" "$PROMOTION_CANONICAL_RECEIPT"`,
  ].join("\n          ");
  return workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
    comparator,
  });
}

function closedHelperWorkflow() {
  const source = workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
  });
  return source.replace(
    '          npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"\n          npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"\n          npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"',
    '          verify_one() {\n            local receipt_path="$1"\n            npm run promotion:verify-receipt -- --receipt "$receipt_path"\n          }\n          verify_one "$PROMOTION_FRESH_RECEIPT"\n          verify_one "$PROMOTION_REPLAY_RECEIPT"\n          verify_one "$PROMOTION_CANONICAL_RECEIPT"',
  );
}

function withAdditionalRunStep(source, command) {
  return source.replace(
    "      - name: Validate exact candidate\n",
    `      - name: Untrusted additional command\n        run: |\n          ${command}\n      - name: Validate exact candidate\n`,
  );
}

function withAdditionalUsesStep(source, action) {
  return source.replace(
    "      - name: Validate exact candidate\n",
    `      - name: Untrusted additional action\n        uses: ${action}\n      - name: Validate exact candidate\n`,
  );
}

async function fixtureRepo(t, options = {}) {
  const root = await createPromotionTestTempDir(t, "promotion-discovery-test-");
  const attemptRoot = "coordination/integration/pilots/unit/attempt-fixture";
  const revisionRoot = `${attemptRoot}/reaffirmations/revision-one`;
  const activeRoot = options.multiLevelImplicit ? `${revisionRoot}/reaffirmations/revision-two` : options.nested ? revisionRoot : attemptRoot;
  const manifestPath = `${activeRoot}/promotion-manifest.json`;
  const receiptPath = `${activeRoot}/shadow-receipt.json`;
  const ledgerPath = "coordination/integration/checker-releases.fixture.json";
  const cliPath = "coordination/integration/promotion-cli.fixture.mjs";
  const manifestSchemaPath = "coordination/integration/schemas/promotion-manifest.fixture.schema.json";
  const receiptSchemaPath = "coordination/integration/schemas/promotion-receipt.fixture.schema.json";
  const evidenceSchemaPath = "coordination/integration/schemas/promotion-owner-evidence.fixture.schema.json";
  const receiptFixtureSchema = fullReceiptTestSchema();
  receiptFixtureSchema.properties.schemaVersion = { const: "promotion-receipt.fixture" };
  const schemaValues = [
    [manifestSchemaPath, simpleSchema("promotion-manifest.fixture")],
    [receiptSchemaPath, receiptFixtureSchema],
    [evidenceSchemaPath, simpleSchema("promotion-owner-evidence.fixture")],
  ];
  await put(root, cliPath, "// offline fixture CLI; never executed\n");
  const bundleArtifacts = [{ path: cliPath, bytes: Buffer.from("// offline fixture CLI; never executed\n") }];
  for (const [pathValue, schema] of schemaValues) {
    let schemaSource = schema;
    if (options.duplicateJsonTarget === "checker-schema" && pathValue === receiptSchemaPath) {
      const encoded = JSON.stringify(schema);
      schemaSource = encoded.replace('"type":"object"', '"type":"object","type":"object"');
    }
    const artifact = await put(root, pathValue, options.malformedSchema && pathValue === manifestSchemaPath ? "{malformed" : schemaSource);
    bundleArtifacts.push({ path: pathValue, bytes: artifact.bytes });
  }
  const bundleBindings = bundleArtifacts.map(({ path: pathValue, bytes }) => ({ path: pathValue, rawSha256: sha256(bytes) }));
  const computedBundleDigest = fingerprint(bundleBindings);
  const declaredBundleDigest = options.wrongBundleDigest ? "f".repeat(64) : computedBundleDigest;
  const bundlePaths = bundleBindings.map(({ path: pathValue }) => pathValue);
  const ledger = {
    schemaVersion: "checker-releases.fixture",
    entries: [{
      version: CHECKER_VERSION,
      bundleAlgorithm: "sha256-stable-json-path-raw-v2",
      bundlePaths,
      bundleDigest: declaredBundleDigest,
      releaseCommit: RELEASE,
    }],
  };
  const ledgerSource = options.duplicateJsonTarget === "ledger"
    ? JSON.stringify(ledger).replace('"schemaVersion":"checker-releases.fixture"', '"schemaVersion":"checker-releases.fixture","schemaVersion":"checker-releases.fixture"')
    : ledger;
  const ledgerArtifact = await put(root, ledgerPath, ledgerSource);

  const candidatePath = `${attemptRoot}/candidate.json`;
  const evidenceIndexPath = `${attemptRoot}/evidence-index.json`;
  const ownerEvidencePath = `${attemptRoot}/owner-evidence.json`;
  const candidateArtifact = await put(root, candidatePath, { kind: "candidate", content: "redacted-fixture" });
  const evidenceIndex = await put(root, evidenceIndexPath, { schemaVersion: "evidence-index.fixture", entries: ["owner-evidence"] });
  const ownerEvidenceValue = {
    schemaVersion: "promotion-owner-evidence.fixture",
    role: "A18",
    result: "pass",
    candidateDigest: CANDIDATE,
    sourceCommit: SOURCE,
    targetBaselineCommit: BASELINE,
    checkerVersion: CHECKER_VERSION,
  };
  const ownerEvidence = await put(root, ownerEvidencePath, ownerEvidenceValue);
  const checkerFacts = {
    bundleDigest: declaredBundleDigest,
    bundlePathsDigest: fingerprint(bundlePaths),
    ledgerRawSha256: options.corruptLedgerBinding ? "0".repeat(64) : ledgerArtifact.rawSha256,
  };

  function manifestValue(targetBaselineCommit, candidateDigest = CANDIDATE) {
    return {
      schemaVersion: "promotion-manifest.fixture",
      gateId: "fixture-gate",
      pilotUnitId: "fixture-unit",
      attemptId: "attempt-fixture",
      candidateDigest,
      sourceCommit: SOURCE,
      targetBaselineCommit,
      checkerVersion: CHECKER_VERSION,
      checkerRelease: {
        ledgerPath,
        ledgerRawSha256: checkerFacts.ledgerRawSha256,
        version: CHECKER_VERSION,
        bundleAlgorithm: "sha256-stable-json-path-raw-v2",
        bundleDigest: declaredBundleDigest,
        releaseCommit: RELEASE,
      },
      parentPackage: { id: "fixture-package", status: "candidate-only" },
      authorizations: { liveAllowed: false },
      candidateArtifacts: [{ path: candidatePath, rawFileSha256: candidateArtifact.rawSha256 }],
      evidenceIndex: { path: evidenceIndexPath, rawSha256: evidenceIndex.rawSha256 },
      evidenceBindings: [{ role: "A18", evidencePath: ownerEvidencePath, rawSha256: ownerEvidence.rawSha256, expectedResult: "pass" }],
      knownBlockers: [{ scope: "live", code: "LIVE_UNPROVEN" }],
    };
  }

  let baseManifestArtifact = null;
  let baseReceiptArtifact = null;
  let baseClosureArtifact = null;
  let baseRegistryArtifact = null;
  if (options.nested) {
    const baseManifest = manifestValue(OLD_BASELINE, options.reaffirmationMode === "candidate-mutation" ? "9".repeat(64) : CANDIDATE);
    if (options.reaffirmationMode === "candidate-artifact-mutation") baseManifest.candidateArtifacts[0].semanticBinding = "different";
    baseManifestArtifact = await put(root, `${attemptRoot}/promotion-manifest.json`, baseManifest);
    const baseReceipt = receiptFor(baseManifest, baseManifestArtifact.path, baseManifestArtifact.rawSha256, checkerFacts, "fixture-base");
    baseReceiptArtifact = await put(root, `${attemptRoot}/shadow-receipt.json`, baseReceipt);
    if (options.reaffirmationMode !== "implicit" || options.multiLevelImplicit) {
      const closurePair = await createValidClosurePair(root, attemptRoot, baseManifestArtifact, baseReceiptArtifact, baseManifest, baseReceipt);
      baseClosureArtifact = closurePair.closureArtifact;
      baseRegistryArtifact = closurePair.registryArtifact;
    }
    if (options.multiLevelImplicit) {
      const intermediateManifest = manifestValue(BASELINE);
      const intermediateManifestArtifact = await put(root, `${revisionRoot}/promotion-manifest.json`, intermediateManifest);
      const intermediateReceipt = receiptFor(intermediateManifest, intermediateManifestArtifact.path, intermediateManifestArtifact.rawSha256, checkerFacts, "fixture-intermediate");
      await put(root, `${revisionRoot}/shadow-receipt.json`, intermediateReceipt);
    }
  }

  const manifest = manifestValue(BASELINE);
  let manifestArtifact = await put(root, manifestPath, manifest);
  if (options.duplicateJsonTarget === "manifest") {
    const duplicateManifest = JSON.stringify(manifest).replace('"gateId":"fixture-gate"', '"gateId":"fixture-gate","gateId":"fixture-gate"');
    manifestArtifact = await put(root, manifestPath, duplicateManifest);
  }
  const revisionExecution = options.nested && options.reaffirmationMode && options.reaffirmationMode !== "implicit" ? BINDING_COMMIT : EXECUTION;
  const receipt = receiptFor(manifest, manifestPath, manifestArtifact.rawSha256, checkerFacts, "fixture-canonical", revisionExecution);
  let receiptArtifact = await put(root, receiptPath, receipt);
  if (options.duplicateJsonTarget === "receipt") {
    const duplicateReceipt = JSON.stringify(receipt).replace('"liveAllowed":false', '"liveAllowed":false,"liveAllowed":false');
    receiptArtifact = await put(root, receiptPath, duplicateReceipt);
  }

  let reaffirmationPath = null;
  if (options.nested && options.reaffirmationMode && options.reaffirmationMode !== "implicit") {
    reaffirmationPath = `${revisionRoot}/reaffirmation.json`;
    const changedPaths = options.changedPaths ?? ["docs/unrelated-baseline-note.md"];
    const descriptor = {
      schemaVersion: "promotion-reaffirmation.v1",
      relation: "append-only-reaffirmation",
      bases: [{
        manifest: { path: baseManifestArtifact.path, rawSha256: baseManifestArtifact.rawSha256 },
        receipt: { path: baseReceiptArtifact.path, rawSha256: baseReceiptArtifact.rawSha256 },
        closure: { path: baseClosureArtifact.path, rawSha256: baseClosureArtifact.rawSha256 },
        registry: { path: baseRegistryArtifact.path, rawSha256: baseRegistryArtifact.rawSha256 },
      }],
      revision: {
        manifest: { path: manifestPath, rawSha256: options.reaffirmationMode === "direct-parent-mismatch" ? "0".repeat(64) : manifestArtifact.rawSha256 },
      },
      unchangedBindings: {
        candidateDigest: CANDIDATE,
        sourceCommit: SOURCE,
        checkerVersion: CHECKER_VERSION,
        checkerBundleDigest: declaredBundleDigest,
        checkerReleaseCommit: RELEASE,
      },
      baselineDelta: {
        fromCommit: OLD_BASELINE,
        toCommit: BASELINE,
        unrelatedToCandidate: true,
        candidatePathsChanged: false,
        checkerPathsChanged: false,
        changedPathsDigest: fingerprint([...changedPaths].sort()),
        reviewEvidence: [],
      },
      ordering: {
        evidenceCommit: options.reaffirmationMode === "order-invalid" ? BINDING_COMMIT : EVIDENCE_COMMIT,
      },
    };
    for (const role of ["A11", "A22", "A25"]) {
      const evidenceValue = {
        role,
        result: "pass",
        liveAllowed: false,
        fromCommit: OLD_BASELINE,
        toCommit: BASELINE,
        changedPathsDigest: descriptor.baselineDelta.changedPathsDigest,
        unrelatedToCandidate: true,
        candidatePathsChanged: false,
        checkerPathsChanged: false,
        candidateDigest: CANDIDATE,
        sourceCommit: SOURCE,
        checkerVersion: CHECKER_VERSION,
        checkerBundleDigest: declaredBundleDigest,
        checkerReleaseCommit: RELEASE,
      };
      const evidenceArtifact = await put(root, `${revisionRoot}/baseline-review-${role.toLowerCase()}.json`, evidenceValue);
      descriptor.baselineDelta.reviewEvidence.push({ role, path: evidenceArtifact.path, rawSha256: evidenceArtifact.rawSha256 });
    }
    if (options.reaffirmationMode === "review-missing") descriptor.baselineDelta.reviewEvidence.pop();
    if (options.reaffirmationMode === "prebound-receipt") {
      descriptor.revision.receipt = { path: receiptPath, rawSha256: receiptArtifact.rawSha256 };
    }
    if (options.reaffirmationMode === "two-bases") descriptor.bases.push(structuredClone(descriptor.bases[0]));
    await put(root, reaffirmationPath, descriptor);
  }

  if (options.closureMode) {
    const closure = { schemaVersion: "promotion-shadow-closure.fixture", closureDigest: "0".repeat(64) };
    await put(root, `${attemptRoot}/shadow-closure.json`, closure);
    if (options.closureMode === "invalid-pair") {
      await put(root, `${attemptRoot}/lifecycle-registry.json`, { schemaVersion: "promotion-lifecycle-registry.fixture", registryDigest: "0".repeat(64) });
      await put(root, "coordination/integration/schemas/promotion-shadow-closure.fixture.schema.json", simpleSchema("promotion-shadow-closure.fixture"));
      await put(root, "coordination/integration/schemas/promotion-lifecycle-registry.fixture.schema.json", simpleSchema("promotion-lifecycle-registry.fixture"));
    }
  }

  const scripts = {
    "promotion:validate": `node ${cliPath} validate`,
    "promotion:shadow": `node ${cliPath} shadow`,
    "promotion:verify-receipt": `node ${cliPath} verify-receipt`,
  };
  if (options.extraPromotionScript) scripts["promotion:deploy-live"] = `node ${cliPath} deploy-live`;
  await put(root, "package.json", options.duplicateJsonTarget === "package"
    ? `{"scripts":${JSON.stringify(scripts)},"scripts":${JSON.stringify(scripts)}}`
    : { scripts });
  const workflowPath = ".github/workflows/promotion.yml";
  const workflow = workflowSource({ manifestPath, receiptPath, reaffirmationPath, invalid: options.invalidWorkflow });
  await put(root, workflowPath, workflow);
  if (options.extraWorkflow) await put(root, ".github/workflows/promotion-copy.yml", workflow);

  const records = await snapshotTree(root);
  const adapter = makeAdapter(records, {
    excluded: options.excluded,
    missingCommit: options.missingCommit,
    status: options.status,
    changedPaths: options.changedPaths,
    invalidAncestry: options.invalidAncestry,
    finalizedReceiptPath: options.nested ? receiptPath : null,
    receiptPrebound: options.receiptPrebound,
    blobOverrides: options.bindingProtectedMutation
      ? new Map([[`${BINDING_COMMIT}:${candidatePath}`, Buffer.from("mutated protected candidate\n")]])
      : undefined,
  });
  return { root, adapter, records, attemptRoot, manifestPath, receiptPath, candidatePath, ledgerPath, workflowPath };
}

async function discover(fixture, options = {}) {
  return discoverPromotionGate(fixture.root, {
    repositoryAdapter: fixture.adapter,
    observedAt: "2026-08-27T01:02:03.004Z",
    ...options,
  });
}

test("discovers a version-independent exact base attempt without exposing paths", async (t) => {
  const fixture = await fixtureRepo(t);
  const envelope = await discover(fixture, { expectedHead: HEAD });
  assert.equal(envelope.lifecycleState, "shadow_ready");
  assert.equal(envelope.currentness, "current");
  assert.equal(envelope.liveBoundary, "blocked");
  assert.equal(envelope.attemptRelation.relation, "base-attempt");
  assert.equal(envelope.attemptRelation.executionCommit, EXECUTION);
  assert.equal(envelope.attemptRelation.storageCommit, null);
  assert.equal(envelope.attemptRelation.finalizationCommit, null);
  assert.equal(envelope.attemptRelation.directParentManifestSha256, envelope.nativeArtifacts.manifest.sha256);
  assert.equal(envelope.externalClosure.verified, false);
  assert.equal(envelope.nativeArtifacts.reaffirmation, null);
  assert.equal(envelope.claimCeiling, "audit-only");
  assert.equal(JSON.stringify(envelope).includes(fixture.root), false);
  assert.equal(JSON.stringify(envelope).includes(fixture.manifestPath), false);
});

test("base-attempt audit cannot relabel the current HEAD as Receipt storage or finalization", async (t) => {
  const fixture = await fixtureRepo(t);
  const envelope = await discover(fixture);
  assert.equal(envelope.attemptRelation.storageCommit, null);
  assert.equal(envelope.attemptRelation.finalizationCommit, null);
  assert.equal(envelope.canonicalReceiptEvidence.storageCommit, null);
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff(envelope, {
      repositoryAdapter: fixture.adapter,
      releaseSha: envelope.repository.head,
      canonicalReceiptEvidence: null,
      a11Evidence: {},
      a22Evidence: {},
      a25Evidence: {},
    }),
    (error) => error.code === "RELEASE_STORAGE_IDENTITY_REQUIRED",
  );
});

test("commit-tree authoritative JSON rejects duplicate keys at every nesting level", async () => {
  const commit = "1".repeat(40);
  const pathValue = "coordination/integration/duplicate.json";
  const cases = [
    '{"result":"pass","result":"blocked"}',
    '{"binding":{"liveAllowed":false,"liveAllowed":true}}',
    '{"binding":{"digest":"a","digest":"b"}}',
    '{"manifest":{"path":"a","path":"b"}}',
    '{"checker":{"release":{"commit":"a","commit":"b"}}}',
  ];
  for (const source of cases) {
    const bytes = Buffer.from(source, "utf8");
    const adapter = {
      async commitExists() { return true; },
      async treeEntry() { return { mode: "100644", type: "blob", objectId: "2".repeat(40), path: pathValue }; },
      async blob() { return bytes; },
    };
    await assert.rejects(
      readJsonArtifactAtCommit(tmpdir(), commit, pathValue, "duplicate authoritative JSON", adapter),
      (error) => error.code === "JSON_DUPLICATE_KEY" && !error.message.includes("result") && !error.message.includes("liveAllowed"),
    );
  }
});

test("strict JSON rejects malformed UTF-8 bytes instead of normalizing replacement characters", () => {
  const malformed = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]);
  assert.throws(
    () => strictJsonParse(malformed, "malformed authoritative JSON"),
    (error) => error.code === "STRICT_JSON_INVALID" && !error.message.includes("x"),
  );
});

test("strict JSON rejects numeric exponent overflow instead of admitting non-finite values", () => {
  for (const source of ['{"value":1e999}', '{"value":-1e999}']) {
    assert.throws(
      () => strictJsonParse(source, "numeric authoritative JSON"),
      (error) => error.code === "STRICT_JSON_INVALID" && !/value|1e999/iu.test(error.message),
    );
  }
});

test("strict JSON preserves escaped-duplicate, nesting, byte, and redaction limits", () => {
  assert.throws(
    () => strictJsonParse('{"authority":{"safe":1,"\\u0073afe":2}}', "nested authority JSON"),
    (error) => error.code === "JSON_DUPLICATE_KEY" && !/safe|authority/iu.test(error.message),
  );
  const withinDepth = `${'{"n":'.repeat(128)}null${"}".repeat(128)}`;
  assert.doesNotThrow(() => strictJsonParse(withinDepth, "bounded nested JSON"));
  const beyondDepth = `${'{"n":'.repeat(129)}null${"}".repeat(129)}`;
  assert.throws(
    () => strictJsonParse(beyondDepth, "over-depth JSON"),
    (error) => error.code === "STRICT_JSON_INVALID",
  );
  assert.throws(
    () => strictJsonParse(Buffer.alloc(32 * 1024 * 1024 + 1, 0x20), "oversized JSON"),
    (error) => error.code === "STRICT_JSON_INVALID",
  );
});

test("current authoritative package, Manifest, Receipt, ledger, and checker schema reject duplicate keys", async (t) => {
  for (const target of ["package", "manifest", "receipt", "ledger", "checker-schema"]) {
    const fixture = await fixtureRepo(t, { duplicateJsonTarget: target });
    await assert.rejects(
      discover(fixture),
      (error) => error.code === "JSON_DUPLICATE_KEY" && !/scripts|gateId|liveAllowed|schemaVersion|type/u.test(error.message),
      target,
    );
  }
});

test("fails closed on extra promotion script with possible live capability", async (t) => {
  const fixture = await fixtureRepo(t, { extraPromotionScript: true });
  await assert.rejects(discover(fixture), (error) => error.code === "UNEXPECTED_PROMOTION_SCRIPT");
});

test("fails closed on multiple active Promotion workflows", async (t) => {
  const fixture = await fixtureRepo(t, { extraWorkflow: true });
  await assert.rejects(discover(fixture), (error) => error.code === "AMBIGUOUS_WORKFLOW");
});

test("workflow parser requires structural validate, two Shadows, verify, and comparison", async (t) => {
  const fixture = await fixtureRepo(t, { invalidWorkflow: true });
  await assert.rejects(discover(fixture), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
  assert.equal(parsePromotionWorkflow("name: prose-only\n# npm run promotion:shadow\n"), null);
});

test("workflow parser counts only reachable executable commands, not comments, echo text, heredoc bodies, or dead branches", () => {
  const envelope = (body) => `name: Promotion dead-text fixture\njobs:\n  promotion:\n    runs-on: ubuntu-latest\n    env:\n      PROMOTION_MANIFEST: coordination/integration/manifest.json\n      PROMOTION_CANONICAL_RECEIPT: coordination/integration/receipt.json\n    steps:\n      - name: Candidate commands\n        run: |\n${body.split("\n").map((line) => `          ${line}`).join("\n")}\n`;
  const commands = [
    'npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"',
    'node compare.mjs semanticReceiptDigest "$PROMOTION_CANONICAL_RECEIPT" "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT"',
  ];
  assert.equal(parsePromotionWorkflow(envelope(commands.map((line) => `# ${line}`).join("\n"))), null);
  assert.equal(parsePromotionWorkflow(envelope(commands.map((line) => `echo '${line}'`).join("\n"))), null);
  assert.equal(parsePromotionWorkflow(envelope(["cat <<'PROMOTION_DEAD'", ...commands, "PROMOTION_DEAD"].join("\n"))), null);
  assert.equal(parsePromotionWorkflow(envelope(["if false; then", ...commands.map((line) => `  ${line}`), "fi"].join("\n"))), null);
});

test("workflow parser fails closed on disabled or non-shell steps and unreachable multiline shell text", () => {
  const commands = [
    'npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"',
    'node compare.mjs semanticReceiptDigest "$PROMOTION_CANONICAL_RECEIPT" "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT"',
  ];
  const workflow = (body, stepFields = "") => `name: Promotion adversarial fixture\njobs:\n  promotion:\n    runs-on: ubuntu-latest\n    env:\n      PROMOTION_MANIFEST: coordination/integration/manifest.json\n      PROMOTION_CANONICAL_RECEIPT: coordination/integration/receipt.json\n    steps:\n      - name: Candidate commands\n${stepFields}        run: |\n${body.split("\n").map((line) => `          ${line}`).join("\n")}\n`;
  const hardFailureCases = [
    ["step-if-false", workflow(commands.join("\n"), "        if: ${{ false }}\n")],
    ["step-if-dynamic", workflow(commands.join("\n"), "        if: ${{ github.ref == 'refs/heads/main' }}\n")],
    ["python-shell", workflow(commands.join("\n"), "        shell: python\n")],
    ["dynamic-shell", workflow(commands.join("\n"), "        shell: ${{ matrix.shell }}\n")],
    ["after-exit", workflow(["exit 0", ...commands].join("\n"))],
    ["after-return-in-called-function", workflow(["run_gate() {", "  return 0", ...commands.map((line) => `  ${line}`), "}", "run_gate"].join("\n"))],
  ];
  const ignoredDeadTextCases = [
    ["multiline-single-quote", workflow(["printf '%s\\n' '", ...commands, "'"].join("\n"))],
    ["multiline-double-quote", workflow(["printf '%s\\n' \"", ...commands.map((line) => line.replaceAll('"', '\\"')), "\""].join("\n"))],
    ["multiline-false", workflow(["if false", "then", ...commands, "fi"].join("\n"))],
    ["arithmetic-false", workflow(["if ((0)); then", ...commands, "fi"].join("\n"))],
    ["test-false", workflow(["if [ 1 -eq 0 ]; then", ...commands, "fi"].join("\n"))],
    ["double-bracket-false", workflow(["if [[ 1 -eq 0 ]]; then", ...commands, "fi"].join("\n"))],
  ];
  for (const [label, source] of hardFailureCases) {
    assert.throws(
      () => parsePromotionWorkflow(source),
      (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
      label,
    );
  }
  for (const [label, source] of ignoredDeadTextCases) assert.equal(parsePromotionWorkflow(source), null, label);
});

test("workflow parser preserves WORKFLOW_JSON_PARSE_UNTRUSTED for non-comparator JSON.parse", () => {
  const source = withAdditionalRunStep(closedInlineWorkflow(), "node --input-type=module -e 'JSON.parse(\"{}\")'");
  assert.throws(
    () => parsePromotionWorkflow(source),
    (error) => error.code === "WORKFLOW_JSON_PARSE_UNTRUSTED",
  );
});

test("workflow parser allows only the exact repository-native comparator JSON.parse occurrence", () => {
  const source = closedInlineWorkflow();
  const parsed = parsePromotionWorkflow(source);
  assert.equal(parsed.comparator.kind, "inline-workflow");
  assert.equal(parsed.comparator.programSha256.length, 64);
  const injected = withAdditionalRunStep(source, "node --input-type=module -e 'JSON.parse(\"{}\")'");
  assert.throws(
    () => parsePromotionWorkflow(injected),
    (error) => error.code === "WORKFLOW_JSON_PARSE_UNTRUSTED",
  );
});

test("workflow parser rejects weakened or injected inline comparator programs", () => {
  const source = closedInlineWorkflow();
  const cases = [
    ["count", source.replace("receipts.length !== 3", "receipts.length < 3")],
    ["result", source.replaceAll("receipt.result !== \"pass\"", "false")],
    ["live", source.replaceAll("receipt.binding?.liveAllowed !== false", "false")],
    ["equality", source.replace("!digests.every((digest) => digest === digests[0])", "false")],
    ["injection", source.replace("const digests = receipts.map", "process.exitCode = 0; const digests = receipts.map")],
    ["arguments", source.replace('"$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT" "$PROMOTION_CANONICAL_RECEIPT"', '"$PROMOTION_FRESH_RECEIPT" "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_CANONICAL_RECEIPT"')],
  ];
  for (const [label, candidate] of cases) assert.throws(() => parsePromotionWorkflow(candidate), (error) => error.code === "WORKFLOW_JSON_PARSE_UNTRUSTED", label);
});

test("workflow parser rejects executable interpolation hidden in comparator throw payloads", () => {
  const source = closedInlineWorkflow();
  const injected = source.replace(
    'throw new Error(`Semantic Receipt digest mismatch: ${digests.join(", ")}`);',
    'throw new Error(`${process.exit(0)}`);',
  );
  assert.throws(() => parsePromotionWorkflow(injected), (error) => error.code === "WORKFLOW_JSON_PARSE_UNTRUSTED");
});

test("workflow parser expands verify helper call sites and requires three unique Receipt targets", () => {
  const source = closedHelperWorkflow();
  assert.doesNotThrow(() => parsePromotionWorkflow(source));
  const cases = [
    ["missing helper call", source.replace('          verify_one "$PROMOTION_REPLAY_RECEIPT"\n', "")],
    ["duplicated helper target", source.replace('verify_one "$PROMOTION_REPLAY_RECEIPT"', 'verify_one "$PROMOTION_FRESH_RECEIPT"')],
    ["dynamic helper target", source.replace('verify_one "$PROMOTION_REPLAY_RECEIPT"', 'verify_one "$PROMOTION_RECEIPT_TO_VERIFY"')],
    ["unreachable helper call", source.replace('          verify_one "$PROMOTION_REPLAY_RECEIPT"', '          exit 0\n          verify_one "$PROMOTION_REPLAY_RECEIPT"')],
  ];
  for (const [label, candidate] of cases) {
    assert.throws(() => parsePromotionWorkflow(candidate), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID", label);
  }
});

test("workflow parser rejects same resolved fresh and replay run identities", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const reused = valid.replace("PROMOTION_REPLAY_RUN_ID: replay-static-run", "PROMOTION_REPLAY_RUN_ID: fresh-static-run");
  assert.throws(() => parsePromotionWorkflow(reused), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
});

test("workflow parser accounts for every native Promotion invocation and rejects a third Shadow", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const extra = valid.replace(
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"\n          npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "third-run"',
  );
  assert.throws(() => parsePromotionWorkflow(extra), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
});

test("workflow parser rejects an additional unproven semantic comparator invocation", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const extra = valid.replace(
    'node coordination/integration/promotion-cli.fixture.mjs compare-receipts --manifest "$PROMOTION_MANIFEST" --canonical "$PROMOTION_CANONICAL_RECEIPT" --fresh "$PROMOTION_FRESH_RECEIPT" --replay "$PROMOTION_REPLAY_RECEIPT" --fail-on-mismatch',
    'node coordination/integration/promotion-cli.fixture.mjs compare-receipts --manifest "$PROMOTION_MANIFEST" --canonical "$PROMOTION_CANONICAL_RECEIPT" --fresh "$PROMOTION_FRESH_RECEIPT" --replay "$PROMOTION_REPLAY_RECEIPT" --fail-on-mismatch\n          node coordination/integration/other.mjs compare-receipts --manifest "$PROMOTION_MANIFEST"',
  );
  assert.throws(() => parsePromotionWorkflow(extra), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
});

test("workflow parser proves only safe static or same-expression literal-distinct run IDs", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const dynamic = valid
    .replace("PROMOTION_RUN_ID: fresh-static-run", "PROMOTION_RUN_ID: ci-${{ github.run_id }}-${{ github.run_attempt }}")
    .replace("PROMOTION_REPLAY_RUN_ID: replay-static-run", "PROMOTION_REPLAY_RUN_ID: ci-${{ github.run_id }}-${{ github.run_attempt }}-replay");
  assert.doesNotThrow(() => parsePromotionWorkflow(dynamic));
  const arbitrary = dynamic.replace("github.run_attempt }}-replay", "github.job }}-replay");
  assert.throws(() => parsePromotionWorkflow(arbitrary), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
  const ambiguousLiteral = dynamic.replace("-${{ github.run_attempt }}-replay", "-replay-${{ github.run_attempt }}");
  assert.throws(() => parsePromotionWorkflow(ambiguousLiteral), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
});

test("workflow parser rejects a noop or unbound semantic comparator", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const noop = valid.replace(/node coordination\/integration\/promotion-cli\.fixture\.mjs compare-receipts[^\n]+/u, "node -e '' # semanticReceiptDigest canonical fresh replay");
  assert.throws(() => parsePromotionWorkflow(noop), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID");
});

test("workflow parser rejects production deployment commands anywhere in the selected Promotion job", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const deploying = valid.replace("      - name: Validate exact candidate\n", "      - name: Forbidden production deploy\n        run: vercel --prod\n      - name: Validate exact candidate\n");
  assert.throws(() => parsePromotionWorkflow(deploying), (error) => error.code === "WORKFLOW_OPERATION_FORBIDDEN");
});

test("workflow parser rejects live-capable CLI wrappers and indirection in the selected job", () => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const deploying = valid.replace("      - name: Validate exact candidate\n", "      - name: Forbidden wrapped deploy\n        run: npx vercel --prod\n      - name: Validate exact candidate\n");
  assert.throws(() => parsePromotionWorkflow(deploying), (error) => error.code === "WORKFLOW_OPERATION_FORBIDDEN");
});

test("workflow parser rejects every untrusted action in the selected Promotion job", async (context) => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  for (const [label, action] of [
    ["remote deploy action", "amondnet/vercel-action@v25"],
    ["local repository action", "./.github/actions/promotion-helper"],
    ["remote general action", "owner/repository-action@0123456789abcdef"],
  ]) {
    await context.test(label, () => {
      assert.throws(
        () => parsePromotionWorkflow(withAdditionalUsesStep(valid, action)),
        (error) => error.code === "WORKFLOW_OPERATION_FORBIDDEN",
      );
    });
  }
});

test("workflow parser rejects arbitrary executables, wrappers, package managers, and shell composition", async (context) => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const attacks = [
    ["node deploy wrapper", "node scripts/deploy-production.mjs"],
    ["bash live wrapper", "bash scripts/publish-live.sh"],
    ["renamed node wrapper", "node scripts/innocent-helper.mjs"],
    ["python wrapper", "python3 scripts/helper.py"],
    ["sh wrapper", "sh scripts/helper.sh"],
    ["shell command string", "bash -c 'node scripts/helper.mjs'"],
    ["npx indirection", "npx harmless-tool"],
    ["npm exec indirection", "npm exec harmless-tool"],
    ["extra package script", "npm run test:promotion-gate"],
    ["network command", "curl https://example.invalid"],
    ["command substitution", "result=$(node scripts/helper.mjs)"],
    ["pipeline", "node scripts/helper.mjs | tee promotion.log"],
    ["redirect", "node scripts/helper.mjs > promotion.log"],
    ["compound command", "node scripts/helper.mjs && true"],
    ["arbitrary executable", "echo promotion-complete"],
  ];
  for (const [label, command] of attacks) {
    await context.test(label, () => {
      assert.throws(
        () => parsePromotionWorkflow(withAdditionalRunStep(valid, command)),
        (error) => error.code === "WORKFLOW_OPERATION_FORBIDDEN",
      );
    });
  }
});

test("workflow parser rejects redirects from otherwise bound required operations", async (context) => {
  const valid = closedInlineWorkflow();
  const attacks = [
    [
      "validate output to GitHub environment",
      valid.replace(
        'npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"',
        'npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST" --json > "$GITHUB_ENV"',
      ),
    ],
    [
      "fresh Receipt output to shell startup hook",
      valid.replace(
        'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"',
        'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID" --json > "$BASH_ENV"',
      ),
    ],
    [
      "verification output to Node options",
      valid.replace(
        'npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"',
        'npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT" --json > "$NODE_OPTIONS"',
      ),
    ],
    [
      "inline comparator literal redirect",
      valid.replace(
        `' "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT" "$PROMOTION_CANONICAL_RECEIPT"`,
        `' "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT" "$PROMOTION_CANONICAL_RECEIPT" > comparator.log`,
      ),
    ],
  ];
  for (const [label, source] of attacks) {
    await context.test(label, () => {
      assert.throws(
        () => parsePromotionWorkflow(source),
        (error) => ["WORKFLOW_OPERATION_FORBIDDEN", "WORKFLOW_STRUCTURE_INVALID", "WORKFLOW_JSON_PARSE_UNTRUSTED"].includes(error.code),
      );
    });
  }
});

test("workflow parser rejects executable steps hidden behind alternate shells or ambiguous conditions", async (context) => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const attacks = [
    [
      "alternate Python shell",
      valid.replace(
        "      - name: Validate exact candidate\n",
        "      - name: Hidden Python command\n        shell: python\n        run: print('untrusted')\n      - name: Validate exact candidate\n",
      ),
    ],
    [
      "ambiguous conditional command",
      valid.replace(
        "      - name: Validate exact candidate\n",
        "      - name: Conditionally hidden command\n        if: ${{ github.ref == 'refs/heads/main' }}\n        run: node scripts/helper.mjs\n      - name: Validate exact candidate\n",
      ),
    ],
    [
      "failure-conditional command",
      valid.replace(
        "      - name: Validate exact candidate\n",
        "      - name: Failure-path hidden command\n        if: ${{ failure() }}\n        run: node scripts/helper.mjs\n      - name: Validate exact candidate\n",
      ),
    ],
    [
      "cancelled-conditional command",
      valid.replace(
        "      - name: Validate exact candidate\n",
        "      - name: Cancelled-path hidden command\n        if: ${{ cancelled() }}\n        run: node scripts/helper.mjs\n      - name: Validate exact candidate\n",
      ),
    ],
    [
      "custom shell command string",
      valid.replace(
        "      - name: Validate exact candidate\n        run: |\n",
        "      - name: Validate exact candidate\n        shell: bash -c '{0}'\n        run: |\n",
      ),
    ],
  ];
  for (const [label, source] of attacks) {
    await context.test(label, () => {
      assert.throws(
        () => parsePromotionWorkflow(source),
        (error) => ["WORKFLOW_OPERATION_FORBIDDEN", "WORKFLOW_STRUCTURE_INVALID"].includes(error.code),
      );
    });
  }
});

test("workflow parser rejects environment hooks that can replace exact executables", async (context) => {
  const valid = workflowSource({ manifestPath: "coordination/integration/manifest.json", receiptPath: "coordination/integration/receipt.json" });
  const attacks = [
    ["job BASH_ENV", valid.replace("    env:\n", "    env:\n      BASH_ENV: scripts/promotion-shell-hook.sh\n")],
    ["job NODE_OPTIONS", valid.replace("    env:\n", "    env:\n      NODE_OPTIONS: --require=scripts/promotion-hook.cjs\n")],
    ["job PATH override", valid.replace("    env:\n", "    env:\n      PATH: scripts/fake-bin\n")],
    ["workflow environment", valid.replace("jobs:\n", "env:\n  BASH_ENV: scripts/promotion-shell-hook.sh\njobs:\n")],
  ];
  for (const [label, source] of attacks) {
    await context.test(label, () => {
      assert.throws(
        () => parsePromotionWorkflow(source),
        (error) => error.code === "WORKFLOW_OPERATION_FORBIDDEN",
      );
    });
  }
});

test("workflow parser requires one explicit static Linux runner for Promotion evidence", () => {
  const valid = workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
  });
  const source = valid.replace("    runs-on: ubuntu-latest\n", "");
  assert.throws(
    () => parsePromotionWorkflow(source),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
  assert.throws(
    () => parsePromotionWorkflow(valid.replace("runs-on: ubuntu-latest", "runs-on: ubuntu-untrusted")),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
  assert.throws(
    () => parsePromotionWorkflow(valid.replace("runs-on: ubuntu-latest", "runs-on: ${{ matrix.os }}")),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
  assert.throws(
    () => parsePromotionWorkflow(valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    if: ${{ github.ref == 'refs/heads/main' }}\n")),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
});

test("workflow parser rejects step-local env that can shadow authoritative selectors", () => {
  const valid = workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
  });
  const shadowed = valid.replace(
    "      - name: Validate exact candidate\n",
    "      - name: Validate exact candidate\n        env:\n          PROMOTION_MANIFEST: coordination/integration/other.json\n",
  );
  assert.throws(
    () => parsePromotionWorkflow(shadowed),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
});

test("workflow parser rejects Promotion evidence guarded by an ambiguous shell condition", () => {
  const source = `name: Promotion ambiguous shell fixture
jobs:
  promotion:
    runs-on: ubuntu-latest
    env:
      PROMOTION_MANIFEST: coordination/integration/manifest.json
      PROMOTION_CANONICAL_RECEIPT: coordination/integration/receipt.json
    steps:
      - name: Conditionally execute evidence
        shell: bash
        run: |
          if [[ "$UNTRUSTED_CONDITION" == "yes" ]]; then
            npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"
            npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"
            npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"
            npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"
            npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"
            npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"
            node compare.mjs semanticReceiptDigest "$PROMOTION_CANONICAL_RECEIPT" "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT"
          fi
`;
  assert.throws(
    () => parsePromotionWorkflow(source),
    (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
  );
});

test("workflow parser rejects unsupported shell control flow around Promotion evidence", () => {
  const commands = [
    'npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"',
    'npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"',
    'npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"',
    'node compare.mjs semanticReceiptDigest "$PROMOTION_CANONICAL_RECEIPT" "$PROMOTION_FRESH_RECEIPT" "$PROMOTION_REPLAY_RECEIPT"',
  ];
  const workflow = (body) => `name: Promotion shell control fixture
jobs:
  promotion:
    runs-on: ubuntu-latest
    env:
      PROMOTION_MANIFEST: coordination/integration/manifest.json
      PROMOTION_CANONICAL_RECEIPT: coordination/integration/receipt.json
    steps:
      - name: Candidate commands
        shell: bash
        run: |
${body.map((line) => `          ${line}`).join("\n")}
`;
  const cases = [
    ["while", ["while false; do", ...commands.map((line) => `  ${line}`), "done"]],
    ["until", ["until true; do", ...commands.map((line) => `  ${line}`), "done"]],
    ["case", ["case \"$MODE\" in", "  enabled)", ...commands.map((line) => `    ${line}`), "    ;;", "esac"]],
    ["subshell", ["(", ...commands.map((line) => `  ${line}`), ")"]],
    ["command-substitution", commands.map((line) => `capture="$(${line})"`)],
    ["compound-post-exit", commands.map((line) => `exit 0; ${line}`)],
  ];
  for (const [label, body] of cases) {
    assert.throws(
      () => parsePromotionWorkflow(workflow(body)),
      (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
      label,
    );
  }
});

test("workflow parser rejects duplicate authoritative YAML fields", () => {
  const valid = workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
  });
  const cases = [
    ["runs-on", valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    runs-on: ubuntu-latest\n")],
    ["job-if", valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    if: true\n    if: true\n")],
    ["env", valid.replace("    env:\n", "    env:\n    env:\n")],
    ["steps", valid.replace("    steps:\n", "    steps:\n    steps:\n")],
    ["step-if", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        if: true\n        if: true\n")],
    ["shell", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        shell: bash\n        shell: bash\n")],
    ["run", valid.replace("        run: |\n", "        run: echo prelude\n        run: |\n")],
    ["job-name", valid.replace("    runs-on: ubuntu-latest\n", "    name: Promotion job\n    name: Promotion job duplicate\n    runs-on: ubuntu-latest\n")],
    ["job-permissions", valid.replace("    runs-on: ubuntu-latest\n", "    permissions:\n      contents: read\n    permissions:\n      contents: read\n    runs-on: ubuntu-latest\n")],
    ["step-name", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        name: Duplicate step name\n")],
  ];
  for (const [label, source] of cases) {
    assert.throws(
      () => parsePromotionWorkflow(source),
      (error) => error.code === "WORKFLOW_STRUCTURE_INVALID",
      label,
    );
  }
});

test("workflow parser rejects unknown or weakening top-level, job, and step control fields", () => {
  const valid = workflowSource({
    manifestPath: "coordination/integration/manifest.json",
    receiptPath: "coordination/integration/receipt.json",
  });
  const cases = [
    ["job continue-on-error", valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    continue-on-error: true\n")],
    ["step continue-on-error", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        continue-on-error: true\n")],
    ["job timeout", valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    timeout-minutes: 5\n")],
    ["step timeout", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        timeout-minutes: 5\n")],
    ["duplicate top-level name", valid.replace("name: Promotion fixture\n", "name: Promotion fixture\nname: Promotion fixture duplicate\n")],
    ["duplicate top-level permissions", valid.replace("jobs:\n", "permissions:\n  contents: read\npermissions:\n  contents: read\njobs:\n")],
    ["unknown top-level field", valid.replace("jobs:\n", "mystery-control: enabled\njobs:\n")],
    ["unknown job field", valid.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    mystery-control: enabled\n")],
    ["unknown step field", valid.replace("      - name: Validate exact candidate\n", "      - name: Validate exact candidate\n        mystery-control: enabled\n")],
  ];
  for (const [label, source] of cases) {
    assert.throws(() => parsePromotionWorkflow(source), (error) => error.code === "WORKFLOW_STRUCTURE_INVALID", label);
  }
});

test("fails closed on checker ledger raw digest mismatch", async (t) => {
  const fixture = await fixtureRepo(t, { corruptLedgerBinding: true });
  await assert.rejects(discover(fixture), (error) => error.code === "CHECKER_LEDGER_DIGEST_MISMATCH");
});

test("fails closed when checker bundle digest does not recompute", async (t) => {
  const fixture = await fixtureRepo(t, { wrongBundleDigest: true });
  await assert.rejects(discover(fixture), (error) => error.code === "CHECKER_BUNDLE_DIGEST_MISMATCH");
});

test("fails closed on malformed bundled schema", async (t) => {
  const fixture = await fixtureRepo(t, { malformedSchema: true });
  await assert.rejects(discover(fixture), (error) => error.code === "CHECKER_SCHEMA_MALFORMED");
});

test("fails closed when source or checker release commit is unresolved", async (t) => {
  const fixture = await fixtureRepo(t, { missingCommit: RELEASE });
  await assert.rejects(discover(fixture), (error) => ["SOURCE_COMMIT_INVALID", "CHECKER_RELEASE_COMMIT_INVALID"].includes(error.code));
});

test("every authoritative artifact must be tracked in current HEAD", async (t) => {
  const fixture = await fixtureRepo(t, { excluded: ["coordination/integration/pilots/unit/attempt-fixture/candidate.json"] });
  await assert.rejects(discover(fixture), (error) => error.code === "AUTHORITATIVE_INPUT_UNTRACKED");
});

test("tree mode is compared with lstat even if Git might ignore filemode", async (t) => {
  const fixture = await fixtureRepo(t);
  await chmod(join(fixture.root, fixture.candidatePath), 0o755);
  await assert.rejects(discover(fixture), (error) => error.code === "AUTHORITATIVE_MODE_DRIFT");
});

test("execution snapshot rechecks every authoritative path and registered digest source", async (t) => {
  const fixture = await fixtureRepo(t);
  const { context } = await discoverNativePromotionContext(fixture.root, { repositoryAdapter: fixture.adapter });
  const before = await snapshotAuthoritativeState(context);
  assert.equal(before.registeredDigest.length, 64);
  await writeFile(join(fixture.root, fixture.candidatePath), "mutated fixture candidate\n", "utf8");
  await assert.rejects(snapshotAuthoritativeState(context), (error) => error.code === "AUTHORITATIVE_BYTES_DRIFT");
});

test("intermediate symlink components are rejected before artifact reads", async (t) => {
  const fixture = await fixtureRepo(t);
  const candidateDirectory = dirname(join(fixture.root, fixture.candidatePath));
  const moved = `${candidateDirectory}-real`;
  await rename(candidateDirectory, moved);
  await symlink(moved, candidateDirectory);
  await assert.rejects(discover(fixture), (error) => error.code === "SYMLINK_COMPONENT_FORBIDDEN");
});

test("repository root aliases with a symlink component are rejected", async (t) => {
  const fixture = await fixtureRepo(t);
  const alias = await createPromotionTestSiblingSymlink(t, fixture.root, "-alias");
  await assert.rejects(
    discoverPromotionGate(alias, { repositoryAdapter: fixture.adapter }),
    (error) => error.code === "REPOSITORY_ROOT_SYMLINK_FORBIDDEN",
  );
});

test("implicit nested reaffirmation is discovered but remains stale and execution-blocked", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "implicit" });
  const envelope = await discover(fixture);
  assert.equal(envelope.attemptRelation.relation, "unresolved-reaffirmation");
  assert.equal(envelope.attemptRelation.candidateChanged, false);
  assert.equal(envelope.attemptRelation.sourceChanged, false);
  assert.equal(envelope.attemptRelation.checkerChanged, false);
  assert.equal(envelope.attemptRelation.baselineChanged, true);
  assert.equal(envelope.attemptRelation.historicalClosureOverwritten, false);
  assert.equal(envelope.status, "blocked");
  assert.equal(envelope.resolvedState, "blocked");
  assert.equal(envelope.currentness, "stale");
  assert.equal(envelope.lifecycleState, "shadow_ready");
  assert.equal(envelope.externalClosure.scope, "historical-direct-base");
  assert.equal(envelope.externalClosure.liveAllowed, false);
  assert.equal(envelope.nativeArtifacts.manifest.sha256.length, 64);
  assert.equal(envelope.nativeArtifacts.canonicalReceipt.sha256.length, 64);
  assert.equal(envelope.canonicalReceiptEvidence.fileSha256, envelope.nativeArtifacts.canonicalReceipt.sha256);
  assert.equal(envelope.receiptComparison.comparisonStatus, "not-run");
  assert.equal(envelope.attemptRelation.directParentManifestSha256.length, 64);
  assert.equal(envelope.attemptRelation.directParentReceiptSha256.length, 64);
  assert.ok(envelope.blockers.includes("EXPLICIT_REAFFIRMATION_DESCRIPTOR_REQUIRED"));
});

test("multi-level implicit reaffirmation resolves the nearest parent and retains original Closure as historical", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "implicit", multiLevelImplicit: true });
  const envelope = await discover(fixture);
  const nearestPath = `${fixture.attemptRoot}/reaffirmations/revision-one/promotion-manifest.json`;
  assert.equal(envelope.attemptRelation.relation, "unresolved-reaffirmation");
  assert.equal(envelope.status, "blocked");
  assert.equal(envelope.currentness, "stale");
  assert.equal(envelope.attemptRelation.directParentManifestSha256, sha256(fixture.records.get(nearestPath).bytes));
  assert.equal(envelope.externalClosure.verified, true);
  assert.equal(envelope.externalClosure.scope, "historical-direct-base");
  assert.ok(envelope.blockers.includes("EXPLICIT_REAFFIRMATION_DESCRIPTOR_REQUIRED"));
});

test("self-contained clean repository rejects non-comparator JSON.parse before execution", async (t) => {
  const fixture = await fixtureRepo(t);
  const unsafeWorkflow = withAdditionalRunStep(
    await readFile(join(fixture.root, fixture.workflowPath), "utf8"),
    "node --input-type=module -e 'JSON.parse(\"{}\")'",
  );
  await writeFile(join(fixture.root, fixture.workflowPath), unsafeWorkflow);
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) if (key.startsWith("GIT_")) delete environment[key];
  Object.assign(environment, {
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_AUTHOR_NAME: "Promotion fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Promotion fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0",
  });
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: fixture.root, env: environment, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git("init", "-q", "--template=");
  git("add", "--", ...fixture.records.keys());
  git("commit", "-qm", "Freeze self-contained unsafe workflow fixture");
  assert.equal(git("status", "--porcelain=v1", "--untracked-files=all"), "");
  await assert.rejects(
    discoverNativePromotionContext(fixture.root),
    (error) => error.code === "WORKFLOW_JSON_PARSE_UNTRUSTED",
  );
});

test("explicit append-only reaffirmation keeps its direct-base Closure historical through relation, lifecycle, and envelope", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "valid" });
  const envelope = await discover(fixture);
  assert.equal(envelope.attemptRelation.relation, "append-only-reaffirmation");
  assert.equal(envelope.attemptRelation.reviewedBaselineOnly, true);
  assert.equal(envelope.externalClosure.verified, true);
  assert.equal(envelope.externalClosure.scope, "historical-direct-base");
  assert.equal(envelope.lifecycleState, "shadow_ready");
  assert.deepEqual(envelope.authority.proven, []);
  assert.ok(envelope.authority.missing.includes("external-closure"));
  assert.equal(envelope.checks.some(({ id, status }) => id === "historical-external-closure" && status === "pass"), true);
});

test("two-phase reaffirmation rejects future Receipt prebinding and protected execution-snapshot mutation", async (t) => {
  const preboundDescriptor = await fixtureRepo(t, { nested: true, reaffirmationMode: "prebound-receipt" });
  await assert.rejects(discover(preboundDescriptor), (error) => error.code === "UNRECOGNIZED_SEMANTIC_FIELD");
  const preboundBytes = await fixtureRepo(t, { nested: true, reaffirmationMode: "valid", receiptPrebound: true });
  await assert.rejects(discover(preboundBytes), (error) => error.code === "REAFFIRMATION_RECEIPT_PREBOUND");
  const mutated = await fixtureRepo(t, { nested: true, reaffirmationMode: "valid", bindingProtectedMutation: true });
  await assert.rejects(discover(mutated), (error) => error.code === "REAFFIRMATION_PROTECTED_BINDING_MUTATION");
});

test("operation-aware Shadow discovery resolves the registered execution commit without a future Receipt", async (t) => {
  const receiptPath = "coordination/integration/pilots/unit/attempt-fixture/reaffirmations/revision-one/shadow-receipt.json";
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "valid", excluded: [receiptPath] });
  fixture.adapter.head = async () => BINDING_COMMIT;
  const { envelope, context } = await discoverNativePromotionContext(fixture.root, {
    repositoryAdapter: fixture.adapter,
    observedAt: "2026-08-27T01:02:03.004Z",
    operation: "shadow",
    expectedHead: BINDING_COMMIT,
  });
  assert.equal(envelope.mode, "native-shadow");
  assert.equal(envelope.nativeArtifacts.canonicalReceipt, null);
  assert.equal(context.bindingProjection.executionCommit, BINDING_COMMIT);
  assert.equal(context.nativeExecutionBlockers.length, 0);
  assert.equal(envelope.currentness, "current");
  assert.equal(envelope.lifecycleState, "shadow_ready");
  const handoffSchema = JSON.parse(await readFile(new URL("../assets/promotion-gate-handoff.schema.json", import.meta.url), "utf8"));
  assert.doesNotThrow(() => validateJsonSchema(envelope, handoffSchema, "operation-aware Shadow handoff"));
});

test("base-attempt validate and Shadow block when the future canonical Receipt already exists at execution", async (t) => {
  for (const operation of ["validate", "shadow"]) {
    const fixture = await fixtureRepo(t);
    await assert.rejects(
      discoverNativePromotionContext(fixture.root, {
        repositoryAdapter: fixture.adapter,
        observedAt: "2026-08-27T01:02:03.004Z",
        operation,
        expectedHead: HEAD,
      }),
      (error) => error.code === "FUTURE_CANONICAL_RECEIPT_ALREADY_BOUND",
      operation,
    );
  }
});

test("verify discovery hands an immutable finalization Receipt back to its registered execution checkout", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "valid" });
  fixture.adapter.head = async () => BINDING_COMMIT;
  const record = fixture.records.get(fixture.receiptPath);
  const receiptArtifact = {
    relative: fixture.receiptPath,
    bytes: record.bytes,
    text: record.bytes.toString("utf8"),
    sha256: sha256(record.bytes),
    gitMode: record.mode,
    gitObjectId: record.objectId,
    storageCommit: HEAD,
    value: JSON.parse(record.bytes.toString("utf8")),
  };
  const { envelope, context } = await discoverNativePromotionContext(fixture.root, {
    repositoryAdapter: fixture.adapter,
    observedAt: "2026-08-27T01:02:03.004Z",
    operation: "verify-receipt",
    expectedHead: BINDING_COMMIT,
    receiptArtifact,
    storageCommit: HEAD,
  });
  assert.equal(envelope.mode, "receipt-verify");
  assert.equal(envelope.attemptRelation.storageCommit, HEAD);
  assert.equal(envelope.attemptRelation.finalizationCommit, HEAD);
  assert.equal(envelope.canonicalReceiptEvidence.storageCommit, HEAD);
  assert.equal(context.canonicalReceiptEvidence.storageCommit, HEAD);
  assert.equal(context.canonicalReceiptEvidence.gitMode, "100644");
  assert.equal(context.bindingProjection.executionCommit, BINDING_COMMIT);
  assert.equal(context.nativeExecutionBlockers.length, 0);
  assert.equal(envelope.currentness, "current");
  assert.equal(envelope.lifecycleState, "shadow_ready");
  assert.equal(envelope.externalClosure.scope, "historical-direct-base");
  const handoffSchema = JSON.parse(await readFile(new URL("../assets/promotion-gate-handoff.schema.json", import.meta.url), "utf8"));
  assert.doesNotThrow(() => validateJsonSchema(envelope, handoffSchema, "transported Receipt verification handoff"));
});

test("real Git history proves evidence commit then binding/execution commit then independent Receipt finalization", async (t) => {
  assert.equal(typeof promotionDiscovery.validateReaffirmationCommitProtocol, "function");
  const root = await createPromotionTestTempDir(t, "promotion-reaffirmation-git-");
  const runGit = (args) => {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
    });
    assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`);
    return result.stdout.trim();
  };
  runGit(["init", "-q"]);
  runGit(["config", "user.name", "Promotion Fixture"]);
  runGit(["config", "user.email", "promotion-fixture@example.invalid"]);
  await put(root, "evidence/a11.json", { role: "A11", result: "pass", liveAllowed: false });
  runGit(["add", "evidence/a11.json"]);
  runGit(["commit", "-q", "-m", "evidence-first"]);
  const evidenceCommit = runGit(["rev-parse", "HEAD"]);

  const manifest = await put(root, "revision/promotion-manifest.json", { schemaVersion: "promotion-manifest.fixture", liveAllowed: false });
  const descriptor = await put(root, "revision/reaffirmation.json", {
    schemaVersion: "promotion-reaffirmation.fixture",
    ordering: { evidenceCommit },
  });
  const protectedInput = await put(root, "candidate/protected.json", { candidate: "immutable" });
  runGit(["add", manifest.path, descriptor.path, protectedInput.path]);
  runGit(["commit", "-q", "-m", "binding-execution"]);
  const executionCommit = runGit(["rev-parse", "HEAD"]);

  const receipt = await put(root, "revision/shadow-receipt.json", { executionCommit, liveAllowed: false });
  runGit(["add", receipt.path]);
  runGit(["commit", "-q", "-m", "receipt-finalization"]);
  const finalizationCommit = runGit(["rev-parse", "HEAD"]);
  const artifact = async (record) => ({ relative: record.path, bytes: await readFile(join(root, record.path)) });
  const repositoryAdapter = promotionDiscovery.createGitRepositoryAdapter(root);
  const result = await promotionDiscovery.validateReaffirmationCommitProtocol({
    repositoryAdapter,
    storageHead: finalizationCommit,
    evidenceCommit,
    executionCommit,
    manifestArtifact: await artifact(manifest),
    descriptorArtifact: await artifact(descriptor),
    receiptArtifact: await artifact(receipt),
    protectedRecords: [await artifact(protectedInput)],
  });
  assert.deepEqual(result, { evidenceCommit, executionCommit, storageCommit: finalizationCommit, finalizationCommit });
  assert.equal(await promotionDiscovery.classifyRegisteredExecutionCurrentness({
    relationBlocked: false,
    gitClean: true,
    repositoryAdapter,
    executionCommit,
    protectedRecords: [await artifact(manifest), await artifact(protectedInput)],
  }), "current");

  await put(root, protectedInput.path, { candidate: "mutated-after-execution" });
  runGit(["add", protectedInput.path]);
  runGit(["commit", "-q", "-m", "mutate-protected-binding"]);
  await assert.rejects(
    promotionDiscovery.validateReaffirmationCommitProtocol({
      repositoryAdapter,
      storageHead: runGit(["rev-parse", "HEAD"]),
      evidenceCommit,
      executionCommit,
      manifestArtifact: await artifact(manifest),
      descriptorArtifact: await artifact(descriptor),
      receiptArtifact: await artifact(receipt),
      protectedRecords: [await artifact(protectedInput)],
    }),
    (error) => error.code === "REAFFIRMATION_PROTECTED_BINDING_MUTATION",
  );
  assert.equal(await promotionDiscovery.classifyRegisteredExecutionCurrentness({
    relationBlocked: false,
    gitClean: true,
    repositoryAdapter,
    executionCommit,
    protectedRecords: [await artifact(manifest), await artifact(protectedInput)],
  }), "stale");
});

test("reaffirmation requires one exact direct base and direct revision parents", async (t) => {
  const twoBases = await fixtureRepo(t, { nested: true, reaffirmationMode: "two-bases" });
  await assert.rejects(discover(twoBases), (error) => error.code === "REAFFIRMATION_BASE_AMBIGUOUS");
  const wrongParent = await fixtureRepo(t, { nested: true, reaffirmationMode: "direct-parent-mismatch" });
  await assert.rejects(discover(wrongParent), (error) => error.code === "REAFFIRMATION_DIRECT_PARENT_MISMATCH");
});

test("candidate mutation across a baseline revision requires a new immutable attempt", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "candidate-mutation" });
  await assert.rejects(discover(fixture), (error) => error.code === "REAFFIRMATION_REQUIRES_NEW_ATTEMPT");
});

test("candidate artifact semantics cannot change while reusing the top-level candidate digest", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "candidate-artifact-mutation" });
  await assert.rejects(discover(fixture), (error) => error.code === "REAFFIRMATION_REQUIRES_NEW_ATTEMPT");
});

test("candidate-path baseline delta cannot masquerade as an unrelated reaffirmation", async (t) => {
  const candidatePath = "coordination/integration/pilots/unit/attempt-fixture/candidate.json";
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "candidate-path-delta", changedPaths: [candidatePath] });
  await assert.rejects(discover(fixture), (error) => error.code === "REAFFIRMATION_REQUIRES_NEW_ATTEMPT");
});

test("reaffirmation evidence commit must strictly precede its binding commit", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "order-invalid" });
  await assert.rejects(discover(fixture), (error) => error.code === "REAFFIRMATION_ORDER_INVALID");
});

test("reaffirmation requires exact immutable A11, A22, and A25 baseline-only reviews", async (t) => {
  const fixture = await fixtureRepo(t, { nested: true, reaffirmationMode: "review-missing" });
  await assert.rejects(discover(fixture), (error) => error.code === "REAFFIRMATION_REVIEW_INCOMPLETE");
});

test("Closure and Registry existence is not validation", async (t) => {
  const unpaired = await fixtureRepo(t, { closureMode: "unpaired" });
  await assert.rejects(discover(unpaired), (error) => error.code === "CLOSURE_REGISTRY_PAIR_REQUIRED");
  const invalid = await fixtureRepo(t, { closureMode: "invalid-pair" });
  await assert.rejects(discover(invalid), (error) => error.code === "SELF_DIGEST_INVALID");
});

test("fails closed on expected HEAD mismatch", async (t) => {
  const fixture = await fixtureRepo(t);
  await assert.rejects(discover(fixture, { expectedHead: "f".repeat(40) }), (error) => error.code === "HEAD_MISMATCH");
});

test("dirty exact inputs are discovered as stale rather than current", async (t) => {
  const fixture = await fixtureRepo(t, { status: "?? unrelated.local\n" });
  const envelope = await discover(fixture);
  assert.equal(envelope.currentness, "stale");
  assert.equal(envelope.nextAllowedAction, "supply-missing-evidence");
});

test("bundled date-time format is applied rather than treated as annotation", () => {
  const schema = { type: "string", format: "date-time" };
  assert.doesNotThrow(() => validateJsonSchema("2026-08-27T01:02:03.004Z", schema, "timestamp"));
  assert.throws(() => validateJsonSchema("not-a-timestamp", schema, "timestamp"), (error) => error.code === "SCHEMA_VALIDATION_FAILED");
});

test("bundled JSON Schema validator implements not and rejects unsupported assertion keywords", async () => {
  const schema = JSON.parse(await readFile(new URL("../assets/promotion-gate-handoff.schema.json", import.meta.url), "utf8"));
  assert.throws(
    () => validateJsonSchema("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", schema.$defs.sha256, "empty digest"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
  assert.doesNotThrow(() => validateJsonSchema("a".repeat(64), schema.$defs.sha256, "nonempty digest"));
  for (const unsupported of [
    { type: "array", contains: { const: 1 } },
    { type: "string", minLenght: 3 },
    { type: "number", multipleOf: 2 },
  ]) {
    assert.throws(
      () => validateJsonSchema([], unsupported, "unsupported assertion"),
      (error) => error.code === "SCHEMA_DOCUMENT_INVALID",
    );
  }
});

test("bundled JSON Schema validator applies object-valued additionalProperties", () => {
  const schema = {
    type: "object",
    properties: {},
    additionalProperties: { type: "string" },
  };
  assert.doesNotThrow(() => validateJsonSchema({ label: "safe" }, schema, "typed additional property"));
  assert.throws(
    () => validateJsonSchema({ counter: 7 }, schema, "invalid additional property"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
});

test("bundled JSON Schema validator rejects malformed numeric assertion values", () => {
  assert.throws(
    () => validateJsonSchema("abc", { type: "string", minLength: "3" }, "malformed minLength"),
    (error) => error.code === "SCHEMA_DOCUMENT_INVALID",
  );
});

test("bundled JSON Schema validator rejects every malformed admitted assertion form", () => {
  const malformed = [
    { label: "maxLength", schema: { type: "string", maxLength: -1 } },
    { label: "minItems", schema: { type: "array", minItems: 1.5 } },
    { label: "maxItems", schema: { type: "array", maxItems: "1" } },
    { label: "minimum", schema: { type: "number", minimum: "0" } },
    { label: "maximum", schema: { type: "number", maximum: Number.POSITIVE_INFINITY } },
    { label: "numeric range", schema: { type: "number", minimum: 2, maximum: 1 } },
    { label: "string range", schema: { type: "string", minLength: 2, maxLength: 1 } },
    { label: "array range", schema: { type: "array", minItems: 2, maxItems: 1 } },
    { label: "uniqueItems", schema: { type: "array", uniqueItems: "true" } },
    { label: "pattern", schema: { type: "string", pattern: 7 } },
    { label: "format", schema: { type: "string", format: 7 } },
    { label: "$ref", schema: { type: "string", $ref: 7 } },
    { label: "required duplicate", schema: { type: "object", required: ["id", "id"], properties: {} } },
    { label: "enum empty", schema: { enum: [] } },
    { label: "type duplicate", schema: { type: ["string", "string"] } },
    { label: "allOf empty", schema: { allOf: [] } },
    { label: "prefixItems empty", schema: { type: "array", prefixItems: [] } },
    { label: "readOnly", schema: { type: "string", readOnly: "false" } },
    { label: "examples", schema: { type: "string", examples: "sample" } },
  ];
  for (const { label, schema } of malformed) {
    assert.throws(
      () => validateJsonSchema(null, schema, label),
      (error) => error.code === "SCHEMA_DOCUMENT_INVALID",
      label,
    );
  }
});

test("bundled JSON Schema validator executes boolean conditional subschemas", () => {
  assert.doesNotThrow(() => validateJsonSchema("else-value", { if: false, then: false, else: { const: "else-value" } }, "false condition"));
  assert.throws(
    () => validateJsonSchema("wrong", { if: false, then: true, else: { const: "else-value" } }, "false condition else"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
  assert.throws(
    () => validateJsonSchema("anything", { if: true, then: false, else: true }, "true condition then"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
});

test("bundled JSON Schema validator applies items only after prefixItems", () => {
  const schema = {
    type: "array",
    prefixItems: [{ type: "string" }],
    items: { type: "number" },
  };
  assert.doesNotThrow(() => validateJsonSchema(["prefix", 1, 2], schema, "tuple tail"));
  assert.throws(
    () => validateJsonSchema(["prefix", "wrong"], schema, "invalid tuple tail"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
});

test("bundled JSON Schema validator rejects cyclic local references before evaluation", () => {
  const cyclic = {
    $defs: { loop: { $ref: "#/$defs/loop" } },
    $ref: "#/$defs/loop",
  };
  assert.throws(
    () => validateJsonSchema({}, cyclic, "cyclic schema"),
    (error) => error.code === "SCHEMA_DOCUMENT_INVALID",
  );
});

test("standalone handoff schema rejects false Shadow, reaffirmation, and release claims", async (t) => {
  const schema = JSON.parse(await readFile(new URL("../assets/promotion-gate-handoff.schema.json", import.meta.url), "utf8"));
  const fixture = await fixtureRepo(t);
  const envelope = await discover(fixture);
  assert.doesNotThrow(() => validateJsonSchema(envelope, schema, "base discovery handoff"));

  const falseShadow = structuredClone(envelope);
  falseShadow.lifecycleState = "shadow_passed";
  falseShadow.claimCeiling = "shadow-mature-live-unproven";
  assert.throws(() => validateJsonSchema(falseShadow, schema, "false Shadow packet"), (error) => error.code === "SCHEMA_VALIDATION_FAILED");

  const falseReaffirmation = structuredClone(envelope);
  falseReaffirmation.attemptRelation.relation = "append-only-reaffirmation";
  assert.throws(() => validateJsonSchema(falseReaffirmation, schema, "false reaffirmation packet"), (error) => error.code === "SCHEMA_VALIDATION_FAILED");

  const falseRelease = structuredClone(envelope);
  falseRelease.mode = "release-handoff";
  falseRelease.releaseHandoff = null;
  assert.throws(() => validateJsonSchema(falseRelease, schema, "false release packet"), (error) => error.code === "SCHEMA_VALIDATION_FAILED");

  const release = structuredClone(envelope);
  const receiptDigest = release.receiptComparison.canonical;
  release.mode = "release-handoff";
  const releaseExecution = release.attemptRelation.executionCommit;
  const releaseStorage = "9".repeat(40);
  const releaseFinalization = "a".repeat(40);
  const intendedRelease = "b".repeat(40);
  const canonicalTransportPath = fixture.receiptPath;
  const canonicalTransportBytes = fixture.records.get(canonicalTransportPath).bytes;
  const canonicalTransportSha256 = sha256(canonicalTransportBytes);
  const canonicalTransportObjectId = fixture.records.get(canonicalTransportPath).objectId;
  release.repository.head = intendedRelease;
  release.repository.clean = true;
  release.resolvedState = "shadow-evidence-complete";
  release.status = "complete";
  release.lifecycleState = "shadow_passed";
  release.currentness = "current";
  release.claimCeiling = "shadow-mature-live-unproven";
  release.nextAllowedAction = "handoff-release-hygiene";
  release.attemptRelation.bindingCommit = releaseExecution;
  release.attemptRelation.executionCommit = releaseExecution;
  release.attemptRelation.storageCommit = releaseStorage;
  release.attemptRelation.finalizationCommit = releaseFinalization;
  release.nativeArtifacts.canonicalReceipt.sha256 = canonicalTransportSha256;
  release.canonicalReceiptEvidence = {
    ref: release.nativeArtifacts.canonicalReceipt.ref,
    fileSha256: canonicalTransportSha256,
    executionCommit: releaseExecution,
    storageCommit: releaseStorage,
  };
  release.receiptComparison = {
    canonical: receiptDigest,
    fresh: { ...receiptDigest, receiptSha256: "1".repeat(64), rawDigest: "2".repeat(64) },
    replay: { ...receiptDigest, receiptSha256: "3".repeat(64), rawDigest: "4".repeat(64) },
    bindingsEqual: true,
    semanticDigestsEqual: true,
    rawDigestsEqual: false,
    runIdsDistinct: true,
    semanticDigestsVerified: true,
    comparisonDigest: "5".repeat(64),
    comparisonStatus: "pass",
  };
  release.nativeArtifacts.closure = { ref: `ref-${"6".repeat(64)}`, sha256: "6".repeat(64) };
  release.nativeArtifacts.registry = { ref: `ref-${"7".repeat(64)}`, sha256: "7".repeat(64) };
  release.externalClosure = {
    verified: true,
    signatureDigestCount: 2,
    scope: "active-attempt",
    a11EvidenceVerified: true,
    a22EvidenceVerified: true,
    githubEvidenceVerified: true,
    a25EvidenceVerified: true,
    liveAllowed: false,
  };
  const releaseEvidence = (role, digit) => ({ role, ref: `ref-${digit.repeat(64)}`, sha256: digit.repeat(64), result: "pass", liveAllowed: false });
  const exactReleaseEvidence = (role, digit) => ({ ...releaseEvidence(role, digit), releaseSha: intendedRelease });
  const targetPathspecRef = `ref-${"c".repeat(64)}`;
  const liveSurfaceOwnerEvidence = {
    ownerRef: `ref-${"d".repeat(64)}`,
    ref: `ref-${"e".repeat(64)}`,
    sha256: "e".repeat(64),
    releaseSha: intendedRelease,
    result: "pass",
    liveAllowed: false,
  };
  const ownerAuthorization = {
    ownerRef: liveSurfaceOwnerEvidence.ownerRef,
    authorizationRef: `ref-${"f".repeat(64)}`,
    sha256: "f".repeat(64),
    releaseSha: intendedRelease,
    target: "production",
    action: "deploy",
    targetPathspecRef,
    targetPathspecDigest: fingerprint({ releaseSha: intendedRelease, target: "production", action: "deploy", targetPathspecRef }),
  };
  const releaseAuthorityEvidence = {
    liveSurfaceOwnerEvidence,
    ownerAuthorization,
    a11Evidence: exactReleaseEvidence("A11", "8"),
    a22Evidence: exactReleaseEvidence("A22", "9"),
    a25Evidence: exactReleaseEvidence("A25", "a"),
  };
  release.receiptComparison.canonical.receiptSha256 = canonicalTransportSha256;
  const releaseAdapter = {
    async head() { return intendedRelease; },
    async commitExists(commit) { return [releaseExecution, releaseStorage, releaseFinalization, intendedRelease, SOURCE, BASELINE, RELEASE].includes(commit); },
    async isAncestor(ancestor, descendant) {
      return ancestor === descendant || [
        `${releaseExecution}:${releaseStorage}`,
        `${releaseStorage}:${releaseFinalization}`,
        `${releaseStorage}:${intendedRelease}`,
        `${releaseFinalization}:${intendedRelease}`,
        `${RELEASE}:${intendedRelease}`,
      ].includes(`${ancestor}:${descendant}`);
    },
    async treeEntry(commit, pathValue) {
      if (commit === releaseExecution && pathValue === canonicalTransportPath) return null;
      const record = fixture.records.get(pathValue);
      return record ? { mode: record.mode, type: "blob", objectId: record.objectId, path: pathValue } : null;
    },
    async blob(commit, pathValue) {
      if (commit === releaseExecution && pathValue === canonicalTransportPath) return null;
      return fixture.records.get(pathValue)?.bytes ?? null;
    },
    async listTrackedPaths(prefix) { return [...fixture.records.keys()].filter((pathValue) => pathValue === prefix || pathValue.startsWith(`${prefix}/`)).sort(); },
  };
  const canonicalReceiptEvidence = {
    path: canonicalTransportPath,
    fileSha256: canonicalTransportSha256,
    executionCommit: releaseExecution,
    storageCommit: releaseStorage,
    gitMode: "100644",
    gitObjectId: canonicalTransportObjectId,
  };
  release.releaseHandoff = await buildRepositoryValidatedReleaseHandoff(release, {
    repositoryAdapter: releaseAdapter,
    releaseSha: intendedRelease,
    canonicalReceiptEvidence,
    ...releaseAuthorityEvidence,
  });
  assert.deepEqual(release.releaseHandoff.liveSurfaceOwnerEvidence, liveSurfaceOwnerEvidence);
  assert.deepEqual(release.releaseHandoff.ownerAuthorization, ownerAuthorization);
  assert.equal(release.releaseHandoff.ownerAuthorization.targetPathspecDigest, fingerprint({
    releaseSha: intendedRelease,
    target: "production",
    action: "deploy",
    targetPathspecRef,
  }));
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      ownerAuthorization,
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_LIVE_OWNER_EVIDENCE_REQUIRED",
  );
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      liveSurfaceOwnerEvidence,
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_OWNER_AUTHORIZATION_REQUIRED",
  );
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      liveSurfaceOwnerEvidence: { ...liveSurfaceOwnerEvidence, releaseSha: "c".repeat(40) },
      ownerAuthorization,
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_EXACT_SHA_EVIDENCE_MISMATCH",
  );
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      liveSurfaceOwnerEvidence,
      ownerAuthorization: { ...ownerAuthorization, releaseSha: "c".repeat(40) },
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_EXACT_SHA_EVIDENCE_MISMATCH",
  );
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      liveSurfaceOwnerEvidence,
      ownerAuthorization: { ...ownerAuthorization, targetPathspecDigest: "0".repeat(64) },
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_TARGET_PATHSPEC_DIGEST_MISMATCH",
  );
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff({ ...release, releaseHandoff: null }, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      liveSurfaceOwnerEvidence: { ...liveSurfaceOwnerEvidence, sha256: "8".repeat(64) },
      ownerAuthorization,
      a11Evidence: exactReleaseEvidence("A11", "8"),
      a22Evidence: exactReleaseEvidence("A22", "9"),
      a25Evidence: exactReleaseEvidence("A25", "a"),
    }),
    (error) => error.code === "RELEASE_LIVE_OWNER_EVIDENCE_NOT_DISTINCT",
  );
  assert.equal(JSON.stringify(release).includes(canonicalTransportPath), false);
  assert.throws(
    () => validateJsonSchema(release, schema, "exact release handoff without repository proof"),
    (error) => error.code === "REPOSITORY_ANCESTRY_VALIDATION_REQUIRED",
  );
  await assert.doesNotReject(validateRepositoryBackedReleaseHandoff(release, releaseAdapter, canonicalReceiptEvidence));
  const emptyReceiptBytes = Buffer.from("{}\n", "utf8");
  const emptyReceiptSha256 = sha256(emptyReceiptBytes);
  const emptyReceiptPacket = structuredClone(release);
  emptyReceiptPacket.nativeArtifacts.canonicalReceipt.sha256 = emptyReceiptSha256;
  emptyReceiptPacket.canonicalReceiptEvidence.fileSha256 = emptyReceiptSha256;
  emptyReceiptPacket.receiptComparison.canonical.receiptSha256 = emptyReceiptSha256;
  emptyReceiptPacket.releaseHandoff.canonicalReceiptSha256 = emptyReceiptSha256;
  const emptyReceiptTransport = { ...canonicalReceiptEvidence, fileSha256: emptyReceiptSha256 };
  const emptyReceiptAdapter = { ...releaseAdapter, async blob(commit, pathValue) {
    return commit === releaseStorage && pathValue === canonicalTransportPath ? emptyReceiptBytes : releaseAdapter.blob(commit, pathValue);
  } };
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(emptyReceiptPacket, emptyReceiptAdapter, emptyReceiptTransport),
    (error) => error.code === "RELEASE_RECEIPT_AUTHORITY_INVALID",
  );
  const minimalReceiptBytes = Buffer.from('{"schemaVersion":"promotion-receipt.fixture","result":"pass"}\n', "utf8");
  const minimalReceiptSha256 = sha256(minimalReceiptBytes);
  const minimalReceiptPacket = structuredClone(release);
  minimalReceiptPacket.nativeArtifacts.canonicalReceipt.sha256 = minimalReceiptSha256;
  minimalReceiptPacket.canonicalReceiptEvidence.fileSha256 = minimalReceiptSha256;
  minimalReceiptPacket.receiptComparison.canonical.receiptSha256 = minimalReceiptSha256;
  minimalReceiptPacket.releaseHandoff.canonicalReceiptSha256 = minimalReceiptSha256;
  const minimalReceiptAdapter = { ...releaseAdapter, async blob(commit, pathValue) {
    return commit === releaseStorage && pathValue === canonicalTransportPath ? minimalReceiptBytes : releaseAdapter.blob(commit, pathValue);
  } };
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(minimalReceiptPacket, minimalReceiptAdapter, { ...canonicalReceiptEvidence, fileSha256: minimalReceiptSha256 }),
    (error) => error.code === "RELEASE_RECEIPT_AUTHORITY_INVALID",
  );
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(release, releaseAdapter, { ...canonicalReceiptEvidence, schema: {} }),
    (error) => error.code === "RELEASE_TRANSPORT_REQUIRED",
  );

  const forgeStoredReceipt = async (mutate) => {
    const receipt = strictJsonParse(canonicalTransportBytes, "release fixture Receipt");
    mutate(receipt);
    const forged = unsafeRehashReceipt(receipt);
    const bytes = jsonBytes(forged);
    const fileSha256 = sha256(bytes);
    const gitObjectId = fileSha256.slice(0, 40);
    const packet = structuredClone(release);
    packet.nativeArtifacts.canonicalReceipt.sha256 = fileSha256;
    packet.canonicalReceiptEvidence.fileSha256 = fileSha256;
    const forgedSchema = fullReceiptTestSchema();
    forgedSchema.properties.schemaVersion = { const: "promotion-receipt.fixture" };
    const digest = summarizeVerifiedReceipt({ value: forged, receiptSha256: fileSha256, label: "forged release Receipt" }, { schema: forgedSchema }).digest;
    packet.receiptComparison.canonical = digest;
    packet.releaseHandoff.canonicalReceiptSha256 = fileSha256;
    const adapter = {
      ...releaseAdapter,
      async treeEntry(commit, pathValue) {
        if (commit === releaseStorage && pathValue === canonicalTransportPath) return { mode: "100644", type: "blob", objectId: gitObjectId, path: pathValue };
        return releaseAdapter.treeEntry(commit, pathValue);
      },
      async blob(commit, pathValue) {
        if (commit === releaseStorage && pathValue === canonicalTransportPath) return bytes;
        return releaseAdapter.blob(commit, pathValue);
      },
    };
    return { packet, adapter, transport: { ...canonicalReceiptEvidence, fileSha256, gitObjectId } };
  };
  const forgedBinding = await forgeStoredReceipt((receipt) => {
    const forgedExecution = "d".repeat(40);
    receipt.worktreeProof.executionCommit = forgedExecution;
    receipt.worktreeProof.pre.headCommit = forgedExecution;
    receipt.worktreeProof.post.headCommit = forgedExecution;
    receipt.baselineProof.executionCommit = forgedExecution;
  });
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(forgedBinding.packet, forgedBinding.adapter, forgedBinding.transport),
    (error) => error.code === "RELEASE_RECEIPT_AUTHORITY_INVALID",
  );
  const forgedResult = await forgeStoredReceipt((receipt) => {
    receipt.result = "blocked";
    receipt.exitReasons = [{ code: "FORGED_BLOCK" }];
  });
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(forgedResult.packet, forgedResult.adapter, forgedResult.transport),
    (error) => error.code === "RELEASE_RECEIPT_AUTHORITY_INVALID",
  );
  const fabricatedHeadAdapter = { ...releaseAdapter, async head() { return "d".repeat(40); } };
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(release, fabricatedHeadAdapter, canonicalReceiptEvidence),
    (error) => error.code === "RELEASE_HEAD_IDENTITY_INVALID",
  );
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(release, releaseAdapter),
    (error) => error.code === "RELEASE_TRANSPORT_REQUIRED",
  );
  const invalidCapabilityMutations = [
    ["stale", (packet) => { packet.currentness = "stale"; }],
    ["candidate hold", (packet) => { packet.lifecycleState = "candidate_hold"; }],
    ["deploy/live next action", (packet) => { packet.nextAllowedAction = "deploy-live"; }],
    ["historical closure", (packet) => { packet.externalClosure.scope = "historical-direct-base"; }],
    ["wrong A11 role", (packet) => { packet.releaseHandoff.a11Evidence.role = "A22"; }],
    ["blocked status", (packet) => { packet.status = "blocked"; }],
  ];
  for (const [label, mutate] of invalidCapabilityMutations) {
    const packet = structuredClone(release);
    mutate(packet);
    await assert.rejects(
      validateRepositoryBackedReleaseHandoff(packet, releaseAdapter, canonicalReceiptEvidence),
      (error) => error.code === "SCHEMA_VALIDATION_FAILED",
      label,
    );
  }
  const builderCandidateHold = structuredClone(release);
  builderCandidateHold.lifecycleState = "candidate_hold";
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff(builderCandidateHold, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      ...releaseAuthorityEvidence,
    }),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
  const transportMutations = [
    ["path", (transport) => { transport.path = "coordination/integration/other.json"; }],
    ["file SHA", (transport) => { transport.fileSha256 = "d".repeat(64); }],
    ["execution", (transport) => { transport.executionCommit = "d".repeat(40); }],
    ["storage", (transport) => { transport.storageCommit = "d".repeat(40); }],
    ["mode", (transport) => { transport.gitMode = "100755"; }],
    ["object", (transport) => { transport.gitObjectId = "d".repeat(40); }],
  ];
  for (const [label, mutate] of transportMutations) {
    const transport = structuredClone(canonicalReceiptEvidence);
    mutate(transport);
    await assert.rejects(validateRepositoryBackedReleaseHandoff(release, releaseAdapter, transport), undefined, label);
  }
  const wrongBytesAdapter = { ...releaseAdapter, async blob() { return Buffer.from("fabricated bytes\n", "utf8"); } };
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(release, wrongBytesAdapter, canonicalReceiptEvidence),
    (error) => error.code === "RELEASE_TRANSPORT_INVALID",
  );
  const duplicateTransportBytes = Buffer.from('{"result":"pass","result":"blocked"}\n', "utf8");
  const duplicateTransportSha = sha256(duplicateTransportBytes);
  const duplicateTransportPacket = structuredClone(release);
  duplicateTransportPacket.nativeArtifacts.canonicalReceipt.sha256 = duplicateTransportSha;
  duplicateTransportPacket.canonicalReceiptEvidence.fileSha256 = duplicateTransportSha;
  duplicateTransportPacket.receiptComparison.canonical.receiptSha256 = duplicateTransportSha;
  duplicateTransportPacket.releaseHandoff.canonicalReceiptSha256 = duplicateTransportSha;
  const duplicateTransport = { ...canonicalReceiptEvidence, fileSha256: duplicateTransportSha };
  const duplicateTransportAdapter = { ...releaseAdapter, async blob() { return duplicateTransportBytes; } };
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(duplicateTransportPacket, duplicateTransportAdapter, duplicateTransport),
    (error) => error.code === "JSON_DUPLICATE_KEY",
  );
  const sharedStorageFinalization = structuredClone(release);
  sharedStorageFinalization.attemptRelation.finalizationCommit = releaseStorage;
  sharedStorageFinalization.releaseHandoff = await buildRepositoryValidatedReleaseHandoff(sharedStorageFinalization, {
    repositoryAdapter: releaseAdapter,
    releaseSha: intendedRelease,
    canonicalReceiptEvidence,
    ...releaseAuthorityEvidence,
  });
  assert.equal(sharedStorageFinalization.releaseHandoff.storageCommit, sharedStorageFinalization.releaseHandoff.finalizationCommit);
  const executionRelabeledAsStorage = structuredClone(release);
  executionRelabeledAsStorage.attemptRelation.executionCommit = releaseStorage;
  executionRelabeledAsStorage.canonicalReceiptEvidence.executionCommit = releaseStorage;
  executionRelabeledAsStorage.releaseHandoff.registeredExecutionCommit = releaseStorage;
  await assert.rejects(
    validateRepositoryBackedReleaseHandoff(executionRelabeledAsStorage, releaseAdapter, { ...canonicalReceiptEvidence, executionCommit: releaseStorage }),
    (error) => error.code === "RELEASE_COMMIT_IDENTITY_INVALID",
  );
  const crossBindingMutations = [
    ["releaseSha", (packet) => { packet.releaseHandoff.releaseSha = "f".repeat(40); }, "RELEASE_EXACT_SHA_EVIDENCE_MISMATCH"],
    ["candidateDigest", (packet) => { packet.releaseHandoff.candidateDigest = "f".repeat(64); }],
    ["sourceCommit", (packet) => { packet.releaseHandoff.sourceCommit = "f".repeat(40); }],
    ["targetBaselineCommit", (packet) => { packet.releaseHandoff.targetBaselineCommit = "f".repeat(40); }],
    ["checkerBundleDigest", (packet) => { packet.releaseHandoff.checkerBundleDigest = "f".repeat(64); }],
    ["checkerReleaseCommit", (packet) => { packet.releaseHandoff.checkerReleaseCommit = "f".repeat(40); }],
    ["manifestSha256", (packet) => { packet.releaseHandoff.manifestSha256 = "f".repeat(64); }],
    ["canonicalReceiptSha256", (packet) => { packet.releaseHandoff.canonicalReceiptSha256 = "f".repeat(64); }],
    ["closureSha256", (packet) => { packet.releaseHandoff.closureSha256 = "f".repeat(64); }],
    ["registrySha256", (packet) => { packet.releaseHandoff.registrySha256 = "f".repeat(64); }],
    ["registeredExecutionCommit", (packet) => { packet.releaseHandoff.registeredExecutionCommit = "f".repeat(40); }],
    ["storageCommit", (packet) => { packet.releaseHandoff.storageCommit = "f".repeat(40); }],
    ["finalizationCommit", (packet) => { packet.releaseHandoff.finalizationCommit = "f".repeat(40); }],
    ["directParentManifestSha256", (packet) => { packet.releaseHandoff.directParentManifestSha256 = "f".repeat(64); }],
    ["canonical evidence storage", (packet) => { packet.canonicalReceiptEvidence.storageCommit = "f".repeat(40); }],
    ["canonical evidence file", (packet) => { packet.canonicalReceiptEvidence.fileSha256 = "f".repeat(64); }],
    ["execution-storage ancestry", (packet) => { packet.releaseHandoff.executionAncestorOfStorage = false; }, "SCHEMA_VALIDATION_FAILED"],
    ["storage-finalization ancestry", (packet) => { packet.releaseHandoff.storageAncestorOfFinalization = false; }, "SCHEMA_VALIDATION_FAILED"],
    ["canonical receipt artifact", (packet) => { packet.receiptComparison.canonical.receiptSha256 = "f".repeat(64); }],
  ];
  for (const [label, mutate, expectedCode = "RESOLVER_TRUTH_MISMATCH"] of crossBindingMutations) {
    const packet = structuredClone(release);
    mutate(packet);
    assert.throws(
      () => validateJsonSchema(packet, schema, `release cross-binding ${label}`),
      (error) => error.code === expectedCode,
      label,
    );
  }
  const arbitraryDescendantRelabel = structuredClone(release);
  arbitraryDescendantRelabel.attemptRelation.storageCommit = intendedRelease;
  arbitraryDescendantRelabel.attemptRelation.finalizationCommit = intendedRelease;
  arbitraryDescendantRelabel.canonicalReceiptEvidence.storageCommit = intendedRelease;
  await assert.rejects(
    buildRepositoryValidatedReleaseHandoff(arbitraryDescendantRelabel, {
      repositoryAdapter: releaseAdapter,
      releaseSha: intendedRelease,
      canonicalReceiptEvidence,
      ...releaseAuthorityEvidence,
    }),
    (error) => error.code === "RELEASE_STORAGE_IDENTITY_REQUIRED",
  );
  const historicalClosurePromotion = structuredClone(release);
  historicalClosurePromotion.externalClosure.scope = "historical-direct-base";
  assert.throws(
    () => validateJsonSchema(historicalClosurePromotion, schema, "historical Closure cannot activate Shadow pass"),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
  release.releaseHandoff.a11Evidence.role = "A22";
  assert.throws(() => validateJsonSchema(release, schema, "wrong release role"), (error) => error.code === "SCHEMA_VALIDATION_FAILED");
});
