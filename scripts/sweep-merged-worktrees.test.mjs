import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync, closeSync, constants as fsConstants, existsSync, fsyncSync, linkSync, lstatSync, mkdtempSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, statSync,
  truncateSync,
  writeFileSync, writeSync, rmSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseWorktreeList, parseContainingRefs, scanProtectedIgnored, decide, REBUILDABLE,
} from "./sweep-merged-worktrees.mjs";
import * as sweep from "./sweep-merged-worktrees.mjs";

const CONTAMINATED_GIT_ENV_KEYS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
];

function withGitEnvironment(values, action) {
  const before = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) process.env[key] = value;
    return action();
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function snapshotIndex(path) {
  return {
    bytes: readFileSync(path),
    mtimeNs: statSync(path, { bigint: true }).mtimeNs,
  };
}

function assertIndexUnchanged(path, before) {
  const after = snapshotIndex(path);
  assert.deepEqual(after.bytes, before.bytes);
  assert.equal(after.mtimeNs, before.mtimeNs);
}

function realLinkedWorktreeFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "sweep-real-binding-"));
  const repository = join(fixtureRoot, "expected-common-repo");
  const target = join(fixtureRoot, "actual target-中文-'quote'-\nline");
  const wrongRepository = join(fixtureRoot, "contaminating-repo");
  mkdirSync(repository);
  mkdirSync(wrongRepository);
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: repository, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "sweep-test@example.invalid"], { cwd: repository });
  execFileSync("git", ["config", "user.name", "Sweep Test"], { cwd: repository });
  writeFileSync(join(repository, ".gitignore"), "ignored-credentials.json\n");
  writeFileSync(join(repository, "tracked.txt"), "tracked\n");
  execFileSync("git", ["add", ".gitignore", "tracked.txt"], { cwd: repository });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: repository });
  execFileSync("git", ["worktree", "add", "-q", "-b", "feature/actual", target], {
    cwd: repository,
  });

  execFileSync("git", ["init", "-q", "-b", "wrong"], { cwd: wrongRepository, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "sweep-test@example.invalid"], { cwd: wrongRepository });
  execFileSync("git", ["config", "user.name", "Sweep Test"], { cwd: wrongRepository });
  writeFileSync(join(wrongRepository, "wrong.txt"), "wrong\n");
  execFileSync("git", ["add", "wrong.txt"], { cwd: wrongRepository });
  execFileSync("git", ["commit", "-q", "-m", "wrong fixture"], { cwd: wrongRepository });

  const targetGitDir = execFileSync(
    "git",
    ["-C", target, "rev-parse", "--absolute-git-dir"],
    { encoding: "utf8" },
  ).trim();
  const targetIndex = join(targetGitDir, "index");
  const wrongGitDir = join(wrongRepository, ".git");
  const wrongIndex = join(wrongGitDir, "index");
  const contamination = {
    GIT_DIR: wrongGitDir,
    GIT_WORK_TREE: wrongRepository,
    GIT_COMMON_DIR: wrongGitDir,
    GIT_INDEX_FILE: wrongIndex,
    GIT_OBJECT_DIRECTORY: join(wrongGitDir, "objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: join(wrongGitDir, "objects"),
  };
  return {
    fixtureRoot,
    repository,
    target,
    targetGitDir,
    targetIndex,
    wrongGitDir,
    wrongIndex,
    contamination,
  };
}

test("parseWorktreeList reads branches, detached heads and bare repos", () => {
  const wts = parseWorktreeList(
    [
      "worktree /repo", "HEAD aaa", "branch refs/heads/main", "",
      "worktree /repo/.worktrees/x", "HEAD bbb", "branch refs/heads/feature/x", "locked owner hold", "",
      "worktree /repo/.worktrees/d", "HEAD ccc", "detached", "prunable stale gitdir", "",
      "worktree /bare", "bare", "",
    ].join("\n"),
  );
  assert.equal(wts.length, 4);
  assert.equal(wts[0].branch, "main");
  assert.equal(wts[1].branch, "feature/x");
  assert.equal(wts[1].locked, true);
  assert.equal(wts[1].lockReason, "owner hold");
  assert.equal(wts[2].detached, true);
  assert.equal(wts[2].branch, null);
  assert.equal(wts[2].prunable, true);
  assert.equal(wts[2].prunableReason, "stale gitdir");
  assert.equal(wts[3].bare, true);
});

test("parseWorktreeList consumes porcelain -z without splitting special-character paths", () => {
  const specialPath = "/repo/worktrees/space 中文 'quote'\nsecond-line";
  const records = [
    `worktree /repo`, `HEAD ${LIVE_MAIN_SHA}`, "branch refs/heads/main", "",
    `worktree ${specialPath}`, `HEAD ${TARGET_HEAD_SHA}`, "branch refs/heads/feature/special", "locked owner\nreason", "",
  ].join("\0");
  const worktrees = parseWorktreeList(records);
  assert.equal(worktrees.length, 2);
  assert.equal(worktrees[1].path, specialPath);
  assert.equal(worktrees[1].branch, "feature/special");
  assert.equal(worktrees[1].locked, true);
  assert.equal(worktrees[1].lockReason, "owner\nreason");
});

// Regression: `git branch --contains` marks a branch checked out in ANOTHER
// worktree with `+`, not `*`. Stripping only `*` makes every branch contain
// itself, which reports unique work as safe to delete.
test("parseContainingRefs strips the + marker and excludes the branch itself", () => {
  const stdout = ["+ feature/x", "  other/branch", "  remotes/origin/feature/x"].join("\n");
  assert.deepEqual(parseContainingRefs(stdout, "feature/x"), ["other/branch"]);
});

test("parseContainingRefs strips the * marker for the current branch", () => {
  assert.deepEqual(parseContainingRefs("* feature/x\n  keeper\n", "feature/x"), ["keeper"]);
});

test("parseContainingRefs returns empty when only the branch itself contains it", () => {
  assert.deepEqual(parseContainingRefs("+ feature/x\n  remotes/origin/feature/x\n", "feature/x"), []);
});

