import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  createHash,
  createPublicKey,
  randomUUID,
  verify as verifyBytes
} from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  type BigIntStats
} from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  rmdir,
  statfs,
  unlink
} from "node:fs/promises";
import path from "node:path";
import type { TestInfo } from "@playwright/test";
import type {
  CaliforniaCanvasGraphicsNoDeployMarker,
  CaliforniaSignatureControlQaNoDeployMarker
} from "./california-signature-composed-staging";
import {
  CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
  assertCaliforniaSignatureExactEvidenceRecordSchema,
  assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate,
  buildCaliforniaSignatureSourceExecutionGroups,
  californiaSignatureAxisIdsForProject,
  californiaSignatureExactEvidenceOrderKey,
  californiaSignatureExpandedOracleKeyFromRecord,
  iterateCaliforniaSignatureExpandedSourceEvidenceOracle,
  snapshotCaliforniaSignatureExhaustiveEvidence,
  validateCaliforniaSignatureEvidenceRecords,
  type CaliforniaSignatureExternalEvidenceExpectations,
  type CaliforniaSignatureExactEvidenceRecord
} from "./california-signature-exhaustive-qa";
import { buildCaliforniaCanvasGraphicsSourceContract } from
  "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
  californiaSignatureEvidenceMerkleRootSha256,
  canonicalCaliforniaSignatureEvidenceJson,
  createCaliforniaSignatureEvidenceStreamWriter,
  readCaliforniaSignatureEvidenceStream,
  type CaliforniaSignatureEvidenceStreamManifest,
  type CaliforniaSignaturePartialEvidenceStreamDiagnostic
} from "./california-signature-evidence-stream";
import type { CaliforniaSignatureSourceManifest } from "./california-signature-control-manifest";
import {
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  californiaSignatureFinalCompositorGroupKey,
  summarizeCaliforniaSignatureFinalCompositorCapacityGroups,
  type CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  type CaliforniaSignatureFinalCompositorPartitionPlan
} from "./california-signature-final-compositor-capacity-plan";

export const CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION = 3;
export const CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION = 1;
export const CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX = ".signature-exhaustive.json";
export const CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX = ".signature-exhaustive.partial.json";
export const CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX = ".signature-exhaustive.failure.json";
export const CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME = ".california-signature-exhaustive-run.json";
export const CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME = ".california-signature-exhaustive-seal.json";
export const CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME =
  ".california-signature-exhaustive-producer-success.json";
export const CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX =
  ".signature-evidence-reservation.json";
export const CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS = ["desktop-chrome", "mobile-chrome"] as const;
export const CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE = 4;
const CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_BLOCK_BYTES = 64 * 1024 * 1024;

const ID_PATTERN = /^[a-z0-9:_-]{24,128}$/i;
const LOGICAL_SEGMENT_PATTERN = /^[a-z0-9._-]{1,160}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type CaliforniaSignatureArtifactShard = { index: number; total: number } | null;

export type CaliforniaSignatureArtifactExecution = {
  repeatEachIndex: number;
  retry: 0;
};

export type CaliforniaSignatureRuntimeMarkerIdentities = {
  canvas: CaliforniaCanvasGraphicsNoDeployMarker;
  control: CaliforniaSignatureControlQaNoDeployMarker;
};

