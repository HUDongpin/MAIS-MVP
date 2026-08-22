/**
 * Non-destructive evidence sealing for the California signature-lab gate.
 *
 * The archive is intentionally retained. This module never removes or renames
 * it. Retained-run construction, archive inventory, and sidecar I/O are all
 * descriptor-relative: isolated helpers inherit a pre-bound root as fd 3 and
 * use O_NOFOLLOW for every descendant. Authority-bearing descriptors and tree
 * identities remain private in a WeakMap; callers receive frozen metadata only.
 */

import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

const STARSHIP_PREFIX = "/Volumes/Starship/";
const PYTHON_PATH = "/usr/bin/python3";
const EXPECTED_PYTHON_SHA256 =
  "179301dcb41ea78accc3fa0048a7e6f6710d891945a751a34addd622020c1818";
const PASS_RETAINED_SEALED_ARCHIVE = "PASS_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_SEALED_ARCHIVE = "FAIL_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_UNSEALED = "FAIL_RETAINED_UNSEALED";
const MANIFEST_BASENAME = "retained-manifest.json";
const REPORT_BASENAME = "retained-report.json";
const SEAL_BASENAME = "retained-seal.json";
const SIDECAR_BASENAMES = Object.freeze([
  MANIFEST_BASENAME,
  REPORT_BASENAME,
  SEAL_BASENAME,
]);
const ARCHIVE_INVENTORY_SCHEMA =
  "ca.signature-lab.descriptor-archive-inventory.v1";
const SIDECAR_PUBLICATION_SCHEMA =
  "ca.signature-lab.descriptor-sidecar-publication.v1";
const RETAINED_RUN_CREATION_SCHEMA =
  "ca.signature-lab.descriptor-retained-run-creation.v1";
const RETAINED_RUN_MUTATION_SCHEMA =
  "ca.signature-lab.descriptor-retained-run-mutation.v1";
const RETAINED_RUN_BATCH_SCHEMA =
  "ca.signature-lab.descriptor-retained-run-batch.v1";
const RETAINED_EXECUTION_JOURNAL_CREATE_SCHEMA =
  "ca.signature-lab.descriptor-execution-journal-create.v1";
const RETAINED_EXECUTION_JOURNAL_APPEND_SCHEMA =
  "ca.signature-lab.descriptor-execution-journal-append.v1";
const RETAINED_EXECUTION_JOURNAL_PUBLICATION_SCHEMA =
  "ca.signature-lab.execution-journal-publication.v1";
const RETAINED_EXECUTION_JOURNAL_APPEND_PUBLICATION_SCHEMA =
  "ca.signature-lab.execution-journal-append.v1";
const RETAINED_BATCH_PUBLICATION_SCHEMA =
  "ca.signature-lab.retained-batch-publication.v1";
const RETAINED_MUTATION_PROGRESS_SCHEMA =
  "ca.signature-lab.retained-mutation-progress.v1";
const RETAINED_MUTATION_PROGRESS_FD = 4;
const RETAINED_MUTATION_PROGRESS_STAGES = Object.freeze([
  "WORKER_STARTED",
  "REQUEST_READ",
  "REQUEST_VALIDATED",
  "ROOT_BOUND",
  "DIRECTORIES_BOUND",
  "TARGET_ABSENCE_CONFIRMED",
  "INPUT_SIZE_VALIDATED",
  "INPUT_HASH_VERIFIED",
  "TARGET_OPENED",
  "FILE_WRITTEN",
  "FILE_FSYNCED",
  "FILE_READBACK_VERIFIED",
  "DIRECTORIES_FSYNCED",
  "FINAL_BINDING_VERIFIED",
  "RESULT_EMITTED",
  "ERROR_EMITTED",
]);
const RETAINED_MUTATION_WORKER_SCHEMA =
  "ca.signature-lab.retained-mutation-worker.v1";
const RETAINED_MUTATION_WORKER_PROGRESS_SCHEMA =
  "ca.signature-lab.retained-mutation-worker-progress.v1";
const RETAINED_MUTATION_WORKER_PROGRESS_STAGES = Object.freeze([
  "WORKER_STARTED",
  "ROOT_BOUND",
  "READY_EMITTED",
  "REQUEST_READ_BEGIN",
  "REQUEST_READ",
  "BATCH_REQUEST_VALIDATED",
  "BATCH_PAYLOAD_READ_BEGIN",
  "BATCH_PAYLOADS_VERIFIED",
  "REQUEST_VALIDATED",
  "PAYLOAD_READ_BEGIN",
  "PAYLOAD_READ",
  "DIRECTORIES_BOUND",
  "TARGET_ABSENCE_CONFIRMED",
  "INPUT_SIZE_VALIDATED",
  "INPUT_HASH_VERIFIED",
  "TARGET_OPENED",
  "FILE_WRITTEN",
  "FILE_FSYNCED",
  "FILE_READBACK_VERIFIED",
  "DIRECTORIES_FSYNCED",
  "FINAL_BINDING_VERIFIED",
  "BATCH_FINAL_BINDING_VERIFIED",
  "JOURNAL_REQUEST_VALIDATED",
  "JOURNAL_PAYLOAD_READ_BEGIN",
  "JOURNAL_PAYLOADS_VERIFIED",
  "JOURNAL_BOUND",
  "JOURNAL_FRAME_APPENDED",
  "JOURNAL_FSYNCED",
  "JOURNAL_READBACK_VERIFIED",
  "JOURNAL_FINAL_BINDING_VERIFIED",
  "RESULT_EMITTED",
  "WORKER_EXITING",
  "ERROR_EMITTED",
]);
const RETAINED_MUTATION_WORKER_MAX_FRAME_BYTES = 1024 * 1024;
const RETAINED_MUTATION_WORKER_READY_TIMEOUT_MS = 30_000;
const RETAINED_MUTATION_WORKER_CLOSE_TIMEOUT_MS = 30_000;
const SIDECAR_REVALIDATION_SCHEMA =
  "ca.signature-lab.descriptor-sidecar-revalidation.v1";
const MANIFEST_SCHEMA = "ca.signature-lab.retained-evidence-manifest.v1";
const REPORT_SCHEMA = "ca.signature-lab.retained-evidence-report.v1";
const SEAL_SCHEMA = "ca.signature-lab.retained-evidence-seal.v1";
const EXTERNAL_RECEIPT_SCHEMA =
  "ca.signature-lab.retained-external-receipt.v1";
const RETAINED_RUN_INSPECTION_SCHEMA =
  "ca.signature-lab.retained-run-inspection.v1";
const RETAINED_RUN_CLASSIFICATION_BASENAME =
  "INTENTIONALLY_RETAINED_RUN.json";
const STABLE_IDENTITY_FIELDS = Object.freeze([
  "type",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "nlink",
]);
const FULL_IDENTITY_FIELDS = Object.freeze([
  ...STABLE_IDENTITY_FIELDS,
  "size",
  "mtimeNs",
  "ctimeNs",
]);
const RETAINED_RUN_OPEN = "OPEN";
const RETAINED_RUN_CLOSED = "CLOSED";
const RETAINED_RUN_POISONED = "POISONED";
const RETAINED_RUN_STATES = new WeakMap();
const MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES = 64 * 1024 * 1024;
const MAX_RETAINED_SIGNATURE_LAB_BATCH_ENTRIES = 512;
const MAX_RETAINED_SIGNATURE_LAB_BATCH_BYTES = 64 * 1024 * 1024;
const MAX_RETAINED_SIGNATURE_LAB_JOURNAL_GATES = 197;
const MAX_RETAINED_SIGNATURE_LAB_JOURNAL_BYTES = 64 * 1024 * 1024;
const MAX_RETAINED_SIGNATURE_LAB_JOURNAL_RESULT_BYTES =
  3 * MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES;
const MAX_RETAINED_WRITE_BASE64_CHARACTERS = 89_478_488;
const RETAINED_MKDIR_TIMEOUT_MS = 60_000;
const RETAINED_WRITE_TIMEOUT_BASE_MS = 120_000;
const RETAINED_WRITE_TIMEOUT_PER_STARTED_MIB_MS = 1_000;
const RETAINED_WRITE_TIMEOUT_MAX_MS = 180_000;

function retainedSignatureLabMutationTimeoutMs(operation, byteLength) {
  if (operation !== "mkdir" && operation !== "write") {
    throw new Error("retained mutation operation drift");
  }
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new Error("retained mutation byteLength must be a nonnegative safe integer");
  }
  if (operation === "mkdir") {
    if (byteLength !== 0) {
      throw new Error("retained mkdir mutation cannot carry file bytes");
    }
    return RETAINED_MKDIR_TIMEOUT_MS;
  }
  if (byteLength > MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES) {
    throw new Error("retained write exceeds the maximum retained file size of 64 MiB");
  }
  return Math.min(
    RETAINED_WRITE_TIMEOUT_MAX_MS,
    RETAINED_WRITE_TIMEOUT_BASE_MS +
      Math.ceil(byteLength / (1024 * 1024)) *
        RETAINED_WRITE_TIMEOUT_PER_STARTED_MIB_MS,
  );
}

function retainedExecutionJournalTimeoutMs(byteLength) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0 ||
      byteLength > MAX_RETAINED_SIGNATURE_LAB_JOURNAL_RESULT_BYTES) {
    throw new Error("execution journal payload exceeds the bounded aggregate limit");
  }
  return Math.min(
    RETAINED_WRITE_TIMEOUT_MAX_MS,
    RETAINED_WRITE_TIMEOUT_BASE_MS +
      Math.ceil(byteLength / (1024 * 1024)) *
        RETAINED_WRITE_TIMEOUT_PER_STARTED_MIB_MS,
  );
}

const ARCHIVE_INVENTORY_PYTHON_SOURCE = String.raw`import hashlib
import json
import os
import stat
import sys

SCHEMA = "ca.signature-lab.descriptor-archive-inventory.v1"
ROOT_FD = 3


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def entry_type(value):
    if stat.S_ISDIR(value.st_mode):
        return "directory"
    if stat.S_ISREG(value.st_mode):
        return "regular"
    if stat.S_ISLNK(value.st_mode):
        return "symlink"
    return "special"


def stable_identity(value):
    return {
        "type": entry_type(value),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": value.st_uid,
        "gid": value.st_gid,
        "mode": stat.S_IMODE(value.st_mode),
        "nlink": value.st_nlink,
    }


def full_identity(value):
    result = stable_identity(value)
    result.update({
        "size": str(value.st_size),
        "mtimeNs": str(value.st_mtime_ns),
        "ctimeNs": str(value.st_ctime_ns),
    })
    return result


def require_directory(value, label):
    require(stat.S_ISDIR(value.st_mode), label + " is not a physical directory")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o700, label + " mode drift from 0700")
    require(value.st_nlink > 0, label + " has an invalid link count")


def require_regular(value, label):
    require(stat.S_ISREG(value.st_mode), label + " is not a physical regular file")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o600, label + " mode drift from 0600")
    require(value.st_nlink == 1, label + " is not a singleton regular file")


def require_basename(value):
    require(isinstance(value, str) and value not in ("", ".", ".."),
            "archive basename is invalid")
    require("/" not in value and "\x00" not in value,
            "archive basename is invalid")


def hash_descriptor(descriptor):
    os.lseek(descriptor, 0, os.SEEK_SET)
    digest = hashlib.sha256()
    length = 0
    while True:
        chunk = os.read(descriptor, 65536)
        if not chunk:
            break
        length += len(chunk)
        digest.update(chunk)
    return length, digest.hexdigest()


def require_exact_identity(actual, expected, label):
    require(actual == expected, label + " identity drift")


def require_expected_root(actual, expected):
    require(isinstance(expected, dict), "expected root identity is missing")
    require(set(expected) == {"type", "dev", "ino", "uid", "gid", "mode", "nlink"},
            "expected root identity schema drift")
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(actual[key] == expected[key], "archive root " + key + " drift")
    require(isinstance(expected["nlink"], int) and expected["nlink"] > 0,
            "expected root nlink is invalid")
    require(expected["nlink"] <= actual["nlink"],
            "archive root nlink chronology drift")


def require_expected_entry(actual, expected, label):
    require(isinstance(expected, dict), label + " expected entry is missing")
    expected_keys = {"relativePath", "type", "dev", "ino", "uid", "gid", "mode", "nlink"}
    if expected.get("type") == "regular":
        expected_keys.update({"byteLength", "sha256"})
    require(set(expected) == expected_keys, label + " expected entry schema drift")
    require(actual["relativePath"] == expected["relativePath"],
            label + " relative path drift")
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(actual[key] == expected[key], label + " " + key + " drift")
    if expected["type"] == "directory":
        require(isinstance(expected["nlink"], int) and expected["nlink"] > 0,
                label + " expected nlink is invalid")
        require(expected["nlink"] <= actual["nlink"], label + " nlink chronology drift")
    else:
        require(actual["nlink"] == expected["nlink"], label + " nlink drift")
        require(actual["byteLength"] == expected["byteLength"], label + " byte length drift")
        require(actual["sha256"] == expected["sha256"], label + " byte digest drift")


directory_records = []
file_records = []

try:
    request = json.load(sys.stdin)
    require(isinstance(request, dict) and set(request) == {"expectedRootIdentity", "expectedEntries"},
            "archive inventory request schema drift")
    require(isinstance(request["expectedEntries"], list),
            "expected archive inventory is not an array")

    root_before_value = os.fstat(ROOT_FD)
    require_directory(root_before_value, "held archive root")
    root_before = stable_identity(root_before_value)
    require_expected_root(root_before, request["expectedRootIdentity"])

    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    regular_flags = os.O_RDONLY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        directory_flags |= os.O_CLOEXEC
        regular_flags |= os.O_CLOEXEC

    entries = []

    def walk(directory_fd, relative, parent_fd, basename, before):
        names = sorted(os.listdir(directory_fd))
        directory_records.append({
            "descriptor": directory_fd,
            "relative": relative,
            "parentFd": parent_fd,
            "basename": basename,
            "before": before,
            "names": names,
        })
        for child_basename in names:
            require_basename(child_basename)
            child_relative = child_basename if relative == "" else relative + "/" + child_basename
            named_value = os.stat(child_basename, dir_fd=directory_fd,
                                  follow_symlinks=False)
            if stat.S_ISDIR(named_value.st_mode):
                descriptor = os.open(child_basename, directory_flags, dir_fd=directory_fd)
                opened_value = os.fstat(descriptor)
                require_directory(opened_value, "archive directory " + child_relative)
                opened_identity = full_identity(opened_value)
                require_exact_identity(full_identity(named_value), opened_identity,
                                       "archive directory descriptor/name " + child_relative)
                entries.append({"relativePath": child_relative, **opened_identity})
                walk(descriptor, child_relative, directory_fd, child_basename,
                     opened_identity)
            elif stat.S_ISREG(named_value.st_mode):
                descriptor = os.open(child_basename, regular_flags, dir_fd=directory_fd)
                opened_value = os.fstat(descriptor)
                require_regular(opened_value, "archive file " + child_relative)
                opened_identity = full_identity(opened_value)
                require_exact_identity(full_identity(named_value), opened_identity,
                                       "archive file descriptor/name " + child_relative)
                byte_length, digest = hash_descriptor(descriptor)
                require(byte_length == opened_value.st_size,
                        "archive file byte count drift " + child_relative)
                observed = {"relativePath": child_relative, **opened_identity,
                            "byteLength": byte_length, "sha256": digest}
                entries.append(observed)
                file_records.append({
                    "descriptor": descriptor,
                    "relative": child_relative,
                    "parentFd": directory_fd,
                    "basename": child_basename,
                    "before": opened_identity,
                    "byteLength": byte_length,
                    "sha256": digest,
                })
            else:
                raise RuntimeError("archive contains a symlink or special entry: " +
                                   child_relative)

    walk(ROOT_FD, "", None, None, full_identity(root_before_value))
    entries.sort(key=lambda entry: entry["relativePath"])
    require(len(entries) == len(request["expectedEntries"]),
            "archive inventory length drift")
    for index, entry in enumerate(entries):
        require_expected_entry(entry, request["expectedEntries"][index],
                               "archive entry " + entry["relativePath"])

    for observed in directory_records:
        opened_after_value = os.fstat(observed["descriptor"])
        require_directory(opened_after_value,
                          "archive directory recheck " + (observed["relative"] or "."))
        opened_after = full_identity(opened_after_value)
        require_exact_identity(opened_after, observed["before"],
                               "archive directory recheck " + (observed["relative"] or "."))
        require(sorted(os.listdir(observed["descriptor"])) == observed["names"],
                "archive directory basename set drift " + (observed["relative"] or "."))
        if observed["parentFd"] is not None:
            named_after = full_identity(os.stat(observed["basename"],
                                                dir_fd=observed["parentFd"],
                                                follow_symlinks=False))
            require_exact_identity(named_after, opened_after,
                                   "archive named directory recheck " + observed["relative"])

    for observed in file_records:
        opened_after_value = os.fstat(observed["descriptor"])
        require_regular(opened_after_value, "archive file recheck " + observed["relative"])
        opened_after = full_identity(opened_after_value)
        require_exact_identity(opened_after, observed["before"],
                               "archive file recheck " + observed["relative"])
        named_after = full_identity(os.stat(observed["basename"],
                                            dir_fd=observed["parentFd"],
                                            follow_symlinks=False))
        require_exact_identity(named_after, opened_after,
                               "archive named file recheck " + observed["relative"])
        byte_length, digest = hash_descriptor(observed["descriptor"])
        require(byte_length == observed["byteLength"] and digest == observed["sha256"],
                "archive file bytes drift " + observed["relative"])

    for observed in file_records:
        os.fsync(observed["descriptor"])

    def retained_archive_directory_fsync_barrier_deepest_first():
        for observed in reversed(directory_records):
            os.fsync(observed["descriptor"])

    retained_archive_directory_fsync_barrier_deepest_first()

    root_after = stable_identity(os.fstat(ROOT_FD))
    require_exact_identity(root_after, root_before, "held archive root recheck")
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": True,
        "rootIdentity": root_before,
        "entries": entries,
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
except BaseException as error:
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": False,
        "stage": "DESCRIPTOR_ARCHIVE_INVENTORY_REJECTED",
        "errorType": type(error).__name__,
        "errno": getattr(error, "errno", None),
        "message": str(error),
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.exit(66)
finally:
    for observed in reversed(file_records):
        os.close(observed["descriptor"])
    for observed in reversed(directory_records[1:]):
        os.close(observed["descriptor"])
`;

const RETAINED_RUN_CREATION_PYTHON_SOURCE = String.raw`import base64
import errno
import hashlib
import json
import os
import stat
import sys

SCHEMA = "ca.signature-lab.descriptor-retained-run-creation.v1"
ROOT_FD = 3
CLASSIFICATION_NAME = "INTENTIONALLY_RETAINED_RUN.json"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def entry_type(value):
    if stat.S_ISDIR(value.st_mode):
        return "directory"
    if stat.S_ISREG(value.st_mode):
        return "regular"
    if stat.S_ISLNK(value.st_mode):
        return "symlink"
    return "special"


def stable_identity(value):
    return {
        "type": entry_type(value),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": value.st_uid,
        "gid": value.st_gid,
        "mode": stat.S_IMODE(value.st_mode),
        "nlink": value.st_nlink,
    }


def full_identity(value):
    result = stable_identity(value)
    result.update({
        "size": str(value.st_size),
        "mtimeNs": str(value.st_mtime_ns),
        "ctimeNs": str(value.st_ctime_ns),
    })
    return result


def require_owned_parent(value):
    require(stat.S_ISDIR(value.st_mode), "held scratch parent is not a directory")
    require(value.st_uid == os.geteuid(), "held scratch parent uid drift")
    require(stat.S_IMODE(value.st_mode) & 0o022 == 0,
            "held scratch parent is group/world writable")
    require(value.st_nlink > 0, "held scratch parent has an invalid link count")


def require_private_directory(value, label):
    require(stat.S_ISDIR(value.st_mode), label + " is not a physical directory")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o700, label + " mode drift from 0700")
    require(value.st_nlink > 0, label + " has an invalid link count")


def require_private_file(value, label):
    require(stat.S_ISREG(value.st_mode), label + " is not a regular file")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o600, label + " mode drift from 0600")
    require(value.st_nlink == 1, label + " is not a singleton")


def require_expected_stable(actual, expected, label):
    require(isinstance(expected, dict), label + " expected identity is missing")
    require(set(expected) == {"type", "dev", "ino", "uid", "gid", "mode", "nlink"},
            label + " expected identity schema drift")
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(actual[key] == expected[key], label + " " + key + " drift")
    require(isinstance(expected["nlink"], int) and expected["nlink"] > 0,
            label + " expected nlink is invalid")
    require(expected["nlink"] <= actual["nlink"], label + " nlink chronology drift")


def write_all(descriptor, data):
    offset = 0
    while offset < len(data):
        written = os.write(descriptor, data[offset:])
        require(written > 0, "classification write made no progress")
        offset += written


run_fd = None
archive_fd = None
evidence_fd = None
classification_fd = None

try:
    request = json.load(sys.stdin)
    require(isinstance(request, dict) and set(request) == {
        "basename", "classificationBase64", "classificationSha256", "parentIdentity"
    }, "retained run creation request schema drift")
    basename = request["basename"]
    require(isinstance(basename, str) and basename.startswith("signature-lab-retained-run-") and
            len(basename) <= 96 and all(character.isalnum() or character == "-"
                                        for character in basename),
            "retained run basename is invalid")
    classification = base64.b64decode(request["classificationBase64"], validate=True)
    require(hashlib.sha256(classification).hexdigest() == request["classificationSha256"],
            "retained run classification digest drift")

    parent_before_value = os.fstat(ROOT_FD)
    require_owned_parent(parent_before_value)
    parent_before = stable_identity(parent_before_value)
    require_expected_stable(parent_before, request["parentIdentity"], "scratch parent")
    try:
        os.stat(basename, dir_fd=ROOT_FD, follow_symlinks=False)
        raise RuntimeError("retained run basename already exists")
    except FileNotFoundError as error:
        require(error.errno == errno.ENOENT, "retained run absence preflight drift")

    os.mkdir(basename, 0o700, dir_fd=ROOT_FD)
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        directory_flags |= os.O_CLOEXEC
    run_fd = os.open(basename, directory_flags, dir_fd=ROOT_FD)
    os.fchmod(run_fd, 0o700)
    require_private_directory(os.fstat(run_fd), "retained run root")

    os.mkdir("archive", 0o700, dir_fd=run_fd)
    archive_fd = os.open("archive", directory_flags, dir_fd=run_fd)
    os.fchmod(archive_fd, 0o700)
    require_private_directory(os.fstat(archive_fd), "retained archive root")

    os.mkdir("external-evidence", 0o700, dir_fd=run_fd)
    evidence_fd = os.open("external-evidence", directory_flags, dir_fd=run_fd)
    os.fchmod(evidence_fd, 0o700)
    require_private_directory(os.fstat(evidence_fd), "retained evidence root")

    file_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        file_flags |= os.O_CLOEXEC
    classification_fd = os.open(CLASSIFICATION_NAME, file_flags, 0o600,
                                dir_fd=archive_fd)
    os.fchmod(classification_fd, 0o600)
    write_all(classification_fd, classification)
    os.fsync(classification_fd)
    classification_value = os.fstat(classification_fd)
    require_private_file(classification_value, "retained STARTED_UNSEALED classification")
    os.lseek(classification_fd, 0, os.SEEK_SET)
    readback = os.read(classification_fd, len(classification) + 1)
    require(readback == classification, "retained classification readback drift")

    os.fsync(archive_fd)
    os.fsync(evidence_fd)
    os.fsync(run_fd)
    os.fsync(ROOT_FD)

    run_value = os.fstat(run_fd)
    archive_value = os.fstat(archive_fd)
    evidence_value = os.fstat(evidence_fd)
    require(full_identity(os.stat(basename, dir_fd=ROOT_FD, follow_symlinks=False)) ==
            full_identity(run_value), "retained run descriptor/name identity drift")
    require(full_identity(os.stat("archive", dir_fd=run_fd, follow_symlinks=False)) ==
            full_identity(archive_value), "retained archive descriptor/name identity drift")
    require(full_identity(os.stat("external-evidence", dir_fd=run_fd,
                                  follow_symlinks=False)) == full_identity(evidence_value),
            "retained evidence descriptor/name identity drift")
    require(full_identity(os.stat(CLASSIFICATION_NAME, dir_fd=archive_fd,
                                  follow_symlinks=False)) == full_identity(classification_value),
            "retained classification descriptor/name identity drift")
    parent_after = stable_identity(os.fstat(ROOT_FD))
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(parent_after[key] == parent_before[key],
                "scratch parent " + key + " identity drift")

    json.dump({
        "schemaVersion": SCHEMA,
        "ok": True,
        "parentBefore": parent_before,
        "parentAfter": parent_after,
        "runIdentity": stable_identity(run_value),
        "archiveIdentity": stable_identity(archive_value),
        "evidenceIdentity": stable_identity(evidence_value),
        "classification": {
            "basename": CLASSIFICATION_NAME,
            "identity": stable_identity(classification_value),
            "byteLength": len(classification),
            "sha256": request["classificationSha256"],
        },
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
except BaseException as error:
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": False,
        "stage": "DESCRIPTOR_RETAINED_RUN_CREATION_REJECTED",
        "errorType": type(error).__name__,
        "errno": getattr(error, "errno", None),
        "message": str(error),
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.exit(68)
finally:
    if classification_fd is not None:
        os.close(classification_fd)
    if evidence_fd is not None:
        os.close(evidence_fd)
    if archive_fd is not None:
        os.close(archive_fd)
    if run_fd is not None:
        os.close(run_fd)
`;

