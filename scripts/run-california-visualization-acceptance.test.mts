import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { after, test, type TestContext } from "node:test";
import path from "node:path";
import ts from "typescript";

import {
  CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
} from "../tests/e2e/california-visualization-artifact-lifecycle";
import {
  __testingBuildCaliforniaSignatureMeasuredAuthorizationRequest,
  __testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority,
  CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT,
  CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME
} from "../tests/e2e/california-signature-exhaustive-artifact-lifecycle";

import {
  CALIFORNIA_ACCEPTANCE_ALL_AXES,
  CALIFORNIA_ACCEPTANCE_DISCOVERY_EXIT_CODE,
  CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
  CALIFORNIA_ACCEPTANCE_TMP_ROOT,
  CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
  CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
  CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
  CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES,
  CALIFORNIA_BROAD_OFFICIAL_SUFFIX,
  CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME,
  CALIFORNIA_BROAD_RUN_SEAL_FILENAME,
  CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL,
  CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX,
  CALIFORNIA_EXHAUSTIVE_RUN_MANIFEST_FILENAME,
  CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME,
  CALIFORNIA_PRODUCT_SMOKE_MANIFEST_FILENAME,
  CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS,
  CALIFORNIA_TERMINAL_FILE_ROLES,
  CaliforniaDiscoveryRedError,
  assertDiscoverySnapshotUnreviewed,
  assertFormalReviewedSnapshot,
  assertFreshStarshipRunRoot,
  assertPreparedStarshipRunRoot,
  assertKnownTopLevelInventory,
  assertLocalOnlyCommandPlans,
  buildCaliforniaAcceptanceEnvironment,
  buildCaliforniaCommandPlans,
  buildBroadProducerLifecycleContract,
  buildFinalAcceptanceManifest,
  buildLayerAReceipt,
  buildRunLayout,
  createIndependentSourceCopies,
  inventoryCaliforniaRunRoot,
  parseCaliforniaAcceptanceCli,
  parseDiscoveryCandidate,
  parseUniqueTerminalSealReceipt,
  publishCaliforniaProductSmokeManifest,
  publishFinalSeal,
  runCaliforniaSignatureExhaustiveProducerUnderCapacityHold,
  layerEnvironment,
  sourceManifestAggregate,
  stableJson,
  terminateExactProcessGroup,
  validateCaliforniaExhaustiveArtifactByteIdentities,
  validateGeneratedArtifactNames,
  verifyPlaywrightJsonReport,
  verifyBroadOpenRunAndReportBeforeFinalizer,
  verifyBroadTerminalSeal,
  verifyExhaustiveTerminalSeal,
  verifyManifestTree,
  verifyProductSmokeManifest,
  verifyPublishedFinalSeal,
  writeExclusiveJson,
  type CaliforniaFrozenSourceManifest,
  type CaliforniaExhaustiveStreamBinding,
  type CaliforniaInventoryRow,
  type CaliforniaProductSmokeManifest,
  type CaliforniaTerminalFileBinding,
  type CaliforniaTerminalReceipt
} from "./run-california-visualization-acceptance.mts";
import type { CaliforniaSignatureExecutionGroupOwnershipManifest } from
  "../tests/e2e/california-signature-exhaustive-artifact-lifecycle";
import { californiaSignatureEvidenceMerkleRootSha256 } from
  "../tests/e2e/california-signature-evidence-stream";

const PURE_ROOT_PREFIX = path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, "ca-viz-orchestrator-pure-");
const pureRoot = await mkdtemp(PURE_ROOT_PREFIX);

async function makeWritable(target: string): Promise<void> {
  const identity = await lstat(target).catch(() => null);
  if (!identity) return;
  if (identity.isSymbolicLink()) return;
  if (identity.isDirectory()) {
    await chmod(target, 0o700);
    for (const entry of await readdir(target)) await makeWritable(path.join(target, entry));
  } else {
    await chmod(target, 0o600).catch(() => undefined);
  }
}

after(async () => {
  await makeWritable(pureRoot);
  await rm(pureRoot, { force: true, recursive: true });
});

function digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function highEntropy(prefix: string) {
  return `${prefix}-${randomBytes(20).toString("hex")}`;
}

function cliArgs(runRoot: string) {
  return [
    "--acceptance-run-id", highEntropy("accept"),
    "--build-id", highEntropy("build"),
    "--capacity-plan-path", path.join(
      CALIFORNIA_ACCEPTANCE_TMP_ROOT,
      "capacity-plan-fixture-root",
      "capacity-plan.json"
    ),
    "--capacity-plan-sha256", digest("capacity-plan-fixture"),
    "--exhaustive-run-id", highEntropy("exhaustive"),
    "--layer-a-port", "43111",
    "--layer-b-port", "43112",
    "--matrix-run-id", highEntropy("matrix"),
    "--mode", "formal",
    "--run-root", runRoot,
    "--runtime-run-id", highEntropy("runtime")
  ];
}

function playwrightReport(options: {
  failed?: boolean;
  flakyStat?: number;
  projects?: string[];
  resultsPerTest?: number;
  retry?: number;
  skipped?: boolean;
}) {
  const projects = options.projects ?? [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS];
  return {
    stats: {
      flaky: options.flakyStat ?? 0,
      skipped: options.skipped ? projects.length : 0,
      unexpected: options.failed ? projects.length : 0
    },
    suites: [{
      specs: projects.map((projectName) => ({
        tests: [{
          projectName,
          results: Array.from({ length: options.resultsPerTest ?? 1 }, (_, index) => ({
            retry: options.retry ?? index,
            status: options.failed ? "failed" : options.skipped ? "skipped" : "passed"
          })),
          status: options.failed ? "unexpected" : options.skipped ? "skipped" : "expected"
        }],
        title: `smoke ${projectName}`
      })),
      title: "California product smoke"
    }]
  };
}

function productSmokeManifest(options: {
  acceptanceRunId: string;
  buildId: string;
  sourceSnapshotSha256: string;
}): CaliforniaProductSmokeManifest {
  const directoryRoutes = Array.from({ length: 76 }, (_, index) =>
    `us-ca-math-test-${String(index + 1).padStart(2, "0")}`
  );
  const crashpadDir = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    `product-smoke-${options.acceptanceRunId}`,
    "chrome-crashpad"
  );
  return {
    acceptanceRunId: options.acceptanceRunId,
    actualNextBuildId: highEntropy("next"),
    buildId: options.buildId,
    canvasNonTextClaim: false,
    checks: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) =>
      CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS.map((checkId) => ({
        checkId,
        projectName,
        status: "passed" as const
      }))
    ),
    crashpadContainment: {
      argument: `--breakpad-dump-location=${crashpadDir}`,
      scheme: "chrome-command-line-switch",
      verificationBoundary: {
        globalCrashpadSettingsIdentity: "external-runner-required",
        processTree: "external-runner-required"
      }
    },
    crashpadDir,
    directoryRoutes,
    graphicsReceipts: 0,
    instrumentation: "none",
    premiumRoutes: directoryRoutes.slice(0, 2),
    projects: [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS],
    receiptFiles: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName, index) => ({
      fileName: `${projectName}.product-smoke.passed.json`,
      projectName,
      sha256: String(index + 1).repeat(64)
    })),
    schemaVersion: 1,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "passed"
  };
}

function terminalReceipt(options: {
  artifactCount?: number;
  fileName: string;
  frozenSourceSnapshotSha256: string;
  playwrightReportSha256: string;
  producerSuccessSha256: string | null;
  sha: string;
  sourceHash: string;
  sourceSnapshotSha256: string | null;
  streamBindings?: CaliforniaExhaustiveStreamBinding[] | null;
}): CaliforniaTerminalReceipt {
  return {
    artifactCount: options.artifactCount ?? 2,
    fileName: options.fileName,
    frozenSourceSnapshotSha256: options.frozenSourceSnapshotSha256,
    playwrightReportSha256: options.playwrightReportSha256,
    producerSuccessSha256: options.producerSuccessSha256,
    sha256: options.sha,
    sourceHash: options.sourceHash,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "sealed",
    streamBindings: options.streamBindings ?? null
  };
}

function syntheticExhaustiveStreamFixture(
  runId = "synthetic-exhaustive-run",
  sourceSnapshotSha256 = digest("synthetic-exhaustive-source-snapshot")
) {
  const bindings: CaliforniaExhaustiveStreamBinding[] = [];
  const files: Array<{ bytes: Buffer; relativePath: string }> = [];
  for (let index = 0; index < 102; index += 1) {
    const suffix = String(index).padStart(3, "0");
    const projectName = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS[index % 2]!;
    const slotIndex = Math.floor(index / 2);
    const groupKey = [
      projectName,
      `SyntheticBench${String(slotIndex).padStart(3, "0")}`,
      `${projectName}-synthetic-axis-${String(slotIndex).padStart(3, "0")}`,
      "layout"
    ].join("\0");
    const executionGroupOwnership = {
      cropCount: 1,
      expectedRecordCount: 1,
      groupKeys: [groupKey],
      planSha256: digest("synthetic-capacity-plan"),
      receiptCount: 1,
      schemaVersion: 1 as const,
      sourceIdentitySha256: digest("synthetic-capacity-source-identity"),
      sourceSnapshotSha256
    };
    const artifactId = `ca-signature-artifact-${suffix}-000000000000000000000001`;
    const chunkFileName =
      `ca-signature-evidence-${suffix}-000000000000000000000001.evidence-000001.frame`;
    const chunkBytes = Buffer.from(`synthetic exhaustive chunk ${suffix}\n`, "utf8");
    const chunk = {
      fileName: chunkFileName,
      framedBytes: chunkBytes.length,
      recordCount: 1,
      recordMerkleRootSha256: digest(`synthetic record ${suffix}`),
      sha256: digest(chunkBytes)
    };
    const evidenceStream = {
      chunkMerkleRootSha256: californiaSignatureEvidenceMerkleRootSha256([chunk.sha256]),
      chunks: [chunk],
      framedBytes: chunk.framedBytes,
      recordCount: chunk.recordCount
    };
    const fileName = `artifact-${suffix}${CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX}`;
    const artifactBytes = Buffer.from(`${JSON.stringify({ artifactId, evidenceStream })}\n`, "utf8");
    bindings.push({
      artifactId,
      evidenceChunkMerkleRootSha256: evidenceStream.chunkMerkleRootSha256,
      evidenceChunks: [chunk],
      evidenceFramedBytes: chunk.framedBytes,
      evidenceManifestSha256: digest(stableJson(evidenceStream)),
      evidenceRecordCount: chunk.recordCount,
      evidenceStreamOwnershipSha256: digest(stableJson({
        evidenceManifestSha256: digest(stableJson(evidenceStream)),
        executionGroupOwnership
      })),
      executionGroupOwnership,
      fileName,
      sha256: digest(artifactBytes)
    });
    const relativeRoot = `layer-b/exhaustive-ledger/${runId}`;
    files.push(
      { bytes: artifactBytes, relativePath: `${relativeRoot}/${fileName}` },
      { bytes: chunkBytes, relativePath: `${relativeRoot}/${chunkFileName}` }
    );
  }
  return { bindings, files };
}

function syntheticExecutionGroupOwnershipManifest(
  bindings: readonly CaliforniaExhaustiveStreamBinding[],
  sourceSnapshotSha256: string
): CaliforniaSignatureExecutionGroupOwnershipManifest {
  assert.equal(bindings.length, 102);
  const capacityPlanSha256 = bindings[0]!.executionGroupOwnership.planSha256;
  const sourceIdentitySha256 = bindings[0]!.executionGroupOwnership.sourceIdentitySha256;
  const packages = Array.from({ length: 51 }, (_, slotIndex) => ({
    packageId: `signature-final-compositor-capacity-${String(slotIndex + 1).padStart(3, "0")}`,
    projects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName, projectIndex) => {
      const binding = bindings[slotIndex * 2 + projectIndex]!;
      assert.ok(binding.executionGroupOwnership.groupKeys[0]!.startsWith(`${projectName}\0`));
      return {
        benchIds: [`SyntheticBench${String(slotIndex).padStart(3, "0")}`],
        cropCount: binding.executionGroupOwnership.cropCount,
        expectedRecordCount: binding.executionGroupOwnership.expectedRecordCount,
        groupKeys: [...binding.executionGroupOwnership.groupKeys],
        projectName,
        receiptCount: binding.executionGroupOwnership.receiptCount
      };
    }),
    slotIndex
  }));
  return {
    capacityPlanSha256,
    cropCount: 102,
    evidenceRecordCount: 102,
    formalExecutionAuthorized: false,
    groupCount: 102,
    packages,
    receiptCount: 102,
    schemaVersion: 1,
    sourceIdentitySha256,
    sourceSnapshotSha256,
    status: "diagnostic-capacity-partition"
  };
}

function syntheticFinalInventory(): {
  exhaustiveStreamBindings: CaliforniaExhaustiveStreamBinding[];
  inventoryRows: CaliforniaInventoryRow[];
  terminalFiles: CaliforniaTerminalFileBinding[];
} {
  const exhaustive = syntheticExhaustiveStreamFixture();
  const terminalFiles = CALIFORNIA_TERMINAL_FILE_ROLES.map((role, index) => ({
    relativePath: `layer-a/evidence/${String(index).padStart(2, "0")}-${role}.json`,
    role,
    sha256: digest(`terminal:${role}`)
  }));
  const inventoryRows: CaliforniaInventoryRow[] = terminalFiles.map((binding) => ({
    kind: "file",
    mode: 0o600,
    path: binding.relativePath,
    sha256: binding.sha256,
    size: 1
  }));
  inventoryRows.push(...exhaustive.files.map((file) => ({
    kind: "file" as const,
    mode: 0o600,
    path: file.relativePath,
    sha256: digest(file.bytes),
    size: file.bytes.length
  })));
  inventoryRows.sort((left, right) => left.path.localeCompare(right.path));
  return { exhaustiveStreamBindings: exhaustive.bindings, inventoryRows, terminalFiles };
}

async function materializeFinalInventory(root: string): Promise<{
  acceptanceRunId: string;
  buildId: string;
  exhaustiveStreamBindings: CaliforniaExhaustiveStreamBinding[];
  inventoryRows: CaliforniaInventoryRow[];
  sourceManifestSha256: string;
  sourceSnapshotSha256: string;
  terminalFiles: CaliforniaTerminalFileBinding[];
}> {
  const acceptanceRunId = highEntropy("accept");
  const actualNextBuildId = highEntropy("next");
  const buildId = highEntropy("build");
  const sourceSnapshotSha256 = sourceManifestAggregate([]);
  const directoryRoutes = Array.from({ length: 76 }, (_, index) =>
    `us-ca-math-final-${String(index + 1).padStart(2, "0")}`
  );
  const premiumRoutes = directoryRoutes.slice(0, 2);
  const crashpadDir = path.join(
    root,
    "layer-a",
    "source",
    ".ca-acceptance",
    "playwright",
    "chrome-crashpad"
  );
  const exhaustive = syntheticExhaustiveStreamFixture(
    "synthetic-exhaustive-run",
    sourceSnapshotSha256
  );
  const executionGroupOwnership = syntheticExecutionGroupOwnershipManifest(
    exhaustive.bindings,
    sourceSnapshotSha256
  );
  const evidenceRoot = path.join(root, "layer-a", "evidence");
  await mkdir(evidenceRoot, { recursive: true });
  const terminalFiles: CaliforniaTerminalFileBinding[] = [];
  for (const [index, role] of CALIFORNIA_TERMINAL_FILE_ROLES.entries()) {
    const receiptProject = role === "layer-a-product-receipt-desktop"
      ? "desktop-chrome"
      : role === "layer-a-product-receipt-mobile" ? "mobile-chrome" : null;
    const relativePath = role === "source-manifest"
      ? ".california-visualization-frozen-source.json"
      : receiptProject
        ? `layer-a/evidence/product-smoke-receipts/${receiptProject}.product-smoke.passed.json`
        : role === "layer-a-product-manifest"
          ? `layer-a/evidence/${CALIFORNIA_PRODUCT_SMOKE_MANIFEST_FILENAME}`
          : role === "layer-a-product-report"
            ? "layer-a/evidence/product-smoke-playwright-report.json"
            : role === "layer-a-receipt"
              ? "layer-a/.california-visualization-layer-a-receipt.json"
              : role === "layer-a-seal"
                ? "layer-a/.california-visualization-layer-a-seal.json"
            : `layer-a/evidence/${String(index).padStart(2, "0")}-${role}.json`;
    const value = role === "source-manifest" ? {
      aggregateSha256: sourceSnapshotSha256,
      entries: [],
      entryCount: 0,
      gitHead: "a".repeat(40),
      schemaVersion: 1,
      worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
    } : receiptProject ? {
      acceptanceRunId,
      actualNextBuildId,
      buildId,
      canvasNonTextClaim: false,
      checks: [...CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS],
      crashpadContainment: {
        argument: `--breakpad-dump-location=${crashpadDir}`,
        scheme: "chrome-command-line-switch",
        verificationBoundary: {
          globalCrashpadSettingsIdentity: "external-runner-required",
          processTree: "external-runner-required"
        }
      },
      crashpadDir,
      directoryRoutes,
      graphicsReceipts: 0,
      instrumentation: "none",
      premiumRoutes,
      projectName: receiptProject,
      schemaVersion: 1,
      sourceSnapshotSha256,
      status: "passed"
    } : role === "layer-a-product-manifest" ? {
      acceptanceRunId,
      actualNextBuildId,
      buildId,
      canvasNonTextClaim: false,
      checks: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) =>
        CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS.map((checkId) => ({ checkId, projectName, status: "passed" }))
      ),
      crashpadContainment: {
        argument: `--breakpad-dump-location=${crashpadDir}`,
        scheme: "chrome-command-line-switch",
        verificationBoundary: {
          globalCrashpadSettingsIdentity: "external-runner-required",
          processTree: "external-runner-required"
        }
      },
      crashpadDir,
      directoryRoutes,
      graphicsReceipts: 0,
      instrumentation: "none",
      premiumRoutes,
      projects: [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS],
      receiptFiles: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName) => {
        const receiptRole = projectName === "desktop-chrome"
          ? "layer-a-product-receipt-desktop"
          : "layer-a-product-receipt-mobile";
        const binding = terminalFiles.find((candidate) => candidate.role === receiptRole);
        assert.ok(binding, `${receiptRole} fixture must precede the product manifest`);
        return {
          fileName: `${projectName}.product-smoke.passed.json`,
          projectName,
          sha256: binding.sha256
        };
      }),
      schemaVersion: 1,
      sourceSnapshotSha256,
      status: "passed"
    } : role === "exhaustive-execution-group-ownership"
      ? executionGroupOwnership
      : role === "layer-a-receipt" ? (() => {
      const productReport = terminalFiles.find((candidate) => candidate.role === "layer-a-product-report")!;
      const productManifest = terminalFiles.find((candidate) => candidate.role === "layer-a-product-manifest")!;
      return {
        acceptanceRunId,
        actualNextBuildId,
        buildId,
        canvasNonTextClaim: false,
        graphicsReceipts: 0,
        instrumentation: "none",
        playwrightReportSha256: productReport.sha256,
        productSmokeManifestSha256: productManifest.sha256,
        schemaVersion: 1,
        sourceSnapshotSha256,
        status: "passed"
      };
    })() : role === "layer-a-seal" ? (() => {
      const receipt = terminalFiles.find((candidate) => candidate.role === "layer-a-receipt")!;
      return {
        acceptanceRunId,
        buildId,
        canvasNonTextClaim: false,
        graphicsReceipts: 0,
        instrumentation: "none",
        receiptFileName: path.basename(receipt.relativePath),
        receiptSha256: receipt.sha256,
        schemaVersion: 1,
        sourceSnapshotSha256,
        status: "sealed"
      };
    })() : { role };
    const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
    await writeFile(path.join(root, relativePath), bytes, { mode: 0o600 });
    terminalFiles.push({ relativePath, role, sha256: digest(bytes) });
  }
  for (const file of exhaustive.files) {
    const target = path.join(root, file.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.bytes, { mode: 0o600 });
  }
  const sourceManifestSha256 = terminalFiles.find((binding) =>
    binding.role === "source-manifest")!.sha256;
  return {
    acceptanceRunId,
    buildId,
    exhaustiveStreamBindings: exhaustive.bindings,
    inventoryRows: await inventoryCaliforniaRunRoot(root),
    sourceManifestSha256,
    sourceSnapshotSha256,
    terminalFiles
  };
}

test("CLI requires an exact externally-owned identity set, two distinct explicit ports, and no unknown args", () => {
  const parsed = parseCaliforniaAcceptanceCli(cliArgs(path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, "fresh-cli-root")));
  assert.equal(parsed.mode, "formal");
  assert.equal(parsed.layerAPort, 43111);
  assert.equal(parsed.layerBPort, 43112);
  assert.throws(() => parseCaliforniaAcceptanceCli([
    ...cliArgs(path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, "fresh-cli-root-2")),
    "--unexpected", "value"
  ]), /exact values drifted/);
  const samePorts = cliArgs(path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, "fresh-cli-root-3"));
  samePorts[samePorts.indexOf("--layer-b-port") + 1] = "43111";
  assert.throws(() => parseCaliforniaAcceptanceCli(samePorts), /distinct ports/);
});

test("request-preparation CLI has one exact attempt identity and no authority or receipt injection", async () => {
  const existingCliKeys = [
    "--acceptance-run-id",
    "--build-id",
    "--capacity-plan-path",
    "--capacity-plan-sha256",
    "--exhaustive-run-id",
    "--layer-a-port",
    "--layer-b-port",
    "--matrix-run-id",
    "--mode",
    "--run-root",
    "--runtime-run-id"
  ] as const;
  const existingParsedKeys = [
    "acceptanceRunId",
    "buildId",
    "capacityPlanPath",
    "capacityPlanSha256",
    "exhaustiveRunId",
    "layerAPort",
    "layerBPort",
    "matrixRunId",
    "mode",
    "runRoot",
    "runtimeRunId"
  ] as const;
  const attemptId =
    "authorization-attempt-0123456789abcdef0123456789abcdef";
  const preparationArgs = (
    runRoot: string,
    suppliedAttemptId = attemptId
  ) => {
    const args = cliArgs(runRoot);
    args[args.indexOf("--mode") + 1] =
      "prepare-measured-authorization-request";
    args.push("--authorization-attempt-id", suppliedAttemptId);
    return args;
  };

  const validArgs = preparationArgs(path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    "fresh-request-preparation-root"
  ));
  assert.deepEqual(
    validArgs.filter((_, index) => index % 2 === 0).sort(),
    [...existingCliKeys, "--authorization-attempt-id"].sort(),
    "request preparation must accept exactly the existing CLI keys plus one attempt identity"
  );
  const parsed = parseCaliforniaAcceptanceCli(validArgs) as unknown as
    Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed).sort(), [
    ...existingParsedKeys,
    "authorizationAttemptId"
  ].sort(), "request-preparation parsed schema drifted");
  assert.equal(parsed.mode, "prepare-measured-authorization-request",
    "request-preparation mode was not preserved exactly");
  assert.equal(parsed.authorizationAttemptId, attemptId,
    "the externally supplied authorization attempt identity was not preserved exactly");

  const withoutAttempt = [...validArgs];
  withoutAttempt.splice(withoutAttempt.indexOf("--authorization-attempt-id"), 2);
  assert.throws(() => parseCaliforniaAcceptanceCli(withoutAttempt),
    /authorization-attempt-id|required|exact values|CLI options/i,
  "request preparation accepted a missing authorization attempt identity");
  assert.throws(() => parseCaliforniaAcceptanceCli([
    ...validArgs,
    "--authorization-attempt-id",
    attemptId
  ]), /supplied more than once|duplicate/i,
  "request preparation accepted a duplicate authorization attempt identity");
  assert.throws(() => parseCaliforniaAcceptanceCli(preparationArgs(
    path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT,
      "fresh-request-preparation-short-attempt-root"),
    "short"
  )), /authorizationAttemptId|authorization-attempt-id|high-entropy/i,
  "request preparation accepted a non-high-entropy attempt identity");

  for (const mode of ["formal", "discovery"] as const) {
    const args = cliArgs(path.join(
      CALIFORNIA_ACCEPTANCE_TMP_ROOT,
      `fresh-${mode}-unchanged-cli-root`
    ));
    args[args.indexOf("--mode") + 1] = mode;
    const existing = parseCaliforniaAcceptanceCli(args) as unknown as
      Record<string, unknown>;
    assert.deepEqual(Object.keys(existing).sort(), [...existingParsedKeys].sort(),
      `${mode} parsed CLI schema changed during request-preparation extension`);
    assert.equal(existing.mode, mode, `${mode} CLI mode was not preserved`);
    assert.throws(() => parseCaliforniaAcceptanceCli([
      ...args,
      "--authorization-attempt-id",
      attemptId
    ]), /exact values|CLI options|unknown/i,
    `${mode} accepted the request-preparation-only attempt identity`);
  }

  const forbiddenInputs = [
    "--attempt-ledger-root",
    "--authorization-ledger-root",
    "--authorization-request",
    "--authorization-request-path",
    "--authorization-request-sha256",
    "--receipt-path",
    "--receipt-sha256",
    "--reviewer-key"
  ] as const;
  for (const forbidden of ["--unknown-request-preparation-input", ...forbiddenInputs]) {
    assert.throws(() => parseCaliforniaAcceptanceCli([
      ...preparationArgs(path.join(
        CALIFORNIA_ACCEPTANCE_TMP_ROOT,
        `fresh-forbidden-${forbidden.slice(2)}-root`
      )),
      forbidden,
      "forbidden-value"
    ]), /exact values|CLI options|unknown/i,
    `request preparation accepted forbidden input ${forbidden}`);
  }

  const runnerSource = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  ), "utf8");
  assert.doesNotMatch(
    runnerSource,
    /CA_[A-Z0-9_]*AUTHORIZATION_ATTEMPT(?:_ID)?|process\.env\.[A-Za-z0-9_]*authorizationAttempt/i,
    "authorization attempt identity must have no environment fallback"
  );
});

test("receipt-bound measured execution CLI accepts only an attempt identity and external receipt SHA", () => {
  const runRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    "fresh-measured-execution-cli-root"
  );
  const authorizationAttemptId = highEntropy("measured-execution-attempt");
  const authorizationReceiptSha256 = digest("owner-reviewed-production-receipt");
  const args = cliArgs(runRoot);
  args[args.indexOf("--mode") + 1] = "execute-measured-authorization";
  args.push(
    "--authorization-attempt-id",
    authorizationAttemptId,
    "--authorization-receipt-sha256",
    authorizationReceiptSha256
  );

  const parsed = parseCaliforniaAcceptanceCli(args) as unknown as
    Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed).sort(), [
    "acceptanceRunId",
    "authorizationAttemptId",
    "authorizationReceiptSha256",
    "buildId",
    "capacityPlanPath",
    "capacityPlanSha256",
    "exhaustiveRunId",
    "layerAPort",
    "layerBPort",
    "matrixRunId",
    "mode",
    "runRoot",
    "runtimeRunId"
  ].sort(), "receipt-bound measured execution parsed schema drifted");
  assert.equal(parsed.mode, "execute-measured-authorization");
  assert.equal(parsed.authorizationAttemptId, authorizationAttemptId);
  assert.equal(parsed.authorizationReceiptSha256, authorizationReceiptSha256);

  for (const forbidden of [
    "--authorization-ledger-root",
    "--authorization-request-path",
    "--authorization-request-sha256",
    "--authorization-receipt-path",
    "--project",
    "--repeat-each",
    "--reporter",
    "--retries",
    "--reviewer-key",
    "--spec",
    "--workers"
  ]) {
    assert.throws(() => parseCaliforniaAcceptanceCli([
      ...args,
      forbidden,
      "forbidden-caller-input"
    ]), /exact values|CLI options|unknown/i,
    `receipt-bound measured execution accepted forbidden input ${forbidden}`);
  }
});

