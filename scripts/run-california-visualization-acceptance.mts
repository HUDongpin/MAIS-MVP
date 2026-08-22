#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  constants as fsConstants,
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  type BigIntStats
} from "node:fs";
import {
  chmod,
  copyFile,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rmdir,
  unlink,
  type FileHandle
} from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  instrumentCaliforniaSignatureComposedQaStaging,
  readAndAssertCaliforniaSignatureComposedMarkers,
  type CaliforniaSignatureComposedStagingResult
} from "../tests/e2e/california-signature-composed-staging";
import {
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
} from "../tests/e2e/california-canvas-graphics-instrumentation";
import {
  buildCaliforniaCanvasGraphicsSourceContract
} from "../tests/e2e/california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE
} from "../tests/e2e/california-signature-qa-instrumentation";
import {
  assertCaliforniaSignatureSourceManifestFrozen,
  buildCaliforniaSignatureSourceManifest
} from "../tests/e2e/california-signature-control-manifest";
import {
  buildCaliforniaSignatureExhaustivePackages,
  buildCaliforniaSignatureExternalEvidenceExpectations,
  californiaSignatureAxisIdsForProject,
  CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID,
  CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT,
  CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS
} from "../tests/e2e/california-signature-exhaustive-qa";
import {
  CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
  CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE,
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT,
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV,
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE,
  CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
  assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable,
  assertReviewedCaliforniaSignatureStreamingAggregate,
  buildCaliforniaSignatureArtifactRunIdentity,
  buildCaliforniaSignatureArtifactValidationContext,
  buildCaliforniaSignatureMeasuredAuthorizationRequest,
  buildCaliforniaSignatureExecutionGroupOwnershipManifest,
  buildCaliforniaSignatureExpectedArtifactMatrix,
  buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix,
  californiaSignatureArtifactValidationContextKey,
  loadCaliforniaSignatureSealedOfficialArtifacts,
  prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication,
  publishCaliforniaSignatureExhaustiveProducerSuccess,
  readCaliforniaSignatureMeasuredAuthorizationReceipt,
  readCaliforniaSignatureMeasuredAuthorizationRequest,
  readCaliforniaSignatureMeasuredAuthorizationRequestForPublication,
  validateCaliforniaSignatureStreamingAggregate,
  readCaliforniaSignatureExecutionGroupOwnershipManifest,
  verifyCaliforniaSignatureMeasuredAuthorizationForLaunch,
  verifyCaliforniaSignatureOfficialArtifactMatrix,
  type CaliforniaSignatureExecutionGroupOwnership,
  type CaliforniaSignatureExecutionGroupOwnershipManifest
} from "../tests/e2e/california-signature-exhaustive-artifact-lifecycle";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle
} from "../tests/e2e/california-signature-source-expected-provider";
import {
  buildCaliforniaSignatureReviewedFinalCompositorSourcePlan,
  type CaliforniaSignatureFinalCompositorPartitionPlan
} from "../tests/e2e/california-signature-final-compositor-capacity-plan";
import { californiaSignatureEvidenceMerkleRootSha256 } from
  "../tests/e2e/california-signature-evidence-stream";
import {
  CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
  CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
  CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
  buildCaliforniaVisualizationCoverageExpectedArtifactMatrix,
  buildCaliforniaVisualizationCoverageRunIdentity,
  publishCaliforniaVisualizationCoverageProducerSuccess
} from "../tests/e2e/california-visualization-artifact-lifecycle";
import {
  buildCaliforniaCoverageProvenance,
  buildCaliforniaQaWorkItems,
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME,
  readCaliforniaQaConfig
} from "../tests/e2e/california-visualization-qa-helpers";

export const CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION = 1;
export const CALIFORNIA_ACCEPTANCE_DISCOVERY_EXIT_CODE = 86;
export const CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT =
  "/Volumes/Starship/MAIS-ca-viz-labs-wt";
export const CALIFORNIA_ACCEPTANCE_STARSHIP_ROOT = "/Volumes/Starship";
export const CALIFORNIA_ACCEPTANCE_TMP_ROOT =
  `${CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT}/.tmp`;
export const CALIFORNIA_ACCEPTANCE_SOURCE_MANIFEST_FILENAME =
  ".california-visualization-frozen-source.json";
export const CALIFORNIA_ACCEPTANCE_LAYER_A_RECEIPT_FILENAME =
  ".california-visualization-layer-a-receipt.json";
export const CALIFORNIA_ACCEPTANCE_LAYER_A_SEAL_FILENAME =
  ".california-visualization-layer-a-seal.json";
export const CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME =
  ".california-visualization-acceptance-manifest.json";
export const CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME =
  ".california-visualization-acceptance-seal.json";
export const CALIFORNIA_ACCEPTANCE_DISCOVERY_FILENAME =
  ".california-signature-discovery-red.json";
export const CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_FILENAME =
  ".california-signature-execution-group-ownership.json";
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME =
  ".california-signature-measured-authorization-request.json";
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_PATH =
  "/Volumes/Starship/.california-signature-measured-authorization-receipts-v1/.california-signature-measured-authorization-receipt.json";
export const CALIFORNIA_PRODUCT_SMOKE_MANIFEST_FILENAME =
  ".california-visualization-product-smoke.json";
export const CALIFORNIA_PRODUCT_SMOKE_RECEIPT_SUFFIX =
  ".product-smoke.passed.json";
export const CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME =
  ".california-visualization-coverage-run.json";
export const CALIFORNIA_BROAD_RUN_SEAL_FILENAME =
  ".california-visualization-coverage-seal.json";
export const CALIFORNIA_BROAD_OFFICIAL_SUFFIX = ".coverage.passed.json";
export const CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL =
  "California Visualization broad coverage sealed";
export const CALIFORNIA_EXHAUSTIVE_RUN_MANIFEST_FILENAME =
  ".california-signature-exhaustive-run.json";
export const CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME =
  ".california-signature-exhaustive-seal.json";
export const CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX = ".signature-exhaustive.json";
export const CALIFORNIA_EXHAUSTIVE_SEAL_RECEIPT_LABEL =
  "California signature exhaustive coverage sealed";
export const CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS = [
  "desktop-chrome",
  "mobile-chrome"
] as const;
export const CALIFORNIA_PRODUCT_SMOKE_TEST_TITLE =
  "boots every canonical California lab and live premium direct route as a learner product";
export const CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES = [
  "viewport-segment contrast and explored-state settle contract canary",
  "viewport-segment contrast scope fails closed for missing, oversized, unknown, and nested roots",
  "inventory contract: 76 routes and data-derived visits, benches, and premium direct routes"
] as const;
export const CALIFORNIA_ACCEPTANCE_ALL_AXES = [
  "desktop:en:light",
  "desktop:en:dark",
  "desktop:zh:light",
  "desktop:zh:dark",
  "desktop:zh-Hans:light",
  "desktop:zh-Hans:dark",
  "mobile:en:light",
  "mobile:en:dark",
  "mobile:zh:light",
  "mobile:zh:dark",
  "mobile:zh-Hans:light",
  "mobile:zh-Hans:dark"
] as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[a-z0-9_-]{24,128}$/i;
const SAFE_BUILD_ID_PATTERN = /^[a-z0-9._:-]{24,128}$/i;
const SAFE_RUN_ROOT_NAME_PATTERN = /^[a-z0-9._-]{8,160}$/i;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_MAX_BYTES = 64 * 1024;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_PYTHON =
  "/usr/bin/python3";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_EEXIST_EXIT_CODE = 73;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FAULT_EXIT_CODE = 74;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_TRANSCRIPT_MAX_BYTES =
  4 * 1024;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_HELPER_STAGES = [
  "HELPER_ROOT_FD_BOUND",
  "REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD",
  "REQUEST_WRITTEN",
  "REQUEST_FILE_FSYNCED",
  "REQUEST_SAME_FD_READBACK_VERIFIED",
  "REQUEST_FROZEN_0400",
  "REQUEST_FROZEN_FILE_FSYNCED",
  "REQUEST_ROOT_FSYNCED",
  "REQUEST_FINAL_BINDING_VERIFIED",
  "HELPER_DURABLE"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_WRITER_SOURCE = String.raw`
import hashlib
import os
import re
import stat
import sys

LEAF = ".california-signature-measured-authorization-request.json"
MAX_BYTES = 64 * 1024
EEXIST_EXIT_CODE = 73
FAULT_EXIT_CODE = 74

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def publish(line):
    sys.stdout.write(line + "\n")
    sys.stdout.flush()

def maybe_fault(selected, expected):
    if selected == expected:
        sys.stderr.write("INJECTED_FAULT\n")
        sys.stderr.flush()
        raise SystemExit(FAULT_EXIT_CODE)

def read_exact(fd, size):
    chunks = []
    offset = 0
    while offset < size:
        chunk = os.pread(fd, min(65536, size - offset), offset)
        require(len(chunk) > 0, "same-FD readback ended early")
        chunks.append(chunk)
        offset += len(chunk)
    require(os.pread(fd, 1, size) == b"", "same-FD readback exceeded expected size")
    return b"".join(chunks)

def same_file(left, right, label):
    for field in (
        "st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns",
        "st_nlink", "st_uid", "st_mode"
    ):
        require(getattr(left, field) == getattr(right, field),
                label + " changed " + field)

def main():
    require(len(sys.argv) == 8, "exact request-writer argv required")
    expected_sha256 = sys.argv[1]
    expected_size = int(sys.argv[2], 10)
    expected_root_dev = int(sys.argv[3], 10)
    expected_root_ino = int(sys.argv[4], 10)
    expected_uid = int(sys.argv[5], 10)
    expected_root_mode = int(sys.argv[6], 10)
    fault_stage = sys.argv[7]
    require(re.fullmatch(r"[a-f0-9]{64}", expected_sha256) is not None,
            "invalid expected request SHA-256")
    require(0 < expected_size <= MAX_BYTES, "invalid expected request size")
    require(expected_root_dev > 0 and expected_root_ino > 0,
            "invalid expected request-root identity")
    require(expected_uid >= 0, "invalid expected request-root owner")
    require(expected_root_mode == 0o700, "invalid expected request-root mode")
    require(fault_stage in (
        "NONE", "AFTER_O_EXCL_CREATE", "AFTER_FILE_FSYNC",
        "AFTER_ROOT_FSYNC_BEFORE_DURABLE"
    ), "invalid request-writer fault stage")

    root = os.fstat(3)
    require(stat.S_ISDIR(root.st_mode), "FD3 is not a directory")
    require(root.st_dev == expected_root_dev and root.st_ino == expected_root_ino,
            "FD3 request root differs from the parent plan")
    require(root.st_uid == expected_uid, "FD3 request-root owner differs from the parent plan")
    require(stat.S_IMODE(root.st_mode) == expected_root_mode,
            "FD3 request-root mode differs from the parent plan")
    publish("HELPER_ROOT_FD_BOUND")

    data = sys.stdin.buffer.read(MAX_BYTES + 1)
    require(len(data) == expected_size, "request stdin length differs from the parent plan")
    require(hashlib.sha256(data).hexdigest() == expected_sha256,
            "request stdin SHA-256 differs from the parent plan")
    require(hasattr(os, "O_NOFOLLOW"), "request writer requires O_NOFOLLOW")

    request_fd = None
    try:
        try:
            request_fd = os.open(
                LEAF,
                os.O_CREAT | os.O_EXCL | os.O_RDWR | os.O_NOFOLLOW,
                0o600,
                dir_fd=3
            )
        except FileExistsError:
            sys.stderr.write("EEXIST\n")
            sys.stderr.flush()
            return EEXIST_EXIT_CODE

        os.fchmod(request_fd, 0o600)
        created = os.fstat(request_fd)
        require(stat.S_ISREG(created.st_mode), "created request FD is not a regular file")
        require(created.st_nlink == 1, "created request FD is not a singleton")
        require(created.st_uid == expected_uid, "created request owner differs from the root owner")
        require(stat.S_IMODE(created.st_mode) == 0o600,
                "created request FD is not exact mode 0600")
        require(created.st_size == 0, "created request FD is not empty")
        file_identity = " " + str(created.st_dev) + " " + str(created.st_ino)
        byte_receipt = " " + expected_sha256 + " " + str(expected_size)
        publish("REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD" + file_identity)
        maybe_fault(fault_stage, "AFTER_O_EXCL_CREATE")

        offset = 0
        view = memoryview(data)
        while offset < len(data):
            written = os.write(request_fd, view[offset:])
            require(written > 0, "request write made no progress")
            offset += written
        require(offset == expected_size, "request write did not consume the exact input")
        publish("REQUEST_WRITTEN" + file_identity + byte_receipt)
        os.fsync(request_fd)

        written_identity = os.fstat(request_fd)
        require(stat.S_ISREG(written_identity.st_mode),
                "written request FD is not a regular file")
        require(written_identity.st_dev == created.st_dev and
                written_identity.st_ino == created.st_ino,
                "written request FD identity changed")
        require(written_identity.st_nlink == 1, "written request FD is not a singleton")
        require(written_identity.st_uid == expected_uid,
                "written request owner differs from the root owner")
        require(stat.S_IMODE(written_identity.st_mode) == 0o600,
                "written request FD mode changed before freeze")
        require(written_identity.st_size == expected_size,
                "written request FD size differs from the parent plan")
        publish("REQUEST_FILE_FSYNCED" + file_identity + byte_receipt)
        maybe_fault(fault_stage, "AFTER_FILE_FSYNC")
        first_readback = read_exact(request_fd, expected_size)
        require(first_readback == data, "initial same-FD request bytes differ")
        require(hashlib.sha256(first_readback).hexdigest() == expected_sha256,
                "initial same-FD request SHA-256 differs")
        publish("REQUEST_SAME_FD_READBACK_VERIFIED" + file_identity + byte_receipt)

        os.fchmod(request_fd, 0o400)
        frozen_before_fsync = os.fstat(request_fd)
        require(stat.S_ISREG(frozen_before_fsync.st_mode),
                "request FD is not regular after immutable freeze")
        require(frozen_before_fsync.st_dev == created.st_dev and
                frozen_before_fsync.st_ino == created.st_ino,
                "request FD identity changed during immutable freeze")
        require(frozen_before_fsync.st_nlink == 1,
                "request FD is not a singleton after immutable freeze")
        require(frozen_before_fsync.st_uid == expected_uid,
                "request owner changed during immutable freeze")
        require(stat.S_IMODE(frozen_before_fsync.st_mode) == 0o400,
                "request FD is not exact mode 0400 after immutable freeze")
        require(frozen_before_fsync.st_size == expected_size,
                "request size changed during immutable freeze")
        publish("REQUEST_FROZEN_0400" + file_identity + byte_receipt)
        os.fsync(request_fd)
        frozen = os.fstat(request_fd)
        require(stat.S_ISREG(frozen.st_mode), "frozen request FD is not a regular file")
        require(frozen.st_dev == created.st_dev and frozen.st_ino == created.st_ino,
                "frozen request FD identity changed")
        require(frozen.st_nlink == 1, "frozen request FD is not a singleton")
        require(frozen.st_uid == expected_uid, "frozen request owner differs from the root owner")
        require(stat.S_IMODE(frozen.st_mode) == 0o400,
                "frozen request FD is not exact mode 0400")
        require(frozen.st_size == expected_size,
                "frozen request FD size differs from the parent plan")
        publish("REQUEST_FROZEN_FILE_FSYNCED" + file_identity + byte_receipt)
        named = os.stat(LEAF, dir_fd=3, follow_symlinks=False)
        require(stat.S_ISREG(named.st_mode), "request name is not a regular file")
        same_file(frozen, named, "frozen request name binding")

        os.fsync(3)
        publish("REQUEST_ROOT_FSYNCED" + file_identity + byte_receipt)
        maybe_fault(fault_stage, "AFTER_ROOT_FSYNC_BEFORE_DURABLE")
        final_readback = read_exact(request_fd, expected_size)
        require(final_readback == data, "final same-FD request bytes differ")
        require(hashlib.sha256(final_readback).hexdigest() == expected_sha256,
                "final same-FD request SHA-256 differs")
        final_fd = os.fstat(request_fd)
        same_file(frozen, final_fd, "final request FD identity")
        final_named = os.stat(LEAF, dir_fd=3, follow_symlinks=False)
        require(stat.S_ISREG(final_named.st_mode),
                "final request name is not a regular file")
        same_file(final_fd, final_named, "final request name binding")
        publish("REQUEST_FINAL_BINDING_VERIFIED" + file_identity + byte_receipt)
        publish("HELPER_DURABLE" + file_identity + byte_receipt)
        return 0
    finally:
        if request_fd is not None:
            os.close(request_fd)

raise SystemExit(main())
`;
const SOURCE_INSTRUMENTATION_TOKENS = [
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER
] as const;
export const CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS = [
  "directory-shell-is-learner-only",
  "premium-live-direct-route-is-usable",
  "browser-diagnostics-are-clean",
  "qa-instrumentation-is-absent"
] as const;
export const CALIFORNIA_TERMINAL_FILE_ROLES = [
  "source-manifest",
  "layer-a-product-report",
  "layer-a-product-receipt-desktop",
  "layer-a-product-receipt-mobile",
  "layer-a-product-manifest",
  "layer-a-receipt",
  "layer-a-seal",
  "broad-report",
  "broad-producer-success",
  "broad-seal",
  "exhaustive-execution-group-ownership",
  "exhaustive-report",
  "exhaustive-producer-success",
  "exhaustive-seal"
] as const;
const FORBIDDEN_GENERATED_NAME_PATTERN =
  /(?:^|[/._-])(failure|failed|partial|skip|skipped|flaky|retry-[1-9]\d*|temp|tmp)(?:[/._-]|$)/i;
const CALIFORNIA_BROAD_PROVENANCE_KEYS = [
  "baselineSha",
  "buildId",
  "catalogHash",
  "harnessHash",
  "matrixConfigHash",
  "matrixRunId",
  "sourceHash",
  "sourceSnapshotSha256"
] as const;
const CALIFORNIA_EXHAUSTIVE_RUN_IDENTITY_KEYS = [
  "buildId",
  "componentSourceSha256",
  "controlBlueprintSha256",
  "markerIdentities",
  "markerIdentitiesSha256",
  "origin",
  "runId",
  "runtimeRunId",
  "sourceSnapshotSha256"
] as const;

export type CaliforniaAcceptanceExecutionMode = "discovery" | "formal";

export type CaliforniaAcceptanceMode = CaliforniaAcceptanceExecutionMode |
  "execute-measured-authorization" |
  "prepare-measured-authorization-request";

type CaliforniaAcceptanceCliIdentity = {
  acceptanceRunId: string;
  buildId: string;
  capacityPlanPath: string;
  capacityPlanSha256: string;
  exhaustiveRunId: string;
  layerAPort: number;
  layerBPort: number;
  matrixRunId: string;
  runRoot: string;
  runtimeRunId: string;
};

export type CaliforniaAcceptanceCliOptions = CaliforniaAcceptanceCliIdentity & ({
  mode: CaliforniaAcceptanceExecutionMode;
} | {
  authorizationAttemptId: string;
  authorizationReceiptSha256: string;
  mode: "execute-measured-authorization";
} | {
  authorizationAttemptId: string;
  mode: "prepare-measured-authorization-request";
});

export type CaliforniaSourceEntry = {
  mode: number;
  path: string;
  sha256: string;
  size: number;
};

export type CaliforniaInventoryRow = {
  kind: "directory";
  mode: number;
  path: string;
} | {
  kind: "file";
  mode: number;
  path: string;
  sha256: string;
  size: number;
};

export type CaliforniaTerminalFileBinding = {
  relativePath: string;
  role: typeof CALIFORNIA_TERMINAL_FILE_ROLES[number];
  sha256: string;
};

type CaliforniaAcceptanceEnvironmentInput = Readonly<Record<string, string | undefined>>;

export type CaliforniaFrozenSourceManifest = {
  aggregateSha256: string;
  entries: CaliforniaSourceEntry[];
  entryCount: number;
  gitHead: string;
  schemaVersion: typeof CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION;
  worktreeRoot: string;
};

export type CaliforniaLocalEntrypoints = {
  nextCli: string;
  playwrightCli: string;
  tsxLoader: string;
};

export type CaliforniaCommandPlan = {
  argv: string[];
  cwd: string;
  label: string;
};

export type CaliforniaCommandResult = {
  code: number;
  signal: NodeJS.Signals | null;
  stderrPath: string;
  stdoutPath: string;
  timedOut: boolean;
};

export type CaliforniaProductSmokeManifest = {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  canvasNonTextClaim: false;
  checks: Array<{
    checkId: typeof CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS[number];
    projectName: typeof CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS[number];
    status: "passed";
  }>;
  crashpadContainment: CaliforniaCrashpadContainmentBinding;
  crashpadDir: string;
  directoryRoutes: string[];
  graphicsReceipts: 0;
  instrumentation: "none";
  premiumRoutes: string[];
  projects: Array<typeof CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS[number]>;
  receiptFiles: Array<{
    fileName: string;
    projectName: typeof CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS[number];
    sha256: string;
  }>;
  schemaVersion: typeof CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION;
  sourceSnapshotSha256: string;
  status: "passed";
};

export type CaliforniaCrashpadContainmentBinding = {
  argument: string;
  scheme: "chrome-command-line-switch";
  verificationBoundary: {
    globalCrashpadSettingsIdentity: "external-runner-required";
    processTree: "external-runner-required";
  };
};

export type CaliforniaProductSmokeReceipt = {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  canvasNonTextClaim: false;
  checks: Array<typeof CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS[number]>;
  crashpadContainment: CaliforniaCrashpadContainmentBinding;
  crashpadDir: string;
  directoryRoutes: string[];
  graphicsReceipts: 0;
  instrumentation: "none";
  premiumRoutes: string[];
  projectName: typeof CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS[number];
  schemaVersion: typeof CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION;
  sourceSnapshotSha256: string;
  status: "passed";
};

export type CaliforniaTerminalReceipt = {
  artifactCount: number;
  fileName: string;
  frozenSourceSnapshotSha256: string;
  playwrightReportSha256: string;
  producerSuccessSha256: string | null;
  sha256: string;
  sourceHash: string;
  sourceSnapshotSha256: string | null;
  status: "sealed";
  streamBindings: CaliforniaExhaustiveStreamBinding[] | null;
};

export type CaliforniaExhaustiveStreamChunkBinding = {
  fileName: string;
  framedBytes: number;
  recordCount: number;
  recordMerkleRootSha256: string;
  sha256: string;
};

export type CaliforniaExhaustiveStreamBinding = {
  artifactId: string;
  evidenceChunkMerkleRootSha256: string;
  evidenceChunks: CaliforniaExhaustiveStreamChunkBinding[];
  evidenceFramedBytes: number;
  evidenceManifestSha256: string;
  evidenceRecordCount: number;
  evidenceStreamOwnershipSha256: string;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership;
  fileName: string;
  sha256: string;
};

export type CaliforniaLayerAReceipt = {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  canvasNonTextClaim: false;
  graphicsReceipts: 0;
  instrumentation: "none";
  playwrightReportSha256: string;
  productSmokeManifestSha256: string;
  schemaVersion: typeof CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION;
  sourceSnapshotSha256: string;
  status: "passed";
};

type RunLayout = ReturnType<typeof buildRunLayout>;

export type CaliforniaAcceptanceOperations = {
  assertPortFree(port: number): Promise<void>;
  instrument(options: {
    productProjectRoot: string;
    stagingProjectRoot: string;
  }): CaliforniaSignatureComposedStagingResult;
  runCommand(options: {
    argv: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    expectedExitCodes?: readonly number[];
    label: string;
    stderrPath: string;
    stdoutPath: string;
    timeoutMs: number;
  }): Promise<CaliforniaCommandResult>;
  startServer(options: {
    argv: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    label: string;
    port: number;
    stderrPath: string;
    stdoutPath: string;
    timeoutMs: number;
  }): Promise<CaliforniaServerHandle>;
};

export type CaliforniaServerHandle = {
  child: ChildProcess;
  pgid: number;
  port: number;
  stop(): Promise<void>;
};

export class CaliforniaDiscoveryRedError extends Error {
  readonly exitCode = CALIFORNIA_ACCEPTANCE_DISCOVERY_EXIT_CODE;

  constructor(readonly candidate: CaliforniaReviewedSnapshot) {
    super(
      `California signature exhaustive discovery remains intentionally red; ` +
      `UNREVIEWED candidate=${JSON.stringify(candidate)}`
    );
    this.name = "CaliforniaDiscoveryRedError";
  }
}

export class CaliforniaMeasuredAuthorizationPreparationHoldError extends Error {
  constructor() {
    super(
      "California production measured-authorization request preparation is on HOLD until a " +
      "fixed-ledger authority and preparation-only publication branch are owner-authorized."
    );
    this.name = "CaliforniaMeasuredAuthorizationPreparationHoldError";
  }
}

export type CaliforniaReviewedSnapshot = {
  blueprintSha256: string;
  keyCount: number;
  keysSha256: string;
  schemaVersion: number;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function isInside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function exactRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected one object`);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: exact schema drifted`);
}

function exactStrings(expected: readonly string[], actual: readonly string[], label: string) {
  assert.equal(new Set(expected).size, expected.length, `${label}: expected values repeat`);
  assert.equal(new Set(actual).size, actual.length, `${label}: actual values repeat`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label}: exact values drifted`);
}

function assertSha256(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && SHA256_PATTERN.test(value),
    `${label}: expected a lowercase SHA-256`);
}

function assertCanonicalIsoTimestamp(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && value.length > 0, `${label}: expected one timestamp`);
  const parsed = new Date(value);
  assert.ok(Number.isFinite(parsed.getTime()) && parsed.toISOString() === value,
    `${label}: expected one canonical ISO timestamp`);
}

function assertHighEntropyId(value: string, label: string) {
  assert.equal(value, value.trim(), `${label}: value must be exact-trimmed`);
  assert.match(value, SAFE_ID_PATTERN, `${label}: expected an externally generated high-entropy ID`);
  return value;
}

function assertBuildId(value: string) {
  assert.equal(value, value.trim(), "buildId must be exact-trimmed");
  assert.match(value, SAFE_BUILD_ID_PATTERN,
    "buildId must be one externally generated high-entropy safe identifier");
  return value;
}

function parsePort(value: string | undefined, label: string) {
  assert.ok(value, `${label} is required`);
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed >= 1024 && parsed <= 65535,
    `${label} must be an explicit unprivileged TCP port`);
  return parsed;
}

export function parseCaliforniaAcceptanceCli(argv: readonly string[]): CaliforniaAcceptanceCliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]!;
    assert.match(key, /^--[a-z0-9-]+$/, `unknown positional argument ${JSON.stringify(key)}`);
    assert.ok(index + 1 < argv.length, `${key} requires a value`);
    const value = argv[index + 1]!;
    assert.ok(!value.startsWith("--"), `${key} requires a value`);
    assert.ok(!values.has(key), `${key} was supplied more than once`);
    values.set(key, value);
    index += 1;
  }
  const executionKeys = [
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
  const mode = values.get("--mode");
  const expectedKeys = mode === "prepare-measured-authorization-request"
    ? [...executionKeys, "--authorization-attempt-id"]
    : mode === "execute-measured-authorization"
      ? [
          ...executionKeys,
          "--authorization-attempt-id",
          "--authorization-receipt-sha256"
        ]
      : executionKeys;
  exactStrings(expectedKeys, [...values.keys()], "California acceptance CLI options");
  assert.ok(
    mode === "discovery" || mode === "formal" ||
      mode === "execute-measured-authorization" ||
      mode === "prepare-measured-authorization-request",
    "--mode must be exactly discovery, formal, execute-measured-authorization, or " +
      "prepare-measured-authorization-request"
  );
  const layerAPort = parsePort(values.get("--layer-a-port"), "--layer-a-port");
  const layerBPort = parsePort(values.get("--layer-b-port"), "--layer-b-port");
  assert.notEqual(layerAPort, layerBPort, "Layer A and Layer B require distinct ports");
  if (mode === "prepare-measured-authorization-request") {
    return {
      acceptanceRunId: assertHighEntropyId(values.get("--acceptance-run-id")!, "acceptanceRunId"),
      authorizationAttemptId: assertHighEntropyId(
        values.get("--authorization-attempt-id")!,
        "authorizationAttemptId"
      ),
      buildId: assertBuildId(values.get("--build-id")!),
      capacityPlanPath: values.get("--capacity-plan-path")!,
      capacityPlanSha256: (() => {
        const value = values.get("--capacity-plan-sha256")!;
        assertSha256(value, "capacity plan external byte receipt");
        return value;
      })(),
      exhaustiveRunId: assertHighEntropyId(values.get("--exhaustive-run-id")!, "exhaustiveRunId"),
      layerAPort,
      layerBPort,
      matrixRunId: assertHighEntropyId(values.get("--matrix-run-id")!, "matrixRunId"),
      mode,
      runRoot: values.get("--run-root")!,
      runtimeRunId: assertHighEntropyId(values.get("--runtime-run-id")!, "runtimeRunId")
    };
  }
  if (mode === "execute-measured-authorization") {
    return {
      acceptanceRunId: assertHighEntropyId(values.get("--acceptance-run-id")!, "acceptanceRunId"),
      authorizationAttemptId: assertHighEntropyId(
        values.get("--authorization-attempt-id")!,
        "authorizationAttemptId"
      ),
      authorizationReceiptSha256: (() => {
        const value = values.get("--authorization-receipt-sha256")!;
        assertSha256(value, "authorization receipt external byte receipt");
        return value;
      })(),
      buildId: assertBuildId(values.get("--build-id")!),
      capacityPlanPath: values.get("--capacity-plan-path")!,
      capacityPlanSha256: (() => {
        const value = values.get("--capacity-plan-sha256")!;
        assertSha256(value, "capacity plan external byte receipt");
        return value;
      })(),
      exhaustiveRunId: assertHighEntropyId(values.get("--exhaustive-run-id")!, "exhaustiveRunId"),
      layerAPort,
      layerBPort,
      matrixRunId: assertHighEntropyId(values.get("--matrix-run-id")!, "matrixRunId"),
      mode,
      runRoot: values.get("--run-root")!,
      runtimeRunId: assertHighEntropyId(values.get("--runtime-run-id")!, "runtimeRunId")
    };
  }
  return {
    acceptanceRunId: assertHighEntropyId(values.get("--acceptance-run-id")!, "acceptanceRunId"),
    buildId: assertBuildId(values.get("--build-id")!),
    capacityPlanPath: values.get("--capacity-plan-path")!,
    capacityPlanSha256: (() => {
      const value = values.get("--capacity-plan-sha256")!;
      assertSha256(value, "capacity plan external byte receipt");
      return value;
    })(),
    exhaustiveRunId: assertHighEntropyId(values.get("--exhaustive-run-id")!, "exhaustiveRunId"),
    layerAPort,
    layerBPort,
    matrixRunId: assertHighEntropyId(values.get("--matrix-run-id")!, "matrixRunId"),
    mode,
    runRoot: values.get("--run-root")!,
    runtimeRunId: assertHighEntropyId(values.get("--runtime-run-id")!, "runtimeRunId")
  };
}

async function lstatOrNull(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function assertDirectoryNoSymlink(target: string, label: string) {
  const identity = await lstat(target);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    `${label}: expected a regular non-symlink directory`);
  assert.equal(await realpath(target), path.resolve(target),
    `${label}: path traverses a symlink`);
}

export async function assertFreshStarshipRunRoot(
  input: string,
  options: { tmpRoot?: string; worktreeRoot?: string } = {}
) {
  const worktreeRoot = path.resolve(options.worktreeRoot ?? CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT);
  const tmpRoot = path.resolve(options.tmpRoot ?? path.join(worktreeRoot, ".tmp"));
  assert.equal(path.resolve(input), input, "run root must be an explicit absolute normalized path");
  const runRoot = path.resolve(input);
  assert.ok(isInside(CALIFORNIA_ACCEPTANCE_STARSHIP_ROOT, runRoot),
    "run root must remain on /Volumes/Starship");
  assert.ok(isInside(tmpRoot, runRoot) && runRoot !== tmpRoot,
    "run root must be a strict descendant of the worktree .tmp directory");
  assert.equal(path.dirname(runRoot), tmpRoot,
    "run root must be one fresh direct child of the worktree .tmp directory");
  assert.match(path.basename(runRoot), SAFE_RUN_ROOT_NAME_PATTERN,
    "run root name is empty or unsafe");
  assert.notEqual(runRoot, worktreeRoot, "run root must not be the source root");
  assert.notEqual(runRoot, path.join(worktreeRoot, ".next"),
    "run root must not be the shared .next directory");
  assert.ok(!isInside("/tmp", runRoot) && !isInside("/var/folders", runRoot),
    "run root must not use a system temporary directory");
  await assertDirectoryNoSymlink(worktreeRoot, "California acceptance worktree");
  await assertDirectoryNoSymlink(tmpRoot, "California acceptance .tmp root");
  assert.equal(await lstatOrNull(runRoot), null,
    "run root must be explicit, nonexisting, and fresh");
  return runRoot;
}

export async function assertPreparedStarshipRunRoot(
  input: string,
  options: { tmpRoot?: string; worktreeRoot?: string } = {}
) {
  const worktreeRoot = path.resolve(
    options.worktreeRoot ?? CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  );
  const tmpRoot = path.resolve(options.tmpRoot ?? path.join(worktreeRoot, ".tmp"));
  assert.equal(path.resolve(input), input,
    "prepared run root must be an explicit absolute normalized path");
  const runRoot = path.resolve(input);
  assert.ok(isInside(CALIFORNIA_ACCEPTANCE_STARSHIP_ROOT, runRoot),
    "prepared run root must remain on /Volumes/Starship");
  assert.ok(isInside(tmpRoot, runRoot) && runRoot !== tmpRoot,
    "prepared run root must be a strict descendant of the worktree .tmp directory");
  assert.equal(path.dirname(runRoot), tmpRoot,
    "prepared run root must remain one direct child of the worktree .tmp directory");
  assert.match(path.basename(runRoot), SAFE_RUN_ROOT_NAME_PATTERN,
    "prepared run root name is empty or unsafe");
  await assertDirectoryNoSymlink(worktreeRoot, "California acceptance worktree");
  await assertDirectoryNoSymlink(tmpRoot, "California acceptance .tmp root");
  const getuid = process.getuid;
  assert.ok(typeof getuid === "function",
    "prepared California acceptance requires process.getuid");
  const rootIdentity = await lstat(runRoot);
  assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
    "prepared run root must be one physical directory");
  assert.equal(rootIdentity.uid, getuid(),
    "prepared run root must remain owned by this process UID");
  assert.equal(rootIdentity.mode & 0o777, 0o700,
    "prepared run root must remain exact mode 0700");
  assert.equal(await realpath(runRoot), runRoot,
    "prepared run root traverses a symlink");
  const assertPrivateControlledDirectory = async (
    target: string,
    expectedEntries: readonly string[],
    label: string
  ) => {
    await assertDirectoryNoSymlink(target, label);
    const identity = await lstat(target);
    assert.equal(identity.uid, getuid(), `${label}: owner changed`);
    assert.equal(identity.mode & 0o777, 0o700,
      `${label}: mode must remain exact 0700`);
    exactStrings(expectedEntries, await readdir(target), `${label} inventory`);
  };
  exactStrings([
    CALIFORNIA_ACCEPTANCE_SOURCE_MANIFEST_FILENAME,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME,
    "frozen-source",
    "layer-a",
    "layer-b",
    "preflight"
  ], await readdir(runRoot), "prepared run-root top-level inventory");
  await assertPrivateControlledDirectory(path.join(runRoot, "layer-a"), [
    "evidence",
    "logs",
    "source"
  ], "prepared Layer-A root");
  await assertPrivateControlledDirectory(path.join(runRoot, "layer-a", "evidence"), [
    "product-smoke-receipts"
  ], "prepared Layer-A evidence root");
  await assertPrivateControlledDirectory(
    path.join(runRoot, "layer-a", "evidence", "product-smoke-receipts"),
    [],
    "prepared Layer-A product-smoke receipt root"
  );
  await assertPrivateControlledDirectory(
    path.join(runRoot, "layer-a", "logs"),
    [],
    "prepared Layer-A log root"
  );
  await assertPrivateControlledDirectory(path.join(runRoot, "layer-b"), [
    "broad-ledger",
    "evidence",
    "exhaustive-ledger",
    "logs",
    "source"
  ], "prepared Layer-B root");
  await assertPrivateControlledDirectory(path.join(runRoot, "layer-b", "evidence"), [
    CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_FILENAME
  ], "prepared Layer-B evidence root");
  for (const [relativePath, label] of [
    ["layer-b/broad-ledger", "prepared broad ledger"],
    ["layer-b/exhaustive-ledger", "prepared exhaustive ledger"],
    ["layer-b/logs", "prepared Layer-B log root"]
  ] as const) {
    await assertPrivateControlledDirectory(
      path.join(runRoot, relativePath),
      [],
      label
    );
  }
  await assertPrivateControlledDirectory(path.join(runRoot, "preflight"), [
    "logs",
    "writable"
  ], "prepared preflight root");
  await assertPrivateControlledDirectory(path.join(runRoot, "preflight", "logs"), [
    "catalog-check.stderr.log",
    "catalog-check.stdout.log"
  ], "prepared preflight log root");
  for (const [target, expectedMode, label] of [
    [path.join(runRoot, CALIFORNIA_ACCEPTANCE_SOURCE_MANIFEST_FILENAME), 0o400,
      "prepared source manifest"],
    [path.join(runRoot, CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME), 0o400,
      "prepared measured-authorization request"],
    [path.join(runRoot, "layer-b", "evidence",
      CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_FILENAME), 0o400,
      "prepared execution-group ownership"]
  ] as const) {
    const identity = await lstat(target);
    assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
      `${label}: expected one physical singleton file`);
    assert.equal(identity.uid, getuid(), `${label}: owner changed`);
    assert.equal(identity.mode & 0o777, expectedMode,
      `${label}: immutable mode changed`);
    assert.equal(await realpath(target), target, `${label}: path traverses a symlink`);
  }
  return runRoot;
}

export function buildRunLayout(runRoot: string) {
  const frozenSourceRoot = path.join(runRoot, "frozen-source");
  const layerARoot = path.join(runRoot, "layer-a");
  const layerBRoot = path.join(runRoot, "layer-b");
  const layerASourceRoot = path.join(layerARoot, "source");
  const layerBSourceRoot = path.join(layerBRoot, "source");
  return {
    broadLedgerRoot: path.join(layerBRoot, "broad-ledger"),
    broadReportPath: path.join(layerBRoot, "evidence", "broad-playwright-report.json"),
    discoveryPath: path.join(runRoot, CALIFORNIA_ACCEPTANCE_DISCOVERY_FILENAME),
    exhaustiveLedgerRoot: path.join(layerBRoot, "exhaustive-ledger"),
    exhaustiveReportPath: path.join(layerBRoot, "evidence", "exhaustive-playwright-report.json"),
    executionGroupOwnershipPath: path.join(
      layerBRoot,
      "evidence",
      CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_FILENAME
    ),
    finalManifestPath: path.join(runRoot, CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME),
    finalSealPath: path.join(runRoot, CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME),
    frozenSourceRoot,
    layerAReceiptPath: path.join(layerARoot, CALIFORNIA_ACCEPTANCE_LAYER_A_RECEIPT_FILENAME),
    layerARoot,
    layerASealPath: path.join(layerARoot, CALIFORNIA_ACCEPTANCE_LAYER_A_SEAL_FILENAME),
    layerASourceRoot,
    layerAWritableRoot: path.join(layerASourceRoot, ".ca-acceptance"),
    layerBRoot,
    layerBSourceRoot,
    layerBWritableRoot: path.join(layerBSourceRoot, ".ca-acceptance"),
    productSmokeManifestPath: path.join(layerARoot, "evidence", CALIFORNIA_PRODUCT_SMOKE_MANIFEST_FILENAME),
    productSmokeReceiptRoot: path.join(layerARoot, "evidence", "product-smoke-receipts"),
    productSmokeReportPath: path.join(layerARoot, "evidence", "product-smoke-playwright-report.json"),
    runRoot,
    sourceManifestPath: path.join(runRoot, CALIFORNIA_ACCEPTANCE_SOURCE_MANIFEST_FILENAME)
  };
}

async function createRunDirectories(layout: RunLayout) {
  const authorizedParentIdentity =
    await assertMeasuredAuthorizationPublicationOwnedPhysicalParent(
      CALIFORNIA_ACCEPTANCE_TMP_ROOT,
      "California acceptance .tmp parent before production capability issuance"
    );
  await mkdir(layout.runRoot, { mode: 0o700 });
  await assertDirectoryNoSymlink(layout.runRoot, "fresh California acceptance run root");
  const directories = [
    layout.frozenSourceRoot,
    layout.layerARoot,
    layout.layerBRoot,
    layout.layerASourceRoot,
    layout.layerBSourceRoot,
    path.dirname(layout.productSmokeManifestPath),
    layout.productSmokeReceiptRoot,
    path.dirname(layout.broadReportPath),
    layout.broadLedgerRoot,
    layout.exhaustiveLedgerRoot,
    path.join(layout.layerARoot, "logs"),
    path.join(layout.layerBRoot, "logs"),
    path.join(layout.runRoot, "preflight", "logs"),
    path.join(layout.runRoot, "preflight", "writable")
  ];
  for (const directory of directories) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await assertDirectoryNoSymlink(directory, `run directory ${path.relative(layout.runRoot, directory)}`);
  }
  assert.equal(path.dirname(layout.runRoot), CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    "California acceptance run root must retain its direct production .tmp shape");
  assert.match(path.basename(layout.runRoot), SAFE_RUN_ROOT_NAME_PATTERN,
    "California acceptance run-root name became unsafe before capability issuance");
  const rootIdentity = await assertMeasuredAuthorizationPublicationOwnedPhysicalRoot(
    layout.runRoot,
    "California acceptance run root before production capability issuance"
  );
  assert.equal(
    await lstatOrNull(path.join(
      layout.runRoot,
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME
    )),
    null,
    "California measured-authorization request leaf must be absent before capability issuance"
  );
  return issueMeasuredAuthorizationRequestRunRootCapability(
    productionRequestRunRootCapabilities,
    CALIFORNIA_ACCEPTANCE_TMP_ROOT,
    authorizedParentIdentity,
    layout.runRoot,
    rootIdentity
  );
}

export async function __testingRunCaliforniaSignatureMeasuredAuthorizationRequestPreparationIntegration(
  options: {
    cli: Extract<CaliforniaAcceptanceCliOptions, {
      mode: "prepare-measured-authorization-request";
    }>;
    testOnlyCanonicalRequest: Record<string, unknown>;
  }
) {
  assert.equal(arguments.length, 1,
    "request-preparation integration expects one options object");
  exactRecord(options, "request-preparation integration options");
  exactKeys(options, ["cli", "testOnlyCanonicalRequest"],
    "request-preparation integration options");
  const cli = options.cli;
  const testOnlyCanonicalRequestInput = options.testOnlyCanonicalRequest;
  assert.equal(cli.mode, "prepare-measured-authorization-request",
    "request-preparation integration requires exact preparation mode");
  const testOnlyCanonicalRequestPreparation =
    prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication({
      request: testOnlyCanonicalRequestInput
    });
  const testOnlyCanonicalRequest =
    testOnlyCanonicalRequestPreparation.canonicalRequest;
  assert.equal(testOnlyCanonicalRequest.acceptanceRunId, cli.acceptanceRunId,
    "request-preparation acceptanceRunId differs from CLI");
  assert.equal(testOnlyCanonicalRequest.attemptId, cli.authorizationAttemptId,
    "request-preparation attemptId differs from CLI authorization attempt");
  assert.equal(testOnlyCanonicalRequest.buildId, cli.buildId,
    "request-preparation buildId differs from CLI");
  assert.equal(testOnlyCanonicalRequest.matrixRunId, cli.matrixRunId,
    "request-preparation matrixRunId differs from CLI");
  assert.equal(testOnlyCanonicalRequest.runtimeRunId, cli.runtimeRunId,
    "request-preparation runtimeRunId differs from CLI");
  assert.equal(testOnlyCanonicalRequest.origin,
    `http://127.0.0.1:${cli.layerBPort}`,
  "request-preparation origin differs from the exact Layer B CLI port");
  assert.equal(testOnlyCanonicalRequest.executionPlanSha256,
    cli.capacityPlanSha256,
  "request-preparation executionPlanSha256 differs from the CLI capacity-plan receipt");
  assert.deepEqual(testOnlyCanonicalRequest.launchCommand, {
    projects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    repeatEach: 1,
    reporter: "json",
    retries: 0,
    specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
    workers: 1
  }, "request-preparation launch command differs from the exact exhaustive plan");
  assert.deepEqual(testOnlyCanonicalRequest.requiredProjects,
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
  "request-preparation required projects differ from the exact Chrome pair");
  assert.equal(testOnlyCanonicalRequest.schema,
    "ca.california-signature.measured-authorization-request.v1",
  "request-preparation request schema is not exact v1");
  assert.equal(testOnlyCanonicalRequest.requestedDecision,
    "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
  "request-preparation requested decision is not exact");
  assert.equal(testOnlyCanonicalRequest.status, "AWAITING_OWNER_REVIEW",
    "request-preparation status is not awaiting owner review");
  assert.equal(testOnlyCanonicalRequest.maxInvocations, 1,
    "request-preparation maxInvocations is not exactly one");
  assert.equal(testOnlyCanonicalRequest.retryAuthorized, false,
    "request-preparation retry authorization is not false");
  const validatedRunRoot = await assertFreshStarshipRunRoot(cli.runRoot);
  const layout = buildRunLayout(validatedRunRoot);
  const runRootCapability = await createRunDirectories(layout);
  const publication = await publishCaliforniaSignatureMeasuredAuthorizationRequest({
    request: testOnlyCanonicalRequest,
    runRootCapability
  });
  return Object.freeze({
    authorizationRequestPath: publication.authorizationRequestPath,
    authorizationRequestSha256: publication.authorizationRequestSha256,
    browserExecutionStarted: false,
    exhaustiveExecutionAuthorized: false,
    mode: "prepare-measured-authorization-request",
    runRoot: validatedRunRoot,
    serverExecutionStarted: false,
    status: "TEST_ONLY_NON_AUTHORIZING_HOLD"
  });
}