const RETAINED_RUN_MUTATION_PYTHON_SOURCE = String.raw`import base64
import errno
import hashlib
import io
import json
import os
import stat
import sys

SCHEMA = "ca.signature-lab.descriptor-retained-run-mutation.v1"
BATCH_SCHEMA = "ca.signature-lab.descriptor-retained-run-batch.v1"
JOURNAL_CREATE_SCHEMA = "ca.signature-lab.descriptor-execution-journal-create.v1"
JOURNAL_APPEND_SCHEMA = "ca.signature-lab.descriptor-execution-journal-append.v1"
JOURNAL_HEADER_SCHEMA = "ca.signature-lab.execution-journal-header.v1"
JOURNAL_RECORD_SCHEMA = "ca.signature-lab.execution-journal-record.v1"
ROOT_FD = 3
PROGRESS_SCHEMA = "ca.signature-lab.retained-mutation-progress.v1"
PROGRESS_FD = 4
WORKER_SCHEMA = "ca.signature-lab.retained-mutation-worker.v1"
WORKER_PROGRESS_SCHEMA = "ca.signature-lab.retained-mutation-worker-progress.v1"
WORKER_MAX_FRAME_BYTES = 1024 * 1024
MAX_BATCH_ENTRIES = 512
MAX_BATCH_BYTES = 64 * 1024 * 1024
MAX_JOURNAL_GATES = 197
MAX_JOURNAL_BYTES = 64 * 1024 * 1024
MAX_JOURNAL_RESULT_BYTES = 3 * 64 * 1024 * 1024
PROGRESS_STAGES = {
    "WORKER_STARTED", "REQUEST_READ", "REQUEST_VALIDATED", "ROOT_BOUND",
    "DIRECTORIES_BOUND", "TARGET_ABSENCE_CONFIRMED", "INPUT_SIZE_VALIDATED",
    "INPUT_HASH_VERIFIED", "TARGET_OPENED", "FILE_WRITTEN", "FILE_FSYNCED",
    "FILE_READBACK_VERIFIED", "DIRECTORIES_FSYNCED", "FINAL_BINDING_VERIFIED",
    "RESULT_EMITTED", "ERROR_EMITTED",
}
MAX_RETAINED_WRITE_BYTES = 64 * 1024 * 1024
MAX_RETAINED_WRITE_BASE64_CHARACTERS = 89_478_488


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def publish_progress(stage):
    require(stage in PROGRESS_STAGES, "retained mutation progress stage drift")
    payload = (json.dumps({
        "schemaVersion": PROGRESS_SCHEMA,
        "stage": stage,
    }, separators=(",", ":")) + "\n").encode("utf-8")
    offset = 0
    while offset < len(payload):
        written = os.write(PROGRESS_FD, payload[offset:])
        require(written > 0, "retained mutation progress write made no progress")
        offset += written


def publish_worker_progress(stage):
    require(stage in {
        "WORKER_STARTED", "ROOT_BOUND", "READY_EMITTED", "REQUEST_READ_BEGIN",
        "REQUEST_READ", "BATCH_REQUEST_VALIDATED", "BATCH_PAYLOAD_READ_BEGIN",
        "BATCH_PAYLOADS_VERIFIED", "REQUEST_VALIDATED", "FINAL_BINDING_VERIFIED",
        "PAYLOAD_READ_BEGIN", "PAYLOAD_READ",
        "DIRECTORIES_BOUND", "TARGET_ABSENCE_CONFIRMED", "INPUT_SIZE_VALIDATED",
        "INPUT_HASH_VERIFIED", "TARGET_OPENED", "FILE_WRITTEN", "FILE_FSYNCED",
        "FILE_READBACK_VERIFIED", "DIRECTORIES_FSYNCED",
        "BATCH_FINAL_BINDING_VERIFIED", "RESULT_EMITTED",
        "JOURNAL_REQUEST_VALIDATED", "JOURNAL_BOUND",
        "JOURNAL_PAYLOAD_READ_BEGIN", "JOURNAL_PAYLOADS_VERIFIED",
        "JOURNAL_FRAME_APPENDED", "JOURNAL_FSYNCED",
        "JOURNAL_READBACK_VERIFIED", "JOURNAL_FINAL_BINDING_VERIFIED",
        "WORKER_EXITING", "ERROR_EMITTED",
    }, "retained mutation worker progress stage drift")
    payload = (json.dumps({
        "schemaVersion": WORKER_PROGRESS_SCHEMA,
        "stage": stage,
    }, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    offset = 0
    while offset < len(payload):
        written = os.write(PROGRESS_FD, payload[offset:])
        require(written > 0, "retained mutation worker progress made no progress")
        offset += written


def entry_type(value):
    if stat.S_ISDIR(value.st_mode):
        return "directory"
    if stat.S_ISREG(value.st_mode):
        return "regular"
    if stat.S_ISLNK(value.st_mode):
        return "symlink"
    return "special"


def stable_identity(value):
    return {
        "type": entry_type(value),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": value.st_uid,
        "gid": value.st_gid,
        "mode": stat.S_IMODE(value.st_mode),
        "nlink": value.st_nlink,
    }


def require_private_directory(value, label):
    require(stat.S_ISDIR(value.st_mode), label + " is not a physical directory")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o700, label + " mode drift from 0700")
    require(value.st_nlink > 0, label + " has an invalid link count")


def require_private_file(value, label):
    require(stat.S_ISREG(value.st_mode), label + " is not a regular file")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o600, label + " mode drift from 0600")
    require(value.st_nlink == 1, label + " is not a singleton")


def require_expected(actual, expected, label):
    require(isinstance(expected, dict) and
            set(expected) == {"type", "dev", "ino", "uid", "gid", "mode", "nlink"},
            label + " expected identity schema drift")
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(actual[key] == expected[key], label + " " + key + " identity drift")
    require(isinstance(expected["nlink"], int) and expected["nlink"] > 0 and
            expected["nlink"] <= actual["nlink"], label + " nlink chronology drift")


def require_relative(value):
    require(isinstance(value, str) and value != "" and not value.startswith("/") and
            "\\" not in value and "\x00" not in value,
            "retained relative path is invalid")
    parts = value.split("/")
    require(all(part not in ("", ".", "..") for part in parts),
            "retained relative path is invalid")
    return parts


def require_printable_ascii(value, label, minimum_length=1, maximum_length=None):
    require(isinstance(value, str), label + " must contain printable ASCII only")
    try:
        encoded = value.encode("ascii")
    except UnicodeEncodeError:
        raise RuntimeError(label + " must contain printable ASCII only")
    require(all(0x20 <= byte <= 0x7e for byte in encoded),
            label + " must contain printable ASCII only")
    require(len(encoded) >= minimum_length and
            (maximum_length is None or len(encoded) <= maximum_length),
            label + " printable ASCII byte length drift")
    return value


def require_execution_journal_artifact_path(value, basename):
    parts = require_relative(value)
    require_printable_ascii(
        value, "execution journal artifact relativePath")
    require(len(parts) == 3 and parts[0] == "executions" and
            parts[2] == basename,
            "execution journal artifact path must be " +
            "executions/<gate-directory>/<role>")
    require(len(parts[1].encode("utf-8")) <= 255,
            "execution journal gate-directory exceeds 255 UTF-8 bytes")
    return parts


def write_all(descriptor, data):
    offset = 0
    while offset < len(data):
        written = os.write(descriptor, data[offset:])
        require(written > 0, "retained file write made no progress")
        offset += written


def canonical_json_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def read_exact(stream, length):
    require(isinstance(length, int) and length >= 0,
            "retained mutation worker frame length drift")
    chunks = []
    remaining = length
    while remaining > 0:
        chunk = stream.read(remaining)
        require(chunk not in (b"", None), "retained mutation worker request EOF")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def read_frame(stream):
    prefix = read_exact(stream, 4)
    length = int.from_bytes(prefix, "big")
    require(0 < length <= WORKER_MAX_FRAME_BYTES,
            "retained mutation worker frame length exceeds the limit")
    body = read_exact(stream, length)
    value = json.loads(body.decode("utf-8"))
    require(canonical_json_bytes(value) == body,
            "retained mutation worker frame is not canonical JSON")
    return value


def write_frame(stream, value):
    body = canonical_json_bytes(value)
    require(0 < len(body) <= WORKER_MAX_FRAME_BYTES,
            "retained mutation worker response exceeds the frame limit")
    stream.write(len(body).to_bytes(4, "big"))
    stream.write(body)
    stream.flush()


def perform_worker_mutation(request, data):
    opened_worker_directories = []
    worker_file_fd = None
    try:
        require(isinstance(request, dict) and set(request) == {
            "operation", "relativePath", "rootIdentity", "directories",
            "byteLength", "sha256"
        }, "retained run mutation request schema drift")
        operation = request["operation"]
        require(operation in ("mkdir", "write"), "retained mutation operation drift")
        parts = require_relative(request["relativePath"])
        require(isinstance(request["directories"], list),
                "retained directory binding inventory drift")
        expected_map = {}
        for record in request["directories"]:
            require(isinstance(record, dict) and
                    set(record) == {"relativePath", "identity"},
                    "retained directory record schema drift")
            require(record["relativePath"] not in expected_map,
                    "retained directory record duplicate")
            expected_map[record["relativePath"]] = record["identity"]
        publish_worker_progress("REQUEST_VALIDATED")
        require(isinstance(request["byteLength"], int) and
                not isinstance(request["byteLength"], bool) and
                0 <= request["byteLength"] <= MAX_RETAINED_WRITE_BYTES and
                len(data) == request["byteLength"],
                "retained mutation payload length drift")
        require(operation == "write" or len(data) == 0,
                "retained mkdir mutation carried bytes")
        publish_worker_progress("INPUT_SIZE_VALIDATED")
        require(isinstance(request["sha256"], str) and
                hashlib.sha256(data).hexdigest() == request["sha256"],
                "retained file input digest drift")
        publish_worker_progress("INPUT_HASH_VERIFIED")

        root_before_value = os.fstat(ROOT_FD)
        require_private_directory(root_before_value, "held retained archive root")
        root_before = stable_identity(root_before_value)
        require_expected(root_before, request["rootIdentity"], "retained archive root")
        publish_worker_progress("ROOT_BOUND")
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        if hasattr(os, "O_CLOEXEC"):
            directory_flags |= os.O_CLOEXEC

        parent_fd = ROOT_FD
        relative = ""
        directory_results = []
        limit = len(parts) if operation == "mkdir" else len(parts) - 1
        for index in range(limit):
            basename = parts[index]
            relative = basename if relative == "" else relative + "/" + basename
            created = False
            try:
                named_value = os.stat(basename, dir_fd=parent_fd,
                                      follow_symlinks=False)
            except FileNotFoundError as error:
                require(error.errno == errno.ENOENT,
                        "retained directory absence drift")
                require(operation == "mkdir", "retained directory ENOENT " + relative)
                os.mkdir(basename, 0o700, dir_fd=parent_fd)
                created = True
                named_value = os.stat(basename, dir_fd=parent_fd,
                                      follow_symlinks=False)
            descriptor = os.open(basename, directory_flags, dir_fd=parent_fd)
            opened_worker_directories.append({
                "descriptor": descriptor,
                "parent": parent_fd,
                "basename": basename,
                "relativePath": relative,
            })
            opened_value = os.fstat(descriptor)
            require_private_directory(opened_value, "retained directory " + relative)
            require(stable_identity(named_value) == stable_identity(opened_value),
                    "retained directory descriptor/name drift " + relative)
            expected = expected_map.get(relative)
            if created:
                require(expected is None,
                        "retained directory unexpectedly replaced " + relative)
                os.fchmod(descriptor, 0o700)
            else:
                require(expected is not None, "retained directory is unbound " + relative)
                require_expected(stable_identity(opened_value), expected,
                                 "retained directory " + relative)
            directory_results.append({
                "relativePath": relative,
                "identity": stable_identity(opened_value),
            })
            parent_fd = descriptor
        publish_worker_progress("DIRECTORIES_BOUND")

        file_result = None
        if operation == "write":
            basename = parts[-1]
            try:
                os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
                raise RuntimeError("retained file basename already exists")
            except FileNotFoundError as error:
                require(error.errno == errno.ENOENT, "retained file absence drift")
            publish_worker_progress("TARGET_ABSENCE_CONFIRMED")
            file_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
            if hasattr(os, "O_CLOEXEC"):
                file_flags |= os.O_CLOEXEC
            worker_file_fd = os.open(basename, file_flags, 0o600, dir_fd=parent_fd)
            publish_worker_progress("TARGET_OPENED")
            os.fchmod(worker_file_fd, 0o600)
            write_all(worker_file_fd, data)
            publish_worker_progress("FILE_WRITTEN")
            os.fsync(worker_file_fd)
            publish_worker_progress("FILE_FSYNCED")
            file_value = os.fstat(worker_file_fd)
            require_private_file(file_value, "retained file " + request["relativePath"])
            named_value = os.stat(basename, dir_fd=parent_fd,
                                  follow_symlinks=False)
            require(stable_identity(named_value) == stable_identity(file_value),
                    "retained file descriptor/name drift " + request["relativePath"])
            os.lseek(worker_file_fd, 0, os.SEEK_SET)
            digest = hashlib.sha256()
            length = 0
            while True:
                chunk = os.read(worker_file_fd, 65536)
                if not chunk:
                    break
                length += len(chunk)
                digest.update(chunk)
            require(length == len(data) and digest.hexdigest() == request["sha256"],
                    "retained file readback drift")
            publish_worker_progress("FILE_READBACK_VERIFIED")
            file_result = {
                "relativePath": request["relativePath"],
                "identity": stable_identity(file_value),
                "byteLength": length,
                "sha256": digest.hexdigest(),
            }

        if worker_file_fd is not None:
            os.fsync(worker_file_fd)
        for record in reversed(opened_worker_directories):
            os.fsync(record["descriptor"])
        os.fsync(ROOT_FD)
        publish_worker_progress("DIRECTORIES_FSYNCED")

        for record in opened_worker_directories:
            current = os.fstat(record["descriptor"])
            require_private_directory(current,
                                      "retained directory recheck " +
                                      record["relativePath"])
            named = os.stat(record["basename"], dir_fd=record["parent"],
                            follow_symlinks=False)
            require(stable_identity(named) == stable_identity(current),
                    "retained directory named recheck drift " +
                    record["relativePath"])
        root_after = stable_identity(os.fstat(ROOT_FD))
        for key in ("type", "dev", "ino", "uid", "gid", "mode"):
            require(root_after[key] == root_before[key],
                    "retained archive root " + key + " drift")
        publish_worker_progress("FINAL_BINDING_VERIFIED")
        return {
            "schemaVersion": SCHEMA,
            "ok": True,
            "operation": operation,
            "rootBefore": root_before,
            "rootAfter": root_after,
            "directories": directory_results,
            "file": file_result,
        }
    finally:
        if worker_file_fd is not None:
            os.close(worker_file_fd)
        for record in reversed(opened_worker_directories):
            os.close(record["descriptor"])


def validate_worker_batch(batch, stream):
    require(isinstance(batch, dict) and set(batch) == {
        "schemaVersion", "rootIdentity", "directories", "entryCount",
        "totalByteLength", "entries"
    }, "retained batch request schema drift")
    require(batch["schemaVersion"] == BATCH_SCHEMA,
            "retained batch schema version drift")
    require(isinstance(batch["directories"], list) and
            len(batch["directories"]) <= MAX_BATCH_ENTRIES,
            "retained batch directory binding inventory drift")
    expected_map = {}
    previous_directory = None
    for record in batch["directories"]:
        require(isinstance(record, dict) and
                set(record) == {"relativePath", "identity"},
                "retained batch directory record schema drift")
        relative = record["relativePath"]
        require_relative(relative)
        require(previous_directory is None or previous_directory < relative,
                "retained batch directory order or duplicate drift")
        previous_directory = relative
        expected_map[relative] = record["identity"]

    entry_count = batch["entryCount"]
    total_byte_length = batch["totalByteLength"]
    require(isinstance(entry_count, int) and not isinstance(entry_count, bool) and
            1 <= entry_count <= MAX_BATCH_ENTRIES and
            isinstance(batch["entries"], list) and
            len(batch["entries"]) == entry_count,
            "retained batch entry count drift")
    require(isinstance(total_byte_length, int) and
            not isinstance(total_byte_length, bool) and
            0 <= total_byte_length <= MAX_BATCH_BYTES,
            "retained batch aggregate length drift")
    metadata = []
    parent_paths = set()
    file_paths = set()
    previous_path = None
    computed_total = 0
    for entry in batch["entries"]:
        require(isinstance(entry, dict) and set(entry) == {
            "relativePath", "byteLength", "sha256"
        }, "retained batch entry schema drift")
        relative = entry["relativePath"]
        parts = require_relative(relative)
        require(previous_path is None or previous_path < relative,
                "retained batch entry order or duplicate drift")
        previous_path = relative
        byte_length = entry["byteLength"]
        require(isinstance(byte_length, int) and not isinstance(byte_length, bool) and
                0 <= byte_length <= MAX_RETAINED_WRITE_BYTES,
                "retained batch entry byte length drift")
        digest = entry["sha256"]
        require(isinstance(digest, str) and len(digest) == 64 and
                all(character in "0123456789abcdef" for character in digest),
                "retained batch entry digest schema drift")
        computed_total += byte_length
        require(computed_total <= MAX_BATCH_BYTES,
                "retained batch aggregate length exceeds the limit")
        file_paths.add(relative)
        for index in range(1, len(parts)):
            parent_paths.add("/".join(parts[:index]))
        metadata.append({
            "relativePath": relative,
            "parts": parts,
            "byteLength": byte_length,
            "sha256": digest,
        })
    require(computed_total == total_byte_length,
            "retained batch aggregate length mismatch")
    require(len(parent_paths) <= MAX_BATCH_ENTRIES,
            "retained batch parent directory count exceeds the limit")
    require(file_paths.isdisjoint(parent_paths),
            "retained batch file and directory paths collide")
    publish_worker_progress("BATCH_REQUEST_VALIDATED")

    root_before_value = os.fstat(ROOT_FD)
    require_private_directory(root_before_value, "held retained batch archive root")
    root_before = stable_identity(root_before_value)
    require_expected(root_before, batch["rootIdentity"],
                     "retained batch archive root")
    publish_worker_progress("ROOT_BOUND")

    publish_worker_progress("BATCH_PAYLOAD_READ_BEGIN")
    payloads = []
    for entry in metadata:
        payload = read_exact(stream, entry["byteLength"])
        require(len(payload) == entry["byteLength"] and
                hashlib.sha256(payload).hexdigest() == entry["sha256"],
                "retained batch payload digest drift " + entry["relativePath"])
        payloads.append(payload)
    require(sum(len(payload) for payload in payloads) == total_byte_length,
            "retained batch payload aggregate drift")
    publish_worker_progress("BATCH_PAYLOADS_VERIFIED")
    return {
        "metadata": metadata,
        "payloads": payloads,
        "parentPaths": sorted(parent_paths),
        "expectedMap": expected_map,
        "rootBefore": root_before,
    }


def perform_worker_batch(batch, prepared):
    retain_open_bindings = prepared.get("retainOpenBindings") is True
    opened_directories = []
    directory_by_path = {"": {"descriptor": ROOT_FD}}
    file_bindings = []
    retained_success = False
    try:
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        if hasattr(os, "O_CLOEXEC"):
            directory_flags |= os.O_CLOEXEC
        parent_first = sorted(
            prepared["parentPaths"],
            key=lambda value: (len(value.split("/")), value),
        )
        for relative in parent_first:
            parent_relative, unused_separator, basename = relative.rpartition("/")
            parent_record = directory_by_path.get(parent_relative)
            require(parent_record is not None,
                    "retained batch parent directory binding is missing " + relative)
            parent_fd = parent_record["descriptor"]
            created = False
            try:
                named_value = os.stat(basename, dir_fd=parent_fd,
                                      follow_symlinks=False)
            except FileNotFoundError as error:
                require(error.errno == errno.ENOENT,
                        "retained batch directory absence drift")
                os.mkdir(basename, 0o700, dir_fd=parent_fd)
                created = True
                named_value = os.stat(basename, dir_fd=parent_fd,
                                      follow_symlinks=False)
            descriptor = os.open(basename, directory_flags, dir_fd=parent_fd)
            record = {
                "descriptor": descriptor,
                "parent": parent_fd,
                "basename": basename,
                "relativePath": relative,
            }
            opened_directories.append(record)
            directory_by_path[relative] = record
            opened_value = os.fstat(descriptor)
            require_private_directory(opened_value,
                                      "retained batch directory " + relative)
            require(stable_identity(named_value) == stable_identity(opened_value),
                    "retained batch directory descriptor/name drift " + relative)
            expected = prepared["expectedMap"].get(relative)
            if created:
                require(expected is None,
                        "retained batch directory unexpectedly replaced " + relative)
                os.fchmod(descriptor, 0o700)
            else:
                require(expected is not None,
                        "retained batch directory is unbound " + relative)
                require_expected(stable_identity(opened_value), expected,
                                 "retained batch directory " + relative)
        publish_worker_progress("DIRECTORIES_BOUND")

        for entry in prepared["metadata"]:
            parent_relative = "/".join(entry["parts"][:-1])
            parent_record = directory_by_path.get(parent_relative)
            require(parent_record is not None,
                    "retained batch target parent binding is missing")
            try:
                os.stat(entry["parts"][-1],
                        dir_fd=parent_record["descriptor"], follow_symlinks=False)
                raise RuntimeError("retained batch target already exists " +
                                   entry["relativePath"])
            except FileNotFoundError as error:
                require(error.errno == errno.ENOENT,
                        "retained batch target absence drift")
        publish_worker_progress("TARGET_ABSENCE_CONFIRMED")

        file_results = []
        for entry, payload in zip(prepared["metadata"], prepared["payloads"]):
            parent_relative = "/".join(entry["parts"][:-1])
            parent_record = directory_by_path[parent_relative]
            basename = entry["parts"][-1]
            file_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
            if hasattr(os, "O_CLOEXEC"):
                file_flags |= os.O_CLOEXEC
            descriptor = None
            try:
                descriptor = os.open(
                    basename,
                    file_flags,
                    0o600,
                    dir_fd=parent_record["descriptor"],
                )
                publish_worker_progress("TARGET_OPENED")
                os.fchmod(descriptor, 0o600)
                write_all(descriptor, payload)
                publish_worker_progress("FILE_WRITTEN")
                os.fsync(descriptor)
                publish_worker_progress("FILE_FSYNCED")
                file_value = os.fstat(descriptor)
                require_private_file(file_value,
                                     "retained batch file " + entry["relativePath"])
                named_value = os.stat(
                    basename,
                    dir_fd=parent_record["descriptor"],
                    follow_symlinks=False,
                )
                identity = stable_identity(file_value)
                require(stable_identity(named_value) == identity,
                        "retained batch file descriptor/name drift " +
                        entry["relativePath"])
                os.lseek(descriptor, 0, os.SEEK_SET)
                digest = hashlib.sha256()
                length = 0
                while True:
                    chunk = os.read(descriptor, 65536)
                    if not chunk:
                        break
                    length += len(chunk)
                    digest.update(chunk)
                require(length == entry["byteLength"] and
                        digest.hexdigest() == entry["sha256"],
                        "retained batch file readback drift " + entry["relativePath"])
                publish_worker_progress("FILE_READBACK_VERIFIED")
                result = {
                    "relativePath": entry["relativePath"],
                    "identity": identity,
                    "byteLength": length,
                    "sha256": digest.hexdigest(),
                }
                file_results.append(result)
                file_bindings.append({
                    "descriptor": descriptor if retain_open_bindings else None,
                    "parent": parent_record["descriptor"],
                    "basename": basename,
                    "relativePath": entry["relativePath"],
                    "identity": identity,
                    "byteLength": length,
                    "sha256": digest.hexdigest(),
                    "payload": payload,
                })
                if retain_open_bindings:
                    descriptor = None
            finally:
                if descriptor is not None:
                    os.close(descriptor)

        deepest_first = sorted(
            prepared["parentPaths"],
            key=lambda value: (-len(value.split("/")), value),
        )
        for relative in deepest_first:
            os.fsync(directory_by_path[relative]["descriptor"])
        os.fsync(ROOT_FD)
        publish_worker_progress("DIRECTORIES_FSYNCED")

        directory_results = []
        for relative in prepared["parentPaths"]:
            record = directory_by_path[relative]
            current = os.fstat(record["descriptor"])
            require_private_directory(current,
                                      "retained batch directory recheck " + relative)
            named = os.stat(record["basename"], dir_fd=record["parent"],
                            follow_symlinks=False)
            identity = stable_identity(current)
            require(stable_identity(named) == identity,
                    "retained batch directory named recheck drift " + relative)
            directory_results.append({
                "relativePath": relative,
                "identity": identity,
            })
        for binding in file_bindings:
            named = os.stat(binding["basename"], dir_fd=binding["parent"],
                            follow_symlinks=False)
            require_private_file(named,
                                 "retained batch file recheck " +
                                 binding["relativePath"])
            require(stable_identity(named) == binding["identity"],
                    "retained batch file named recheck drift " +
                    binding["relativePath"])
        root_after = stable_identity(os.fstat(ROOT_FD))
        require_expected(root_after, batch["rootIdentity"],
                         "retained batch archive root final")
        for key in ("type", "dev", "ino", "uid", "gid", "mode"):
            require(root_after[key] == prepared["rootBefore"][key],
                    "retained batch archive root " + key + " drift")
        publish_worker_progress("BATCH_FINAL_BINDING_VERIFIED")
        result = {
            "schemaVersion": BATCH_SCHEMA,
            "ok": True,
            "rootBefore": prepared["rootBefore"],
            "rootAfter": root_after,
            "entryCount": batch["entryCount"],
            "totalByteLength": batch["totalByteLength"],
            "directories": directory_results,
            "files": file_results,
        }
        if retain_open_bindings:
            result["_retainedBindings"] = {
                "directories": opened_directories,
                "files": file_bindings,
            }
            retained_success = True
        return result
    finally:
        if not retained_success:
            for binding in reversed(file_bindings):
                descriptor = binding.get("descriptor")
                if descriptor is not None:
                    os.close(descriptor)
                    binding["descriptor"] = None
            for record in reversed(opened_directories):
                os.close(record["descriptor"])


def close_retained_batch_bindings(bindings):
    if bindings is None:
        return
    for binding in reversed(bindings["files"]):
        descriptor = binding.get("descriptor")
        if descriptor is not None:
            os.close(descriptor)
            binding["descriptor"] = None
    for record in reversed(bindings["directories"]):
        descriptor = record.get("descriptor")
        if descriptor is not None:
            os.close(descriptor)
            record["descriptor"] = None


def revalidate_retained_journal_artifacts(bindings, batch, root_before):
    require(isinstance(bindings, dict) and
            set(bindings) == {"directories", "files"},
            "execution journal retained artifact binding schema drift")
    for binding in bindings["files"]:
        descriptor = binding["descriptor"]
        current = os.fstat(descriptor)
        require_private_file(
            current, "execution journal retained artifact " +
            binding["relativePath"])
        identity = stable_identity(current)
        require(identity == binding["identity"],
                "execution journal artifact descriptor identity drift " +
                binding["relativePath"])
        named = os.stat(binding["basename"], dir_fd=binding["parent"],
                        follow_symlinks=False)
        require(stable_identity(named) == identity,
                "execution journal artifact final binding identity drift " +
                binding["relativePath"])
        os.lseek(descriptor, 0, os.SEEK_SET)
        digest = hashlib.sha256()
        length = 0
        expected_payload = binding["payload"]
        while True:
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            require(chunk == expected_payload[length:length + len(chunk)],
                    "execution journal artifact final exact byte drift " +
                    binding["relativePath"])
            length += len(chunk)
            require(length <= binding["byteLength"],
                    "execution journal artifact final byte length drift " +
                    binding["relativePath"])
            digest.update(chunk)
        require(length == binding["byteLength"] and
                digest.hexdigest() == binding["sha256"],
                "execution journal artifact final byte readback drift " +
                binding["relativePath"])
        final_named = os.stat(binding["basename"], dir_fd=binding["parent"],
                              follow_symlinks=False)
        require(stable_identity(final_named) == identity,
                "execution journal artifact final name identity drift " +
                binding["relativePath"])

    for record in reversed(bindings["directories"]):
        current = os.fstat(record["descriptor"])
        require_private_directory(
            current, "execution journal retained artifact parent " +
            record["relativePath"])
        named = os.stat(record["basename"], dir_fd=record["parent"],
                        follow_symlinks=False)
        require(stable_identity(named) == stable_identity(current),
                "execution journal artifact parent identity drift " +
                record["relativePath"])
    root_after = stable_identity(os.fstat(ROOT_FD))
    require_expected(root_after, batch["rootIdentity"],
                     "execution journal retained artifact archive root")
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(root_after[key] == root_before[key],
                "execution journal retained artifact archive root " + key +
                " identity drift")
    return root_after


def require_sha256(value, label):
    require(isinstance(value, str) and len(value) == 64 and
            all(character in "0123456789abcdef" for character in value),
            label + " is not one lowercase SHA-256")
    return value


def validate_worker_directory_bindings(records, label):
    require(isinstance(records, list) and len(records) <= MAX_BATCH_ENTRIES,
            label + " inventory drift")
    expected_map = {}
    previous = None
    for record in records:
        require(isinstance(record, dict) and
                set(record) == {"relativePath", "identity"},
                label + " record schema drift")
        relative = record["relativePath"]
        require_relative(relative)
        require(previous is None or previous < relative,
                label + " order or duplicate drift")
        previous = relative
        require(relative not in expected_map, label + " duplicate")
        expected_map[relative] = record["identity"]
    return expected_map


def require_journal_identity(value, label):
    require(isinstance(value, dict) and set(value) == {
        "type", "dev", "ino", "uid", "gid", "mode", "nlink"
    }, label + " identity schema drift")
    require(value["type"] == "regular" and
            isinstance(value["dev"], str) and value["dev"].isdigit() and
            isinstance(value["ino"], str) and value["ino"].isdigit() and
            isinstance(value["uid"], int) and not isinstance(value["uid"], bool) and
            isinstance(value["gid"], int) and not isinstance(value["gid"], bool) and
            value["mode"] == 0o600 and value["nlink"] == 1,
            label + " identity is not one private regular singleton")
    return value


def require_journal_artifact_record(value, label):
    require(isinstance(value, dict) and set(value) == {
        "relativePath", "identity", "byteLength", "sha256"
    }, label + " artifact schema drift")
    require_printable_ascii(
        value["relativePath"], "execution journal artifact relativePath")
    require_journal_identity(value["identity"], label)
    require(isinstance(value["byteLength"], int) and
            not isinstance(value["byteLength"], bool) and
            0 <= value["byteLength"] <= MAX_RETAINED_WRITE_BYTES,
            label + " artifact length drift")
    require_sha256(value["sha256"], label + " artifact sha256")
    return value


def execution_journal_frame(body):
    body_bytes = canonical_json_bytes(body)
    require(0 < len(body_bytes) <= WORKER_MAX_FRAME_BYTES,
            "execution journal frame body exceeds the limit")
    prefix = len(body_bytes).to_bytes(4, "big")
    digest_bytes = hashlib.sha256(prefix + body_bytes).digest()
    return prefix + body_bytes + digest_bytes, digest_bytes.hex()


def parse_execution_journal(data):
    require(isinstance(data, bytes) and 0 < len(data) <= MAX_JOURNAL_BYTES,
            "execution journal byte length drift")
    frames = []
    offset = 0
    while offset < len(data):
        require(len(data) - offset >= 4,
                "execution journal frame prefix is truncated")
        prefix = data[offset:offset + 4]
        body_length = int.from_bytes(prefix, "big")
        require(0 < body_length <= WORKER_MAX_FRAME_BYTES,
                "execution journal frame body length drift")
        frame_end = offset + 4 + body_length + 32
        require(frame_end <= len(data),
                "execution journal frame body or digest is truncated")
        body_bytes = data[offset + 4:offset + 4 + body_length]
        digest_bytes = data[offset + 4 + body_length:frame_end]
        body = json.loads(body_bytes.decode("utf-8"))
        require(canonical_json_bytes(body) == body_bytes,
                "execution journal frame is not canonical JSON")
        computed = hashlib.sha256(prefix + body_bytes).digest()
        require(computed == digest_bytes,
                "execution journal frame digest drift")
        frames.append({"body": body, "sha256": computed.hex()})
        offset = frame_end
    require(len(frames) >= 1, "execution journal header is missing")

    header = frames[0]["body"]
    require(isinstance(header, dict) and set(header) == {
        "schemaVersion", "encoding", "planSha256", "plannedGateCount",
        "plannedGateIdsSha256", "plannedGates", "expectedEventCount"
    }, "execution journal header schema drift")
    require(header["schemaVersion"] == JOURNAL_HEADER_SCHEMA and
            header["encoding"] == "U32BE_CANONICAL_JSON_SHA256_CHAIN",
            "execution journal header version or encoding drift")
    require_sha256(header["planSha256"], "execution journal planSha256")
    require_sha256(header["plannedGateIdsSha256"],
                   "execution journal plannedGateIdsSha256")
    planned_count = header["plannedGateCount"]
    planned_gates = header["plannedGates"]
    require(isinstance(planned_count, int) and
            not isinstance(planned_count, bool) and
            1 <= planned_count <= MAX_JOURNAL_GATES and
            isinstance(planned_gates, list) and
            len(planned_gates) == planned_count and
            header["expectedEventCount"] == planned_count * 2,
            "execution journal planned gate count drift")
    seen_gate_ids = set()
    for index, gate in enumerate(planned_gates):
        require(isinstance(gate, dict) and set(gate) == {"ordinal", "gateId"},
                "execution journal planned gate schema drift")
        require(gate["ordinal"] == index + 1,
                "execution journal planned gate order or id drift")
        require_printable_ascii(
            gate["gateId"], "execution journal planned gateId", 1, 512)
        require(gate["gateId"] not in seen_gate_ids,
                "execution journal planned gate order or id drift")
        seen_gate_ids.add(gate["gateId"])
    planned_ids_digest = hashlib.sha256(
        canonical_json_bytes(planned_gates) + b"\n"
    ).hexdigest()
    require(planned_ids_digest == header["plannedGateIdsSha256"],
            "execution journal planned gate identity digest drift")

    record_count = 0
    next_event_type = "STARTED"
    next_ordinal = 1
    previous_frame_sha256 = frames[0]["sha256"]
    pending_attempt = None
    for frame in frames[1:]:
        record = frame["body"]
        require(isinstance(record, dict),
                "execution journal record is not one object")
        record_type = record.get("recordType")
        sequence = record_count + 1
        gate = planned_gates[next_ordinal - 1]
        if record_type == "STARTED":
            require(set(record) == {
                "schemaVersion", "recordType", "sequence",
                "previousFrameSha256", "ordinal", "gateId", "attempt"
            }, "execution journal STARTED schema drift")
            require(next_event_type == "STARTED" and
                    record["schemaVersion"] == JOURNAL_RECORD_SCHEMA and
                    record["sequence"] == sequence and
                    record["previousFrameSha256"] == previous_frame_sha256 and
                    record["ordinal"] == next_ordinal and
                    record["gateId"] == gate["gateId"],
                    "execution journal STARTED sequence or gate drift")
            attempt = require_journal_artifact_record(
                record["attempt"], "execution journal STARTED attempt")
            require_execution_journal_artifact_path(
                attempt["relativePath"], "attempt.json")
            pending_attempt = attempt
            next_event_type = "RESULT"
        elif record_type == "RESULT":
            require(set(record) == {
                "schemaVersion", "recordType", "sequence",
                "previousFrameSha256", "ordinal", "gateId", "status",
                "exitCode", "signal", "stdout", "stderr", "result"
            }, "execution journal RESULT schema drift")
            require(next_event_type == "RESULT" and pending_attempt is not None and
                    record["schemaVersion"] == JOURNAL_RECORD_SCHEMA and
                    record["sequence"] == sequence and
                    record["previousFrameSha256"] == previous_frame_sha256 and
                    record["ordinal"] == next_ordinal and
                    record["gateId"] == gate["gateId"] and
                    record["status"] in ("PASS", "FAIL") and
                    (record["exitCode"] is None or
                     (isinstance(record["exitCode"], int) and
                      not isinstance(record["exitCode"], bool))) and
                    (record["signal"] is None or
                     (isinstance(record["signal"], str) and
                      1 <= len(record["signal"]) <= 64)),
                    "execution journal RESULT sequence or status drift")
            if record["signal"] is not None:
                require_printable_ascii(
                    record["signal"], "execution journal RESULT signal", 1, 64)
            require(record["status"] != "PASS" or
                    (record["exitCode"] == 0 and record["signal"] is None),
                    "execution journal PASS requires exitCode 0 and signal null")
            require(record["signal"] is None or record["exitCode"] is None,
                    "execution journal signaled RESULT requires exitCode null")
            artifacts = []
            for role, basename in (
                ("stdout", "stdout.bin"),
                ("stderr", "stderr.bin"),
                ("result", "result.json"),
            ):
                artifact = require_journal_artifact_record(
                    record[role], "execution journal RESULT " + role)
                require_execution_journal_artifact_path(
                    artifact["relativePath"], basename)
                artifacts.append(artifact)
            attempt_parent = pending_attempt["relativePath"].rsplit("/", 1)[0]
            require(all(artifact["relativePath"].rsplit("/", 1)[0] ==
                        attempt_parent for artifact in artifacts),
                    "execution journal RESULT artifact parent drift")
            pending_attempt = None
            next_ordinal += 1
            next_event_type = ("COMPLETE" if next_ordinal > planned_count
                               else "STARTED")
        else:
            raise RuntimeError("execution journal record type drift")
        record_count += 1
        previous_frame_sha256 = frame["sha256"]

    return {
        "header": header,
        "recordCount": record_count,
        "lastFrameSha256": previous_frame_sha256,
        "nextEventType": next_event_type,
        "nextOrdinal": next_ordinal,
        "lastRecord": None if len(frames) == 1 else frames[-1]["body"],
        "byteLength": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def open_bound_execution_journal(journal, directories):
    require(isinstance(journal, dict) and set(journal) == {
        "relativePath", "identity", "byteLength", "sha256", "planSha256",
        "plannedGateCount", "plannedGateIdsSha256", "recordCount",
        "lastFrameSha256", "nextEventType", "nextOrdinal"
    }, "execution journal binding schema drift")
    parts = require_relative(journal["relativePath"])
    require(journal["relativePath"] ==
            "executions/execution-journal.v1.bin",
            "execution journal relative path drift")
    expected_map = validate_worker_directory_bindings(
        directories, "execution journal directory binding")
    require_journal_identity(journal["identity"], "execution journal")
    require(isinstance(journal["byteLength"], int) and
            0 < journal["byteLength"] <= MAX_JOURNAL_BYTES,
            "execution journal expected byte length drift")
    require_sha256(journal["sha256"], "execution journal expected sha256")
    require_sha256(journal["planSha256"], "execution journal planSha256")
    require_sha256(journal["plannedGateIdsSha256"],
                   "execution journal plannedGateIdsSha256")
    require_sha256(journal["lastFrameSha256"],
                   "execution journal lastFrameSha256")

    opened_directories = []
    descriptor = None
    try:
        parent_fd = ROOT_FD
        relative = ""
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        if hasattr(os, "O_CLOEXEC"):
            directory_flags |= os.O_CLOEXEC
        for basename in parts[:-1]:
            relative = basename if relative == "" else relative + "/" + basename
            expected = expected_map.get(relative)
            require(expected is not None,
                    "execution journal parent directory is unbound " + relative)
            named = os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
            opened = os.open(basename, directory_flags, dir_fd=parent_fd)
            current = os.fstat(opened)
            require_private_directory(current,
                                      "execution journal directory " + relative)
            require(stable_identity(named) == stable_identity(current),
                    "execution journal directory descriptor/name drift " + relative)
            require_expected(stable_identity(current), expected,
                             "execution journal directory " + relative)
            opened_directories.append({
                "descriptor": opened,
                "parent": parent_fd,
                "basename": basename,
                "relativePath": relative,
            })
            parent_fd = opened
        flags = os.O_RDWR | os.O_APPEND | os.O_NOFOLLOW
        if hasattr(os, "O_CLOEXEC"):
            flags |= os.O_CLOEXEC
        descriptor = os.open(parts[-1], flags, dir_fd=parent_fd)
        opened_value = os.fstat(descriptor)
        require_private_file(opened_value, "execution journal")
        named_value = os.stat(parts[-1], dir_fd=parent_fd, follow_symlinks=False)
        identity = stable_identity(opened_value)
        require(stable_identity(named_value) == identity,
                "execution journal descriptor/name drift")
        require(identity == journal["identity"],
                "execution journal exact identity drift")
        os.lseek(descriptor, 0, os.SEEK_SET)
        chunks = []
        length = 0
        while True:
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            chunks.append(chunk)
            length += len(chunk)
            require(length <= MAX_JOURNAL_BYTES,
                    "execution journal exceeds the byte limit")
        data = b"".join(chunks)
        parsed = parse_execution_journal(data)
        header = parsed["header"]
        require(parsed["byteLength"] == journal["byteLength"] and
                parsed["sha256"] == journal["sha256"] and
                header["planSha256"] == journal["planSha256"] and
                header["plannedGateCount"] == journal["plannedGateCount"] and
                header["plannedGateIdsSha256"] ==
                    journal["plannedGateIdsSha256"] and
                parsed["recordCount"] == journal["recordCount"] and
                parsed["lastFrameSha256"] == journal["lastFrameSha256"] and
                parsed["nextEventType"] == journal["nextEventType"] and
                parsed["nextOrdinal"] == journal["nextOrdinal"],
                "execution journal cached binding drift")
        publish_worker_progress("JOURNAL_BOUND")
        return {
            "descriptor": descriptor,
            "directories": opened_directories,
            "parent": parent_fd,
            "basename": parts[-1],
            "identity": identity,
            "data": data,
            "parsed": parsed,
        }
    except BaseException:
        if descriptor is not None:
            os.close(descriptor)
        for record in reversed(opened_directories):
            os.close(record["descriptor"])
        raise


def close_bound_execution_journal(opened):
    os.close(opened["descriptor"])
    for record in reversed(opened["directories"]):
        os.close(record["descriptor"])


def journal_summary(relative_path, identity, parsed):
    header = parsed["header"]
    return {
        "relativePath": relative_path,
        "identity": identity,
        "byteLength": parsed["byteLength"],
        "sha256": parsed["sha256"],
        "planSha256": header["planSha256"],
        "plannedGateCount": header["plannedGateCount"],
        "plannedGateIdsSha256": header["plannedGateIdsSha256"],
        "recordCount": parsed["recordCount"],
        "lastFrameSha256": parsed["lastFrameSha256"],
        "nextEventType": parsed["nextEventType"],
        "nextOrdinal": parsed["nextOrdinal"],
    }


def initialize_worker_execution_journal(journal):
    require(isinstance(journal, dict) and set(journal) == {
        "schemaVersion", "rootIdentity", "directories", "relativePath",
        "planSha256", "plannedGates"
    }, "execution journal creation request schema drift")
    require(journal["schemaVersion"] == JOURNAL_CREATE_SCHEMA and
            journal["relativePath"] ==
                "executions/execution-journal.v1.bin",
            "execution journal creation schema or path drift")
    require_sha256(journal["planSha256"], "execution journal planSha256")
    planned_gates = journal["plannedGates"]
    require(isinstance(planned_gates, list) and
            1 <= len(planned_gates) <= MAX_JOURNAL_GATES,
            "execution journal planned gate inventory drift")
    seen_gate_ids = set()
    for index, gate in enumerate(planned_gates):
        require(isinstance(gate, dict) and set(gate) == {"ordinal", "gateId"} and
                gate["ordinal"] == index + 1,
                "execution journal planned gate order or id drift")
        require_printable_ascii(
            gate["gateId"], "execution journal planned gateId", 1, 512)
        require(gate["gateId"] not in seen_gate_ids,
                "execution journal planned gate order or id drift")
        seen_gate_ids.add(gate["gateId"])
    planned_gate_ids_sha256 = hashlib.sha256(
        canonical_json_bytes(planned_gates) + b"\n"
    ).hexdigest()
    header = {
        "schemaVersion": JOURNAL_HEADER_SCHEMA,
        "encoding": "U32BE_CANONICAL_JSON_SHA256_CHAIN",
        "planSha256": journal["planSha256"],
        "plannedGateCount": len(planned_gates),
        "plannedGateIdsSha256": planned_gate_ids_sha256,
        "plannedGates": planned_gates,
        "expectedEventCount": len(planned_gates) * 2,
    }
    frame, unused_frame_sha256 = execution_journal_frame(header)
    batch = {
        "schemaVersion": BATCH_SCHEMA,
        "rootIdentity": journal["rootIdentity"],
        "directories": journal["directories"],
        "entryCount": 1,
        "totalByteLength": len(frame),
        "entries": [{
            "relativePath": journal["relativePath"],
            "byteLength": len(frame),
            "sha256": hashlib.sha256(frame).hexdigest(),
        }],
    }
    prepared = validate_worker_batch(batch, io.BytesIO(frame))
    result = perform_worker_batch(batch, prepared)
    require(len(result["files"]) == 1,
            "execution journal creation file result drift")
    file_result = result["files"][0]
    directory_bindings = list(journal["directories"])
    for record in result["directories"]:
        if all(existing["relativePath"] != record["relativePath"]
               for existing in directory_bindings):
            directory_bindings.append(record)
    directory_bindings.sort(key=lambda record: record["relativePath"])
    expected_journal = {
        "relativePath": file_result["relativePath"],
        "identity": file_result["identity"],
        "byteLength": file_result["byteLength"],
        "sha256": file_result["sha256"],
        "planSha256": journal["planSha256"],
        "plannedGateCount": len(planned_gates),
        "plannedGateIdsSha256": planned_gate_ids_sha256,
        "recordCount": 0,
        "lastFrameSha256": unused_frame_sha256,
        "nextEventType": "STARTED",
        "nextOrdinal": 1,
    }
    opened = open_bound_execution_journal(expected_journal, directory_bindings)
    try:
        publish_worker_progress("JOURNAL_READBACK_VERIFIED")
        parsed = opened["parsed"]
        require(parsed["recordCount"] == 0 and
                parsed["lastFrameSha256"] == unused_frame_sha256,
                "execution journal initial parse drift")
        publish_worker_progress("JOURNAL_FINAL_BINDING_VERIFIED")
        return {
            "schemaVersion": JOURNAL_CREATE_SCHEMA,
            "ok": True,
            "rootBefore": result["rootBefore"],
            "rootAfter": result["rootAfter"],
            "directories": result["directories"],
            "journal": journal_summary(
                journal["relativePath"], opened["identity"], parsed),
        }
    finally:
        close_bound_execution_journal(opened)


def prepare_worker_execution_journal_append(append, stream):
    require(isinstance(append, dict) and set(append) == {
        "schemaVersion", "rootIdentity", "directories", "journal", "event"
    }, "execution journal append request schema drift")
    require(append["schemaVersion"] == JOURNAL_APPEND_SCHEMA,
            "execution journal append schema version drift")
    event = append["event"]
    require(isinstance(event, dict), "execution journal event is not one object")
    event_type = event.get("eventType")
    if event_type == "STARTED":
        require(set(event) == {"eventType", "ordinal", "gateId", "attempt"},
                "execution journal STARTED event schema drift")
        roles = (("attempt", "attempt.json"),)
        aggregate_limit = MAX_RETAINED_WRITE_BYTES
    elif event_type == "RESULT":
        require(set(event) == {
            "eventType", "ordinal", "gateId", "status", "exitCode", "signal",
            "stdout", "stderr", "result"
        }, "execution journal RESULT event schema drift")
        require(event["status"] in ("PASS", "FAIL") and
                (event["exitCode"] is None or
                 (isinstance(event["exitCode"], int) and
                  not isinstance(event["exitCode"], bool))) and
                (event["signal"] is None or
                 (isinstance(event["signal"], str) and
                  1 <= len(event["signal"]) <= 64)),
                "execution journal RESULT status drift")
        if event["signal"] is not None:
            require_printable_ascii(
                event["signal"], "execution journal RESULT signal", 1, 64)
        require(event["status"] != "PASS" or
                (event["exitCode"] == 0 and event["signal"] is None),
                "execution journal PASS requires exitCode 0 and signal null")
        require(event["signal"] is None or event["exitCode"] is None,
                "execution journal signaled RESULT requires exitCode null")
        roles = (("stdout", "stdout.bin"),
                 ("stderr", "stderr.bin"),
                 ("result", "result.json"))
        aggregate_limit = MAX_JOURNAL_RESULT_BYTES
    else:
        raise RuntimeError("execution journal event type drift")
    require(isinstance(event.get("ordinal"), int) and
            not isinstance(event.get("ordinal"), bool) and
            event["ordinal"] >= 1 and
            isinstance(event.get("gateId"), str),
            "execution journal event gate binding drift")
    require_printable_ascii(
        event["gateId"], "execution journal event gateId", 1, 512)
    publish_worker_progress("JOURNAL_REQUEST_VALIDATED")

    metadata = []
    parent_paths = set()
    parents = set()
    total_byte_length = 0
    for role, basename in roles:
        artifact = event[role]
        require(isinstance(artifact, dict) and set(artifact) == {
            "relativePath", "byteLength", "sha256"
        }, "execution journal " + role + " input schema drift")
        parts = require_execution_journal_artifact_path(
            artifact["relativePath"], basename)
        byte_length = artifact["byteLength"]
        require(isinstance(byte_length, int) and
                not isinstance(byte_length, bool) and
                0 <= byte_length <= MAX_RETAINED_WRITE_BYTES,
                "execution journal " + role + " byte length drift")
        require_sha256(artifact["sha256"],
                       "execution journal " + role + " sha256")
        total_byte_length += byte_length
        require(total_byte_length <= aggregate_limit,
                "execution journal event payload exceeds the aggregate limit")
        parent = "/".join(parts[:-1])
        require(parent != "", "execution journal artifacts require one parent")
        parents.add(parent)
        for depth in range(1, len(parts)):
            parent_paths.add("/".join(parts[:depth]))
        metadata.append({
            "role": role,
            "relativePath": artifact["relativePath"],
            "parts": parts,
            "byteLength": byte_length,
            "sha256": artifact["sha256"],
        })
    require(len(parents) == 1,
            "execution journal event artifact parent drift")
    require(len({entry["relativePath"] for entry in metadata}) == len(metadata),
            "execution journal event artifact path duplicate")
    expected_map = validate_worker_directory_bindings(
        append["directories"], "execution journal append directory binding")
    root_before_value = os.fstat(ROOT_FD)
    require_private_directory(root_before_value,
                              "held execution journal archive root")
    root_before = stable_identity(root_before_value)
    require_expected(root_before, append["rootIdentity"],
                     "execution journal append archive root")
    publish_worker_progress("ROOT_BOUND")
    publish_worker_progress("JOURNAL_PAYLOAD_READ_BEGIN")
    payloads = []
    for entry in metadata:
        payload = read_exact(stream, entry["byteLength"])
        require(hashlib.sha256(payload).hexdigest() == entry["sha256"],
                "execution journal payload digest drift " + entry["role"])
        payloads.append(payload)
    publish_worker_progress("JOURNAL_PAYLOADS_VERIFIED")
    batch = {
        "schemaVersion": BATCH_SCHEMA,
        "rootIdentity": append["rootIdentity"],
        "directories": append["directories"],
        "entryCount": len(metadata),
        "totalByteLength": total_byte_length,
        "entries": [{
            "relativePath": entry["relativePath"],
            "byteLength": entry["byteLength"],
            "sha256": entry["sha256"],
        } for entry in metadata],
    }
    return {
        "batch": batch,
        "prepared": {
            "metadata": metadata,
            "payloads": payloads,
            "parentPaths": sorted(parent_paths),
            "expectedMap": expected_map,
            "rootBefore": root_before,
        },
        "roles": roles,
        "event": event,
        "artifactParent": next(iter(parents)),
    }


def append_worker_execution_journal(append, stream):
    prepared_event = prepare_worker_execution_journal_append(append, stream)
    opened_before = open_bound_execution_journal(
        append["journal"], append["directories"])
    try:
        parsed_before = opened_before["parsed"]
        event = prepared_event["event"]
        expected_gate = parsed_before["header"]["plannedGates"][
            parsed_before["nextOrdinal"] - 1
        ]
        require(parsed_before["nextEventType"] == event["eventType"] and
                event["ordinal"] == parsed_before["nextOrdinal"] and
                event["gateId"] == expected_gate["gateId"],
                "execution journal append event is not the expected next gate")
        if event["eventType"] == "RESULT":
            pending_started = parsed_before["lastRecord"]
            require(isinstance(pending_started, dict) and
                    pending_started.get("recordType") == "STARTED",
                    "execution journal RESULT pending STARTED binding is missing")
            pending_parent = pending_started["attempt"]["relativePath"].rsplit(
                "/", 1)[0]
            require(prepared_event["artifactParent"] == pending_parent,
                    "execution journal RESULT artifact parent drift")
        before_data = opened_before["data"]
        before_last_sha256 = parsed_before["lastFrameSha256"]
        sequence = parsed_before["recordCount"] + 1

        conservative_identity = {
            "type": "regular",
            "dev": "9" * 128,
            "ino": "9" * 128,
            "uid": 18446744073709551615,
            "gid": 18446744073709551615,
            "mode": 0o600,
            "nlink": 1,
        }
        conservative_files_by_role = {}
        for entry in prepared_event["prepared"]["metadata"]:
            conservative_files_by_role[entry["role"]] = {
                "relativePath": entry["relativePath"],
                "identity": conservative_identity,
                "byteLength": entry["byteLength"],
                "sha256": entry["sha256"],
            }
        if event["eventType"] == "STARTED":
            conservative_record = {
                "schemaVersion": JOURNAL_RECORD_SCHEMA,
                "recordType": "STARTED",
                "sequence": sequence,
                "previousFrameSha256": before_last_sha256,
                "ordinal": event["ordinal"],
                "gateId": event["gateId"],
                "attempt": conservative_files_by_role["attempt"],
            }
        else:
            conservative_record = {
                "schemaVersion": JOURNAL_RECORD_SCHEMA,
                "recordType": "RESULT",
                "sequence": sequence,
                "previousFrameSha256": before_last_sha256,
                "ordinal": event["ordinal"],
                "gateId": event["gateId"],
                "status": event["status"],
                "exitCode": event["exitCode"],
                "signal": event["signal"],
                "stdout": conservative_files_by_role["stdout"],
                "stderr": conservative_files_by_role["stderr"],
                "result": conservative_files_by_role["result"],
            }
        require(0 < len(canonical_json_bytes(conservative_record)) <=
                WORKER_MAX_FRAME_BYTES,
                "execution journal conservative frame body exceeds the limit")
    finally:
        close_bound_execution_journal(opened_before)

    prepared_event["prepared"]["retainOpenBindings"] = True
    batch_result = perform_worker_batch(
        prepared_event["batch"], prepared_event["prepared"])
    files_by_role = {}
    retained_bindings = batch_result["_retainedBindings"]
    try:
        for index, (role, unused_basename) in enumerate(prepared_event["roles"]):
            files_by_role[role] = batch_result["files"][index]
        event = prepared_event["event"]
        if event["eventType"] == "STARTED":
            record = {
                "schemaVersion": JOURNAL_RECORD_SCHEMA,
                "recordType": "STARTED",
                "sequence": sequence,
                "previousFrameSha256": before_last_sha256,
                "ordinal": event["ordinal"],
                "gateId": event["gateId"],
                "attempt": files_by_role["attempt"],
            }
        else:
            record = {
                "schemaVersion": JOURNAL_RECORD_SCHEMA,
                "recordType": "RESULT",
                "sequence": sequence,
                "previousFrameSha256": before_last_sha256,
                "ordinal": event["ordinal"],
                "gateId": event["gateId"],
                "status": event["status"],
                "exitCode": event["exitCode"],
                "signal": event["signal"],
                "stdout": files_by_role["stdout"],
                "stderr": files_by_role["stderr"],
                "result": files_by_role["result"],
            }
        frame, frame_sha256 = execution_journal_frame(record)

        opened = open_bound_execution_journal(
            append["journal"], append["directories"])
        try:
            require(opened["data"] == before_data and
                    opened["parsed"]["lastFrameSha256"] == before_last_sha256,
                    "execution journal changed before append")
            require(len(before_data) + len(frame) <= MAX_JOURNAL_BYTES,
                    "execution journal prospective byte length exceeds the limit")
            write_all(opened["descriptor"], frame)
            publish_worker_progress("JOURNAL_FRAME_APPENDED")
            os.fsync(opened["descriptor"])
            publish_worker_progress("JOURNAL_FSYNCED")
            for directory in reversed(opened["directories"]):
                os.fsync(directory["descriptor"])
            os.fsync(ROOT_FD)
            os.lseek(opened["descriptor"], 0, os.SEEK_SET)
            chunks = []
            length = 0
            while True:
                chunk = os.read(opened["descriptor"], 65536)
                if not chunk:
                    break
                chunks.append(chunk)
                length += len(chunk)
                require(length <= MAX_JOURNAL_BYTES,
                        "execution journal exceeds the byte limit after append")
            after_data = b"".join(chunks)
            require(after_data[:len(before_data)] == before_data and
                    after_data[len(before_data):] == frame,
                    "execution journal append-only prefix drift")
            parsed_after = parse_execution_journal(after_data)
            require(parsed_after["recordCount"] == sequence and
                    parsed_after["lastFrameSha256"] == frame_sha256 and
                    parsed_after["lastRecord"] == record,
                    "execution journal appended frame readback drift")
            publish_worker_progress("JOURNAL_READBACK_VERIFIED")
            current = os.fstat(opened["descriptor"])
            named = os.stat(opened["basename"], dir_fd=opened["parent"],
                            follow_symlinks=False)
            identity = stable_identity(current)
            require(identity == opened["identity"] and
                    stable_identity(named) == identity,
                    "execution journal final identity drift")
            root_after = revalidate_retained_journal_artifacts(
                retained_bindings,
                prepared_event["batch"],
                batch_result["rootBefore"],
            )
            publish_worker_progress("JOURNAL_FINAL_BINDING_VERIFIED")
            return {
                "schemaVersion": JOURNAL_APPEND_SCHEMA,
                "ok": True,
                "rootBefore": batch_result["rootBefore"],
                "rootAfter": root_after,
                "directories": batch_result["directories"],
                "eventType": event["eventType"],
                "sequence": sequence,
                "gateId": event["gateId"],
                "ordinal": event["ordinal"],
                "journal": journal_summary(
                    append["journal"]["relativePath"], identity, parsed_after),
                "artifacts": files_by_role,
            }
        finally:
            close_bound_execution_journal(opened)
    finally:
        if retained_bindings is None and isinstance(batch_result, dict):
            retained_bindings = batch_result.get("_retainedBindings")
        close_retained_batch_bindings(retained_bindings)


def run_persistent_worker():
    try:
        publish_worker_progress("WORKER_STARTED")
        root_before_value = os.fstat(ROOT_FD)
        require_private_directory(root_before_value, "held retained archive root")
        root_before = stable_identity(root_before_value)
        publish_worker_progress("ROOT_BOUND")
        write_frame(sys.stdout.buffer, {
            "schemaVersion": WORKER_SCHEMA,
            "messageType": "READY",
            "rootIdentity": root_before,
        })
        publish_worker_progress("READY_EMITTED")
        expected_request_id = 1
        while True:
            publish_worker_progress("REQUEST_READ_BEGIN")
            request = read_frame(sys.stdin.buffer)
            publish_worker_progress("REQUEST_READ")
            require(isinstance(request, dict) and
                    request.get("schemaVersion") == WORKER_SCHEMA and
                    request.get("requestId") == expected_request_id,
                    "retained mutation worker request envelope drift")
            message_type = request.get("messageType")
            if message_type == "MUTATE":
                require(set(request) == {
                    "schemaVersion", "messageType", "requestId", "mutation"
                }, "retained mutation worker MUTATE schema drift")
                mutation = request["mutation"]
                require(isinstance(mutation, dict) and
                        isinstance(mutation.get("byteLength"), int) and
                        not isinstance(mutation.get("byteLength"), bool) and
                        0 <= mutation["byteLength"] <= MAX_RETAINED_WRITE_BYTES,
                        "retained mutation worker payload length drift")
                publish_worker_progress("PAYLOAD_READ_BEGIN")
                data = read_exact(sys.stdin.buffer, mutation["byteLength"])
                publish_worker_progress("PAYLOAD_READ")
                result = perform_worker_mutation(mutation, data)
                write_frame(sys.stdout.buffer, {
                    "schemaVersion": WORKER_SCHEMA,
                    "messageType": "MUTATION_RESULT",
                    "requestId": expected_request_id,
                    "result": result,
                })
                publish_worker_progress("RESULT_EMITTED")
                expected_request_id += 1
                continue
            if message_type == "WRITE_BATCH":
                require(set(request) == {
                    "schemaVersion", "messageType", "requestId", "batch"
                }, "retained mutation worker WRITE_BATCH schema drift")
                prepared = validate_worker_batch(request["batch"], sys.stdin.buffer)
                result = perform_worker_batch(request["batch"], prepared)
                write_frame(sys.stdout.buffer, {
                    "schemaVersion": WORKER_SCHEMA,
                    "messageType": "BATCH_RESULT",
                    "requestId": expected_request_id,
                    "result": result,
                })
                publish_worker_progress("RESULT_EMITTED")
                expected_request_id += 1
                continue
            if message_type == "CREATE_EXECUTION_JOURNAL":
                require(set(request) == {
                    "schemaVersion", "messageType", "requestId", "journal"
                }, "retained mutation worker CREATE_EXECUTION_JOURNAL schema drift")
                publish_worker_progress("JOURNAL_REQUEST_VALIDATED")
                result = initialize_worker_execution_journal(request["journal"])
                write_frame(sys.stdout.buffer, {
                    "schemaVersion": WORKER_SCHEMA,
                    "messageType": "EXECUTION_JOURNAL_CREATED",
                    "requestId": expected_request_id,
                    "result": result,
                })
                publish_worker_progress("RESULT_EMITTED")
                expected_request_id += 1
                continue
            if message_type == "APPEND_EXECUTION_JOURNAL":
                require(set(request) == {
                    "schemaVersion", "messageType", "requestId", "append"
                }, "retained mutation worker APPEND_EXECUTION_JOURNAL schema drift")
                result = append_worker_execution_journal(
                    request["append"], sys.stdin.buffer)
                write_frame(sys.stdout.buffer, {
                    "schemaVersion": WORKER_SCHEMA,
                    "messageType": "EXECUTION_JOURNAL_APPEND_RESULT",
                    "requestId": expected_request_id,
                    "result": result,
                })
                publish_worker_progress("RESULT_EMITTED")
                expected_request_id += 1
                continue
            require(message_type == "CLOSE" and set(request) == {
                "schemaVersion", "messageType", "requestId", "rootIdentity"
            }, "retained mutation worker CLOSE schema drift")
            publish_worker_progress("REQUEST_VALIDATED")
            root_after_value = os.fstat(ROOT_FD)
            require_private_directory(root_after_value,
                                      "held retained archive root close")
            root_after = stable_identity(root_after_value)
            require_expected(root_after, request["rootIdentity"],
                             "retained mutation worker CLOSE root")
            for key in ("type", "dev", "ino", "uid", "gid", "mode"):
                require(root_after[key] == root_before[key],
                        "retained mutation worker root " + key + " drift")
            publish_worker_progress("FINAL_BINDING_VERIFIED")
            write_frame(sys.stdout.buffer, {
                "schemaVersion": WORKER_SCHEMA,
                "messageType": "CLOSED",
                "requestId": expected_request_id,
                "rootIdentity": root_after,
            })
            publish_worker_progress("RESULT_EMITTED")
            publish_worker_progress("WORKER_EXITING")
            return 0
    except BaseException as error:
        try:
            write_frame(sys.stdout.buffer, {
                "schemaVersion": WORKER_SCHEMA,
                "messageType": "ERROR",
                "errorType": type(error).__name__,
                "errno": getattr(error, "errno", None),
            })
        except BaseException:
            pass
        try:
            publish_worker_progress("ERROR_EMITTED")
        except BaseException:
            pass
        return 71


require(len(sys.argv) == 2 and sys.argv[1] in
        ("single-mutation", "persistent-worker"),
        "retained mutation helper mode drift")
if sys.argv[1] == "persistent-worker":
    sys.exit(run_persistent_worker())


opened_directories = []
file_fd = None

try:
    publish_progress("WORKER_STARTED")
    request = json.load(sys.stdin)
    publish_progress("REQUEST_READ")
    require(isinstance(request, dict) and set(request) == {
        "operation", "relativePath", "rootIdentity", "directories",
        "base64", "sha256"
    }, "retained run mutation request schema drift")
    operation = request["operation"]
    require(operation in ("mkdir", "write"), "retained mutation operation drift")
    parts = require_relative(request["relativePath"])
    require(isinstance(request["directories"], list),
            "retained directory binding inventory drift")
    expected_map = {}
    for record in request["directories"]:
        require(isinstance(record, dict) and set(record) == {"relativePath", "identity"},
                "retained directory record schema drift")
        require(record["relativePath"] not in expected_map,
                "retained directory record duplicate")
        expected_map[record["relativePath"]] = record["identity"]
    publish_progress("REQUEST_VALIDATED")

    root_before = stable_identity(os.fstat(ROOT_FD))
    require_private_directory(os.fstat(ROOT_FD), "held retained archive root")
    require_expected(root_before, request["rootIdentity"], "retained archive root")
    publish_progress("ROOT_BOUND")
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        directory_flags |= os.O_CLOEXEC

    parent_fd = ROOT_FD
    relative = ""
    directory_results = []
    limit = len(parts) if operation == "mkdir" else len(parts) - 1
    for index in range(limit):
        basename = parts[index]
        relative = basename if relative == "" else relative + "/" + basename
        created = False
        try:
            named_value = os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError as error:
            require(error.errno == errno.ENOENT, "retained directory absence drift")
            require(operation == "mkdir", "retained directory ENOENT " + relative)
            os.mkdir(basename, 0o700, dir_fd=parent_fd)
            created = True
            named_value = os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
        descriptor = os.open(basename, directory_flags, dir_fd=parent_fd)
        opened_directories.append({
            "descriptor": descriptor,
            "parent": parent_fd,
            "basename": basename,
            "relativePath": relative,
        })
        opened_value = os.fstat(descriptor)
        require_private_directory(opened_value, "retained directory " + relative)
        require(stable_identity(named_value) == stable_identity(opened_value),
                "retained directory descriptor/name drift " + relative)
        expected = expected_map.get(relative)
        if created:
            require(expected is None, "retained directory unexpectedly replaced " + relative)
            os.fchmod(descriptor, 0o700)
        else:
            require(expected is not None, "retained directory is unbound " + relative)
            require_expected(stable_identity(opened_value), expected,
                             "retained directory " + relative)
        directory_results.append({
            "relativePath": relative,
            "identity": stable_identity(opened_value),
        })
        parent_fd = descriptor
    publish_progress("DIRECTORIES_BOUND")

    file_result = None
    if operation == "write":
        basename = parts[-1]
        try:
            os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
            raise RuntimeError("retained file basename already exists")
        except FileNotFoundError as error:
            require(error.errno == errno.ENOENT, "retained file absence drift")
        publish_progress("TARGET_ABSENCE_CONFIRMED")
        encoded = request["base64"]
        require(isinstance(encoded, str), "retained file base64 must be a string")
        require(len(encoded) <= MAX_RETAINED_WRITE_BASE64_CHARACTERS,
                "retained file base64 exceeds the encoded size limit")
        data = base64.b64decode(encoded, validate=True)
        require(len(data) <= MAX_RETAINED_WRITE_BYTES,
                "retained file exceeds the decoded size limit")
        publish_progress("INPUT_SIZE_VALIDATED")
        require(hashlib.sha256(data).hexdigest() == request["sha256"],
                "retained file input digest drift")
        publish_progress("INPUT_HASH_VERIFIED")
        file_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
        if hasattr(os, "O_CLOEXEC"):
            file_flags |= os.O_CLOEXEC
        file_fd = os.open(basename, file_flags, 0o600, dir_fd=parent_fd)
        publish_progress("TARGET_OPENED")
        os.fchmod(file_fd, 0o600)
        write_all(file_fd, data)
        publish_progress("FILE_WRITTEN")
        os.fsync(file_fd)
        publish_progress("FILE_FSYNCED")
        file_value = os.fstat(file_fd)
        require_private_file(file_value, "retained file " + request["relativePath"])
        named_value = os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
        require(stable_identity(named_value) == stable_identity(file_value),
                "retained file descriptor/name drift " + request["relativePath"])
        os.lseek(file_fd, 0, os.SEEK_SET)
        digest = hashlib.sha256()
        length = 0
        while True:
            chunk = os.read(file_fd, 65536)
            if not chunk:
                break
            length += len(chunk)
            digest.update(chunk)
        require(length == len(data) and digest.hexdigest() == request["sha256"],
                "retained file readback drift")
        publish_progress("FILE_READBACK_VERIFIED")
        file_result = {
            "relativePath": request["relativePath"],
            "identity": stable_identity(file_value),
            "byteLength": length,
            "sha256": digest.hexdigest(),
        }

    if file_fd is not None:
        os.fsync(file_fd)

    def retained_directory_fsync_barrier_deepest_first():
        for record in reversed(opened_directories):
            os.fsync(record["descriptor"])
        os.fsync(ROOT_FD)

    retained_directory_fsync_barrier_deepest_first()
    publish_progress("DIRECTORIES_FSYNCED")

    for record in opened_directories:
        current = os.fstat(record["descriptor"])
        require_private_directory(current,
                                  "retained directory recheck " + record["relativePath"])
        named = os.stat(record["basename"], dir_fd=record["parent"],
                        follow_symlinks=False)
        require(stable_identity(named) == stable_identity(current),
                "retained directory named recheck drift " + record["relativePath"])
    root_after = stable_identity(os.fstat(ROOT_FD))
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(root_after[key] == root_before[key],
                "retained archive root " + key + " drift")
    publish_progress("FINAL_BINDING_VERIFIED")

    json.dump({
        "schemaVersion": SCHEMA,
        "ok": True,
        "operation": operation,
        "rootBefore": root_before,
        "rootAfter": root_after,
        "directories": directory_results,
        "file": file_result,
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.stdout.flush()
    publish_progress("RESULT_EMITTED")
except BaseException as error:
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": False,
        "stage": "DESCRIPTOR_RETAINED_RUN_MUTATION_REJECTED",
        "errorType": type(error).__name__,
        "errno": getattr(error, "errno", None),
        "message": str(error),
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.stdout.flush()
    publish_progress("ERROR_EMITTED")
    sys.exit(69)
finally:
    if file_fd is not None:
        os.close(file_fd)
    for record in reversed(opened_directories):
        os.close(record["descriptor"])
`;