export type CaliforniaSignatureArtifactRunIdentity = {
  buildId: string;
  componentSourceSha256: string;
  controlBlueprintSha256: string;
  markerIdentities: CaliforniaSignatureRuntimeMarkerIdentities;
  markerIdentitiesSha256: string;
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureOfficialArtifact = CaliforniaSignatureArtifactRunIdentity & {
  artifactId: string;
  createdAt: string;
  evidenceSnapshot: CaliforniaSignatureEvidenceSnapshot;
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  evidenceStreamOwnershipSha256: string;
  execution: CaliforniaSignatureArtifactExecution;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  packageId: string;
  projectName: string;
  schemaVersion: number;
  shard: CaliforniaSignatureArtifactShard;
  terminalStatus: "passed";
};

export type CaliforniaSignatureDiagnosticArtifact = CaliforniaSignatureArtifactRunIdentity & {
  createdAt: string;
  diagnosticId: string;
  execution: { repeatEachIndex: number; retry: number; workerIndex: number };
  failure: { message: string; name: string };
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  packageId: string;
  projectName: string;
  schemaVersion: number;
  shard: CaliforniaSignatureArtifactShard;
  streamDiagnostic: CaliforniaSignaturePartialEvidenceStreamDiagnostic | null;
  terminalStatus: "failed" | "partial";
};

export type CaliforniaSignatureEvidenceSnapshot = {
  blueprintSha256: string;
  keyCount: number;
  keysSha256: string;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION;
};

type CaliforniaSignatureRunManifest = CaliforniaSignatureArtifactRunIdentity & {
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  officialArtifactSuffix: typeof CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX;
  requiredProjects: readonly string[];
  status: "open";
};

type CaliforniaSignatureArtifactByteIdentity = {
  artifactId: string;
  evidenceChunkMerkleRootSha256: string;
  evidenceChunks: readonly CaliforniaSignatureEvidenceChunkByteIdentity[];
  evidenceFramedBytes: number;
  evidenceManifestSha256: string;
  evidenceRecordCount: number;
  evidenceStreamOwnershipSha256: string;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  fileName: string;
  sha256: string;
};

type CaliforniaSignatureEvidenceChunkByteIdentity = {
  fileName: string;
  framedBytes: number;
  recordCount: number;
  recordMerkleRootSha256: string;
  sha256: string;
};

type CaliforniaSignatureRunSeal = CaliforniaSignatureArtifactRunIdentity & {
  artifacts: readonly CaliforniaSignatureArtifactByteIdentity[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  manifestSha256: string;
  producerReportSha256: string;
  producerSuccessSha256: string;
  sealedAt: string;
  status: "sealed";
};

type CaliforniaSignatureProducerSuccess = CaliforniaSignatureArtifactRunIdentity & {
  artifacts: readonly CaliforniaSignatureArtifactByteIdentity[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  producerReportSha256: string;
  publishedAt: string;
  status: "producer-succeeded";
};

export type CaliforniaSignatureSealReceipt = {
  fileName: typeof CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME;
  sha256: string;
};

export type CaliforniaSignatureProducerSuccessReceipt = {
  fileName: typeof CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME;
  sha256: string;
};

export type CaliforniaSignatureExpectedArtifact = {
  artifactId: string;
  benchIds: readonly string[];
  execution: CaliforniaSignatureArtifactExecution;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  fileName: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
};

export type CaliforniaSignatureArtifactValidationContext = {
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  expectedBenchIds: readonly string[];
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
};

export type CaliforniaSignatureExecutionGroupOwnership = {
  cropCount: number;
  expectedRecordCount: number;
  groupKeys: readonly string[];
  planSha256: string;
  receiptCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION;
  sourceIdentitySha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureExecutionGroupOwnershipProjectSlice = {
  benchIds: readonly string[];
  cropCount: number;
  expectedRecordCount: number;
  groupKeys: readonly string[];
  projectName: typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
  receiptCount: number;
};

export type CaliforniaSignatureExecutionGroupOwnershipManifest = {
  capacityPlanSha256: string;
  cropCount: number;
  evidenceRecordCount: number;
  formalExecutionAuthorized: false;
  groupCount: number;
  packages: readonly {
    packageId: string;
    projects: readonly CaliforniaSignatureExecutionGroupOwnershipProjectSlice[];
    slotIndex: number;
  }[];
  receiptCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION;
  sourceIdentitySha256: string;
  sourceSnapshotSha256: string;
  status: "diagnostic-capacity-partition";
};

export class CaliforniaSignatureCapacityAuthorizationHoldError extends Error {
  constructor(message =
    "California signature exhaustive execution is on HOLD: the capacity partition is diagnostic-only and no reviewed measured authorization receipt exists") {
    super(message);
    this.name = "CaliforniaSignatureCapacityAuthorizationHoldError";
  }
}

export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT =
  "/Volumes/Starship/.california-signature-measured-authorization-ledger-v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_SIGNING_ROOT =
  "/Volumes/Starship/.california-signature-owner-signing-v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_IDENTITY_PATH =
  `${CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_SIGNING_ROOT}/.owner-delegated-ed25519-identity.json`;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_PATH =
  `${CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_SIGNING_ROOT}/.owner-delegated-ed25519-public-key.spki`;
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID =
  "ca-owner-reviewer-95eb52000940afa9f991dcad27e59cdfb1d9ff53b883611f";
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256 =
  "deb227d57f46f21d92967f529552a67994bbc7fb6def882eec46f5d77c16305a";
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV =
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD";
export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE =
  "owner-approved-runner-verified-and-consumed-v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DISCOVERY_SCHEMA =
  "ca.california-signature.measured-authorization.v3";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_CONSUMPTION_SCHEMA =
  "ca.california-signature.measured-authorization-consumption.v2";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_SCHEMA =
  "ca.california-signature.measured-authorization-ledger-root.v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_FILENAME =
  ".california-signature-measured-authorization-ledger-root.json";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_CONTEXT_SCHEMA =
  "ca.california-signature.measured-authorization-launch-context.v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_SCHEMA =
  "ca.california-signature.measured-authorization-request.v1";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_STATUS =
  "AWAITING_OWNER_REVIEW";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION =
  "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS";
const CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_RECEIPT_BYTES = 64 * 1024;
const CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_PAYLOAD_BYTES = 32 * 1024;
const CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_REQUEST_BYTES = 64 * 1024;
const CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_CONSUMPTION_BYTES = 64 * 1024;
const CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_REVIEWER_KEYS = 32;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_CONSUMPTION_SUFFIX =
  ".measured-authorization-consumed.json";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PYTHON = "/usr/bin/python3";
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_KEYS = [
  "payloadBase64",
  "reviewerKeyId",
  "schema",
  "signatureAlgorithm",
  "signatureBase64"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PAYLOAD_KEYS = [
  "attemptId",
  "attemptLedger",
  "authorizationNonce",
  "authorizationRequestSha256",
  "buildId",
  "decision",
  "executionPlanSha256",
  "expiresAt",
  "issuedAt",
  "launchCommand",
  "maxInvocations",
  "requiredProjects",
  "retryAuthorized",
  "sourceSnapshotSha256"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_ATTEMPT_LEDGER_KEYS = [
  "anchorSha256",
  "ledgerId",
  "rootBirthtimeNs",
  "rootDev",
  "rootIno",
  "rootPathSha256"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_KEYS = [
  "ledgerId",
  "rootPathSha256",
  "schema",
  "status"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_COMMAND_KEYS = [
  "projects",
  "repeatEach",
  "reporter",
  "retries",
  "specPath",
  "workers"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_CONTEXT_KEYS = [
  "attemptId",
  "buildId",
  "executionPlanSha256",
  "launchCommand",
  "requiredProjects",
  "sourceSnapshotSha256"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_INPUT_KEYS = [
  "acceptanceRunId",
  "attemptId",
  "buildId",
  "executionPlanSha256",
  "launchCommand",
  "matrixRunId",
  "origin",
  "runtimeRunId",
  "sourceSnapshotSha256"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TESTING_REQUEST_INPUT_KEYS = [
  ...CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_INPUT_KEYS,
  "testOnlyLedgerAuthority"
] as const;
const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_KEYS = [
  "acceptanceRunId",
  "attemptId",
  "attemptLedger",
  "buildId",
  "executionPlanSha256",
  "launchCommand",
  "matrixRunId",
  "maxInvocations",
  "origin",
  "requestedDecision",
  "requiredProjects",
  "retryAuthorized",
  "runtimeRunId",
  "schema",
  "sourceSnapshotSha256",
  "status"
] as const;

const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DURABLE_WRITER_SOURCE = String.raw`
import hashlib
import json
import os
import re
import stat
import sys

MAX_BYTES = 64 * 1024
MAX_ANCHOR_BYTES = 64 * 1024
LEAF_PATTERN = re.compile(r"^[a-f0-9]{64}\.measured-authorization-consumed\.json$")
ANCHOR_LEAF = ".california-signature-measured-authorization-ledger-root.json"
ANCHOR_SCHEMA = "ca.california-signature.measured-authorization-ledger-root.v1"

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def publish(message):
    sys.stdout.write(message + "\n")
    sys.stdout.flush()

def opaque_fd_identity(kind, identity):
    payload = (
        "ca.california-signature.measured-authorization.fd-identity.v1\x00" +
        kind + "\x00" + str(identity.st_dev) + "\x00" + str(identity.st_ino)
    ).encode("ascii")
    return hashlib.sha256(payload).hexdigest()

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

def same_file(left, right):
    for field in (
        "st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns",
        "st_nlink", "st_uid", "st_mode"
    ):
        require(getattr(left, field) == getattr(right, field),
                "held file and descriptor-relative name differ at " + field)

def main():
    require(len(sys.argv) == 12, "exact durable-writer argv required")
    leaf = sys.argv[1]
    expected_sha256 = sys.argv[2]
    expected_size = int(sys.argv[3], 10)
    expected_root_dev = int(sys.argv[4], 10)
    expected_root_ino = int(sys.argv[5], 10)
    expected_uid = int(sys.argv[6], 10)
    expected_root_mode = int(sys.argv[7], 10)
    anchor_leaf = sys.argv[8]
    expected_anchor_sha256 = sys.argv[9]
    expected_ledger_id = sys.argv[10]
    expected_root_path_sha256 = sys.argv[11]
    require(LEAF_PATTERN.fullmatch(leaf) is not None, "unsafe consumption leaf")
    require(re.fullmatch(r"[a-f0-9]{64}", expected_sha256) is not None,
            "invalid expected consumption SHA-256")
    require(0 < expected_size <= MAX_BYTES, "invalid expected consumption size")
    require(anchor_leaf == ANCHOR_LEAF, "unexpected attempt-ledger anchor leaf")
    require(re.fullmatch(r"[a-f0-9]{64}", expected_anchor_sha256) is not None,
            "invalid expected anchor SHA-256")
    require(re.fullmatch(r"[A-Za-z0-9:_-]{24,128}", expected_ledger_id) is not None,
            "invalid expected ledgerId")
    require(re.fullmatch(r"[a-f0-9]{64}", expected_root_path_sha256) is not None,
            "invalid expected root-path SHA-256")

    root = os.fstat(3)
    require(stat.S_ISDIR(root.st_mode), "FD3 is not a directory")
    require(root.st_dev == expected_root_dev and root.st_ino == expected_root_ino,
            "FD3 root identity differs from the parent plan")
    require(root.st_uid == expected_uid, "FD3 root owner differs from the parent plan")
    require(stat.S_IMODE(root.st_mode) == expected_root_mode == 0o700,
            "FD3 root mode is not exact 0700")
    root_fd_identity = opaque_fd_identity("root", root)
    publish("ROOT_FD_BOUND " + root_fd_identity)

    data = sys.stdin.buffer.read(MAX_BYTES + 1)
    require(len(data) == expected_size, "consumption stdin length differs from the parent plan")
    require(hashlib.sha256(data).hexdigest() == expected_sha256,
            "consumption stdin SHA-256 differs from the parent plan")
    require(hasattr(os, "O_NOFOLLOW") and hasattr(os, "O_CLOEXEC"),
            "descriptor-relative writer requires O_NOFOLLOW and O_CLOEXEC")
    anchor_fd = os.open(
        anchor_leaf,
        os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC,
        dir_fd=3
    )
    try:
        anchor_before = os.fstat(anchor_fd)
        require(stat.S_ISREG(anchor_before.st_mode),
                "attempt-ledger anchor is not a regular file")
        require(anchor_before.st_nlink == 1,
                "attempt-ledger anchor is not singleton")
        require(anchor_before.st_uid == expected_uid,
                "attempt-ledger anchor owner drifted")
        require(stat.S_IMODE(anchor_before.st_mode) == 0o600,
                "attempt-ledger anchor mode is not exact 0600")
        require(0 < anchor_before.st_size <= MAX_ANCHOR_BYTES,
                "attempt-ledger anchor is empty or exceeds its bound")
        anchor_named = os.stat(anchor_leaf, dir_fd=3, follow_symlinks=False)
        same_file(anchor_before, anchor_named)
        anchor_data = read_exact(anchor_fd, anchor_before.st_size)
        require(hashlib.sha256(anchor_data).hexdigest() == expected_anchor_sha256,
                "attempt-ledger anchor SHA-256 differs from the signed identity")
        anchor = json.loads(anchor_data.decode("utf-8"))
        require(type(anchor) is dict,
                "attempt-ledger anchor must be one JSON object")
        require(list(anchor.keys()) == ["ledgerId", "rootPathSha256", "schema", "status"],
                "attempt-ledger anchor exact schema/order drifted")
        require(anchor["ledgerId"] == expected_ledger_id,
                "attempt-ledger anchor ledgerId drifted")
        require(anchor["rootPathSha256"] == expected_root_path_sha256,
                "attempt-ledger anchor root-path SHA drifted")
        require(anchor["schema"] == ANCHOR_SCHEMA and anchor["status"] == "ACTIVE",
                "attempt-ledger anchor authority state drifted")
        canonical_anchor = (
            json.dumps(anchor, separators=(",", ":"), ensure_ascii=True) + "\n"
        ).encode("utf-8")
        require(anchor_data == canonical_anchor,
                "attempt-ledger anchor is not canonical LF-terminated JSON")

        flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC
        fd = os.open(leaf, flags, 0o600, dir_fd=3)
        try:
            os.fchmod(fd, 0o600)
            created = os.fstat(fd)
            require(stat.S_ISREG(created.st_mode), "new consumption node is not a regular file")
            require(created.st_nlink == 1, "new consumption node is not singleton")
            require(created.st_uid == expected_uid, "new consumption node owner drifted")
            require(stat.S_IMODE(created.st_mode) == 0o600,
                    "new consumption node mode is not exact 0600")
            require(created.st_size == 0, "new O_EXCL consumption node was not empty")
            file_fd_identity = opaque_fd_identity("file", created)
            require(file_fd_identity != root_fd_identity,
                    "root and file descriptor identities must be distinct")
            publish(
                "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD " + root_fd_identity + " " +
                file_fd_identity + " " + str(stat.S_IMODE(created.st_mode)) + " " + leaf
            )

            written = 0
            while written < len(data):
                count = os.write(fd, data[written:])
                require(count > 0, "durable consumption write made no progress")
                written += count
            require(written == len(data), "durable consumption write length drifted")
            written_identity = os.fstat(fd)
            require(written_identity.st_size == expected_size,
                    "durable consumption size differs after full write")
            require(opaque_fd_identity("file", written_identity) == file_fd_identity,
                    "file descriptor identity changed during full write")
            publish("MARKER_WRITTEN " + file_fd_identity + " " + expected_sha256)
            os.fsync(fd)

            after_write = os.fstat(fd)
            require(after_write.st_size == expected_size,
                    "durable consumption size differs after file fsync")
            require(opaque_fd_identity("file", after_write) == file_fd_identity,
                    "file descriptor identity changed during file fsync")
            publish("MARKER_FILE_FSYNCED " + file_fd_identity)
            first_readback = read_exact(fd, expected_size)
            require(first_readback == data, "durable consumption same-FD bytes drifted")
            require(hashlib.sha256(first_readback).hexdigest() == expected_sha256,
                    "durable consumption same-FD SHA-256 drifted")
            named = os.stat(leaf, dir_fd=3, follow_symlinks=False)
            same_file(after_write, named)
            publish(
                "MARKER_SAME_FD_READBACK_VERIFIED " + file_fd_identity + " " +
                expected_sha256
            )

            os.fsync(3)
            final_fd = os.fstat(fd)
            final_named = os.stat(leaf, dir_fd=3, follow_symlinks=False)
            same_file(final_fd, final_named)
            final_readback = read_exact(fd, expected_size)
            require(final_readback == data, "post-directory-fsync same-FD bytes drifted")
            require(hashlib.sha256(final_readback).hexdigest() == expected_sha256,
                    "post-directory-fsync same-FD SHA-256 drifted")
            final_root = os.fstat(3)
            require(final_root.st_dev == expected_root_dev and
                    final_root.st_ino == expected_root_ino,
                    "FD3 root identity changed during durable publication")
            require(final_root.st_uid == expected_uid and
                    stat.S_IMODE(final_root.st_mode) == expected_root_mode,
                    "FD3 root ownership or mode changed during durable publication")
            require(opaque_fd_identity("root", final_root) == root_fd_identity,
                    "root descriptor identity changed during root fsync")
            anchor_after = os.fstat(anchor_fd)
            same_file(anchor_before, anchor_after)
            final_anchor_named = os.stat(anchor_leaf, dir_fd=3, follow_symlinks=False)
            same_file(anchor_after, final_anchor_named)
            require(read_exact(anchor_fd, anchor_after.st_size) == anchor_data,
                    "attempt-ledger anchor changed during durable publication")
            publish("MARKER_ROOT_FSYNCED " + root_fd_identity)
            publish(
                "DURABLE " + expected_sha256 + " " + str(expected_size) + " " +
                str(final_fd.st_dev) + " " + str(final_fd.st_ino)
            )
        finally:
            os.close(fd)
    finally:
        os.close(anchor_fd)
    return 0

try:
    exit_code = main()
except FileExistsError:
    sys.stderr.write("ATTEMPT_CONSUMPTION_EEXIST\n")
    sys.stderr.flush()
    exit_code = 73
except BaseException as error:
    sys.stderr.write(
        "ATTEMPT_CONSUMPTION_FAILED:" + type(error).__name__ + ":" + str(error) + "\n"
    )
    sys.stderr.flush()
    exit_code = 74
sys.exit(exit_code)
`;

type CaliforniaSignatureMeasuredAuthorizationReaderOptions = {
  allowedRoot: string;
  authorizationRequest: CaliforniaSignatureMeasuredAuthorizationLoadedRequest;
  expectedSha256: string;
  receiptPath: string;
};

type CaliforniaSignatureMeasuredAuthorizationLaunchCommand = {
  projects: readonly ["desktop-chrome", "mobile-chrome"];
  repeatEach: 1;
  reporter: "json";
  retries: 0;
  specPath: "tests/e2e/california-signature-exhaustive.spec.ts";
  workers: 1;
};

type CaliforniaSignatureMeasuredAuthorizationLaunchContext = {
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: CaliforniaSignatureMeasuredAuthorizationLaunchCommand;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  sourceSnapshotSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity = {
  anchorSha256: string;
  ledgerId: string;
  rootBirthtimeNs: string;
  rootDev: string;
  rootIno: string;
  rootPathSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationRequestInputs = {
  acceptanceRunId: string;
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: CaliforniaSignatureMeasuredAuthorizationLaunchCommand;
  matrixRunId: string;
  origin: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationTestingRequestInputs =
  CaliforniaSignatureMeasuredAuthorizationRequestInputs & {
    testOnlyLedgerAuthority:
      CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity;
  };

type CaliforniaSignatureMeasuredAuthorizationRequest = {
  acceptanceRunId: string;
  attemptId: string;
  attemptLedger: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: CaliforniaSignatureMeasuredAuthorizationLaunchCommand;
  matrixRunId: string;
  maxInvocations: 1;
  origin: string;
  requestedDecision: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  retryAuthorized: false;
  runtimeRunId: string;
  schema: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_SCHEMA;
  sourceSnapshotSha256: string;
  status: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_STATUS;
};

type CaliforniaSignatureMeasuredAuthorizationRequestPublicationPreparation =
  Readonly<{
    authorizationRequestSha256: string;
    canonicalRequest: CaliforniaSignatureMeasuredAuthorizationRequest;
    canonicalRequestUtf8: string;
  }>;

type CaliforniaSignatureMeasuredAuthorizationLoadedRequest = Readonly<{
  fileSha256: string;
  request: CaliforniaSignatureMeasuredAuthorizationRequest;
}>;

type CaliforniaSignatureMeasuredAuthorizationRequestReaderOptions = {
  allowedRoot: string;
  expectedRequest: CaliforniaSignatureMeasuredAuthorizationRequest;
  expectedSha256: string;
  requestPath: string;
};

type CaliforniaSignatureMeasuredAuthorizationRequestPublicationFileIdentity =
  Readonly<{
    dev: string;
    ino: string;
  }>;

type CaliforniaSignatureMeasuredAuthorizationRequestPublicationReaderOptions =
  CaliforniaSignatureMeasuredAuthorizationRequestReaderOptions & {
    expectedFileIdentity:
      CaliforniaSignatureMeasuredAuthorizationRequestPublicationFileIdentity;
  };

type CaliforniaSignatureMeasuredAuthorizationExpectedRequestFileIdentity =
  Readonly<{
    dev: bigint;
    ino: bigint;
  }>;

type CaliforniaSignatureMeasuredAuthorizationTestingRequestReaderOptions =
  CaliforniaSignatureMeasuredAuthorizationRequestReaderOptions & {
    testOnlyBeforeFinalVerification: () => void;
  };

type CaliforniaSignatureMeasuredAuthorizationPayload = {
  attemptId: string;
  attemptLedger: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity;
  authorizationNonce: string;
  authorizationRequestSha256: string;
  buildId: string;
  decision: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION;
  executionPlanSha256: string;
  expiresAt: string;
  issuedAt: string;
  launchCommand: CaliforniaSignatureMeasuredAuthorizationLaunchCommand;
  maxInvocations: 1;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  retryAuthorized: false;
  sourceSnapshotSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationDiscoveryReceipt = {
  payloadBase64: string;
  reviewerKeyId: string;
  schema: typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DISCOVERY_SCHEMA;
  signatureAlgorithm: "Ed25519";
  signatureBase64: string;
};

type CaliforniaSignatureMeasuredAuthorization =
  CaliforniaSignatureMeasuredAuthorizationPayload & {
    payloadSha256: string;
    receiptSha256: string;
    reviewerKeyId: string;
    signatureSha256: string;
  };

type CaliforniaSignatureMeasuredAuthorizationReceiptBinding = {
  allowedRoot: string;
  allowedRootDev: bigint;
  allowedRootIno: bigint;
  allowedRootMode: bigint;
  allowedRootUid: bigint;
  bytes: Buffer;
  identity: CaliforniaSignatureMeasuredAuthorizationFileIdentity;
  receiptPath: string;
  receiptSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationFileIdentity = {
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

type CaliforniaSignatureMeasuredAuthorizationRequestRootIdentity = {
  birthtimeNs: bigint;
  dev: bigint;
  ino: bigint;
  mode: bigint;
  uid: bigint;
};

type CaliforniaSignatureMeasuredAuthorizationRequestBinding = {
  allowedRoot: string;
  allowedRootIdentity:
    CaliforniaSignatureMeasuredAuthorizationRequestRootIdentity;
  bytes: Buffer;
  fileSha256: string;
  identity: CaliforniaSignatureMeasuredAuthorizationFileIdentity;
  request: CaliforniaSignatureMeasuredAuthorizationRequest;
  requestPath: string;
};

type CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding = {
  anchorBytes: Buffer;
  anchorIdentity: CaliforniaSignatureMeasuredAuthorizationFileIdentity;
  anchorPath: string;
  ledgerRoot: string;
  ledgerRootBirthtimeNs: bigint;
  ledgerRootDev: bigint;
  ledgerRootIno: bigint;
  ledgerRootMode: bigint;
  ledgerRootUid: bigint;
  signedIdentity: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity;
};

type CaliforniaSignatureMeasuredAuthorizationBrand = {
  attemptLedgerBinding: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding;
  authorizationFingerprint: string;
  launchContext: CaliforniaSignatureMeasuredAuthorizationLaunchContext;
  launchContextSha256: string;
  payload: CaliforniaSignatureMeasuredAuthorizationPayload;
  receiptBinding: CaliforniaSignatureMeasuredAuthorizationReceiptBinding;
  requestBinding: CaliforniaSignatureMeasuredAuthorizationRequestBinding;
  validatedReceiptPayloadFingerprint: string;
};

type CaliforniaSignatureMeasuredAuthorizationProductionBrand =
  CaliforniaSignatureMeasuredAuthorizationBrand & {
    provenance: "production-fixed-reviewer-registry";
  };

type CaliforniaSignatureMeasuredAuthorizationTestingBrand =
  CaliforniaSignatureMeasuredAuthorizationBrand & {
    provenance: "test-only-injected-reviewer-registry";
  };

type CaliforniaSignatureMeasuredAuthorizationValidatedReceipt = {
  authorization: CaliforniaSignatureMeasuredAuthorization;
  brand: CaliforniaSignatureMeasuredAuthorizationBrand;
  fileSha256: string;
};

type CaliforniaSignatureMeasuredAuthorizationTestOnlyDurabilityEvent =
  | Readonly<{
      kind: "ROOT_FD_BOUND";
      rootFdIdentity: string;
    }>
  | Readonly<{
      fileFdIdentity: string;
      kind: "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD";
      mode: 0o600;
      relativeName: string;
      rootFdIdentity: string;
    }>
  | Readonly<{
      fileFdIdentity: string;
      kind: "MARKER_WRITTEN";
      sha256: string;
    }>
  | Readonly<{
      fileFdIdentity: string;
      kind: "MARKER_FILE_FSYNCED";
    }>
  | Readonly<{
      fileFdIdentity: string;
      kind: "MARKER_SAME_FD_READBACK_VERIFIED";
      sha256: string;
    }>
  | Readonly<{
      kind: "MARKER_ROOT_FSYNCED";
      rootFdIdentity: string;
    }>;

function readOwnerApprovedMeasuredAuthorizationPublicIdentity(): Map<string, string> {
  const signingRoot = CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_SIGNING_ROOT;
  const signingRootIdentity = lstatSync(signingRoot, { bigint: true });
  assert.ok(signingRootIdentity.isDirectory() &&
    !signingRootIdentity.isSymbolicLink(),
  "California signature owner signing root must be one physical directory");
  assert.equal(signingRootIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature owner signing root must be owned by this process UID");
  assert.equal(signingRootIdentity.mode & BigInt(0o777), BigInt(0o700),
    "California signature owner signing root must be exact mode 0700");
  assert.equal(realpathSync(signingRoot), signingRoot,
    "California signature owner signing root traverses a symlink");
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "California signature owner public-identity loader requires O_NOFOLLOW");

  const readExactPublicFile = (
    filePath: string,
    expectedMode: number,
    maximumBytes: number,
    label: string
  ) => {
    assert.equal(path.dirname(filePath), signingRoot,
      `${label}: path must be one direct child of the owner signing root`);
    const pathIdentity = lstatSync(filePath, { bigint: true });
    assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
      pathIdentity.nlink === BigInt(1),
    `${label}: path must be one regular singleton file`);
    assert.equal(pathIdentity.uid, signingRootIdentity.uid,
      `${label}: owner differs from the owner signing root`);
    assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(expectedMode),
      `${label}: mode differs from the immutable public-identity contract`);
    assert.ok(pathIdentity.size > BigInt(0) &&
      pathIdentity.size <= BigInt(maximumBytes),
    `${label}: file is empty or exceeds its byte bound`);
    assert.equal(realpathSync(filePath), filePath,
      `${label}: path traverses a symlink`);
    const fd = openSync(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const before = fstatSync(fd, { bigint: true });
      assertMeasuredAuthorizationFileIdentity(
        before,
        measuredAuthorizationFileIdentity(pathIdentity),
        `${label}: held FD before read`
      );
      const bytes = readFileSync(fd);
      assert.equal(BigInt(bytes.length), before.size,
        `${label}: held-FD byte count drifted`);
      const after = fstatSync(fd, { bigint: true });
      assertMeasuredAuthorizationFileIdentity(
        after,
        measuredAuthorizationFileIdentity(before),
        `${label}: held FD after read`
      );
      const finalPath = lstatSync(filePath, { bigint: true });
      assertMeasuredAuthorizationFileIdentity(
        finalPath,
        measuredAuthorizationFileIdentity(after),
        `${label}: final pathname`
      );
      return bytes;
    } finally {
      closeSync(fd);
    }
  };

  const identityBytes = readExactPublicFile(
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_IDENTITY_PATH,
    0o600,
    4 * 1024,
    "California signature owner reviewer identity metadata"
  );
  let identity: unknown;
  try {
    identity = JSON.parse(identityBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`California signature owner reviewer identity metadata is not JSON: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assertRecord(identity,
    "California signature owner reviewer identity metadata");
  assertExactKeys(identity, [
    "publicKeySha256",
    "reviewerKeyId",
    "schema",
    "status"
  ], "California signature owner reviewer identity metadata");
  assert.equal(identity.publicKeySha256,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256,
  "California signature owner reviewer identity public-key digest drifted");
  assert.equal(identity.reviewerKeyId,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID,
  "California signature owner reviewer identity ID drifted");
  assert.equal(identity.schema,
    "ca.california-signature.owner-delegated-reviewer-identity.v1",
  "California signature owner reviewer identity schema drifted");
  assert.equal(identity.status, "ACTIVE",
    "California signature owner reviewer identity must be ACTIVE");
  assert.deepEqual(identityBytes, Buffer.from(`${JSON.stringify({
    publicKeySha256:
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256,
    reviewerKeyId:
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID,
    schema: "ca.california-signature.owner-delegated-reviewer-identity.v1",
    status: "ACTIVE"
  })}\n`, "utf8"),
  "California signature owner reviewer identity metadata is not canonical JSON plus LF");

  const publicKeyBytes = readExactPublicFile(
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_PATH,
    0o400,
    1024,
    "California signature owner reviewer public SPKI"
  );
  assert.equal(sha256(publicKeyBytes),
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256,
  "California signature owner reviewer public SPKI digest drifted");
  let publicKey;
  try {
    publicKey = createPublicKey({
      format: "der",
      key: publicKeyBytes,
      type: "spki"
    });
  } catch (error) {
    throw new Error(`California signature owner reviewer public SPKI is invalid: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assert.equal(publicKey.asymmetricKeyType, "ed25519",
    "California signature owner reviewer public SPKI must be Ed25519");
  assert.deepEqual(publicKey.export({ format: "der", type: "spki" }),
    publicKeyBytes,
  "California signature owner reviewer public SPKI is not canonical DER");

  const finalSigningRootIdentity = lstatSync(signingRoot, { bigint: true });
  for (const key of ["dev", "ino", "uid", "mode", "nlink"] as const) {
    assert.equal(finalSigningRootIdentity[key], signingRootIdentity[key],
      `California signature owner signing root ${key} changed during public-identity load`);
  }
  assert.equal(realpathSync(signingRoot), signingRoot,
    "California signature owner signing root changed during public-identity load");
  return new Map([[
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID,
    publicKeyBytes.toString("base64")
  ]]);
}

const californiaSignatureMeasuredAuthorizationTrustedReviewerKeys =
  readOwnerApprovedMeasuredAuthorizationPublicIdentity();
const californiaSignatureMeasuredAuthorizationProductionLedgerAuthorities =
  new WeakMap<object, CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding>();
const californiaSignatureMeasuredAuthorizationTestingLedgerAuthorities =
  new WeakMap<object, CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding>();
const californiaSignatureMeasuredAuthorizationRequestBindings =
  new WeakMap<object, CaliforniaSignatureMeasuredAuthorizationRequestBinding>();
const californiaSignatureMeasuredAuthorizationProductionBrands =
  new WeakMap<object, CaliforniaSignatureMeasuredAuthorizationProductionBrand>();
const californiaSignatureMeasuredAuthorizationTestingBrands =
  new WeakMap<object, CaliforniaSignatureMeasuredAuthorizationTestingBrand>();

function readonlyMapView<Key, Value>(source: ReadonlyMap<Key, Value>): ReadonlyMap<Key, Value> {
  let view: ReadonlyMap<Key, Value>;
  view = {
    get size() {
      return source.size;
    },
    entries() {
      return source.entries();
    },
    forEach(callback, thisArg) {
      source.forEach((value, key) => callback.call(thisArg, value, key, view));
    },
    get(key) {
      return source.get(key);
    },
    has(key) {
      return source.has(key);
    },
    keys() {
      return source.keys();
    },
    values() {
      return source.values();
    },
    [Symbol.iterator]() {
      return source[Symbol.iterator]();
    }
  };
  return Object.freeze(view);
}

function deepFreezeMeasuredAuthorization<Value>(value: Value): Value {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreezeMeasuredAuthorization(nested);
    }
    Object.freeze(value);
  }
  return value;
}

export const CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TRUSTED_REVIEWER_KEYS =
  readonlyMapView(californiaSignatureMeasuredAuthorizationTrustedReviewerKeys);

export function assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard(
  value: unknown
): void {
  assert.equal(arguments.length, 1,
    "California signature measured-authorization runner guard requires one value");
  assert.equal(value,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE,
  "California signature measured-authorization runner guard is missing or invalid");
}

function decodeCanonicalBase64(value: unknown, label: string, maximumBytes: number): Buffer {
  assertString(value, `${label}: expected one base64 string`);
  assert.ok(value.length > 0 && value.length % 4 === 0,
    `${label}: base64 length is not canonical`);
  assert.match(value, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    `${label}: base64 alphabet or padding is not canonical`);
  const bytes = Buffer.from(value, "base64");
  assert.ok(bytes.length > 0 && bytes.length <= maximumBytes,
    `${label}: decoded bytes are empty or exceed the bounded limit`);
  assert.equal(bytes.toString("base64"), value,
    `${label}: base64 encoding is not canonical`);
  return bytes;
}

function exactTestingReviewerKeyMap(
  value: ReadonlyMap<string, string>
): ReadonlyMap<string, string> {
  assert.ok(value instanceof Map && Object.getPrototypeOf(value) === Map.prototype,
    "California signature test-only trusted reviewer keys must be one exact Map");
  assert.ok(value.size > 0 &&
    value.size <= CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_REVIEWER_KEYS,
  "California signature test-only trusted reviewer Map is empty or exceeds its bound");
  const validated = new Map<string, string>();
  for (const [reviewerKeyId, publicKeyBase64] of value) {
    assert.equal(typeof reviewerKeyId, "string",
      "California signature test-only reviewer key ID must be one string");
    assertHighEntropyId(reviewerKeyId,
      "California signature test-only reviewer key ID");
    assert.equal(typeof publicKeyBase64, "string",
      `${reviewerKeyId}: test-only reviewer public key must be one string`);
    const publicKeyBytes = decodeCanonicalBase64(
      publicKeyBase64,
      `${reviewerKeyId}: test-only reviewer SPKI DER`,
      1024
    );
    let publicKey;
    try {
      publicKey = createPublicKey({
        format: "der",
        key: publicKeyBytes,
        type: "spki"
      });
    } catch (error) {
      throw new Error(`${reviewerKeyId}: invalid reviewer SPKI DER: ${
        error instanceof Error ? error.message : String(error)}`);
    }
    assert.equal(publicKey.asymmetricKeyType, "ed25519",
      `${reviewerKeyId}: reviewer key must be Ed25519`);
    assert.deepEqual(
      publicKey.export({ format: "der", type: "spki" }),
      publicKeyBytes,
      `${reviewerKeyId}: reviewer SPKI DER is not canonical`
    );
    assert.equal(validated.has(reviewerKeyId), false,
      `${reviewerKeyId}: duplicate test-only reviewer key`);
    validated.set(reviewerKeyId, publicKeyBase64);
  }
  assert.equal(validated.size, value.size,
    "California signature test-only reviewer Map changed during validation");
  return validated;
}

function measuredAuthorizationFileIdentity(
  identity: BigIntStats
): CaliforniaSignatureMeasuredAuthorizationFileIdentity {
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

function assertMeasuredAuthorizationExpectedRequestFileIdentity(
  actual: BigIntStats,
  expected: CaliforniaSignatureMeasuredAuthorizationExpectedRequestFileIdentity,
  label: string
) {
  assert.equal(actual.dev, expected.dev, `${label}: device differs from the helper-created file`);
  assert.equal(actual.ino, expected.ino, `${label}: inode differs from the helper-created file`);
}

function assertMeasuredAuthorizationFileIdentity(
  actual: BigIntStats,
  expected: CaliforniaSignatureMeasuredAuthorizationFileIdentity,
  label: string
) {
  for (const key of [
    "birthtimeNs",
    "dev",
    "ino",
    "size",
    "mtimeNs",
    "ctimeNs",
    "nlink",
    "uid",
    "mode"
  ] as const) {
    assert.equal(actual[key], expected[key], `${label}: ${key} changed`);
  }
}

function exactCanonicalMeasuredAuthorizationIso(value: unknown, label: string): string {
  assertString(value, `${label}: expected one canonical ISO timestamp`);
  const milliseconds = Date.parse(value);
  assert.ok(Number.isFinite(milliseconds), `${label}: invalid timestamp`);
  assert.equal(new Date(milliseconds).toISOString(), value,
    `${label}: timestamp is not canonical ISO`);
  return value;
}

function exactCanonicalMeasuredAuthorizationUnsignedInteger(
  value: unknown,
  label: string
): string {
  assertString(value, `${label}: expected one decimal string`);
  assert.match(value, /^(?:0|[1-9][0-9]*)$/,
    `${label}: expected one canonical unsigned decimal string`);
  assert.equal(String(BigInt(value)), value,
    `${label}: decimal string is not canonical`);
  return value;
}

function exactMeasuredAuthorizationRequestPublicationFileIdentity(
  value: unknown
): CaliforniaSignatureMeasuredAuthorizationExpectedRequestFileIdentity {
  const label =
    "California signature measured-authorization publication request file identity";
  assertRecord(value, label);
  assertExactKeys(value, ["dev", "ino"], label);
  const dev = exactCanonicalMeasuredAuthorizationUnsignedInteger(
    value.dev,
    `${label}: dev`
  );
  const ino = exactCanonicalMeasuredAuthorizationUnsignedInteger(
    value.ino,
    `${label}: ino`
  );
  assert.ok(BigInt(dev) > BigInt(0), `${label}: dev must be positive`);
  assert.ok(BigInt(ino) > BigInt(0), `${label}: ino must be positive`);
  return Object.freeze({ dev: BigInt(dev), ino: BigInt(ino) });
}

function exactMeasuredAuthorizationAttemptLedgerIdentity(
  value: unknown
): CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity {
  assertRecord(value, "California signature measured-authorization attempt ledger");
  assertExactKeys(
    value,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_ATTEMPT_LEDGER_KEYS,
    "California signature measured-authorization attempt ledger"
  );
  assertString(value.anchorSha256,
    "California signature measured-authorization attempt-ledger anchor SHA must be one string");
  assertString(value.ledgerId,
    "California signature measured-authorization ledgerId must be one string");
  assertString(value.rootPathSha256,
    "California signature measured-authorization ledger-root path SHA must be one string");
  assertSha256(value.anchorSha256,
    "California signature measured-authorization attempt-ledger anchor");
  assertHighEntropyId(value.ledgerId,
    "California signature measured-authorization ledgerId");
  assertSha256(value.rootPathSha256,
    "California signature measured-authorization attempt-ledger root path");
  const rootBirthtimeNs = exactCanonicalMeasuredAuthorizationUnsignedInteger(
    value.rootBirthtimeNs,
    "California signature measured-authorization ledger-root birthtimeNs"
  );
  const rootDev = exactCanonicalMeasuredAuthorizationUnsignedInteger(
    value.rootDev,
    "California signature measured-authorization ledger-root device"
  );
  const rootIno = exactCanonicalMeasuredAuthorizationUnsignedInteger(
    value.rootIno,
    "California signature measured-authorization ledger-root inode"
  );
  assert.ok(BigInt(rootBirthtimeNs) > BigInt(0),
    "California signature measured-authorization ledger-root birthtime must be positive");
  assert.ok(BigInt(rootDev) > BigInt(0),
    "California signature measured-authorization ledger-root device must be positive");
  assert.ok(BigInt(rootIno) > BigInt(0),
    "California signature measured-authorization ledger-root inode must be positive");
  return {
    anchorSha256: value.anchorSha256,
    ledgerId: value.ledgerId,
    rootBirthtimeNs,
    rootDev,
    rootIno,
    rootPathSha256: value.rootPathSha256
  };
}

function assertMeasuredAuthorizationPayloadIsLive(
  payload: CaliforniaSignatureMeasuredAuthorizationPayload,
  label: string
) {
  const issuedAt = Date.parse(payload.issuedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  const now = Date.now();
  assert.ok(issuedAt < expiresAt, `${label}: issuedAt must precede expiresAt`);
  assert.ok(issuedAt <= now, `${label}: issuedAt is in the future`);
  assert.ok(now < expiresAt, `${label}: measured authorization is expired`);
}

function exactMeasuredAuthorizationLaunchCommand(
  value: unknown,
  label: string
): CaliforniaSignatureMeasuredAuthorizationLaunchCommand {
  assertRecord(value, label);
  assertExactKeys(value,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_COMMAND_KEYS,
    label);
  assert.deepEqual(value.projects, [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    `${label}: projects must be the exact ordered Chrome pair`);
  assert.equal(value.repeatEach, 1, `${label}: repeatEach must be exactly 1`);
  assert.equal(value.reporter, "json", `${label}: reporter must be exactly json`);
  assert.equal(value.retries, 0, `${label}: retries must be exactly 0`);
  assert.equal(value.specPath, "tests/e2e/california-signature-exhaustive.spec.ts",
    `${label}: spec path drifted`);
  assert.equal(value.workers, 1, `${label}: workers must be exactly 1`);
  return {
    projects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    repeatEach: 1,
    reporter: "json",
    retries: 0,
    specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
    workers: 1
  };
}

function exactMeasuredAuthorizationRequest(
  value: unknown,
  label: string
): CaliforniaSignatureMeasuredAuthorizationRequest {
  assertRecord(value, label);
  assertExactKeys(
    value,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_KEYS,
    label
  );
  assertString(value.acceptanceRunId,
    `${label}: acceptanceRunId must be one string`);
  assertHighEntropyId(value.acceptanceRunId, `${label}: acceptanceRunId`);
  assertString(value.attemptId,
    `${label}: attemptId must be one string`);
  assertHighEntropyId(value.attemptId, `${label}: attemptId`);
  assertString(value.buildId,
    `${label}: buildId must be one string`);
  assertHighEntropyId(value.buildId, `${label}: buildId`);
  assertString(value.matrixRunId,
    `${label}: matrixRunId must be one string`);
  assertHighEntropyId(value.matrixRunId, `${label}: matrixRunId`);
  assertString(value.runtimeRunId,
    `${label}: runtimeRunId must be one string`);
  assertHighEntropyId(value.runtimeRunId, `${label}: runtimeRunId`);
  assertString(value.executionPlanSha256,
    `${label}: executionPlanSha256 must be one string`);
  assertSha256(value.executionPlanSha256, `${label}: executionPlanSha256`);
  assertString(value.sourceSnapshotSha256,
    `${label}: sourceSnapshotSha256 must be one string`);
  assertSha256(value.sourceSnapshotSha256, `${label}: sourceSnapshotSha256`);
  assertString(value.origin,
    `${label}: origin must be one string`);
  assert.equal(value.maxInvocations, 1,
    `${label}: maxInvocations must be exactly 1`);
  assert.equal(value.requestedDecision,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION,
  `${label}: requestedDecision must be the exact measured authorization decision`);
  assert.deepEqual(value.requiredProjects,
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
  `${label}: requiredProjects must be the exact ordered Chrome pair`);
  assert.equal(value.retryAuthorized, false,
    `${label}: retryAuthorized must be false`);
  assert.equal(value.schema,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_SCHEMA,
  `${label}: schema must be the exact v1 authorization-request schema`);
  assert.equal(value.status,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_STATUS,
  `${label}: status must await owner review`);
  return {
    acceptanceRunId: value.acceptanceRunId,
    attemptId: value.attemptId,
    attemptLedger: exactMeasuredAuthorizationAttemptLedgerIdentity(
      value.attemptLedger
    ),
    buildId: value.buildId,
    executionPlanSha256: value.executionPlanSha256,
    launchCommand: exactMeasuredAuthorizationLaunchCommand(
      value.launchCommand,
      `${label}: launchCommand`
    ),
    matrixRunId: value.matrixRunId,
    maxInvocations: 1,
    origin: canonicalOrigin(value.origin),
    requestedDecision: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION,
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    retryAuthorized: false,
    runtimeRunId: value.runtimeRunId,
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_SCHEMA,
    sourceSnapshotSha256: value.sourceSnapshotSha256,
    status: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_STATUS
  };
}

export function prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication(
  options: { request: unknown }
): CaliforniaSignatureMeasuredAuthorizationRequestPublicationPreparation {
  try {
    assert.equal(arguments.length, 1,
      "California measured-authorization request publication preparation expects one options object");
    assertRecord(options,
      "California measured-authorization request publication preparation options");
    assertExactKeys(options, ["request"],
      "California measured-authorization request publication preparation options");
    const requestSnapshot = structuredClone(options.request);
    const canonicalRequest = exactMeasuredAuthorizationRequest(
      requestSnapshot,
      "California measured-authorization request publication preparation"
    );
    const canonicalRequestUtf8 = `${JSON.stringify(canonicalRequest, null, 2)}\n`;
    const canonicalRequestBytes = Buffer.from(canonicalRequestUtf8, "utf8");
    assert.ok(
      canonicalRequestBytes.length > 0 &&
        canonicalRequestBytes.length <=
          CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_REQUEST_BYTES,
      "California measured-authorization request publication bytes exceed the bounded limit"
    );
    return deepFreezeMeasuredAuthorization({
      authorizationRequestSha256: sha256(canonicalRequestBytes),
      canonicalRequest,
      canonicalRequestUtf8
    });
  } catch {
    const fixedErrorName = "Error";
    const fixedErrorMessage =
      "California measured-authorization request is invalid";
    const error = new Error(fixedErrorMessage) as Error & { code: string };
    Object.defineProperty(error, "stack", {
      configurable: true,
      enumerable: false,
      value: `${fixedErrorName}: ${fixedErrorMessage}`,
      writable: true
    });
    error.code = "INVALID_MEASURED_AUTHORIZATION_REQUEST";
    throw error;
  }
}

function measuredAuthorizationLaunchContextFromPayload(
  payload: CaliforniaSignatureMeasuredAuthorizationPayload
): CaliforniaSignatureMeasuredAuthorizationLaunchContext {
  return {
    attemptId: payload.attemptId,
    buildId: payload.buildId,
    executionPlanSha256: payload.executionPlanSha256,
    launchCommand: structuredClone(payload.launchCommand),
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    sourceSnapshotSha256: payload.sourceSnapshotSha256
  };
}

function exactMeasuredAuthorizationLaunchContext(
  value: unknown
): CaliforniaSignatureMeasuredAuthorizationLaunchContext {
  assertRecord(value, "California signature measured-authorization launch context");
  assertExactKeys(value,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_CONTEXT_KEYS,
    "California signature measured-authorization launch context");
  assertString(value.attemptId,
    "California signature measured-authorization launch-context attemptId must be one string");
  assertString(value.buildId,
    "California signature measured-authorization launch-context buildId must be one string");
  assertString(value.executionPlanSha256,
    "California signature measured-authorization launch-context execution-plan SHA must be one string");
  assertString(value.sourceSnapshotSha256,
    "California signature measured-authorization launch-context source SHA must be one string");
  assertHighEntropyId(value.attemptId,
    "California signature measured-authorization launch-context attemptId");
  assertHighEntropyId(value.buildId,
    "California signature measured-authorization launch-context buildId");
  assertSha256(value.executionPlanSha256,
    "California signature measured-authorization launch-context execution plan");
  assert.deepEqual(value.requiredProjects, [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    "California signature measured-authorization launch-context projects must be exact and ordered");
  assertSha256(value.sourceSnapshotSha256,
    "California signature measured-authorization launch-context source snapshot");
  return {
    attemptId: value.attemptId,
    buildId: value.buildId,
    executionPlanSha256: value.executionPlanSha256,
    launchCommand: exactMeasuredAuthorizationLaunchCommand(
      value.launchCommand,
      "California signature measured-authorization launch command"
    ),
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    sourceSnapshotSha256: value.sourceSnapshotSha256
  };
}

function measuredAuthorizationLaunchContextSha256(
  context: CaliforniaSignatureMeasuredAuthorizationLaunchContext
) {
  return sha256(capacityStableJson({
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LAUNCH_CONTEXT_SCHEMA,
    ...context
  }));
}

function assertMeasuredAuthorizationReceiptBinding(
  binding: CaliforniaSignatureMeasuredAuthorizationReceiptBinding,
  label: string
) {
  assert.equal(sha256(binding.bytes), binding.receiptSha256,
    `${label}: receipt private byte SHA changed`);
  const parentIdentity = lstatSync(binding.allowedRoot, { bigint: true });
  assert.ok(parentIdentity.isDirectory() && !parentIdentity.isSymbolicLink(),
    `${label}: allowed root is no longer one physical directory`);
  assert.equal(parentIdentity.dev, binding.allowedRootDev,
    `${label}: allowed-root device changed`);
  assert.equal(parentIdentity.ino, binding.allowedRootIno,
    `${label}: allowed-root inode changed`);
  assert.equal(parentIdentity.uid, binding.allowedRootUid,
    `${label}: allowed-root owner changed`);
  assert.equal(parentIdentity.mode, binding.allowedRootMode,
    `${label}: allowed-root mode changed`);
  assert.equal(realpathSync(binding.allowedRoot), binding.allowedRoot,
    `${label}: allowed root traverses a symlink`);

  const pathIdentity = lstatSync(binding.receiptPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink(),
    `${label}: receipt pathname is no longer one physical file`);
  assertMeasuredAuthorizationFileIdentity(pathIdentity, binding.identity,
    `${label}: receipt pathname`);
  assert.equal(realpathSync(binding.receiptPath), binding.receiptPath,
    `${label}: receipt pathname traverses a symlink`);
  const fd = openSync(binding.receiptPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd, { bigint: true });
    assert.ok(before.isFile() && before.nlink === BigInt(1),
      `${label}: held receipt FD is no longer one regular singleton file`);
    assertMeasuredAuthorizationFileIdentity(before, binding.identity,
      `${label}: held receipt FD before read`);
    const bytes = readFileSync(fd);
    assert.deepEqual(bytes, binding.bytes, `${label}: receipt literal bytes changed`);
    assert.equal(sha256(bytes), binding.receiptSha256,
      `${label}: receipt SHA changed`);
    const after = fstatSync(fd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(after, binding.identity,
      `${label}: held receipt FD after read`);
    const finalPath = lstatSync(binding.receiptPath, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(finalPath, binding.identity,
      `${label}: final receipt pathname`);
  } finally {
    closeSync(fd);
  }
}

function assertMeasuredAuthorizationObjectFingerprint(
  authorization: Record<string, unknown>,
  brand: CaliforniaSignatureMeasuredAuthorizationBrand
) {
  assert.equal(
    sha256(capacityStableJson({
      authorization,
      validatedReceiptPayloadFingerprint: brand.validatedReceiptPayloadFingerprint
    })),
    brand.authorizationFingerprint,
    "California signature measured authorization changed after held-file validation"
  );
}

function assertMeasuredAuthorizationContextMatches(
  context: CaliforniaSignatureMeasuredAuthorizationLaunchContext,
  brand: CaliforniaSignatureMeasuredAuthorizationBrand
) {
  assert.deepEqual(context, brand.launchContext,
    "California signature measured-authorization caller context differs from the exact signed context");
  assert.equal(measuredAuthorizationLaunchContextSha256(context), brand.launchContextSha256,
    "California signature measured-authorization launch-context digest differs from the signed context");
}

function measuredAuthorizationProcessUid(): number {
  const getuid = process.getuid;
  assert.ok(typeof getuid === "function",
    "California signature measured-authorization lifecycle requires process.getuid");
  return getuid();
}

function assertTestOnlyMeasuredAuthorizationRootDisjointFromProductionLedger(
  rootInput: string
) {
  assert.equal(typeof rootInput, "string",
    "California signature test-only measured-authorization ledger root must be one string");
  const normalizedTestRoot = path.resolve(rootInput);
  const normalizedProductionRoot = path.resolve(
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT
  );
  const isSameOrDescendant = (root: string, candidate: string) =>
    candidate === root || candidate.startsWith(`${root}${path.sep}`);
  if (
    isSameOrDescendant(normalizedProductionRoot, normalizedTestRoot) ||
    isSameOrDescendant(normalizedTestRoot, normalizedProductionRoot)
  ) {
    throw new Error(
      "California signature test-only measured-authorization ledger root must be disjoint from the fixed production ledger root"
    );
  }
  return normalizedTestRoot;
}

function readMeasuredAuthorizationAttemptLedgerBinding(
  rootInput: string,
  signedIdentity: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity
): CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding {
  assert.equal(typeof rootInput, "string",
    "California signature measured-authorization attempt-ledger root must be one string");
  const root = path.resolve(rootInput);
  assert.equal(rootInput, root,
    "California signature measured-authorization attempt-ledger root must be absolute and normalized");
  assert.ok(root.startsWith("/Volumes/Starship/"),
    "California signature measured-authorization attempt-ledger root must remain on /Volumes/Starship");
  const identity = lstatSync(root, { bigint: true });
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    "California signature measured-authorization attempt-ledger root must be one physical directory");
  assert.equal(identity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization attempt-ledger root must be owned by this process UID");
  assert.equal(identity.mode & BigInt(0o777), BigInt(0o700),
    "California signature measured-authorization attempt-ledger root must be mode 0700");
  assert.ok(identity.birthtimeNs > BigInt(0),
    "California signature measured-authorization attempt-ledger root must expose a physical birthtime");
  assert.equal(realpathSync(root), root,
    "California signature measured-authorization attempt-ledger root traverses a symlink");
  assert.equal(sha256(root), signedIdentity.rootPathSha256,
    "California signature measured-authorization signed ledger-root path SHA differs from the current root");
  assert.equal(String(identity.dev), signedIdentity.rootDev,
    "California signature measured-authorization signed ledger-root device differs from the current root");
  assert.equal(String(identity.ino), signedIdentity.rootIno,
    "California signature measured-authorization signed ledger-root inode differs from the current root");
  assert.equal(String(identity.birthtimeNs), signedIdentity.rootBirthtimeNs,
    "California signature measured-authorization signed ledger-root birthtime differs from the current root");

  const anchorPath = path.join(
    root,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_FILENAME
  );
  assert.equal(path.dirname(anchorPath), root,
    "California signature measured-authorization ledger anchor escaped its root");
  const anchorPathIdentity = lstatSync(anchorPath, { bigint: true });
  assert.ok(anchorPathIdentity.isFile() && !anchorPathIdentity.isSymbolicLink() &&
    anchorPathIdentity.nlink === BigInt(1),
  "California signature measured-authorization ledger anchor must be one regular singleton file");
  assert.equal(anchorPathIdentity.uid, identity.uid,
    "California signature measured-authorization ledger anchor owner differs from its root");
  assert.equal(anchorPathIdentity.mode & BigInt(0o777), BigInt(0o600),
    "California signature measured-authorization ledger anchor must be exact mode 0600");
  assert.ok(anchorPathIdentity.size > BigInt(0) &&
    anchorPathIdentity.size <= BigInt(CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_RECEIPT_BYTES),
  "California signature measured-authorization ledger anchor is empty or exceeds its byte bound");
  assert.equal(realpathSync(anchorPath), anchorPath,
    "California signature measured-authorization ledger anchor traverses a symlink");
  const anchorFd = openSync(anchorPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let anchorBytes: Buffer;
  try {
    const before = fstatSync(anchorFd, { bigint: true });
    assert.ok(before.isFile() && before.nlink === BigInt(1),
      "California signature measured-authorization held ledger anchor is not one regular singleton file");
    assertMeasuredAuthorizationFileIdentity(
      before,
      measuredAuthorizationFileIdentity(anchorPathIdentity),
      "California signature measured-authorization held ledger anchor before read"
    );
    anchorBytes = readFileSync(anchorFd);
    assert.equal(BigInt(anchorBytes.length), before.size,
      "California signature measured-authorization held ledger-anchor byte count drifted");
    const after = fstatSync(anchorFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      after,
      measuredAuthorizationFileIdentity(before),
      "California signature measured-authorization held ledger anchor after read"
    );
    const finalPath = lstatSync(anchorPath, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      finalPath,
      measuredAuthorizationFileIdentity(after),
      "California signature measured-authorization final ledger-anchor path"
    );
  } finally {
    closeSync(anchorFd);
  }
  const canonicalAnchorBytes = Buffer.from(`${JSON.stringify({
    ledgerId: signedIdentity.ledgerId,
    rootPathSha256: signedIdentity.rootPathSha256,
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_SCHEMA,
    status: "ACTIVE"
  })}\n`, "utf8");
  assert.deepEqual(anchorBytes, canonicalAnchorBytes,
    "California signature measured-authorization ledger anchor is not the exact canonical signed anchor");
  assert.equal(sha256(anchorBytes), signedIdentity.anchorSha256,
    "California signature measured-authorization ledger anchor SHA differs from the signed identity");
  return {
    anchorBytes: Buffer.from(anchorBytes),
    anchorIdentity: measuredAuthorizationFileIdentity(anchorPathIdentity),
    anchorPath,
    ledgerRoot: root,
    ledgerRootBirthtimeNs: identity.birthtimeNs,
    ledgerRootDev: identity.dev,
    ledgerRootIno: identity.ino,
    ledgerRootMode: identity.mode,
    ledgerRootUid: identity.uid,
    signedIdentity: structuredClone(signedIdentity)
  };
}

function assertMeasuredAuthorizationAttemptLedgerBinding(
  binding: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding,
  label: string
) {
  const current = readMeasuredAuthorizationAttemptLedgerBinding(
    binding.ledgerRoot,
    binding.signedIdentity
  );
  for (const key of [
    "ledgerRootBirthtimeNs",
    "ledgerRootDev",
    "ledgerRootIno",
    "ledgerRootMode",
    "ledgerRootUid"
  ] as const) {
    assert.equal(current[key], binding[key], `${label}: ${key} changed`);
  }
  assert.equal(current.anchorPath, binding.anchorPath,
    `${label}: ledger anchor path changed`);
  assert.deepEqual(current.anchorBytes, binding.anchorBytes,
    `${label}: ledger anchor literal bytes changed`);
  for (const key of [
    "birthtimeNs",
    "dev",
    "ino",
    "size",
    "mtimeNs",
    "ctimeNs",
    "nlink",
    "uid",
    "mode"
  ] as const) {
    assert.equal(current.anchorIdentity[key], binding.anchorIdentity[key],
      `${label}: ledger anchor ${key} changed`);
  }
  assert.deepEqual(current.signedIdentity, binding.signedIdentity,
    `${label}: signed attempt-ledger identity changed`);
}

function readMeasuredAuthorizationLedgerAuthorityBinding(
  rootInput: string
): CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding {
  assert.equal(typeof rootInput, "string",
    "California signature measured-authorization ledger-authority root must be one string");
  const root = path.resolve(rootInput);
  assert.equal(rootInput, root,
    "California signature measured-authorization ledger-authority root must be absolute and normalized");
  assert.ok(root.startsWith("/Volumes/Starship/"),
    "California signature measured-authorization ledger-authority root must remain on /Volumes/Starship");
  const rootPathIdentity = lstatSync(root, { bigint: true });
  assert.ok(rootPathIdentity.isDirectory() && !rootPathIdentity.isSymbolicLink(),
    "California signature measured-authorization ledger-authority root must be one physical directory");
  assert.equal(rootPathIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization ledger-authority root must be owned by this process UID");
  assert.equal(rootPathIdentity.mode & BigInt(0o777), BigInt(0o700),
    "California signature measured-authorization ledger-authority root must be mode 0700");
  assert.ok(rootPathIdentity.birthtimeNs > BigInt(0),
    "California signature measured-authorization ledger-authority root must expose a physical birthtime");
  assert.equal(realpathSync(root), root,
    "California signature measured-authorization ledger-authority root traverses a symlink");

  const anchorPath = path.join(
    root,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_FILENAME
  );
  assert.equal(path.dirname(anchorPath), root,
    "California signature measured-authorization ledger-authority anchor escaped its root");
  const anchorPathIdentity = lstatSync(anchorPath, { bigint: true });
  assert.ok(anchorPathIdentity.isFile() &&
    !anchorPathIdentity.isSymbolicLink() &&
    anchorPathIdentity.nlink === BigInt(1),
  "California signature measured-authorization ledger-authority anchor must be one regular singleton physical file");
  assert.equal(anchorPathIdentity.uid, rootPathIdentity.uid,
    "California signature measured-authorization ledger-authority anchor owner differs from its root");
  assert.equal(anchorPathIdentity.mode & BigInt(0o777), BigInt(0o600),
    "California signature measured-authorization ledger-authority anchor must be exact mode 0600");
  assert.ok(anchorPathIdentity.size > BigInt(0) &&
    anchorPathIdentity.size <= BigInt(CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_RECEIPT_BYTES),
  "California signature measured-authorization ledger-authority anchor is empty or exceeds its byte bound");
  assert.equal(realpathSync(anchorPath), anchorPath,
    "California signature measured-authorization ledger-authority anchor traverses a symlink");
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "California signature measured-authorization ledger-authority reader requires O_NOFOLLOW");

  const anchorFd = openSync(anchorPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let anchorBytes: Buffer;
  let heldAnchorIdentity = measuredAuthorizationFileIdentity(anchorPathIdentity);
  try {
    const before = fstatSync(anchorFd, { bigint: true });
    assert.ok(before.isFile() && before.nlink === BigInt(1),
      "California signature measured-authorization held ledger-authority anchor is not one regular singleton file");
    assertMeasuredAuthorizationFileIdentity(
      before,
      measuredAuthorizationFileIdentity(anchorPathIdentity),
      "California signature measured-authorization held ledger-authority anchor before read"
    );
    anchorBytes = readFileSync(anchorFd);
    assert.equal(BigInt(anchorBytes.length), before.size,
      "California signature measured-authorization held ledger-authority anchor byte count drifted");
    const after = fstatSync(anchorFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      after,
      measuredAuthorizationFileIdentity(before),
      "California signature measured-authorization held ledger-authority anchor after read"
    );
    const finalPath = lstatSync(anchorPath, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      finalPath,
      measuredAuthorizationFileIdentity(after),
      "California signature measured-authorization final ledger-authority anchor pathname"
    );
    assert.equal(realpathSync(anchorPath), anchorPath,
      "California signature measured-authorization final ledger-authority anchor traverses a symlink");
    heldAnchorIdentity = measuredAuthorizationFileIdentity(after);
  } finally {
    closeSync(anchorFd);
  }

  let parsedAnchor: unknown;
  try {
    parsedAnchor = JSON.parse(anchorBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`California signature measured-authorization ledger-authority anchor is invalid JSON: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assertRecord(parsedAnchor,
    "California signature measured-authorization ledger-authority anchor");
  assertExactKeys(
    parsedAnchor,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_KEYS,
    "California signature measured-authorization ledger-authority anchor"
  );
  assertString(parsedAnchor.ledgerId,
    "California signature measured-authorization ledger-authority anchor ledgerId must be one string");
  assertString(parsedAnchor.rootPathSha256,
    "California signature measured-authorization ledger-authority anchor root-path SHA must be one string");
  assertHighEntropyId(parsedAnchor.ledgerId,
    "California signature measured-authorization ledger-authority anchor ledgerId");
  assertSha256(parsedAnchor.rootPathSha256,
    "California signature measured-authorization ledger-authority anchor root path");
  assert.equal(parsedAnchor.rootPathSha256, sha256(root),
    "California signature measured-authorization ledger-authority anchor root-path SHA differs from its exact root");
  assert.equal(parsedAnchor.schema,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_SCHEMA,
  "California signature measured-authorization ledger-authority anchor schema drifted");
  assert.equal(parsedAnchor.status, "ACTIVE",
    "California signature measured-authorization ledger-authority anchor status must be ACTIVE");
  const canonicalAnchor = {
    ledgerId: parsedAnchor.ledgerId,
    rootPathSha256: parsedAnchor.rootPathSha256,
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_SCHEMA,
    status: "ACTIVE"
  } as const;
  assert.deepEqual(
    anchorBytes,
    Buffer.from(`${JSON.stringify(canonicalAnchor)}\n`, "utf8"),
    "California signature measured-authorization ledger-authority anchor is not exact canonical JSON plus LF"
  );

  const signedIdentity = exactMeasuredAuthorizationAttemptLedgerIdentity({
    anchorSha256: sha256(anchorBytes),
    ledgerId: canonicalAnchor.ledgerId,
    rootBirthtimeNs: String(rootPathIdentity.birthtimeNs),
    rootDev: String(rootPathIdentity.dev),
    rootIno: String(rootPathIdentity.ino),
    rootPathSha256: canonicalAnchor.rootPathSha256
  });
  const binding = readMeasuredAuthorizationAttemptLedgerBinding(
    root,
    signedIdentity
  );
  for (const [key, expected] of [
    ["ledgerRootBirthtimeNs", rootPathIdentity.birthtimeNs],
    ["ledgerRootDev", rootPathIdentity.dev],
    ["ledgerRootIno", rootPathIdentity.ino],
    ["ledgerRootMode", rootPathIdentity.mode],
    ["ledgerRootUid", rootPathIdentity.uid]
  ] as const) {
    assert.equal(binding[key], expected,
      `California signature measured-authorization ledger-authority ${key} changed during discovery`);
  }
  assert.equal(binding.anchorPath, anchorPath,
    "California signature measured-authorization ledger-authority anchor path changed during discovery");
  assert.deepEqual(binding.anchorBytes, anchorBytes,
    "California signature measured-authorization ledger-authority anchor bytes changed during discovery");
  for (const key of [
    "birthtimeNs",
    "dev",
    "ino",
    "size",
    "mtimeNs",
    "ctimeNs",
    "nlink",
    "uid",
    "mode"
  ] as const) {
    assert.equal(binding.anchorIdentity[key], heldAnchorIdentity[key],
      `California signature measured-authorization ledger-authority anchor ${key} changed during discovery`);
  }
  const finalRootPathIdentity = lstatSync(root, { bigint: true });
  assertMeasuredAuthorizationFileIdentity(
    finalRootPathIdentity,
    measuredAuthorizationFileIdentity(rootPathIdentity),
    "California signature measured-authorization final ledger-authority root pathname"
  );
  assert.equal(realpathSync(root), root,
    "California signature measured-authorization final ledger-authority root traverses a symlink");
  return binding;
}

function mintMeasuredAuthorizationLedgerAuthority(
  binding: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding,
  registry: WeakMap<
    object,
    CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding
  >
) {
  const authority = deepFreezeMeasuredAuthorization(
    structuredClone(binding.signedIdentity)
  );
  registry.set(authority, binding);
  return authority;
}

function readProductionMeasuredAuthorizationLedgerAuthority(rootInput: string) {
  return mintMeasuredAuthorizationLedgerAuthority(
    readMeasuredAuthorizationLedgerAuthorityBinding(rootInput),
    californiaSignatureMeasuredAuthorizationProductionLedgerAuthorities
  );
}

export function readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority() {
  assert.equal(arguments.length, 0,
    "California signature production measured-authorization ledger-authority reader expects no arguments");
  return readProductionMeasuredAuthorizationLedgerAuthority(CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT);
}

export function __testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority(
  options: { testOnlyAttemptLedgerRoot: string }
) {
  assertRecord(options,
    "California signature test-only measured-authorization ledger-authority reader options");
  assertExactKeys(options, ["testOnlyAttemptLedgerRoot"],
    "California signature test-only measured-authorization ledger-authority reader options");
  assert.equal(typeof options.testOnlyAttemptLedgerRoot, "string",
    "California signature test-only measured-authorization ledger-authority root must be one string");
  assertTestOnlyMeasuredAuthorizationRootDisjointFromProductionLedger(
    options.testOnlyAttemptLedgerRoot
  );
  const binding = readMeasuredAuthorizationLedgerAuthorityBinding(
    options.testOnlyAttemptLedgerRoot
  );
  return mintMeasuredAuthorizationLedgerAuthority(
    binding,
    californiaSignatureMeasuredAuthorizationTestingLedgerAuthorities
  );
}

function exactMeasuredAuthorizationRequestInputs(
  options: CaliforniaSignatureMeasuredAuthorizationRequestInputs,
  label: string
): CaliforniaSignatureMeasuredAuthorizationRequestInputs {
  assertRecord(options, label);
  assertExactKeys(options,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_INPUT_KEYS,
    label);
  for (const key of [
    "acceptanceRunId",
    "attemptId",
    "buildId",
    "matrixRunId",
    "runtimeRunId"
  ] as const) {
    assert.equal(typeof options[key], "string",
      `${label}: ${key} must be one string`);
    assertHighEntropyId(options[key], `${label}: ${key}`);
  }
  for (const key of [
    "executionPlanSha256",
    "sourceSnapshotSha256"
  ] as const) {
    assert.equal(typeof options[key], "string",
      `${label}: ${key} must be one string`);
    assertSha256(options[key], `${label}: ${key}`);
  }
  assert.equal(typeof options.origin, "string",
    `${label}: origin must be one string`);
  return {
    acceptanceRunId: options.acceptanceRunId,
    attemptId: options.attemptId,
    buildId: options.buildId,
    executionPlanSha256: options.executionPlanSha256,
    launchCommand: exactMeasuredAuthorizationLaunchCommand(
      options.launchCommand,
      `${label}: launchCommand`
    ),
    matrixRunId: options.matrixRunId,
    origin: canonicalOrigin(options.origin),
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: options.sourceSnapshotSha256
  };
}

function buildMeasuredAuthorizationRequestFromAuthority(
  options: CaliforniaSignatureMeasuredAuthorizationRequestInputs,
  authority: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerIdentity,
  binding: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding,
  label: string
) {
  assert.deepEqual(authority, binding.signedIdentity,
    `${label}: reader-issued ledger authority visible identity changed`);
  assertMeasuredAuthorizationAttemptLedgerBinding(binding,
    `${label}: reader-issued ledger authority`);
  const request = exactMeasuredAuthorizationRequest({
    acceptanceRunId: options.acceptanceRunId,
    attemptId: options.attemptId,
    attemptLedger: exactMeasuredAuthorizationAttemptLedgerIdentity(
      authority
    ),
    buildId: options.buildId,
    executionPlanSha256: options.executionPlanSha256,
    launchCommand: options.launchCommand,
    matrixRunId: options.matrixRunId,
    maxInvocations: 1,
    origin: options.origin,
    requestedDecision: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION,
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    retryAuthorized: false,
    runtimeRunId: options.runtimeRunId,
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_SCHEMA,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_REQUEST_STATUS
  }, "California signature measured-authorization built request");
  return deepFreezeMeasuredAuthorization(request);
}

export function buildCaliforniaSignatureMeasuredAuthorizationRequest(
  options: CaliforniaSignatureMeasuredAuthorizationRequestInputs
): CaliforniaSignatureMeasuredAuthorizationRequest {
  const exactInputs = exactMeasuredAuthorizationRequestInputs(
    options,
    "California signature production measured-authorization request builder inputs"
  );
  const authority = readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority();
  const binding =
    californiaSignatureMeasuredAuthorizationProductionLedgerAuthorities.get(
      authority
    );
  assert.ok(binding,
    "California signature production measured-authorization request builder lost its fixed-root reader-issued ledger authority brand");
  return buildMeasuredAuthorizationRequestFromAuthority(
    exactInputs,
    authority,
    binding,
    "California signature production measured-authorization request builder"
  );
}

export function __testingBuildCaliforniaSignatureMeasuredAuthorizationRequest(
  options: CaliforniaSignatureMeasuredAuthorizationTestingRequestInputs
): CaliforniaSignatureMeasuredAuthorizationRequest {
  assertRecord(options,
    "California signature test-only measured-authorization request builder inputs");
  assertExactKeys(
    options,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TESTING_REQUEST_INPUT_KEYS,
    "California signature test-only measured-authorization request builder inputs"
  );
  assert.ok(options.testOnlyLedgerAuthority &&
    typeof options.testOnlyLedgerAuthority === "object" &&
    !Array.isArray(options.testOnlyLedgerAuthority),
  "California signature test-only request builder requires one opaque reader-issued ledger authority brand");
  const binding =
    californiaSignatureMeasuredAuthorizationTestingLedgerAuthorities.get(
      options.testOnlyLedgerAuthority
    );
  assert.ok(binding,
    "California signature test-only request builder rejected a non-reader-issued ledger authority brand");
  const exactInputs = exactMeasuredAuthorizationRequestInputs({
    acceptanceRunId: options.acceptanceRunId,
    attemptId: options.attemptId,
    buildId: options.buildId,
    executionPlanSha256: options.executionPlanSha256,
    launchCommand: options.launchCommand,
    matrixRunId: options.matrixRunId,
    origin: options.origin,
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: options.sourceSnapshotSha256
  }, "California signature test-only measured-authorization request builder inputs");
  return buildMeasuredAuthorizationRequestFromAuthority(
    exactInputs,
    options.testOnlyLedgerAuthority,
    binding,
    "California signature test-only measured-authorization request builder"
  );
}

function readExactMeasuredAuthorizationFileDescriptor(
  fd: number,
  size: bigint,
  label: string
) {
  assert.ok(size > BigInt(0) && size <= BigInt(Number.MAX_SAFE_INTEGER),
    `${label}: held-FD size is not one bounded positive safe integer`);
  const bytes = Buffer.alloc(Number(size));
  let offset = 0;
  while (offset < bytes.length) {
    const bytesRead = readSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      offset
    );
    assert.ok(bytesRead > 0,
      `${label}: same-FD readback ended early`);
    offset += bytesRead;
  }
  const trailing = Buffer.alloc(1);
  assert.equal(readSync(fd, trailing, 0, 1, bytes.length), 0,
    `${label}: same-FD readback exceeded the exact size`);
  return bytes;
}

function measuredAuthorizationRequestRootIdentity(
  identity: BigIntStats
): CaliforniaSignatureMeasuredAuthorizationRequestRootIdentity {
  return {
    birthtimeNs: identity.birthtimeNs,
    dev: identity.dev,
    ino: identity.ino,
    mode: identity.mode,
    uid: identity.uid
  };
}

function assertMeasuredAuthorizationRequestRootIdentity(
  actual: BigIntStats,
  expected: CaliforniaSignatureMeasuredAuthorizationRequestRootIdentity,
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

function assertMeasuredAuthorizationRequestBinding(
  binding: CaliforniaSignatureMeasuredAuthorizationRequestBinding,
  label: string
) {
  try {
    const rootIdentity = lstatSync(binding.allowedRoot, { bigint: true });
    assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
      `${label}: allowed root is no longer one physical directory`);
    assertMeasuredAuthorizationRequestRootIdentity(
      rootIdentity,
      binding.allowedRootIdentity,
      `${label}: allowed-root identity`
    );
    assert.equal(realpathSync(binding.allowedRoot), binding.allowedRoot,
      `${label}: allowed root traverses a symlink`);

    const pathIdentity = lstatSync(binding.requestPath, { bigint: true });
    assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
      pathIdentity.nlink === BigInt(1),
    `${label}: request pathname is no longer one physical singleton file`);
    assertMeasuredAuthorizationFileIdentity(
      pathIdentity,
      binding.identity,
      `${label}: request pathname identity`
    );
    assert.equal(realpathSync(binding.requestPath), binding.requestPath,
      `${label}: request pathname traverses a symlink`);

    const fd = openSync(
      binding.requestPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
    );
    try {
      const before = fstatSync(fd, { bigint: true });
      assert.ok(before.isFile() && before.nlink === BigInt(1),
        `${label}: held request FD is no longer one regular singleton file`);
      assertMeasuredAuthorizationFileIdentity(
        before,
        binding.identity,
        `${label}: held request FD before read`
      );
      const bytes = readExactMeasuredAuthorizationFileDescriptor(
        fd,
        before.size,
        `${label}: held request FD exact readback`
      );
      assert.deepEqual(bytes, binding.bytes,
        `${label}: authorization request literal bytes changed`);
      assert.equal(sha256(bytes), binding.fileSha256,
        `${label}: authorization request SHA changed`);
      assert.deepEqual(
        bytes,
        Buffer.from(`${JSON.stringify(binding.request, null, 2)}\n`, "utf8"),
        `${label}: authorization request canonical bytes changed`
      );
      const after = fstatSync(fd, { bigint: true });
      assertMeasuredAuthorizationFileIdentity(
        after,
        binding.identity,
        `${label}: held request FD after read`
      );
      const finalRootIdentity = lstatSync(binding.allowedRoot, {
        bigint: true
      });
      assert.ok(finalRootIdentity.isDirectory() &&
        !finalRootIdentity.isSymbolicLink(),
      `${label}: final allowed root is no longer one physical directory`);
      assertMeasuredAuthorizationRequestRootIdentity(
        finalRootIdentity,
        binding.allowedRootIdentity,
        `${label}: final allowed-root identity`
      );
      assert.equal(realpathSync(binding.allowedRoot), binding.allowedRoot,
        `${label}: final allowed root traverses a symlink`);
      const finalPathIdentity = lstatSync(binding.requestPath, {
        bigint: true
      });
      assert.ok(finalPathIdentity.isFile() &&
        !finalPathIdentity.isSymbolicLink(),
      `${label}: final request pathname is no longer one physical file`);
      assertMeasuredAuthorizationFileIdentity(
        finalPathIdentity,
        binding.identity,
        `${label}: final request pathname identity`
      );
      assert.equal(realpathSync(binding.requestPath), binding.requestPath,
        `${label}: final request pathname traverses a symlink`);
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    throw new Error(`${label}: ${
      error instanceof Error ? error.message : String(error)
    }`);
  }
}

function assertMeasuredAuthorizationRequestProjectsToPayload(
  binding: CaliforniaSignatureMeasuredAuthorizationRequestBinding,
  payload: CaliforniaSignatureMeasuredAuthorizationPayload,
  label: string
) {
  assert.equal(
    payload.authorizationRequestSha256,
    binding.fileSha256,
    `${label}: authorization request SHA differs from its exact reader-issued binding`
  );
  assert.deepEqual({
    attemptId: payload.attemptId,
    attemptLedger: payload.attemptLedger,
    buildId: payload.buildId,
    decision: payload.decision,
    executionPlanSha256: payload.executionPlanSha256,
    launchCommand: payload.launchCommand,
    maxInvocations: payload.maxInvocations,
    requiredProjects: payload.requiredProjects,
    retryAuthorized: payload.retryAuthorized,
    sourceSnapshotSha256: payload.sourceSnapshotSha256
  }, {
    attemptId: binding.request.attemptId,
    attemptLedger: binding.request.attemptLedger,
    buildId: binding.request.buildId,
    decision: binding.request.requestedDecision,
    executionPlanSha256: binding.request.executionPlanSha256,
    launchCommand: binding.request.launchCommand,
    maxInvocations: binding.request.maxInvocations,
    requiredProjects: binding.request.requiredProjects,
    retryAuthorized: binding.request.retryAuthorized,
    sourceSnapshotSha256: binding.request.sourceSnapshotSha256
  }, `${label}: authorization request and signed payload projection differ`);
}

function readCaliforniaSignatureMeasuredAuthorizationRequestInternal(
  options: CaliforniaSignatureMeasuredAuthorizationRequestReaderOptions,
  testOnlyBeforeFinalVerification?: () => void,
  expectedFileIdentity?:
    CaliforniaSignatureMeasuredAuthorizationExpectedRequestFileIdentity
) {
  assertRecord(options,
    "California signature measured-authorization request reader options");
  assertExactKeys(options, [
    "allowedRoot",
    "expectedRequest",
    "expectedSha256",
    "requestPath"
  ], "California signature measured-authorization request reader options");
  assert.equal(typeof options.allowedRoot, "string",
    "California signature measured-authorization request allowed root must be one string");
  assert.equal(typeof options.expectedSha256, "string",
    "California signature measured-authorization request external SHA must be one string");
  assert.equal(typeof options.requestPath, "string",
    "California signature measured-authorization request path must be one string");
  const expectedRequest = exactMeasuredAuthorizationRequest(
    options.expectedRequest,
    "California signature measured-authorization expected request"
  );
  const allowedRoot = path.resolve(options.allowedRoot);
  const requestPath = path.resolve(options.requestPath);
  assert.equal(options.allowedRoot, allowedRoot,
    "California signature measured-authorization request allowed root must be absolute and normalized");
  assert.equal(options.requestPath, requestPath,
    "California signature measured-authorization request path must be absolute and normalized");
  assert.ok(allowedRoot.startsWith("/Volumes/Starship/") &&
    requestPath.startsWith("/Volumes/Starship/"),
  "California signature measured-authorization request must remain on /Volumes/Starship");
  assert.equal(path.dirname(requestPath), allowedRoot,
    "California signature measured-authorization request must be one direct child of its exact allowed root");
  const relativeRequestPath = path.relative(allowedRoot, requestPath);
  assert.ok(relativeRequestPath && relativeRequestPath !== ".." &&
    !relativeRequestPath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeRequestPath) &&
    !relativeRequestPath.includes(path.sep),
  "California signature measured-authorization request escaped its exact allowed root");
  assertSha256(options.expectedSha256,
    "California signature measured-authorization request external byte receipt");

  const parentIdentity = lstatSync(allowedRoot, { bigint: true });
  assert.ok(parentIdentity.isDirectory() && !parentIdentity.isSymbolicLink(),
    "California signature measured-authorization request allowed root must be one physical directory");
  assert.equal(parentIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization request allowed root must be owned by this process UID");
  assert.equal(parentIdentity.mode & BigInt(0o777), BigInt(0o700),
    "California signature measured-authorization request allowed root must be mode 0700");
  assert.equal(realpathSync(allowedRoot), allowedRoot,
    "California signature measured-authorization request allowed root traverses a symlink");
  const pathIdentity = lstatSync(requestPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California signature measured-authorization request must be one regular immutable singleton file");
  assert.equal(pathIdentity.uid, parentIdentity.uid,
    "California signature measured-authorization request owner differs from its allowed root");
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o400),
    "California signature measured-authorization request must be exact immutable mode 0400");
  assert.ok(pathIdentity.size > BigInt(0) &&
    pathIdentity.size <= BigInt(CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_REQUEST_BYTES),
  "California signature measured-authorization request is empty or exceeds its byte bound");
  if (expectedFileIdentity) {
    assertMeasuredAuthorizationExpectedRequestFileIdentity(
      pathIdentity,
      expectedFileIdentity,
      "California signature measured-authorization initial request pathname"
    );
  }
  assert.equal(realpathSync(requestPath), requestPath,
    "California signature measured-authorization request traverses a symlink");
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "California signature measured-authorization request reader requires O_NOFOLLOW");

  const requestFd = openSync(requestPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let bytes: Buffer;
  let fileSha256: string;
  let request: CaliforniaSignatureMeasuredAuthorizationRequest;
  try {
    const before = fstatSync(requestFd, { bigint: true });
    assert.ok(before.isFile() && before.nlink === BigInt(1),
      "California signature measured-authorization held request FD is not one regular singleton file");
    assertMeasuredAuthorizationFileIdentity(
      before,
      measuredAuthorizationFileIdentity(pathIdentity),
      "California signature measured-authorization held request FD before read"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        before,
        expectedFileIdentity,
        "California signature measured-authorization held request FD before read"
      );
    }
    assert.equal(before.mode & BigInt(0o777), BigInt(0o400),
      "California signature measured-authorization held request FD changed immutable mode");
    bytes = readExactMeasuredAuthorizationFileDescriptor(
      requestFd,
      before.size,
      "California signature measured-authorization held request FD initial read"
    );
    const after = fstatSync(requestFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      after,
      measuredAuthorizationFileIdentity(before),
      "California signature measured-authorization held request FD after read"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        after,
        expectedFileIdentity,
        "California signature measured-authorization held request FD after read"
      );
    }
    if (testOnlyBeforeFinalVerification) {
      testOnlyBeforeFinalVerification();
    }
    const afterFinalVerificationHook = fstatSync(requestFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      afterFinalVerificationHook,
      measuredAuthorizationFileIdentity(after),
      "California signature measured-authorization held request FD after final-verification hook"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        afterFinalVerificationHook,
        expectedFileIdentity,
        "California signature measured-authorization held request FD after final-verification hook"
      );
    }
    const finalBytes = readExactMeasuredAuthorizationFileDescriptor(
      requestFd,
      afterFinalVerificationHook.size,
      "California signature measured-authorization held request FD final same-FD readback"
    );
    assert.deepEqual(finalBytes, bytes,
      "California signature measured-authorization final same-FD request bytes changed");
    const afterFinalReadback = fstatSync(requestFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      afterFinalReadback,
      measuredAuthorizationFileIdentity(afterFinalVerificationHook),
      "California signature measured-authorization held request FD after final same-FD readback"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        afterFinalReadback,
        expectedFileIdentity,
        "California signature measured-authorization held request FD after final same-FD readback"
      );
    }

    fileSha256 = sha256(bytes);
    assert.equal(fileSha256, options.expectedSha256,
      "California signature measured-authorization request bytes differ from the external SHA receipt");
    let parsedRequest: unknown;
    try {
      parsedRequest = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new Error(`California signature measured-authorization request is invalid JSON: ${
        error instanceof Error ? error.message : String(error)}`);
    }
    request = exactMeasuredAuthorizationRequest(
      parsedRequest,
      "California signature measured-authorization file request"
    );
    assert.deepEqual(
      bytes,
      Buffer.from(`${JSON.stringify(request, null, 2)}\n`, "utf8"),
      "California signature measured-authorization request is not exact canonical pretty JSON plus LF"
    );
    assert.deepEqual(request, expectedRequest,
      "California signature measured-authorization parsed request differs from the exact expected request object");
    const afterSemanticVerification = fstatSync(requestFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(
      afterSemanticVerification,
      measuredAuthorizationFileIdentity(afterFinalReadback),
      "California signature measured-authorization held request FD after semantic verification"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        afterSemanticVerification,
        expectedFileIdentity,
        "California signature measured-authorization held request FD after semantic verification"
      );
    }
    const finalParentIdentity = lstatSync(allowedRoot, { bigint: true });
    assert.ok(finalParentIdentity.isDirectory() &&
      !finalParentIdentity.isSymbolicLink(),
    "California signature measured-authorization final verification allowed root is not one physical directory");
    assertMeasuredAuthorizationFileIdentity(
      finalParentIdentity,
      measuredAuthorizationFileIdentity(parentIdentity),
      "California signature measured-authorization final verification allowed root"
    );
    assert.equal(realpathSync(allowedRoot), allowedRoot,
      "California signature measured-authorization final verification allowed root traverses a symlink");
    const finalPath = lstatSync(requestPath, { bigint: true });
    assert.ok(finalPath.isFile() && !finalPath.isSymbolicLink(),
      "California signature measured-authorization final verification request path is not one physical file");
    assertMeasuredAuthorizationFileIdentity(
      finalPath,
      measuredAuthorizationFileIdentity(afterSemanticVerification),
      "California signature measured-authorization final verification request pathname"
    );
    if (expectedFileIdentity) {
      assertMeasuredAuthorizationExpectedRequestFileIdentity(
        finalPath,
        expectedFileIdentity,
        "California signature measured-authorization final verification request pathname"
      );
    }
    assert.equal(realpathSync(requestPath), requestPath,
      "California signature measured-authorization final verification request pathname traverses a symlink");
  } finally {
    closeSync(requestFd);
  }
  const loadedRequest = deepFreezeMeasuredAuthorization({
    fileSha256,
    request
  });
  californiaSignatureMeasuredAuthorizationRequestBindings.set(
    loadedRequest,
    {
      allowedRoot,
      allowedRootIdentity: measuredAuthorizationRequestRootIdentity(
        parentIdentity
      ),
      bytes: Buffer.from(bytes),
      fileSha256,
      identity: measuredAuthorizationFileIdentity(pathIdentity),
      request: deepFreezeMeasuredAuthorization(structuredClone(request)),
      requestPath
    }
  );
  return loadedRequest;
}

export function readCaliforniaSignatureMeasuredAuthorizationRequest(
  options: CaliforniaSignatureMeasuredAuthorizationRequestReaderOptions
) {
  assertRecord(options,
    "California signature production measured-authorization request reader options");
  assertExactKeys(options, [
    "allowedRoot",
    "expectedRequest",
    "expectedSha256",
    "requestPath"
  ], "California signature production measured-authorization request reader options");
  return readCaliforniaSignatureMeasuredAuthorizationRequestInternal({
    allowedRoot: options.allowedRoot,
    expectedRequest: options.expectedRequest,
    expectedSha256: options.expectedSha256,
    requestPath: options.requestPath
  });
}

export function readCaliforniaSignatureMeasuredAuthorizationRequestForPublication(
  options: CaliforniaSignatureMeasuredAuthorizationRequestPublicationReaderOptions
) {
  assert.equal(arguments.length, 1,
    "California signature measured-authorization publication request reader expects one options object");
  assertRecord(options,
    "California signature measured-authorization publication request reader options");
  assertExactKeys(options, [
    "allowedRoot",
    "expectedFileIdentity",
    "expectedRequest",
    "expectedSha256",
    "requestPath"
  ], "California signature measured-authorization publication request reader options");
  const allowedRoot = options.allowedRoot;
  const expectedFileIdentityInput = options.expectedFileIdentity;
  const expectedRequestInput = options.expectedRequest;
  const expectedSha256 = options.expectedSha256;
  const requestPath = options.requestPath;
  const expectedRequest = structuredClone(expectedRequestInput);
  const expectedFileIdentity =
    exactMeasuredAuthorizationRequestPublicationFileIdentity(
      expectedFileIdentityInput
    );
  return readCaliforniaSignatureMeasuredAuthorizationRequestInternal({
    allowedRoot,
    expectedRequest,
    expectedSha256,
    requestPath
  }, undefined, expectedFileIdentity);
}

export function __testingReadCaliforniaSignatureMeasuredAuthorizationRequest(
  options: CaliforniaSignatureMeasuredAuthorizationTestingRequestReaderOptions
) {
  assertRecord(options,
    "California signature test-only measured-authorization request reader options");
  assertExactKeys(options, [
    "allowedRoot",
    "expectedRequest",
    "expectedSha256",
    "requestPath",
    "testOnlyBeforeFinalVerification"
  ], "California signature test-only measured-authorization request reader options");
  assert.ok(typeof options.testOnlyBeforeFinalVerification === "function",
    "California signature test-only measured-authorization request reader requires one synchronous final-verification hook");
  return readCaliforniaSignatureMeasuredAuthorizationRequestInternal({
    allowedRoot: options.allowedRoot,
    expectedRequest: options.expectedRequest,
    expectedSha256: options.expectedSha256,
    requestPath: options.requestPath
  }, options.testOnlyBeforeFinalVerification);
}

function assertMeasuredAuthorizationPythonIdentity() {
  const identity = lstatSync(CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PYTHON,
    { bigint: true });
  assert.ok(identity.isFile() && !identity.isSymbolicLink(),
    "California signature measured-authorization durable writer must be one root-owned physical interpreter");
  assert.equal(identity.uid, BigInt(0),
    "California signature measured-authorization durable-writer interpreter must be root-owned");
  assert.equal(identity.mode & BigInt(0o022), BigInt(0),
    "California signature measured-authorization durable-writer interpreter must not be group/world writable");
  assert.equal(realpathSync(CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PYTHON),
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PYTHON,
  "California signature measured-authorization durable-writer interpreter traverses a symlink");
}

function writeDurableMeasuredAuthorizationConsumption(options: {
  attemptLedgerBinding: CaliforniaSignatureMeasuredAuthorizationAttemptLedgerBinding;
  bytes: Buffer;
  leaf: string;
}): readonly CaliforniaSignatureMeasuredAuthorizationTestOnlyDurabilityEvent[] {
  assert.ok(options.bytes.length > 0 &&
    options.bytes.length <= CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_CONSUMPTION_BYTES,
  "California signature measured-authorization consumption bytes are empty or exceed their bound");
  assert.match(options.leaf,
    /^[a-f0-9]{64}\.measured-authorization-consumed\.json$/,
  "California signature measured-authorization consumption leaf is unsafe");
  assertMeasuredAuthorizationAttemptLedgerBinding(
    options.attemptLedgerBinding,
    "California signature measured authorization immediately before held-root consumption"
  );
  const root = options.attemptLedgerBinding.ledgerRoot;
  const rootPathIdentity = lstatSync(root, { bigint: true });
  assert.equal(rootPathIdentity.birthtimeNs,
    options.attemptLedgerBinding.ledgerRootBirthtimeNs,
  "California signature measured-authorization pre-open ledger-root birthtime changed");
  assert.equal(rootPathIdentity.dev, options.attemptLedgerBinding.ledgerRootDev,
    "California signature measured-authorization pre-open ledger-root device changed");
  assert.equal(rootPathIdentity.ino, options.attemptLedgerBinding.ledgerRootIno,
    "California signature measured-authorization pre-open ledger-root inode changed");
  assert.equal(rootPathIdentity.uid, options.attemptLedgerBinding.ledgerRootUid,
    "California signature measured-authorization pre-open ledger-root owner changed");
  assert.equal(rootPathIdentity.mode, options.attemptLedgerBinding.ledgerRootMode,
    "California signature measured-authorization pre-open ledger-root mode changed");
  assertMeasuredAuthorizationPythonIdentity();
  assert.equal(typeof fsConstants.O_DIRECTORY, "number",
    "California signature measured-authorization durable writer requires O_DIRECTORY");
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "California signature measured-authorization durable writer requires O_NOFOLLOW");
  const rootFd = openSync(root,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY |
    fsConstants.O_NOFOLLOW);
  let childStatus: number | null = null;
  let childSignal: NodeJS.Signals | null = null;
  let childError: Error | undefined;
  let childStdout = Buffer.alloc(0);
  let childStderr = Buffer.alloc(0);
  let rootFdIdentity: BigIntStats;
  try {
    rootFdIdentity = fstatSync(rootFd, { bigint: true });
    assert.ok(rootFdIdentity.isDirectory(),
      "California signature measured-authorization held consumption root is not one directory");
    for (const key of ["birthtimeNs", "dev", "ino", "uid", "mode"] as const) {
      assert.equal(rootFdIdentity[key], rootPathIdentity[key],
        `California signature measured-authorization held root ${key} differs from its path`);
    }
    const result = spawnSync(
      CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PYTHON,
      [
        "-I",
        "-S",
        "-E",
        "-B",
        "-c",
        CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DURABLE_WRITER_SOURCE,
        options.leaf,
        sha256(options.bytes),
        String(options.bytes.length),
        String(rootFdIdentity.dev),
        String(rootFdIdentity.ino),
        String(measuredAuthorizationProcessUid()),
        String(0o700),
        CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ANCHOR_FILENAME,
        options.attemptLedgerBinding.signedIdentity.anchorSha256,
        options.attemptLedgerBinding.signedIdentity.ledgerId,
        options.attemptLedgerBinding.signedIdentity.rootPathSha256
      ],
      {
        cwd: "/",
        encoding: null,
        env: {
          LANG: "C",
          LC_ALL: "C",
          PATH: "/usr/bin:/bin"
        } as unknown as NodeJS.ProcessEnv,
        input: options.bytes,
        maxBuffer: CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_CONSUMPTION_BYTES,
        stdio: ["pipe", "pipe", "pipe", rootFd],
        timeout: 30_000
      }
    );
    childStatus = result.status;
    childSignal = result.signal;
    childError = result.error;
    childStdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
    childStderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0);

    const heldAfter = fstatSync(rootFd, { bigint: true });
    const pathAfter = lstatSync(root, { bigint: true });
    assert.ok(heldAfter.isDirectory() && pathAfter.isDirectory() &&
      !pathAfter.isSymbolicLink(),
    "California signature measured-authorization consumption root changed node type");
    for (const key of [
      "birthtimeNs", "dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink", "uid", "mode"
    ] as const) {
      assert.equal(pathAfter[key], heldAfter[key],
        `California signature measured-authorization final held/path root ${key} differs`);
    }
    assert.equal(heldAfter.dev, rootFdIdentity.dev,
      "California signature measured-authorization held root device changed");
    assert.equal(heldAfter.ino, rootFdIdentity.ino,
      "California signature measured-authorization held root inode changed");
    assert.equal(heldAfter.uid, rootFdIdentity.uid,
      "California signature measured-authorization held root owner changed");
    assert.equal(heldAfter.mode, rootFdIdentity.mode,
      "California signature measured-authorization held root mode changed");
    assert.equal(heldAfter.birthtimeNs,
      options.attemptLedgerBinding.ledgerRootBirthtimeNs,
    "California signature measured-authorization held ledger-root birthtime differs from its binding");
    assert.equal(realpathSync(root), root,
      "California signature measured-authorization final consumption root traverses a symlink");
  } finally {
    closeSync(rootFd);
  }

  if (childError) {
    throw new Error(
      `California signature measured-authorization durable writer failed: ${childError.message}`
    );
  }
  const stderr = childStderr.toString("utf8");
  if (childStatus !== 0 || childSignal !== null) {
    if (childStatus === 73 && stderr === "ATTEMPT_CONSUMPTION_EEXIST\n") {
      throw new Error(
        "California signature measured-authorization attempt is already consumed or poisoned (O_EXCL/EEXIST)"
      );
    }
    throw new Error(
      `California signature measured-authorization durable consumption failed without rollback: status=${String(childStatus)} signal=${String(childSignal)} stderr=${JSON.stringify(stderr)}`
    );
  }
  assert.equal(stderr, "",
    "California signature measured-authorization durable writer emitted unexpected stderr");
  const expectedSha256 = sha256(options.bytes);
  const transcriptLines = childStdout.toString("utf8").split("\n");
  assert.equal(transcriptLines.pop(), "",
    "California signature measured-authorization durable writer transcript must end in one newline");
  assert.equal(transcriptLines.length, 7,
    "California signature measured-authorization durable writer transcript length drifted");
  const rootBound = /^ROOT_FD_BOUND ([a-f0-9]{64})$/
    .exec(transcriptLines[0]!);
  const markerCreated = /^MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD ([a-f0-9]{64}) ([a-f0-9]{64}) ([0-9]+) ([a-f0-9]{64}\.measured-authorization-consumed\.json)$/
    .exec(transcriptLines[1]!);
  const markerWritten = /^MARKER_WRITTEN ([a-f0-9]{64}) ([a-f0-9]{64})$/
    .exec(transcriptLines[2]!);
  const markerFileFsynced = /^MARKER_FILE_FSYNCED ([a-f0-9]{64})$/
    .exec(transcriptLines[3]!);
  const markerReadback = /^MARKER_SAME_FD_READBACK_VERIFIED ([a-f0-9]{64}) ([a-f0-9]{64})$/
    .exec(transcriptLines[4]!);
  const markerRootFsynced = /^MARKER_ROOT_FSYNCED ([a-f0-9]{64})$/
    .exec(transcriptLines[5]!);
  const durable = /^DURABLE ([a-f0-9]{64}) ([0-9]+) ([0-9]+) ([0-9]+)$/
    .exec(transcriptLines[6]!);
  assert.ok(rootBound && markerCreated && markerWritten && markerFileFsynced &&
    markerReadback && markerRootFsynced && durable,
  "California signature measured-authorization durable writer transcript drifted");

  const rootFdOpaqueIdentity = rootBound[1]!;
  const fileFdOpaqueIdentity = markerCreated[2]!;
  assert.equal(markerCreated[1], rootFdOpaqueIdentity,
    "California signature measured-authorization exclusive creation root FD identity drifted");
  assert.equal(markerRootFsynced[1], rootFdOpaqueIdentity,
    "California signature measured-authorization root-fsync FD identity drifted");
  assert.notEqual(fileFdOpaqueIdentity, rootFdOpaqueIdentity,
    "California signature measured-authorization root/file opaque identities collide");
  assert.equal(markerWritten[1], fileFdOpaqueIdentity,
    "California signature measured-authorization written file FD identity drifted");
  assert.equal(markerFileFsynced[1], fileFdOpaqueIdentity,
    "California signature measured-authorization file-fsync FD identity drifted");
  assert.equal(markerReadback[1], fileFdOpaqueIdentity,
    "California signature measured-authorization readback file FD identity drifted");
  assert.equal(markerCreated[3], String(0o600),
    "California signature measured-authorization helper-created mode drifted");
  assert.equal(markerCreated[4], options.leaf,
    "California signature measured-authorization helper-created relative name drifted");
  assert.equal(markerWritten[2], expectedSha256,
    "California signature measured-authorization durable-writer write SHA drifted");
  assert.equal(markerReadback[2], expectedSha256,
    "California signature measured-authorization durable-writer readback SHA drifted");
  assert.equal(durable[1], expectedSha256,
    "California signature measured-authorization durable-writer acknowledgement SHA drifted");
  assert.equal(durable[2], String(options.bytes.length),
    "California signature measured-authorization durable-writer acknowledgement size drifted");

  const targetPath = path.join(root, options.leaf);
  assert.equal(path.dirname(targetPath), root,
    "California signature measured-authorization consumption target escaped its root");
  const pathIdentity = lstatSync(targetPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California signature measured-authorization durable consumption is not one regular singleton file");
  assert.equal(pathIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization durable consumption owner drifted");
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o600),
    "California signature measured-authorization durable consumption mode is not exact 0600");
  assert.equal(pathIdentity.size, BigInt(options.bytes.length),
    "California signature measured-authorization durable consumption size drifted");
  assert.equal(pathIdentity.dev, BigInt(durable[3]!),
    "California signature measured-authorization durable consumption device differs from helper ACK");
  assert.equal(pathIdentity.ino, BigInt(durable[4]!),
    "California signature measured-authorization durable consumption inode differs from helper ACK");
  const targetFd = openSync(targetPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = fstatSync(targetFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(before,
      measuredAuthorizationFileIdentity(pathIdentity),
      "California signature measured-authorization durable consumption held FD");
    const readback = readFileSync(targetFd);
    assert.deepEqual(readback, options.bytes,
      "California signature measured-authorization durable consumption literal readback drifted");
    assert.equal(sha256(readback), expectedSha256,
      "California signature measured-authorization durable consumption readback SHA drifted");
    const after = fstatSync(targetFd, { bigint: true });
    assertMeasuredAuthorizationFileIdentity(after,
      measuredAuthorizationFileIdentity(pathIdentity),
      "California signature measured-authorization durable consumption final held FD");
  } finally {
    closeSync(targetFd);
  }
  const finalPath = lstatSync(targetPath, { bigint: true });
  assertMeasuredAuthorizationFileIdentity(finalPath,
    measuredAuthorizationFileIdentity(pathIdentity),
    "California signature measured-authorization durable consumption final path");
  assertMeasuredAuthorizationAttemptLedgerBinding(
    options.attemptLedgerBinding,
    "California signature measured authorization after durable held-root consumption"
  );
  return Object.freeze([
    Object.freeze({
      kind: "ROOT_FD_BOUND" as const,
      rootFdIdentity: rootFdOpaqueIdentity
    }),
    Object.freeze({
      fileFdIdentity: fileFdOpaqueIdentity,
      kind: "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD" as const,
      mode: 0o600 as const,
      relativeName: options.leaf,
      rootFdIdentity: rootFdOpaqueIdentity
    }),
    Object.freeze({
      fileFdIdentity: fileFdOpaqueIdentity,
      kind: "MARKER_WRITTEN" as const,
      sha256: expectedSha256
    }),
    Object.freeze({
      fileFdIdentity: fileFdOpaqueIdentity,
      kind: "MARKER_FILE_FSYNCED" as const
    }),
    Object.freeze({
      fileFdIdentity: fileFdOpaqueIdentity,
      kind: "MARKER_SAME_FD_READBACK_VERIFIED" as const,
      sha256: expectedSha256
    }),
    Object.freeze({
      kind: "MARKER_ROOT_FSYNCED" as const,
      rootFdIdentity: rootFdOpaqueIdentity
    })
  ] satisfies readonly CaliforniaSignatureMeasuredAuthorizationTestOnlyDurabilityEvent[]);
}

function readCaliforniaSignatureMeasuredAuthorizationReceiptInternal(
  options: CaliforniaSignatureMeasuredAuthorizationReaderOptions,
  trustedReviewerKeys: ReadonlyMap<string, string>,
  attemptLedgerRoot: string
): CaliforniaSignatureMeasuredAuthorizationValidatedReceipt {
  assertRecord(options, "California signature measured-authorization reader options");
  assert.ok(options.authorizationRequest &&
    typeof options.authorizationRequest === "object" &&
    !Array.isArray(options.authorizationRequest),
  "California signature measured-authorization receipt reader requires one opaque reader-issued authorization request brand");
  const requestBinding =
    californiaSignatureMeasuredAuthorizationRequestBindings.get(
      options.authorizationRequest
    );
  assert.ok(requestBinding,
    "California signature measured-authorization receipt reader rejected a non-reader-issued opaque authorization request brand");
  assertMeasuredAuthorizationRequestBinding(
    requestBinding,
    "California signature measured-authorization receipt-reader authorization request binding"
  );
  const allowedRoot = path.resolve(options.allowedRoot);
  const receiptPath = path.resolve(options.receiptPath);
  assert.equal(options.allowedRoot, allowedRoot,
    "California signature measured-authorization allowed root must be absolute and normalized");
  assert.equal(options.receiptPath, receiptPath,
    "California signature measured-authorization receipt path must be absolute and normalized");
  assert.ok(allowedRoot.startsWith("/Volumes/Starship/") &&
    receiptPath.startsWith("/Volumes/Starship/"),
  "California signature measured-authorization receipt must remain on /Volumes/Starship");
  assert.equal(path.dirname(receiptPath), allowedRoot,
    "California signature measured-authorization receipt must be one direct child of its exact allowed root");
  const relativeReceiptPath = path.relative(allowedRoot, receiptPath);
  assert.ok(relativeReceiptPath && relativeReceiptPath !== ".." &&
    !relativeReceiptPath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeReceiptPath) &&
    !relativeReceiptPath.includes(path.sep),
  "California signature measured-authorization receipt escapes its exact allowed root");
  assertSha256(options.expectedSha256,
    "California signature measured-authorization external byte receipt");

  const parentIdentity = lstatSync(allowedRoot, { bigint: true });
  assert.ok(parentIdentity.isDirectory() && !parentIdentity.isSymbolicLink(),
    "California signature measured-authorization allowed root must be one physical directory");
  assert.equal(parentIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization allowed root must be owned by this process UID");
  assert.equal(parentIdentity.mode & BigInt(0o777), BigInt(0o700),
    "California signature measured-authorization allowed root must be mode 0700");
  assert.equal(realpathSync(allowedRoot), allowedRoot,
    "California signature measured-authorization allowed root traverses a symlink");
  const pathIdentity = lstatSync(receiptPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California signature measured-authorization receipt must be one regular singleton file");
  assert.equal(pathIdentity.uid, BigInt(measuredAuthorizationProcessUid()),
    "California signature measured-authorization receipt must be owned by this process UID");
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o600),
    "California signature measured-authorization receipt must be mode 0600");
  assert.ok(pathIdentity.size > BigInt(0) &&
    pathIdentity.size <= BigInt(CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_RECEIPT_BYTES),
  "California signature measured-authorization receipt is empty or exceeds its byte bound");
  assert.equal(realpathSync(receiptPath), receiptPath,
    "California signature measured-authorization receipt traverses a symlink");
  assert.equal(typeof fsConstants.O_NOFOLLOW, "number",
    "California signature measured-authorization reader requires O_NOFOLLOW");

  const fd = openSync(receiptPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let bytes: Buffer;
  try {
    const before = fstatSync(fd, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(before[key], pathIdentity[key],
        `California signature measured-authorization pre-read FD ${key} differs from its path`);
    }
    assert.ok(before.isFile() && before.nlink === BigInt(1),
      "California signature measured-authorization held FD is not one regular singleton file");
    assert.equal(before.uid, BigInt(measuredAuthorizationProcessUid()),
      "California signature measured-authorization held FD changed owner");
    assert.equal(before.mode & BigInt(0o777), BigInt(0o600),
      "California signature measured-authorization held FD changed mode");
    assert.ok(before.size > BigInt(0) &&
      before.size <= BigInt(CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_RECEIPT_BYTES),
    "California signature measured-authorization held FD exceeds its byte bound");
    bytes = readFileSync(fd);
    assert.equal(BigInt(bytes.length), before.size,
      "California signature measured-authorization held-FD byte count drifted");
    const after = fstatSync(fd, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(after[key], before[key],
        `California signature measured-authorization held-FD ${key} changed during read`);
    }
    const finalPath = lstatSync(receiptPath, { bigint: true });
    assert.ok(finalPath.isFile() && !finalPath.isSymbolicLink(),
      "California signature measured-authorization final path is not one physical file");
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(finalPath[key], after[key],
        `California signature measured-authorization final pathname ${key} changed during read`);
    }
    assert.equal(finalPath.uid, after.uid,
      "California signature measured-authorization final pathname owner changed during read");
    assert.equal(finalPath.mode, after.mode,
      "California signature measured-authorization final pathname mode changed during read");
    assert.equal(realpathSync(receiptPath), receiptPath,
      "California signature measured-authorization final pathname traverses a symlink");
  } finally {
    closeSync(fd);
  }

  const fileSha256 = sha256(bytes);
  assert.equal(fileSha256, options.expectedSha256,
    "California signature measured-authorization bytes differ from the external SHA receipt");
  let parsedReceipt: unknown;
  try {
    parsedReceipt = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`California signature measured-authorization receipt is invalid JSON: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assertRecord(parsedReceipt, "California signature measured-authorization receipt");
  assertExactKeys(
    parsedReceipt,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RECEIPT_KEYS,
    "California signature measured-authorization receipt"
  );
  assertString(parsedReceipt.payloadBase64,
    "California signature measured-authorization payloadBase64 must be one string");
  assertString(parsedReceipt.reviewerKeyId,
    "California signature measured-authorization reviewerKeyId must be one string");
  assertString(parsedReceipt.schema,
    "California signature measured-authorization schema must be one string");
  assertString(parsedReceipt.signatureAlgorithm,
    "California signature measured-authorization signatureAlgorithm must be one string");
  assertString(parsedReceipt.signatureBase64,
    "California signature measured-authorization signatureBase64 must be one string");
  const receipt: CaliforniaSignatureMeasuredAuthorizationDiscoveryReceipt = {
    payloadBase64: parsedReceipt.payloadBase64,
    reviewerKeyId: parsedReceipt.reviewerKeyId,
    schema: parsedReceipt.schema as typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DISCOVERY_SCHEMA,
    signatureAlgorithm: parsedReceipt.signatureAlgorithm as "Ed25519",
    signatureBase64: parsedReceipt.signatureBase64
  };
  assert.equal(receipt.schema,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DISCOVERY_SCHEMA,
  "California signature measured-authorization v2 receipts are non-authorizing; exact v3 schema required");
  assert.equal(receipt.signatureAlgorithm, "Ed25519",
    "California signature measured-authorization signature algorithm must be Ed25519");
  assertHighEntropyId(receipt.reviewerKeyId,
    "California signature measured-authorization reviewer key ID");
  assert.deepEqual(
    bytes,
    Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8"),
    "California signature measured-authorization receipt JSON is not canonical"
  );

  const payloadBytes = decodeCanonicalBase64(
    receipt.payloadBase64,
    "California signature measured-authorization payload",
    CALIFORNIA_SIGNATURE_MAX_MEASURED_AUTHORIZATION_PAYLOAD_BYTES
  );
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`California signature measured-authorization payload is invalid JSON: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assertRecord(parsedPayload, "California signature measured-authorization payload");
  assertExactKeys(
    parsedPayload,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_PAYLOAD_KEYS,
    "California signature measured-authorization payload"
  );
  assertString(parsedPayload.attemptId,
    "California signature measured-authorization attemptId must be one string");
  const attemptLedger = exactMeasuredAuthorizationAttemptLedgerIdentity(
    parsedPayload.attemptLedger
  );
  assertString(parsedPayload.authorizationNonce,
    "California signature measured-authorization nonce must be one string");
  assertString(parsedPayload.authorizationRequestSha256,
    "California signature measured-authorization authorization-request SHA must be one string");
  assertString(parsedPayload.buildId,
    "California signature measured-authorization buildId must be one string");
  assertString(parsedPayload.decision,
    "California signature measured-authorization decision must be one string");
  assertString(parsedPayload.executionPlanSha256,
    "California signature measured-authorization execution plan SHA must be one string");
  assertString(parsedPayload.expiresAt,
    "California signature measured-authorization expiresAt must be one string");
  assertString(parsedPayload.issuedAt,
    "California signature measured-authorization issuedAt must be one string");
  assertString(parsedPayload.sourceSnapshotSha256,
    "California signature measured-authorization source snapshot SHA must be one string");
  assertHighEntropyId(parsedPayload.attemptId,
    "California signature measured-authorization attemptId");
  assertHighEntropyId(parsedPayload.authorizationNonce,
    "California signature measured-authorization nonce");
  assertSha256(parsedPayload.authorizationRequestSha256,
    "California signature measured-authorization authorization request");
  assertHighEntropyId(parsedPayload.buildId,
    "California signature measured-authorization buildId");
  assert.equal(parsedPayload.decision,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION,
  "California signature measured-authorization decision is not exact authorization");
  assertSha256(parsedPayload.executionPlanSha256,
    "California signature measured-authorization execution plan");
  const expiresAt = exactCanonicalMeasuredAuthorizationIso(
    parsedPayload.expiresAt,
    "California signature measured-authorization expiresAt"
  );
  const issuedAt = exactCanonicalMeasuredAuthorizationIso(
    parsedPayload.issuedAt,
    "California signature measured-authorization issuedAt"
  );
  const launchCommand = exactMeasuredAuthorizationLaunchCommand(
    parsedPayload.launchCommand,
    "California signature measured-authorization signed launch command"
  );
  assert.equal(parsedPayload.maxInvocations, 1,
    "California signature measured authorization must bind maxInvocations=1");
  assert.deepEqual(parsedPayload.requiredProjects,
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
  "California signature measured-authorization must bind exactly two Chrome projects");
  assert.equal(parsedPayload.retryAuthorized, false,
    "California signature measured authorization must forbid retries");
  assertSha256(parsedPayload.sourceSnapshotSha256,
    "California signature measured-authorization source snapshot");
  const payload: CaliforniaSignatureMeasuredAuthorizationPayload = {
    attemptId: parsedPayload.attemptId,
    attemptLedger,
    authorizationNonce: parsedPayload.authorizationNonce,
    authorizationRequestSha256: parsedPayload.authorizationRequestSha256,
    buildId: parsedPayload.buildId,
    decision: parsedPayload.decision as typeof CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_DECISION,
    executionPlanSha256: parsedPayload.executionPlanSha256,
    expiresAt,
    issuedAt,
    launchCommand,
    maxInvocations: 1,
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    retryAuthorized: false,
    sourceSnapshotSha256: parsedPayload.sourceSnapshotSha256
  };
  assertMeasuredAuthorizationPayloadIsLive(payload,
    "California signature measured authorization at receipt validation");
  assert.deepEqual(
    payloadBytes,
    Buffer.from(JSON.stringify(payload), "utf8"),
    "California signature measured-authorization payload JSON is not canonical"
  );

  const publicKeyBase64 = trustedReviewerKeys.get(receipt.reviewerKeyId);
  if (!publicKeyBase64) {
    throw new CaliforniaSignatureCapacityAuthorizationHoldError(
      `California signature measured authorization is on HOLD: unknown trusted reviewer key ${receipt.reviewerKeyId}`
    );
  }
  const publicKeyBytes = decodeCanonicalBase64(
    publicKeyBase64,
    `${receipt.reviewerKeyId}: trusted reviewer SPKI DER`,
    1024
  );
  let publicKey;
  try {
    publicKey = createPublicKey({
      format: "der",
      key: publicKeyBytes,
      type: "spki"
    });
  } catch (error) {
    throw new Error(`${receipt.reviewerKeyId}: invalid trusted reviewer SPKI DER: ${
      error instanceof Error ? error.message : String(error)}`);
  }
  assert.equal(publicKey.asymmetricKeyType, "ed25519",
    `${receipt.reviewerKeyId}: trusted reviewer key must be Ed25519`);
  assert.deepEqual(
    publicKey.export({ format: "der", type: "spki" }),
    publicKeyBytes,
    `${receipt.reviewerKeyId}: trusted reviewer SPKI DER is not canonical`
  );
  const signatureBytes = decodeCanonicalBase64(
    receipt.signatureBase64,
    "California signature measured-authorization Ed25519 signature",
    64
  );
  assert.equal(signatureBytes.length, 64,
    "California signature measured-authorization Ed25519 signature must be 64 bytes");
  assert.equal(verifyBytes(null, payloadBytes, publicKey, signatureBytes), true,
    "California signature measured-authorization Ed25519 signature is invalid for its exact payload bytes");
  assertMeasuredAuthorizationRequestProjectsToPayload(
    requestBinding,
    payload,
    "California signature measured-authorization receipt authorization request binding"
  );
  const attemptLedgerBinding = readMeasuredAuthorizationAttemptLedgerBinding(
    attemptLedgerRoot,
    payload.attemptLedger
  );

  const authorization = deepFreezeMeasuredAuthorization<
    CaliforniaSignatureMeasuredAuthorization
  >({
    ...structuredClone(payload),
    payloadSha256: sha256(payloadBytes),
    receiptSha256: fileSha256,
    reviewerKeyId: receipt.reviewerKeyId,
    signatureSha256: sha256(signatureBytes)
  });
  const validatedReceiptPayloadFingerprint = sha256(capacityStableJson({
    payload,
    payloadBytesSha256: sha256(payloadBytes),
    receipt,
    receiptBytesSha256: fileSha256
  }));
  const launchContext = deepFreezeMeasuredAuthorization(
    measuredAuthorizationLaunchContextFromPayload(payload)
  );
  const brand: CaliforniaSignatureMeasuredAuthorizationBrand = {
    attemptLedgerBinding,
    authorizationFingerprint: sha256(capacityStableJson({
      authorization,
      validatedReceiptPayloadFingerprint
    })),
    launchContext,
    launchContextSha256: measuredAuthorizationLaunchContextSha256(launchContext),
    payload: deepFreezeMeasuredAuthorization(structuredClone(payload)),
    receiptBinding: {
      allowedRoot,
      allowedRootDev: parentIdentity.dev,
      allowedRootIno: parentIdentity.ino,
      allowedRootMode: parentIdentity.mode,
      allowedRootUid: parentIdentity.uid,
      bytes: Buffer.from(bytes),
      identity: measuredAuthorizationFileIdentity(pathIdentity),
      receiptPath,
      receiptSha256: fileSha256
    },
    requestBinding,
    validatedReceiptPayloadFingerprint
  };
  return { authorization, brand, fileSha256 };
}

export function readCaliforniaSignatureMeasuredAuthorizationReceipt(
  options: CaliforniaSignatureMeasuredAuthorizationReaderOptions
) {
  assertRecord(options, "California signature production measured-authorization reader options");
  assertExactKeys(options, [
    "allowedRoot",
    "authorizationRequest",
    "expectedSha256",
    "receiptPath"
  ], "California signature production measured-authorization reader options");
  const loaded = readCaliforniaSignatureMeasuredAuthorizationReceiptInternal(
    {
      allowedRoot: options.allowedRoot,
      authorizationRequest: options.authorizationRequest,
      expectedSha256: options.expectedSha256,
      receiptPath: options.receiptPath
    },
    californiaSignatureMeasuredAuthorizationTrustedReviewerKeys,
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT
  );
  const result = deepFreezeMeasuredAuthorization({
    authorization: loaded.authorization,
    fileSha256: loaded.fileSha256
  });
  californiaSignatureMeasuredAuthorizationProductionBrands.set(
    result.authorization,
    {
      ...loaded.brand,
      provenance: "production-fixed-reviewer-registry"
    }
  );
  return result;
}

export function __testingReadCaliforniaSignatureMeasuredAuthorizationReceipt(
  options: CaliforniaSignatureMeasuredAuthorizationReaderOptions & {
    testOnlyAttemptLedgerRoot: string;
    testOnlyTrustedReviewerPublicKeys: ReadonlyMap<string, string>;
  }
) {
  assertRecord(options, "California signature test-only measured-authorization reader options");
  assertTestOnlyMeasuredAuthorizationRootDisjointFromProductionLedger(
    options.testOnlyAttemptLedgerRoot
  );
  assertExactKeys(options, [
    "allowedRoot",
    "authorizationRequest",
    "expectedSha256",
    "receiptPath",
    "testOnlyAttemptLedgerRoot",
    "testOnlyTrustedReviewerPublicKeys"
  ], "California signature test-only measured-authorization reader options");
  const trustedReviewerKeys = exactTestingReviewerKeyMap(
    options.testOnlyTrustedReviewerPublicKeys
  );
  const loaded = readCaliforniaSignatureMeasuredAuthorizationReceiptInternal(
    {
      allowedRoot: options.allowedRoot,
      authorizationRequest: options.authorizationRequest,
      expectedSha256: options.expectedSha256,
      receiptPath: options.receiptPath
    },
    trustedReviewerKeys,
    options.testOnlyAttemptLedgerRoot
  );
  const result = deepFreezeMeasuredAuthorization({
    authorization: loaded.authorization,
    fileSha256: loaded.fileSha256
  });
  californiaSignatureMeasuredAuthorizationTestingBrands.set(
    result.authorization,
    {
      ...loaded.brand,
      provenance: "test-only-injected-reviewer-registry"
    }
  );
  return result;
}

type CaliforniaSignatureMeasuredAuthorizationLaunchOptions<Result> = {
  authorization: unknown;
  launch: () => Result;
  launchContext: CaliforniaSignatureMeasuredAuthorizationLaunchContext;
};

type CaliforniaSignatureMeasuredAuthorizationTestingLaunchOptions<Result> =
  CaliforniaSignatureMeasuredAuthorizationLaunchOptions<Result> & {
    testOnlyDurabilityObserver?: (
      event: CaliforniaSignatureMeasuredAuthorizationTestOnlyDurabilityEvent
    ) => void;
  };

type CaliforniaSignatureMeasuredAuthorizationCapturedLaunch<Result> = Readonly<{
  authorization: Record<string, unknown>;
  launch: () => Result;
  launchContext: CaliforniaSignatureMeasuredAuthorizationLaunchContext;
  testOnlyDurabilityObserver?: (
    event: CaliforniaSignatureMeasuredAuthorizationTestOnlyDurabilityEvent
  ) => void;
}>;

function launchWithConsumedCaliforniaSignatureMeasuredAuthorization<Result>(
  captured: CaliforniaSignatureMeasuredAuthorizationCapturedLaunch<Result>,
  brand: CaliforniaSignatureMeasuredAuthorizationBrand
): Result {
  const {
    authorization,
    launch,
    launchContext,
    testOnlyDurabilityObserver
  } = captured;
  assertMeasuredAuthorizationObjectFingerprint(authorization, brand);
  assertMeasuredAuthorizationContextMatches(launchContext, brand);
  assertMeasuredAuthorizationPayloadIsLive(brand.payload,
    "California signature measured authorization immediately before attempt consumption");
  assertMeasuredAuthorizationRequestBinding(
    brand.requestBinding,
    "California signature measured authorization before attempt consumption authorization request binding"
  );
  assertMeasuredAuthorizationRequestProjectsToPayload(
    brand.requestBinding,
    brand.payload,
    "California signature measured authorization before attempt consumption authorization request binding"
  );
  assertMeasuredAuthorizationReceiptBinding(brand.receiptBinding,
    "California signature measured authorization before attempt consumption");

  const consumedAt = new Date().toISOString();
  const consumption = {
    attemptId: brand.payload.attemptId,
    attemptLedgerIdentitySha256: sha256(JSON.stringify(brand.payload.attemptLedger)),
    authorizationNonceSha256: sha256(brand.payload.authorizationNonce),
    authorizationRequestSha256: brand.payload.authorizationRequestSha256,
    buildId: brand.payload.buildId,
    consumedAt,
    executionPlanSha256: brand.payload.executionPlanSha256,
    ledgerId: brand.payload.attemptLedger.ledgerId,
    maxInvocations: 1,
    receiptSha256: brand.receiptBinding.receiptSha256,
    retryAuthorized: false,
    schema: CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_CONSUMPTION_SCHEMA,
    sourceSnapshotSha256: brand.payload.sourceSnapshotSha256,
    status: "CONSUMED_BEFORE_LAUNCH"
  } as const;
  assert.equal(consumption.receiptSha256, sha256(brand.receiptBinding.bytes),
    "California signature measured-authorization consumption receipt SHA drifted from its held bytes");
  const consumptionBytes = Buffer.from(`${JSON.stringify(consumption)}\n`, "utf8");
  const consumptionLeaf = `${sha256(brand.payload.attemptId)}${
    CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_CONSUMPTION_SUFFIX}`;
  const durabilityEvents = writeDurableMeasuredAuthorizationConsumption({
    attemptLedgerBinding: brand.attemptLedgerBinding,
    bytes: consumptionBytes,
    leaf: consumptionLeaf
  });

  if (testOnlyDurabilityObserver) {
    for (const event of durabilityEvents) {
      testOnlyDurabilityObserver(event);
    }
  }
  assertMeasuredAuthorizationRequestBinding(
    brand.requestBinding,
    "California signature measured authorization after durable attempt consumption authorization request binding"
  );
  assertMeasuredAuthorizationRequestProjectsToPayload(
    brand.requestBinding,
    brand.payload,
    "California signature measured authorization after durable attempt consumption authorization request binding"
  );
  assertMeasuredAuthorizationReceiptBinding(brand.receiptBinding,
    "California signature measured authorization after durable attempt consumption");
  assertMeasuredAuthorizationObjectFingerprint(authorization, brand);
  assertMeasuredAuthorizationPayloadIsLive(brand.payload,
    "California signature measured authorization immediately before launch callback");
  return launch();
}

function exactMeasuredAuthorizationLaunchOptions<Result>(
  options: CaliforniaSignatureMeasuredAuthorizationLaunchOptions<Result>,
  authorization: Record<string, unknown>,
  label: string
): CaliforniaSignatureMeasuredAuthorizationCapturedLaunch<Result> {
  assertExactKeys(options as unknown as Record<string, unknown>, [
    "authorization",
    "launch",
    "launchContext"
  ], label);
  const launch = options.launch;
  const launchContextInput = options.launchContext;
  assert.equal(typeof launch, "function",
    `${label}: launch callback must be one function`);
  const launchContext = deepFreezeMeasuredAuthorization(
    exactMeasuredAuthorizationLaunchContext(launchContextInput)
  );
  return Object.freeze({ authorization, launch, launchContext });
}

function exactTestingMeasuredAuthorizationLaunchOptions<Result>(
  options: CaliforniaSignatureMeasuredAuthorizationTestingLaunchOptions<Result>,
  authorization: Record<string, unknown>,
  label: string
): CaliforniaSignatureMeasuredAuthorizationCapturedLaunch<Result> {
  const hasObserver = Object.prototype.hasOwnProperty.call(
    options,
    "testOnlyDurabilityObserver"
  );
  assertExactKeys(options as unknown as Record<string, unknown>, hasObserver ? [
    "authorization",
    "launch",
    "launchContext",
    "testOnlyDurabilityObserver"
  ] : [
    "authorization",
    "launch",
    "launchContext"
  ], label);
  const launch = options.launch;
  const launchContextInput = options.launchContext;
  const testOnlyDurabilityObserver = hasObserver
    ? options.testOnlyDurabilityObserver
    : undefined;
  assert.equal(typeof launch, "function",
    `${label}: launch callback must be one function`);
  if (hasObserver) {
    assert.equal(typeof testOnlyDurabilityObserver, "function",
      `${label}: testOnlyDurabilityObserver must be one function`);
  }
  const launchContext = deepFreezeMeasuredAuthorization(
    exactMeasuredAuthorizationLaunchContext(launchContextInput)
  );
  return Object.freeze({
    authorization,
    launch,
    launchContext,
    ...(testOnlyDurabilityObserver
      ? { testOnlyDurabilityObserver }
      : {})
  });
}

export function verifyCaliforniaSignatureMeasuredAuthorizationForLaunch<Result>(
  options: CaliforniaSignatureMeasuredAuthorizationLaunchOptions<Result>
): Result {
  const label =
    "California signature production measured-authorization launch options";
  assertRecord(options, label);
  const authorization = options.authorization;
  assertRecord(authorization, `${label}: opaque authorization`);
  const brand = californiaSignatureMeasuredAuthorizationProductionBrands.get(
    authorization
  );
  if (!brand) {
    assertExactKeys(options, [
      "authorization",
      "launch",
      "launchContext"
    ], label);
  }
  assert.ok(brand,
    "California signature production launch requires one production-provenance authorization; test-only injected reviewer authorization is forbidden");
  assert.equal(
    californiaSignatureMeasuredAuthorizationProductionBrands.delete(
      authorization
    ),
    true,
    "California signature production measured authorization was already consumed"
  );
  assert.equal(brand.provenance, "production-fixed-reviewer-registry",
    "California signature production measured-authorization provenance drifted");
  const captured = exactMeasuredAuthorizationLaunchOptions(
    options,
    authorization,
    label
  );
  return launchWithConsumedCaliforniaSignatureMeasuredAuthorization(
    captured,
    brand
  );
}

export function __testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch<Result>(
  options: CaliforniaSignatureMeasuredAuthorizationTestingLaunchOptions<Result>
): Result {
  const label =
    "California signature test-only measured-authorization launch options";
  assertRecord(options, label);
  const authorization = options.authorization;
  assertRecord(authorization, `${label}: opaque authorization`);
  const brand = californiaSignatureMeasuredAuthorizationTestingBrands.get(
    authorization
  );
  if (!brand) {
    const hasObserver = Object.prototype.hasOwnProperty.call(
      options,
      "testOnlyDurabilityObserver"
    );
    assertExactKeys(options, hasObserver ? [
      "authorization",
      "launch",
      "launchContext",
      "testOnlyDurabilityObserver"
    ] : [
      "authorization",
      "launch",
      "launchContext"
    ], label);
  }
  assert.ok(brand,
    "California signature test-only launch requires one test-only reader authorization; production or caller-shaped authorization is forbidden");
  assert.equal(
    californiaSignatureMeasuredAuthorizationTestingBrands.delete(
      authorization
    ),
    true,
    "California signature test-only measured authorization was already consumed"
  );
  assert.equal(brand.provenance, "test-only-injected-reviewer-registry",
    "California signature test-only measured-authorization provenance drifted");
  const captured = exactTestingMeasuredAuthorizationLaunchOptions(
    options,
    authorization,
    label
  );
  return launchWithConsumedCaliforniaSignatureMeasuredAuthorization(
    captured,
    brand
  );
}

const californiaSignatureValidatedExecutionGroupOwnershipFingerprints =
  new WeakMap<object, string>();

export function assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
): void {
  assert.equal(manifest.formalExecutionAuthorized, false,
    "California signature diagnostic ownership manifest changed authorization state");
  assert.equal(manifest.status, "diagnostic-capacity-partition",
    "California signature diagnostic ownership manifest status drifted");
  throw new CaliforniaSignatureCapacityAuthorizationHoldError();
}

const californiaSignatureBoundedFixtureStreamSha256 = new Set<string>();

export type CaliforniaSignatureLoadedArtifact = {
  artifact: CaliforniaSignatureOfficialArtifact;
  fileName: string;
  fileSha256: string;
  runDirectory: string;
};

type CaliforniaSignatureEvidenceReservationIdentity = {
  artifactId: string;
  bytes: number;
  fileName: string;
  sha256: string;
};

const RUN_IDENTITY_KEYS = [
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

const OFFICIAL_ARTIFACT_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifactId",
  "createdAt",
  "evidenceSnapshot",
  "evidenceStream",
  "evidenceStreamOwnershipSha256",
  "execution",
  "executionGroupOwnership",
  "lifecycleSchemaVersion",
  "packageId",
  "projectName",
  "schemaVersion",
  "shard",
  "terminalStatus"
] as const;

const RUN_MANIFEST_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "lifecycleSchemaVersion",
  "officialArtifactSuffix",
  "requiredProjects",
  "status"
] as const;

const RUN_SEAL_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifacts",
  "evidenceReservations",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "manifestSha256",
  "producerReportSha256",
  "producerSuccessSha256",
  "sealedAt",
  "status"
] as const;

const PRODUCER_SUCCESS_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifacts",
  "evidenceReservations",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "producerReportSha256",
  "publishedAt",
  "status"
] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function capacityStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(capacityStableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, nested]) => `${JSON.stringify(key)}:${capacityStableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertNonNegativeSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value >= 0,
    `${label}: expected one non-negative safe integer`);
  return value;
}

function assertPositiveSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value > 0,
    `${label}: expected one positive safe integer`);
  return value;
}

function executionGroupOwnershipSha256(
  ownership: CaliforniaSignatureExecutionGroupOwnership | null
) {
  return sha256(capacityStableJson(ownership));
}

function evidenceStreamOwnershipSha256(options: {
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  ownership: CaliforniaSignatureExecutionGroupOwnership | null;
}) {
  return sha256(capacityStableJson({
    evidenceStreamManifestSha256: sha256(
      canonicalCaliforniaSignatureEvidenceJson(options.evidenceStream)
    ),
    executionGroupOwnershipSha256: executionGroupOwnershipSha256(options.ownership)
  }));
}

function markCaliforniaSignatureExecutionGroupOwnershipValidated(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
) {
  californiaSignatureValidatedExecutionGroupOwnershipFingerprints.set(
    manifest,
    sha256(capacityStableJson(manifest))
  );
  return manifest;
}

function assertCaliforniaSignatureExecutionGroupOwnershipValidated(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
) {
  const expectedFingerprint =
    californiaSignatureValidatedExecutionGroupOwnershipFingerprints.get(manifest);
  assert.ok(expectedFingerprint,
    "California signature group-owned matrix requires one opaque validated ownership manifest");
  assert.equal(
    sha256(capacityStableJson(manifest)),
    expectedFingerprint,
    "California signature validated ownership manifest changed after validation"
  );
}

export function californiaSignatureArtifactValidationContextKey(
  projectName: string,
  packageId: string
) {
  assertLogicalSegment(projectName, "California signature validation-context projectName");
  assertLogicalSegment(packageId, "California signature validation-context packageId");
  return `${projectName}\0${packageId}`;
}

function assertExecutionGroupOwnership(
  value: CaliforniaSignatureExecutionGroupOwnership | null,
  label: string
) {
  if (value === null) return;
  assert.deepEqual(Object.keys(value).sort(), [
    "cropCount",
    "expectedRecordCount",
    "groupKeys",
    "planSha256",
    "receiptCount",
    "schemaVersion",
    "sourceIdentitySha256",
    "sourceSnapshotSha256"
  ].sort(), `${label}: exact execution-group ownership schema drifted`);
  assert.equal(value.schemaVersion,
    CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
  `${label}: execution-group ownership schema drifted`);
  assertPositiveSafeInteger(value.expectedRecordCount, `${label}: expected record count`);
  assertNonNegativeSafeInteger(value.cropCount, `${label}: crop count`);
  assertNonNegativeSafeInteger(value.receiptCount, `${label}: receipt count`);
  assertSha256(value.planSha256, `${label}: capacity plan SHA`);
  assertSha256(value.sourceIdentitySha256, `${label}: source identity SHA`);
  assertSha256(value.sourceSnapshotSha256, `${label}: source snapshot SHA`);
  assert.ok(Array.isArray(value.groupKeys) && value.groupKeys.length > 0,
    `${label}: execution-group ownership has no group keys`);
  assert.equal(new Set(value.groupKeys).size, value.groupKeys.length,
    `${label}: execution-group ownership repeats a group key`);
  for (const groupKey of value.groupKeys) {
    assert.ok(typeof groupKey === "string" && groupKey.length > 0 &&
      groupKey.split("\0").length === 4,
    `${label}: malformed execution group key`);
  }
}

export function buildCaliforniaSignatureExecutionGroupOwnershipManifest(options: {
  capacityPlan: CaliforniaSignatureFinalCompositorPartitionPlan;
  executionGroups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureExecutionGroupOwnershipManifest {
  assertRecord(options.capacityPlan,
    "California signature execution ownership capacity plan");
  assertExactKeys(options.capacityPlan as unknown as Record<string, unknown>, [
    "packages",
    "planSha256",
    "projectNames",
    "schemaVersion",
    "slotCount",
    "sourceIdentitySha256",
    "terminalArtifactTarget"
  ], "California signature execution ownership capacity plan");
  assertSha256(options.sourceSnapshotSha256,
    "California signature execution ownership source snapshot");
  assert.equal(options.sourceIdentity.sourceSnapshotSha256, options.sourceSnapshotSha256,
    "California signature execution ownership mixes the frozen source snapshot");
  assert.equal(options.sourceIdentity.unreviewedDiagnostic, false,
    "California signature execution ownership rejects an unreviewed source identity");
  const sourceIdentitySha256 = sha256(capacityStableJson(options.sourceIdentity));
  assert.equal(options.capacityPlan.sourceIdentitySha256, sourceIdentitySha256,
    "California signature capacity plan cites another source identity");
  const { planSha256, ...planBase } = options.capacityPlan;
  assertSha256(planSha256, "California signature execution ownership capacity plan SHA");
  assert.equal(planSha256, sha256(capacityStableJson(planBase)),
    "California signature execution ownership capacity plan digest drifted");
  assert.equal(options.capacityPlan.schemaVersion, 1,
    "California signature execution ownership capacity plan schema drifted");
  assert.deepEqual(options.capacityPlan.projectNames,
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
  "California signature execution ownership projects drifted");
  assert.equal(options.capacityPlan.terminalArtifactTarget, 102,
    "California signature execution ownership must preserve 102 terminal artifacts");
  assert.equal(options.capacityPlan.slotCount, 51,
    "California signature execution ownership must preserve 51 package slots");
  assert.equal(options.capacityPlan.packages.length, 51,
    "California signature execution ownership must publish 51 package slots");

  const groupSummary = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
    options.executionGroups.map((group) => ({ ...group, weightMs: 1 }))
  );
  assert.equal(groupSummary.groupsSha256, options.sourceIdentity.groupsSha256,
    "California signature execution groups differ from the exact source identity");
  assert.equal(groupSummary.groupCount, options.sourceIdentity.groupCount,
    "California signature execution group count differs from source identity");
  assert.equal(groupSummary.evidenceRecordCount, options.sourceIdentity.evidenceRecordCount,
    "California signature execution record count differs from source identity");
  assert.equal(groupSummary.cropCount, options.sourceIdentity.cropCount,
    "California signature execution crop count differs from source identity");
  assert.equal(groupSummary.receiptCount, options.sourceIdentity.receiptCount,
    "California signature execution receipt count differs from source identity");
  assert.deepEqual(groupSummary.projects, options.sourceIdentity.projects,
    "California signature execution project counters differ from source identity");

  const groupsByKey = new Map(options.executionGroups.map((group) => [group.groupKey, group]));
  assert.equal(groupsByKey.size, options.executionGroups.length,
    "California signature execution ownership source groups repeat a key");
  const packageIds = new Set<string>();
  const plannedByProject = new Map<string, string[]>(
    CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => [projectName, []])
  );
  const packages = options.capacityPlan.packages.map((workPackage, slotIndex) => {
    assertRecord(workPackage,
      `California signature execution ownership package slot ${slotIndex}`);
    assertExactKeys(workPackage as unknown as Record<string, unknown>, [
      "packageId",
      "projects",
      "slotIndex"
    ], `California signature execution ownership package slot ${slotIndex}`);
    assert.equal(workPackage.slotIndex, slotIndex,
      "California signature execution ownership package slots are missing or retrograde");
    assertLogicalSegment(workPackage.packageId,
      "California signature execution ownership packageId");
    assert.equal(
      workPackage.packageId,
      `signature-final-compositor-capacity-${String(slotIndex + 1).padStart(3, "0")}`,
      "California signature execution ownership canonical packageId drifted"
    );
    assert.ok(!packageIds.has(workPackage.packageId),
      `California signature execution ownership repeats package ${workPackage.packageId}`);
    packageIds.add(workPackage.packageId);
    assert.equal(workPackage.projects.length, CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.length,
      `${workPackage.packageId}: execution ownership project slice count drifted`);
    const projects = CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName, projectIndex) => {
      const slice = workPackage.projects[projectIndex];
      assert.ok(slice, `${workPackage.packageId}/${projectName}: project slice is missing`);
      assertRecord(slice,
        `${workPackage.packageId}/${projectName}: execution ownership project slice`);
      assertExactKeys(slice as unknown as Record<string, unknown>, [
        "groupKeys",
        "projectName",
        "weightMs"
      ], `${workPackage.packageId}/${projectName}: execution ownership project slice`);
      assert.equal(slice.projectName, projectName,
        `${workPackage.packageId}: execution ownership project order drifted`);
      assertPositiveSafeInteger(slice.weightMs,
        `${workPackage.packageId}/${projectName}: diagnostic group weight`);
      assert.ok(slice.groupKeys.length > 0,
        `${workPackage.packageId}/${projectName}: execution ownership slice is empty`);
      assert.equal(new Set(slice.groupKeys).size, slice.groupKeys.length,
        `${workPackage.packageId}/${projectName}: execution ownership slice repeats a group`);
      let expectedRecordCount = 0;
      let cropCount = 0;
      let receiptCount = 0;
      const benchIds: string[] = [];
      const seenBenches = new Set<string>();
      for (const groupKey of slice.groupKeys) {
        const group = groupsByKey.get(groupKey);
        assert.ok(group,
          `${workPackage.packageId}/${projectName}: capacity plan cites unknown group ${groupKey}`);
        assert.equal(group.projectName, projectName,
          `${workPackage.packageId}/${groupKey}: capacity plan swaps group projects`);
        assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
          `${workPackage.packageId}/${groupKey}: capacity plan group identity drifted`);
        expectedRecordCount += group.expectedRecordCount;
        cropCount += group.cropCount;
        receiptCount += group.receiptCount;
        assert.ok(Number.isSafeInteger(expectedRecordCount) && Number.isSafeInteger(cropCount) &&
          Number.isSafeInteger(receiptCount),
        `${workPackage.packageId}/${projectName}: execution ownership counters overflowed`);
        if (!seenBenches.has(group.benchId)) {
          seenBenches.add(group.benchId);
          benchIds.push(group.benchId);
        }
      }
      plannedByProject.get(projectName)!.push(...slice.groupKeys);
      return {
        benchIds,
        cropCount,
        expectedRecordCount,
        groupKeys: [...slice.groupKeys],
        projectName,
        receiptCount
      };
    });
    return { packageId: workPackage.packageId, projects, slotIndex };
  });

  for (const projectName of CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS) {
    const expected = options.executionGroups
      .filter((group) => group.projectName === projectName)
      .map((group) => group.groupKey);
    const actual = plannedByProject.get(projectName)!;
    assert.deepEqual(actual, expected,
      `${projectName}: capacity packages are not the exact ordered source group union`);
    assert.equal(new Set(actual).size, actual.length,
      `${projectName}: capacity packages repeat an execution group`);
  }
  return markCaliforniaSignatureExecutionGroupOwnershipValidated({
    capacityPlanSha256: planSha256,
    cropCount: options.sourceIdentity.cropCount,
    evidenceRecordCount: options.sourceIdentity.evidenceRecordCount,
    formalExecutionAuthorized: false,
    groupCount: options.sourceIdentity.groupCount,
    packages,
    receiptCount: options.sourceIdentity.receiptCount,
    schemaVersion: CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
    sourceIdentitySha256,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "diagnostic-capacity-partition"
  });
}

function assertSha256(value: string, label: string) {
  assert.match(value, SHA256_PATTERN, `${label}: expected one exact lowercase SHA-256`);
  return value;
}

function exactStringSet(expectedInput: readonly string[], actualInput: readonly string[], label: string) {
  assert.equal(new Set(expectedInput).size, expectedInput.length, `${label}: duplicate expected values`);
  assert.equal(new Set(actualInput).size, actualInput.length, `${label}: duplicate actual values`);
  assert.deepEqual([...actualInput].sort(), [...expectedInput].sort(), `${label}: exact values drifted`);
}

export function buildCaliforniaSignatureArtifactValidationContext(options: {
  expectedBenchIds: readonly string[];
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  manifest: CaliforniaSignatureSourceManifest;
  projectName?: string;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}): CaliforniaSignatureArtifactValidationContext {
  assert.ok(options.expectedBenchIds.length > 0,
    "California signature artifact validation requires at least one expected bench");
  assert.equal(new Set(options.expectedBenchIds).size, options.expectedBenchIds.length,
    "California signature artifact validation repeats an expected bench");
  const fullBenches = new Map<string, CaliforniaSignatureSourceManifest["benches"][number]>(
    options.manifest.benches.map((bench) => [bench.benchId, bench])
  );
  const benches = options.expectedBenchIds.map((benchId) => {
    const bench = fullBenches.get(benchId);
    assert.ok(bench, `California signature artifact validation cites unknown bench ${benchId}`);
    return bench;
  });
  const benchIds = new Set(options.expectedBenchIds);
  const states = options.sourceEvidenceOracle.states.filter((state) => benchIds.has(state.benchId));
  const evidenceRows = [...iterateCaliforniaSignatureSourceEvidenceOracleRows({
    benchIds: options.expectedBenchIds,
    manifest: options.manifest,
    oracle: options.sourceEvidenceOracle
  })];
  assert.ok(evidenceRows.length > 0,
    "California signature package source oracle contains no expected evidence rows");
  const combinationRows = evidenceRows.filter((row) => row.rowKind === "combination");
  const combinationCountsByState = new Map<string, number>();
  for (const row of combinationRows) {
    const stateKey = stableJson({ benchId: row.benchId, branchPath: row.branchPath, stepKey: row.stepKey });
    combinationCountsByState.set(stateKey, (combinationCountsByState.get(stateKey) ?? 0) + 1);
  }
  let pairwisePeak = { rowCount: 0, stateKey: "" };
  for (const state of states) {
    const rowCount = combinationCountsByState.get(state.key) ?? 0;
    if (rowCount > pairwisePeak.rowCount) pairwisePeak = { rowCount, stateKey: state.key };
  }
  const numericOccurrences = states.flatMap((state) => state.controls.filter(
    (control) => control.numericMidpoint !== null
  ));
  const numericUnavailable = numericOccurrences.filter(
    (control) => control.numericMidpoint?.status === "unavailable"
  );
  const numericUnavailableContracts = new Set(numericUnavailable.map((control) => stableJson({
    benchId: control.benchId,
    instanceKey: control.instanceKey,
    numericMidpoint: control.numericMidpoint,
    sourceSiteKey: control.sourceSiteKey
  })));
  const numericUnavailableSites = new Set(numericUnavailable.map(
    (control) => `${control.benchId}\0${control.sourceSiteKey}`
  ));
  const sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle = {
    ...options.sourceEvidenceOracle,
    counts: {
      authoredStates: states.filter((state) => state.kind === "authored").length,
      branchStates: states.filter((state) => state.kind === "branch").length,
      canvasReceiptRows: evidenceRows.filter((row) =>
        (row.canvasSurface?.requiredPhases.length ?? 0) > 0
      ).length,
      combinationOccurrences: combinationRows.length,
      controlOccurrences: states.reduce((sum, state) => sum + state.controls.length, 0),
      endpointOccurrences: states.reduce((sum, state) => sum +
        state.controls.reduce((controlSum, control) => controlSum + control.activeEndpoints.length, 0), 0),
      evidenceControlRows: evidenceRows.filter((row) => row.rowKind === "control").length,
      evidenceCombinationRows: combinationRows.length,
      evidenceEndpointRows: evidenceRows.filter((row) => row.rowKind === "endpoint").length,
      evidenceRows: evidenceRows.length,
      evidenceStateRows: evidenceRows.filter((row) => row.rowKind === "authored-state").length,
      numericAvailableOccurrences: numericOccurrences.length - numericUnavailable.length,
      numericOccurrences: numericOccurrences.length,
      numericUnavailableContracts: numericUnavailableContracts.size,
      numericUnavailableOccurrences: numericUnavailable.length,
      numericUnavailableSites: numericUnavailableSites.size,
      reachableStates: states.length
    },
    evidenceKeysSha256: sha256(evidenceRows.map((row) => row.key).sort().join("\n")),
    pairwisePeak,
    states
  };
  const manifest: CaliforniaSignatureSourceManifest = {
    ...options.manifest,
    benches,
    counts: {
      benches: benches.length,
      controlSites: benches.reduce((sum, bench) => sum + bench.controlSites.length, 0),
      exactMultiplicitySites: benches.reduce((sum, bench) =>
        sum + bench.controlSites.filter((site) => site.multiplicityIsExact).length, 0),
      lessonChoices: benches.reduce((sum, bench) =>
        sum + bench.lessonSteps.reduce((stepSum, step) => stepSum + step.choiceCount, 0), 0),
      lessonSteps: benches.reduce((sum, bench) => sum + bench.lessonSteps.length, 0),
      unresolvedInteractions: benches.reduce((sum, bench) => sum + bench.unresolvedInteractions.length, 0)
    }
  };
  const routes = options.externalExpectations.routes.filter((route) => benchIds.has(route.benchId));
  exactStringSet(options.expectedBenchIds, routes.map((route) => route.benchId),
    "California signature package external route ownership");
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    "California signature artifact validation context");
  if (executionGroupOwnership) {
    assert.ok(options.projectName && CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
      options.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
    ), "California signature group-owned validation context requires one formal project");
    const projectName = options.projectName as
      typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
    const selectedGroupKeys = new Set(executionGroupOwnership.groupKeys);
    const sourceGroups = buildCaliforniaSignatureSourceExecutionGroups({
      benchIds: options.expectedBenchIds,
      manifest: options.manifest,
      oracle: options.sourceEvidenceOracle,
      projectName
    }).map((group) => ({
      ...group,
      groupKey: californiaSignatureFinalCompositorGroupKey({ ...group, projectName })
    })).filter((group) => selectedGroupKeys.has(group.groupKey));
    assert.deepEqual(sourceGroups.map((group) => group.groupKey),
      executionGroupOwnership.groupKeys,
    "California signature validation context group keys differ from exact source order");
    assert.equal(sourceGroups.reduce((sum, group) => sum + group.expectedRecordCount, 0),
      executionGroupOwnership.expectedRecordCount,
    "California signature validation context record count differs from exact source groups");
    assert.equal(sourceGroups.length, executionGroupOwnership.groupKeys.length,
      "California signature validation context has missing or duplicate source groups");
  }
  return {
    expectedBenchIds: [...options.expectedBenchIds],
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    externalExpectations: { ...options.externalExpectations, routes },
    manifest,
    sourceEvidenceOracle
  };
}

function validateCaliforniaSignatureOfficialEvidence(options: {
  context: CaliforniaSignatureArtifactValidationContext;
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  label: string;
}) {
  assert.equal(options.context.externalExpectations.expectedOrigin, options.identity.origin,
    `${options.label}: validation origin is not bound to the artifact run`);
  assert.equal(options.context.externalExpectations.expectedRuntimeRunId, options.identity.runtimeRunId,
    `${options.label}: validation runtime is not bound to the artifact run`);
  assert.equal(options.context.manifest.componentSourceSha256, options.identity.componentSourceSha256,
    `${options.label}: validation component source is not bound to the artifact run`);
  assert.equal(options.context.manifest.blueprintSha256, options.identity.controlBlueprintSha256,
    `${options.label}: validation control blueprint is not bound to the artifact run`);
  exactStringSet(
    options.context.expectedBenchIds,
    [...new Set(options.evidence.map((record) => record.benchId))],
    `${options.label}: package evidence benches`
  );
  validateCaliforniaSignatureEvidenceRecords({
    evidence: options.evidence,
    externalExpectations: options.context.externalExpectations,
    manifest: options.context.manifest,
    sourceEvidenceOracle: options.context.sourceEvidenceOracle
  });
  return snapshotCaliforniaSignatureExhaustiveEvidence(options.evidence);
}

function californiaSignatureEvidenceSnapshotFromStream(
  context: CaliforniaSignatureArtifactValidationContext,
  stream: CaliforniaSignatureEvidenceStreamManifest
): CaliforniaSignatureEvidenceSnapshot {
  return {
    blueprintSha256: context.manifest.blueprintSha256,
    keyCount: stream.recordCount,
    keysSha256: stream.orderedEvidenceKeySha256,
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
  };
}

function* iterateCaliforniaSignatureOwnedExpandedSourceEvidence(options: {
  context: CaliforniaSignatureArtifactValidationContext;
  projectName: typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
}) {
  const ownership = options.context.executionGroupOwnership;
  const groupKeys = ownership ? new Set(ownership.groupKeys) : null;
  let ownedGroupCount = 0;
  let previousGroupKey: string | null = null;
  for (const expectation of iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    axisIds: californiaSignatureAxisIdsForProject(options.projectName),
    benchIds: options.context.expectedBenchIds,
    manifest: options.context.manifest,
    oracle: options.context.sourceEvidenceOracle
  })) {
    const groupKey = californiaSignatureFinalCompositorGroupKey({
      axisId: expectation.axisId,
      benchId: expectation.benchId,
      phase: expectation.phase,
      projectName: options.projectName
    });
    if (groupKeys && !groupKeys.has(groupKey)) continue;
    if (groupKey !== previousGroupKey) {
      ownedGroupCount += 1;
      previousGroupKey = groupKey;
    }
    yield expectation;
  }
  if (ownership) {
    assert.equal(ownedGroupCount, ownership.groupKeys.length,
      "California signature owned source iterator lost an execution group");
  }
}

async function validateCaliforniaSignatureOfficialEvidenceStream(options: {
  artifact: CaliforniaSignatureOfficialArtifact;
  context: CaliforniaSignatureArtifactValidationContext;
  identity: CaliforniaSignatureArtifactRunIdentity;
  label: string;
  runDirectory: string;
}) {
  assert.equal(options.context.externalExpectations.expectedOrigin, options.identity.origin,
    `${options.label}: validation origin is not bound to the artifact run`);
  assert.equal(options.context.externalExpectations.expectedRuntimeRunId, options.identity.runtimeRunId,
    `${options.label}: validation runtime is not bound to the artifact run`);
  assert.equal(options.context.manifest.componentSourceSha256, options.identity.componentSourceSha256,
    `${options.label}: validation component source is not bound to the artifact run`);
  assert.equal(options.context.manifest.blueprintSha256, options.identity.controlBlueprintSha256,
    `${options.label}: validation control blueprint is not bound to the artifact run`);
  assert.ok(CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
    options.artifact.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
  ), `${options.label}: unsupported project ${options.artifact.projectName}`);
  const projectName = options.artifact.projectName as
    typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
  assert.deepEqual(options.artifact.executionGroupOwnership,
    options.context.executionGroupOwnership,
  `${options.label}: artifact/validation execution-group ownership drifted`);
  assertExecutionGroupOwnership(options.artifact.executionGroupOwnership,
    `${options.label}: official artifact execution-group ownership`);
  if (options.artifact.executionGroupOwnership) {
    assert.equal(options.artifact.executionGroupOwnership.sourceSnapshotSha256,
      options.identity.sourceSnapshotSha256,
    `${options.label}: execution-group ownership mixes the artifact source snapshot`);
  }
  assert.equal(options.artifact.evidenceStreamOwnershipSha256,
    evidenceStreamOwnershipSha256({
      evidenceStream: options.artifact.evidenceStream,
      ownership: options.artifact.executionGroupOwnership
    }),
  `${options.label}: evidence stream is not bound to execution-group ownership`);
  if (californiaSignatureBoundedFixtureStreamSha256.has(
    sha256(stableJson(options.artifact.evidenceStream))
  )) {
    assert.equal(options.artifact.executionGroupOwnership, null,
      `${options.label}: bounded legacy fixture cannot impersonate group-plan ownership`);
    const records: CaliforniaSignatureExactEvidenceRecord[] = [];
    for await (const rawRecord of readCaliforniaSignatureEvidenceStream({
      manifest: options.artifact.evidenceStream,
      orderKey(record) {
        assertCaliforniaSignatureExactEvidenceRecordSchema(record, `${options.label}: fixture order`);
        return californiaSignatureExactEvidenceOrderKey({
          manifest: options.context.manifest,
          record
        });
      },
      runDirectory: options.runDirectory
    })) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(rawRecord, `${options.label}: fixture record`);
      records.push(rawRecord);
      assert.ok(records.length <= 4_096,
        `${options.label}: bounded fixture record cap exceeded`);
    }
    validateCaliforniaSignatureEvidenceRecords({
      evidence: records,
      externalExpectations: options.context.externalExpectations,
      manifest: options.context.manifest
    });
    exactStringSet(
      options.context.expectedBenchIds,
      [...new Set(records.map((record) => record.benchId))],
      `${options.label}: fixture package evidence benches`
    );
    const snapshot = californiaSignatureEvidenceSnapshotFromStream(
      options.context,
      options.artifact.evidenceStream
    );
    assert.deepEqual(options.artifact.evidenceSnapshot, snapshot,
      `${options.label}: fixture snapshot drifted`);
    return snapshot;
  }
  const expected = iterateCaliforniaSignatureOwnedExpandedSourceEvidence({
    context: options.context,
    projectName
  });
  const observedBenches = new Set<string>();
  const observedGroupKeys = new Set<string>();
  const observedReceiptIds = new Set<string>();
  let observedCropCount = 0;
  let expectedEntry = expected.next();
  let recordCount = 0;
  let validationBatch: CaliforniaSignatureExactEvidenceRecord[] = [];
  let validationBatchBytes = 0;
  const flushValidationBatch = () => {
    if (validationBatch.length === 0) return;
    validateCaliforniaSignatureEvidenceRecords({
      evidence: validationBatch,
      externalExpectations: options.context.externalExpectations,
      manifest: options.context.manifest
    });
    validationBatch = [];
    validationBatchBytes = 0;
  };
  for await (const rawRecord of readCaliforniaSignatureEvidenceStream({
    manifest: options.artifact.evidenceStream,
    orderKey(record) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(
        record,
        `${options.label}: stream order record`
      );
      return californiaSignatureExactEvidenceOrderKey({
        manifest: options.context.manifest,
        record
      });
    },
    runDirectory: options.runDirectory
  })) {
    assertCaliforniaSignatureExactEvidenceRecordSchema(
      rawRecord,
      `${options.label}: record ${recordCount}`
    );
    const record = rawRecord;
    const recordGroupKey = californiaSignatureFinalCompositorGroupKey({
      axisId: record.axisId,
      benchId: record.benchId,
      phase: record.phase,
      projectName
    });
    if (options.artifact.executionGroupOwnership) {
      assert.ok(options.artifact.executionGroupOwnership.groupKeys.includes(recordGroupKey),
        `${options.label}: record escaped plan-owned execution groups`);
    }
    observedGroupKeys.add(recordGroupKey);
    assert.equal(expectedEntry.done, false,
      `${options.label}: actual stream contains an extra record at ${record.key}`);
    const sourceExpectation = expectedEntry.value!;
    const orderKey = californiaSignatureExactEvidenceOrderKey({
      manifest: options.context.manifest,
      record
    });
    assert.equal(orderKey, sourceExpectation.orderKey,
      `${options.label}: actual/source semantic order key drifted`);
    assert.equal(
      californiaSignatureExpandedOracleKeyFromRecord({
        manifest: options.context.manifest,
        record
      }),
      sourceExpectation.key,
      `${options.label}: actual/source expanded identity is not exact`
    );
    assert.equal(record.benchId, sourceExpectation.benchId,
      `${options.label}: source expectation bench drifted`);
    const requiresCanvas = sourceExpectation.canvasSurface?.requiredPhases.includes(record.phase) ?? false;
    assert.equal(record.canvasGraphicsEvidence !== null, requiresCanvas,
      `${options.label}/${record.benchId}/${record.stepKey}: source-required Canvas receipt drifted`);
    if (requiresCanvas) {
      assert.ok(sourceExpectation.canvasSurface && record.canvasGraphicsEvidence,
        `${options.label}: source-required Canvas surface disappeared`);
      assert.equal(record.canvasGraphicsEvidence.surfaceKey, sourceExpectation.canvasSurface.surfaceKey,
        `${options.label}: Canvas surface identity drifted`);
      assert.deepEqual(
        record.canvasGraphicsEvidence.canvases.map((canvas) => canvas.bindingKey).sort(),
        [...sourceExpectation.canvasSurface.bindingKeys].sort(),
        `${options.label}: Canvas binding inventory drifted`
      );
      assert.equal(record.canvasGraphicsEvidence.canvases.length,
        sourceExpectation.canvasSurface.canvasCount,
      `${options.label}: Canvas count drifted`);
      assert.equal(observedReceiptIds.has(record.canvasGraphicsEvidence.receiptId), false,
        `${options.label}: duplicate one-shot Canvas receipt ${record.canvasGraphicsEvidence.receiptId}`);
      observedReceiptIds.add(record.canvasGraphicsEvidence.receiptId);
      observedCropCount += record.canvasGraphicsEvidence.canvases.length;
    }
    observedBenches.add(record.benchId);
    const canonicalBytes = Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8");
    if (validationBatch.length > 0 &&
        (validationBatch.length >= 128 || validationBatchBytes + canonicalBytes > 16 * 1024 * 1024)) {
      flushValidationBatch();
    }
    validationBatch.push(record);
    validationBatchBytes += canonicalBytes;
    recordCount += 1;
    expectedEntry = expected.next();
  }
  flushValidationBatch();
  assert.equal(expectedEntry.done, true,
    `${options.label}: actual stream ended before the complete source oracle`);
  assert.equal(recordCount, options.artifact.evidenceStream.recordCount,
    `${options.label}: streamed record count drifted`);
  if (options.artifact.executionGroupOwnership) {
    assert.equal(recordCount, options.artifact.executionGroupOwnership.expectedRecordCount,
      `${options.label}: plan-owned record count drifted`);
    assert.deepEqual([...observedGroupKeys],
      options.artifact.executionGroupOwnership.groupKeys,
    `${options.label}: observed execution groups differ from plan ownership`);
    assert.equal(observedReceiptIds.size,
      options.artifact.executionGroupOwnership.receiptCount,
    `${options.label}: plan-owned Canvas receipt count drifted`);
    assert.equal(observedCropCount, options.artifact.executionGroupOwnership.cropCount,
      `${options.label}: plan-owned final-compositor crop count drifted`);
  }
  exactStringSet(
    options.context.expectedBenchIds,
    [...observedBenches],
    `${options.label}: package evidence benches`
  );
  const snapshot = californiaSignatureEvidenceSnapshotFromStream(
    options.context,
    options.artifact.evidenceStream
  );
  assert.deepEqual(options.artifact.evidenceSnapshot, snapshot,
    `${options.label}: evidence snapshot does not bind the complete stream`);
  return snapshot;
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label}: expected one object`);
}

function assertString(value: unknown, message: string): asserts value is string {
  assert.equal(typeof value, "string", message);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: exact schema drifted`);
}

function assertLogicalSegment(value: string, label: string) {
  assert.match(value, LOGICAL_SEGMENT_PATTERN, `${label}: unsafe or empty logical identifier`);
  return value;
}

function assertHighEntropyId(value: string, label: string) {
  assert.match(value, ID_PATTERN, `${label}: expected one externally generated high-entropy ID`);
  return value;
}

function canonicalOrigin(value: string) {
  const trimmed = value.trim();
  assert.ok(trimmed, "California signature artifact origin is required");
  const parsed = new URL(trimmed);
  assert.ok(parsed.protocol === "http:" || parsed.protocol === "https:",
    "California signature artifact origin must use HTTP(S)");
  assert.equal(parsed.username, "", "California signature artifact origin must not contain credentials");
  assert.equal(parsed.password, "", "California signature artifact origin must not contain credentials");
  assert.equal(parsed.pathname, "/", "California signature artifact origin must not contain a path");
  assert.equal(parsed.search, "", "California signature artifact origin must not contain a query");
  assert.equal(parsed.hash, "", "California signature artifact origin must not contain a fragment");
  assert.equal(trimmed.replace(/\/$/, ""), parsed.origin,
    "California signature artifact origin must be a canonical exact origin");
  return parsed.origin;
}

function assertBuildId(value: string) {
  const trimmed = value.trim();
  assert.ok(trimmed.length >= 1 && trimmed.length <= 256, "California signature buildId is required");
  assert.doesNotMatch(trimmed, /[\u0000-\u001f\u007f/\\]/,
    "California signature buildId contains unsafe characters");
  return trimmed;
}

function cloneMarkerIdentities(markers: {
  canvas: CaliforniaCanvasGraphicsNoDeployMarker;
  control: CaliforniaSignatureControlQaNoDeployMarker;
}) {
  const markerIdentities: CaliforniaSignatureRuntimeMarkerIdentities = {
    canvas: structuredClone(markers.canvas),
    control: structuredClone(markers.control)
  };
  assert.equal(markerIdentities.control.productSourceSha256, markerIdentities.canvas.productSourceSha256,
    "control and Canvas markers disagree on the frozen product source identity");
  assert.match(markerIdentities.control.productSourceSha256, SHA256_PATTERN);
  assert.match(markerIdentities.control.blueprintSha256, SHA256_PATTERN);
  assert.match(markerIdentities.canvas.sourceContractSha256, SHA256_PATTERN);
  return markerIdentities;
}

export function buildCaliforniaSignatureArtifactRunIdentity(options: {
  buildId: string;
  markers: {
    canvas: CaliforniaCanvasGraphicsNoDeployMarker;
    control: CaliforniaSignatureControlQaNoDeployMarker;
  };
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureArtifactRunIdentity {
  const markerIdentities = cloneMarkerIdentities(options.markers);
  return {
    buildId: assertBuildId(options.buildId),
    componentSourceSha256: markerIdentities.control.productSourceSha256,
    controlBlueprintSha256: markerIdentities.control.blueprintSha256,
    markerIdentities,
    markerIdentitiesSha256: sha256(stableJson(markerIdentities)),
    origin: canonicalOrigin(options.origin),
    runId: assertHighEntropyId(options.runId.trim(), "California signature exhaustive runId"),
    runtimeRunId: assertHighEntropyId(
      options.runtimeRunId.trim(),
      "California signature Canvas runtimeRunId"
    ),
    sourceSnapshotSha256: assertSha256(
      options.sourceSnapshotSha256,
      "California signature frozen source snapshot"
    )
  };
}

export function californiaSignatureArtifactRunIdentityFromEnvironment(options: {
  actualOrigin: string;
  markers: {
    canvas: CaliforniaCanvasGraphicsNoDeployMarker;
    control: CaliforniaSignatureControlQaNoDeployMarker;
  };
  runtimeRunId: string;
}) {
  const expectedOrigin = process.env.CA_SIGNATURE_EXHAUSTIVE_ORIGIN?.trim() ?? "";
  assert.ok(expectedOrigin, "CA_SIGNATURE_EXHAUSTIVE_ORIGIN is required");
  assert.equal(canonicalOrigin(options.actualOrigin), canonicalOrigin(expectedOrigin),
    "browser baseURL does not match CA_SIGNATURE_EXHAUSTIVE_ORIGIN");
  return buildCaliforniaSignatureArtifactRunIdentity({
    buildId: process.env.CA_SIGNATURE_EXHAUSTIVE_BUILD_ID?.trim() ?? "",
    markers: options.markers,
    origin: expectedOrigin,
    runId: process.env.CA_SIGNATURE_EXHAUSTIVE_RUN_ID?.trim() ?? "",
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: process.env.CA_VIZ_SOURCE_SNAPSHOT_SHA256?.trim() ?? ""
  });
}

export function californiaSignatureArtifactRunDirectory(ledgerRoot: string, runId: string) {
  assertHighEntropyId(runId, "California signature exhaustive runId");
  const root = path.resolve(ledgerRoot);
  const runDirectory = path.resolve(root, runId);
  const relative = path.relative(root, runDirectory);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "California signature run directory escapes its ledger root");
  return runDirectory;
}

function californiaSignaturePublicationLockDirectory(ledgerRoot: string, runId: string) {
  assertHighEntropyId(runId, "California signature exhaustive runId");
  return path.join(path.resolve(ledgerRoot), `.${runId}.publication-lock`);
}

async function withCaliforniaSignaturePublicationLock<T>(options: {
  ledgerRoot: string;
  runId: string;
  task(): Promise<T>;
}): Promise<T> {
  const ledgerRoot = path.resolve(options.ledgerRoot);
  await mkdir(ledgerRoot, { recursive: true });
  const rootIdentity = await lstat(ledgerRoot);
  assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
    "California signature publication lock requires a regular non-symlink ledger root");
  const lockDirectory = californiaSignaturePublicationLockDirectory(ledgerRoot, options.runId);
  let acquiredIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await mkdir(lockDirectory);
      acquiredIdentity = await lstat(lockDirectory);
      assert.ok(acquiredIdentity.isDirectory() && !acquiredIdentity.isSymbolicLink(),
        "California signature publication lock must be one regular non-symlink directory");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 399) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    return await options.task();
  } finally {
    assert.ok(acquiredIdentity, "California signature publication lock identity was not captured");
    const currentIdentity = await lstat(lockDirectory);
    assert.ok(currentIdentity.isDirectory() && !currentIdentity.isSymbolicLink(),
      "California signature publication lock changed type before cleanup");
    assert.equal(currentIdentity.dev, acquiredIdentity.dev,
      "California signature publication lock ownership changed device before cleanup");
    assert.equal(currentIdentity.ino, acquiredIdentity.ino,
      "California signature publication lock ownership changed inode before cleanup");
    await rmdir(lockDirectory);
  }
}

async function assertCaliforniaSignatureRunIsUnsealed(runDirectory: string) {
  try {
    await lstat(path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error("California signature run is sealed; late official publication is forbidden");
}

async function assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory: string) {
  await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
  try {
    await lstat(path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    "California signature producer already reported process success; later artifact publication is forbidden"
  );
}

function exactRunManifest(identity: CaliforniaSignatureArtifactRunIdentity): CaliforniaSignatureRunManifest {
  return {
    ...structuredClone(identity),
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION as
      typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    officialArtifactSuffix: CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX,
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    status: "open"
  };
}

function assertRunIdentity(actual: CaliforniaSignatureArtifactRunIdentity, expected: CaliforniaSignatureArtifactRunIdentity,
  label: string) {
  for (const field of RUN_IDENTITY_KEYS) {
    assert.deepEqual(actual[field], expected[field], `${label}: mixed or stale ${field}`);
  }
  assert.equal(actual.markerIdentitiesSha256, sha256(stableJson(actual.markerIdentities)),
    `${label}: markerIdentitiesSha256 does not bind exact marker contents`);
  assert.equal(actual.componentSourceSha256, actual.markerIdentities.control.productSourceSha256,
    `${label}: component source identity does not match control marker`);
  assert.equal(actual.controlBlueprintSha256, actual.markerIdentities.control.blueprintSha256,
    `${label}: control blueprint identity does not match control marker`);
  assert.equal(actual.markerIdentities.canvas.productSourceSha256, actual.componentSourceSha256,
    `${label}: Canvas marker source identity drifted`);
}

function assertRunManifest(
  manifest: Record<string, unknown>,
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity
) {
  assertExactKeys(manifest, RUN_MANIFEST_KEYS, "California signature run manifest");
  assert.equal(manifest.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature run manifest lifecycle schema drifted");
  assert.equal(manifest.officialArtifactSuffix, CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX,
    "California signature run manifest official suffix drifted");
  assert.deepEqual(manifest.requiredProjects, [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    "California signature run manifest required projects drifted");
  assert.equal(manifest.status, "open", "California signature run manifest is not open");
  assertRunIdentity(manifest as unknown as CaliforniaSignatureArtifactRunIdentity, expectedIdentity,
    "California signature run manifest");
}

function assertProducerSuccess(options: {
  expectedArtifactsSha256: string;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  producer: CaliforniaSignatureReadJson;
}) {
  const value = options.producer.value;
  assertExactKeys(value, PRODUCER_SUCCESS_KEYS, "California signature producer process-success receipt");
  assertArtifactByteIdentities(
    value.artifacts,
    "California signature producer process-success receipt"
  );
  assertEvidenceReservationIdentities(
    value.evidenceReservations,
    "California signature producer process-success receipt"
  );
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature producer process-success lifecycle schema drifted");
  assert.equal(value.status, "producer-succeeded",
    "California signature producer process-success receipt is not terminal");
  assert.ok(typeof value.publishedAt === "string" && !Number.isNaN(Date.parse(value.publishedAt)),
    "California signature producer process-success timestamp is invalid");
  assert.equal(value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California signature producer process-success expected matrix digest drifted");
  assertSha256(value.producerReportSha256 as string,
    "California signature producer Playwright report");
  assertRunIdentity(
    value as unknown as CaliforniaSignatureArtifactRunIdentity,
    options.expectedIdentity,
    "California signature producer process-success receipt"
  );
}

async function assertRunSeal(options: {
  entries: readonly { name: string }[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  manifestSha256: string;
  producer: CaliforniaSignatureReadJson;
  runDirectory: string;
  seal: CaliforniaSignatureReadJson;
  sealReceipt: CaliforniaSignatureSealReceipt;
  loadedArtifactByteIdentities: readonly CaliforniaSignatureArtifactByteIdentity[];
}) {
  assert.equal(options.sealReceipt.fileName, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
    "California signature external seal receipt names the wrong file");
  assertSha256(options.sealReceipt.sha256, "California signature external seal receipt");
  assert.equal(options.seal.sha256, options.sealReceipt.sha256,
    "California signature run seal no longer matches its external receipt");
  const value = options.seal.value;
  assertExactKeys(value, RUN_SEAL_KEYS, "California signature run seal");
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature run seal lifecycle schema drifted");
  assert.equal(value.status, "sealed", "California signature run seal is not terminal");
  assert.ok(typeof value.sealedAt === "string" && !Number.isNaN(Date.parse(value.sealedAt)),
    "California signature run seal timestamp is invalid");
  assertRunIdentity(value as unknown as CaliforniaSignatureArtifactRunIdentity,
    options.expectedIdentity, "California signature run seal");
  assert.equal(value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California signature run seal expected matrix digest drifted");
  assert.equal(value.manifestSha256, options.manifestSha256,
    "California signature run seal does not bind the exact manifest bytes");
  assert.equal(value.producerSuccessSha256, options.producer.sha256,
    "California signature run seal does not bind producer process-success bytes");
  assert.equal(value.producerReportSha256, options.producer.value.producerReportSha256,
    "California signature run seal does not bind the verified Playwright report");
  assert.ok(Array.isArray(value.artifacts) && value.artifacts.length > 0,
    "California signature run seal has no artifacts");
  const sealedArtifacts = value.artifacts as Array<Record<string, unknown>>;
  assertArtifactByteIdentities(sealedArtifacts, "California signature run seal");
  assertEvidenceReservationIdentities(
    value.evidenceReservations,
    "California signature run seal"
  );
  assertArtifactByteIdentities(
    options.producer.value.artifacts,
    "California signature producer process-success receipt"
  );
  assert.deepEqual(
    sealedArtifacts,
    options.producer.value.artifacts,
    "California signature run seal does not bind producer artifact byte identities"
  );
  assert.deepEqual(
    value.evidenceReservations,
    options.producer.value.evidenceReservations,
    "California signature run seal does not bind producer evidence reservations"
  );
  assert.deepEqual(
    value.evidenceReservations,
    options.evidenceReservations,
    "California signature run seal does not bind current evidence reservations"
  );
  assert.deepEqual(
    sealedArtifacts,
    options.loadedArtifactByteIdentities,
    "California signature run seal does not bind the currently loaded artifact byte identities"
  );
  const actualNames = options.entries
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX))
    .sort();
  const sealedNames = sealedArtifacts.map((artifact) => artifact.fileName as string).sort();
  exactStringSet(sealedNames, actualNames, "California signature sealed official filenames");
  const sealedChunkNames = sealedArtifacts.flatMap((artifact) =>
    (artifact.evidenceChunks as CaliforniaSignatureEvidenceChunkByteIdentity[])
      .map((chunk) => chunk.fileName)
  );
  const actualChunkNames = options.entries
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".frame"));
  exactStringSet(
    sealedChunkNames,
    actualChunkNames,
    "California signature sealed evidence chunk filenames"
  );
  for (const artifact of sealedArtifacts) {
    const reread = await readJsonFile(
      path.join(options.runDirectory, artifact.fileName as string),
      `${artifact.fileName}: sealed official artifact reread`
    );
    assert.equal(reread.sha256, artifact.sha256,
      `${artifact.fileName}: sealed official artifact digest drifted`);
  }
}

type CaliforniaSignatureReadJson = {
  bytes: Buffer;
  sha256: string;
  value: Record<string, unknown>;
};

async function readJsonFile(
  target: string,
  label: string,
  expectedLinkCount = 1
): Promise<CaliforniaSignatureReadJson> {
  const handle = await open(target, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const identity = await handle.stat();
    assert.ok(identity.isFile(), `${label}: expected one regular non-symlink file`);
    assert.equal(
      identity.nlink,
      expectedLinkCount,
      expectedLinkCount === 1
        ? `${label}: hard-linked files are forbidden`
        : `${label}: unexpected hard-link count during exact read`
    );
    const bytes = await handle.readFile();
    const after = await handle.stat();
    for (const key of ["dev", "ino", "nlink", "mode", "size", "mtimeMs", "ctimeMs"] as const) {
      assert.equal(after[key], identity[key], `${label}: held file identity changed during exact read (${key})`);
    }
    assert.equal(bytes.length, identity.size, `${label}: held file size changed during exact read`);
    const pathnameIdentity = await lstat(target);
    assert.ok(pathnameIdentity.isFile() && !pathnameIdentity.isSymbolicLink(),
      `${label}: pathname stopped naming one regular non-symlink file`);
    assert.equal(pathnameIdentity.dev, identity.dev, `${label}: pathname device changed during exact read`);
    assert.equal(pathnameIdentity.ino, identity.ino, `${label}: pathname inode changed during exact read`);
    assert.equal(pathnameIdentity.nlink, expectedLinkCount,
      `${label}: pathname link count changed during exact read`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    assertRecord(parsed, label);
    return { bytes, sha256: sha256(bytes), value: parsed };
  } finally {
    await handle.close();
  }
}

async function readJsonObject(target: string, label: string, expectedLinkCount = 1) {
  return (await readJsonFile(target, label, expectedLinkCount)).value;
}

async function waitForRunManifest(runDirectory: string) {
  const manifestPath = path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await readJsonObject(manifestPath, "California signature run manifest");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || attempt === 49) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error("California signature run manifest did not become durable");
}

async function writeExclusiveJson(destination: string, value: unknown) {
  const expectedBytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  let temporaryExists = false;
  try {
    const temporaryHandle = await open(temporary, "wx", 0o600);
    temporaryExists = true;
    try {
      await temporaryHandle.writeFile(expectedBytes);
      await temporaryHandle.sync();
    } finally {
      await temporaryHandle.close();
    }
    await link(temporary, destination);
    await unlink(temporary);
    temporaryExists = false;
    const directoryHandle = await open(path.dirname(destination), "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
    const published = await readJsonFile(
      destination,
      `${path.basename(destination)}: exclusive publication readback`
    );
    assert.deepEqual(published.bytes, expectedBytes,
      `${path.basename(destination)}: durable publication bytes drifted on immediate reread`);
    return { bytes: published.bytes, sha256: published.sha256 };
  } finally {
    if (temporaryExists) await unlink(temporary).catch(() => undefined);
  }
}

/**
 * Keep the hard-link source as a durable producer intent until every
 * post-publication check and the outer publication-lock cleanup succeeds.
 * Any rejected writer Promise after the official link exists must leave this
 * unknown `.producer-pending.tmp` entry behind so no finalizer can mistake the
 * incomplete producer for a terminally successful artifact.
 */
async function writeValidatedOfficialJson<TValue>(options: {
  destination: string;
  validate(value: TValue): Promise<void> | void;
  value: TValue;
}) {
  const expectedBytes = Buffer.from(`${JSON.stringify(options.value)}\n`, "utf8");
  const temporary = `${options.destination}.${process.pid}.${randomUUID()}.producer-pending.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(expectedBytes);
    await handle.sync();
  } finally {
    await handle.close();
  }

  const staged = await readJsonFile(
    temporary,
    `${path.basename(options.destination)}: producer-pending validation`
  );
  assert.deepEqual(staged.bytes, expectedBytes,
    `${path.basename(options.destination)}: producer-pending bytes drifted`);
  await options.validate(staged.value as TValue);

  await link(temporary, options.destination);
  const directoryHandle = await open(path.dirname(options.destination), "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const publishedIdentity = await lstat(options.destination);
  assert.ok(
    publishedIdentity.isFile() && !publishedIdentity.isSymbolicLink() && publishedIdentity.nlink === 2,
    `${path.basename(options.destination)}: official publication did not retain its producer intent`
  );
  const published = await readJsonFile(
    options.destination,
    `${path.basename(options.destination)}: official publication readback`,
    2
  );
  assert.deepEqual(published.bytes, expectedBytes,
    `${path.basename(options.destination)}: official publication bytes drifted`);
  await options.validate(published.value as TValue);
  return {
    producerPendingPath: temporary,
    sha256: published.sha256,
    value: published.value as TValue
  };
}

export async function initializeCaliforniaSignatureArtifactRunDirectory(options: {
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
}) {
  const ledgerRoot = path.resolve(options.ledgerRoot);
  await mkdir(ledgerRoot, { recursive: true });
  const rootIdentity = await lstat(ledgerRoot);
  assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
    "California signature ledger root must be a regular directory, not a symlink");
  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, options.identity.runId);
  let created = false;
  try {
    await mkdir(runDirectory);
    created = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California signature run directory must be a regular directory, not a symlink");
  if (created) {
    assert.deepEqual(await readdir(runDirectory), [],
      "new California signature run directory was not verified empty");
    await writeExclusiveJson(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
      exactRunManifest(options.identity)
    );
  }
  const manifest = await waitForRunManifest(runDirectory);
  assertRunManifest(manifest, options.identity);
  return runDirectory;
}

function assertShard(shard: CaliforniaSignatureArtifactShard, label: string) {
  if (shard === null) return;
  assert.ok(Number.isSafeInteger(shard.index) && Number.isSafeInteger(shard.total) &&
    shard.total >= 2 && shard.index >= 1 && shard.index <= shard.total,
  `${label}: invalid shard`);
}

function shardSegment(shard: CaliforniaSignatureArtifactShard) {
  assertShard(shard, "California signature artifact");
  return shard ? `shard-${shard.index}-of-${shard.total}` : "shard-all";
}

function artifactLogicalIdentity(options: {
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
  runId: string;
  shard: CaliforniaSignatureArtifactShard;
}) {
  assertLogicalSegment(options.packageId, "California signature packageId");
  assertLogicalSegment(options.projectName, "California signature projectName");
  assert.ok(Number.isSafeInteger(options.repeatEachIndex) && options.repeatEachIndex >= 0,
    "California signature repeatEachIndex must be a non-negative integer");
  const artifactId = [
    options.runId,
    options.projectName,
    options.packageId,
    shardSegment(options.shard),
    `repeat-${options.repeatEachIndex}`
  ].join("__");
  return {
    artifactId,
    fileName: `${artifactId}${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`
  };
}

function artifactBase(options: {
  identity: CaliforniaSignatureArtifactRunIdentity;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
}) {
  assertShard(options.shard, "California signature artifact");
  assertLogicalSegment(options.packageId, "California signature packageId");
  assertLogicalSegment(options.projectName, "California signature projectName");
  return {
    ...structuredClone(options.identity),
    createdAt: new Date().toISOString(),
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION as
      typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    packageId: options.packageId,
    projectName: options.projectName,
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
    shard: options.shard ? { ...options.shard } : null
  };
}

type CaliforniaSignatureEvidenceReservationRecord = {
  artifactId: string;
  bytes: number;
  createdAt: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  reservationId: string;
  runId: string;
};

const EVIDENCE_RESERVATION_RECORD_KEYS = [
  "artifactId",
  "bytes",
  "createdAt",
  "lifecycleSchemaVersion",
  "reservationId",
  "runId"
] as const;

function assertEvidenceReservationRecord(
  value: Record<string, unknown>,
  expectedRunId: string,
  label: string
): asserts value is CaliforniaSignatureEvidenceReservationRecord {
  assertExactKeys(value, EVIDENCE_RESERVATION_RECORD_KEYS, label);
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    `${label}: lifecycle schema drifted`);
  assert.equal(value.runId, expectedRunId, `${label}: run identity drifted`);
  assert.ok(typeof value.artifactId === "string" && ID_PATTERN.test(value.artifactId),
    `${label}: artifactId is invalid`);
  assert.ok(typeof value.reservationId === "string" && ID_PATTERN.test(value.reservationId),
    `${label}: reservationId is invalid`);
  assert.ok(Number.isSafeInteger(value.bytes) && (value.bytes as number) > 0 &&
    (value.bytes as number) <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
  `${label}: reservation byte count is invalid`);
  assert.ok(typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)),
    `${label}: createdAt is invalid`);
}

async function loadCaliforniaSignatureEvidenceReservations(
  runDirectory: string,
  expectedRunId: string
) {
  const fileNames = (await readdir(runDirectory))
    .filter((name) => name.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX))
    .sort();
  assert.ok(fileNames.length <= 4_096,
    "California signature evidence reservation inventory exceeds its fail-closed cap");
  const identities: CaliforniaSignatureEvidenceReservationIdentity[] = [];
  let totalBytes = 0;
  for (const fileName of fileNames) {
    assert.match(fileName,
      /^\.ca-signature-evidence-reservation-[a-z0-9_-]{24,128}\.signature-evidence-reservation\.json$/i,
      `${fileName}: unsafe evidence reservation filename`);
    const read = await readJsonFile(
      path.join(runDirectory, fileName),
      `${fileName}: evidence reservation`
    );
    assertEvidenceReservationRecord(read.value, expectedRunId, fileName);
    assert.equal(
      fileName,
      `.ca-signature-evidence-reservation-${read.value.reservationId}` +
        CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX,
      `${fileName}: reservation filename/payload identity drifted`
    );
    totalBytes += read.value.bytes;
    assert.ok(Number.isSafeInteger(totalBytes) && totalBytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
      `California signature evidence run reservation exceeds ${CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES}`);
    identities.push({
      artifactId: read.value.artifactId,
      bytes: read.value.bytes,
      fileName,
      sha256: read.sha256
    });
  }
  return { identities, totalBytes };
}

async function reserveCaliforniaSignatureEvidenceBytes(options: {
  artifactId: string;
  bytes: number;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  runDirectory: string;
}) {
  assert.ok(Number.isSafeInteger(options.bytes) && options.bytes > 0,
    `${options.artifactId}: invalid evidence byte reservation`);
  await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(options.runDirectory);
      const existing = await loadCaliforniaSignatureEvidenceReservations(
        options.runDirectory,
        options.identity.runId
      );
      assert.ok(existing.totalBytes + options.bytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
        `${options.artifactId}: evidence run byte cap ${CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES} exceeded`);
      const available = await statfs(options.runDirectory);
      const freeBytes = Number(available.bavail) * Number(available.bsize);
      assert.ok(Number.isSafeInteger(freeBytes) && freeBytes >= options.bytes,
        `${options.artifactId}: Starship free space ${freeBytes} is below reservation ${options.bytes}`);
      const reservationId = `reservation-${randomUUID()}`;
      const fileName = `.ca-signature-evidence-reservation-${reservationId}` +
        CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX;
      const record: CaliforniaSignatureEvidenceReservationRecord = {
        artifactId: options.artifactId,
        bytes: options.bytes,
        createdAt: new Date().toISOString(),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        reservationId,
        runId: options.identity.runId
      };
      await writeExclusiveJson(path.join(options.runDirectory, fileName), record);
    }
  });
}

export type CaliforniaSignatureOfficialEvidenceWriter = {
  abort(): Promise<void>;
  appendBatch(records: readonly CaliforniaSignatureExactEvidenceRecord[]): Promise<void>;
  artifactId: string;
  diagnostic(): CaliforniaSignaturePartialEvidenceStreamDiagnostic;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  finalize(): Promise<CaliforniaSignatureEvidenceStreamManifest>;
  runDirectory: string;
};

export async function createCaliforniaSignatureOfficialEvidenceWriter(options: {
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  manifest: CaliforniaSignatureSourceManifest;
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
  shard: CaliforniaSignatureArtifactShard;
}): Promise<CaliforniaSignatureOfficialEvidenceWriter> {
  assert.ok(CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
    options.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
  ), `${options.projectName}: unsupported California signature project`);
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    `${logical.artifactId}: evidence writer execution-group ownership`);
  if (executionGroupOwnership) {
    assert.equal(executionGroupOwnership.sourceSnapshotSha256,
      options.identity.sourceSnapshotSha256,
    `${logical.artifactId}: evidence writer ownership mixes source snapshots`);
    assert.ok(executionGroupOwnership.groupKeys.every((groupKey) =>
      groupKey.startsWith(`${options.projectName}\0`)),
    `${logical.artifactId}: evidence writer ownership crosses projects`);
  }
  const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
  let localReservedBytes = 0;
  const streamArtifactId = `ca-signature-evidence-${sha256(
    executionGroupOwnership
      ? `${logical.artifactId}\0${executionGroupOwnershipSha256(executionGroupOwnership)}`
      : logical.artifactId
  ).slice(0, 48)}`;
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: streamArtifactId,
    orderKey(record) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(
        record,
        `${logical.artifactId}: evidence stream order`
      );
      return californiaSignatureExactEvidenceOrderKey({ manifest: options.manifest, record });
    },
    async reserveRunBytes(bytes) {
      if (localReservedBytes < bytes) {
        const block = Math.max(bytes, CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_BLOCK_BYTES);
        await reserveCaliforniaSignatureEvidenceBytes({
          artifactId: logical.artifactId,
          bytes: block,
          identity: options.identity,
          ledgerRoot: options.ledgerRoot,
          runDirectory
        });
        localReservedBytes += block;
      }
      localReservedBytes -= bytes;
    },
    runDirectory
  });
  return {
    abort: () => writer.abort(),
    appendBatch(records) {
      for (const [index, record] of records.entries()) {
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          record,
          `${logical.artifactId}: append batch record ${index}`
        );
      }
      return writer.appendBatch(records);
    },
    artifactId: logical.artifactId,
    diagnostic: () => writer.diagnostic(),
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    finalize: () => writer.finalize(),
    runDirectory
  };
}

export async function persistCaliforniaSignatureSuccessfulArtifact(options: {
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "attach" | "errors" | "repeatEachIndex" | "retry">;
  validateAdditionalPublicationEvidence?(
    artifact: CaliforniaSignatureOfficialArtifact
  ): Promise<void> | void;
  validationContext: CaliforniaSignatureArtifactValidationContext;
}) {
  assert.ok(options.validationContext,
    "successful California signature artifact requires a concrete validation context");
  assert.ok(options.evidenceStream.recordCount > 0,
    "successful California signature artifact must contain streamed evidence");
  assert.equal(options.testInfo.errors.length, 0,
    "successful California signature artifact cannot publish after a recorded test error");
  assert.equal(options.testInfo.retry, 0,
    "California signature official artifacts require the frozen retries=0 contract");
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    `${options.packageId}: artifact execution-group ownership`);
  assert.deepEqual(executionGroupOwnership,
    options.validationContext.executionGroupOwnership,
  `${options.packageId}: writer/artifact validation ownership drifted`);
  const expectedStreamId = `ca-signature-evidence-${sha256(
    executionGroupOwnership
      ? `${logical.artifactId}\0${executionGroupOwnershipSha256(executionGroupOwnership)}`
      : logical.artifactId
  ).slice(0, 48)}`;
  assert.ok(options.evidenceStream.chunks.every((chunk) =>
    chunk.fileName.startsWith(`${expectedStreamId}.evidence-`)
  ), `${options.packageId}: evidence stream does not belong to the canonical artifact writer`);
  const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
  const artifact: CaliforniaSignatureOfficialArtifact = {
    ...artifactBase(options),
    artifactId: logical.artifactId,
    evidenceSnapshot: californiaSignatureEvidenceSnapshotFromStream(
      options.validationContext,
      options.evidenceStream
    ),
    evidenceStream: structuredClone(options.evidenceStream),
    evidenceStreamOwnershipSha256: evidenceStreamOwnershipSha256({
      evidenceStream: options.evidenceStream,
      ownership: executionGroupOwnership
    }),
    execution: { repeatEachIndex: options.testInfo.repeatEachIndex, retry: 0 },
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    terminalStatus: "passed"
  };
  const validatedSnapshot = await validateCaliforniaSignatureOfficialEvidenceStream({
    artifact,
    context: options.validationContext,
    identity: options.identity,
    label: `${options.packageId}: pre-publication evidence stream`,
    runDirectory
  });
  const destination = path.join(runDirectory, logical.fileName);
  await options.testInfo.attach("california-signature-exhaustive-ledger", {
    body: Buffer.from(JSON.stringify({
      artifactId: artifact.artifactId,
      evidenceCount: artifact.evidenceStream.recordCount,
      markerIdentitiesSha256: artifact.markerIdentitiesSha256,
      snapshot: validatedSnapshot,
      terminalStatus: artifact.terminalStatus
    }, null, 2)),
    contentType: "application/json"
  });
  assert.deepEqual(
    await validateCaliforniaSignatureOfficialEvidenceStream({
      artifact,
      context: options.validationContext,
      identity: options.identity,
      label: `${options.packageId}: post-attachment evidence stream`,
      runDirectory
    }),
    validatedSnapshot,
    `${options.packageId}: evidence changed between validation and publication`
  );
  // Exclusive official publication is deliberately the final awaited action:
  // no attachment or diagnostic side effect may fail after a passed artifact
  // has become aggregator-visible.
  const completed = await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      const lockedRunDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
      assert.equal(lockedRunDirectory, runDirectory,
        `${options.packageId}: publication lock resolved a different run directory`);
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory);
      const publication = await writeValidatedOfficialJson({
        destination,
        value: artifact,
        async validate(candidate) {
          assertRecord(candidate, `${logical.fileName}: producer validation`);
          assertOfficialArtifactSchema(candidate, `${logical.fileName}: producer validation`);
          const official = candidate as unknown as CaliforniaSignatureOfficialArtifact;
          assert.deepEqual(official, artifact, `${logical.fileName}: publication payload drifted`);
          await validateCaliforniaSignatureOfficialEvidenceStream({
            artifact: official,
            context: options.validationContext,
            identity: options.identity,
            label: `${options.packageId}: producer validation evidence stream`,
            runDirectory
          });
          await options.validateAdditionalPublicationEvidence?.(structuredClone(official));
        }
      });
      return {
        producerPendingPath: publication.producerPendingPath,
        result: destination
      };
    }
  });
  // Final fallible operation: if outer lock cleanup or this unlink fails, the
  // retained pending intent keeps the run unsealable.
  await unlink(completed.producerPendingPath);
  return completed.result;
}

/**
 * Bounded pure-test adapter. Product/E2E producers must open the official
 * writer before browser work and flush one source-derived bench/axis group at
 * a time; this adapter deliberately refuses package-scale evidence arrays.
 */
export async function persistCaliforniaSignatureSuccessfulArtifactFixture(options: {
  evidence: CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "attach" | "errors" | "repeatEachIndex" | "retry">;
  validateAdditionalPublicationEvidence?(
    artifact: CaliforniaSignatureOfficialArtifact
  ): Promise<void> | void;
  validationContext: CaliforniaSignatureArtifactValidationContext;
}) {
  assert.ok(options.validationContext,
    "successful California signature artifact requires a concrete validation context");
  assert.ok(options.evidence.length > 0 && options.evidence.length <= 4_096,
    "California signature fixture evidence must contain 1..4096 bounded records");
  const fixtureBytes = options.evidence.reduce((sum, record) =>
    sum + Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8"), 0);
  assert.ok(fixtureBytes <= 32 * 1024 * 1024,
    "California signature fixture evidence exceeds the 32MiB pure-test cap");
  const writer = await createCaliforniaSignatureOfficialEvidenceWriter({
    executionGroupOwnership: options.validationContext.executionGroupOwnership,
    identity: options.identity,
    ledgerRoot: options.ledgerRoot,
    manifest: options.validationContext.manifest,
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    shard: options.shard
  });
  await writer.appendBatch(options.evidence);
  const evidenceStream = await writer.finalize();
  californiaSignatureBoundedFixtureStreamSha256.add(sha256(stableJson(evidenceStream)));
  return persistCaliforniaSignatureSuccessfulArtifact({
    ...options,
    evidenceStream,
    executionGroupOwnership: writer.executionGroupOwnership
  });
}

function failureDetail(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message.replace(/\s+/g, " ").trim().slice(0, 2_000),
      name: error.name || "Error"
    };
  }
  return { message: String(error).replace(/\s+/g, " ").trim().slice(0, 2_000), name: "Error" };
}

export async function persistCaliforniaSignatureFailureDiagnostic(options: {
  error: unknown;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  streamDiagnostic: CaliforniaSignaturePartialEvidenceStreamDiagnostic | null;
  testInfo: Pick<TestInfo, "repeatEachIndex" | "retry" | "workerIndex">;
}) {
  const terminalStatus = (options.streamDiagnostic?.completedRecordCount ?? 0) > 0
    ? "partial"
    : "failed";
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const diagnosticId = `${logical.artifactId}__${terminalStatus}__${randomUUID()}`;
  const diagnostic: CaliforniaSignatureDiagnosticArtifact = {
    ...artifactBase(options),
    createdAt: new Date().toISOString(),
    diagnosticId,
    execution: {
      repeatEachIndex: options.testInfo.repeatEachIndex,
      retry: options.testInfo.retry,
      workerIndex: options.testInfo.workerIndex
    },
    failure: failureDetail(options.error),
    streamDiagnostic: options.streamDiagnostic
      ? structuredClone(options.streamDiagnostic)
      : null,
    terminalStatus
  };
  const suffix = terminalStatus === "partial"
    ? CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX
    : CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX;
  const runDirectory = californiaSignatureArtifactRunDirectory(options.ledgerRoot, options.identity.runId);
  const destination = path.join(runDirectory, `${diagnosticId}${suffix}`);
  await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      const lockedRunDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
      assert.equal(lockedRunDirectory, runDirectory,
        `${options.packageId}: diagnostic publication lock resolved a different run directory`);
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory);
      await writeExclusiveJson(destination, diagnostic);
    }
  });
  return destination;
}

export async function persistCaliforniaSignatureFailureDiagnosticFixture(options: {
  error: unknown;
  evidence: CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "repeatEachIndex" | "retry" | "workerIndex">;
}) {
  assert.ok(options.evidence.length <= 4_096,
    "California signature diagnostic fixture exceeds its bounded record cap");
  return persistCaliforniaSignatureFailureDiagnostic({
    ...options,
    streamDiagnostic: options.evidence.length === 0
      ? null
      : {
          chunks: [],
          completedCanonicalRecordBytes: options.evidence.reduce((sum, record) =>
            sum + Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8"), 0),
          completedFramedBytes: 0,
          completedRecordCount: options.evidence.length,
          schemaVersion: 1
        }
  });
}

export function buildCaliforniaSignatureExpectedArtifactMatrix(options: {
  packages: readonly { benchIds: readonly string[]; packageId: string }[];
  projects?: readonly string[];
  repeatEachIndices?: readonly number[];
  runId: string;
  shardTotal?: number;
}) {
  assertHighEntropyId(options.runId, "California signature exhaustive runId");
  const projects = options.projects ?? CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS;
  const repeats = options.repeatEachIndices ?? [0];
  const shardTotal = options.shardTotal ?? 1;
  assert.ok(Number.isSafeInteger(shardTotal) && shardTotal >= 1,
    "California signature expected shard total must be a positive integer");
  const packageIds = options.packages.map((workPackage) => workPackage.packageId);
  assert.equal(new Set(packageIds).size, packageIds.length,
    "California signature expected packages repeat an ID");
  assert.equal(new Set(projects).size, projects.length,
    "California signature expected projects repeat an ID");
  assert.equal(new Set(repeats).size, repeats.length,
    "California signature expected repeats repeat an index");
  const expected = new Map<string, CaliforniaSignatureExpectedArtifact>();
  for (const [packageIndex, workPackage] of options.packages.entries()) {
    const { packageId } = workPackage;
    assert.ok(workPackage.benchIds.length > 0,
      `${packageId}: California signature expected package has no benches`);
    assert.equal(new Set(workPackage.benchIds).size, workPackage.benchIds.length,
      `${packageId}: California signature expected package repeats a bench`);
    const shard = shardTotal === 1
      ? null
      : { index: packageIndex % shardTotal + 1, total: shardTotal };
    for (const projectName of projects) {
      for (const repeatEachIndex of repeats) {
        const logical = artifactLogicalIdentity({
          packageId,
          projectName,
          repeatEachIndex,
          runId: options.runId,
          shard
        });
        const key = `${projectName}\0${packageId}\0${repeatEachIndex}`;
        assert.ok(!expected.has(key), `California signature expected artifact key repeats: ${key}`);
        expected.set(key, {
          ...logical,
          benchIds: [...workPackage.benchIds],
          execution: { repeatEachIndex, retry: 0 },
          executionGroupOwnership: null,
          packageId,
          projectName,
          shard
        });
      }
    }
  }
  assert.ok(expected.size > 0, "California signature expected artifact matrix is empty");
  return expected;
}

function buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal(options: {
  ownershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
  runId: string;
  shardTotal?: number;
}) {
  assertHighEntropyId(options.runId, "California signature group-owned runId");
  const manifest = structuredClone(options.ownershipManifest);
  assertRecord(manifest, "California signature execution ownership manifest");
  assertExactKeys(manifest as unknown as Record<string, unknown>, [
    "capacityPlanSha256",
    "cropCount",
    "evidenceRecordCount",
    "formalExecutionAuthorized",
    "groupCount",
    "packages",
    "receiptCount",
    "schemaVersion",
    "sourceIdentitySha256",
    "sourceSnapshotSha256",
    "status"
  ], "California signature execution ownership manifest");
  assert.equal(manifest.schemaVersion,
    CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
  "California signature execution ownership manifest version drifted");
  assert.equal(manifest.status, "diagnostic-capacity-partition",
    "California signature execution ownership manifest status drifted");
  assert.equal(manifest.formalExecutionAuthorized, false,
    "capacity ownership is diagnostic and must never authorize formal execution");
  assertSha256(manifest.capacityPlanSha256,
    "California signature execution ownership capacity plan");
  assertSha256(manifest.sourceIdentitySha256,
    "California signature execution ownership source identity");
  assertSha256(manifest.sourceSnapshotSha256,
    "California signature execution ownership source snapshot");
  assertPositiveSafeInteger(manifest.groupCount,
    "California signature execution ownership group count");
  assertPositiveSafeInteger(manifest.evidenceRecordCount,
    "California signature execution ownership evidence record count");
  assertPositiveSafeInteger(manifest.cropCount,
    "California signature execution ownership crop count");
  assertPositiveSafeInteger(manifest.receiptCount,
    "California signature execution ownership receipt count");
  assert.ok(Array.isArray(manifest.packages),
    "California signature execution ownership packages must be an array");
  assert.equal(manifest.packages.length, 51,
    "California signature execution ownership must contain 51 package slots");
  const shardTotal = options.shardTotal ?? 1;
  assert.ok(Number.isSafeInteger(shardTotal) && shardTotal >= 1,
    "California signature group-owned shard total must be a positive integer");
  const expected = new Map<string, CaliforniaSignatureExpectedArtifact>();
  const allGroupKeys = new Set<string>();
  let evidenceRecordCount = 0;
  let cropCount = 0;
  let receiptCount = 0;
  for (const [packageIndex, workPackage] of manifest.packages.entries()) {
    const workPackageRecord: unknown = workPackage;
    assertRecord(workPackageRecord,
      `California signature group-owned package ${packageIndex}`);
    assertExactKeys(workPackageRecord, [
      "packageId",
      "projects",
      "slotIndex"
    ], `California signature group-owned package ${packageIndex}`);
    assert.equal(workPackage.slotIndex, packageIndex,
      "California signature execution ownership package slots drifted");
    assertLogicalSegment(workPackage.packageId,
      "California signature group-owned packageId");
    assert.equal(
      workPackage.packageId,
      `signature-final-compositor-capacity-${String(packageIndex + 1).padStart(3, "0")}`,
      "California signature group-owned canonical packageId drifted"
    );
    assert.ok(Array.isArray(workPackage.projects),
      `${workPackage.packageId}: group-owned projects must be an array`);
    assert.equal(workPackage.projects.length, CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.length,
      `${workPackage.packageId}: group-owned project count drifted`);
    const shard = shardTotal === 1
      ? null
      : { index: packageIndex % shardTotal + 1, total: shardTotal };
    for (const [projectIndex, projectName] of
      CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.entries()) {
      const slice = workPackage.projects[projectIndex];
      assert.ok(slice, `${workPackage.packageId}/${projectName}: group-owned slice is missing`);
      const sliceRecord: unknown = slice;
      assertRecord(sliceRecord,
        `${workPackage.packageId}/${projectName}: group-owned project slice`);
      assertExactKeys(sliceRecord, [
        "benchIds",
        "cropCount",
        "expectedRecordCount",
        "groupKeys",
        "projectName",
        "receiptCount"
      ], `${workPackage.packageId}/${projectName}: group-owned project slice`);
      assert.equal(slice.projectName, projectName,
        `${workPackage.packageId}: group-owned project order drifted`);
      assert.ok(Array.isArray(slice.benchIds),
        `${workPackage.packageId}/${projectName}: group-owned benchIds must be an array`);
      assert.ok(slice.benchIds.length > 0,
        `${workPackage.packageId}/${projectName}: group-owned slice has no benches`);
      assert.equal(new Set(slice.benchIds).size, slice.benchIds.length,
        `${workPackage.packageId}/${projectName}: group-owned slice repeats a bench`);
      for (const benchId of slice.benchIds) {
        assertLogicalSegment(benchId,
          `${workPackage.packageId}/${projectName}: group-owned benchId`);
      }
      const ownership: CaliforniaSignatureExecutionGroupOwnership = {
        cropCount: slice.cropCount,
        expectedRecordCount: slice.expectedRecordCount,
        groupKeys: [...slice.groupKeys],
        planSha256: manifest.capacityPlanSha256,
        receiptCount: slice.receiptCount,
        schemaVersion: CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
        sourceIdentitySha256: manifest.sourceIdentitySha256,
        sourceSnapshotSha256: manifest.sourceSnapshotSha256
      };
      assertExecutionGroupOwnership(ownership,
        `${workPackage.packageId}/${projectName}: group-owned expected artifact`);
      const derivedBenchIds: string[] = [];
      const derivedBenchIdSet = new Set<string>();
      for (const groupKey of ownership.groupKeys) {
        const groupFields = groupKey.split("\0");
        assert.equal(groupFields.length, 4,
          `${workPackage.packageId}/${projectName}: group key field count drifted`);
        const [groupProjectName, benchId, axisId, phase] = groupFields as
          [string, string, string, string];
        assert.equal(groupProjectName, projectName,
          `${workPackage.packageId}/${projectName}: group key swaps projects`);
        assert.equal(groupKey, californiaSignatureFinalCompositorGroupKey({
          axisId,
          benchId,
          phase: phase as "functional" | "layout" | "structural",
          projectName: groupProjectName
        }), `${workPackage.packageId}/${projectName}: group key semantics drifted`);
        if (!derivedBenchIdSet.has(benchId)) {
          derivedBenchIdSet.add(benchId);
          derivedBenchIds.push(benchId);
        }
        assert.ok(!allGroupKeys.has(groupKey),
          `${workPackage.packageId}/${projectName}: execution group repeats across packages`);
        allGroupKeys.add(groupKey);
      }
      assert.deepEqual(slice.benchIds, derivedBenchIds,
        `${workPackage.packageId}/${projectName}: benchIds do not derive from exact group keys`);
      evidenceRecordCount += ownership.expectedRecordCount;
      cropCount += ownership.cropCount;
      receiptCount += ownership.receiptCount;
      assert.ok(Number.isSafeInteger(evidenceRecordCount) && Number.isSafeInteger(cropCount) &&
        Number.isSafeInteger(receiptCount),
      "California signature group-owned expected matrix counters overflowed");
      const logical = artifactLogicalIdentity({
        packageId: workPackage.packageId,
        projectName,
        repeatEachIndex: 0,
        runId: options.runId,
        shard
      });
      const key = `${projectName}\0${workPackage.packageId}\0${0}`;
      assert.ok(!expected.has(key),
        `${workPackage.packageId}/${projectName}: group-owned expected artifact repeats`);
      expected.set(key, {
        ...logical,
        benchIds: [...slice.benchIds],
        execution: { repeatEachIndex: 0, retry: 0 },
        executionGroupOwnership: ownership,
        packageId: workPackage.packageId,
        projectName,
        shard
      });
    }
  }
  assert.equal(expected.size, 102,
    "California signature group-owned expected matrix must remain 51x2");
  assert.equal(allGroupKeys.size, manifest.groupCount,
    "California signature group-owned expected matrix group count drifted");
  assert.equal(evidenceRecordCount, manifest.evidenceRecordCount,
    "California signature group-owned expected matrix evidence count drifted");
  assert.equal(cropCount, manifest.cropCount,
    "California signature group-owned expected matrix crop count drifted");
  assert.equal(receiptCount, manifest.receiptCount,
    "California signature group-owned expected matrix receipt count drifted");
  return expected;
}

export function buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix(options: {
  ownershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
  runId: string;
  shardTotal?: number;
}) {
  const expected = buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal(options);
  assertCaliforniaSignatureExecutionGroupOwnershipValidated(options.ownershipManifest);
  return expected;
}

export function readCaliforniaSignatureExecutionGroupOwnershipManifest(options: {
  allowedRoot: string;
  expectedSha256: string;
  expectedSourceSnapshotSha256: string;
  manifestPath: string;
}) {
  const allowedRoot = path.resolve(options.allowedRoot);
  const manifestPath = path.resolve(options.manifestPath);
  assert.equal(options.manifestPath, manifestPath,
    "California signature execution ownership path must be absolute and normalized");
  const relative = path.relative(allowedRoot, manifestPath);
  assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative),
  "California signature execution ownership manifest escapes its allowed Starship root");
  assert.ok(allowedRoot.startsWith("/Volumes/Starship/") &&
    manifestPath.startsWith("/Volumes/Starship/"),
  "California signature execution ownership manifest must remain on /Volumes/Starship");
  assertSha256(options.expectedSha256,
    "California signature execution ownership external byte receipt");
  assertSha256(options.expectedSourceSnapshotSha256,
    "California signature execution ownership expected source snapshot");
  const pathIdentity = lstatSync(manifestPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California signature execution ownership manifest must be one regular non-linked file");
  assert.equal(realpathSync(manifestPath), manifestPath,
    "California signature execution ownership manifest traverses a symlink");
  const fd = openSync(manifestPath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  let bytes: Buffer;
  try {
    const before = fstatSync(fd, { bigint: true });
    assert.equal(before.dev, pathIdentity.dev,
      "California signature execution ownership device changed before held-FD read");
    assert.equal(before.ino, pathIdentity.ino,
      "California signature execution ownership inode changed before held-FD read");
    bytes = readFileSync(fd);
    const after = fstatSync(fd, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(after[key], before[key],
        `California signature execution ownership held-FD ${key} changed during read`);
    }
    const finalPath = lstatSync(manifestPath, { bigint: true });
    assert.equal(finalPath.dev, before.dev,
      "California signature execution ownership path device changed during read");
    assert.equal(finalPath.ino, before.ino,
      "California signature execution ownership path inode changed during read");
  } finally {
    closeSync(fd);
  }
  const fileSha256 = sha256(bytes);
  assert.equal(fileSha256, options.expectedSha256,
    "California signature execution ownership bytes differ from the external receipt");
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `California signature execution ownership manifest is invalid JSON: ${
        error instanceof Error ? error.message : String(error)}`
    );
  }
  assertRecord(parsed, "California signature execution ownership manifest");
  const manifest = parsed as unknown as CaliforniaSignatureExecutionGroupOwnershipManifest;
  assert.equal(manifest.sourceSnapshotSha256, options.expectedSourceSnapshotSha256,
    "California signature execution ownership manifest mixes source snapshots");
  // Reuse the exact 51x2 matrix validator so a byte-receipted but schema-valid
  // legacy whole-bench payload cannot be interpreted as a group plan.
  buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal({
    ownershipManifest: manifest,
    runId: "ca-signature-ownership-read-validation-0123456789abcdef"
  });
  const validatedManifest = markCaliforniaSignatureExecutionGroupOwnershipValidated(
    structuredClone(manifest)
  );
  return { fileSha256, manifest: validatedManifest };
}

function sortedCaliforniaSignatureExpectedArtifacts(
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>
) {
  assert.ok(expectedMatrix.size > 0, "California signature expected artifact matrix is empty");
  const values = [...expectedMatrix.values()].map((value) => structuredClone(value));
  const keys = new Set<string>();
  for (const expected of values) {
    const key = `${expected.projectName}\0${expected.packageId}\0${expected.execution.repeatEachIndex}`;
    assert.ok(!keys.has(key), `California signature expected artifact matrix repeats ${key}`);
    keys.add(key);
    assert.deepEqual(expectedMatrix.get(key), expected,
      `${key}: California signature expected artifact map key/value drifted`);
    const logical = artifactLogicalIdentity({
      packageId: expected.packageId,
      projectName: expected.projectName,
      repeatEachIndex: expected.execution.repeatEachIndex,
      runId: expected.artifactId.split("__", 1)[0]!,
      shard: expected.shard
    });
    assert.equal(expected.artifactId, logical.artifactId, `${key}: expected artifactId is not canonical`);
    assert.equal(expected.fileName, logical.fileName, `${key}: expected filename is not canonical`);
    assert.equal(expected.execution.retry, 0, `${key}: expected retry is not frozen to zero`);
    assertExecutionGroupOwnership(expected.executionGroupOwnership,
      `${key}: expected artifact execution-group ownership`);
    assert.ok(expected.benchIds.length > 0, `${key}: expected artifact owns no benches`);
    assert.equal(new Set(expected.benchIds).size, expected.benchIds.length,
      `${key}: expected artifact repeats a bench`);
  }
  return values.sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function californiaSignatureExpectedArtifactsSha256(
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>
) {
  return sha256(stableJson(sortedCaliforniaSignatureExpectedArtifacts(expectedMatrix)));
}

function exactCaliforniaSignatureArtifactByteIdentities(
  loaded: readonly CaliforniaSignatureLoadedArtifact[]
): CaliforniaSignatureArtifactByteIdentity[] {
  return loaded.map(({ artifact, fileName, fileSha256 }) => ({
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
    evidenceManifestSha256: sha256(
      canonicalCaliforniaSignatureEvidenceJson(artifact.evidenceStream)
    ),
    evidenceRecordCount: artifact.evidenceStream.recordCount,
    evidenceStreamOwnershipSha256: artifact.evidenceStreamOwnershipSha256,
    executionGroupOwnership: artifact.executionGroupOwnership
      ? structuredClone(artifact.executionGroupOwnership)
      : null,
    fileName,
    sha256: fileSha256
  })).sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function assertArtifactByteIdentities(
  value: unknown,
  label: string
): asserts value is CaliforniaSignatureArtifactByteIdentity[] {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: artifacts must be one non-empty array`);
  for (const artifact of value) {
    assertRecord(artifact, `${label}: artifact byte identity`);
    assertExactKeys(
      artifact,
      [
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
      ],
      `${label}: artifact byte identity`
    );
    assert.ok(typeof artifact.artifactId === "string" && artifact.artifactId.length > 0,
      `${label}: artifactId is invalid`);
    assert.ok(
      typeof artifact.fileName === "string" &&
        artifact.fileName.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX),
      `${label}: official artifact filename is invalid`
    );
    assert.ok(typeof artifact.sha256 === "string" && SHA256_PATTERN.test(artifact.sha256),
      `${label}: artifact SHA-256 is invalid`);
    assert.ok(typeof artifact.evidenceChunkMerkleRootSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceChunkMerkleRootSha256),
    `${label}: evidence chunk Merkle root is invalid`);
    assert.ok(typeof artifact.evidenceManifestSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceManifestSha256),
    `${label}: evidence manifest SHA-256 is invalid`);
    assert.ok(typeof artifact.evidenceStreamOwnershipSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceStreamOwnershipSha256),
    `${label}: evidence stream ownership SHA-256 is invalid`);
    assertExecutionGroupOwnership(
      artifact.executionGroupOwnership as CaliforniaSignatureExecutionGroupOwnership | null,
      `${label}: artifact byte execution-group ownership`
    );
    assert.ok(Array.isArray(artifact.evidenceChunks) && artifact.evidenceChunks.length > 0,
      `${label}: evidence chunks must be one non-empty array`);
    let chunkFramedBytes = 0;
    let chunkRecordCount = 0;
    const chunkFileNames = new Set<string>();
    for (const [chunkIndex, chunk] of artifact.evidenceChunks.entries()) {
      assertRecord(chunk, `${label}: evidence chunk ${chunkIndex}`);
      assertExactKeys(
        chunk,
        ["fileName", "framedBytes", "recordCount", "recordMerkleRootSha256", "sha256"],
        `${label}: evidence chunk ${chunkIndex}`
      );
      assert.ok(typeof chunk.fileName === "string" && chunk.fileName.endsWith(".frame") &&
        path.basename(chunk.fileName) === chunk.fileName,
      `${label}: evidence chunk ${chunkIndex} filename is invalid`);
      assert.equal(chunkFileNames.has(chunk.fileName), false,
        `${label}: evidence chunk filenames repeat`);
      chunkFileNames.add(chunk.fileName);
      assert.ok(typeof chunk.framedBytes === "number" &&
        Number.isSafeInteger(chunk.framedBytes) && chunk.framedBytes > 0,
      `${label}: evidence chunk ${chunkIndex} framed byte count is invalid`);
      assert.ok(typeof chunk.recordCount === "number" &&
        Number.isSafeInteger(chunk.recordCount) && chunk.recordCount > 0,
      `${label}: evidence chunk ${chunkIndex} record count is invalid`);
      assert.ok(typeof chunk.recordMerkleRootSha256 === "string" &&
        SHA256_PATTERN.test(chunk.recordMerkleRootSha256),
      `${label}: evidence chunk ${chunkIndex} record Merkle root is invalid`);
      assert.ok(typeof chunk.sha256 === "string" && SHA256_PATTERN.test(chunk.sha256),
        `${label}: evidence chunk ${chunkIndex} SHA-256 is invalid`);
      chunkFramedBytes += chunk.framedBytes;
      chunkRecordCount += chunk.recordCount;
    }
    assert.deepEqual(
      artifact.evidenceChunks,
      [...artifact.evidenceChunks].sort((left, right) => left.fileName.localeCompare(right.fileName)),
      `${label}: evidence chunks are not in canonical filename order`
    );
    assert.ok(typeof artifact.evidenceFramedBytes === "number" &&
      Number.isSafeInteger(artifact.evidenceFramedBytes) && artifact.evidenceFramedBytes > 0 &&
      artifact.evidenceFramedBytes <= 8 * 1024 * 1024 * 1024,
    `${label}: evidence framed byte count is invalid`);
    assert.ok(typeof artifact.evidenceRecordCount === "number" &&
      Number.isSafeInteger(artifact.evidenceRecordCount) && artifact.evidenceRecordCount > 0,
      `${label}: evidence record count is invalid`);
    assert.equal(chunkFramedBytes, artifact.evidenceFramedBytes,
      `${label}: evidence chunk bytes do not sum to the artifact byte binding`);
    assert.equal(chunkRecordCount, artifact.evidenceRecordCount,
      `${label}: evidence chunk records do not sum to the artifact count binding`);
    assert.equal(
      californiaSignatureEvidenceMerkleRootSha256(
        artifact.evidenceChunks.map((chunk) => chunk.sha256)
      ),
      artifact.evidenceChunkMerkleRootSha256,
      `${label}: evidence chunk list does not recompute the artifact Merkle root`
    );
  }
  const sorted = [...value].sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(value, sorted, `${label}: artifact byte identities must use exact filename order`);
  assert.equal(new Set(value.map((artifact) => artifact.fileName)).size, value.length,
    `${label}: artifact byte identities repeat a filename`);
  assert.equal(new Set(value.map((artifact) => artifact.artifactId)).size, value.length,
    `${label}: artifact byte identities repeat an artifactId`);
  const chunkFileNames = value.flatMap((artifact) =>
    artifact.evidenceChunks.map((chunk: CaliforniaSignatureEvidenceChunkByteIdentity) => chunk.fileName)
  );
  assert.equal(new Set(chunkFileNames).size, chunkFileNames.length,
    `${label}: artifact byte identities repeat an evidence chunk filename`);
}

function assertEvidenceReservationIdentities(
  value: unknown,
  label: string
): asserts value is CaliforniaSignatureEvidenceReservationIdentity[] {
  assert.ok(Array.isArray(value) && value.length > 0,
    `${label}: evidence reservations must be one non-empty array`);
  let totalBytes = 0;
  for (const reservation of value) {
    assertRecord(reservation, `${label}: evidence reservation identity`);
    assertExactKeys(
      reservation,
      ["artifactId", "bytes", "fileName", "sha256"],
      `${label}: evidence reservation identity`
    );
    assert.ok(typeof reservation.artifactId === "string" && reservation.artifactId.length > 0,
      `${label}: evidence reservation artifactId is invalid`);
    assert.ok(typeof reservation.bytes === "number" &&
      Number.isSafeInteger(reservation.bytes) && reservation.bytes > 0,
      `${label}: evidence reservation byte count is invalid`);
    assert.ok(typeof reservation.fileName === "string" &&
      reservation.fileName.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX),
    `${label}: evidence reservation filename is invalid`);
    assert.ok(typeof reservation.sha256 === "string" && SHA256_PATTERN.test(reservation.sha256),
      `${label}: evidence reservation SHA-256 is invalid`);
    totalBytes += reservation.bytes;
    assert.ok(Number.isSafeInteger(totalBytes) && totalBytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
      `${label}: evidence reservations exceed the run cap`);
  }
  const sorted = [...value].sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(value, sorted, `${label}: evidence reservations are not in filename order`);
  assert.equal(new Set(value.map((entry) => entry.fileName)).size, value.length,
    `${label}: evidence reservations repeat a filename`);
}

function assertOfficialArtifactSchema(value: Record<string, unknown>, label: string) {
  assertExactKeys(value, OFFICIAL_ARTIFACT_KEYS, label);
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    `${label}: unsupported artifact lifecycle schema`);
  assert.equal(value.schemaVersion, CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
    `${label}: unsupported exhaustive evidence schema`);
  assert.equal(value.terminalStatus, "passed", `${label}: official artifact is not terminally passed`);
  assertRecord(value.evidenceStream, `${label}: evidence stream manifest`);
  assertRecord(value.evidenceSnapshot, `${label}: evidence snapshot`);
  assertSha256(value.evidenceStreamOwnershipSha256 as string,
    `${label}: evidence stream ownership`);
  assertExecutionGroupOwnership(
    value.executionGroupOwnership as CaliforniaSignatureExecutionGroupOwnership | null,
    `${label}: execution-group ownership`
  );
  assertExactKeys(
    value.evidenceSnapshot,
    ["blueprintSha256", "keyCount", "keysSha256", "schemaVersion"],
    `${label}: evidence snapshot`
  );
}

async function loadCaliforniaSignatureArtifactsInternal(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  producerState: "forbidden" | "required";
  producerSuccessReceipt?: CaliforniaSignatureProducerSuccessReceipt;
  sealReceipt?: CaliforniaSignatureSealReceipt;
  sealState: "forbidden" | "required";
}) {
  const runDirectory = californiaSignatureArtifactRunDirectory(
    options.ledgerRoot,
    options.expectedIdentity.runId
  );
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California signature run directory must be a regular directory, not a symlink");
  const entries = await readdir(runDirectory, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes(CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
    "California signature run directory lacks its exact run manifest");
  if (options.producerState === "required") {
    assert.ok(names.includes(CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
      "California signature run lacks its producer process-success receipt");
    assert.ok(options.producerSuccessReceipt,
      "California signature loader requires the external producer process-success receipt");
    assert.equal(
      options.producerSuccessReceipt.fileName,
      CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
      "California signature external producer receipt names the wrong file"
    );
    assertSha256(options.producerSuccessReceipt.sha256,
      "California signature external producer process-success receipt");
  } else {
    assert.equal(names.includes(CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME), false,
      "California signature open producer run already has a process-success receipt");
  }
  if (options.sealState === "required") {
    assert.ok(names.includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
      "California signature run lacks its terminal seal");
    assert.ok(options.sealReceipt,
      "California signature sealed loader requires an external seal receipt");
  } else {
    assert.equal(names.includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME), false,
      "California signature open-run loader refuses an already sealed run");
  }
  const unexpected = entries.filter((entry) =>
    entry.name !== CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME &&
    !(options.producerState === "required" &&
      entry.name === CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME) &&
    !(options.sealState === "required" && entry.name === CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME) &&
    !entry.name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX) &&
    !entry.name.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX) &&
    !entry.name.endsWith(".frame")
  );
  assert.deepEqual(
    unexpected.map((entry) => entry.name),
    [],
    "California signature run directory contains failure/partial/temp/unknown files"
  );
  for (const entry of entries) {
    assert.ok(entry.isFile() && !entry.isSymbolicLink(),
      `${entry.name}: California signature run entries must be regular non-symlink files`);
  }
  const expectedArtifacts = sortedCaliforniaSignatureExpectedArtifacts(options.expectedMatrix);
  const expectedArtifactsSha256 = californiaSignatureExpectedArtifactsSha256(options.expectedMatrix);
  const expectedNames = expectedArtifacts.map((artifact) => artifact.fileName).sort();
  const actualNames = entries
    .filter((entry) => entry.name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualNames, expectedNames,
    "California signature official files have a missing or extra project/package/repeat item");
  const manifest = await readJsonFile(
    path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
    "California signature run manifest"
  );
  assertRunManifest(manifest.value, options.expectedIdentity);
  let producer: CaliforniaSignatureReadJson | undefined;
  if (options.producerState === "required") {
    producer = await readJsonFile(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
      "California signature producer process-success receipt"
    );
    assert.equal(producer.sha256, options.producerSuccessReceipt!.sha256,
      "California signature producer process-success no longer matches its external receipt");
    assertProducerSuccess({
      expectedArtifactsSha256,
      expectedIdentity: options.expectedIdentity,
      producer
    });
  }

  const loaded: CaliforniaSignatureLoadedArtifact[] = [];
  for (const fileName of actualNames) {
    const read = await readJsonFile(path.join(runDirectory, fileName), fileName);
    assertOfficialArtifactSchema(read.value, fileName);
    loaded.push({
      artifact: read.value as unknown as CaliforniaSignatureOfficialArtifact,
      fileName,
      fileSha256: read.sha256,
      runDirectory
    });
  }
  assert.ok(loaded.length > 0, "California signature run directory has no official artifacts");
  const expectedChunkNames = loaded.flatMap(({ artifact }) =>
    artifact.evidenceStream.chunks.map((chunk) => chunk.fileName)
  );
  assert.equal(new Set(expectedChunkNames).size, expectedChunkNames.length,
    "California signature official artifacts repeat an evidence chunk filename");
  const actualChunkNames = entries.filter((entry) => entry.name.endsWith(".frame"))
    .map((entry) => entry.name);
  exactStringSet(
    expectedChunkNames,
    actualChunkNames,
    "California signature official evidence chunk inventory"
  );
  const reservations = await loadCaliforniaSignatureEvidenceReservations(
    runDirectory,
    options.expectedIdentity.runId
  );
  assert.ok(reservations.identities.length > 0,
    "California signature run has no durable evidence byte reservations");
  const artifactIds = new Set(loaded.map(({ artifact }) => artifact.artifactId));
  for (const reservation of reservations.identities) {
    assert.ok(artifactIds.has(reservation.artifactId),
      `${reservation.fileName}: reservation belongs to no official artifact`);
  }
  const reservedByArtifact = new Map<string, number>();
  for (const reservation of reservations.identities) {
    reservedByArtifact.set(
      reservation.artifactId,
      (reservedByArtifact.get(reservation.artifactId) ?? 0) + reservation.bytes
    );
  }
  for (const { artifact } of loaded) {
    assert.ok((reservedByArtifact.get(artifact.artifactId) ?? 0) >= artifact.evidenceStream.framedBytes,
      `${artifact.artifactId}: evidence bytes exceed the durable run reservation`);
  }
  assert.ok(loaded.reduce((sum, { artifact }) => sum + artifact.evidenceStream.framedBytes, 0) <=
    reservations.totalBytes,
  "California signature evidence stream bytes exceed total durable run reservations");
  const loadedArtifactByteIdentities = exactCaliforniaSignatureArtifactByteIdentities(loaded);
  if (producer) {
    assertArtifactByteIdentities(
      producer.value.artifacts,
      "California signature producer process-success receipt"
    );
    assert.deepEqual(
      producer.value.artifacts,
      loadedArtifactByteIdentities,
      "California signature official artifact bytes no longer match producer process-success"
    );
    assertEvidenceReservationIdentities(
      producer.value.evidenceReservations,
      "California signature producer process-success receipt"
    );
    assert.deepEqual(
      producer.value.evidenceReservations,
      reservations.identities,
      "California signature evidence reservations no longer match producer process-success"
    );
  }
  if (options.sealState === "required") {
    assert.ok(producer, "California signature terminal seal requires producer process-success");
    const seal = await readJsonFile(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
      "California signature run seal"
    );
    await assertRunSeal({
      entries,
      expectedArtifactsSha256,
      expectedIdentity: options.expectedIdentity,
      manifestSha256: manifest.sha256,
      producer,
      runDirectory,
      seal,
      sealReceipt: options.sealReceipt!,
      evidenceReservations: reservations.identities,
      loadedArtifactByteIdentities
    });
  }
  return { loaded, manifest, producer, reservations, runDirectory };
}

export async function loadCaliforniaSignatureOfficialArtifacts(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
}) {
  return (await loadCaliforniaSignatureArtifactsInternal({
    ...options,
    producerState: "forbidden",
    sealState: "forbidden"
  })).loaded;
}

export async function loadCaliforniaSignatureSealedOfficialArtifacts(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaSignatureProducerSuccessReceipt;
  sealReceipt: CaliforniaSignatureSealReceipt;
}) {
  return (await loadCaliforniaSignatureArtifactsInternal({
    ...options,
    producerState: "required",
    sealState: "required"
  })).loaded;
}

export async function verifyCaliforniaSignatureOfficialArtifactMatrix(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  assert.ok(options.loaded.length > 0, "no California signature official artifacts were loaded");
  const actualByKey = new Map<string, CaliforniaSignatureLoadedArtifact[]>();
  const artifactIds = new Set<string>();
  const fileNames = new Set<string>();
  for (const item of options.loaded) {
    const { artifact, fileName } = item;
    assertRunIdentity(artifact, options.expectedIdentity, fileName);
    assert.equal(artifact.terminalStatus, "passed", `${fileName}: terminal status is not passed`);
    assert.ok(!Number.isNaN(Date.parse(artifact.createdAt)), `${fileName}: createdAt is invalid`);
    assert.ok(artifact.evidenceStream.recordCount > 0,
      `${fileName}: official artifact has no streamed evidence`);
    assert.equal(artifact.execution.retry, 0, `${fileName}: retry drifted from frozen retries=0`);
    const key = `${artifact.projectName}\0${artifact.packageId}\0${artifact.execution.repeatEachIndex}`;
    const grouped = actualByKey.get(key) ?? [];
    grouped.push(item);
    actualByKey.set(key, grouped);
    assert.ok(!artifactIds.has(artifact.artifactId), `${fileName}: duplicate artifactId ${artifact.artifactId}`);
    artifactIds.add(artifact.artifactId);
    assert.ok(!fileNames.has(fileName), `${fileName}: duplicate official filename`);
    fileNames.add(fileName);
  }
  const duplicateKeys = [...actualByKey].filter(([, artifacts]) => artifacts.length !== 1)
    .map(([key]) => key);
  assert.deepEqual(duplicateKeys, [], "California signature official artifacts contain duplicate logical keys");
  const expectedKeys = [...options.expectedMatrix.keys()].sort();
  const actualKeys = [...actualByKey.keys()].sort();
  assert.deepEqual(actualKeys, expectedKeys,
    "California signature official artifact matrix has missing or extra package/project/repeat keys");
  for (const [key, expected] of options.expectedMatrix) {
    const actual = actualByKey.get(key)![0]!;
    assert.equal(actual.fileName, expected.fileName, `${key}: stray or stale official filename`);
    assert.equal(actual.artifact.artifactId, expected.artifactId, `${key}: artifactId drifted`);
    assert.equal(actual.artifact.packageId, expected.packageId, `${key}: packageId drifted`);
    assert.equal(actual.artifact.projectName, expected.projectName, `${key}: projectName drifted`);
    assert.deepEqual(actual.artifact.shard, expected.shard, `${key}: shard drifted`);
    assert.deepEqual(actual.artifact.execution, expected.execution, `${key}: execution drifted`);
    assert.deepEqual(actual.artifact.executionGroupOwnership,
      expected.executionGroupOwnership,
    `${key}: execution-group ownership drifted`);
    const validationContext = options.validationContexts.get(
      californiaSignatureArtifactValidationContextKey(expected.projectName, expected.packageId)
    ) ?? (expected.executionGroupOwnership === null
      ? options.validationContexts.get(expected.packageId)
      : undefined);
    assert.ok(validationContext, `${key}: package validation context is missing`);
    assert.deepEqual(validationContext.executionGroupOwnership,
      expected.executionGroupOwnership,
    `${key}: expected artifact and validation execution-group ownership drifted`);
    exactStringSet(expected.benchIds, validationContext.expectedBenchIds,
      `${key}: expected package and validation benches`);
    await validateCaliforniaSignatureOfficialEvidenceStream({
      artifact: actual.artifact,
      context: validationContext,
      identity: options.expectedIdentity,
      label: `${key}: reloaded official evidence stream`,
      runDirectory: actual.runDirectory
    });
  }
  return [...options.loaded];
}

export type CaliforniaSignatureStreamingAggregateResult = {
  canvasReceiptRows: number;
  canvasSourceSiteCount: number;
  evidenceRows: number;
  runtimeRunId: string;
  snapshot: CaliforniaSignatureEvidenceSnapshot;
  sourceOracleRows: number;
};

const CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS = 2_000_000;
const CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES = 1_500_000;

type CaliforniaSignatureAggregatePackage = {
  benchIds: readonly string[];
  entries: CaliforniaSignatureExpectedArtifact[];
  firstBenchIndex: number;
  packageId: string;
};

function californiaSignatureAggregatePackages(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  manifest: CaliforniaSignatureSourceManifest;
}) {
  const benchIndex = new Map<string, number>(
    options.manifest.benches.map((bench, index) => [bench.benchId, index])
  );
  const byPackage = new Map<string, CaliforniaSignatureAggregatePackage>();
  for (const expected of options.expectedMatrix.values()) {
    assert.ok(expected.execution.repeatEachIndex === 0,
      `${expected.packageId}: terminal aggregate rejects repeated evidence executions`);
    const indices = expected.benchIds.map((benchId) => {
      const index = benchIndex.get(benchId);
      assert.ok(index !== undefined,
        `${expected.packageId}: terminal aggregate cites unknown bench ${benchId}`);
      return index;
    });
    assert.deepEqual(indices, [...indices].sort((left, right) => left - right),
      `${expected.packageId}: terminal aggregate benches are not in source order`);
    const existing = byPackage.get(expected.packageId);
    if (existing) {
      assert.deepEqual(expected.benchIds, existing.benchIds,
        `${expected.packageId}: terminal aggregate project bench ownership drifted`);
      existing.entries.push(expected);
    } else {
      byPackage.set(expected.packageId, {
        benchIds: [...expected.benchIds],
        entries: [expected],
        firstBenchIndex: indices[0]!,
        packageId: expected.packageId
      });
    }
  }
  const packages = [...byPackage.values()].sort((left, right) =>
    left.firstBenchIndex - right.firstBenchIndex
  );
  for (const workPackage of packages) {
    exactStringSet(
      CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
      workPackage.entries.map((entry) => entry.projectName),
      `${workPackage.packageId}: terminal aggregate project partition`
    );
  }
  assert.deepEqual(
    packages.flatMap((workPackage) => workPackage.benchIds),
    options.manifest.benches.map((bench) => bench.benchId),
    "California signature terminal aggregate package benches are not one exact source partition"
  );
  return packages;
}

async function* iterateCaliforniaSignatureActualAggregate(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  manifest: CaliforniaSignatureSourceManifest;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}): AsyncGenerator<CaliforniaSignatureExactEvidenceRecord> {
  const loadedByArtifactId = new Map(options.loaded.map((item) => [item.artifact.artifactId, item]));
  assert.equal(loadedByArtifactId.size, options.loaded.length,
    "California signature terminal aggregate repeats an artifactId");
  const ownershipModes = new Set([...options.expectedMatrix.values()].map((expected) =>
    expected.executionGroupOwnership === null ? "legacy" : "group-plan"
  ));
  assert.equal(ownershipModes.size, 1,
    "California signature terminal aggregate rejects mixed legacy/group-plan ownership");
  if (ownershipModes.has("group-plan")) {
    type GroupCursor = {
      globalOrderKey: string;
      iterator: AsyncGenerator<Record<string, unknown> & { key: string }>;
      record: CaliforniaSignatureExactEvidenceRecord;
    };
    const heap: GroupCursor[] = [];
    const iterators: Array<AsyncGenerator<Record<string, unknown> & { key: string }>> = [];
    const push = (cursor: GroupCursor) => {
      heap.push(cursor);
      let index = heap.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (heap[parent]!.globalOrderKey < heap[index]!.globalOrderKey) break;
        assert.notEqual(heap[parent]!.globalOrderKey, heap[index]!.globalOrderKey,
          "California signature group-plan streams repeat a semantic evidence key");
        [heap[parent], heap[index]] = [heap[index]!, heap[parent]!];
        index = parent;
      }
    };
    const pop = () => {
      const first = heap[0]!;
      const tail = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = tail;
        let index = 0;
        for (;;) {
          const left = index * 2 + 1;
          const right = left + 1;
          let smallest = index;
          if (left < heap.length &&
              heap[left]!.globalOrderKey < heap[smallest]!.globalOrderKey) smallest = left;
          if (right < heap.length &&
              heap[right]!.globalOrderKey < heap[smallest]!.globalOrderKey) smallest = right;
          if (smallest === index) break;
          assert.notEqual(heap[index]!.globalOrderKey, heap[smallest]!.globalOrderKey,
            "California signature group-plan streams repeat a semantic evidence key");
          [heap[index], heap[smallest]] = [heap[smallest]!, heap[index]!];
          index = smallest;
        }
      }
      return first;
    };
    try {
      for (const expected of options.expectedMatrix.values()) {
        assert.ok(expected.executionGroupOwnership,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate ownership is missing`);
        const loaded = loadedByArtifactId.get(expected.artifactId);
        assert.ok(loaded,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate artifact is missing`);
        const context = options.validationContexts.get(
          californiaSignatureArtifactValidationContextKey(
            expected.projectName,
            expected.packageId
          )
        );
        assert.ok(context,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate context is missing`);
        assert.deepEqual(context.executionGroupOwnership, expected.executionGroupOwnership,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate ownership drifted`);
        const iterator = readCaliforniaSignatureEvidenceStream({
          manifest: loaded.artifact.evidenceStream,
          orderKey(record) {
            assertCaliforniaSignatureExactEvidenceRecordSchema(
              record,
              `${expected.packageId}/${expected.projectName}: group-plan local stream order`
            );
            return californiaSignatureExactEvidenceOrderKey({
              manifest: context.manifest,
              record
            });
          },
          runDirectory: loaded.runDirectory
        });
        iterators.push(iterator);
        const first = await iterator.next();
        assert.equal(first.done, false,
          `${expected.packageId}/${expected.projectName}: group-plan stream is empty`);
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          first.value,
          `${expected.packageId}/${expected.projectName}: first group-plan aggregate record`
        );
        push({
          globalOrderKey: californiaSignatureExactEvidenceOrderKey({
            manifest: options.manifest,
            record: first.value
          }),
          iterator,
          record: first.value
        });
      }
      let previousGlobalOrderKey: string | null = null;
      while (heap.length > 0) {
        const cursor = pop();
        assert.ok(previousGlobalOrderKey === null ||
          previousGlobalOrderKey < cursor.globalOrderKey,
        "California signature group-plan aggregate is duplicate or retrograde");
        previousGlobalOrderKey = cursor.globalOrderKey;
        yield cursor.record;
        const next = await cursor.iterator.next();
        if (next.done) continue;
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          next.value,
          "California signature group-plan aggregate record"
        );
        cursor.record = next.value;
        cursor.globalOrderKey = californiaSignatureExactEvidenceOrderKey({
          manifest: options.manifest,
          record: next.value
        });
        push(cursor);
      }
    } finally {
      await Promise.all(iterators.map(async (iterator) => {
        try {
          await iterator.return(undefined);
        } catch {
          // Preserve the primary streaming/authentication failure.
        }
      }));
    }
    return;
  }
  for (const workPackage of californiaSignatureAggregatePackages(options)) {
    const context = options.validationContexts.get(workPackage.packageId);
    assert.ok(context,
      `${workPackage.packageId}: terminal aggregate validation context is missing`);
    type Cursor = {
      globalOrderKey: string;
      iterator: AsyncGenerator<Record<string, unknown> & { key: string }>;
      record: CaliforniaSignatureExactEvidenceRecord;
    };
    const cursors: Cursor[] = [];
    const iterators: Array<AsyncGenerator<Record<string, unknown> & { key: string }>> = [];
    try {
      for (const expected of workPackage.entries) {
        const loaded = loadedByArtifactId.get(expected.artifactId);
        assert.ok(loaded,
          `${workPackage.packageId}/${expected.projectName}: terminal aggregate artifact is missing`);
        const iterator = readCaliforniaSignatureEvidenceStream({
          manifest: loaded.artifact.evidenceStream,
          orderKey(record) {
            assertCaliforniaSignatureExactEvidenceRecordSchema(
              record,
              `${workPackage.packageId}/${expected.projectName}: local stream order`
            );
            return californiaSignatureExactEvidenceOrderKey({
              manifest: context.manifest,
              record
            });
          },
          runDirectory: loaded.runDirectory
        });
        iterators.push(iterator);
        const first = await iterator.next();
        assert.equal(first.done, false,
          `${workPackage.packageId}/${expected.projectName}: terminal aggregate stream is empty`);
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          first.value,
          `${workPackage.packageId}/${expected.projectName}: first aggregate record`
        );
        cursors.push({
          globalOrderKey: californiaSignatureExactEvidenceOrderKey({
            manifest: options.manifest,
            record: first.value
          }),
          iterator,
          record: first.value
        });
      }
      while (cursors.length > 0) {
        let minimumIndex = 0;
        for (let index = 1; index < cursors.length; index += 1) {
          assert.notEqual(cursors[index]!.globalOrderKey, cursors[minimumIndex]!.globalOrderKey,
            `${workPackage.packageId}: project streams repeat a semantic evidence key`);
          if (cursors[index]!.globalOrderKey < cursors[minimumIndex]!.globalOrderKey) {
            minimumIndex = index;
          }
        }
        const cursor = cursors[minimumIndex]!;
        yield cursor.record;
        const next = await cursor.iterator.next();
        if (next.done) {
          cursors.splice(minimumIndex, 1);
          continue;
        }
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          next.value,
          `${workPackage.packageId}: aggregate stream record`
        );
        cursor.record = next.value;
        cursor.globalOrderKey = californiaSignatureExactEvidenceOrderKey({
          manifest: options.manifest,
          record: next.value
        });
      }
    } finally {
      await Promise.all(iterators.map(async (iterator) => {
        try {
          await iterator.return(undefined);
        } catch {
          // Preserve the primary streaming/authentication failure.
        }
      }));
    }
  }
}