test("production measured-authorization request preparation is source-bound and publication-only", async () => {
  const runnerSourcePath = path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  );
  const runnerSource = await readFile(runnerSourcePath, "utf8");
  const runnerAst = ts.createSourceFile(
    runnerSourcePath,
    runnerSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const helperName = "runCaliforniaMeasuredAuthorizationRequestPreparation";
  const helpers = runnerAst.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === helperName
  );
  assert.equal(helpers.length, 1,
    "production request preparation requires one private helper");
  const helper = helpers[0]!;
  assert.ok(helper.body, "production request-preparation helper has no body");
  assert.equal(ts.getCombinedModifierFlags(helper) & ts.ModifierFlags.Export, 0,
    "production request-preparation helper must remain private");
  assert.notEqual(ts.getCombinedModifierFlags(helper) & ts.ModifierFlags.Async, 0,
    "production request-preparation helper must be async");
  const helperSource = helper.getText(runnerAst);

  for (const requiredCall of [
    "assertFreshStarshipRunRoot",
    "buildSourceManifest",
    "buildCaliforniaSignatureMeasuredAuthorizationRequest",
    "createIndependentSourceCopies",
    "createRunDirectories",
    "publishCaliforniaSignatureExecutionGroupOwnership",
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  ]) {
    assert.match(helperSource, new RegExp(`\\b${requiredCall}\\s*\\(`),
      `production request preparation does not call ${requiredCall}`);
  }
  assert.doesNotMatch(helperSource,
    /\b(?:assertPortFree|instrument|runBuild|runServerBoundCommand|startServer|verifyCaliforniaSignatureMeasuredAuthorizationForLaunch)\s*\(/,
  "production request preparation reached build, server, browser, port, or launch authorization work");
  assert.ok(
    helperSource.indexOf("buildCaliforniaSignatureMeasuredAuthorizationRequest(") <
      helperSource.indexOf("publishCaliforniaSignatureMeasuredAuthorizationRequest("),
    "production request preparation must build from fixed-ledger authority before publication"
  );

  const entrypoint = runnerAst.statements.find((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "runCaliforniaVisualizationAcceptance"
  );
  assert.ok(entrypoint?.body, "production acceptance entrypoint is missing");
  const entrypointSource = entrypoint.body.getText(runnerAst);
  assert.match(entrypointSource,
    /if\s*\(cli\.mode\s*===\s*["']prepare-measured-authorization-request["']\)\s*\{\s*return\s+await\s+runCaliforniaMeasuredAuthorizationRequestPreparation\s*\(/,
  "production preparation mode does not return through its publication-only helper");
  assert.doesNotMatch(entrypointSource,
    /prepare-measured-authorization-request[\s\S]{0,160}CaliforniaMeasuredAuthorizationPreparationHoldError/,
  "production preparation mode still throws the obsolete fixed HOLD");
});

test("receipt-bound measured execution verifies before one exhaustive-only Playwright launch", async () => {
  const runnerSourcePath = path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  );
  const runnerSource = await readFile(runnerSourcePath, "utf8");
  assert.match(runnerSource,
    /export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_PATH\s*=\s*\n?\s*["']\/Volumes\/Starship\/\.california-signature-measured-authorization-receipts-v1\/\.california-signature-measured-authorization-receipt\.json["']/,
  "runner does not own the one fixed external production receipt path");
  const runnerAst = ts.createSourceFile(
    runnerSourcePath,
    runnerSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const helperName = "runCaliforniaMeasuredAuthorizationExecution";
  const helpers = runnerAst.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === helperName
  );
  assert.equal(helpers.length, 1,
    "receipt-bound measured execution requires one private helper");
  const helper = helpers[0]!;
  assert.ok(helper.body, "receipt-bound measured execution helper has no body");
  assert.equal(ts.getCombinedModifierFlags(helper) & ts.ModifierFlags.Export, 0,
    "receipt-bound measured execution helper must remain private");
  const helperSource = helper.getText(runnerAst);
  for (const requiredCall of [
    "assertPreparedStarshipRunRoot",
    "launchCaliforniaMeasuredAuthorizationExhaustive",
    "readCaliforniaSignatureMeasuredAuthorizationRequest",
    "readCaliforniaSignatureMeasuredAuthorizationReceipt",
    "runBuild",
    "verifyExhaustiveTerminalSeal",
    "verifyPlaywrightJsonReport"
  ]) {
    assert.match(helperSource, new RegExp(`\\b${requiredCall}\\s*\\(`),
      `receipt-bound measured execution does not call ${requiredCall}`);
  }
  assert.doesNotMatch(helperSource,
    /plans\.(?:buildA|broad|productSmoke|startA)\b|runServerBoundCommand\s*\(/,
  "receipt-bound measured execution can reach Layer A, product-smoke, or broad Playwright work");
  assert.equal((helperSource.match(/plan\s*:\s*plans\.exhaustive\b/g) ?? []).length, 1,
    "receipt-bound measured execution must select exactly one exhaustive Playwright plan");
  const receiptReadIndex = helperSource.indexOf(
    "readCaliforniaSignatureMeasuredAuthorizationReceipt("
  );
  const buildIndex = helperSource.indexOf("runBuild(");
  const serverIndex = helperSource.indexOf("operations.startServer(");
  const verifierIndex = helperSource.indexOf(
    "launchCaliforniaMeasuredAuthorizationExhaustive("
  );
  const exhaustiveIndex = helperSource.indexOf("plan: plans.exhaustive");
  assert.ok(
    receiptReadIndex >= 0 && receiptReadIndex < buildIndex && buildIndex < serverIndex &&
      serverIndex < verifierIndex && verifierIndex < exhaustiveIndex,
    "receipt validation, Layer-B build, server, consumption, and exhaustive launch order drifted"
  );
  assert.match(runnerSource,
    /\[CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV\]\s*:\s*CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE/,
  "authorized launch callback does not set the exact lifecycle-owned runner guard");
  assert.match(helperSource,
    /verifyForLaunch\s*:\s*\n?\s*verifyCaliforniaSignatureMeasuredAuthorizationForLaunch/,
  "production measured execution does not delegate its sole launch seam to the production verifier");
  assert.match(helperSource,
    /const\s+externalCapacityPlanPublication\s*=\s*await\s+readCaliforniaExternalCapacityPartitionPlan\s*\(/,
  "receipt-bound measured execution does not retain the independently verified external capacity plan");
  assert.match(helperSource,
    /executionGroupOwnershipPublication\.manifest\.capacityPlanSha256\s*,\s*externalCapacityPlanPublication\.plan\.planSha256\s*,/,
  "receipt-bound measured execution confuses the ownership plan digest with the external file receipt");
  assert.doesNotMatch(helperSource,
    /executionGroupOwnershipPublication\.manifest\.capacityPlanSha256\s*,\s*cli\.capacityPlanSha256\s*,/,
  "receipt-bound measured execution compares unlike internal-plan and external-file SHA domains");

  const entrypoint = runnerAst.statements.find((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "runCaliforniaVisualizationAcceptance"
  );
  assert.ok(entrypoint?.body, "production acceptance entrypoint is missing");
  assert.match(entrypoint.body.getText(runnerAst),
    /if\s*\(cli\.mode\s*===\s*["']execute-measured-authorization["']\)\s*\{\s*return\s+await\s+runCaliforniaMeasuredAuthorizationExecution\s*\(/,
  "receipt-bound execution mode does not return through its dedicated helper");
});

test("measured launch seam enters one exact exhaustive Playwright command and nothing else", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const launchIntegration = Reflect.get(
    runnerModule,
    "__testingLaunchCaliforniaMeasuredAuthorizationExhaustive"
  );
  assert.equal(typeof launchIntegration, "function",
    "runner must expose one isolated measured-launch integration for fake-authority tests");
  const layout = buildRunLayout(path.join(pureRoot, "measured-launch-seam"));
  const entrypoints = {
    nextCli: path.join(
      CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
      "node_modules/next/dist/bin/next"
    ),
    playwrightCli: path.join(
      CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
      "node_modules/@playwright/test/cli.js"
    ),
    tsxLoader: path.join(
      CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
      "node_modules/tsx/dist/loader.mjs"
    )
  };
  const plans = buildCaliforniaCommandPlans({ entrypoints, layout });
  const commandCalls: Array<Record<string, unknown>> = [];
  let verifierCalls = 0;
  let callbackCalls = 0;
  const authorization = Object.freeze({ opaque: "test-only-authorization-brand" });
  const launchContext = Object.freeze({
    attemptId: highEntropy("measured-launch-attempt"),
    buildId: highEntropy("measured-launch-build"),
    executionPlanSha256: digest("measured-launch-plan"),
    launchCommand: Object.freeze({
      projects: ["desktop-chrome", "mobile-chrome"] as const,
      repeatEach: 1 as const,
      reporter: "json" as const,
      retries: 0 as const,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts" as const,
      workers: 1 as const
    }),
    requiredProjects: ["desktop-chrome", "mobile-chrome"] as const,
    sourceSnapshotSha256: digest("measured-launch-source")
  });
  const result = await launchIntegration({
    authorization,
    env: { PLAYWRIGHT_SKIP_WEBSERVER: "1" },
    launchContext,
    operations: {
      async runCommand(options: Record<string, unknown>) {
        commandCalls.push(options);
        return "EXACT_EXHAUSTIVE_COMMAND_COMPLETED";
      }
    },
    plan: plans.exhaustive,
    stderrPath: path.join(layout.layerBRoot, "logs", "exhaustive.stderr.log"),
    stdoutPath: layout.exhaustiveReportPath,
    testOnlyVerifyForLaunch(options: {
      authorization: unknown;
      launch: () => Promise<unknown>;
      launchContext: unknown;
    }) {
      verifierCalls += 1;
      assert.equal(options.authorization, authorization);
      assert.equal(options.launchContext, launchContext);
      callbackCalls += 1;
      return options.launch();
    }
  });

  assert.equal(result, "EXACT_EXHAUSTIVE_COMMAND_COMPLETED");
  assert.equal(verifierCalls, 1, "measured launch seam repeated verifier entry");
  assert.equal(callbackCalls, 1, "measured launch seam repeated launch callback entry");
  assert.equal(commandCalls.length, 1,
    "measured launch seam spawned more than one command");
  const command = commandCalls[0]!;
  assert.equal(command.label, plans.exhaustive.label);
  assert.deepEqual(command.argv, plans.exhaustive.argv);
  assert.doesNotMatch(String(command.label), /broad|product smoke/i);
  assert.deepEqual(command.argv, [
    process.execPath,
    entrypoints.playwrightCli,
    "test",
    "tests/e2e/california-signature-exhaustive.spec.ts",
    "--project",
    "desktop-chrome",
    "--project",
    "mobile-chrome",
    "--workers=1",
    "--retries=0",
    "--repeat-each=1",
    "--reporter=json"
  ]);
  assert.equal(
    (command.env as NodeJS.ProcessEnv)
      .CA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD,
    "owner-approved-runner-verified-and-consumed-v1"
  );
});

test("measured-authorization publication parent-mode source policy admits safe shared-read parents without weakening exact-0700 roots", async () => {
  const runnerSourcePath = path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  );
  const runnerSource = await readFile(runnerSourcePath, "utf8");
  const runnerAst = ts.createSourceFile(
    runnerSourcePath,
    runnerSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const parentHelperName =
    "assertMeasuredAuthorizationPublicationOwnedPhysicalParent";
  const strictRootHelperName =
    "assertMeasuredAuthorizationPublicationOwnedPhysicalRoot";
  const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
    ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
      modifier.kind === kind) === true;
  const topLevelFunctions = (name: string) => runnerAst.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name
  );

  const parentHelpers = topLevelFunctions(parentHelperName);
  assert.equal(parentHelpers.length, 1,
    "measured-authorization publication requires one distinct private physical-parent policy helper");
  const parentHelper = parentHelpers[0]!;
  assert.equal(hasModifier(parentHelper, ts.SyntaxKind.ExportKeyword), false,
    "measured-authorization physical-parent policy helper must not be exported");
  assert.equal(hasModifier(parentHelper, ts.SyntaxKind.DefaultKeyword), false,
    "measured-authorization physical-parent policy helper must not be a default export");
  assert.equal(hasModifier(parentHelper, ts.SyntaxKind.AsyncKeyword), true,
    "measured-authorization physical-parent policy helper must be async");
  assert.ok(parentHelper.body,
    "measured-authorization physical-parent policy helper has no executable body");
  assert.equal(parentHelper.parameters.length, 2,
    "measured-authorization physical-parent policy helper must accept only root and label");
  assert.ok(parentHelper.parameters.every((parameter) => ts.isIdentifier(parameter.name)),
    "measured-authorization physical-parent policy helper parameters must be plain identifiers");
  const parentRootName = (parentHelper.parameters[0]!.name as ts.Identifier).text;
  const parentLabelName = (parentHelper.parameters[1]!.name as ts.Identifier).text;
  assert.notEqual(parentRootName, parentLabelName,
    "measured-authorization physical-parent policy helper collapsed root and label");

  const calleeName = (call: ts.CallExpression): string | null => {
    if (ts.isIdentifier(call.expression)) return call.expression.text;
    if (ts.isPropertyAccessExpression(call.expression) &&
      ts.isIdentifier(call.expression.expression)) {
      return `${call.expression.expression.text}.${call.expression.name.text}`;
    }
    return null;
  };
  const callsWithin = (node: ts.Node, name: string) => {
    const calls: ts.CallExpression[] = [];
    const visit = (candidate: ts.Node): void => {
      if (ts.isCallExpression(candidate) && calleeName(candidate) === name) calls.push(candidate);
      ts.forEachChild(candidate, visit);
    };
    visit(node);
    return calls;
  };
  const identifiersEqual = (node: ts.Node | undefined, name: string) =>
    !!node && ts.isIdentifier(node) && node.text === name;
  const propertyEquals = (
    node: ts.Node | undefined,
    owner: string,
    property: string
  ) => !!node && ts.isPropertyAccessExpression(node) &&
    identifiersEqual(node.expression, owner) && node.name.text === property;
  const callEquals = (node: ts.Node | undefined, name: string) =>
    !!node && ts.isCallExpression(node) && calleeName(node) === name;
  const awaitedCallEquals = (node: ts.Node | undefined, name: string) =>
    !!node && ts.isAwaitExpression(node) && callEquals(node.expression, name)
      ? node.expression as ts.CallExpression
      : null;
  const bigintValue = (node: ts.Node | undefined): bigint | null => {
    if (!node) return null;
    if (ts.isBigIntLiteral(node)) return BigInt(node.text.slice(0, -1));
    if (ts.isCallExpression(node) && identifiersEqual(node.expression, "BigInt") &&
      node.arguments.length === 1 && ts.isNumericLiteral(node.arguments[0]!)) {
      return BigInt(node.arguments[0]!.text);
    }
    return null;
  };
  const bitAndEquals = (
    node: ts.Node | undefined,
    left: (candidate: ts.Expression) => boolean,
    mask: bigint
  ) => !!node && ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.AmpersandToken &&
    left(node.left) && bigintValue(node.right) === mask;
  const directVariable = (body: ts.Block, name: string) => {
    for (let index = 0; index < body.statements.length; index += 1) {
      const statement = body.statements[index]!;
      if (!ts.isVariableStatement(statement) ||
        statement.declarationList.declarations.length !== 1) continue;
      const declaration = statement.declarationList.declarations[0]!;
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return { declaration, index, statement };
      }
    }
    return null;
  };
  const directStatementIndex = (body: ts.Block, node: ts.Node) =>
    body.statements.findIndex((statement) =>
      node.getStart(runnerAst) >= statement.getStart(runnerAst) &&
      node.getEnd() <= statement.getEnd());
  const assertDirectExpressionCall = (
    body: ts.Block,
    call: ts.CallExpression,
    label: string
  ) => {
    const index = directStatementIndex(body, call);
    assert.ok(index >= 0 && ts.isExpressionStatement(body.statements[index]!) &&
      (body.statements[index] as ts.ExpressionStatement).expression === call,
      `${label} must be one live direct top-level statement`);
    return index;
  };
  const nestedParentFunctions: ts.Node[] = [];
  const visitParentForFunctions = (node: ts.Node): void => {
    if (node !== parentHelper && ts.isFunctionLike(node)) nestedParentFunctions.push(node);
    ts.forEachChild(node, visitParentForFunctions);
  };
  visitParentForFunctions(parentHelper.body!);
  assert.deepEqual(nestedParentFunctions, [],
    "measured-authorization physical-parent checks must not hide in nested functions");
  assert.equal(parentHelper.body!.statements.length, 10,
    "physical-parent policy must contain exactly ten top-level statements");

  const parentEqualCalls = callsWithin(parentHelper.body!, "assert.equal");
  const normalizedCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return callEquals(actual, "path.resolve") &&
      (actual as ts.CallExpression).arguments.length === 1 &&
      identifiersEqual((actual as ts.CallExpression).arguments[0], parentRootName) &&
      identifiersEqual(expected, parentRootName);
  });
  assert.ok(normalizedCall,
    "physical-parent policy must require one absolute normalized root before I/O");
  const processUidFunctionCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return !!actual && ts.isTypeOfExpression(actual) &&
      propertyEquals(actual.expression, "process", "getuid") &&
      !!expected && ts.isStringLiteral(expected) && expected.text === "function";
  });
  assert.ok(processUidFunctionCall,
    "physical-parent policy must require a current process UID before I/O");

  const identityVariable = directVariable(parentHelper.body!, "identity");
  assert.ok(identityVariable &&
    (identityVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "physical-parent policy must capture identity in one direct const declaration");
  const identityLstatCall = awaitedCallEquals(identityVariable!.declaration.initializer, "lstat");
  assert.ok(identityLstatCall && identityLstatCall.arguments.length === 2 &&
    identifiersEqual(identityLstatCall.arguments[0], parentRootName) &&
    ts.isObjectLiteralExpression(identityLstatCall.arguments[1]!) &&
    identityLstatCall.arguments[1]!.properties.length === 1,
  "physical-parent policy must await one bigint lstat of its exact root");
  const bigintProperty = (identityLstatCall!.arguments[1] as ts.ObjectLiteralExpression)
    .properties[0];
  assert.ok(bigintProperty && ts.isPropertyAssignment(bigintProperty) &&
    bigintProperty.name.getText(runnerAst) === "bigint" &&
    bigintProperty.initializer.kind === ts.SyntaxKind.TrueKeyword,
  "physical-parent policy lstat must request bigint identity fields");

  const parentOkCalls = callsWithin(parentHelper.body!, "assert.ok");
  const physicalCall = parentOkCalls.find((call) => {
    const actual = call.arguments[0];
    if (!actual || !ts.isBinaryExpression(actual) ||
      actual.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken ||
      !callEquals(actual.left, "identity.isDirectory")) return false;
    return ts.isPrefixUnaryExpression(actual.right) &&
      actual.right.operator === ts.SyntaxKind.ExclamationToken &&
      callEquals(actual.right.operand, "identity.isSymbolicLink");
  });
  assert.ok(physicalCall,
    "physical-parent policy must reject non-directories and symbolic links");
  const ownerCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    if (!propertyEquals(actual, "identity", "uid") ||
      !callEquals(expected, "BigInt")) return false;
    const expectedCall = expected as ts.CallExpression;
    return expectedCall.arguments.length === 1 &&
      callEquals(expectedCall.arguments[0], "process.getuid");
  });
  assert.ok(ownerCall,
    "physical-parent policy must require ownership by the current process UID");

  const permissionsVariable = directVariable(parentHelper.body!, "permissions");
  assert.ok(permissionsVariable &&
    (permissionsVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
    bitAndEquals(
      permissionsVariable.declaration.initializer,
      (candidate) => propertyEquals(candidate, "identity", "mode"),
      BigInt(0o777)
    ),
  "physical-parent policy must compute permissions as identity.mode & 0777");
  const ownerRwxCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return bitAndEquals(
      actual,
      (candidate) => identifiersEqual(candidate, "permissions"),
      BigInt(0o700)
    ) && bigintValue(expected) === BigInt(0o700);
  });
  assert.ok(ownerRwxCall,
    "physical-parent policy must require every owner rwx bit");
  const noGroupWorldWriteCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return bitAndEquals(
      actual,
      (candidate) => identifiersEqual(candidate, "permissions"),
      BigInt(0o022)
    ) && bigintValue(expected) === BigInt(0);
  });
  assert.ok(noGroupWorldWriteCall,
    "physical-parent policy must reject all group/world-write permission bits");
  const realpathCall = parentEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return !!actual && ts.isAwaitExpression(actual) &&
      callEquals(actual.expression, "realpath") &&
      (actual.expression as ts.CallExpression).arguments.length === 1 &&
      identifiersEqual((actual.expression as ts.CallExpression).arguments[0], parentRootName) &&
      identifiersEqual(expected, parentRootName);
  });
  assert.ok(realpathCall,
    "physical-parent policy must require exact realpath equality");
  const parentReturnIndexes = parentHelper.body!.statements.flatMap((statement, index) =>
    ts.isReturnStatement(statement) ? [index] : []);
  assert.deepEqual(parentReturnIndexes, [parentHelper.body!.statements.length - 1],
    "physical-parent policy must have one final direct return");
  const parentReturn = parentHelper.body!.statements[parentReturnIndexes[0]!] as ts.ReturnStatement;
  assert.ok(callEquals(parentReturn.expression, "measuredAuthorizationPublicationRootIdentity") &&
    (parentReturn.expression as ts.CallExpression).arguments.length === 1 &&
    identifiersEqual((parentReturn.expression as ts.CallExpression).arguments[0], "identity"),
  "physical-parent policy must return the complete captured root identity");

  const allParentBodyCalls: ts.CallExpression[] = [];
  const allParentBodyIdentifiers: ts.Identifier[] = [];
  const forbiddenParentMutationNodes: ts.Node[] = [];
  const visitExclusiveParentBody = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) allParentBodyCalls.push(node);
    if (ts.isIdentifier(node)) allParentBodyIdentifiers.push(node);
    if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      forbiddenParentMutationNodes.push(node);
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken)) {
      forbiddenParentMutationNodes.push(node);
    }
    if (ts.isDeleteExpression(node) || ts.isNewExpression(node)) {
      forbiddenParentMutationNodes.push(node);
    }
    ts.forEachChild(node, visitExclusiveParentBody);
  };
  visitExclusiveParentBody(parentHelper.body!);
  const parentCallCounts = new Map<string, number>();
  for (const call of allParentBodyCalls) {
    const name = calleeName(call);
    assert.ok(name, "physical-parent policy contains an indirect or computed call");
    parentCallCounts.set(name!, (parentCallCounts.get(name!) ?? 0) + 1);
  }
  assert.deepEqual(
    [...parentCallCounts.entries()].sort(([left], [right]) => left.localeCompare(right)),
    [
      ["BigInt", 6],
      ["assert.equal", 6],
      ["assert.ok", 1],
      ["identity.isDirectory", 1],
      ["identity.isSymbolicLink", 1],
      ["lstat", 1],
      ["measuredAuthorizationPublicationRootIdentity", 1],
      ["path.resolve", 1],
      ["process.getuid", 1],
      ["realpath", 1]
    ].sort(([left], [right]) => left.localeCompare(right)),
    "physical-parent policy contains missing, repeated, indirect, or unaudited calls"
  );
  assert.equal(parentEqualCalls.length, 6,
    "physical-parent policy must contain exactly six assert.equal calls");
  assert.equal(parentOkCalls.length, 1,
    "physical-parent policy must contain exactly one assert.ok call");
  assert.equal(callsWithin(parentHelper.body!, "lstat").length, 1,
    "physical-parent policy must contain exactly one lstat call");
  assert.equal(callsWithin(parentHelper.body!, "realpath").length, 1,
    "physical-parent policy must contain exactly one realpath call");
  assert.equal(callsWithin(parentHelper.body!, "path.resolve").length, 1,
    "physical-parent policy must contain exactly one path.resolve call");
  const allowedParentIdentifiers = new Set([
    "BigInt",
    "assert",
    "bigint",
    "equal",
    "getuid",
    "identity",
    "isDirectory",
    "isSymbolicLink",
    "lstat",
    "measuredAuthorizationPublicationRootIdentity",
    "mode",
    "ok",
    "path",
    "permissions",
    "process",
    "realpath",
    "resolve",
    "uid",
    parentLabelName,
    parentRootName
  ]);
  assert.deepEqual(
    allParentBodyIdentifiers
      .map((identifier) => identifier.text)
      .filter((identifier) => !allowedParentIdentifiers.has(identifier)),
    [],
    "physical-parent policy contains an unaudited identifier"
  );
  assert.deepEqual(forbiddenParentMutationNodes, [],
    "physical-parent policy contains assignment, update, delete, or construction mutation");
  const permissionsIdentifiers = allParentBodyIdentifiers.filter((identifier) =>
    identifier.text === "permissions");
  const ownerPermissionsUse = (ownerRwxCall!.arguments[0] as ts.BinaryExpression).left;
  const noWritePermissionsUse =
    (noGroupWorldWriteCall!.arguments[0] as ts.BinaryExpression).left;
  assert.deepEqual(permissionsIdentifiers, [
    permissionsVariable!.declaration.name,
    ownerPermissionsUse,
    noWritePermissionsUse
  ], "permissions identifier must occur only in its declaration and two exact mask checks");

  const parentChronology = [
    assertDirectExpressionCall(parentHelper.body!, normalizedCall!, "normalized-root assertion"),
    assertDirectExpressionCall(parentHelper.body!, processUidFunctionCall!, "process-UID assertion"),
    identityVariable!.index,
    assertDirectExpressionCall(parentHelper.body!, physicalCall!, "physical-directory assertion"),
    assertDirectExpressionCall(parentHelper.body!, ownerCall!, "same-owner assertion"),
    permissionsVariable!.index,
    assertDirectExpressionCall(parentHelper.body!, ownerRwxCall!, "owner-rwx assertion"),
    assertDirectExpressionCall(
      parentHelper.body!,
      noGroupWorldWriteCall!,
      "group/world-write assertion"
    ),
    assertDirectExpressionCall(parentHelper.body!, realpathCall!, "realpath assertion"),
    parentReturnIndexes[0]!
  ];
  assert.deepEqual(parentChronology, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    "physical-parent policy is not the exclusive exact ten-statement fail-closed sequence");

  const admitsParentMode = (permissions: number) =>
    (permissions & 0o700) === 0o700 && (permissions & 0o022) === 0;
  for (const admitted of [0o700, 0o710, 0o750, 0o755]) {
    assert.equal(admitsParentMode(admitted), true,
      `physical-parent policy rejected required safe mode ${admitted.toString(8)}`);
  }
  for (let permissions = 0; permissions <= 0o777; permissions += 1) {
    if ((permissions & 0o700) !== 0o700 || (permissions & 0o022) !== 0) {
      assert.equal(admitsParentMode(permissions), false,
        `physical-parent policy admitted unsafe mode ${permissions.toString(8)}`);
    }
  }

  const createDeclarations = topLevelFunctions("createRunDirectories");
  assert.equal(createDeclarations.length, 1,
    "run-directory creation must remain one private function declaration");
  const createDeclaration = createDeclarations[0]!;
  assert.ok(createDeclaration.body, "run-directory creation has no executable body");
  const allParentCalls = callsWithin(runnerAst, parentHelperName);
  const createParentCalls = callsWithin(createDeclaration.body!, parentHelperName);
  assert.equal(allParentCalls.length, 1,
    "physical-parent policy helper must have exactly one whole-runner call site");
  assert.deepEqual(createParentCalls, allParentCalls,
    "physical-parent policy helper call escaped createRunDirectories");
  const authorizedParentVariable = directVariable(
    createDeclaration.body!,
    "authorizedParentIdentity"
  );
  assert.ok(authorizedParentVariable &&
    (authorizedParentVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "createRunDirectories must capture authorizedParentIdentity in one direct const");
  const createParentCall = awaitedCallEquals(
    authorizedParentVariable!.declaration.initializer,
    parentHelperName
  );
  assert.ok(createParentCall === createParentCalls[0] &&
    createParentCall.arguments.length === 2 &&
    identifiersEqual(
      createParentCall.arguments[0],
      "CALIFORNIA_ACCEPTANCE_TMP_ROOT"
    ),
  "createRunDirectories must validate the fixed .tmp parent into authorizedParentIdentity");
  const mkdirCalls = callsWithin(createDeclaration.body!, "mkdir")
    .sort((left, right) => left.getStart(runnerAst) - right.getStart(runnerAst));
  assert.ok(mkdirCalls.length > 0,
    "createRunDirectories contains no observable directory creation");
  assert.ok(createParentCall.getStart(runnerAst) < mkdirCalls[0]!.getStart(runnerAst),
    "fixed parent validation must precede the first mkdir/layout mutation");

  const strictDeclarations = topLevelFunctions(strictRootHelperName);
  assert.equal(strictDeclarations.length, 1,
    "measured-authorization strict physical-root helper must remain unique");
  const strictDeclaration = strictDeclarations[0]!;
  assert.ok(strictDeclaration.body,
    "measured-authorization strict physical-root helper has no body");
  const strictEqualCalls = callsWithin(strictDeclaration.body!, "assert.equal");
  const strict0700Calls = strictEqualCalls.filter((call) => {
    const [actual, expected] = call.arguments;
    return bitAndEquals(
      actual,
      (candidate) => propertyEquals(candidate, "identity", "mode"),
      BigInt(0o777)
    ) && bigintValue(expected) === BigInt(0o700);
  });
  assert.equal(strict0700Calls.length, 1,
    "strict physical-root helper no longer enforces identity.mode & 0777 === 0700");

  const createStrictCalls = callsWithin(createDeclaration.body!, strictRootHelperName);
  assert.equal(createStrictCalls.length, 1,
    "createRunDirectories must use the strict physical-root helper exactly once");
  const rootIdentityVariable = directVariable(createDeclaration.body!, "rootIdentity");
  assert.ok(rootIdentityVariable &&
    (rootIdentityVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "createRunDirectories must capture strict rootIdentity in one direct const");
  const createStrictCall = awaitedCallEquals(
    rootIdentityVariable!.declaration.initializer,
    strictRootHelperName
  );
  assert.ok(createStrictCall === createStrictCalls[0] &&
    createStrictCall.arguments.length === 2 &&
    propertyEquals(createStrictCall.arguments[0], "layout", "runRoot"),
  "createRunDirectories must strictly validate layout.runRoot after creation");
  assert.ok(createStrictCall.getStart(runnerAst) > mkdirCalls[0]!.getStart(runnerAst),
    "strict layout.runRoot validation occurred before run-root creation");

  const testingIssuerDeclarations = topLevelFunctions(
    "__testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability"
  );
  assert.equal(testingIssuerDeclarations.length, 1,
    "test-only run-root capability issuer must remain one declaration");
  const testingIssuer = testingIssuerDeclarations[0]!;
  assert.ok(testingIssuer.body, "test-only run-root capability issuer has no body");
  const testingStrictCalls = callsWithin(testingIssuer.body!, strictRootHelperName);
  assert.equal(testingStrictCalls.length, 3,
    "test-only issuer must strictly validate authorized parent, protected ledger, and run root");
  const testingAuthorizedParentIdentity = directVariable(
    testingIssuer.body!,
    "authorizedParentIdentity"
  );
  assert.ok(testingAuthorizedParentIdentity &&
    (testingAuthorizedParentIdentity.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "test-only issuer must directly capture authorizedParentIdentity in one const");
  const testingAuthorizedParentCall = awaitedCallEquals(
    testingAuthorizedParentIdentity!.declaration.initializer,
    strictRootHelperName
  );
  assert.ok(testingAuthorizedParentCall &&
    testingAuthorizedParentCall.arguments.length === 2 &&
    identifiersEqual(testingAuthorizedParentCall.arguments[0], "authorizedParentRoot"),
  "test-only issuer authorized-parent validation must be one direct awaited call");

  const testingProtectedRootStatementIndex = testingIssuer.body!.statements.findIndex(
    (statement) => ts.isExpressionStatement(statement) &&
      awaitedCallEquals(statement.expression, strictRootHelperName) === testingStrictCalls[1]
  );
  assert.ok(testingProtectedRootStatementIndex >= 0,
    "test-only issuer protected-root validation must be one direct awaited expression statement");
  const testingProtectedRootStatement = testingIssuer.body!.statements[
    testingProtectedRootStatementIndex
  ] as ts.ExpressionStatement;
  const testingProtectedRootCall = awaitedCallEquals(
    testingProtectedRootStatement.expression,
    strictRootHelperName
  );
  assert.ok(testingProtectedRootCall &&
    testingProtectedRootCall.arguments.length === 2 &&
    identifiersEqual(testingProtectedRootCall.arguments[0], "protectedLedgerRoot"),
  "test-only issuer protected-ledger validation lost its exact semantic role");

  const testingRootIdentity = directVariable(testingIssuer.body!, "rootIdentity");
  assert.ok(testingRootIdentity &&
    (testingRootIdentity.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "test-only issuer must directly capture rootIdentity in one const");
  const testingRootCall = awaitedCallEquals(
    testingRootIdentity!.declaration.initializer,
    strictRootHelperName
  );
  assert.ok(testingRootCall && testingRootCall.arguments.length === 2 &&
    identifiersEqual(testingRootCall.arguments[0], "runRoot"),
  "test-only issuer run-root validation must be one direct awaited call");
  assert.deepEqual(testingStrictCalls, [
    testingAuthorizedParentCall,
    testingProtectedRootCall,
    testingRootCall
  ], "test-only strict-root calls are not the exact live authorized/protected/run sequence");

  const testingRequestLeafCalls = callsWithin(testingIssuer.body!, "lstatOrNull");
  assert.equal(testingRequestLeafCalls.length, 1,
    "test-only issuer must have one request-leaf absence probe");
  const testingRequestLeafCall = testingRequestLeafCalls[0]!;
  assert.ok(testingRequestLeafCall.arguments.length === 1 &&
    callEquals(testingRequestLeafCall.arguments[0], "path.join") &&
    (testingRequestLeafCall.arguments[0] as ts.CallExpression).arguments.length === 2 &&
    identifiersEqual(
      (testingRequestLeafCall.arguments[0] as ts.CallExpression).arguments[0],
      "runRoot"
    ) &&
    identifiersEqual(
      (testingRequestLeafCall.arguments[0] as ts.CallExpression).arguments[1],
      "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME"
    ),
  "test-only issuer request-leaf probe must target the fixed request filename under runRoot");
  const testingRequestLeafOuterCalls = callsWithin(
    testingIssuer.body!,
    "assert.equal"
  ).filter((call) => call.arguments.length === 3 &&
    ts.isAwaitExpression(call.arguments[0]!) &&
    call.arguments[0]!.expression === testingRequestLeafCall &&
    call.arguments[1]!.kind === ts.SyntaxKind.NullKeyword);
  assert.equal(testingRequestLeafOuterCalls.length, 1,
    "test-only issuer leaf probe must be one outer assert.equal of awaited absence to null");
  const testingRequestLeafStatementIndex = assertDirectExpressionCall(
    testingIssuer.body!,
    testingRequestLeafOuterCalls[0]!,
    "test-only request-leaf absence probe"
  );
  const testingIssuanceCalls = callsWithin(
    testingIssuer.body!,
    "issueMeasuredAuthorizationRequestRunRootCapability"
  );
  assert.equal(testingIssuanceCalls.length, 1,
    "test-only issuer must issue exactly one run-root capability");
  const testingIssuanceStatementIndex = testingIssuer.body!.statements.findIndex(
    (statement) => ts.isReturnStatement(statement) &&
      statement.expression === testingIssuanceCalls[0]
  );
  assert.ok(testingIssuanceStatementIndex >= 0,
    "test-only capability issuance must be one direct return statement");
  assert.equal(
    testingAuthorizedParentIdentity!.index < testingProtectedRootStatementIndex &&
      testingProtectedRootStatementIndex < testingRootIdentity!.index &&
      testingRootIdentity!.index < testingRequestLeafStatementIndex &&
      testingRequestLeafStatementIndex < testingIssuanceStatementIndex,
    true,
    "test-only strict validations must be live and ordered before leaf probe and issuance"
  );
  const allStrictCalls = callsWithin(runnerAst, strictRootHelperName);
  assert.equal(allStrictCalls.length, 4,
    "strict exact-0700 helper must retain exactly one production and three test-only calls");

  const issuanceCalls = callsWithin(
    createDeclaration.body!,
    "issueMeasuredAuthorizationRequestRunRootCapability"
  );
  assert.equal(issuanceCalls.length, 1,
    "createRunDirectories must issue exactly one production run-root capability");
  const issuanceArguments = issuanceCalls[0]!.arguments;
  assert.ok(issuanceArguments.length === 5 &&
    identifiersEqual(issuanceArguments[0], "productionRequestRunRootCapabilities") &&
    identifiersEqual(issuanceArguments[1], "CALIFORNIA_ACCEPTANCE_TMP_ROOT") &&
    identifiersEqual(issuanceArguments[2], "authorizedParentIdentity") &&
    propertyEquals(issuanceArguments[3], "layout", "runRoot") &&
    identifiersEqual(issuanceArguments[4], "rootIdentity"),
  "production capability issuance lost its captured parent/root identity binding");

  const identityProjectors = topLevelFunctions(
    "measuredAuthorizationPublicationRootIdentity"
  );
  assert.equal(identityProjectors.length, 1,
    "measured-authorization root identity projector must remain unique");
  const identityProjector = identityProjectors[0]!;
  assert.equal(identityProjector.parameters.length, 1,
    "measured-authorization root identity projector must accept exactly one identity");
  assert.ok(ts.isIdentifier(identityProjector.parameters[0]!.name),
    "measured-authorization root identity projector parameter must be one identifier");
  const projectedIdentityName =
    (identityProjector.parameters[0]!.name as ts.Identifier).text;
  const projectorBody = identityProjector.body;
  assert.ok(projectorBody, "measured-authorization root identity projector has no body");
  assert.equal(projectorBody!.statements.length, 1,
    "measured-authorization root identity projector must contain only one return statement");
  const projectorReturns = projectorBody!.statements.filter(
    (statement): statement is ts.ReturnStatement => ts.isReturnStatement(statement)
  );
  assert.equal(projectorReturns.length, 1,
    "measured-authorization root identity projector must have one direct return");
  const projectedObject = projectorReturns[0]!.expression;
  assert.ok(projectedObject && ts.isObjectLiteralExpression(projectedObject),
    "measured-authorization root identity projector must return one object literal");
  const projectedProperties = (projectedObject as ts.ObjectLiteralExpression).properties;
  const projectedIdentityKeys = ["birthtimeNs", "dev", "ino", "mode", "uid"] as const;
  assert.deepEqual(projectedProperties.map((property) => property.name?.getText(runnerAst)),
    [...projectedIdentityKeys],
  "captured measured-authorization root identity is not the exact ordered unique five-key object");
  assert.equal(projectedProperties.every((property, index) =>
    ts.isPropertyAssignment(property) &&
    property.name.getText(runnerAst) === projectedIdentityKeys[index] &&
    propertyEquals(
      property.initializer,
      projectedIdentityName,
      projectedIdentityKeys[index]!
    )), true,
  "captured measured-authorization root identity fields are not sourced from the input identity");

  const identityComparators = topLevelFunctions(
    "assertMeasuredAuthorizationPublicationRootIdentity"
  );
  assert.equal(identityComparators.length, 1,
    "measured-authorization full root-identity comparator must remain unique");
  const identityComparator = identityComparators[0]!;
  assert.equal(identityComparator.parameters.length, 3,
    "full root-identity comparator must accept actual, expected, and label only");
  assert.ok(identityComparator.parameters.every((parameter) => ts.isIdentifier(parameter.name)),
    "full root-identity comparator parameters must be plain semantic identifiers");
  const comparatorActualName =
    (identityComparator.parameters[0]!.name as ts.Identifier).text;
  const comparatorExpectedName =
    (identityComparator.parameters[1]!.name as ts.Identifier).text;
  const comparatorBody = identityComparator.body;
  assert.ok(comparatorBody, "measured-authorization full root-identity comparator has no body");
  assert.equal(comparatorBody!.statements.length, 1,
    "full root-identity comparator must contain only one live for-of statement");
  const comparatorForOf = comparatorBody!.statements[0];
  assert.ok(ts.isForOfStatement(comparatorForOf),
    "full root-identity comparator exact key array is not a live for-of iterable");
  assert.ok(ts.isVariableDeclarationList(comparatorForOf.initializer) &&
    comparatorForOf.initializer.declarations.length === 1 &&
    (comparatorForOf.initializer.flags & ts.NodeFlags.Const) !== 0 &&
    ts.isIdentifier(comparatorForOf.initializer.declarations[0]!.name),
  "full root-identity comparator for-of key must be one const identifier");
  const comparatorKeyName =
    (comparatorForOf.initializer.declarations[0]!.name as ts.Identifier).text;
  assert.notEqual(comparatorKeyName, comparatorActualName,
    "full root-identity comparator loop key must differ from its actual parameter");
  assert.notEqual(comparatorKeyName, comparatorExpectedName,
    "full root-identity comparator loop key must differ from its expected parameter");
  const unwrapExpression = (node: ts.Expression): ts.Expression => {
    let current = node;
    while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression;
    }
    return current;
  };
  const liveComparatorIterable = unwrapExpression(comparatorForOf.expression);
  assert.ok(ts.isArrayLiteralExpression(liveComparatorIterable),
    "full root-identity comparator for-of iterable must be the direct exact key array");
  assert.deepEqual(
    (liveComparatorIterable as ts.ArrayLiteralExpression).elements.map((element) =>
      ts.isStringLiteral(element) ? element.text : null),
    [...projectedIdentityKeys],
    "full root-identity comparator live iterable lost its exact ordered mode-bearing keys"
  );
  assert.ok(ts.isBlock(comparatorForOf.statement) &&
    comparatorForOf.statement.statements.length === 1 &&
    ts.isExpressionStatement(comparatorForOf.statement.statements[0]!),
  "full root-identity comparator for-of body must contain one direct assertion");
  const comparatorAssertionStatement =
    (comparatorForOf.statement as ts.Block).statements[0] as ts.ExpressionStatement;
  assert.ok(callEquals(comparatorAssertionStatement.expression, "assert.equal"),
    "full root-identity comparator for-of body must directly call assert.equal");
  const comparatorAssertion = comparatorAssertionStatement.expression as ts.CallExpression;
  const isIndexedByComparatorKey = (node: ts.Node | undefined, owner: string) =>
    !!node && ts.isElementAccessExpression(node) &&
    identifiersEqual(node.expression, owner) &&
    identifiersEqual(node.argumentExpression, comparatorKeyName);
  assert.ok(comparatorAssertion.arguments.length === 3 &&
    isIndexedByComparatorKey(comparatorAssertion.arguments[0], comparatorActualName) &&
    isIndexedByComparatorKey(comparatorAssertion.arguments[1], comparatorExpectedName),
  "full root-identity comparator must directly assert actual[key] equals expected[key]");

  const bindingDeclarations = topLevelFunctions(
    "assertMeasuredAuthorizationPublicationRootBinding"
  );
  assert.equal(bindingDeclarations.length, 1,
    "measured-authorization root-binding verifier must remain unique");
  const bindingDeclaration = bindingDeclarations[0]!;
  assert.ok(bindingDeclaration.body,
    "measured-authorization root-binding verifier has no body");
  assert.ok(bindingDeclaration.parameters.length === 4 &&
    bindingDeclaration.parameters.every((parameter) => ts.isIdentifier(parameter.name)),
  "root-binding verifier must retain run-root, root-handle, expected identity, and label roles");
  const bindingRunRootName =
    (bindingDeclaration.parameters[0]!.name as ts.Identifier).text;
  const bindingRootHandleName =
    (bindingDeclaration.parameters[1]!.name as ts.Identifier).text;
  const expectedIdentityName =
    (bindingDeclaration.parameters[2]!.name as ts.Identifier).text;
  const bindingLabelName =
    (bindingDeclaration.parameters[3]!.name as ts.Identifier).text;
  assert.equal(bindingDeclaration.body!.statements.length, 7,
    "root-binding verifier must contain exactly seven top-level statements");
  const namedIdentityVariable = directVariable(bindingDeclaration.body!, "named");
  assert.ok(namedIdentityVariable &&
    (namedIdentityVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "root-binding verifier must directly capture named identity in one const");
  const namedLstatCall = awaitedCallEquals(
    namedIdentityVariable!.declaration.initializer,
    "lstat"
  );
  assert.ok(namedLstatCall && namedLstatCall.arguments.length === 2 &&
    identifiersEqual(namedLstatCall.arguments[0], bindingRunRootName) &&
    ts.isObjectLiteralExpression(namedLstatCall.arguments[1]!) &&
    namedLstatCall.arguments[1]!.properties.length === 1,
  "root-binding verifier named identity must be awaited by bigint lstat of runRoot");
  const namedBigintProperty =
    (namedLstatCall!.arguments[1] as ts.ObjectLiteralExpression).properties[0];
  assert.ok(namedBigintProperty && ts.isPropertyAssignment(namedBigintProperty) &&
    namedBigintProperty.name.getText(runnerAst) === "bigint" &&
    namedBigintProperty.initializer.kind === ts.SyntaxKind.TrueKeyword,
  "root-binding verifier named lstat must use exact {bigint:true} options");
  const heldIdentityVariable = directVariable(bindingDeclaration.body!, "held");
  assert.ok(heldIdentityVariable &&
    (heldIdentityVariable.statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
  "root-binding verifier must directly capture held identity in one const");
  const heldStatCall = awaitedCallEquals(
    heldIdentityVariable!.declaration.initializer,
    `${bindingRootHandleName}.stat`
  );
  assert.ok(heldStatCall && heldStatCall.arguments.length === 1 &&
    ts.isObjectLiteralExpression(heldStatCall.arguments[0]!) &&
    heldStatCall.arguments[0]!.properties.length === 1,
  "root-binding verifier held identity must be awaited by bigint rootHandle.stat");
  const heldBigintProperty =
    (heldStatCall!.arguments[0] as ts.ObjectLiteralExpression).properties[0];
  assert.ok(heldBigintProperty && ts.isPropertyAssignment(heldBigintProperty) &&
    heldBigintProperty.name.getText(runnerAst) === "bigint" &&
    heldBigintProperty.initializer.kind === ts.SyntaxKind.TrueKeyword,
  "root-binding verifier held stat must use exact {bigint:true} options");

  const bindingOkCalls = callsWithin(bindingDeclaration.body!, "assert.ok");
  assert.equal(bindingOkCalls.length, 2,
    "root-binding verifier must contain exactly two physical-directory assertions");
  const namedPhysicalCall = bindingOkCalls.find((call) => {
    const actual = call.arguments[0];
    return !!actual && ts.isBinaryExpression(actual) &&
      actual.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      callEquals(actual.left, "named.isDirectory") &&
      ts.isPrefixUnaryExpression(actual.right) &&
      actual.right.operator === ts.SyntaxKind.ExclamationToken &&
      callEquals(actual.right.operand, "named.isSymbolicLink");
  });
  assert.ok(namedPhysicalCall,
    "root-binding verifier must directly reject a non-directory or symlink named root");
  const heldPhysicalCall = bindingOkCalls.find((call) =>
    call.arguments.length >= 1 && callEquals(call.arguments[0], "held.isDirectory"));
  assert.ok(heldPhysicalCall,
    "root-binding verifier must directly require its held root FD to be one directory");

  const bindingEqualCalls = callsWithin(bindingDeclaration.body!, "assert.equal");
  assert.equal(bindingEqualCalls.length, 1,
    "root-binding verifier must contain exactly one realpath equality assertion");
  const bindingRealpathCall = bindingEqualCalls.find((call) => {
    const [actual, expected] = call.arguments;
    return !!actual && ts.isAwaitExpression(actual) &&
      callEquals(actual.expression, "realpath") &&
      (actual.expression as ts.CallExpression).arguments.length === 1 &&
      identifiersEqual(
        (actual.expression as ts.CallExpression).arguments[0],
        bindingRunRootName
      ) && identifiersEqual(expected, bindingRunRootName);
  });
  assert.ok(bindingRealpathCall,
    "root-binding verifier must directly await exact runRoot realpath equality");
  const bindingComparatorCalls = callsWithin(
    bindingDeclaration.body!,
    "assertMeasuredAuthorizationPublicationRootIdentity"
  );
  assert.equal(bindingComparatorCalls.length, 2,
    "root-binding verifier must compare both named and held-FD identities");
  assert.ok(bindingComparatorCalls[0]!.arguments.length === 3 &&
    identifiersEqual(bindingComparatorCalls[0]!.arguments[0], "named") &&
    identifiersEqual(bindingComparatorCalls[0]!.arguments[1], expectedIdentityName),
  "root-binding verifier first live comparator call must bind named to expected identity");
  assert.ok(bindingComparatorCalls[1]!.arguments.length === 3 &&
    identifiersEqual(bindingComparatorCalls[1]!.arguments[0], "held") &&
    identifiersEqual(bindingComparatorCalls[1]!.arguments[1], expectedIdentityName),
  "root-binding verifier second live comparator call must bind held FD to expected identity");
  const namedComparatorIndex = assertDirectExpressionCall(
    bindingDeclaration.body!,
    bindingComparatorCalls[0]!,
    "named-path full-identity comparator"
  );
  const heldComparatorIndex = assertDirectExpressionCall(
    bindingDeclaration.body!,
    bindingComparatorCalls[1]!,
    "held-FD full-identity comparator"
  );
  const namedPhysicalIndex = assertDirectExpressionCall(
    bindingDeclaration.body!,
    namedPhysicalCall!,
    "named-path physical-directory assertion"
  );
  const bindingRealpathIndex = assertDirectExpressionCall(
    bindingDeclaration.body!,
    bindingRealpathCall!,
    "named-path realpath equality assertion"
  );
  const heldPhysicalIndex = assertDirectExpressionCall(
    bindingDeclaration.body!,
    heldPhysicalCall!,
    "held-FD directory assertion"
  );
  const bindingChronology = [
    namedIdentityVariable!.index,
    namedPhysicalIndex,
    namedComparatorIndex,
    bindingRealpathIndex,
    heldIdentityVariable!.index,
    heldPhysicalIndex,
    heldComparatorIndex
  ];
  assert.deepEqual(bindingChronology, [0, 1, 2, 3, 4, 5, 6],
    "root-binding verifier is not the exclusive exact seven-statement identity sequence");

  const allBindingCalls: ts.CallExpression[] = [];
  const allBindingIdentifiers: ts.Identifier[] = [];
  const forbiddenBindingMutationNodes: ts.Node[] = [];
  const nestedBindingFunctions: ts.Node[] = [];
  const visitExclusiveBindingBody = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) allBindingCalls.push(node);
    if (ts.isIdentifier(node)) allBindingIdentifiers.push(node);
    if (ts.isFunctionLike(node)) nestedBindingFunctions.push(node);
    if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      forbiddenBindingMutationNodes.push(node);
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken)) {
      forbiddenBindingMutationNodes.push(node);
    }
    if (ts.isDeleteExpression(node) || ts.isNewExpression(node)) {
      forbiddenBindingMutationNodes.push(node);
    }
    ts.forEachChild(node, visitExclusiveBindingBody);
  };
  visitExclusiveBindingBody(bindingDeclaration.body!);
  assert.deepEqual(nestedBindingFunctions, [],
    "root-binding verifier must not hide work in a nested function");
  const bindingCallCounts = new Map<string, number>();
  for (const call of allBindingCalls) {
    const name = calleeName(call);
    assert.ok(name, "root-binding verifier contains an indirect or computed call");
    bindingCallCounts.set(name!, (bindingCallCounts.get(name!) ?? 0) + 1);
  }
  assert.deepEqual(
    [...bindingCallCounts.entries()].sort(([left], [right]) => left.localeCompare(right)),
    [
      ["assert.equal", 1],
      ["assert.ok", 2],
      ["assertMeasuredAuthorizationPublicationRootIdentity", 2],
      ["held.isDirectory", 1],
      ["lstat", 1],
      ["named.isDirectory", 1],
      ["named.isSymbolicLink", 1],
      ["realpath", 1],
      [`${bindingRootHandleName}.stat`, 1]
    ].sort(([left], [right]) => left.localeCompare(right)),
    "root-binding verifier contains missing, repeated, indirect, or unaudited calls"
  );
  const allowedBindingIdentifiers = new Set([
    "assert",
    "assertMeasuredAuthorizationPublicationRootIdentity",
    "bigint",
    "equal",
    "held",
    "isDirectory",
    "isSymbolicLink",
    "lstat",
    "named",
    "ok",
    "realpath",
    "stat",
    bindingLabelName,
    bindingRootHandleName,
    bindingRunRootName,
    expectedIdentityName
  ]);
  assert.deepEqual(
    allBindingIdentifiers
      .map((identifier) => identifier.text)
      .filter((identifier) => !allowedBindingIdentifiers.has(identifier)),
    [],
    "root-binding verifier contains an unaudited identifier"
  );
  assert.deepEqual(forbiddenBindingMutationNodes, [],
    "root-binding verifier contains assignment, update, delete, or construction mutation");

  const fixedParentIdentity = await lstat(CALIFORNIA_ACCEPTANCE_TMP_ROOT, { bigint: true });
  assert.ok(fixedParentIdentity.isDirectory() && !fixedParentIdentity.isSymbolicLink(),
    "fixed California .tmp parent must be one physical directory");
  assert.equal(fixedParentIdentity.uid, BigInt(process.getuid()),
    "fixed California .tmp parent must be owned by the current process UID");
  assert.equal(await realpath(CALIFORNIA_ACCEPTANCE_TMP_ROOT), CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    "fixed California .tmp parent must equal its canonical realpath");
  const fixedParentPermissions = fixedParentIdentity.mode & BigInt(0o777);
  assert.equal(fixedParentPermissions, BigInt(0o755),
    "fixed California .tmp parent precondition must remain exact mode 0755");
  assert.equal(fixedParentPermissions & BigInt(0o700), BigInt(0o700),
    "fixed California .tmp parent precondition lacks owner rwx");
  assert.equal(fixedParentPermissions & BigInt(0o022), BigInt(0),
    "fixed California .tmp parent precondition is group/world writable");
});