export function resolveCaliforniaLocalEntrypoints(
  worktreeRoot = CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
): CaliforniaLocalEntrypoints {
  const requireFromWorktree = createRequire(path.join(worktreeRoot, "package.json"));
  const result = {
    nextCli: requireFromWorktree.resolve("next/dist/bin/next"),
    playwrightCli: requireFromWorktree.resolve("@playwright/test/cli"),
    tsxLoader: requireFromWorktree.resolve("tsx")
  };
  for (const [label, target] of Object.entries(result)) {
    assert.ok(isInside(path.join(worktreeRoot, "node_modules"), target),
      `${label} must resolve from the original worktree's read-only local dependencies`);
    const identity = lstatSync(target);
    assert.ok(identity.isFile() && !identity.isSymbolicLink(),
      `${label} must be one regular non-symlink local entrypoint`);
    assert.equal(realpathSync(target), target, `${label} must not traverse a dependency symlink`);
  }
  return result;
}

function preserveHomeContract(
  base: CaliforniaAcceptanceEnvironmentInput,
  result: NodeJS.ProcessEnv
) {
  for (const key of ["HOME", "home", "CODEX_HOME"] as const) {
    assert.equal(result[key], base[key], `${key} must be preserved and never assigned or reassigned`);
  }
}

const SCRUBBED_WRITABLE_ENV_KEYS = [
  "TMPDIR",
  "TMP",
  "TEMP",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "npm_config_cache",
  "NPM_CONFIG_CACHE",
  "NODE_COMPILE_CACHE",
  "PLAYWRIGHT_CRASHPAD_DIR",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_BROWSER_PROFILE_DIR",
  "PLAYWRIGHT_BROWSERS_PATH",
  "PLAYWRIGHT_BLOB_OUTPUT_DIR",
  "PLAYWRIGHT_BLOB_OUTPUT_NAME",
  "PLAYWRIGHT_HTML_OUTPUT_DIR",
  "PLAYWRIGHT_JSON_OUTPUT_DIR",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_JSON_OUTPUT_NAME",
  "PLAYWRIGHT_JUNIT_OUTPUT_FILE",
  "PLAYWRIGHT_JUNIT_OUTPUT_NAME",
  "HK_MATH_DB_PATH",
  "NEXT_DIST_DIR",
  "NEXT_TSCONFIG_PATH"
] as const;

const SCRUBBED_EXECUTION_ENV_KEYS = [
  "CA_SIGNATURE_PRODUCT_PROJECT_ROOT",
  "CA_VISUALIZATION_QA_BUILD",
  "CA_VIZ_COMPOSED_QA_BUILD",
  "CA_VIZ_PRODUCT_SMOKE_BUILD_ID",
  "CA_VIZ_PRODUCT_SMOKE_INSTRUMENTATION",
  "CA_VIZ_PRODUCT_SMOKE_LAYER",
  "NODE_OPTIONS",
  "NODE_PATH",
  "TSX_TSCONFIG_PATH",
  "NOW_BUILDER",
  "NOW_REGION",
  "VERCEL",
  "VERCEL_BRANCH_URL",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_GIT_REPO_ID",
  "VERCEL_GIT_REPO_OWNER",
  "VERCEL_GIT_REPO_SLUG",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_REGION",
  "VERCEL_TARGET_ENV",
  "VERCEL_URL"
] as const;

const SAFE_INHERITED_ENV_KEYS = [
  "CODEX_HOME",
  "COLORTERM",
  "FORCE_COLOR",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "NO_COLOR",
  "PATH",
  "SHELL",
  "TERM",
  "TZ",
  "USER",
  "home"
] as const;

const ALLOWED_ACCEPTANCE_EXTRA_ENV_KEYS = new Set([
  "CA_SIGNATURE_BENCHES_PER_PACKAGE",
  "CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID",
  "CA_SIGNATURE_EXHAUSTIVE_BUILD_ID",
  "CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR",
  "CA_SIGNATURE_EXHAUSTIVE_ORIGIN",
  "CA_SIGNATURE_EXHAUSTIVE_RUN_ID",
  "CA_SIGNATURE_EXECUTION_GROUP_PLAN_PATH",
  "CA_SIGNATURE_EXECUTION_GROUP_PLAN_SHA256",
  "CA_SIGNATURE_PRODUCT_PROJECT_ROOT",
  "CA_SIGNATURE_QA_STAGING_ROOT",
  "CA_VIZ_ACCEPTANCE_RUN_ID",
  "CA_VIZ_AXES",
  "CA_VIZ_BASELINE_SHA",
  "CA_VIZ_BUILD_ID",
  "CA_VIZ_COMPOSED_QA_BUILD",
  "CA_VIZ_COVERAGE_LEDGER_DIR",
  "CA_VIZ_EXPECT_TIMEOUT_MS",
  "CA_VIZ_GRADES",
  "CA_VIZ_INCLUDE_PREMIUM",
  "CA_VIZ_LABS",
  "CA_VIZ_MATRIX_RUN_ID",
  "CA_VIZ_MAX_VISITS_PER_PACKAGE",
  "CA_VIZ_PRODUCT_SMOKE_BUILD_ID",
  "CA_VIZ_PRODUCT_SMOKE_INSTRUMENTATION",
  "CA_VIZ_PRODUCT_SMOKE_LAYER",
  "CA_VIZ_PRODUCT_SMOKE_RECEIPT_DIR",
  "CA_VIZ_SOURCE_SNAPSHOT_SHA256",
  "CA_VIZ_TEST_TIMEOUT_MS",
  "CA_VIZ_UX_BUDGET_MS",
  "NEXT_DIST_DIR",
  "NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_CRASHPAD_DIR",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_RUN_ID",
  "PLAYWRIGHT_SKIP_WEBSERVER"
]);

function validateAcceptanceEnvironmentExtras(extras: CaliforniaAcceptanceEnvironmentInput) {
  for (const key of Object.keys(extras)) {
    if (key === "HOME" || key === "home" || key === "CODEX_HOME") {
      assert.fail(`${key} must be preserved and never assigned or reassigned`);
    }
    assert.ok(ALLOWED_ACCEPTANCE_EXTRA_ENV_KEYS.has(key),
      `${key}: reserved or unsafe execution environment extra`);
  }
}

export function buildCaliforniaAcceptanceEnvironment(options: {
  baseEnv?: CaliforniaAcceptanceEnvironmentInput;
  extras?: CaliforniaAcceptanceEnvironmentInput;
  runRoot: string;
  tempRoot?: string;
  writableRoot: string;
}) {
  const base = options.baseEnv ?? process.env;
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of SAFE_INHERITED_ENV_KEYS) {
    if (base[key] !== undefined) env[key] = base[key];
  }
  for (const key of SCRUBBED_WRITABLE_ENV_KEYS) delete env[key];
  for (const key of SCRUBBED_EXECUTION_ENV_KEYS) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^(?:NOW|VERCEL)_/.test(key)) delete env[key];
  }
  delete env.CI;
  validateAcceptanceEnvironmentExtras(options.extras ?? {});
  const temp = path.resolve(options.tempRoot ?? path.join(options.writableRoot, "temp"));
  const cache = path.join(options.writableRoot, "cache");
  Object.assign(env, {
    AI_TUTOR_PROVIDER_PROFILE: "offline-fixture",
    AUTH_SESSION_SECRET: "california-acceptance-local-only-session-secret",
    DEEPSEEK_API_KEY: "",
    HK_MATH_DB_PATH: path.join(options.writableRoot, "state", "app.sqlite"),
    HK_MATH_ENABLE_DEMO_USER: "true",
    HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "400",
    HK_MATH_EXPOSE_LOCAL_RESET_LINKS: "true",
    LLM_API_KEY: "",
    MAIS_ALLOW_EXTERNAL_ARTIFACTS: "1",
    NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_COMPILE_CACHE: path.join(cache, "node-compile"),
    NPM_CONFIG_CACHE: path.join(cache, "npm"),
    OPENAI_API_KEY: "",
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_BROWSER_PROFILE_DIR: path.join(options.writableRoot, "browser-profile"),
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    QWEN_API_KEY: "",
    SQLITE_TMPDIR: temp,
    TEMP: temp,
    TMP: temp,
    TMPDIR: temp,
    XDG_CACHE_HOME: path.join(cache, "xdg"),
    XDG_CONFIG_HOME: path.join(cache, "xdg-config"),
    XDG_DATA_HOME: path.join(cache, "xdg-data"),
    XDG_STATE_HOME: path.join(cache, "xdg-state"),
    npm_config_cache: path.join(cache, "npm"),
    ...options.extras
  });
  preserveHomeContract(base, env);
  assertCaliforniaWritableEnvironmentClosed({ env, runRoot: options.runRoot });
  return env;
}

export function assertCaliforniaWritableEnvironmentClosed(options: {
  env: NodeJS.ProcessEnv;
  runRoot: string;
}) {
  const requiredPathKeys = [
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "npm_config_cache",
    "NPM_CONFIG_CACHE",
    "NODE_COMPILE_CACHE",
    "PLAYWRIGHT_BROWSER_PROFILE_DIR",
    "HK_MATH_DB_PATH",
    "SQLITE_TMPDIR"
  ];
  for (const key of requiredPathKeys) {
    const value = options.env[key];
    assert.ok(value && path.isAbsolute(value), `${key} must be one explicit absolute path`);
    assert.ok(isInside(options.runRoot, path.resolve(value)),
      `${key} must remain inside the fresh Starship run root`);
    assert.ok(!isInside("/tmp", path.resolve(value)) && !isInside("/var/folders", path.resolve(value)),
      `${key} must not use system temp/cache storage`);
  }
  for (const key of [
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_CRASHPAD_DIR",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_REPORT_DIR",
    "NEXT_DIST_DIR",
    "NEXT_TSCONFIG_PATH",
    "CA_VIZ_COVERAGE_LEDGER_DIR",
    "CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR",
    "CA_SIGNATURE_EXECUTION_GROUP_PLAN_PATH",
    "CA_SIGNATURE_PRODUCT_PROJECT_ROOT",
    "CA_SIGNATURE_QA_STAGING_ROOT",
    "CA_VIZ_PRODUCT_SMOKE_MANIFEST_PATH"
  ]) {
    const value = options.env[key]?.trim();
    if (!value) continue;
    const absolute = path.resolve(value);
    assert.ok(isInside(options.runRoot, absolute), `${key} escapes the fresh Starship run root`);
    assert.ok(!isInside(path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT, ".next"), absolute),
      `${key} must not use the shared .next directory`);
  }
}

async function ensureWritableEnvironmentDirectories(env: NodeJS.ProcessEnv) {
  for (const key of [
    "TMPDIR",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "npm_config_cache",
    "NODE_COMPILE_CACHE",
    "PLAYWRIGHT_BROWSER_PROFILE_DIR"
  ]) {
    await mkdir(env[key]!, { recursive: true, mode: 0o700 });
  }
  if (env.PLAYWRIGHT_CRASHPAD_DIR) {
    await mkdir(env.PLAYWRIGHT_CRASHPAD_DIR, { recursive: true, mode: 0o700 });
  }
  await mkdir(path.dirname(env.HK_MATH_DB_PATH!), { recursive: true, mode: 0o700 });
}

function normalizeGitPath(value: string) {
  assert.ok(value && !path.isAbsolute(value), `git source path is empty or absolute: ${JSON.stringify(value)}`);
  const normalized = value.replace(/\\/g, "/");
  assert.equal(path.posix.normalize(normalized), normalized,
    `git source path is not normalized: ${JSON.stringify(value)}`);
  assert.ok(normalized !== ".." && !normalized.startsWith("../") && !normalized.includes("/../"),
    `git source path escapes the worktree: ${JSON.stringify(value)}`);
  assert.ok(!normalized.split("/").includes(".git"),
    `git source path enters .git: ${JSON.stringify(value)}`);
  return normalized;
}

export async function captureProcess(options: {
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  maxBytes: number;
  timeoutMs: number;
}) {
  assert.ok(options.argv.length > 0, "captureProcess requires an argv");
  const child = spawn(options.argv[0]!, options.argv.slice(1), {
    cwd: options.cwd,
    detached: true,
    env: options.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.ok(child.pid, "captureProcess failed to allocate a process group");
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let size = 0;
  const append = (target: Buffer[], chunk: Buffer) => {
    size += chunk.length;
    if (size > options.maxBytes) {
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ }
      return;
    }
    target.push(chunk);
  };
  child.stdout!.on("data", (chunk: Buffer) => append(stdout, chunk));
  child.stderr!.on("data", (chunk: Buffer) => append(stderr, chunk));
  const result = await waitForChild(child, options.timeoutMs);
  if (result.timedOut || result.code !== 0 || result.signal || size > options.maxBytes) {
    await terminateExactProcessGroup(child.pid!, 10_000).catch(() => undefined);
    throw new Error(
      `command failed (${options.argv.join(" ")}): code=${result.code} signal=${result.signal} ` +
      `timedOut=${result.timedOut} stderr=${Buffer.concat(stderr).toString("utf8").slice(0, 2_000)}`
    );
  }
  return Buffer.concat(stdout);
}

async function gitSourcePaths(worktreeRoot: string, env: NodeJS.ProcessEnv) {
  const bytes = await captureProcess({
    argv: ["/usr/bin/git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd: worktreeRoot,
    env,
    maxBytes: 64 * 1024 * 1024,
    timeoutMs: 60_000
  });
  const paths = bytes.toString("utf8").split("\0").filter(Boolean).map(normalizeGitPath);
  assert.ok(paths.length > 0, "git source snapshot is empty");
  assert.equal(new Set(paths).size, paths.length, "git source snapshot repeats a path");
  return paths.sort((left, right) => left.localeCompare(right));
}

async function gitHead(worktreeRoot: string, env: NodeJS.ProcessEnv) {
  const bytes = await captureProcess({
    argv: ["/usr/bin/git", "rev-parse", "HEAD"],
    cwd: worktreeRoot,
    env,
    maxBytes: 4_096,
    timeoutMs: 30_000
  });
  const value = bytes.toString("utf8").trim();
  assert.match(value, /^[a-f0-9]{40}$/, "git HEAD is not one exact SHA-1 commit identity");
  return value;
}

async function assertNoSymlinkSegments(root: string, target: string) {
  assert.ok(isInside(root, target), `${target}: path escapes ${root}`);
  const relative = path.relative(root, target);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const identity = await lstat(current);
    assert.ok(!identity.isSymbolicLink(), `${current}: symlink path segments are forbidden`);
  }
}

async function sourceEntry(root: string, relativePath: string): Promise<CaliforniaSourceEntry> {
  const target = path.join(root, relativePath);
  await assertNoSymlinkSegments(root, target);
  const identity = await lstat(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink(),
    `${relativePath}: source snapshot accepts regular files only`);
  assert.equal(identity.nlink, 1, `${relativePath}: hardlinked source files are forbidden`);
  const bytes = await readFile(target);
  return {
    mode: identity.mode & 0o777,
    path: relativePath,
    sha256: sha256(bytes),
    size: bytes.length
  };
}

export function sourceManifestAggregate(entries: readonly CaliforniaSourceEntry[]) {
  const sorted = [...entries].sort((left, right) => left.path.localeCompare(right.path));
  assert.equal(new Set(sorted.map((entry) => entry.path)).size, sorted.length,
    "source manifest repeats a path");
  for (const entry of sorted) {
    normalizeGitPath(entry.path);
    assertSha256(entry.sha256, `${entry.path} source SHA`);
    assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0, `${entry.path}: invalid size`);
    assert.ok(Number.isSafeInteger(entry.mode) && entry.mode >= 0 && entry.mode <= 0o777,
      `${entry.path}: invalid mode`);
  }
  return sha256(sorted.map((entry) =>
    `${entry.path}\0${entry.size}\0${entry.mode.toString(8)}\0${entry.sha256}`
  ).join("\n"));
}

async function buildSourceManifest(options: {
  env: NodeJS.ProcessEnv;
  worktreeRoot: string;
}) {
  const paths = await gitSourcePaths(options.worktreeRoot, options.env);
  const entries: CaliforniaSourceEntry[] = [];
  for (const relativePath of paths) entries.push(await sourceEntry(options.worktreeRoot, relativePath));
  return {
    aggregateSha256: sourceManifestAggregate(entries),
    entries,
    entryCount: entries.length,
    gitHead: await gitHead(options.worktreeRoot, options.env),
    schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    worktreeRoot: options.worktreeRoot
  } satisfies CaliforniaFrozenSourceManifest;
}

export async function verifyFrozenSourceManifest(options: {
  expectedWorktreeRoot: string;
  manifestPath: string;
}) {
  const read = await readJsonObject(options.manifestPath, "California frozen source manifest");
  exactKeys(read.value, [
    "aggregateSha256",
    "entries",
    "entryCount",
    "gitHead",
    "schemaVersion",
    "worktreeRoot"
  ], "California frozen source manifest");
  assert.equal(read.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    "California frozen source manifest schema drifted");
  assert.equal(read.value.worktreeRoot, options.expectedWorktreeRoot,
    "California frozen source manifest worktree root drifted");
  assert.ok(typeof read.value.gitHead === "string" && /^[a-f0-9]{40}$/.test(read.value.gitHead),
    "California frozen source manifest git HEAD drifted");
  assert.ok(Array.isArray(read.value.entries), "California frozen source manifest entries must be an array");
  const entries = read.value.entries.map((candidate, index): CaliforniaSourceEntry => {
    exactRecord(candidate, `California frozen source manifest entry ${index}`);
    exactKeys(candidate, ["mode", "path", "sha256", "size"],
      `California frozen source manifest entry ${index}`);
    assert.ok(typeof candidate.path === "string");
    const normalizedPath = normalizeGitPath(candidate.path);
    assert.ok(Number.isSafeInteger(candidate.mode) && Number(candidate.mode) >= 0 &&
      Number(candidate.mode) <= 0o777, `${normalizedPath}: source manifest mode is invalid`);
    assert.ok(Number.isSafeInteger(candidate.size) && Number(candidate.size) >= 0,
      `${normalizedPath}: source manifest size is invalid`);
    assertSha256(candidate.sha256, `${normalizedPath}: source manifest SHA`);
    return {
      mode: Number(candidate.mode),
      path: normalizedPath,
      sha256: candidate.sha256,
      size: Number(candidate.size)
    };
  });
  assert.deepEqual(entries, [...entries].sort((left, right) => left.path.localeCompare(right.path)),
    "California frozen source manifest entries are not in canonical path order");
  assert.equal(read.value.entryCount, entries.length,
    "California frozen source manifest entry count drifted");
  assertSha256(read.value.aggregateSha256, "California frozen source manifest aggregate");
  assert.equal(read.value.aggregateSha256, sourceManifestAggregate(entries),
    "California frozen source manifest aggregate drifted");
  return {
    manifest: {
      aggregateSha256: read.value.aggregateSha256,
      entries,
      entryCount: entries.length,
      gitHead: read.value.gitHead,
      schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
      worktreeRoot: read.value.worktreeRoot
    } satisfies CaliforniaFrozenSourceManifest,
    sha256: read.sha256
  };
}

async function assertSourcePathInventoryUnchanged(options: {
  env: NodeJS.ProcessEnv;
  expectedEntries: readonly CaliforniaSourceEntry[];
  worktreeRoot: string;
}) {
  const recaptured = await gitSourcePaths(options.worktreeRoot, options.env);
  const expected = options.expectedEntries.map((entry) => entry.path);
  exactStrings(expected, recaptured, "California full source path recapture");
  assert.deepEqual(recaptured, expected,
    "California full source path recapture changed canonical ordering");
}

async function syncCopiedFile(target: string) {
  const handle = await open(target, "r+");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function copyManifestTree(options: {
  destinationRoot: string;
  entries: readonly CaliforniaSourceEntry[];
  sourceRoot: string;
}) {
  const sourceIdentities = new Map<string, { dev: number; ino: number }>();
  for (const entry of options.entries) {
    const source = path.join(options.sourceRoot, entry.path);
    const destination = path.join(options.destinationRoot, entry.path);
    const sourceIdentity = await lstat(source);
    assert.ok(sourceIdentity.isFile() && !sourceIdentity.isSymbolicLink() && sourceIdentity.nlink === 1,
      `${entry.path}: copy source must remain one regular non-hardlinked file`);
    sourceIdentities.set(entry.path, { dev: sourceIdentity.dev, ino: sourceIdentity.ino });
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
    await chmod(destination, entry.mode);
    await syncCopiedFile(destination);
  }
  for (const entry of options.entries) {
    const destination = path.join(options.destinationRoot, entry.path);
    await assertNoSymlinkSegments(options.destinationRoot, destination);
    const identity = await lstat(destination);
    assert.ok(identity.isFile() && !identity.isSymbolicLink(),
      `${entry.path}: copied entry is not a regular file`);
    assert.equal(identity.nlink, 1, `${entry.path}: copied entry is hardlinked`);
    const sourceIdentity = sourceIdentities.get(entry.path)!;
    if (identity.dev === sourceIdentity.dev) {
      assert.notEqual(identity.ino, sourceIdentity.ino, `${entry.path}: copy reused the source inode`);
    }
    const bytes = await readFile(destination);
    assert.equal(bytes.length, entry.size, `${entry.path}: copied size drifted`);
    assert.equal(sha256(bytes), entry.sha256, `${entry.path}: copied bytes drifted`);
    assert.equal(identity.mode & 0o777, entry.mode, `${entry.path}: copied mode drifted`);
  }
  const copiedDirectories = new Set<string>([options.destinationRoot]);
  for (const entry of options.entries) {
    let current = path.dirname(path.join(options.destinationRoot, entry.path));
    while (isInside(options.destinationRoot, current)) {
      copiedDirectories.add(current);
      if (current === options.destinationRoot) break;
      current = path.dirname(current);
    }
  }
  for (const directory of [...copiedDirectories].sort((left, right) => right.length - left.length)) {
    await fsyncDirectory(directory);
  }
}

async function freezeTree(root: string, entries: readonly CaliforniaSourceEntry[]) {
  for (const entry of entries) {
    await chmod(path.join(root, entry.path), entry.mode & ~0o222);
  }
  const directories = new Set<string>([root]);
  for (const entry of entries) {
    let current = path.dirname(path.join(root, entry.path));
    while (isInside(root, current)) {
      directories.add(current);
      if (current === root) break;
      current = path.dirname(current);
    }
  }
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    await chmod(directory, 0o555);
  }
}

export async function verifyManifestTree(options: {
  entries: readonly CaliforniaSourceEntry[];
  modePolicy?: "manifest" | "frozen-readonly";
  root: string;
}) {
  for (const entry of options.entries) {
    const actual = await sourceEntry(options.root, entry.path);
    assert.equal(actual.size, entry.size, `${entry.path}: durable size drifted`);
    assert.equal(actual.sha256, entry.sha256, `${entry.path}: durable bytes drifted`);
    const expectedMode = options.modePolicy === "frozen-readonly"
      ? entry.mode & ~0o222
      : entry.mode;
    assert.equal(actual.mode, expectedMode, `${entry.path}: durable mode drifted`);
  }
}

export async function createIndependentSourceCopies(options: {
  frozenRoot: string;
  layerARoot: string;
  layerBRoot: string;
  manifest: CaliforniaFrozenSourceManifest;
  sourceRoot: string;
}) {
  await copyManifestTree({
    destinationRoot: options.frozenRoot,
    entries: options.manifest.entries,
    sourceRoot: options.sourceRoot
  });
  await freezeTree(options.frozenRoot, options.manifest.entries);
  await copyManifestTree({
    destinationRoot: options.layerARoot,
    entries: options.manifest.entries,
    sourceRoot: options.frozenRoot
  });
  await copyManifestTree({
    destinationRoot: options.layerBRoot,
    entries: options.manifest.entries,
    sourceRoot: options.frozenRoot
  });
  for (const entry of options.manifest.entries) {
    const frozen = await lstat(path.join(options.frozenRoot, entry.path));
    const layerA = await lstat(path.join(options.layerARoot, entry.path));
    const layerB = await lstat(path.join(options.layerBRoot, entry.path));
    if (frozen.dev === layerA.dev) assert.notEqual(frozen.ino, layerA.ino, `${entry.path}: A hardlinks frozen`);
    if (frozen.dev === layerB.dev) assert.notEqual(frozen.ino, layerB.ino, `${entry.path}: B hardlinks frozen`);
    if (layerA.dev === layerB.dev) assert.notEqual(layerA.ino, layerB.ino, `${entry.path}: A hardlinks B`);
  }
  await verifyManifestTree({
    entries: options.manifest.entries,
    modePolicy: "frozen-readonly",
    root: options.frozenRoot
  });
  await verifyManifestTree({ entries: options.manifest.entries, root: options.layerARoot });
  await verifyManifestTree({ entries: options.manifest.entries, root: options.layerBRoot });
}

async function fsyncDirectory(directory: string) {
  const identity = await lstat(directory);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    `${directory}: durable publication parent must be a regular non-symlink directory`);
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function writeExclusiveJson(target: string, value: unknown) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  const parent = path.dirname(target);
  await assertDirectoryNoSymlink(parent, `${path.basename(target)} publication parent`);
  const handle = await open(target, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(parent);
  const identity = await lstat(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
    `${path.basename(target)}: exclusive publication identity drifted`);
  const reread = await readFile(target);
  assert.deepEqual(reread, bytes, `${path.basename(target)}: exclusive durable reread drifted`);
  return { bytes, sha256: sha256(bytes) };
}

type CaliforniaMeasuredAuthorizationPublicationRootIdentity = {
  birthtimeNs: bigint;
  dev: bigint;
  ino: bigint;
  mode: bigint;
  uid: bigint;
};

type CaliforniaMeasuredAuthorizationRequestRunRootCapabilityState =
  "ISSUED" | "IN_FLIGHT" | "COMPLETE" | "POISONED";

type CaliforniaMeasuredAuthorizationRequestRunRootCapabilityBinding = {
  authorizedParentIdentity: CaliforniaMeasuredAuthorizationPublicationRootIdentity;
  authorizedParentRoot: string;
  rootIdentity: CaliforniaMeasuredAuthorizationPublicationRootIdentity;
  runRoot: string;
  state: CaliforniaMeasuredAuthorizationRequestRunRootCapabilityState;
};

type CaliforniaMeasuredAuthorizationPublicationHelperStage =
  typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_HELPER_STAGES[number];

const CALIFORNIA_MEASURED_AUTHORIZATION_PUBLICATION_SUCCESS_STAGES = [
  "PARENT_ROOT_FDS_BOUND",
  ...CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_HELPER_STAGES,
  "HELPER_EXITED",
  "PUBLICATION_READER_VERIFIED",
  "FINAL_ROOT_AND_ANCESTOR_BINDING_VERIFIED",
  "PARENT_ROOT_FDS_CLOSED",
  "READY_TO_RETURN"
] as const;

type CaliforniaMeasuredAuthorizationPublicationStage =
  typeof CALIFORNIA_MEASURED_AUTHORIZATION_PUBLICATION_SUCCESS_STAGES[number];

type CaliforniaMeasuredAuthorizationPublicationEvent = Readonly<{
  byteLength: number | null;
  fileIdentityToken: string | null;
  mode: 0o600 | 0o400 | null;
  parentIdentityToken: string;
  requestName: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME | null;
  requestSha256: string | null;
  runRootIdentityToken: string;
  stage: CaliforniaMeasuredAuthorizationPublicationStage;
}>;

type CaliforniaMeasuredAuthorizationPublicationBarrierStage =
  "NONE" | "BEFORE_HELPER" | "AFTER_HELPER_BEFORE_READER";

type CaliforniaMeasuredAuthorizationPublicationFaultStage =
  | "NONE"
  | "AFTER_O_EXCL_CREATE"
  | "AFTER_FILE_FSYNC"
  | "AFTER_ROOT_FSYNC_BEFORE_DURABLE";

type CaliforniaMeasuredAuthorizationPublicationTestOnlyControl = Readonly<{
  barrierStage: CaliforniaMeasuredAuthorizationPublicationBarrierStage;
  faultStage: CaliforniaMeasuredAuthorizationPublicationFaultStage;
  onBarrier: (() => void | Promise<void>) | null;
  onEvent: (event: CaliforniaMeasuredAuthorizationPublicationEvent) => void;
}>;

type CaliforniaMeasuredAuthorizationPublicationFileIdentity = {
  birthtimeNs: bigint;
  ctimeNs: bigint;
  dev: bigint;
  ino: bigint;
  mode: bigint;
  mtimeNs: bigint;
  nlink: bigint;
  size: bigint;
  uid: bigint;
};

type CaliforniaMeasuredAuthorizationRequestWriterResult =
  | {
      outcome: "EEXIST";
      stages: readonly ["HELPER_ROOT_FD_BOUND"];
    }
  | {
      dev: string;
      ino: string;
      outcome: "FAULT" | "SUCCESS";
      stages: readonly CaliforniaMeasuredAuthorizationPublicationHelperStage[];
    };

const productionRequestRunRootCapabilities = new WeakMap<
  object,
  CaliforniaMeasuredAuthorizationRequestRunRootCapabilityBinding
>();
const testingRequestRunRootCapabilities = new WeakMap<
  object,
  CaliforniaMeasuredAuthorizationRequestRunRootCapabilityBinding
>();

function measuredAuthorizationPublicationRootIdentity(
  identity: BigIntStats
): CaliforniaMeasuredAuthorizationPublicationRootIdentity {
  return {
    birthtimeNs: identity.birthtimeNs,
    dev: identity.dev,
    ino: identity.ino,
    mode: identity.mode,
    uid: identity.uid
  };
}

function issueMeasuredAuthorizationRequestRunRootCapability(
  registry: WeakMap<object, CaliforniaMeasuredAuthorizationRequestRunRootCapabilityBinding>,
  authorizedParentRoot: string,
  authorizedParentIdentity: CaliforniaMeasuredAuthorizationPublicationRootIdentity,
  runRoot: string,
  rootIdentity: CaliforniaMeasuredAuthorizationPublicationRootIdentity
) {
  const capability = Object.freeze({});
  registry.set(capability, {
    authorizedParentIdentity,
    authorizedParentRoot,
    rootIdentity,
    runRoot,
    state: "ISSUED"
  });
  return capability;
}

function invalidMeasuredAuthorizationPublicationAuthorityError() {
  const error = new Error(
    "California measured-authorization request publication authority is invalid"
  ) as Error & { code: string };
  error.code = "INVALID_MEASURED_AUTHORIZATION_REQUEST_PUBLICATION_AUTHORITY";
  return error;
}

function measuredAuthorizationPublicationFailureError() {
  const message = "California measured-authorization request publication failed";
  const error = new Error(message) as Error & { code: string };
  Object.defineProperty(error, "stack", {
    configurable: true,
    enumerable: false,
    value: `Error: ${message}`,
    writable: true
  });
  error.code = "MEASURED_AUTHORIZATION_REQUEST_PUBLICATION_FAILED";
  return error;
}

function measuredAuthorizationPublicationEexistError() {
  const message = "California measured-authorization request already exists";
  const error = new Error(message) as NodeJS.ErrnoException;
  Object.defineProperty(error, "stack", {
    configurable: true,
    enumerable: false,
    value: `Error: ${message}`,
    writable: true
  });
  error.code = "EEXIST";
  return error;
}

