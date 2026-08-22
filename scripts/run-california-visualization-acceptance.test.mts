import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { after, test } from "node:test";
import path from "node:path";

import {
  CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
} from "../tests/e2e/california-visualization-artifact-lifecycle";
import {
  CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
  CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME
} from "../tests/e2e/california-signature-exhaustive-artifact-lifecycle";

import {
  CALIFORNIA_ACCEPTANCE_ALL_AXES,
  CALIFORNIA_ACCEPTANCE_DISCOVERY_EXIT_CODE,
  CALIFORNIA_ACCEPTANCE_DISCOVERY_PHASE_SEQUENCE,
  CALIFORNIA_ACCEPTANCE_FORMAL_PHASE_SEQUENCE,
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
  CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
  CALIFORNIA_LAYER_A_PRODUCT_SMOKE_TIMEOUT_MS,
  CALIFORNIA_MAC_CHROMIUM_TMP_ROOT,
  CALIFORNIA_PRODUCT_SMOKE_MANIFEST_FILENAME,
  CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS,
  CALIFORNIA_TERMINAL_FILE_ROLES,
  CaliforniaDiscoveryRedError,
  assertCaliforniaAcceptancePhaseLifecycleComplete,
  assertDiscoverySnapshotUnreviewed,
  assertFormalReviewedSnapshot,
  assertFreshStarshipRunRoot,
  assertKnownTopLevelInventory,
  assertLocalOnlyCommandPlans,
  buildCaliforniaAcceptanceEnvironment,
  buildCaliforniaCommandPlans,
  buildBroadProducerLifecycleContract,
  buildFinalAcceptanceManifest,
  buildLayerAReceipt,
  buildRunLayout,
  createCaliforniaAcceptancePhaseLifecycle,
  createIndependentSourceCopies,
  inventoryCaliforniaRunRoot,
  parseCaliforniaAcceptanceCli,
  parseDiscoveryCandidate,
  parseUniqueTerminalSealReceipt,
  publishCaliforniaProductSmokeManifest,
  publishFinalSeal,
  runCaliforniaAcceptancePhase,
  runCaliforniaSignatureExhaustiveProducerUnderCapacityHold,
  restoreCaliforniaNextEnv,
  snapshotCaliforniaNextEnv,
  layerEnvironment,
  sourceManifestAggregate,
  stableJson,
  terminateExactProcessGroup,
  validateCaliforniaExhaustiveArtifactByteIdentities,
  validateGeneratedArtifactNames,
  verifyCaliforniaPlaywrightFfmpeg,
  verifyPlaywrightJsonReport,
  verifyBroadOpenRunAndReportBeforeFinalizer,
  verifyBroadTerminalSeal,
  verifyExhaustiveTerminalSeal,
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
import {
  isExpectedCanceledCaliforniaProductRscPrefetch,
  isExpectedPinnedReactThreeFiberClockDeprecation,
  type BrowserConsoleMessageSnapshot,
  type FailedBrowserRequestSnapshot
} from "../tests/e2e/california-product-smoke-browser-diagnostics";
import { resolveCaliforniaSignatureFrozenSourceRoot } from
  "../tests/e2e/california-signature-frozen-source-root";

const PURE_ROOT_PREFIX = path.join(CALIFORNIA_ACCEPTANCE_TMP_ROOT, "ca-viz-orchestrator-pure-");
const pureRoot = await mkdtemp(PURE_ROOT_PREFIX);

async function makeWritable(target: string): Promise<void> {
  const identity = await lstat(target).catch(() => null);
  if (!identity) return;
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

test("California build restores exact next-env bytes and mode after Next mutation", async () => {
  const sourceRoot = path.join(pureRoot, highEntropy("next-env-restore"));
  const target = path.join(sourceRoot, "next-env.d.ts");
  const original = "/// <reference types=\"next\" />\n";
  await mkdir(sourceRoot, { recursive: true, mode: 0o700 });
  await writeFile(target, original, { mode: 0o640 });
  const snapshot = await snapshotCaliforniaNextEnv(sourceRoot);
  await writeFile(target, "/// <reference path=\"./.ca-acceptance/next-dist/types/routes.d.ts\" />\n");
  await chmod(target, 0o600);

  await restoreCaliforniaNextEnv(snapshot);

  assert.equal(await readFile(target, "utf8"), original);
  assert.equal((await lstat(target)).mode & 0o777, 0o640);
});

test("California build refuses next-env restoration through a replaced pathname", async () => {
  const sourceRoot = path.join(pureRoot, highEntropy("next-env-identity"));
  const target = path.join(sourceRoot, "next-env.d.ts");
  const victim = path.join(sourceRoot, "victim.d.ts");
  await mkdir(sourceRoot, { recursive: true, mode: 0o700 });
  await writeFile(target, "owner next-env bytes\n");
  await writeFile(victim, "victim bytes must remain unchanged\n");
  const snapshot = await snapshotCaliforniaNextEnv(sourceRoot);
  await rm(target);
  await symlink(victim, target);

  await assert.rejects(
    () => restoreCaliforniaNextEnv(snapshot),
    /regular non-symlink|pathname identity changed/
  );
  assert.equal(await readFile(victim, "utf8"), "victim bytes must remain unchanged\n");
  assert.equal((await lstat(target)).isSymbolicLink(), true);
});

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
      disableArgument: CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
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
        disableArgument: CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
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
        disableArgument: CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
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

test("production phase protocol runs every formal/discovery phase with fake operations and cannot skip failures", async () => {
  for (const [mode, expected] of [
    ["formal", CALIFORNIA_ACCEPTANCE_FORMAL_PHASE_SEQUENCE],
    ["discovery", CALIFORNIA_ACCEPTANCE_DISCOVERY_PHASE_SEQUENCE]
  ] as const) {
    const lifecycle = createCaliforniaAcceptancePhaseLifecycle(mode);
    const observed: string[] = [];
    for (const phase of expected) {
      const result = await runCaliforniaAcceptancePhase({
        lifecycle,
        phase,
        async operation() {
          observed.push(phase);
          return `${mode}:${phase}`;
        }
      });
      assert.equal(result, `${mode}:${phase}`);
    }
    assert.deepEqual(observed, expected);
    assert.equal(lifecycle.next, null);
    assert.doesNotThrow(() => assertCaliforniaAcceptancePhaseLifecycleComplete(lifecycle));
    await assert.rejects(() => runCaliforniaAcceptancePhase({
      lifecycle,
      phase: expected[expected.length - 1]!,
      async operation() { throw new Error("must not run"); }
    }), /already completed/);
  }

  const lifecycle = createCaliforniaAcceptancePhaseLifecycle("formal");
  await assert.rejects(() => runCaliforniaAcceptancePhase({
    lifecycle,
    phase: "source-freeze-compose",
    async operation() { return undefined; }
  }), /phase order drifted/);
  assert.equal(lifecycle.next, "preflight-catalog");
  await assert.rejects(() => runCaliforniaAcceptancePhase({
    lifecycle,
    phase: "preflight-catalog",
    async operation() { throw new Error("fake preflight failure"); }
  }), /fake preflight failure/);
  assert.equal(lifecycle.next, "preflight-catalog",
    "a failed operation must not advance the production phase lifecycle");
  assert.throws(() => assertCaliforniaAcceptancePhaseLifecycleComplete(lifecycle),
    /phase sequence is incomplete/);
});

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

test("diagnostic capacity ownership launches zero exhaustive processes and the spec fails before test declaration", async () => {
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
  const failClosedIndex = specSource.indexOf(
    "assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable(executionPlan)"
  );
  const describeIndex = specSource.indexOf("test.describe.configure");
  const declarationIndex = specSource.indexOf("test(`${workPackage.packageId}");
  assert.ok(failClosedIndex >= 0 && describeIndex > failClosedIndex &&
    declarationIndex > failClosedIndex,
  "production exhaustive spec must fail closed before declaring any Playwright test");
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

test("environment closure preserves HOME variants exactly and rejects injection or paths outside the run root", () => {
  const runRoot = path.join(pureRoot, "env-run");
  const writableRoot = path.join(runRoot, "layer", "writable");
  const base = {
    CODEX_HOME: "/sentinel/codex",
    HOME: "/sentinel/home",
    MAC_CHROMIUM_TMPDIR: "/var/folders/stale-chromium-temp",
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
  assert.equal(env.MAC_CHROMIUM_TMPDIR, CALIFORNIA_MAC_CHROMIUM_TMP_ROOT);
  assert.ok(env.MAC_CHROMIUM_TMPDIR.startsWith("/Volumes/Starship/"));
  assert.ok(env.NODE_COMPILE_CACHE!.startsWith(runRoot));
  assert.equal(
    env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(runRoot, "preflight", "writable", "playwright-browsers")
  );
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
  assert.equal(
    result.status,
    0,
    [result.stderr, result.stdout].filter(Boolean).join("\n")
  );
  assert.match(result.stdout, /Total: 2 tests in 1 file/);

  const configProbe = spawnSync(process.execPath, [
    "--import",
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/tsx/dist/loader.mjs"),
    "--input-type=module",
    "-e",
    [
      `import config from ${JSON.stringify(path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "playwright.config.ts"))};`,
      "const resolved = config.default ?? config;",
      "console.log(JSON.stringify(resolved.use?.launchOptions?.args ?? null));"
    ].join("\n")
  ], {
    cwd: layout.layerASourceRoot,
    encoding: "utf8",
    env,
    shell: false
  });
  assert.equal(configProbe.status, 0, configProbe.stderr);
  assert.equal(
    configProbe.stdout.trim(),
    JSON.stringify([
      CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
      `--breakpad-dump-location=${env.PLAYWRIGHT_CRASHPAD_DIR}`
    ])
  );

  await mkdir(env.TMPDIR!, { recursive: true, mode: 0o700 });
  await mkdir(env.PLAYWRIGHT_CRASHPAD_DIR!, { recursive: true, mode: 0o700 });
  const deviceProbe = spawnSync(process.execPath, [
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "node_modules/@playwright/test/cli.js"),
    "test",
    "tests/e2e/california-playwright-project-device-contract.spec.ts",
    "--project=desktop-chrome",
    "--project=mobile-chrome",
    "--workers=1",
    "--retries=0",
    "--repeat-each=1",
    "--reporter=line",
    "--config",
    path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, "playwright.config.ts")
  ], {
    cwd: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    encoding: "utf8",
    env: {
      ...env,
      PLAYWRIGHT_SKIP_WEBSERVER: "1"
    },
    shell: false,
    timeout: 120_000
  });
  assert.equal(
    deviceProbe.status,
    0,
    [deviceProbe.stderr, deviceProbe.stdout].filter(Boolean).join("\n")
  );
  assert.match(deviceProbe.stdout, /2 passed/);

  const productSmokeSource = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "tests/e2e/california-visualization-product-smoke.spec.ts"
  ), "utf8");
  assert.match(productSmokeSource,
    /assert\.deepEqual\(launchArgs, \[\s*DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,\s*`--breakpad-dump-location=\$\{crashpadDir\}`\s*\]/);
  assert.match(productSmokeSource,
    /disableArgument: DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT/);
});

test("Layer A ignores only exact canceled 200 rendered California product RSC prefetches", () => {
  const labId = "us-ca-math-k-k-cc-count-sequence";
  const expected: FailedBrowserRequestSnapshot = {
    failureText: "net::ERR_ABORTED",
    isNavigationRequest: false,
    method: "GET",
    pageUrl: `http://127.0.0.1:43116/student/tools/visualizations?grade=K&lab=${labId}`,
    requestHeaders: {
      "next-url": "/student/tools/visualizations",
      rsc: "1",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors"
    },
    requestUrl: `http://127.0.0.1:43116/student/lessons/${labId}?_rsc=route-cache-key`,
    resourceType: "fetch",
    responseContentType: "text/x-component; charset=utf-8",
    responseStatus: 200,
    studentLessonHref: `/student/lessons/${labId}`,
    visualizationDirectoryHref: "/student/tools/visualizations"
  };
  assert.equal(isExpectedCanceledCaliforniaProductRscPrefetch(expected), true);

  const directExpected: FailedBrowserRequestSnapshot = {
    ...expected,
    pageUrl: "http://127.0.0.1:43116/student/tools/visualizations/us-ca-math-s2-chapter-02?grade=S2&track=all",
    requestHeaders: {
      ...expected.requestHeaders,
      "next-url": "/student/tools/visualizations/us-ca-math-s2-chapter-02"
    },
    requestUrl: "http://127.0.0.1:43116/student/lessons/us-ca-math-s2-chapter-01?_rsc=route-cache-key",
    studentLessonHref: "/student/lessons/us-ca-math-s2-chapter-01"
  };
  assert.equal(isExpectedCanceledCaliforniaProductRscPrefetch(directExpected), true);

  const directDirectoryExpected: FailedBrowserRequestSnapshot = {
    ...directExpected,
    requestUrl: "http://127.0.0.1:43116/student/tools/visualizations?_rsc=route-cache-key"
  };
  assert.equal(isExpectedCanceledCaliforniaProductRscPrefetch(directDirectoryExpected), true);

  const rejected: FailedBrowserRequestSnapshot[] = [
    { ...expected, failureText: "net::ERR_FAILED" },
    { ...expected, isNavigationRequest: true },
    { ...expected, method: "POST" },
    { ...expected, requestUrl: `http://127.0.0.1:43116/student/lessons/${labId}` },
    { ...expected, requestUrl: "http://127.0.0.1:43116/api/me?_rsc=route-cache-key" },
    { ...expected, requestHeaders: { ...expected.requestHeaders, rsc: "0" } },
    { ...expected, resourceType: "document" },
    { ...expected, responseContentType: "text/html" },
    { ...expected, responseStatus: 500 },
    {
      ...directExpected,
      pageUrl: "http://127.0.0.1:43116/student/tools/visualizations/pep-high-chapter-02?grade=S2&track=all",
      requestHeaders: {
        ...directExpected.requestHeaders,
        "next-url": "/student/tools/visualizations/pep-high-chapter-02"
      }
    },
    {
      ...directExpected,
      requestHeaders: {
        ...directExpected.requestHeaders,
        "next-url": "/student/tools/visualizations"
      }
    },
    { ...directDirectoryExpected, visualizationDirectoryHref: null },
    {
      ...directDirectoryExpected,
      visualizationDirectoryHref: "/student/tools/visualizations?grade=S2"
    },
    {
      ...directDirectoryExpected,
      requestUrl: "http://127.0.0.1:43116/student/tools/visualizations?_rsc=route-cache-key&grade=S2"
    },
    {
      ...directDirectoryExpected,
      pageUrl: "http://127.0.0.1:43116/student/tools/visualizations?grade=S2&lab=us-ca-math-s2-chapter-02",
      requestHeaders: {
        ...directDirectoryExpected.requestHeaders,
        "next-url": "/student/tools/visualizations"
      }
    },
    {
      ...expected,
      pageUrl: "http://127.0.0.1:43116/student/tools/visualizations?grade=P1&lab=us-ca-math-p1-1-h1-picture-join-stories-to-10",
      studentLessonHref: null
    }
  ];
  for (const snapshot of rejected) {
    assert.equal(isExpectedCanceledCaliforniaProductRscPrefetch(snapshot), false);
  }

  assert.equal(isExpectedCanceledCaliforniaProductRscPrefetch({
    ...expected,
    pageUrl: "http://127.0.0.1:43116/student/tools/visualizations?grade=P1&lab=us-ca-math-p1-1-h1-picture-join-stories-to-10",
    requestUrl: "http://127.0.0.1:43116/student/lessons/us-ca-math-p1-1-oa-add-subtract?_rsc=route-cache-key",
    studentLessonHref: "/student/lessons/us-ca-math-p1-1-oa-add-subtract"
  }), true);
});

test("Layer A ignores only the pinned React Three Fiber Clock deprecation warning", () => {
  const expected: BrowserConsoleMessageSnapshot = {
    locationUrl: "http://127.0.0.1:43116/_next/static/chunks/2a79d406.c249ab09f9c5e9f7.js",
    messageType: "warning",
    pageUrl: "http://127.0.0.1:43116/student/tools/visualizations/us-ca-math-s2-chapter-02?grade=S2&track=all",
    reactThreeFiberVersion: "9.6.1",
    text: "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.",
    threeVersion: "0.184.0"
  };
  assert.equal(isExpectedPinnedReactThreeFiberClockDeprecation(expected), true);

  const rejected: BrowserConsoleMessageSnapshot[] = [
    { ...expected, messageType: "error" },
    { ...expected, text: `${expected.text} unexpected` },
    { ...expected, reactThreeFiberVersion: "9.6.2" },
    { ...expected, threeVersion: "0.185.0" },
    { ...expected, locationUrl: "http://127.0.0.1:43116/app/client.js" },
    { ...expected, locationUrl: "http://example.test/_next/static/chunks/2a79d406.js" },
    { ...expected, locationUrl: "" }
  ];
  for (const snapshot of rejected) {
    assert.equal(isExpectedPinnedReactThreeFiberClockDeprecation(snapshot), false);
  }
});

test("Layer A prebinds exact learner navigation entries before browser diagnostics", async () => {
  const source = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "tests/e2e/california-visualization-product-smoke.spec.ts"
  ), "utf8");
  const authenticatedStart = source.indexOf("async function expectCurrentCaliforniaStudent(");
  const authenticatedEnd = source.indexOf("async function registerCaliforniaStudent(", authenticatedStart);
  assert.notEqual(authenticatedStart, -1);
  assert.notEqual(authenticatedEnd, -1);
  const authenticatedSlice = source.slice(authenticatedStart, authenticatedEnd);
  assert.match(authenticatedSlice, /request\.get\("\/api\/me"\)/);
  assert.doesNotMatch(authenticatedSlice, /includeLessonEntry=false/);
  assert.match(authenticatedSlice, /lessonEntryTarget: \{ grade: student\.grade \}/);
  assert.match(authenticatedSlice, /return href;/);

  const routeSelectionStart = source.indexOf("const selectStudentForRoute = async");
  const routeSelectionEnd = source.indexOf(
    "for (const route of californiaVisualizationProductSmokeManifest.directoryRoutes)",
    routeSelectionStart
  );
  assert.notEqual(routeSelectionStart, -1);
  assert.notEqual(routeSelectionEnd, -1);
  const routeSelectionSlice = source.slice(routeSelectionStart, routeSelectionEnd);
  const loginIndex = routeSelectionSlice.indexOf(
    "const expectedStudentLessonHref = await loginCaliforniaStudentForGrade"
  );
  const newPageIndex = routeSelectionSlice.indexOf("const nextPage = await context.newPage()");
  const prebindIndex = routeSelectionSlice.indexOf(
    "diagnostics.expectedStudentLessonHrefByPage.set(nextPage, expectedStudentLessonHref)"
  );
  const directoryPrebindIndex = routeSelectionSlice.indexOf(
    "diagnostics.expectedVisualizationDirectoryHrefByPage.set(nextPage, VISUALIZATION_DIRECTORY_HREF)"
  );
  const diagnosticsIndex = routeSelectionSlice.indexOf("collectBrowserDiagnostics(nextPage, diagnostics)");
  assert.ok(loginIndex >= 0 && loginIndex < newPageIndex);
  assert.ok(newPageIndex < prebindIndex && prebindIndex < directoryPrebindIndex);
  assert.ok(directoryPrebindIndex < diagnosticsIndex);
});