test("measured-authorization preparation integration RED: one-use production capability publishes a durable non-authorizing HOLD without execution", async (t: TestContext) => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const integrationCandidate = Reflect.get(
    runnerModule,
    "__testingRunCaliforniaSignatureMeasuredAuthorizationRequestPreparationIntegration"
  ) as unknown;
  assert.equal(
    typeof integrationCandidate,
    "function",
    "request-preparation integration requires one non-authorizing internal entrypoint"
  );

  type IntegrationResult = Readonly<{
    authorizationRequestPath: string;
    authorizationRequestSha256: string;
    browserExecutionStarted: false;
    exhaustiveExecutionAuthorized: false;
    mode: "prepare-measured-authorization-request";
    runRoot: string;
    serverExecutionStarted: false;
    status: "TEST_ONLY_NON_AUTHORIZING_HOLD";
  }>;
  const runPreparationIntegration = integrationCandidate as (options: {
    cli: ReturnType<typeof parseCaliforniaAcceptanceCli>;
    testOnlyCanonicalRequest: Record<string, unknown>;
  }) => Promise<IntegrationResult>;

  const runnerSourcePath = path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  );
  const runnerSource = await readFile(runnerSourcePath, "utf8");
  const runnerAst = ts.createSourceFile(
    runnerSourcePath,
    runnerSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const integrationExportName =
    "__testingRunCaliforniaSignatureMeasuredAuthorizationRequestPreparationIntegration";
  const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
    ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
      modifier.kind === kind) === true;
  const declarations = runnerAst.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === integrationExportName &&
    hasModifier(statement, ts.SyntaxKind.ExportKeyword)
  );
  assert.equal(declarations.length, 1,
    "request-preparation integration must be one unique exported function declaration");
  const integrationDeclaration = declarations[0]!;
  assert.equal(integrationDeclaration.parent, runnerAst,
    "request-preparation integration declaration is not a source-file top-level statement");
  assert.equal(hasModifier(integrationDeclaration, ts.SyntaxKind.AsyncKeyword), true,
    "request-preparation integration export must be async");
  assert.ok(integrationDeclaration.body,
    "request-preparation integration export has no executable function body");

  const productionCallSites: ts.CallExpression[] = [];
  const integrationIdentifierNodes: ts.Identifier[] = [];
  const visitWholeRunner = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === integrationExportName) {
      integrationIdentifierNodes.push(node);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === integrationExportName) {
      productionCallSites.push(node);
    }
    ts.forEachChild(node, visitWholeRunner);
  };
  visitWholeRunner(runnerAst);
  assert.deepEqual(integrationIdentifierNodes, [integrationDeclaration.name],
    "request-preparation integration identifier appears outside its declaration");
  assert.deepEqual(productionCallSites, [],
    "request-preparation integration test export is reachable from production source");

  const body = integrationDeclaration.body;
  assert.equal(body.statements.every((statement) =>
    ts.isVariableStatement(statement) ||
    ts.isExpressionStatement(statement) ||
    ts.isReturnStatement(statement)), true,
  "request-preparation integration must be one branch-free linear top-level statement list");
  const nestedFunctions: ts.Node[] = [];
  const bodyCalls: ts.CallExpression[] = [];
  const bodyIdentifiers: ts.Identifier[] = [];
  const visitBody = (node: ts.Node): void => {
    if (node !== integrationDeclaration && ts.isFunctionLike(node)) nestedFunctions.push(node);
    if (ts.isCallExpression(node)) bodyCalls.push(node);
    if (ts.isIdentifier(node)) bodyIdentifiers.push(node);
    ts.forEachChild(node, visitBody);
  };
  visitBody(body);
  assert.deepEqual(nestedFunctions, [],
    "request-preparation integration hides work inside a nested function");

  const callName = (call: ts.CallExpression) => {
    if (ts.isIdentifier(call.expression)) return call.expression.text;
    if (ts.isPropertyAccessExpression(call.expression) &&
      ts.isIdentifier(call.expression.expression)) {
      return `${call.expression.expression.text}.${call.expression.name.text}`;
    }
    return null;
  };
  const allowedCallNames = new Set([
    "Object.freeze",
    "assert.deepEqual",
    "assert.equal",
    "assert.ok",
    "assertFreshStarshipRunRoot",
    "buildRunLayout",
    "createRunDirectories",
    "exactKeys",
    "exactRecord",
    "prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication",
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  ]);
  for (const call of bodyCalls) {
    const name = callName(call);
    assert.ok(name && allowedCallNames.has(name),
      `request-preparation integration contains unaudited call ${name ?? call.getText(runnerAst)}`);
  }
  const callCount = (name: string) => bodyCalls.filter((call) => callName(call) === name).length;
  for (const milestone of [
    "assertFreshStarshipRunRoot",
    "buildRunLayout",
    "createRunDirectories",
    "publishCaliforniaSignatureMeasuredAuthorizationRequest",
    "Object.freeze"
  ]) {
    assert.equal(callCount(milestone), 1,
      `request-preparation integration must call ${milestone} exactly once`);
  }
  assert.equal(callCount("exactRecord"), 1,
    "request-preparation integration must exact-record validate options once");
  assert.equal(callCount("exactKeys"), 1,
    "request-preparation integration must exact-key validate options once");
  assert.ok(callCount("prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication") <= 1,
    "request-preparation integration repeated pure request preparation");

  const forbiddenIdentifiers = new Set([
    "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT",
    "buildCaliforniaCommandPlans",
    "buildCaliforniaSignatureMeasuredAuthorizationRequest",
    "chmod",
    "defaultOperations",
    "link",
    "mkdir",
    "open",
    "readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority",
    "readCaliforniaSignatureMeasuredAuthorizationReceipt",
    "readCaliforniaSignatureMeasuredAuthorizationRequest",
    "rename",
    "resolveCaliforniaLocalEntrypoints",
    "rm",
    "runCaliforniaSignatureExhaustiveProducerUnderCapacityHold",
    "runCaliforniaVisualizationAcceptance",
    "runCommand",
    "runServerBoundCommand",
    "spawn",
    "spawnSync",
    "startServer",
    "symlink",
    "unlink",
    "verifyCaliforniaSignatureMeasuredAuthorizationForLaunch",
    "writeFile"
  ]);
  for (const identifier of bodyIdentifiers) {
    assert.equal(forbiddenIdentifiers.has(identifier.text), false,
      `request-preparation integration references forbidden identifier ${identifier.text}`);
    assert.doesNotMatch(identifier.text,
      /(?:Playwright|ReceiptReader|ReceiptVerifier|Consumption|ConsumeMeasuredAuthorization)/i,
    `request-preparation integration references forbidden execution or authorization API ${identifier.text}`);
  }

  const variableInitializer = (statement: ts.Statement, name: string) => {
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
      return null;
    }
    const declaration = statement.declarationList.declarations[0]!;
    return ts.isIdentifier(declaration.name) && declaration.name.text === name
      ? declaration.initializer ?? null
      : null;
  };
  const directCall = (expression: ts.Expression | undefined, name: string) => {
    if (!expression || !ts.isCallExpression(expression) ||
      !ts.isIdentifier(expression.expression) || expression.expression.text !== name) {
      return null;
    }
    return expression;
  };
  const awaitedDirectCall = (expression: ts.Expression | undefined, name: string) =>
    expression && ts.isAwaitExpression(expression)
      ? directCall(expression.expression, name)
      : null;
  const isIdentifier = (node: ts.Node | undefined, name: string) =>
    !!node && ts.isIdentifier(node) && node.text === name;
  const isPropertyAccess = (node: ts.Node | undefined, owner: string, property: string) =>
    !!node && ts.isPropertyAccessExpression(node) &&
    isIdentifier(node.expression, owner) && node.name.text === property;
  const statementIndexWithVariable = (name: string) => body.statements.findIndex((statement) =>
    variableInitializer(statement, name) !== null);

  const exactOptionsCallIndex = body.statements.findIndex((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression) ||
      !ts.isIdentifier(statement.expression.expression) ||
      statement.expression.expression.text !== "exactKeys") return false;
    const keyArray = statement.expression.arguments[1];
    return !!keyArray && ts.isArrayLiteralExpression(keyArray) &&
      keyArray.elements.length === 2 &&
      ts.isStringLiteral(keyArray.elements[0]!) && keyArray.elements[0].text === "cli" &&
      ts.isStringLiteral(keyArray.elements[1]!) &&
      keyArray.elements[1].text === "testOnlyCanonicalRequest";
  });
  assert.ok(exactOptionsCallIndex >= 0,
    "request-preparation integration lacks exact ordered two-key option validation");
  const modeAssertionIndex = body.statements.findIndex((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression) ||
      !ts.isPropertyAccessExpression(statement.expression.expression) ||
      !isIdentifier(statement.expression.expression.expression, "assert") ||
      statement.expression.expression.name.text !== "equal") return false;
    const [actual, expected] = statement.expression.arguments;
    return isPropertyAccess(actual, "cli", "mode") && !!expected &&
      ts.isStringLiteral(expected) && expected.text === "prepare-measured-authorization-request";
  });
  assert.ok(modeAssertionIndex > exactOptionsCallIndex,
    "request-preparation integration must assert preparation mode after exact options validation");

  const validatedRunRootIndex = statementIndexWithVariable("validatedRunRoot");
  const validatedRunRootCall = awaitedDirectCall(
    validatedRunRootIndex >= 0
      ? variableInitializer(body.statements[validatedRunRootIndex]!, "validatedRunRoot") ?? undefined
      : undefined,
    "assertFreshStarshipRunRoot"
  );
  assert.ok(validatedRunRootCall && validatedRunRootCall.arguments.length === 1 &&
    isPropertyAccess(validatedRunRootCall.arguments[0], "cli", "runRoot"),
  "request-preparation integration must await validation of cli.runRoot into validatedRunRoot");

  const layoutIndex = statementIndexWithVariable("layout");
  const layoutCall = directCall(
    layoutIndex >= 0 ? variableInitializer(body.statements[layoutIndex]!, "layout") ?? undefined : undefined,
    "buildRunLayout"
  );
  assert.ok(layoutCall && layoutCall.arguments.length === 1 &&
    isIdentifier(layoutCall.arguments[0], "validatedRunRoot"),
  "request-preparation integration must build layout from validatedRunRoot");

  const capabilityIndex = statementIndexWithVariable("runRootCapability");
  const capabilityCall = awaitedDirectCall(
    capabilityIndex >= 0
      ? variableInitializer(body.statements[capabilityIndex]!, "runRootCapability") ?? undefined
      : undefined,
    "createRunDirectories"
  );
  assert.ok(capabilityCall && capabilityCall.arguments.length === 1 &&
    isIdentifier(capabilityCall.arguments[0], "layout"),
  "request-preparation integration must await one runRootCapability from createRunDirectories(layout)");

  const publicationIndex = statementIndexWithVariable("publication");
  const publicationCall = awaitedDirectCall(
    publicationIndex >= 0
      ? variableInitializer(body.statements[publicationIndex]!, "publication") ?? undefined
      : undefined,
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  );
  assert.ok(publicationCall && publicationCall.arguments.length === 1 &&
    ts.isObjectLiteralExpression(publicationCall.arguments[0]!),
  "request-preparation integration must await one production publication");
  const publicationOptions = publicationCall!.arguments[0] as ts.ObjectLiteralExpression;
  assert.equal(publicationOptions.properties.length, 2,
    "request-preparation production publisher options must have exactly two keys");
  const requestOption = publicationOptions.properties[0];
  const capabilityOption = publicationOptions.properties[1];
  assert.ok(requestOption && ts.isPropertyAssignment(requestOption) &&
    requestOption.name.getText(runnerAst) === "request" &&
    isIdentifier(requestOption.initializer, "testOnlyCanonicalRequest"),
  "request-preparation production publisher request must be testOnlyCanonicalRequest");
  assert.ok(capabilityOption && ts.isShorthandPropertyAssignment(capabilityOption) &&
    capabilityOption.name.text === "runRootCapability",
  "request-preparation production publisher must receive the same runRootCapability local");

  const returnIndexes = body.statements.flatMap((statement, index) =>
    ts.isReturnStatement(statement) ? [index] : []);
  assert.deepEqual(returnIndexes, [body.statements.length - 1],
    "request-preparation integration must have one final top-level return");
  const returnStatement = body.statements[returnIndexes[0]!] as ts.ReturnStatement;
  assert.ok(returnStatement.expression && ts.isCallExpression(returnStatement.expression) &&
    ts.isPropertyAccessExpression(returnStatement.expression.expression) &&
    isIdentifier(returnStatement.expression.expression.expression, "Object") &&
    returnStatement.expression.expression.name.text === "freeze" &&
    returnStatement.expression.arguments.length === 1 &&
    ts.isObjectLiteralExpression(returnStatement.expression.arguments[0]!),
  "request-preparation integration must return one directly frozen object");
  const returnObject = returnStatement.expression!.arguments[0] as ts.ObjectLiteralExpression;
  const returnPropertyNames = returnObject.properties.map((property) => property.name?.getText(runnerAst));
  assert.deepEqual(returnPropertyNames, [
    "authorizationRequestPath",
    "authorizationRequestSha256",
    "browserExecutionStarted",
    "exhaustiveExecutionAuthorized",
    "mode",
    "runRoot",
    "serverExecutionStarted",
    "status"
  ], "request-preparation integration return is not the exact ordered eight-key object");
  const propertyInitializer = (name: string) => {
    const property = returnObject.properties.find((candidate) =>
      candidate.name?.getText(runnerAst) === name);
    assert.ok(property && ts.isPropertyAssignment(property),
      `request-preparation integration return ${name} is not one explicit property assignment`);
    return property.initializer;
  };
  assert.equal(isPropertyAccess(
    propertyInitializer("authorizationRequestPath"),
    "publication",
    "authorizationRequestPath"
  ), true, "request-preparation return path is not derived from publication");
  assert.equal(isPropertyAccess(
    propertyInitializer("authorizationRequestSha256"),
    "publication",
    "authorizationRequestSha256"
  ), true, "request-preparation return SHA is not derived from publication");
  for (const falseProperty of [
    "browserExecutionStarted",
    "exhaustiveExecutionAuthorized",
    "serverExecutionStarted"
  ]) {
    assert.equal(propertyInitializer(falseProperty).kind, ts.SyntaxKind.FalseKeyword,
      `request-preparation return ${falseProperty} is not literal false`);
  }
  const returnedMode = propertyInitializer("mode");
  assert.ok(ts.isStringLiteral(returnedMode) &&
    returnedMode.text === "prepare-measured-authorization-request",
  "request-preparation return mode drifted");
  assert.equal(isIdentifier(propertyInitializer("runRoot"), "validatedRunRoot"), true,
    "request-preparation return runRoot is not the validated run root");
  const returnedStatus = propertyInitializer("status");
  assert.ok(ts.isStringLiteral(returnedStatus) &&
    returnedStatus.text === "TEST_ONLY_NON_AUTHORIZING_HOLD",
  "request-preparation return status is not the exact non-authorizing HOLD");
  assert.ok(
    exactOptionsCallIndex < modeAssertionIndex &&
    modeAssertionIndex < validatedRunRootIndex &&
    validatedRunRootIndex < layoutIndex &&
    layoutIndex < capabilityIndex &&
    capabilityIndex < publicationIndex &&
    publicationIndex < returnIndexes[0]!,
    "request-preparation integration milestone chronology is not exact and linear"
  );

  const writeDurableFixture = async (
    target: string,
    bytes: Buffer,
    mode: 0o600 | 0o400,
    label: string
  ) => {
    const handle = await open(target, "wx+", mode);
    try {
      const { bytesWritten } = await handle.write(bytes, 0, bytes.length, 0);
      assert.equal(bytesWritten, bytes.length, `${label}: write ended early`);
      await handle.sync();
      const readback = Buffer.alloc(bytes.length);
      const { bytesRead } = await handle.read(readback, 0, readback.length, 0);
      assert.equal(bytesRead, bytes.length, `${label}: same-FD readback ended early`);
      assert.deepEqual(readback, bytes, `${label}: same-FD readback drifted`);
      await handle.chmod(mode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const directoryHandle = await open(path.dirname(target), "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
    const identity = await lstat(target, { bigint: true });
    assert.ok(identity.isFile() && !identity.isSymbolicLink() &&
      identity.nlink === BigInt(1), `${label}: fixture is not one regular singleton file`);
    assert.equal(identity.uid, BigInt(process.getuid()),
      `${label}: fixture is not owner-bound`);
    assert.equal(identity.mode & BigInt(0o777), BigInt(mode),
      `${label}: fixture mode drifted`);
    assert.equal(identity.size, BigInt(bytes.length), `${label}: fixture size drifted`);
    assert.deepEqual(await readFile(target), bytes, `${label}: fixture bytes drifted`);
    return identity;
  };

  const ledgerRoot = path.join(
    pureRoot,
    highEntropy("request-preparation-integration-ledger")
  );
  await mkdir(ledgerRoot, { mode: 0o700 });
  await chmod(ledgerRoot, 0o700);
  const ledgerRootIdentity = await lstat(ledgerRoot, { bigint: true });
  assert.ok(ledgerRootIdentity.isDirectory() && !ledgerRootIdentity.isSymbolicLink(),
    "request-preparation fixture ledger is not one physical directory");
  assert.equal(ledgerRootIdentity.uid, BigInt(process.getuid()),
    "request-preparation fixture ledger is not owner-bound");
  assert.equal(ledgerRootIdentity.mode & BigInt(0o777), BigInt(0o700),
    "request-preparation fixture ledger is not exact mode 0700");
  assert.equal(await realpath(ledgerRoot), ledgerRoot,
    "request-preparation fixture ledger traverses a symlink");

  const ledgerId = highEntropy("request-preparation-ledger");
  const ledgerRootPathSha256 = digest(ledgerRoot);
  const anchor = {
    ledgerId,
    rootPathSha256: ledgerRootPathSha256,
    schema: "ca.california-signature.measured-authorization-ledger-root.v1",
    status: "ACTIVE"
  } as const;
  const anchorBytes = Buffer.from(`${JSON.stringify(anchor)}\n`, "utf8");
  const anchorPath = path.join(
    ledgerRoot,
    ".california-signature-measured-authorization-ledger-root.json"
  );
  const anchorIdentity = await writeDurableFixture(
    anchorPath,
    anchorBytes,
    0o600,
    "request-preparation fixture ledger anchor"
  );

  const capacityPlanRoot = path.join(
    pureRoot,
    highEntropy("request-preparation-capacity-plan")
  );
  await mkdir(capacityPlanRoot, { mode: 0o700 });
  await chmod(capacityPlanRoot, 0o700);
  const capacityPlanPath = path.join(capacityPlanRoot, "capacity-plan.json");
  const capacityPlanBytes = Buffer.from(`${JSON.stringify({
    schema: "ca.california-signature.test-only-non-authorizing-capacity-plan.v1",
    status: "TEST_ONLY"
  })}\n`, "utf8");
  const capacityPlanSha256 = digest(capacityPlanBytes);
  const capacityPlanIdentity = await writeDurableFixture(
    capacityPlanPath,
    capacityPlanBytes,
    0o400,
    "request-preparation fixture capacity plan"
  );

  const acceptanceRunId = highEntropy("request-preparation-acceptance");
  const authorizationAttemptId = highEntropy("request-preparation-attempt");
  const buildId = highEntropy("request-preparation-build");
  const exhaustiveRunId = highEntropy("request-preparation-exhaustive");
  const matrixRunId = highEntropy("request-preparation-matrix");
  const runtimeRunId = highEntropy("request-preparation-runtime");
  const sourceSnapshotSha256 = digest("request-preparation-test-only-source-snapshot");

  const runRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    highEntropy("ca-measured-request-integration")
  );
  const formalNegativeRunRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    highEntropy("ca-measured-request-formal-negative")
  );
  const discoveryNegativeRunRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    highEntropy("ca-measured-request-discovery-negative")
  );
  const preExistingNegativeRunRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    highEntropy("ca-measured-request-existing-negative")
  );
  for (const [label, target] of [
    ["positive", runRoot],
    ["formal", formalNegativeRunRoot],
    ["discovery", discoveryNegativeRunRoot],
    ["pre-existing", preExistingNegativeRunRoot]
  ] as const) {
    assert.equal(path.dirname(target), CALIFORNIA_ACCEPTANCE_TMP_ROOT,
      `${label}: external test run root is not one direct child of the fixed parent`);
  }

  const lstatOrNull = async (target: string, label: string) =>
    lstat(target, { bigint: true }).catch((error: NodeJS.ErrnoException) => {
      assert.equal(error.code, "ENOENT", `${label}: lstat failed unexpectedly`);
      return null;
    });
  const stableDirectoryIdentity = async (target: string, label: string) => {
    const identity = await lstat(target, { bigint: true });
    assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
      `${label}: expected one physical directory`);
    return Object.freeze({
      birthtimeNs: identity.birthtimeNs,
      ctimeNs: identity.ctimeNs,
      dev: identity.dev,
      gid: identity.gid,
      ino: identity.ino,
      mode: identity.mode,
      mtimeNs: identity.mtimeNs,
      nlink: identity.nlink,
      size: identity.size,
      uid: identity.uid
    });
  };
  const decimalIdentity = (
    identity: Awaited<ReturnType<typeof stableDirectoryIdentity>>
  ) => Object.freeze({
    birthtimeNs: identity.birthtimeNs.toString(10),
    ctimeNs: identity.ctimeNs.toString(10),
    dev: identity.dev.toString(10),
    gid: identity.gid.toString(10),
    ino: identity.ino.toString(10),
    mode: identity.mode.toString(10),
    mtimeNs: identity.mtimeNs.toString(10),
    nlink: identity.nlink.toString(10),
    size: identity.size.toString(10),
    uid: identity.uid.toString(10)
  });
  const buildCli = (
    targetRunRoot: string,
    mode: "discovery" | "formal" | "prepare-measured-authorization-request"
  ) => {
    const args = [
      "--acceptance-run-id", acceptanceRunId,
      "--build-id", buildId,
      "--capacity-plan-path", capacityPlanPath,
      "--capacity-plan-sha256", capacityPlanSha256,
      "--exhaustive-run-id", exhaustiveRunId,
      "--layer-a-port", "43111",
      "--layer-b-port", "43112",
      "--matrix-run-id", matrixRunId,
      "--mode", mode,
      "--run-root", targetRunRoot,
      "--runtime-run-id", runtimeRunId
    ];
    if (mode === "prepare-measured-authorization-request") {
      args.push("--authorization-attempt-id", authorizationAttemptId);
    }
    return parseCaliforniaAcceptanceCli(args);
  };
  const cli = buildCli(runRoot, "prepare-measured-authorization-request");
  const formalCli = buildCli(formalNegativeRunRoot, "formal");
  const discoveryCli = buildCli(discoveryNegativeRunRoot, "discovery");
  const preExistingCli = buildCli(
    preExistingNegativeRunRoot,
    "prepare-measured-authorization-request"
  );
  assert.equal(cli.mode, "prepare-measured-authorization-request",
    "request-preparation integration fixture lost its exact mode");

  const testOnlyLedgerAuthority =
    __testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority({
      testOnlyAttemptLedgerRoot: ledgerRoot
    });
  const testOnlyCanonicalRequest =
    __testingBuildCaliforniaSignatureMeasuredAuthorizationRequest({
      acceptanceRunId,
      attemptId: authorizationAttemptId,
      buildId,
      executionPlanSha256: capacityPlanSha256,
      launchCommand: {
        projects: ["desktop-chrome", "mobile-chrome"],
        repeatEach: 1,
        reporter: "json",
        retries: 0,
        specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
        workers: 1
      },
      matrixRunId,
      origin: "http://127.0.0.1:43112",
      runtimeRunId,
      sourceSnapshotSha256,
      testOnlyLedgerAuthority
    });
  assert.equal(Object.isFrozen(testOnlyCanonicalRequest), true,
    "lifecycle test-only builder did not return one frozen canonical request");
  const canonicalRequestBytes = Buffer.from(
    `${JSON.stringify(testOnlyCanonicalRequest, null, 2)}\n`,
    "utf8"
  );
  const canonicalRequestSha256 = digest(canonicalRequestBytes);

  const requestFilename = ".california-signature-measured-authorization-request.json";
  const expectedPositiveInventory: CaliforniaInventoryRow[] = [
    {
      kind: "file",
      mode: 0o400,
      path: requestFilename,
      sha256: canonicalRequestSha256,
      size: canonicalRequestBytes.length
    },
    { kind: "directory", mode: 0o700, path: "frozen-source" },
    { kind: "directory", mode: 0o700, path: "layer-a" },
    { kind: "directory", mode: 0o700, path: "layer-a/evidence" },
    { kind: "directory", mode: 0o700, path: "layer-a/evidence/product-smoke-receipts" },
    { kind: "directory", mode: 0o700, path: "layer-a/logs" },
    { kind: "directory", mode: 0o700, path: "layer-a/source" },
    { kind: "directory", mode: 0o700, path: "layer-b" },
    { kind: "directory", mode: 0o700, path: "layer-b/broad-ledger" },
    { kind: "directory", mode: 0o700, path: "layer-b/evidence" },
    { kind: "directory", mode: 0o700, path: "layer-b/exhaustive-ledger" },
    { kind: "directory", mode: 0o700, path: "layer-b/logs" },
    { kind: "directory", mode: 0o700, path: "layer-b/source" },
    { kind: "directory", mode: 0o700, path: "preflight" },
    { kind: "directory", mode: 0o700, path: "preflight/logs" },
    { kind: "directory", mode: 0o700, path: "preflight/writable" }
  ];
  const assertAbsentRunRoot = async (target: string, label: string) => {
    assert.equal(await lstatOrNull(target, `${label} run-root probe`), null,
      `${label}: rejected call created a run root`);
    assert.equal(await lstatOrNull(
      path.join(target, requestFilename),
      `${label} request-leaf probe`
    ), null, `${label}: rejected call created a request leaf`);
  };
  const retentionSchema =
    "ca.california-signature.measured-authorization-test-retention.v1";
  const retentionStatus =
    "INTENTIONALLY_RETAINED_TEST_ONLY_NON_AUTHORIZING";
  const retentionPathPlan = Object.freeze([
    Object.freeze({ path: formalNegativeRunRoot, role: "formal", state: "ABSENT" }),
    Object.freeze({ path: discoveryNegativeRunRoot, role: "discovery", state: "ABSENT" }),
    Object.freeze({
      path: preExistingNegativeRunRoot,
      role: "pre-existing",
      state: "RETAINED_EMPTY_DIRECTORY"
    }),
    Object.freeze({ path: runRoot, role: "positive", state: "RETAINED_REQUEST_HOLD" })
  ]);
  const emitRetentionDiagnostic = (value: unknown) => {
    const diagnostic = stableJson(value);
    assert.equal(diagnostic.includes("\n") || diagnostic.includes("\r"), false,
      "measured-authorization retention diagnostic must be one canonical line");
    t.diagnostic(diagnostic);
  };

  for (const [label, target] of [
    ["formal CLI initial", formalNegativeRunRoot],
    ["discovery CLI initial", discoveryNegativeRunRoot],
    ["pre-existing initial", preExistingNegativeRunRoot],
    ["positive initial", runRoot]
  ] as const) {
    await assertAbsentRunRoot(target, label);
  }
  emitRetentionDiagnostic({
    destructiveCleanupAuthorized: false,
    paths: retentionPathPlan,
    schema: retentionSchema,
    status: retentionStatus
  });

  for (const [label, rejectedCli, target] of [
    ["formal CLI", formalCli, formalNegativeRunRoot],
    ["discovery CLI", discoveryCli, discoveryNegativeRunRoot]
  ] as const) {
    await assertAbsentRunRoot(target, `${label} precondition`);
    await assert.rejects(
      () => runPreparationIntegration({
        cli: rejectedCli,
        testOnlyCanonicalRequest
      }),
      /prepare-measured-authorization-request|preparation mode/i,
      `${label}: request-preparation integration did not reject before run-root I/O`
    );
    await assertAbsentRunRoot(target, `${label} postcondition`);
  }

  await mkdir(preExistingNegativeRunRoot, { mode: 0o700 });
  await chmod(preExistingNegativeRunRoot, 0o700);
  const preExistingRootBefore = await stableDirectoryIdentity(
    preExistingNegativeRunRoot,
    "pre-existing direct-child run root before rejection"
  );
  assert.equal(preExistingRootBefore.uid, BigInt(process.getuid()),
    "pre-existing direct-child run root is not owner-bound");
  assert.equal(preExistingRootBefore.mode & BigInt(0o777), BigInt(0o700),
    "pre-existing direct-child run root is not exact mode 0700");
  assert.equal(await realpath(preExistingNegativeRunRoot), preExistingNegativeRunRoot,
    "pre-existing direct-child run root traverses a symlink");
  assert.deepEqual(await inventoryCaliforniaRunRoot(preExistingNegativeRunRoot), [],
    "pre-existing direct-child run root was not initially empty");
  await assert.rejects(
    () => runPreparationIntegration({
      cli: preExistingCli,
      testOnlyCanonicalRequest
    }),
    /fresh|absent|already exists|run root/i,
    "request-preparation integration accepted a pre-existing direct-child run root"
  );
  assert.deepEqual(
    await stableDirectoryIdentity(
      preExistingNegativeRunRoot,
      "pre-existing direct-child run root after rejection"
    ),
    preExistingRootBefore,
    "pre-existing direct-child run root identity changed during rejected preparation"
  );
  assert.deepEqual(await inventoryCaliforniaRunRoot(preExistingNegativeRunRoot), [],
    "rejected pre-existing direct-child run root gained new inventory");
  assert.equal(await lstatOrNull(
    path.join(preExistingNegativeRunRoot, requestFilename),
    "pre-existing direct-child request-leaf postcondition"
  ), null, "rejected pre-existing direct-child run root gained a request leaf");

  await assertAbsentRunRoot(runRoot, "positive run precondition");
  const result = await runPreparationIntegration({
    cli,
    testOnlyCanonicalRequest
  });
  const requestPath = path.join(runRoot, requestFilename);
  const expectedResult: IntegrationResult = {
    authorizationRequestPath: requestPath,
    authorizationRequestSha256: canonicalRequestSha256,
    browserExecutionStarted: false,
    exhaustiveExecutionAuthorized: false,
    mode: "prepare-measured-authorization-request",
    runRoot,
    serverExecutionStarted: false,
    status: "TEST_ONLY_NON_AUTHORIZING_HOLD"
  };
  assert.equal(Object.isFrozen(result), true,
    "request-preparation integration result is not frozen");
  assert.deepEqual(Object.keys(result), Object.keys(expectedResult),
    "request-preparation integration result is not the exact ordered eight-key schema");
  assert.deepEqual(result, expectedResult,
    "request-preparation integration returned an untruthful terminal HOLD");

  const runRootIdentity = await lstat(runRoot, { bigint: true });
  assert.ok(runRootIdentity.isDirectory() && !runRootIdentity.isSymbolicLink(),
    "request-preparation integration run root is not one physical directory");
  assert.equal(runRootIdentity.uid, BigInt(process.getuid()),
    "request-preparation integration run root is not owner-bound");
  assert.equal(runRootIdentity.mode & BigInt(0o777), BigInt(0o700),
    "request-preparation integration run root is not exact mode 0700");
  assert.equal(await realpath(runRoot), runRoot,
    "request-preparation integration run root traverses a symlink");
  const positiveRootBeforeRetention = await stableDirectoryIdentity(
    runRoot,
    "positive request-HOLD run root before retention"
  );

  const requestPathIdentity = await lstat(requestPath, { bigint: true });
  assert.ok(requestPathIdentity.isFile() && !requestPathIdentity.isSymbolicLink() &&
    requestPathIdentity.nlink === BigInt(1),
  "request-preparation integration request is not one physical singleton file");
  assert.equal(requestPathIdentity.uid, BigInt(process.getuid()),
    "request-preparation integration request is not owner-bound");
  assert.equal(requestPathIdentity.mode & BigInt(0o777), BigInt(0o400),
    "request-preparation integration request is not immutable mode 0400");
  assert.equal(requestPathIdentity.size, BigInt(canonicalRequestBytes.length),
    "request-preparation integration request size drifted");
  assert.equal(await realpath(requestPath), requestPath,
    "request-preparation integration request traverses a symlink");
  const requestHandle = await open(requestPath, "r");
  let publishedBytes: Buffer;
  try {
    const before = await requestHandle.stat({ bigint: true });
    assert.equal(before.dev, requestPathIdentity.dev,
      "request-preparation held request device differs from its pathname");
    assert.equal(before.ino, requestPathIdentity.ino,
      "request-preparation held request inode differs from its pathname");
    publishedBytes = await requestHandle.readFile();
    const afterRead = await requestHandle.stat({ bigint: true });
    for (const key of [
      "dev", "ino", "uid", "mode", "nlink", "size", "mtimeNs", "ctimeNs", "birthtimeNs"
    ] as const) {
      assert.equal(afterRead[key], before[key],
        `request-preparation held request ${key} changed during readback`);
    }
  } finally {
    await requestHandle.close();
  }
  assert.deepEqual(publishedBytes!, canonicalRequestBytes,
    "request-preparation integration request canonical bytes drifted");
  assert.equal(digest(publishedBytes!), canonicalRequestSha256,
    "request-preparation integration request SHA-256 drifted");
  const requestFinalIdentity = await lstat(requestPath, { bigint: true });
  assert.equal(requestFinalIdentity.dev, requestPathIdentity.dev,
    "request-preparation integration final request device changed");
  assert.equal(requestFinalIdentity.ino, requestPathIdentity.ino,
    "request-preparation integration final request inode changed");

  const inventory = await inventoryCaliforniaRunRoot(runRoot);
  const files = inventory.filter((row) => row.kind === "file");
  assert.deepEqual(files, [{
    kind: "file",
    mode: 0o400,
    path: requestFilename,
    sha256: canonicalRequestSha256,
    size: canonicalRequestBytes.length
  }], "request-preparation integration created receipt, marker, build, browser, report, or seal files");
  assert.equal(inventory.filter((row) => row.kind === "directory")
    .every((row) => row.mode === 0o700), true,
  "request-preparation integration created a non-owner-only directory");
  assert.deepEqual(inventory, expectedPositiveInventory,
    "request-preparation integration retained inventory is not the exact directory/request set");

  await assertAbsentRunRoot(formalNegativeRunRoot, "formal CLI final retention");
  await assertAbsentRunRoot(discoveryNegativeRunRoot, "discovery CLI final retention");
  const preExistingRootFinal = await stableDirectoryIdentity(
    preExistingNegativeRunRoot,
    "pre-existing direct-child final retained root"
  );
  assert.deepEqual(preExistingRootFinal, preExistingRootBefore,
    "pre-existing retained root full identity changed before final diagnostic");
  const preExistingFinalInventory = await inventoryCaliforniaRunRoot(preExistingNegativeRunRoot);
  assert.deepEqual(preExistingFinalInventory, [],
    "pre-existing retained root gained inventory before final diagnostic");

  const positiveRootFinalIdentity = await stableDirectoryIdentity(
    runRoot,
    "positive request-HOLD final retained root"
  );
  assert.deepEqual(positiveRootFinalIdentity, positiveRootBeforeRetention,
    "positive retained root full identity changed before final diagnostic");
  assert.equal(positiveRootFinalIdentity.uid, BigInt(process.getuid()),
    "positive retained root is not owner-bound before final diagnostic");
  assert.equal(positiveRootFinalIdentity.mode & BigInt(0o777), BigInt(0o700),
    "positive retained root is not exact mode 0700 before final diagnostic");
  assert.equal(await realpath(runRoot), runRoot,
    "positive retained root traverses a symlink before final diagnostic");
  const positiveFinalInventory = await inventoryCaliforniaRunRoot(runRoot);
  assert.deepEqual(positiveFinalInventory, expectedPositiveInventory,
    "positive retained root final inventory drifted");
  const positiveRequestFinalIdentity = await lstat(requestPath, { bigint: true });
  assert.ok(positiveRequestFinalIdentity.isFile() &&
    !positiveRequestFinalIdentity.isSymbolicLink() &&
    positiveRequestFinalIdentity.nlink === BigInt(1),
  "positive retained request is not one physical singleton file before final diagnostic");
  assert.equal(positiveRequestFinalIdentity.uid, BigInt(process.getuid()),
    "positive retained request is not owner-bound before final diagnostic");
  assert.equal(positiveRequestFinalIdentity.mode & BigInt(0o777), BigInt(0o400),
    "positive retained request is not immutable mode 0400 before final diagnostic");
  assert.equal(positiveRequestFinalIdentity.size, BigInt(canonicalRequestBytes.length),
    "positive retained request size drifted before final diagnostic");
  assert.equal(positiveRequestFinalIdentity.dev, requestPathIdentity.dev,
    "positive retained request device drifted before final diagnostic");
  assert.equal(positiveRequestFinalIdentity.ino, requestPathIdentity.ino,
    "positive retained request inode drifted before final diagnostic");
  const positiveRequestFinalBytes = await readFile(requestPath);
  assert.deepEqual(positiveRequestFinalBytes, canonicalRequestBytes,
    "positive retained request bytes drifted before final diagnostic");
  assert.equal(digest(positiveRequestFinalBytes), canonicalRequestSha256,
    "positive retained request SHA-256 drifted before final diagnostic");

  assert.deepEqual(await readFile(anchorPath), anchorBytes,
    "request-preparation integration changed its disjoint ledger anchor");
  const anchorAfter = await lstat(anchorPath, { bigint: true });
  assert.equal(anchorAfter.dev, anchorIdentity.dev,
    "request-preparation integration changed fixture anchor device");
  assert.equal(anchorAfter.ino, anchorIdentity.ino,
    "request-preparation integration changed fixture anchor inode");
  assert.deepEqual(await readFile(capacityPlanPath), capacityPlanBytes,
    "request-preparation integration changed its capacity-plan fixture");
  const capacityPlanAfter = await lstat(capacityPlanPath, { bigint: true });
  assert.equal(capacityPlanAfter.dev, capacityPlanIdentity.dev,
    "request-preparation integration changed capacity-plan device");
  assert.equal(capacityPlanAfter.ino, capacityPlanIdentity.ino,
    "request-preparation integration changed capacity-plan inode");

  emitRetentionDiagnostic({
    destructiveCleanupAttempted: false,
    destructiveCleanupAuthorized: false,
    paths: [
      {
        actualPath: null,
        exists: false,
        expectedPath: formalNegativeRunRoot,
        identity: null,
        inventory: null,
        request: null,
        role: "formal",
        state: "ABSENT"
      },
      {
        actualPath: null,
        exists: false,
        expectedPath: discoveryNegativeRunRoot,
        identity: null,
        inventory: null,
        request: null,
        role: "discovery",
        state: "ABSENT"
      },
      {
        actualPath: preExistingNegativeRunRoot,
        exists: true,
        expectedPath: preExistingNegativeRunRoot,
        identity: decimalIdentity(preExistingRootFinal),
        inventory: preExistingFinalInventory,
        request: null,
        role: "pre-existing",
        state: "RETAINED_EMPTY_DIRECTORY"
      },
      {
        actualPath: runRoot,
        exists: true,
        expectedPath: runRoot,
        identity: decimalIdentity(positiveRootFinalIdentity),
        inventory: positiveFinalInventory,
        request: {
          mode: (positiveRequestFinalIdentity.mode & BigInt(0o777)).toString(10),
          path: requestPath,
          sha256: canonicalRequestSha256,
          size: positiveRequestFinalIdentity.size.toString(10)
        },
        role: "positive",
        state: "RETAINED_REQUEST_HOLD"
      }
    ],
    schema: retentionSchema,
    status: retentionStatus
  });
});