function exactMeasuredAuthorizationPublicationTestOnlyControl(
  value: unknown
): CaliforniaMeasuredAuthorizationPublicationTestOnlyControl {
  exactRecord(value,
    "test-only California measured-authorization request publication control");
  exactKeys(value, [
    "barrierStage",
    "faultStage",
    "onBarrier",
    "onEvent"
  ], "test-only California measured-authorization request publication control");
  assert.equal(Object.isFrozen(value), true,
    "test-only California measured-authorization request publication control must be frozen");
  const barrierStage = value.barrierStage;
  const faultStage = value.faultStage;
  const onBarrier = value.onBarrier;
  const onEvent = value.onEvent;
  assert.ok(
    barrierStage === "NONE" ||
      barrierStage === "BEFORE_HELPER" ||
      barrierStage === "AFTER_HELPER_BEFORE_READER",
    "test-only California measured-authorization request publication barrierStage is invalid"
  );
  assert.ok(
    faultStage === "NONE" ||
      faultStage === "AFTER_O_EXCL_CREATE" ||
      faultStage === "AFTER_FILE_FSYNC" ||
      faultStage === "AFTER_ROOT_FSYNC_BEFORE_DURABLE",
    "test-only California measured-authorization request publication faultStage is invalid"
  );
  assert.ok(barrierStage === "NONE" || faultStage === "NONE",
    "test-only California measured-authorization request publication barrier and fault are mutually exclusive");
  if (barrierStage === "NONE") {
    assert.equal(onBarrier, null,
      "test-only California measured-authorization request publication onBarrier must be null without a barrier");
  } else {
    assert.equal(typeof onBarrier, "function",
      "test-only California measured-authorization request publication barrier requires one callback");
    assert.equal(onBarrier.length, 0,
      "test-only California measured-authorization request publication barrier callback must accept zero arguments");
  }
  assert.equal(typeof onEvent, "function",
    "test-only California measured-authorization request publication onEvent must be one function");
  return Object.freeze({
    barrierStage,
    faultStage,
    onBarrier,
    onEvent
  }) as CaliforniaMeasuredAuthorizationPublicationTestOnlyControl;
}

function measuredAuthorizationPublicationDirectoryIdentityToken(
  kind: "AUTHORIZED_PARENT" | "RUN_ROOT",
  identity: CaliforniaMeasuredAuthorizationPublicationRootIdentity
) {
  return sha256(Buffer.from([
    kind,
    identity.birthtimeNs.toString(),
    identity.dev.toString(),
    identity.ino.toString(),
    identity.mode.toString(),
    identity.uid.toString()
  ].join("\n"), "ascii"));
}

function measuredAuthorizationPublicationFileIdentityToken(
  dev: string,
  ino: string
) {
  return sha256(Buffer.from(`REQUEST_FILE\n${dev}\n${ino}`, "ascii"));
}

function measuredAuthorizationPublicationFileIdentity(
  identity: BigIntStats
): CaliforniaMeasuredAuthorizationPublicationFileIdentity {
  return {
    birthtimeNs: identity.birthtimeNs,
    ctimeNs: identity.ctimeNs,
    dev: identity.dev,
    ino: identity.ino,
    mode: identity.mode,
    mtimeNs: identity.mtimeNs,
    nlink: identity.nlink,
    size: identity.size,
    uid: identity.uid
  };
}

function assertMeasuredAuthorizationPublicationFileIdentity(
  actual: BigIntStats,
  expected: CaliforniaMeasuredAuthorizationPublicationFileIdentity,
  label: string
) {
  for (const key of [
    "birthtimeNs",
    "ctimeNs",
    "dev",
    "ino",
    "mode",
    "mtimeNs",
    "nlink",
    "size",
    "uid"
  ] as const) {
    assert.equal(actual[key], expected[key], `${label}: ${key} changed`);
  }
}

async function readExactMeasuredAuthorizationPublicationFileHandle(
  handle: FileHandle,
  size: number,
  label: string
) {
  assert.ok(Number.isSafeInteger(size) && size > 0 &&
    size <= CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_MAX_BYTES,
  `${label}: invalid bounded read size`);
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const { bytesRead } = await handle.read(bytes, offset, size - offset, offset);
    assert.ok(bytesRead > 0, `${label}: same-FD readback ended early`);
    offset += bytesRead;
  }
  const trailing = Buffer.alloc(1);
  const { bytesRead: trailingBytes } = await handle.read(trailing, 0, 1, size);
  assert.equal(trailingBytes, 0, `${label}: same-FD readback exceeded expected size`);
  return bytes;
}

type CaliforniaMeasuredAuthorizationPublicationEventFileFacts = {
  byteLength: number | null;
  dev: string;
  ino: string;
  mode: 0o600 | 0o400;
  requestSha256: string | null;
};

function emitMeasuredAuthorizationPublicationEvent(options: {
  fileFacts: CaliforniaMeasuredAuthorizationPublicationEventFileFacts | null;
  onEvent?: CaliforniaMeasuredAuthorizationPublicationTestOnlyControl["onEvent"];
  parentIdentityToken: string;
  runRootIdentityToken: string;
  stage: CaliforniaMeasuredAuthorizationPublicationStage;
}) {
  if (!options.onEvent) return;
  const event = Object.freeze({
    byteLength: options.fileFacts?.byteLength ?? null,
    fileIdentityToken: options.fileFacts
      ? measuredAuthorizationPublicationFileIdentityToken(
          options.fileFacts.dev,
          options.fileFacts.ino
        )
      : null,
    mode: options.fileFacts?.mode ?? null,
    parentIdentityToken: options.parentIdentityToken,
    requestName: options.fileFacts
      ? CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME
      : null,
    requestSha256: options.fileFacts?.requestSha256 ?? null,
    runRootIdentityToken: options.runRootIdentityToken,
    stage: options.stage
  }) satisfies CaliforniaMeasuredAuthorizationPublicationEvent;
  options.onEvent(event);
}

function assertTestOnlyMeasuredAuthorizationPublicationRootsDisjointFromProductionLedger(
  roots: readonly string[]
) {
  const productionLedgerRoot =
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT;
  assert.equal(path.resolve(productionLedgerRoot), productionLedgerRoot,
    "production measured-authorization ledger root must be absolute and normalized");
  for (const root of roots) {
    assert.equal(typeof root, "string",
      "test-only measured-authorization publication root must be one string");
    assert.equal(path.resolve(root), root,
      "test-only measured-authorization publication root must be absolute and normalized");
    assert.ok(
      root !== productionLedgerRoot &&
        !isInside(productionLedgerRoot, root) &&
        !isInside(root, productionLedgerRoot),
      "test-only measured-authorization publication roots must be disjoint from the protected " +
      "production ledger root"
    );
  }
}

function assertSafeMeasuredAuthorizationPublicationPathComponents(
  root: string,
  label: string
) {
  const relative = path.relative(CALIFORNIA_ACCEPTANCE_TMP_ROOT, root);
  const components = relative.split(path.sep);
  assert.ok(
    relative.length > 0 &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `${label}: must be a strict descendant of the fixed California .tmp root`
  );
  assert.ok(
    components.every((component) => SAFE_RUN_ROOT_NAME_PATTERN.test(component)),
    `${label}: contains one unsafe path component`
  );
  return components;
}

async function assertMeasuredAuthorizationPublicationOwnedPhysicalParent(
  root: string,
  label: string
) {
  assert.equal(path.resolve(root), root, `${label}: path must be absolute and normalized`);
  assert.equal(typeof process.getuid, "function", `${label}: requires one process UID`);
  const identity = await lstat(root, { bigint: true });
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    `${label}: expected one physical directory`);
  assert.equal(identity.uid, BigInt(process.getuid()),
    `${label}: directory must be owned by this process UID`);
  const permissions = identity.mode & BigInt(0o777);
  assert.equal(permissions & BigInt(0o700), BigInt(0o700),
    `${label}: directory owner must retain every rwx bit`);
  assert.equal(permissions & BigInt(0o022), BigInt(0),
    `${label}: directory must not be group/world writable`);
  assert.equal(await realpath(root), root, `${label}: path traverses a symlink`);
  return measuredAuthorizationPublicationRootIdentity(identity);
}

async function assertMeasuredAuthorizationPublicationOwnedPhysicalRoot(
  root: string,
  label: string
) {
  assert.equal(path.resolve(root), root, `${label}: path must be absolute and normalized`);
  assert.equal(typeof process.getuid, "function", `${label}: requires one process UID`);
  const identity = await lstat(root, { bigint: true });
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    `${label}: expected one physical directory`);
  assert.equal(identity.uid, BigInt(process.getuid()),
    `${label}: directory must be owned by this process UID`);
  assert.equal(identity.mode & BigInt(0o777), BigInt(0o700),
    `${label}: directory must be exact mode 0700`);
  assert.equal(await realpath(root), root, `${label}: path traverses a symlink`);
  return measuredAuthorizationPublicationRootIdentity(identity);
}

export async function __testingIssueCaliforniaSignatureMeasuredAuthorizationRequestRunRootCapability(
  options: {
    testOnlyAuthorizedParentRoot: string;
    testOnlyProtectedLedgerRoot: string;
    testOnlyRunRoot: string;
  }
) {
  exactRecord(options,
    "test-only California measured-authorization run-root capability issuer options");
  exactKeys(options, [
    "testOnlyAuthorizedParentRoot",
    "testOnlyProtectedLedgerRoot",
    "testOnlyRunRoot"
  ], "test-only California measured-authorization run-root capability issuer options");
  const authorizedParentRoot = options.testOnlyAuthorizedParentRoot;
  const protectedLedgerRoot = options.testOnlyProtectedLedgerRoot;
  const runRoot = options.testOnlyRunRoot;
  assert.equal(typeof authorizedParentRoot, "string",
    "test-only authorized parent root must be one string");
  assert.equal(typeof protectedLedgerRoot, "string",
    "test-only protected ledger root must be one string");
  assert.equal(typeof runRoot, "string", "test-only run root must be one string");
  assertTestOnlyMeasuredAuthorizationPublicationRootsDisjointFromProductionLedger([
    authorizedParentRoot,
    protectedLedgerRoot,
    runRoot
  ]);

  const authorizedParentComponents =
    assertSafeMeasuredAuthorizationPublicationPathComponents(
      authorizedParentRoot,
      "test-only authorized parent root"
    );
  assert.ok(authorizedParentComponents.length >= 2,
    "test-only authorized parent root must be at least two components below the fixed .tmp root");
  assertSafeMeasuredAuthorizationPublicationPathComponents(
    protectedLedgerRoot,
    "test-only protected ledger root"
  );
  assertSafeMeasuredAuthorizationPublicationPathComponents(runRoot, "test-only run root");
  assert.equal(path.dirname(protectedLedgerRoot), authorizedParentRoot,
    "test-only protected ledger root must be one direct child of the authorized testing parent");
  assert.ok(
    runRoot !== protectedLedgerRoot &&
      !isInside(protectedLedgerRoot, runRoot) &&
      !isInside(runRoot, protectedLedgerRoot),
    "test-only run root must be disjoint from the protected ledger root"
  );
  assert.equal(path.dirname(runRoot), authorizedParentRoot,
    "test-only run root must be one exact direct child of the authorized testing parent, not " +
    "a direct production-shaped .tmp child"
  );

  const authorizedParentIdentity =
    await assertMeasuredAuthorizationPublicationOwnedPhysicalRoot(
    authorizedParentRoot,
    "test-only measured-authorization authorized parent root"
    );
  await assertMeasuredAuthorizationPublicationOwnedPhysicalRoot(
    protectedLedgerRoot,
    "test-only measured-authorization protected ledger root"
  );
  const rootIdentity = await assertMeasuredAuthorizationPublicationOwnedPhysicalRoot(
    runRoot,
    "test-only measured-authorization run root"
  );
  assert.equal(
    await lstatOrNull(path.join(
      runRoot,
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME
    )),
    null,
    "test-only measured-authorization request leaf must be absent before capability issuance"
  );
  return issueMeasuredAuthorizationRequestRunRootCapability(
    testingRequestRunRootCapabilities,
    authorizedParentRoot,
    authorizedParentIdentity,
    runRoot,
    rootIdentity
  );
}

function assertMeasuredAuthorizationPublicationRootIdentity(
  actual: BigIntStats,
  expected: CaliforniaMeasuredAuthorizationPublicationRootIdentity,
  label: string
) {
  for (const key of [
    "birthtimeNs",
    "dev",
    "ino",
    "mode",
    "uid"
  ] as const) {
    assert.equal(actual[key], expected[key], `${label}: ${key} changed`);
  }
}

async function assertMeasuredAuthorizationPublicationRootBinding(
  runRoot: string,
  rootHandle: FileHandle,
  expected: CaliforniaMeasuredAuthorizationPublicationRootIdentity,
  label: string
) {
  const named = await lstat(runRoot, { bigint: true });
  assert.ok(named.isDirectory() && !named.isSymbolicLink(),
    `${label}: named run root is not one physical directory`);
  assertMeasuredAuthorizationPublicationRootIdentity(
    named,
    expected,
    `${label}: named run root`
  );
  assert.equal(await realpath(runRoot), runRoot,
    `${label}: named run root traverses a symlink`);
  const held = await rootHandle.stat({ bigint: true });
  assert.ok(held.isDirectory(), `${label}: held root FD is not one directory`);
  assertMeasuredAuthorizationPublicationRootIdentity(
    held,
    expected,
    `${label}: held root FD`
  );
}

async function assertMeasuredAuthorizationRequestPythonIdentity() {
  const identity = await lstat(
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_PYTHON,
    { bigint: true }
  );
  assert.ok(identity.isFile() && !identity.isSymbolicLink(),
    "California measured-authorization request writer must be one physical interpreter");
  assert.equal(identity.uid, BigInt(0),
    "California measured-authorization request writer interpreter must be root-owned");
  assert.equal(identity.mode & BigInt(0o022), BigInt(0),
    "California measured-authorization request writer interpreter must not be group/world writable");
  assert.equal(
    await realpath(CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_PYTHON),
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_PYTHON,
    "California measured-authorization request writer interpreter traverses a symlink"
  );
}

function runMeasuredAuthorizationRequestWriter(options: {
  bytes: Buffer;
  faultStage: CaliforniaMeasuredAuthorizationPublicationFaultStage;
  rootHandle: FileHandle;
  rootIdentity: CaliforniaMeasuredAuthorizationPublicationRootIdentity;
  sha256: string;
}): CaliforniaMeasuredAuthorizationRequestWriterResult {
  const finalExpectedStage = options.faultStage === "AFTER_O_EXCL_CREATE"
    ? "REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD"
    : options.faultStage === "AFTER_FILE_FSYNC"
      ? "REQUEST_FILE_FSYNCED"
      : options.faultStage === "AFTER_ROOT_FSYNC_BEFORE_DURABLE"
        ? "REQUEST_ROOT_FSYNCED"
        : "HELPER_DURABLE";
  const finalExpectedStageIndex =
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_HELPER_STAGES.indexOf(
      finalExpectedStage
    );
  assert.ok(finalExpectedStageIndex >= 0,
    "California measured-authorization request writer expected stage is invalid");
  const expectedStages =
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_HELPER_STAGES.slice(
      0,
      finalExpectedStageIndex + 1
    );
  const child = spawnSync(
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_PYTHON,
    [
      "-I",
      "-S",
      "-E",
      "-B",
      "-c",
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_WRITER_SOURCE,
      options.sha256,
      String(options.bytes.length),
      options.rootIdentity.dev.toString(),
      options.rootIdentity.ino.toString(),
      options.rootIdentity.uid.toString(),
      (options.rootIdentity.mode & BigInt(0o777)).toString(),
      options.faultStage
    ],
    {
      cwd: "/usr/bin",
      env: {
        LANG: "C",
        LC_ALL: "C",
        PATH: "/usr/bin:/bin"
      },
      input: options.bytes,
      maxBuffer: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_TRANSCRIPT_MAX_BYTES,
      shell: false,
      stdio: ["pipe", "pipe", "pipe", options.rootHandle.fd],
      timeout: 120_000
    }
  );
  const stdout = Buffer.isBuffer(child.stdout) ? child.stdout : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(child.stderr) ? child.stderr : Buffer.alloc(0);
  if (child.error) {
    throw measuredAuthorizationPublicationFailureError();
  }
  if (
    child.status === CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_EEXIST_EXIT_CODE &&
    child.signal === null &&
    stdout.equals(Buffer.from("HELPER_ROOT_FD_BOUND\n", "ascii")) &&
    stderr.equals(Buffer.from("EEXIST\n", "ascii"))
  ) {
    return {
      outcome: "EEXIST",
      stages: ["HELPER_ROOT_FD_BOUND"]
    };
  }
  const expectedInjectedFault =
    options.faultStage !== "NONE" &&
    child.status === CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FAULT_EXIT_CODE &&
    child.signal === null &&
    stderr.equals(Buffer.from("INJECTED_FAULT\n", "ascii"));
  const expectedSuccess =
    options.faultStage === "NONE" &&
    child.status === 0 &&
    child.signal === null &&
    stderr.length === 0;
  if (!expectedInjectedFault && !expectedSuccess) {
    throw measuredAuthorizationPublicationFailureError();
  }
  assert.ok(stdout.length > 0 &&
    stdout.length <= CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_TRANSCRIPT_MAX_BYTES,
  "California measured-authorization request writer transcript exceeded its fixed bound");
  const transcript = stdout.toString("ascii");
  assert.deepEqual(Buffer.from(transcript, "ascii"), stdout,
    "California measured-authorization request writer transcript is not exact ASCII");
  assert.equal(transcript.includes("\r"), false,
    "California measured-authorization request writer transcript contains CR bytes");
  assert.equal(transcript.endsWith("\n"), true,
    "California measured-authorization request writer transcript lacks one terminal LF");
  const lines = transcript.slice(0, -1).split("\n");
  assert.equal(
    lines.length,
    expectedStages.length,
    "California measured-authorization request writer transcript line count drifted"
  );
  assert.equal(lines[0], "HELPER_ROOT_FD_BOUND",
    "California measured-authorization request writer root-FD ACK drifted");
  const created = /^REQUEST_CREATED_EXCLUSIVE_AT_ROOT_FD ([1-9][0-9]*) ([1-9][0-9]*)$/
    .exec(lines[1]!);
  assert.ok(created,
    "California measured-authorization request writer creation ACK drifted");
  const dev = created[1]!;
  const ino = created[2]!;
  assert.ok(BigInt(dev) > BigInt(0) && BigInt(ino) > BigInt(0),
    "California measured-authorization request writer returned invalid file identity");
  for (let index = 2; index < lines.length; index += 1) {
    const expectedStage =
      expectedStages[index]!;
    const parsed = /^([A-Z0-9_]+) ([1-9][0-9]*) ([1-9][0-9]*) ([a-f0-9]{64}) ([1-9][0-9]*)$/
      .exec(lines[index]!);
    assert.ok(parsed,
      "California measured-authorization request writer durability ACK drifted");
    assert.equal(parsed[1], expectedStage,
      "California measured-authorization request writer durability stage order drifted");
    assert.equal(parsed[2], dev,
      "California measured-authorization request writer file device changed");
    assert.equal(parsed[3], ino,
      "California measured-authorization request writer file inode changed");
    assert.equal(parsed[4], options.sha256,
      "California measured-authorization request writer byte SHA ACK drifted");
    assert.equal(parsed[5], String(options.bytes.length),
      "California measured-authorization request writer byte-length ACK drifted");
  }
  return {
    dev,
    ino,
    outcome: expectedInjectedFault ? "FAULT" : "SUCCESS",
    stages: expectedStages
  };
}

async function publishPreparedCaliforniaSignatureMeasuredAuthorizationRequest(options: {
  capability: object;
  capabilityRegistry: WeakMap<
    object,
    CaliforniaMeasuredAuthorizationRequestRunRootCapabilityBinding
  >;
  preparation: ReturnType<
    typeof prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication
  >;
  testOnlyControl?: CaliforniaMeasuredAuthorizationPublicationTestOnlyControl;
}) {
  const capabilityBinding = options.capabilityRegistry.get(options.capability);
  if (!capabilityBinding || capabilityBinding.state !== "ISSUED") {
    throw invalidMeasuredAuthorizationPublicationAuthorityError();
  }
  capabilityBinding.state = "IN_FLIGHT";

  const authorizedParentRoot = capabilityBinding.authorizedParentRoot;
  const authorizedParentIdentity = capabilityBinding.authorizedParentIdentity;
  const runRoot = capabilityBinding.runRoot;
  const rootIdentity = capabilityBinding.rootIdentity;
  const canonicalRequest = options.preparation.canonicalRequest;
  const authorizationRequestSha256 = options.preparation.authorizationRequestSha256;
  const bytes = Buffer.from(options.preparation.canonicalRequestUtf8, "utf8");
  assert.deepEqual(sha256(bytes), authorizationRequestSha256,
    "California measured-authorization pure preparation SHA drifted");
  assert.ok(bytes.length > 0 &&
    bytes.length <= CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_MAX_BYTES,
  "California measured-authorization pure preparation bytes exceeded the fixed bound");
  const authorizationRequestPath = path.join(
    runRoot,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME
  );
  const parentIdentityToken = measuredAuthorizationPublicationDirectoryIdentityToken(
    "AUTHORIZED_PARENT",
    authorizedParentIdentity
  );
  const runRootIdentityToken = measuredAuthorizationPublicationDirectoryIdentityToken(
    "RUN_ROOT",
    rootIdentity
  );
  const emitEvent = (
    stage: CaliforniaMeasuredAuthorizationPublicationStage,
    fileFacts: CaliforniaMeasuredAuthorizationPublicationEventFileFacts | null
  ) => emitMeasuredAuthorizationPublicationEvent({
    fileFacts,
    onEvent: options.testOnlyControl?.onEvent,
    parentIdentityToken,
    runRootIdentityToken,
    stage
  });
  const runTestOnlyBarrier = async (
    stage: Exclude<CaliforniaMeasuredAuthorizationPublicationBarrierStage, "NONE">
  ) => {
    if (options.testOnlyControl?.barrierStage !== stage) return;
    assert.ok(options.testOnlyControl.onBarrier,
      "California measured-authorization selected test barrier lost its callback");
    await options.testOnlyControl.onBarrier();
  };
  const faultStage = options.testOnlyControl?.faultStage ?? "NONE";

  let authorizedParentHandle: FileHandle | null = null;
  let rootHandle: FileHandle | null = null;
  let requestHandle: FileHandle | null = null;
  let parentRootFdsBound = false;
  let finalFileFacts: CaliforniaMeasuredAuthorizationPublicationEventFileFacts | null = null;
  let result: Readonly<{
    authorizationRequestPath: string;
    authorizationRequestSha256: string;
  }> | undefined;
  let bodyError: unknown;

  try {
    assert.equal(path.dirname(runRoot), authorizedParentRoot,
      "California measured-authorization run root left its authorized direct parent");
    assert.equal(path.dirname(authorizationRequestPath), runRoot,
      "California measured-authorization request filename escaped its exact run root");
    assert.equal(typeof process.getuid, "function",
      "California measured-authorization request publisher requires one process UID");
    await assertMeasuredAuthorizationRequestPythonIdentity();
    assert.equal(typeof fsConstants.O_DIRECTORY, "number",
      "California measured-authorization request publisher requires O_DIRECTORY");
    assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
      "California measured-authorization request publisher requires O_NOFOLLOW");
    authorizedParentHandle = await open(
      authorizedParentRoot,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
    );
    await assertMeasuredAuthorizationPublicationRootBinding(
      authorizedParentRoot,
      authorizedParentHandle,
      authorizedParentIdentity,
      "California measured-authorization publisher authorized parent before run-root open"
    );
    rootHandle = await open(
      runRoot,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
    );
    await assertMeasuredAuthorizationPublicationRootBinding(
      runRoot,
      rootHandle,
      rootIdentity,
      "California measured-authorization publisher run root before helper"
    );
    await assertMeasuredAuthorizationPublicationRootBinding(
      authorizedParentRoot,
      authorizedParentHandle,
      authorizedParentIdentity,
      "California measured-authorization publisher authorized parent before helper"
    );
    parentRootFdsBound = true;
    emitEvent("PARENT_ROOT_FDS_BOUND", null);

    await runTestOnlyBarrier("BEFORE_HELPER");
    if (options.testOnlyControl?.barrierStage === "BEFORE_HELPER") {
      await assertMeasuredAuthorizationPublicationRootBinding(
        runRoot,
        rootHandle,
        rootIdentity,
        "California measured-authorization publisher run root after pre-helper barrier"
      );
      await assertMeasuredAuthorizationPublicationRootBinding(
        authorizedParentRoot,
        authorizedParentHandle,
        authorizedParentIdentity,
        "California measured-authorization publisher authorized parent after pre-helper barrier"
      );
    }

    const writerResult = runMeasuredAuthorizationRequestWriter({
      bytes,
      faultStage,
      rootHandle,
      rootIdentity,
      sha256: authorizationRequestSha256
    });
    if (writerResult.outcome === "EEXIST") {
      emitEvent("HELPER_ROOT_FD_BOUND", null);
      emitEvent("HELPER_EXITED", null);
      throw measuredAuthorizationPublicationEexistError();
    }

    let lastHelperFileFacts:
      CaliforniaMeasuredAuthorizationPublicationEventFileFacts | null = null;
    for (let index = 0; index < writerResult.stages.length; index += 1) {
      const stage = writerResult.stages[index]!;
      if (stage === "HELPER_ROOT_FD_BOUND") {
        emitEvent(stage, null);
        continue;
      }
      const includesByteReceipt = index >= 2;
      const mode = index >= 5 ? 0o400 : 0o600;
      lastHelperFileFacts = {
        byteLength: includesByteReceipt ? bytes.length : null,
        dev: writerResult.dev,
        ino: writerResult.ino,
        mode,
        requestSha256: includesByteReceipt ? authorizationRequestSha256 : null
      };
      emitEvent(stage, lastHelperFileFacts);
    }
    assert.ok(lastHelperFileFacts,
      "California measured-authorization helper transcript omitted file identity facts");
    finalFileFacts = lastHelperFileFacts;
    emitEvent("HELPER_EXITED", finalFileFacts);
    if (writerResult.outcome === "FAULT") {
      throw measuredAuthorizationPublicationFailureError();
    }

    await runTestOnlyBarrier("AFTER_HELPER_BEFORE_READER");

    await assertMeasuredAuthorizationPublicationRootBinding(
      runRoot,
      rootHandle,
      rootIdentity,
      "California measured-authorization publisher run root after helper"
    );
    await assertMeasuredAuthorizationPublicationRootBinding(
      authorizedParentRoot,
      authorizedParentHandle,
      authorizedParentIdentity,
      "California measured-authorization publisher authorized parent after helper"
    );
    requestHandle = await open(
      authorizationRequestPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
    );
    const heldRequestIdentity = await requestHandle.stat({ bigint: true });
    assert.ok(heldRequestIdentity.isFile() && heldRequestIdentity.nlink === BigInt(1),
      "California measured-authorization held publication request is not one regular singleton");
    assert.equal(heldRequestIdentity.dev, BigInt(writerResult.dev),
      "California measured-authorization held publication request device differs from helper ACK");
    assert.equal(heldRequestIdentity.ino, BigInt(writerResult.ino),
      "California measured-authorization held publication request inode differs from helper ACK");
    assert.equal(heldRequestIdentity.uid, rootIdentity.uid,
      "California measured-authorization held publication request owner differs from run root");
    assert.equal(heldRequestIdentity.mode & BigInt(0o777), BigInt(0o400),
      "California measured-authorization held publication request is not immutable mode 0400");
    assert.equal(heldRequestIdentity.size, BigInt(bytes.length),
      "California measured-authorization held publication request size differs from preparation");
    const requestIdentity =
      measuredAuthorizationPublicationFileIdentity(heldRequestIdentity);
    const namedRequestIdentity = await lstat(authorizationRequestPath, { bigint: true });
    assert.ok(namedRequestIdentity.isFile() && !namedRequestIdentity.isSymbolicLink(),
      "California measured-authorization published request name is not one physical file");
    assertMeasuredAuthorizationPublicationFileIdentity(
      namedRequestIdentity,
      requestIdentity,
      "California measured-authorization published request initial name binding"
    );
    assert.equal(await realpath(authorizationRequestPath), authorizationRequestPath,
      "California measured-authorization published request path traverses a symlink");
    assert.deepEqual(
      await readExactMeasuredAuthorizationPublicationFileHandle(
        requestHandle,
        bytes.length,
        "California measured-authorization published request initial same-FD readback"
      ),
      bytes,
      "California measured-authorization published request initial bytes differ from preparation"
    );

    const verifiedRequest =
      readCaliforniaSignatureMeasuredAuthorizationRequestForPublication({
        allowedRoot: runRoot,
        expectedFileIdentity: {
          dev: writerResult.dev,
          ino: writerResult.ino
        },
        expectedRequest: canonicalRequest,
        expectedSha256: authorizationRequestSha256,
        requestPath: authorizationRequestPath
      });
    assert.equal(verifiedRequest.fileSha256, authorizationRequestSha256,
      "California measured-authorization publication reader returned the wrong SHA-256");
    assert.deepEqual(verifiedRequest.request, canonicalRequest,
      "California measured-authorization publication reader returned the wrong request");
    assertMeasuredAuthorizationPublicationFileIdentity(
      await requestHandle.stat({ bigint: true }),
      requestIdentity,
      "California measured-authorization held request after publication reader"
    );
    assert.deepEqual(
      await readExactMeasuredAuthorizationPublicationFileHandle(
        requestHandle,
        bytes.length,
        "California measured-authorization held request after reader same-FD readback"
      ),
      bytes,
      "California measured-authorization held request bytes changed during reader"
    );
    emitEvent("PUBLICATION_READER_VERIFIED", finalFileFacts);

    const finalNamedRequestIdentity = await lstat(
      authorizationRequestPath,
      { bigint: true }
    );
    assert.ok(finalNamedRequestIdentity.isFile() &&
      !finalNamedRequestIdentity.isSymbolicLink(),
    "California measured-authorization final request name is not one physical file");
    assertMeasuredAuthorizationPublicationFileIdentity(
      finalNamedRequestIdentity,
      requestIdentity,
      "California measured-authorization final request name binding"
    );
    assert.equal(await realpath(authorizationRequestPath), authorizationRequestPath,
      "California measured-authorization final request path traverses a symlink");
    await assertMeasuredAuthorizationPublicationRootBinding(
      runRoot,
      rootHandle,
      rootIdentity,
      "California measured-authorization publisher final run-root binding"
    );
    await assertMeasuredAuthorizationPublicationRootBinding(
      authorizedParentRoot,
      authorizedParentHandle,
      authorizedParentIdentity,
      "California measured-authorization publisher final authorized-parent binding"
    );
    assert.equal(path.dirname(runRoot), authorizedParentRoot,
      "California measured-authorization final run-root parent binding changed");
    emitEvent("FINAL_ROOT_AND_ANCESTOR_BINDING_VERIFIED", finalFileFacts);
    result = Object.freeze({
      authorizationRequestPath,
      authorizationRequestSha256
    });
  } catch (error) {
    bodyError = error;
  }

  let closeError: unknown;
  for (const handle of [requestHandle, rootHandle, authorizedParentHandle]) {
    if (!handle) continue;
    try {
      await handle.close();
    } catch (error) {
      closeError ??= error;
    }
  }
  if (parentRootFdsBound && !closeError) {
    try {
      emitEvent("PARENT_ROOT_FDS_CLOSED", finalFileFacts);
    } catch (error) {
      closeError = error;
    }
  }
  if (bodyError || closeError || !result) {
    capabilityBinding.state = "POISONED";
    if (!closeError &&
      (bodyError as NodeJS.ErrnoException | undefined)?.code === "EEXIST") {
      throw bodyError;
    }
    throw measuredAuthorizationPublicationFailureError();
  }

  capabilityBinding.state = "COMPLETE";
  try {
    emitEvent("READY_TO_RETURN", finalFileFacts);
  } catch {
    capabilityBinding.state = "POISONED";
    throw measuredAuthorizationPublicationFailureError();
  }
  return result;
}

export async function publishCaliforniaSignatureMeasuredAuthorizationRequest(
  options: {
    request: Record<string, unknown>;
    runRootCapability: object;
  }
) {
  exactRecord(options,
    "California measured-authorization request publisher options");
  exactKeys(options, ["request", "runRootCapability"],
    "California measured-authorization request publisher options");
  const requestInput = options.request;
  const runRootCapability = options.runRootCapability;
  if (!runRootCapability || typeof runRootCapability !== "object" ||
    Array.isArray(runRootCapability)) {
    throw invalidMeasuredAuthorizationPublicationAuthorityError();
  }
  const preparation =
    prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication({
      request: requestInput
    });
  return publishPreparedCaliforniaSignatureMeasuredAuthorizationRequest({
    capability: runRootCapability,
    capabilityRegistry: productionRequestRunRootCapabilities,
    preparation
  });
}

export async function __testingPublishCaliforniaSignatureMeasuredAuthorizationRequest(
  options: {
    request: Record<string, unknown>;
    testOnlyControl: CaliforniaMeasuredAuthorizationPublicationTestOnlyControl;
    testOnlyRunRootCapability: object;
  }
) {
  exactRecord(options,
    "test-only California measured-authorization request publisher options");
  exactKeys(options, [
    "request",
    "testOnlyControl",
    "testOnlyRunRootCapability"
  ], "test-only California measured-authorization request publisher options");
  const requestInput = options.request;
  const testOnlyControlInput = options.testOnlyControl;
  const testOnlyRunRootCapability = options.testOnlyRunRootCapability;
  const testOnlyControl = exactMeasuredAuthorizationPublicationTestOnlyControl(
    testOnlyControlInput
  );
  if (!testOnlyRunRootCapability || typeof testOnlyRunRootCapability !== "object" ||
    Array.isArray(testOnlyRunRootCapability)) {
    throw invalidMeasuredAuthorizationPublicationAuthorityError();
  }
  const preparation =
    prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication({
      request: requestInput
    });
  return publishPreparedCaliforniaSignatureMeasuredAuthorizationRequest({
    capability: testOnlyRunRootCapability,
    capabilityRegistry: testingRequestRunRootCapabilities,
    preparation,
    testOnlyControl
  });
}

export async function readCaliforniaExternalCapacityPartitionPlan(options: {
  expectedSha256: string;
  planPath: string;
  tmpRoot?: string;
}) {
  assertSha256(options.expectedSha256,
    "California external capacity partition byte receipt");
  const tmpRoot = path.resolve(options.tmpRoot ?? CALIFORNIA_ACCEPTANCE_TMP_ROOT);
  const planPath = path.resolve(options.planPath);
  assert.equal(options.planPath, planPath,
    "California external capacity partition path must be absolute and normalized");
  assert.ok(isInside(tmpRoot, planPath) && planPath !== tmpRoot,
    "California external capacity partition must remain in the worktree Starship .tmp root");
  const relativeParts = path.relative(tmpRoot, planPath).split(path.sep);
  assert.ok(relativeParts.length >= 2 && relativeParts[0],
    "California external capacity partition must live inside a fresh direct-child run root");
  const owningRunRoot = path.join(tmpRoot, relativeParts[0]!);
  await assertDirectoryNoSymlink(tmpRoot, "California capacity plan .tmp root");
  await assertDirectoryNoSymlink(owningRunRoot,
    "California capacity plan fresh direct-child root");
  const pathIdentity = await lstat(planPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California external capacity partition must be one regular non-linked file");
  assert.equal(await realpath(planPath), planPath,
    "California external capacity partition traverses a symlink");
  const handle = await open(
    planPath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
  );
  let bytes: Buffer;
  try {
    const before = await handle.stat({ bigint: true });
    assert.equal(before.dev, pathIdentity.dev,
      "California external capacity partition device changed before held-FD read");
    assert.equal(before.ino, pathIdentity.ino,
      "California external capacity partition inode changed before held-FD read");
    bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(after[key], before[key],
        `California external capacity partition held-FD ${key} changed during read`);
    }
    const finalPath = await lstat(planPath, { bigint: true });
    assert.equal(finalPath.dev, before.dev,
      "California external capacity partition path device changed during read");
    assert.equal(finalPath.ino, before.ino,
      "California external capacity partition path inode changed during read");
  } finally {
    await handle.close();
  }
  const fileSha256 = sha256(bytes);
  assert.equal(fileSha256, options.expectedSha256,
    "California external capacity partition bytes differ from its external receipt");
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `California external capacity partition is invalid JSON: ${
        error instanceof Error ? error.message : String(error)}`
    );
  }
  exactRecord(parsed, "California external capacity partition");
  return {
    fileSha256,
    plan: parsed as unknown as CaliforniaSignatureFinalCompositorPartitionPlan
  };
}

export async function publishCaliforniaSignatureExecutionGroupOwnership(options: {
  capacityPlanPath: string;
  capacityPlanSha256: string;
  canvasContract: ReturnType<typeof buildCaliforniaCanvasGraphicsSourceContract>;
  manifest: ReturnType<typeof buildCaliforniaSignatureSourceManifest>;
  projectRoot: string;
  runRoot: string;
  sourceSnapshotSha256: string;
  targetPath: string;
}) {
  const external = await readCaliforniaExternalCapacityPartitionPlan({
    expectedSha256: options.capacityPlanSha256,
    planPath: options.capacityPlanPath
  });
  const sourceEvidenceOracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(
    options.manifest,
    { canvasContract: options.canvasContract }
  );
  const reviewed = buildCaliforniaSignatureReviewedFinalCompositorSourcePlan({
    canvasContract: options.canvasContract,
    manifest: options.manifest,
    oracle: sourceEvidenceOracle,
    projectDimensionPolicies: CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => ({
      axisIds: californiaSignatureAxisIdsForProject(projectName),
      deviceScaleFactor: CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName].deviceScaleFactor,
      projectName,
      viewport: { ...CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName].viewport }
    })),
    projectRoot: options.projectRoot,
    sourceSnapshotSha256: options.sourceSnapshotSha256
  });
  const manifest = buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: external.plan,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256: options.sourceSnapshotSha256
  });
  const targetPath = path.resolve(options.targetPath);
  assert.ok(isInside(path.resolve(options.runRoot), targetPath),
    "California execution-group ownership publication escapes the fresh run root");
  const publication = await writeExclusiveJson(targetPath, manifest);
  await chmod(targetPath, 0o400);
  await fsyncDirectory(path.dirname(targetPath));
  const verified = readCaliforniaSignatureExecutionGroupOwnershipManifest({
    allowedRoot: options.runRoot,
    expectedSha256: publication.sha256,
    expectedSourceSnapshotSha256: options.sourceSnapshotSha256,
    manifestPath: targetPath
  });
  assert.deepEqual(verified.manifest, manifest,
    "California execution-group ownership changed after durable publication");
  return {
    capacityPlanFileSha256: external.fileSha256,
    manifest: verified.manifest,
    path: targetPath,
    sha256: verified.fileSha256
  };
}

export async function runCaliforniaSignatureExhaustiveProducerUnderCapacityHold<T>(options: {
  launch(): Promise<T>;
  ownershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
}): Promise<T> {
  assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable(
    options.ownershipManifest
  );
  throw new Error(
    "California signature diagnostic capacity HOLD unexpectedly returned without blocking"
  );
}