/**
 * Terminal, bounded-memory verification.  This independently reopens every
 * authenticated stream and merge-compares each exact record with the lazy
 * full-source oracle.  Only bounded validation batches and global uniqueness
 * identities are retained; no evidence-record array is constructed.
 */
export async function validateCaliforniaSignatureStreamingAggregate(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}): Promise<CaliforniaSignatureStreamingAggregateResult> {
  assert.equal(options.externalExpectations.expectedRuntimeRunId, options.expectedIdentity.runtimeRunId,
    "California signature streaming aggregate runtime identity drifted");
  assert.equal(options.externalExpectations.expectedOrigin, options.expectedIdentity.origin,
    "California signature streaming aggregate origin drifted");
  const expected = iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    manifest: options.manifest,
    oracle: options.sourceEvidenceOracle
  });
  let expectedEntry = expected.next();
  const orderedKeyHash = createHash("sha256");
  const receiptIds = new Set<string>();
  const logicalCanvasStates = new Set<string>();
  const observedCanvasSourceSites = new Set<string>();
  const runtimeRunIds = new Set<string>();
  let evidenceRows = 0;
  let canvasReceiptRows = 0;
  let expectedCanvasReceiptRows = 0;
  let validationBatch: CaliforniaSignatureExactEvidenceRecord[] = [];
  let validationBatchBytes = 0;
  const flush = () => {
    if (validationBatch.length === 0) return;
    validateCaliforniaSignatureEvidenceRecords({
      evidence: validationBatch,
      externalExpectations: options.externalExpectations,
      manifest: options.manifest
    });
    validationBatch = [];
    validationBatchBytes = 0;
  };
  for await (const record of iterateCaliforniaSignatureActualAggregate(options)) {
    assert.ok(evidenceRows < CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS,
      `California signature terminal aggregate exceeds ${CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS} records`);
    assert.equal(expectedEntry.done, false,
      `${record.benchId}/${record.stepKey}: terminal aggregate contains an extra record`);
    const sourceExpectation = expectedEntry.value!;
    const globalOrderKey = californiaSignatureExactEvidenceOrderKey({
      manifest: options.manifest,
      record
    });
    assert.equal(globalOrderKey, sourceExpectation.orderKey,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source semantic order drifted`);
    assert.equal(
      californiaSignatureExpandedOracleKeyFromRecord({ manifest: options.manifest, record }),
      sourceExpectation.key,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source identity drifted`
    );
    assert.equal(record.benchId, sourceExpectation.benchId,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source bench drifted`);
    const sourceRequiresCanvas = sourceExpectation.canvasSurface?.requiredPhases.includes(
      sourceExpectation.phase
    ) ?? false;
    expectedCanvasReceiptRows += sourceRequiresCanvas ? 1 : 0;
    assert.equal(record.canvasGraphicsEvidence !== null, sourceRequiresCanvas,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source Canvas requirement drifted`);
    orderedKeyHash.update(record.key).update("\n");
    const canonicalBytes = Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8");
    if (validationBatch.length > 0 &&
        (validationBatch.length >= 128 || validationBatchBytes + canonicalBytes > 16 * 1024 * 1024)) {
      flush();
    }
    validationBatch.push(record);
    validationBatchBytes += canonicalBytes;
    if (record.canvasGraphicsEvidence) {
      const canvas = record.canvasGraphicsEvidence;
      assert.ok(canvasReceiptRows < CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES,
        `California signature Canvas aggregate exceeds ${CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES} receipts`);
      assert.equal(receiptIds.has(canvas.receiptId), false,
        `California signature Canvas aggregate repeats one-shot receipt ${canvas.receiptId}`);
      receiptIds.add(canvas.receiptId);
      const logicalState = [
        [...new Set(canvas.canvases.map((surface) => surface.benchId))].sort().join(","),
        canvas.capturedUrl,
        canvas.stateKey,
        canvas.surfaceKey
      ].join("|");
      assert.equal(logicalCanvasStates.has(logicalState), false,
        `California signature Canvas aggregate repeats logical state ${logicalState}`);
      logicalCanvasStates.add(logicalState);
      runtimeRunIds.add(canvas.runtimeRunId);
      for (const sourceSiteKey of canvas.observedSourceSiteKeys) {
        observedCanvasSourceSites.add(sourceSiteKey);
      }
      canvasReceiptRows += 1;
    }
    evidenceRows += 1;
    expectedEntry = expected.next();
  }
  flush();
  assert.equal(expectedEntry.done, true,
    "California signature terminal aggregate ended before the complete source oracle");
  assert.equal(canvasReceiptRows, expectedCanvasReceiptRows,
    "California signature terminal aggregate Canvas receipt count drifted from source truth");
  if (expectedCanvasReceiptRows > 0) {
    assert.equal(runtimeRunIds.size, 1,
      "California signature terminal aggregate has a missing or mixed Canvas runtime run");
    assert.deepEqual([...runtimeRunIds], [options.expectedIdentity.runtimeRunId],
      "California signature terminal aggregate Canvas runtime identity drifted");
    const canvasContract = buildCaliforniaCanvasGraphicsSourceContract();
    const expectedCanvasSourceSites = canvasContract.paintSites
      .filter((site) => site.role === "essential")
      .map((site) => site.sourceSiteKey)
      .sort();
    exactStringSet(
      expectedCanvasSourceSites,
      [...observedCanvasSourceSites],
      "California signature terminal aggregate essential Canvas source sites"
    );
  } else {
    assert.equal(runtimeRunIds.size, 0,
      "California signature terminal aggregate carries Canvas runtime IDs without source receipts");
    assert.equal(observedCanvasSourceSites.size, 0,
      "California signature terminal aggregate carries Canvas source sites without source receipts");
  }
  const snapshot: CaliforniaSignatureEvidenceSnapshot = {
    blueprintSha256: options.manifest.blueprintSha256,
    keyCount: evidenceRows,
    keysSha256: orderedKeyHash.digest("hex"),
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
  };
  return {
    canvasReceiptRows,
    canvasSourceSiteCount: observedCanvasSourceSites.size,
    evidenceRows,
    runtimeRunId: options.expectedIdentity.runtimeRunId,
    snapshot,
    sourceOracleRows: options.sourceEvidenceOracle.counts.evidenceRows
  };
}

