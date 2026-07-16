import { execFileSync, spawn, spawnSync } from "node:child_process";
import { constants as bufferConstants, isUtf8 } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { isAlias, isMap, isPair, isScalar, isSeq, parseAllDocuments } from "yaml";

export const EVIDENCE_SCHEMA_VERSION = 3;
const LEGACY_EVIDENCE_SCHEMA_VERSION = 2;
const READABLE_EVIDENCE_SCHEMA_VERSIONS = new Set([
  LEGACY_EVIDENCE_SCHEMA_VERSION,
  EVIDENCE_SCHEMA_VERSION
]);
export const MARKER_NAME = ".mais-evidence-root.json";
export const MARKER_SCHEMA_VERSION = 1;
export const TRANSACTION_METADATA_PATHS = Object.freeze([
  "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
  "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.json",
  "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
  "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.json",
  "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md"
]);
export const MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS = Object.freeze([
  ...TRANSACTION_METADATA_PATHS,
  "coordination/release-intake/archive"
]);
const CHILD_PROCESS_TIMEOUT_MS = 120_000;
const TAR_VERIFIER_MAX_TIMEOUT_MS = 15 * 60_000;
const TAR_PAYLOAD_ERROR_STATUS = 65;
const TAR_PAYLOAD_ERROR_SENTINEL = "MAIS_TAR_PAYLOAD_ERROR";
const FILE_HASH_CHUNK_BYTES = 1024 * 1024;
const ARCHIVE_ARTIFACT_MAX_BYTES = 8 * 1024 * 1024 * 1024;
const ARCHIVE_INVENTORY_MAX_BYTES = 512 * 1024 * 1024;
const AGGREGATE_PATCH_MAX_LINE_BYTES = 8 * 1024 * 1024;
const YAML_MAX_TEXT_BYTES = 8 * 1024 * 1024;
const YAML_MAX_DOCUMENT_COUNT = 1_024;
const YAML_MAX_NODE_COUNT = 100_000;
const YAML_MAX_NODE_DEPTH = 512;
const YAML_MAX_SOURCE_LINE_COUNT = 100_000;
const YAML_MAX_SOURCE_STRUCTURE_MARKERS = 20_000;
const JSON_MAX_TEXT_BYTES = 16 * 1024 * 1024;
const JSON_MAX_DOCUMENT_COUNT = 2_048;
const JSON_MAX_NATIVE_NODE_COUNT = 400_000;
const JSON_MAX_NODE_COUNT = 1_000_000;
const JSON_MAX_NODE_DEPTH = 512;
const JSON_MAX_SOURCE_LINE_COUNT = 500_000;
const JSON_MAX_SOURCE_STRUCTURE_MARKERS = 750_000;
const PATCH_MAX_REVIEWED_ASSIGNMENT_LINES = 10_000;
const PATCH_MAX_BINARY_PAYLOAD_RANGES = 1_024;
const PATCH_MAX_AST_CODE_LINE_BYTES = 256 * 1024;
const PATCH_MAX_AST_ASSIGNMENTS_PER_LINE = 64;
const PATCH_MAX_AST_ASSIGNMENTS_TOTAL = 2_048;
const PATCH_MAX_AST_TOTAL_SOURCE_BYTES = 2 * 1024 * 1024;
const OPAQUE_RAW_SCAN_MAX_BYTES = 1024 * 1024;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MUTATION_MONITOR_SCHEMA_VERSION = 3;
const TYPED_FSEVENTS_HELPER_PROTOCOL_VERSION = 2;
const TYPED_FSEVENTS_MAX_BUFFER_BYTES = bufferConstants.MAX_LENGTH;
const TYPED_FSEVENTS_EVENT_BACKEND = "darwin-fsevents-file-events";
const TYPED_FSEVENTS_CTIME_POLICY = "typed-xattr-only";
const NON_TYPED_EVENT_BACKEND = "none";
const STRICT_CTIME_POLICY = "strict";
const UINT64_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const TYPED_FSEVENTS_STATE_KEYS = Object.freeze([
  "droppedEventCount",
  "enabled",
  "eventRootCount",
  "eventRootFingerprint",
  "helperBinarySha256",
  "helperSourceSha256",
  "journalEntryCount",
  "journalFirstEventId",
  "journalFlushSequence",
  "journalHighWater",
  "journalLastEventId",
  "journalLastFlushedEventId",
  "journalSha256",
  "materialEventCount",
  "sourceEventCount",
  "transactionMetadataEventCount",
  "unknownEventCount",
  "unmatchedDeltaCount",
  "xattrOnlyEventCount"
]);
const MUTATION_MONITOR_STATE_KEYS = Object.freeze([
  "coverageFingerprint",
  "coveragePathCount",
  "directoryTimestampPolicy",
  "eventBackend",
  "fdCount",
  "helperProtocolVersion",
  "metadataEpoch",
  "regularFileCtimePolicy",
  "requestedWatchMode",
  "rootFdCount",
  "schemaVersion",
  "sessionId",
  "sourceEpoch",
  "typedFsevents",
  "watchMode",
  "xattrEpoch"
]);
const EVIDENCE_REPORT_RECOVERY_NAME_PATTERN = /^(.+\.json)\.recovery-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.json$/iu;
const EVIDENCE_REPORT_RECOVERY_STATES = new Set([
  "committed-cleanup-pending",
  "prepared",
  "promotion-in-progress",
  "rollback-durability-unconfirmed"
]);
const ACTIVE_EVIDENCE_REPORT_TRANSACTIONS = new Map();
export const ARCHIVE_ARTIFACT_KEYS = Object.freeze([
  "branchPatch",
  "indexInventory",
  "indexPatch",
  "statusInventory",
  "trackedPatch",
  "untrackedInventory",
  "untrackedPaths0",
  "untrackedTar",
  "worktreePatch"
]);
const ARCHIVE_ARTIFACT_NAMES = Object.freeze({
  statusInventory: "status.porcelain-v1.z",
  trackedPatch: "tracked.patch",
  indexInventory: "index.ls-files-stage.z",
  indexPatch: "index.patch",
  worktreePatch: "worktree.patch",
  branchPatch: "branch.patch",
  untrackedPaths0: "untracked.paths0",
  untrackedInventory: "untracked.inventory.json",
  untrackedTar: "untracked.tar.gz"
});
const MARKER_KEYS = Object.freeze(["repositoryId", "rootId", "schemaVersion"]);
const ARTIFACT_DESCRIPTOR_KEYS = Object.freeze(["bytes", "path", "sha256"]);
const ARCHIVE_ENTRY_KEYS = Object.freeze([
  "archiveKind",
  "archiveSetFingerprint",
  "artifacts",
  "baseHead",
  "branch",
  "currentStateFingerprint",
  "divergence",
  "head",
  "schemaVersion",
  "secretScanner",
  "statusEntries",
  "transactionMetadataExclusions",
  "untrackedEntries"
]);

const OOXML_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx"]);
const REVIEWED_BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico",
  ".pdf", ".mp3", ".wav", ".m4a", ".mp4", ".webm", ".mov",
  ".woff", ".woff2", ".ttf", ".otf"
]);
const REVIEWED_LEGACY_STAGE0_ENTRIES = Object.freeze([
  Object.freeze({
    path: "coordination/blockers/2026-05-26-S18-hjb-junior-deepseek-pro-v4-credentials.md",
    mode: "100644",
    objectId: "1d973c5ff9b8ad46a1dce16721d616b9b7df9c41",
    bytes: 2_801,
    sha256: "6938609403ff75525bd946b80f76013494ffacd7a446dc88864f73cd02cd661a"
  }),
  Object.freeze({
    path: "coordination/blockers/2026-05-26-S18-mainland-pep-high-deepseek-credentials.md",
    mode: "100644",
    objectId: "8735415eeb2a016d12c913af879b0bae86c63815",
    bytes: 1_603,
    sha256: "93bc921ce16d991750e9a5a988fa43370291c63097cf961c96513e94f4bf8925"
  }),
  Object.freeze({
    path: "coordination/blockers/2026-05-26-S18-mainland-pep-primary-deepseek-credentials.md",
    mode: "100644",
    objectId: "a87c4abaea386fd7da57bb6edf065b136085fd9b",
    bytes: 2_178,
    sha256: "d91cfb5f727ae4798855304831c173478ab1f53e0ee8e07672fc33657ac394e5"
  }),
  Object.freeze({
    path: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials.md",
    mode: "100644",
    objectId: "3d7e78774ea1eb3670e3e852d683ba62161df8ce",
    bytes: 3_597,
    sha256: "cd143d695855c7ff32535758588f840da12b84441710c9ec744b306ebc84fa6f"
  })
]);
const REVIEWED_LEGACY_STAGE0_BY_PATH = Object.freeze(Object.fromEntries(
  REVIEWED_LEGACY_STAGE0_ENTRIES.map((entry) => [entry.path, entry])
));
const REVIEWED_UNTRACKED_COORDINATION_REPORT = Object.freeze({
  path: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials.md",
  mode: 0o644,
  objectId: "3d7e78774ea1eb3670e3e852d683ba62161df8ce",
  bytes: 3_597,
  sha256: "cd143d695855c7ff32535758588f840da12b84441710c9ec744b306ebc84fa6f"
});
const REVIEWED_UNTRACKED_COORDINATION_REPORT_DISPLAY_PATH = "reviewed-untracked-coordination-report/content.md";
const REVIEWED_CURRENT_BRANCH_HEAD_TRACKED_ENTRY = Object.freeze({
  path: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials.md",
  mode: "100644",
  objectId: "3d7e78774ea1eb3670e3e852d683ba62161df8ce",
  bytes: 3_597,
  sha256: "cd143d695855c7ff32535758588f840da12b84441710c9ec744b306ebc84fa6f"
});
const REVIEWED_CURRENT_BRANCH_HEAD_TRACKED_DISPLAY_PATH = "reviewed-current-branch-head-tracked/content.md";
const REVIEWED_LEGACY_TERMINAL_PATCH_HEAD = "ec22a29b55a4329e81d96e02417f8925ccec54c3";
const REVIEWED_EXACT_A18_FINAL_HEAD = "e17471e6bc296828db591f4f060a868e075653e9";
function isReviewedLegacyCurrentHeadRevision(headRevision, pinnedRevision) {
  return headRevision === pinnedRevision || headRevision === REVIEWED_EXACT_A18_FINAL_HEAD;
}
const REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES = Object.freeze([
  Object.freeze({
    path: "coordination/release-intake/archive/codex-A06-manim-three-closure.patch",
    mode: "100644",
    objectId: "ff9228af2dda784067d0546ea25b602ffa1f32a1",
    bytes: 6_113_295,
    sha256: "6d9ed8eebaa08f07d76c7b7e6e056dd56818e3cdb17550570acd9e64308aef77"
  }),
  Object.freeze({
    path: "coordination/release-intake/archive/codex-A06-visualization-closure.patch",
    mode: "100644",
    objectId: "a2dd72596705fdae51563d34af5cc1868a359c1c",
    bytes: 6_139_347,
    sha256: "b40c37c9240a9dcfc80aab7976af5ce3744024d16f75e1a1573d354f15f6124d"
  }),
  Object.freeze({
    path: "coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.patch",
    mode: "100644",
    objectId: "7a6a78c9d6e91813916d092da46445a68699ac36",
    bytes: 7_471_822,
    sha256: "78851c7c27a3684d298c9f672f33c0a4aaf29d47d90fd91cb4f2173de39c7dfa"
  })
]);
const REVIEWED_LEGACY_TERMINAL_PATCH_BY_PATH = new Map(
  REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.map((entry) => [entry.path, entry])
);
const REVIEWED_LEGACY_TERMINAL_PATCH_DISPLAY_PREFIX = "reviewed-current-branch-head-terminal-truncated";
const REVIEWED_LEGACY_OFFICE_LOCK = Object.freeze({
  headRevision: "ec22a29b55a4329e81d96e02417f8925ccec54c3",
  path: "coordination/reports/.~26-06-30-president-report.docx",
  branchMode: "100644",
  untrackedMode: 0o644,
  objectId: "394807d551d6d3ec3f618f1488147b471a477908",
  bytes: 162,
  sha256: "f1c330d653b2e1c687da72ddd50bb55bed27fc5141c897aa6824022c571dbe45"
});
const REVIEWED_LEGACY_OFFICE_LOCK_DISPLAY_PATH = "reviewed-legacy-office-lock/content.bin";
const REVIEWED_LEGACY_PARENT_CONSOLE_REPORT = Object.freeze({
  headRevision: "ec22a29b55a4329e81d96e02417f8925ccec54c3",
  path: "coordination/reports/2026-06-04-parent-console-p0-p1-bug-audit.md",
  mode: "100644",
  objectId: "4df3bce80ebd1ed120ed918ba49e9d62f474fb0a",
  bytes: 9_680,
  sha256: "a756524e2ad3323edb4ed89c94fc51507dd82da337fabd97e3c6efe21a4d558b"
});
const REVIEWED_LEGACY_PARENT_CONSOLE_REPORT_DISPLAY_PATH = "reviewed-legacy-parent-console-report/content.md";
const REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION = "ec22a29b55a4329e81d96e02417f8925ccec54c3";
const REVIEWED_LEGACY_BRANCH_BASE_TEXT_REVISION = "e909992b098ce7f8b57ca7f7ede6c97e50ccdc45";
const REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES = Object.freeze([
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md",
    mode: "100644",
    type: "blob",
    objectId: "e2fe2b0b560596ba7855440a2eef4763755eb85d",
    bytes: 12_067,
    sha256: "d0419a4e7c5cb41c0b7f0ff159f9d359a945428bf3757203f0ee742026e630b0"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-06-production-auth-storage-health-S12.md",
    mode: "100644",
    type: "blob",
    objectId: "b730a971c90e785cb8ee61f82d478d32fcf908f9",
    bytes: 9_960,
    sha256: "dd8f1b94f8979fd3fe6ac8467c95f5fbbf78842e10f3bb9cdb2f0dcc18e8a1f7"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-22-s19-production-db-smoke.mjs",
    mode: "100644",
    type: "blob",
    objectId: "e6428e7865337eda45874fdffe6b736999bb35b3",
    bytes: 25_465,
    sha256: "8f96568cb49fe81e6fd11402dd8fd97e88ffe63ca0c793c560ce8d6e29631f75"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/cloudflare-ai-crawl-control-preflight.mjs",
    mode: "100644",
    type: "blob",
    objectId: "05347bdf32b2ef81cd57dc2199b15a4255828118",
    bytes: 9_554,
    sha256: "76a8655b71762bd703d4e27b387b85116a1f2eb71065d650f0b3fe10d1144e6a"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs",
    mode: "100644",
    type: "blob",
    objectId: "4a39be077b60637e765c2e3639a7991be2042cf5",
    bytes: 6_896,
    sha256: "f2acc322167a0a20f0acf3e62225484a93f87acc53538bccf1c650cc5747263d"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/session-logs/2026-06-22-S12.md",
    mode: "100644",
    type: "blob",
    objectId: "413cdde2afedc515509debf4a65f12bc1597730e",
    bytes: 329_406,
    sha256: "7ec332cd113113e7ebced5b9a4b6066583d126dc8891788f600306e797cdf7de"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "lib/server/userStoreAuthSessionPersistence.test.ts",
    mode: "100644",
    type: "blob",
    objectId: "22aa14abb83cfe3d394db56c9380c4afd28160da",
    bytes: 122_464,
    sha256: "9fa01a390189bc54b7c19778265e9fb02a8cf15c51121ed2455ec87f7d64aec9"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "scripts/build-us-ca-private-raw-corpus.py",
    mode: "100644",
    type: "blob",
    objectId: "806dddda94a408e1b1d825c65ce32d066d3ae316",
    bytes: 23_075,
    sha256: "8e5bd542ff992ebfb9e07ee5edd8ffcd6e50820ae121c5c69e57a7a10e9f86b3"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "tests/e2e/ai-tutor-live-text.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "5c147d03752413a0a3810402c5389d0d1fcb67d4",
    bytes: 41_043,
    sha256: "d9da19f937882290b748b62e423fb316af770222ba66b6aba3adaafaa8d762e4"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "tests/e2e/practice-bank-solvability.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "c76bcb1a9fb9e7eed64bf8fe8302d01f51ce7138",
    bytes: 35_613,
    sha256: "df7ed7bc39862e204cf9e0e12e8eccacefd2c359c974cc75a2244d127f7d9c6b"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-06-S11-forgot-password-recovery-smoke.md",
    mode: "100644",
    type: "blob",
    objectId: "dd1143549fe13b5c9256860eab571cf65693d175",
    bytes: 2_793,
    sha256: "61c584aef1feaf7fe3edc06d3f5f24cdbbe1dfbcb108fb6711a3fe46532ac672"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-07-S19-password-reset-resend-vercel-env-plan.md",
    mode: "100644",
    type: "blob",
    objectId: "7b4fcf5710a47db240f4020501ed641ef2beeda4",
    bytes: 5_076,
    sha256: "d4cfa5685964dfde1e650678725017e01366e33e7d9dd2ddf19c1450c896bef1"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION,
    path: "coordination/reports/2026-06-29-A07-A19-A11-ai-tutor-env-gate-enterprise-solution.md",
    mode: "100644",
    type: "blob",
    objectId: "af926ab100ac3582d69aceb806e78e639b3bd4a4",
    bytes: 9_686,
    sha256: "6c08b1f1673ad6d399d29a2c94f3777e0eacc8bf816159983d04c92bfa42579e"
  })
]);
const REVIEWED_LEGACY_CURRENT_HEAD_TEXT_BY_PATH = new Map(
  REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.map((entry) => [entry.path, entry])
);
const REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES = Object.freeze([
  Object.freeze({
    revision: REVIEWED_LEGACY_BRANCH_BASE_TEXT_REVISION,
    path: "tests/e2e/ai-tutor-live-text.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "ed9342d2a744fd8c5271c9059d7343b4597431f5",
    bytes: 36_203,
    sha256: "a14c24644b0e85b8366e3a6117d8727603891b7be79c1ed5b9c3b65e2c82ff93"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_BRANCH_BASE_TEXT_REVISION,
    path: "tests/e2e/practice-bank-solvability.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "6022d27b763c6e47a4f182df110cf98fedd58b43",
    bytes: 34_397,
    sha256: "d8536e02956827c9e8ba173356b799f3d6b4273322179b86c1109f2134d57bd5"
  })
]);
const REVIEWED_LEGACY_BRANCH_BASE_TEXT_BY_PATH = new Map(
  REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.map((entry) => [entry.path, entry])
);
const REVIEWED_LEGACY_EXACT_TEXT_DISPLAY_PATH = "reviewed-legacy-exact-text/content.txt";
const REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION = "ec22a29b55a4329e81d96e02417f8925ccec54c3";
const REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES = Object.freeze([
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/2026-06-12-mighty-tank-battle-design/desktop-asset-browser.png",
    mode: "100644",
    type: "blob",
    objectId: "c59beafea4fc0d5f2e8a5f36bbc010650c1ab85a",
    bytes: 275_555,
    sha256: "eb644a75f13a3875b742cef48ca040f6ae393b861185e5584d9dc05329a9e89d"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/2026-06-12-mighty-tank-battle-design/desktop-browser-smoke.png",
    mode: "100644",
    type: "blob",
    objectId: "2f2bd1590f20c886212180ffb7bc63b5251361b0",
    bytes: 70_176,
    sha256: "b5f8f919854112ee80dd6d535649f53c0ddc5aba2ea5b2f5f590e4de75bdf3d2"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/2026-06-12-mighty-tank-battle-design/mobile-asset-browser.png",
    mode: "100644",
    type: "blob",
    objectId: "844ac165dd379f328b2f1ecae57d5f245115ca0f",
    bytes: 247_159,
    sha256: "ae4e0426d65867ea2f691bf1608cb6001a4b143507adbe9c9f0391654b960164"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/2026-06-12-mighty-tank-battle-design/mobile-browser-smoke.png",
    mode: "100644",
    type: "blob",
    objectId: "becb8d30a180b524ec218a354a1d4d8eb82bdd5b",
    bytes: 43_175,
    sha256: "9a2b87752ecd3d87e48ac1707edc228c304f20b0d7d8195e373fceb63fcf595f"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/screenshots/2026-05-20-login-teacher-demo.png",
    mode: "100644",
    type: "blob",
    objectId: "1a0f941218246920797bbdbccb81c985b0b134f5",
    bytes: 74_083,
    sha256: "bb2abf75b5e8a519b4d1318bdbeb08a9f61af0fde680cf3a1b4b51ef24f92df5"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
    path: "coordination/reports/screenshots/2026-05-20-teacher-console.png",
    mode: "100644",
    type: "blob",
    objectId: "3e1131aaf632a01cac8590d224ed5fd1131a7fa6",
    bytes: 186_962,
    sha256: "99ae3f6663d7281945006b2b1517f3f1bfa7656c9f67850a2da035930c836ad8"
  })
]);
const REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_BY_PATH = new Map(
  REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES.map((entry) => [entry.path, entry])
);
const REVIEWED_LEGACY_JPEG_UNDER_PNG_DISPLAY_PATH = "reviewed-legacy-jpeg-under-png/content.jpeg";
const REVIEWED_PROTECTED_OVERLAY_REF = "refs/mais-preservation/2026-07-12-dirty-root-snapshot";
const REVIEWED_PROTECTED_OVERLAY_TARGET = "93346c724961435789bd66de9e31d3979a93c45c";
const REVIEWED_PROTECTED_OVERLAY_BASE = REVIEWED_LEGACY_BRANCH_BASE_TEXT_REVISION;
const REVIEWED_PROTECTED_OVERLAY_REPOSITORY_ID = "ca188a8ce0d53e55e1a9e9a2d8d47c5b71ca224435adb0556b228bc3734c8b6f";
const REVIEWED_PROTECTED_OVERLAY_DISPLAY_PREFIX = "reviewed-protected-overlay";
const ISSUED_REVIEWED_PROTECTED_OVERLAY_CONTEXTS = new WeakSet();
const REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS = Object.freeze({
  path: "coordination/content-qa/templates/.~IS_CA-Math_K-5_Content_QA_Template.docx",
  sourcePath: REVIEWED_LEGACY_OFFICE_LOCK.path,
  sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
  sourceMode: REVIEWED_LEGACY_OFFICE_LOCK.branchMode,
  sourceKinds: Object.freeze(["untracked"]),
  fileMode: 0o644,
  type: "blob",
  objectId: REVIEWED_LEGACY_OFFICE_LOCK.objectId,
  bytes: REVIEWED_LEGACY_OFFICE_LOCK.bytes,
  sha256: REVIEWED_LEGACY_OFFICE_LOCK.sha256,
  payloadKind: "office-lock"
});
const REVIEWED_PROTECTED_OVERLAY_PRIVATE_TEXT_0600_PATHS = new Set([
  "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md",
  "coordination/reports/2026-06-06-production-auth-storage-health-S12.md",
  "coordination/reports/cloudflare-ai-crawl-control-preflight.mjs",
  "coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs",
  "coordination/reports/2026-06-06-S11-forgot-password-recovery-smoke.md",
  "coordination/reports/2026-06-07-S19-password-reset-resend-vercel-env-plan.md"
]);
const REVIEWED_PROTECTED_OVERLAY_UNTRACKED_POLICIES = Object.freeze([
  ...REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.map((entry) => Object.freeze({
    ...entry,
    sourcePath: entry.path,
    sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
    sourceMode: entry.mode,
    sourceKinds: Object.freeze(["untracked"]),
    fileMode: 0o644,
    type: "blob",
    payloadKind: "terminal-patch",
    allowGenericFallbackOnPayloadMismatch: true
  })),
  Object.freeze({
    ...REVIEWED_LEGACY_PARENT_CONSOLE_REPORT,
    sourcePath: REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.path,
    sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
    sourceMode: REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.mode,
    sourceKinds: Object.freeze(["untracked"]),
    fileMode: 0o600,
    type: "blob",
    payloadKind: "parent-console-report"
  }),
  ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES
    .filter((entry) => !entry.path.startsWith("tests/e2e/"))
    .map((entry) => Object.freeze({
      ...entry,
      sourcePath: entry.path,
      sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
      sourceMode: entry.mode,
      sourceKinds: Object.freeze(["untracked"]),
      fileMode: REVIEWED_PROTECTED_OVERLAY_PRIVATE_TEXT_0600_PATHS.has(entry.path) ? 0o600 : 0o644,
      payloadKind: "exact-text"
    })),
  ...REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES.map((entry) => Object.freeze({
    ...entry,
    sourcePath: entry.path,
    sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
    sourceMode: entry.mode,
    sourceKinds: Object.freeze(["untracked"]),
    fileMode: 0o600,
    payloadKind: "jpeg-under-png"
  })),
  REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS
]);
const REVIEWED_PROTECTED_OVERLAY_TRACKED_POLICIES = Object.freeze([
  ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES
    .filter((entry) => entry.path === "lib/server/userStoreAuthSessionPersistence.test.ts")
    .map((entry) => Object.freeze({
      ...entry,
      sourcePath: entry.path,
      sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
      sourceMode: entry.mode,
      sourceKinds: Object.freeze(["index-before-worktree", "historical"]),
      fileMode: 0o644,
      payloadKind: "exact-text"
    })),
  ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES
    .filter((entry) => entry.path.startsWith("tests/e2e/"))
    .map((entry) => Object.freeze({
      ...entry,
      sourcePath: entry.path,
      sourceRevision: REVIEWED_PROTECTED_OVERLAY_TARGET,
      sourceMode: entry.mode,
      sourceKinds: Object.freeze(["worktree-current", "tracked-current"]),
      fileMode: 0o644,
      ...(entry.path === "tests/e2e/ai-tutor-live-text.spec.ts"
        ? { allowedFileModes: Object.freeze([0o600, 0o644]) }
        : {}),
      payloadKind: "exact-text"
    })),
  ...REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.map((entry) => Object.freeze({
    ...entry,
    sourcePath: entry.path,
    sourceRevision: REVIEWED_PROTECTED_OVERLAY_BASE,
    sourceMode: entry.mode,
    sourceKinds: Object.freeze(["index-before-worktree", "historical"]),
    fileMode: 0o644,
    payloadKind: "exact-text"
  }))
]);
const REVIEWED_PROTECTED_OVERLAY_POLICIES = Object.freeze([
  ...REVIEWED_PROTECTED_OVERLAY_UNTRACKED_POLICIES,
  ...REVIEWED_PROTECTED_OVERLAY_TRACKED_POLICIES
]);
const REVIEWED_PROTECTED_OVERLAY_UNTRACKED_BY_PATH = new Map(
  REVIEWED_PROTECTED_OVERLAY_UNTRACKED_POLICIES.map((entry) => [entry.path, entry])
);
const REVIEWED_PROTECTED_OVERLAY_BY_SOURCE_AND_PATH = new Map(
  REVIEWED_PROTECTED_OVERLAY_POLICIES.flatMap((entry) => (
    entry.sourceKinds.map((sourceKind) => [`${sourceKind}\0${entry.path}`, entry])
  ))
);
const SECRET_ASSIGNMENT = /(?:^|[^A-Za-z0-9_$])["'`]?([A-Za-z_$][A-Za-z0-9_$-]*)["'`]?(?:[\t ]*\])?[\t ]*(:|>>>=|<<=|>>=|\*\*=|&&=|\|\|=|\?\?=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|=(?![=>]))[\t ]*/gmu;
const TOKEN_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/g,
  /\bgh[opusr]_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}(?![0-9A-Za-z_-])/g,
  /\bre_[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-])/g
];

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export const TYPED_FSEVENTS_HELPER_SOURCE_PATH = fileURLToPath(new URL(
  "./native/mais-fsevents-journal.c",
  import.meta.url
));

// Exact union of the flags defined by the macOS FSEvents SDK, including
// OwnEvent (0x00080000). The helper does not request MarkSelf today, but an
// observed defined bit is still conservatively material rather than unknown.
const TYPED_FSEVENTS_KNOWN_FLAG_MASK = 0x007fffff;
const TYPED_FSEVENTS_FATAL_FLAG_MASK = 0x000000ff;
const TYPED_FSEVENTS_EXACT_XATTR_ONLY_FLAGS = 0x00018000;
const TYPED_FSEVENTS_JOURNAL_HEADER_BYTES = 40;
const TYPED_FSEVENTS_MAX_JOURNAL_BYTES = 512 * 1024 * 1024;
const TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES = 1_000_000n;
const TYPED_FSEVENTS_MAX_EVENT_PATH_BYTES = 1024 * 1024;
const TYPED_FSEVENTS_MAX_RECORD_BYTES = TYPED_FSEVENTS_JOURNAL_HEADER_BYTES
  + TYPED_FSEVENTS_MAX_EVENT_PATH_BYTES;
const TYPED_FSEVENTS_MAX_UINT64 = (1n << 64n) - 1n;
const TYPED_FSEVENTS_VALIDATED_CHECKPOINTS = new WeakMap();
const TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS = new WeakMap();
const TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS = new WeakMap();
const TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS = new WeakMap();
const TYPED_FSEVENTS_RECONCILIATION_PROPOSALS = new WeakMap();
const TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS = new WeakMap();
const TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE = new WeakMap();
const TYPED_FSEVENTS_TERMINAL_SEALS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_ACKNOWLEDGEMENTS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS = new WeakSet();
const TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS = new WeakSet();
const TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES = new WeakSet();
const TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS = new Set();
const TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS = new WeakSet();
const TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES = new WeakMap();
const TYPED_FSEVENTS_NORMALIZED_ACK_PUBLICATIONS = new Set();
const TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION = 2;
const TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS = 8n;
const TYPED_FSEVENTS_RECONCILIATION_MAX_DURATION_NS = 300_000_000_000n;
let TYPED_FSEVENTS_PROVENANCE_ORDINAL = 0n;
const TYPED_FSEVENTS_REGULAR_SEMANTIC_FIELDS = Object.freeze([
  "dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "sha256"
]);

function typedFseventsNextProvenanceOrdinal() {
  if (TYPED_FSEVENTS_PROVENANCE_ORDINAL === TYPED_FSEVENTS_MAX_UINT64) {
    throw new Error("typed FSEvents provenance ordinal exceeds UInt64");
  }
  TYPED_FSEVENTS_PROVENANCE_ORDINAL += 1n;
  return TYPED_FSEVENTS_PROVENANCE_ORDINAL;
}

export function classifyTypedFseventsFlags(rawFlags) {
  if (!Number.isInteger(rawFlags) || rawFlags < 0 || rawFlags > 0xffffffff) {
    throw new Error("typed FSEvents flags must be a UInt32 value");
  }
  const flags = rawFlags >>> 0;
  if ((flags & ~TYPED_FSEVENTS_KNOWN_FLAG_MASK) !== 0
    || (flags & TYPED_FSEVENTS_FATAL_FLAG_MASK) !== 0) {
    throw new Error("typed FSEvents flags fail closed on fatal or unsupported bits");
  }
  return flags === TYPED_FSEVENTS_EXACT_XATTR_ONLY_FLAGS ? "xattr-only" : "source";
}

function typedFseventsUint64(value, label) {
  if (typeof value !== "bigint" || value < 0n || value > TYPED_FSEVENTS_MAX_UINT64) {
    throw new Error(`${label} must be a UInt64 bigint`);
  }
  return value;
}

function typedFseventsCheckpoint(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const highWater = typedFseventsUint64(value.highWater, `${label} high-water`);
  const entryCount = typedFseventsUint64(value.entryCount, `${label} entry count`);
  const lastEventId = value.lastEventId === null
    ? null
    : typedFseventsUint64(value.lastEventId, `${label} last event ID`);
  if (highWater > BigInt(TYPED_FSEVENTS_MAX_JOURNAL_BYTES)
    || entryCount > TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES
    || (entryCount === 0n) !== (highWater === 0n)
    || (entryCount === 0n) !== (lastEventId === null)
    || typeof value.sha256 !== "string"
    || !SHA256_PATTERN.test(value.sha256)) {
    throw new Error(`${label} count, high-water, last event ID, or SHA-256 is invalid`);
  }
  return Object.freeze({ entryCount, highWater, lastEventId, sha256: value.sha256 });
}

function typedFseventsRootBinding(eventRoots) {
  return eventRoots === null ? null : JSON.stringify(eventRoots);
}

function markTypedFseventsCheckpoint(value, eventRoots) {
  const checkpoint = Object.freeze(value);
  TYPED_FSEVENTS_VALIDATED_CHECKPOINTS.set(
    checkpoint,
    typedFseventsRootBinding(eventRoots)
  );
  return checkpoint;
}

function validatedTypedFseventsCheckpoint(value, label, eventRoots) {
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !TYPED_FSEVENTS_VALIDATED_CHECKPOINTS.has(value)) {
    throw new Error(`${label} must be a module-validated checkpoint`);
  }
  const checkpoint = typedFseventsCheckpoint(value, label);
  const boundRoots = TYPED_FSEVENTS_VALIDATED_CHECKPOINTS.get(value);
  if (boundRoots === null) {
    if (checkpoint.entryCount !== 0n
      || checkpoint.highWater !== 0n
      || checkpoint.lastEventId !== null) {
      throw new Error(`${label} has invalid root-neutral provenance`);
    }
  } else if (boundRoots !== typedFseventsRootBinding(eventRoots)) {
    throw new Error(`${label} event roots binding changed`);
  }
  return checkpoint;
}

export function createEmptyTypedFseventsJournalCheckpoint() {
  return markTypedFseventsCheckpoint({
    deltaEntryCount: 0n,
    deltaHighWater: 0n,
    entryCount: 0n,
    highWater: 0n,
    lastEventId: null,
    sha256: sha256Buffer(Buffer.alloc(0))
  }, null);
}

function typedFseventsCanonicalAbsolutePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")
    || !path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || (value.length > 1 && value.endsWith("/"))) {
    throw new Error(`${label} must be a canonical absolute path`);
  }
  return value;
}

function typedFseventsCanonicalPathSet(values, label, eventRoots = null) {
  if (!Array.isArray(values) || (eventRoots === null && values.length === 0)) {
    throw new Error(`${label} must be ${eventRoots === null ? "a nonempty" : "an"} array`);
  }
  const canonical = values.map((value, index) => typedFseventsCanonicalAbsolutePath(
    value,
    `${label}[${index}]`
  ));
  if (new Set(canonical).size !== canonical.length) {
    throw new Error(`${label} contains duplicate paths`);
  }
  if (eventRoots !== null && canonical.some((candidate) => (
    !eventRoots.some((root) => typedFseventsPathIsWithin(candidate, root))
  ))) {
    throw new Error(`${label} contains a path outside every event root`);
  }
  return Object.freeze(canonical);
}

function typedFseventsPathIsWithin(candidate, root) {
  return root === "/" || candidate === root || candidate.startsWith(`${root}/`);
}

function walkTypedFseventsJournalExtension({
  endpoint,
  eventRoots,
  journalPrefix,
  priorCheckpoint,
  visitor
}, requireEndpoint) {
  if (!Buffer.isBuffer(journalPrefix)) {
    throw new Error("typed FSEvents journal prefix must be a Buffer");
  }
  if (journalPrefix.length > TYPED_FSEVENTS_MAX_JOURNAL_BYTES) {
    throw new Error("typed FSEvents journal exceeds the 512 MiB limit");
  }
  if (typeof visitor !== "function") {
    throw new Error("typed FSEvents journal visitor must be a function");
  }
  const roots = typedFseventsCanonicalPathSet(eventRoots, "typed FSEvents event roots");
  const prior = validatedTypedFseventsCheckpoint(
    priorCheckpoint,
    "typed FSEvents prior checkpoint",
    roots
  );
  const expectedEndpoint = requireEndpoint
    ? typedFseventsCheckpoint(endpoint, "typed FSEvents endpoint")
    : null;
  if (prior.highWater > BigInt(journalPrefix.length)) {
    throw new Error("typed FSEvents prior checkpoint high-water exceeds the journal");
  }
  if (expectedEndpoint !== null
    && (expectedEndpoint.highWater !== BigInt(journalPrefix.length)
      || prior.highWater > expectedEndpoint.highWater
      || prior.entryCount > expectedEndpoint.entryCount)) {
    throw new Error("typed FSEvents endpoint high-water or count is inconsistent");
  }
  const priorBytes = Number(prior.highWater);
  const actualPriorDigest = sha256Buffer(journalPrefix.subarray(0, priorBytes));
  if (actualPriorDigest !== prior.sha256) {
    throw new Error("typed FSEvents prior checkpoint digest does not match the journal prefix");
  }
  const fullDigest = sha256Buffer(journalPrefix);
  if (expectedEndpoint !== null && fullDigest !== expectedEndpoint.sha256) {
    throw new Error("typed FSEvents endpoint journal digest does not match");
  }

  // The prior checkpoint is a previously validated record boundary. Its exact
  // prefix digest carries that validation forward, so an extension walk starts
  // at highWater and never decodes or re-visits committed records.
  let offset = priorBytes;
  let entryCount = prior.entryCount;
  let lastEventId = prior.lastEventId;
  while (offset < journalPrefix.length) {
    const remaining = journalPrefix.length - offset;
    if (remaining < TYPED_FSEVENTS_JOURNAL_HEADER_BYTES) {
      throw new Error("typed FSEvents journal record is truncated");
    }
    if (journalPrefix.toString("ascii", offset, offset + 4) !== "MFSJ") {
      throw new Error("typed FSEvents journal magic is invalid");
    }
    const version = journalPrefix.readUInt16LE(offset + 4);
    const type = journalPrefix.readUInt16LE(offset + 6);
    const recordLength = journalPrefix.readUInt32LE(offset + 8);
    const sequence = journalPrefix.readBigUInt64LE(offset + 12);
    const eventId = journalPrefix.readBigUInt64LE(offset + 20);
    const flags = journalPrefix.readUInt32LE(offset + 28);
    const pathLength = journalPrefix.readUInt32LE(offset + 32);
    const reserved = journalPrefix.readUInt32LE(offset + 36);
    if (version !== 1 || type !== 1 || reserved !== 0) {
      throw new Error("typed FSEvents journal record type or reserved field is unknown");
    }
    if (pathLength === 0) throw new Error("typed FSEvents journal path length is empty");
    if (pathLength > TYPED_FSEVENTS_MAX_EVENT_PATH_BYTES
      || recordLength > TYPED_FSEVENTS_MAX_RECORD_BYTES) {
      throw new Error("typed FSEvents journal record length overflow or path exceeds the 1 MiB limit");
    }
    if (recordLength !== TYPED_FSEVENTS_JOURNAL_HEADER_BYTES + pathLength
      || recordLength > remaining) {
      throw new Error("typed FSEvents journal record length overflow");
    }
    const expectedSequence = entryCount + 1n;
    if (expectedSequence > TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES) {
      throw new Error("typed FSEvents journal exceeds the 1000000 entry limit");
    }
    if (sequence !== expectedSequence) {
      throw new Error("typed FSEvents journal sequence is non-contiguous");
    }
    if (lastEventId !== null && eventId <= lastEventId) {
      throw new Error("typed FSEvents host event IDs must strictly increase");
    }
    const flagClass = classifyTypedFseventsFlags(flags);
    const pathBuffer = journalPrefix.subarray(
      offset + TYPED_FSEVENTS_JOURNAL_HEADER_BYTES,
      offset + recordLength
    );
    if (!isUtf8(pathBuffer)) throw new Error("typed FSEvents journal path is not UTF-8");
    if (pathBuffer.includes(0)) throw new Error("typed FSEvents journal path contains NUL");
    const eventPath = typedFseventsCanonicalAbsolutePath(
      pathBuffer.toString("utf8"),
      "typed FSEvents journal event path"
    );
    if (!roots.some((root) => typedFseventsPathIsWithin(eventPath, root))) {
      throw new Error("typed FSEvents journal event path is outside every event root");
    }
    const endOffset = offset + recordLength;
    if (offset >= priorBytes) {
      visitor(Object.freeze({
        endOffset: BigInt(endOffset),
        eventId,
        eventIdDecimal: eventId.toString(10),
        flagClass,
        flags,
        path: eventPath,
        sequence
      }));
    }
    offset = endOffset;
    entryCount = expectedSequence;
    lastEventId = eventId;
  }
  if (expectedEndpoint !== null
    && (entryCount !== expectedEndpoint.entryCount
      || lastEventId !== expectedEndpoint.lastEventId)) {
    throw new Error("typed FSEvents endpoint entry count or last event ID does not match");
  }
  return markTypedFseventsCheckpoint({
    deltaEntryCount: entryCount - prior.entryCount,
    deltaHighWater: BigInt(journalPrefix.length) - prior.highWater,
    entryCount,
    highWater: BigInt(journalPrefix.length),
    lastEventId,
    sha256: fullDigest
  }, roots);
}

export function visitTypedFseventsJournalExtension(options = {}) {
  return walkTypedFseventsJournalExtension(options, true);
}

export function parseTypedFseventsJournalPrefix(buffer) {
  const records = [];
  walkTypedFseventsJournalExtension({
    endpoint: null,
    eventRoots: ["/"],
    journalPrefix: buffer,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: ({ flagClass: _flagClass, ...compatibleRecord }) => records.push(compatibleRecord)
  }, false);
  return records;
}

function typedFseventsLookupProof(lookup, eventPath, label) {
  if (lookup instanceof Map) return lookup.get(eventPath);
  if (typeof lookup === "function") return lookup(eventPath);
  throw new Error(`${label} must be a Map or lookup function`);
}

function typedFseventsDirectRegularProof(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || value.type !== "regular-file") return null;
  for (const field of TYPED_FSEVENTS_REGULAR_SEMANTIC_FIELDS) {
    if (field === "sha256") {
      if (typeof value[field] !== "string" || !SHA256_PATTERN.test(value[field])) return null;
    } else if (!isCanonicalUint64Decimal(value[field])) {
      return null;
    }
  }
  // ctime is an observation/reuse binding, not a semantic equality field.
  // Both proofs must nevertheless carry one canonical value before an exact
  // xattr-only event may be downgraded from source material.
  if (!isCanonicalUint64Decimal(value.ctimeNs)) return null;
  const mode = BigInt(value.mode);
  if (mode > 0xffffffffn
    || (mode & 0o170000n) !== 0o100000n
    || BigInt(value.nlink) < 1n) return null;
  return value;
}

function typedFseventsSameRegularSemanticProof(leftValue, rightValue) {
  const left = typedFseventsDirectRegularProof(leftValue);
  const right = typedFseventsDirectRegularProof(rightValue);
  return left !== null && right !== null
    && TYPED_FSEVENTS_REGULAR_SEMANTIC_FIELDS.every((field) => left[field] === right[field]);
}

export function classifyTypedFseventsTransaction({
  candidateProofLookup,
  eventRoots,
  exactMetadataPaths = [],
  exactMetadataRoots = [],
  priorProofLookup,
  streamedRecords
} = {}) {
  const roots = typedFseventsCanonicalPathSet(eventRoots, "typed FSEvents event roots");
  const metadataPaths = typedFseventsCanonicalPathSet(
    exactMetadataPaths,
    "typed FSEvents exact metadata paths",
    roots
  );
  const metadataRoots = typedFseventsCanonicalPathSet(
    exactMetadataRoots,
    "typed FSEvents exact metadata roots",
    roots
  );
  if (streamedRecords === null || streamedRecords === undefined
    || typeof streamedRecords[Symbol.iterator] !== "function") {
    throw new Error("typed FSEvents streamed records must be iterable");
  }
  let sourceEventCount = 0n;
  let transactionMetadataEventCount = 0n;
  let xattrOnlyEventCount = 0n;
  for (const record of streamedRecords) {
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("typed FSEvents streamed record must be an object");
    }
    const flagClass = classifyTypedFseventsFlags(record.flags);
    const eventPath = typedFseventsCanonicalAbsolutePath(
      record.path,
      "typed FSEvents streamed record path"
    );
    if (!roots.some((root) => typedFseventsPathIsWithin(eventPath, root))) {
      throw new Error("typed FSEvents streamed record path is outside every event root");
    }
    if (metadataPaths.includes(eventPath)
      || metadataRoots.some((root) => typedFseventsPathIsWithin(eventPath, root))) {
      transactionMetadataEventCount += 1n;
      continue;
    }
    if (flagClass === "xattr-only" && typedFseventsSameRegularSemanticProof(
      typedFseventsLookupProof(priorProofLookup, eventPath, "typed FSEvents prior proof lookup"),
      typedFseventsLookupProof(candidateProofLookup, eventPath, "typed FSEvents candidate proof lookup")
    )) {
      xattrOnlyEventCount += 1n;
      continue;
    }
    sourceEventCount += 1n;
  }
  const materialEventCount = sourceEventCount + transactionMetadataEventCount;
  return Object.freeze({
    journalEntryCount: materialEventCount + xattrOnlyEventCount,
    materialEventCount,
    metadataEpochBatch: transactionMetadataEventCount > 0n,
    sourceEpochBatch: sourceEventCount > 0n,
    sourceEventCount,
    transactionMetadataEventCount,
    xattrEpochIncrement: xattrOnlyEventCount,
    xattrOnlyEventCount
  });
}

const STABLE_PROOF_SNAPSHOT_SCHEMA_VERSION = 2;
const STABLE_PROOF_MAX_PATHS = 600_000;
const STABLE_PROOF_MAX_POLICIES = 4_096;
const STABLE_PROOF_MAX_TRACKED_PATHS = 600_000;
const STABLE_PROOF_MAX_DEPTH = 1_024;
const STABLE_PROOF_MAX_PATH_BYTES = 4 * 1024;
const STABLE_PROOF_MAX_POLICY_BYTES = 256 * 1024 * 1024;
const STABLE_PROOF_MAX_NAMESPACE_PATH_BYTES = 512 * 1024 * 1024;
const STABLE_PROOF_MAX_FILE_BYTES = 8 * 1024 * 1024 * 1024;
const STABLE_PROOF_MAX_TOTAL_BYTES = 64 * 1024 * 1024 * 1024;
const STABLE_PROOF_MAX_SYMLINK_TARGET_BYTES = 64 * 1024;
const STABLE_PROOF_MAX_TOTAL_SYMLINK_BYTES = 256 * 1024 * 1024;
const STABLE_PROOF_MAX_DIRECTORY_NAME_BYTES = 256 * 1024 * 1024;
const STABLE_PROOF_HELPER_MAX_BUFFER_BYTES = 1024 * 1024 * 1024;
const STABLE_PROOF_HELPER_MAX_PEAK_RSS_BYTES = 4 * 1024 * 1024 * 1024;
const STABLE_PROOF_HELPER_MAX_OPEN_FDS = STABLE_PROOF_MAX_POLICIES + STABLE_PROOF_MAX_DEPTH + 64;
const STABLE_PROOF_HELPER_TIMEOUT_MS = 5 * 60 * 1000;
const GIT_CURRENTNESS_CAPTURE_MODE = "git-currentness-sparse-v1";
const FULL_NAMESPACE_CAPTURE_MODE = "full-namespace-v2";
const GIT_CURRENTNESS_SCOPE_TIMEOUT_MS = 5 * 60 * 1000;
const GIT_CURRENTNESS_GIT_TIMEOUT_MS = 30 * 1000;
const TYPED_FSEVENTS_ACK_TIMEOUT_MS = 60_000;
const STABLE_PROOF_VALIDATED_SNAPSHOTS = new WeakSet();
const STABLE_PROOF_SNAPSHOT_PROVENANCE = new WeakMap();
const GIT_CURRENTNESS_PROOF_SCOPES = new WeakMap();
const STABLE_PROOF_OBSERVATION_FIELDS = Object.freeze([
  "dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"
]);
const STABLE_PROOF_HOOK_KEYS = Object.freeze([
  "afterDirectoryRead",
  "afterRegularRead",
  "afterSymlinkRead",
  "beforeRootFinalValidation",
  "beforeRootRevalidate"
]);
const STABLE_PROOF_DESCRIPTOR_WALKER = String.raw`
import errno
import fcntl
import hashlib
import json
import os
import resource
import stat
import sys

OBSERVATION_FIELDS = ("dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs")
F_GETPATH = 50
READ_CHUNK_BYTES = 64 * 1024

def fail(message):
    raise RuntimeError(message)

def observation(value):
    return {
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "uid": str(value.st_uid),
        "gid": str(value.st_gid),
        "mode": str(value.st_mode),
        "nlink": str(value.st_nlink),
        "size": str(value.st_size),
        "mtimeNs": str(value.st_mtime_ns),
        "ctimeNs": str(value.st_ctime_ns),
    }

def assert_same(left, right, label):
    if observation(left) != observation(right):
        fail(label + " changed during descriptor-relative observation")

def assert_type(value, expected, label):
    mode = value.st_mode
    matches = ((expected == "regular-file" and stat.S_ISREG(mode))
        or (expected == "directory" and stat.S_ISDIR(mode))
        or (expected == "symlink" and stat.S_ISLNK(mode)))
    if not matches or value.st_nlink < 1:
        fail(label + " direct identity is invalid")

def strict_text(value, label, maximum_bytes):
    raw = os.fsencode(value)
    if len(raw) == 0 or len(raw) > maximum_bytes or b"\x00" in raw:
        fail(label + " byte length is invalid")
    try:
        decoded = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        fail(label + " is not strict UTF-8")
    return decoded, raw

def descriptor_path(descriptor):
    if sys.platform == "darwin":
        raw = fcntl.fcntl(descriptor, F_GETPATH, b"\x00" * 1024)
        return raw.split(b"\x00", 1)[0].decode("utf-8", "strict")
    proc_path = "/proc/self/fd/" + str(descriptor)
    if os.path.exists(proc_path):
        return os.path.realpath(proc_path)
    fail("stable proof descriptor path binding is unsupported on this platform")

def list_names(descriptor, entry_limit, maximum_directory_name_bytes, maximum_path_bytes):
    scan_descriptor = os.open(
        ".",
        os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
        dir_fd=descriptor,
    )
    try:
        normalized = []
        total_name_bytes = 0
        with os.scandir(scan_descriptor) as iterator:
            for entry in iterator:
                if len(normalized) >= entry_limit:
                    fail("stable proof path limit exceeded during directory enumeration")
                name, raw = strict_text(
                    entry.name,
                    "stable proof directory child name",
                    maximum_path_bytes,
                )
                if name in (".", "..") or "/" in name:
                    fail("stable proof directory contains an unsafe child name")
                total_name_bytes += len(raw)
                if total_name_bytes > maximum_directory_name_bytes:
                    fail("stable proof directory names exceed the byte cap")
                normalized.append((raw, name))
    finally:
        os.close(scan_descriptor)
    normalized.sort(key=lambda item: item[0])
    return [item[1] for item in normalized]

def main():
    request = json.load(sys.stdin)
    policies = request["policies"]
    capture_mode = request.get("captureMode", "full-namespace-v2")
    if capture_mode not in ("full-namespace-v2", "git-currentness-sparse-v1"):
        fail("stable proof capture mode is invalid")
    maximum_paths = request["maxPaths"]
    maximum_depth = request["maxDepth"]
    maximum_directory_name_bytes = request["maxDirectoryNameBytes"]
    maximum_path_bytes = request["maxPathBytes"]
    maximum_namespace_path_bytes = request["maxNamespacePathBytes"]
    maximum_file_bytes = request["maxFileBytes"]
    maximum_total_bytes = request["maxTotalBytes"]
    maximum_symlink_target_bytes = request["maxSymlinkTargetBytes"]
    maximum_total_symlink_bytes = request["maxTotalSymlinkBytes"]
    maximum_open_fds = request["maxOpenFds"]
    current_fd_soft, current_fd_hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    descriptor_soft = maximum_open_fds
    if current_fd_soft != resource.RLIM_INFINITY:
        descriptor_soft = min(descriptor_soft, current_fd_soft)
    if current_fd_hard != resource.RLIM_INFINITY:
        descriptor_soft = min(descriptor_soft, current_fd_hard)
    resource.setrlimit(resource.RLIMIT_NOFILE, (descriptor_soft, current_fd_hard))
    sys.setrecursionlimit(maximum_depth + 256)
    records = {}
    reserved = set()
    discovered_path_bytes = 0
    regular_bytes = 0
    symlink_bytes = 0
    anchors = []

    def reserve(display_path):
        nonlocal discovered_path_bytes
        if display_path in records or display_path in reserved:
            fail("stable proof captured a duplicate absolute path")
        _, raw_path = strict_text(display_path, "stable proof absolute path", maximum_path_bytes)
        if len(records) + len(reserved) >= maximum_paths:
            fail("stable proof path limit exceeded before content read")
        if discovered_path_bytes + len(raw_path) > maximum_namespace_path_bytes:
            fail("stable proof namespace paths exceed the cumulative byte cap")
        discovered_path_bytes += len(raw_path)
        reserved.add(display_path)

    def add(display_path, proof):
        if display_path not in reserved:
            reserve(display_path)
        reserved.remove(display_path)
        records[display_path] = proof

    def capture_regular(parent_descriptor, name, display_path, initial):
        nonlocal regular_bytes
        descriptor = os.open(
            name,
            os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | getattr(os, "O_CLOEXEC", 0),
            dir_fd=parent_descriptor,
        )
        try:
            before = os.fstat(descriptor)
            assert_type(before, "regular-file", "stable proof held file")
            assert_same(initial, before, "stable proof file open")
            size = before.st_size
            if size < 0 or size > maximum_file_bytes:
                fail("stable proof regular file exceeds the per-file byte cap")
            if regular_bytes + size > maximum_total_bytes:
                fail("stable proof regular files exceed the cumulative byte cap")
            digest = hashlib.sha256()
            position = 0
            while position < size:
                chunk = os.pread(descriptor, min(READ_CHUNK_BYTES, size - position), position)
                if not chunk:
                    fail("stable proof regular file was truncated during read")
                digest.update(chunk)
                position += len(chunk)
            after = os.fstat(descriptor)
            visible = os.stat(name, dir_fd=parent_descriptor, follow_symlinks=False)
            assert_same(before, after, "stable proof held file")
            assert_same(before, visible, "stable proof descriptor-relative file rebind")
            assert_type(visible, "regular-file", "stable proof visible file")
            regular_bytes += size
            add(display_path, {
                "type": "regular-file",
                **observation(before),
                "sha256": digest.hexdigest(),
            })
        finally:
            os.close(descriptor)

    def capture_symlink(parent_descriptor, name, display_path, initial):
        nonlocal symlink_bytes
        assert_type(initial, "symlink", "stable proof symlink")
        target_value = os.readlink(name, dir_fd=parent_descriptor)
        target, raw_target = strict_text(
            target_value,
            "stable proof symlink target",
            maximum_symlink_target_bytes,
        )
        if symlink_bytes + len(raw_target) > maximum_total_symlink_bytes:
            fail("stable proof symlink targets exceed the cumulative byte cap")
        after = os.stat(name, dir_fd=parent_descriptor, follow_symlinks=False)
        assert_type(after, "symlink", "stable proof symlink")
        assert_same(initial, after, "stable proof symlink")
        symlink_bytes += len(raw_target)
        add(display_path, {"type": "symlink", **observation(after), "target": target})

    def capture_directory(descriptor, display_path, initial, depth):
        if depth > maximum_depth:
            fail("stable proof directory depth exceeds the hard cap")
        before = os.fstat(descriptor)
        assert_type(before, "directory", "stable proof held directory")
        assert_same(initial, before, "stable proof directory open")
        remaining_paths = maximum_paths - len(records) - len(reserved)
        names = list_names(
            descriptor,
            remaining_paths,
            maximum_directory_name_bytes,
            maximum_path_bytes,
        )
        for name in names:
            reserve(os.path.join(display_path, name))
        for name in names:
            child_display = os.path.join(display_path, name)
            child_initial = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
            if stat.S_ISLNK(child_initial.st_mode):
                capture_symlink(descriptor, name, child_display, child_initial)
            elif stat.S_ISREG(child_initial.st_mode):
                capture_regular(descriptor, name, child_display, child_initial)
            elif stat.S_ISDIR(child_initial.st_mode):
                child_descriptor = os.open(
                    name,
                    os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
                    dir_fd=descriptor,
                )
                try:
                    opened = os.fstat(child_descriptor)
                    assert_same(child_initial, opened, "stable proof child directory open")
                    capture_directory(child_descriptor, child_display, opened, depth + 1)
                    rebound = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
                    assert_same(opened, rebound, "stable proof descriptor-relative directory rebind")
                finally:
                    os.close(child_descriptor)
            else:
                fail("stable proof namespace contains an unsupported special file type")
        names_after = list_names(
            descriptor,
            len(names),
            maximum_directory_name_bytes,
            maximum_path_bytes,
        )
        if names_after != names:
            fail("stable proof directory namespace changed during capture")
        after = os.fstat(descriptor)
        assert_same(before, after, "stable proof held directory")
        add(display_path, {"type": "directory", **observation(after), "names": names})

    def capture_tombstone(root_descriptor, relative_path, display_path):
        reserve(display_path)
        descriptors = [os.dup(root_descriptor)]
        ancestors = []
        try:
            segments = relative_path.split("/")
            if len(segments) > maximum_depth:
                fail("stable proof tombstone depth exceeds the hard cap")
            missing = False
            for index, segment in enumerate(segments):
                descriptor = descriptors[-1]
                try:
                    current = os.stat(segment, dir_fd=descriptor, follow_symlinks=False)
                except FileNotFoundError:
                    missing = True
                    break
                if stat.S_ISLNK(current.st_mode):
                    fail("stable proof tracked tombstone has a symlink ancestor")
                if index == len(segments) - 1:
                    fail("stable proof tracked tombstone unexpectedly exists")
                if not stat.S_ISDIR(current.st_mode):
                    fail("stable proof tracked tombstone has a non-directory ancestor")
                child = os.open(
                    segment,
                    os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
                    dir_fd=descriptor,
                )
                opened = os.fstat(child)
                try:
                    assert_same(current, opened, "stable proof tombstone ancestor open")
                except Exception:
                    os.close(child)
                    raise
                ancestors.append((descriptor, segment, current, child))
                descriptors.append(child)
            if not missing:
                fail("stable proof tombstone traversal terminated unexpectedly")
            for parent, segment, expected, child in reversed(ancestors):
                held = os.fstat(child)
                rebound = os.stat(segment, dir_fd=parent, follow_symlinks=False)
                assert_same(expected, held, "stable proof held tombstone ancestor")
                assert_same(expected, rebound, "stable proof rebound tombstone ancestor")
            add(display_path, {"type": "tombstone"})
        finally:
            for descriptor in reversed(descriptors):
                os.close(descriptor)

    def capture_selected_directory(parent_descriptor, name, display_path, initial):
        descriptor = os.open(
            name,
            os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
            dir_fd=parent_descriptor,
        )
        try:
            before = os.fstat(descriptor)
            assert_type(before, "directory", "stable proof selected directory")
            assert_same(initial, before, "stable proof selected directory open")
            names = list_names(
                descriptor,
                maximum_paths,
                maximum_directory_name_bytes,
                maximum_path_bytes,
            )
            names_after = list_names(
                descriptor,
                len(names),
                maximum_directory_name_bytes,
                maximum_path_bytes,
            )
            if names_after != names:
                fail("stable proof selected directory namespace changed during capture")
            after = os.fstat(descriptor)
            visible = os.stat(name, dir_fd=parent_descriptor, follow_symlinks=False)
            assert_same(before, after, "stable proof held selected directory")
            assert_same(before, visible, "stable proof selected directory rebind")
            add(display_path, {"type": "directory", **observation(after), "names": names})
        finally:
            os.close(descriptor)

    def capture_selected(root_descriptor, relative_path, display_path):
        reserve(display_path)
        descriptors = [os.dup(root_descriptor)]
        ancestors = []
        missing_parent = None
        missing_segment = None
        try:
            segments = relative_path.split("/")
            if len(segments) > maximum_depth:
                fail("stable proof selected path depth exceeds the hard cap")
            captured = False
            for index, segment in enumerate(segments):
                parent_descriptor = descriptors[-1]
                try:
                    current = os.stat(segment, dir_fd=parent_descriptor, follow_symlinks=False)
                except FileNotFoundError:
                    missing_parent = parent_descriptor
                    missing_segment = segment
                    add(display_path, {"type": "tombstone"})
                    captured = True
                    break
                if index < len(segments) - 1:
                    if stat.S_ISLNK(current.st_mode) or not stat.S_ISDIR(current.st_mode):
                        fail("stable proof selected path has an unsafe ancestor")
                    child = os.open(
                        segment,
                        os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
                        dir_fd=parent_descriptor,
                    )
                    opened = os.fstat(child)
                    try:
                        assert_same(current, opened, "stable proof selected ancestor open")
                    except Exception:
                        os.close(child)
                        raise
                    ancestors.append((parent_descriptor, segment, current, child))
                    descriptors.append(child)
                    continue
                if stat.S_ISLNK(current.st_mode):
                    capture_symlink(parent_descriptor, segment, display_path, current)
                elif stat.S_ISREG(current.st_mode):
                    capture_regular(parent_descriptor, segment, display_path, current)
                elif stat.S_ISDIR(current.st_mode):
                    capture_selected_directory(parent_descriptor, segment, display_path, current)
                else:
                    fail("stable proof selected path has an unsupported special file type")
                captured = True
            if not captured:
                fail("stable proof selected path traversal terminated unexpectedly")
            for parent, segment, expected, child in reversed(ancestors):
                held = os.fstat(child)
                rebound = os.stat(segment, dir_fd=parent, follow_symlinks=False)
                assert_same(expected, held, "stable proof held selected ancestor")
                assert_same(expected, rebound, "stable proof rebound selected ancestor")
            if missing_parent is not None:
                try:
                    os.stat(missing_segment, dir_fd=missing_parent, follow_symlinks=False)
                except FileNotFoundError:
                    pass
                else:
                    fail("stable proof selected tombstone appeared during capture")
        finally:
            for descriptor in reversed(descriptors):
                os.close(descriptor)

    try:
        for policy in policies:
            root = policy["root"]
            descriptor = os.open(
                root,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0),
            )
            try:
                opened = os.fstat(descriptor)
                assert_type(opened, "directory", "stable proof root anchor")
                if descriptor_path(descriptor) != root:
                    fail("stable proof root descriptor escaped its canonical path")
            except Exception:
                os.close(descriptor)
                raise
            anchors.append((root, descriptor, opened))

        for policy, anchor in zip(policies, anchors):
            root, descriptor, opened = anchor
            if capture_mode == "full-namespace-v2":
                if root not in records:
                    reserve(root)
                    capture_directory(descriptor, root, opened, 0)
                for relative_path in policy["trackedRelativePaths"]:
                    display_path = os.path.join(root, *relative_path.split("/"))
                    if display_path not in records:
                        capture_tombstone(descriptor, relative_path, display_path)
            else:
                for relative_path in policy["trackedRelativePaths"]:
                    display_path = os.path.join(root, *relative_path.split("/"))
                    if display_path in records:
                        fail("stable proof sparse policy selected a duplicate absolute path")
                    capture_selected(descriptor, relative_path, display_path)

        for root, descriptor, opened in anchors:
            held = os.fstat(descriptor)
            assert_same(opened, held, "stable proof root anchor")
            if descriptor_path(descriptor) != root:
                fail("stable proof root anchor path changed during capture")
            visible = os.lstat(root)
            assert_type(visible, "directory", "stable proof visible root")
            assert_same(opened, visible, "stable proof visible root")

        ordered = [
            {"path": path_value, "proof": records[path_value]}
            for path_value in sorted(records, key=lambda value: os.fsencode(value))
        ]
        peak_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform != "darwin":
            peak_rss *= 1024
        json.dump(
            {
                "entries": ordered,
                "helperPeakRssBytes": peak_rss,
                "regularBytes": regular_bytes,
            },
            sys.stdout,
            ensure_ascii=False,
            separators=(",", ":"),
        )
    finally:
        for _, descriptor, _ in anchors:
            try:
                os.close(descriptor)
            except OSError:
                pass

try:
    main()
except Exception as error:
    sys.stderr.write("stable proof descriptor walker failed closed: " + str(error))
    sys.exit(2)
`;

function stableProofByteOrder(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function stableProofCanonicalRoot(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")
    || !path.isAbsolute(value) || path.normalize(value) !== value
    || (value !== path.parse(value).root && value.endsWith(path.sep))) {
    throw new Error(`${label} must be a canonical absolute root path`);
  }
  let real;
  let status;
  try {
    real = fs.realpathSync(value);
    status = fs.lstatSync(value, { bigint: true });
  } catch {
    throw new Error(`${label} must be an existing canonical root directory`);
  }
  if (real !== value || status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error(`${label} must be its direct canonical real path directory`);
  }
  return value;
}

function stableProofTrackedRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")
    || value.includes("\\") || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value.endsWith("/") || value === "." || value.split("/").includes("..")) {
    throw new Error(`${label} must be a canonical repository-relative POSIX path`);
  }
  return value;
}

function stableProofHooks(value = {}) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stable proof hooks must be an object");
  }
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...STABLE_PROOF_HOOK_KEYS].filter((key) => (
    value[key] !== undefined
  )).sort())) {
    throw new Error("stable proof hooks contain an unknown seam");
  }
  for (const key of keys) {
    if (typeof value[key] !== "function") throw new Error(`stable proof hook ${key} must be a function`);
  }
  return value;
}

function stableProofExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} fields are invalid`);
  }
}

function stableProofFreezeProof(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || typeof value.type !== "string") {
    throw new Error(`${label} is invalid`);
  }
  if (value.type === "tombstone") {
    stableProofExactKeys(value, ["type"], label);
    return Object.freeze({ type: "tombstone" });
  }
  const suffix = value.type === "regular-file"
    ? ["sha256"]
    : value.type === "directory"
      ? ["names"]
      : value.type === "symlink"
        ? ["target"]
        : null;
  if (suffix === null) throw new Error(`${label} type is invalid`);
  stableProofExactKeys(value, ["type", ...STABLE_PROOF_OBSERVATION_FIELDS, ...suffix], label);
  for (const field of STABLE_PROOF_OBSERVATION_FIELDS) {
    if (typeof value[field] !== "string" || !UINT64_DECIMAL_PATTERN.test(value[field])) {
      throw new Error(`${label} ${field} is invalid`);
    }
  }
  if (BigInt(value.nlink) < 1n) throw new Error(`${label} link count is invalid`);
  const fileType = BigInt(value.mode) & 0o170000n;
  const expectedType = value.type === "regular-file"
    ? 0o100000n
    : value.type === "directory"
      ? 0o040000n
      : 0o120000n;
  if (fileType !== expectedType) throw new Error(`${label} mode/type binding is invalid`);
  if (value.type === "regular-file") {
    if (!SHA256_PATTERN.test(value.sha256)) throw new Error(`${label} SHA-256 is invalid`);
    return Object.freeze({ ...value });
  }
  if (value.type === "symlink") {
    if (typeof value.target !== "string" || value.target.includes("\0")
      || Buffer.byteLength(value.target) > STABLE_PROOF_MAX_SYMLINK_TARGET_BYTES) {
      throw new Error(`${label} target is invalid`);
    }
    return Object.freeze({ ...value });
  }
  if (!Array.isArray(value.names)) throw new Error(`${label} names are invalid`);
  const names = value.names.map((name, index) => {
    if (typeof name !== "string" || name.length === 0 || name === "." || name === ".."
      || name.includes("\0") || name.includes(path.sep)
      || Buffer.byteLength(name) > STABLE_PROOF_MAX_PATH_BYTES) {
      throw new Error(`${label} name ${index} is invalid`);
    }
    return name;
  });
  for (let index = 1; index < names.length; index += 1) {
    if (stableProofByteOrder(names[index - 1], names[index]) >= 0) {
      throw new Error(`${label} names are not strict byte ordered`);
    }
  }
  return Object.freeze({ ...value, names: Object.freeze(names) });
}

function stableProofRunDescriptorWalker(
  normalizedPolicies,
  maxPaths,
  captureMode = FULL_NAMESPACE_CAPTURE_MODE
) {
  if (![FULL_NAMESPACE_CAPTURE_MODE, GIT_CURRENTNESS_CAPTURE_MODE].includes(captureMode)) {
    throw new Error("stable proof capture mode is invalid");
  }
  const policyRootSet = new Set(normalizedPolicies.map((policy) => policy.root));
  const belongsToPolicyRoot = (candidate) => {
    let cursor = candidate;
    while (true) {
      if (policyRootSet.has(cursor)) return true;
      const parent = path.dirname(cursor);
      if (parent === cursor) return false;
      cursor = parent;
    }
  };
  const request = Buffer.from(JSON.stringify({
    captureMode,
    maxDepth: STABLE_PROOF_MAX_DEPTH,
    maxDirectoryNameBytes: STABLE_PROOF_MAX_DIRECTORY_NAME_BYTES,
    maxFileBytes: STABLE_PROOF_MAX_FILE_BYTES,
    maxNamespacePathBytes: STABLE_PROOF_MAX_NAMESPACE_PATH_BYTES,
    maxOpenFds: STABLE_PROOF_HELPER_MAX_OPEN_FDS,
    maxPathBytes: STABLE_PROOF_MAX_PATH_BYTES,
    maxPaths,
    maxSymlinkTargetBytes: STABLE_PROOF_MAX_SYMLINK_TARGET_BYTES,
    maxTotalSymlinkBytes: STABLE_PROOF_MAX_TOTAL_SYMLINK_BYTES,
    maxTotalBytes: STABLE_PROOF_MAX_TOTAL_BYTES,
    policies: normalizedPolicies
  }));
  const result = spawnSync(
    "/usr/bin/python3",
    ["-I", "-S", "-c", STABLE_PROOF_DESCRIPTOR_WALKER],
    {
      encoding: null,
      input: request,
      maxBuffer: STABLE_PROOF_HELPER_MAX_BUFFER_BYTES,
      timeout: STABLE_PROOF_HELPER_TIMEOUT_MS
    }
  );
  if (result.error || result.signal || result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) && isUtf8(result.stderr)
      ? result.stderr.toString("utf8").slice(0, 8_192)
      : "";
    throw new Error(stderr || `stable proof descriptor walker failed closed (${result.signal ?? result.status ?? result.error?.code ?? "unknown"})`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length === 0 || !isUtf8(result.stdout)) {
    throw new Error("stable proof descriptor walker output is not strict UTF-8 JSON");
  }
  let decoded;
  try {
    decoded = JSON.parse(result.stdout.toString("utf8"));
  } catch {
    throw new Error("stable proof descriptor walker output is invalid JSON");
  }
  stableProofExactKeys(
    decoded,
    ["entries", "helperPeakRssBytes", "regularBytes"],
    "stable proof descriptor result"
  );
  if (!Number.isSafeInteger(decoded.helperPeakRssBytes) || decoded.helperPeakRssBytes < 1
    || decoded.helperPeakRssBytes > STABLE_PROOF_HELPER_MAX_PEAK_RSS_BYTES) {
    throw new Error("stable proof descriptor helper peak RSS is invalid");
  }
  if (!Number.isSafeInteger(decoded.regularBytes) || decoded.regularBytes < 0
    || decoded.regularBytes > STABLE_PROOF_MAX_TOTAL_BYTES) {
    throw new Error("stable proof descriptor result byte count is invalid");
  }
  if (!Array.isArray(decoded.entries) || decoded.entries.length === 0 || decoded.entries.length > maxPaths) {
    throw new Error("stable proof descriptor result path count is invalid");
  }
  const entries = decoded.entries.map((entry, index) => {
    stableProofExactKeys(entry, ["path", "proof"], `stable proof entry ${index}`);
    if (typeof entry.path !== "string" || !path.isAbsolute(entry.path)
      || path.normalize(entry.path) !== entry.path || entry.path.includes("\0")
      || Buffer.byteLength(entry.path) > STABLE_PROOF_MAX_PATH_BYTES
      || !belongsToPolicyRoot(entry.path)) {
      throw new Error(`stable proof entry ${index} path is invalid`);
    }
    return Object.freeze({
      path: entry.path,
      proof: stableProofFreezeProof(entry.proof, `stable proof entry ${index} proof`)
    });
  });
  for (let index = 1; index < entries.length; index += 1) {
    if (stableProofByteOrder(entries[index - 1].path, entries[index].path) >= 0) {
      throw new Error("stable proof descriptor entries are not strict byte ordered");
    }
  }
  const proofByPath = Object.create(null);
  let observedRegularBytes = 0;
  for (const entry of entries) {
    proofByPath[entry.path] = entry.proof;
    if (entry.proof.type === "regular-file") observedRegularBytes += Number(entry.proof.size);
  }
  if (!Number.isSafeInteger(observedRegularBytes) || observedRegularBytes !== decoded.regularBytes) {
    throw new Error("stable proof descriptor result regular byte sum is inconsistent");
  }
  if (captureMode === FULL_NAMESPACE_CAPTURE_MODE) {
    for (const entry of entries) {
      if (entry.proof.type !== "directory") continue;
      for (const name of entry.proof.names) {
        const child = path.join(entry.path, name);
        if (!Object.hasOwn(proofByPath, child) || proofByPath[child].type === "tombstone") {
          throw new Error("stable proof directory namespace is incomplete");
        }
      }
    }
  } else {
    const selectedPaths = new Set(normalizedPolicies.flatMap((policy) => (
      policy.trackedRelativePaths.map((relativePath) => path.join(
        policy.root,
        ...relativePath.split("/")
      ))
    )));
    if (selectedPaths.size !== entries.length
      || entries.some((entry) => !selectedPaths.has(entry.path))) {
      throw new Error("stable proof sparse descriptor result escaped its frozen selection");
    }
  }
  Object.freeze(proofByPath);
  return {
    entries: Object.freeze(entries),
    helperPeakRssBytes: decoded.helperPeakRssBytes,
    proofByPath,
    regularBytes: decoded.regularBytes
  };
}

function stableProofBuildSnapshot(normalizedPolicies, walked, {
  captureMode = FULL_NAMESPACE_CAPTURE_MODE,
  contractFingerprint = null,
  scopeToken = null,
  selectionFingerprint = null
} = {}) {
  const policies = Object.freeze(normalizedPolicies.map((policy) => Object.freeze({
    root: policy.root,
    trackedRelativePaths: Object.freeze([...policy.trackedRelativePaths])
  })));
  const roots = Object.freeze(policies.map((policy) => policy.root));
  const fingerprintBasis = {
    entries: walked.entries,
    policies,
    schemaVersion: STABLE_PROOF_SNAPSHOT_SCHEMA_VERSION,
    ...(captureMode === GIT_CURRENTNESS_CAPTURE_MODE ? {
      captureMode,
      contractFingerprint,
      selectionFingerprint
    } : {})
  };
  const lookup = Object.freeze((absolutePath) => (
    typeof absolutePath === "string" && Object.hasOwn(walked.proofByPath, absolutePath)
      ? walked.proofByPath[absolutePath]
      : undefined
  ));
  const snapshot = Object.freeze({
    schemaVersion: STABLE_PROOF_SNAPSHOT_SCHEMA_VERSION,
    entries: walked.entries,
    helperPeakRssBytes: walked.helperPeakRssBytes,
    lookup,
    pathCount: walked.entries.length,
    policies,
    proofByPath: walked.proofByPath,
    regularBytes: walked.regularBytes,
    roots,
    sha256: sha256Buffer(Buffer.from(JSON.stringify(fingerprintBasis)))
  });
  STABLE_PROOF_VALIDATED_SNAPSHOTS.add(snapshot);
  STABLE_PROOF_SNAPSHOT_PROVENANCE.set(
    snapshot,
    Object.freeze({
      captureMode,
      captureOrdinal: typedFseventsNextProvenanceOrdinal(),
      contractFingerprint,
      scopeToken,
      selectionFingerprint
    })
  );
  return snapshot;
}

function stableProofInvokeHooks(snapshot, hooks) {
  for (const entry of snapshot.entries) {
    const event = Object.freeze({ absolutePath: entry.path, path: entry.path });
    if (entry.proof.type === "regular-file") hooks.afterRegularRead?.(event);
    if (entry.proof.type === "directory") hooks.afterDirectoryRead?.(event);
    if (entry.proof.type === "symlink") hooks.afterSymlinkRead?.(event);
  }
  for (const root of snapshot.roots) {
    const event = Object.freeze({ absolutePath: root, path: root });
    hooks.beforeRootFinalValidation?.(event);
    hooks.beforeRootRevalidate?.(event);
  }
}

function stableProofNormalizePolicies(policies) {
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new Error("stable proof policies must be a nonempty array");
  }
  if (policies.length > STABLE_PROOF_MAX_POLICIES) {
    throw new Error(`stable proof policies exceed the ${STABLE_PROOF_MAX_POLICIES} hard cap`);
  }
  let totalPolicyBytes = 0;
  let totalTrackedPaths = 0;
  const normalizedPolicies = policies.map((policy, policyIndex) => {
    if (policy === null || typeof policy !== "object" || Array.isArray(policy)
      || JSON.stringify(Object.keys(policy).sort()) !== JSON.stringify(["root", "trackedRelativePaths"])) {
      throw new Error(`stable proof policy ${policyIndex} fields are invalid`);
    }
    if (typeof policy.root !== "string" || Buffer.byteLength(policy.root) > STABLE_PROOF_MAX_PATH_BYTES) {
      throw new Error(`stable proof policy ${policyIndex} root exceeds the path byte cap`);
    }
    const root = stableProofCanonicalRoot(policy.root, `stable proof policy ${policyIndex} root`);
    if (!Array.isArray(policy.trackedRelativePaths)) {
      throw new Error(`stable proof policy ${policyIndex} tracked paths must be an array`);
    }
    totalTrackedPaths += policy.trackedRelativePaths.length;
    if (totalTrackedPaths > STABLE_PROOF_MAX_TRACKED_PATHS) {
      throw new Error(`stable proof tracked paths exceed the ${STABLE_PROOF_MAX_TRACKED_PATHS} hard cap`);
    }
    totalPolicyBytes += Buffer.byteLength(root);
    const trackedRelativePaths = policy.trackedRelativePaths.map((relativePath, pathIndex) => {
      const normalized = stableProofTrackedRelativePath(
        relativePath,
        `stable proof policy ${policyIndex} tracked path ${pathIndex}`
      );
      const relativeBytes = Buffer.byteLength(normalized);
      if (relativeBytes > STABLE_PROOF_MAX_PATH_BYTES) {
        throw new Error(`stable proof policy ${policyIndex} tracked path ${pathIndex} exceeds the byte cap`);
      }
      totalPolicyBytes += relativeBytes;
      if (totalPolicyBytes > STABLE_PROOF_MAX_POLICY_BYTES) {
        throw new Error("stable proof policy input exceeds the cumulative byte cap");
      }
      return normalized;
    });
    if (new Set(trackedRelativePaths).size !== trackedRelativePaths.length) {
      throw new Error(`stable proof policy ${policyIndex} contains duplicate tracked paths`);
    }
    trackedRelativePaths.sort(stableProofByteOrder);
    return Object.freeze({ root, trackedRelativePaths: Object.freeze(trackedRelativePaths) });
  }).sort((left, right) => stableProofByteOrder(left.root, right.root));
  for (let index = 1; index < normalizedPolicies.length; index += 1) {
    if (normalizedPolicies[index - 1].root === normalizedPolicies[index].root) {
      throw new Error("stable proof policy roots duplicate one another");
    }
  }
  return Object.freeze(normalizedPolicies);
}

export function captureStableProofSnapshot({ policies, hooks: rawHooks = {}, maxPaths = STABLE_PROOF_MAX_PATHS } = {}) {
  if (!Number.isSafeInteger(maxPaths) || maxPaths < 1 || maxPaths > STABLE_PROOF_MAX_PATHS) {
    throw new Error(`stable proof maxPaths must be between 1 and ${STABLE_PROOF_MAX_PATHS}`);
  }
  const hooks = stableProofHooks(rawHooks);
  const normalizedPolicies = stableProofNormalizePolicies(policies);

  const first = stableProofBuildSnapshot(
    normalizedPolicies,
    stableProofRunDescriptorWalker(normalizedPolicies, maxPaths, FULL_NAMESPACE_CAPTURE_MODE)
  );
  if (Object.keys(hooks).length === 0) return first;
  stableProofInvokeHooks(first, hooks);
  const second = stableProofBuildSnapshot(
    normalizedPolicies,
    stableProofRunDescriptorWalker(normalizedPolicies, maxPaths, FULL_NAMESPACE_CAPTURE_MODE)
  );
  if (first.sha256 !== second.sha256) {
    throw new Error("stable proof root/namespace snapshot changed across the deterministic hook seam");
  }
  return second;
}

function gitCurrentnessPathIsWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function gitCurrentnessGitBuffer(
  root,
  args,
  deadlineMs = Date.now() + GIT_CURRENTNESS_SCOPE_TIMEOUT_MS
) {
  const remainingMs = deadlineMs - Date.now();
  if (!Number.isSafeInteger(deadlineMs) || remainingMs <= 0) {
    throw new Error("Git currentness scope exceeded its absolute deadline");
  }
  return execFileSync("git", args, {
    cwd: root,
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: STABLE_PROOF_MAX_POLICY_BYTES,
    timeout: Math.max(1, Math.min(GIT_CURRENTNESS_GIT_TIMEOUT_MS, remainingMs)),
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function gitCurrentnessGitPath(root, argument, label, deadlineMs) {
  const output = gitCurrentnessGitBuffer(root, [
    "rev-parse",
    "--path-format=absolute",
    argument
  ], deadlineMs);
  if (!Buffer.isBuffer(output) || output.length < 2 || output.at(-1) !== 0x0a
    || !isUtf8(output.subarray(0, -1))) {
    throw new Error(`${label} is not one canonical UTF-8 path`);
  }
  const decoded = output.subarray(0, -1).toString("utf8");
  if (decoded.length === 0 || decoded.includes("\n") || decoded.includes("\0")) {
    throw new Error(`${label} is not one canonical UTF-8 path`);
  }
  return stableProofCanonicalRoot(fs.realpathSync(decoded), label);
}

function gitCurrentnessStatusPaths(root, deadlineMs, maxPaths = STABLE_PROOF_MAX_PATHS) {
  const args = [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--ignored=no"
  ];
  const first = gitCurrentnessGitBuffer(root, args, deadlineMs);
  const second = gitCurrentnessGitBuffer(root, args, deadlineMs);
  if (!first.equals(second)) {
    throw new Error("Git currentness baseline inventory changed across its double read");
  }
  if (first.length === 0) return Object.freeze([]);
  if (first.at(-1) !== 0 || !isUtf8(first)) {
    throw new Error("Git currentness baseline inventory is not strict NUL-terminated UTF-8");
  }
  const records = first.subarray(0, -1).toString("utf8").split("\0");
  const selected = [];
  const addPath = (value, label) => {
    selected.push(stableProofTrackedRelativePath(value, label));
    if (selected.length > maxPaths) {
      throw new Error("Git currentness baseline inventory exceeds its path budget");
    }
  };
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4 || record[2] !== " ") {
      throw new Error("Git currentness baseline status record is invalid");
    }
    const status = record.slice(0, 2);
    if (!/^(?:[ MADRCUT?][ MADRCUT?]|\?\?)$/u.test(status) || status === "!!") {
      throw new Error("Git currentness baseline status code is invalid");
    }
    addPath(record.slice(3), `Git currentness status path ${index}`);
    if (/[RC]/u.test(status)) {
      index += 1;
      if (index >= records.length) {
        throw new Error("Git currentness rename status is missing its origin path");
      }
      addPath(records[index], `Git currentness rename origin ${index}`);
    }
  }
  return Object.freeze([...new Set(selected)].sort(stableProofByteOrder));
}

function gitCurrentnessAddExistingLeaf(leaves, candidate, containmentRoot, label) {
  let status;
  try {
    status = fs.lstatSync(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (!gitCurrentnessPathIsWithin(candidate, containmentRoot)) {
    throw new Error(`${label} escaped the trusted Git common directory`);
  }
  if (status.isSymbolicLink() || status.isFile()) {
    leaves.add(path.normalize(candidate));
    return;
  }
  if (!status.isDirectory()) throw new Error(`${label} is an unsupported special file`);
}

function gitCurrentnessAddTreeLeaves(
  leaves,
  candidate,
  containmentRoot,
  label,
  deadlineMs,
  maxPaths
) {
  const pending = [candidate];
  while (pending.length > 0) {
    if (Date.now() >= deadlineMs) {
      throw new Error("Git currentness scope exceeded its absolute deadline");
    }
    const current = pending.pop();
    let status;
    try {
      status = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (!gitCurrentnessPathIsWithin(current, containmentRoot)) {
      throw new Error(`${label} escaped the trusted Git common directory`);
    }
    if (status.isSymbolicLink() || status.isFile()) {
      leaves.add(path.normalize(current));
      if (leaves.size > maxPaths) {
        throw new Error("Git currentness controls exceed their path budget");
      }
      continue;
    }
    if (!status.isDirectory()) throw new Error(`${label} contains an unsupported special file`);
    const names = fs.readdirSync(current).sort(stableProofByteOrder).reverse();
    for (const name of names) pending.push(path.join(current, name));
    if (pending.length + leaves.size > maxPaths) {
      throw new Error("Git currentness controls exceed their path budget");
    }
  }
}

function gitCurrentnessControlLeaves(trustedGitCommonDir, deadlineMs, maxPaths) {
  const leaves = new Set();
  for (const relativePath of [
    "HEAD",
    "index",
    "packed-refs",
    "config",
    "config.worktree",
    "info/exclude",
    "info/sparse-checkout"
  ]) {
    gitCurrentnessAddExistingLeaf(
      leaves,
      path.join(trustedGitCommonDir, ...relativePath.split("/")),
      trustedGitCommonDir,
      "Git currentness control leaf"
    );
    if (leaves.size > maxPaths) throw new Error("Git currentness controls exceed their path budget");
  }
  gitCurrentnessAddTreeLeaves(
    leaves,
    path.join(trustedGitCommonDir, "refs", "heads"),
    trustedGitCommonDir,
    "Git currentness branch refs",
    deadlineMs,
    maxPaths
  );
  const worktreesRoot = path.join(trustedGitCommonDir, "worktrees");
  let entries = [];
  try {
    entries = fs.readdirSync(worktreesRoot).sort(stableProofByteOrder);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  for (const entry of entries) {
    if (Date.now() >= deadlineMs) {
      throw new Error("Git currentness scope exceeded its absolute deadline");
    }
    const entryRoot = path.join(worktreesRoot, entry);
    const status = fs.lstatSync(entryRoot);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      throw new Error("Git currentness linked-worktree control entry is unsafe");
    }
    for (const name of ["HEAD", "index", "gitdir", "commondir", "locked"]) {
      gitCurrentnessAddExistingLeaf(
        leaves,
        path.join(entryRoot, name),
        trustedGitCommonDir,
        "Git currentness linked-worktree control leaf"
      );
      if (leaves.size > maxPaths) throw new Error("Git currentness controls exceed their path budget");
    }
  }
  return leaves;
}

export function createGitCurrentnessProofScope({
  maxPaths = STABLE_PROOF_MAX_PATHS,
  policies,
  trustedGitCommonDir
} = {}) {
  if (!Number.isSafeInteger(maxPaths) || maxPaths < 1 || maxPaths > STABLE_PROOF_MAX_PATHS) {
    throw new Error(`Git currentness maxPaths must be between 1 and ${STABLE_PROOF_MAX_PATHS}`);
  }
  if (!Array.isArray(policies) || policies.length === 0
    || policies.length > STABLE_PROOF_MAX_POLICIES) {
    throw new Error("Git currentness policies must be a bounded nonempty array");
  }
  const deadlineMs = Date.now() + GIT_CURRENTNESS_SCOPE_TIMEOUT_MS;
  const contractPolicies = policies.map((policy, policyIndex) => {
    stableProofExactKeys(
      policy,
      ["exactMetadataPaths", "exactMetadataRoots", "root"],
      `Git currentness policy ${policyIndex}`
    );
    const root = stableProofCanonicalRoot(policy.root, `Git currentness policy ${policyIndex} root`);
    if (!Array.isArray(policy.exactMetadataPaths) || !Array.isArray(policy.exactMetadataRoots)) {
      throw new Error(`Git currentness policy ${policyIndex} metadata selections are invalid`);
    }
    const exactMetadataPaths = policy.exactMetadataPaths.map((relativePath, pathIndex) => (
      stableProofTrackedRelativePath(
        relativePath,
        `Git currentness policy ${policyIndex} metadata path ${pathIndex}`
      )
    ));
    if (new Set(exactMetadataPaths).size !== exactMetadataPaths.length) {
      throw new Error(`Git currentness policy ${policyIndex} metadata paths duplicate`);
    }
    const exactMetadataRoots = policy.exactMetadataRoots.map((metadataRoot, rootIndex) => {
      if (typeof metadataRoot !== "string" || !path.isAbsolute(metadataRoot)
        || path.normalize(metadataRoot) !== metadataRoot
        || !gitCurrentnessPathIsWithin(metadataRoot, root)) {
        throw new Error(`Git currentness policy ${policyIndex} metadata root ${rootIndex} is invalid`);
      }
      return metadataRoot;
    });
    return Object.freeze({
      exactMetadataPaths: Object.freeze([...exactMetadataPaths].sort(stableProofByteOrder)),
      exactMetadataRoots: Object.freeze([...new Set(exactMetadataRoots)].sort(stableProofByteOrder)),
      root
    });
  }).sort((left, right) => stableProofByteOrder(left.root, right.root));
  if (new Set(contractPolicies.map((policy) => policy.root)).size !== contractPolicies.length) {
    throw new Error("Git currentness policy roots duplicate one another");
  }
  const commonDirectoryWasExplicit = trustedGitCommonDir !== null
    && trustedGitCommonDir !== undefined;
  let commonDirectoryCandidate = trustedGitCommonDir;
  if (!commonDirectoryWasExplicit) {
    const sourcePolicy = contractPolicies.find((policy) => {
      try {
        const dotGit = fs.lstatSync(path.join(policy.root, ".git"));
        return dotGit.isFile() || dotGit.isDirectory() || dotGit.isSymbolicLink();
      } catch {
        return false;
      }
    });
    if (!sourcePolicy) {
      throw new Error("Git currentness could not derive a source common directory");
    }
    commonDirectoryCandidate = gitCurrentnessGitPath(
      sourcePolicy.root,
      "--git-common-dir",
      "Git currentness derived common directory",
      deadlineMs
    );
  }
  const canonicalCommonDir = stableProofCanonicalRoot(
    commonDirectoryCandidate,
    "Git currentness trusted common directory"
  );
  const commonDirectoryIsPolicyRoot = contractPolicies.some(
    (policy) => policy.root === canonicalCommonDir
  );
  if (commonDirectoryWasExplicit && !commonDirectoryIsPolicyRoot) {
    throw new Error("Git currentness trusted common directory must be an exact policy root");
  }

  const selectedAbsolutePaths = commonDirectoryIsPolicyRoot
    ? gitCurrentnessControlLeaves(canonicalCommonDir, deadlineMs, maxPaths)
    : new Set();
  const sourceAdminDirectories = [];
  for (const policy of contractPolicies) {
    if (Date.now() >= deadlineMs) {
      throw new Error("Git currentness scope exceeded its absolute deadline");
    }
    for (const relativePath of policy.exactMetadataPaths) {
      selectedAbsolutePaths.add(path.resolve(policy.root, ...relativePath.split("/")));
    }
    if (policy.root === canonicalCommonDir) continue;
    const observedCommonDir = gitCurrentnessGitPath(
      policy.root,
      "--git-common-dir",
      "Git currentness observed common directory",
      deadlineMs
    );
    if (observedCommonDir !== canonicalCommonDir) {
      throw new Error("Git currentness source root is bound to a different common directory");
    }
    const adminDir = gitCurrentnessGitPath(
      policy.root,
      "--git-dir",
      "Git currentness source admin directory",
      deadlineMs
    );
    const linkedAdminRoot = path.join(canonicalCommonDir, "worktrees");
    if (adminDir !== canonicalCommonDir && !gitCurrentnessPathIsWithin(adminDir, linkedAdminRoot)) {
      throw new Error("Git currentness source admin directory escaped the trusted worktree controls");
    }
    sourceAdminDirectories.push(Object.freeze({ adminDir, sourceRoot: policy.root }));
    const dotGit = path.join(policy.root, ".git");
    const dotGitStatus = fs.lstatSync(dotGit);
    if (dotGitStatus.isFile() || dotGitStatus.isSymbolicLink()) {
      selectedAbsolutePaths.add(dotGit);
    } else if (!dotGitStatus.isDirectory() || fs.realpathSync(dotGit) !== canonicalCommonDir) {
      throw new Error("Git currentness source .git control is unsafe");
    }
    for (const relativePath of gitCurrentnessStatusPaths(policy.root, deadlineMs, maxPaths)) {
      selectedAbsolutePaths.add(path.resolve(policy.root, ...relativePath.split("/")));
      if (selectedAbsolutePaths.size > maxPaths) {
        throw new Error("Git currentness frozen selection exceeds its path budget");
      }
    }
  }

  const selectedByRoot = new Map(contractPolicies.map((policy) => [policy.root, new Set()]));
  const orderedOwners = [...contractPolicies].sort((left, right) => (
    right.root.length - left.root.length || stableProofByteOrder(left.root, right.root)
  ));
  for (const absolutePath of selectedAbsolutePaths) {
    const owner = orderedOwners.find((policy) => gitCurrentnessPathIsWithin(absolutePath, policy.root));
    if (!owner) throw new Error("Git currentness selected path escaped every logical root");
    const relativePath = path.relative(owner.root, absolutePath).split(path.sep).join("/");
    if (relativePath === "") throw new Error("Git currentness selection cannot use a policy root as a leaf");
    selectedByRoot.get(owner.root).add(stableProofTrackedRelativePath(
      relativePath,
      "Git currentness selected relative path"
    ));
  }
  const normalizedPolicies = stableProofNormalizePolicies(contractPolicies.map((policy) => ({
    root: policy.root,
    trackedRelativePaths: [...selectedByRoot.get(policy.root)].sort(stableProofByteOrder)
  })));
  const pathCount = normalizedPolicies.reduce(
    (sum, policy) => sum + policy.trackedRelativePaths.length,
    0
  );
  if (pathCount < 1 || pathCount > maxPaths) {
    throw new Error("Git currentness frozen selection exceeds its path budget");
  }
  const contractFingerprint = sha256Buffer(Buffer.from(stableJson({
    policies: contractPolicies,
    sourceAdminDirectories: sourceAdminDirectories.sort((left, right) => (
      stableProofByteOrder(left.sourceRoot, right.sourceRoot)
    )),
    trustedGitCommonDir: canonicalCommonDir
  })));
  const selectionFingerprint = sha256Buffer(Buffer.from(stableJson(normalizedPolicies)));
  const scope = Object.freeze({
    captureMode: GIT_CURRENTNESS_CAPTURE_MODE,
    contractFingerprint,
    pathCount,
    selectionFingerprint
  });
  GIT_CURRENTNESS_PROOF_SCOPES.set(scope, Object.freeze({
    contractFingerprint,
    maxPaths,
    normalizedPolicies,
    scopeToken: Object.freeze({}),
    selectionFingerprint
  }));
  return scope;
}

export function captureGitCurrentnessProofSnapshot({
  hooks: rawHooks = {},
  scope
} = {}) {
  const binding = (typeof scope === "object" || typeof scope === "function")
    && scope !== null
    ? GIT_CURRENTNESS_PROOF_SCOPES.get(scope)
    : undefined;
  if (binding === undefined) {
    throw new Error("Git currentness capture requires an exact module-branded proof scope");
  }
  const hooks = stableProofHooks(rawHooks);
  const build = () => stableProofBuildSnapshot(
    binding.normalizedPolicies,
    stableProofRunDescriptorWalker(
      binding.normalizedPolicies,
      binding.maxPaths,
      GIT_CURRENTNESS_CAPTURE_MODE
    ),
    {
      captureMode: GIT_CURRENTNESS_CAPTURE_MODE,
      contractFingerprint: binding.contractFingerprint,
      scopeToken: binding.scopeToken,
      selectionFingerprint: binding.selectionFingerprint
    }
  );
  const first = build();
  if (Object.keys(hooks).length === 0) return first;
  stableProofInvokeHooks(first, hooks);
  const second = build();
  if (first.sha256 !== second.sha256) {
    throw new Error("Git currentness snapshot changed across the deterministic hook seam");
  }
  return second;
}

export function decideTypedFseventsAcknowledgementWait({
  childAlive,
  exitCode,
  matches,
  signalCode,
  terminal
} = {}) {
  if (typeof childAlive !== "boolean"
    || typeof matches !== "boolean"
    || typeof terminal !== "boolean"
    || (exitCode !== null && (!Number.isInteger(exitCode) || exitCode < 0))
    || (signalCode !== null && (typeof signalCode !== "string" || signalCode.length === 0))) {
    throw new Error("typed FSEvents acknowledgement wait state is invalid");
  }
  if (!terminal) {
    if (!childAlive || exitCode !== null || signalCode !== null) return "reject";
    return matches ? "accept" : "wait";
  }
  if (exitCode === null && signalCode === null) return "wait";
  if (childAlive || exitCode !== 0 || signalCode !== null) return "reject";
  return matches ? "accept" : "reject";
}

function sameTypedFseventsFrameSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function secureTypedFseventsFrame(status, expectedBytes) {
  return status.isFile()
    && (status.mode & 0o7777n) === 0o600n
    && status.uid === BigInt(process.geteuid())
    && status.nlink === 1n
    && status.size === BigInt(expectedBytes);
}

function secureTypedFseventsJournal(status, minimumBytes) {
  return status.isFile()
    && (status.mode & 0o7777n) === 0o600n
    && status.uid === BigInt(process.geteuid())
    && status.nlink === 1n
    && status.size >= BigInt(minimumBytes);
}

function sameTypedFseventsJournalIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mode === right.mode
    && left.uid === right.uid
    && left.nlink === right.nlink;
}

function readTypedFseventsPrefix(descriptor, byteLength) {
  const prefix = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < byteLength) {
    const amount = fs.readSync(descriptor, prefix, offset, byteLength - offset, offset);
    if (amount <= 0) return null;
    offset += amount;
  }
  return prefix;
}

/**
 * Read one native-helper ACK/commit pair through held, no-follow descriptors.
 * The optional callback is a deterministic test seam that runs after both
 * frames have been read but before their visible names are rebound.
 */
export function readCommittedTypedFseventsAcknowledgement(
  acknowledgementPath,
  {
    beforeVisibleValidation,
    expectedEventRootCount,
    expectedEventRootFingerprint
  } = {}
) {
  const commitPath = path.join(path.dirname(acknowledgementPath), "ack.commit");
  const journalPath = path.join(path.dirname(acknowledgementPath), "journal.bin");
  if (expectedEventRootCount !== undefined
    && (!Number.isSafeInteger(expectedEventRootCount) || expectedEventRootCount < 1)) return null;
  if (expectedEventRootFingerprint !== undefined
    && (typeof expectedEventRootFingerprint !== "string"
      || !/^[0-9a-f]{64}$/u.test(expectedEventRootFingerprint))) return null;
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const nonBlock = fs.constants.O_NONBLOCK ?? 0;
  let acknowledgementDescriptor = -1;
  let commitDescriptor = -1;
  let journalDescriptor = -1;
  let acknowledgementBefore;
  let commitBefore;
  let journalBefore;
  try {
    acknowledgementDescriptor = fs.openSync(
      acknowledgementPath,
      fs.constants.O_RDONLY | noFollow | nonBlock
    );
    acknowledgementBefore = fs.fstatSync(acknowledgementDescriptor, { bigint: true });
    if (!secureTypedFseventsFrame(acknowledgementBefore, 136)) throw new Error("unsafe ACK endpoint");
    commitDescriptor = fs.openSync(commitPath, fs.constants.O_RDONLY | noFollow | nonBlock);
    commitBefore = fs.fstatSync(commitDescriptor, { bigint: true });
    if (!secureTypedFseventsFrame(commitBefore, 72)) throw new Error("unsafe ACK commit endpoint");
    journalDescriptor = fs.openSync(journalPath, fs.constants.O_RDONLY | noFollow | nonBlock);
    journalBefore = fs.fstatSync(journalDescriptor, { bigint: true });
    if (!secureTypedFseventsJournal(journalBefore, 0)) throw new Error("unsafe journal endpoint");
  } catch (error) {
    if (acknowledgementDescriptor >= 0) fs.closeSync(acknowledgementDescriptor);
    if (commitDescriptor >= 0) fs.closeSync(commitDescriptor);
    if (journalDescriptor >= 0) fs.closeSync(journalDescriptor);
    return null;
  }

  let acknowledgement;
  let commit;
  let acknowledgementAfter;
  let acknowledgementVisible;
  let acknowledgementFinal;
  let commitAfter;
  let commitVisible;
  let commitFinal;
  let journalAfter;
  let journalVisible;
  let journalFinal;
  let journalPrefix;
  let journalVerification;
  let parsedHighWater = null;
  let transientRace = false;
  try {
    acknowledgement = fs.readFileSync(acknowledgementDescriptor);
    commit = fs.readFileSync(commitDescriptor);
    if (acknowledgement.length === 136
      && acknowledgement.toString("ascii", 0, 4) === "MFSA"
      && acknowledgement.readUInt16LE(4) === 2
      && acknowledgement.readUInt32LE(8) === 136) {
      const highWater = acknowledgement.readBigUInt64LE(24);
      if (highWater <= BigInt(Number.MAX_SAFE_INTEGER)
        && highWater <= BigInt(TYPED_FSEVENTS_MAX_BUFFER_BYTES)
        && highWater <= BigInt(TYPED_FSEVENTS_MAX_JOURNAL_BYTES)
        && highWater <= journalBefore.size) {
        parsedHighWater = Number(highWater);
        journalPrefix = readTypedFseventsPrefix(journalDescriptor, parsedHighWater);
      }
    }
    acknowledgementAfter = fs.fstatSync(acknowledgementDescriptor, { bigint: true });
    commitAfter = fs.fstatSync(commitDescriptor, { bigint: true });
    journalAfter = fs.fstatSync(journalDescriptor, { bigint: true });
    beforeVisibleValidation?.({
      acknowledgementPath,
      commitPath,
      journalPath,
      phase: "afterJournalReadBeforeVisibleValidation"
    });
    acknowledgementVisible = fs.lstatSync(acknowledgementPath, { bigint: true });
    commitVisible = fs.lstatSync(commitPath, { bigint: true });
    journalVisible = fs.lstatSync(journalPath, { bigint: true });
    if (parsedHighWater !== null) {
      journalVerification = readTypedFseventsPrefix(journalDescriptor, parsedHighWater);
    }
    acknowledgementFinal = fs.fstatSync(acknowledgementDescriptor, { bigint: true });
    commitFinal = fs.fstatSync(commitDescriptor, { bigint: true });
    journalFinal = fs.fstatSync(journalDescriptor, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") transientRace = true;
    else throw error;
  } finally {
    fs.closeSync(acknowledgementDescriptor);
    fs.closeSync(commitDescriptor);
    fs.closeSync(journalDescriptor);
  }
  if (transientRace) return null;
  if (parsedHighWater === null || journalPrefix === null || journalVerification === null
    || !secureTypedFseventsFrame(acknowledgementBefore, 136)
    || !secureTypedFseventsFrame(acknowledgementAfter, 136)
    || !secureTypedFseventsFrame(acknowledgementVisible, 136)
    || !secureTypedFseventsFrame(acknowledgementFinal, 136)
    || !secureTypedFseventsFrame(commitBefore, 72)
    || !secureTypedFseventsFrame(commitAfter, 72)
    || !secureTypedFseventsFrame(commitVisible, 72)
    || !secureTypedFseventsFrame(commitFinal, 72)
    || !sameTypedFseventsFrameSnapshot(acknowledgementBefore, acknowledgementAfter)
    || !sameTypedFseventsFrameSnapshot(acknowledgementAfter, acknowledgementVisible)
    || !sameTypedFseventsFrameSnapshot(acknowledgementVisible, acknowledgementFinal)
    || !sameTypedFseventsFrameSnapshot(commitBefore, commitAfter)
    || !sameTypedFseventsFrameSnapshot(commitAfter, commitVisible)
    || !sameTypedFseventsFrameSnapshot(commitVisible, commitFinal)
    || !secureTypedFseventsJournal(journalBefore, parsedHighWater)
    || !secureTypedFseventsJournal(journalAfter, parsedHighWater)
    || !secureTypedFseventsJournal(journalVisible, parsedHighWater)
    || !secureTypedFseventsJournal(journalFinal, parsedHighWater)
    || !sameTypedFseventsJournalIdentity(journalBefore, journalAfter)
    || !sameTypedFseventsJournalIdentity(journalAfter, journalVisible)
    || !sameTypedFseventsJournalIdentity(journalVisible, journalFinal)
    || !journalPrefix.equals(journalVerification)) {
    return null;
  }
  if (acknowledgement.toString("ascii", 0, 4) !== "MFSA"
    || acknowledgement.readUInt16LE(4) !== 2
    || acknowledgement.readUInt32LE(8) !== 136
    || acknowledgement.readUInt32LE(12) !== 0
    || commit.toString("ascii", 0, 4) !== "MFAC"
    || commit.readUInt16LE(4) !== 2
    || commit.readUInt32LE(8) !== 72
    || commit.readUInt32LE(12) !== 0) return null;
  const type = acknowledgement.readUInt16LE(6);
  const sequence = acknowledgement.readBigUInt64LE(16);
  const eventRootCount = acknowledgement.readBigUInt64LE(48);
  const eventRootFingerprint = acknowledgement.subarray(56, 88).toString("hex");
  const journalDevice = acknowledgement.readBigUInt64LE(88);
  const journalInode = acknowledgement.readBigUInt64LE(96);
  const journalSha256 = acknowledgement.subarray(104, 136).toString("hex");
  const acknowledgementDigest = crypto.createHash("sha256").update(acknowledgement).digest();
  const actualJournalSha256 = crypto.createHash("sha256").update(journalPrefix).digest("hex");
  if (commit.readUInt16LE(6) !== type
    || commit.readBigUInt64LE(16) !== sequence
    || commit.readBigUInt64LE(24) !== acknowledgementFinal.dev
    || commit.readBigUInt64LE(32) !== acknowledgementFinal.ino
    || !commit.subarray(40, 72).equals(acknowledgementDigest)
    || ![1, 2, 3, 4].includes(type)
    || eventRootCount < 1n
    || journalDevice !== journalFinal.dev
    || journalInode !== journalFinal.ino
    || journalSha256 !== actualJournalSha256
    || (expectedEventRootCount !== undefined
      && eventRootCount !== BigInt(expectedEventRootCount))
    || (expectedEventRootFingerprint !== undefined
      && eventRootFingerprint !== expectedEventRootFingerprint)) return null;
  const committedAcknowledgement = Object.freeze({
    commitVisibleInode: commitVisible.ino,
    entryCount: acknowledgement.readBigUInt64LE(32),
    eventRootCount,
    eventRootFingerprint,
    journalDevice,
    journalHighWater: acknowledgement.readBigUInt64LE(24),
    journalInode,
    journalPrefix,
    journalSha256,
    lastEventId: acknowledgement.readBigUInt64LE(40),
    sequence,
    type,
    visibleInode: acknowledgementVisible.ino
  });
  TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS.set(
    committedAcknowledgement,
    Object.freeze({
      ackObservationOrdinal: typedFseventsNextProvenanceOrdinal(),
      journalBirthtimeNs: journalFinal.birthtimeNs,
      journalPrefix,
      publicationIdentity: [
        acknowledgementFinal.dev,
        acknowledgementFinal.ino,
        acknowledgementFinal.birthtimeNs,
        commitFinal.dev,
        commitFinal.ino,
        commitFinal.birthtimeNs,
        crypto.createHash("sha256").update(acknowledgement).digest("hex"),
        crypto.createHash("sha256").update(commit).digest("hex"),
        journalFinal.dev,
        journalFinal.ino,
        journalFinal.birthtimeNs
      ].join(":")
    })
  );
  return committedAcknowledgement;
}

function typedFseventsExactObjectKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expectedKeys].sort())) {
    throw new Error(`${label} fields are invalid`);
  }
  return value;
}

function typedFseventsOrderedEventRoots(eventRoots, label = "typed FSEvents event roots") {
  const roots = typedFseventsCanonicalPathSet(eventRoots, label);
  if (roots.length > STABLE_PROOF_MAX_POLICIES) {
    throw new Error(`${label} exceeds the root-count cap`);
  }
  let totalBytes = 0;
  for (let index = 0; index < roots.length; index += 1) {
    totalBytes += Buffer.byteLength(roots[index]) + 1;
    if (Buffer.byteLength(roots[index]) > STABLE_PROOF_MAX_PATH_BYTES
      || totalBytes > 16 * 1024 * 1024) {
      throw new Error(`${label} exceeds the byte cap`);
    }
    if (index > 0 && stableProofByteOrder(roots[index - 1], roots[index]) >= 0) {
      throw new Error(`${label} must use strict UTF-8 byte order`);
    }
  }
  return roots;
}

function typedFseventsEventRootFingerprint(roots) {
  return sha256Buffer(Buffer.concat(
    roots.flatMap((root) => [Buffer.from(root, "utf8"), Buffer.from([0])])
  ));
}

function typedFseventsSameOrderedStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function typedFseventsValidatedSnapshot(value, label) {
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !STABLE_PROOF_VALIDATED_SNAPSHOTS.has(value)) {
    throw new Error(`${label} must be a module-validated stable proof snapshot`);
  }
  return value;
}

function typedFseventsValidatedAckEndpoint(value, label) {
  if ((typeof value === "object" || typeof value === "function")
    && value !== null
    && TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.has(value)) {
    throw new Error(`${label} is already consumed`);
  }
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.has(value)) {
    throw new Error(`${label} must be a module-validated ACK endpoint`);
  }
  return TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.get(value);
}

function typedFseventsCheckpointEquals(left, right) {
  return left.entryCount === right.entryCount
    && left.highWater === right.highWater
    && left.lastEventId === right.lastEventId
    && left.sha256 === right.sha256;
}

function typedFseventsSameJournalIdentity(left, right) {
  return left.device === right.device
    && left.inode === right.inode
    && left.birthtimeNs === right.birthtimeNs;
}

function typedFseventsJournalSessionFingerprint(identity) {
  return sha256Buffer(Buffer.from([
    identity.device,
    identity.inode,
    identity.birthtimeNs
  ].map((value) => value.toString()).join(":"), "ascii"));
}

/**
 * Normalize one descriptor-authenticated native ACK into a root-bound,
 * immutable checkpoint. A plain ACK-shaped object can never mint provenance.
 */
export function normalizeTypedFseventsAckCheckpoint({
  acknowledgement,
  eventRoots
} = {}) {
  if ((typeof acknowledgement === "object" || typeof acknowledgement === "function")
    && acknowledgement !== null
    && TYPED_FSEVENTS_CONSUMED_ACKNOWLEDGEMENTS.has(acknowledgement)) {
    throw new Error("typed FSEvents committed acknowledgement is already consumed");
  }
  if ((typeof acknowledgement !== "object" && typeof acknowledgement !== "function")
    || acknowledgement === null
    || !TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS.has(acknowledgement)) {
    throw new Error("typed FSEvents acknowledgement must be module-validated and committed");
  }
  if (TYPED_FSEVENTS_CONSUMED_ACKNOWLEDGEMENTS.has(acknowledgement)) {
    throw new Error("typed FSEvents committed acknowledgement is already consumed");
  }
  const roots = typedFseventsOrderedEventRoots(eventRoots);
  const committed = TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS.get(acknowledgement);
  const type = acknowledgement.type;
  const sequence = typedFseventsUint64(
    acknowledgement.sequence,
    "typed FSEvents acknowledgement sequence"
  );
  if (![1, 2, 3].includes(type)
    || (type === 1 && sequence !== 0n)
    || (type !== 1 && sequence === 0n)) {
    throw new Error("typed FSEvents acknowledgement type or sequence is invalid");
  }
  if (acknowledgement.eventRootCount !== BigInt(roots.length)
    || acknowledgement.eventRootFingerprint !== typedFseventsEventRootFingerprint(roots)) {
    throw new Error("typed FSEvents acknowledgement event-root binding is invalid");
  }
  const entryCount = typedFseventsUint64(
    acknowledgement.entryCount,
    "typed FSEvents acknowledgement entry count"
  );
  const highWater = typedFseventsUint64(
    acknowledgement.journalHighWater,
    "typed FSEvents acknowledgement high-water"
  );
  const rawLastEventId = typedFseventsUint64(
    acknowledgement.lastEventId,
    "typed FSEvents acknowledgement last event ID"
  );
  const journalPrefix = committed.journalPrefix;
  const journalIdentity = Object.freeze({
    device: typedFseventsUint64(
      acknowledgement.journalDevice,
      "typed FSEvents acknowledgement journal device"
    ),
    inode: typedFseventsUint64(
      acknowledgement.journalInode,
      "typed FSEvents acknowledgement journal inode"
    ),
    birthtimeNs: typedFseventsUint64(
      committed.journalBirthtimeNs,
      "typed FSEvents acknowledgement journal birth time"
    )
  });
  const emptySha256 = sha256Buffer(Buffer.alloc(0));
  const actualSha256 = sha256Buffer(journalPrefix);
  if (highWater > BigInt(TYPED_FSEVENTS_MAX_JOURNAL_BYTES)
    || entryCount > TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES
    || highWater !== BigInt(journalPrefix.length)
    || acknowledgement.journalSha256 !== actualSha256) {
    throw new Error("typed FSEvents acknowledgement journal checkpoint is invalid");
  }
  const emptyTuple = entryCount === 0n
    && highWater === 0n
    && journalPrefix.length === 0
    && actualSha256 === emptySha256
    && rawLastEventId === 0n;
  if (entryCount === 0n || highWater === 0n || journalPrefix.length === 0
    || actualSha256 === emptySha256 || rawLastEventId === 0n) {
    if (!emptyTuple) {
      throw new Error("typed FSEvents empty checkpoint tuple is inconsistent");
    }
  } else if (highWater < entryCount * BigInt(TYPED_FSEVENTS_JOURNAL_HEADER_BYTES + 1)) {
    throw new Error("typed FSEvents nonempty checkpoint count or high-water is invalid");
  }
  const authenticatedJournalPrefix = Buffer.from(journalPrefix);
  if (sha256Buffer(authenticatedJournalPrefix) !== actualSha256) {
    throw new Error("typed FSEvents acknowledgement journal changed during normalization");
  }
  const publicationIdentity = committed.publicationIdentity;
  if (TYPED_FSEVENTS_NORMALIZED_ACK_PUBLICATIONS.has(publicationIdentity)) {
    throw new Error("typed FSEvents ACK publication was already normalized");
  }
  if (TYPED_FSEVENTS_NORMALIZED_ACK_PUBLICATIONS.size >= 4_096) {
    throw new Error("typed FSEvents normalized ACK publication cap exceeded");
  }
  const checkpoint = markTypedFseventsCheckpoint({
    entryCount,
    highWater,
    lastEventId: emptyTuple ? null : rawLastEventId,
    sha256: actualSha256
  }, roots);
  const journalSessionFingerprint = typedFseventsJournalSessionFingerprint(journalIdentity);
  const endpoint = Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    ackType: type,
    sequence,
    journalSessionFingerprint,
    checkpoint
  });
  TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.set(endpoint, Object.freeze({
    checkpoint,
    journalPrefix: authenticatedJournalPrefix,
    journalIdentity,
    journalSessionFingerprint,
    provenanceOrdinal: committed.ackObservationOrdinal,
    roots,
    sequence,
    type
  }));
  TYPED_FSEVENTS_NORMALIZED_ACK_PUBLICATIONS.add(publicationIdentity);
  TYPED_FSEVENTS_CONSUMED_ACKNOWLEDGEMENTS.add(acknowledgement);
  TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS.delete(acknowledgement);
  return endpoint;
}

function typedFseventsRelativeToAnyRoot(candidate, roots) {
  let selectedRoot = null;
  for (const root of roots) {
    if (!typedFseventsPathIsWithin(candidate, root) || candidate === root) continue;
    if (selectedRoot === null || Buffer.byteLength(root) > Buffer.byteLength(selectedRoot)) {
      selectedRoot = root;
    }
  }
  if (selectedRoot === null) return null;
  const relativePath = path.posix.relative(selectedRoot, candidate);
  return relativePath.length > 0
    && relativePath !== ".."
    && !relativePath.startsWith("../")
    && !path.posix.isAbsolute(relativePath)
    ? relativePath
    : null;
}

function typedFseventsTrustedGitCommonDir(value, roots) {
  if (value === null) return null;
  const commonDir = typedFseventsCanonicalAbsolutePath(
    value,
    "typed FSEvents trusted Git common directory"
  );
  if (!roots.includes(commonDir)) {
    throw new Error("typed FSEvents trusted Git common directory must be an exact event root");
  }
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)
    || !Number.isInteger(fs.constants.O_DIRECTORY)) {
    throw new Error("typed FSEvents trusted Git common directory requires no-follow support");
  }
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      commonDir,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
    );
    const held = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(commonDir, { bigint: true });
    const final = fs.fstatSync(descriptor, { bigint: true });
    if (!held.isDirectory()
      || !visible.isDirectory()
      || visible.isSymbolicLink()
      || !final.isDirectory()
      || !sameTypedFseventsJournalIdentity(held, visible)
      || !sameTypedFseventsJournalIdentity(visible, final)
      || fs.realpathSync(commonDir) !== commonDir) {
      throw new Error("typed FSEvents trusted Git common directory is not direct and stable");
    }
    return commonDir;
  } catch {
    throw new Error("typed FSEvents trusted Git common directory is not direct and stable");
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
  }
}

function typedFseventsDirectRegularNoFollowLock(candidate, trustedGitCommonDir) {
  if (trustedGitCommonDir === null
    || candidate !== path.posix.join(trustedGitCommonDir, "mais-evidence-writer.lock")
    || !Number.isInteger(fs.constants.O_NOFOLLOW)) return false;
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      candidate,
      fs.constants.O_RDONLY
        | fs.constants.O_NOFOLLOW
        | (fs.constants.O_NONBLOCK ?? 0)
    );
    const held = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(candidate, { bigint: true });
    const final = fs.fstatSync(descriptor, { bigint: true });
    return held.isFile()
      && visible.isFile()
      && !visible.isSymbolicLink()
      && final.isFile()
      && sameTypedFseventsFrameSnapshot(held, visible)
      && sameTypedFseventsFrameSnapshot(visible, final)
      && fs.realpathSync(candidate) === candidate;
  } catch {
    return false;
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
  }
}

function typedFseventsMetadataPolicy(
  exactMetadataPaths,
  exactMetadataRoots,
  roots,
  trustedGitCommonDir,
  metadataOwnerPid
) {
  if (!Array.isArray(exactMetadataPaths)
    || exactMetadataPaths.length > TRANSACTION_METADATA_PATHS.length + 1
    || !Array.isArray(exactMetadataRoots)
    || exactMetadataRoots.length > 1
    || !Number.isSafeInteger(metadataOwnerPid)
    || metadataOwnerPid <= 1) {
    throw new Error("typed FSEvents metadata policy exceeds its count cap");
  }
  const metadataPaths = [...typedFseventsCanonicalPathSet(
    exactMetadataPaths,
    "typed FSEvents exact metadata paths",
    roots
  )].sort(stableProofByteOrder);
  const metadataRoots = [...typedFseventsCanonicalPathSet(
    exactMetadataRoots,
    "typed FSEvents exact metadata roots",
    roots
  )].sort(stableProofByteOrder);
  const trustedCommonDir = typedFseventsTrustedGitCommonDir(trustedGitCommonDir, roots);
  let totalBytes = 0;
  for (const candidate of [...metadataPaths, ...metadataRoots]) {
    const candidateBytes = Buffer.byteLength(candidate);
    totalBytes += candidateBytes;
    if (candidateBytes > STABLE_PROOF_MAX_PATH_BYTES || totalBytes > 64 * 1024) {
      throw new Error("typed FSEvents metadata policy exceeds its byte cap");
    }
  }
  for (const candidate of metadataPaths) {
    const relativePath = typedFseventsRelativeToAnyRoot(candidate, roots);
    if (relativePath === null
      || (!TRANSACTION_METADATA_PATHS.includes(relativePath)
        && !typedFseventsDirectRegularNoFollowLock(candidate, trustedCommonDir))) {
      throw new Error("typed FSEvents exact metadata path is not module-approved");
    }
  }
  const expectedParent = path.posix.dirname(TRANSACTION_METADATA_PATHS[0]);
  for (const candidate of metadataRoots) {
    const relativePath = typedFseventsRelativeToAnyRoot(candidate, roots);
    const match = relativePath === null
      ? null
      : path.posix.basename(relativePath).match(/^\.evidence-publish-([1-9][0-9]*)-([0-9a-f-]+)$/iu);
    if (relativePath === null
      || path.posix.dirname(relativePath) !== expectedParent
      || !match
      || Number(match[1]) !== metadataOwnerPid
      || !UUID_PATTERN.test(match[2])) {
      throw new Error("typed FSEvents exact metadata root is not module-approved");
    }
  }
  const frozenPaths = Object.freeze(metadataPaths);
  const frozenRoots = Object.freeze(metadataRoots);
  return Object.freeze({
    fingerprint: sha256Buffer(Buffer.from(JSON.stringify({
      exactMetadataPaths: frozenPaths,
      exactMetadataRoots: frozenRoots,
      metadataOwnerPid,
      trustedGitCommonDir: trustedCommonDir
    }))),
    pathSet: new Set(frozenPaths),
    paths: frozenPaths,
    roots: frozenRoots
  });
}

function typedFseventsMetadataPath(eventPath, metadataPathSet, metadataRoots) {
  return metadataPathSet.has(eventPath)
    || metadataRoots.some((root) => typedFseventsPathIsWithin(eventPath, root));
}

function typedFseventsEventPathIndex(eventPaths) {
  const ordered = [...eventPaths].sort();
  return Object.freeze({
    exact: new Set(ordered),
    ordered: Object.freeze(ordered)
  });
}

function typedFseventsEventEvidence({
  journalSessionFingerprint,
  metadataEventPaths,
  metadataPolicyFingerprint,
  sourcePaths,
  xattrPaths
}) {
  const metadataPathIndex = typedFseventsEventPathIndex(metadataEventPaths);
  const sourcePathIndex = typedFseventsEventPathIndex(sourcePaths);
  const orderedXattrPaths = [...xattrPaths].sort();
  const xattrPathSet = new Set(orderedXattrPaths);
  const digest = crypto.createHash("sha256");
  digest.update("MFSE2\0", "ascii");
  digest.update(journalSessionFingerprint, "ascii");
  digest.update("\0", "ascii");
  digest.update(metadataPolicyFingerprint, "ascii");
  for (const [category, paths] of [
    ["metadata", metadataPathIndex.ordered],
    ["source", sourcePathIndex.ordered],
    ["xattr", orderedXattrPaths]
  ]) {
    digest.update(`\0${category}\0`, "ascii");
    for (const eventPath of paths) {
      digest.update(eventPath, "utf8");
      digest.update("\0", "ascii");
    }
  }
  return Object.freeze({
    fingerprint: digest.digest("hex"),
    journalSessionFingerprint,
    metadataPathCount: BigInt(metadataPathIndex.exact.size),
    metadataPathIndex,
    metadataPolicyFingerprint,
    sourcePathCount: BigInt(sourcePathIndex.exact.size),
    sourcePathIndex,
    xattrPathCount: BigInt(xattrPathSet.size),
    xattrPathSet
  });
}

function typedFseventsEvidenceIsEmpty(evidence) {
  return evidence.metadataPathCount === 0n
    && evidence.sourcePathCount === 0n
    && evidence.xattrPathCount === 0n;
}

function typedFseventsEvidenceSummary(evidence) {
  return Object.freeze({
    pendingEvidenceFingerprint: evidence.fingerprint,
    pendingMetadataPathCount: evidence.metadataPathCount,
    pendingSourcePathCount: evidence.sourcePathCount,
    pendingXattrPathCount: evidence.xattrPathCount
  });
}

function typedFseventsHasIndexedDescendant(pathIndex, changedPath) {
  const prefix = changedPath === "/" ? "/" : `${changedPath}/`;
  let low = 0;
  let high = pathIndex.ordered.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (pathIndex.ordered[middle] < prefix) low = middle + 1;
    else high = middle;
  }
  return low < pathIndex.ordered.length && pathIndex.ordered[low].startsWith(prefix);
}

function typedFseventsHasIndexedAncestor(pathIndex, changedPath) {
  let candidate = path.posix.dirname(changedPath);
  while (true) {
    if (pathIndex.exact.has(candidate)) return true;
    if (candidate === "/") return false;
    const parent = path.posix.dirname(candidate);
    if (parent === candidate) return false;
    candidate = parent;
  }
}

function typedFseventsDirectoryDescendantChangeIsNamespaceOnly(priorProof, candidateProof) {
  if (priorProof?.type !== "directory" || candidateProof?.type !== "directory") return false;
  return ["dev", "ino", "uid", "gid", "mode"].every((field) => (
    priorProof[field] === candidateProof[field]
  ));
}

function typedFseventsEventPathExplainsChange(
  pathIndex,
  changedPath,
  priorProof,
  candidateProof
) {
  if (pathIndex.exact.has(changedPath)) return true;
  return typedFseventsDirectoryDescendantChangeIsNamespaceOnly(priorProof, candidateProof)
    && typedFseventsHasIndexedDescendant(pathIndex, changedPath);
}

function typedFseventsAnyEventPathExplainsChange(
  pathIndexes,
  changedPath,
  priorProof,
  candidateProof
) {
  return pathIndexes.some((pathIndex) => typedFseventsEventPathExplainsChange(
    pathIndex,
    changedPath,
    priorProof,
    candidateProof
  ));
}

function typedFseventsSnapshotPoliciesEqual(left, right) {
  const leftProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(left);
  const rightProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(right);
  if (leftProvenance?.captureMode !== rightProvenance?.captureMode) return false;
  const commonPolicy = stableJson(left.policies) === stableJson(right.policies)
    && typedFseventsSameOrderedStrings(left.roots, right.roots);
  if (!commonPolicy) return false;
  if (leftProvenance.captureMode === FULL_NAMESPACE_CAPTURE_MODE) return true;
  return leftProvenance.captureMode === GIT_CURRENTNESS_CAPTURE_MODE
    && leftProvenance.scopeToken === rightProvenance.scopeToken
    && leftProvenance.contractFingerprint === rightProvenance.contractFingerprint
    && leftProvenance.selectionFingerprint === rightProvenance.selectionFingerprint;
}

function typedFseventsSnapshotDifference({
  classification,
  currentEvidence,
  metadataPathSet,
  metadataRoots,
  priorEvidence,
  priorSnapshot,
  candidateSnapshot,
}) {
  let priorIndex = 0;
  let candidateIndex = 0;
  let changed = false;
  let metadataChanged = false;
  let sourceChanged = false;
  let xattrCtimeChanged = false;
  const priorProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(priorSnapshot);
  const candidateProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(candidateSnapshot);
  const sparseSourceAncestorMatching = priorProvenance?.captureMode === GIT_CURRENTNESS_CAPTURE_MODE
    && candidateProvenance?.captureMode === GIT_CURRENTNESS_CAPTURE_MODE;
  const matchedCurrentXattrPaths = new Set();
  while (priorIndex < priorSnapshot.entries.length
    || candidateIndex < candidateSnapshot.entries.length) {
    const priorEntry = priorSnapshot.entries[priorIndex];
    const candidateEntry = candidateSnapshot.entries[candidateIndex];
    let eventPath;
    let priorProof;
    let candidateProof;
    if (priorEntry === undefined) {
      eventPath = candidateEntry.path;
      candidateProof = candidateEntry.proof;
      candidateIndex += 1;
    } else if (candidateEntry === undefined) {
      eventPath = priorEntry.path;
      priorProof = priorEntry.proof;
      priorIndex += 1;
    } else {
      const ordering = stableProofByteOrder(priorEntry.path, candidateEntry.path);
      if (ordering < 0) {
        eventPath = priorEntry.path;
        priorProof = priorEntry.proof;
        priorIndex += 1;
      } else if (ordering > 0) {
        eventPath = candidateEntry.path;
        candidateProof = candidateEntry.proof;
        candidateIndex += 1;
      } else {
        eventPath = priorEntry.path;
        priorProof = priorEntry.proof;
        candidateProof = candidateEntry.proof;
        priorIndex += 1;
        candidateIndex += 1;
        if (stableJson(priorProof) === stableJson(candidateProof)) continue;
      }
    }
    changed = true;
    if (typedFseventsMetadataPath(eventPath, metadataPathSet, metadataRoots)) {
      if (!typedFseventsAnyEventPathExplainsChange(
        [currentEvidence.metadataPathIndex, priorEvidence.metadataPathIndex],
        eventPath,
        priorProof,
        candidateProof
      )) {
        throw new Error("typed FSEvents snapshot metadata path delta is unmatched");
      }
      metadataChanged = true;
      continue;
    }
    if (priorProof !== undefined
      && candidateProof !== undefined
      && typedFseventsSameRegularSemanticProof(priorProof, candidateProof)
      && priorProof.ctimeNs !== candidateProof.ctimeNs
      && (currentEvidence.xattrPathSet.has(eventPath)
        || priorEvidence.xattrPathSet.has(eventPath))) {
      xattrCtimeChanged = true;
      if (currentEvidence.xattrPathSet.has(eventPath)) {
        matchedCurrentXattrPaths.add(eventPath);
      }
      continue;
    }
    const sourcePathIndexes = [
      currentEvidence.sourcePathIndex,
      priorEvidence.sourcePathIndex
    ];
    if (typedFseventsAnyEventPathExplainsChange(
      sourcePathIndexes,
      eventPath,
      priorProof,
      candidateProof
    ) || (sparseSourceAncestorMatching && sourcePathIndexes.some(
      (pathIndex) => typedFseventsHasIndexedAncestor(pathIndex, eventPath)
    ))) {
      sourceChanged = true;
      continue;
    }
    if (typedFseventsAnyEventPathExplainsChange(
      [currentEvidence.metadataPathIndex, priorEvidence.metadataPathIndex],
      eventPath,
      priorProof,
      candidateProof
    )) {
      metadataChanged = true;
      continue;
    }
    throw new Error("typed FSEvents snapshot source or metadata path delta is unmatched");
  }
  if (changed && classification.journalEntryCount === 0n) {
    if (typedFseventsEvidenceIsEmpty(priorEvidence)) {
      throw new Error("typed FSEvents snapshot changed without current or pending journal evidence");
    }
  }
  const relation = classification.sourceEventCount > 0n || sourceChanged
    ? "source-material"
    : classification.transactionMetadataEventCount > 0n || metadataChanged
      ? "metadata-only"
      : classification.xattrOnlyEventCount > 0n || xattrCtimeChanged
        ? "xattr-ctime-only"
        : "exact";
  return Object.freeze({
    relation,
    unmatchedCurrentXattrEventCount: classification.xattrOnlyEventCount
      - BigInt(matchedCurrentXattrPaths.size)
  });
}

/**
 * Stream and classify only the authenticated journal suffix while binding it
 * to two module-branded full-namespace snapshots. No record array is retained.
 */
export function readAndValidateJournalExtension({
  candidateSnapshot,
  endpoint,
  eventRoots,
  exactMetadataPaths = [],
  exactMetadataRoots = [],
  metadataOwnerPid = process.pid,
  priorCheckpoint,
  priorSnapshot,
  trustedGitCommonDir = null
} = {}) {
  const endpointBinding = typedFseventsValidatedAckEndpoint(
    endpoint,
    "typed FSEvents journal endpoint"
  );
  if (![2, 3].includes(endpointBinding.type)) {
    throw new Error("typed FSEvents journal extension requires FLUSH or STOP ACK");
  }
  const roots = typedFseventsOrderedEventRoots(eventRoots);
  if (!typedFseventsSameOrderedStrings(roots, endpointBinding.roots)) {
    throw new Error("typed FSEvents journal endpoint roots binding changed");
  }
  const prior = typedFseventsValidatedSnapshot(priorSnapshot, "typed FSEvents prior snapshot");
  const candidate = typedFseventsValidatedSnapshot(
    candidateSnapshot,
    "typed FSEvents candidate snapshot"
  );
  const priorSnapshotProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(prior);
  const candidateSnapshotProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(candidate);
  if (!typedFseventsSnapshotPoliciesEqual(prior, candidate)
    || !typedFseventsSameOrderedStrings(prior.roots, roots)
    || !typedFseventsSameOrderedStrings(candidate.roots, roots)) {
    throw new Error("typed FSEvents snapshot policies or ordered roots changed");
  }
  const validatedPriorCheckpoint = validatedTypedFseventsCheckpoint(
    priorCheckpoint,
    "typed FSEvents prior checkpoint",
    roots
  );
  if (TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.has(endpoint)) {
    throw new Error("typed FSEvents ACK endpoint is already consumed");
  }
  if (candidate === prior
    || TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS.has(candidate)
    || candidateSnapshotProvenance.captureOrdinal <= priorSnapshotProvenance.captureOrdinal
    || candidateSnapshotProvenance.captureOrdinal >= endpointBinding.provenanceOrdinal) {
    throw new Error("typed FSEvents candidate snapshot capture is stale or replayed");
  }
  const metadataPolicy = typedFseventsMetadataPolicy(
    exactMetadataPaths,
    exactMetadataRoots,
    roots,
    trustedGitCommonDir,
    metadataOwnerPid
  );
  const metadataPathSet = metadataPolicy.pathSet;
  const metadataRoots = metadataPolicy.roots;
  let firstDeltaEventId = null;
  let lastDeltaEventId = null;
  let sourceEventCount = 0n;
  let transactionMetadataEventCount = 0n;
  let xattrOnlyEventCount = 0n;
  const metadataEventPaths = new Set();
  const sourcePaths = new Set();
  const xattrPaths = new Set();
  const checkpoint = visitTypedFseventsJournalExtension({
    endpoint: endpointBinding.checkpoint,
    eventRoots: roots,
    journalPrefix: endpointBinding.journalPrefix,
    priorCheckpoint,
    visitor(record) {
      if (firstDeltaEventId === null) firstDeltaEventId = record.eventId;
      lastDeltaEventId = record.eventId;
      if (typedFseventsMetadataPath(record.path, metadataPathSet, metadataRoots)) {
        transactionMetadataEventCount += 1n;
        metadataEventPaths.add(record.path);
        return;
      }
      const xattrSemanticCandidate = record.flagClass === "xattr-only"
        || record.flags === 0x19000
        || record.flags === 0x19100;
      if (xattrSemanticCandidate
        && typedFseventsSameRegularSemanticProof(
          prior.lookup(record.path),
          candidate.lookup(record.path)
        )) {
        xattrOnlyEventCount += 1n;
        xattrPaths.add(record.path);
        return;
      }
      sourceEventCount += 1n;
      sourcePaths.add(record.path);
    }
  });
  if (!typedFseventsCheckpointEquals(checkpoint, endpointBinding.checkpoint)
    || checkpoint.entryCount - validatedPriorCheckpoint.entryCount !== checkpoint.deltaEntryCount
    || checkpoint.highWater - validatedPriorCheckpoint.highWater !== checkpoint.deltaHighWater) {
    throw new Error("typed FSEvents journal extension checkpoint is inconsistent");
  }
  const materialEventCount = sourceEventCount + transactionMetadataEventCount;
  const classification = Object.freeze({
    journalEntryCount: materialEventCount + xattrOnlyEventCount,
    materialEventCount,
    metadataEpochBatch: transactionMetadataEventCount > 0n,
    sourceEpochBatch: sourceEventCount > 0n,
    sourceEventCount,
    transactionMetadataEventCount,
    xattrEpochIncrement: xattrOnlyEventCount,
    xattrOnlyEventCount
  });
  if (classification.journalEntryCount !== checkpoint.deltaEntryCount) {
    throw new Error("typed FSEvents journal extension classification count is inconsistent");
  }
  const currentEvidence = typedFseventsEventEvidence({
    journalSessionFingerprint: endpointBinding.journalSessionFingerprint,
    metadataEventPaths,
    metadataPolicyFingerprint: metadataPolicy.fingerprint,
    sourcePaths,
    xattrPaths
  });
  const storedPriorEvidence = TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(prior);
  let priorEvidence = storedPriorEvidence ?? typedFseventsEventEvidence({
    journalSessionFingerprint: endpointBinding.journalSessionFingerprint,
    metadataEventPaths: [],
    metadataPolicyFingerprint: metadataPolicy.fingerprint,
    sourcePaths: [],
    xattrPaths: []
  });
  if (priorEvidence.journalSessionFingerprint !== endpointBinding.journalSessionFingerprint) {
    throw new Error("typed FSEvents pending evidence journal session changed");
  }
  if (priorEvidence.metadataPolicyFingerprint !== metadataPolicy.fingerprint) {
    if (!typedFseventsEvidenceIsEmpty(priorEvidence)) {
      throw new Error("typed FSEvents nonempty pending evidence metadata policy changed");
    }
    priorEvidence = typedFseventsEventEvidence({
      journalSessionFingerprint: endpointBinding.journalSessionFingerprint,
      metadataEventPaths: [],
      metadataPolicyFingerprint: metadataPolicy.fingerprint,
      sourcePaths: [],
      xattrPaths: []
    });
  }
  const snapshotDifference = typedFseventsSnapshotDifference({
    classification,
    currentEvidence,
    metadataPathSet,
    metadataRoots,
    priorEvidence,
    priorSnapshot: prior,
    candidateSnapshot: candidate
  });
  if (endpointBinding.type === 3
    && (sourceEventCount !== 0n || transactionMetadataEventCount !== 0n)) {
    throw new Error("typed FSEvents terminal extension contains source or metadata events");
  }
  const extension = Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    ackType: endpointBinding.type,
    sequence: endpointBinding.sequence,
    journalSessionFingerprint: endpointBinding.journalSessionFingerprint,
    metadataPolicyFingerprint: metadataPolicy.fingerprint,
    priorCheckpoint,
    checkpoint,
    deltaEntryCount: checkpoint.deltaEntryCount,
    deltaHighWater: checkpoint.deltaHighWater,
    firstDeltaEventId,
    lastDeltaEventId,
    ...typedFseventsEvidenceSummary(currentEvidence),
    snapshotSha256: candidate.sha256,
    snapshotRelation: snapshotDifference.relation,
    classification
  });
  TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.set(extension, Object.freeze({
    candidateSnapshot: candidate,
    candidateCaptureOrdinal: candidateSnapshotProvenance.captureOrdinal,
    checkpoint,
    endpointProvenanceOrdinal: endpointBinding.provenanceOrdinal,
    journalIdentity: endpointBinding.journalIdentity,
    journalSessionFingerprint: endpointBinding.journalSessionFingerprint,
    currentEvidence,
    metadataPolicyFingerprint: metadataPolicy.fingerprint,
    priorCheckpoint,
    priorEvidence,
    priorSnapshot: prior,
    unmatchedCurrentXattrEventCount: snapshotDifference.unmatchedCurrentXattrEventCount
  }));
  TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.add(endpoint);
  TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS.add(candidate);
  TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.delete(endpoint);
  return extension;
}

function typedFseventsValidatedJournalExtension(value, label) {
  if ((typeof value === "object" || typeof value === "function")
    && value !== null
    && TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.has(value)) {
    throw new Error(`${label} is already consumed`);
  }
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.has(value)) {
    throw new Error(`${label} must be a module-validated journal extension`);
  }
  return TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.get(value);
}

function typedFseventsNanoseconds(value, label) {
  return typedFseventsUint64(value, label);
}

function typedFseventsCheckedAdd(left, right, label) {
  const result = typedFseventsUint64(left, `${label} base`)
    + typedFseventsUint64(right, `${label} increment`);
  if (result > TYPED_FSEVENTS_MAX_UINT64) {
    throw new Error(`${label} exceeds UInt64`);
  }
  return result;
}

function typedFseventsAssertWithinReconciliationWindow(startedAtNs, nowNs, label) {
  const started = typedFseventsNanoseconds(startedAtNs, "typed FSEvents reconciliation start");
  const now = typedFseventsNanoseconds(nowNs, label);
  if (now < started) throw new Error(`${label} regressed before the reconciliation start`);
  if (now - started > TYPED_FSEVENTS_RECONCILIATION_MAX_DURATION_NS) {
    throw new Error(`${label} exceeded the five-minute 300000000000ns deadline`);
  }
  return now;
}

function typedFseventsEmptyCounters() {
  return Object.freeze({
    journalEntryCount: 0n,
    materialEventCount: 0n,
    sourceEventCount: 0n,
    transactionMetadataEventCount: 0n,
    xattrOnlyEventCount: 0n,
    droppedEventCount: 0n,
    unknownEventCount: 0n,
    unmatchedDeltaCount: 0n
  });
}

function typedFseventsCountersEqual(left, right) {
  return [
    "journalEntryCount",
    "materialEventCount",
    "sourceEventCount",
    "transactionMetadataEventCount",
    "xattrOnlyEventCount",
    "droppedEventCount",
    "unknownEventCount",
    "unmatchedDeltaCount"
  ].every((key) => left[key] === right[key]);
}

function typedFseventsAdvanceCounters(previousCounters, classification, checkpoint) {
  const counters = Object.freeze({
    journalEntryCount: typedFseventsCheckedAdd(
      previousCounters.journalEntryCount,
      classification.journalEntryCount,
      "typed FSEvents journal entry count"
    ),
    materialEventCount: typedFseventsCheckedAdd(
      previousCounters.materialEventCount,
      classification.materialEventCount,
      "typed FSEvents material event count"
    ),
    sourceEventCount: typedFseventsCheckedAdd(
      previousCounters.sourceEventCount,
      classification.sourceEventCount,
      "typed FSEvents source event count"
    ),
    transactionMetadataEventCount: typedFseventsCheckedAdd(
      previousCounters.transactionMetadataEventCount,
      classification.transactionMetadataEventCount,
      "typed FSEvents transaction metadata event count"
    ),
    xattrOnlyEventCount: typedFseventsCheckedAdd(
      previousCounters.xattrOnlyEventCount,
      classification.xattrOnlyEventCount,
      "typed FSEvents xattr-only event count"
    ),
    droppedEventCount: previousCounters.droppedEventCount,
    unknownEventCount: previousCounters.unknownEventCount,
    unmatchedDeltaCount: previousCounters.unmatchedDeltaCount
  });
  if (counters.sourceEventCount + counters.transactionMetadataEventCount
      !== counters.materialEventCount
    || counters.materialEventCount + counters.xattrOnlyEventCount
      !== counters.journalEntryCount
    || counters.journalEntryCount !== checkpoint.entryCount
    || counters.droppedEventCount !== 0n
    || counters.unknownEventCount !== 0n
    || counters.unmatchedDeltaCount !== 0n) {
    throw new Error("typed FSEvents cumulative event counters are inconsistent");
  }
  return counters;
}

function typedFseventsValidatedReconciliation(value, label) {
  if ((typeof value === "object" || typeof value === "function")
    && value !== null
    && TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES.has(value)) {
    throw new Error(`${label} has an active transactional fixed cycle`);
  }
  if ((typeof value === "object" || typeof value === "function")
    && value !== null
    && TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(value)) {
    throw new Error(`${label} is already consumed or stale`);
  }
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.has(value)) {
    throw new Error(`${label} must be a module-validated committed reconciliation state`);
  }
  const binding = TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.get(value);
  if (TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS.has(binding.journalSessionFingerprint)
    && !TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS.has(value)) {
    throw new Error(`${label} journal session has an active transactional fixed cycle`);
  }
  return binding;
}

/**
 * Propose exactly one immutable reconciliation transition. Successful proposal
 * construction consumes its predecessor, preventing forks and retry inflation.
 */
export function reconcileFixedPoint({
  previous,
  baseline,
  extension,
  cycleStartedAtNs,
  observedAtNs
} = {}) {
  const extensionBinding = typedFseventsValidatedJournalExtension(
    extension,
    "typed FSEvents reconciliation extension"
  );
  if (TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.has(extension)) {
    throw new Error("typed FSEvents reconciliation extension is already consumed");
  }
  if (extension.ackType !== 2) {
    throw new Error("typed FSEvents fixed-point reconciliation requires a FLUSH extension");
  }

  let predecessor = null;
  let predecessorEndpoint = null;
  let priorSnapshot;
  let priorCheckpoint;
  let priorEndpointSequence;
  let priorEndpointProvenanceOrdinal;
  let priorJournalIdentity;
  let priorJournalSessionFingerprint;
  let priorMetadataPolicyFingerprint;
  let priorPendingEvidence;
  let priorRoundCount;
  let priorConsecutiveExactRounds;
  let priorSourceEpoch;
  let priorMetadataEpoch;
  let priorXattrEpoch;
  let priorCounters;
  let priorFirstEventId;
  let startedAtNs;
  let minimumObservedAtNs;
  let cycleRestart = false;
  if (previous === null) {
    if (cycleStartedAtNs !== undefined) {
      throw new Error("typed FSEvents cycle start is only valid after a fixed point");
    }
    typedFseventsExactObjectKeys(baseline, [
      "ackEndpoint",
      "metadataEpoch",
      "snapshot",
      "sourceEpoch",
      "startedAtNs",
      "xattrEpoch"
    ], "typed FSEvents reconciliation baseline");
    const baselineEndpoint = typedFseventsValidatedAckEndpoint(
      baseline.ackEndpoint,
      "typed FSEvents reconciliation baseline ACK endpoint"
    );
    if (TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.has(baseline.ackEndpoint)) {
      throw new Error("typed FSEvents reconciliation baseline ACK endpoint is already consumed");
    }
    priorSnapshot = typedFseventsValidatedSnapshot(
      baseline.snapshot,
      "typed FSEvents reconciliation baseline snapshot"
    );
    const baselineSnapshotProvenance = STABLE_PROOF_SNAPSHOT_PROVENANCE.get(priorSnapshot);
    if (baselineEndpoint.type !== 2
      || TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS.has(priorSnapshot)
      || TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.has(priorSnapshot)
      || !typedFseventsSameOrderedStrings(priorSnapshot.roots, baselineEndpoint.roots)
      || baselineSnapshotProvenance.captureOrdinal >= baselineEndpoint.provenanceOrdinal
      || baselineEndpoint.checkpoint.entryCount !== 0n
      || baselineEndpoint.checkpoint.highWater !== 0n
      || baselineEndpoint.checkpoint.lastEventId !== null
      || baseline.sourceEpoch !== 0n
      || baseline.metadataEpoch !== 0n
      || baseline.xattrEpoch !== 0n) {
      throw new Error("typed FSEvents reconciliation baseline must be exact and empty");
    }
    predecessorEndpoint = baseline.ackEndpoint;
    priorCheckpoint = baselineEndpoint.checkpoint;
    priorEndpointSequence = baselineEndpoint.sequence;
    priorEndpointProvenanceOrdinal = baselineEndpoint.provenanceOrdinal;
    priorJournalIdentity = baselineEndpoint.journalIdentity;
    priorJournalSessionFingerprint = baselineEndpoint.journalSessionFingerprint;
    priorMetadataPolicyFingerprint = extensionBinding.metadataPolicyFingerprint;
    priorPendingEvidence = extensionBinding.priorEvidence;
    priorRoundCount = 0n;
    priorConsecutiveExactRounds = 0n;
    priorSourceEpoch = 0n;
    priorMetadataEpoch = 0n;
    priorXattrEpoch = 0n;
    priorCounters = typedFseventsEmptyCounters();
    priorFirstEventId = null;
    startedAtNs = typedFseventsNanoseconds(
      baseline.startedAtNs,
      "typed FSEvents reconciliation baseline start"
    );
    minimumObservedAtNs = startedAtNs;
  } else {
    if (baseline !== undefined) {
      throw new Error("typed FSEvents reconciliation baseline is only valid for the first round");
    }
    const previousBinding = typedFseventsValidatedReconciliation(
      previous,
      "typed FSEvents previous reconciliation state"
    );
    if (TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(previous)) {
      throw new Error("typed FSEvents previous reconciliation state is consumed or stale");
    }
    if (previous.phase === "fixed-point") {
      if (cycleStartedAtNs === undefined) {
        throw new Error("typed FSEvents fixed-point successor requires cycleStartedAtNs");
      }
      cycleRestart = true;
    } else if (previous.phase === "reconciling") {
      if (cycleStartedAtNs !== undefined) {
        throw new Error("typed FSEvents reconciling successor cannot reset its cycle start");
      }
    } else {
      throw new Error("typed FSEvents reconciliation state phase is invalid");
    }
    predecessor = previous;
    priorSnapshot = previousBinding.snapshot;
    priorCheckpoint = previousBinding.checkpoint;
    priorEndpointSequence = previousBinding.endpointSequence;
    priorEndpointProvenanceOrdinal = previousBinding.endpointProvenanceOrdinal;
    priorJournalIdentity = previousBinding.journalIdentity;
    priorJournalSessionFingerprint = previousBinding.journalSessionFingerprint;
    priorMetadataPolicyFingerprint = previousBinding.metadataPolicyFingerprint;
    priorPendingEvidence = previousBinding.pendingEvidence;
    priorRoundCount = cycleRestart ? 0n : previousBinding.roundCount;
    priorConsecutiveExactRounds = cycleRestart
      ? 0n
      : previousBinding.consecutiveExactRounds;
    priorSourceEpoch = previousBinding.sourceEpoch;
    priorMetadataEpoch = previousBinding.metadataEpoch;
    priorXattrEpoch = previousBinding.xattrEpoch;
    priorCounters = previousBinding.counters;
    priorFirstEventId = previousBinding.journalFirstEventId;
    if (cycleRestart) {
      startedAtNs = typedFseventsNanoseconds(
        cycleStartedAtNs,
        "typed FSEvents reconciliation cycle start"
      );
      if (startedAtNs < previousBinding.committedAtNs) {
        throw new Error("typed FSEvents reconciliation cycle start regressed");
      }
      minimumObservedAtNs = startedAtNs;
    } else {
      startedAtNs = previousBinding.startedAtNs;
      minimumObservedAtNs = previousBinding.committedAtNs;
    }
  }

  const observed = typedFseventsAssertWithinReconciliationWindow(
    startedAtNs,
    observedAtNs,
    "typed FSEvents reconciliation observation time"
  );
  if (observed < minimumObservedAtNs) {
    throw new Error("typed FSEvents reconciliation observation time regressed");
  }
  if (!typedFseventsSameJournalIdentity(
    extensionBinding.journalIdentity,
    priorJournalIdentity
  ) || extensionBinding.journalSessionFingerprint !== priorJournalSessionFingerprint) {
    throw new Error("typed FSEvents reconciliation journal identity changed");
  }
  const metadataPolicyChanged = extensionBinding.metadataPolicyFingerprint
    !== priorMetadataPolicyFingerprint;
  if (metadataPolicyChanged && !cycleRestart) {
    throw new Error("typed FSEvents reconciliation metadata policy changed");
  }
  if (metadataPolicyChanged && cycleRestart
    && (extension.deltaEntryCount !== 0n
      || extension.deltaHighWater !== 0n
      || extension.classification.journalEntryCount !== 0n
      || !typedFseventsEvidenceIsEmpty(extensionBinding.currentEvidence)
      || extension.snapshotRelation !== "exact"
      || extensionBinding.priorSnapshot.sha256
        !== extensionBinding.candidateSnapshot.sha256)) {
    throw new Error(
      "typed FSEvents metadata policy rebind requires a wholly empty exact extension"
    );
  }
  const reboundEmptyEvidence = cycleRestart
    && metadataPolicyChanged
    && typedFseventsEvidenceIsEmpty(priorPendingEvidence)
    && typedFseventsEvidenceIsEmpty(extensionBinding.priorEvidence);
  if ((!reboundEmptyEvidence && extensionBinding.priorEvidence !== priorPendingEvidence)
    || (previous !== null
      && TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(priorSnapshot)
        !== priorPendingEvidence)
    || (previous === null && !typedFseventsEvidenceIsEmpty(priorPendingEvidence))
    || (cycleRestart && !typedFseventsEvidenceIsEmpty(priorPendingEvidence))) {
    throw new Error("typed FSEvents reconciliation pending evidence is stale or mismatched");
  }
  if (extensionBinding.priorSnapshot !== priorSnapshot
    || extensionBinding.priorCheckpoint !== priorCheckpoint
    || extension.sequence !== typedFseventsCheckedAdd(
      priorEndpointSequence,
      1n,
      "typed FSEvents FLUSH endpoint sequence"
    )
    || extensionBinding.candidateCaptureOrdinal <= priorEndpointProvenanceOrdinal
    || extensionBinding.endpointProvenanceOrdinal <= extensionBinding.candidateCaptureOrdinal) {
    throw new Error("typed FSEvents reconciliation extension is stale or out of order");
  }
  const nextRoundCount = typedFseventsCheckedAdd(
    priorRoundCount,
    1n,
    "typed FSEvents reconciliation round count"
  );
  if (nextRoundCount > TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS) {
    throw new Error("typed FSEvents reconciliation exceeds eight rounds");
  }
  const classification = extension.classification;
  const sourceEpoch = typedFseventsCheckedAdd(
    priorSourceEpoch,
    classification.sourceEpochBatch ? 1n : 0n,
    "typed FSEvents source epoch"
  );
  const metadataEpoch = typedFseventsCheckedAdd(
    priorMetadataEpoch,
    classification.metadataEpochBatch ? 1n : 0n,
    "typed FSEvents metadata epoch"
  );
  const xattrEpoch = typedFseventsCheckedAdd(
    priorXattrEpoch,
    classification.xattrEpochIncrement,
    "typed FSEvents xattr epoch"
  );
  const counters = typedFseventsAdvanceCounters(
    priorCounters,
    classification,
    extensionBinding.checkpoint
  );
  const exactRound = extensionBinding.priorSnapshot.sha256
      === extensionBinding.candidateSnapshot.sha256
    && extension.deltaEntryCount === 0n
    && extension.deltaHighWater === 0n
    && typedFseventsEvidenceIsEmpty(priorPendingEvidence)
    && sourceEpoch === priorSourceEpoch
    && metadataEpoch === priorMetadataEpoch
    && xattrEpoch === priorXattrEpoch
    && typedFseventsCountersEqual(counters, priorCounters);
  const consecutiveExactRounds = exactRound
    ? priorConsecutiveExactRounds + 1n
    : 0n;
  if (consecutiveExactRounds > 2n) {
    throw new Error("typed FSEvents reconciliation cannot exceed two exact rounds");
  }
  const readyToSeal = consecutiveExactRounds === 2n;
  if (readyToSeal && !typedFseventsEvidenceIsEmpty(extensionBinding.currentEvidence)) {
    throw new Error("typed FSEvents fixed point retains pending event evidence");
  }
  if (nextRoundCount === TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS && !readyToSeal) {
    throw new Error("typed FSEvents eighth round did not establish the fixed point");
  }
  const journalFirstEventId = priorFirstEventId ?? extension.firstDeltaEventId;
  const journalLastEventId = extensionBinding.checkpoint.lastEventId;
  if ((counters.journalEntryCount === 0n)
      !== (journalFirstEventId === null && journalLastEventId === null)) {
    throw new Error("typed FSEvents reconciliation event-ID bounds are inconsistent");
  }
  const proposal = Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    roundCount: nextRoundCount,
    consecutiveExactRounds,
    exactRound,
    readyToSeal,
    startedAtNs,
    observedAtNs: observed,
    endpointSequence: extension.sequence,
    journalSessionFingerprint: extensionBinding.journalSessionFingerprint,
    metadataPolicyFingerprint: extensionBinding.metadataPolicyFingerprint,
    ...typedFseventsEvidenceSummary(extensionBinding.currentEvidence),
    snapshotSha256: extensionBinding.candidateSnapshot.sha256,
    checkpoint: extensionBinding.checkpoint,
    sourceEpoch,
    metadataEpoch,
    xattrEpoch,
    counters,
    journalFirstEventId,
    journalLastEventId
  });
  TYPED_FSEVENTS_RECONCILIATION_PROPOSALS.set(proposal, Object.freeze({
    checkpoint: extensionBinding.checkpoint,
    consecutiveExactRounds,
    counters,
    endpointSequence: extension.sequence,
    endpointProvenanceOrdinal: extensionBinding.endpointProvenanceOrdinal,
    journalFirstEventId,
    journalIdentity: extensionBinding.journalIdentity,
    journalSessionFingerprint: extensionBinding.journalSessionFingerprint,
    journalLastEventId,
    metadataEpoch,
    metadataPolicyFingerprint: extensionBinding.metadataPolicyFingerprint,
    pendingEvidence: extensionBinding.currentEvidence,
    observedAtNs: observed,
    readyToSeal,
    roundCount: nextRoundCount,
    snapshot: extensionBinding.candidateSnapshot,
    sourceEpoch,
    startedAtNs,
    xattrEpoch
  }));
  TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.add(extension);
  TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.delete(extension);
  if (predecessor === null) {
    TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.add(predecessorEndpoint);
    TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS.add(priorSnapshot);
    TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.delete(predecessorEndpoint);
  } else {
    TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.add(predecessor);
    TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.delete(predecessor);
    TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.delete(priorSnapshot);
  }
  return proposal;
}

/** Commit one branded reconciliation proposal exactly once. */
export function commitReconciliation({ proposal, committedAtNs } = {}) {
  if ((typeof proposal === "object" || typeof proposal === "function")
    && proposal !== null
    && TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS.has(proposal)) {
    throw new Error("typed FSEvents reconciliation proposal is already consumed");
  }
  if ((typeof proposal !== "object" && typeof proposal !== "function")
    || proposal === null
    || !TYPED_FSEVENTS_RECONCILIATION_PROPOSALS.has(proposal)) {
    throw new Error("typed FSEvents proposal must be module-validated");
  }
  if (TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS.has(proposal)) {
    throw new Error("typed FSEvents reconciliation proposal is already consumed");
  }
  const binding = TYPED_FSEVENTS_RECONCILIATION_PROPOSALS.get(proposal);
  const committed = typedFseventsAssertWithinReconciliationWindow(
    binding.startedAtNs,
    committedAtNs,
    "typed FSEvents reconciliation commit time"
  );
  if (committed < binding.observedAtNs) {
    throw new Error("typed FSEvents reconciliation commit time regressed");
  }
  const phase = binding.readyToSeal ? "fixed-point" : "reconciling";
  const state = Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    phase,
    roundCount: binding.roundCount,
    consecutiveExactRounds: binding.consecutiveExactRounds,
    startedAtNs: binding.startedAtNs,
    observedAtNs: binding.observedAtNs,
    committedAtNs: committed,
    endpointSequence: binding.endpointSequence,
    journalSessionFingerprint: binding.journalSessionFingerprint,
    metadataPolicyFingerprint: binding.metadataPolicyFingerprint,
    ...typedFseventsEvidenceSummary(binding.pendingEvidence),
    snapshotSha256: binding.snapshot.sha256,
    checkpoint: binding.checkpoint,
    sourceEpoch: binding.sourceEpoch,
    metadataEpoch: binding.metadataEpoch,
    xattrEpoch: binding.xattrEpoch,
    counters: binding.counters,
    journalFirstEventId: binding.journalFirstEventId,
    journalLastEventId: binding.journalLastEventId
  });
  TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.set(state, Object.freeze({
    checkpoint: binding.checkpoint,
    committedAtNs: committed,
    consecutiveExactRounds: binding.consecutiveExactRounds,
    counters: binding.counters,
    endpointSequence: binding.endpointSequence,
    endpointProvenanceOrdinal: binding.endpointProvenanceOrdinal,
    journalFirstEventId: binding.journalFirstEventId,
    journalIdentity: binding.journalIdentity,
    journalSessionFingerprint: binding.journalSessionFingerprint,
    journalLastEventId: binding.journalLastEventId,
    metadataEpoch: binding.metadataEpoch,
    metadataPolicyFingerprint: binding.metadataPolicyFingerprint,
    pendingEvidence: binding.pendingEvidence,
    roundCount: binding.roundCount,
    snapshot: binding.snapshot,
    sourceEpoch: binding.sourceEpoch,
    startedAtNs: binding.startedAtNs,
    xattrEpoch: binding.xattrEpoch
  }));
  TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.set(binding.snapshot, binding.pendingEvidence);
  TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS.add(proposal);
  TYPED_FSEVENTS_RECONCILIATION_PROPOSALS.delete(proposal);
  return state;
}

function typedFseventsValidateTerminalAttestation(value, expected) {
  typedFseventsExactObjectKeys(value, [
    "checkpoint",
    "counters",
    "endpointSequence",
    "journalFirstEventId",
    "journalLastEventId",
    "journalSessionFingerprint",
    "metadataEpoch",
    "metadataPolicyFingerprint",
    "pendingEvidenceFingerprint",
    "pendingMetadataPathCount",
    "pendingSourcePathCount",
    "pendingXattrPathCount",
    "roundCount",
    "schemaVersion",
    "snapshotSha256",
    "sourceEpoch",
    "xattrEpoch"
  ], "typed FSEvents terminal attestation");
  typedFseventsExactObjectKeys(value.checkpoint, [
    "entryCount", "highWater", "lastEventId", "sha256"
  ], "typed FSEvents terminal attestation checkpoint");
  typedFseventsExactObjectKeys(value.counters, [
    "droppedEventCount",
    "journalEntryCount",
    "materialEventCount",
    "sourceEventCount",
    "transactionMetadataEventCount",
    "unknownEventCount",
    "unmatchedDeltaCount",
    "xattrOnlyEventCount"
  ], "typed FSEvents terminal attestation counters");
  const checkpoint = typedFseventsCheckpoint(
    value.checkpoint,
    "typed FSEvents terminal attestation checkpoint"
  );
  const counters = Object.fromEntries(Object.entries(value.counters).map(([key, item]) => [
    key,
    typedFseventsUint64(item, `typed FSEvents terminal attestation ${key}`)
  ]));
  const journalFirstEventId = value.journalFirstEventId === null
    ? null
    : typedFseventsUint64(
      value.journalFirstEventId,
      "typed FSEvents terminal attestation first event ID"
    );
  const journalLastEventId = value.journalLastEventId === null
    ? null
    : typedFseventsUint64(
      value.journalLastEventId,
      "typed FSEvents terminal attestation last event ID"
    );
  if (value.schemaVersion !== TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION
    || typeof value.journalSessionFingerprint !== "string"
    || !SHA256_PATTERN.test(value.journalSessionFingerprint)
    || typeof value.metadataPolicyFingerprint !== "string"
    || !SHA256_PATTERN.test(value.metadataPolicyFingerprint)
    || typeof value.pendingEvidenceFingerprint !== "string"
    || !SHA256_PATTERN.test(value.pendingEvidenceFingerprint)
    || typeof value.snapshotSha256 !== "string"
    || !SHA256_PATTERN.test(value.snapshotSha256)) {
    throw new Error("typed FSEvents terminal attestation schema or fingerprints are invalid");
  }
  const normalized = {
    checkpoint,
    counters,
    endpointSequence: typedFseventsUint64(
      value.endpointSequence,
      "typed FSEvents terminal attestation endpoint sequence"
    ),
    journalFirstEventId,
    journalLastEventId,
    journalSessionFingerprint: value.journalSessionFingerprint,
    metadataEpoch: typedFseventsUint64(
      value.metadataEpoch,
      "typed FSEvents terminal attestation metadata epoch"
    ),
    metadataPolicyFingerprint: value.metadataPolicyFingerprint,
    pendingEvidenceFingerprint: value.pendingEvidenceFingerprint,
    pendingMetadataPathCount: typedFseventsUint64(
      value.pendingMetadataPathCount,
      "typed FSEvents terminal attestation pending metadata path count"
    ),
    pendingSourcePathCount: typedFseventsUint64(
      value.pendingSourcePathCount,
      "typed FSEvents terminal attestation pending source path count"
    ),
    pendingXattrPathCount: typedFseventsUint64(
      value.pendingXattrPathCount,
      "typed FSEvents terminal attestation pending xattr path count"
    ),
    roundCount: typedFseventsUint64(
      value.roundCount,
      "typed FSEvents terminal attestation round count"
    ),
    snapshotSha256: value.snapshotSha256,
    sourceEpoch: typedFseventsUint64(
      value.sourceEpoch,
      "typed FSEvents terminal attestation source epoch"
    ),
    xattrEpoch: typedFseventsUint64(
      value.xattrEpoch,
      "typed FSEvents terminal attestation xattr epoch"
    )
  };
  if (!typedFseventsCheckpointEquals(normalized.checkpoint, expected.checkpoint)
    || normalized.endpointSequence !== expected.endpointSequence
    || normalized.journalFirstEventId !== expected.journalFirstEventId
    || normalized.journalLastEventId !== expected.journalLastEventId
    || normalized.journalSessionFingerprint !== expected.journalSessionFingerprint
    || normalized.sourceEpoch !== expected.sourceEpoch
    || normalized.metadataEpoch !== expected.metadataEpoch
    || normalized.metadataPolicyFingerprint !== expected.metadataPolicyFingerprint
    || normalized.pendingEvidenceFingerprint !== expected.pendingEvidenceFingerprint
    || normalized.pendingMetadataPathCount !== expected.pendingMetadataPathCount
    || normalized.pendingSourcePathCount !== expected.pendingSourcePathCount
    || normalized.pendingXattrPathCount !== expected.pendingXattrPathCount
    || normalized.roundCount !== expected.roundCount
    || normalized.snapshotSha256 !== expected.snapshotSha256
    || normalized.xattrEpoch !== expected.xattrEpoch
    || !typedFseventsCountersEqual(normalized.counters, expected.counters)) {
    throw new Error("typed FSEvents terminal attestation does not match the sealed state");
  }
}

/** Seal a fixed point with one strict STOP extension and exact attestation. */
export function sealTerminal({
  reconciliation,
  terminalExtension,
  terminalAttestation,
  sealedAtNs
} = {}) {
  const reconciliationBinding = typedFseventsValidatedReconciliation(
    reconciliation,
    "typed FSEvents terminal reconciliation"
  );
  if (TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(reconciliation)) {
    throw new Error("typed FSEvents reconciliation is already consumed or sealed");
  }
  if (reconciliation.phase !== "fixed-point"
    || reconciliationBinding.consecutiveExactRounds !== 2n) {
    throw new Error("typed FSEvents terminal seal requires a two-round fixed point");
  }
  if (!typedFseventsEvidenceIsEmpty(reconciliationBinding.pendingEvidence)
    || TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(reconciliationBinding.snapshot)
      !== reconciliationBinding.pendingEvidence) {
    throw new Error("typed FSEvents terminal seal retains pending event evidence");
  }
  const extensionBinding = typedFseventsValidatedJournalExtension(
    terminalExtension,
    "typed FSEvents terminal extension"
  );
  if (TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.has(terminalExtension)) {
    throw new Error("typed FSEvents terminal extension is already consumed");
  }
  if (!typedFseventsSameJournalIdentity(
    extensionBinding.journalIdentity,
    reconciliationBinding.journalIdentity
  ) || extensionBinding.journalSessionFingerprint
      !== reconciliationBinding.journalSessionFingerprint) {
    throw new Error("typed FSEvents terminal journal identity changed");
  }
  if (extensionBinding.metadataPolicyFingerprint
      !== reconciliationBinding.metadataPolicyFingerprint) {
    throw new Error("typed FSEvents terminal metadata policy changed");
  }
  if (terminalExtension.ackType !== 3
    || extensionBinding.priorSnapshot !== reconciliationBinding.snapshot
    || extensionBinding.priorCheckpoint !== reconciliationBinding.checkpoint
    || extensionBinding.priorEvidence !== reconciliationBinding.pendingEvidence
    || terminalExtension.sequence <= reconciliationBinding.endpointSequence
    || extensionBinding.candidateCaptureOrdinal
      <= reconciliationBinding.endpointProvenanceOrdinal
    || extensionBinding.endpointProvenanceOrdinal
      <= extensionBinding.candidateCaptureOrdinal) {
    throw new Error("typed FSEvents terminal extension is stale or out of order");
  }
  const classification = terminalExtension.classification;
  if (classification.sourceEventCount !== 0n
    || classification.transactionMetadataEventCount !== 0n
    || classification.materialEventCount !== 0n
    || extensionBinding.unmatchedCurrentXattrEventCount !== 0n
    || !["exact", "xattr-ctime-only"].includes(terminalExtension.snapshotRelation)) {
    throw new Error("typed FSEvents terminal seal contains source metadata or semantic change");
  }
  const sealed = typedFseventsAssertWithinReconciliationWindow(
    reconciliationBinding.startedAtNs,
    sealedAtNs,
    "typed FSEvents terminal seal time"
  );
  if (sealed < reconciliationBinding.committedAtNs) {
    throw new Error("typed FSEvents terminal seal time regressed");
  }
  const sourceEpoch = reconciliationBinding.sourceEpoch;
  const metadataEpoch = reconciliationBinding.metadataEpoch;
  const xattrEpoch = typedFseventsCheckedAdd(
    reconciliationBinding.xattrEpoch,
    classification.xattrEpochIncrement,
    "typed FSEvents terminal xattr epoch"
  );
  const counters = typedFseventsAdvanceCounters(
    reconciliationBinding.counters,
    classification,
    extensionBinding.checkpoint
  );
  const journalFirstEventId = reconciliationBinding.journalFirstEventId
    ?? terminalExtension.firstDeltaEventId;
  const journalLastEventId = extensionBinding.checkpoint.lastEventId;
  if ((counters.journalEntryCount === 0n)
      !== (journalFirstEventId === null && journalLastEventId === null)) {
    throw new Error("typed FSEvents terminal event-ID bounds are inconsistent");
  }
  typedFseventsValidateTerminalAttestation(terminalAttestation, {
    checkpoint: extensionBinding.checkpoint,
    counters,
    endpointSequence: terminalExtension.sequence,
    journalFirstEventId,
    journalLastEventId,
    journalSessionFingerprint: reconciliationBinding.journalSessionFingerprint,
    metadataEpoch,
    metadataPolicyFingerprint: reconciliationBinding.metadataPolicyFingerprint,
    ...typedFseventsEvidenceSummary(reconciliationBinding.pendingEvidence),
    roundCount: reconciliationBinding.roundCount,
    snapshotSha256: extensionBinding.candidateSnapshot.sha256,
    sourceEpoch,
    xattrEpoch
  });
  const terminalSeal = Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    phase: "sealed",
    sealedAtNs: sealed,
    startedAtNs: reconciliationBinding.startedAtNs,
    roundCount: reconciliationBinding.roundCount,
    endpointSequence: terminalExtension.sequence,
    journalSessionFingerprint: reconciliationBinding.journalSessionFingerprint,
    metadataPolicyFingerprint: reconciliationBinding.metadataPolicyFingerprint,
    ...typedFseventsEvidenceSummary(reconciliationBinding.pendingEvidence),
    snapshotSha256: extensionBinding.candidateSnapshot.sha256,
    checkpoint: extensionBinding.checkpoint,
    sourceEpoch,
    metadataEpoch,
    xattrEpoch,
    counters,
    journalFirstEventId,
    journalLastEventId
  });
  TYPED_FSEVENTS_TERMINAL_SEALS.add(terminalSeal);
  TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.add(reconciliation);
  TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.add(terminalExtension);
  TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.delete(reconciliation);
  TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.delete(reconciliationBinding.snapshot);
  TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.delete(terminalExtension);
  return terminalSeal;
}

function typedFseventsForkPublishedReconciliation(reconciliation, binding) {
  if (TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(reconciliation)
    || TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.get(reconciliation) !== binding
    || TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(binding.snapshot)
      !== binding.pendingEvidence) {
    throw new Error("typed FSEvents transactional predecessor cannot be forked from stale bindings");
  }
  const fork = Object.freeze({ ...reconciliation });
  TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.set(fork, binding);
  TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS.add(fork);
  return fork;
}

function typedFseventsRestorePublishedReconciliation(reconciliation, binding) {
  if (TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(reconciliation)
    || TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.get(reconciliation) !== binding) {
    throw new Error("typed FSEvents transactional predecessor cannot be restored from stale bindings");
  }
  TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.set(binding.snapshot, binding.pendingEvidence);
}

function typedFseventsConsumePublishedReconciliation(reconciliation, binding) {
  if (!TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES.has(reconciliation)
    || TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.has(reconciliation)
    || TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.get(reconciliation) !== binding
    || TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(binding.snapshot)
      !== binding.pendingEvidence) {
    throw new Error("typed FSEvents transactional predecessor binding changed");
  }
  TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.add(reconciliation);
  TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.delete(reconciliation);
  TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.delete(binding.snapshot);
}

function typedFseventsInvalidateFixedCycleArtifacts({
  endpoints,
  extensions,
  proposals,
  reconciliations
}) {
  for (const item of reconciliations) {
    TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS.delete(item.reconciliation);
    TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS.add(item.reconciliation);
    TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.delete(item.reconciliation);
    if (TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.get(item.binding.snapshot)
      === item.binding.pendingEvidence) {
      TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE.delete(item.binding.snapshot);
    }
  }
  for (const proposal of proposals) {
    TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS.add(proposal);
    TYPED_FSEVENTS_RECONCILIATION_PROPOSALS.delete(proposal);
  }
  for (const extension of extensions) {
    TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS.add(extension);
    TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS.delete(extension);
  }
  for (const endpoint of endpoints) {
    TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS.add(endpoint);
    TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS.delete(endpoint);
  }
}

function typedFseventsPublishFixedCyclePackage({ checkpoint, reconciliation, snapshot }) {
  const fixedPackage = Object.freeze({ checkpoint, reconciliation, snapshot });
  TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES.set(fixedPackage, Object.freeze({
    checkpoint,
    reconciliation,
    snapshot
  }));
  return fixedPackage;
}

function typedFseventsValidatedFixedCyclePackage(value, label) {
  if ((typeof value !== "object" && typeof value !== "function")
    || value === null
    || !TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES.has(value)) {
    throw new Error(`${label} must be an exact module-published fixed-cycle package`);
  }
  return TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES.get(value);
}

/**
 * Drive one complete FLUSH reconciliation cycle without exposing a partial
 * reconciliation. The initial path consumes an already captured and
 * normalized empty baseline; a later path consumes the exact package returned
 * by an earlier successful cycle. Each round captures before requesting FLUSH.
 */
export function runTypedFseventsFixedCycle({
  baseline,
  captureSnapshot,
  eventRoots,
  exactMetadataPaths = [],
  exactMetadataRoots = [],
  flushAcknowledgement,
  metadataOwnerPid = process.pid,
  nowNs,
  previous = null,
  trustedGitCommonDir = null
} = {}) {
  if (typeof captureSnapshot !== "function"
    || typeof flushAcknowledgement !== "function"
    || typeof nowNs !== "function"
    || !Array.isArray(exactMetadataPaths)
    || !Array.isArray(exactMetadataRoots)
    || !Number.isSafeInteger(metadataOwnerPid)
    || metadataOwnerPid <= 1) {
    throw new Error("typed FSEvents fixed-cycle callbacks are invalid");
  }
  const roots = Object.freeze([...typedFseventsOrderedEventRoots(eventRoots)]);
  const metadataPaths = Object.freeze([...exactMetadataPaths]);
  const metadataRoots = Object.freeze([...exactMetadataRoots]);
  const initialCycle = previous === null;
  if (initialCycle === (baseline === undefined || baseline === null)) {
    throw new Error(
      "typed FSEvents fixed cycle requires exactly one initial baseline or previous package"
    );
  }

  let reconciliation = null;
  let priorCheckpoint;
  let priorSnapshot;
  let cycleStartedAtNs;
  let reconciliationBaseline;
  let publishedPredecessor = null;
  let publishedPredecessorBinding = null;
  let transactionActive = false;
  let transactionSessionFingerprint;
  let transactionSessionActive = false;
  const artifacts = {
    endpoints: [],
    extensions: [],
    proposals: [],
    reconciliations: []
  };
  if (initialCycle) {
    typedFseventsExactObjectKeys(baseline, [
      "ackEndpoint",
      "metadataEpoch",
      "snapshot",
      "sourceEpoch",
      "startedAtNs",
      "xattrEpoch"
    ], "typed FSEvents fixed-cycle baseline");
    const baselineEndpoint = typedFseventsValidatedAckEndpoint(
      baseline.ackEndpoint,
      "typed FSEvents fixed-cycle baseline ACK endpoint"
    );
    priorSnapshot = typedFseventsValidatedSnapshot(
      baseline.snapshot,
      "typed FSEvents fixed-cycle baseline snapshot"
    );
    if (baseline.ackEndpoint.checkpoint !== baselineEndpoint.checkpoint) {
      throw new Error("typed FSEvents fixed-cycle baseline checkpoint binding changed");
    }
    if (baselineEndpoint.type !== 2
      || baselineEndpoint.checkpoint.entryCount !== 0n
      || baselineEndpoint.checkpoint.highWater !== 0n
      || baselineEndpoint.checkpoint.lastEventId !== null
      || baseline.sourceEpoch !== 0n
      || baseline.metadataEpoch !== 0n
      || baseline.xattrEpoch !== 0n
      || !typedFseventsSameOrderedStrings(priorSnapshot.roots, roots)) {
      throw new Error("typed FSEvents fixed-cycle baseline must be exact and empty");
    }
    typedFseventsNanoseconds(
      baseline.startedAtNs,
      "typed FSEvents fixed-cycle baseline start"
    );
    reconciliationBaseline = Object.freeze({ ...baseline });
    priorCheckpoint = baselineEndpoint.checkpoint;
    transactionSessionFingerprint = baselineEndpoint.journalSessionFingerprint;
  } else {
    const previousPackageBinding = typedFseventsValidatedFixedCyclePackage(
      previous,
      "typed FSEvents previous fixed-cycle package"
    );
    typedFseventsExactObjectKeys(previous, [
      "checkpoint", "reconciliation", "snapshot"
    ], "typed FSEvents previous fixed-cycle package");
    const previousBinding = typedFseventsValidatedReconciliation(
      previousPackageBinding.reconciliation,
      "typed FSEvents previous fixed-cycle reconciliation"
    );
    priorSnapshot = typedFseventsValidatedSnapshot(
      previousPackageBinding.snapshot,
      "typed FSEvents previous fixed-cycle snapshot"
    );
    if (previous.checkpoint !== previousPackageBinding.checkpoint
      || previous.reconciliation !== previousPackageBinding.reconciliation
      || previous.snapshot !== previousPackageBinding.snapshot
      || previousPackageBinding.reconciliation.phase !== "fixed-point"
      || previousBinding.snapshot !== priorSnapshot
      || previousBinding.checkpoint !== previousPackageBinding.checkpoint
      || !typedFseventsSameOrderedStrings(priorSnapshot.roots, roots)) {
      throw new Error("typed FSEvents previous fixed-cycle package is not exact");
    }
    publishedPredecessor = previousPackageBinding.reconciliation;
    publishedPredecessorBinding = previousBinding;
    priorCheckpoint = previousPackageBinding.checkpoint;
    transactionSessionFingerprint = previousBinding.journalSessionFingerprint;
  }

  try {
    if (TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS.has(transactionSessionFingerprint)) {
      throw new Error("typed FSEvents journal session has an active transactional fixed cycle");
    }
    TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS.add(transactionSessionFingerprint);
    transactionSessionActive = true;
    if (publishedPredecessor !== null) {
      TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES.add(publishedPredecessor);
      transactionActive = true;
      reconciliation = typedFseventsForkPublishedReconciliation(
        publishedPredecessor,
        publishedPredecessorBinding
      );
      artifacts.reconciliations.push({
        binding: publishedPredecessorBinding,
        reconciliation
      });
      cycleStartedAtNs = typedFseventsNanoseconds(
        nowNs("cycle-start"),
        "typed FSEvents fixed-cycle start"
      );
    }
    for (let round = 1; round <= Number(TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS); round += 1) {
      const candidateSnapshot = captureSnapshot(Object.freeze({
        priorCheckpoint,
        priorSnapshot,
        round
      }));
      const acknowledgement = flushAcknowledgement(Object.freeze({
        candidateSnapshot,
        priorCheckpoint,
        priorSnapshot,
        round
      }));
      const endpoint = normalizeTypedFseventsAckCheckpoint({
        acknowledgement,
        eventRoots: roots
      });
      artifacts.endpoints.push(endpoint);
      const extension = readAndValidateJournalExtension({
        candidateSnapshot,
        endpoint,
        eventRoots: roots,
        exactMetadataPaths: metadataPaths,
        exactMetadataRoots: metadataRoots,
        metadataOwnerPid,
        priorCheckpoint,
        priorSnapshot,
        trustedGitCommonDir
      });
      artifacts.extensions.push(extension);
      const proposal = reconcileFixedPoint({
        previous: reconciliation,
        ...(reconciliation === null ? { baseline: reconciliationBaseline } : {}),
        ...(reconciliation !== null && reconciliation.phase === "fixed-point"
          ? { cycleStartedAtNs }
          : {}),
        extension,
        observedAtNs: nowNs("round-observed")
      });
      artifacts.proposals.push(proposal);
      if (transactionActive) {
        typedFseventsRestorePublishedReconciliation(
          publishedPredecessor,
          publishedPredecessorBinding
        );
      }
      const committed = commitReconciliation({
        proposal,
        committedAtNs: nowNs("round-committed")
      });
      const committedBinding = TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS.get(committed);
      TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS.add(committed);
      artifacts.reconciliations.push({ binding: committedBinding, reconciliation: committed });
      if (committed.phase === "fixed-point") {
        if (transactionActive) {
          typedFseventsConsumePublishedReconciliation(
            publishedPredecessor,
            publishedPredecessorBinding
          );
        }
        return typedFseventsPublishFixedCyclePackage({
          checkpoint: extension.checkpoint,
          reconciliation: committed,
          snapshot: candidateSnapshot
        });
      }
      reconciliation = committed;
      priorCheckpoint = extension.checkpoint;
      priorSnapshot = candidateSnapshot;
    }
    throw new Error("typed FSEvents fixed cycle did not establish a fixed point in eight rounds");
  } catch (error) {
    typedFseventsInvalidateFixedCycleArtifacts(artifacts);
    if (transactionActive) {
      typedFseventsRestorePublishedReconciliation(
        publishedPredecessor,
        publishedPredecessorBinding
      );
    }
    throw error;
  } finally {
    for (const item of artifacts.reconciliations) {
      TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS.delete(item.reconciliation);
    }
    if (transactionActive) {
      TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES.delete(publishedPredecessor);
    }
    if (transactionSessionActive) {
      TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS.delete(transactionSessionFingerprint);
    }
  }
}

// Assemble the reviewed snapshot/ACK/reconciliation closure exclusively from
// functions and constants already loaded in this process. The detached child
// never imports or rereads this mutable workspace module.
const TYPED_FSEVENTS_RECONCILIATION_CHILD_SOURCE = [
  `const TRANSACTION_METADATA_PATHS = Object.freeze(${JSON.stringify(TRANSACTION_METADATA_PATHS)});`,
  `const SHA256_PATTERN = ${SHA256_PATTERN};`,
  `const UUID_PATTERN = ${UUID_PATTERN};`,
  `const UINT64_DECIMAL_PATTERN = ${UINT64_DECIMAL_PATTERN};`,
  `const TYPED_FSEVENTS_MAX_BUFFER_BYTES = ${TYPED_FSEVENTS_MAX_BUFFER_BYTES};`,
  `const TYPED_FSEVENTS_KNOWN_FLAG_MASK = ${TYPED_FSEVENTS_KNOWN_FLAG_MASK};`,
  `const TYPED_FSEVENTS_FATAL_FLAG_MASK = ${TYPED_FSEVENTS_FATAL_FLAG_MASK};`,
  `const TYPED_FSEVENTS_EXACT_XATTR_ONLY_FLAGS = ${TYPED_FSEVENTS_EXACT_XATTR_ONLY_FLAGS};`,
  `const TYPED_FSEVENTS_JOURNAL_HEADER_BYTES = ${TYPED_FSEVENTS_JOURNAL_HEADER_BYTES};`,
  `const TYPED_FSEVENTS_MAX_JOURNAL_BYTES = ${TYPED_FSEVENTS_MAX_JOURNAL_BYTES};`,
  `const TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES = ${TYPED_FSEVENTS_MAX_JOURNAL_ENTRIES}n;`,
  `const TYPED_FSEVENTS_MAX_EVENT_PATH_BYTES = ${TYPED_FSEVENTS_MAX_EVENT_PATH_BYTES};`,
  `const TYPED_FSEVENTS_MAX_RECORD_BYTES = ${TYPED_FSEVENTS_MAX_RECORD_BYTES};`,
  `const TYPED_FSEVENTS_MAX_UINT64 = ${TYPED_FSEVENTS_MAX_UINT64}n;`,
  "const TYPED_FSEVENTS_VALIDATED_CHECKPOINTS = new WeakMap();",
  "let TYPED_FSEVENTS_PROVENANCE_ORDINAL = 0n;",
  "const TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS = new WeakMap();",
  "const TYPED_FSEVENTS_VALIDATED_ACK_ENDPOINTS = new WeakMap();",
  "const TYPED_FSEVENTS_VALIDATED_JOURNAL_EXTENSIONS = new WeakMap();",
  "const TYPED_FSEVENTS_RECONCILIATION_PROPOSALS = new WeakMap();",
  "const TYPED_FSEVENTS_COMMITTED_RECONCILIATIONS = new WeakMap();",
  "const TYPED_FSEVENTS_PENDING_SNAPSHOT_EVIDENCE = new WeakMap();",
  "const TYPED_FSEVENTS_TERMINAL_SEALS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_ACKNOWLEDGEMENTS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_ACK_ENDPOINTS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_CANDIDATE_SNAPSHOTS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_JOURNAL_EXTENSIONS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_RECONCILIATION_PROPOSALS = new WeakSet();",
  "const TYPED_FSEVENTS_CONSUMED_RECONCILIATIONS = new WeakSet();",
  "const TYPED_FSEVENTS_ACTIVE_FIXED_CYCLES = new WeakSet();",
  "const TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS = new Set();",
  "const TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS = new WeakSet();",
  "const TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES = new WeakMap();",
  "const TYPED_FSEVENTS_NORMALIZED_ACK_PUBLICATIONS = new Set();",
  `const TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION = ${TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION};`,
  `const TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS = ${TYPED_FSEVENTS_RECONCILIATION_MAX_ROUNDS}n;`,
  `const TYPED_FSEVENTS_RECONCILIATION_MAX_DURATION_NS = ${TYPED_FSEVENTS_RECONCILIATION_MAX_DURATION_NS}n;`,
  `const TYPED_FSEVENTS_REGULAR_SEMANTIC_FIELDS = Object.freeze(${JSON.stringify(TYPED_FSEVENTS_REGULAR_SEMANTIC_FIELDS)});`,
  `const STABLE_PROOF_SNAPSHOT_SCHEMA_VERSION = ${STABLE_PROOF_SNAPSHOT_SCHEMA_VERSION};`,
  `const STABLE_PROOF_MAX_PATHS = ${STABLE_PROOF_MAX_PATHS};`,
  `const STABLE_PROOF_MAX_POLICIES = ${STABLE_PROOF_MAX_POLICIES};`,
  `const STABLE_PROOF_MAX_TRACKED_PATHS = ${STABLE_PROOF_MAX_TRACKED_PATHS};`,
  `const STABLE_PROOF_MAX_DEPTH = ${STABLE_PROOF_MAX_DEPTH};`,
  `const STABLE_PROOF_MAX_PATH_BYTES = ${STABLE_PROOF_MAX_PATH_BYTES};`,
  `const STABLE_PROOF_MAX_POLICY_BYTES = ${STABLE_PROOF_MAX_POLICY_BYTES};`,
  `const STABLE_PROOF_MAX_NAMESPACE_PATH_BYTES = ${STABLE_PROOF_MAX_NAMESPACE_PATH_BYTES};`,
  `const STABLE_PROOF_MAX_FILE_BYTES = ${STABLE_PROOF_MAX_FILE_BYTES};`,
  `const STABLE_PROOF_MAX_TOTAL_BYTES = ${STABLE_PROOF_MAX_TOTAL_BYTES};`,
  `const STABLE_PROOF_MAX_SYMLINK_TARGET_BYTES = ${STABLE_PROOF_MAX_SYMLINK_TARGET_BYTES};`,
  `const STABLE_PROOF_MAX_TOTAL_SYMLINK_BYTES = ${STABLE_PROOF_MAX_TOTAL_SYMLINK_BYTES};`,
  `const STABLE_PROOF_MAX_DIRECTORY_NAME_BYTES = ${STABLE_PROOF_MAX_DIRECTORY_NAME_BYTES};`,
  `const STABLE_PROOF_HELPER_MAX_BUFFER_BYTES = ${STABLE_PROOF_HELPER_MAX_BUFFER_BYTES};`,
  `const STABLE_PROOF_HELPER_MAX_PEAK_RSS_BYTES = ${STABLE_PROOF_HELPER_MAX_PEAK_RSS_BYTES};`,
  `const STABLE_PROOF_HELPER_MAX_OPEN_FDS = ${STABLE_PROOF_HELPER_MAX_OPEN_FDS};`,
  `const STABLE_PROOF_HELPER_TIMEOUT_MS = ${STABLE_PROOF_HELPER_TIMEOUT_MS};`,
  `const GIT_CURRENTNESS_CAPTURE_MODE = ${JSON.stringify(GIT_CURRENTNESS_CAPTURE_MODE)};`,
  `const FULL_NAMESPACE_CAPTURE_MODE = ${JSON.stringify(FULL_NAMESPACE_CAPTURE_MODE)};`,
  `const GIT_CURRENTNESS_SCOPE_TIMEOUT_MS = ${GIT_CURRENTNESS_SCOPE_TIMEOUT_MS};`,
  `const GIT_CURRENTNESS_GIT_TIMEOUT_MS = ${GIT_CURRENTNESS_GIT_TIMEOUT_MS};`,
  `const TYPED_FSEVENTS_ACK_TIMEOUT_MS = ${TYPED_FSEVENTS_ACK_TIMEOUT_MS};`,
  "const STABLE_PROOF_VALIDATED_SNAPSHOTS = new WeakSet();",
  "const STABLE_PROOF_SNAPSHOT_PROVENANCE = new WeakMap();",
  "const GIT_CURRENTNESS_PROOF_SCOPES = new WeakMap();",
  `const STABLE_PROOF_OBSERVATION_FIELDS = Object.freeze(${JSON.stringify(STABLE_PROOF_OBSERVATION_FIELDS)});`,
  `const STABLE_PROOF_HOOK_KEYS = Object.freeze(${JSON.stringify(STABLE_PROOF_HOOK_KEYS)});`,
  `const STABLE_PROOF_DESCRIPTOR_WALKER = ${JSON.stringify(STABLE_PROOF_DESCRIPTOR_WALKER)};`,
  sha256Buffer,
  typedFseventsNextProvenanceOrdinal,
  classifyTypedFseventsFlags,
  typedFseventsUint64,
  typedFseventsCheckpoint,
  typedFseventsRootBinding,
  markTypedFseventsCheckpoint,
  validatedTypedFseventsCheckpoint,
  createEmptyTypedFseventsJournalCheckpoint,
  typedFseventsCanonicalAbsolutePath,
  typedFseventsCanonicalPathSet,
  typedFseventsPathIsWithin,
  walkTypedFseventsJournalExtension,
  visitTypedFseventsJournalExtension,
  parseTypedFseventsJournalPrefix,
  typedFseventsDirectRegularProof,
  typedFseventsSameRegularSemanticProof,
  stableProofByteOrder,
  stableProofCanonicalRoot,
  stableProofTrackedRelativePath,
  stableProofHooks,
  stableProofExactKeys,
  stableProofFreezeProof,
  stableProofRunDescriptorWalker,
  stableProofBuildSnapshot,
  stableProofInvokeHooks,
  stableProofNormalizePolicies,
  captureStableProofSnapshot,
  gitCurrentnessPathIsWithin,
  gitCurrentnessGitBuffer,
  gitCurrentnessGitPath,
  gitCurrentnessStatusPaths,
  gitCurrentnessAddExistingLeaf,
  gitCurrentnessAddTreeLeaves,
  gitCurrentnessControlLeaves,
  createGitCurrentnessProofScope,
  captureGitCurrentnessProofSnapshot,
  decideTypedFseventsAcknowledgementWait,
  sameTypedFseventsFrameSnapshot,
  secureTypedFseventsFrame,
  secureTypedFseventsJournal,
  sameTypedFseventsJournalIdentity,
  readTypedFseventsPrefix,
  readStableRegularFileNoFollow,
  readCommittedTypedFseventsAcknowledgement,
  typedFseventsExactObjectKeys,
  typedFseventsOrderedEventRoots,
  typedFseventsEventRootFingerprint,
  typedFseventsSameOrderedStrings,
  typedFseventsValidatedSnapshot,
  typedFseventsValidatedAckEndpoint,
  typedFseventsCheckpointEquals,
  typedFseventsSameJournalIdentity,
  typedFseventsJournalSessionFingerprint,
  normalizeTypedFseventsAckCheckpoint,
  typedFseventsRelativeToAnyRoot,
  typedFseventsTrustedGitCommonDir,
  typedFseventsDirectRegularNoFollowLock,
  typedFseventsMetadataPolicy,
  typedFseventsMetadataPath,
  typedFseventsEventPathIndex,
  typedFseventsEventEvidence,
  typedFseventsEvidenceIsEmpty,
  typedFseventsEvidenceSummary,
  typedFseventsHasIndexedDescendant,
  typedFseventsHasIndexedAncestor,
  typedFseventsDirectoryDescendantChangeIsNamespaceOnly,
  typedFseventsEventPathExplainsChange,
  typedFseventsAnyEventPathExplainsChange,
  typedFseventsSnapshotPoliciesEqual,
  typedFseventsSnapshotDifference,
  stableJson,
  readAndValidateJournalExtension,
  typedFseventsValidatedJournalExtension,
  typedFseventsNanoseconds,
  typedFseventsCheckedAdd,
  typedFseventsAssertWithinReconciliationWindow,
  typedFseventsEmptyCounters,
  typedFseventsCountersEqual,
  typedFseventsAdvanceCounters,
  typedFseventsValidatedReconciliation,
  reconcileFixedPoint,
  commitReconciliation,
  typedFseventsValidateTerminalAttestation,
  sealTerminal,
  typedFseventsForkPublishedReconciliation,
  typedFseventsRestorePublishedReconciliation,
  typedFseventsConsumePublishedReconciliation,
  typedFseventsInvalidateFixedCycleArtifacts,
  typedFseventsPublishFixedCyclePackage,
  typedFseventsValidatedFixedCyclePackage,
  runTypedFseventsFixedCycle,
  isCanonicalUint64Decimal
].map((implementation) => implementation.toString()).join("\n");

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(value) {
  return sha256Buffer(Buffer.from(stableJson(value)));
}

export function normalizeTransactionMetadataExclusions(value = []) {
  if (!Array.isArray(value)) throw new Error("transaction metadata exclusions must be an array");
  if (value.length === 0) return [];
  if (value.length !== TRANSACTION_METADATA_PATHS.length
    || new Set(value).size !== value.length
    || stableJson([...value].sort()) !== stableJson([...TRANSACTION_METADATA_PATHS].sort())) {
    throw new Error("transaction metadata exclusions must match the exact schema-bound manifest path set");
  }
  return [...TRANSACTION_METADATA_PATHS];
}

function normalizeEphemeralTransactionMetadataRoots(value = []) {
  if (!Array.isArray(value) || value.length > 1) {
    throw new Error("ephemeral transaction metadata roots are invalid");
  }
  for (const relativePath of value) {
    assertRelativeMonitorPath(relativePath, "ephemeral transaction metadata root");
    const match = path.posix.basename(relativePath).match(/^\.evidence-publish-([1-9][0-9]*)-([0-9a-f-]+)$/iu);
    if (path.posix.dirname(relativePath) !== path.posix.dirname(TRANSACTION_METADATA_PATHS[0])
      || !match || Number(match[1]) !== process.pid || !UUID_PATTERN.test(match[2])) {
      throw new Error("ephemeral transaction metadata root is not one exact writer-owned namespace");
    }
  }
  return [...value];
}

function gitPathspec(exclusions, ephemeralRoots = []) {
  return [
    ".",
    ...exclusions.map((relativePath) => `:(exclude,literal)${relativePath}`),
    ...ephemeralRoots.map((relativePath) => `:(exclude,literal)${relativePath}`)
  ];
}

function exactKeys(value, expected) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && stableJson(Object.keys(value).sort()) === stableJson([...expected].sort());
}

function isCanonicalUint64Decimal(value) {
  if (typeof value !== "string" || !UINT64_DECIMAL_PATTERN.test(value)) return false;
  try {
    return BigInt(value) <= 0xffffffffffffffffn;
  } catch {
    return false;
  }
}

function nonTypedFseventsState() {
  return {
    droppedEventCount: "0",
    enabled: false,
    eventRootCount: 0,
    eventRootFingerprint: null,
    helperBinarySha256: null,
    helperSourceSha256: null,
    journalEntryCount: "0",
    journalFirstEventId: null,
    journalFlushSequence: "0",
    journalHighWater: "0",
    journalLastEventId: null,
    journalLastFlushedEventId: null,
    journalSha256: null,
    materialEventCount: "0",
    sourceEventCount: "0",
    transactionMetadataEventCount: "0",
    unknownEventCount: "0",
    unmatchedDeltaCount: "0",
    xattrOnlyEventCount: "0"
  };
}

function validTypedFseventsState(value, {
  eventBackend,
  helperProtocolVersion,
  regularFileCtimePolicy,
  requestedWatchMode,
  rootFdCount,
  watchMode,
  xattrEpoch,
  expectedXattrEpoch
} = {}) {
  if (!exactKeys(value, TYPED_FSEVENTS_STATE_KEYS)
    || typeof value.enabled !== "boolean"
    || !Number.isSafeInteger(value.eventRootCount) || value.eventRootCount < 0
    || ![
      "journalEntryCount",
      "journalFlushSequence",
      "journalHighWater",
      "materialEventCount",
      "sourceEventCount",
      "transactionMetadataEventCount",
      "unknownEventCount",
      "unmatchedDeltaCount",
      "xattrOnlyEventCount",
      "droppedEventCount"
    ].every((key) => isCanonicalUint64Decimal(value[key]))) return false;
  if (!value.enabled) {
    const nonTypedModeIsValid = requestedWatchMode === "auto"
      ? ["recursive", "descriptor-sentinel"].includes(watchMode)
      : requestedWatchMode === "descriptor-sentinel" && watchMode === "descriptor-sentinel";
    return eventBackend === NON_TYPED_EVENT_BACKEND
      && helperProtocolVersion === null
      && regularFileCtimePolicy === STRICT_CTIME_POLICY
      && nonTypedModeIsValid
      && (xattrEpoch ?? expectedXattrEpoch ?? 0) === 0
      && stableJson(value) === stableJson(nonTypedFseventsState());
  }
  if (eventBackend !== TYPED_FSEVENTS_EVENT_BACKEND
    || helperProtocolVersion !== TYPED_FSEVENTS_HELPER_PROTOCOL_VERSION
    || regularFileCtimePolicy !== TYPED_FSEVENTS_CTIME_POLICY
    || requestedWatchMode !== "descriptor-sentinel"
    || watchMode !== "descriptor-sentinel-fsevents"
    || value.eventRootCount < 1
    || (Number.isSafeInteger(rootFdCount) && value.eventRootCount !== rootFdCount)
    || ![
      value.eventRootFingerprint,
      value.helperBinarySha256,
      value.helperSourceSha256,
      value.journalSha256
    ].every((item) => typeof item === "string" && SHA256_PATTERN.test(item))
    || value.droppedEventCount !== "0"
    || value.unknownEventCount !== "0"
    || value.unmatchedDeltaCount !== "0") return false;
  const entryCount = BigInt(value.journalEntryCount);
  const highWater = BigInt(value.journalHighWater);
  const xattrCount = BigInt(value.xattrOnlyEventCount);
  const sourceCount = BigInt(value.sourceEventCount);
  const materialCount = BigInt(value.materialEventCount);
  const transactionCount = BigInt(value.transactionMetadataEventCount);
  const boundXattrEpoch = xattrEpoch ?? expectedXattrEpoch;
  if (!Number.isSafeInteger(boundXattrEpoch) || boundXattrEpoch < 0
    || BigInt(boundXattrEpoch) !== xattrCount
    || sourceCount + transactionCount !== materialCount
    || xattrCount + materialCount !== entryCount
    || BigInt(value.journalFlushSequence) < 1n) return false;
  if (entryCount === 0n) {
    return highWater === 0n
      && value.journalFirstEventId === null
      && value.journalLastEventId === null
      && value.journalLastFlushedEventId === null
      && value.journalSha256 === sha256Buffer(Buffer.alloc(0));
  }
  if (highWater === 0n
    || highWater < entryCount * 41n
    || !isCanonicalUint64Decimal(value.journalFirstEventId)
    || !isCanonicalUint64Decimal(value.journalLastEventId)
    || !isCanonicalUint64Decimal(value.journalLastFlushedEventId)
    || value.journalSha256 === sha256Buffer(Buffer.alloc(0))) return false;
  return BigInt(value.journalFirstEventId) <= BigInt(value.journalLastEventId)
    && (entryCount !== 1n || value.journalFirstEventId === value.journalLastEventId)
    && value.journalLastFlushedEventId === value.journalLastEventId;
}

export function assertTypedFseventsTerminalAdvance(before, after) {
  for (const key of [
    "enabled",
    "eventRootCount",
    "eventRootFingerprint",
    "helperBinarySha256",
    "helperSourceSha256"
  ]) {
    if (before[key] !== after[key]) {
      throw new Error("mutation monitor terminal typed FSEvents immutable binding changed");
    }
  }
  if (!before.enabled) {
    if (stableJson(before) !== stableJson(after)) {
      throw new Error("mutation monitor terminal non-typed binding changed");
    }
    return;
  }
  if (BigInt(after.journalFlushSequence) <= BigInt(before.journalFlushSequence)) {
    throw new Error("mutation monitor terminal typed FSEvents flush sequence did not advance");
  }
  for (const key of [
    "journalEntryCount",
    "journalFlushSequence",
    "journalHighWater",
    "unknownEventCount",
    "unmatchedDeltaCount",
    "xattrOnlyEventCount",
    "droppedEventCount"
  ]) {
    if (BigInt(after[key]) < BigInt(before[key])) {
      throw new Error("mutation monitor terminal typed FSEvents counter regressed");
    }
  }
  for (const key of [
    "materialEventCount",
    "sourceEventCount",
    "transactionMetadataEventCount"
  ]) {
    if (after[key] !== before[key]) {
      throw new Error("mutation monitor terminal material event counter changed");
    }
  }
  const entryGrew = BigInt(after.journalEntryCount) > BigInt(before.journalEntryCount);
  const highWaterGrew = BigInt(after.journalHighWater) > BigInt(before.journalHighWater);
  if (entryGrew !== highWaterGrew) {
    throw new Error("mutation monitor terminal journal entry and high-water growth diverged");
  }
  if (before.journalHighWater === after.journalHighWater
    && before.journalSha256 !== after.journalSha256) {
    throw new Error("mutation monitor terminal typed FSEvents journal digest changed without growth");
  }
  if (highWaterGrew && before.journalSha256 === after.journalSha256) {
    throw new Error("mutation monitor terminal typed FSEvents journal grew without a new digest");
  }
  if (before.journalFirstEventId !== null
    && before.journalFirstEventId !== after.journalFirstEventId) {
    throw new Error("mutation monitor terminal typed FSEvents first event ID changed");
  }
  for (const key of ["journalLastEventId", "journalLastFlushedEventId"]) {
    if (before[key] !== null && (after[key] === null || BigInt(after[key]) < BigInt(before[key]))) {
      throw new Error("mutation monitor terminal typed FSEvents event ID regressed");
    }
    if (!entryGrew && before[key] !== after[key]) {
      throw new Error("mutation monitor terminal typed FSEvents event ID changed without journal growth");
    }
  }
}

export function liveSnapshotSignature(snapshot) {
  if (!snapshot || typeof snapshot.currentStateFingerprint !== "string"
    || !exactKeys(snapshot.buffers, ARCHIVE_ARTIFACT_KEYS)) {
    throw new Error("live snapshot signature contract is invalid");
  }
  return fingerprint({
    currentStateFingerprint: snapshot.currentStateFingerprint,
    buffers: Object.fromEntries(ARCHIVE_ARTIFACT_KEYS.map((key) => [
      key,
      snapshot.buffers[key] === null ? null : sha256Buffer(snapshot.buffers[key])
    ]))
  });
}

function assertRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || !SHA256_PATTERN.test(repositoryId)) {
    throw new Error("evidence repository ID must be a lowercase sha256 value");
  }
}

export function assertEvidenceRootMarker(marker, { repositoryId, rootId } = {}) {
  if (!exactKeys(marker, MARKER_KEYS)) throw new Error("evidence root marker fields are invalid");
  if (marker.schemaVersion !== MARKER_SCHEMA_VERSION) throw new Error("evidence root marker schema is invalid");
  if (typeof marker.rootId !== "string" || !UUID_PATTERN.test(marker.rootId)) throw new Error("evidence root marker rootId must be a canonical UUID");
  assertRepositoryId(marker.repositoryId);
  if (repositoryId !== undefined) {
    assertRepositoryId(repositoryId);
    if (marker.repositoryId !== repositoryId) throw new Error("evidence root marker does not match this repository");
  }
  if (rootId !== undefined && marker.rootId !== rootId) throw new Error("evidence root marker ID does not match the manifest");
  return marker;
}

export function readEvidenceRootMarker(markerPath, options = {}) {
  let markerStat;
  try {
    markerStat = fs.lstatSync(markerPath);
  } catch {
    throw new Error("evidence root marker is missing");
  }
  if (markerStat.isSymbolicLink() || !markerStat.isFile()) {
    throw new Error("evidence root marker must be a direct regular file, not a symlink");
  }
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  } catch {
    throw new Error("evidence root marker is invalid");
  }
  return assertEvidenceRootMarker(marker, options);
}

export function gitBuffer(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: null,
    maxBuffer: 1024 * 1024 * 1024,
    timeout: CHILD_PROCESS_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function addDirectDirectory(directorySet, candidate, containmentRoot) {
  const stat = lstatIfPresent(candidate, "mutation monitor sentinel directory");
  if (stat === null) return;
  if (stat.isSymbolicLink() || !stat.isDirectory() || !isWithin(candidate, containmentRoot)) {
    throw new Error("mutation monitor sentinel coverage contains an unsafe directory");
  }
  directorySet.add(fs.realpathSync(candidate));
}

function addDirectoryTree(directorySet, candidate, containmentRoot) {
  const stat = lstatIfPresent(candidate, "mutation monitor sentinel directory tree");
  if (stat === null) return;
  if (stat.isSymbolicLink() || !stat.isDirectory() || !isWithin(candidate, containmentRoot)) {
    throw new Error("mutation monitor sentinel directory tree is unsafe");
  }
  const canonical = fs.realpathSync(candidate);
  directorySet.add(canonical);
  for (const entry of fs.readdirSync(canonical, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    addDirectoryTree(directorySet, path.join(canonical, entry.name), containmentRoot);
  }
}

function isGitCommonDirectory(root) {
  return lstatIfPresent(path.join(root, "HEAD"))?.isFile()
    && lstatIfPresent(path.join(root, "objects"))?.isDirectory()
    && lstatIfPresent(path.join(root, "refs"))?.isDirectory();
}

function sentinelCoverageDirectories(root) {
  const directories = new Set([root]);
  if (isGitCommonDirectory(root)) {
    addDirectoryTree(directories, path.join(root, "refs", "heads"), root);
    addDirectDirectory(directories, path.join(root, "refs"), root);
    const linkedMetadataRoot = path.join(root, "worktrees");
    addDirectDirectory(directories, linkedMetadataRoot, root);
    if (lstatIfPresent(linkedMetadataRoot)?.isDirectory()) {
      for (const entry of fs.readdirSync(linkedMetadataRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          addDirectDirectory(directories, path.join(linkedMetadataRoot, entry.name), root);
        }
      }
    }
    return [...directories].sort();
  }
  const listedPaths = parseNul(gitBuffer([
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard"
  ], root));
  for (const relativePath of listedPaths) {
    let relativeDirectory = path.posix.dirname(relativePath);
    while (relativeDirectory !== ".") {
      addDirectDirectory(directories, path.join(root, ...relativeDirectory.split("/")), root);
      const parent = path.posix.dirname(relativeDirectory);
      if (parent === relativeDirectory) break;
      relativeDirectory = parent;
    }
  }
  const visibleDirectories = parseNul(gitBuffer([
    "ls-files",
    "-z",
    "--others",
    "--directory",
    "--exclude-standard"
  ], root));
  for (const rawDirectory of visibleDirectories) {
    let relativeDirectory = rawDirectory.replace(/\/$/u, "");
    const visibleCandidate = path.join(root, ...relativeDirectory.split("/"));
    if (!lstatIfPresent(visibleCandidate, "mutation monitor visible directory")?.isDirectory()) continue;
    while (relativeDirectory && relativeDirectory !== ".") {
      addDirectDirectory(directories, path.join(root, ...relativeDirectory.split("/")), root);
      const parent = path.posix.dirname(relativeDirectory);
      if (parent === relativeDirectory) break;
      relativeDirectory = parent;
    }
  }
  return [...directories].sort();
}

function sentinelPathsForRoot(root, directories) {
  const paths = new Set(directories);
  const addIfPresent = (candidate) => {
    if (lstatIfPresent(candidate, "mutation monitor sentinel path") !== null) paths.add(candidate);
  };
  if (isGitCommonDirectory(root)) {
    for (const name of ["HEAD", "index", "packed-refs", "mais-evidence-writer.lock"]) {
      addIfPresent(path.join(root, name));
    }
    const linkedMetadataRoot = path.join(root, "worktrees");
    if (lstatIfPresent(linkedMetadataRoot)?.isDirectory()) {
      for (const entry of fs.readdirSync(linkedMetadataRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
        const entryRoot = path.join(linkedMetadataRoot, entry.name);
        for (const name of ["HEAD", "index", "gitdir", "commondir", "locked"]) addIfPresent(path.join(entryRoot, name));
      }
    }
    const refsHeads = path.join(root, "refs", "heads");
    for (const directory of directories.filter((item) => isWithin(item, refsHeads))) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) addIfPresent(path.join(directory, entry.name));
      }
    }
    return [...paths].sort();
  }
  const listedPaths = parseNul(gitBuffer([
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard"
  ], root));
  for (const relativePath of listedPaths) addIfPresent(path.join(root, ...relativePath.split("/")));
  return [...paths].sort();
}

function sentinelCoverageFingerprint(policies) {
  return fingerprint(policies.map((policy) => ({
    root: policy.root,
    paths: policy.sentinelPaths.map((candidate) => (
      path.relative(policy.root, candidate).split(path.sep).join("/") || "."
    ))
  })));
}

function includeExactMetadataParentDirectories(policy) {
  const directories = new Set(policy.coverageDirectories);
  for (const relativePath of policy.exactMetadataPaths) {
    let relativeDirectory = path.posix.dirname(relativePath);
    while (relativeDirectory !== ".") {
      addDirectDirectory(directories, path.join(policy.root, ...relativeDirectory.split("/")), policy.root);
      const parent = path.posix.dirname(relativeDirectory);
      if (parent === relativeDirectory) break;
      relativeDirectory = parent;
    }
  }
  policy.coverageDirectories = [...directories].sort();
  policy.sentinelPaths = sentinelPathsForRoot(policy.root, policy.coverageDirectories);
  return policy;
}

let cachedRecursiveWatchAvailability;
function recursiveWatchAvailable() {
  if (cachedRecursiveWatchAvailability !== undefined) return cachedRecursiveWatchAvailability;
  const probeSource = [
    "import fs from 'node:fs';",
    "import os from 'node:os';",
    "import path from 'node:path';",
    "const root=fs.mkdtempSync(path.join(os.tmpdir(),'mais-watch-probe-'));",
    "let watcher; let finished=false;",
    "const finish=(status)=>{if(finished)return;finished=true;try{watcher?.close();}catch{};try{fs.rmSync(root,{recursive:true,force:true});}catch{};process.exit(status);};",
    "try{watcher=fs.watch(root,{persistent:true,recursive:true},()=>{});watcher.on('error',(error)=>finish(error?.code==='EMFILE'?75:76));setTimeout(()=>finish(0),500);}catch(error){finish(error?.code==='EMFILE'?75:76);}"
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", probeSource], {
    encoding: "utf8",
    timeout: 2_000,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status === 0) {
    cachedRecursiveWatchAvailability = true;
    return true;
  }
  if (result.status === 75) {
    cachedRecursiveWatchAvailability = false;
    return false;
  }
  throw new Error(`mutation monitor recursive watch probe failed closed (${result.stderr || result.stdout || result.signal || result.status})`);
}

function createPrivateMonitorFile(absolutePath, buffer, mode) {
  const descriptor = fs.openSync(
    absolutePath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL
      | (fs.constants.O_NOFOLLOW ?? 0),
    mode
  );
  try {
    fs.fchmodSync(descriptor, mode);
    fs.writeFileSync(descriptor, buffer);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1
    || (stat.mode & 0o7777) !== mode) {
    throw new Error("typed FSEvents private bootstrap file is unsafe");
  }
}

function readStableRegularFileNoFollow(absolutePath, {
  expectedMode,
  maxBytes,
  minBytes = 1
} = {}) {
  if (!Number.isSafeInteger(expectedMode) || expectedMode < 0
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1
    || !Number.isSafeInteger(minBytes) || minBytes < 0 || minBytes > maxBytes) return null;
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      absolutePath,
      fs.constants.O_RDONLY
        | (fs.constants.O_NOFOLLOW ?? 0)
        | (fs.constants.O_NONBLOCK ?? 0)
    );
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile()
      || (before.mode & 0o7777n) !== BigInt(expectedMode)
      || before.uid !== BigInt(process.geteuid())
      || before.nlink !== 1n
      || before.size < BigInt(minBytes)
      || before.size > BigInt(maxBytes)
      || before.size > BigInt(TYPED_FSEVENTS_MAX_BUFFER_BYTES)) return null;
    const buffer = readTypedFseventsPrefix(descriptor, Number(before.size));
    const after = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(absolutePath, { bigint: true });
    const final = fs.fstatSync(descriptor, { bigint: true });
    if (buffer === null
      || !sameTypedFseventsFrameSnapshot(before, after)
      || !sameTypedFseventsFrameSnapshot(after, visible)
      || !sameTypedFseventsFrameSnapshot(visible, final)) return null;
    return { buffer, status: final };
  } catch {
    return null;
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
  }
}

function prepareTypedFseventsBootstrap({ roots, scratch, trustedGitCommonDir, watchMode }) {
  if (process.platform !== "darwin" || watchMode !== "descriptor-sentinel") return null;
  const sourceEndpoint = readStableRegularFileNoFollow(TYPED_FSEVENTS_HELPER_SOURCE_PATH, {
    expectedMode: 0o644,
    maxBytes: 16 * 1024 * 1024
  });
  if (sourceEndpoint === null) throw new Error("typed FSEvents helper source is unsafe");
  const sourceBuffer = sourceEndpoint.buffer;
  const helperSourceSha256 = sha256Buffer(sourceBuffer);
  const sourceVerification = readStableRegularFileNoFollow(TYPED_FSEVENTS_HELPER_SOURCE_PATH, {
    expectedMode: 0o644,
    maxBytes: 16 * 1024 * 1024
  });
  if (sourceVerification === null
    || helperSourceSha256 !== sha256Buffer(sourceVerification.buffer)) {
    throw new Error("typed FSEvents helper source changed during bootstrap");
  }
  const sourceSnapshotPath = path.join(scratch, "typed-fsevents-helper.c");
  createPrivateMonitorFile(sourceSnapshotPath, sourceBuffer, 0o400);
  const binaryPath = path.join(scratch, "typed-fsevents-helper");
  const compile = spawnSync("/usr/bin/xcrun", [
    "--sdk", "macosx", "clang",
    "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread", "-Wl,-no_uuid",
    sourceSnapshotPath, "-o", binaryPath,
    "-framework", "CoreServices"
  ], {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (compile.status !== 0) {
    throw new Error(`typed FSEvents helper compilation failed closed (${compile.signal ?? compile.status})`);
  }
  const signing = spawnSync("/usr/bin/codesign", [
    "--force", "--sign", "-", "--identifier", "hk.mais.typed-fsevents-journal", binaryPath
  ], {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (signing.status !== 0) {
    throw new Error(`typed FSEvents helper signing failed closed (${signing.signal ?? signing.status})`);
  }
  fs.chmodSync(binaryPath, 0o500);
  const sourceSnapshotEndpoint = readStableRegularFileNoFollow(sourceSnapshotPath, {
    expectedMode: 0o400,
    maxBytes: 16 * 1024 * 1024
  });
  const currentSourceEndpoint = readStableRegularFileNoFollow(TYPED_FSEVENTS_HELPER_SOURCE_PATH, {
    expectedMode: 0o644,
    maxBytes: 16 * 1024 * 1024
  });
  const binaryEndpoint = readStableRegularFileNoFollow(binaryPath, {
    expectedMode: 0o500,
    maxBytes: 64 * 1024 * 1024
  });
  if (sourceSnapshotEndpoint === null || currentSourceEndpoint === null || binaryEndpoint === null
    || sha256Buffer(sourceSnapshotEndpoint.buffer) !== helperSourceSha256
    || sha256Buffer(currentSourceEndpoint.buffer) !== helperSourceSha256) {
    throw new Error("typed FSEvents helper binary is unsafe");
  }
  const binaryStat = binaryEndpoint.status;
  const helperBinarySha256 = sha256Buffer(binaryEndpoint.buffer);
  const runtimeScratch = path.join(scratch, "typed-fsevents-runtime");
  fs.mkdirSync(runtimeScratch, { mode: 0o700 });
  fs.chmodSync(runtimeScratch, 0o700);
  const canonicalRoots = [...roots].sort(stableProofByteOrder);
  const canonicalTrustedGitCommonDir = trustedGitCommonDir === null
    ? null
    : typedFseventsTrustedGitCommonDir(trustedGitCommonDir, canonicalRoots);
  const rootsBuffer = Buffer.concat(canonicalRoots.flatMap((root) => [Buffer.from(root), Buffer.from([0])]));
  const rootsPath = path.join(runtimeScratch, "roots.config");
  const commandPath = path.join(runtimeScratch, "command.bin");
  createPrivateMonitorFile(rootsPath, rootsBuffer, 0o600);
  createPrivateMonitorFile(commandPath, Buffer.alloc(0), 0o600);
  fsyncDirectory(runtimeScratch);
  const rootsEndpoint = readStableRegularFileNoFollow(rootsPath, {
    expectedMode: 0o600,
    maxBytes: 16 * 1024 * 1024
  });
  if (rootsEndpoint === null || !rootsEndpoint.buffer.equals(rootsBuffer)) {
    throw new Error("typed FSEvents roots config is unsafe");
  }
  const rootsStat = rootsEndpoint.status;
  return {
    ackCommitPath: path.join(runtimeScratch, "ack.commit"),
    ackPath: path.join(runtimeScratch, "ack.bin"),
    binaryCtimeNs: binaryStat.ctimeNs.toString(10),
    binaryDevice: binaryStat.dev.toString(10),
    binaryInode: binaryStat.ino.toString(10),
    binaryMtimeNs: binaryStat.mtimeNs.toString(10),
    binaryPath,
    binarySize: binaryStat.size.toString(10),
    commandPath,
    eventRootCount: canonicalRoots.length,
    eventRootFingerprint: sha256Buffer(rootsBuffer),
    helperBinarySha256,
    helperSourceSha256,
    journalPath: path.join(runtimeScratch, "journal.bin"),
    roots: canonicalRoots,
    rootsConfigCtimeNs: rootsStat.ctimeNs.toString(10),
    rootsConfigDevice: rootsStat.dev.toString(10),
    rootsConfigInode: rootsStat.ino.toString(10),
    rootsConfigMtimeNs: rootsStat.mtimeNs.toString(10),
    rootsConfigSha256: sha256Buffer(rootsBuffer),
    rootsConfigSize: rootsStat.size.toString(10),
    rootsPath,
    runtimeScratch,
    sourceSnapshotPath,
    trustedGitCommonDir: canonicalTrustedGitCommonDir,
    typedHelperPidPath: path.join(scratch, "typed-helper-pid")
  };
}

const MUTATION_MONITOR_CHILD_SOURCE = String.raw`
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { isUtf8 } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
${TYPED_FSEVENTS_RECONCILIATION_CHILD_SOURCE}
const [
  configurationPath,
  expectedConfigurationHash
] = process.argv.slice(-2);
const configurationEndpoint = readStableRegularFileNoFollow(configurationPath, {
  expectedMode: 0o600,
  maxBytes: 16 * 1024 * 1024
});
if (configurationEndpoint === null) {
  throw new Error("unsafe mutation monitor bootstrap configuration");
}
const configurationBuffer = configurationEndpoint.buffer;
if (crypto.createHash("sha256").update(configurationBuffer).digest("hex") !== expectedConfigurationHash) {
  throw new Error("mutation monitor bootstrap configuration hash mismatch");
}
const bootstrap = JSON.parse(configurationBuffer.toString("utf8"));
const {
  configuration,
  epochPath,
  readyPath,
  errorPath,
  stoppedPath,
  scratch,
  parentPidText,
  requestedWatchModeText,
  sessionId,
  terminalQuietMsText,
  recursiveAvailableText,
  typedFseventsBootstrap
} = bootstrap;
const parentPid = Number(parentPidText);
const terminalQuietMs = Number(terminalQuietMsText);
const requestedWatchMode = requestedWatchModeText;
const directoryTimestampPolicy = requestedWatchMode === "descriptor-sentinel"
  ? "semantic-directory"
  : "strict";
const recursiveAvailable = recursiveAvailableText === "true";
const typedFseventsEnabled = typedFseventsBootstrap !== null;
const recursiveWatchers = [];
const rootDescriptors = [];
const rootDescriptorRecords = [];
const sentinelRecords = new Map();
const configuredSentinelPaths = new Set();
const dynamicSentinelPaths = new Set();
const objectControlObservations = new Map();
const packedRefsObservations = new Map();
const packedRefsObjectIdWidths = new Map();
const MAX_SENTINEL_PATHS = 600000;
let sourceEpoch = 0;
let metadataEpoch = 0;
let xattrEpoch = 0;
let sequence = 0;
let stopping = false;
let stopped = false;
let terminalTimer;
let terminalAttestationPath = null;
let expectedSourceEpoch = null;
let expectedMetadataEpoch = null;
let watchMode = "bootstrap";
let recursiveProbeActive = true;
let recursiveUnavailable = false;
let bootstrapSentinelsCaptured = false;
let typedFseventsChild = null;
let typedFseventsPid = null;
let typedCommandSequence = 1n;
let typedAcknowledgement = null;
let typedFsevents = null;
let typedFseventsBaseline = null;
let typedFseventsFixedPackage = null;
let typedFseventsProofScope = null;
const exactKeys = (value, keys) => value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const nonTypedFseventsState = () => ({
  droppedEventCount: "0",
  enabled: false,
  eventRootCount: 0,
  eventRootFingerprint: null,
  helperBinarySha256: null,
  helperSourceSha256: null,
  journalEntryCount: "0",
  journalFirstEventId: null,
  journalFlushSequence: "0",
  journalHighWater: "0",
  journalLastEventId: null,
  journalLastFlushedEventId: null,
  journalSha256: null,
  materialEventCount: "0",
  sourceEventCount: "0",
  transactionMetadataEventCount: "0",
  unknownEventCount: "0",
  unmatchedDeltaCount: "0",
  xattrOnlyEventCount: "0"
});
const publishJson = (absolutePath, value) => {
  const temporaryPath = absolutePath + ".tmp-" + process.pid + "-" + (++sequence);
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(temporaryPath, flags, 0o600);
  try {
    fs.writeFileSync(descriptor, JSON.stringify(value) + "\n");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporaryPath, absolutePath);
  const directoryDescriptor = fs.openSync(path.dirname(absolutePath), "r");
  try { fs.fsyncSync(directoryDescriptor); } finally { fs.closeSync(directoryDescriptor); }
};
const typedWait = (milliseconds) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};
const typedChildAlive = (child) => {
  if (child === null || child.exitCode !== null || child.signalCode !== null) return false;
  try { return child.kill(0); } catch { return false; }
};
const sameTypedStat = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.mode === right.mode
  && left.nlink === right.nlink
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs;
const readCommittedTypedAcknowledgement = () => {
  try {
    const acknowledgement = readCommittedTypedFseventsAcknowledgement(
      typedFseventsBootstrap.ackPath,
      {
        expectedEventRootCount: typedFseventsBootstrap.eventRootCount,
        expectedEventRootFingerprint: typedFseventsBootstrap.eventRootFingerprint
      }
    );
    if (acknowledgement === null) return null;
    return acknowledgement;
  } catch {
    return null;
  }
};
const publishTypedCommand = (type, commandSequence) => {
  const command = Buffer.alloc(20);
  command.write("MFSC", 0, "ascii");
  command.writeUInt16LE(2, 4);
  command.writeUInt16LE(type, 6);
  command.writeUInt32LE(20, 8);
  command.writeBigUInt64LE(commandSequence, 12);
  const temporaryPath = path.join(
    typedFseventsBootstrap.runtimeScratch,
    ".command.tmp." + process.pid + "." + commandSequence.toString(10)
  );
  const descriptor = fs.openSync(
    temporaryPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0),
    0o600
  );
  try {
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, command);
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  fs.renameSync(temporaryPath, typedFseventsBootstrap.commandPath);
  const directoryDescriptor = fs.openSync(typedFseventsBootstrap.runtimeScratch, "r");
  try { fs.fsyncSync(directoryDescriptor); } finally { fs.closeSync(directoryDescriptor); }
};
const waitTypedAcknowledgement = (type, commandSequence, terminal = false) => {
  const previousAckInode = typedAcknowledgement?.visibleInode;
  const previousCommitInode = typedAcknowledgement?.commitVisibleInode;
  const deadline = Date.now() + TYPED_FSEVENTS_ACK_TIMEOUT_MS;
  const observe = () => {
    const candidate = readCommittedTypedAcknowledgement();
    const matches = candidate !== null && candidate.type === type
      && candidate.sequence === commandSequence
      && (previousAckInode === undefined || candidate.visibleInode !== previousAckInode)
      && (previousCommitInode === undefined
        || candidate.commitVisibleInode !== previousCommitInode);
    const decision = decideTypedFseventsAcknowledgementWait({
      childAlive: typedChildAlive(typedFseventsChild),
      exitCode: typedFseventsChild?.exitCode ?? null,
      matches,
      signalCode: typedFseventsChild?.signalCode ?? null,
      terminal
    });
    return { candidate, decision };
  };
  const accept = (candidate) => {
    if (candidate === null) throw new Error("typed FSEvents acknowledgement decision lost its candidate");
    typedAcknowledgement = candidate;
    return candidate;
  };
  if (terminal) {
    return new Promise((resolve, reject) => {
      const poll = () => {
        try {
          const { candidate, decision } = observe();
          if (decision === "accept") {
            resolve(accept(candidate));
            return;
          }
          if (decision === "reject") {
            reject(new Error("typed FSEvents helper terminal exit or acknowledgement was invalid"));
            return;
          }
          if (Date.now() >= deadline) {
            reject(new Error("typed FSEvents helper acknowledgement timed out"));
            return;
          }
          setTimeout(poll, 10);
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  }
  while (Date.now() < deadline) {
    const { candidate, decision } = observe();
    if (decision === "accept") {
      return accept(candidate);
    }
    if (decision === "reject") throw new Error("typed FSEvents helper crashed before acknowledgement");
    typedWait(10);
  }
  throw new Error("typed FSEvents helper acknowledgement timed out");
};
const typedJournalPrefix = (endpoint) => {
  if (!Buffer.isBuffer(endpoint.journalPrefix)
    || BigInt(endpoint.journalPrefix.length) !== endpoint.journalHighWater
    || crypto.createHash("sha256").update(endpoint.journalPrefix).digest("hex")
      !== endpoint.journalSha256) {
    throw new Error("typed FSEvents held journal endpoint is invalid");
  }
  return endpoint.journalPrefix;
};
const typedExactMetadataPaths = () => Object.freeze(configuration.flatMap((policy) => (
  policy.exactMetadataPaths.map((relativePath) => path.resolve(
    policy.root,
    ...relativePath.split("/")
  ))
)));
const typedExactMetadataRoots = () => Object.freeze(configuration.flatMap((policy) => (
  [...policy.exactMetadataRoots]
)));
const captureTypedFseventsSnapshot = () => {
  if (typedFseventsProofScope === null) {
    throw new Error("typed FSEvents Git-currentness proof scope is unavailable");
  }
  return captureGitCurrentnessProofSnapshot({ scope: typedFseventsProofScope });
};
const requestTypedFseventsFlush = () => {
  publishTypedCommand(1, typedCommandSequence);
  const acknowledgement = waitTypedAcknowledgement(2, typedCommandSequence);
  typedCommandSequence += 1n;
  return acknowledgement;
};
const typedFseventsSafeNumber = (value, label) => {
  const normalized = typedFseventsUint64(value, label);
  if (normalized > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(label + " exceeds the public safe-integer range");
  }
  return Number(normalized);
};
const typedFseventsDecimalOrNull = (value, label) => value === null
  ? null
  : typedFseventsUint64(value, label).toString(10);
const typedFseventsPublication = (reconciliation) => {
  if (reconciliation === null
    || typeof reconciliation !== "object"
    || !["fixed-point", "sealed"].includes(reconciliation.phase)) {
    throw new Error("typed FSEvents public reconciliation is incomplete");
  }
  const checkpoint = reconciliation.checkpoint;
  const counters = reconciliation.counters;
  const publication = {
    sourceEpoch: typedFseventsSafeNumber(reconciliation.sourceEpoch, "typed FSEvents source epoch"),
    metadataEpoch: typedFseventsSafeNumber(reconciliation.metadataEpoch, "typed FSEvents metadata epoch"),
    xattrEpoch: typedFseventsSafeNumber(reconciliation.xattrEpoch, "typed FSEvents xattr epoch"),
    typedFsevents: {
      droppedEventCount: counters.droppedEventCount.toString(10),
      enabled: true,
      eventRootCount: typedFseventsBootstrap.eventRootCount,
      eventRootFingerprint: typedFseventsBootstrap.eventRootFingerprint,
      helperBinarySha256: typedFseventsBootstrap.helperBinarySha256,
      helperSourceSha256: typedFseventsBootstrap.helperSourceSha256,
      journalEntryCount: counters.journalEntryCount.toString(10),
      journalFirstEventId: typedFseventsDecimalOrNull(
        reconciliation.journalFirstEventId,
        "typed FSEvents first event ID"
      ),
      journalFlushSequence: reconciliation.endpointSequence.toString(10),
      journalHighWater: checkpoint.highWater.toString(10),
      journalLastEventId: typedFseventsDecimalOrNull(
        reconciliation.journalLastEventId,
        "typed FSEvents last event ID"
      ),
      journalLastFlushedEventId: typedFseventsDecimalOrNull(
        reconciliation.journalLastEventId,
        "typed FSEvents last flushed event ID"
      ),
      journalSha256: checkpoint.sha256,
      materialEventCount: counters.materialEventCount.toString(10),
      sourceEventCount: counters.sourceEventCount.toString(10),
      transactionMetadataEventCount: counters.transactionMetadataEventCount.toString(10),
      unknownEventCount: counters.unknownEventCount.toString(10),
      unmatchedDeltaCount: counters.unmatchedDeltaCount.toString(10),
      xattrOnlyEventCount: counters.xattrOnlyEventCount.toString(10)
    }
  };
  return Object.freeze({
    ...publication,
    typedFsevents: Object.freeze(publication.typedFsevents)
  });
};
const applyTypedFseventsPublication = (publication) => {
  sourceEpoch = publication.sourceEpoch;
  metadataEpoch = publication.metadataEpoch;
  xattrEpoch = publication.xattrEpoch;
  typedFsevents = publication.typedFsevents;
};
const reconcileTypedFseventsCycle = ({ exactMetadataRoots = null } = {}) => {
  if (typedFseventsBaseline === null && typedFseventsFixedPackage === null) {
    throw new Error("typed FSEvents reconciliation baseline is unavailable");
  }
  const nextPackage = runTypedFseventsFixedCycle({
    ...(typedFseventsFixedPackage === null
      ? { baseline: typedFseventsBaseline }
      : { previous: typedFseventsFixedPackage }),
    captureSnapshot: captureTypedFseventsSnapshot,
    eventRoots: typedFseventsBootstrap.roots,
    exactMetadataPaths: typedExactMetadataPaths(),
    exactMetadataRoots: exactMetadataRoots === null
      ? typedExactMetadataRoots()
      : Object.freeze([...exactMetadataRoots]),
    flushAcknowledgement: requestTypedFseventsFlush,
    metadataOwnerPid: parentPid,
    nowNs: () => process.hrtime.bigint(),
    trustedGitCommonDir: typedFseventsBootstrap.trustedGitCommonDir
  });
  return Object.freeze({
    fixedPackage: nextPackage,
    publication: typedFseventsPublication(nextPackage.reconciliation)
  });
};
const typedFseventsTerminalAttestation = (terminalExtension, reconciliation) => {
  const classification = terminalExtension.classification;
  const checkpoint = terminalExtension.checkpoint;
  const counters = typedFseventsAdvanceCounters(
    reconciliation.counters,
    classification,
    checkpoint
  );
  return Object.freeze({
    schemaVersion: TYPED_FSEVENTS_RECONCILIATION_SCHEMA_VERSION,
    checkpoint: Object.freeze({
      entryCount: checkpoint.entryCount,
      highWater: checkpoint.highWater,
      lastEventId: checkpoint.lastEventId,
      sha256: checkpoint.sha256
    }),
    counters,
    endpointSequence: terminalExtension.sequence,
    journalFirstEventId: reconciliation.journalFirstEventId
      ?? terminalExtension.firstDeltaEventId,
    journalLastEventId: checkpoint.lastEventId,
    journalSessionFingerprint: reconciliation.journalSessionFingerprint,
    metadataEpoch: reconciliation.metadataEpoch
      + (classification.metadataEpochBatch ? 1n : 0n),
    metadataPolicyFingerprint: reconciliation.metadataPolicyFingerprint,
    pendingEvidenceFingerprint: reconciliation.pendingEvidenceFingerprint,
    pendingMetadataPathCount: reconciliation.pendingMetadataPathCount,
    pendingSourcePathCount: reconciliation.pendingSourcePathCount,
    pendingXattrPathCount: reconciliation.pendingXattrPathCount,
    roundCount: reconciliation.roundCount,
    snapshotSha256: terminalExtension.snapshotSha256,
    sourceEpoch: reconciliation.sourceEpoch
      + (classification.sourceEpochBatch ? 1n : 0n),
    xattrEpoch: reconciliation.xattrEpoch + classification.xattrEpochIncrement
  });
};
const startTypedFsevents = () => {
  if (!typedFseventsEnabled) return;
  const expectedKeys = [
    "ackCommitPath", "ackPath", "binaryCtimeNs", "binaryDevice", "binaryInode",
    "binaryMtimeNs", "binaryPath", "binarySize", "commandPath", "eventRootCount",
    "eventRootFingerprint", "helperBinarySha256", "helperSourceSha256", "journalPath",
    "roots", "rootsConfigCtimeNs", "rootsConfigDevice", "rootsConfigInode",
    "rootsConfigMtimeNs", "rootsConfigSha256", "rootsConfigSize", "rootsPath",
    "runtimeScratch", "sourceSnapshotPath", "trustedGitCommonDir", "typedHelperPidPath"
  ];
  if (!exactKeys(typedFseventsBootstrap, expectedKeys)
    || requestedWatchMode !== "descriptor-sentinel"
    || !Array.isArray(typedFseventsBootstrap.roots)
    || typedFseventsBootstrap.eventRootCount !== typedFseventsBootstrap.roots.length
    || typedFseventsBootstrap.eventRootCount < 1
    || (typedFseventsBootstrap.trustedGitCommonDir !== null
      && !typedFseventsBootstrap.roots.includes(typedFseventsBootstrap.trustedGitCommonDir))) {
    throw new Error("typed FSEvents bootstrap is invalid");
  }
  const sourceSnapshotEndpoint = readStableRegularFileNoFollow(
    typedFseventsBootstrap.sourceSnapshotPath,
    { expectedMode: 0o400, maxBytes: 16 * 1024 * 1024 }
  );
  const binaryEndpoint = readStableRegularFileNoFollow(
    typedFseventsBootstrap.binaryPath,
    { expectedMode: 0o500, maxBytes: 64 * 1024 * 1024 }
  );
  if (sourceSnapshotEndpoint === null || binaryEndpoint === null) {
    throw new Error("typed FSEvents helper binary provenance is invalid");
  }
  const binaryStat = binaryEndpoint.status;
  if (crypto.createHash("sha256").update(sourceSnapshotEndpoint.buffer).digest("hex")
      !== typedFseventsBootstrap.helperSourceSha256
    || binaryStat.dev.toString(10) !== typedFseventsBootstrap.binaryDevice
    || binaryStat.ino.toString(10) !== typedFseventsBootstrap.binaryInode
    || binaryStat.size.toString(10) !== typedFseventsBootstrap.binarySize
    || binaryStat.mtimeNs.toString(10) !== typedFseventsBootstrap.binaryMtimeNs
    || binaryStat.ctimeNs.toString(10) !== typedFseventsBootstrap.binaryCtimeNs
    || crypto.createHash("sha256").update(binaryEndpoint.buffer).digest("hex")
      !== typedFseventsBootstrap.helperBinarySha256) {
    throw new Error("typed FSEvents helper binary provenance is invalid");
  }
  typedFseventsChild = spawn(typedFseventsBootstrap.binaryPath, [typedFseventsBootstrap.runtimeScratch], {
    stdio: ["pipe", "ignore", "ignore"]
  });
  const postSpawnBinaryEndpoint = readStableRegularFileNoFollow(
    typedFseventsBootstrap.binaryPath,
    { expectedMode: 0o500, maxBytes: 64 * 1024 * 1024 }
  );
  if (postSpawnBinaryEndpoint === null
    || !sameTypedStat(binaryStat, postSpawnBinaryEndpoint.status)
    || crypto.createHash("sha256").update(postSpawnBinaryEndpoint.buffer).digest("hex")
      !== typedFseventsBootstrap.helperBinarySha256) {
    try { typedFseventsChild.kill("SIGKILL"); } catch {}
    throw new Error("typed FSEvents helper binary changed across spawn");
  }
  typedFseventsPid = typedFseventsChild.pid;
  const executableDeadline = Date.now() + 5_000;
  let loadedExecutableIdentityIsBound = false;
  while (!loadedExecutableIdentityIsBound && Date.now() < executableDeadline) {
    if (!typedChildAlive(typedFseventsChild)) {
      throw new Error("typed FSEvents helper exited before executable identity binding");
    }
    try {
      const listing = execFileSync("/usr/sbin/lsof", [
        "-a", "-p", String(typedFseventsPid), "-d", "txt", "-F", "Din"
      ], { encoding: "utf8", timeout: 2_000, stdio: ["ignore", "pipe", "ignore"] });
      let device = null;
      let inode = null;
      for (const line of listing.split("\n")) {
        if (line.startsWith("D")) device = line.slice(1);
        else if (line.startsWith("i")) inode = line.slice(1);
        else if (line.startsWith("n")) {
          const loadedPath = line.slice(1);
          if (loadedPath === fs.realpathSync(typedFseventsBootstrap.binaryPath)
            && device !== null && inode !== null
            && BigInt(device) === binaryStat.dev
            && BigInt(inode) === binaryStat.ino) {
            loadedExecutableIdentityIsBound = true;
            break;
          }
          device = null;
          inode = null;
        }
      }
    } catch {}
    if (!loadedExecutableIdentityIsBound) typedWait(10);
  }
  if (!loadedExecutableIdentityIsBound) {
    try { typedFseventsChild.kill("SIGKILL"); } catch {}
    throw new Error("typed FSEvents loaded executable identity is not the hashed binary inode");
  }
  publishJson(typedFseventsBootstrap.typedHelperPidPath, { pid: typedFseventsPid });
  typedAcknowledgement = waitTypedAcknowledgement(1, 0n);
  const rootsEndpoint = readStableRegularFileNoFollow(
    typedFseventsBootstrap.rootsPath,
    { expectedMode: 0o600, maxBytes: 16 * 1024 * 1024 }
  );
  if (rootsEndpoint === null) {
    throw new Error("typed FSEvents roots config visible provenance changed before READY");
  }
  const rootsVisible = rootsEndpoint.status;
  if (
    rootsVisible.dev.toString(10) !== typedFseventsBootstrap.rootsConfigDevice
    || rootsVisible.ino.toString(10) !== typedFseventsBootstrap.rootsConfigInode
    || rootsVisible.size.toString(10) !== typedFseventsBootstrap.rootsConfigSize
    || rootsVisible.mtimeNs.toString(10) !== typedFseventsBootstrap.rootsConfigMtimeNs
    || rootsVisible.ctimeNs.toString(10) !== typedFseventsBootstrap.rootsConfigCtimeNs
    || crypto.createHash("sha256").update(rootsEndpoint.buffer).digest("hex")
      !== typedFseventsBootstrap.rootsConfigSha256) {
    throw new Error("typed FSEvents roots config visible provenance changed before READY");
  }
  let heldRootsConfigIdentityIsBound = false;
  try {
    const listing = execFileSync("/usr/sbin/lsof", [
      "-a", "-p", String(typedFseventsPid), "-F", "fDin"
    ], { encoding: "utf8", timeout: 2_000, stdio: ["ignore", "pipe", "ignore"] });
    let device = null;
    let inode = null;
    for (const line of listing.split("\n")) {
      if (line.startsWith("f")) { device = null; inode = null; }
      else if (line.startsWith("D")) device = line.slice(1);
      else if (line.startsWith("i")) inode = line.slice(1);
      else if (line.startsWith("n")) {
        if (line.slice(1) === fs.realpathSync(typedFseventsBootstrap.rootsPath)
          && device !== null && inode !== null
          && BigInt(device) === rootsVisible.dev && BigInt(inode) === rootsVisible.ino) {
          heldRootsConfigIdentityIsBound = true;
          break;
        }
      }
    }
  } catch {}
  if (!heldRootsConfigIdentityIsBound) {
    throw new Error("typed FSEvents READY did not retain the exact roots config inode");
  }
  typedFseventsProofScope = createGitCurrentnessProofScope({
    policies: configuration,
    trustedGitCommonDir: typedFseventsBootstrap.trustedGitCommonDir
  });
  const drainedAcknowledgement = requestTypedFseventsFlush();
  const drainedJournal = typedJournalPrefix(drainedAcknowledgement);
  if (drainedAcknowledgement.entryCount !== 0n
    || drainedAcknowledgement.journalHighWater !== 0n
    || drainedJournal.length !== 0) {
    throw new Error("typed FSEvents journal was not empty before descriptor baseline");
  }
  const baselineSnapshot = captureTypedFseventsSnapshot();
  const baselineAcknowledgement = requestTypedFseventsFlush();
  const baselineJournal = typedJournalPrefix(baselineAcknowledgement);
  if (baselineAcknowledgement.entryCount !== 0n
    || baselineAcknowledgement.journalHighWater !== 0n
    || baselineJournal.length !== 0) {
    throw new Error("typed FSEvents journal was not empty at the descriptor baseline");
  }
  const baselineEndpoint = normalizeTypedFseventsAckCheckpoint({
    acknowledgement: baselineAcknowledgement,
    eventRoots: typedFseventsBootstrap.roots
  });
  typedFseventsBaseline = Object.freeze({
    ackEndpoint: baselineEndpoint,
    metadataEpoch: 0n,
    snapshot: baselineSnapshot,
    sourceEpoch: 0n,
    startedAtNs: process.hrtime.bigint(),
    xattrEpoch: 0n
  });
  typedFsevents = {
    droppedEventCount: "0",
    enabled: true,
    eventRootCount: Number(typedAcknowledgement.eventRootCount),
    eventRootFingerprint: typedAcknowledgement.eventRootFingerprint,
    helperBinarySha256: typedFseventsBootstrap.helperBinarySha256,
    helperSourceSha256: typedFseventsBootstrap.helperSourceSha256,
    journalEntryCount: "0",
    journalFirstEventId: null,
    journalFlushSequence: baselineEndpoint.sequence.toString(10),
    journalHighWater: "0",
    journalLastEventId: null,
    journalLastFlushedEventId: null,
    journalSha256: baselineEndpoint.checkpoint.sha256,
    materialEventCount: "0",
    sourceEventCount: "0",
    transactionMetadataEventCount: "0",
    unknownEventCount: "0",
    unmatchedDeltaCount: "0",
    xattrOnlyEventCount: "0"
  };
};
const stopTypedFsevents = async () => {
  if (!typedFseventsEnabled) return null;
  publishTypedCommand(2, typedCommandSequence);
  const acknowledgement = await waitTypedAcknowledgement(3, typedCommandSequence, true);
  typedCommandSequence += 1n;
  return acknowledgement;
};
const awaitTypedFseventsExit = async () => {
  if (!typedFseventsEnabled) return;
  await new Promise((resolve, reject) => {
    if (typedFseventsChild.exitCode !== null || typedFseventsChild.signalCode !== null) {
      if (typedFseventsChild.exitCode === 0) resolve();
      else reject(new Error("typed FSEvents helper terminal exit was not successful"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("typed FSEvents helper terminal exit timed out"));
    }, 5_000);
    const cleanup = () => {
      clearTimeout(timer);
      typedFseventsChild.off("exit", onExit);
      typedFseventsChild.off("error", onError);
    };
    const onExit = (code, signal) => {
      cleanup();
      if (code === 0 && signal === null) resolve();
      else reject(new Error("typed FSEvents helper terminal exit was not successful"));
    };
    const onError = () => {
      cleanup();
      reject(new Error("typed FSEvents helper terminal exit failed"));
    };
    typedFseventsChild.once("exit", onExit);
    typedFseventsChild.once("error", onError);
  });
};
const coverageFingerprint = () => typedFseventsEnabled
  ? typedFseventsProofScope.selectionFingerprint
  : crypto.createHash("sha256")
    .update(JSON.stringify([...sentinelRecords.keys()].sort()))
    .digest("hex");
const state = () => ({
  schemaVersion: 3,
  sessionId,
  sourceEpoch,
  metadataEpoch,
  xattrEpoch,
  watchMode,
  requestedWatchMode,
  directoryTimestampPolicy,
  eventBackend: typedFseventsEnabled ? "darwin-fsevents-file-events" : "none",
  helperProtocolVersion: typedFseventsEnabled ? 2 : null,
  regularFileCtimePolicy: typedFseventsEnabled ? "typed-xattr-only" : "strict",
  typedFsevents: typedFseventsEnabled ? typedFsevents : nonTypedFseventsState(),
  coverageFingerprint: coverageFingerprint(),
  coveragePathCount: typedFseventsEnabled
    ? typedFseventsProofScope.pathCount
    : configuredSentinelPaths.size,
  fdCount: rootDescriptors.length,
  rootFdCount: rootDescriptors.length
});
const publishEpoch = () => publishJson(epochPath, state());
const closeTypedFsevents = () => {
  if (!typedFseventsEnabled || typedFseventsChild === null) return;
  if (typedChildAlive(typedFseventsChild)) {
    try { typedFseventsChild.kill("SIGKILL"); } catch {}
    const deadline = Date.now() + 1_000;
    while (typedChildAlive(typedFseventsChild) && Date.now() < deadline) typedWait(10);
  }
  typedFseventsPid = null;
  typedFseventsChild = null;
};
const closeWatchers = () => {
  for (const watcher of recursiveWatchers) {
    try { watcher.close(); } catch {}
  }
  recursiveWatchers.length = 0;
  for (const record of sentinelRecords.values()) {
    if (!Number.isInteger(record.descriptor)) continue;
    try { fs.closeSync(record.descriptor); } catch {}
  }
  sentinelRecords.clear();
  for (const descriptor of rootDescriptors) {
    try { fs.closeSync(descriptor); } catch {}
  }
  rootDescriptors.length = 0;
  rootDescriptorRecords.length = 0;
  closeTypedFsevents();
};
const orphan = () => {
  if (stopped) return;
  stopped = true;
  if (terminalTimer) clearTimeout(terminalTimer);
  closeWatchers();
  try { fs.rmSync(scratch, { recursive: true, force: true }); } catch {}
  process.exit(92);
};
const fail = (reason) => {
  if (stopped) return;
  stopped = true;
  if (terminalTimer) clearTimeout(terminalTimer);
  closeWatchers();
  const detail = reason instanceof Error ? reason.message : String(reason ?? "unspecified failure");
  try { fs.writeFileSync(errorPath, "mutation monitor failed closed: " + detail + "\n", { mode: 0o600 }); } catch {}
  process.exit(91);
};
const canonicalRelative = (filename) => {
  if (filename === null || filename === undefined) return null;
  const value = Buffer.isBuffer(filename) ? filename.toString("utf8") : String(filename);
  if (value.length === 0) return null;
  return path.normalize(value).split(path.sep).join("/").replace(/^\.\//u, "");
};
const isContainedBy = (candidate, parent) => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !path.isAbsolute(relative)
    && relative.split(path.sep)[0] !== "..");
};
const absoluteWatchedPath = (policy, relativePath) => path.resolve(
  policy.root,
  ...relativePath.split("/")
);
const addConfiguredPath = (policy, paths, absolutePath) => {
  if (!isContainedBy(absolutePath, policy.root)) throw new Error("sentinel enumeration escaped its root");
  let candidate = absolutePath;
  while (true) {
    paths.add(candidate);
    if (paths.size > MAX_SENTINEL_PATHS) throw new Error("mutation monitor coverage exceeds MAX_SENTINEL_PATHS");
    if (candidate === policy.root) break;
    const parent = path.dirname(candidate);
    if (parent === candidate || !isContainedBy(parent, policy.root)) throw new Error("invalid sentinel ancestor");
    candidate = parent;
  }
};
const addExistingTree = (policy, paths, absolutePath) => {
  let stat;
  try { stat = fs.lstatSync(absolutePath); } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  addConfiguredPath(policy, paths, absolutePath);
  if (stat.isSymbolicLink() || !stat.isDirectory()) return;
  for (const entry of fs.readdirSync(absolutePath)) addExistingTree(policy, paths, path.join(absolutePath, entry));
};
const isGitCommonRoot = (root) => fs.existsSync(path.join(root, "HEAD"))
  && fs.existsSync(path.join(root, "objects")) && fs.existsSync(path.join(root, "refs"));
const enumeratePolicyPaths = (policy) => {
  const paths = new Set();
  addConfiguredPath(policy, paths, policy.root);
  if (isGitCommonRoot(policy.root)) {
    for (const name of ["HEAD", "index", "packed-refs", "mais-evidence-writer.lock"]) {
      const candidate = path.join(policy.root, name);
      if (fs.existsSync(candidate)) addConfiguredPath(policy, paths, candidate);
    }
    addExistingTree(policy, paths, path.join(policy.root, "refs", "heads"));
    const worktreesRoot = path.join(policy.root, "worktrees");
    if (fs.existsSync(worktreesRoot)) {
      addConfiguredPath(policy, paths, worktreesRoot);
      for (const entry of fs.readdirSync(worktreesRoot)) {
        const entryRoot = path.join(worktreesRoot, entry);
        let stat;
        try { stat = fs.lstatSync(entryRoot); } catch { continue; }
        if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
        addConfiguredPath(policy, paths, entryRoot);
        for (const name of ["HEAD", "index", "gitdir", "commondir", "locked"]) {
          const candidate = path.join(entryRoot, name);
          if (fs.existsSync(candidate)) addConfiguredPath(policy, paths, candidate);
        }
      }
    }
  } else {
    const listed = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: policy.root,
      encoding: null,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      maxBuffer: 1024 * 1024 * 1024
    });
    let start = 0;
    for (let index = 0; index < listed.length; index += 1) {
      if (listed[index] !== 0) continue;
      const relativePath = listed.subarray(start, index).toString("utf8");
      start = index + 1;
      if (!relativePath) continue;
      addConfiguredPath(policy, paths, path.resolve(policy.root, ...relativePath.split("/")));
    }
    if (start !== listed.length) throw new Error("git sentinel inventory is not NUL terminated");
  }
  for (const relativePath of policy.exactMetadataPaths) {
    addConfiguredPath(policy, paths, absoluteWatchedPath(policy, relativePath));
  }
  for (const exactRoot of policy.exactMetadataRoots) addExistingTree(policy, paths, exactRoot);
  return paths;
};
const refreshConfiguredSentinelPaths = () => {
  const refreshed = new Set();
  for (const policy of configuration) {
    for (const absolutePath of enumeratePolicyPaths(policy)) refreshed.add(absolutePath);
  }
  if (refreshed.size > MAX_SENTINEL_PATHS) throw new Error("mutation monitor coverage exceeds MAX_SENTINEL_PATHS");
  configuredSentinelPaths.clear();
  for (const absolutePath of refreshed) configuredSentinelPaths.add(absolutePath);
};
const isTransactionMetadata = (policy, relativePath) => relativePath !== null
  && (policy.exactMetadataPaths.includes(relativePath)
    || policy.exactMetadataRoots.some((root) => isContainedBy(absoluteWatchedPath(policy, relativePath), root)));
const policyForPath = (absolutePath) => configuration
  .filter((policy) => isContainedBy(absolutePath, policy.root))
  .sort((left, right) => right.root.length - left.root.length)[0] ?? null;
const statShape = (stat) => ({
  dev: String(stat.dev),
  ino: String(stat.ino),
  mode: String(stat.mode),
  nlink: String(stat.nlink),
  size: String(stat.size),
  mtimeNs: String(stat.mtimeNs),
  ctimeNs: String(stat.ctimeNs)
});
const sameShape = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const CODEX_PRIVATE_REF_ROOT = "refs/codex";
const codexPrivateRefPath = (relativePath) => relativePath === CODEX_PRIVATE_REF_ROOT
  || relativePath.startsWith(CODEX_PRIVATE_REF_ROOT + "/");
const validPackedRefName = (ref) => {
  if (!ref.startsWith("refs/") || ref.length > 4096 || ref.endsWith("/") || ref.endsWith(".")
    || ref.includes("//") || ref.includes("..") || ref.includes("@{")) return false;
  for (const character of ref) {
    const code = character.codePointAt(0);
    if (code <= 0x20 || code === 0x7f
      || ["~", "^", ":", "?", "*", "[", "\\"].includes(character)) return false;
  }
  const components = ref.split("/");
  return components.length >= 3
    && components.every((component) => component.length > 0
      && !component.startsWith(".") && !component.endsWith(".lock"));
};
const packedRefsObjectIdWidth = (policy) => {
  const cached = packedRefsObjectIdWidths.get(policy.root);
  if (cached !== undefined) return cached;
  const result = spawnSync("git", ["rev-parse", "--show-object-format"], {
    cwd: policy.root,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("packed-refs object format lookup failed closed");
  }
  const objectFormat = result.stdout.trim();
  const width = objectFormat === "sha1" ? 40 : objectFormat === "sha256" ? 64 : null;
  if (width === null) throw new Error("packed-refs object format is unsupported");
  packedRefsObjectIdWidths.set(policy.root, width);
  return width;
};
const parsePackedRefs = (buffer, expectedObjectIdWidth) => {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buffer); } catch {
    throw new Error("packed-refs observation is not UTF-8");
  }
  if (text.length > 0 && !text.endsWith("\n")) {
    throw new Error("packed-refs observation is not newline terminated");
  }
  const rows = [];
  const comments = [];
  const seenRefs = new Set();
  let prior = null;
  let priorRef = null;
  let rowsStarted = false;
  let sorted = false;
  const lines = text.length === 0 ? [] : text.slice(0, -1).split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line.length === 0) throw new Error("packed-refs observation contains an empty record");
    if (line.startsWith("#")) {
      if (rowsStarted) throw new Error("packed-refs observation contains a comment after ref records");
      if (lineIndex === 0 && line.startsWith("# pack-refs with:")) {
        const traits = line.slice("# pack-refs with:".length).trim().split(/ +/u).filter(Boolean);
        if (new Set(traits).size !== traits.length) {
          throw new Error("packed-refs observation contains duplicate header traits");
        }
        sorted = traits.includes("sorted");
      }
      comments.push(line);
      prior = null;
      continue;
    }
    rowsStarted = true;
    if (line.startsWith("^")) {
      const peeled = line.slice(1);
      if (!prior || !/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u.test(peeled)
        || peeled.length !== expectedObjectIdWidth || /^0+$/u.test(peeled)
        || prior.peeled !== null) {
        throw new Error("packed-refs observation contains an invalid peeled record");
      }
      prior.peeled = peeled;
      prior = null;
      continue;
    }
    const match = line.match(/^([0-9a-f]{40}(?:[0-9a-f]{24})?) (refs\/[^\u0000-\u0020\u007f]+)$/u);
    if (!match || !validPackedRefName(match[2])) {
      throw new Error("packed-refs observation contains an invalid ref record");
    }
    if (match[1].length !== expectedObjectIdWidth || /^0+$/u.test(match[1])
      || seenRefs.has(match[2])) {
      throw new Error("packed-refs observation contains duplicate or mixed-format refs");
    }
    if (sorted && priorRef !== null
      && Buffer.from(priorRef).compare(Buffer.from(match[2])) >= 0) {
      throw new Error("packed-refs observation violates its sorted header trait");
    }
    seenRefs.add(match[2]);
    const row = { objectId: match[1], peeled: null, ref: match[2] };
    rows.push(row);
    prior = row;
    priorRef = match[2];
  }
  return {
    filteredProjection: JSON.stringify({
      comments,
      rows: rows.filter((row) => !codexPrivateRefPath(row.ref))
    }),
    fullProjection: JSON.stringify({ comments, rows })
  };
};
const packedRefsObservation = (policy) => {
  const packedRefsPath = path.join(policy.root, "packed-refs");
  let descriptor = -1;
  try {
    descriptor = fs.openSync(packedRefsPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const emptyProjection = JSON.stringify({ comments: [], rows: [] });
      return {
        exists: false,
        filteredProjection: emptyProjection,
        fullProjection: emptyProjection,
        rawSha256: null,
        shape: null
      };
    }
    throw error;
  }
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.uid !== BigInt(process.geteuid()) || before.nlink !== 1n
      || (before.mode & 0o22n) !== 0n || before.size > 16n * 1024n * 1024n) {
      throw new Error("packed-refs observation source is unsafe");
    }
    const buffer = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(packedRefsPath, { bigint: true });
    const final = fs.fstatSync(descriptor, { bigint: true });
    const shape = statShape(final);
    if (!sameShape(statShape(before), statShape(after))
      || !sameShape(statShape(after), statShape(visible))
      || !sameShape(statShape(visible), shape)
      || BigInt(buffer.length) !== final.size) {
      throw new Error("packed-refs changed during descriptor-bound observation");
    }
    return {
      exists: true,
      ...parsePackedRefs(buffer, packedRefsObjectIdWidth(policy)),
      rawSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      shape
    };
  } finally {
    fs.closeSync(descriptor);
  }
};
const samePackedRefsObservation = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const classifyPackedRefsObservation = (policy) => {
  const previous = packedRefsObservations.get(policy.root);
  if (previous === undefined) throw new Error("packed-refs observation baseline is unavailable");
  const current = packedRefsObservation(policy);
  packedRefsObservations.set(policy.root, current);
  if (samePackedRefsObservation(current, previous)) return true;
  return current.filteredProjection === previous.filteredProjection
    && current.fullProjection !== previous.fullProjection;
};
const packedRefsTemporaryPresent = (policy) => {
  for (const name of ["packed-refs.lock", "packed-refs.new"]) {
    try {
      fs.lstatSync(path.join(policy.root, name));
      return true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return false;
};
const packedRefsWaitCell = new Int32Array(new SharedArrayBuffer(4));
const awaitPackedRefsTemporaryQuiescence = (policy) => {
  const deadline = Date.now() + 2_000;
  while (packedRefsTemporaryPresent(policy) && Date.now() < deadline) {
    Atomics.wait(packedRefsWaitCell, 0, 0, 10);
  }
  return !packedRefsTemporaryPresent(policy);
};
const samplePackedRefsObservations = ({ recordEpochs = true } = {}) => {
  let changes = 0;
  for (const policy of configuration) {
    if (!isGitCommonRoot(policy.root)) continue;
    if (!awaitPackedRefsTemporaryQuiescence(policy)
      || !classifyPackedRefsObservation(policy)) changes += 1;
  }
  if (recordEpochs && changes > 0) sourceEpoch += changes;
  return changes;
};
const objectControlObservation = (policy) => {
  const scan = () => {
    const entries = [];
    const visit = (absolutePath, relativePath) => {
      let stat;
      try { stat = fs.lstatSync(absolutePath, { bigint: true }); } catch (error) {
        if (error?.code === "ENOENT") {
          entries.push({ path: relativePath, shape: null, type: "missing" });
          return;
        }
        throw error;
      }
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        throw new Error("Git object control path is unsafe");
      }
      entries.push({
        path: relativePath,
        shape: statShape(stat),
        type: stat.isDirectory() ? "directory" : "file"
      });
      if (entries.length > 10_000) throw new Error("Git object control observation exceeds its path cap");
      if (!stat.isDirectory()) return;
      const names = fs.readdirSync(absolutePath)
        .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
      for (const name of names) visit(path.join(absolutePath, name), relativePath + "/" + name);
    };
    for (const relativePath of ["objects/info", "objects/pack"]) {
      visit(path.join(policy.root, ...relativePath.split("/")), relativePath);
    }
    return JSON.stringify(entries);
  };
  const first = scan();
  const second = scan();
  if (first !== second) throw new Error("Git object control state changed during observation");
  return first;
};
const classifyObjectControlObservation = (policy) => {
  const previous = objectControlObservations.get(policy.root);
  if (previous === undefined) throw new Error("Git object control baseline is unavailable");
  const current = objectControlObservation(policy);
  objectControlObservations.set(policy.root, current);
  return current === previous;
};
const sampleObjectControlObservations = ({ recordEpochs = true } = {}) => {
  let changes = 0;
  for (const policy of configuration) {
    if (isGitCommonRoot(policy.root) && !classifyObjectControlObservation(policy)) changes += 1;
  }
  if (recordEpochs && changes > 0) sourceEpoch += changes;
  return changes;
};
const sameClosureDirectoryShape = (left, right) => (
  left.dev === right.dev
  && left.ino === right.ino
  && left.mode === right.mode
  && left.nlink === right.nlink
  && left.size === right.size
);
const sameSentinelShape = (left, right, record) => (
  requestedWatchMode === "descriptor-sentinel" && record.type === "directory"
    ? sameClosureDirectoryShape(left, right)
    : sameShape(left, right)
);
const openSentinelRecord = (absolutePath) => {
  const policy = policyForPath(absolutePath);
  if (!policy) throw new Error("descriptor sentinel path is outside every policy root");
  let lstat;
  try { lstat = fs.lstatSync(absolutePath, { bigint: true }); } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (lstat.isSymbolicLink()) {
    return {
      absolutePath,
      descriptor: null,
      listing: null,
      linkTarget: fs.readlinkSync(absolutePath),
      policyRoot: policy.root,
      shape: statShape(lstat),
      type: "symlink"
    };
  }
  if (!lstat.isFile() && !lstat.isDirectory()) throw new Error("descriptor sentinel path is not a regular file or directory");
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error("descriptor sentinel requires O_NOFOLLOW support");
  return {
    absolutePath,
    descriptor: null,
    listing: lstat.isDirectory() ? fs.readdirSync(absolutePath).sort() : null,
    linkTarget: null,
    policyRoot: policy.root,
    shape: statShape(lstat),
    type: lstat.isDirectory() ? "directory" : "file"
  };
};
const addDynamicTree = (absolutePath) => {
  const policy = policyForPath(absolutePath);
  if (!policy) throw new Error("dynamic descriptor sentinel path escaped every policy root");
  let stat;
  try { stat = fs.lstatSync(absolutePath); } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  dynamicSentinelPaths.add(absolutePath);
  if (stat.isSymbolicLink() || !stat.isDirectory()) return;
  for (const entry of fs.readdirSync(absolutePath)) addDynamicTree(path.join(absolutePath, entry));
};
const closeSentinelRecords = () => {
  for (const record of sentinelRecords.values()) {
    if (!Number.isInteger(record.descriptor)) continue;
    try { fs.closeSync(record.descriptor); } catch {}
  }
  sentinelRecords.clear();
};
const rebuildSentinelRecords = () => {
  closeSentinelRecords();
  for (const absolutePath of [...new Set([...configuredSentinelPaths, ...dynamicSentinelPaths])].sort()) {
    const record = openSentinelRecord(absolutePath);
    if (record) sentinelRecords.set(absolutePath, record);
  }
};
const metadataDeltaOnly = (deltaPaths) => {
  const metadataPaths = [];
  const nonmetadataPaths = [];
  for (const absolutePath of deltaPaths) {
    const policy = policyForPath(absolutePath);
    if (!policy) return false;
    const relativePath = path.relative(policy.root, absolutePath).split(path.sep).join("/") || ".";
    if (isTransactionMetadata(policy, relativePath)) metadataPaths.push(absolutePath);
    else nonmetadataPaths.push(absolutePath);
  }
  if (metadataPaths.length === 0) return false;
  return nonmetadataPaths.every((candidate) => {
    const previous = sentinelRecords.get(candidate);
    let isDirectory = previous?.type === "directory";
    if (!isDirectory) {
      try { isDirectory = fs.lstatSync(candidate).isDirectory(); } catch {}
    }
    return isDirectory && metadataPaths.some((metadataPath) => (
      metadataPath !== candidate && isContainedBy(metadataPath, candidate)
    ));
  });
};
const recursiveGitCommonPathIsIgnored = (policy, relativePath) => (
  isGitCommonRoot(policy.root)
  && (
    ((relativePath === "objects" || relativePath.startsWith("objects/"))
      && classifyObjectControlObservation(policy))
    || codexPrivateRefPath(relativePath)
    || relativePath === "packed-refs.lock"
    || relativePath === "packed-refs.new"
    || (relativePath === "packed-refs" && classifyPackedRefsObservation(policy))
  )
);
const recursiveWorkingTreePathIsIgnored = (policy, absolutePath, relativePath) => {
  if (isTransactionMetadata(policy, relativePath)) return false;
  // Object creation and the refs/codex private maintenance namespace are
  // explicitly outside dirty-worktree currentness: Gate A never consumes either
  // namespace as a branch, HEAD, index, tracked byte, or untracked byte.
  // This is a namespace policy, not an assertion about the writer process.
  // A packed-refs transition is ignored only when descriptor-bound observations
  // prove that its complete non-Codex projection is unchanged and at least one
  // shaped private ref changed. Identity-only rewrites and restored transient
  // changes remain source. Every other common-dir event remains fail-closed.
  if (recursiveGitCommonPathIsIgnored(policy, relativePath)) return true;
  if (configuredSentinelPaths.has(absolutePath)
    || dynamicSentinelPaths.has(absolutePath)) return false;
  if (isGitCommonRoot(policy.root)) return false;
  const ignored = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", "--", relativePath],
    {
      cwd: policy.root,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 5_000
    }
  );
  if (ignored.error || ignored.signal || ![0, 1].includes(ignored.status)) {
    throw new Error("recursive watcher Git-ignore classification failed closed");
  }
  return ignored.status === 0;
};
const validateTypedRootAnchors = () => {
  for (const record of rootDescriptorRecords) {
    const held = statShape(fs.fstatSync(record.descriptor, { bigint: true }));
    const current = statShape(fs.lstatSync(record.root, { bigint: true }));
    if (held.dev !== record.shape.dev || held.ino !== record.shape.ino
      || held.dev !== current.dev || held.ino !== current.ino) {
      throw new Error("mutation monitor root anchor changed");
    }
  }
};
const sampleSentinels = ({
  excludePackedRefs = false,
  recordEpochs = true,
  semanticDirectories = false
} = {}) => {
  validateTypedRootAnchors();
  if (watchMode === "recursive") {
    return samplePackedRefsObservations({ recordEpochs })
      + sampleObjectControlObservations({ recordEpochs });
  }
  refreshConfiguredSentinelPaths();
  const excludedFromBootstrap = (absolutePath) => {
    if (!excludePackedRefs || path.basename(absolutePath) !== "packed-refs") return false;
    const policy = policyForPath(absolutePath);
    return policy !== null && isGitCommonRoot(policy.root)
      && absolutePath === path.join(policy.root, "packed-refs");
  };
  const deltaPaths = new Set();
  for (const [absolutePath, record] of sentinelRecords) {
    if (excludedFromBootstrap(absolutePath)) continue;
    const shapesMatch = (left, right) => semanticDirectories && record.type === "directory"
      ? sameClosureDirectoryShape(left, right)
      : sameSentinelShape(left, right, record);
    if (Number.isInteger(record.descriptor)) {
      const currentHeld = statShape(fs.fstatSync(record.descriptor, { bigint: true }));
      if (!shapesMatch(currentHeld, record.shape)) deltaPaths.add(absolutePath);
    }
    let currentLstat = null;
    try { currentLstat = fs.lstatSync(absolutePath, { bigint: true }); } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (currentLstat === null) {
      deltaPaths.add(absolutePath);
      continue;
    }
    const currentShape = statShape(currentLstat);
    if (!shapesMatch(currentShape, record.shape)
      || (record.type === "symlink" && fs.readlinkSync(absolutePath) !== record.linkTarget)) {
      deltaPaths.add(absolutePath);
    }
    if (record.type === "directory") {
      // Explicit closure mode compares a directory as a fixed point: stable
      // identity/security/size fields plus this exact sorted namespace; only
      // directory mtime/ctime are non-semantic. Auto mode stays strict so its
      // descriptor fallback still records transient mutations. ACLs, xattrs,
      // and ownership are outside the repository-currentness contract; this
      // explicit closure mode does not attest them.
      const listing = fs.readdirSync(absolutePath).sort();
      if (JSON.stringify(listing) !== JSON.stringify(record.listing)) {
        deltaPaths.add(absolutePath);
        const previousNames = new Set(record.listing);
        for (const name of listing) {
          if (!previousNames.has(name)) addDynamicTree(path.join(absolutePath, name));
        }
      }
    }
  }
  for (const absolutePath of [...configuredSentinelPaths, ...dynamicSentinelPaths]) {
    if (sentinelRecords.has(absolutePath) || excludedFromBootstrap(absolutePath)) continue;
    try {
      fs.lstatSync(absolutePath);
      deltaPaths.add(absolutePath);
      addDynamicTree(absolutePath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  if (recordEpochs && deltaPaths.size > 0) {
    if (metadataDeltaOnly(deltaPaths)) metadataEpoch += 1;
    else sourceEpoch += 1;
  }
  rebuildSentinelRecords();
  return deltaPaths.size + sampleObjectControlObservations({ recordEpochs });
};
const recordRecursiveEvent = (subscriptionPolicy, filename) => {
  if (stopped) return;
  const subscriptionRelativePath = canonicalRelative(filename);
  if (subscriptionRelativePath === null) return fail("recursive watcher returned a null filename");
  const absolutePath = absoluteWatchedPath(subscriptionPolicy, subscriptionRelativePath);
  if (!isContainedBy(absolutePath, subscriptionPolicy.root)) {
    return fail("recursive watcher event escaped its subscription root");
  }
  const policy = policyForPath(absolutePath);
  if (!policy) return fail("recursive watcher event escaped every logical policy root");
  const relativePath = path.relative(policy.root, absolutePath).split(path.sep).join("/") || ".";
  try {
    if (recursiveWorkingTreePathIsIgnored(policy, absolutePath, relativePath)) return;
  } catch (error) {
    return fail(error);
  }
  if (isTransactionMetadata(policy, relativePath)) metadataEpoch += 1;
  else sourceEpoch += 1;
  try { publishEpoch(); } catch (error) { return fail(error); }
  if (stopping) scheduleTerminalStop();
};
const finalizeStop = async () => {
  if (stopped) return;
  try {
    if (typedFseventsEnabled) {
      validateTypedRootAnchors();
      const fixed = reconcileTypedFseventsCycle();
      typedFseventsFixedPackage = fixed.fixedPackage;
      const terminalSnapshot = captureTypedFseventsSnapshot();
      const terminalAcknowledgement = await stopTypedFsevents();
      await awaitTypedFseventsExit();
      const terminalEndpoint = normalizeTypedFseventsAckCheckpoint({
        acknowledgement: terminalAcknowledgement,
        eventRoots: typedFseventsBootstrap.roots
      });
      const terminalExtension = readAndValidateJournalExtension({
        candidateSnapshot: terminalSnapshot,
        endpoint: terminalEndpoint,
        eventRoots: typedFseventsBootstrap.roots,
        exactMetadataPaths: typedExactMetadataPaths(),
        exactMetadataRoots: typedExactMetadataRoots(),
        metadataOwnerPid: parentPid,
        priorCheckpoint: typedFseventsFixedPackage.checkpoint,
        priorSnapshot: typedFseventsFixedPackage.snapshot,
        trustedGitCommonDir: typedFseventsBootstrap.trustedGitCommonDir
      });
      const terminalAttestation = typedFseventsTerminalAttestation(
        terminalExtension,
        typedFseventsFixedPackage.reconciliation
      );
      const terminalSeal = sealTerminal({
        reconciliation: typedFseventsFixedPackage.reconciliation,
        terminalExtension,
        terminalAttestation,
        sealedAtNs: process.hrtime.bigint()
      });
      applyTypedFseventsPublication(typedFseventsPublication(terminalSeal));
    } else {
      sampleSentinels();
    }
    publishEpoch();
    if (sourceEpoch !== expectedSourceEpoch || metadataEpoch !== expectedMetadataEpoch) {
      throw new Error("terminal epochs changed after the strict stop request");
    }
    const attestation = { ...state(), status: "stopped" };
    if (terminalAttestationPath !== null) publishJson(terminalAttestationPath, attestation);
    publishJson(stoppedPath, attestation);
  } catch {
    closeWatchers();
    try { fs.writeFileSync(errorPath, "mutation monitor terminal acknowledgement failed closed\n", { mode: 0o600 }); } catch {}
    process.exit(91);
  }
  closeWatchers();
  stopped = true;
  process.exit(0);
};
const scheduleTerminalStop = () => {
  stopping = true;
  if (terminalTimer) clearTimeout(terminalTimer);
  terminalTimer = setTimeout(finalizeStop, terminalQuietMs);
};
try {
  if (!Array.isArray(configuration) || !Number.isSafeInteger(parentPid) || parentPid <= 1
    || !Number.isSafeInteger(terminalQuietMs) || terminalQuietMs < 25
    || !["auto", "descriptor-sentinel"].includes(requestedWatchMode)
    || !["true", "false"].includes(recursiveAvailableText)
    || typeof sessionId !== "string" || sessionId.length === 0) throw new Error("invalid monitor bootstrap");
  for (const policy of configuration) {
    if (!exactKeys(policy, ["exactMetadataPaths", "exactMetadataRoots", "root"])
      || !Array.isArray(policy.exactMetadataPaths) || !Array.isArray(policy.exactMetadataRoots)
      || typeof policy.root !== "string" || !path.isAbsolute(policy.root)) {
      throw new Error("invalid monitor policy");
    }
  }
  for (const policy of configuration) {
    if (isGitCommonRoot(policy.root)) {
      objectControlObservations.set(policy.root, objectControlObservation(policy));
      packedRefsObservations.set(policy.root, packedRefsObservation(policy));
    }
  }
  startTypedFsevents();
  if (!typedFseventsEnabled) {
    refreshConfiguredSentinelPaths();
    if (requestedWatchMode === "auto" && recursiveAvailable) {
      rebuildSentinelRecords();
      bootstrapSentinelsCaptured = true;
    }
  }
  for (const policy of configuration) {
    const descriptor = fs.openSync(policy.root, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
      | (fs.constants.O_DIRECTORY ?? 0));
    rootDescriptors.push(descriptor);
    rootDescriptorRecords.push({
      descriptor,
      root: policy.root,
      shape: statShape(fs.fstatSync(descriptor, { bigint: true }))
    });
  }
  if (requestedWatchMode === "auto" && recursiveAvailable) {
    for (const policy of configuration) {
      let watcher;
      try {
        watcher = fs.watch(policy.root, { persistent: true, recursive: true }, (_eventType, filename) => {
          recordRecursiveEvent(policy, filename);
        });
      } catch (error) {
        if (error?.code === "EMFILE") {
          recursiveUnavailable = true;
          continue;
        }
        throw error;
      }
      watcher.on("error", (error) => {
        if (error?.code === "EMFILE") {
          recursiveUnavailable = true;
          if (!recursiveProbeActive) {
            for (const active of recursiveWatchers) {
              try { active.close(); } catch {}
            }
            recursiveWatchers.length = 0;
            watchMode = "descriptor-sentinel";
            sourceEpoch += 1;
            try { publishEpoch(); } catch (publishError) { fail(publishError); }
          }
          return;
        }
        fail(error);
      });
      recursiveWatchers.push(watcher);
    }
  } else {
    recursiveUnavailable = true;
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  recursiveProbeActive = false;
  if (recursiveUnavailable) {
    if (bootstrapSentinelsCaptured) {
      sampleSentinels({ excludePackedRefs: true, semanticDirectories: true });
      samplePackedRefsObservations();
      sampleObjectControlObservations();
    }
    for (const watcher of recursiveWatchers) {
      try { watcher.close(); } catch {}
    }
    recursiveWatchers.length = 0;
    watchMode = typedFseventsEnabled ? "descriptor-sentinel-fsevents" : "descriptor-sentinel";
    if (!typedFseventsEnabled && !bootstrapSentinelsCaptured) rebuildSentinelRecords();
  } else {
    sampleSentinels({ excludePackedRefs: true, semanticDirectories: true });
    samplePackedRefsObservations();
    sampleObjectControlObservations();
    closeSentinelRecords();
    watchMode = "recursive";
  }
  publishEpoch();
  fs.writeFileSync(readyPath, "ready\n", { mode: 0o600 });
} catch (error) {
  fail(error);
}
process.on("message", (message) => {
  if (exactKeys(message, ["requestId", "sessionId", "type"]) && message.type === "sample") {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    if (stopping || message.sessionId !== sessionId || !uuidPattern.test(message.requestId)) return fail();
    try {
      if (typedFseventsEnabled) {
        validateTypedRootAnchors();
        const fixed = reconcileTypedFseventsCycle();
        typedFseventsFixedPackage = fixed.fixedPackage;
        applyTypedFseventsPublication(fixed.publication);
      } else {
        sampleSentinels();
      }
      publishEpoch();
      publishJson(path.join(scratch, "sample-" + message.requestId + ".json"), {
        ...state(),
        requestId: message.requestId,
        status: "sampled"
      });
    } catch (error) { return fail(error); }
    return;
  }
  if (exactKeys(message, ["relativePath", "requestId", "root", "sessionId", "type"])
    && message.type === "register-metadata-root") {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    const transactionName = typeof message.relativePath === "string" ? path.posix.basename(message.relativePath) : "";
    const transactionMatch = transactionName.match(/^\.evidence-publish-([1-9][0-9]*)-([0-9a-f-]+)$/iu);
    if (stopping || message.sessionId !== sessionId || !uuidPattern.test(message.requestId)
      || typeof message.root !== "string" || !path.isAbsolute(message.root)
      || typeof message.relativePath !== "string" || message.relativePath.length === 0
      || path.isAbsolute(message.relativePath) || message.relativePath.includes("\\")
      || path.posix.normalize(message.relativePath) !== message.relativePath
      || path.posix.dirname(message.relativePath) !== "coordination/release-intake/archive"
      || !transactionMatch || Number(transactionMatch[1]) !== parentPid
      || !uuidPattern.test(transactionMatch[2])) return fail();
    const policy = configuration.find((item) => item.root === message.root);
    if (!policy || configuration.some((item) => item.exactMetadataRoots.length > 0)) return fail();
    const absoluteRoot = path.resolve(policy.root, ...message.relativePath.split("/"));
    const normalized = path.relative(policy.root, absoluteRoot).split(path.sep).join("/");
    let rootIsAbsent = false;
    try { fs.lstatSync(absoluteRoot); } catch (error) {
      if (error?.code !== "ENOENT") return fail(error);
      rootIsAbsent = true;
    }
    if (normalized !== message.relativePath || !isContainedBy(absoluteRoot, policy.root)
      || !rootIsAbsent) return fail();
    try {
      if (typedFseventsEnabled) {
        if (typedFseventsFixedPackage === null) {
          throw new Error("typed FSEvents metadata registration requires a fixed predecessor");
        }
        const previous = typedFseventsFixedPackage.reconciliation;
        const fixed = reconcileTypedFseventsCycle({
          exactMetadataRoots: [...typedExactMetadataRoots(), absoluteRoot]
        });
        const replacement = fixed.fixedPackage.reconciliation;
        if (replacement.sourceEpoch !== previous.sourceEpoch
          || replacement.metadataEpoch !== previous.metadataEpoch
          || replacement.xattrEpoch !== previous.xattrEpoch
          || !typedFseventsCountersEqual(replacement.counters, previous.counters)) {
          throw new Error("typed FSEvents metadata registration rebind was not empty");
        }
        policy.exactMetadataRoots.push(absoluteRoot);
        validateTypedRootAnchors();
        typedFseventsFixedPackage = fixed.fixedPackage;
        applyTypedFseventsPublication(fixed.publication);
        publishEpoch();
      } else {
        policy.exactMetadataRoots.push(absoluteRoot);
        dynamicSentinelPaths.add(absoluteRoot);
      }
      publishJson(path.join(scratch, "registration-" + message.requestId + ".json"), {
        schemaVersion: 1,
        status: "registered",
        sessionId,
        requestId: message.requestId,
        root: policy.root,
        relativePath: message.relativePath
      });
    } catch { return fail(); }
    return;
  }
  if (!exactKeys(message, [
    "expectedMetadataEpoch",
    "expectedSourceEpoch",
    "requestId",
    "sessionId",
    "terminalAttestationPath",
    "type"
  ]) || message.type !== "stop" || message.sessionId !== sessionId
    || typeof message.requestId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(message.requestId)
    || !Number.isSafeInteger(message.expectedSourceEpoch) || message.expectedSourceEpoch < 0
    || !Number.isSafeInteger(message.expectedMetadataEpoch) || message.expectedMetadataEpoch < 0
    || (message.terminalAttestationPath !== null
      && (typeof message.terminalAttestationPath !== "string" || !path.isAbsolute(message.terminalAttestationPath)))) return fail();
  terminalAttestationPath = message.terminalAttestationPath;
  expectedSourceEpoch = message.expectedSourceEpoch;
  expectedMetadataEpoch = message.expectedMetadataEpoch;
  scheduleTerminalStop();
});
process.on("disconnect", orphan);
setInterval(() => {
  if (process.ppid !== parentPid) return orphan();
  try { process.kill(parentPid, 0); } catch { orphan(); }
}, 100);
`;

export function inspectMutationMonitorChildSource() {
  const source = MUTATION_MONITOR_CHILD_SOURCE;
  return Object.freeze({
    bytes: Buffer.byteLength(source),
    sha256: sha256Buffer(Buffer.from(source)),
    source
  });
}

export function inspectTypedFseventsReconciliationChildSource() {
  const source = TYPED_FSEVENTS_RECONCILIATION_CHILD_SOURCE;
  return Object.freeze({
    bytes: Buffer.byteLength(source),
    sha256: sha256Buffer(Buffer.from(source)),
    source
  });
}

function synchronousWait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const MUTATION_MONITOR_CHILD_STATUS_CACHE = new WeakMap();
const MUTATION_MONITOR_CHILD_ERRORS = new WeakMap();
const MUTATION_MONITOR_CHILD_STATUS_CACHE_MS = 75;
let MUTATION_MONITOR_LOGICAL_READ_COUNT = 0;
let MUTATION_MONITOR_PS_INSPECTION_COUNT = 0;

export function inspectMutationMonitorLivenessDiagnostics() {
  return Object.freeze({
    logicalReadCount: MUTATION_MONITOR_LOGICAL_READ_COUNT,
    psInspectionCount: MUTATION_MONITOR_PS_INSPECTION_COUNT
  });
}

function recordMutationMonitorChildError(child, error) {
  const code = typeof error?.code === "string" && error.code.length > 0
    ? error.code
    : "CHILD_PROCESS_ERROR";
  MUTATION_MONITOR_CHILD_ERRORS.set(child, code);
  MUTATION_MONITOR_CHILD_STATUS_CACHE.set(child, {
    alive: false,
    checkedAtMs: Date.now()
  });
}

function observeMutationMonitorChildErrors(child) {
  const record = (error) => recordMutationMonitorChildError(child, error);
  child.on("error", record);
  child.channel?.on?.("error", record);
}

function mutationMonitorChildIsAlive(child, {
  cachedOnly = false,
  fresh = false
} = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null
    || !Number.isSafeInteger(child.pid) || child.pid <= 1) return false;
  if (MUTATION_MONITOR_CHILD_ERRORS.has(child)) return false;
  if (!processIsAlive(child.pid)) return false;
  const now = Date.now();
  const cached = MUTATION_MONITOR_CHILD_STATUS_CACHE.get(child);
  if (cachedOnly) return cached?.alive ?? true;
  if (!fresh && cached && now - cached.checkedAtMs < MUTATION_MONITOR_CHILD_STATUS_CACHE_MS) {
    return cached.alive;
  }
  const supportsProcessStateInspection = ["darwin", "linux"].includes(process.platform)
    && fs.existsSync("/bin/ps");
  if (!supportsProcessStateInspection) {
    const alive = processIsAlive(child.pid);
    MUTATION_MONITOR_CHILD_STATUS_CACHE.set(child, {
      alive,
      checkedAtMs: Date.now()
    });
    return alive;
  }
  MUTATION_MONITOR_PS_INSPECTION_COUNT += 1;
  const status = spawnSync("/bin/ps", ["-o", "state=", "-p", String(child.pid)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 250
  });
  const state = typeof status.stdout === "string" ? status.stdout.trim() : "";
  const inspectionFailed = Boolean(status.error) || status.status !== 0 || state.length === 0;
  const alive = inspectionFailed
    ? process.platform !== "darwin" && processIsAlive(child.pid)
    : !state.startsWith("Z");
  MUTATION_MONITOR_CHILD_STATUS_CACHE.set(child, { alive, checkedAtMs: Date.now() });
  return alive;
}

function assertRelativeMonitorPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)
    || value.split("/").includes("..") || value.includes("\\") || path.posix.normalize(value) !== value) {
    throw new Error(`${label} must be a canonical repository-relative POSIX path`);
  }
  return value;
}

function mutationMonitorOperationTimeout(monitor, minimumMs = 5_000) {
  if (monitor?.eventBackend === TYPED_FSEVENTS_EVENT_BACKEND) return 325_000;
  const coverage = Number.isSafeInteger(monitor?.coveragePathCount) ? monitor.coveragePathCount : 0;
  return Math.min(120_000, Math.max(minimumMs, minimumMs + Math.ceil(coverage / 5_000) * 1_000));
}

function directoryTimestampPolicyForRequestedWatchMode(requestedWatchMode) {
  if (requestedWatchMode === "auto") return "strict";
  if (requestedWatchMode === "descriptor-sentinel") return "semantic-directory";
  return null;
}

function validMutationMonitorStateValues(value, monitor) {
  const expectedDirectoryTimestampPolicy = directoryTimestampPolicyForRequestedWatchMode(
    value.requestedWatchMode
  );
  const monitorDirectoryTimestampPolicy = directoryTimestampPolicyForRequestedWatchMode(
    monitor.requestedWatchMode
  );
  return value.schemaVersion === MUTATION_MONITOR_SCHEMA_VERSION
    && value.sessionId === monitor.sessionId
    && ["auto", "descriptor-sentinel"].includes(value.requestedWatchMode)
    && ["strict", "semantic-directory"].includes(value.directoryTimestampPolicy)
    && ["auto", "descriptor-sentinel"].includes(monitor.requestedWatchMode)
    && ["strict", "semantic-directory"].includes(monitor.directoryTimestampPolicy)
    && monitor.directoryTimestampPolicy === monitorDirectoryTimestampPolicy
    && value.requestedWatchMode === monitor.requestedWatchMode
    && value.directoryTimestampPolicy === monitor.directoryTimestampPolicy
    && value.directoryTimestampPolicy === expectedDirectoryTimestampPolicy
    && Number.isSafeInteger(value.sourceEpoch) && value.sourceEpoch >= 0
    && Number.isSafeInteger(value.metadataEpoch) && value.metadataEpoch >= 0
    && Number.isSafeInteger(value.xattrEpoch) && value.xattrEpoch >= 0
    && Number.isSafeInteger(value.coveragePathCount) && value.coveragePathCount >= 1
    && Number.isSafeInteger(value.fdCount) && value.fdCount >= 1
    && Number.isSafeInteger(value.rootFdCount) && value.rootFdCount >= 1
    && value.fdCount === value.rootFdCount
    && ["recursive", "descriptor-sentinel", "descriptor-sentinel-fsevents"].includes(value.watchMode)
    && (value.requestedWatchMode !== "descriptor-sentinel"
      || ["descriptor-sentinel", "descriptor-sentinel-fsevents"].includes(value.watchMode))
    && typeof value.coverageFingerprint === "string"
    && SHA256_PATTERN.test(value.coverageFingerprint)
    && [NON_TYPED_EVENT_BACKEND, TYPED_FSEVENTS_EVENT_BACKEND].includes(value.eventBackend)
    && [null, TYPED_FSEVENTS_HELPER_PROTOCOL_VERSION].includes(value.helperProtocolVersion)
    && [STRICT_CTIME_POLICY, TYPED_FSEVENTS_CTIME_POLICY].includes(value.regularFileCtimePolicy)
    && validTypedFseventsState(value.typedFsevents, value)
    && value.eventBackend === monitor.eventBackend
    && value.helperProtocolVersion === monitor.helperProtocolVersion
    && value.regularFileCtimePolicy === monitor.regularFileCtimePolicy;
}

export function calculateMutationMonitorQuiescenceTimeout({
  coveragePathCount,
  quietMs = 300
} = {}) {
  if (!Number.isSafeInteger(coveragePathCount) || coveragePathCount < 1) {
    throw new Error("mutation monitor coverage path count must be a positive safe integer");
  }
  if (!Number.isSafeInteger(quietMs) || quietMs < 25 || quietMs > 2_000) {
    throw new Error("mutation monitor quiescence quiet period must be a safe integer from 25 through 2000 milliseconds");
  }
  const sampleTimeoutMs = mutationMonitorOperationTimeout({ coveragePathCount });
  return (sampleTimeoutMs * 2) + quietMs + 1_000;
}

function requestMutationMonitorSample(monitor, maximumWaitMs) {
  if (maximumWaitMs !== undefined && (!Number.isSafeInteger(maximumWaitMs) || maximumWaitMs <= 0)) {
    throw new Error("mutation monitor descriptor sample maximum wait must be a positive safe integer");
  }
  const operationTimeoutMs = mutationMonitorOperationTimeout(monitor);
  const timeoutMs = maximumWaitMs === undefined
    ? operationTimeoutMs
    : Math.min(operationTimeoutMs, maximumWaitMs);
  const deadline = Date.now() + timeoutMs;
  const requestId = crypto.randomUUID();
  const acknowledgementPath = path.join(monitor.scratch, `sample-${requestId}.json`);
  let sent = false;
  try {
    sent = monitor.child.send(
      { type: "sample", sessionId: monitor.sessionId, requestId },
      (error) => {
        if (error) recordMutationMonitorChildError(monitor.child, error);
      }
    );
  } catch {
    throw new Error("mutation monitor descriptor sample request failed");
  }
  if (!sent) throw new Error("mutation monitor descriptor sample request failed");
  while (!fs.existsSync(acknowledgementPath)) {
    if (fs.existsSync(monitor.errorPath) || !mutationMonitorChildIsAlive(monitor.child)) {
      const detail = fs.existsSync(monitor.errorPath)
        ? fs.readFileSync(monitor.errorPath, "utf8").trim()
        : "monitor child exited";
      throw new Error(`mutation monitor descriptor sample failed closed (${detail})`);
    }
    if (Date.now() >= deadline) throw new Error("mutation monitor descriptor sample acknowledgement timed out");
    synchronousWait(Math.min(20, Math.max(1, deadline - Date.now())));
  }
  if (Date.now() >= deadline) {
    fs.rmSync(acknowledgementPath, { force: true });
    throw new Error("mutation monitor descriptor sample acknowledgement timed out");
  }
  let acknowledgement;
  try {
    acknowledgement = JSON.parse(fs.readFileSync(acknowledgementPath, "utf8"));
  } catch {
    throw new Error("mutation monitor descriptor sample acknowledgement is invalid");
  } finally {
    fs.rmSync(acknowledgementPath, { force: true });
  }
  if (!exactKeys(acknowledgement, [
    ...MUTATION_MONITOR_STATE_KEYS,
    "requestId",
    "status"
  ]) || acknowledgement.status !== "sampled" || acknowledgement.requestId !== requestId
    || !validMutationMonitorStateValues(acknowledgement, monitor)) {
    throw new Error("mutation monitor descriptor sample acknowledgement schema is invalid");
  }
  if (fs.existsSync(monitor.errorPath)
    || !mutationMonitorChildIsAlive(monitor.child, { fresh: true })) {
    throw new Error("mutation monitor descriptor sample child exited after acknowledgement");
  }
}

export function readMutationEpochState(monitor, {
  requireAlive = true,
  requestSample = true,
  sampleTimeoutMs
} = {}) {
  if (!monitor || monitor.stopped) throw new Error("mutation monitor is not active");
  MUTATION_MONITOR_LOGICAL_READ_COUNT += 1;
  if (fs.existsSync(monitor.errorPath)
    || (requireAlive
      && !mutationMonitorChildIsAlive(monitor.child, { cachedOnly: true }))) {
    const detail = fs.existsSync(monitor.errorPath)
      ? fs.readFileSync(monitor.errorPath, "utf8").trim()
      : "monitor child exited";
    throw new Error(`mutation monitor crashed; final evidence fails closed (${detail})`);
  }
  if (requestSample && requireAlive) requestMutationMonitorSample(monitor, sampleTimeoutMs);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(monitor.epochPath, "utf8"));
  } catch {
    throw new Error("mutation monitor epoch is unavailable or invalid");
  }
  if (!exactKeys(value, MUTATION_MONITOR_STATE_KEYS) || !validMutationMonitorStateValues(value, monitor)) {
    throw new Error("mutation monitor epoch is invalid");
  }
  if (requireAlive && (fs.existsSync(monitor.errorPath)
    || !mutationMonitorChildIsAlive(
      monitor.child,
      requestSample ? { cachedOnly: true } : { fresh: true }
    ))) {
    const detail = fs.existsSync(monitor.errorPath)
      ? fs.readFileSync(monitor.errorPath, "utf8").trim()
      : "monitor child exited";
    throw new Error(`mutation monitor crashed; final evidence fails closed (${detail})`);
  }
  return value;
}

function childProcessHandleAlive(child) {
  return mutationMonitorChildIsAlive(child);
}

function readDiagnosticTypedHelperPid(pidPath) {
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      pidPath,
      fs.constants.O_RDONLY
        | (fs.constants.O_NOFOLLOW ?? 0)
        | (fs.constants.O_NONBLOCK ?? 0)
    );
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile()
      || (before.mode & 0o7777n) !== 0o600n
      || before.uid !== BigInt(process.geteuid())
      || before.nlink !== 1n
      || before.size < 10n
      || before.size > 128n) return null;
    const payloadBuffer = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(pidPath, { bigint: true });
    if (!sameTypedFseventsFrameSnapshot(before, after)
      || !sameTypedFseventsFrameSnapshot(after, visible)
      || payloadBuffer.length !== Number(before.size)) return null;
    const payload = JSON.parse(payloadBuffer.toString("utf8"));
    if (!exactKeys(payload, ["pid"])
      || !Number.isSafeInteger(payload.pid)
      || payload.pid <= 1) return null;
    return payload.pid;
  } catch {
    return null;
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
  }
}

function cleanupMutationMonitor(monitor, signal = "SIGKILL") {
  if (!monitor) return;
  if (childProcessHandleAlive(monitor.child)) {
    try { monitor.child.kill(signal); } catch {}
    const deadline = Date.now() + 1_000;
    while (childProcessHandleAlive(monitor.child) && Date.now() < deadline) synchronousWait(20);
  }
  try { monitor.child?.disconnect?.(); } catch {}
  fs.rmSync(monitor.scratch, { recursive: true, force: true });
  monitor.stopped = true;
}

export function startMutationEpochMonitor(paths, {
  startupTimeoutMs = 120_000,
  terminalQuietMs = 100,
  transactionMetadata,
  trustedGitCommonDir = null,
  watchMode = "auto"
} = {}) {
  if (!["auto", "descriptor-sentinel"].includes(watchMode)) {
    throw new Error("mutation monitor watch mode must be auto or descriptor-sentinel");
  }
  const roots = [...new Set(paths.map((item) => fs.realpathSync(item)))];
  if (roots.length === 0) throw new Error("mutation monitor requires at least one watched root");
  for (const root of roots) {
    const stat = fs.lstatSync(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("mutation monitor root must be a direct directory");
  }
  const policies = roots.map((root) => ({
    root,
    exactMetadataPaths: [],
    exactMetadataRoots: []
  }));
  const requestedMetadataPolicies = transactionMetadata === undefined
    ? []
    : Array.isArray(transactionMetadata)
      ? transactionMetadata
      : [transactionMetadata];
  for (const requestedPolicy of requestedMetadataPolicies) {
    if (!requestedPolicy || typeof requestedPolicy !== "object") throw new Error("transaction metadata monitor policy is invalid");
    if (!exactKeys(requestedPolicy, ["exactRelativePaths", "root"])) {
      throw new Error("transaction metadata prefix policies are unsupported; only an exact path set is accepted");
    }
    const transactionRoot = fs.realpathSync(requestedPolicy.root);
    const policy = policies.find((item) => item.root === transactionRoot);
    if (!policy) throw new Error("transaction metadata monitor root is not watched");
    const exactMetadataPaths = requestedPolicy.exactRelativePaths
      .map((item) => assertRelativeMonitorPath(item, "transaction metadata path"));
    if (exactMetadataPaths.length === 0) {
      throw new Error("transaction metadata monitor policy requires exact paths");
    }
    policy.exactMetadataPaths = [...new Set([...policy.exactMetadataPaths, ...exactMetadataPaths])].sort();
  }
  if (!Number.isSafeInteger(terminalQuietMs) || terminalQuietMs < 25 || terminalQuietMs > 2_000) {
    throw new Error("mutation monitor terminal quiet period is invalid");
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-mutation-epoch-"));
  fs.chmodSync(scratch, 0o700);
  const epochPath = path.join(scratch, "epoch");
  const readyPath = path.join(scratch, "ready");
  const errorPath = path.join(scratch, "error");
  const stoppedPath = path.join(scratch, "stopped");
  const sessionId = crypto.randomUUID();
  const supportsRecursiveWatch = watchMode === "auto" ? recursiveWatchAvailable() : false;
  let typedFseventsBootstrap = null;
  try {
    typedFseventsBootstrap = prepareTypedFseventsBootstrap({
      roots,
      scratch,
      trustedGitCommonDir,
      watchMode
    });
  } catch (error) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw error;
  }
  const configurationPath = path.join(scratch, "bootstrap.json");
  const configurationBuffer = Buffer.from(`${JSON.stringify({
    configuration: policies,
    epochPath,
    readyPath,
    errorPath,
    stoppedPath,
    scratch,
    parentPidText: String(process.pid),
    requestedWatchModeText: watchMode,
    sessionId,
    terminalQuietMsText: String(terminalQuietMs),
    recursiveAvailableText: String(supportsRecursiveWatch),
    typedFseventsBootstrap
  })}\n`);
  const configurationDescriptor = fs.openSync(
    configurationPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
    0o600
  );
  try {
    fs.writeFileSync(configurationDescriptor, configurationBuffer);
    fs.fsyncSync(configurationDescriptor);
  } finally {
    fs.closeSync(configurationDescriptor);
  }
  fsyncDirectory(scratch);
  const configurationHash = sha256Buffer(configurationBuffer);
  const bootstrapArgs = [configurationPath, configurationHash];
  const childSourcePath = path.join(scratch, "mutation-monitor-child.mjs");
  const childSourceBuffer = Buffer.from(MUTATION_MONITOR_CHILD_SOURCE);
  const childSourceSha256 = sha256Buffer(childSourceBuffer);
  createPrivateMonitorFile(childSourcePath, childSourceBuffer, 0o400);
  fsyncDirectory(scratch);
  const childSourceEndpoint = readStableRegularFileNoFollow(childSourcePath, {
    expectedMode: 0o400,
    maxBytes: 16 * 1024 * 1024
  });
  if (childSourceEndpoint === null
    || !childSourceEndpoint.buffer.equals(childSourceBuffer)
    || sha256Buffer(childSourceEndpoint.buffer) !== childSourceSha256) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw new Error("mutation monitor child source is unsafe");
  }
  let childSourceDescriptor = -1;
  let child;
  try {
    childSourceDescriptor = fs.openSync(
      childSourcePath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
    );
    const heldSource = fs.fstatSync(childSourceDescriptor, { bigint: true });
    const visibleSource = fs.lstatSync(childSourcePath, { bigint: true });
    if (!sameTypedFseventsFrameSnapshot(heldSource, childSourceEndpoint.status)
      || !sameTypedFseventsFrameSnapshot(childSourceEndpoint.status, visibleSource)
      || !heldSource.isFile()
      || (heldSource.mode & 0o7777n) !== 0o400n
      || heldSource.uid !== BigInt(process.geteuid())
      || heldSource.nlink !== 1n) {
      throw new Error("mutation monitor child source descriptor is unsafe");
    }
    child = spawn(process.execPath, ["--import=/dev/fd/4", "-", ...bootstrapArgs], {
      env: process.env,
      stdio: ["ignore", "ignore", "ignore", "ipc", childSourceDescriptor]
    });
    observeMutationMonitorChildErrors(child);
  } catch (error) {
    fs.rmSync(scratch, { recursive: true, force: true });
    throw error;
  } finally {
    if (childSourceDescriptor >= 0) fs.closeSync(childSourceDescriptor);
  }
  child.unref();
  child.channel?.unref?.();
  const effectiveStartupTimeoutMs = typedFseventsBootstrap
    ? Math.max(startupTimeoutMs, 350_000)
    : startupTimeoutMs;
  const deadline = Date.now() + effectiveStartupTimeoutMs;
  while (!fs.existsSync(readyPath)) {
    if (fs.existsSync(errorPath) || !mutationMonitorChildIsAlive(child)) {
      const detail = fs.existsSync(errorPath) ? fs.readFileSync(errorPath, "utf8").trim() : "monitor child exited";
      cleanupMutationMonitor({ child, scratch, stopped: false });
      throw new Error(`mutation monitor startup failed closed (${detail})`);
    }
    if (Date.now() >= deadline) {
      cleanupMutationMonitor({ child, scratch, stopped: false });
      throw new Error("mutation monitor startup timed out");
    }
    synchronousWait(20);
  }
  const monitor = {
    child,
    directoryTimestampPolicy: directoryTimestampPolicyForRequestedWatchMode(watchMode),
    eventBackend: typedFseventsBootstrap ? TYPED_FSEVENTS_EVENT_BACKEND : NON_TYPED_EVENT_BACKEND,
    helperProtocolVersion: typedFseventsBootstrap ? TYPED_FSEVENTS_HELPER_PROTOCOL_VERSION : null,
    metadataOwnerPid: process.pid,
    regularFileCtimePolicy: typedFseventsBootstrap ? TYPED_FSEVENTS_CTIME_POLICY : STRICT_CTIME_POLICY,
    epochPath,
    readyPath,
    errorPath,
    stoppedPath,
    scratch,
    roots,
    policies,
    requestedWatchMode: watchMode,
    sessionId,
    stopped: false,
    stopAcknowledged: false,
    terminalAttestation: null,
    registeredMetadataRoot: null,
    bootstrapArgBytes: Buffer.byteLength(bootstrapArgs.join("\0")),
    childSourceBytes: childSourceBuffer.length,
    childSourceDescriptorNumber: 4,
    childSourceExecutionPath: "/dev/fd/4",
    childSourcePath,
    childSourceSha256,
    typedFseventsAckCommitPath: typedFseventsBootstrap?.ackCommitPath ?? null,
    typedFseventsAckPath: typedFseventsBootstrap?.ackPath ?? null,
    typedFseventsBinaryPath: typedFseventsBootstrap?.binaryPath ?? null,
    typedFseventsCommandPath: typedFseventsBootstrap?.commandPath ?? null,
    typedFseventsJournalPath: typedFseventsBootstrap?.journalPath ?? null,
    typedFseventsRootsPath: typedFseventsBootstrap?.rootsPath ?? null,
    typedFseventsRuntimeScratch: typedFseventsBootstrap?.runtimeScratch ?? null,
    typedFseventsPid: null,
    typedHelperReadyBeforeDescriptorBaseline: false
  };
  try {
    const initialState = readMutationEpochState(monitor, { requestSample: false });
    monitor.watchMode = initialState.watchMode;
    monitor.coverageFingerprint = initialState.coverageFingerprint;
    monitor.coveragePathCount = initialState.coveragePathCount;
    monitor.rootFdCount = initialState.rootFdCount;
    if (typedFseventsBootstrap) {
      const typedFseventsPid = readDiagnosticTypedHelperPid(typedFseventsBootstrap.typedHelperPidPath);
      if (typedFseventsPid === null
        || !processIsAlive(typedFseventsPid)
        || initialState.watchMode !== "descriptor-sentinel-fsevents"
        || initialState.eventBackend !== TYPED_FSEVENTS_EVENT_BACKEND
        || !initialState.typedFsevents.enabled) {
        throw new Error("typed FSEvents READY provenance is invalid");
      }
      monitor.typedFseventsPid = typedFseventsPid;
      monitor.typedHelperReadyBeforeDescriptorBaseline = true;
    }
    return monitor;
  } catch (error) {
    cleanupMutationMonitor(monitor);
    throw error;
  }
}

export function registerMutationMetadataRoot(monitor, {
  root,
  relativePath
} = {}) {
  if (!monitor || monitor.stopped) throw new Error("mutation monitor metadata registration requires an active monitor");
  readMutationEpochState(monitor);
  const canonicalRoot = fs.realpathSync(root);
  const policy = monitor.policies.find((item) => item.root === canonicalRoot);
  if (!policy) throw new Error("transaction metadata registration root is not watched");
  const normalizedRelativePath = assertRelativeMonitorPath(relativePath, "transaction metadata root");
  const expectedParent = path.posix.dirname(TRANSACTION_METADATA_PATHS[0]);
  const transactionName = path.posix.basename(normalizedRelativePath);
  const transactionMatch = transactionName.match(/^\.evidence-publish-([1-9][0-9]*)-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu);
  if (path.posix.dirname(normalizedRelativePath) !== expectedParent
    || !transactionMatch || Number(transactionMatch[1]) !== monitor.metadataOwnerPid
    || !UUID_PATTERN.test(transactionMatch[2])) {
    throw new Error("transaction metadata root must be one exact writer-owned PID and canonical UUID path");
  }
  if (monitor.registeredMetadataRoot !== null) {
    throw new Error("mutation monitor already has one dynamically registered exact metadata root");
  }
  const absoluteRoot = path.resolve(canonicalRoot, ...normalizedRelativePath.split("/"));
  if (!isWithin(absoluteRoot, canonicalRoot)
    || lstatIfPresent(absoluteRoot, "transaction metadata root") !== null) {
    throw new Error("transaction metadata root must be absent and contained by the watched root");
  }
  const requestId = crypto.randomUUID();
  const acknowledgementPath = path.join(monitor.scratch, `registration-${requestId}.json`);
  const request = {
    type: "register-metadata-root",
    sessionId: monitor.sessionId,
    requestId,
    root: canonicalRoot,
    relativePath: normalizedRelativePath
  };
  let sent = false;
  try {
    sent = monitor.child.send(request, (error) => {
      if (error) recordMutationMonitorChildError(monitor.child, error);
    });
  } catch {
    throw new Error("mutation monitor exact metadata registration request failed");
  }
  if (!sent) throw new Error("mutation monitor exact metadata registration request failed");
  const deadline = Date.now() + mutationMonitorOperationTimeout(monitor);
  while (!fs.existsSync(acknowledgementPath)) {
    if (fs.existsSync(monitor.errorPath) || !mutationMonitorChildIsAlive(monitor.child)) {
      throw new Error("mutation monitor exact metadata registration acknowledgement failed closed");
    }
    if (Date.now() >= deadline) throw new Error("mutation monitor exact metadata registration acknowledgement timed out");
    synchronousWait(20);
  }
  let acknowledgement;
  try {
    acknowledgement = JSON.parse(fs.readFileSync(acknowledgementPath, "utf8"));
  } catch {
    throw new Error("mutation monitor exact metadata registration acknowledgement is invalid");
  } finally {
    fs.rmSync(acknowledgementPath, { force: true });
  }
  if (!exactKeys(acknowledgement, [
    "relativePath",
    "requestId",
    "root",
    "schemaVersion",
    "sessionId",
    "status"
  ]) || acknowledgement.schemaVersion !== 1 || acknowledgement.status !== "registered"
    || acknowledgement.sessionId !== monitor.sessionId || acknowledgement.requestId !== requestId
    || acknowledgement.root !== canonicalRoot || acknowledgement.relativePath !== normalizedRelativePath) {
    throw new Error("mutation monitor exact metadata registration acknowledgement schema is invalid");
  }
  if (fs.existsSync(monitor.errorPath)
    || !mutationMonitorChildIsAlive(monitor.child, { fresh: true })) {
    throw new Error("mutation monitor exact metadata registration child exited after acknowledgement");
  }
  policy.exactMetadataRoots.push(absoluteRoot);
  monitor.registeredMetadataRoot = absoluteRoot;
  return acknowledgement;
}

export function readMutationEpoch(monitor) {
  return readMutationEpochState(monitor).sourceEpoch;
}

export function settleMutationEpochState(monitor, { quietMs = 300, timeoutMs } = {}) {
  if (monitor?.eventBackend === TYPED_FSEVENTS_EVENT_BACKEND) {
    calculateMutationMonitorQuiescenceTimeout({
      coveragePathCount: monitor.coveragePathCount,
      quietMs
    });
    if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
      throw new Error("mutation monitor explicit timeout must be a positive safe integer");
    }
    const typedCapMs = mutationMonitorOperationTimeout(monitor);
    if (timeoutMs !== undefined && timeoutMs > typedCapMs) {
      throw new Error("mutation monitor explicit timeout exceeds the typed-operation absolute cap");
    }
    return readMutationEpochState(monitor, {
      sampleTimeoutMs: timeoutMs ?? typedCapMs
    });
  }
  const absoluteCapMs = calculateMutationMonitorQuiescenceTimeout({
    coveragePathCount: monitor?.coveragePathCount,
    quietMs
  });
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
    throw new Error("mutation monitor explicit timeout must be a positive safe integer");
  }
  if (timeoutMs !== undefined && timeoutMs > absoluteCapMs) {
    throw new Error("mutation monitor explicit timeout exceeds the coverage-scaled absolute cap");
  }
  const effectiveTimeoutMs = timeoutMs ?? absoluteCapMs;
  const deadline = Date.now() + effectiveTimeoutMs;
  const readBeforeDeadline = () => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error("mutation monitor did not reach bounded quiescence");
    const state = readMutationEpochState(monitor, { sampleTimeoutMs: remainingMs });
    if (Date.now() >= deadline) throw new Error("mutation monitor did not reach bounded quiescence");
    return state;
  };
  let state = readBeforeDeadline();
  let stableSince = Date.now();
  while (Date.now() - stableSince < quietMs) {
    if (Date.now() >= deadline) throw new Error("mutation monitor did not reach bounded quiescence");
    synchronousWait(Math.min(
      MUTATION_MONITOR_CHILD_STATUS_CACHE_MS,
      quietMs,
      Math.max(1, deadline - Date.now())
    ));
    const current = readBeforeDeadline();
    if (current.sourceEpoch !== state.sourceEpoch || current.metadataEpoch !== state.metadataEpoch) {
      stableSince = Date.now();
    }
    state = current;
  }
  return state;
}

export function settleMutationEpoch(monitor, options = {}) {
  return settleMutationEpochState(monitor, options).sourceEpoch;
}

export function abortMutationEpochMonitor(monitor) {
  if (!monitor || monitor.stopped) return;
  cleanupMutationMonitor(monitor);
}

export function assertMutationTerminalAttestation(attestation, {
  sessionId,
  sourceEpoch,
  metadataEpoch,
  xattrEpoch,
  watchMode,
  requestedWatchMode,
  directoryTimestampPolicy,
  eventBackend,
  helperProtocolVersion,
  regularFileCtimePolicy,
  typedFsevents,
  coverageFingerprint,
  coveragePathCount,
  fdCount,
  rootFdCount
} = {}) {
  if (!exactKeys(attestation, [...MUTATION_MONITOR_STATE_KEYS, "status"])
    || attestation.schemaVersion !== MUTATION_MONITOR_SCHEMA_VERSION
    || attestation.status !== "stopped"
    || typeof attestation.sessionId !== "string"
    || !UUID_PATTERN.test(attestation.sessionId)
    || !Number.isSafeInteger(attestation.sourceEpoch)
    || attestation.sourceEpoch < 0
    || !Number.isSafeInteger(attestation.metadataEpoch)
    || attestation.metadataEpoch < 0
    || !Number.isSafeInteger(attestation.xattrEpoch)
    || attestation.xattrEpoch < 0
    || !Number.isSafeInteger(attestation.coveragePathCount) || attestation.coveragePathCount < 1
    || !Number.isSafeInteger(attestation.fdCount) || attestation.fdCount < 1
    || !Number.isSafeInteger(attestation.rootFdCount) || attestation.rootFdCount < 1
    || attestation.fdCount !== attestation.rootFdCount
    || !["recursive", "descriptor-sentinel", "descriptor-sentinel-fsevents"].includes(attestation.watchMode)
    || !["auto", "descriptor-sentinel"].includes(attestation.requestedWatchMode)
    || attestation.directoryTimestampPolicy
      !== directoryTimestampPolicyForRequestedWatchMode(attestation.requestedWatchMode)
    || (attestation.requestedWatchMode === "descriptor-sentinel"
      && !["descriptor-sentinel", "descriptor-sentinel-fsevents"].includes(attestation.watchMode))
    || typeof attestation.coverageFingerprint !== "string"
    || !SHA256_PATTERN.test(attestation.coverageFingerprint)
    || ![NON_TYPED_EVENT_BACKEND, TYPED_FSEVENTS_EVENT_BACKEND].includes(attestation.eventBackend)
    || ![null, TYPED_FSEVENTS_HELPER_PROTOCOL_VERSION].includes(attestation.helperProtocolVersion)
    || ![STRICT_CTIME_POLICY, TYPED_FSEVENTS_CTIME_POLICY].includes(attestation.regularFileCtimePolicy)
    || !validTypedFseventsState(attestation.typedFsevents, attestation)) {
    throw new Error("mutation monitor terminal attestation fields are invalid");
  }
  if (sessionId !== undefined && attestation.sessionId !== sessionId) {
    throw new Error("mutation monitor terminal attestation session is invalid");
  }
  if (sourceEpoch !== undefined && attestation.sourceEpoch !== sourceEpoch) {
    throw new Error("mutation monitor terminal attestation source epoch is invalid");
  }
  if (metadataEpoch !== undefined && attestation.metadataEpoch !== metadataEpoch) {
    throw new Error("mutation monitor terminal attestation metadata epoch is invalid");
  }
  if (xattrEpoch !== undefined && attestation.xattrEpoch !== xattrEpoch) {
    throw new Error("mutation monitor terminal attestation xattr epoch is invalid");
  }
  if (watchMode !== undefined && attestation.watchMode !== watchMode) {
    throw new Error("mutation monitor terminal attestation watch mode is invalid");
  }
  if (requestedWatchMode !== undefined && attestation.requestedWatchMode !== requestedWatchMode) {
    throw new Error("mutation monitor terminal attestation requested watch mode is invalid");
  }
  if (directoryTimestampPolicy !== undefined
    && attestation.directoryTimestampPolicy !== directoryTimestampPolicy) {
    throw new Error("mutation monitor terminal attestation directory timestamp policy is invalid");
  }
  if (eventBackend !== undefined && attestation.eventBackend !== eventBackend) {
    throw new Error("mutation monitor terminal attestation event backend is invalid");
  }
  if (helperProtocolVersion !== undefined && attestation.helperProtocolVersion !== helperProtocolVersion) {
    throw new Error("mutation monitor terminal attestation helper protocol is invalid");
  }
  if (regularFileCtimePolicy !== undefined
    && attestation.regularFileCtimePolicy !== regularFileCtimePolicy) {
    throw new Error("mutation monitor terminal attestation regular file ctime policy is invalid");
  }
  if (typedFsevents !== undefined && stableJson(attestation.typedFsevents) !== stableJson(typedFsevents)) {
    throw new Error("mutation monitor terminal attestation typed FSEvents binding is invalid");
  }
  if (coverageFingerprint !== undefined && attestation.coverageFingerprint !== coverageFingerprint) {
    throw new Error("mutation monitor terminal attestation coverage fingerprint is invalid");
  }
  if (coveragePathCount !== undefined && attestation.coveragePathCount !== coveragePathCount) {
    throw new Error("mutation monitor terminal attestation coverage count is invalid");
  }
  if (fdCount !== undefined && attestation.fdCount !== fdCount) {
    throw new Error("mutation monitor terminal attestation descriptor count is invalid");
  }
  if (rootFdCount !== undefined && attestation.rootFdCount !== rootFdCount) {
    throw new Error("mutation monitor terminal attestation root descriptor count is invalid");
  }
  return attestation;
}

export function stopMutationEpochMonitor(monitor, {
  expectedEpoch,
  expectedMetadataEpoch,
  terminalAttestationPath = null
} = {}) {
  if (!monitor) throw new Error("mutation monitor terminal stop requires an active monitor");
  if (monitor.stopped) {
    if (monitor.terminalAttestation) return monitor.terminalAttestation;
    throw new Error("mutation monitor terminal acknowledgement is unavailable");
  }
  let failure;
  let attestation;
  try {
    const beforeStop = readMutationEpochState(monitor);
    const requiredEpoch = expectedEpoch === undefined ? beforeStop.sourceEpoch : expectedEpoch;
    const requiredMetadataEpoch = expectedMetadataEpoch === undefined
      ? beforeStop.metadataEpoch
      : expectedMetadataEpoch;
    if (!Number.isSafeInteger(requiredEpoch) || requiredEpoch < 0 || beforeStop.sourceEpoch !== requiredEpoch) {
      throw new Error("mutation monitor terminal epoch does not match the expected source epoch");
    }
    if (terminalAttestationPath !== null) {
      if (typeof terminalAttestationPath !== "string" || !path.isAbsolute(terminalAttestationPath)) {
        throw new Error("mutation monitor terminal attestation path must be absolute");
      }
      if (fs.existsSync(terminalAttestationPath)) {
        const stat = fs.lstatSync(terminalAttestationPath);
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("mutation monitor terminal attestation target is unsafe");
      }
    }
    if (!Number.isSafeInteger(requiredMetadataEpoch) || requiredMetadataEpoch < 0
      || beforeStop.metadataEpoch !== requiredMetadataEpoch) {
      throw new Error("mutation monitor metadata epoch does not match the expected terminal epoch");
    }
    const requestId = crypto.randomUUID();
    if (!monitor.child.send({
      type: "stop",
      sessionId: monitor.sessionId,
      requestId,
      expectedSourceEpoch: requiredEpoch,
      expectedMetadataEpoch: requiredMetadataEpoch,
      terminalAttestationPath
    }, (error) => {
      if (error) recordMutationMonitorChildError(monitor.child, error);
    })) {
      throw new Error("mutation monitor terminal stop message failed");
    }
    const deadline = Date.now() + mutationMonitorOperationTimeout(monitor, 3_000);
    while (!fs.existsSync(monitor.stoppedPath)
      && mutationMonitorChildIsAlive(monitor.child)
      && Date.now() < deadline) synchronousWait(20);
    if (!fs.existsSync(monitor.stoppedPath)) throw new Error("mutation monitor terminal acknowledgement is missing");
    try {
      attestation = JSON.parse(fs.readFileSync(monitor.stoppedPath, "utf8"));
    } catch {
      throw new Error("mutation monitor terminal acknowledgement is invalid");
    }
    assertMutationTerminalAttestation(attestation, {
      sessionId: monitor.sessionId,
      sourceEpoch: requiredEpoch,
      metadataEpoch: requiredMetadataEpoch,
      watchMode: beforeStop.watchMode,
      requestedWatchMode: beforeStop.requestedWatchMode,
      directoryTimestampPolicy: beforeStop.directoryTimestampPolicy,
      eventBackend: beforeStop.eventBackend,
      helperProtocolVersion: beforeStop.helperProtocolVersion,
      regularFileCtimePolicy: beforeStop.regularFileCtimePolicy,
      coverageFingerprint: beforeStop.coverageFingerprint,
      coveragePathCount: beforeStop.coveragePathCount,
      fdCount: beforeStop.fdCount,
      rootFdCount: beforeStop.rootFdCount
    });
    if (attestation.xattrEpoch < beforeStop.xattrEpoch) {
      throw new Error("mutation monitor terminal xattr epoch is not monotonic");
    }
    assertTypedFseventsTerminalAdvance(beforeStop.typedFsevents, attestation.typedFsevents);
    if (attestation.metadataEpoch !== requiredMetadataEpoch) {
      throw new Error("mutation monitor terminal acknowledgement does not match the expected epoch");
    }
    const terminalState = readMutationEpochState(monitor, { requireAlive: false });
    if (terminalState.sourceEpoch !== requiredEpoch || terminalState.metadataEpoch !== attestation.metadataEpoch
      || terminalState.xattrEpoch !== attestation.xattrEpoch
      || terminalState.watchMode !== attestation.watchMode
      || terminalState.requestedWatchMode !== attestation.requestedWatchMode
      || terminalState.directoryTimestampPolicy !== attestation.directoryTimestampPolicy
      || terminalState.eventBackend !== attestation.eventBackend
      || terminalState.helperProtocolVersion !== attestation.helperProtocolVersion
      || terminalState.regularFileCtimePolicy !== attestation.regularFileCtimePolicy
      || stableJson(terminalState.typedFsevents) !== stableJson(attestation.typedFsevents)
      || terminalState.coverageFingerprint !== attestation.coverageFingerprint
      || terminalState.coveragePathCount !== attestation.coveragePathCount
      || terminalState.fdCount !== attestation.fdCount
      || terminalState.rootFdCount !== attestation.rootFdCount) {
      throw new Error("mutation monitor terminal epoch state does not match its acknowledgement");
    }
    if (terminalAttestationPath !== null) {
      const externalStat = fs.lstatSync(terminalAttestationPath);
      const expectedBytes = Buffer.from(`${JSON.stringify(attestation)}\n`);
      if (externalStat.isSymbolicLink() || !externalStat.isFile() || (externalStat.mode & 0o777) !== 0o600
        || !fs.readFileSync(terminalAttestationPath).equals(expectedBytes)) {
        throw new Error("mutation monitor external terminal attestation is invalid");
      }
    }
    monitor.stopAcknowledged = true;
    monitor.terminalAttestation = attestation;
  } catch (error) {
    failure = error;
  } finally {
    cleanupMutationMonitor(monitor);
  }
  if (failure) throw failure;
  return attestation;
}

export function gitText(args, cwd = process.cwd()) {
  return gitBuffer(args, cwd).toString("utf8").trim();
}

export function parseNul(buffer) {
  const output = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    output.push(buffer.subarray(start, index).toString("utf8"));
    start = index + 1;
  }
  if (start !== buffer.length) throw new Error("NUL-delimited Git output is missing its final delimiter");
  return output.filter((entry) => entry.length > 0);
}

export function parseStatusPorcelainZ(buffer) {
  const fields = parseNul(buffer);
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.length < 3 || field[2] !== " ") throw new Error("invalid porcelain v1 -z entry");
    const xy = field.slice(0, 2);
    const entry = { xy, path: field.slice(3) };
    if (/[RC]/u.test(xy)) {
      index += 1;
      if (index >= fields.length) throw new Error("rename/copy status is missing its source path");
      entry.originalPath = fields[index];
    }
    entries.push(entry);
  }
  return entries;
}

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function canonicalizeMissing(candidate) {
  let cursor = candidate;
  const tail = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`cannot resolve evidence root parent: ${candidate}`);
    tail.unshift(path.basename(cursor));
    cursor = parent;
  }
  const canonicalParent = fs.realpathSync(cursor);
  return path.join(canonicalParent, ...tail);
}

export function resolveEvidenceRoot({ repoRoot, commonDir, explicitRoot, worktreeRoots = [] }) {
  if (!path.isAbsolute(repoRoot) || !path.isAbsolute(commonDir)) throw new Error("repository and Git common directory must be absolute");
  const canonicalRepo = fs.realpathSync(repoRoot);
  const canonicalCommon = fs.realpathSync(commonDir);
  let candidate;
  if (explicitRoot !== undefined && explicitRoot !== "") {
    if (!path.isAbsolute(explicitRoot)) throw new Error("MAIS_EVIDENCE_ROOT must be absolute");
    if (fs.existsSync(explicitRoot) && fs.lstatSync(explicitRoot).isSymbolicLink()) {
      throw new Error("MAIS_EVIDENCE_ROOT must not be a symlink");
    }
    candidate = canonicalizeMissing(path.resolve(explicitRoot));
  } else {
    const canonicalPrimaryRepo = path.basename(canonicalCommon) === ".git" ? path.dirname(canonicalCommon) : canonicalRepo;
    const repositoryName = path.basename(canonicalPrimaryRepo);
    candidate = path.join(path.dirname(canonicalPrimaryRepo), `${repositoryName}-dirty-root-backups`, "evidence-archives");
    candidate = canonicalizeMissing(candidate);
  }
  const forbidden = [canonicalRepo, canonicalCommon, ...worktreeRoots.filter(fs.existsSync).map((item) => fs.realpathSync(item))];
  if (forbidden.some((item) => isWithin(candidate, item) || isWithin(item, candidate))) {
    throw new Error("evidence root must be outside the repository, linked worktrees, and Git common directory");
  }
  return candidate;
}

function writePrivate(absolutePath, buffer) {
  fs.writeFileSync(absolutePath, buffer, { mode: 0o600 });
  fs.chmodSync(absolutePath, 0o600);
}

function writePrivateAndSync(absolutePath, buffer) {
  const descriptor = fs.openSync(absolutePath, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, buffer);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function lstatIfPresent(absolutePath, label) {
  try {
    return fs.lstatSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`${label} cannot be inspected safely (${error.message})`);
  }
}

function createPrivateExclusiveNoFollow(absolutePath, buffer, label) {
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error(`${label} creation requires O_NOFOLLOW support`);
  const flags = fs.constants.O_WRONLY
    | fs.constants.O_CREAT
    | fs.constants.O_EXCL
    | fs.constants.O_NOFOLLOW;
  let descriptor;
  try {
    descriptor = fs.openSync(absolutePath, flags, 0o600);
  } catch (error) {
    throw new Error(`${label} creation failed closed (${error.message})`);
  }
  try {
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, buffer);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fsyncDirectory(path.dirname(absolutePath));
}

function fsyncDirectory(absolutePath) {
  const descriptor = fs.openSync(absolutePath, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function mkdirPrivate(absolutePath) {
  fs.mkdirSync(absolutePath, { recursive: true, mode: 0o700 });
  fs.chmodSync(absolutePath, 0o700);
}

function assertManagedPath(evidenceRoot, candidate) {
  if (!fs.existsSync(evidenceRoot) || fs.lstatSync(evidenceRoot).isSymbolicLink()) throw new Error("evidence root is missing or is a symlink");
  const canonicalRoot = fs.realpathSync(evidenceRoot);
  const relativePath = path.relative(evidenceRoot, candidate);
  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`)) throw new Error("managed evidence path escapes evidence root");
  let cursor = evidenceRoot;
  for (const component of relativePath.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    if (!fs.existsSync(cursor)) continue;
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error("managed evidence path contains a symlink");
    if (!isWithin(fs.realpathSync(cursor), canonicalRoot)) throw new Error("managed evidence path escapes evidence root");
  }
}

export function assertEvidenceRootLayout(evidenceRoot) {
  const allowed = new Set([MARKER_NAME, "blobs", "reports", "sets"]);
  const unexpected = fs.readdirSync(evidenceRoot).filter((name) => !allowed.has(name));
  if (unexpected.length > 0) throw new Error("evidence root contains unexpected unmanaged content");
  for (const directory of ["blobs", "reports", "sets"]) {
    const candidate = path.join(evidenceRoot, directory);
    if (fs.existsSync(candidate) && (fs.lstatSync(candidate).isSymbolicLink() || !fs.lstatSync(candidate).isDirectory())) {
      throw new Error(`evidence root managed directory is unsafe: ${directory}`);
    }
  }
}

export function prepareEvidenceReportPath({
  evidenceRoot,
  evidenceRootId,
  filename
}) {
  if (typeof filename !== "string" || filename.length === 0 || path.basename(filename) !== filename
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/u.test(filename)) {
    throw new Error("evidence report filename is invalid");
  }
  readEvidenceRootMarker(path.join(evidenceRoot, MARKER_NAME), { rootId: evidenceRootId });
  assertEvidenceRootLayout(evidenceRoot);
  const reportsDirectory = path.join(evidenceRoot, "reports");
  assertManagedPath(evidenceRoot, reportsDirectory);
  const reportsStat = lstatIfPresent(reportsDirectory);
  if (reportsStat) {
    const stat = reportsStat;
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("evidence reports directory is unsafe");
    fs.chmodSync(reportsDirectory, 0o700);
  } else {
    fs.mkdirSync(reportsDirectory, { mode: 0o700 });
    fsyncDirectory(evidenceRoot);
  }
  const reportPath = path.join(reportsDirectory, filename);
  assertManagedPath(evidenceRoot, reportPath);
  const reportStat = lstatIfPresent(reportPath);
  if (reportStat) {
    const stat = reportStat;
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("evidence report target is unsafe");
  }
  return reportPath;
}

function evidenceReportBuffer(payload) {
  return Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
}

function validateEvidenceReportTemporaryPath(reportPath, filename, temporaryPath, transactionId) {
  if (typeof temporaryPath !== "string" || !path.isAbsolute(temporaryPath)
    || path.dirname(temporaryPath) !== path.dirname(reportPath)
    || path.basename(temporaryPath) !== `${filename}.tmp-${transactionId}`
    || temporaryPath === reportPath) {
    throw new Error("evidence report temporary path is invalid");
  }
  if (lstatIfPresent(temporaryPath, "evidence report temporary path")) {
    throw new Error("evidence report temporary path must be absent");
  }
}

function validateEvidenceReportTransactionPath(reportPath, filename, transactionPath, kind, transactionId) {
  const expectedName = kind === "recovery"
    ? `${filename}.recovery-${transactionId}.json`
    : `${filename}.${kind}-${transactionId}`;
  if (typeof transactionPath !== "string" || !path.isAbsolute(transactionPath)
    || path.dirname(transactionPath) !== path.dirname(reportPath)
    || path.basename(transactionPath) !== expectedName
    || transactionPath === reportPath) {
    throw new Error(`evidence report ${kind} path is invalid`);
  }
  if (lstatIfPresent(transactionPath, `evidence report ${kind} path`)) {
    throw new Error(`evidence report ${kind} path must be absent`);
  }
}

function writeEvidenceReportDescriptor(descriptor, buffer) {
  fs.ftruncateSync(descriptor, 0);
  const written = fs.writeSync(descriptor, buffer, 0, buffer.length, 0);
  if (written !== buffer.length) throw new Error("evidence report temporary write was incomplete");
  fs.ftruncateSync(descriptor, buffer.length);
  fs.fchmodSync(descriptor, 0o600);
  fs.fsyncSync(descriptor);
}

function assertEvidenceReadSize(size, label, { expectedBytes, maxBytes } = {}) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error(`${label} descriptor size is invalid`);
  }
  for (const [name, value] of [["expectedBytes", expectedBytes], ["maxBytes", maxBytes]]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`${label} ${name} constraint is invalid`);
    }
  }
  if (expectedBytes !== undefined && maxBytes !== undefined && expectedBytes > maxBytes) {
    throw new Error(`${label} byte constraints are invalid`);
  }
  if (expectedBytes !== undefined && size !== expectedBytes) {
    throw new Error(`${label} size mismatch before reading`);
  }
  if (maxBytes !== undefined && size > maxBytes) {
    throw new Error(`${label} size limit exceeded before reading`);
  }
}

function readEvidenceReportDescriptor(descriptor, {
  label = "evidence report",
  expectedBytes,
  maxBytes
} = {}) {
  const stat = fs.fstatSync(descriptor);
  if (!stat.isFile()) {
    throw new Error("evidence report descriptor size is invalid");
  }
  const constraints = { expectedBytes, maxBytes };
  assertEvidenceReadSize(stat.size, label, constraints);
  const buffer = Buffer.alloc(expectedBytes ?? stat.size);
  let offset = 0;
  while (offset < buffer.length) {
    const bytesRead = fs.readSync(descriptor, buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) throw new Error("evidence report descriptor read was incomplete");
    offset += bytesRead;
  }
  if (expectedBytes !== undefined || maxBytes !== undefined) {
    const overflow = Buffer.alloc(1);
    if (fs.readSync(descriptor, overflow, 0, 1, buffer.length) !== 0) {
      throw new Error(`${label} size mismatch before reading`);
    }
    const finalStat = fs.fstatSync(descriptor);
    if (!finalStat.isFile()) throw new Error(`${label} descriptor size is invalid`);
    assertEvidenceReadSize(finalStat.size, label, constraints);
    if (finalStat.size !== buffer.length) {
      throw new Error(`${label} size mismatch before reading`);
    }
  }
  return buffer;
}

function openPrivateTransactionFile(absolutePath, buffer, label) {
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error(`${label} requires O_NOFOLLOW support`);
  const flags = fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW;
  let descriptor;
  try {
    descriptor = fs.openSync(absolutePath, flags, 0o600);
    writeEvidenceReportDescriptor(descriptor, buffer);
    return descriptor;
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        const descriptorStat = fs.fstatSync(descriptor);
        const pathStat = lstatIfPresent(absolutePath, label);
        if (pathStat && !pathStat.isSymbolicLink() && pathStat.isFile()
          && pathStat.dev === descriptorStat.dev && pathStat.ino === descriptorStat.ino) {
          fs.rmSync(absolutePath, { force: true });
        }
      } finally {
        fs.closeSync(descriptor);
      }
    }
    throw new Error(`${label} creation failed closed (${error.message})`);
  }
}

function assertHeldEvidenceFile(descriptor, absolutePath, label, expectedMode = 0o600) {
  if (!Number.isInteger(descriptor)) throw new Error(`${label} descriptor is invalid`);
  const descriptorStat = fs.fstatSync(descriptor);
  const pathStat = lstatIfPresent(absolutePath, label);
  if (!pathStat || pathStat.isSymbolicLink() || !pathStat.isFile() || !descriptorStat.isFile()
    || pathStat.dev !== descriptorStat.dev || pathStat.ino !== descriptorStat.ino
    || pathStat.nlink !== 1 || (pathStat.mode & 0o777) !== expectedMode
    || (descriptorStat.mode & 0o777) !== expectedMode) {
    throw new Error(`${label} inode or mode is invalid`);
  }
  return descriptorStat;
}

function removeHeldEvidenceFile(descriptor, absolutePath, label, expectedMode = 0o600) {
  assertHeldEvidenceFile(descriptor, absolutePath, label, expectedMode);
  fs.rmSync(absolutePath);
}

function closePreparedEvidenceDescriptors(prepared) {
  for (const key of ["descriptor", "backupDescriptor", "recoveryDescriptor"]) {
    if (Number.isInteger(prepared[key])) {
      fs.closeSync(prepared[key]);
      prepared[key] = null;
    }
  }
  prepared.closed = true;
  if (ACTIVE_EVIDENCE_REPORT_TRANSACTIONS.get(prepared.reportPath)?.transactionId === prepared.transactionId) {
    ACTIVE_EVIDENCE_REPORT_TRANSACTIONS.delete(prepared.reportPath);
  }
}

function evidenceReportOriginalRecord(originalStat, originalBuffer) {
  if (!originalStat) return { exists: false };
  return {
    bytes: originalBuffer.length,
    dev: String(originalStat.dev),
    exists: true,
    ino: String(originalStat.ino),
    mode: originalStat.mode & 0o777,
    sha256: sha256Buffer(originalBuffer)
  };
}

function writeEvidenceRecoveryJournal(prepared, state, { promotionError = null, rollbackError = null } = {}) {
  const payload = {
    ...prepared.recoveryPayload,
    promotionError: promotionError ? promotionError.message : null,
    rollbackError: rollbackError ? rollbackError.message : null,
    state
  };
  writeEvidenceReportDescriptor(prepared.recoveryDescriptor, evidenceReportBuffer(payload));
  prepared.recoveryPayload = payload;
}

function evidenceReportOwnershipLockName(targetName) {
  return `.evidence-report-owner-${sha256Buffer(Buffer.from(targetName))}.lock`;
}

function evidenceReportOwnershipHeader(targetName, evidenceRootId) {
  return {
    evidenceRootId,
    schema: 1,
    targetHash: sha256Buffer(Buffer.from(targetName)),
    targetName
  };
}

function assertEvidenceReportOwnershipHeader(payload, targetName, evidenceRootId) {
  const expected = evidenceReportOwnershipHeader(targetName, evidenceRootId);
  if (!exactKeys(payload, ["evidenceRootId", "schema", "targetHash", "targetName"])
    || stableJson(payload) !== stableJson(expected)) {
    throw new Error("evidence report ownership lock immutable header is invalid");
  }
  return payload;
}

function assertHeldEvidenceReportOwnershipLock(lock) {
  if (!lock || !Number.isInteger(lock.descriptor) || !lock.holder
    || !processIsAlive(lock.holder.child.pid)) {
    throw new Error("evidence report ownership kernel lock is not held");
  }
  assertHeldEvidenceFile(lock.descriptor, lock.lockPath, "evidence report ownership lock", 0o600);
  const bytes = readEvidenceReportDescriptor(lock.descriptor);
  if (!bytes.equals(lock.buffer)) throw new Error("evidence report ownership lock bytes changed");
  let header;
  try {
    header = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`evidence report ownership lock JSON is invalid (${error.message})`);
  }
  assertEvidenceReportOwnershipHeader(header, lock.targetName, lock.evidenceRootId);
  return lock;
}

const PYTHON_REPORT_LOCK_HOLDER = String.raw`
import errno,fcntl,json,os,select,stat,sys,time
lock_path,scratch,session_id,parent_pid,expected_dev,expected_ino=sys.argv[1:]
parent_pid=int(parent_pid); expected_dev=int(expected_dev); expected_ino=int(expected_ino)
names=('result.json','release.json','ack.json','confirm.json')
def parent_alive():
  if os.getppid()!=parent_pid: return False
  try: os.kill(parent_pid,0); return True
  except OSError: return False
def sync_dir():
  d=os.open(scratch,os.O_RDONLY)
  try: os.fsync(d)
  finally: os.close(d)
def write_record(name,payload):
  p=os.path.join(scratch,name); temporary=p+'.tmp-'+session_id
  fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  try:
    os.fchmod(fd,0o600); os.write(fd,(json.dumps(payload,sort_keys=True,separators=(',',':'))+'\n').encode()); os.fsync(fd)
  finally: os.close(fd)
  os.rename(temporary,p)
  sync_dir()
def read_record(name,keys):
  p=os.path.join(scratch,name); st=os.lstat(p)
  if not stat.S_ISREG(st.st_mode) or stat.S_IMODE(st.st_mode)!=0o600 or st.st_nlink!=1: raise RuntimeError('unsafe scratch record')
  fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
  try: value=json.loads(os.read(fd,65536).decode())
  finally: os.close(fd)
  if sorted(value.keys())!=sorted(keys): raise RuntimeError('invalid scratch schema')
  return value
def stdin_closed():
  ready,_,_=select.select([0],[],[],0)
  return bool(ready and os.read(0,1)==b'')
def wait_for(name):
  p=os.path.join(scratch,name)
  while not os.path.exists(p):
    if not parent_alive() or stdin_closed(): raise RuntimeError('orphaned holder')
    time.sleep(0.02)
fd=None; locked=False
try:
  fd=os.open(lock_path,os.O_RDWR|os.O_NOFOLLOW); st=os.fstat(fd)
  if not stat.S_ISREG(st.st_mode) or stat.S_IMODE(st.st_mode)!=0o600 or st.st_dev!=expected_dev or st.st_ino!=expected_ino: raise RuntimeError('lock inode mismatch')
  attempts=0; started=time.monotonic(); deadline=started+1.0
  while True:
    attempts+=1
    try:
      fcntl.lockf(fd,fcntl.LOCK_EX|fcntl.LOCK_NB); locked=True; status='ready'; break
    except OSError as error:
      if error.errno not in (errno.EACCES,errno.EAGAIN): raise
      if time.monotonic()>=deadline: status='busy'; break
      if not parent_alive() or stdin_closed(): raise RuntimeError('orphaned holder during acquisition')
      time.sleep(0.02)
  wait_ms=int(round((time.monotonic()-started)*1000))
  write_record('result.json',{'attempts':attempts,'dev':st.st_dev,'ino':st.st_ino,'schema':1,'sessionId':session_id,'status':status,'waitMs':wait_ms})
  if status=='busy':
    wait_for('confirm.json'); confirm=read_record('confirm.json',('schema','sessionId','status'))
    if confirm!={'schema':1,'sessionId':session_id,'status':'acknowledged'}: raise RuntimeError('invalid busy acknowledgement')
  else:
    wait_for('release.json'); request=read_record('release.json',('requestId','schema','sessionId','status'))
    if request['schema']!=1 or request['sessionId']!=session_id or request['status']!='release': raise RuntimeError('invalid release request')
    fcntl.lockf(fd,fcntl.LOCK_UN); locked=False
    write_record('ack.json',{'requestId':request['requestId'],'schema':1,'sessionId':session_id,'status':'released'})
    wait_for('confirm.json'); confirm=read_record('confirm.json',('requestId','schema','sessionId','status'))
    if confirm!={'requestId':request['requestId'],'schema':1,'sessionId':session_id,'status':'acknowledged'}: raise RuntimeError('invalid release acknowledgement')
finally:
  if locked and fd is not None:
    try: fcntl.lockf(fd,fcntl.LOCK_UN)
    except OSError: pass
  if fd is not None:
    try: os.close(fd)
    except OSError: pass
  try: remaining=os.listdir(scratch)
  except OSError: remaining=[]
  for name in remaining:
    try: os.unlink(os.path.join(scratch,name))
    except OSError: pass
  try: os.rmdir(scratch)
  except OSError: pass
`;

function writeReportLockScratchRecord(scratchDirectory, name, payload) {
  const absolutePath = path.join(scratchDirectory, name);
  const temporaryPath = `${absolutePath}.tmp-${crypto.randomUUID()}`;
  const descriptor = fs.openSync(
    temporaryPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
    0o600
  );
  try {
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(payload)}\n`);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporaryPath, absolutePath);
  fsyncDirectory(scratchDirectory);
}

function waitForReportLockScratchRecord(holder, name, timeoutMs = 5_000) {
  const absolutePath = path.join(holder.scratchDirectory, name);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(absolutePath)) {
      const opened = openStrictEvidenceFile(absolutePath, "evidence report lock-holder scratch", [0o600]);
      try { return JSON.parse(opened.buffer.toString("utf8")); }
      finally { closeStrictEvidenceFile(opened); }
    }
    if (!processIsAlive(holder.child.pid)) throw new Error("evidence report lock holder exited before acknowledgement");
    synchronousWait(20);
  }
  throw new Error(`timed out waiting for evidence report lock-holder ${name}`);
}

function acknowledgeBusyReportLockHolder(holder) {
  writeReportLockScratchRecord(holder.scratchDirectory, "confirm.json", {
    schema: 1,
    sessionId: holder.sessionId,
    status: "acknowledged"
  });
}

function stopReportLockHolderAfterFailure(holder) {
  if (!holder) return;
  if (processIsAlive(holder.child.pid) && holder.child.stdin && !holder.child.stdin.destroyed) {
    holder.child.stdin.end();
  }
  const deadline = Date.now() + 5_000;
  while (fs.existsSync(holder.scratchDirectory) && Date.now() < deadline) synchronousWait(20);
  if (fs.existsSync(holder.scratchDirectory)) {
    if (processIsAlive(holder.child.pid)) holder.child.kill("SIGKILL");
    const killDeadline = Date.now() + 5_000;
    while (processIsAlive(holder.child.pid) && Date.now() < killDeadline) synchronousWait(20);
    if (!processIsAlive(holder.child.pid)) {
      fs.rmSync(holder.scratchDirectory, { force: true, recursive: true });
    }
  }
}

function acquireEvidenceReportOwnershipLock(reportsDirectory, targetName, evidenceRootId) {
  const lockPath = path.join(reportsDirectory, evidenceReportOwnershipLockName(targetName));
  const header = evidenceReportOwnershipHeader(targetName, evidenceRootId);
  const buffer = evidenceReportBuffer(header);
  const flags = fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW;
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, flags, 0o600);
    writeEvidenceReportDescriptor(descriptor, buffer);
    fsyncDirectory(reportsDirectory);
  } catch (error) {
    if (error?.code !== "EEXIST") {
      if (Number.isInteger(descriptor)) fs.closeSync(descriptor);
      throw new Error(`evidence report ownership lock creation failed closed (${error.message})`);
    }
    const opened = openStrictEvidenceFile(lockPath, "evidence report ownership lock", [0o600]);
    if (!opened) throw new Error("evidence report ownership lock disappeared during acquisition");
    descriptor = opened.descriptor;
    if (!opened.buffer.equals(buffer)) {
      closeStrictEvidenceFile(opened);
      throw new Error("evidence report ownership lock immutable header is invalid");
    }
    try { assertEvidenceReportOwnershipHeader(JSON.parse(opened.buffer.toString("utf8")), targetName, evidenceRootId); }
    catch (headerError) { closeStrictEvidenceFile(opened); throw headerError; }
  }
  const descriptorStat = fs.fstatSync(descriptor);
  const scratchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mais-report-lock-holder-"));
  fs.chmodSync(scratchDirectory, 0o700);
  const sessionId = crypto.randomUUID();
  const pythonPath = resolvePythonUtility();
  const child = spawn(pythonPath, [
    "-c", PYTHON_REPORT_LOCK_HOLDER, lockPath, scratchDirectory, sessionId,
    String(process.pid), String(descriptorStat.dev), String(descriptorStat.ino)
  ], { stdio: ["pipe", "ignore", "pipe"] });
  const holder = { child, scratchDirectory, sessionId };
  try {
    const result = waitForReportLockScratchRecord(holder, "result.json");
    if (!exactKeys(result, ["attempts", "dev", "ino", "schema", "sessionId", "status", "waitMs"])
      || result.schema !== 1 || result.sessionId !== sessionId
      || result.dev !== descriptorStat.dev || result.ino !== descriptorStat.ino
      || !Number.isSafeInteger(result.attempts) || result.attempts < 1
      || !Number.isSafeInteger(result.waitMs) || result.waitMs < 0 || result.waitMs > 2_000
      || !["busy", "ready"].includes(result.status)) {
      throw new Error("evidence report lock-holder ready schema is invalid");
    }
    if (result.status === "busy") {
      acknowledgeBusyReportLockHolder(holder);
      fs.closeSync(descriptor);
      descriptor = null;
      throw new Error("evidence report ownership kernel lock is busy");
    }
    const lock = { buffer, descriptor, evidenceRootId, header, holder, lockPath, reportsDirectory, targetName };
    assertHeldEvidenceReportOwnershipLock(lock);
    return lock;
  } catch (error) {
    if (Number.isInteger(descriptor)) fs.closeSync(descriptor);
    stopReportLockHolderAfterFailure(holder);
    throw error;
  }
}

function releaseEvidenceReportOwnershipLock(lock) {
  if (!lock || !Number.isInteger(lock.descriptor)) return;
  let validationError = null;
  try { assertHeldEvidenceReportOwnershipLock(lock); }
  catch (error) { validationError = error; }
  let releaseError = null;
  try {
    const requestId = crypto.randomUUID();
    writeReportLockScratchRecord(lock.holder.scratchDirectory, "release.json", {
      requestId,
      schema: 1,
      sessionId: lock.holder.sessionId,
      status: "release"
    });
    const ack = waitForReportLockScratchRecord(lock.holder, "ack.json");
    if (!exactKeys(ack, ["requestId", "schema", "sessionId", "status"])
      || ack.requestId !== requestId || ack.schema !== 1
      || ack.sessionId !== lock.holder.sessionId || ack.status !== "released") {
      throw new Error("evidence report lock-holder release acknowledgement is invalid");
    }
    writeReportLockScratchRecord(lock.holder.scratchDirectory, "confirm.json", {
      requestId,
      schema: 1,
      sessionId: lock.holder.sessionId,
      status: "acknowledged"
    });
    const deadline = Date.now() + 5_000;
    while (fs.existsSync(lock.holder.scratchDirectory) && Date.now() < deadline) synchronousWait(20);
    if (fs.existsSync(lock.holder.scratchDirectory)) {
      throw new Error("evidence report lock-holder scratch cleanup was not acknowledged");
    }
    lock.holder.child.stdin.end();
  } catch (error) {
    releaseError = error;
    stopReportLockHolderAfterFailure(lock.holder);
  } finally {
    fs.closeSync(lock.descriptor);
    lock.descriptor = null;
  }
  if (validationError && releaseError) {
    throw new Error(`${validationError.message}; holder release also failed (${releaseError.message})`);
  }
  if (validationError) throw validationError;
  if (releaseError) throw releaseError;
}

function openStrictEvidenceFile(absolutePath, label, allowedModes = [0o600], {
  expectedBytes,
  maxBytes
} = {}) {
  const constraints = { expectedBytes, maxBytes };
  const pathStat = lstatIfPresent(absolutePath, label);
  if (!pathStat) return null;
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1
    || !allowedModes.includes(pathStat.mode & 0o777)) {
    throw new Error(`${label} is unsafe`);
  }
  assertEvidenceReadSize(pathStat.size, label, constraints);
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error(`${label} requires O_NOFOLLOW support`);
  const descriptor = fs.openSync(absolutePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const descriptorStat = fs.fstatSync(descriptor);
    if (!descriptorStat.isFile() || descriptorStat.dev !== pathStat.dev || descriptorStat.ino !== pathStat.ino
      || descriptorStat.nlink !== 1 || (descriptorStat.mode & 0o777) !== (pathStat.mode & 0o777)) {
      throw new Error(`${label} inode changed during inspection`);
    }
    assertEvidenceReadSize(descriptorStat.size, label, constraints);
    return {
      buffer: readEvidenceReportDescriptor(descriptor, { label, ...constraints }),
      descriptor,
      mode: descriptorStat.mode & 0o777,
      stat: descriptorStat
    };
  } catch (error) {
    fs.closeSync(descriptor);
    throw error;
  }
}

function closeStrictEvidenceFile(opened) {
  if (opened?.descriptor !== undefined) fs.closeSync(opened.descriptor);
}

function assertRecoveryContent(opened, record, label) {
  if (!opened || opened.buffer.length !== record.bytes || sha256Buffer(opened.buffer) !== record.sha256) {
    throw new Error(`${label} bytes do not match the recovery journal`);
  }
}

function assertEvidenceReportRecoveryPayload(payload, { reportFile, transactionId }) {
  const keys = [
    "backupFile",
    "candidateFile",
    "new",
    "operation",
    "original",
    "promotionError",
    "reportFile",
    "rollbackError",
    "schemaVersion",
    "state",
    "transactionId"
  ];
  if (!exactKeys(payload, keys) || payload.schemaVersion !== 1
    || payload.operation !== "evidence-report-promotion"
    || payload.reportFile !== reportFile || payload.transactionId !== transactionId
    || !UUID_PATTERN.test(payload.transactionId)
    || !EVIDENCE_REPORT_RECOVERY_STATES.has(payload.state)
    || (payload.promotionError !== null && typeof payload.promotionError !== "string")
    || (payload.rollbackError !== null && typeof payload.rollbackError !== "string")) {
    throw new Error("evidence report recovery journal fields are invalid");
  }
  if (!exactKeys(payload.new, ["bytes", "mode", "sha256"])
    || !isNonnegativeInteger(payload.new.bytes) || payload.new.mode !== 0o600
    || typeof payload.new.sha256 !== "string" || !SHA256_PATTERN.test(payload.new.sha256)) {
    throw new Error("evidence report recovery journal new-file record is invalid");
  }
  if (!payload.original || typeof payload.original !== "object" || typeof payload.original.exists !== "boolean") {
    throw new Error("evidence report recovery journal original-file record is invalid");
  }
  if (payload.original.exists) {
    if (!exactKeys(payload.original, ["bytes", "dev", "exists", "ino", "mode", "sha256"])
      || !isNonnegativeInteger(payload.original.bytes)
      || typeof payload.original.dev !== "string" || !/^\d+$/u.test(payload.original.dev)
      || typeof payload.original.ino !== "string" || !/^\d+$/u.test(payload.original.ino)
      || !Number.isInteger(payload.original.mode) || payload.original.mode < 0 || payload.original.mode > 0o777
      || typeof payload.original.sha256 !== "string" || !SHA256_PATTERN.test(payload.original.sha256)) {
      throw new Error("evidence report recovery journal original-file record is invalid");
    }
  } else if (!exactKeys(payload.original, ["exists"])) {
    throw new Error("evidence report recovery journal absent-original record is invalid");
  }
  const expectedCandidate = `${reportFile}.tmp-${transactionId}`;
  const expectedBackup = payload.original.exists ? `${reportFile}.backup-${transactionId}` : null;
  if (payload.candidateFile !== expectedCandidate || payload.backupFile !== expectedBackup) {
    throw new Error("evidence report recovery journal referenced paths are noncanonical");
  }
  return payload;
}

function readEvidenceReportRecoveryJournal(reportsDirectory, name, match) {
  const reportFile = match[1];
  const transactionId = match[2];
  if (path.basename(reportFile) !== reportFile
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/u.test(reportFile)) {
    throw new Error("evidence report recovery journal target filename is invalid");
  }
  const journalPath = path.join(reportsDirectory, name);
  const opened = openStrictEvidenceFile(journalPath, "evidence report recovery journal", [0o600]);
  try {
    let payload;
    try {
      payload = JSON.parse(opened.buffer.toString("utf8"));
    } catch (error) {
      throw new Error(`evidence report recovery journal JSON is invalid (${error.message})`);
    }
    assertEvidenceReportRecoveryPayload(payload, { reportFile, transactionId });
    return { journalBuffer: opened.buffer, journalPath, payload, reportFile, transactionId };
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

function validateRecoveryArtifact(absolutePath, record, label, allowedModes) {
  const opened = openStrictEvidenceFile(absolutePath, label, allowedModes);
  if (!opened) return false;
  try {
    if (record) assertRecoveryContent(opened, record, label);
    return true;
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

function removeRecoveryArtifactIfPresent(absolutePath, record, label, allowedModes) {
  const opened = openStrictEvidenceFile(absolutePath, label, allowedModes);
  if (!opened) return false;
  try {
    if (record) assertRecoveryContent(opened, record, label);
    const current = fs.lstatSync(absolutePath);
    if (current.dev !== opened.stat.dev || current.ino !== opened.stat.ino) {
      throw new Error(`${label} changed before cleanup`);
    }
    fs.rmSync(absolutePath);
    return true;
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

function finalMatchesRecoveryRecord(reportPath, record) {
  const opened = openStrictEvidenceFile(reportPath, "evidence report recovery target", [record.mode]);
  if (!opened) return false;
  try {
    return opened.buffer.length === record.bytes && sha256Buffer(opened.buffer) === record.sha256;
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

function removeRecoveryJournalDurably(record, reportsDirectory) {
  const opened = openStrictEvidenceFile(record.journalPath, "evidence report recovery journal", [0o600]);
  if (!opened) throw new Error("evidence report recovery journal disappeared before cleanup");
  try {
    if (!opened.buffer.equals(record.journalBuffer)) {
      throw new Error("evidence report recovery journal changed before cleanup");
    }
    fs.rmSync(record.journalPath);
  } finally {
    closeStrictEvidenceFile(opened);
  }
  try {
    fsyncDirectory(reportsDirectory);
  } catch (error) {
    let recreateError = null;
    try {
      const descriptor = openPrivateTransactionFile(
        record.journalPath,
        record.journalBuffer,
        "evidence report recovery journal"
      );
      fs.closeSync(descriptor);
      fsyncDirectory(reportsDirectory);
    } catch (recoveryError) {
      recreateError = recoveryError;
    }
    const detail = recreateError ? `; journal recreation failed (${recreateError.message})` : "";
    throw new Error(`evidence report recovery journal deletion fsync failed (${error.message})${detail}`);
  }
}

function scanEvidenceReportRecoveryJournals(reportsDirectory) {
  const records = [];
  for (const name of fs.readdirSync(reportsDirectory)) {
    if (!name.includes(".json.recovery-")) continue;
    const match = name.match(EVIDENCE_REPORT_RECOVERY_NAME_PATTERN);
    if (!match) throw new Error(`unknown evidence report recovery journal name: ${name}`);
    records.push(readEvidenceReportRecoveryJournal(reportsDirectory, name, match));
  }
  const byTarget = new Map();
  for (const record of records) {
    const existing = byTarget.get(record.reportFile) ?? [];
    existing.push(record);
    byTarget.set(record.reportFile, existing);
    const candidatePath = path.join(reportsDirectory, record.payload.candidateFile);
    validateRecoveryArtifact(candidatePath, null, "evidence report recovery candidate", [0o600]);
    if (record.payload.backupFile) {
      const backupPath = path.join(reportsDirectory, record.payload.backupFile);
      validateRecoveryArtifact(
        backupPath,
        record.payload.original,
        "evidence report recovery backup",
        [...new Set([0o600, record.payload.original.mode])]
      );
    }
  }
  for (const [reportFile, targetRecords] of byTarget) {
    if (targetRecords.length > 1) {
      throw new Error(`multiple evidence report recovery journals target ${reportFile}`);
    }
  }
  return byTarget;
}

function recoverEvidenceReportTransaction(record, reportsDirectory) {
  const reportPath = path.join(reportsDirectory, record.reportFile);
  const finalStat = lstatIfPresent(reportPath, "evidence report recovery target");
  const matchesNew = finalStat ? finalMatchesRecoveryRecord(reportPath, record.payload.new) : false;
  const matchesOriginal = record.payload.original.exists
    ? (finalStat ? finalMatchesRecoveryRecord(reportPath, record.payload.original) : false)
    : finalStat === null;
  let recoveryKind;
  if (record.payload.state === "committed-cleanup-pending") {
    if (!matchesNew) throw new Error("committed evidence report recovery target does not match new bytes");
    recoveryKind = "committed";
  } else if (record.payload.state === "rollback-durability-unconfirmed") {
    if (!matchesOriginal) throw new Error("rolled-back evidence report recovery target does not match original bytes");
    recoveryKind = "rollback";
  } else if (matchesNew) {
    recoveryKind = "committed";
  } else if (matchesOriginal) {
    recoveryKind = "abort";
  } else {
    throw new Error("prepared evidence report recovery target matches neither original nor new bytes");
  }
  if (recoveryKind === "rollback" || (recoveryKind === "committed"
    && record.payload.state !== "committed-cleanup-pending")) {
    fsyncDirectory(reportsDirectory);
  }
  const candidatePath = path.join(reportsDirectory, record.payload.candidateFile);
  removeRecoveryArtifactIfPresent(
    candidatePath,
    recoveryKind === "abort" ? null : record.payload.new,
    "evidence report recovery candidate",
    [0o600]
  );
  if (record.payload.backupFile) {
    const backupPath = path.join(reportsDirectory, record.payload.backupFile);
    removeRecoveryArtifactIfPresent(
      backupPath,
      record.payload.original,
      "evidence report recovery backup",
      [...new Set([0o600, record.payload.original.mode])]
    );
  }
  fsyncDirectory(reportsDirectory);
  removeRecoveryJournalDurably(record, reportsDirectory);
}

function recoverEvidenceReportTransactionsWithLock({ filename, ownershipLock, reportsDirectory }) {
  assertHeldEvidenceReportOwnershipLock(ownershipLock);
  const reportPath = path.join(reportsDirectory, filename);
  if (ACTIVE_EVIDENCE_REPORT_TRANSACTIONS.has(reportPath)) {
    throw new Error("an evidence report transaction for this target is already active");
  }
  try {
    const recordsByTarget = scanEvidenceReportRecoveryJournals(reportsDirectory);
    const records = recordsByTarget.get(filename) ?? [];
    if (records.length === 0) return false;
    assertHeldEvidenceReportOwnershipLock(ownershipLock);
    recoverEvidenceReportTransaction(records[0], reportsDirectory);
    assertHeldEvidenceReportOwnershipLock(ownershipLock);
    return true;
  } catch (error) {
    throw new Error(`evidence report recovery failed closed for ${filename} (${error.message})`);
  }
}

export function recoverEvidenceReportTransactions({ evidenceRoot, evidenceRootId, filename }) {
  if (typeof filename !== "string" || path.basename(filename) !== filename
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/u.test(filename)) {
    throw new Error("evidence report recovery filename is invalid");
  }
  const reportPath = prepareEvidenceReportPath({ evidenceRoot, evidenceRootId, filename });
  const reportsDirectory = path.dirname(reportPath);
  const ownershipLock = acquireEvidenceReportOwnershipLock(
    reportsDirectory,
    filename,
    evidenceRootId,
  );
  try {
    return recoverEvidenceReportTransactionsWithLock({ filename, ownershipLock, reportsDirectory });
  } finally {
    releaseEvidenceReportOwnershipLock(ownershipLock);
  }
}

function assertPreparedEvidenceReport(prepared) {
  if (!prepared || prepared.closed || prepared.promoted || !Number.isInteger(prepared.descriptor)) {
    throw new Error("prepared evidence report is not active");
  }
  assertHeldEvidenceReportOwnershipLock(prepared.ownershipLock);
  const descriptorStat = assertHeldEvidenceFile(
    prepared.descriptor,
    prepared.temporaryPath,
    "prepared evidence report temporary",
    0o600
  );
  assertHeldEvidenceFile(
    prepared.recoveryDescriptor,
    prepared.recoveryPath,
    "prepared evidence report recovery journal",
    0o600
  );
  if (prepared.originalStat) {
    assertHeldEvidenceFile(
      prepared.backupDescriptor,
      prepared.backupPath,
      "prepared evidence report backup",
      0o600
    );
    if (!readEvidenceReportDescriptor(prepared.backupDescriptor).equals(prepared.originalBuffer)) {
      throw new Error("prepared evidence report backup bytes are invalid");
    }
  } else if (prepared.backupDescriptor !== null || prepared.backupPath !== null) {
    throw new Error("prepared evidence report has an unexpected backup");
  }
  const currentFinal = lstatIfPresent(prepared.reportPath, "evidence report target");
  if ((prepared.originalStat === null) !== (currentFinal === null)
    || (prepared.originalStat && (currentFinal.isSymbolicLink() || !currentFinal.isFile()
      || currentFinal.dev !== prepared.originalStat.dev || currentFinal.ino !== prepared.originalStat.ino
      || (currentFinal.mode & 0o777) !== (prepared.originalStat.mode & 0o777)))) {
    throw new Error("evidence report target changed before atomic promotion");
  }
  return descriptorStat;
}

export function prepareEvidenceReport({
  evidenceRoot,
  evidenceRootId,
  filename,
  payload,
  transactionIdFactory = () => crypto.randomUUID(),
  temporaryPathFactory = (reportPath, transactionId) => `${reportPath}.tmp-${transactionId}`,
  backupPathFactory = (reportPath, transactionId) => `${reportPath}.backup-${transactionId}`,
  recoveryPathFactory = (reportPath, transactionId) => `${reportPath}.recovery-${transactionId}.json`
}) {
  const reportPath = prepareEvidenceReportPath({ evidenceRoot, evidenceRootId, filename });
  const reportsDirectory = path.dirname(reportPath);
  const ownershipLock = acquireEvidenceReportOwnershipLock(
    reportsDirectory,
    filename,
    evidenceRootId,
  );
  let transactionId;
  let buffer;
  let originalStat;
  let temporaryPath;
  let backupPath;
  let recoveryPath;
  let originalDescriptor;
  let descriptor;
  let backupDescriptor = null;
  let recoveryDescriptor;
  let originalBuffer = null;
  try {
    recoverEvidenceReportTransactionsWithLock({ filename, ownershipLock, reportsDirectory });
    transactionId = transactionIdFactory();
    if (typeof transactionId !== "string" || !UUID_PATTERN.test(transactionId)) {
      throw new Error("evidence report transaction ID is invalid");
    }
    buffer = evidenceReportBuffer(payload);
    originalStat = lstatIfPresent(reportPath);
    temporaryPath = temporaryPathFactory(reportPath, transactionId);
    backupPath = originalStat ? backupPathFactory(reportPath, transactionId) : null;
    recoveryPath = recoveryPathFactory(reportPath, transactionId);
    validateEvidenceReportTemporaryPath(reportPath, filename, temporaryPath, transactionId);
    if (backupPath) validateEvidenceReportTransactionPath(reportPath, filename, backupPath, "backup", transactionId);
    validateEvidenceReportTransactionPath(reportPath, filename, recoveryPath, "recovery", transactionId);
    if (originalStat) {
      originalDescriptor = fs.openSync(reportPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const before = fs.fstatSync(originalDescriptor);
      if (!before.isFile() || before.dev !== originalStat.dev || before.ino !== originalStat.ino
        || (before.mode & 0o777) !== (originalStat.mode & 0o777)) {
        throw new Error("evidence report original target changed before backup");
      }
      originalBuffer = readEvidenceReportDescriptor(originalDescriptor);
      const after = fs.fstatSync(originalDescriptor);
      if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
        || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs
        || originalBuffer.length !== before.size) {
        throw new Error("evidence report original target changed during backup");
      }
      backupDescriptor = openPrivateTransactionFile(
        backupPath,
        originalBuffer,
        "evidence report backup"
      );
    }
    const original = evidenceReportOriginalRecord(originalStat, originalBuffer);
    const recoveryPayload = {
      backupFile: backupPath ? path.basename(backupPath) : null,
      candidateFile: path.basename(temporaryPath),
      new: {
        bytes: buffer.length,
        mode: 0o600,
        sha256: sha256Buffer(buffer)
      },
      operation: "evidence-report-promotion",
      original,
      promotionError: null,
      reportFile: filename,
      rollbackError: null,
      schemaVersion: 1,
      state: "prepared",
      transactionId
    };
    recoveryDescriptor = openPrivateTransactionFile(
      recoveryPath,
      evidenceReportBuffer(recoveryPayload),
      "evidence report recovery journal"
    );
    descriptor = openPrivateTransactionFile(temporaryPath, buffer, "evidence report temporary");
    fsyncDirectory(path.dirname(reportPath));
    const prepared = {
      backupDescriptor,
      backupPath,
      buffer,
      closed: false,
      descriptor,
      originalBuffer,
      originalStat,
      ownershipLock,
      promoted: false,
      recoveryDescriptor,
      recoveryPath,
      recoveryPayload,
      reportPath,
      temporaryPath,
      transactionId
    };
    assertPreparedEvidenceReport(prepared);
    ACTIVE_EVIDENCE_REPORT_TRANSACTIONS.set(reportPath, { recoveryPath, transactionId });
    return prepared;
  } catch (error) {
    let removed = false;
    for (const [heldDescriptor, heldPath, label] of [
      [descriptor, temporaryPath, "evidence report temporary"],
      [recoveryDescriptor, recoveryPath, "evidence report recovery journal"],
      [backupDescriptor, backupPath, "evidence report backup"]
    ]) {
      if (!Number.isInteger(heldDescriptor)) continue;
      try {
        const descriptorStat = fs.fstatSync(heldDescriptor);
        const pathStat = heldPath ? lstatIfPresent(heldPath, label) : null;
        if (pathStat && !pathStat.isSymbolicLink() && pathStat.isFile()
          && pathStat.dev === descriptorStat.dev && pathStat.ino === descriptorStat.ino) {
          fs.rmSync(heldPath, { force: true });
          removed = true;
        }
      } finally {
        fs.closeSync(heldDescriptor);
      }
    }
    let cleanupError = null;
    try {
      if (removed) fsyncDirectory(reportsDirectory);
      releaseEvidenceReportOwnershipLock(ownershipLock);
    } catch (releaseError) {
      cleanupError = releaseError;
    }
    const detail = cleanupError ? `; ownership lock cleanup failed (${cleanupError.message})` : "";
    throw new Error(`evidence report preparation failed closed (${error.message})${detail}`);
  } finally {
    if (Number.isInteger(originalDescriptor)) {
      try { fs.closeSync(originalDescriptor); } catch (error) {
        if (error?.code !== "EBADF") throw error;
      }
    }
  }
}

export function abortEvidenceReport(prepared) {
  if (!prepared || prepared.closed || prepared.promoted) return;
  try {
    assertHeldEvidenceReportOwnershipLock(prepared.ownershipLock);
  } catch {
    closePreparedEvidenceDescriptors(prepared);
    releaseEvidenceReportOwnershipLock(prepared.ownershipLock);
    return;
  }
  let removed = false;
  try {
    for (const [descriptor, absolutePath, label] of [
      [prepared.descriptor, prepared.temporaryPath, "evidence report temporary"],
      [prepared.backupDescriptor, prepared.backupPath, "evidence report backup"],
      [prepared.recoveryDescriptor, prepared.recoveryPath, "evidence report recovery journal"]
    ]) {
      if (!Number.isInteger(descriptor)) continue;
      removeHeldEvidenceFile(descriptor, absolutePath, label);
      removed = true;
    }
  } finally {
    closePreparedEvidenceDescriptors(prepared);
  }
  if (removed) fsyncDirectory(path.dirname(prepared.reportPath));
  releaseEvidenceReportOwnershipLock(prepared.ownershipLock);
}

export function commitEvidenceReport(prepared, { payload } = {}) {
  assertPreparedEvidenceReport(prepared);
  if (payload !== undefined) {
    prepared.buffer = evidenceReportBuffer(payload);
    writeEvidenceReportDescriptor(prepared.descriptor, prepared.buffer);
    prepared.recoveryPayload = {
      ...prepared.recoveryPayload,
      new: {
        bytes: prepared.buffer.length,
        mode: 0o600,
        sha256: sha256Buffer(prepared.buffer)
      }
    };
  }
  assertPreparedEvidenceReport(prepared);
  if (!fs.readFileSync(prepared.temporaryPath).equals(prepared.buffer)) {
    throw new Error("prepared evidence report bytes changed before atomic promotion");
  }
  const reportsDirectory = path.dirname(prepared.reportPath);
  try {
    writeEvidenceRecoveryJournal(prepared, "promotion-in-progress");
    fs.renameSync(prepared.temporaryPath, prepared.reportPath);
    prepared.promoted = true;
    fs.fsyncSync(prepared.descriptor);
    fsyncDirectory(reportsDirectory);
    assertHeldEvidenceReportOwnershipLock(prepared.ownershipLock);
    assertHeldEvidenceFile(
      prepared.descriptor,
      prepared.reportPath,
      "promoted evidence report",
      0o600
    );
    if (!readEvidenceReportDescriptor(prepared.descriptor).equals(prepared.buffer)) {
      throw new Error("evidence report atomic validation failed");
    }
  } catch (promotionError) {
    if (!prepared.promoted) throw promotionError;
    let rollbackError = null;
    try {
      assertHeldEvidenceReportOwnershipLock(prepared.ownershipLock);
      if (prepared.originalStat) {
        assertHeldEvidenceFile(
          prepared.backupDescriptor,
          prepared.backupPath,
          "prepared evidence report backup",
          0o600
        );
        fs.fchmodSync(prepared.backupDescriptor, prepared.originalStat.mode & 0o777);
        fs.fsyncSync(prepared.backupDescriptor);
        fs.renameSync(prepared.backupPath, prepared.reportPath);
        const restored = assertHeldEvidenceFile(
          prepared.backupDescriptor,
          prepared.reportPath,
          "restored evidence report",
          prepared.originalStat.mode & 0o777
        );
        if (restored.size !== prepared.originalBuffer.length
          || !readEvidenceReportDescriptor(prepared.backupDescriptor).equals(prepared.originalBuffer)) {
          throw new Error("restored evidence report bytes are invalid");
        }
      } else {
        assertHeldEvidenceFile(
          prepared.descriptor,
          prepared.reportPath,
          "promoted evidence report",
          0o600
        );
        fs.rmSync(prepared.reportPath);
      }
      fsyncDirectory(reportsDirectory);
    } catch (error) {
      rollbackError = error;
    }
    if (rollbackError) {
      let journalError = null;
      try {
        writeEvidenceRecoveryJournal(prepared, "rollback-durability-unconfirmed", {
          promotionError,
          rollbackError
        });
      } catch (error) {
        journalError = error;
      }
      closePreparedEvidenceDescriptors(prepared);
      let lockReleaseError = null;
      try { releaseEvidenceReportOwnershipLock(prepared.ownershipLock); } catch (error) { lockReleaseError = error; }
      const journalDetail = journalError
        ? `recovery journal update also failed (${journalError.message}); recovery path ${prepared.recoveryPath}`
        : `recovery evidence preserved at ${prepared.recoveryPath}`;
      const lockDetail = lockReleaseError ? `; ownership lock release failed (${lockReleaseError.message})` : "";
      throw new Error(`evidence report promotion failed (${promotionError.message}); rollback failed (${rollbackError.message}); ${journalDetail}${lockDetail}`);
    }
    removeHeldEvidenceFile(
      prepared.recoveryDescriptor,
      prepared.recoveryPath,
      "evidence report recovery journal"
    );
    closePreparedEvidenceDescriptors(prepared);
    fsyncDirectory(reportsDirectory);
    releaseEvidenceReportOwnershipLock(prepared.ownershipLock);
    throw promotionError;
  }
  try {
    assertHeldEvidenceReportOwnershipLock(prepared.ownershipLock);
    writeEvidenceRecoveryJournal(prepared, "committed-cleanup-pending");
  } catch (error) {
    closePreparedEvidenceDescriptors(prepared);
    let lockReleaseError = null;
    try { releaseEvidenceReportOwnershipLock(prepared.ownershipLock); } catch (releaseError) { lockReleaseError = releaseError; }
    const detail = lockReleaseError ? `; ownership lock release failed (${lockReleaseError.message})` : "";
    throw new Error(`evidence report committed but recovery journal update failed (${error.message}); recovery evidence preserved at ${prepared.recoveryPath}${detail}`);
  }
  let cleanupError = null;
  try {
    if (prepared.backupDescriptor !== null) {
      removeHeldEvidenceFile(
        prepared.backupDescriptor,
        prepared.backupPath,
        "evidence report backup"
      );
      fs.closeSync(prepared.backupDescriptor);
      prepared.backupDescriptor = null;
      fsyncDirectory(reportsDirectory);
    }
    removeHeldEvidenceFile(
      prepared.recoveryDescriptor,
      prepared.recoveryPath,
      "evidence report recovery journal"
    );
    fs.closeSync(prepared.recoveryDescriptor);
    prepared.recoveryDescriptor = null;
    fsyncDirectory(reportsDirectory);
  } catch (error) {
    const recoveryDetail = lstatIfPresent(prepared.recoveryPath, "evidence report recovery journal")
      ? `recovery evidence preserved at ${prepared.recoveryPath}`
      : "the promoted final is durable but cleanup durability is unconfirmed";
    cleanupError = new Error(`evidence report committed but transaction cleanup failed (${error.message}); ${recoveryDetail}`);
  } finally {
    closePreparedEvidenceDescriptors(prepared);
  }
  try {
    releaseEvidenceReportOwnershipLock(prepared.ownershipLock);
  } catch (error) {
    if (cleanupError) {
      throw new Error(`${cleanupError.message}; ownership lock release failed (${error.message})`);
    }
    throw error;
  }
  if (cleanupError) throw cleanupError;
  return prepared.reportPath;
}

export function writeEvidenceReport({
  beforeRename = () => {},
  ...options
}) {
  const prepared = prepareEvidenceReport(options);
  try {
    beforeRename();
    return commitEvidenceReport(prepared);
  } finally {
    abortEvidenceReport(prepared);
  }
}

export function assertEvidenceGateReport(report, options = {}) {
  const hasDefaultOptions = exactKeys(options, []);
  const hasLegacyOption = exactKeys(options, ["allowLegacyTerminalProtocol"])
    && typeof options.allowLegacyTerminalProtocol === "boolean";
  if (!hasDefaultOptions && !hasLegacyOption) {
    throw new Error("evidence gate report validator options are invalid");
  }
  const allowLegacyTerminalProtocol = hasLegacyOption
    ? options.allowLegacyTerminalProtocol
    : false;
  const keys = [
    "archiveSetFingerprint",
    "branches",
    "checkedAt",
    "dirtyMapStatusSignature",
    "expandedStatusEntries",
    "failures",
    "openLinkedDecisions",
    "schemaVersion",
    "terminalProtocol"
  ];
  if (!exactKeys(report, keys)) throw new Error("evidence gate report fields are invalid");
  if (!READABLE_EVIDENCE_SCHEMA_VERSIONS.has(report.schemaVersion)
    || typeof report.checkedAt !== "string"
    || !Number.isFinite(Date.parse(report.checkedAt))
    || typeof report.archiveSetFingerprint !== "string"
    || !SHA256_PATTERN.test(report.archiveSetFingerprint)
    || typeof report.dirtyMapStatusSignature !== "string"
    || report.dirtyMapStatusSignature.length === 0
    || !isNonnegativeInteger(report.expandedStatusEntries)
    || !isNonnegativeInteger(report.openLinkedDecisions)
    || !Array.isArray(report.failures)
    || !report.failures.every((failure) => typeof failure === "string")
    || !Array.isArray(report.branches)
    || !report.branches.every((branch) => exactKeys(branch, ["branch", "head"])
      && typeof branch.branch === "string" && branch.branch.length > 0 && isGitObjectId(branch.head))) {
    throw new Error("evidence gate report values are invalid");
  }
  const protocol = report.terminalProtocol;
  const commonProtocolValuesAreValid = protocol !== null
    && typeof protocol === "object"
    && !Array.isArray(protocol)
    && typeof protocol.monitorSessionId === "string"
    && UUID_PATTERN.test(protocol.monitorSessionId)
    && isNonnegativeInteger(protocol.expectedSourceEpoch)
    && isNonnegativeInteger(protocol.expectedMetadataEpoch)
    && [
      "reports/gate-monitor-attestation-slot-a.json",
      "reports/gate-monitor-attestation-slot-b.json"
    ].includes(protocol.attestationFile);
  const legacyProtocolIsValid = exactKeys(protocol, [
    "attestationFile",
    "expectedMetadataEpoch",
    "expectedSourceEpoch",
    "monitorSessionId",
    "schemaVersion"
  ]) && protocol.schemaVersion === 1;
  const legacyV2ProtocolIsValid = exactKeys(protocol, [
    "attestationFile",
    "directoryTimestampPolicy",
    "expectedMetadataEpoch",
    "expectedSourceEpoch",
    "monitorSessionId",
    "requestedWatchMode",
    "schemaVersion"
  ]) && protocol.schemaVersion === 2
    && ["auto", "descriptor-sentinel"].includes(protocol.requestedWatchMode)
    && protocol.directoryTimestampPolicy
      === directoryTimestampPolicyForRequestedWatchMode(protocol.requestedWatchMode);
  const currentProtocolIsValid = report.schemaVersion === EVIDENCE_SCHEMA_VERSION
    && exactKeys(protocol, [
    "attestationFile",
    "attestationSha256",
    "directoryTimestampPolicy",
    "eventBackend",
    "expectedMetadataEpoch",
    "expectedSourceEpoch",
    "expectedXattrEpoch",
    "helperProtocolVersion",
    "monitorSessionId",
    "regularFileCtimePolicy",
    "requestedWatchMode",
    "schemaVersion",
    "typedFsevents",
    "watchMode"
  ]) && protocol.schemaVersion === 3
    && ["auto", "descriptor-sentinel"].includes(protocol.requestedWatchMode)
    && ["recursive", "descriptor-sentinel", "descriptor-sentinel-fsevents"].includes(protocol.watchMode)
    && protocol.directoryTimestampPolicy
      === directoryTimestampPolicyForRequestedWatchMode(protocol.requestedWatchMode)
    && isNonnegativeInteger(protocol.expectedXattrEpoch)
    && typeof protocol.attestationSha256 === "string"
    && SHA256_PATTERN.test(protocol.attestationSha256)
    && validTypedFseventsState(protocol.typedFsevents, protocol);
  if (!commonProtocolValuesAreValid
    || (!currentProtocolIsValid
      && !(allowLegacyTerminalProtocol && (legacyProtocolIsValid || legacyV2ProtocolIsValid)))) {
    throw new Error("evidence gate report terminal protocol fields are invalid");
  }
  return report;
}

function resolvePythonUtility(requestedPath) {
  const candidates = requestedPath === undefined
    ? ["/usr/bin/python3", "/opt/homebrew/bin/python3", "/usr/local/bin/python3"]
    : [requestedPath];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !path.isAbsolute(candidate) || !fs.existsSync(candidate)) continue;
    let canonical;
    try { canonical = fs.realpathSync(candidate); } catch { continue; }
    const stat = fs.statSync(canonical);
    if (stat.isFile() && (stat.mode & 0o111) !== 0) return canonical;
  }
  throw new Error("system Python lock launcher is missing or unsafe; writer fails closed");
}

const PYTHON_LOCK_LAUNCHER = [
  "import fcntl,os,sys",
  "lock_path,node_path,script_path,*args=sys.argv[1:]",
  "fd=os.open(lock_path,os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)",
  "fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)",
  "os.fchmod(fd,0o600)",
  "os.dup2(fd,3,inheritable=True)",
  "os.set_inheritable(3,True)",
  "fd != 3 and os.close(fd)",
  "os.execve(node_path,[node_path,script_path,*args],os.environ.copy())"
].join("\n");

const PYTHON_LOCK_OWNER_PROBE = [
  "import errno,fcntl,os,sys",
  "lock_path=sys.argv[1]",
  "fd=3",
  "independent=os.open(lock_path,os.O_RDWR|os.O_NOFOLLOW)",
  "try:",
  " fcntl.flock(independent,fcntl.LOCK_SH|fcntl.LOCK_NB)",
  " fcntl.flock(independent,fcntl.LOCK_UN)",
  " sys.exit(42)",
  "except OSError as error:",
  " error.errno in (errno.EACCES,errno.EAGAIN) or sys.exit(43)",
  "try:",
  " fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)",
  "except OSError as error:",
  " sys.exit(44 if error.errno in (errno.EACCES,errno.EAGAIN) else 45)",
  "try:",
  " fcntl.flock(independent,fcntl.LOCK_SH|fcntl.LOCK_NB)",
  " fcntl.flock(independent,fcntl.LOCK_UN)",
  " sys.exit(46)",
  "except OSError as error:",
  " error.errno in (errno.EACCES,errno.EAGAIN) or sys.exit(47)"
].join("\n");

export function assertEvidenceWriterLockOwned({ commonDir, pythonPath, descriptor = 3 }) {
  const canonicalCommonDir = fs.realpathSync(commonDir);
  const resolvedPythonPath = resolvePythonUtility(pythonPath);
  const lockPath = path.join(canonicalCommonDir, "mais-evidence-writer.lock");
  let descriptorStat;
  let lockStat;
  try {
    descriptorStat = fs.fstatSync(descriptor);
    if (!fs.existsSync(lockPath) || fs.lstatSync(lockPath).isSymbolicLink()) throw new Error("lock path is missing or unsafe");
    lockStat = fs.statSync(lockPath);
  } catch (error) {
    throw new Error(`evidence writer lock descriptor proof is unavailable: ${error.message}`);
  }
  if (!descriptorStat.isFile() || descriptorStat.dev !== lockStat.dev || descriptorStat.ino !== lockStat.ino) {
    throw new Error("evidence writer lock descriptor identity mismatch");
  }
  const probe = spawnSync(resolvedPythonPath, ["-c", PYTHON_LOCK_OWNER_PROBE, lockPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe", descriptor],
    timeout: 5_000
  });
  if (probe.error || probe.signal || probe.status !== 0) throw new Error("evidence writer lock owner probe failed");
}

export function runEvidenceWriterUnderLock({ commonDir, scriptPath, args = [], pythonPath, timeoutMs }) {
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
    throw new Error("configured full-run timeout must be a positive safe integer");
  }
  const canonicalCommonDir = fs.realpathSync(commonDir);
  const resolvedPythonPath = resolvePythonUtility(pythonPath);
  const lockPath = path.join(canonicalCommonDir, "mais-evidence-writer.lock");
  if (fs.existsSync(lockPath) && fs.lstatSync(lockPath).isSymbolicLink()) throw new Error("evidence writer lock path is a symlink");
  const spawnOptions = {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  };
  if (timeoutMs !== undefined) spawnOptions.timeout = timeoutMs;
  const result = spawnSync(
    resolvedPythonPath,
    ["-c", PYTHON_LOCK_LAUNCHER, lockPath, process.execPath, scriptPath, ...args],
    spawnOptions
  );
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error("locked evidence writer exceeded configured full-run timeout");
  }
  if (result.error) throw new Error(`system Python lock launcher failed: ${result.error.message}`);
  if (result.signal) throw new Error(`locked evidence writer terminated by ${result.signal}`);
  if (result.status !== 0) throw new Error("another evidence writer is active or the locked writer failed");
}

function writeJournal(absolutePath, value) {
  const temporaryPath = `${absolutePath}.tmp-${crypto.randomUUID()}`;
  writePrivateAndSync(temporaryPath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
  fs.renameSync(temporaryPath, absolutePath);
  fsyncDirectory(path.dirname(absolutePath));
}

function guardedRecoveryMutation(assertLockHealthy, mutate) {
  assertLockHealthy();
  const result = mutate();
  assertLockHealthy();
  return result;
}

function guardedRecoveryFsync(assertLockHealthy, directory) {
  guardedRecoveryMutation(assertLockHealthy, () => fsyncDirectory(directory));
}

function unlinkTransactionFile(absolutePath, parentDirectory, label, assertLockHealthy) {
  if (!fs.existsSync(absolutePath)) return false;
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} is unsafe`);
  guardedRecoveryMutation(assertLockHealthy, () => fs.unlinkSync(absolutePath));
  guardedRecoveryFsync(assertLockHealthy, parentDirectory);
  return true;
}

function finishManifestTransactionCleanup(transactionDirectory, canonicalArchiveDir, journal, cleanupStep, assertLockHealthy) {
  const backupDirectory = path.join(transactionDirectory, "backups");
  if (fs.existsSync(backupDirectory)) {
    if (fs.lstatSync(backupDirectory).isSymbolicLink() || !fs.lstatSync(backupDirectory).isDirectory()) throw new Error("manifest backup directory is unsafe");
    for (const file of journal.files) {
      const backupPath = path.join(backupDirectory, file.basename);
      if (!fs.existsSync(backupPath)) continue;
      if (!file.hadOriginal || fs.lstatSync(backupPath).isSymbolicLink() || sha256Buffer(fs.readFileSync(backupPath)) !== file.oldSha256) {
        throw new Error(`manifest backup cleanup integrity mismatch: ${file.basename}`);
      }
      guardedRecoveryMutation(assertLockHealthy, () => fs.unlinkSync(backupPath));
      guardedRecoveryFsync(assertLockHealthy, backupDirectory);
      cleanupStep("after-backup-unlink", backupPath);
    }
    if (fs.readdirSync(backupDirectory).length > 0) throw new Error("manifest backup directory contains unexpected recovery files");
    guardedRecoveryMutation(assertLockHealthy, () => fs.rmdirSync(backupDirectory));
    guardedRecoveryFsync(assertLockHealthy, transactionDirectory);
  }
  for (const file of journal.files) {
    const stagedPath = path.join(transactionDirectory, file.basename);
    if (!fs.existsSync(stagedPath)) continue;
    if (fs.lstatSync(stagedPath).isSymbolicLink() || sha256Buffer(fs.readFileSync(stagedPath)) !== file.newSha256) {
      throw new Error(`manifest staged cleanup integrity mismatch: ${file.basename}`);
    }
    guardedRecoveryMutation(assertLockHealthy, () => fs.unlinkSync(stagedPath));
    guardedRecoveryFsync(assertLockHealthy, transactionDirectory);
    cleanupStep("after-staged-unlink", stagedPath);
  }
  for (const name of fs.readdirSync(transactionDirectory).filter((item) => item.startsWith("journal.json.tmp-"))) {
    unlinkTransactionFile(path.join(transactionDirectory, name), transactionDirectory, "manifest temporary journal", assertLockHealthy);
  }
  const journalPath = path.join(transactionDirectory, "journal.json");
  cleanupStep("before-journal-unlink", journalPath);
  if (unlinkTransactionFile(journalPath, transactionDirectory, "manifest recovery journal", assertLockHealthy)) cleanupStep("after-journal-unlink", journalPath);
  const remaining = fs.readdirSync(transactionDirectory);
  if (remaining.length > 0) throw new Error(`manifest transaction cleanup has unexpected files: ${remaining.join(", ")}`);
  guardedRecoveryMutation(assertLockHealthy, () => fs.rmdirSync(transactionDirectory));
  guardedRecoveryFsync(assertLockHealthy, canonicalArchiveDir);
}

function recoverJournalMissingTransaction(transactionDirectory, canonicalArchiveDir, assertLockHealthy) {
  const backupDirectory = path.join(transactionDirectory, "backups");
  if (fs.existsSync(backupDirectory)) {
    if (fs.lstatSync(backupDirectory).isSymbolicLink() || !fs.lstatSync(backupDirectory).isDirectory() || fs.readdirSync(backupDirectory).length > 0) {
      throw new Error("manifest recovery journal is missing while backups exist");
    }
    guardedRecoveryMutation(assertLockHealthy, () => fs.rmdirSync(backupDirectory));
    guardedRecoveryFsync(assertLockHealthy, transactionDirectory);
  }
  for (const name of fs.readdirSync(transactionDirectory)) {
    unlinkTransactionFile(path.join(transactionDirectory, name), transactionDirectory, "journal-less staged manifest", assertLockHealthy);
  }
  guardedRecoveryMutation(assertLockHealthy, () => fs.rmdirSync(transactionDirectory));
  guardedRecoveryFsync(assertLockHealthy, canonicalArchiveDir);
}

function recoverManifestTransactionDirectory(
  transactionDirectory,
  canonicalArchiveDir,
  renameFile = (from, to) => fs.renameSync(from, to),
  cleanupStep = () => {},
  assertLockHealthy = () => {}
) {
  const journalPath = path.join(transactionDirectory, "journal.json");
  const backupDirectory = path.join(transactionDirectory, "backups");
  if (!fs.existsSync(journalPath)) {
    recoverJournalMissingTransaction(transactionDirectory, canonicalArchiveDir, assertLockHealthy);
    return;
  }
  if (fs.lstatSync(journalPath).isSymbolicLink() || !fs.lstatSync(journalPath).isFile()) throw new Error("manifest recovery journal is unsafe");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  if (journal.schemaVersion !== 1 || !Array.isArray(journal.files) || !["prepared", "committed"].includes(journal.state)) {
    throw new Error("manifest recovery journal is invalid");
  }
  const seen = new Set();
  for (const file of journal.files) {
    if (typeof file.basename !== "string" || path.basename(file.basename) !== file.basename || seen.has(file.basename)
      || typeof file.newSha256 !== "string" || typeof file.hadOriginal !== "boolean"
      || (file.hadOriginal && typeof file.oldSha256 !== "string")) throw new Error("manifest recovery journal file record is invalid");
    seen.add(file.basename);
  }
  if (journal.state === "committed") {
    for (const file of journal.files) {
      const finalPath = path.join(canonicalArchiveDir, file.basename);
      if (!fs.existsSync(finalPath) || fs.lstatSync(finalPath).isSymbolicLink() || sha256Buffer(fs.readFileSync(finalPath)) !== file.newSha256) {
        throw new Error(`committed manifest transaction is incomplete: ${file.basename}`);
      }
    }
    finishManifestTransactionCleanup(transactionDirectory, canonicalArchiveDir, journal, cleanupStep, assertLockHealthy);
    return;
  } else {
    for (const file of [...journal.files].reverse()) {
      const finalPath = path.join(canonicalArchiveDir, file.basename);
      const backupPath = path.join(backupDirectory, file.basename);
      if (file.hadOriginal) {
        if (fs.existsSync(backupPath)) {
          if (fs.lstatSync(backupPath).isSymbolicLink() || sha256Buffer(fs.readFileSync(backupPath)) !== file.oldSha256) {
            throw new Error(`manifest backup is corrupt: ${file.basename}`);
          }
          if (fs.existsSync(finalPath)) {
            const finalSha = sha256Buffer(fs.readFileSync(finalPath));
            if (finalSha !== file.oldSha256 && finalSha !== file.newSha256) throw new Error(`manifest final file is ambiguous: ${file.basename}`);
            guardedRecoveryMutation(assertLockHealthy, () => fs.rmSync(finalPath));
          }
          guardedRecoveryMutation(assertLockHealthy, () => renameFile(backupPath, finalPath, "rollback"));
        } else if (!fs.existsSync(finalPath) || sha256Buffer(fs.readFileSync(finalPath)) !== file.oldSha256) {
          throw new Error(`manifest original cannot be recovered: ${file.basename}`);
        }
      } else if (fs.existsSync(finalPath)) {
        if (sha256Buffer(fs.readFileSync(finalPath)) !== file.newSha256) throw new Error(`new manifest final file is ambiguous: ${file.basename}`);
        guardedRecoveryMutation(assertLockHealthy, () => fs.rmSync(finalPath));
      }
    }
    guardedRecoveryFsync(assertLockHealthy, canonicalArchiveDir);
  }
  finishManifestTransactionCleanup(transactionDirectory, canonicalArchiveDir, journal, cleanupStep, assertLockHealthy);
}

export function recoverManifestTransactions({ archiveDir, assertLockHealthy = () => {} }) {
  assertLockHealthy();
  if (!fs.existsSync(archiveDir)) return;
  const canonicalArchiveDir = fs.realpathSync(archiveDir);
  const transactionNamePattern = /^\.evidence-publish-[1-9][0-9]*-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  for (const name of fs.readdirSync(canonicalArchiveDir).filter((item) => transactionNamePattern.test(item)).sort()) {
    assertLockHealthy();
    const transactionDirectory = path.join(canonicalArchiveDir, name);
    if (fs.lstatSync(transactionDirectory).isSymbolicLink() || !fs.lstatSync(transactionDirectory).isDirectory()) {
      throw new Error("manifest recovery path is unsafe");
    }
    recoverManifestTransactionDirectory(transactionDirectory, canonicalArchiveDir, undefined, undefined, assertLockHealthy);
    assertLockHealthy();
  }
  assertLockHealthy();
}

export function publishManifestTransaction({
  archiveDir,
  files,
  beforePrepare = () => {},
  beforePublish,
  beforeCommit = () => {},
  renameFile = (from, to) => fs.renameSync(from, to),
  cleanupStep = () => {},
  assertLockHealthy = () => {}
}) {
  let lockHealthFailed = false;
  const requireLock = () => {
    try {
      assertLockHealthy();
    } catch (error) {
      lockHealthFailed = true;
      throw error;
    }
  };
  const preserveRecoveryEvidence = () => {
    for (const directory of [backupDirectory, stagingDirectory, canonicalArchiveDir]) {
      try {
        if (fs.existsSync(directory)) fsyncDirectory(directory);
      } catch {
        // Preserve every recoverable path and report the original lock loss.
      }
    }
  };
  const guardedFsync = (directory) => {
    requireLock();
    fsyncDirectory(directory);
    requireLock();
  };
  const guardedRename = (from, to, phase) => {
    requireLock();
    renameFile(from, to, phase);
    requireLock();
  };
  requireLock();
  fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
  const canonicalArchiveDir = fs.realpathSync(archiveDir);
  const basenames = new Set();
  for (const file of files) {
    if (fs.realpathSync(path.dirname(path.resolve(file.path))) !== canonicalArchiveDir) throw new Error("manifest transaction path must be a direct child of the archive directory");
    const basename = path.basename(file.path);
    if (basenames.has(basename)) throw new Error("manifest transaction contains duplicate filenames");
    basenames.add(basename);
  }
  const transactionId = `.evidence-publish-${process.pid}-${crypto.randomUUID()}`;
  const stagingDirectory = path.join(canonicalArchiveDir, transactionId);
  const backupDirectory = path.join(stagingDirectory, "backups");
  requireLock();
  beforePrepare({ transactionDirectory: stagingDirectory, transactionId });
  requireLock();
  if (lstatIfPresent(stagingDirectory, "manifest transaction root") !== null) {
    throw new Error("manifest transaction root must remain absent until exact monitor registration completes");
  }
  fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  guardedFsync(canonicalArchiveDir);
  let journal;
  try {
    const records = [];
    for (const file of files) {
      requireLock();
      const stagedPath = path.join(stagingDirectory, path.basename(file.path));
      const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content));
      writePrivateAndSync(stagedPath, content);
      const hadOriginal = fs.existsSync(file.path);
      records.push({
        basename: path.basename(file.path),
        hadOriginal,
        oldSha256: hadOriginal ? sha256Buffer(fs.readFileSync(file.path)) : null,
        newSha256: sha256Buffer(content)
      });
      requireLock();
    }
    guardedFsync(stagingDirectory);
    journal = { schemaVersion: 1, transactionId: path.basename(stagingDirectory), state: "prepared", files: records };
    requireLock();
    writeJournal(path.join(stagingDirectory, "journal.json"), journal);
    requireLock();
    beforePublish({ transactionDirectory: stagingDirectory });
    requireLock();
    for (const file of files) {
      requireLock();
      if (!fs.existsSync(file.path)) continue;
      const backupPath = path.join(backupDirectory, path.basename(file.path));
      guardedRename(file.path, backupPath, "backup");
      guardedFsync(canonicalArchiveDir);
      guardedFsync(backupDirectory);
    }
    guardedFsync(backupDirectory);
    for (const file of files) {
      requireLock();
      const stagedPath = path.join(stagingDirectory, path.basename(file.path));
      guardedRename(stagedPath, file.path, "publish");
      guardedFsync(canonicalArchiveDir);
    }
    guardedFsync(canonicalArchiveDir);
    requireLock();
    beforeCommit();
    requireLock();
    const committedJournal = { ...journal, state: "committed" };
    requireLock();
    writeJournal(path.join(stagingDirectory, "journal.json"), committedJournal);
    journal = committedJournal;
    requireLock();
    recoverManifestTransactionDirectory(stagingDirectory, canonicalArchiveDir, undefined, (step, target) => {
      requireLock();
      cleanupStep(step, target);
      requireLock();
    }, requireLock);
    requireLock();
  } catch (error) {
    if (lockHealthFailed) {
      preserveRecoveryEvidence();
      throw new Error(`manifest transaction stopped after lock loss; recovery journal preserved for the next exclusive writer: ${error.message}`);
    }
    if (journal?.state === "committed") throw new Error(`committed manifest cleanup was interrupted; startup recovery required: ${error.message}`);
    try {
      requireLock();
    } catch (lockError) {
      preserveRecoveryEvidence();
      throw new Error(`manifest rollback refused after lock loss; recovery journal preserved for the next exclusive writer: ${lockError.message}`);
    }
    try {
      recoverManifestTransactionDirectory(stagingDirectory, canonicalArchiveDir, renameFile, cleanupStep, requireLock);
    } catch (recoveryError) {
      preserveRecoveryEvidence();
      throw new Error(`manifest transaction failed and rollback was incomplete; recovery evidence preserved at ${path.basename(stagingDirectory)}; original error: ${error.message}; recovery error: ${recoveryError.message}`);
    }
    throw error;
  }
}

export function ensureEvidenceRoot({ evidenceRoot, repositoryId }) {
  if (!path.isAbsolute(evidenceRoot)) throw new Error("evidence root must be absolute");
  assertRepositoryId(repositoryId);
  if (fs.existsSync(evidenceRoot) && fs.lstatSync(evidenceRoot).isSymbolicLink()) throw new Error("evidence root must not be a symlink");
  const existed = fs.existsSync(evidenceRoot);
  if (!existed) mkdirPrivate(evidenceRoot);
  else fs.chmodSync(evidenceRoot, 0o700);
  const markerPath = path.join(evidenceRoot, MARKER_NAME);
  const markerStat = lstatIfPresent(markerPath, "evidence root marker");
  if (markerStat === null) {
    const unexpected = fs.readdirSync(evidenceRoot).filter((name) => name !== MARKER_NAME);
    if (unexpected.length > 0) throw new Error("nonempty evidence root is missing a valid marker");
    const marker = { schemaVersion: MARKER_SCHEMA_VERSION, rootId: crypto.randomUUID(), repositoryId };
    createPrivateExclusiveNoFollow(
      markerPath,
      Buffer.from(`${JSON.stringify(marker, null, 2)}\n`),
      "evidence root marker"
    );
    return readEvidenceRootMarker(markerPath, { repositoryId, rootId: marker.rootId });
  }
  if (markerStat.isSymbolicLink() || !markerStat.isFile()) {
    throw new Error("evidence root marker must be a direct regular file, not a symlink");
  }
  const marker = readEvidenceRootMarker(markerPath, { repositoryId });
  fs.chmodSync(markerPath, 0o600);
  assertEvidenceRootLayout(evidenceRoot);
  return marker;
}

function pathBasenameBlocked(relativePath) {
  const base = path.posix.basename(relativePath.replaceAll("\\", "/"));
  const lower = base.toLowerCase();
  if (lower === "all api keys.docx" || lower === ".npmrc" || lower === ".netrc") return true;
  if (lower === "id_rsa" || lower === "id_dsa" || lower === "id_ed25519") return true;
  if (/\.(?:pem|p12|pfx|key)$/iu.test(lower)) return true;
  if (/(?:^|[._-])credentials?(?:[._-]|$)/iu.test(lower) && !/(?:example|sample|placeholder)/iu.test(lower)) return true;
  if (lower.startsWith(".env") && !/(?:^|[._-])(?:example|sample)(?:$|[._-])/iu.test(lower)) return true;
  return false;
}

export function scanArchivePath(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) throw new Error("unsafe archive path");
  if (pathBasenameBlocked(relativePath)) throw new Error(`secret-looking path rejected: ${JSON.stringify(relativePath)}`);
}

const EXACT_API_ME_ROUTE_TEST_SECRET = "api-me-route-test-secret";

function isPlaceholder(value) {
  const raw = String(value);
  if (raw === EXACT_API_ME_ROUTE_TEST_SECRET) return true;
  const normalized = (raw.match(/[A-Za-z0-9_./+=-]+/gu) ?? []).join("");
  return isExactYamlPlaceholder(normalized);
}

const EXACT_DEEPSEEK_E2E_SESSION_SECRET = "deepseek-e2e-session-secret";

function isExactYamlPlaceholder(value) {
  if (value === EXACT_DEEPSEEK_E2E_SESSION_SECRET) return true;
  return /^(?:(?:sk[-_])?placeholder(?:[-_]x{8,})?|re[-_]x{8,}|(?:example|sample|dummy|changeme)(?:[-_](?:api[-_]?key|key|token|secret|password|credential|value|here|x{8,}))*|your[-_]?(?:key|token|secret)(?:[-_]?(?:here|placeholder))?|your[-_](?:(?:deepseek|qwen)[-_])?server[-_]side[-_]key|replace[-_]with[-_]a[-_]long[-_]random[-_]value|x{8,}|(?:secret|fake|test|fixture)[-_](?:password|token|cookie|credential|api[-_]?key)[-_]value)$/iu.test(value);
}

function isExactStructuredPlaceholder(value) {
  return value === EXACT_API_ME_ROUTE_TEST_SECRET || isExactYamlPlaceholder(value);
}

function isJavaScriptPath(displayPath) {
  return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(path.extname(displayPath).toLowerCase());
}

function isPatchPath(displayPath) {
  return path.extname(displayPath).toLowerCase() === ".patch";
}

function literalContainsHighConfidenceSecret(value) {
  if (value.includes(EXACT_DEEPSEEK_E2E_SESSION_SECRET)
    && value !== EXACT_DEEPSEEK_E2E_SESSION_SECRET) return true;
  if (value.includes(EXACT_API_ME_ROUTE_TEST_SECRET)
    && value !== EXACT_API_ME_ROUTE_TEST_SECRET) return true;
  const candidates = value.match(/[A-Za-z0-9_./+=-]{20,}/gu) ?? [];
  return candidates.some((candidate) => !isPlaceholder(candidate));
}

const SECRET_KEY_NAME = /^(?:[A-Za-z0-9]+[_-])*(?:api[_-]?key|(?:access|auth)?[_-]?token|secret|password|credentials?)$/iu;
const CAMEL_SECRET_KEY_NAME = /^(?:apiKey|APIKey|accessToken|authToken|clientSecret|[A-Za-z_$][A-Za-z0-9_$]*(?:ApiKey|APIKey|AccessToken|AuthToken|Token|Secret|Password|Credential|Credentials))$/u;

function propertyNameText(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node) || ts.isStringLiteralLike(node)) return node.text.replace(/^#/u, "");
  if (ts.isComputedPropertyName(node)) return staticStringValue(node.expression);
  return null;
}

function transparentExpressionInner(node) {
  if (node && (ts.isParenthesizedExpression(node)
    || ts.isAsExpression(node)
    || ts.isNonNullExpression(node)
    || ts.isTypeAssertionExpression(node)
    || (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(node))
    || (typeof ts.isPartiallyEmittedExpression === "function" && ts.isPartiallyEmittedExpression(node)))) {
    return node.expression;
  }
  return null;
}

function unwrapTransparentExpression(node) {
  let inner;
  while ((inner = transparentExpressionInner(node))) node = inner;
  return node;
}

function transparentExpressionRoot(node) {
  while (node?.parent && transparentExpressionInner(node.parent) === node) node = node.parent;
  return node;
}

function secretTargetName(node) {
  node = unwrapTransparentExpression(node);
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text.replace(/^#/u, "");
  if (ts.isPropertyAccessExpression(node)) return node.name.text.replace(/^#/u, "");
  if (ts.isElementAccessExpression(node) && node.argumentExpression) return staticStringValue(node.argumentExpression);
  return null;
}

function isSecretName(value) {
  return typeof value === "string" && (SECRET_KEY_NAME.test(value) || CAMEL_SECRET_KEY_NAME.test(value));
}

function isAssignmentOperator(kind) {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function assignedFunctionSecretName(node) {
  const parent = node.parent;
  if ((ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertyAssignment(parent))
    && parent.initializer === node) return propertyNameText(parent.name);
  if (ts.isBinaryExpression(parent) && parent.right === node && isAssignmentOperator(parent.operatorToken.kind)) {
    return secretTargetName(parent.left);
  }
  return null;
}

function staticStringValue(node) {
  node = unwrapTransparentExpression(node);
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticStringValue(node.left);
    const right = staticStringValue(node.right);
    return left === null || right === null ? null : `${left}${right}`;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = staticStringValue(span.expression);
      if (expression === null) return null;
      value += expression + span.literal.text;
    }
    return value;
  }
  return null;
}

function functionLikeNode(node) {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

function enclosingImportDeclaration(node) {
  for (let current = node; current; current = current.parent) {
    if (ts.isImportDeclaration(current)) return current;
  }
  return null;
}

function reactImportBinding(identifier) {
  const record = LOCAL_INITIALIZER_RESOLVERS.get(identifier.getSourceFile())?.resolve(identifier);
  if (!record || record.values.length > 0) return null;
  const owner = record.declaration.owner;
  const declaration = enclosingImportDeclaration(owner);
  const clause = declaration?.importClause;
  if (!declaration || !clause || clause.isTypeOnly
    || !ts.isStringLiteralLike(declaration.moduleSpecifier)
    || declaration.moduleSpecifier.text !== "react") return null;
  if (ts.isImportSpecifier(owner)) {
    if (owner.isTypeOnly) return null;
    return {
      binding: record.declaration.binding,
      kind: "named",
      importedName: propertyNameText(owner.propertyName ?? owner.name)
    };
  }
  if (ts.isNamespaceImport(owner)) {
    return { binding: record.declaration.binding, kind: "namespace", importedName: null };
  }
  if (ts.isImportClause(owner) && owner.name === record.declaration.binding) {
    return { binding: record.declaration.binding, kind: "default", importedName: null };
  }
  return null;
}

function identifierIsTypeOnlyUse(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isExpression(current) || ts.isStatement(current) || ts.isSourceFile(current)) return false;
  }
  return false;
}

function identifierIsRuntimeReference(node) {
  const parent = node.parent;
  if (identifierIsTypeOnlyUse(node) || ts.isDeclarationName(node)) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if (ts.isLabeledStatement(parent) && parent.label === node) return false;
  if ((ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node) return false;
  return true;
}

function expressionIsMutationTarget(node) {
  for (let current = node; current.parent; current = current.parent) {
    const parent = current.parent;
    if (ts.isBinaryExpression(parent) && isAssignmentOperator(parent.operatorToken.kind)
      && nodeContains(parent.left, node)) return true;
    if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
      && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator)) return true;
    if (ts.isDeleteExpression(parent)) return true;
    if ((ts.isForInStatement(parent) || ts.isForOfStatement(parent))
      && nodeContains(parent.initializer, node)) return true;
    if (ts.isStatement(parent)) return false;
  }
  return false;
}

function staticObjectDestructuringRead(node) {
  const parent = node.parent;
  return ts.isVariableDeclaration(parent) && parent.initializer === node
    && ts.isObjectBindingPattern(parent.name)
    && parent.name.elements.every((element) => !element.dotDotDotToken
      && propertyNameText(element.propertyName ?? element.name) !== null);
}

function benignDefaultImportRead(node) {
  const parent = node.parent;
  return (ts.isVoidExpression(parent) && parent.expression === node)
    || staticObjectDestructuringRead(node);
}

function inheritedMutatorMemberCall(node) {
  const name = ts.isPropertyAccessExpression(node)
    ? node.name.text
    : node.argumentExpression ? staticStringValue(node.argumentExpression) : null;
  const callee = transparentExpressionRoot(node);
  return ["__defineGetter__", "__defineSetter__", "__defineSetter"].includes(name)
    && ts.isCallExpression(callee.parent) && callee.parent.expression === callee;
}

function defaultReactImportIsStable(receiver, importBinding) {
  const source = receiver.getSourceFile();
  const resolver = LOCAL_INITIALIZER_RESOLVERS.get(source);
  let stable = true;
  const visit = (node) => {
    if (!stable) return;
    if (ts.isIdentifier(node) && node !== importBinding && node.text === receiver.text
      && identifierIsRuntimeReference(node)) {
      const record = resolver?.resolve(node);
      if (record?.declaration.binding === importBinding) {
        const reference = transparentExpressionRoot(node);
        const parent = reference.parent;
        const member = ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent))
          && parent.expression === reference) ? parent : null;
        if ((!member && !benignDefaultImportRead(reference))
          || (member && (expressionIsMutationTarget(member) || inheritedMutatorMemberCall(member)))) {
          stable = false;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return stable;
}

function sourceProvenReactWrapperName(node) {
  node = unwrapTransparentExpression(node);
  if (ts.isIdentifier(node)) {
    const binding = reactImportBinding(node);
    return binding?.kind === "named" && ["useCallback", "useMemo"].includes(binding.importedName)
      ? binding.importedName
      : null;
  }
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return null;
  const wrapperName = ts.isPropertyAccessExpression(node)
    ? node.name.text
    : node.argumentExpression ? staticStringValue(node.argumentExpression) : null;
  if (!["useCallback", "useMemo"].includes(wrapperName)) return null;
  const receiver = unwrapTransparentExpression(node.expression);
  if (!receiver || !ts.isIdentifier(receiver)) return null;
  const binding = reactImportBinding(receiver);
  if (binding?.kind === "default" && !defaultReactImportIsStable(receiver, binding.binding)) return null;
  return binding && ["default", "namespace"].includes(binding.kind) ? wrapperName : null;
}

function wrappedSecretFunction(node) {
  node = unwrapTransparentExpression(node);
  if (!node || !ts.isCallExpression(node) || node.arguments.length === 0) return null;
  if (!sourceProvenReactWrapperName(node.expression)) return null;
  const callback = unwrapTransparentExpression(node.arguments[0]);
  if (callback && functionLikeNode(callback)) {
    return { functions: [callback], remainingArguments: node.arguments.slice(1) };
  }
  if (!callback || !ts.isIdentifier(callback)) return null;
  const resolved = resolvedLocalFunctions(callback);
  return resolved.functions.length > 0 && !resolved.hasUnresolved
    ? { functions: resolved.functions, remainingArguments: node.arguments.slice(1) }
    : null;
}

function secretNameMode(name) {
  if (!isSecretName(name)) return null;
  if (/^(?:set|update|change|reset|rotate)(?:[_-]+|(?=[A-Z]))/u.test(name)) return "input";
  return "output";
}

function secretFunctionMode(node) {
  if (ts.isGetAccessorDeclaration(node)) return isSecretName(propertyNameText(node.name)) ? "output" : null;
  if (ts.isSetAccessorDeclaration(node)) return isSecretName(propertyNameText(node.name)) ? "input" : null;
  return secretNameMode(secretFunctionName(node));
}

function scanSecretValue(
  node,
  displayPath,
  seenDeclarations = new Set(),
  forcedFunctionMode = null,
  scanResolvedCalls = true
) {
  const value = unwrapTransparentExpression(node);
  const wrapped = wrappedSecretFunction(value);
  if (wrapped) {
    for (const fn of wrapped.functions) {
      scanSecretFunctionSemantics(
        fn,
        displayPath,
        forcedFunctionMode ?? secretFunctionMode(fn) ?? "output",
        seenDeclarations
      );
    }
    for (const argument of wrapped.remainingArguments) {
      scanWrapperArgument(argument, displayPath, seenDeclarations);
    }
  }
  else if (value && functionLikeNode(value) && value.body) {
    scanSecretFunctionSemantics(value, displayPath, forcedFunctionMode ?? secretFunctionMode(value) ?? "output", seenDeclarations);
  }
  else if (value && ts.isCallExpression(value)) {
    scanBoundedCallValue(value, displayPath, seenDeclarations, scanResolvedCalls);
  }
  else if (value) {
    scanSecretExpression(value, displayPath, seenDeclarations, forcedFunctionMode, scanResolvedCalls);
  }
}

function secretFunctionName(node) {
  return propertyNameText(node.name) ?? assignedFunctionSecretName(node);
}

function scanSecretFunctionReturns(node, displayPath, seenDeclarations, nestedFunctionMode = null) {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    scanSecretValue(node.body, displayPath, seenDeclarations, nestedFunctionMode, false);
    return;
  }
  const visitReturns = (current) => {
    if (current !== node.body && functionLikeNode(current)) return;
    if (ts.isReturnStatement(current) && current.expression) {
      scanSecretValue(current.expression, displayPath, seenDeclarations, nestedFunctionMode, false);
      return;
    }
    ts.forEachChild(current, visitReturns);
  };
  visitReturns(node.body);
}

function isSecretBackingWriteTarget(target) {
  const name = (secretTargetName(target) ?? "").replace(/^[_#]+/u, "");
  return isSecretName(name) || /^(?:backingValue|cache|cached|credentialValue|currentValue|secretValue|stored|value)$/u.test(name);
}

function scanSecretFunctionWrites(node, displayPath, seenDeclarations, nestedFunctionMode = null) {
  const visitWrites = (current) => {
    if (current !== node.body && functionLikeNode(current)) return;
    if (ts.isBinaryExpression(current) && isAssignmentOperator(current.operatorToken.kind)) {
      const target = unwrapTransparentExpression(current.left);
      if ((ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) && isSecretBackingWriteTarget(target)) {
        scanSecretValue(current.right, displayPath, seenDeclarations, nestedFunctionMode, false);
      }
    }
    ts.forEachChild(current, visitWrites);
  };
  visitWrites(node.body);
}

function collectDirectFunctionNodes(node, seenDeclarations, functions) {
  const value = unwrapTransparentExpression(node);
  if (!value) return;
  const wrapped = wrappedSecretFunction(value);
  if (wrapped) {
    for (const fn of wrapped.functions) functions.add(fn);
    return;
  }
  if (functionLikeNode(value)) {
    functions.add(value);
    return;
  }
  if (ts.isIdentifier(value)) {
    for (const fn of resolvedDirectFunctionNodes(value, null, seenDeclarations)) functions.add(fn);
    return;
  }
  if (ts.isPropertyAccessExpression(value)) {
    const receiver = unwrapTransparentExpression(value.expression);
    if (ts.isIdentifier(receiver)) {
      for (const fn of resolvedDirectFunctionNodes(receiver, value.name.text, seenDeclarations)) functions.add(fn);
    }
    return;
  }
  if (ts.isElementAccessExpression(value) && value.argumentExpression) {
    const receiver = unwrapTransparentExpression(value.expression);
    const propertyName = staticStringValue(value.argumentExpression);
    if (ts.isIdentifier(receiver) && propertyName !== null) {
      for (const fn of resolvedDirectFunctionNodes(receiver, propertyName, seenDeclarations)) functions.add(fn);
    }
  }
}

function resolvedDirectFunctionNodes(identifier, propertyName = null, seenDeclarations = new Set()) {
  const record = LOCAL_INITIALIZER_RESOLVERS.get(identifier.getSourceFile())?.resolve(identifier);
  if (!record || record.values.length === 0) return [];
  const functions = new Set();
  for (const { initializer: candidate, owner } of record.values) {
    if (seenDeclarations.has(owner)) continue;
    const nextSeen = new Set(seenDeclarations);
    nextSeen.add(owner);
    const value = unwrapTransparentExpression(candidate);
    if (propertyName !== null && value && ts.isIdentifier(value)) {
      for (const fn of resolvedDirectFunctionNodes(value, propertyName, nextSeen)) functions.add(fn);
      continue;
    }
    const initializer = propertyName === null ? candidate : objectLiteralPropertyValue(candidate, propertyName);
    if (initializer) collectDirectFunctionNodes(initializer, nextSeen, functions);
  }
  return [...functions];
}

function scanDirectFunctionArgument(node, displayPath, seenDeclarations) {
  const functions = resolvedDirectFunctionNodesFromValue(node, seenDeclarations);
  for (const fn of functions) {
    scanSecretFunctionSemantics(fn, displayPath, "both", seenDeclarations);
  }
  return functions.length > 0;
}

function resolvedDirectFunctionNodesFromValue(node, seenDeclarations = new Set()) {
  const functions = new Set();
  collectDirectFunctionNodes(node, seenDeclarations, functions);
  return [...functions];
}

function scanBoundedCallValue(node, displayPath, seenDeclarations, scanResolvedCallee) {
  // Generic literals deliberately stop at call boundaries. Provider-token signatures are still rejected globally.
  if (scanResolvedCallee) {
    for (const fn of resolvedDirectFunctionNodesFromValue(node.expression, seenDeclarations)) {
      scanSecretFunctionSemantics(fn, displayPath, "output", seenDeclarations);
    }
  }
  const member = callMember(node.expression);
  const semanticSecretSink = isSecretName(member.name) || isSecretName(member.object);
  for (const argument of node.arguments) {
    const value = ts.isSpreadElement(argument) ? argument.expression : argument;
    const functionArgument = scanDirectFunctionArgument(value, displayPath, seenDeclarations);
    if (semanticSecretSink && !functionArgument) {
      scanSecretValue(value, displayPath, seenDeclarations, null, false);
    }
  }
}

function scanWrapperArgument(node, displayPath, seenDeclarations) {
  const value = unwrapTransparentExpression(node);
  if (!value) return;
  if (ts.isArrayLiteralExpression(value)) {
    for (const element of value.elements) {
      if (ts.isOmittedExpression(element)) continue;
      scanWrapperArgument(ts.isSpreadElement(element) ? element.expression : element, displayPath, seenDeclarations);
    }
    return;
  }
  const functions = resolvedDirectFunctionNodesFromValue(value, seenDeclarations);
  if (functions.length > 0) {
    for (const fn of functions) scanSecretFunctionSemantics(fn, displayPath, "both", seenDeclarations);
    return;
  }
  if (ts.isCallExpression(value)) {
    scanBoundedCallValue(value, displayPath, seenDeclarations, false);
    return;
  }
  scanSecretExpression(value, displayPath, seenDeclarations, "both", false);
}

/*
 * Bounded scanner contract: generic long strings follow only direct secret sinks, aliases, and direct
 * function semantics. Invoked call graphs and ordinary scalar call arguments are intentionally excluded;
 * high-confidence provider tokens and private-key signatures remain global, flow-independent rejections.
 */
function scanSecretFunctionSemantics(node, displayPath, mode, seenDeclarations = new Set()) {
  const nestedFunctionMode = mode === "both" ? "both" : null;
  for (const parameter of node.parameters ?? []) {
    if (parameter.initializer) {
      scanSecretValue(parameter.initializer, displayPath, seenDeclarations, nestedFunctionMode, false);
    }
  }
  if (mode === "input" || mode === "both") {
    scanSecretFunctionWrites(node, displayPath, seenDeclarations, nestedFunctionMode);
  }
  if (mode === "output" || mode === "both") {
    scanSecretFunctionReturns(node, displayPath, seenDeclarations, nestedFunctionMode);
  }
}

function explicitSecretSetterName(value) {
  if (typeof value !== "string") return false;
  const match = /^(?:set|update|change|reset|rotate)(?:[_-]+|(?=[A-Z]))(.+)$/u.exec(value);
  if (!match) return false;
  const target = match[1].replace(/^[_-]+/u, "");
  if (!target) return false;
  return isSecretName(target) || isSecretName(`${target[0].toLowerCase()}${target.slice(1)}`);
}

function trailingSetterMetadataStatus(node, seenOwners = new Set()) {
  node = unwrapTransparentExpression(node);
  if (!node) return "none";
  if (node.kind === ts.SyntaxKind.NullKeyword) return "proven";
  if (functionLikeNode(node)) return "proven";
  if (ts.isIdentifier(node)) {
    const record = LOCAL_INITIALIZER_RESOLVERS.get(node.getSourceFile())?.resolve(node);
    if (node.text === "undefined" && !record) return "proven";
    const metadataLikeName = /^(?:(?:.*(?:Options|Metadata))|options|opts|metadata|callback|cb|context)$/u.test(node.text)
      || /(?:^|_)(?:options|opts|metadata|callback|cb|context)$/iu.test(node.text);
    const parameter = (() => {
      for (let current = record?.declaration?.owner; current; current = current.parent) {
        if (ts.isParameter(current)) return current;
        if (functionLikeNode(current)) break;
      }
      return null;
    })();
    const parameterType = parameter?.type?.getText(node.getSourceFile()) ?? "";
    if (parameter && (metadataLikeName || /(?:Options|Metadata|Callback|Context)\b/u.test(parameterType))) return "proven";
    if (!record || record.values.length === 0) return metadataLikeName ? "suspected" : "none";
    const statuses = record.values.map(({ initializer, owner }) => {
      if (seenOwners.has(owner)) return metadataLikeName ? "suspected" : "none";
      const nextSeen = new Set(seenOwners);
      nextSeen.add(owner);
      return trailingSetterMetadataStatus(initializer, nextSeen);
    });
    if (statuses.every((status) => status === "proven")) return "proven";
    return metadataLikeName || statuses.some((status) => status !== "none") ? "suspected" : "none";
  }
  if (!ts.isObjectLiteralExpression(node)) return "none";
  const optionKeys = /^(?:actor|audit|callback|context|dryRun|logger|metadata|options?|reason|requestId|signal|source|timeout|trace|traceId)$/iu;
  if (node.properties.length === 0) return "proven";
  let allProven = true;
  let metadataShaped = false;
  for (const property of node.properties) {
    if (ts.isSpreadAssignment(property)) {
      metadataShaped = true;
      if (trailingSetterMetadataStatus(property.expression, seenOwners) !== "proven") allProven = false;
      continue;
    }
    const optionKey = optionKeys.test(propertyNameText(property.name) ?? "");
    metadataShaped ||= optionKey;
    if (!optionKey) allProven = false;
  }
  return allProven ? "proven" : metadataShaped ? "suspected" : "none";
}

function callMember(node) {
  node = unwrapTransparentExpression(node);
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    return { object: null, name: node.text.replace(/^#/u, "") };
  }
  if (ts.isPropertyAccessExpression(node)) {
    return { object: secretTargetName(node.expression), name: node.name.text.replace(/^#/u, "") };
  }
  if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    return { object: secretTargetName(node.expression), name: staticStringValue(node.argumentExpression) };
  }
  return { object: null, name: null };
}

function objectLiteralPropertyValue(node, expectedName) {
  node = unwrapTransparentExpression(node);
  if (!node) return null;
  if (!ts.isObjectLiteralExpression(node)) return null;
  for (const property of node.properties) {
    if (propertyNameText(property.name) !== expectedName) continue;
    if (ts.isPropertyAssignment(property)) return property.initializer;
    if (ts.isShorthandPropertyAssignment(property)) return property.name;
    if (ts.isMethodDeclaration(property)) return property;
  }
  return null;
}

function scanDefinePropertyDescriptor(node, displayPath) {
  node = unwrapTransparentExpression(node);
  if (!node || !ts.isObjectLiteralExpression(node)) return;
  for (const property of node.properties) {
    const name = propertyNameText(property.name);
    if (name === "value" && ts.isPropertyAssignment(property)) {
      scanSecretValue(property.initializer, displayPath);
    }
    else if (name === "value" && ts.isShorthandPropertyAssignment(property)) {
      scanSecretValue(property.name, displayPath);
    }
    else if (name === "get") {
      if (functionLikeNode(property) && property.body) scanSecretFunctionSemantics(property, displayPath, "output");
      else if (ts.isPropertyAssignment(property)) scanSecretValue(property.initializer, displayPath, new Set(), "output");
      else if (ts.isShorthandPropertyAssignment(property)) scanSecretValue(property.name, displayPath, new Set(), "output");
    }
    else if (name === "set") {
      if (functionLikeNode(property) && property.body) scanSecretFunctionSemantics(property, displayPath, "input");
      else if (ts.isPropertyAssignment(property)) scanSecretValue(property.initializer, displayPath, new Set(), "input");
      else if (ts.isShorthandPropertyAssignment(property)) scanSecretValue(property.name, displayPath, new Set(), "input");
    }
  }
}

function resolvedLocalFunctions(identifier, seenOwners = new Set()) {
  const record = LOCAL_INITIALIZER_RESOLVERS.get(identifier.getSourceFile())?.resolve(identifier);
  if (!record || record.values.length === 0) return { functions: [], hasUnresolved: true };
  const functions = [];
  let hasUnresolved = false;
  for (const { initializer, owner } of record.values) {
    if (seenOwners.has(owner)) {
      hasUnresolved = true;
      continue;
    }
    const value = unwrapTransparentExpression(initializer);
    if (value && functionLikeNode(value)) {
      functions.push(value);
      continue;
    }
    if (value && ts.isIdentifier(value)) {
      const nextSeen = new Set(seenOwners);
      nextSeen.add(owner);
      const nested = resolvedLocalFunctions(value, nextSeen);
      hasUnresolved ||= nested.hasUnresolved;
      functions.push(...nested.functions);
      continue;
    }
    hasUnresolved = true;
  }
  return { functions, hasUnresolved };
}

function localSetterTargetPlan(node, member) {
  if (member.object !== null) return null;
  const callee = unwrapTransparentExpression(node.expression);
  if (!callee || !ts.isIdentifier(callee)) return null;
  const resolution = resolvedLocalFunctions(callee);
  const resolvedIndices = new Set();
  let needsFallback = resolution.hasUnresolved;
  const subjectName = /^(?:accountId|customerId|id|learnerId|memberId|organizationId|orgId|profileId|studentId|subject|subjectId|tenantId|userId)$/iu;
  const metadataParameterName = /^(?:(?:.*(?:Options|Metadata))|actor|audit|callback|cb|context|dryRun|logger|metadata|options|opts|reason|requestId|signal|source|timeout|traceId)$/u;
  for (const fn of resolution.functions) {
    if (fn.parameters.length === 0 || fn.parameters.some((parameter) => parameter.dotDotDotToken || !ts.isIdentifier(parameter.name))) {
      needsFallback = true;
      continue;
    }
    const parameterNames = fn.parameters.map((parameter) => propertyNameText(parameter.name) ?? "");
    for (const [index, name] of parameterNames.entries()) {
      if (isSecretName(name)) resolvedIndices.add(index);
    }
    const valueStart = subjectName.test(parameterNames[0]) ? 1 : 0;
    for (let index = valueStart; index < parameterNames.length; index += 1) {
      if (!metadataParameterName.test(parameterNames[index])) resolvedIndices.add(index);
    }
  }
  return {
    hasResolvedLocal: resolution.functions.length > 0,
    hasUnresolved: resolution.hasUnresolved,
    indices: [...resolvedIndices],
    needsFallback
  };
}

function scanCallSink(node, displayPath) {
  const member = callMember(node.expression);
  if (member.object === "Reflect" && member.name === "set") {
    const key = node.arguments[1] ? staticStringValue(node.arguments[1]) : null;
    if (isSecretName(key) && node.arguments[2]) scanSecretValue(node.arguments[2], displayPath);
    return;
  }
  if (member.object === "Object" && member.name === "defineProperty") {
    const key = node.arguments[1] ? staticStringValue(node.arguments[1]) : null;
    if (isSecretName(key) && node.arguments[2]) scanDefinePropertyDescriptor(node.arguments[2], displayPath);
    return;
  }
  if (explicitSecretSetterName(member.name)) {
    const candidates = [...node.arguments];
    const resolvedTargetPlan = localSetterTargetPlan(node, member);
    if (resolvedTargetPlan?.indices.length) {
      for (const targetIndex of resolvedTargetPlan.indices) {
        if (targetIndex >= candidates.length) continue;
        for (let index = candidates.length - 1; index > targetIndex; index -= 1) {
          if (trailingSetterMetadataStatus(candidates[index]) === "suspected") {
            scanSecretValue(candidates[index], displayPath);
          }
        }
        scanSecretValue(candidates[targetIndex], displayPath);
      }
      if (!resolvedTargetPlan.needsFallback) return;
      for (const candidate of candidates) {
        if (trailingSetterMetadataStatus(candidate) !== "proven") scanSecretValue(candidate, displayPath);
      }
      return;
    }
    if (resolvedTargetPlan?.hasResolvedLocal && resolvedTargetPlan.needsFallback) {
      for (const candidate of candidates) {
        if (trailingSetterMetadataStatus(candidate) !== "proven") scanSecretValue(candidate, displayPath);
      }
      return;
    }
    if (resolvedTargetPlan && !resolvedTargetPlan.needsFallback) return;
    const standaloneSubjectFirst = member.object === null && candidates.length > 1
      && /^(?:update|change|reset|rotate)(?:[_-]+|(?=[A-Z]))/u.test(member.name);
    const minimumValueIndex = standaloneSubjectFirst ? 1 : 0;
    for (let index = candidates.length - 1; index >= minimumValueIndex; index -= 1) {
      const metadataStatus = trailingSetterMetadataStatus(candidates[index]);
      if (metadataStatus === "proven") continue;
      if (metadataStatus === "suspected") {
        scanSecretValue(candidates[index], displayPath);
        continue;
      }
      scanSecretValue(candidates[index], displayPath);
      return;
    }
    return;
  }
}

function arrayElements(node) {
  node = unwrapTransparentExpression(node);
  if (!node) return null;
  return ts.isArrayLiteralExpression(node) ? node.elements : null;
}

function rhsObjectProperty(node, name) {
  if (!name) return null;
  return objectLiteralPropertyValue(node, name);
}

function scanObjectRestTarget(target, value, consumedKeys, displayPath, inheritedSecret) {
  value = unwrapTransparentExpression(value);
  if (!value || !ts.isObjectLiteralExpression(value)) {
    scanTargetValuePair(target, null, displayPath, inheritedSecret);
    return;
  }
  for (const property of value.properties) {
    const key = propertyNameText(property.name);
    if (!key || consumedKeys.has(key)) continue;
    if (ts.isPropertyAssignment(property)) scanTargetValuePair(target, property.initializer, displayPath, inheritedSecret);
    else if (ts.isShorthandPropertyAssignment(property)) scanTargetValuePair(target, property.name, displayPath, inheritedSecret);
  }
}

function scanTargetValuePair(target, value, displayPath, inheritedSecret = false) {
  target = unwrapTransparentExpression(target);
  if (!target) return;

  if (ts.isBindingElement(target)) {
    const elementSecret = inheritedSecret
      || isSecretName(propertyNameText(target.propertyName))
      || isSecretName(propertyNameText(target.name));
    if (target.initializer && elementSecret) scanSecretValue(target.initializer, displayPath);
    scanTargetValuePair(target.name, value, displayPath, elementSecret);
    return;
  }

  if (ts.isArrayBindingPattern(target) || ts.isArrayLiteralExpression(target)) {
    const values = arrayElements(value);
    for (const [index, element] of target.elements.entries()) {
      if (ts.isOmittedExpression(element)) continue;
      if ((ts.isBindingElement(element) && element.dotDotDotToken) || ts.isSpreadElement(element)) {
        const restTarget = ts.isBindingElement(element) ? element.name : element.expression;
        if (values) {
          for (const restValue of values.slice(index)) {
            if (!ts.isOmittedExpression(restValue)) scanTargetValuePair(restTarget, restValue, displayPath, inheritedSecret);
          }
        }
        else scanTargetValuePair(restTarget, null, displayPath, inheritedSecret);
        break;
      }
      const pairedValue = values?.[index] && !ts.isOmittedExpression(values[index]) ? values[index] : null;
      scanTargetValuePair(element, pairedValue, displayPath, inheritedSecret);
    }
    return;
  }

  if (ts.isObjectBindingPattern(target)) {
    const consumedKeys = new Set(target.elements.filter((element) => !element.dotDotDotToken)
      .map((element) => propertyNameText(element.propertyName) ?? propertyNameText(element.name)).filter(Boolean));
    for (const element of target.elements) {
      const key = propertyNameText(element.propertyName) ?? propertyNameText(element.name);
      const elementSecret = inheritedSecret || isSecretName(key) || isSecretName(propertyNameText(element.name));
      if (element.dotDotDotToken) {
        scanObjectRestTarget(element.name, value, consumedKeys, displayPath, elementSecret);
        continue;
      }
      const pairedValue = rhsObjectProperty(value, key);
      if (element.initializer && elementSecret) scanSecretValue(element.initializer, displayPath);
      scanTargetValuePair(element.name, pairedValue, displayPath, elementSecret);
    }
    return;
  }

  if (ts.isObjectLiteralExpression(target)) {
    const consumedKeys = new Set(target.properties.filter((property) => !ts.isSpreadAssignment(property))
      .map((property) => propertyNameText(property.name)).filter(Boolean));
    for (const property of target.properties) {
      const key = propertyNameText(property.name);
      const propertySecret = inheritedSecret || isSecretName(key);
      const pairedValue = rhsObjectProperty(value, key);
      if (ts.isPropertyAssignment(property)) scanTargetValuePair(property.initializer, pairedValue, displayPath, propertySecret);
      else if (ts.isShorthandPropertyAssignment(property)) {
        if (property.objectAssignmentInitializer && propertySecret) scanSecretValue(property.objectAssignmentInitializer, displayPath);
        scanTargetValuePair(property.name, pairedValue, displayPath, propertySecret);
      }
      else if (ts.isSpreadAssignment(property)) {
        scanObjectRestTarget(property.expression, value, consumedKeys, displayPath, inheritedSecret);
      }
    }
    return;
  }

  if (ts.isSpreadElement(target)) {
    scanTargetValuePair(target.expression, value, displayPath, inheritedSecret);
    return;
  }

  if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const defaultSecret = inheritedSecret || isSecretName(secretTargetName(target.left));
    if (defaultSecret) scanSecretValue(target.right, displayPath);
    scanTargetValuePair(target.left, value, displayPath, inheritedSecret);
    return;
  }

  const targetName = secretTargetName(target) ?? propertyNameText(target);
  const targetSecret = inheritedSecret || isSecretName(targetName);
  if (targetSecret && value) scanSecretValue(value, displayPath, new Set(), secretNameMode(targetName));
}

const LOCAL_INITIALIZER_RESOLVERS = new WeakMap();

function nodeContains(scope, node) {
  for (let current = node; current; current = current.parent) {
    if (current === scope) return true;
  }
  return false;
}

function lexicalScopeFrom(node) {
  for (let current = node; current; current = current.parent) {
    if (ts.isBlock(current) || ts.isSourceFile(current) || ts.isCaseBlock(current)
      || ts.isForStatement(current) || ts.isForInStatement(current) || ts.isForOfStatement(current)
      || ts.isCatchClause(current)) return current;
  }
  return node.getSourceFile();
}

function functionScopeFrom(node) {
  for (let current = node; current; current = current.parent) {
    if (functionLikeNode(current) || ts.isSourceFile(current)) return current;
  }
  return node.getSourceFile();
}

function variableDeclarationScope(node) {
  if (ts.isCatchClause(node.parent)) return node.parent;
  const list = ts.isVariableDeclarationList(node.parent) ? node.parent : null;
  if (list && (list.flags & ts.NodeFlags.BlockScoped) !== 0) {
    const owner = list.parent;
    if (ts.isForStatement(owner) || ts.isForInStatement(owner) || ts.isForOfStatement(owner)) return owner;
    return lexicalScopeFrom(owner.parent ?? owner);
  }
  return functionScopeFrom(node.parent);
}

function addBindingRecords(records, name, owner, initializers, scope, hoisted = false) {
  if (ts.isIdentifier(name)) {
    const bucket = records.get(name.text) ?? [];
    bucket.push({ binding: name, owner, initializers: initializers.filter(Boolean), scope, hoisted });
    records.set(name.text, bucket);
    return;
  }
  if (ts.isObjectBindingPattern(name)) {
    const consumedKeys = new Set(name.elements.filter((element) => !element.dotDotDotToken)
      .map((element) => propertyNameText(element.propertyName) ?? propertyNameText(element.name)).filter(Boolean));
    for (const element of name.elements) {
      const key = propertyNameText(element.propertyName) ?? propertyNameText(element.name);
      const mapped = [];
      for (const initializer of initializers) {
        const value = unwrapTransparentExpression(initializer);
        if (!value || !ts.isObjectLiteralExpression(value)) continue;
        if (element.dotDotDotToken) {
          for (const property of value.properties) {
            const propertyKey = propertyNameText(property.name);
            if (!propertyKey || consumedKeys.has(propertyKey)) continue;
            if (ts.isPropertyAssignment(property)) mapped.push(property.initializer);
            else if (ts.isShorthandPropertyAssignment(property)) mapped.push(property.name);
          }
        }
        else {
          const propertyValue = objectLiteralPropertyValue(value, key);
          if (propertyValue) mapped.push(propertyValue);
        }
      }
      if (element.initializer) mapped.push(element.initializer);
      addBindingRecords(records, element.name, element, mapped, scope, hoisted);
    }
    return;
  }
  if (ts.isArrayBindingPattern(name)) {
    for (const [index, element] of name.elements.entries()) {
      if (ts.isOmittedExpression(element)) continue;
      const mapped = [];
      for (const initializer of initializers) {
        const values = arrayElements(initializer);
        if (!values) continue;
        if (element.dotDotDotToken) mapped.push(...values.slice(index).filter((value) => !ts.isOmittedExpression(value)));
        else if (values[index] && !ts.isOmittedExpression(values[index])) mapped.push(values[index]);
      }
      if (element.initializer) mapped.push(element.initializer);
      addBindingRecords(records, element.name, element, mapped, scope, hoisted);
    }
  }
}

function addAssignmentRecords(assignments, target, initializers, owner, operatorKind, scope) {
  target = unwrapTransparentExpression(target);
  if (!target) return;
  if (ts.isIdentifier(target)) {
    const bucket = assignments.get(target.text) ?? [];
    bucket.push({ binding: target, owner, initializers: initializers.filter(Boolean), operatorKind, scope });
    assignments.set(target.text, bucket);
    return;
  }
  if (operatorKind !== ts.SyntaxKind.EqualsToken) return;
  if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    addAssignmentRecords(assignments, target.left, [...initializers, target.right], owner, operatorKind, scope);
    return;
  }
  if (ts.isArrayLiteralExpression(target)) {
    for (const [index, element] of target.elements.entries()) {
      if (ts.isOmittedExpression(element)) continue;
      const mapped = [];
      for (const initializer of initializers) {
        const values = arrayElements(initializer);
        if (!values) continue;
        if (ts.isSpreadElement(element)) mapped.push(...values.slice(index).filter((value) => !ts.isOmittedExpression(value)));
        else if (values[index] && !ts.isOmittedExpression(values[index])) mapped.push(values[index]);
      }
      addAssignmentRecords(assignments, ts.isSpreadElement(element) ? element.expression : element, mapped, owner, operatorKind, scope);
    }
    return;
  }
  if (ts.isObjectLiteralExpression(target)) {
    const consumedKeys = new Set(target.properties.filter((property) => !ts.isSpreadAssignment(property))
      .map((property) => propertyNameText(property.name)).filter(Boolean));
    for (const property of target.properties) {
      if (ts.isSpreadAssignment(property)) {
        const restValues = [];
        for (const initializer of initializers) {
          const value = unwrapTransparentExpression(initializer);
          if (!value || !ts.isObjectLiteralExpression(value)) continue;
          for (const sourceProperty of value.properties) {
            const key = propertyNameText(sourceProperty.name);
            if (!key || consumedKeys.has(key)) continue;
            if (ts.isPropertyAssignment(sourceProperty)) restValues.push(sourceProperty.initializer);
            else if (ts.isShorthandPropertyAssignment(sourceProperty)) restValues.push(sourceProperty.name);
          }
        }
        addAssignmentRecords(assignments, property.expression, restValues, owner, operatorKind, scope);
        continue;
      }
      const key = propertyNameText(property.name);
      const mapped = initializers.map((initializer) => objectLiteralPropertyValue(initializer, key)).filter(Boolean);
      if (ts.isPropertyAssignment(property)) {
        addAssignmentRecords(assignments, property.initializer, mapped, owner, operatorKind, scope);
      }
      else if (ts.isShorthandPropertyAssignment(property)) {
        if (property.objectAssignmentInitializer) mapped.push(property.objectAssignmentInitializer);
        addAssignmentRecords(assignments, property.name, mapped, owner, operatorKind, scope);
      }
    }
  }
}

function scopeDepth(scope) {
  let depth = 0;
  for (let current = scope; current; current = current.parent) depth += 1;
  return depth;
}

function createLocalInitializerResolver(source) {
  const records = new Map();
  const assignments = new Map();
  const addNamedBlocker = (name, owner, scope) => {
    if (name && ts.isIdentifier(name)) addBindingRecords(records, name, owner, [], scope);
  };
  const nestedInAssignmentTarget = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (ts.isBinaryExpression(current) && isAssignmentOperator(current.operatorToken.kind)
        && nodeContains(current.left, node)) return true;
      if (ts.isStatement(current)) return false;
    }
    return false;
  };
  const collect = (node) => {
    if (ts.isVariableDeclaration(node)) {
      addBindingRecords(records, node.name, node, node.initializer ? [node.initializer] : [], variableDeclarationScope(node));
    }
    else if (ts.isParameter(node)) {
      addBindingRecords(records, node.name, node, node.initializer ? [node.initializer] : [], node.parent);
    }
    else if (ts.isFunctionDeclaration(node)) {
      if (node.name) addBindingRecords(records, node.name, node, [node], lexicalScopeFrom(node.parent), true);
    }
    else if (ts.isClassDeclaration(node)) {
      addNamedBlocker(node.name, node, lexicalScopeFrom(node.parent));
    }
    else if (ts.isFunctionExpression(node) || ts.isClassExpression(node)) {
      addNamedBlocker(node.name, node, node);
    }
    else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportClause(node)) {
      addNamedBlocker(node.name, node, source);
    }
    else if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind) && !nestedInAssignmentTarget(node)) {
      addAssignmentRecords(assignments, node.left, [node.right], node, node.operatorToken.kind, lexicalScopeFrom(node));
    }
    ts.forEachChild(node, collect);
  };
  collect(source);
  const containingRecords = (name, node) => (records.get(name) ?? []).filter((record) => nodeContains(record.scope, node));
  const deepestScopeRecords = (name, node) => {
    const candidates = containingRecords(name, node);
    if (candidates.length === 0) return [];
    const deepest = Math.max(...candidates.map((record) => scopeDepth(record.scope)));
    return candidates.filter((record) => scopeDepth(record.scope) === deepest);
  };
  const selectDeclaration = (name, node) => {
    const sameScope = deepestScopeRecords(name, node);
    if (sameScope.length === 0) return null;
    const position = node.getStart(source);
    return sameScope.filter((record) => record.hoisted || record.binding.getStart(source) <= position)
      .sort((left, right) => right.binding.getStart(source) - left.binding.getStart(source))[0]
      ?? { ...sameScope[0], initializers: [] };
  };
  const statementListScope = (node) => {
    for (let current = node; current; current = current.parent) {
      if (ts.isBlock(current) || ts.isSourceFile(current) || ts.isCaseBlock(current)) return current;
    }
    return source;
  };
  const hasControlFlowAncestor = (node, stop) => {
    for (let current = node.parent; current && current !== stop; current = current.parent) {
      if (ts.isIfStatement(current) || ts.isConditionalExpression(current) || ts.isSwitchStatement(current)
        || ts.isCaseClause(current) || ts.isDefaultClause(current) || ts.isForStatement(current)
        || ts.isForInStatement(current) || ts.isForOfStatement(current) || ts.isWhileStatement(current)
        || ts.isDoStatement(current) || ts.isTryStatement(current) || ts.isCatchClause(current)
        || (ts.isBinaryExpression(current) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken].includes(current.operatorToken.kind))) return true;
    }
    return false;
  };
  const isStraightLineReplacement = (event, reference) => {
    if (event.operatorKind !== ts.SyntaxKind.EqualsToken) return false;
    const eventStatements = statementListScope(event.binding);
    return eventStatements === statementListScope(reference) && !hasControlFlowAncestor(event.binding, eventStatements);
  };
  return {
    resolve(identifier) {
      const declaration = selectDeclaration(identifier.text, identifier);
      if (!declaration) return null;
      const referencePosition = identifier.getStart(source);
      const assignmentEvents = (assignments.get(identifier.text) ?? []).filter((event) => {
        if (event.binding.getStart(source) <= declaration.binding.getStart(source)
          || event.binding.getStart(source) > referencePosition) return false;
        const eventDeclaration = selectDeclaration(identifier.text, event.binding);
        return eventDeclaration?.binding === declaration.binding
          && nodeContains(functionScopeFrom(event.binding), identifier);
      }).sort((left, right) => left.binding.getStart(source) - right.binding.getStart(source));
      let values = declaration.initializers.map((initializer) => ({ initializer, owner: declaration.owner }));
      for (const event of assignmentEvents) {
        const eventValues = event.initializers.map((initializer) => ({ initializer, owner: event.owner }));
        values = isStraightLineReplacement(event, identifier) ? eventValues : [...values, ...eventValues];
      }
      return { declaration, values };
    }
  };
}

function resolvableValueIdentifier(node) {
  if (!ts.isIdentifier(node)) return false;
  const parent = node.parent;
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isDeclarationName(node)) return false;
  if (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isCallExpression(parent) && parent.expression === node) return false;
  for (let current = parent; current && current !== node.getSourceFile(); current = current.parent) {
    if (ts.isTypeNode(current)) return false;
    if (ts.isExpression(current) || ts.isStatement(current)) break;
  }
  return true;
}

function scanJavaScriptLiteral(value, displayPath, assignment) {
  if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/u.test(value)) {
    throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: private-key header`);
  }
  for (const pattern of TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    let tokenMatch;
    while ((tokenMatch = pattern.exec(value)) !== null) {
      if (!isPlaceholder(tokenMatch[0])) throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: high-confidence token`);
    }
  }
  if (assignment && literalContainsHighConfidenceSecret(value)) {
    throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: high-confidence token assignment`);
  }
}

function scanSecretExpression(
  node,
  displayPath,
  seenDeclarations = new Set(),
  resolvedFunctionMode = null,
  scanResolvedCalls = true
) {
  const staticValue = staticStringValue(node);
  if (staticValue !== null) scanJavaScriptLiteral(staticValue, displayPath, true);
  const resolver = LOCAL_INITIALIZER_RESOLVERS.get(node.getSourceFile());
  const scanResolved = (identifier, propertyName = null, forcedFunctionMode = resolvedFunctionMode) => {
    const record = resolver?.resolve(identifier);
    // Unknown values and initializer cycles are not classified as embedded literals; raw token signatures still fail closed.
    if (!record || record.values.length === 0) return;
    for (const { initializer: candidate, owner } of record.values) {
      if (seenDeclarations.has(owner)) continue;
      const initializer = propertyName === null ? candidate : objectLiteralPropertyValue(candidate, propertyName);
      if (!initializer) continue;
      const nextSeen = new Set(seenDeclarations);
      nextSeen.add(owner);
      scanSecretValue(initializer, displayPath, nextSeen, forcedFunctionMode, scanResolvedCalls);
    }
  };
  const visit = (current) => {
    if (ts.isCallExpression(current)) {
      scanBoundedCallValue(current, displayPath, seenDeclarations, scanResolvedCalls);
      return;
    }
    if (ts.isPropertyAccessExpression(current)) {
      if (ts.isIdentifier(current.expression)) scanResolved(current.expression, current.name.text);
      else visit(current.expression);
      return;
    }
    if (ts.isElementAccessExpression(current)) {
      const propertyName = current.argumentExpression ? staticStringValue(current.argumentExpression) : null;
      if (propertyName !== null && ts.isIdentifier(current.expression)) scanResolved(current.expression, propertyName);
      else if (!ts.isIdentifier(current.expression)) visit(current.expression);
      return;
    }
    if (resolvableValueIdentifier(current)) {
      scanResolved(current);
      return;
    }
    if (ts.isStringLiteralLike(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      scanJavaScriptLiteral(current.text, displayPath, true);
      return;
    }
    if (ts.isTemplateExpression(current)) {
      scanJavaScriptLiteral(current.head.text, displayPath, true);
      for (const span of current.templateSpans) {
        visit(span.expression);
        scanJavaScriptLiteral(span.literal.text, displayPath, true);
      }
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
}

function scanJavaScriptSource(source, displayPath) {
  LOCAL_INITIALIZER_RESOLVERS.set(source, createLocalInitializerResolver(source));
  const globallyScanLiterals = (node) => {
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) scanJavaScriptLiteral(node.text, displayPath, false);
    else if (ts.isTemplateExpression(node)) {
      scanJavaScriptLiteral(node.head.text, displayPath, false);
      for (const span of node.templateSpans) scanJavaScriptLiteral(span.literal.text, displayPath, false);
    }
    ts.forEachChild(node, globallyScanLiterals);
  };
  globallyScanLiterals(source);
  const visit = (node) => {
    let expression = null;
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node)) && node.initializer) {
      scanTargetValuePair(node.name, node.initializer, displayPath);
    }
    else if (ts.isPropertyAssignment(node)) scanTargetValuePair(node.name, node.initializer, displayPath);
    else if (ts.isShorthandPropertyAssignment(node) && node.objectAssignmentInitializer) {
      scanTargetValuePair(node.name, node.objectAssignmentInitializer, displayPath);
    }
    else if (ts.isEnumMember(node) && node.initializer) scanTargetValuePair(node.name, node.initializer, displayPath);
    else if (functionLikeNode(node) && node.body && secretFunctionMode(node)) {
      scanSecretFunctionSemantics(node, displayPath, secretFunctionMode(node));
    }
    else if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      scanTargetValuePair(node.left, node.right, displayPath);
    }
    else if (ts.isCallExpression(node)) scanCallSink(node, displayPath);
    else if (ts.isJsxAttribute(node) && isSecretName(propertyNameText(node.name)) && node.initializer) {
      expression = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
    }
    if (expression) scanSecretValue(expression, displayPath);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function scanJavaScriptText(text, displayPath, scriptPath = displayPath) {
  const extension = path.extname(scriptPath).toLowerCase();
  const scriptKind = extension === ".tsx" ? ts.ScriptKind.TSX : extension === ".jsx" ? ts.ScriptKind.JSX
    : extension === ".ts" ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const source = ts.createSourceFile(scriptPath, text, ts.ScriptTarget.Latest, true, scriptKind);
  if ((source.parseDiagnostics ?? []).length > 0) throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: JavaScript/TypeScript parse failed closed`);
  scanJavaScriptSource(source, displayPath);
}

function scanRawSignatures(text, displayPath) {
  if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/u.test(text)) {
    throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: private-key header`);
  }
  if (containsHighConfidenceProviderToken(text)) {
    throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: high-confidence token`);
  }
}

export function scanOpaqueRawSignatures(buffer, displayPath) {
  if (!Buffer.isBuffer(buffer)) throw new Error("opaque raw signature scan requires a Buffer");
  if (buffer.length > OPAQUE_RAW_SCAN_MAX_BYTES) {
    throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: opaque binary size limit exceeded`);
  }
  const views = new Set();
  views.add(buffer.toString("latin1"));
  if (isUtf8(buffer)) views.add(buffer.toString("utf8"));
  for (const offset of [0, 1]) {
    const available = buffer.length - offset;
    const evenLength = available - (available % 2);
    if (evenLength <= 0) continue;
    const utf16Bytes = buffer.subarray(offset, offset + evenLength);
    views.add(utf16Bytes.toString("utf16le"));
    views.add(Buffer.from(utf16Bytes).swap16().toString("utf16le"));
  }
  views.add(Buffer.from([...buffer].filter((byte) => byte !== 0)).toString("latin1"));
  for (const text of views) scanRawSignatures(text, displayPath);
}

function containsHighConfidenceProviderToken(text) {
  for (const pattern of TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!isPlaceholder(match[0])) return true;
    }
  }
  return false;
}

function jsonFirstAssignmentValue(rawValue) {
  let start = 0;
  while (rawValue[start] === " " || rawValue[start] === "\t") start += 1;
  const first = rawValue[start];
  if (first === "\"" || first === "'") {
    let escaped = false;
    for (let index = start + 1; index < rawValue.length; index += 1) {
      if (escaped) escaped = false;
      else if (rawValue[index] === "\\") escaped = true;
      else if (rawValue[index] === first) return rawValue.slice(start, index + 1);
    }
    return rawValue.slice(start);
  }
  if (first === "[" || first === "{") {
    const stack = [first];
    let quote = null;
    let escaped = false;
    for (let index = start + 1; index < rawValue.length; index += 1) {
      const character = rawValue[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === "\"" || character === "'") quote = character;
      else if (character === "[" || character === "{") stack.push(character);
      else if (character === "]" || character === "}") {
        stack.pop();
        if (stack.length === 0) return rawValue.slice(start, index + 1);
      }
    }
    return rawValue.slice(start);
  }
  let end = start;
  while (end < rawValue.length && rawValue[end] !== "," && rawValue[end] !== "}" && rawValue[end] !== "]") end += 1;
  return rawValue.slice(start, end);
}

function markdownShellAssignmentValue(rawValue, displayPath) {
  if (rawValue.endsWith("\r")) rawValue = rawValue.slice(0, -1);
  let escaped = false;
  let quote = null;
  let sawValueCharacter = false;
  let value = "";
  for (let index = 0; index < rawValue.length; index += 1) {
    const character = rawValue[index];
    if (escaped) {
      escaped = false;
      sawValueCharacter = true;
      value += character;
      continue;
    }
    if (quote !== "'" && (character === "`"
      || (character === "$" && ["'", "\"", "("].includes(rawValue[index + 1])))) {
      rejectSecretAssignment(displayPath);
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      else value += character;
      continue;
    }
    if (quote === "\"") {
      if (character === "\"") quote = null;
      else if (character === "\\") escaped = true;
      else value += character;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      sawValueCharacter = true;
      continue;
    }
    if (character === "'" || character === "\"") {
      quote = character;
      sawValueCharacter = true;
      continue;
    }
    if (character === " " || character === "\t") {
      if (sawValueCharacter) break;
      continue;
    }
    if (character === ";") break;
    sawValueCharacter = true;
    value += character;
  }
  if (escaped || quote !== null) rejectSecretAssignment(displayPath);
  return value;
}

function textAssignmentValue(rawValue, { displayPath, operator }) {
  if (operator === "=" && isMarkdownPath(displayPath)) {
    return markdownShellAssignmentValue(rawValue, displayPath);
  }
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escaped = false;
  for (let index = 0; index < rawValue.length; index += 1) {
    const character = rawValue[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && (inDoubleQuote || inSingleQuote)) {
      escaped = true;
      continue;
    }
    if (character === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (character === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (character === "#" && !inDoubleQuote && !inSingleQuote && (index === 0 || /[\t ]/u.test(rawValue[index - 1]))) {
      rawValue = rawValue.slice(0, index);
      break;
    }
    if (character === ";" && operator === "=" && !inDoubleQuote && !inSingleQuote) {
      rawValue = rawValue.slice(0, index);
      break;
    }
  }
  if (operator === ":" && isJsonPath(displayPath)) {
    return jsonFirstAssignmentValue(rawValue);
  }
  return rawValue;
}

function assignmentContainsHighConfidenceSecret(rawValue, options) {
  const value = textAssignmentValue(rawValue, options).replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/gu, "");
  if (rawValue.includes(EXACT_API_ME_ROUTE_TEST_SECRET)
    && (rawValue !== EXACT_API_ME_ROUTE_TEST_SECRET || options.postOperatorWhitespace === true)) return true;
  if (isMarkdownPath(options.displayPath)
    && value.includes(EXACT_DEEPSEEK_E2E_SESSION_SECRET)
    && value !== EXACT_DEEPSEEK_E2E_SESSION_SECRET) return true;
  if (containsHighConfidenceProviderToken(value)) return true;
  const fragments = value.match(/[A-Za-z0-9_.$/+=-]+/gu) ?? [];
  let hasExactPlaceholder = false;
  const nonPlaceholderFragments = [];
  for (const fragment of fragments) {
    if (isExactStructuredPlaceholder(fragment)) hasExactPlaceholder = true;
    else nonPlaceholderFragments.push(fragment);
  }
  if (fragments.some((fragment) => fragment.length >= 20 && !isPlaceholder(fragment))) return true;
  if (!options.aggregateFragments) return false;
  if (hasExactPlaceholder && nonPlaceholderFragments.length > 0) return true;
  const flattened = nonPlaceholderFragments.join("");
  return flattened.length >= 20 && !isExactStructuredPlaceholder(flattened);
}

function rejectSecretAssignment(displayPath) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: high-confidence token assignment`);
}

function isYamlPath(displayPath) {
  return /\.ya?ml(?:\.(?:example|sample|template|tmpl|local|dist|default|bak|backup|orig))*$/iu.test(displayPath);
}

function isJsonPath(displayPath) {
  return /\.jsonl?(?:\.(?:example|sample|template|tmpl|local|dist|default|bak|backup|orig))*$/iu.test(displayPath);
}

function isMarkdownPath(displayPath) {
  return /\.mdx?(?:\.(?:example|sample|template|tmpl|local|dist|default|bak|backup|orig))*$/iu.test(displayPath);
}

function isJsonLinesPath(displayPath) {
  return /\.jsonl(?:\.(?:example|sample|template|tmpl|local|dist|default|bak|backup|orig))*$/iu.test(displayPath);
}

function rejectYamlParse(displayPath) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: YAML parse failed closed for token assignment safety`);
}

function rejectYamlStructure(displayPath, kind) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: YAML ${kind} failed closed for high-confidence token assignment safety`);
}

function rejectJsonParse(displayPath) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: JSON parse failed closed for token assignment safety`);
}

function rejectJsonStructure(displayPath, kind) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: JSON ${kind} failed closed for high-confidence token assignment safety`);
}

function yamlQuoteStartsScalar(line, index, flowDepth, flowColonFollowsCompletedNode) {
  let cursor = index - 1;
  while (cursor >= 0 && (line[cursor] === " " || line[cursor] === "\t")) cursor -= 1;
  if (cursor < 0) return true;
  const separated = cursor < index - 1;
  if (line[cursor] === "[" || line[cursor] === "{" || line[cursor] === ",") return true;
  if ((line[cursor] === "-" || line[cursor] === "?") && separated) return true;
  if (line[cursor] === ":") {
    if (separated) return true;
    return flowDepth > 0 && flowColonFollowsCompletedNode;
  }
  return /(?:^|[\t :,[{?+-])(?:![^\t ]+|&[^\t ]+)[\t ]*$/u.test(line.slice(0, index));
}

function yamlFlowCollectionStarts(line, index, flowDepth) {
  let cursor = index - 1;
  while (cursor >= 0 && (line[cursor] === " " || line[cursor] === "\t")) cursor -= 1;
  if (cursor < 0) return true;
  const separated = cursor < index - 1;
  if (line[cursor] === ":") return separated || flowDepth > 0;
  if ((line[cursor] === "-" || line[cursor] === "?") && separated) return true;
  if (flowDepth > 0 && (line[cursor] === "[" || line[cursor] === "{" || line[cursor] === ",")) return true;
  return /(?:^|[\t :,[{?+-])(?:![^\t ]+|&[^\t ]+)[\t ]*$/u.test(line.slice(0, index));
}

function assertYamlSourceBounds(text, displayPath) {
  if (Buffer.byteLength(text, "utf8") > YAML_MAX_TEXT_BYTES) rejectYamlStructure(displayPath, "text size limit");
  let documentMarkers = 0;
  let implicitDocumentBeforeFirstMarker = false;
  let flowDepth = 0;
  let lineCount = 0;
  let structureMarkers = 0;
  let blockScalarIndent = null;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escaped = false;
  let flowKeyCandidateState = "none";

  for (let lineStart = 0; lineStart <= text.length;) {
    const newline = text.indexOf("\n", lineStart);
    let lineEnd = newline === -1 ? text.length : newline;
    if (lineEnd > lineStart && text[lineEnd - 1] === "\r") lineEnd -= 1;
    const line = text.slice(lineStart, lineEnd);
    lineCount += 1;
    if (lineCount > YAML_MAX_SOURCE_LINE_COUNT) rejectYamlStructure(displayPath, "source line limit");
    for (let index = 0; index < line.length; index += 1) {
      if ("[]{},?:-".includes(line[index])) {
        structureMarkers += 1;
        if (structureMarkers > YAML_MAX_SOURCE_STRUCTURE_MARKERS) rejectYamlStructure(displayPath, "source structure limit");
      }
    }
    const indentation = line.match(/^[\t ]*/u)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (blockScalarIndent !== null) {
      if (trimmed === "" || indentation > blockScalarIndent) {
        if (newline === -1) break;
        lineStart = newline + 1;
        continue;
      }
      blockScalarIndent = null;
    }

    const quotedContinuation = inDoubleQuote || inSingleQuote;
    if (!quotedContinuation) {
      const documentMarker = /^---(?:[\t ]*(?:#.*)?)?$/u.test(line);
      if (documentMarker) {
        documentMarkers += 1;
        const documentCount = documentMarkers + (implicitDocumentBeforeFirstMarker ? 1 : 0);
        if (documentCount > YAML_MAX_DOCUMENT_COUNT) rejectYamlStructure(displayPath, "document limit");
      } else if (documentMarkers === 0
        && trimmed !== ""
        && !trimmed.startsWith("#")
        && !trimmed.startsWith("%")) {
        implicitDocumentBeforeFirstMarker = true;
      }
      if (indentation > YAML_MAX_NODE_DEPTH) rejectYamlStructure(displayPath, "source indentation limit");
      let sequenceDepth = 0;
      let cursor = indentation;
      while (line[cursor] === "-" && (line[cursor + 1] === " " || line[cursor + 1] === "\t")) {
        sequenceDepth += 1;
        if (sequenceDepth > YAML_MAX_NODE_DEPTH) rejectYamlStructure(displayPath, "source depth limit");
        cursor += 1;
        while (line[cursor] === " " || line[cursor] === "\t") cursor += 1;
      }
    }

    let commentIndex = -1;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (inDoubleQuote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === "\"") {
          inDoubleQuote = false;
          flowKeyCandidateState = flowDepth > 0 ? "closed" : "none";
        }
        continue;
      }
      if (inSingleQuote) {
        if (character === "'" && line[index + 1] === "'") index += 1;
        else if (character === "'") {
          inSingleQuote = false;
          flowKeyCandidateState = flowDepth > 0 ? "closed" : "none";
        }
        continue;
      }
      if (character === "#" && (index === 0 || /[\t ]/u.test(line[index - 1]))) {
        commentIndex = index;
        break;
      }
      if (character === "\"") {
        if (yamlQuoteStartsScalar(line, index, flowDepth, flowKeyCandidateState === "colon")) {
          inDoubleQuote = true;
        }
        flowKeyCandidateState = "none";
        continue;
      }
      if (character === "'") {
        if (yamlQuoteStartsScalar(line, index, flowDepth, flowKeyCandidateState === "colon")) {
          inSingleQuote = true;
        }
        flowKeyCandidateState = "none";
        continue;
      }
      if (character === " " || character === "\t" || character === "\r") continue;
      if (character === ":") {
        flowKeyCandidateState = flowDepth > 0 && flowKeyCandidateState === "closed" ? "colon" : "none";
        continue;
      }
      if ((character === "[" || character === "{") && yamlFlowCollectionStarts(line, index, flowDepth)) {
        flowDepth += 1;
        if (flowDepth > YAML_MAX_NODE_DEPTH) rejectYamlStructure(displayPath, "source depth limit");
        flowKeyCandidateState = "none";
        continue;
      } else if ((character === "]" || character === "}") && flowDepth > 0) {
        flowDepth -= 1;
        flowKeyCandidateState = flowDepth > 0 ? "closed" : "none";
        continue;
      }
      flowKeyCandidateState = "none";
    }

    escaped = false;
    const structuralLine = line.slice(0, commentIndex === -1 ? line.length : commentIndex).trimEnd();
    if (!inDoubleQuote
      && !inSingleQuote
      && /(?:^|[:?+-][\t ]+)(?:[!&][^\t ]+[\t ]+)*[|>](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?$/u.test(structuralLine)) {
      blockScalarIndent = indentation;
    }
    if (newline === -1) break;
    lineStart = newline + 1;
  }
}

function yamlKeyIsSecretOrUncertain(node, displayPath, rejectStructure = rejectYamlStructure) {
  if (node === null || node === undefined || isAlias(node)) {
    if (isAlias(node)) rejectStructure(displayPath, "alias");
    return true;
  }
  if (node.tag || node.anchor) rejectStructure(displayPath, node.tag ? "tag" : "anchor");
  if (!isScalar(node)) return true;
  if (node.value === null || node.value === undefined) return true;
  return isSecretName(typeof node.value === "string" ? node.value : String(node.value));
}

function appendYamlSecretScalar(secretGroup, node, displayPath, role) {
  const text = typeof node.value === "string"
    ? node.value
    : typeof node.source === "string"
      ? node.source
      : String(node.value ?? "");
  if (literalContainsHighConfidenceSecret(text)) rejectSecretAssignment(displayPath);
  for (const fragment of text.match(/[A-Za-z0-9_./+=-]+/gu) ?? []) {
    if ((role === "value" ? isExactStructuredPlaceholder(fragment) : isExactYamlPlaceholder(fragment))) {
      if (role === "value") secretGroup.hasExactValuePlaceholder = true;
    } else if (role === "key") secretGroup.keyFragments.push(fragment);
    else secretGroup.valueFragments.push(fragment);
  }
}

function finalizeYamlSecretGroup(secretGroup, displayPath) {
  const keyValue = secretGroup.keyFragments.join("");
  const value = secretGroup.valueFragments.join("");
  if (secretGroup.hasExactValuePlaceholder && value.length > 0) rejectSecretAssignment(displayPath);
  if (keyValue.length >= 20 && !isExactYamlPlaceholder(keyValue)) rejectSecretAssignment(displayPath);
  if (value.length >= 20 && !isExactStructuredPlaceholder(value)) rejectSecretAssignment(displayPath);
  const combined = `${keyValue}${value}`;
  if (keyValue && value && combined.length >= 20
    && !isExactStructuredPlaceholder(value)
    && !isExactStructuredPlaceholder(combined)) {
    rejectSecretAssignment(displayPath);
  }
}

function scanYamlDocumentNode(root, displayPath, nodeBudget, {
  maxNodeDepth = YAML_MAX_NODE_DEPTH,
  rejectStructure = rejectYamlStructure,
  scanDecodedScalars = false
} = {}) {
  if (root === null || root === undefined) return 0;
  const stack = [{ node: root, depth: 0, secretGroup: null, secretRole: null }];
  let visited = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current.finalizeSecretGroup) {
      finalizeYamlSecretGroup(current.finalizeSecretGroup, displayPath);
      continue;
    }
    if (++visited > nodeBudget || current.depth > maxNodeDepth) rejectStructure(displayPath, "structure limit");
    if (isAlias(current.node)) rejectStructure(displayPath, "alias");
    if (isPair(current.node)) {
      let valueSecretGroup = current.secretGroup;
      const keyIsSecretOrUncertain = yamlKeyIsSecretOrUncertain(current.node.key, displayPath, rejectStructure);
      const startsSecretGroup = !valueSecretGroup && keyIsSecretOrUncertain;
      if (startsSecretGroup && current.node.value !== null && current.node.value !== undefined) {
        valueSecretGroup = {
          hasExactValuePlaceholder: false,
          keyFragments: [],
          valueFragments: []
        };
      }
      if (current.node.key !== null && current.node.key !== undefined) {
        stack.push({
          node: current.node.key,
          depth: current.depth + 1,
          secretGroup: current.secretGroup,
          secretRole: "key"
        });
      }
      if (current.node.value !== null && current.node.value !== undefined) {
        if (startsSecretGroup) stack.push({ finalizeSecretGroup: valueSecretGroup });
        stack.push({
          node: current.node.value,
          depth: current.depth + 1,
          secretGroup: valueSecretGroup,
          secretRole: current.secretRole === "key" ? "key" : "value"
        });
      }
      continue;
    }
    if (isMap(current.node) || isSeq(current.node)) {
      if (current.secretGroup && (current.node.tag || current.node.anchor)) rejectStructure(displayPath, current.node.tag ? "tag" : "anchor");
      for (let index = current.node.items.length - 1; index >= 0; index -= 1) {
        const child = current.node.items[index];
        if (child !== null && child !== undefined) {
          stack.push({
            node: child,
            depth: current.depth + 1,
            secretGroup: current.secretGroup,
            secretRole: current.secretRole
          });
        }
      }
      continue;
    }
    if (!isScalar(current.node)) rejectStructure(displayPath, "unknown node");
    if (scanDecodedScalars && typeof current.node.value === "string") {
      scanJavaScriptLiteral(current.node.value, displayPath, false);
    }
    if (current.secretGroup) {
      if (current.node.tag || current.node.anchor) rejectStructure(displayPath, current.node.tag ? "tag" : "anchor");
      appendYamlSecretScalar(current.secretGroup, current.node, displayPath, current.secretRole ?? "value");
    }
  }
  return visited;
}

function scanYamlSecretStructures(text, displayPath) {
  assertYamlSourceBounds(text, displayPath);
  let documents;
  try {
    documents = parseAllDocuments(text, {
      customTags: [],
      keepSourceTokens: false,
      logLevel: "error",
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "failsafe",
      stringKeys: false,
      strict: true,
      uniqueKeys: true,
      version: "1.2"
    });
  } catch {
    rejectYamlParse(displayPath);
  }
  if (documents.length > YAML_MAX_DOCUMENT_COUNT) rejectYamlStructure(displayPath, "document limit");
  let remainingNodeBudget = YAML_MAX_NODE_COUNT;
  for (const document of documents) {
    if (document.errors.length > 0 || document.warnings.length > 0) rejectYamlParse(displayPath);
    remainingNodeBudget -= scanYamlDocumentNode(document.contents, displayPath, remainingNodeBudget, { scanDecodedScalars: true });
  }
}

function assertJsonSourceBounds(text, displayPath) {
  if (Buffer.byteLength(text, "utf8") > JSON_MAX_TEXT_BYTES) rejectJsonStructure(displayPath, "text size limit");
  let depth = 0;
  let documentCount = 0;
  let inString = false;
  let escaped = false;
  let lineHasContent = false;
  let lineCount = 1;
  let structureMarkers = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
    } else if (character === "\"") {
      inString = true;
    } else {
      if (character === "{" || character === "[") {
        depth += 1;
        if (depth > JSON_MAX_NODE_DEPTH) rejectJsonStructure(displayPath, "source depth limit");
      } else if ((character === "}" || character === "]") && depth > 0) {
        depth -= 1;
      }
      if ("{}[],:".includes(character)) {
        structureMarkers += 1;
        if (structureMarkers > JSON_MAX_SOURCE_STRUCTURE_MARKERS) rejectJsonStructure(displayPath, "source structure limit");
      }
    }
    if (character === "\n") {
      lineCount += 1;
      if (lineCount > JSON_MAX_SOURCE_LINE_COUNT) rejectJsonStructure(displayPath, "source line limit");
      if (isJsonLinesPath(displayPath) && lineHasContent) {
        documentCount += 1;
        if (documentCount > JSON_MAX_DOCUMENT_COUNT) rejectJsonStructure(displayPath, "document limit");
      }
      lineHasContent = false;
    } else if (!/[\t\r ]/u.test(character)) {
      lineHasContent = true;
    }
  }
  if (isJsonLinesPath(displayPath) && lineHasContent && ++documentCount > JSON_MAX_DOCUMENT_COUNT) {
    rejectJsonStructure(displayPath, "document limit");
  }
}

function scanJsonNativeNodes(root, displayPath, nodeBudget) {
  const stack = [root];
  let visited = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (++visited > nodeBudget) rejectJsonStructure(displayPath, "native structure limit");
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) stack.push(current[index]);
    } else if (current !== null && typeof current === "object") {
      for (const key in current) {
        if (Object.hasOwn(current, key)) stack.push(current[key]);
      }
    }
  }
  return visited;
}

function parseJsonAst(text, displayPath) {
  let documents;
  try {
    documents = parseAllDocuments(text, {
      customTags: [],
      doubleQuotedAsJSON: true,
      keepSourceTokens: false,
      logLevel: "error",
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "json",
      stringKeys: false,
      strict: true,
      uniqueKeys: true,
      version: "1.2"
    });
  } catch {
    rejectJsonParse(displayPath);
  }
  if (documents.length !== 1 || documents[0].errors.length > 0 || documents[0].warnings.length > 0) {
    rejectJsonParse(displayPath);
  }
  return documents[0].contents;
}

function scanJsonSecretStructures(text, displayPath) {
  assertJsonSourceBounds(text, displayPath);
  let remainingNativeNodeBudget = JSON_MAX_NATIVE_NODE_COUNT;
  let remainingNodeBudget = JSON_MAX_NODE_COUNT;
  let documentCount = 0;
  const scanDocument = (source) => {
    documentCount += 1;
    if (documentCount > JSON_MAX_DOCUMENT_COUNT) rejectJsonStructure(displayPath, "document limit");
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch {
      rejectJsonParse(displayPath);
    }
    remainingNativeNodeBudget -= scanJsonNativeNodes(parsed, displayPath, remainingNativeNodeBudget);
    parsed = null;
    const root = parseJsonAst(source, displayPath);
    const visited = scanYamlDocumentNode(root, displayPath, remainingNodeBudget, {
      maxNodeDepth: JSON_MAX_NODE_DEPTH,
      rejectStructure: rejectJsonStructure,
      scanDecodedScalars: true
    });
    remainingNodeBudget -= visited;
  };
  if (!isJsonLinesPath(displayPath)) {
    scanDocument(text);
    return;
  }
  for (let lineStart = 0; lineStart <= text.length;) {
    const newline = text.indexOf("\n", lineStart);
    let lineEnd = newline === -1 ? text.length : newline;
    if (lineEnd > lineStart && text[lineEnd - 1] === "\r") lineEnd -= 1;
    const line = text.slice(lineStart, lineEnd);
    if (line.trim() !== "") scanDocument(line);
    if (newline === -1) break;
    lineStart = newline + 1;
  }
}

function patchTargetNameNode(target) {
  target = unwrapTransparentExpression(target);
  if (ts.isIdentifier(target) || ts.isPrivateIdentifier(target) || ts.isStringLiteralLike(target)) return target;
  if (ts.isPropertyAccessExpression(target)) return target.name;
  if (ts.isElementAccessExpression(target) && target.argumentExpression
    && staticStringValue(target.argumentExpression) !== null) return target.argumentExpression;
  return null;
}

function patchNodeKeyOffset(node, source) {
  const start = node.getStart(source);
  return ts.isPrivateIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? start + 1
    : start;
}

function addPatchOffsetRecord(map, offset, record) {
  const records = map.get(offset) ?? [];
  records.push(record);
  map.set(offset, records);
}

function patchCandidateIndex(source) {
  const assignmentByOffset = new Map();
  const stringLiterals = [];
  const templates = [];
  const typeByOffset = new Map();
  const add = (target, value, context) => {
    const nameNode = patchTargetNameNode(target);
    const name = secretTargetName(target) ?? propertyNameText(target);
    if (name && nameNode && value) {
      addPatchOffsetRecord(assignmentByOffset, patchNodeKeyOffset(nameNode, source), { context, name, value });
    }
  };
  const visit = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node)) && node.type) {
      const nameNode = patchTargetNameNode(node.name);
      const name = secretTargetName(node.name) ?? propertyNameText(node.name);
      if (nameNode && name) {
        addPatchOffsetRecord(typeByOffset, patchNodeKeyOffset(nameNode, source), { name, node });
      }
    }
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node)) && node.initializer) {
      add(node.name, node.initializer, "declaration");
    }
    else if (ts.isPropertyAssignment(node)) add(node.name, node.initializer, "property");
    else if (ts.isShorthandPropertyAssignment(node) && node.objectAssignmentInitializer) {
      add(node.name, node.objectAssignmentInitializer, "property");
    }
    else if (ts.isEnumMember(node) && node.initializer) add(node.name, node.initializer, "property");
    else if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      add(node.left, node.right, "assignment");
    }
    else if (ts.isJsxAttribute(node) && node.initializer) {
      add(
        node.name,
        ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer,
        "property"
      );
    }
    if (ts.isTemplateExpression(node)) {
      templates.push({ end: node.end, node, start: node.getStart(source) });
    }
    else if (ts.isStringLiteral(node)) {
      stringLiterals.push({ end: node.end, start: node.getStart(source), text: node.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  stringLiterals.sort((left, right) => left.start - right.start || left.end - right.end);
  templates.sort((left, right) => left.start - right.start || right.end - left.end);
  let maximumTemplateEnd = 0;
  for (const template of templates) {
    maximumTemplateEnd = Math.max(maximumTemplateEnd, template.end);
    template.maximumEndThroughRecord = maximumTemplateEnd;
  }
  return { assignmentByOffset, stringLiterals, templates, typeByOffset };
}

function scanPatchExpressionStaticStrings(node, displayPath) {
  const visit = (current) => {
    const staticValue = staticStringValue(current);
    if (staticValue !== null) scanJavaScriptLiteral(staticValue, displayPath, true);
    if (ts.isTemplateExpression(current)) {
      scanJavaScriptLiteral(current.head.text, displayPath, true);
      for (const span of current.templateSpans) scanJavaScriptLiteral(span.literal.text, displayPath, true);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
}

function isDynamicPatchCodeExpression(node, context) {
  const value = unwrapTransparentExpression(node);
  if (!value) return false;
  if (ts.isAwaitExpression(value)) return isDynamicPatchCodeExpression(value.expression, context);
  if (ts.isIdentifier(value)) return context === "property";
  if (ts.isCallExpression(value) || ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) return true;
  const hasDynamicAccess = (current) => {
    if (ts.isCallExpression(current) || ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) return true;
    let found = false;
    ts.forEachChild(current, (child) => {
      if (!found && hasDynamicAccess(child)) found = true;
    });
    return found;
  };
  if (ts.isConditionalExpression(value)) return hasDynamicAccess(value);
  return ts.isBinaryExpression(value)
    && [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken
    ].includes(value.operatorToken.kind)
    && hasDynamicAccess(value);
}

function patchRecordAtOffset(records, position) {
  let low = 0;
  let high = records.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (records[middle].start <= position) low = middle + 1;
    else high = middle;
  }
  for (let index = low - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (position < record.end) return record;
    if (index === 0 || (records[index - 1].maximumEndThroughRecord ?? records[index - 1].end) <= position) break;
  }
  return null;
}

function typeAnnotationMatchIsSafe(record, assignmentName, displayPath) {
  if (!record || record.name !== assignmentName) return false;
  scanPatchExpressionStaticStrings(record.node.type, displayPath);
  if (record.node.initializer) {
    scanPatchExpressionStaticStrings(record.node.initializer, displayPath);
    scanSecretValue(record.node.initializer, displayPath);
  }
  return true;
}

function shellEnvironmentAssignmentValue(text, start, displayPath) {
  let escaped = false;
  let quote = null;
  let value = "";
  let index = start;
  for (; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      value += character;
      escaped = false;
      continue;
    }
    if (quote !== null) {
      if (character === quote) quote = null;
      else if (character === "\\" && quote === "\"") escaped = true;
      else value += character;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === " " || character === "\t") break;
    value += character;
  }
  if (escaped || quote !== null) rejectSecretAssignment(displayPath);
  return { end: index, value };
}

function shellEnvironmentAssignmentsAreSafe(text, assignmentName, displayPath) {
  const assignment = /(?:^|[\t ])([A-Za-z_][A-Za-z0-9_]*)=/gu;
  let found = false;
  let match;
  while ((match = assignment.exec(text)) !== null) {
    const parsed = shellEnvironmentAssignmentValue(text, assignment.lastIndex, displayPath);
    assignment.lastIndex = parsed.end;
    if (!isSecretName(match[1])) continue;
    if (match[1] === assignmentName) found = true;
    if (assignmentContainsHighConfidenceSecret(parsed.value, {
      aggregateFragments: true,
      displayPath,
      operator: "="
    })) rejectSecretAssignment(displayPath);
  }
  return found;
}

function templateAssignmentsAreSafe(template, assignmentName, displayPath) {
  let text = template.head.text;
  for (const span of template.templateSpans) text += `\${DYNAMIC}${span.literal.text}`;
  let found = shellEnvironmentAssignmentsAreSafe(text, assignmentName, displayPath);
  const queryAssignment = /(?:^|[?&])([A-Za-z_][A-Za-z0-9_-]*)=([^&\t ]*)/gu;
  let match;
  while ((match = queryAssignment.exec(text)) !== null) {
    if (!isSecretName(match[1])) continue;
    if (match[1] === assignmentName) found = true;
    if (assignmentContainsHighConfidenceSecret(match[2], {
      aggregateFragments: true,
      displayPath,
      operator: "="
    })) rejectSecretAssignment(displayPath);
  }
  return found;
}

function patchScriptKind(scriptPath) {
  const extension = path.extname(scriptPath).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".ts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function patchCodeParseCandidates(code) {
  const objectPrefix = "const __maisPatchObject = ({\n";
  return [
    { allowShellString: false, allowTemplate: true, offsetShift: 0, sourceText: code },
    { allowShellString: false, allowTemplate: false, offsetShift: 0, sourceText: `${code}\n}` },
    { allowShellString: true, allowTemplate: false, offsetShift: 1, sourceText: `[${code}]` },
    {
      allowShellString: false,
      allowTemplate: false,
      offsetShift: objectPrefix.length,
      sourceText: `${objectPrefix}${code}\n});`
    }
  ];
}

function preparePatchContext(code, scriptPath, displayPath) {
  const candidates = [];
  for (const candidate of patchCodeParseCandidates(code)) {
    const source = ts.createSourceFile(
      scriptPath,
      candidate.sourceText,
      ts.ScriptTarget.Latest,
      true,
      patchScriptKind(scriptPath)
    );
    if ((source.parseDiagnostics ?? []).length === 0) {
      scanJavaScriptSource(source, displayPath);
      candidates.push({ ...candidate, index: patchCandidateIndex(source), source });
    }
  }
  return { candidates, code, codeOffset: 1, scriptPath };
}

function isExactApiMeRouteFixtureLiteral(node) {
  const value = unwrapTransparentExpression(node);
  return ts.isStringLiteral(value) && value.text === EXACT_API_ME_ROUTE_TEST_SECRET;
}

function patchHunkCodeAssignmentIsSafe(
  patchContext,
  assignmentName,
  operator,
  displayPath,
  assignmentOffset
) {
  for (const candidate of patchContext.candidates) {
    const candidateOffset = assignmentOffset + candidate.offsetShift;
    if (operator === ":") {
      const typeRecords = candidate.index.typeByOffset.get(candidateOffset) ?? [];
      for (const record of typeRecords) {
        if (typeAnnotationMatchIsSafe(record, assignmentName, displayPath)) return true;
      }
    }
    const values = (candidate.index.assignmentByOffset.get(candidateOffset) ?? [])
      .filter((record) => record.name === assignmentName);
    if (values.length === 0) {
      const templateRecord = candidate.allowTemplate
        ? patchRecordAtOffset(candidate.index.templates, candidateOffset)
        : null;
      if (templateRecord && operator === "="
        && templateAssignmentsAreSafe(templateRecord.node, assignmentName, displayPath)) return true;
      const shellStringRecord = candidate.allowShellString
        ? patchRecordAtOffset(candidate.index.stringLiterals, candidateOffset)
        : null;
      const shellString = shellStringRecord?.text ?? null;
      if (shellString !== null
        && operator === "="
        && shellEnvironmentAssignmentsAreSafe(shellString, assignmentName, displayPath)) return true;
      continue;
    }
    for (const { context, value } of values) {
      scanPatchExpressionStaticStrings(value, displayPath);
      scanSecretValue(value, displayPath);
      if (isExactApiMeRouteFixtureLiteral(value)) continue;
      if (!isDynamicPatchCodeExpression(value, context)) return false;
    }
    return true;
  }
  return false;
}

function scanTextAssignments(text, displayPath, patchContext = null, assignmentSemanticPath = displayPath) {
  SECRET_ASSIGNMENT.lastIndex = 0;
  let match;
  while ((match = SECRET_ASSIGNMENT.exec(text)) !== null) {
    const lineEnd = text.indexOf("\n", SECRET_ASSIGNMENT.lastIndex);
    const rawValue = text.slice(SECRET_ASSIGNMENT.lastIndex, lineEnd === -1 ? text.length : lineEnd);
    const assignmentOperator = match[2] === ":" ? ":" : "=";
    if (isSecretName(match[1])
      && (!isYamlPath(displayPath) || assignmentOperator === "=")
      && assignmentContainsHighConfidenceSecret(rawValue, {
        aggregateFragments: assignmentOperator === "=" || isJsonPath(assignmentSemanticPath),
        displayPath: assignmentSemanticPath,
        operator: assignmentOperator,
        postOperatorWhitespace: /[\t ]$/u.test(match[0])
      })) {
      const assignmentKeyOffset = match.index + match[0].lastIndexOf(match[1]);
      if (patchContext !== null
        && patchHunkCodeAssignmentIsSafe(
          patchContext,
          match[1],
          assignmentOperator,
          displayPath,
          assignmentKeyOffset - patchContext.codeOffset
        )) continue;
      rejectSecretAssignment(displayPath);
    }
  }
}

function exactGitDiffPaths(text) {
  const prefix = "diff --git ";
  if (!text.startsWith(prefix)) return null;
  const left = readGitDiffPathAtom(text, prefix.length);
  if (!left || text[left.end] !== " ") return null;
  const right = readGitDiffPathAtom(text, left.end + 1);
  if (!right || right.end !== text.length) return null;
  if (left.decodedPrefix[0] !== 0x61 || left.decodedPrefix[1] !== 0x2f
    || right.decodedPrefix[0] !== 0x62 || right.decodedPrefix[1] !== 0x2f) return null;
  const oldPathBytes = Buffer.from(left.decodedBytes).subarray(2);
  const newPathBytes = Buffer.from(right.decodedBytes).subarray(2);
  if (!isUtf8(oldPathBytes) || !isUtf8(newPathBytes)) return null;
  return {
    newPath: newPathBytes.toString("utf8"),
    newPathBytes,
    oldPath: oldPathBytes.toString("utf8"),
    oldPathBytes
  };
}

function exactGitFileHeaderPath(text, side) {
  const prefix = side === "old" ? "--- " : "+++ ";
  if (!text.startsWith(prefix)) return null;
  const atom = readGitDiffPathAtom(text, prefix.length);
  if (!atom || atom.end !== text.length) return null;
  const bytes = Buffer.from(atom.decodedBytes);
  if (bytes.equals(Buffer.from("/dev/null", "utf8"))) {
    return { devNull: true, pathBytes: null };
  }
  const expectedPrefix = side === "old" ? 0x61 : 0x62;
  if (bytes[0] !== expectedPrefix || bytes[1] !== 0x2f) return null;
  const pathBytes = bytes.subarray(2);
  if (pathBytes.length === 0 || !isUtf8(pathBytes)) return null;
  return { devNull: false, pathBytes };
}

function patchTextLineAt(text, start) {
  if (start > text.length) return null;
  const newline = text.indexOf("\n", start);
  let end = newline === -1 ? text.length : newline;
  if (end > start && text[end - 1] === "\r") end -= 1;
  return {
    line: text.slice(start, end),
    next: newline === -1 ? text.length + 1 : newline + 1,
    start
  };
}

function exactGitHunkCounts(line) {
  const match = line.match(
    /^@@ -(?:0|[1-9][0-9]*)(?:,(0|[1-9][0-9]*))? \+(?:0|[1-9][0-9]*)(?:,(0|[1-9][0-9]*))? @@(?: .*)?$/u
  );
  if (!match) return null;
  const oldCount = match[1] === undefined ? 1 : Number(match[1]);
  const newCount = match[2] === undefined ? 1 : Number(match[2]);
  return Number.isSafeInteger(oldCount) && Number.isSafeInteger(newCount) ? { newCount, oldCount } : null;
}

function secretAssignmentOccurrenceCount(line) {
  SECRET_ASSIGNMENT.lastIndex = 0;
  let count = 0;
  let match;
  while ((match = SECRET_ASSIGNMENT.exec(line)) !== null) {
    if (isSecretName(match[1])) count += 1;
  }
  return count;
}

const COMPUTED_ASSIGNMENT_OPERATOR = /(?:>>>=|<<=|>>=|\*\*=|&&=|\|\|=|\?\?=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|=(?!=|>))/uy;

function lineContainsComputedAssignmentCandidate(line) {
  let sawOpenBracket = false;
  for (let index = 0; index < line.length; index += 1) {
    const code = line.charCodeAt(index);
    if (code === 0x5b) {
      sawOpenBracket = true;
      continue;
    }
    if (!sawOpenBracket || code !== 0x5d) continue;
    let operatorOffset = index + 1;
    while (operatorOffset < line.length) {
      const whitespace = line.charCodeAt(operatorOffset);
      if (whitespace !== 0x09 && whitespace !== 0x20) break;
      operatorOffset += 1;
    }
    if (line.charCodeAt(operatorOffset) === 0x3a) return true;
    COMPUTED_ASSIGNMENT_OPERATOR.lastIndex = operatorOffset;
    if (COMPUTED_ASSIGNMENT_OPERATOR.test(line)) return true;
  }
  return false;
}

function lineContainsPatchSemanticCandidate(line) {
  return /(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password|credential)/iu.test(line)
    || /\\(?:u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]{1,6}\})|x[0-9A-Fa-f]{2})/u.test(line)
    || lineContainsComputedAssignmentCandidate(line);
}

function hunkLineSemanticPath(prefix, paths) {
  if (prefix === "+") return paths.newPath;
  if (prefix === "-") return paths.oldPath;
  if (prefix !== " ") return null;
  return path.extname(paths.oldPath).toLowerCase() === path.extname(paths.newPath).toLowerCase()
    ? paths.newPath
    : null;
}

function rejectMalformedGitTextHunk(displayPath) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: malformed Git text hunk`);
}

function rejectPatchSemanticBudget(displayPath, dimension, observed, limit) {
  throw new Error(
    `secret scanner rejected ${JSON.stringify(displayPath)}: patch semantic budget exceeded (${dimension} ${observed}/${limit})`
  );
}

function validatedPatchAssignmentPolicies(text, displayPath) {
  const policies = new Map();
  let reviewedAssignmentOccurrences = 0;
  let reviewedAstSourceBytes = 0;
  let paths = null;
  let fileHeaders = null;
  let pendingOldHeader = null;
  let sawHunk = false;
  for (let lineStart = 0; lineStart <= text.length;) {
    const record = patchTextLineAt(text, lineStart);
    if (!record) break;
    if (record.line.startsWith("diff ")) {
      if (pendingOldHeader !== null) rejectMalformedGitTextHunk(displayPath);
      paths = exactGitDiffPaths(record.line);
      fileHeaders = null;
      pendingOldHeader = null;
      sawHunk = false;
    } else if (record.line.startsWith("--- ")) {
      if (!paths || sawHunk || pendingOldHeader !== null || fileHeaders !== null) {
        rejectMalformedGitTextHunk(displayPath);
      }
      pendingOldHeader = exactGitFileHeaderPath(record.line, "old");
      if (!pendingOldHeader) rejectMalformedGitTextHunk(displayPath);
    } else if (record.line.startsWith("+++ ")) {
      if (!paths || sawHunk || pendingOldHeader === null || fileHeaders !== null) {
        rejectMalformedGitTextHunk(displayPath);
      }
      const newHeader = exactGitFileHeaderPath(record.line, "new");
      if (!newHeader
        || (!pendingOldHeader.devNull && !pendingOldHeader.pathBytes.equals(paths.oldPathBytes))
        || (!newHeader.devNull && !newHeader.pathBytes.equals(paths.newPathBytes))
        || (pendingOldHeader.devNull && newHeader.devNull)) {
        rejectMalformedGitTextHunk(displayPath);
      }
      fileHeaders = { newDevNull: newHeader.devNull, oldDevNull: pendingOldHeader.devNull };
      pendingOldHeader = null;
    }
    const counts = paths ? exactGitHunkCounts(record.line) : null;
    if (paths && record.line.startsWith("@@") && !counts) rejectMalformedGitTextHunk(displayPath);
    if (counts) {
      sawHunk = true;
      if (pendingOldHeader !== null
        || (fileHeaders?.oldDevNull && counts.oldCount !== 0)
        || (fileHeaders?.newDevNull && counts.newCount !== 0)) {
        rejectMalformedGitTextHunk(displayPath);
      }
      let newRemaining = counts.newCount;
      let oldRemaining = counts.oldCount;
      let cursor = record.next;
      let markerPrefix = null;
      let newSideAtEof = false;
      let oldSideAtEof = false;
      let valid = true;
      const candidates = [];
      while (valid && (oldRemaining > 0 || newRemaining > 0)) {
        const body = patchTextLineAt(text, cursor);
        if (!body) {
          valid = false;
          break;
        }
        if (body.line === "\\ No newline at end of file") {
          if (markerPrefix === " ") {
            if (oldRemaining !== 0 || newRemaining !== 0) valid = false;
            else {
              oldSideAtEof = true;
              newSideAtEof = true;
            }
          } else if (markerPrefix === "-") {
            if (oldRemaining !== 0) valid = false;
            else oldSideAtEof = true;
          } else if (markerPrefix === "+") {
            if (newRemaining !== 0) valid = false;
            else newSideAtEof = true;
          } else valid = false;
          markerPrefix = null;
          cursor = body.next;
          continue;
        }
        const prefix = body.line[0];
        if (prefix === " ") {
          if (oldSideAtEof || newSideAtEof || oldRemaining === 0 || newRemaining === 0) valid = false;
          else {
            oldRemaining -= 1;
            newRemaining -= 1;
          }
        }
        else if (prefix === "-") {
          if (oldSideAtEof || oldRemaining === 0) valid = false;
          else oldRemaining -= 1;
        }
        else if (prefix === "+") {
          if (newSideAtEof || newRemaining === 0) valid = false;
          else newRemaining -= 1;
        }
        else valid = false;
        if (!valid) break;
        markerPrefix = prefix;
        const semanticPath = hunkLineSemanticPath(prefix, paths);
        const assignmentOccurrences = semanticPath === null ? 0 : secretAssignmentOccurrenceCount(body.line);
        const candidateLine = semanticPath !== null && (isJavaScriptPath(semanticPath)
          ? lineContainsPatchSemanticCandidate(body.line)
          : assignmentOccurrences > 0);
        if (candidateLine) {
          const scriptPath = isJavaScriptPath(semanticPath) ? semanticPath : null;
          const sourceBytes = scriptPath ? Buffer.byteLength(body.line) : 0;
          if (scriptPath && sourceBytes > PATCH_MAX_AST_CODE_LINE_BYTES) {
            rejectPatchSemanticBudget(displayPath, "code-line-bytes", sourceBytes, PATCH_MAX_AST_CODE_LINE_BYTES);
          }
          if (scriptPath && assignmentOccurrences > PATCH_MAX_AST_ASSIGNMENTS_PER_LINE) {
            rejectPatchSemanticBudget(
              displayPath,
              "line-assignment-occurrences",
              assignmentOccurrences,
              PATCH_MAX_AST_ASSIGNMENTS_PER_LINE
            );
          }
          candidates.push({
            assignmentOccurrences,
            astSourceBytes: sourceBytes * 4,
            lineStart: body.start,
            scriptPath,
            semanticPath
          });
          if (candidates.length > PATCH_MAX_REVIEWED_ASSIGNMENT_LINES) {
            rejectPatchSemanticBudget(
              displayPath,
              "hunk-candidate-lines",
              candidates.length,
              PATCH_MAX_REVIEWED_ASSIGNMENT_LINES
            );
          }
        }
        cursor = body.next;
      }
      let boundary = patchTextLineAt(text, cursor);
      while (valid && boundary?.line === "\\ No newline at end of file") {
        if (markerPrefix === " ") {
          oldSideAtEof = true;
          newSideAtEof = true;
        } else if (markerPrefix === "-") oldSideAtEof = true;
        else if (markerPrefix === "+") newSideAtEof = true;
        else valid = false;
        markerPrefix = null;
        cursor = boundary.next;
        boundary = patchTextLineAt(text, cursor);
      }
      if (valid && boundary && /^[ +\-]/u.test(boundary.line) && boundary.line !== "-- ") valid = false;
      if (!valid) rejectMalformedGitTextHunk(displayPath);
      if (valid) {
        if (policies.size + candidates.length > PATCH_MAX_REVIEWED_ASSIGNMENT_LINES) {
          rejectPatchSemanticBudget(
            displayPath,
            "patch-candidate-lines",
            policies.size + candidates.length,
            PATCH_MAX_REVIEWED_ASSIGNMENT_LINES
          );
        }
        const hunkOccurrences = candidates.reduce(
          (total, candidate) => total + candidate.assignmentOccurrences,
          0
        );
        const hunkAstSourceBytes = candidates.reduce(
          (total, candidate) => total + candidate.astSourceBytes,
          0
        );
        if (reviewedAssignmentOccurrences + hunkOccurrences > PATCH_MAX_AST_ASSIGNMENTS_TOTAL) {
          rejectPatchSemanticBudget(
            displayPath,
            "patch-assignment-occurrences",
            reviewedAssignmentOccurrences + hunkOccurrences,
            PATCH_MAX_AST_ASSIGNMENTS_TOTAL
          );
        }
        if (reviewedAstSourceBytes + hunkAstSourceBytes > PATCH_MAX_AST_TOTAL_SOURCE_BYTES) {
          rejectPatchSemanticBudget(
            displayPath,
            "patch-ast-source-bytes",
            reviewedAstSourceBytes + hunkAstSourceBytes,
            PATCH_MAX_AST_TOTAL_SOURCE_BYTES
          );
        }
        reviewedAssignmentOccurrences += hunkOccurrences;
        reviewedAstSourceBytes += hunkAstSourceBytes;
        for (const candidate of candidates) policies.set(candidate.lineStart, candidate);
      }
      lineStart = cursor;
      continue;
    }
    lineStart = record.next;
  }
  if (pendingOldHeader !== null) rejectMalformedGitTextHunk(displayPath);
  return policies;
}

function scanPatchTextAssignments(text, displayPath, binaryPayloadLineRanges = []) {
  const policies = validatedPatchAssignmentPolicies(text, displayPath);
  let lineNumber = 1;
  let rangeIndex = 0;
  for (let lineStart = 0; lineStart <= text.length;) {
    const record = patchTextLineAt(text, lineStart);
    if (!record) break;
    while (rangeIndex < binaryPayloadLineRanges.length
      && binaryPayloadLineRanges[rangeIndex][1] < lineNumber) rangeIndex += 1;
    const binaryPayload = rangeIndex < binaryPayloadLineRanges.length
      && binaryPayloadLineRanges[rangeIndex][0] <= lineNumber
      && lineNumber <= binaryPayloadLineRanges[rangeIndex][1];
    if (!binaryPayload) {
      const policy = policies.get(lineStart) ?? null;
      const patchContext = policy?.scriptPath
        ? preparePatchContext(record.line.slice(1), policy.scriptPath, displayPath)
        : null;
      scanTextAssignments(record.line, displayPath, patchContext, policy?.semanticPath ?? displayPath);
    }
    lineStart = record.next;
    lineNumber += 1;
  }
}

function scanText(
  text,
  displayPath,
  { aggregatePatch = false, binaryPayloadLineRanges = [], rawSignaturesScanned = false } = {}
) {
  if (!rawSignaturesScanned) scanRawSignatures(text, displayPath);
  if (aggregatePatch) return;
  if (isJavaScriptPath(displayPath)) {
    scanJavaScriptText(text, displayPath);
    return;
  }
  if (isJsonPath(displayPath)) {
    scanJsonSecretStructures(text, displayPath);
    return;
  }
  if (isPatchPath(displayPath)) scanPatchTextAssignments(text, displayPath, binaryPayloadLineRanges);
  else scanTextAssignments(text, displayPath);
  if (isYamlPath(displayPath)) scanYamlSecretStructures(text, displayPath);
}

function decodeTextBuffer(buffer) {
  if (buffer.length === 0) return "";
  if (buffer.includes(0)) return null;
  const decoded = buffer.toString("utf8");
  const maximumReplacements = Math.max(1, Math.floor(decoded.length / 1000));
  let replacements = 0;
  for (let index = 0; index < decoded.length; index += 1) {
    if (decoded.charCodeAt(index) === 0xfffd && ++replacements > maximumReplacements) return null;
  }
  return decoded;
}

const GIT_BINARY_PATCH_BASE85_BYTES = new Set(Buffer.from(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~",
  "ascii"
));
const GIT_C_STYLE_ESCAPE_BYTES = new Map([
  ["a", 0x07], ["b", 0x08], ["t", 0x09], ["n", 0x0a],
  ["v", 0x0b], ["f", 0x0c], ["r", 0x0d], ["\"", 0x22], ["\\", 0x5c]
]);
const GIT_DIFF_MAX_PATH_BYTES = 64 * 1024;

function isGitBinaryPatchPayloadLine(line) {
  if (line.length < 6 || line.length > 66) return false;
  const lengthByte = line[0];
  const decodedBytes = lengthByte >= 0x41 && lengthByte <= 0x5a
    ? lengthByte - 0x40
    : lengthByte >= 0x61 && lengthByte <= 0x7a
      ? lengthByte - 0x46
      : 0;
  if (decodedBytes === 0 || line.length !== 1 + Math.ceil(decodedBytes / 4) * 5) return false;
  for (const byte of line.subarray(1)) {
    if (!GIT_BINARY_PATCH_BASE85_BYTES.has(byte)) return false;
  }
  return true;
}

function malformedGitBinaryPatch(displayPath) {
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: malformed Git binary patch`);
}

function readGitDiffPathAtom(text, start) {
  let decodedLength = 0;
  const decodedBytes = [];
  const decodedPrefix = [];
  const decodedSuffix = [];
  const appendByte = (byte) => {
    if (byte === 0 || decodedLength >= GIT_DIFF_MAX_PATH_BYTES) return false;
    decodedLength += 1;
    decodedBytes.push(byte);
    decodedSuffix.push(byte);
    if (decodedSuffix.length > 8) decodedSuffix.shift();
    if (decodedPrefix.length < 2) decodedPrefix.push(byte);
    return true;
  };
  const appendText = (value) => {
    for (const byte of Buffer.from(value, "utf8")) {
      if (!appendByte(byte)) return false;
    }
    return true;
  };
  if (text[start] !== "\"") {
    let end = start;
    while (end < text.length && text[end] !== " ") {
      const codePoint = text.codePointAt(end);
      const character = String.fromCodePoint(codePoint);
      if (codePoint < 0x20 || codePoint === 0x7f || character === "\"" || character === "\\" || !appendText(character)) return null;
      end += character.length;
    }
    return decodedLength > 2 ? { decodedBytes, decodedLength, decodedPrefix, decodedSuffix, end } : null;
  }
  let index = start + 1;
  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    if (character === "\"") {
      return decodedLength > 2
        ? { decodedBytes, decodedLength, decodedPrefix, decodedSuffix, end: index + 1 }
        : null;
    }
    if (character !== "\\") {
      if (codePoint < 0x20 || codePoint === 0x7f || !appendText(character)) return null;
      index += character.length;
      continue;
    }
    const escape = text[index + 1];
    const namedEscape = GIT_C_STYLE_ESCAPE_BYTES.get(escape);
    if (namedEscape !== undefined) {
      if (!appendByte(namedEscape)) return null;
      index += 2;
      continue;
    }
    const octal = text.slice(index + 1, index + 4);
    if (!/^[0-7]{3}$/u.test(octal) || !appendByte(Number.parseInt(octal, 8))) return null;
    index += 4;
  }
  return null;
}

function isExactGitDiffHeader(text) {
  const prefix = "diff --git ";
  if (!text.startsWith(prefix)) return false;
  const left = readGitDiffPathAtom(text, prefix.length);
  if (!left || text[left.end] !== " ") return false;
  const right = readGitDiffPathAtom(text, left.end + 1);
  if (!right || right.end !== text.length) return false;
  return left.decodedPrefix[0] === 0x61 && left.decodedPrefix[1] === 0x2f
    && right.decodedPrefix[0] === 0x62 && right.decodedPrefix[1] === 0x2f;
}

function scanPatchRawBuffer(buffer, decodedText, displayPath) {
  let inFileSection = false;
  let binaryState = "none";
  const binaryPayloadLineRanges = [];
  let binaryPayloadStartLine = null;
  let sawBinaryPayloadLine = false;
  let lineNumber = 1;
  let start = 0;
  let textStart = 0;
  while (start < buffer.length) {
    const newline = buffer.indexOf(0x0a, start);
    const end = newline === -1 ? buffer.length : newline;
    const line = buffer.subarray(start, end);
    if (line.length > AGGREGATE_PATCH_MAX_LINE_BYTES) {
      throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: aggregate patch line byte limit exceeded`);
    }
    let text;
    let textNewline = -1;
    if (decodedText === null) {
      if (line.includes(0)) {
        throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: aggregate patch contains NUL bytes`);
      }
      if (!isUtf8(line)) {
        throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: aggregate patch is not strict UTF-8 text`);
      }
      text = line.toString("utf8");
    }
    else {
      textNewline = decodedText.indexOf("\n", textStart);
      if ((newline === -1) !== (textNewline === -1)) malformedGitBinaryPatch(displayPath);
      text = decodedText.slice(textStart, textNewline === -1 ? decodedText.length : textNewline);
    }
    if (text.startsWith("diff --git")) {
      if (binaryState === "expect-hunk" || binaryState === "payload") malformedGitBinaryPatch(displayPath);
      if (!isExactGitDiffHeader(text)) malformedGitBinaryPatch(displayPath);
      inFileSection = true;
      binaryState = "none";
      binaryPayloadStartLine = null;
      sawBinaryPayloadLine = false;
      scanRawSignatures(text, displayPath);
    }
    else if (binaryState === "expect-hunk") {
      scanRawSignatures(text, displayPath);
      if (!/^(?:literal|delta) (?:0|[1-9][0-9]*)$/u.test(text)) malformedGitBinaryPatch(displayPath);
      binaryState = "payload";
      binaryPayloadStartLine = null;
      sawBinaryPayloadLine = false;
    }
    else if (binaryState === "payload") {
      if (text === "") {
        if (!sawBinaryPayloadLine) malformedGitBinaryPatch(displayPath);
        if (binaryPayloadLineRanges.length >= PATCH_MAX_BINARY_PAYLOAD_RANGES) {
          malformedGitBinaryPatch(displayPath);
        }
        binaryPayloadLineRanges.push([binaryPayloadStartLine, lineNumber - 1]);
        binaryPayloadStartLine = null;
        binaryState = "between-hunks";
      }
      else if (isGitBinaryPatchPayloadLine(line)) {
        if (!sawBinaryPayloadLine) binaryPayloadStartLine = lineNumber;
        sawBinaryPayloadLine = true;
      }
      else {
        scanRawSignatures(text, displayPath);
        malformedGitBinaryPatch(displayPath);
      }
    }
    else if (binaryState === "between-hunks") {
      if (/^(?:literal|delta) (?:0|[1-9][0-9]*)$/u.test(text)) {
        scanRawSignatures(text, displayPath);
        binaryState = "payload";
        binaryPayloadStartLine = null;
        sawBinaryPayloadLine = false;
      }
      else if (text !== "") {
        scanRawSignatures(text, displayPath);
        malformedGitBinaryPatch(displayPath);
      }
    }
    else {
      scanRawSignatures(text, displayPath);
      if (text === "GIT binary patch") {
        if (!inFileSection) malformedGitBinaryPatch(displayPath);
        binaryState = "expect-hunk";
      }
    }
    if (newline === -1) break;
    start = newline + 1;
    if (decodedText !== null) textStart = textNewline + 1;
    lineNumber += 1;
  }
  if (binaryState !== "none" && binaryState !== "between-hunks") malformedGitBinaryPatch(displayPath);
  return binaryPayloadLineRanges;
}

function hasReviewedBinaryMagic(buffer, extension) {
  const ascii = (start, end) => buffer.subarray(start, end).toString("latin1");
  if (extension === ".png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === ".jpg" || extension === ".jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === ".gif") return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
  if (extension === ".webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (extension === ".avif") return ascii(4, 8) === "ftyp" && /^(?:avif|avis|heic|heix)$/u.test(ascii(8, 12));
  if (extension === ".ico") return buffer.length >= 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0;
  if (extension === ".pdf") return ascii(0, 5) === "%PDF-";
  if (extension === ".mp3") return ascii(0, 3) === "ID3" || (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (extension === ".wav") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  if ([".m4a", ".mp4", ".mov"].includes(extension)) return ascii(4, 8) === "ftyp";
  if (extension === ".webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === ".woff") return ascii(0, 4) === "wOFF";
  if (extension === ".woff2") return ascii(0, 4) === "wOF2";
  if (extension === ".ttf") return buffer.subarray(0, 4).equals(Buffer.from([0x00, 0x01, 0x00, 0x00]));
  if (extension === ".otf") return ascii(0, 4) === "OTTO";
  return false;
}

export function scanBuffer(buffer, { displayPath, aggregatePatch = false }) {
  scanArchivePath(displayPath);
  if (aggregatePatch && !new Set(["tracked.patch", "index.patch", "worktree.patch", "branch.patch"]).has(displayPath)) {
    throw new Error("aggregate patch scanning is restricted to synthetic tracked, index, worktree, or branch patch evidence");
  }
  if (aggregatePatch) {
    scanPatchRawBuffer(buffer, null, displayPath);
    return { kind: "text", status: "passed" };
  }
  const extension = path.extname(displayPath).toLowerCase();
  if (isPatchPath(displayPath)) {
    if (buffer.includes(0)) {
      throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: patch contains NUL bytes`);
    }
    if (!isUtf8(buffer)) {
      throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: patch is not strict UTF-8 text`);
    }
    const decodedText = buffer.toString("utf8");
    const binaryPayloadLineRanges = scanPatchRawBuffer(buffer, decodedText, displayPath);
    scanText(decodedText, displayPath, {
      aggregatePatch,
      binaryPayloadLineRanges,
      rawSignaturesScanned: true
    });
    return { kind: "text", status: "passed" };
  }
  if (isYamlPath(displayPath)) {
    if (buffer.length > YAML_MAX_TEXT_BYTES) rejectYamlStructure(displayPath, "text size limit");
    if (!isUtf8(buffer)) rejectYamlParse(displayPath);
    scanText(buffer.toString("utf8"), displayPath, { aggregatePatch });
    return { kind: "text", status: "passed" };
  }
  if (isJsonPath(displayPath)) {
    if (buffer.length > JSON_MAX_TEXT_BYTES) rejectJsonStructure(displayPath, "text size limit");
    if (!isUtf8(buffer)) rejectJsonParse(displayPath);
    scanText(buffer.toString("utf8"), displayPath, { aggregatePatch });
    return { kind: "text", status: "passed" };
  }
  if (REVIEWED_BINARY_EXTENSIONS.has(extension)) {
    if (!hasReviewedBinaryMagic(buffer, extension)) throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: reviewed binary magic mismatch`);
    scanText(buffer.toString("latin1"), displayPath, { aggregatePatch });
    return { kind: "reviewed-binary", status: "passed" };
  }
  const decodedText = decodeTextBuffer(buffer);
  if (decodedText !== null) {
    scanText(decodedText, displayPath, { aggregatePatch });
    return { kind: "text", status: "passed" };
  }
  throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: unreviewed binary`);
}

export function scanFile(absolutePath, displayPath) {
  scanArchivePath(displayPath);
  const extension = path.extname(displayPath).toLowerCase();
  if (OOXML_EXTENSIONS.has(extension)) {
    scanText(fs.readFileSync(absolutePath).toString("latin1"), displayPath);
    let members;
    try {
      const listScript = [
        "import base64,json,os,stat,sys,zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        " print(json.dumps([{'index':i,'name':base64.b64encode(os.fsencode(info.filename)).decode('ascii'),'directory':info.is_dir(),'symlink':stat.S_ISLNK(info.external_attr >> 16),'encrypted':bool(info.flag_bits & 1),'size':info.file_size,'compressedSize':info.compress_size} for i,info in enumerate(archive.infolist())]))"
      ].join("\n");
      members = JSON.parse(execFileSync("python3", ["-c", listScript, absolutePath], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: CHILD_PROCESS_TIMEOUT_MS }));
    } catch {
      throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: unreadable OOXML`);
    }
    let totalBytes = 0;
    const readScript = [
      "import sys,zipfile",
      "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
      " sys.stdout.buffer.write(archive.read(archive.infolist()[int(sys.argv[2])]))"
    ].join("\n");
    for (const member of members) {
      const name = Buffer.from(member.name, "base64").toString("utf8");
      scanArchivePath(name.replace(/\/$/u, ""));
      if (member.symlink || member.encrypted) throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: unsafe OOXML member`);
      if (member.directory) continue;
      totalBytes += member.size;
      if (totalBytes > 1024 * 1024 * 1024 || member.size > 512 * 1024 * 1024) {
        throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: OOXML member size limit exceeded`);
      }
      if (member.size > 1024 * 1024 && member.compressedSize > 0 && member.size / member.compressedSize > 1000) {
        throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: suspicious OOXML compression ratio`);
      }
      let content;
      try {
        content = execFileSync("python3", ["-c", readScript, absolutePath, String(member.index)], { encoding: null, maxBuffer: 512 * 1024 * 1024, timeout: CHILD_PROCESS_TIMEOUT_MS });
      } catch {
        throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: unreadable OOXML member`);
      }
      scanBuffer(content, { displayPath: `${displayPath}#${name}` });
    }
    return { kind: "ooxml", status: "passed" };
  }
  const result = scanBuffer(fs.readFileSync(absolutePath), { displayPath });
  if (extension === ".pdf") {
    try {
      const extractedText = execFileSync("pdftotext", [absolutePath, "-"], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], timeout: CHILD_PROCESS_TIMEOUT_MS });
      scanText(extractedText, displayPath);
    } catch (error) {
      if (/secret scanner rejected/u.test(error?.message ?? "")) throw error;
      throw new Error(`secret scanner rejected ${JSON.stringify(displayPath)}: unreadable PDF text layer`);
    }
  }
  return result;
}

function scanBufferForPath(buffer, relativePath, labelPrefix) {
  const displayPath = `${labelPrefix}/${relativePath}`;
  const extension = path.extname(relativePath).toLowerCase();
  if (OOXML_EXTENSIONS.has(extension) || extension === ".pdf") {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-evidence-history-"));
    const artifactPath = path.join(scratch, `artifact${extension}`);
    try {
      writePrivate(artifactPath, buffer);
      return scanFile(artifactPath, displayPath);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }
  return scanBuffer(buffer, { displayPath });
}

function scanHistoricalTrackedPaths(
  worktreePath,
  revision,
  paths,
  labelPrefix = "historical",
  reviewedLegacyTextByPath = null,
  protectedOverlayContext = null,
  protectedSourceKind = labelPrefix
) {
  let scanned = 0;
  let reviewed = 0;
  let reviewedProtected = 0;
  for (const relativePath of paths) {
    const reviewedLegacyText = reviewedLegacyTextByPath?.get(relativePath) ?? null;
    if (reviewedLegacyText !== null && revision !== reviewedLegacyText.revision) {
      throw new Error("reviewed legacy branch-base text is restricted to its pinned revision");
    }
    scanArchivePath(relativePath);
    const records = parseNul(gitBuffer(["ls-tree", "-z", revision, "--", `:(literal)${relativePath}`], worktreePath));
    let matched = false;
    for (const record of records) {
      const separator = record.indexOf("\t");
      if (separator < 0 || record.slice(separator + 1) !== relativePath) continue;
      const [mode, type, objectId] = record.slice(0, separator).split(" ");
      const protectedOverlayScan = scanReviewedProtectedOverlayGitBlob(
        worktreePath,
        relativePath,
        protectedSourceKind,
        { mode, type, objectId },
        protectedOverlayContext
      );
      if (protectedOverlayScan !== null) {
        matched = true;
        scanned += 1;
        reviewedProtected += 1;
        continue;
      }
      if (reviewedLegacyText !== null) {
        if (mode !== reviewedLegacyText.mode
          || type !== reviewedLegacyText.type
          || objectId !== reviewedLegacyText.objectId) {
          throw new Error("reviewed legacy branch-base text metadata mismatch");
        }
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== reviewedLegacyText.bytes
          || gitSha1BlobObjectId(buffer) !== reviewedLegacyText.objectId
          || sha256Buffer(buffer) !== reviewedLegacyText.sha256) {
          throw new Error("reviewed legacy branch-base text Git blob integrity mismatch");
        }
        scanReviewedLegacyExactTextPayload(buffer);
        matched = true;
        scanned += 1;
        continue;
      }
      if (type !== "blob" || !mode || !objectId) throw new Error(`unsupported historical Git object for ${JSON.stringify(relativePath)}`);
      const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
      if (mode === "120000") {
        assertSafeSymlink(worktreePath, relativePath, buffer.toString("utf8"));
        matched = true;
        scanned += 1;
        continue;
      }
      if (mode !== "100644" && mode !== "100755") {
        throw new Error(`unsupported historical Git mode for ${JSON.stringify(relativePath)}`);
      }
      const result = scanBufferForPath(buffer, relativePath, labelPrefix);
      matched = true;
      scanned += 1;
      if (result.kind === "reviewed-binary") reviewed += 1;
    }
    if (!matched) {
      if (reviewedLegacyText !== null) {
        throw new Error("reviewed legacy branch-base text Git blob is missing");
      }
      throw new Error(`historical Git blob is missing for ${JSON.stringify(relativePath)}`);
    }
  }
  return { scanned, reviewed, reviewedProtected };
}

export function scanBranchBaseHistoricalTrackedPaths(worktreePath, revision, paths) {
  return scanHistoricalTrackedPaths(
    worktreePath,
    revision,
    paths,
    "branch-base",
    REVIEWED_LEGACY_BRANCH_BASE_TEXT_BY_PATH
  );
}

function scanReviewedLegacyTerminalPatch(buffer, relativePath) {
  const displayPath = `${REVIEWED_LEGACY_TERMINAL_PATCH_DISPLAY_PREFIX}/${relativePath}`;
  scanArchivePath(displayPath);
  scanPatchRawBuffer(buffer, null, displayPath);
  return { kind: "text", status: "passed" };
}

function scanReviewedLegacyParentConsoleReport(buffer) {
  const displayPath = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT_DISPLAY_PATH;
  scanArchivePath(displayPath);
  if (buffer.includes(0) || !isUtf8(buffer)) {
    throw new Error("reviewed legacy parent console report is not strict UTF-8 text");
  }
  scanOpaqueRawSignatures(buffer, displayPath);
  const text = buffer.toString("utf8");
  SECRET_ASSIGNMENT.lastIndex = 0;
  let assignmentCount = 0;
  let match;
  while ((match = SECRET_ASSIGNMENT.exec(text)) !== null) {
    if (!isSecretName(match[1])) continue;
    if (match[1] !== "password" || match[2] !== "=") {
      throw new Error("reviewed legacy parent console report secret assignment grammar mismatch");
    }
    const lineEnd = text.indexOf("\n", SECRET_ASSIGNMENT.lastIndex);
    const rawValue = text.slice(SECRET_ASSIGNMENT.lastIndex, lineEnd === -1 ? text.length : lineEnd);
    let immediateEnd = 0;
    while (immediateEnd < rawValue.length && !/[\t `]/u.test(rawValue[immediateEnd])) immediateEnd += 1;
    const immediateValue = rawValue.slice(0, immediateEnd);
    if (!/^(?:[0-9]{1,5}|\.{3})?$/u.test(immediateValue)) {
      throw new Error("reviewed legacy parent console report secret assignment value mismatch");
    }
    assignmentCount += 1;
  }
  if (assignmentCount !== 7) {
    throw new Error("reviewed legacy parent console report secret assignment count mismatch");
  }
  return { kind: "text", status: "passed" };
}

function scanReviewedLegacyExactTextPayload(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("reviewed legacy exact text payload must be a Buffer");
  }
  if (buffer.includes(0) || !isUtf8(buffer)) {
    throw new Error("reviewed legacy exact text payload is not strict UTF-8 text");
  }
  scanOpaqueRawSignatures(buffer, REVIEWED_LEGACY_EXACT_TEXT_DISPLAY_PATH);
  return { kind: "text", status: "passed" };
}

function assertStructurallyValidJpegUnderPng(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("reviewed legacy JPEG-under-PNG payload must be a Buffer");
  }
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("reviewed legacy JPEG-under-PNG is missing SOI marker");
  }

  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf
  ]);
  let offset = 2;
  let inEntropy = false;
  let markerFromEntropy = false;
  let sofSegments = 0;
  let sosSegments = 0;

  while (offset < buffer.length) {
    if (inEntropy) {
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        if (offset + 1 >= buffer.length) {
          throw new Error("reviewed legacy JPEG-under-PNG has a dangling entropy marker");
        }
        const entropyMarker = buffer[offset + 1];
        if (entropyMarker === 0x00 || (entropyMarker >= 0xd0 && entropyMarker <= 0xd7)) {
          offset += 2;
          continue;
        }
        inEntropy = false;
        markerFromEntropy = true;
        break;
      }
      if (inEntropy) break;
    }

    if (buffer[offset] !== 0xff) {
      throw new Error("reviewed legacy JPEG-under-PNG marker prefix is invalid");
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) {
      throw new Error("reviewed legacy JPEG-under-PNG marker is truncated");
    }
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0x00) {
      throw new Error("reviewed legacy JPEG-under-PNG has a stuffed byte outside entropy");
    }
    if (marker === 0xd8) {
      throw new Error("reviewed legacy JPEG-under-PNG has an unexpected SOI marker");
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      throw new Error("reviewed legacy JPEG-under-PNG has a restart marker outside entropy");
    }
    if (marker === 0xd9) {
      if (offset !== buffer.length) {
        throw new Error("reviewed legacy JPEG-under-PNG EOI marker is not terminal");
      }
      if (sofSegments === 0) {
        throw new Error("reviewed legacy JPEG-under-PNG is missing SOF marker");
      }
      if (sosSegments === 0) {
        throw new Error("reviewed legacy JPEG-under-PNG is missing SOS marker");
      }
      return { sofSegments, sosSegments, status: "passed" };
    }
    if (marker === 0x01) {
      inEntropy = markerFromEntropy;
      markerFromEntropy = false;
      continue;
    }
    if (offset + 2 > buffer.length) {
      throw new Error("reviewed legacy JPEG-under-PNG segment length is truncated");
    }
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) {
      throw new Error("reviewed legacy JPEG-under-PNG segment length is invalid");
    }
    const payloadOffset = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentEnd > buffer.length) {
      throw new Error("reviewed legacy JPEG-under-PNG segment exceeds payload");
    }

    if (sofMarkers.has(marker)) {
      if (segmentLength < 11) {
        throw new Error("reviewed legacy JPEG-under-PNG SOF segment length mismatch");
      }
      const componentCount = buffer[payloadOffset + 5];
      if (componentCount === 0 || segmentLength !== 8 + (3 * componentCount)) {
        throw new Error("reviewed legacy JPEG-under-PNG SOF segment length mismatch");
      }
      const height = buffer.readUInt16BE(payloadOffset + 1);
      const width = buffer.readUInt16BE(payloadOffset + 3);
      if (height === 0 || width === 0) {
        throw new Error("reviewed legacy JPEG-under-PNG SOF dimensions are invalid");
      }
      sofSegments += 1;
    } else if (marker === 0xda) {
      if (sofSegments === 0) {
        throw new Error("reviewed legacy JPEG-under-PNG SOS precedes SOF");
      }
      if (segmentLength < 8) {
        throw new Error("reviewed legacy JPEG-under-PNG SOS segment length mismatch");
      }
      const componentCount = buffer[payloadOffset];
      if (componentCount === 0 || segmentLength !== 6 + (2 * componentCount)) {
        throw new Error("reviewed legacy JPEG-under-PNG SOS segment length mismatch");
      }
      sosSegments += 1;
      inEntropy = true;
    } else if (marker === 0xdc && markerFromEntropy) {
      inEntropy = true;
    }

    markerFromEntropy = false;
    offset = segmentEnd;
  }

  throw new Error("reviewed legacy JPEG-under-PNG is missing EOI marker");
}

function scanReviewedLegacyJpegUnderPngPayload(buffer) {
  assertStructurallyValidJpegUnderPng(buffer);
  scanOpaqueRawSignatures(buffer, REVIEWED_LEGACY_JPEG_UNDER_PNG_DISPLAY_PATH);
  return { kind: "reviewed-binary", status: "passed" };
}

function readReviewedProtectedOverlayRef(worktreePath) {
  const existence = spawnSync(
    "git",
    ["show-ref", "--verify", "--quiet", REVIEWED_PROTECTED_OVERLAY_REF],
    {
      cwd: worktreePath,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      encoding: "utf8",
      timeout: CHILD_PROCESS_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  if (existence.error) throw new Error("reviewed protected overlay reference inspection failed");
  if (existence.status === 1) return null;
  if (existence.status !== 0) throw new Error("reviewed protected overlay reference inspection failed");
  const result = spawnSync(
    "git",
    ["show-ref", "--verify", "--hash", REVIEWED_PROTECTED_OVERLAY_REF],
    {
      cwd: worktreePath,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      encoding: "utf8",
      timeout: CHILD_PROCESS_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  if (result.error) throw new Error("reviewed protected overlay reference inspection failed");
  if (result.status !== 0 || !/^[0-9a-f]{40}$/u.test(result.stdout.trim())) {
    throw new Error("reviewed protected overlay reference inspection failed");
  }
  return result.stdout.trim();
}

function reviewedProtectedOverlayCommonDir(worktreePath) {
  const reported = gitText(["rev-parse", "--git-common-dir"], worktreePath);
  return fs.realpathSync(path.resolve(worktreePath, reported));
}

function assertReviewedProtectedOverlayBaseAncestry(worktreePath) {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", REVIEWED_PROTECTED_OVERLAY_BASE, REVIEWED_PROTECTED_OVERLAY_TARGET],
    {
      cwd: worktreePath,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      encoding: "utf8",
      timeout: CHILD_PROCESS_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error("reviewed protected overlay base ancestry mismatch");
  }
}

export function resolveReviewedProtectedOverlayContext(worktreePath, {
  expectedRepositoryId = REVIEWED_PROTECTED_OVERLAY_REPOSITORY_ID
} = {}) {
  const targetRevision = readReviewedProtectedOverlayRef(worktreePath);
  if (targetRevision === null) return null;
  if (typeof expectedRepositoryId !== "string" || !SHA256_PATTERN.test(expectedRepositoryId)) {
    throw new Error("reviewed protected overlay expected repository identity is invalid");
  }
  const commonDir = reviewedProtectedOverlayCommonDir(worktreePath);
  const actualRepositoryId = repositoryIdentity(commonDir);
  if (actualRepositoryId !== expectedRepositoryId) {
    throw new Error("reviewed protected overlay repository identity mismatch");
  }
  if (targetRevision !== REVIEWED_PROTECTED_OVERLAY_TARGET) {
    throw new Error("reviewed protected overlay reference mismatch");
  }
  try {
    gitBuffer(["cat-file", "-e", `${REVIEWED_PROTECTED_OVERLAY_TARGET}^{commit}`], worktreePath);
  } catch {
    throw new Error("reviewed protected overlay target commit is unavailable");
  }
  assertReviewedProtectedOverlayBaseAncestry(worktreePath);
  const context = Object.freeze({
    commonDir,
    refName: REVIEWED_PROTECTED_OVERLAY_REF,
    repositoryId: actualRepositoryId,
    targetRevision: REVIEWED_PROTECTED_OVERLAY_TARGET
  });
  ISSUED_REVIEWED_PROTECTED_OVERLAY_CONTEXTS.add(context);
  return context;
}

function assertReviewedProtectedOverlayContext(worktreePath, context) {
  if (context === null
    || typeof context !== "object"
    || !ISSUED_REVIEWED_PROTECTED_OVERLAY_CONTEXTS.has(context)
    || !exactKeys(context, ["commonDir", "refName", "repositoryId", "targetRevision"])
    || context.refName !== REVIEWED_PROTECTED_OVERLAY_REF
    || context.targetRevision !== REVIEWED_PROTECTED_OVERLAY_TARGET
    || context.commonDir !== reviewedProtectedOverlayCommonDir(worktreePath)
    || context.repositoryId !== repositoryIdentity(context.commonDir)) {
    throw new Error("reviewed protected overlay context mismatch");
  }
  const targetRevision = readReviewedProtectedOverlayRef(worktreePath);
  if (targetRevision !== REVIEWED_PROTECTED_OVERLAY_TARGET) {
    throw new Error("reviewed protected overlay reference mismatch");
  }
}

function readReviewedProtectedOverlayTreeEntry(worktreePath, policy) {
  const records = parseNul(gitBuffer([
    "ls-tree",
    "-z",
    policy.sourceRevision,
    "--",
    `:(literal)${policy.sourcePath}`
  ], worktreePath));
  if (records.length !== 1) throw new Error("reviewed protected overlay source entry mismatch");
  const separator = records[0].indexOf("\t");
  if (separator < 0 || records[0].slice(separator + 1) !== policy.sourcePath) {
    throw new Error("reviewed protected overlay source entry mismatch");
  }
  const [mode, type, objectId] = records[0].slice(0, separator).split(" ");
  if (mode !== policy.sourceMode || type !== policy.type || objectId !== policy.objectId) {
    throw new Error("reviewed protected overlay source metadata mismatch");
  }
  return { mode, type, objectId };
}

function scanReviewedProtectedOverlayPayload(policy, buffer) {
  if (policy.payloadKind === "terminal-patch") {
    return scanReviewedLegacyTerminalPatch(buffer, policy.path);
  }
  if (policy.payloadKind === "parent-console-report") {
    return scanReviewedLegacyParentConsoleReport(buffer);
  }
  if (policy.payloadKind === "exact-text") {
    return scanReviewedLegacyExactTextPayload(buffer);
  }
  if (policy.payloadKind === "jpeg-under-png") {
    return scanReviewedLegacyJpegUnderPngPayload(buffer);
  }
  if (policy.payloadKind === "office-lock") {
    scanOpaqueRawSignatures(
      buffer,
      `${REVIEWED_PROTECTED_OVERLAY_DISPLAY_PREFIX}/office-lock/content.bin`
    );
    return { kind: "text", status: "passed" };
  }
  throw new Error("reviewed protected overlay payload policy is invalid");
}

function exactReviewedProtectedOverlayFileCandidate(worktreePath, policy) {
  const absolutePath = path.join(worktreePath, policy.path);
  const pathStat = lstatIfPresent(absolutePath, "reviewed protected overlay file");
  if (!pathStat) throw new Error("reviewed protected overlay file is missing");
  const allowedFileModes = policy.allowedFileModes ?? [policy.fileMode];
  if (pathStat.isSymbolicLink()
    || !pathStat.isFile()
    || pathStat.nlink !== 1
    || !allowedFileModes.includes(pathStat.mode & 0o7777)) {
    throw new Error("reviewed protected overlay file metadata mismatch");
  }
  if (pathStat.size !== policy.bytes) {
    if (policy.allowGenericFallbackOnPayloadMismatch === true) return null;
    throw new Error("reviewed protected overlay file size mismatch");
  }
  const opened = openStrictEvidenceFile(
    absolutePath,
    "reviewed protected overlay file",
    allowedFileModes,
    { expectedBytes: policy.bytes }
  );
  if (!opened) return null;
  try {
    if (opened.buffer.length !== policy.bytes
      || gitSha1BlobObjectId(opened.buffer) !== policy.objectId
      || sha256Buffer(opened.buffer) !== policy.sha256) {
      if (policy.allowGenericFallbackOnPayloadMismatch === true) return null;
      throw new Error("reviewed protected overlay file integrity mismatch");
    }
    return { buffer: opened.buffer, mode: opened.mode };
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

export function scanReviewedProtectedOverlayFile(
  worktreePath,
  relativePath,
  sourceKind = "untracked",
  context = undefined
) {
  const policy = REVIEWED_PROTECTED_OVERLAY_BY_SOURCE_AND_PATH.get(`${sourceKind}\0${relativePath}`) ?? null;
  if (policy === null) return null;
  const effectiveContext = context === undefined
    ? resolveReviewedProtectedOverlayContext(worktreePath)
    : context;
  if (effectiveContext === null) return null;
  assertReviewedProtectedOverlayContext(worktreePath, effectiveContext);
  readReviewedProtectedOverlayTreeEntry(worktreePath, policy);
  const candidate = exactReviewedProtectedOverlayFileCandidate(worktreePath, policy);
  if (candidate === null) return null;
  const scan = scanReviewedProtectedOverlayPayload(policy, candidate.buffer);
  return {
    ...scan,
    buffer: candidate.buffer,
    mode: candidate.mode,
    reviewedProtectedOverlay: true
  };
}

export function scanReviewedProtectedOverlayGitBlob(
  worktreePath,
  relativePath,
  sourceKind,
  entry,
  context = undefined
) {
  const policy = REVIEWED_PROTECTED_OVERLAY_BY_SOURCE_AND_PATH.get(`${sourceKind}\0${relativePath}`) ?? null;
  if (policy === null) return null;
  const effectiveContext = context === undefined
    ? resolveReviewedProtectedOverlayContext(worktreePath)
    : context;
  if (effectiveContext === null) return null;
  assertReviewedProtectedOverlayContext(worktreePath, effectiveContext);
  readReviewedProtectedOverlayTreeEntry(worktreePath, policy);
  if (entry?.mode !== policy.mode
    || entry?.type !== policy.type
    || entry?.objectId !== policy.objectId) {
    throw new Error("reviewed protected overlay Git metadata mismatch");
  }
  const buffer = gitBuffer(["cat-file", "blob", entry.objectId], worktreePath);
  if (buffer.length !== policy.bytes
    || gitSha1BlobObjectId(buffer) !== policy.objectId
    || sha256Buffer(buffer) !== policy.sha256) {
    throw new Error("reviewed protected overlay Git blob integrity mismatch");
  }
  const scan = scanReviewedProtectedOverlayPayload(policy, buffer);
  return { ...scan, reviewedProtectedOverlay: true };
}

export function isReviewedLegacyTerminalPatchEntry({
  headRevision,
  relativePath,
  mode,
  type,
  objectId
} = {}) {
  const entry = REVIEWED_LEGACY_TERMINAL_PATCH_BY_PATH.get(relativePath) ?? null;
  return entry !== null
    && isReviewedLegacyCurrentHeadRevision(headRevision, REVIEWED_LEGACY_TERMINAL_PATCH_HEAD)
    && mode === entry.mode
    && type === "blob"
    && objectId === entry.objectId;
}

export function isReviewedLegacyOfficeLockBranchHeadEntry({
  headRevision,
  relativePath,
  mode,
  type,
  objectId
} = {}) {
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  return isReviewedLegacyCurrentHeadRevision(headRevision, entry.headRevision)
    && relativePath === entry.path
    && mode === entry.branchMode
    && type === "blob"
    && objectId === entry.objectId;
}

function isReviewedLegacyParentConsoleReportEntry({
  headRevision,
  relativePath,
  mode,
  type,
  objectId
} = {}) {
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  return isReviewedLegacyCurrentHeadRevision(headRevision, entry.headRevision)
    && relativePath === entry.path
    && mode === entry.mode
    && type === "blob"
    && objectId === entry.objectId;
}

export function isReviewedLegacyOfficeLockInventory(item) {
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  return item !== null
    && typeof item === "object"
    && exactKeys(item, ["mode", "path", "sha256", "size", "type"])
    && item.path === entry.path
    && item.type === "file"
    && item.mode === entry.untrackedMode
    && item.size === entry.bytes
    && item.sha256 === entry.sha256;
}

export function scanCurrentBranchHeadTrackedPaths(worktreePath, headRevision, paths) {
  if (!isGitObjectId(headRevision)) throw new Error("current branch HEAD revision must be a full Git object ID");
  let scanned = 0;
  let reviewed = 0;
  const exact = REVIEWED_CURRENT_BRANCH_HEAD_TRACKED_ENTRY;
  const officeLock = REVIEWED_LEGACY_OFFICE_LOCK;
  const parentConsoleReport = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  for (const relativePath of paths) {
    const exactPath = relativePath === exact.path;
    const terminalPatch = REVIEWED_LEGACY_TERMINAL_PATCH_BY_PATH.get(relativePath) ?? null;
    const officeLockPath = relativePath === officeLock.path;
    const parentConsoleReportPath = relativePath === parentConsoleReport.path;
    const reviewedLegacyText = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_BY_PATH.get(relativePath) ?? null;
    const reviewedLegacyJpegUnderPng = REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_BY_PATH.get(relativePath) ?? null;
    if (terminalPatch !== null
      && !isReviewedLegacyCurrentHeadRevision(headRevision, REVIEWED_LEGACY_TERMINAL_PATCH_HEAD)) {
      throw new Error(`reviewed legacy terminal patch is restricted to its pinned current branch HEAD: ${JSON.stringify(relativePath)}`);
    }
    if (officeLockPath && !isReviewedLegacyCurrentHeadRevision(headRevision, officeLock.headRevision)) {
      throw new Error(`reviewed legacy Office lock is restricted to its pinned current branch HEAD: ${JSON.stringify(relativePath)}`);
    }
    if (parentConsoleReportPath
      && !isReviewedLegacyCurrentHeadRevision(headRevision, parentConsoleReport.headRevision)) {
      throw new Error(`reviewed legacy parent console report is restricted to its pinned current branch HEAD: ${JSON.stringify(relativePath)}`);
    }
    if (reviewedLegacyText !== null
      && !isReviewedLegacyCurrentHeadRevision(headRevision, reviewedLegacyText.revision)) {
      throw new Error("reviewed legacy current HEAD text is restricted to its pinned revision");
    }
    if (reviewedLegacyJpegUnderPng !== null
      && !isReviewedLegacyCurrentHeadRevision(
        headRevision,
        REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION
      )) {
      throw new Error("reviewed legacy JPEG-under-PNG is restricted to its pinned current branch HEAD");
    }
    if (!exactPath
      && !officeLockPath
      && !parentConsoleReportPath
      && reviewedLegacyText === null
      && reviewedLegacyJpegUnderPng === null) {
      scanArchivePath(relativePath);
    }
    const records = parseNul(gitBuffer(["ls-tree", "-z", headRevision, "--", `:(literal)${relativePath}`], worktreePath));
    let matched = false;
    for (const record of records) {
      const separator = record.indexOf("\t");
      if (separator < 0 || record.slice(separator + 1) !== relativePath) continue;
      const [mode, type, objectId] = record.slice(0, separator).split(" ");
      const exactReviewedEntry = exactPath
        && mode === exact.mode
        && type === "blob"
        && objectId === exact.objectId;
      if (exactReviewedEntry) {
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== exact.bytes
          || gitSha1BlobObjectId(buffer) !== exact.objectId
          || sha256Buffer(buffer) !== exact.sha256) {
          throw new Error("reviewed current branch HEAD Git blob integrity mismatch");
        }
        scanBuffer(buffer, { displayPath: REVIEWED_CURRENT_BRANCH_HEAD_TRACKED_DISPLAY_PATH });
        matched = true;
        scanned += 1;
        continue;
      }
      const exactTerminalPatch = isReviewedLegacyTerminalPatchEntry({
        headRevision,
        relativePath,
        mode,
        type,
        objectId
      });
      if (exactTerminalPatch) {
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== terminalPatch.bytes
          || gitSha1BlobObjectId(buffer) !== terminalPatch.objectId
          || sha256Buffer(buffer) !== terminalPatch.sha256) {
          throw new Error("reviewed legacy terminal patch Git blob integrity mismatch");
        }
        scanReviewedLegacyTerminalPatch(buffer, relativePath);
        matched = true;
        scanned += 1;
        continue;
      }
      const exactOfficeLock = isReviewedLegacyOfficeLockBranchHeadEntry({
        headRevision,
        relativePath,
        mode,
        type,
        objectId
      });
      if (exactOfficeLock) {
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== officeLock.bytes
          || gitSha1BlobObjectId(buffer) !== officeLock.objectId
          || sha256Buffer(buffer) !== officeLock.sha256) {
          throw new Error("reviewed legacy Office lock Git blob integrity mismatch");
        }
        scanOpaqueRawSignatures(buffer, REVIEWED_LEGACY_OFFICE_LOCK_DISPLAY_PATH);
        matched = true;
        scanned += 1;
        continue;
      }
      const exactParentConsoleReport = isReviewedLegacyParentConsoleReportEntry({
        headRevision,
        relativePath,
        mode,
        type,
        objectId
      });
      if (exactParentConsoleReport) {
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== parentConsoleReport.bytes
          || gitSha1BlobObjectId(buffer) !== parentConsoleReport.objectId
          || sha256Buffer(buffer) !== parentConsoleReport.sha256) {
          throw new Error("reviewed legacy parent console report Git blob integrity mismatch");
        }
        scanReviewedLegacyParentConsoleReport(buffer);
        matched = true;
        scanned += 1;
        continue;
      }
      if (reviewedLegacyText !== null) {
        if (mode !== reviewedLegacyText.mode
          || type !== reviewedLegacyText.type
          || objectId !== reviewedLegacyText.objectId) {
          throw new Error("reviewed legacy current HEAD text metadata mismatch");
        }
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== reviewedLegacyText.bytes
          || gitSha1BlobObjectId(buffer) !== reviewedLegacyText.objectId
          || sha256Buffer(buffer) !== reviewedLegacyText.sha256) {
          throw new Error("reviewed legacy current HEAD text Git blob integrity mismatch");
        }
        scanReviewedLegacyExactTextPayload(buffer);
        matched = true;
        scanned += 1;
        continue;
      }
      if (reviewedLegacyJpegUnderPng !== null) {
        if (mode !== reviewedLegacyJpegUnderPng.mode
          || type !== reviewedLegacyJpegUnderPng.type
          || objectId !== reviewedLegacyJpegUnderPng.objectId) {
          throw new Error("reviewed legacy JPEG-under-PNG metadata mismatch");
        }
        const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
        if (buffer.length !== reviewedLegacyJpegUnderPng.bytes
          || gitSha1BlobObjectId(buffer) !== reviewedLegacyJpegUnderPng.objectId
          || sha256Buffer(buffer) !== reviewedLegacyJpegUnderPng.sha256) {
          throw new Error("reviewed legacy JPEG-under-PNG Git blob integrity mismatch");
        }
        scanReviewedLegacyJpegUnderPngPayload(buffer);
        matched = true;
        scanned += 1;
        reviewed += 1;
        continue;
      }
      if (terminalPatch !== null) {
        throw new Error(`reviewed legacy terminal patch metadata mismatch: ${JSON.stringify(relativePath)}`);
      }
      if (officeLockPath) {
        throw new Error(`reviewed legacy Office lock metadata mismatch: ${JSON.stringify(relativePath)}`);
      }
      if (parentConsoleReportPath) {
        throw new Error(`reviewed legacy parent console report metadata mismatch: ${JSON.stringify(relativePath)}`);
      }
      if (exactPath) scanArchivePath(relativePath);
      if (type !== "blob" || !mode || !objectId) throw new Error(`unsupported current branch HEAD Git object for ${JSON.stringify(relativePath)}`);
      const buffer = gitBuffer(["cat-file", "blob", objectId], worktreePath);
      if (mode === "120000") {
        assertSafeSymlink(worktreePath, relativePath, buffer.toString("utf8"));
        matched = true;
        scanned += 1;
        continue;
      }
      if (mode !== "100644" && mode !== "100755") {
        throw new Error(`unsupported current branch HEAD Git mode for ${JSON.stringify(relativePath)}`);
      }
      const result = scanBufferForPath(buffer, relativePath, "branch-head");
      matched = true;
      scanned += 1;
      if (result.kind === "reviewed-binary") reviewed += 1;
    }
    if (!matched) {
      if (terminalPatch !== null) {
        throw new Error(`reviewed legacy terminal patch Git blob is missing: ${JSON.stringify(relativePath)}`);
      }
      if (officeLockPath) {
        throw new Error(`reviewed legacy Office lock Git blob is missing: ${JSON.stringify(relativePath)}`);
      }
      if (parentConsoleReportPath) {
        throw new Error(`reviewed legacy parent console report Git blob is missing: ${JSON.stringify(relativePath)}`);
      }
      if (reviewedLegacyText !== null) {
        throw new Error("reviewed legacy current HEAD text Git blob is missing");
      }
      if (reviewedLegacyJpegUnderPng !== null) {
        throw new Error("reviewed legacy JPEG-under-PNG Git blob is missing");
      }
      if (exactPath) scanArchivePath(relativePath);
      throw new Error(`current branch HEAD Git blob is missing for ${JSON.stringify(relativePath)}`);
    }
  }
  return { scanned, reviewed };
}

function assertSafeSymlink(worktreePath, relativePath, target) {
  if (path.isAbsolute(target) || path.win32.isAbsolute(target) || target.includes("\0")) {
    throw new Error(`unsafe symlink rejected: ${JSON.stringify(relativePath)}`);
  }
  const normalizedTarget = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath.replaceAll("\\", "/")), target.replaceAll("\\", "/")));
  if (normalizedTarget === ".." || normalizedTarget.startsWith("../")) throw new Error(`symlink escape rejected: ${JSON.stringify(relativePath)}`);
  const canonicalWorktree = fs.realpathSync(worktreePath);
  const resolved = path.resolve(path.dirname(path.join(canonicalWorktree, relativePath)), target);
  if (!isWithin(resolved, canonicalWorktree)) throw new Error(`symlink escape rejected: ${JSON.stringify(relativePath)}`);
  assertExistingAncestorsContained(canonicalWorktree, resolved, relativePath, new Set());
}

function assertExistingAncestorsContained(canonicalWorktree, candidate, displayPath, seenSymlinks) {
  if (!isWithin(candidate, canonicalWorktree)) throw new Error(`symlink ancestor escape rejected: ${JSON.stringify(displayPath)}`);
  const relative = path.relative(canonicalWorktree, candidate);
  let cursor = canonicalWorktree;
  const components = relative === "" ? [] : relative.split(path.sep);
  for (const [index, component] of components.entries()) {
    cursor = path.join(cursor, component);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw new Error(`symlink ancestor inspection failed for ${JSON.stringify(displayPath)}`);
    }
    if (stat.isSymbolicLink()) {
      const identity = `${stat.dev}:${stat.ino}`;
      if (seenSymlinks.has(identity)) throw new Error(`symlink ancestor cycle rejected: ${JSON.stringify(displayPath)}`);
      const nextSeen = new Set(seenSymlinks);
      nextSeen.add(identity);
      const linkTarget = fs.readlinkSync(cursor);
      if (path.isAbsolute(linkTarget) || path.win32.isAbsolute(linkTarget) || linkTarget.includes("\0")) {
        throw new Error(`symlink ancestor escape rejected: ${JSON.stringify(displayPath)}`);
      }
      const resolvedTarget = path.resolve(path.dirname(cursor), linkTarget);
      if (!isWithin(resolvedTarget, canonicalWorktree)) {
        throw new Error(`symlink ancestor escape rejected: ${JSON.stringify(displayPath)}`);
      }
      assertExistingAncestorsContained(canonicalWorktree, resolvedTarget, displayPath, nextSeen);
      continue;
    }
    const canonicalCursor = fs.realpathSync(cursor);
    if (!isWithin(canonicalCursor, canonicalWorktree)) {
      throw new Error(`symlink ancestor escape rejected: ${JSON.stringify(displayPath)}`);
    }
    if (index < components.length - 1 && !stat.isDirectory()) {
      throw new Error(`symlink ancestor is not a directory: ${JSON.stringify(displayPath)}`);
    }
  }
}

function gitSha1BlobObjectId(buffer) {
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest("hex");
}

function scanReviewedUntrackedExactFile(worktreePath, relativePath, reviewed, {
  label,
  scan
}) {
  if (relativePath !== reviewed.path) return null;
  const opened = openStrictEvidenceFile(
    path.join(worktreePath, relativePath),
    label,
    [reviewed.mode],
    { expectedBytes: reviewed.bytes }
  );
  if (!opened) throw new Error(`${label} is missing`);
  try {
    const mode = opened.stat.mode & 0o7777;
    if (mode !== reviewed.mode
      || opened.stat.size !== reviewed.bytes
      || opened.buffer.length !== reviewed.bytes
      || gitSha1BlobObjectId(opened.buffer) !== reviewed.objectId
      || sha256Buffer(opened.buffer) !== reviewed.sha256) {
      throw new Error(`${label} integrity mismatch`);
    }
    scan(opened.buffer);
    return { buffer: opened.buffer, mode };
  } finally {
    closeStrictEvidenceFile(opened);
  }
}

function scanReviewedUntrackedCoordinationReport(worktreePath, relativePath) {
  return scanReviewedUntrackedExactFile(
    worktreePath,
    relativePath,
    REVIEWED_UNTRACKED_COORDINATION_REPORT,
    {
      label: "reviewed untracked coordination report",
      scan: (buffer) => scanBufferForPath(
        buffer,
        REVIEWED_UNTRACKED_COORDINATION_REPORT_DISPLAY_PATH,
        "reviewed-untracked-coordination-report"
      )
    }
  );
}

function scanReviewedUntrackedLegacyOfficeLock(worktreePath, relativePath) {
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  // This is intentionally independent of branch and worktree cardinality: the
  // reviewed artifact identity is the exact path, direct-file metadata, and
  // cryptographic content identity checked by scanReviewedUntrackedExactFile.
  return scanReviewedUntrackedExactFile(
    worktreePath,
    relativePath,
    {
      path: entry.path,
      mode: entry.untrackedMode,
      objectId: entry.objectId,
      bytes: entry.bytes,
      sha256: entry.sha256
    },
    {
      label: "reviewed legacy Office lock",
      scan: (buffer) => scanOpaqueRawSignatures(buffer, REVIEWED_LEGACY_OFFICE_LOCK_DISPLAY_PATH)
    }
  );
}

function scanReviewedProtectedOverlayArchiveFile(worktreePath, relativePath) {
  const policy = REVIEWED_PROTECTED_OVERLAY_UNTRACKED_BY_PATH.get(relativePath) ?? null;
  if (policy === null) return null;
  const candidate = exactReviewedProtectedOverlayFileCandidate(worktreePath, policy);
  if (candidate === null) return null;
  const scan = scanReviewedProtectedOverlayPayload(policy, candidate.buffer);
  return {
    ...scan,
    buffer: candidate.buffer,
    mode: candidate.mode,
    reviewedProtectedOverlay: true
  };
}

function scanReviewedUntrackedFile(
  worktreePath,
  relativePath,
  protectedOverlayContext,
  { archiveProtectedOverlayPaths = null } = {}
) {
  return scanReviewedUntrackedCoordinationReport(worktreePath, relativePath)
    ?? scanReviewedUntrackedLegacyOfficeLock(worktreePath, relativePath)
    ?? (archiveProtectedOverlayPaths?.has(relativePath) === true
      ? scanReviewedProtectedOverlayArchiveFile(worktreePath, relativePath)
      : scanReviewedProtectedOverlayFile(
        worktreePath,
        relativePath,
        "untracked",
        protectedOverlayContext
      ));
}

function buildInventoryInternal(worktreePath, paths, {
  protectedOverlayContext = null,
  archiveProtectedOverlayPaths = null
} = {}) {
  const inventory = [];
  let reviewedBinaryPaths = 0;
  let reviewedProtectedOverlayPaths = 0;
  for (const relativePath of [...paths].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))) {
    const reviewedUntrackedFile = scanReviewedUntrackedFile(
      worktreePath,
      relativePath,
      protectedOverlayContext,
      { archiveProtectedOverlayPaths }
    );
    if (!reviewedUntrackedFile) scanArchivePath(relativePath);
    if (reviewedUntrackedFile) {
      if (reviewedUntrackedFile.kind === "reviewed-binary") reviewedBinaryPaths += 1;
      if (reviewedUntrackedFile.reviewedProtectedOverlay === true) reviewedProtectedOverlayPaths += 1;
      inventory.push({
        path: relativePath,
        type: "file",
        mode: reviewedUntrackedFile.mode,
        size: reviewedUntrackedFile.buffer.length,
        sha256: sha256Buffer(reviewedUntrackedFile.buffer)
      });
      continue;
    }
    const absolutePath = path.join(worktreePath, relativePath);
    const stat = fs.lstatSync(absolutePath);
    const mode = stat.mode & 0o7777;
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(absolutePath);
      assertSafeSymlink(worktreePath, relativePath, target);
      const targetBuffer = Buffer.from(target);
      inventory.push({ path: relativePath, type: "symlink", mode, size: targetBuffer.length, sha256: sha256Buffer(targetBuffer), target });
    } else if (stat.isFile()) {
      const scan = scanFile(absolutePath, relativePath);
      if (scan.kind === "reviewed-binary") reviewedBinaryPaths += 1;
      inventory.push({ path: relativePath, type: "file", mode, size: stat.size, sha256: sha256Buffer(fs.readFileSync(absolutePath)) });
    } else {
      throw new Error(`unsupported untracked path type: ${JSON.stringify(relativePath)}`);
    }
  }
  return { inventory, reviewedBinaryPaths, reviewedProtectedOverlayPaths };
}

export function buildInventory(worktreePath, paths, {
  protectedOverlayExpectedRepositoryId = REVIEWED_PROTECTED_OVERLAY_REPOSITORY_ID
} = {}) {
  return buildInventoryInternal(worktreePath, paths, {
    protectedOverlayContext: resolveReviewedProtectedOverlayContext(worktreePath, {
      expectedRepositoryId: protectedOverlayExpectedRepositoryId
    })
  });
}

function sortGitPaths(paths) {
  return [...paths].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

export function parseDiffNameStatusZ(buffer) {
  const fields = parseNul(buffer);
  const currentPaths = new Set();
  const historicalPaths = new Set();
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!/^(?:[ADMTU]|[RC][0-9]{1,3})$/u.test(status)) {
      throw new Error(`unsupported Git name-status record: ${JSON.stringify(status)}`);
    }
    const code = status[0];
    if (code === "R" || code === "C") {
      if (index + 1 >= fields.length) throw new Error(`${status} Git name-status record is missing old or new path`);
      const oldPath = fields[index++];
      const newPath = fields[index++];
      if (!oldPath || !newPath) throw new Error(`${status} Git name-status record contains an empty path`);
      historicalPaths.add(oldPath);
      currentPaths.add(newPath);
      continue;
    }
    if (index >= fields.length) throw new Error(`${status} Git name-status record is missing its path`);
    const relativePath = fields[index++];
    if (!relativePath) throw new Error(`${status} Git name-status record contains an empty path`);
    if (code !== "D") currentPaths.add(relativePath);
    if (code !== "A") historicalPaths.add(relativePath);
  }
  return {
    currentPaths: sortGitPaths(currentPaths),
    historicalPaths: sortGitPaths(historicalPaths)
  };
}

function changedPathSets(worktreePath, range, {
  cached = false,
  transactionMetadataExclusions = [],
  ephemeralTransactionMetadataRoots = []
} = {}) {
  const args = ["diff"];
  if (cached) args.push("--cached");
  args.push("--name-status", "-z", "--find-renames", "--find-copies-harder");
  if (range) args.push(range);
  args.push("--", ...gitPathspec(transactionMetadataExclusions, ephemeralTransactionMetadataRoots));
  return parseDiffNameStatusZ(gitBuffer(args, worktreePath));
}

export function parseIndexInventoryZ(buffer) {
  return parseNul(buffer).map((record) => {
    const match = /^([0-7]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])\t([\s\S]+)$/u.exec(record);
    if (!match) throw new Error("invalid NUL-delimited Git index inventory record");
    return { mode: match[1], objectId: match[2], stage: Number(match[3]), path: match[4] };
  });
}

function scanReviewedLegacyStage0Entry(worktreePath, entry) {
  const reviewed = Object.hasOwn(REVIEWED_LEGACY_STAGE0_BY_PATH, entry.path)
    ? REVIEWED_LEGACY_STAGE0_BY_PATH[entry.path]
    : null;
  if (!reviewed || entry.mode !== reviewed.mode || entry.objectId !== reviewed.objectId) return false;
  const buffer = gitBuffer(["cat-file", "blob", entry.objectId], worktreePath);
  if (buffer.length !== reviewed.bytes || sha256Buffer(buffer) !== reviewed.sha256) {
    throw new Error("reviewed legacy stage-0 Git blob integrity mismatch");
  }
  scanBufferForPath(buffer, "reviewed-content.md", "reviewed-legacy-stage0");
  return true;
}

function assertStage0Index(worktreePath, entries) {
  const unmerged = entries.find((entry) => entry.stage !== 0);
  if (unmerged) throw new Error(`unmerged index stages are unsupported for ${JSON.stringify(unmerged.path)}`);
  const duplicates = new Set();
  const seen = new Set();
  for (const entry of entries) {
    if (!scanReviewedLegacyStage0Entry(worktreePath, entry)) scanArchivePath(entry.path);
    if (seen.has(entry.path)) duplicates.add(entry.path);
    seen.add(entry.path);
    if (entry.mode === "120000") {
      const target = gitBuffer(["cat-file", "blob", entry.objectId], worktreePath).toString("utf8");
      assertSafeSymlink(worktreePath, entry.path, target);
    }
  }
  if (duplicates.size > 0) throw new Error(`duplicate stage-0 index entry for ${JSON.stringify([...duplicates][0])}`);
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function readIndexStage0Entry(indexByPath, relativePath) {
  scanArchivePath(relativePath);
  const entry = indexByPath.get(relativePath);
  if (!entry) throw new Error(`stage-0 index blob is missing for ${JSON.stringify(relativePath)}`);
  return entry;
}

function scanIndexStage0Paths(
  worktreePath,
  indexByPath,
  paths,
  labelPrefix = "index",
  protectedOverlayContext = null,
  protectedSourceKind = labelPrefix
) {
  let scanned = 0;
  let reviewed = 0;
  let reviewedProtected = 0;
  for (const relativePath of paths) {
    const entry = readIndexStage0Entry(indexByPath, relativePath);
    const protectedOverlayScan = scanReviewedProtectedOverlayGitBlob(
      worktreePath,
      relativePath,
      protectedSourceKind,
      { mode: entry.mode, type: "blob", objectId: entry.objectId },
      protectedOverlayContext
    );
    if (protectedOverlayScan !== null) {
      scanned += 1;
      reviewedProtected += 1;
      continue;
    }
    const buffer = gitBuffer(["cat-file", "blob", entry.objectId], worktreePath);
    if (entry.mode === "120000") {
      assertSafeSymlink(worktreePath, relativePath, buffer.toString("utf8"));
      scanned += 1;
      continue;
    }
    if (entry.mode !== "100644" && entry.mode !== "100755") {
      throw new Error(`unsupported stage-0 Git mode for ${JSON.stringify(relativePath)}`);
    }
    const result = scanBufferForPath(buffer, relativePath, labelPrefix);
    scanned += 1;
    if (result.kind === "reviewed-binary") reviewed += 1;
  }
  return { scanned, reviewed, reviewedProtected };
}

function scanChangedWorkingTree(
  worktreePath,
  paths,
  protectedOverlayContext = null,
  protectedSourceKind = "worktree-current"
) {
  let scanned = 0;
  let reviewed = 0;
  let reviewedProtected = 0;
  for (const relativePath of paths) {
    scanArchivePath(relativePath);
    const absolutePath = path.join(worktreePath, relativePath);
    let stat;
    try {
      stat = fs.lstatSync(absolutePath);
    } catch (error) {
      throw new Error(`changed working-tree path is missing for ${JSON.stringify(relativePath)} (${error.message})`);
    }
    if (stat.isSymbolicLink()) {
      assertSafeSymlink(worktreePath, relativePath, fs.readlinkSync(absolutePath));
      scanned += 1;
      continue;
    }
    if (!stat.isFile()) throw new Error(`unsupported changed working-tree path type: ${JSON.stringify(relativePath)}`);
    const protectedOverlayScan = scanReviewedProtectedOverlayFile(
      worktreePath,
      relativePath,
      protectedSourceKind,
      protectedOverlayContext
    );
    if (protectedOverlayScan !== null) {
      scanned += 1;
      reviewedProtected += 1;
      continue;
    }
    const result = scanFile(absolutePath, relativePath);
    scanned += 1;
    if (result.kind === "reviewed-binary") reviewed += 1;
  }
  return { scanned, reviewed, reviewedProtected };
}

function createTar(worktreePath, paths0) {
  if (paths0.length === 0) return null;
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-evidence-tar-"));
  const listPath = path.join(scratch, "paths0");
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    fs.rmSync(scratch, { recursive: true, force: true });
    cleaned = true;
  };
  try {
    writePrivate(listPath, paths0);
    const canonicalizeScript = [
      "import copy,gzip,os,subprocess,sys,tarfile",
      "environment=os.environ.copy()",
      "environment['COPYFILE_DISABLE']='1'",
      "command=['tar','-cf','-','-C',sys.argv[1],'--null','-T',sys.argv[2]]",
      "process=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=sys.stderr,env=environment)",
      "try:",
      " if process.stdout is None: raise RuntimeError('tar stdout is unavailable')",
      " with process.stdout as raw_source:",
      "  with tarfile.open(fileobj=raw_source, mode='r|') as source:",
      "   with gzip.GzipFile(filename='', mode='wb', fileobj=sys.stdout.buffer, mtime=0) as compressed:",
      "    with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as target:",
      "     for member in source:",
      "      clean=copy.copy(member)",
      "      clean.uid=clean.gid=0",
      "      clean.uname=clean.gname=''",
      "      clean.mtime=0",
      "      clean.pax_headers={}",
      "      target.addfile(clean, source.extractfile(member) if member.isfile() else None)",
      "finally:",
      " status=process.wait()",
      "if status != 0: raise SystemExit(status)"
    ].join("\n");
    const buffer = execFileSync(
      "python3",
      ["-c", canonicalizeScript, worktreePath, listPath],
      {
        encoding: null,
        env: { ...process.env, COPYFILE_DISABLE: "1" },
        maxBuffer: 1024 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: CHILD_PROCESS_TIMEOUT_MS
      }
    );
    cleanup();
    return { buffer, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}

export function collectWorktreeSnapshot(worktree, {
  mainRef = "main",
  includeTar = true,
  beforeDriftCheck,
  protectedOverlayExpectedRepositoryId = REVIEWED_PROTECTED_OVERLAY_REPOSITORY_ID,
  transactionMetadataExclusions: requestedTransactionMetadataExclusions = [],
  ephemeralTransactionMetadataRoots: requestedEphemeralTransactionMetadataRoots = []
} = {}) {
  const protectedOverlayContext = resolveReviewedProtectedOverlayContext(worktree.path, {
    expectedRepositoryId: protectedOverlayExpectedRepositoryId
  });
  const transactionMetadataExclusions = normalizeTransactionMetadataExclusions(requestedTransactionMetadataExclusions);
  const ephemeralTransactionMetadataRoots = normalizeEphemeralTransactionMetadataRoots(requestedEphemeralTransactionMetadataRoots);
  const pathspec = gitPathspec(transactionMetadataExclusions, ephemeralTransactionMetadataRoots);
  const initialHead = gitText(["rev-parse", "HEAD"], worktree.path);
  const baseHead = gitText(["rev-parse", mainRef], worktree.path);
  if (initialHead !== worktree.head) throw new Error(`${worktree.branch}: worktree drift detected before snapshot`);
  const statusBuffer = gitBuffer(["status", "--porcelain=v1", "-z", "-uall", "--", ...pathspec], worktree.path);
  const status = parseStatusPorcelainZ(statusBuffer);
  const untracked = parseNul(gitBuffer(["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspec], worktree.path))
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const untrackedPaths0 = untracked.length > 0 ? Buffer.concat(untracked.map((item) => Buffer.concat([Buffer.from(item), Buffer.from([0])]))) : Buffer.alloc(0);
  const indexInventory = gitBuffer(["ls-files", "--stage", "-z", "--", ...pathspec], worktree.path);
  const indexEntries = parseIndexInventoryZ(indexInventory);
  const indexByPath = assertStage0Index(worktree.path, indexEntries);
  const trackedPatch = gitBuffer(["diff", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const indexPatch = gitBuffer(["diff", "--cached", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const worktreePatch = gitBuffer(["diff", "--binary", "--", ...pathspec], worktree.path);
  scanBuffer(trackedPatch, { displayPath: "tracked.patch", aggregatePatch: true });
  scanBuffer(indexPatch, { displayPath: "index.patch", aggregatePatch: true });
  scanBuffer(worktreePatch, { displayPath: "worktree.patch", aggregatePatch: true });
  const pathSetOptions = { transactionMetadataExclusions, ephemeralTransactionMetadataRoots };
  const indexPaths = changedPathSets(worktree.path, "HEAD", { cached: true, ...pathSetOptions });
  const indexScan = scanIndexStage0Paths(
    worktree.path,
    indexByPath,
    indexPaths.currentPaths,
    "index",
    protectedOverlayContext,
    "index"
  );
  const indexHistoricalScan = scanHistoricalTrackedPaths(
    worktree.path,
    "HEAD",
    indexPaths.historicalPaths,
    "head-before-index",
    null,
    protectedOverlayContext,
    "head-before-index"
  );
  const worktreePaths = changedPathSets(worktree.path, null, pathSetOptions);
  const worktreeScan = scanChangedWorkingTree(
    worktree.path,
    worktreePaths.currentPaths,
    protectedOverlayContext,
    "worktree-current"
  );
  const worktreeHistoricalScan = scanIndexStage0Paths(
    worktree.path,
    indexByPath,
    worktreePaths.historicalPaths,
    "index-before-worktree",
    protectedOverlayContext,
    "index-before-worktree"
  );
  const trackedPaths = changedPathSets(worktree.path, "HEAD", pathSetOptions);
  const trackedScan = scanChangedWorkingTree(
    worktree.path,
    trackedPaths.currentPaths,
    protectedOverlayContext,
    "tracked-current"
  );
  const trackedHistoricalScan = scanHistoricalTrackedPaths(
    worktree.path,
    "HEAD",
    trackedPaths.historicalPaths,
    "historical",
    null,
    protectedOverlayContext,
    "historical"
  );
  const branchRange = `${baseHead}...${initialHead}`;
  const mergeBase = gitText(["merge-base", baseHead, initialHead], worktree.path);
  const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", branchRange], worktree.path).split(/\s+/u).map(Number);
  const divergence = { behind, ahead };
  const branchPatch = baseHead !== initialHead ? gitBuffer(["diff", "--binary", branchRange, "--", ...pathspec], worktree.path) : null;
  if (branchPatch) scanBuffer(branchPatch, { displayPath: "branch.patch", aggregatePatch: true });
  const branchPaths = branchPatch
    ? changedPathSets(worktree.path, branchRange, pathSetOptions)
    : { currentPaths: [], historicalPaths: [] };
  const branchScan = scanCurrentBranchHeadTrackedPaths(worktree.path, initialHead, branchPaths.currentPaths);
  const branchHistoricalScan = scanBranchBaseHistoricalTrackedPaths(
    worktree.path,
    mergeBase,
    branchPaths.historicalPaths
  );
  const {
    inventory,
    reviewedBinaryPaths,
    reviewedProtectedOverlayPaths
  } = buildInventoryInternal(worktree.path, untracked, { protectedOverlayContext });
  const inventoryBuffer = Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`);
  beforeDriftCheck?.();
  if (protectedOverlayContext !== null) {
    assertReviewedProtectedOverlayContext(worktree.path, protectedOverlayContext);
  }
  const finalHead = gitText(["rev-parse", "HEAD"], worktree.path);
  const finalBaseHead = gitText(["rev-parse", mainRef], worktree.path);
  const finalStatusBuffer = gitBuffer(["status", "--porcelain=v1", "-z", "-uall", "--", ...pathspec], worktree.path);
  const finalUntracked = parseNul(gitBuffer(["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspec], worktree.path))
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const finalPaths0 = finalUntracked.length > 0 ? Buffer.concat(finalUntracked.map((item) => Buffer.concat([Buffer.from(item), Buffer.from([0])]))) : Buffer.alloc(0);
  const finalIndexInventory = gitBuffer(["ls-files", "--stage", "-z", "--", ...pathspec], worktree.path);
  const finalPatch = gitBuffer(["diff", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const finalIndexPatch = gitBuffer(["diff", "--cached", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const finalWorktreePatch = gitBuffer(["diff", "--binary", "--", ...pathspec], worktree.path);
  const finalBranchRange = `${finalBaseHead}...${finalHead}`;
  const finalBranchPatch = finalBaseHead !== finalHead
    ? gitBuffer(["diff", "--binary", finalBranchRange, "--", ...pathspec], worktree.path)
    : null;
  const finalInventoryBuffer = Buffer.from(`${JSON.stringify(buildInventoryInternal(
    worktree.path,
    finalUntracked,
    { protectedOverlayContext }
  ).inventory, null, 2)}\n`);
  if (finalHead !== initialHead
    || finalBaseHead !== baseHead
    || !finalStatusBuffer.equals(statusBuffer)
    || !finalPaths0.equals(untrackedPaths0)
    || !finalIndexInventory.equals(indexInventory)
    || !finalPatch.equals(trackedPatch)
    || !finalIndexPatch.equals(indexPatch)
    || !finalWorktreePatch.equals(worktreePatch)
    || (branchPatch === null ? finalBranchPatch !== null : !branchPatch.equals(finalBranchPatch))
    || !finalInventoryBuffer.equals(inventoryBuffer)) {
    throw new Error(`${worktree.branch}: worktree drift detected during evidence snapshot`);
  }
  const tar = includeTar ? createTar(worktree.path, untrackedPaths0) : null;
  if (protectedOverlayContext !== null) {
    assertReviewedProtectedOverlayContext(worktree.path, protectedOverlayContext);
  }
  const postHead = gitText(["rev-parse", "HEAD"], worktree.path);
  const postBaseHead = gitText(["rev-parse", mainRef], worktree.path);
  const postStatusBuffer = gitBuffer(["status", "--porcelain=v1", "-z", "-uall", "--", ...pathspec], worktree.path);
  const postUntracked = parseNul(gitBuffer(["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspec], worktree.path))
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const postPaths0 = postUntracked.length > 0 ? Buffer.concat(postUntracked.map((item) => Buffer.concat([Buffer.from(item), Buffer.from([0])]))) : Buffer.alloc(0);
  const postIndexInventory = gitBuffer(["ls-files", "--stage", "-z", "--", ...pathspec], worktree.path);
  const postPatch = gitBuffer(["diff", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const postIndexPatch = gitBuffer(["diff", "--cached", "HEAD", "--binary", "--", ...pathspec], worktree.path);
  const postWorktreePatch = gitBuffer(["diff", "--binary", "--", ...pathspec], worktree.path);
  const postBranchRange = `${postBaseHead}...${postHead}`;
  const postBranchPatch = postBaseHead !== postHead
    ? gitBuffer(["diff", "--binary", postBranchRange, "--", ...pathspec], worktree.path)
    : null;
  const postInventoryBuffer = Buffer.from(`${JSON.stringify(buildInventoryInternal(
    worktree.path,
    postUntracked,
    { protectedOverlayContext }
  ).inventory, null, 2)}\n`);
  if (postHead !== initialHead
    || postBaseHead !== baseHead
    || !postStatusBuffer.equals(statusBuffer)
    || !postPaths0.equals(untrackedPaths0)
    || !postIndexInventory.equals(indexInventory)
    || !postPatch.equals(trackedPatch)
    || !postIndexPatch.equals(indexPatch)
    || !postWorktreePatch.equals(worktreePatch)
    || (branchPatch === null ? postBranchPatch !== null : !branchPatch.equals(postBranchPatch))
    || !postInventoryBuffer.equals(inventoryBuffer)) {
    tar?.cleanup();
    throw new Error(`${worktree.branch}: worktree drift detected while writing evidence archive`);
  }
  const archiveKind = status.length > 0 ? "dirty-worktree" : "clean-diverged-branch";
  const totalReviewedProtectedOverlayPaths = indexScan.reviewedProtected + indexHistoricalScan.reviewedProtected
    + worktreeScan.reviewedProtected + worktreeHistoricalScan.reviewedProtected
    + trackedScan.reviewedProtected + trackedHistoricalScan.reviewedProtected
    + reviewedProtectedOverlayPaths;
  const currentStateBasis = {
    branch: worktree.branch,
    archiveKind,
    head: worktree.head,
    baseHead,
    divergence,
    statusEntries: status.length,
    untrackedEntries: untracked.length,
    transactionMetadataExclusions,
    statusInventorySha256: sha256Buffer(statusBuffer),
    indexInventorySha256: sha256Buffer(indexInventory),
    trackedPatchSha256: sha256Buffer(trackedPatch),
    indexPatchSha256: sha256Buffer(indexPatch),
    worktreePatchSha256: sha256Buffer(worktreePatch),
    branchPatchSha256: branchPatch ? sha256Buffer(branchPatch) : null,
    untrackedPaths0Sha256: sha256Buffer(untrackedPaths0),
    untrackedInventorySha256: sha256Buffer(inventoryBuffer),
    reviewedProtectedOverlayPaths: totalReviewedProtectedOverlayPaths
  };
  return {
    ...currentStateBasis,
    currentStateFingerprint: fingerprint(currentStateBasis),
    secretScanner: {
      status: "passed",
      scannedPaths: new Set([
        ...trackedPaths.currentPaths,
        ...trackedPaths.historicalPaths,
        ...indexPaths.currentPaths,
        ...indexPaths.historicalPaths,
        ...worktreePaths.currentPaths,
        ...worktreePaths.historicalPaths,
        ...branchPaths.currentPaths,
        ...branchPaths.historicalPaths,
        ...untracked
      ]).size,
      reviewedBinaryPaths: indexScan.reviewed + indexHistoricalScan.reviewed
        + worktreeScan.reviewed + worktreeHistoricalScan.reviewed
        + trackedScan.reviewed + trackedHistoricalScan.reviewed
        + branchScan.reviewed + branchHistoricalScan.reviewed + reviewedBinaryPaths,
      reviewedProtectedOverlayPaths: totalReviewedProtectedOverlayPaths
    },
    buffers: {
      statusInventory: statusBuffer,
      indexInventory,
      trackedPatch,
      indexPatch,
      worktreePatch,
      branchPatch,
      untrackedPaths0,
      untrackedInventory: inventoryBuffer,
      untrackedTar: tar?.buffer ?? null
    },
    inventory,
    cleanup: () => tar?.cleanup()
  };
}

function artifactDescriptor(buffer) {
  return buffer === null ? null : { bytes: buffer.length, sha256: sha256Buffer(buffer) };
}

function archiveEntryLabel(entry) {
  return typeof entry?.branch === "string" && entry.branch.length > 0 ? entry.branch : "v2 archive entry";
}

function isGitObjectId(value) {
  return typeof value === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value);
}

function isNonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

const MARKDOWN_MANIFEST_CONFIG = Object.freeze({
  linked: Object.freeze({
    title: "2026-06-30 A25 Linked Worktree Archive Manifest",
    entriesKey: "archivedWorktrees"
  }),
  clean: Object.freeze({
    title: "2026-06-30 A25 Clean-Diverged Branch Archive Manifest",
    entriesKey: "archivedBranches"
  }),
  dirty: Object.freeze({
    title: "2026-06-30 A25 Dirty-Diverged Branch Archive Manifest",
    entriesKey: "archivedBranches"
  })
});

export function renderArchiveManifestMarkdown(kind, manifest) {
  const config = MARKDOWN_MANIFEST_CONFIG[kind];
  if (!config) throw new Error(`unknown archive manifest Markdown kind: ${kind}`);
  const entries = manifest?.[config.entriesKey];
  if (!Array.isArray(entries)) throw new Error(`${kind} archive manifest entries are missing`);
  const rows = entries.map((entry) => `| \`${entry.branch}\` | ${entry.archiveKind} | ${entry.statusEntries} | ${entry.untrackedEntries} | ${entry.divergence.behind} | ${entry.divergence.ahead} | \`${entry.currentStateFingerprint}\` |`).join("\n");
  return `# ${config.title}

Schema: v${manifest.schemaVersion}

Generated: ${manifest.generatedAt}

Dirty map signature: \`${manifest.dirtyMapStatusSignature}\`

Archive set fingerprint: \`${manifest.archiveSetFingerprint}\`

Binary evidence is stored outside Git. Artifact locations in the JSON manifest are relative to the marker-bound evidence root; no local absolute path is retained here.

| Branch | Kind | Status | Untracked | Behind | Ahead | Current-state fingerprint |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${rows || "| none | none | 0 | 0 | 0 | 0 | none |"}
`;
}

export function verifyArchiveCompanionManifestSchema(companion, { linked, kind }, failures = []) {
  const start = failures.length;
  const label = kind === "clean" ? "clean-diverged companion" : kind === "dirty" ? "dirty-diverged companion" : "companion";
  const keys = [
    "archiveSetFingerprint",
    "archivedBranches",
    "dirtyMapStatusSignature",
    "evidenceRootId",
    "expandedStatusEntries",
    "generatedAt",
    "schemaVersion"
  ];
  if (!exactKeys(companion, keys)) {
    failures.push(`${label} manifest fields are invalid`);
    return false;
  }
  if (kind !== "clean" && kind !== "dirty") {
    failures.push("companion manifest kind is invalid");
    return false;
  }
  for (const key of [
    "schemaVersion",
    "generatedAt",
    "evidenceRootId",
    "archiveSetFingerprint",
    "dirtyMapStatusSignature",
    "expandedStatusEntries"
  ]) {
    if (companion[key] !== linked?.[key]) failures.push(`${label} manifest ${key} does not match the linked projection`);
  }
  if (!Array.isArray(companion.archivedBranches) || !Array.isArray(linked?.archivedWorktrees)) {
    failures.push(`${label} manifest entries are invalid`);
    return false;
  }
  const expected = linked.archivedWorktrees.filter((entry) => kind === "clean"
    ? entry.archiveKind === "clean-diverged-branch"
    : entry.archiveKind === "dirty-worktree" && (entry.divergence.behind > 0 || entry.divergence.ahead > 0));
  if (stableJson(companion.archivedBranches) !== stableJson(expected)) {
    failures.push(`${label} manifest entries do not match the linked canonical projection`);
  }
  return failures.length === start;
}

export function verifyArchiveEntrySchema(entry, { archiveSetFingerprint, expectedBuffers } = {}, failures = []) {
  const start = failures.length;
  const label = archiveEntryLabel(entry);
  if (!exactKeys(entry, ARCHIVE_ENTRY_KEYS)) {
    failures.push(`${label}: archive entry fields are invalid`);
    return false;
  }
  if (!READABLE_EVIDENCE_SCHEMA_VERSIONS.has(entry.schemaVersion)) {
    failures.push(`${label}: entry schema is stale`);
  }
  if (typeof entry.branch !== "string" || entry.branch.length === 0) failures.push(`${label}: branch is invalid`);
  if (!isGitObjectId(entry.head) || !isGitObjectId(entry.baseHead)) failures.push(`${label}: Git object identity is invalid`);
  if (!exactKeys(entry.divergence, ["ahead", "behind"])
    || !isNonnegativeInteger(entry.divergence.behind)
    || !isNonnegativeInteger(entry.divergence.ahead)) {
    failures.push(`${label}: divergence fields are invalid`);
  }
  if (!isNonnegativeInteger(entry.statusEntries) || !isNonnegativeInteger(entry.untrackedEntries)) {
    failures.push(`${label}: status counters are invalid`);
  }
  try {
    const normalizedExclusions = normalizeTransactionMetadataExclusions(entry.transactionMetadataExclusions);
    if (stableJson(normalizedExclusions) !== stableJson(entry.transactionMetadataExclusions)) {
      failures.push(`${label}: transaction metadata exclusions are not canonical`);
    }
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
  const diverged = isNonnegativeInteger(entry.divergence?.behind)
    && isNonnegativeInteger(entry.divergence?.ahead)
    && entry.divergence.behind + entry.divergence.ahead > 0;
  if (entry.archiveKind !== "dirty-worktree" && entry.archiveKind !== "clean-diverged-branch") {
    failures.push(`${label}: archive kind is invalid`);
  } else if (entry.archiveKind === "dirty-worktree" && entry.statusEntries === 0) {
    failures.push(`${label}: dirty archive kind requires status entries`);
  } else if (entry.archiveKind === "clean-diverged-branch" && (entry.statusEntries !== 0 || !diverged)) {
    failures.push(`${label}: clean-diverged archive kind is inconsistent`);
  }
  if (typeof entry.currentStateFingerprint !== "string" || !SHA256_PATTERN.test(entry.currentStateFingerprint)) {
    failures.push(`${label}: current-state fingerprint is invalid`);
  }
  if (typeof entry.archiveSetFingerprint !== "string" || !SHA256_PATTERN.test(entry.archiveSetFingerprint)) {
    failures.push(`${label}: archive-set fingerprint is invalid`);
  }
  if (archiveSetFingerprint !== undefined && entry.archiveSetFingerprint !== archiveSetFingerprint) {
    failures.push(`${label}: archive-set fingerprint is stale`);
  }
  const secretScannerKeys = entry.schemaVersion === LEGACY_EVIDENCE_SCHEMA_VERSION
    ? ["reviewedBinaryPaths", "scannedPaths", "status"]
    : ["reviewedBinaryPaths", "reviewedProtectedOverlayPaths", "scannedPaths", "status"];
  if (!exactKeys(entry.secretScanner, secretScannerKeys)
    || entry.secretScanner.status !== "passed"
    || !isNonnegativeInteger(entry.secretScanner.scannedPaths)
    || !isNonnegativeInteger(entry.secretScanner.reviewedBinaryPaths)
    || (entry.schemaVersion !== LEGACY_EVIDENCE_SCHEMA_VERSION
      && !isNonnegativeInteger(entry.secretScanner.reviewedProtectedOverlayPaths))) {
    failures.push(`${label}: secret scanner fields are invalid`);
  }
  if (!exactKeys(entry.artifacts, ARCHIVE_ARTIFACT_KEYS)) {
    failures.push(`${label}: required artifact keys are invalid`);
    return false;
  }
  if (expectedBuffers !== undefined && !exactKeys(expectedBuffers, ARCHIVE_ARTIFACT_KEYS)) {
    failures.push(`${label}: current snapshot artifact buffer keys are invalid`);
    return false;
  }
  const entryId = typeof entry.branch === "string" && isGitObjectId(entry.head)
    ? fingerprint({ branch: entry.branch, head: entry.head }).slice(0, 24)
    : null;
  for (const key of ARCHIVE_ARTIFACT_KEYS) {
    const artifact = entry.artifacts[key];
    const requiredByState = key === "branchPatch"
      ? diverged
      : key === "untrackedTar"
        ? entry.untrackedEntries > 0
        : true;
    const expectedBuffer = expectedBuffers === undefined ? undefined : expectedBuffers[key];
    const required = expectedBuffers === undefined ? requiredByState : expectedBuffer !== null;
    if (!required) {
      if (artifact !== null) failures.push(`${label}:${key}: artifact must be null for the current state`);
      continue;
    }
    if (!exactKeys(artifact, ARTIFACT_DESCRIPTOR_KEYS)) {
      failures.push(`${label}:${key}: required artifact descriptor fields are invalid`);
      continue;
    }
    if (typeof artifact.path !== "string"
      || !isNonnegativeInteger(artifact.bytes)
      || typeof artifact.sha256 !== "string"
      || !SHA256_PATTERN.test(artifact.sha256)) {
      failures.push(`${label}:${key}: artifact descriptor values are invalid`);
      continue;
    }
    if (entryId && SHA256_PATTERN.test(entry.archiveSetFingerprint)) {
      const expectedPath = path.posix.join("sets", entry.archiveSetFingerprint, entryId, ARCHIVE_ARTIFACT_NAMES[key]);
      if (artifact.path !== expectedPath) failures.push(`${label}:${key}: artifact descriptor path is not canonical`);
    }
    if (expectedBuffers !== undefined) {
      if (!Buffer.isBuffer(expectedBuffer)) {
        failures.push(`${label}:${key}: current snapshot buffer contract is invalid`);
      } else if (artifact.bytes !== expectedBuffer.length || artifact.sha256 !== sha256Buffer(expectedBuffer)) {
        failures.push(`${label}:${key}: artifact descriptor does not match the current snapshot buffer`);
      }
    }
  }
  return failures.length === start;
}

export function verifyArchiveSetSchema(manifest, index, failures = []) {
  const start = failures.length;
  const manifestKeys = [
    "archiveSetFingerprint",
    "archivedWorktrees",
    "dirtyMapStatusSignature",
    "evidenceRootId",
    "expandedStatusEntries",
    "generatedAt",
    "schemaVersion"
  ];
  if (!exactKeys(manifest, manifestKeys)) {
    failures.push("linked manifest fields are invalid");
    return false;
  }
  if (!READABLE_EVIDENCE_SCHEMA_VERSIONS.has(manifest.schemaVersion)) {
    failures.push("linked manifest schema is stale");
  }
  if (typeof manifest.generatedAt !== "string" || !Number.isFinite(Date.parse(manifest.generatedAt))) failures.push("linked manifest timestamp is invalid");
  if (typeof manifest.evidenceRootId !== "string" || !UUID_PATTERN.test(manifest.evidenceRootId)) failures.push("linked manifest evidence root ID is invalid");
  if (typeof manifest.archiveSetFingerprint !== "string" || !SHA256_PATTERN.test(manifest.archiveSetFingerprint)) failures.push("linked manifest archive-set fingerprint is invalid");
  if (typeof manifest.dirtyMapStatusSignature !== "string" || manifest.dirtyMapStatusSignature.length === 0) failures.push("linked manifest dirty-map signature is invalid");
  if (!isNonnegativeInteger(manifest.expandedStatusEntries)) failures.push("linked manifest expanded status count is invalid");
  if (!Array.isArray(manifest.archivedWorktrees)) {
    failures.push("linked manifest archived worktrees are invalid");
    return false;
  }
  for (const entry of manifest.archivedWorktrees) {
    verifyArchiveEntrySchema(entry, { archiveSetFingerprint: manifest.archiveSetFingerprint }, failures);
    if (entry?.schemaVersion !== manifest.schemaVersion) {
      failures.push(`${archiveEntryLabel(entry)}: entry schema does not match its linked manifest`);
    }
  }
  const branches = manifest.archivedWorktrees.map((entry) => entry?.branch);
  if (stableJson(branches) !== stableJson([...branches].sort((left, right) => String(left).localeCompare(String(right))))
    || new Set(branches).size !== branches.length) {
    failures.push("linked manifest branch entries must be unique and sorted");
  }
  if (!exactKeys(index, ["archiveSetFingerprint", "basis", "entries", "evidenceRootId", "schemaVersion"])) {
    failures.push("archive-set index fields are invalid");
    return false;
  }
  if (index.schemaVersion !== manifest.schemaVersion
    || index.evidenceRootId !== manifest.evidenceRootId
    || index.archiveSetFingerprint !== manifest.archiveSetFingerprint
    || stableJson(index.entries) !== stableJson(manifest.archivedWorktrees)) {
    failures.push("archive-set index does not match the repository manifest");
  }
  if (!exactKeys(index.basis, ["dirtyMapStatusSignature", "entries", "expandedStatusEntries", "schemaVersion"])) {
    failures.push("archive-set basis fields are invalid");
  } else {
    const expectedBasis = {
      schemaVersion: manifest.schemaVersion,
      dirtyMapStatusSignature: manifest.dirtyMapStatusSignature,
      expandedStatusEntries: manifest.expandedStatusEntries,
      entries: manifest.archivedWorktrees.map((entry) => entry.currentStateFingerprint).sort()
    };
    if (stableJson(index.basis) !== stableJson(expectedBasis)) failures.push("archive-set basis does not match the repository manifest");
    if (fingerprint(index.basis) !== manifest.archiveSetFingerprint) failures.push("archive-set fingerprint does not match its canonical basis");
  }
  return failures.length === start;
}

function verifyImmutableFile(absolutePath, buffer, label) {
  if (!fs.existsSync(absolutePath) || fs.lstatSync(absolutePath).isSymbolicLink() || !fs.lstatSync(absolutePath).isFile()) {
    throw new Error(`${label} is missing or unsafe`);
  }
  const observed = fs.readFileSync(absolutePath);
  if (!observed.equals(buffer) || (fs.statSync(absolutePath).mode & 0o777) !== 0o600) throw new Error(`${label} immutable content mismatch`);
}

function createImmutableFile(absolutePath, buffer, label) {
  if (fs.existsSync(absolutePath)) {
    verifyImmutableFile(absolutePath, buffer, label);
    return;
  }
  const temporaryPath = `${absolutePath}.tmp-${process.pid}-${crypto.randomUUID()}`;
  writePrivateAndSync(temporaryPath, buffer);
  try {
    try {
      fs.linkSync(temporaryPath, absolutePath);
      fsyncDirectory(path.dirname(absolutePath));
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
  verifyImmutableFile(absolutePath, buffer, label);
}

function writeBlob(evidenceRoot, buffer) {
  const sha = sha256Buffer(buffer);
  const blobPath = path.join(evidenceRoot, "blobs", "sha256", sha.slice(0, 2), sha);
  assertManagedPath(evidenceRoot, blobPath);
  mkdirPrivate(path.dirname(blobPath));
  assertManagedPath(evidenceRoot, blobPath);
  createImmutableFile(blobPath, buffer, "content-addressed evidence blob");
  return blobPath;
}

export function materializeArchiveSet({ evidenceRoot, marker, dirtyMap, snapshots }) {
  const basis = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    entries: snapshots.map((snapshot) => snapshot.currentStateFingerprint).sort()
  };
  const archiveSetFingerprint = fingerprint(basis);
  const artifactPlans = [];
  const entries = snapshots.map((snapshot) => {
    const entryId = fingerprint({ branch: snapshot.branch, head: snapshot.head }).slice(0, 24);
    const artifacts = {};
    for (const [key, name] of Object.entries(ARCHIVE_ARTIFACT_NAMES)) {
      const buffer = snapshot.buffers[key];
      if (buffer === null) {
        artifacts[key] = null;
        continue;
      }
      const relativePath = path.posix.join("sets", archiveSetFingerprint, entryId, name);
      const descriptor = { path: relativePath, ...artifactDescriptor(buffer) };
      artifacts[key] = descriptor;
      artifactPlans.push({ buffer, blobPath: writeBlob(evidenceRoot, buffer), descriptor });
    }
    return {
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      branch: snapshot.branch,
      archiveKind: snapshot.archiveKind,
      head: snapshot.head,
      baseHead: snapshot.baseHead,
      divergence: snapshot.divergence,
      statusEntries: snapshot.statusEntries,
      untrackedEntries: snapshot.untrackedEntries,
      transactionMetadataExclusions: snapshot.transactionMetadataExclusions,
      currentStateFingerprint: snapshot.currentStateFingerprint,
      archiveSetFingerprint,
      secretScanner: snapshot.secretScanner,
      artifacts
    };
  }).sort((left, right) => left.branch.localeCompare(right.branch));
  const setDirectory = path.join(evidenceRoot, "sets", archiveSetFingerprint);
  const indexPath = path.join(setDirectory, "archive-set.json");
  const index = { schemaVersion: EVIDENCE_SCHEMA_VERSION, evidenceRootId: marker.rootId, archiveSetFingerprint, basis, entries };
  const indexBuffer = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  const setPrefix = `sets/${archiveSetFingerprint}/`;
  const expectedSetFiles = ["archive-set.json", ...artifactPlans.map((plan) => plan.descriptor.path.slice(setPrefix.length))].sort();
  const verifyExistingSet = () => {
    if (!fs.existsSync(setDirectory) || fs.lstatSync(setDirectory).isSymbolicLink() || !fs.lstatSync(setDirectory).isDirectory()) {
      throw new Error("immutable archive set is missing or unsafe");
    }
    const actualFiles = walkFiles(setDirectory);
    if (stableJson(actualFiles) !== stableJson(expectedSetFiles)) throw new Error("immutable archive set file inventory mismatch");
    verifyImmutableFile(indexPath, indexBuffer, "immutable archive-set index");
    for (const plan of artifactPlans) {
      const destination = artifactAbsolutePath(evidenceRoot, plan.descriptor.path);
      verifyImmutableFile(destination, plan.buffer, "immutable archive-set artifact");
      const artifactStat = fs.statSync(destination);
      const blobStat = fs.statSync(plan.blobPath);
      if (artifactStat.dev !== blobStat.dev || artifactStat.ino !== blobStat.ino || artifactStat.nlink < 2) {
        throw new Error("immutable archive-set artifact is not linked to its content-addressed blob");
      }
    }
  };
  assertManagedPath(evidenceRoot, setDirectory);
  const setsDirectory = path.dirname(setDirectory);
  mkdirPrivate(setsDirectory);
  if (fs.existsSync(setDirectory)) {
    verifyExistingSet();
    return { archiveSetFingerprint, entries };
  }
  const temporarySet = path.join(setsDirectory, `.${archiveSetFingerprint}.tmp-${process.pid}-${crypto.randomUUID()}`);
  mkdirPrivate(temporarySet);
  try {
    const syncedDirectories = new Set([temporarySet]);
    for (const plan of artifactPlans) {
      const suffix = plan.descriptor.path.slice(setPrefix.length);
      const destination = path.join(temporarySet, ...suffix.split("/"));
      mkdirPrivate(path.dirname(destination));
      syncedDirectories.add(path.dirname(destination));
      fs.linkSync(plan.blobPath, destination);
    }
    writePrivateAndSync(path.join(temporarySet, "archive-set.json"), indexBuffer);
    for (const directory of [...syncedDirectories].sort((left, right) => right.length - left.length)) fsyncDirectory(directory);
    if (fs.existsSync(setDirectory)) {
      verifyExistingSet();
      return { archiveSetFingerprint, entries };
    }
    fs.renameSync(temporarySet, setDirectory);
    fsyncDirectory(setsDirectory);
  } finally {
    fs.rmSync(temporarySet, { recursive: true, force: true });
  }
  verifyExistingSet();
  return { archiveSetFingerprint, entries };
}

export function repositoryIdentity(commonDir) {
  return fingerprint({ gitCommonDir: fs.realpathSync(commonDir) });
}

export function listWorktrees(repoRoot) {
  const raw = gitBuffer(["worktree", "list", "--porcelain", "-z"], repoRoot);
  const fields = [];
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== 0) continue;
    fields.push(raw.subarray(start, index).toString("utf8"));
    start = index + 1;
  }
  if (start !== raw.length) throw new Error("NUL-delimited worktree inventory is missing its final delimiter");
  const blocks = [];
  let block = [];
  for (const field of fields) {
    if (field === "") {
      if (block.length > 0) blocks.push(block);
      block = [];
    } else {
      block.push(field);
    }
  }
  if (block.length > 0) blocks.push(block);
  return blocks.map((blockFields) => {
    const entry = { path: "", branch: "", head: "", detached: false, prunable: false };
    for (const line of blockFields) {
      if (line.startsWith("worktree ")) entry.path = line.slice(9);
      else if (line.startsWith("HEAD ")) entry.head = line.slice(5);
      else if (line.startsWith("branch refs/heads/")) entry.branch = line.slice(18);
      else if (line === "detached") entry.detached = true;
      else if (line.startsWith("prunable")) entry.prunable = true;
    }
    if (!entry.branch && entry.detached) entry.branch = "(detached)";
    return entry;
  });
}

function worktreeInventoryFingerprint(worktrees) {
  return fingerprint(worktrees.map((entry) => ({
    branch: entry.branch,
    detached: entry.detached,
    head: entry.head,
    path: entry.path,
    prunable: entry.prunable
  })).sort((left, right) => left.path.localeCompare(right.path)));
}

export function bootstrapMutationEpochMonitor({
  repoRoot,
  commonDir,
  transactionMetadata
}) {
  const watchModeOverride = process.env.MAIS_EVIDENCE_MUTATION_MONITOR_MODE;
  const watchMode = watchModeOverride === undefined ? "auto" : watchModeOverride;
  if (watchModeOverride !== undefined && watchModeOverride !== "descriptor-sentinel") {
    throw new Error("MAIS_EVIDENCE_MUTATION_MONITOR_MODE must be descriptor-sentinel when defined");
  }
  const canonicalCommonDir = fs.realpathSync(commonDir);
  const commonMonitor = startMutationEpochMonitor([canonicalCommonDir], {
    trustedGitCommonDir: canonicalCommonDir,
    watchMode
  });
  let expandedMonitor;
  try {
    const commonEpoch = settleMutationEpoch(commonMonitor);
    const firstInventory = listWorktrees(repoRoot);
    const watchedRoots = [
      canonicalCommonDir,
      fs.realpathSync(repoRoot),
      ...firstInventory
        .filter((entry) => entry.branch !== "main" && entry.path && !entry.prunable && fs.existsSync(entry.path))
        .map((entry) => entry.path)
    ];
    const watchedCanonicalRoots = new Set(watchedRoots.map((item) => fs.realpathSync(item)));
    const requestedPolicies = transactionMetadata === undefined
      ? []
      : Array.isArray(transactionMetadata)
        ? transactionMetadata
        : [transactionMetadata];
    const activeTransactionMetadata = requestedPolicies.filter((policy) => (
      policy?.root && watchedCanonicalRoots.has(fs.realpathSync(policy.root))
    ));
    expandedMonitor = startMutationEpochMonitor(watchedRoots, {
      transactionMetadata: activeTransactionMetadata.length > 0 ? activeTransactionMetadata : undefined,
      trustedGitCommonDir: canonicalCommonDir,
      watchMode
    });
    const secondInventory = listWorktrees(repoRoot);
    const commonFinalEpoch = settleMutationEpoch(commonMonitor);
    if (commonFinalEpoch !== commonEpoch
      || worktreeInventoryFingerprint(secondInventory) !== worktreeInventoryFingerprint(firstInventory)) {
      throw new Error("mutation monitor bootstrap detected worktree inventory drift");
    }
    stopMutationEpochMonitor(commonMonitor, { expectedEpoch: commonEpoch });
    const baselineEpoch = settleMutationEpoch(expandedMonitor);
    return { allWorktrees: secondInventory, baselineEpoch, monitor: expandedMonitor };
  } catch (error) {
    abortMutationEpochMonitor(commonMonitor);
    abortMutationEpochMonitor(expandedMonitor);
    throw error;
  }
}

export function artifactAbsolutePath(evidenceRoot, relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.split("/").includes("..")) throw new Error("unsafe external artifact path");
  const absolutePath = path.join(evidenceRoot, ...relativePath.split("/"));
  if (!isWithin(absolutePath, evidenceRoot)) throw new Error("external artifact path escapes evidence root");
  assertManagedPath(evidenceRoot, absolutePath);
  return absolutePath;
}

function openRegularFileNoFollow(absolutePath) {
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      absolutePath,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
    );
    const held = fs.fstatSync(descriptor, { bigint: true });
    const visible = fs.lstatSync(absolutePath, { bigint: true });
    const final = fs.fstatSync(descriptor, { bigint: true });
    if (!held.isFile()
      || visible.isSymbolicLink()
      || !visible.isFile()
      || !final.isFile()
      || !sameTypedFseventsFrameSnapshot(held, visible)
      || !sameTypedFseventsFrameSnapshot(visible, final)) {
      throw new Error("not one direct stable regular file");
    }
    const result = { absolutePath, descriptor, openingStatus: final };
    descriptor = -1;
    return result;
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
  }
}

function assertHeldRegularFileNoFollow(held, {
  expectedBytes = null,
  maxBytes = ARCHIVE_ARTIFACT_MAX_BYTES
} = {}) {
  if ((expectedBytes !== null && (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0))
    || !Number.isSafeInteger(maxBytes)
    || maxBytes < 0) {
    throw new Error("regular file bounds are invalid");
  }
  const heldStatus = fs.fstatSync(held.descriptor, { bigint: true });
  const visible = fs.lstatSync(held.absolutePath, { bigint: true });
  const final = fs.fstatSync(held.descriptor, { bigint: true });
  if (!heldStatus.isFile()
    || visible.isSymbolicLink()
    || !visible.isFile()
    || !final.isFile()
    || !sameTypedFseventsFrameSnapshot(held.openingStatus, heldStatus)
    || !sameTypedFseventsFrameSnapshot(heldStatus, visible)
    || !sameTypedFseventsFrameSnapshot(visible, final)) {
    throw new Error("regular file path binding changed during verification");
  }
  if (expectedBytes !== null && final.size !== BigInt(expectedBytes)) {
    throw new Error("regular file bytes mismatch before reading");
  }
  if (final.size > BigInt(maxBytes)) {
    throw new Error(`regular file exceeds the ${maxBytes}-byte materialization cap`);
  }
  return final;
}

function observeHeldRegularFileNoFollow(held, {
  captureBuffer = false,
  expectedBytes = null,
  maxBytes = ARCHIVE_ARTIFACT_MAX_BYTES
} = {}) {
  const before = assertHeldRegularFileNoFollow(held, { expectedBytes, maxBytes });
  if (captureBuffer && before.size > BigInt(bufferConstants.MAX_LENGTH)) {
    throw new Error("regular file exceeds the Buffer materialization cap");
  }
  const fileBytes = Number(before.size);
  const output = captureBuffer ? Buffer.allocUnsafe(fileBytes) : null;
  const chunk = captureBuffer ? output : Buffer.allocUnsafe(FILE_HASH_CHUNK_BYTES);
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  while (bytes < fileBytes) {
    const offset = captureBuffer ? bytes : 0;
    const read = fs.readSync(
      held.descriptor,
      chunk,
      offset,
      Math.min(captureBuffer ? fileBytes - bytes : chunk.length, fileBytes - bytes),
      bytes
    );
    if (read === 0) throw new Error("regular file ended before its recorded size");
    hash.update(chunk.subarray(offset, offset + read));
    bytes += read;
  }
  const final = assertHeldRegularFileNoFollow(held, { expectedBytes, maxBytes });
  if (!sameTypedFseventsFrameSnapshot(before, final)) {
    throw new Error("regular file changed during held verification");
  }
  return {
    buffer: output,
    bytes,
    sha256: hash.digest("hex"),
    status: final
  };
}

export function verifyArtifact(evidenceRoot, artifact, label, failures, {
  maxBytes = ARCHIVE_ARTIFACT_MAX_BYTES
} = {}) {
  if (!artifact) return true;
  let absolutePath;
  try {
    absolutePath = artifactAbsolutePath(evidenceRoot, artifact.path);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    return false;
  }
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${label}: missing external artifact`);
    return false;
  }
  if (fs.lstatSync(absolutePath).isSymbolicLink()) {
    failures.push(`${label}: artifact must not be a symlink`);
    return false;
  }
  const blobPath = path.join(evidenceRoot, "blobs", "sha256", artifact.sha256.slice(0, 2), artifact.sha256);
  let artifactHeld = null;
  let blobHeld = null;
  try {
    assertManagedPath(evidenceRoot, blobPath);
    artifactHeld = openRegularFileNoFollow(absolutePath);
    const artifactEvidence = observeHeldRegularFileNoFollow(artifactHeld, {
      expectedBytes: artifact.bytes,
      maxBytes
    });
    if (artifactEvidence.sha256 !== artifact.sha256) {
      failures.push(`${label}: artifact sha256 mismatch`);
      return false;
    }
    blobHeld = openRegularFileNoFollow(blobPath);
    const blobEvidence = observeHeldRegularFileNoFollow(blobHeld, {
      expectedBytes: artifact.bytes,
      maxBytes
    });
    if (blobEvidence.sha256 !== artifact.sha256) {
      failures.push(`${label}: content-addressed blob mismatch`);
      return false;
    }
    if (artifactEvidence.status.dev !== blobEvidence.status.dev
      || artifactEvidence.status.ino !== blobEvidence.status.ino
      || artifactEvidence.status.nlink < 2n
      || blobEvidence.status.nlink < 2n) {
      failures.push(`${label}: artifact is not a reused content-addressed hardlink`);
      return false;
    }
    const finalArtifactStatus = assertHeldRegularFileNoFollow(artifactHeld, {
      expectedBytes: artifact.bytes,
      maxBytes
    });
    const finalBlobStatus = assertHeldRegularFileNoFollow(blobHeld, {
      expectedBytes: artifact.bytes,
      maxBytes
    });
    if (finalArtifactStatus.dev !== finalBlobStatus.dev
      || finalArtifactStatus.ino !== finalBlobStatus.ino
      || finalArtifactStatus.nlink < 2n
      || finalBlobStatus.nlink < 2n) {
      failures.push(`${label}: content-addressed hardlink changed during verification`);
      return false;
    }
    return true;
  } catch (error) {
    failures.push(`${label}: artifact/content-addressed validation failed (${error.message})`);
    return false;
  } finally {
    for (const held of [blobHeld, artifactHeld]) {
      if (held === null) continue;
      try {
        fs.closeSync(held.descriptor);
      } catch {
        // Descriptor cleanup does not alter the already recorded validation result.
      }
    }
  }
}

function walkFiles(root, prefix = "") {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    const absolutePath = path.join(root, dirent.name);
    if (dirent.isDirectory()) output.push(...walkFiles(absolutePath, relativePath));
    else output.push(relativePath);
  }
  return output.sort();
}

export function verifyArchiveSetLayout(evidenceRoot, manifest, failures) {
  const setRoot = path.join(evidenceRoot, "sets", manifest.archiveSetFingerprint);
  const expected = ["archive-set.json"];
  for (const entry of manifest.archivedWorktrees) {
    for (const artifact of Object.values(entry.artifacts ?? {}).filter(Boolean)) {
      const prefix = `sets/${manifest.archiveSetFingerprint}/`;
      if (!artifact.path.startsWith(prefix)) failures.push(`${entry.branch}: artifact is outside its archive set`);
      else expected.push(artifact.path.slice(prefix.length));
    }
  }
  const actual = walkFiles(setRoot);
  for (const item of expected) if (!actual.includes(item)) failures.push(`archive set missing expected artifact: ${item}`);
  for (const item of actual) if (!expected.includes(item)) failures.push(`archive set has unexpected artifact: ${item}`);
}

function isExactReviewedUntrackedCoordinationReportInventory(item) {
  const reviewed = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  return item !== null
    && typeof item === "object"
    && exactKeys(item, ["mode", "path", "sha256", "size", "type"])
    && item.path === reviewed.path
    && item.type === "file"
    && item.mode === reviewed.mode
    && item.size === reviewed.bytes
    && item.sha256 === reviewed.sha256;
}

function isReviewedProtectedOverlayUntrackedInventory(item) {
  if (item === null
    || typeof item !== "object"
    || !exactKeys(item, ["mode", "path", "sha256", "size", "type"])) {
    return false;
  }
  const policy = REVIEWED_PROTECTED_OVERLAY_UNTRACKED_BY_PATH.get(item.path) ?? null;
  return policy !== null
    && item.type === "file"
    && item.mode === policy.fileMode
    && item.size === policy.bytes
    && item.sha256 === policy.sha256;
}

function isReviewedUntrackedExactInventory(item) {
  return isExactReviewedUntrackedCoordinationReportInventory(item)
    || isReviewedLegacyOfficeLockInventory(item)
    || isReviewedProtectedOverlayUntrackedInventory(item);
}

function tarVerifierTimeoutMs(tarBytes, entryCount) {
  if (!Number.isSafeInteger(tarBytes) || tarBytes < 0
    || !Number.isSafeInteger(entryCount) || entryCount < 0) {
    return CHILD_PROCESS_TIMEOUT_MS;
  }
  const sizeAllowance = Math.ceil(tarBytes / (1024 * 1024)) * 1_000;
  const entryAllowance = Math.ceil(entryCount / 1_000) * 5_000;
  return Math.min(
    TAR_VERIFIER_MAX_TIMEOUT_MS,
    CHILD_PROCESS_TIMEOUT_MS + sizeAllowance + entryAllowance
  );
}

function tarVerifierStderrMetadata(error) {
  const raw = Buffer.isBuffer(error?.stderr)
    ? error.stderr
    : typeof error?.stderr === "string"
      ? Buffer.from(error.stderr)
      : Buffer.alloc(0);
  return `stderrBytes=${raw.length}, stderrSha256=${sha256Buffer(raw)}`;
}

function tarVerifierField(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/u.test(value) ? value : "none";
}

function tarVerifierDiagnostic(error) {
  const status = Number.isInteger(error?.status) ? String(error.status) : "none";
  const signal = tarVerifierField(error?.signal);
  const code = tarVerifierField(error?.code);
  return `status=${status}, signal=${signal}, code=${code}, ${tarVerifierStderrMetadata(error)}`;
}

function tarPayloadVerifierFailure(error) {
  const raw = Buffer.isBuffer(error?.stderr)
    ? error.stderr.toString("utf8")
    : typeof error?.stderr === "string"
      ? error.stderr
      : "";
  return error?.status === TAR_PAYLOAD_ERROR_STATUS && raw.trim() === TAR_PAYLOAD_ERROR_SENTINEL;
}

function verifyTarPayloadSource({ buffer = null, tarDescriptor = null, tarBytes }, expected, label, failures) {
  const reviewedProtectedOverlayPaths = new Set(
    expected.filter(isReviewedProtectedOverlayUntrackedInventory).map((item) => item.path)
  );
  try {
    for (const item of expected) {
      if (!isReviewedUntrackedExactInventory(item)) scanArchivePath(item.path);
      if (item.type === "symlink") {
        if (path.isAbsolute(item.target)) throw new Error("absolute symlink target");
        const normalizedTarget = path.posix.normalize(path.posix.join(path.posix.dirname(item.path), item.target));
        if (normalizedTarget === ".." || normalizedTarget.startsWith("../")) throw new Error("symlink target escapes archive root");
      }
    }
  } catch (error) {
    failures.push(`${label}: invalid untracked inventory (${error.message})`);
    return;
  }
  const descriptorSource = Number.isInteger(tarDescriptor) && tarDescriptor >= 0;
  const bufferSource = Buffer.isBuffer(buffer);
  if (descriptorSource === bufferSource) {
    failures.push(`${label}: tar verifier source configuration is invalid`);
    return;
  }
  const timeout = tarVerifierTimeoutMs(tarBytes, expected.length);
  const descriptorPath = "/dev/fd/4";
  const listingSource = descriptorSource
    ? [
      "source_fd=int(sys.argv[1].rsplit('/',1)[-1])",
      "os.lseek(source_fd,0,os.SEEK_SET)",
      "source=os.fdopen(os.dup(source_fd),'rb')"
    ]
    : ["source=io.BytesIO(sys.stdin.buffer.read())"];
  let members;
  try {
    const listingScript = [
      "import base64,gzip,io,json,os,sys,tarfile,zlib",
      ...listingSource,
      "try:",
      " with source:",
      "  with tarfile.open(fileobj=source, mode='r:gz') as archive:",
      "   members=[{'name':base64.b64encode(os.fsencode(m.name)).decode('ascii'),'link':base64.b64encode(os.fsencode(m.linkname or '')).decode('ascii'),'type':('file' if m.isfile() else 'symlink' if m.issym() else 'hardlink' if m.islnk() else 'dir' if m.isdir() else 'other'),'mode':m.mode,'size':m.size} for m in archive.getmembers()]",
      " print(json.dumps(members))",
      "except (tarfile.TarError, EOFError, gzip.BadGzipFile, zlib.error):",
      ` sys.stderr.write('${TAR_PAYLOAD_ERROR_SENTINEL}\\n')`,
      ` sys.exit(${TAR_PAYLOAD_ERROR_STATUS})`
    ].join("\n");
    members = JSON.parse(execFileSync(
      "python3",
      ["-c", listingScript, ...(descriptorSource ? [descriptorPath] : [])],
      descriptorSource
        ? {
          encoding: "utf8",
          maxBuffer: 512 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe", "ignore", tarDescriptor],
          timeout
        }
        : { input: buffer, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout }
    ));
  } catch (error) {
    failures.push(tarPayloadVerifierFailure(error)
      ? `${label}: gzip/tar archive is unreadable`
      : `${label}: tar listing verifier infrastructure failure (${tarVerifierDiagnostic(error)})`);
    return;
  }
  const expectedByPath = new Map(expected.map((item) => [item.path, item]));
  let safeToExtract = true;
  const seen = new Set();
  for (const member of members) {
    const memberPath = Buffer.from(member.name, "base64").toString("utf8");
    const linkTarget = Buffer.from(member.link, "base64").toString("utf8");
    try {
      const expectedItem = expectedByPath.get(memberPath);
      if (!isReviewedUntrackedExactInventory(expectedItem)) scanArchivePath(memberPath);
      if (member.type !== "file" && member.type !== "symlink" && member.type !== "hardlink") throw new Error("unsupported tar member type");
      if (member.type === "symlink" || member.type === "hardlink") {
        if (path.isAbsolute(linkTarget)) throw new Error("absolute tar symlink target");
        const normalizedTarget = path.posix.normalize(path.posix.join(path.posix.dirname(memberPath), linkTarget));
        if (normalizedTarget === ".." || normalizedTarget.startsWith("../")) throw new Error("tar symlink target escapes archive root");
      }
      if (!expectedItem) throw new Error("unexpected tar member");
      if (seen.has(memberPath)) throw new Error("duplicate tar member");
      seen.add(memberPath);
      const compatibleType = member.type === expectedItem.type || (member.type === "hardlink" && expectedItem.type === "file");
      if (!compatibleType || member.mode !== expectedItem.mode || (member.type === "file" && member.size !== expectedItem.size)) throw new Error("tar member metadata mismatch");
      if (member.type === "symlink" && linkTarget !== expectedItem.target) throw new Error("tar symlink target mismatch");
      if (member.type === "hardlink") {
        const linkedItem = expectedByPath.get(linkTarget);
        if (!linkedItem || linkedItem.type !== "file" || linkedItem.sha256 !== expectedItem.sha256 || linkedItem.size !== expectedItem.size) {
          throw new Error("tar hardlink target mismatch");
        }
      }
    } catch (error) {
      failures.push(`${label}: unsafe tar inventory (${error.message})`);
      safeToExtract = false;
    }
  }
  for (const expectedPath of expectedByPath.keys()) {
    if (!seen.has(expectedPath)) {
      failures.push(`${label}: tar is missing an inventoried path`);
      safeToExtract = false;
    }
  }
  if (!safeToExtract) return;
  const extractRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mais-evidence-verify-"));
  try {
    const extractionSource = descriptorSource
      ? [
        "source_fd=int(sys.argv[1].rsplit('/',1)[-1])",
        "os.lseek(source_fd,0,os.SEEK_SET)",
        "source=os.fdopen(os.dup(source_fd),'rb')",
        "extract_root=sys.argv[2]"
      ]
      : [
        "source=io.BytesIO(sys.stdin.buffer.read())",
        "extract_root=sys.argv[1]"
      ];
    const extractionScript = [
      "import gzip,io,os,sys,tarfile,zlib",
      ...extractionSource,
      "try:",
      " with source:",
      "  with tarfile.open(fileobj=source, mode='r:gz') as archive:",
      "   archive.extractall(extract_root, filter='data')",
      "except (tarfile.TarError, EOFError, gzip.BadGzipFile, zlib.error):",
      ` sys.stderr.write('${TAR_PAYLOAD_ERROR_SENTINEL}\\n')`,
      ` sys.exit(${TAR_PAYLOAD_ERROR_STATUS})`
    ].join("\n");
    execFileSync(
      "python3",
      ["-c", extractionScript, ...(descriptorSource ? [descriptorPath, extractRoot] : [extractRoot])],
      descriptorSource
        ? { stdio: ["ignore", "pipe", "pipe", "ignore", tarDescriptor], timeout }
        : { input: buffer, stdio: ["pipe", "pipe", "pipe"], timeout }
    );
    const actual = buildInventoryInternal(extractRoot, walkFiles(extractRoot), {
      archiveProtectedOverlayPaths: reviewedProtectedOverlayPaths
    });
    if (stableJson(actual.inventory) !== stableJson(expected)) failures.push(`${label}: extracted tar inventory mismatch`);
  } catch (error) {
    if (/reviewed binary magic mismatch/iu.test(error?.message ?? "")) {
      failures.push(`${label}: extracted tar reviewed binary magic mismatch`);
    } else if (tarPayloadVerifierFailure(error)) {
      failures.push(`${label}: gzip/tar archive is unreadable or unsafe`);
    } else {
      failures.push(`${label}: tar extraction verifier infrastructure failure (${tarVerifierDiagnostic(error)})`);
    }
  } finally {
    fs.rmSync(extractRoot, { recursive: true, force: true });
  }
}

export function verifyTarPayload(tarBuffer, expected, label, failures) {
  if (!Buffer.isBuffer(tarBuffer)) {
    failures.push(`${label}: tar payload must be a Buffer`);
    return;
  }
  verifyTarPayloadSource({ buffer: tarBuffer, tarBytes: tarBuffer.length }, expected, label, failures);
}

export function verifyTarInventory(evidenceRoot, entry, failures) {
  const tarArtifact = entry.artifacts?.untrackedTar;
  const inventoryArtifact = entry.artifacts?.untrackedInventory;
  if (!tarArtifact) {
    if (entry.untrackedEntries !== 0) failures.push(`${entry.branch}: missing untracked tar`);
    return;
  }
  if (!inventoryArtifact) {
    failures.push(`${entry.branch}: missing untracked inventory artifact`);
    return;
  }
  let tarPath;
  let inventoryPath;
  let tarBlobPath;
  let inventoryBlobPath;
  try {
    tarPath = artifactAbsolutePath(evidenceRoot, tarArtifact.path);
    inventoryPath = artifactAbsolutePath(evidenceRoot, inventoryArtifact.path);
    tarBlobPath = path.join(
      evidenceRoot,
      "blobs",
      "sha256",
      tarArtifact.sha256.slice(0, 2),
      tarArtifact.sha256
    );
    inventoryBlobPath = path.join(
      evidenceRoot,
      "blobs",
      "sha256",
      inventoryArtifact.sha256.slice(0, 2),
      inventoryArtifact.sha256
    );
    assertManagedPath(evidenceRoot, tarBlobPath);
    assertManagedPath(evidenceRoot, inventoryBlobPath);
  } catch (error) {
    failures.push(`${entry.branch}: archive artifact path validation failed (${error.message})`);
    return;
  }
  const heldFiles = [];
  let tarHeld;
  let tarBlobHeld;
  let inventoryHeld;
  let inventoryBlobHeld;
  try {
    try {
      tarHeld = openRegularFileNoFollow(tarPath);
      heldFiles.push(tarHeld);
      tarBlobHeld = openRegularFileNoFollow(tarBlobPath);
      heldFiles.push(tarBlobHeld);
      inventoryHeld = openRegularFileNoFollow(inventoryPath);
      heldFiles.push(inventoryHeld);
      inventoryBlobHeld = openRegularFileNoFollow(inventoryBlobPath);
      heldFiles.push(inventoryBlobHeld);
    } catch (error) {
      failures.push(`${entry.branch}: archive artifact validation failed (${error.message})`);
      return;
    }
    let tarEvidence;
    let tarBlobEvidence;
    let inventoryEvidence;
    let inventoryBlobEvidence;
    try {
      tarEvidence = observeHeldRegularFileNoFollow(tarHeld, { expectedBytes: tarArtifact.bytes });
      tarBlobEvidence = observeHeldRegularFileNoFollow(tarBlobHeld, { expectedBytes: tarArtifact.bytes });
      inventoryEvidence = observeHeldRegularFileNoFollow(inventoryHeld, {
        captureBuffer: true,
        expectedBytes: inventoryArtifact.bytes,
        maxBytes: ARCHIVE_INVENTORY_MAX_BYTES
      });
      inventoryBlobEvidence = observeHeldRegularFileNoFollow(inventoryBlobHeld, {
        expectedBytes: inventoryArtifact.bytes,
        maxBytes: ARCHIVE_INVENTORY_MAX_BYTES
      });
    } catch (error) {
      failures.push(`${entry.branch}: archive artifact validation failed (${error.message})`);
      return;
    }
    const initialFailureCount = failures.length;
    if (tarEvidence.bytes !== tarArtifact.bytes || tarEvidence.sha256 !== tarArtifact.sha256
      || tarBlobEvidence.bytes !== tarArtifact.bytes || tarBlobEvidence.sha256 !== tarArtifact.sha256) {
      failures.push(`${entry.branch}: tar bytes or sha256 mismatch before verification`);
    }
    if (tarEvidence.status.dev !== tarBlobEvidence.status.dev
      || tarEvidence.status.ino !== tarBlobEvidence.status.ino
      || tarEvidence.status.nlink < 2n
      || tarBlobEvidence.status.nlink < 2n) {
      failures.push(`${entry.branch}: tar artifact is not a reused content-addressed hardlink`);
    }
    if (inventoryEvidence.bytes !== inventoryArtifact.bytes
      || inventoryEvidence.sha256 !== inventoryArtifact.sha256
      || inventoryBlobEvidence.bytes !== inventoryArtifact.bytes
      || inventoryBlobEvidence.sha256 !== inventoryArtifact.sha256) {
      failures.push(`${entry.branch}: inventory bytes or sha256 mismatch before verification`);
    }
    if (inventoryEvidence.status.dev !== inventoryBlobEvidence.status.dev
      || inventoryEvidence.status.ino !== inventoryBlobEvidence.status.ino
      || inventoryEvidence.status.nlink < 2n
      || inventoryBlobEvidence.status.nlink < 2n) {
      failures.push(`${entry.branch}: inventory artifact is not a reused content-addressed hardlink`);
    }
    if (failures.length !== initialFailureCount) return;
    let expected;
    try {
      expected = JSON.parse(inventoryEvidence.buffer.toString("utf8"));
    } catch (error) {
      failures.push(`${entry.branch}: invalid untracked inventory (${error.message})`);
      return;
    }
    verifyTarPayloadSource({
      tarDescriptor: tarHeld.descriptor,
      tarBytes: tarArtifact.bytes
    }, expected, entry.branch, failures);
    let finalTarEvidence;
    let finalTarBlobEvidence;
    let finalInventoryEvidence;
    let finalInventoryBlobEvidence;
    try {
      finalTarEvidence = observeHeldRegularFileNoFollow(tarHeld, { expectedBytes: tarArtifact.bytes });
      finalTarBlobEvidence = observeHeldRegularFileNoFollow(tarBlobHeld, { expectedBytes: tarArtifact.bytes });
      finalInventoryEvidence = observeHeldRegularFileNoFollow(inventoryHeld, {
        captureBuffer: true,
        expectedBytes: inventoryArtifact.bytes,
        maxBytes: ARCHIVE_INVENTORY_MAX_BYTES
      });
      finalInventoryBlobEvidence = observeHeldRegularFileNoFollow(inventoryBlobHeld, {
        expectedBytes: inventoryArtifact.bytes,
        maxBytes: ARCHIVE_INVENTORY_MAX_BYTES
      });
    } catch (error) {
      failures.push(`${entry.branch}: archive artifacts changed during verification (${error.message})`);
      return;
    }
    if (finalTarEvidence.bytes !== tarEvidence.bytes
      || finalTarEvidence.sha256 !== tarEvidence.sha256
      || finalTarBlobEvidence.bytes !== tarBlobEvidence.bytes
      || finalTarBlobEvidence.sha256 !== tarBlobEvidence.sha256
      || finalTarEvidence.status.dev !== finalTarBlobEvidence.status.dev
      || finalTarEvidence.status.ino !== finalTarBlobEvidence.status.ino
      || finalTarEvidence.status.nlink < 2n
      || finalTarBlobEvidence.status.nlink < 2n
      || finalInventoryEvidence.bytes !== inventoryEvidence.bytes
      || finalInventoryEvidence.sha256 !== inventoryEvidence.sha256
      || finalInventoryBlobEvidence.bytes !== inventoryBlobEvidence.bytes
      || finalInventoryBlobEvidence.sha256 !== inventoryBlobEvidence.sha256
      || finalInventoryEvidence.status.dev !== finalInventoryBlobEvidence.status.dev
      || finalInventoryEvidence.status.ino !== finalInventoryBlobEvidence.status.ino
      || finalInventoryEvidence.status.nlink < 2n
      || finalInventoryBlobEvidence.status.nlink < 2n
      || !finalInventoryEvidence.buffer.equals(inventoryEvidence.buffer)) {
      failures.push(`${entry.branch}: archive artifacts changed during verification`);
    }
  } catch (error) {
    failures.push(`${entry.branch}: archive verification failed (${error.message})`);
  } finally {
    for (const held of heldFiles.reverse()) {
      try {
        fs.closeSync(held.descriptor);
      } catch {
        // A descriptor close failure cannot change the already recorded validation result.
      }
    }
  }
}

export function verifyArchiveSetEvidence(evidenceRoot, manifest, failures = []) {
  const indexPath = path.join(evidenceRoot, "sets", manifest.archiveSetFingerprint, "archive-set.json");
  let indexBuffer = null;
  let index = null;
  if (!fs.existsSync(indexPath) || fs.lstatSync(indexPath).isSymbolicLink() || !fs.lstatSync(indexPath).isFile()) {
    failures.push("archive-set index is missing or unsafe");
  } else {
    indexBuffer = fs.readFileSync(indexPath);
    try {
      index = JSON.parse(indexBuffer.toString("utf8"));
      if ((fs.statSync(indexPath).mode & 0o777) !== 0o600) failures.push("archive-set index permissions must be 0600");
    } catch {
      failures.push("archive-set index is invalid");
    }
  }
  verifyArchiveSetSchema(manifest, index ?? {}, failures);
  for (const entry of manifest.archivedWorktrees ?? []) {
    if (!verifyArchiveEntrySchema(entry, { archiveSetFingerprint: manifest.archiveSetFingerprint }, [])) continue;
    const validity = {};
    for (const [name, artifact] of Object.entries(entry.artifacts ?? {})) {
      validity[name] = verifyArtifact(
        evidenceRoot,
        artifact,
        `${entry.branch}:${name}`,
        failures,
        { maxBytes: name === "untrackedInventory" ? ARCHIVE_INVENTORY_MAX_BYTES : ARCHIVE_ARTIFACT_MAX_BYTES }
      );
      if (artifact) {
        const absolutePath = artifactAbsolutePath(evidenceRoot, artifact.path);
        if (fs.existsSync(absolutePath) && (fs.statSync(absolutePath).mode & 0o777) !== 0o600) {
          failures.push(`${entry.branch}:${name}: artifact permissions must be 0600`);
        }
      }
    }
    if (validity.untrackedTar !== false && validity.untrackedInventory !== false) verifyTarInventory(evidenceRoot, entry, failures);
  }
  if (Array.isArray(manifest.archivedWorktrees)
    && manifest.archivedWorktrees.every((entry) => verifyArchiveEntrySchema(entry, { archiveSetFingerprint: manifest.archiveSetFingerprint }, []))) {
    verifyArchiveSetLayout(evidenceRoot, manifest, failures);
  }
  if (indexBuffer && !fs.readFileSync(indexPath).equals(indexBuffer)) failures.push("archive-set index changed during verification");
  return failures;
}

export function assertArchiveSetEvidence(evidenceRoot, manifest) {
  const failures = verifyArchiveSetEvidence(evidenceRoot, manifest, []);
  if (failures.length > 0) throw new Error(`archive self-verification failed with ${failures.length} integrity errors: ${failures.join("; ")}`);
}