async function readJsonObject(target: string, label: string) {
  const identity = await lstat(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink(),
    `${label}: expected one regular non-symlink file`);
  assert.equal(identity.nlink, 1, `${label}: hardlinked evidence is forbidden`);
  const bytes = await readFile(target);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  exactRecord(value, label);
  return { bytes, sha256: sha256(bytes), value };
}

function assertProductSourcesUninstrumented(projectRoot: string) {
  for (const markerName of [
    CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
    CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
  ]) {
    assert.equal(
      existsSync(path.join(projectRoot, markerName)),
      false,
      `Layer A must not contain QA marker ${markerName}`
    );
  }
  const manifest = buildCaliforniaSignatureSourceManifest(projectRoot);
  assertCaliforniaSignatureSourceManifestFrozen(manifest);
  for (const bench of manifest.benches) {
    const source = readFileSync(path.join(projectRoot, bench.sourcePath), "utf8");
    for (const token of SOURCE_INSTRUMENTATION_TOKENS) {
      assert.equal(source.includes(token), false,
        `${bench.sourcePath}: Layer A contains QA-only instrumentation ${token}`);
    }
  }
  return manifest;
}

function generatedTsconfigPath(sourceRoot: string) {
  return path.join(sourceRoot, "tsconfig.california-acceptance.generated.json");
}

async function writeGeneratedTsconfig(sourceRoot: string, distDir: string) {
  const relativeDist = path.relative(sourceRoot, distDir).replace(/\\/g, "/");
  assert.ok(relativeDist && !relativeDist.startsWith(".."), "Next dist must remain under layer source root");
  const target = generatedTsconfigPath(sourceRoot);
  await writeExclusiveJson(target, {
    compilerOptions: { plugins: [{ name: "next" }] },
    exclude: [
      "node_modules",
      "private",
      "private/**/*",
      ".ca-acceptance/cache",
      ".ca-acceptance/browser-profile",
      ".ca-acceptance/playwright-output",
      ".ca-acceptance/playwright-report"
    ],
    extends: "./tsconfig.json",
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      "components/visualizations/signature/**/*.jsx",
      `${relativeDist}/types/**/*.ts`
    ]
  });
  return target;
}

async function removeExactGeneratedTsconfig(sourceRoot: string) {
  const target = generatedTsconfigPath(sourceRoot);
  const identity = await lstat(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
    "generated acceptance tsconfig changed identity before exact removal");
  await unlink(target);
  assert.equal(await lstatOrNull(target), null, "generated acceptance tsconfig survived exact removal");
}

export function buildCaliforniaCommandPlans(options: {
  entrypoints: CaliforniaLocalEntrypoints;
  layout: RunLayout;
}) {
  const node = process.execPath;
  const projects = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((project) => ["--project", project]);
  const playwrightBase = (spec: string) => [
    node,
    options.entrypoints.playwrightCli,
    "test",
    spec,
    ...projects,
    "--workers=1",
    "--retries=0",
    "--repeat-each=1",
    "--reporter=json"
  ];
  return {
    broad: {
      argv: playwrightBase("tests/e2e/california-visualization-labs.spec.ts"),
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B broad California Visualization matrix"
    },
    broadLedger: {
      argv: [
        node,
        "--import",
        options.entrypoints.tsxLoader,
        "--test",
        "tests/e2e/california-visualization-coverage-ledger.test.ts"
      ],
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B broad coverage ledger and seal"
    },
    buildA: {
      argv: [node, options.entrypoints.nextCli, "build"],
      cwd: options.layout.layerASourceRoot,
      label: "Layer A uninstrumented Next build"
    },
    buildB: {
      argv: [node, options.entrypoints.nextCli, "build"],
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B composed QA Next build"
    },
    catalogCheck: {
      argv: [
        node,
        "--import",
        options.entrypoints.tsxLoader,
        path.join(CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
          "scripts/generate-premium-three-d-direct-catalog-snapshot.mts"),
        "--check"
      ],
      cwd: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
      label: "premium direct catalog generated snapshot preflight"
    },
    exhaustive: {
      argv: playwrightBase("tests/e2e/california-signature-exhaustive.spec.ts"),
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B exhaustive California signature matrix"
    },
    exhaustiveLedger: {
      argv: [
        node,
        "--import",
        options.entrypoints.tsxLoader,
        "--test",
        "tests/e2e/california-signature-exhaustive-ledger.test.ts"
      ],
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B exhaustive ledger and seal"
    },
    productSmoke: {
      argv: playwrightBase("tests/e2e/california-visualization-product-smoke.spec.ts"),
      cwd: options.layout.layerASourceRoot,
      label: "Layer A uninstrumented product smoke"
    },
    startA: {
      argv: [node, options.entrypoints.nextCli, "start", "--hostname", "127.0.0.1"],
      cwd: options.layout.layerASourceRoot,
      label: "Layer A product server"
    },
    startB: {
      argv: [node, options.entrypoints.nextCli, "start", "--hostname", "127.0.0.1"],
      cwd: options.layout.layerBSourceRoot,
      label: "Layer B QA server"
    }
  } satisfies Record<string, CaliforniaCommandPlan>;
}

export function assertLocalOnlyCommandPlans(
  plans: Record<string, CaliforniaCommandPlan>,
  entrypoints: CaliforniaLocalEntrypoints
) {
  const allowedEntrypoints = new Set([
    entrypoints.nextCli,
    entrypoints.playwrightCli,
    entrypoints.tsxLoader
  ]);
  for (const plan of Object.values(plans)) {
    assert.equal(plan.argv[0], process.execPath, `${plan.label}: must launch through process.execPath`);
    assert.ok(!plan.argv.some((argument) => /(^|[/\\])(npm|npx)(\.cmd)?$/i.test(argument)),
      `${plan.label}: npm/npx/PATH entrypoints are forbidden`);
    const localArguments = plan.argv.filter((argument) => allowedEntrypoints.has(argument));
    assert.ok(localArguments.length >= 1, `${plan.label}: lacks a require-resolved local entrypoint`);
    assert.equal(plan.argv.includes("--retries=0") || !plan.argv.includes("test"), true,
      `${plan.label}: Playwright retries must be exactly zero`);
  }
}

async function waitForChild(child: ChildProcess, timeoutMs: number) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null; timedOut: boolean }>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ code: null, signal: null, timedOut: true });
    }, timeoutMs);
    timer.unref?.();
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, timedOut: false });
    });
  });
}

function processGroupExists(pgid: number) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      // macOS can transiently report EPERM for kill(-pgid, 0) while a child
      // just terminated and is being reaped.  Do not interpret that as gone:
      // independently enumerate exact process-group membership fail-closed.
      const inspected = spawnSync("/bin/ps", ["-axo", "pid=,pgid="], {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        shell: false
      });
      assert.equal(inspected.status, 0,
        `could not prove process-group ${pgid} membership after EPERM: ${inspected.stderr}`);
      return inspected.stdout.split(/\r?\n/).some((row) => {
        const match = /^\s*(\d+)\s+(\d+)\s*$/.exec(row);
        return match ? Number(match[2]) === pgid : false;
      });
    }
    throw error;
  }
}

async function pollUntil(predicate: () => boolean | Promise<boolean>, timeoutMs: number, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await predicate()) return true;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(intervalMs, 1_000)));
  }
  return false;
}

export async function terminateExactProcessGroup(pgid: number, timeoutMs = 10_000) {
  assert.ok(Number.isSafeInteger(pgid) && pgid > 1, "refusing to terminate an unsafe process group");
  if (!processGroupExists(pgid)) return;
  try { process.kill(-pgid, "SIGTERM"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
  if (await pollUntil(() => !processGroupExists(pgid), Math.min(timeoutMs, 10_000))) return;
  try { process.kill(-pgid, "SIGKILL"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
  assert.ok(await pollUntil(() => !processGroupExists(pgid), Math.min(timeoutMs, 10_000)),
    `process group ${pgid} survived TERM and KILL`);
}

async function openExclusiveLog(target: string) {
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  return open(target, "wx", 0o600);
}

export async function runLoggedCommand(options: {
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  expectedExitCodes?: readonly number[];
  label: string;
  stderrPath: string;
  stdoutPath: string;
  timeoutMs: number;
}): Promise<CaliforniaCommandResult> {
  assert.equal(options.argv[0], process.execPath, `${options.label}: command must use process.execPath`);
  const stdout = await openExclusiveLog(options.stdoutPath);
  const stderr = await openExclusiveLog(options.stderrPath);
  let child: ChildProcess | null = null;
  try {
    child = spawn(options.argv[0]!, options.argv.slice(1), {
      cwd: options.cwd,
      detached: true,
      env: options.env,
      shell: false,
      stdio: ["ignore", stdout.fd, stderr.fd]
    });
    assert.ok(child.pid, `${options.label}: failed to allocate an exact process group`);
    const result = await waitForChild(child, options.timeoutMs);
    if (result.timedOut) await terminateExactProcessGroup(child.pid);
    else if (processGroupExists(child.pid)) await terminateExactProcessGroup(child.pid);
    await stdout.sync();
    await stderr.sync();
    const normalized: CaliforniaCommandResult = {
      code: result.code ?? -1,
      signal: result.signal,
      stderrPath: options.stderrPath,
      stdoutPath: options.stdoutPath,
      timedOut: result.timedOut
    };
    const expected = options.expectedExitCodes ?? [0];
    assert.ok(!normalized.timedOut, `${options.label}: command timed out`);
    assert.equal(normalized.signal, null, `${options.label}: command exited by signal ${normalized.signal}`);
    assert.ok(expected.includes(normalized.code),
      `${options.label}: unexpected exit ${normalized.code}; expected ${expected.join(",")}`);
    return normalized;
  } finally {
    await stdout.close();
    await stderr.close();
    if (child?.pid && processGroupExists(child.pid)) {
      await terminateExactProcessGroup(child.pid).catch(() => undefined);
    }
  }
}

export async function isPortFree(port: number) {
  return new Promise<boolean>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") resolve(false);
      else reject(error);
    });
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close((error) => error ? reject(error) : resolve(true));
    });
  });
}

async function waitForHttpReady(options: { child: ChildProcess; port: number; timeoutMs: number }) {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    if (options.child.exitCode !== null || options.child.signalCode !== null) {
      throw new Error(`server process exited before readiness on port ${options.port}`);
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2_000);
      const response = await fetch(`http://127.0.0.1:${options.port}/`, {
        redirect: "manual",
        signal: controller.signal
      });
      clearTimeout(timer);
      await response.body?.cancel();
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Bounded poll. The exact server process and port remain the ownership evidence.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`server did not become ready on 127.0.0.1:${options.port}`);
}

export async function startCaliforniaServer(options: {
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  label: string;
  port: number;
  stderrPath: string;
  stdoutPath: string;
  timeoutMs: number;
}): Promise<CaliforniaServerHandle> {
  assert.equal(options.argv[0], process.execPath, `${options.label}: server must use process.execPath`);
  assert.ok(await isPortFree(options.port), `${options.label}: port ${options.port} is not free`);
  const stdout = await openExclusiveLog(options.stdoutPath);
  const stderr = await openExclusiveLog(options.stderrPath);
  const child = spawn(options.argv[0]!, [...options.argv.slice(1), "--port", String(options.port)], {
    cwd: options.cwd,
    detached: true,
    env: options.env,
    shell: false,
    stdio: ["ignore", stdout.fd, stderr.fd]
  });
  assert.ok(child.pid, `${options.label}: failed to allocate a detached process group`);
  try {
    await waitForHttpReady({ child, port: options.port, timeoutMs: options.timeoutMs });
  } catch (error) {
    await terminateExactProcessGroup(child.pid).catch(() => undefined);
    await stdout.close();
    await stderr.close();
    throw error;
  }
  let stopped = false;
  return {
    child,
    pgid: child.pid,
    port: options.port,
    async stop() {
      if (stopped) return;
      stopped = true;
      await terminateExactProcessGroup(child.pid!);
      await stdout.sync();
      await stderr.sync();
      await stdout.close();
      await stderr.close();
      assert.ok(await pollUntil(() => isPortFree(options.port), 10_000),
        `${options.label}: port ${options.port} remained occupied after exact PGID cleanup`);
      assert.equal(processGroupExists(child.pid!), false,
        `${options.label}: exact process group survived cleanup`);
    }
  };
}

function collectPlaywrightTests(report: Record<string, unknown>) {
  const rows: Array<{
    projectName: string;
    results: Array<Record<string, unknown>>;
    specTitle: string;
    status: string;
    title: string;
  }> = [];
  const walk = (suite: unknown, parents: string[]) => {
    exactRecord(suite, "Playwright suite");
    const title = typeof suite.title === "string" ? suite.title : "";
    const nextParents = title ? [...parents, title] : parents;
    if (Array.isArray(suite.specs)) {
      for (const rawSpec of suite.specs) {
        exactRecord(rawSpec, "Playwright spec");
        const specTitle = typeof rawSpec.title === "string" ? rawSpec.title : "unnamed";
        assert.ok(Array.isArray(rawSpec.tests), `${specTitle}: Playwright spec tests are missing`);
        for (const rawTest of rawSpec.tests) {
          exactRecord(rawTest, `${specTitle} Playwright test`);
          assert.ok(Array.isArray(rawTest.results), `${specTitle}: Playwright results are missing`);
          rows.push({
            projectName: typeof rawTest.projectName === "string" ? rawTest.projectName : "",
            results: rawTest.results as Array<Record<string, unknown>>,
            specTitle,
            status: typeof rawTest.status === "string" ? rawTest.status : "",
            title: [...nextParents, specTitle].join(" > ")
          });
        }
      }
    }
    if (Array.isArray(suite.suites)) for (const child of suite.suites) walk(child, nextParents);
  };
  assert.ok(Array.isArray(report.suites), "Playwright JSON report lacks suites");
  for (const suite of report.suites) walk(suite, []);
  return rows;
}

export async function verifyPlaywrightJsonReport(options: {
  expectedProjects: readonly string[];
  expectedTestCount?: number;
  reportPath: string;
}) {
  const report = await readJsonObject(options.reportPath, "Playwright JSON report");
  const tests = collectPlaywrightTests(report.value);
  assert.ok(tests.length > 0, "Playwright JSON report contains no tests");
  if (options.expectedTestCount !== undefined) {
    assert.equal(tests.length, options.expectedTestCount,
      "Playwright JSON report test count drifted from the exact manifest");
  }
  exactStrings(options.expectedProjects, [...new Set(tests.map((test) => test.projectName))],
    "Playwright report projects");
  for (const test of tests) {
    assert.equal(test.status, "expected", `${test.title}: aggregate status is not expected/passed`);
    assert.equal(test.results.length, 1, `${test.title}: retries or duplicate attempts are forbidden`);
    const result = test.results[0]!;
    assert.equal(result.status, "passed", `${test.title}: result did not pass`);
    const retry = typeof result.retry === "number" ? result.retry : 0;
    assert.equal(retry, 0, `${test.title}: retry evidence is forbidden`);
  }
  if (report.value.stats) {
    const stats: Record<string, unknown> = report.value.stats as Record<string, unknown>;
    exactRecord(stats, "Playwright report stats");
    for (const key of ["unexpected", "skipped", "flaky"] as const) {
      const value: unknown = stats[key];
      if (typeof value === "number") assert.equal(value, 0, `Playwright report stats.${key} must be zero`);
    }
  }
  return {
    identities: tests.map((test) => `${test.projectName}\0${test.specTitle}`),
    sha256: report.sha256,
    testCount: tests.length
  };
}

const CALIFORNIA_BROAD_PROCESS_CONTEXT_ENV_KEYS = [
  "CA_VIZ_AXES",
  "CA_VIZ_BASELINE_SHA",
  "CA_VIZ_BUILD_ID",
  "CA_VIZ_EXPECT_TIMEOUT_MS",
  "CA_VIZ_GRADE",
  "CA_VIZ_GRADES",
  "CA_VIZ_INCLUDE_PREMIUM",
  "CA_VIZ_LAB",
  "CA_VIZ_LABS",
  "CA_VIZ_MATRIX_RUN_ID",
  "CA_VIZ_MAX_VISITS_PER_PACKAGE",
  "CA_VIZ_SHARD",
  "CA_VIZ_SHARD_INDEX",
  "CA_VIZ_SHARD_TOTAL",
  "CA_VIZ_SOURCE_SNAPSHOT_SHA256",
  "CA_VIZ_TEST_TIMEOUT_MS",
  "CA_VIZ_UX_BUDGET_MS",
  "GITHUB_SHA"
] as const;

export function buildBroadProducerLifecycleContract(options: {
  env: NodeJS.ProcessEnv;
  sourceRoot: string;
}) {
  assert.equal(path.isAbsolute(options.sourceRoot), true,
    "California broad producer source root must be absolute");
  const originalCwd = process.cwd();
  const originalValues = new Map<string, string | undefined>(
    CALIFORNIA_BROAD_PROCESS_CONTEXT_ENV_KEYS.map((key) => [key, process.env[key]])
  );
  try {
    process.chdir(options.sourceRoot);
    for (const key of CALIFORNIA_BROAD_PROCESS_CONTEXT_ENV_KEYS) {
      const value = options.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const config = readCaliforniaQaConfig();
    assert.equal(config.shard, null, "California broad producer contract forbids shards");
    assert.equal(config.labIds.size, 0, "California broad producer contract forbids lab filters");
    assert.equal(config.includePremiumDirect, true,
      "California broad producer contract requires premium direct routes");
    const provenance = buildCaliforniaVisualizationCoverageRunIdentity(
      buildCaliforniaCoverageProvenance(config, { requireRunIdentity: true })
    );
    const packages = buildCaliforniaQaWorkItems(config).map((workItem) => workItem.id);
    assert.equal(new Set(packages).size, packages.length,
      "California broad producer contract repeats a source-derived package");
    return {
      expectedMatrix: buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
        packages,
        provenance
      }),
      packages,
      provenance
    };
  } finally {
    for (const key of CALIFORNIA_BROAD_PROCESS_CONTEXT_ENV_KEYS) {
      const value = originalValues.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    process.chdir(originalCwd);
  }
}

export async function buildExhaustiveProducerLifecycleContract(options: {
  buildId: string;
  canvasContract: ReturnType<typeof buildCaliforniaCanvasGraphicsSourceContract>;
  executionGroupOwnershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
  manifest: ReturnType<typeof buildCaliforniaSignatureSourceManifest>;
  markers: Parameters<typeof buildCaliforniaSignatureArtifactRunIdentity>[0]["markers"];
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
}) {
  const expectedIdentity = buildCaliforniaSignatureArtifactRunIdentity({
    buildId: options.buildId,
    markers: options.markers,
    origin: options.origin,
    runId: options.runId,
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: options.sourceSnapshotSha256
  });
  assert.equal(options.executionGroupOwnershipManifest.sourceSnapshotSha256,
    options.sourceSnapshotSha256,
  "California exhaustive producer ownership mixes source snapshots");
  const packages = options.executionGroupOwnershipManifest.packages.map((workPackage) => ({
    id: workPackage.packageId
  }));
  assert.equal(packages.length, 51,
    "California exhaustive producer contract requires the group-owned 51-package matrix");
  const expectedMatrix = buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: options.executionGroupOwnershipManifest,
    runId: expectedIdentity.runId,
    shardTotal: 1
  });
  assert.equal(expectedMatrix.size, 102,
    "California exhaustive producer contract requires 51 packages by two projects");
  const expectedArtifactsSha256 = sha256(stableJson(
    [...expectedMatrix.values()].sort((left, right) => left.fileName.localeCompare(right.fileName))
  ));
  const sourceEvidenceOracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(
    options.manifest,
    { canvasContract: options.canvasContract }
  );
  const externalExpectations = buildCaliforniaSignatureExternalEvidenceExpectations({
    expectedOrigin: expectedIdentity.origin,
    expectedRuntimeRunId: expectedIdentity.runtimeRunId,
    manifest: options.manifest
  });
  const validationContexts = new Map(
    options.executionGroupOwnershipManifest.packages.flatMap((workPackage) =>
      workPackage.projects.map((slice) => {
        const executionGroupOwnership = {
          cropCount: slice.cropCount,
          expectedRecordCount: slice.expectedRecordCount,
          groupKeys: [...slice.groupKeys],
          planSha256: options.executionGroupOwnershipManifest.capacityPlanSha256,
          receiptCount: slice.receiptCount,
          schemaVersion: options.executionGroupOwnershipManifest.schemaVersion,
          sourceIdentitySha256: options.executionGroupOwnershipManifest.sourceIdentitySha256,
          sourceSnapshotSha256: options.executionGroupOwnershipManifest.sourceSnapshotSha256
        } as const;
        return [
          californiaSignatureArtifactValidationContextKey(
            slice.projectName,
            workPackage.packageId
          ),
          buildCaliforniaSignatureArtifactValidationContext({
            executionGroupOwnership,
            expectedBenchIds: slice.benchIds,
            externalExpectations,
            manifest: options.manifest,
            projectName: slice.projectName,
            sourceEvidenceOracle
          })
        ] as const;
      })
    )
  );
  return {
    expectedArtifactsSha256,
    expectedIdentity,
    expectedMatrix,
    externalExpectations,
    packages,
    sourceEvidenceOracle,
    validationContexts
  };
}

export function buildCaliforniaExhaustiveExpectedReportIdentities(
  packages: readonly { id: string }[]
) {
  assert.equal(packages.length, 51,
    "California exhaustive report identity contract requires exactly 51 source-derived packages");
  const packageIds = packages.map((workPackage) => workPackage.id);
  assert.equal(new Set(packageIds).size, packageIds.length,
    "California exhaustive report identity contract repeats a package ID");
  return CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) =>
    packageIds.map((packageId) =>
      `${projectName}\0${packageId} exhausts source-attributed lesson/control states`
    )
  );
}

export async function verifyBroadOpenRunAndReportBeforeFinalizer(options: {
  buildId: string;
  ledgerRoot: string;
  matrixRunId: string;
  reportPath: string;
  sourceSnapshotSha256: string;
}) {
  assertSha256(options.sourceSnapshotSha256,
    "California broad open run frozen source snapshot SHA");
  const runDirectory = path.join(options.ledgerRoot, options.matrixRunId);
  await assertDirectoryNoSymlink(runDirectory, "California broad open run directory");
  const entries = (await readdir(runDirectory)).sort();
  assert.equal(entries.includes(CALIFORNIA_BROAD_RUN_SEAL_FILENAME), false,
    "broad finalizer must not start from an already sealed run");
  const unknown = entries.filter((entry) =>
    entry !== CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME &&
    !entry.endsWith(CALIFORNIA_BROAD_OFFICIAL_SUFFIX)
  );
  assert.deepEqual(unknown, [],
    "broad open run contains pending/failure/partial/temp/unknown artifacts before finalization");
  const manifest = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME),
    "California broad open run manifest"
  );
  exactRecord(manifest.value.provenance, "California broad open run provenance");
  assert.equal(manifest.value.provenance.matrixRunId, options.matrixRunId,
    "California broad open run mixes matrixRunId");
  assert.equal(manifest.value.provenance.buildId, options.buildId,
    "California broad open run mixes buildId");
  assert.equal(manifest.value.provenance.sourceSnapshotSha256, options.sourceSnapshotSha256,
    "California broad open run mixes frozen sourceSnapshotSha256");
  assert.ok(Array.isArray(manifest.value.requiredPackages) && manifest.value.requiredPackages.length > 0,
    "California broad open run manifest has no source-derived required packages");
  assert.ok(Array.isArray(manifest.value.requiredProjects),
    "California broad open run manifest has no required projects");
  exactStrings(
    CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
    manifest.value.requiredProjects as string[],
    "California broad open run required projects"
  );
  assert.deepEqual(manifest.value.requiredRepeatEachIndices, [0],
    "California broad open run must be exact repeatEach=1/repeatEachIndex=0");
  assert.ok(Array.isArray(manifest.value.expectedArtifacts),
    "California broad open run manifest has no expected artifact matrix");
  const packages = manifest.value.requiredPackages as string[];
  assert.equal(new Set(packages).size, packages.length,
    "California broad open run repeats a source-derived package");
  const expectedArtifactCount = packages.length * CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.length;
  assert.equal((manifest.value.expectedArtifacts as unknown[]).length, expectedArtifactCount,
    "California broad open run expected artifact matrix cardinality drifted");
  const artifactNames = entries.filter((entry) => entry.endsWith(CALIFORNIA_BROAD_OFFICIAL_SUFFIX));
  assert.equal(artifactNames.length, expectedArtifactCount,
    "California broad Playwright exit=0 did not publish the exact open artifact matrix");
  for (const fileName of artifactNames) {
    const artifact = await readJsonObject(path.join(runDirectory, fileName),
      `California broad open artifact ${fileName}`);
    assert.equal(artifact.value.terminalStatus, "passed", `${fileName}: open artifact did not pass`);
    exactRecord(artifact.value.execution, `${fileName} open execution`);
    assert.equal(artifact.value.execution.retry, 0, `${fileName}: open artifact retry is forbidden`);
  }
  const report = await verifyPlaywrightJsonReport({
    expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
    expectedTestCount: expectedArtifactCount +
      CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES.length * CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.length,
    reportPath: options.reportPath
  });
  const expectedIdentities = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) => [
    ...CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES.map((title) =>
      `${projectName}\0canary:${title}`
    ),
    ...packages.map((packageId) => `${projectName}\0package:${packageId}`)
  ]);
  const actualIdentities = report.identities.map((identity) => {
    const separator = identity.indexOf("\0");
    const projectName = identity.slice(0, separator);
    const title = identity.slice(separator + 1);
    if ((CALIFORNIA_BROAD_NON_ARTIFACT_TEST_TITLES as readonly string[]).includes(title)) {
      return `${projectName}\0canary:${title}`;
    }
    const packagesMatchingTitle = packages.filter((packageId) => title.startsWith(`${packageId} (`));
    assert.equal(packagesMatchingTitle.length, 1,
      `${projectName}/${title}: broad report identity is not one exact canary or source package`);
    return `${projectName}\0package:${packagesMatchingTitle[0]}`;
  });
  exactStrings(expectedIdentities, actualIdentities,
    "California broad Playwright exact report identities before finalizer");
  return { artifactCount: expectedArtifactCount, packages, reportSha256: report.sha256 };
}

export async function verifyProductSmokeManifest(options: {
  acceptanceRunId: string;
  buildId: string;
  manifestPath: string;
  receiptDir?: string;
  sourceSnapshotSha256: string;
}) {
  const read = await readJsonObject(options.manifestPath, "California product smoke manifest");
  exactKeys(read.value, [
    "acceptanceRunId",
    "actualNextBuildId",
    "buildId",
    "canvasNonTextClaim",
    "checks",
    "crashpadContainment",
    "crashpadDir",
    "directoryRoutes",
    "graphicsReceipts",
    "instrumentation",
    "premiumRoutes",
    "projects",
    "receiptFiles",
    "schemaVersion",
    "sourceSnapshotSha256",
    "status"
  ], "California product smoke manifest");
  assert.equal(read.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION);
  assert.equal(read.value.status, "passed");
  assert.equal(read.value.acceptanceRunId, options.acceptanceRunId);
  assert.equal(read.value.buildId, options.buildId);
  assert.ok(typeof read.value.actualNextBuildId === "string");
  assert.ok(read.value.actualNextBuildId.length >= 8 && read.value.actualNextBuildId.length <= 256,
    "product smoke actual Next BUILD_ID is missing or unsafe");
  assert.equal(read.value.sourceSnapshotSha256, options.sourceSnapshotSha256);
  assert.equal(read.value.instrumentation, "none",
    "product smoke instrumentation must be exactly none");
  assert.equal(read.value.canvasNonTextClaim, false,
    "product smoke canvasNonTextClaim must be false");
  assert.equal(read.value.graphicsReceipts, 0,
    "product smoke graphicsReceipts must be zero");
  assertProductSmokeCrashpadContainment(
    read.value.crashpadContainment,
    read.value.crashpadDir,
    "product smoke manifest"
  );
  assert.ok(Array.isArray(read.value.projects), "product smoke projects must be an array");
  exactStrings(CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS, read.value.projects as string[],
    "product smoke projects");
  assert.ok(Array.isArray(read.value.checks), "product smoke checks must be an array");
  const checks = read.value.checks as Array<Record<string, unknown>>;
  const expectedKeys = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.flatMap((projectName) =>
    CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS.map((checkId) => `${projectName}\0${checkId}`)
  );
  const actualKeys = checks.map((check, index) => {
    exactRecord(check, `product smoke check ${index}`);
    exactKeys(check, ["checkId", "projectName", "status"], `product smoke check ${index}`);
    assert.equal(check.status, "passed", `product smoke check ${index}: status drifted`);
    return `${check.projectName}\0${check.checkId}`;
  });
  exactStrings(expectedKeys, actualKeys, "product smoke exact check manifest");
  assert.ok(Array.isArray(read.value.directoryRoutes), "product smoke directory routes must be an array");
  assert.equal(read.value.directoryRoutes.length, 76,
    "product smoke must bind the exact 76 visited California directory routes");
  exactStrings(read.value.directoryRoutes as string[], read.value.directoryRoutes as string[],
    "product smoke directory route identities");
  assert.ok(Array.isArray(read.value.premiumRoutes), "product smoke premium routes must be an array");
  exactStrings(read.value.premiumRoutes as string[], read.value.premiumRoutes as string[],
    "product smoke premium route identities");
  for (const labId of [...read.value.directoryRoutes, ...read.value.premiumRoutes]) {
    assert.ok(typeof labId === "string" && /^[a-z0-9][a-z0-9-]{2,127}$/.test(labId),
      `product smoke route identity is unsafe: ${JSON.stringify(labId)}`);
  }
  const directoryIds = new Set(read.value.directoryRoutes as string[]);
  for (const labId of read.value.premiumRoutes as string[]) {
    assert.ok(directoryIds.has(labId), `${labId}: premium route is absent from the California directory set`);
  }
  assert.ok(Array.isArray(read.value.receiptFiles), "product smoke receipt files must be an array");
  const receiptFiles = (read.value.receiptFiles as Array<Record<string, unknown>>).map((binding, index) => {
    exactRecord(binding, `product smoke receipt binding ${index}`);
    exactKeys(binding, ["fileName", "projectName", "sha256"], `product smoke receipt binding ${index}`);
    assertSha256(binding.sha256, `product smoke receipt binding ${index} SHA`);
    return binding;
  });
  assert.deepEqual(receiptFiles.map((binding) => binding.projectName),
    CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
    "product smoke receipt bindings are not in exact project order");
  for (const binding of receiptFiles) {
    assert.equal(binding.fileName, `${binding.projectName}${CALIFORNIA_PRODUCT_SMOKE_RECEIPT_SUFFIX}`,
      "product smoke receipt binding filename drifted");
  }
  if (options.receiptDir) {
    const verifiedReceipts = await verifyCaliforniaProductSmokeReceipts({
      acceptanceRunId: options.acceptanceRunId,
      actualNextBuildId: read.value.actualNextBuildId as string,
      buildId: options.buildId,
      receiptDir: options.receiptDir,
      sourceSnapshotSha256: options.sourceSnapshotSha256
    });
    assert.deepEqual(verifiedReceipts.receiptFiles, receiptFiles,
      "product smoke receipt byte SHA bindings drifted");
    assert.deepEqual(verifiedReceipts.receipts[0]!.directoryRoutes, read.value.directoryRoutes,
      "product smoke manifest mixes browser directory route identities");
    assert.deepEqual(verifiedReceipts.receipts[0]!.premiumRoutes, read.value.premiumRoutes,
      "product smoke manifest mixes browser premium route identities");
    assert.equal(verifiedReceipts.receipts[0]!.crashpadDir, read.value.crashpadDir,
      "product smoke manifest mixes the browser Crashpad directory");
    assert.deepEqual(verifiedReceipts.receipts[0]!.crashpadContainment, read.value.crashpadContainment,
      "product smoke manifest mixes the browser Crashpad containment binding");
  }
  return { manifest: read.value as unknown as CaliforniaProductSmokeManifest, sha256: read.sha256 };
}

function assertProductSmokeCrashpadContainment(
  rawContainment: unknown,
  rawCrashpadDir: unknown,
  label: string
): asserts rawContainment is CaliforniaCrashpadContainmentBinding {
  assert.ok(typeof rawCrashpadDir === "string" && path.isAbsolute(rawCrashpadDir),
    `${label}: crashpadDir must be one explicit absolute path`);
  const crashpadDir = path.resolve(rawCrashpadDir);
  assert.equal(crashpadDir, rawCrashpadDir, `${label}: crashpadDir must be normalized`);
  assert.ok(crashpadDir !== CALIFORNIA_ACCEPTANCE_STARSHIP_ROOT &&
    isInside(CALIFORNIA_ACCEPTANCE_STARSHIP_ROOT, crashpadDir),
  `${label}: crashpadDir must remain a strict descendant of /Volumes/Starship`);
  exactRecord(rawContainment, `${label} Crashpad containment`);
  exactKeys(rawContainment, ["argument", "scheme", "verificationBoundary"],
    `${label} Crashpad containment`);
  assert.equal(rawContainment.argument, `--breakpad-dump-location=${crashpadDir}`,
    `${label}: Crashpad launch argument drifted`);
  assert.equal(rawContainment.scheme, "chrome-command-line-switch",
    `${label}: Crashpad containment scheme drifted`);
  exactRecord(rawContainment.verificationBoundary, `${label} Crashpad verification boundary`);
  exactKeys(rawContainment.verificationBoundary,
    ["globalCrashpadSettingsIdentity", "processTree"],
    `${label} Crashpad verification boundary`);
  assert.equal(rawContainment.verificationBoundary.globalCrashpadSettingsIdentity,
    "external-runner-required", `${label}: global Crashpad settings audit was overclaimed`);
  assert.equal(rawContainment.verificationBoundary.processTree,
    "external-runner-required", `${label}: Crashpad process-tree audit was overclaimed`);
}

export async function verifyCaliforniaProductSmokeReceipts(options: {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  receiptDir: string;
  sourceSnapshotSha256: string;
}) {
  assertHighEntropyId(options.acceptanceRunId, "product smoke acceptanceRunId");
  assertBuildId(options.buildId);
  assertSha256(options.sourceSnapshotSha256, "product smoke source snapshot");
  assert.ok(options.actualNextBuildId.trim() && options.actualNextBuildId.length <= 256,
    "product smoke actual Next BUILD_ID is missing or unsafe");
  await assertDirectoryNoSymlink(options.receiptDir, "California product smoke receipt directory");
  const expectedFileNames = CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName) =>
    `${projectName}${CALIFORNIA_PRODUCT_SMOKE_RECEIPT_SUFFIX}`
  );
  const entries = await readdir(options.receiptDir, { withFileTypes: true });
  assert.deepEqual(entries.map((entry) => entry.name).sort(), [...expectedFileNames].sort(),
    "California product smoke receipt directory must contain the exact two project receipts and no extras");
  const receipts: CaliforniaProductSmokeReceipt[] = [];
  const receiptFiles: CaliforniaProductSmokeManifest["receiptFiles"] = [];
  for (const [index, projectName] of CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.entries()) {
    const fileName = expectedFileNames[index]!;
    const entry = entries.find((candidate) => candidate.name === fileName);
    assert.ok(entry?.isFile() && !entry.isSymbolicLink(), `${fileName}: product receipt must be one regular file`);
    const read = await readJsonObject(path.join(options.receiptDir, fileName),
      `California product smoke ${projectName} browser receipt`);
    exactKeys(read.value, [
      "acceptanceRunId",
      "actualNextBuildId",
      "buildId",
      "canvasNonTextClaim",
      "checks",
      "crashpadContainment",
      "crashpadDir",
      "directoryRoutes",
      "graphicsReceipts",
      "instrumentation",
      "premiumRoutes",
      "projectName",
      "schemaVersion",
      "sourceSnapshotSha256",
      "status"
    ], `${projectName} product smoke browser receipt`);
    assert.equal(read.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION);
    assert.equal(read.value.status, "passed");
    assert.equal(read.value.acceptanceRunId, options.acceptanceRunId);
    assert.equal(read.value.actualNextBuildId, options.actualNextBuildId);
    assert.equal(read.value.buildId, options.buildId);
    assert.equal(read.value.sourceSnapshotSha256, options.sourceSnapshotSha256);
    assert.equal(read.value.projectName, projectName);
    assert.equal(read.value.instrumentation, "none");
    assert.equal(read.value.canvasNonTextClaim, false);
    assert.equal(read.value.graphicsReceipts, 0);
    assertProductSmokeCrashpadContainment(
      read.value.crashpadContainment,
      read.value.crashpadDir,
      `${projectName} product smoke browser receipt`
    );
    assert.ok(Array.isArray(read.value.checks), `${projectName}: checks must be an array`);
    exactStrings(CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS, read.value.checks as string[],
      `${projectName} exact product checks`);
    assert.deepEqual(read.value.checks, CALIFORNIA_PRODUCT_SMOKE_CHECK_IDS,
      `${projectName}: product checks are not in canonical order`);
    assert.ok(Array.isArray(read.value.directoryRoutes), `${projectName}: directoryRoutes must be an array`);
    assert.equal(read.value.directoryRoutes.length, 76,
      `${projectName}: product receipt must bind all 76 California directory routes`);
    exactStrings(read.value.directoryRoutes as string[], read.value.directoryRoutes as string[],
      `${projectName} directory route identities`);
    assert.ok(Array.isArray(read.value.premiumRoutes), `${projectName}: premiumRoutes must be an array`);
    exactStrings(read.value.premiumRoutes as string[], read.value.premiumRoutes as string[],
      `${projectName} premium route identities`);
    const directoryIds = new Set(read.value.directoryRoutes as string[]);
    for (const labId of [...read.value.directoryRoutes, ...read.value.premiumRoutes]) {
      assert.ok(typeof labId === "string" && /^[a-z0-9][a-z0-9-]{2,127}$/.test(labId),
        `${projectName}: unsafe product route identity ${JSON.stringify(labId)}`);
    }
    for (const labId of read.value.premiumRoutes as string[]) {
      assert.ok(directoryIds.has(labId), `${projectName}/${labId}: premium route is absent from directory routes`);
    }
    receipts.push(read.value as unknown as CaliforniaProductSmokeReceipt);
    receiptFiles.push({ fileName, projectName, sha256: read.sha256 });
  }
  assert.deepEqual(receipts[1]!.directoryRoutes, receipts[0]!.directoryRoutes,
    "product smoke projects visited mixed directory route identities");
  assert.deepEqual(receipts[1]!.premiumRoutes, receipts[0]!.premiumRoutes,
    "product smoke projects visited mixed premium route identities");
  assert.equal(receipts[1]!.crashpadDir, receipts[0]!.crashpadDir,
    "product smoke projects used mixed Crashpad directories");
  assert.deepEqual(receipts[1]!.crashpadContainment, receipts[0]!.crashpadContainment,
    "product smoke projects used mixed Crashpad containment bindings");
  return { receiptFiles, receipts };
}