test("measured-authorization publisher accepts only opaque disjoint run-root capabilities", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const issuer = Reflect.get(
    runnerModule,
    "__testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability"
  ) as unknown;
  assert.equal(typeof issuer, "function",
    "runner must export the isolated test-only measured-authorization run-root capability issuer");
  const publisher = Reflect.get(
    runnerModule,
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  ) as unknown;
  assert.equal(typeof publisher, "function",
    "runner must retain the production measured-authorization request publisher");
  const requestFilename = Reflect.get(
    runnerModule,
    "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME"
  );
  assert.equal(
    requestFilename,
    ".california-signature-measured-authorization-request.json",
    "capability contract requires the fixed measured-authorization request filename"
  );

  const authorizedParentRoot = path.join(
    pureRoot,
    highEntropy("request-capability-authorized-parent")
  );
  const protectedLedgerRoot = path.join(
    authorizedParentRoot,
    highEntropy("request-capability-protected-ledger")
  );
  const validRunRoot = path.join(
    authorizedParentRoot,
    highEntropy("request-capability-valid-run")
  );
  await mkdir(authorizedParentRoot, { mode: 0o700 });
  await chmod(authorizedParentRoot, 0o700);
  await mkdir(protectedLedgerRoot, { mode: 0o700 });
  await chmod(protectedLedgerRoot, 0o700);
  await mkdir(validRunRoot, { mode: 0o700 });
  await chmod(validRunRoot, 0o700);
  for (const [label, root] of [
    ["authorized testing parent", authorizedParentRoot],
    ["synthetic protected ledger", protectedLedgerRoot],
    ["valid testing run root", validRunRoot]
  ] as const) {
    const identity = await lstat(root);
    assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
      `${label} must be one physical directory`);
    assert.equal(identity.mode & 0o777, 0o700, `${label} must be exact mode 0700`);
    assert.equal(identity.uid, process.getuid(), `${label} must be owner-bound`);
    assert.equal(await realpath(root), root, `${label} must not traverse a symlink`);
  }
  assert.equal(path.dirname(protectedLedgerRoot), authorizedParentRoot);
  assert.equal(path.dirname(validRunRoot), authorizedParentRoot);

  const issue = issuer as (options: {
    testOnlyAuthorizedParentRoot: string;
    testOnlyProtectedLedgerRoot: string;
    testOnlyRunRoot: string;
  }) => object | Promise<object>;
  const publish = publisher as (
    options: Record<string, unknown>
  ) => Promise<unknown>;
  const issuerOptions = (testOnlyRunRoot: string) => ({
    testOnlyAuthorizedParentRoot: authorizedParentRoot,
    testOnlyProtectedLedgerRoot: protectedLedgerRoot,
    testOnlyRunRoot
  });
  const assertNoRequestLeaf = async (root: string, label: string) => {
    const target = path.join(root, requestFilename);
    const identity = await lstat(target).catch((error: NodeJS.ErrnoException) => {
      assert.equal(error.code, "ENOENT", `${label}: request-leaf probe failed unexpectedly`);
      return null;
    });
    assert.equal(identity, null, `${label}: rejected authority created a request leaf`);
  };

  const protectedRelations = [
    ["protected exact", protectedLedgerRoot],
    ["protected ancestor", authorizedParentRoot],
    ["protected descendant", path.join(protectedLedgerRoot, "not-created-descendant")]
  ] as const;
  for (const [label, candidate] of protectedRelations) {
    await assert.rejects(
      async () => issue(issuerOptions(candidate)),
      /protected|disjoint/i,
      `${label}: issuer did not reject the protected-root relation lexically`
    );
    await assertNoRequestLeaf(candidate, label);
  }

  const unrelatedRoot = path.join(pureRoot, highEntropy("request-capability-unrelated"));
  await assert.rejects(
    async () => issue(issuerOptions(unrelatedRoot)),
    /authorized.*parent|direct child|test-only/i,
    "issuer accepted an unrelated testing root"
  );
  await assertNoRequestLeaf(unrelatedRoot, "unrelated testing root");

  const directProductionShapedRoot = path.join(
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    highEntropy("request-capability-production-shape")
  );
  await assert.rejects(
    async () => issue(issuerOptions(directProductionShapedRoot)),
    /production|authorized.*parent|direct child|test-only/i,
    "issuer accepted a direct-production-shaped run root"
  );
  await assertNoRequestLeaf(directProductionShapedRoot,
    "direct-production-shaped testing root");

  await assert.rejects(
    async () => issue({
      ...issuerOptions(validRunRoot),
      unexpected: true
    } as never),
    /exact schema|unknown/i,
    "test-only capability issuer accepted an unknown option"
  );
  await assertNoRequestLeaf(validRunRoot, "unknown issuer option");

  const testOnlyRunRootCapability = await issue(issuerOptions(validRunRoot));
  assert.ok(testOnlyRunRootCapability && typeof testOnlyRunRootCapability === "object" &&
    !Array.isArray(testOnlyRunRootCapability),
  "test-only run-root capability must be one opaque object");
  assert.deepEqual(Object.keys(testOnlyRunRootCapability), [],
    "test-only run-root capability must expose zero keys");
  assert.equal(Object.isFrozen(testOnlyRunRootCapability), true,
    "test-only run-root capability must be deeply frozen");
  await assertNoRequestLeaf(validRunRoot, "capability issuance");

  const request = {
    acceptanceRunId: `acceptance-${"a".repeat(40)}`,
    attemptId: `attempt-${"b".repeat(40)}`,
    attemptLedger: {
      anchorSha256: "1".repeat(64),
      ledgerId: `ledger-${"c".repeat(40)}`,
      rootBirthtimeNs: "1700000000000000000",
      rootDev: "12345",
      rootIno: "67890",
      rootPathSha256: "2".repeat(64)
    },
    buildId: `build-${"d".repeat(40)}`,
    executionPlanSha256: "3".repeat(64),
    launchCommand: {
      projects: ["desktop-chrome", "mobile-chrome"],
      repeatEach: 1,
      reporter: "json",
      retries: 0,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
      workers: 1
    },
    matrixRunId: `matrix-${"e".repeat(40)}`,
    maxInvocations: 1,
    origin: "http://127.0.0.1:43112",
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    runtimeRunId: `runtime-${"f".repeat(40)}`,
    schema: "ca.california-signature.measured-authorization-request.v1",
    sourceSnapshotSha256: "4".repeat(64),
    status: "AWAITING_OWNER_REVIEW"
  } as const;

  await assert.rejects(
    () => publish({ request, runRoot: validRunRoot }),
    /exact schema|runRootCapability|raw.*runRoot|capability/i,
    "production publisher retained a raw runRoot authority input"
  );
  await assertNoRequestLeaf(validRunRoot, "raw production runRoot");
  await assert.rejects(
    () => publish({ request, runRootCapability: testOnlyRunRootCapability }),
    /production.*capability|invalid.*capability|authority|runRootCapability/i,
    "production publisher accepted a test-only capability"
  );
  await assertNoRequestLeaf(validRunRoot, "test capability in production publisher");

  for (const [label, forged] of [
    ["structured clone", structuredClone(testOnlyRunRootCapability)],
    ["fresh frozen zero-key object", Object.freeze({})]
  ] as const) {
    await assert.rejects(
      () => publish({ request, runRootCapability: forged }),
      /production.*capability|invalid.*capability|authority|runRootCapability/i,
      `production publisher accepted a forged ${label}`
    );
    await assertNoRequestLeaf(validRunRoot, `forged ${label}`);
  }
  await assert.rejects(
    () => publish({
      request,
      runRootCapability: testOnlyRunRootCapability,
      unexpected: true
    }),
    /exact schema|unknown/i,
    "production publisher accepted an unknown option"
  );
  await assertNoRequestLeaf(validRunRoot, "unknown production publisher option");

  const runnerSource = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  ), "utf8");
  assert.match(
    runnerSource,
    /const productionRequestRunRootCapabilities\s*=\s*new WeakMap/s,
    "production run-root capabilities must live in one private module WeakMap"
  );
  assert.doesNotMatch(
    runnerSource,
    /export\s+(?:const|let|var)\s+productionRequestRunRootCapabilities/,
    "production run-root capability registry must not be exported"
  );
  assert.match(runnerSource, /const testingRequestRunRootCapabilities\s*=\s*new WeakMap/s,
    "test-only run-root capabilities require a disjoint module WeakMap");
  const publisherStart = runnerSource.indexOf(
    "export async function publishCaliforniaSignatureMeasuredAuthorizationRequest"
  );
  const publisherSignatureEnd = runnerSource.indexOf("\n) {", publisherStart);
  assert.ok(publisherStart >= 0 && publisherSignatureEnd > publisherStart,
    "production publisher signature is missing");
  const publisherSignature = runnerSource.slice(publisherStart, publisherSignatureEnd);
  assert.match(publisherSignature, /runRootCapability\s*:/,
    "production publisher signature lacks opaque run-root authority");
  assert.doesNotMatch(publisherSignature, /\brunRoot\s*:/,
    "production publisher signature still exposes raw runRoot selection");

  const issuerName =
    "export async function __testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability";
  const issuerStart = runnerSource.indexOf(issuerName);
  const issuerEndCandidate = runnerSource.indexOf("\nexport ", issuerStart + issuerName.length);
  assert.ok(issuerStart >= 0, "test-only capability issuer source is missing");
  const issuerSource = runnerSource.slice(
    issuerStart,
    issuerEndCandidate >= 0 ? issuerEndCandidate : runnerSource.length
  );
  const disjointGuardName =
    "assertTestOnlyMeasuredAuthorizationPublicationRootsDisjointFromProductionLedger";
  const disjointGuardIndex = issuerSource.indexOf(`${disjointGuardName}(`);
  assert.ok(disjointGuardIndex >= 0,
    "test-only issuer does not call the central production-ledger disjointness guard");
  const firstCandidateIoIndex = ["lstat(", "realpath(", "open(", "mkdir("]
    .map((token) => issuerSource.indexOf(token))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? Number.POSITIVE_INFINITY;
  assert.ok(disjointGuardIndex < firstCandidateIoIndex,
    "production-ledger disjointness must run before candidate filesystem I/O");
  assert.match(runnerSource,
    new RegExp(`function\\s+${disjointGuardName}\\b`),
  "runner lacks one central test-only production-ledger disjointness guard");
  assert.match(runnerSource,
    /CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT/,
    "test-only root guard is not lexically bound to the real production-ledger constant");
});

