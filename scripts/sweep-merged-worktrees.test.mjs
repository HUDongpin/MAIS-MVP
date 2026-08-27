import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseWorktreeList, parseContainingRefs, scanProtectedIgnored, decide, REBUILDABLE,
} from "./sweep-merged-worktrees.mjs";

test("parseWorktreeList reads branches, detached heads and bare repos", () => {
  const wts = parseWorktreeList(
    [
      "worktree /repo", "HEAD aaa", "branch refs/heads/main", "",
      "worktree /repo/.worktrees/x", "HEAD bbb", "branch refs/heads/feature/x", "",
      "worktree /repo/.worktrees/d", "HEAD ccc", "detached", "",
      "worktree /bare", "bare", "",
    ].join("\n"),
  );
  assert.equal(wts.length, 4);
  assert.equal(wts[0].branch, "main");
  assert.equal(wts[1].branch, "feature/x");
  assert.equal(wts[2].detached, true);
  assert.equal(wts[2].branch, null);
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

const base = {
  path: "/repo/.worktrees/x", branch: "feature/x", bare: false, exists: true, dirty: 0,
  protectedHits: [], mergedIntoUpstream: false, containedIn: [], ageDays: 5, openPr: null,
};
const ctx = { primaryRoot: "/repo", upstream: "origin/main", defaultBranch: "main", minAgeDays: 0 };
const reasons = (o) => decide({ ...base, ...o }, ctx);

test("decide retires a clean worktree whose commits are upstream", () => {
  assert.equal(reasons({ mergedIntoUpstream: true }).action, "retire");
});

test("decide retires when the tip is contained in another ref", () => {
  const d = reasons({ containedIn: ["other/branch"] });
  assert.equal(d.action, "retire");
  assert.match(d.reason, /other\/branch/);
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

test("decide never touches a dirty worktree even when merged", () => {
  assert.equal(reasons({ dirty: 3, mergedIntoUpstream: true }).action, "skip");
});

test("decide protects ignored content git status cannot see", () => {
  const d = reasons({ mergedIntoUpstream: true, protectedHits: [{ label: "local database", path: "x", size: 1 }] });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /local database/);
});

test("decide keeps a branch with an open PR", () => {
  assert.equal(reasons({ mergedIntoUpstream: true, openPr: 161 }).action, "skip");
});

test("decide keeps unique work that exists in no other ref", () => {
  const d = reasons({ mergedIntoUpstream: false, containedIn: [] });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /no other ref/);
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