export function buildCaliforniaProductSmokeManifest(options: {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  receiptFiles: CaliforniaProductSmokeManifest["receiptFiles"];
  receipts: readonly CaliforniaProductSmokeReceipt[];
  sourceSnapshotSha256: string;
}): CaliforniaProductSmokeManifest {
  assert.equal(options.receipts.length, CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.length,
    "product smoke manifest requires exact per-project browser receipts");
  const canonical = options.receipts[0]!;
  return {
    acceptanceRunId: options.acceptanceRunId,
    actualNextBuildId: options.actualNextBuildId,
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
      argument: canonical.crashpadContainment.argument,
      scheme: canonical.crashpadContainment.scheme,
      verificationBoundary: { ...canonical.crashpadContainment.verificationBoundary }
    },
    crashpadDir: canonical.crashpadDir,
    directoryRoutes: [...canonical.directoryRoutes],
    graphicsReceipts: 0,
    instrumentation: "none",
    premiumRoutes: [...canonical.premiumRoutes],
    projects: [...CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS],
    receiptFiles: options.receiptFiles.map((binding) => ({ ...binding })),
    schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "passed"
  };
}

export async function publishCaliforniaProductSmokeManifest(options: {
  acceptanceRunId: string;
  actualNextBuildId: string;
  buildId: string;
  manifestPath: string;
  receiptDir: string;
  sourceSnapshotSha256: string;
}) {
  const verifiedReceipts = await verifyCaliforniaProductSmokeReceipts(options);
  const manifest = buildCaliforniaProductSmokeManifest({ ...options, ...verifiedReceipts });
  const published = await writeExclusiveJson(options.manifestPath, manifest);
  const verified = await verifyProductSmokeManifest(options);
  assert.equal(verified.sha256, published.sha256,
    "California product smoke manifest changed after orchestrator publication");
  return verified;
}

export function buildLayerAReceipt(options: Omit<CaliforniaLayerAReceipt,
  "canvasNonTextClaim" | "graphicsReceipts" | "instrumentation" | "schemaVersion" | "status"
>): CaliforniaLayerAReceipt {
  assertHighEntropyId(options.acceptanceRunId, "Layer A acceptanceRunId");
  assertBuildId(options.buildId);
  assertSha256(options.playwrightReportSha256, "Layer A Playwright report");
  assertSha256(options.productSmokeManifestSha256, "Layer A product smoke manifest");
  assertSha256(options.sourceSnapshotSha256, "Layer A source snapshot");
  assert.ok(options.actualNextBuildId.trim() && options.actualNextBuildId.length <= 256,
    "Layer A actual Next build ID is missing or unsafe");
  return {
    ...options,
    canvasNonTextClaim: false,
    graphicsReceipts: 0,
    instrumentation: "none",
    schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    status: "passed"
  };
}

async function sealLayerA(receiptPath: string, sealPath: string, receipt: CaliforniaLayerAReceipt) {
  const receiptWrite = await writeExclusiveJson(receiptPath, receipt);
  const seal = {
    acceptanceRunId: receipt.acceptanceRunId,
    buildId: receipt.buildId,
    canvasNonTextClaim: false,
    graphicsReceipts: 0,
    instrumentation: "none",
    receiptFileName: path.basename(receiptPath),
    receiptSha256: receiptWrite.sha256,
    schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    sourceSnapshotSha256: receipt.sourceSnapshotSha256,
    status: "sealed"
  } as const;
  const sealWrite = await writeExclusiveJson(sealPath, seal);
  const reread = await readJsonObject(sealPath, "Layer A terminal seal");
  assert.equal(reread.sha256, sealWrite.sha256, "Layer A terminal seal changed after publication");
  assert.equal(reread.value.receiptSha256, receiptWrite.sha256,
    "Layer A terminal seal no longer binds its receipt");
  return { fileName: path.basename(sealPath), sha256: sealWrite.sha256 };
}

function exactArtifactFiles(options: {
  allowedExactNames?: readonly string[];
  artifactSuffix: string;
  entries: string[];
  manifestName: string;
  sealName: string;
  label: string;
}) {
  const unknown = options.entries.filter((name) =>
    name !== options.manifestName &&
    name !== options.sealName &&
    !(options.allowedExactNames ?? []).includes(name) &&
    !name.endsWith(options.artifactSuffix)
  );
  assert.deepEqual(unknown, [], `${options.label}: failure/partial/temp/unknown artifacts are forbidden`);
  for (const name of options.entries) {
    if (name === options.manifestName || name === options.sealName ||
        (options.allowedExactNames ?? []).includes(name)) continue;
    assert.doesNotMatch(name, FORBIDDEN_GENERATED_NAME_PATTERN,
      `${options.label}: forbidden skip/retry/failure/partial/temp artifact name`);
  }
}

function validateArtifactByteIdentities(value: unknown, label: string) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: expected a nonempty artifact array`);
  const rows = value.map((candidate, index) => {
    exactRecord(candidate, `${label} row ${index}`);
    exactKeys(candidate, ["artifactId", "fileName", "sha256"], `${label} row ${index}`);
    assert.ok(typeof candidate.artifactId === "string" && candidate.artifactId.length > 0,
      `${label} row ${index}: artifactId is invalid`);
    assert.ok(typeof candidate.fileName === "string" && candidate.fileName.length > 0 &&
      path.basename(candidate.fileName) === candidate.fileName,
    `${label} row ${index}: fileName is invalid`);
    assertSha256(candidate.sha256, `${label} row ${index} SHA`);
    return {
      artifactId: candidate.artifactId,
      fileName: candidate.fileName,
      sha256: candidate.sha256
    };
  });
  assert.equal(new Set(rows.map((row) => row.artifactId)).size, rows.length,
    `${label}: artifactIds repeat`);
  assert.equal(new Set(rows.map((row) => row.fileName)).size, rows.length,
    `${label}: fileNames repeat`);
  assert.deepEqual(rows, [...rows].sort((left, right) => left.fileName.localeCompare(right.fileName)),
    `${label}: artifact byte identities are not sorted by fileName`);
  return rows;
}

export function validateCaliforniaExhaustiveArtifactByteIdentities(
  value: unknown,
  label: string
): CaliforniaExhaustiveStreamBinding[] {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: expected a nonempty artifact array`);
  const rows = value.map((candidate, index) => {
    exactRecord(candidate, `${label} row ${index}`);
    exactKeys(candidate, [
      "artifactId",
      "evidenceChunkMerkleRootSha256",
      "evidenceChunks",
      "evidenceFramedBytes",
      "evidenceManifestSha256",
      "evidenceRecordCount",
      "evidenceStreamOwnershipSha256",
      "executionGroupOwnership",
      "fileName",
      "sha256"
    ], `${label} row ${index}`);
    assert.ok(typeof candidate.artifactId === "string" && candidate.artifactId.length > 0,
      `${label} row ${index}: artifactId is invalid`);
    assert.ok(typeof candidate.fileName === "string" && candidate.fileName.length > 0 &&
      path.basename(candidate.fileName) === candidate.fileName,
    `${label} row ${index}: fileName is invalid`);
    assertSha256(candidate.sha256, `${label} row ${index} SHA`);
    assertSha256(candidate.evidenceChunkMerkleRootSha256,
      `${label} row ${index} evidence chunk Merkle root`);
    assertSha256(candidate.evidenceManifestSha256,
      `${label} row ${index} evidence stream manifest SHA`);
    assertSha256(candidate.evidenceStreamOwnershipSha256,
      `${label} row ${index} evidence stream ownership SHA`);
    exactRecord(candidate.executionGroupOwnership,
      `${label} row ${index} execution-group ownership`);
    exactKeys(candidate.executionGroupOwnership, [
      "cropCount",
      "expectedRecordCount",
      "groupKeys",
      "planSha256",
      "receiptCount",
      "schemaVersion",
      "sourceIdentitySha256",
      "sourceSnapshotSha256"
    ], `${label} row ${index} execution-group ownership`);
    assert.ok(Array.isArray(candidate.executionGroupOwnership.groupKeys) &&
      candidate.executionGroupOwnership.groupKeys.length > 0 &&
      new Set(candidate.executionGroupOwnership.groupKeys).size ===
        candidate.executionGroupOwnership.groupKeys.length,
    `${label} row ${index}: execution-group ownership groupKeys are invalid`);
    for (const groupKey of candidate.executionGroupOwnership.groupKeys) {
      assert.ok(typeof groupKey === "string" && groupKey.split("\0").length === 4,
        `${label} row ${index}: execution-group ownership groupKey is invalid`);
    }
    for (const key of ["planSha256", "sourceIdentitySha256", "sourceSnapshotSha256"] as const) {
      assertSha256(candidate.executionGroupOwnership[key],
        `${label} row ${index} execution-group ownership ${key}`);
    }
    assert.equal(candidate.executionGroupOwnership.schemaVersion, 1,
      `${label} row ${index}: execution-group ownership schema drifted`);
    for (const key of ["cropCount", "receiptCount"] as const) {
      assert.ok(Number.isSafeInteger(candidate.executionGroupOwnership[key]) &&
        Number(candidate.executionGroupOwnership[key]) >= 0,
      `${label} row ${index}: execution-group ownership ${key} is invalid`);
    }
    assert.ok(Number.isSafeInteger(candidate.executionGroupOwnership.expectedRecordCount) &&
      Number(candidate.executionGroupOwnership.expectedRecordCount) > 0,
    `${label} row ${index}: execution-group ownership expectedRecordCount is invalid`);
    assert.ok(Array.isArray(candidate.evidenceChunks) && candidate.evidenceChunks.length > 0,
      `${label} row ${index}: evidenceChunks must be nonempty`);
    const chunks = candidate.evidenceChunks.map((chunk, chunkIndex) => {
      exactRecord(chunk, `${label} row ${index} chunk ${chunkIndex}`);
      exactKeys(chunk, [
        "fileName",
        "framedBytes",
        "recordCount",
        "recordMerkleRootSha256",
        "sha256"
      ], `${label} row ${index} chunk ${chunkIndex}`);
      assert.ok(typeof chunk.fileName === "string" &&
        path.basename(chunk.fileName) === chunk.fileName && chunk.fileName.endsWith(".frame"),
      `${label} row ${index} chunk ${chunkIndex}: fileName is invalid`);
      assert.ok(Number.isSafeInteger(chunk.framedBytes) && Number(chunk.framedBytes) > 0,
        `${label} row ${index} chunk ${chunkIndex}: framedBytes is invalid`);
      assert.ok(Number.isSafeInteger(chunk.recordCount) && Number(chunk.recordCount) > 0,
        `${label} row ${index} chunk ${chunkIndex}: recordCount is invalid`);
      assertSha256(chunk.recordMerkleRootSha256,
        `${label} row ${index} chunk ${chunkIndex} record Merkle root`);
      assertSha256(chunk.sha256, `${label} row ${index} chunk ${chunkIndex} SHA`);
      return {
        fileName: chunk.fileName,
        framedBytes: Number(chunk.framedBytes),
        recordCount: Number(chunk.recordCount),
        recordMerkleRootSha256: chunk.recordMerkleRootSha256,
        sha256: chunk.sha256
      };
    });
    assert.equal(new Set(chunks.map((chunk) => chunk.fileName)).size, chunks.length,
      `${label} row ${index}: evidence chunk filenames repeat`);
    assert.deepEqual(chunks,
      [...chunks].sort((left, right) => left.fileName.localeCompare(right.fileName)),
      `${label} row ${index}: evidence chunks are not in filename order`);
    const evidenceFramedBytes = candidate.evidenceFramedBytes;
    assert.ok(typeof evidenceFramedBytes === "number" &&
      Number.isSafeInteger(evidenceFramedBytes) && evidenceFramedBytes > 0,
      `${label} row ${index}: evidenceFramedBytes is invalid`);
    const evidenceRecordCount = candidate.evidenceRecordCount;
    assert.ok(typeof evidenceRecordCount === "number" &&
      Number.isSafeInteger(evidenceRecordCount) && evidenceRecordCount > 0,
      `${label} row ${index}: evidenceRecordCount is invalid`);
    assert.equal(
      chunks.reduce((sum, chunk) => sum + chunk.framedBytes, 0),
      evidenceFramedBytes,
      `${label} row ${index}: chunk bytes do not sum to evidenceFramedBytes`
    );
    assert.equal(
      chunks.reduce((sum, chunk) => sum + chunk.recordCount, 0),
      evidenceRecordCount,
      `${label} row ${index}: chunk records do not sum to evidenceRecordCount`
    );
    assert.equal(
      californiaSignatureEvidenceMerkleRootSha256(chunks.map((chunk) => chunk.sha256)),
      candidate.evidenceChunkMerkleRootSha256,
      `${label} row ${index}: chunk list does not recompute the Merkle root`
    );
    return {
      artifactId: candidate.artifactId as string,
      evidenceChunkMerkleRootSha256: candidate.evidenceChunkMerkleRootSha256 as string,
      evidenceChunks: chunks,
      evidenceFramedBytes,
      evidenceManifestSha256: candidate.evidenceManifestSha256 as string,
      evidenceRecordCount,
      evidenceStreamOwnershipSha256: candidate.evidenceStreamOwnershipSha256 as string,
      executionGroupOwnership: structuredClone(candidate.executionGroupOwnership) as
        CaliforniaSignatureExecutionGroupOwnership,
      fileName: candidate.fileName as string,
      sha256: candidate.sha256 as string
    };
  });
  assert.equal(new Set(rows.map((row) => row.artifactId)).size, rows.length,
    `${label}: artifactIds repeat`);
  assert.equal(new Set(rows.map((row) => row.fileName)).size, rows.length,
    `${label}: fileNames repeat`);
  const chunkFileNames = rows.flatMap((row) =>
    row.evidenceChunks.map((chunk) => chunk.fileName)
  );
  assert.equal(new Set(chunkFileNames).size, chunkFileNames.length,
    `${label}: evidence chunk fileNames repeat`);
  assert.deepEqual(rows, [...rows].sort((left, right) => left.fileName.localeCompare(right.fileName)),
    `${label}: artifact byte identities are not sorted by fileName`);
  return rows;
}

function validateBroadExpectedArtifactIdentities(value: unknown, label: string) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: expected a nonempty artifact array`);
  const rows = value.map((candidate, index) => {
    exactRecord(candidate, `${label} row ${index}`);
    exactKeys(candidate, [
      "artifactId",
      "execution",
      "fileName",
      "packageId",
      "projectName"
    ], `${label} row ${index}`);
    for (const key of ["artifactId", "packageId", "projectName"] as const) {
      assert.ok(typeof candidate[key] === "string" && candidate[key].length > 0,
        `${label} row ${index}: ${key} is invalid`);
    }
    assert.ok(typeof candidate.fileName === "string" && candidate.fileName.length > 0 &&
      path.basename(candidate.fileName) === candidate.fileName,
    `${label} row ${index}: fileName is invalid`);
    exactRecord(candidate.execution, `${label} row ${index} execution`);
    exactKeys(candidate.execution, ["repeatEachIndex", "retry"],
      `${label} row ${index} execution`);
    assert.ok(Number.isSafeInteger(candidate.execution.repeatEachIndex) &&
      (candidate.execution.repeatEachIndex as number) >= 0,
    `${label} row ${index}: repeatEachIndex is invalid`);
    assert.equal(candidate.execution.retry, 0, `${label} row ${index}: retry is forbidden`);
    return {
      artifactId: candidate.artifactId as string,
      execution: {
        repeatEachIndex: candidate.execution.repeatEachIndex as number,
        retry: 0 as const
      },
      fileName: candidate.fileName,
      packageId: candidate.packageId as string,
      projectName: candidate.projectName as string
    };
  });
  assert.equal(new Set(rows.map((row) => row.artifactId)).size, rows.length,
    `${label}: artifactIds repeat`);
  assert.equal(new Set(rows.map((row) => row.fileName)).size, rows.length,
    `${label}: fileNames repeat`);
  assert.deepEqual(rows, [...rows].sort((left, right) => left.fileName.localeCompare(right.fileName)),
    `${label}: expected artifact identities are not sorted by fileName`);
  return rows;
}

export function parseUniqueTerminalSealReceipt(options: {
  expectedFileName: string;
  label: string;
  output: string;
}) {
  const escapedFileName = options.expectedFileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${options.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: ` +
    `(\\d+) artifacts; (${escapedFileName})=([a-f0-9]{64})`,
    "g"
  );
  const matches = [...options.output.matchAll(pattern)];
  assert.equal(matches.length, 1,
    `${options.label}: expected one unique external terminal seal receipt line`);
  const artifactCount = Number(matches[0]![1]);
  assert.ok(Number.isSafeInteger(artifactCount) && artifactCount > 0,
    `${options.label}: external receipt artifact count is invalid`);
  return {
    artifactCount,
    fileName: matches[0]![2]!,
    sha256: matches[0]![3]!
  };
}

export async function verifyBroadTerminalSeal(options: {
  buildId: string;
  expectedArtifactCount: number;
  expectedPlaywrightReportSha256: string;
  expectedProducerSuccessSha256: string;
  expectedSealSha256: string;
  frozenSourceSnapshotSha256: string;
  ledgerRoot: string;
  matrixRunId: string;
}) {
  assertSha256(options.frozenSourceSnapshotSha256, "California broad frozen source snapshot SHA");
  assertSha256(options.expectedPlaywrightReportSha256,
    "California broad verified Playwright report SHA");
  assertSha256(options.expectedProducerSuccessSha256,
    "California broad external producer-success receipt SHA");
  assertSha256(options.expectedSealSha256, "California broad external seal receipt SHA");
  const runDirectory = path.join(options.ledgerRoot, options.matrixRunId);
  await assertDirectoryNoSymlink(runDirectory, "California broad terminal run directory");
  const entries = (await readdir(runDirectory)).sort();
  exactArtifactFiles({
    allowedExactNames: [CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME],
    artifactSuffix: CALIFORNIA_BROAD_OFFICIAL_SUFFIX,
    entries,
    label: "California broad terminal run",
    manifestName: CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME,
    sealName: CALIFORNIA_BROAD_RUN_SEAL_FILENAME
  });
  const manifest = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_BROAD_RUN_MANIFEST_FILENAME),
    "California broad run manifest"
  );
  exactKeys(manifest.value, [
    "expectedArtifacts",
    "expectedArtifactsSha256",
    "lifecycleSchemaVersion",
    "officialArtifactSuffix",
    "provenance",
    "provenanceSha256",
    "requiredPackages",
    "requiredProjects",
    "requiredRepeatEachIndices",
    "schemaVersion",
    "status"
  ], "California broad terminal manifest");
  assert.equal(
    manifest.value.lifecycleSchemaVersion,
    CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    "California broad terminal manifest lifecycle schema drifted"
  );
  assert.equal(
    manifest.value.schemaVersion,
    CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    "California broad terminal manifest payload schema drifted"
  );
  assert.equal(manifest.value.officialArtifactSuffix, CALIFORNIA_BROAD_OFFICIAL_SUFFIX,
    "California broad terminal manifest official artifact suffix drifted");
  assert.equal(manifest.value.status, "open", "California broad terminal manifest is not open");
  const manifestExpectedArtifacts = validateBroadExpectedArtifactIdentities(
    manifest.value.expectedArtifacts,
    "California broad terminal manifest expected artifacts"
  );
  assert.equal(
    manifest.value.expectedArtifactsSha256,
    sha256(stableJson(manifestExpectedArtifacts)),
    "California broad terminal manifest expected artifact digest drifted"
  );
  assert.deepEqual(
    manifest.value.requiredPackages,
    [...new Set(manifestExpectedArtifacts.map((row) => row.packageId))].sort(),
    "California broad terminal manifest required package identities drifted"
  );
  assert.deepEqual(
    manifest.value.requiredProjects,
    [...new Set(manifestExpectedArtifacts.map((row) => row.projectName))].sort(),
    "California broad terminal manifest required project identities drifted"
  );
  assert.deepEqual(
    manifest.value.requiredRepeatEachIndices,
    [...new Set(manifestExpectedArtifacts.map((row) => row.execution.repeatEachIndex))]
      .sort((left, right) => left - right),
    "California broad terminal manifest repeatEach identities drifted"
  );
  exactRecord(manifest.value.provenance, "California broad terminal manifest provenance");
  exactKeys(manifest.value.provenance, CALIFORNIA_BROAD_PROVENANCE_KEYS,
    "California broad terminal manifest provenance");
  assertSha256(manifest.value.provenanceSha256,
    "California broad terminal manifest provenance SHA");
  assert.equal(
    manifest.value.provenanceSha256,
    sha256(stableJson(manifest.value.provenance)),
    "California broad terminal manifest provenanceSha256 does not bind exact provenance"
  );
  const seal = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_BROAD_RUN_SEAL_FILENAME),
    "California broad terminal seal"
  );
  const producerSuccess = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME),
    "California broad producer-success receipt"
  );
  assert.equal(producerSuccess.sha256, options.expectedProducerSuccessSha256,
    "California broad producer-success file differs from its in-memory external receipt");
  exactKeys(producerSuccess.value, [
    "artifacts",
    "expectedArtifactsSha256",
    "lifecycleSchemaVersion",
    "producerReportSha256",
    "provenance",
    "provenanceSha256",
    "publishedAt",
    "status"
  ], "California broad producer-success receipt");
  assert.equal(producerSuccess.value.status, "producer-succeeded",
    "California broad producer-success receipt is not terminal");
  assert.equal(
    producerSuccess.value.lifecycleSchemaVersion,
    CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    "California broad producer-success lifecycle schema drifted"
  );
  assert.equal(producerSuccess.value.producerReportSha256,
    options.expectedPlaywrightReportSha256,
    "California broad producer-success receipt does not bind the verified Playwright report");
  assertSha256(producerSuccess.value.expectedArtifactsSha256,
    "California broad producer-success expected matrix SHA");
  const producerArtifactRows = validateArtifactByteIdentities(
    producerSuccess.value.artifacts,
    "California broad producer-success artifacts"
  );
  exactRecord(producerSuccess.value.provenance,
    "California broad producer-success provenance");
  exactKeys(producerSuccess.value.provenance, CALIFORNIA_BROAD_PROVENANCE_KEYS,
    "California broad producer-success provenance");
  assertSha256(producerSuccess.value.provenanceSha256,
    "California broad producer-success provenance SHA");
  assert.equal(
    producerSuccess.value.provenanceSha256,
    sha256(stableJson(producerSuccess.value.provenance)),
    "California broad producer-success provenanceSha256 does not bind exact provenance"
  );
  assert.deepEqual(producerSuccess.value.provenance, manifest.value.provenance,
    "California broad producer-success receipt mixes manifest provenance");
  assert.equal(producerSuccess.value.provenanceSha256, manifest.value.provenanceSha256,
    "California broad producer-success receipt mixes manifest provenance hash");
  assert.equal(producerSuccess.value.provenance.buildId, options.buildId,
    "California broad producer-success receipt mixes buildId");
  assert.equal(producerSuccess.value.provenance.matrixRunId, options.matrixRunId,
    "California broad producer-success receipt mixes matrixRunId");
  assert.equal(producerSuccess.value.provenance.sourceSnapshotSha256,
    options.frozenSourceSnapshotSha256,
    "California broad producer-success receipt mixes frozen sourceSnapshotSha256");
  assert.equal(seal.sha256, options.expectedSealSha256,
    "California broad terminal seal differs from the finalizer's in-memory external receipt");
  exactKeys(seal.value, [
    "artifacts",
    "expectedArtifactsSha256",
    "lifecycleSchemaVersion",
    "manifestSha256",
    "producerReportSha256",
    "producerSuccessSha256",
    "provenance",
    "provenanceSha256",
    "sealedAt",
    "status"
  ], "California broad terminal seal");
  assert.equal(seal.value.status, "sealed", "California broad terminal seal is not sealed");
  assert.equal(
    seal.value.lifecycleSchemaVersion,
    CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    "California broad terminal seal lifecycle schema drifted"
  );
  exactRecord(seal.value.provenance, "California broad terminal provenance");
  exactKeys(seal.value.provenance, CALIFORNIA_BROAD_PROVENANCE_KEYS,
    "California broad terminal provenance");
  assertSha256(seal.value.provenanceSha256, "California broad terminal provenance SHA");
  assert.equal(
    seal.value.provenanceSha256,
    sha256(stableJson(seal.value.provenance)),
    "California broad terminal provenanceSha256 does not bind exact provenance"
  );
  assert.deepEqual(seal.value.provenance, producerSuccess.value.provenance,
    "California broad terminal seal mixes producer provenance");
  assert.equal(seal.value.provenanceSha256, producerSuccess.value.provenanceSha256,
    "California broad terminal seal mixes producer provenance hash");
  assertCanonicalIsoTimestamp(producerSuccess.value.publishedAt,
    "California broad producer-success publishedAt");
  assertCanonicalIsoTimestamp(seal.value.sealedAt, "California broad terminal sealedAt");
  assert.equal(seal.value.provenance.matrixRunId, options.matrixRunId,
    "California broad terminal seal mixes matrixRunId");
  assert.equal(seal.value.provenance.buildId, options.buildId,
    "California broad terminal seal mixes buildId");
  assertSha256(seal.value.provenance.sourceSnapshotSha256,
    "California broad terminal sourceSnapshotSha256");
  assert.equal(seal.value.provenance.sourceSnapshotSha256,
    options.frozenSourceSnapshotSha256,
    "California broad terminal seal mixes frozen sourceSnapshotSha256");
  assertSha256(seal.value.provenance.sourceHash, "California broad terminal sourceHash");
  assertSha256(seal.value.provenance.harnessHash, "California broad terminal harnessHash");
  assert.equal(seal.value.producerReportSha256, options.expectedPlaywrightReportSha256,
    "California broad terminal seal does not bind the verified Playwright report");
  assert.equal(seal.value.producerSuccessSha256, options.expectedProducerSuccessSha256,
    "California broad terminal seal does not bind the external producer-success receipt");
  assert.equal(seal.value.expectedArtifactsSha256, producerSuccess.value.expectedArtifactsSha256,
    "California broad terminal seal does not bind the producer expected matrix");
  assert.equal(manifest.value.expectedArtifactsSha256,
    producerSuccess.value.expectedArtifactsSha256,
    "California broad manifest and producer expected matrices drifted");
  assert.equal(manifest.value.provenance.sourceSnapshotSha256,
    options.frozenSourceSnapshotSha256,
    "California broad terminal manifest mixes frozen sourceSnapshotSha256");
  assert.equal(seal.value.manifestSha256, manifest.sha256,
    "California broad terminal seal does not bind exact manifest bytes");
  assert.ok(Array.isArray(seal.value.artifacts) && seal.value.artifacts.length > 0,
    "California broad terminal seal has no artifacts");
  const artifactRows = validateArtifactByteIdentities(
    seal.value.artifacts,
    "California broad sealed artifacts"
  );
  assert.equal(artifactRows.length, options.expectedArtifactCount,
    "California broad terminal seal artifact count differs from the pre-finalizer source matrix");
  const artifactNames = entries.filter((entry) => entry.endsWith(CALIFORNIA_BROAD_OFFICIAL_SUFFIX));
  exactStrings(artifactNames, artifactRows.map((row) => String(row.fileName)),
    "California broad sealed artifact names");
  assert.deepEqual(
    artifactRows.map(({ artifactId, fileName }) => ({ artifactId, fileName })),
    manifestExpectedArtifacts.map(({ artifactId, fileName }) => ({ artifactId, fileName })),
    "California broad sealed artifact identities differ from the frozen manifest matrix"
  );
  const loadedArtifactRows: Array<{ artifactId: string; fileName: string; sha256: string }> = [];
  for (const row of artifactRows) {
    const artifact = await readJsonObject(path.join(runDirectory, String(row.fileName)),
      `California broad artifact ${row.fileName}`);
    assert.equal(artifact.sha256, row.sha256, `${row.fileName}: sealed artifact SHA drifted`);
    assert.equal(artifact.value.terminalStatus, "passed", `${row.fileName}: artifact is not passed`);
    exactRecord(artifact.value.execution, `${row.fileName} execution`);
    assert.equal(artifact.value.execution.retry, 0, `${row.fileName}: retry is forbidden`);
    assert.equal(artifact.value.artifactId, row.artifactId,
      `${row.fileName}: sealed artifactId drifted`);
    loadedArtifactRows.push({ artifactId: row.artifactId, fileName: row.fileName, sha256: artifact.sha256 });
  }
  assert.deepEqual(artifactRows, producerArtifactRows,
    "California broad terminal seal does not bind producer artifact byte identities");
  assert.deepEqual(artifactRows, loadedArtifactRows,
    "California broad terminal seal does not bind currently loaded artifact byte identities");
  return {
    artifactCount: artifactRows.length,
    fileName: CALIFORNIA_BROAD_RUN_SEAL_FILENAME,
    frozenSourceSnapshotSha256: options.frozenSourceSnapshotSha256,
    playwrightReportSha256: options.expectedPlaywrightReportSha256,
    producerSuccessSha256: options.expectedProducerSuccessSha256,
    sha256: seal.sha256,
    sourceHash: seal.value.provenance.sourceHash as string,
    sourceSnapshotSha256: seal.value.provenance.sourceSnapshotSha256 as string,
    status: "sealed",
    streamBindings: null
  } satisfies CaliforniaTerminalReceipt;
}

export async function verifyExhaustiveTerminalSeal(options: {
  buildId: string;
  executionGroupOwnershipManifest?: CaliforniaSignatureExecutionGroupOwnershipManifest;
  expectedArtifactsSha256: string;
  expectedPlaywrightReportSha256: string;
  expectedProducerSuccessSha256: string;
  expectedSealSha256: string;
  exhaustiveRunId: string;
  frozenSourceSnapshotSha256: string;
  ledgerRoot: string;
  origin: string;
  runtimeRunId: string;
}) {
  assertSha256(options.frozenSourceSnapshotSha256, "California exhaustive frozen source snapshot SHA");
  assertSha256(options.expectedArtifactsSha256,
    "California exhaustive source-derived expected matrix SHA");
  assertSha256(options.expectedPlaywrightReportSha256,
    "California exhaustive verified Playwright report SHA");
  assertSha256(options.expectedProducerSuccessSha256,
    "California exhaustive external producer-success receipt SHA");
  assertSha256(options.expectedSealSha256, "California exhaustive external seal receipt SHA");
  const runDirectory = path.join(options.ledgerRoot, options.exhaustiveRunId);
  await assertDirectoryNoSymlink(runDirectory, "California exhaustive terminal run directory");
  const entries = (await readdir(runDirectory)).sort();
  const manifest = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_EXHAUSTIVE_RUN_MANIFEST_FILENAME),
    "California exhaustive run manifest"
  );
  const seal = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME),
    "California exhaustive terminal seal"
  );
  const producerSuccess = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
    "California exhaustive producer-success receipt"
  );
  assert.equal(producerSuccess.sha256, options.expectedProducerSuccessSha256,
    "California exhaustive producer-success file differs from its in-memory external receipt");
  exactKeys(producerSuccess.value, [
    "artifacts",
    "buildId",
    "componentSourceSha256",
    "controlBlueprintSha256",
    "evidenceReservations",
    "expectedArtifactsSha256",
    "lifecycleSchemaVersion",
    "markerIdentities",
    "markerIdentitiesSha256",
    "origin",
    "producerReportSha256",
    "publishedAt",
    "runId",
    "runtimeRunId",
    "sourceSnapshotSha256",
    "status"
  ], "California exhaustive producer-success receipt");
  const producerArtifactRows = validateCaliforniaExhaustiveArtifactByteIdentities(
    producerSuccess.value.artifacts,
    "California exhaustive producer-success artifacts"
  );
  assert.equal(producerSuccess.value.status, "producer-succeeded",
    "California exhaustive producer-success receipt is not terminal");
  assert.equal(
    producerSuccess.value.lifecycleSchemaVersion,
    CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California exhaustive producer-success lifecycle schema drifted"
  );
  assert.equal(producerSuccess.value.producerReportSha256,
    options.expectedPlaywrightReportSha256,
    "California exhaustive producer-success receipt does not bind the verified Playwright report");
  assert.equal(producerSuccess.value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California exhaustive producer-success receipt does not bind the source-derived matrix");
  assert.equal(producerSuccess.value.buildId, options.buildId,
    "California exhaustive producer-success receipt mixes buildId");
  assert.equal(producerSuccess.value.runId, options.exhaustiveRunId,
    "California exhaustive producer-success receipt mixes runId");
  assert.equal(producerSuccess.value.runtimeRunId, options.runtimeRunId,
    "California exhaustive producer-success receipt mixes runtimeRunId");
  assert.equal(producerSuccess.value.origin, options.origin,
    "California exhaustive producer-success receipt mixes origin");
  assert.equal(producerSuccess.value.sourceSnapshotSha256,
    options.frozenSourceSnapshotSha256,
    "California exhaustive producer-success receipt mixes frozen sourceSnapshotSha256");
  assert.equal(seal.sha256, options.expectedSealSha256,
    "California exhaustive terminal seal differs from the finalizer's in-memory external receipt");
  exactKeys(seal.value, [
    "artifacts",
    "buildId",
    "componentSourceSha256",
    "controlBlueprintSha256",
    "evidenceReservations",
    "expectedArtifactsSha256",
    "lifecycleSchemaVersion",
    "manifestSha256",
    "markerIdentities",
    "markerIdentitiesSha256",
    "origin",
    "producerReportSha256",
    "producerSuccessSha256",
    "runId",
    "runtimeRunId",
    "sealedAt",
    "sourceSnapshotSha256",
    "status"
  ], "California exhaustive terminal seal");
  assert.equal(seal.value.status, "sealed", "California exhaustive terminal seal is not sealed");
  assert.equal(
    seal.value.lifecycleSchemaVersion,
    CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California exhaustive terminal seal lifecycle schema drifted"
  );
  exactKeys(manifest.value, [
    ...CALIFORNIA_EXHAUSTIVE_RUN_IDENTITY_KEYS,
    "lifecycleSchemaVersion",
    "officialArtifactSuffix",
    "requiredProjects",
    "status"
  ], "California exhaustive terminal manifest");
  assert.equal(
    manifest.value.lifecycleSchemaVersion,
    CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California exhaustive terminal manifest lifecycle schema drifted"
  );
  assert.equal(manifest.value.officialArtifactSuffix, CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX,
    "California exhaustive terminal manifest official artifact suffix drifted");
  assert.deepEqual(manifest.value.requiredProjects, CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
    "California exhaustive terminal manifest required projects drifted");
  assert.equal(manifest.value.status, "open", "California exhaustive terminal manifest is not open");
  for (const key of CALIFORNIA_EXHAUSTIVE_RUN_IDENTITY_KEYS) {
    assert.deepEqual(
      seal.value[key],
      producerSuccess.value[key],
      `California exhaustive terminal seal mixes producer ${key}`
    );
    assert.deepEqual(
      manifest.value[key],
      producerSuccess.value[key],
      `California exhaustive producer-success receipt mixes manifest ${key}`
    );
  }
  for (const [key, label] of [
    ["componentSourceSha256", "component source"],
    ["controlBlueprintSha256", "control blueprint"],
    ["markerIdentitiesSha256", "marker identities"],
    ["sourceSnapshotSha256", "source snapshot"]
  ] as const) {
    assertSha256(producerSuccess.value[key], `California exhaustive ${label} SHA`);
  }
  exactRecord(producerSuccess.value.markerIdentities,
    "California exhaustive producer marker identities");
  exactKeys(producerSuccess.value.markerIdentities, ["canvas", "control"],
    "California exhaustive producer marker identities");
  assert.equal(
    producerSuccess.value.markerIdentitiesSha256,
    sha256(stableJson(producerSuccess.value.markerIdentities)),
    "California exhaustive markerIdentitiesSha256 does not bind exact marker identities"
  );
  exactRecord(producerSuccess.value.markerIdentities.canvas,
    "California exhaustive producer Canvas marker identity");
  exactRecord(producerSuccess.value.markerIdentities.control,
    "California exhaustive producer control marker identity");
  assert.equal(
    producerSuccess.value.markerIdentities.canvas.productSourceSha256,
    producerSuccess.value.componentSourceSha256,
    "California exhaustive Canvas marker mixes component source identity"
  );
  assert.equal(
    producerSuccess.value.markerIdentities.control.productSourceSha256,
    producerSuccess.value.componentSourceSha256,
    "California exhaustive control marker mixes component source identity"
  );
  assert.equal(
    producerSuccess.value.markerIdentities.control.blueprintSha256,
    producerSuccess.value.controlBlueprintSha256,
    "California exhaustive control marker mixes blueprint identity"
  );
  assertCanonicalIsoTimestamp(producerSuccess.value.publishedAt,
    "California exhaustive producer-success publishedAt");
  assertCanonicalIsoTimestamp(seal.value.sealedAt, "California exhaustive terminal sealedAt");
  assert.equal(seal.value.runId, options.exhaustiveRunId, "exhaustive seal mixes runId");
  assert.equal(seal.value.runtimeRunId, options.runtimeRunId, "exhaustive seal mixes runtimeRunId");
  assert.equal(seal.value.buildId, options.buildId, "exhaustive seal mixes buildId");
  assert.equal(seal.value.origin, options.origin, "exhaustive seal mixes origin");
  assert.equal(seal.value.sourceSnapshotSha256, options.frozenSourceSnapshotSha256,
    "California exhaustive seal mixes frozen sourceSnapshotSha256");
  assert.equal(seal.value.producerReportSha256, options.expectedPlaywrightReportSha256,
    "California exhaustive terminal seal does not bind the verified Playwright report");
  assert.equal(seal.value.producerSuccessSha256, options.expectedProducerSuccessSha256,
    "California exhaustive terminal seal does not bind the external producer-success receipt");
  assert.equal(seal.value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California exhaustive terminal seal does not bind the source-derived matrix");
  assert.equal(seal.value.manifestSha256, manifest.sha256,
    "California exhaustive terminal seal does not bind exact manifest bytes");
  const currentManifest = buildCaliforniaSignatureSourceManifest();
  const currentCanvasContract = buildCaliforniaCanvasGraphicsSourceContract();
  assert.ok(options.executionGroupOwnershipManifest,
    "California exhaustive terminal verifier requires exact execution-group ownership");
  const lifecycleContract = await buildExhaustiveProducerLifecycleContract({
    buildId: options.buildId,
    canvasContract: currentCanvasContract,
    executionGroupOwnershipManifest: options.executionGroupOwnershipManifest,
    manifest: currentManifest,
    markers: producerSuccess.value.markerIdentities as
      Parameters<typeof buildCaliforniaSignatureArtifactRunIdentity>[0]["markers"],
    origin: options.origin,
    runId: options.exhaustiveRunId,
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: options.frozenSourceSnapshotSha256
  });
  assert.equal(lifecycleContract.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California exhaustive terminal verifier rebuilt a different source-derived matrix");
  const lifecycleLoaded = await loadCaliforniaSignatureSealedOfficialArtifacts({
    expectedIdentity: lifecycleContract.expectedIdentity,
    expectedMatrix: lifecycleContract.expectedMatrix,
    ledgerRoot: options.ledgerRoot,
    producerSuccessReceipt: {
      fileName: CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
      sha256: options.expectedProducerSuccessSha256
    },
    sealReceipt: {
      fileName: CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME,
      sha256: options.expectedSealSha256
    }
  });
  const verifiedLifecycleLoaded = await verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: lifecycleContract.expectedIdentity,
    expectedMatrix: lifecycleContract.expectedMatrix,
    loaded: lifecycleLoaded,
    validationContexts: lifecycleContract.validationContexts
  });
  const streamingAggregate = await validateCaliforniaSignatureStreamingAggregate({
    expectedIdentity: lifecycleContract.expectedIdentity,
    expectedMatrix: lifecycleContract.expectedMatrix,
    externalExpectations: lifecycleContract.externalExpectations,
    loaded: verifiedLifecycleLoaded,
    manifest: currentManifest,
    sourceEvidenceOracle: lifecycleContract.sourceEvidenceOracle,
    validationContexts: lifecycleContract.validationContexts
  });
  assertReviewedCaliforniaSignatureStreamingAggregate(streamingAggregate);
  assert.ok(Array.isArray(seal.value.artifacts), "exhaustive seal artifacts must be an array");
  const rows = validateCaliforniaExhaustiveArtifactByteIdentities(
    seal.value.artifacts,
    "California exhaustive sealed artifacts"
  );
  assert.equal(rows.length, 102, "exhaustive terminal seal must bind exactly 51 packages by two projects");
  const artifactNames = entries.filter((entry) => entry.endsWith(CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX));
  exactStrings(artifactNames, rows.map((row) => String(row.fileName)),
    "California exhaustive sealed artifact names");
  const loadedArtifactRows = verifiedLifecycleLoaded.map(({ artifact, fileName, fileSha256 }) => ({
    artifactId: artifact.artifactId,
    evidenceChunkMerkleRootSha256: artifact.evidenceStream.chunkMerkleRootSha256,
    evidenceChunks: artifact.evidenceStream.chunks.map((chunk) => ({
      fileName: chunk.fileName,
      framedBytes: chunk.framedBytes,
      recordCount: chunk.recordCount,
      recordMerkleRootSha256: chunk.recordMerkleRootSha256,
      sha256: chunk.sha256
    })),
    evidenceFramedBytes: artifact.evidenceStream.framedBytes,
    evidenceManifestSha256: sha256(stableJson(artifact.evidenceStream)),
    evidenceRecordCount: artifact.evidenceStream.recordCount,
    fileName,
    sha256: fileSha256
  })).sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(rows, producerArtifactRows,
    "California exhaustive terminal seal does not bind producer artifact byte identities");
  assert.deepEqual(rows, loadedArtifactRows,
    "California exhaustive terminal seal does not bind currently loaded artifact byte identities");
  assert.equal(manifest.value.runId, options.exhaustiveRunId,
    "exhaustive manifest mixes runId");
  assert.equal(manifest.value.sourceSnapshotSha256, options.frozenSourceSnapshotSha256,
    "California exhaustive manifest mixes frozen sourceSnapshotSha256");
  const sourceHash = String(seal.value.componentSourceSha256 ?? "");
  assertSha256(sourceHash, "California exhaustive component source SHA");
  return {
    artifactCount: rows.length,
    fileName: CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME,
    frozenSourceSnapshotSha256: options.frozenSourceSnapshotSha256,
    playwrightReportSha256: options.expectedPlaywrightReportSha256,
    producerSuccessSha256: options.expectedProducerSuccessSha256,
    sha256: seal.sha256,
    sourceHash,
    sourceSnapshotSha256: seal.value.sourceSnapshotSha256 as string,
    status: "sealed",
    streamBindings: rows
  } satisfies CaliforniaTerminalReceipt;
}