test("measured-authorization request publisher Stage B: test authority, exact durability, EEXIST, and closure", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const testOnlyPublisher = Reflect.get(
    runnerModule,
    "__testingPublishCaliforniaSignatureMeasuredAuthorizationRequest"
  ) as unknown;
  assert.equal(typeof testOnlyPublisher, "function",
    "runner must export the disjoint test-only Stage-B measured-authorization request publisher");

  const issuer = Reflect.get(
    runnerModule,
    "__testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability"
  ) as unknown;
  assert.equal(typeof issuer, "function",
    "runner must retain the isolated test-only run-root capability issuer");
  const productionPublisher = Reflect.get(
    runnerModule,
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  ) as unknown;
  assert.equal(typeof productionPublisher, "function",
    "runner must retain the opaque-capability production request publisher");
  const requestFilename = Reflect.get(
    runnerModule,
    "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME"
  ) as unknown;
  assert.equal(
    requestFilename,
    ".california-signature-measured-authorization-request.json",
    "runner must export the one fixed measured-authorization request filename"
  );
  const fixedRequestFilename = requestFilename as string;

  const successStages = [
    "PARENT_ROOT_FDS_BOUND",
    "HELPER_ROOT_FD_BOUND",
    "REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD",
    "REQUEST_WRITTEN",
    "REQUEST_FILE_FSYNCED",
    "REQUEST_SAME_FD_READBACK_VERIFIED",
    "REQUEST_FROZEN_0400",
    "REQUEST_FROZEN_FILE_FSYNCED",
    "REQUEST_ROOT_FSYNCED",
    "REQUEST_FINAL_BINDING_VERIFIED",
    "HELPER_DURABLE",
    "HELPER_EXITED",
    "PUBLICATION_READER_VERIFIED",
    "FINAL_ROOT_AND_ANCESTOR_BINDING_VERIFIED",
    "PARENT_ROOT_FDS_CLOSED",
    "READY_TO_RETURN"
  ] as const;
  type PublicationEventStage = typeof successStages[number];
  type PublicationEvent = Readonly<{
    byteLength: number | null;
    fileIdentityToken: string | null;
    mode: 384 | 256 | null;
    parentIdentityToken: string;
    requestName: typeof fixedRequestFilename | null;
    requestSha256: string | null;
    runRootIdentityToken: string;
    stage: PublicationEventStage;
  }>;
  type TestOnlyControl = Readonly<{
    barrierStage: "NONE";
    faultStage: "NONE";
    onBarrier: null;
    onEvent: (event: PublicationEvent) => void;
  }>;
  type PublicationResult = Readonly<{
    authorizationRequestPath: string;
    authorizationRequestSha256: string;
  }>;
  const publishForTesting = testOnlyPublisher as (options: {
    request: Record<string, unknown>;
    testOnlyControl: TestOnlyControl;
    testOnlyRunRootCapability: object;
  }) => Promise<PublicationResult>;
  const publishForProduction = productionPublisher as (
    options: Record<string, unknown>
  ) => Promise<unknown>;
  const issue = issuer as (options: {
    testOnlyAuthorizedParentRoot: string;
    testOnlyProtectedLedgerRoot: string;
    testOnlyRunRoot: string;
  }) => Promise<object>;

  const eventKeys = [
    "byteLength",
    "fileIdentityToken",
    "mode",
    "parentIdentityToken",
    "requestName",
    "requestSha256",
    "runRootIdentityToken",
    "stage"
  ] as const;
  const makeNoneControl = (events: PublicationEvent[]): TestOnlyControl => {
    const control = Object.freeze({
      barrierStage: "NONE" as const,
      faultStage: "NONE" as const,
      onBarrier: null,
      onEvent(event: PublicationEvent) {
        events.push(event);
      }
    });
    assert.deepEqual(Object.keys(control).sort(), [
      "barrierStage",
      "faultStage",
      "onBarrier",
      "onEvent"
    ], "Stage-B NONE control schema drifted");
    assert.equal(Object.isFrozen(control), true,
      "Stage-B NONE control must be frozen before publication");
    return control;
  };
  const assertBaseEvent = (
    event: PublicationEvent,
    expectedStage: PublicationEventStage,
    label: string
  ) => {
    assert.deepEqual(Object.keys(event).sort(), [...eventKeys].sort(),
      `${label}: event schema drifted`);
    assert.equal(Object.isFrozen(event), true, `${label}: event is not frozen`);
    assert.equal(event.stage, expectedStage, `${label}: event stage drifted`);
    assert.match(event.parentIdentityToken, /^[0-9a-f]{64}$/,
      `${label}: parent identity token is not opaque SHA-256`);
    assert.match(event.runRootIdentityToken, /^[0-9a-f]{64}$/,
      `${label}: run-root identity token is not opaque SHA-256`);
    assert.notEqual(event.parentIdentityToken, event.runRootIdentityToken,
      `${label}: parent and run-root identity tokens collapsed`);
  };
  const assertSuccessEvents = (
    events: PublicationEvent[],
    expectedBytes: Buffer,
    expectedSha256: string
  ) => {
    assert.equal(successStages.length, 16,
      "Stage-B success contract must contain exactly sixteen stages");
    assert.deepEqual(events.map((event) => event.stage), [...successStages],
      "Stage-B durability/reader/closure event order drifted");
    let parentToken: string | null = null;
    let runRootToken: string | null = null;
    let fileToken: string | null = null;
    events.forEach((event, index) => {
      const label = `Stage-B event ${index + 1} ${successStages[index]}`;
      assertBaseEvent(event, successStages[index], label);
      parentToken ??= event.parentIdentityToken;
      runRootToken ??= event.runRootIdentityToken;
      assert.equal(event.parentIdentityToken, parentToken,
        `${label}: parent identity token changed`);
      assert.equal(event.runRootIdentityToken, runRootToken,
        `${label}: run-root identity token changed`);
      if (index < 2) {
        assert.equal(event.fileIdentityToken, null,
          `${label}: file identity appeared before exclusive creation`);
        assert.equal(event.mode, null, `${label}: file mode appeared before creation`);
        assert.equal(event.requestName, null,
          `${label}: request name appeared before exclusive creation`);
      } else {
        assert.match(event.fileIdentityToken ?? "", /^[0-9a-f]{64}$/,
          `${label}: file identity token is not opaque SHA-256`);
        fileToken ??= event.fileIdentityToken;
        assert.equal(event.fileIdentityToken, fileToken,
          `${label}: helper-created file identity token changed`);
        assert.notEqual(event.fileIdentityToken, parentToken,
          `${label}: file and parent identity tokens collapsed`);
        assert.notEqual(event.fileIdentityToken, runRootToken,
          `${label}: file and run-root identity tokens collapsed`);
        assert.equal(event.requestName, fixedRequestFilename,
          `${label}: fixed request name drifted`);
        assert.equal(event.mode, index < 6 ? 0o600 : 0o400,
          `${label}: immutable mode chronology drifted`);
      }
      if (index < 3) {
        assert.equal(event.byteLength, null,
          `${label}: byte length appeared before the write`);
        assert.equal(event.requestSha256, null,
          `${label}: byte receipt appeared before the write`);
      } else {
        assert.equal(event.byteLength, expectedBytes.length,
          `${label}: canonical byte length changed`);
        assert.equal(event.requestSha256, expectedSha256,
          `${label}: canonical byte SHA-256 changed`);
      }
    });
  };
  const immutableFileIdentity = (identity: Awaited<ReturnType<typeof lstat>>) => ({
    birthtimeMs: identity.birthtimeMs,
    ctimeMs: identity.ctimeMs,
    dev: identity.dev,
    gid: identity.gid,
    ino: identity.ino,
    mode: identity.mode,
    mtimeMs: identity.mtimeMs,
    nlink: identity.nlink,
    size: identity.size,
    uid: identity.uid
  });
  const assertRecursivelyFrozen = (value: unknown, label: string): void => {
    if (!value || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      assertRecursivelyFrozen(nested, `${label}.${key}`);
    }
  };

  const request = {
    acceptanceRunId: `acceptance-${"a".repeat(40)}`,
    attemptId: `attempt-${"b".repeat(40)}`,
    attemptLedger: {
      anchorSha256: "1".repeat(64),
      ledgerId: `ledger-${"c".repeat(40)}`,
      rootBirthtimeNs: "1700000000000000000",
      rootDev: "12345",
      rootIno: "67890",
      rootPathSha256: "2".repeat(64)
    },
    buildId: `build-${"d".repeat(40)}`,
    executionPlanSha256: "3".repeat(64),
    launchCommand: {
      projects: ["desktop-chrome", "mobile-chrome"],
      repeatEach: 1,
      reporter: "json",
      retries: 0,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
      workers: 1
    },
    matrixRunId: `matrix-${"e".repeat(40)}`,
    maxInvocations: 1,
    origin: "http://127.0.0.1:43112",
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    runtimeRunId: `runtime-${"f".repeat(40)}`,
    schema: "ca.california-signature.measured-authorization-request.v1",
    sourceSnapshotSha256: "4".repeat(64),
    status: "AWAITING_OWNER_REVIEW"
  } as const;
  const expectedBytes = Buffer.from(`${JSON.stringify(request, null, 2)}\n`, "utf8");
  const expectedSha256 = digest(expectedBytes);

  const authorizedParentRoot = path.join(
    pureRoot,
    highEntropy("request-stage-b-authorized-parent")
  );
  const protectedLedgerRoot = path.join(
    authorizedParentRoot,
    highEntropy("request-stage-b-protected-ledger")
  );
  const runRoot = path.join(
    authorizedParentRoot,
    highEntropy("request-stage-b-run")
  );
  await mkdir(authorizedParentRoot, { mode: 0o700 });
  await chmod(authorizedParentRoot, 0o700);
  await mkdir(protectedLedgerRoot, { mode: 0o700 });
  await chmod(protectedLedgerRoot, 0o700);
  await mkdir(runRoot, { mode: 0o700 });
  await chmod(runRoot, 0o700);
  assert.equal(path.dirname(protectedLedgerRoot), authorizedParentRoot,
    "synthetic protected ledger must be one authorized-parent child");
  assert.equal(path.dirname(runRoot), authorizedParentRoot,
    "Stage-B run root must be one authorized-parent child");
  for (const [label, root] of [
    ["authorized parent", authorizedParentRoot],
    ["synthetic protected ledger", protectedLedgerRoot],
    ["run root", runRoot]
  ] as const) {
    const identity = await lstat(root);
    assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
      `${label} must be one physical directory`);
    assert.equal(identity.mode & 0o777, 0o700, `${label} must be exact mode 0700`);
    assert.equal(identity.uid, process.getuid(), `${label} must be owner-bound`);
    assert.equal(await realpath(root), root, `${label} must not traverse a symlink`);
  }

  const issuerOptions = {
    testOnlyAuthorizedParentRoot: authorizedParentRoot,
    testOnlyProtectedLedgerRoot: protectedLedgerRoot,
    testOnlyRunRoot: runRoot
  };
  const firstCapability = await issue(issuerOptions);
  const secondCapability = await issue(issuerOptions);
  for (const [label, capability] of [
    ["first", firstCapability],
    ["second", secondCapability]
  ] as const) {
    assert.ok(capability && typeof capability === "object" && !Array.isArray(capability),
      `${label} testing run-root capability is not one opaque object`);
    assert.deepEqual(Object.keys(capability), [],
      `${label} testing run-root capability exposed properties`);
    assert.equal(Object.isFrozen(capability), true,
      `${label} testing run-root capability is not frozen`);
  }

  const successEvents: PublicationEvent[] = [];
  const publication = await publishForTesting({
    request: request as unknown as Record<string, unknown>,
    testOnlyControl: makeNoneControl(successEvents),
    testOnlyRunRootCapability: firstCapability
  });
  assert.deepEqual(Object.keys(publication).sort(), [
    "authorizationRequestPath",
    "authorizationRequestSha256"
  ], "Stage-B publication returned extra keys");
  assertRecursivelyFrozen(publication, "Stage-B publication result");
  const expectedPath = path.join(runRoot, fixedRequestFilename);
  assert.equal(publication.authorizationRequestPath, expectedPath,
    "Stage-B publisher returned a noncanonical request path");
  assert.equal(publication.authorizationRequestSha256, expectedSha256,
    "Stage-B publisher returned the wrong canonical request SHA-256");
  assertSuccessEvents(successEvents, expectedBytes, expectedSha256);
  assert.equal(path.dirname(publication.authorizationRequestPath), runRoot,
    "Stage-B request must be one direct run-root child");
  assert.equal(await realpath(expectedPath), expectedPath,
    "Stage-B request path must not traverse a symlink");
  const publishedBytes = await readFile(expectedPath);
  assert.deepEqual(publishedBytes, expectedBytes,
    "Stage-B request bytes are not exact canonical pretty JSON plus LF");
  const publishedIdentity = await lstat(expectedPath);
  assert.ok(publishedIdentity.isFile() && !publishedIdentity.isSymbolicLink(),
    "Stage-B request must be one physical regular file");
  assert.equal(publishedIdentity.uid, process.getuid(),
    "Stage-B request must be owner-bound");
  assert.equal(publishedIdentity.nlink, 1,
    "Stage-B request must remain one singleton inode");
  assert.equal(publishedIdentity.mode & 0o777, 0o400,
    "Stage-B request must be immutable mode 0400");
  assert.equal(publishedIdentity.size, expectedBytes.length,
    "Stage-B request size differs from its canonical bytes");
  const publishedIdentityBefore = immutableFileIdentity(publishedIdentity);
  const runRootIdentityBefore = immutableFileIdentity(await lstat(runRoot));
  const publishedBytesBefore = Buffer.from(publishedBytes);
  const assertPublishedArtifactUnchanged = async (label: string) => {
    assert.deepEqual(
      immutableFileIdentity(await lstat(expectedPath)),
      publishedIdentityBefore,
      `${label}: published inode identity changed`
    );
    assert.deepEqual(await readFile(expectedPath), publishedBytesBefore,
      `${label}: published canonical bytes changed`);
    assert.deepEqual(
      immutableFileIdentity(await lstat(runRoot)),
      runRootIdentityBefore,
      `${label}: run-root identity changed after held-FD closure`
    );
  };

  const eexistEvents: PublicationEvent[] = [];
  await assert.rejects(
    () => publishForTesting({
      request: request as unknown as Record<string, unknown>,
      testOnlyControl: makeNoneControl(eexistEvents),
      testOnlyRunRootCapability: secondCapability
    }),
    (error: unknown) => {
      const candidate = error as NodeJS.ErrnoException;
      assert.equal(candidate.code, "EEXIST",
        "second capability must surface the exclusive-create EEXIST code");
      assert.equal(candidate.message,
        "California measured-authorization request already exists",
      "second capability must expose only the fixed EEXIST message");
      return true;
    },
    "second testing capability overwrote the immutable request singleton"
  );
  const eexistStages: PublicationEventStage[] = [
    "PARENT_ROOT_FDS_BOUND",
    "HELPER_ROOT_FD_BOUND",
    "HELPER_EXITED",
    "PARENT_ROOT_FDS_CLOSED"
  ];
  assert.deepEqual(eexistEvents.map((event) => event.stage), eexistStages,
    "EEXIST event prefix or closure order drifted");
  eexistEvents.forEach((event, index) => {
    const label = `EEXIST event ${index + 1}`;
    assertBaseEvent(event, eexistStages[index], label);
    assert.equal(event.fileIdentityToken, null,
      `${label}: EEXIST invented a helper-created file identity`);
    assert.equal(event.byteLength, null, `${label}: EEXIST invented written bytes`);
    assert.equal(event.mode, null, `${label}: EEXIST invented a file mode`);
    assert.equal(event.requestName, null, `${label}: EEXIST invented a created name`);
    assert.equal(event.requestSha256, null, `${label}: EEXIST leaked a request digest`);
  });
  await assertPublishedArtifactUnchanged("second-capability EEXIST");

  const spentEvents: PublicationEvent[] = [];
  await assert.rejects(
    () => publishForTesting({
      request: request as unknown as Record<string, unknown>,
      testOnlyControl: makeNoneControl(spentEvents),
      testOnlyRunRootCapability: firstCapability
    }),
    (error: unknown) => {
      const candidate = error as Error & { code?: string };
      assert.equal(candidate.code,
        "INVALID_MEASURED_AUTHORIZATION_REQUEST_PUBLICATION_AUTHORITY",
      "spent testing capability must expose the fixed authority-error code");
      assert.equal(candidate.message,
        "California measured-authorization request publication authority is invalid",
      "spent testing capability must expose the fixed content-blind authority message");
      return true;
    },
    "successful testing capability was reusable"
  );
  assert.deepEqual(spentEvents, [],
    "spent testing capability reached publication events");
  await assertPublishedArtifactUnchanged("spent first capability");

  const productionRejections: Array<readonly [string, Record<string, unknown>]> = [
    ["raw runRoot", { request, runRoot }],
    ["test-only capability", {
      request,
      runRootCapability: firstCapability
    }],
    ["test control token", {
      request,
      runRootCapability: firstCapability,
      testOnlyControl: makeNoneControl([])
    }],
    ["structured-cloned capability", {
      request,
      runRootCapability: structuredClone(firstCapability)
    }],
    ["frozen zero-key forgery", {
      request,
      runRootCapability: Object.freeze({})
    }]
  ];
  for (const [label, options] of productionRejections) {
    await assert.rejects(
      () => publishForProduction(options),
      /exact schema|unknown|production.*capability|invalid.*capability|authority|runRootCapability/i,
      `production publisher accepted ${label}`
    );
    await assertPublishedArtifactUnchanged(`production rejection for ${label}`);
  }

  for (const [label, forged] of [
    ["structured-cloned test capability", structuredClone(firstCapability)],
    ["fresh frozen zero-key test capability", Object.freeze({})]
  ] as const) {
    const forgedEvents: PublicationEvent[] = [];
    await assert.rejects(
      () => publishForTesting({
        request: request as unknown as Record<string, unknown>,
        testOnlyControl: makeNoneControl(forgedEvents),
        testOnlyRunRootCapability: forged
      }),
      /invalid|authority|capability/i,
      `test-only publisher accepted ${label}`
    );
    assert.deepEqual(forgedEvents, [], `${label} reached publication events`);
    await assertPublishedArtifactUnchanged(`test-only rejection for ${label}`);
  }

  const runnerSource = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts"
  ), "utf8");
  const lifecycleImportEnd = runnerSource.indexOf(
    "from \"../tests/e2e/california-signature-exhaustive-artifact-lifecycle\";"
  );
  const lifecycleImportStart = runnerSource.lastIndexOf("import {", lifecycleImportEnd);
  assert.ok(lifecycleImportStart >= 0 && lifecycleImportEnd > lifecycleImportStart,
    "runner lifecycle import block is missing");
  const lifecycleImport = runnerSource.slice(lifecycleImportStart, lifecycleImportEnd);
  assert.match(lifecycleImport,
    /\bprepareCaliforniaSignatureMeasuredAuthorizationRequestPublication\b/,
  "publisher must import the lifecycle pure request-publication preparation");
  assert.match(lifecycleImport,
    /\breadCaliforniaSignatureMeasuredAuthorizationRequestForPublication\b/,
  "publisher must import the identity-aware production request reader");
  assert.match(runnerSource,
    /\bprepareCaliforniaSignatureMeasuredAuthorizationRequestPublication\s*\(\s*\{/,
  "publisher never calls the lifecycle pure preparation output");
  assert.match(runnerSource,
    /\breadCaliforniaSignatureMeasuredAuthorizationRequestForPublication\s*\(\s*\{/,
  "publisher never calls the identity-aware production reader");

  const exportedFunctionSource = (name: string) => {
    const marker = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`);
    const match = marker.exec(runnerSource);
    assert.ok(match, `${name}: exported source is missing`);
    const start = match.index;
    const nextExport = runnerSource.indexOf("\nexport ", start + match[0].length);
    return runnerSource.slice(start, nextExport >= 0 ? nextExport : runnerSource.length);
  };
  const productionPublisherSource = exportedFunctionSource(
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  );
  const testingPublisherSource = exportedFunctionSource(
    "__testingPublishCaliforniaSignatureMeasuredAuthorizationRequest"
  );
  assert.match(productionPublisherSource, /\bproductionRequestRunRootCapabilities\b/,
    "production wrapper is not lexically bound to the production capability map");
  assert.doesNotMatch(productionPublisherSource, /\btestingRequestRunRootCapabilities\b/,
    "production wrapper can select the testing capability map");
  assert.match(testingPublisherSource, /\btestingRequestRunRootCapabilities\b/,
    "test-only wrapper is not lexically bound to the testing capability map");
  assert.doesNotMatch(testingPublisherSource, /\bproductionRequestRunRootCapabilities\b/,
    "test-only wrapper can select the production capability map");
  const productionSignatureEnd = productionPublisherSource.indexOf("\n) {");
  const testingSignatureEnd = testingPublisherSource.indexOf("\n) {");
  assert.ok(productionSignatureEnd > 0 && testingSignatureEnd > 0,
    "Stage-B publisher signature source is malformed");
  const productionSignature = productionPublisherSource.slice(0, productionSignatureEnd);
  const testingSignature = testingPublisherSource.slice(0, testingSignatureEnd);
  assert.match(productionSignature, /\brunRootCapability\s*:/,
    "production wrapper lacks opaque run-root authority");
  assert.doesNotMatch(productionSignature, /\brunRoot\s*:/,
    "production wrapper exposes raw runRoot authority");
  assert.doesNotMatch(productionSignature, /\btestOnly(?:Control|RunRootCapability)\b/,
    "production wrapper exposes test-only controls or authority");
  assert.match(testingSignature, /\btestOnlyControl\s*:/,
    "test-only wrapper lacks the exact Stage-B control");
  assert.match(testingSignature, /\btestOnlyRunRootCapability\s*:/,
    "test-only wrapper lacks its disjoint opaque authority");
  assert.doesNotMatch(testingSignature, /\brunRoot\s*:/,
    "test-only wrapper exposes raw runRoot authority");
});

test("measured-authorization request publisher Stage B: identity attacks, retained faults, and resource closure", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const testOnlyPublisher = Reflect.get(
    runnerModule,
    "__testingPublishCaliforniaSignatureMeasuredAuthorizationRequest"
  ) as unknown;
  const issuer = Reflect.get(
    runnerModule,
    "__testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability"
  ) as unknown;
  const productionPublisher = Reflect.get(
    runnerModule,
    "publishCaliforniaSignatureMeasuredAuthorizationRequest"
  ) as unknown;
  const requestFilename = Reflect.get(
    runnerModule,
    "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME"
  ) as unknown;
  assert.equal(typeof testOnlyPublisher, "function",
    "Stage-B attack contract requires the disjoint test-only publisher");
  assert.equal(typeof issuer, "function",
    "Stage-B attack contract requires the disjoint test-only capability issuer");
  assert.equal(typeof productionPublisher, "function",
    "Stage-B attack contract requires the production opaque-capability publisher");
  assert.equal(
    requestFilename,
    ".california-signature-measured-authorization-request.json",
    "Stage-B attack contract requires the one fixed request filename"
  );
  const fixedRequestFilename = requestFilename as string;

  const successStages = [
    "PARENT_ROOT_FDS_BOUND",
    "HELPER_ROOT_FD_BOUND",
    "REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD",
    "REQUEST_WRITTEN",
    "REQUEST_FILE_FSYNCED",
    "REQUEST_SAME_FD_READBACK_VERIFIED",
    "REQUEST_FROZEN_0400",
    "REQUEST_FROZEN_FILE_FSYNCED",
    "REQUEST_ROOT_FSYNCED",
    "REQUEST_FINAL_BINDING_VERIFIED",
    "HELPER_DURABLE",
    "HELPER_EXITED",
    "PUBLICATION_READER_VERIFIED",
    "FINAL_ROOT_AND_ANCESTOR_BINDING_VERIFIED",
    "PARENT_ROOT_FDS_CLOSED",
    "READY_TO_RETURN"
  ] as const;
  type PublicationEventStage = typeof successStages[number];
  type BarrierStage = "NONE" | "BEFORE_HELPER" | "AFTER_HELPER_BEFORE_READER";
  type FaultStage =
    | "NONE"
    | "AFTER_O_EXCL_CREATE"
    | "AFTER_FILE_FSYNC"
    | "AFTER_ROOT_FSYNC_BEFORE_DURABLE";
  type PublicationEvent = Readonly<{
    byteLength: number | null;
    fileIdentityToken: string | null;
    mode: 384 | 256 | null;
    parentIdentityToken: string;
    requestName: typeof fixedRequestFilename | null;
    requestSha256: string | null;
    runRootIdentityToken: string;
    stage: PublicationEventStage;
  }>;
  type TestOnlyControl = Readonly<{
    barrierStage: BarrierStage;
    faultStage: FaultStage;
    onBarrier: (() => void | Promise<void>) | null;
    onEvent: (event: PublicationEvent) => void;
  }>;
  type PublicationResult = Readonly<{
    authorizationRequestPath: string;
    authorizationRequestSha256: string;
  }>;
  type FileState = "NONE" | "CREATED_0600" | "WRITTEN_0600" | "FROZEN_0400";
  type ExpectedEvent = Readonly<{
    fileState: FileState;
    stage: PublicationEventStage;
  }>;
  type FixtureLayout = Readonly<{
    authorizedParentRoot: string;
    protectedLedgerRoot: string;
    runRoot: string;
  }>;
  const publishForTesting = testOnlyPublisher as (options: {
    request: Record<string, unknown>;
    testOnlyControl: TestOnlyControl;
    testOnlyRunRootCapability: object;
  }) => Promise<PublicationResult>;
  const publishForProduction = productionPublisher as (
    options: Record<string, unknown>
  ) => Promise<unknown>;
  const issue = issuer as (options: {
    testOnlyAuthorizedParentRoot: string;
    testOnlyProtectedLedgerRoot: string;
    testOnlyRunRoot: string;
  }) => Promise<object>;

  const privateCanary = highEntropy("stage-b-red2-private-canary");
  const request = {
    acceptanceRunId: `acceptance-${"a".repeat(40)}`,
    attemptId: privateCanary,
    attemptLedger: {
      anchorSha256: "1".repeat(64),
      ledgerId: `ledger-${"c".repeat(40)}`,
      rootBirthtimeNs: "1700000000000000000",
      rootDev: "12345",
      rootIno: "67890",
      rootPathSha256: "2".repeat(64)
    },
    buildId: `build-${"d".repeat(40)}`,
    executionPlanSha256: "3".repeat(64),
    launchCommand: {
      projects: ["desktop-chrome", "mobile-chrome"],
      repeatEach: 1,
      reporter: "json",
      retries: 0,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
      workers: 1
    },
    matrixRunId: `matrix-${"e".repeat(40)}`,
    maxInvocations: 1,
    origin: "http://127.0.0.1:43112",
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    runtimeRunId: `runtime-${"f".repeat(40)}`,
    schema: "ca.california-signature.measured-authorization-request.v1",
    sourceSnapshotSha256: "4".repeat(64),
    status: "AWAITING_OWNER_REVIEW"
  } as const;
  const expectedBytes = Buffer.from(`${JSON.stringify(request, null, 2)}\n`, "utf8");
  const expectedSha256 = digest(expectedBytes);
  const errorCanaries = Object.freeze([
    privateCanary,
    expectedSha256,
    request.acceptanceRunId,
    request.attemptLedger.anchorSha256,
    request.attemptLedger.ledgerId,
    request.attemptLedger.rootPathSha256,
    request.buildId,
    request.executionPlanSha256,
    request.matrixRunId,
    request.runtimeRunId,
    request.sourceSnapshotSha256
  ]);
  const eventKeys = [
    "byteLength",
    "fileIdentityToken",
    "mode",
    "parentIdentityToken",
    "requestName",
    "requestSha256",
    "runRootIdentityToken",
    "stage"
  ] as const;
  const successExpected: readonly ExpectedEvent[] = [
    { fileState: "NONE", stage: "PARENT_ROOT_FDS_BOUND" },
    { fileState: "NONE", stage: "HELPER_ROOT_FD_BOUND" },
    { fileState: "CREATED_0600", stage: "REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD" },
    { fileState: "WRITTEN_0600", stage: "REQUEST_WRITTEN" },
    { fileState: "WRITTEN_0600", stage: "REQUEST_FILE_FSYNCED" },
    { fileState: "WRITTEN_0600", stage: "REQUEST_SAME_FD_READBACK_VERIFIED" },
    { fileState: "FROZEN_0400", stage: "REQUEST_FROZEN_0400" },
    { fileState: "FROZEN_0400", stage: "REQUEST_FROZEN_FILE_FSYNCED" },
    { fileState: "FROZEN_0400", stage: "REQUEST_ROOT_FSYNCED" },
    { fileState: "FROZEN_0400", stage: "REQUEST_FINAL_BINDING_VERIFIED" },
    { fileState: "FROZEN_0400", stage: "HELPER_DURABLE" },
    { fileState: "FROZEN_0400", stage: "HELPER_EXITED" },
    { fileState: "FROZEN_0400", stage: "PUBLICATION_READER_VERIFIED" },
    { fileState: "FROZEN_0400", stage: "FINAL_ROOT_AND_ANCESTOR_BINDING_VERIFIED" },
    { fileState: "FROZEN_0400", stage: "PARENT_ROOT_FDS_CLOSED" },
    { fileState: "FROZEN_0400", stage: "READY_TO_RETURN" }
  ];
  assert.deepEqual(successExpected.map(({ stage }) => stage), [...successStages],
    "Stage-B RED 2 success chronology drifted from the happy-path contract");

  const makeControl = (options: {
    barrierStage?: BarrierStage;
    faultStage?: FaultStage;
    onBarrier?: (() => void | Promise<void>) | null;
    onEvent: (event: PublicationEvent) => void;
  }): TestOnlyControl => {
    const barrierStage = options.barrierStage ?? "NONE";
    const faultStage = options.faultStage ?? "NONE";
    const onBarrier = options.onBarrier ?? null;
    const control = Object.freeze({
      barrierStage,
      faultStage,
      onBarrier,
      onEvent: options.onEvent
    });
    assert.deepEqual(Object.keys(control), [
      "barrierStage",
      "faultStage",
      "onBarrier",
      "onEvent"
    ], "Stage-B RED 2 control must have exactly four ordered keys");
    assert.equal(Object.isFrozen(control), true,
      "Stage-B RED 2 control must be frozen before publication");
    assert.equal(
      barrierStage === "NONE" ? onBarrier === null : typeof onBarrier === "function",
      true,
      "Stage-B RED 2 barrier callback presence differs from its selected barrier"
    );
    assert.equal(
      barrierStage === "NONE" || faultStage === "NONE",
      true,
      "Stage-B RED 2 control cannot combine one barrier with one helper fault"
    );
    return control;
  };

  const assertEvents = (
    actual: PublicationEvent[],
    expected: readonly ExpectedEvent[],
    label: string
  ) => {
    assert.deepEqual(actual.map(({ stage }) => stage),
      expected.map(({ stage }) => stage), `${label}: event prefix drifted`);
    let parentToken: string | null = null;
    let runRootToken: string | null = null;
    let fileToken: string | null = null;
    actual.forEach((event, index) => {
      const expectedEvent = expected[index]!;
      const eventLabel = `${label}: event ${index + 1} ${expectedEvent.stage}`;
      assert.deepEqual(Object.keys(event).sort(), [...eventKeys].sort(),
        `${eventLabel}: exact eight-key schema drifted`);
      assert.equal(Object.isFrozen(event), true, `${eventLabel}: event is not frozen`);
      assert.equal(event.stage, expectedEvent.stage, `${eventLabel}: stage drifted`);
      assert.match(event.parentIdentityToken, /^[0-9a-f]{64}$/,
        `${eventLabel}: parent token is not opaque SHA-256`);
      assert.match(event.runRootIdentityToken, /^[0-9a-f]{64}$/,
        `${eventLabel}: run-root token is not opaque SHA-256`);
      parentToken ??= event.parentIdentityToken;
      runRootToken ??= event.runRootIdentityToken;
      assert.equal(event.parentIdentityToken, parentToken,
        `${eventLabel}: parent token changed within one attempt`);
      assert.equal(event.runRootIdentityToken, runRootToken,
        `${eventLabel}: run-root token changed within one attempt`);
      assert.notEqual(parentToken, runRootToken,
        `${eventLabel}: parent and run-root tokens collapsed`);
      if (expectedEvent.fileState === "NONE") {
        assert.equal(event.fileIdentityToken, null,
          `${eventLabel}: file token appeared before exclusive creation`);
        assert.equal(event.mode, null, `${eventLabel}: mode appeared before creation`);
        assert.equal(event.requestName, null,
          `${eventLabel}: request name appeared before creation`);
        assert.equal(event.byteLength, null,
          `${eventLabel}: byte length appeared before a complete write`);
        assert.equal(event.requestSha256, null,
          `${eventLabel}: request digest appeared before a complete write`);
        return;
      }
      assert.match(event.fileIdentityToken ?? "", /^[0-9a-f]{64}$/,
        `${eventLabel}: file token is not opaque SHA-256`);
      fileToken ??= event.fileIdentityToken;
      assert.equal(event.fileIdentityToken, fileToken,
        `${eventLabel}: helper-created file token changed`);
      assert.notEqual(fileToken, parentToken,
        `${eventLabel}: file and parent tokens collapsed`);
      assert.notEqual(fileToken, runRootToken,
        `${eventLabel}: file and run-root tokens collapsed`);
      assert.equal(event.requestName, fixedRequestFilename,
        `${eventLabel}: request name drifted`);
      assert.equal(
        event.mode,
        expectedEvent.fileState === "FROZEN_0400" ? 0o400 : 0o600,
        `${eventLabel}: retained mode chronology drifted`
      );
      if (expectedEvent.fileState === "CREATED_0600") {
        assert.equal(event.byteLength, null,
          `${eventLabel}: empty exclusive inode claims complete bytes`);
        assert.equal(event.requestSha256, null,
          `${eventLabel}: empty exclusive inode claims a byte receipt`);
      } else {
        assert.equal(event.byteLength, expectedBytes.length,
          `${eventLabel}: canonical byte length drifted`);
        assert.equal(event.requestSha256, expectedSha256,
          `${eventLabel}: canonical byte SHA-256 drifted`);
      }
    });
  };

  type LsofFdRecord = Readonly<{
    fd: number;
    access: string;
    name: string;
  }>;
  type ResourceSnapshot = Readonly<{
    directChildPids: readonly number[];
    lsofFdRecords: readonly LsofFdRecord[];
  }>;
  const lsofProbeRoot = path.join(pureRoot, highEntropy("stage-b-red2-lsof-probe"));
  const lsofStdoutPath = path.join(lsofProbeRoot, "stdout.txt");
  const lsofStderrPath = path.join(lsofProbeRoot, "stderr.txt");
  await mkdir(lsofProbeRoot, { mode: 0o700 });
  await chmod(lsofProbeRoot, 0o700);
  await writeFile(lsofStdoutPath, "", { flag: "wx", mode: 0o600 });
  await writeFile(lsofStderrPath, "", { flag: "wx", mode: 0o600 });
  await chmod(lsofStdoutPath, 0o600);
  await chmod(lsofStderrPath, 0o600);

  const parseLsofFdRecords = (
    stdoutText: string,
    label: string
  ): readonly LsofFdRecord[] => {
    const records: LsofFdRecord[] = [];
    let currentFd: number | null = null;
    let currentAccess = "unknown";
    for (const line of stdoutText.split("\n")) {
      if (line.startsWith("f")) {
        if (/^f[0-9]/.test(line)) {
          const parsed = /^f([0-9]+)((?:[rwu][NrRwWuUxX]?)|(?:-[NrRwWuUxX]))?$/
            .exec(line);
          assert.ok(parsed,
            `${label}: digit-leading lsof FD record has an invalid suffix grammar`);
          const fd = Number(parsed[1]);
          assert.equal(Number.isSafeInteger(fd) && fd >= 0, true,
            `${label}: lsof numeric FD is not one safe nonnegative integer`);
          currentFd = fd >= 3 ? fd : null;
          currentAccess = parsed[2] || "unknown";
        } else {
          currentFd = null;
          currentAccess = "unknown";
        }
      } else if (line.startsWith("n") && currentFd !== null) {
        const name = line.slice(1).replace(/ \(deleted\)$/, "");
        const record = Object.freeze({
          fd: currentFd,
          access: currentAccess,
          name
        });
        assert.deepEqual(Object.keys(record), ["fd", "access", "name"],
          `${label}: lsof record schema drifted`);
        records.push(record);
      }
    }
    records.sort((left, right) =>
      left.fd - right.fd ||
      (left.access < right.access ? -1 : left.access > right.access ? 1 : 0) ||
      (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
    );
    return Object.freeze(records);
  };

  const lsofLockSuffixes = ["N", "r", "R", "w", "W", "u", "U", "x", "X"] as const;
  const validLsofSuffixes = [
    "",
    ...(["r", "w", "u"] as const).flatMap((access) => [
      access,
      ...lsofLockSuffixes.map((lock) => `${access}${lock}`)
    ]),
    ...lsofLockSuffixes.map((lock) => `-${lock}`)
  ];
  const validLsofTranscript = [
    "p999999",
    "fcwd",
    "n/ignored-symbolic-fd",
    ...validLsofSuffixes.flatMap((suffix, index) => [
      `f${index + 3}${suffix}`,
      `n/stage-b-lsof-grammar/${index}`
    ]),
    ""
  ].join("\n");
  const parsedValidLsofRecords = parseLsofFdRecords(
    validLsofTranscript,
    "Stage-B RED 2 valid lsof grammar"
  );
  assert.equal(parsedValidLsofRecords.length, validLsofSuffixes.length,
    "Stage-B RED 2 valid lsof grammar dropped a numeric FD record");
  parsedValidLsofRecords.forEach((record, index) => {
    assert.deepEqual(record, {
      fd: index + 3,
      access: validLsofSuffixes[index] || "unknown",
      name: `/stage-b-lsof-grammar/${index}`
    }, `Stage-B RED 2 valid lsof suffix ${JSON.stringify(validLsofSuffixes[index])} drifted`);
  });
  for (const invalidSuffix of [
    "-", "q", "N", "r-", "rNN", "rrr", "uZ", "--N", "-NN", "-rN"
  ]) {
    assert.throws(
      () => parseLsofFdRecords(
        `f3${invalidSuffix}\nn/invalid\n`,
        `Stage-B RED 2 invalid lsof suffix ${JSON.stringify(invalidSuffix)}`
      ),
      /invalid suffix grammar/,
      `Stage-B RED 2 accepted digit-leading lsof suffix ${JSON.stringify(invalidSuffix)}`
    );
  }

  const lsofFdRecords = async (): Promise<readonly LsofFdRecord[]> => {
    const stdoutHandle = await open(lsofStdoutPath, "r+");
    const stderrHandle = await open(lsofStderrPath, "r+");
    let stdoutText = "";
    try {
      await stdoutHandle.truncate(0);
      await stderrHandle.truncate(0);
      const probe = spawnSync(
        "/usr/sbin/lsof",
        ["-a", "-p", String(process.pid), "-Ffn"],
        {
          cwd: "/usr/bin",
          env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
          maxBuffer: 1024 * 1024,
          shell: false,
          stdio: ["ignore", stdoutHandle.fd, stderrHandle.fd],
          timeout: 10_000
        }
      );
      assert.equal(probe.error, undefined,
        "Stage-B RED 2 fixed lsof descriptor inventory failed to execute");
      assert.equal(probe.status, 0,
        "Stage-B RED 2 fixed lsof descriptor inventory exited nonzero");
      assert.equal(probe.signal, null,
        "Stage-B RED 2 fixed lsof descriptor inventory exited by signal");
      await stdoutHandle.sync();
      await stderrHandle.sync();
      stdoutText = await readFile(lsofStdoutPath, "utf8");
      assert.equal(await readFile(lsofStderrPath, "utf8"), "",
        "Stage-B RED 2 fixed lsof descriptor inventory wrote stderr");
    } finally {
      await stderrHandle.close();
      await stdoutHandle.close();
    }

    return parseLsofFdRecords(stdoutText, "Stage-B RED 2 fixed lsof inventory");
  };
  const directChildPidSnapshot = () => {
    const probe = spawnSync("/bin/ps", ["-axo", "ppid=,pid="], {
      encoding: "utf8",
      env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
      shell: false,
      timeout: 10_000
    });
    assert.equal(probe.error, undefined,
      "Stage-B RED 2 direct-child PID probe failed to execute");
    assert.equal(probe.status, 0,
      "Stage-B RED 2 direct-child PID probe exited nonzero");
    return probe.stdout.split("\n").flatMap((line) => {
      const parsed = /^\s*([0-9]+)\s+([0-9]+)\s*$/.exec(line);
      if (!parsed || Number(parsed[1]) !== process.pid) return [];
      const childPid = Number(parsed[2]);
      return childPid === probe.pid ? [] : [childPid];
    }).sort((left, right) => left - right);
  };
  const resourceSnapshot = async (): Promise<ResourceSnapshot> => ({
    directChildPids: directChildPidSnapshot(),
    lsofFdRecords: await lsofFdRecords()
  });
  const settledResourceSnapshot = async (label: string): Promise<ResourceSnapshot> => {
    const maximumSamples = 64;
    const requiredIdenticalSamples = 3;
    let previousFingerprint: string | null = null;
    let identicalSamples = 0;
    let latest: ResourceSnapshot | null = null;
    for (let sampleIndex = 0; sampleIndex < maximumSamples; sampleIndex += 1) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      latest = await resourceSnapshot();
      const fingerprint = JSON.stringify(latest);
      if (fingerprint === previousFingerprint) {
        identicalSamples += 1;
      } else {
        previousFingerprint = fingerprint;
        identicalSamples = 1;
      }
      if (identicalSamples >= requiredIdenticalSamples) return latest;
    }
    assert.fail(
      `${label}: resource state did not settle for three consecutive async-turn samples`
    );
  };
  const withResourceClosure = async (
    label: string,
    operation: (trackFixturePath: (candidate: string) => void) => Promise<void>
  ) => {
    const before = await settledResourceSnapshot(`${label}: before`);
    const trackedFixturePaths = new Set<string>();
    const trackFixturePath = (candidate: string) => {
      const normalized = path.resolve(candidate);
      assert.equal(candidate, normalized,
        `${label}: tracked fixture path must be absolute and normalized`);
      trackedFixturePaths.add(normalized);
    };
    try {
      await operation(trackFixturePath);
    } finally {
      const after = await settledResourceSnapshot(`${label}: after`);
      assert.deepEqual(after.directChildPids, before.directChildPids,
        `${label}: direct-child PID baseline was not restored`);
      const baselineMappings = new Set(
        before.lsofFdRecords.map((record) => JSON.stringify(record))
      );
      const newlySurvivingMappings = after.lsofFdRecords.filter(
        (record) => !baselineMappings.has(JSON.stringify(record))
      );
      assert.deepEqual(newlySurvivingMappings, [],
        `${label}: a new numeric lsof FD record survived the row`);
      for (const { fd, name } of after.lsofFdRecords) {
        if (!path.isAbsolute(name)) continue;
        const normalizedName = path.resolve(name);
        for (const fixturePath of trackedFixturePaths) {
          assert.equal(
            normalizedName === fixturePath ||
              normalizedName.startsWith(`${fixturePath}${path.sep}`),
            false,
            `${label}: lsof FD ${fd} name ${JSON.stringify(name)} remains ` +
              `at or below retained fixture path ${fixturePath}`
          );
        }
      }
    }
  };

  const fsyncDirectory = async (directory: string) => {
    const handle = await open(directory, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  };
  const writeDurableFile = async (target: string, bytes: Buffer, finalMode: 0o400) => {
    const handle = await open(target, "wx+", 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
      const reread = Buffer.alloc(bytes.length);
      const { bytesRead } = await handle.read(reread, 0, reread.length, 0);
      assert.equal(bytesRead, bytes.length,
        "Stage-B replacement fixture same-FD readback ended early");
      assert.deepEqual(reread, bytes,
        "Stage-B replacement fixture same-FD bytes drifted");
      await handle.chmod(finalMode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fsyncDirectory(path.dirname(target));
  };
  const assertNoRequestLeaf = async (runRoot: string, label: string) => {
    const requestPath = path.join(runRoot, fixedRequestFilename);
    const identity = await lstat(requestPath).catch((error: NodeJS.ErrnoException) => {
      assert.equal(error.code, "ENOENT", `${label}: request-leaf probe failed unexpectedly`);
      return null;
    });
    assert.equal(identity, null, `${label}: publisher created a request leaf`);
  };
  const assertRetainedFile = async (
    target: string,
    expectedMode: 0o600 | 0o400,
    expectedContent: Buffer,
    label: string
  ) => {
    const identity = await lstat(target, { bigint: true });
    assert.ok(identity.isFile() && !identity.isSymbolicLink(),
      `${label}: retained artifact is not one physical file`);
    assert.equal(identity.uid, BigInt(process.getuid()),
      `${label}: retained artifact is not owner-bound`);
    assert.equal(identity.nlink, BigInt(1),
      `${label}: retained artifact is not one singleton inode`);
    assert.equal(identity.mode & BigInt(0o777), BigInt(expectedMode),
      `${label}: retained artifact mode drifted`);
    assert.equal(identity.size, BigInt(expectedContent.length),
      `${label}: retained artifact size drifted`);
    assert.deepEqual(await readFile(target), expectedContent,
      `${label}: retained artifact bytes drifted`);
    return identity;
  };
  type RetainedBigIntStats = Awaited<ReturnType<typeof assertRetainedFile>>;
  const retainedFileType = (identity: RetainedBigIntStats) =>
    identity.isFile() ? "REGULAR_FILE" :
      identity.isDirectory() ? "DIRECTORY" :
        identity.isSymbolicLink() ? "SYMBOLIC_LINK" :
          identity.isBlockDevice() ? "BLOCK_DEVICE" :
            identity.isCharacterDevice() ? "CHARACTER_DEVICE" :
              identity.isFIFO() ? "FIFO" :
                identity.isSocket() ? "SOCKET" : "UNKNOWN";
  const retainedIdentity = (identity: RetainedBigIntStats) => ({
    birthtimeNs: identity.birthtimeNs,
    ctimeNs: identity.ctimeNs,
    dev: identity.dev,
    fileType: retainedFileType(identity),
    gid: identity.gid,
    ino: identity.ino,
    mode: identity.mode,
    mtimeNs: identity.mtimeNs,
    nlink: identity.nlink,
    size: identity.size,
    uid: identity.uid
  });
  const retainedArtifactSnapshot = async (target: string) => {
    const identity = await lstat(target, { bigint: true });
    const bytes = Buffer.from(await readFile(target));
    return {
      bytes,
      identity: retainedIdentity(identity),
      sha256: digest(bytes)
    };
  };
  let layoutIndex = 0;
  const provisionLayout = async (
    label: string,
    trackFixturePath: (candidate: string) => void
  ): Promise<FixtureLayout> => {
    layoutIndex += 1;
    const authorizedParentRoot = path.join(
      pureRoot,
      highEntropy(`stage-b-red2-${layoutIndex}-${label}-parent`)
    );
    const protectedLedgerRoot = path.join(
      authorizedParentRoot,
      highEntropy("protected-ledger")
    );
    const runRoot = path.join(authorizedParentRoot, highEntropy("run-root"));
    trackFixturePath(authorizedParentRoot);
    trackFixturePath(protectedLedgerRoot);
    trackFixturePath(runRoot);
    trackFixturePath(path.join(runRoot, fixedRequestFilename));
    await mkdir(authorizedParentRoot, { mode: 0o700 });
    await chmod(authorizedParentRoot, 0o700);
    await mkdir(protectedLedgerRoot, { mode: 0o700 });
    await chmod(protectedLedgerRoot, 0o700);
    await mkdir(runRoot, { mode: 0o700 });
    await chmod(runRoot, 0o700);
    for (const [rootLabel, root] of [
      ["authorized parent", authorizedParentRoot],
      ["protected ledger", protectedLedgerRoot],
      ["run root", runRoot]
    ] as const) {
      const identity = await lstat(root);
      assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
        `${label}: ${rootLabel} is not one physical directory`);
      assert.equal(identity.mode & 0o777, 0o700,
        `${label}: ${rootLabel} is not exact mode 0700`);
      assert.equal(identity.uid, process.getuid(),
        `${label}: ${rootLabel} is not owner-bound`);
      assert.equal(await realpath(root), root,
        `${label}: ${rootLabel} traverses a symlink`);
    }
    return { authorizedParentRoot, protectedLedgerRoot, runRoot };
  };
  const issueCapability = (layout: FixtureLayout) => issue({
    testOnlyAuthorizedParentRoot: layout.authorizedParentRoot,
    testOnlyProtectedLedgerRoot: layout.protectedLedgerRoot,
    testOnlyRunRoot: layout.runRoot
  });

  const expectRejectedWithoutResult = async (
    operation: () => Promise<unknown>,
    predicate: (error: Error & { code?: string }) => void,
    label: string
  ) => {
    const resultSentinel = Object.freeze({ label, state: "RESULT_NOT_RETURNED" });
    let result: unknown = resultSentinel;
    let caught: unknown;
    try {
      result = await operation();
    } catch (error) {
      caught = error;
    }
    assert.equal(result, resultSentinel, `${label}: failure returned a result`);
    assert.ok(caught instanceof Error, `${label}: operation did not reject with one Error`);
    predicate(caught as Error & { code?: string });
  };
  const rowErrorCanaries = (...values: readonly string[]) =>
    Object.freeze([...new Set([...errorCanaries, ...values])]);
  const assertOwnPropertyGraphExcludesCanaries = (
    root: unknown,
    canaries: readonly string[],
    label: string
  ) => {
    const seen = new Set<object>();
    const assertStringExcludesCanaries = (value: string, location: string) => {
      for (const canary of canaries) {
        assert.equal(value.includes(canary), false,
          `${label}: ${location} leaked canary ${JSON.stringify(canary)}`);
      }
    };
    const visit = (value: unknown, location: string): void => {
      if (typeof value === "string") {
        assertStringExcludesCanaries(value, location);
        return;
      }
      if ((typeof value !== "object" || value === null) && typeof value !== "function") {
        return;
      }
      if (seen.has(value)) return;
      seen.add(value);
      for (const key of Reflect.ownKeys(value)) {
        const keyLabel = typeof key === "string" ? key : `Symbol(${key.description ?? ""})`;
        assertStringExcludesCanaries(keyLabel, `${location} own-property key`);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        assert.ok(descriptor, `${label}: ${location}.${keyLabel} descriptor disappeared`);
        assert.equal("get" in descriptor, false,
          `${label}: ${location}.${keyLabel} is an accessor`);
        assert.equal("set" in descriptor, false,
          `${label}: ${location}.${keyLabel} is an accessor`);
        assert.equal("value" in descriptor, true,
          `${label}: ${location}.${keyLabel} is not one data property`);
        visit(descriptor.value, `${location}.${keyLabel} value`);
      }
    };
    visit(root, "error");
  };
  const assertExactContentBlindError = (
    error: Error & { code?: string },
    expectedCode: string,
    expectedMessage: string,
    canaries: readonly string[],
    label: string
  ) => {
    assert.equal(Object.getPrototypeOf(error), Error.prototype,
      `${label}: rejection is not one plain Error`);
    assert.equal(error.constructor, Error,
      `${label}: rejection constructor is not exactly Error`);
    assert.equal(error.name, "Error", `${label}: rejection name drifted`);
    assert.equal(Object.hasOwn(error, "name"), false,
      `${label}: rejection shadowed the plain Error name`);
    assert.equal(Reflect.has(error, "cause"), false,
      `${label}: rejection exposed a cause graph`);
    assert.deepEqual(Object.getOwnPropertySymbols(error), [],
      `${label}: rejection exposed symbol-keyed state`);
    assert.deepEqual(Object.getOwnPropertyNames(error).sort(), [
      "code",
      "message",
      "stack"
    ], `${label}: rejection own-property schema drifted`);

    const codeDescriptor = Object.getOwnPropertyDescriptor(error, "code");
    const messageDescriptor = Object.getOwnPropertyDescriptor(error, "message");
    const stackDescriptor = Object.getOwnPropertyDescriptor(error, "stack");
    assert.ok(codeDescriptor && "value" in codeDescriptor,
      `${label}: rejection code is not one own data property`);
    assert.ok(messageDescriptor && "value" in messageDescriptor,
      `${label}: rejection message is not one own data property`);
    assert.ok(stackDescriptor && "value" in stackDescriptor,
      `${label}: rejection stack is not one own data property`);
    assert.deepEqual({
      configurable: codeDescriptor.configurable,
      enumerable: codeDescriptor.enumerable,
      value: codeDescriptor.value,
      writable: codeDescriptor.writable
    }, {
      configurable: true,
      enumerable: true,
      value: expectedCode,
      writable: true
    }, `${label}: rejection code descriptor drifted`);
    assert.deepEqual({
      configurable: messageDescriptor.configurable,
      enumerable: messageDescriptor.enumerable,
      value: messageDescriptor.value,
      writable: messageDescriptor.writable
    }, {
      configurable: true,
      enumerable: false,
      value: expectedMessage,
      writable: true
    }, `${label}: rejection message descriptor drifted`);
    assert.equal(stackDescriptor.configurable, true,
      `${label}: rejection stack is not configurable plain-Error data`);
    assert.equal(stackDescriptor.enumerable, false,
      `${label}: rejection stack became enumerable`);
    assert.equal(stackDescriptor.writable, true,
      `${label}: rejection stack is not writable plain-Error data`);
    assert.equal(typeof stackDescriptor.value, "string",
      `${label}: rejection stack is not one own data string`);
    const expectedStackHeading = `Error: ${expectedMessage}`;
    assert.equal(
      stackDescriptor.value === expectedStackHeading ||
        stackDescriptor.value.startsWith(`${expectedStackHeading}\n`),
      true,
      `${label}: rejection stack heading differs from its fixed message`
    );
    assert.equal(error.code, expectedCode, `${label}: fixed error code drifted`);
    assert.equal(error.message, expectedMessage, `${label}: fixed error message drifted`);
    assertOwnPropertyGraphExcludesCanaries(error, canaries, label);
  };
  const expectFixedPublicationFailure = (
    operation: () => Promise<unknown>,
    label: string,
    canaries: readonly string[] = errorCanaries
  ) => expectRejectedWithoutResult(operation, (error) => {
    assertExactContentBlindError(
      error,
      "MEASURED_AUTHORIZATION_REQUEST_PUBLICATION_FAILED",
      "California measured-authorization request publication failed",
      canaries,
      label
    );
  }, label);
  const expectFixedEexist = (
    operation: () => Promise<unknown>,
    label: string,
    canaries: readonly string[] = errorCanaries
  ) => expectRejectedWithoutResult(operation, (error) => {
    assertExactContentBlindError(
      error,
      "EEXIST",
      "California measured-authorization request already exists",
      canaries,
      label
    );
  }, label);
  const assertFullSuccess = async (
    layout: FixtureLayout,
    capability: object,
    label: string
  ) => {
    const events: PublicationEvent[] = [];
    const result = await publishForTesting({
      request: request as unknown as Record<string, unknown>,
      testOnlyControl: makeControl({ onEvent(event) { events.push(event); } }),
      testOnlyRunRootCapability: capability
    });
    assert.deepEqual(Object.keys(result).sort(), [
      "authorizationRequestPath",
      "authorizationRequestSha256"
    ], `${label}: successful publication result schema drifted`);
    assert.equal(Object.isFrozen(result), true,
      `${label}: successful publication result is not frozen`);
    assert.equal(result.authorizationRequestPath,
      path.join(layout.runRoot, fixedRequestFilename),
    `${label}: successful publication returned the wrong path`);
    assert.equal(result.authorizationRequestSha256, expectedSha256,
      `${label}: successful publication returned the wrong SHA-256`);
    assertEvents(events, successExpected, `${label}: successful retry`);
    await assertRetainedFile(
      result.authorizationRequestPath,
      0o400,
      expectedBytes,
      `${label}: successful retry artifact`
    );
  };

  const validationRows = [
    {
      label: "malformed barrier accessor",
      makeInvalidControl(events: PublicationEvent[]) {
        let barrierAccessorReads = 0;
        const control = Object.freeze(Object.defineProperties({}, {
          barrierStage: {
            enumerable: true,
            get() {
              barrierAccessorReads += 1;
              return "NOT_A_BARRIER";
            }
          },
          faultStage: { enumerable: true, value: "NONE" },
          onBarrier: { enumerable: true, value: null },
          onEvent: {
            enumerable: true,
            value(event: PublicationEvent) { events.push(event); }
          }
        })) as unknown as TestOnlyControl;
        return {
          assertAfterRejection() {
            assert.equal(barrierAccessorReads, 1,
              "malformed barrier accessor was not captured exactly once");
          },
          control,
          expectedError: /barrierStage|barrier|control/i
        };
      }
    },
    {
      label: "unknown control field",
      makeInvalidControl(events: PublicationEvent[]) {
        let unknownAccessorReads = 0;
        const control = Object.freeze({
          barrierStage: "NONE",
          faultStage: "NONE",
          onBarrier: null,
          onEvent(event: PublicationEvent) { events.push(event); },
          get privateCanaryField() {
            unknownAccessorReads += 1;
            return privateCanary;
          }
        }) as unknown as TestOnlyControl;
        return {
          assertAfterRejection() {
            assert.equal(unknownAccessorReads, 0,
              "unknown control field was read before exact-key rejection");
          },
          control,
          expectedError: /exact schema|unknown|control/i
        };
      }
    }
  ] as const;
  for (const row of validationRows) {
    await withResourceClosure(`Stage-B validation row ${row.label}`,
      async (trackFixturePath) => {
      const layout = await provisionLayout(
        row.label.replaceAll(" ", "-"),
        trackFixturePath
      );
      const capability = await issueCapability(layout);
      const invalidEvents: PublicationEvent[] = [];
      const invalid = row.makeInvalidControl(invalidEvents);
      await expectRejectedWithoutResult(
        () => publishForTesting({
          request: request as unknown as Record<string, unknown>,
          testOnlyControl: invalid.control,
          testOnlyRunRootCapability: capability
        }),
        (error) => assert.match(error.message, invalid.expectedError,
          `${row.label}: malformed control exposed the wrong validation boundary`),
        `Stage-B validation row ${row.label}`
      );
      invalid.assertAfterRejection();
      assert.deepEqual(invalidEvents, [],
        `${row.label}: invalid control emitted publication events`);
      await assertNoRequestLeaf(layout.runRoot, row.label);
      await assertFullSuccess(layout, capability,
        `${row.label}: same capability after pre-spend validation`);
    });
  }

  await withResourceClosure("Stage-B production widened-control rejection",
    async (trackFixturePath) => {
    const layout = await provisionLayout(
      "production-control-rejection",
      trackFixturePath
    );
    const capability = await issueCapability(layout);
    const productionEvents: PublicationEvent[] = [];
    let barrierEntryCount = 0;
    let barrierCompletedCount = 0;
    const control = makeControl({
      barrierStage: "BEFORE_HELPER",
      async onBarrier() {
        barrierEntryCount += 1;
        await Promise.resolve();
        barrierCompletedCount += 1;
      },
      onEvent(event) { productionEvents.push(event); }
    });
    await expectRejectedWithoutResult(
      () => publishForProduction({
        request,
        runRootCapability: capability,
        testOnlyControl: control
      }),
      (error) => assert.match(error.message, /exact schema|unknown|testOnlyControl/i,
        "production publisher did not reject test-only controls at its outer schema"),
      "Stage-B production widened-control rejection"
    );
    assert.equal(barrierEntryCount, 0,
      "production publisher entered a test-only barrier");
    assert.equal(barrierCompletedCount, 0,
      "production publisher completed a test-only barrier");
    assert.deepEqual(productionEvents, [],
      "production publisher emitted test-only durability events");
    await assertNoRequestLeaf(layout.runRoot, "production widened-control rejection");
    await assertFullSuccess(layout, capability,
      "production rejection preserves the testing capability");
  });

  const beforeHelperExpected: readonly ExpectedEvent[] = [
    successExpected[0]!,
    { fileState: "NONE", stage: "PARENT_ROOT_FDS_CLOSED" }
  ];
  const afterHelperExpected: readonly ExpectedEvent[] = [
    ...successExpected.slice(0, 12),
    { fileState: "FROZEN_0400", stage: "PARENT_ROOT_FDS_CLOSED" }
  ];
  const barrierRows = [
    {
      barrierStage: "BEFORE_HELPER" as const,
      kind: "RUN_ROOT_REPLACEMENT" as const,
      label: "run-root rename and same-path replacement",
      expectedEvents: beforeHelperExpected
    },
    {
      barrierStage: "AFTER_HELPER_BEFORE_READER" as const,
      kind: "REQUEST_INODE_REPLACEMENT" as const,
      label: "byte-identical request inode replacement after helper",
      expectedEvents: afterHelperExpected
    },
    {
      barrierStage: "BEFORE_HELPER" as const,
      kind: "AUTHORIZED_PARENT_SYMLINK_ALIAS" as const,
      label: "authorized-parent rename and symlink alias",
      expectedEvents: beforeHelperExpected
    }
  ] as const;
  for (const row of barrierRows) {
    await withResourceClosure(`Stage-B barrier row ${row.label}`,
      async (trackFixturePath) => {
      const layout = await provisionLayout(
        row.kind.toLowerCase().replaceAll("_", "-"),
        trackFixturePath
      );
      const capability = await issueCapability(layout);
      const events: PublicationEvent[] = [];
      const requestPath = path.join(layout.runRoot, fixedRequestFilename);
      const originalRunIdentity = await lstat(layout.runRoot, { bigint: true });
      const retainedRunRoot = path.join(
        layout.authorizedParentRoot,
        highEntropy("retained-original-run-root")
      );
      const retainedRequestPath = path.join(
        layout.runRoot,
        `${fixedRequestFilename}.retained-original`
      );
      const movedAuthorizedParent = path.join(
        pureRoot,
        highEntropy("retained-moved-authorized-parent")
      );
      trackFixturePath(retainedRunRoot);
      trackFixturePath(retainedRequestPath);
      trackFixturePath(movedAuthorizedParent);
      let barrierEntryCount = 0;
      let barrierCompletedCount = 0;
      let originalRequestIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
      let replacementRequestIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
      const barrierErrorCanaries = rowErrorCanaries(
        row.barrierStage,
        row.kind,
        row.label,
        layout.authorizedParentRoot,
        layout.protectedLedgerRoot,
        layout.runRoot,
        requestPath,
        retainedRunRoot,
        retainedRequestPath,
        movedAuthorizedParent
      );
      const control = makeControl({
        barrierStage: row.barrierStage,
        async onBarrier() {
          barrierEntryCount += 1;
          if (row.kind === "RUN_ROOT_REPLACEMENT") {
            await rename(layout.runRoot, retainedRunRoot);
            await mkdir(layout.runRoot, { mode: 0o700 });
            await chmod(layout.runRoot, 0o700);
            await fsyncDirectory(layout.authorizedParentRoot);
          } else if (row.kind === "REQUEST_INODE_REPLACEMENT") {
            await rename(requestPath, retainedRequestPath);
            originalRequestIdentity = await lstat(retainedRequestPath, { bigint: true });
            await writeDurableFile(requestPath, expectedBytes, 0o400);
            replacementRequestIdentity = await lstat(requestPath, { bigint: true });
            assert.equal(originalRequestIdentity.dev, replacementRequestIdentity.dev,
              "byte-identical replacement fixture must remain on the same device");
            assert.notEqual(originalRequestIdentity.ino, replacementRequestIdentity.ino,
              "byte-identical replacement fixture unexpectedly reused the original inode");
          } else {
            await rename(layout.authorizedParentRoot, movedAuthorizedParent);
            await symlink(movedAuthorizedParent, layout.authorizedParentRoot, "dir");
            await fsyncDirectory(pureRoot);
          }
          barrierCompletedCount += 1;
        },
        onEvent(event) { events.push(event); }
      });
      await expectFixedPublicationFailure(
        () => publishForTesting({
          request: request as unknown as Record<string, unknown>,
          testOnlyControl: control,
          testOnlyRunRootCapability: capability
        }),
        `Stage-B barrier row ${row.label}`,
        barrierErrorCanaries
      );
      assert.equal(barrierEntryCount, 1,
        `${row.label}: barrier was not entered synchronously exactly once`);
      assert.equal(barrierCompletedCount, 1,
        `${row.label}: barrier mutation did not complete exactly once`);
      assertEvents(events, row.expectedEvents, `Stage-B barrier row ${row.label}`);
      if (row.kind === "RUN_ROOT_REPLACEMENT") {
        const retainedRunIdentity = await lstat(retainedRunRoot, { bigint: true });
        const replacementRunIdentity = await lstat(layout.runRoot, { bigint: true });
        assert.equal(retainedRunIdentity.dev, originalRunIdentity.dev,
          "run-root attack did not retain the original device identity");
        assert.equal(retainedRunIdentity.ino, originalRunIdentity.ino,
          "run-root attack did not retain the original inode identity");
        assert.notEqual(replacementRunIdentity.ino, originalRunIdentity.ino,
          "run-root attack replacement reused the original inode");
        await assertNoRequestLeaf(retainedRunRoot,
          "run-root attack retained original root");
        await assertNoRequestLeaf(layout.runRoot,
          "run-root attack same-path replacement root");
      } else if (row.kind === "REQUEST_INODE_REPLACEMENT") {
        assert.ok(originalRequestIdentity && replacementRequestIdentity,
          "request replacement barrier did not retain both inode identities");
        const original = await assertRetainedFile(
          retainedRequestPath,
          0o400,
          expectedBytes,
          "request replacement retained helper inode"
        );
        const replacement = await assertRetainedFile(
          requestPath,
          0o400,
          expectedBytes,
          "request replacement retained attacker inode"
        );
        assert.equal(original.dev, replacement.dev,
          "request replacement artifacts left their original device");
        assert.notEqual(original.ino, replacement.ino,
          "request replacement artifacts collapsed to one inode");
        assert.equal(original.ino, originalRequestIdentity.ino,
          "retained helper inode identity drifted after rejection");
        assert.equal(replacement.ino, replacementRequestIdentity.ino,
          "retained replacement inode identity drifted after rejection");
      } else {
        const aliasIdentity = await lstat(layout.authorizedParentRoot);
        assert.equal(aliasIdentity.isSymbolicLink(), true,
          "authorized-parent attack did not retain its symlink alias");
        assert.equal(await realpath(layout.authorizedParentRoot), movedAuthorizedParent,
          "authorized-parent attack symlink no longer targets the retained moved tree");
        const movedRunRoot = path.join(movedAuthorizedParent, path.basename(layout.runRoot));
        const movedRunIdentity = await lstat(movedRunRoot, { bigint: true });
        assert.equal(movedRunIdentity.dev, originalRunIdentity.dev,
          "authorized-parent attack moved run root changed device identity");
        assert.equal(movedRunIdentity.ino, originalRunIdentity.ino,
          "authorized-parent attack moved run root changed inode identity");
        await assertNoRequestLeaf(movedRunRoot,
          "authorized-parent attack retained moved tree");
      }
    });
  }

  const helperExited = (
    fileState: Exclude<FileState, "NONE">
  ): ExpectedEvent => ({ fileState, stage: "HELPER_EXITED" });
  const parentClosed = (
    fileState: Exclude<FileState, "NONE">
  ): ExpectedEvent => ({ fileState, stage: "PARENT_ROOT_FDS_CLOSED" });
  const faultRows = [
    {
      expectedBytes: Buffer.alloc(0),
      expectedEvents: [
        ...successExpected.slice(0, 3),
        helperExited("CREATED_0600"),
        parentClosed("CREATED_0600")
      ],
      expectedMode: 0o600 as const,
      faultStage: "AFTER_O_EXCL_CREATE" as const,
      label: "fault after O_EXCL create"
    },
    {
      expectedBytes,
      expectedEvents: [
        ...successExpected.slice(0, 5),
        helperExited("WRITTEN_0600"),
        parentClosed("WRITTEN_0600")
      ],
      expectedMode: 0o600 as const,
      faultStage: "AFTER_FILE_FSYNC" as const,
      label: "fault after file fsync"
    },
    {
      expectedBytes,
      expectedEvents: [
        ...successExpected.slice(0, 9),
        helperExited("FROZEN_0400"),
        parentClosed("FROZEN_0400")
      ],
      expectedMode: 0o400 as const,
      faultStage: "AFTER_ROOT_FSYNC_BEFORE_DURABLE" as const,
      label: "fault after root fsync before durable ACK"
    }
  ] as const;
  const eexistExpected: readonly ExpectedEvent[] = [
    { fileState: "NONE", stage: "PARENT_ROOT_FDS_BOUND" },
    { fileState: "NONE", stage: "HELPER_ROOT_FD_BOUND" },
    { fileState: "NONE", stage: "HELPER_EXITED" },
    { fileState: "NONE", stage: "PARENT_ROOT_FDS_CLOSED" }
  ];
  for (const row of faultRows) {
    await withResourceClosure(`Stage-B retained-fault row ${row.label}`,
      async (trackFixturePath) => {
      const layout = await provisionLayout(
        row.faultStage.toLowerCase().replaceAll("_", "-"),
        trackFixturePath
      );
      const faultCapability = await issueCapability(layout);
      const eexistCapability = await issueCapability(layout);
      const requestPath = path.join(layout.runRoot, fixedRequestFilename);
      const faultErrorCanaries = rowErrorCanaries(
        row.faultStage,
        row.label,
        layout.authorizedParentRoot,
        layout.protectedLedgerRoot,
        layout.runRoot,
        requestPath,
        digest(row.expectedBytes)
      );
      const faultEvents: PublicationEvent[] = [];
      await expectFixedPublicationFailure(
        () => publishForTesting({
          request: request as unknown as Record<string, unknown>,
          testOnlyControl: makeControl({
            faultStage: row.faultStage,
            onEvent(event) { faultEvents.push(event); }
          }),
          testOnlyRunRootCapability: faultCapability
        }),
        `Stage-B retained-fault row ${row.label}`,
        faultErrorCanaries
      );
      assertEvents(faultEvents, row.expectedEvents,
        `Stage-B retained-fault row ${row.label}`);
      await assertRetainedFile(
        requestPath,
        row.expectedMode,
        row.expectedBytes,
        `${row.label}: retained partial artifact`
      );
      const beforeEexistSnapshot = await retainedArtifactSnapshot(requestPath);
      assert.equal(beforeEexistSnapshot.identity.fileType, "REGULAR_FILE",
        `${row.label}: retained EEXIST baseline is not one regular file`);
      assert.deepEqual(beforeEexistSnapshot.bytes, row.expectedBytes,
        `${row.label}: retained EEXIST baseline bytes drifted`);
      assert.equal(beforeEexistSnapshot.sha256, digest(row.expectedBytes),
        `${row.label}: retained EEXIST baseline SHA-256 drifted`);
      const eexistEvents: PublicationEvent[] = [];
      await expectFixedEexist(
        () => publishForTesting({
          request: request as unknown as Record<string, unknown>,
          testOnlyControl: makeControl({
            onEvent(event) { eexistEvents.push(event); }
          }),
          testOnlyRunRootCapability: eexistCapability
        }),
        `${row.label}: fresh-capability EEXIST`,
        faultErrorCanaries
      );
      assertEvents(eexistEvents, eexistExpected,
        `${row.label}: fresh-capability EEXIST`);
      const afterEexistSnapshot = await retainedArtifactSnapshot(requestPath);
      assert.deepEqual(afterEexistSnapshot, beforeEexistSnapshot,
        `${row.label}: fresh-capability EEXIST changed retained identity, type, bytes, or SHA-256`);
    });
  }
});

test("diagnostic capacity helper launches zero processes and the spec requires the runner guard before discovery and declaration", async () => {
  const diagnosticOwnership = {
    formalExecutionAuthorized: false,
    status: "diagnostic-capacity-partition"
  } as CaliforniaSignatureExecutionGroupOwnershipManifest;
  let launchCount = 0;
  await assert.rejects(() => runCaliforniaSignatureExhaustiveProducerUnderCapacityHold({
    ownershipManifest: diagnosticOwnership,
    async launch() {
      launchCount += 1;
      return "launched";
    }
  }), /on HOLD|diagnostic-only|authorization receipt/i);
  assert.equal(launchCount, 0,
    "diagnostic capacity ownership must not invoke the exhaustive process launcher");

  const specSource = await readFile(
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
      "tests/e2e/california-signature-exhaustive.spec.ts"),
    "utf8"
  );
  const guardIndex = specSource.indexOf(
    "assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard("
  );
  const guardEnvironmentIndex = specSource.indexOf(
    "process.env[CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV]"
  );
  const discoveryIndex = specSource.indexOf(
    "const executionPlan = readCaliforniaSignatureExecutionGroupOwnershipManifest({"
  );
  const describeIndex = specSource.indexOf("test.describe.configure");
  const declarationIndex = specSource.indexOf("test(`${workPackage.packageId}");
  assert.ok(guardIndex >= 0 && guardEnvironmentIndex > guardIndex &&
    discoveryIndex > guardEnvironmentIndex && describeIndex > discoveryIndex &&
    declarationIndex > discoveryIndex,
  "production exhaustive spec must require the exact runner guard before plan discovery and Playwright declaration");
  assert.equal(specSource.includes(
    "assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable(executionPlan)"
  ), false, "production exhaustive spec must not retain the obsolete unconditional capacity HOLD");
});

test("fresh-run path gate rejects non-Starship, cache, source, shared .next, existing, and symlinked paths", async () => {
  const fresh = path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, highEntropy("fresh"));
  assert.equal(await assertFreshStarshipRunRoot(fresh), fresh);
  await assert.rejects(() => assertFreshStarshipRunRoot("/tmp/ca-viz-acceptance"),
    /worktree \.tmp|Starship|system temporary/);
  await assert.rejects(() => assertFreshStarshipRunRoot("/var/folders/ca-viz-acceptance"),
    /worktree \.tmp|Starship|system temporary/);
  await assert.rejects(() => assertFreshStarshipRunRoot("/Users/dongpinhu/.cache/ca-viz-acceptance"),
    /worktree \.tmp|Starship/);
  await assert.rejects(() => assertFreshStarshipRunRoot(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT),
    /worktree \.tmp|source root/);
  await assert.rejects(() => assertFreshStarshipRunRoot(
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, ".next")), /worktree \.tmp|shared \.next/);

  const existing = path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, highEntropy("existing"));
  await mkdir(existing);
  await assert.rejects(() => assertFreshStarshipRunRoot(existing), /nonexisting|fresh/);

  const linkTarget = path.join(pureRoot, "tmp-target");
  const linkedTmp = path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, `.tmp-link-${randomBytes(8).toString("hex")}`);
  await mkdir(linkTarget);
  await symlink(linkTarget, linkedTmp);
  try {
    await assert.rejects(() => assertFreshStarshipRunRoot(path.join(linkedTmp, "run-root"), {
      tmpRoot: linkedTmp,
      worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
    }), /symlink|realpath/);
  } finally {
    await rm(linkedTmp);
  }
});