const EVIDENCE_REVALIDATION_PYTHON_SOURCE = String.raw`import base64
import hashlib
import json
import os
import stat
import sys

SCHEMA = "ca.signature-lab.descriptor-sidecar-revalidation.v1"
ROOT_FD = 3


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def identity(value):
    return {
        "type": "directory" if stat.S_ISDIR(value.st_mode) else
                ("regular" if stat.S_ISREG(value.st_mode) else
                 ("symlink" if stat.S_ISLNK(value.st_mode) else "special")),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": value.st_uid,
        "gid": value.st_gid,
        "mode": stat.S_IMODE(value.st_mode),
        "nlink": value.st_nlink,
        "size": str(value.st_size),
        "mtimeNs": str(value.st_mtime_ns),
        "ctimeNs": str(value.st_ctime_ns),
    }


def stable_identity(value):
    result = identity(value)
    return {key: result[key] for key in
            ("type", "dev", "ino", "uid", "gid", "mode", "nlink")}


def require_directory(value, label):
    require(stat.S_ISDIR(value.st_mode), label + " is not a physical directory")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o700, label + " mode drift from 0700")
    require(value.st_nlink > 0, label + " has an invalid link count")


def require_regular(value, label):
    require(stat.S_ISREG(value.st_mode), label + " is not a regular file")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o600, label + " mode drift from 0600")
    require(value.st_nlink == 1, label + " is not a singleton")


records = []

try:
    request = json.load(sys.stdin)
    require(isinstance(request, dict) and set(request) == {"rootIdentity", "sidecars"},
            "sidecar revalidation request schema drift")
    require(isinstance(request["sidecars"], list) and len(request["sidecars"]) == 3,
            "sidecar revalidation inventory drift")
    root_before_value = os.fstat(ROOT_FD)
    require_directory(root_before_value, "held revalidation evidence root")
    root_before = identity(root_before_value)
    require(root_before == request["rootIdentity"],
            "held revalidation evidence root identity drift")
    expected_names = [record.get("basename") for record in request["sidecars"]]
    require(len(set(expected_names)) == 3 and sorted(os.listdir(ROOT_FD)) ==
            sorted(expected_names), "revalidation evidence basename inventory drift")

    flags = os.O_RDONLY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        flags |= os.O_CLOEXEC
    results = []
    for expected in request["sidecars"]:
        require(isinstance(expected, dict) and
                set(expected) == {"basename", "byteLength", "identity", "sha256"},
                "sidecar receipt record schema drift")
        basename = expected["basename"]
        require(isinstance(basename, str) and basename not in ("", ".", "..") and
                "/" not in basename and "\x00" not in basename,
                "sidecar receipt basename drift")
        named_value = os.stat(basename, dir_fd=ROOT_FD, follow_symlinks=False)
        descriptor = os.open(basename, flags, dir_fd=ROOT_FD)
        records.append({"descriptor": descriptor, "basename": basename})
        opened_value = os.fstat(descriptor)
        require_regular(opened_value, "revalidation sidecar " + basename)
        require(identity(named_value) == identity(opened_value),
                "revalidation sidecar descriptor/name drift " + basename)
        require(identity(opened_value) == expected["identity"],
                "revalidation sidecar receipt identity drift " + basename)
        digest = hashlib.sha256()
        chunks = []
        while True:
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            chunks.append(chunk)
            digest.update(chunk)
        data = b"".join(chunks)
        require(len(data) == expected["byteLength"],
                "revalidation sidecar receipt byte length drift " + basename)
        require(digest.hexdigest() == expected["sha256"],
                "revalidation sidecar receipt digest drift " + basename)
        results.append({
            "basename": basename,
            "byteLength": len(data),
            "identity": identity(opened_value),
            "sha256": digest.hexdigest(),
            "base64": base64.b64encode(data).decode("ascii"),
        })

    for record in records:
        opened_value = os.fstat(record["descriptor"])
        named_value = os.stat(record["basename"], dir_fd=ROOT_FD,
                              follow_symlinks=False)
        require(identity(named_value) == identity(opened_value),
                "revalidation sidecar final name drift " + record["basename"])
    root_after = identity(os.fstat(ROOT_FD))
    require(root_after == root_before, "held revalidation evidence root drift")
    require(sorted(os.listdir(ROOT_FD)) == sorted(expected_names),
            "revalidation evidence final basename inventory drift")
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": True,
        "rootBefore": root_before,
        "rootAfter": root_after,
        "files": results,
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
except BaseException as error:
    json.dump({
        "schemaVersion": SCHEMA,
        "ok": False,
        "stage": "DESCRIPTOR_SIDECAR_REVALIDATION_REJECTED",
        "errorType": type(error).__name__,
        "errno": getattr(error, "errno", None),
        "message": str(error),
    }, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.exit(70)
finally:
    for record in reversed(records):
        os.close(record["descriptor"])
`;