test("Layer A premium readiness preserves the exact audited 2D exception and the default WebGL contract", async () => {
  const source = await readFile(path.join(
    CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    "tests/e2e/california-visualization-product-smoke.spec.ts"
  ), "utf8");
  const readinessStart = source.indexOf("async function expectPremiumLabProductReady(");
  const readinessEnd = source.indexOf(
    "async function assertLoadedProductionBuildIsUninstrumented(",
    readinessStart
  );
  assert.notEqual(readinessStart, -1);
  assert.notEqual(readinessEnd, -1);
  const readiness = source.slice(readinessStart, readinessEnd);
  const auditedPredicateIndex = readiness.indexOf("usesAuditedTwoDimensionalValueRenderer({");
  const auditedBranchIndex = readiness.indexOf("if (usesAuditedTwoDimensionalSurface)");
  const webGlSurfaceIndex = readiness.indexOf(
    `panel.locator('[data-viz-surface][data-viz-canvas-ready="true"]')`
  );
  assert.ok(auditedPredicateIndex >= 0 && auditedPredicateIndex < auditedBranchIndex);
  assert.ok(auditedBranchIndex < webGlSurfaceIndex);
  assert.match(readiness, /svg\[data-viz-surface\]\[role="img"\]/);
  assert.match(readiness, /data-viz-three-progressive-surface/);
  assert.match(readiness, /data-viz-mode-index="1"/);
  assert.match(readiness, /data-viz-reset-model/);
  assert.match(readiness, /data-viz-active-mode", "0"/);
  assert.match(readiness, /data-viz-manim-presentation", "learner"/);
  assert.match(readiness, /data-viz-manim-playback-state", "paused"/);
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
    CA_SIGNATURE_FROZEN_SOURCE_ROOT: "/Volumes/Starship/ambient-must-not-win",
    CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: highEntropy("runtime"),
    CA_SIGNATURE_EXHAUSTIVE_RUN_ID: highEntropy("exhaustive"),
    CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256: "c".repeat(64),
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
  assert.equal(layerB.CA_SIGNATURE_FROZEN_SOURCE_ROOT, layout.frozenSourceRoot);
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
  assert.equal(layerB.MAC_CHROMIUM_TMPDIR, CALIFORNIA_MAC_CHROMIUM_TMP_ROOT);
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
  assert.equal(layerA.CA_SIGNATURE_QA_STAGING_ROOT, undefined);
  assert.equal(layerA.CA_SIGNATURE_FROZEN_SOURCE_ROOT, undefined);
  assert.equal(layerA.CA_VISUALIZATION_QA_BUILD, undefined);
  assert.equal(
    layerA.PLAYWRIGHT_CRASHPAD_DIR,
    path.join(layerA.PLAYWRIGHT_E2E_ROOT!, "chrome-crashpad")
  );
  assert.equal(layerA.TMPDIR, path.join(layout.layerARoot, "runtime-temp"));
  assert.equal(layerA.MAC_CHROMIUM_TMPDIR, CALIFORNIA_MAC_CHROMIUM_TMP_ROOT);
  assert.equal(
    path.relative(layout.layerASourceRoot, layerA.TMPDIR!).startsWith(`..${path.sep}`),
    true,
    "Layer A temporary staging fixtures must be disjoint from the frozen product source root"
  );
});

test("composed Layer B source contracts resolve only the exact read-only frozen sibling", async () => {
  const runRoot = path.join(pureRoot, highEntropy("frozen-source-pair"));
  const layerBRoot = path.join(runRoot, "layer-b");
  const stagingRoot = path.join(layerBRoot, "source");
  const frozenRoot = path.join(runRoot, "frozen-source");
  await mkdir(stagingRoot, { recursive: true, mode: 0o700 });
  await mkdir(frozenRoot, { recursive: true, mode: 0o700 });
  await chmod(frozenRoot, 0o555);
  const exactEnvironment = {
    CA_SIGNATURE_FROZEN_SOURCE_ROOT: frozenRoot,
    CA_SIGNATURE_QA_STAGING_ROOT: stagingRoot,
    CA_VIZ_COMPOSED_QA_BUILD: "1",
    CA_VIZ_SOURCE_SNAPSHOT_SHA256: "a".repeat(64)
  };

  assert.equal(
    resolveCaliforniaSignatureFrozenSourceRoot({ env: exactEnvironment }),
    frozenRoot
  );
  assert.throws(() => resolveCaliforniaSignatureFrozenSourceRoot({
    env: {
      ...exactEnvironment,
      CA_SIGNATURE_FROZEN_SOURCE_ROOT: path.join(runRoot, "forged-frozen-source")
    }
  }), /exact sibling of layer-b/);
  assert.throws(() => resolveCaliforniaSignatureFrozenSourceRoot({
    env: {
      ...exactEnvironment,
      CA_VIZ_SOURCE_SNAPSHOT_SHA256: "UNBOUND"
    }
  }), /SOURCE_SNAPSHOT_SHA256 must bind/);
  assert.throws(() => resolveCaliforniaSignatureFrozenSourceRoot({
    cwd: runRoot,
    env: { CA_SIGNATURE_FROZEN_SOURCE_ROOT: frozenRoot }
  }), /reserved for a composed Layer B QA build/);
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
  for (const entry of entries) {
    const identities = await Promise.all([frozen, layerA, layerB].map((directory) =>
      lstat(path.join(directory, entry.path))
    ));
    assert.equal(new Set(identities.map((identity) => `${identity.dev}:${identity.ino}`)).size, 3);
    assert.equal((await readFile(path.join(layerA, entry.path))).toString("utf8"),
      (await readFile(path.join(layerB, entry.path))).toString("utf8"));
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
  assert.deepEqual(plans.ffmpegInstall.argv, [
    process.execPath,
    entrypoints.playwrightCli,
    "install",
    "ffmpeg"
  ]);
  for (const plan of Object.values(plans)) {
    assert.equal(plan.argv[0], process.execPath);
    assert.equal(plan.argv.some((argument) => /(^|\/)npx?$/.test(argument)), false);
  }
  assert.deepEqual(CALIFORNIA_ACCEPTANCE_ALL_AXES.length, 12);
  const forged = structuredClone(plans);
  forged.productSmoke.argv.push("/usr/bin/npx");
  assert.throws(() => assertLocalOnlyCommandPlans(forged, entrypoints), /npm\/npx/);
});

test("Playwright FFmpeg verifier accepts only one executable inside the fresh Starship run root", async () => {
  const runRoot = path.join(pureRoot, highEntropy("ffmpeg-verifier"));
  const browsersRoot = path.join(runRoot, "preflight", "writable", "playwright-browsers");
  const ffmpegRoot = path.join(browsersRoot, "ffmpeg-1011");
  const executableName = process.platform === "darwin"
    ? "ffmpeg-mac"
    : process.platform === "win32"
      ? "ffmpeg-win64.exe"
      : "ffmpeg-linux";
  const executablePath = path.join(ffmpegRoot, executableName);
  await mkdir(ffmpegRoot, { recursive: true, mode: 0o700 });
  await writeFile(executablePath, "#!/bin/sh\nprintf 'ffmpeg version synthetic-california-proof\\n'\n", {
    mode: 0o700
  });
  const env = buildCaliforniaAcceptanceEnvironment({
    baseEnv: process.env,
    runRoot,
    writableRoot: path.join(runRoot, "layer-a", "source", ".ca-acceptance")
  });

  const verified = await verifyCaliforniaPlaywrightFfmpeg({ env, runRoot });

  assert.equal(verified.executablePath, executablePath);
  assert.equal(verified.revisionDirectory, "ffmpeg-1011");
  assert.equal(verified.size > 0, true);
  await mkdir(path.join(browsersRoot, "ffmpeg-9999"));
  await assert.rejects(
    () => verifyCaliforniaPlaywrightFfmpeg({ env, runRoot }),
    /exactly one revisioned FFmpeg directory/
  );
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
  assert.match(bootstrapSource, /"\/Volumes\/Starship\/\.ca-viz-tmp"/);
  assert.match(bootstrapSource, /mkdtempSync/);
  assert.match(bootstrapSource, /cleanEnvironment\.TMPDIR = bootstrapTmpRoot/);
  assert.match(bootstrapSource, /cleanEnvironment\.TMP = bootstrapTmpRoot/);
  assert.match(bootstrapSource, /cleanEnvironment\.TEMP = bootstrapTmpRoot/);
  assert.match(bootstrapSource, /rmSync\(bootstrapTmpRoot, \{ recursive: true, force: false \}\)/);
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

test("Layer A product smoke budget fits the measured two-project 76-route sweep", () => {
  assert.equal(CALIFORNIA_LAYER_A_PRODUCT_SMOKE_TIMEOUT_MS, 60 * 60_000);
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

  const forgedCrashpadPath = path.join(pureRoot, "product-smoke-forged-crashpad.json");
  await writeFile(forgedCrashpadPath, `${JSON.stringify({
    ...valid,
    crashpadContainment: {
      ...valid.crashpadContainment,
      disableArgument: "--disable-crashpad"
    }
  })}\n`);
  await assert.rejects(() => verifyProductSmokeManifest({
    acceptanceRunId,
    buildId,
    manifestPath: forgedCrashpadPath,
    sourceSnapshotSha256
  }), /testing-disable argument drifted/);
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
          disableArgument: CALIFORNIA_DISABLE_CRASHPAD_FOR_TESTING_ARGUMENT,
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