export function assertFormalReviewedSnapshot(
  snapshot: Readonly<CaliforniaReviewedSnapshot> = CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT
) {
  assert.notEqual(snapshot.keysSha256, "UNREVIEWED",
    "formal acceptance refuses the UNREVIEWED exhaustive runtime snapshot");
  assertSha256(snapshot.blueprintSha256, "reviewed snapshot blueprintSha256");
  assertSha256(snapshot.keysSha256, "reviewed snapshot keysSha256");
  assert.ok(Number.isSafeInteger(snapshot.keyCount) && snapshot.keyCount > 0,
    "reviewed snapshot keyCount must be positive");
  assert.ok(Number.isSafeInteger(snapshot.schemaVersion) && snapshot.schemaVersion > 0,
    "reviewed snapshot schemaVersion must be positive");
  return structuredClone(snapshot);
}

export function assertDiscoverySnapshotUnreviewed(
  snapshot: Readonly<CaliforniaReviewedSnapshot> = CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT
) {
  assert.equal(snapshot.keysSha256, "UNREVIEWED",
    "discovery mode is only valid while the runtime snapshot is UNREVIEWED; use formal after pinning");
  return structuredClone(snapshot);
}

export function parseDiscoveryCandidate(output: string): CaliforniaReviewedSnapshot {
  const marker = "discovery candidate=";
  const starts = [...output.matchAll(new RegExp(marker, "g"))].map((match) => match.index! + marker.length);
  assert.ok(starts.length > 0, "discovery ledger failed without an exact UNREVIEWED candidate");
  const candidates: CaliforniaReviewedSnapshot[] = [];
  for (const start of starts) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < output.length; index += 1) {
      const character = output[index]!;
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          const parsed = JSON.parse(output.slice(start, index + 1)) as unknown;
          exactRecord(parsed, "UNREVIEWED discovery candidate");
          exactKeys(parsed, ["blueprintSha256", "keyCount", "keysSha256", "schemaVersion"],
            "UNREVIEWED discovery candidate");
          assertSha256(parsed.blueprintSha256, "discovery blueprintSha256");
          assertSha256(parsed.keysSha256, "discovery keysSha256");
          assert.ok(Number.isSafeInteger(parsed.keyCount) && Number(parsed.keyCount) > 0,
            "discovery keyCount must be positive");
          assert.ok(Number.isSafeInteger(parsed.schemaVersion) && Number(parsed.schemaVersion) > 0,
            "discovery schemaVersion must be positive");
          candidates.push(parsed as unknown as CaliforniaReviewedSnapshot);
          break;
        }
      }
    }
  }
  assert.ok(candidates.length > 0, "could not parse an exact discovery candidate");
  for (const candidate of candidates) assert.deepEqual(candidate, candidates[0],
    "discovery output contains mixed candidate identities");
  return candidates[0]!;
}

async function assertNoExhaustiveSeal(layout: RunLayout, exhaustiveRunId: string) {
  const sealPath = path.join(
    layout.exhaustiveLedgerRoot,
    exhaustiveRunId,
    CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME
  );
  assert.equal(await lstatOrNull(sealPath), null,
    "discovery mode must remain unsealed and red; an exhaustive terminal seal exists");
}

async function verifyComposedLayerSource(options: {
  layerRoot: string;
  manifest: CaliforniaFrozenSourceManifest;
  signatureSourcePaths: ReadonlySet<string>;
}) {
  for (const entry of options.manifest.entries) {
    if (options.signatureSourcePaths.has(entry.path)) continue;
    const actual = await sourceEntry(options.layerRoot, entry.path);
    assert.deepEqual(actual, entry,
      `${entry.path}: non-signature Layer B source drifted from the frozen snapshot`);
  }
}

export function validateGeneratedArtifactNames(relativePaths: readonly string[]) {
  for (const relativePath of relativePaths) {
    assert.ok(relativePath && !path.isAbsolute(relativePath),
      `generated inventory path is empty or absolute: ${relativePath}`);
    assert.doesNotMatch(relativePath, FORBIDDEN_GENERATED_NAME_PATTERN,
      `${relativePath}: failure/partial/temp/skip/retry/flaky evidence is forbidden`);
  }
}

function compareInventoryRows(left: CaliforniaInventoryRow, right: CaliforniaInventoryRow) {
  if (left.path < right.path) return -1;
  if (left.path > right.path) return 1;
  return left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : 0;
}

function assertCanonicalInventoryPath(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && value.length > 0 && !path.posix.isAbsolute(value),
    `${label}: inventory path must be one nonempty relative POSIX path`);
  assert.equal(value.includes("\\"), false, `${label}: inventory path must use POSIX separators`);
  assert.equal(path.posix.normalize(value), value, `${label}: inventory path is not normalized`);
  assert.ok(value !== ".." && !value.startsWith("../") && !value.includes("/../"),
    `${label}: inventory path escapes the run root`);
  assert.equal(value.includes("\0"), false, `${label}: inventory path contains NUL`);
}

export function validateCaliforniaInventoryRows(
  value: unknown,
  label = "California inventory"
): CaliforniaInventoryRow[] {
  assert.ok(Array.isArray(value), `${label}: rows must be an array`);
  const rows = value.map((candidate, index): CaliforniaInventoryRow => {
    exactRecord(candidate, `${label} row ${index}`);
    assertCanonicalInventoryPath(candidate.path, `${label} row ${index}`);
    assert.ok(Number.isSafeInteger(candidate.mode) && Number(candidate.mode) >= 0 &&
      Number(candidate.mode) <= 0o777, `${label} row ${index}: mode is invalid`);
    if (candidate.kind === "directory") {
      exactKeys(candidate, ["kind", "mode", "path"], `${label} directory row ${index}`);
      return { kind: "directory", mode: Number(candidate.mode), path: candidate.path };
    }
    assert.equal(candidate.kind, "file", `${label} row ${index}: unknown inventory kind`);
    exactKeys(candidate, ["kind", "mode", "path", "sha256", "size"],
      `${label} file row ${index}`);
    assert.ok(Number.isSafeInteger(candidate.size) && Number(candidate.size) >= 0,
      `${label} row ${index}: size is invalid`);
    assertSha256(candidate.sha256, `${label} row ${index} SHA`);
    return {
      kind: "file",
      mode: Number(candidate.mode),
      path: candidate.path,
      sha256: candidate.sha256,
      size: Number(candidate.size)
    };
  });
  assert.equal(new Set(rows.map((row) => row.path)).size, rows.length,
    `${label}: inventory paths repeat`);
  assert.deepEqual(rows, [...rows].sort(compareInventoryRows),
    `${label}: rows are not in canonical path order`);
  return rows;
}

export function californiaInventoryAggregate(rows: readonly CaliforniaInventoryRow[]) {
  const canonical = validateCaliforniaInventoryRows(rows, "California inventory aggregate");
  return sha256(canonical.map((row) => stableJson(row)).join("\n"));
}

async function inventoryFileRow(root: string, target: string): Promise<CaliforniaInventoryRow> {
  const relative = path.relative(root, target).replace(/\\/g, "/");
  assertCanonicalInventoryPath(relative, `${relative || target} file inventory`);
  const before = await lstat(target);
  assert.ok(before.isFile() && !before.isSymbolicLink(),
    `${relative}: final inventory rejects non-regular files`);
  assert.equal(before.nlink, 1, `${relative}: final inventory rejects hardlinks`);
  const bytes = await readFile(target);
  const after = await lstat(target);
  assert.equal(after.dev, before.dev, `${relative}: device changed during inventory`);
  assert.equal(after.ino, before.ino, `${relative}: inode changed during inventory`);
  assert.equal(after.nlink, 1, `${relative}: link count changed during inventory`);
  assert.equal(after.size, before.size, `${relative}: size changed during inventory`);
  assert.equal(after.mode, before.mode, `${relative}: mode changed during inventory`);
  assert.equal(bytes.length, before.size, `${relative}: bytes changed during inventory`);
  return {
    kind: "file",
    mode: before.mode & 0o777,
    path: relative,
    sha256: sha256(bytes),
    size: bytes.length
  };
}

export async function inventoryCaliforniaRunRoot(root: string) {
  await assertDirectoryNoSymlink(root, "California inventory root");
  const rows: CaliforniaInventoryRow[] = [];
  const visit = async (directory: string) => {
    const directoryBefore = await lstat(directory);
    assert.ok(directoryBefore.isDirectory() && !directoryBefore.isSymbolicLink(),
      `${path.relative(root, directory) || "."}: final inventory rejects non-directories`);
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const target = path.join(directory, entry.name);
      const relative = path.relative(root, target).replace(/\\/g, "/");
      assertCanonicalInventoryPath(relative, `${relative} filesystem entry`);
      const identity = await lstat(target);
      assert.ok(!identity.isSymbolicLink() && !entry.isSymbolicLink(),
        `${relative}: final inventory rejects symlinks`);
      if (identity.isDirectory() && entry.isDirectory()) {
        rows.push({ kind: "directory", mode: identity.mode & 0o777, path: relative });
        await visit(target);
        continue;
      }
      assert.ok(identity.isFile() && entry.isFile(),
        `${relative}: final inventory rejects special or type-raced filesystem entries`);
      rows.push(await inventoryFileRow(root, target));
    }
    const directoryAfter = await lstat(directory);
    assert.equal(directoryAfter.dev, directoryBefore.dev,
      `${path.relative(root, directory) || "."}: directory device changed during inventory`);
    assert.equal(directoryAfter.ino, directoryBefore.ino,
      `${path.relative(root, directory) || "."}: directory inode changed during inventory`);
    assert.equal(directoryAfter.mode, directoryBefore.mode,
      `${path.relative(root, directory) || "."}: directory mode changed during inventory`);
  };
  await visit(root);
  rows.sort(compareInventoryRows);
  return validateCaliforniaInventoryRows(rows);
}

export function assertKnownTopLevelInventory(paths: readonly string[]) {
  const allowed = new Set([
    CALIFORNIA_ACCEPTANCE_SOURCE_MANIFEST_FILENAME,
    CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
    CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
    CALIFORNIA_ACCEPTANCE_DISCOVERY_FILENAME,
    "frozen-source",
    "layer-a",
    "layer-b",
    "preflight"
  ]);
  const unknown = paths.filter((entry) => !allowed.has(entry.split("/")[0]!));
  assert.deepEqual(unknown, [], "acceptance run contains unknown top-level artifacts");
}

async function finalInventory(layout: RunLayout, sourceManifest: CaliforniaFrozenSourceManifest) {
  assert.equal(await lstatOrNull(layout.finalSealPath), null,
    "final seal already exists; duplicate or premature sealing is forbidden");
  assert.equal(await lstatOrNull(layout.finalManifestPath), null,
    "final manifest already exists; duplicate or premature sealing is forbidden");
  const rows = await inventoryCaliforniaRunRoot(layout.runRoot);
  assertKnownTopLevelInventory(rows.map((row) => row.path));
  const generated = rows
    .filter((row) => row.kind === "file")
    .map((row) => row.path)
    .filter((relative) => !relative.startsWith("frozen-source/"))
    .filter((relative) => !sourceManifest.entries.some((entry) =>
      relative === `layer-a/source/${entry.path}` || relative === `layer-b/source/${entry.path}`
    ));
  validateGeneratedArtifactNames(generated);
  const frozenExpected = new Set(sourceManifest.entries.map((entry) => `frozen-source/${entry.path}`));
  const frozenActual = rows
    .filter((row) => row.kind === "file" && row.path.startsWith("frozen-source/"))
    .map((row) => row.path);
  exactStrings([...frozenExpected], frozenActual, "frozen-source final inventory");
  return {
    aggregateSha256: californiaInventoryAggregate(rows),
    entryCount: rows.length,
    rows
  };
}

function validateTerminalFileBindings(
  value: unknown,
  inventoryRows: readonly CaliforniaInventoryRow[],
  label = "California terminal file bindings"
): CaliforniaTerminalFileBinding[] {
  assert.ok(Array.isArray(value), `${label}: expected an array`);
  const bindings = value.map((candidate, index): CaliforniaTerminalFileBinding => {
    exactRecord(candidate, `${label} row ${index}`);
    exactKeys(candidate, ["relativePath", "role", "sha256"], `${label} row ${index}`);
    assertCanonicalInventoryPath(candidate.relativePath, `${label} row ${index}`);
    assert.ok((CALIFORNIA_TERMINAL_FILE_ROLES as readonly unknown[]).includes(candidate.role),
      `${label} row ${index}: unknown role`);
    assertSha256(candidate.sha256, `${label} row ${index} SHA`);
    return {
      relativePath: candidate.relativePath,
      role: candidate.role as CaliforniaTerminalFileBinding["role"],
      sha256: candidate.sha256
    };
  });
  exactStrings(CALIFORNIA_TERMINAL_FILE_ROLES, bindings.map((binding) => binding.role),
    `${label} exact roles`);
  assert.deepEqual(bindings.map((binding) => binding.role), CALIFORNIA_TERMINAL_FILE_ROLES,
    `${label}: roles are not in canonical order`);
  assert.equal(new Set(bindings.map((binding) => binding.relativePath)).size, bindings.length,
    `${label}: paths repeat`);
  const fileRows = new Map(inventoryRows
    .filter((row): row is Extract<CaliforniaInventoryRow, { kind: "file" }> => row.kind === "file")
    .map((row) => [row.path, row] as const));
  for (const binding of bindings) {
    const row = fileRows.get(binding.relativePath);
    assert.ok(row, `${label}: ${binding.role} is absent from the canonical inventory`);
    assert.equal(row.sha256, binding.sha256,
      `${label}: ${binding.role} byte SHA differs from the canonical inventory`);
  }
  return bindings;
}

async function terminalFileBinding(options: {
  expectedSha256: string;
  role: CaliforniaTerminalFileBinding["role"];
  runRoot: string;
  target: string;
}): Promise<CaliforniaTerminalFileBinding> {
  assert.ok(isInside(options.runRoot, options.target),
    `${options.role}: terminal file escapes the run root`);
  assertSha256(options.expectedSha256, `${options.role} expected SHA`);
  const read = await readJsonObject(options.target, `${options.role} terminal file`);
  assert.equal(read.sha256, options.expectedSha256,
    `${options.role}: terminal file bytes differ from the in-memory verified receipt`);
  const relativePath = path.relative(options.runRoot, options.target).replace(/\\/g, "/");
  assertCanonicalInventoryPath(relativePath, `${options.role} terminal file`);
  return { relativePath, role: options.role, sha256: read.sha256 };
}

async function collectTerminalFileBindings(options: {
  broad: CaliforniaTerminalReceipt;
  broadReportSha256: string;
  exhaustive: CaliforniaTerminalReceipt;
  executionGroupOwnershipSha256: string;
  exhaustiveReportSha256: string;
  exhaustiveRunId: string;
  layerASealSha256: string;
  layout: RunLayout;
  matrixRunId: string;
  productManifestSha256: string;
  productReceiptFiles: CaliforniaProductSmokeManifest["receiptFiles"];
  productReportSha256: string;
  sourceManifestSha256: string;
}) {
  const layerASeal = await readJsonObject(options.layout.layerASealPath,
    "Layer A terminal seal final binding");
  assert.equal(layerASeal.sha256, options.layerASealSha256,
    "Layer A terminal seal differs from its in-memory external receipt before total sealing");
  assert.equal(layerASeal.value.receiptFileName, path.basename(options.layout.layerAReceiptPath),
    "Layer A terminal seal names the wrong receipt before total sealing");
  assertSha256(layerASeal.value.receiptSha256, "Layer A terminal receipt bound SHA");
  const broadRunRoot = path.join(options.layout.broadLedgerRoot, options.matrixRunId);
  const exhaustiveRunRoot = path.join(options.layout.exhaustiveLedgerRoot, options.exhaustiveRunId);
  const specifications: Array<{
    expectedSha256: string;
    role: CaliforniaTerminalFileBinding["role"];
    target: string;
  }> = [
    {
      expectedSha256: options.sourceManifestSha256,
      role: "source-manifest",
      target: options.layout.sourceManifestPath
    },
    {
      expectedSha256: options.productReportSha256,
      role: "layer-a-product-report",
      target: options.layout.productSmokeReportPath
    },
    {
      expectedSha256: options.productReceiptFiles[0]!.sha256,
      role: "layer-a-product-receipt-desktop",
      target: path.join(options.layout.productSmokeReceiptRoot, options.productReceiptFiles[0]!.fileName)
    },
    {
      expectedSha256: options.productReceiptFiles[1]!.sha256,
      role: "layer-a-product-receipt-mobile",
      target: path.join(options.layout.productSmokeReceiptRoot, options.productReceiptFiles[1]!.fileName)
    },
    {
      expectedSha256: options.productManifestSha256,
      role: "layer-a-product-manifest",
      target: options.layout.productSmokeManifestPath
    },
    {
      expectedSha256: layerASeal.value.receiptSha256,
      role: "layer-a-receipt",
      target: options.layout.layerAReceiptPath
    },
    {
      expectedSha256: options.layerASealSha256,
      role: "layer-a-seal",
      target: options.layout.layerASealPath
    },
    {
      expectedSha256: options.broadReportSha256,
      role: "broad-report",
      target: options.layout.broadReportPath
    },
    {
      expectedSha256: options.broad.producerSuccessSha256!,
      role: "broad-producer-success",
      target: path.join(broadRunRoot, CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME)
    },
    {
      expectedSha256: options.broad.sha256,
      role: "broad-seal",
      target: path.join(broadRunRoot, options.broad.fileName)
    },
    {
      expectedSha256: options.executionGroupOwnershipSha256,
      role: "exhaustive-execution-group-ownership",
      target: options.layout.executionGroupOwnershipPath
    },
    {
      expectedSha256: options.exhaustiveReportSha256,
      role: "exhaustive-report",
      target: options.layout.exhaustiveReportPath
    },
    {
      expectedSha256: options.exhaustive.producerSuccessSha256!,
      role: "exhaustive-producer-success",
      target: path.join(exhaustiveRunRoot, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME)
    },
    {
      expectedSha256: options.exhaustive.sha256,
      role: "exhaustive-seal",
      target: path.join(exhaustiveRunRoot, options.exhaustive.fileName)
    }
  ];
  const bindings: CaliforniaTerminalFileBinding[] = [];
  for (const specification of specifications) {
    bindings.push(await terminalFileBinding({
      ...specification,
      runRoot: options.layout.runRoot
    }));
  }
  return bindings;
}

function validateCaliforniaExhaustiveStreamInventoryBindings(
  value: unknown,
  inventoryRows: readonly CaliforniaInventoryRow[],
  label: string
) {
  const bindings = validateCaliforniaExhaustiveArtifactByteIdentities(value, label);
  const inventoryFiles = inventoryRows.filter(
    (row): row is Extract<CaliforniaInventoryRow, { kind: "file" }> => row.kind === "file"
  );
  const exhaustivePrefix = "layer-b/exhaustive-ledger/";
  const exhaustivePayloadFiles = inventoryFiles.filter((row) =>
    row.path.startsWith(exhaustivePrefix) &&
    (row.path.endsWith(CALIFORNIA_EXHAUSTIVE_OFFICIAL_SUFFIX) || row.path.endsWith(".frame"))
  );
  const expectedPaths = new Set<string>();
  let commonRunDirectory: string | null = null;
  const requireInventoryFile = (
    fileName: string,
    expectedSha256: string,
    expectedSize: number | null,
    fileLabel: string
  ) => {
    const matches = exhaustivePayloadFiles.filter((row) => path.posix.basename(row.path) === fileName);
    assert.equal(matches.length, 1,
      `${fileLabel}: expected one exact exhaustive inventory file; found ${matches.length}`);
    const row = matches[0]!;
    const runDirectory = path.posix.dirname(row.path);
    commonRunDirectory ??= runDirectory;
    assert.equal(runDirectory, commonRunDirectory,
      `${fileLabel}: exhaustive stream bindings cross run directories`);
    assert.equal(row.sha256, expectedSha256,
      `${fileLabel}: exhaustive inventory SHA differs from the terminal binding`);
    if (expectedSize !== null) {
      assert.equal(row.size, expectedSize,
        `${fileLabel}: exhaustive inventory bytes differ from the terminal binding`);
    }
    expectedPaths.add(row.path);
  };
  for (const binding of bindings) {
    requireInventoryFile(
      binding.fileName,
      binding.sha256,
      null,
      `${label}/${binding.artifactId}/manifest`
    );
    for (const chunk of binding.evidenceChunks) {
      requireInventoryFile(
        chunk.fileName,
        chunk.sha256,
        chunk.framedBytes,
        `${label}/${binding.artifactId}/${chunk.fileName}`
      );
    }
  }
  exactStrings(
    [...expectedPaths],
    exhaustivePayloadFiles.map((row) => row.path),
    `${label}: exhaustive manifest/chunk inventory`
  );
  return bindings;
}

export function buildFinalAcceptanceManifest(options: {
  acceptanceRunId: string;
  broad: CaliforniaTerminalReceipt | null;
  broadReportSha256: string;
  buildId: string;
  exhaustive: CaliforniaTerminalReceipt | null;
  exhaustiveReportSha256: string;
  inventoryRows: readonly CaliforniaInventoryRow[];
  layerASealSha256: string | null;
  matrixRunId: string;
  sourceManifestSha256: string;
  sourceSnapshotSha256: string;
  terminalFiles: readonly CaliforniaTerminalFileBinding[];
}) {
  assert.ok(options.broad, "final total seal requires a broad terminal seal receipt");
  assert.ok(options.exhaustive, "final total seal requires an exhaustive terminal seal receipt");
  assertSha256(options.layerASealSha256, "final total Layer A seal receipt");
  assertSha256(options.broadReportSha256, "final total broad Playwright report SHA");
  assertSha256(options.exhaustiveReportSha256, "final total exhaustive Playwright report SHA");
  assertSha256(options.sourceSnapshotSha256, "final total source snapshot SHA");
  assertSha256(options.sourceManifestSha256, "final total source manifest SHA");
  assert.equal(options.broad.status, "sealed");
  assert.equal(options.exhaustive.status, "sealed");
  assertSha256(options.broad.sha256, "final total broad seal SHA");
  assertSha256(options.exhaustive.sha256, "final total exhaustive seal SHA");
  assertSha256(options.broad.producerSuccessSha256,
    "final total broad producer-success receipt SHA");
  assertSha256(options.exhaustive.producerSuccessSha256,
    "final total exhaustive producer-success receipt SHA");
  assert.equal(options.broad.frozenSourceSnapshotSha256, options.sourceSnapshotSha256,
    "final total broad receipt is bound to a mixed frozen source snapshot");
  assert.equal(options.broad.sourceSnapshotSha256, options.sourceSnapshotSha256,
    "final total broad ledger provenance is bound to a mixed frozen source snapshot");
  assert.equal(options.broad.playwrightReportSha256, options.broadReportSha256,
    "final total broad terminal receipt is bound to a mixed Playwright report");
  assert.equal(options.exhaustive.frozenSourceSnapshotSha256, options.sourceSnapshotSha256,
    "final total exhaustive receipt is bound to a mixed frozen source snapshot");
  assert.equal(options.exhaustive.sourceSnapshotSha256, options.sourceSnapshotSha256,
    "final total exhaustive ledger identity is bound to a mixed frozen source snapshot");
  assert.equal(options.exhaustive.playwrightReportSha256, options.exhaustiveReportSha256,
    "final total exhaustive terminal receipt is bound to a mixed Playwright report");
  assert.equal(options.broad.streamBindings, null,
    "final total broad receipt must not claim exhaustive stream bindings");
  const inventoryRows = validateCaliforniaInventoryRows(options.inventoryRows,
    "final total canonical payload inventory");
  const exhaustiveStreamBindings = validateCaliforniaExhaustiveStreamInventoryBindings(
    options.exhaustive.streamBindings,
    inventoryRows,
    "final total exhaustive stream bindings"
  );
  assert.equal(exhaustiveStreamBindings.length, options.exhaustive.artifactCount,
    "final total exhaustive stream binding count differs from the terminal artifact count");
  const inventorySha256 = californiaInventoryAggregate(inventoryRows);
  const terminalFiles = validateTerminalFileBindings(
    options.terminalFiles,
    inventoryRows,
    "final total terminal byte bindings"
  );
  assert.equal(
    terminalFiles.find((binding) => binding.role === "source-manifest")?.sha256,
    options.sourceManifestSha256,
    "final total source manifest SHA differs from its terminal byte binding"
  );
  return {
    acceptanceRunId: assertHighEntropyId(options.acceptanceRunId, "final acceptanceRunId"),
    axes: {
      functional: [CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID],
      layout: [...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS],
      structural: [...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS]
    },
    broadReportSha256: options.broadReportSha256,
    broadSeal: options.broad,
    buildId: assertBuildId(options.buildId),
    exhaustiveSeal: { ...options.exhaustive, streamBindings: exhaustiveStreamBindings },
    exhaustiveReportSha256: options.exhaustiveReportSha256,
    inventoryEntryCount: inventoryRows.length,
    inventoryRows,
    inventorySha256,
    layerASealSha256: options.layerASealSha256,
    matrixRunId: assertHighEntropyId(options.matrixRunId, "final matrixRunId"),
    schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    sourceManifestSha256: options.sourceManifestSha256,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "ready-to-seal",
    terminalFiles,
    terminalFilesSha256: sha256(stableJson(terminalFiles))
  } as const;
}

async function verifyTerminalFilesAgainstBindings(options: {
  bindings: readonly CaliforniaTerminalFileBinding[];
  runRoot: string;
}) {
  for (const binding of options.bindings) {
    const target = path.resolve(options.runRoot, binding.relativePath);
    assert.ok(isInside(options.runRoot, target),
      `${binding.role}: terminal binding escapes the run root`);
    const read = await readJsonObject(target, `${binding.role} rebound terminal file`);
    assert.equal(read.sha256, binding.sha256,
      `${binding.role}: terminal bytes drifted after semantic verification`);
  }
}

async function verifyCaliforniaExhaustiveStreamBindingFiles(options: {
  bindings: readonly CaliforniaExhaustiveStreamBinding[];
  inventoryRows: readonly CaliforniaInventoryRow[];
  runRoot: string;
}) {
  const inventoryFiles = options.inventoryRows.filter(
    (row): row is Extract<CaliforniaInventoryRow, { kind: "file" }> => row.kind === "file"
  );
  for (const binding of options.bindings) {
    const artifactRows = inventoryFiles.filter((row) =>
      row.path.startsWith("layer-b/exhaustive-ledger/") &&
      path.posix.basename(row.path) === binding.fileName
    );
    assert.equal(artifactRows.length, 1,
      `${binding.artifactId}: final stream manifest inventory is not unique`);
    const artifactPath = path.resolve(options.runRoot, artifactRows[0]!.path);
    assert.ok(isInside(options.runRoot, artifactPath),
      `${binding.artifactId}: final stream manifest escapes the run root`);
    const artifact = await readJsonObject(
      artifactPath,
      `${binding.artifactId}: final exhaustive stream manifest`
    );
    assert.equal(artifact.sha256, binding.sha256,
      `${binding.artifactId}: final stream manifest file SHA drifted`);
    assert.equal(artifact.value.artifactId, binding.artifactId,
      `${binding.artifactId}: final stream manifest artifactId drifted`);
    exactRecord(artifact.value.evidenceStream,
      `${binding.artifactId}: final evidence stream manifest`);
    assert.equal(
      sha256(stableJson(artifact.value.evidenceStream)),
      binding.evidenceManifestSha256,
      `${binding.artifactId}: final evidence stream manifest digest drifted`
    );
    assert.equal(
      artifact.value.evidenceStream.chunkMerkleRootSha256,
      binding.evidenceChunkMerkleRootSha256,
      `${binding.artifactId}: final evidence stream Merkle root drifted`
    );
    assert.equal(artifact.value.evidenceStream.framedBytes, binding.evidenceFramedBytes,
      `${binding.artifactId}: final evidence stream framed bytes drifted`);
    assert.equal(artifact.value.evidenceStream.recordCount, binding.evidenceRecordCount,
      `${binding.artifactId}: final evidence stream record count drifted`);
    assert.ok(Array.isArray(artifact.value.evidenceStream.chunks),
      `${binding.artifactId}: final evidence stream chunks are absent`);
    const actualChunks = artifact.value.evidenceStream.chunks.map((candidate, index) => {
      exactRecord(candidate, `${binding.artifactId}: final evidence chunk ${index}`);
      return {
        fileName: candidate.fileName,
        framedBytes: candidate.framedBytes,
        recordCount: candidate.recordCount,
        recordMerkleRootSha256: candidate.recordMerkleRootSha256,
        sha256: candidate.sha256
      };
    });
    assert.deepEqual(actualChunks, binding.evidenceChunks,
      `${binding.artifactId}: final stream manifest/chunk enumeration drifted`);
  }
}

async function assertInventoryExact(
  expectedRows: readonly CaliforniaInventoryRow[],
  actualRows: readonly CaliforniaInventoryRow[],
  label: string
) {
  assert.deepEqual(actualRows, expectedRows, `${label}: canonical inventory drifted`);
}