const SIDECAR_PUBLICATION_PYTHON_SOURCE = String.raw`import base64
import hashlib
import json
import os
import stat
import sys

SCHEMA = "ca.signature-lab.descriptor-sidecar-publication.v1"
ROOT_FD = 3
EXPECTED_NAMES = ["retained-manifest.json", "retained-report.json", "retained-seal.json"]


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def identity(value):
    return {
        "type": "directory" if stat.S_ISDIR(value.st_mode) else
                ("regular" if stat.S_ISREG(value.st_mode) else "special"),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": value.st_uid,
        "gid": value.st_gid,
        "mode": stat.S_IMODE(value.st_mode),
        "nlink": value.st_nlink,
        "size": str(value.st_size),
        "mtimeNs": str(value.st_mtime_ns),
        "ctimeNs": str(value.st_ctime_ns),
    }


def require_directory(value, label):
    require(stat.S_ISDIR(value.st_mode), label + " is not a physical directory")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o700, label + " mode drift from 0700")
    require(value.st_nlink > 0, label + " has an invalid link count")


def require_regular(value, label):
    require(stat.S_ISREG(value.st_mode), label + " is not a physical regular file")
    require(value.st_uid == os.geteuid(), label + " uid drift")
    require(stat.S_IMODE(value.st_mode) == 0o600, label + " mode drift from 0600")
    require(value.st_nlink == 1, label + " is not a singleton regular file")


def require_exact_identity(actual, expected, label):
    require(actual == expected, label + " identity drift")


def write_all(descriptor, data):
    offset = 0
    while offset < len(data):
        written = os.write(descriptor, data[offset:])
        require(written > 0, "sidecar publication made no progress")
        offset += written


try:
    request = json.load(sys.stdin)
    require(isinstance(request, dict) and set(request) == {"rootIdentity", "files"},
            "sidecar publication request schema drift")
    require(isinstance(request["files"], list) and len(request["files"]) == 3,
            "sidecar publication file inventory drift")
    require([entry.get("name") for entry in request["files"]] == EXPECTED_NAMES,
            "sidecar publication basename inventory drift")

    root_before_value = os.fstat(ROOT_FD)
    require_directory(root_before_value, "held evidence root")
    root_before = identity(root_before_value)
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(root_before[key] == request["rootIdentity"][key],
                "evidence root " + key + " drift")
    require(os.listdir(ROOT_FD) == [], "evidence root is not empty before publication")

    records = []
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        flags |= os.O_CLOEXEC
    for requested in request["files"]:
        require(isinstance(requested, dict) and
                set(requested) == {"name", "base64", "byteLength", "sha256"},
                "sidecar publication requested file schema drift")
        data = base64.b64decode(requested["base64"], validate=True)
        require(len(data) == requested["byteLength"],
                "sidecar input byte length drift " + requested["name"])
        require(hashlib.sha256(data).hexdigest() == requested["sha256"],
                "sidecar input digest drift " + requested["name"])
        descriptor = os.open(requested["name"], flags, 0o600, dir_fd=ROOT_FD)
        try:
            os.fchmod(descriptor, 0o600)
            write_all(descriptor, data)
            os.fsync(descriptor)
            opened_value = os.fstat(descriptor)
            require_regular(opened_value, "sidecar " + requested["name"])
            named_value = os.stat(requested["name"], dir_fd=ROOT_FD,
                                  follow_symlinks=False)
            require_exact_identity(identity(named_value), identity(opened_value),
                                   "sidecar descriptor/name " + requested["name"])
            os.lseek(descriptor, 0, os.SEEK_SET)
            readback = b""
            while True:
                chunk = os.read(descriptor, 65536)
                if not chunk:
                    break
                readback += chunk
            require(readback == data, "sidecar readback drift " + requested["name"])
            records.append({"name": requested["name"], "byteLength": len(readback),
                            "sha256": requested["sha256"],
                            "identity": identity(opened_value)})
        finally:
            os.close(descriptor)

    os.fsync(ROOT_FD)
    require(sorted(os.listdir(ROOT_FD)) == sorted(EXPECTED_NAMES),
            "evidence root final basename inventory drift")
    root_after = identity(os.fstat(ROOT_FD))
    for key in ("type", "dev", "ino", "uid", "gid", "mode"):
        require(root_after[key] == root_before[key], "evidence root " + key + " drift")
    json.dump({"schemaVersion": SCHEMA, "ok": True, "rootBefore": root_before,
               "rootAfter": root_after, "files": records},
              sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
except BaseException as error:
    json.dump({"schemaVersion": SCHEMA, "ok": False,
               "stage": "DESCRIPTOR_SIDECAR_PUBLICATION_REJECTED",
               "errorType": type(error).__name__,
               "errno": getattr(error, "errno", None), "message": str(error)},
              sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    sys.exit(67)
`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalize(value, label = "value") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label}: canonical number is not a safe integer`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalize(entry, `${label}[${index}]`));
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [
        key,
        canonicalize(value[key], `${label}.${key}`),
      ]),
    );
  }
  throw new Error(`${label}: value is not canonical JSON data`);
}

function canonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, "utf8");
}

function exactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label}: exact key set drift`);
  }
}