test("prepared-run reopen rejects pre-execution residue below controlled layer roots", async () => {
  const worktreeRoot = path.join(pureRoot, "prepared-reopen-worktree");
  const tmpRoot = path.join(worktreeRoot, ".tmp");
  const runRoot = path.join(tmpRoot, "prepared-reopen-run-root");
  const controlledDirectories = [
    worktreeRoot,
    tmpRoot,
    runRoot,
    path.join(runRoot, "frozen-source"),
    path.join(runRoot, "layer-a"),
    path.join(runRoot, "layer-a", "evidence"),
    path.join(runRoot, "layer-a", "evidence", "product-smoke-receipts"),
    path.join(runRoot, "layer-a", "logs"),
    path.join(runRoot, "layer-a", "source"),
    path.join(runRoot, "layer-b"),
    path.join(runRoot, "layer-b", "broad-ledger"),
    path.join(runRoot, "layer-b", "evidence"),
    path.join(runRoot, "layer-b", "exhaustive-ledger"),
    path.join(runRoot, "layer-b", "logs"),
    path.join(runRoot, "layer-b", "source"),
    path.join(runRoot, "preflight"),
    path.join(runRoot, "preflight", "logs"),
    path.join(runRoot, "preflight", "writable")
  ];
  for (const directory of controlledDirectories) {
    await mkdir(directory, { mode: 0o700 });
    await chmod(directory, 0o700);
  }
  for (const target of [
    path.join(runRoot, ".california-visualization-frozen-source.json"),
    path.join(runRoot, ".california-signature-measured-authorization-request.json"),
    path.join(
      runRoot,
      "layer-b",
      "evidence",
      ".california-signature-execution-group-ownership.json"
    )
  ]) {
    await writeFile(target, "{}\n", { mode: 0o400 });
    await chmod(target, 0o400);
  }
  for (const fileName of [
    "catalog-check.stderr.log",
    "catalog-check.stdout.log"
  ]) {
    await writeFile(path.join(runRoot, "preflight", "logs", fileName), "", {
      mode: 0o600
    });
  }

  assert.equal(await assertPreparedStarshipRunRoot(runRoot, {
    tmpRoot,
    worktreeRoot
  }), runRoot);
  await mkdir(path.join(runRoot, "layer-b", "unreviewed-browser-output"), {
    mode: 0o700
  });
  await assert.rejects(() => assertPreparedStarshipRunRoot(runRoot, {
    tmpRoot,
    worktreeRoot
  }), /inventory|unexpected|residue|layer-b/i,
  "prepared-run reopen accepted unexpected pre-execution Layer-B residue");
});

