import assert from "node:assert/strict";
import { constants as bufferConstants } from "node:buffer";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

const here = path.dirname(new URL(import.meta.url).pathname);
const writer = path.join(here, "refresh-linked-worktree-archive-evidence.mjs");
const gate = path.join(here, "assert-linked-worktree-archive-evidence-current.mjs");
const libraryUrl = pathToFileURL(path.join(here, "evidence-archive-lib.mjs")).href;
const TEST_CHILD_TIMEOUT_MS = 15_000;
const TEST_REPOSITORY_ID = "a".repeat(64);
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

function run(script, fixture, extraEnv = {}) {
  return spawnSync(process.execPath, [script, "--json"], {
    cwd: fixture.repo,
    env: { ...process.env, MAIS_EVIDENCE_ROOT: fixture.evidenceRoot, ...extraEnv },
    encoding: "utf8",
    timeout: TEST_CHILD_TIMEOUT_MS
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
  const token = `sk-${"A".repeat(40)}`;
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
  assert.throws(() => scanBuffer(Buffer.from(`// leaked sk-${"R".repeat(40)}`), { displayPath: "comments.ts" }), /high-confidence token/i);
  assert.throws(() => scanBuffer(Buffer.from("// -----BEGIN PRIVATE KEY-----"), { displayPath: "comments.ts" }), /private-key header/i);
  assert.throws(() => scanBuffer(Buffer.from("const config = { password: ("), { displayPath: "broken.ts" }), /parse failed closed/i);
  assert.throws(() => scanBuffer(Buffer.from(`const config = { password: "${"S".repeat(40)}" };`), { displayPath: "dashboard-smoke.ts" }), /token assignment/i);
  assert.throws(() => scanBuffer(Buffer.from(`DASHBOARD_SMOKE_PASSWORD=${"U".repeat(40)}`), { displayPath: "dashboard.env.example" }), /token assignment/i);
  assert.throws(() => scanBuffer(Buffer.from("-----BEGIN PRIVATE KEY-----\nabc"), { displayPath: "note.txt" }), /private-key header/i);
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
    { name: "private key", value: "-----BEGIN PRIVATE KEY-----", expected: /private-key header/i },
    { name: "provider token", value: `sk-${"A".repeat(40)}`, expected: /high-confidence token/i }
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
    reviewedBinaryPaths: 0
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
      reviewedBinaryPaths: 0
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
    () => scanBuffer(Buffer.concat([buffer, Buffer.from(`\nleaked sk-${"R".repeat(40)}\n`)]), {
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
    reviewedBinaryPaths: 0
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
    "re_xxxxxxxxx-prod",
    "re_xxxxxxxx-",
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
    () => scanBuffer(Buffer.from(`sk-example-${"C".repeat(30)}`), { displayPath: "nearby-real.txt" }),
    /high-confidence token/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from("sk-placeholder-xxxxxxxx-"), { displayPath: "nearby-real.txt" }),
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
    { source: "RESEND_API_KEY=re_xxxxxxxxx node scripts/resend-local-smoke.mjs --to recipient@example.invalid --dry-run", displayPath: "README.md" },
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
    `Provider: \`OPENAI_API_KEY=sk-proj-${"C".repeat(40)}\`.`,
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
    `${tick.repeat(2)}OPENAI_API_KEY=sk-proj-${"Q".repeat(40)}${"\\".repeat(2)}${tick.repeat(2)}`
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
    `sk-${"C".repeat(40)}`,
    `ghp_${"D".repeat(36)}`,
    `AKIA${"E".repeat(16)}`,
    `AIza${"F".repeat(32)}`
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
    { source: `{"description":"sk-\\u0041${"A".repeat(23)}"}`, displayPath: "provider.json" }
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
      suffix: Buffer.from(`,"note":"sk-${"T".repeat(24)}"}`),
      expected: /large-tail\.json": high-confidence token$/i,
      redacted: `sk-${"T".repeat(24)}`
    },
    {
      suffix: Buffer.from(`,"note":"sk-\\u0054${"T".repeat(23)}"}`),
      expected: /large-tail\.json": high-confidence token$/i,
      redacted: `sk-${"T".repeat(24)}`
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
  const token = `sk-${"L".repeat(24)}`;
  const encodedToken = `sk-\\u004c${"L".repeat(23)}`;
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
  const token = `sk-${"P".repeat(40)}`;
  assert.throws(() => scanBuffer(Buffer.from(`+  password: "${token}"`), { displayPath: "tracked.patch", aggregatePatch: true }), (error) => {
    assert.match(error.message, /high-confidence token/i);
    assert.doesNotMatch(error.message, new RegExp(token));
    return true;
  });
  assert.throws(
    () => scanBuffer(Buffer.from("+ -----BEGIN PRIVATE KEY-----"), { displayPath: "branch.patch", aggregatePatch: true }),
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
    "+RESEND_API_KEY=re_xxxxxxxxxxxx npm run smoke"
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
    "-RESEND_API_KEY=re_xxxxxxxxxxxx npm run smoke",
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
      "-RESEND_API_KEY=re_xxxxxxxxx npm run smoke",
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
    () => scanBuffer(Buffer.from(`+const token = "sk-${"R".repeat(40)}";`), { displayPath: "auth-review.patch" }),
    /high-confidence token/i
  );
  assert.throws(
    () => scanBuffer(Buffer.from("+-----BEGIN PRIVATE KEY-----"), { displayPath: "auth-review.patch" }),
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

  const providerToken = `sk-${"P".repeat(20)}`;
  assert.throws(() => scanBuffer(Buffer.from([
    "diff --git a/config.txt b/config.txt",
    "@@ -0,0 +1 @@",
    `+${providerToken}`
  ].join("\n")), { displayPath: "binary-review.patch" }), /high-confidence token/i);
  assert.throws(() => scanBuffer(
    Buffer.from("diff --git a/config.txt b/config.txt\n+-----BEGIN PRIVATE KEY-----"),
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
    `sk-${"R".repeat(40)}`,
    "-----BEGIN PRIVATE KEY-----"
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
    Buffer.from(`sk-${"A".repeat(10)}\n${"A".repeat(20)}`),
    { displayPath: "branch.patch", aggregatePatch: true }
  ));
  assert.doesNotThrow(() => scanBuffer(
    Buffer.from(`sk-placeholder-${"x".repeat(24)}`),
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
  const token = `sk-${"B".repeat(20)}`;
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
  const token = `sk-${"C".repeat(20)}`;
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
  const token = `sk-${"D".repeat(20)}`;
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
    [diffHeader, "GIT binary patch", "literal 20", "-----BEGIN PRIVATE KEY-----"],
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
  const token = `sk-${"E".repeat(20)}`;
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
      `function inner() { localStorage.setItem("provider", "sk-${"A".repeat(40)}"); }`,
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

test("writer v2 externalizes exact NUL-safe evidence, captures index and worktree edits, and reuses a stable set", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  dirtyFixture(fixture);
  const first = run(writer, fixture);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const manifestPath = path.join(fixture.repo, "coordination", "release-intake", "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 2);
  assert.match(manifest.evidenceRootId, /^[0-9a-f-]{36}$/i);
  assert.match(manifest.archiveSetFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(manifest.archivedWorktrees.length, 1);
  const entry = manifest.archivedWorktrees[0];
  assert.equal(entry.schemaVersion, 2);
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

test("gate report and terminal attestation schemas reject missing and extra fields", async () => {
  const { assertEvidenceGateReport, assertMutationTerminalAttestation } = await import(libraryUrl);
  const attestation = {
    schemaVersion: 1,
    sessionId: crypto.randomUUID(),
    sourceEpoch: 7,
    metadataEpoch: 3,
    watchMode: "descriptor-sentinel",
    coverageFingerprint: "d".repeat(64),
    coveragePathCount: 12,
    fdCount: 4,
    rootFdCount: 4,
    status: "stopped"
  };
  assert.doesNotThrow(() => assertMutationTerminalAttestation(attestation, {
    sessionId: attestation.sessionId,
    sourceEpoch: 7,
    metadataEpoch: 3
  }));
  for (const invalid of [
    { ...attestation, extra: true },
    Object.fromEntries(Object.entries(attestation).filter(([key]) => key !== "sourceEpoch"))
  ]) {
    assert.throws(
      () => assertMutationTerminalAttestation(invalid, {
        sessionId: attestation.sessionId,
        sourceEpoch: 7,
        metadataEpoch: 3
      }),
      /attestation|fields|epoch/i
    );
  }
  const report = {
    checkedAt: new Date().toISOString(),
    schemaVersion: 2,
    archiveSetFingerprint: "b".repeat(64),
    dirtyMapStatusSignature: "signature",
    expandedStatusEntries: 1,
    openLinkedDecisions: 1,
    failures: [],
    branches: [{ branch: "feature/archive", head: "c".repeat(40) }],
    terminalProtocol: {
      attestationFile: "reports/gate-monitor-attestation-slot-a.json",
      expectedMetadataEpoch: 3,
      expectedSourceEpoch: 7,
      monitorSessionId: attestation.sessionId,
      schemaVersion: 1
    }
  };
  assert.doesNotThrow(() => assertEvidenceGateReport(report));
  for (const invalid of [
    { ...report, extra: true },
    { ...report, terminalProtocol: { ...report.terminalProtocol, extra: true } },
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
  const originalTar = fs.readFileSync(tarPath);
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
  fs.copyFileSync(maliciousTar, tarPath);
  const mismatchedTar = run(gate, fixture);
  assert.notEqual(mismatchedTar.status, 0);
  assert.match(`${mismatchedTar.stdout}\n${mismatchedTar.stderr}`, /tar.*(?:bytes|sha256)|(?:bytes|sha256).*tar/i);
  assert.equal(fs.existsSync(path.join(os.tmpdir(), escapeName)), false);
  const maliciousBuffer = fs.readFileSync(maliciousTar);
  const unsafeFailures = [];
  verifyTarInventory(fixture.evidenceRoot, {
    ...manifest.archivedWorktrees[0],
    artifacts: {
      ...manifest.archivedWorktrees[0].artifacts,
      untrackedTar: { ...tarArtifact, bytes: maliciousBuffer.length, sha256: sha256Buffer(maliciousBuffer) }
    }
  }, unsafeFailures);
  assert.ok(unsafeFailures.some((failure) => /unsafe tar inventory/i.test(failure)));
  assert.equal(fs.existsSync(path.join(os.tmpdir(), escapeName)), false);
  fs.writeFileSync(tarPath, originalTar);
  fs.chmodSync(tarPath, 0o600);
  const restoredTar = run(gate, fixture);
  assert.equal(restoredTar.status, 0, restoredTar.stderr || restoredTar.stdout);
  const patchPath = path.join(fixture.evidenceRoot, manifest.archivedWorktrees[0].artifacts.trackedPatch.path);
  fs.appendFileSync(patchPath, "tamper");
  const tampered = run(gate, fixture);
  assert.notEqual(tampered.status, 0);
  assert.match(`${tampered.stdout}\n${tampered.stderr}`, /sha256|bytes|tamper/i);
});

test("writer blocks secret content with redacted output and accepts placeholders", (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.parent, { recursive: true, force: true }));
  const token = `ghp_${"Z".repeat(36)}`;
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
  const token = `sk-${"D".repeat(42)}`;
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

test("flock owner proof is portable and contains no Darwin struct ABI", () => {
  const source = fs.readFileSync(path.join(here, "evidence-archive-lib.mjs"), "utf8");
  assert.doesNotMatch(source, /F_GETLK|struct\.pack|qqihh/u);
  assert.match(source, /fcntl\.flock\(fd,fcntl\.LOCK_EX\|fcntl\.LOCK_NB\)/u);
  assert.match(source, /stdio: \["ignore", "pipe", "pipe", descriptor\]/u);
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
    registerMutationMetadataRoot,
    settleMutationEpochState,
    startMutationEpochMonitor,
    stopMutationEpochMonitor
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
    transactionMetadata: {
      root: fixture.linked,
      exactRelativePaths: ["coordination/release-intake/archive/exact-manifest.json"]
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
    const transactionRoot = path.join(fixture.linked, ...transactionRelativePath.split("/"));
    fs.mkdirSync(transactionRoot);
    fs.writeFileSync(path.join(transactionRoot, "journal.json"), "registered metadata\n");
    const registeredState = settleMutationEpochState(monitor);
    assert.equal(registeredState.sourceEpoch, baseline.sourceEpoch);
    assert.ok(registeredState.metadataEpoch > baseline.metadataEpoch);
    const sibling = `${transactionRoot}-not-a-canonical-uuid`;
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "source.txt"), "must be source\n");
    terminalState = settleMutationEpochState(monitor);
    assert.ok(terminalState.sourceEpoch > registeredState.sourceEpoch);
    assert.equal(terminalState.metadataEpoch, registeredState.metadataEpoch);
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