export function assertReviewedCaliforniaSignatureStreamingAggregate(
  aggregate: CaliforniaSignatureStreamingAggregateResult
) {
  return assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate(aggregate.snapshot);
}

export async function publishCaliforniaSignatureExhaustiveProducerSuccess(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerReportSha256: string;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  assertSha256(options.producerReportSha256,
    "California signature producer Playwright report");
  return withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.expectedIdentity.runId,
    async task() {
      const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory({
        identity: options.expectedIdentity,
        ledgerRoot: options.ledgerRoot
      });
      await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
      const openRun = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "forbidden",
        sealState: "forbidden"
      });
      await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        validationContexts: options.validationContexts
      });
      const producer: CaliforniaSignatureProducerSuccess = {
        ...structuredClone(options.expectedIdentity),
        artifacts: exactCaliforniaSignatureArtifactByteIdentities(openRun.loaded),
        evidenceReservations: openRun.reservations.identities,
        expectedArtifactsSha256: californiaSignatureExpectedArtifactsSha256(options.expectedMatrix),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        producerReportSha256: options.producerReportSha256,
        publishedAt: new Date().toISOString(),
        status: "producer-succeeded"
      };
      const publication = await writeExclusiveJson(
        path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
        producer
      );
      const receipt: CaliforniaSignatureProducerSuccessReceipt = {
        fileName: CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
        sha256: publication.sha256
      };
      const reread = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "required",
        producerSuccessReceipt: receipt,
        sealState: "forbidden"
      });
      await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: reread.loaded,
        validationContexts: options.validationContexts
      });
      return receipt;
    }
  });
}