function assertAbsoluteStarshipPath(target, label) {
  if (typeof target !== "string" || !path.isAbsolute(target) ||
      !target.startsWith(STARSHIP_PREFIX) || path.normalize(target) !== target) {
    throw new Error(`${label}: expected one normalized absolute Starship path`);
  }
  return target;
}

function pathIdentity(stat, type) {
  return {
    type,
    dev: String(stat.dev),
    ino: String(stat.ino),
    uid: Number(stat.uid),
    gid: Number(stat.gid),
    mode: Number(stat.mode & BigInt(0o7777)),
    nlink: Number(stat.nlink),
  };
}

function fullIdentity(stat, type) {
  return {
    ...pathIdentity(stat, type),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
  };
}

function assertSameStat(actual, expected, label, fields) {
  for (const field of fields) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: ${field} identity drift`);
    }
  }
}

function openBoundDirectory(target, expected = null, label = target) {
  assertAbsoluteStarshipPath(target, label);
  const named = lstatSync(target, { bigint: true });
  if (!named.isDirectory() || named.isSymbolicLink() ||
      named.uid !== BigInt(process.getuid()) ||
      (named.mode & BigInt(0o777)) !== BigInt(0o700) ||
      realpathSync(target) !== target) {
    throw new Error(`${label}: expected one owned private physical directory`);
  }
  const descriptor = openSync(
    target,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    assertSameStat(opened, named, label,
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    if (expected !== null) {
      exactKeys(expected, ["type", "dev", "ino", "uid", "gid", "mode", "nlink"],
        `${label} expected identity`);
      const normalized = pathIdentity(opened, "directory");
      for (const field of ["type", "dev", "ino", "uid", "gid", "mode"]) {
        if (normalized[field] !== expected[field]) {
          throw new Error(`${label}: expected ${field} identity drift`);
        }
      }
      if (!Number.isSafeInteger(expected.nlink) || expected.nlink < 1 ||
          expected.nlink > normalized.nlink) {
        throw new Error(`${label}: expected nlink chronology drift`);
      }
    }
    return { descriptor, identity: pathIdentity(opened, "directory"), stat: opened };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function openBoundOwnedScratchParent(target, label = target) {
  assertAbsoluteStarshipPath(target, label);
  const named = lstatSync(target, { bigint: true });
  if (!named.isDirectory() || named.isSymbolicLink() ||
      named.uid !== BigInt(process.getuid()) ||
      (named.mode & BigInt(0o022)) !== BigInt(0) ||
      realpathSync(target) !== target) {
    throw new Error(
      `${label}: expected one owner-controlled, non-group/world-writable physical directory`,
    );
  }
  const descriptor = openSync(
    target,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    assertSameStat(opened, named, label,
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    return { descriptor, identity: pathIdentity(opened, "directory"), stat: opened };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function normalizePhysicalIdentityRecord(value, fields, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected one physical identity record`);
  }
  exactKeys(value, fields, label);
  const normalized = canonicalize(value, label);
  if (normalized.type !== "directory" && normalized.type !== "regular") {
    throw new Error(`${label}: expected a physical directory or regular file`);
  }
  for (const field of ["dev", "ino"]) {
    if (typeof normalized[field] !== "string" ||
        !/^[0-9]+$/u.test(normalized[field])) {
      throw new Error(`${label}.${field}: expected one decimal identity string`);
    }
  }
  for (const field of ["uid", "gid", "mode", "nlink"]) {
    if (!Number.isSafeInteger(normalized[field]) || normalized[field] < 0) {
      throw new Error(`${label}.${field}: expected one nonnegative safe integer`);
    }
  }
  if (normalized.nlink < 1 || normalized.mode > 0o7777) {
    throw new Error(`${label}: invalid physical mode or link count`);
  }
  if (fields === FULL_IDENTITY_FIELDS) {
    for (const field of ["size", "mtimeNs", "ctimeNs"]) {
      if (typeof normalized[field] !== "string" ||
          !/^[0-9]+$/u.test(normalized[field])) {
        throw new Error(`${label}.${field}: expected one decimal metadata string`);
      }
    }
  }
  return normalized;
}

function stableIdentityFromRecord(value, label) {
  return normalizePhysicalIdentityRecord(value, STABLE_IDENTITY_FIELDS, label);
}

function stableIdentityFromFullRecord(value, label) {
  const full = fullIdentityFromRecord(value, label);
  return canonicalize(Object.fromEntries(
    STABLE_IDENTITY_FIELDS.map((field) => [field, full[field]]),
  ), `${label} stable identity`);
}

function sameFullPhysicalIdentity(left, right) {
  return FULL_IDENTITY_FIELDS.every((field) => left[field] === right[field]);
}

function assertHeldDirectoryNamed(target, descriptor, label) {
  const named = lstatSync(target, { bigint: true });
  const opened = fstatSync(descriptor, { bigint: true });
  if (!named.isDirectory() || named.isSymbolicLink() ||
      named.uid !== BigInt(process.getuid()) ||
      (named.mode & BigInt(0o777)) !== BigInt(0o700) ||
      realpathSync(target) !== target) {
    throw new Error(`${label}: named root is not one private physical directory`);
  }
  assertSameStat(opened, named, `${label} descriptor/name`,
    ["dev", "ino", "uid", "gid", "mode"]);
  return { identity: pathIdentity(opened, "directory"), stat: opened };
}

function normalizeRetainedRelativePath(value, label = "relativePath") {
  if (typeof value !== "string" || value === "" || value.startsWith("/") ||
      value.includes("\\") || value.includes("\0")) {
    throw new Error(`${label}: expected one normalized relative path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..") ||
      parts.join("/") !== value) {
    throw new Error(`${label}: expected one normalized relative path`);
  }
  return value;
}

function normalizePrintableAscii(value, label, minimumBytes = 1, maximumBytes = null) {
  if (typeof value !== "string" || !/^[\x20-\x7e]*$/u.test(value)) {
    throw new Error(`${label}: expected printable ASCII only`);
  }
  const byteLength = Buffer.byteLength(value, "utf8");
  if (byteLength < minimumBytes ||
      (maximumBytes !== null && byteLength > maximumBytes)) {
    throw new Error(`${label}: printable ASCII byte length drift`);
  }
  return value;
}

function normalizeExecutionJournalArtifactPath(value, basename, label) {
  const relativePath = normalizeRetainedRelativePath(value, label);
  normalizePrintableAscii(relativePath, label);
  const parts = relativePath.split("/");
  if (parts.length !== 3 || parts[0] !== "executions" || parts[2] !== basename) {
    throw new Error(
      "execution journal artifact path must be executions/<gate-directory>/<role>",
    );
  }
  if (Buffer.byteLength(parts[1], "utf8") > 255) {
    throw new Error("execution journal gate-directory exceeds 255 UTF-8 bytes");
  }
  return { relativePath, parts };
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function frozenCanonical(value, label) {
  return deepFreeze(canonicalize(value, label));
}

function compareUnicodeOrdinal(left, right) {
  const leftCodePoints = left[Symbol.iterator]();
  const rightCodePoints = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftCodePoints.next();
    const rightNext = rightCodePoints.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0);
    const rightCodePoint = rightNext.value.codePointAt(0);
    if (leftCodePoint !== rightCodePoint) {
      return leftCodePoint < rightCodePoint ? -1 : 1;
    }
  }
}

function retainedRunRecord(token) {
  const state = RETAINED_RUN_STATES.get(token);
  if (state === undefined) {
    throw new Error("retained run token is not an authorized opaque capability");
  }
  return state;
}

function retainedRunState(token) {
  const state = retainedRunRecord(token);
  if (state.lifecycle === RETAINED_RUN_CLOSED) {
    throw new Error("retained run is CLOSED and no longer holds descriptor authority");
  }
  if (state.lifecycle === RETAINED_RUN_POISONED) {
    throw new Error(
      "retained run is POISONED after a binding or safety failure",
    );
  }
  if (state.lifecycle !== RETAINED_RUN_OPEN) {
    throw new Error("retained run lifecycle state drift");
  }
  if (!state.acceptingOperations || state.transitionPromise !== null) {
    throw new Error("retained run is completing an exact lifecycle transition");
  }
  return state;
}

async function retainedRunStateForOperation(token) {
  const state = retainedRunRecord(token);
  if (state.transitionPromise !== null) {
    await state.transitionPromise;
  }
  return retainedRunState(token);
}

function assertRetainedIdentity(actual, expected, label) {
  for (const field of ["type", "dev", "ino", "uid", "gid", "mode"]) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: ${field} cached identity drift`);
    }
  }
  if (!Number.isSafeInteger(expected.nlink) || expected.nlink < 1 ||
      expected.nlink > actual.nlink) {
    throw new Error(`${label}: nlink chronology drift`);
  }
}

function assertRetainedRunNamedBindings(state) {
  const run = assertHeldDirectoryNamed(
    state.runRoot,
    state.runDescriptor,
    "retained run root",
  );
  const archive = assertHeldDirectoryNamed(
    state.archiveRoot,
    state.archiveDescriptor,
    "retained archive root",
  );
  const evidence = assertHeldDirectoryNamed(
    state.evidenceRoot,
    state.evidenceDescriptor,
    "retained evidence root",
  );
  assertRetainedIdentity(run.identity, state.runIdentity, "retained run root");
  assertRetainedIdentity(
    archive.identity,
    state.archiveIdentity,
    "retained archive root",
  );
  assertRetainedIdentity(
    evidence.identity,
    state.evidenceIdentity,
    "retained evidence root",
  );
}

function releaseRetainedRunDescriptors(state) {
  if (state.mutationWorker !== null) {
    throw new Error(
      "refusing to release retained-run descriptors while worker FD3 is live",
    );
  }
  const failures = [];
  for (const field of ["archiveDescriptor", "evidenceDescriptor", "runDescriptor"]) {
    const descriptor = state[field];
    state[field] = null;
    if (descriptor === null) continue;
    try {
      closeSync(descriptor);
    } catch (error) {
      failures.push(`${field}: ${error?.code ?? error?.message ?? String(error)}`);
    }
  }
  return failures;
}

async function performRetainedRunPoison(state, cause, context) {
  state.acceptingOperations = false;
  await terminateRetainedMutationWorker(state, `retained run ${context} poison`);
  state.lifecycle = RETAINED_RUN_POISONED;
  const closeFailures = releaseRetainedRunDescriptors(state);
  const detail = cause?.message ?? String(cause);
  const suffix = closeFailures.length === 0
    ? ""
    : `; descriptor release failures: ${closeFailures.join(", ")}`;
  return new Error(
    `retained run POISONED after ${context} binding or safety failure: ${detail}${suffix}`,
    { cause },
  );
}

async function runRetainedStateTransition(state, operation) {
  if (state.transitionPromise !== null) return state.transitionPromise;
  state.acceptingOperations = false;
  const transition = (async () => operation())();
  state.transitionPromise = transition;
  try {
    return await transition;
  } finally {
    if (state.transitionPromise === transition) state.transitionPromise = null;
  }
}

async function poisonRetainedRun(state, cause, context) {
  if (state.transitionPromise !== null) {
    await state.transitionPromise;
    return new Error(
      `retained run ${state.lifecycle} after concurrent lifecycle transition: ${
        cause?.message ?? String(cause)}`,
      { cause },
    );
  }
  return runRetainedStateTransition(
    state,
    () => performRetainedRunPoison(state, cause, context),
  );
}

async function closeOpenRetainedRun(state) {
  if (state.activeOperation !== null) {
    throw new Error("retained run operation is already in progress");
  }
  return runRetainedStateTransition(state, async () => {
    try {
      assertRetainedRunNamedBindings(state);
      await requestRetainedMutationWorkerClose(state);
      assertRetainedRunNamedBindings(state);
      state.lifecycle = RETAINED_RUN_CLOSED;
      const failures = releaseRetainedRunDescriptors(state);
      if (failures.length !== 0) {
        state.lifecycle = RETAINED_RUN_POISONED;
        throw new Error(
          `retained run POISONED during descriptor close: ${failures.join(", ")}`,
        );
      }
    } catch (error) {
      if (state.lifecycle === RETAINED_RUN_CLOSED ||
          state.lifecycle === RETAINED_RUN_POISONED) {
        throw error;
      }
      await performRetainedRunPoison(state, error, "close");
    }
  });
}

function beginRetainedOperation(state, kind) {
  if (state.activeOperation !== null) {
    throw new Error("retained run operation is already in progress");
  }
  if (state.lifecycle !== RETAINED_RUN_OPEN || !state.acceptingOperations ||
      state.transitionPromise !== null) {
    throw new Error("retained run is completing an exact lifecycle transition");
  }
  const marker = Object.freeze({ kind });
  state.activeOperation = marker;
  return marker;
}

function finishRetainedOperation(state, marker) {
  if (state.activeOperation === marker) state.activeOperation = null;
}

async function runRetainedOperationExclusive(state, kind, operation) {
  const marker = beginRetainedOperation(state, kind);
  try {
    return await operation();
  } finally {
    finishRetainedOperation(state, marker);
  }
}

async function runRetainedMutationExclusive(state, operation) {
  return runRetainedOperationExclusive(state, "MUTATION", operation);
}

function retainedRunInspection(state) {
  return frozenCanonical({
    schemaVersion: RETAINED_RUN_INSPECTION_SCHEMA,
    state: state.lifecycle,
    bound: state.lifecycle === RETAINED_RUN_OPEN,
    runRoot: state.runRoot,
    archiveRoot: state.archiveRoot,
    evidenceRoot: state.evidenceRoot,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
  }, "retained run inspection");
}

function stableReadPrivateFile(target, label = target) {
  assertAbsoluteStarshipPath(target, label);
  const named = lstatSync(target, { bigint: true });
  if (!named.isFile() || named.isSymbolicLink() || named.nlink !== BigInt(1) ||
      named.uid !== BigInt(process.getuid()) ||
      (named.mode & BigInt(0o777)) !== BigInt(0o600) || realpathSync(target) !== target) {
    throw new Error(`${label}: expected one owned private regular singleton`);
  }
  const descriptor = openSync(target,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    assertSameStat(opened, named, label,
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    assertSameStat(after, opened, label,
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const finalNamed = lstatSync(target, { bigint: true });
    assertSameStat(finalNamed, after, label,
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    if (after.size !== BigInt(bytes.length)) {
      throw new Error(`${label}: byte count drift`);
    }
    return {
      bytes,
      identity: fullIdentity(after, "regular"),
      sha256: sha256(bytes),
    };
  } finally {
    closeSync(descriptor);
  }
}

function bindTrustedPython() {
  const named = lstatSync(PYTHON_PATH, { bigint: true });
  if (!named.isFile() || named.isSymbolicLink() || named.uid !== BigInt(0) ||
      (named.mode & BigInt(0o022)) !== BigInt(0) || realpathSync(PYTHON_PATH) !== PYTHON_PATH) {
    throw new Error("descriptor helper Python is not one root-owned immutable-looking file");
  }
  const descriptor = openSync(PYTHON_PATH,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    assertSameStat(opened, named, "descriptor helper Python",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    assertSameStat(after, opened, "descriptor helper Python",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const digest = sha256(bytes);
    if (digest !== EXPECTED_PYTHON_SHA256) {
      throw new Error(`descriptor helper Python bytes drifted (${digest})`);
    }
    return {
      path: PYTHON_PATH,
      sha256: digest,
      identity: fullIdentity(after, "regular"),
    };
  } finally {
    closeSync(descriptor);
  }
}

function parseHelperResult(execution, schema, successStatus, label) {
  if (execution.signal !== null) {
    throw new Error(`${label}: helper was signaled (${execution.signal})`);
  }
  let result;
  try {
    result = JSON.parse(execution.stdout);
  } catch {
    throw new Error(`${label}: helper emitted invalid JSON`);
  }
  if (execution.stderr !== "") {
    throw new Error(`${label}: helper wrote stderr`);
  }
  if (result?.schemaVersion !== schema) {
    throw new Error(`${label}: helper schema drift`);
  }
  if (execution.status !== successStatus || result.ok !== true) {
    throw new Error(`${label}: ${result?.errorType ?? "ERROR"}: ${result?.message ?? "rejected"}`);
  }
  return result;
}

function parseHelperProgress(value, schema, stages, label, requireComplete) {
  if (typeof value !== "string") {
    throw new Error(`${label}: helper progress pipe was unavailable`);
  }
  const complete = value.endsWith("\n");
  const lines = value.split("\n");
  if (complete) lines.pop();
  const completeLines = complete ? lines : lines.slice(0, -1);
  const allowedStages = new Set(stages);
  const records = completeLines.map((line, index) => {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new Error(`${label}: helper progress record ${index} is invalid JSON`);
    }
    exactKeys(record, ["schemaVersion", "stage"],
      `${label} helper progress record ${index}`);
    if (record.schemaVersion !== schema || !allowedStages.has(record.stage)) {
      throw new Error(`${label}: helper progress record ${index} drifted`);
    }
    return record;
  });
  if (requireComplete && !complete) {
    throw new Error(`${label}: helper progress stream ended with an incomplete record`);
  }
  return records;
}

function executeDescriptorHelper({
  args = [],
  descriptor,
  input,
  label,
  maxBuffer,
  schema,
  source,
  successStatus = 0,
  timeout,
  progressSchema = null,
  progressStages = null,
  expectedFinalProgressStage = null,
}) {
  const python = bindTrustedPython();
  const execution = spawnSync(
    PYTHON_PATH,
    ["-I", "-S", "-E", "-B", "-c", source, ...args],
    {
      cwd: "/",
      encoding: "utf8",
      env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
      input: JSON.stringify(input),
      maxBuffer,
      timeout,
      stdio: ["pipe", "pipe", "pipe", descriptor, "pipe"],
    },
  );
  const progress = progressSchema === null
    ? []
    : parseHelperProgress(
        execution.output[RETAINED_MUTATION_PROGRESS_FD],
        progressSchema,
        progressStages,
        label,
        execution.error === undefined,
      );
  const lastProgressStage = progress.at(-1)?.stage ?? "NONE";
  if (execution.error !== undefined) {
    throw new Error(
      `${label}: ${execution.error.code ?? execution.error.name}: ${
        execution.error.message}; lastProgressStage=${lastProgressStage}`,
      { cause: execution.error },
    );
  }
  if (expectedFinalProgressStage !== null &&
      lastProgressStage !== expectedFinalProgressStage) {
    throw new Error(
      `${label}: helper progress terminated at ${lastProgressStage}, expected ${
        expectedFinalProgressStage}`,
    );
  }
  return {
    python,
    result: parseHelperResult(execution, schema, successStatus, label),
    progress,
  };
}

function workerCanonicalJsonBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), "utf8");
}

function encodeRetainedMutationWorkerFrame(value) {
  const body = workerCanonicalJsonBytes(value);
  if (body.length < 1 || body.length > RETAINED_MUTATION_WORKER_MAX_FRAME_BYTES) {
    throw new Error("retained mutation worker frame length exceeds the limit");
  }
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function readOneRetainedMutationWorkerFrame(stream, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let buffered = Buffer.alloc(0);
    let expectedLength = null;
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const parse = () => {
      if (expectedLength === null && buffered.length >= 4) {
        expectedLength = buffered.readUInt32BE(0);
        if (expectedLength < 1 ||
            expectedLength > RETAINED_MUTATION_WORKER_MAX_FRAME_BYTES) {
          fail(new Error(`${label}: worker frame length drift`));
          return;
        }
      }
      if (expectedLength === null || buffered.length < expectedLength + 4) return;
      if (buffered.length !== expectedLength + 4) {
        fail(new Error(`${label}: worker emitted bytes beyond one response frame`));
        return;
      }
      const body = buffered.subarray(4);
      let value;
      try {
        value = JSON.parse(body.toString("utf8"));
      } catch {
        fail(new Error(`${label}: worker response is not JSON`));
        return;
      }
      if (!body.equals(workerCanonicalJsonBytes(value))) {
        fail(new Error(`${label}: worker response is not canonical JSON`));
        return;
      }
      succeed(value);
    };
    const onData = (chunk) => {
      if (!Buffer.isBuffer(chunk)) {
        fail(new Error(`${label}: worker response stream changed encoding`));
        return;
      }
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length > RETAINED_MUTATION_WORKER_MAX_FRAME_BYTES + 4) {
        fail(new Error(`${label}: worker response exceeded the frame limit`));
        return;
      }
      parse();
    };
    const onEnd = () => fail(new Error(`${label}: worker response ended before one frame`));
    const onError = (error) => fail(new Error(`${label}: worker response stream failed`, {
      cause: error,
    }));
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
  });
}

function readRetainedMutationWorkerProgressSequence(stream, expectedStages, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let buffered = Buffer.alloc(0);
    const observed = [];
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = () => {
      if (settled) return;
      if (buffered.length !== 0) {
        fail(new Error(`${label}: worker progress ended with a partial record`));
        return;
      }
      settled = true;
      cleanup();
      resolve(Object.freeze([...observed]));
    };
    const parseLines = () => {
      while (observed.length < expectedStages.length) {
        const newline = buffered.indexOf(0x0a);
        if (newline === -1) return;
        const line = buffered.subarray(0, newline);
        buffered = buffered.subarray(newline + 1);
        if (line.length === 0) {
          fail(new Error(`${label}: worker progress contains an empty record`));
          return;
        }
        let record;
        try {
          record = JSON.parse(line.toString("utf8"));
        } catch {
          fail(new Error(`${label}: worker progress record is not JSON`));
          return;
        }
        exactKeys(record, ["schemaVersion", "stage"], `${label} progress record`);
        if (record.schemaVersion !== RETAINED_MUTATION_WORKER_PROGRESS_SCHEMA ||
            record.stage !== expectedStages[observed.length] ||
            !RETAINED_MUTATION_WORKER_PROGRESS_STAGES.includes(record.stage)) {
          fail(new Error(`${label}: worker progress sequence drifted at ${
            observed.length}`));
          return;
        }
        observed.push(Object.freeze(record));
      }
      succeed();
    };
    const onData = (chunk) => {
      if (!Buffer.isBuffer(chunk)) {
        fail(new Error(`${label}: worker progress stream changed encoding`));
        return;
      }
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length > RETAINED_MUTATION_WORKER_MAX_FRAME_BYTES) {
        fail(new Error(`${label}: worker progress exceeded the byte limit`));
        return;
      }
      parseLines();
    };
    const onEnd = () => fail(new Error(`${label}: worker progress ended early`));
    const onError = (error) => fail(new Error(`${label}: worker progress stream failed`, {
      cause: error,
    }));
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
  });
}