async function unlinkIfPresent(target: string) {
  try {
    await unlink(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function writePendingHardlinkJson(target: string, value: unknown) {
  const pendingPath = `${target}.producer-pending.tmp`;
  const pendingWrite = await writeExclusiveJson(pendingPath, value);
  let targetLinked = false;
  try {
    await link(pendingPath, target);
    targetLinked = true;
    await fsyncDirectory(path.dirname(target));
    const pendingIdentity = await lstat(pendingPath);
    const targetIdentity = await lstat(target);
    assert.ok(pendingIdentity.isFile() && targetIdentity.isFile(),
      `${path.basename(target)}: pending publication is not regular`);
    assert.equal(pendingIdentity.dev, targetIdentity.dev,
      `${path.basename(target)}: pending publication crossed devices`);
    assert.equal(pendingIdentity.ino, targetIdentity.ino,
      `${path.basename(target)}: destination is not the pending publication inode`);
    assert.equal(pendingIdentity.nlink, 2,
      `${path.basename(target)}: pending publication link count drifted`);
    assert.equal(targetIdentity.nlink, 2,
      `${path.basename(target)}: destination link count drifted`);
    assert.deepEqual(await readFile(target), pendingWrite.bytes,
      `${path.basename(target)}: destination bytes differ from pending publication`);
    return { ...pendingWrite, pendingPath };
  } catch (error) {
    if (targetLinked) await unlinkIfPresent(target);
    await unlinkIfPresent(pendingPath);
    await fsyncDirectory(path.dirname(target));
    throw error;
  }
}

export async function publishFinalSeal(options: {
  layout: RunLayout;
  manifest: ReturnType<typeof buildFinalAcceptanceManifest>;
}) {
  const lockPath = `${options.layout.runRoot}.final-publication.lock`;
  await mkdir(lockPath, { mode: 0o700 });
  await fsyncDirectory(path.dirname(lockPath));
  let manifestWrite: Awaited<ReturnType<typeof writePendingHardlinkJson>> | null = null;
  let sealWrite: Awaited<ReturnType<typeof writePendingHardlinkJson>> | null = null;
  let publicationVerified = false;
  try {
    const payloadRows = validateCaliforniaInventoryRows(options.manifest.inventoryRows,
      "California pre-publication payload inventory");
    await assertInventoryExact(
      payloadRows,
      await inventoryCaliforniaRunRoot(options.layout.runRoot),
      "California pre-publication"
    );
    const terminalFiles = validateTerminalFileBindings(
      options.manifest.terminalFiles,
      payloadRows,
      "California pre-publication terminal bindings"
    );
    await verifyTerminalFilesAgainstBindings({ bindings: terminalFiles, runRoot: options.layout.runRoot });
    manifestWrite = await writePendingHardlinkJson(options.layout.finalManifestPath, options.manifest);
    const seal = {
      acceptanceRunId: options.manifest.acceptanceRunId,
      broadReportSha256: options.manifest.broadReportSha256,
      broadSealSha256: options.manifest.broadSeal.sha256,
      buildId: options.manifest.buildId,
      exhaustiveSealSha256: options.manifest.exhaustiveSeal.sha256,
      exhaustiveReportSha256: options.manifest.exhaustiveReportSha256,
      inventoryEntryCount: options.manifest.inventoryEntryCount + 2,
      inventorySha256: options.manifest.inventorySha256,
      layerASealSha256: options.manifest.layerASealSha256,
      manifestFileName: CALIFORNIA_ACCEPTANCE_TOTAL_MANIFEST_FILENAME,
      manifestSha256: manifestWrite.sha256,
      matrixRunId: options.manifest.matrixRunId,
      schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
      sealedAt: new Date().toISOString(),
      sourceManifestSha256: options.manifest.sourceManifestSha256,
      sourceSnapshotSha256: options.manifest.sourceSnapshotSha256,
      status: "sealed",
      terminalFilesSha256: options.manifest.terminalFilesSha256
    } as const;
    sealWrite = await writePendingHardlinkJson(options.layout.finalSealPath, seal);
    await unlink(manifestWrite.pendingPath);
    await unlink(sealWrite.pendingPath);
    await fsyncDirectory(options.layout.runRoot);
    const sealReceipt = {
      fileName: CALIFORNIA_ACCEPTANCE_TOTAL_SEAL_FILENAME,
      sha256: sealWrite.sha256
    } as const;
    const verified = await verifyPublishedFinalSeal({
      manifestPath: options.layout.finalManifestPath,
      sealPath: options.layout.finalSealPath,
      sealReceipt
    });
    assert.equal(verified.sealSha256, sealReceipt.sha256,
      "final total seal receipt changed during post-publication verification");
    publicationVerified = true;
    return sealReceipt;
  } finally {
    if (!publicationVerified) {
      if (sealWrite) {
        await unlinkIfPresent(options.layout.finalSealPath);
        await unlinkIfPresent(sealWrite.pendingPath);
      }
      if (manifestWrite) {
        await unlinkIfPresent(options.layout.finalManifestPath);
        await unlinkIfPresent(manifestWrite.pendingPath);
      }
      await fsyncDirectory(options.layout.runRoot);
    }
    await rmdir(lockPath);
    await fsyncDirectory(path.dirname(lockPath));
  }
}

export async function verifyPublishedFinalSeal(options: {
  manifestPath: string;
  sealPath: string;
  sealReceipt: Readonly<{ fileName: string; sha256: string }>;
}) {
  assert.equal(options.sealReceipt.fileName, path.basename(options.sealPath),
    "California final acceptance requires the exact external seal filename receipt");
  assertSha256(options.sealReceipt.sha256,
    "California final acceptance external seal SHA receipt");
  assert.equal(path.dirname(options.manifestPath), path.dirname(options.sealPath),
    "California final manifest and seal must share one run root");
  const runRoot = path.dirname(options.manifestPath);
  const manifest = await readJsonObject(options.manifestPath, "California final acceptance manifest");
  const seal = await readJsonObject(options.sealPath, "California final acceptance seal");
  assert.equal(seal.sha256, options.sealReceipt.sha256,
    "California final acceptance seal differs from the external terminal receipt");
  exactKeys(manifest.value, [
    "acceptanceRunId",
    "axes",
    "broadReportSha256",
    "broadSeal",
    "buildId",
    "exhaustiveReportSha256",
    "exhaustiveSeal",
    "inventoryEntryCount",
    "inventoryRows",
    "inventorySha256",
    "layerASealSha256",
    "matrixRunId",
    "schemaVersion",
    "sourceManifestSha256",
    "sourceSnapshotSha256",
    "status",
    "terminalFiles",
    "terminalFilesSha256"
  ], "California final acceptance manifest");
  exactKeys(seal.value, [
    "acceptanceRunId",
    "broadReportSha256",
    "broadSealSha256",
    "buildId",
    "exhaustiveSealSha256",
    "exhaustiveReportSha256",
    "inventoryEntryCount",
    "inventorySha256",
    "layerASealSha256",
    "manifestFileName",
    "manifestSha256",
    "matrixRunId",
    "schemaVersion",
    "sealedAt",
    "sourceManifestSha256",
    "sourceSnapshotSha256",
    "status",
    "terminalFilesSha256"
  ], "California final acceptance seal");
  assert.equal(manifest.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    "California final acceptance manifest schema drifted");
  assert.equal(manifest.value.status, "ready-to-seal",
    "California final acceptance manifest status is not ready-to-seal");
  exactRecord(manifest.value.axes, "California final acceptance manifest axes");
  exactKeys(manifest.value.axes, ["functional", "layout", "structural"],
    "California final acceptance manifest axes");
  for (const [axisName, expected] of [
    ["functional", [CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID]],
    ["layout", [...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS]],
    ["structural", [...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS]]
  ] as const) {
    assert.ok(Array.isArray(manifest.value.axes[axisName]),
      `California final acceptance manifest ${axisName} axes must be an array`);
    exactStrings(expected, manifest.value.axes[axisName] as string[],
      `California final acceptance manifest ${axisName} axes`);
    assert.deepEqual(manifest.value.axes[axisName], expected,
      `California final acceptance manifest ${axisName} axes are not in canonical order`);
  }
  assert.equal(seal.value.status, "sealed", "California final acceptance seal is not terminal");
  assert.equal(seal.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
    "California final acceptance seal schema drifted");
  assert.equal(seal.value.manifestFileName, path.basename(options.manifestPath),
    "California final acceptance seal names the wrong manifest");
  assert.equal(seal.value.manifestSha256, manifest.sha256,
    "California final acceptance seal does not bind exact manifest bytes");
  const inventoryRows = validateCaliforniaInventoryRows(
    manifest.value.inventoryRows,
    "California published payload inventory"
  );
  assert.equal(manifest.value.inventoryEntryCount, inventoryRows.length,
    "California final acceptance manifest inventory count drifted");
  assert.equal(manifest.value.inventorySha256, californiaInventoryAggregate(inventoryRows),
    "California final acceptance manifest inventory hash drifted");
  const terminalFiles = validateTerminalFileBindings(
    manifest.value.terminalFiles,
    inventoryRows,
    "California published terminal byte bindings"
  );
  const terminalFilesSha256 = sha256(stableJson(terminalFiles));
  const terminalByRole = new Map(terminalFiles.map((binding) => [binding.role, binding] as const));
  assert.equal(manifest.value.terminalFilesSha256, terminalFilesSha256,
    "California final acceptance manifest terminal binding hash drifted");
  assert.equal(seal.value.terminalFilesSha256, terminalFilesSha256,
    "California final acceptance seal mixes terminal byte bindings");
  assertSha256(manifest.value.sourceManifestSha256,
    "California final acceptance manifest source manifest SHA");
  const sourceManifestBinding = terminalByRole.get("source-manifest");
  assert.ok(sourceManifestBinding, "California final acceptance source-manifest terminal role is absent");
  assert.equal(sourceManifestBinding.sha256, manifest.value.sourceManifestSha256,
    "California final acceptance source-manifest terminal role mixes manifest bytes");
  for (const key of [
    "broadSealSha256",
    "broadReportSha256",
    "exhaustiveSealSha256",
    "exhaustiveReportSha256",
    "inventorySha256",
    "layerASealSha256",
    "manifestSha256",
    "sourceManifestSha256",
    "sourceSnapshotSha256"
  ]) assertSha256(seal.value[key], `California final acceptance seal ${key}`);
  assert.equal(seal.value.acceptanceRunId, manifest.value.acceptanceRunId,
    "California final acceptance seal mixes acceptanceRunId");
  assert.equal(seal.value.buildId, manifest.value.buildId,
    "California final acceptance seal mixes buildId");
  assert.equal(seal.value.matrixRunId, manifest.value.matrixRunId,
    "California final acceptance seal mixes matrixRunId");
  assert.equal(seal.value.broadReportSha256, manifest.value.broadReportSha256,
    "California final acceptance seal mixes broad Playwright report");
  assert.equal(seal.value.exhaustiveReportSha256, manifest.value.exhaustiveReportSha256,
    "California final acceptance seal mixes exhaustive Playwright report");
  assert.equal(seal.value.sourceSnapshotSha256, manifest.value.sourceSnapshotSha256,
    "California final acceptance seal mixes frozen source snapshot");
  assert.equal(seal.value.sourceManifestSha256, manifest.value.sourceManifestSha256,
    "California final acceptance seal mixes frozen source manifest bytes");
  assert.equal(seal.value.inventorySha256, manifest.value.inventorySha256,
    "California final acceptance seal mixes canonical payload inventory");
  exactRecord(manifest.value.broadSeal, "California final acceptance broad seal receipt");
  exactRecord(manifest.value.exhaustiveSeal,
    "California final acceptance exhaustive seal receipt");
  for (const [label, receipt] of [
    ["broad", manifest.value.broadSeal],
    ["exhaustive", manifest.value.exhaustiveSeal]
  ] as const) {
    exactKeys(receipt, [
      "artifactCount",
      "fileName",
      "frozenSourceSnapshotSha256",
      "playwrightReportSha256",
      "producerSuccessSha256",
      "sha256",
      "sourceHash",
      "sourceSnapshotSha256",
      "status",
      "streamBindings"
    ], `California final acceptance ${label} seal receipt`);
    assert.equal(receipt.status, "sealed",
      `California final acceptance ${label} seal receipt is not terminal`);
    for (const key of [
      "frozenSourceSnapshotSha256",
      "playwrightReportSha256",
      "producerSuccessSha256",
      "sha256",
      "sourceHash",
      "sourceSnapshotSha256"
    ]) assertSha256(receipt[key], `California final acceptance ${label} receipt ${key}`);
  }
  assert.equal(manifest.value.broadSeal.streamBindings, null,
    "California final acceptance broad receipt claims exhaustive stream bindings");
  const exhaustiveStreamBindings = validateCaliforniaExhaustiveStreamInventoryBindings(
    manifest.value.exhaustiveSeal.streamBindings,
    inventoryRows,
    "California published exhaustive stream bindings"
  );
  assert.equal(
    exhaustiveStreamBindings.length,
    manifest.value.exhaustiveSeal.artifactCount,
    "California published exhaustive stream binding count drifted"
  );
  const executionOwnershipBinding = terminalByRole.get(
    "exhaustive-execution-group-ownership"
  );
  assert.ok(executionOwnershipBinding,
    "California published execution-group ownership terminal role is absent");
  const executionOwnership = readCaliforniaSignatureExecutionGroupOwnershipManifest({
    allowedRoot: runRoot,
    expectedSha256: executionOwnershipBinding.sha256,
    expectedSourceSnapshotSha256: manifest.value.sourceSnapshotSha256 as string,
    manifestPath: path.resolve(runRoot, executionOwnershipBinding.relativePath)
  }).manifest;
  const terminalGroupKeys = exhaustiveStreamBindings.flatMap((binding) => {
    assert.equal(binding.executionGroupOwnership.planSha256,
      executionOwnership.capacityPlanSha256,
    `${binding.artifactId}: terminal stream binding mixes capacity plans`);
    assert.equal(binding.executionGroupOwnership.sourceIdentitySha256,
      executionOwnership.sourceIdentitySha256,
    `${binding.artifactId}: terminal stream binding mixes source identities`);
    assert.equal(binding.executionGroupOwnership.sourceSnapshotSha256,
      executionOwnership.sourceSnapshotSha256,
    `${binding.artifactId}: terminal stream binding mixes source snapshots`);
    assert.equal(binding.evidenceRecordCount,
      binding.executionGroupOwnership.expectedRecordCount,
    `${binding.artifactId}: terminal stream record count differs from group ownership`);
    return binding.executionGroupOwnership.groupKeys;
  });
  assert.equal(terminalGroupKeys.length, executionOwnership.groupCount,
    "California published terminal streams do not bind all execution groups");
  assert.equal(new Set(terminalGroupKeys).size, terminalGroupKeys.length,
    "California published terminal streams repeat an execution group");
  const ownershipGroupKeys = executionOwnership.packages.flatMap((workPackage) =>
    workPackage.projects.flatMap((slice) => slice.groupKeys)
  );
  exactStrings(ownershipGroupKeys, terminalGroupKeys,
    "California published terminal execution-group union");
  assert.equal(exhaustiveStreamBindings.reduce((sum, binding) =>
    sum + binding.executionGroupOwnership.expectedRecordCount, 0),
  executionOwnership.evidenceRecordCount,
  "California published terminal streams evidence total differs from execution ownership");
  assert.equal(exhaustiveStreamBindings.reduce((sum, binding) =>
    sum + binding.executionGroupOwnership.receiptCount, 0),
  executionOwnership.receiptCount,
  "California published terminal streams receipt total differs from execution ownership");
  assert.equal(exhaustiveStreamBindings.reduce((sum, binding) =>
    sum + binding.executionGroupOwnership.cropCount, 0),
  executionOwnership.cropCount,
  "California published terminal streams crop total differs from execution ownership");
  assert.equal(seal.value.broadSealSha256, manifest.value.broadSeal.sha256,
    "California final acceptance seal does not bind the broad seal receipt");
  assert.equal(seal.value.exhaustiveSealSha256, manifest.value.exhaustiveSeal.sha256,
    "California final acceptance seal does not bind the exhaustive seal receipt");
  assert.equal(seal.value.layerASealSha256, manifest.value.layerASealSha256,
    "California final acceptance seal does not bind the Layer A seal receipt");
  assert.equal(manifest.value.broadSeal.playwrightReportSha256,
    manifest.value.broadReportSha256,
    "California final acceptance manifest does not bind the broad Playwright report receipt");
  assert.equal(manifest.value.exhaustiveSeal.playwrightReportSha256,
    manifest.value.exhaustiveReportSha256,
    "California final acceptance manifest does not bind the exhaustive Playwright report receipt");
  assert.equal(manifest.value.broadSeal.sourceSnapshotSha256,
    manifest.value.sourceSnapshotSha256,
    "California final acceptance manifest does not bind broad ledger sourceSnapshotSha256");
  assert.equal(manifest.value.broadSeal.frozenSourceSnapshotSha256,
    manifest.value.sourceSnapshotSha256,
    "California final acceptance manifest does not bind broad frozen source snapshot");
  assert.equal(manifest.value.exhaustiveSeal.sourceSnapshotSha256,
    manifest.value.sourceSnapshotSha256,
    "California final acceptance manifest does not bind exhaustive ledger sourceSnapshotSha256");
  assert.equal(manifest.value.exhaustiveSeal.frozenSourceSnapshotSha256,
    manifest.value.sourceSnapshotSha256,
    "California final acceptance manifest does not bind exhaustive frozen source snapshot");
  for (const [role, expectedSha256] of [
    ["layer-a-seal", manifest.value.layerASealSha256],
    ["broad-report", manifest.value.broadReportSha256],
    ["broad-producer-success", manifest.value.broadSeal.producerSuccessSha256],
    ["broad-seal", manifest.value.broadSeal.sha256],
    ["exhaustive-report", manifest.value.exhaustiveReportSha256],
    ["exhaustive-producer-success", manifest.value.exhaustiveSeal.producerSuccessSha256],
    ["exhaustive-seal", manifest.value.exhaustiveSeal.sha256]
  ] as const) {
    const binding = terminalByRole.get(role as CaliforniaTerminalFileBinding["role"]);
    assert.ok(binding, `California final acceptance terminal role ${role} is absent`);
    assert.equal(binding.sha256, expectedSha256,
      `California final acceptance terminal role ${role} mixes receipt bytes`);
  }
  const productManifestBinding = terminalByRole.get("layer-a-product-manifest");
  const desktopProductReceiptBinding = terminalByRole.get("layer-a-product-receipt-desktop");
  const mobileProductReceiptBinding = terminalByRole.get("layer-a-product-receipt-mobile");
  assert.ok(productManifestBinding && desktopProductReceiptBinding && mobileProductReceiptBinding,
    "California final acceptance product manifest/receipt terminal roles are incomplete");
  const productReceiptDir = path.dirname(path.resolve(runRoot, desktopProductReceiptBinding.relativePath));
  assert.equal(path.dirname(path.resolve(runRoot, mobileProductReceiptBinding.relativePath)), productReceiptDir,
    "California final acceptance product receipts use mixed directories");
  const verifiedProductManifest = await verifyProductSmokeManifest({
    acceptanceRunId: manifest.value.acceptanceRunId as string,
    buildId: manifest.value.buildId as string,
    manifestPath: path.resolve(runRoot, productManifestBinding.relativePath),
    receiptDir: productReceiptDir,
    sourceSnapshotSha256: manifest.value.sourceSnapshotSha256 as string
  });
  assert.equal(verifiedProductManifest.sha256, productManifestBinding.sha256,
    "California final acceptance product manifest terminal role mixes manifest bytes");
  assert.deepEqual(
    verifiedProductManifest.manifest.receiptFiles.map((binding) => binding.sha256),
    [desktopProductReceiptBinding.sha256, mobileProductReceiptBinding.sha256],
    "California final acceptance product receipt terminal roles mix browser receipt bytes"
  );
  const productReportBinding = terminalByRole.get("layer-a-product-report");
  const layerAReceiptBinding = terminalByRole.get("layer-a-receipt");
  const layerASealBinding = terminalByRole.get("layer-a-seal");
  assert.ok(productReportBinding && layerAReceiptBinding && layerASealBinding,
    "California final acceptance Layer A terminal roles are incomplete");
  const layerAReceipt = await readJsonObject(
    path.resolve(runRoot, layerAReceiptBinding.relativePath),
    "California final acceptance Layer A receipt"
  );
  exactKeys(layerAReceipt.value, [
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
  ], "California final acceptance Layer A receipt");
  assert.equal(layerAReceipt.sha256, layerAReceiptBinding.sha256,
    "California final acceptance Layer A receipt terminal role mixes bytes");
  assert.equal(layerAReceipt.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION);
  assert.equal(layerAReceipt.value.status, "passed");
  assert.equal(layerAReceipt.value.acceptanceRunId, manifest.value.acceptanceRunId);
  assert.equal(layerAReceipt.value.buildId, manifest.value.buildId);
  assert.equal(layerAReceipt.value.sourceSnapshotSha256, manifest.value.sourceSnapshotSha256);
  assert.equal(layerAReceipt.value.instrumentation, "none");
  assert.equal(layerAReceipt.value.canvasNonTextClaim, false);
  assert.equal(layerAReceipt.value.graphicsReceipts, 0);
  assert.equal(layerAReceipt.value.playwrightReportSha256, productReportBinding.sha256,
    "California final acceptance Layer A receipt mixes product Playwright report bytes");
  assert.equal(layerAReceipt.value.productSmokeManifestSha256, productManifestBinding.sha256,
    "California final acceptance Layer A receipt mixes product manifest bytes");
  assert.equal(layerAReceipt.value.actualNextBuildId,
    verifiedProductManifest.manifest.actualNextBuildId,
    "California final acceptance Layer A receipt mixes actual Next BUILD_ID");
  const layerASeal = await readJsonObject(
    path.resolve(runRoot, layerASealBinding.relativePath),
    "California final acceptance Layer A seal"
  );
  exactKeys(layerASeal.value, [
    "acceptanceRunId",
    "buildId",
    "canvasNonTextClaim",
    "graphicsReceipts",
    "instrumentation",
    "receiptFileName",
    "receiptSha256",
    "schemaVersion",
    "sourceSnapshotSha256",
    "status"
  ], "California final acceptance Layer A seal");
  assert.equal(layerASeal.sha256, layerASealBinding.sha256,
    "California final acceptance Layer A seal terminal role mixes bytes");
  assert.equal(layerASeal.value.schemaVersion, CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION);
  assert.equal(layerASeal.value.status, "sealed");
  assert.equal(layerASeal.value.acceptanceRunId, manifest.value.acceptanceRunId);
  assert.equal(layerASeal.value.buildId, manifest.value.buildId);
  assert.equal(layerASeal.value.sourceSnapshotSha256, manifest.value.sourceSnapshotSha256);
  assert.equal(layerASeal.value.instrumentation, "none");
  assert.equal(layerASeal.value.canvasNonTextClaim, false);
  assert.equal(layerASeal.value.graphicsReceipts, 0);
  assert.equal(layerASeal.value.receiptFileName, path.basename(layerAReceiptBinding.relativePath),
    "California final acceptance Layer A seal names the wrong receipt");
  assert.equal(layerASeal.value.receiptSha256, layerAReceiptBinding.sha256,
    "California final acceptance Layer A seal mixes receipt bytes");
  const verifiedSourceManifest = await verifyFrozenSourceManifest({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: path.resolve(runRoot, sourceManifestBinding.relativePath)
  });
  assert.equal(verifiedSourceManifest.sha256, manifest.value.sourceManifestSha256,
    "California final acceptance durable source manifest SHA drifted");
  assert.equal(verifiedSourceManifest.manifest.aggregateSha256, manifest.value.sourceSnapshotSha256,
    "California final acceptance durable source manifest mixes source snapshot aggregate");
  await verifyCaliforniaExhaustiveStreamBindingFiles({
    bindings: exhaustiveStreamBindings,
    inventoryRows,
    runRoot
  });
  await verifyTerminalFilesAgainstBindings({ bindings: terminalFiles, runRoot });
  const finalManifestRow = await inventoryFileRow(runRoot, options.manifestPath);
  const finalSealRow = await inventoryFileRow(runRoot, options.sealPath);
  const expectedPublishedRows = validateCaliforniaInventoryRows(
    [...inventoryRows, finalManifestRow, finalSealRow].sort(compareInventoryRows),
    "California expected published inventory"
  );
  const actualPublishedRows = await inventoryCaliforniaRunRoot(runRoot);
  await assertInventoryExact(
    expectedPublishedRows,
    actualPublishedRows,
    "California post-publication"
  );
  assertKnownTopLevelInventory(actualPublishedRows.map((row) => row.path));
  assert.equal(seal.value.inventoryEntryCount, expectedPublishedRows.length,
    "California final acceptance seal inventory count drifted after publication");
  return { manifestSha256: manifest.sha256, sealSha256: seal.sha256 };
}

export function layerEnvironment(options: {
  acceptanceRunId: string;
  baseEnv: CaliforniaAcceptanceEnvironmentInput;
  buildId: string;
  executionGroupOwnershipReceipt?: { path: string; sha256: string };
  layout: RunLayout;
  layer: "a" | "b";
  matrixRunId: string;
  origin: string;
  sourceManifest: CaliforniaFrozenSourceManifest;
}) {
  const layerRoot = options.layer === "a" ? options.layout.layerARoot : options.layout.layerBRoot;
  const sourceRoot = options.layer === "a" ? options.layout.layerASourceRoot : options.layout.layerBSourceRoot;
  const writableRoot = options.layer === "a" ? options.layout.layerAWritableRoot : options.layout.layerBWritableRoot;
  const distDir = path.join(writableRoot, "next-dist");
  const playwrightE2eRoot = path.join(writableRoot, "playwright");
  const extras: Record<string, string | undefined> = {
    CA_VIZ_ACCEPTANCE_RUN_ID: options.acceptanceRunId,
    CA_VIZ_BASELINE_SHA: options.sourceManifest.gitHead,
    CA_VIZ_BUILD_ID: options.buildId,
    CA_VIZ_MATRIX_RUN_ID: options.matrixRunId,
    NEXT_DIST_DIR: distDir,
    NEXT_TSCONFIG_PATH: generatedTsconfigPath(sourceRoot),
    PLAYWRIGHT_BASE_URL: options.origin,
    PLAYWRIGHT_CRASHPAD_DIR: path.join(playwrightE2eRoot, "chrome-crashpad"),
    PLAYWRIGHT_E2E_ROOT: playwrightE2eRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: distDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: generatedTsconfigPath(sourceRoot),
    PLAYWRIGHT_OUTPUT_DIR: path.join(writableRoot, "playwright-output"),
    PLAYWRIGHT_REPORT_DIR: path.join(writableRoot, "playwright-report"),
    PLAYWRIGHT_RUN_ID: `${options.matrixRunId}-${options.layer}`,
    PLAYWRIGHT_SKIP_WEBSERVER: "1"
  };
  if (options.layer === "a") {
    extras.CA_VIZ_PRODUCT_SMOKE_INSTRUMENTATION = "none";
    extras.CA_VIZ_PRODUCT_SMOKE_LAYER = "A";
    extras.CA_VIZ_PRODUCT_SMOKE_RECEIPT_DIR = options.layout.productSmokeReceiptRoot;
    extras.CA_VIZ_SOURCE_SNAPSHOT_SHA256 = options.sourceManifest.aggregateSha256;
  } else {
    assert.ok(options.executionGroupOwnershipReceipt,
      "Layer B requires the exact execution-group ownership receipt");
    Object.assign(extras, {
      CA_SIGNATURE_BENCHES_PER_PACKAGE: "4",
      CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: options.baseEnv.CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID,
      CA_SIGNATURE_EXHAUSTIVE_BUILD_ID: options.buildId,
      CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR: options.layout.exhaustiveLedgerRoot,
      CA_SIGNATURE_EXHAUSTIVE_ORIGIN: options.origin,
      CA_SIGNATURE_EXHAUSTIVE_RUN_ID: options.baseEnv.CA_SIGNATURE_EXHAUSTIVE_RUN_ID,
      CA_SIGNATURE_EXECUTION_GROUP_PLAN_PATH:
        options.executionGroupOwnershipReceipt.path,
      CA_SIGNATURE_EXECUTION_GROUP_PLAN_SHA256:
        options.executionGroupOwnershipReceipt.sha256,
      CA_SIGNATURE_PRODUCT_PROJECT_ROOT: options.layout.frozenSourceRoot,
      CA_SIGNATURE_QA_STAGING_ROOT: sourceRoot,
      CA_VIZ_COMPOSED_QA_BUILD: "1",
      CA_VIZ_AXES: CALIFORNIA_ACCEPTANCE_ALL_AXES.join(","),
      CA_VIZ_COVERAGE_LEDGER_DIR: options.layout.broadLedgerRoot,
      CA_VIZ_EXPECT_TIMEOUT_MS: "60000",
      CA_VIZ_GRADES: "all",
      CA_VIZ_INCLUDE_PREMIUM: "1",
      CA_VIZ_LABS: "all",
      CA_VIZ_MAX_VISITS_PER_PACKAGE: "10",
      CA_VIZ_SOURCE_SNAPSHOT_SHA256: options.sourceManifest.aggregateSha256,
      CA_VIZ_TEST_TIMEOUT_MS: "720000",
      CA_VIZ_UX_BUDGET_MS: "30000"
    });
  }
  const env = buildCaliforniaAcceptanceEnvironment({
    baseEnv: options.baseEnv,
    extras,
    runRoot: options.layout.runRoot,
    tempRoot: path.join(layerRoot, "runtime-temp"),
    writableRoot
  });
  for (const key of ["TMPDIR", "TMP", "TEMP", "SQLITE_TMPDIR"] as const) {
    assert.ok(!isInside(sourceRoot, path.resolve(env[key]!)),
      `${key} must remain disjoint from the frozen product source root`);
  }
  delete env.CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256;
  delete env.CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256;
  for (const key of [
    "CA_VIZ_SHARD",
    "CA_VIZ_SHARD_INDEX",
    "CA_VIZ_SHARD_TOTAL",
    "CA_SIGNATURE_EXHAUSTIVE_SHARD",
    "CA_VIZ_GRADE",
    "CA_VIZ_LAB"
  ]) delete env[key];
  if (options.layer === "a") {
    for (const key of [
      "CA_SIGNATURE_BENCHES_PER_PACKAGE",
      "CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID",
      "CA_SIGNATURE_EXHAUSTIVE_BUILD_ID",
      "CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR",
      "CA_SIGNATURE_EXHAUSTIVE_ORIGIN",
      "CA_SIGNATURE_EXHAUSTIVE_RUN_ID",
      "CA_SIGNATURE_PRODUCT_PROJECT_ROOT",
      "CA_SIGNATURE_QA_STAGING_ROOT",
      "CA_VISUALIZATION_QA_BUILD",
      "CA_VIZ_COMPOSED_QA_BUILD",
      "CA_VIZ_AXES",
      "CA_VIZ_COVERAGE_LEDGER_DIR",
      "CA_VIZ_EXPECT_TIMEOUT_MS",
      "CA_VIZ_GRADE",
      "CA_VIZ_GRADES",
      "CA_VIZ_INCLUDE_PREMIUM",
      "CA_VIZ_LAB",
      "CA_VIZ_LABS",
      "CA_VIZ_LOCALE",
      "CA_VIZ_LOCALES",
      "CA_VIZ_MAX_VISITS_PER_PACKAGE",
      "CA_VIZ_THEME",
      "CA_VIZ_THEMES",
      "CA_VIZ_TEST_TIMEOUT_MS",
      "CA_VIZ_UX_BUDGET_MS",
      "CA_VIZ_VIEWPORT",
      "CA_VIZ_VIEWPORTS"
    ]) delete env[key];
  }
  return env;
}

async function readNextBuildId(sourceRoot: string, writableRoot: string) {
  const target = path.join(writableRoot, "next-dist", "BUILD_ID");
  const identity = await lstat(target);
  assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
    `${sourceRoot}: Next BUILD_ID is missing, linked, or special`);
  const value = (await readFile(target, "utf8")).trim();
  assert.ok(value && value.length <= 256 && !/[\u0000-\u001f\u007f/\\]/.test(value),
    `${sourceRoot}: Next BUILD_ID is empty or unsafe`);
  return value;
}

function logPaths(layout: RunLayout, layer: "a" | "b", name: string) {
  const root = path.join(layer === "a" ? layout.layerARoot : layout.layerBRoot, "logs");
  return {
    stderrPath: path.join(root, `${name}.stderr.log`),
    stdoutPath: path.join(root, `${name}.stdout.log`)
  };
}

function withPlaywrightPort(env: NodeJS.ProcessEnv, port: number) {
  return { ...env, PLAYWRIGHT_PORT: String(port) };
}

export function buildCaliforniaNextProcessEnvironment(options: {
  env: NodeJS.ProcessEnv;
  sourceRoot: string;
}) {
  assert.ok(path.isAbsolute(options.sourceRoot) &&
    path.resolve(options.sourceRoot) === options.sourceRoot,
  "Next subprocess source root must be one normalized absolute path");
  const env = { ...options.env };
  for (const key of ["NEXT_DIST_DIR", "NEXT_TSCONFIG_PATH"] as const) {
    const value = env[key];
    assert.ok(value && value.trim() === value && path.isAbsolute(value),
      `${key} must be one audited absolute path before the Next subprocess boundary`);
    const absolute = path.resolve(value);
    assert.ok(isInside(options.sourceRoot, absolute),
      `${key} must remain inside the isolated Next project copy`);
    const relative = path.relative(options.sourceRoot, absolute).replace(/\\/g, "/");
    assert.ok(relative && !relative.startsWith("../") && !path.isAbsolute(relative),
      `${key} could not be represented as one contained project-relative path`);
    env[key] = relative;
  }
  return env;
}

export function buildCaliforniaExpectedNextEnvBuildBytes(options: {
  distDir: string;
  originalBytes: Buffer;
  sourceRoot: string;
}) {
  assert.ok(path.isAbsolute(options.sourceRoot) &&
    path.resolve(options.sourceRoot) === options.sourceRoot,
  "next-env source root must be one normalized absolute path");
  assert.ok(path.isAbsolute(options.distDir) &&
    path.resolve(options.distDir) === options.distDir,
  "next-env dist directory must be one normalized absolute path");
  assert.ok(options.distDir !== options.sourceRoot &&
    isInside(options.sourceRoot, options.distDir),
  "next-env dist directory must remain strictly inside the isolated source root");
  const relativeDistDir = path.relative(options.sourceRoot, options.distDir)
    .replace(/\\/g, "/");
  assert.ok(relativeDistDir && !relativeDistDir.startsWith("../") &&
    !path.posix.isAbsolute(relativeDistDir),
  "next-env dist directory could not be represented as one contained relative path");
  const originalText = options.originalBytes.toString("utf8");
  assert.ok(Buffer.from(originalText, "utf8").equals(options.originalBytes),
    "next-env original declaration is not canonical UTF-8");
  const originalReference = '/// <reference path="./.next/types/routes.d.ts" />';
  const referenceMatches = originalText.split(originalReference).length - 1;
  assert.equal(referenceMatches, 1,
    "next-env original declaration must contain exactly one default route-types reference");
  const expectedReference =
    `/// <reference path="./${relativeDistDir}/types/routes.d.ts" />`;
  return Buffer.from(originalText.replace(originalReference, expectedReference), "utf8");
}

type CaliforniaNextEnvIdentity = {
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
};

function assertCaliforniaNextEnvIdentity(
  actual: CaliforniaNextEnvIdentity,
  expected: CaliforniaNextEnvIdentity,
  label: string
) {
  for (const key of ["dev", "ino", "nlink", "uid", "mode"] as const) {
    assert.equal(actual[key], expected[key], `${label}: next-env ${key} changed`);
  }
}

async function readCaliforniaControlledNextEnv(options: {
  expectedIdentity?: CaliforniaNextEnvIdentity;
  nextEnvPath: string;
}) {
  const pathIdentity = await lstat(options.nextEnvPath);
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink(),
    "next-env must remain one regular non-symlink file");
  assert.equal(pathIdentity.nlink, 1, "next-env hardlinks are forbidden");
  const getuid = process.getuid;
  assert.ok(typeof getuid === "function", "next-env restoration requires process.getuid");
  assert.equal(pathIdentity.uid, getuid(), "next-env owner changed");
  const identity: CaliforniaNextEnvIdentity = {
    dev: pathIdentity.dev,
    ino: pathIdentity.ino,
    mode: pathIdentity.mode & 0o777,
    nlink: pathIdentity.nlink,
    uid: pathIdentity.uid
  };
  if (options.expectedIdentity) {
    assertCaliforniaNextEnvIdentity(identity, options.expectedIdentity, "path identity");
  }
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "next-env restoration requires O_NOFOLLOW");
  const handle = await open(
    options.nextEnvPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
  );
  try {
    const before = await handle.stat();
    assertCaliforniaNextEnvIdentity({
      dev: before.dev,
      ino: before.ino,
      mode: before.mode & 0o777,
      nlink: before.nlink,
      uid: before.uid
    }, identity, "held read identity");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assertCaliforniaNextEnvIdentity({
      dev: after.dev,
      ino: after.ino,
      mode: after.mode & 0o777,
      nlink: after.nlink,
      uid: after.uid
    }, identity, "held post-read identity");
    assert.equal(after.size, bytes.length, "next-env size changed during held read");
    const pathAfter = await lstat(options.nextEnvPath);
    assertCaliforniaNextEnvIdentity({
      dev: pathAfter.dev,
      ino: pathAfter.ino,
      mode: pathAfter.mode & 0o777,
      nlink: pathAfter.nlink,
      uid: pathAfter.uid
    }, identity, "post-read path identity");
    assert.equal(pathAfter.size, bytes.length, "next-env path size changed during held read");
    return { bytes, identity };
  } finally {
    await handle.close();
  }
}