test("environment closure preserves HOME variants exactly and rejects injection or paths outside the run root", () => {
  const runRoot = path.join(pureRoot, "env-run");
  const writableRoot = path.join(runRoot, "layer", "writable");
  const base = {
    CODEX_HOME: "/sentinel/codex",
    HOME: "/sentinel/home",
    NEXT_PUBLIC_AMBIENT_ACCEPTANCE_BYPASS: "1",
    NODE_OPTIONS: "--import=/outside/preload.mjs",
    NODE_PATH: "/outside/modules",
    home: "/sentinel/lower-home",
    PLAYWRIGHT_CRASHPAD_DIR: "/tmp/stale-crashpad",
    PLAYWRIGHT_OUTPUT_DIR: "/tmp/stale-output",
    TSX_TSCONFIG_PATH: "/outside/tsconfig.json"
  };
  const env = buildCaliforniaAcceptanceEnvironment({ baseEnv: base, runRoot, writableRoot });
  assert.equal(env.HOME, base.HOME);
  assert.equal(env.home, base.home);
  assert.equal(env.CODEX_HOME, base.CODEX_HOME);
  assert.ok(env.TMPDIR!.startsWith(runRoot));
  assert.ok(env.NODE_COMPILE_CACHE!.startsWith(runRoot));
  assert.notEqual(env.PLAYWRIGHT_OUTPUT_DIR, "/tmp/stale-output");
  assert.equal(env.PLAYWRIGHT_CRASHPAD_DIR, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.NODE_PATH, undefined);
  assert.equal(env.TSX_TSCONFIG_PATH, undefined);
  assert.equal(env.NEXT_PUBLIC_AMBIENT_ACCEPTANCE_BYPASS, undefined);
  assert.throws(() => buildCaliforniaAcceptanceEnvironment({
    baseEnv: base,
    extras: { HOME: "/forbidden/reassignment" },
    runRoot,
    writableRoot
  }), /HOME must be preserved/);
  assert.throws(() => buildCaliforniaAcceptanceEnvironment({
    baseEnv: base,
    extras: { PLAYWRIGHT_OUTPUT_DIR: "/tmp/escape" },
    runRoot,
    writableRoot
  }), /escapes the fresh Starship run root/);
  assert.throws(() => buildCaliforniaAcceptanceEnvironment({
    baseEnv: base,
    extras: { NODE_OPTIONS: "--import=/outside/reintroduced.mjs" },
    runRoot,
    writableRoot
  }), /NODE_OPTIONS.*reserved|unsafe execution environment/i);
  assert.throws(() => buildCaliforniaAcceptanceEnvironment({
    baseEnv: base,
    extras: { NEXT_PUBLIC_AMBIENT_ACCEPTANCE_BYPASS: "1" },
    runRoot,
    writableRoot
  }), /NEXT_PUBLIC_AMBIENT_ACCEPTANCE_BYPASS.*reserved|unsafe execution environment/i);
});

test("Next subprocess paths become project-relative only at the spawn boundary", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const buildNextProcessEnvironment = Reflect.get(
    runnerModule,
    "buildCaliforniaNextProcessEnvironment"
  );
  assert.equal(typeof buildNextProcessEnvironment, "function",
    "runner must expose the pure Next subprocess path adapter for contract tests");
  const sourceRoot = path.join(pureRoot, "next-process-environment", "source");
  const input = {
    HOME: "/sentinel/home",
    NEXT_DIST_DIR: path.join(sourceRoot, ".ca-acceptance", "next-dist"),
    NEXT_TSCONFIG_PATH: path.join(sourceRoot, "tsconfig.california-acceptance.generated.json"),
    PLAYWRIGHT_NEXT_DIST_DIR: path.join(sourceRoot, ".ca-acceptance", "next-dist"),
    PLAYWRIGHT_NEXT_TSCONFIG_PATH:
      path.join(sourceRoot, "tsconfig.california-acceptance.generated.json")
  };
  const adapted = buildNextProcessEnvironment({ env: input, sourceRoot });
  assert.notEqual(adapted, input,
    "Next subprocess path adapter returned the caller-owned environment object");
  assert.deepEqual(adapted, {
    ...input,
    NEXT_DIST_DIR: ".ca-acceptance/next-dist",
    NEXT_TSCONFIG_PATH: "tsconfig.california-acceptance.generated.json"
  });
  assert.equal(input.NEXT_DIST_DIR, path.join(sourceRoot, ".ca-acceptance", "next-dist"),
    "Next subprocess path adapter mutated the absolute audited environment");
  assert.equal(input.NEXT_TSCONFIG_PATH,
    path.join(sourceRoot, "tsconfig.california-acceptance.generated.json"),
  "Next subprocess path adapter mutated the absolute audited tsconfig path");
  assert.throws(() => buildNextProcessEnvironment({
    env: { ...input, NEXT_DIST_DIR: path.join(pureRoot, "outside-next-dist") },
    sourceRoot
  }), /NEXT_DIST_DIR.*inside|escape|relative/i,
  "Next subprocess path adapter accepted a dist directory outside the project copy");
  assert.throws(() => buildNextProcessEnvironment({
    env: { ...input, NEXT_TSCONFIG_PATH: "relative-before-boundary.json" },
    sourceRoot
  }), /NEXT_TSCONFIG_PATH.*absolute/i,
  "Next subprocess path adapter accepted a pre-relativized unaudited tsconfig path");
});

test("Next build restores only its exact generated next-env mutation", async () => {
  const runnerModule = await import("./run-california-visualization-acceptance.mts");
  const expectedNextEnvBytes = Reflect.get(
    runnerModule,
    "buildCaliforniaExpectedNextEnvBuildBytes"
  );
  const runWithRestoration = Reflect.get(
    runnerModule,
    "runWithCaliforniaNextEnvRestoration"
  );
  assert.equal(typeof expectedNextEnvBytes, "function",
    "runner must expose the pure expected next-env build transform for contract tests");
  assert.equal(typeof runWithRestoration, "function",
    "runner must expose the exact next-env build restoration boundary for contract tests");
  const sourceRoot = path.join(pureRoot, "next-env-restoration", "source");
  const distDir = path.join(sourceRoot, ".ca-acceptance", "next-dist");
  await mkdir(sourceRoot, { recursive: true });
  const nextEnvPath = path.join(sourceRoot, "next-env.d.ts");
  const originalBytes = Buffer.from([
    '/// <reference types="next" />',
    '/// <reference types="next/image-types/global" />',
    '/// <reference path="./.next/types/routes.d.ts" />',
    "",
    "// NOTE: This file should not be edited",
    "// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.",
    ""
  ].join("\n"));
  await writeFile(nextEnvPath, originalBytes, { mode: 0o640 });
  await chmod(nextEnvPath, 0o640);
  const originalIdentity = await lstat(nextEnvPath, { bigint: true });
  const expectedBytes = expectedNextEnvBytes({
    distDir,
    originalBytes,
    sourceRoot
  });
  assert.deepEqual(expectedBytes, Buffer.from(originalBytes.toString("utf8").replace(
    '/// <reference path="./.next/types/routes.d.ts" />',
    '/// <reference path="./.ca-acceptance/next-dist/types/routes.d.ts" />'
  )));
  const result = await runWithRestoration({
    distDir,
    run: async () => {
      await writeFile(nextEnvPath, expectedBytes);
      return "build-result";
    },
    sourceRoot
  });
  assert.equal(result, "build-result");
  assert.deepEqual(await readFile(nextEnvPath), originalBytes);
  const restoredIdentity = await lstat(nextEnvPath, { bigint: true });
  assert.equal(restoredIdentity.dev, originalIdentity.dev);
  assert.equal(restoredIdentity.ino, originalIdentity.ino);
  assert.equal(restoredIdentity.mode & BigInt(0o777), BigInt(0o640));

  await assert.rejects(() => runWithRestoration({
    distDir,
    run: async () => "missing-next-env-mutation",
    sourceRoot
  }), /next-env.*expected.*mutation|did not produce/i,
  "a successful Next build without its exact declaration update was accepted");
  assert.deepEqual(await readFile(nextEnvPath), originalBytes);

  await assert.rejects(() => runWithRestoration({
    distDir,
    run: async () => {
      throw new Error("synthetic build failure before next-env mutation");
    },
    sourceRoot
  }), /synthetic build failure before next-env mutation/,
  "a failed Next build with an unchanged declaration had its original error swallowed");
  assert.deepEqual(await readFile(nextEnvPath), originalBytes,
    "failed pre-mutation build changed the original Next declaration");

  await assert.rejects(() => runWithRestoration({
    distDir,
    run: async () => {
      await writeFile(nextEnvPath, expectedBytes);
      throw new Error("synthetic build failure");
    },
    sourceRoot
  }), /synthetic build failure/);
  assert.deepEqual(await readFile(nextEnvPath), originalBytes,
    "failed build did not restore the exact expected Next declaration mutation");

  await assert.rejects(() => runWithRestoration({
    distDir,
    run: async () => {
      await writeFile(nextEnvPath, "unexpected mutation\n");
      return "forbidden";
    },
    sourceRoot
  }), /next-env.*unexpected|unexpected.*next-env/i,
  "unexpected next-env mutation was hidden by restoration");
  assert.equal(await readFile(nextEnvPath, "utf8"), "unexpected mutation\n",
    "unexpected next-env mutation evidence was erased");
});

test("formal Layer A environment loads the hardened Playwright config with exact Crashpad containment", async () => {
  const runRoot = path.join(pureRoot, "layer-a-crashpad-config-load");
  const layout = buildRunLayout(runRoot);
  await mkdir(layout.layerASourceRoot, { recursive: true });
  const sourceManifest: CaliforniaFrozenSourceManifest = {
    aggregateSha256: "a".repeat(64),
    entries: [],
    entryCount: 0,
    gitHead: "b".repeat(40),
    schemaVersion: 1,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  };
  const env = layerEnvironment({
    acceptanceRunId: highEntropy("accept"),
    baseEnv: {
      ...process.env,
      BREAKPAD_DUMP_LOCATION: "/forbidden/ambient-breakpad",
      CFFIXED_USER_HOME: "/forbidden/ambient-foundation-home"
    },
    buildId: highEntropy("build"),
    layer: "a",
    layout,
    matrixRunId: highEntropy("matrix"),
    origin: "http://127.0.0.1:43116",
    sourceManifest
  });
  assert.equal(env.BREAKPAD_DUMP_LOCATION, undefined);
  assert.equal(env.CFFIXED_USER_HOME, undefined);
  assert.equal(env.HOME, process.env.HOME);
  assert.equal(env.home, process.env.home);
  assert.equal(env.CODEX_HOME, process.env.CODEX_HOME);
  assert.equal(
    env.PLAYWRIGHT_CRASHPAD_DIR,
    path.join(env.PLAYWRIGHT_E2E_ROOT!, "chrome-crashpad")
  );
  assert.ok(path.isAbsolute(env.PLAYWRIGHT_CRASHPAD_DIR!));

  const result = spawnSync(process.execPath, [
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/@playwright/test/cli.js"),
    "test",
    "tests/e2e/california-visualization-product-smoke.spec.ts",
    "--list",
    "--project=desktop-chrome",
    "--project=mobile-chrome",
    "--workers=1",
    "--retries=0",
    "--repeat-each=1",
    "--reporter=line",
    "--config",
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "playwright.config.ts")
  ], {
    cwd: layout.layerASourceRoot,
    encoding: "utf8",
    env,
    shell: false
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Total: 2 tests in 1 file/);
});

test("Layer B replaces ambient matrix shrink and timeout variables with the frozen formal budget", () => {
  const runRoot = path.join(pureRoot, "matrix-env-run");
  const layout = buildRunLayout(runRoot);
  const sourceManifest: CaliforniaFrozenSourceManifest = {
    aggregateSha256: "a".repeat(64),
    entries: [],
    entryCount: 0,
    gitHead: "b".repeat(40),
    schemaVersion: 1,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  };
  const baseEnv = {
    CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: highEntropy("runtime"),
    CA_SIGNATURE_EXHAUSTIVE_RUN_ID: highEntropy("exhaustive"),
    CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256: "c".repeat(64),
    CA_SIGNATURE_PRODUCT_PROJECT_ROOT: "/forbidden/ambient-product-root",
    CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256: "d".repeat(64),
    CA_VIZ_EXPECT_TIMEOUT_MS: "999999999",
    CA_VIZ_MAX_VISITS_PER_PACKAGE: "99999",
    CA_VIZ_TEST_TIMEOUT_MS: "999999999",
    CA_VIZ_UX_BUDGET_MS: "999999999",
    HOME: "/sentinel/home"
  };
  const layerB = layerEnvironment({
    acceptanceRunId: highEntropy("accept"),
    baseEnv,
    buildId: highEntropy("build"),
    executionGroupOwnershipReceipt: {
      path: layout.executionGroupOwnershipPath,
      sha256: digest("matrix-env-execution-group-ownership")
    },
    layer: "b",
    layout,
    matrixRunId: highEntropy("matrix"),
    origin: "http://127.0.0.1:43113",
    sourceManifest
  });
  assert.equal(layerB.CA_VIZ_MAX_VISITS_PER_PACKAGE, "10");
  assert.equal(layerB.CA_VIZ_EXPECT_TIMEOUT_MS, "60000");
  assert.equal(layerB.CA_VIZ_UX_BUDGET_MS, "30000");
  assert.equal(layerB.CA_VIZ_TEST_TIMEOUT_MS, "720000");
  assert.equal(layerB.CA_VIZ_SOURCE_SNAPSHOT_SHA256, sourceManifest.aggregateSha256);
  assert.equal(layerB.CA_SIGNATURE_PRODUCT_PROJECT_ROOT, layout.frozenSourceRoot,
    "Layer B must bind source collection to the immutable product copy");
  assert.equal(
    path.relative(layerB.CA_SIGNATURE_PRODUCT_PROJECT_ROOT!, layout.layerBSourceRoot)
      .startsWith(`..${path.sep}`),
    true,
    "Layer B product collection root must be disjoint from instrumented staging"
  );
  assert.equal(layerB.CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256, undefined);
  assert.equal(layerB.CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256, undefined);
  assert.equal(layerB.HOME, baseEnv.HOME);
  assert.equal(
    layerB.PLAYWRIGHT_CRASHPAD_DIR,
    path.join(layerB.PLAYWRIGHT_E2E_ROOT!, "chrome-crashpad")
  );
  assert.equal(layerB.TMPDIR, path.join(layout.layerBRoot, "runtime-temp"));
  assert.equal(layerB.TMP, layerB.TMPDIR);
  assert.equal(layerB.TEMP, layerB.TMPDIR);
  assert.equal(layerB.SQLITE_TMPDIR, layerB.TMPDIR);
  assert.equal(
    path.relative(layout.layerBSourceRoot, layerB.TMPDIR!).startsWith(`..${path.sep}`),
    true,
    "Layer B temporary staging fixtures must be disjoint from the frozen product source root"
  );

  const layerA = layerEnvironment({
    acceptanceRunId: highEntropy("accept"),
    baseEnv,
    buildId: highEntropy("build"),
    layer: "a",
    layout,
    matrixRunId: highEntropy("matrix"),
    origin: "http://127.0.0.1:43114",
    sourceManifest
  });
  assert.equal(layerA.CA_VIZ_MAX_VISITS_PER_PACKAGE, undefined);
  assert.equal(layerA.CA_SIGNATURE_PRODUCT_PROJECT_ROOT, undefined);
  assert.equal(layerA.CA_SIGNATURE_QA_STAGING_ROOT, undefined);
  assert.equal(layerA.CA_VISUALIZATION_QA_BUILD, undefined);
  assert.equal(
    layerA.PLAYWRIGHT_CRASHPAD_DIR,
    path.join(layerA.PLAYWRIGHT_E2E_ROOT!, "chrome-crashpad")
  );
  assert.equal(layerA.TMPDIR, path.join(layout.layerARoot, "runtime-temp"));
  assert.equal(
    path.relative(layout.layerASourceRoot, layerA.TMPDIR!).startsWith(`..${path.sep}`),
    true,
    "Layer A temporary staging fixtures must be disjoint from the frozen product source root"
  );
});

test("broad producer contract is rebuilt from frozen Layer B env without leaking process context", () => {
  const runRoot = path.join(pureRoot, "producer-contract-env-run");
  const layout = buildRunLayout(runRoot);
  const sourceManifest: CaliforniaFrozenSourceManifest = {
    aggregateSha256: "a".repeat(64),
    entries: [],
    entryCount: 0,
    gitHead: "b".repeat(40),
    schemaVersion: 1,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  };
  const buildId = highEntropy("build");
  const matrixRunId = highEntropy("matrix");
  const layerB = layerEnvironment({
    acceptanceRunId: highEntropy("accept"),
    baseEnv: {
      ...process.env,
      CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: highEntropy("runtime"),
      CA_SIGNATURE_EXHAUSTIVE_RUN_ID: highEntropy("exhaustive")
    },
    buildId,
    executionGroupOwnershipReceipt: {
      path: layout.executionGroupOwnershipPath,
      sha256: digest("producer-env-execution-group-ownership")
    },
    layer: "b",
    layout,
    matrixRunId,
    origin: "http://127.0.0.1:43115",
    sourceManifest
  });
  const originalCwd = process.cwd();
  const originalHome = process.env.HOME;
  const originalBuildId = process.env.CA_VIZ_BUILD_ID;
  const contract = buildBroadProducerLifecycleContract({
    env: layerB,
    sourceRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  assert.ok(contract.packages.length > 0);
  assert.equal(contract.expectedMatrix.size,
    contract.packages.length * CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.length);
  assert.equal(contract.provenance.buildId, buildId);
  assert.equal(contract.provenance.matrixRunId, matrixRunId);
  assert.equal(contract.provenance.sourceSnapshotSha256, sourceManifest.aggregateSha256);
  assert.equal(process.cwd(), originalCwd);
  assert.equal(process.env.HOME, originalHome);
  assert.equal(process.env.CA_VIZ_BUILD_ID, originalBuildId);
});

test("frozen snapshot copies are byte/mode exact, independent inodes, and reject hardlinked source", async () => {
  const root = path.join(pureRoot, "copy-contract");
  const source = path.join(root, "source");
  const frozen = path.join(root, "frozen");
  const layerA = path.join(root, "a");
  const layerB = path.join(root, "b");
  await Promise.all([source, frozen, layerA, layerB].map((directory) => mkdir(directory, { recursive: true })));
  await mkdir(path.join(source, "nested"));
  await writeFile(path.join(source, "alpha.txt"), "alpha\n", { mode: 0o640 });
  await writeFile(path.join(source, "nested", "beta.ts"), "export const beta = 2;\n", { mode: 0o600 });
  const entries = await Promise.all(["alpha.txt", "nested/beta.ts"].map(async (relativePath) => {
    const target = path.join(source, relativePath);
    const identity = await lstat(target);
    const bytes = await readFile(target);
    return {
      mode: identity.mode & 0o777,
      path: relativePath,
      sha256: digest(bytes.toString("binary")),
      size: bytes.length
    };
  }));
  const manifest: CaliforniaFrozenSourceManifest = {
    aggregateSha256: sourceManifestAggregate(entries),
    entries,
    entryCount: entries.length,
    gitHead: "a".repeat(40),
    schemaVersion: 1,
    worktreeRoot: source
  };
  await createIndependentSourceCopies({
    frozenRoot: frozen,
    layerARoot: layerA,
    layerBRoot: layerB,
    manifest,
    sourceRoot: source
  });
  await verifyManifestTree({
    entries,
    modePolicy: "frozen-readonly",
    root: frozen
  });
  for (const entry of entries) {
    const identities = await Promise.all([frozen, layerA, layerB].map((directory) =>
      lstat(path.join(directory, entry.path))
    ));
    assert.equal(new Set(identities.map((identity) => `${identity.dev}:${identity.ino}`)).size, 3);
    assert.equal((await readFile(path.join(layerA, entry.path))).toString("utf8"),
      (await readFile(path.join(layerB, entry.path))).toString("utf8"));
    assert.equal(identities[0]!.mode & 0o777, entry.mode & ~0o222,
      `${entry.path}: frozen copy did not retain the exact read-only mode policy`);
    assert.equal(identities[1]!.mode & 0o777, entry.mode);
    assert.equal(identities[2]!.mode & 0o777, entry.mode);
  }

  const linkedRoot = path.join(pureRoot, "hardlink-contract");
  const linkedSource = path.join(linkedRoot, "source");
  await mkdir(linkedSource, { recursive: true });
  await writeFile(path.join(linkedSource, "linked.txt"), "linked\n");
  await link(path.join(linkedSource, "linked.txt"), path.join(linkedSource, "second-link.txt"));
  const linkedEntry = {
    mode: 0o600,
    path: "linked.txt",
    sha256: digest("linked\n"),
    size: 7
  };
  await Promise.all(["frozen", "a", "b"].map((directory) =>
    mkdir(path.join(linkedRoot, directory), { recursive: true })
  ));
  await assert.rejects(() => createIndependentSourceCopies({
    frozenRoot: path.join(linkedRoot, "frozen"),
    layerARoot: path.join(linkedRoot, "a"),
    layerBRoot: path.join(linkedRoot, "b"),
    manifest: {
      aggregateSha256: sourceManifestAggregate([linkedEntry]),
      entries: [linkedEntry],
      entryCount: 1,
      gitHead: "b".repeat(40),
      schemaVersion: 1,
      worktreeRoot: linkedSource
    },
    sourceRoot: linkedSource
  }), /hardlinked|non-hardlinked/);
});

test("durable frozen source manifest is exact-schema verified and byte-bound", async () => {
  const entry = { mode: 0o600, path: "source.ts", sha256: "a".repeat(64), size: 12 };
  const manifest: CaliforniaFrozenSourceManifest = {
    aggregateSha256: sourceManifestAggregate([entry]),
    entries: [entry],
    entryCount: 1,
    gitHead: "b".repeat(40),
    schemaVersion: 1,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  };
  const target = path.join(pureRoot, "durable-source-manifest.json");
  const publication = await writeExclusiveJson(target, manifest);
  const module = await import("./run-california-visualization-acceptance.mts");
  const verifier = Reflect.get(module, "verifyFrozenSourceManifest");
  assert.equal(typeof verifier, "function", "runner must export a durable source manifest verifier");
  const verified = await verifier({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: target
  });
  assert.equal(verified.sha256, publication.sha256);
  assert.deepEqual(verified.manifest, manifest);

  const mixedTarget = path.join(pureRoot, "durable-source-manifest-mixed.json");
  await writeFile(mixedTarget, `${JSON.stringify({
    ...manifest,
    aggregateSha256: "c".repeat(64)
  })}\n`);
  await assert.rejects(() => verifier({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: mixedTarget
  }), /aggregate|source manifest/i);
});

test("command plans use process.execPath plus require-resolved local CLIs and freeze no shard/filter/retry escape", () => {
  const layout = buildRunLayout(path.join(pureRoot, "command-run"));
  const entrypoints = {
    nextCli: path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/next/dist/bin/next"),
    playwrightCli: path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/@playwright/test/cli.js"),
    tsxLoader: path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/tsx/dist/loader.mjs")
  };
  const plans = buildCaliforniaCommandPlans({ entrypoints, layout });
  assert.doesNotThrow(() => assertLocalOnlyCommandPlans(plans, entrypoints));
  for (const plan of Object.values(plans)) {
    assert.equal(plan.argv[0], process.execPath);
    assert.equal(plan.argv.some((argument) => /(^|\/)npx?$/.test(argument)), false);
  }
  assert.deepEqual(CALIFORNIA_ACCEPTANCE_ALL_AXES.length, 12);
  const forged = structuredClone(plans);
  forged.productSmoke.argv.push("/usr/bin/npx");
  assert.throws(() => assertLocalOnlyCommandPlans(forged, entrypoints), /npm\/npx/);
});

test("exact detached process group cleanup terminates the owned group", { timeout: 20_000 }, async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: true,
    stdio: "ignore"
  });
  assert.ok(child.pid);
  await once(child, "spawn");
  await terminateExactProcessGroup(child.pid!, 10_000);
  assert.throws(() => process.kill(-child.pid!, 0), (error: NodeJS.ErrnoException) => error.code === "ESRCH");
});

test("captured commands wait for stdout closure after the immediate child exits", async () => {
  const module = await import("./run-california-visualization-acceptance.mts");
  const capture = Reflect.get(module, "captureProcess");
  assert.equal(typeof capture, "function", "runner must expose its exact capture primitive");
  const script = [
    "const { spawn } = require('node:child_process');",
    "process.stdout.write('head\\n');",
    "spawn(process.execPath, ['-e', \"setTimeout(() => process.stdout.write('tail\\\\n'), 100)\"],",
    "  { stdio: ['ignore', 1, 2] });"
  ].join("\n");
  const bytes = await capture({
    argv: [process.execPath, "-e", script],
    cwd: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined },
    maxBytes: 4_096,
    timeoutMs: 10_000
  });
  assert.equal(bytes.toString("utf8"), "head\ntail\n");
});

test("acceptance entrypoint rejects ambient Node injection and the fixed bootstrap re-execs clean", async () => {
  const runnerPath = path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance.mts");
  const bootstrapPath = path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "scripts/run-california-visualization-acceptance-bootstrap.cjs");
  const bootstrapIdentity = await lstat(bootstrapPath).catch(() => null);
  assert.ok(bootstrapIdentity?.isFile() && !bootstrapIdentity.isSymbolicLink(),
    "acceptance clean bootstrap must be one regular file");
  const bootstrapSource = await readFile(bootstrapPath, "utf8");
  assert.doesNotMatch(bootstrapSource, /\{\s*\.\.\.process\.env/,
    "clean bootstrap must not clone the ambient process environment");
  assert.match(bootstrapSource, /SAFE_INHERITED_ENV_KEYS/);
  const tainted = spawnSync(process.execPath, ["--import", "tsx", runnerPath], {
    cwd: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--no-warnings", NODE_PATH: "/outside/modules" },
    shell: false
  });
  assert.equal(tainted.status, 1);
  assert.match(tainted.stderr, /NODE_OPTIONS|NODE_PATH/);
  assert.match(tainted.stderr, /unsafe.*entrypoint|bootstrap/i);

  const bootstrapped = spawnSync(process.execPath, [bootstrapPath], {
    cwd: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: "--no-warnings",
      NODE_PATH: "/outside/modules",
      TSX_TSCONFIG_PATH: "/outside/tsconfig.json"
    },
    shell: false
  });
  assert.equal(bootstrapped.status, 1);
  assert.doesNotMatch(bootstrapped.stderr, /unsafe.*entrypoint/i);
  assert.match(bootstrapped.stderr, /California acceptance CLI options|exact values drifted/);
});

test("Layer A receipt is structurally incapable of claiming Canvas non-text evidence", () => {
  const receipt = buildLayerAReceipt({
    acceptanceRunId: highEntropy("accept"),
    actualNextBuildId: highEntropy("next"),
    buildId: highEntropy("build"),
    playwrightReportSha256: "a".repeat(64),
    productSmokeManifestSha256: "b".repeat(64),
    sourceSnapshotSha256: "c".repeat(64)
  });
  assert.equal(receipt.instrumentation, "none");
  assert.equal(receipt.canvasNonTextClaim, false);
  assert.equal(receipt.graphicsReceipts, 0);
  assert.deepEqual(Object.keys(receipt).sort(), [
    "acceptanceRunId",
    "actualNextBuildId",
    "buildId",
    "canvasNonTextClaim",
    "graphicsReceipts",
    "instrumentation",
    "playwrightReportSha256",
    "productSmokeManifestSha256",
    "schemaVersion",
    "sourceSnapshotSha256",
    "status"
  ].sort());
});

test("product smoke manifest is exact and rejects QA marker/graphics claim misuse", async () => {
  const acceptanceRunId = highEntropy("accept");
  const buildId = highEntropy("build");
  const sourceSnapshotSha256 = "d".repeat(64);
  const valid = productSmokeManifest({ acceptanceRunId, buildId, sourceSnapshotSha256 });
  const validPath = path.join(pureRoot, "product-smoke-valid.json");
  await writeFile(validPath, `${JSON.stringify(valid)}\n`);
  const verified = await verifyProductSmokeManifest({
    acceptanceRunId,
    buildId,
    manifestPath: validPath,
    sourceSnapshotSha256
  });
  assert.equal(verified.manifest.graphicsReceipts, 0);

  const forgedPath = path.join(pureRoot, "product-smoke-forged.json");
  await writeFile(forgedPath, `${JSON.stringify({
    ...valid,
    canvasNonTextClaim: true,
    graphicsReceipts: 1,
    instrumentation: "composed"
  })}\n`);
  await assert.rejects(() => verifyProductSmokeManifest({
    acceptanceRunId,
    buildId,
    manifestPath: forgedPath,
    sourceSnapshotSha256
  }), /instrumentation|canvasNonTextClaim|graphicsReceipts/);
});

test("product smoke aggregate is derived only from exact browser-produced per-project receipts", async () => {
  const acceptanceRunId = highEntropy("accept");
  const buildId = highEntropy("build");
  const actualNextBuildId = highEntropy("next");
  const sourceSnapshotSha256 = "7".repeat(64);
  const receiptDir = path.join(pureRoot, "product-browser-receipts");
  const manifestPath = path.join(pureRoot, "product-browser-manifest.json");
  const premiumRoutes = ["us-ca-math-s4-chapter-04", "us-ca-math-s5-chapter-03"];
  const directoryRoutes = [
    ...premiumRoutes,
    ...Array.from({ length: 74 }, (_, index) =>
      `us-ca-math-fixture-${String(index + 1).padStart(2, "0")}`
    )
  ];
  const crashpadDir = path.join(pureRoot, "product-browser-crashpad");
  await mkdir(receiptDir);
  for (const projectName of CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS) {
    await writeFile(path.join(receiptDir, `${projectName}.product-smoke.passed.json`),
      `${JSON.stringify({
        acceptanceRunId,
        actualNextBuildId,
        buildId,
        canvasNonTextClaim: false,
        checks: [...CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS],
        crashpadContainment: {
          argument: `--breakpad-dump-location=${crashpadDir}`,
          scheme: "chrome-command-line-switch",
          verificationBoundary: {
            globalCrashpadSettingsIdentity: "external-runner-required",
            processTree: "external-runner-required"
          }
        },
        crashpadDir,
        directoryRoutes,
        graphicsReceipts: 0,
        instrumentation: "none",
        premiumRoutes,
        projectName,
        schemaVersion: 1,
        sourceSnapshotSha256,
        status: "passed"
      })}\n`, { mode: 0o600 });
  }
  const published = await publishCaliforniaProductSmokeManifest({
    acceptanceRunId,
    actualNextBuildId,
    buildId,
    manifestPath,
    receiptDir,
    sourceSnapshotSha256
  });
  assert.deepEqual(published.manifest.directoryRoutes, directoryRoutes);
  assert.deepEqual(published.manifest.premiumRoutes, premiumRoutes);
  assert.equal(published.manifest.crashpadDir, crashpadDir);
  assert.equal(published.manifest.crashpadContainment.verificationBoundary.processTree,
    "external-runner-required");
  assert.deepEqual(
    published.manifest.receiptFiles.map((binding: { fileName: string; projectName: string; sha256: string }) =>
      [binding.projectName, binding.fileName, binding.sha256.length]
    ),
    CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName) =>
      [projectName, `${projectName}.product-smoke.passed.json`, 64]
    )
  );
  assert.equal(
    published.manifest.checks.some((check: { checkId: string }) =>
      check.checkId === "signature-control-changes-model" ||
      check.checkId === "signature-reset-restores-model"
    ),
    false
  );

  const desktopReceiptPath = path.join(receiptDir, "desktop-chrome.product-smoke.passed.json");
  const desktopReceipt = await readFile(desktopReceiptPath, "utf8");
  await writeFile(desktopReceiptPath, desktopReceipt.replace(/\n$/, "  \n"));
  await assert.rejects(() => verifyProductSmokeManifest({
    acceptanceRunId,
    buildId,
    manifestPath,
    receiptDir,
    sourceSnapshotSha256
  }), /receipt.*(?:SHA|bytes|binding)/i);

  await writeFile(path.join(receiptDir, "extra.product-smoke.passed.json"), "{}\n");
  await assert.rejects(() => publishCaliforniaProductSmokeManifest({
    acceptanceRunId,
    actualNextBuildId,
    buildId,
    manifestPath: path.join(pureRoot, "product-browser-manifest-extra.json"),
    receiptDir,
    sourceSnapshotSha256
  }), /receipt.*exact|unknown|extra/i);
});

test("Playwright report gate rejects missing/extra/project/skip/retry/failure/flaky evidence", async (t) => {
  const writeReport = async (name: string, value: unknown) => {
    const target = path.join(pureRoot, `${name}.json`);
    await writeFile(target, `${JSON.stringify(value)}\n`);
    return target;
  };
  await t.test("passing exact two-project report", async () => {
    const target = await writeReport("report-pass", playwrightReport({}));
    const result = await verifyPlaywrightJsonReport({
      expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
      expectedTestCount: 2,
      reportPath: target
    });
    assert.equal(result.testCount, 2);
  });
  await t.test("missing project", async () => {
    const target = await writeReport("report-missing", playwrightReport({ projects: ["desktop-chrome"] }));
    await assert.rejects(() => verifyPlaywrightJsonReport({
      expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
      reportPath: target
    }), /projects.*drifted/);
  });
  await t.test("extra test count", async () => {
    const target = await writeReport("report-extra", playwrightReport({}));
    await assert.rejects(() => verifyPlaywrightJsonReport({
      expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
      expectedTestCount: 1,
      reportPath: target
    }), /test count drifted/);
  });
  for (const [name, report, pattern] of [
    ["skip", playwrightReport({ skipped: true }), /status|skipped/],
    ["retry", playwrightReport({ resultsPerTest: 2 }), /retries|duplicate/],
    ["retry-index", playwrightReport({ retry: 1 }), /retry/],
    ["failure", playwrightReport({ failed: true }), /status|pass/],
    ["flaky", playwrightReport({ flakyStat: 1 }), /flaky/]
  ] as const) {
    await t.test(name, async () => {
      const target = await writeReport(`report-${name}`, report);
      await assert.rejects(() => verifyPlaywrightJsonReport({
        expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
        reportPath: target
      }), pattern);
    });
  }
});

test("broad pre-finalizer gate derives package rows from the open artifact matrix plus exact canary identities", async () => {
  const ledgerRoot = path.join(pureRoot, "broad-open-ledger");
  const matrixRunId = highEntropy("matrix");
  const buildId = highEntropy("build");
  const runDirectory = path.join(ledgerRoot, matrixRunId);
  await mkdir(runDirectory, { recursive: true });
  const packages = ["directory-p1-1", "premium-p1-1"];
  const expectedArtifacts = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) =>
    packages.map((packageId) => ({ packageId, projectName, repeatEachIndex: 0 }))
  );
  await writeFile(path.join(runDirectory, CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME), `${JSON.stringify({
    expectedArtifacts,
    provenance: { buildId, matrixRunId, sourceSnapshotSha256: "a".repeat(64) },
    requiredPackages: packages,
    requiredProjects: [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS],
    requiredRepeatEachIndices: [0]
  })}\n`);
  for (const [index, artifact] of expectedArtifacts.entries()) {
    await writeFile(
      path.join(runDirectory, `${index}-${artifact.projectName}-${artifact.packageId}.coverage.passed.json`),
      `${JSON.stringify({ execution: { retry: 0 }, terminalStatus: "passed" })}\n`
    );
  }
  const reportPath = path.join(pureRoot, "broad-open-report.json");
  const specs = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) => [
    ...CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES.map((title) => ({ projectName, title })),
    ...packages.map((packageId) => ({
      projectName,
      title: `${packageId} (2 labs / 3 visits)`
    }))
  ]).map(({ projectName, title }) => ({
    tests: [{
      projectName,
      results: [{ retry: 0, status: "passed" }],
      status: "expected"
    }],
    title
  }));
  await writeFile(reportPath, `${JSON.stringify({
    stats: { flaky: 0, skipped: 0, unexpected: 0 },
    suites: [{ specs, title: "California Visualization Lab full sweep" }]
  })}\n`);
  const verified = await verifyBroadOpenRunAndReportBeforeFinalizer({
    buildId,
    ledgerRoot,
    matrixRunId,
    reportPath,
    sourceSnapshotSha256: "a".repeat(64)
  });
  assert.equal(verified.artifactCount, expectedArtifacts.length);
  assert.deepEqual(verified.packages, packages);

  const selfShrunkReportPath = path.join(pureRoot, "broad-open-report-shrunk.json");
  await writeFile(selfShrunkReportPath, `${JSON.stringify({
    stats: { flaky: 0, skipped: 0, unexpected: 0 },
    suites: [{ specs: specs.slice(0, -1), title: "California Visualization Lab full sweep" }]
  })}\n`);
  await assert.rejects(() => verifyBroadOpenRunAndReportBeforeFinalizer({
    buildId,
    ledgerRoot,
    matrixRunId,
    reportPath: selfShrunkReportPath,
    sourceSnapshotSha256: "a".repeat(64)
  }), /test count|identities/);
});