function retainedMutationWorkerDeadline(promise, timeout, label) {
  let timer = null;
  const timeoutPromise = new Promise((unusedResolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: worker timed out`)), timeout);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function createRetainedMutationWorkerFatalSignal() {
  let resolveFatal;
  const promise = new Promise((resolve) => {
    resolveFatal = resolve;
  });
  let failure = null;
  return {
    promise,
    signal(error) {
      if (failure !== null) return;
      failure = error instanceof Error ? error : new Error(String(error));
      resolveFatal(failure);
    },
    value() {
      return failure;
    },
  };
}

function retainedMutationWorkerPhase(worker, promise, timeout, label) {
  return retainedMutationWorkerDeadline(
    Promise.race([
      promise,
      worker.fatal.promise.then((error) => Promise.reject(error)),
    ]),
    timeout,
    label,
  );
}

async function terminateRetainedMutationWorker(state, label) {
  const worker = state.mutationWorker;
  if (worker === null) return;
  if (worker.closeInfo === null) {
    try {
      worker.child.kill("SIGKILL");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  const closeInfo = await retainedMutationWorkerDeadline(
    worker.closePromise,
    RETAINED_MUTATION_WORKER_CLOSE_TIMEOUT_MS,
    `${label} termination`,
  );
  if (closeInfo === null) {
    throw new Error(`${label}: worker termination did not produce close evidence`);
  }
  state.mutationWorker = null;
}

async function startRetainedMutationWorker(state) {
  if (state.mutationWorker !== null) {
    throw new Error("retained mutation worker is already initialized");
  }
  const python = bindTrustedPython();
  const child = spawn(
    PYTHON_PATH,
    ["-I", "-S", "-E", "-B", "-c", RETAINED_RUN_MUTATION_PYTHON_SOURCE,
      "persistent-worker"],
    {
      cwd: "/",
      env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
      stdio: ["pipe", "pipe", "pipe", state.archiveDescriptor, "pipe"],
    },
  );
  const fatal = createRetainedMutationWorkerFatalSignal();
  const worker = {
    child,
    closeInfo: null,
    closePromise: null,
    fatal,
    nextRequestId: 1,
    progress: child.stdio?.[RETAINED_MUTATION_PROGRESS_FD] ?? null,
    python,
    stderrBytes: 0,
  };
  worker.closePromise = new Promise((resolve) => {
    child.once("close", (code, signal) => {
      worker.closeInfo = Object.freeze({ code, signal });
      resolve(worker.closeInfo);
    });
  });
  state.mutationWorker = worker;
  try {
    child.once("error", (error) => fatal.signal(new Error(
      "retained mutation worker failed to spawn",
      { cause: error },
    )));
    if (child.stdin == null || typeof child.stdin.write !== "function" ||
        typeof child.stdin.end !== "function" ||
        typeof child.stdin.on !== "function" ||
        child.stdout == null || typeof child.stdout.on !== "function" ||
        typeof child.stdout.once !== "function" ||
        typeof child.stdout.off !== "function" ||
        child.stderr == null || typeof child.stderr.on !== "function" ||
        worker.progress == null || typeof worker.progress.on !== "function" ||
        typeof worker.progress.once !== "function" ||
        typeof worker.progress.off !== "function") {
      throw new Error("retained mutation worker pipe allocation drift");
    }
    child.stdin.on("error", (error) => fatal.signal(new Error(
      "retained mutation worker stdin failed",
      { cause: error },
    )));
    child.stderr.on("data", (chunk) => {
      worker.stderrBytes += chunk.length;
      fatal.signal(new Error("retained mutation worker wrote stderr"));
    });
    const [ready] = await retainedMutationWorkerPhase(
      worker,
      Promise.all([
        readOneRetainedMutationWorkerFrame(child.stdout, "worker READY"),
        readRetainedMutationWorkerProgressSequence(worker.progress, [
          "WORKER_STARTED",
          "ROOT_BOUND",
          "READY_EMITTED",
          "REQUEST_READ_BEGIN",
        ], "worker READY"),
      ]),
      RETAINED_MUTATION_WORKER_READY_TIMEOUT_MS,
      "retained mutation worker READY",
    );
    exactKeys(ready, ["schemaVersion", "messageType", "rootIdentity"],
      "retained mutation worker READY");
    if (ready.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
        ready.messageType !== "READY") {
      throw new Error("retained mutation worker READY envelope drift");
    }
    const readyIdentity = stableIdentityFromRecord(
      ready.rootIdentity,
      "retained mutation worker READY root identity",
    );
    assertRetainedIdentity(
      readyIdentity,
      state.archiveIdentity,
      "retained mutation worker READY root",
    );
    assertRetainedRunNamedBindings(state);
  } catch (error) {
    await terminateRetainedMutationWorker(state, "retained mutation worker READY");
    throw error;
  }
}

function writeRetainedMutationWorkerChunk(worker, bytes, label) {
  return new Promise((resolve, reject) => {
    worker.child.stdin.write(bytes, (error) => {
      if (error) reject(new Error(`${label}: worker stdin write failed`, {
        cause: error,
      }));
      else resolve();
    });
  });
}

async function writeRetainedMutationWorkerFrame(worker, value, payload) {
  const frame = encodeRetainedMutationWorkerFrame(value);
  await writeRetainedMutationWorkerChunk(worker, frame, "worker request frame");
  if (payload.length !== 0) {
    await writeRetainedMutationWorkerChunk(worker, payload, "worker request payload");
  }
}

async function writeRetainedMutationWorkerBatchRequest(worker, value, payloads) {
  const frame = encodeRetainedMutationWorkerFrame(value);
  await writeRetainedMutationWorkerChunk(worker, frame, "worker batch request frame");
  for (const payload of payloads) {
    if (payload.length !== 0) {
      await writeRetainedMutationWorkerChunk(
        worker,
        payload,
        "worker batch request payload",
      );
    }
  }
}

function endRetainedMutationWorkerFrame(worker, value) {
  const frame = encodeRetainedMutationWorkerFrame(value);
  return new Promise((resolve, reject) => {
    worker.child.stdin.end(frame, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function retainedMutationWorkerMutationProgress(operation) {
  const commonPrefix = [
    "REQUEST_READ",
    "PAYLOAD_READ_BEGIN",
    "PAYLOAD_READ",
    "REQUEST_VALIDATED",
    "INPUT_SIZE_VALIDATED",
    "INPUT_HASH_VERIFIED",
    "ROOT_BOUND",
    "DIRECTORIES_BOUND",
  ];
  const writeStages = operation === "write"
    ? [
        "TARGET_ABSENCE_CONFIRMED",
        "TARGET_OPENED",
        "FILE_WRITTEN",
        "FILE_FSYNCED",
        "FILE_READBACK_VERIFIED",
      ]
    : [];
  return [
    ...commonPrefix,
    ...writeStages,
    "DIRECTORIES_FSYNCED",
    "FINAL_BINDING_VERIFIED",
    "RESULT_EMITTED",
    "REQUEST_READ_BEGIN",
  ];
}

function retainedMutationWorkerBatchProgress(entryCount) {
  const fileStages = [];
  for (let index = 0; index < entryCount; index += 1) {
    fileStages.push(
      "TARGET_OPENED",
      "FILE_WRITTEN",
      "FILE_FSYNCED",
      "FILE_READBACK_VERIFIED",
    );
  }
  return [
    "REQUEST_READ",
    "BATCH_REQUEST_VALIDATED",
    "ROOT_BOUND",
    "BATCH_PAYLOAD_READ_BEGIN",
    "BATCH_PAYLOADS_VERIFIED",
    "DIRECTORIES_BOUND",
    "TARGET_ABSENCE_CONFIRMED",
    ...fileStages,
    "DIRECTORIES_FSYNCED",
    "BATCH_FINAL_BINDING_VERIFIED",
    "RESULT_EMITTED",
    "REQUEST_READ_BEGIN",
  ];
}

function retainedMutationWorkerJournalCreateProgress() {
  return [
    "REQUEST_READ",
    "JOURNAL_REQUEST_VALIDATED",
    "BATCH_REQUEST_VALIDATED",
    "ROOT_BOUND",
    "BATCH_PAYLOAD_READ_BEGIN",
    "BATCH_PAYLOADS_VERIFIED",
    "DIRECTORIES_BOUND",
    "TARGET_ABSENCE_CONFIRMED",
    "TARGET_OPENED",
    "FILE_WRITTEN",
    "FILE_FSYNCED",
    "FILE_READBACK_VERIFIED",
    "DIRECTORIES_FSYNCED",
    "BATCH_FINAL_BINDING_VERIFIED",
    "JOURNAL_BOUND",
    "JOURNAL_READBACK_VERIFIED",
    "JOURNAL_FINAL_BINDING_VERIFIED",
    "RESULT_EMITTED",
    "REQUEST_READ_BEGIN",
  ];
}

function retainedMutationWorkerJournalAppendProgress(artifactCount) {
  const artifactStages = [];
  for (let index = 0; index < artifactCount; index += 1) {
    artifactStages.push(
      "TARGET_OPENED",
      "FILE_WRITTEN",
      "FILE_FSYNCED",
      "FILE_READBACK_VERIFIED",
    );
  }
  return [
    "REQUEST_READ",
    "JOURNAL_REQUEST_VALIDATED",
    "ROOT_BOUND",
    "JOURNAL_PAYLOAD_READ_BEGIN",
    "JOURNAL_PAYLOADS_VERIFIED",
    "JOURNAL_BOUND",
    "DIRECTORIES_BOUND",
    "TARGET_ABSENCE_CONFIRMED",
    ...artifactStages,
    "DIRECTORIES_FSYNCED",
    "BATCH_FINAL_BINDING_VERIFIED",
    "JOURNAL_BOUND",
    "JOURNAL_FRAME_APPENDED",
    "JOURNAL_FSYNCED",
    "JOURNAL_READBACK_VERIFIED",
    "JOURNAL_FINAL_BINDING_VERIFIED",
    "RESULT_EMITTED",
    "REQUEST_READ_BEGIN",
  ];
}

async function requestRetainedMutationWorkerMutation(state, mutation, payload,
  timeout) {
  const worker = state.mutationWorker;
  if (worker === null) {
    throw new Error("retained mutation worker is not available");
  }
  const requestId = worker.nextRequestId;
  const responsePromise = readOneRetainedMutationWorkerFrame(
    worker.child.stdout,
    "worker MUTATION_RESULT",
  );
  const progressPromise = readRetainedMutationWorkerProgressSequence(
    worker.progress,
    retainedMutationWorkerMutationProgress(mutation.operation),
    "worker MUTATION_RESULT",
  );
  const request = {
    schemaVersion: RETAINED_MUTATION_WORKER_SCHEMA,
    messageType: "MUTATE",
    requestId,
    mutation,
  };
  const [response] = await retainedMutationWorkerPhase(
    worker,
    Promise.all([
      responsePromise,
      progressPromise,
      writeRetainedMutationWorkerFrame(worker, request, payload),
    ]),
    timeout,
    "retained mutation worker MUTATE",
  );
  exactKeys(response, ["schemaVersion", "messageType", "requestId", "result"],
    "retained mutation worker MUTATION_RESULT");
  if (response.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
      response.messageType !== "MUTATION_RESULT" ||
      response.requestId !== requestId) {
    throw new Error("retained mutation worker MUTATION_RESULT envelope drift");
  }
  worker.nextRequestId += 1;
  return response.result;
}

async function requestRetainedMutationWorkerBatch(state, batch, payloads, timeout) {
  const worker = state.mutationWorker;
  if (worker === null) {
    throw new Error("retained mutation worker is not available");
  }
  const requestId = worker.nextRequestId;
  const responsePromise = readOneRetainedMutationWorkerFrame(
    worker.child.stdout,
    "worker BATCH_RESULT",
  );
  const progressPromise = readRetainedMutationWorkerProgressSequence(
    worker.progress,
    retainedMutationWorkerBatchProgress(batch.entryCount),
    "worker BATCH_RESULT",
  );
  const request = {
    schemaVersion: RETAINED_MUTATION_WORKER_SCHEMA,
    messageType: "WRITE_BATCH",
    requestId,
    batch,
  };
  const [response] = await retainedMutationWorkerPhase(
    worker,
    Promise.all([
      responsePromise,
      progressPromise,
      writeRetainedMutationWorkerBatchRequest(worker, request, payloads),
    ]),
    timeout,
    "retained mutation worker WRITE_BATCH",
  );
  exactKeys(response, ["schemaVersion", "messageType", "requestId", "result"],
    "retained mutation worker BATCH_RESULT");
  if (response.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
      response.messageType !== "BATCH_RESULT" ||
      response.requestId !== requestId) {
    throw new Error("retained mutation worker BATCH_RESULT envelope drift");
  }
  worker.nextRequestId += 1;
  return response.result;
}

async function requestRetainedMutationWorkerJournalCreate(state, journal, timeout) {
  const worker = state.mutationWorker;
  if (worker === null) {
    throw new Error("retained mutation worker is not available");
  }
  const requestId = worker.nextRequestId;
  const responsePromise = readOneRetainedMutationWorkerFrame(
    worker.child.stdout,
    "worker EXECUTION_JOURNAL_CREATED",
  );
  const progressPromise = readRetainedMutationWorkerProgressSequence(
    worker.progress,
    retainedMutationWorkerJournalCreateProgress(),
    "worker EXECUTION_JOURNAL_CREATED",
  );
  const request = {
    schemaVersion: RETAINED_MUTATION_WORKER_SCHEMA,
    messageType: "CREATE_EXECUTION_JOURNAL",
    requestId,
    journal,
  };
  const [response] = await retainedMutationWorkerPhase(
    worker,
    Promise.all([
      responsePromise,
      progressPromise,
      writeRetainedMutationWorkerFrame(worker, request, Buffer.alloc(0)),
    ]),
    timeout,
    "retained mutation worker CREATE_EXECUTION_JOURNAL",
  );
  exactKeys(response, ["schemaVersion", "messageType", "requestId", "result"],
    "retained mutation worker EXECUTION_JOURNAL_CREATED");
  if (response.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
      response.messageType !== "EXECUTION_JOURNAL_CREATED" ||
      response.requestId !== requestId) {
    throw new Error("retained mutation worker EXECUTION_JOURNAL_CREATED envelope drift");
  }
  worker.nextRequestId += 1;
  return response.result;
}

async function requestRetainedMutationWorkerJournalAppend(state, append, payloads,
  timeout) {
  const worker = state.mutationWorker;
  if (worker === null) {
    throw new Error("retained mutation worker is not available");
  }
  const requestId = worker.nextRequestId;
  const responsePromise = readOneRetainedMutationWorkerFrame(
    worker.child.stdout,
    "worker EXECUTION_JOURNAL_APPEND_RESULT",
  );
  const progressPromise = readRetainedMutationWorkerProgressSequence(
    worker.progress,
    retainedMutationWorkerJournalAppendProgress(payloads.length),
    "worker EXECUTION_JOURNAL_APPEND_RESULT",
  );
  const request = {
    schemaVersion: RETAINED_MUTATION_WORKER_SCHEMA,
    messageType: "APPEND_EXECUTION_JOURNAL",
    requestId,
    append,
  };
  const [response] = await retainedMutationWorkerPhase(
    worker,
    Promise.all([
      responsePromise,
      progressPromise,
      writeRetainedMutationWorkerBatchRequest(worker, request, payloads),
    ]),
    timeout,
    "retained mutation worker APPEND_EXECUTION_JOURNAL",
  );
  exactKeys(response, ["schemaVersion", "messageType", "requestId", "result"],
    "retained mutation worker EXECUTION_JOURNAL_APPEND_RESULT");
  if (response.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
      response.messageType !== "EXECUTION_JOURNAL_APPEND_RESULT" ||
      response.requestId !== requestId) {
    throw new Error(
      "retained mutation worker EXECUTION_JOURNAL_APPEND_RESULT envelope drift",
    );
  }
  worker.nextRequestId += 1;
  return response.result;
}

async function requestRetainedMutationWorkerClose(state) {
  const worker = state.mutationWorker;
  if (worker === null) return;
  const responsePromise = readOneRetainedMutationWorkerFrame(
    worker.child.stdout,
    "worker CLOSED",
  );
  const progressPromise = readRetainedMutationWorkerProgressSequence(
    worker.progress,
    [
      "REQUEST_READ",
      "REQUEST_VALIDATED",
      "FINAL_BINDING_VERIFIED",
      "RESULT_EMITTED",
      "WORKER_EXITING",
    ],
    "worker CLOSED",
  );
  const closeRequest = {
    schemaVersion: RETAINED_MUTATION_WORKER_SCHEMA,
    messageType: "CLOSE",
    requestId: worker.nextRequestId,
    rootIdentity: state.archiveIdentity,
  };
  const [closed] = await retainedMutationWorkerPhase(
    worker,
    Promise.all([
      responsePromise,
      progressPromise,
      endRetainedMutationWorkerFrame(worker, closeRequest),
    ]),
    RETAINED_MUTATION_WORKER_CLOSE_TIMEOUT_MS,
    "retained mutation worker CLOSE",
  );
  exactKeys(closed, ["schemaVersion", "messageType", "requestId", "rootIdentity"],
    "retained mutation worker CLOSED");
  if (closed.schemaVersion !== RETAINED_MUTATION_WORKER_SCHEMA ||
      closed.messageType !== "CLOSED" ||
      closed.requestId !== worker.nextRequestId) {
    throw new Error("retained mutation worker CLOSED envelope drift");
  }
  const closedIdentity = stableIdentityFromRecord(
    closed.rootIdentity,
    "retained mutation worker CLOSED root identity",
  );
  assertRetainedIdentity(
    closedIdentity,
    state.archiveIdentity,
    "retained mutation worker CLOSED root",
  );
  const closeInfo = await retainedMutationWorkerDeadline(
    worker.closePromise,
    RETAINED_MUTATION_WORKER_CLOSE_TIMEOUT_MS,
    "retained mutation worker exit",
  );
  if (closeInfo.code !== 0 || closeInfo.signal !== null ||
      worker.stderrBytes !== 0 || worker.fatal.value() !== null) {
    throw new Error(
      `retained mutation worker exit drift: code=${closeInfo.code} signal=${
        closeInfo.signal} stderrBytes=${worker.stderrBytes}`,
    );
  }
  state.mutationWorker = null;
}

function retainedDirectoryBindings(state) {
  return [...state.directories.entries()]
    .filter(([relativePath]) => relativePath !== "")
    .sort(([left], [right]) => compareUnicodeOrdinal(left, right))
    .map(([relativePath, identity]) => ({ relativePath, identity }));
}

function retainedRunExpectedEntries(state) {
  const entries = [];
  for (const [relativePath, identity] of state.directories) {
    if (relativePath !== "") entries.push({ relativePath, ...identity });
  }
  for (const [relativePath, record] of state.files) {
    entries.push({
      relativePath,
      ...record.identity,
      byteLength: record.byteLength,
      sha256: record.sha256,
    });
  }
  return entries
    .sort((left, right) =>
      compareUnicodeOrdinal(left.relativePath, right.relativePath));
}

export async function createRetainedSignatureLabRun(options) {
  exactKeys(options, ["scratchParent", "classification"],
    "retained run creation options");
  const scratchParent = assertAbsoluteStarshipPath(
    options.scratchParent,
    "scratchParent",
  );
  const classification = canonicalize(options.classification, "classification");
  if (classification?.state !== "STARTED_UNSEALED" ||
      classification?.destructiveCleanupAttempted !== false ||
      classification?.retainedArchiveCount !== 1 ||
      classification?.policy !== "RETAIN_DO_NOT_DELETE") {
    throw new Error(
      "classification: expected truthful STARTED_UNSEALED retained-run state",
    );
  }
  const classificationBytes = canonicalJsonBytes(classification);
  const classificationSha256 = sha256(classificationBytes);
  const basename = `signature-lab-retained-run-${randomBytes(16).toString("hex")}`;
  const parent = openBoundOwnedScratchParent(scratchParent, "scratchParent");
  let run = null;
  let archive = null;
  let evidence = null;
  try {
    const execution = executeDescriptorHelper({
      descriptor: parent.descriptor,
      input: {
        basename,
        classificationBase64: classificationBytes.toString("base64"),
        classificationSha256,
        parentIdentity: parent.identity,
      },
      label: "descriptor-relative retained run creation",
      maxBuffer: 4 * 1024 * 1024,
      schema: RETAINED_RUN_CREATION_SCHEMA,
      source: RETAINED_RUN_CREATION_PYTHON_SOURCE,
      timeout: 30_000,
    });
    const result = execution.result;
    exactKeys(result, [
      "schemaVersion",
      "ok",
      "parentBefore",
      "parentAfter",
      "runIdentity",
      "archiveIdentity",
      "evidenceIdentity",
      "classification",
    ], "retained run creation result");
    if (result.classification?.basename !== RETAINED_RUN_CLASSIFICATION_BASENAME ||
        result.classification?.sha256 !== classificationSha256 ||
        result.classification?.byteLength !== classificationBytes.length) {
      throw new Error("retained STARTED_UNSEALED classification result drift");
    }

    const runRoot = path.join(scratchParent, basename);
    const archiveRoot = path.join(runRoot, "archive");
    const evidenceRoot = path.join(runRoot, "external-evidence");
    run = openBoundDirectory(runRoot,
      stableIdentityFromRecord(result.runIdentity, "created run identity"),
      "created retained run root");
    archive = openBoundDirectory(archiveRoot,
      stableIdentityFromRecord(result.archiveIdentity, "created archive identity"),
      "created retained archive root");
    evidence = openBoundDirectory(evidenceRoot,
      stableIdentityFromRecord(result.evidenceIdentity, "created evidence identity"),
      "created retained evidence root");

    const parentNamed = lstatSync(scratchParent, { bigint: true });
    const parentOpened = fstatSync(parent.descriptor, { bigint: true });
    assertSameStat(parentOpened, parentNamed, "scratch parent after run creation",
      ["dev", "ino", "uid", "gid", "mode"]);
    const classificationIdentity = stableIdentityFromRecord(
      result.classification.identity,
      "created classification identity",
    );
    const token = Object.freeze({ runRoot, archiveRoot, evidenceRoot });
    const state = {
      acceptingOperations: true,
      activeOperation: null,
      archiveDescriptor: archive.descriptor,
      archiveIdentity: stableIdentityFromRecord(
        result.archiveIdentity,
        "retained archive identity",
      ),
      archiveRoot,
      creationHelper: frozenCanonical({
        python: execution.python,
        schemaVersion: RETAINED_RUN_CREATION_SCHEMA,
        sourceSha256: sha256(Buffer.from(RETAINED_RUN_CREATION_PYTHON_SOURCE, "utf8")),
      }, "retained run creation helper provenance"),
      directories: new Map([["", stableIdentityFromRecord(
        result.archiveIdentity,
        "retained archive identity",
      )]]),
      evidenceDescriptor: evidence.descriptor,
      evidenceIdentity: stableIdentityFromRecord(
        result.evidenceIdentity,
        "retained evidence identity",
      ),
      evidenceRoot,
      executionJournal: null,
      files: new Map([[
        RETAINED_RUN_CLASSIFICATION_BASENAME,
        {
          identity: classificationIdentity,
          byteLength: classificationBytes.length,
          sha256: classificationSha256,
        },
      ]]),
      mutationHelperSourceSha256:
        sha256(Buffer.from(RETAINED_RUN_MUTATION_PYTHON_SOURCE, "utf8")),
      mutationWorker: null,
      runDescriptor: run.descriptor,
      runIdentity: stableIdentityFromRecord(result.runIdentity, "retained run identity"),
      runRoot,
      lifecycle: RETAINED_RUN_OPEN,
      transitionPromise: null,
    };
    try {
      await startRetainedMutationWorker(state);
      assertRetainedRunNamedBindings(state);
    } catch (error) {
      await terminateRetainedMutationWorker(
        state,
        "retained mutation worker creation rollback",
      );
      throw error;
    }
    RETAINED_RUN_STATES.set(token, state);
    run = null;
    archive = null;
    evidence = null;
    return token;
  } finally {
    if (evidence !== null) closeSync(evidence.descriptor);
    if (archive !== null) closeSync(archive.descriptor);
    if (run !== null) closeSync(run.descriptor);
    closeSync(parent.descriptor);
  }
}

export async function inspectRetainedSignatureLabRun(run) {
  const state = retainedRunRecord(run);
  if (state.transitionPromise !== null) {
    await state.transitionPromise;
  }
  if (state.lifecycle === RETAINED_RUN_OPEN) {
    try {
      assertRetainedRunNamedBindings(state);
    } catch (error) {
      await poisonRetainedRun(state, error, "inspection");
    }
  }
  return retainedRunInspection(state);
}

export async function closeRetainedSignatureLabRun(run) {
  const state = retainedRunRecord(run);
  if (state.transitionPromise !== null) {
    await state.transitionPromise;
  }
  if (state.lifecycle !== RETAINED_RUN_OPEN) {
    return retainedRunInspection(state);
  }
  await closeOpenRetainedRun(state);
  return retainedRunInspection(state);
}

async function mutateRetainedRun(state, operation, relativePath,
  bytes = Buffer.alloc(0)) {
  return runRetainedMutationExclusive(state, async () => {
    try {
      assertRetainedRunNamedBindings(state);
      const timeout = retainedSignatureLabMutationTimeoutMs(operation, bytes.length);
      const digest = sha256(bytes);
      const result = await requestRetainedMutationWorkerMutation(
        state,
        {
          operation,
          relativePath,
          rootIdentity: state.archiveIdentity,
          directories: retainedDirectoryBindings(state),
          byteLength: bytes.length,
          sha256: digest,
        },
        bytes,
        timeout,
      );
      exactKeys(result, [
        "schemaVersion",
        "ok",
        "operation",
        "rootBefore",
        "rootAfter",
        "directories",
        "file",
      ], "retained run mutation result");
      if (result.operation !== operation || !Array.isArray(result.directories)) {
        throw new Error("retained run mutation result operation drift");
      }
      for (const record of result.directories) {
        exactKeys(record, ["relativePath", "identity"],
          "retained directory mutation record");
        const normalized = normalizeRetainedRelativePath(
          record.relativePath,
          "retained directory result relativePath",
        );
        state.directories.set(normalized,
          stableIdentityFromRecord(record.identity, `retained directory ${normalized}`));
      }
      return result;
    } catch (error) {
      throw await poisonRetainedRun(state, error, "mutation");
    }
  });
}

export async function createRetainedSignatureLabDirectory(run, relativePath) {
  const state = await retainedRunStateForOperation(run);
  const normalized = normalizeRetainedRelativePath(relativePath);
  const result = await mutateRetainedRun(state, "mkdir", normalized);
  const identity = state.directories.get(normalized);
  if (identity === undefined) {
    throw new Error("descriptor-relative retained directory result is missing");
  }
  return frozenCanonical({
    relativePath: normalized,
    path: path.join(state.archiveRoot, ...normalized.split("/")),
    identity,
  }, "retained directory publication record");
}

export async function writeRetainedSignatureLabFile(run, relativePath, bytes) {
  const state = await retainedRunStateForOperation(run);
  const normalized = normalizeRetainedRelativePath(relativePath);
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new Error("bytes: expected Buffer or Uint8Array");
  }
  retainedSignatureLabMutationTimeoutMs("write", bytes.byteLength);
  const ownedBytes = Buffer.from(bytes);
  const result = await mutateRetainedRun(state, "write", normalized, ownedBytes);
  if (result.file === null || typeof result.file !== "object") {
    throw new Error("descriptor-relative retained file result is missing");
  }
  exactKeys(result.file,
    ["relativePath", "identity", "byteLength", "sha256"],
    "retained file mutation record");
  if (result.file.relativePath !== normalized ||
      result.file.byteLength !== ownedBytes.length ||
      result.file.sha256 !== sha256(ownedBytes)) {
    throw new Error("descriptor-relative retained file result drift");
  }
  const record = {
    identity: stableIdentityFromRecord(
      result.file.identity,
      `retained file ${normalized}`,
    ),
    byteLength: result.file.byteLength,
    sha256: result.file.sha256,
  };
  state.files.set(normalized, record);
  return frozenCanonical({
    relativePath: normalized,
    path: path.join(state.archiveRoot, ...normalized.split("/")),
    identity: record.identity,
    byteLength: record.byteLength,
    sha256: record.sha256,
  }, "retained file publication record");
}

function prepareRetainedSignatureLabBatch(entries) {
  if (!Array.isArray(entries) || entries.length < 1 ||
      entries.length > MAX_RETAINED_SIGNATURE_LAB_BATCH_ENTRIES) {
    throw new Error("retained batch must contain between 1 and 512 entries");
  }
  const validated = [];
  const filePaths = new Set();
  const parentPaths = new Set();
  let previousPath = null;
  let totalByteLength = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`retained batch entry ${index}: expected one object`);
    }
    exactKeys(entry, ["relativePath", "bytes"], `retained batch entry ${index}`);
    const relativePath = normalizeRetainedRelativePath(
      entry.relativePath,
      `retained batch entry ${index} relativePath`,
    );
    if (previousPath !== null &&
        compareUnicodeOrdinal(previousPath, relativePath) >= 0) {
      throw new Error("retained batch paths must be strictly Unicode-ordinal sorted");
    }
    previousPath = relativePath;
    if (!Buffer.isBuffer(entry.bytes) && !(entry.bytes instanceof Uint8Array)) {
      throw new Error(`retained batch entry ${index} bytes: expected Buffer or Uint8Array`);
    }
    const byteLength = entry.bytes.byteLength;
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 ||
        byteLength > MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES) {
      throw new Error("retained batch entry exceeds the maximum retained file size");
    }
    totalByteLength += byteLength;
    if (!Number.isSafeInteger(totalByteLength) ||
        totalByteLength > MAX_RETAINED_SIGNATURE_LAB_BATCH_BYTES) {
      throw new Error("retained batch exceeds the maximum aggregate size of 64 MiB");
    }
    filePaths.add(relativePath);
    const parts = relativePath.split("/");
    for (let depth = 1; depth < parts.length; depth += 1) {
      parentPaths.add(parts.slice(0, depth).join("/"));
    }
    validated.push({
      relativePath,
      bytes: entry.bytes,
      byteLength,
    });
  }
  if (parentPaths.size > MAX_RETAINED_SIGNATURE_LAB_BATCH_ENTRIES) {
    throw new Error("retained batch parent directory count exceeds the limit");
  }
  for (const relativePath of filePaths) {
    if (parentPaths.has(relativePath)) {
      throw new Error("retained batch file and directory paths collide");
    }
  }
  const ownedEntries = validated.map((entry) => {
    const bytes = Buffer.from(entry.bytes);
    return {
      relativePath: entry.relativePath,
      bytes,
      byteLength: bytes.length,
      sha256: sha256(bytes),
    };
  });
  return {
    entries: ownedEntries,
    parentPaths: [...parentPaths].sort(compareUnicodeOrdinal),
    totalByteLength,
  };
}

export async function writeRetainedSignatureLabBatch(run, entries) {
  const prepared = prepareRetainedSignatureLabBatch(entries);
  const state = await retainedRunStateForOperation(run);
  return runRetainedMutationExclusive(state, async () => {
    try {
      assertRetainedRunNamedBindings(state);
      const batch = {
        schemaVersion: RETAINED_RUN_BATCH_SCHEMA,
        rootIdentity: state.archiveIdentity,
        directories: retainedDirectoryBindings(state),
        entryCount: prepared.entries.length,
        totalByteLength: prepared.totalByteLength,
        entries: prepared.entries.map((entry) => ({
          relativePath: entry.relativePath,
          byteLength: entry.byteLength,
          sha256: entry.sha256,
        })),
      };
      const timeout = retainedSignatureLabMutationTimeoutMs(
        "write",
        prepared.totalByteLength,
      );
      const result = await requestRetainedMutationWorkerBatch(
        state,
        batch,
        prepared.entries.map((entry) => entry.bytes),
        timeout,
      );
      exactKeys(result, [
        "schemaVersion",
        "ok",
        "rootBefore",
        "rootAfter",
        "entryCount",
        "totalByteLength",
        "directories",
        "files",
      ], "retained batch worker result");
      if (result.schemaVersion !== RETAINED_RUN_BATCH_SCHEMA || result.ok !== true ||
          result.entryCount !== prepared.entries.length ||
          result.totalByteLength !== prepared.totalByteLength ||
          !Array.isArray(result.directories) || !Array.isArray(result.files)) {
        throw new Error("retained batch worker result envelope drift");
      }
      const rootBefore = stableIdentityFromRecord(
        result.rootBefore,
        "retained batch worker rootBefore",
      );
      const rootAfter = stableIdentityFromRecord(
        result.rootAfter,
        "retained batch worker rootAfter",
      );
      assertRetainedIdentity(rootBefore, state.archiveIdentity,
        "retained batch worker rootBefore");
      assertRetainedIdentity(rootAfter, state.archiveIdentity,
        "retained batch worker rootAfter");
      if (result.directories.length !== prepared.parentPaths.length ||
          result.files.length !== prepared.entries.length) {
        throw new Error("retained batch worker result inventory length drift");
      }

      const nextDirectories = new Map(state.directories);
      const nextFiles = new Map(state.files);
      const publicDirectories = [];
      for (let index = 0; index < result.directories.length; index += 1) {
        const record = result.directories[index];
        exactKeys(record, ["relativePath", "identity"],
          `retained batch directory result ${index}`);
        const relativePath = normalizeRetainedRelativePath(
          record.relativePath,
          `retained batch directory result ${index} relativePath`,
        );
        if (relativePath !== prepared.parentPaths[index] || nextFiles.has(relativePath)) {
          throw new Error("retained batch directory result path drift");
        }
        const identity = stableIdentityFromRecord(
          record.identity,
          `retained batch directory ${relativePath}`,
        );
        nextDirectories.set(relativePath, identity);
        publicDirectories.push({
          relativePath,
          path: path.join(state.archiveRoot, ...relativePath.split("/")),
          identity,
        });
      }

      const publicFiles = [];
      for (let index = 0; index < result.files.length; index += 1) {
        const record = result.files[index];
        exactKeys(record,
          ["relativePath", "identity", "byteLength", "sha256"],
          `retained batch file result ${index}`);
        const expected = prepared.entries[index];
        const relativePath = normalizeRetainedRelativePath(
          record.relativePath,
          `retained batch file result ${index} relativePath`,
        );
        if (relativePath !== expected.relativePath ||
            record.byteLength !== expected.byteLength ||
            record.sha256 !== expected.sha256 ||
            nextDirectories.has(relativePath) || nextFiles.has(relativePath)) {
          throw new Error("retained batch file result drift");
        }
        const identity = stableIdentityFromRecord(
          record.identity,
          `retained batch file ${relativePath}`,
        );
        const fileRecord = {
          identity,
          byteLength: record.byteLength,
          sha256: record.sha256,
        };
        nextFiles.set(relativePath, fileRecord);
        publicFiles.push({
          relativePath,
          path: path.join(state.archiveRoot, ...relativePath.split("/")),
          identity,
          byteLength: record.byteLength,
          sha256: record.sha256,
        });
      }
      state.directories = nextDirectories;
      state.files = nextFiles;
      assertRetainedRunNamedBindings(state);
      return frozenCanonical({
        schemaVersion: RETAINED_BATCH_PUBLICATION_SCHEMA,
        entryCount: prepared.entries.length,
        totalByteLength: prepared.totalByteLength,
        directories: publicDirectories,
        files: publicFiles,
      }, "retained batch publication record");
    } catch (error) {
      throw await poisonRetainedRun(state, error, "batch mutation");
    }
  });
}

function normalizeLowerSha256(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`${label}: expected one lowercase SHA-256`);
  }
  return value;
}

function normalizeExecutionJournalPlan(options) {
  exactKeys(options, ["relativePath", "planSha256", "plannedGates"],
    "execution journal options");
  const relativePath = normalizeRetainedRelativePath(
    options.relativePath,
    "execution journal relativePath",
  );
  if (relativePath !== "executions/execution-journal.v1.bin") {
    throw new Error("execution journal relativePath must use the reviewed singleton path");
  }
  const planSha256 = normalizeLowerSha256(
    options.planSha256,
    "execution journal planSha256",
  );
  if (!Array.isArray(options.plannedGates) || options.plannedGates.length < 1 ||
      options.plannedGates.length > MAX_RETAINED_SIGNATURE_LAB_JOURNAL_GATES) {
    throw new Error("execution journal plannedGates must contain between 1 and 197 gates");
  }
  const seen = new Set();
  const plannedGates = options.plannedGates.map((raw, index) => {
    exactKeys(raw, ["ordinal", "gateId"], `execution journal plannedGates[${index}]`);
    const gateId = normalizePrintableAscii(
      raw.gateId,
      `execution journal plannedGates[${index}].gateId`,
      1,
      512,
    );
    if (raw.ordinal !== index + 1 || seen.has(gateId)) {
      throw new Error("execution journal planned gate order or id drift");
    }
    seen.add(gateId);
    return { ordinal: raw.ordinal, gateId };
  });
  return {
    relativePath,
    planSha256,
    plannedGates,
    plannedGateIdsSha256: sha256(canonicalJsonBytes(plannedGates)),
    parentPaths: ["executions"],
  };
}

function exactStableIdentity(actual, expected, label) {
  for (const field of STABLE_IDENTITY_FIELDS) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: exact ${field} identity drift`);
    }
  }
}

