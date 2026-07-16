import assert from "node:assert/strict";
import { constants as bufferConstants, isUtf8 } from "node:buffer";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";
import ts from "typescript";

const here = path.dirname(new URL(import.meta.url).pathname);
const writer = path.join(here, "refresh-linked-worktree-archive-evidence.mjs");
const gate = path.join(here, "assert-linked-worktree-archive-evidence-current.mjs");
const libraryUrl = pathToFileURL(path.join(here, "evidence-archive-lib.mjs")).href;
const TEST_CHILD_TIMEOUT_MS = 30_000;
const TYPED_E2E_TIMEOUT_MS = 120_000;
const TEST_REPOSITORY_ID = "a".repeat(64);
const pemHeaderFixture = () => ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
const providerTokenFixture = (suffix) => ["s", "k", "-"].join("") + suffix;
const githubTokenFixture = (suffix) => ["g", "h", "p", "_"].join("") + suffix;
const awsAccessKeyFixture = (suffix) => ["A", "K", "I", "A"].join("") + suffix;
const googleApiKeyFixture = (suffix) => ["A", "I", "z", "a"].join("") + suffix;
const resendTokenFixture = (suffix) => ["r", "e", "_"].join("") + suffix;
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
const REVIEWED_LEGACY_STAGE0_ENTRY = REVIEWED_LEGACY_STAGE0_ENTRIES[0];
const REVIEWED_UNTRACKED_COORDINATION_REPORT = Object.freeze({
  path: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials.md",
  mode: 0o644,
  objectId: "3d7e78774ea1eb3670e3e852d683ba62161df8ce",
  bytes: 3_597,
  sha256: "cd143d695855c7ff32535758588f840da12b84441710c9ec744b306ebc84fa6f"
});
const REVIEWED_UNTRACKED_COORDINATION_REPORT_DISPLAY_PATH = "reviewed-untracked-coordination-report/content.md";
const REVIEWED_LEGACY_TERMINAL_PATCH_HEAD = "ec22a29b55a4329e81d96e02417f8925ccec54c3";
const REVIEWED_LEGACY_TERMINAL_PATCH_BASE = "e909992b098ce7f8b57ca7f7ede6c97e50ccdc45";
const REVIEWED_EXACT_A18_FINAL_HEAD = "e17471e6bc296828db591f4f060a868e075653e9";
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
const REVIEWED_LEGACY_OFFICE_LOCK = Object.freeze({
  headRevision: "ec22a29b55a4329e81d96e02417f8925ccec54c3",
  path: "coordination/reports/.~26-06-30-president-report.docx",
  branchMode: "100644",
  untrackedMode: 0o644,
  objectId: "394807d551d6d3ec3f618f1488147b471a477908",
  bytes: 162,
  sha256: "f1c330d653b2e1c687da72ddd50bb55bed27fc5141c897aa6824022c571dbe45"
});
const REVIEWED_LEGACY_PARENT_CONSOLE_REPORT = Object.freeze({
  headRevision: "ec22a29b55a4329e81d96e02417f8925ccec54c3",
  path: "coordination/reports/2026-06-04-parent-console-p0-p1-bug-audit.md",
  mode: "100644",
  objectId: "4df3bce80ebd1ed120ed918ba49e9d62f474fb0a",
  bytes: 9_680,
  sha256: "a756524e2ad3323edb4ed89c94fc51507dd82da337fabd97e3c6efe21a4d558b"
});
const REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES = Object.freeze([
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md",
    mode: "100644",
    type: "blob",
    objectId: "e2fe2b0b560596ba7855440a2eef4763755eb85d",
    bytes: 12_067,
    sha256: "d0419a4e7c5cb41c0b7f0ff159f9d359a945428bf3757203f0ee742026e630b0"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-06-production-auth-storage-health-S12.md",
    mode: "100644",
    type: "blob",
    objectId: "b730a971c90e785cb8ee61f82d478d32fcf908f9",
    bytes: 9_960,
    sha256: "dd8f1b94f8979fd3fe6ac8467c95f5fbbf78842e10f3bb9cdb2f0dcc18e8a1f7"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-22-s19-production-db-smoke.mjs",
    mode: "100644",
    type: "blob",
    objectId: "e6428e7865337eda45874fdffe6b736999bb35b3",
    bytes: 25_465,
    sha256: "8f96568cb49fe81e6fd11402dd8fd97e88ffe63ca0c793c560ce8d6e29631f75"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/cloudflare-ai-crawl-control-preflight.mjs",
    mode: "100644",
    type: "blob",
    objectId: "05347bdf32b2ef81cd57dc2199b15a4255828118",
    bytes: 9_554,
    sha256: "76a8655b71762bd703d4e27b387b85116a1f2eb71065d650f0b3fe10d1144e6a"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs",
    mode: "100644",
    type: "blob",
    objectId: "4a39be077b60637e765c2e3639a7991be2042cf5",
    bytes: 6_896,
    sha256: "f2acc322167a0a20f0acf3e62225484a93f87acc53538bccf1c650cc5747263d"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/session-logs/2026-06-22-S12.md",
    mode: "100644",
    type: "blob",
    objectId: "413cdde2afedc515509debf4a65f12bc1597730e",
    bytes: 329_406,
    sha256: "7ec332cd113113e7ebced5b9a4b6066583d126dc8891788f600306e797cdf7de"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "lib/server/userStoreAuthSessionPersistence.test.ts",
    mode: "100644",
    type: "blob",
    objectId: "22aa14abb83cfe3d394db56c9380c4afd28160da",
    bytes: 122_464,
    sha256: "9fa01a390189bc54b7c19778265e9fb02a8cf15c51121ed2455ec87f7d64aec9"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "scripts/build-us-ca-private-raw-corpus.py",
    mode: "100644",
    type: "blob",
    objectId: "806dddda94a408e1b1d825c65ce32d066d3ae316",
    bytes: 23_075,
    sha256: "8e5bd542ff992ebfb9e07ee5edd8ffcd6e50820ae121c5c69e57a7a10e9f86b3"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "tests/e2e/ai-tutor-live-text.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "5c147d03752413a0a3810402c5389d0d1fcb67d4",
    bytes: 41_043,
    sha256: "d9da19f937882290b748b62e423fb316af770222ba66b6aba3adaafaa8d762e4"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "tests/e2e/practice-bank-solvability.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "c76bcb1a9fb9e7eed64bf8fe8302d01f51ce7138",
    bytes: 35_613,
    sha256: "df7ed7bc39862e204cf9e0e12e8eccacefd2c359c974cc75a2244d127f7d9c6b"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-06-S11-forgot-password-recovery-smoke.md",
    mode: "100644",
    type: "blob",
    objectId: "dd1143549fe13b5c9256860eab571cf65693d175",
    bytes: 2_793,
    sha256: "61c584aef1feaf7fe3edc06d3f5f24cdbbe1dfbcb108fb6711a3fe46532ac672"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-07-S19-password-reset-resend-vercel-env-plan.md",
    mode: "100644",
    type: "blob",
    objectId: "7b4fcf5710a47db240f4020501ed641ef2beeda4",
    bytes: 5_076,
    sha256: "d4cfa5685964dfde1e650678725017e01366e33e7d9dd2ddf19c1450c896bef1"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
    path: "coordination/reports/2026-06-29-A07-A19-A11-ai-tutor-env-gate-enterprise-solution.md",
    mode: "100644",
    type: "blob",
    objectId: "af926ab100ac3582d69aceb806e78e639b3bd4a4",
    bytes: 9_686,
    sha256: "6c08b1f1673ad6d399d29a2c94f3777e0eacc8bf816159983d04c92bfa42579e"
  })
]);
const REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES = Object.freeze([
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_BASE,
    path: "tests/e2e/ai-tutor-live-text.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "ed9342d2a744fd8c5271c9059d7343b4597431f5",
    bytes: 36_203,
    sha256: "a14c24644b0e85b8366e3a6117d8727603891b7be79c1ed5b9c3b65e2c82ff93"
  }),
  Object.freeze({
    revision: REVIEWED_LEGACY_TERMINAL_PATCH_BASE,
    path: "tests/e2e/practice-bank-solvability.spec.ts",
    mode: "100644",
    type: "blob",
    objectId: "6022d27b763c6e47a4f182df110cf98fedd58b43",
    bytes: 34_397,
    sha256: "d8536e02956827c9e8ba173356b799f3d6b4273322179b86c1109f2134d57bd5"
  })
]);
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
const REVIEWED_PROTECTED_OVERLAY_REF = "refs/mais-preservation/2026-07-12-dirty-root-snapshot";
const REVIEWED_PROTECTED_OVERLAY_TARGET = "93346c724961435789bd66de9e31d3979a93c45c";
const REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS = Object.freeze({
  sourcePath: REVIEWED_LEGACY_OFFICE_LOCK.path,
  path: "coordination/content-qa/templates/.~IS_CA-Math_K-5_Content_QA_Template.docx",
  mode: 0o644,
  objectId: REVIEWED_LEGACY_OFFICE_LOCK.objectId,
  bytes: REVIEWED_LEGACY_OFFICE_LOCK.bytes,
  sha256: REVIEWED_LEGACY_OFFICE_LOCK.sha256
});
const REVIEWED_PROTECTED_OVERLAY_UNTRACKED_MODES = new Map([
  ...REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.map((entry) => [entry.path, 0o644]),
  [REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.path, 0o600],
  ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES
    .filter((entry) => !entry.path.startsWith("tests/e2e/"))
    .map((entry) => [entry.path, new Set([
      "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md",
      "coordination/reports/2026-06-06-production-auth-storage-health-S12.md",
      "coordination/reports/cloudflare-ai-crawl-control-preflight.mjs",
      "coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs",
      "coordination/reports/2026-06-06-S11-forgot-password-recovery-smoke.md",
      "coordination/reports/2026-06-07-S19-password-reset-resend-vercel-env-plan.md"
    ]).has(entry.path) ? 0o600 : 0o644]),
  ...REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES.map((entry) => [entry.path, 0o600]),
  [REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS.path, REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS.mode]
]);
const REVIEWED_REAL_PATCH_CORPUS_EXTRA_ENTRY = Object.freeze({
  path: "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch",
  objectId: "a2bbb64104ca4d1854ac0d2fe6004f4b6bdc2c87",
  bytes: 161_272_583,
  sha256: "0f5d6f290df9db70f9e4c7de8073e30ac3c08da070f95698b0d545222524d7ae"
});
const REVIEWED_UNTRACKED_COORDINATION_REPORT_FIXTURE_DEFLATE_BASE64 = "vVdZc9s2EH7Hr9hp3jqCfLRNW00mM4rspprxocpx0rcQIpckYhCgsYCO/vrOgpRky3amx7QvNiXi2OM7Vq/gnXH5HXqYY+t8EELCmQo4gtPj09fy+LU8/V7I/qW2FagKbRjB+OQEfhuDsgV4NKgI4T4qo8NmALmzFBtePD45huCc4WcXQxuDkHC9svy5dMa4lYwtH/YzjGdT3ljqKnoVtLPp7AJb4zYN2gBol2BQFSkaowIWsHL+joJH1YwgC6gauYhVqdcZvLt9//lifgMeVQHyLZR6zf9y4wjBONcKCTdBhUgjmCM5s8QCSufBuFyZ3fb7iBHTIdpWQrx6BZ9qFeBX1bZosRDiQ40HN3NMpXEr8HgftUeCUCPkyjqrnx6du6ZRthgJkWXZQlEtrCsQKPe6DXS0iJUMXqsKh18IpCRtc4TvjgteLgSX1yMF57FI1zSaiGubPXtABpOL6SDVNcXU3Q3WrQDXmMeAlF6uvObHbL9Z+tT/YVNkwy7pCi361ITuFVDtVl2ujzPUBNaFXWuxAG0h1Jr6Uuc15ncuhhEjL5vslo3AukxIuOxT4vZb1SCNBICErL/l8/nV2ex6evUhe/z17c35/Gp8eX7w9Wx8c/Ppen6WpWZOPBZog1YGblz0OcKEoxHil4RNvpYTuhxPb+Tlxxnk+/U+GhwkFqQE+vq7lUUvVdt6x4DqM9zvOrue/A6LDSyV12phMGUEzprNUIg5UjR9HZ5kNwK1IKbBYpM2iedy/dqiXeYvLRrPZp+nz7wWV+5hCktlIhKs0DOCWo3FAFqvbeAHik2jvP4jPece0VLtwgAoqIq/Y8jpkJY6n3AW0EJwHSB6kKXWTJtW5YEhfsLkYQiVGPIaVAy18zqooJcIhv9sATc73mIuYEMD0JZazMMLQAbFNyrT78GlLtDmmCLz0aZ+9hwuIJOyUf5OlnqNRdbpiGQdSaKxRK9LjQVHwCtoKMRF6n2pjFmo/G73plfMyiORdpY4OSZH0DbiABYxpIvLaMyBsLjFF8xT0h4bpS1BtAlnFqINeq8s+2YRqNSlLae60s63SSXZzVlrhdgR7xGF0S61dzbp714dk4AoX2HYaf+DhQQxEXbHAsLcY4Ba2YKN4AWAPwvoZwEsJLiWo1bmyCNDCm3BPXqA4hfX8Pvb+UUmxJlLwoTrlj0hIaHHtrbwXocBGFfRoEclPQQ0f6jRGKg1i+8mYSavVY/djwkOeedik15lx2VAn0o+cU1rMCD9M9E/XzOosQCVTnzkmV1tn4d7J9CPFHaDlA2FhA8J6knGjabQ82ILgo7UG8hd5O4yDhgjhKaLwytbIR/TcxW6u8G1aGF2LBluS2UYQ4mYCT+RELKvpr3nG7xB752fFm/hmzceC5WutS7g22+ypJ59LXY83JKQNZ7lmWBs2MU3MI821ShdLWUSb3jBLSW0imi4W/5ig9CUMiCFv7Fl21Pe8tfNtxOIvlWanvhlurjSoTMlqSvrPIJcwnOnpS9LvZbGVcMv5Ow+/E4myJnYqQPD9oGDc/sfD0pbQ+MJwLtY1f8h/VM0ypCD2BZpBNnHc2DAh9ZLLq3NLuY3GQeWGBrpyZC2u/Xb7LFX0xCuXEeP/9kT0yhdo4WOEp07bUe/jnCTiylnaJ1vlOFZ2adBe82jNS6TNLMfsOo1mnKjiDq6KGIs0DAJAZ/CI2HHq6LRgbojslJpw+5HQQXspF7b4LaO0RnpsPNsj151Hpos+t/NuQ8no0P9YvlyQZkHUY3g9OTHH4SEW6vvI6bcRnDMPz1atPzEM82hpfc6veKxINqdzJXON+jh9KeuhLJArxla0zOCBeaKhSzUuOm6XypDCK0jzU5NUHrXpIqW2gT02laDVP+EoF1BF7F6EP5QiJnHpcbV0cy7InYo3TKtVV6HzW4GIGwVz+HsLEfj09P0+wN0efDLaW/OFnv0EI+e3eyj8hyZ9n8C";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
}

function maybePinnedLegacyTerminalPatchRepository() {
  const repository = path.resolve(here, "..", "..");
  try {
    execFileSync("git", ["cat-file", "-e", `${REVIEWED_LEGACY_TERMINAL_PATCH_HEAD}^{commit}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    for (const entry of REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES) {
      execFileSync("git", ["cat-file", "-e", `${entry.objectId}^{blob}`], {
        cwd: repository,
        stdio: "ignore",
        timeout: TEST_CHILD_TIMEOUT_MS
      });
    }
    return repository;
  } catch {
    return null;
  }
}

function maybeReviewedLegacyOfficeLockRepository() {
  const repository = path.resolve(here, "..", "..");
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  try {
    execFileSync("git", ["cat-file", "-e", `${entry.headRevision}^{commit}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    execFileSync("git", ["cat-file", "-e", `${entry.objectId}^{blob}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    return repository;
  } catch {
    return null;
  }
}

function maybeReviewedLegacyParentConsoleReportRepository() {
  const repository = path.resolve(here, "..", "..");
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  try {
    execFileSync("git", ["cat-file", "-e", `${entry.headRevision}^{commit}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    execFileSync("git", ["cat-file", "-e", `${entry.objectId}^{blob}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    return repository;
  } catch {
    return null;
  }
}

function maybeReviewedLegacyExactTextRepository() {
  const repository = path.resolve(here, "..", "..");
  try {
    for (const revision of new Set([
      ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES,
      ...REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES
    ].map((entry) => entry.revision))) {
      execFileSync("git", ["cat-file", "-e", `${revision}^{commit}`], {
        cwd: repository,
        stdio: "ignore",
        timeout: TEST_CHILD_TIMEOUT_MS
      });
    }
    for (const entry of [
      ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES,
      ...REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES
    ]) {
      execFileSync("git", ["cat-file", "-e", `${entry.objectId}^{blob}`], {
        cwd: repository,
        stdio: "ignore",
        timeout: TEST_CHILD_TIMEOUT_MS
      });
    }
    return repository;
  } catch {
    return null;
  }
}

function maybeReviewedLegacyJpegUnderPngRepository() {
  const repository = path.resolve(here, "..", "..");
  try {
    execFileSync("git", [
      "cat-file",
      "-e",
      `${REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION}^{commit}`
    ], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    for (const entry of REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES) {
      execFileSync("git", ["cat-file", "-e", `${entry.objectId}^{blob}`], {
        cwd: repository,
        stdio: "ignore",
        timeout: TEST_CHILD_TIMEOUT_MS
      });
    }
    return repository;
  } catch {
    return null;
  }
}

function maybeReviewedProtectedOverlayRepository() {
  const repository = path.resolve(here, "..", "..");
  try {
    for (const revision of [
      REVIEWED_PROTECTED_OVERLAY_TARGET,
      REVIEWED_LEGACY_TERMINAL_PATCH_BASE
    ]) {
      execFileSync("git", ["cat-file", "-e", `${revision}^{commit}`], {
        cwd: repository,
        stdio: "ignore",
        timeout: TEST_CHILD_TIMEOUT_MS
      });
    }
    return repository;
  } catch {
    return null;
  }
}

function gitBlob(cwd, objectId) {
  return execFileSync("git", ["cat-file", "blob", objectId], {
    cwd,
    encoding: null,
    maxBuffer: 1024 * 1024 * 1024,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
}

function reviewedLegacyTerminalPatchBytes(root, entry) {
  const buffer = gitBlob(root, entry.objectId);
  assert.equal(buffer.length, entry.bytes);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  return buffer;
}

function reviewedLegacyOfficeLockBytes(root) {
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const buffer = gitBlob(root, entry.objectId);
  assert.equal(buffer.length, entry.bytes);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  return buffer;
}

function reviewedLegacyExactTextBytes(root, entry) {
  const buffer = gitBlob(root, entry.objectId);
  assert.equal(buffer.length, entry.bytes);
  assert.equal(isUtf8(buffer), true);
  assert.equal(buffer.includes(0), false);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  return buffer;
}

function reviewedLegacyJpegUnderPngBytes(root, entry) {
  const buffer = gitBlob(root, entry.objectId);
  assert.equal(buffer.length, entry.bytes);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  assert.deepEqual([...buffer.subarray(0, 2)], [0xff, 0xd8]);
  assert.deepEqual([...buffer.subarray(-2)], [0xff, 0xd9]);
  return buffer;
}

function loadPrivateFunction(functionName) {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  const sourceFile = ts.createSourceFile(
    "evidence-archive-lib.mjs",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const declaration = sourceFile.statements.find((statement) => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === functionName
  ));
  assert.ok(declaration, `missing private function ${functionName}`);
  return Function("Buffer", `"use strict"; return (${declaration.getText(sourceFile)});`)(Buffer);
}

function jpegSegment(marker, payload) {
  assert.ok(Buffer.isBuffer(payload));
  const length = payload.length + 2;
  assert.ok(length <= 0xffff);
  return Buffer.concat([
    Buffer.from([0xff, marker, length >> 8, length & 0xff]),
    payload
  ]);
}

function portableJpegParts({ appPayload = Buffer.from("portable-jpeg") } = {}) {
  return {
    soi: Buffer.from([0xff, 0xd8]),
    app: jpegSegment(0xe0, appPayload),
    sof: jpegSegment(0xc0, Buffer.from([
      0x08,
      0x00, 0x01,
      0x00, 0x01,
      0x01,
      0x01, 0x11, 0x00
    ])),
    sos: jpegSegment(0xda, Buffer.from([
      0x01,
      0x01, 0x00,
      0x00, 0x3f, 0x00
    ])),
    entropy: Buffer.from([
      0x11,
      0xff, 0x00,
      0x22,
      0xff, 0xd0,
      0x33,
      0xff, 0xd7,
      0x44
    ]),
    eoi: Buffer.from([0xff, 0xd9])
  };
}

function portableStructuredJpeg(options = {}) {
  const parts = portableJpegParts(options);
  return Buffer.concat([parts.soi, parts.app, parts.sof, parts.sos, parts.entropy, parts.eoi]);
}

function portableSingleFileTarGzip(relativePath, buffer, { mode = 0o644 } = {}) {
  return execFileSync("python3", ["-c", [
    "import io,sys,tarfile",
    "payload=sys.stdin.buffer.read()",
    "output=io.BytesIO()",
    "with tarfile.open(fileobj=output, mode='w:gz') as archive:",
    " info=tarfile.TarInfo(sys.argv[1])",
    " info.mode=int(sys.argv[2], 8)",
    " info.mtime=0",
    " info.size=len(payload)",
    " archive.addfile(info, io.BytesIO(payload))",
    "sys.stdout.buffer.write(output.getvalue())"
  ].join("\n"), relativePath, mode.toString(8)], {
    input: buffer,
    encoding: null,
    maxBuffer: 1024 * 1024 * 1024,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
}

function enableReviewedProtectedOverlayFixture(fixture, repository, {
  target = REVIEWED_PROTECTED_OVERLAY_TARGET
} = {}) {
  const fixtureCommonDir = path.resolve(fixture.repo, git(fixture.repo, "rev-parse", "--git-common-dir"));
  const repositoryCommonDir = path.resolve(repository, git(repository, "rev-parse", "--git-common-dir"));
  const alternatesPath = path.join(fixtureCommonDir, "objects", "info", "alternates");
  fs.mkdirSync(path.dirname(alternatesPath), { recursive: true });
  fs.writeFileSync(alternatesPath, `${path.join(repositoryCommonDir, "objects")}\n`);
  git(fixture.repo, "update-ref", REVIEWED_PROTECTED_OVERLAY_REF, target);
}

function reviewedProtectedOverlayFixtureRepositoryId(fixture) {
  const commonDir = fs.realpathSync(path.resolve(
    fixture.repo,
    git(fixture.repo, "rev-parse", "--git-common-dir")
  ));
  return crypto.createHash("sha256")
    .update(JSON.stringify({ gitCommonDir: commonDir }))
    .digest("hex");
}

function reviewedProtectedOverlayFixtureOptions(fixture) {
  return {
    protectedOverlayExpectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  };
}

function writeReviewedProtectedOverlayFile(root, entry, buffer, {
  relativePath = entry.path,
  mode = REVIEWED_PROTECTED_OVERLAY_UNTRACKED_MODES.get(entry.path)
} = {}) {
  assert.ok(Number.isInteger(mode));
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  fs.chmodSync(absolutePath, mode);
  return absolutePath;
}

function writeReviewedLegacyOfficeLock(root, buffer, {
  relativePath = REVIEWED_LEGACY_OFFICE_LOCK.path,
  mode = REVIEWED_LEGACY_OFFICE_LOCK.untrackedMode
} = {}) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  fs.chmodSync(absolutePath, mode);
  return absolutePath;
}

function withReviewedLegacyTerminalPatchGitShim(t, entry, mutation, callback) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "mais-reviewed-terminal-patch-git-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const replacementObjectId = "0".repeat(40);
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, [
    "#!/usr/bin/env node",
    'import { spawnSync } from "node:child_process";',
    `const realGit = ${JSON.stringify(realGit)};`,
    `const entry = ${JSON.stringify(entry)};`,
    `const mutation = ${JSON.stringify(mutation)};`,
    `const replacementObjectId = ${JSON.stringify(replacementObjectId)};`,
    "const args = process.argv.slice(2);",
    "const result = spawnSync(realGit, args, { encoding: null, env: process.env, maxBuffer: 1024 * 1024 * 1024 });",
    "if (result.error) throw result.error;",
    "if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }",
    "let output = result.stdout;",
    "if (args[0] === 'ls-tree' && args.includes(`:(literal)${entry.path}`) && (mutation === 'mode' || mutation === 'object')) {",
    "  const original = Buffer.from(`${entry.mode} blob ${entry.objectId}\\t${entry.path}\\0`);",
    "  const replacement = Buffer.from(`${mutation === 'mode' ? '100755' : entry.mode} blob ${mutation === 'object' ? replacementObjectId : entry.objectId}\\t${entry.path}\\0`);",
    "  const offset = output.indexOf(original);",
    "  if (offset < 0 || replacement.length !== original.length) process.exit(97);",
    "  output = Buffer.concat([output.subarray(0, offset), replacement, output.subarray(offset + original.length)]);",
    "}",
    "process.stdout.write(output);"
  ].join("\n"));
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${originalPath}`;
    return callback();
  } finally {
    process.env.PATH = originalPath;
  }
}

function withReviewedLegacyOfficeLockGitShim(t, mutation, callback) {
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "mais-reviewed-office-lock-git-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, [
    "#!/usr/bin/env node",
    'import { spawnSync } from "node:child_process";',
    `const realGit = ${JSON.stringify(realGit)};`,
    `const entry = ${JSON.stringify(entry)};`,
    `const mutation = ${JSON.stringify(mutation)};`,
    "const args = process.argv.slice(2);",
    "const result = spawnSync(realGit, args, { encoding: null, env: process.env, maxBuffer: 1024 * 1024 * 1024 });",
    "if (result.error) throw result.error;",
    "if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }",
    "let output = result.stdout;",
    "if (args[0] === 'ls-tree' && args.includes(`:(literal)${entry.path}`)) {",
    "  const original = Buffer.from(`${entry.branchMode} blob ${entry.objectId}\\t${entry.path}\\0`);",
    "  let replacement = original;",
    "  if (mutation === 'mode') replacement = Buffer.from(`100755 blob ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'type') replacement = Buffer.from(`${entry.branchMode} tree ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'object') replacement = Buffer.from(`${entry.branchMode} blob ${'0'.repeat(40)}\\t${entry.path}\\0`);",
    "  if (mutation === 'missing') replacement = Buffer.alloc(0);",
    "  const offset = output.indexOf(original);",
    "  if (offset < 0) process.exit(97);",
    "  output = Buffer.concat([output.subarray(0, offset), replacement, output.subarray(offset + original.length)]);",
    "}",
    "if (args[0] === 'cat-file' && args[1] === 'blob' && args[2] === entry.objectId) {",
    "  if (mutation === 'bytes') { output = Buffer.from(output); output[output.length - 1] ^= 1; }",
    "  if (mutation === 'size') output = Buffer.concat([output, Buffer.from([0])]);",
    "}",
    "process.stdout.write(output);"
  ].join("\n"));
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${originalPath}`;
    return callback();
  } finally {
    process.env.PATH = originalPath;
  }
}

function withReviewedLegacyParentConsoleReportGitShim(t, mutation, callback) {
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "mais-reviewed-parent-report-git-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, [
    "#!/usr/bin/env node",
    'import { spawnSync } from "node:child_process";',
    `const realGit = ${JSON.stringify(realGit)};`,
    `const entry = ${JSON.stringify(entry)};`,
    `const mutation = ${JSON.stringify(mutation)};`,
    "const args = process.argv.slice(2);",
    "const result = spawnSync(realGit, args, { encoding: null, env: process.env, maxBuffer: 1024 * 1024 * 1024 });",
    "if (result.error) throw result.error;",
    "if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }",
    "let output = result.stdout;",
    "if (args[0] === 'ls-tree' && args.includes(`:(literal)${entry.path}`)) {",
    "  const original = Buffer.from(`${entry.mode} blob ${entry.objectId}\\t${entry.path}\\0`);",
    "  let replacement = original;",
    "  if (mutation === 'mode') replacement = Buffer.from(`100755 blob ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'type') replacement = Buffer.from(`${entry.mode} tree ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'object') replacement = Buffer.from(`${entry.mode} blob ${'0'.repeat(40)}\\t${entry.path}\\0`);",
    "  if (mutation === 'path') replacement = Buffer.from(`${entry.mode} blob ${entry.objectId}\\t${entry.path}.copy\\0`);",
    "  if (mutation === 'missing') replacement = Buffer.alloc(0);",
    "  const offset = output.indexOf(original);",
    "  if (offset < 0) process.exit(97);",
    "  output = Buffer.concat([output.subarray(0, offset), replacement, output.subarray(offset + original.length)]);",
    "}",
    "if (args[0] === 'cat-file' && args[1] === 'blob' && args[2] === entry.objectId) {",
    "  if (mutation === 'bytes') { output = Buffer.from(output); output[output.length - 1] ^= 1; }",
    "  if (mutation === 'size') output = Buffer.concat([output, Buffer.from([0])]);",
    "}",
    "process.stdout.write(output);"
  ].join("\n"));
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${originalPath}`;
    return callback();
  } finally {
    process.env.PATH = originalPath;
  }
}

function withReviewedLegacyPinnedBlobGitShim(t, entry, mutation, callback) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "mais-reviewed-exact-text-git-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, [
    "#!/usr/bin/env node",
    'import { spawnSync } from "node:child_process";',
    `const realGit = ${JSON.stringify(realGit)};`,
    `const entry = ${JSON.stringify(entry)};`,
    `const mutation = ${JSON.stringify(mutation)};`,
    "const args = process.argv.slice(2);",
    "const result = spawnSync(realGit, args, { encoding: null, env: process.env, maxBuffer: 1024 * 1024 * 1024 });",
    "if (result.error) throw result.error;",
    "if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }",
    "let output = result.stdout;",
    "if (args[0] === 'ls-tree' && args.includes(`:(literal)${entry.path}`)) {",
    "  const original = Buffer.from(`${entry.mode} ${entry.type} ${entry.objectId}\\t${entry.path}\\0`);",
    "  let replacement = original;",
    "  if (mutation === 'mode') replacement = Buffer.from(`100755 ${entry.type} ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'type') replacement = Buffer.from(`${entry.mode} tree ${entry.objectId}\\t${entry.path}\\0`);",
    "  if (mutation === 'object') replacement = Buffer.from(`${entry.mode} ${entry.type} ${'0'.repeat(40)}\\t${entry.path}\\0`);",
    "  if (mutation === 'path') replacement = Buffer.from(`${entry.mode} ${entry.type} ${entry.objectId}\\t${entry.path}.copy\\0`);",
    "  if (mutation === 'missing') replacement = Buffer.alloc(0);",
    "  const offset = output.indexOf(original);",
    "  if (offset < 0) process.exit(97);",
    "  output = Buffer.concat([output.subarray(0, offset), replacement, output.subarray(offset + original.length)]);",
    "}",
    "if (args[0] === 'cat-file' && args[1] === 'blob' && args[2] === entry.objectId) {",
    "  if (mutation === 'bytes') { output = Buffer.from(output); output[output.length - 1] ^= 1; }",
    "  if (mutation === 'size') output = Buffer.concat([output, Buffer.from([0])]);",
    "}",
    "process.stdout.write(output);"
  ].join("\n"));
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${originalPath}`;
    return callback();
  } finally {
    process.env.PATH = originalPath;
  }
}

function assertFixedReviewedLegacyTextError(callback, expected) {
  let error;
  assert.throws(() => {
    try {
      callback();
    } catch (caught) {
      error = caught;
      throw caught;
    }
  }, expected);
  assert.doesNotMatch(error.message, /[0-9a-f]{40}|coordination\/|lib\/server\/|scripts\/|tests\/e2e\//iu);
  return error;
}

function assertFixedReviewedLegacyJpegError(callback, expected) {
  let error;
  assert.throws(() => {
    try {
      callback();
    } catch (caught) {
      error = caught;
      throw caught;
    }
  }, expected);
  assert.doesNotMatch(error.message, /[0-9a-f]{40}|coordination\/|desktop-|mobile-|teacher-console|login-teacher/iu);
  return error;
}

function makeFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-evidence-test-"));
  const repo = path.join(parent, "MAIS-MVP");
  const linked = path.join(parent, "linked feature");
  const evidenceRoot = path.join(parent, "evidence");
  fs.mkdirSync(repo);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Evidence Test");
  fs.writeFileSync(path.join(repo, "tracked.txt"), "base\n");
  git(repo, "add", "tracked.txt");
  git(repo, "commit", "-m", "base");
  git(repo, "worktree", "add", "-b", "feature/archive", linked, "main");
  fs.mkdirSync(path.join(repo, "coordination", "release-intake"), { recursive: true });
  fs.writeFileSync(path.join(repo, "coordination", "release-intake", "latest-A25-dirty-tree-map.json"), `${JSON.stringify({
    statusSignature: "fixture-signature",
    statusCounts: { expandedStatusEntries: 1 }
  }, null, 2)}\n`);
  return { parent, repo, linked, evidenceRoot };
}

function reviewedLegacyStage0Bytes(entry = REVIEWED_LEGACY_STAGE0_ENTRY) {
  if (
    entry.path === REVIEWED_UNTRACKED_COORDINATION_REPORT.path
    && entry.objectId === REVIEWED_UNTRACKED_COORDINATION_REPORT.objectId
    && entry.bytes === REVIEWED_UNTRACKED_COORDINATION_REPORT.bytes
    && entry.sha256 === REVIEWED_UNTRACKED_COORDINATION_REPORT.sha256
  ) return reviewedUntrackedCoordinationReportBytes();
  const buffer = fs.readFileSync(path.join(here, "..", "blockers", path.basename(entry.path)));
  assert.equal(buffer.length, entry.bytes);
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  return buffer;
}

function reviewedUntrackedCoordinationReportBytes() {
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const buffer = inflateRawSync(Buffer.from(REVIEWED_UNTRACKED_COORDINATION_REPORT_FIXTURE_DEFLATE_BASE64, "base64"));
  assert.equal(buffer.length, entry.bytes);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  return buffer;
}

function writeReviewedUntrackedCoordinationReport(root, {
  relativePath = REVIEWED_UNTRACKED_COORDINATION_REPORT.path,
  buffer = reviewedUntrackedCoordinationReportBytes(),
  mode = REVIEWED_UNTRACKED_COORDINATION_REPORT.mode
} = {}) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  fs.chmodSync(absolutePath, mode);
  return absolutePath;
}

function commitFixtureBlob(fixture, relativePath, buffer, { executable = false } = {}) {
  const absolutePath = path.join(fixture.repo, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  fs.chmodSync(absolutePath, executable ? 0o755 : 0o644);
  git(fixture.repo, "add", "--", relativePath);
  git(fixture.repo, "commit", "-m", "reviewed legacy stage0 fixture");
  return absolutePath;
}

function fixtureWorktree(fixture) {
  return {
    branch: "main",
    head: git(fixture.repo, "rev-parse", "HEAD"),
    path: fixture.repo
  };
}

function fixtureLinkedWorktree(fixture) {
  return {
    branch: "feature/archive",
    head: git(fixture.linked, "rev-parse", "HEAD"),
    path: fixture.linked
  };
}

function run(script, fixture, extraEnv = {}, timeout = TEST_CHILD_TIMEOUT_MS) {
  return spawnSync(process.execPath, [script, "--json"], {
    cwd: fixture.repo,
    env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, ...extraEnv },
    encoding: "utf8",
    timeout
  });
}

function runFrom(script, fixture, cwd, extraEnv = {}, timeout = TEST_CHILD_TIMEOUT_MS) {
  return spawnSync(process.execPath, [script, "--json"], {
    cwd,
    env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, ...extraEnv },
    encoding: "utf8",
    timeout
  });
}

function runAsync(script, fixture, extraEnv = {}) {
  const child = spawn(process.execPath, [script, "--json"], {
    cwd: fixture.repo,
    detached: true,
    env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const terminate = () => {
    if (child.exitCode !== null) return;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  };
  const timeout = setTimeout(terminate, TEST_CHILD_TIMEOUT_MS);
  return {
    child,
    terminate,
    completed: new Promise((resolve) => child.once("close", (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    }))
  };
}

function runAsyncFrom(script, fixture, cwd, extraEnv = {}) {
  const child = spawn(process.execPath, [script, "--json"], {
    cwd,
    detached: true,
    env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const terminate = () => {
    if (child.exitCode !== null) return;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  };
  const timeout = setTimeout(terminate, TEST_CHILD_TIMEOUT_MS);
  return {
    child,
    terminate,
    completed: new Promise((resolve) => child.once("close", (status) => {
      clearTimeout(timeout);
      resolve({ status, stdout, stderr });
    }))
  };
}

async function waitForPath(absolutePath, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(absolutePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for fixture signal: ${absolutePath}`);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function withDirectoryFsyncFailures(failureOrdinals, targetDirectory, callback) {
  const failures = new Set(failureOrdinals);
  const originalFsyncSync = fs.fsyncSync;
  const targetStat = fs.statSync(targetDirectory);
  let directoryFsyncs = 0;
  fs.fsyncSync = (descriptor) => {
    const descriptorStat = fs.fstatSync(descriptor);
    if (descriptorStat.isDirectory()
      && descriptorStat.dev === targetStat.dev && descriptorStat.ino === targetStat.ino) {
      directoryFsyncs += 1;
      if (failures.has(directoryFsyncs)) {
        throw new Error(`simulated directory fsync failure ${directoryFsyncs}`);
      }
    }
    return originalFsyncSync(descriptor);
  };
  try {
    return callback();
  } finally {
    fs.fsyncSync = originalFsyncSync;
  }
}

function withRecoveryJournalDeletionFsyncFailure(journalPath, reportsDirectory, callback) {
  const originalFsyncSync = fs.fsyncSync;
  const originalRmSync = fs.rmSync;
  const reportsStat = fs.statSync(reportsDirectory);
  let journalDeleted = false;
  fs.rmSync = (absolutePath, ...args) => {
    const result = originalRmSync(absolutePath, ...args);
    if (absolutePath === journalPath) journalDeleted = true;
    return result;
  };
  fs.fsyncSync = (descriptor) => {
    const descriptorStat = fs.fstatSync(descriptor);
    if (journalDeleted && descriptorStat.isDirectory()
      && descriptorStat.dev === reportsStat.dev && descriptorStat.ino === reportsStat.ino) {
      journalDeleted = false;
      throw new Error("simulated recovery journal deletion fsync failure");
    }
    return originalFsyncSync(descriptor);
  };
  try {
    return callback();
  } finally {
    fs.rmSync = originalRmSync;
    fs.fsyncSync = originalFsyncSync;
  }
}

async function makeRollbackRecoveryFixture(parent, name) {
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const evidenceRoot = path.join(parent, name);
  const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = `${name}.json`;
  const reportPath = writeEvidenceReport({
    evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const oldBytes = fs.readFileSync(reportPath);
  const prepared = prepareEvidenceReport({
    evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  assert.throws(
    () => withDirectoryFsyncFailures([1, 2], path.dirname(reportPath), () => commitEvidenceReport(prepared)),
    /rollback.*recovery/i
  );
  abortEvidenceReport(prepared);
  const reportsDirectory = path.dirname(reportPath);
  const journalNames = fs.readdirSync(reportsDirectory).filter((entry) => entry.startsWith(`${filename}.recovery-`));
  assert.equal(journalNames.length, 1);
  return {
    evidenceRoot,
    filename,
    journalName: journalNames[0],
    journalPath: path.join(reportsDirectory, journalNames[0]),
    marker,
    oldBytes,
    reportPath,
    reportsDirectory,
    writeEvidenceReport
  };
}

function leavePreparedReportInChild({ evidenceRoot, evidenceRootId, filename, payload, promotionStage = null }) {
  const source = `
    import fs from "node:fs";
    import { prepareEvidenceReport } from ${JSON.stringify(libraryUrl)};
    const prepared = prepareEvidenceReport({
      evidenceRoot: process.env.TEST_EVIDENCE_ROOT,
      evidenceRootId: process.env.TEST_EVIDENCE_ROOT_ID,
      filename: process.env.TEST_REPORT_FILENAME,
      payload: JSON.parse(process.env.TEST_REPORT_PAYLOAD)
    });
    if (process.env.TEST_PROMOTION_STAGE === "rewrite-candidate") {
      const bytes = Buffer.from(JSON.stringify({ state: "rewritten-before-journal-update" }, null, 2) + "\\n");
      fs.ftruncateSync(prepared.descriptor, 0);
      fs.writeSync(prepared.descriptor, bytes, 0, bytes.length, 0);
      fs.ftruncateSync(prepared.descriptor, bytes.length);
      fs.fsyncSync(prepared.descriptor);
    }
    if (process.env.TEST_PROMOTION_STAGE !== "none") {
      const journal = JSON.parse(fs.readFileSync(prepared.recoveryPath, "utf8"));
      journal.state = "promotion-in-progress";
      const bytes = Buffer.from(JSON.stringify(journal, null, 2) + "\\n");
      fs.ftruncateSync(prepared.recoveryDescriptor, 0);
      fs.writeSync(prepared.recoveryDescriptor, bytes, 0, bytes.length, 0);
      fs.ftruncateSync(prepared.recoveryDescriptor, bytes.length);
      fs.fsyncSync(prepared.recoveryDescriptor);
      if (process.env.TEST_PROMOTION_STAGE === "after-rename") {
        fs.renameSync(prepared.temporaryPath, prepared.reportPath);
      }
    }
    process.exit(0);
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    encoding: "utf8",
    env: {
      ...process.env,
      TEST_EVIDENCE_ROOT: evidenceRoot,
      TEST_EVIDENCE_ROOT_ID: evidenceRootId,
      TEST_PROMOTION_STAGE: promotionStage ?? "none",
      TEST_REPORT_FILENAME: filename,
      TEST_REPORT_PAYLOAD: JSON.stringify(payload)
    },
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function spawnHeldPreparedReport({ evidenceRoot, evidenceRootId, filename, readyPath }) {
  const source = `
    import fs from "node:fs";
    import { prepareEvidenceReport } from ${JSON.stringify(libraryUrl)};
    const prepared = prepareEvidenceReport({
      evidenceRoot: process.env.TEST_EVIDENCE_ROOT,
      evidenceRootId: process.env.TEST_EVIDENCE_ROOT_ID,
      filename: process.env.TEST_REPORT_FILENAME,
      payload: { state: "held-by-live-owner" }
    });
    fs.writeFileSync(process.env.TEST_READY_PATH, JSON.stringify({
      backupPath: prepared.backupPath,
      lockPath: prepared.ownershipLock.lockPath,
      recoveryPath: prepared.recoveryPath,
      reportPath: prepared.reportPath,
      temporaryPath: prepared.temporaryPath
    }));
    setInterval(() => {}, 1000);
  `;
  return spawn(process.execPath, ["--input-type=module", "-e", source], {
    env: {
      ...process.env,
      TEST_EVIDENCE_ROOT: evidenceRoot,
      TEST_EVIDENCE_ROOT_ID: evidenceRootId,
      TEST_READY_PATH: readyPath,
      TEST_REPORT_FILENAME: filename
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function waitForCondition(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return predicate();
}

function dirtyFixture(fixture) {
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "staged\n");
  git(fixture.linked, "add", "tracked.txt");
  fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "unstaged\n");
  for (const name of ["空 格.txt", "quote'file.txt", "line\nbreak.txt"]) {
    fs.writeFileSync(path.join(fixture.linked, name), `payload:${name}\n`);
  }
}

function legacyV2SnapshotFingerprint(snapshot, fingerprint) {
  const {
    buffers: _buffers,
    cleanup: _cleanup,
    currentStateFingerprint: _currentStateFingerprint,
    inventory: _inventory,
    reviewedProtectedOverlayPaths: _reviewedProtectedOverlayPaths,
    secretScanner: _secretScanner,
    ...legacyBasis
  } = snapshot;
  return fingerprint(legacyBasis);
}

async function downgradeFixtureArchiveSetToV2(fixture) {
  const {
    collectWorktreeSnapshot,
    fingerprint,
    renderArchiveManifestMarkdown
  } = await import(libraryUrl);
  const archive = path.join(fixture.repo, "coordination", "release-intake", "archive");
  const linkedPath = path.join(archive, "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const linked = JSON.parse(fs.readFileSync(linkedPath, "utf8"));
  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: true });
  const legacyCurrentStateFingerprint = legacyV2SnapshotFingerprint(snapshot, fingerprint);
  snapshot.cleanup();
  assert.equal(linked.archivedWorktrees.length, 1);
  const legacyBasis = {
    schemaVersion: 2,
    dirtyMapStatusSignature: linked.dirtyMapStatusSignature,
    expandedStatusEntries: linked.expandedStatusEntries,
    entries: [legacyCurrentStateFingerprint]
  };
  const legacyArchiveSetFingerprint = fingerprint(legacyBasis);
  const currentArchiveSetFingerprint = linked.archiveSetFingerprint;
  const legacyEntries = linked.archivedWorktrees.map((entry) => ({
    ...entry,
    schemaVersion: 2,
    currentStateFingerprint: legacyCurrentStateFingerprint,
    archiveSetFingerprint: legacyArchiveSetFingerprint,
    secretScanner: Object.fromEntries(
      Object.entries(entry.secretScanner).filter(([key]) => key !== "reviewedProtectedOverlayPaths")
    ),
    artifacts: Object.fromEntries(Object.entries(entry.artifacts).map(([key, artifact]) => [
      key,
      artifact === null ? null : {
        ...artifact,
        path: artifact.path.replace(
          `sets/${currentArchiveSetFingerprint}/`,
          `sets/${legacyArchiveSetFingerprint}/`
        )
      }
    ]))
  }));
  const currentSet = path.join(fixture.evidenceRoot, "sets", currentArchiveSetFingerprint);
  const legacySet = path.join(fixture.evidenceRoot, "sets", legacyArchiveSetFingerprint);
  fs.renameSync(currentSet, legacySet);
  const marker = JSON.parse(fs.readFileSync(path.join(fixture.evidenceRoot, ".mais-evidence-root.json"), "utf8"));
  const legacyIndex = {
    schemaVersion: 2,
    evidenceRootId: marker.rootId,
    archiveSetFingerprint: legacyArchiveSetFingerprint,
    basis: legacyBasis,
    entries: legacyEntries
  };
  fs.writeFileSync(path.join(legacySet, "archive-set.json"), `${JSON.stringify(legacyIndex, null, 2)}\n`);
  fs.chmodSync(path.join(legacySet, "archive-set.json"), 0o600);

  const manifestBase = {
    schemaVersion: 2,
    generatedAt: linked.generatedAt,
    evidenceRootId: linked.evidenceRootId,
    archiveSetFingerprint: legacyArchiveSetFingerprint,
    dirtyMapStatusSignature: linked.dirtyMapStatusSignature,
    expandedStatusEntries: linked.expandedStatusEntries
  };
  const manifests = {
    linked: { ...manifestBase, archivedWorktrees: legacyEntries },
    clean: {
      ...manifestBase,
      archivedBranches: legacyEntries.filter((entry) => entry.archiveKind === "clean-diverged-branch")
    },
    dirty: {
      ...manifestBase,
      archivedBranches: legacyEntries.filter((entry) => (
        entry.archiveKind === "dirty-worktree"
        && entry.divergence.behind + entry.divergence.ahead > 0
      ))
    }
  };
  for (const [kind, manifest, basename] of [
    ["linked", manifests.linked, "2026-06-30-A25-linked-worktree-archive-manifest"],
    ["clean", manifests.clean, "2026-06-30-A25-clean-diverged-branch-archive-manifest"],
    ["dirty", manifests.dirty, "2026-06-30-A25-dirty-diverged-branch-archive-manifest"]
  ]) {
    const jsonPath = path.join(archive, `${basename}.json`);
    const markdownPath = path.join(archive, `${basename}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(markdownPath, renderArchiveManifestMarkdown(kind, manifest));
    fs.chmodSync(jsonPath, 0o600);
    fs.chmodSync(markdownPath, 0o600);
  }
}

function repositoryArchiveManifestPaths(fixture) {
  const archive = path.join(fixture.repo, "coordination", "release-intake", "archive");
  return [
    "2026-06-30-A25-linked-worktree-archive-manifest.json",
    "2026-06-30-A25-linked-worktree-archive-manifest.md",
    "2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
    "2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json",
    "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md"
  ].map((name) => path.join(archive, name));
}

function snapshotFileBytes(paths) {
  return new Map(paths.map((absolutePath) => [absolutePath, fs.readFileSync(absolutePath)]));
}

function assertFileBytesUnchanged(snapshot) {
  for (const [absolutePath, buffer] of snapshot) assert.deepEqual(fs.readFileSync(absolutePath), buffer);
}

function legacyTextBuffer(value, fallback) {
  const text = String(value ?? "").replace(/\s+$/u, "") || fallback;
  return Buffer.from(`${text}\n`);
}

function writeLegacyV1Evidence(fixture) {
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "legacy dirty\n");
  fs.writeFileSync(path.join(fixture.linked, "legacy-untracked.txt"), "legacy payload\n");
  const archive = path.join(fixture.repo, "coordination", "release-intake", "archive");
  fs.mkdirSync(archive, { recursive: true });
  const prefixRelative = "coordination/release-intake/archive/feature-archive";
  const prefix = path.join(fixture.repo, prefixRelative);
  const statusText = git(fixture.linked, "status", "--porcelain=v1", "-uall");
  const untrackedText = git(fixture.linked, "ls-files", "--others", "--exclude-standard");
  const patch = legacyTextBuffer(execFileSync("git", ["diff", "--binary"], { cwd: fixture.linked, timeout: TEST_CHILD_TIMEOUT_MS }), "");
  const diffstat = legacyTextBuffer(git(fixture.linked, "diff", "--stat"), "No tracked diff.");
  const status = legacyTextBuffer(statusText, "clean");
  const untracked = legacyTextBuffer(untrackedText, "none");
  fs.writeFileSync(`${prefix}.status.txt`, status);
  fs.writeFileSync(`${prefix}.diffstat.txt`, diffstat);
  fs.writeFileSync(`${prefix}.patch`, patch);
  fs.writeFileSync(`${prefix}.untracked.txt`, untracked);
  const listPath = `${prefix}.untracked.tar-list`;
  const tarPath = `${prefix}.untracked.tar.gz`;
  fs.writeFileSync(listPath, untracked);
  execFileSync("tar", ["-czf", tarPath, "-C", fixture.linked, "-T", listPath], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  fs.rmSync(listPath);
  const [behind, ahead] = git(fixture.linked, "rev-list", "--left-right", "--count", "main...HEAD").split(/\s+/u).map(Number);
  const statusEntries = statusText.split("\n").filter(Boolean).length;
  const untrackedEntries = untrackedText.split("\n").filter(Boolean).length;
  const signature = "fixture-signature";
  const expandedStatusEntries = statusEntries;
  fs.writeFileSync(path.join(fixture.repo, "coordination", "release-intake", "latest-A25-dirty-tree-map.json"), `${JSON.stringify({
    statusSignature: signature,
    statusCounts: { expandedStatusEntries }
  }, null, 2)}\n`);
  const entry = {
    branch: "feature/archive",
    path: fs.realpathSync(fixture.linked),
    lifecycleState: "dirty-active-review-required",
    head: git(fixture.linked, "rev-parse", "HEAD"),
    divergence: { behind, ahead },
    statusEntries,
    patchBytes: patch.length,
    patchSha256: crypto.createHash("sha256").update(patch).digest("hex"),
    untrackedEntries,
    untrackedArchiveBytes: fs.statSync(tarPath).size,
    untrackedArchiveSha256: crypto.createHash("sha256").update(fs.readFileSync(tarPath)).digest("hex"),
    prefix: prefixRelative,
    archiveKind: "dirty-worktree"
  };
  const base = { generatedAt: new Date().toISOString(), dirtyMapStatusSignature: signature, expandedStatusEntries };
  const linked = { ...base, archivedWorktrees: [entry] };
  fs.writeFileSync(path.join(archive, "2026-06-30-A25-linked-worktree-archive-manifest.json"), `${JSON.stringify(linked, null, 2)}\n`);
  fs.writeFileSync(path.join(archive, "2026-06-30-A25-linked-worktree-archive-manifest.md"), "legacy v1\n");
  let dirtyCompanion = null;
  if (behind > 0 || ahead > 0) {
    const branchPrefixRelative = `${prefixRelative}.dirty-diverged`;
    const branchPrefix = path.join(fixture.repo, branchPrefixRelative);
    const branchArtifacts = {
      aheadLog: `${branchPrefixRelative}.ahead-log.txt`,
      nameStatus: `${branchPrefixRelative}.name-status.txt`,
      diffstat: `${branchPrefixRelative}.diffstat.txt`,
      patch: `${branchPrefixRelative}.patch`,
      status: `${branchPrefixRelative}.status.txt`,
      untracked: `${branchPrefixRelative}.untracked.txt`
    };
    const branchPatch = legacyTextBuffer(execFileSync("git", ["diff", "--binary", "main...HEAD"], { cwd: fixture.linked, timeout: TEST_CHILD_TIMEOUT_MS }), "");
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.aheadLog), legacyTextBuffer(git(fixture.linked, "log", "--oneline", "--decorate", "main..HEAD"), "No commits ahead of main."));
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.nameStatus), legacyTextBuffer(git(fixture.linked, "diff", "--name-status", "main...HEAD"), "No branch delta."));
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.diffstat), legacyTextBuffer(git(fixture.linked, "diff", "--stat", "main...HEAD"), "No branch delta."));
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.patch), branchPatch);
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.status), status);
    fs.writeFileSync(path.join(fixture.repo, branchArtifacts.untracked), untracked);
    dirtyCompanion = {
      branch: entry.branch,
      path: entry.path,
      archiveKind: "dirty-diverged-branch",
      head: entry.head,
      divergence: entry.divergence,
      statusEntries,
      untrackedEntries,
      ...branchArtifacts,
      patchBytes: branchPatch.length,
      patchSha256: crypto.createHash("sha256").update(branchPatch).digest("hex"),
      prefix: branchPrefixRelative,
      metadata: `${branchPrefixRelative}.metadata.json`
    };
    const { prefix: _prefix, metadata: _metadata, ...canonicalMetadata } = dirtyCompanion;
    fs.writeFileSync(path.join(fixture.repo, dirtyCompanion.metadata), `${JSON.stringify(canonicalMetadata, null, 2)}\n`);
  }
  for (const stem of ["clean-diverged-branch", "dirty-diverged-branch"]) {
    const archivedBranches = stem === "dirty-diverged-branch" && dirtyCompanion ? [dirtyCompanion] : [];
    fs.writeFileSync(path.join(archive, `2026-06-30-A25-${stem}-archive-manifest.json`), `${JSON.stringify({ ...base, archivedBranches }, null, 2)}\n`);
    fs.writeFileSync(path.join(archive, `2026-06-30-A25-${stem}-archive-manifest.md`), "legacy v1\n");
  }
  return { archive, prefix, tarPath, entry, dirtyCompanion };
}

test("explicit evidence roots are absolute, external, marker-bound, and private", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { resolveEvidenceRoot, ensureEvidenceRoot } = await import(libraryUrl);
  assert.throws(() => resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git"), explicitRoot: "relative" }), /absolute/i);
  assert.throws(() => resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git"), explicitRoot: path.join(fixture.repo, "archive") }), /repository|worktree/i);
  assert.throws(() => resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git"), explicitRoot: path.parse(fixture.repo).root }), /repository|worktree/i);
  assert.throws(() => resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git"), explicitRoot: fixture.linked, worktreeRoots: [fixture.linked] }), /repository|worktree/i);
  fs.mkdirSync(fixture.evidenceRoot);
  fs.writeFileSync(path.join(fixture.evidenceRoot, "foreign.txt"), "x");
  assert.throws(() => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }), /marker/i);
  fs.rmSync(fixture.evidenceRoot, { recursive: true });
  assert.throws(() => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: "repo" }), /repository.*id|sha256/i);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  assert.match(marker.rootId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }), marker);
  assert.equal(fs.statSync(fixture.evidenceRoot).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(fixture.evidenceRoot, ".mais-evidence-root.json")).mode & 0o777, 0o600);
  fs.writeFileSync(path.join(fixture.evidenceRoot, "foreign.bin"), "x");
  assert.throws(() => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }), /unexpected|managed/i);
  fs.rmSync(path.join(fixture.evidenceRoot, "foreign.bin"));
  const markerPath = path.join(fixture.evidenceRoot, ".mais-evidence-root.json");
  fs.writeFileSync(markerPath, `${JSON.stringify({ ...marker, unexpected: true })}\n`);
  assert.throws(() => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }), /marker.*(?:field|schema|invalid)/i);
  fs.writeFileSync(markerPath, `${JSON.stringify({ ...marker, rootId: "-".repeat(36) })}\n`);
  assert.throws(() => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }), /marker.*(?:uuid|match|invalid)/i);
  fs.writeFileSync(markerPath, `${JSON.stringify(marker)}\n`);
  const symlink = path.join(fixture.parent, "evidence-link");
  fs.symlinkSync(fixture.evidenceRoot, symlink);
  assert.throws(() => resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git"), explicitRoot: symlink }), /symlink/i);
});

test("evidence root marker must be a direct regular file", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot } = await import(libraryUrl);
  fs.mkdirSync(fixture.evidenceRoot);
  fs.mkdirSync(path.join(fixture.evidenceRoot, ".mais-evidence-root.json"));
  assert.throws(
    () => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }),
    /marker.*regular/i
  );
});

test("evidence root creation rejects a dangling marker symlink without creating its outside target", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot } = await import(libraryUrl);
  fs.mkdirSync(fixture.evidenceRoot);
  const outsideTarget = path.join(fixture.parent, "outside-marker-target.json");
  fs.symlinkSync(outsideTarget, path.join(fixture.evidenceRoot, ".mais-evidence-root.json"));
  assert.equal(fs.existsSync(outsideTarget), false);
  assert.throws(
    () => ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID }),
    /marker.*(?:symlink|regular|unsafe)/i
  );
  assert.equal(fs.existsSync(outsideTarget), false);
});

test("secret scanner rejects paths, private keys, tokens, and unknown binary without leaking values", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanArchivePath, scanBuffer, scanFile } = await import(libraryUrl);
  assert.throws(() => scanArchivePath("All API Keys.docx"), /secret-looking path/i);
  assert.throws(() => scanArchivePath(".env.local"), /secret-looking path/i);
  assert.doesNotThrow(() => scanArchivePath(".env.local.example"));
  const token = providerTokenFixture("A".repeat(40));
  assert.throws(() => scanBuffer(Buffer.from(`OPENAI_API_KEY=${token}`), { displayPath: "config.txt" }), (error) => {
    assert.match(error.message, /high-confidence token/i);
    assert.doesNotMatch(error.message, new RegExp(token));
    return true;
  });
  assert.throws(() => scanBuffer(Buffer.from(`DEEPSEEK_API_KEY=${"Q".repeat(48)}`), { displayPath: "provider.txt" }), /high-confidence token assignment/i);
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "const credentials = dashboardSmokeCredentials(args);",
    "const config = {",
    "  password: process.env.DASHBOARD_SMOKE_PASSWORD || \"\",",
    "  auth_password: credentials.password,",
    "  backup_password: dashboardSmokeCredentials(args)",
    "};"
  ].join("\n")), { displayPath: "dashboard-smoke.ts" }));
  for (const malicious of [
    `password: process.env.DASHBOARD_SMOKE_PASSWORD || "${"L".repeat(40)}"`,
    `password: process.env.DASHBOARD_SMOKE_PASSWORD ?? '${"N".repeat(40)}'`,
    `password: credentials.password + "${"C".repeat(40)}"`,
    `password: dashboardSmokeCredentials("${"A".repeat(40)}")`,
    `password: \`\${process.env.DASHBOARD_SMOKE_PASSWORD}-${"T".repeat(40)}\``,
    `password: \`\${process.env.DASHBOARD_SMOKE_PASSWORD || "${"I".repeat(40)}"}\``,
    `password:\n  process.env.DASHBOARD_SMOKE_PASSWORD &&\n  "${"M".repeat(40)}"`,
    `password: (\n  process.env.DASHBOARD_SMOKE_PASSWORD // safe reference\n  || "${"P".repeat(40)}"\n)`
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(`const config = { ${malicious} };`), { displayPath: "dashboard-smoke.ts" }), /token assignment/i);
  }
  for (const [source, displayPath] of [
    [`function connect(password = "${"D".repeat(40)}") {}`, "parameter.ts"],
    [`config.password = "${"B".repeat(40)}";`, "assignment.js"],
    [`config.password ||= "${"O".repeat(40)}";`, "logical-or-assignment.js"],
    [`config.password ??= "${"Q".repeat(40)}";`, "nullish-assignment.js"],
    [`config.password += "${"G".repeat(40)}";`, "plus-assignment.js"],
    [`(config.password as string) = "${"A".repeat(40)}";`, "as-wrapped-assignment.ts"],
    [`config.password! ||= "${"B".repeat(40)}";`, "non-null-wrapped-assignment.ts"],
    [`(<string>config.password) ??= "${"C".repeat(40)}";`, "type-assertion-wrapped-assignment.ts"],
    [`((config.password) satisfies string)! = "${"D".repeat(40)}";`, "nested-transparent-assignment.ts"],
    [`class Vault { #password = "${"F".repeat(40)}"; }`, "private-property.ts"],
    [`class Vault { #password = process.env.PASSWORD; rotate() { this.#password ||= "${"R".repeat(40)}"; } }`, "private-assignment.ts"],
    [`let password; ({ password = "${"U".repeat(40)}" } = source);`, "shorthand-assignment.ts"],
    [`enum Secrets { password = "${"I".repeat(40)}" }`, "enum-member.ts"],
    [`class Secrets { get password() { return "${"Z".repeat(40)}"; } }`, "getter.ts"],
    [`class Secrets { set password(value) { this.cached = "${"T".repeat(40)}"; return "updated"; } }`, "setter.ts"],
    [`class Secrets { password() { return "${"M".repeat(40)}"; } }`, "method.ts"],
    [`function getPassword() { return "${"D".repeat(40)}"; }`, "secret-function-declaration.ts"],
    [`const helper = function getPassword() { return "${"E".repeat(40)}"; };`, "secret-function-expression.ts"],
    [`const readPassword = function () { return "${"G".repeat(40)}"; };`, "assigned-secret-function-expression.ts"],
    [`const getPassword = () => "${"F".repeat(40)}";`, "secret-arrow-assignment.ts"],
    [`config["password"] = "${"L".repeat(40)}";`, "element-assignment.ts"],
    [`const config = { ["password"]: "${"N".repeat(40)}" };`, "computed-property.ts"],
    [`const { password: localPassword = "${"H".repeat(40)}" } = source;`, "binding-property.ts"],
    [`const { source: client_secret = "${"E".repeat(40)}" } = input;`, "binding-name.ts"],
    [`const config = { dbPassword: "${"W".repeat(40)}", clientSecret: "${"X".repeat(40)}", accessToken: "${"Y".repeat(40)}", apiKey: "${"V".repeat(40)}" };`, "camel-secrets.ts"],
    [`const view = <Login password={"${"J".repeat(40)}"} />;`, "login.tsx"],
    [`const config = { password: "${"K".repeat(10)}" + "${"L".repeat(10)}" };`, "concat.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`class Display { get displayName() { return "${"B".repeat(40)}"; } }`), { displayPath: "nonsecret-accessor.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`function getDisplayName() { return "${"C".repeat(40)}"; } const helper = () => "${"D".repeat(40)}";`), { displayPath: "nonsecret-functions.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`function setPassword(value) { throw new Error("${"E".repeat(40)}"); } class Vault { set password(value) { console.error("${"F".repeat(40)}"); } }`), { displayPath: "secret-function-diagnostics.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`const setPassword = () => { console.error("${"G".repeat(40)}"); }; const getPassword = function () { throw new Error("${"H".repeat(40)}"); };`), { displayPath: "assigned-secret-function-diagnostics.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`function setPassword() { return "${"I".repeat(40)}"; } class Vault { set password(value) { return "${"J".repeat(40)}"; } }`), { displayPath: "setter-status-return.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`const key = dynamicName; const config = { [key]: "${"B".repeat(40)}" };`), { displayPath: "dynamic-computed.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`const config = { password: process.env.DASHBOARD_SMOKE_PASSWORD }; // password: "${"Z".repeat(40)}"`), { displayPath: "comments.ts" }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from(`// benign note ${"B".repeat(60)}`), { displayPath: "comments.ts" }));
  assert.throws(() => scanBuffer(Buffer.from(`// leaked ${providerTokenFixture("R".repeat(40))}`), { displayPath: "comments.ts" }), /high-confidence token/i);
  assert.throws(() => scanBuffer(Buffer.from(`// ${pemHeaderFixture()}`), { displayPath: "comments.ts" }), /private-key header/i);
  assert.throws(() => scanBuffer(Buffer.from("const config = { password: ("), { displayPath: "broken.ts" }), /parse failed closed/i);
  assert.throws(() => scanBuffer(Buffer.from(`const config = { password: "${"S".repeat(40)}" };`), { displayPath: "dashboard-smoke.ts" }), /token assignment/i);
  assert.throws(() => scanBuffer(Buffer.from(`DASHBOARD_SMOKE_PASSWORD=${"U".repeat(40)}`), { displayPath: "dashboard.env.example" }), /token assignment/i);
  assert.throws(() => scanBuffer(Buffer.from(`${pemHeaderFixture()}\nabc`), { displayPath: "note.txt" }), /private-key header/i);
  assert.doesNotThrow(() => scanBuffer(Buffer.from("OPENAI_API_KEY=<your-key-here>\nTOKEN=placeholder"), { displayPath: "example.txt" }));
  assert.throws(() => scanBuffer(Buffer.from([0, 1, 2, 3, 4]), { displayPath: "unknown.bin" }), /unreviewed binary/i);
  assert.doesNotThrow(() => scanBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), { displayPath: "reviewed.png" }));
  assert.throws(() => scanBuffer(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(token)
  ]), { displayPath: "secret.png" }), /high-confidence token/i);
  assert.throws(() => scanBuffer(Buffer.from([0, 1, 2, 3, 4]), { displayPath: "forged.png" }), /magic|unreviewed binary/i);
  assert.throws(() => scanBuffer(Buffer.from("not really an image"), { displayPath: "forged.png" }), /magic/i);
  assert.throws(() => scanBuffer(Buffer.from(`%PDF-1.7\n${token}\n%%EOF`, "latin1"), { displayPath: "secret.pdf" }), /high-confidence token/i);
  const ooxmlRoot = path.join(fixture.parent, "ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), `<w:t>${token}</w:t>`);
  const docx = path.join(fixture.parent, "sample.docx");
  execFileSync("zip", ["-q", "-r", docx, "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.throws(() => scanFile(docx, "sample.docx"), /high-confidence token/i);
  const embeddedRoot = path.join(fixture.parent, "embedded-ooxml");
  fs.mkdirSync(path.join(embeddedRoot, "word", "embeddings"), { recursive: true });
  fs.writeFileSync(path.join(embeddedRoot, "word", "document.xml"), "<w:t>safe document</w:t>");
  fs.writeFileSync(path.join(embeddedRoot, "word", "embeddings", "object.bin"), Buffer.concat([Buffer.from([0]), Buffer.from(token)]));
  const embeddedDocx = path.join(fixture.parent, "embedded.docx");
  execFileSync("zip", ["-q", "-r", embeddedDocx, "word"], { cwd: embeddedRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.throws(() => scanFile(embeddedDocx, "embedded.docx"), /high-confidence token|unreviewed binary/i);
});

test("collectWorktreeSnapshot accepts all exact reviewed legacy stage0 entries", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  for (const [index, entry] of REVIEWED_LEGACY_STAGE0_ENTRIES.entries()) {
    await t.test(`reviewed registry entry ${index + 1}`, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      const buffer = reviewedLegacyStage0Bytes(entry);
      const absolutePath = commitFixtureBlob(fixture, entry.path, buffer);
      assert.equal(git(fixture.repo, "hash-object", absolutePath), entry.objectId);
      assert.doesNotThrow(() => collectWorktreeSnapshot(fixtureWorktree(fixture), { includeTar: false }));
    });
  }
});

test("reviewed legacy stage0 allowance rejects any different blob, path, or mode", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const variants = [
    ...REVIEWED_LEGACY_STAGE0_ENTRIES.map((entry) => ({
      path: entry.path,
      buffer: Buffer.concat([reviewedLegacyStage0Bytes(entry), Buffer.from("\nreviewed fixture mutation\n")]),
      executable: false
    })),
    {
      path: "coordination/blockers/reviewed-credentials-copy.md",
      buffer: reviewedLegacyStage0Bytes(),
      executable: false
    },
    {
      path: REVIEWED_LEGACY_STAGE0_ENTRY.path,
      buffer: reviewedLegacyStage0Bytes(),
      executable: true
    }
  ];
  for (const variant of variants) {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
    commitFixtureBlob(fixture, variant.path, variant.buffer, { executable: variant.executable });
    assert.throws(
      () => collectWorktreeSnapshot(fixtureWorktree(fixture), { includeTar: false }),
      /secret-looking path/i
    );
  }
});

test("reviewed legacy stage0 allowance rejects staged and working-tree content changes", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const buffer = reviewedLegacyStage0Bytes();
  for (const staged of [false, true]) {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
    const absolutePath = commitFixtureBlob(fixture, REVIEWED_LEGACY_STAGE0_ENTRY.path, buffer);
    fs.appendFileSync(absolutePath, "\nreviewed fixture mutation\n");
    if (staged) git(fixture.repo, "add", "--", REVIEWED_LEGACY_STAGE0_ENTRY.path);
    assert.throws(
      () => collectWorktreeSnapshot(fixtureWorktree(fixture), { includeTar: false }),
      /secret-looking path/i
    );
  }
});

test("reviewed legacy stage0 allowance never applies to historical, untracked, or tar paths", async (t) => {
  const { collectWorktreeSnapshot, verifyTarPayload } = await import(libraryUrl);
  const buffer = reviewedLegacyStage0Bytes();

  const historicalFixture = makeFixture();
  t.after(() => fs.rmSync(historicalFixture.parent, { recursive: true, force: true }));
  commitFixtureBlob(historicalFixture, REVIEWED_LEGACY_STAGE0_ENTRY.path, buffer);
  git(historicalFixture.repo, "checkout", "-b", "feature/reviewed-history");
  const safeCurrentPath = "coordination/blockers/reviewed-legacy-note.md";
  fs.mkdirSync(path.dirname(path.join(historicalFixture.repo, safeCurrentPath)), { recursive: true });
  git(historicalFixture.repo, "mv", REVIEWED_LEGACY_STAGE0_ENTRY.path, safeCurrentPath);
  git(historicalFixture.repo, "commit", "-m", "rename reviewed legacy fixture");
  assert.throws(
    () => collectWorktreeSnapshot(fixtureWorktree(historicalFixture), { includeTar: false }),
    /secret-looking path/i
  );

  const untrackedFixture = makeFixture();
  t.after(() => fs.rmSync(untrackedFixture.parent, { recursive: true, force: true }));
  const untrackedPath = path.join(untrackedFixture.repo, REVIEWED_LEGACY_STAGE0_ENTRY.path);
  fs.mkdirSync(path.dirname(untrackedPath), { recursive: true });
  fs.writeFileSync(untrackedPath, buffer);
  assert.throws(
    () => collectWorktreeSnapshot(fixtureWorktree(untrackedFixture), { includeTar: false }),
    /secret-looking path/i
  );

  const tarFailures = [];
  verifyTarPayload(Buffer.alloc(0), [{
    path: REVIEWED_LEGACY_STAGE0_ENTRY.path,
    type: "file",
    mode: 0o644,
    size: buffer.length,
    sha256: REVIEWED_LEGACY_STAGE0_ENTRY.sha256
  }], "reviewed-legacy-tar", tarFailures);
  assert.ok(tarFailures.some((failure) => /secret-looking path/i.test(failure)));
});

test("current branch HEAD accepts the exact reviewed coordination report blob", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const absolutePath = writeReviewedUntrackedCoordinationReport(fixture.linked);
  git(fixture.linked, "add", "--", entry.path);
  git(fixture.linked, "commit", "-m", "add reviewed branch report");
  assert.equal(git(fixture.linked, "hash-object", absolutePath), entry.objectId);
  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false });
  t.after(() => snapshot.cleanup());
  assert.equal(snapshot.divergence.ahead, 1);
  assert.equal(snapshot.secretScanner.status, "passed");
});

test("legacy terminal patch metadata matcher is portable and exact", async () => {
  const { isReviewedLegacyTerminalPatchEntry } = await import(libraryUrl);
  assert.equal(typeof isReviewedLegacyTerminalPatchEntry, "function");
  for (const entry of REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES) {
    const exact = {
      headRevision: REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
      relativePath: entry.path,
      mode: entry.mode,
      type: "blob",
      objectId: entry.objectId
    };
    assert.equal(isReviewedLegacyTerminalPatchEntry(exact), true);
    for (const variant of [
      { ...exact, headRevision: "0".repeat(40) },
      { ...exact, relativePath: `${entry.path}.copy` },
      { ...exact, relativePath: entry.path.toUpperCase() },
      { ...exact, mode: "100755" },
      { ...exact, type: "tree" },
      { ...exact, objectId: "0".repeat(40) }
    ]) assert.equal(isReviewedLegacyTerminalPatchEntry(variant), false);
  }
});

test("legacy Office lock metadata matchers are portable and exact", async () => {
  const {
    isReviewedLegacyOfficeLockBranchHeadEntry,
    isReviewedLegacyOfficeLockInventory
  } = await import(libraryUrl);
  assert.equal(typeof isReviewedLegacyOfficeLockBranchHeadEntry, "function");
  assert.equal(typeof isReviewedLegacyOfficeLockInventory, "function");
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const branchExact = {
    headRevision: entry.headRevision,
    relativePath: entry.path,
    mode: entry.branchMode,
    type: "blob",
    objectId: entry.objectId
  };
  assert.equal(isReviewedLegacyOfficeLockBranchHeadEntry(branchExact), true);
  for (const variant of [
    { ...branchExact, headRevision: "0".repeat(40) },
    { ...branchExact, relativePath: `${entry.path}.copy` },
    { ...branchExact, relativePath: entry.path.toUpperCase() },
    { ...branchExact, mode: "100755" },
    { ...branchExact, type: "tree" },
    { ...branchExact, objectId: "0".repeat(40) }
  ]) assert.equal(isReviewedLegacyOfficeLockBranchHeadEntry(variant), false);

  const inventoryExact = {
    path: entry.path,
    type: "file",
    mode: entry.untrackedMode,
    size: entry.bytes,
    sha256: entry.sha256
  };
  assert.equal(isReviewedLegacyOfficeLockInventory(inventoryExact), true);
  for (const variant of [
    { ...inventoryExact, path: `${entry.path}.copy` },
    { ...inventoryExact, path: entry.path.toUpperCase() },
    { ...inventoryExact, type: "symlink", target: "safe-target.docx" },
    { ...inventoryExact, mode: 0o600 },
    { ...inventoryExact, size: entry.bytes + 1 },
    { ...inventoryExact, sha256: "0".repeat(64) },
    { ...inventoryExact, unexpected: true }
  ]) assert.equal(isReviewedLegacyOfficeLockInventory(variant), false);
});

test("opaque raw signature scanning covers Latin-1 UTF-16LE UTF-16BE and NUL-stripped ASCII", async (t) => {
  const { scanOpaqueRawSignatures } = await import(libraryUrl);
  assert.equal(typeof scanOpaqueRawSignatures, "function");
  const signatures = [
    { name: "private key", value: pemHeaderFixture(), expected: /private-key header/i },
    { name: "provider token", value: providerTokenFixture("A".repeat(40)), expected: /high-confidence token/i }
  ];
  const encodings = [
    { name: "Latin-1", encode: (value) => Buffer.from(value, "latin1") },
    { name: "UTF-16LE", encode: (value) => Buffer.from(value, "utf16le") },
    {
      name: "UTF-16LE offset 1",
      isolatesProviderOffset: true,
      encode: (value) => Buffer.concat([Buffer.from([0x41]), Buffer.from(value, "utf16le")])
    },
    {
      name: "UTF-16BE",
      encode: (value) => Buffer.from(Buffer.from(value, "utf16le")).swap16()
    },
    {
      name: "UTF-16BE offset 1",
      isolatesProviderOffset: true,
      encode: (value) => Buffer.concat([
        Buffer.from([0x41]),
        Buffer.from(Buffer.from(value, "utf16le")).swap16()
      ])
    },
    {
      name: "NUL-stripped ASCII",
      encode: (value) => Buffer.concat([...Buffer.from(value, "ascii")].map((byte) => Buffer.from([byte, 0, 0])))
    }
  ];
  for (const signature of signatures) {
    for (const encoding of encodings) {
      await t.test(`${signature.name} in ${encoding.name}`, () => {
        const encoded = encoding.encode(signature.value);
        if (signature.name === "provider token" && encoding.isolatesProviderOffset) {
          const nulStripped = Buffer.from([...encoded].filter((byte) => byte !== 0)).toString("latin1");
          assert.equal(nulStripped, `A${signature.value}`);
          assert.doesNotMatch(nulStripped, /\bsk-[A-Za-z0-9_-]{20,}/u);
        }
        assert.throws(
          () => scanOpaqueRawSignatures(
            encoded,
            "reviewed-legacy-office-lock/content.bin"
          ),
          (error) => {
            assert.match(error?.message ?? "", signature.expected);
            assert.doesNotMatch(error?.message ?? "", new RegExp(signature.value.replaceAll("-", "\\-")));
            return true;
          }
        );
      });
    }
  }
  assert.doesNotThrow(() => scanOpaqueRawSignatures(
    Buffer.from([0x00, 0x01, 0x02, 0x7f, 0x80, 0xff]),
    "reviewed-legacy-office-lock/content.bin"
  ));
  assert.throws(
    () => scanOpaqueRawSignatures(
      Buffer.alloc(1024 * 1024 + 1),
      "reviewed-legacy-office-lock/content.bin"
    ),
    /opaque binary size limit exceeded/i
  );
});

test("reviewed legacy Office lock rejects an oversized exact-path file before reading", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const absolutePath = path.join(fixture.linked, entry.path);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const descriptor = fs.openSync(absolutePath, "w", entry.untrackedMode);
  try {
    fs.ftruncateSync(descriptor, 2 * 1024 * 1024);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(absolutePath, entry.untrackedMode);
  assert.equal(fs.statSync(absolutePath).size, 2 * 1024 * 1024);
  const originalOpenSync = fs.openSync;
  let opened = false;
  fs.openSync = function reviewedExactFileOpenObservation(...args) {
    opened = true;
    return originalOpenSync.apply(this, args);
  };
  try {
    assert.throws(
      () => buildInventory(fixture.linked, [entry.path]),
      /reviewed legacy Office lock size mismatch before reading/i
    );
  } finally {
    fs.openSync = originalOpenSync;
  }
  assert.equal(opened, false);
});

test("reviewed exact-file reader rechecks size before allocation after descriptor growth", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const absolutePath = path.join(fixture.linked, entry.path);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, Buffer.alloc(entry.bytes));
  fs.chmodSync(absolutePath, entry.untrackedMode);
  const originalFstatSync = fs.fstatSync;
  let grewAfterOuterDescriptorStat = false;
  fs.fstatSync = function reviewedExactFileGrowthInjection(...args) {
    const stat = originalFstatSync.apply(this, args);
    if (!grewAfterOuterDescriptorStat) {
      grewAfterOuterDescriptorStat = true;
      fs.truncateSync(absolutePath, 2 * 1024 * 1024);
    }
    return stat;
  };
  try {
    assert.throws(
      () => buildInventory(fixture.linked, [entry.path]),
      /reviewed legacy Office lock size mismatch before reading/i
    );
  } finally {
    fs.fstatSync = originalFstatSync;
  }
  assert.equal(grewAfterOuterDescriptorStat, true);
  assert.equal(fs.statSync(absolutePath).size, 2 * 1024 * 1024);
});

test("reviewed exact-file reader rejects growth after its allocation-size fstat", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const absolutePath = path.join(fixture.linked, entry.path);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, Buffer.alloc(entry.bytes));
  fs.chmodSync(absolutePath, entry.untrackedMode);
  const originalFstatSync = fs.fstatSync;
  let descriptorStatCalls = 0;
  fs.fstatSync = function reviewedExactFilePostReaderStatGrowth(...args) {
    const stat = originalFstatSync.apply(this, args);
    descriptorStatCalls += 1;
    if (descriptorStatCalls === 2) fs.truncateSync(absolutePath, 2 * 1024 * 1024);
    return stat;
  };
  try {
    assert.throws(
      () => buildInventory(fixture.linked, [entry.path]),
      /reviewed legacy Office lock size mismatch before reading/i
    );
  } finally {
    fs.fstatSync = originalFstatSync;
  }
  assert.equal(descriptorStatCalls, 2);
  assert.equal(fs.statSync(absolutePath).size, 2 * 1024 * 1024);
});

test("legacy terminal patch allowance never becomes a generic malformed-patch exception", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const terminalTruncated = Buffer.from([
    "diff --git a/reviewed.ts b/reviewed.ts",
    "@@ -0,0 +1,2 @@",
    "+const reviewed = true;"
  ].join("\n"));
  for (const surface of [
    "historical",
    "index-stage0",
    "worktree",
    "untracked",
    "branch-head/copied",
    "branch-head/renamed",
    "branch-head/modified"
  ]) {
    assert.throws(
      () => scanBuffer(terminalTruncated, { displayPath: `${surface}/portable-terminal-truncated.patch` }),
      /malformed Git text hunk/i
    );
  }
});

test("portable synthetic Git scopes keep terminal-truncated patches fail-closed", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const entry = REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES[0];
  const terminalTruncated = Buffer.from([
    "diff --git a/reviewed.ts b/reviewed.ts",
    "@@ -0,0 +1,2 @@",
    "+const reviewed = true;"
  ].join("\n"));
  const validPatch = Buffer.from([
    "diff --git a/reviewed.ts b/reviewed.ts",
    "@@ -0,0 +1 @@",
    "+const reviewed = true;"
  ].join("\n"));
  const baseline = (fixture, buffer = terminalTruncated) => {
    commitFixtureBlob(fixture, entry.path, buffer);
    git(fixture.linked, "merge", "--ff-only", "main");
  };
  const cases = [
    {
      name: "untracked",
      prepare(fixture) {
        const target = path.join(fixture.linked, entry.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, terminalTruncated);
      }
    },
    {
      name: "index",
      prepare(fixture) {
        const target = path.join(fixture.linked, entry.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, terminalTruncated);
        git(fixture.linked, "add", "--", entry.path);
      }
    },
    {
      name: "worktree modified",
      prepare(fixture) {
        baseline(fixture, validPatch);
        fs.writeFileSync(path.join(fixture.linked, entry.path), terminalTruncated);
      }
    },
    {
      name: "historical deletion",
      prepare(fixture) {
        baseline(fixture);
        fs.rmSync(path.join(fixture.linked, entry.path));
      }
    },
    {
      name: "copied",
      prepare(fixture) {
        baseline(fixture);
        const copyPath = `${entry.path}.copy.patch`;
        fs.copyFileSync(path.join(fixture.linked, entry.path), path.join(fixture.linked, copyPath));
      }
    },
    {
      name: "renamed",
      prepare(fixture) {
        baseline(fixture);
        git(fixture.linked, "mv", entry.path, `${entry.path}.renamed.patch`);
      }
    },
    {
      name: "mode mismatch",
      prepare(fixture) {
        baseline(fixture);
        fs.chmodSync(path.join(fixture.linked, entry.path), 0o755);
      }
    }
  ];
  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      fixtureCase.prepare(fixture);
      assert.throws(
        () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false }),
        /malformed Git text hunk/i
      );
    });
  }
});

test("supplementary repository scan accepts only the three exact pinned terminal patches", async (t) => {
  const { scanBuffer, scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybePinnedLegacyTerminalPatchRepository();
  if (repository === null) {
    t.skip("pinned closure commit and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES) {
    const treeRecord = git(repository, "ls-tree", REVIEWED_LEGACY_TERMINAL_PATCH_HEAD, "--", entry.path);
    assert.equal(treeRecord, `${entry.mode} blob ${entry.objectId}\t${entry.path}`);
    const buffer = reviewedLegacyTerminalPatchBytes(repository, entry);
    assert.throws(
      () => scanBuffer(buffer, { displayPath: `branch-head/${entry.path}` }),
      /malformed Git text hunk/i
    );
  }
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(
      repository,
      REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
      REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.map((entry) => entry.path)
    ),
    { scanned: REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.length, reviewed: 0 }
  );
});

test("supplementary current-HEAD policies accept only the exact reviewed A18 final HEAD", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = path.resolve(here, "..", "..");
  try {
    execFileSync("git", ["cat-file", "-e", `${REVIEWED_EXACT_A18_FINAL_HEAD}^{commit}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
  } catch {
    t.skip("exact reviewed A18 final HEAD is not available in this clone");
    return;
  }
  const representativePaths = [
    REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES[0].path,
    REVIEWED_LEGACY_OFFICE_LOCK.path,
    REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.path,
    REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES[0].path,
    REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES[0].path
  ];
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(repository, REVIEWED_EXACT_A18_FINAL_HEAD, representativePaths),
    { scanned: 5, reviewed: 1 }
  );
  assert.throws(
    () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), representativePaths),
    /restricted to its pinned current branch HEAD/i
  );
});

test("supplementary exact legacy parent console report is accepted only at its pinned identity", async (t) => {
  const { scanBuffer, scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyParentConsoleReportRepository();
  if (repository === null) {
    t.skip("reviewed legacy parent console report commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  const treeRecord = git(repository, "ls-tree", entry.headRevision, "--", entry.path);
  assert.equal(treeRecord, `${entry.mode} blob ${entry.objectId}\t${entry.path}`);
  const buffer = gitBlob(repository, entry.objectId);
  assert.equal(buffer.length, entry.bytes);
  assert.equal(
    crypto.createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex"),
    entry.objectId
  );
  assert.equal(crypto.createHash("sha256").update(buffer).digest("hex"), entry.sha256);
  assert.throws(
    () => scanBuffer(buffer, { displayPath: `branch-head/${entry.path}` }),
    /token assignment/i
  );
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(repository, entry.headRevision, [entry.path]),
    { scanned: 1, reviewed: 0 }
  );
});

test("supplementary legacy parent console report rejects wrong HEAD metadata and integrity", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyParentConsoleReportRepository();
  if (repository === null) {
    t.skip("reviewed legacy parent console report commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  assert.throws(
    () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), [entry.path]),
    /reviewed legacy parent console report is restricted to its pinned current branch HEAD/i
  );
  for (const [mutation, expected] of [
    ["mode", /reviewed legacy parent console report metadata mismatch/i],
    ["type", /reviewed legacy parent console report metadata mismatch/i],
    ["object", /reviewed legacy parent console report metadata mismatch/i],
    ["path", /reviewed legacy parent console report Git blob is missing/i],
    ["missing", /reviewed legacy parent console report Git blob is missing/i],
    ["bytes", /reviewed legacy parent console report Git blob integrity mismatch/i],
    ["size", /reviewed legacy parent console report Git blob integrity mismatch/i]
  ]) {
    await t.test(mutation, () => {
      assert.throws(
        () => withReviewedLegacyParentConsoleReportGitShim(t, mutation, () => (
          scanCurrentBranchHeadTrackedPaths(repository, entry.headRevision, [entry.path])
        )),
        expected
      );
    });
  }
});

test("supplementary legacy parent console report allowance stays out of non-pinned and untracked scopes", async (t) => {
  const { buildInventory, collectWorktreeSnapshot } = await import(libraryUrl);
  const repository = maybeReviewedLegacyParentConsoleReportRepository();
  if (repository === null) {
    t.skip("reviewed legacy parent console report commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  const buffer = gitBlob(repository, entry.objectId);

  const untrackedFixture = makeFixture();
  t.after(() => fs.rmSync(untrackedFixture.parent, { recursive: true, force: true }));
  const untrackedPath = path.join(untrackedFixture.linked, entry.path);
  fs.mkdirSync(path.dirname(untrackedPath), { recursive: true });
  fs.writeFileSync(untrackedPath, buffer);
  assert.throws(
    () => buildInventory(untrackedFixture.linked, [entry.path]),
    /token assignment/i
  );

  const branchFixture = makeFixture();
  t.after(() => fs.rmSync(branchFixture.parent, { recursive: true, force: true }));
  const branchPath = path.join(branchFixture.linked, entry.path);
  fs.mkdirSync(path.dirname(branchPath), { recursive: true });
  fs.writeFileSync(branchPath, buffer);
  git(branchFixture.linked, "add", "--", entry.path);
  git(branchFixture.linked, "commit", "-m", "add non-pinned parent report blob");
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(branchFixture), { includeTar: false }),
    /reviewed legacy parent console report is restricted to its pinned current branch HEAD/i
  );
});

test("supplementary reviewed legacy exact text registries match every pinned Git identity", async (t) => {
  const {
    scanBranchBaseHistoricalTrackedPaths,
    scanBuffer,
    scanCurrentBranchHeadTrackedPaths
  } = await import(libraryUrl);
  const repository = maybeReviewedLegacyExactTextRepository();
  if (repository === null) {
    t.skip("reviewed legacy exact text commits and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES) {
    await t.test(`current HEAD ${entry.path}`, () => {
      assert.equal(
        git(repository, "ls-tree", entry.revision, "--", entry.path),
        `${entry.mode} ${entry.type} ${entry.objectId}\t${entry.path}`
      );
      const buffer = reviewedLegacyExactTextBytes(repository, entry);
      assert.throws(
        () => scanBuffer(buffer, { displayPath: `generic/${entry.path}` }),
        /high-confidence token assignment/i
      );
      assert.deepEqual(
        scanCurrentBranchHeadTrackedPaths(repository, entry.revision, [entry.path]),
        { scanned: 1, reviewed: 0 }
      );
    });
  }
  for (const entry of REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES) {
    await t.test(`branch base ${entry.path}`, () => {
      assert.equal(
        git(repository, "ls-tree", entry.revision, "--", entry.path),
        `${entry.mode} ${entry.type} ${entry.objectId}\t${entry.path}`
      );
      const buffer = reviewedLegacyExactTextBytes(repository, entry);
      assert.throws(
        () => scanBuffer(buffer, { displayPath: `generic/${entry.path}` }),
        /high-confidence token assignment/i
      );
      assert.deepEqual(
        scanBranchBaseHistoricalTrackedPaths(repository, entry.revision, [entry.path]),
        { scanned: 1, reviewed: 0, reviewedProtected: 0 }
      );
    });
  }
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(
      repository,
      REVIEWED_LEGACY_TERMINAL_PATCH_HEAD,
      REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.map((entry) => entry.path)
    ),
    { scanned: REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.length, reviewed: 0 }
  );
  assert.deepEqual(
    scanBranchBaseHistoricalTrackedPaths(
      repository,
      REVIEWED_LEGACY_TERMINAL_PATCH_BASE,
      REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.map((entry) => entry.path)
    ),
    {
      scanned: REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.length,
      reviewed: 0,
      reviewedProtected: 0
    }
  );
});

test("supplementary reviewed legacy exact text payload policy stays private and keeps portable secret rejection", async () => {
  const library = await import(libraryUrl);
  const { scanBuffer, scanOpaqueRawSignatures } = library;
  assert.equal("scanReviewedLegacyExactTextPayload" in library, false);
  const reviewedFalsePositive = Buffer.from('const password = "portable-fixture-value-928374";\n');
  assert.throws(
    () => scanBuffer(reviewedFalsePositive, { displayPath: "generic/reviewed-false-positive.md" }),
    /high-confidence token assignment/i
  );
  for (const [name, buffer, expected] of [
    ["provider token", Buffer.from(`prefix ${providerTokenFixture("Z".repeat(40))} suffix`), /high-confidence token/i],
    ["private key", Buffer.from(`${pemHeaderFixture()}\nredacted\n`), /private-key header/i],
    ["oversize", Buffer.alloc(1024 * 1024 + 1, 0x61), /opaque binary size limit exceeded/i]
  ]) {
    let error;
    assert.throws(() => {
      try {
        scanOpaqueRawSignatures(buffer, "portable-reviewed-legacy-text/content.txt");
      } catch (caught) {
        error = caught;
        throw caught;
      }
    }, expected, name);
    assert.doesNotMatch(error.message, /sk-Z|redacted|prefix|suffix/u);
  }
  assert.throws(
    () => scanBuffer(Buffer.from([0xc3, 0x28, 0x0a]), {
      displayPath: "branch.patch",
      aggregatePatch: true
    }),
    /UTF-8|binary|text/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from("reviewed\0text"), {
      displayPath: "branch.patch",
      aggregatePatch: true
    }),
    /NUL|binary|text/i
  );
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(source, /function scanReviewedLegacyExactTextPayload\(buffer\)/u);
  assert.match(source, /buffer\.includes\(0\) \|\| !isUtf8\(buffer\)/u);
  assert.match(source, /scanOpaqueRawSignatures\(buffer, REVIEWED_LEGACY_EXACT_TEXT_DISPLAY_PATH\)/u);
});

test("supplementary reviewed legacy text registries use purpose revisions and prototype-safe lookup", async (t) => {
  const {
    scanBranchBaseHistoricalTrackedPaths,
    scanCurrentBranchHeadTrackedPaths
  } = await import(libraryUrl);
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(source, /const REVIEWED_LEGACY_CURRENT_HEAD_TEXT_REVISION = "ec22a29b55a4329e81d96e02417f8925ccec54c3";/u);
  assert.match(source, /const REVIEWED_LEGACY_BRANCH_BASE_TEXT_REVISION = "e909992b098ce7f8b57ca7f7ede6c97e50ccdc45";/u);

  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const revision = git(fixture.repo, "rev-parse", "HEAD");
  for (const inheritedName of ["constructor", "toString", "__proto__"]) {
    assert.throws(
      () => scanCurrentBranchHeadTrackedPaths(fixture.repo, revision, [inheritedName]),
      /current branch HEAD Git blob is missing/i
    );
    assert.throws(
      () => scanBranchBaseHistoricalTrackedPaths(fixture.repo, revision, [inheritedName]),
      /historical Git blob is missing/i
    );
  }
});

test("supplementary reviewed legacy current HEAD text rejects every wrong pinned identity field", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyExactTextRepository();
  if (repository === null) {
    t.skip("reviewed legacy exact text commits and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES) {
    await t.test(entry.path, async (t) => {
      assertFixedReviewedLegacyTextError(
        () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), [entry.path]),
        /reviewed legacy current HEAD text is restricted to its pinned revision/i
      );
      for (const mutation of ["path", "mode", "type", "object", "missing", "bytes", "size"]) {
        await t.test(mutation, () => {
          const expected = mutation === "path" || mutation === "missing"
            ? /reviewed legacy current HEAD text Git blob is missing/i
            : mutation === "bytes" || mutation === "size"
              ? /reviewed legacy current HEAD text Git blob integrity mismatch/i
              : /reviewed legacy current HEAD text metadata mismatch/i;
          assertFixedReviewedLegacyTextError(
            () => withReviewedLegacyPinnedBlobGitShim(t, entry, mutation, () => (
              scanCurrentBranchHeadTrackedPaths(repository, entry.revision, [entry.path])
            )),
            expected
          );
        });
      }
    });
  }
});

test("supplementary reviewed legacy branch-base text rejects every wrong pinned identity field", async (t) => {
  const { scanBranchBaseHistoricalTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyExactTextRepository();
  if (repository === null) {
    t.skip("reviewed legacy exact text commits and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES) {
    await t.test(entry.path, async (t) => {
      assertFixedReviewedLegacyTextError(
        () => scanBranchBaseHistoricalTrackedPaths(repository, "0".repeat(40), [entry.path]),
        /reviewed legacy branch-base text is restricted to its pinned revision/i
      );
      for (const mutation of ["path", "mode", "type", "object", "missing", "bytes", "size"]) {
        await t.test(mutation, () => {
          const expected = mutation === "path" || mutation === "missing"
            ? /reviewed legacy branch-base text Git blob is missing/i
            : mutation === "bytes" || mutation === "size"
              ? /reviewed legacy branch-base text Git blob integrity mismatch/i
              : /reviewed legacy branch-base text metadata mismatch/i;
          assertFixedReviewedLegacyTextError(
            () => withReviewedLegacyPinnedBlobGitShim(t, entry, mutation, () => (
              scanBranchBaseHistoricalTrackedPaths(repository, entry.revision, [entry.path])
            )),
            expected
          );
        });
      }
    });
  }
});

test("supplementary reviewed legacy text allowances stay confined to current-HEAD and branch-base wrappers", async (t) => {
  const {
    buildInventory,
    collectWorktreeSnapshot,
    scanBranchBaseHistoricalTrackedPaths,
    scanCurrentBranchHeadTrackedPaths
  } = await import(libraryUrl);
  const current = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES[0];
  const historical = REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES[0];
  const currentBuffer = Buffer.from('const password = "portable-fixture-value-928374";\n');
  const historicalBuffer = Buffer.from('const apiKey = "portable-fixture-value-837492";\n');

  const branchBaseFixture = makeFixture();
  t.after(() => fs.rmSync(branchBaseFixture.parent, { recursive: true, force: true }));
  const currentPath = path.join(branchBaseFixture.repo, current.path);
  fs.mkdirSync(path.dirname(currentPath), { recursive: true });
  fs.writeFileSync(currentPath, currentBuffer);
  git(branchBaseFixture.repo, "add", "--", current.path);
  git(branchBaseFixture.repo, "commit", "-m", "portable non-registry branch-base fixture");

  assert.throws(
    () => scanBranchBaseHistoricalTrackedPaths(
      branchBaseFixture.repo,
      git(branchBaseFixture.repo, "rev-parse", "HEAD"),
      [current.path]
    ),
    /high-confidence token assignment/i
  );
  assertFixedReviewedLegacyTextError(
    () => scanCurrentBranchHeadTrackedPaths(process.cwd(), historical.revision, [historical.path]),
    /reviewed legacy current HEAD text is restricted to its pinned revision/i
  );

  const untrackedFixture = makeFixture();
  t.after(() => fs.rmSync(untrackedFixture.parent, { recursive: true, force: true }));
  const untrackedPath = path.join(untrackedFixture.linked, current.path);
  fs.mkdirSync(path.dirname(untrackedPath), { recursive: true });
  fs.writeFileSync(untrackedPath, currentBuffer);
  assert.throws(
    () => buildInventory(untrackedFixture.linked, [current.path]),
    /high-confidence token assignment/i
  );

  const indexFixture = makeFixture();
  t.after(() => fs.rmSync(indexFixture.parent, { recursive: true, force: true }));
  const indexPath = path.join(indexFixture.linked, historical.path);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, historicalBuffer);
  git(indexFixture.linked, "add", "--", historical.path);
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(indexFixture), { includeTar: false }),
    /high-confidence token assignment/i
  );

  const worktreeFixture = makeFixture();
  t.after(() => fs.rmSync(worktreeFixture.parent, { recursive: true, force: true }));
  const worktreePath = path.join(worktreeFixture.repo, current.path);
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  fs.writeFileSync(worktreePath, "safe baseline\n");
  git(worktreeFixture.repo, "add", "--", current.path);
  git(worktreeFixture.repo, "commit", "-m", "safe exact-path baseline");
  git(worktreeFixture.linked, "merge", "--ff-only", "main");
  fs.writeFileSync(path.join(worktreeFixture.linked, current.path), currentBuffer);
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(worktreeFixture), { includeTar: false }),
    /high-confidence token assignment/i
  );

  const copiedFixture = makeFixture();
  t.after(() => fs.rmSync(copiedFixture.parent, { recursive: true, force: true }));
  const copiedPath = `copied/${path.basename(historical.path)}`;
  const copiedAbsolutePath = path.join(copiedFixture.linked, copiedPath);
  fs.mkdirSync(path.dirname(copiedAbsolutePath), { recursive: true });
  fs.writeFileSync(copiedAbsolutePath, historicalBuffer);
  assert.throws(
    () => buildInventory(copiedFixture.linked, [copiedPath]),
    /high-confidence token assignment/i
  );
});

test("supplementary reviewed legacy text registry preserves the b2cb parent-console exception", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyParentConsoleReportRepository();
  if (repository === null) {
    t.skip("reviewed legacy parent console report commit and blob are not available in this clone");
    return;
  }
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(
      repository,
      REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.headRevision,
      [REVIEWED_LEGACY_PARENT_CONSOLE_REPORT.path]
    ),
    { scanned: 1, reviewed: 0 }
  );
});

test("supplementary JPEG-under-PNG registry matches all six pinned current-HEAD Git identities", async (t) => {
  const {
    scanBuffer,
    scanCurrentBranchHeadTrackedPaths,
    scanOpaqueRawSignatures
  } = await import(libraryUrl);
  const repository = maybeReviewedLegacyJpegUnderPngRepository();
  if (repository === null) {
    t.skip("reviewed legacy JPEG-under-PNG commit and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES) {
    await t.test(entry.path, () => {
      assert.equal(
        git(repository, "ls-tree", entry.revision, "--", entry.path),
        `${entry.mode} ${entry.type} ${entry.objectId}\t${entry.path}`
      );
      const buffer = reviewedLegacyJpegUnderPngBytes(repository, entry);
      assert.throws(
        () => scanBuffer(buffer, { displayPath: `generic/${entry.path}` }),
        /reviewed binary magic mismatch/i
      );
      assert.doesNotThrow(() => scanOpaqueRawSignatures(
        buffer,
        "reviewed-legacy-jpeg-under-png/content.jpeg"
      ));
      assert.deepEqual(
        scanCurrentBranchHeadTrackedPaths(repository, entry.revision, [entry.path]),
        { scanned: 1, reviewed: 1 }
      );
    });
  }
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(
      repository,
      REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION,
      [
        ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.map((entry) => entry.path),
        ...REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES.map((entry) => entry.path)
      ]
    ),
    { scanned: 19, reviewed: 6 }
  );
});

test("supplementary JPEG-under-PNG parser and payload scanner stay private and reject opaque secrets", async () => {
  const library = await import(libraryUrl);
  const { scanBuffer, scanOpaqueRawSignatures } = library;
  assert.equal("assertStructurallyValidJpegUnderPng" in library, false);
  assert.equal("scanReviewedLegacyJpegUnderPngPayload" in library, false);

  const parse = loadPrivateFunction("assertStructurallyValidJpegUnderPng");
  assert.deepEqual(
    parse(portableStructuredJpeg()),
    { sofSegments: 1, sosSegments: 1, status: "passed" }
  );
  const parts = portableJpegParts();
  assert.deepEqual(
    parse(Buffer.concat([
      parts.soi,
      parts.app,
      parts.sof,
      parts.sos,
      parts.entropy,
      parts.sos,
      parts.entropy,
      parts.eoi
    ])),
    { sofSegments: 1, sosSegments: 2, status: "passed" }
  );
  assert.throws(
    () => scanBuffer(portableStructuredJpeg(), { displayPath: "generic/portable.png" }),
    /reviewed binary magic mismatch/i
  );

  const secret = providerTokenFixture("Q".repeat(40));
  const privateKey = pemHeaderFixture();
  for (const payload of [Buffer.from(secret), Buffer.from(privateKey)]) {
    const buffer = portableStructuredJpeg({ appPayload: payload });
    assert.deepEqual(parse(buffer), { sofSegments: 1, sosSegments: 1, status: "passed" });
    let error;
    assert.throws(() => {
      try {
        scanOpaqueRawSignatures(buffer, "reviewed-legacy-jpeg-under-png/content.jpeg");
      } catch (caught) {
        error = caught;
        throw caught;
      }
    }, /high-confidence token|private-key header/i);
    assert.doesNotMatch(error.message, /sk-Q|BEGIN PRIVATE KEY/u);
  }

  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(source, /function assertStructurallyValidJpegUnderPng\(buffer\)/u);
  assert.match(source, /function scanReviewedLegacyJpegUnderPngPayload\(buffer\)/u);
  assert.match(source, /assertStructurallyValidJpegUnderPng\(buffer\)/u);
  assert.match(source, /scanOpaqueRawSignatures\(buffer, REVIEWED_LEGACY_JPEG_UNDER_PNG_DISPLAY_PATH\)/u);
});

test("supplementary JPEG-under-PNG parser rejects malformed marker, frame, scan, and terminal structure", async (t) => {
  const parse = loadPrivateFunction("assertStructurallyValidJpegUnderPng");
  const parts = portableJpegParts();
  const malformedSofCount = jpegSegment(0xc0, Buffer.from([
    0x08,
    0x00, 0x01,
    0x00, 0x01,
    0x02,
    0x01, 0x11, 0x00
  ]));
  const zeroHeightSof = jpegSegment(0xc0, Buffer.from([
    0x08,
    0x00, 0x00,
    0x00, 0x01,
    0x01,
    0x01, 0x11, 0x00
  ]));
  const malformedSosCount = jpegSegment(0xda, Buffer.from([
    0x02,
    0x01, 0x00,
    0x00, 0x3f, 0x00
  ]));
  const cases = [
    ["non-Buffer", "not-a-buffer", /payload must be a Buffer/i],
    ["missing SOI", Buffer.from([0x00, 0x00, 0xff, 0xd9]), /missing SOI marker/i],
    ["truncated after SOI", parts.soi, /missing EOI marker/i],
    ["marker prefix", Buffer.concat([parts.soi, Buffer.from([0x11]), parts.eoi]), /marker prefix/i],
    ["segment length below two", Buffer.concat([parts.soi, Buffer.from([0xff, 0xe0, 0x00, 0x01]), parts.eoi]), /segment length is invalid/i],
    ["segment overrun", Buffer.concat([parts.soi, Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x00]), parts.eoi]), /segment exceeds payload/i],
    ["missing SOF", Buffer.concat([parts.soi, parts.app, parts.eoi]), /missing SOF marker/i],
    ["malformed SOF component count", Buffer.concat([parts.soi, parts.app, malformedSofCount, parts.eoi]), /SOF segment length mismatch/i],
    ["zero frame dimensions", Buffer.concat([parts.soi, parts.app, zeroHeightSof, parts.eoi]), /SOF dimensions are invalid/i],
    ["missing SOS", Buffer.concat([parts.soi, parts.app, parts.sof, parts.eoi]), /missing SOS marker/i],
    ["malformed SOS component count", Buffer.concat([parts.soi, parts.app, parts.sof, malformedSosCount, parts.eoi]), /SOS segment length mismatch/i],
    ["SOS before SOF", Buffer.concat([parts.soi, parts.app, parts.sos, parts.sof, parts.eoi]), /SOS precedes SOF/i],
    ["missing EOI", Buffer.concat([parts.soi, parts.app, parts.sof, parts.sos, parts.entropy]), /missing EOI marker/i],
    ["trailing bytes", Buffer.concat([portableStructuredJpeg(), Buffer.from([0x00])]), /EOI marker is not terminal/i],
    ["second SOI", Buffer.concat([parts.soi, parts.app, parts.soi, parts.eoi]), /unexpected SOI marker/i],
    ["restart outside entropy", Buffer.concat([parts.soi, Buffer.from([0xff, 0xd0]), parts.eoi]), /restart marker outside entropy/i],
    ["stuffed byte outside entropy", Buffer.concat([parts.soi, Buffer.from([0xff, 0x00]), parts.eoi]), /stuffed byte outside entropy/i],
    ["dangling entropy marker", Buffer.concat([parts.soi, parts.app, parts.sof, parts.sos, Buffer.from([0x11, 0xff])]), /dangling entropy marker/i]
  ];
  for (const [name, buffer, expected] of cases) {
    await t.test(name, () => {
      let error;
      assert.throws(() => {
        try {
          parse(buffer);
        } catch (caught) {
          error = caught;
          throw caught;
        }
      }, expected);
      assert.doesNotMatch(error.message, /not-a-buffer|portable-jpeg|coordination\/|sk-/iu);
    });
  }
});

test("supplementary JPEG-under-PNG registry rejects every wrong pinned identity field with fixed errors", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyJpegUnderPngRepository();
  if (repository === null) {
    t.skip("reviewed legacy JPEG-under-PNG commit and blobs are not available in this clone");
    return;
  }
  for (const entry of REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES) {
    await t.test(entry.path, async (t) => {
      assertFixedReviewedLegacyJpegError(
        () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), [entry.path]),
        /reviewed legacy JPEG-under-PNG is restricted to its pinned current branch HEAD/i
      );
      for (const mutation of ["path", "mode", "type", "object", "missing", "bytes", "size"]) {
        await t.test(mutation, () => {
          const expected = mutation === "path" || mutation === "missing"
            ? /reviewed legacy JPEG-under-PNG Git blob is missing/i
            : mutation === "bytes" || mutation === "size"
              ? /reviewed legacy JPEG-under-PNG Git blob integrity mismatch/i
              : /reviewed legacy JPEG-under-PNG metadata mismatch/i;
          assertFixedReviewedLegacyJpegError(
            () => withReviewedLegacyPinnedBlobGitShim(t, entry, mutation, () => (
              scanCurrentBranchHeadTrackedPaths(repository, entry.revision, [entry.path])
            )),
            expected
          );
        });
      }
    });
  }
});

test("supplementary JPEG-under-PNG allowance does not leak into historical, index, worktree, untracked, copied, or tar scopes", async (t) => {
  const {
    buildInventory,
    collectWorktreeSnapshot,
    scanBranchBaseHistoricalTrackedPaths,
    scanCurrentBranchHeadTrackedPaths,
    verifyTarPayload
  } = await import(libraryUrl);
  const entry = REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES[0];
  const buffer = portableStructuredJpeg();
  const expectedGenericRejection = /reviewed binary magic mismatch/i;

  assertFixedReviewedLegacyJpegError(
    () => scanCurrentBranchHeadTrackedPaths(process.cwd(), "0".repeat(40), [entry.path]),
    /reviewed legacy JPEG-under-PNG is restricted to its pinned current branch HEAD/i
  );

  const historicalFixture = makeFixture();
  t.after(() => fs.rmSync(historicalFixture.parent, { recursive: true, force: true }));
  const historicalPath = path.join(historicalFixture.repo, entry.path);
  fs.mkdirSync(path.dirname(historicalPath), { recursive: true });
  fs.writeFileSync(historicalPath, buffer);
  git(historicalFixture.repo, "add", "--", entry.path);
  git(historicalFixture.repo, "commit", "-m", "portable historical JPEG-under-PNG fixture");
  assert.throws(
    () => scanBranchBaseHistoricalTrackedPaths(
      historicalFixture.repo,
      git(historicalFixture.repo, "rev-parse", "HEAD"),
      [entry.path]
    ),
    expectedGenericRejection
  );

  const untrackedFixture = makeFixture();
  t.after(() => fs.rmSync(untrackedFixture.parent, { recursive: true, force: true }));
  const untrackedPath = path.join(untrackedFixture.linked, entry.path);
  fs.mkdirSync(path.dirname(untrackedPath), { recursive: true });
  fs.writeFileSync(untrackedPath, buffer);
  assert.throws(
    () => buildInventory(untrackedFixture.linked, [entry.path]),
    expectedGenericRejection
  );

  const indexFixture = makeFixture();
  t.after(() => fs.rmSync(indexFixture.parent, { recursive: true, force: true }));
  const indexPath = path.join(indexFixture.linked, entry.path);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, buffer);
  git(indexFixture.linked, "add", "--", entry.path);
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(indexFixture), { includeTar: false }),
    expectedGenericRejection
  );

  const worktreeFixture = makeFixture();
  t.after(() => fs.rmSync(worktreeFixture.parent, { recursive: true, force: true }));
  const worktreePath = path.join(worktreeFixture.repo, entry.path);
  const safePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  fs.writeFileSync(worktreePath, safePng);
  git(worktreeFixture.repo, "add", "--", entry.path);
  git(worktreeFixture.repo, "commit", "-m", "safe PNG baseline");
  git(worktreeFixture.linked, "merge", "--ff-only", "main");
  fs.writeFileSync(path.join(worktreeFixture.linked, entry.path), buffer);
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(worktreeFixture), { includeTar: false }),
    expectedGenericRejection
  );

  const copiedFixture = makeFixture();
  t.after(() => fs.rmSync(copiedFixture.parent, { recursive: true, force: true }));
  const copiedPath = `copied/${path.basename(entry.path)}`;
  const copiedAbsolutePath = path.join(copiedFixture.linked, copiedPath);
  fs.mkdirSync(path.dirname(copiedAbsolutePath), { recursive: true });
  fs.writeFileSync(copiedAbsolutePath, buffer);
  assert.throws(
    () => buildInventory(copiedFixture.linked, [copiedPath]),
    expectedGenericRejection
  );

  const inventory = Object.freeze({
    mode: 0o644,
    path: entry.path,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    size: buffer.length,
    type: "file"
  });
  const failures = [];
  verifyTarPayload(
    portableSingleFileTarGzip(entry.path, buffer),
    [inventory],
    "portable JPEG-under-PNG tar",
    failures
  );
  assert.ok(failures.some((failure) => expectedGenericRejection.test(failure)), failures.join("\n"));
});

test("supplementary JPEG-under-PNG registry uses a purpose revision and prototype-safe Map lookup", async () => {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(source, /const REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_REVISION = "ec22a29b55a4329e81d96e02417f8925ccec54c3";/u);
  assert.match(source, /const REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_BY_PATH = new Map\(/u);
  assert.match(source, /REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_BY_PATH\.get\(relativePath\) \?\? null/u);
});

test("supplementary pinned terminal patch integration rejects wrong HEAD mode and object", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybePinnedLegacyTerminalPatchRepository();
  if (repository === null) {
    t.skip("pinned closure commit and blobs are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES[0];
  assert.throws(
    () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), [entry.path]),
    /restricted to its pinned current branch HEAD/i
  );
  for (const mutation of ["mode", "object"]) {
    await t.test(mutation, () => {
      assert.throws(
        () => withReviewedLegacyTerminalPatchGitShim(t, entry, mutation, () => (
          scanCurrentBranchHeadTrackedPaths(repository, REVIEWED_LEGACY_TERMINAL_PATCH_HEAD, [entry.path])
        )),
        /reviewed legacy terminal patch metadata mismatch/i
      );
    });
  }
});

test("supplementary exact legacy Office lock passes only current-HEAD and exact untracked/tar registries", async (t) => {
  const {
    buildInventory,
    collectWorktreeSnapshot,
    scanCurrentBranchHeadTrackedPaths,
    scanFile,
    verifyTarPayload
  } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const treeRecord = git(repository, "ls-tree", entry.headRevision, "--", entry.path);
  assert.equal(treeRecord, `${entry.branchMode} blob ${entry.objectId}\t${entry.path}`);
  const buffer = reviewedLegacyOfficeLockBytes(repository);
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(repository, entry.headRevision, [entry.path]),
    { scanned: 1, reviewed: 0 }
  );

  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const absolutePath = writeReviewedLegacyOfficeLock(fixture.linked, buffer);
  assert.throws(() => scanFile(absolutePath, entry.path), /unreadable OOXML/i);
  const exactInventory = [{
    path: entry.path,
    type: "file",
    mode: entry.untrackedMode,
    size: entry.bytes,
    sha256: entry.sha256
  }];
  assert.deepEqual(buildInventory(fixture.linked, [entry.path]), {
    inventory: exactInventory,
    reviewedBinaryPaths: 0,
    reviewedProtectedOverlayPaths: 0
  });
  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: true });
  t.after(() => snapshot.cleanup());
  assert.deepEqual(snapshot.inventory, exactInventory);
  const failures = [];
  verifyTarPayload(snapshot.buffers.untrackedTar, exactInventory, "reviewed-office-lock", failures);
  assert.deepEqual(failures, []);
});

test("supplementary available real untracked legacy Office lock copies pass writer-equivalent inventory scans", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const worktreeList = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repository,
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const worktrees = worktreeList.split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
  const available = [];
  for (const worktreePath of worktrees) {
    if (!fs.existsSync(worktreePath) || !fs.statSync(worktreePath).isDirectory()) continue;
    const status = execFileSync("git", [
      "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", entry.path
    ], {
      cwd: worktreePath,
      encoding: null,
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    if (!status.equals(Buffer.from(`?? ${entry.path}\0`))) continue;
    available.push(worktreePath);
    assert.deepEqual(buildInventory(worktreePath, [entry.path]), {
      inventory: [{
        path: entry.path,
        type: "file",
        mode: entry.untrackedMode,
        size: entry.bytes,
        sha256: entry.sha256
      }],
      reviewedBinaryPaths: 0,
      reviewedProtectedOverlayPaths: 0
    });
  }
  if (available.length === 0) t.skip("no exact real untracked legacy Office lock copies are currently available");
});

test("supplementary legacy Office lock current-HEAD integration rejects wrong HEAD metadata and integrity", async (t) => {
  const { scanCurrentBranchHeadTrackedPaths } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  assert.throws(
    () => scanCurrentBranchHeadTrackedPaths(repository, "0".repeat(40), [entry.path]),
    /restricted to its pinned current branch HEAD/i
  );
  for (const [mutation, expected] of [
    ["mode", /metadata mismatch/i],
    ["type", /metadata mismatch/i],
    ["object", /metadata mismatch/i],
    ["missing", /Git blob is missing/i],
    ["bytes", /integrity mismatch/i],
    ["size", /integrity mismatch/i]
  ]) {
    await t.test(mutation, () => {
      assert.throws(
        () => withReviewedLegacyOfficeLockGitShim(t, mutation, () => (
          scanCurrentBranchHeadTrackedPaths(repository, entry.headRevision, [entry.path])
        )),
        expected
      );
    });
  }
});

test("supplementary legacy Office lock allowance stays out of historical index worktree copy and rename scopes", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const buffer = reviewedLegacyOfficeLockBytes(repository);
  const baseline = (fixture) => {
    writeReviewedLegacyOfficeLock(fixture.repo, buffer);
    git(fixture.repo, "add", "--", entry.path);
    git(fixture.repo, "commit", "-m", "add generic legacy Office fixture");
    git(fixture.linked, "merge", "--ff-only", "main");
  };
  const cases = [
    {
      name: "wrong current branch HEAD",
      prepare(fixture) {
        writeReviewedLegacyOfficeLock(fixture.linked, buffer);
        git(fixture.linked, "add", "--", entry.path);
        git(fixture.linked, "commit", "-m", "add non-pinned legacy Office fixture");
      }
    },
    {
      name: "index",
      prepare(fixture) {
        writeReviewedLegacyOfficeLock(fixture.linked, buffer);
        git(fixture.linked, "add", "--", entry.path);
      }
    },
    {
      name: "worktree modified",
      prepare(fixture) {
        baseline(fixture);
        fs.writeFileSync(path.join(fixture.linked, entry.path), Buffer.alloc(entry.bytes));
      }
    },
    {
      name: "historical deletion",
      prepare(fixture) {
        baseline(fixture);
        git(fixture.linked, "rm", "--", entry.path);
        git(fixture.linked, "commit", "-m", "delete generic legacy Office fixture");
      }
    },
    {
      name: "copied",
      prepare(fixture) {
        baseline(fixture);
        fs.copyFileSync(
          path.join(fixture.linked, entry.path),
          path.join(fixture.linked, "coordination/reports/legacy-office-copy.docx")
        );
      }
    },
    {
      name: "renamed",
      prepare(fixture) {
        baseline(fixture);
        git(fixture.linked, "mv", entry.path, "coordination/reports/legacy-office-renamed.docx");
      }
    },
    {
      name: "worktree mode mismatch",
      prepare(fixture) {
        baseline(fixture);
        fs.chmodSync(path.join(fixture.linked, entry.path), 0o755);
      }
    }
  ];
  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      fixtureCase.prepare(fixture);
      assert.throws(
        () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false }),
        /unreadable OOXML|restricted to its pinned current branch HEAD/i
      );
    });
  }
});

test("supplementary untracked legacy Office lock rejects bytes path mode symlink hardlink and non-file types", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const exact = reviewedLegacyOfficeLockBytes(repository);
  const sameSizeMutation = Buffer.from(exact);
  sameSizeMutation[sameSizeMutation.length - 1] ^= 0x01;
  const variants = [
    {
      name: "different size",
      relativePath: entry.path,
      prepare: (root) => writeReviewedLegacyOfficeLock(root, Buffer.concat([exact, Buffer.from([0])]))
    },
    {
      name: "same size different hashes",
      relativePath: entry.path,
      prepare: (root) => writeReviewedLegacyOfficeLock(root, sameSizeMutation)
    },
    {
      name: "different path",
      relativePath: "coordination/reports/legacy-office-copy.docx",
      prepare: (root) => writeReviewedLegacyOfficeLock(root, exact, {
        relativePath: "coordination/reports/legacy-office-copy.docx"
      })
    },
    {
      name: "different mode",
      relativePath: entry.path,
      prepare: (root) => writeReviewedLegacyOfficeLock(root, exact, { mode: 0o600 })
    },
    {
      name: "symlink",
      relativePath: entry.path,
      prepare(root) {
        const target = writeReviewedLegacyOfficeLock(root, exact, { relativePath: "reviewed-office-target.bin" });
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.symlinkSync(path.relative(path.dirname(absolutePath), target), absolutePath);
      }
    },
    {
      name: "hardlink",
      relativePath: entry.path,
      prepare(root) {
        const target = writeReviewedLegacyOfficeLock(root, exact, { relativePath: "reviewed-office-hardlink-target.bin" });
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.linkSync(target, absolutePath);
      }
    },
    {
      name: "directory",
      relativePath: entry.path,
      prepare: (root) => fs.mkdirSync(path.join(root, entry.path), { recursive: true })
    },
    {
      name: "fifo",
      relativePath: entry.path,
      prepare(root) {
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        execFileSync("mkfifo", [absolutePath], { timeout: TEST_CHILD_TIMEOUT_MS });
      }
    }
  ];
  for (const variant of variants) {
    await t.test(variant.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      variant.prepare(fixture.linked);
      assert.throws(
        () => buildInventory(fixture.linked, [variant.relativePath]),
        /reviewed legacy Office lock|unreadable OOXML/i
      );
    });
  }
});

test("supplementary legacy Office lock tar rejects altered inventory duplicate missing mode and symlink members", async (t) => {
  const { collectWorktreeSnapshot, verifyTarPayload } = await import(libraryUrl);
  const repository = maybeReviewedLegacyOfficeLockRepository();
  if (repository === null) {
    t.skip("reviewed legacy Office lock commit and blob are not available in this clone");
    return;
  }
  const entry = REVIEWED_LEGACY_OFFICE_LOCK;
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const source = writeReviewedLegacyOfficeLock(fixture.linked, reviewedLegacyOfficeLockBytes(repository));
  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: true });
  t.after(() => snapshot.cleanup());
  const exactInventory = snapshot.inventory;
  for (const [name, candidate] of [
    ["path", { ...exactInventory[0], path: `${entry.path}.copy` }],
    ["mode", { ...exactInventory[0], mode: 0o600 }],
    ["size", { ...exactInventory[0], size: entry.bytes + 1 }],
    ["sha256", { ...exactInventory[0], sha256: "0".repeat(64) }],
    ["type", { ...exactInventory[0], type: "symlink", target: "safe-target.docx" }]
  ]) {
    await t.test(`altered inventory ${name}`, () => {
      const failures = [];
      verifyTarPayload(snapshot.buffers.untrackedTar, [candidate], `reviewed-office-${name}`, failures);
      assert.ok(failures.length > 0);
    });
  }
  const tarScript = [
    "import io,sys,tarfile",
    "source,output,name,kind=sys.argv[1:]",
    "data=open(source,'rb').read()",
    "if kind == 'bytes': data=data[:-1]+bytes([data[-1]^1])",
    "member_name=(name+'.copy' if kind == 'path' else name)",
    "with tarfile.open(output,'w:gz') as archive:",
    " if kind == 'missing': pass",
    " elif kind == 'symlink':",
    "  item=tarfile.TarInfo(member_name); item.type=tarfile.SYMTYPE; item.linkname='safe-target.docx'; item.mode=0o644; archive.addfile(item)",
    " elif kind == 'hardlink':",
    "  item=tarfile.TarInfo(member_name); item.type=tarfile.LNKTYPE; item.linkname='safe-target.docx'; item.mode=0o644; archive.addfile(item)",
    " else:",
    "  item=tarfile.TarInfo(member_name); item.size=len(data); item.mode=(0o600 if kind == 'mode' else 0o644); archive.addfile(item,io.BytesIO(data))",
    "  if kind == 'duplicate':",
    "   item2=tarfile.TarInfo(member_name); item2.size=len(data); item2.mode=0o644; archive.addfile(item2,io.BytesIO(data))"
  ].join("\n");
  for (const kind of ["bytes", "path", "duplicate", "missing", "mode", "symlink", "hardlink"]) {
    await t.test(`${kind} tar member`, () => {
      const tarPath = path.join(fixture.parent, `${kind}.tar.gz`);
      execFileSync("python3", ["-c", tarScript, source, tarPath, entry.path, kind], {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: TEST_CHILD_TIMEOUT_MS
      });
      const failures = [];
      verifyTarPayload(fs.readFileSync(tarPath), exactInventory, `reviewed-office-${kind}`, failures);
      assert.ok(failures.length > 0);
    });
  }
});

test("supplementary writer-equivalent scan passes the preserved 38-blob real patch corpus", async (t) => {
  const {
    gitBuffer,
    parseDiffNameStatusZ,
    scanBuffer,
    scanCurrentBranchHeadTrackedPaths
  } = await import(libraryUrl);
  const repository = maybePinnedLegacyTerminalPatchRepository();
  if (repository === null) {
    t.skip("pinned closure commit and blobs are not available in this clone");
    return;
  }
  try {
    execFileSync("git", ["cat-file", "-e", `${REVIEWED_LEGACY_TERMINAL_PATCH_BASE}^{commit}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    execFileSync("git", ["cat-file", "-e", `${REVIEWED_REAL_PATCH_CORPUS_EXTRA_ENTRY.objectId}^{blob}`], {
      cwd: repository,
      stdio: "ignore",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
  } catch {
    t.skip("complete preserved real patch corpus is not available in this clone");
    return;
  }
  const branchRange = `${REVIEWED_LEGACY_TERMINAL_PATCH_BASE}...${REVIEWED_LEGACY_TERMINAL_PATCH_HEAD}`;
  const patchPaths = parseDiffNameStatusZ(gitBuffer([
    "diff", "--name-status", "-z", "--find-renames", "--find-copies-harder", branchRange, "--", "."
  ], repository)).currentPaths.filter((relativePath) => relativePath.endsWith(".patch"));
  const uniqueBranchObjects = new Map();
  for (const relativePath of patchPaths) {
    const record = git(repository, "ls-tree", REVIEWED_LEGACY_TERMINAL_PATCH_HEAD, "--", relativePath);
    const match = record.match(/^100644 blob ([0-9a-f]{40})\t/u);
    assert.ok(match, `expected regular patch blob at ${relativePath}`);
    if (!uniqueBranchObjects.has(match[1])) {
      uniqueBranchObjects.set(match[1], Number(git(repository, "cat-file", "-s", match[1])));
    }
  }
  assert.equal(uniqueBranchObjects.size, 37);
  assert.deepEqual(
    scanCurrentBranchHeadTrackedPaths(repository, REVIEWED_LEGACY_TERMINAL_PATCH_HEAD, patchPaths),
    { scanned: patchPaths.length, reviewed: 0 }
  );
  const extra = REVIEWED_REAL_PATCH_CORPUS_EXTRA_ENTRY;
  assert.equal(uniqueBranchObjects.has(extra.objectId), false);
  const extraBuffer = gitBlob(repository, extra.objectId);
  assert.equal(extraBuffer.length, extra.bytes);
  assert.equal(crypto.createHash("sha256").update(extraBuffer).digest("hex"), extra.sha256);
  assert.doesNotThrow(() => scanBuffer(extraBuffer, { displayPath: `untracked/${extra.path}` }));
  assert.equal(uniqueBranchObjects.size + 1, 38);
  assert.equal(
    [...uniqueBranchObjects.values()].reduce((total, bytes) => total + bytes, 0) + extra.bytes,
    225_797_020
  );
});

test("current branch snapshot uses captured object IDs for its branch range and HEAD blob scan", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  writeReviewedUntrackedCoordinationReport(fixture.linked);
  git(fixture.linked, "add", "--", entry.path);
  git(fixture.linked, "commit", "-m", "add captured-range reviewed report");
  const bin = path.join(fixture.parent, "captured-branch-range-bin");
  fs.mkdirSync(bin);
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, `#!/bin/sh
if [ "$1" = "merge-base" ] && [ "$2" = "main" ] && [ "$3" = "HEAD" ]; then exit 91; fi
if [ "$1" = "ls-tree" ]; then
  for arg in "$@"; do if [ "$arg" = "HEAD" ]; then exit 92; fi; done
fi
for arg in "$@"; do if [ "$arg" = "main...HEAD" ]; then exit 93; fi; done
exec "${realGit}" "$@"
`);
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  let snapshot;
  try {
    process.env.PATH = `${bin}:${originalPath}`;
    snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false });
  } finally {
    process.env.PATH = originalPath;
  }
  t.after(() => snapshot?.cleanup());
  assert.equal(snapshot.secretScanner.status, "passed");
});

test("current branch snapshot rejects a captured base ref that drifts after its first scan", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  writeReviewedUntrackedCoordinationReport(fixture.linked);
  git(fixture.linked, "add", "--", entry.path);
  git(fixture.linked, "commit", "-m", "add ref-drift reviewed report");
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), {
      includeTar: false,
      beforeDriftCheck: () => git(fixture.repo, "commit", "--allow-empty", "-m", "move captured base ref")
    }),
    /drift/i
  );
});

test("current branch HEAD reviewed report rejects different path, blob, or mode", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const exact = reviewedUntrackedCoordinationReportBytes();
  const variants = [
    {
      name: "path",
      relativePath: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials-copy.md",
      buffer: exact,
      mode: entry.mode
    },
    {
      name: "blob",
      relativePath: entry.path,
      buffer: Buffer.concat([exact, Buffer.from("\nreviewed fixture mutation\n")]),
      mode: entry.mode
    },
    {
      name: "mode",
      relativePath: entry.path,
      buffer: exact,
      mode: 0o755
    }
  ];
  for (const variant of variants) {
    await t.test(variant.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      writeReviewedUntrackedCoordinationReport(fixture.linked, variant);
      git(fixture.linked, "add", "--", variant.relativePath);
      git(fixture.linked, "commit", "-m", `add mismatched reviewed report ${variant.name}`);
      assert.throws(
        () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false }),
        /secret-looking path/i
      );
    });
  }
});

test("current branch HEAD allowance never applies to a branch-base deletion or rename source", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const exact = reviewedUntrackedCoordinationReportBytes();
  for (const operation of ["delete", "rename"]) {
    await t.test(operation, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      commitFixtureBlob(fixture, entry.path, exact);
      git(fixture.linked, "merge", "--ff-only", "main");
      if (operation === "delete") {
        fs.unlinkSync(path.join(fixture.linked, entry.path));
        git(fixture.linked, "add", "-u", "--", entry.path);
      } else {
        const safePath = "coordination/blockers/reviewed-a19-current.md";
        git(fixture.linked, "mv", entry.path, safePath);
      }
      git(fixture.linked, "commit", "-m", `${operation} reviewed branch-base report`);
      assert.throws(
        () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false }),
        /secret-looking path/i
      );
    });
  }
});

test("current branch HEAD allowance never applies to changed tracked content", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const absolutePath = writeReviewedUntrackedCoordinationReport(fixture.linked);
  git(fixture.linked, "add", "--", entry.path);
  git(fixture.linked, "commit", "-m", "add reviewed branch report before mutation");
  fs.appendFileSync(absolutePath, "\nreviewed working-tree mutation\n");
  assert.throws(
    () => collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: false }),
    /secret-looking path/i
  );
});

test("exact reviewed untracked coordination report uses a safe display path while retaining content scanning", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const buffer = reviewedUntrackedCoordinationReportBytes();
  assert.doesNotThrow(() => scanBuffer(buffer, {
    displayPath: REVIEWED_UNTRACKED_COORDINATION_REPORT_DISPLAY_PATH
  }));
  assert.throws(
    () => scanBuffer(Buffer.concat([buffer, Buffer.from(`\nleaked ${providerTokenFixture("R".repeat(40))}\n`)]), {
      displayPath: REVIEWED_UNTRACKED_COORDINATION_REPORT_DISPLAY_PATH
    }),
    /high-confidence token/i
  );
});

test("buildInventory accepts only the exact reviewed untracked coordination report", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const absolutePath = writeReviewedUntrackedCoordinationReport(fixture.linked);
  assert.equal(git(fixture.linked, "hash-object", absolutePath), entry.objectId);
  assert.deepEqual(buildInventory(fixture.linked, [entry.path]), {
    inventory: [{
      path: entry.path,
      type: "file",
      mode: entry.mode,
      size: entry.bytes,
      sha256: entry.sha256
    }],
    reviewedBinaryPaths: 0,
    reviewedProtectedOverlayPaths: 0
  });
});

test("snapshot and tar preserve the exact reviewed untracked coordination report", async (t) => {
  const { collectWorktreeSnapshot, verifyTarPayload } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  writeReviewedUntrackedCoordinationReport(fixture.linked);
  const snapshot = collectWorktreeSnapshot({
    branch: "feature/archive",
    head: git(fixture.linked, "rev-parse", "HEAD"),
    path: fixture.linked
  }, { includeTar: true });
  t.after(() => snapshot.cleanup());
  assert.deepEqual(snapshot.inventory, [{
    path: entry.path,
    type: "file",
    mode: entry.mode,
    size: entry.bytes,
    sha256: entry.sha256
  }]);
  assert.ok(Buffer.isBuffer(snapshot.buffers.untrackedTar));
  const failures = [];
  verifyTarPayload(snapshot.buffers.untrackedTar, snapshot.inventory, "reviewed-untracked-report", failures);
  assert.deepEqual(failures, []);
});

test("snapshot releases tar scratch before returning its materialized buffer", async (t) => {
  const { collectWorktreeSnapshot, verifyTarPayload } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "safe-untracked.txt"), "materialized tar payload\n");
  const scratchBefore = new Set(
    fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith("mais-evidence-tar-"))
  );
  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: true });
  t.after(() => snapshot.cleanup());

  const newScratch = fs.readdirSync(os.tmpdir()).filter(
    (name) => name.startsWith("mais-evidence-tar-") && !scratchBefore.has(name)
  );
  assert.deepEqual(newScratch, []);
  assert.ok(Buffer.isBuffer(snapshot.buffers.untrackedTar));
  assert.ok(snapshot.buffers.untrackedTar.length > 0);
  const failures = [];
  verifyTarPayload(snapshot.buffers.untrackedTar, snapshot.inventory, "released-tar-scratch", failures);
  assert.deepEqual(failures, []);
  assert.doesNotThrow(() => snapshot.cleanup());
  assert.doesNotThrow(() => snapshot.cleanup());
});

test("snapshot streams canonical tar without a plain-tar scratch copy and preserves legacy bytes", async (t) => {
  const { collectWorktreeSnapshot } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture.linked, "nested"));
  fs.writeFileSync(path.join(fixture.linked, "nested", "regular.txt"), "streamed canonical tar\n");
  fs.linkSync(
    path.join(fixture.linked, "nested", "regular.txt"),
    path.join(fixture.linked, "nested", "hardlink.txt")
  );
  fs.symlinkSync("regular.txt", path.join(fixture.linked, "nested", "symlink.txt"));

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-legacy-tar-test-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const listPath = path.join(scratch, "paths0");
  const plainTarPath = path.join(scratch, "legacy.tar");
  const gzipTarPath = path.join(scratch, "legacy.tar.gz");
  const paths0 = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { cwd: fixture.linked, encoding: null, timeout: TEST_CHILD_TIMEOUT_MS }
  );
  fs.writeFileSync(listPath, paths0, { mode: 0o600 });
  const realTar = execFileSync("which", ["tar"], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  }).trim();
  execFileSync(realTar, ["-cf", plainTarPath, "-C", fixture.linked, "--null", "-T", listPath], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const legacyCanonicalize = [
    "import copy,gzip,sys,tarfile",
    "with tarfile.open(sys.argv[1], 'r:') as source, open(sys.argv[2], 'wb') as raw:",
    " with gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed:",
    "  with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as target:",
    "   for member in source.getmembers():",
    "    clean=copy.copy(member)",
    "    clean.uid=clean.gid=0",
    "    clean.uname=clean.gname=''",
    "    clean.mtime=0",
    "    clean.pax_headers={}",
    "    target.addfile(clean, source.extractfile(member) if member.isfile() else None)"
  ].join("\n");
  execFileSync("python3", ["-c", legacyCanonicalize, plainTarPath, gzipTarPath], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const expected = fs.readFileSync(gzipTarPath);

  const shimDirectory = path.join(fixture.parent, "streaming-tar-bin");
  fs.mkdirSync(shimDirectory);
  const shim = path.join(shimDirectory, "tar");
  fs.writeFileSync(shim, `#!/bin/sh
if [ "$1" = "-cf" ] && [ "$2" != "-" ]; then
  printf '%s\n' 'plain tar scratch output is forbidden' >&2
  exit 73
fi
exec "$REAL_TAR" "$@"
`);
  fs.chmodSync(shim, 0o755);
  const originalPath = process.env.PATH;
  const originalRealTar = process.env.REAL_TAR;
  let snapshot;
  try {
    process.env.PATH = `${shimDirectory}:${originalPath}`;
    process.env.REAL_TAR = realTar;
    snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), { includeTar: true });
  } finally {
    process.env.PATH = originalPath;
    if (originalRealTar === undefined) delete process.env.REAL_TAR;
    else process.env.REAL_TAR = originalRealTar;
  }
  t.after(() => snapshot?.cleanup());
  assert.ok(snapshot.buffers.untrackedTar.equals(expected));
});

test("writer archives the exact reviewed untracked coordination report", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeReviewedUntrackedCoordinationReport(fixture.linked);
  const result = run(writer, fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("tar handling requires the exact reviewed untracked coordination report inventory", async (t) => {
  const { collectWorktreeSnapshot, verifyTarPayload } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  writeReviewedUntrackedCoordinationReport(fixture.linked);
  const snapshot = collectWorktreeSnapshot({
    branch: "feature/archive",
    head: git(fixture.linked, "rev-parse", "HEAD"),
    path: fixture.linked
  }, { includeTar: true });
  t.after(() => snapshot.cleanup());
  const exactInventory = snapshot.inventory[0];
  for (const [name, candidate] of [
    ["path", { ...exactInventory, path: `${entry.path}.copy` }],
    ["mode", { ...exactInventory, mode: 0o600 }],
    ["size", { ...exactInventory, size: exactInventory.size + 1 }],
    ["sha256", { ...exactInventory, sha256: "0".repeat(64) }],
    ["type", { ...exactInventory, type: "symlink", target: "safe-target.md" }]
  ]) {
    await t.test(name, () => {
      const failures = [];
      verifyTarPayload(snapshot.buffers.untrackedTar, [candidate], `reviewed-untracked-${name}`, failures);
      assert.ok(failures.length > 0);
    });
  }
});

test("reviewed untracked coordination report rejects byte, size, hash, path, mode, symlink, and type mismatches", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const entry = REVIEWED_UNTRACKED_COORDINATION_REPORT;
  const exact = reviewedUntrackedCoordinationReportBytes();
  const sameSizeMutation = Buffer.from(exact);
  sameSizeMutation[sameSizeMutation.length - 1] ^= 0x01;
  const variants = [
    {
      name: "different size",
      prepare: (root) => writeReviewedUntrackedCoordinationReport(root, { buffer: Buffer.concat([exact, Buffer.from("x")]) }),
      relativePath: entry.path
    },
    {
      name: "same size but different hashes",
      prepare: (root) => writeReviewedUntrackedCoordinationReport(root, { buffer: sameSizeMutation }),
      relativePath: entry.path
    },
    {
      name: "different exact path",
      prepare: (root) => writeReviewedUntrackedCoordinationReport(root, {
        relativePath: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials-copy.md"
      }),
      relativePath: "coordination/blockers/2026-06-24-A19-bug-lrs-credentials-copy.md"
    },
    {
      name: "different mode",
      prepare: (root) => writeReviewedUntrackedCoordinationReport(root, { mode: 0o600 }),
      relativePath: entry.path
    },
    {
      name: "symlink",
      prepare: (root) => {
        const target = writeReviewedUntrackedCoordinationReport(root, { relativePath: "reviewed-a19-target.md" });
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.symlinkSync(path.relative(path.dirname(absolutePath), target), absolutePath);
      },
      relativePath: entry.path
    },
    {
      name: "hardlink",
      prepare: (root) => {
        const target = writeReviewedUntrackedCoordinationReport(root, { relativePath: "reviewed-a19-hardlink-target.md" });
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.linkSync(target, absolutePath);
      },
      relativePath: entry.path
    },
    {
      name: "directory",
      prepare: (root) => fs.mkdirSync(path.join(root, entry.path), { recursive: true }),
      relativePath: entry.path
    },
    {
      name: "fifo",
      prepare: (root) => {
        const absolutePath = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        execFileSync("mkfifo", [absolutePath], { timeout: TEST_CHILD_TIMEOUT_MS });
      },
      relativePath: entry.path
    }
  ];
  for (const variant of variants) {
    await t.test(variant.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      variant.prepare(fixture.linked);
      assert.throws(
        () => buildInventory(fixture.linked, [variant.relativePath]),
        /reviewed untracked coordination report|secret-looking path/i
      );
    });
  }
});

test("reviewed protected overlay requires the exact preservation ref before accepting exact untracked text", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const entry = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md"
  ));
  assert.ok(entry);
  const buffer = reviewedLegacyExactTextBytes(repository, entry);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeReviewedProtectedOverlayFile(fixture.linked, entry, buffer);

  assert.throws(
    () => buildInventory(fixture.linked, [entry.path]),
    /secret scanner rejected|secret-looking path/i
  );

  enableReviewedProtectedOverlayFixture(fixture, repository);
  const fixtureOptions = reviewedProtectedOverlayFixtureOptions(fixture);
  assert.deepEqual(buildInventory(fixture.linked, [entry.path], fixtureOptions), {
    inventory: [{
      path: entry.path,
      type: "file",
      mode: REVIEWED_PROTECTED_OVERLAY_UNTRACKED_MODES.get(entry.path),
      size: entry.bytes,
      sha256: entry.sha256
    }],
    reviewedBinaryPaths: 0,
    reviewedProtectedOverlayPaths: 1
  });

  git(fixture.repo, "update-ref", REVIEWED_PROTECTED_OVERLAY_REF, git(fixture.repo, "rev-parse", "HEAD"));
  assert.throws(
    () => buildInventory(fixture.linked, [entry.path], fixtureOptions),
    /reviewed protected overlay reference mismatch/i
  );
});

test("reviewed protected overlay returns to generic scanning before exact file and blob checks when its ref is absent", async (t) => {
  const {
    scanReviewedProtectedOverlayFile,
    scanReviewedProtectedOverlayGitBlob
  } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const untracked = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  const absolutePath = path.join(fixture.linked, untracked.path);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, "portable generic report\n", { mode: 0o644 });

  assert.equal(
    scanReviewedProtectedOverlayFile(fixture.linked, untracked.path, "untracked"),
    null
  );

  const tracked = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/ai-tutor-live-text.spec.ts"
  ));
  assert.ok(tracked);
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    tracked.path,
    "tracked-current",
    { mode: "100755", type: "blob", objectId: "0".repeat(40) }
  ), null);
});

test("tar verification applies protected-overlay strictness only to exact protected inventory identities", async () => {
  const { verifyTarPayload } = await import(libraryUrl);
  const entry = REVIEWED_LEGACY_PARENT_CONSOLE_REPORT;
  const buffer = Buffer.from("portable generic report\n");
  const inventory = [{
    path: entry.path,
    type: "file",
    mode: 0o644,
    size: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  }];
  const failures = [];
  verifyTarPayload(
    portableSingleFileTarGzip(entry.path, buffer),
    inventory,
    "generic protected-path tar",
    failures
  );
  assert.deepEqual(failures, []);
});

test("reviewed protected overlay rejects a different repository even when ref and objects are copied", async (t) => {
  const { resolveReviewedProtectedOverlayContext } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  assert.throws(
    () => resolveReviewedProtectedOverlayContext(fixture.linked),
    /reviewed protected overlay repository identity mismatch/i
  );
  assert.doesNotThrow(() => resolveReviewedProtectedOverlayContext(fixture.linked, {
    expectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  }));
});

test("reviewed protected overlay accepts every approved exact untracked identity", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const approved = [
    ...REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES.map((entry) => ({
      entry,
      buffer: reviewedLegacyTerminalPatchBytes(repository, entry)
    })),
    {
      entry: REVIEWED_LEGACY_PARENT_CONSOLE_REPORT,
      buffer: reviewedLegacyExactTextBytes(repository, REVIEWED_LEGACY_PARENT_CONSOLE_REPORT)
    },
    ...REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES
      .filter((entry) => !entry.path.startsWith("tests/e2e/"))
      .map((entry) => ({ entry, buffer: reviewedLegacyExactTextBytes(repository, entry) })),
    ...REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES
      .map((entry) => ({ entry, buffer: reviewedLegacyJpegUnderPngBytes(repository, entry) })),
    {
      entry: REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS,
      buffer: reviewedLegacyOfficeLockBytes(repository)
    }
  ];
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  for (const { entry, buffer } of approved) {
    writeReviewedProtectedOverlayFile(fixture.linked, entry, buffer);
  }
  const result = buildInventory(
    fixture.linked,
    approved.map(({ entry }) => entry.path),
    reviewedProtectedOverlayFixtureOptions(fixture)
  );
  assert.equal(result.inventory.length, approved.length);
  assert.equal(result.reviewedProtectedOverlayPaths, approved.length);
  assert.equal(result.reviewedBinaryPaths, REVIEWED_LEGACY_CURRENT_HEAD_JPEG_UNDER_PNG_ENTRIES.length);
});

test("reviewed protected overlay exact untracked policy rejects copied, mode, byte, symlink, and hardlink variants", async (t) => {
  const { buildInventory } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const entry = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "coordination/reports/2026-06-04-teacher-console-p0-p1-bug-audit.md"
  ));
  assert.ok(entry);
  const exact = reviewedLegacyExactTextBytes(repository, entry);
  const mutation = Buffer.from(exact);
  mutation[mutation.length - 1] ^= 1;
  const variants = [
    {
      name: "copied path",
      relativePath: `${entry.path}.copy`,
      prepare: (root) => writeReviewedProtectedOverlayFile(root, entry, exact, {
        relativePath: `${entry.path}.copy`
      })
    },
    {
      name: "wrong mode",
      relativePath: entry.path,
      prepare: (root) => writeReviewedProtectedOverlayFile(root, entry, exact, { mode: 0o644 })
    },
    {
      name: "same-size byte mutation",
      relativePath: entry.path,
      prepare: (root) => writeReviewedProtectedOverlayFile(root, entry, mutation)
    },
    {
      name: "symlink",
      relativePath: entry.path,
      prepare(root) {
        const donor = writeReviewedProtectedOverlayFile(root, entry, exact, {
          relativePath: "protected-overlay-symlink-donor.md"
        });
        const target = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.symlinkSync(path.relative(path.dirname(target), donor), target);
      }
    },
    {
      name: "hardlink",
      relativePath: entry.path,
      prepare(root) {
        const donor = writeReviewedProtectedOverlayFile(root, entry, exact, {
          relativePath: "protected-overlay-hardlink-donor.md"
        });
        const target = path.join(root, entry.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.linkSync(donor, target);
      }
    }
  ];
  for (const variant of variants) {
    await t.test(variant.name, () => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
      enableReviewedProtectedOverlayFixture(fixture, repository);
      variant.prepare(fixture.linked);
      assert.throws(
        () => buildInventory(
          fixture.linked,
          [variant.relativePath],
          reviewedProtectedOverlayFixtureOptions(fixture)
        ),
        /reviewed protected overlay|secret scanner rejected|secret-looking path/i
      );
    });
  }
});

test("reviewed protected overlay accepts only the exact A02 index-before-worktree snapshot blob", async (t) => {
  const {
    resolveReviewedProtectedOverlayContext,
    scanReviewedProtectedOverlayGitBlob
  } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const entry = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "lib/server/userStoreAuthSessionPersistence.test.ts"
  ));
  assert.ok(entry);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);

  assert.throws(
    () => resolveReviewedProtectedOverlayContext(fixture.linked),
    /reviewed protected overlay repository identity mismatch/i
  );
  const context = resolveReviewedProtectedOverlayContext(fixture.linked, {
    expectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  });
  const exactEntry = { mode: entry.mode, type: entry.type, objectId: entry.objectId };
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    entry.path,
    "index-before-worktree",
    exactEntry,
    context
  )?.reviewedProtectedOverlay, true);
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    entry.path,
    "historical",
    exactEntry,
    context
  )?.reviewedProtectedOverlay, true);

  for (const sourceKind of ["tracked-current", "worktree-current"]) {
    assert.equal(scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      entry.path,
      sourceKind,
      exactEntry,
      context
    ), null);
  }
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    `${entry.path}.copy`,
    "index-before-worktree",
    exactEntry,
    context
  ), null);
  for (const candidate of [
    { ...exactEntry, mode: "100755" },
    { ...exactEntry, type: "tree" },
    { ...exactEntry, objectId: "0".repeat(40) }
  ]) {
    assert.throws(
      () => scanReviewedProtectedOverlayGitBlob(
        fixture.linked,
        entry.path,
        "index-before-worktree",
        candidate,
        context
      ),
      /reviewed protected overlay Git metadata mismatch/i
    );
  }

  git(fixture.repo, "update-ref", REVIEWED_PROTECTED_OVERLAY_REF, git(fixture.repo, "rev-parse", "HEAD"));
  assert.throws(
    () => scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      entry.path,
      "index-before-worktree",
      exactEntry,
      context
    ),
    /reviewed protected overlay reference mismatch/i
  );
});

test("reviewed protected overlay accepts exact ai-tutor live text only at 0600 or 0644", async (t) => {
  const {
    resolveReviewedProtectedOverlayContext,
    scanReviewedProtectedOverlayFile
  } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const entry = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/ai-tutor-live-text.spec.ts"
  ));
  assert.ok(entry);
  const buffer = reviewedLegacyExactTextBytes(repository, entry);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  const absolutePath = writeReviewedProtectedOverlayFile(fixture.linked, entry, buffer, { mode: 0o600 });
  const context = resolveReviewedProtectedOverlayContext(fixture.linked, {
    expectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  });

  for (const mode of [0o600, 0o644]) {
    fs.chmodSync(absolutePath, mode);
    for (const sourceKind of ["worktree-current", "tracked-current"]) {
      const scan = scanReviewedProtectedOverlayFile(
        fixture.linked,
        entry.path,
        sourceKind,
        context
      );
      assert.equal(scan?.reviewedProtectedOverlay, true);
      assert.equal(scan?.mode, mode);
    }
  }

  fs.chmodSync(absolutePath, 0o664);
  for (const sourceKind of ["worktree-current", "tracked-current"]) {
    assert.throws(
      () => scanReviewedProtectedOverlayFile(
        fixture.linked,
        entry.path,
        sourceKind,
        context
      ),
      /reviewed protected overlay file metadata mismatch/i
    );
  }
});

test("reviewed protected overlay confines e909 and protected-tree blobs to their exact tracked source kinds", async (t) => {
  const {
    collectWorktreeSnapshot,
    resolveReviewedProtectedOverlayContext,
    scanReviewedProtectedOverlayGitBlob
  } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const current = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/ai-tutor-live-text.spec.ts"
  ));
  const historical = REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/ai-tutor-live-text.spec.ts"
  ));
  assert.ok(current);
  assert.ok(historical);
  const currentBuffer = reviewedLegacyExactTextBytes(repository, current);
  const historicalBuffer = reviewedLegacyExactTextBytes(repository, historical);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  commitFixtureBlob(fixture, historical.path, historicalBuffer);
  git(fixture.linked, "merge", "--ff-only", "main");
  writeReviewedProtectedOverlayFile(fixture.linked, current, currentBuffer, { mode: 0o644 });

  const context = resolveReviewedProtectedOverlayContext(fixture.linked, {
    expectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  });
  const currentGitEntry = { mode: current.mode, type: current.type, objectId: current.objectId };
  const historicalGitEntry = { mode: historical.mode, type: historical.type, objectId: historical.objectId };
  assert.equal(
    scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      current.path,
      "worktree-current",
      currentGitEntry,
      context
    )?.reviewedProtectedOverlay,
    true
  );
  assert.equal(
    scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      current.path,
      "tracked-current",
      currentGitEntry,
      context
    )?.reviewedProtectedOverlay,
    true
  );
  assert.equal(
    scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      historical.path,
      "index-before-worktree",
      historicalGitEntry,
      context
    )?.reviewedProtectedOverlay,
    true
  );
  assert.equal(
    scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      historical.path,
      "historical",
      historicalGitEntry,
      context
    )?.reviewedProtectedOverlay,
    true
  );
  for (const [sourceKind, relativePath, entry] of [
    ["index", historical.path, historicalGitEntry],
    ["worktree-current", `${current.path}.copy`, currentGitEntry]
  ]) {
    assert.equal(
      scanReviewedProtectedOverlayGitBlob(fixture.linked, relativePath, sourceKind, entry, context),
      null
    );
  }
  for (const [sourceKind, relativePath, entry] of [
    ["historical", current.path, currentGitEntry],
    ["worktree-current", current.path, { ...currentGitEntry, mode: "100755" }],
    ["worktree-current", current.path, { ...currentGitEntry, objectId: "0".repeat(40) }]
  ]) {
    assert.throws(
      () => scanReviewedProtectedOverlayGitBlob(
        fixture.linked,
        relativePath,
        sourceKind,
        entry,
        context
      ),
      /reviewed protected overlay Git metadata mismatch/i
    );
  }
  for (const mutation of ["mode", "path", "bytes"]) {
    withReviewedLegacyPinnedBlobGitShim(t, current, mutation, () => {
      assert.throws(
        () => scanReviewedProtectedOverlayGitBlob(
          fixture.linked,
          current.path,
          "tracked-current",
          currentGitEntry,
          context
        ),
        /reviewed protected overlay (?:source|Git blob)/i
      );
    });
  }

  const practiceCurrent = REVIEWED_LEGACY_CURRENT_HEAD_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/practice-bank-solvability.spec.ts"
  ));
  const practiceHistorical = REVIEWED_LEGACY_BRANCH_BASE_TEXT_ENTRIES.find(({ path: relativePath }) => (
    relativePath === "tests/e2e/practice-bank-solvability.spec.ts"
  ));
  assert.ok(practiceCurrent);
  assert.ok(practiceHistorical);
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    practiceCurrent.path,
    "tracked-current",
    { mode: practiceCurrent.mode, type: practiceCurrent.type, objectId: practiceCurrent.objectId },
    context
  )?.reviewedProtectedOverlay, true);
  assert.equal(scanReviewedProtectedOverlayGitBlob(
    fixture.linked,
    practiceHistorical.path,
    "historical",
    { mode: practiceHistorical.mode, type: practiceHistorical.type, objectId: practiceHistorical.objectId },
    context
  )?.reviewedProtectedOverlay, true);

  const snapshot = collectWorktreeSnapshot(fixtureLinkedWorktree(fixture), {
    includeTar: false,
    ...reviewedProtectedOverlayFixtureOptions(fixture)
  });
  assert.equal(snapshot.secretScanner.reviewedProtectedOverlayPaths, 4);
});

test("reviewed protected overlay accepts only the exact A18 Office-lock alias and verifies it from tar", async (t) => {
  const { buildInventory, verifyTarPayload } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const entry = REVIEWED_PROTECTED_OVERLAY_OFFICE_LOCK_ALIAS;
  const buffer = reviewedLegacyOfficeLockBytes(repository);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  writeReviewedProtectedOverlayFile(fixture.linked, entry, buffer);
  const exactInventory = {
    path: entry.path,
    type: "file",
    mode: entry.mode,
    size: entry.bytes,
    sha256: entry.sha256
  };
  assert.deepEqual(buildInventory(
    fixture.linked,
    [entry.path],
    reviewedProtectedOverlayFixtureOptions(fixture)
  ), {
    inventory: [exactInventory],
    reviewedBinaryPaths: 0,
    reviewedProtectedOverlayPaths: 1
  });

  const failures = [];
  verifyTarPayload(
    portableSingleFileTarGzip(entry.path, buffer),
    [exactInventory],
    "reviewed-protected-overlay-office-lock-alias",
    failures
  );
  assert.deepEqual(failures, []);

  for (const [name, tarBuffer, inventory] of [
    [
      "path",
      portableSingleFileTarGzip(`${entry.path}.copy`, buffer),
      [{ ...exactInventory, path: `${entry.path}.copy` }]
    ],
    [
      "mode",
      portableSingleFileTarGzip(entry.path, buffer, { mode: 0o600 }),
      [{ ...exactInventory, mode: 0o600 }]
    ],
    [
      "sha256",
      portableSingleFileTarGzip(entry.path, buffer),
      [{ ...exactInventory, sha256: "0".repeat(64) }]
    ]
  ]) {
    await t.test(`tar ${name}`, () => {
      const candidateFailures = [];
      verifyTarPayload(tarBuffer, inventory, `reviewed-protected-overlay-${name}`, candidateFailures);
      assert.ok(candidateFailures.length > 0);
    });
  }

  for (const kind of ["symlink", "hardlink"]) {
    await t.test(kind, () => {
      const variant = makeFixture();
      t.after(() => fs.rmSync(variant.parent, { recursive: true, force: true }));
      enableReviewedProtectedOverlayFixture(variant, repository);
      const donor = writeReviewedProtectedOverlayFile(variant.linked, entry, buffer, {
        relativePath: `protected-overlay-office-${kind}-donor.docx`
      });
      const target = path.join(variant.linked, entry.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (kind === "symlink") fs.symlinkSync(path.relative(path.dirname(target), donor), target);
      else fs.linkSync(donor, target);
      assert.throws(
        () => buildInventory(
          variant.linked,
          [entry.path],
          reviewedProtectedOverlayFixtureOptions(variant)
        ),
        /reviewed protected overlay|secret scanner rejected/i
      );
    });
  }
});

test("reviewed protected overlay never covers unique blockers and lets altered safe patches fall through", async (t) => {
  const {
    buildInventory,
    resolveReviewedProtectedOverlayContext,
    scanReviewedProtectedOverlayGitBlob
  } = await import(libraryUrl);
  const repository = maybeReviewedProtectedOverlayRepository();
  if (!repository) return t.skip("pinned protected-overlay Git objects are unavailable");
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  enableReviewedProtectedOverlayFixture(fixture, repository);
  const context = resolveReviewedProtectedOverlayContext(fixture.linked, {
    expectedRepositoryId: reviewedProtectedOverlayFixtureRepositoryId(fixture)
  });
  for (const [relativePath, objectId] of [
    ["app/api/ai-tutor/status/route.ts", "a16874db8875dc16c0c47aaef1476b7f27c5e1b0"],
    ["app/api/ai-tutor/status/route.ts", "c71948a1bea37c9d2a325a2a7a12a3b90b3e2b2d"],
    ["lib/server/userStoreAuthSessionPersistence.test.ts", "56214c0000000000000000000000000000000000"],
    ["coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs", "b290c000000000000000000000000000000000000"]
  ]) {
    assert.equal(scanReviewedProtectedOverlayGitBlob(
      fixture.linked,
      relativePath,
      "tracked-current",
      { mode: "100644", type: "blob", objectId },
      context
    ), null);
  }

  const terminalPatch = REVIEWED_LEGACY_TERMINAL_PATCH_ENTRIES[0];
  const safeAlteredPatch = Buffer.from([
    "diff --git a/reviewed.ts b/reviewed.ts",
    "@@ -0,0 +1 @@",
    "+const reviewed = true;"
  ].join("\n"));
  writeReviewedProtectedOverlayFile(fixture.linked, terminalPatch, safeAlteredPatch);
  assert.deepEqual(buildInventory(
    fixture.linked,
    [terminalPatch.path],
    reviewedProtectedOverlayFixtureOptions(fixture)
  ), {
    inventory: [{
      path: terminalPatch.path,
      type: "file",
      mode: 0o644,
      size: safeAlteredPatch.length,
      sha256: crypto.createHash("sha256").update(safeAlteredPatch).digest("hex")
    }],
    reviewedBinaryPaths: 0,
    reviewedProtectedOverlayPaths: 0
  });
});

test("archive schema v3 binds protected-overlay counts while exact legacy v2 entries remain readable", async () => {
  const {
    ARCHIVE_ARTIFACT_KEYS,
    EVIDENCE_SCHEMA_VERSION,
    fingerprint,
    verifyArchiveEntrySchema,
    verifyArchiveSetSchema
  } = await import(libraryUrl);
  assert.equal(EVIDENCE_SCHEMA_VERSION, 3);
  const schemaFixture = (schemaVersion) => {
    const branch = "feature/archive";
    const head = "b".repeat(40);
    const currentStateFingerprint = "c".repeat(64);
    const basis = {
      schemaVersion,
      dirtyMapStatusSignature: "legacy-v2-signature",
      expandedStatusEntries: 1,
      entries: [currentStateFingerprint]
    };
    const archiveSetFingerprint = fingerprint(basis);
    const entryId = fingerprint({ branch, head }).slice(0, 24);
    const artifacts = Object.fromEntries(ARCHIVE_ARTIFACT_KEYS.map((key) => [
      key,
      key === "branchPatch" || key === "untrackedTar"
        ? null
        : {
          bytes: 0,
          path: path.posix.join("sets", archiveSetFingerprint, entryId, {
            statusInventory: "status.porcelain-v1.z",
            trackedPatch: "tracked.patch",
            indexInventory: "index.ls-files-stage.z",
            indexPatch: "index.patch",
            worktreePatch: "worktree.patch",
            untrackedPaths0: "untracked.paths0",
            untrackedInventory: "untracked.inventory.json"
          }[key]),
          sha256: "d".repeat(64)
        }
    ]));
    const secretScanner = {
      status: "passed",
      scannedPaths: 1,
      reviewedBinaryPaths: 0,
      ...(schemaVersion === 3 ? { reviewedProtectedOverlayPaths: 0 } : {})
    };
    const entry = {
      schemaVersion,
      branch,
      archiveKind: "dirty-worktree",
      head,
      baseHead: head,
      divergence: { behind: 0, ahead: 0 },
      statusEntries: 1,
      untrackedEntries: 0,
      transactionMetadataExclusions: [],
      currentStateFingerprint,
      archiveSetFingerprint,
      secretScanner,
      artifacts
    };
    const manifest = {
      schemaVersion,
      generatedAt: "2026-07-13T00:00:00.000Z",
      evidenceRootId: "00000000-0000-4000-8000-000000000001",
      archiveSetFingerprint,
      dirtyMapStatusSignature: basis.dirtyMapStatusSignature,
      expandedStatusEntries: 1,
      archivedWorktrees: [entry]
    };
    const index = {
      schemaVersion,
      evidenceRootId: manifest.evidenceRootId,
      archiveSetFingerprint,
      basis,
      entries: [entry]
    };
    return { entry, index, manifest };
  };

  for (const schemaVersion of [2, 3]) {
    const fixture = schemaFixture(schemaVersion);
    assert.equal(verifyArchiveEntrySchema(fixture.entry, {}, []), true);
    assert.equal(verifyArchiveSetSchema(fixture.manifest, fixture.index, []), true);
  }
  const legacyWithNewCount = structuredClone(schemaFixture(2).entry);
  legacyWithNewCount.secretScanner.reviewedProtectedOverlayPaths = 0;
  assert.equal(verifyArchiveEntrySchema(legacyWithNewCount, {}, []), false);
  const currentWithoutCount = structuredClone(schemaFixture(3).entry);
  delete currentWithoutCount.secretScanner.reviewedProtectedOverlayPaths;
  assert.equal(verifyArchiveEntrySchema(currentWithoutCount, {}, []), false);
});

test("fixture secret placeholders are exact and do not whitelist nearby real values", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "DASHBOARD_SMOKE_PASSWORD=secret-password-value",
    "SESSION_CREDENTIAL=fixture-credential-value",
    "SERVICE_API_KEY=fixture-api-key-value",
    "LLM_API_KEY=your-server-side-key",
    "DEEPSEEK_API_KEY=your-deepseek-server-side-key",
    "QWEN_API_KEY=your-qwen-server-side-key",
    "AUTH_SESSION_SECRET=replace-with-a-long-random-value",
    'const fixture = { DASHBOARD_SMOKE_PASSWORD: "secret-password-value" };'
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: source.startsWith("const") ? "fixture.ts" : "fixture.env.example" }));
  }
  for (const value of [
    "secret-password-value-live",
    "prod-secret-password-value",
    "fixture-credential-value2",
    "fixture-api-key-value-prod",
    resendTokenFixture("xxxxxxxxx-prod"),
    resendTokenFixture("xxxxxxxx-"),
    "your-managed-provider-key-prod",
    "your-openai-server-side-key",
    "your-deepseek-server-side-key-prod",
    `your-${"A".repeat(40)}-key`,
    "your-ABCDE-FGHIJ-KLMNO-PQRST-key",
    "your-ab12-cd34-ef56-gh78-token",
    "replace-with-a-long-random-value-prod",
    `${"A".repeat(20)}example${"B".repeat(20)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(`DASHBOARD_SMOKE_PASSWORD=${value}`), { displayPath: "nearby-real.env" }),
      /high-confidence token(?: assignment)?/i
    );
  }
  assert.throws(
    () => scanBuffer(Buffer.from(providerTokenFixture(`example-${"C".repeat(30)}`)), { displayPath: "nearby-real.txt" }),
    /high-confidence token/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(providerTokenFixture("placeholder-xxxxxxxx-")), { displayPath: "nearby-real.txt" }),
    /high-confidence token/i
  );
  for (const separator of ["!", " ", ":"]) {
    assert.throws(
      () => scanBuffer(
        Buffer.from(`DASHBOARD_SMOKE_PASSWORD=secret-password-value${separator}${"D".repeat(20)}`),
        { displayPath: "nearby-real.env.example" }
      ),
      /token assignment/i
    );
  }
  assert.throws(
    () => scanBuffer(
      Buffer.from(`DASHBOARD_SMOKE_PASSWORD=<${"G".repeat(40)}>`),
      { displayPath: "nearby-real.env.example" }
    ),
    /token assignment/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(`{"password":"${"E".repeat(40)}"}`), { displayPath: "provider.json" }),
    /token assignment/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(`{"dbPassword":"${"H".repeat(40)}"}`), { displayPath: "provider.json" }),
    /token assignment/i
  );
  for (const source of [
    `{"model":"chat","password":"${"J".repeat(40)}"}`,
    `MODEL=chat; DASHBOARD_SMOKE_PASSWORD=${"K".repeat(40)}`,
    `{"password":"fixture-password-value","clientSecret":"${"L".repeat(40)}"}`
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath: source.startsWith("{") ? "provider.json" : "provider.env" }), /token assignment/i);
  }
  assert.throws(
    () => scanBuffer(
      Buffer.from(`DASHBOARD_SMOKE_PASSWORD="${"I".repeat(40)} extra"`),
      { displayPath: "nearby-real.env.example" }
    ),
    /token assignment/i
  );
  for (const { source, displayPath } of [
    { source: `DASHBOARD_SMOKE_PASSWORD=fixture-api-key-value # ${"F".repeat(40)}`, displayPath: "placeholder.env.example" },
    { source: '{"password":"fixture-api-key-value"}', displayPath: "placeholder.json" },
    { source: '{"password":"fixture-password-value","model":"chat"}', displayPath: "placeholder.json" },
    { source: "DASHBOARD_SMOKE_PASSWORD=fixture-password-value; model=chat", displayPath: "placeholder.env.example" },
    { source: "DASHBOARD_SMOKE_PASSWORD=${OWNER_PROVIDED_PASSWORD}", displayPath: "placeholder.env.example" },
    { source: `RESEND_API_KEY=${resendTokenFixture("xxxxxxxxx")} node scripts/resend-local-smoke.mjs --to recipient@example.invalid --dry-run`, displayPath: "README.md" },
    { source: "RESEND_API_KEY=re_xxxx\"\"xxxxx node scripts/resend-local-smoke.mjs --dry-run", displayPath: "README.md" },
    { source: "AUTH_SESSION_SECRET=deepseek-e2e-session-secret npm run smoke", displayPath: "README.md" },
    { source: "Password: enter the code shown by your teacher.", displayPath: "guide.md" },
    { source: "The password: enter the code shown by your teacher.", displayPath: "guide.md" }
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath }));
  }
  assert.throws(
    () => scanBuffer(
      Buffer.from("AUTH_SESSION_SECRET=deepseek-e2e-session-secret! npm run smoke"),
      { displayPath: "README.md" }
    ),
    /token assignment/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`RESEND_API_KEY="${"A".repeat(10)} ${"B".repeat(10)}" node scripts/resend-local-smoke.mjs`),
      { displayPath: "README.md" }
    ),
    /token assignment/i
  );
  for (const source of [
    "RESEND_API_KEY=re_abcd\\\nefgh command",
    "RESEND_API_KEY=re_abcd\\\r\nefgh command",
    "RESEND_API_KEY=re_abcd\\efgh command",
    "RESEND_API_KEY=re_ab\\cd\\ef\\gh command",
    "RESEND_API_KEY=re_abcd\"\"efgh command",
    "RESEND_API_KEY=re_abcd''efgh command",
    "RESEND_API_KEY=re_ab\"cd\"efgh command",
    "RESEND_API_KEY=re_abcd$''efgh command",
    "RESEND_API_KEY=re_abcd$\"\"efgh command",
    "RESEND_API_KEY=re_abcd$(printf efgh) command",
    "RESEND_API_KEY=re_abcd`printf efgh` command",
    `PASSWORD=${"C".repeat(10)}\\\n${"D".repeat(10)} command`,
    `PASSWORD="${"E".repeat(10)}\n${"F".repeat(10)}" command`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "README.md" }),
      /token assignment/i
    );
  }
});

test("generic Markdown scanning stays fail closed for ambiguous backtick contexts", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "`password=12345`",
    "Request: `GET /login?username=student%40example.invalid&password=12345`.",
    "Masked request: `GET /login?username=...&password=...`.",
    "Empty example: `password=`.",
    "Redacted example: `password=***`.",
    `Request: \`GET /login?username=student&password=${"A".repeat(40)}\`.`,
    `Password: \`password=${"B".repeat(40)}\`.`,
    `Provider: \`OPENAI_API_KEY=${providerTokenFixture(`proj-${"C".repeat(40)}`)}\`.`,
    "Shell: ``PASSWORD=re_abcd`printf efgh` ``.",
    `\`password=\${PASSWORD}\``,
    `\`password=${"D".repeat(10)}\`${"E".repeat(10)}`,
    `\`\`\`password=${"F".repeat(10)}\`\`\`${"G".repeat(10)}`,
    `    \`password=${"H".repeat(10)}\`${"I".repeat(10)}`,
    `<div data-example="\`password=${"J".repeat(10)}\`${"K".repeat(10)}">`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "audit.md" }),
      /high-confidence token|token assignment/i
    );
  }
  const tick = "`";
  for (const source of [
    `${"\\"}${tick}PASSWORD=${"D".repeat(10)}${tick}${"E".repeat(10)}`,
    `${"\\".repeat(3)}${tick}PASSWORD=${"F".repeat(10)}${tick}${"G".repeat(10)}`,
    `${tick}PASSWORD=${"H".repeat(10)}${"\\"}${tick}${"I".repeat(10)}${tick}`,
    `${tick}PASSWORD=${"J".repeat(10)}${"\\".repeat(3)}${tick}${"K".repeat(10)}${tick}`,
    `${"\\"}${tick.repeat(2)}PASSWORD=${"L".repeat(10)}${tick.repeat(2)}${"M".repeat(10)}`,
    `${tick.repeat(2)}PASSWORD=${"N".repeat(10)}${"\\"}${tick.repeat(2)}${"O".repeat(10)}${tick.repeat(2)}`,
    `${"\\".repeat(2)}${tick}password=12345${tick}`,
    `${"\\".repeat(4)}${tick}password=12345${tick}`,
    `${tick}password=12345${"\\".repeat(2)}${tick}`,
    `${tick}password=12345${"\\".repeat(4)}${tick}`,
    `${"\\".repeat(2)}${tick.repeat(2)}password=***${tick.repeat(2)}`,
    `${tick.repeat(2)}password=${"\\".repeat(2)}${tick.repeat(2)}`,
    `${"\\".repeat(2)}${tick}password=${"P".repeat(40)}${tick}`,
    `${tick.repeat(2)}OPENAI_API_KEY=${providerTokenFixture(`proj-${"Q".repeat(40)}`)}${"\\".repeat(2)}${tick.repeat(2)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "audit.md" }),
      /high-confidence token|token assignment/i
    );
  }
});

test("API me route fixture secret placeholder is exact and case-sensitive", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const exact = "api-me-route-test-secret";
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`AUTH_SESSION_SECRET=${exact}`),
    { displayPath: "api-me-route.test.env" }
  ));
  for (const nearby of [
    `${exact}-suffix`,
    `prefix-${exact}`,
    "API-ME-ROUTE-TEST-SECRET",
    `${exact}!`,
    `${exact}?`,
    `${exact};`,
    `${exact}.`,
    `${exact}#suffix`,
    `${exact} `,
    ` ${exact}`,
    `${exact}\t`,
    `\t${exact}`,
    `"${exact}"`,
    `'${exact}'`
  ]) {
    assert.throws(
      () => scanBuffer(
        Buffer.from(`AUTH_SESSION_SECRET=${nearby}`),
        { displayPath: "api-me-route-nearby.env" }
      ),
      /token assignment/i
    );
  }
  const exactPatch = Buffer.from([
    "diff --git a/app/api/me/route.test.ts b/app/api/me/route.test.ts",
    "@@ -0,0 +1 @@",
    `+process.env.AUTH_SESSION_SECRET ??= "${exact}";`
  ].join("\n"));
  assert.doesNotThrow(() => scanBuffer(exactPatch, { displayPath: "api-me-route-exact.patch" }));
  for (const nearby of [`${exact}!`, `${exact} `, "API-ME-ROUTE-TEST-SECRET"]) {
    assert.throws(
      () => scanBuffer(Buffer.from([
        "diff --git a/app/api/me/route.test.ts b/app/api/me/route.test.ts",
        "@@ -0,0 +1 @@",
        `+process.env.AUTH_SESSION_SECRET ??= "${nearby}";`
      ].join("\n")), { displayPath: "api-me-route-nearby.patch" }),
      /token assignment/i
    );
  }
});

test("text secret assignments do not consume a following LF model assignment", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const safeModel = "deepseek-chat-safe-model-version-2026";
  for (const source of [
    `LLM_API_KEY=\nLLM_MODEL=${safeModel}`,
    `LLM_API_KEY=\t\nLLM_MODEL=${safeModel}`,
    `DEEPSEEK_API_KEY=\nDEEPSEEK_MODEL=${safeModel}`
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.env.example" }));
  }
});

test("text secret assignments do not consume a following CRLF model assignment", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const safeModel = "deepseek-chat-safe-model-version-2026";
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`LLM_API_KEY=\r\nLLM_MODEL=${safeModel}`),
    { displayPath: "provider.env.example" }
  ));
});

test("text secret assignments preserve same-line raw-token and placeholder boundaries", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `LLM_API_KEY=${"A".repeat(40)}`,
    `LLM_API_KEY=   ${"B".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.env" }),
      /token assignment/i
    );
  }
  for (const token of [
    providerTokenFixture("C".repeat(40)),
    githubTokenFixture("D".repeat(36)),
    awsAccessKeyFixture("E".repeat(16)),
    googleApiKeyFixture("F".repeat(32))
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(`safe-first\n${token}\nsafe-last`), { displayPath: "provider.txt" }),
      /high-confidence token/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("LLM_API_KEY=<your-key-here>\nLLM_MODEL=deepseek-chat-safe-model-version-2026"),
    { displayPath: "provider.env.example" }
  ));
});

test("JSON secret scanning uses decoded property structure instead of string-value prose", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `{"description":"Password: enter the ${"A".repeat(40)} code shown by your teacher."}`,
    `{"description":"dbPassword: ${"B".repeat(40)} is fixture documentation."}`,
    `{"nested":{"note":"clientSecret: ${"C".repeat(40)} is not an assignment here."}}`
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.json" }));
  }
  for (const { source, displayPath } of [
    { source: `{"pass\\u0077ord":"${"D".repeat(40)}"}`, displayPath: "provider.json" },
    { source: `{"outer":{"client\\u0053ecret":"${"E".repeat(40)}"}}`, displayPath: "provider.json" },
    { source: `{"password":["${"F".repeat(10)}","${"G".repeat(10)}"]}`, displayPath: "provider.json" },
    { source: `{"safe":true}\n{"api\\u004bey":"${"H".repeat(40)}"}`, displayPath: "provider.jsonl" },
    { source: `{"password":1234567890123456789012345678901234567890}`, displayPath: "provider.json" },
    { source: `{"pass\\u0077ord":"${"I".repeat(40)}","password":"fixture-api-key-value"}`, displayPath: "provider.json" },
    { source: `{"description":"${providerTokenFixture("\\u0041")}${"A".repeat(23)}"}`, displayPath: "provider.json" }
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath }),
      /high-confidence token|token assignment|JSON parse/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from('{"pass\\u0077ord":"fixture-api-key-value"}'),
    { displayPath: "provider.json" }
  ));
});

test("JSON structural scanning fails closed before parser work exceeds bounded depth or document counts", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const nested = `${"[".repeat(513)}0${"]".repeat(513)}`;
  assert.throws(
    () => scanBuffer(Buffer.from(`{"safe":${nested}}`), { displayPath: "provider.json" }),
    /JSON source depth limit/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(Array.from({ length: 2_049 }, () => "{}").join("\n")), { displayPath: "provider.jsonl" }),
    /JSON document limit/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d]), { displayPath: "provider.json" }),
    /JSON parse failed closed/i
  );
});

test("JSON independent budgets accept safe documents between eight and sixteen MiB", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const buffer = Buffer.concat([
    Buffer.from('{"description":"safe"}'),
    Buffer.alloc(9 * 1024 * 1024, 0x20)
  ]);
  assert.ok(buffer.length > 8 * 1024 * 1024);
  assert.ok(buffer.length < 16 * 1024 * 1024);
  assert.doesNotThrow(() => scanBuffer(buffer, { displayPath: "large-safe.json" }));
});

test("JSON independent budgets still reject provider tokens and escaped secret keys at a large-document tail", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const prefix = Buffer.concat([
    Buffer.from('{"description":"safe"'),
    Buffer.alloc(9 * 1024 * 1024, 0x20)
  ]);
  const cases = [
    {
      suffix: Buffer.from(`,"note":"${providerTokenFixture("T".repeat(24))}"}`),
      expected: /large-tail\.json": high-confidence token$/i,
      redacted: providerTokenFixture("T".repeat(24))
    },
    {
      suffix: Buffer.from(`,"note":"${providerTokenFixture("\\u0054")}${"T".repeat(23)}"}`),
      expected: /large-tail\.json": high-confidence token$/i,
      redacted: providerTokenFixture("T".repeat(24))
    },
    {
      suffix: Buffer.from(`,"pass\\u0077ord":"${"S".repeat(40)}"}`),
      expected: /large-tail\.json": high-confidence token assignment$/i,
      redacted: "S".repeat(40)
    }
  ];
  for (const { suffix, expected, redacted } of cases) {
    const buffer = Buffer.concat([prefix, suffix]);
    assert.ok(buffer.length > 8 * 1024 * 1024);
    assert.ok(buffer.length < 16 * 1024 * 1024);
    let error;
    try {
      scanBuffer(buffer, { displayPath: "large-tail.json" });
    } catch (caught) {
      error = caught;
    }
    assert.match(error?.message ?? "", expected);
    assert.equal(error.message.includes(redacted), false);
  }
});

test("JSON independent budgets accept 1200 JSONL documents and reject 2049", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const documents = (count) => Buffer.from(Array.from({ length: count }, (_, index) => `{"safe":${index}}`).join("\n"));
  assert.doesNotThrow(() => scanBuffer(documents(1_200), { displayPath: "provider.jsonl" }));
  assert.doesNotThrow(() => scanBuffer(documents(2_048), { displayPath: "provider.jsonl" }));
  assert.throws(
    () => scanBuffer(documents(2_049), { displayPath: "provider.jsonl" }),
    /JSON document limit/i
  );
});

test("JSON independent budgets reject text above sixteen MiB and preserve strict duplicate keys", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.alloc((16 * 1024 * 1024) + 1, 0x20), { displayPath: "oversize.json" }),
    /JSON text size limit/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from('{"safe":1,"safe":2}'), { displayPath: "duplicate.json" }),
    /JSON parse failed closed/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from('{"safe":1,"s\\u0061fe":2}'), { displayPath: "escaped-duplicate.json" }),
    /JSON parse failed closed/i
  );
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from('{"pass\\u0077ord":"fixture-api-key-value"}'),
    { displayPath: "placeholder.json" }
  ));
});

test("JSON independent source budgets fail closed at depth line and marker ceilings", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const acceptedNestedArray = `${"[".repeat(512)}0${"]".repeat(512)}`;
  const nested = `${"[".repeat(513)}0${"]".repeat(513)}`;
  assert.doesNotThrow(() => scanBuffer(Buffer.from(acceptedNestedArray), { displayPath: "accepted-depth.json" }));
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`{"safe":true}${"\n".repeat(120_000)}`),
    { displayPath: "accepted-lines.json" }
  ));
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`[${"0,".repeat(119_999)}0]`),
    { displayPath: "accepted-markers.json" }
  ));
  assert.throws(
    () => scanBuffer(Buffer.from(nested), { displayPath: "depth.json" }),
    /JSON source depth limit/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(`{${"\n".repeat(500_000)}}`), { displayPath: "lines.json" }),
    /JSON source line limit/i
  );
  const markerElements = 750_000;
  assert.throws(
    () => scanBuffer(Buffer.from(`[${"0,".repeat(markerElements - 1)}0]`), { displayPath: "markers.json" }),
    /JSON source structure limit/i
  );
});

test("JSON independent AST depth remains conservatively bounded below the source depth ceiling", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const nestedObject = (depth) => `${'{"safe":'.repeat(depth)}0${"}".repeat(depth)}`;
  assert.doesNotThrow(() => scanBuffer(Buffer.from(nestedObject(256)), { displayPath: "accepted-ast-depth.json" }));
  assert.throws(
    () => scanBuffer(Buffer.from(nestedObject(257)), { displayPath: "rejected-ast-depth.json" }),
    /JSON structure limit/i
  );
});

test("JSON independent native node budget fails closed before YAML AST parsing", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const nativeValues = 400_000;
  assert.ok(nativeValues + 1 > 400_000);
  assert.ok(nativeValues + 1 < 750_000);
  assert.throws(
    () => scanBuffer(Buffer.from(`[${"0,".repeat(nativeValues - 1)}0]`), { displayPath: "native-nodes.json" }),
    /JSON native structure limit/i
  );
});

test("JSON independent AST node budget fails closed without relying on source marker limits", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const fieldCount = 163;
  const fields = Array.from({ length: fieldCount }, (_, index) => `"k${index}":0`);
  const document = `{${fields.join(",")}}`;
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(Array.from({ length: 256 }, () => document).join("\n")),
    { displayPath: "accepted-nodes.jsonl" }
  ));
  const documentCount = 2_048;
  assert.ok(documentCount * (1 + fieldCount) < 400_000);
  assert.ok(documentCount * ((2 * fieldCount) + 1) < 750_000);
  assert.ok(documentCount * (1 + (3 * fieldCount)) > 1_000_000);
  assert.throws(
    () => scanBuffer(Buffer.from(Array.from({ length: documentCount }, () => document).join("\n")), { displayPath: "nodes.jsonl" }),
    /JSON structure limit/i
  );
});

test("JSON independent document budget scans the final JSONL document and redacts its token", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = providerTokenFixture("L".repeat(24));
  const encodedToken = providerTokenFixture(`\\u004c${"L".repeat(23)}`);
  const safeDocuments = Array.from({ length: 2_047 }, () => '{"safe":true}');
  const buffer = Buffer.from([...safeDocuments, `{"note":"${encodedToken}"}`].join("\n"));
  let error;
  try {
    scanBuffer(buffer, { displayPath: "tail-provider.jsonl" });
  } catch (caught) {
    error = caught;
  }
  assert.match(error?.message ?? "", /tail-provider\.jsonl": high-confidence token$/i);
  assert.equal(error.message.includes(token), false);
});

test("text secret assignments reject indented YAML plain scalars after LF and CRLF", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `password:\n  ${"G".repeat(40)}`,
    `client_secret:\r\n\t${"H".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
});

test("text secret assignments reject indented YAML quoted scalars", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `credentials:\n  "${"I".repeat(40)}"`,
    `auth_token:\n  '${"J".repeat(40)}'`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
});

test("YAML multiline secret checks preserve structure and placeholder boundaries", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "password:\n  fixture-api-key-value",
    "password: |\n  fixture-api-key-value",
    "credentials:\n  model: chat-v1",
    "LLM_API_KEY=\nLLM_MODEL=deepseek-chat-safe-model-version-2026",
    "LLM_API_KEY=\r\nLLM_MODEL=deepseek-chat-safe-model-version-2026"
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }));
  }
  for (const source of [
    `password: ${"L".repeat(40)}`,
    `LLM_API_KEY=${"M".repeat(40)}`,
    "credentials:\n  model: deepseek-chat-safe-model-version-2026"
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  for (const malformed of [`password:\n${"K".repeat(40)}`]) {
    assert.throws(
      () => scanBuffer(Buffer.from(malformed), { displayPath: "provider.yaml" }),
      /YAML parse failed closed/i
    );
  }
});

test("YAML secret structures reject Base64 and blank or comment separated scalars", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `password:\n  ${"N".repeat(40)}==`,
    `password:\n\n  ${"O".repeat(40)}`,
    `password:\n  # rotated value\n  ${"P".repeat(40)}`,
    `"password":\n  ${"Q".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
});

test("YAML secret structures reject literal folded and flattened short-line blocks", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `password: |\n  ${"R".repeat(40)}`,
    `password: >\n  ${"S".repeat(10)}\n  ${"T".repeat(10)}`,
    "password: |\n  ABCDEFGHIJ\n  KLMNOPQRST",
    "password: |\n  placeholder\n  ABCDEFGHIJ\n  KLMNOPQRST",
    "password: |\n  placeholder\n  ABCDEFGHIJ",
    "password: [placeholder, ABCDEFGHIJ]"
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("password: |\n  fixture-\n  api-key-value"),
    { displayPath: "provider.yaml" }
  ));
});

test("YAML secret collections aggregate split scalar fragments without placeholder bleed", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "password: [ABCDE, FGHIJ, KLMNO, PQRST]",
    "password:\n  - ABCDE\n  - FGHIJ\n  - KLMNO\n  - PQRST",
    "credentials: {a: ABCDE, b: FGHIJ, c: KLMNO, d: PQRST}",
    "password:\n  ABCDEFGHIJKLMNOPQRST: safe",
    "password: {ABCDEFGHIJKLMNOPQRST: safe}",
    "password:\n  ? ABCDEFGHIJKLMNOPQRST\n  : safe",
    "password:\n  - ABCDEFGHIJKLMNOPQRST: safe"
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("password: [fixture-, api-key-value]"),
    { displayPath: "provider.yaml" }
  ));
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("password: {kind: fixture-api-key-value}"),
    { displayPath: "provider.yaml" }
  ));
});

test("YAML secret structures fail closed on aliases tags and flow values", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "password: *shared_secret",
    `password: !vault ${"U".repeat(40)}`,
    `password: {value: ${"V".repeat(40)}}`,
    `password:\n  *shared_secret`,
    `password:\n  [${"W".repeat(40)}]`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
});

test("YAML secret block headers support both indent and chomp indicator orders", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `password: |2-\n  ${"N".repeat(40)}`,
    `password: >2+\r\n  ${"Y".repeat(40)}`,
    `password: |-2\n  ${"Z".repeat(40)}`,
    `password: >+2\r\n  ${"A".repeat(40)}`,
    `password: |22\n  ${"B".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  for (const source of [
    "password: |2-\n  fixture-api-key-value",
    "password: >+2\r\n  fixture-api-key-value"
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }));
  }
});

test("YAML secret keys decode hex Unicode and uncertain double-quoted escapes", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `"pass\\u0077ord":\n  ${"C".repeat(40)}`,
    `"\\x73ecret":\r\n  ${"D".repeat(40)}`,
    `"pass\\qword":\n  ${"E".repeat(40)}`,
    `"pass\\\n  word":\n  ${"F".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  for (const source of [
    '"pass\\u0077ord":\n  fixture-api-key-value',
    '? "pass\\\n  word"\n: fixture-api-key-value'
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }));
  }
});

test("YAML explicit secret keys scan scalar and uncertain complex values", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `? password\n: ${"F".repeat(40)}`,
    `? "pass\\u0077ord"\r\n: "${"G".repeat(40)}"`,
    `? *shared_key\n: ${"H".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("? password\n: fixture-api-key-value"),
    { displayPath: "provider.yaml" }
  ));
});

test("YAML block scalar hash lines are content while ordinary mapping hashes are comments", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    `password: |\n  #${"I".repeat(40)}`,
    `password: >2+\r\n  #${"J".repeat(40)}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  for (const source of [
    "password: |\n  #fixture-api-key-value",
    `password:\n  #${"K".repeat(40)}`
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }));
  }
});

test("YAML parser covers sequence flow explicit and multi-document secret mappings", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = "L".repeat(40);
  for (const source of [
    `providers:\n  - password: ${token}`,
    `{ password: ${token} }`,
    `? password\n\n: ${token}`,
    `? password\n# rotated below\n: ${token}`,
    `---\nmodel: safe\n---\npassword: ${token}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment/i
    );
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "---",
    "providers:",
    "  - password: fixture-api-key-value",
    "---",
    "password: your-secret-placeholder"
  ].join("\n")), { displayPath: "provider.yml" }));
});

test("YAML parser fails closed on aliases tags merge keys and uncertain complex keys", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = "M".repeat(40);
  for (const source of [
    `shared: &shared ${token}\npassword: *shared`,
    "password: !vault fixture-api-key-value",
    `secret_name: &secret_name password\n? *secret_name\n: ${token}`,
    `base: &base\n  password: ${token}\nconfig:\n  <<: *base`,
    `? [password]\n: ${token}`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /token assignment|YAML alias|YAML tag|YAML parse/i
    );
  }
});

test("YAML parser rejects malformed YAML but does not parse arbitrary non-YAML text", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from("mapping: [unterminated"), { displayPath: "provider.yaml" }),
    /YAML parse failed closed/i
  );
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from("Narrative: [this deliberately is not YAML"),
    { displayPath: "notes.md" }
  ));
});

test("YAML-like template suffixes parse strictly and invalid UTF-8 fails closed", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(
      Buffer.from(`password:\n  ${"P".repeat(40)}`),
      { displayPath: "provider.yaml.example.local" }
    ),
    /token assignment/i
  );
  const invalidUtf8 = Buffer.concat([
    Buffer.from("passw"),
    Buffer.from([0xff]),
    Buffer.from(`rd: ${"Q".repeat(40)}`)
  ]);
  assert.throws(
    () => scanBuffer(invalidUtf8, { displayPath: "provider.yaml" }),
    /YAML parse failed closed/i
  );
});

test("YAML source bounds reset block-scalar quote state before later flow structure", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const nested = `${"[".repeat(513)}0${"]".repeat(513)}`;
  assert.throws(
    () => scanBuffer(
      Buffer.from(`description: |\n  "\nvalue: ${nested}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`description: don't carry a plain apostrophe\nvalue: ${nested}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`key:'foo: ${nested}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`description: foo':'bar\nvalue: ${nested}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`[foo':'bar]\n---\nvalue: ${nested}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`{key:${nested}}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source depth limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`description: |\n  ${"[".repeat(20_001)}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML source structure limit/i
  );
  for (const source of [
    `description: |\n  ${nested}`,
    `description: "line one\n  ${nested}"`,
    `description: 'line one\n  ${nested}'`,
    `description: abc${nested}`,
    `description: abc${"[".repeat(513)}`,
    `description: http:${nested}`,
    `["description":"${nested}"]`,
    `{"description" :"${nested}"}`,
    `{"description"\n:"${nested}"}`,
    `{[description]:"${nested}"}`,
    `{{description: note}:"${nested}"}`,
    `{[description] # key comment\n:"${nested}"}`
  ]) {
    assert.doesNotThrow(() => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }));
  }
  assert.throws(
    () => scanBuffer(Buffer.alloc((8 * 1024 * 1024) + 1, 0x61), { displayPath: "provider.yaml" }),
    /YAML text size limit/i
  );
});

test("YAML parser rejects duplicate keys tags anchors and document floods with redacted errors", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const source of [
    "password: fixture-api-key-value\npassword: your-secret-placeholder",
    "password: !!str fixture-api-key-value",
    "password: &password_value fixture-api-key-value",
    "!!str password: fixture-api-key-value",
    "&password_key password: fixture-api-key-value",
    "credentials:\n  !!str model: chat",
    "credentials:\n  &model_key model: chat"
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "provider.yaml" }),
      /YAML parse|YAML tag|YAML anchor|YAML document limit/i
    );
  }
  assert.throws(
    () => scanBuffer(
      Buffer.from(Array.from({ length: 1_025 }, (_, index) => `---\nvalue: ${index}`).join("\n")),
      { displayPath: "provider.yaml" }
    ),
    /YAML document limit/i
  );
  assert.throws(
    () => scanBuffer(
      Buffer.from(`value: implicit\n${Array.from({ length: 1_024 }, (_, index) => `---\nvalue: ${index}`).join("\n")}`),
      { displayPath: "provider.yaml" }
    ),
    /YAML document limit/i
  );
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(Array.from({ length: 1_024 }, (_, index) => `---\nvalue: ${index}`).join("\n")),
    { displayPath: "provider.yaml" }
  ));

  const secret = "N".repeat(40);
  let error;
  try {
    scanBuffer(Buffer.from(`password: [${secret}`), { displayPath: "provider.yaml" });
  } catch (caught) {
    error = caught;
  }
  assert.match(error?.message ?? "", /YAML parse failed closed/i);
  assert.doesNotMatch(error.message, new RegExp(secret));
});

test("patch evidence scans raw secret signatures without parsing generic assignments", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const benignPatch = Buffer.from([
    "diff --git a/config.ts b/config.ts",
    "+  password: process.env.DASHBOARD_SMOKE_PASSWORD,",
    "+  credentials: credentials.member,"
  ].join("\n"));
  assert.doesNotThrow(() => scanBuffer(benignPatch, { displayPath: "tracked.patch", aggregatePatch: true }));
  assert.doesNotThrow(() => scanBuffer(benignPatch, { displayPath: "index.patch", aggregatePatch: true }));
  assert.doesNotThrow(() => scanBuffer(benignPatch, { displayPath: "worktree.patch", aggregatePatch: true }));
  assert.doesNotThrow(() => scanBuffer(benignPatch, { displayPath: "branch.patch", aggregatePatch: true }));
  const token = providerTokenFixture("P".repeat(40));
  assert.throws(() => scanBuffer(Buffer.from(`+  password: "${token}"`), { displayPath: "tracked.patch", aggregatePatch: true }), (error) => {
    assert.match(error.message, /high-confidence token/i);
    assert.doesNotMatch(error.message, new RegExp(token));
    return true;
  });
  assert.throws(
    () => scanBuffer(Buffer.from(`+ ${pemHeaderFixture()}`), { displayPath: "branch.patch", aggregatePatch: true }),
    /private-key header/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(`PASSWORD=${"W".repeat(40)}`), { displayPath: "evidence.patch" }),
    /token assignment/i
  );
});

test("real patch scanning permits parseable code expressions without weakening assignment checks", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const benignPatch = Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "@@ -0,0 +1,19 @@",
    "+const token = await issueSessionToken(user);",
    "+const password = hashPassword(candidate);",
    "+const config = { apiKey: process.env.PROVIDER_API_KEY };",
    "+const copy = { token: session.token };",
    "+const apiKey = process.env.PRIMARY_API_KEY || process.env.FALLBACK_API_KEY;",
    "+const currentPassword = typeof body.currentPassword === \"string\" ? body.currentPassword : undefined;",
    "+const resetUrl = new URL(`/reset?token=${encodeURIComponent(token)}`, request.url);",
    "+const hooks = { hashPassword: previousHashPassword };",
    "+function registerCredential(credential: ReviewedCredentialInput = {}) {",
    "+  \"LLM_API_KEY= OPENAI_API_KEY= LLM_MODEL= OPENAI_MODEL= npm run test\",",
    "+  `LLM_API_KEY= HK_MATH_DB_PATH=\"/tmp/very-long-non-secret-path/database.sqlite\" AUTH_SESSION_SECRET=fixture-password-value node server ${port}`",
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secret\" };",
    "+password ||= process.env.FALLBACK_PASSWORD;",
    "+config[\"password\"] ||= process.env.FALLBACK_PASSWORD;",
    "+config[`password`] ||= process.env.FALLBACK_PASSWORD;",
    "+config[\"pass\" + \"word\"] ||= process.env.FALLBACK_PASSWORD;",
    "+const dynamicComputed = { [\"pass\" + \"word\"]: process.env.AUTH_PASSWORD };",
    "+config.pass\\u0077ord = process.env.AUTH_PASSWORD;",
    "+if (typeof body.currentPassword === \"longNonSecretStatusLabelForComparison\") return;"
  ].join("\n"));
  assert.doesNotThrow(() => scanBuffer(benignPatch, { displayPath: "auth-review.patch" }));
  assert.throws(
    () => scanBuffer(Buffer.from("+const password = hashPassword(candidate);"), { displayPath: "plain-review.patch" }),
    /token assignment/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/config.yaml b/config.yaml",
      "--- a/config.yaml",
      "+++ b/config.yaml",
      "@@ -0,0 +1 @@",
      `+password: ${"Y".repeat(40)}`
    ].join("\n")), { displayPath: "config-review.patch" }),
    /token assignment/i
  );
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "diff --git a/runbook.md b/runbook.md",
    "@@ -0,0 +1 @@",
    `+RESEND_API_KEY=${resendTokenFixture("xxxxxxxxxxxx")} npm run smoke`
  ].join("\n")), { displayPath: "runbook-review.patch" }));
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/runbook.md b/runbook.md",
      "@@ -0,0 +1 @@",
      `+PASSWORD=${"O".repeat(40)} npm run smoke`
    ].join("\n")), { displayPath: "runbook-review.patch" }),
    /token assignment/i
  );
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "diff --git a/runbook.md b/auth.ts",
    "@@ -1 +1 @@",
    `-RESEND_API_KEY=${resendTokenFixture("xxxxxxxxxxxx")} npm run smoke`,
    "+const password = hashPassword(candidate);"
  ].join("\n")), { displayPath: "rename-review.patch" }));
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/auth.ts b/auth.ts",
      "@@ -1,3 +1,13 @@",
      "+const password = hashPassword(candidate);",
      "diff --git a/next.ts b/next.ts"
    ].join("\n")), { displayPath: "malformed-review.patch" }),
    /malformed Git text hunk/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/auth.ts b/auth.ts",
      "@@ -0,0 +1 @@",
      "+const password = hashPassword(candidate);",
      "@@ -1,2 +1,2 @@",
      "+const harmless = 1;",
      "diff --git a/next.ts b/next.ts"
    ].join("\n")), { displayPath: "later-malformed-review.patch" }),
    /malformed Git text hunk/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/auth.ts b/auth.ts",
      "@@ -0,0 +1 @@",
      "+const password = hashPassword(candidate);",
      "\\ No newline at end of file",
      "\\ No newline at end of file"
    ].join("\n")), { displayPath: "repeated-marker-review.patch" }),
    /malformed Git text hunk/i
  );
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "--- a/auth.ts",
    "+++ b/auth.ts",
    "@@ -1 +1 @@",
    "-const password = process.env.AUTH_PASSWORD;",
    "\\ No newline at end of file",
    "+const password = hashPassword(candidate);",
    "\\ No newline at end of file"
  ].join("\n")), { displayPath: "terminal-marker-review.patch" }));
  for (const lines of [
    [
      "diff --git a/runbook.md b/auth.ts",
      "--- a/runbook.md",
      "+++ b/auth.ts",
      "@@ -1 +1 @@",
      `-RESEND_API_KEY=${resendTokenFixture("xxxxxxxxx")} npm run smoke`,
      "+const password = hashPassword(candidate);"
    ],
    [
      "diff --git a/auth.ts b/auth.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/auth.ts",
      "@@ -0,0 +1 @@",
      "+const password = hashPassword(candidate);"
    ],
    [
      "diff --git a/auth.ts b/auth.ts",
      "deleted file mode 100644",
      "--- a/auth.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-const password = hashPassword(candidate);"
    ],
    [
      "diff --git \"a/auth\\040review.ts\" \"b/auth\\040review.ts\"",
      "--- \"a/auth\\040review.ts\"",
      "+++ \"b/auth\\040review.ts\"",
      "@@ -0,0 +1 @@",
      "+const password = hashPassword(candidate);"
    ]
  ]) {
    assert.doesNotThrow(() => scanBuffer(
      Buffer.from(lines.join("\n")),
      { displayPath: "matching-file-headers-review.patch" }
    ));
  }
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/auth.ts b/auth.ts",
      "--- a/runbook.md",
      "+++ b/runbook.md",
      "@@ -0,0 +1 @@",
      "+const password = hashPassword(candidate);"
    ].join("\n")), { displayPath: "spoofed-file-headers-review.patch" }),
    /malformed Git text hunk/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/auth.ts b/auth.ts",
      "@@ -1,3 +1,3 @@",
      " const before = true;",
      "\\ No newline at end of file",
      "+const password = hashPassword(candidate);",
      "-const password = process.env.AUTH_PASSWORD;",
      " const after = true;"
    ].join("\n")), { displayPath: "mid-hunk-marker-review.patch" }),
    /malformed Git text hunk/i
  );
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "@@ -0,0 +1,2 @@",
    `+config["pass" + "word"] = "${"P".repeat(40)}";`,
    "diff --git a/next.ts b/next.ts"
  ].join("\n")), { displayPath: "computed-malformed-review.patch" }), /malformed Git text hunk/i);

  const unsafePatches = [
    `+PASSWORD=${"W".repeat(40)}`,
    `+const password = "${"L".repeat(40)}";`,
    `+const password = \`${"T".repeat(40)}\`;`,
    `+const password = "${"A".repeat(10)}" + "${"B".repeat(10)}" + "${"C".repeat(10)}" + "${"D".repeat(10)}";`,
    `+const password = derivePassword("${"G".repeat(40)}");`,
    `+const password = process.env.FALLBACK_PASSWORD || "${"H".repeat(40)}";`,
    `+const password = body.password ? "${"J".repeat(40)}" : body.password;`,
    `+const command = \`PASSWORD=${"Q".repeat(40)}-\${token}\`;`,
    `+function registerPassword(password: string = "${"U".repeat(40)}") {`,
    `+  "PASSWORD=${"I".repeat(40)} npm run test",`,
    `+  "PASSWORD='${"A".repeat(15)} ${"B".repeat(15)}' npm run test",`,
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secret-near-miss\" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secret!\" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secret:abc\" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secret  \" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"deepseek-e2e-session-secre\" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"DEEPSEEK-E2E-SESSION-SECRET\" };",
    "+const e2e = { AUTH_SESSION_SECRET: \"arbitrary-static-session-secret\" };",
    `+const password = hashPassword(candidate); // password=${"N".repeat(40)}`,
    `+const password = hashPassword(candidate); const note = "password=${"S".repeat(40)}";`,
    `+let password = hashPassword(candidate); password = "${"V".repeat(40)}";`,
    `+password += "${"C".repeat(40)}";`,
    `+password ||= "${"D".repeat(40)}";`,
    `+password &&= "${"F".repeat(40)}";`,
    `+password ??= "${"G".repeat(40)}";`,
    `+function typedPassword(password: "${"H".repeat(40)}") {`,
    `+function typedPassword(password: \`${"J".repeat(40)}\`) {`,
    `+config["password"] = "${"K".repeat(40)}";`,
    `+config['apiKey'] ||= "${"L".repeat(40)}";`,
    `+config[\`password\`] ??= "${"M".repeat(40)}";`,
    `+config["pass" + "word"] = "${"O".repeat(40)}";`,
    `+config["pass" + /*${"x".repeat(600)}*/ "word"] = "${"R".repeat(40)}";`,
    `+const config = { ["pass" + "word"]: "${"S".repeat(40)}" };`,
    `+const config = { ["pass" + "word"]: "${"U".repeat(10)}" + "${"V".repeat(10)}" + "${"W".repeat(10)}" + "${"X".repeat(10)}" };`,
    `+config.pass\\u0077ord = "${"T".repeat(40)}";`,
    `+config.pass\\u0077ord = "${"A".repeat(10)}" + "${"B".repeat(10)}" + "${"C".repeat(10)}" + "${"D".repeat(10)}";`,
    `+PASSWORD=${"K".repeat(24)}-${"M".repeat(24)}`,
    `+PASSWORD=$(read-secret-${"E".repeat(40)}`
  ];
  for (const source of unsafePatches) {
    assert.throws(
      () => scanBuffer(Buffer.from([
        "diff --git a/auth.ts b/auth.ts",
        "@@ -0,0 +1 @@",
        source
      ].join("\n")), { displayPath: "auth-review.patch" }),
      /token assignment/i
    );
  }
  assert.throws(
    () => scanBuffer(Buffer.from(`+const token = "${providerTokenFixture("R".repeat(40))}";`), { displayPath: "auth-review.patch" }),
    /high-confidence token/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from(`+${pemHeaderFixture()}`), { displayPath: "auth-review.patch" }),
    /private-key header/i
  );
});

test("real patch raw scanning skips only structurally valid Git binary payload bytes", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const collisions = Array.from({ length: 8 }, (_, index) => `re_${String.fromCharCode(65 + index).repeat(8)}`);
  const payloadLines = collisions.map((collision) => {
    const line = `z!${collision}!${"A".repeat(63 - collision.length)}`;
    assert.equal(Buffer.byteLength(line), 66);
    assert.throws(() => scanBuffer(Buffer.from(collision), { displayPath: "raw.txt" }), /high-confidence token/i);
    return line;
  });
  const binaryPatchLines = [
    "diff --git a/public/collision.png b/public/collision.png",
    "new file mode 100644",
    "index 0000000..1111111",
    "GIT binary patch",
    "literal 416",
    ...payloadLines,
    "",
    ""
  ];
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(binaryPatchLines.join("\n")),
    { displayPath: "binary-review.patch" }
  ));

  const providerToken = providerTokenFixture("P".repeat(20));
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/config.txt b/config.txt",
    "@@ -0,0 +1 @@",
    `+${providerToken}`
  ].join("\n")), { displayPath: "binary-review.patch" }), /high-confidence token/i);
  assert.throws(() => scanBuffer(
    Buffer.from(`diff --git a/config.txt b/config.txt\n+${pemHeaderFixture()}`),
    { displayPath: "binary-review.patch" }
  ), /private-key header/i);

  const binaryHeader = [
    "diff --git a/public/collision.png b/public/collision.png",
    "GIT binary patch"
  ];
  for (const malformed of [
    ["GIT binary patch", "literal 416", ...payloadLines, ""],
    [...binaryHeader, "literal x", ...payloadLines, "", ""],
    [...binaryHeader, "literal 416", `z!${providerToken}!`, "", ""],
    [...binaryHeader, "literal 416", ...payloadLines],
    [...binaryHeader, "literal 416", ...payloadLines, "diff --git a/next.png b/next.png"]
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(malformed.join("\n")), { displayPath: "binary-review.patch" }),
      /malformed Git binary patch|high-confidence token/i
    );
  }
});

test("real patch scanner budgets binary ranges code bytes and assignment occurrences", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const manyBinaryRanges = [
    "diff --git a/public/ranges.png b/public/ranges.png",
    "GIT binary patch",
    ...Array.from({ length: 1_025 }, () => ["literal 1", "A00000", ""]).flat(),
    ""
  ];
  assert.throws(
    () => scanBuffer(Buffer.from(manyBinaryRanges.join("\n")), { displayPath: "range-budget.patch" }),
    /malformed Git binary patch|budget|limit/i
  );

  const dynamicAssignment = "password ||= process.env.FALLBACK_PASSWORD";
  const overPerLine = `+${Array.from({ length: 65 }, () => dynamicAssignment).join("; ")};`;
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "@@ -0,0 +1 @@",
    overPerLine
  ].join("\n")), { displayPath: "assignment-line-budget.patch" }), /patch semantic budget/i);

  const totalLines = Array.from(
    { length: 33 },
    () => `+${Array.from({ length: 64 }, () => dynamicAssignment).join("; ")};`
  );
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    `@@ -0,0 +1,${totalLines.length} @@`,
    ...totalLines
  ].join("\n")), { displayPath: "assignment-total-budget.patch" }), /patch semantic budget/i);

  const oversizedCodeLine = `+const password = hashPassword(candidate); // ${"x".repeat(256 * 1024)}`;
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "@@ -0,0 +1 @@",
    oversizedCodeLine
  ].join("\n")), { displayPath: "assignment-byte-budget.patch" }), /patch semantic budget/i);

  const oversizedComputedLine = `+config["pass" + "word"] = "${"R".repeat(40)}"; // ${"x".repeat(256 * 1024)}`;
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    "@@ -0,0 +1 @@",
    oversizedComputedLine
  ].join("\n")), { displayPath: "computed-byte-budget.patch" }), /patch semantic budget/i);

  const totalSourceLines = Array.from(
    { length: 9 },
    () => `+const password = hashPassword(candidate); // ${"x".repeat(250 * 1024)}`
  );
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    `@@ -0,0 +1,${totalSourceLines.length} @@`,
    ...totalSourceLines
  ].join("\n")), { displayPath: "assignment-source-budget.patch" }), /patch semantic budget/i);

  const candidateBudgetLines = Array.from(
    { length: 10_001 },
    () => "+const password = hashPassword(candidate);"
  );
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/auth.ts b/auth.ts",
    `@@ -0,0 +1,${candidateBudgetLines.length} @@`,
    ...candidateBudgetLines
  ].join("\n")), { displayPath: "candidate-line-budget.patch" }), /patch semantic budget/i);
});

test("real patch text detection stays bounded without an iterable-sized character array", () => {
  const source = [
    `import { scanBuffer } from ${JSON.stringify(libraryUrl)};`,
    "const patch = Buffer.alloc(64 * 1024 * 1024, 0x61);",
    "for (let offset = 1024 * 1024 - 1; offset < patch.length; offset += 1024 * 1024) patch[offset] = 0x0a;",
    "const originalToString = Buffer.prototype.toString;",
    "let utf8DecodeCount = 0;",
    "Buffer.prototype.toString = function (...args) {",
    "  if (this.buffer === patch.buffer && (args[0] === undefined || args[0] === 'utf8')) utf8DecodeCount += 1;",
    "  return originalToString.apply(this, args);",
    "};",
    "try {",
    "  scanBuffer(patch, { displayPath: 'large-review.patch' });",
    "} finally {",
    "  Buffer.prototype.toString = originalToString;",
    "}",
    "if (utf8DecodeCount !== 1) throw new Error(`expected one UTF-8 decode, observed ${utf8DecodeCount}`);"
  ].join("\n");
  const result = spawnSync(process.execPath, [
    "--max-old-space-size=96",
    "--input-type=module",
    "-e",
    source
  ], {
    stdio: "ignore",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(result.status, 0, "generic patch text scanning must fit inside the bounded heap");
});

test("aggregate patch scanning stays bounded above Node MAX_STRING_LENGTH", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const aggregate = Buffer.alloc(bufferConstants.MAX_STRING_LENGTH + 1_024, 0x61);
  for (let offset = 1024 * 1024 - 1; offset < aggregate.length; offset += 1024 * 1024) {
    aggregate[offset] = 0x0a;
  }
  assert.doesNotThrow(() => scanBuffer(aggregate, { displayPath: "branch.patch", aggregatePatch: true }));
});

test("aggregate patch scanning detects raw signatures independently on every line", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const signatures = [
    providerTokenFixture("R".repeat(40)),
    pemHeaderFixture()
  ];
  for (const signature of signatures) {
    for (const position of [0, 1, 2]) {
      const lines = ["safe-first", "safe-middle", "safe-last"];
      lines[position] = signature;
      assert.throws(
        () => scanBuffer(Buffer.from(lines.join("\n")), { displayPath: "branch.patch", aggregatePatch: true }),
        /high-confidence token|private-key header/i
      );
    }
  }
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`${providerTokenFixture("A".repeat(10))}\n${"A".repeat(20)}`),
    { displayPath: "branch.patch", aggregatePatch: true }
  ));
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(providerTokenFixture(`placeholder-${"x".repeat(24)}`)),
    { displayPath: "branch.patch", aggregatePatch: true }
  ));
});

test("aggregate patch scanning enforces UTF-8 NUL and eight MiB line limits", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  const observedMaximumLine = Buffer.alloc(Math.ceil(6.4 * 1024 * 1024), 0x61);
  assert.doesNotThrow(() => scanBuffer(observedMaximumLine, options));
  assert.throws(() => scanBuffer(Buffer.alloc(8 * 1024 * 1024 + 1, 0x61), options), /line.*limit/i);
  assert.throws(() => scanBuffer(Buffer.from([0x61, 0x00, 0x62, 0x0a]), options), /binary|NUL|text/i);
  assert.throws(() => scanBuffer(Buffer.from([0xc3, 0x28, 0x0a]), options), /binary|UTF-8|text/i);
  const binaryPayloadPrefix = Buffer.from([
    "diff --git a/public/forum-assets/island.png b/public/forum-assets/island.png",
    "GIT binary patch",
    "literal 1",
    ""
  ].join("\n"));
  assert.throws(
    () => scanBuffer(Buffer.concat([binaryPayloadPrefix, Buffer.alloc(8 * 1024 * 1024 + 1, 0x61)]), options),
    /line.*limit/i
  );
  assert.throws(
    () => scanBuffer(Buffer.concat([binaryPayloadPrefix, Buffer.from([0x61, 0x00, 0x62])]), options),
    /binary|NUL|text/i
  );
  assert.throws(
    () => scanBuffer(Buffer.concat([binaryPayloadPrefix, Buffer.from([0xc3, 0x28])]), options),
    /binary|UTF-8|text/i
  );
});

test("aggregate patch scanning skips raw tokens only on structurally valid Git binary payload lines", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = providerTokenFixture("B".repeat(20));
  const tokenPayloadLine = `T!${token}!`;
  const patch = Buffer.from([
    "diff --git a/public/forum-assets/island.png b/public/forum-assets/island.png",
    "new file mode 100644",
    "index 0000000..1111111",
    "GIT binary patch",
    "literal 20",
    tokenPayloadLine,
    "",
    "delta 1",
    "A00000",
    "",
    ""
  ].join("\n"));
  assert.doesNotThrow(() => scanBuffer(patch, { displayPath: "branch.patch", aggregatePatch: true }));
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    "diff --git a/public/forum-assets/single.png b/public/forum-assets/single.png",
    "GIT binary patch",
    "literal 1",
    "A00000",
    "",
    ""
  ].join("\n")), { displayPath: "branch.patch", aggregatePatch: true }));
});

test("aggregate patch binary suppression is section-bound and exact-marker-only", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = providerTokenFixture("C".repeat(20));
  const tokenPayloadLine = `T!${token}!`;
  const binarySection = [
    "diff --git a/public/forum-assets/island.png b/public/forum-assets/island.png",
    "new file mode 100644",
    "index 0000000..1111111",
    "GIT binary patch",
    "literal 20",
    tokenPayloadLine,
    ""
  ];
  for (const lines of [
    ["diff --git a/config.txt b/config.txt", `+${token}`, ...binarySection],
    [...binarySection, "diff --git a/config.txt b/config.txt", `+${token}`],
    ["diff --git a/config.txt b/config.txt", "+GIT binary patch", "+literal 20", `+${tokenPayloadLine}`]
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(lines.join("\n")), { displayPath: "branch.patch", aggregatePatch: true }),
      /high-confidence token/i
    );
  }
});

test("aggregate patch binary suppression fails closed on malformed structure and scans section metadata", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = providerTokenFixture("D".repeat(20));
  const tokenPayloadLine = `T!${token}!`;
  const diffHeader = "diff --git a/public/forum-assets/island.png b/public/forum-assets/island.png";
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  assert.throws(
    () => scanBuffer(Buffer.from("GIT binary patch\nliteral 1\nA00000"), options),
    /malformed Git binary patch/i
  );
  for (const lines of [
    ["GIT binary patch", "literal 20", tokenPayloadLine],
    [diffHeader, "GIT binary patch", tokenPayloadLine],
    [diffHeader, "GIT binary patch", "literal 20", pemHeaderFixture()],
    [diffHeader, "GIT binary patch", "literal 20", "arbitrary plain text"],
    [diffHeader, "GIT binary patch", "literal 20 garbage", tokenPayloadLine],
    [diffHeader, "GIT binary patch"]
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(lines.join("\n")), options),
      /high-confidence token|private-key header|malformed Git binary patch/i
    );
  }
  assert.throws(
    () => scanBuffer(Buffer.from([
      `diff --git a/${token}.png b/${token}.png`,
      "GIT binary patch",
      "literal 1",
      "A00000"
    ].join("\n")), options),
    /high-confidence token/i
  );
});

test("aggregate patch binary suppression rejects malformed diff headers", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const token = providerTokenFixture("E".repeat(20));
  const tokenPayloadLine = `T!${token}!`;
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  for (const header of [
    "diff --git garbage",
    "diff --git a/only-one-operand.png",
    "diff --git a/one.png b/two.png trailing-junk"
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from([
        header,
        "GIT binary patch",
        "literal 20",
        tokenPayloadLine,
        "",
        ""
      ].join("\n")), options),
      /malformed Git binary patch/i
    );
  }
});

test("aggregate patch binary payload requires a real blank before the next diff section", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  assert.throws(
    () => scanBuffer(Buffer.from([
      "diff --git a/public/one.png b/public/one.png",
      "GIT binary patch",
      "literal 1",
      "A00000",
      "diff --git a/config.txt b/config.txt",
      "+safe text"
    ].join("\n")), options),
    /malformed Git binary patch/i
  );
});

test("aggregate patch binary payload requires a real blank before EOF", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  const unterminated = [
    "diff --git a/public/one.png b/public/one.png",
    "GIT binary patch",
    "literal 1",
    "A00000"
  ].join("\n");
  assert.throws(() => scanBuffer(Buffer.from(unterminated), options), /malformed Git binary patch/i);
  assert.throws(() => scanBuffer(Buffer.from(`${unterminated}\n`), options), /malformed Git binary patch/i);
});

test("aggregate patch accepts Git-generated quoted paths and blank-terminated next sections", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const relativePath = "assets/space ü\tquote\"slash\\island.png";
  const absolutePath = path.join(fixture.linked, relativePath);
  const base = Buffer.concat([Buffer.from([0]), Buffer.alloc(256, 0x31)]);
  const changed = Buffer.concat([Buffer.from([0]), Buffer.alloc(256, 0x32)]);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, base);
  git(fixture.linked, "add", "--", relativePath);
  git(fixture.linked, "commit", "-m", "add quoted binary path fixture");
  fs.writeFileSync(absolutePath, changed);
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "changed text\n");
  const patch = execFileSync("git", ["diff", "--binary", "--", relativePath, "tracked.txt"], {
    cwd: fixture.linked,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const patchText = patch.toString("utf8");
  assert.match(patchText, /^diff --git "a\//mu);
  assert.equal([...patchText.matchAll(/^diff --git /gmu)].length, 2);
  fs.writeFileSync(absolutePath, base);
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "base\n");
  const applyCheck = spawnSync("git", ["apply", "--check", "--binary", "-"], {
    cwd: fixture.linked,
    input: patch,
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(applyCheck.status, 0, applyCheck.stderr || applyCheck.stdout);
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(() => scanBuffer(patch, { displayPath: "branch.patch", aggregatePatch: true }));
});

test("aggregate patch accepts Git-generated raw Unicode whitespace path atoms", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const relativePath = "assets/raw\u00a0unicode\u2028island.png";
  const absolutePath = path.join(fixture.linked, relativePath);
  const base = Buffer.concat([Buffer.from([0]), Buffer.alloc(256, 0x41)]);
  const changed = Buffer.concat([Buffer.from([0]), Buffer.alloc(256, 0x42)]);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, base);
  git(fixture.linked, "add", "--", relativePath);
  git(fixture.linked, "commit", "-m", "add raw Unicode whitespace path fixture");
  fs.writeFileSync(absolutePath, changed);
  const patch = execFileSync("git", ["-c", "core.quotePath=false", "diff", "--binary", "--", relativePath], {
    cwd: fixture.linked,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(
    patch.toString("utf8").split("\n", 1)[0],
    `diff --git a/${relativePath} b/${relativePath}`
  );
  fs.writeFileSync(absolutePath, base);
  const applyCheck = spawnSync("git", ["apply", "--check", "--binary", "-"], {
    cwd: fixture.linked,
    input: patch,
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(applyCheck.status, 0, applyCheck.stderr || applyCheck.stdout);
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(() => scanBuffer(patch, { displayPath: "branch.patch", aggregatePatch: true }));
});

test("aggregate patch rejects raw controls, quote, and backslash in unquoted path atoms", async () => {
  const { scanBuffer } = await import(libraryUrl);
  const options = { displayPath: "branch.patch", aggregatePatch: true };
  for (const forbidden of ["\t", "\u0001", "\u007f", "\"", "\\"]) {
    assert.throws(
      () => scanBuffer(Buffer.from([
        `diff --git a/raw${forbidden}path.png b/raw${forbidden}path.png`,
        "GIT binary patch",
        "literal 1",
        "A00000",
        "",
        ""
      ].join("\n")), options),
      /malformed Git binary patch/i
    );
  }
});

test("name-status parser routes current and historical rename paths without losing NUL-safe names", async () => {
  const { parseDiffNameStatusZ } = await import(libraryUrl);
  const fields = [
    "M", "双向\nM.ts",
    "A", "新增 空.patch",
    "D", "删除'旧.ts",
    "R096", "旧\nconfig.ts", "新\nconfig.ts",
    "C075", "复制源.ts", "复制目标.ts"
  ];
  const raw = Buffer.from(`${fields.join("\0")}\0`);
  const result = parseDiffNameStatusZ(raw);
  const byteSort = (items) => [...items].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  assert.deepEqual(result.currentPaths, byteSort(["双向\nM.ts", "新增 空.patch", "新\nconfig.ts", "复制目标.ts"]));
  assert.deepEqual(result.historicalPaths, byteSort(["双向\nM.ts", "删除'旧.ts", "旧\nconfig.ts", "复制源.ts"]));
  assert.throws(() => parseDiffNameStatusZ(Buffer.from("R096\0old.ts\0new.ts")), /NUL|delimiter/i);
});

test("secret scanner follows semantic call sinks and recursive target-value pairs", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`setPassword("${"A".repeat(40)}");`, "setter-call.ts"],
    [`account.updateClientSecret("${"B".repeat(40)}");`, "member-setter-call.ts"],
    [`account.setAPIKey("${"P".repeat(40)}");`, "api-key-setter-call.ts"],
    [`Reflect.set(config, "pass" + "word", "${"C".repeat(40)}");`, "reflect-set.ts"],
    [`Object.defineProperty(config, "pass" + "word", { value: "${"D".repeat(40)}", message: "${"E".repeat(40)}" });`, "define-property.ts"],
    [`let password; [password] = ["${"F".repeat(40)}"];`, "array-assignment.ts"],
    [`const [password] = ["${"G".repeat(40)}"];`, "array-binding.ts"],
    [`const [...password] = [process.env.PASSWORD, "${"Q".repeat(40)}"];`, "array-rest-binding.ts"],
    [`const { safe, ...password } = { safe: process.env.SAFE, leaked: "${"R".repeat(40)}" };`, "object-rest-binding.ts"],
    [`const { password: { fallback = "${"H".repeat(40)}" } } = source;`, "nested-secret-binding.ts"],
    [`const config = { ["pass" + "word"]: "${"I".repeat(40)}" };`, "static-computed-property.ts"],
    [`config["pass" + "word"] = "${"J".repeat(40)}";`, "static-element-assignment.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `diagnostics.setMessage("${"K".repeat(40)}");`,
    `Reflect.set(config, dynamicKey, "${"L".repeat(40)}");`,
    `Object.defineProperty(config, dynamicKey, { value: "${"M".repeat(40)}" });`,
    `Object.defineProperty(config, "password", { value: process.env.PASSWORD, message: "${"N".repeat(40)}" });`,
    `config[dynamicKey] = "${"O".repeat(40)}";`
  ].join("\n")), { displayPath: "semantic-sink-safe.ts" }));
});

test("secret scanner React wrapper provenance rejects a shadowed bare useMemo", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useMemo } from "react";',
      "function build() {",
      `  const changePassword = useMemo(() => "${"A".repeat(40)}", []);`,
      "  function useMemo(factory, dependencies) { return factory(dependencies); }",
      "  return changePassword;",
      "}"
    ].join("\n")), { displayPath: "shadowed-use-memo.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects a shadowed bare useCallback", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      "function build(useCallback) {",
      `  const changePassword = useCallback(() => "${"B".repeat(40)}", []);`,
      "  return changePassword;",
      "}"
    ].join("\n")), { displayPath: "shadowed-use-callback.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects hooks.useMemo", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from(
      `const changePassword = hooks.useMemo(() => "${"C".repeat(40)}", []);`
    ), { displayPath: "member-use-memo.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects helper.useCallback", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from(
      `const changePassword = helper.useCallback(() => "${"D".repeat(40)}", []);`
    ), { displayPath: "member-use-callback.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects custom wrappers with arguments", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      "function useCallback(factory, dependencies, options) {",
      "  return factory(dependencies, options);",
      "}",
      `const changePassword = useCallback(() => "${"E".repeat(40)}", [], { diagnostic: true });`
    ].join("\n")), { displayPath: "custom-use-callback.ts" }),
    /token assignment/i
  );
});

test("secret scanner bounded wrapper arguments ignore nonflowing scalar storage keys", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      "const localWrapper = (factory, storageKey) => factory;",
      "const callback = password => { vault.stored = password; };",
      `const changePassword = localWrapper(callback, "${"B".repeat(48)}");`
    ].join("\n")), { displayPath: "bounded-wrapper-storage-key.ts" })
  );
});

test("secret scanner bounded deep calls still reject global provider signatures", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `function inner() { localStorage.setItem("provider", "${providerTokenFixture("A".repeat(40))}"); }`,
      "function outer() { inner(); }",
      "const dependency = () => { outer(); };",
      "const changePassword = useCallback(password => { vault.stored = password; }, [dependency]);"
    ].join("\n")), { displayPath: "bounded-global-provider-token.ts" }),
    /high-confidence token/i
  );
});

test("secret scanner React wrapper provenance excludes type-only and non-React imports", async () => {
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`import type { useMemo } from "react";\nconst changePassword = useMemo(() => "${"F".repeat(40)}", []);`, "type-only-named.ts"],
    [`import { type useCallback } from "react";\nconst changePassword = useCallback(() => "${"G".repeat(40)}", []);`, "specifier-type-only.ts"],
    [`import type React from "react";\nconst changePassword = React.useCallback(() => "${"H".repeat(40)}", []);`, "type-only-default.ts"],
    [`import { useMemo } from "preact/hooks";\nconst changePassword = useMemo(() => "${"I".repeat(40)}", []);`, "non-react-import.ts"]
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath }),
      /token assignment/i
    );
  }
});

test("secret scanner React wrapper provenance scans resolved dependency functions conservatively", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const dependency = () => "${"Z".repeat(40)}";`,
      "const changePassword = useCallback(password => { vault.stored = password; }, [dependency]);"
    ].join("\n")), { displayPath: "resolved-react-dependency.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects a mutated default-import member", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      "React.useCallback = wrapper;",
      `const changePassword = React.useCallback(() => "${"R".repeat(40)}", []);`
    ].join("\n")), { displayPath: "mutated-react-default.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects Object.defineProperty mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      'Object.defineProperty(React, "useCallback", { value: wrapper });',
      `const changePassword = React.useCallback(() => "${"S".repeat(40)}", []);`
    ].join("\n")), { displayPath: "defined-react-default.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects a mutated static default-import element", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      'React["useCallback"] = wrapper;',
      `const changePassword = React["useCallback"](() => "${"T".repeat(40)}", []);`
    ].join("\n")), { displayPath: "mutated-react-element.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects an escaped default-import receiver", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      "const escapedReact = React;",
      "escapedReact.useCallback = wrapper;",
      `const changePassword = React.useCallback(() => "${"U".repeat(40)}", []);`
    ].join("\n")), { displayPath: "escaped-react-default.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects Object.assign mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      "Object.assign(React, { useCallback: wrapper });",
      `const changePassword = React.useCallback(() => "${"V".repeat(40)}", []);`
    ].join("\n")), { displayPath: "assigned-react-default.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects an untrusted identifier callback", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      "const wrapper = factory => factory();",
      "function build(useCallback) {",
      `  const callback = () => "${"W".repeat(40)}";`,
      "  const changePassword = useCallback(callback, []);",
      "  return changePassword;",
      "}",
      "build(wrapper);"
    ].join("\n")), { displayPath: "untrusted-identifier-callback.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance preserves genuine identifier callback input semantics", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const callback = password => { vault.stored = password; return "${"X".repeat(40)}"; };`,
      "const changePassword = useCallback(callback, []);"
    ].join("\n")), { displayPath: "react-identifier-callback.ts" })
  );
});

test("secret scanner React wrapper provenance rejects secret returns from rotateToken dependencies", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const rotateToken = () => "${"Y".repeat(40)}";`,
      "const changePassword = useCallback(password => { vault.stored = password; }, [rotateToken]);"
    ].join("\n")), { displayPath: "react-rotate-token-dependency.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects secret backing writes in dependencies", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const dependency = () => { vault.stored = "${"Z".repeat(40)}"; };`,
      "const changePassword = useCallback(password => { vault.stored = password; }, [dependency]);"
    ].join("\n")), { displayPath: "react-writing-dependency.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance accepts an unmodified default import", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      'const metadata = { React: "library" };',
      "void metadata.React;",
      `const changePassword = React.useCallback(password => { vault.stored = password; return "${"A".repeat(40)}"; }, []);`
    ].join("\n")), { displayPath: "stable-react-default.ts" })
  );
});

test("secret scanner React wrapper provenance rejects __defineGetter__ mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      'React.__defineGetter__("useCallback", () => wrapper);',
      `const changePassword = React.useCallback(() => "${"B".repeat(40)}", []);`
    ].join("\n")), { displayPath: "react-define-getter.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects computed __defineGetter__ mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      'React["__defineGetter__"]("useCallback", () => wrapper);',
      `const changePassword = React["useCallback"](() => "${"C".repeat(40)}", []);`
    ].join("\n")), { displayPath: "react-computed-define-getter.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects __defineSetter__ mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      'React.__defineSetter__("useCallback", wrapper);',
      `const changePassword = React.useCallback(() => "${"D".repeat(40)}", []);`
    ].join("\n")), { displayPath: "react-define-setter.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects a parenthesized __defineGetter__ mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      '(React.__defineGetter__)("useCallback", () => wrapper);',
      `const changePassword = React.useCallback(() => "${"K".repeat(40)}", []);`
    ].join("\n")), { displayPath: "react-parenthesized-define-getter.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance rejects a parenthesized computed __defineSetter mutation", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const wrapper = factory => factory();",
      '(React["__defineSetter"])("useCallback", wrapper);',
      `const changePassword = React.useCallback(() => "${"L".repeat(40)}", []);`
    ].join("\n")), { displayPath: "react-parenthesized-define-setter.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance accepts neutral AppProviders dependency storage chain", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const lessonEntryTargetStorageKey = "${"Q".repeat(48)}";`,
      `const sessionSyncStorageKey = "${"R".repeat(24)}";`,
      "const readStoredLessonEntryTarget = () => lessonEntryTargetStorageKey;",
      "const broadcastSessionChange = () => { localStorage.setItem(sessionSyncStorageKey, String(Date.now())); };",
      "const applyAuthSession = useCallback(session => {",
      "  const lessonTarget = readStoredLessonEntryTarget(session.id);",
      "  if (lessonTarget) session.target = lessonTarget;",
      "  broadcastSessionChange();",
      "}, []);",
      "const changePassword = useCallback(password => { vault.stored = password; }, [applyAuthSession]);"
    ].join("\n")), { displayPath: "AppProviders-safe-effects.ts" })
  );
});

test("secret scanner React wrapper provenance scans direct dependency backing-write aliases", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const rotateToken = () => "${"F".repeat(40)}";`,
      "const dependency = () => { vault.stored = rotateToken; };",
      "const changePassword = useCallback(password => { vault.stored = password; }, [dependency]);"
    ].join("\n")), { displayPath: "react-nested-write-dependency.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance scans direct dependency parameter-default aliases", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.throws(
    () => scanBuffer(Buffer.from([
      'import { useCallback } from "react";',
      `const rotateToken = () => "${"G".repeat(40)}";`,
      "const dependency = (reader = rotateToken) => process.env.PUBLIC_VALUE;",
      "const changePassword = useCallback(password => { vault.stored = password; }, [dependency]);"
    ].join("\n")), { displayPath: "react-parameter-default-dependency.ts" }),
    /token assignment/i
  );
});

test("secret scanner React wrapper provenance accepts a parenthesized default receiver", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      `const changePassword = (React).useCallback(password => { vault.stored = password; return "${"H".repeat(40)}"; }, []);`
    ].join("\n")), { displayPath: "parenthesized-react-default.ts" })
  );
});

test("secret scanner React wrapper provenance accepts an asserted default receiver", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      `const changePassword = (React as typeof React).useCallback(password => { vault.stored = password; return "${"I".repeat(40)}"; }, []);`
    ].join("\n")), { displayPath: "asserted-react-default.ts" })
  );
});

test("secret scanner React wrapper provenance accepts static destructuring and void reads", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(
    () => scanBuffer(Buffer.from([
      'import React from "react";',
      "const { useMemo: copiedUseMemo } = React;",
      "void React;",
      `const changePassword = React.useCallback(password => { vault.stored = password; return "${"J".repeat(40)}"; }, []);`
    ].join("\n")), { displayPath: "benign-react-default-reads.ts" })
  );
});

test("secret scanner preserves input and output semantics through source-proven React function wrappers", async () => {
  const { scanBuffer } = await import(libraryUrl);
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    'import React, { useCallback, useCallback as cb, useMemo as memo } from "react";',
    'import * as R from "react";',
    "const changePassword = useCallback(async (password: string) => {",
    "  const response = await fetch(\"/api/auth/password-change\", {",
    "    method: \"POST\",",
    "    body: JSON.stringify({ password })",
    "  });",
    "  return response.ok;",
    "}, []);",
    "const apiKey = memo(() => process.env.API_KEY, []);",
    `const resetPassword = cb((password) => { vault.stored = password; return "${"J".repeat(40)}"; }, []);`,
    `const rotatePassword = React.useCallback((password) => { vault.stored = password; return "${"K".repeat(40)}"; }, []);`,
    `const updatePassword = R["useCallback"]((password) => { vault.stored = password; return "${"L".repeat(40)}"; }, []);`
  ].join("\n")), { displayPath: "AppProviders.tsx" }));
  for (const source of [
    `import { useCallback } from "react";\nconst changePassword = useCallback(async (password = "${"M".repeat(40)}") => password, []);`,
    `import { useCallback } from "react";\nconst changePassword = useCallback(async (password) => fetch("/api", { body: JSON.stringify({ password: "${"N".repeat(40)}" }) }), []);`,
    `import { useMemo } from "react";\nconst apiKey = useMemo(() => "${"O".repeat(40)}", []);`,
    `import React from "react";\nconst changePassword = React.useCallback((password) => { this.stored = "${"P".repeat(40)}"; }, []);`,
    `import * as R from "react";\nconst apiKey = R["useMemo"](() => process.env.API_KEY, ["${"Q".repeat(40)}"]);`
  ]) {
    assert.throws(
      () => scanBuffer(Buffer.from(source), { displayPath: "AppProviders.tsx" }),
      /token assignment/i
    );
  }
});

test("secret scanner resolves only scope-valid local initializers from semantic sinks", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`function getPassword() { const fallback = "${"A".repeat(40)}"; return fallback; }`, "resolved-return.ts"],
    [`const fallback = "${"B".repeat(40)}"; setPassword(fallback);`, "resolved-call.ts"],
    [`const original = "${"C".repeat(40)}"; const alias = original; account.updatePassword("public-id", alias);`, "resolved-alias.ts"],
    [`const fallback = "${"D".repeat(40)}"; config.password = fallback;`, "resolved-target.ts"],
    [`function setPassword() { const fallback = "${"E".repeat(40)}"; this.cached = fallback; return "${"F".repeat(40)}"; }`, "setter-write.ts"],
    [`const fallback = "${"G".repeat(40)}"; Object.defineProperty(config, "password", { get() { return fallback; } });`, "descriptor-getter.ts"],
    [`function loadPassword() { const fallback = "${"N".repeat(40)}"; return fallback; }`, "load-output.ts"],
    [`function rotatePassword() { this.cached = "${"O".repeat(40)}"; return "${"P".repeat(40)}"; }`, "rotate-write.ts"],
    [`const holder = { fallback: "${"Q".repeat(40)}" }; setPassword(holder.fallback);`, "resolved-object-property.ts"],
    [`const value = "${"T".repeat(40)}"; Object.defineProperty(config, "password", { value });`, "descriptor-shorthand-value.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `const fallback = "${"H".repeat(40)}"; function getPassword(fallback) { return fallback; }`,
    `const outer = "${"I".repeat(40)}"; { const outer = process.env.PASSWORD; setPassword(outer); }`,
    `const first = second; const second = first; setPassword(first);`,
    `{ setPassword(later); const later = "${"N".repeat(40)}"; }`,
    `setPassword(runtimeFallback);`,
    `setPassword("${"J".repeat(40)}", process.env.PASSWORD);`,
    `Object.defineProperty(config, "password", { set(value) { console.error("${"K".repeat(40)}"); return "${"L".repeat(40)}"; } });`,
    `const { publicProjectId, ...credentials } = { publicProjectId: "${"M".repeat(40)}", displayName: process.env.DISPLAY_NAME }; setPassword(credentials);`,
    `function changePassword() { return "${"R".repeat(40)}"; }`,
    `function readPassword() { console.error("${"S".repeat(40)}"); return process.env.PASSWORD; }`
  ].join("\n")), { displayPath: "resolver-safe.ts" }));
});

test("secret scanner resolves destructuring, assignments, local calls, and precise setter values", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`const { fallback } = { fallback: "${"A".repeat(40)}" }; setPassword(fallback);`, "object-binding-resolution.ts"],
    [`const [fallback] = ["${"B".repeat(40)}"]; setPassword(fallback);`, "array-binding-resolution.ts"],
    [`const { publicId, ...fallback } = { publicId: process.env.PUBLIC_ID, stored: "${"C".repeat(40)}" }; setPassword(fallback);`, "rest-binding-resolution.ts"],
    [`let fallback; fallback = "${"D".repeat(40)}"; setPassword(fallback);`, "assignment-resolution.ts"],
    [`let fallback = process.env.PASSWORD; fallback = "${"E".repeat(40)}"; setPassword(fallback);`, "reassignment-resolution.ts"],
    [`function loadFallback() { return "${"F".repeat(40)}"; } setPassword(loadFallback());`, "function-call-resolution.ts"],
    [`setPassword(loadHoisted()); function loadHoisted() { return "${"T".repeat(40)}"; }`, "hoisted-function-call-resolution.ts"],
    [`const loadFallback = () => "${"G".repeat(40)}"; setPassword(loadFallback());`, "arrow-call-resolution.ts"],
    [`const loadFallback = () => "${"U".repeat(40)}"; const alias = loadFallback; setPassword(alias());`, "aliased-function-call-resolution.ts"],
    [`const payload = "${"H".repeat(40)}"; updatePassword("${"I".repeat(40)}", payload, { audit: true });`, "setter-options-value.ts"],
    [`const get = () => "${"J".repeat(40)}"; Object.defineProperty(config, "password", { get });`, "descriptor-shorthand-get.ts"],
    [`const set = () => { state.value = "${"K".repeat(40)}"; }; Object.defineProperty(config, "password", { set });`, "descriptor-shorthand-set.ts"],
    [`function rotatePassword() { state.value = "${"L".repeat(40)}"; this.cached = process.env.PASSWORD; }`, "setter-backing-write.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `let fallback = "${"M".repeat(40)}"; fallback = process.env.PASSWORD; setPassword(fallback);`,
    `function first() { return second(); } function second() { return first(); } setPassword(first());`,
    `setPassword(unresolvedFactory());`,
    `updatePassword("${"N".repeat(40)}", process.env.PASSWORD, { audit: true });`,
    `const done = () => console.log("${"V".repeat(40)}"); updatePassword("${"W".repeat(40)}", process.env.PASSWORD, done);`,
    `const set = () => { state.status = "${"O".repeat(40)}"; this.message = "${"P".repeat(40)}"; }; Object.defineProperty(config, "password", { set });`,
    `function changePassword() { state.code = "${"Q".repeat(40)}"; this.diagnostic = "${"R".repeat(40)}"; return "${"S".repeat(40)}"; }`
  ].join("\n")), { displayPath: "advanced-resolver-safe.ts" }));
});

test("secret scanner keeps all reaching values except proven straight-line replacement", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`const { fallback = "${"A".repeat(40)}" } = { fallback: process.env.PASSWORD }; setPassword(fallback);`, "destructure-default-possible.ts"],
    [`let fallback = process.env.PASSWORD; if (flag) { fallback = "${"B".repeat(40)}"; } setPassword(fallback);`, "conditional-assignment.ts"],
    [`let fallback = process.env.PASSWORD; for (const item of items) { fallback = "${"C".repeat(40)}"; } setPassword(fallback);`, "loop-assignment.ts"],
    [`let fallback = process.env.PASSWORD; try { fallback = "${"D".repeat(40)}"; } catch {} setPassword(fallback);`, "try-assignment.ts"],
    [`let fallback = "${"T".repeat(40)}"; flag && (fallback = process.env.PASSWORD); setPassword(fallback);`, "short-circuit-assignment.ts"],
    [`let fallback = process.env.PASSWORD; fallback ||= "${"E".repeat(40)}"; setPassword(fallback);`, "logical-or-assignment-resolution.ts"],
    [`let fallback = process.env.PASSWORD; fallback ??= "${"F".repeat(40)}"; setPassword(fallback);`, "nullish-assignment-resolution.ts"],
    [`let fallback = process.env.PASSWORD; fallback &&= "${"G".repeat(40)}"; setPassword(fallback);`, "logical-and-assignment-resolution.ts"],
    [`let fallback = process.env.PASSWORD; fallback += "${"H".repeat(40)}"; setPassword(fallback);`, "compound-assignment-resolution.ts"],
    [`const payload = "${"I".repeat(40)}"; updatePassword("${"J".repeat(40)}", payload, undefined);`, "undefined-metadata-sentinel.ts"],
    [`const payload = "${"K".repeat(40)}"; updatePassword("${"L".repeat(40)}", payload, null);`, "null-metadata-sentinel.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `let fallback = "${"M".repeat(40)}"; fallback = process.env.PASSWORD; setPassword(fallback);`,
    `updatePassword("${"N".repeat(40)}", process.env.PASSWORD, { reason: "${"O".repeat(40)}", source: "${"P".repeat(40)}", actor: "${"Q".repeat(40)}", timeout: 1000, requestId: "${"R".repeat(40)}", traceId: "${"S".repeat(40)}", dryRun: true });`
  ].join("\n")), { displayPath: "reaching-values-safe.ts" }));
});

test("secret scanner maps destructuring assignments and proves metadata aliases universally", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`let fallback; [fallback] = ["${"A".repeat(40)}"]; setPassword(fallback);`, "array-assignment-binding.ts"],
    [`let fallback; [fallback = process.env.PASSWORD] = ["${"L".repeat(40)}"]; setPassword(fallback);`, "array-assignment-mapped-default.ts"],
    [`let fallback; ({ fallback } = { fallback: "${"B".repeat(40)}" }); setPassword(fallback);`, "object-assignment-binding.ts"],
    [`let fallback; ({ source: fallback = "${"C".repeat(40)}" } = {}); setPassword(fallback);`, "object-assignment-default.ts"],
    [`let fallback; ({ publicId, ...fallback } = { publicId: process.env.PUBLIC_ID, stored: "${"D".repeat(40)}" }); setPassword(fallback);`, "object-assignment-rest.ts"],
    [`let requestOptions = { reason: "safe" }; if (flag) { requestOptions = "${"E".repeat(40)}"; } updatePassword("public-id", process.env.PASSWORD, requestOptions);`, "mixed-metadata-alias.ts"],
    [`const undefined = "${"M".repeat(40)}"; updatePassword("public-id", process.env.PASSWORD, undefined);`, "shadowed-undefined-metadata.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `const requestOptions = { reason: "${"F".repeat(40)}", source: "${"G".repeat(40)}", dryRun: true }; updatePassword("${"H".repeat(40)}", process.env.PASSWORD, requestOptions);`,
    `const baseOptions = { actor: "${"I".repeat(40)}", timeout: 1000 }; const requestOptionsAlias = baseOptions; updatePassword("${"J".repeat(40)}", process.env.PASSWORD, requestOptionsAlias);`,
    `const firstOptions = secondOptions; const secondOptions = firstOptions; updatePassword("${"K".repeat(40)}", process.env.PASSWORD, firstOptions);`
  ].join("\n")), { displayPath: "metadata-alias-safe.ts" }));
});

test("secret scanner distinguishes proven metadata from suspected trailing aliases", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`import { requestOptions } from "./options"; const payload = "${"A".repeat(40)}"; updatePassword("public-id", payload, requestOptions);`, "imported-options.ts"],
    [`function apply(requestOptions) { const value = "${"B".repeat(40)}"; updatePassword("public-id", value, requestOptions); }`, "parameter-options.ts"],
    [`function apply(config: UpdatePasswordOptions) { const value = "${"C".repeat(40)}"; updatePassword("public-id", value, config); }`, "typed-options.ts"],
    [`import { callback } from "./callback"; const payload = "${"D".repeat(40)}"; updatePassword("public-id", payload, callback);`, "imported-callback.ts"],
    [`import { callback } from "./callback"; const payload = "${"K".repeat(40)}"; const requestOptions = { reason: "safe" }; updatePassword("public-id", payload, requestOptions, callback);`, "callback-after-options.ts"],
    [`const baseOptions = { reason: "safe" }; const requestOptions = { ...baseOptions, audit: true }; const payload = "${"E".repeat(40)}"; updatePassword("public-id", payload, requestOptions);`, "proven-spread-options.ts"],
    [`import { baseOptions } from "./options"; const requestOptions = { ...baseOptions, reason: "safe" }; const payload = "${"F".repeat(40)}"; updatePassword("public-id", payload, requestOptions);`, "suspected-spread-options.ts"],
    [`let requestOptions; const payload = "${"G".repeat(40)}"; updatePassword("public-id", payload, requestOptions);`, "uninitialized-options.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `setPassword("${"H".repeat(40)}", process.env.PASSWORD);`,
    `const userId = "${"I".repeat(40)}"; setPassword(userId, process.env.PASSWORD);`,
    `function apply(value, ordinaryThirdArgument) { updatePassword("${"J".repeat(40)}", value, ordinaryThirdArgument); }`
  ].join("\n")), { displayPath: "ordinary-setter-values-safe.ts" }));
});

test("secret scanner consumes consecutive suspected metadata without scanning the subject", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`import { requestOptions, callback } from "./metadata"; const payload = "${"A".repeat(40)}"; updatePassword("public-id", payload, requestOptions, callback);`, "double-imported-suspected.ts"],
    [`let requestOptions; let callback; const payload = "${"B".repeat(40)}"; updatePassword("public-id", payload, requestOptions, callback);`, "double-local-suspected.ts"],
    [`import { baseOptions, callback } from "./metadata"; const requestOptions = { ...baseOptions, reason: "safe" }; const payload = "${"C".repeat(40)}"; updatePassword("public-id", payload, requestOptions, callback);`, "spread-options-callback.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `import { requestOptions, callback } from "./metadata"; updatePassword("${"D".repeat(40)}", requestOptions, callback);`,
    `let localOptions; let localCallback; updatePassword("${"E".repeat(40)}", localOptions, localCallback);`
  ].join("\n")), { displayPath: "metadata-subject-guard-safe.ts" }));
});

test("secret scanner derives the subject guard from standalone versus member call shape", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`const payload = "${"A".repeat(40)}"; account.setPassword(payload, { reason: "safe" });`, "member-set-password.ts"],
    [`const payload = "${"B".repeat(40)}"; account.updatePassword(payload, null);`, "member-update-password.ts"],
    [`const callback = () => console.log("safe"); const payload = "${"C".repeat(40)}"; account["changePassword"](payload, callback);`, "computed-member-change-password.ts"],
    [`const payload = "${"D".repeat(40)}"; setPassword(payload, { audit: true });`, "standalone-value-first-set-password.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `updatePassword("${"E".repeat(40)}", { reason: "safe" });`,
    `changePassword("${"F".repeat(40)}", null);`,
    `resetPassword("${"G".repeat(40)}", undefined);`
  ].join("\n")), { displayPath: "standalone-subject-only-safe.ts" }));
});

test("secret scanner derives standalone local setter values from resolved parameter signatures", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`function updatePassword(newPassword, requestOptions) {} const payload = "${"A".repeat(40)}"; updatePassword(payload, { reason: "safe" });`, "local-function-value-first.ts"],
    [`const resetPassword = (newPassword, callback) => {}; const payload = "${"B".repeat(40)}"; resetPassword(payload, () => console.log("safe"));`, "local-arrow-value-first.ts"],
    [`const changePassword = function (newPassword, metadata) {}; const payload = "${"C".repeat(40)}"; changePassword(payload, { audit: true });`, "local-function-expression-value-first.ts"],
    [`function updatePassword(userId, newPassword, requestOptions) {} const payload = "${"D".repeat(40)}"; updatePassword("${"E".repeat(40)}", payload, { reason: "safe" });`, "local-function-subject-first.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
  assert.doesNotThrow(() => scanBuffer(Buffer.from([
    `function updatePassword(userId, newPassword, requestOptions) {} updatePassword("${"F".repeat(40)}", process.env.PASSWORD, { reason: "safe" });`,
    `const changePassword = (accountId, value, callback) => {}; changePassword("${"G".repeat(40)}", process.env.PASSWORD, () => console.log("safe"));`
  ].join("\n")), { displayPath: "local-setter-signature-safe.ts" }));
});

test("secret scanner unions reliable local setter indices and falls back for unreliable branches", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { scanBuffer } = await import(libraryUrl);
  for (const [source, displayPath] of [
    [`function updatePassword(currentPassword, newPassword, options) {} const payload = "${"A".repeat(40)}"; updatePassword(process.env.CURRENT_PASSWORD, payload, { reason: "safe" });`, "all-password-params.ts"],
    [`const resetPassword = (resetToken, newPassword) => {}; const payload = "${"B".repeat(40)}"; resetPassword(process.env.RESET_TOKEN, payload);`, "token-and-password-params.ts"],
    [`function updatePassword() {} const payload = "${"C".repeat(40)}"; updatePassword("public-id", payload);`, "zero-param-fallback.ts"],
    [`const updatePassword = (...args) => {}; const payload = "${"D".repeat(40)}"; updatePassword(process.env.SUBJECT_ID, payload);`, "rest-param-fallback.ts"],
    [`function updatePassword({ newPassword }, options) {} const payload = "${"E".repeat(40)}"; updatePassword(process.env.SUBJECT_ID, payload);`, "destructured-param-fallback.ts"],
    [[
      `let updatePassword = (newPassword, options) => {};`,
      `if (flag) updatePassword = (userId, newPassword, options) => {};`,
      `updatePassword("${"F".repeat(40)}", process.env.PASSWORD, { reason: "safe" });`
    ].join("\n"), "conflicting-reliable-signatures.ts"],
    [[
      `let updatePassword = (newPassword, options) => {};`,
      `if (flag) updatePassword = createExternalSetter();`,
      `const payload = "${"G".repeat(40)}"; updatePassword(payload, { reason: "safe" });`
    ].join("\n"), "reliable-and-unresolved-signatures.ts"],
    [[
      `let updatePassword = (newPassword, options) => {};`,
      `if (flag) updatePassword = () => {};`,
      `const payload = "${"H".repeat(40)}"; updatePassword(payload, { reason: "safe" });`
    ].join("\n"), "reliable-and-zero-param-signatures.ts"],
    [[
      `let updatePassword = (newPassword, options) => {};`,
      `if (flag) updatePassword = (userId, value, options) => {};`,
      `const payload = "${"I".repeat(40)}"; updatePassword(process.env.SUBJECT_ID, payload, { reason: "safe" });`
    ].join("\n"), "reliable-union-plus-generic-fallback.ts"],
    [`function updatePassword(value, options) {} const payload = "${"J".repeat(40)}"; updatePassword(payload, { reason: "safe" });`, "local-generic-value-first.ts"],
    [`const rotatePassword = (payload, callback) => {}; const value = "${"K".repeat(40)}"; rotatePassword(value, () => console.log("safe"));`, "local-payload-callback-value-first.ts"],
    [[
      `let updatePassword = (userId, newPassword, options) => {};`,
      `if (flag) updatePassword = createExternalSetter();`,
      `const payload = "${"L".repeat(40)}"; updatePassword(payload, process.env.PASSWORD, { reason: "safe" });`
    ].join("\n"), "mixed-reliable-unresolved-arg-zero.ts"],
    [`function updatePassword(id, value, options) {} const payload = "${"M".repeat(40)}"; updatePassword(process.env.SUBJECT_ID, payload, { reason: "safe" });`, "bare-id-subject-value.ts"],
    [`function updatePassword(userId, currentValue, nextValue, options) {} const payload = "${"N".repeat(40)}"; updatePassword("public-id", process.env.CURRENT_VALUE, payload, { reason: "safe" });`, "multiple-nonmetadata-values.ts"],
    [[
      `let updatePassword = (userId, options) => {};`,
      `if (flag) updatePassword = createExternalSetter();`,
      `const payload = "${"O".repeat(40)}"; updatePassword(payload, { reason: "safe" });`
    ].join("\n"), "empty-indices-mixed-unresolved.ts"],
    [`function updatePassword() {} const payload = "${"P".repeat(40)}"; updatePassword(payload, { reason: "safe" });`, "zero-param-value-first-fallback.ts"],
    [`const rotatePassword = (...args) => {}; const payload = "${"Q".repeat(40)}"; rotatePassword(payload, () => console.log("safe"));`, "rest-param-value-first-fallback.ts"]
  ]) {
    assert.throws(() => scanBuffer(Buffer.from(source), { displayPath }), /token assignment/i);
  }
});

test("current gate dispatches a structurally exact immutable v2 archive through legacy compatibility", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const archived = run(writer, fixture);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  await downgradeFixtureArchiveSetToV2(fixture);
  const result = run(gate, fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("writer v3 externalizes exact NUL-safe evidence, captures index and worktree edits, and reuses a stable set", async (t) => {
  const { EVIDENCE_SCHEMA_VERSION } = await import(libraryUrl);
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const first = run(writer, fixture);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const manifestPath = path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, EVIDENCE_SCHEMA_VERSION);
  assert.match(manifest.evidenceRootId, /^[0-9a-f-]{36}$/i);
  assert.match(manifest.archiveSetFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(manifest.archivedWorktrees.length, 1);
  const entry = manifest.archivedWorktrees[0];
  assert.equal(entry.schemaVersion, EVIDENCE_SCHEMA_VERSION);
  assert.equal(entry.archiveSetFingerprint, manifest.archiveSetFingerprint);
  assert.equal(entry.secretScanner.status, "passed");
  assert.deepEqual(Object.keys(entry.artifacts).sort(), [
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
  assert.ok(entry.artifacts.statusInventory.sha256);
  assert.ok(entry.artifacts.indexInventory.sha256);
  assert.ok(entry.artifacts.trackedPatch.sha256);
  assert.ok(entry.artifacts.indexPatch.sha256);
  assert.ok(entry.artifacts.worktreePatch.sha256);
  assert.ok(entry.artifacts.untrackedPaths0.sha256);
  assert.ok(entry.artifacts.untrackedTar.sha256);
  assert.doesNotMatch(JSON.stringify(manifest), new RegExp(fixture.parent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const artifact of Object.values(entry.artifacts).filter(Boolean)) {
    assert.ok(!path.isAbsolute(artifact.path));
    assert.ok(fs.existsSync(path.join(fixture.evidenceRoot, artifact.path)));
    assert.equal(fs.statSync(path.join(fixture.evidenceRoot, artifact.path)).mode & 0o777, 0o600);
    assert.ok(fs.statSync(path.join(fixture.evidenceRoot, artifact.path)).nlink >= 2);
  }
  const patch = fs.readFileSync(path.join(fixture.evidenceRoot, entry.artifacts.trackedPatch.path), "utf8");
  assert.match(patch, /staged/);
  assert.match(patch, /unstaged/);
  const indexPatch = fs.readFileSync(path.join(fixture.evidenceRoot, entry.artifacts.indexPatch.path), "utf8");
  assert.match(indexPatch, /staged/);
  assert.doesNotMatch(indexPatch, /unstaged/);
  const worktreePatch = fs.readFileSync(path.join(fixture.evidenceRoot, entry.artifacts.worktreePatch.path), "utf8");
  assert.match(worktreePatch, /staged/);
  assert.match(worktreePatch, /unstaged/);
  const inventory = JSON.parse(fs.readFileSync(path.join(fixture.evidenceRoot, entry.artifacts.untrackedInventory.path), "utf8"));
  assert.deepEqual(inventory.map((item) => item.path).sort(), ["line\nbreak.txt", "quote'file.txt", "空 格.txt"].sort());
  const before = Object.fromEntries(Object.values(entry.artifacts).filter(Boolean).map((artifact) => [artifact.path, fs.statSync(path.join(fixture.evidenceRoot, artifact.path)).ino]));
  const touched = path.join(fixture.linked, "空 格.txt");
  const future = new Date(Date.now() + 120_000);
  fs.utimesSync(touched, future, future);
  const second = run(writer, fixture);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const rerun = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(rerun.archiveSetFingerprint, manifest.archiveSetFingerprint);
  for (const artifact of Object.values(rerun.archivedWorktrees[0].artifacts).filter(Boolean)) {
    assert.equal(fs.statSync(path.join(fixture.evidenceRoot, artifact.path)).ino, before[artifact.path]);
  }
});

test("a non-main transaction worktree converges across writer-gate-writer-gate without metadata self-reference", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const intake = path.join(fixture.linked, "coordination", "release-intake");
  fs.mkdirSync(intake, { recursive: true });
  fs.writeFileSync(path.join(intake, "latest-A25-dirty-tree-map.json"), `${JSON.stringify({
    statusSignature: "linked-transaction-signature",
    statusCounts: { expandedStatusEntries: 1 }
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "linked transaction source\n");
  const firstWriter = runFrom(writer, fixture, fixture.linked);
  assert.equal(firstWriter.status, 0, firstWriter.stderr || firstWriter.stdout);
  const firstGate = runFrom(gate, fixture, fixture.linked);
  assert.equal(firstGate.status, 0, firstGate.stderr || firstGate.stdout);
  const firstManifest = JSON.parse(fs.readFileSync(path.join(intake, "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json"), "utf8"));
  const secondWriter = runFrom(writer, fixture, fixture.linked);
  assert.equal(secondWriter.status, 0, secondWriter.stderr || secondWriter.stdout);
  const secondGate = runFrom(gate, fixture, fixture.linked);
  assert.equal(secondGate.status, 0, secondGate.stderr || secondGate.stdout);
  const secondManifest = JSON.parse(fs.readFileSync(path.join(intake, "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json"), "utf8"));
  assert.equal(secondManifest.archiveSetFingerprint, firstManifest.archiveSetFingerprint);
  assert.equal(secondManifest.generatedAt, firstManifest.generatedAt);
});

test("current gate never opens the legacy repository report path when it is a FIFO", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const initialWriter = run(writer, fixture);
  assert.equal(initialWriter.status, 0, initialWriter.stderr || initialWriter.stdout);
  const legacyOutput = path.join(fixture.repo, "coordination", "release-intake", "latest-A25-linked-worktree-archive-evidence-current-gate.json");
  fs.mkdirSync(path.dirname(legacyOutput), { recursive: true });
  fs.rmSync(legacyOutput, { force: true });
  execFileSync("mkfifo", [legacyOutput], { timeout: TEST_CHILD_TIMEOUT_MS });
  const fifoReader = fs.openSync(legacyOutput, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  t.after(() => fs.closeSync(fifoReader));
  const result = runFrom(gate, fixture, fixture.repo);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.lstatSync(legacyOutput).isFIFO(), true);
  const observed = Buffer.alloc(16 * 1024);
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(fifoReader, observed);
  } catch (error) {
    if (error?.code !== "EAGAIN") throw error;
  }
  assert.equal(bytesRead, 0, "legacy repository FIFO received gate output bytes");
});

test("external gate report paths reject unsafe parents, final targets, and injected temporary nodes", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, prepareEvidenceReportPath, writeEvidenceReport } = await import(libraryUrl);
  const filename = "gate-report.json";
  const makeRoot = (name) => {
    const evidenceRoot = path.join(fixture.parent, name);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    return { evidenceRoot, marker };
  };
  for (const kind of ["symlink", "file", "fifo"]) {
    const { evidenceRoot, marker } = makeRoot(`unsafe-parent-${kind}`);
    const reports = path.join(evidenceRoot, "reports");
    if (kind === "symlink") fs.symlinkSync(fixture.parent, reports);
    else if (kind === "file") fs.writeFileSync(reports, "not a directory\n");
    else execFileSync("mkfifo", [reports], { timeout: TEST_CHILD_TIMEOUT_MS });
    assert.throws(
      () => prepareEvidenceReportPath({ evidenceRoot, evidenceRootId: marker.rootId, filename }),
      /reports|unsafe|directory/i
    );
  }
  for (const kind of ["symlink", "fifo", "directory"]) {
    const { evidenceRoot, marker } = makeRoot(`unsafe-target-${kind}`);
    const target = prepareEvidenceReportPath({ evidenceRoot, evidenceRootId: marker.rootId, filename });
    if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside"), target);
    else if (kind === "fifo") execFileSync("mkfifo", [target], { timeout: TEST_CHILD_TIMEOUT_MS });
    else fs.mkdirSync(target);
    assert.throws(
      () => prepareEvidenceReportPath({ evidenceRoot, evidenceRootId: marker.rootId, filename }),
      /report target|unsafe|regular/i
    );
  }
  for (const kind of ["symlink", "fifo", "directory"]) {
    const { evidenceRoot, marker } = makeRoot(`unsafe-temp-${kind}`);
    const target = prepareEvidenceReportPath({ evidenceRoot, evidenceRootId: marker.rootId, filename });
    fs.writeFileSync(target, "trusted-old-report\n", { mode: 0o600 });
    const before = fs.readFileSync(target);
    const injectedTemp = path.join(path.dirname(target), `${filename}.tmp-injected`);
    if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside-temp"), injectedTemp);
    else if (kind === "fifo") execFileSync("mkfifo", [injectedTemp], { timeout: TEST_CHILD_TIMEOUT_MS });
    else fs.mkdirSync(injectedTemp);
    assert.throws(() => writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { test: true },
      temporaryPathFactory: () => injectedTemp
    }), /temporary|exist|unsafe|regular/i);
    assert.deepEqual(fs.readFileSync(target), before);
  }
});

test("external gate report promotion is marker-bound, private, ignores partial temps, and preserves old bytes on epoch drift", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    ensureEvidenceRoot,
    prepareEvidenceReportPath,
    settleMutationEpoch,
    startMutationEpochMonitor,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "gate-report.json";
  assert.throws(
    () => prepareEvidenceReportPath({ evidenceRoot: fixture.evidenceRoot, evidenceRootId: crypto.randomUUID(), filename }),
    /marker|ID|match/i
  );
  assert.throws(
    () => prepareEvidenceReportPath({ evidenceRoot: fixture.evidenceRoot, evidenceRootId: marker.rootId, filename: "../escape.json" }),
    /filename|invalid/i
  );
  const initialPayload = { version: 1 };
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: initialPayload
  });
  assert.equal(fs.statSync(reportPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), initialPayload);
  const partial = path.join(path.dirname(reportPath), `${filename}.tmp-partial`);
  fs.writeFileSync(partial, "{partial", { mode: 0o600 });
  assert.equal(prepareEvidenceReportPath({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename
  }), reportPath);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), initialPayload);
  const before = fs.readFileSync(reportPath);
  const monitor = startMutationEpochMonitor([fixture.linked]);
  const expectedEpoch = settleMutationEpoch(monitor);
  try {
    assert.throws(() => writeEvidenceReport({
      evidenceRoot: fixture.evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { version: 2 },
      beforeRename: () => {
        fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "report promotion drift\n");
        const observedEpoch = settleMutationEpoch(monitor);
        if (observedEpoch !== expectedEpoch) throw new Error("source epoch changed before report promotion");
      }
    }), /source epoch changed/i);
  } finally {
    abortMutationEpochMonitor(monitor);
  }
  assert.deepEqual(fs.readFileSync(reportPath), before);
  assert.deepEqual(
    fs.readdirSync(path.dirname(reportPath)).filter((name) => name.startsWith(`${filename}.tmp-`) && name !== path.basename(partial)),
    []
  );
});

test("v3 gate report and terminal attestation schemas bind exact typed provenance", async () => {
  const {
    assertEvidenceGateReport,
    assertMutationTerminalAttestation,
    assertTypedFseventsTerminalAdvance
  } = await import(libraryUrl);
  const nonTyped = {
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
    droppedEventCount: "0",
    sourceEventCount: "0",
    transactionMetadataEventCount: "0",
    unknownEventCount: "0",
    unmatchedDeltaCount: "0",
    xattrOnlyEventCount: "0"
  };
  const attestation = {
    schemaVersion: 3,
    sessionId: crypto.randomUUID(),
    sourceEpoch: 7,
    metadataEpoch: 3,
    xattrEpoch: 0,
    watchMode: "descriptor-sentinel",
    requestedWatchMode: "descriptor-sentinel",
    directoryTimestampPolicy: "semantic-directory",
    eventBackend: "none",
    helperProtocolVersion: null,
    regularFileCtimePolicy: "strict",
    coverageFingerprint: "d".repeat(64),
    coveragePathCount: 12,
    fdCount: 4,
    rootFdCount: 4,
    typedFsevents: nonTyped,
    status: "stopped"
  };
  assert.doesNotThrow(() => assertMutationTerminalAttestation(attestation, {
    sessionId: attestation.sessionId,
    sourceEpoch: 7,
    metadataEpoch: 3,
    xattrEpoch: 0,
    requestedWatchMode: "descriptor-sentinel",
    directoryTimestampPolicy: "semantic-directory",
    eventBackend: "none",
    helperProtocolVersion: null,
    regularFileCtimePolicy: "strict",
    typedFsevents: nonTyped
  }));
  assert.throws(
    () => assertMutationTerminalAttestation({ ...attestation, schemaVersion: 2 }),
    /attestation|schema|fields/i
  );
  assert.throws(
    () => assertMutationTerminalAttestation({ ...attestation, xattrEpoch: 1 }),
    /attestation|fields|typed/i
  );
  for (const invalid of [
    { ...attestation, extra: true },
    Object.fromEntries(Object.entries(attestation).filter(([key]) => key !== "sourceEpoch")),
    { ...attestation, directoryTimestampPolicy: "strict" },
    { ...attestation, eventBackend: "darwin-fsevents-file-events" },
    { ...attestation, regularFileCtimePolicy: "typed-xattr-only" },
    { ...attestation, watchMode: "descriptor-sentinel-fsevents" },
    { ...attestation, typedFsevents: { ...nonTyped, journalHighWater: 0 } },
    { ...attestation, typedFsevents: { ...nonTyped, helperSourceSha256: "a".repeat(64) } }
  ]) {
    assert.throws(
      () => assertMutationTerminalAttestation(invalid, {
        sessionId: attestation.sessionId,
        sourceEpoch: 7,
        metadataEpoch: 3,
        xattrEpoch: 0,
        requestedWatchMode: "descriptor-sentinel",
        directoryTimestampPolicy: "semantic-directory",
        eventBackend: "none",
        helperProtocolVersion: null,
        regularFileCtimePolicy: "strict",
        typedFsevents: nonTyped
      }),
      /attestation|fields|epoch|requested|policy|typed|backend/i
    );
  }
  const emptyTyped = {
    ...nonTyped,
    enabled: true,
    eventRootCount: 4,
    eventRootFingerprint: "1".repeat(64),
    helperBinarySha256: "2".repeat(64),
    helperSourceSha256: "3".repeat(64),
    journalFlushSequence: "1",
    journalSha256: crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex")
  };
  const typedAttestation = {
    ...attestation,
    eventBackend: "darwin-fsevents-file-events",
    helperProtocolVersion: 2,
    regularFileCtimePolicy: "typed-xattr-only",
    typedFsevents: emptyTyped,
    watchMode: "descriptor-sentinel-fsevents"
  };
  assert.doesNotThrow(() => assertMutationTerminalAttestation(typedAttestation));
  const oneMaterial = {
    ...emptyTyped,
    journalEntryCount: "1",
    journalFirstEventId: "42",
    journalHighWater: "41",
    journalLastEventId: "42",
    journalLastFlushedEventId: "42",
    journalSha256: "4".repeat(64),
    materialEventCount: "1",
    sourceEventCount: "1"
  };
  assert.doesNotThrow(() => assertMutationTerminalAttestation({
    ...typedAttestation,
    typedFsevents: oneMaterial
  }));
  for (const invalidTyped of [
    { ...typedAttestation, watchMode: "recursive" },
    { ...typedAttestation, typedFsevents: { ...emptyTyped, journalFlushSequence: "0" } },
    { ...typedAttestation, typedFsevents: { ...oneMaterial, materialEventCount: "0" } },
    { ...typedAttestation, typedFsevents: { ...oneMaterial, journalHighWater: "0" } },
    { ...typedAttestation, typedFsevents: { ...oneMaterial, journalHighWater: "40" } },
    { ...typedAttestation, typedFsevents: { ...oneMaterial, journalLastFlushedEventId: "41" } },
    {
      ...typedAttestation,
      typedFsevents: { ...oneMaterial, journalLastEventId: "43", journalLastFlushedEventId: "43" }
    },
    {
      ...typedAttestation,
      typedFsevents: {
        ...oneMaterial,
        journalEntryCount: "2",
        journalHighWater: "1",
        journalLastEventId: "43",
        journalLastFlushedEventId: "43",
        materialEventCount: "2",
        sourceEventCount: "2"
      }
    },
    {
      ...typedAttestation,
      typedFsevents: {
        ...oneMaterial,
        journalSha256: crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex")
      }
    }
  ]) assert.throws(() => assertMutationTerminalAttestation(invalidTyped), /attestation|fields|typed/i);
  assert.throws(
    () => assertTypedFseventsTerminalAdvance(emptyTyped, emptyTyped),
    /terminal|flush|sequence/i
  );
  assert.throws(
    () => assertTypedFseventsTerminalAdvance(emptyTyped, {
      ...oneMaterial,
      journalFlushSequence: "2",
      journalSha256: emptyTyped.journalSha256
    }),
    /terminal|journal|digest/i
  );
  assert.throws(
    () => assertTypedFseventsTerminalAdvance(oneMaterial, {
      ...oneMaterial,
      journalFlushSequence: "2",
      journalLastEventId: "43",
      journalLastFlushedEventId: "43"
    }),
    /terminal|journal|event ID/i
  );
  const oneXattr = {
    ...emptyTyped,
    journalEntryCount: "1",
    journalFirstEventId: "44",
    journalFlushSequence: "2",
    journalHighWater: "41",
    journalLastEventId: "44",
    journalLastFlushedEventId: "44",
    journalSha256: "5".repeat(64),
    xattrOnlyEventCount: "1"
  };
  assert.doesNotThrow(() => assertTypedFseventsTerminalAdvance(emptyTyped, oneXattr));
  const reportBasis = {
    checkedAt: new Date().toISOString(),
    schemaVersion: 3,
    archiveSetFingerprint: "b".repeat(64),
    dirtyMapStatusSignature: "signature",
    expandedStatusEntries: 1,
    openLinkedDecisions: 1,
    failures: [],
    branches: [{ branch: "feature/archive", head: "c".repeat(40) }]
  };
  const legacyReport = {
    ...reportBasis,
    terminalProtocol: {
      attestationFile: "reports/gate-monitor-attestation-slot-a.json",
      expectedMetadataEpoch: 3,
      expectedSourceEpoch: 7,
      monitorSessionId: attestation.sessionId,
      schemaVersion: 1
    }
  };
  assert.throws(
    () => assertEvidenceGateReport(legacyReport),
    /terminal protocol/i
  );
  assert.doesNotThrow(() => assertEvidenceGateReport(legacyReport, {
    allowLegacyTerminalProtocol: true
  }));
  const legacyV2Report = {
    ...reportBasis,
    terminalProtocol: {
      attestationFile: "reports/gate-monitor-attestation-slot-a.json",
      directoryTimestampPolicy: "semantic-directory",
      expectedMetadataEpoch: 3,
      expectedSourceEpoch: 7,
      monitorSessionId: attestation.sessionId,
      requestedWatchMode: "descriptor-sentinel",
      schemaVersion: 2
    }
  };
  assert.throws(() => assertEvidenceGateReport(legacyV2Report), /terminal protocol/i);
  assert.doesNotThrow(() => assertEvidenceGateReport(legacyV2Report, {
    allowLegacyTerminalProtocol: true
  }));
  const report = {
    ...reportBasis,
    terminalProtocol: {
      attestationFile: "reports/gate-monitor-attestation-slot-a.json",
      attestationSha256: "e".repeat(64),
      directoryTimestampPolicy: "semantic-directory",
      eventBackend: "none",
      expectedMetadataEpoch: 3,
      expectedSourceEpoch: 7,
      expectedXattrEpoch: 0,
      helperProtocolVersion: null,
      monitorSessionId: attestation.sessionId,
      regularFileCtimePolicy: "strict",
      requestedWatchMode: "descriptor-sentinel",
      schemaVersion: 3,
      typedFsevents: nonTyped,
      watchMode: "descriptor-sentinel"
    }
  };
  assert.doesNotThrow(() => assertEvidenceGateReport(report));
  assert.doesNotThrow(() => assertEvidenceGateReport({
    ...report,
    terminalProtocol: {
      ...report.terminalProtocol,
      eventBackend: "darwin-fsevents-file-events",
      expectedXattrEpoch: 0,
      helperProtocolVersion: 2,
      regularFileCtimePolicy: "typed-xattr-only",
      typedFsevents: emptyTyped,
      watchMode: "descriptor-sentinel-fsevents"
    }
  }));
  for (const invalidOptions of [
    null,
    true,
    { allowLegacyTerminalProtocol: "true" },
    { allowLegacyTerminalProtocol: true, extra: true }
  ]) {
    assert.throws(
      () => assertEvidenceGateReport(report, invalidOptions),
      /gate report validator options/i
    );
  }
  for (const invalid of [
    { ...report, extra: true },
    { ...report, schemaVersion: 2 },
    { ...report, terminalProtocol: { ...report.terminalProtocol, extra: true } },
    { ...report, terminalProtocol: { ...report.terminalProtocol, directoryTimestampPolicy: "strict" } },
    { ...report, terminalProtocol: { ...report.terminalProtocol, attestationSha256: null } },
    { ...report, terminalProtocol: { ...report.terminalProtocol, expectedXattrEpoch: "0" } },
    { ...report, terminalProtocol: { ...report.terminalProtocol, typedFsevents: { ...nonTyped, unknownEventCount: "1" } } },
    Object.fromEntries(Object.entries(report).filter(([key]) => key !== "failures"))
  ]) {
    assert.throws(() => assertEvidenceGateReport(invalid), /gate report|fields|terminal protocol/i);
  }
});

test("prepared external report remains invisible and preserves old bytes when terminal monitor acknowledgement fails", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "terminal-report.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const oldBytes = fs.readFileSync(reportPath);
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  t.after(() => abortEvidenceReport(prepared));
  assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  assert.equal(fs.existsSync(prepared.temporaryPath), true);
  const monitor = startMutationEpochMonitor([fixture.linked]);
  const expected = settleMutationEpochState(monitor);
  monitor.child.kill("SIGKILL");
  await waitForCondition(() => !processIsAlive(monitor.child.pid), 2_000);
  assert.throws(() => stopMutationEpochMonitor(monitor, {
    expectedEpoch: expected.sourceEpoch,
    expectedMetadataEpoch: expected.metadataEpoch
  }), /acknowledg|crash|terminal/i);
  abortEvidenceReport(prepared);
  assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  assert.equal(fs.existsSync(prepared.temporaryPath), false);
});

test("report promotion restores an existing final after the first directory fsync fails", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "fsync-existing-report.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  fs.chmodSync(reportPath, 0o640);
  assert.deepEqual(
    fs.readdirSync(path.dirname(reportPath)).filter((name) => name.startsWith(`${filename}.backup-`)
      || name.startsWith(`${filename}.recovery-`)),
    []
  );
  const oldBytes = fs.readFileSync(reportPath);
  const oldMode = fs.statSync(reportPath).mode & 0o777;
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  t.after(() => abortEvidenceReport(prepared));
  assert.throws(
    () => withDirectoryFsyncFailures([1], path.dirname(reportPath), () => commitEvidenceReport(prepared)),
    /simulated directory fsync failure 1/
  );
  assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  assert.equal(fs.statSync(reportPath).mode & 0o777, oldMode);
  assert.deepEqual(
    fs.readdirSync(path.dirname(reportPath)).filter((name) => name.startsWith(`${filename}.tmp-`)
      || name.startsWith(`${filename}.backup-`) || name.startsWith(`${filename}.recovery-`)),
    []
  );
});

test("report promotion restores absence after the first directory fsync fails", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "fsync-absent-report.json";
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  t.after(() => abortEvidenceReport(prepared));
  assert.throws(
    () => withDirectoryFsyncFailures([1], path.dirname(prepared.reportPath), () => commitEvidenceReport(prepared)),
    /simulated directory fsync failure 1/
  );
  assert.equal(fs.existsSync(prepared.reportPath), false);
  assert.deepEqual(
    fs.readdirSync(path.dirname(prepared.reportPath)).filter((name) => name.startsWith(`${filename}.tmp-`)
      || name.startsWith(`${filename}.backup-`) || name.startsWith(`${filename}.recovery-`)),
    []
  );
});

test("report promotion preserves a recovery journal when rollback directory fsync also fails", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  for (const originalExists of [true, false]) {
    const evidenceRoot = path.join(fixture.parent, `rollback-${originalExists ? "existing" : "absent"}`);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    const filename = `rollback-${originalExists ? "existing" : "absent"}.json`;
    let reportPath = path.join(evidenceRoot, "reports", filename);
    let oldBytes = null;
    if (originalExists) {
      reportPath = writeEvidenceReport({
        evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: "old" }
      });
      oldBytes = fs.readFileSync(reportPath);
    }
    const prepared = prepareEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "candidate" }
    });
    t.after(() => abortEvidenceReport(prepared));
    assert.throws(
      () => withDirectoryFsyncFailures([1, 2], path.dirname(reportPath), () => commitEvidenceReport(prepared)),
      /rollback.*directory fsync failure 2.*recovery/i
    );
    if (originalExists) assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
    else assert.equal(fs.existsSync(reportPath), false);
    const recoveryFiles = fs.readdirSync(path.dirname(reportPath))
      .filter((name) => name.startsWith(`${filename}.recovery-`));
    assert.equal(recoveryFiles.length, 1);
    const recovery = JSON.parse(fs.readFileSync(path.join(path.dirname(reportPath), recoveryFiles[0]), "utf8"));
    assert.equal(recovery.schemaVersion, 1);
    assert.equal(recovery.state, "rollback-durability-unconfirmed");
    assert.equal(recovery.original.exists, originalExists);
    if (originalExists) {
      assert.match(recovery.original.sha256, /^[0-9a-f]{64}$/u);
      assert.match(recovery.original.ino, /^\d+$/u);
      assert.equal(Number.isInteger(recovery.original.mode), true);
    }
    assert.match(recovery.promotionError, /directory fsync failure 1/);
    assert.match(recovery.rollbackError, /directory fsync failure 2/);
  }
});

test("a new publication consumes a committed-cleanup-pending journal before preparing its candidate", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "cleanup-pending-retry.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "committed-before-cleanup" }
  });
  t.after(() => abortEvidenceReport(prepared));
  assert.throws(
    () => withDirectoryFsyncFailures([2], path.dirname(reportPath), () => commitEvidenceReport(prepared)),
    /cleanup failed|directory fsync failure 2/i
  );
  const reportsDirectory = path.dirname(reportPath);
  const staleJournals = fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`));
  assert.equal(staleJournals.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "committed-before-cleanup" });
  const staleJournalPath = path.join(reportsDirectory, staleJournals[0]);
  assert.throws(() => withRecoveryJournalDeletionFsyncFailure(staleJournalPath, reportsDirectory, () => writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "must-not-publish" }
  })), /recovery.*journal deletion fsync failed.*simulated recovery journal deletion fsync failure/i);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "committed-before-cleanup" });
  assert.equal(fs.existsSync(path.join(reportsDirectory, staleJournals[0])), true);
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "retry" }
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "retry" });
  assert.deepEqual(fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`)), []);
});

test("rollback-durability recovery fsyncs before cleanup and blocks publication when that fsync fails", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "rollback-retry.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const oldBytes = fs.readFileSync(reportPath);
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  t.after(() => abortEvidenceReport(prepared));
  assert.throws(
    () => withDirectoryFsyncFailures([1, 2], path.dirname(reportPath), () => commitEvidenceReport(prepared)),
    /rollback.*recovery/i
  );
  const reportsDirectory = path.dirname(reportPath);
  const staleJournals = fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`));
  assert.equal(staleJournals.length, 1);
  assert.throws(() => withDirectoryFsyncFailures([2], path.dirname(reportPath), () => writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "must-not-publish" }
  })), /recovery.*directory fsync failure 2/i);
  assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  assert.equal(fs.existsSync(path.join(reportsDirectory, staleJournals[0])), true);
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "retry" }
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "retry" });
  assert.deepEqual(fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`)), []);
});

test("recovery fails closed on mismatched, unknown, noncanonical, extra-field, and duplicate journals", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  for (const kind of ["mismatch", "unknown", "escape", "extra", "multiple"]) {
    const recovery = await makeRollbackRecoveryFixture(fixture.parent, `strict-${kind}`);
    const journal = JSON.parse(fs.readFileSync(recovery.journalPath, "utf8"));
    if (kind === "mismatch") {
      fs.writeFileSync(recovery.reportPath, "mismatched-safe-final\n", { mode: 0o600 });
      fs.chmodSync(recovery.reportPath, 0o600);
    } else if (kind === "unknown") {
      journal.state = "unknown-state";
      fs.writeFileSync(recovery.journalPath, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 });
    } else if (kind === "escape") {
      journal.candidateFile = "../escape.tmp";
      fs.writeFileSync(recovery.journalPath, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 });
    } else if (kind === "extra") {
      journal.extra = true;
      fs.writeFileSync(recovery.journalPath, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 });
    } else {
      const secondId = crypto.randomUUID();
      const duplicate = {
        ...journal,
        backupFile: `${recovery.filename}.backup-${secondId}`,
        candidateFile: `${recovery.filename}.tmp-${secondId}`,
        transactionId: secondId
      };
      const duplicatePath = path.join(
        recovery.reportsDirectory,
        `${recovery.filename}.recovery-${secondId}.json`
      );
      fs.writeFileSync(duplicatePath, `${JSON.stringify(duplicate, null, 2)}\n`, { mode: 0o600 });
      fs.chmodSync(duplicatePath, 0o600);
    }
    const before = fs.readFileSync(recovery.reportPath);
    assert.throws(() => recovery.writeEvidenceReport({
      evidenceRoot: recovery.evidenceRoot,
      evidenceRootId: recovery.marker.rootId,
      filename: recovery.filename,
      payload: { state: "must-not-publish" }
    }), /recovery.*(?:match|invalid|noncanonical|multiple|unknown)/i);
    assert.deepEqual(fs.readFileSync(recovery.reportPath), before);
  }
});

test("recovery rejects unsafe journals and referenced candidate or backup nodes globally", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, writeEvidenceReport } = await import(libraryUrl);
  for (const kind of ["symlink", "fifo", "directory"]) {
    const evidenceRoot = path.join(fixture.parent, `unsafe-global-${kind}`);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    const filename = `safe-target-${kind}.json`;
    const reportPath = writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "old" }
    });
    const oldBytes = fs.readFileSync(reportPath);
    const reportsDirectory = path.dirname(reportPath);
    const unsafeJournal = path.join(reportsDirectory, `other-target.json.recovery-${crypto.randomUUID()}.json`);
    if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside-journal"), unsafeJournal);
    else if (kind === "fifo") execFileSync("mkfifo", [unsafeJournal], { timeout: TEST_CHILD_TIMEOUT_MS });
    else fs.mkdirSync(unsafeJournal);
    assert.throws(() => writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "must-not-publish" }
    }), /recovery.*unsafe/i);
    assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  }
  for (const kind of ["symlink", "fifo", "directory"]) {
    for (const field of ["candidateFile", "backupFile"]) {
      const recovery = await makeRollbackRecoveryFixture(fixture.parent, `unsafe-ref-${field}-${kind}`);
      const journal = JSON.parse(fs.readFileSync(recovery.journalPath, "utf8"));
      const unsafePath = path.join(recovery.reportsDirectory, journal[field]);
      if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside-reference"), unsafePath);
      else if (kind === "fifo") execFileSync("mkfifo", [unsafePath], { timeout: TEST_CHILD_TIMEOUT_MS });
      else fs.mkdirSync(unsafePath);
      assert.throws(() => recovery.writeEvidenceReport({
        evidenceRoot: recovery.evidenceRoot,
        evidenceRootId: recovery.marker.rootId,
        filename: recovery.filename,
        payload: { state: "must-not-publish" }
      }), /recovery.*unsafe/i);
      assert.deepEqual(fs.readFileSync(recovery.reportPath), recovery.oldBytes);
    }
  }
});

test("recovery resolves prepared and promotion-in-progress crash branches before retry", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, writeEvidenceReport } = await import(libraryUrl);
  for (const scenario of [
    "prepared-existing",
    "prepared-absent",
    "prepared-rewritten-candidate",
    "promoting-before-rename",
    "promoting-new"
  ]) {
    const evidenceRoot = path.join(fixture.parent, scenario);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    const filename = `${scenario}.json`;
    let reportPath = path.join(evidenceRoot, "reports", filename);
    if (scenario !== "prepared-absent") {
      reportPath = writeEvidenceReport({
        evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: "old" }
      });
    }
    leavePreparedReportInChild({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "crash-candidate" },
      promotionStage: scenario === "promoting-new"
        ? "after-rename"
        : (scenario === "promoting-before-rename"
          ? "before-rename"
          : (scenario === "prepared-rewritten-candidate" ? "rewrite-candidate" : null))
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const reportsDirectory = path.dirname(reportPath);
    assert.equal(fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`)).length, 1);
    writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "retry" }
    });
    assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "retry" });
    assert.deepEqual(fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.recovery-`)
      || name.startsWith(`${filename}.tmp-`) || name.startsWith(`${filename}.backup-`)), []);
  }
});

test("active report registry forbids only a second prepare for the exact same target", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortEvidenceReport, ensureEvidenceRoot, prepareEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const first = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: "active-first.json",
    payload: { state: "first" }
  });
  assert.throws(() => prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: "active-first.json",
    payload: { state: "second" }
  }), /already active|ownership.*(?:live owner|kernel lock is busy)/i);
  const other = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: "active-other.json",
    payload: { state: "other" }
  });
  assert.equal(fs.existsSync(first.temporaryPath), true);
  assert.equal(fs.existsSync(other.temporaryPath), true);
  abortEvidenceReport(other);
  abortEvidenceReport(first);
});

test("a live cross-process report owner blocks recovery and leaves every held path untouched", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortEvidenceReport, ensureEvidenceRoot, prepareEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "cross-process-live.json";
  const readyPath = path.join(fixture.parent, "cross-process-live.ready.json");
  const child = spawnHeldPreparedReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    readyPath
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    const deadline = Date.now() + TEST_CHILD_TIMEOUT_MS;
    while (!fs.existsSync(readyPath) && child.exitCode === null && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(fs.existsSync(readyPath), true, stderr || "cross-process owner exited before readiness");
    const held = JSON.parse(fs.readFileSync(readyPath, "utf8"));
    const before = Object.fromEntries(
      Object.values(held).filter((absolutePath) => absolutePath && fs.existsSync(absolutePath)).map((absolutePath) => [
        absolutePath,
        {
          bytes: fs.readFileSync(absolutePath),
          ino: fs.statSync(absolutePath).ino
        }
      ])
    );
    let contender = null;
    let observedError = null;
    const acquisitionStartedAt = Date.now();
    try {
      contender = prepareEvidenceReport({
        evidenceRoot: fixture.evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: "contender" }
      });
    } catch (error) {
      observedError = error;
    }
    const acquisitionElapsedMs = Date.now() - acquisitionStartedAt;
    if (contender) abortEvidenceReport(contender);
    assert.match(observedError?.message ?? "", /ownership|owner|active|lock/i);
    assert.ok(acquisitionElapsedMs >= 900, `live-owner rejection was not bounded-retry aware (${acquisitionElapsedMs}ms)`);
    assert.ok(acquisitionElapsedMs < 3_000, `live-owner rejection exceeded its bounded deadline (${acquisitionElapsedMs}ms)`);
    for (const [absolutePath, snapshot] of Object.entries(before)) {
      assert.equal(fs.existsSync(absolutePath), true);
      assert.equal(fs.statSync(absolutePath).ino, snapshot.ino);
      assert.deepEqual(fs.readFileSync(absolutePath), snapshot.bytes);
    }
  } finally {
    if (child.exitCode === null) {
      const closed = new Promise((resolve) => child.once("close", resolve));
      child.kill("SIGKILL");
      await closed;
    }
  }
  assert.equal(stderr, "");
});

test("a single P2 acquisition survives twenty dead-holder release races on the same stable inode", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, writeEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const failures = [];
  for (let index = 0; index < 20; index += 1) {
    const filename = `cross-process-stale-${index}.json`;
    const readyPath = path.join(fixture.parent, `cross-process-stale-${index}.ready.json`);
    const child = spawnHeldPreparedReport({
      evidenceRoot: fixture.evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      readyPath
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const deadline = Date.now() + TEST_CHILD_TIMEOUT_MS;
    while (!fs.existsSync(readyPath) && child.exitCode === null && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(fs.existsSync(readyPath), true, stderr || "cross-process owner exited before readiness");
    const held = JSON.parse(fs.readFileSync(readyPath, "utf8"));
    const reportsDirectory = path.dirname(held.reportPath);
    const lockName = `.evidence-report-owner-${crypto.createHash("sha256").update(filename).digest("hex")}.lock`;
    const lockPath = path.join(reportsDirectory, lockName);
    const stableLockInode = fs.statSync(lockPath).ino;
    const closed = new Promise((resolve) => child.once("close", resolve));
    child.kill("SIGKILL");
    await closed;
    let reportPath;
    try {
      reportPath = writeEvidenceReport({
        evidenceRoot: fixture.evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: `recovered-after-owner-death-${index}` }
      });
    } catch (error) {
      failures.push({ index, message: error.message });
    }
    if (!reportPath) continue;
    assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), {
      state: `recovered-after-owner-death-${index}`
    });
    assert.equal(fs.statSync(lockPath).ino, stableLockInode);
    assert.deepEqual(fs.readdirSync(reportsDirectory).filter((name) => name.startsWith(`${filename}.tmp-`)
      || name.startsWith(`${filename}.backup-`) || name.startsWith(`${filename}.recovery-`)), []);
    assert.equal(stderr, "");
  }
  assert.deepEqual(failures, []);
});

test("report lock acquisition never invokes stale-owner deletion", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortEvidenceReport, ensureEvidenceRoot, prepareEvidenceReport, writeEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "replacement-race.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const reportsDirectory = path.dirname(reportPath);
  const lockPath = path.join(
    reportsDirectory,
    `.evidence-report-owner-${crypto.createHash("sha256").update(filename).digest("hex")}.lock`
  );
  fs.writeFileSync(lockPath, `${JSON.stringify({ invalid: "legacy removable owner record" }, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(lockPath, 0o600);
  const originalRmSync = fs.rmSync;
  let replacementInstalled = false;
  let contender = null;
  let observedError = null;
  fs.rmSync = (absolutePath, ...args) => {
    if (absolutePath === lockPath && !replacementInstalled) {
      originalRmSync(absolutePath, ...args);
      fs.writeFileSync(
        lockPath,
        `${JSON.stringify({ replacement: true }, null, 2)}\n`,
        { mode: 0o600 }
      );
      fs.chmodSync(lockPath, 0o600);
      replacementInstalled = true;
    }
    return originalRmSync(absolutePath, ...args);
  };
  try {
    try {
      contender = prepareEvidenceReport({
        evidenceRoot: fixture.evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: "must-not-prepare" }
      });
    } catch (error) {
      observedError = error;
    }
  } finally {
    fs.rmSync = originalRmSync;
    if (contender) abortEvidenceReport(contender);
  }
  assert.equal(replacementInstalled, false, "stable ownership protocol must never remove its lock path");
  assert.match(observedError?.message ?? "", /ownership lock immutable header is invalid/i);
  assert.equal(fs.existsSync(lockPath), true);
});

test("held lock replacement fails P1 and remains untouched when P2 rejects it", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortEvidenceReport, commitEvidenceReport, ensureEvidenceRoot, prepareEvidenceReport, writeEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "held-lock-replacement.json";
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const prepared = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "candidate" }
  });
  const lockPath = prepared.ownershipLock.lockPath;
  const heldInode = fs.fstatSync(prepared.ownershipLock.descriptor).ino;
  assert.equal(fs.statSync(lockPath).ino, heldInode);
  fs.rmSync(lockPath);
  fs.writeFileSync(lockPath, `${JSON.stringify({ replacement: true })}\n`, { mode: 0o600 });
  fs.chmodSync(lockPath, 0o600);
  const replacementInode = fs.statSync(lockPath).ino;
  assert.notEqual(replacementInode, heldInode);
  assert.throws(() => commitEvidenceReport(prepared), /ownership lock inode or mode is invalid/i);
  assert.throws(() => abortEvidenceReport(prepared), /ownership lock inode or mode is invalid/i);
  assert.equal(prepared.ownershipLock.descriptor, null);
  assert.equal(fs.existsSync(prepared.ownershipLock.holder.scratchDirectory), false);
  assert.throws(() => prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "p2-must-not-prepare" }
  }), /ownership lock immutable header is invalid/i);
  assert.equal(fs.existsSync(lockPath), true);
  assert.equal(fs.statSync(lockPath).ino, replacementInode);
  assert.deepEqual(JSON.parse(fs.readFileSync(lockPath, "utf8")), { replacement: true });
});

test("two cross-process contenders produce exactly one held report owner", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, writeEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: "contention-bootstrap.json",
    payload: { state: "bootstrap" }
  });
  const filename = "contention-target.json";
  const contenders = [0, 1].map((index) => {
    const readyPath = path.join(fixture.parent, `contention-${index}.ready.json`);
    const child = spawnHeldPreparedReport({
      evidenceRoot: fixture.evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      readyPath
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    return { child, getStderr: () => stderr, readyPath };
  });
  try {
    const deadline = Date.now() + TEST_CHILD_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const readyCount = contenders.filter((item) => fs.existsSync(item.readyPath)).length;
      const exitedCount = contenders.filter((item) => item.child.exitCode !== null).length;
      if (readyCount === 1 && exitedCount === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const winners = contenders.filter((item) => fs.existsSync(item.readyPath));
    const losers = contenders.filter((item) => !fs.existsSync(item.readyPath));
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.notEqual(losers[0].child.exitCode, null);
    assert.match(losers[0].getStderr(), /ownership|owner|lock/i);
  } finally {
    for (const item of contenders) {
      if (item.child.exitCode === null) {
        const closed = new Promise((resolve) => item.child.once("close", resolve));
        item.child.kill("SIGKILL");
        await closed;
      }
    }
  }
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "after-contention" }
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, "utf8")), { state: "after-contention" });
});

test("stable report ownership locks reject unsafe nodes, invalid headers, and held-byte tampering", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const lockPathFor = (reportsDirectory, filename) => path.join(
    reportsDirectory,
    `.evidence-report-owner-${crypto.createHash("sha256").update(filename).digest("hex")}.lock`
  );
  for (const kind of ["symlink", "fifo", "directory"]) {
    const evidenceRoot = path.join(fixture.parent, `unsafe-owner-${kind}`);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    const filename = `unsafe-owner-${kind}.json`;
    const reportPath = writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "old" }
    });
    const oldBytes = fs.readFileSync(reportPath);
    const lockPath = lockPathFor(path.dirname(reportPath), filename);
    fs.rmSync(lockPath);
    if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside-owner-lock"), lockPath);
    else if (kind === "fifo") execFileSync("mkfifo", [lockPath], { timeout: TEST_CHILD_TIMEOUT_MS });
    else fs.mkdirSync(lockPath);
    assert.throws(() => prepareEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "must-not-prepare" }
    }), /ownership lock.*unsafe/i);
    assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  }
  for (const kind of ["extra", "escape", "wrong-root"]) {
    const evidenceRoot = path.join(fixture.parent, `invalid-owner-${kind}`);
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
    const filename = `invalid-owner-${kind}.json`;
    const reportPath = writeEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "old" }
    });
    const oldBytes = fs.readFileSync(reportPath);
    const lockPath = lockPathFor(path.dirname(reportPath), filename);
    const lock = {
      evidenceRootId: kind === "wrong-root" ? crypto.randomUUID() : marker.rootId,
      schema: 1,
      targetHash: crypto.createHash("sha256").update(filename).digest("hex"),
      targetName: kind === "escape" ? "../escape.json" : filename,
    };
    if (kind === "extra") lock.extra = true;
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(lockPath, 0o600);
    assert.throws(() => prepareEvidenceReport({
      evidenceRoot,
      evidenceRootId: marker.rootId,
      filename,
      payload: { state: "must-not-prepare" }
    }), /ownership lock immutable header is invalid/i);
    assert.equal(fs.existsSync(lockPath), true);
    assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  }
  const tamperRoot = path.join(fixture.parent, "tampered-held-owner");
  const tamperMarker = ensureEvidenceRoot({ evidenceRoot: tamperRoot, repositoryId: TEST_REPOSITORY_ID });
  const tamperFilename = "tampered-held-owner.json";
  const prepared = prepareEvidenceReport({
    evidenceRoot: tamperRoot,
    evidenceRootId: tamperMarker.rootId,
    filename: tamperFilename,
    payload: { state: "candidate" }
  });
  fs.appendFileSync(prepared.ownershipLock.lockPath, " ");
  assert.throws(() => commitEvidenceReport(prepared), /ownership lock bytes changed/i);
  assert.throws(() => abortEvidenceReport(prepared), /ownership lock bytes changed/i);
  assert.equal(prepared.ownershipLock.descriptor, null);
  assert.equal(fs.existsSync(prepared.ownershipLock.holder.scratchDirectory), false);

  const releaseRoot = path.join(fixture.parent, "released-owner");
  const releaseMarker = ensureEvidenceRoot({ evidenceRoot: releaseRoot, repositoryId: TEST_REPOSITORY_ID });
  const releaseFilename = "released-owner.json";
  const first = writeEvidenceReport({
    evidenceRoot: releaseRoot,
    evidenceRootId: releaseMarker.rootId,
    filename: releaseFilename,
    payload: { state: "first" }
  });
  const releaseLockPath = lockPathFor(path.dirname(first), releaseFilename);
  assert.equal(fs.existsSync(releaseLockPath), true);
  const releaseLockInode = fs.statSync(releaseLockPath).ino;
  writeEvidenceReport({
    evidenceRoot: releaseRoot,
    evidenceRootId: releaseMarker.rootId,
    filename: releaseFilename,
    payload: { state: "second" }
  });
  assert.equal(fs.existsSync(releaseLockPath), true);
  assert.equal(fs.statSync(releaseLockPath).ino, releaseLockInode);
  assert.deepEqual(JSON.parse(fs.readFileSync(first, "utf8")), { state: "second" });
});

test("report preparation rejects injected symlink and FIFO backup or recovery nodes", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, prepareEvidenceReport, writeEvidenceReport } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const filename = "unsafe-transaction-report.json";
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename,
    payload: { state: "old" }
  });
  const oldBytes = fs.readFileSync(reportPath);
  for (const kind of ["symlink", "fifo"]) {
    for (const nodeKind of ["backup", "recovery"]) {
      const injectedPath = path.join(path.dirname(reportPath), `${filename}.${nodeKind}-injected-${kind}`);
      if (kind === "symlink") fs.symlinkSync(path.join(fixture.parent, "outside-transaction-node"), injectedPath);
      else execFileSync("mkfifo", [injectedPath], { timeout: TEST_CHILD_TIMEOUT_MS });
      const injectedFactory = nodeKind === "backup"
        ? { backupPathFactory: () => injectedPath }
        : { recoveryPathFactory: () => injectedPath };
      assert.throws(() => prepareEvidenceReport({
        evidenceRoot: fixture.evidenceRoot,
        evidenceRootId: marker.rootId,
        filename,
        payload: { state: "candidate" },
        ...injectedFactory
      }), /backup|recovery|exist|unsafe|transaction/i);
      assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
      assert.equal(kind === "symlink" ? fs.lstatSync(injectedPath).isSymbolicLink() : fs.lstatSync(injectedPath).isFIFO(), true);
      fs.rmSync(injectedPath, { force: true });
    }
  }
});

test("gate source commits terminal attestation before publishing the final gate report", () => {
  const source = fs.readFileSync(gate, "utf8");
  const attestationCommit = source.indexOf("commitEvidenceReport(preparedAttestation");
  const gateReportCommit = source.indexOf("commitEvidenceReport(preparedReport");
  assert.notEqual(attestationCommit, -1);
  assert.notEqual(gateReportCommit, -1);
  assert.ok(attestationCommit < gateReportCommit);
});

test("attestation-first two-report publication preserves the old gate report when its promotion rolls back", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortEvidenceReport,
    commitEvidenceReport,
    ensureEvidenceRoot,
    prepareEvidenceReport,
    writeEvidenceReport
  } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const oldAttestationFilename = "gate-monitor-attestation-slot-a.json";
  const attestationFilename = "gate-monitor-attestation-slot-b.json";
  const reportFilename = "latest-A25-linked-worktree-archive-evidence-current-gate.json";
  const oldAttestationPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: oldAttestationFilename,
    payload: { state: "old-attestation" }
  });
  const oldAttestation = fs.readFileSync(oldAttestationPath);
  const reportPath = writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: reportFilename,
    payload: { state: "old-report" }
  });
  const oldReport = fs.readFileSync(reportPath);
  const preparedAttestation = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: attestationFilename,
    payload: { state: "new-attestation" }
  });
  const preparedReport = prepareEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: reportFilename,
    payload: { state: "new-report" }
  });
  t.after(() => {
    abortEvidenceReport(preparedAttestation);
    abortEvidenceReport(preparedReport);
  });
  commitEvidenceReport(preparedAttestation);
  const inactiveAttestationPath = path.join(path.dirname(reportPath), attestationFilename);
  assert.deepEqual(JSON.parse(fs.readFileSync(inactiveAttestationPath, "utf8")), { state: "new-attestation" });
  assert.throws(
    () => withDirectoryFsyncFailures([1], path.dirname(reportPath), () => commitEvidenceReport(preparedReport)),
    /simulated directory fsync failure 1/
  );
  assert.deepEqual(fs.readFileSync(reportPath), oldReport);
  assert.deepEqual(fs.readFileSync(oldAttestationPath), oldAttestation);
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: attestationFilename,
    payload: { state: "next-inactive-attestation" }
  });
  writeEvidenceReport({
    evidenceRoot: fixture.evidenceRoot,
    evidenceRootId: marker.rootId,
    filename: reportFilename,
    payload: { state: "next-report" }
  });
  const reportNames = fs.readdirSync(path.dirname(reportPath));
  assert.equal(reportNames.filter((name) => name.startsWith("gate-monitor-attestation-") && name.endsWith(".json")).length, 2);
  assert.equal(reportNames.filter((name) => name.startsWith(".evidence-report-owner-")).length, 3);
});

test("the three-state artifacts restore HEAD to the exact index, worktree, and untracked state", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const artifacts = manifest.archivedWorktrees[0].artifacts;
  const artifactPath = (key) => path.join(fixture.evidenceRoot, artifacts[key].path);
  const expected = {
    status: fs.readFileSync(artifactPath("statusInventory")),
    indexInventory: fs.readFileSync(artifactPath("indexInventory")),
    trackedPatch: fs.readFileSync(artifactPath("trackedPatch")),
    indexPatch: fs.readFileSync(artifactPath("indexPatch")),
    worktreePatch: fs.readFileSync(artifactPath("worktreePatch"))
  };
  const restored = path.join(fixture.parent, "restored clone");
  execFileSync("git", ["clone", "--no-local", fixture.repo, restored], { timeout: TEST_CHILD_TIMEOUT_MS });
  git(restored, "checkout", "-b", "feature/archive", "origin/feature/archive");
  execFileSync("git", ["apply", "--index", "--binary", artifactPath("indexPatch")], {
    cwd: restored,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  execFileSync("git", ["apply", "--binary", artifactPath("worktreePatch")], {
    cwd: restored,
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  execFileSync("tar", ["-xzf", artifactPath("untrackedTar"), "-C", restored], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const observe = (args) => execFileSync("git", args, { cwd: restored, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.deepEqual(observe(["ls-files", "--stage", "-z"]), expected.indexInventory);
  assert.deepEqual(observe(["diff", "--cached", "HEAD", "--binary", "--"]), expected.indexPatch);
  assert.deepEqual(observe(["diff", "--binary", "--"]), expected.worktreePatch);
  assert.deepEqual(observe(["diff", "HEAD", "--binary", "--"]), expected.trackedPatch);
  assert.deepEqual(observe(["status", "--porcelain=v1", "-z", "-uall"]), expected.status);
});

test("v2 gate binds each artifact descriptor to the matching current snapshot buffer", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifestPath = path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const indexPath = path.join(fixture.evidenceRoot, "sets", manifest.archiveSetFingerprint, "archive-set.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const swapped = {
    ...manifest.archivedWorktrees[0].artifacts,
    indexPatch: manifest.archivedWorktrees[0].artifacts.worktreePatch,
    worktreePatch: manifest.archivedWorktrees[0].artifacts.indexPatch
  };
  manifest.archivedWorktrees[0].artifacts = swapped;
  index.entries[0].artifacts = swapped;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /artifact.*(?:snapshot|descriptor|buffer)|(?:snapshot|descriptor|buffer).*artifact/i);
});

test("writer rejects a staged secret even when the working file equals HEAD", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const secret = "I".repeat(40);
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), `PASSWORD=${secret}\n`);
  git(fixture.linked, "add", "tracked.txt");
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "base\n");
  assert.match(git(fixture.linked, "status", "--porcelain=v1", "--", "tracked.txt"), /^MM /u);
  const result = run(writer, fixture);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /(?:index|staged).*tracked\.txt.*token assignment/i);
  assert.doesNotMatch(output, new RegExp(secret));
});

test("writer fails closed on unmerged index stages instead of claiming restorable evidence", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "feature side\n");
  git(fixture.linked, "add", "tracked.txt");
  git(fixture.linked, "commit", "-m", "feature side");
  fs.writeFileSync(path.join(fixture.repo, "tracked.txt"), "main side\n");
  git(fixture.repo, "add", "tracked.txt");
  git(fixture.repo, "commit", "-m", "main side");
  const merge = spawnSync("git", ["merge", "main"], { cwd: fixture.linked, encoding: "utf8" });
  assert.notEqual(merge.status, 0);
  assert.match(git(fixture.linked, "status", "--porcelain=v1", "--", "tracked.txt"), /^UU /u);
  const result = run(writer, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /unmerged index stage/i);
});

test("writer rejects escaping tracked symlinks in committed, working, and staged index states without leaking targets", (t) => {
  for (const state of ["committed", "working", "index"]) {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
    const secretTarget = `outside-${state}-${crypto.randomUUID()}`;
    const trackedPath = path.join(fixture.linked, "tracked.txt");
    fs.rmSync(trackedPath);
    fs.symlinkSync(`../${secretTarget}`, trackedPath);
    if (state === "committed") {
      git(fixture.linked, "add", "tracked.txt");
      git(fixture.linked, "commit", "-m", "escaping committed symlink");
    } else if (state === "index") {
      git(fixture.linked, "add", "tracked.txt");
      fs.rmSync(trackedPath);
      fs.writeFileSync(trackedPath, "base\n");
    }
    const result = run(writer, fixture);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, `${state} tracked symlink unexpectedly archived`);
    assert.match(output, /symlink.*(?:escape|absolute|unsafe)|(?:escape|absolute|unsafe).*symlink/i);
    assert.doesNotMatch(output, new RegExp(secretTarget));
  }
});

test("tracked symlinks cannot escape through an ignored symlink ancestor with a missing leaf", (t) => {
  for (const state of ["committed", "working", "index"]) {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
    const outside = path.join(fixture.parent, `outside-ancestor-${state}-${crypto.randomUUID()}`);
    fs.mkdirSync(outside);
    const excludePath = git(fixture.linked, "rev-parse", "--git-path", "info/exclude");
    fs.appendFileSync(path.resolve(fixture.linked, excludePath), "ignored-dir\n");
    fs.symlinkSync(outside, path.join(fixture.linked, "ignored-dir"));
    assert.equal(git(fixture.linked, "check-ignore", "ignored-dir"), "ignored-dir");
    const trackedPath = path.join(fixture.linked, "tracked.txt");
    fs.rmSync(trackedPath);
    fs.symlinkSync("ignored-dir/missing.txt", trackedPath);
    if (state === "committed") {
      git(fixture.linked, "add", "tracked.txt");
      git(fixture.linked, "commit", "-m", "ancestor escape committed symlink");
    } else if (state === "index") {
      git(fixture.linked, "add", "tracked.txt");
      fs.rmSync(trackedPath);
      fs.writeFileSync(trackedPath, "base\n");
    }
    const result = run(writer, fixture);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, `${state} symlink-ancestor escape unexpectedly archived`);
    assert.match(output, /symlink.*(?:ancestor|escape|unsafe)|(?:ancestor|escape|unsafe).*symlink/i);
    assert.doesNotMatch(output, new RegExp(path.basename(outside)));
  }
});

test("tracked symlinks may target an internal missing leaf when every existing ancestor stays inside", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture.linked, "internal-dir"));
  fs.rmSync(path.join(fixture.linked, "tracked.txt"));
  fs.symlinkSync("internal-dir/missing.txt", path.join(fixture.linked, "tracked.txt"));
  const result = run(writer, fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const checked = run(gate, fixture);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
});

test("v2 gate detects index-byte drift with unchanged status, HEAD, and working file, then accepts exact restoration", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const trackedPath = path.join(fixture.linked, "tracked.txt");
  fs.writeFileSync(trackedPath, "index X\n");
  git(fixture.linked, "add", "tracked.txt");
  const indexX = git(fixture.linked, "rev-parse", ":tracked.txt");
  fs.writeFileSync(trackedPath, "working stable\n");
  const head = git(fixture.linked, "rev-parse", "HEAD");
  const status = execFileSync("git", ["status", "--porcelain=v1", "-z", "-uall"], { cwd: fixture.linked });
  const working = fs.readFileSync(trackedPath);
  assert.equal(run(writer, fixture).status, 0);
  const indexY = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: fixture.linked,
    input: "index Y\n",
    encoding: "utf8"
  }).trim();
  git(fixture.linked, "update-index", "--cacheinfo", `100644,${indexY},tracked.txt`);
  assert.equal(git(fixture.linked, "rev-parse", "HEAD"), head);
  assert.deepEqual(fs.readFileSync(trackedPath), working);
  assert.deepEqual(execFileSync("git", ["status", "--porcelain=v1", "-z", "-uall"], { cwd: fixture.linked }), status);
  const drifted = run(gate, fixture);
  assert.notEqual(drifted.status, 0);
  assert.match(`${drifted.stdout}\n${drifted.stderr}`, /index|fingerprint|snapshot|artifact/i);
  git(fixture.linked, "update-index", "--cacheinfo", `100644,${indexX},tracked.txt`);
  const restored = run(gate, fixture);
  assert.equal(restored.status, 0, restored.stderr || restored.stdout);
});

test("safe internal tracked symlinks preserve exact HEAD, index, and worktree targets through restoration", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  for (const name of ["target-head.txt", "target-index.txt", "target-worktree.txt"]) {
    fs.writeFileSync(path.join(fixture.linked, name), `${name}\n`);
  }
  const trackedPath = path.join(fixture.linked, "tracked.txt");
  fs.rmSync(trackedPath);
  fs.symlinkSync("target-head.txt", trackedPath);
  git(fixture.linked, "add", "tracked.txt", "target-head.txt", "target-index.txt", "target-worktree.txt");
  git(fixture.linked, "commit", "-m", "safe tracked symlink baseline");
  fs.rmSync(trackedPath);
  fs.symlinkSync("target-index.txt", trackedPath);
  git(fixture.linked, "add", "tracked.txt");
  fs.rmSync(trackedPath);
  fs.symlinkSync("target-worktree.txt", trackedPath);
  const written = run(writer, fixture);
  assert.equal(written.status, 0, written.stderr || written.stdout);
  const manifest = JSON.parse(fs.readFileSync(repositoryArchiveManifestPaths(fixture)[0], "utf8"));
  const artifacts = manifest.archivedWorktrees[0].artifacts;
  const artifactPath = (key) => path.join(fixture.evidenceRoot, artifacts[key].path);
  const restored = path.join(fixture.parent, "restored symlink clone");
  execFileSync("git", ["clone", "--no-local", fixture.repo, restored], { timeout: TEST_CHILD_TIMEOUT_MS });
  git(restored, "checkout", "-b", "feature/archive", "origin/feature/archive");
  execFileSync("git", ["apply", "--index", "--binary", artifactPath("indexPatch")], { cwd: restored, timeout: TEST_CHILD_TIMEOUT_MS });
  execFileSync("git", ["apply", "--binary", artifactPath("worktreePatch")], { cwd: restored, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.equal(git(restored, "show", ":tracked.txt"), "target-index.txt");
  assert.equal(fs.readlinkSync(path.join(restored, "tracked.txt")), "target-worktree.txt");
  for (const [key, args] of [
    ["indexInventory", ["ls-files", "--stage", "-z"]],
    ["indexPatch", ["diff", "--cached", "HEAD", "--binary", "--"]],
    ["worktreePatch", ["diff", "--binary", "--"]],
    ["trackedPatch", ["diff", "HEAD", "--binary", "--"]],
    ["statusInventory", ["status", "--porcelain=v1", "-z", "-uall"]]
  ]) {
    assert.deepEqual(execFileSync("git", args, { cwd: restored, timeout: TEST_CHILD_TIMEOUT_MS }), fs.readFileSync(artifactPath(key)));
  }
});

test("v2 gate binds companion manifests and all canonical Markdown bytes to the linked projection", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const archive = path.join(fixture.repo, "coordination", "release-intake", "archive");
  const linkedPath = path.join(archive, "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const cleanPath = path.join(archive, "2026-06-30-A25-clean-diverged-branch-archive-manifest.json");
  const dirtyPath = path.join(archive, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json");
  const originals = new Map([linkedPath, cleanPath, dirtyPath].map((item) => [item, fs.readFileSync(item)]));
  for (const [target, mutate, expected] of [
    [cleanPath, (value) => ({ ...value, dirtyMapStatusSignature: "stale-signature" }), /dirty-map|signature/i],
    [dirtyPath, (value) => ({ ...value, expandedStatusEntries: value.expandedStatusEntries + 1 }), /expanded|count/i],
    [cleanPath, (value) => ({ ...value, generatedAt: new Date(0).toISOString() }), /generated|timestamp|projection/i],
    [cleanPath, (value) => {
      const { generatedAt: _removed, ...withoutGeneratedAt } = value;
      return withoutGeneratedAt;
    }, /field|schema|canonical/i],
    [dirtyPath, (value) => ({ ...value, unexpected: true }), /field|schema|canonical/i]
  ]) {
    const original = originals.get(target);
    fs.writeFileSync(target, `${JSON.stringify(mutate(JSON.parse(original.toString("utf8"))), null, 2)}\n`);
    const result = run(gate, fixture);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, expected);
    fs.writeFileSync(target, original);
  }
  const markdownPaths = [
    "2026-06-30-A25-linked-worktree-archive-manifest.md",
    "2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md"
  ].map((name) => path.join(archive, name));
  for (const target of markdownPaths) {
    const original = fs.readFileSync(target);
    fs.writeFileSync(target, Buffer.from("replacement\n"));
    const result = run(gate, fixture);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Markdown.*(?:canonical|bytes|mismatch)/i);
    fs.writeFileSync(target, original);
  }
  const restored = run(gate, fixture);
  assert.equal(restored.status, 0, restored.stderr || restored.stdout);
});

test("v2 gate rejects a required descriptor removed from both manifests and its immutable set", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifestPath = path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const indexPath = path.join(fixture.evidenceRoot, "sets", manifest.archiveSetFingerprint, "archive-set.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const removed = manifest.archivedWorktrees[0].artifacts.trackedPatch;
  delete manifest.archivedWorktrees[0].artifacts.trackedPatch;
  delete index.entries[0].artifacts.trackedPatch;
  fs.rmSync(path.join(fixture.evidenceRoot, removed.path));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /required artifact|artifact (?:keys|schema)|trackedPatch/i);
});

test("v2 gate rejects an external marker symlink and noncanonical marker schema", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const markerPath = path.join(fixture.evidenceRoot, ".mais-evidence-root.json");
  const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  fs.writeFileSync(markerPath, `${JSON.stringify({ ...marker, schemaVersion: 99, extra: true })}\n`);
  let result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /marker.*(?:schema|field|invalid)/i);
  const outsideMarker = path.join(fixture.parent, "outside-marker.json");
  fs.renameSync(markerPath, outsideMarker);
  fs.writeFileSync(outsideMarker, `${JSON.stringify(marker)}\n`);
  fs.symlinkSync(outsideMarker, markerPath);
  result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /marker.*(?:symlink|regular|unsafe)/i);
});

test("current gate verifies restore inventory and rejects artifact tampering", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const clean = run(gate, fixture);
  assert.equal(clean.status, 0, clean.stderr || clean.stdout);
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json"), "utf8"));
  const setRoot = path.join(fixture.evidenceRoot, "sets", manifest.archiveSetFingerprint);
  fs.writeFileSync(path.join(setRoot, "unexpected.bin"), "unexpected");
  const unexpected = run(gate, fixture);
  assert.notEqual(unexpected.status, 0);
  assert.match(`${unexpected.stdout}\n${unexpected.stderr}`, /unexpected artifact/i);
  fs.rmSync(path.join(setRoot, "unexpected.bin"));
  assert.equal(run(gate, fixture).status, 0);
  const { sha256Buffer, verifyTarInventory } = await import(libraryUrl);
  const tarArtifact = manifest.archivedWorktrees[0].artifacts.untrackedTar;
  const tarPath = path.join(fixture.evidenceRoot, tarArtifact.path);
  const escapeName = `mais-evidence-escape-${crypto.randomUUID()}`;
  const maliciousTar = path.join(fixture.parent, "malicious.tar.gz");
  execFileSync("python3", ["-c", [
    "import io,sys,tarfile",
    "with tarfile.open(sys.argv[1], 'w:gz') as archive:",
    " data=b'escape'",
    " item=tarfile.TarInfo('../'+sys.argv[2])",
    " item.size=len(data)",
    " archive.addfile(item, io.BytesIO(data))"
  ].join("\n"), maliciousTar, escapeName], { timeout: TEST_CHILD_TIMEOUT_MS });
  fs.rmSync(tarPath);
  fs.copyFileSync(maliciousTar, tarPath);
  fs.chmodSync(tarPath, 0o600);
  const mismatchedTar = run(gate, fixture);
  assert.notEqual(mismatchedTar.status, 0);
  assert.match(`${mismatchedTar.stdout}\n${mismatchedTar.stderr}`, /tar.*(?:bytes|sha256)|(?:bytes|sha256).*tar/i);
  assert.equal(fs.existsSync(path.join(os.tmpdir(), escapeName)), false);
  const maliciousBuffer = fs.readFileSync(maliciousTar);
  const maliciousSha256 = sha256Buffer(maliciousBuffer);
  const maliciousBlobPath = path.join(
    fixture.evidenceRoot,
    "blobs",
    "sha256",
    maliciousSha256.slice(0, 2),
    maliciousSha256
  );
  fs.mkdirSync(path.dirname(maliciousBlobPath), { recursive: true });
  fs.writeFileSync(maliciousBlobPath, maliciousBuffer, { mode: 0o600 });
  fs.chmodSync(maliciousBlobPath, 0o600);
  fs.rmSync(tarPath);
  fs.linkSync(maliciousBlobPath, tarPath);
  const unsafeFailures = [];
  verifyTarInventory(fixture.evidenceRoot, {
    ...manifest.archivedWorktrees[0],
    artifacts: {
      ...manifest.archivedWorktrees[0].artifacts,
      untrackedTar: { ...tarArtifact, bytes: maliciousBuffer.length, sha256: maliciousSha256 }
    }
  }, unsafeFailures);
  assert.ok(unsafeFailures.some((failure) => /unsafe tar inventory/i.test(failure)));
  assert.equal(fs.existsSync(path.join(os.tmpdir(), escapeName)), false);
  const originalBlobPath = path.join(
    fixture.evidenceRoot,
    "blobs",
    "sha256",
    tarArtifact.sha256.slice(0, 2),
    tarArtifact.sha256
  );
  fs.rmSync(tarPath);
  fs.linkSync(originalBlobPath, tarPath);
  const restoredTar = run(gate, fixture);
  assert.equal(restoredTar.status, 0, restoredTar.stderr || restoredTar.stdout);
  const patchPath = path.join(fixture.evidenceRoot, manifest.archivedWorktrees[0].artifacts.trackedPatch.path);
  fs.appendFileSync(patchPath, "tamper");
  const tampered = run(gate, fixture);
  assert.notEqual(tampered.status, 0);
  assert.match(`${tampered.stdout}\n${tampered.stderr}`, /sha256|bytes|tamper/i);
});

test("tar verifier reports bounded infrastructure diagnostics instead of claiming archive corruption", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const entry = manifest.archivedWorktrees[0];
  const shimDirectory = path.join(fixture.parent, "failing-python");
  const shim = path.join(shimDirectory, "python3");
  const childDiagnostic = "fixture-sensitive-value";
  fs.mkdirSync(shimDirectory);
  fs.writeFileSync(shim, `#!/bin/sh
printf '${childDiagnostic}\\n' >&2
exit 75
`);
  fs.chmodSync(shim, 0o755);
  const { verifyTarInventory } = await import(libraryUrl);
  const failures = [];
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${shimDirectory}:${originalPath}`;
    verifyTarInventory(fixture.evidenceRoot, entry, failures);
  } finally {
    process.env.PATH = originalPath;
  }
  assert.equal(failures.length, 1);
  assert.match(failures[0], /tar listing verifier infrastructure failure/i);
  assert.match(failures[0], /status[=: ]+75/i);
  assert.match(failures[0], /stderrBytes=[1-9][0-9]*/i);
  assert.match(failures[0], /stderrSha256=[0-9a-f]{64}/i);
  assert.doesNotMatch(failures[0], /fixture-sensitive-value/i);
  assert.ok(Buffer.byteLength(failures[0]) < 2_048);
});

test("tar inventory verification uses one held descriptor without copying the archive through stdin", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const entry = manifest.archivedWorktrees[0];
  const realPython = execFileSync("which", ["python3"], { encoding: "utf8" }).trim();
  const shimDirectory = path.join(fixture.parent, "path-python");
  const shim = path.join(shimDirectory, "python3");
  fs.mkdirSync(shimDirectory);
  fs.writeFileSync(shim, `#!/bin/sh
first_byte=$(dd bs=1 count=1 2>/dev/null | od -An -tx1 | tr -d ' ')
if [ -n "$first_byte" ]; then
  printf 'tar verifier received archive bytes on stdin\\n' >&2
  exit 76
fi
if [ "$#" -lt 3 ] || [ ! -f "$3" ]; then
  printf 'tar verifier did not receive an archive path\\n' >&2
  exit 77
fi
case "$3" in
  /dev/fd/[0-9]*) ;;
  *)
    printf 'tar verifier did not receive a held descriptor path\\n' >&2
    exit 78
    ;;
esac
exec "$REAL_PYTHON" "$@"
`);
  fs.chmodSync(shim, 0o755);
  const { verifyTarInventory } = await import(libraryUrl);
  const failures = [];
  const originalPath = process.env.PATH;
  const originalRealPython = process.env.REAL_PYTHON;
  try {
    process.env.PATH = `${shimDirectory}:${originalPath}`;
    process.env.REAL_PYTHON = realPython;
    verifyTarInventory(fixture.evidenceRoot, entry, failures);
  } finally {
    process.env.PATH = originalPath;
    if (originalRealPython === undefined) delete process.env.REAL_PYTHON;
    else process.env.REAL_PYTHON = originalRealPython;
  }
  assert.deepEqual(failures, []);
});

test("tar inventory verification rejects pathname ABA without reading the swapped payload", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const entry = manifest.archivedWorktrees[0];
  const tarPath = path.join(fixture.evidenceRoot, entry.artifacts.untrackedTar.path);
  const blobPath = path.join(
    fixture.evidenceRoot,
    "blobs",
    "sha256",
    entry.artifacts.untrackedTar.sha256.slice(0, 2),
    entry.artifacts.untrackedTar.sha256
  );
  const replacement = path.join(fixture.parent, "different-unreadable.tar.gz");
  fs.writeFileSync(replacement, "this is deliberately not the attested gzip payload\n");
  fs.chmodSync(replacement, 0o600);
  const realPython = execFileSync("which", ["python3"], { encoding: "utf8" }).trim();
  const shimDirectory = path.join(fixture.parent, "aba-python");
  const shim = path.join(shimDirectory, "python3");
  fs.mkdirSync(shimDirectory);
  fs.writeFileSync(shim, `#!/bin/sh
rm -f "$ACTIVE_TAR"
cp "$REPLACEMENT_TAR" "$ACTIVE_TAR"
chmod 600 "$ACTIVE_TAR"
"$REAL_PYTHON" "$@"
status=$?
rm -f "$ACTIVE_TAR"
ln "$BLOB_TAR" "$ACTIVE_TAR"
exit "$status"
`);
  fs.chmodSync(shim, 0o755);
  const { verifyTarInventory } = await import(libraryUrl);
  const failures = [];
  const originalEnvironment = {
    ACTIVE_TAR: process.env.ACTIVE_TAR,
    BLOB_TAR: process.env.BLOB_TAR,
    PATH: process.env.PATH,
    REAL_PYTHON: process.env.REAL_PYTHON,
    REPLACEMENT_TAR: process.env.REPLACEMENT_TAR
  };
  try {
    process.env.ACTIVE_TAR = tarPath;
    process.env.BLOB_TAR = blobPath;
    process.env.PATH = `${shimDirectory}:${originalEnvironment.PATH}`;
    process.env.REAL_PYTHON = realPython;
    process.env.REPLACEMENT_TAR = replacement;
    verifyTarInventory(fixture.evidenceRoot, entry, failures);
  } finally {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  assert.ok(failures.some((failure) => /changed during verification|path binding/i.test(failure)), failures.join("\n"));
  assert.ok(failures.every((failure) => !/gzip\/tar archive is unreadable/i.test(failure)), failures.join("\n"));
});

test("tar inventory verification rejects a byte-identical artifact that is no longer the CAS hardlink", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const entry = manifest.archivedWorktrees[0];
  const tarPath = path.join(fixture.evidenceRoot, entry.artifacts.untrackedTar.path);
  const replacement = path.join(fixture.parent, "byte-identical.tar.gz");
  fs.copyFileSync(tarPath, replacement);
  fs.rmSync(tarPath);
  fs.copyFileSync(replacement, tarPath);
  fs.chmodSync(tarPath, 0o600);
  const { verifyTarInventory } = await import(libraryUrl);
  const failures = [];
  verifyTarInventory(fixture.evidenceRoot, entry, failures);
  assert.ok(failures.some((failure) => /content-addressed hardlink/i.test(failure)), failures.join("\n"));
});

test("writer blocks secret content with redacted output and accepts placeholders", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const token = githubTokenFixture("Z".repeat(36));
  fs.writeFileSync(path.join(fixture.linked, "config.txt"), `TOKEN=${token}\n`);
  const blocked = run(writer, fixture);
  assert.notEqual(blocked.status, 0);
  assert.match(`${blocked.stdout}\n${blocked.stderr}`, /secret|token/i);
  assert.doesNotMatch(`${blocked.stdout}\n${blocked.stderr}`, new RegExp(token));
  fs.writeFileSync(path.join(fixture.linked, "config.txt"), "TOKEN=<placeholder>\n");
  const accepted = run(writer, fixture);
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
});

test("writer rejects secret-looking paths and unreviewed binaries", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, ".env.production"), "placeholder=true\n");
  let blocked = run(writer, fixture);
  assert.notEqual(blocked.status, 0);
  assert.match(`${blocked.stdout}\n${blocked.stderr}`, /secret-looking path/i);
  fs.rmSync(path.join(fixture.linked, ".env.production"));
  fs.writeFileSync(path.join(fixture.linked, "opaque.bin"), Buffer.from([0, 1, 2, 3]));
  blocked = run(writer, fixture);
  assert.notEqual(blocked.status, 0);
  assert.match(`${blocked.stdout}\n${blocked.stderr}`, /unreviewed binary/i);
});

test("current gate accepts unchanged complete legacy v1 evidence read-only", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeLegacyV1Evidence(fixture);
  const result = run(gate, fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("legacy v1 gate rejects tracked content and patch drift with unchanged HEAD", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeLegacyV1Evidence(fixture);
  fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "drift\n");
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /patch|status|drift|stale/i);
});

test("legacy v1 gate rejects untracked inventory drift", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeLegacyV1Evidence(fixture);
  fs.writeFileSync(path.join(fixture.linked, "legacy-untracked.txt"), "changed payload\n");
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /inventory|tar|restore|drift/i);
});

test("legacy v1 gate rejects status-path drift", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeLegacyV1Evidence(fixture);
  fs.writeFileSync(path.join(fixture.linked, "new-untracked.txt"), "new\n");
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /status|untracked|entries|drift/i);
});

test("legacy v1 gate rejects stale dirty-map signature", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  writeLegacyV1Evidence(fixture);
  const dirtyMapPath = path.join(fixture.repo, "coordination", "release-intake", "latest-A25-dirty-tree-map.json");
  const dirtyMap = JSON.parse(fs.readFileSync(dirtyMapPath, "utf8"));
  dirtyMap.statusSignature = "stale-signature";
  fs.writeFileSync(dirtyMapPath, `${JSON.stringify(dirtyMap, null, 2)}\n`);
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /dirty-map.*signature|stale/i);
});

test("legacy v1 gate rejects tampered artifact bytes", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const legacy = writeLegacyV1Evidence(fixture);
  fs.appendFileSync(`${legacy.prefix}.patch`, "tamper\n");
  const result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /patch.*(?:bytes|sha256|mismatch)|tamper/i);
});

test("legacy v1 gate validates divergent branch patches and rejects their tampering", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "committed branch delta\n");
  git(fixture.linked, "add", "tracked.txt");
  git(fixture.linked, "commit", "-m", "branch delta");
  const legacy = writeLegacyV1Evidence(fixture);
  assert.ok(legacy.dirtyCompanion);
  const valid = run(gate, fixture);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  fs.appendFileSync(path.join(fixture.repo, legacy.dirtyCompanion.patch), "tamper\n");
  const tampered = run(gate, fixture);
  assert.notEqual(tampered.status, 0);
  assert.match(`${tampered.stdout}\n${tampered.stderr}`, /branch patch.*(?:bytes|sha256|mismatch)/i);
});

test("legacy v1 gate rejects noncanonical companion metadata field and reference tampering", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "committed branch delta\n");
  git(fixture.linked, "add", "tracked.txt");
  git(fixture.linked, "commit", "-m", "branch delta");
  const legacy = writeLegacyV1Evidence(fixture);
  const metadataPath = path.join(fixture.repo, legacy.dirtyCompanion.metadata);
  const original = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  for (const mutate of [
    (value) => { value.statusEntries += 1; },
    (value) => { value.patchSha256 = "0".repeat(64); },
    (value) => { value.patch = value.status; }
  ]) {
    const tampered = structuredClone(original);
    mutate(tampered);
    fs.writeFileSync(metadataPath, `${JSON.stringify(tampered, null, 2)}\n`);
    const result = run(gate, fixture);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /metadata.*(?:canonical|integrity|mismatch|invalid)/i);
  }
});

test("legacy v1 gate fails closed on missing integrity fields and staged index state", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const legacy = writeLegacyV1Evidence(fixture);
  const linkedPath = path.join(legacy.archive, "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const linked = JSON.parse(fs.readFileSync(linkedPath, "utf8"));
  delete linked.archivedWorktrees[0].patchSha256;
  fs.writeFileSync(linkedPath, `${JSON.stringify(linked, null, 2)}\n`);
  let result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /patch sha256 mismatch/i);
  writeLegacyV1Evidence(fixture);
  git(fixture.linked, "add", "tracked.txt");
  result = run(gate, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /staged|index.*refresh to v2/i);
});

test("writer rejects a deleted tracked binary secret without printing the secret", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const token = providerTokenFixture("D".repeat(42));
  const binaryPath = path.join(fixture.linked, "tracked-secret.png");
  fs.writeFileSync(binaryPath, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0]),
    Buffer.from(token)
  ]));
  git(fixture.linked, "add", "tracked-secret.png");
  git(fixture.linked, "commit", "-m", "fixture binary");
  fs.rmSync(binaryPath);
  const result = run(writer, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /secret|token|binary/i);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(token));
});

test("writer fully scans a current real patch file instead of treating it as aggregate evidence", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const secret = "C".repeat(40);
  fs.writeFileSync(path.join(fixture.linked, "evidence.patch"), `PASSWORD=${secret}\n`);
  const result = run(writer, fixture);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /evidence\.patch.*token assignment/i);
  assert.doesNotMatch(output, new RegExp(secret));
});

test("writer fully scans a deleted real patch file from historical blobs", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const secret = "V".repeat(40);
  const deletedPath = path.join(fixture.linked, "evidence.patch");
  fs.writeFileSync(deletedPath, `PASSWORD=${secret}\n`);
  git(fixture.linked, "add", "evidence.patch");
  git(fixture.linked, "commit", "-m", "fixture historical patch");
  fs.rmSync(deletedPath);
  const result = run(writer, fixture);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /(?:historical|index-before-worktree)\/evidence\.patch.*token assignment/i);
  assert.doesNotMatch(output, new RegExp(secret));
});

test("writer scans the old historical path of an R096 staged rename", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const secret = "R".repeat(40);
  const oldPath = path.join(fixture.linked, "old-config.ts");
  const newPath = path.join(fixture.linked, "新\nconfig.ts");
  const lines = [
    `export const config = { password: "${secret}" };`,
    ...Array.from({ length: 80 }, (_, index) => `export const filler${index} = ${index};`)
  ];
  fs.writeFileSync(oldPath, `${lines.join("\n")}\n`);
  git(fixture.linked, "add", "old-config.ts");
  git(fixture.linked, "commit", "-m", "fixture old config");
  git(fixture.linked, "mv", "old-config.ts", "新\nconfig.ts");
  lines[0] = "export const config = { password: process.env.DASHBOARD_SMOKE_PASSWORD };";
  fs.writeFileSync(newPath, `${lines.join("\n")}\n`);
  git(fixture.linked, "add", "新\nconfig.ts");
  const nameStatus = git(fixture.linked, "diff", "--name-status", "--find-renames", "HEAD", "--");
  assert.match(nameStatus, /^R096\s/u);
  const result = run(writer, fixture);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /(?:historical|head-before-index)\/old-config\.ts.*token assignment/i);
  assert.doesNotMatch(output, new RegExp(secret));
});

test("writer scans the historical source of a staged copy detected with NUL-safe copy metadata", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const secret = "C".repeat(40);
  const sourcePath = path.join(fixture.linked, "copy-source.ts");
  const targetPath = path.join(fixture.linked, "复制\n目标.ts");
  const lines = [
    `export const config = { password: "${secret}" };`,
    ...Array.from({ length: 80 }, (_, index) => `export const copyFiller${index} = ${index};`)
  ];
  fs.writeFileSync(sourcePath, `${lines.join("\n")}\n`);
  git(fixture.linked, "add", "copy-source.ts");
  git(fixture.linked, "commit", "-m", "fixture copy source");
  lines[0] = "export const config = { password: process.env.DASHBOARD_SMOKE_PASSWORD };";
  fs.writeFileSync(targetPath, `${lines.join("\n")}\n`);
  git(fixture.linked, "add", "复制\n目标.ts");
  const nameStatus = git(fixture.linked, "diff", "--cached", "--name-status", "--find-copies-harder", "HEAD", "--");
  assert.match(nameStatus, /^C09[0-9]\s/u);
  const result = run(writer, fixture);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /head-before-index\/copy-source\.ts.*token assignment/i);
  assert.doesNotMatch(output, new RegExp(secret));
});

test("manifest transaction rolls back every file after a mid-publish rename failure", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { publishManifestTransaction } = await import(libraryUrl);
  const archiveDir = path.join(fixture.parent, "transaction");
  fs.mkdirSync(archiveDir);
  const files = Array.from({ length: 6 }, (_, index) => ({
    path: path.join(archiveDir, `manifest-${index}.json`),
    content: `new-${index}\n`
  }));
  for (let index = 0; index < files.length; index += 1) fs.writeFileSync(files[index].path, `old-${index}\n`);
  let publishRenames = 0;
  assert.throws(() => publishManifestTransaction({
    archiveDir,
    files,
    beforePublish: () => {},
    renameFile: (from, to, phase) => {
      if (phase === "publish" && ++publishRenames === 3) throw new Error("simulated rename failure");
      fs.renameSync(from, to);
    }
  }), /simulated rename failure/i);
  for (let index = 0; index < files.length; index += 1) assert.equal(fs.readFileSync(files[index].path, "utf8"), `old-${index}\n`);
  assert.deepEqual(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")), []);
});

test("manifest transaction preserves a durable journal after publish and rollback both fail, then recovers all six files", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { publishManifestTransaction, recoverManifestTransactions } = await import(libraryUrl);
  const archiveDir = path.join(fixture.parent, "transaction-double-failure");
  fs.mkdirSync(archiveDir);
  const files = Array.from({ length: 6 }, (_, index) => ({ path: path.join(archiveDir, `manifest-${index}.json`), content: `new-${index}\n` }));
  for (let index = 0; index < files.length; index += 1) fs.writeFileSync(files[index].path, `old-${index}\n`);
  let publishRenames = 0;
  assert.throws(() => publishManifestTransaction({
    archiveDir,
    files,
    beforePublish: () => {},
    renameFile: (from, to, phase) => {
      if (phase === "publish" && ++publishRenames === 3) throw new Error("simulated publish failure");
      if (phase === "rollback") throw new Error("simulated rollback failure");
      fs.renameSync(from, to);
    }
  }), /rollback was incomplete|recovery evidence preserved/i);
  const recoveryDirectories = fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-"));
  assert.equal(recoveryDirectories.length, 1);
  const recoveryDirectory = path.join(archiveDir, recoveryDirectories[0]);
  assert.ok(fs.existsSync(path.join(recoveryDirectory, "journal.json")));
  assert.ok(fs.readdirSync(path.join(recoveryDirectory, "backups")).length > 0);
  recoverManifestTransactions({ archiveDir });
  for (let index = 0; index < files.length; index += 1) assert.equal(fs.readFileSync(files[index].path, "utf8"), `old-${index}\n`);
  assert.deepEqual(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")), []);
});

test("manifest startup recovery handles crashes in both backup and publish windows", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { recoverManifestTransactions } = await import(libraryUrl);
  for (const crashPhase of ["backup", "publish"]) {
    const archiveDir = path.join(fixture.parent, `transaction-crash-${crashPhase}`);
    fs.mkdirSync(archiveDir);
    const files = Array.from({ length: 6 }, (_, index) => ({ path: path.join(archiveDir, `manifest-${index}.json`), content: `new-${index}\n` }));
    for (let index = 0; index < files.length; index += 1) fs.writeFileSync(files[index].path, `old-${index}\n`);
    const childScript = [
      `import { publishManifestTransaction } from ${JSON.stringify(libraryUrl)};`,
      "import fs from 'node:fs';",
      `const archiveDir=${JSON.stringify(archiveDir)};`,
      "const files=Array.from({length:6},(_,index)=>({path:`${archiveDir}/manifest-${index}.json`,content:`new-${index}\\n`}));",
      "let count=0;",
      `publishManifestTransaction({archiveDir,files,beforePublish:()=>{},renameFile:(from,to,phase)=>{if(phase===${JSON.stringify(crashPhase)}&&++count===2)process.kill(process.pid,'SIGKILL');fs.renameSync(from,to);}});`
    ].join("\n");
    const crashed = spawnSync(process.execPath, ["--input-type=module", "-e", childScript], { timeout: TEST_CHILD_TIMEOUT_MS });
    assert.equal(crashed.signal, "SIGKILL");
    assert.equal(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")).length, 1);
    recoverManifestTransactions({ archiveDir });
    for (let index = 0; index < files.length; index += 1) assert.equal(fs.readFileSync(files[index].path, "utf8"), `old-${index}\n`);
  }
});

test("committed manifest cleanup resumes after partial backup deletion and the journal-unlink window", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { publishManifestTransaction, recoverManifestTransactions } = await import(libraryUrl);
  for (const failurePoint of ["second-backup", "after-journal-unlink"]) {
    const archiveDir = path.join(fixture.parent, `transaction-committed-${failurePoint}`);
    fs.mkdirSync(archiveDir);
    const files = Array.from({ length: 6 }, (_, index) => ({ path: path.join(archiveDir, `manifest-${index}.json`), content: `new-${index}\n` }));
    for (let index = 0; index < files.length; index += 1) fs.writeFileSync(files[index].path, `old-${index}\n`);
    let removedBackups = 0;
    assert.throws(() => publishManifestTransaction({
      archiveDir,
      files,
      beforePublish: () => {},
      cleanupStep: (step) => {
        if (failurePoint === "second-backup" && step === "after-backup-unlink" && ++removedBackups === 2) throw new Error("cleanup interrupted after backup unlink");
        if (failurePoint === "after-journal-unlink" && step === "after-journal-unlink") throw new Error("cleanup interrupted after journal unlink");
      }
    }), /cleanup interrupted/i);
    assert.equal(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")).length, 1);
    recoverManifestTransactions({ archiveDir });
    for (let index = 0; index < files.length; index += 1) assert.equal(fs.readFileSync(files[index].path, "utf8"), `new-${index}\n`);
    assert.deepEqual(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")), []);
  }
});

test("lock-health loss preserves recovery evidence and only the next healthy writer rolls back", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { publishManifestTransaction, recoverManifestTransactions } = await import(libraryUrl);
  for (const lossPoint of ["before-publish", "mid-publish"]) {
    const archiveDir = path.join(fixture.parent, `transaction-lock-loss-${lossPoint}`);
    fs.mkdirSync(archiveDir);
    const files = Array.from({ length: 6 }, (_, index) => ({ path: path.join(archiveDir, `manifest-${index}.json`), content: `new-${index}\n` }));
    for (let index = 0; index < files.length; index += 1) fs.writeFileSync(files[index].path, `old-${index}\n`);
    let healthy = true;
    let publishRenames = 0;
    assert.throws(() => publishManifestTransaction({
      archiveDir,
      files,
      assertLockHealthy: () => {
        if (!healthy) throw new Error("simulated lock owner loss");
      },
      beforePublish: () => {
        if (lossPoint === "before-publish") healthy = false;
      },
      renameFile: (from, to, phase) => {
        fs.renameSync(from, to);
        if (lossPoint === "mid-publish" && phase === "publish" && ++publishRenames === 1) healthy = false;
      }
    }), /lock loss|lock owner loss|next exclusive writer/i);
    assert.equal(publishRenames, lossPoint === "mid-publish" ? 1 : 0);
    assert.equal(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")).length, 1);
    recoverManifestTransactions({ archiveDir, assertLockHealthy: () => {} });
    for (let index = 0; index < files.length; index += 1) assert.equal(fs.readFileSync(files[index].path, "utf8"), `old-${index}\n`);
    assert.deepEqual(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")), []);
  }
});

test("a real lock-losing writer stops mutating while a second F_WRLCK owner exclusively recovers", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const archiveDir = path.join(fixture.parent, "real-lock-loss-race");
  fs.mkdirSync(archiveDir);
  for (let index = 0; index < 6; index += 1) fs.writeFileSync(path.join(archiveDir, `manifest-${index}.json`), `old-${index}\n`);
  const signal = path.join(fixture.parent, "a-released-lock");
  const commonDir = path.join(fixture.repo, ".git");
  const aScript = path.join(fixture.parent, "writer-a.mjs");
  const bScript = path.join(fixture.parent, "writer-b.mjs");
  const bootstrap = (body) => [
    "import fs from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    `import { assertEvidenceWriterLockOwned, publishManifestTransaction, recoverManifestTransactions, runEvidenceWriterUnderLock } from ${JSON.stringify(libraryUrl)};`,
    "const [commonDir,archiveDir,signal]=process.argv.slice(2);",
    "const assertLockHealthy=()=>assertEvidenceWriterLockOwned({commonDir});",
    "try { assertLockHealthy(); } catch {",
    "  try { runEvidenceWriterUnderLock({commonDir,scriptPath:fileURLToPath(import.meta.url),args:process.argv.slice(2)}); process.exit(0); }",
    "  catch(error) { console.error(error.message); process.exit(17); }",
    "}",
    body
  ].join("\n");
  fs.writeFileSync(aScript, bootstrap([
    "const files=Array.from({length:6},(_,index)=>({path:`${archiveDir}/manifest-${index}.json`,content:`new-${index}\\n`}));",
    "let published=0;",
    "try {",
    " publishManifestTransaction({archiveDir,files,beforePublish:()=>{},assertLockHealthy,renameFile:(from,to,phase)=>{",
    "  fs.renameSync(from,to);",
    "  if(phase==='publish' && ++published===1){fs.closeSync(3);fs.writeFileSync(signal,'released\\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);}",
    " }});",
    " process.exit(0);",
    "} catch(error) { console.error(error.message); process.exit(17); }"
  ].join("\n")));
  fs.writeFileSync(bScript, bootstrap("recoverManifestTransactions({archiveDir,assertLockHealthy});"));
  const a = spawn(process.execPath, [aScript, commonDir, archiveDir, signal], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let aStdout = "";
  let aStderr = "";
  a.stdout.on("data", (chunk) => { aStdout += chunk; });
  a.stderr.on("data", (chunk) => { aStderr += chunk; });
  const terminateA = () => {
    if (a.exitCode !== null) return;
    try { process.kill(-a.pid, "SIGKILL"); } catch { a.kill("SIGKILL"); }
  };
  t.after(terminateA);
  const aTimeout = setTimeout(terminateA, TEST_CHILD_TIMEOUT_MS);
  await waitForPath(signal);
  const b = spawnSync(process.execPath, [bScript, commonDir, archiveDir, signal], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const aResult = await new Promise((resolve) => a.once("close", (status, childSignal) => {
    clearTimeout(aTimeout);
    resolve({ status, signal: childSignal, stdout: aStdout, stderr: aStderr });
  }));
  assert.equal(b.status, 0, b.stderr || b.stdout);
  assert.equal(aResult.status, 17, aResult.stderr || aResult.stdout);
  for (let index = 0; index < 6; index += 1) assert.equal(fs.readFileSync(path.join(archiveDir, `manifest-${index}.json`), "utf8"), `old-${index}\n`);
  assert.deepEqual(fs.readdirSync(archiveDir).filter((name) => name.startsWith(".evidence-publish-")), []);
});

function writeLockedEvidenceWriterProbe(scriptPath) {
  fs.writeFileSync(scriptPath, [
    "import fs from 'node:fs';",
    `import { assertEvidenceWriterLockOwned } from ${JSON.stringify(libraryUrl)};`,
    "const [commonDir,delayText,marker]=process.argv.slice(2);",
    "assertEvidenceWriterLockOwned({commonDir});",
    "const delayMs=Number(delayText);",
    "if(delayMs>0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,delayMs);",
    "if(marker!=='-') fs.writeFileSync(marker,'completed\\n');"
  ].join("\n"));
}

test("locked evidence writer has no default full-run timeout", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const scriptPath = path.join(fixture.parent, "default-timeout-writer.mjs");
  const marker = path.join(fixture.parent, "default-timeout-completed");
  writeLockedEvidenceWriterProbe(scriptPath);
  const { runEvidenceWriterUnderLock } = await import(libraryUrl);
  assert.doesNotThrow(() => runEvidenceWriterUnderLock({
    commonDir,
    scriptPath,
    args: [commonDir, "125", marker]
  }));
  assert.equal(fs.readFileSync(marker, "utf8"), "completed\n");
});

test("locked evidence writer classifies an explicit full-run timeout", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const scriptPath = path.join(fixture.parent, "explicit-timeout-writer.mjs");
  writeLockedEvidenceWriterProbe(scriptPath);
  const { runEvidenceWriterUnderLock } = await import(libraryUrl);
  assert.throws(() => runEvidenceWriterUnderLock({
    commonDir,
    scriptPath,
    args: [commonDir, "250", "-"],
    timeoutMs: 25
  }), /locked evidence writer exceeded configured full-run timeout/i);
});

test("locked evidence writer timeout releases the lock for a later writer", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const scriptPath = path.join(fixture.parent, "timeout-reacquire-writer.mjs");
  const marker = path.join(fixture.parent, "timeout-reacquired");
  writeLockedEvidenceWriterProbe(scriptPath);
  const { runEvidenceWriterUnderLock } = await import(libraryUrl);
  assert.throws(() => runEvidenceWriterUnderLock({
    commonDir,
    scriptPath,
    args: [commonDir, "250", "-"],
    timeoutMs: 25
  }), /locked evidence writer exceeded configured full-run timeout/i);
  assert.doesNotThrow(() => runEvidenceWriterUnderLock({
    commonDir,
    scriptPath,
    args: [commonDir, "0", marker]
  }));
  assert.equal(fs.readFileSync(marker, "utf8"), "completed\n");
});

test("locked evidence writer rejects invalid explicit full-run timeouts", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const scriptPath = path.join(fixture.parent, "invalid-timeout-writer.mjs");
  writeLockedEvidenceWriterProbe(scriptPath);
  const { runEvidenceWriterUnderLock } = await import(libraryUrl);
  for (const timeoutMs of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.POSITIVE_INFINITY]) {
    assert.throws(() => runEvidenceWriterUnderLock({
      commonDir,
      scriptPath,
      args: [commonDir, "0", "-"],
      timeoutMs
    }), /configured full-run timeout must be a positive safe integer/i);
  }
});

test("advisory writer locking fails closed when the system lock utility is unavailable", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { runEvidenceWriterUnderLock } = await import(libraryUrl);
  assert.throws(() => runEvidenceWriterUnderLock({
    commonDir: path.join(fixture.repo, ".git"),
    scriptPath: writer,
    pythonPath: path.join(fixture.parent, "missing-python")
  }), /advisory lock.*missing|fails closed/i);
});

test("advisory writer locking refuses a symlink lock target", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const target = path.join(fixture.parent, "foreign-lock-target");
  fs.writeFileSync(target, "foreign\n");
  fs.symlinkSync(target, path.join(fixture.repo, ".git", "mais-evidence-writer.lock"));
  const result = run(writer, fixture);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /symlink|ELOOP|too many levels/i);
  assert.equal(fs.readFileSync(target, "utf8"), "foreign\n");
});

test("old worker flags, environment, and FD cannot bypass an active writer lock", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const commonDir = path.join(fixture.repo, ".git");
  const lockPath = path.join(commonDir, "mais-evidence-writer.lock");
  fs.closeSync(fs.openSync(lockPath, "a", 0o600));
  const holderSource = [
    "import fcntl,os,sys",
    "fd=os.open(sys.argv[1],os.O_RDWR|os.O_NOFOLLOW)",
    "fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)",
    "print('READY',flush=True)",
    "sys.stdin.read()"
  ].join("\n");
  const holder = spawn("/usr/bin/python3", ["-c", holderSource, lockPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  t.after(() => {
    if (holder.exitCode === null) holder.kill("SIGKILL");
  });
  let ready = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("holder READY timeout")), 5000);
    holder.stdout.on("data", (chunk) => {
      ready += chunk;
      if (ready === "READY\n") {
        clearTimeout(timeout);
        resolve();
      }
    });
    holder.once("exit", (status) => reject(new Error(`holder exited before READY: ${status}`)));
  });
  const token = crypto.randomUUID();
  const descriptor = fs.openSync(lockPath, "r+");
  let result;
  try {
    result = spawnSync(process.execPath, [writer, "--evidence-lock-held", token, "--evidence-lock-fd", "4", "--json"], {
      cwd: fixture.repo,
      env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, MAIS_EVIDENCE_LOCK_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe", "ignore", descriptor],
      encoding: "utf8",
      timeout: TEST_CHILD_TIMEOUT_MS
    });
  } finally {
    fs.closeSync(descriptor);
  }
  holder.stdin.end();
  await new Promise((resolve) => holder.once("close", resolve));
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /lock|writer.*active|concurrent/i);
});

test("portable owner proof rejects a read lock owned by the current Node process", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const lockPath = path.join(commonDir, "mais-evidence-writer.lock");
  const proofScript = path.join(fixture.parent, "read-lock-proof.mjs");
  fs.writeFileSync(proofScript, [
    `import { assertEvidenceWriterLockOwned } from ${JSON.stringify(libraryUrl)};`,
    "try { assertEvidenceWriterLockOwned({ commonDir: process.argv[2] }); }",
    "catch (error) { console.error(error.message); process.exit(1); }"
  ].join("\n"));
  const launcher = [
    "import fcntl,os,sys",
    "lock_path,node_path,script_path,common_dir=sys.argv[1:]",
    "fd=os.open(lock_path,os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)",
    "fcntl.flock(fd,fcntl.LOCK_SH|fcntl.LOCK_NB)",
    "os.dup2(fd,3,inheritable=True)",
    "os.set_inheritable(3,True)",
    "fd != 3 and os.close(fd)",
    "os.execv(node_path,[node_path,script_path,common_dir])"
  ].join("\n");
  const result = spawnSync("/usr/bin/python3", ["-c", launcher, lockPath, process.execPath, proofScript, commonDir], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /F_WRLCK|owner probe failed|write lock/i);
});

test("owner proof rejects a plain inherited descriptor while another process owns the exclusive lock", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const lockPath = path.join(commonDir, "mais-evidence-writer.lock");
  fs.closeSync(fs.openSync(lockPath, "a", 0o600));
  const proofScript = path.join(fixture.parent, "foreign-owner-proof.mjs");
  fs.writeFileSync(proofScript, [
    `import { assertEvidenceWriterLockOwned } from ${JSON.stringify(libraryUrl)};`,
    "try { assertEvidenceWriterLockOwned({ commonDir: process.argv[2] }); }",
    "catch (error) { console.error(error.message); process.exit(1); }"
  ].join("\n"));
  const holderSource = [
    "import fcntl,os,sys",
    "fd=os.open(sys.argv[1],os.O_RDWR|os.O_NOFOLLOW)",
    "fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)",
    "print('READY',flush=True)",
    "sys.stdin.read()"
  ].join("\n");
  const holder = spawn("/usr/bin/python3", ["-c", holderSource, lockPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  t.after(() => {
    if (holder.exitCode === null) holder.kill("SIGKILL");
  });
  let ready = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("foreign lock holder READY timeout")), 5_000);
    holder.stdout.on("data", (chunk) => {
      ready += chunk;
      if (ready === "READY\n") {
        clearTimeout(timeout);
        resolve();
      }
    });
    holder.once("exit", (status) => reject(new Error(`foreign lock holder exited before READY: ${status}`)));
  });
  const plainDescriptor = fs.openSync(lockPath, "r+");
  let result;
  try {
    result = spawnSync(process.execPath, [proofScript, commonDir], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe", plainDescriptor],
      timeout: TEST_CHILD_TIMEOUT_MS
    });
  } finally {
    fs.closeSync(plainDescriptor);
    holder.stdin.end();
  }
  await new Promise((resolve) => holder.once("close", resolve));
  assert.notEqual(result.status, 0, "a same-inode descriptor without ownership must be rejected");
  assert.match(`${result.stdout}\n${result.stderr}`, /owner probe failed|exclusive lock|writer lock/i);
});

test("exclusive writer lock rejects a concurrent writer", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const bin = path.join(fixture.parent, "lock-bin");
  fs.mkdirSync(bin);
  const signal = path.join(fixture.parent, "writer-holds-lock");
  const release = path.join(fixture.parent, "release-writer");
  const once = path.join(fixture.parent, "block-once");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *copy,gzip*)\n    if mkdir "$BLOCK_ONCE" 2>/dev/null; then\n      : > "$LOCK_SIGNAL"\n      while [ ! -e "$LOCK_RELEASE" ]; do sleep 0.02; done\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const env = { PATH: `${bin}:${process.env.PATH}`, BLOCK_ONCE: once, LOCK_SIGNAL: signal, LOCK_RELEASE: release };
  const first = runAsync(writer, fixture, env);
  t.after(first.terminate);
  await waitForPath(signal, TEST_CHILD_TIMEOUT_MS);
  const second = run(writer, fixture, env);
  const third = run(writer, fixture, env);
  fs.writeFileSync(release, "release\n");
  const firstResult = await first.completed;
  assert.notEqual(second.status, 0);
  assert.notEqual(third.status, 0);
  assert.match(`${second.stdout}\n${second.stderr}`, /lock|writer.*active|concurrent/i);
  assert.match(`${third.stdout}\n${third.stderr}`, /lock|writer.*active|concurrent/i);
  assert.equal(firstResult.status, 0, firstResult.stderr || firstResult.stdout);
});

test("currentness gate refuses to start while the evidence writer lock is held", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const archived = run(writer, fixture);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  const current = run(gate, fixture);
  assert.equal(current.status, 0, current.stderr || current.stdout);
  const manifestBytes = new Map(repositoryArchiveManifestPaths(fixture).map((absolutePath) => (
    [absolutePath, fs.readFileSync(absolutePath)]
  )));
  const reportPath = path.join(
    fixture.evidenceRoot,
    "reports",
    "latest-A25-linked-worktree-archive-evidence-current-gate.json"
  );
  const reportBytes = fs.readFileSync(reportPath);
  const commonDir = path.join(fixture.repo, ".git");
  const lockPath = path.join(commonDir, "mais-evidence-writer.lock");
  fs.closeSync(fs.openSync(lockPath, "a", 0o600));
  const holderSource = [
    "import fcntl,os,sys",
    "fd=os.open(sys.argv[1],os.O_RDWR|os.O_NOFOLLOW)",
    "fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)",
    "print('READY',flush=True)",
    "sys.stdin.read()"
  ].join("\n");
  const holder = spawn("/usr/bin/python3", ["-c", holderSource, lockPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  t.after(() => {
    if (holder.exitCode === null) holder.kill("SIGKILL");
  });
  let ready = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("gate lock holder READY timeout")), 5_000);
    holder.stdout.on("data", (chunk) => {
      ready += chunk;
      if (ready === "READY\n") {
        clearTimeout(timeout);
        resolve();
      }
    });
    holder.once("exit", (status) => reject(new Error(`gate lock holder exited before READY: ${status}`)));
  });
  const result = run(gate, fixture);
  holder.stdin.end();
  await new Promise((resolve) => holder.once("close", resolve));
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /lock|writer.*active|concurrent/i);
  for (const [absolutePath, expected] of manifestBytes) assert.deepEqual(fs.readFileSync(absolutePath), expected);
  assert.deepEqual(fs.readFileSync(reportPath), reportBytes);
});

test("advisory writer lock is released by SIGKILL and a later writer recovers", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const bin = path.join(fixture.parent, "crash-lock-bin");
  fs.mkdirSync(bin);
  const signal = path.join(fixture.parent, "crash-writer-holds-lock");
  const release = path.join(fixture.parent, "never-release-writer");
  const once = path.join(fixture.parent, "crash-block-once");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *copy,gzip*)\n    if mkdir "$BLOCK_ONCE" 2>/dev/null; then\n      : > "$LOCK_SIGNAL"\n      while [ ! -e "$LOCK_RELEASE" ]; do sleep 0.02; done\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const env = { PATH: `${bin}:${process.env.PATH}`, BLOCK_ONCE: once, LOCK_SIGNAL: signal, LOCK_RELEASE: release };
  const first = runAsync(writer, fixture, env);
  await waitForPath(signal);
  first.terminate();
  const firstResult = await first.completed;
  assert.notEqual(firstResult.status, 0);
  const recovered = run(writer, fixture, env);
  assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
});

test("existing archive sets are immutable and never overwritten", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json"), "utf8"));
  const indexPath = path.join(fixture.evidenceRoot, "sets", manifest.archiveSetFingerprint, "archive-set.json");
  fs.appendFileSync(indexPath, "tamper");
  const tampered = fs.readFileSync(indexPath);
  const rerun = run(writer, fixture);
  assert.notEqual(rerun.status, 0);
  assert.match(`${rerun.stdout}\n${rerun.stderr}`, /immutable|conflict|corrupt|mismatch/i);
  assert.deepEqual(fs.readFileSync(indexPath), tampered);
});

test("currentness gate rejects a complete unreferenced archive set without adopting it", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const archived = run(writer, fixture);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  const manifestPaths = repositoryArchiveManifestPaths(fixture);
  const manifestBytes = new Map(manifestPaths.map((absolutePath) => [absolutePath, fs.readFileSync(absolutePath)]));
  const linkedManifest = JSON.parse(fs.readFileSync(manifestPaths[0], "utf8"));
  fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "unreferenced set state\n");
  const {
    MARKER_NAME,
    collectWorktreeSnapshot,
    listWorktrees,
    materializeArchiveSet,
    readEvidenceRootMarker,
    repositoryIdentity
  } = await import(libraryUrl);
  const worktree = listWorktrees(fixture.repo).find((entry) => entry.branch === "feature/archive");
  assert.ok(worktree);
  const snapshot = collectWorktreeSnapshot(worktree);
  let materialized;
  try {
    materialized = materializeArchiveSet({
      evidenceRoot: fixture.evidenceRoot,
      marker: readEvidenceRootMarker(path.join(fixture.evidenceRoot, MARKER_NAME), {
        repositoryId: repositoryIdentity(path.join(fixture.repo, ".git")),
        rootId: linkedManifest.evidenceRootId
      }),
      dirtyMap: JSON.parse(fs.readFileSync(path.join(
        fixture.repo,
        "coordination",
        "release-intake",
        "latest-A25-dirty-tree-map.json"
      ), "utf8")),
      snapshots: [{ ...snapshot, branch: worktree.branch, head: worktree.head, worktreePath: worktree.path }]
    });
  } finally {
    snapshot.cleanup();
  }
  assert.notEqual(materialized.archiveSetFingerprint, linkedManifest.archiveSetFingerprint);
  assert.equal(fs.existsSync(path.join(
    fixture.evidenceRoot,
    "sets",
    materialized.archiveSetFingerprint,
    "archive-set.json"
  )), true);
  const gateResult = run(gate, fixture);
  assert.notEqual(gateResult.status, 0, gateResult.stderr || gateResult.stdout);
  assert.match(`${gateResult.stdout}\n${gateResult.stderr}`, /stale|drift|current|fingerprint/i);
  for (const [absolutePath, expected] of manifestBytes) assert.deepEqual(fs.readFileSync(absolutePath), expected);
  const report = JSON.parse(fs.readFileSync(path.join(
    fixture.evidenceRoot,
    "reports",
    "latest-A25-linked-worktree-archive-evidence-current-gate.json"
  ), "utf8"));
  assert.equal(report.archiveSetFingerprint, linkedManifest.archiveSetFingerprint);
  assert.ok(report.failures.length > 0);
});

test("writer self-verification catches archive TOCTOU before publishing manifests", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const bin = path.join(fixture.parent, "toctou-bin");
  fs.mkdirSync(bin);
  const marker = path.join(fixture.parent, "toctou-fired");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *"r:gz"*)\n    if [ ! -e "$TOCTOU_MARKER" ]; then\n      : > "$TOCTOU_MARKER"\n      find "$TOCTOU_ROOT/sets" -name untracked.tar.gz -type f -exec sh -c 'printf tamper >> "$1"' sh {} \\;\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(writer, fixture, { PATH: `${bin}:${process.env.PATH}`, TOCTOU_MARKER: marker, TOCTOU_ROOT: fixture.evidenceRoot });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /self-verification|sha256|tamper|changed/i);
  assert.equal(fs.existsSync(path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json")), false);
});

test("default evidence root is derived from the absolute common directory", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { resolveEvidenceRoot } = await import(libraryUrl);
  const resolved = resolveEvidenceRoot({ repoRoot: fixture.repo, commonDir: path.join(fixture.repo, ".git") });
  assert.equal(resolved, path.join(fs.realpathSync(fixture.parent), "MAIS-MVP-dirty-root-backups", "evidence-archives"));
});

test("worktree discovery preserves a newline in a linked-worktree path", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const newlinePath = path.join(fixture.parent, "linked\nnewline");
  git(fixture.repo, "worktree", "add", "-b", "feature/newline-path", newlinePath, "main");
  const { listWorktrees } = await import(libraryUrl);
  const discovered = listWorktrees(fixture.repo);
  assert.ok(discovered.some((entry) => entry.branch === "feature/newline-path" && entry.path === fs.realpathSync(newlinePath)));
});

test("mutation monitor bootstrap stays below ARG_MAX and keeps descriptors bounded at real scale", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const scaleRoot = path.join(fixture.linked, "scale");
  fs.mkdirSync(scaleRoot);
  for (let index = 0; index < 15_000; index += 1) {
    fs.writeFileSync(path.join(scaleRoot, `path-${String(index).padStart(5, "0")}.txt`), "x\n");
  }
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  let monitor;
  assert.doesNotThrow(() => { monitor = startMutationEpochMonitor([fixture.linked]); });
  t.after(() => abortMutationEpochMonitor(monitor));
  const state = readMutationEpochState(monitor);
  assert.ok(state.coveragePathCount >= 15_000);
  assert.ok(state.rootFdCount <= 2, JSON.stringify(state));
  assert.ok(state.fdCount <= 2, JSON.stringify(state));
  assert.ok(monitor.bootstrapArgBytes < 128 * 1024);
});

test("hierarchical monitor covers three hundred thousand child-enumerated paths with root-scale FDs", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-monitor-300k-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const root = path.join(parent, "root");
  const bin = path.join(parent, "bin");
  fs.mkdirSync(root);
  fs.mkdirSync(bin);
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, `#!/usr/bin/env node
const total=300000;
for(let start=0;start<total;start+=10000){
  const values=[];
  for(let index=start;index<Math.min(total,start+10000);index+=1) values.push('virtual/path-'+String(index).padStart(6,'0')+'.txt');
  process.stdout.write(values.join('\\0')+'\\0');
}
`);
  fs.chmodSync(shim, 0o755);
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const originalPath = process.env.PATH;
  process.env.PATH = `${bin}:${originalPath}`;
  let monitor;
  try {
    monitor = startMutationEpochMonitor([root], { startupTimeoutMs: 30_000 });
  } finally {
    process.env.PATH = originalPath;
  }
  t.after(() => abortMutationEpochMonitor(monitor));
  const state = readMutationEpochState(monitor, { requestSample: false });
  assert.ok(state.coveragePathCount >= 300_000);
  assert.equal(state.rootFdCount, 1);
  assert.equal(state.fdCount, 1);
  assert.ok(monitor.bootstrapArgBytes < 128 * 1024);
});

test("gate terminal attestations use two stable slots instead of session-named files", () => {
  const source = fs.readFileSync(gate, "utf8");
  assert.match(source, /gate-monitor-attestation-slot-a\.json/u);
  assert.match(source, /gate-monitor-attestation-slot-b\.json/u);
  assert.doesNotMatch(source, /gate-monitor-attestation-\$\{monitor\.sessionId\}/u);
});

test("six current-gate publications alternate two attestation slots without report or lock growth", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const archived = run(writer, fixture);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  const reportsDirectory = path.join(fixture.evidenceRoot, "reports");
  const observedSlots = [];
  for (let index = 0; index < 6; index += 1) {
    const result = run(gate, fixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(fs.readFileSync(path.join(
      reportsDirectory,
      "latest-A25-linked-worktree-archive-evidence-current-gate.json"
    ), "utf8"));
    observedSlots.push(path.posix.basename(report.terminalProtocol.attestationFile));
    const names = fs.readdirSync(reportsDirectory);
    assert.ok(names.filter((name) => name.startsWith("gate-monitor-attestation-slot-") && name.endsWith(".json")).length <= 2);
    assert.equal(names.filter((name) => name.startsWith(".evidence-report-owner-")).length, Math.min(index + 2, 3));
  }
  assert.deepEqual(observedSlots, [
    "gate-monitor-attestation-slot-a.json",
    "gate-monitor-attestation-slot-b.json",
    "gate-monitor-attestation-slot-a.json",
    "gate-monitor-attestation-slot-b.json",
    "gate-monitor-attestation-slot-a.json",
    "gate-monitor-attestation-slot-b.json"
  ]);
});

test("current gate alternates away from a readable legacy v1 terminal protocol", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const environment = {
    MAIS_EVIDENCE_MUTATION_MONITOR_MODE: "descriptor-sentinel"
  };
  const archived = run(writer, fixture, environment, TYPED_E2E_TIMEOUT_MS);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  const reportsDirectory = path.join(fixture.evidenceRoot, "reports");
  const reportPath = path.join(
    reportsDirectory,
    "latest-A25-linked-worktree-archive-evidence-current-gate.json"
  );
  fs.mkdirSync(reportsDirectory, { mode: 0o700 });
  const legacyReport = {
    archiveSetFingerprint: "b".repeat(64),
    branches: [{ branch: "feature/archive", head: "c".repeat(40) }],
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: "legacy-readable-report",
    expandedStatusEntries: 1,
    failures: [],
    openLinkedDecisions: 1,
    schemaVersion: 2,
    terminalProtocol: {
      attestationFile: "reports/gate-monitor-attestation-slot-a.json",
      expectedMetadataEpoch: 0,
      expectedSourceEpoch: 0,
      monitorSessionId: crypto.randomUUID(),
      schemaVersion: 1
    }
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(legacyReport)}\n`, { mode: 0o600 });
  const checked = run(gate, fixture, environment, TYPED_E2E_TIMEOUT_MS);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  const current = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(
    current.terminalProtocol.attestationFile,
    "reports/gate-monitor-attestation-slot-b.json"
  );
  assert.equal(current.terminalProtocol.schemaVersion, 3);
  assert.equal(current.terminalProtocol.requestedWatchMode, "descriptor-sentinel");
  assert.equal(current.terminalProtocol.directoryTimestampPolicy, "semantic-directory");
});

test("flock owner proof is portable and contains no Darwin struct ABI", () => {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.doesNotMatch(source, /F_GETLK|struct\.pack|qqihh/u);
  assert.match(source, /fcntl\.flock\(fd,fcntl\.LOCK_EX\|fcntl\.LOCK_NB\)/u);
  assert.match(source, /stdio: \["ignore", "pipe", "pipe", descriptor\]/u);
});

test("mutation monitor rejects unsupported watch modes", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  let leakedMonitor;
  try {
    assert.throws(
      () => {
        leakedMonitor = startMutationEpochMonitor([fixture.linked], { watchMode: "recursive" });
      },
      /watch mode.*auto.*descriptor-sentinel/i
    );
  } finally {
    abortMutationEpochMonitor(leakedMonitor);
  }
});

test("default mutation quiescence timeout budgets two coverage-scaled samples", async () => {
  const { calculateMutationMonitorQuiescenceTimeout } = await import(libraryUrl);
  assert.equal(calculateMutationMonitorQuiescenceTimeout({
    coveragePathCount: 300_000,
    quietMs: 300
  }), 131_300);
  assert.equal(calculateMutationMonitorQuiescenceTimeout({
    coveragePathCount: 1,
    quietMs: 300
  }), 13_300);
  assert.equal(calculateMutationMonitorQuiescenceTimeout({
    coveragePathCount: 600_000,
    quietMs: 2_000
  }), 243_000);
});

test("mutation quiescence timeout rejects invalid coverage quiet and explicit bounds", async () => {
  const {
    calculateMutationMonitorQuiescenceTimeout,
    settleMutationEpochState
  } = await import(libraryUrl);
  for (const coveragePathCount of [0, -1, 1.5, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateMutationMonitorQuiescenceTimeout({
      coveragePathCount,
      quietMs: 300
    }), /coverage path count must be a positive safe integer/i);
  }
  for (const quietMs of [24, 2_001, 1.5, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateMutationMonitorQuiescenceTimeout({
      coveragePathCount: 1,
      quietMs
    }), /quiet period must be a safe integer from 25 through 2000 milliseconds/i);
  }
  const monitor = { coveragePathCount: 1 };
  for (const timeoutMs of [0, -1, 1.5, Number.POSITIVE_INFINITY]) {
    assert.throws(() => settleMutationEpochState(monitor, {
      quietMs: 300,
      timeoutMs
    }), /explicit timeout must be a positive safe integer/i);
  }
  const absoluteCap = calculateMutationMonitorQuiescenceTimeout({
    coveragePathCount: monitor.coveragePathCount,
    quietMs: 300
  });
  assert.throws(() => settleMutationEpochState(monitor, {
    quietMs: 300,
    timeoutMs: absoluteCap + 1
  }), /explicit timeout exceeds the coverage-scaled absolute cap/i);
});

test("explicit mutation quiescence timeout caps a stalled sample acknowledgement", async (t) => {
  if (process.platform === "win32") {
    t.skip("SIGSTOP is unavailable on Windows");
    return;
  }
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const probe = path.join(fixture.parent, "explicit-quiescence-timeout-probe.mjs");
  fs.writeFileSync(probe, [
    `import { abortMutationEpochMonitor, settleMutationEpochState, startMutationEpochMonitor } from ${JSON.stringify(libraryUrl)};`,
    `const watchedRoot = ${JSON.stringify(fixture.linked)};`,
    "const monitor = startMutationEpochMonitor([watchedRoot], { watchMode: 'descriptor-sentinel' });",
    "try {",
    "  process.kill(monitor.child.pid, 'SIGSTOP');",
    "  const startedAt = Date.now();",
    "  let observedError = null;",
    "  try { settleMutationEpochState(monitor, { quietMs: 25, timeoutMs: 25 }); }",
    "  catch (error) { observedError = error; }",
    "  const elapsedMs = Date.now() - startedAt;",
    "  if (!(observedError instanceof Error) || !/bounded quiescence|sample acknowledgement timed out/i.test(observedError.message)) process.exitCode = 81;",
    "  else if (elapsedMs > 250) process.exitCode = 82;",
    "} finally { abortMutationEpochMonitor(monitor); }"
  ].join("\n"));
  const result = spawnSync(process.execPath, [probe], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});

test("sample acknowledgement at the explicit deadline fails closed", async (t) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-sample-deadline-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const sessionId = crypto.randomUUID();
  const epoch = {
    coverageFingerprint: "b".repeat(64),
    coveragePathCount: 1,
    fdCount: 1,
    metadataEpoch: 0,
    rootFdCount: 1,
    schemaVersion: 1,
    sessionId,
    sourceEpoch: 0,
    watchMode: "descriptor-sentinel"
  };
  const monitor = {
    child: {
      pid: process.pid,
      send(message) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 35);
        fs.writeFileSync(path.join(scratch, `sample-${message.requestId}.json`), `${JSON.stringify({
          ...epoch,
          requestId: message.requestId,
          status: "sampled"
        })}\n`);
        return true;
      }
    },
    coveragePathCount: 1,
    epochPath: path.join(scratch, "epoch"),
    errorPath: path.join(scratch, "error"),
    scratch,
    sessionId,
    stopped: false
  };
  fs.writeFileSync(monitor.epochPath, `${JSON.stringify(epoch)}\n`);
  const { readMutationEpochState } = await import(libraryUrl);
  assert.throws(
    () => readMutationEpochState(monitor, { sampleTimeoutMs: 25 }),
    /sample acknowledgement timed out/i
  );
});

test("mutation state and sample provenance distinguish strict auto fallback from semantic descriptor mode", async (t) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-monitor-provenance-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const { readMutationEpochState } = await import(libraryUrl);
  const sessionId = crypto.randomUUID();
  const state = {
    coverageFingerprint: "b".repeat(64),
    coveragePathCount: 1,
    directoryTimestampPolicy: "strict",
    fdCount: 1,
    metadataEpoch: 0,
    requestedWatchMode: "auto",
    rootFdCount: 1,
    schemaVersion: 2,
    sessionId,
    sourceEpoch: 0,
    watchMode: "descriptor-sentinel"
  };
  const epochPath = path.join(scratch, "epoch");
  const errorPath = path.join(scratch, "error");
  const makeMonitor = (
    sampleMutation = (value) => value,
    expectedProvenance = {
      directoryTimestampPolicy: "strict",
      requestedWatchMode: "auto"
    }
  ) => ({
    child: {
      pid: process.pid,
      send(message) {
        fs.writeFileSync(path.join(scratch, `sample-${message.requestId}.json`), `${JSON.stringify(sampleMutation({
          ...state,
          requestId: message.requestId,
          status: "sampled"
        }))}\n`);
        return true;
      }
    },
    coveragePathCount: 1,
    directoryTimestampPolicy: expectedProvenance.directoryTimestampPolicy,
    epochPath,
    errorPath,
    requestedWatchMode: expectedProvenance.requestedWatchMode,
    scratch,
    sessionId,
    stopped: false
  });
  fs.writeFileSync(epochPath, `${JSON.stringify(state)}\n`);
  const observed = readMutationEpochState(makeMonitor());
  assert.equal(observed.watchMode, "descriptor-sentinel");
  assert.equal(observed.requestedWatchMode, "auto");
  assert.equal(observed.directoryTimestampPolicy, "strict");

  for (const mutate of [
    (value) => ({ ...value, extra: true }),
    (value) => ({ ...value, requestedWatchMode: "descriptor-sentinel" }),
    (value) => ({ ...value, directoryTimestampPolicy: "semantic-directory" })
  ]) {
    assert.throws(
      () => readMutationEpochState(makeMonitor(mutate)),
      /sample acknowledgement schema is invalid/i
    );
  }

  for (const invalidState of [
    { ...state, extra: true },
    { ...state, requestedWatchMode: "descriptor-sentinel" },
    { ...state, directoryTimestampPolicy: "semantic-directory" }
  ]) {
    fs.writeFileSync(epochPath, `${JSON.stringify(invalidState)}\n`);
    assert.throws(
      () => readMutationEpochState(makeMonitor(), { requestSample: false }),
      /mutation monitor epoch is invalid/i
    );
  }

  for (const invalidProvenance of [
    { requestedWatchMode: "bogus", directoryTimestampPolicy: null },
    { requestedWatchMode: null, directoryTimestampPolicy: null },
    { requestedWatchMode: "auto", directoryTimestampPolicy: null },
    { requestedWatchMode: "auto", directoryTimestampPolicy: "loose" }
  ]) {
    const invalidState = { ...state, ...invalidProvenance };
    fs.writeFileSync(epochPath, `${JSON.stringify(invalidState)}\n`);
    assert.throws(
      () => readMutationEpochState(makeMonitor(
        (value) => ({ ...value, ...invalidProvenance }),
        invalidProvenance
      )),
      /sample acknowledgement schema is invalid/i
    );
    assert.throws(
      () => readMutationEpochState(
        makeMonitor((value) => value, invalidProvenance),
        { requestSample: false }
      ),
      /mutation monitor epoch is invalid/i
    );
  }
});

test("mutation monitor forces descriptor-sentinel mode through its effective attestation", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  assert.equal(monitor.requestedWatchMode, "descriptor-sentinel");
  const bootstrap = JSON.parse(fs.readFileSync(path.join(monitor.scratch, "bootstrap.json"), "utf8"));
  assert.equal(bootstrap.requestedWatchModeText, "descriptor-sentinel");
  const state = settleMutationEpochState(monitor);
  assert.equal(state.schemaVersion, 3);
  assert.equal(monitor.watchMode, "descriptor-sentinel");
  assert.equal(state.watchMode, "descriptor-sentinel");
  assert.equal(state.requestedWatchMode, "descriptor-sentinel");
  assert.equal(state.directoryTimestampPolicy, "semantic-directory");
  const attestation = stopMutationEpochMonitor(monitor, {
    expectedEpoch: state.sourceEpoch,
    expectedMetadataEpoch: state.metadataEpoch
  });
  assert.equal(attestation.schemaVersion, 3);
  assert.equal(attestation.watchMode, "descriptor-sentinel");
  assert.equal(attestation.requestedWatchMode, "descriptor-sentinel");
  assert.equal(attestation.directoryTimestampPolicy, "semantic-directory");
});

test("Darwin explicit descriptor monitoring binds a native typed FSEvents READY endpoint", {
  skip: process.platform !== "darwin"
}, async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    sha256Buffer,
    startMutationEpochMonitor,
    stopMutationEpochMonitor,
    TYPED_FSEVENTS_HELPER_SOURCE_PATH
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const state = readMutationEpochState(monitor, { requestSample: false });
  assert.equal(monitor.typedHelperReadyBeforeDescriptorBaseline, true);
  assert.equal(fs.lstatSync(monitor.typedFseventsRuntimeScratch).mode & 0o777, 0o700);
  assert.equal(processIsAlive(monitor.typedFseventsPid), true);
  const typedFseventsPid = monitor.typedFseventsPid;
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.eventBackend, "darwin-fsevents-file-events");
  assert.equal(state.helperProtocolVersion, 2);
  assert.equal(state.regularFileCtimePolicy, "typed-xattr-only");
  assert.equal(state.typedFsevents.enabled, true);
  assert.equal(
    state.typedFsevents.helperSourceSha256,
    sha256Buffer(fs.readFileSync(TYPED_FSEVENTS_HELPER_SOURCE_PATH))
  );
  assert.equal(state.typedFsevents.eventRootCount, state.rootFdCount);
  assert.match(state.typedFsevents.helperBinarySha256, /^[0-9a-f]{64}$/u);
  assert.match(state.typedFsevents.eventRootFingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(state.typedFsevents.journalSha256, sha256Buffer(Buffer.alloc(0)));
  assert.equal(state.typedFsevents.journalEntryCount, "0");
  assert.equal(state.typedFsevents.journalFirstEventId, null);
  assert.equal(state.typedFsevents.journalLastEventId, null);
  assert.equal(state.typedFsevents.journalLastFlushedEventId, null);
  assert.equal(state.typedFsevents.journalFlushSequence, "2");
  for (const absolutePath of [
    monitor.typedFseventsBinaryPath,
    monitor.typedFseventsRootsPath,
    monitor.typedFseventsCommandPath,
    monitor.typedFseventsJournalPath,
    monitor.typedFseventsAckPath,
    monitor.typedFseventsAckCommitPath
  ]) {
    const stat = fs.lstatSync(absolutePath);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.isFile(), true);
    assert.equal(stat.mode & 0o777, absolutePath === monitor.typedFseventsBinaryPath ? 0o500 : 0o600);
    assert.equal(stat.nlink, 1);
  }
  const attestation = stopMutationEpochMonitor(monitor, {
    expectedEpoch: state.sourceEpoch,
    expectedMetadataEpoch: state.metadataEpoch
  });
  assert.equal(attestation.eventBackend, "darwin-fsevents-file-events");
  assert.equal(attestation.typedFsevents.helperBinarySha256, state.typedFsevents.helperBinarySha256);
  assert.equal(processIsAlive(typedFseventsPid), false);
});

test("Darwin outer cleanup signals only its monitor ChildProcess handle", {
  skip: process.platform !== "darwin"
}, async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortMutationEpochMonitor, startMutationEpochMonitor } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  const nativePid = monitor.typedFseventsPid;
  const scratch = monitor.scratch;
  const numericSignals = [];
  const originalKill = process.kill;
  process.kill = function monitoredKill(pid, signal) {
    if (signal !== undefined && signal !== 0) numericSignals.push({ pid, signal });
    return originalKill.call(process, pid, signal);
  };
  try {
    abortMutationEpochMonitor(monitor);
  } finally {
    process.kill = originalKill;
  }
  assert.deepEqual(numericSignals, []);
  assert.equal(fs.existsSync(scratch), false);
  assert.equal(await waitForCondition(() => !processIsAlive(nativePid), 2_000), true);
});

test("Darwin monitor-child death closes native stdin while leaving scratch diagnostic state", {
  skip: process.platform !== "darwin"
}, async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortMutationEpochMonitor, startMutationEpochMonitor } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const nativePid = monitor.typedFseventsPid;
  monitor.child.kill("SIGKILL");
  assert.equal(await waitForCondition(
    () => !processIsAlive(monitor.child.pid) && !processIsAlive(nativePid),
    3_000
  ), true, "monitor-child SIGKILL did not close the native helper parent channel");
  assert.equal(fs.existsSync(monitor.scratch), true, "scratch should remain for outer diagnostic cleanup");
});

test("Darwin diagnostic native-pid sidecar tampering never targets an unrelated process", {
  skip: process.platform !== "darwin"
}, async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { abortMutationEpochMonitor, startMutationEpochMonitor } = await import(libraryUrl);
  for (const tamperKind of ["replacement", "deletion", "symlink", "fifo"]) {
    await t.test(tamperKind, async (subtest) => {
      const monitor = startMutationEpochMonitor([fixture.linked], {
        watchMode: "descriptor-sentinel"
      });
      const sentinel = spawn(process.execPath, ["-e", "setInterval(() => {}, 60000)"], {
        stdio: "ignore"
      });
      subtest.after(() => {
        abortMutationEpochMonitor(monitor);
        if (processIsAlive(sentinel.pid)) sentinel.kill("SIGKILL");
      });
      assert.equal(await waitForCondition(() => processIsAlive(sentinel.pid), 1_000), true);
      const sidecarPath = path.join(monitor.scratch, "typed-helper-pid");
      if (tamperKind === "deletion") {
        fs.unlinkSync(sidecarPath);
      } else if (tamperKind === "fifo") {
        const fifoPath = path.join(monitor.scratch, `.unrelated-pid-fifo-${crypto.randomUUID()}`);
        execFileSync("/usr/bin/mkfifo", [fifoPath], { timeout: TEST_CHILD_TIMEOUT_MS });
        fs.chmodSync(fifoPath, 0o600);
        fs.renameSync(fifoPath, sidecarPath);
        assert.equal(fs.lstatSync(sidecarPath).isFIFO(), true);
      } else if (tamperKind === "symlink") {
        const backingPath = path.join(fixture.parent, `unrelated-pid-${crypto.randomUUID()}.json`);
        fs.writeFileSync(backingPath, `${JSON.stringify({ pid: sentinel.pid })}\n`, { mode: 0o600 });
        fs.unlinkSync(sidecarPath);
        fs.symlinkSync(backingPath, sidecarPath);
      } else {
        fs.writeFileSync(sidecarPath, `${JSON.stringify({ pid: sentinel.pid })}\n`, { mode: 0o600 });
      }
      abortMutationEpochMonitor(monitor);
      assert.equal(processIsAlive(sentinel.pid), true, "diagnostic sidecar controlled cleanup authority");
    });
  }
});

test("Darwin typed descriptor separates exact xattr churn from write-restore material drift", {
  skip: process.platform !== "darwin"
}, async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const target = path.join(fixture.linked, "tracked.txt");
  fs.appendFileSync(target, "dirty baseline selected by Git-currentness scope\n");
  execFileSync("/usr/bin/xattr", ["-w", "com.mais.task2", "baseline", target], {
    stdio: "ignore",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  execFileSync("/usr/bin/xattr", ["-w", "com.mais.task2", "metadata-only", target], {
    stdio: "ignore",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const xattrState = settleMutationEpochState(monitor);
  assert.equal(xattrState.sourceEpoch, baseline.sourceEpoch);
  assert.equal(xattrState.metadataEpoch, baseline.metadataEpoch);
  assert.ok(xattrState.xattrEpoch > baseline.xattrEpoch);
  assert.ok(
    BigInt(xattrState.typedFsevents.xattrOnlyEventCount)
      > BigInt(baseline.typedFsevents.xattrOnlyEventCount)
  );
  assert.equal(
    BigInt(xattrState.typedFsevents.journalFlushSequence)
      - BigInt(baseline.typedFsevents.journalFlushSequence),
    4n
  );
  const assertTypedAlgebra = (state) => {
    const typed = state.typedFsevents;
    assert.equal(
      BigInt(typed.sourceEventCount) + BigInt(typed.transactionMetadataEventCount),
      BigInt(typed.materialEventCount)
    );
    assert.equal(
      BigInt(typed.materialEventCount) + BigInt(typed.xattrOnlyEventCount),
      BigInt(typed.journalEntryCount)
    );
  };
  assertTypedAlgebra(xattrState);
  const xattrNoop = settleMutationEpochState(monitor);
  assert.equal(xattrNoop.sourceEpoch, xattrState.sourceEpoch);
  assert.equal(xattrNoop.metadataEpoch, xattrState.metadataEpoch);
  assert.equal(xattrNoop.xattrEpoch, xattrState.xattrEpoch);
  assert.equal(
    BigInt(xattrNoop.typedFsevents.journalFlushSequence)
      - BigInt(xattrState.typedFsevents.journalFlushSequence),
    2n
  );

  const original = fs.readFileSync(target);
  const originalStat = fs.statSync(target);
  fs.writeFileSync(target, "temporary material mutation\n");
  fs.writeFileSync(target, original);
  fs.utimesSync(target, originalStat.atime, originalStat.mtime);
  const materialState = settleMutationEpochState(monitor);
  assert.ok(materialState.sourceEpoch > xattrNoop.sourceEpoch);
  assert.equal(materialState.xattrEpoch, xattrNoop.xattrEpoch);
  assert.ok(
    BigInt(materialState.typedFsevents.materialEventCount)
      > BigInt(xattrNoop.typedFsevents.materialEventCount)
  );
  assert.equal(
    BigInt(materialState.typedFsevents.journalFlushSequence)
      - BigInt(xattrNoop.typedFsevents.journalFlushSequence),
    4n
  );
  assertTypedAlgebra(materialState);
  const materialNoop = settleMutationEpochState(monitor);
  assert.equal(materialNoop.sourceEpoch, materialState.sourceEpoch);
  assert.equal(materialNoop.metadataEpoch, materialState.metadataEpoch);
  assert.equal(materialNoop.xattrEpoch, materialState.xattrEpoch);
  assert.equal(
    BigInt(materialNoop.typedFsevents.journalFlushSequence)
      - BigInt(materialState.typedFsevents.journalFlushSequence),
    2n
  );
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: materialNoop.sourceEpoch,
    expectedMetadataEpoch: materialNoop.metadataEpoch
  });
});

test("closure monitor override rejects every unsupported defined mode before bootstrap", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    bootstrapMutationEpochMonitor
  } = await import(libraryUrl);
  const variable = "MAIS_EVIDENCE_MUTATION_MONITOR_MODE";
  const previous = process.env[variable];
  t.after(() => {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
  });
  let leakedMonitor;
  try {
    for (const invalidMode of ["", "auto", "recursive", "descriptor-sentinel "]) {
      process.env[variable] = invalidMode;
      assert.throws(
        () => {
          leakedMonitor = bootstrapMutationEpochMonitor({
            repoRoot: fixture.repo,
            commonDir: path.join(fixture.repo, ".git")
          }).monitor;
        },
        /MAIS_EVIDENCE_MUTATION_MONITOR_MODE.*descriptor-sentinel/i
      );
    }
  } finally {
    abortMutationEpochMonitor(leakedMonitor);
  }
});

test("closure descriptor override handles ignored churn without opening ignored payloads", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, ".gitignore"), ".ignored-cache/\n");
  git(fixture.linked, "add", ".gitignore");
  git(fixture.linked, "commit", "-m", "ignore local cache");
  const ignoredDirectory = path.join(fixture.linked, ".ignored-cache");
  fs.mkdirSync(ignoredDirectory);
  fs.writeFileSync(path.join(ignoredDirectory, "baseline.txt"), "ignored baseline\n");
  const {
    abortMutationEpochMonitor,
    bootstrapMutationEpochMonitor,
    settleMutationEpochState,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const variable = "MAIS_EVIDENCE_MUTATION_MONITOR_MODE";
  const previous = process.env[variable];
  process.env[variable] = "descriptor-sentinel";
  t.after(() => {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
  });
  const { monitor } = bootstrapMutationEpochMonitor({
    repoRoot: fixture.repo,
    commonDir: path.join(fixture.repo, ".git")
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  assert.equal(
    baseline.watchMode,
    process.platform === "darwin" ? "descriptor-sentinel-fsevents" : "descriptor-sentinel"
  );
  const churn = path.join(ignoredDirectory, "read-only-churn.txt");
  fs.writeFileSync(churn, "ignored churn\n");
  fs.readFileSync(path.join(fixture.linked, "tracked.txt"));
  execFileSync("git", ["status", "--short"], {
    cwd: fixture.linked,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: "ignore",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  fs.rmSync(churn);
  const observed = settleMutationEpochState(monitor);
  if (process.platform === "darwin") {
    assert.ok(
      observed.sourceEpoch > baseline.sourceEpoch,
      "out-of-scope typed events must conservatively fail currentness as source"
    );
  } else {
    assert.equal(observed.sourceEpoch, baseline.sourceEpoch);
  }
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: observed.sourceEpoch,
    expectedMetadataEpoch: observed.metadataEpoch
  });
});

test("explicit closure descriptor treats directory timestamp churn as the same semantic fixed point", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const watchedDirectory = path.join(fixture.linked, "stable-directory");
  fs.mkdirSync(watchedDirectory);
  fs.writeFileSync(path.join(watchedDirectory, "tracked.txt"), "stable payload\n");
  git(fixture.linked, "add", "stable-directory/tracked.txt");
  git(fixture.linked, "commit", "-m", "add stable directory fixture");
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  const before = fs.lstatSync(watchedDirectory);
  fs.utimesSync(
    watchedDirectory,
    new Date(before.atimeMs + 2_000),
    new Date(before.mtimeMs + 2_000)
  );
  const after = fs.lstatSync(watchedDirectory);
  assert.notEqual(after.mtimeMs, before.mtimeMs);
  assert.deepEqual(
    Object.fromEntries(["dev", "ino", "mode", "nlink", "size"].map((key) => [key, after[key]])),
    Object.fromEntries(["dev", "ino", "mode", "nlink", "size"].map((key) => [key, before[key]]))
  );
  assert.deepEqual(fs.readdirSync(watchedDirectory).sort(), ["tracked.txt"]);
  const observed = settleMutationEpochState(monitor);
  assert.equal(observed.sourceEpoch, baseline.sourceEpoch);
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: observed.sourceEpoch,
    expectedMetadataEpoch: observed.metadataEpoch
  });
});

test("auto mutation monitoring keeps directory timestamp churn strict", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const watchedDirectory = path.join(fixture.linked, "strict-directory");
  fs.mkdirSync(watchedDirectory);
  fs.writeFileSync(path.join(watchedDirectory, "tracked.txt"), "strict payload\n");
  git(fixture.linked, "add", "strict-directory/tracked.txt");
  git(fixture.linked, "commit", "-m", "add strict directory fixture");
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], { watchMode: "auto" });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  assert.equal(baseline.requestedWatchMode, "auto");
  assert.equal(baseline.directoryTimestampPolicy, "strict");
  const before = fs.lstatSync(watchedDirectory);
  fs.utimesSync(
    watchedDirectory,
    new Date(before.atimeMs + 2_000),
    new Date(before.mtimeMs + 2_000)
  );
  const observed = settleMutationEpochState(monitor);
  assert.ok(observed.sourceEpoch > baseline.sourceEpoch);
  const attestation = stopMutationEpochMonitor(monitor, {
    expectedEpoch: observed.sourceEpoch,
    expectedMetadataEpoch: observed.metadataEpoch
  });
  assert.equal(attestation.requestedWatchMode, "auto");
  assert.equal(attestation.directoryTimestampPolicy, "strict");
});

test("explicit closure descriptor still detects persistent namespace, mode, identity, and file changes", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const watchedDirectory = path.join(fixture.linked, "semantic-directory");
  const originalFile = path.join(watchedDirectory, "original.txt");
  fs.mkdirSync(watchedDirectory);
  fs.writeFileSync(originalFile, "semantic payload\n");
  git(fixture.linked, "add", "semantic-directory/original.txt");
  git(fixture.linked, "commit", "-m", "add semantic directory fixture");
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  let state = settleMutationEpochState(monitor);

  const createdFile = path.join(watchedDirectory, "created.txt");
  fs.writeFileSync(createdFile, "created payload\n");
  let next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  fs.rmSync(createdFile);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  const renamedFile = path.join(watchedDirectory, "renamed.txt");
  fs.renameSync(originalFile, renamedFile);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  const createdDirectory = path.join(watchedDirectory, "created-directory");
  fs.mkdirSync(createdDirectory);
  fs.writeFileSync(path.join(createdDirectory, "nested.txt"), "nested payload\n");
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  const renamedDirectory = path.join(watchedDirectory, "renamed-directory");
  fs.renameSync(createdDirectory, renamedDirectory);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  fs.rmSync(renamedDirectory, { recursive: true });
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  const originalMode = fs.lstatSync(watchedDirectory).mode & 0o777;
  fs.chmodSync(watchedDirectory, originalMode ^ 0o020);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;
  fs.chmodSync(watchedDirectory, originalMode);
  state = settleMutationEpochState(monitor);

  const oldDirectory = `${watchedDirectory}-old`;
  fs.renameSync(watchedDirectory, oldDirectory);
  fs.mkdirSync(watchedDirectory, { mode: originalMode });
  fs.writeFileSync(path.join(watchedDirectory, "renamed.txt"), "semantic payload\n");
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;

  const trackedFile = path.join(watchedDirectory, "renamed.txt");
  const trackedBaseline = fs.readFileSync(trackedFile);
  fs.writeFileSync(trackedFile, "transient tracked mutation\n");
  fs.writeFileSync(trackedFile, trackedBaseline);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: next.sourceEpoch,
    expectedMetadataEpoch: next.metadataEpoch
  });
});

test("closure descriptor override still detects a true tracked mutation", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    bootstrapMutationEpochMonitor,
    settleMutationEpochState,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const variable = "MAIS_EVIDENCE_MUTATION_MONITOR_MODE";
  const previous = process.env[variable];
  process.env[variable] = "descriptor-sentinel";
  t.after(() => {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
  });
  const { monitor } = bootstrapMutationEpochMonitor({
    repoRoot: fixture.repo,
    commonDir: path.join(fixture.repo, ".git")
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  assert.equal(baseline.watchMode, "descriptor-sentinel");
  fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "true mutation\n");
  const observed = settleMutationEpochState(monitor);
  assert.ok(observed.sourceEpoch > baseline.sourceEpoch);
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: observed.sourceEpoch,
    expectedMetadataEpoch: observed.metadataEpoch
  });
});

test("writer and currentness gate inherit the strict closure monitor override", () => {
  const librarySource = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(librarySource, /MAIS_EVIDENCE_MUTATION_MONITOR_MODE/u);
  for (const executable of [writer, gate]) {
    const source = fs.readFileSync(executable, "utf8");
    assert.match(source, /bootstrapMutationEpochMonitor\(\{/u);
    assert.doesNotMatch(source, /watchMode\s*:\s*["']descriptor-sentinel["']/u);
  }
});

test("closure monitor override reaches the writer and currentness gate end to end", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const environment = {
    MAIS_EVIDENCE_MUTATION_MONITOR_MODE: "descriptor-sentinel"
  };
  const archived = run(writer, fixture, environment, TYPED_E2E_TIMEOUT_MS);
  assert.equal(archived.status, 0, archived.stderr || archived.stdout);
  const checked = run(gate, fixture, environment, TYPED_E2E_TIMEOUT_MS);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  const report = JSON.parse(fs.readFileSync(path.join(
    fixture.evidenceRoot,
    "reports",
    "latest-A25-linked-worktree-archive-evidence-current-gate.json"
  ), "utf8"));
  const attestation = JSON.parse(fs.readFileSync(path.join(
    fixture.evidenceRoot,
    ...report.terminalProtocol.attestationFile.split("/")
  ), "utf8"));
  assert.equal(report.terminalProtocol.schemaVersion, 3);
  assert.equal(report.terminalProtocol.requestedWatchMode, "descriptor-sentinel");
  assert.equal(report.terminalProtocol.directoryTimestampPolicy, "semantic-directory");
  assert.equal(report.terminalProtocol.watchMode, attestation.watchMode);
  assert.equal(report.terminalProtocol.expectedXattrEpoch, attestation.xattrEpoch);
  assert.deepEqual(report.terminalProtocol.typedFsevents, attestation.typedFsevents);
  assert.equal(attestation.schemaVersion, 3);
  assert.equal(
    attestation.watchMode,
    process.platform === "darwin" ? "descriptor-sentinel-fsevents" : "descriptor-sentinel"
  );
  assert.equal(attestation.requestedWatchMode, "descriptor-sentinel");
  assert.equal(attestation.directoryTimestampPolicy, "semantic-directory");
});

test("mutation epoch monitoring observes writes and fails closed on invalid roots or child crash", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    readMutationEpoch,
    settleMutationEpoch,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  assert.throws(() => startMutationEpochMonitor([path.join(fixture.linked, "tracked.txt")]), /direct directory|monitor root/i);
  const monitor = startMutationEpochMonitor([fixture.linked, path.join(fixture.repo, ".git")]);
  const isAlive = (pid) => {
    try { process.kill(pid, 0); return true; } catch { return false; }
  };
  const baseline = settleMutationEpoch(monitor);
  fs.writeFileSync(path.join(fixture.linked, "observed-write.txt"), "observe me\n");
  const deadline = Date.now() + 3_000;
  let observed = baseline;
  while (observed === baseline && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    observed = readMutationEpoch(monitor);
  }
  assert.ok(observed > baseline);
  monitor.child.kill("SIGKILL");
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.throws(() => readMutationEpoch(monitor), /crashed|fails closed|not active/i);
  const crashedScratch = monitor.scratch;
  const crashedPid = monitor.child.pid;
  abortMutationEpochMonitor(monitor);
  assert.equal(monitor.stopAcknowledged, false);
  assert.equal(fs.existsSync(crashedScratch), false);
  assert.equal(isAlive(crashedPid), false);
  const normalMonitor = startMutationEpochMonitor([fixture.linked, path.join(fixture.repo, ".git")]);
  const normalScratch = normalMonitor.scratch;
  const normalPid = normalMonitor.child.pid;
  settleMutationEpoch(normalMonitor);
  stopMutationEpochMonitor(normalMonitor);
  assert.equal(normalMonitor.stopAcknowledged, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fs.existsSync(normalScratch), false);
  assert.equal(isAlive(normalPid), false);
});

test("mutation monitor terminal stop rejects a crashed child without an epoch-matched acknowledgement", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { settleMutationEpoch, startMutationEpochMonitor, stopMutationEpochMonitor } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked, path.join(fixture.repo, ".git")]);
  const expectedEpoch = settleMutationEpoch(monitor);
  monitor.child.kill("SIGKILL");
  await waitForCondition(() => !processIsAlive(monitor.child.pid), 2_000);
  assert.throws(
    () => stopMutationEpochMonitor(monitor, { expectedEpoch }),
    /acknowledg|crash|terminal|epoch|fails closed/i
  );
  assert.equal(fs.existsSync(monitor.scratch), false);
});

test("descriptor sentinel detects deep restore, transient create-delete, rename, and inode replacement", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const deepDirectory = path.join(fixture.linked, "deep", "nested");
  const target = path.join(deepDirectory, "tracked.txt");
  fs.mkdirSync(deepDirectory, { recursive: true });
  fs.writeFileSync(target, "sentinel baseline\n");
  git(fixture.linked, "add", "deep/nested/tracked.txt");
  git(fixture.linked, "commit", "-m", "descriptor sentinel fixture");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked]);
  let state = settleMutationEpochState(monitor);
  const initialFdCount = state.fdCount;
  const observedWatchMode = state.watchMode;
  assert.equal(state.rootFdCount, 1);
  assert.equal(state.fdCount, state.rootFdCount);
  const baseline = fs.readFileSync(target);
  fs.writeFileSync(target, "transient deep mutation\n");
  fs.writeFileSync(target, baseline);
  let next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;
  const transient = path.join(fixture.linked, "transient-only.txt");
  fs.writeFileSync(transient, "appears briefly\n");
  fs.rmSync(transient);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;
  const newDirectory = path.join(fixture.linked, "created-after-start", "child");
  const newDeepFile = path.join(newDirectory, "new.txt");
  fs.mkdirSync(newDirectory, { recursive: true });
  fs.writeFileSync(newDeepFile, "new directory payload\n");
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  assert.equal(next.rootFdCount, state.rootFdCount);
  assert.equal(next.fdCount, state.fdCount);
  state = next;
  fs.appendFileSync(newDeepFile, "deep follow-up mutation\n");
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;
  const renamed = path.join(deepDirectory, "renamed.txt");
  fs.renameSync(target, renamed);
  fs.renameSync(renamed, target);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  state = next;
  const replacement = path.join(deepDirectory, "replacement.txt");
  fs.writeFileSync(replacement, baseline);
  fs.renameSync(replacement, target);
  next = settleMutationEpochState(monitor);
  assert.ok(next.sourceEpoch > state.sourceEpoch);
  stopMutationEpochMonitor(monitor, {
    expectedEpoch: next.sourceEpoch,
    expectedMetadataEpoch: next.metadataEpoch
  });
  t.diagnostic(`watchMode=${observedWatchMode} initialFdCount=${initialFdCount} finalFdCount=${next.fdCount}`);
});

test("mutation monitor rejects prefix policies and classifies only one dynamically registered exact transaction root", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    registerMutationMetadataRoot,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor,
    TRANSACTION_METADATA_PATHS
  } = await import(libraryUrl);
  const archiveParent = path.join(fixture.linked, "coordination", "release-intake", "archive");
  fs.mkdirSync(archiveParent, { recursive: true });
  let forbiddenMonitor;
  try {
    assert.throws(() => {
      forbiddenMonitor = startMutationEpochMonitor([fixture.linked], {
        transactionMetadata: {
          root: fixture.linked,
          exactRelativePaths: [],
          relativePrefixes: ["coordination/release-intake/archive/.evidence-publish-"]
        }
      });
    }, /prefix|unsupported|exact/i);
  } finally {
    abortMutationEpochMonitor(forbiddenMonitor);
  }
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "descriptor-sentinel",
    transactionMetadata: {
      root: fixture.linked,
      exactRelativePaths: [TRANSACTION_METADATA_PATHS[0]]
    }
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    const transactionRelativePath = `coordination/release-intake/archive/.evidence-publish-${process.pid}-${crypto.randomUUID()}`;
    const registration = registerMutationMetadataRoot(monitor, {
      root: fixture.linked,
      relativePath: transactionRelativePath
    });
    assert.equal(registration.relativePath, transactionRelativePath);
    const reboundState = readMutationEpochState(monitor, { requestSample: false });
    assert.equal(reboundState.sourceEpoch, baseline.sourceEpoch);
    assert.equal(reboundState.metadataEpoch, baseline.metadataEpoch);
    assert.equal(reboundState.xattrEpoch, baseline.xattrEpoch);
    assert.equal(
      BigInt(reboundState.typedFsevents.journalFlushSequence)
        - BigInt(baseline.typedFsevents.journalFlushSequence),
      4n
    );
    const transactionRoot = path.join(fixture.linked, ...transactionRelativePath.split("/"));
    fs.mkdirSync(transactionRoot);
    fs.writeFileSync(path.join(transactionRoot, "journal.json"), "registered metadata\n");
    const registeredState = settleMutationEpochState(monitor);
    assert.equal(registeredState.sourceEpoch, baseline.sourceEpoch);
    assert.ok(registeredState.metadataEpoch > baseline.metadataEpoch);
    assert.equal(
      BigInt(registeredState.typedFsevents.journalFlushSequence)
        - BigInt(reboundState.typedFsevents.journalFlushSequence),
      4n
    );
    const sibling = `${transactionRoot}-not-a-canonical-uuid`;
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "source.txt"), "must be source\n");
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > registeredState.sourceEpoch);
    assert.equal(terminalState.metadataEpoch, registeredState.metadataEpoch);
    assert.equal(
      BigInt(terminalState.typedFsevents.journalFlushSequence)
        - BigInt(registeredState.typedFsevents.journalFlushSequence),
      4n
    );
    const noopState = settleMutationEpochState(monitor);
    assert.equal(noopState.sourceEpoch, terminalState.sourceEpoch);
    assert.equal(noopState.metadataEpoch, terminalState.metadataEpoch);
    assert.equal(noopState.xattrEpoch, terminalState.xattrEpoch);
    assert.equal(
      BigInt(noopState.typedFsevents.journalFlushSequence)
        - BigInt(terminalState.typedFsevents.journalFlushSequence),
      2n
    );
    terminalState = noopState;
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A auto monitor classifies its exact archive parent namespace as transaction metadata", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const {
    MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS,
    TRANSACTION_METADATA_PATHS,
    registerMutationMetadataRoot,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  assert.deepEqual(
    MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS,
    [
      ...TRANSACTION_METADATA_PATHS,
      "coordination/release-intake/archive"
    ]
  );
  assert.equal(TRANSACTION_METADATA_PATHS.length, 6);

  const archiveParent = path.join(fixture.linked, "coordination", "release-intake", "archive");
  fs.mkdirSync(archiveParent, { recursive: true });
  const monitor = startMutationEpochMonitor([fixture.linked], {
    watchMode: "auto",
    transactionMetadata: {
      root: fixture.linked,
      exactRelativePaths: MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS
    }
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    const transactionRelativePath = `coordination/release-intake/archive/.evidence-publish-${process.pid}-${crypto.randomUUID()}`;
    registerMutationMetadataRoot(monitor, {
      root: fixture.linked,
      relativePath: transactionRelativePath
    });
    const transactionRoot = path.join(fixture.linked, ...transactionRelativePath.split("/"));
    fs.mkdirSync(transactionRoot);
    fs.writeFileSync(path.join(transactionRoot, "journal.json"), "registered metadata\n");
    const registeredState = settleMutationEpochState(monitor);
    assert.equal(registeredState.sourceEpoch, baseline.sourceEpoch);
    assert.ok(registeredState.metadataEpoch > baseline.metadataEpoch);

    fs.writeFileSync(path.join(archiveParent, "not-transaction-metadata.txt"), "must remain source\n");
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > registeredState.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A auto monitor uses the most-specific logical policy for overlapping worktree roots", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const nested = path.join(fixture.repo, ".worktrees", "nested");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  git(fixture.repo, "worktree", "add", "-b", "feature/nested-overlap", nested, "main");
  const archiveParent = path.join(nested, "coordination", "release-intake", "archive");
  fs.mkdirSync(archiveParent, { recursive: true });
  const {
    MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS,
    registerMutationMetadataRoot,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, nested], {
    watchMode: "auto",
    transactionMetadata: {
      root: nested,
      exactRelativePaths: MANIFEST_TRANSACTION_MONITOR_METADATA_PATHS
    }
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    const transactionRelativePath = `coordination/release-intake/archive/.evidence-publish-${process.pid}-${crypto.randomUUID()}`;
    registerMutationMetadataRoot(monitor, {
      root: nested,
      relativePath: transactionRelativePath
    });
    const transactionRoot = path.join(nested, ...transactionRelativePath.split("/"));
    fs.mkdirSync(transactionRoot);
    fs.writeFileSync(path.join(transactionRoot, "journal.json"), "registered nested metadata\n");
    const registeredState = settleMutationEpochState(monitor);
    assert.equal(registeredState.sourceEpoch, baseline.sourceEpoch);
    assert.ok(registeredState.metadataEpoch > baseline.metadataEpoch);

    fs.writeFileSync(path.join(archiveParent, "not-transaction-metadata.txt"), "must remain source\n");
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > registeredState.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A recursive monitor ignores Git-ignored churn but detects a new nonignored path", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, ".gitignore"), "*.ignored\n");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.linked], { watchMode: "auto" });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    if (baseline.watchMode !== "recursive") {
      terminalState = baseline;
      t.skip("recursive watcher is unavailable on this platform");
      return;
    }
    fs.writeFileSync(path.join(fixture.linked, "background.ignored"), "ignored churn\n");
    const ignoredState = settleMutationEpochState(monitor);
    assert.equal(ignoredState.sourceEpoch, baseline.sourceEpoch);

    fs.writeFileSync(path.join(fixture.linked, "new-source.txt"), "must remain source\n");
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > ignoredState.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A recursive monitor ignores Git object-store churn but detects selected common-dir state", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    if (baseline.watchMode !== "recursive") {
      terminalState = baseline;
      t.skip("recursive watcher is unavailable on this platform");
      return;
    }

    execFileSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: fixture.repo,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      input: `proof-scope-object-${crypto.randomUUID()}\n`,
      timeout: TEST_CHILD_TIMEOUT_MS
    });
    const objectState = settleMutationEpochState(monitor);
    assert.equal(objectState.sourceEpoch, baseline.sourceEpoch);
    assert.equal(objectState.metadataEpoch, baseline.metadataEpoch);

    const alternateObjects = path.join(fixture.parent, "alternate-objects");
    fs.mkdirSync(path.join(alternateObjects, "info"), { recursive: true });
    fs.mkdirSync(path.join(alternateObjects, "pack"), { recursive: true });
    fs.writeFileSync(path.join(commonDir, "objects", "info", "alternates"), `${alternateObjects}\n`);
    const controlState = settleMutationEpochState(monitor);
    assert.ok(controlState.sourceEpoch > objectState.sourceEpoch);

    git(fixture.repo, "branch", `monitor-source-${crypto.randomUUID()}`);
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > controlState.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

function packedRefsWithAdditionalRecords(baseline, additionalRecords) {
  const lines = baseline.trimEnd().split("\n");
  const comments = [];
  const records = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith("#")) {
      comments.push(lines[index]);
      continue;
    }
    const record = [lines[index]];
    if (lines[index + 1]?.startsWith("^")) record.push(lines[++index]);
    records.push(record);
  }
  for (const record of additionalRecords) records.push([record]);
  records.sort((left, right) => {
    const leftRef = left[0].slice(left[0].indexOf(" ") + 1);
    const rightRef = right[0].slice(right[0].indexOf(" ") + 1);
    return Buffer.from(leftRef).compare(Buffer.from(rightRef));
  });
  return `${[...comments, ...records.flat()].join("\n")}\n`;
}

test("Gate A recursive monitor excludes the reserved Codex ref namespace and detects sibling refs", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  git(fixture.repo, "pack-refs", "--all");
  fs.mkdirSync(path.join(commonDir, "refs", "codex", "turn-diffs", "checkpoints"), { recursive: true });
  const packedRefsPath = path.join(commonDir, "packed-refs");
  const baselinePackedRefs = fs.readFileSync(packedRefsPath, "utf8");
  const head = git(fixture.repo, "rev-parse", "HEAD");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    if (baseline.watchMode !== "recursive") {
      terminalState = baseline;
      t.skip("recursive watcher is unavailable on this platform");
      return;
    }

    const internalRef = `refs/codex/turn-diffs/captures/${Date.now()}/${crypto.randomUUID()}/base`;
    const internalRefPath = path.join(commonDir, ...internalRef.split("/"));
    fs.mkdirSync(path.dirname(internalRefPath), { recursive: true });
    fs.writeFileSync(internalRefPath, `${head}\n`);
    fs.writeFileSync(packedRefsPath, packedRefsWithAdditionalRecords(
      baselinePackedRefs,
      [`${head} ${internalRef}`]
    ));
    fs.rmSync(internalRefPath);
    const internalState = settleMutationEpochState(monitor);
    assert.equal(internalState.sourceEpoch, baseline.sourceEpoch);
    assert.equal(internalState.metadataEpoch, baseline.metadataEpoch);

    const unownedNamespaceRef = `refs/codex-private-sibling/${crypto.randomUUID()}`;
    const unownedNamespacePath = path.join(commonDir, ...unownedNamespaceRef.split("/"));
    fs.mkdirSync(path.dirname(unownedNamespacePath), { recursive: true });
    fs.writeFileSync(unownedNamespacePath, `${head}\n`);
    const unownedNamespaceState = settleMutationEpochState(monitor);
    assert.ok(unownedNamespaceState.sourceEpoch > internalState.sourceEpoch);

    const externalRef = `refs/tags/monitor-source-${crypto.randomUUID()}`;
    fs.writeFileSync(
      packedRefsPath,
      packedRefsWithAdditionalRecords(
        baselinePackedRefs,
        [`${head} ${internalRef}`, `${head} ${externalRef}`]
      )
    );
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > unownedNamespaceState.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A recursive monitor detects a transient non-Codex packed ref restored before sampling", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  git(fixture.repo, "pack-refs", "--all");
  const packedRefsPath = path.join(commonDir, "packed-refs");
  const baselinePackedRefs = fs.readFileSync(packedRefsPath, "utf8");
  const head = git(fixture.repo, "rev-parse", "HEAD");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    if (baseline.watchMode !== "recursive") {
      terminalState = baseline;
      t.skip("recursive watcher is unavailable on this platform");
      return;
    }

    const externalRef = `refs/tags/transient-monitor-source-${crypto.randomUUID()}`;
    fs.writeFileSync(packedRefsPath, packedRefsWithAdditionalRecords(
      baselinePackedRefs,
      [`${head} ${externalRef}`]
    ));
    fs.writeFileSync(packedRefsPath, baselinePackedRefs);
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > baseline.sourceEpoch);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A recursive monitor accepts Git pack-refs lock protocol for reserved Codex refs", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  git(fixture.repo, "pack-refs", "--all", "--prune");
  const head = git(fixture.repo, "rev-parse", "HEAD");
  const {
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  let terminalState;
  try {
    const baseline = settleMutationEpochState(monitor);
    if (baseline.watchMode !== "recursive") {
      terminalState = baseline;
      t.skip("recursive watcher is unavailable on this platform");
      return;
    }

    const internalRef = `refs/codex/turn-diffs/captures/${Date.now()}/${crypto.randomUUID()}/base`;
    git(fixture.repo, "update-ref", internalRef, head);
    git(fixture.repo, "pack-refs", "--all", "--prune");
    terminalState = settleMutationEpochState(monitor);
    assert.equal(terminalState.sourceEpoch, baseline.sourceEpoch);
    assert.equal(terminalState.metadataEpoch, baseline.metadataEpoch);
    assert.equal(fs.existsSync(path.join(commonDir, "packed-refs.lock")), false);
  } finally {
    if (!monitor.stopped) {
      const current = terminalState ?? settleMutationEpochState(monitor);
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: current.sourceEpoch,
        expectedMetadataEpoch: current.metadataEpoch
      });
    }
  }
});

test("Gate A recursive monitor fails closed on duplicate excluded packed refs", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  git(fixture.repo, "pack-refs", "--all");
  const packedRefsPath = path.join(commonDir, "packed-refs");
  const baselinePackedRefs = fs.readFileSync(packedRefsPath, "utf8");
  const head = git(fixture.repo, "rev-parse", "HEAD");
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  if (baseline.watchMode !== "recursive") {
    t.skip("recursive watcher is unavailable on this platform");
    return;
  }

  const internalRef = `refs/codex/turn-diffs/captures/${Date.now()}/${crypto.randomUUID()}/base`;
  fs.writeFileSync(
    packedRefsPath,
    packedRefsWithAdditionalRecords(
      baselinePackedRefs,
      [`${head} ${internalRef}`, `${"0".repeat(40)} ${internalRef}`]
    )
  );
  assert.throws(() => settleMutationEpochState(monitor));
});

test("Gate A recursive monitor fails closed when a sorted packed-refs file is reordered", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const commonDir = path.join(fixture.repo, ".git");
  git(fixture.repo, "pack-refs", "--all");
  const packedRefsPath = path.join(commonDir, "packed-refs");
  const baselinePackedRefs = fs.readFileSync(packedRefsPath, "utf8");
  assert.match(baselinePackedRefs.split("\n", 1)[0], /\bsorted\b/u);
  const head = git(fixture.repo, "rev-parse", "HEAD");
  const {
    abortMutationEpochMonitor,
    settleMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([fixture.repo, fixture.linked, commonDir], {
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const baseline = settleMutationEpochState(monitor);
  if (baseline.watchMode !== "recursive") {
    t.skip("recursive watcher is unavailable on this platform");
    return;
  }

  const internalRef = `refs/codex/turn-diffs/captures/${Date.now()}/${crypto.randomUUID()}/base`;
  fs.writeFileSync(
    packedRefsPath,
    `${baselinePackedRefs.trimEnd()}\n${head} ${internalRef}\n`
  );
  assert.throws(() => settleMutationEpochState(monitor));
});

test("a mutation monitor self-terminates and removes scratch after its parent is SIGKILLed", async (t) => {
  const fixture = makeFixture();
  let watcherPid;
  let scratch;
  t.after(() => {
    if (watcherPid && processIsAlive(watcherPid)) {
      try { process.kill(watcherPid, "SIGKILL"); } catch {}
    }
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  });
  const helper = path.join(fixture.parent, "monitor-parent.mjs");
  fs.writeFileSync(helper, `import { startMutationEpochMonitor } from ${JSON.stringify(libraryUrl)};\nconst monitor = startMutationEpochMonitor(${JSON.stringify([fixture.linked, path.join(fixture.repo, ".git")])});\nconsole.log(JSON.stringify({ watcherPid: monitor.child.pid, scratch: monitor.scratch }));\nsetInterval(() => {}, 60_000);\n`);
  const parent = spawn(process.execPath, [helper], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  parent.stdout.on("data", (chunk) => { stdout += chunk; });
  parent.stderr.on("data", (chunk) => { stderr += chunk; });
  assert.equal(await waitForCondition(() => stdout.includes("\n") || parent.exitCode !== null, 5_000), true, stderr);
  assert.equal(parent.exitCode, null, stderr);
  ({ watcherPid, scratch } = JSON.parse(stdout.trim().split("\n")[0]));
  assert.equal(processIsAlive(watcherPid), true);
  process.kill(parent.pid, "SIGKILL");
  await new Promise((resolve) => parent.once("close", resolve));
  assert.equal(await waitForCondition(() => !processIsAlive(watcherPid) && !fs.existsSync(scratch), 3_000), true);
});

test("writer bootstrap monitor catches a transient early-candidate mutation during a later initial scan", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const earlyPath = path.join(fixture.linked, "tracked.txt");
  fs.writeFileSync(earlyPath, "bootstrap baseline\n");
  const later = path.join(fixture.parent, "linked bootstrap later");
  git(fixture.repo, "worktree", "add", "-b", "feature/bootstrap-later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "bootstrap-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>bootstrap scan</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  const bin = path.join(fixture.parent, "bootstrap-bin");
  fs.mkdirSync(bin);
  const marker = path.join(fixture.parent, "bootstrap-fired");
  const backup = path.join(fixture.parent, "bootstrap-original");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    if [ ! -e "$BOOTSTRAP_MARKER" ]; then\n      cp "$BOOTSTRAP_TARGET" "$BOOTSTRAP_BACKUP"\n      printf 'transient bootstrap mutation\\n' > "$BOOTSTRAP_TARGET"\n      "${python}" "$@"\n      status=$?\n      cp "$BOOTSTRAP_BACKUP" "$BOOTSTRAP_TARGET"\n      : > "$BOOTSTRAP_MARKER"\n      exit "$status"\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(writer, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    BOOTSTRAP_MARKER: marker,
    BOOTSTRAP_TARGET: earlyPath,
    BOOTSTRAP_BACKUP: backup
  });
  assert.equal(fs.existsSync(marker), true, result.stderr || result.stdout);
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /bootstrap|mutation|epoch|drift|inventory/i);
  for (const manifestPath of repositoryArchiveManifestPaths(fixture)) assert.equal(fs.existsSync(manifestPath), false);
});

test("writer terminal barrier rejects candidate mutation after the final relist returns stale bytes", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const target = path.join(fixture.linked, "tracked.txt");
  fs.writeFileSync(target, "terminal baseline\n");
  const bin = path.join(fixture.parent, "terminal-git-bin");
  fs.mkdirSync(bin);
  const counter = path.join(fixture.parent, "terminal-worktree-list-count");
  const marker = path.join(fixture.parent, "terminal-mutated");
  const realGit = execFileSync("which", ["git"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "git");
  fs.writeFileSync(shim, `#!/bin/sh\nif [ "$1" = worktree ] && [ "$2" = list ]; then\n  count=0\n  if [ -f "$TERMINAL_COUNTER" ]; then count=$(cat "$TERMINAL_COUNTER"); fi\n  count=$((count + 1))\n  printf '%s' "$count" > "$TERMINAL_COUNTER"\n  output="$TERMINAL_COUNTER.output.$$"\n  "${realGit}" "$@" > "$output"\n  status=$?\n  if [ "$count" -eq 5 ]; then printf '\\nterminal post-relist mutation\\n' >> "$TERMINAL_TARGET"; : > "$TERMINAL_MARKER"; fi\n  cat "$output"\n  rm -f "$output"\n  exit "$status"\nfi\nexec "${realGit}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(writer, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    TERMINAL_COUNTER: counter,
    TERMINAL_MARKER: marker,
    TERMINAL_TARGET: target
  });
  assert.equal(fs.existsSync(marker), true, `${result.stderr || result.stdout}\nworktree list count: ${fs.existsSync(counter) ? fs.readFileSync(counter, "utf8") : "missing"}`);
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /terminal|mutation|epoch|drift|publication/i);
  for (const manifestPath of repositoryArchiveManifestPaths(fixture)) assert.equal(fs.existsSync(manifestPath), false);
});

test("writer terminal barrier binds metadata epoch and cannot commit a six-manifest mutation during stop quiet", async (t) => {
  const fixture = makeFixture();
  const intake = path.join(fixture.linked, "coordination", "release-intake");
  fs.mkdirSync(intake, { recursive: true });
  fs.writeFileSync(path.join(intake, "latest-A25-dirty-tree-map.json"), `${JSON.stringify({
    statusSignature: "metadata-stop-signature",
    statusCounts: { expandedStatusEntries: 1 }
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "metadata stop baseline\n");
  const archive = path.join(intake, "archive");
  const finalManifest = path.join(archive, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md");
  let fired = false;
  let tamperTimer;
  let manifestPoll;
  const asyncWriter = runAsyncFrom(writer, fixture, fixture.linked);
  t.after(() => {
    clearTimeout(tamperTimer);
    clearInterval(manifestPoll);
    asyncWriter.terminate();
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  });
  await waitForPath(archive);
  manifestPoll = setInterval(() => {
    if (fired || !fs.existsSync(finalManifest)) return;
    fired = true;
    clearInterval(manifestPoll);
    tamperTimer = setTimeout(() => {
      try { fs.appendFileSync(finalManifest, "\nindependent metadata stop mutation\n"); } catch {}
    }, 35);
  }, 5);
  const result = await asyncWriter.completed;
  clearTimeout(tamperTimer);
  clearInterval(manifestPoll);
  assert.equal(fired, true);
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /metadata|epoch|terminal|rollback|recovery/i);
  const recoveryDirectories = fs.existsSync(archive)
    ? fs.readdirSync(archive).filter((name) => name.startsWith(".evidence-publish-"))
    : [];
  const finalFiles = repositoryArchiveManifestPaths({ ...fixture, repo: fixture.linked }).filter(fs.existsSync);
  assert.ok(recoveryDirectories.length > 0 || finalFiles.length === 0);
});

test("writer refuses global drift in an early worktree caused while scanning a later worktree", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "early dirty state\n");
  const later = path.join(fixture.parent, "linked later");
  git(fixture.repo, "worktree", "add", "-b", "feature/later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "later-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>later worktree</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  const bin = path.join(fixture.parent, "bin");
  fs.mkdirSync(bin);
  const marker = path.join(fixture.parent, "drift-fired");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    if [ ! -e "$DRIFT_MARKER" ]; then\n      printf '\\ndrift while later worktree scans\\n' >> "$DRIFT_TARGET"\n      : > "$DRIFT_MARKER"\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(writer, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    DRIFT_MARKER: marker,
    DRIFT_TARGET: path.join(fixture.linked, "tracked.txt")
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /global|drift|current/i);
  assert.equal(fs.existsSync(path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json")), false);
});

test("writer mutation epoch rejects an early candidate changed during the second final round before publication", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const earlyPath = path.join(fixture.linked, "tracked.txt");
  fs.writeFileSync(earlyPath, "writer final-round baseline\n");
  const later = path.join(fixture.parent, "linked writer final later");
  git(fixture.repo, "worktree", "add", "-b", "feature/writer-final-later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "writer-final-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>writer final</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  const bin = path.join(fixture.parent, "writer-final-bin");
  fs.mkdirSync(bin);
  const counter = path.join(fixture.parent, "writer-final-count");
  const marker = path.join(fixture.parent, "writer-final-mutated");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    count=0\n    if [ -f "$ROUND_COUNTER" ]; then count=$(cat "$ROUND_COUNTER"); fi\n    count=$((count + 1))\n    printf '%s' "$count" > "$ROUND_COUNTER"\n    if [ "$count" -eq 13 ]; then printf '\\nwriter round-two drift\\n' >> "$ROUND_TARGET"; : > "$ROUND_MARKER"; fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(writer, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    ROUND_COUNTER: counter,
    ROUND_TARGET: earlyPath,
    ROUND_MARKER: marker
  });
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(marker), true);
  assert.match(`${result.stdout}\n${result.stderr}`, /mutation|epoch|quiescen|drift|final round/i);
  for (const manifestPath of repositoryArchiveManifestPaths(fixture)) assert.equal(fs.existsSync(manifestPath), false);
});

test("current gate rechecks an early worktree after a later candidate scan and never mutates manifests", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "early archived state\n");
  const later = path.join(fixture.parent, "linked gate later");
  git(fixture.repo, "worktree", "add", "-b", "feature/gate-later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "gate-later-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>later gate worktree</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.equal(run(writer, fixture).status, 0);
  const manifestSnapshot = snapshotFileBytes(repositoryArchiveManifestPaths(fixture));
  const bin = path.join(fixture.parent, "gate-drift-bin");
  fs.mkdirSync(bin);
  const marker = path.join(fixture.parent, "gate-drift-fired");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    if [ ! -e "$DRIFT_MARKER" ]; then\n      printf '\\ngate drift\\n' >> "$DRIFT_TARGET"\n      : > "$DRIFT_MARKER"\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(gate, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    DRIFT_MARKER: marker,
    DRIFT_TARGET: path.join(fixture.linked, "tracked.txt")
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /global|drift|current|fingerprint/i);
  assertFileBytesUnchanged(manifestSnapshot);
});

test("current gate mutation epoch rejects an early candidate changed during its second final round", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const earlyPath = path.join(fixture.linked, "tracked.txt");
  fs.writeFileSync(earlyPath, "gate final-round baseline\n");
  const later = path.join(fixture.parent, "linked gate final later");
  git(fixture.repo, "worktree", "add", "-b", "feature/gate-final-later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "gate-final-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>gate final</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.equal(run(writer, fixture).status, 0);
  const manifestSnapshot = snapshotFileBytes(repositoryArchiveManifestPaths(fixture));
  const bin = path.join(fixture.parent, "gate-final-bin");
  fs.mkdirSync(bin);
  const counter = path.join(fixture.parent, "gate-final-count");
  const marker = path.join(fixture.parent, "gate-final-mutated");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    count=0\n    if [ -f "$ROUND_COUNTER" ]; then count=$(cat "$ROUND_COUNTER"); fi\n    count=$((count + 1))\n    printf '%s' "$count" > "$ROUND_COUNTER"\n    if [ "$count" -eq 13 ]; then printf '\\ngate round-two drift\\n' >> "$ROUND_TARGET"; : > "$ROUND_MARKER"; fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(gate, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    ROUND_COUNTER: counter,
    ROUND_TARGET: earlyPath,
    ROUND_MARKER: marker
  });
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(marker), true);
  assert.match(`${result.stdout}\n${result.stderr}`, /mutation|epoch|quiescen|drift|final round/i);
  assertFileBytesUnchanged(manifestSnapshot);
});

test("current gate rejects candidate add, remove, HEAD, and branch identity drift discovered after its first scan", (t) => {
  for (const driftKind of ["add", "remove", "identity", "branch"]) {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
    fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "early candidate state\n");
    const later = path.join(fixture.parent, `linked later ${driftKind}`);
    git(fixture.repo, "worktree", "add", "-b", `feature/later-${driftKind}`, later, "main");
    const ooxmlRoot = path.join(fixture.parent, `later-ooxml-${driftKind}`);
    fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
    fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), `<w:t>${driftKind}</w:t>`);
    execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
    let dormant = null;
    if (driftKind === "add") {
      dormant = path.join(fixture.parent, "linked dormant");
      git(fixture.repo, "worktree", "add", "-b", "feature/dormant", dormant, "main");
    }
    assert.equal(run(writer, fixture).status, 0);
    const manifestSnapshot = snapshotFileBytes(repositoryArchiveManifestPaths(fixture));
    const action = path.join(fixture.parent, `gate-${driftKind}-action.mjs`);
    const actionSource = driftKind === "add"
      ? `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(path.join(dormant, "added.txt"))}, "added candidate\\n");`
      : driftKind === "remove"
        ? `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(path.join(fixture.linked, "tracked.txt"))}, "base\\n");`
        : driftKind === "identity"
          ? `import { execFileSync } from "node:child_process"; execFileSync("git", ["commit", "--allow-empty", "-m", "identity drift"], { cwd: ${JSON.stringify(fixture.linked)}, stdio: "ignore" });`
          : `import { execFileSync } from "node:child_process"; execFileSync("git", ["branch", "-m", "feature/renamed-during-gate"], { cwd: ${JSON.stringify(fixture.linked)}, stdio: "ignore" });`;
    fs.writeFileSync(action, actionSource);
    const bin = path.join(fixture.parent, `gate-${driftKind}-bin`);
    fs.mkdirSync(bin);
    const marker = path.join(fixture.parent, `gate-${driftKind}-fired`);
    const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
    const shim = path.join(bin, "python3");
    fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    if [ ! -e "$DRIFT_MARKER" ]; then\n      : > "$DRIFT_MARKER"\n      "$DRIFT_NODE" "$DRIFT_ACTION"\n    fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
    fs.chmodSync(shim, 0o755);
    const result = run(gate, fixture, {
      PATH: `${bin}:${process.env.PATH}`,
      DRIFT_MARKER: marker,
      DRIFT_NODE: process.execPath,
      DRIFT_ACTION: action
    });
    assert.notEqual(result.status, 0, `${driftKind} candidate drift unexpectedly passed`);
    assert.match(`${result.stdout}\n${result.stderr}`, /candidate|identity|global|drift|unexpected|missing|mutation|epoch/i);
    assertFileBytesUnchanged(manifestSnapshot);
  }
});

test("current gate detects all six repository manifest bytes mutated during its final live-state pass", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "manifest-race candidate\n");
  const later = path.join(fixture.parent, "linked manifest race later");
  git(fixture.repo, "worktree", "add", "-b", "feature/manifest-race-later", later, "main");
  const ooxmlRoot = path.join(fixture.parent, "manifest-race-ooxml");
  fs.mkdirSync(path.join(ooxmlRoot, "word"), { recursive: true });
  fs.writeFileSync(path.join(ooxmlRoot, "word", "document.xml"), "<w:t>manifest race</w:t>");
  execFileSync("zip", ["-q", "-r", path.join(later, "later.docx"), "word"], { cwd: ooxmlRoot, timeout: TEST_CHILD_TIMEOUT_MS });
  assert.equal(run(writer, fixture).status, 0);
  const manifestTargets = repositoryArchiveManifestPaths(fixture);
  const mutationAction = path.join(fixture.parent, "mutate-six-manifests.mjs");
  fs.writeFileSync(mutationAction, `import fs from "node:fs"; for (const target of ${JSON.stringify(manifestTargets)}) fs.appendFileSync(target, "\\nconcurrent manifest mutation\\n");`);
  const bin = path.join(fixture.parent, "manifest-race-bin");
  fs.mkdirSync(bin);
  const counter = path.join(fixture.parent, "manifest-race-count");
  const python = execFileSync("which", ["python3"], { encoding: "utf8", timeout: TEST_CHILD_TIMEOUT_MS }).trim();
  const shim = path.join(bin, "python3");
  fs.writeFileSync(shim, `#!/bin/sh\ncase "$2" in\n  *zipfile.ZipFile*)\n    count=0\n    if [ -f "$RACE_COUNTER" ]; then count=$(cat "$RACE_COUNTER"); fi\n    count=$((count + 1))\n    printf '%s' "$count" > "$RACE_COUNTER"\n    if [ "$count" -eq 7 ]; then "$RACE_NODE" "$RACE_ACTION"; fi\n  ;;\nesac\nexec "${python}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
  const result = run(gate, fixture, {
    PATH: `${bin}:${process.env.PATH}`,
    RACE_COUNTER: counter,
    RACE_NODE: process.execPath,
    RACE_ACTION: mutationAction
  });
  assert.notEqual(result.status, 0);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /manifest bytes changed during current gate/i);
  for (const target of manifestTargets) {
    const escaped = path.basename(target).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    assert.match(output, new RegExp(escaped));
  }
  assert.ok(Number(fs.readFileSync(counter, "utf8")) >= 7);
});

test("empty archive sets materialize and worktree drift is rejected", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { collectWorktreeSnapshot, ensureEvidenceRoot, materializeArchiveSet } = await import(libraryUrl);
  const marker = ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const empty = materializeArchiveSet({
    evidenceRoot: fixture.evidenceRoot,
    marker,
    dirtyMap: { statusSignature: "empty", statusCounts: { expandedStatusEntries: 0 } },
    snapshots: []
  });
  assert.ok(fs.existsSync(path.join(fixture.evidenceRoot, "sets", empty.archiveSetFingerprint, "archive-set.json")));
  fs.writeFileSync(path.join(fixture.linked, "tracked.txt"), "before drift\n");
  const worktree = { path: fixture.linked, branch: "feature/archive", head: git(fixture.linked, "rev-parse", "HEAD") };
  assert.throws(() => collectWorktreeSnapshot(worktree, {
    includeTar: false,
    beforeDriftCheck: () => fs.appendFileSync(path.join(fixture.linked, "tracked.txt"), "after drift\n")
  }), /drift/i);
});

test("internal symlinks restore, escaping symlinks fail, and invalid artifacts are not trusted", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { verifyArtifact } = await import(libraryUrl);
  fs.writeFileSync(path.join(fixture.linked, "target.txt"), "target\n");
  fs.linkSync(path.join(fixture.linked, "target.txt"), path.join(fixture.linked, "hardlink-target.txt"));
  fs.symlinkSync("target.txt", path.join(fixture.linked, "inside-link"));
  assert.equal(run(writer, fixture).status, 0);
  const symlinkGate = run(gate, fixture);
  assert.equal(symlinkGate.status, 0, symlinkGate.stderr || symlinkGate.stdout);
  fs.rmSync(path.join(fixture.linked, "inside-link"));
  fs.symlinkSync("../outside.txt", path.join(fixture.linked, "escape-link"));
  const escaped = run(writer, fixture);
  assert.notEqual(escaped.status, 0);
  assert.match(`${escaped.stdout}\n${escaped.stderr}`, /symlink escape/i);
  const failures = [];
  const valid = verifyArtifact(fixture.evidenceRoot, { path: "missing", bytes: 1, sha256: "0".repeat(64) }, "missing", failures);
  assert.equal(valid, false);
  assert.equal(failures.length, 1);
  const artifactRoot = path.join(fixture.parent, "artifact-root");
  const outside = path.join(fixture.parent, "outside-artifacts");
  fs.mkdirSync(artifactRoot);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "artifact"), "outside");
  fs.symlinkSync(outside, path.join(artifactRoot, "sets"));
  const symlinkFailures = [];
  const symlinkValid = verifyArtifact(artifactRoot, {
    path: "sets/artifact",
    bytes: 7,
    sha256: crypto.createHash("sha256").update("outside").digest("hex")
  }, "symlink-parent", symlinkFailures);
  assert.equal(symlinkValid, false);
  assert.ok(symlinkFailures.some((failure) => /symlink/i.test(failure)));
});

test("generic artifact verification keeps the artifact and CAS inode bound across ABA", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, verifyArtifact } = await import(libraryUrl);
  ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const payload = Buffer.from("attested generic artifact\n");
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  const relativePath = "sets/generic-artifact-fixture/artifact.bin";
  const artifactPath = path.join(fixture.evidenceRoot, relativePath);
  const blobPath = path.join(
    fixture.evidenceRoot,
    "blobs",
    "sha256",
    sha256.slice(0, 2),
    sha256
  );
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.mkdirSync(path.dirname(blobPath), { recursive: true });
  fs.writeFileSync(blobPath, payload, { mode: 0o600 });
  fs.chmodSync(blobPath, 0o600);
  fs.linkSync(blobPath, artifactPath);
  const descriptor = { bytes: payload.length, path: relativePath, sha256 };
  const baselineFailures = [];
  assert.equal(verifyArtifact(fixture.evidenceRoot, descriptor, "generic", baselineFailures), true);
  assert.deepEqual(baselineFailures, []);

  const replacement = Buffer.from("different current artifact\n");
  const originalOpenSync = fs.openSync;
  let swapped = false;
  fs.openSync = function genericArtifactAbaSwap(candidate, ...args) {
    if (!swapped && candidate === blobPath) {
      swapped = true;
      fs.rmSync(artifactPath);
      fs.writeFileSync(artifactPath, replacement, { mode: 0o600 });
      fs.chmodSync(artifactPath, 0o600);
    }
    return originalOpenSync.call(this, candidate, ...args);
  };
  const failures = [];
  let valid;
  try {
    valid = verifyArtifact(fixture.evidenceRoot, descriptor, "generic", failures);
  } finally {
    fs.openSync = originalOpenSync;
  }
  assert.equal(swapped, true);
  assert.equal(valid, false);
  assert.ok(failures.some((failure) => /content-addressed hardlink|changed during verification/i.test(failure)));
  assert.ok(fs.readFileSync(artifactPath).equals(replacement));
});

test("generic artifact verification rejects sparse size abuse before reading content", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const { ensureEvidenceRoot, verifyArtifact } = await import(libraryUrl);
  ensureEvidenceRoot({ evidenceRoot: fixture.evidenceRoot, repositoryId: TEST_REPOSITORY_ID });
  const relativePath = "sets/sparse-artifact-fixture/oversized.bin";
  const artifactPath = path.join(fixture.evidenceRoot, relativePath);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  const oversizedBytes = (8 * 1024 * 1024 * 1024) + 1;
  const descriptor = fs.openSync(artifactPath, "w", 0o600);
  try {
    fs.ftruncateSync(descriptor, oversizedBytes);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(artifactPath, 0o600);
  const originalReadSync = fs.readSync;
  let readCalls = 0;
  fs.readSync = function rejectSparseArtifactRead(...args) {
    readCalls += 1;
    throw new Error("sparse artifact content must not be read");
  };
  try {
    let failures = [];
    let valid = verifyArtifact(fixture.evidenceRoot, {
      bytes: 1,
      path: relativePath,
      sha256: "0".repeat(64)
    }, "sparse-size-mismatch", failures);
    assert.equal(valid, false);
    assert.equal(readCalls, 0);
    assert.ok(failures.some((failure) => /bytes mismatch before reading/i.test(failure)), failures.join("\n"));

    failures = [];
    valid = verifyArtifact(fixture.evidenceRoot, {
      bytes: oversizedBytes,
      path: relativePath,
      sha256: "0".repeat(64)
    }, "sparse-cap", failures);
    assert.equal(valid, false);
    assert.equal(readCalls, 0);
    assert.ok(failures.some((failure) => /materialization cap/i.test(failure)), failures.join("\n"));
  } finally {
    fs.readSync = originalReadSync;
  }
});

test("full archive-set verification applies the inventory cap before reading sparse content", async (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  assert.equal(run(writer, fixture).status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(
    fixture.repo,
    "coordination",
    "release-intake",
    "archive",
    "2026-06-30-A25-linked-worktree-archive-manifest.json"
  ), "utf8"));
  const entry = manifest.archivedWorktrees[0];
  const inventoryArtifact = entry.artifacts.untrackedInventory;
  const inventoryPath = path.join(fixture.evidenceRoot, inventoryArtifact.path);
  const oversizedBytes = (512 * 1024 * 1024) + 1;
  const oversizedSha256 = "0".repeat(64);
  const oversizedBlobPath = path.join(
    fixture.evidenceRoot,
    "blobs",
    "sha256",
    oversizedSha256.slice(0, 2),
    oversizedSha256
  );
  fs.mkdirSync(path.dirname(oversizedBlobPath), { recursive: true });
  const descriptor = fs.openSync(oversizedBlobPath, "w", 0o600);
  try {
    fs.ftruncateSync(descriptor, oversizedBytes);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(oversizedBlobPath, 0o600);
  fs.rmSync(inventoryPath);
  fs.linkSync(oversizedBlobPath, inventoryPath);
  entry.artifacts.untrackedInventory = {
    ...inventoryArtifact,
    bytes: oversizedBytes,
    sha256: oversizedSha256
  };
  const sparseIdentity = fs.statSync(inventoryPath, { bigint: true });
  const originalReadSync = fs.readSync;
  let sparseReadCalls = 0;
  fs.readSync = function rejectFullSetSparseInventoryRead(fileDescriptor, ...args) {
    const status = fs.fstatSync(fileDescriptor, { bigint: true });
    if (status.dev === sparseIdentity.dev && status.ino === sparseIdentity.ino) {
      sparseReadCalls += 1;
      throw new Error("full-set sparse inventory content must not be read");
    }
    return originalReadSync.call(this, fileDescriptor, ...args);
  };
  const { verifyArchiveSetEvidence } = await import(libraryUrl);
  const failures = [];
  try {
    verifyArchiveSetEvidence(fixture.evidenceRoot, manifest, failures);
  } finally {
    fs.readSync = originalReadSync;
  }
  assert.equal(sparseReadCalls, 0);
  assert.ok(failures.some((failure) => /inventory.*materialization cap|materialization cap.*inventory/i.test(failure)), failures.join("\n"));
});

const TYPED_FSEVENTS_COMMAND_BYTES = 20;
const TYPED_FSEVENTS_ACK_BYTES = 136;
const TYPED_FSEVENTS_ACK_COMMIT_BYTES = 72;
const TYPED_FSEVENTS_ACK_COMMIT_MAGIC = "MFAC";
const TYPED_FSEVENTS_PROTOCOL_VERSION = 2;
const TYPED_FSEVENTS_JOURNAL_HEADER_BYTES = 40;
const TYPED_FSEVENTS_JOURNAL_MAGIC = "MFSJ";

function typedFseventsCommand(type, sequence) {
  const command = Buffer.alloc(TYPED_FSEVENTS_COMMAND_BYTES);
  command.write("MFSC", 0, "ascii");
  command.writeUInt16LE(TYPED_FSEVENTS_PROTOCOL_VERSION, 4);
  command.writeUInt16LE(type, 6);
  command.writeUInt32LE(TYPED_FSEVENTS_COMMAND_BYTES, 8);
  command.writeBigUInt64LE(BigInt(sequence), 12);
  return command;
}

function publishTypedFseventsCommand(commandPath, type, sequence) {
  const directory = path.dirname(commandPath);
  const temporaryPath = path.join(
    directory,
    `.command.bin.tmp-${process.pid}-${sequence}-${crypto.randomUUID()}`
  );
  const previous = fs.lstatSync(commandPath, { bigint: true });
  const directoryDescriptor = fs.openSync(
    directory,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
  );
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      temporaryPath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
      0o600
    );
    const command = typedFseventsCommand(type, sequence);
    assert.equal(fs.writeSync(descriptor, command, 0, command.length, 0), command.length);
    fs.ftruncateSync(descriptor, command.length);
    fs.fsyncSync(descriptor);
    const temporary = fs.fstatSync(descriptor, { bigint: true });
    assert.equal(temporary.mode & 0o7777n, 0o600n);
    assert.equal(temporary.nlink, 1n);
    fs.closeSync(descriptor);
    descriptor = -1;
    fs.renameSync(temporaryPath, commandPath);
    fs.fsyncSync(directoryDescriptor);
    const current = fs.lstatSync(commandPath, { bigint: true });
    assert.equal(current.mode & 0o7777n, 0o600n);
    assert.equal(current.nlink, 1n);
    assert.notEqual(current.ino, previous.ino, "each typed FSEvents command must publish a new inode");
    return current.ino;
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
    fs.closeSync(directoryDescriptor);
    fs.rmSync(temporaryPath, { force: true });
  }
}

function parseTypedFseventsAck(buffer) {
  if (buffer.length !== TYPED_FSEVENTS_ACK_BYTES) throw new Error("typed FSEvents acknowledgement is truncated");
  if (buffer.toString("ascii", 0, 4) !== "MFSA") throw new Error("typed FSEvents acknowledgement magic is invalid");
  if (buffer.readUInt16LE(4) !== TYPED_FSEVENTS_PROTOCOL_VERSION
    || buffer.readUInt32LE(8) !== TYPED_FSEVENTS_ACK_BYTES) {
    throw new Error("typed FSEvents acknowledgement framing is invalid");
  }
  return {
    type: buffer.readUInt16LE(6),
    status: buffer.readUInt32LE(12),
    sequence: buffer.readBigUInt64LE(16),
    journalHighWater: buffer.readBigUInt64LE(24),
    entryCount: buffer.readBigUInt64LE(32),
    lastEventId: buffer.readBigUInt64LE(40),
    eventRootCount: buffer.readBigUInt64LE(48),
    eventRootFingerprint: buffer.subarray(56, 88),
    journalDevice: buffer.readBigUInt64LE(88),
    journalInode: buffer.readBigUInt64LE(96),
    journalSha256: buffer.subarray(104, 136)
  };
}

function typedFseventsAck({
  type,
  sequence,
  journalHighWater = 0n,
  entryCount = 0n,
  lastEventId = 0n,
  eventRootCount = 1n,
  eventRootFingerprint = crypto.createHash("sha256").update("default-root\0").digest(),
  journalDevice = 0n,
  journalInode = 0n,
  journalSha256 = crypto.createHash("sha256").update(Buffer.alloc(0)).digest()
}) {
  assert.equal(eventRootFingerprint.length, 32);
  assert.equal(journalSha256.length, 32);
  const acknowledgement = Buffer.alloc(TYPED_FSEVENTS_ACK_BYTES);
  acknowledgement.write("MFSA", 0, "ascii");
  acknowledgement.writeUInt16LE(TYPED_FSEVENTS_PROTOCOL_VERSION, 4);
  acknowledgement.writeUInt16LE(type, 6);
  acknowledgement.writeUInt32LE(TYPED_FSEVENTS_ACK_BYTES, 8);
  acknowledgement.writeUInt32LE(0, 12);
  acknowledgement.writeBigUInt64LE(BigInt(sequence), 16);
  acknowledgement.writeBigUInt64LE(BigInt(journalHighWater), 24);
  acknowledgement.writeBigUInt64LE(BigInt(entryCount), 32);
  acknowledgement.writeBigUInt64LE(BigInt(lastEventId), 40);
  acknowledgement.writeBigUInt64LE(BigInt(eventRootCount), 48);
  eventRootFingerprint.copy(acknowledgement, 56);
  acknowledgement.writeBigUInt64LE(BigInt(journalDevice), 88);
  acknowledgement.writeBigUInt64LE(BigInt(journalInode), 96);
  journalSha256.copy(acknowledgement, 104);
  return acknowledgement;
}

function typedFseventsAckCommit(acknowledgement, published) {
  const commit = Buffer.alloc(TYPED_FSEVENTS_ACK_COMMIT_BYTES);
  commit.write(TYPED_FSEVENTS_ACK_COMMIT_MAGIC, 0, "ascii");
  commit.writeUInt16LE(TYPED_FSEVENTS_PROTOCOL_VERSION, 4);
  commit.writeUInt16LE(acknowledgement.readUInt16LE(6), 6);
  commit.writeUInt32LE(TYPED_FSEVENTS_ACK_COMMIT_BYTES, 8);
  commit.writeUInt32LE(0, 12);
  commit.writeBigUInt64LE(acknowledgement.readBigUInt64LE(16), 16);
  commit.writeBigUInt64LE(BigInt(published.dev), 24);
  commit.writeBigUInt64LE(BigInt(published.ino), 32);
  crypto.createHash("sha256").update(acknowledgement).digest().copy(commit, 40);
  return commit;
}

function parseTypedFseventsAckCommit(buffer) {
  if (buffer.length !== TYPED_FSEVENTS_ACK_COMMIT_BYTES) {
    throw new Error("typed FSEvents acknowledgement commit is truncated");
  }
  if (buffer.toString("ascii", 0, 4) !== TYPED_FSEVENTS_ACK_COMMIT_MAGIC) {
    throw new Error("typed FSEvents acknowledgement commit magic is invalid");
  }
  if (buffer.readUInt16LE(4) !== TYPED_FSEVENTS_PROTOCOL_VERSION
    || buffer.readUInt32LE(8) !== TYPED_FSEVENTS_ACK_COMMIT_BYTES
    || buffer.readUInt32LE(12) !== 0) {
    throw new Error("typed FSEvents acknowledgement commit framing is invalid");
  }
  return {
    type: buffer.readUInt16LE(6),
    sequence: buffer.readBigUInt64LE(16),
    publishedDevice: buffer.readBigUInt64LE(24),
    publishedInode: buffer.readBigUInt64LE(32),
    acknowledgementSha256: buffer.subarray(40, 72)
  };
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
    && status.nlink === 1n
    && status.size === BigInt(expectedBytes);
}

function secureTypedFseventsJournalFrame(status, minimumBytes) {
  return status.isFile()
    && (status.mode & 0o7777n) === 0o600n
    && status.nlink === 1n
    && status.size >= BigInt(minimumBytes);
}

function sameTypedFseventsJournalIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
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

function readCommittedTypedFseventsAck(ackPath, {
  beforeVisibleValidation,
  expectedEventRootCount,
  expectedEventRootFingerprint
} = {}) {
  const commitPath = path.join(path.dirname(ackPath), "ack.commit");
  const journalPath = path.join(path.dirname(ackPath), "journal.bin");
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const nonBlock = fs.constants.O_NONBLOCK ?? 0;
  let acknowledgementDescriptor = -1;
  let commitDescriptor = -1;
  let journalDescriptor = -1;
  try {
    acknowledgementDescriptor = fs.openSync(ackPath, fs.constants.O_RDONLY | noFollow | nonBlock);
    commitDescriptor = fs.openSync(commitPath, fs.constants.O_RDONLY | noFollow | nonBlock);
    journalDescriptor = fs.openSync(journalPath, fs.constants.O_RDONLY | noFollow | nonBlock);
  } catch (error) {
    if (acknowledgementDescriptor >= 0) fs.closeSync(acknowledgementDescriptor);
    if (commitDescriptor >= 0) fs.closeSync(commitDescriptor);
    if (journalDescriptor >= 0) fs.closeSync(journalDescriptor);
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  let acknowledgement;
  let commit;
  let acknowledgementBefore;
  let acknowledgementAfter;
  let acknowledgementVisible;
  let acknowledgementFinal;
  let commitBefore;
  let commitAfter;
  let commitVisible;
  let commitFinal;
  let journalBefore;
  let journalAfter;
  let journalVisible;
  let journalFinal;
  let journalPrefix;
  let journalVerification;
  let transientRace = false;
  try {
    acknowledgementBefore = fs.fstatSync(acknowledgementDescriptor, { bigint: true });
    commitBefore = fs.fstatSync(commitDescriptor, { bigint: true });
    journalBefore = fs.fstatSync(journalDescriptor, { bigint: true });
    acknowledgement = fs.readFileSync(acknowledgementDescriptor);
    commit = fs.readFileSync(commitDescriptor);
    if (!secureTypedFseventsFrame(acknowledgementBefore, TYPED_FSEVENTS_ACK_BYTES)
      || !secureTypedFseventsFrame(commitBefore, TYPED_FSEVENTS_ACK_COMMIT_BYTES)
      || !secureTypedFseventsJournalFrame(journalBefore, 0)
      || acknowledgement.length !== TYPED_FSEVENTS_ACK_BYTES) return null;
    const highWater = acknowledgement.readBigUInt64LE(24);
    if (highWater > BigInt(Number.MAX_SAFE_INTEGER)
      || highWater > BigInt(bufferConstants.MAX_LENGTH)
      || highWater > journalBefore.size) return null;
    journalPrefix = readTypedFseventsPrefix(journalDescriptor, Number(highWater));
    acknowledgementAfter = fs.fstatSync(acknowledgementDescriptor, { bigint: true });
    commitAfter = fs.fstatSync(commitDescriptor, { bigint: true });
    journalAfter = fs.fstatSync(journalDescriptor, { bigint: true });
    beforeVisibleValidation?.({ ackPath, commitPath, journalPath });
    acknowledgementVisible = fs.lstatSync(ackPath, { bigint: true });
    commitVisible = fs.lstatSync(commitPath, { bigint: true });
    journalVisible = fs.lstatSync(journalPath, { bigint: true });
    journalVerification = readTypedFseventsPrefix(journalDescriptor, Number(highWater));
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
  if (journalPrefix === null || journalVerification === null
    || !secureTypedFseventsFrame(acknowledgementBefore, TYPED_FSEVENTS_ACK_BYTES)
    || !secureTypedFseventsFrame(acknowledgementAfter, TYPED_FSEVENTS_ACK_BYTES)
    || !secureTypedFseventsFrame(acknowledgementVisible, TYPED_FSEVENTS_ACK_BYTES)
    || !secureTypedFseventsFrame(acknowledgementFinal, TYPED_FSEVENTS_ACK_BYTES)
    || !secureTypedFseventsFrame(commitBefore, TYPED_FSEVENTS_ACK_COMMIT_BYTES)
    || !secureTypedFseventsFrame(commitAfter, TYPED_FSEVENTS_ACK_COMMIT_BYTES)
    || !secureTypedFseventsFrame(commitVisible, TYPED_FSEVENTS_ACK_COMMIT_BYTES)
    || !secureTypedFseventsFrame(commitFinal, TYPED_FSEVENTS_ACK_COMMIT_BYTES)
    || !sameTypedFseventsFrameSnapshot(acknowledgementBefore, acknowledgementAfter)
    || !sameTypedFseventsFrameSnapshot(acknowledgementAfter, acknowledgementVisible)
    || !sameTypedFseventsFrameSnapshot(acknowledgementVisible, acknowledgementFinal)
    || !sameTypedFseventsFrameSnapshot(commitBefore, commitAfter)
    || !sameTypedFseventsFrameSnapshot(commitAfter, commitVisible)
    || !sameTypedFseventsFrameSnapshot(commitVisible, commitFinal)
    || !secureTypedFseventsJournalFrame(journalBefore, acknowledgement.readBigUInt64LE(24))
    || !secureTypedFseventsJournalFrame(journalAfter, acknowledgement.readBigUInt64LE(24))
    || !secureTypedFseventsJournalFrame(journalVisible, acknowledgement.readBigUInt64LE(24))
    || !secureTypedFseventsJournalFrame(journalFinal, acknowledgement.readBigUInt64LE(24))
    || !sameTypedFseventsJournalIdentity(journalBefore, journalAfter)
    || !sameTypedFseventsJournalIdentity(journalAfter, journalVisible)
    || !sameTypedFseventsJournalIdentity(journalVisible, journalFinal)
    || !journalPrefix.equals(journalVerification)) {
    return null;
  }

  const parsedAcknowledgement = parseTypedFseventsAck(acknowledgement);
  const parsedCommit = parseTypedFseventsAckCommit(commit);
  const acknowledgementSha256 = crypto.createHash("sha256").update(acknowledgement).digest();
  if (parsedAcknowledgement.status !== 0
    || parsedCommit.type !== parsedAcknowledgement.type
    || parsedCommit.sequence !== parsedAcknowledgement.sequence
    || parsedCommit.publishedDevice !== acknowledgementFinal.dev
    || parsedCommit.publishedInode !== acknowledgementFinal.ino
    || !parsedCommit.acknowledgementSha256.equals(acknowledgementSha256)
    || parsedAcknowledgement.eventRootCount < 1n
    || parsedAcknowledgement.journalDevice !== journalFinal.dev
    || parsedAcknowledgement.journalInode !== journalFinal.ino
    || !parsedAcknowledgement.journalSha256.equals(
      crypto.createHash("sha256").update(journalPrefix).digest()
    )
    || (expectedEventRootCount !== undefined
      && parsedAcknowledgement.eventRootCount !== BigInt(expectedEventRootCount))
    || (expectedEventRootFingerprint !== undefined
      && !parsedAcknowledgement.eventRootFingerprint.equals(
        Buffer.from(expectedEventRootFingerprint, "hex")
      ))) {
    return null;
  }
  return {
    ...parsedAcknowledgement,
    journalPrefix,
    visibleInode: acknowledgementVisible.ino,
    commitVisibleInode: commitVisible.ino
  };
}

async function waitForTypedFseventsAck(
  ackPath,
  { type, sequence, previousInode, previousCommitInode, terminal = false },
  child,
  stderr,
  timeoutMs = 10_000
) {
  let acknowledgement;
  let matchingAcknowledgement = false;
  const matched = await waitForCondition(() => {
    matchingAcknowledgement = false;
    acknowledgement = readCommittedTypedFseventsAck(ackPath);
    matchingAcknowledgement = acknowledgement !== null
      && acknowledgement.type === type
      && acknowledgement.sequence === BigInt(sequence)
      && (previousInode === undefined || acknowledgement.visibleInode !== previousInode)
      && (previousCommitInode === undefined
        || acknowledgement.commitVisibleInode !== previousCommitInode);
    const exited = child.exitCode !== null || child.signalCode !== null;
    if (matchingAcknowledgement && terminal) return exited;
    if (matchingAcknowledgement) return !exited;
    return exited;
  }, timeoutMs);
  if (!matched
    || !matchingAcknowledgement
    || (terminal ? child.exitCode !== 0 : child.exitCode !== null || child.signalCode !== null)) {
    throw new Error(`typed FSEvents helper exited before acknowledgement (${stderr()})`);
  }
  return acknowledgement;
}

async function flushTypedFseventsUntil({
  commandPath,
  ackPath,
  child,
  stderr,
  previousAck,
  nextSequence,
  predicate,
  label,
  timeoutMs = 5_000
}) {
  const deadline = Date.now() + timeoutMs;
  let acknowledgement = previousAck;
  let sequence = BigInt(nextSequence);
  do {
    publishTypedFseventsCommand(commandPath, 1, sequence);
    acknowledgement = await waitForTypedFseventsAck(ackPath, {
      type: 2,
      sequence,
      previousInode: acknowledgement.visibleInode,
      previousCommitInode: acknowledgement.commitVisibleInode
    }, child, stderr, Math.max(1, deadline - Date.now()));
    sequence += 1n;
    if (predicate(acknowledgement)) {
      return { acknowledgement, nextSequence: sequence };
    }
  } while (Date.now() < deadline);
  throw new Error(`typed FSEvents ${label} did not reach a bounded flush endpoint`);
}

function typedFseventsJournalRecord({ sequence, eventId, flags, path: eventPath, type = 1 }) {
  const pathBuffer = Buffer.from(eventPath);
  const record = Buffer.alloc(TYPED_FSEVENTS_JOURNAL_HEADER_BYTES + pathBuffer.length);
  record.write(TYPED_FSEVENTS_JOURNAL_MAGIC, 0, "ascii");
  record.writeUInt16LE(1, 4);
  record.writeUInt16LE(type, 6);
  record.writeUInt32LE(record.length, 8);
  record.writeBigUInt64LE(BigInt(sequence), 12);
  record.writeBigUInt64LE(BigInt(eventId), 20);
  record.writeUInt32LE(flags >>> 0, 28);
  record.writeUInt32LE(pathBuffer.length, 32);
  record.writeUInt32LE(0, 36);
  pathBuffer.copy(record, TYPED_FSEVENTS_JOURNAL_HEADER_BYTES);
  return record;
}

function parseTypedFseventsJournal(buffer) {
  const records = [];
  let offset = 0;
  let expectedSequence = 1n;
  while (offset < buffer.length) {
    if (buffer.length - offset < TYPED_FSEVENTS_JOURNAL_HEADER_BYTES) {
      throw new Error("typed FSEvents journal record is truncated");
    }
    if (buffer.toString("ascii", offset, offset + 4) !== TYPED_FSEVENTS_JOURNAL_MAGIC) {
      throw new Error("typed FSEvents journal magic is invalid");
    }
    const version = buffer.readUInt16LE(offset + 4);
    const type = buffer.readUInt16LE(offset + 6);
    const recordLength = buffer.readUInt32LE(offset + 8);
    const sequence = buffer.readBigUInt64LE(offset + 12);
    const eventId = buffer.readBigUInt64LE(offset + 20);
    const flags = buffer.readUInt32LE(offset + 28);
    const pathLength = buffer.readUInt32LE(offset + 32);
    const reserved = buffer.readUInt32LE(offset + 36);
    if (version !== 1 || type !== 1 || reserved !== 0) throw new Error("typed FSEvents journal record type is unknown");
    if (recordLength < TYPED_FSEVENTS_JOURNAL_HEADER_BYTES
      || recordLength !== TYPED_FSEVENTS_JOURNAL_HEADER_BYTES + pathLength
      || recordLength > buffer.length - offset) {
      throw new Error("typed FSEvents journal record length overflow");
    }
    if (sequence !== expectedSequence) throw new Error("typed FSEvents journal sequence is non-contiguous");
    const pathBuffer = buffer.subarray(
      offset + TYPED_FSEVENTS_JOURNAL_HEADER_BYTES,
      offset + recordLength
    );
    if (!isUtf8(pathBuffer)) throw new Error("typed FSEvents journal path is not UTF-8");
    records.push({
      sequence,
      eventId,
      eventIdDecimal: eventId.toString(10),
      flags,
      path: pathBuffer.toString("utf8"),
      endOffset: BigInt(offset + recordLength)
    });
    expectedSequence += 1n;
    offset += recordLength;
  }
  return records;
}

function compileTypedFseventsHelper(sourcePath, binaryPath) {
  execFileSync("/usr/bin/xcrun", [
    "--sdk", "macosx", "clang",
    "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread", "-Wl,-no_uuid",
    sourcePath, "-o", binaryPath,
    "-framework", "CoreServices"
  ], { timeout: TEST_CHILD_TIMEOUT_MS, stdio: "pipe" });
  execFileSync("/usr/bin/codesign", [
    "--force", "--sign", "-", "--identifier", "hk.mais.typed-fsevents-journal", binaryPath
  ], { timeout: TEST_CHILD_TIMEOUT_MS, stdio: "pipe" });
  fs.chmodSync(binaryPath, 0o500);
}

function makeTypedFseventsScratch(parent, configSetup) {
  const scratch = path.join(parent, `scratch-${crypto.randomUUID()}`);
  const watched = path.join(parent, `watched\n${crypto.randomUUID()}`);
  fs.mkdirSync(scratch, { mode: 0o700 });
  fs.mkdirSync(watched, { mode: 0o700 });
  const configPath = path.join(scratch, "roots.config");
  const commandPath = path.join(scratch, "command.bin");
  fs.writeFileSync(commandPath, Buffer.alloc(0), { mode: 0o600 });
  configSetup({ scratch, configPath, watched });
  return { scratch, watched: fs.realpathSync(watched), configPath, commandPath };
}

test("typed FSEvents flag classifier is exact-benign and fail-closed", async () => {
  const { classifyTypedFseventsFlags } = await import(libraryUrl);
  const conservativeSource = [0, 0x11400, 0x19000, 0x10000, 0x8000, 0x00080000, 0x7f0000];
  assert.equal(classifyTypedFseventsFlags(0x18000), "xattr-only");
  for (const flags of conservativeSource) assert.equal(classifyTypedFseventsFlags(flags), "source", flags.toString(16));
  for (const fatal of [0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x00800000, 0x80000000]) {
    assert.throws(() => classifyTypedFseventsFlags(fatal), /fail.closed|unsupported|fatal/i, fatal.toString(16));
  }
  assert.throws(() => classifyTypedFseventsFlags(-1), /uint32/i);
  assert.throws(() => classifyTypedFseventsFlags(2 ** 32), /uint32/i);
});

test("typed FSEvents journal parser rejects unsafe framing and preserves uint64 event IDs", async () => {
  const { parseTypedFseventsJournalPrefix } = await import(libraryUrl);
  const first = typedFseventsJournalRecord({ sequence: 1n, eventId: 9_007_199_254_740_993n, flags: 0x18000, path: "/tmp/a" });
  const second = typedFseventsJournalRecord({ sequence: 2n, eventId: 18_446_744_073_709_551_000n, flags: 0x11400, path: "/tmp/b" });
  const parsed = parseTypedFseventsJournalPrefix(Buffer.concat([first, second]));
  assert.equal(parsed[0].eventId, 9_007_199_254_740_993n);
  assert.equal(parsed[0].eventIdDecimal, "9007199254740993");
  assert.equal(parsed[1].eventIdDecimal, "18446744073709551000");
  assert.equal(parsed[1].endOffset, BigInt(first.length + second.length));
  assert.throws(() => parseTypedFseventsJournalPrefix(first.subarray(0, first.length - 1)), /truncated|overflow/i);
  const overflow = Buffer.from(first);
  overflow.writeUInt32LE(0xfffffff0, 8);
  assert.throws(() => parseTypedFseventsJournalPrefix(overflow), /overflow/i);
  assert.throws(() => parseTypedFseventsJournalPrefix(Buffer.concat([
    first,
    typedFseventsJournalRecord({ sequence: 3n, eventId: 4n, flags: 0, path: "/tmp/c" })
  ])), /non-contiguous/i);
  assert.throws(() => parseTypedFseventsJournalPrefix(typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 1n,
    flags: 0,
    path: "/tmp/unknown",
    type: 9
  })), /unknown/i);
  const zeroPath = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: "" });
  assert.throws(() => parseTypedFseventsJournalPrefix(zeroPath), /empty|path length/i);
  const invalidUtf8 = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: "/tmp/x" });
  invalidUtf8[invalidUtf8.length - 1] = 0xff;
  assert.throws(() => parseTypedFseventsJournalPrefix(invalidUtf8), /UTF-8/i);
  const embeddedNul = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: "/tmp/\0x" });
  assert.throws(() => parseTypedFseventsJournalPrefix(embeddedNul), /NUL/i);
  const reserved = Buffer.from(first);
  reserved.writeUInt32LE(1, 36);
  assert.throws(() => parseTypedFseventsJournalPrefix(reserved), /unknown|reserved/i);
});

const task3aJournalEndpoint = (journal, entryCount, lastEventId) => ({
  entryCount: BigInt(entryCount),
  highWater: BigInt(journal.length),
  lastEventId: lastEventId === null ? null : BigInt(lastEventId),
  sha256: crypto.createHash("sha256").update(journal).digest("hex")
});

const task3aRegularProof = (overrides = {}) => Object.freeze({
  type: "regular-file",
  dev: "11",
  ino: "22",
  uid: "501",
  gid: "20",
  mode: "33188",
  nlink: "1",
  size: "7",
  mtimeNs: "123456789",
  ctimeNs: "987654321",
  sha256: "a".repeat(64),
  ...overrides
});

test("Task 3A native append limits reject exact cap overflow before the first pwrite", () => {
  const source = fs.readFileSync(
    path.join(here, "native", "mais-fsevents-journal.c"),
    "utf8"
  );
  assert.match(source, /#define MAX_JOURNAL_BYTES \(UINT64_C\(512\) \* 1024U \* 1024U\)/u);
  assert.match(source, /#define MAX_JOURNAL_ENTRIES UINT64_C\(1000000\)/u);
  assert.match(source, /#define MAX_EVENT_PATH_BYTES \(1024U \* 1024U\)/u);
  const appendBody = source.slice(
    source.indexOf("static void append_events("),
    source.indexOf("static void callback_queue_barrier(")
  );
  const firstWrite = appendBody.indexOf("pwrite_exact(");
  assert.ok(firstWrite > 0, "append_events must contain a journal pwrite");
  for (const guard of [
    "path_length > MAX_EVENT_PATH_BYTES",
    "state->entry_count >= MAX_JOURNAL_ENTRIES",
    "state->journal_offset > MAX_JOURNAL_BYTES - (uint64_t)record_length"
  ]) {
    const guardOffset = appendBody.indexOf(guard);
    assert.ok(guardOffset >= 0, `missing native append guard: ${guard}`);
    assert.ok(guardOffset < firstWrite, `native append guard must precede pwrite: ${guard}`);
  }
});

test("Task 3A journal extension visits only the checkpoint delta and preserves collector compatibility", async () => {
  const {
    createEmptyTypedFseventsJournalCheckpoint,
    parseTypedFseventsJournalPrefix,
    visitTypedFseventsJournalExtension
  } = await import(libraryUrl);
  assert.equal(typeof visitTypedFseventsJournalExtension, "function");
  const records = [
    typedFseventsJournalRecord({ sequence: 1n, eventId: 10n, flags: 0, path: "/repo/one" }),
    typedFseventsJournalRecord({ sequence: 2n, eventId: 11n, flags: 0x18000, path: "/repo/two" }),
    typedFseventsJournalRecord({ sequence: 3n, eventId: 12n, flags: 0x11400, path: "/repo/three" })
  ];
  const priorPrefix = records[0];
  const journal = Buffer.concat(records);
  const priorCheckpoint = visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(priorPrefix, 1n, 10n),
    eventRoots: ["/repo"],
    journalPrefix: priorPrefix,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  const visited = [];
  const result = visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(journal, 3n, 12n),
    eventRoots: ["/repo"],
    journalPrefix: journal,
    priorCheckpoint,
    visitor: (record) => visited.push(record)
  });
  assert.deepEqual(visited.map((record) => record.sequence), [2n, 3n]);
  assert.deepEqual(visited.map((record) => record.flagClass), ["xattr-only", "source"]);
  assert.equal(result.deltaEntryCount, 2n);
  assert.equal(result.entryCount, 3n);
  assert.equal(result.highWater, BigInt(journal.length));
  assert.equal(result.lastEventId, 12n);
  assert.equal(result.sha256, task3aJournalEndpoint(journal, 3n, 12n).sha256);
  assert.equal(Object.hasOwn(result, "records"), false);
  const compatibleRecords = parseTypedFseventsJournalPrefix(journal);
  assert.deepEqual(compatibleRecords.map((record) => record.sequence), [1n, 2n, 3n]);
  assert.deepEqual(
    Object.keys(compatibleRecords[0]).sort(),
    ["endOffset", "eventId", "eventIdDecimal", "flags", "path", "sequence"],
    "the compatibility collector must preserve its pre-visitor record shape"
  );
});

test("Task 3A journal extension binds prior and endpoint count highwater lastID and digests", async () => {
  const {
    createEmptyTypedFseventsJournalCheckpoint,
    visitTypedFseventsJournalExtension
  } = await import(libraryUrl);
  assert.equal(typeof visitTypedFseventsJournalExtension, "function");
  const first = typedFseventsJournalRecord({ sequence: 1n, eventId: 41n, flags: 0, path: "/repo/a" });
  const second = typedFseventsJournalRecord({ sequence: 2n, eventId: 42n, flags: 0, path: "/repo/b" });
  const journal = Buffer.concat([first, second]);
  const prior = visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(first, 1n, 41n),
    eventRoots: ["/repo"],
    journalPrefix: first,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  const endpoint = task3aJournalEndpoint(journal, 2n, 42n);
  const run = (overrides = {}) => visitTypedFseventsJournalExtension({
    endpoint,
    eventRoots: ["/repo"],
    journalPrefix: journal,
    priorCheckpoint: prior,
    visitor: () => {},
    ...overrides
  });
  assert.doesNotThrow(run);
  for (const [label, field, value, pattern] of [
    ["endpoint count", "entryCount", 3n, /count/i],
    ["endpoint highwater", "highWater", BigInt(journal.length - 1), /high.?water|length/i],
    ["endpoint lastID", "lastEventId", 43n, /last.*event|event.*id/i],
    ["endpoint digest", "sha256", "0".repeat(64), /digest|sha/i]
  ]) {
    assert.throws(
      () => run({ endpoint: { ...endpoint, [field]: value } }),
      pattern,
      label
    );
  }
  for (const [label, field, value] of [
    ["prior count", "entryCount", 0n],
    ["prior highwater", "highWater", BigInt(first.length - 1)],
    ["prior lastID", "lastEventId", 42n],
    ["prior digest", "sha256", "f".repeat(64)]
  ]) {
    const changed = { ...prior, [field]: value };
    if (field === "highWater") {
      changed.sha256 = crypto.createHash("sha256")
        .update(journal.subarray(0, Number(value)))
        .digest("hex");
    }
    assert.throws(
      () => run({ priorCheckpoint: changed }),
      /validated.*checkpoint|checkpoint.*validated/i,
      label
    );
  }
});

test("Task 3A journal extension rejects unvalidated and forged zero-delta checkpoints", async () => {
  const {
    createEmptyTypedFseventsJournalCheckpoint,
    visitTypedFseventsJournalExtension
  } = await import(libraryUrl);
  assert.equal(typeof createEmptyTypedFseventsJournalCheckpoint, "function");
  const journal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 77n,
    flags: 0,
    path: "/repo/one"
  });
  const endpoint = task3aJournalEndpoint(journal, 1n, 77n);
  const run = (priorCheckpoint) => visitTypedFseventsJournalExtension({
    endpoint,
    eventRoots: ["/repo"],
    journalPrefix: journal,
    priorCheckpoint,
    visitor: () => {}
  });
  assert.throws(
    () => run(endpoint),
    /validated.*checkpoint|checkpoint.*validated/i,
    "a matching plain object must not authenticate a zero-delta prefix"
  );
  const validated = visitTypedFseventsJournalExtension({
    endpoint,
    eventRoots: ["/repo"],
    journalPrefix: journal,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  assert.doesNotThrow(() => run(validated));
  assert.throws(
    () => run({ ...validated }),
    /validated.*checkpoint|checkpoint.*validated/i,
    "copying a checkpoint must not copy its module-private provenance"
  );
  assert.equal(Object.isFrozen(validated), true);

  const outside = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 88n,
    flags: 0,
    path: "/outside/one"
  });
  const outsideCheckpoint = visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(outside, 1n, 88n),
    eventRoots: ["/"],
    journalPrefix: outside,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  const inside = typedFseventsJournalRecord({
    sequence: 2n,
    eventId: 89n,
    flags: 0,
    path: "/repo/two"
  });
  const crossRootJournal = Buffer.concat([outside, inside]);
  assert.throws(() => visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(crossRootJournal, 2n, 89n),
    eventRoots: ["/repo"],
    journalPrefix: crossRootJournal,
    priorCheckpoint: outsideCheckpoint,
    visitor: () => {}
  }), /checkpoint.*event roots|event roots.*checkpoint/i);

  const tupleJournal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 90n,
    flags: 0,
    path: "/repo/a/one"
  });
  const tupleEndpoint = task3aJournalEndpoint(tupleJournal, 1n, 90n);
  const tupleCheckpoint = visitTypedFseventsJournalExtension({
    endpoint: tupleEndpoint,
    eventRoots: ["/repo/a", "/repo/b"],
    journalPrefix: tupleJournal,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  for (const changedRoots of [
    ["/repo"],
    ["/repo/a"],
    ["/other"],
    ["/repo/b", "/repo/a"]
  ]) {
    assert.throws(() => visitTypedFseventsJournalExtension({
      endpoint: tupleEndpoint,
      eventRoots: changedRoots,
      journalPrefix: tupleJournal,
      priorCheckpoint: tupleCheckpoint,
      visitor: () => {}
    }), /checkpoint.*event roots|event roots.*checkpoint/i, JSON.stringify(changedRoots));
  }
});

test("Task 3A journal extension decodes only the digest-bound delta after its prior checkpoint", async () => {
  const {
    createEmptyTypedFseventsJournalCheckpoint,
    visitTypedFseventsJournalExtension
  } = await import(libraryUrl);
  const priorBytes = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 10n,
    flags: 0,
    path: "/repo/prior"
  });
  const deltaBytes = typedFseventsJournalRecord({
    sequence: 2n,
    eventId: 11n,
    flags: 0,
    path: "/repo/delta"
  });
  const priorCheckpoint = visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(priorBytes, 1n, 10n),
    eventRoots: ["/repo"],
    journalPrefix: priorBytes,
    priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
    visitor: () => {}
  });
  const journal = Buffer.concat([priorBytes, deltaBytes]);
  const readUInt16LE = journal.readUInt16LE.bind(journal);
  journal.readUInt16LE = (offset) => {
    if (offset < priorBytes.length) throw new Error("prior record was decoded again");
    return readUInt16LE(offset);
  };
  const visited = [];
  assert.doesNotThrow(() => visitTypedFseventsJournalExtension({
    endpoint: task3aJournalEndpoint(journal, 2n, 11n),
    eventRoots: ["/repo"],
    journalPrefix: journal,
    priorCheckpoint,
    visitor: (record) => visited.push(record.path)
  }));
  assert.deepEqual(visited, ["/repo/delta"]);
});

test("Task 3A journal extension rejects unsafe paths flags framing and nonincreasing host event IDs", async () => {
  const {
    createEmptyTypedFseventsJournalCheckpoint,
    visitTypedFseventsJournalExtension
  } = await import(libraryUrl);
  assert.equal(typeof visitTypedFseventsJournalExtension, "function");
  const emptyCheckpoint = createEmptyTypedFseventsJournalCheckpoint();
  const visit = (journal, entryCount, lastEventId, eventRoots = ["/repo"]) => (
    visitTypedFseventsJournalExtension({
      endpoint: task3aJournalEndpoint(journal, entryCount, lastEventId),
      eventRoots,
      journalPrefix: journal,
      priorCheckpoint: emptyCheckpoint,
      visitor: () => {}
    })
  );
  for (const [label, eventPath, pattern] of [
    ["relative", "repo/a", /absolute|canonical/i],
    ["dot segment", "/repo/sub/../a", /canonical/i],
    ["duplicate separator", "/repo//a", /canonical/i],
    ["outside", "/other/a", /outside|root|contain/i]
  ]) {
    const journal = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: eventPath });
    assert.throws(() => visit(journal, 1n, 1n), pattern, label);
  }
  const rootSelf = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: "/repo" });
  assert.doesNotThrow(() => visit(rootSelf, 1n, 1n));
  for (const [label, flags] of [["fatal", 0x1], ["unknown", 0x80000000]]) {
    const journal = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags, path: "/repo/a" });
    assert.throws(() => visit(journal, 1n, 1n), /fatal|unsupported|fail.closed/i, label);
  }
  for (const [label, eventIds] of [["equal", [7n, 7n]], ["decreasing", [7n, 6n]]]) {
    const journal = Buffer.concat(eventIds.map((eventId, index) => typedFseventsJournalRecord({
      sequence: BigInt(index + 1), eventId, flags: 0, path: `/repo/${index}`
    })));
    assert.throws(() => visit(journal, 2n, eventIds[1]), /strict|increase|event.*id/i, label);
  }
  const noncontiguous = Buffer.concat([
    typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: "/repo/a" }),
    typedFseventsJournalRecord({ sequence: 3n, eventId: 2n, flags: 0, path: "/repo/b" })
  ]);
  assert.throws(() => visit(noncontiguous, 2n, 2n), /non-contiguous|sequence/i);
  const oversizedPath = `/repo/${"x".repeat(1024 * 1024)}`;
  const oversized = typedFseventsJournalRecord({ sequence: 1n, eventId: 1n, flags: 0, path: oversizedPath });
  assert.throws(() => visit(oversized, 1n, 1n), /path|record|1 MiB|limit/i);
});

test("Task 3A pure classification compares every regular semantic proof dimension and ignores ctime", async () => {
  const { classifyTypedFseventsTransaction } = await import(libraryUrl);
  assert.equal(typeof classifyTypedFseventsTransaction, "function");
  const eventPath = "/repo/file.txt";
  const priorProof = task3aRegularProof();
  const classify = (candidateProof) => classifyTypedFseventsTransaction({
    candidateProofLookup: new Map([[eventPath, candidateProof]]),
    eventRoots: ["/repo"],
    exactMetadataPaths: [],
    exactMetadataRoots: [],
    priorProofLookup: new Map([[eventPath, priorProof]]),
    streamedRecords: [{ eventId: 1n, flags: 0x18000, path: eventPath, sequence: 1n }]
  });
  const exact = classify(task3aRegularProof({ ctimeNs: "987654322" }));
  assert.equal(exact.xattrOnlyEventCount, 1n);
  assert.equal(exact.materialEventCount, 0n);
  assert.equal(exact.xattrEpochIncrement, 1n);
  for (const ctimeNs of [undefined, "not-a-number", "-1", "01", "18446744073709551616"]) {
    const result = classify(task3aRegularProof({ ctimeNs }));
    assert.equal(result.sourceEventCount, 1n, `candidate ctimeNs=${String(ctimeNs)}`);
    assert.equal(result.xattrOnlyEventCount, 0n, `candidate ctimeNs=${String(ctimeNs)}`);
  }
  for (const ctimeNs of [undefined, "not-a-number", "-1", "01", "18446744073709551616"]) {
    const result = classifyTypedFseventsTransaction({
      candidateProofLookup: new Map([[eventPath, task3aRegularProof()]]),
      eventRoots: ["/repo"],
      exactMetadataPaths: [],
      exactMetadataRoots: [],
      priorProofLookup: new Map([[eventPath, task3aRegularProof({ ctimeNs })]]),
      streamedRecords: [{ eventId: 1n, flags: 0x18000, path: eventPath, sequence: 1n }]
    });
    assert.equal(result.sourceEventCount, 1n, `prior ctimeNs=${String(ctimeNs)}`);
    assert.equal(result.xattrOnlyEventCount, 0n, `prior ctimeNs=${String(ctimeNs)}`);
  }
  for (const [field, value] of [
    ["mode", "16877"],
    ["mode", "41471"],
    ["mode", "4295000484"],
    ["nlink", "0"]
  ]) {
    const malformedProof = task3aRegularProof({ [field]: value });
    const result = classifyTypedFseventsTransaction({
      candidateProofLookup: new Map([[eventPath, malformedProof]]),
      eventRoots: ["/repo"],
      exactMetadataPaths: [],
      exactMetadataRoots: [],
      priorProofLookup: new Map([[eventPath, malformedProof]]),
      streamedRecords: [{ eventId: 1n, flags: 0x18000, path: eventPath, sequence: 1n }]
    });
    assert.equal(result.sourceEventCount, 1n, `${field}=${value}`);
    assert.equal(result.xattrOnlyEventCount, 0n, `${field}=${value}`);
  }
  for (const [field, value] of [
    ["dev", "12"],
    ["ino", "23"],
    ["uid", "502"],
    ["gid", "21"],
    ["mode", "33152"],
    ["nlink", "2"],
    ["size", "8"],
    ["mtimeNs", "123456790"],
    ["sha256", "b".repeat(64)]
  ]) {
    const result = classify(task3aRegularProof({ [field]: value }));
    assert.equal(result.sourceEventCount, 1n, field);
    assert.equal(result.materialEventCount, 1n, field);
    assert.equal(result.xattrOnlyEventCount, 0n, field);
    assert.equal(result.sourceEpochBatch, true, field);
  }
});

test("Task 3A pure classification applies metadata precedence and keeps ancestors ignored and nonregular paths material", async () => {
  const { classifyTypedFseventsTransaction } = await import(libraryUrl);
  assert.equal(typeof classifyTypedFseventsTransaction, "function");
  const exactProof = task3aRegularProof();
  const prior = new Map([["/repo/ordinary", exactProof]]);
  const candidate = new Map([["/repo/ordinary", task3aRegularProof({ ctimeNs: "987654322" })]]);
  const streamedRecords = Object.freeze([
    Object.freeze({ eventId: 1n, flags: 0x18000, path: "/repo/.metadata/exact", sequence: 1n }),
    Object.freeze({ eventId: 2n, flags: 0x18000, path: "/repo/.transaction", sequence: 2n }),
    Object.freeze({ eventId: 3n, flags: 0x18000, path: "/repo/.transaction/child", sequence: 3n }),
    Object.freeze({ eventId: 4n, flags: 0x18000, path: "/repo", sequence: 4n }),
    Object.freeze({ eventId: 5n, flags: 0x18000, path: "/repo/.metadata/exact/child", sequence: 5n }),
    Object.freeze({ eventId: 6n, flags: 0x18000, path: "/repo/ordinary", sequence: 6n }),
    Object.freeze({ eventId: 7n, flags: 0x18000, path: "/repo/.next/ignored", sequence: 7n }),
    Object.freeze({ eventId: 8n, flags: 0x18000, path: "/repo/generated/missing", sequence: 8n })
  ]);
  const result = classifyTypedFseventsTransaction({
    candidateProofLookup: candidate,
    eventRoots: ["/repo"],
    exactMetadataPaths: ["/repo/.metadata/exact"],
    exactMetadataRoots: ["/repo/.transaction"],
    priorProofLookup: prior,
    streamedRecords
  });
  assert.equal(result.transactionMetadataEventCount, 3n);
  assert.equal(result.sourceEventCount, 4n);
  assert.equal(result.xattrOnlyEventCount, 1n);
  assert.equal(result.materialEventCount, 7n);
  assert.equal(result.metadataEpochBatch, true);
  assert.equal(result.sourceEpochBatch, true);
  assert.equal(result.xattrEpochIncrement, 1n);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(prior.size, 1);
  assert.equal(candidate.size, 1);
  assert.equal(streamedRecords.length, 8);

  for (const type of ["directory", "symlink", "tombstone"]) {
    const proof = Object.freeze({ type });
    const nonregular = classifyTypedFseventsTransaction({
      candidateProofLookup: new Map([["/repo/node", proof]]),
      eventRoots: ["/repo"],
      exactMetadataPaths: [],
      exactMetadataRoots: [],
      priorProofLookup: new Map([["/repo/node", proof]]),
      streamedRecords: [{ eventId: 1n, flags: 0x18000, path: "/repo/node", sequence: 1n }]
    });
    assert.equal(nonregular.sourceEventCount, 1n, type);
  }
  assert.throws(() => classifyTypedFseventsTransaction({
    candidateProofLookup: new Map(),
    eventRoots: ["/repo"],
    exactMetadataPaths: ["/repo/.metadata/exact"],
    exactMetadataRoots: [],
    priorProofLookup: new Map(),
    streamedRecords: [{ eventId: 1n, flags: 0x1, path: "/repo/.metadata/exact", sequence: 1n }]
  }), /fatal|unsupported|fail.closed/i, "fatal flags precede metadata classification");
});

test("Task 3A journal visitor processes 300000 virtual records with bounded retained heap and runtime", {
  timeout: 30_000
}, () => {
  const script = String.raw`
    import crypto from "node:crypto";
    import {
      createEmptyTypedFseventsJournalCheckpoint,
      visitTypedFseventsJournalExtension
    } from ${JSON.stringify(libraryUrl)};
    const count = 300000;
    const headerBytes = 40;
    const pathBytes = Buffer.from("/repo/f");
    const recordBytes = headerBytes + pathBytes.length;
    const journal = Buffer.allocUnsafe(recordBytes * count);
    for (let index = 0; index < count; index += 1) {
      const offset = index * recordBytes;
      journal.write("MFSJ", offset, "ascii");
      journal.writeUInt16LE(1, offset + 4);
      journal.writeUInt16LE(1, offset + 6);
      journal.writeUInt32LE(recordBytes, offset + 8);
      journal.writeBigUInt64LE(BigInt(index + 1), offset + 12);
      journal.writeBigUInt64LE(BigInt(index + 1), offset + 20);
      journal.writeUInt32LE(0, offset + 28);
      journal.writeUInt32LE(pathBytes.length, offset + 32);
      journal.writeUInt32LE(0, offset + 36);
      pathBytes.copy(journal, offset + headerBytes);
    }
    const fullDigest = crypto.createHash("sha256").update(journal).digest("hex");
    const run = (retainRecords) => {
      global.gc();
      const before = process.memoryUsage().heapUsed;
      let peak = before;
      let visited = 0;
      const retained = retainRecords ? [] : null;
      const started = performance.now();
      const result = visitTypedFseventsJournalExtension({
        endpoint: { entryCount: BigInt(count), highWater: BigInt(journal.length), lastEventId: BigInt(count), sha256: fullDigest },
        eventRoots: ["/repo"],
        journalPrefix: journal,
        priorCheckpoint: createEmptyTypedFseventsJournalCheckpoint(),
        visitor: (record) => {
          visited += 1;
          if (retained !== null) retained.push(record);
          if ((visited & 2047) === 0) peak = Math.max(peak, process.memoryUsage().heapUsed);
        }
      });
      const afterReturn = process.memoryUsage().heapUsed;
      peak = Math.max(peak, afterReturn);
      return {
        afterReturnHeapBytes: afterReturn - before,
        deltaEntryCount: result.deltaEntryCount.toString(),
        elapsedMs: performance.now() - started,
        hasRecords: Object.hasOwn(result, "records"),
        peakHeapBytes: peak - before,
        retainedCount: retained?.length ?? 0,
        visited
      };
    };
    const streaming = run(false);
    global.gc();
    const retainedHeapBytes = process.memoryUsage().heapUsed;
    const collectorCalibration = run(true);
    process.stdout.write(JSON.stringify({
      collectorCalibration,
      retainedHeapBytes,
      streaming
    }));
  `;
  const child = spawnSync(process.execPath, ["--expose-gc", "--input-type=module", "-e", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 25_000
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const observed = JSON.parse(child.stdout);
  assert.equal(observed.streaming.visited, 300_000);
  assert.equal(observed.streaming.deltaEntryCount, "300000");
  assert.equal(observed.streaming.hasRecords, false);
  assert.equal(observed.streaming.retainedCount, 0);
  assert.ok(observed.streaming.peakHeapBytes <= 32 * 1024 * 1024, JSON.stringify(observed));
  assert.ok(observed.streaming.afterReturnHeapBytes <= 32 * 1024 * 1024, JSON.stringify(observed));
  assert.ok(observed.streaming.elapsedMs <= 20_000, JSON.stringify(observed));
  assert.equal(observed.collectorCalibration.retainedCount, 300_000);
  assert.ok(
    observed.collectorCalibration.peakHeapBytes > 32 * 1024 * 1024,
    `peak-memory gate is not sensitive to a 300000-record collector: ${JSON.stringify(observed)}`
  );
});

test("Task 3B1 stable proof snapshot includes ignored generated symlink and tracked tombstone namespace", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function");
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-stable-proof-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const root = fs.realpathSync(parent);
  fs.mkdirSync(path.join(root, "normal"));
  fs.mkdirSync(path.join(root, ".ignored", "cache"), { recursive: true });
  fs.writeFileSync(path.join(root, "normal", "file.txt"), "alpha\n");
  fs.writeFileSync(path.join(root, ".ignored", "cache", "generated.bin"), "beta");
  fs.symlinkSync("normal/file.txt", path.join(root, "link-to-normal"));

  const options = {
    policies: [{
      root,
      trackedRelativePaths: ["gone/tracked.txt", "link-to-normal", "normal/file.txt"]
    }]
  };
  const snapshot = captureStableProofSnapshot(options);
  const repeated = captureStableProofSnapshot(options);
  const proof = (relativePath) => snapshot.proofByPath[path.join(root, ...relativePath.split("/"))];

  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.sha256, repeated.sha256);
  assert.match(snapshot.sha256, /^[0-9a-f]{64}$/u);
  assert.equal(snapshot.pathCount, snapshot.entries.length);
  assert.equal(snapshot.regularBytes, 10);
  assert.equal(Object.getPrototypeOf(snapshot.proofByPath), null);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.entries), true);
  assert.equal(Object.isFrozen(snapshot.proofByPath), true);
  assert.deepEqual(snapshot.entries.map((entry) => entry.path), [...snapshot.entries.map((entry) => entry.path)].sort());

  assert.deepEqual(proof("gone/tracked.txt"), { type: "tombstone" });
  assert.equal(proof("normal/file.txt").type, "regular-file");
  assert.equal(proof("normal/file.txt").sha256, crypto.createHash("sha256").update("alpha\n").digest("hex"));
  assert.equal(proof(".ignored/cache/generated.bin").type, "regular-file");
  assert.equal(proof("link-to-normal").type, "symlink");
  assert.equal(proof("link-to-normal").target, "normal/file.txt");
  assert.deepEqual(snapshot.proofByPath[root].names, [".ignored", "link-to-normal", "normal"]);
  assert.deepEqual(proof(".ignored/cache").names, ["generated.bin"]);
  for (const entry of snapshot.entries) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry.proof), true);
    if (entry.proof.type === "directory") assert.equal(Object.isFrozen(entry.proof.names), true);
  }
  assert.throws(() => snapshot.entries.push("forged"), TypeError);
});

test("Task 3B1 stable proof snapshot rejects unsafe policies traversal duplicates and special files", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function");
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-stable-proof-policy-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const root = fs.realpathSync(parent);
  const nested = path.join(root, "nested");
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(root, "file.txt"), "x");

  for (const trackedRelativePaths of [
    ["../escape"],
    ["/absolute"],
    ["a//b"],
    ["duplicate", "duplicate"]
  ]) {
    assert.throws(
      () => captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths }] }),
      /canonical|relative|duplicate|unsafe/i,
      JSON.stringify(trackedRelativePaths)
    );
  }
  assert.throws(
    () => captureStableProofSnapshot({ policies: [{ root: `${root}/.`, trackedRelativePaths: [] }] }),
    /canonical|real path/i
  );
  assert.throws(
    () => captureStableProofSnapshot({
      policies: [
        { root, trackedRelativePaths: [] },
        { root, trackedRelativePaths: [] }
      ]
    }),
    /duplicate|overlap/i
  );
  const nestedPolicies = captureStableProofSnapshot({
    policies: [
      { root, trackedRelativePaths: [] },
      { root: nested, trackedRelativePaths: ["nested-missing.txt"] }
    ]
  });
  assert.deepEqual(nestedPolicies.roots, [root, nested]);
  assert.equal(
    new Set(nestedPolicies.entries.map((entry) => entry.path)).size,
    nestedPolicies.entries.length,
    "nested worktree roots must not duplicate full-namespace entries"
  );
  assert.deepEqual(
    nestedPolicies.proofByPath[path.join(nested, "nested-missing.txt")],
    { type: "tombstone" }
  );
  fs.symlinkSync("nested", path.join(root, "linked-dir"));
  assert.throws(
    () => captureStableProofSnapshot({
      policies: [{ root, trackedRelativePaths: ["linked-dir/missing.txt"] }]
    }),
    /tombstone.*symlink|symlink.*ancestor/i
  );
  assert.throws(
    () => captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }], maxPaths: 1 }),
    /path.*limit|maximum.*path/i
  );

  const fifo = path.join(root, "special.fifo");
  execFileSync("mkfifo", [fifo]);
  assert.throws(
    () => captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] }),
    /special|unsupported.*type|regular.*directory.*symlink/i
  );
});

test("Task 3B1 stable proof snapshot fails closed on regular directory and root races without fd leaks", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function");
  const parents = [];
  t.after(() => {
    for (const parent of parents) fs.rmSync(parent, { recursive: true, force: true });
  });
  const fixture = () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-stable-proof-race-"));
    parents.push(parent);
    const root = fs.realpathSync(parent);
    fs.mkdirSync(path.join(root, "dir"));
    fs.writeFileSync(path.join(root, "dir", "file.txt"), "stable\n");
    return { parent, root };
  };
  const fdCount = () => fs.readdirSync("/dev/fd").length;
  const beforeFds = fdCount();

  {
    const { root } = fixture();
    let fired = false;
    assert.throws(() => captureStableProofSnapshot({
      policies: [{ root, trackedRelativePaths: ["dir/file.txt"] }],
      hooks: {
        afterRegularRead: ({ absolutePath }) => {
          if (!fired && absolutePath === path.join(root, "dir", "file.txt")) {
            fired = true;
            fs.writeFileSync(absolutePath, "stable\n");
          }
        }
      }
    }), /changed|stable|ctime|observation/i);
    assert.equal(fired, true);
  }
  {
    const { root } = fixture();
    let fired = false;
    assert.throws(() => captureStableProofSnapshot({
      policies: [{ root, trackedRelativePaths: ["dir/file.txt"] }],
      hooks: {
        afterRegularRead: ({ absolutePath }) => {
          if (!fired && absolutePath === path.join(root, "dir", "file.txt")) {
            fired = true;
            fs.renameSync(absolutePath, `${absolutePath}.held-old`);
            fs.writeFileSync(absolutePath, "stable\n");
          }
        }
      }
    }), /changed|identity|inode|visible/i);
    assert.equal(fired, true);
  }
  {
    const { root } = fixture();
    let fired = false;
    assert.throws(() => captureStableProofSnapshot({
      policies: [{ root, trackedRelativePaths: [] }],
      hooks: {
        afterDirectoryRead: ({ absolutePath }) => {
          if (!fired && absolutePath === path.join(root, "dir")) {
            fired = true;
            const transient = path.join(absolutePath, "transient");
            fs.writeFileSync(transient, "x");
            fs.unlinkSync(transient);
          }
        }
      }
    }), /changed|stable|directory|namespace/i);
    assert.equal(fired, true);
  }
  {
    const { root } = fixture();
    let fired = false;
    assert.throws(() => captureStableProofSnapshot({
      policies: [{ root, trackedRelativePaths: [] }],
      hooks: {
        beforeRootFinalValidation: ({ absolutePath }) => {
          if (!fired && absolutePath === root) {
            fired = true;
            const heldOld = `${root}.held-old`;
            fs.renameSync(root, heldOld);
            parents.push(heldOld);
            fs.mkdirSync(root);
          }
        }
      }
    }), /root.*changed|anchor|identity|inode/i);
    assert.equal(fired, true);
  }
  assert.ok(fdCount() <= beforeFds + 2, `descriptor leak: before=${beforeFds} after=${fdCount()}`);
});

test("Task 3B1 stable proof snapshot never opens a root-external file through an ancestor symlink race", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-stable-proof-escape-race-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const rootPath = path.join(parent, "root");
  const outside = path.join(parent, "outside");
  fs.mkdirSync(rootPath);
  const root = fs.realpathSync(rootPath);
  const nested = path.join(root, "nested");
  fs.mkdirSync(outside);
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(nested, "secret.txt"), "inside\n");
  fs.writeFileSync(path.join(outside, "secret.txt"), "must-not-open\n");
  fs.chmodSync(path.join(outside, "secret.txt"), 0o000);

  let seamInvoked = false;
  let failure;
  try {
    captureStableProofSnapshot({
      hooks: {
        afterDirectoryRead(event) {
          if (seamInvoked || (event.absolutePath ?? event.path) !== nested) return;
          seamInvoked = true;
          fs.renameSync(nested, `${nested}.held-original`);
          fs.symlinkSync(outside, nested, "dir");
        }
      },
      policies: [{ root, trackedRelativePaths: [] }]
    });
  } catch (error) {
    failure = error;
  }
  assert.equal(seamInvoked, true);
  assert.ok(failure instanceof Error, "the ancestor replacement must fail closed");
  assert.match(failure.message, /stable proof|snapshot|namespace|identity|changed|rebind/i);
  assert.doesNotMatch(
    `${failure.code ?? ""} ${failure.message}`,
    /EACCES|EPERM|permission denied/i,
    "the failure must occur without opening the root-external unreadable file"
  );
});

test("Task 3B1 stable proof snapshot captures 15000 real files with bounded runtime heap and descriptors", {
  timeout: 40_000
}, () => {
  const script = String.raw`
    import fs from "node:fs";
    import os from "node:os";
    import path from "node:path";
    import { captureStableProofSnapshot } from ${JSON.stringify(libraryUrl)};
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-stable-proof-scale-"));
    try {
      const root = fs.realpathSync(parent);
      for (let directory = 0; directory < 150; directory += 1) {
        const dir = path.join(root, "d" + String(directory).padStart(3, "0"));
        fs.mkdirSync(dir);
        for (let file = 0; file < 100; file += 1) {
          fs.writeFileSync(path.join(dir, "f" + String(file).padStart(3, "0")), "x");
        }
      }
      global.gc();
      const beforeHeap = process.memoryUsage().heapUsed;
      const beforeFds = fs.readdirSync("/dev/fd").length;
      const started = performance.now();
      const first = captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] });
      const second = captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] });
      const elapsedMs = performance.now() - started;
      global.gc();
      process.stdout.write(JSON.stringify({
        elapsedMs,
        fdDelta: fs.readdirSync("/dev/fd").length - beforeFds,
        heapDelta: process.memoryUsage().heapUsed - beforeHeap,
        helperPeakRssBytes: Math.max(first.helperPeakRssBytes, second.helperPeakRssBytes),
        pathCount: first.pathCount,
        regularBytes: first.regularBytes,
        repeatMatches: first.sha256 === second.sha256
      }));
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  `;
  const child = spawnSync(process.execPath, ["--expose-gc", "--input-type=module", "-e", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 35_000
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const observed = JSON.parse(child.stdout);
  assert.equal(observed.pathCount, 15_151);
  assert.equal(observed.regularBytes, 15_000);
  assert.equal(observed.repeatMatches, true);
  assert.ok(observed.fdDelta <= 2, JSON.stringify(observed));
  assert.ok(observed.heapDelta <= 128 * 1024 * 1024, JSON.stringify(observed));
  assert.ok(observed.helperPeakRssBytes <= 512 * 1024 * 1024, JSON.stringify(observed));
  assert.ok(observed.elapsedMs <= 25_000, JSON.stringify(observed));
});

test("typed FSEvents ACK wait decision binds acceptance to the owned child lifecycle", async () => {
  const { decideTypedFseventsAcknowledgementWait } = await import(libraryUrl);
  const decide = (overrides = {}) => decideTypedFseventsAcknowledgementWait({
    childAlive: true,
    exitCode: null,
    matches: true,
    signalCode: null,
    terminal: false,
    ...overrides
  });

  assert.equal(decide(), "accept", "a matching nonterminal ACK requires a live child");
  assert.equal(decide({ childAlive: false, exitCode: 0 }), "reject", "a dead child cannot authenticate a nonterminal ACK");
  assert.equal(decide({ terminal: true }), "wait", "a terminal ACK cannot be accepted while the child is running");
  assert.equal(
    decide({ childAlive: false, exitCode: 0, terminal: true }),
    "accept",
    "a matching terminal ACK is accepted only after a clean child exit"
  );
  assert.equal(decide({ childAlive: false, exitCode: 9, terminal: true }), "reject");
  assert.equal(decide({ childAlive: false, signalCode: "SIGTERM", terminal: true }), "reject");
});

test("typed FSEvents production STOP requests terminal ACK handling", () => {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.match(
    source,
    /const stopTypedFsevents = async \(\) => \{[\s\S]*?await waitTypedAcknowledgement\(3, typedCommandSequence, true\)/u
  );
  assert.match(
    source,
    /if \(typedFseventsEnabled\) \{\s*await stopTypedFsevents\(\);\s*await awaitTypedFseventsExit\(\);/u
  );
});

function writeTypedFseventsV2Endpoint(scratch, {
  acknowledgementMutator,
  entryCount = 0n,
  journal = Buffer.alloc(0),
  lastEventId = 0n,
  sequence = 0n,
  type = 1,
  rootsBuffer = Buffer.from("/tmp/typed-root\0")
} = {}) {
  const journalPath = path.join(scratch, "journal.bin");
  const acknowledgementPath = path.join(scratch, "ack.bin");
  const commitPath = path.join(scratch, "ack.commit");
  fs.writeFileSync(journalPath, journal, { mode: 0o600 });
  fs.chmodSync(journalPath, 0o600);
  const journalStatus = fs.lstatSync(journalPath, { bigint: true });
  let acknowledgement = typedFseventsAck({
    type,
    sequence,
    journalHighWater: BigInt(journal.length),
    entryCount,
    lastEventId,
    eventRootCount: BigInt(rootsBuffer.filter((byte) => byte === 0).length),
    eventRootFingerprint: crypto.createHash("sha256").update(rootsBuffer).digest(),
    journalDevice: journalStatus.dev,
    journalInode: journalStatus.ino,
    journalSha256: crypto.createHash("sha256").update(journal).digest()
  });
  acknowledgement = acknowledgementMutator?.(Buffer.from(acknowledgement)) ?? acknowledgement;
  fs.writeFileSync(acknowledgementPath, acknowledgement, { mode: 0o600 });
  fs.chmodSync(acknowledgementPath, 0o600);
  const acknowledgementStatus = fs.lstatSync(acknowledgementPath, { bigint: true });
  fs.writeFileSync(
    commitPath,
    typedFseventsAckCommit(acknowledgement, acknowledgementStatus),
    { mode: 0o600 }
  );
  fs.chmodSync(commitPath, 0o600);
  return {
    acknowledgementPath,
    commitPath,
    eventRootCount: rootsBuffer.filter((byte) => byte === 0).length,
    eventRootFingerprint: crypto.createHash("sha256").update(rootsBuffer).digest("hex"),
    journal,
    journalPath
  };
}

test("typed FSEvents v2 ACK reader accepts one fully bound roots and held-journal endpoint", async (t) => {
  const { readCommittedTypedFseventsAcknowledgement } = await import(libraryUrl);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-v2-positive-"));
  fs.chmodSync(scratch, 0o700);
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const journal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 9007199254740993n,
    flags: 0x11400,
    path: "/tmp/held-journal-prefix"
  });
  const endpoint = writeTypedFseventsV2Endpoint(scratch, {
    entryCount: 1n,
    journal,
    lastEventId: 9007199254740993n,
    rootsBuffer: Buffer.from("/tmp/typed\nroot-a\0/tmp/typed-root-b\0")
  });
  const observed = readCommittedTypedFseventsAcknowledgement(endpoint.acknowledgementPath, {
    expectedEventRootCount: endpoint.eventRootCount,
    expectedEventRootFingerprint: endpoint.eventRootFingerprint
  });
  assert.notEqual(observed, null);
  assert.equal(observed.eventRootCount, BigInt(endpoint.eventRootCount));
  assert.equal(observed.eventRootFingerprint, endpoint.eventRootFingerprint);
  assert.equal(observed.journalSha256, crypto.createHash("sha256").update(endpoint.journal).digest("hex"));
  assert.deepEqual(observed.journalPrefix, endpoint.journal);
});

test("typed FSEvents v2 ACK reader rejects legacy, mixed, truncated, and full-digest mismatches", async (t) => {
  const { readCommittedTypedFseventsAcknowledgement } = await import(libraryUrl);
  const baselineScratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-v2-negative-baseline-"));
  fs.chmodSync(baselineScratch, 0o700);
  t.after(() => fs.rmSync(baselineScratch, { recursive: true, force: true }));
  const baseline = writeTypedFseventsV2Endpoint(baselineScratch);
  assert.notEqual(readCommittedTypedFseventsAcknowledgement(baseline.acknowledgementPath, {
    expectedEventRootCount: baseline.eventRootCount,
    expectedEventRootFingerprint: baseline.eventRootFingerprint
  }), null, "the valid v2 control endpoint must be accepted before negative variants are meaningful");
  for (const tamperKind of [
    "ack-v1",
    "commit-v1",
    "truncated",
    "root-count",
    "root-last-byte",
    "journal-last-byte",
    "journal-device",
    "journal-inode"
  ]) {
    await t.test(tamperKind, () => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `mais-typed-v2-${tamperKind}-`));
      t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
      const endpoint = writeTypedFseventsV2Endpoint(scratch, {
        acknowledgementMutator: (acknowledgement) => {
          if (tamperKind === "ack-v1") acknowledgement.writeUInt16LE(1, 4);
          else if (tamperKind === "truncated") return acknowledgement.subarray(0, 135);
          else if (tamperKind === "root-count") {
            acknowledgement.writeBigUInt64LE(acknowledgement.readBigUInt64LE(48) + 1n, 48);
          } else if (tamperKind === "root-last-byte") acknowledgement[87] ^= 0xff;
          else if (tamperKind === "journal-last-byte") acknowledgement[135] ^= 0xff;
          else if (tamperKind === "journal-device") {
            acknowledgement.writeBigUInt64LE(acknowledgement.readBigUInt64LE(88) + 1n, 88);
          } else if (tamperKind === "journal-inode") {
            acknowledgement.writeBigUInt64LE(acknowledgement.readBigUInt64LE(96) + 1n, 96);
          }
          return acknowledgement;
        },
        journal: Buffer.from("bound endpoint\n")
      });
      if (tamperKind === "commit-v1") {
        const commit = fs.readFileSync(endpoint.commitPath);
        commit.writeUInt16LE(1, 4);
        fs.writeFileSync(endpoint.commitPath, commit, { mode: 0o600 });
      }
      assert.equal(readCommittedTypedFseventsAcknowledgement(endpoint.acknowledgementPath, {
        expectedEventRootCount: endpoint.eventRootCount,
        expectedEventRootFingerprint: endpoint.eventRootFingerprint
      }), null);
    });
  }
});

test("typed FSEvents v2 ACK reader rejects held-journal pwrite and visible replacement races", async (t) => {
  const { readCommittedTypedFseventsAcknowledgement } = await import(libraryUrl);
  for (const tamperKind of ["pwrite", "replacement"]) {
    await t.test(tamperKind, () => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `mais-typed-v2-held-${tamperKind}-`));
      t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
      const endpoint = writeTypedFseventsV2Endpoint(scratch, {
        journal: Buffer.from("immutable journal endpoint\n")
      });
      assert.notEqual(readCommittedTypedFseventsAcknowledgement(endpoint.acknowledgementPath, {
        expectedEventRootCount: endpoint.eventRootCount,
        expectedEventRootFingerprint: endpoint.eventRootFingerprint
      }), null, "the stable held-journal endpoint must be accepted before the race is injected");
      const observed = readCommittedTypedFseventsAcknowledgement(endpoint.acknowledgementPath, {
        beforeVisibleValidation: ({
          journalPath = endpoint.journalPath,
          phase
        }) => {
          assert.equal(phase, "afterJournalReadBeforeVisibleValidation");
          if (tamperKind === "replacement") {
            fs.renameSync(journalPath, `${journalPath}.held`);
            fs.writeFileSync(journalPath, endpoint.journal, { mode: 0o600 });
            return;
          }
          const descriptor = fs.openSync(journalPath, fs.constants.O_RDWR | fs.constants.O_NOFOLLOW);
          try {
            const byte = Buffer.alloc(1);
            assert.equal(fs.readSync(descriptor, byte, 0, 1, 0), 1);
            byte[0] ^= 0xff;
            assert.equal(fs.writeSync(descriptor, byte, 0, 1, 0), 1);
            fs.fsyncSync(descriptor);
          } finally {
            fs.closeSync(descriptor);
          }
        },
        expectedEventRootCount: endpoint.eventRootCount,
        expectedEventRootFingerprint: endpoint.eventRootFingerprint
      });
      assert.equal(observed, null);
    });
  }
});

test("typed FSEvents v2 ACK reader rejects FIFO endpoints without blocking", async (t) => {
  for (const targetName of ["ack.bin", "ack.commit", "journal.bin"]) {
    await t.test(targetName, () => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `mais-typed-v2-fifo-${targetName}-`));
      t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
      const endpoint = writeTypedFseventsV2Endpoint(scratch, {
        journal: Buffer.from("bounded FIFO rejection\n")
      });
      const targetPath = path.join(scratch, targetName);
      fs.unlinkSync(targetPath);
      execFileSync("/usr/bin/mkfifo", [targetPath], { timeout: TEST_CHILD_TIMEOUT_MS });
      fs.chmodSync(targetPath, 0o600);
      const result = execFileSync(process.execPath, [
        "--input-type=module",
        "-e",
        [
          "const libraryUrl = process.argv[1];",
          "const acknowledgementPath = process.argv[2];",
          "const expectedEventRootCount = Number(process.argv[3]);",
          "const expectedEventRootFingerprint = process.argv[4];",
          "const { readCommittedTypedFseventsAcknowledgement } = await import(libraryUrl);",
          "const observed = readCommittedTypedFseventsAcknowledgement(acknowledgementPath, { expectedEventRootCount, expectedEventRootFingerprint });",
          "process.stdout.write(observed === null ? 'null\\n' : 'accepted\\n');"
        ].join("\n"),
        libraryUrl,
        endpoint.acknowledgementPath,
        String(endpoint.eventRootCount),
        endpoint.eventRootFingerprint
      ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 1_000
      });
      assert.equal(result, "null\n");
    });
  }
});

test("typed FSEvents ACK reader rejects the post-ACK pre-commit publication window", (t) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-fsevents-commit-reader-"));
  fs.chmodSync(scratch, 0o700);
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const endpoint = writeTypedFseventsV2Endpoint(scratch, {
    journal: Buffer.from("committed publication endpoint\n"),
    rootsBuffer: Buffer.from("/tmp/commit-window-root\0")
  });
  const ackPath = endpoint.acknowledgementPath;
  const commitPath = endpoint.commitPath;
  const readyAckStatus = fs.lstatSync(ackPath, { bigint: true });
  const readyCommitStatus = fs.lstatSync(commitPath, { bigint: true });
  const expectedRoots = {
    expectedEventRootCount: endpoint.eventRootCount,
    expectedEventRootFingerprint: endpoint.eventRootFingerprint
  };
  const committedReady = readCommittedTypedFseventsAck(ackPath, expectedRoots);
  assert.equal(committedReady.type, 1);
  assert.equal(committedReady.sequence, 0n);

  const flush = typedFseventsAck({
    type: 2,
    sequence: 1n,
    journalHighWater: committedReady.journalHighWater,
    entryCount: committedReady.entryCount,
    lastEventId: committedReady.lastEventId,
    eventRootCount: committedReady.eventRootCount,
    eventRootFingerprint: committedReady.eventRootFingerprint,
    journalDevice: committedReady.journalDevice,
    journalInode: committedReady.journalInode,
    journalSha256: committedReady.journalSha256
  });
  const temporaryAckPath = path.join(scratch, `.ack-unit-${crypto.randomUUID()}`);
  fs.writeFileSync(temporaryAckPath, flush, { mode: 0o600 });
  fs.chmodSync(temporaryAckPath, 0o600);
  fs.renameSync(temporaryAckPath, ackPath);
  const flushAckStatus = fs.lstatSync(ackPath, { bigint: true });
  assert.notEqual(flushAckStatus.ino, readyAckStatus.ino);
  assert.equal(
    readCommittedTypedFseventsAck(ackPath, expectedRoots),
    null,
    "a syntactically valid new ACK must not match the prior commit"
  );

  const temporaryCommitPath = path.join(scratch, `.commit-unit-${crypto.randomUUID()}`);
  fs.writeFileSync(
    temporaryCommitPath,
    typedFseventsAckCommit(flush, flushAckStatus),
    { mode: 0o600 }
  );
  fs.chmodSync(temporaryCommitPath, 0o600);
  fs.renameSync(temporaryCommitPath, commitPath);
  const committedFlush = readCommittedTypedFseventsAck(ackPath, expectedRoots);
  assert.equal(committedFlush.type, 2);
  assert.equal(committedFlush.sequence, 1n);
  assert.equal(committedFlush.visibleInode, flushAckStatus.ino);
  assert.notEqual(committedFlush.commitVisibleInode, readyCommitStatus.ino);
});

test("typed FSEvents ACK reader rejects post-read same-inode same-size frame mutations", async (t) => {
  const { readCommittedTypedFseventsAcknowledgement } = await import(libraryUrl);
  for (const targetKind of ["ACK", "ack.commit"]) {
    const targetLabel = targetKind === "ACK" ? "an ACK" : "an ack.commit";
    await t.test(`typed FSEvents ACK reader rejects ${targetLabel} mutation before visible validation`, (subtest) => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-fsevents-reader-race-"));
      fs.chmodSync(scratch, 0o700);
      subtest.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
      const endpoint = writeTypedFseventsV2Endpoint(scratch, {
        journal: Buffer.from("bound race endpoint\n"),
        rootsBuffer: Buffer.from("/tmp/race-root-a\0/tmp/race-root-b\0")
      });
      const ackPath = endpoint.acknowledgementPath;
      const commitPath = endpoint.commitPath;
      const targetPath = targetKind === "ACK" ? ackPath : commitPath;
      const targetBefore = fs.lstatSync(targetPath, { bigint: true });
      let seamInvoked = false;

      const observed = readCommittedTypedFseventsAcknowledgement(ackPath, {
        beforeVisibleValidation: ({ phase }) => {
          seamInvoked = true;
          assert.equal(phase, "afterJournalReadBeforeVisibleValidation");
          const descriptor = fs.openSync(targetPath, fs.constants.O_RDWR | fs.constants.O_NOFOLLOW);
          try {
            const finalByteOffset = Number(targetBefore.size - 1n);
            const byte = Buffer.alloc(1);
            assert.equal(fs.readSync(descriptor, byte, 0, 1, finalByteOffset), 1);
            byte[0] ^= 0xff;
            assert.equal(fs.writeSync(descriptor, byte, 0, 1, finalByteOffset), 1);
            fs.futimesSync(
              descriptor,
              new Date("2001-01-01T00:00:00.000Z"),
              new Date("2001-01-01T00:00:00.000Z")
            );
            fs.fsyncSync(descriptor);
          } finally {
            fs.closeSync(descriptor);
          }
          const targetAfter = fs.lstatSync(targetPath, { bigint: true });
          assert.equal(targetAfter.dev, targetBefore.dev);
          assert.equal(targetAfter.ino, targetBefore.ino);
          assert.equal(targetAfter.size, targetBefore.size);
        },
        expectedEventRootCount: endpoint.eventRootCount,
        expectedEventRootFingerprint: endpoint.eventRootFingerprint
      });
      assert.equal(seamInvoked, true, "the post-read race seam must execute for a valid v2 endpoint");
      assert.equal(observed, null);
    });
  }
});

test("Darwin typed FSEvents helper requires a live silent stdin parent channel", {
  timeout: 30_000,
  skip: process.platform !== "darwin"
}, async (t) => {
  const { TYPED_FSEVENTS_HELPER_SOURCE_PATH } = await import(libraryUrl);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-fsevents-parent-channel-"));
  fs.chmodSync(parent, 0o700);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const binary = path.join(parent, "mais-fsevents-parent-channel");
  compileTypedFseventsHelper(TYPED_FSEVENTS_HELPER_SOURCE_PATH, binary);

  for (const channelEvent of ["eof", "unexpected-data"]) {
    await t.test(channelEvent, async (subtest) => {
      const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
        fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
      });
      let stderr = "";
      const child = spawn(binary, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      subtest.after(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
      assert.equal(await waitForCondition(
        () => fs.existsSync(path.join(fixture.scratch, "ack.bin"))
          || child.exitCode !== null || child.signalCode !== null,
        5_000
      ), true, stderr);
      assert.equal(child.exitCode, null, stderr);
      if (channelEvent === "eof") child.stdin.destroy();
      else child.stdin.write("unexpected parent-channel data");
      assert.equal(await waitForCondition(
        () => child.exitCode !== null || child.signalCode !== null,
        2_000
      ), true, `native helper ignored stdin ${channelEvent}: ${stderr}`);
      assert.notEqual(child.exitCode, 0, stderr);
    });
  }

  await t.test("non-pipe-fd0", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binary, [fixture.scratch], { stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    subtest.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });
    assert.equal(await waitForCondition(
      () => child.exitCode !== null || child.signalCode !== null,
      2_000
    ), true, `native helper accepted a non-pipe fd0: ${stderr}`);
    assert.notEqual(child.exitCode, 0, stderr);
  });

  await t.test("read-write-fifo-fd0", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    const fifoPath = path.join(parent, `parent-channel-${crypto.randomUUID()}.fifo`);
    execFileSync("/usr/bin/mkfifo", [fifoPath], { timeout: TEST_CHILD_TIMEOUT_MS });
    fs.chmodSync(fifoPath, 0o600);
    const fifoDescriptor = fs.openSync(
      fifoPath,
      fs.constants.O_RDWR | (fs.constants.O_NONBLOCK ?? 0)
    );
    let stderr = "";
    const child = spawn(binary, [fixture.scratch], { stdio: [fifoDescriptor, "ignore", "pipe"] });
    fs.closeSync(fifoDescriptor);
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    subtest.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });
    assert.equal(await waitForCondition(
      () => child.exitCode !== null || child.signalCode !== null,
      2_000
    ), true, `native helper accepted a self-held read-write FIFO parent channel: ${stderr}`);
    assert.notEqual(child.exitCode, 0, stderr);
  });
});

test("Darwin typed FSEvents helper rejects FIFO roots and command endpoints without blocking", {
  timeout: 30_000,
  skip: process.platform !== "darwin"
}, async (t) => {
  const { TYPED_FSEVENTS_HELPER_SOURCE_PATH } = await import(libraryUrl);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-fsevents-native-fifo-"));
  fs.chmodSync(parent, 0o700);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const binary = path.join(parent, "mais-fsevents-native-fifo");
  compileTypedFseventsHelper(TYPED_FSEVENTS_HELPER_SOURCE_PATH, binary);

  await t.test("roots.config FIFO", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath }) => {
      execFileSync("/usr/bin/mkfifo", [configPath], { timeout: TEST_CHILD_TIMEOUT_MS });
      fs.chmodSync(configPath, 0o600);
    });
    let stderr = "";
    const child = spawn(binary, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    subtest.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });
    assert.equal(await waitForCondition(
      () => child.exitCode !== null || child.signalCode !== null,
      2_000
    ), true, `native helper blocked opening roots.config FIFO: ${stderr}`);
    assert.notEqual(child.exitCode, 0, stderr);
  });

  await t.test("command.bin FIFO", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binary, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    subtest.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });
    const ackPath = path.join(fixture.scratch, "ack.bin");
    await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
    const fifoPath = path.join(fixture.scratch, `.command-fifo-${crypto.randomUUID()}`);
    execFileSync("/usr/bin/mkfifo", [fifoPath], { timeout: TEST_CHILD_TIMEOUT_MS });
    fs.chmodSync(fifoPath, 0o600);
    fs.renameSync(fifoPath, fixture.commandPath);
    assert.equal(fs.lstatSync(fixture.commandPath).isFIFO(), true);
    assert.equal(await waitForCondition(
      () => child.exitCode !== null || child.signalCode !== null,
      2_000
    ), true, `native helper blocked opening command.bin FIFO: ${stderr}`);
    assert.notEqual(child.exitCode, 0, stderr);
  });
});

test("typed FSEvents native helper compiles reproducibly rejects unsafe config and journals flush endpoints", {
  timeout: 45_000,
  skip: process.platform !== "darwin"
}, async (t) => {
  const {
    TYPED_FSEVENTS_HELPER_SOURCE_PATH,
    classifyTypedFseventsFlags,
    sha256Buffer
  } = await import(libraryUrl);
  assert.equal(TYPED_FSEVENTS_HELPER_SOURCE_PATH, path.join(here, "native", "mais-fsevents-journal.c"));
  const nativeEntries = fs.readdirSync(path.dirname(TYPED_FSEVENTS_HELPER_SOURCE_PATH));
  assert.deepEqual(nativeEntries, ["mais-fsevents-journal.c"]);
  const source = fs.readFileSync(TYPED_FSEVENTS_HELPER_SOURCE_PATH);
  const sourceText = source.toString("utf8");
  const sourceSha256 = sha256Buffer(source);
  assert.match(sourceText, /kFSEventStreamEventIdSinceNow/u);
  assert.match(sourceText, /kFSEventStreamCreateFlagFileEvents/u);
  assert.match(sourceText, /kFSEventStreamCreateFlagWatchRoot/u);
  assert.match(sourceText, /kFSEventStreamCreateFlagNoDefer/u);
  assert.match(sourceText, /FSEventStreamFlushSync/u);
  assert.match(sourceText, /dispatch_sync_f/u);
  assert.doesNotMatch(sourceText, /\bnpm\b|node\.js|node:/iu);

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-typed-fsevents-task1-"));
  fs.chmodSync(parent, 0o700);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const binaryA = path.join(parent, "mais-fsevents-a");
  const binaryB = path.join(parent, "mais-fsevents-b");
  compileTypedFseventsHelper(TYPED_FSEVENTS_HELPER_SOURCE_PATH, binaryA);
  compileTypedFseventsHelper(TYPED_FSEVENTS_HELPER_SOURCE_PATH, binaryB);
  const binarySha256 = sha256Buffer(fs.readFileSync(binaryA));
  assert.equal(sha256Buffer(fs.readFileSync(binaryB)), binarySha256);
  assert.equal(fs.statSync(binaryA).mode & 0o777, 0o500);

  for (const unsafeKind of ["mode", "special-file-mode", "special-scratch-mode", "symlink", "hardlink"]) {
    await t.test(`typed FSEvents helper rejects ${unsafeKind} config`, async (subtest) => {
      const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
        const content = Buffer.from(`${fs.realpathSync(watched)}\0`);
        if (unsafeKind === "mode") {
          fs.writeFileSync(configPath, content, { mode: 0o644 });
        } else if (unsafeKind === "special-file-mode") {
          fs.writeFileSync(configPath, content, { mode: 0o600 });
          fs.chmodSync(configPath, 0o4600);
        } else if (unsafeKind === "special-scratch-mode") {
          fs.writeFileSync(configPath, content, { mode: 0o600 });
        } else {
          const backing = path.join(parent, `roots-${unsafeKind}-${crypto.randomUUID()}.config`);
          fs.writeFileSync(backing, content, { mode: 0o600 });
          if (unsafeKind === "symlink") fs.symlinkSync(backing, configPath);
          else fs.linkSync(backing, configPath);
        }
      });
      if (unsafeKind === "special-scratch-mode") fs.chmodSync(fixture.scratch, 0o1700);
      let stdout = "";
      let stderr = "";
      const child = spawn(binaryA, [fixture.scratch], {
        stdio: ["pipe", "pipe", "pipe"]
      });
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
      subtest.after(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
      const rejected = await Promise.race([
        completed,
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`${unsafeKind} config timed out instead of failing closed`)),
          5_000
        ))
      ]);
      assert.equal(Number.isInteger(rejected.code), true, `${unsafeKind} config did not exit normally`);
      assert.notEqual(rejected.code, 0, `${unsafeKind} config unexpectedly started helper`);
      assert.match(`${stdout}\n${stderr}`, /config|scratch|safe|mode|link|regular/i);
    });
  }

  await t.test("typed FSEvents helper rejects a new command sequence written through the startup inode", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
    subtest.after(async () => {
      if (child.exitCode === null) child.kill("SIGKILL");
      await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    });
    const ackPath = path.join(fixture.scratch, "ack.bin");
    const ready = await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
    const startupCommand = fs.lstatSync(fixture.commandPath, { bigint: true });
    const commandDescriptor = fs.openSync(
      fixture.commandPath,
      fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW
    );
    try {
      const command = typedFseventsCommand(1, 1n);
      assert.equal(fs.writeSync(commandDescriptor, command, 0, command.length, 0), command.length);
      fs.ftruncateSync(commandDescriptor, command.length);
      fs.fsyncSync(commandDescriptor);
    } finally {
      fs.closeSync(commandDescriptor);
    }
    assert.equal(fs.lstatSync(fixture.commandPath, { bigint: true }).ino, startupCommand.ino);
    const exit = await Promise.race([
      completed,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("typed FSEvents same-inode command did not fail closed")),
        5_000
      ))
    ]);
    assert.notEqual(exit.code, 0, stderr);
    const remainingAck = parseTypedFseventsAck(fs.readFileSync(ackPath));
    const remainingAckStat = fs.lstatSync(ackPath, { bigint: true });
    assert.equal(remainingAck.type, 1);
    assert.equal(remainingAck.sequence, 0n);
    assert.equal(remainingAckStat.ino, ready.visibleInode);
    const remainingCommit = readCommittedTypedFseventsAck(ackPath);
    assert.equal(remainingCommit.type, 1);
    assert.equal(remainingCommit.sequence, 0n);
    assert.equal(remainingCommit.commitVisibleInode, ready.commitVisibleInode);
  });

  await t.test("typed FSEvents helper rejects a fresh-inode MFSC v1 command", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
    subtest.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    });
    const ackPath = path.join(fixture.scratch, "ack.bin");
    const ready = await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
    const legacyCommand = typedFseventsCommand(1, 1n);
    legacyCommand.writeUInt16LE(1, 4);
    const temporaryCommandPath = path.join(fixture.scratch, `.command-v1-${crypto.randomUUID()}`);
    fs.writeFileSync(temporaryCommandPath, legacyCommand, { mode: 0o600 });
    fs.chmodSync(temporaryCommandPath, 0o600);
    const temporaryDescriptor = fs.openSync(temporaryCommandPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(temporaryDescriptor); } finally { fs.closeSync(temporaryDescriptor); }
    fs.renameSync(temporaryCommandPath, fixture.commandPath);
    const directoryDescriptor = fs.openSync(fixture.scratch, fs.constants.O_RDONLY);
    try { fs.fsyncSync(directoryDescriptor); } finally { fs.closeSync(directoryDescriptor); }

    const exit = await Promise.race([
      completed,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("typed FSEvents MFSC v1 command did not fail closed")),
        5_000
      ))
    ]);
    assert.notEqual(exit.code, 0, stderr);
    const remaining = readCommittedTypedFseventsAck(ackPath);
    assert.equal(remaining.type, ready.type);
    assert.equal(remaining.sequence, ready.sequence);
    assert.equal(remaining.visibleInode, ready.visibleInode);
    assert.equal(remaining.commitVisibleInode, ready.commitVisibleInode);
  });

  await t.test("typed FSEvents helper rejects a fresh-inode duplicate kept visible for a bounded observation window", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
    subtest.after(async () => {
      if (child.exitCode === null) child.kill("SIGKILL");
      await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    });
    const ackPath = path.join(fixture.scratch, "ack.bin");
    const ready = await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
    publishTypedFseventsCommand(fixture.commandPath, 1, 1n);
    const baseline = await waitForTypedFseventsAck(ackPath, {
      type: 2,
      sequence: 1n,
      previousInode: ready.visibleInode,
      previousCommitInode: ready.commitVisibleInode
    }, child, () => stderr);

    const duplicateInode = publishTypedFseventsCommand(fixture.commandPath, 1, 1n);
    const duplicateObservationTimeoutMs = 500;
    const duplicateRejected = await waitForCondition(
      () => child.exitCode !== null || child.signalCode !== null,
      duplicateObservationTimeoutMs
    );
    // The overwrite occurs only after that bounded opportunity; this test does
    // not claim detection when an inode is overwritten before any observation.
    const commandDescriptor = fs.openSync(
      fixture.commandPath,
      fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW
    );
    try {
      const advancedCommand = typedFseventsCommand(1, 2n);
      assert.equal(
        fs.writeSync(commandDescriptor, advancedCommand, 0, advancedCommand.length, 0),
        advancedCommand.length
      );
      fs.ftruncateSync(commandDescriptor, advancedCommand.length);
      fs.fsyncSync(commandDescriptor);
    } finally {
      fs.closeSync(commandDescriptor);
    }
    assert.equal(fs.lstatSync(fixture.commandPath, { bigint: true }).ino, duplicateInode);

    const settled = await waitForCondition(() => {
      if (child.exitCode !== null || child.signalCode !== null) return true;
      return readCommittedTypedFseventsAck(ackPath)?.sequence === 2n;
    }, 5_000);
    assert.equal(settled, true, "typed FSEvents duplicate-inode bypass did not settle");
    assert.equal(
      duplicateRejected,
      true,
      "typed FSEvents helper did not reject the duplicate while it remained visible"
    );
    assert.equal(Number.isInteger(child.exitCode), true, stderr);
    assert.notEqual(child.exitCode, 0, stderr);
    const remainingCommit = readCommittedTypedFseventsAck(ackPath);
    assert.equal(remainingCommit.type, baseline.type);
    assert.equal(remainingCommit.sequence, baseline.sequence);
    assert.equal(remainingCommit.visibleInode, baseline.visibleInode);
    assert.equal(remainingCommit.commitVisibleInode, baseline.commitVisibleInode);
  });

  for (const tamperKind of ["chmod", "rename-replacement"]) {
    await t.test(`typed FSEvents journal ${tamperKind} fails closed without a matching ACK`, async (subtest) => {
      const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
        fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
      });
      let stderr = "";
      const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
      subtest.after(async () => {
        if (child.exitCode === null) child.kill("SIGKILL");
        await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
      });
      const ackPath = path.join(fixture.scratch, "ack.bin");
      const commitPath = path.join(fixture.scratch, "ack.commit");
      const journalPath = path.join(fixture.scratch, "journal.bin");
      const ready = await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
      const readyAckBytes = fs.readFileSync(ackPath);
      const readyCommitBytes = fs.readFileSync(commitPath);
      if (tamperKind === "chmod") {
        fs.chmodSync(journalPath, 0o644);
      } else {
        fs.renameSync(journalPath, path.join(fixture.scratch, "journal-held.bin"));
        fs.writeFileSync(journalPath, Buffer.alloc(0), { mode: 0o600 });
      }
      publishTypedFseventsCommand(fixture.commandPath, 1, 1n);
      const exit = await Promise.race([
        completed,
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`typed FSEvents ${tamperKind} did not fail closed`)),
          5_000
        ))
      ]);
      assert.notEqual(exit.code, 0, stderr);
      const remainingAckBytes = fs.readFileSync(ackPath);
      const remainingAck = parseTypedFseventsAck(remainingAckBytes);
      const remainingAckStat = fs.lstatSync(ackPath, { bigint: true });
      assert.deepEqual(remainingAckBytes, readyAckBytes);
      assert.deepEqual(fs.readFileSync(commitPath), readyCommitBytes);
      assert.equal(remainingAck.type, 1);
      assert.equal(remainingAck.sequence, 0n);
      assert.equal(remainingAckStat.ino, ready.visibleInode);
      assert.equal(readCommittedTypedFseventsAck(ackPath), null);
      assert.equal(fs.lstatSync(commitPath, { bigint: true }).ino, ready.commitVisibleInode);
    });
  }

  await t.test("typed FSEvents journal same-inode same-size pwrite fails closed at the next endpoint", async (subtest) => {
    const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
      fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
    });
    let stderr = "";
    const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
    subtest.after(async () => {
      if (child.exitCode === null) child.kill("SIGKILL");
      await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    });
    const ackPath = path.join(fixture.scratch, "ack.bin");
    const commitPath = path.join(fixture.scratch, "ack.commit");
    const journalPath = path.join(fixture.scratch, "journal.bin");
    const target = path.join(fixture.watched, "digest-target.txt");
    const ready = await waitForTypedFseventsAck(
      ackPath,
      { type: 1, sequence: 0n },
      child,
      () => stderr
    );
    fs.writeFileSync(target, "material journal event\n", { mode: 0o600 });
    const eventFlush = await flushTypedFseventsUntil({
      commandPath: fixture.commandPath,
      ackPath,
      child,
      stderr: () => stderr,
      previousAck: ready,
      nextSequence: 1n,
      predicate: (acknowledgement) => acknowledgement.journalHighWater > 0n,
      label: "journal event"
    });
    const committedAck = eventFlush.acknowledgement;
    const committedAckBytes = fs.readFileSync(ackPath);
    const committedCommitBytes = fs.readFileSync(commitPath);
    const journalBefore = fs.lstatSync(journalPath, { bigint: true });
    const journalDescriptor = fs.openSync(
      journalPath,
      fs.constants.O_RDWR | fs.constants.O_NOFOLLOW
    );
    try {
      const byte = Buffer.alloc(1);
      assert.equal(fs.readSync(journalDescriptor, byte, 0, 1, 0), 1);
      byte[0] ^= 0xff;
      assert.equal(fs.writeSync(journalDescriptor, byte, 0, 1, 0), 1);
      fs.fsyncSync(journalDescriptor);
    } finally {
      fs.closeSync(journalDescriptor);
    }
    const journalAfter = fs.lstatSync(journalPath, { bigint: true });
    assert.equal(journalAfter.dev, journalBefore.dev);
    assert.equal(journalAfter.ino, journalBefore.ino);
    assert.equal(journalAfter.size, journalBefore.size);

    const commandSequence = eventFlush.nextSequence;
    publishTypedFseventsCommand(fixture.commandPath, 1, commandSequence);
    const exit = await Promise.race([
      completed,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("typed FSEvents same-size journal pwrite did not fail closed")),
        5_000
      ))
    ]);
    assert.notEqual(exit.code, 0, stderr);
    const remainingAckBytes = fs.readFileSync(ackPath);
    const remainingAck = parseTypedFseventsAck(remainingAckBytes);
    const remainingAckStat = fs.lstatSync(ackPath, { bigint: true });
    assert.deepEqual(remainingAckBytes, committedAckBytes);
    assert.deepEqual(fs.readFileSync(commitPath), committedCommitBytes);
    assert.equal(remainingAck.type, committedAck.type);
    assert.equal(remainingAck.sequence, committedAck.sequence);
    assert.equal(remainingAckStat.ino, committedAck.visibleInode);
    assert.equal(readCommittedTypedFseventsAck(ackPath), null);
    assert.equal(fs.lstatSync(commitPath, { bigint: true }).ino, committedAck.commitVisibleInode);
  });

  const fixture = makeTypedFseventsScratch(parent, ({ configPath, watched }) => {
    fs.writeFileSync(configPath, Buffer.from(`${fs.realpathSync(watched)}\0`), { mode: 0o600 });
  });
  const target = path.join(fixture.watched, "tracked.txt");
  const materialTarget = path.join(fixture.watched, "material-restored.txt");
  const original = Buffer.from("original bytes\n");
  const materialOriginal = Buffer.from("material original bytes\n");
  fs.writeFileSync(target, original, { mode: 0o600 });
  fs.writeFileSync(materialTarget, materialOriginal, { mode: 0o600 });
  const fixedTime = new Date("2024-01-02T03:04:05.000Z");
  fs.utimesSync(target, fixedTime, fixedTime);
  fs.utimesSync(materialTarget, fixedTime, fixedTime);
  const materialBaseline = fs.statSync(materialTarget);

  let stderr = "";
  const child = spawn(binaryA, [fixture.scratch], { stdio: ["pipe", "ignore", "pipe"] });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const completed = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
  t.after(async () => {
    if (child.exitCode === null) child.kill("SIGKILL");
    await Promise.race([completed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  });

  const ackPath = path.join(fixture.scratch, "ack.bin");
  const ackCommitPath = path.join(fixture.scratch, "ack.commit");
  const journalPath = path.join(fixture.scratch, "journal.bin");
  const rootsConfigBytes = fs.readFileSync(fixture.configPath);
  const expectedNativeRootCount = rootsConfigBytes.filter((byte) => byte === 0).length;
  const expectedNativeRootFingerprint = crypto.createHash("sha256").update(rootsConfigBytes).digest("hex");
  const assertNativeEndpointBinding = (acknowledgement) => {
    assert.equal(acknowledgement.eventRootCount, BigInt(expectedNativeRootCount));
    assert.equal(acknowledgement.eventRootFingerprint.toString("hex"), expectedNativeRootFingerprint);
    const journalStatus = fs.lstatSync(journalPath, { bigint: true });
    assert.equal(acknowledgement.journalDevice, journalStatus.dev);
    assert.equal(acknowledgement.journalInode, journalStatus.ino);
    const journalPrefix = fs.readFileSync(journalPath).subarray(
      0,
      Number(acknowledgement.journalHighWater)
    );
    assert.equal(BigInt(journalPrefix.length), acknowledgement.journalHighWater);
    assert.equal(
      acknowledgement.journalSha256.toString("hex"),
      crypto.createHash("sha256").update(journalPrefix).digest("hex")
    );
    assert.deepEqual(acknowledgement.journalPrefix, journalPrefix);
  };
  const ready = await waitForTypedFseventsAck(ackPath, { type: 1, sequence: 0n }, child, () => stderr);
  assert.equal(ready.status, 0);
  assertNativeEndpointBinding(ready);
  for (const securePath of [fixture.configPath, fixture.commandPath, ackPath, ackCommitPath, journalPath]) {
    const stat = fs.lstatSync(securePath);
    assert.equal(stat.isFile(), true);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.mode & 0o7777, 0o600);
    assert.equal(stat.nlink, 1);
  }
  assert.equal(fs.statSync(fixture.scratch).mode & 0o7777, 0o700);

  let nextCommandSequence = 1n;
  const baselineSequence = nextCommandSequence;
  nextCommandSequence += 1n;
  publishTypedFseventsCommand(fixture.commandPath, 1, baselineSequence);
  const baselineAck = await waitForTypedFseventsAck(ackPath, {
    type: 2,
    sequence: baselineSequence,
    previousInode: ready.visibleInode,
    previousCommitInode: ready.commitVisibleInode
  }, child, () => stderr);
  assertNativeEndpointBinding(baselineAck);
  execFileSync("/usr/bin/xattr", ["-w", "com.mais.task1", "metadata-only", target], {
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  const xattrFlush = await flushTypedFseventsUntil({
    commandPath: fixture.commandPath,
    ackPath,
    child,
    stderr: () => stderr,
    previousAck: baselineAck,
    nextSequence: nextCommandSequence,
    predicate: (acknowledgement) => parseTypedFseventsJournal(
      fs.readFileSync(journalPath).subarray(0, Number(acknowledgement.journalHighWater))
    ).some((record) => (
      record.sequence > baselineAck.entryCount
      && record.path === target
      && (record.flags & 0x8000) !== 0
    )),
    label: "xattr event"
  });
  const xattrAck = xattrFlush.acknowledgement;
  assertNativeEndpointBinding(xattrAck);
  nextCommandSequence = xattrFlush.nextSequence;
  const xattrHighWater = Number(xattrAck.journalHighWater);
  assert.ok(BigInt(xattrHighWater) === xattrAck.journalHighWater);
  const xattrRecords = parseTypedFseventsJournal(fs.readFileSync(journalPath).subarray(0, xattrHighWater));
  const xattrEvent = xattrRecords.findLast((record) => (
    record.sequence > baselineAck.entryCount && record.path === target && (record.flags & 0x8000) !== 0
  ));
  assert.ok(xattrEvent, JSON.stringify(xattrRecords.map((record) => ({ ...record, sequence: record.sequence.toString(), eventId: record.eventIdDecimal, endOffset: record.endOffset.toString() }))));
  assert.ok(xattrEvent.endOffset <= xattrAck.journalHighWater);
  if (xattrEvent.flags === 0x18000) assert.equal(classifyTypedFseventsFlags(xattrEvent.flags), "xattr-only");
  else assert.equal(classifyTypedFseventsFlags(xattrEvent.flags), "source");

  fs.writeFileSync(materialTarget, "temporary material bytes\n");
  fs.writeFileSync(materialTarget, materialOriginal);
  fs.utimesSync(materialTarget, materialBaseline.atime, materialBaseline.mtime);
  assert.deepEqual(fs.readFileSync(materialTarget), materialOriginal);
  assert.equal(fs.statSync(materialTarget).mtimeMs, materialBaseline.mtimeMs);
  const restoredFlush = await flushTypedFseventsUntil({
    commandPath: fixture.commandPath,
    ackPath,
    child,
    stderr: () => stderr,
    previousAck: xattrAck,
    nextSequence: nextCommandSequence,
    predicate: (acknowledgement) => parseTypedFseventsJournal(
      fs.readFileSync(journalPath).subarray(0, Number(acknowledgement.journalHighWater))
    ).some((record) => (
      record.sequence > xattrAck.entryCount
      && record.path === materialTarget
      && (record.flags & 0x1000) !== 0
    )),
    label: "write-and-restore event"
  });
  const restoredAck = restoredFlush.acknowledgement;
  assertNativeEndpointBinding(restoredAck);
  nextCommandSequence = restoredFlush.nextSequence;
  const restoredRecords = parseTypedFseventsJournal(fs.readFileSync(journalPath).subarray(0, Number(restoredAck.journalHighWater)));
  const materialEvent = restoredRecords.findLast((record) => (
    record.sequence > xattrAck.entryCount && record.path === materialTarget && (record.flags & 0x1000) !== 0
  ));
  assert.ok(materialEvent, JSON.stringify(restoredRecords.map((record) => ({ path: record.path, flags: record.flags.toString(16), sequence: record.sequence.toString() }))));
  assert.equal(classifyTypedFseventsFlags(materialEvent.flags), "source");

  const consecutiveFlushSequence = nextCommandSequence;
  nextCommandSequence += 1n;
  publishTypedFseventsCommand(fixture.commandPath, 1, consecutiveFlushSequence);
  const secondConsecutiveFlush = await waitForTypedFseventsAck(ackPath, {
    type: 2,
    sequence: consecutiveFlushSequence,
    previousInode: restoredAck.visibleInode,
    previousCommitInode: restoredAck.commitVisibleInode
  }, child, () => stderr);
  assertNativeEndpointBinding(secondConsecutiveFlush);
  assert.ok(xattrAck.sequence > baselineAck.sequence);
  assert.ok(xattrAck.journalHighWater >= baselineAck.journalHighWater);
  assert.ok(xattrAck.entryCount >= baselineAck.entryCount);
  assert.ok(restoredAck.sequence > xattrAck.sequence);
  assert.ok(restoredAck.journalHighWater >= xattrAck.journalHighWater);
  assert.ok(restoredAck.entryCount >= xattrAck.entryCount);
  assert.ok(secondConsecutiveFlush.sequence > restoredAck.sequence);
  assert.ok(secondConsecutiveFlush.journalHighWater >= restoredAck.journalHighWater);
  assert.ok(secondConsecutiveFlush.entryCount >= restoredAck.entryCount);

  const stopSequence = nextCommandSequence;
  publishTypedFseventsCommand(fixture.commandPath, 2, stopSequence);
  const stopped = await waitForTypedFseventsAck(ackPath, {
    type: 3,
    sequence: stopSequence,
    previousInode: secondConsecutiveFlush.visibleInode,
    previousCommitInode: secondConsecutiveFlush.commitVisibleInode,
    terminal: true
  }, child, () => stderr);
  assertNativeEndpointBinding(stopped);
  const exit = await Promise.race([
    completed,
    new Promise((_, reject) => setTimeout(() => reject(new Error("typed FSEvents STOP timed out")), 5_000))
  ]);
  assert.deepEqual(exit, { code: 0, signal: null }, stderr);
  assert.ok(stopped.journalHighWater >= secondConsecutiveFlush.journalHighWater);
  assert.ok(stopped.entryCount >= secondConsecutiveFlush.entryCount);
  assert.equal(BigInt(fs.statSync(journalPath).size), stopped.journalHighWater);
  assert.equal(sha256Buffer(fs.readFileSync(TYPED_FSEVENTS_HELPER_SOURCE_PATH)), sourceSha256);
  assert.equal(sha256Buffer(fs.readFileSync(binaryA)), binarySha256);
});

function makeStableProofTestRoot(t, label) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `mais-stable-proof-${label}-`));
  t.after(() => fs.rmSync(parent, { force: true, recursive: true }));
  const root = path.join(parent, "root");
  fs.mkdirSync(root);
  return { parent, root: fs.realpathSync(root) };
}

function stableProofEntryMap(snapshot) {
  return new Map(snapshot.entries.map((entry) => [entry.path, entry.proof]));
}

function stableProofOpenDescriptorCount() {
  return fs.readdirSync("/dev/fd").length;
}

test("stable proof snapshot export and complete ignored generated tombstone namespace", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const { root } = makeStableProofTestRoot(t, "complete");
  fs.writeFileSync(path.join(root, ".gitignore"), "ignored/\n");
  fs.mkdirSync(path.join(root, "ignored", "generated"), { recursive: true });
  fs.writeFileSync(path.join(root, "ignored", "generated", "cache.bin"), "cache\n");
  fs.writeFileSync(path.join(root, "tracked.txt"), "tracked\n");
  const policy = Object.freeze({
    root,
    trackedRelativePaths: Object.freeze(["missing.txt", "tracked.txt"])
  });
  const snapshot = captureStableProofSnapshot({ policies: [policy] });
  const byPath = stableProofEntryMap(snapshot);
  const expectedPaths = [
    root,
    path.join(root, ".gitignore"),
    path.join(root, "ignored"),
    path.join(root, "ignored", "generated"),
    path.join(root, "ignored", "generated", "cache.bin"),
    path.join(root, "missing.txt"),
    path.join(root, "tracked.txt")
  ].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  assert.deepEqual(snapshot.entries.map((entry) => entry.path), expectedPaths);
  assert.equal(snapshot.pathCount, expectedPaths.length);
  assert.equal(snapshot.regularBytes, Buffer.byteLength("ignored/\ncache\ntracked\n"));
  assert.match(snapshot.sha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(byPath.get(path.join(root, "missing.txt")), { type: "tombstone" });
  assert.equal(byPath.get(path.join(root, "ignored", "generated", "cache.bin")).type, "regular-file");
  assert.equal(snapshot.lookup(path.join(root, "tracked.txt")), byPath.get(path.join(root, "tracked.txt")));
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.entries));
  assert.ok(Object.isFrozen(snapshot.entries[0]));
  assert.ok(Object.isFrozen(snapshot.entries[0].proof));
  assert.ok(Object.isFrozen(snapshot.lookup));
  assert.ok(Object.isFrozen(snapshot.policies));
});

test("stable proof snapshot records symlink and directory types without traversal and rejects specials", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const { parent, root } = makeStableProofTestRoot(t, "types");
  const outside = path.join(parent, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.txt"), "outside\n");
  fs.symlinkSync("../outside", path.join(root, "link"));
  fs.mkdirSync(path.join(root, "directory"));
  const snapshot = captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] });
  const byPath = stableProofEntryMap(snapshot);
  assert.equal(byPath.get(root).type, "directory");
  assert.equal(byPath.get(path.join(root, "link")).type, "symlink");
  assert.equal(byPath.get(path.join(root, "link")).target, "../outside");
  assert.equal(byPath.has(path.join(root, "link", "secret.txt")), false);
  const fifo = path.join(root, "special.fifo");
  const madeFifo = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
  assert.equal(madeFifo.status, 0, madeFifo.stderr);
  assert.throws(
    () => captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] }),
    /special|regular file|directory|symlink|unsupported/i
  );
});

test("stable proof snapshot fails closed on deterministic regular pwrite write-restore and rename races", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const scenarios = [
    ["pwrite", (target) => {
      const descriptor = fs.openSync(target, "r+");
      try { fs.writeSync(descriptor, Buffer.from("Z"), 0, 1, 0); } finally { fs.closeSync(descriptor); }
    }],
    ["write-restore", (target, original, baseline) => {
      fs.writeFileSync(target, "temporary replacement bytes\n");
      fs.writeFileSync(target, original);
      fs.utimesSync(target, baseline.atime, baseline.mtime);
    }],
    ["visible-rename", (target, original) => {
      fs.renameSync(target, `${target}.held-original`);
      fs.writeFileSync(target, original);
    }]
  ];
  for (const [label, mutate] of scenarios) {
    await t.test(label, () => {
      const { root } = makeStableProofTestRoot(t, `race-${label}`);
      const target = path.join(root, "target.txt");
      const original = Buffer.from("original stable bytes\n");
      fs.writeFileSync(target, original);
      const baseline = fs.statSync(target);
      const descriptorCount = stableProofOpenDescriptorCount();
      let seamInvoked = false;
      assert.throws(() => captureStableProofSnapshot({
        hooks: {
          afterRegularRead(event) {
            if (event.path !== target) return;
            seamInvoked = true;
            mutate(target, original, baseline);
          }
        },
        policies: [{ root, trackedRelativePaths: ["target.txt"] }]
      }), /changed|rebind|stable|observation|namespace/i);
      assert.equal(seamInvoked, true);
      assert.ok(stableProofOpenDescriptorCount() <= descriptorCount + 1);
    });
  }
});

test("stable proof snapshot fails closed on deterministic directory and root races", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const directoryFixture = makeStableProofTestRoot(t, "directory-race");
  const directory = path.join(directoryFixture.root, "nested");
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "before.txt"), "before\n");
  let directorySeamInvoked = false;
  assert.throws(() => captureStableProofSnapshot({
    hooks: {
      afterDirectoryRead(event) {
        if (event.path !== directory) return;
        directorySeamInvoked = true;
        fs.writeFileSync(path.join(directory, "after.txt"), "after\n");
      }
    },
    policies: [{ root: directoryFixture.root, trackedRelativePaths: [] }]
  }), /directory|namespace|changed|stable/i);
  assert.equal(directorySeamInvoked, true);

  const rootFixture = makeStableProofTestRoot(t, "root-race");
  fs.writeFileSync(path.join(rootFixture.root, "file.txt"), "root\n");
  const moved = `${rootFixture.root}.held-original`;
  let rootSeamInvoked = false;
  assert.throws(() => captureStableProofSnapshot({
    hooks: {
      beforeRootRevalidate(event) {
        if (event.path !== rootFixture.root) return;
        rootSeamInvoked = true;
        fs.renameSync(rootFixture.root, moved);
        fs.mkdirSync(rootFixture.root);
      }
    },
    policies: [{ root: rootFixture.root, trackedRelativePaths: [] }]
  }), /root|anchor|rebind|changed|stable/i);
  assert.equal(rootSeamInvoked, true);
});

test("stable proof snapshot rejects noncanonical escaping duplicate and over-cap policies", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const { root } = makeStableProofTestRoot(t, "policy");
  fs.writeFileSync(path.join(root, "present.txt"), "present\n");
  const capture = (policies, options = {}) => captureStableProofSnapshot({ policies, ...options });
  assert.throws(() => capture([{ root: `${root}${path.sep}.`, trackedRelativePaths: [] }]), /canonical.*root|root.*canonical/i);
  assert.throws(() => capture([{ root: path.join(root, "absent"), trackedRelativePaths: [] }]), /existing|root|ENOENT/i);
  assert.throws(() => capture([{ root, trackedRelativePaths: ["../escape"] }]), /tracked|relative|canonical|escape/i);
  assert.throws(() => capture([{ root, trackedRelativePaths: ["/absolute"] }]), /tracked|relative|canonical/i);
  assert.throws(() => capture([{ root, trackedRelativePaths: ["back\\slash"] }]), /tracked|relative|canonical/i);
  assert.throws(() => capture([{ root, trackedRelativePaths: ["missing/"] }]), /tracked|relative|canonical/i);
  assert.throws(
    () => capture([{ root, trackedRelativePaths: [`${"a/".repeat(1_024)}missing`] }]),
    /tombstone depth|depth.*hard cap/i
  );
  assert.throws(() => capture([{
    root,
    trackedRelativePaths: [`long-${"x".repeat(4_096)}`]
  }]), /byte cap|tracked.*path/i);
  assert.throws(() => capture([{ root, trackedRelativePaths: ["same", "same"] }]), /duplicate.*tracked|tracked.*duplicate/i);
  assert.throws(() => capture([
    { root, trackedRelativePaths: [] },
    { root, trackedRelativePaths: [] }
  ]), /duplicate.*root|root.*duplicate/i);
  assert.throws(
    () => capture(Array.from({ length: 4_097 }, () => ({ root, trackedRelativePaths: [] }))),
    /4096|polic.*hard cap/i
  );
  assert.throws(() => capture([{ root, trackedRelativePaths: [] }], { maxPaths: 600_001 }), /600000|hard.*cap|maxPaths/i);
  const unreadable = path.join(root, "blocked.txt");
  fs.writeFileSync(unreadable, "must not be opened\n");
  fs.chmodSync(unreadable, 0o000);
  assert.throws(() => capture([{ root, trackedRelativePaths: [] }], { maxPaths: 1 }), /path.*limit|maxPaths|cap/i);
});

test("stable proof snapshot binds canonical policy and UTF-8 byte order into its fingerprint", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "policy-fingerprint");
  const present = path.join(root, "present.txt");
  fs.writeFileSync(present, "present\n");
  fs.writeFileSync(path.join(root, "z.txt"), "z\n");
  fs.writeFileSync(path.join(root, "é.txt"), "accent\n");
  fs.writeFileSync(path.join(root, "\uE000.txt"), "private-use\n");
  fs.writeFileSync(path.join(root, "\u{10000}.txt"), "astral\n");
  const withoutTrackedPolicy = captureStableProofSnapshot({
    policies: [{ root, trackedRelativePaths: [] }]
  });
  const withTrackedPolicy = captureStableProofSnapshot({
    policies: [{ root, trackedRelativePaths: ["present.txt"] }]
  });
  assert.notEqual(withoutTrackedPolicy.sha256, withTrackedPolicy.sha256);
  assert.deepEqual(withTrackedPolicy.policies, [{ root, trackedRelativePaths: ["present.txt"] }]);
  assert.ok(Object.isFrozen(withTrackedPolicy.policies));
  assert.ok(Object.isFrozen(withTrackedPolicy.policies[0]));
  assert.ok(Object.isFrozen(withTrackedPolicy.policies[0].trackedRelativePaths));
  assert.deepEqual(
    withTrackedPolicy.lookup(root).names,
    ["present.txt", "z.txt", "é.txt", "\uE000.txt", "\u{10000}.txt"],
    "UTF-8 byte ordering must differ from a default UTF-16 .sort() regression"
  );
  fs.writeFileSync(present, "changed\n");
  const changed = captureStableProofSnapshot({
    policies: [{ root, trackedRelativePaths: ["present.txt"] }]
  });
  assert.notEqual(withTrackedPolicy.sha256, changed.sha256);
});

test("stable proof snapshot detects a symlink target mutation through the unified hook seam", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "symlink-race");
  fs.writeFileSync(path.join(root, "target-a"), "a\n");
  fs.writeFileSync(path.join(root, "target-b"), "b\n");
  const link = path.join(root, "link");
  fs.symlinkSync("target-a", link);
  let seamInvoked = false;
  assert.throws(() => captureStableProofSnapshot({
    hooks: {
      afterSymlinkRead(event) {
        if (event.path !== link) return;
        seamInvoked = true;
        fs.unlinkSync(link);
        fs.symlinkSync("target-b", link);
      }
    },
    policies: [{ root, trackedRelativePaths: [] }]
  }), /stable proof|snapshot|namespace|changed/i);
  assert.equal(seamInvoked, true);
});

test("stable proof snapshot rejects a huge sparse file before reading content", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "huge-file-cap");
  const huge = path.join(root, "huge.bin");
  fs.writeFileSync(huge, "");
  fs.truncateSync(huge, (8 * 1024 * 1024 * 1024) + 1);
  assert.throws(
    () => captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] }),
    /per-file byte cap|file.*cap/i
  );
});

test("stable proof snapshot captures 15000 real files with repeatable fingerprint and bounded resources", async (t) => {
  const { captureStableProofSnapshot } = await import(libraryUrl);
  assert.equal(typeof captureStableProofSnapshot, "function", "captureStableProofSnapshot export is missing");
  const { root } = makeStableProofTestRoot(t, "scale");
  const bulk = path.join(root, "bulk");
  fs.mkdirSync(bulk);
  for (let index = 0; index < 15_000; index += 1) {
    fs.writeFileSync(path.join(bulk, `${String(index).padStart(5, "0")}.txt`), "x");
  }
  const policy = { root, trackedRelativePaths: [] };
  const descriptorsBefore = stableProofOpenDescriptorCount();
  const heapBefore = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const first = captureStableProofSnapshot({ policies: [policy] });
  const second = captureStableProofSnapshot({ policies: [policy] });
  const elapsedMs = performance.now() - startedAt;
  const heapGrowth = process.memoryUsage().heapUsed - heapBefore;
  assert.equal(first.pathCount, 15_002);
  assert.equal(first.regularBytes, 15_000);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.lookup(path.join(bulk, "00000.txt")).type, "regular-file");
  assert.ok(first.helperPeakRssBytes <= 512 * 1024 * 1024, `helper RSS ${first.helperPeakRssBytes}`);
  assert.ok(second.helperPeakRssBytes <= 512 * 1024 * 1024, `helper RSS ${second.helperPeakRssBytes}`);
  assert.ok(elapsedMs < 30_000, `two 15000-file snapshots took ${elapsedMs.toFixed(1)} ms`);
  assert.ok(heapGrowth < 128 * 1024 * 1024, `snapshot heap grew by ${heapGrowth} bytes`);
  assert.ok(stableProofOpenDescriptorCount() <= descriptorsBefore + 1);
});

test("Task 3B2 fixed-point reconciliation exports the five pure state-machine APIs", async () => {
  const library = await import(libraryUrl);
  for (const name of [
    "normalizeTypedFseventsAckCheckpoint",
    "readAndValidateJournalExtension",
    "reconcileFixedPoint",
    "commitReconciliation",
    "sealTerminal"
  ]) {
    assert.equal(typeof library[name], "function", `${name} export is missing`);
  }
});

test("Task 3B2 detached reconciliation closure embeds one ACK provenance domain", () => {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  const start = source.indexOf("const TYPED_FSEVENTS_RECONCILIATION_CHILD_SOURCE = [");
  const end = source.indexOf("].map((implementation) => implementation.toString()).join", start);
  assert.ok(start >= 0 && end > start, "embedded reconciliation source array is missing");
  const embedded = source.slice(start, end);
  const dependencies = [
    "TYPED_FSEVENTS_MAX_UINT64 =",
    "TYPED_FSEVENTS_VALIDATED_CHECKPOINTS = new WeakMap",
    "TYPED_FSEVENTS_PROVENANCE_ORDINAL = 0n",
    "TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS = new WeakMap",
    "STABLE_PROOF_DESCRIPTOR_WALKER =",
    "typedFseventsNextProvenanceOrdinal,",
    "captureStableProofSnapshot,",
    "sameTypedFseventsJournalIdentity,",
    "readCommittedTypedFseventsAcknowledgement,",
    "runTypedFseventsFixedCycle,"
  ];
  let priorIndex = -1;
  for (const dependency of dependencies) {
    const index = embedded.indexOf(dependency);
    assert.ok(index > priorIndex, `${dependency} must be embedded in dependency order`);
    priorIndex = index;
  }
});

function task3b2ReadAcknowledgement(library, scratch, {
  entryCount = 0n,
  journal = Buffer.alloc(0),
  lastEventId = 0n,
  root,
  sequence,
  type = 2
}) {
  const published = writeTypedFseventsV2Endpoint(scratch, {
    entryCount,
    journal,
    lastEventId,
    rootsBuffer: Buffer.from(`${root}\0`),
    sequence,
    type
  });
  const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
    published.acknowledgementPath,
    {
      expectedEventRootCount: published.eventRootCount,
      expectedEventRootFingerprint: published.eventRootFingerprint
    }
  );
  assert.notEqual(acknowledgement, null, "the real committed ACK fixture must be readable");
  return acknowledgement;
}

function task3b2NormalizeEndpoint(library, scratch, options) {
  const acknowledgement = task3b2ReadAcknowledgement(library, scratch, options);
  return {
    acknowledgement,
    endpoint: library.normalizeTypedFseventsAckCheckpoint({
      acknowledgement,
      eventRoots: [options.root]
    })
  };
}

function task3b2Capture(library, root) {
  return library.captureStableProofSnapshot({
    policies: [{ root, trackedRelativePaths: [] }]
  });
}

function task3b2ReadExtension(library, {
  candidateSnapshot,
  endpoint,
  eventRoots,
  exactMetadataPaths = [],
  exactMetadataRoots = [],
  priorCheckpoint,
  priorSnapshot,
  trustedGitCommonDir = null
}) {
  return library.readAndValidateJournalExtension({
    candidateSnapshot,
    endpoint,
    eventRoots,
    exactMetadataPaths,
    exactMetadataRoots,
    priorCheckpoint,
    priorSnapshot,
    trustedGitCommonDir
  });
}

function task3b2Scratch(t, label) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `mais-task3b2-${label}-`));
  fs.chmodSync(scratch, 0o700);
  t.after(() => fs.rmSync(scratch, { force: true, recursive: true }));
  return scratch;
}

function task3b2TerminalAttestation(extension, reconciliation) {
  const { classification, checkpoint } = extension;
  return {
    schemaVersion: 2,
    checkpoint: {
      entryCount: checkpoint.entryCount,
      highWater: checkpoint.highWater,
      lastEventId: checkpoint.lastEventId,
      sha256: checkpoint.sha256
    },
    endpointSequence: extension.sequence,
    journalFirstEventId: reconciliation.journalFirstEventId ?? extension.firstDeltaEventId,
    journalLastEventId: checkpoint.lastEventId,
    journalSessionFingerprint: reconciliation.journalSessionFingerprint,
    metadataPolicyFingerprint: reconciliation.metadataPolicyFingerprint,
    pendingEvidenceFingerprint: reconciliation.pendingEvidenceFingerprint,
    pendingMetadataPathCount: reconciliation.pendingMetadataPathCount,
    pendingSourcePathCount: reconciliation.pendingSourcePathCount,
    pendingXattrPathCount: reconciliation.pendingXattrPathCount,
    roundCount: reconciliation.roundCount,
    snapshotSha256: extension.snapshotSha256,
    sourceEpoch: reconciliation.sourceEpoch + (classification.sourceEpochBatch ? 1n : 0n),
    metadataEpoch: reconciliation.metadataEpoch + (classification.metadataEpochBatch ? 1n : 0n),
    xattrEpoch: reconciliation.xattrEpoch + classification.xattrEpochIncrement,
    counters: {
      journalEntryCount: checkpoint.entryCount,
      materialEventCount: reconciliation.counters.materialEventCount
        + classification.materialEventCount,
      sourceEventCount: reconciliation.counters.sourceEventCount
        + classification.sourceEventCount,
      transactionMetadataEventCount: reconciliation.counters.transactionMetadataEventCount
        + classification.transactionMetadataEventCount,
      xattrOnlyEventCount: reconciliation.counters.xattrOnlyEventCount
        + classification.xattrOnlyEventCount,
      droppedEventCount: reconciliation.counters.droppedEventCount,
      unknownEventCount: reconciliation.counters.unknownEventCount,
      unmatchedDeltaCount: reconciliation.counters.unmatchedDeltaCount
    }
  };
}

function task3b2SetXattr(target, value) {
  const attribute = process.platform === "darwin"
    ? "com.mais.task3b2"
    : "user.mais.task3b2";
  if (process.platform === "darwin") {
    execFileSync("/usr/bin/xattr", ["-w", attribute, value, target], {
      stdio: ["ignore", "ignore", "pipe"]
    });
    return;
  }
  execFileSync("python3", [
    "-c",
    [
      "import ctypes,os,sys",
      "libc=ctypes.CDLL(None,use_errno=True)",
      "p=os.fsencode(sys.argv[1]); n=os.fsencode(sys.argv[2]); v=sys.argv[3].encode()",
      "r=libc.setxattr(p,n,v,len(v),0)",
      "r == 0 or (_ for _ in ()).throw(OSError(ctypes.get_errno(), 'setxattr failed'))"
    ].join(";"),
    target,
    attribute,
    value
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function task3b2ReachFixedPoint(library, t, label, prepareRoot = null) {
  const { root } = makeStableProofTestRoot(t, `task3b2-${label}`);
  const scratch = task3b2Scratch(t, label);
  const target = path.join(root, "source.txt");
  fs.writeFileSync(target, "stable source\n");
  if (prepareRoot !== null) prepareRoot({ root, target });
  let snapshot = task3b2Capture(library, root);
  const baseline = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 1n,
    type: 2
  }).endpoint;
  let previous = null;
  let priorCheckpoint = baseline.checkpoint;
  const startedAtNs = 10_000n;
  for (const sequence of [2n, 3n]) {
    const candidateSnapshot = task3b2Capture(library, root);
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root,
      sequence,
      type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint,
      priorSnapshot: snapshot
    });
    const proposal = library.reconcileFixedPoint({
      previous,
      ...(previous === null ? {
        baseline: {
          ackEndpoint: baseline,
          snapshot,
          sourceEpoch: 0n,
          metadataEpoch: 0n,
          xattrEpoch: 0n,
          startedAtNs
        }
      } : {}),
      extension,
      observedAtNs: startedAtNs + sequence
    });
    previous = library.commitReconciliation({
      proposal,
      committedAtNs: startedAtNs + sequence
    });
    priorCheckpoint = extension.checkpoint;
    snapshot = candidateSnapshot;
  }
  assert.equal(previous.phase, "fixed-point");
  return { checkpoint: priorCheckpoint, reconciliation: previous, root, scratch, snapshot, target };
}

test("Task 3B2 ACK normalization brands committed endpoints and canonicalizes the empty checkpoint", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b2-normalize");
  const scratch = task3b2Scratch(t, "normalize");
  const { acknowledgement, endpoint } = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 7n,
    type: 2
  });
  assert.deepEqual(endpoint, {
    schemaVersion: 2,
    ackType: 2,
    sequence: 7n,
    journalSessionFingerprint: endpoint.journalSessionFingerprint,
    checkpoint: endpoint.checkpoint
  });
  assert.match(endpoint.journalSessionFingerprint, /^[0-9a-f]{64}$/u);
  assert.deepEqual(endpoint.checkpoint, {
    entryCount: 0n,
    highWater: 0n,
    lastEventId: null,
    sha256: crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex")
  });
  assert.ok(Object.isFrozen(endpoint));
  assert.ok(Object.isFrozen(endpoint.checkpoint));
  assert.throws(
    () => library.normalizeTypedFseventsAckCheckpoint({
      acknowledgement: { ...acknowledgement },
      eventRoots: [root]
    }),
    /module|validated|committed|brand|acknowledgement/i
  );

  const malformedEmpty = task3b2ReadAcknowledgement(library, scratch, {
    root,
    sequence: 8n,
    type: 2,
    lastEventId: 99n
  });
  assert.throws(
    () => library.normalizeTypedFseventsAckCheckpoint({
      acknowledgement: malformedEmpty,
      eventRoots: [root]
    }),
    /empty|count|high-water|last event|checkpoint/i
  );
});

test("Task 3B2 ACK buffers are cloned and each disk publication normalizes once", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b2-ack-buffer");
  const scratch = task3b2Scratch(t, "ack-buffer");
  const target = path.join(root, "source.txt");
  fs.writeFileSync(target, "stable\n");
  const baselineSnapshot = task3b2Capture(library, root);
  const baseline = task3b2NormalizeEndpoint(library, scratch, {
    root, sequence: 1n, type: 2
  }).endpoint;
  const candidateSnapshot = task3b2Capture(library, root);
  const journal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 31n,
    flags: 0x11400,
    path: target
  });
  const published = writeTypedFseventsV2Endpoint(scratch, {
    entryCount: 1n,
    journal,
    lastEventId: 31n,
    rootsBuffer: Buffer.from(`${root}\0`),
    sequence: 2n,
    type: 2
  });
  const readPublished = () => {
    const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
      published.acknowledgementPath,
      {
        expectedEventRootCount: published.eventRootCount,
        expectedEventRootFingerprint: published.eventRootFingerprint
      }
    );
    assert.notEqual(acknowledgement, null);
    return acknowledgement;
  };

  const mutatedBeforeNormalization = readPublished();
  mutatedBeforeNormalization.journalPrefix[0] ^= 0xff;
  assert.throws(() => library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement: mutatedBeforeNormalization,
    eventRoots: [root]
  }), /changed|checkpoint|digest|journal|sha/i);

  const acknowledgement = readPublished();
  const endpoint = library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement,
    eventRoots: [root]
  });
  acknowledgement.journalPrefix.fill(0);
  const extension = task3b2ReadExtension(library, {
    candidateSnapshot,
    endpoint,
    eventRoots: [root],
    priorCheckpoint: baseline.checkpoint,
    priorSnapshot: baselineSnapshot
  });
  assert.equal(extension.classification.sourceEventCount, 1n);
  assert.equal(extension.checkpoint.lastEventId, 31n);
  assert.throws(() => library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement,
    eventRoots: [root]
  }), /already|consumed|one.shot|replay/i);

  const replay = readPublished();
  assert.throws(() => library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement: replay,
    eventRoots: [root]
  }), /already|publication|replay|normalized/i);
});

test("Task 3B2 event roots use strict UTF-8 byte order rather than UTF-16 order", async (t) => {
  const library = await import(libraryUrl);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-task3b2-utf8-roots-"));
  fs.chmodSync(parent, 0o700);
  t.after(() => fs.rmSync(parent, { force: true, recursive: true }));
  const bmpRoot = path.join(parent, "\uE000");
  const astralRoot = path.join(parent, "\u{10000}");
  fs.mkdirSync(bmpRoot);
  fs.mkdirSync(astralRoot);
  const jsOrder = [bmpRoot, astralRoot].sort();
  const byteOrder = [bmpRoot, astralRoot].sort((left, right) => (
    Buffer.compare(Buffer.from(left), Buffer.from(right))
  ));
  assert.notDeepEqual(jsOrder, byteOrder);
  const scratch = task3b2Scratch(t, "utf8-roots");
  const rootsBuffer = Buffer.concat(byteOrder.flatMap((root) => [
    Buffer.from(root),
    Buffer.from([0])
  ]));
  const published = writeTypedFseventsV2Endpoint(scratch, {
    rootsBuffer,
    sequence: 7n,
    type: 2
  });
  const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
    published.acknowledgementPath,
    {
      expectedEventRootCount: published.eventRootCount,
      expectedEventRootFingerprint: published.eventRootFingerprint
    }
  );
  assert.notEqual(acknowledgement, null);
  assert.throws(() => library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement,
    eventRoots: jsOrder
  }), /byte order|ordered|utf-8|roots/i);
  const endpoint = library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement,
    eventRoots: byteOrder
  });
  assert.equal(endpoint.schemaVersion, 2);
  assert.match(endpoint.journalSessionFingerprint, /^[0-9a-f]{64}$/u);
});

test("Task 3B2 zero-delta extensions require two exact rounds and proposals are one-shot", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b2-two-rounds");
  const scratch = task3b2Scratch(t, "two-rounds");
  fs.writeFileSync(path.join(root, "source.txt"), "unchanged\n");
  const baselineSnapshot = task3b2Capture(library, root);
  const baseline = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 1n,
    type: 2
  }).endpoint;
  const firstSnapshot = task3b2Capture(library, root);
  const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 2n,
    type: 2
  }).endpoint;
  const firstExtension = task3b2ReadExtension(library, {
    candidateSnapshot: firstSnapshot,
    endpoint: firstEndpoint,
    eventRoots: [root],
    priorCheckpoint: baseline.checkpoint,
    priorSnapshot: baselineSnapshot
  });
  assert.equal(firstExtension.deltaEntryCount, 0n);
  assert.equal(firstExtension.deltaHighWater, 0n);
  assert.equal(firstExtension.firstDeltaEventId, null);
  assert.equal(firstExtension.lastDeltaEventId, null);
  assert.equal(firstExtension.snapshotRelation, "exact");
  assert.deepEqual(firstExtension.classification, {
    journalEntryCount: 0n,
    materialEventCount: 0n,
    metadataEpochBatch: false,
    sourceEpochBatch: false,
    sourceEventCount: 0n,
    transactionMetadataEventCount: 0n,
    xattrEpochIncrement: 0n,
    xattrOnlyEventCount: 0n
  });
  assert.ok(Object.isFrozen(firstExtension));
  assert.equal(firstExtension.schemaVersion, 2);
  assert.equal(firstExtension.journalSessionFingerprint, firstEndpoint.journalSessionFingerprint);
  assert.match(firstExtension.metadataPolicyFingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(firstExtension.snapshotSha256, firstSnapshot.sha256);
  const invalidCheckpointSnapshot = task3b2Capture(library, root);
  const invalidCheckpointEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 99n,
    type: 2
  }).endpoint;
  assert.throws(() => task3b2ReadExtension(library, {
    candidateSnapshot: invalidCheckpointSnapshot,
    endpoint: invalidCheckpointEndpoint,
    eventRoots: [root],
    priorCheckpoint: { ...baseline.checkpoint },
    priorSnapshot: baselineSnapshot
  }), /module|validated|checkpoint|brand/i);

  const startedAtNs = 1_000n;
  const firstProposal = library.reconcileFixedPoint({
    previous: null,
    baseline: {
      ackEndpoint: baseline,
      snapshot: baselineSnapshot,
      sourceEpoch: 0n,
      metadataEpoch: 0n,
      xattrEpoch: 0n,
      startedAtNs
    },
    extension: firstExtension,
    observedAtNs: 2_000n
  });
  assert.equal(firstProposal.schemaVersion, 2);
  assert.equal(firstProposal.journalSessionFingerprint, firstExtension.journalSessionFingerprint);
  assert.equal(firstProposal.metadataPolicyFingerprint, firstExtension.metadataPolicyFingerprint);
  assert.equal(firstProposal.snapshotSha256, firstSnapshot.sha256);
  assert.equal("snapshot" in firstProposal, false);
  assert.throws(
    () => library.commitReconciliation({ proposal: { ...firstProposal }, committedAtNs: 2_001n }),
    /module|validated|proposal|brand/i
  );
  const firstState = library.commitReconciliation({
    proposal: firstProposal,
    committedAtNs: 2_001n
  });
  assert.equal(firstState.phase, "reconciling");
  assert.equal(firstState.journalSessionFingerprint, firstProposal.journalSessionFingerprint);
  assert.equal(firstState.metadataPolicyFingerprint, firstProposal.metadataPolicyFingerprint);
  assert.equal(firstState.snapshotSha256, firstProposal.snapshotSha256);
  assert.equal("snapshot" in firstState, false);
  assert.throws(
    () => library.commitReconciliation({ proposal: firstProposal, committedAtNs: 2_002n }),
    /already|consumed|one-shot|stale|proposal/i
  );

  const secondSnapshot = task3b2Capture(library, root);
  const secondEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 3n,
    type: 2
  }).endpoint;
  const secondExtension = task3b2ReadExtension(library, {
    candidateSnapshot: secondSnapshot,
    endpoint: secondEndpoint,
    eventRoots: [root],
    priorCheckpoint: firstExtension.checkpoint,
    priorSnapshot: firstSnapshot
  });
  const secondProposal = library.reconcileFixedPoint({
    previous: firstState,
    extension: secondExtension,
    observedAtNs: 3_000n
  });
  const fixed = library.commitReconciliation({
    proposal: secondProposal,
    committedAtNs: 3_001n
  });
  assert.equal(fixed.phase, "fixed-point");
  assert.throws(
    () => library.reconcileFixedPoint({
      previous: firstState,
      extension: secondExtension,
      observedAtNs: 3_002n
    }),
    /consumed|stale|state|successor/i
  );
});

test("Task 3B2 rejects stale snapshot replay and cross-journal identity splicing", async (t) => {
  const library = await import(libraryUrl);
  await t.test("stale branded snapshot", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-stale-snapshot");
    const scratch = task3b2Scratch(subtest, "stale-snapshot");
    fs.writeFileSync(path.join(root, "source.txt"), "baseline\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot: baselineSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    }), /capture|fresh|provenance|replay|snapshot|stale/i);
  });

  await t.test("distinct snapshot captured before the baseline ACK", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-precaptured-snapshot");
    const scratch = task3b2Scratch(subtest, "precaptured-snapshot");
    fs.writeFileSync(path.join(root, "source.txt"), "baseline\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const staleCandidateSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot: staleCandidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension,
      observedAtNs: 2_000n
    }), /capture|fresh|order|provenance|replay|snapshot|stale/i);
  });

  await t.test("ACK read before candidate capture remains stale after delayed normalization", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-held-ack");
    const scratch = task3b2Scratch(subtest, "held-ack");
    fs.writeFileSync(path.join(root, "source.txt"), "baseline\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const acknowledgement = task3b2ReadAcknowledgement(library, scratch, {
      root, sequence: 2n, type: 2
    });
    const candidateSnapshot = task3b2Capture(library, root);
    const endpoint = library.normalizeTypedFseventsAckCheckpoint({
      acknowledgement,
      eventRoots: [root]
    });
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    }), /capture|fresh|order|provenance|replay|snapshot|stale/i);
  });

  await t.test("replacement journal identity", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-journal-splice");
    const scratch = task3b2Scratch(subtest, "journal-splice");
    fs.writeFileSync(path.join(root, "source.txt"), "baseline\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const candidateSnapshot = task3b2Capture(library, root);
    fs.unlinkSync(path.join(scratch, "journal.bin"));
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension,
      observedAtNs: 2_000n
    }), /journal|device|inode|identity|session|splice/i);
  });
});

test("Task 3B2 correlates changed paths and freezes the bounded metadata policy", async (t) => {
  const library = await import(libraryUrl);

  await t.test("source event at A cannot explain a source change at B", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-source-correlation");
    const scratch = task3b2Scratch(subtest, "source-correlation");
    const sourceA = path.join(root, "a.txt");
    const sourceB = path.join(root, "b.txt");
    fs.writeFileSync(sourceA, "A\n");
    fs.writeFileSync(sourceB, "B\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    fs.writeFileSync(sourceB, "B changed\n");
    const candidateSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n, eventId: 41n, flags: 0x11400, path: sourceA
    });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 41n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    }), /source.*unmatched|unmatched.*source|path.*delta/i);
  });

  await t.test("descendant event cannot explain an ancestor directory chmod", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-directory-semantics");
    const scratch = task3b2Scratch(subtest, "directory-semantics");
    const directory = path.join(root, "directory");
    const child = path.join(directory, "child.txt");
    fs.mkdirSync(directory, { mode: 0o755 });
    fs.writeFileSync(child, "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    fs.chmodSync(directory, 0o700);
    const candidateSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n, eventId: 46n, flags: 0x11400, path: child
    });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 46n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    }), /source.*unmatched|metadata.*unmatched|path.*delta/i);
  });

  await t.test("metadata event at approved A cannot explain approved B", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-metadata-correlation");
    const scratch = task3b2Scratch(subtest, "metadata-correlation");
    const metadataA = path.join(root, library.TRANSACTION_METADATA_PATHS[0]);
    const metadataB = path.join(root, library.TRANSACTION_METADATA_PATHS[1]);
    fs.mkdirSync(path.dirname(metadataA), { recursive: true });
    fs.writeFileSync(metadataA, "A\n");
    fs.writeFileSync(metadataB, "B\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    fs.writeFileSync(metadataB, "B changed\n");
    const candidateSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n, eventId: 51n, flags: 0x11400, path: metadataA
    });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 51n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      exactMetadataPaths: [metadataA, metadataB],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    }), /metadata.*unmatched|unmatched.*metadata|path.*delta/i);
  });

  await t.test("approved metadata replace explains only its parent namespace timestamps", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-metadata-parent");
    const scratch = task3b2Scratch(subtest, "metadata-parent");
    const metadataPath = path.join(root, library.TRANSACTION_METADATA_PATHS[0]);
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    fs.writeFileSync(metadataPath, "before\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const replacement = path.join(path.dirname(metadataPath), `.replace-${crypto.randomUUID()}`);
    fs.writeFileSync(replacement, "after\n");
    fs.renameSync(replacement, metadataPath);
    const candidateSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n, eventId: 56n, flags: 0x11400, path: metadataPath
    });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 56n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      exactMetadataPaths: [metadataPath],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    assert.equal(extension.snapshotRelation, "metadata-only");
    assert.equal(extension.classification.transactionMetadataEventCount, 1n);
    assert.equal(extension.classification.sourceEventCount, 0n);
  });

  await t.test("metadata policy fingerprint cannot drift and input counts are capped", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-metadata-policy");
    const scratch = task3b2Scratch(subtest, "metadata-policy");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const approvedMetadataPath = path.join(root, library.TRANSACTION_METADATA_PATHS[0]);
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const firstSnapshot = task3b2Capture(library, root);
    const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const firstExtension = task3b2ReadExtension(library, {
      candidateSnapshot: firstSnapshot,
      endpoint: firstEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    const firstProposal = library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension: firstExtension,
      observedAtNs: 2_000n
    });
    const firstState = library.commitReconciliation({
      proposal: firstProposal,
      committedAtNs: 2_001n
    });
    const secondSnapshot = task3b2Capture(library, root);
    const secondEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 3n, type: 2
    }).endpoint;
    const driftExtension = task3b2ReadExtension(library, {
      candidateSnapshot: secondSnapshot,
      endpoint: secondEndpoint,
      eventRoots: [root],
      exactMetadataPaths: [approvedMetadataPath],
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: firstState,
      extension: driftExtension,
      observedAtNs: 3_000n
    }), /metadata.*policy|policy.*changed|fingerprint|pending evidence/i);

    const cappedSnapshot = task3b2Capture(library, root);
    const cappedEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 4n, type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot: cappedSnapshot,
      endpoint: cappedEndpoint,
      eventRoots: [root],
      exactMetadataPaths: Array(8).fill(approvedMetadataPath),
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    }), /count cap|exceeds|metadata policy/i);
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot: cappedSnapshot,
      endpoint: cappedEndpoint,
      eventRoots: [root],
      exactMetadataRoots: [path.join(root, "one"), path.join(root, "two")],
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    }), /count cap|exceeds|metadata policy/i);
  });
});

test("Task 3B2 carries post-snapshot pre-ACK evidence for exactly one successor", async (t) => {
  const library = await import(libraryUrl);
  const scenarios = [
    {
      label: "source",
      eventId: 61n,
      flags: 0x11400,
      relation: "source-material",
      expectedEpochs: { sourceEpoch: 1n, metadataEpoch: 0n, xattrEpoch: 0n },
      prepare(root) {
        const target = path.join(root, "source.txt");
        fs.writeFileSync(target, "before\n");
        return { target, exactMetadataPaths: [], mutate() { fs.writeFileSync(target, "after\n"); } };
      }
    },
    {
      label: "metadata",
      eventId: 62n,
      flags: 0x11400,
      relation: "metadata-only",
      expectedEpochs: { sourceEpoch: 0n, metadataEpoch: 1n, xattrEpoch: 0n },
      prepare(root) {
        const target = path.join(root, library.TRANSACTION_METADATA_PATHS[0]);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "before\n");
        return {
          target,
          exactMetadataPaths: [target],
          mutate() { fs.writeFileSync(target, "after\n"); }
        };
      }
    },
    {
      label: "xattr",
      eventId: 63n,
      flags: 0x18000,
      relation: "xattr-ctime-only",
      expectedEpochs: { sourceEpoch: 0n, metadataEpoch: 0n, xattrEpoch: 1n },
      prepare(root) {
        const target = path.join(root, "xattr.txt");
        fs.writeFileSync(target, "stable\n");
        return {
          target,
          exactMetadataPaths: [],
          mutate() { task3b2SetXattr(target, "boundary"); }
        };
      }
    }
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.label, (subtest) => {
      const { root } = makeStableProofTestRoot(subtest, `task3b2-boundary-${scenario.label}`);
      const scratch = task3b2Scratch(subtest, `boundary-${scenario.label}`);
      const fixture = scenario.prepare(root);
      const baselineSnapshot = task3b2Capture(library, root);
      const baseline = task3b2NormalizeEndpoint(library, scratch, {
        root, sequence: 1n, type: 2
      }).endpoint;

      const firstSnapshot = task3b2Capture(library, root);
      fixture.mutate();
      const journal = typedFseventsJournalRecord({
        sequence: 1n,
        eventId: scenario.eventId,
        flags: scenario.flags,
        path: fixture.target
      });
      const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
        entryCount: 1n,
        journal,
        lastEventId: scenario.eventId,
        root,
        sequence: 2n,
        type: 2
      }).endpoint;
      const firstExtension = task3b2ReadExtension(library, {
        candidateSnapshot: firstSnapshot,
        endpoint: firstEndpoint,
        eventRoots: [root],
        exactMetadataPaths: fixture.exactMetadataPaths,
        priorCheckpoint: baseline.checkpoint,
        priorSnapshot: baselineSnapshot
      });
      assert.equal(firstExtension.snapshotSha256, baselineSnapshot.sha256);
      assert.equal(firstExtension.snapshotRelation, scenario.relation);
      const firstProposal = library.reconcileFixedPoint({
        previous: null,
        baseline: {
          ackEndpoint: baseline,
          snapshot: baselineSnapshot,
          sourceEpoch: 0n,
          metadataEpoch: 0n,
          xattrEpoch: 0n,
          startedAtNs: 1_000n
        },
        extension: firstExtension,
        observedAtNs: 2_000n
      });
      let state = library.commitReconciliation({
        proposal: firstProposal,
        committedAtNs: 2_001n
      });
      assert.equal(state.phase, "reconciling");
      assert.equal(
        state.pendingSourcePathCount
          + state.pendingMetadataPathCount
          + state.pendingXattrPathCount,
        1n
      );

      const catchupSnapshot = task3b2Capture(library, root);
      const catchupEndpoint = task3b2NormalizeEndpoint(library, scratch, {
        entryCount: 1n,
        journal,
        lastEventId: scenario.eventId,
        root,
        sequence: 3n,
        type: 2
      }).endpoint;
      const catchupExtension = task3b2ReadExtension(library, {
        candidateSnapshot: catchupSnapshot,
        endpoint: catchupEndpoint,
        eventRoots: [root],
        exactMetadataPaths: fixture.exactMetadataPaths,
        priorCheckpoint: firstExtension.checkpoint,
        priorSnapshot: firstSnapshot
      });
      assert.equal(catchupExtension.deltaEntryCount, 0n);
      assert.equal(catchupExtension.snapshotRelation, scenario.relation);
      const catchupProposal = library.reconcileFixedPoint({
        previous: state,
        extension: catchupExtension,
        observedAtNs: 3_000n
      });
      state = library.commitReconciliation({
        proposal: catchupProposal,
        committedAtNs: 3_001n
      });
      assert.equal(state.phase, "reconciling");
      assert.equal(state.pendingSourcePathCount, 0n);
      assert.equal(state.pendingMetadataPathCount, 0n);
      assert.equal(state.pendingXattrPathCount, 0n);
      for (const [key, value] of Object.entries(scenario.expectedEpochs)) {
        assert.equal(state[key], value);
      }

      let priorSnapshot = catchupSnapshot;
      let priorCheckpoint = catchupExtension.checkpoint;
      for (const sequence of [4n, 5n]) {
        const candidateSnapshot = task3b2Capture(library, root);
        const endpoint = task3b2NormalizeEndpoint(library, scratch, {
          entryCount: 1n,
          journal,
          lastEventId: scenario.eventId,
          root,
          sequence,
          type: 2
        }).endpoint;
        const extension = task3b2ReadExtension(library, {
          candidateSnapshot,
          endpoint,
          eventRoots: [root],
          exactMetadataPaths: fixture.exactMetadataPaths,
          priorCheckpoint,
          priorSnapshot
        });
        assert.equal(extension.snapshotRelation, "exact");
        const proposal = library.reconcileFixedPoint({
          previous: state,
          extension,
          observedAtNs: 1_000n + sequence * 1_000n
        });
        state = library.commitReconciliation({
          proposal,
          committedAtNs: 1_001n + sequence * 1_000n
        });
        priorSnapshot = candidateSnapshot;
        priorCheckpoint = extension.checkpoint;
      }
      assert.equal(state.phase, "fixed-point");
      assert.equal(state.roundCount, 4n);
      assert.equal(state.consecutiveExactRounds, 2n);
    });
  }

  await t.test("an unmatched pending event clears before either exact round counts", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-boundary-no-delta");
    const scratch = task3b2Scratch(subtest, "boundary-no-delta");
    const target = path.join(root, "source.txt");
    fs.writeFileSync(target, "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const journal = typedFseventsJournalRecord({
      sequence: 1n, eventId: 64n, flags: 0x11400, path: target
    });
    let priorSnapshot = task3b2Capture(library, root);
    const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 64n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    let extension = task3b2ReadExtension(library, {
      candidateSnapshot: priorSnapshot,
      endpoint: firstEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    let proposal = library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension,
      observedAtNs: 2_000n
    });
    let state = library.commitReconciliation({ proposal, committedAtNs: 2_001n });
    let priorCheckpoint = extension.checkpoint;
    assert.equal(state.pendingSourcePathCount, 1n);

    for (const sequence of [3n, 4n, 5n]) {
      const candidateSnapshot = task3b2Capture(library, root);
      const endpoint = task3b2NormalizeEndpoint(library, scratch, {
        entryCount: 1n,
        journal,
        lastEventId: 64n,
        root,
        sequence,
        type: 2
      }).endpoint;
      extension = task3b2ReadExtension(library, {
        candidateSnapshot,
        endpoint,
        eventRoots: [root],
        priorCheckpoint,
        priorSnapshot
      });
      proposal = library.reconcileFixedPoint({
        previous: state,
        extension,
        observedAtNs: 1_000n + sequence * 1_000n
      });
      state = library.commitReconciliation({
        proposal,
        committedAtNs: 1_001n + sequence * 1_000n
      });
      if (sequence === 3n) {
        assert.equal(state.pendingSourcePathCount, 0n);
        assert.equal(state.consecutiveExactRounds, 0n);
      }
      priorSnapshot = candidateSnapshot;
      priorCheckpoint = extension.checkpoint;
    }
    assert.equal(state.phase, "fixed-point");
    assert.equal(state.roundCount, 4n);
    assert.equal(state.consecutiveExactRounds, 2n);
  });
});

test("Task 3B2 terminal seal accepts only exact same-path xattr ctime drift", async (t) => {
  const library = await import(libraryUrl);
  const fixed = task3b2ReachFixedPoint(library, t, "terminal-xattr");
  const beforeProof = fixed.snapshot.lookup(fixed.target);
  task3b2SetXattr(fixed.target, "accepted");
  const terminalSnapshot = task3b2Capture(library, fixed.root);
  const afterProof = terminalSnapshot.lookup(fixed.target);
  for (const field of ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "sha256"]) {
    assert.equal(afterProof[field], beforeProof[field], `${field} must remain semantic-equal`);
  }
  assert.notEqual(afterProof.ctimeNs, beforeProof.ctimeNs, "the xattr mutation must advance ctime");
  const journal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 101n,
    flags: 0x18000,
    path: fixed.target
  });
  const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
    entryCount: 1n,
    journal,
    lastEventId: 101n,
    root: fixed.root,
    // A pre-STOP FLUSH may consume sequence 4; STOP must be strictly newer,
    // but it is intentionally not required to be the exact +1 successor.
    sequence: 5n,
    type: 3
  }).endpoint;
  const terminalExtension = task3b2ReadExtension(library, {
    candidateSnapshot: terminalSnapshot,
    endpoint,
    eventRoots: [fixed.root],
    priorCheckpoint: fixed.checkpoint,
    priorSnapshot: fixed.snapshot
  });
  assert.equal(terminalExtension.snapshotRelation, "xattr-ctime-only");
  assert.equal(terminalExtension.classification.xattrOnlyEventCount, 1n);
  assert.equal(terminalExtension.classification.materialEventCount, 0n);
  const terminalAttestation = task3b2TerminalAttestation(
    terminalExtension,
    fixed.reconciliation
  );
  const sealed = library.sealTerminal({
    reconciliation: fixed.reconciliation,
    terminalExtension,
    terminalAttestation,
    sealedAtNs: 20_000n
  });
  assert.equal(sealed.phase, "sealed");
  assert.ok(Object.isFrozen(sealed));
  assert.throws(() => library.sealTerminal({
    reconciliation: fixed.reconciliation,
    terminalExtension,
    terminalAttestation,
    sealedAtNs: 20_001n
  }), /already|consumed|one-shot|sealed|stale/i);
});

test("Task 3B2 terminal seal preserves cumulative source and xattr evidence", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b2-cumulative-terminal");
  const scratch = task3b2Scratch(t, "cumulative-terminal");
  const target = path.join(root, "source.txt");
  fs.writeFileSync(target, "before\n");
  const baselineSnapshot = task3b2Capture(library, root);
  const baseline = task3b2NormalizeEndpoint(library, scratch, {
    root, sequence: 1n, type: 2
  }).endpoint;

  fs.writeFileSync(target, "after source event\n");
  const sourceSnapshot = task3b2Capture(library, root);
  const sourceRecord = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 100n,
    flags: 0x11400,
    path: target
  });
  const sourceEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    entryCount: 1n,
    journal: sourceRecord,
    lastEventId: 100n,
    root,
    sequence: 2n,
    type: 2
  }).endpoint;
  const sourceExtension = task3b2ReadExtension(library, {
    candidateSnapshot: sourceSnapshot,
    endpoint: sourceEndpoint,
    eventRoots: [root],
    priorCheckpoint: baseline.checkpoint,
    priorSnapshot: baselineSnapshot
  });
  const sourceProposal = library.reconcileFixedPoint({
    previous: null,
    baseline: {
      ackEndpoint: baseline,
      snapshot: baselineSnapshot,
      sourceEpoch: 0n,
      metadataEpoch: 0n,
      xattrEpoch: 0n,
      startedAtNs: 1_000n
    },
    extension: sourceExtension,
    observedAtNs: 2_000n
  });
  let state = library.commitReconciliation({
    proposal: sourceProposal,
    committedAtNs: 2_001n
  });
  assert.equal(state.sourceEpoch, 1n);
  assert.equal(state.counters.sourceEventCount, 1n);

  let priorSnapshot = sourceSnapshot;
  let priorCheckpoint = sourceExtension.checkpoint;
  for (const sequence of [3n, 4n, 5n]) {
    const candidateSnapshot = task3b2Capture(library, root);
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal: sourceRecord,
      lastEventId: 100n,
      root,
      sequence,
      type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint,
      priorSnapshot
    });
    const proposal = library.reconcileFixedPoint({
      previous: state,
      extension,
      observedAtNs: 1_000n + sequence * 1_000n
    });
    state = library.commitReconciliation({
      proposal,
      committedAtNs: 1_001n + sequence * 1_000n
    });
    priorSnapshot = candidateSnapshot;
    priorCheckpoint = extension.checkpoint;
  }
  assert.equal(state.phase, "fixed-point");
  assert.equal(state.roundCount, 4n);
  assert.equal(state.counters.journalEntryCount, 1n);
  assert.equal(state.journalFirstEventId, 100n);
  assert.equal(state.journalLastEventId, 100n);
  assert.equal("snapshot" in state, false);
  assert.match(state.snapshotSha256, /^[0-9a-f]{64}$/u);

  task3b2SetXattr(target, "cumulative");
  const terminalSnapshot = task3b2Capture(library, root);
  const terminalJournal = Buffer.concat([sourceRecord, typedFseventsJournalRecord({
    sequence: 2n,
    eventId: 101n,
    flags: 0x18000,
    path: target
  })]);
  const terminalEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    entryCount: 2n,
    journal: terminalJournal,
    lastEventId: 101n,
    root,
    // Sequence 5 may be the helper's pre-STOP FLUSH acknowledgement.
    sequence: 6n,
    type: 3
  }).endpoint;
  const terminalExtension = task3b2ReadExtension(library, {
    candidateSnapshot: terminalSnapshot,
    endpoint: terminalEndpoint,
    eventRoots: [root],
    priorCheckpoint,
    priorSnapshot
  });
  const terminalAttestation = task3b2TerminalAttestation(terminalExtension, state);
  const sealed = library.sealTerminal({
    reconciliation: state,
    terminalExtension,
    terminalAttestation,
    sealedAtNs: 7_000n
  });
  assert.equal(sealed.phase, "sealed");
  assert.equal(sealed.schemaVersion, 2);
  assert.equal(sealed.endpointSequence, 6n);
  assert.equal(sealed.roundCount, 4n);
  assert.equal(sealed.sourceEpoch, 1n);
  assert.equal(sealed.metadataEpoch, 0n);
  assert.equal(sealed.xattrEpoch, 1n);
  assert.equal(sealed.counters.journalEntryCount, 2n);
  assert.equal(sealed.counters.materialEventCount, 1n);
  assert.equal(sealed.counters.sourceEventCount, 1n);
  assert.equal(sealed.counters.xattrOnlyEventCount, 1n);
  assert.equal(sealed.journalFirstEventId, 100n);
  assert.equal(sealed.journalLastEventId, 101n);
  assert.equal(sealed.journalSessionFingerprint, state.journalSessionFingerprint);
  assert.equal(sealed.metadataPolicyFingerprint, state.metadataPolicyFingerprint);
  assert.equal(sealed.snapshotSha256, terminalSnapshot.sha256);
  assert.equal("snapshot" in sealed, false);
});

test("Task 3B2 terminal attestation binds schema session policy snapshot and event bounds", async (t) => {
  const library = await import(libraryUrl);

  await t.test("tampered durable fields fail closed before a valid seal", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "terminal-attestation");
    const terminalSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root,
      sequence: 5n,
      type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    const attestation = task3b2TerminalAttestation(
      terminalExtension,
      fixed.reconciliation
    );
    const mutations = [
      (value) => ({ ...value, schemaVersion: 1 }),
      (value) => ({ ...value, journalSessionFingerprint: "0".repeat(64) }),
      (value) => ({ ...value, metadataPolicyFingerprint: "1".repeat(64) }),
      (value) => ({ ...value, pendingEvidenceFingerprint: "4".repeat(64) }),
      (value) => ({ ...value, pendingMetadataPathCount: 1n }),
      (value) => ({ ...value, pendingSourcePathCount: 1n }),
      (value) => ({ ...value, pendingXattrPathCount: 1n }),
      (value) => ({ ...value, snapshotSha256: "2".repeat(64) }),
      (value) => ({ ...value, roundCount: value.roundCount + 1n }),
      (value) => ({ ...value, journalFirstEventId: 0n }),
      (value) => ({
        ...value,
        checkpoint: { ...value.checkpoint, sha256: "3".repeat(64) }
      })
    ];
    for (const mutate of mutations) {
      assert.throws(() => library.sealTerminal({
        reconciliation: fixed.reconciliation,
        terminalExtension,
        terminalAttestation: mutate(attestation),
        sealedAtNs: 20_000n
      }), /attestation|fingerprint|schema|sealed state|match/i);
    }
    const sealed = library.sealTerminal({
      reconciliation: fixed.reconciliation,
      terminalExtension,
      terminalAttestation: attestation,
      sealedAtNs: 20_000n
    });
    assert.equal(sealed.phase, "sealed");
  });

  await t.test("STOP cannot switch to another approved metadata policy", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "terminal-policy-switch");
    const terminalSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root,
      sequence: 5n,
      type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      exactMetadataPaths: [path.join(fixed.root, library.TRANSACTION_METADATA_PATHS[0])],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.throws(() => library.sealTerminal({
      reconciliation: fixed.reconciliation,
      terminalExtension,
      terminalAttestation: task3b2TerminalAttestation(
        terminalExtension,
        fixed.reconciliation
      ),
      sealedAtNs: 20_000n
    }), /metadata.*policy|policy.*changed|fingerprint|pending evidence/i);
  });

  await t.test("STOP rejects xattr evidence observed after its candidate snapshot", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "terminal-post-snapshot-xattr");
    const terminalSnapshot = task3b2Capture(library, fixed.root);
    task3b2SetXattr(fixed.target, "after-terminal-snapshot");
    const journal = typedFseventsJournalRecord({
      sequence: 1n,
      eventId: 301n,
      flags: 0x18000,
      path: fixed.target
    });
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 301n,
      root: fixed.root,
      sequence: 5n,
      type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.equal(terminalExtension.snapshotRelation, "xattr-ctime-only");
    assert.equal(terminalExtension.pendingXattrPathCount, 1n);
    assert.throws(() => library.sealTerminal({
      reconciliation: fixed.reconciliation,
      terminalExtension,
      terminalAttestation: task3b2TerminalAttestation(
        terminalExtension,
        fixed.reconciliation
      ),
      sealedAtNs: 20_000n
    }), /pending|semantic|source metadata|terminal seal|xattr/i);
  });

  await t.test("STOP rejects same-path xattr events straddling its candidate snapshot", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "terminal-straddled-xattr");
    task3b2SetXattr(fixed.target, "before-terminal-snapshot");
    const terminalSnapshot = task3b2Capture(library, fixed.root);
    task3b2SetXattr(fixed.target, "after-terminal-snapshot");
    const journal = Buffer.concat([
      typedFseventsJournalRecord({
        sequence: 1n,
        eventId: 302n,
        flags: 0x18000,
        path: fixed.target
      }),
      typedFseventsJournalRecord({
        sequence: 2n,
        eventId: 303n,
        flags: 0x18000,
        path: fixed.target
      })
    ]);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      entryCount: 2n,
      journal,
      lastEventId: 303n,
      root: fixed.root,
      sequence: 5n,
      type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.equal(terminalExtension.snapshotRelation, "xattr-ctime-only");
    assert.equal(terminalExtension.classification.xattrOnlyEventCount, 2n);
    assert.equal(terminalExtension.pendingXattrPathCount, 1n);
    assert.throws(() => library.sealTerminal({
      reconciliation: fixed.reconciliation,
      terminalExtension,
      terminalAttestation: task3b2TerminalAttestation(
        terminalExtension,
        fixed.reconciliation
      ),
      sealedAtNs: 20_000n
    }), /pending|semantic|terminal seal|xattr/i);
  });
});

test("Task 3B2 terminal seal rejects source metadata namespace semantic and unexplained ctime deltas", async (t) => {
  const library = await import(libraryUrl);
  const scenarios = [
    {
      label: "source",
      mutate(fixed) { fs.writeFileSync(fixed.target, "source changed\n"); },
      record(fixed) {
        return typedFseventsJournalRecord({
          sequence: 1n, eventId: 201n, flags: 0x11400, path: fixed.target
        });
      }
    },
    {
      label: "metadata",
      exactMetadataPaths(fixed) { return [fixed.target]; },
      record(fixed) {
        return typedFseventsJournalRecord({
          sequence: 1n, eventId: 202n, flags: 0x11400, path: fixed.target
        });
      }
    },
    {
      label: "namespace",
      mutate(fixed) { fs.writeFileSync(path.join(fixed.root, "added.txt"), "added\n"); }
    },
    {
      label: "semantic",
      mutate(fixed) { fs.writeFileSync(fixed.target, "semantic changed\n"); },
      record(fixed) {
        return typedFseventsJournalRecord({
          sequence: 1n, eventId: 203n, flags: 0x18000, path: fixed.target
        });
      }
    },
    {
      label: "unexplained-ctime",
      mutate(fixed) { task3b2SetXattr(fixed.target, "unexplained"); }
    }
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.label, (subtest) => {
      const fixed = task3b2ReachFixedPoint(library, subtest, `reject-${scenario.label}`);
      scenario.mutate?.(fixed);
      const candidateSnapshot = task3b2Capture(library, fixed.root);
      const journal = scenario.record?.(fixed) ?? Buffer.alloc(0);
      const hasRecord = journal.length > 0;
      assert.throws(() => {
        const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
          entryCount: hasRecord ? 1n : 0n,
          journal,
          lastEventId: hasRecord
            ? (scenario.label === "metadata" ? 202n : scenario.label === "semantic" ? 203n : 201n)
            : 0n,
          root: fixed.root,
          sequence: 4n,
          type: 3
        }).endpoint;
        const terminalExtension = task3b2ReadExtension(library, {
          candidateSnapshot,
          endpoint,
          eventRoots: [fixed.root],
          exactMetadataPaths: scenario.exactMetadataPaths?.(fixed) ?? [],
          priorCheckpoint: fixed.checkpoint,
          priorSnapshot: fixed.snapshot
        });
        library.sealTerminal({
          reconciliation: fixed.reconciliation,
          terminalExtension,
          terminalAttestation: task3b2TerminalAttestation(
            terminalExtension,
            fixed.reconciliation
          ),
          sealedAtNs: 20_000n
        });
      }, /terminal|source|metadata|namespace|semantic|ctime|seal|snapshot|delta/i);
    });
  }
});

test("Task 3B2 FLUSH sequences require an overflow-checked exact successor", async (t) => {
  const library = await import(libraryUrl);
  const maxUint64 = (1n << 64n) - 1n;

  const buildFirstRound = (subtest, label, baselineSequence, endpointSequence) => {
    const { root } = makeStableProofTestRoot(subtest, `task3b2-${label}`);
    const scratch = task3b2Scratch(subtest, label);
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: baselineSequence, type: 2
    }).endpoint;
    const candidateSnapshot = task3b2Capture(library, root);
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: endpointSequence, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    return () => library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension,
      observedAtNs: 2_000n
    });
  };

  await t.test("a skipped FLUSH sequence fails closed", (subtest) => {
    const reconcile = buildFirstRound(subtest, "sequence-gap", 1n, 3n);
    assert.throws(reconcile, /sequence|successor|stale|order/i);
  });
  await t.test("the UInt64 maximum has no FLUSH successor", (subtest) => {
    const reconcile = buildFirstRound(subtest, "sequence-overflow", maxUint64, 1n);
    assert.throws(reconcile, /uint64|overflow|exceeds|sequence/i);
  });
  await t.test("maximum minus one may advance exactly to maximum", (subtest) => {
    const reconcile = buildFirstRound(
      subtest,
      "sequence-maximum",
      maxUint64 - 1n,
      maxUint64
    );
    const proposal = reconcile();
    const state = library.commitReconciliation({ proposal, committedAtNs: 2_001n });
    assert.equal(state.endpointSequence, maxUint64);
    assert.equal(state.phase, "reconciling");
  });
});

test("Task 3B2 enforces eight-round and five-minute fixed-point boundaries", async (t) => {
  const library = await import(libraryUrl);
  const runEightRounds = (subtest, label, mutateThroughRound, expectFixed) => {
    const { root } = makeStableProofTestRoot(subtest, `task3b2-${label}`);
    const scratch = task3b2Scratch(subtest, label);
    const target = path.join(root, "source.txt");
    fs.writeFileSync(target, "round 0\n");
    let priorSnapshot = task3b2Capture(library, root);
    const baselineSnapshot = priorSnapshot;
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root,
      sequence: 1n,
      type: 2
    }).endpoint;
    let priorCheckpoint = baseline.checkpoint;
    let previous = null;
    let journal = Buffer.alloc(0);
    const startedAtNs = 1_000n;
    for (let round = 1; round <= 8; round += 1) {
      if (round <= mutateThroughRound) {
        fs.writeFileSync(target, `round ${round}\n`);
        journal = Buffer.concat([journal, typedFseventsJournalRecord({
          sequence: BigInt(round),
          eventId: 300n + BigInt(round),
          flags: 0x11400,
          path: target
        })]);
      }
      const candidateSnapshot = task3b2Capture(library, root);
      const endpoint = task3b2NormalizeEndpoint(library, scratch, {
        entryCount: BigInt(Math.min(round, mutateThroughRound)),
        journal,
        lastEventId: journal.length === 0 ? 0n : 300n + BigInt(Math.min(round, mutateThroughRound)),
        root,
        sequence: BigInt(round + 1),
        type: 2
      }).endpoint;
      const extension = task3b2ReadExtension(library, {
        candidateSnapshot,
        endpoint,
        eventRoots: [root],
        priorCheckpoint,
        priorSnapshot
      });
      const observedAtNs = round === 8
        ? startedAtNs + 300_000_000_000n
        : startedAtNs + BigInt(round) * 1_000_000_000n;
      const advance = () => {
        const proposal = library.reconcileFixedPoint({
          previous,
          ...(previous === null ? {
            baseline: {
              ackEndpoint: baseline,
              snapshot: baselineSnapshot,
              sourceEpoch: 0n,
              metadataEpoch: 0n,
              xattrEpoch: 0n,
              startedAtNs
            }
          } : {}),
          extension,
          observedAtNs
        });
        return library.commitReconciliation({ proposal, committedAtNs: observedAtNs });
      };
      if (!expectFixed && round === 8) {
        assert.throws(advance, /round|eight|fixed.point|consecutive|limit/i);
        return;
      }
      previous = advance();
      assert.equal(previous.phase, round === 8 ? "fixed-point" : "reconciling");
      priorCheckpoint = extension.checkpoint;
      priorSnapshot = candidateSnapshot;
    }
    assert.equal(previous.phase, "fixed-point");
  };

  await t.test("round eight may be the second exact round at the exact deadline", (subtest) => {
    runEightRounds(subtest, "round-eight-success", 5, true);
  });
  await t.test("round eight cannot be only the first exact round", (subtest) => {
    runEightRounds(subtest, "round-eight-first-exact", 6, false);
  });
  await t.test("one nanosecond beyond five minutes fails closed", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b2-deadline-overrun");
    const scratch = task3b2Scratch(subtest, "deadline-overrun");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const candidateSnapshot = task3b2Capture(library, root);
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    const startedAtNs = 1_000n;
    assert.throws(() => library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs
      },
      extension,
      observedAtNs: startedAtNs + 300_000_000_001n
    }), /deadline|five.minute|time|300000000000/i);
  });
});

test("Task 3B3A fixed successor cycles reset local bounds and preserve cumulative state", async (t) => {
  const library = await import(libraryUrl);
  const fixed = task3b2ReachFixedPoint(library, t, "cycle-restart");
  const journal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 501n,
    flags: 0x11400,
    path: fixed.target
  });
  fs.writeFileSync(fixed.target, "cycle mutation\n");
  let candidateSnapshot = task3b2Capture(library, fixed.root);
  let endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
    entryCount: 1n,
    journal,
    lastEventId: 501n,
    root: fixed.root,
    sequence: 4n,
    type: 2
  }).endpoint;
  let extension = task3b2ReadExtension(library, {
    candidateSnapshot,
    endpoint,
    eventRoots: [fixed.root],
    priorCheckpoint: fixed.checkpoint,
    priorSnapshot: fixed.snapshot
  });
  let proposal = library.reconcileFixedPoint({
    previous: fixed.reconciliation,
    cycleStartedAtNs: 20_000n,
    extension,
    observedAtNs: 20_001n
  });
  let state = library.commitReconciliation({ proposal, committedAtNs: 20_002n });
  assert.equal(state.phase, "reconciling");
  assert.equal(state.roundCount, 1n);
  assert.equal(state.consecutiveExactRounds, 0n);
  assert.equal(state.startedAtNs, 20_000n);
  assert.equal(state.sourceEpoch, fixed.reconciliation.sourceEpoch + 1n);
  assert.equal(state.counters.sourceEventCount, 1n);
  assert.equal(state.journalFirstEventId, 501n);
  assert.equal(state.journalLastEventId, 501n);

  let priorSnapshot = candidateSnapshot;
  let priorCheckpoint = extension.checkpoint;
  for (const sequence of [5n, 6n, 7n]) {
    candidateSnapshot = task3b2Capture(library, fixed.root);
    endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 501n,
      root: fixed.root,
      sequence,
      type: 2
    }).endpoint;
    extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint,
      priorSnapshot
    });
    proposal = library.reconcileFixedPoint({
      previous: state,
      extension,
      observedAtNs: 20_000n + (sequence * 100n)
    });
    state = library.commitReconciliation({
      proposal,
      committedAtNs: 20_001n + (sequence * 100n)
    });
    priorSnapshot = candidateSnapshot;
    priorCheckpoint = extension.checkpoint;
  }
  assert.equal(state.phase, "fixed-point");
  assert.equal(state.roundCount, 4n);
  assert.equal(state.consecutiveExactRounds, 2n);

  const cumulative = {
    checkpoint: state.checkpoint,
    counters: state.counters,
    journalFirstEventId: state.journalFirstEventId,
    journalLastEventId: state.journalLastEventId,
    journalSessionFingerprint: state.journalSessionFingerprint,
    metadataEpoch: state.metadataEpoch,
    metadataPolicyFingerprint: state.metadataPolicyFingerprint,
    snapshotSha256: state.snapshotSha256,
    sourceEpoch: state.sourceEpoch,
    xattrEpoch: state.xattrEpoch
  };
  candidateSnapshot = task3b2Capture(library, fixed.root);
  endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
    entryCount: 1n,
    journal,
    lastEventId: 501n,
    root: fixed.root,
    sequence: 8n,
    type: 2
  }).endpoint;
  extension = task3b2ReadExtension(library, {
    candidateSnapshot,
    endpoint,
    eventRoots: [fixed.root],
    priorCheckpoint,
    priorSnapshot
  });
  proposal = library.reconcileFixedPoint({
    previous: state,
    cycleStartedAtNs: 30_000n,
    extension,
    observedAtNs: 30_001n
  });
  assert.equal(proposal.roundCount, 1n);
  assert.equal(proposal.consecutiveExactRounds, 1n);
  assert.equal(proposal.startedAtNs, 30_000n);
  assert.equal(proposal.endpointSequence, 8n);
  assert.deepEqual(proposal.checkpoint, cumulative.checkpoint);
  assert.deepEqual(proposal.counters, cumulative.counters);
  for (const key of [
    "journalFirstEventId",
    "journalLastEventId",
    "journalSessionFingerprint",
    "metadataEpoch",
    "metadataPolicyFingerprint",
    "snapshotSha256",
    "sourceEpoch",
    "xattrEpoch"
  ]) assert.equal(proposal[key], cumulative[key], key);
});

test("Task 3B3A cycle restart enforces exact sequence and phase-bound start input", async (t) => {
  const library = await import(libraryUrl);
  const fixedSuccessor = (subtest, label) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, label);
    const candidateSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 4n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    return { extension, fixed };
  };
  await t.test("a fixed successor requires cycleStartedAtNs", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "fixed-needs-cycle-start");
    const candidateSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 4n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      extension,
      observedAtNs: 20_001n
    }), /cycle|start|fixed|successor/i);
  });
  await t.test("a reconciling successor rejects cycleStartedAtNs", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3a-mid-cycle-start");
    const scratch = task3b2Scratch(subtest, "mid-cycle-start");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const firstSnapshot = task3b2Capture(library, root);
    const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const firstExtension = task3b2ReadExtension(library, {
      candidateSnapshot: firstSnapshot,
      endpoint: firstEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    const firstProposal = library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension: firstExtension,
      observedAtNs: 2_000n
    });
    const firstState = library.commitReconciliation({
      proposal: firstProposal,
      committedAtNs: 2_001n
    });
    const secondSnapshot = task3b2Capture(library, root);
    const secondEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 3n, type: 2
    }).endpoint;
    const secondExtension = task3b2ReadExtension(library, {
      candidateSnapshot: secondSnapshot,
      endpoint: secondEndpoint,
      eventRoots: [root],
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: firstState,
      cycleStartedAtNs: 3_000n,
      extension: secondExtension,
      observedAtNs: 3_001n
    }), /cycle|start|mid|reconcil/i);
  });
  await t.test("a fixed successor still requires the exact next FLUSH sequence", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "fixed-sequence-gap");
    const candidateSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 5n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs: 20_000n,
      extension,
      observedAtNs: 20_001n
    }), /sequence|successor|stale|order/i);
  });
  await t.test("a restarted cycle cannot predate the prior fixed commit", (subtest) => {
    const { extension, fixed } = fixedSuccessor(subtest, "fixed-cycle-regression");
    assert.throws(() => library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs: fixed.reconciliation.committedAtNs - 1n,
      extension,
      observedAtNs: fixed.reconciliation.committedAtNs
    }), /cycle|start|regress|commit/i);
  });
  await t.test("a restarted cycle start rejects UInt64 overflow", (subtest) => {
    const { extension, fixed } = fixedSuccessor(subtest, "fixed-cycle-overflow");
    assert.throws(() => library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs: 1n << 64n,
      extension,
      observedAtNs: 1n << 64n
    }), /uint64|overflow|range|cycle|start/i);
  });
  await t.test("a restarted cycle accepts the inclusive five-minute boundary", (subtest) => {
    const { extension, fixed } = fixedSuccessor(subtest, "fixed-cycle-deadline-exact");
    const cycleStartedAtNs = fixed.reconciliation.committedAtNs;
    const observedAtNs = cycleStartedAtNs + 300_000_000_000n;
    const proposal = library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs,
      extension,
      observedAtNs
    });
    assert.equal(proposal.startedAtNs, cycleStartedAtNs);
    assert.equal(proposal.observedAtNs, observedAtNs);
  });
  await t.test("a restarted cycle rejects one nanosecond after five minutes", (subtest) => {
    const { extension, fixed } = fixedSuccessor(subtest, "fixed-cycle-deadline-overrun");
    const cycleStartedAtNs = fixed.reconciliation.committedAtNs;
    assert.throws(() => library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs,
      extension,
      observedAtNs: cycleStartedAtNs + 300_000_000_001n
    }), /deadline|five.minute|time|300000000000/i);
  });
});

test("Task 3B3A metadata policy changes only at an empty fixed boundary", async (t) => {
  const library = await import(libraryUrl);
  await t.test("an empty fixed boundary may adopt another exact approved policy", (subtest) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, "fixed-policy-transition");
    const exactMetadataPaths = [path.join(
      fixed.root,
      library.TRANSACTION_METADATA_PATHS[0]
    )];
    const candidateSnapshot = task3b2Capture(library, fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 4n, type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      exactMetadataPaths,
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    assert.notEqual(
      extension.metadataPolicyFingerprint,
      fixed.reconciliation.metadataPolicyFingerprint
    );
    const proposal = library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs: 20_000n,
      extension,
      observedAtNs: 20_001n
    });
    const state = library.commitReconciliation({ proposal, committedAtNs: 20_002n });
    assert.equal(state.metadataPolicyFingerprint, extension.metadataPolicyFingerprint);
    assert.equal(state.roundCount, 1n);
  });
  await t.test("an empty reconciling boundary cannot change policy", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3a-mid-policy-transition");
    const scratch = task3b2Scratch(subtest, "mid-policy-transition");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const firstSnapshot = task3b2Capture(library, root);
    const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const firstExtension = task3b2ReadExtension(library, {
      candidateSnapshot: firstSnapshot,
      endpoint: firstEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    const firstProposal = library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension: firstExtension,
      observedAtNs: 2_000n
    });
    const state = library.commitReconciliation({
      proposal: firstProposal,
      committedAtNs: 2_001n
    });
    const secondSnapshot = task3b2Capture(library, root);
    const secondEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 3n, type: 2
    }).endpoint;
    const secondExtension = task3b2ReadExtension(library, {
      candidateSnapshot: secondSnapshot,
      endpoint: secondEndpoint,
      eventRoots: [root],
      exactMetadataPaths: [path.join(root, library.TRANSACTION_METADATA_PATHS[0])],
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    });
    assert.throws(() => library.reconcileFixedPoint({
      previous: state,
      extension: secondExtension,
      observedAtNs: 3_000n
    }), /metadata policy|policy.*changed/i);
  });
  await t.test("nonempty pending evidence cannot change policy", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3a-pending-policy-transition");
    const scratch = task3b2Scratch(subtest, "pending-policy-transition");
    const target = path.join(root, "source.txt");
    fs.writeFileSync(target, "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const firstSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n,
      eventId: 701n,
      flags: 0x11400,
      path: target
    });
    const firstEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 701n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    const firstExtension = task3b2ReadExtension(library, {
      candidateSnapshot: firstSnapshot,
      endpoint: firstEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot
    });
    const firstProposal = library.reconcileFixedPoint({
      previous: null,
      baseline: {
        ackEndpoint: baseline,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        metadataEpoch: 0n,
        xattrEpoch: 0n,
        startedAtNs: 1_000n
      },
      extension: firstExtension,
      observedAtNs: 2_000n
    });
    library.commitReconciliation({ proposal: firstProposal, committedAtNs: 2_001n });
    const secondSnapshot = task3b2Capture(library, root);
    const secondEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 701n,
      root,
      sequence: 3n,
      type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot: secondSnapshot,
      endpoint: secondEndpoint,
      eventRoots: [root],
      exactMetadataPaths: [path.join(root, library.TRANSACTION_METADATA_PATHS[0])],
      priorCheckpoint: firstExtension.checkpoint,
      priorSnapshot: firstSnapshot
    }), /pending evidence|metadata policy|policy.*changed/i);
  });
  for (const scenario of [
    {
      expectedCounter: "sourceEventCount",
      flags: 0x11400,
      label: "source",
      mutate(fixed) {
        fs.writeFileSync(fixed.target, "source during policy rebind\n");
        return fixed.target;
      }
    },
    {
      expectedCounter: "transactionMetadataEventCount",
      flags: 0x11400,
      label: "metadata",
      mutate(fixed, exactMetadataPath) {
        fs.mkdirSync(path.dirname(exactMetadataPath), { recursive: true });
        fs.writeFileSync(exactMetadataPath, "metadata during policy rebind\n");
        return exactMetadataPath;
      }
    },
    {
      expectedCounter: "xattrOnlyEventCount",
      flags: 0x18000,
      label: "xattr",
      mutate(fixed) {
        task3b2SetXattr(fixed.target, "xattr-during-policy-rebind");
        return fixed.target;
      }
    }
  ]) {
    await t.test(`a policy rebind rejects a current ${scenario.label} delta`, (subtest) => {
      const fixed = task3b2ReachFixedPoint(
        library,
        subtest,
        `fixed-policy-${scenario.label}-delta`,
        scenario.label === "metadata"
          ? ({ root }) => fs.mkdirSync(path.dirname(path.join(
            root,
            library.TRANSACTION_METADATA_PATHS[0]
          )), { recursive: true })
          : null
      );
      const exactMetadataPath = path.join(
        fixed.root,
        library.TRANSACTION_METADATA_PATHS[0]
      );
      const eventPath = scenario.mutate(fixed, exactMetadataPath);
      const candidateSnapshot = task3b2Capture(library, fixed.root);
      const journal = typedFseventsJournalRecord({
        sequence: 1n,
        eventId: 720n,
        flags: scenario.flags,
        path: eventPath
      });
      const endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
        entryCount: 1n,
        journal,
        lastEventId: 720n,
        root: fixed.root,
        sequence: 4n,
        type: 2
      }).endpoint;
      const extension = task3b2ReadExtension(library, {
        candidateSnapshot,
        endpoint,
        eventRoots: [fixed.root],
        exactMetadataPaths: [exactMetadataPath],
        priorCheckpoint: fixed.checkpoint,
        priorSnapshot: fixed.snapshot
      });
      assert.equal(extension.classification[scenario.expectedCounter], 1n);
      assert.throws(() => library.reconcileFixedPoint({
        previous: fixed.reconciliation,
        cycleStartedAtNs: 20_000n,
        extension,
        observedAtNs: 20_001n
      }), /metadata policy|policy rebind|wholly empty|exact extension/i);
    });
  }
});

test("Task 3B3A post-rebind STOP keeps the rebound policy and attestation", async (t) => {
  const library = await import(libraryUrl);
  const reachReboundFixedPoint = (subtest, label) => {
    const fixed = task3b2ReachFixedPoint(library, subtest, label);
    const exactMetadataPaths = [path.join(
      fixed.root,
      library.TRANSACTION_METADATA_PATHS[0]
    )];
    let candidateSnapshot = task3b2Capture(library, fixed.root);
    let endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 4n, type: 2
    }).endpoint;
    let extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      exactMetadataPaths,
      priorCheckpoint: fixed.checkpoint,
      priorSnapshot: fixed.snapshot
    });
    let proposal = library.reconcileFixedPoint({
      previous: fixed.reconciliation,
      cycleStartedAtNs: 20_000n,
      extension,
      observedAtNs: 20_001n
    });
    let reconciliation = library.commitReconciliation({
      proposal,
      committedAtNs: 20_002n
    });
    let priorCheckpoint = extension.checkpoint;
    let priorSnapshot = candidateSnapshot;
    candidateSnapshot = task3b2Capture(library, fixed.root);
    endpoint = task3b2NormalizeEndpoint(library, fixed.scratch, {
      root: fixed.root, sequence: 5n, type: 2
    }).endpoint;
    extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [fixed.root],
      exactMetadataPaths,
      priorCheckpoint,
      priorSnapshot
    });
    proposal = library.reconcileFixedPoint({
      previous: reconciliation,
      extension,
      observedAtNs: 20_003n
    });
    reconciliation = library.commitReconciliation({
      proposal,
      committedAtNs: 20_004n
    });
    assert.equal(reconciliation.phase, "fixed-point");
    return {
      checkpoint: extension.checkpoint,
      exactMetadataPaths,
      fixed,
      reconciliation,
      snapshot: candidateSnapshot
    };
  };

  await t.test("STOP rejects policy drift after a successful policy rebind", (subtest) => {
    const rebound = reachReboundFixedPoint(subtest, "post-rebind-stop-policy");
    const terminalSnapshot = task3b2Capture(library, rebound.fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, rebound.fixed.scratch, {
      root: rebound.fixed.root, sequence: 6n, type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [rebound.fixed.root],
      priorCheckpoint: rebound.checkpoint,
      priorSnapshot: rebound.snapshot
    });
    assert.throws(() => library.sealTerminal({
      reconciliation: rebound.reconciliation,
      terminalExtension,
      terminalAttestation: task3b2TerminalAttestation(
        terminalExtension,
        rebound.reconciliation
      ),
      sealedAtNs: 20_005n
    }), /metadata.*policy|policy.*changed|fingerprint|attestation/i);
  });

  await t.test("STOP rejects attestation drift after a successful policy rebind", (subtest) => {
    const rebound = reachReboundFixedPoint(subtest, "post-rebind-stop-attestation");
    const terminalSnapshot = task3b2Capture(library, rebound.fixed.root);
    const endpoint = task3b2NormalizeEndpoint(library, rebound.fixed.scratch, {
      root: rebound.fixed.root, sequence: 6n, type: 3
    }).endpoint;
    const terminalExtension = task3b2ReadExtension(library, {
      candidateSnapshot: terminalSnapshot,
      endpoint,
      eventRoots: [rebound.fixed.root],
      exactMetadataPaths: rebound.exactMetadataPaths,
      priorCheckpoint: rebound.checkpoint,
      priorSnapshot: rebound.snapshot
    });
    const terminalAttestation = task3b2TerminalAttestation(
      terminalExtension,
      rebound.reconciliation
    );
    assert.throws(() => library.sealTerminal({
      reconciliation: rebound.reconciliation,
      terminalExtension,
      terminalAttestation: {
        ...terminalAttestation,
        metadataPolicyFingerprint: "f".repeat(64)
      },
      sealedAtNs: 20_005n
    }), /attestation|metadata.*policy|fingerprint|match/i);
  });
});

test("Task 3B3A approves the writer lock only at a direct Git common-directory root", async (t) => {
  const library = await import(libraryUrl);
  await t.test("the exact lock in an explicitly trusted real Git common directory is metadata", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3a-common-dir-lock");
    const scratch = task3b2Scratch(subtest, "common-dir-lock");
    execFileSync("git", ["init", "--bare", root], {
      stdio: ["ignore", "ignore", "pipe"]
    });
    const trustedGitCommonDir = fs.realpathSync(execFileSync(
      "git",
      ["--git-dir", root, "rev-parse", "--absolute-git-dir"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim());
    assert.equal(trustedGitCommonDir, fs.realpathSync(root));
    const lockPath = path.join(root, "mais-evidence-writer.lock");
    fs.writeFileSync(lockPath, "old\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    fs.writeFileSync(lockPath, "new\n");
    const candidateSnapshot = task3b2Capture(library, root);
    const journal = typedFseventsJournalRecord({
      sequence: 1n,
      eventId: 801n,
      flags: 0x11400,
      path: lockPath
    });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      entryCount: 1n,
      journal,
      lastEventId: 801n,
      root,
      sequence: 2n,
      type: 2
    }).endpoint;
    const extension = task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      exactMetadataPaths: [lockPath],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot,
      trustedGitCommonDir
    });
    assert.equal(extension.classification.transactionMetadataEventCount, 1n);
    assert.equal(extension.classification.sourceEventCount, 0n);
    assert.equal(extension.snapshotRelation, "metadata-only");
  });

  await t.test("the trusted common-directory identity is policy-bound", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3a-common-dir-fingerprint");
    const scratch = task3b2Scratch(subtest, "common-dir-fingerprint");
    execFileSync("git", ["init", "--bare", root], {
      stdio: ["ignore", "ignore", "pipe"]
    });
    const trustedGitCommonDir = fs.realpathSync(root);
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const trustedSnapshot = task3b2Capture(library, root);
    const trustedEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    const trustedExtension = task3b2ReadExtension(library, {
      candidateSnapshot: trustedSnapshot,
      endpoint: trustedEndpoint,
      eventRoots: [root],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot,
      trustedGitCommonDir
    });
    const ordinarySnapshot = task3b2Capture(library, root);
    const ordinaryEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 3n, type: 2
    }).endpoint;
    const ordinaryExtension = task3b2ReadExtension(library, {
      candidateSnapshot: ordinarySnapshot,
      endpoint: ordinaryEndpoint,
      eventRoots: [root],
      priorCheckpoint: trustedExtension.checkpoint,
      priorSnapshot: trustedSnapshot
    });
    assert.notEqual(
      trustedExtension.metadataPolicyFingerprint,
      ordinaryExtension.metadataPolicyFingerprint
    );
  });

  const rejectLockPolicy = async (
    label,
    setup,
    { useTrustedRealGitCommonDir = false } = {}
  ) => t.test(label, (subtest) => {
    const { root } = makeStableProofTestRoot(
      subtest,
      `task3b3a-${label.replaceAll(/[^a-z0-9]+/giu, "-")}`
    );
    const scratch = task3b2Scratch(subtest, "common-dir-negative");
    if (useTrustedRealGitCommonDir) {
      execFileSync("git", ["init", "--bare", root], {
        stdio: ["ignore", "ignore", "pipe"]
      });
    }
    const trustedGitCommonDir = useTrustedRealGitCommonDir
      ? fs.realpathSync(root)
      : null;
    const lockPath = path.join(root, "mais-evidence-writer.lock");
    const baselineSnapshot = task3b2Capture(library, root);
    const baseline = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const candidateSnapshot = task3b2Capture(library, root);
    setup({ lockPath, root, scratch });
    const endpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 2n, type: 2
    }).endpoint;
    assert.throws(() => task3b2ReadExtension(library, {
      candidateSnapshot,
      endpoint,
      eventRoots: [root],
      exactMetadataPaths: [lockPath],
      priorCheckpoint: baseline.checkpoint,
      priorSnapshot: baselineSnapshot,
      trustedGitCommonDir
    }), /module-approved|trusted|common director|regular|no.follow|metadata path/i);
  });

  await rejectLockPolicy(
    "a fake HEAD objects refs marker shape cannot authorize the lock",
    ({ lockPath, root }) => {
      fs.writeFileSync(path.join(root, "HEAD"), "ref: refs/heads/main\n");
      fs.mkdirSync(path.join(root, "objects"));
      fs.mkdirSync(path.join(root, "refs"));
      fs.writeFileSync(lockPath, "fake marker lock\n");
    }
  );
  await rejectLockPolicy(
    "a symlink lock is rejected in an explicitly trusted real common directory",
    ({ lockPath, scratch }) => {
      const target = path.join(scratch, "lock-target");
      fs.writeFileSync(target, "symlink target\n");
      fs.symlinkSync(target, lockPath);
    },
    { useTrustedRealGitCommonDir: true }
  );
  await rejectLockPolicy(
    "a nonregular lock is rejected in an explicitly trusted real common directory",
    ({ lockPath }) => {
      fs.mkdirSync(lockPath);
    },
    { useTrustedRealGitCommonDir: true }
  );
  await rejectLockPolicy(
    "symlink HEAD objects refs marker shapes cannot authorize the lock",
    ({ lockPath, root, scratch }) => {
      const markerTarget = path.join(scratch, "marker-target");
      fs.mkdirSync(markerTarget);
      fs.writeFileSync(path.join(markerTarget, "HEAD"), "ref: refs/heads/main\n");
      fs.mkdirSync(path.join(markerTarget, "objects"));
      fs.mkdirSync(path.join(markerTarget, "refs"));
      fs.symlinkSync(path.join(markerTarget, "HEAD"), path.join(root, "HEAD"));
      fs.symlinkSync(path.join(markerTarget, "objects"), path.join(root, "objects"));
      fs.symlinkSync(path.join(markerTarget, "refs"), path.join(root, "refs"));
      fs.writeFileSync(lockPath, "symlink marker lock\n");
    }
  );
});

test("Task 3B3B fixed-cycle adapter publishes only complete fixed-point packages", async (t) => {
  const library = await import(libraryUrl);
  assert.equal(typeof library.runTypedFseventsFixedCycle, "function");
  const makeClock = (initial = 10_000n) => {
    let value = initial;
    return () => {
      const observed = value;
      value += 1n;
      return observed;
    };
  };
  const makeAcknowledgementDriver = (scratch, root, plans) => {
    let callCount = 0;
    return {
      flushAcknowledgement() {
        const plan = plans[callCount];
        if (plan instanceof Error) throw plan;
        assert.notEqual(plan, undefined, "adapter requested an unexpected FLUSH");
        callCount += 1;
        return task3b2ReadAcknowledgement(library, scratch, { root, ...plan });
      },
      get callCount() { return callCount; }
    };
  };

  await t.test("zero events reach a fixed point in exactly two rounds", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3b-adapter-empty");
    const scratch = task3b2Scratch(subtest, "adapter-empty");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const driver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 2n, type: 2 },
      { sequence: 3n, type: 2 }
    ]);
    const fixed = library.runTypedFseventsFixedCycle({
      baseline: {
        ackEndpoint: baselineEndpoint,
        metadataEpoch: 0n,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        startedAtNs: 10_000n,
        xattrEpoch: 0n
      },
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: driver.flushAcknowledgement,
      nowNs: makeClock(10_001n),
      previous: null
    });
    assert.deepEqual(Object.keys(fixed).sort(), ["checkpoint", "reconciliation", "snapshot"]);
    assert.equal(Object.isFrozen(fixed), true);
    assert.equal(fixed.reconciliation.phase, "fixed-point");
    assert.equal(fixed.reconciliation.roundCount, 2n);
    assert.equal(fixed.reconciliation.checkpoint, fixed.checkpoint);
    assert.equal(fixed.reconciliation.snapshotSha256, fixed.snapshot.sha256);
    assert.equal(driver.callCount, 2);
  });

  await t.test("only an exact module-published package may start a later cycle", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3b-adapter-package-brand");
    const scratch = task3b2Scratch(subtest, "adapter-package-brand");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const driver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 2n, type: 2 },
      { sequence: 3n, type: 2 }
    ]);
    const published = library.runTypedFseventsFixedCycle({
      baseline: {
        ackEndpoint: baselineEndpoint,
        metadataEpoch: 0n,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        startedAtNs: 15_000n,
        xattrEpoch: 0n
      },
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: driver.flushAcknowledgement,
      nowNs: makeClock(15_001n)
    });
    const common = {
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: () => {
        throw new Error("unbranded package reached FLUSH");
      },
      nowNs: makeClock(15_100n)
    };
    assert.throws(
      () => library.runTypedFseventsFixedCycle({ ...common, previous: { ...published } }),
      /module-published|package|brand/i
    );
    let proxyTrapCount = 0;
    const proxied = new Proxy(published, {
      get(target, property, receiver) {
        proxyTrapCount += 1;
        return Reflect.get(target, property, receiver);
      },
      ownKeys(target) {
        proxyTrapCount += 1;
        return Reflect.ownKeys(target);
      }
    });
    assert.throws(
      () => library.runTypedFseventsFixedCycle({ ...common, previous: proxied }),
      /module-published|package|brand/i
    );
    assert.equal(proxyTrapCount, 0, "package branding must reject a Proxy before any trap");
  });

  await t.test("one source event and its carry clear in four rounds", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3b-adapter-event");
    const scratch = task3b2Scratch(subtest, "adapter-event");
    const target = path.join(root, "source.txt");
    fs.writeFileSync(target, "before\n");
    const journal = typedFseventsJournalRecord({
      sequence: 1n,
      eventId: 901n,
      flags: 0x11400,
      path: target
    });
    const baselineSnapshot = task3b2Capture(library, root);
    const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const plans = [];
    for (const sequence of [2n, 3n, 4n, 5n]) {
      plans.push({
        entryCount: 1n,
        journal,
        lastEventId: 901n,
        sequence,
        type: 2
      });
    }
    const driver = makeAcknowledgementDriver(scratch, root, plans);
    let captureCount = 0;
    const clock = makeClock(20_001n);
    const firstFixed = library.runTypedFseventsFixedCycle({
      baseline: {
        ackEndpoint: baselineEndpoint,
        metadataEpoch: 0n,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        startedAtNs: 20_000n,
        xattrEpoch: 0n
      },
      captureSnapshot() {
        captureCount += 1;
        if (captureCount === 1) fs.writeFileSync(target, "after\n");
        return task3b2Capture(library, root);
      },
      eventRoots: [root],
      flushAcknowledgement: driver.flushAcknowledgement,
      nowNs: clock,
      previous: null
    });
    assert.equal(firstFixed.reconciliation.phase, "fixed-point");
    assert.equal(firstFixed.reconciliation.roundCount, 4n);
    assert.equal(firstFixed.reconciliation.counters.sourceEventCount, 1n);
    assert.equal(firstFixed.reconciliation.journalFirstEventId, 901n);
    assert.equal(firstFixed.reconciliation.journalLastEventId, 901n);
    assert.equal(driver.callCount, 4);

    const repeatedDriver = makeAcknowledgementDriver(scratch, root, [
      { entryCount: 1n, journal, lastEventId: 901n, sequence: 6n, type: 2 },
      { entryCount: 1n, journal, lastEventId: 901n, sequence: 7n, type: 2 }
    ]);
    const repeated = library.runTypedFseventsFixedCycle({
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: repeatedDriver.flushAcknowledgement,
      nowNs: clock,
      previous: firstFixed
    });
    assert.equal(repeated.reconciliation.phase, "fixed-point");
    assert.equal(repeated.reconciliation.roundCount, 2n);
    assert.deepEqual(repeated.reconciliation.counters, firstFixed.reconciliation.counters);
    assert.equal(repeated.reconciliation.journalFirstEventId, 901n);
    assert.equal(repeated.reconciliation.journalLastEventId, 901n);
    assert.equal(repeatedDriver.callCount, 2);
  });

  await t.test("a failed later cycle preserves its published predecessor transactionally", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3b-adapter-transaction");
    const scratch = task3b2Scratch(subtest, "adapter-transaction");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const initialDriver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 2n, type: 2 },
      { sequence: 3n, type: 2 }
    ]);
    const published = library.runTypedFseventsFixedCycle({
      baseline: {
        ackEndpoint: baselineEndpoint,
        metadataEpoch: 0n,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        startedAtNs: 40_000n,
        xattrEpoch: 0n
      },
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: initialDriver.flushAcknowledgement,
      nowNs: makeClock(40_001n)
    });
    const failedDriver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 4n, type: 2 },
      new Error("later-cycle injected FLUSH failure")
    ]);
    assert.throws(() => library.runTypedFseventsFixedCycle({
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: failedDriver.flushAcknowledgement,
      nowNs: makeClock(40_100n),
      previous: published
    }), /later-cycle injected FLUSH failure/i);
    assert.equal(failedDriver.callCount, 1);

    let preservedCycleStart = false;
    assert.throws(() => library.runTypedFseventsFixedCycle({
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: () => {
        throw new Error("preserved predecessor reached FLUSH");
      },
      nowNs(label) {
        assert.equal(label, "cycle-start");
        preservedCycleStart = true;
        throw new Error("preserved predecessor brand probe");
      },
      previous: published
    }), /preserved predecessor brand probe/i);
    assert.equal(preservedCycleStart, true);
  });

  await t.test("a transactional cycle rejects a reentrant fork of its predecessor", (subtest) => {
    const { root } = makeStableProofTestRoot(subtest, "task3b3b-adapter-reentrant");
    const scratch = task3b2Scratch(subtest, "adapter-reentrant");
    fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
    const baselineSnapshot = task3b2Capture(library, root);
    const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
      root, sequence: 1n, type: 2
    }).endpoint;
    const initialDriver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 2n, type: 2 },
      { sequence: 3n, type: 2 }
    ]);
    const published = library.runTypedFseventsFixedCycle({
      baseline: {
        ackEndpoint: baselineEndpoint,
        metadataEpoch: 0n,
        snapshot: baselineSnapshot,
        sourceEpoch: 0n,
        startedAtNs: 50_000n,
        xattrEpoch: 0n
      },
      captureSnapshot: () => task3b2Capture(library, root),
      eventRoots: [root],
      flushAcknowledgement: initialDriver.flushAcknowledgement,
      nowNs: makeClock(50_001n)
    });
    const outerDriver = makeAcknowledgementDriver(scratch, root, [
      { sequence: 4n, type: 2 },
      { sequence: 5n, type: 2 }
    ]);
    let attemptedReentry = false;
    let reentrantCallbackCount = 0;
    let reentrantError = null;
    const replacement = library.runTypedFseventsFixedCycle({
      captureSnapshot() {
        if (!attemptedReentry) {
          attemptedReentry = true;
          try {
            library.runTypedFseventsFixedCycle({
              captureSnapshot() {
                reentrantCallbackCount += 1;
                return task3b2Capture(library, root);
              },
              eventRoots: [root],
              flushAcknowledgement() {
                reentrantCallbackCount += 1;
                throw new Error("reentrant FLUSH must not run");
              },
              nowNs: makeClock(50_100n),
              previous: published
            });
          } catch (error) {
            reentrantError = error;
          }
        }
        return task3b2Capture(library, root);
      },
      eventRoots: [root],
      flushAcknowledgement: outerDriver.flushAcknowledgement,
      nowNs: makeClock(50_200n),
      previous: published
    });
    assert.equal(replacement.reconciliation.phase, "fixed-point");
    assert.match(reentrantError?.message ?? "", /transaction|active|reentrant/i);
    assert.equal(reentrantCallbackCount, 0);
    assert.equal(outerDriver.callCount, 2);
    let staleCallbackCount = 0;
    assert.throws(() => library.runTypedFseventsFixedCycle({
      captureSnapshot() {
        staleCallbackCount += 1;
        return task3b2Capture(library, root);
      },
      eventRoots: [root],
      flushAcknowledgement() {
        staleCallbackCount += 1;
        throw new Error("stale predecessor reached FLUSH");
      },
      nowNs: makeClock(50_300n),
      previous: published
    }), /consumed|stale/i);
    assert.equal(staleCallbackCount, 0, "successful replacement must consume its predecessor before callbacks");
  });

  for (const scenario of [
    {
      label: "an injected FLUSH sequence gap",
      plans: [{ sequence: 2n, type: 2 }, { sequence: 4n, type: 2 }],
      pattern: /sequence|successor|stale|order/i
    },
    {
      label: "an injected FLUSH failure",
      plans: [{ sequence: 2n, type: 2 }, new Error("injected FLUSH failure")],
      pattern: /injected FLUSH failure/i
    }
  ]) {
    await t.test(`${scenario.label} leaves caller publication unchanged`, (subtest) => {
      const { root } = makeStableProofTestRoot(
        subtest,
        `task3b3b-${scenario.label.replaceAll(/[^a-z0-9]+/giu, "-")}`
      );
      const scratch = task3b2Scratch(subtest, "adapter-failure");
      fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
      const baselineSnapshot = task3b2Capture(library, root);
      const baselineEndpoint = task3b2NormalizeEndpoint(library, scratch, {
        root, sequence: 1n, type: 2
      }).endpoint;
      const driver = makeAcknowledgementDriver(scratch, root, scenario.plans);
      const callerPublication = { current: Object.freeze({ status: "before" }) };
      const original = callerPublication.current;
      assert.throws(() => {
        callerPublication.current = library.runTypedFseventsFixedCycle({
          baseline: {
            ackEndpoint: baselineEndpoint,
            metadataEpoch: 0n,
            snapshot: baselineSnapshot,
            sourceEpoch: 0n,
            startedAtNs: 30_000n,
            xattrEpoch: 0n
          },
          captureSnapshot: () => task3b2Capture(library, root),
          eventRoots: [root],
          flushAcknowledgement: driver.flushAcknowledgement,
          nowNs: makeClock(30_001n),
          previous: null
        });
      }, scenario.pattern);
      assert.equal(callerPublication.current, original);
      assert.deepEqual(callerPublication.current, { status: "before" });
    });
  }
});

test("Task 3B3B detached monitor source is complete bounded and provenance-coherent", async (t) => {
  const library = await import(libraryUrl);
  assert.equal(typeof library.inspectMutationMonitorChildSource, "function");
  assert.equal(typeof library.inspectTypedFseventsReconciliationChildSource, "function");
  const inspection = library.inspectMutationMonitorChildSource();
  const reconciliationInspection = library.inspectTypedFseventsReconciliationChildSource();
  assert.deepEqual(Object.keys(inspection).sort(), ["bytes", "sha256", "source"]);
  assert.equal(Buffer.byteLength(inspection.source), inspection.bytes);
  assert.equal(library.sha256Buffer(Buffer.from(inspection.source)), inspection.sha256);
  assert.ok(inspection.bytes > 128 * 1024, `assembled source has only ${inspection.bytes} bytes`);
  for (const name of [
    "captureStableProofSnapshot",
    "normalizeTypedFseventsAckCheckpoint",
    "readAndValidateJournalExtension",
    "reconcileFixedPoint",
    "commitReconciliation",
    "sealTerminal",
    "runTypedFseventsFixedCycle"
  ]) assert.match(inspection.source, new RegExp(`function ${name}\\b`, "u"), name);
  assert.equal(
    inspection.source.match(/TYPED_FSEVENTS_COMMITTED_ACKNOWLEDGEMENTS = new WeakMap/g)?.length,
    1
  );
  assert.equal(
    inspection.source.match(/TYPED_FSEVENTS_PROVENANCE_ORDINAL = 0n/g)?.length,
    1
  );
  assert.equal(inspection.source.match(/TYPED_FSEVENTS_MAX_UINT64 =/g)?.length, 1);
  assert.equal(
    inspection.source.match(/TYPED_FSEVENTS_FIXED_CYCLE_PACKAGES = new WeakMap/g)?.length,
    1
  );
  assert.equal(
    inspection.source.match(/TYPED_FSEVENTS_ACTIVE_FIXED_CYCLE_SESSIONS = new Set/g)?.length,
    1
  );
  assert.equal(
    inspection.source.match(/TYPED_FSEVENTS_FIXED_CYCLE_WORKING_RECONCILIATIONS = new WeakSet/g)?.length,
    1
  );
  assert.match(inspection.source, /import \{ execFileSync, spawn, spawnSync \} from "node:child_process"/u);
  assert.match(inspection.source, /process\.argv\.slice\(-2\)/u);
  assert.match(inspection.source, /return acknowledgement;/u);
  assert.doesNotMatch(inspection.source, /return \{\s*\.\.\.acknowledgement/gu);
  assert.match(inspection.source, /candidate\.commitVisibleInode !== previousCommitInode/u);
  assert.doesNotMatch(
    inspection.source,
    /(?:from\s+|import\s*\()["'](?:file:|\.{1,2}\/|\/Users\/)/u
  );

  const scratch = task3b2Scratch(t, "assembled-source-check");
  const sourcePath = path.join(scratch, "assembled-child.mjs");
  fs.writeFileSync(sourcePath, inspection.source, { mode: 0o400 });
  const syntax = spawnSync(process.execPath, ["--check", sourcePath], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

  const { root: captureRoot } = makeStableProofTestRoot(t, "task3b3b-child-capture");
  fs.writeFileSync(path.join(captureRoot, "source.txt"), "stable\n");
  const runtimePath = path.join(scratch, "reconciliation-runtime.mjs");
  fs.writeFileSync(runtimePath, [
    'import { spawnSync } from "node:child_process";',
    'import { isUtf8 } from "node:buffer";',
    'import crypto from "node:crypto";',
    'import fs from "node:fs";',
    'import path from "node:path";',
    reconciliationInspection.source,
    "const root = fs.realpathSync(process.argv.at(-1));",
    "const snapshot = captureStableProofSnapshot({ policies: [{ root, trackedRelativePaths: [] }] });",
    "process.stdout.write(JSON.stringify({ pathCount: snapshot.pathCount, sha256: snapshot.sha256 }));"
  ].join("\n"), { mode: 0o400 });
  const runtime = spawnSync(process.execPath, [runtimePath, captureRoot], {
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
  });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  const captured = JSON.parse(runtime.stdout);
  assert.ok(captured.pathCount >= 2);
  assert.match(captured.sha256, /^[0-9a-f]{64}$/u);

  const { root } = makeStableProofTestRoot(t, "task3b3b-raw-ack-brand");
  const ackScratch = task3b2Scratch(t, "raw-ack-brand");
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const acknowledgement = task3b2ReadAcknowledgement(library, ackScratch, {
    root, sequence: 1n, type: 2
  });
  assert.throws(() => library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement: { ...acknowledgement },
    eventRoots: [root]
  }), /module|validated|committed|brand/i);
  const endpoint = library.normalizeTypedFseventsAckCheckpoint({
    acknowledgement,
    eventRoots: [root]
  });
  assert.equal(endpoint.sequence, 1n);
});

test("Task 3B3B monitor starts from private fd4 source with small argv", async (t) => {
  const { root } = makeStableProofTestRoot(t, "task3b3b-monitor-fd4");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    sha256Buffer,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([root], {
    startupTimeoutMs: 30_000,
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const sourceStatus = fs.lstatSync(monitor.childSourcePath);
  assert.equal(sourceStatus.isFile(), true);
  assert.equal(sourceStatus.isSymbolicLink(), false);
  assert.equal(sourceStatus.mode & 0o7777, 0o400);
  assert.equal(sourceStatus.nlink, 1);
  const source = fs.readFileSync(monitor.childSourcePath);
  assert.equal(source.length, monitor.childSourceBytes);
  assert.equal(sha256Buffer(source), monitor.childSourceSha256);
  assert.equal(monitor.childSourceExecutionPath, "/dev/fd/4");
  assert.equal(monitor.childSourceDescriptorNumber, 4);
  assert.deepEqual(monitor.child.spawnargs.slice(1, 3), ["--import=/dev/fd/4", "-"]);
  assert.equal(monitor.child.spawnargs.includes("-e"), false);
  assert.ok(monitor.childSourceBytes > 128 * 1024);
  assert.ok(monitor.bootstrapArgBytes < 4 * 1024);
  assert.equal(readMutationEpochState(monitor, { requestSample: false }).schemaVersion, 3);
});

test("Task 3B3B READY monitor fails closed promptly after its child becomes a zombie", async (t) => {
  const { root } = makeStableProofTestRoot(t, "task3b3b-monitor-ready-exit");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([root], {
    startupTimeoutMs: 30_000,
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  assert.equal(fs.existsSync(monitor.readyPath), true, "fixture requires an observed READY side effect");
  process.kill(monitor.child.pid, "SIGKILL");
  const zombieDeadline = Date.now() + 5_000;
  let processState = "";
  while (Date.now() < zombieDeadline) {
    const observed = spawnSync("/bin/ps", ["-o", "state=", "-p", String(monitor.child.pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    processState = observed.status === 0 ? observed.stdout.trim() : "exited";
    if (processState === "exited" || processState.startsWith("Z")) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  assert.match(processState, /^(?:Z|exited)/u, `child did not exit or become zombie: ${processState}`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  const startedAt = Date.now();
  assert.throws(
    () => readMutationEpochState(monitor, { requestSample: false }),
    /crashed|exited|fails closed/i
  );
  assert.ok(Date.now() - startedAt < 1_000, "zombie child detection must not wait for an operation timeout");
});

test("Task 3B3B monitor liveness bounds ps inspections by reads and 75ms polling", async (t) => {
  const { root } = makeStableProofTestRoot(t, "task3b3b-monitor-liveness-budget");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const {
    abortMutationEpochMonitor,
    inspectMutationMonitorLivenessDiagnostics,
    readMutationEpochState,
    settleMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([root], {
    startupTimeoutMs: 30_000,
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const before = inspectMutationMonitorLivenessDiagnostics();
  const startedAt = Date.now();
  for (let index = 0; index < 4; index += 1) readMutationEpochState(monitor);
  settleMutationEpochState(monitor, { quietMs: 75 });
  const elapsedMs = Math.max(1, Date.now() - startedAt);
  const after = inspectMutationMonitorLivenessDiagnostics();
  const logicalReads = after.logicalReadCount - before.logicalReadCount;
  const psInspections = after.psInspectionCount - before.psInspectionCount;
  assert.ok(logicalReads >= 6, `expected repeated logical reads, observed ${logicalReads}`);
  const periodicInspectionBudget = Math.ceil(elapsedMs / 75);
  if (["darwin", "linux"].includes(process.platform) && fs.existsSync("/bin/ps")) {
    assert.ok(psInspections > 0, "supported platforms must exercise real ps inspection");
  }
  assert.ok(
    psInspections <= logicalReads + periodicInspectionBudget,
    `ps inspections exceeded logical boundaries plus 75ms polling budget: ${psInspections}/${logicalReads}+${periodicInspectionBudget}`
  );
});

test("Task 3B3B default sample detects a zombie child before its bounded ACK timeout", async (t) => {
  const { root } = makeStableProofTestRoot(t, "task3b3b-monitor-sample-zombie");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const {
    abortMutationEpochMonitor,
    readMutationEpochState,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([root], {
    startupTimeoutMs: 30_000,
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  process.kill(monitor.child.pid, "SIGKILL");
  const zombieDeadline = Date.now() + 5_000;
  let processState = "";
  while (Date.now() < zombieDeadline) {
    const observed = spawnSync("/bin/ps", ["-o", "state=", "-p", String(monitor.child.pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    processState = observed.status === 0 ? observed.stdout.trim() : "exited";
    if (processState === "exited" || processState.startsWith("Z")) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  assert.match(processState, /^(?:Z|exited)/u, `child did not exit or become zombie: ${processState}`);
  const startedAt = Date.now();
  assert.throws(
    () => readMutationEpochState(monitor, { sampleTimeoutMs: 700 }),
    /child exited|failed closed|crashed/i
  );
  assert.ok(Date.now() - startedAt < 700, "zombie sample must fail before its bounded ACK timeout");
});

test("Task 3B3B registration detects a child killed at IPC send without late EPIPE", async (t) => {
  const { root } = makeStableProofTestRoot(t, "task3b3b-monitor-registration-zombie");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(path.join(root, "source.txt"), "stable\n");
  const {
    abortMutationEpochMonitor,
    registerMutationMetadataRoot,
    startMutationEpochMonitor
  } = await import(libraryUrl);
  const monitor = startMutationEpochMonitor([root], {
    startupTimeoutMs: 30_000,
    watchMode: "auto"
  });
  t.after(() => abortMutationEpochMonitor(monitor));
  const originalSend = monitor.child.send.bind(monitor.child);
  let killedAtRegistrationSend = false;
  monitor.child.send = (message, ...args) => {
    if (message?.type === "register-metadata-root" && !killedAtRegistrationSend) {
      killedAtRegistrationSend = true;
      process.kill(monitor.child.pid, "SIGKILL");
    }
    return originalSend(message, ...args);
  };
  const relativePath = `coordination/release-intake/archive/.evidence-publish-${process.pid}-${crypto.randomUUID()}`;
  const startedAt = Date.now();
  assert.throws(
    () => registerMutationMetadataRoot(monitor, { root, relativePath }),
    /registration.*failed closed|child exited|crashed/i
  );
  assert.equal(killedAtRegistrationSend, true, "fixture must kill only at registration IPC send");
  assert.ok(Date.now() - startedAt < 1_000, "registration zombie must fail closed within one second");
});

test("Task 3B3C production child closes capture classify reconcile seal without the placeholder", async () => {
  const library = await import(libraryUrl);
  const inspection = library.inspectMutationMonitorChildSource();
  assert.doesNotMatch(
    inspection.source,
    /typed FSEvents journal event classification is not yet reconciled/u
  );
  assert.match(inspection.source, /const reconcileTypedFseventsCycle =/u);
  assert.match(inspection.source, /runTypedFseventsFixedCycle\(\{/u);
  assert.match(inspection.source, /captureStableProofSnapshot\(\{/u);
  assert.match(inspection.source, /normalizeTypedFseventsAckCheckpoint\(\{/u);
  assert.match(inspection.source, /readAndValidateJournalExtension\(\{/u);
  assert.match(inspection.source, /sealTerminal\(\{/u);
  assert.match(inspection.source, /process\.hrtime\.bigint\(\)/u);
});

test("Task 3B3C production child gives typed ACKs the reviewed bounded allowance", async () => {
  const library = await import(libraryUrl);
  const inspection = library.inspectMutationMonitorChildSource();
  const match = inspection.source.match(
    /const TYPED_FSEVENTS_ACK_TIMEOUT_MS = ([0-9_]+);/u
  );
  assert.notEqual(match, null, "the detached child must embed one named ACK timeout");
  const timeoutMs = Number(match[1].replaceAll("_", ""));
  assert.ok(timeoutMs >= 20_000, `typed ACK allowance is too short: ${timeoutMs}`);
  assert.ok(timeoutMs < 325_000, `typed ACK allowance exceeds the parent operation bound: ${timeoutMs}`);
  assert.match(
    inspection.source,
    /const deadline = Date\.now\(\) \+ TYPED_FSEVENTS_ACK_TIMEOUT_MS;/u
  );
  assert.doesNotMatch(
    inspection.source,
    /const deadline = Date\.now\(\) \+ 15_000;/u
  );
});

test("Task 3B3C metadata policy uses the most-specific overlapping event root", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-overlapping-roots");
  const scratch = task3b2Scratch(t, "overlapping-roots");
  const nestedRoot = path.join(root, "nested-root");
  fs.mkdirSync(nestedRoot);
  fs.writeFileSync(path.join(nestedRoot, "nested.txt"), "nested\n");
  const eventRoots = [fs.realpathSync(root), fs.realpathSync(nestedRoot)]
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const rootsBuffer = Buffer.concat(eventRoots.flatMap((item) => [
    Buffer.from(item),
    Buffer.from([0])
  ]));
  const capture = () => library.captureStableProofSnapshot({
    policies: eventRoots.map((item) => ({ root: item, trackedRelativePaths: [] }))
  });
  const normalize = (sequence) => {
    const published = writeTypedFseventsV2Endpoint(scratch, {
      rootsBuffer,
      sequence,
      type: 2
    });
    const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
      published.acknowledgementPath,
      {
        expectedEventRootCount: published.eventRootCount,
        expectedEventRootFingerprint: published.eventRootFingerprint
      }
    );
    assert.notEqual(acknowledgement, null);
    return library.normalizeTypedFseventsAckCheckpoint({ acknowledgement, eventRoots });
  };
  const priorSnapshot = capture();
  const priorEndpoint = normalize(1n);
  const candidateSnapshot = capture();
  const endpoint = normalize(2n);
  const approvedPath = path.join(
    nestedRoot,
    ...library.TRANSACTION_METADATA_PATHS[0].split("/")
  );
  const extension = library.readAndValidateJournalExtension({
    candidateSnapshot,
    endpoint,
    eventRoots,
    exactMetadataPaths: [approvedPath],
    priorCheckpoint: priorEndpoint.checkpoint,
    priorSnapshot
  });
  assert.equal(extension.snapshotRelation, "exact");
  assert.equal(extension.classification.journalEntryCount, 0n);
});

test("Task 3B3C dynamic metadata policy binds the writer parent PID explicitly", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-parent-pid");
  const scratch = task3b2Scratch(t, "parent-pid");
  const metadataOwnerPid = process.pid + 1;
  const exactMetadataRoot = path.join(
    root,
    "coordination",
    "release-intake",
    "archive",
    `.evidence-publish-${metadataOwnerPid}-${crypto.randomUUID()}`
  );
  const priorSnapshot = task3b2Capture(library, root);
  const priorEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 1n,
    type: 2
  }).endpoint;
  const candidateSnapshot = task3b2Capture(library, root);
  const endpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 2n,
    type: 2
  }).endpoint;
  const extension = library.readAndValidateJournalExtension({
    candidateSnapshot,
    endpoint,
    eventRoots: [root],
    exactMetadataRoots: [exactMetadataRoot],
    metadataOwnerPid,
    priorCheckpoint: priorEndpoint.checkpoint,
    priorSnapshot
  });
  assert.equal(extension.snapshotRelation, "exact");

  const rejectedCandidate = task3b2Capture(library, root);
  const rejectedEndpoint = task3b2NormalizeEndpoint(library, scratch, {
    root,
    sequence: 3n,
    type: 2
  }).endpoint;
  assert.throws(() => library.readAndValidateJournalExtension({
    candidateSnapshot: rejectedCandidate,
    endpoint: rejectedEndpoint,
    eventRoots: [root],
    exactMetadataRoots: [exactMetadataRoot],
    priorCheckpoint: priorEndpoint.checkpoint,
    priorSnapshot
  }), /metadata root.*module-approved|PID|owner/i);
});

test("Task 3B3C Git-currentness scope hashes dirty closure and controls without opening clean or ignored payloads", async (t) => {
  const library = await import(libraryUrl);
  assert.equal(typeof library.createGitCurrentnessProofScope, "function");
  assert.equal(typeof library.captureGitCurrentnessProofSnapshot, "function");
  const { root } = makeStableProofTestRoot(t, "task3b3c-git-currentness-scope");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "scope@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Scope Fixture"], { cwd: root });
  fs.writeFileSync(path.join(root, ".gitignore"), ".ignored-secret/\n");
  fs.writeFileSync(path.join(root, "clean.txt"), "clean\n");
  fs.writeFileSync(path.join(root, "dirty.txt"), "baseline\n");
  execFileSync("git", ["add", ".gitignore", "clean.txt", "dirty.txt"], { cwd: root });
  execFileSync("git", ["commit", "-m", "scope baseline"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"]
  });
  fs.appendFileSync(path.join(root, "dirty.txt"), "dirty\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "untracked\n");
  const ignored = path.join(root, ".ignored-secret");
  fs.mkdirSync(ignored);
  fs.writeFileSync(path.join(ignored, ".env.local"), "DO_NOT_READ=secret\n");
  const fifo = path.join(ignored, "never-open.fifo");
  execFileSync("/usr/bin/mkfifo", [fifo]);
  const oversized = path.join(ignored, "oversized.bin");
  execFileSync("/usr/bin/truncate", ["-s", String(9 * 1024 * 1024 * 1024), oversized]);

  const gitCommonDir = fs.realpathSync(path.join(root, ".git"));
  const scope = library.createGitCurrentnessProofScope({
    policies: [
      {
        root,
        exactMetadataPaths: [library.TRANSACTION_METADATA_PATHS[0]],
        exactMetadataRoots: []
      },
      { root: gitCommonDir, exactMetadataPaths: [], exactMetadataRoots: [] }
    ],
    trustedGitCommonDir: gitCommonDir
  });
  const readPaths = [];
  const snapshot = library.captureGitCurrentnessProofSnapshot({
    scope,
    hooks: {
      afterRegularRead({ absolutePath }) { readPaths.push(absolutePath); }
    }
  });
  assert.equal(scope.captureMode, "git-currentness-sparse-v1");
  assert.match(scope.contractFingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(snapshot.pathCount, scope.pathCount);
  assert.ok(readPaths.includes(path.join(root, "dirty.txt")));
  assert.ok(readPaths.includes(path.join(root, "untracked.txt")));
  assert.equal(readPaths.includes(path.join(root, "clean.txt")), false);
  assert.equal(readPaths.some((candidate) => candidate.startsWith(`${ignored}${path.sep}`)), false);
  assert.equal(snapshot.lookup(path.join(root, "clean.txt")), undefined);
  assert.equal(snapshot.lookup(path.join(ignored, ".env.local")), undefined);
  assert.equal(snapshot.lookup(fifo), undefined);
  assert.equal(snapshot.lookup(oversized), undefined);
  assert.deepEqual(
    snapshot.lookup(path.join(root, ...library.TRANSACTION_METADATA_PATHS[0].split("/"))),
    { type: "tombstone" }
  );
});

test("Task 3B3C Git-currentness scope selection does not scale with the clean tracked universe", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-scope-clean-universe");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "scope@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Scope Fixture"], { cwd: root });
  const cleanDirectory = path.join(root, "clean-universe");
  fs.mkdirSync(cleanDirectory);
  for (let index = 0; index < 2_000; index += 1) {
    fs.writeFileSync(path.join(cleanDirectory, `clean-${String(index).padStart(4, "0")}.txt`), "x\n");
  }
  fs.writeFileSync(path.join(root, "selected.txt"), "baseline\n");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "large clean index"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"]
  });
  fs.appendFileSync(path.join(root, "selected.txt"), "dirty\n");
  const gitCommonDir = fs.realpathSync(path.join(root, ".git"));
  const policies = [
    { root, exactMetadataPaths: [], exactMetadataRoots: [] },
    { root: gitCommonDir, exactMetadataPaths: [], exactMetadataRoots: [] }
  ];
  const first = library.createGitCurrentnessProofScope({ policies, trustedGitCommonDir: gitCommonDir });
  fs.writeFileSync(path.join(root, "new-untracked.txt"), "new\n");
  const second = library.createGitCurrentnessProofScope({ policies, trustedGitCommonDir: gitCommonDir });
  assert.ok(first.pathCount < 64, `clean index leaked into sparse selection: ${first.pathCount}`);
  assert.equal(second.pathCount, first.pathCount + 1);
  assert.notEqual(second.selectionFingerprint, first.selectionFingerprint);
  const snapshot = library.captureGitCurrentnessProofSnapshot({ scope: first });
  assert.equal(snapshot.lookup(path.join(root, "selected.txt")).type, "regular-file");
  assert.equal(snapshot.lookup(path.join(root, "new-untracked.txt")), undefined);
  assert.equal(snapshot.lookup(path.join(cleanDirectory, "clean-0000.txt")), undefined);
});

test("Task 3B3C Git-currentness scope freezes deleted and renamed dirty leaves", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-scope-deleted-renamed");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "scope@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Scope Fixture"], { cwd: root });
  fs.writeFileSync(path.join(root, "deleted.txt"), "delete me\n");
  fs.writeFileSync(path.join(root, "rename-from.txt"), "rename me\n");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "tombstone baseline"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"]
  });
  fs.unlinkSync(path.join(root, "deleted.txt"));
  fs.renameSync(path.join(root, "rename-from.txt"), path.join(root, "rename-to.txt"));
  const gitCommonDir = fs.realpathSync(path.join(root, ".git"));
  const scope = library.createGitCurrentnessProofScope({
    policies: [
      { root, exactMetadataPaths: [], exactMetadataRoots: [] },
      { root: gitCommonDir, exactMetadataPaths: [], exactMetadataRoots: [] }
    ],
    trustedGitCommonDir: gitCommonDir
  });
  const snapshot = library.captureGitCurrentnessProofSnapshot({ scope });
  assert.deepEqual(snapshot.lookup(path.join(root, "deleted.txt")), { type: "tombstone" });
  assert.deepEqual(snapshot.lookup(path.join(root, "rename-from.txt")), { type: "tombstone" });
  assert.equal(snapshot.lookup(path.join(root, "rename-to.txt")).type, "regular-file");
});

test("Task 3B3C full and Git-currentness snapshots cannot share one fixed-point lineage", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-snapshot-mode-lineage");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "scope@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Scope Fixture"], { cwd: root });
  fs.writeFileSync(path.join(root, "dirty.txt"), "baseline\n");
  execFileSync("git", ["add", "dirty.txt"], { cwd: root });
  execFileSync("git", ["commit", "-m", "lineage baseline"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"]
  });
  fs.appendFileSync(path.join(root, "dirty.txt"), "dirty\n");
  const gitCommonDir = fs.realpathSync(path.join(root, ".git"));
  const policies = [
    { root, exactMetadataPaths: [], exactMetadataRoots: [] },
    { root: gitCommonDir, exactMetadataPaths: [], exactMetadataRoots: [] }
  ];
  const scope = library.createGitCurrentnessProofScope({ policies, trustedGitCommonDir: gitCommonDir });
  const sparse = library.captureGitCurrentnessProofSnapshot({ scope });
  const full = library.captureStableProofSnapshot({
    policies: policies.map((policy) => ({ root: policy.root, trackedRelativePaths: [] }))
  });
  const separateScope = library.createGitCurrentnessProofScope({
    policies,
    trustedGitCommonDir: gitCommonDir
  });
  const separateSparse = library.captureGitCurrentnessProofSnapshot({ scope: separateScope });
  const scratch = task3b2Scratch(t, "snapshot-mode-lineage");
  const eventRoots = [root, gitCommonDir]
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const rootsBuffer = Buffer.concat(eventRoots.flatMap((item) => [
    Buffer.from(item),
    Buffer.from([0])
  ]));
  const normalize = (sequence) => {
    const published = writeTypedFseventsV2Endpoint(scratch, {
      rootsBuffer,
      sequence,
      type: 2
    });
    const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
      published.acknowledgementPath,
      {
        expectedEventRootCount: published.eventRootCount,
        expectedEventRootFingerprint: published.eventRootFingerprint
      }
    );
    assert.notEqual(acknowledgement, null);
    return library.normalizeTypedFseventsAckCheckpoint({ acknowledgement, eventRoots });
  };
  const priorEndpoint = normalize(1n);
  const endpoint = normalize(2n);
  assert.throws(() => library.readAndValidateJournalExtension({
    candidateSnapshot: sparse,
    endpoint,
    eventRoots,
    priorCheckpoint: priorEndpoint.checkpoint,
    priorSnapshot: full,
    trustedGitCommonDir: gitCommonDir
  }), /capture mode|scope|snapshot policies|lineage/i);
  assert.throws(() => library.readAndValidateJournalExtension({
    candidateSnapshot: separateSparse,
    endpoint,
    eventRoots,
    priorCheckpoint: priorEndpoint.checkpoint,
    priorSnapshot: sparse,
    trustedGitCommonDir: gitCommonDir
  }), /capture mode|scope|snapshot policies|lineage/i);
});

test("Task 3B3C sparse source leaves accept ancestor directory events without widening metadata", async (t) => {
  const library = await import(libraryUrl);
  const { root } = makeStableProofTestRoot(t, "task3b3c-sparse-ancestor-event");
  const scratch = task3b2Scratch(t, "sparse-ancestor-event");
  execFileSync("git", ["init", root], { stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "scope@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Scope Fixture"], { cwd: root });
  const sourceDirectory = path.join(root, "selected-directory");
  const selectedSource = path.join(sourceDirectory, "dirty.txt");
  fs.mkdirSync(sourceDirectory);
  fs.writeFileSync(selectedSource, "baseline\n");
  execFileSync("git", ["add", "selected-directory/dirty.txt"], { cwd: root });
  execFileSync("git", ["commit", "-m", "sparse ancestor baseline"], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"]
  });
  fs.appendFileSync(selectedSource, "dirty baseline\n");
  const metadataPath = path.join(
    root,
    ...library.TRANSACTION_METADATA_PATHS[0].split("/")
  );
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, "metadata baseline\n");
  const gitCommonDir = fs.realpathSync(path.join(root, ".git"));
  const contractPolicies = [
    {
      root,
      exactMetadataPaths: [library.TRANSACTION_METADATA_PATHS[0]],
      exactMetadataRoots: []
    },
    { root: gitCommonDir, exactMetadataPaths: [], exactMetadataRoots: [] }
  ];
  const scope = library.createGitCurrentnessProofScope({
    policies: contractPolicies,
    trustedGitCommonDir: gitCommonDir
  });
  const eventRoots = [root, gitCommonDir]
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const rootsBuffer = Buffer.concat(eventRoots.flatMap((item) => [
    Buffer.from(item),
    Buffer.from([0])
  ]));
  const normalize = ({ entryCount = 0n, journal = Buffer.alloc(0), lastEventId = 0n, sequence }) => {
    const published = writeTypedFseventsV2Endpoint(scratch, {
      entryCount,
      journal,
      lastEventId,
      rootsBuffer,
      sequence,
      type: 2
    });
    const acknowledgement = library.readCommittedTypedFseventsAcknowledgement(
      published.acknowledgementPath,
      {
        expectedEventRootCount: published.eventRootCount,
        expectedEventRootFingerprint: published.eventRootFingerprint
      }
    );
    assert.notEqual(acknowledgement, null);
    return library.normalizeTypedFseventsAckCheckpoint({ acknowledgement, eventRoots });
  };

  const priorSourceSnapshot = library.captureGitCurrentnessProofSnapshot({ scope });
  const priorSourceEndpoint = normalize({ sequence: 1n });
  fs.appendFileSync(selectedSource, "changed after baseline\n");
  const candidateSourceSnapshot = library.captureGitCurrentnessProofSnapshot({ scope });
  const sourceJournal = typedFseventsJournalRecord({
    sequence: 1n,
    eventId: 701n,
    flags: 0x11400,
    path: sourceDirectory
  });
  const sourceEndpoint = normalize({
    entryCount: 1n,
    journal: sourceJournal,
    lastEventId: 701n,
    sequence: 2n
  });
  const sourceExtension = library.readAndValidateJournalExtension({
    candidateSnapshot: candidateSourceSnapshot,
    endpoint: sourceEndpoint,
    eventRoots,
    exactMetadataPaths: [metadataPath],
    priorCheckpoint: priorSourceEndpoint.checkpoint,
    priorSnapshot: priorSourceSnapshot,
    trustedGitCommonDir: gitCommonDir
  });
  assert.equal(sourceExtension.snapshotRelation, "source-material");
  assert.equal(sourceExtension.classification.sourceEventCount, 1n);

  const priorMetadataSnapshot = library.captureGitCurrentnessProofSnapshot({ scope });
  const priorMetadataEndpoint = normalize({
    entryCount: 1n,
    journal: sourceJournal,
    lastEventId: 701n,
    sequence: 3n
  });
  fs.appendFileSync(metadataPath, "metadata changed\n");
  const candidateMetadataSnapshot = library.captureGitCurrentnessProofSnapshot({ scope });
  const metadataAncestorJournal = Buffer.concat([
    sourceJournal,
    typedFseventsJournalRecord({
      sequence: 2n,
      eventId: 702n,
      flags: 0x11400,
      path: path.dirname(metadataPath)
    })
  ]);
  const metadataEndpoint = normalize({
    entryCount: 2n,
    journal: metadataAncestorJournal,
    lastEventId: 702n,
    sequence: 4n
  });
  assert.throws(() => library.readAndValidateJournalExtension({
    candidateSnapshot: candidateMetadataSnapshot,
    endpoint: metadataEndpoint,
    eventRoots,
    exactMetadataPaths: [metadataPath],
    priorCheckpoint: priorMetadataEndpoint.checkpoint,
    priorSnapshot: priorMetadataSnapshot,
    trustedGitCommonDir: gitCommonDir
  }), /metadata path delta is unmatched/i);
});

test("Task 3B3C production typed path uses the branded sparse scope and bypasses dynamic sentinel traversal", async () => {
  const library = await import(libraryUrl);
  const inspection = library.inspectMutationMonitorChildSource();
  assert.match(inspection.source, /createGitCurrentnessProofScope\(\{/u);
  assert.match(inspection.source, /captureGitCurrentnessProofSnapshot\(\{/u);
  assert.match(inspection.source, /typedFseventsProofScope/u);
  assert.match(inspection.source, /validateTypedRootAnchors/u);
  const captureCallback = inspection.source.match(
    /const captureTypedFseventsSnapshot = \(\) => \{[\s\S]*?\n\};/u
  );
  assert.notEqual(captureCallback, null, "the production capture callback must be inspectable");
  assert.match(
    captureCallback[0],
    /return captureGitCurrentnessProofSnapshot\(\{ scope: typedFseventsProofScope \}\);/u
  );
  assert.doesNotMatch(captureCallback[0], /captureStableProofSnapshot/u);
  assert.doesNotMatch(
    inspection.source,
    /if \(typedFseventsEnabled\) \{\s*sampleSentinels\(\{ recordEpochs: false \}\)/u
  );
});