test("terminal seal receipt parser requires one unique finalizer-owned SHA line", () => {
  const sha = "a".repeat(64);
  const line = `${CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL}: 104 artifacts; ` +
    `.california-visualization-coverage-seal.json=${sha}`;
  const receipt = parseUniqueTerminalSealReceipt({
    expectedFileName: ".california-visualization-coverage-seal.json",
    label: CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL,
    output: `TAP version 13\n# ${line}\n1..1\n`
  });
  assert.deepEqual(receipt, {
    artifactCount: 104,
    fileName: ".california-visualization-coverage-seal.json",
    sha256: sha
  });
  assert.throws(() => parseUniqueTerminalSealReceipt({
    expectedFileName: ".california-visualization-coverage-seal.json",
    label: CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL,
    output: `${line}\n${line}`
  }), /one unique/);
  assert.throws(() => parseUniqueTerminalSealReceipt({
    expectedFileName: ".california-visualization-coverage-seal.json",
    label: CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL,
    output: "no receipt"
  }), /one unique/);
});

test("broad terminal seal binds its eighth provenance field to the frozen source snapshot", async () => {
  const ledgerRoot = path.join(pureRoot, "broad-terminal-ledger");
  const matrixRunId = highEntropy("matrix");
  const buildId = highEntropy("build");
  const sourceSnapshotSha256 = "a".repeat(64);
  const provenance = {
    baselineSha: "7".repeat(40),
    buildId,
    catalogHash: "8".repeat(64),
    harnessHash: "b".repeat(64),
    matrixConfigHash: "9".repeat(64),
    matrixRunId,
    sourceHash: "c".repeat(64),
    sourceSnapshotSha256
  };
  const provenanceSha256 = digest(stableJson(provenance));
  const runDirectory = path.join(ledgerRoot, matrixRunId);
  await mkdir(runDirectory, { recursive: true });
  const artifactFileName = `one${CALIFORNIA_BROAD_OFFICIAL_SUFFIX}`;
  const artifactId = "one";
  const expectedArtifacts = [{
    artifactId,
    execution: { repeatEachIndex: 0, retry: 0 },
    fileName: artifactFileName,
    packageId: "one-package",
    projectName: "desktop-chrome"
  }];
  const expectedArtifactsSha256 = digest(stableJson(expectedArtifacts));
  const manifestPath = path.join(runDirectory, CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME);
  await writeFile(manifestPath, `${JSON.stringify({
    expectedArtifacts,
    expectedArtifactsSha256,
    lifecycleSchemaVersion: 2,
    officialArtifactSuffix: CALIFORNIA_BROAD_OFFICIAL_SUFFIX,
    provenance,
    provenanceSha256,
    requiredPackages: ["one-package"],
    requiredProjects: ["desktop-chrome"],
    requiredRepeatEachIndices: [0],
    schemaVersion: 5,
    status: "open"
  })}\n`);
  const artifactPath = path.join(runDirectory, artifactFileName);
  await writeFile(artifactPath, `${JSON.stringify({
    artifactId,
    execution: { retry: 0 },
    terminalStatus: "passed"
  })}\n`);
  const artifactSha256 = digest(await readFile(artifactPath, "utf8"));
  const manifestSha256 = digest(await readFile(manifestPath, "utf8"));
  const playwrightReportSha256 = "d".repeat(64);
  const producerSuccessPath = path.join(
    runDirectory,
    CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
  );
  await writeFile(producerSuccessPath, `${JSON.stringify({
    artifacts: [{ artifactId, fileName: artifactFileName, sha256: artifactSha256 }],
    expectedArtifactsSha256,
    lifecycleSchemaVersion: 2,
    producerReportSha256: playwrightReportSha256,
    provenance,
    provenanceSha256,
    publishedAt: new Date().toISOString(),
    status: "producer-succeeded"
  })}\n`);
  const producerSuccessSha256 = digest(await readFile(producerSuccessPath, "utf8"));
  const sealPath = path.join(runDirectory, CALIFORNIA_BROAD_RUN_SEAL_FILENAME);
  await writeFile(sealPath, `${JSON.stringify({
    artifacts: [{ artifactId, fileName: artifactFileName, sha256: artifactSha256 }],
    expectedArtifactsSha256,
    lifecycleSchemaVersion: 2,
    manifestSha256,
    producerReportSha256: playwrightReportSha256,
    producerSuccessSha256,
    provenance,
    provenanceSha256,
    sealedAt: new Date().toISOString(),
    status: "sealed"
  })}\n`);
  const expectedSealSha256 = digest(await readFile(sealPath, "utf8"));
  const verified = await verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  });
  assert.equal(verified.sourceSnapshotSha256, sourceSnapshotSha256);
  const validBroadSealBytes = await readFile(sealPath);
  const staleBroadSeal = JSON.parse(validBroadSealBytes.toString("utf8")) as Record<string, unknown>;
  staleBroadSeal.lifecycleSchemaVersion = 1;
  await writeFile(sealPath, `${JSON.stringify(staleBroadSeal)}\n`);
  const staleBroadSealSha256 = digest(await readFile(sealPath));
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256: staleBroadSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  }), /lifecycle schema/i);
  await writeFile(sealPath, validBroadSealBytes);
  const unboundBroadSeal = JSON.parse(validBroadSealBytes.toString("utf8")) as Record<string, unknown>;
  unboundBroadSeal.provenanceSha256 = "6".repeat(64);
  await writeFile(sealPath, `${JSON.stringify(unboundBroadSeal)}\n`);
  const unboundBroadSealSha256 = digest(await readFile(sealPath));
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256: unboundBroadSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  }), /provenanceSha256|provenance hash/i);
  await writeFile(sealPath, validBroadSealBytes);
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: "9".repeat(64),
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  }), /does not bind the verified Playwright report/);
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: "8".repeat(64),
    expectedSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  }), /differs from its in-memory external receipt/);
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256,
    frozenSourceSnapshotSha256: "d".repeat(64),
    ledgerRoot,
    matrixRunId
  }), /mixes frozen sourceSnapshotSha256/);
  const pendingPath = path.join(runDirectory, "forged.producer-pending.tmp");
  await writeFile(pendingPath, "pending\n");
  await assert.rejects(() => verifyBroadTerminalSeal({
    buildId,
    expectedArtifactCount: 1,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    matrixRunId
  }), /pending|unknown/);
  await rm(pendingPath);
});

test("exhaustive terminal verifier rejects the legacy metadata-only 102-artifact shape", async () => {
  const ledgerRoot = path.join(pureRoot, "exhaustive-terminal-ledger");
  const exhaustiveRunId = highEntropy("exhaustive");
  const runtimeRunId = highEntropy("runtime");
  const buildId = highEntropy("build");
  const origin = "http://127.0.0.1:43116";
  const sourceSnapshotSha256 = "1".repeat(64);
  const expectedArtifactsSha256 = "2".repeat(64);
  const playwrightReportSha256 = "3".repeat(64);
  const componentSourceSha256 = "4".repeat(64);
  const controlBlueprintSha256 = "5".repeat(64);
  const markerIdentities = {
    canvas: { productSourceSha256: componentSourceSha256 },
    control: {
      blueprintSha256: controlBlueprintSha256,
      productSourceSha256: componentSourceSha256
    }
  };
  const markerIdentitiesSha256 = digest(stableJson(markerIdentities));
  const runDirectory = path.join(ledgerRoot, exhaustiveRunId);
  await mkdir(runDirectory, { recursive: true });
  const manifestPath = path.join(runDirectory, CALIFORNIA_EXHAUSTIVE_RUN_MANIFEST_FILENAME);
  await writeFile(manifestPath, `${JSON.stringify({
    buildId,
    componentSourceSha256,
    controlBlueprintSha256,
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    markerIdentities,
    markerIdentitiesSha256,
    officialArtifactSuffix: CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX,
    origin,
    requiredProjects: [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS],
    runId: exhaustiveRunId,
    runtimeRunId,
    sourceSnapshotSha256,
    status: "open"
  })}\n`);
  const rows = await Promise.all(Array.from({ length: 102 }, async (_, index) => {
    const artifactId = `artifact-${String(index).padStart(3, "0")}`;
    const fileName = `${String(index).padStart(3, "0")}${CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX}`;
    const artifactPath = path.join(runDirectory, fileName);
    await writeFile(artifactPath, `${JSON.stringify({
      artifactId,
      execution: { retry: 0 },
      terminalStatus: "passed"
    })}\n`);
    return { artifactId, fileName, sha256: digest(await readFile(artifactPath, "utf8")) };
  }));
  const producerSuccessPath = path.join(
    runDirectory,
    CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME
  );
  await writeFile(producerSuccessPath, `${JSON.stringify({
    artifacts: rows,
    buildId,
    componentSourceSha256,
    controlBlueprintSha256,
    evidenceReservations: [],
    expectedArtifactsSha256,
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    markerIdentities,
    markerIdentitiesSha256,
    origin,
    producerReportSha256: playwrightReportSha256,
    publishedAt: new Date().toISOString(),
    runId: exhaustiveRunId,
    runtimeRunId,
    sourceSnapshotSha256,
    status: "producer-succeeded"
  })}\n`);
  const producerSuccessSha256 = digest(await readFile(producerSuccessPath, "utf8"));
  const manifestSha256 = digest(await readFile(manifestPath, "utf8"));
  const sealPath = path.join(runDirectory, CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME);
  await writeFile(sealPath, `${JSON.stringify({
    artifacts: rows,
    buildId,
    componentSourceSha256,
    controlBlueprintSha256,
    evidenceReservations: [],
    expectedArtifactsSha256,
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    manifestSha256,
    markerIdentities,
    markerIdentitiesSha256,
    origin,
    producerReportSha256: playwrightReportSha256,
    producerSuccessSha256,
    runId: exhaustiveRunId,
    runtimeRunId,
    sealedAt: new Date().toISOString(),
    sourceSnapshotSha256,
    status: "sealed"
  })}\n`);
  const expectedSealSha256 = digest(await readFile(sealPath, "utf8"));
  const options = {
    buildId,
    expectedArtifactsSha256,
    expectedPlaywrightReportSha256: playwrightReportSha256,
    expectedProducerSuccessSha256: producerSuccessSha256,
    expectedSealSha256,
    exhaustiveRunId,
    frozenSourceSnapshotSha256: sourceSnapshotSha256,
    ledgerRoot,
    origin,
    runtimeRunId
  };
  await assert.rejects(
    () => verifyExhaustiveTerminalSeal(options),
    /evidenceChunkMerkleRootSha256|artifact byte identities.*exact schema/i,
    "a metadata-only artifact list must never pass as streamed exhaustive evidence"
  );
});

test("exhaustive terminal byte identities enumerate each stream manifest and chunk", () => {
  const chunks = [
    {
      fileName: "ca-signature-evidence-fixture-000000000001.evidence-000001.frame",
      framedBytes: 101,
      recordCount: 3,
      recordMerkleRootSha256: "1".repeat(64),
      sha256: "2".repeat(64)
    },
    {
      fileName: "ca-signature-evidence-fixture-000000000001.evidence-000002.frame",
      framedBytes: 203,
      recordCount: 5,
      recordMerkleRootSha256: "3".repeat(64),
      sha256: "4".repeat(64)
    }
  ];
  const row = {
    artifactId: "ca-signature-artifact-fixture-000000000001",
    evidenceChunkMerkleRootSha256: californiaSignatureEvidenceMerkleRootSha256(
      chunks.map((chunk) => chunk.sha256)
    ),
    evidenceChunks: chunks,
    evidenceFramedBytes: 304,
    evidenceManifestSha256: "5".repeat(64),
    evidenceRecordCount: 8,
    evidenceStreamOwnershipSha256: "7".repeat(64),
    executionGroupOwnership: {
      cropCount: 8,
      expectedRecordCount: 8,
      groupKeys: ["desktop-chrome\0FixtureBench\0desktop-fixture-axis\0layout"],
      planSha256: "8".repeat(64),
      receiptCount: 8,
      schemaVersion: 1 as const,
      sourceIdentitySha256: "9".repeat(64),
      sourceSnapshotSha256: "a".repeat(64)
    },
    fileName: `fixture${CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX}`,
    sha256: "6".repeat(64)
  };
  assert.deepEqual(validateCaliforniaExhaustiveArtifactByteIdentities(
    [row],
    "stream binding fixture"
  ), [row]);
  assert.throws(() => validateCaliforniaExhaustiveArtifactByteIdentities(
    [{ ...row, evidenceChunks: chunks.slice(0, 1) }],
    "missing chunk fixture"
  ), /chunk bytes|chunk records|Merkle root/);
  assert.throws(() => validateCaliforniaExhaustiveArtifactByteIdentities(
    [{ ...row, evidenceChunks: [...chunks, chunks[0]] }],
    "duplicate chunk fixture"
  ), /repeat/i);
  for (const field of ["evidenceFramedBytes", "evidenceRecordCount"] as const) {
    assert.throws(() => validateCaliforniaExhaustiveArtifactByteIdentities(
      [{ ...row, [field]: String(row[field]) }],
      `numeric string ${field} fixture`
    ), new RegExp(`${field} is invalid`),
    `${field} must be an exact number and must never be coerced from a string`);
  }
});

test("discovery is hard-red with one exact candidate and formal rejects UNREVIEWED", () => {
  const unreviewed = {
    blueprintSha256: "a".repeat(64),
    keyCount: 0,
    keysSha256: "UNREVIEWED",
    schemaVersion: 6
  };
  assert.doesNotThrow(() => assertDiscoverySnapshotUnreviewed(unreviewed));
  assert.throws(() => assertFormalReviewedSnapshot(unreviewed), /UNREVIEWED/);
  const candidate = {
    blueprintSha256: "a".repeat(64),
    keyCount: 12345,
    keysSha256: "b".repeat(64),
    schemaVersion: 6
  };
  const parsed = parseDiscoveryCandidate(
    `California signature exhaustive runtime snapshot is UNREVIEWED; discovery candidate=${JSON.stringify(candidate)}`
  );
  assert.deepEqual(parsed, candidate);
  const red = new CaliforniaDiscoveryRedError(candidate);
  assert.equal(red.exitCode, CALIFORNIA_ACCEPTANCE_DISCOVERY_EXIT_CODE);
  assert.match(red.message, /intentionally red/);
  assert.throws(() => parseDiscoveryCandidate(
    `discovery candidate=${JSON.stringify(candidate)}\n` +
    `discovery candidate=${JSON.stringify({ ...candidate, keyCount: candidate.keyCount + 1 })}`
  ), /mixed candidate/);
  assert.throws(() => assertDiscoverySnapshotUnreviewed(candidate), /only valid.*UNREVIEWED/);
});

test("generated inventory rejects unknown, partial, failure, skip, retry, flaky, and temp artifacts", () => {
  assert.doesNotThrow(() => validateGeneratedArtifactNames([
    "layer-a/logs/build.stdout.log",
    "layer-b/broad-ledger/run/item.coverage.passed.json"
  ]));
  for (const candidate of [
    "layer/failure.json",
    "layer/item.partial.json",
    "layer/item.skip.json",
    "layer/item.retry-1.json",
    "layer/item.flaky.json",
    "layer/item.tmp"
  ]) assert.throws(() => validateGeneratedArtifactNames([candidate]), /forbidden/);
  assert.throws(() => assertKnownTopLevelInventory(["rogue/file.json"]), /unknown top-level/);
});

test("final manifest rejects premature and mixed-source seals", () => {
  const source = "a".repeat(64);
  const finalInventory = syntheticFinalInventory();
  const broad = terminalReceipt({
    fileName: ".broad-seal.json",
    frozenSourceSnapshotSha256: source,
    playwrightReportSha256: "2".repeat(64),
    producerSuccessSha256: "3".repeat(64),
    sha: "b".repeat(64),
    sourceHash: "c".repeat(64),
    sourceSnapshotSha256: source
  });
  const exhaustive = terminalReceipt({
    artifactCount: 102,
    fileName: ".exhaustive-seal.json",
    frozenSourceSnapshotSha256: source,
    playwrightReportSha256: "4".repeat(64),
    producerSuccessSha256: "5".repeat(64),
    sha: "d".repeat(64),
    sourceHash: "e".repeat(64),
    sourceSnapshotSha256: source,
    streamBindings: finalInventory.exhaustiveStreamBindings
  });
  const base = {
    acceptanceRunId: highEntropy("accept"),
    broad,
    broadReportSha256: broad.playwrightReportSha256,
    buildId: highEntropy("build"),
    exhaustive,
    exhaustiveReportSha256: exhaustive.playwrightReportSha256,
    inventoryRows: finalInventory.inventoryRows,
    layerASealSha256: "1".repeat(64),
    matrixRunId: highEntropy("matrix"),
    sourceManifestSha256: finalInventory.terminalFiles.find((binding) =>
      binding.role === "source-manifest")!.sha256,
    sourceSnapshotSha256: source,
    terminalFiles: finalInventory.terminalFiles
  };
  const built = buildFinalAcceptanceManifest(base);
  assert.equal(built.sourceManifestSha256, base.sourceManifestSha256);
  assert.throws(() => buildFinalAcceptanceManifest({ ...base, broad: null }), /requires a broad/);
  assert.throws(() => buildFinalAcceptanceManifest({ ...base, exhaustive: null }), /requires an exhaustive/);
  assert.throws(() => buildFinalAcceptanceManifest({
    ...base,
    broad: { ...broad, frozenSourceSnapshotSha256: "9".repeat(64) }
  }), /mixed frozen source/);
  assert.throws(() => buildFinalAcceptanceManifest({
    ...base,
    broad: { ...broad, sourceSnapshotSha256: "9".repeat(64) }
  }), /broad ledger provenance.*mixed frozen source/);
  assert.throws(() => buildFinalAcceptanceManifest({
    ...base,
    broadReportSha256: "8".repeat(64)
  }), /broad terminal receipt.*mixed Playwright report/);
  assert.throws(() => buildFinalAcceptanceManifest({
    ...base,
    sourceManifestSha256: "not-a-sha"
  }), /source manifest/i);
});

test("terminal publication is exclusive, durable, duplicate-proof, and forged-manifest fail-closed", async () => {
  const root = path.join(pureRoot, "terminal-success");
  await mkdir(root);
  const layout = buildRunLayout(root);
  const finalInventory = await materializeFinalInventory(root);
  const source = finalInventory.sourceSnapshotSha256;
  const terminalSha = (role: CaliforniaTerminalFileBinding["role"]) =>
    finalInventory.terminalFiles.find((binding) => binding.role === role)!.sha256;
  const broad = terminalReceipt({
    fileName: ".broad-seal.json",
    frozenSourceSnapshotSha256: source,
    playwrightReportSha256: terminalSha("broad-report"),
    producerSuccessSha256: terminalSha("broad-producer-success"),
    sha: terminalSha("broad-seal"),
    sourceHash: "c".repeat(64),
    sourceSnapshotSha256: source
  });
  const exhaustive = terminalReceipt({
    artifactCount: 102,
    fileName: ".exhaustive-seal.json",
    frozenSourceSnapshotSha256: source,
    playwrightReportSha256: terminalSha("exhaustive-report"),
    producerSuccessSha256: terminalSha("exhaustive-producer-success"),
    sha: terminalSha("exhaustive-seal"),
    sourceHash: "e".repeat(64),
    sourceSnapshotSha256: source,
    streamBindings: finalInventory.exhaustiveStreamBindings
  });
  const manifest = buildFinalAcceptanceManifest({
    acceptanceRunId: finalInventory.acceptanceRunId,
    broad,
    broadReportSha256: broad.playwrightReportSha256,
    buildId: finalInventory.buildId,
    exhaustive,
    exhaustiveReportSha256: exhaustive.playwrightReportSha256,
    inventoryRows: finalInventory.inventoryRows,
    layerASealSha256: terminalSha("layer-a-seal"),
    matrixRunId: highEntropy("matrix"),
    sourceManifestSha256: finalInventory.sourceManifestSha256,
    sourceSnapshotSha256: source,
    terminalFiles: finalInventory.terminalFiles
  });
  const published = await publishFinalSeal({ layout, manifest });
  assert.match(published.sha256, /^[a-f0-9]{64}$/);
  const reread = await verifyPublishedFinalSeal({
    manifestPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME),
    sealPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME),
    sealReceipt: published
  });
  assert.equal(reread.sealSha256, published.sha256);
  const firstStream = finalInventory.exhaustiveStreamBindings[0]!;
  const firstChunk = firstStream.evidenceChunks[0]!;
  const exhaustiveRunRoot = path.join(
    root,
    "layer-b",
    "exhaustive-ledger",
    "synthetic-exhaustive-run"
  );
  const firstChunkPath = path.join(exhaustiveRunRoot, firstChunk.fileName);
  const exactChunkBytes = await readFile(firstChunkPath);
  const mutatedChunkBytes = Buffer.from(exactChunkBytes);
  mutatedChunkBytes[0] ^= 0x01;
  await writeFile(firstChunkPath, mutatedChunkBytes);
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME),
    sealPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME),
    sealReceipt: published
  }), /inventory|stream|chunk/i,
  "final acceptance must reject a mutation to any enumerated evidence chunk");
  await writeFile(firstChunkPath, exactChunkBytes);
  const lateExtraChunk = path.join(exhaustiveRunRoot, "late-extra-evidence.frame");
  await writeFile(lateExtraChunk, "late extra\n");
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME),
    sealPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME),
    sealReceipt: published
  }), /inventory|manifest\/chunk/i,
  "final acceptance must reject one late unenumerated evidence chunk");
  await rm(lateExtraChunk);
  const lateRogue = path.join(root, "layer-a", "evidence", "late-rogue.json");
  await writeFile(lateRogue, "{}\n");
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME),
    sealPath: path.join(root, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME),
    sealReceipt: published
  }), /canonical inventory drifted/);
  await rm(lateRogue);
  await assert.rejects(() => publishFinalSeal({ layout, manifest }),
    /EEXIST|exist|canonical inventory drifted/i);

  const exclusive = path.join(root, "exclusive.json");
  await writeExclusiveJson(exclusive, { stable: true });
  await assert.rejects(() => writeExclusiveJson(exclusive, { stable: false }), /EEXIST|exist/i);

  const forgedRoot = path.join(pureRoot, "terminal-forged");
  await mkdir(forgedRoot);
  const forgedManifestPath = path.join(forgedRoot, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME);
  const forgedSealPath = path.join(forgedRoot, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME);
  await writeFile(forgedManifestPath, `${JSON.stringify(manifest)}\n`);
  await writeFile(forgedSealPath, `${JSON.stringify({
    acceptanceRunId: manifest.acceptanceRunId,
    broadReportSha256: manifest.broadReportSha256,
    broadSealSha256: broad.sha256,
    buildId: manifest.buildId,
    exhaustiveSealSha256: exhaustive.sha256,
    exhaustiveReportSha256: manifest.exhaustiveReportSha256,
    inventoryEntryCount: manifest.inventoryEntryCount + 2,
    inventorySha256: manifest.inventorySha256,
    layerASealSha256: manifest.layerASealSha256,
    manifestFileName: CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
    manifestSha256: "0".repeat(64),
    matrixRunId: manifest.matrixRunId,
    schemaVersion: 1,
    sealedAt: new Date().toISOString(),
    sourceManifestSha256: manifest.sourceManifestSha256,
    sourceSnapshotSha256: manifest.sourceSnapshotSha256,
    status: "sealed",
    terminalFilesSha256: manifest.terminalFilesSha256
  })}\n`);
  const forgedSealReceipt = {
    fileName: CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
    sha256: digest(await readFile(forgedSealPath))
  };
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: forgedManifestPath,
    sealPath: forgedSealPath,
    sealReceipt: forgedSealReceipt
  }), /does not bind exact manifest/);

  const mixedRoot = path.join(pureRoot, "terminal-mixed-report");
  await mkdir(mixedRoot);
  const mixedManifest = { ...manifest, broadReportSha256: "9".repeat(64) };
  const mixedManifestPath = path.join(mixedRoot, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME);
  const mixedSealPath = path.join(mixedRoot, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME);
  await writeFile(mixedManifestPath, `${JSON.stringify(mixedManifest)}\n`);
  const mixedManifestSha256 = digest(await readFile(mixedManifestPath, "utf8"));
  await writeFile(mixedSealPath, `${JSON.stringify({
    acceptanceRunId: mixedManifest.acceptanceRunId,
    broadReportSha256: mixedManifest.broadReportSha256,
    broadSealSha256: broad.sha256,
    buildId: mixedManifest.buildId,
    exhaustiveReportSha256: mixedManifest.exhaustiveReportSha256,
    exhaustiveSealSha256: exhaustive.sha256,
    inventoryEntryCount: mixedManifest.inventoryEntryCount + 2,
    inventorySha256: mixedManifest.inventorySha256,
    layerASealSha256: mixedManifest.layerASealSha256,
    manifestFileName: CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
    manifestSha256: mixedManifestSha256,
    matrixRunId: mixedManifest.matrixRunId,
    schemaVersion: 1,
    sealedAt: new Date().toISOString(),
    sourceManifestSha256: mixedManifest.sourceManifestSha256,
    sourceSnapshotSha256: mixedManifest.sourceSnapshotSha256,
    status: "sealed",
    terminalFilesSha256: mixedManifest.terminalFilesSha256
  })}\n`);
  const mixedSealReceipt = {
    fileName: CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
    sha256: digest(await readFile(mixedSealPath))
  };
  const executionOwnershipBinding = finalInventory.terminalFiles.find((binding) =>
    binding.role === "exhaustive-execution-group-ownership")!;
  const materializeExecutionOwnership = async (targetRoot: string) => {
    const target = path.join(targetRoot, executionOwnershipBinding.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      await readFile(path.join(root, executionOwnershipBinding.relativePath))
    );
  };
  await materializeExecutionOwnership(mixedRoot);
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: mixedManifestPath,
    sealPath: mixedSealPath,
    sealReceipt: mixedSealReceipt
  }), /does not bind the broad Playwright report receipt/);

  const invalidStatusRoot = path.join(pureRoot, "terminal-invalid-manifest-status");
  await mkdir(invalidStatusRoot);
  const invalidStatusManifest = { ...manifest, status: "forged-ready" };
  const invalidStatusManifestPath = path.join(invalidStatusRoot, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME);
  const invalidStatusSealPath = path.join(invalidStatusRoot, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME);
  await writeFile(invalidStatusManifestPath, `${JSON.stringify(invalidStatusManifest)}\n`);
  const invalidStatusManifestSha256 = digest(await readFile(invalidStatusManifestPath));
  await writeFile(invalidStatusSealPath, `${JSON.stringify({
    acceptanceRunId: invalidStatusManifest.acceptanceRunId,
    broadReportSha256: invalidStatusManifest.broadReportSha256,
    broadSealSha256: invalidStatusManifest.broadSeal.sha256,
    buildId: invalidStatusManifest.buildId,
    exhaustiveReportSha256: invalidStatusManifest.exhaustiveReportSha256,
    exhaustiveSealSha256: invalidStatusManifest.exhaustiveSeal.sha256,
    inventoryEntryCount: invalidStatusManifest.inventoryEntryCount + 2,
    inventorySha256: invalidStatusManifest.inventorySha256,
    layerASealSha256: invalidStatusManifest.layerASealSha256,
    manifestFileName: CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
    manifestSha256: invalidStatusManifestSha256,
    matrixRunId: invalidStatusManifest.matrixRunId,
    schemaVersion: 1,
    sealedAt: new Date().toISOString(),
    sourceManifestSha256: invalidStatusManifest.sourceManifestSha256,
    sourceSnapshotSha256: invalidStatusManifest.sourceSnapshotSha256,
    status: "sealed",
    terminalFilesSha256: invalidStatusManifest.terminalFilesSha256
  })}\n`);
  const invalidStatusSealSha256 = digest(await readFile(invalidStatusSealPath));
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: invalidStatusManifestPath,
    sealPath: invalidStatusSealPath,
    sealReceipt: {
      fileName: CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
      sha256: invalidStatusSealSha256
    }
  }), /final acceptance manifest status/i);

  const mixedSealReceiptRoot = path.join(pureRoot, "terminal-mixed-seal-receipt");
  await mkdir(mixedSealReceiptRoot);
  const mixedSealReceiptManifestPath = path.join(
    mixedSealReceiptRoot,
    CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME
  );
  const mixedSealReceiptSealPath = path.join(mixedSealReceiptRoot, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME);
  await writeFile(mixedSealReceiptManifestPath, `${JSON.stringify(manifest)}\n`);
  const mixedSealReceiptManifestSha256 = digest(await readFile(mixedSealReceiptManifestPath));
  await writeFile(mixedSealReceiptSealPath, `${JSON.stringify({
    acceptanceRunId: manifest.acceptanceRunId,
    broadReportSha256: manifest.broadReportSha256,
    broadSealSha256: "9".repeat(64),
    buildId: manifest.buildId,
    exhaustiveReportSha256: manifest.exhaustiveReportSha256,
    exhaustiveSealSha256: manifest.exhaustiveSeal.sha256,
    inventoryEntryCount: manifest.inventoryEntryCount + 2,
    inventorySha256: manifest.inventorySha256,
    layerASealSha256: manifest.layerASealSha256,
    manifestFileName: CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
    manifestSha256: mixedSealReceiptManifestSha256,
    matrixRunId: manifest.matrixRunId,
    schemaVersion: 1,
    sealedAt: new Date().toISOString(),
    sourceManifestSha256: manifest.sourceManifestSha256,
    sourceSnapshotSha256: manifest.sourceSnapshotSha256,
    status: "sealed",
    terminalFilesSha256: manifest.terminalFilesSha256
  })}\n`);
  const mixedSealReceiptSealSha256 = digest(await readFile(mixedSealReceiptSealPath));
  await materializeExecutionOwnership(mixedSealReceiptRoot);
  await assert.rejects(() => verifyPublishedFinalSeal({
    manifestPath: mixedSealReceiptManifestPath,
    sealPath: mixedSealReceiptSealPath,
    sealReceipt: {
      fileName: CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
      sha256: mixedSealReceiptSealSha256
    }
  }), /broad.*seal.*receipt/i);
});

test("concurrent final publishers yield one verified winner with no lock or pending residue", async () => {
  const root = path.join(pureRoot, "terminal-concurrent");
  await mkdir(root);
  const layout = buildRunLayout(root);
  const materialized = await materializeFinalInventory(root);
  const terminalSha = (role: CaliforniaTerminalFileBinding["role"]) =>
    materialized.terminalFiles.find((binding) => binding.role === role)!.sha256;
  const broad = terminalReceipt({
    fileName: ".broad-seal.json",
    frozenSourceSnapshotSha256: materialized.sourceSnapshotSha256,
    playwrightReportSha256: terminalSha("broad-report"),
    producerSuccessSha256: terminalSha("broad-producer-success"),
    sha: terminalSha("broad-seal"),
    sourceHash: "a".repeat(64),
    sourceSnapshotSha256: materialized.sourceSnapshotSha256
  });
  const exhaustive = terminalReceipt({
    artifactCount: 102,
    fileName: ".exhaustive-seal.json",
    frozenSourceSnapshotSha256: materialized.sourceSnapshotSha256,
    playwrightReportSha256: terminalSha("exhaustive-report"),
    producerSuccessSha256: terminalSha("exhaustive-producer-success"),
    sha: terminalSha("exhaustive-seal"),
    sourceHash: "b".repeat(64),
    sourceSnapshotSha256: materialized.sourceSnapshotSha256,
    streamBindings: materialized.exhaustiveStreamBindings
  });
  const manifest = buildFinalAcceptanceManifest({
    acceptanceRunId: materialized.acceptanceRunId,
    broad,
    broadReportSha256: broad.playwrightReportSha256,
    buildId: materialized.buildId,
    exhaustive,
    exhaustiveReportSha256: exhaustive.playwrightReportSha256,
    inventoryRows: materialized.inventoryRows,
    layerASealSha256: terminalSha("layer-a-seal"),
    matrixRunId: highEntropy("matrix"),
    sourceManifestSha256: materialized.sourceManifestSha256,
    sourceSnapshotSha256: materialized.sourceSnapshotSha256,
    terminalFiles: materialized.terminalFiles
  });
  const outcomes = await Promise.allSettled([
    publishFinalSeal({ layout, manifest }),
    publishFinalSeal({ layout, manifest })
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
  const winner = outcomes.find((outcome) => outcome.status === "fulfilled");
  assert.ok(winner && winner.status === "fulfilled");
  await verifyPublishedFinalSeal({
    manifestPath: layout.finalManifestPath,
    sealPath: layout.finalSealPath,
    sealReceipt: winner.value
  });
  assert.equal(await lstat(`${root}.final-publication.lock`).catch(() => null), null);
  assert.equal(await lstat(`${layout.finalManifestPath}.producer-pending.tmp`).catch(() => null), null);
  assert.equal(await lstat(`${layout.finalSealPath}.producer-pending.tmp`).catch(() => null), null);
});

test("failed pending hardlink publication cleans its exclusive pending inode", async () => {
  const root = path.join(pureRoot, "pending-link-failure");
  await mkdir(root);
  const target = path.join(root, "already-published.json");
  await writeFile(target, "{}\n");
  const module = await import("./run-california-visualization-acceptance.mts");
  const publishPending = Reflect.get(module, "writePendingHardlinkJson");
  assert.equal(typeof publishPending, "function", "runner must expose the pending publication primitive");
  await assert.rejects(() => publishPending(target, { status: "sealed" }), /EEXIST|exist/i);
  assert.equal(
    await lstat(`${target}.producer-pending.tmp`).catch(() => null),
    null,
    "failed final hardlink publication must not strand a pending inode"
  );
});

test("stable JSON and source aggregate are order deterministic but byte sensitive", () => {
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  const left = [{ mode: 0o600, path: "a", sha256: "a".repeat(64), size: 1 }];
  const right = [{ mode: 0o600, path: "a", sha256: "b".repeat(64), size: 1 }];
  assert.notEqual(sourceManifestAggregate(left), sourceManifestAggregate(right));
});