function normalizeExecutionJournalWorkerRecord(raw, expected, label) {
  exactKeys(raw, [
    "relativePath",
    "identity",
    "byteLength",
    "sha256",
    "planSha256",
    "plannedGateCount",
    "plannedGateIdsSha256",
    "recordCount",
    "lastFrameSha256",
    "nextEventType",
    "nextOrdinal",
  ], label);
  const relativePath = normalizeRetainedRelativePath(
    raw.relativePath,
    `${label} relativePath`,
  );
  const identity = stableIdentityFromRecord(raw.identity, `${label} identity`);
  if (identity.type !== "regular" || identity.mode !== 0o600 || identity.nlink !== 1 ||
      !Number.isSafeInteger(raw.byteLength) || raw.byteLength < 1 ||
      raw.byteLength > MAX_RETAINED_SIGNATURE_LAB_JOURNAL_BYTES ||
      !Number.isSafeInteger(raw.plannedGateCount) || raw.plannedGateCount < 1 ||
      raw.plannedGateCount > MAX_RETAINED_SIGNATURE_LAB_JOURNAL_GATES ||
      !Number.isSafeInteger(raw.recordCount) || raw.recordCount < 0 ||
      raw.recordCount > raw.plannedGateCount * 2 ||
      !Number.isSafeInteger(raw.nextOrdinal) || raw.nextOrdinal < 1 ||
      raw.nextOrdinal > raw.plannedGateCount + 1 ||
      !["STARTED", "RESULT", "COMPLETE"].includes(raw.nextEventType)) {
    throw new Error(`${label}: execution journal scalar binding drift`);
  }
  normalizeLowerSha256(raw.sha256, `${label} sha256`);
  normalizeLowerSha256(raw.planSha256, `${label} planSha256`);
  normalizeLowerSha256(
    raw.plannedGateIdsSha256,
    `${label} plannedGateIdsSha256`,
  );
  normalizeLowerSha256(raw.lastFrameSha256, `${label} lastFrameSha256`);
  if (expected !== null) {
    if (relativePath !== expected.relativePath ||
        raw.planSha256 !== expected.planSha256 ||
        raw.plannedGateCount !== expected.plannedGateCount ||
        raw.plannedGateIdsSha256 !== expected.plannedGateIdsSha256 ||
        raw.recordCount !== expected.recordCount ||
        raw.nextEventType !== expected.nextEventType ||
        raw.nextOrdinal !== expected.nextOrdinal) {
      throw new Error(`${label}: expected journal state drift`);
    }
    if (expected.identity !== undefined) {
      exactStableIdentity(identity, expected.identity, `${label} identity`);
    }
    if (expected.minimumByteLength !== undefined &&
        raw.byteLength <= expected.minimumByteLength) {
      throw new Error(`${label}: journal byte length did not strictly increase`);
    }
    if (expected.previousSha256 !== undefined && raw.sha256 === expected.previousSha256) {
      throw new Error(`${label}: journal whole-file digest did not advance`);
    }
    if (expected.previousFrameSha256 !== undefined &&
        raw.lastFrameSha256 === expected.previousFrameSha256) {
      throw new Error(`${label}: journal frame chain did not advance`);
    }
  }
  return {
    relativePath,
    identity,
    byteLength: raw.byteLength,
    sha256: raw.sha256,
    planSha256: raw.planSha256,
    plannedGateCount: raw.plannedGateCount,
    plannedGateIdsSha256: raw.plannedGateIdsSha256,
    recordCount: raw.recordCount,
    lastFrameSha256: raw.lastFrameSha256,
    nextEventType: raw.nextEventType,
    nextOrdinal: raw.nextOrdinal,
  };
}

function publicExecutionJournalBinding(state, record) {
  return {
    relativePath: record.relativePath,
    path: path.join(state.archiveRoot, ...record.relativePath.split("/")),
    identity: record.identity,
    byteLength: record.byteLength,
    sha256: record.sha256,
    recordCount: record.recordCount,
    lastFrameSha256: record.lastFrameSha256,
    nextEventType: record.nextEventType,
    nextOrdinal: record.nextOrdinal,
  };
}

function applyExecutionJournalDirectoryResults(state, nextDirectories, records,
  expectedPaths, label) {
  if (!Array.isArray(records) || records.length !== expectedPaths.length) {
    throw new Error(`${label}: directory result inventory length drift`);
  }
  for (let index = 0; index < records.length; index += 1) {
    const raw = records[index];
    exactKeys(raw, ["relativePath", "identity"], `${label} directory ${index}`);
    const relativePath = normalizeRetainedRelativePath(
      raw.relativePath,
      `${label} directory ${index} relativePath`,
    );
    if (relativePath !== expectedPaths[index] || state.files.has(relativePath)) {
      throw new Error(`${label}: directory result path drift`);
    }
    const identity = stableIdentityFromRecord(
      raw.identity,
      `${label} directory ${relativePath}`,
    );
    if (identity.type !== "directory" || identity.mode !== 0o700) {
      throw new Error(`${label}: directory privacy drift`);
    }
    const existing = nextDirectories.get(relativePath);
    if (existing !== undefined) {
      assertRetainedIdentity(identity, existing, `${label} directory ${relativePath}`);
    }
    nextDirectories.set(relativePath, identity);
  }
}

function normalizeExecutionJournalArtifactResult(raw, expected, state, nextFiles,
  label) {
  exactKeys(raw, ["relativePath", "identity", "byteLength", "sha256"], label);
  const relativePath = normalizeRetainedRelativePath(raw.relativePath, `${label} path`);
  if (relativePath !== expected.relativePath ||
      raw.byteLength !== expected.byteLength || raw.sha256 !== expected.sha256 ||
      state.directories.has(relativePath) || nextFiles.has(relativePath)) {
    throw new Error(`${label}: artifact result drift`);
  }
  const identity = stableIdentityFromRecord(raw.identity, `${label} identity`);
  if (identity.type !== "regular" || identity.mode !== 0o600 || identity.nlink !== 1) {
    throw new Error(`${label}: artifact privacy drift`);
  }
  const record = {
    identity,
    byteLength: raw.byteLength,
    sha256: raw.sha256,
  };
  nextFiles.set(relativePath, record);
  return {
    relativePath,
    path: path.join(state.archiveRoot, ...relativePath.split("/")),
    identity,
    byteLength: raw.byteLength,
    sha256: raw.sha256,
  };
}

export async function initializeRetainedSignatureLabExecutionJournal(run, options) {
  const prepared = normalizeExecutionJournalPlan(options);
  const state = await retainedRunStateForOperation(run);
  return runRetainedMutationExclusive(state, async () => {
    try {
      if (state.executionJournal !== null || state.files.has(prepared.relativePath)) {
        throw new Error("execution journal is already initialized for this retained run");
      }
      assertRetainedRunNamedBindings(state);
      const result = await requestRetainedMutationWorkerJournalCreate(
        state,
        {
          schemaVersion: RETAINED_EXECUTION_JOURNAL_CREATE_SCHEMA,
          rootIdentity: state.archiveIdentity,
          directories: retainedDirectoryBindings(state),
          relativePath: prepared.relativePath,
          planSha256: prepared.planSha256,
          plannedGates: prepared.plannedGates,
        },
        RETAINED_WRITE_TIMEOUT_BASE_MS,
      );
      exactKeys(result, [
        "schemaVersion",
        "ok",
        "rootBefore",
        "rootAfter",
        "directories",
        "journal",
      ], "execution journal creation worker result");
      if (result.schemaVersion !== RETAINED_EXECUTION_JOURNAL_CREATE_SCHEMA ||
          result.ok !== true) {
        throw new Error("execution journal creation worker result envelope drift");
      }
      const rootBefore = stableIdentityFromRecord(
        result.rootBefore,
        "execution journal creation rootBefore",
      );
      const rootAfter = stableIdentityFromRecord(
        result.rootAfter,
        "execution journal creation rootAfter",
      );
      assertRetainedIdentity(rootBefore, state.archiveIdentity,
        "execution journal creation rootBefore");
      assertRetainedIdentity(rootAfter, state.archiveIdentity,
        "execution journal creation rootAfter");
      const nextDirectories = new Map(state.directories);
      const nextFiles = new Map(state.files);
      applyExecutionJournalDirectoryResults(
        state,
        nextDirectories,
        result.directories,
        prepared.parentPaths,
        "execution journal creation",
      );
      const journal = normalizeExecutionJournalWorkerRecord(
        result.journal,
        {
          relativePath: prepared.relativePath,
          planSha256: prepared.planSha256,
          plannedGateCount: prepared.plannedGates.length,
          plannedGateIdsSha256: prepared.plannedGateIdsSha256,
          recordCount: 0,
          nextEventType: "STARTED",
          nextOrdinal: 1,
        },
        "execution journal creation record",
      );
      nextFiles.set(journal.relativePath, {
        identity: journal.identity,
        byteLength: journal.byteLength,
        sha256: journal.sha256,
      });
      state.directories = nextDirectories;
      state.files = nextFiles;
      state.executionJournal = {
        ...journal,
        plannedGates: prepared.plannedGates,
      };
      assertRetainedRunNamedBindings(state);
      return frozenCanonical({
        schemaVersion: RETAINED_EXECUTION_JOURNAL_PUBLICATION_SCHEMA,
        ...publicExecutionJournalBinding(state, journal),
        planSha256: journal.planSha256,
        plannedGateCount: journal.plannedGateCount,
        plannedGateIdsSha256: journal.plannedGateIdsSha256,
      }, "execution journal publication");
    } catch (error) {
      throw await poisonRetainedRun(state, error, "execution journal creation");
    }
  });
}

function prepareExecutionJournalEvent(state, event) {
  if (state.executionJournal === null) {
    throw new Error("execution journal is not initialized for this retained run");
  }
  if (state.executionJournal.nextEventType === "COMPLETE") {
    throw new Error("execution journal is already COMPLETE");
  }
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("execution journal event must be one object");
  }
  const eventType = event.eventType;
  const roles = eventType === "STARTED"
    ? [["attempt", "attempt.json"]]
    : eventType === "RESULT"
      ? [["stdout", "stdout.bin"], ["stderr", "stderr.bin"],
          ["result", "result.json"]]
      : null;
  if (roles === null) throw new Error("execution journal eventType drift");
  exactKeys(
    event,
    eventType === "STARTED"
      ? ["eventType", "ordinal", "gateId", "attempt"]
      : ["eventType", "ordinal", "gateId", "status", "exitCode", "signal",
          "stdout", "stderr", "result"],
    `execution journal ${eventType} event`,
  );
  const journal = state.executionJournal;
  const plannedGate = journal.plannedGates[journal.nextOrdinal - 1];
  normalizePrintableAscii(event.gateId, "execution journal event gateId", 1, 512);
  if (eventType !== journal.nextEventType || event.ordinal !== journal.nextOrdinal ||
      event.gateId !== plannedGate?.gateId) {
    throw new Error("execution journal event does not match the expected next gate");
  }
  if (eventType === "RESULT") {
    if (!(["PASS", "FAIL"].includes(event.status)) ||
        (event.exitCode !== null &&
         (!Number.isSafeInteger(event.exitCode) || typeof event.exitCode === "boolean")) ||
        (event.signal !== null && typeof event.signal !== "string")) {
      throw new Error("execution journal RESULT status binding drift");
    }
    if (event.signal !== null) {
      normalizePrintableAscii(
        event.signal,
        "execution journal RESULT signal",
        1,
        64,
      );
    }
    if (event.status === "PASS" &&
        (event.exitCode !== 0 || event.signal !== null)) {
      throw new Error("execution journal PASS requires exitCode 0 and signal null");
    }
    if (event.signal !== null && event.exitCode !== null) {
      throw new Error("execution journal signaled RESULT requires exitCode null");
    }
  }
  const artifacts = {};
  const payloads = [];
  const parentPaths = new Set();
  const parents = new Set();
  let totalByteLength = 0;
  for (const [role, basename] of roles) {
    const raw = event[role];
    exactKeys(raw, ["relativePath", "bytes"], `execution journal ${role}`);
    const { relativePath, parts } = normalizeExecutionJournalArtifactPath(
      raw.relativePath,
      basename,
      `execution journal ${role} relativePath`,
    );
    if (!Buffer.isBuffer(raw.bytes) && !(raw.bytes instanceof Uint8Array)) {
      throw new Error(`execution journal ${role} bytes drift`);
    }
    const bytes = Buffer.from(raw.bytes);
    if (bytes.length > MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES) {
      throw new Error(`execution journal ${role} exceeds the retained file limit`);
    }
    totalByteLength += bytes.length;
    const parent = parts.slice(0, -1).join("/");
    parents.add(parent);
    for (let depth = 1; depth < parts.length; depth += 1) {
      parentPaths.add(parts.slice(0, depth).join("/"));
    }
    artifacts[role] = {
      relativePath,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      bytes,
    };
    payloads.push(bytes);
  }
  if (parents.size !== 1 ||
      new Set(Object.values(artifacts).map((artifact) => artifact.relativePath)).size !==
        roles.length ||
      totalByteLength > (eventType === "STARTED"
        ? MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES
        : MAX_RETAINED_SIGNATURE_LAB_JOURNAL_RESULT_BYTES)) {
    throw new Error("execution journal artifact parent, path, or aggregate drift");
  }
  const parent = [...parents][0];
  if (eventType === "STARTED") {
    if (state.directories.has(parent) || state.files.has(artifacts.attempt.relativePath)) {
      throw new Error("execution journal STARTED target already exists");
    }
  } else {
    const attemptPath = `${parent}/attempt.json`;
    if (!state.directories.has(parent) || !state.files.has(attemptPath)) {
      throw new Error("execution journal RESULT is missing its durable STARTED binding");
    }
  }
  for (const artifact of Object.values(artifacts)) {
    if (state.files.has(artifact.relativePath) ||
        state.directories.has(artifact.relativePath)) {
      throw new Error("execution journal artifact target already exists");
    }
  }
  const nextRecordCount = journal.recordCount + 1;
  const nextEventType = eventType === "STARTED"
    ? "RESULT"
    : event.ordinal === journal.plannedGateCount
      ? "COMPLETE"
      : "STARTED";
  const nextOrdinal = eventType === "STARTED" ? event.ordinal : event.ordinal + 1;
  const workerEvent = {
    eventType,
    ordinal: event.ordinal,
    gateId: event.gateId,
    ...(eventType === "RESULT"
      ? { status: event.status, exitCode: event.exitCode, signal: event.signal }
      : {}),
  };
  for (const [role] of roles) {
    const artifact = artifacts[role];
    workerEvent[role] = {
      relativePath: artifact.relativePath,
      byteLength: artifact.byteLength,
      sha256: artifact.sha256,
    };
  }
  return {
    eventType,
    roles,
    artifacts,
    payloads,
    totalByteLength,
    parentPaths: [...parentPaths].sort(compareUnicodeOrdinal),
    workerEvent,
    nextRecordCount,
    nextEventType,
    nextOrdinal,
  };
}

function privateExecutionJournalWorkerBinding(journal) {
  return {
    relativePath: journal.relativePath,
    identity: journal.identity,
    byteLength: journal.byteLength,
    sha256: journal.sha256,
    planSha256: journal.planSha256,
    plannedGateCount: journal.plannedGateCount,
    plannedGateIdsSha256: journal.plannedGateIdsSha256,
    recordCount: journal.recordCount,
    lastFrameSha256: journal.lastFrameSha256,
    nextEventType: journal.nextEventType,
    nextOrdinal: journal.nextOrdinal,
  };
}

export async function appendRetainedSignatureLabExecutionJournal(run, event) {
  const state = await retainedRunStateForOperation(run);
  return runRetainedMutationExclusive(state, async () => {
    try {
      assertRetainedRunNamedBindings(state);
      const prepared = prepareExecutionJournalEvent(state, event);
      const currentJournal = state.executionJournal;
      const result = await requestRetainedMutationWorkerJournalAppend(
        state,
        {
          schemaVersion: RETAINED_EXECUTION_JOURNAL_APPEND_SCHEMA,
          rootIdentity: state.archiveIdentity,
          directories: retainedDirectoryBindings(state),
          journal: privateExecutionJournalWorkerBinding(currentJournal),
          event: prepared.workerEvent,
        },
        prepared.payloads,
        retainedExecutionJournalTimeoutMs(prepared.totalByteLength),
      );
      exactKeys(result, [
        "schemaVersion",
        "ok",
        "rootBefore",
        "rootAfter",
        "directories",
        "eventType",
        "sequence",
        "gateId",
        "ordinal",
        "journal",
        "artifacts",
      ], "execution journal append worker result");
      if (result.schemaVersion !== RETAINED_EXECUTION_JOURNAL_APPEND_SCHEMA ||
          result.ok !== true || result.eventType !== prepared.eventType ||
          result.sequence !== prepared.nextRecordCount ||
          result.gateId !== event.gateId || result.ordinal !== event.ordinal) {
        throw new Error("execution journal append worker result envelope drift");
      }
      const rootBefore = stableIdentityFromRecord(
        result.rootBefore,
        "execution journal append rootBefore",
      );
      const rootAfter = stableIdentityFromRecord(
        result.rootAfter,
        "execution journal append rootAfter",
      );
      assertRetainedIdentity(rootBefore, state.archiveIdentity,
        "execution journal append rootBefore");
      assertRetainedIdentity(rootAfter, state.archiveIdentity,
        "execution journal append rootAfter");

      const nextDirectories = new Map(state.directories);
      const nextFiles = new Map(state.files);
      applyExecutionJournalDirectoryResults(
        state,
        nextDirectories,
        result.directories,
        prepared.parentPaths,
        "execution journal append",
      );
      exactKeys(
        result.artifacts,
        prepared.roles.map(([role]) => role),
        "execution journal append artifact result",
      );
      const publicArtifacts = {};
      for (const [role] of prepared.roles) {
        publicArtifacts[role] = normalizeExecutionJournalArtifactResult(
          result.artifacts[role],
          prepared.artifacts[role],
          state,
          nextFiles,
          `execution journal append ${role}`,
        );
      }
      const journal = normalizeExecutionJournalWorkerRecord(
        result.journal,
        {
          relativePath: currentJournal.relativePath,
          identity: currentJournal.identity,
          planSha256: currentJournal.planSha256,
          plannedGateCount: currentJournal.plannedGateCount,
          plannedGateIdsSha256: currentJournal.plannedGateIdsSha256,
          recordCount: prepared.nextRecordCount,
          nextEventType: prepared.nextEventType,
          nextOrdinal: prepared.nextOrdinal,
          minimumByteLength: currentJournal.byteLength,
          previousSha256: currentJournal.sha256,
          previousFrameSha256: currentJournal.lastFrameSha256,
        },
        "execution journal append record",
      );
      const cachedJournalFile = nextFiles.get(journal.relativePath);
      if (cachedJournalFile === undefined) {
        throw new Error("execution journal cached file binding is missing");
      }
      exactStableIdentity(
        cachedJournalFile.identity,
        currentJournal.identity,
        "execution journal cached file",
      );
      nextFiles.set(journal.relativePath, {
        identity: journal.identity,
        byteLength: journal.byteLength,
        sha256: journal.sha256,
      });
      state.directories = nextDirectories;
      state.files = nextFiles;
      state.executionJournal = {
        ...journal,
        plannedGates: currentJournal.plannedGates,
      };
      assertRetainedRunNamedBindings(state);
      return frozenCanonical({
        schemaVersion: RETAINED_EXECUTION_JOURNAL_APPEND_PUBLICATION_SCHEMA,
        eventType: prepared.eventType,
        sequence: result.sequence,
        gateId: event.gateId,
        ordinal: event.ordinal,
        journal: publicExecutionJournalBinding(state, journal),
        artifacts: publicArtifacts,
      }, "execution journal append publication");
    } catch (error) {
      throw await poisonRetainedRun(state, error, "execution journal append");
    }
  });
}