export async function sealCaliforniaSignatureOfficialArtifactRun(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaSignatureProducerSuccessReceipt;
  validateAggregate(artifacts: readonly CaliforniaSignatureLoadedArtifact[]): Promise<void> | void;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  return withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.expectedIdentity.runId,
    async task() {
      const runDirectory = californiaSignatureArtifactRunDirectory(
        options.ledgerRoot,
        options.expectedIdentity.runId
      );
      await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
      const openRun = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "required",
        sealState: "forbidden"
      });
      const artifacts = await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        validationContexts: options.validationContexts
      });
      await options.validateAggregate(artifacts);
      assert.ok(openRun.producer,
        "California signature finalizer requires producer process-success");
      const sealedArtifacts = exactCaliforniaSignatureArtifactByteIdentities(openRun.loaded);
      assert.deepEqual(
        openRun.producer.value.artifacts,
        sealedArtifacts,
        "California signature finalizer refuses artifact bytes that drifted after producer success"
      );
      const seal: CaliforniaSignatureRunSeal = {
        ...structuredClone(options.expectedIdentity),
        artifacts: sealedArtifacts,
        evidenceReservations: openRun.reservations.identities,
        expectedArtifactsSha256: californiaSignatureExpectedArtifactsSha256(options.expectedMatrix),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        manifestSha256: openRun.manifest.sha256,
        producerReportSha256: openRun.producer.value.producerReportSha256 as string,
        producerSuccessSha256: openRun.producer.sha256,
        sealedAt: new Date().toISOString(),
        status: "sealed"
      };
      const sealPublication = await writeExclusiveJson(
        path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
        seal
      );
      const sealReceipt: CaliforniaSignatureSealReceipt = {
        fileName: CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
        sha256: sealPublication.sha256
      };
      const reloaded = await loadCaliforniaSignatureSealedOfficialArtifacts({
        ...options,
        sealReceipt
      });
      const reloadedArtifacts = await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: reloaded,
        validationContexts: options.validationContexts
      });
      await options.validateAggregate(reloadedArtifacts);
      return { artifacts: reloadedArtifacts, sealReceipt };
    }
  });
}
