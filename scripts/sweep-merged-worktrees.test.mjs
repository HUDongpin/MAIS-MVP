import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync, symlinkSync,
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
    assert.equal(scanned.length, 1);
    assert.equal(scanned[0].label, "local evidence directory");
    const retained = sweep.retainGitIgnored(dir, scanned);
    assert.equal(retained.length, 1);
    assert.equal(retained[0].path, join(deep, ".tmp"));
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
      file: "git",
      args: ["--no-optional-locks", "-C", "/repo/wt", "rev-parse", "--absolute-git-dir"],
      cwd: null,
    },
    {
      file: "git",
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
      file: "git",
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
      file: "git",
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
      file: "git",
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
  assert.equal(calls.length, 5);
  for (const call of calls) {
    assert.equal(call.file, "git");
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
      file: "git",
      args: ["--no-optional-locks", "-C", "/repo/wt", "rev-parse", "--absolute-git-dir"],
      cwd: null,
      input: null,
    },
    {
      file: "git",
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
      file: "git",
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
      file: "git",
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
      file: "git",
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
  liveMainEvidence: { available: true, sha: "a".repeat(40), source: "git-ls-remote" },
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
    liveMainEvidence: { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" },
  };
}

test("validateApplyAuthorization requires a byte-locked immutable manifest for --apply", () => {
  const result = sweep.validateApplyAuthorization({
    apply: true,
    manifestBytes: null,
    expectedManifestSha256: null,
    expectedLiveMainSha: LIVE_MAIN_SHA,
    liveMainEvidence: { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" },
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
    assert.match(result.reason, /UTF-8/);
  }
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
    liveMainEvidence: { available: true, sha: "5".repeat(40), source: "git-ls-remote" },
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
    file: "git",
    args: ["worktree", "remove", "--", "/repo/.worktrees/x"],
  });
  assert.equal(command.args.includes("--force"), false);
  assert.equal(sweep.isAllowedSweepMutation(command.file, command.args), true);
  assert.equal(sweep.isAllowedSweepMutation("git", ["worktree", "remove", "--force", "/repo/.worktrees/x"]), false);
  assert.equal(sweep.isAllowedSweepMutation("git", ["push", "origin", "--delete", "feature/x"]), false);
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
  assert.equal(receipt.results[0].head, TARGET_HEAD_SHA);
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

test("production live-main provider wires an exact ls-remote query and fails closed on errors", () => {
  const calls = [];
  const evidence = sweep.readLiveMainEvidence("/repo", "main", {
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd });
      return `${LIVE_MAIN_SHA}\trefs/heads/main\n`;
    },
  });
  assert.deepEqual(evidence, { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" });
  assert.deepEqual(calls, [{
    file: "git",
    args: ["--no-optional-locks", "ls-remote", "--heads", "origin", "refs/heads/main"],
    cwd: "/repo",
  }]);
  assert.equal(sweep.readLiveMainEvidence("/repo", "main", {
    execFile() { throw new Error("offline"); },
  }).available, false);
});

test("production GitHub provider wires the cap and returns incomplete evidence at the cap", () => {
  const calls = [];
  const records = [1, 2].map((number) => ({
    number,
    headRefName: `feature/${number}`,
    headRefOid: String(number).repeat(40),
  }));
  const evidence = sweep.readOpenPrEvidence("/repo", {
    queryLimit: 2,
    execFile(file, args, options) {
      calls.push({ file, args, cwd: options.cwd });
      return JSON.stringify(records);
    },
  });
  assert.equal(evidence.available, false);
  assert.equal(evidence.complete, false);
  assert.match(evidence.reason, /query cap/);
  assert.deepEqual(calls, [{
    file: "gh",
    args: ["pr", "list", "--state", "open", "--limit", "2", "--json", "number,headRefName,headRefOid"],
    cwd: "/repo",
  }]);
  assert.equal(sweep.readOpenPrEvidence("/repo", {
    queryLimit: 2,
    execFile() { throw new Error("forbidden"); },
  }).available, false);
});

test("production active-process provider preserves lsof status, stdout, stderr, and errors", () => {
  const calls = [];
  const inactive = sweep.readActiveProcessEvidence("/repo/wt", {
    spawn(file, args, options) {
      calls.push({ file, args, stdio: options.stdio });
      return { status: 1, stdout: "", stderr: "", error: undefined };
    },
  });
  assert.deepEqual(inactive, { available: true, active: false });
  assert.deepEqual(calls, [{
    file: "lsof",
    args: ["-n", "-P", "+D", "/repo/wt", "-Fp"],
    stdio: ["ignore", "pipe", "pipe"],
  }]);
  assert.deepEqual(sweep.readActiveProcessEvidence("/repo/wt", {
    spawn: () => ({ status: 1, stdout: "", stderr: "denied", error: undefined }),
  }), { available: false, active: null });
  assert.deepEqual(sweep.readActiveProcessEvidence("/repo/wt", {
    spawn() { throw new Error("spawn failed"); },
  }), { available: false, active: null });
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
      return { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" };
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
      }
      return registered;
    },
    readPathAbsenceEvidence(path) {
      calls.pathEvidence++;
      assert.equal(path, topology.path);
      return { available: true, absent: !pathPresent };
    },
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
  assert.match(result.receipt.results[0].reason, /UTF-8/);
});

function cliProvidersFixture({
  danglingPathAfterRemoval = false,
  finalTopologyInspectionFails = false,
  liveEvidenceFails = false,
  prEvidenceIncomplete = false,
  topologyProviderFails = false,
  dirtyTarget = false,
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
  };
  const providers = {
    resolvePrimaryRoot: () => "/repo",
    readLiveMainEvidence() {
      calls.live++;
      return liveEvidenceFails
        ? { available: false, sha: null, source: null }
        : { available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" };
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
    readPathAbsenceEvidence(path) {
      calls.pathEvidence.push(path);
      if (path === receiptPath) return { available: true, absent: true };
      assert.equal(path, topology.path);
      return {
        available: true,
        absent: removed && !danglingPathAfterRemoval,
      };
    },
    readWorktrees() {
      calls.topology++;
      if (topologyProviderFails) throw new Error("topology failed");
      if (removed) {
        topologyReadsAfterRemoval++;
        if (finalTopologyInspectionFails && topologyReadsAfterRemoval > 1) {
          throw new Error("final topology failed");
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
      };
    },
    reserveReceipt(path) {
      calls.reserve++;
      assert.equal(path, receiptPath);
      return { receipt: true };
    },
    writeReceipt(handle, text) {
      calls.write++;
      assert.deepEqual(handle, { receipt: true });
      receiptText = text;
    },
    closeReceipt(handle) {
      calls.close++;
      assert.deepEqual(handle, { receipt: true });
    },
    removeWorktree(command) {
      calls.remove.push(command);
      removed = true;
      registered = [];
      return { ok: true };
    },
    now: () => "2026-08-29T00:00:01.000Z",
    log: (...parts) => calls.logs.push(parts.join(" ")),
    error: (...parts) => calls.errors.push(parts.join(" ")),
  };
  return {
    argv,
    providers,
    calls,
    authorizationInput,
    manifestPath,
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
  assert.equal(calls.write, 1);
  assert.equal(calls.close, 1);
  assert.equal(calls.remove.length, 1);
  assert.deepEqual(calls.pathEvidence, [
    "/authorization/sweep-receipt.json",
    "/repo/.worktrees/target-0",
  ]);
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
  assert.equal(calls.inspect, 2);
  assert.equal(calls.manifest, 2);
  assert.equal(calls.live, 3);
  assert.equal(calls.prs, 2);
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
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" }),
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
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => topologies.map((entry) => ({ ...entry })),
    readPathAbsenceEvidence: () => ({ available: true, absent: false }),
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
    readLiveMainEvidence: () => ({ available: true, sha: LIVE_MAIN_SHA, source: "git-ls-remote" }),
    readOpenPrEvidence: () => ({ available: true, complete: true, openByBranch: new Map(), openByHead: new Map() }),
    readWorktrees: () => registered.map((entry) => ({ ...entry })),
    readPathAbsenceEvidence: (path) => ({ available: true, absent: !presentPaths.has(path) }),
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