function normalizeExpectedEntries(entries) {
  if (!Array.isArray(entries)) throw new Error("expectedEntries: expected an array");
  let previous = null;
  return entries.map((raw, index) => {
    const label = `expectedEntries[${index}]`;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`${label}: expected one entry object`);
    }
    const expectedKeys = raw.type === "regular"
      ? ["relativePath", "type", "dev", "ino", "uid", "gid", "mode", "nlink",
        "byteLength", "sha256"]
      : ["relativePath", "type", "dev", "ino", "uid", "gid", "mode", "nlink"];
    exactKeys(raw, expectedKeys, label);
    if (raw.type !== "directory" && raw.type !== "regular") {
      throw new Error(`${label}: unsafe entry type`);
    }
    if (typeof raw.relativePath !== "string" || raw.relativePath === "" ||
        raw.relativePath.startsWith("/") || raw.relativePath.includes("\\") ||
        raw.relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error(`${label}: invalid relative path`);
    }
    if (previous !== null && compareUnicodeOrdinal(previous, raw.relativePath) >= 0) {
      throw new Error(`${label}: entries are not strictly sorted and unique`);
    }
    previous = raw.relativePath;
    for (const field of ["uid", "gid", "mode", "nlink"]) {
      if (!Number.isSafeInteger(raw[field]) || raw[field] < 0) {
        throw new Error(`${label}.${field}: expected a nonnegative safe integer`);
      }
    }
    for (const field of ["dev", "ino"]) {
      if (typeof raw[field] !== "string" || !/^[0-9]+$/u.test(raw[field])) {
        throw new Error(`${label}.${field}: expected a decimal identity string`);
      }
    }
    if (raw.type === "regular") {
      if (!Number.isSafeInteger(raw.byteLength) || raw.byteLength < 0 ||
          typeof raw.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(raw.sha256)) {
        throw new Error(`${label}: invalid regular-file byte binding`);
      }
    }
    return canonicalize(raw, label);
  });
}

function runArchiveInventory(
  archiveRoot,
  expectedRootIdentity,
  expectedEntries,
  heldDescriptor = null,
) {
  const python = bindTrustedPython();
  const ownsDescriptor = heldDescriptor === null;
  const root = ownsDescriptor
    ? openBoundDirectory(archiveRoot, expectedRootIdentity, "archive root")
    : (() => {
        const binding = assertHeldDirectoryNamed(
          archiveRoot,
          heldDescriptor,
          "held archive root",
        );
        const normalized = binding.identity;
        for (const field of ["type", "dev", "ino", "uid", "gid", "mode"]) {
          if (normalized[field] !== expectedRootIdentity[field]) {
            throw new Error(`held archive root: expected ${field} identity drift`);
          }
        }
        if (!Number.isSafeInteger(expectedRootIdentity.nlink) ||
            expectedRootIdentity.nlink < 1 ||
            expectedRootIdentity.nlink > normalized.nlink) {
          throw new Error("held archive root: expected nlink chronology drift");
        }
        return {
          descriptor: heldDescriptor,
          identity: normalized,
          stat: binding.stat,
        };
      })();
  try {
    const execution = spawnSync(PYTHON_PATH,
      ["-I", "-S", "-E", "-B", "-c", ARCHIVE_INVENTORY_PYTHON_SOURCE], {
        cwd: "/",
        encoding: "utf8",
        env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
        input: JSON.stringify({ expectedRootIdentity, expectedEntries }),
        maxBuffer: 128 * 1024 * 1024,
        timeout: 120_000,
        stdio: ["pipe", "pipe", "pipe", root.descriptor],
      });
    const result = parseHelperResult(
      execution,
      ARCHIVE_INVENTORY_SCHEMA,
      0,
      "descriptor-relative archive inventory",
    );
    exactKeys(result, ["schemaVersion", "ok", "rootIdentity", "entries"],
      "archive inventory result");
    const after = fstatSync(root.descriptor, { bigint: true });
    assertSameStat(after, root.stat, "archive root after inventory",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const namedAfter = lstatSync(archiveRoot, { bigint: true });
    assertSameStat(namedAfter, after, "archive root name after inventory",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    return {
      python,
      rootIdentity: canonicalize(result.rootIdentity, "observed root identity"),
      entries: canonicalize(result.entries, "observed archive entries"),
      treeDigestSha256: sha256(canonicalJsonBytes({
        rootIdentity: result.rootIdentity,
        entries: result.entries,
      })),
    };
  } finally {
    if (ownsDescriptor) closeSync(root.descriptor);
  }
}

function publishSidecars(evidenceRoot, files, heldDescriptor = null) {
  const python = bindTrustedPython();
  const ownsDescriptor = heldDescriptor === null;
  const root = ownsDescriptor
    ? openBoundDirectory(evidenceRoot, null, "evidence root")
    : (() => {
        const binding = assertHeldDirectoryNamed(
          evidenceRoot,
          heldDescriptor,
          "held evidence root",
        );
        return {
          descriptor: heldDescriptor,
          identity: binding.identity,
          stat: binding.stat,
        };
      })();
  try {
    const encodedFiles = files.map(({ name, bytes }) => ({
      name,
      base64: bytes.toString("base64"),
      byteLength: bytes.length,
      sha256: sha256(bytes),
    }));
    const execution = spawnSync(PYTHON_PATH,
      ["-I", "-S", "-E", "-B", "-c", SIDECAR_PUBLICATION_PYTHON_SOURCE], {
        cwd: "/",
        encoding: "utf8",
        env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
        input: JSON.stringify({
          rootIdentity: pathIdentity(root.stat, "directory"),
          files: encodedFiles,
        }),
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30_000,
        stdio: ["pipe", "pipe", "pipe", root.descriptor],
      });
    const result = parseHelperResult(
      execution,
      SIDECAR_PUBLICATION_SCHEMA,
      0,
      "descriptor-relative sidecar publication",
    );
    exactKeys(result, ["schemaVersion", "ok", "rootBefore", "rootAfter", "files"],
      "sidecar publication result");
    if (JSON.stringify(result.files.map((entry) => entry.name)) !==
        JSON.stringify(SIDECAR_BASENAMES)) {
      throw new Error("sidecar publication result inventory drift");
    }
    for (let index = 0; index < result.files.length; index += 1) {
      exactKeys(result.files[index], ["name", "byteLength", "sha256", "identity"],
        `sidecar publication result file ${index}`);
      if (result.files[index].byteLength !== files[index].bytes.length ||
          result.files[index].sha256 !== sha256(files[index].bytes)) {
        throw new Error(`sidecar publication result byte binding drift ${index}`);
      }
    }
    const after = fstatSync(root.descriptor, { bigint: true });
    const namedAfter = lstatSync(evidenceRoot, { bigint: true });
    assertSameStat(namedAfter, after, "evidence root name after publication",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    return {
      python,
      rootIdentity: fullIdentity(after, "directory"),
      files: canonicalize(result.files, "published sidecar records"),
    };
  } finally {
    if (ownsDescriptor) closeSync(root.descriptor);
  }
}

function fullIdentityFromRecord(value, label) {
  return normalizePhysicalIdentityRecord(value, FULL_IDENTITY_FIELDS, label);
}

function makeExternalReceipt(evidenceRoot, publication) {
  if (JSON.stringify(publication.files.map((record) => record.name)) !==
      JSON.stringify(SIDECAR_BASENAMES)) {
    throw new Error("published sidecar receipt basename inventory drift");
  }
  return frozenCanonical({
    schemaVersion: EXTERNAL_RECEIPT_SCHEMA,
    evidenceRoot,
    evidenceRootIdentity: fullIdentityFromRecord(
      publication.rootIdentity,
      "external receipt evidence root identity",
    ),
    sidecars: publication.files.map((record) => ({
      basename: record.name,
      byteLength: record.byteLength,
      identity: fullIdentityFromRecord(
        record.identity,
        `external receipt ${record.name} identity`,
      ),
      sha256: record.sha256,
    })),
    helperProvenance: {
      python: publication.python,
      publication: {
        schemaVersion: SIDECAR_PUBLICATION_SCHEMA,
        sourceSha256: sha256(Buffer.from(SIDECAR_PUBLICATION_PYTHON_SOURCE, "utf8")),
      },
      revalidation: {
        schemaVersion: SIDECAR_REVALIDATION_SCHEMA,
        sourceSha256: sha256(Buffer.from(EVIDENCE_REVALIDATION_PYTHON_SOURCE, "utf8")),
      },
    },
  }, "external receipt");
}

function normalizeExternalReceipt(raw, evidenceRoot) {
  exactKeys(raw, [
    "schemaVersion",
    "evidenceRoot",
    "evidenceRootIdentity",
    "sidecars",
    "helperProvenance",
  ], "externalReceipt");
  if (raw.schemaVersion !== EXTERNAL_RECEIPT_SCHEMA || raw.evidenceRoot !== evidenceRoot) {
    throw new Error("externalReceipt evidence-root schema or path drift");
  }
  const evidenceRootIdentity = fullIdentityFromRecord(
    raw.evidenceRootIdentity,
    "externalReceipt.evidenceRootIdentity",
  );
  if (!Array.isArray(raw.sidecars) || raw.sidecars.length !== SIDECAR_BASENAMES.length) {
    throw new Error("externalReceipt sidecar inventory drift");
  }
  const sidecars = raw.sidecars.map((record, index) => {
    exactKeys(record, ["basename", "byteLength", "identity", "sha256"],
      `externalReceipt.sidecars[${index}]`);
    if (record.basename !== SIDECAR_BASENAMES[index] ||
        !Number.isSafeInteger(record.byteLength) || record.byteLength < 0 ||
        typeof record.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(record.sha256)) {
      throw new Error(`externalReceipt.sidecars[${index}] binding drift`);
    }
    return {
      basename: record.basename,
      byteLength: record.byteLength,
      identity: fullIdentityFromRecord(
        record.identity,
        `externalReceipt.sidecars[${index}].identity`,
      ),
      sha256: record.sha256,
    };
  });
  exactKeys(raw.helperProvenance, ["python", "publication", "revalidation"],
    "externalReceipt.helperProvenance");
  exactKeys(raw.helperProvenance.publication, ["schemaVersion", "sourceSha256"],
    "externalReceipt publication helper provenance");
  exactKeys(raw.helperProvenance.revalidation, ["schemaVersion", "sourceSha256"],
    "externalReceipt revalidation helper provenance");
  exactKeys(raw.helperProvenance.python, ["path", "sha256", "identity"],
    "externalReceipt Python helper provenance");
  const receiptPython = {
    path: raw.helperProvenance.python.path,
    sha256: raw.helperProvenance.python.sha256,
    identity: fullIdentityFromRecord(
      raw.helperProvenance.python.identity,
      "externalReceipt Python helper identity",
    ),
  };
  const expectedPython = bindTrustedPython();
  if (receiptPython.path !== expectedPython.path ||
      receiptPython.sha256 !== expectedPython.sha256 ||
      !sameFullPhysicalIdentity(receiptPython.identity, expectedPython.identity) ||
      raw.helperProvenance.publication.schemaVersion !== SIDECAR_PUBLICATION_SCHEMA ||
      raw.helperProvenance.publication.sourceSha256 !==
        sha256(Buffer.from(SIDECAR_PUBLICATION_PYTHON_SOURCE, "utf8")) ||
      raw.helperProvenance.revalidation.schemaVersion !== SIDECAR_REVALIDATION_SCHEMA ||
      raw.helperProvenance.revalidation.sourceSha256 !==
        sha256(Buffer.from(EVIDENCE_REVALIDATION_PYTHON_SOURCE, "utf8"))) {
    throw new Error("externalReceipt helper provenance drift");
  }
  return { evidenceRootIdentity, sidecars };
}

function readSidecarsFromExternalReceipt(evidenceRoot, rawReceipt) {
  const receipt = normalizeExternalReceipt(rawReceipt, evidenceRoot);
  const root = openBoundDirectory(
    evidenceRoot,
    stableIdentityFromFullRecord(
      receipt.evidenceRootIdentity,
      "external receipt evidence root identity",
    ),
    "revalidation evidence root",
  );
  try {
    const openedRootIdentity = fullIdentity(root.stat, "directory");
    if (!sameFullPhysicalIdentity(
      openedRootIdentity,
      receipt.evidenceRootIdentity,
    )) {
      throw new Error("external receipt evidence root full identity drift");
    }
    const execution = executeDescriptorHelper({
      descriptor: root.descriptor,
      input: {
        rootIdentity: receipt.evidenceRootIdentity,
        sidecars: receipt.sidecars,
      },
      label: "descriptor-relative external receipt revalidation",
      maxBuffer: 16 * 1024 * 1024,
      schema: SIDECAR_REVALIDATION_SCHEMA,
      source: EVIDENCE_REVALIDATION_PYTHON_SOURCE,
      timeout: 30_000,
    });
    const result = execution.result;
    exactKeys(result, ["schemaVersion", "ok", "rootBefore", "rootAfter", "files"],
      "external receipt revalidation result");
    if (!Array.isArray(result.files) || result.files.length !== SIDECAR_BASENAMES.length) {
      throw new Error("external receipt revalidation result inventory drift");
    }
    const after = fstatSync(root.descriptor, { bigint: true });
    assertSameStat(after, root.stat, "held evidence root after receipt revalidation",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const namedAfter = lstatSync(evidenceRoot, { bigint: true });
    assertSameStat(namedAfter, after, "named evidence root after receipt revalidation",
      ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
    const records = new Map();
    for (let index = 0; index < result.files.length; index += 1) {
      const record = result.files[index];
      exactKeys(record, ["basename", "byteLength", "identity", "sha256", "base64"],
        `external receipt result file ${index}`);
      const resultIdentity = fullIdentityFromRecord(
        record.identity,
        `external receipt result file ${index} identity`,
      );
      if (record.basename !== SIDECAR_BASENAMES[index] ||
          record.byteLength !== receipt.sidecars[index].byteLength ||
          record.sha256 !== receipt.sidecars[index].sha256 ||
          !sameFullPhysicalIdentity(
            resultIdentity,
            receipt.sidecars[index].identity,
          )) {
        throw new Error(`external receipt result binding drift ${record.basename}`);
      }
      const bytes = Buffer.from(record.base64, "base64");
      if (bytes.length !== record.byteLength || sha256(bytes) !== record.sha256) {
        throw new Error(`external receipt result byte digest drift ${record.basename}`);
      }
      records.set(record.basename, {
        bytes,
        byteLength: record.byteLength,
        identity: resultIdentity,
        sha256: record.sha256,
      });
    }
    return records;
  } finally {
    closeSync(root.descriptor);
  }
}

function parseCanonicalJsonRecord(record, expectedSchema, label) {
  let value;
  try {
    value = JSON.parse(record.bytes.toString("utf8"));
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (value?.schemaVersion !== expectedSchema ||
      !record.bytes.equals(canonicalJsonBytes(value))) {
    throw new Error(`${label}: noncanonical or wrong-schema JSON`);
  }
  return value;
}

function validateOutcome(value) {
  if (value !== PASS_RETAINED_SEALED_ARCHIVE &&
      value !== FAIL_RETAINED_SEALED_ARCHIVE) {
    throw new Error(`outcome: expected a sealed archive outcome, not ${String(value)}`);
  }
  return value;
}

function makeResult({ archiveRoot, manifestPath, reportPath, sealPath, manifestBytes,
  reportBytes, sealBytes, treeDigestSha256, outcome, externalReceipt }) {
  return Object.freeze({
    archiveRoot,
    outcome,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    manifestPath,
    manifestSha256: sha256(manifestBytes),
    reportPath,
    reportSha256: sha256(reportBytes),
    sealPath,
    sealSha256: sha256(sealBytes),
    treeDigestSha256,
    externalReceipt,
  });
}

export async function sealRetainedSignatureLabEvidence(options) {
  let runState = null;
  let operationMarker = null;
  let archiveRoot;
  let evidenceRoot;
  let expectedRootIdentity;
  let expectedEntries;
  let heldArchiveDescriptor = null;
  let heldEvidenceDescriptor = null;
  try {
  if (options !== null && typeof options === "object" && !Array.isArray(options) &&
      Object.hasOwn(options, "run")) {
    exactKeys(options, ["run", "outcome", "provenance"], "opaque-run seal options");
    const candidateRunState = await retainedRunStateForOperation(options.run);
    operationMarker = beginRetainedOperation(candidateRunState, "SEAL");
    runState = candidateRunState;
    assertRetainedRunNamedBindings(runState);
    archiveRoot = runState.archiveRoot;
    evidenceRoot = runState.evidenceRoot;
    expectedRootIdentity = canonicalize(
      runState.archiveIdentity,
      "opaque-run expectedRootIdentity",
    );
    expectedEntries = normalizeExpectedEntries(retainedRunExpectedEntries(runState));
    heldArchiveDescriptor = runState.archiveDescriptor;
    heldEvidenceDescriptor = runState.evidenceDescriptor;
  } else {
    exactKeys(options, ["archiveRoot", "expectedRootIdentity", "expectedEntries",
      "evidenceRoot", "outcome", "provenance"], "path-mode seal options");
    archiveRoot = assertAbsoluteStarshipPath(options.archiveRoot, "archiveRoot");
    evidenceRoot = assertAbsoluteStarshipPath(options.evidenceRoot, "evidenceRoot");
    expectedRootIdentity = canonicalize(options.expectedRootIdentity,
      "expectedRootIdentity");
    expectedEntries = normalizeExpectedEntries(options.expectedEntries);
  }
  if (archiveRoot === evidenceRoot || path.relative(archiveRoot, evidenceRoot) === "" ||
      (!path.relative(archiveRoot, evidenceRoot).startsWith(`..${path.sep}`) &&
       path.relative(archiveRoot, evidenceRoot) !== "..")) {
    throw new Error("evidenceRoot must remain outside archiveRoot");
  }
  const outcome = validateOutcome(options.outcome);
  const provenance = canonicalize(options.provenance, "provenance");

  const inventory = runArchiveInventory(
    archiveRoot,
    expectedRootIdentity,
    expectedEntries,
    heldArchiveDescriptor,
  );
  const manifestPath = path.join(evidenceRoot, MANIFEST_BASENAME);
  const reportPath = path.join(evidenceRoot, REPORT_BASENAME);
  const sealPath = path.join(evidenceRoot, SEAL_BASENAME);

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA,
    archiveRoot,
    outcome,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    expectedRootIdentity,
    expectedEntries,
    observedRootIdentity: inventory.rootIdentity,
    observedEntries: inventory.entries,
    treeDigestSha256: inventory.treeDigestSha256,
    inventoryHelper: {
      python: inventory.python,
      sourceSha256: sha256(Buffer.from(ARCHIVE_INVENTORY_PYTHON_SOURCE, "utf8")),
    },
    retainedRunHelper: runState === null ? null : {
      creation: runState.creationHelper,
      mutation: {
        schemaVersion: RETAINED_RUN_MUTATION_SCHEMA,
        sourceSha256: runState.mutationHelperSourceSha256,
      },
    },
    provenance,
  };
  const manifestBytes = canonicalJsonBytes(manifest);
  const report = {
    schemaVersion: REPORT_SCHEMA,
    archiveRoot,
    outcome,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    manifestPath,
    manifestSha256: sha256(manifestBytes),
    treeDigestSha256: inventory.treeDigestSha256,
  };
  const reportBytes = canonicalJsonBytes(report);
  const seal = {
    schemaVersion: SEAL_SCHEMA,
    archiveRoot,
    outcome,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    manifestPath,
    manifestSha256: sha256(manifestBytes),
    reportPath,
    reportSha256: sha256(reportBytes),
    treeDigestSha256: inventory.treeDigestSha256,
    inventoryHelperSourceSha256:
      sha256(Buffer.from(ARCHIVE_INVENTORY_PYTHON_SOURCE, "utf8")),
    publicationHelperSourceSha256:
      sha256(Buffer.from(SIDECAR_PUBLICATION_PYTHON_SOURCE, "utf8")),
    revalidationHelperSourceSha256:
      sha256(Buffer.from(EVIDENCE_REVALIDATION_PYTHON_SOURCE, "utf8")),
  };
  const sealBytes = canonicalJsonBytes(seal);

  const publication = publishSidecars(evidenceRoot, [
    { name: MANIFEST_BASENAME, bytes: manifestBytes },
    { name: REPORT_BASENAME, bytes: reportBytes },
    { name: SEAL_BASENAME, bytes: sealBytes },
  ], heldEvidenceDescriptor);
  const externalReceipt = makeExternalReceipt(evidenceRoot, publication);

  const finalInventory = runArchiveInventory(
    archiveRoot,
    expectedRootIdentity,
    expectedEntries,
    heldArchiveDescriptor,
  );
  if (JSON.stringify(finalInventory.rootIdentity) !== JSON.stringify(inventory.rootIdentity) ||
      JSON.stringify(finalInventory.entries) !== JSON.stringify(inventory.entries) ||
      finalInventory.treeDigestSha256 !== inventory.treeDigestSha256) {
    throw new Error("archive inventory drifted across external evidence publication");
  }

  const publishedSidecars = readSidecarsFromExternalReceipt(
    evidenceRoot,
    externalReceipt,
  );
  const publishedManifest = publishedSidecars.get(MANIFEST_BASENAME);
  const publishedReport = publishedSidecars.get(REPORT_BASENAME);
  const publishedSeal = publishedSidecars.get(SEAL_BASENAME);
  if (publishedManifest === undefined || publishedReport === undefined ||
      publishedSeal === undefined) {
    throw new Error("published sidecar receipt inventory drifted");
  }
  if (!publishedManifest.bytes.equals(manifestBytes) ||
      !publishedReport.bytes.equals(reportBytes) ||
      !publishedSeal.bytes.equals(sealBytes)) {
    throw new Error("published sidecar bytes drifted");
  }
  const result = makeResult({ archiveRoot, manifestPath, reportPath, sealPath, manifestBytes,
    reportBytes, sealBytes, treeDigestSha256: inventory.treeDigestSha256, outcome,
    externalReceipt });
  if (runState !== null) {
    assertRetainedRunNamedBindings(runState);
  }
  return result;
  } catch (error) {
    if (runState !== null && runState.lifecycle === RETAINED_RUN_OPEN) {
      throw await poisonRetainedRun(runState, error, "seal");
    }
    throw error;
  } finally {
    if (runState !== null && operationMarker !== null) {
      finishRetainedOperation(runState, operationMarker);
    }
  }
}

export async function revalidateRetainedSignatureLabEvidence(options) {
  exactKeys(options, ["manifestPath", "sealPath", "reportPath", "externalReceipt"],
    "revalidation options");
  const manifestPath = assertAbsoluteStarshipPath(options.manifestPath, "manifestPath");
  const reportPath = assertAbsoluteStarshipPath(options.reportPath, "reportPath");
  const sealPath = assertAbsoluteStarshipPath(options.sealPath, "sealPath");
  if (path.basename(manifestPath) !== MANIFEST_BASENAME ||
      path.basename(reportPath) !== REPORT_BASENAME ||
      path.basename(sealPath) !== SEAL_BASENAME ||
      path.dirname(manifestPath) !== path.dirname(reportPath) ||
      path.dirname(manifestPath) !== path.dirname(sealPath)) {
    throw new Error("revalidation sidecar paths are not one exact evidence set");
  }
  const evidenceRoot = path.dirname(manifestPath);
  const sidecars = readSidecarsFromExternalReceipt(
    evidenceRoot,
    options.externalReceipt,
  );
  const manifestRecord = sidecars.get(MANIFEST_BASENAME);
  const reportRecord = sidecars.get(REPORT_BASENAME);
  const sealRecord = sidecars.get(SEAL_BASENAME);
  if (manifestRecord === undefined || reportRecord === undefined ||
      sealRecord === undefined) {
    throw new Error("retained external receipt sidecar inventory drift");
  }
  const manifest = parseCanonicalJsonRecord(manifestRecord, MANIFEST_SCHEMA,
    "retained manifest");
  const report = parseCanonicalJsonRecord(reportRecord, REPORT_SCHEMA, "retained report");
  const seal = parseCanonicalJsonRecord(sealRecord, SEAL_SCHEMA, "retained seal");

  validateOutcome(manifest.outcome);
  if (seal.manifestPath !== manifestPath || seal.reportPath !== reportPath ||
      seal.manifestSha256 !== manifestRecord.sha256 ||
      seal.reportSha256 !== reportRecord.sha256 ||
      report.manifestPath !== manifestPath ||
      report.manifestSha256 !== manifestRecord.sha256 ||
      report.archiveRoot !== manifest.archiveRoot || seal.archiveRoot !== manifest.archiveRoot ||
      report.outcome !== manifest.outcome || seal.outcome !== manifest.outcome ||
      report.treeDigestSha256 !== manifest.treeDigestSha256 ||
      seal.treeDigestSha256 !== manifest.treeDigestSha256 ||
      manifest.retainedArchiveCount !== 1 || report.retainedArchiveCount !== 1 ||
      seal.retainedArchiveCount !== 1 ||
      manifest.destructiveCleanupAttempted !== false ||
      report.destructiveCleanupAttempted !== false ||
      seal.destructiveCleanupAttempted !== false ||
      seal.revalidationHelperSourceSha256 !==
        sha256(Buffer.from(EVIDENCE_REVALIDATION_PYTHON_SOURCE, "utf8"))) {
    throw new Error("retained sidecar cross-binding drift");
  }

  const inventory = runArchiveInventory(
    manifest.archiveRoot,
    manifest.expectedRootIdentity,
    manifest.expectedEntries,
  );
  if (JSON.stringify(inventory.rootIdentity) !==
        JSON.stringify(manifest.observedRootIdentity) ||
      JSON.stringify(inventory.entries) !== JSON.stringify(manifest.observedEntries) ||
      inventory.treeDigestSha256 !== manifest.treeDigestSha256) {
    throw new Error("retained archive differs from its sealed inventory");
  }
  return Object.freeze({
    valid: true,
    archiveRoot: manifest.archiveRoot,
    outcome: manifest.outcome,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    manifestSha256: manifestRecord.sha256,
    reportSha256: reportRecord.sha256,
    sealSha256: sealRecord.sha256,
    treeDigestSha256: manifest.treeDigestSha256,
  });
}

export {
  FAIL_RETAINED_SEALED_ARCHIVE,
  FAIL_RETAINED_UNSEALED,
  PASS_RETAINED_SEALED_ARCHIVE,
};