test("scanProtectedIgnored finds env files and sqlite databases", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-"));
  try {
    mkdirSync(join(dir, ".local"), { recursive: true });
    writeFileSync(join(dir, ".env.local"), "SECRET=1");
    writeFileSync(join(dir, ".local", "hk-math-db.sqlite"), "x");
    const hits = scanProtectedIgnored(dir);
    const labels = hits.map((h) => h.label).sort();
    assert.deepEqual(labels, ["env file", "local database"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored metadata-flags ignored secret-like files without reading them", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-"));
  try {
    writeFileSync(join(dir, "provider-credentials.json"), "do-not-read");
    const hits = scanProtectedIgnored(dir);
    assert.deepEqual(hits.map((hit) => ({ name: hit.path.split("/").at(-1), label: hit.label })), [
      { name: "provider-credentials.json", label: "secret-like file" },
    ]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored ignores .env.example and does not descend into rebuildable dirs", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-"));
  try {
    writeFileSync(join(dir, ".env.example"), "SECRET=");
    mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "pkg", "cache.sqlite"), "x");
    assert.deepEqual(scanProtectedIgnored(dir), []);
    assert.ok(REBUILDABLE.has("node_modules"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored treats ignored .tmp content as local evidence, not rebuildable cache", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-"));
  try {
    mkdirSync(join(dir, ".tmp"), { recursive: true });
    writeFileSync(join(dir, ".tmp", "review-receipt.json"), "{}");
    const hits = scanProtectedIgnored(dir);
    assert.equal(REBUILDABLE.has(".tmp"), false);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].label, "local evidence directory");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored protects symlink files and directories without following them", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-symlink-protected-"));
  try {
    const targetDir = join(dir, "target-dir");
    mkdirSync(targetDir);
    writeFileSync(join(targetDir, "nested.txt"), "fixture");
    writeFileSync(join(dir, "target-file.txt"), "fixture");
    const symlinkFile = join(dir, "linked-file");
    const symlinkDir = join(dir, "linked-dir");
    symlinkSync(join(dir, "target-file.txt"), symlinkFile);
    symlinkSync(targetDir, symlinkDir, "dir");

    const hits = scanProtectedIgnored(dir);
    assert.deepEqual(
      hits.map((hit) => ({ path: hit.path, label: hit.label })).sort((a, b) => a.path.localeCompare(b.path)),
      [
        { path: symlinkDir, label: "symlink" },
        { path: symlinkFile, label: "symlink" },
      ],
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored protects unknown directory entry types without stat or follow", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-unknown-node-"));
  try {
    const unknownPath = join(dir, "unknown-node");
    const hits = scanProtectedIgnored(dir, {
      scanTree(path) {
        assert.equal(path, dir);
        return [{ path: unknownPath, label: "unknown node type", size: 0 }];
      },
    });
    assert.deepEqual(hits, [{ path: unknownPath, label: "unknown node type", size: 0 }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanProtectedIgnored rejects a replacement before descriptor-bound traversal", () => {
  const root = mkdtempSync(join(tmpdir(), "sweep-stale-dirent-"));
  const worktree = join(root, "worktree");
  const originalWorktree = join(root, "original-worktree");
  const outside = join(root, "outside");
  mkdirSync(worktree, { recursive: true });
  writeFileSync(join(worktree, ".env.local"), "DO_NOT_READ=1");
  mkdirSync(join(outside, ".tmp"), { recursive: true });
  writeFileSync(join(outside, ".tmp", "outside-evidence.json"), "{}");
  let swapped = false;
  try {
    const hits = scanProtectedIgnored(worktree, {
      scanTree(path, identity) {
        if (!swapped) {
          renameSync(worktree, originalWorktree);
          symlinkSync(outside, worktree, "dir");
          swapped = true;
        }
        return sweep.readProtectedTreeByDescriptor(path, identity);
      },
    });

    assert.equal(swapped, true);
    assert.deepEqual(hits, [{ path: worktree, label: "directory boundary unavailable", size: 0 }]);
    assert.equal(hits.some((hit) => hit.path.includes("outside-evidence.json")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("protected walker enumerates only the cwd-bound directory instance", () => {
  const source = readFileSync(join(process.cwd(), "scripts/sweep-merged-worktrees.mjs"), "utf8");
  const walkerStart = source.indexOf("const PROTECTED_WALK_DESCRIPTOR_CHILD_SOURCE");
  const walkerEnd = source.indexOf("/** Ignored-but-precious content", walkerStart);
  const walkerSource = source.slice(walkerStart, walkerEnd);
  const scanStart = source.indexOf("export function scanProtectedIgnored");
  const scanEnd = source.indexOf("/** Pure policy decision", scanStart);
  const scanSource = source.slice(scanStart, scanEnd);

  assert.match(walkerSource, /root_fd = os\.open\("\."[,] flags\)/);
  assert.match(walkerSource, /os\.scandir\(directory_fd\)/);
  assert.match(walkerSource, /entry\.stat\(follow_symlinks=False\)/);
  assert.match(walkerSource, /os\.open\(name[,] flags[,] dir_fd=directory_fd\)/);
  assert.match(walkerSource, /opened = os\.fstat\(child_fd\)/);
  assert.match(scanSource, /scanTree\(dir[,] nodeIdentity\(rootMetadata\)\)/);
  assert.doesNotMatch(scanSource, /readdir(?:Sync)?\(/);
});

test("descriptor-relative enumeration survives an ABA pathname replacement", () => {
  const root = mkdtempSync(join(tmpdir(), "sweep-descriptor-aba-"));
  const worktree = join(root, "worktree");
  mkdirSync(join(worktree, "child"), { recursive: true });
  mkdirSync(join(worktree, "replacement"), { recursive: true });
  writeFileSync(join(worktree, "child", ".env.local"), "DO_NOT_READ=1");
  try {
    const script = String.raw`
import json, os
flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
root_fd = os.open(".", flags)
child_fd = os.open("child", flags, dir_fd=root_fd)
try:
    before = os.fstat(child_fd)
    os.rename("child", "original-child", src_dir_fd=root_fd, dst_dir_fd=root_fd)
    os.rename("replacement", "child", src_dir_fd=root_fd, dst_dir_fd=root_fd)
    entries = sorted(entry.name for entry in os.scandir(child_fd))
    after = os.fstat(child_fd)
    os.rename("child", "replacement", src_dir_fd=root_fd, dst_dir_fd=root_fd)
    os.rename("original-child", "child", src_dir_fd=root_fd, dst_dir_fd=root_fd)
    print(json.dumps({"same": (before.st_dev, before.st_ino) == (after.st_dev, after.st_ino), "entries": entries}))
finally:
    os.close(child_fd)
    os.close(root_fd)
`;
    const result = spawnSync("/usr/bin/python3", ["-I", "-c", script], {
      cwd: worktree,
      encoding: "utf8",
      env: {},
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.deepEqual(JSON.parse(result.stdout), { same: true, entries: [".env.local"] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("production ignored-content scan finds deeply nested .tmp evidence without following symlink cycles", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-deep-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "ignore" });
    writeFileSync(join(dir, ".gitignore"), "**/.tmp/\n");
    const deep = join(dir, "a", "b", "c", "d", "e", "f", "g", "h");
    mkdirSync(join(deep, ".tmp"), { recursive: true });
    writeFileSync(join(deep, ".tmp", "review-receipt.json"), "{}");
    symlinkSync(dir, join(deep, "cycle"), "dir");

    const scanned = scanProtectedIgnored(dir);
    assert.equal(scanned.length, 2);
    assert.ok(scanned.some((hit) => hit.label === "symlink" && hit.path === join(deep, "cycle")));
    assert.ok(scanned.some((hit) => hit.label === "local evidence directory"));
    assert.equal(scanned[0].label, "local evidence directory");
    const retained = sweep.retainGitIgnored(dir, scanned);
    assert.equal(retained.length, 2);
    assert.ok(retained.some((hit) => hit.path === join(deep, ".tmp")));
    assert.ok(retained.some((hit) => hit.path === join(deep, "cycle")));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("retainGitIgnored preserves ignored evidence paths containing newlines", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-nul-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "ignore" });
    writeFileSync(join(dir, ".gitignore"), "*credentials*\n");
    const evidenceName = "provider-credentials\ncopy.json";
    writeFileSync(join(dir, evidenceName), "do-not-read");
    const scanned = scanProtectedIgnored(dir);
    assert.equal(scanned.length, 1);
    const retained = sweep.retainGitIgnored(dir, scanned);
    assert.equal(retained.length, 1);
    assert.equal(retained[0].path, join(dir, evidenceName));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("bound worktree status ignores ambient core.worktree and counts NUL records", () => {
  const root = mkdtempSync(join(tmpdir(), "sweep-bound-status-"));
  const worktree = join(root, "actual space-中文-'quote'-\nline");
  const wrongWorktree = join(root, "wrong space-中文-'quote'-\nline");
  try {
    mkdirSync(worktree);
    mkdirSync(wrongWorktree);
    execFileSync("git", ["init", "-q"], { cwd: worktree, stdio: "ignore" });
    execFileSync("git", ["config", "core.worktree", wrongWorktree], {
      cwd: worktree,
      stdio: "ignore",
    });
    writeFileSync(join(worktree, "ordinary.txt"), "actual\n");
    writeFileSync(join(worktree, "line\nbreak.txt"), "actual newline path\n");
    writeFileSync(join(wrongWorktree, "wrong-only.txt"), "wrong\n");

    assert.deepEqual(sweep.readBoundWorktreeStatusEvidence(worktree), {
      available: true,
      dirty: 2,
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("bound worktree status uses exact Git arguments and counts a rename as one entry", () => {
  const calls = [];
  const evidence = sweep.readBoundWorktreeStatusEvidence("/repo/wt", {
    realpath: (path) => path,
    gitDir: "/repo/.git/worktrees/wt",
    expectedCommonGitDir: "/repo/.git",
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd ?? null });
      if (args.includes("-C")) return "/repo/.git/worktrees/wt\n";
      if (args.includes("--show-toplevel")) return "/repo/wt\n";
      if (args.includes("--git-common-dir")) return "/repo/.git\n";
      if (args.includes("--absolute-git-dir")) return "/repo/.git/worktrees/wt\n";
      return "R  renamed.txt\0original.txt\0?? line\nbreak.txt\0";
    },
  });

  assert.deepEqual(evidence, { available: true, dirty: 2 });
  assert.deepEqual(calls, [
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--show-toplevel",
      ],
      cwd: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
      ],
      cwd: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--absolute-git-dir",
      ],
      cwd: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
      ],
      cwd: null,
    },
  ]);
});

test("target-bound Git rejects mismatched top-level, common-dir, or registered gitdir evidence", () => {
  const mismatches = [
    { topLevel: "/repo/wrong", commonGitDir: "/repo/.git", gitDir: "/repo/.git/worktrees/wt" },
    { topLevel: "/repo/wt", commonGitDir: "/wrong/.git", gitDir: "/repo/.git/worktrees/wt" },
    { topLevel: "/repo/wt", commonGitDir: "/repo/.git", gitDir: "/repo/.git/worktrees/other" },
    {
      registeredGitDir: "/wrong/.git/worktrees/wt",
      topLevel: "/repo/wt",
      commonGitDir: "/wrong/.git",
      gitDir: "/wrong/.git/worktrees/wt",
    },
  ];
  for (const binding of mismatches) {
    const calls = [];
    const result = sweep.readBoundWorktreeStatusEvidence("/repo/wt", {
      realpath: (path) => path,
      gitDir: "/repo/.git/worktrees/wt",
      expectedCommonGitDir: "/repo/.git",
      execFile(_file, args) {
        calls.push(args);
        if (args.includes("-C")) return `${binding.registeredGitDir ?? "/repo/.git/worktrees/wt"}\n`;
        if (args.includes("--show-toplevel")) return `${binding.topLevel}\n`;
        if (args.includes("--git-common-dir")) return `${binding.commonGitDir}\n`;
        if (args.includes("--absolute-git-dir")) return `${binding.gitDir}\n`;
        return "?? must-not-run.txt\0";
      },
    });
    assert.deepEqual(result, { available: false, dirty: null });
    assert.equal(calls.some((args) => args.includes("status")), false);
  }
});

test("target-bound Git centralizes sanitized no-lock invocation", () => {
  const calls = [];
  const contamination = Object.fromEntries(
    CONTAMINATED_GIT_ENV_KEYS.map((key) => [key, `/contaminated/${key}`]),
  );
  const evidence = withGitEnvironment(contamination, () => (
    sweep.readBoundWorktreeStatusEvidence("/repo/wt", {
      realpath: (path) => path,
      gitDir: "/repo/.git/worktrees/wt",
      expectedCommonGitDir: "/repo/.git",
      execFile(file, args, options) {
        calls.push({ file, args, env: options.env });
        if (args.includes("-C")) return "/repo/.git/worktrees/wt\n";
        if (args.includes("--show-toplevel")) return "/repo/wt\n";
        if (args.includes("--git-common-dir")) return "/repo/.git\n";
        if (args.includes("--absolute-git-dir")) return "/repo/.git/worktrees/wt\n";
        return "?? dirty.txt\0";
      },
    })
  ));

  assert.deepEqual(evidence, { available: true, dirty: 1 });
  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.equal(call.file, sweep.TRUSTED_GIT_EXECUTABLE);
    assert.equal(call.args[0], "--no-optional-locks");
    assert.equal(call.env.GIT_OPTIONAL_LOCKS, "0");
    for (const key of CONTAMINATED_GIT_ENV_KEYS) assert.equal(call.env[key], undefined);
  }
});

test("real bound status reads the dirty physical target despite a wrong repo and index environment", () => {
  const fixture = realLinkedWorktreeFixture();
  try {
    writeFileSync(join(fixture.target, "dirty actual-\n中文.txt"), "dirty\n");
    const targetIndexBefore = snapshotIndex(fixture.targetIndex);
    const wrongIndexBefore = snapshotIndex(fixture.wrongIndex);
    const evidence = withGitEnvironment(
      fixture.contamination,
      () => sweep.readBoundWorktreeStatusEvidence(fixture.target),
    );

    assert.deepEqual(evidence, { available: true, dirty: 1 });
    assertIndexUnchanged(fixture.targetIndex, targetIndexBefore);
    assertIndexUnchanged(fixture.wrongIndex, wrongIndexBefore);
  } finally {
    rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("retainGitIgnored binds check-ignore to the exact gitdir and worktree", () => {
  const calls = [];
  const hits = [{ path: "/repo/wt/provider-credentials\ncopy.json", label: "secret-like file", size: 1 }];
  const retained = sweep.retainGitIgnored("/repo/wt", hits, {
    realpath: (path) => path,
    gitDir: "/repo/.git/worktrees/wt",
    expectedCommonGitDir: "/repo/.git",
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd ?? null, input: options.input ?? null });
      if (args.includes("-C")) return "/repo/.git/worktrees/wt\n";
      if (args.includes("--show-toplevel")) return "/repo/wt\n";
      if (args.includes("--git-common-dir")) return "/repo/.git\n";
      if (args.includes("--absolute-git-dir")) return "/repo/.git/worktrees/wt\n";
      return "provider-credentials\ncopy.json\0";
    },
  });

  assert.deepEqual(retained, hits);
  assert.deepEqual(calls, [
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--show-toplevel",
      ],
      cwd: null,
      input: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
      ],
      cwd: null,
      input: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "rev-parse",
        "--path-format=absolute",
        "--absolute-git-dir",
      ],
      cwd: null,
      input: null,
    },
    {
      file: sweep.TRUSTED_GIT_EXECUTABLE,
      args: [
        "--no-optional-locks",
        "--git-dir=/repo/.git/worktrees/wt",
        "--work-tree=/repo/wt",
        "-c",
        "core.worktree=/repo/wt",
        "check-ignore",
        "-z",
        "--stdin",
      ],
      cwd: null,
      input: "provider-credentials\ncopy.json\0",
    },
  ]);
});

test("real bound check-ignore rejects a contaminated wrong repo/index without refreshing either index", () => {
  const fixture = realLinkedWorktreeFixture();
  try {
    const ignored = join(fixture.target, "ignored-credentials.json");
    const visible = join(fixture.target, "visible-credentials.json");
    writeFileSync(ignored, "ignored\n");
    writeFileSync(visible, "visible\n");
    const hits = [
      { path: ignored, label: "secret-like file", size: 8 },
      { path: visible, label: "secret-like file", size: 8 },
    ];
    const targetIndexBefore = snapshotIndex(fixture.targetIndex);
    const wrongIndexBefore = snapshotIndex(fixture.wrongIndex);
    const retained = withGitEnvironment(
      fixture.contamination,
      () => sweep.retainGitIgnored(fixture.target, hits),
    );

    assert.deepEqual(retained, [hits[0]]);
    assertIndexUnchanged(fixture.targetIndex, targetIndexBefore);
    assertIndexUnchanged(fixture.wrongIndex, wrongIndexBefore);
  } finally {
    rmSync(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("readPathAbsenceEvidence treats a dangling symlink entry as present", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-lstat-"));
  try {
    const link = join(dir, "dangling-target");
    symlinkSync(join(dir, "missing-target"), link);
    assert.deepEqual(sweep.readPathAbsenceEvidence(link), { available: true, absent: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readPathAbsenceEvidence distinguishes absence from unavailable lstat evidence", () => {
  for (const code of ["ENOENT", "ENOTDIR"]) {
    const error = Object.assign(new Error(code), { code });
    assert.deepEqual(
      sweep.readPathAbsenceEvidence("/fixture/missing", { lstat: () => { throw error; } }),
      { available: true, absent: true },
    );
  }
  const denied = Object.assign(new Error("denied"), { code: "EACCES" });
  assert.deepEqual(
    sweep.readPathAbsenceEvidence("/fixture/unknown", { lstat: () => { throw denied; } }),
    { available: false, absent: null },
  );
});

test("external path evidence rejects symlink and non-directory manifest parents", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-external-boundary-")));
  try {
    const realParent = join(root, "real-parent");
    const symlinkParent = join(root, "symlink-parent");
    mkdirSync(realParent);
    symlinkSync(realParent, symlinkParent, "dir");
    const symlinkManifest = join(symlinkParent, "manifest.json");
    assert.equal(sweep.readExternalPathEvidence(symlinkManifest, { kind: "manifest" }).available, false);
    assert.match(
      sweep.readExternalPathEvidence(symlinkManifest, { kind: "manifest" }).reason,
      /symlink/u,
    );

    const nonDirectory = join(root, "not-a-directory");
    writeFileSync(nonDirectory, "fixture");
    const nonDirectoryManifest = join(nonDirectory, "manifest.json");
    const evidence = sweep.readExternalPathEvidence(nonDirectoryManifest, { kind: "manifest" });
    assert.equal(evidence.available, false);
    assert.match(evidence.reason, /directory/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("external path evidence rejects an unavailable manifest boundary", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-external-unavailable-")));
  try {
    const parent = join(root, "parent");
    mkdirSync(parent);
    const manifest = join(parent, "manifest.json");
    const denied = Object.assign(new Error("fixture boundary unavailable"), { code: "EACCES" });
    const evidence = sweep.readExternalPathEvidence(manifest, {
      kind: "manifest",
      lstat(path) {
        if (path === parent) throw denied;
        return statSync(path, { bigint: false });
      },
    });
    assert.equal(evidence.available, false);
    assert.match(evidence.reason, /unavailable/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("external receipt evidence accepts only an absent leaf behind a verified boundary", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-boundary-")));
  try {
    const receipt = join(root, "receipt.json");
    const absent = sweep.readExternalPathEvidence(receipt, { kind: "receipt" });
    assert.equal(absent.available, true);
    assert.equal(absent.absent, true);
    assert.deepEqual(Object.keys(absent), ["available", "absent", "reason", "parentIdentity"]);
    assert.equal(typeof absent.parentIdentity.dev, "string");
    assert.equal(typeof absent.parentIdentity.ino, "string");
    symlinkSync(join(root, "missing-receipt"), receipt);
    const present = sweep.readExternalPathEvidence(receipt, { kind: "receipt" });
    assert.equal(present.available, true);
    assert.equal(present.absent, false);
    assert.equal(present.reason, null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("external receipt evidence rejects a symlink parent specifically", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-symlink-parent-")));
  try {
    const realParent = join(root, "real-parent");
    const symlinkParent = join(root, "symlink-parent");
    mkdirSync(realParent);
    symlinkSync(realParent, symlinkParent, "dir");
    const evidence = sweep.readExternalPathEvidence(join(symlinkParent, "receipt.json"), { kind: "receipt" });
    assert.equal(evidence.available, false);
    assert.match(evidence.reason, /symlink/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("production provider exposes fail-closed external boundary evidence", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-provider-boundary-")));
  try {
    const parent = join(root, "real-parent");
    mkdirSync(parent);
    const link = join(root, "linked-parent");
    symlinkSync(parent, link, "dir");
    const providers = sweep.createRuntimeProviders();
    const evidence = providers.readExternalPathEvidence(join(link, "manifest.json"), "manifest");
    assert.equal(evidence.available, false);
    assert.match(evidence.reason, /symlink/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("manifest provider rejects a leaf replacement after boundary admission", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-manifest-leaf-race-")));
  try {
    const parent = join(root, "parent");
    const manifest = join(parent, "manifest.json");
    mkdirSync(parent);
    writeFileSync(manifest, "original-manifest");
    const providers = sweep.createRuntimeProviders();
    let oldAbsoluteRead = null;
    assert.throws(
      () => providers.readImmutableManifest(manifest, {
        afterBoundary() {
          renameSync(manifest, join(parent, "original-manifest.json"));
          writeFileSync(manifest, "replacement-manifest");
          oldAbsoluteRead = readFileSync(manifest, "utf8");
        },
      }),
      /identity|binding/u,
    );
    assert.equal(oldAbsoluteRead, "replacement-manifest");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("manifest provider rejects a parent symlink replacement after boundary admission", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-manifest-parent-race-")));
  try {
    const parent = join(root, "parent");
    const replacementParent = join(root, "replacement-parent");
    const manifest = join(parent, "manifest.json");
    const replacementManifest = join(replacementParent, "manifest.json");
    mkdirSync(parent);
    mkdirSync(replacementParent);
    writeFileSync(manifest, "original-manifest");
    writeFileSync(replacementManifest, "replacement-manifest");
    const providers = sweep.createRuntimeProviders();
    let oldAbsoluteRead = null;
    assert.throws(
      () => providers.readImmutableManifest(manifest, {
        afterBoundary() {
          rmSync(parent, { recursive: true, force: true });
          symlinkSync(replacementParent, parent, "dir");
          oldAbsoluteRead = readFileSync(manifest, "utf8");
        },
      }),
      /identity|binding|regular/u,
    );
    assert.equal(oldAbsoluteRead, "replacement-manifest");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("receipt reservation fails closed when its admitted parent is replaced by a symlink", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-parent-race-")));
  try {
    const parent = join(root, "parent");
    const replacementParent = join(root, "replacement-parent");
    const receipt = join(parent, "receipt.json");
    const replacementReceipt = join(replacementParent, "receipt.json");
    mkdirSync(parent);
    mkdirSync(replacementParent);
    const providers = sweep.createRuntimeProviders();
    let oldAbsoluteCreate = null;
    assert.throws(
      () => providers.reserveReceipt(receipt, {
        afterBoundary() {
          rmSync(parent, { recursive: true, force: true });
          symlinkSync(replacementParent, parent, "dir");
          const fd = openSync(receipt, 1 | 512 | 2048 | 256, 0o600);
          closeSync(fd);
          oldAbsoluteCreate = statSync(replacementReceipt).ino;
        },
      }),
      /identity|binding|boundary|receipt/u,
    );
    assert.notEqual(oldAbsoluteCreate, null);
    assert.equal(statSync(replacementReceipt).isFile(), true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("receipt reservation creates a 0600 file through the verified parent child", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-child-")));
  try {
    const receipt = join(root, "receipt.json");
    const providers = sweep.createRuntimeProviders();
    const fd = providers.reserveReceipt(receipt);
    assert.equal(typeof fd, "number");
    providers.writeReceipt(fd, "receipt-fixture");
    providers.closeReceipt(fd);
    assert.equal(readFileSync(receipt, "utf8"), "receipt-fixture");
    assert.equal(statSync(receipt).mode & 0o777, 0o600);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("receipt reservation rejects child stderr, nonzero, and malformed output without credentials", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-child-output-")));
  try {
    for (const [index, childResult] of [
      { status: 1, stdout: "", stderr: "controlled failure" },
      { status: 0, stdout: "not-json", stderr: "" },
      { status: 0, stdout: JSON.stringify({ dev: "not-numeric", ino: "1" }), stderr: "" },
    ].entries()) {
      const receipt = join(root, `child-output-${index}.json`);
      const providers = sweep.createRuntimeProviders();
      assert.throws(
        () => providers.reserveReceipt(receipt, {
          spawn(file, args, options) {
            assert.equal(file, process.execPath);
            assert.equal(options.cwd, root);
            assert.equal(options.env.NODE_OPTIONS, undefined);
            assert.deepEqual(Object.keys(options.env), ["PATH"]);
            assert.equal(args[0], "--input-type=module");
            return childResult;
          },
        }),
        /child|output/u,
      );
      assert.equal(sweep.readExternalPathEvidence(receipt, { kind: "receipt" }).absent, true);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("receipt reservation bounds its child and closes the admitted parent on timeout", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-timeout-")));
  const receipt = join(root, "receipt.json");
  const closed = [];
  let capturedOptions = null;
  try {
    assert.throws(
      () => sweep.createRuntimeProviders().reserveReceipt(receipt, {
        close(fd) { closed.push(fd); },
        spawn(file, args, options) {
          assert.equal(file, process.execPath);
          capturedOptions = options;
          return { status: null, stdout: "", stderr: "", error: new Error("timed out") };
        },
      }),
      /child failed closed/u,
    );
    assert.equal(capturedOptions?.timeout, sweep.COMMAND_TIMEOUT_MS);
    assert.equal(capturedOptions?.maxBuffer, sweep.COMMAND_MAX_BUFFER_BYTES);
    assert.equal(capturedOptions?.killSignal, sweep.COMMAND_KILL_SIGNAL);
    assert.equal(closed.length, 1);
    assert.equal(sweep.readExternalPathEvidence(receipt, { kind: "receipt" }).absent, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("receipt ownership transfer failure closes leaf and parent once and preserves uncertain path", () => {
  for (const mode of ["chmod", "parent-replace"]) {
    const container = realpathSync(mkdtempSync(join(tmpdir(), "receipt-transfer-")));
    const parent = join(container, "parent");
    const moved = join(container, "moved");
    const path = join(parent, "receipt.ndjson");
    mkdirSync(parent);
    const closed = [];
    try {
      assert.throws(() => sweep.createRuntimeProviders().reserveReceipt(path, {
        afterLeafOpen() {
          if (mode === "chmod") chmodSync(path, 0o644);
          else { renameSync(parent, moved); mkdirSync(parent); }
        },
        close(fd) { closed.push(fd); closeSync(fd); },
      }), /receipt|binding/u);
      assert.equal(closed.length, 2, mode);
      assert.equal(new Set(closed).size, 2, mode);
      assert.equal(existsSync(mode === "chmod" ? path : join(moved, "receipt.ndjson")), true, mode);
    } finally { rmSync(container, { recursive: true, force: true }); }
  }
});

test("protected descriptor walker bounds its child and fails closed on timeout", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-protected-timeout-")));
  try {
    const identity = { dev: String(statSync(root, { bigint: false }).dev), ino: String(statSync(root, { bigint: false }).ino) };
    assert.throws(
      () => sweep.readProtectedTreeByDescriptor(root, identity, {
        spawn(file, args, options) {
          assert.equal(file, "/usr/bin/python3");
          assert.equal(options.timeout, sweep.COMMAND_TIMEOUT_MS);
          assert.equal(options.maxBuffer, sweep.COMMAND_MAX_BUFFER_BYTES);
          assert.equal(options.killSignal, sweep.COMMAND_KILL_SIGNAL);
          return { status: null, stdout: "", stderr: "", error: new Error("timed out") };
        },
      }),
      /child failed closed/u,
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const base = {
  path: "/repo/.worktrees/x", branch: "feature/x", bare: false, exists: true, dirty: 0,
  protectedHits: [], mergedIntoUpstream: false, containedIn: [], ageDays: 5,
  statusEvidence: { available: true },
  prEvidence: { available: true, complete: true, openPr: null },
  processEvidence: { available: true, active: false },
  ownerEvidence: { available: true, owner: "A25", task: "cleanup-x" },
};
const ctx = {
  primaryRoot: "/repo", upstream: "origin/main", defaultBranch: "main", minAgeDays: 0,
  liveMainEvidence: { available: true, sha: "a".repeat(40), source: "gh-api-git-ref" },
};
const reasons = (o) => decide({ ...base, ...o }, ctx);

test("decide retires a clean worktree whose commits are upstream", () => {
  assert.equal(reasons({ mergedIntoUpstream: true }).action, "retire");
});

test("decide does not treat containment in another local or cached ref as live-main proof", () => {
  const d = reasons({ containedIn: ["other/branch"] });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /not anchored to live remote main/);
});

test("decide never touches the primary checkout", () => {
  assert.equal(decide({ ...base, path: "/repo", mergedIntoUpstream: true }, ctx).action, "skip");
});

test("decide treats a symlink alias of the primary checkout as primary", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-primary-alias-")));
  const primary = join(root, "primary");
  const alias = join(root, "alias");
  try {
    mkdirSync(primary);
    symlinkSync(primary, alias, "dir");
    const d = decide({ ...base, path: alias, mergedIntoUpstream: true }, { ...ctx, primaryRoot: primary });
    assert.equal(d.action, "skip");
    assert.equal(d.reason, "primary checkout");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Regression: a checkout of the integration branch is merged-by-definition, so
// without an explicit guard every other rule votes to delete the reference tree.
test("decide never retires a checkout of the default branch", () => {
  const d = decide({ ...base, branch: "main", mergedIntoUpstream: true }, ctx);
  assert.equal(d.action, "skip");
  assert.match(d.reason, /default branch/);
});

test("decide never retires locked or prunable registrations", () => {
  assert.match(reasons({ locked: true, mergedIntoUpstream: true }).reason, /locked/);
  assert.match(reasons({ prunable: true, mergedIntoUpstream: true }).reason, /prunable/);
});

test("decide never touches a dirty worktree even when merged", () => {
  assert.equal(reasons({ dirty: 3, mergedIntoUpstream: true }).action, "skip");
});

test("decide fails closed when clean-status evidence is unavailable", () => {
  const d = reasons({ mergedIntoUpstream: true, statusEvidence: { available: false } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /clean-status evidence unavailable/);
});

test("decide protects ignored content git status cannot see", () => {
  const d = reasons({ mergedIntoUpstream: true, protectedHits: [{ label: "local database", path: "x", size: 1 }] });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /local database/);
});

test("decide keeps a branch with an open PR", () => {
  assert.equal(reasons({ mergedIntoUpstream: true, prEvidence: { available: true, openPr: 161 } }).action, "skip");
});

test("decide fails closed without live remote-main evidence", () => {
  const d = decide(
    { ...base, mergedIntoUpstream: true },
    { ...ctx, liveMainEvidence: { available: false, sha: null, source: null } },
  );
  assert.equal(d.action, "skip");
  assert.match(d.reason, /live remote-main evidence unavailable/);
});

test("decide rejects cached origin/main as live remote evidence", () => {
  const d = decide(
    { ...base, mergedIntoUpstream: true },
    { ...ctx, liveMainEvidence: { available: true, sha: "a".repeat(40), source: "cached-ref" } },
  );
  assert.equal(d.action, "skip");
  assert.match(d.reason, /live remote-main evidence unavailable/);
});

test("decide fails closed when GitHub open-PR evidence is unavailable", () => {
  const d = reasons({ mergedIntoUpstream: true, prEvidence: { available: false, openPr: null } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /GitHub PR evidence unavailable/);
});

test("decide fails closed when GitHub open-PR evidence is not exhaustive", () => {
  const d = reasons({
    mergedIntoUpstream: true,
    prEvidence: { available: true, complete: false, openPr: null },
  });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /not exhaustive/);
});

test("decide protects owner-unknown worktrees", () => {
  const d = reasons({ mergedIntoUpstream: true, ownerEvidence: { available: false, owner: null } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /owner evidence unavailable/);
});

test("decide requires nonblank string owner and task custody", () => {
  for (const ownerEvidence of [
    { available: true, owner: "A25", task: "   " },
    { available: true, owner: "   ", task: "cleanup-x" },
    { available: true, owner: { claimed: "A25" }, task: "cleanup-x" },
  ]) {
    const d = reasons({ mergedIntoUpstream: true, ownerEvidence });
    assert.equal(d.action, "skip");
    assert.match(d.reason, /owner and task custody unavailable/);
  }
});

test("decide protects worktrees when process evidence is unavailable", () => {
  const d = reasons({ mergedIntoUpstream: true, processEvidence: { available: false, active: null } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /active-process evidence unavailable/);
});

test("decide protects worktrees with an active process", () => {
  const d = reasons({ mergedIntoUpstream: true, processEvidence: { available: true, active: true } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /active process/);
});

test("decide protects an unanchored detached worktree", () => {
  const d = reasons({
    branch: null,
    detached: true,
    mergedIntoUpstream: true,
    detachedAnchorEvidence: { available: false, ref: null, sha: null },
  });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /unanchored detached/);
});

test("decide may retire a detached worktree only with an exact immutable anchor", () => {
  const d = reasons({
    branch: null,
    detached: true,
    head: "b".repeat(40),
    mergedIntoUpstream: true,
    detachedAnchorEvidence: {
      available: true,
      ref: "refs/tags/worktree-anchor-20260829",
      sha: "b".repeat(40),
      immutable: true,
    },
  });
  assert.equal(d.action, "retire");
});

test("decide keeps unique work that exists in no other ref", () => {
  const d = reasons({ mergedIntoUpstream: false, containedIn: [] });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /not anchored to live remote main/);
});

test("decide honours --min-age-days", () => {
  assert.equal(decide({ ...base, mergedIntoUpstream: true, ageDays: 1 }, { ...ctx, minAgeDays: 3 }).action, "skip");
  assert.equal(decide({ ...base, mergedIntoUpstream: true, ageDays: 9 }, { ...ctx, minAgeDays: 3 }).action, "retire");
});

test("decide skips a worktree whose directory has vanished", () => {
  const d = reasons({ exists: false, mergedIntoUpstream: true });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /directory missing/);
});

const LIVE_MAIN_SHA = "1".repeat(40);
const TARGET_HEAD_SHA = "2".repeat(40);
const TOPOLOGY_SHA = "3".repeat(64);
const TEST_REPOSITORY_TUPLE = Object.freeze({
  primaryRoot: "/repo",
  commonGitDir: "/repo/.git",
  gitDir: "/repo/.git",
  remoteIdentity: "HUDongpin/MAIS-MVP",
  remoteUrl: "https://github.com/HUDongpin/MAIS-MVP.git",
});

function applyManifest(targetCount = 1) {
  return {
    schemaVersion: "sweep-merged-worktrees.apply-manifest.v1",
    expectedLiveMainSha: LIVE_MAIN_SHA,
    fleetFingerprint: TOPOLOGY_SHA,
    targets: Array.from({ length: targetCount }, (_, index) => ({
      path: `/repo/.worktrees/target-${index}`,
      branch: `feature/target-${index}`,
      head: TARGET_HEAD_SHA,
      topologyFingerprint: TOPOLOGY_SHA,
      owner: "A25",
      task: `cleanup-${index}`,
      creationDate: "2026-08-28",
      expectedCloseoutDate: "2026-08-29",
      allowedAction: "remove-worktree",
    })),
  };
}

function authorizationFor(manifest = applyManifest()) {
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    apply: true,
    manifestBytes,
    expectedManifestSha256: sweep.sha256Text(manifestBytes),
    expectedLiveMainSha: LIVE_MAIN_SHA,
    liveMainEvidence: { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" },
  };
}

test("validateApplyAuthorization requires a byte-locked immutable manifest for --apply", () => {
  const result = sweep.validateApplyAuthorization({
    apply: true,
    manifestBytes: null,
    expectedManifestSha256: null,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    liveMainEvidence: { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" },
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /immutable manifest/);
});

test("validateApplyAuthorization rejects a manifest whose bytes changed", () => {
  const input = authorizationFor();
  const result = sweep.validateApplyAuthorization({
    ...input,
    manifestBytes: Buffer.concat([input.manifestBytes, Buffer.from(" ")]),
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /digest mismatch/);
});

test("manifest authorization hashes raw bytes and rejects malformed UTF-8 aliases", () => {
  const manifest = applyManifest();
  manifest.note = "alias-marker";
  const valid = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const marker = Buffer.from("alias-marker", "utf8");
  const markerOffset = valid.indexOf(marker);
  assert.ok(markerOffset >= 0);
  const malformedA = Buffer.concat([
    valid.subarray(0, markerOffset),
    Buffer.from([0x80]),
    valid.subarray(markerOffset + marker.byteLength),
  ]);
  const malformedB = Buffer.concat([
    valid.subarray(0, markerOffset),
    Buffer.from([0x81]),
    valid.subarray(markerOffset + marker.byteLength),
  ]);
  assert.equal(malformedA.toString("utf8"), malformedB.toString("utf8"));
  assert.notEqual(sweep.sha256Text(malformedA), sweep.sha256Text(malformedB));

  for (const manifestBytes of [malformedA, malformedB]) {
    const result = sweep.validateApplyAuthorization({
      ...authorizationFor(manifest),
      manifestBytes,
      expectedManifestSha256: sweep.sha256Text(manifestBytes),
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /valid JSON/u);
  }
});

test("manifest reader refuses sparse oversized files before reading", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-manifest-size-")));
  const manifest = join(root, "manifest.json");
  try {
    writeFileSync(manifest, "");
    truncateSync(manifest, sweep.MAX_MANIFEST_BYTES + 1);
    assert.throws(() => sweep.createRuntimeProviders().readImmutableManifest(manifest), /size limit|too large/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("manifest reader rejects growth after fstat without allocating the grown file", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-manifest-growth-")));
  const manifest = join(root, "manifest.json");
  try {
    writeFileSync(manifest, "{}");
    assert.throws(
      () => sweep.createRuntimeProviders().readImmutableManifest(manifest, {
        afterOpen(path) { truncateSync(path, sweep.MAX_MANIFEST_BYTES + 1); },
      }),
      /size limit|too large/u,
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("manifest reader refuses non-regular FIFO leaves without reading", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-manifest-fifo-")));
  const manifest = join(root, "manifest.fifo");
  try {
    execFileSync("mkfifo", [manifest]);
    assert.throws(() => sweep.createRuntimeProviders().readImmutableManifest(manifest), /regular|unavailable/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("validateApplyAuthorization requires an independently supplied expected live-main SHA", () => {
  const result = sweep.validateApplyAuthorization({ ...authorizationFor(), expectedLiveMainSha: null });
  assert.equal(result.ok, false);
  assert.match(result.reason, /expected live-main SHA/);
});

test("validateApplyAuthorization fails closed when live remote-main evidence is unavailable", () => {
  const result = sweep.validateApplyAuthorization({
    ...authorizationFor(),
    liveMainEvidence: { available: false, sha: null, source: null },
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /live remote-main evidence unavailable/);
});

test("validateApplyAuthorization rejects expected, manifest, or observed live-main SHA drift", () => {
  const input = authorizationFor();
  const manifestMismatch = applyManifest();
  manifestMismatch.expectedLiveMainSha = "4".repeat(40);
  const manifestResult = sweep.validateApplyAuthorization(authorizationFor(manifestMismatch));
  assert.equal(manifestResult.ok, false);
  assert.match(manifestResult.reason, /live-main SHA mismatch/);

  const observedResult = sweep.validateApplyAuthorization({
    ...input,
    liveMainEvidence: { available: true, sha: "5".repeat(40), source: "gh-api-git-ref" },
  });
  assert.equal(observedResult.ok, false);
  assert.match(observedResult.reason, /live-main SHA mismatch/);
});

test("validateApplyAuthorization caps one invocation at five exact targets", () => {
  const six = sweep.validateApplyAuthorization(authorizationFor(applyManifest(6)));
  assert.equal(six.ok, false);
  assert.match(six.reason, /at most 5/);

  const five = sweep.validateApplyAuthorization(authorizationFor(applyManifest(5)));
  assert.equal(five.ok, true);
  assert.equal(five.manifest.targets.length, 5);
  assert.equal(sweep.MAX_APPLY_TARGETS, 5);
});

test("validateApplyAuthorization requires owner and task custody for every target", () => {
  const manifest = applyManifest();
  manifest.targets[0].owner = "";
  const result = sweep.validateApplyAuthorization(authorizationFor(manifest));
  assert.equal(result.ok, false);
  assert.match(result.reason, /owner and task/);

  manifest.targets[0].owner = { claimed: "A25" };
  manifest.targets[0].task = ["cleanup-0"];
  assert.equal(sweep.validateApplyAuthorization(authorizationFor(manifest)).ok, false);
});

test("validateApplyAuthorization locks the fleet, closeout date, and sole allowed action", () => {
  for (const mutate of [
    (manifest) => { delete manifest.fleetFingerprint; },
    (manifest) => { manifest.targets[0].expectedCloseoutDate = "soon"; },
    (manifest) => { manifest.targets[0].allowedAction = "delete-branch"; },
  ]) {
    const manifest = applyManifest();
    mutate(manifest);
    const result = sweep.validateApplyAuthorization(authorizationFor(manifest));
    assert.equal(result.ok, false);
    assert.match(result.reason, /fleet fingerprint|closeout|allowed action/);
  }
});

test("validateApplyAuthorization requires an exact immutable anchor for detached targets", () => {
  const manifest = applyManifest();
  manifest.targets[0].branch = null;
  const missing = sweep.validateApplyAuthorization(authorizationFor(manifest));
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /detached anchor/);

  manifest.targets[0].detachedAnchor = {
    ref: "refs/tags/worktree-anchor-20260829",
    sha: TARGET_HEAD_SHA,
    immutable: true,
  };
  assert.equal(sweep.validateApplyAuthorization(authorizationFor(manifest)).ok, true);
});

test("validateApplyAuthorization rejects duplicate JSON object keys", () => {
  const manifest = applyManifest();
  const duplicate = Buffer.from(JSON.stringify(manifest).replace('"owner":"A25"', '"owner":"A25","owner":"A25"'), "utf8");
  const result = sweep.validateApplyAuthorization({
    ...authorizationFor(),
    manifestBytes: duplicate,
    expectedManifestSha256: sweep.sha256Text(duplicate),
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /JSON/u);
});

test("runAuthorizedApply rejects a valid first manifest followed by duplicate-key revalidation", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const duplicate = Buffer.from(JSON.stringify(applyManifest()).replace('"owner":"A25"', '"owner":"A25","owner":"A25"'), "utf8");
  let reads = 0;
  deps.readManifestBytes = () => (++reads === 1 ? authorization.manifestBytes : duplicate);
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(calls.remove.length, 0);
  assert.equal(result.receipt.results[0].reason, "immutable manifest revalidation failed");
});

test("validateApplyAuthorization requires manifest creationDate", () => {
  const manifest = applyManifest();
  delete manifest.targets[0].creationDate;
  assert.equal(sweep.validateApplyAuthorization(authorizationFor(manifest)).ok, false);
  assert.match(sweep.validateApplyAuthorization(authorizationFor(manifest)).reason, /creation date/u);
});

test("fingerprintTopology locks exact path, branch, HEAD, and topology state", () => {
  const original = {
    path: "/repo/.worktrees/x",
    branch: "feature/x",
    head: TARGET_HEAD_SHA,
    bare: false,
    detached: false,
  };
  const fingerprint = sweep.fingerprintTopology(original);
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  for (const changed of [
    { ...original, path: "/repo/.worktrees/y" },
    { ...original, branch: "feature/y" },
    { ...original, head: "6".repeat(40) },
    { ...original, detached: true },
    { ...original, locked: true },
    { ...original, prunable: true },
  ]) assert.notEqual(sweep.fingerprintTopology(changed), fingerprint);
});

test("revalidateCandidate rejects any path, branch, HEAD, or topology drift", () => {
  const current = {
    ...base,
    head: TARGET_HEAD_SHA,
    mergedIntoUpstream: true,
  };
  const lock = {
    path: current.path,
    branch: current.branch,
    head: current.head,
    topologyFingerprint: sweep.fingerprintTopology(current),
  };
  for (const changed of [
    { ...current, path: "/repo/.worktrees/y" },
    { ...current, branch: "feature/y" },
    { ...current, head: "6".repeat(40) },
    { ...current, detached: true },
  ]) {
    const result = sweep.revalidateCandidate(lock, changed, {
      ...ctx,
      expectedLiveMainSha: ctx.liveMainEvidence.sha,
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /candidate lock drift/);
  }
});

test("revalidateCandidate reruns every fail-closed policy immediately before action", () => {
  const current = {
    ...base,
    head: TARGET_HEAD_SHA,
    mergedIntoUpstream: true,
  };
  const lock = {
    path: current.path,
    branch: current.branch,
    head: current.head,
    topologyFingerprint: sweep.fingerprintTopology(current),
  };
  const dirty = sweep.revalidateCandidate(lock, { ...current, dirty: 1 }, {
    ...ctx,
    expectedLiveMainSha: ctx.liveMainEvidence.sha,
  });
  assert.equal(dirty.ok, false);
  assert.match(dirty.reason, /dirty/);

  const staleMain = sweep.revalidateCandidate(lock, current, {
    ...ctx,
    expectedLiveMainSha: "7".repeat(40),
  });
  assert.equal(staleMain.ok, false);
  assert.match(staleMain.reason, /live-main SHA drift/);

  const valid = sweep.revalidateCandidate(lock, current, {
    ...ctx,
    expectedLiveMainSha: ctx.liveMainEvidence.sha,
  });
  assert.equal(valid.ok, true);
});

test("sweep mutation policy permits only a non-force local worktree removal", () => {
  const command = sweep.buildWorktreeRemoveCommand("/repo/.worktrees/x");
  assert.deepEqual(command, {
    file: sweep.TRUSTED_GIT_EXECUTABLE,
    args: ["worktree", "remove", "--", "/repo/.worktrees/x"],
  });
  assert.equal(command.args.includes("--force"), false);
  assert.equal(sweep.isAllowedSweepMutation(command.file, command.args), true);
  assert.equal(sweep.isAllowedSweepMutation("git", ["worktree", "remove", "--force", "/repo/.worktrees/x"]), false);
  assert.equal(sweep.isAllowedSweepMutation("git", ["push", "origin", "--delete", "feature/x"]), false);
  assert.equal(sweep.isAllowedSweepMutation(
    sweep.TRUSTED_GIT_EXECUTABLE,
    ["worktree", "remove", "--", "/repo/workforce-analysis"],
  ), true);
});

test("platform boundary is explicitly macOS-only", () => {
  assert.equal(sweep.isSupportedSweepPlatform("darwin"), true);
  assert.equal(sweep.isSupportedSweepPlatform("linux"), false);
  assert.equal(sweep.isSupportedSweepPlatform("win32"), false);
});

test("redactSecretLikePath removes secret-bearing path segments from logs and receipts", () => {
  assert.equal(
    sweep.redactSecretLikePath("/repo/.env.local/receipt.json"),
    "/repo/[REDACTED_SECRET_PATH]/receipt.json",
  );
  assert.equal(
    sweep.redactSecretLikePath("/repo/All API Keys.docx/archive"),
    "/repo/[REDACTED_SECRET_PATH]/archive",
  );
  assert.equal(sweep.redactSecretLikePath("/repo/.worktrees/feature-x"), "/repo/.worktrees/feature-x");
});

test("createPostflightReceipt is manifest-bound, redacted, and records action outcomes", () => {
  const receipt = sweep.createPostflightReceipt({
    manifestSha256: "8".repeat(64),
    expectedLiveMainSha: LIVE_MAIN_SHA,
    observedLiveMainSha: LIVE_MAIN_SHA,
    startedAt: "2026-08-29T00:00:00.000Z",
    completedAt: "2026-08-29T00:00:01.000Z",
    preTopologyFingerprint: "9".repeat(64),
    postTopologyFingerprint: "a".repeat(64),
    results: [
      {
        path: "/repo/.worktrees/ok",
        branch: "feature/ok",
        head: TARGET_HEAD_SHA,
        topologyFingerprint: TOPOLOGY_SHA,
        owner: "A25",
        task: "cleanup-ok",
        creationDate: "2026-08-28",
        expectedCloseoutDate: "2026-08-29",
        allowedAction: "remove-worktree",
        status: "removed",
        reason: null,
      },
      { path: "/repo/.env.local/secret", branch: "feature/skip", status: "skipped", reason: "drift" },
      { path: "/repo/.worktrees/fail", branch: "feature/fail", status: "failed", reason: "git failed" },
    ],
  });
  assert.equal(receipt.schemaVersion, "sweep-merged-worktrees.postflight-receipt.v1");
  assert.deepEqual(receipt.summary, { attempted: 3, removed: 1, skipped: 1, failed: 1 });
  assert.equal(receipt.invariants.forceUsed, false);
  assert.equal(receipt.invariants.remoteDeletionAttempted, false);
  assert.deepEqual(receipt.claimCeiling, {
    absoluteRaceFree: false,
    writerFree: false,
    postflight: "bounded path, process, live-main, and topology observations only",
  });
  assert.equal(receipt.results[0].head, TARGET_HEAD_SHA);
  assert.equal(receipt.results[0].creationDate, "2026-08-28");
  assert.equal(receipt.results[0].expectedCloseoutDate, "2026-08-29");
  assert.equal(receipt.results[0].allowedAction, "remove-worktree");
  assert.doesNotMatch(JSON.stringify(receipt), /\.env\.local/);
  assert.match(JSON.stringify(receipt), /REDACTED_SECRET_PATH/);
});

test("parseSweepArgs rejects --apply unless every independent authorization input is present", () => {
  const missing = sweep.parseSweepArgs(["--apply"]);
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /--manifest/);
  assert.match(missing.reason, /--manifest-sha256/);
  assert.match(missing.reason, /--expected-live-main-sha/);
  assert.match(missing.reason, /--receipt/);

  const complete = sweep.parseSweepArgs([
    "--apply",
    "--manifest", "/tmp/sweep-manifest.json",
    "--manifest-sha256", "b".repeat(64),
    "--expected-live-main-sha", LIVE_MAIN_SHA,
    "--receipt", "/tmp/sweep-receipt.json",
  ]);
  assert.equal(complete.ok, true);
  assert.equal(complete.apply, true);
});

test("parseSweepArgs accepts a complete immutable manifest preview without --apply", () => {
  const complete = sweep.parseSweepArgs([
    "--manifest", "/tmp/sweep-manifest.json",
    "--manifest-sha256", "b".repeat(64),
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ]);
  assert.equal(complete.ok, true);
  assert.equal(complete.apply, false);
  assert.equal(complete.manifestPreview, true);

  for (const argv of [
    ["--manifest", "/tmp/sweep-manifest.json"],
    ["--manifest-sha256", "b".repeat(64)],
    ["--expected-live-main-sha", LIVE_MAIN_SHA],
  ]) {
    const partial = sweep.parseSweepArgs(argv);
    assert.equal(partial.ok, false);
    assert.match(partial.reason, /manifest preview requires/);
  }
});

test("parseSweepArgs reserves receipt paths for --apply only", () => {
  const result = sweep.parseSweepArgs(["--receipt", "/tmp/sweep-receipt.json"]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /--receipt is only valid with --apply/);
});

test("parseSweepArgs rejects disabling the GitHub PR evidence gate", () => {
  const result = sweep.parseSweepArgs(["--no-pr-check"]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /cannot be disabled/);
});

test("CLI rejects the PR-check bypass before any provider or mutation path runs", () => {
  const result = spawnSync(
    process.execPath,
    [join(import.meta.dirname, "sweep-merged-worktrees.mjs"), "--no-pr-check"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GitHub PR evidence gate cannot be disabled/);
  assert.equal(result.stdout, "");
});

test("parseLiveRemoteHead accepts exactly one ls-remote main record and nothing cached", () => {
  const live = sweep.parseLiveRemoteHead(`${LIVE_MAIN_SHA}\trefs/heads/main\n`, "main");
  assert.deepEqual(live, { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" });
  assert.equal(sweep.parseLiveRemoteHead("", "main").available, false);
  assert.equal(
    sweep.parseLiveRemoteHead(`${LIVE_MAIN_SHA}\trefs/heads/not-main\n`, "main").available,
    false,
  );
  assert.equal(
    sweep.parseLiveRemoteHead(
      `${LIVE_MAIN_SHA}\trefs/heads/main\n${"c".repeat(40)}\trefs/heads/main\n`,
      "main",
    ).available,
    false,
  );
});

test("parseOpenPrEvidence fails closed on malformed GitHub evidence", () => {
  const valid = sweep.parseOpenPrEvidence(
    `[{"number":192,"headRefName":"feature/x","headRefOid":"${TARGET_HEAD_SHA}"}]`,
  );
  assert.equal(valid.available, true);
  assert.equal(valid.openByBranch.get("feature/x"), 192);
  assert.equal(valid.openByHead.get(TARGET_HEAD_SHA), 192);
  assert.equal(sweep.parseOpenPrEvidence("not-json").available, false);
  assert.equal(
    sweep.parseOpenPrEvidence(
      `[{"number":"192","headRefName":"feature/x","headRefOid":"${TARGET_HEAD_SHA}"}]`,
    ).available,
    false,
  );
  assert.equal(
    sweep.parseOpenPrEvidence('[{"number":192,"headRefName":"feature/x"}]').available,
    false,
  );
});

test("parseOpenPrEvidence fails closed when the live query reaches its cap", () => {
  const records = [1, 2].map((number) => ({
    number,
    headRefName: `feature/${number}`,
    headRefOid: String(number).repeat(40),
  }));
  const capped = sweep.parseOpenPrEvidence(JSON.stringify(records), { queryLimit: 2 });
  assert.equal(capped.available, false);
  assert.equal(capped.complete, false);
  assert.match(capped.reason, /query cap/);

  const complete = sweep.parseOpenPrEvidence(JSON.stringify(records.slice(0, 1)), { queryLimit: 2 });
  assert.equal(complete.available, true);
  assert.equal(complete.complete, true);
});

test("GitHub ref and pulls evidence share fatal UTF-8 duplicate-key and frozen resource bounds", () => {
  assert.deepEqual(sweep.GITHUB_JSON_LIMITS, {
    maxBytes: 32 * 1024 * 1024,
    maxDepth: 128,
    maxWork: 64 * 1024 * 1024,
    maxNodes: 250_000,
  });
  const invalidUtf8 = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]);
  const duplicateRef = Buffer.from(`{"ref":"refs/heads/main","ref":"refs/heads/main","object":{"sha":"${LIVE_MAIN_SHA}","type":"commit"}}`);
  const duplicatePull = Buffer.from(`[[{"number":223,"head":{"ref":"feature/x","ref":"feature/y","sha":"${TARGET_HEAD_SHA}"}}]]`);
  const tooDeep = Buffer.from(`${"[".repeat(130)}0${"]".repeat(130)}`);
  const tooManyNodes = Buffer.from(`[${new Array(250_001).fill("0").join(",")}]`);
  const oversized = Buffer.alloc((32 * 1024 * 1024) + 1, 0x20);

  for (const payload of [invalidUtf8, duplicateRef, tooDeep, tooManyNodes, oversized]) {
    assert.equal(sweep.parseGitHubExactRef(payload, "main").available, false);
  }
  for (const payload of [invalidUtf8, duplicatePull, tooDeep, tooManyNodes, oversized]) {
    const evidence = sweep.parseOpenPrEvidence(payload);
    assert.equal(evidence.available, false);
    assert.equal(evidence.complete, false);
  }
});

test("GitHub ref and pulls parsers enforce a reachable independent work budget", () => {
  assert.ok(sweep.GITHUB_JSON_WORK_LIMIT < sweep.GITHUB_JSON_LIMITS.maxBytes);
  const escapedPadding = "\\u0061".repeat(110_000);
  const exactRef = Buffer.from(`{"ref":"refs/heads/main","object":{"sha":"${LIVE_MAIN_SHA}","type":"commit"},"padding":"${escapedPadding}"}`);
  const pulls = Buffer.from(`[[{"number":223,"head":{"ref":"feature/x","sha":"${TARGET_HEAD_SHA}"},"padding":"${escapedPadding}"}]]`);
  assert.ok(exactRef.byteLength < sweep.GITHUB_JSON_LIMITS.maxBytes);
  assert.ok(pulls.byteLength < sweep.GITHUB_JSON_LIMITS.maxBytes);
  assert.equal(sweep.parseGitHubExactRef(exactRef, "main").available, false);
  assert.equal(sweep.parseOpenPrEvidence(pulls).available, false);
});

test("parseActiveProcessEvidence distinguishes no users, active users, and probe failure", () => {
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 1, stdout: "", stderr: "", error: null }),
    { available: true, active: false },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 0, stdout: "p123\np456\n", stderr: "", error: null }),
    { available: true, active: true },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 1, stdout: "p123\n", stderr: "", error: new Error("partial") }),
    { available: false, active: null },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 1, stdout: "", stderr: "warning", error: null }),
    { available: false, active: null },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 1, stdout: "p123\n", stderr: "", error: null }),
    { available: false, active: null },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: 0, stdout: "", stderr: "", error: null }),
    { available: false, active: null },
  );
  assert.deepEqual(
    sweep.parseActiveProcessEvidence({ status: null, stdout: "", stderr: "", error: new Error("missing") }),
    { available: false, active: null },
  );
});

test("production live-main provider wires an exact GitHub ref query and fails closed on errors", () => {
  const calls = [];
  const evidence = sweep.readLiveMainEvidence("/repo", "main", {
    repositoryTuple: TEST_REPOSITORY_TUPLE,
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd, encoding: options.encoding, timeout: options.timeout, maxBuffer: options.maxBuffer, killSignal: options.killSignal });
      return JSON.stringify({
        ref: "refs/heads/main",
        object: { sha: LIVE_MAIN_SHA, type: "commit" },
      });
    },
  });
  assert.deepEqual(evidence, { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" });
  assert.deepEqual(calls, [{
    file: sweep.TRUSTED_GH_EXECUTABLE,
    args: ["api", "--hostname", "github.com", "repos/HUDongpin/MAIS-MVP/git/ref/heads/main"],
    cwd: "/",
    encoding: null,
    timeout: sweep.COMMAND_TIMEOUT_MS,
    maxBuffer: sweep.COMMAND_MAX_BUFFER_BYTES,
    killSignal: sweep.COMMAND_KILL_SIGNAL,
  }]);
  assert.equal(sweep.readLiveMainEvidence("/repo", "main", {
    execFile() { throw new Error("offline"); },
  }).available, false);
});

test("production live-main provider uses the fixed trusted executable and isolated config environment", () => {
  const calls = [];
  const evidence = sweep.readLiveMainEvidence("/repo", "main", {
    repositoryTuple: TEST_REPOSITORY_TUPLE,
    execFile(file, args, options) {
      calls.push({ file, args, env: options.env });
      return JSON.stringify({
        ref: "refs/heads/main",
        object: { sha: LIVE_MAIN_SHA, type: "commit" },
      });
    },
  });
  assert.equal(evidence.available, true);
  assert.equal(calls[0].file, sweep.TRUSTED_GH_EXECUTABLE);
  assert.equal(calls[0].env.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(calls[0].env.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(calls[0].env.GIT_CONFIG_SYSTEM, "/dev/null");
  assert.equal(calls[0].env.GIT_CONFIG, undefined);
  assert.equal(calls[0].env.GIT_CONFIG_COUNT, undefined);
  assert.equal(calls[0].env.GH_REPO, undefined);
  assert.equal(calls[0].env.GH_HOST, undefined);
});

test("sanitized Git environment disables all interactive and SSH routing", () => {
  const environment = sweep.sanitizedGitEnvironment({
    GIT_TERMINAL_PROMPT: "1",
    GIT_ASKPASS: "/tmp/askpass",
    SSH_ASKPASS: "/tmp/ssh-askpass",
    GCM_INTERACTIVE: "always",
    GIT_SSH_COMMAND: "ssh -o ProxyCommand=evil",
    GIT_SSH_VARIANT: "simple",
  });
  assert.equal(environment.GIT_TERMINAL_PROMPT, "0");
  assert.equal(environment.GIT_ASKPASS, "/usr/bin/false");
  assert.equal(environment.SSH_ASKPASS, "/usr/bin/false");
  assert.equal(environment.GCM_INTERACTIVE, "never");
  assert.equal(environment.GIT_SSH_COMMAND, "/usr/bin/ssh -F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes -oUpdateHostKeys=no -oControlMaster=no -oControlPath=none -oPermitLocalCommand=no -oProxyCommand=none -oClearAllForwardings=yes");
  assert.equal(environment.GIT_SSH_VARIANT, "ssh");
});

test("sanitized SSH command is executable by ssh config parsing", () => {
  const command = sweep.sanitizedGitEnvironment({}).GIT_SSH_COMMAND;
  const result = spawnSync("/usr/bin/ssh", [
    ...command.split(" ").slice(1),
    "-G",
    "github.com",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("sanitized Git environment removes dynamic index and routing overrides", () => {
  const environment = sweep.sanitizedGitEnvironment({
    GIT_INDEX_FILE: "/tmp/wrong-index",
    GIT_SSH_COMMAND: "malicious-ssh",
    GIT_SSH: "/tmp/wrong-ssh",
    GIT_ASKPASS: "/tmp/wrong-askpass",
    GIT_PROXY_COMMAND: "wrong-proxy",
    GIT_EXEC_PATH: "/tmp/wrong-exec",
    GIT_CONFIG_KEY_1: "core.worktree",
    GIT_CONFIG_VALUE_1: "/tmp/wrong-worktree",
  });
  for (const [key, value] of Object.entries(environment)) {
    if (/^GIT_/u.test(key)) {
      assert.deepEqual([key, value], [
        ["GIT_CONFIG_NOSYSTEM", "1"],
        ["GIT_CONFIG_GLOBAL", "/dev/null"],
        ["GIT_CONFIG_SYSTEM", "/dev/null"],
        ["GIT_OPTIONAL_LOCKS", "0"],
        ["GIT_TERMINAL_PROMPT", "0"],
        ["GIT_ASKPASS", "/usr/bin/false"],
        ["GIT_SSH_COMMAND", "/usr/bin/ssh -F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes -oUpdateHostKeys=no -oControlMaster=no -oControlPath=none -oPermitLocalCommand=no -oProxyCommand=none -oClearAllForwardings=yes"],
        ["GIT_SSH_VARIANT", "ssh"],
      ].find(([safeKey]) => safeKey === key));
    }
  }
});

test("repository tuple is frozen and rejects a changed binding", () => {
  const fixture = realLinkedWorktreeFixture();
  try {
    const tuple = sweep.readRepositoryTuple(fixture.repository);
    assert.equal(Object.isFrozen(tuple), true);
    assert.equal(tuple.primaryRoot, realpathSync(fixture.repository));
    assert.equal(tuple.commonGitDir, realpathSync(join(fixture.repository, ".git")));
    assert.equal(sweep.repositoryTupleMatches(tuple, { ...tuple }), true);
    assert.equal(sweep.repositoryTupleMatches(tuple, { ...tuple, gitDir: fixture.wrongGitDir }), false);
  } finally { rmSync(fixture.fixtureRoot, { recursive: true, force: true }); }
});

test("repository tuple identity is part of the exact comparison", () => {
  assert.equal(
    sweep.repositoryTupleMatches(
      { ...TEST_REPOSITORY_TUPLE, remoteIdentity: null },
      TEST_REPOSITORY_TUPLE,
    ),
    false,
  );
});

test("GitHub remote URL parser rejects credentials, non-GitHub hosts, and controls", () => {
  assert.equal(sweep.parseStrictGitHubRemoteUrl("https://github.com/owner/repo.git"), "https://github.com/owner/repo.git");
  for (const value of [
    "https://user:token@github.com/owner/repo.git",
    "https://evil.invalid/owner/repo.git",
    "https://github.com/owner/repo.git\n",
    "git@github.com:owner/repo.git",
  ]) assert.equal(sweep.parseStrictGitHubRemoteUrl(value), null);
});

test("repository tuple comparison includes exact remote URL", () => {
  assert.equal(
    sweep.repositoryTupleMatches(TEST_REPOSITORY_TUPLE, {
      ...TEST_REPOSITORY_TUPLE,
      remoteUrl: "https://github.com/owner/other.git",
    }),
    false,
  );
});

test("main tuple barrier carries the frozen remote URL", () => {
  const source = readFileSync(join(process.cwd(), "scripts/sweep-merged-worktrees.mjs"), "utf8");
  const barrierEnd = source.indexOf("repository tuple does not match");
  const barrierStart = source.lastIndexOf("repositoryTupleMatches(", barrierEnd);
  assert.match(source.slice(barrierStart, barrierEnd), /remoteUrl:\s*repositoryTuple\.remoteUrl/u);
});

test("live-main security uses the owner-approved canonical repository URL", () => {
  assert.equal(sweep.APPROVED_REPOSITORY_IDENTITY, "HUDongpin/MAIS-MVP");
  assert.equal(sweep.APPROVED_REPOSITORY_URL, "https://github.com/HUDongpin/MAIS-MVP.git");
  const calls = [];
  const result = sweep.readLiveMainEvidence("/untrusted/cwd", "main", {
    repositoryTuple: {
      primaryRoot: "/repo",
      commonGitDir: "/repo/.git",
      gitDir: "/repo/.git",
      remoteIdentity: "HUDongpin/MAIS-MVP",
      remoteUrl: sweep.APPROVED_REPOSITORY_URL,
    },
    execFile(file, args, options) {
      calls.push({ file, args, options });
      return JSON.stringify({
        ref: "refs/heads/main",
        object: { sha: LIVE_MAIN_SHA, type: "commit" },
      });
    },
  });
  assert.equal(result.available, true);
  assert.equal(calls[0].options.cwd, "/");
  assert.equal(calls[0].args.includes("--git-dir=/repo/.git"), false);
  assert.equal(calls[0].args.includes("--work-tree=/repo"), false);
  assert.equal(calls[0].file, sweep.TRUSTED_GH_EXECUTABLE);
  assert.deepEqual(calls[0].args, ["api", "--hostname", "github.com", "repos/HUDongpin/MAIS-MVP/git/ref/heads/main"]);
});

test("parse GitHub exact-ref evidence accepts one commit object and rejects malformed payloads", () => {
  assert.deepEqual(
    sweep.parseGitHubExactRef(JSON.stringify({
      ref: "refs/heads/main",
      object: { sha: LIVE_MAIN_SHA, type: "commit" },
    }), "main"),
    { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" },
  );
  for (const value of [
    "not json",
    JSON.stringify([]),
    JSON.stringify([{ ref: "refs/heads/main", object: { sha: LIVE_MAIN_SHA, type: "commit" } }]),
    JSON.stringify({ ref: "refs/heads/other", object: { sha: LIVE_MAIN_SHA, type: "commit" } }),
    JSON.stringify({ ref: "refs/heads/main", object: { sha: "x", type: "commit" } }),
    JSON.stringify({ ref: "refs/heads/main", object: { sha: LIVE_MAIN_SHA, type: "tag" } }),
  ]) {
    assert.deepEqual(
      sweep.parseGitHubExactRef(value, "main"),
      { available: false, sha: null, source: null },
    );
  }
});

test("accepted live-main evidence includes the helper-free GitHub API source", () => {
  assert.equal(
    sweep.isAcceptedLiveMainEvidence({ available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" }),
    true,
  );
  assert.equal(
    sweep.isAcceptedLiveMainEvidence({ available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" }),
    false,
  );
  assert.equal(
    sweep.isAcceptedLiveMainEvidence({ available: true, sha: "broken", source: "gh-api-git-ref" }),
    false,
  );
});

test("historical ls-remote receipts remain parseable but cannot authorize current decisions", () => {
  const historical = sweep.parseLiveRemoteHead(`${LIVE_MAIN_SHA}\trefs/heads/main\n`, "main");
  assert.deepEqual(historical, { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" });
  assert.equal(sweep.isAcceptedLiveMainEvidence(historical), false);
  const decision = sweep.decide({ ...base, mergedIntoUpstream: true }, {
    ...ctx,
    liveMainEvidence: historical,
  });
  assert.equal(decision.action, "skip");
  assert.match(decision.reason, /live remote-main evidence unavailable/u);
  const authorization = sweep.validateApplyAuthorization({
    ...authorizationFor(),
    liveMainEvidence: historical,
  });
  assert.equal(authorization.ok, false);
});

test("live-main rejects a local origin URL that differs from the approved constant", () => {
  const result = sweep.readLiveMainEvidence("/repo", "main", {
    repositoryTuple: {
      primaryRoot: "/repo", commonGitDir: "/repo/.git", gitDir: "/repo/.git",
      remoteIdentity: "attacker/repo", remoteUrl: "https://github.com/attacker/repo.git",
    },
    execFile() { throw new Error("must not execute"); },
  });
  assert.equal(result.available, false);
});

test("temporary repository with tampered origin is rejected before live-main", () => {
  const fixture = realLinkedWorktreeFixture();
  try {
    execFileSync("git", ["remote", "add", "origin", "https://github.com/attacker/tampered.git"], { cwd: fixture.repository });
    assert.throws(() => sweep.readRepositoryTuple(fixture.repository), /approved repository/u);
  } finally { rmSync(fixture.fixtureRoot, { recursive: true, force: true }); }
});

test("sanitized Git environment disables GitHub prompts", () => {
  assert.equal(sweep.sanitizedGitEnvironment({}).GH_PROMPT_DISABLED, "1");
});

test("completion timestamp must be canonical before apply can succeed", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  deps.now = () => "not-canonical";
  const result = sweep.runAuthorizedApply({
    authorization, expectedLiveMainSha: LIVE_MAIN_SHA, primaryRoot: "/repo",
    upstream: "origin/main", defaultBranch: "main", minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(calls.remove.length, 1);
  assert.equal(result.receipt.batchOutcome.status, "blocked");
});

test("closeReceiptDurably rejects an unowned parent without closing a numeric fd", () => {
  const calls = [];
  assert.throws(() => sweep.closeReceiptDurably(7, {
    parentFds: new Map(),
    close(handle) { calls.push(["close", handle]); },
    fsync(handle) { calls.push(["fsync", handle]); },
    closeParent(handle) { calls.push(["close-parent", handle]); },
  }), /not owned/u);
  assert.deepEqual(calls, []);
});

test("linked CWD primary-root resolution returns the canonical repository root", () => {
  const fixture = realLinkedWorktreeFixture();
  try {
    const providers = sweep.createRuntimeProviders();
    const linkedRoot = execFileSync("git", ["-C", fixture.target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    assert.equal(linkedRoot, realpathSync(fixture.target));
    assert.equal(providers.resolvePrimaryRoot(fixture.target), realpathSync(fixture.repository));
  } finally { rmSync(fixture.fixtureRoot, { recursive: true, force: true }); }
});

test("production target Git binding never bootstraps through unbound discovery", () => {
  const fixture = realLinkedWorktreeFixture();
  const calls = [];
  try {
    const evidence = sweep.readBoundWorktreeStatusEvidence(fixture.target, {
      execFile(file, args, options) {
        calls.push({ file, args, options });
        return execFileSync(file, args, { ...options, cwd: fixture.target });
      },
      expectedCommonGitDir: realpathSync(join(fixture.repository, ".git")),
    });
    assert.equal(evidence.available, true);
    assert.ok(calls.length > 0);
    assert.equal(calls.every(({ args }) => args.some((arg) => arg.startsWith("--git-dir="))), true);
    assert.equal(calls.some(({ args }) => args.includes("-C")), false);
  } finally { rmSync(fixture.fixtureRoot, { recursive: true, force: true }); }
});

test("production GitHub provider wires the cap and returns incomplete evidence at the cap", () => {
  const calls = [];
  const records = [1, 2].map((number) => ({
    number,
    head: { ref: `feature/${number}`, sha: String(number).repeat(40) },
  }));
  const evidence = sweep.readOpenPrEvidence("/repo", {
    queryLimit: 2,
    repositoryIdentity: sweep.APPROVED_REPOSITORY_IDENTITY,
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd, timeout: options.timeout, maxBuffer: options.maxBuffer, killSignal: options.killSignal });
      return Buffer.from(JSON.stringify([records]));
    },
  });
  assert.equal(evidence.available, false);
  assert.equal(evidence.complete, false);
  assert.match(evidence.reason, /query cap/);
  assert.deepEqual(calls, [{
    file: sweep.TRUSTED_GH_EXECUTABLE,
    args: ["api", "--hostname", "github.com", "--paginate", "--slurp", "repos/HUDongpin/MAIS-MVP/pulls?state=open&per_page=100"],
    cwd: "/",
    timeout: sweep.COMMAND_TIMEOUT_MS,
    maxBuffer: sweep.COMMAND_MAX_BUFFER_BYTES,
    killSignal: sweep.COMMAND_KILL_SIGNAL,
  }]);
  assert.equal(sweep.readOpenPrEvidence("/repo", {
    queryLimit: 2,
    execFile() { throw new Error("forbidden"); },
  }).available, false);
});

test("production open-PR provider uses the fixed host repository and paginated pulls endpoint", () => {
  const calls = [];
  const evidence = sweep.readOpenPrEvidence("/attacker/repository", {
    repositoryIdentity: sweep.APPROVED_REPOSITORY_IDENTITY,
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd, encoding: options.encoding });
      return Buffer.from(`[[{"number":223,"head":{"ref":"feature/x","sha":"${TARGET_HEAD_SHA}"}}]]`);
    },
  });
  assert.equal(evidence.available, true);
  assert.equal(evidence.complete, true);
  assert.equal(evidence.openByBranch.get("feature/x"), 223);
  assert.deepEqual(calls, [{
    file: sweep.TRUSTED_GH_EXECUTABLE,
    args: [
      "api", "--hostname", "github.com", "--paginate", "--slurp",
      "repos/HUDongpin/MAIS-MVP/pulls?state=open&per_page=100",
    ],
    cwd: "/",
    encoding: null,
  }]);
});

test("production GitHub PR lookup strips GH routing overrides and requires exact repo binding", () => {
  const result = withGitEnvironment({ GH_REPO: "attacker/other", GH_HOST: "evil.invalid" }, () => (
    sweep.readOpenPrEvidence("/repo", {
      execFile(file, args, options) {
        assert.equal(file, sweep.TRUSTED_GH_EXECUTABLE);
        assert.equal(options.env.GH_REPO, undefined);
        assert.equal(options.env.GH_HOST, undefined);
        assert.deepEqual(args, ["api", "--hostname", "github.com", "--paginate", "--slurp", "repos/HUDongpin/MAIS-MVP/pulls?state=open&per_page=100"]);
        return Buffer.from("[[]]");
      },
      repositoryIdentity: sweep.APPROVED_REPOSITORY_IDENTITY,
    })
  ));
  assert.equal(result.available, true);
});

test("production GitHub PR lookup fails closed without frozen repository identity", () => {
  let invoked = false;
  const result = sweep.readOpenPrEvidence("/repo", {
    execFile() { invoked = true; return "[]"; },
  });
  assert.equal(result.available, false);
  assert.equal(invoked, false);
});

test("production active-process provider preserves lsof status, stdout, stderr, and errors", () => {
  const calls = [];
  const inactive = sweep.readActiveProcessEvidence("/repo/wt", {
    spawn(file, args, options) {
      calls.push({ file, args, stdio: options.stdio, timeout: options.timeout, maxBuffer: options.maxBuffer, killSignal: options.killSignal });
      return { status: 1, stdout: "", stderr: "", error: undefined };
    },
  });
  assert.deepEqual(inactive, { available: true, active: false });
  assert.deepEqual(calls, [{
    file: sweep.TRUSTED_LSOF_EXECUTABLE,
    args: ["-n", "-P", "+D", "/repo/wt", "-Fp"],
    stdio: ["ignore", "pipe", "pipe"],
    timeout: sweep.COMMAND_TIMEOUT_MS,
    maxBuffer: sweep.COMMAND_MAX_BUFFER_BYTES,
    killSignal: sweep.COMMAND_KILL_SIGNAL,
  }]);
  assert.deepEqual(sweep.readActiveProcessEvidence("/repo/wt", {
    spawn: () => ({ status: 1, stdout: "", stderr: "denied", error: undefined }),
  }), { available: false, active: null });
  assert.deepEqual(sweep.readActiveProcessEvidence("/repo/wt", {
    spawn() { throw new Error("spawn failed"); },
  }), { available: false, active: null });
});

test("production active-process probe uses a fixed executable and clean environment", () => {
  let captured;
  sweep.readActiveProcessEvidence("/repo/wt", {
    spawn(file, args, options) {
      captured = { file, args, env: options.env };
      return { status: 1, stdout: "", stderr: "", error: undefined };
    },
  });
  assert.equal(captured.file, sweep.TRUSTED_LSOF_EXECUTABLE);
  assert.equal(captured.env.PATH, undefined);
  assert.equal(captured.env.GIT_SSH_COMMAND, undefined);
});

test("fingerprintFleet is order-independent and changes after topology changes", () => {
  const first = { path: "/repo", branch: "main", head: LIVE_MAIN_SHA, bare: false, detached: false };
  const second = { path: "/repo/wt", branch: "feature/x", head: TARGET_HEAD_SHA, bare: false, detached: false };
  assert.equal(sweep.fingerprintFleet([first, second]), sweep.fingerprintFleet([second, first]));
  assert.notEqual(
    sweep.fingerprintFleet([first, second]),
    sweep.fingerprintFleet([first, { ...second, head: "d".repeat(40) }]),
  );
});

function authorizedApplyFixture({
  becomeActive = false,
  manifestDrifts = false,
  leaveRegistered = false,
  leavePath = false,
  postRemovalInspectionFails = false,
  finalTopologyInspectionFails = false,
  postRemovalFleetDrift = false,
  delayedFleetDrift = false,
} = {}) {
  const topology = {
    path: "/repo/.worktrees/target-0",
    branch: "feature/target-0",
    head: TARGET_HEAD_SHA,
    bare: false,
    detached: false,
  };
  const manifest = applyManifest();
  manifest.targets[0].topologyFingerprint = sweep.fingerprintTopology(topology);
  manifest.fleetFingerprint = sweep.fingerprintFleet([topology]);
  const input = authorizationFor(manifest);
  const authorization = sweep.validateApplyAuthorization(input);
  const calls = { inspect: 0, manifest: 0, live: 0, prs: 0, pathEvidence: 0, remove: [] };
  let registered = [topology];
  let pathPresent = true;
  let removalReported = false;
  let topologyReadsAfterRemoval = 0;
  const deps = {
    readManifestBytes() {
      calls.manifest++;
      return manifestDrifts && calls.manifest > 1
        ? Buffer.concat([input.manifestBytes, Buffer.from(" ")])
        : input.manifestBytes;
    },
    readLiveMainEvidence() {
      calls.live++;
      return { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" };
    },
    readOpenPrEvidence() {
      calls.prs++;
      return { available: true, complete: true, openByBranch: new Map(), openByHead: new Map() };
    },
    readWorktrees() {
      if (removalReported) {
        topologyReadsAfterRemoval++;
        if (postRemovalInspectionFails || (finalTopologyInspectionFails && topologyReadsAfterRemoval > 1)) {
          throw new Error("topology unavailable");
        }
        if (postRemovalFleetDrift) {
          return [...registered, {
            path: "/repo/.worktrees/unrelated",
            branch: "feature/unrelated",
            head: "9".repeat(40),
            bare: false,
            detached: false,
          }];
        }
        if (delayedFleetDrift && topologyReadsAfterRemoval > 1) {
          return [...registered, {
            path: "/repo/.worktrees/unrelated",
            branch: "feature/unrelated",
            head: "9".repeat(40),
            bare: false,
            detached: false,
          }];
        }
      }
      return registered;
    },
    readPathAbsenceEvidence(path) {
      calls.pathEvidence++;
      assert.equal(path, topology.path);
      return { available: true, absent: !pathPresent };
    },
    readTargetBoundaryEvidence() {
      return { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } };
    },
    readActiveProcessEvidence() {
      return { available: true, active: false };
    },
    revalidateFleetLease() {
      return true;
    },
    validateReceiptBinding() {
      return true;
    },
    writeCheckpoint() {},
    inspectWorktree(_registered, target, evidence) {
      calls.inspect++;
      return {
        ...topology,
        exists: true,
        statusEvidence: { available: true },
        dirty: 0,
        protectedHits: [],
        mergedIntoUpstream: true,
        containedIn: [],
        ageDays: 10,
        prEvidence: { available: evidence.prEvidence.available, openPr: null },
        ownerEvidence: { available: true, owner: target.owner, task: target.task },
        processEvidence: { available: true, active: becomeActive && calls.inspect > 1 },
        targetBoundaryEvidence: { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } },
      };
    },
    removeWorktree(command) {
      calls.remove.push(command);
      removalReported = true;
      if (!leaveRegistered) registered = [];
      if (!leavePath) pathPresent = false;
      return { ok: true };
    },
    now() { return "2026-08-29T00:00:01.000Z"; },
  };
  return { authorization, calls, deps };
}

test("runAuthorizedApply revalidates its fleet lease and durably checkpoints around each mutation", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const events = [];
  const originalRemove = deps.removeWorktree;
  deps.revalidateFleetLease = () => { events.push("lease-revalidated"); return true; };
  deps.validateReceiptBinding = () => { events.push("receipt-revalidated"); return true; };
  deps.writeCheckpoint = (checkpoint) => { events.push(checkpoint.phase); };
  deps.removeWorktree = (command) => { events.push("remove"); return originalRemove(command); };
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, true);
  assert.deepEqual(events, [
    "lease-revalidated",
    "target-started",
    "lease-revalidated",
    "receipt-revalidated",
    "remove",
    "target-completed",
  ]);
  assert.equal(calls.remove.length, 1);

  const blocked = authorizedApplyFixture();
  blocked.deps.revalidateFleetLease = () => false;
  blocked.deps.writeCheckpoint = () => assert.fail("no checkpoint may be written for an invalid lease");
  const blockedResult = sweep.runAuthorizedApply({
    authorization: blocked.authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, blocked.deps);
  assert.equal(blockedResult.ok, false);
  assert.equal(blocked.calls.remove.length, 0);
  assert.match(blockedResult.receipt.results[0].reason, /fleet mutation lease/u);
});

test("target-started hook drift triggers a second complete revalidation with zero mutation", () => {
  for (const mode of ["manifest", "live", "pr", "fleet", "dirty", "protected", "process", "boundary", "lease", "receipt"]) {
    const { authorization, calls, deps } = authorizedApplyFixture();
    let afterStarted = false;
    const originalManifest = deps.readManifestBytes;
    const originalLive = deps.readLiveMainEvidence;
    const originalPr = deps.readOpenPrEvidence;
    const originalFleet = deps.readWorktrees;
    const originalInspect = deps.inspectWorktree;
    deps.writeCheckpoint = (checkpoint) => { if (checkpoint.phase === "target-started") afterStarted = true; };
    deps.readManifestBytes = () => mode === "manifest" && afterStarted
      ? Buffer.concat([originalManifest(), Buffer.from(" ")]) : originalManifest();
    deps.readLiveMainEvidence = () => mode === "live" && afterStarted
      ? { available: true, sha: "f".repeat(40), source: "gh-api-git-ref" } : originalLive();
    deps.readOpenPrEvidence = () => mode === "pr" && afterStarted
      ? { available: true, complete: true, openByBranch: new Map([["feature/target-0", 223]]), openByHead: new Map() }
      : originalPr();
    deps.readWorktrees = () => mode === "fleet" && afterStarted
      ? [...originalFleet(), { path: "/repo/.worktrees/intruder", branch: "feature/intruder", head: "e".repeat(40) }]
      : originalFleet();
    deps.inspectWorktree = (...args) => {
      const current = originalInspect(...args);
      if (mode === "dirty" && afterStarted) current.dirty = 1;
      if (mode === "protected" && afterStarted) current.protectedHits = [{ label: "local evidence", path: ".tmp/evidence" }];
      return current;
    };
    deps.readActiveProcessEvidence = () => ({ available: true, active: mode === "process" && afterStarted });
    deps.readTargetBoundaryEvidence = () => ({
      available: true,
      isDirectory: true,
      identity: { dev: "1", ino: mode === "boundary" && afterStarted ? "2" : "1" },
    });
    let leaseChecks = 0;
    deps.revalidateFleetLease = () => !(mode === "lease" && ++leaseChecks > 1);
    deps.validateReceiptBinding = () => mode !== "receipt" || !afterStarted;
    const result = sweep.runAuthorizedApply({
      authorization,
      expectedLiveMainSha: LIVE_MAIN_SHA,
      primaryRoot: "/repo",
      upstream: "origin/main",
      defaultBranch: "main",
      minAgeDays: 0,
      startedAt: "2026-08-29T00:00:00.000Z",
    }, deps);
    assert.equal(result.ok, false, mode);
    assert.equal(calls.remove.length, 0, mode);
  }
});

test("runAuthorizedApply fails closed when final target boundary evidence is missing, malformed, or throws", () => {
  for (const mode of ["missing", "malformed", "throws"]) {
    const { authorization, calls, deps } = authorizedApplyFixture();
    if (mode === "missing") delete deps.readTargetBoundaryEvidence;
    if (mode === "malformed") deps.readTargetBoundaryEvidence = () => ({ available: true });
    if (mode === "throws") deps.readTargetBoundaryEvidence = () => { throw new Error("boundary leak"); };
    const result = sweep.runAuthorizedApply({
      authorization,
      expectedLiveMainSha: LIVE_MAIN_SHA,
      primaryRoot: "/repo",
      upstream: "origin/main",
      defaultBranch: "main",
      minAgeDays: 0,
      startedAt: "2026-08-29T00:00:00.000Z",
    }, deps);
    assert.equal(result.ok, false, mode);
    assert.deepEqual(calls.remove, [], mode);
    assert.match(result.receipt.results[0].reason, /target path identity barrier/u, mode);
  }
});

test("runAuthorizedApply fails closed when final process evidence is missing, malformed, or throws", () => {
  for (const mode of ["missing", "malformed", "throws"]) {
    const { authorization, calls, deps } = authorizedApplyFixture();
    if (mode === "missing") delete deps.readActiveProcessEvidence;
    if (mode === "malformed") deps.readActiveProcessEvidence = () => ({ available: true });
    if (mode === "throws") deps.readActiveProcessEvidence = () => { throw new Error("process leak"); };
    const result = sweep.runAuthorizedApply({
      authorization,
      expectedLiveMainSha: LIVE_MAIN_SHA,
      primaryRoot: "/repo",
      upstream: "origin/main",
      defaultBranch: "main",
      minAgeDays: 0,
      startedAt: "2026-08-29T00:00:00.000Z",
    }, deps);
    assert.equal(result.ok, false, mode);
    assert.deepEqual(calls.remove, [], mode);
    assert.match(result.receipt.results[0].reason, /writer-free|active process/u, mode);
  }
});

test("runAuthorizedApply revalidates raw manifest bytes with fatal UTF-8 before mutation", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const malformed = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0x80, 0x22, 0x7d]);
  authorization.manifestSha256 = sweep.sha256Text(malformed);
  deps.readManifestBytes = () => malformed;

  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);

  assert.equal(result.ok, false);
  assert.deepEqual(calls.remove, []);
  assert.match(result.receipt.results[0].reason, /revalidation failed/u);
});

test("runAuthorizedApply revalidation rejects duplicate keys with a stable non-leaking reason", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const duplicate = Buffer.from(`{"schemaVersion":"sweep-merged-worktrees.apply-manifest.v1","schemaVersion":"${"x".repeat(1000)}","expectedLiveMainSha":"${LIVE_MAIN_SHA}","fleetFingerprint":"${TOPOLOGY_SHA}","targets":[]}`, "utf8");
  authorization.manifestSha256 = sweep.sha256Text(duplicate);
  deps.readManifestBytes = () => duplicate;
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(calls.remove, []);
  assert.equal(result.receipt.results[0].reason, "immutable manifest revalidation failed");
  assert.doesNotMatch(result.receipt.results[0].reason, /x{100}/u);
});

test("runAuthorizedApply requires a final target path identity barrier", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  deps.readTargetBoundaryEvidence = () => ({
    available: true,
    isDirectory: true,
    identity: { dev: "999", ino: "999" },
  });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(calls.remove, []);
  assert.match(result.receipt.results[0].reason, /target path identity|boundary/u);
});

test("runAuthorizedApply calculates age from one frozen runtime clock", () => {
  const { authorization, deps } = authorizedApplyFixture();
  let frozenSeen = null;
  const originalInspect = deps.inspectWorktree;
  deps.inspectWorktree = (registered, target, evidence, context) => {
    frozenSeen = context?.frozenNow ?? null;
    return originalInspect(registered, target, evidence, context);
  };
  let nowCalls = 0;
  deps.now = () => {
    nowCalls += 1;
    return nowCalls === 1 ? "2026-08-29T00:00:01.000Z" : "2030-01-01T00:00:01.000Z";
  };
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
    frozenNow: "2026-08-29T00:00:01.000Z",
  }, deps);
  assert.equal(result.ok, true);
  assert.equal(nowCalls, 1);
  assert.equal(frozenSeen, "2026-08-29T00:00:01.000Z");
});

test("runAuthorizedApply fails closed on an invalid frozen runtime clock", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 3,
    startedAt: "not-a-timestamp",
    frozenNow: "not-a-timestamp",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(calls.remove, []);
  assert.match(result.receipt.results[0].reason, /frozen runtime clock|age evidence/u);
});

test("decide does not let missing age evidence bypass a minimum age", () => {
  const decision = decide({ ...base, mergedIntoUpstream: true, ageDays: null }, { ...ctx, minAgeDays: 3 });
  assert.equal(decision.action, "skip");
  assert.match(decision.reason, /age/u);
});

test("receipt close failure still fsyncs and closes the admitted parent exactly once", () => {
  const parentFds = new Map([[7, 8]]);
  const calls = [];
  assert.throws(() => sweep.closeReceiptDurably(7, {
    parentFds,
    close(handle) { calls.push(["close-file", handle]); throw new Error("close failed"); },
    fsync(handle) { calls.push(["fsync-parent", handle]); },
    closeParent(handle) { calls.push(["close-parent", handle]); },
  }), /receipt close failed/u);
  assert.deepEqual(calls, [["close-file", 7], ["fsync-parent", 8], ["close-parent", 8]]);
  assert.equal(parentFds.has(7), false);
  assert.throws(() => sweep.closeReceiptDurably(7, {
    parentFds,
    close() { calls.push(["double-close"]); },
    fsync() { calls.push(["double-fsync"]); },
    closeParent() { calls.push(["double-parent-close"]); },
  }), /not owned/u);
  assert.equal(calls.some(([name]) => name.startsWith("double-")), false);

  const parentCloseCalls = [];
  const secondMap = new Map([[9, 10]]);
  assert.throws(() => sweep.closeReceiptDurably(9, {
    parentFds: secondMap,
    close(handle) { parentCloseCalls.push(["close-file", handle]); },
    fsync(handle) { parentCloseCalls.push(["fsync-parent", handle]); },
    closeParent(handle) { parentCloseCalls.push(["close-parent", handle]); throw new Error("parent close"); },
  }), /receipt close failed/u);
  assert.deepEqual(parentCloseCalls, [["close-file", 9], ["fsync-parent", 10], ["close-parent", 10]]);
  assert.equal(secondMap.has(9), false);
});

test("every receipt journal entry is written then fsynced with its admitted parent", () => {
  const calls = [];
  const parentFds = new Map([[7, 8]]);
  sweep.writeReceiptDurably(7, "{\"phase\":\"started\"}\n", {
    parentFds,
    write(handle, text) { calls.push(["write", handle, text]); },
    fsync(handle) { calls.push(["fsync", handle]); },
  });
  assert.deepEqual(calls, [
    ["write", 7, "{\"phase\":\"started\"}\n"],
    ["fsync", 7],
    ["fsync", 8],
  ]);
  assert.equal(parentFds.get(7), 8, "durable writes retain parent ownership until terminal close");
});

test("receipt durability state rejects exact-path replacement chmod and post-write drift", () => {
  for (const mode of ["replace-before", "chmod-before", "replace-after"]) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-binding-")));
    const path = join(root, "receipt.ndjson");
    const moved = join(root, "moved.ndjson");
    const parentFd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
    const fd = openSync(path, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
    const states = new Map([[fd, sweep.createReceiptDurabilityState(path, fd, parentFd)]]);
    try {
      if (mode === "replace-before") {
        renameSync(path, moved);
        writeFileSync(path, "foreign\n", { mode: 0o600 });
      }
      if (mode === "chmod-before") chmodSync(path, 0o644);
      assert.throws(() => sweep.writeReceiptDurably(fd, "{\"phase\":\"started\"}\n", {
        receiptStates: states,
        ...(mode === "replace-after" ? {
          afterWrite() {
            renameSync(path, moved);
            writeFileSync(path, "foreign\n", { mode: 0o600 });
          },
        } : {}),
      }), /receipt binding|durability/u, mode);
    } finally {
      closeSync(fd);
      closeSync(parentFd);
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("receipt journal recovers to the last durable newline after partial and fsync failures", () => {
  for (const failure of ["partial-write", "file-fsync", "parent-fsync"]) {
    for (const phase of ["started", "target-started", "target-completed", "terminal"]) {
      const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-recovery-")));
      const path = join(root, "receipt.ndjson");
      const parentFd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
      const fd = openSync(path, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
      const states = new Map([[fd, sweep.createReceiptDurabilityState(path, fd, parentFd)]]);
      try {
        sweep.writeReceiptDurably(fd, "{\"phase\":\"prefix\"}\n", { receiptStates: states });
        let writes = 0;
        assert.throws(() => sweep.writeReceiptDurably(fd, `${JSON.stringify({ phase })}\n`, {
          receiptStates: states,
          ...(failure === "partial-write" ? {
            write(handle, bytes, offset, length, position) {
              writes++;
              if (writes === 1) {
                writeSync(handle, bytes, offset, Math.min(5, length), position);
                throw new Error("partial");
              }
              return writeSync(handle, bytes, offset, length, position);
            },
          } : {}),
          ...(failure !== "partial-write" ? {
            fsync(handle) {
              if ((failure === "file-fsync" && handle === fd) || (failure === "parent-fsync" && handle === parentFd)) {
                throw new Error("fsync");
              }
              fsyncSync(handle);
            },
          } : {}),
        }), /receipt durability/u, `${failure}:${phase}`);
        sweep.writeReceiptDurably(fd, "{\"phase\":\"recovered\"}\n", { receiptStates: states });
        const lines = readFileSync(path, "utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
        assert.deepEqual(lines.map((entry) => entry.phase), ["prefix", "recovered"], `${failure}:${phase}`);
      } finally {
        closeSync(fd);
        closeSync(parentFd);
        rmSync(root, { recursive: true, force: true });
      }
    }
  }
});

test("receipt journal permanently stops appending when truncation recovery fails", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-recovery-stop-")));
  const path = join(root, "receipt.ndjson");
  const parentFd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
  const fd = openSync(path, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
  const states = new Map([[fd, sweep.createReceiptDurabilityState(path, fd, parentFd)]]);
  try {
    sweep.writeReceiptDurably(fd, "{\"phase\":\"prefix\"}\n", { receiptStates: states });
    assert.throws(() => sweep.writeReceiptDurably(fd, "{\"phase\":\"partial\"}\n", {
      receiptStates: states,
      write(handle, bytes, offset, length, position) {
        writeSync(handle, bytes, offset, Math.min(4, length), position);
        throw new Error("partial");
      },
    }), /receipt durability/u);
    assert.throws(() => sweep.writeReceiptDurably(fd, "{\"phase\":\"terminal\"}\n", {
      receiptStates: states,
      truncate() { throw new Error("recovery failed"); },
    }), /receipt durability/u);
    const before = readFileSync(path);
    assert.throws(() => sweep.writeReceiptDurably(fd, "{\"phase\":\"forbidden\"}\n", {
      receiptStates: states,
    }), /receipt durability/u);
    assert.deepEqual(readFileSync(path), before);
  } finally {
    closeSync(fd);
    closeSync(parentFd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("durable prefix digest and current parent pathname block same-inode tampering before removal", () => {
  for (const mode of ["truncate", "append", "overwrite", "parent-replace-hardlink"]) {
    const container = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-prefix-")));
    const parent = join(container, "parent");
    const movedParent = join(container, "moved-parent");
    mkdirSync(parent);
    const path = join(parent, "receipt.ndjson");
    const parentFd = openSync(parent, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
    const fd = openSync(path, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
    const states = new Map([[fd, sweep.createReceiptDurabilityState(path, fd, parentFd)]]);
    const { authorization, calls, deps } = authorizedApplyFixture();
    sweep.writeReceiptDurably(fd, "{\"phase\":\"started\"}\n", { receiptStates: states });
    deps.writeCheckpoint = (checkpoint) => {
      if (checkpoint.phase !== "target-started") return;
      if (mode === "truncate") truncateSync(path, 0);
      if (mode === "append") writeFileSync(path, "x", { flag: "a" });
      if (mode === "overwrite") writeSync(fd, Buffer.from("X"), 0, 1, 0);
      if (mode === "parent-replace-hardlink") {
        renameSync(parent, movedParent);
        mkdirSync(parent);
        linkSync(join(movedParent, "receipt.ndjson"), path);
      }
    };
    deps.validateReceiptBinding = () => {
      try { return sweep.validateReceiptDurability(fd, { receiptStates: states }); }
      catch { return false; }
    };
    try {
      const result = sweep.runAuthorizedApply({
        authorization,
        expectedLiveMainSha: LIVE_MAIN_SHA,
        primaryRoot: "/repo",
        upstream: "origin/main",
        defaultBranch: "main",
        minAgeDays: 0,
        startedAt: "2026-08-29T00:00:00.000Z",
      }, deps);
      assert.equal(result.ok, false, mode);
      assert.equal(calls.remove.length, 0, mode);
    } finally {
      closeSync(fd);
      closeSync(parentFd);
      rmSync(container, { recursive: true, force: true });
    }
  }

  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-receipt-nonempty-")));
  const path = join(root, "receipt.ndjson");
  writeFileSync(path, "x", { mode: 0o600 });
  const parentFd = openSync(root, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY);
  const fd = openSync(path, fsConstants.O_RDWR);
  try {
    assert.throws(() => sweep.createReceiptDurabilityState(path, fd, parentFd), /receipt binding/u);
  } finally {
    closeSync(fd);
    closeSync(parentFd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("fleet mutation lease identity binds the exact repository manifest and ordered targets", () => {
  const manifest = applyManifest(2);
  const baseIdentity = sweep.createFleetLeaseIdentity({
    repositoryTuple: TEST_REPOSITORY_TUPLE,
    manifestSha256: "8".repeat(64),
    targets: manifest.targets,
  });
  assert.match(baseIdentity, /^[0-9a-f]{64}$/u);
  assert.notEqual(baseIdentity, sweep.createFleetLeaseIdentity({
    repositoryTuple: { ...TEST_REPOSITORY_TUPLE, remoteIdentity: "attacker/repo" },
    manifestSha256: "8".repeat(64),
    targets: manifest.targets,
  }));
  assert.notEqual(baseIdentity, sweep.createFleetLeaseIdentity({
    repositoryTuple: TEST_REPOSITORY_TUPLE,
    manifestSha256: "9".repeat(64),
    targets: manifest.targets,
  }));
  assert.notEqual(baseIdentity, sweep.createFleetLeaseIdentity({
    repositoryTuple: TEST_REPOSITORY_TUPLE,
    manifestSha256: "8".repeat(64),
    targets: [...manifest.targets].reverse(),
  }));
});

test("fleet mutation lease uses O_EXCL and only removes the still-owned exact lease", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-fleet-lease-")));
  const path = join(root, "sweep-merged-worktrees.mutation-lease.json");
  const identity = "a".repeat(64);
  try {
    const lease = sweep.acquireFleetMutationLease(path, identity, { holderToken: "holder-one" });
    assert.equal(sweep.revalidateFleetMutationLease(lease, identity), true);
    assert.throws(
      () => sweep.acquireFleetMutationLease(path, identity, { holderToken: "holder-two" }),
      /lease unavailable/u,
    );
    assert.deepEqual(sweep.releaseFleetMutationLease(lease, identity), { released: true, phase: "released" });
    assert.equal(existsSync(path), false);

    const changed = sweep.acquireFleetMutationLease(path, identity, { holderToken: "holder-three" });
    writeFileSync(path, "{}\n");
    assert.equal(sweep.revalidateFleetMutationLease(changed, identity), false);
    assert.deepEqual(sweep.releaseFleetMutationLease(changed, identity), { released: false, phase: "identity-revalidation" });
    assert.equal(existsSync(path), true, "identity drift must leave the foreign or damaged lease in place");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("fleet mutation lease reports the exact unlink fsync and descriptor-close failure phase", () => {
  for (const expectedPhase of ["unlink", "parent-fsync", "lease-fd-close", "parent-fd-close"]) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "sweep-fleet-release-phase-")));
    const path = join(root, "sweep-merged-worktrees.mutation-lease.json");
    const lease = sweep.acquireFleetMutationLease(path, "b".repeat(64), { holderToken: expectedPhase });
    let closeCalls = 0;
    try {
      const result = sweep.releaseFleetMutationLease(lease, "b".repeat(64), {
        unlink(target) {
          if (expectedPhase === "unlink") throw new Error("unlink");
          rmSync(target);
        },
        fsync(handle) {
          if (expectedPhase === "parent-fsync" && handle === lease.parentFd) throw new Error("fsync");
          fsyncSync(handle);
        },
        close(handle) {
          closeCalls++;
          if (expectedPhase === "lease-fd-close" && closeCalls === 1) throw new Error("close");
          if (expectedPhase === "parent-fd-close" && closeCalls === 2) throw new Error("close");
          closeSync(handle);
        },
      });
      assert.deepEqual(result, { released: false, phase: expectedPhase });
    } finally {
      try { closeSync(lease.fd); } catch { /* already closed */ }
      try { closeSync(lease.parentFd); } catch { /* already closed */ }
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("fleet lease rejects parent path hardlink chmod and final pre-unlink replacement", () => {
  for (const mode of ["parent-replace", "hardlink", "chmod"]) {
    const container = realpathSync(mkdtempSync(join(tmpdir(), "lease-binding-")));
    const parent = join(container, "parent");
    const moved = join(container, "moved");
    mkdirSync(parent);
    const path = join(parent, "lease.json");
    const lease = sweep.acquireFleetMutationLease(path, "c".repeat(64), { holderToken: mode });
    try {
      if (mode === "parent-replace") { renameSync(parent, moved); mkdirSync(parent); linkSync(join(moved, "lease.json"), path); }
      if (mode === "hardlink") linkSync(path, join(parent, "extra-link"));
      if (mode === "chmod") chmodSync(path, 0o644);
      assert.equal(sweep.revalidateFleetMutationLease(lease, "c".repeat(64)), false, mode);
    } finally {
      sweep.releaseFleetMutationLease(lease, "c".repeat(64));
      rmSync(container, { recursive: true, force: true });
    }
  }

  const root = realpathSync(mkdtempSync(join(tmpdir(), "lease-pre-unlink-")));
  const path = join(root, "lease.json");
  const foreign = "foreign\n";
  const lease = sweep.acquireFleetMutationLease(path, "d".repeat(64), { holderToken: "replace" });
  try {
    const outcome = sweep.releaseFleetMutationLease(lease, "d".repeat(64), {
      beforeFinalUnlink() { renameSync(path, `${path}.owned`); writeFileSync(path, foreign, { mode: 0o600 }); },
    });
    assert.deepEqual(outcome, { released: false, phase: "bounded-pre-unlink-validation" });
    assert.equal(readFileSync(path, "utf8"), foreign);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("fleet lease acquisition rejects parent replacement after descriptor open", () => {
  const container = realpathSync(mkdtempSync(join(tmpdir(), "lease-acquire-parent-")));
  const parent = join(container, "parent");
  const moved = join(container, "moved");
  mkdirSync(parent);
  try {
    assert.throws(() => sweep.acquireFleetMutationLease(join(parent, "lease.json"), "e".repeat(64), {
      holderToken: "parent-race",
      afterParentOpen() { renameSync(parent, moved); mkdirSync(parent); },
    }), /lease unavailable/u);
  } finally { rmSync(container, { recursive: true, force: true }); }
});

function cliProvidersFixture({
  danglingPathAfterRemoval = false,
  finalTopologyInspectionFails = false,
  delayedFleetDrift = false,
  applyEngineThrows = false,
  completionTimestampThrows = false,
  initialTimestampThrows = false,
  initialFleetDrift = false,
  liveEvidenceFails = false,
  prEvidenceIncomplete = false,
  topologyProviderFails = false,
  dirtyTarget = false,
  leaseAcquireFails = false,
  leaseReleaseFails = false,
} = {}) {
  const topology = {
    path: "/repo/.worktrees/target-0",
    branch: "feature/target-0",
    head: TARGET_HEAD_SHA,
    bare: false,
    detached: false,
  };
  const manifest = applyManifest();
  manifest.targets[0].topologyFingerprint = sweep.fingerprintTopology(topology);
  manifest.fleetFingerprint = sweep.fingerprintFleet([topology]);
  const authorizationInput = authorizationFor(manifest);
  const manifestPath = "/authorization/sweep-manifest.json";
  const receiptPath = "/authorization/sweep-receipt.json";
  const argv = [
    "--apply",
    "--manifest", manifestPath,
    "--manifest-sha256", authorizationInput.expectedManifestSha256,
    "--expected-live-main-sha", LIVE_MAIN_SHA,
    "--receipt", receiptPath,
  ];
  let registered = [{ ...topology }];
  let removed = false;
  let topologyReadsAfterRemoval = 0;
  let receiptText = null;
  const receiptWrites = [];
  const receiptRawWrites = [];
  const mutationEvents = [];
  const calls = {
    live: 0,
    prs: 0,
    manifest: 0,
    topology: 0,
    pathEvidence: [],
    reserve: 0,
    write: 0,
    close: 0,
    remove: [],
    logs: [],
    errors: [],
    now: 0,
    leaseAcquire: 0,
    leaseRevalidate: 0,
    leaseRelease: 0,
  };
  const providers = {
    resolvePrimaryRoot: () => "/repo",
    readLiveMainEvidence() {
      calls.live++;
      return liveEvidenceFails
        ? { available: false, sha: null, source: null }
        : { available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" };
    },
    readOpenPrEvidence() {
      calls.prs++;
      return prEvidenceIncomplete
        ? { available: true, complete: false, openByBranch: new Map(), openByHead: new Map() }
        : { available: true, complete: true, openByBranch: new Map(), openByHead: new Map() };
    },
    readImmutableManifest(path) {
      calls.manifest++;
      assert.equal(path, manifestPath);
      return authorizationInput.manifestBytes;
    },
    readExternalPathEvidence(path, kind) {
      if (kind === "receipt") {
        assert.equal(path, receiptPath);
        return { available: true, absent: true, reason: null };
      }
      assert.equal(kind, "manifest");
      assert.equal(path, manifestPath);
      return { available: true, absent: false, reason: null };
    },
    readPathAbsenceEvidence(path) {
      calls.pathEvidence.push(path);
      if (path === receiptPath) return { available: true, absent: true };
      assert.equal(path, topology.path);
      return {
        available: true,
        absent: removed && !danglingPathAfterRemoval,
      };
    },
    readTargetBoundaryEvidence() {
      return { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } };
    },
    readActiveProcessEvidence() {
      return { available: true, active: false };
    },
    readWorktrees() {
      calls.topology++;
      if (topologyProviderFails) throw new Error("topology failed");
      if (initialFleetDrift && !removed) {
        return [...registered, {
          path: "/repo/.worktrees/unrelated",
          branch: "feature/unrelated",
          head: "9".repeat(40),
          bare: false,
          detached: false,
        }];
      }
      if (removed) {
        topologyReadsAfterRemoval++;
        if (finalTopologyInspectionFails && topologyReadsAfterRemoval > 1) {
          throw new Error("final topology failed");
        }
        if (delayedFleetDrift && topologyReadsAfterRemoval > 1) {
          return [...registered, {
            path: "/repo/.worktrees/unrelated",
            branch: "feature/unrelated",
            head: "9".repeat(40),
            bare: false,
            detached: false,
          }];
        }
      }
      return registered.map((entry) => ({ ...entry }));
    },
    inspectWorktree(wt, target, evidence) {
      return {
        ...wt,
        exists: true,
        statusEvidence: { available: true },
        dirty: dirtyTarget ? 1 : 0,
        protectedHits: [],
        mergedIntoUpstream: true,
        containedIn: [],
        ageDays: 10,
        prEvidence: {
          available: evidence.prEvidence.available,
          complete: evidence.prEvidence.complete,
          openPr: null,
        },
        ownerEvidence: target
          ? { available: true, owner: target.owner, task: target.task }
          : { available: false, owner: null, task: null },
        processEvidence: target
          ? { available: true, active: false }
          : { available: false, active: null },
        targetBoundaryEvidence: target
          ? { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } }
          : { available: false, isDirectory: false, identity: null },
      };
    },
    reserveReceipt(path) {
      calls.reserve++;
      assert.equal(path, receiptPath);
      return { receipt: true };
    },
    acquireFleetMutationLease(definition) {
      calls.leaseAcquire++;
      mutationEvents.push("lease-acquired");
      if (leaseAcquireFails) throw new Error("simulated competing holder");
      return { lease: true, identity: definition.identity };
    },
    revalidateFleetMutationLease(lease, identity) {
      calls.leaseRevalidate++;
      assert.deepEqual(lease, { lease: true, identity });
      mutationEvents.push("lease-revalidated");
      return true;
    },
    validateReceiptDurability() {
      mutationEvents.push("receipt-revalidated");
      return true;
    },
    releaseFleetMutationLease(lease, identity) {
      calls.leaseRelease++;
      assert.deepEqual(lease, { lease: true, identity });
      mutationEvents.push("lease-released");
      return leaseReleaseFails
        ? { released: false, phase: "parent-fsync" }
        : { released: true, phase: "released" };
    },
    writeReceipt(handle, text) {
      calls.write++;
      assert.deepEqual(handle, { receipt: true });
      receiptText = text;
      receiptRawWrites.push(text);
      const parsed = JSON.parse(text);
      receiptWrites.push(parsed);
      mutationEvents.push(`receipt-${parsed.phase ?? "terminal"}`);
    },
    closeReceipt(handle) {
      calls.close++;
      assert.deepEqual(handle, { receipt: true });
    },
    removeWorktree(command) {
      calls.remove.push(command);
      mutationEvents.push("remove");
      removed = true;
      registered = [];
      return { ok: true };
    },
    now: () => {
      calls.now++;
      if (initialTimestampThrows && calls.now === 1) {
        throw new Error("simulated initial timestamp failure at /secret/provider-credentials.json");
      }
      if (completionTimestampThrows && calls.now === 2) {
        throw new Error("simulated completion timestamp failure");
      }
      return "2026-08-29T00:00:01.000Z";
    },
    beforeMutation() {
      if (applyEngineThrows) throw new Error("simulated apply engine failure");
    },
    log: (...parts) => calls.logs.push(parts.join(" ")),
    error: (...parts) => calls.errors.push(parts.join(" ")),
  };
  return {
    argv,
    providers,
    calls,
    authorizationInput,
    manifestPath,
    receiptWrites,
    receiptRawWrites,
    mutationEvents,
    getReceipt: () => receiptText ? JSON.parse(receiptText) : null,
  };
}

test("main defaults to dry-run and exercises injected live providers without mutation", () => {
  assert.equal(sweep.main.length, 2, "main must accept an injected production-provider boundary");
  const { providers, calls } = cliProvidersFixture();
  const code = sweep.main(["--json"], providers);
  assert.equal(code, 0);
  assert.equal(calls.live, 1);
  assert.equal(calls.prs, 1);
  assert.ok(calls.topology >= 1);
  assert.equal(calls.manifest, 0);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
});

test("main durably writes started and per-target receipts before terminal and releases its exact lease", () => {
  const { argv, providers, calls, receiptWrites, receiptRawWrites, mutationEvents } = cliProvidersFixture();
  assert.equal(sweep.main(argv, providers), 0);
  assert.equal(calls.leaseAcquire, 1);
  assert.equal(calls.leaseRevalidate, 2);
  assert.equal(calls.leaseRelease, 1);
  assert.deepEqual(receiptWrites.map((entry) => entry.phase ?? "terminal"), [
    "started",
    "target-started",
    "target-completed",
    "terminal",
  ]);
  assert.equal(receiptRawWrites.every((entry) => (
    entry.endsWith("\n") && !entry.slice(0, -1).includes("\n")
  )), true, "each durable journal event must be one recoverable NDJSON record");
  assert.ok(mutationEvents.indexOf("receipt-started") < mutationEvents.indexOf("remove"));
  assert.ok(mutationEvents.indexOf("lease-revalidated") < mutationEvents.indexOf("remove"));
  assert.ok(mutationEvents.indexOf("receipt-target-started") < mutationEvents.indexOf("remove"));
  assert.ok(mutationEvents.indexOf("remove") < mutationEvents.indexOf("receipt-target-completed"));
  assert.ok(mutationEvents.indexOf("lease-released") < mutationEvents.indexOf("receipt-terminal"));
  assert.deepEqual(receiptWrites.at(-1).leaseRelease, { released: true, phase: "released" });
});

test("the sole authoritative terminal records a failed lease release as blocked", () => {
  const { argv, providers, calls, receiptWrites, mutationEvents } = cliProvidersFixture({ leaseReleaseFails: true });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(receiptWrites.filter((entry) => entry.phase === "terminal").length, 1);
  const terminal = receiptWrites.at(-1);
  assert.equal(terminal.phase, "terminal");
  assert.deepEqual(terminal.leaseRelease, { released: false, phase: "parent-fsync" });
  assert.equal(terminal.batchOutcome.status, "blocked");
  assert.match(terminal.batchOutcome.reason, /lease release failed at parent-fsync/u);
  assert.ok(mutationEvents.indexOf("lease-released") < mutationEvents.indexOf("receipt-terminal"));
  assert.equal(calls.close, 1);
});

test("main lifecycle keeps terminal lease and close outcomes consistent", () => {
  for (const mode of ["started-write", "release-throws", "terminal-write", "receipt-close", "parent-close"]) {
    const fixture = cliProvidersFixture();
    const records = [];
    const originalWrite = fixture.providers.writeReceipt;
    fixture.providers.writeReceipt = (handle, text) => {
      const record = JSON.parse(text);
      if (mode === "started-write" && record.phase === "started") throw new Error("started write");
      if (mode === "terminal-write" && record.phase === "terminal") throw new Error("terminal write");
      records.push(record);
      return originalWrite(handle, text);
    };
    if (mode === "release-throws") fixture.providers.releaseFleetMutationLease = () => { throw new Error("release"); };
    if (mode === "receipt-close" || mode === "parent-close") fixture.providers.closeReceipt = () => { throw new Error(mode); };
    const code = sweep.main(fixture.argv, fixture.providers);
    if (mode === "receipt-close" || mode === "parent-close") assert.equal(code, 0, mode);
    else assert.equal(code, 1, mode);
    if (mode === "started-write") assert.equal(fixture.calls.remove.length, 0);
    if (mode !== "terminal-write") assert.equal(records.filter((record) => record.phase === "terminal").length, 1, mode);
    if (mode === "release-throws") {
      assert.deepEqual(records.at(-1).leaseRelease, { released: false, phase: "exception" });
      assert.equal(records.at(-1).batchOutcome.status, "blocked");
    }
  }
});

test("started receipt failure terminal uses the complete postflight receipt schema", () => {
  const fixture = cliProvidersFixture();
  const originalWriteReceipt = fixture.providers.writeReceipt;
  fixture.providers.writeReceipt = (handle, text) => {
    const record = JSON.parse(text);
    if (record.phase === "started") throw new Error("started write failed");
    return originalWriteReceipt(handle, text);
  };

  assert.equal(sweep.main(fixture.argv, fixture.providers), 1);
  assert.equal(fixture.calls.topology, 2);
  assert.equal(fixture.calls.remove.length, 0);
  const terminal = fixture.receiptWrites.at(-1);
  assert.equal(terminal.phase, "terminal");
  assert.equal(terminal.schemaVersion, "sweep-merged-worktrees.postflight-receipt.v1");
  assert.equal(terminal.expectedLiveMainSha, LIVE_MAIN_SHA);
  assert.equal(terminal.observedLiveMainSha, LIVE_MAIN_SHA);
  assert.match(terminal.preTopologyFingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(terminal.postTopologyFingerprint, terminal.preTopologyFingerprint);
  assert.deepEqual(terminal.finalTopologyEvidence, {
    available: true,
    fingerprint: terminal.postTopologyFingerprint,
  });
  assert.deepEqual(terminal.claimCeiling, {
    absoluteRaceFree: false,
    writerFree: false,
    postflight: "bounded path, process, live-main, and topology observations only",
  });
  assert.deepEqual(terminal.invariants, {
    forceUsed: false,
    remoteDeletionAttempted: false,
  });
  assert.deepEqual(terminal.summary, {
    attempted: 1,
    removed: 0,
    skipped: 1,
    failed: 0,
  });
  assert.equal(terminal.results.length, 1);
  assert.equal(terminal.results[0].status, "skipped");
  assert.match(terminal.results[0].reason, /durable started receipt write failed/u);
  assert.equal(terminal.batchOutcome.status, "blocked");
});

test("main normalizes started-failure lease outcomes and reports terminal availability stably", () => {
  const cases = [
    ["false", false, "invalid-provider-result", true, false],
    ["primitive", "released", "invalid-provider-result", true, false],
    ["missing", undefined, "invalid-provider-result", true, false],
    ["wrong-phase", { released: true, phase: "unlink" }, "invalid-provider-result", true, false],
    ["throws", null, "exception", true, false],
    ["false-close", { released: false, phase: "parent-fsync" }, "parent-fsync", true, true],
    ["terminal-unavailable", { released: false, phase: "parent-fsync" }, null, false, false],
    ["terminal-unavailable-close", { released: false, phase: "parent-fsync" }, null, false, true],
  ];
  for (const [label, releaseResult, expectedPhase, terminalExpected, closeFails] of cases) {
    const fixture = cliProvidersFixture();
    const records = [];
    fixture.providers.writeReceipt = (_handle, text) => {
      const record = JSON.parse(text);
      if (record.phase === "started" || (label.startsWith("terminal-unavailable") && record.phase === "terminal")) {
        throw new Error("write failure");
      }
      records.push(record);
    };
    fixture.providers.releaseFleetMutationLease = () => {
      if (label === "throws") throw new Error("release");
      return releaseResult;
    };
    if (closeFails) fixture.providers.closeReceipt = () => { throw new Error("close"); };
    assert.equal(sweep.main(fixture.argv, fixture.providers), 1, label);
    assert.equal(fixture.calls.remove.length, 0, label);
    const terminals = records.filter((record) => record.phase === "terminal");
    assert.equal(terminals.length, terminalExpected ? 1 : 0, label);
    if (terminalExpected) {
      assert.equal(terminals[0].leaseRelease.phase, expectedPhase, label);
      assert.equal(terminals[0].batchOutcome.status, "blocked", label);
    } else {
      assert.match(fixture.calls.errors.join("\n"), /terminal unavailable; lease may remain=true/u, label);
    }
    if (closeFails) assert.match(fixture.calls.errors.join("\n"), /cleanup warning|descriptor close/u, label);
  }
});

test("lease-acquire terminal remains authoritative across distinct receipt close failures", () => {
  for (const phase of ["receipt-file-close", "receipt-parent-close"]) {
    const fixture = cliProvidersFixture({ leaseAcquireFails: true });
    fixture.providers.closeReceipt = () => { throw new Error(phase); };
    assert.equal(sweep.main(fixture.argv, fixture.providers), 1, phase);
    assert.equal(fixture.receiptWrites.filter((record) => record.phase === "terminal").length, 1, phase);
    assert.doesNotMatch(fixture.calls.errors.join("\n"), /durable receipt write failed/u, phase);
    assert.match(fixture.calls.errors.join("\n"), /cleanup warning|descriptor close/u, phase);
  }
});

test("main leaves a durable terminal audit record when the fleet lease is unavailable", () => {
  const { argv, providers, calls, receiptWrites } = cliProvidersFixture({ leaseAcquireFails: true });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.leaseAcquire, 1);
  assert.equal(calls.leaseRevalidate, 0);
  assert.equal(calls.leaseRelease, 0);
  assert.equal(calls.remove.length, 0);
  assert.equal(calls.close, 1);
  assert.equal(receiptWrites.length, 1);
  assert.equal(receiptWrites[0].phase, "terminal");
  assert.equal(receiptWrites[0].batchOutcome.status, "blocked");
  assert.match(receiptWrites[0].batchOutcome.reason, /fleet mutation lease unavailable/u);
});

test("lease-acquire terminal reads fresh postfailure topology or records it unavailable", () => {
  for (const mode of ["changed", "unavailable"]) {
    const fixture = cliProvidersFixture({ leaseAcquireFails: true });
    const originalReadWorktrees = fixture.providers.readWorktrees;
    const unrelated = {
      path: "/repo/.worktrees/postfailure-change",
      branch: "feature/postfailure-change",
      head: "8".repeat(40),
      bare: false,
      detached: false,
    };
    let reads = 0;
    fixture.providers.readWorktrees = (...args) => {
      reads++;
      if (reads > 1 && mode === "unavailable") throw new Error("postfailure topology unavailable");
      const current = originalReadWorktrees(...args);
      return reads > 1 ? [...current, unrelated] : current;
    };

    assert.equal(sweep.main(fixture.argv, fixture.providers), 1, mode);
    assert.equal(reads, 2, mode);
    assert.equal(fixture.calls.remove.length, 0, mode);
    const terminal = fixture.receiptWrites.at(-1);
    assert.equal(terminal.phase, "terminal", mode);
    assert.equal(terminal.batchOutcome.status, "blocked", mode);
    if (mode === "changed") {
      assert.equal(terminal.finalTopologyEvidence.available, true);
      assert.equal(terminal.finalTopologyEvidence.fingerprint, terminal.postTopologyFingerprint);
      assert.notEqual(terminal.preTopologyFingerprint, terminal.postTopologyFingerprint);
    } else {
      assert.deepEqual(terminal.finalTopologyEvidence, { available: false, fingerprint: null });
      assert.equal(terminal.postTopologyFingerprint, null);
      assert.match(terminal.batchOutcome.reason, /postfailure topology evidence unavailable/u);
    }
  }
});

test("lease acquisition exception conservatively reports and preserves a possible residual", () => {
  for (const terminalFails of [false, true]) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "lease-acquire-uncertain-")));
    const uncertainLease = join(root, "lease.json");
    const fixture = cliProvidersFixture();
    const records = [];
    fixture.providers.acquireFleetMutationLease = () => {
      writeFileSync(uncertainLease, "uncertain\n", { mode: 0o600 });
      throw new Error("untyped post-create failure");
    };
    fixture.providers.writeReceipt = (_handle, text) => {
      const record = JSON.parse(text);
      if (terminalFails && record.phase === "terminal") throw new Error("terminal failed");
      records.push(record);
    };
    try {
      assert.equal(sweep.main(fixture.argv, fixture.providers), 1);
      assert.equal(fixture.calls.remove.length, 0);
      assert.equal(existsSync(uncertainLease), true);
      if (terminalFails) {
        assert.equal(records.filter((record) => record.phase === "terminal").length, 0);
        assert.match(fixture.calls.errors.join("\n"), /terminal unavailable; lease may remain=true/u);
      } else {
        const terminal = records.find((record) => record.phase === "terminal");
        assert.deepEqual(terminal.leaseRelease, {
          released: false,
          phase: "acquire-uncertain",
          leaseMayRemain: true,
        });
        assert.equal(terminal.batchOutcome.status, "blocked");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("typed pre-create acquisition failure retains not-acquired semantics", () => {
  const fixture = cliProvidersFixture();
  fixture.providers.acquireFleetMutationLease = () => {
    throw sweep.createFleetLeaseAcquisitionError("not-acquired", false);
  };
  assert.equal(sweep.main(fixture.argv, fixture.providers), 1);
  assert.deepEqual(fixture.receiptWrites.at(-1).leaseRelease, {
    released: false,
    phase: "not-acquired",
    leaseMayRemain: false,
  });
});

test("top-level dry-run message and exit require the complete trusted evidence predicates", () => {
  const liveCases = [
    { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" },
    { available: true, sha: "broken", source: "gh-api-git-ref" },
  ];
  for (const liveEvidence of liveCases) {
    const { providers, calls } = cliProvidersFixture();
    providers.readLiveMainEvidence = () => liveEvidence;
    assert.equal(sweep.main([], providers), 1);
    assert.match(calls.logs.join("\n"), /BLOCKED: live remote-main evidence unavailable/u);
    assert.equal(calls.remove.length, 0);
  }

  const { providers, calls } = cliProvidersFixture();
  providers.readOpenPrEvidence = () => ({
    available: true,
    complete: true,
    openByBranch: {},
    openByHead: {},
  });
  assert.equal(sweep.main([], providers), 1);
  assert.match(calls.logs.join("\n"), /BLOCKED: live GitHub PR evidence unavailable or incomplete/u);
  assert.equal(calls.remove.length, 0);

  const jsonFixture = cliProvidersFixture();
  jsonFixture.providers.readLiveMainEvidence = () => ({
    available: true,
    sha: LIVE_MAIN_SHA,
    source: "git-ls-remote",
  });
  jsonFixture.providers.readOpenPrEvidence = () => ({
    available: true,
    complete: true,
    openByBranch: {},
    openByHead: {},
  });
  assert.equal(sweep.main(["--json"], jsonFixture.providers), 1);
  const jsonOutput = JSON.parse(jsonFixture.calls.logs.at(-1));
  assert.equal(jsonOutput.liveMainEvidenceTrusted, false);
  assert.equal(jsonOutput.githubPrEvidenceAvailable, false);
});

test("main fails closed on an initial clock failure before manifest or mutation paths", () => {
  const { providers, calls } = cliProvidersFixture({ initialTimestampThrows: true });
  assert.doesNotThrow(() => {
    assert.equal(sweep.main([
      "--apply",
      "--manifest", "/secret/provider-credentials.json",
      "--manifest-sha256", "a".repeat(64),
      "--expected-live-main-sha", LIVE_MAIN_SHA,
      "--receipt", "/secret/receipt.json",
    ], providers), 1);
  });
  assert.equal(calls.now, 1);
  assert.equal(calls.manifest, 0);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
  assert.equal(calls.errors.length, 1);
  assert.match(calls.errors[0], /initial timestamp unavailable/);
  assert.doesNotMatch(calls.errors[0], /provider-credentials|simulated/);
});

test("main validates and previews a byte-locked manifest without reserving or removing", () => {
  const { providers, calls, authorizationInput, manifestPath } = cliProvidersFixture();
  const code = sweep.main([
    "--json",
    "--manifest", manifestPath,
    "--manifest-sha256", authorizationInput.expectedManifestSha256,
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ], providers);
  assert.equal(code, 0);
  assert.equal(calls.manifest, 1);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.write, 0);
  assert.equal(calls.close, 0);
  assert.equal(calls.remove.length, 0);

  const output = JSON.parse(calls.logs.at(-1));
  assert.equal(output.apply, false);
  assert.equal(output.authorizationMode, "manifest-preview");
  assert.equal(output.previewReady, true);
  assert.equal(output.plan[0].manifestTarget, true);
  assert.equal(output.plan[0].action, "retire");
});

test("main fails closed when external manifest boundary evidence is unavailable", () => {
  const { providers, calls, authorizationInput, manifestPath } = cliProvidersFixture();
  providers.readExternalPathEvidence = (path, kind) => {
    assert.equal(path, manifestPath);
    assert.equal(kind, "manifest");
    throw new Error("fixture manifest boundary unavailable at /secret/provider-credentials.json");
  };
  const code = sweep.main([
    "--json",
    "--manifest", manifestPath,
    "--manifest-sha256", authorizationInput.expectedManifestSha256,
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ], providers);
  assert.equal(code, 1);
  assert.equal(calls.manifest, 0);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
  assert.match(calls.errors.at(-1), /external manifest path boundary unavailable/u);
  assert.doesNotMatch(calls.errors.at(-1), /provider-credentials|fixture/u);
});

test("main fails closed when external receipt boundary evidence is unavailable", () => {
  const { argv, providers, calls, manifestPath, getReceipt } = cliProvidersFixture();
  providers.readExternalPathEvidence = (path, kind) => {
    if (kind === "receipt") throw new Error("fixture receipt boundary unavailable at /secret/receipt.json");
    return { available: true, absent: false, reason: null };
  };
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.manifest, 0);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
  assert.equal(getReceipt(), null);
  assert.match(calls.errors.at(-1), /external receipt path boundary unavailable/u);
  assert.doesNotMatch(calls.errors.at(-1), /receipt\.json|fixture/u);
  assert.equal(manifestPath, "/authorization/sweep-manifest.json");
});

test("manifest preview exits nonzero when an exact target is not retirable", () => {
  const {
    providers, calls, authorizationInput, manifestPath,
  } = cliProvidersFixture({ dirtyTarget: true });
  const code = sweep.main([
    "--json",
    "--manifest", manifestPath,
    "--manifest-sha256", authorizationInput.expectedManifestSha256,
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ], providers);
  assert.equal(code, 1);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);

  const output = JSON.parse(calls.logs.at(-1));
  assert.equal(output.previewReady, false);
  assert.equal(output.plan[0].manifestTarget, true);
  assert.equal(output.plan[0].action, "skip");
  assert.match(output.plan[0].reason, /dirty/);
});

test("manifest preview fails closed on fleet drift without reserving or removing", () => {
  const { providers, calls, authorizationInput, manifestPath } = cliProvidersFixture();
  const originalReadWorktrees = providers.readWorktrees;
  providers.readWorktrees = () => originalReadWorktrees().map((entry) => ({
    ...entry,
    head: "9".repeat(40),
  }));
  const code = sweep.main([
    "--json",
    "--manifest", manifestPath,
    "--manifest-sha256", authorizationInput.expectedManifestSha256,
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ], providers);
  assert.equal(code, 1);
  assert.match(calls.errors.at(-1), /fleet topology fingerprint drift/);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
});

test("manifest preview fails closed on an exact target lock mismatch", () => {
  const { providers, calls, authorizationInput, manifestPath } = cliProvidersFixture();
  const manifest = JSON.parse(authorizationInput.manifestBytes.toString("utf8"));
  manifest.targets[0].topologyFingerprint = "f".repeat(64);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  providers.readImmutableManifest = (path) => {
    calls.manifest++;
    assert.equal(path, manifestPath);
    return manifestBytes;
  };
  const code = sweep.main([
    "--json",
    "--manifest", manifestPath,
    "--manifest-sha256", sweep.sha256Text(manifestBytes),
    "--expected-live-main-sha", LIVE_MAIN_SHA,
  ], providers);
  assert.equal(code, 1);
  assert.match(calls.errors.at(-1), /candidate lock drift/);
  assert.equal(calls.reserve, 0);
  assert.equal(calls.remove.length, 0);
});

test("main wires manifest authorization, receipt IO, lstat evidence, and injected removal adapter", () => {
  assert.equal(sweep.main.length, 2, "main must accept an injected production-provider boundary");
  const { argv, providers, calls, getReceipt } = cliProvidersFixture();
  const code = sweep.main(argv, providers);
  assert.equal(code, 0);
  assert.ok(calls.live >= 4);
  assert.ok(calls.prs >= 3);
  assert.ok(calls.manifest >= 3);
  assert.equal(calls.reserve, 1);
  assert.equal(calls.write, 4);
  assert.equal(calls.close, 1);
  assert.equal(calls.remove.length, 1);
  assert.deepEqual(calls.pathEvidence, ["/repo/.worktrees/target-0"]);
  const receipt = getReceipt();
  assert.equal(receipt.summary.removed, 1);
  assert.deepEqual(receipt.finalTopologyEvidence, {
    available: true,
    fingerprint: sweep.fingerprintFleet([]),
  });
});

test("main fails the injected apply when lstat evidence reports a dangling target entry", () => {
  assert.equal(sweep.main.length, 2, "main must accept an injected production-provider boundary");
  const { argv, providers, getReceipt } = cliProvidersFixture({ danglingPathAfterRemoval: true });
  assert.equal(sweep.main(argv, providers), 1);
  const receipt = getReceipt();
  assert.equal(receipt.results[0].status, "failed");
  assert.equal(receipt.results[0].postRemovalEvidence.pathAbsent, false);
});

test("main records final topology provider failure and never reports apply success", () => {
  assert.equal(sweep.main.length, 2, "main must accept an injected production-provider boundary");
  const { argv, providers, getReceipt } = cliProvidersFixture({ finalTopologyInspectionFails: true });
  assert.equal(sweep.main(argv, providers), 1);
  assert.deepEqual(getReceipt().finalTopologyEvidence, { available: false, fingerprint: null });
});

test("main writes a blocked batch outcome when final topology drifts after target removal", () => {
  const { argv, providers, calls, getReceipt } = cliProvidersFixture({ delayedFleetDrift: true });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.write, 4);
  const receipt = getReceipt();
  assert.equal(receipt.results[0].status, "removed");
  assert.equal(receipt.batchOutcome.status, "blocked");
  assert.match(receipt.batchOutcome.reason, /final topology fingerprint drift/);
  assert.match(calls.logs.join("\n"), /BLOCKED: final topology fingerprint drift/);
});

test("main persists the apply-engine exception as the authoritative blocked batch outcome", () => {
  const { argv, providers, calls, getReceipt } = cliProvidersFixture({ applyEngineThrows: true });
  assert.equal(sweep.main(argv, providers), 1);
  const receipt = getReceipt();
  assert.deepEqual(receipt.batchOutcome, {
    status: "blocked",
    reason: "apply engine failed closed",
  });
  assert.match(calls.logs.join("\n"), /BLOCKED: apply engine failed closed/);
});

test("main preserves removed target facts when completion timestamp capture fails", () => {
  const { argv, providers, calls, getReceipt } = cliProvidersFixture({ completionTimestampThrows: true });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.remove.length, 1);
  const receipt = getReceipt();
  assert.equal(receipt.results[0].status, "removed");
  assert.equal(receipt.batchOutcome.status, "blocked");
  assert.match(receipt.batchOutcome.reason, /completion timestamp unavailable/);
});

test("main outer catch reports failed target only when no removal evidence exists", () => {
  const { argv, providers, calls, getReceipt } = cliProvidersFixture({
    applyEngineThrows: true,
  });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.remove.length, 0);
  const receipt = getReceipt();
  assert.equal(receipt.results[0].status, "failed");
  assert.deepEqual(receipt.batchOutcome, {
    status: "blocked",
    reason: "apply engine failed closed",
  });
});

test("main closes and writes a blocked receipt when apply and completion clocks both fail", () => {
  const { argv, providers, calls, getReceipt } = cliProvidersFixture({
    applyEngineThrows: true,
    completionTimestampThrows: true,
  });
  assert.equal(sweep.main(argv, providers), 1);
  assert.equal(calls.reserve, 1);
  assert.equal(calls.write, 2);
  assert.equal(calls.close, 1);
  assert.deepEqual(getReceipt().batchOutcome, {
    status: "blocked",
    reason: "apply engine failed closed",
  });
});

test("main fails closed on live, exhaustive-PR, or topology provider errors without mutation", () => {
  assert.equal(sweep.main.length, 2, "main must accept an injected production-provider boundary");
  for (const options of [
    { liveEvidenceFails: true },
    { prEvidenceIncomplete: true },
    { topologyProviderFails: true },
  ]) {
    const { providers, calls } = cliProvidersFixture(options);
    assert.equal(sweep.main(["--json"], providers), 1);
    assert.equal(calls.remove.length, 0);
    assert.equal(calls.reserve, 0);
  }
});

test("runAuthorizedApply revalidates all evidence immediately before its sole allowed mutation", () => {
  const { authorization, calls, deps } = authorizedApplyFixture();
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, true);
  assert.equal(calls.inspect, 3);
  assert.equal(calls.manifest, 3);
  assert.equal(calls.live, 4);
  assert.equal(calls.prs, 3);
  assert.equal(calls.remove.length, 1);
  assert.equal(calls.pathEvidence, 1);
  assert.equal(sweep.isAllowedSweepMutation(calls.remove[0].file, calls.remove[0].args), true);
  assert.equal(result.receipt.summary.removed, 1);
  assert.deepEqual(result.receipt.results[0].postRemovalEvidence, {
    topologyAvailable: true,
    registrationAbsent: true,
    pathEvidenceAvailable: true,
    pathAbsent: true,
  });
});

test("runAuthorizedApply fails a reported removal when the target remains registered", () => {
  const { authorization, deps } = authorizedApplyFixture({ leaveRegistered: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(result.receipt.results[0].status, "failed");
  assert.match(result.receipt.results[0].reason, /still registered/);
  assert.equal(result.receipt.results[0].postRemovalEvidence.registrationAbsent, false);
});

test("runAuthorizedApply fails a reported removal when the target path still exists", () => {
  const { authorization, deps } = authorizedApplyFixture({ leavePath: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(result.receipt.results[0].status, "failed");
  assert.match(result.receipt.results[0].reason, /path still exists/);
  assert.equal(result.receipt.results[0].postRemovalEvidence.pathAbsent, false);
});

test("runAuthorizedApply fails closed when post-removal topology inspection fails", () => {
  const { authorization, deps } = authorizedApplyFixture({ postRemovalInspectionFails: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(result.receipt.results[0].status, "failed");
  assert.match(result.receipt.results[0].reason, /post-removal topology evidence unavailable/);
});

test("runAuthorizedApply records unavailable final topology evidence and never reports ok", () => {
  const { authorization, deps } = authorizedApplyFixture({ finalTopologyInspectionFails: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.receipt.results[0].status, "removed");
  assert.equal(result.ok, false);
  assert.deepEqual(result.receipt.finalTopologyEvidence, { available: false, fingerprint: null });
  assert.equal(result.receipt.postTopologyFingerprint, null);
  assert.match(result.postflightReason, /final topology evidence unavailable/);
});

test("runAuthorizedApply fails closed when a single removal leaves unrelated fleet drift", () => {
  const { authorization, deps } = authorizedApplyFixture({ postRemovalFleetDrift: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.receipt.results[0].status, "removed");
  assert.equal(result.ok, false);
  assert.match(result.postflightReason, /fleet topology fingerprint drift after removal/);
});

test("runAuthorizedApply fails closed when the last removal leaves unrelated fleet drift", () => {
  const topologies = [0, 1].map((index) => ({
    path: `/repo/.worktrees/target-${index}`,
    branch: `feature/target-${index}`,
    head: String(index + 2).repeat(40),
    bare: false,
    detached: false,
  }));
  const manifest = applyManifest(2);
  manifest.fleetFingerprint = sweep.fingerprintFleet(topologies);
  for (let index = 0; index < manifest.targets.length; index++) {
    manifest.targets[index].head = topologies[index].head;
    manifest.targets[index].topologyFingerprint = sweep.fingerprintTopology(topologies[index]);
  }
  const input = authorizationFor(manifest);
  const authorization = sweep.validateApplyAuthorization(input);
  let registered = topologies.map((entry) => ({ ...entry }));
  const presentPaths = new Set(registered.map((entry) => entry.path));
  const unrelated = {
    path: "/repo/.worktrees/unrelated",
    branch: "feature/unrelated",
    head: "9".repeat(40),
    bare: false,
    detached: false,
  };
  const removed = [];
  const deps = {
    readManifestBytes: () => input.manifestBytes,
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => registered.map((entry) => ({ ...entry })),
    readPathAbsenceEvidence: (path) => ({ available: true, absent: !presentPaths.has(path) }),
    readTargetBoundaryEvidence: () => ({ available: true, isDirectory: true, identity: { dev: "1", ino: "1" } }),
    readActiveProcessEvidence: () => ({ available: true, active: false }),
    revalidateFleetLease: () => true,
    validateReceiptBinding: () => true,
    writeCheckpoint: () => {},
    inspectWorktree: (wt, target, evidence) => ({
      ...wt,
      exists: true,
      statusEvidence: { available: true },
      dirty: 0,
      protectedHits: [],
      mergedIntoUpstream: true,
      containedIn: [],
      ageDays: 10,
      prEvidence: { available: evidence.prEvidence.available, openPr: null },
      ownerEvidence: { available: true, owner: target.owner, task: target.task },
      processEvidence: { available: true, active: false },
      targetBoundaryEvidence: { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } },
    }),
    removeWorktree(command) {
      const path = command.args.at(-1);
      removed.push(path);
      registered = registered.filter((entry) => entry.path !== path);
      presentPaths.delete(path);
      if (path === topologies[1].path) registered.push(unrelated);
      return { ok: true };
    },
    now: () => "2026-08-29T00:00:01.000Z",
  };
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.deepEqual(removed, topologies.map((entry) => entry.path));
  assert.deepEqual(result.receipt.results.map((entry) => entry.status), ["removed", "removed"]);
  assert.equal(result.ok, false);
  assert.match(result.postflightReason, /fleet topology fingerprint drift after removal/);
});

test("runAuthorizedApply fails closed when final topology drifts after immediate removal proof", () => {
  const { authorization, deps } = authorizedApplyFixture({ delayedFleetDrift: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.receipt.results[0].status, "removed");
  assert.equal(result.ok, false);
  assert.match(result.postflightReason, /final topology fingerprint drift/);
});

test("runAuthorizedApply skips a target that becomes active after preflight", () => {
  const { authorization, calls, deps } = authorizedApplyFixture({ becomeActive: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(calls.remove.length, 0);
  assert.equal(result.receipt.summary.skipped, 1);
  assert.match(result.receipt.results[0].reason, /active process/);
});

test("runAuthorizedApply rechecks immutable manifest bytes before action", () => {
  const { authorization, calls, deps } = authorizedApplyFixture({ manifestDrifts: true });
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(calls.remove.length, 0);
  assert.match(result.receipt.results[0].reason, /manifest digest drift/);
});

test("runAuthorizedApply refuses an initial fleet fingerprint drift without mutation", () => {
  const topology = {
    path: "/repo/.worktrees/target-0",
    branch: "feature/target-0",
    head: TARGET_HEAD_SHA,
    bare: false,
    detached: false,
  };
  const manifest = applyManifest();
  manifest.targets[0].topologyFingerprint = sweep.fingerprintTopology(topology);
  manifest.fleetFingerprint = sweep.fingerprintFleet([topology]);
  const input = authorizationFor(manifest);
  const authorization = sweep.validateApplyAuthorization(input);
  const removed = [];
  const unexpected = {
    path: "/repo/.worktrees/unexpected",
    branch: "feature/unexpected",
    head: "9".repeat(40),
    bare: false,
    detached: false,
  };
  const deps = {
    readManifestBytes: () => input.manifestBytes,
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => [topology, unexpected],
    readPathAbsenceEvidence: () => ({ available: true, absent: false }),
    inspectWorktree() { throw new Error("must not inspect after fleet drift"); },
    removeWorktree(command) { removed.push(command); return { ok: true }; },
    now: () => "2026-08-29T00:00:01.000Z",
  };
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(removed, []);
  assert.equal(result.receipt.results[0].status, "skipped");
  assert.match(result.receipt.results[0].reason, /fleet topology fingerprint drift/);
});

test("runAuthorizedApply stops the remaining batch after the first removal failure", () => {
  const topologies = [0, 1, 2].map((index) => ({
    path: `/repo/.worktrees/target-${index}`,
    branch: `feature/target-${index}`,
    head: String(index + 2).repeat(40),
    bare: false,
    detached: false,
  }));
  const manifest = applyManifest(3);
  manifest.fleetFingerprint = sweep.fingerprintFleet(topologies);
  for (let index = 0; index < manifest.targets.length; index++) {
    manifest.targets[index].head = topologies[index].head;
    manifest.targets[index].topologyFingerprint = sweep.fingerprintTopology(topologies[index]);
  }
  const input = authorizationFor(manifest);
  const authorization = sweep.validateApplyAuthorization(input);
  const removed = [];
  const deps = {
    readManifestBytes: () => input.manifestBytes,
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => topologies.map((entry) => ({ ...entry })),
    readPathAbsenceEvidence: () => ({ available: true, absent: false }),
    readTargetBoundaryEvidence: () => ({ available: true, isDirectory: true, identity: { dev: "1", ino: "1" } }),
    readActiveProcessEvidence: () => ({ available: true, active: false }),
    revalidateFleetLease: () => true,
    validateReceiptBinding: () => true,
    writeCheckpoint: () => {},
    inspectWorktree: (wt, target, evidence) => ({
      ...wt,
      exists: true,
      statusEvidence: { available: true },
      dirty: 0,
      protectedHits: [],
      mergedIntoUpstream: true,
      containedIn: [],
      ageDays: 10,
      prEvidence: { available: evidence.prEvidence.available, complete: true, openPr: null },
      ownerEvidence: { available: true, owner: target.owner, task: target.task },
      processEvidence: { available: true, active: false },
      targetBoundaryEvidence: { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } },
    }),
    removeWorktree(command) { removed.push(command.args.at(-1)); return { ok: false, reason: "simulated removal failure" }; },
    now: () => "2026-08-29T00:00:01.000Z",
  };
  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(removed, [topologies[0].path]);
  assert.equal(result.receipt.results[0].status, "failed");
  assert.deepEqual(result.receipt.results.slice(1).map((entry) => entry.status), ["skipped", "skipped"]);
  assert.match(result.receipt.results[1].reason, /batch stopped/);
});

test("runAuthorizedApply proves the first removal absent and blocks a later target that drifts", () => {
  const topologies = [0, 1].map((index) => ({
    path: `/repo/.worktrees/target-${index}`,
    branch: `feature/target-${index}`,
    head: String(index + 2).repeat(40),
    bare: false,
    detached: false,
  }));
  const manifest = applyManifest(2);
  manifest.fleetFingerprint = sweep.fingerprintFleet(topologies);
  for (let index = 0; index < manifest.targets.length; index++) {
    manifest.targets[index].head = topologies[index].head;
    manifest.targets[index].topologyFingerprint = sweep.fingerprintTopology(topologies[index]);
  }
  const input = authorizationFor(manifest);
  const authorization = sweep.validateApplyAuthorization(input);
  let registered = topologies.map((entry) => ({ ...entry }));
  const presentPaths = new Set(registered.map((entry) => entry.path));
  const removed = [];
  const deps = {
    readManifestBytes: () => input.manifestBytes,
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "gh-api-git-ref" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => registered.map((entry) => ({ ...entry })),
    readPathAbsenceEvidence: (path) => ({ available: true, absent: !presentPaths.has(path) }),
    readTargetBoundaryEvidence: () => ({ available: true, isDirectory: true, identity: { dev: "1", ino: "1" } }),
    readActiveProcessEvidence: () => ({ available: true, active: false }),
    revalidateFleetLease: () => true,
    validateReceiptBinding: () => true,
    writeCheckpoint: () => {},
    inspectWorktree: (wt, target, evidence) => ({
      ...wt,
      exists: true,
      statusEvidence: { available: true },
      dirty: 0,
      protectedHits: [],
      mergedIntoUpstream: true,
      containedIn: [],
      ageDays: 10,
      prEvidence: { available: evidence.prEvidence.available, openPr: null },
      ownerEvidence: { available: true, owner: target.owner, task: target.task },
      processEvidence: { available: true, active: false },
      targetBoundaryEvidence: { available: true, isDirectory: true, identity: { dev: "1", ino: "1" } },
    }),
    removeWorktree(command) {
      const path = command.args.at(-1);
      removed.push(path);
      registered = registered.filter((entry) => entry.path !== path);
      presentPaths.delete(path);
      if (path === topologies[0].path) registered[0].head = "e".repeat(40);
      return { ok: true };
    },
    now: () => "2026-08-29T00:00:01.000Z",
  };

  const result = sweep.runAuthorizedApply({
    authorization,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    primaryRoot: "/repo",
    upstream: "origin/main",
    defaultBranch: "main",
    minAgeDays: 0,
    startedAt: "2026-08-29T00:00:00.000Z",
  }, deps);
  assert.equal(result.ok, false);
  assert.deepEqual(removed, [topologies[0].path]);
  assert.equal(result.receipt.results[0].status, "removed");
  assert.equal(result.receipt.results[0].postRemovalEvidence.registrationAbsent, true);
  assert.equal(result.receipt.results[0].postRemovalEvidence.pathAbsent, true);
  assert.equal(result.receipt.results[1].status, "skipped");
  assert.match(result.receipt.results[1].reason, /fleet topology fingerprint drift/);
});