export async function runWithCaliforniaNextEnvRestoration<T>(options: {
  distDir: string;
  run: () => Promise<T>;
  sourceRoot: string;
}): Promise<T> {
  assert.equal(typeof options.run, "function", "next-env build callback is required");
  await assertDirectoryNoSymlink(options.sourceRoot, "next-env isolated source root");
  const nextEnvPath = path.join(options.sourceRoot, "next-env.d.ts");
  await assertNoSymlinkSegments(options.sourceRoot, nextEnvPath);
  const original = await readCaliforniaControlledNextEnv({ nextEnvPath });
  const expectedBytes = buildCaliforniaExpectedNextEnvBuildBytes({
    distDir: options.distDir,
    originalBytes: original.bytes,
    sourceRoot: options.sourceRoot
  });
  let completed = false;
  try {
    const result = await options.run();
    completed = true;
    return result;
  } finally {
    const current = await readCaliforniaControlledNextEnv({
      expectedIdentity: original.identity,
      nextEnvPath
    });
    const isOriginal = current.bytes.equals(original.bytes);
    const isExpected = current.bytes.equals(expectedBytes);
    assert.ok(isOriginal || isExpected,
      "next-env contains an unexpected mutation; preserving it as failure evidence");
    if (completed) {
      assert.ok(isExpected,
        "successful Next build did not produce the exact expected next-env mutation");
    }
    if (isExpected) {
      const handle = await open(
        nextEnvPath,
        fsConstants.O_RDWR | fsConstants.O_NOFOLLOW
      );
      try {
        const heldIdentity = await handle.stat();
        assertCaliforniaNextEnvIdentity({
          dev: heldIdentity.dev,
          ino: heldIdentity.ino,
          mode: heldIdentity.mode & 0o777,
          nlink: heldIdentity.nlink,
          uid: heldIdentity.uid
        }, original.identity, "held restoration identity");
        assert.equal(heldIdentity.size, expectedBytes.length,
          "next-env size changed before exact restoration");
        await handle.truncate(0);
        let offset = 0;
        while (offset < original.bytes.length) {
          const { bytesWritten } = await handle.write(
            original.bytes,
            offset,
            original.bytes.length - offset,
            offset
          );
          assert.ok(bytesWritten > 0, "next-env exact restoration made no write progress");
          offset += bytesWritten;
        }
        await handle.chmod(original.identity.mode);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fsyncDirectory(path.dirname(nextEnvPath));
      const restored = await readCaliforniaControlledNextEnv({
        expectedIdentity: original.identity,
        nextEnvPath
      });
      assert.deepEqual(restored.bytes, original.bytes,
        "next-env exact restoration bytes drifted");
    }
  }
}

async function runBuild(options: {
  env: NodeJS.ProcessEnv;
  layout: RunLayout;
  operations: CaliforniaAcceptanceOperations;
  plan: CaliforniaCommandPlan;
  sourceRoot: string;
  writableRoot: string;
}) {
  await mkdir(options.writableRoot, { recursive: true, mode: 0o700 });
  await ensureWritableEnvironmentDirectories(options.env);
  await writeGeneratedTsconfig(options.sourceRoot, path.join(options.writableRoot, "next-dist"));
  const paths = logPaths(options.layout, options.sourceRoot === options.layout.layerASourceRoot ? "a" : "b", "build");
  try {
    await runWithCaliforniaNextEnvRestoration({
      distDir: path.join(options.writableRoot, "next-dist"),
      run: () => options.operations.runCommand({
        ...options.plan,
        env: buildCaliforniaNextProcessEnvironment({
          env: options.env,
          sourceRoot: options.sourceRoot
        }),
        ...paths,
        timeoutMs: 30 * 60_000
      }),
      sourceRoot: options.sourceRoot
    });
  } finally {
    if (await lstatOrNull(generatedTsconfigPath(options.sourceRoot))) {
      await removeExactGeneratedTsconfig(options.sourceRoot);
    }
  }
  return readNextBuildId(options.sourceRoot, options.writableRoot);
}

async function runServerBoundCommand(options: {
  command: CaliforniaCommandPlan;
  commandLogs: { stderrPath: string; stdoutPath: string };
  commandTimeoutMs: number;
  env: NodeJS.ProcessEnv;
  layout: RunLayout;
  operations: CaliforniaAcceptanceOperations;
  port: number;
  server: CaliforniaCommandPlan;
  serverLogs: { stderrPath: string; stdoutPath: string };
}) {
  await options.operations.assertPortFree(options.port);
  const server = await options.operations.startServer({
    ...options.server,
    argv: [...options.server.argv],
    env: buildCaliforniaNextProcessEnvironment({
      env: withPlaywrightPort(options.env, options.port),
      sourceRoot: options.server.cwd
    }),
    port: options.port,
    ...options.serverLogs,
    timeoutMs: 120_000
  });
  try {
    return await options.operations.runCommand({
      ...options.command,
      env: withPlaywrightPort(options.env, options.port),
      ...options.commandLogs,
      timeoutMs: options.commandTimeoutMs
    });
  } finally {
    await server.stop();
  }
}

async function runCaliforniaMeasuredAuthorizationRequestPreparation(
  cli: Extract<CaliforniaAcceptanceCliOptions, {
    mode: "prepare-measured-authorization-request";
  }>,
  operations: CaliforniaAcceptanceOperations
) {
  const runRoot = await assertFreshStarshipRunRoot(cli.runRoot);
  const layout = buildRunLayout(runRoot);
  const runRootCapability = await createRunDirectories(layout);
  const entrypoints = resolveCaliforniaLocalEntrypoints();
  const plans = buildCaliforniaCommandPlans({ entrypoints, layout });
  assertLocalOnlyCommandPlans(plans, entrypoints);
  const identityEnv = {
    ...process.env,
    NODE_ENV: "production" as const,
    CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: cli.runtimeRunId,
    CA_SIGNATURE_EXHAUSTIVE_RUN_ID: cli.exhaustiveRunId
  };
  const preflightEnv = buildCaliforniaAcceptanceEnvironment({
    baseEnv: identityEnv,
    runRoot,
    writableRoot: path.join(runRoot, "preflight", "writable")
  });
  await ensureWritableEnvironmentDirectories(preflightEnv);
  await operations.runCommand({
    ...plans.catalogCheck,
    env: preflightEnv,
    expectedExitCodes: [0],
    stderrPath: path.join(runRoot, "preflight", "logs", "catalog-check.stderr.log"),
    stdoutPath: path.join(runRoot, "preflight", "logs", "catalog-check.stdout.log"),
    timeoutMs: 120_000
  });

  const sourceManifestDraft = await buildSourceManifest({
    env: preflightEnv,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  const sourceManifestWrite = await writeExclusiveJson(
    layout.sourceManifestPath,
    sourceManifestDraft
  );
  await chmod(layout.sourceManifestPath, 0o400);
  await fsyncDirectory(path.dirname(layout.sourceManifestPath));
  const sourceManifestPublication = await verifyFrozenSourceManifest({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: layout.sourceManifestPath
  });
  assert.equal(sourceManifestPublication.sha256, sourceManifestWrite.sha256,
    "California frozen source manifest changed during measured-authorization preparation");
  const sourceManifest = sourceManifestPublication.manifest;
  await createIndependentSourceCopies({
    frozenRoot: layout.frozenSourceRoot,
    layerARoot: layout.layerASourceRoot,
    layerBRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    sourceRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  await verifyManifestTree({
    entries: sourceManifest.entries,
    root: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  await assertSourcePathInventoryUnchanged({
    env: preflightEnv,
    expectedEntries: sourceManifest.entries,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  assertProductSourcesUninstrumented(layout.layerASourceRoot);
  assertProductSourcesUninstrumented(layout.layerBSourceRoot);
  const markerManifest = buildCaliforniaSignatureSourceManifest(
    layout.frozenSourceRoot
  );
  assertCaliforniaSignatureSourceManifestFrozen(markerManifest);
  const markerContract = buildCaliforniaCanvasGraphicsSourceContract(
    layout.frozenSourceRoot
  );
  const executionGroupOwnershipPublication =
    await publishCaliforniaSignatureExecutionGroupOwnership({
      capacityPlanPath: cli.capacityPlanPath,
      capacityPlanSha256: cli.capacityPlanSha256,
      canvasContract: markerContract,
      manifest: markerManifest,
      projectRoot: layout.frozenSourceRoot,
      runRoot: layout.runRoot,
      sourceSnapshotSha256: sourceManifest.aggregateSha256,
      targetPath: layout.executionGroupOwnershipPath
    });
  const request = buildCaliforniaSignatureMeasuredAuthorizationRequest({
    acceptanceRunId: cli.acceptanceRunId,
    attemptId: cli.authorizationAttemptId,
    buildId: cli.buildId,
    executionPlanSha256: cli.capacityPlanSha256,
    launchCommand: {
      projects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
      repeatEach: 1,
      reporter: "json",
      retries: 0,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
      workers: 1
    },
    matrixRunId: cli.matrixRunId,
    origin: `http://127.0.0.1:${cli.layerBPort}`,
    runtimeRunId: cli.runtimeRunId,
    sourceSnapshotSha256: sourceManifest.aggregateSha256
  });
  const publication = await publishCaliforniaSignatureMeasuredAuthorizationRequest({
    request,
    runRootCapability
  });
  return Object.freeze({
    authorizationRequestPath: publication.authorizationRequestPath,
    authorizationRequestSha256: publication.authorizationRequestSha256,
    browserExecutionStarted: false,
    executionGroupOwnershipPath: executionGroupOwnershipPublication.path,
    executionGroupOwnershipSha256: executionGroupOwnershipPublication.sha256,
    exhaustiveExecutionAuthorized: false,
    mode: "prepare-measured-authorization-request" as const,
    runRoot,
    serverExecutionStarted: false,
    sourceSnapshotSha256: sourceManifest.aggregateSha256,
    status: "AWAITING_OWNER_REVIEW" as const
  });
}

type CaliforniaMeasuredAuthorizationLaunchContext = Readonly<{
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: Readonly<{
    projects: readonly ["desktop-chrome", "mobile-chrome"];
    repeatEach: 1;
    reporter: "json";
    retries: 0;
    specPath: "tests/e2e/california-signature-exhaustive.spec.ts";
    workers: 1;
  }>;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  sourceSnapshotSha256: string;
}>;

type CaliforniaMeasuredAuthorizationLaunchVerifier = (options: {
  authorization: unknown;
  launch: () => unknown;
  launchContext: CaliforniaMeasuredAuthorizationLaunchContext;
}) => unknown;

async function launchCaliforniaMeasuredAuthorizationExhaustive(options: {
  authorization: unknown;
  env: NodeJS.ProcessEnv;
  launchContext: CaliforniaMeasuredAuthorizationLaunchContext;
  operations: Pick<CaliforniaAcceptanceOperations, "runCommand">;
  plan: CaliforniaCommandPlan;
  stderrPath: string;
  stdoutPath: string;
  verifyForLaunch: CaliforniaMeasuredAuthorizationLaunchVerifier;
}) {
  return await options.verifyForLaunch({
    authorization: options.authorization,
    launch: () => options.operations.runCommand({
      ...options.plan,
      env: {
        ...options.env,
        [CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV]:
          CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE
      },
      stderrPath: options.stderrPath,
      stdoutPath: options.stdoutPath,
      timeoutMs: 72 * 60 * 60_000
    }),
    launchContext: options.launchContext
  });
}

export async function __testingLaunchCaliforniaMeasuredAuthorizationExhaustive(
  options: {
    authorization: unknown;
    env: NodeJS.ProcessEnv;
    launchContext: CaliforniaMeasuredAuthorizationLaunchContext;
    operations: Pick<CaliforniaAcceptanceOperations, "runCommand">;
    plan: CaliforniaCommandPlan;
    stderrPath: string;
    stdoutPath: string;
    testOnlyVerifyForLaunch: CaliforniaMeasuredAuthorizationLaunchVerifier;
  }
) {
  assert.equal(arguments.length, 1,
    "test-only measured exhaustive launch expects one options object");
  exactRecord(options, "test-only measured exhaustive launch options");
  exactKeys(options, [
    "authorization",
    "env",
    "launchContext",
    "operations",
    "plan",
    "stderrPath",
    "stdoutPath",
    "testOnlyVerifyForLaunch"
  ], "test-only measured exhaustive launch options");
  return launchCaliforniaMeasuredAuthorizationExhaustive({
    authorization: options.authorization,
    env: options.env,
    launchContext: options.launchContext,
    operations: options.operations,
    plan: options.plan,
    stderrPath: options.stderrPath,
    stdoutPath: options.stdoutPath,
    verifyForLaunch: options.testOnlyVerifyForLaunch
  });
}

async function runCaliforniaMeasuredAuthorizationExecution(
  cli: Extract<CaliforniaAcceptanceCliOptions, {
    mode: "execute-measured-authorization";
  }>,
  operations: CaliforniaAcceptanceOperations
) {
  const runRoot = await assertPreparedStarshipRunRoot(cli.runRoot);
  const layout = buildRunLayout(runRoot);
  const entrypoints = resolveCaliforniaLocalEntrypoints();
  const plans = buildCaliforniaCommandPlans({ entrypoints, layout });
  assertLocalOnlyCommandPlans(plans, entrypoints);
  const sourceManifestPublication = await verifyFrozenSourceManifest({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: layout.sourceManifestPath
  });
  const sourceManifest = sourceManifestPublication.manifest;
  const markerManifest = buildCaliforniaSignatureSourceManifest(
    layout.frozenSourceRoot
  );
  assertCaliforniaSignatureSourceManifestFrozen(markerManifest);
  const markerContract = buildCaliforniaCanvasGraphicsSourceContract(
    layout.frozenSourceRoot
  );
  const executionOwnershipBytes = await readJsonObject(
    layout.executionGroupOwnershipPath,
    "prepared California execution-group ownership"
  );
  const executionGroupOwnershipPublication =
    readCaliforniaSignatureExecutionGroupOwnershipManifest({
      allowedRoot: layout.runRoot,
      expectedSha256: executionOwnershipBytes.sha256,
      expectedSourceSnapshotSha256: sourceManifest.aggregateSha256,
      manifestPath: layout.executionGroupOwnershipPath
    });
  const externalCapacityPlanPublication =
    await readCaliforniaExternalCapacityPartitionPlan({
    expectedSha256: cli.capacityPlanSha256,
    planPath: cli.capacityPlanPath
  });
  assert.equal(
    executionGroupOwnershipPublication.manifest.capacityPlanSha256,
    externalCapacityPlanPublication.plan.planSha256,
    "prepared execution-group ownership differs from the receipt-bound capacity plan"
  );
  const expectedRequest = buildCaliforniaSignatureMeasuredAuthorizationRequest({
    acceptanceRunId: cli.acceptanceRunId,
    attemptId: cli.authorizationAttemptId,
    buildId: cli.buildId,
    executionPlanSha256: cli.capacityPlanSha256,
    launchCommand: {
      projects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
      repeatEach: 1,
      reporter: "json",
      retries: 0,
      specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
      workers: 1
    },
    matrixRunId: cli.matrixRunId,
    origin: `http://127.0.0.1:${cli.layerBPort}`,
    runtimeRunId: cli.runtimeRunId,
    sourceSnapshotSha256: sourceManifest.aggregateSha256
  });
  const expectedRequestPreparation =
    prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication({
      request: expectedRequest
    });
  const authorizationRequestPath = path.join(
    runRoot,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_FILENAME
  );
  const authorizationRequest =
    readCaliforniaSignatureMeasuredAuthorizationRequest({
      allowedRoot: runRoot,
      expectedRequest,
      expectedSha256:
        expectedRequestPreparation.authorizationRequestSha256,
      requestPath: authorizationRequestPath
    });
  const loadedAuthorization =
    readCaliforniaSignatureMeasuredAuthorizationReceipt({
      allowedRoot: path.dirname(
        CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_PATH
      ),
      authorizationRequest,
      expectedSha256: cli.authorizationReceiptSha256,
      receiptPath: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_PATH
    });

  const identityEnv = {
    ...process.env,
    NODE_ENV: "production" as const,
    CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: cli.runtimeRunId,
    CA_SIGNATURE_EXHAUSTIVE_RUN_ID: cli.exhaustiveRunId
  };
  const preflightEnv = buildCaliforniaAcceptanceEnvironment({
    baseEnv: identityEnv,
    runRoot,
    writableRoot: path.join(runRoot, "preflight", "writable")
  });
  await verifyManifestTree({
    entries: sourceManifest.entries,
    root: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  await assertSourcePathInventoryUnchanged({
    env: preflightEnv,
    expectedEntries: sourceManifest.entries,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  await verifyManifestTree({
    entries: sourceManifest.entries,
    modePolicy: "frozen-readonly",
    root: layout.frozenSourceRoot
  });
  await verifyManifestTree({
    entries: sourceManifest.entries,
    root: layout.layerASourceRoot
  });
  await verifyManifestTree({
    entries: sourceManifest.entries,
    root: layout.layerBSourceRoot
  });
  assertProductSourcesUninstrumented(layout.layerASourceRoot);
  assertProductSourcesUninstrumented(layout.layerBSourceRoot);
  const composed = operations.instrument({
    productProjectRoot: layout.frozenSourceRoot,
    stagingProjectRoot: layout.layerBSourceRoot
  });
  assert.equal(composed.productBytesUnchanged, true,
    "measured execution instrumentation changed frozen product bytes");
  const markers = readAndAssertCaliforniaSignatureComposedMarkers({
    contract: markerContract,
    manifest: markerManifest,
    productProjectRoot: layout.frozenSourceRoot,
    stagingRoot: layout.layerBSourceRoot
  });
  assert.equal(markers.control.productSourceSha256,
    composed.control.productSourceSha256,
  "measured execution control marker product source identity drifted");
  assert.equal(markers.canvas.productSourceSha256,
    composed.canvas.productSourceSha256,
  "measured execution Canvas marker product source identity drifted");
  const signatureSourcePaths = new Set(
    markerManifest.benches.map((bench) => bench.sourcePath)
  );
  await verifyComposedLayerSource({
    layerRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    signatureSourcePaths
  });

  const originB = `http://127.0.0.1:${cli.layerBPort}`;
  const envB = layerEnvironment({
    acceptanceRunId: cli.acceptanceRunId,
    baseEnv: identityEnv,
    buildId: cli.buildId,
    executionGroupOwnershipReceipt: {
      path: layout.executionGroupOwnershipPath,
      sha256: executionGroupOwnershipPublication.fileSha256
    },
    layer: "b",
    layout,
    matrixRunId: cli.matrixRunId,
    origin: originB,
    sourceManifest
  });
  await runBuild({
    env: envB,
    layout,
    operations,
    plan: plans.buildB,
    sourceRoot: layout.layerBSourceRoot,
    writableRoot: layout.layerBWritableRoot
  });
  readAndAssertCaliforniaSignatureComposedMarkers({
    contract: markerContract,
    manifest: markerManifest,
    productProjectRoot: layout.frozenSourceRoot,
    stagingRoot: layout.layerBSourceRoot
  });
  await verifyComposedLayerSource({
    layerRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    signatureSourcePaths
  });
  const exhaustiveProducerContract =
    await buildExhaustiveProducerLifecycleContract({
      buildId: cli.buildId,
      canvasContract: markerContract,
      executionGroupOwnershipManifest:
        executionGroupOwnershipPublication.manifest,
      manifest: markerManifest,
      markers,
      origin: originB,
      runId: cli.exhaustiveRunId,
      runtimeRunId: cli.runtimeRunId,
      sourceSnapshotSha256: sourceManifest.aggregateSha256
    });

  await operations.assertPortFree(cli.layerBPort);
  const serverB = await operations.startServer({
    ...plans.startB,
    env: buildCaliforniaNextProcessEnvironment({
      env: withPlaywrightPort(envB, cli.layerBPort),
      sourceRoot: layout.layerBSourceRoot
    }),
    port: cli.layerBPort,
    ...logPaths(layout, "b", "server"),
    timeoutMs: 120_000
  });
  try {
    await launchCaliforniaMeasuredAuthorizationExhaustive({
      authorization: loadedAuthorization.authorization,
      env: withPlaywrightPort(envB, cli.layerBPort),
      launchContext: {
        attemptId: expectedRequest.attemptId,
        buildId: expectedRequest.buildId,
        executionPlanSha256: expectedRequest.executionPlanSha256,
        launchCommand: expectedRequest.launchCommand,
        requiredProjects: expectedRequest.requiredProjects,
        sourceSnapshotSha256: expectedRequest.sourceSnapshotSha256
      },
      operations,
      plan: plans.exhaustive,
      stderrPath: logPaths(layout, "b", "exhaustive-playwright").stderrPath,
      stdoutPath: layout.exhaustiveReportPath,
      verifyForLaunch:
        verifyCaliforniaSignatureMeasuredAuthorizationForLaunch
    });
  } finally {
    await serverB.stop();
  }

  const exhaustiveReport = await verifyPlaywrightJsonReport({
    expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
    expectedTestCount: exhaustiveProducerContract.expectedMatrix.size,
    reportPath: layout.exhaustiveReportPath
  });
  exactStrings(
    buildCaliforniaExhaustiveExpectedReportIdentities(
      exhaustiveProducerContract.packages
    ),
    exhaustiveReport.identities,
    "California measured exhaustive exact source-derived 51x2 Playwright report identities"
  );
  assert.equal(exhaustiveProducerContract.expectedMatrix.size, 102,
    "California measured exhaustive execution must verify exactly 102 identities");
  const exhaustiveProducerSuccessReceipt =
    await publishCaliforniaSignatureExhaustiveProducerSuccess({
      expectedIdentity: exhaustiveProducerContract.expectedIdentity,
      expectedMatrix: exhaustiveProducerContract.expectedMatrix,
      ledgerRoot: layout.exhaustiveLedgerRoot,
      producerReportSha256: exhaustiveReport.sha256,
      validationContexts: exhaustiveProducerContract.validationContexts
    });
  assert.equal(
    exhaustiveProducerSuccessReceipt.fileName,
    CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
    "California measured exhaustive producer-success helper returned the wrong receipt file"
  );
  const exhaustiveLedgerLogs = logPaths(layout, "b", "exhaustive-ledger");
  await operations.runCommand({
    ...plans.exhaustiveLedger,
    env: {
      ...withPlaywrightPort(envB, cli.layerBPort),
      CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256:
        exhaustiveProducerSuccessReceipt.sha256
    },
    ...exhaustiveLedgerLogs,
    timeoutMs: 12 * 60 * 60_000
  });
  const exhaustiveExternalReceipt = parseUniqueTerminalSealReceipt({
    expectedFileName: CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME,
    label: CALIFORNIA_EXHAUSTIVE_SEAL_RECEIPT_LABEL,
    output: await readFile(exhaustiveLedgerLogs.stdoutPath, "utf8")
  });
  assert.equal(exhaustiveExternalReceipt.artifactCount, 102,
    "measured exhaustive finalizer must bind 51 packages by two projects");
  const exhaustiveReceipt = await verifyExhaustiveTerminalSeal({
    buildId: cli.buildId,
    executionGroupOwnershipManifest:
      executionGroupOwnershipPublication.manifest,
    expectedArtifactsSha256:
      exhaustiveProducerContract.expectedArtifactsSha256,
    expectedPlaywrightReportSha256: exhaustiveReport.sha256,
    expectedProducerSuccessSha256:
      exhaustiveProducerSuccessReceipt.sha256,
    expectedSealSha256: exhaustiveExternalReceipt.sha256,
    exhaustiveRunId: cli.exhaustiveRunId,
    frozenSourceSnapshotSha256: sourceManifest.aggregateSha256,
    ledgerRoot: layout.exhaustiveLedgerRoot,
    origin: originB,
    runtimeRunId: cli.runtimeRunId
  });
  return Object.freeze({
    authorizationRequestPath,
    authorizationRequestSha256:
      expectedRequestPreparation.authorizationRequestSha256,
    authorizationReceiptPath:
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_PATH,
    authorizationReceiptSha256: cli.authorizationReceiptSha256,
    exhaustiveReceipt,
    exhaustiveReportSha256: exhaustiveReport.sha256,
    mode: "execute-measured-authorization" as const,
    runRoot,
    sourceSnapshotSha256: sourceManifest.aggregateSha256,
    status: "MEASURED_EXHAUSTIVE_SEALED" as const
  });
}

export async function runCaliforniaVisualizationAcceptance(
  cli: CaliforniaAcceptanceCliOptions,
  operations: CaliforniaAcceptanceOperations = defaultOperations()
) {
  assert.equal(path.resolve(process.cwd()), CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    `acceptance must be invoked from ${CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT}`);
  if (cli.mode === "prepare-measured-authorization-request") {
    return await runCaliforniaMeasuredAuthorizationRequestPreparation(
      cli,
      operations
    );
  }
  if (cli.mode === "execute-measured-authorization") {
    return await runCaliforniaMeasuredAuthorizationExecution(cli, operations);
  }
  if (cli.mode === "formal") assertFormalReviewedSnapshot();
  else assertDiscoverySnapshotUnreviewed();
  const runRoot = await assertFreshStarshipRunRoot(cli.runRoot);
  const layout = buildRunLayout(runRoot);
  await createRunDirectories(layout);
  const entrypoints = resolveCaliforniaLocalEntrypoints();
  const plans = buildCaliforniaCommandPlans({ entrypoints, layout });
  assertLocalOnlyCommandPlans(plans, entrypoints);
  const identityEnv = {
    ...process.env,
    NODE_ENV: "production" as const,
    CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID: cli.runtimeRunId,
    CA_SIGNATURE_EXHAUSTIVE_RUN_ID: cli.exhaustiveRunId
  };
  const preflightEnv = buildCaliforniaAcceptanceEnvironment({
    baseEnv: identityEnv,
    runRoot,
    writableRoot: path.join(runRoot, "preflight", "writable")
  });
  await ensureWritableEnvironmentDirectories(preflightEnv);
  await operations.runCommand({
    ...plans.catalogCheck,
    env: preflightEnv,
    expectedExitCodes: [0],
    stderrPath: path.join(runRoot, "preflight", "logs", "catalog-check.stderr.log"),
    stdoutPath: path.join(runRoot, "preflight", "logs", "catalog-check.stdout.log"),
    timeoutMs: 120_000
  });

  const sourceManifestDraft = await buildSourceManifest({
    env: preflightEnv,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  const sourceManifestWrite = await writeExclusiveJson(layout.sourceManifestPath, sourceManifestDraft);
  await chmod(layout.sourceManifestPath, 0o400);
  await fsyncDirectory(path.dirname(layout.sourceManifestPath));
  const sourceManifestPublication = await verifyFrozenSourceManifest({
    expectedWorktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT,
    manifestPath: layout.sourceManifestPath
  });
  assert.equal(sourceManifestPublication.sha256, sourceManifestWrite.sha256,
    "California frozen source manifest changed after durable publication");
  const sourceManifest = sourceManifestPublication.manifest;
  await createIndependentSourceCopies({
    frozenRoot: layout.frozenSourceRoot,
    layerARoot: layout.layerASourceRoot,
    layerBRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    sourceRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  await verifyManifestTree({ entries: sourceManifest.entries, root: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT });
  await assertSourcePathInventoryUnchanged({
    env: preflightEnv,
    expectedEntries: sourceManifest.entries,
    worktreeRoot: CALIFORNIA_ACCEPTANCE_WORKTREE_ROOT
  });
  assertProductSourcesUninstrumented(layout.layerASourceRoot);
  const composed = operations.instrument({
    productProjectRoot: layout.frozenSourceRoot,
    stagingProjectRoot: layout.layerBSourceRoot
  });
  assert.equal(composed.productBytesUnchanged, true, "composed instrumentation changed frozen product bytes");
  const markerManifest = buildCaliforniaSignatureSourceManifest(layout.frozenSourceRoot);
  assertCaliforniaSignatureSourceManifestFrozen(markerManifest);
  const markerContract = buildCaliforniaCanvasGraphicsSourceContract(layout.frozenSourceRoot);
  const markers = readAndAssertCaliforniaSignatureComposedMarkers({
    contract: markerContract,
    manifest: markerManifest,
    productProjectRoot: layout.frozenSourceRoot,
    stagingRoot: layout.layerBSourceRoot
  });
  assert.equal(markers.control.productSourceSha256, composed.control.productSourceSha256,
    "composed control marker product source identity drifted");
  assert.equal(markers.canvas.productSourceSha256, composed.canvas.productSourceSha256,
    "composed Canvas marker product source identity drifted");
  const signatureSourcePaths = new Set(markerManifest.benches.map((bench) => bench.sourcePath));
  await verifyComposedLayerSource({
    layerRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    signatureSourcePaths
  });
  await verifyManifestTree({ entries: sourceManifest.entries, root: layout.layerASourceRoot });
  const executionGroupOwnershipPublication =
    await publishCaliforniaSignatureExecutionGroupOwnership({
      capacityPlanPath: cli.capacityPlanPath,
      capacityPlanSha256: cli.capacityPlanSha256,
      canvasContract: markerContract,
      manifest: markerManifest,
      projectRoot: layout.frozenSourceRoot,
      runRoot: layout.runRoot,
      sourceSnapshotSha256: sourceManifest.aggregateSha256,
      targetPath: layout.executionGroupOwnershipPath
    });

  const originA = `http://127.0.0.1:${cli.layerAPort}`;
  const originB = `http://127.0.0.1:${cli.layerBPort}`;
  const envA = layerEnvironment({
    acceptanceRunId: cli.acceptanceRunId,
    baseEnv: identityEnv,
    buildId: cli.buildId,
    layer: "a",
    layout,
    matrixRunId: cli.matrixRunId,
    origin: originA,
    sourceManifest
  });
  const envB = layerEnvironment({
    acceptanceRunId: cli.acceptanceRunId,
    baseEnv: identityEnv,
    buildId: cli.buildId,
    executionGroupOwnershipReceipt: {
      path: executionGroupOwnershipPublication.path,
      sha256: executionGroupOwnershipPublication.sha256
    },
    layer: "b",
    layout,
    matrixRunId: cli.matrixRunId,
    origin: originB,
    sourceManifest
  });

  const actualBuildIdA = await runBuild({
    env: envA,
    layout,
    operations,
    plan: plans.buildA,
    sourceRoot: layout.layerASourceRoot,
    writableRoot: layout.layerAWritableRoot
  });
  const envAProductSmoke = {
    ...envA,
    CA_VIZ_PRODUCT_SMOKE_BUILD_ID: actualBuildIdA
  } satisfies NodeJS.ProcessEnv;
  await verifyManifestTree({ entries: sourceManifest.entries, root: layout.layerASourceRoot });
  await runServerBoundCommand({
    command: plans.productSmoke,
    commandLogs: {
      stderrPath: logPaths(layout, "a", "product-smoke").stderrPath,
      stdoutPath: layout.productSmokeReportPath
    },
    commandTimeoutMs: 30 * 60_000,
    env: envAProductSmoke,
    layout,
    operations,
    port: cli.layerAPort,
    server: plans.startA,
    serverLogs: logPaths(layout, "a", "server")
  });
  const productReport = await verifyPlaywrightJsonReport({
    expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
    expectedTestCount: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.length,
    reportPath: layout.productSmokeReportPath
  });
  exactStrings(
    CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS.map((projectName) =>
      `${projectName}\0${CALIFORNIA_PRODUCT_SMOKE_TEST_TITLE}`
    ),
    productReport.identities,
    "California product smoke exact two-project report identities"
  );
  const productManifest = await publishCaliforniaProductSmokeManifest({
    acceptanceRunId: cli.acceptanceRunId,
    actualNextBuildId: actualBuildIdA,
    buildId: cli.buildId,
    manifestPath: layout.productSmokeManifestPath,
    receiptDir: layout.productSmokeReceiptRoot,
    sourceSnapshotSha256: sourceManifest.aggregateSha256
  });
  const layerAReceipt = buildLayerAReceipt({
    acceptanceRunId: cli.acceptanceRunId,
    actualNextBuildId: actualBuildIdA,
    buildId: cli.buildId,
    playwrightReportSha256: productReport.sha256,
    productSmokeManifestSha256: productManifest.sha256,
    sourceSnapshotSha256: sourceManifest.aggregateSha256
  });
  const layerASeal = await sealLayerA(layout.layerAReceiptPath, layout.layerASealPath, layerAReceipt);

  await runBuild({
    env: envB,
    layout,
    operations,
    plan: plans.buildB,
    sourceRoot: layout.layerBSourceRoot,
    writableRoot: layout.layerBWritableRoot
  });
  readAndAssertCaliforniaSignatureComposedMarkers({
    contract: markerContract,
    manifest: markerManifest,
    productProjectRoot: layout.frozenSourceRoot,
    stagingRoot: layout.layerBSourceRoot
  });
  await verifyComposedLayerSource({
    layerRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    signatureSourcePaths
  });
  await operations.assertPortFree(cli.layerBPort);
  const serverB = await operations.startServer({
    ...plans.startB,
    env: buildCaliforniaNextProcessEnvironment({
      env: withPlaywrightPort(envB, cli.layerBPort),
      sourceRoot: layout.layerBSourceRoot
    }),
    port: cli.layerBPort,
    ...logPaths(layout, "b", "server"),
    timeoutMs: 120_000
  });
  let broadReceipt: CaliforniaTerminalReceipt | null = null;
  let exhaustiveReceipt: CaliforniaTerminalReceipt | null = null;
  let broadReportSha256: string | null = null;
  let exhaustiveReportSha256: string | null = null;
  try {
    await operations.runCommand({
      ...plans.broad,
      env: withPlaywrightPort(envB, cli.layerBPort),
      stderrPath: logPaths(layout, "b", "broad-playwright").stderrPath,
      stdoutPath: layout.broadReportPath,
      timeoutMs: 48 * 60 * 60_000
    });
    const broadOpenRun = await verifyBroadOpenRunAndReportBeforeFinalizer({
      buildId: cli.buildId,
      ledgerRoot: layout.broadLedgerRoot,
      matrixRunId: cli.matrixRunId,
      reportPath: layout.broadReportPath,
      sourceSnapshotSha256: sourceManifest.aggregateSha256
    });
    broadReportSha256 = broadOpenRun.reportSha256;
    const broadProducerContract = buildBroadProducerLifecycleContract({
      env: envB,
      sourceRoot: layout.layerBSourceRoot
    });
    exactStrings(broadOpenRun.packages, broadProducerContract.packages,
      "California broad producer source-derived package contract");
    const broadProducerSuccessReceipt =
      await publishCaliforniaVisualizationCoverageProducerSuccess({
        expectedMatrix: broadProducerContract.expectedMatrix,
        ledgerRoot: layout.broadLedgerRoot,
        producerReportSha256: broadReportSha256,
        provenance: broadProducerContract.provenance,
        validatePayload() {
          // The lifecycle helper has already enforced the full v5 payload,
          // provenance, exact-matrix, retry=0 and artifact byte bindings.
        }
      });
    assert.equal(
      broadProducerSuccessReceipt.fileName,
      CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
      "California broad producer-success helper returned the wrong receipt file"
    );
    assertSha256(broadProducerSuccessReceipt.sha256,
      "California broad in-memory producer-success receipt");
    const broadLedgerLogs = logPaths(layout, "b", "broad-ledger");
    await operations.runCommand({
      ...plans.broadLedger,
      env: {
        ...withPlaywrightPort(envB, cli.layerBPort),
        CA_VIZ_COVERAGE_PRODUCER_SUCCESS_SHA256: broadProducerSuccessReceipt.sha256
      },
      ...broadLedgerLogs,
      timeoutMs: 6 * 60 * 60_000
    });
    const broadExternalReceipt = parseUniqueTerminalSealReceipt({
      expectedFileName: CALIFORNIA_BROAD_RUN_SEAL_FILENAME,
      label: CALIFORNIA_BROAD_SEAL_RECEIPT_LABEL,
      output: await readFile(broadLedgerLogs.stdoutPath, "utf8")
    });
    assert.equal(broadExternalReceipt.artifactCount, broadOpenRun.artifactCount,
      "broad finalizer external receipt count differs from the pre-finalizer source matrix");
    broadReceipt = await verifyBroadTerminalSeal({
      buildId: cli.buildId,
      expectedArtifactCount: broadOpenRun.artifactCount,
      expectedPlaywrightReportSha256: broadReportSha256,
      expectedProducerSuccessSha256: broadProducerSuccessReceipt.sha256,
      expectedSealSha256: broadExternalReceipt.sha256,
      frozenSourceSnapshotSha256: sourceManifest.aggregateSha256,
      ledgerRoot: layout.broadLedgerRoot,
      matrixRunId: cli.matrixRunId
    });

    await runCaliforniaSignatureExhaustiveProducerUnderCapacityHold({
      ownershipManifest: executionGroupOwnershipPublication.manifest,
      launch: () => operations.runCommand({
        ...plans.exhaustive,
        env: withPlaywrightPort(envB, cli.layerBPort),
        stderrPath: logPaths(layout, "b", "exhaustive-playwright").stderrPath,
        stdoutPath: layout.exhaustiveReportPath,
        timeoutMs: 72 * 60 * 60_000
      })
    });
    const exhaustiveProducerContract = await buildExhaustiveProducerLifecycleContract({
      buildId: cli.buildId,
      canvasContract: markerContract,
      executionGroupOwnershipManifest: executionGroupOwnershipPublication.manifest,
      manifest: markerManifest,
      markers,
      origin: originB,
      runId: cli.exhaustiveRunId,
      runtimeRunId: cli.runtimeRunId,
      sourceSnapshotSha256: sourceManifest.aggregateSha256
    });
    const exhaustiveReport = await verifyPlaywrightJsonReport({
      expectedProjects: CALIFORNIA_ACCEPTANCE_REQUIRED_PROJECTS,
      expectedTestCount: exhaustiveProducerContract.expectedMatrix.size,
      reportPath: layout.exhaustiveReportPath
    });
    exactStrings(
      buildCaliforniaExhaustiveExpectedReportIdentities(exhaustiveProducerContract.packages),
      exhaustiveReport.identities,
      "California exhaustive exact source-derived 51x2 Playwright report identities"
    );
    exhaustiveReportSha256 = exhaustiveReport.sha256;
    const exhaustiveProducerSuccessReceipt =
      await publishCaliforniaSignatureExhaustiveProducerSuccess({
        expectedIdentity: exhaustiveProducerContract.expectedIdentity,
        expectedMatrix: exhaustiveProducerContract.expectedMatrix,
        ledgerRoot: layout.exhaustiveLedgerRoot,
        producerReportSha256: exhaustiveReportSha256,
        validationContexts: exhaustiveProducerContract.validationContexts
      });
    assert.equal(
      exhaustiveProducerSuccessReceipt.fileName,
      CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
      "California exhaustive producer-success helper returned the wrong receipt file"
    );
    assertSha256(exhaustiveProducerSuccessReceipt.sha256,
      "California exhaustive in-memory producer-success receipt");
    const exhaustiveLedgerLogs = logPaths(layout, "b", "exhaustive-ledger");
    const ledgerResult = await operations.runCommand({
      ...plans.exhaustiveLedger,
      env: {
        ...withPlaywrightPort(envB, cli.layerBPort),
        CA_SIGNATURE_EXHAUSTIVE_PRODUCER_SUCCESS_SHA256:
          exhaustiveProducerSuccessReceipt.sha256
      },
      expectedExitCodes: cli.mode === "discovery" ? Array.from({ length: 255 }, (_, index) => index + 1) : [0],
      ...exhaustiveLedgerLogs,
      timeoutMs: 12 * 60 * 60_000
    });
    if (cli.mode === "discovery") {
      assert.notEqual(ledgerResult.code, 0, "discovery ledger unexpectedly passed and could be mistaken for formal");
      await assertNoExhaustiveSeal(layout, cli.exhaustiveRunId);
      const output = `${await readFile(exhaustiveLedgerLogs.stdoutPath, "utf8")}\n` +
        `${await readFile(exhaustiveLedgerLogs.stderrPath, "utf8")}`;
      const candidate = parseDiscoveryCandidate(output);
      await writeExclusiveJson(layout.discoveryPath, {
        acceptanceRunId: cli.acceptanceRunId,
        candidate,
        mode: "discovery",
        schemaVersion: CALIFORNIA_ACCEPTANCE_SCHEMA_VERSION,
        sourceSnapshotSha256: sourceManifest.aggregateSha256,
        status: "UNREVIEWED"
      });
      throw new CaliforniaDiscoveryRedError(candidate);
    }
    const exhaustiveExternalReceipt = parseUniqueTerminalSealReceipt({
      expectedFileName: CALIFORNIA_EXHAUSTIVE_RUN_SEAL_FILENAME,
      label: CALIFORNIA_EXHAUSTIVE_SEAL_RECEIPT_LABEL,
      output: await readFile(exhaustiveLedgerLogs.stdoutPath, "utf8")
    });
    assert.equal(exhaustiveExternalReceipt.artifactCount, 102,
      "exhaustive finalizer external receipt must bind 51 packages by two projects");
    exhaustiveReceipt = await verifyExhaustiveTerminalSeal({
      buildId: cli.buildId,
      executionGroupOwnershipManifest: executionGroupOwnershipPublication.manifest,
      expectedArtifactsSha256: exhaustiveProducerContract.expectedArtifactsSha256,
      expectedPlaywrightReportSha256: exhaustiveReportSha256,
      expectedProducerSuccessSha256: exhaustiveProducerSuccessReceipt.sha256,
      expectedSealSha256: exhaustiveExternalReceipt.sha256,
      exhaustiveRunId: cli.exhaustiveRunId,
      frozenSourceSnapshotSha256: sourceManifest.aggregateSha256,
      ledgerRoot: layout.exhaustiveLedgerRoot,
      origin: originB,
      runtimeRunId: cli.runtimeRunId
    });
  } finally {
    await serverB.stop();
  }

  assert.ok(broadReceipt && exhaustiveReceipt && broadReportSha256 && exhaustiveReportSha256,
    "formal acceptance cannot seal before broad and exhaustive terminal receipts exist");
  assert.equal((await readJsonObject(layout.broadReportPath,
    "California broad report pre-seal reread")).sha256, broadReportSha256,
  "California broad report changed after semantic verification");
  assert.equal((await readJsonObject(layout.exhaustiveReportPath,
    "California exhaustive report pre-seal reread")).sha256, exhaustiveReportSha256,
  "California exhaustive report changed after semantic verification");
  assert.equal(await lstatOrNull(layout.discoveryPath), null,
    "formal acceptance refuses a discovery artifact in its terminal run root");
  assertProductSourcesUninstrumented(layout.layerASourceRoot);
  readAndAssertCaliforniaSignatureComposedMarkers({
    contract: markerContract,
    manifest: markerManifest,
    productProjectRoot: layout.frozenSourceRoot,
    stagingRoot: layout.layerBSourceRoot
  });
  await verifyComposedLayerSource({
    layerRoot: layout.layerBSourceRoot,
    manifest: sourceManifest,
    signatureSourcePaths
  });
  const inventory = await finalInventory(layout, sourceManifest);
  const terminalFiles = await collectTerminalFileBindings({
    broad: broadReceipt,
    broadReportSha256,
    exhaustive: exhaustiveReceipt,
    executionGroupOwnershipSha256: executionGroupOwnershipPublication.sha256,
    exhaustiveReportSha256,
    exhaustiveRunId: cli.exhaustiveRunId,
    layerASealSha256: layerASeal.sha256,
    layout,
    matrixRunId: cli.matrixRunId,
    productManifestSha256: productManifest.sha256,
    productReceiptFiles: productManifest.manifest.receiptFiles,
    productReportSha256: productReport.sha256,
    sourceManifestSha256: sourceManifestPublication.sha256
  });
  const finalManifest = buildFinalAcceptanceManifest({
    acceptanceRunId: cli.acceptanceRunId,
    broad: broadReceipt,
    broadReportSha256,
    buildId: cli.buildId,
    exhaustive: exhaustiveReceipt,
    exhaustiveReportSha256,
    inventoryRows: inventory.rows,
    layerASealSha256: layerASeal.sha256,
    matrixRunId: cli.matrixRunId,
    sourceManifestSha256: sourceManifestPublication.sha256,
    sourceSnapshotSha256: sourceManifest.aggregateSha256,
    terminalFiles
  });
  const finalSeal = await publishFinalSeal({
    layout,
    manifest: finalManifest
  });
  const finalReread = await verifyPublishedFinalSeal({
    manifestPath: layout.finalManifestPath,
    sealPath: layout.finalSealPath,
    sealReceipt: finalSeal
  });
  assert.equal(finalReread.sealSha256, finalSeal.sha256,
    "final total seal receipt changed on independent reread");
  assert.equal((await readJsonObject(layout.broadReportPath,
    "California broad report post-seal reread")).sha256, broadReportSha256,
  "California broad report changed during terminal publication");
  assert.equal((await readJsonObject(layout.exhaustiveReportPath,
    "California exhaustive report post-seal reread")).sha256, exhaustiveReportSha256,
  "California exhaustive report changed during terminal publication");
  return {
    finalSeal,
    layerASeal,
    runRoot,
    sourceSnapshotSha256: sourceManifest.aggregateSha256
  };
}

function defaultOperations(): CaliforniaAcceptanceOperations {
  return {
    async assertPortFree(port) {
      assert.ok(await isPortFree(port), `port ${port} is not free`);
    },
    instrument: instrumentCaliforniaSignatureComposedQaStaging,
    runCommand: runLoggedCommand,
    startServer: startCaliforniaServer
  };
}

export function generatedHighEntropyId(prefix: string) {
  assert.match(prefix, /^[a-z][a-z0-9-]{1,24}$/i, "ID prefix is unsafe");
  return `${prefix}-${randomBytes(24).toString("hex")}`;
}

async function main() {
  try {
    assertCleanAcceptanceEntrypointEnvironment(process.env);
    const result = await runCaliforniaVisualizationAcceptance(
      parseCaliforniaAcceptanceCli(process.argv.slice(2))
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    if (error instanceof CaliforniaDiscoveryRedError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = error.exitCode;
      return;
    }
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

export function assertCleanAcceptanceEntrypointEnvironment(
  env: CaliforniaAcceptanceEnvironmentInput
) {
  const unsafe = ["NODE_OPTIONS", "NODE_PATH", "TSX_TSCONFIG_PATH"]
    .filter((key) => env[key]?.trim());
  assert.deepEqual(unsafe, [],
    `unsafe acceptance entrypoint environment (${unsafe.join(", ")}); ` +
    "invoke scripts/run-california-visualization-acceptance-bootstrap.cjs for one clean re-exec");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) await main();
