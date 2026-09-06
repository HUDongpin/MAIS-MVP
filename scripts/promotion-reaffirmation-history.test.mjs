import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectPromotionReaffirmationHistory, parsePromotionHistoryGraph,
  parsePromotionRawChanges, parsePromotionAuthorityTree
} from "./promotion-reaffirmation-history.mjs";

const paths = ["authority/promotion-manifest.v2.json", "authority/reaffirmation.v2.json", "authority/promotion-shadow-receipt.v2.json"];
const sha = (letter) => letter.repeat(40);
const git = (root, ...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
  cwd: root, encoding: "utf8", env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", LC_ALL: "C" }
}).trim();
function put(root, file, text = "fixture\n") { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); }
function commit(root, files, message) { git(root, "add", "--", ...files); git(root, "commit", "--quiet", "-m", message); return git(root, "rev-parse", "HEAD"); }
function fixture(t, { receipt = true } = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "promotion-history-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, "init", "--quiet", "--initial-branch=main"); git(root, "config", "user.name", "History fixture"); git(root, "config", "user.email", "fixture@example.invalid");
  put(root, "regular.txt", "base\n"); put(root, "ma.txt", "base\n");
  const evidenceCommit = commit(root, ["regular.txt", "ma.txt"], "evidence");
  put(root, paths[0], "manifest\n"); put(root, paths[1], "descriptor\n");
  const binding = commit(root, paths.slice(0, 2), "atomic binding");
  let receiptCommit;
  if (receipt) { put(root, paths[2], "receipt\n"); receiptCommit = commit(root, [paths[2]], "receipt"); }
  return { root, evidenceCommit, binding, receiptCommit };
}
function collect(f, extra = {}) {
  return collectPromotionReaffirmationHistory({
    repoRoot: f.root, evidenceCommit: f.evidenceCommit,
    manifestPath: paths[0], descriptorPath: paths[1], receiptPath: paths[2], ...extra
  });
}
function origins(result, f) {
  assert.equal(result.changes.length, f.receiptCommit ? 3 : 2);
  assert.deepEqual(result.changes.filter((change) => change.path !== paths[2]).map((change) => change.commit), [f.binding, f.binding]);
  if (f.receiptCommit) assert.equal(result.changes.find((change) => change.path === paths[2]).commit, f.receiptCommit);
  assert.ok(result.changes.every((change) => change.status === "A"));
}
function merge(root, branch) {
  const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "merge", "--no-commit", "--no-ff", branch], { cwd: root, encoding: "utf8" });
  assert.ok([0, 1].includes(result.status), `${result.stdout}\n${result.stderr}`);
}

test("linear canonical origins are returned exactly once, including an absent Receipt", (t) => {
  for (const receipt of [false, true]) { const f = fixture(t, { receipt }); origins(collect(f), f); }
});

for (const reverse of [false, true]) {
  test(`real AA/MM/MA merge retains authority from either parent (reverse=${reverse})`, (t) => {
    const f = fixture(t); git(f.root, "branch", "side", f.evidenceCommit);
    put(f.root, "regular.txt", "main\n"); put(f.root, "ma.txt", "main\n"); commit(f.root, ["regular.txt", "ma.txt"], "main changes");
    git(f.root, "switch", "--quiet", "side"); put(f.root, "regular.txt", "side\n"); rmSync(path.join(f.root, "ma.txt")); commit(f.root, ["regular.txt", "ma.txt"], "side changes");
    if (!reverse) git(f.root, "switch", "--quiet", "main");
    merge(f.root, reverse ? "main" : "side");
    put(f.root, "regular.txt", "merged\n"); put(f.root, "ma.txt", "merged\n"); put(f.root, "new-at-merge.txt", "new\n");
    commit(f.root, ["regular.txt", "ma.txt", "new-at-merge.txt"], "resolved feature merge");
    const raw = git(f.root, "show", "--format=", "--raw", "--no-abbrev", "--no-renames", "HEAD");
    assert.match(raw, /::.* MM\tregular.txt/);
    assert.match(raw, /::.* AA\tnew-at-merge.txt/);
    assert.match(raw, reverse ? /::.* AM\tma.txt/ : /::.* MA\tma.txt/);
    origins(collect(f), f);
  });
}

test("unrelated type changes and special filenames do not enter authority history", (t) => {
  const f = fixture(t); const file = "ordinary space\ttab\nline.txt";
  put(f.root, file); commit(f.root, [file], "regular unrelated path");
  rmSync(path.join(f.root, file)); symlinkSync("synthetic-target", path.join(f.root, file)); commit(f.root, [file], "unrelated type change");
  const raw = git(f.root, "show", "--format=", "--raw", "--no-abbrev", "HEAD"); assert.match(raw, / T\t/);
  origins(collect(f), f);
});

for (const mode of ["edit", "delete", "chmod", "type", "new-receipt"]) {
  test(`merge-authored authority ${mode} is rejected`, (t) => {
    const f = fixture(t, { receipt: mode !== "new-receipt" });
    git(f.root, "branch", "side"); put(f.root, "left"); commit(f.root, ["left"], "left");
    git(f.root, "switch", "--quiet", "side"); put(f.root, "right"); commit(f.root, ["right"], "right");
    git(f.root, "switch", "--quiet", "main"); merge(f.root, "side");
    const target = mode === "new-receipt" ? paths[2] : paths[0];
    if (mode === "edit" || mode === "new-receipt") put(f.root, target, "novel authority\n");
    if (mode === "delete") rmSync(path.join(f.root, target));
    if (mode === "chmod") chmodSync(path.join(f.root, target), 0o755);
    if (mode === "type") { rmSync(path.join(f.root, target)); symlinkSync("other", path.join(f.root, target)); }
    commit(f.root, [target], `bad merge ${mode}`);
    assert.throws(() => collect(f), /AUTHORITY_MERGE_CHANGE/);
  });
}

test("merge cannot create a binding from two parents without authority", (t) => {
  const f = fixture(t); git(f.root, "switch", "--quiet", "-c", "bare", f.evidenceCommit); git(f.root, "branch", "other");
  put(f.root, "left"); commit(f.root, ["left"], "left"); git(f.root, "switch", "--quiet", "other"); put(f.root, "right"); commit(f.root, ["right"], "right");
  merge(f.root, "bare"); put(f.root, paths[0]); put(f.root, paths[1]); commit(f.root, paths.slice(0, 2), "merge-created authority");
  assert.throws(() => collect(f), /AUTHORITY_MERGE_CHANGE/);
});

test("resolving a changed authority back to one canonical parent still rejects history", (t) => {
  const f = fixture(t); git(f.root, "branch", "side"); put(f.root, "left"); commit(f.root, ["left"], "left");
  git(f.root, "switch", "--quiet", "side"); put(f.root, paths[0], "tampered\n"); commit(f.root, [paths[0]], "side authority edit");
  git(f.root, "switch", "--quiet", "main"); merge(f.root, "side"); put(f.root, paths[0], "manifest\n"); commit(f.root, [paths[0]], "restore canonical in merge");
  assert.throws(() => collect(f), /AUTHORITY_MERGE_CHANGE/);
});

test("ordinary authority edits and delete/readd stay visible to atomic add-only validation", (t) => {
  const f = fixture(t); put(f.root, paths[0], "changed\n"); commit(f.root, [paths[0]], "edit");
  rmSync(path.join(f.root, paths[1])); commit(f.root, [paths[1]], "delete"); put(f.root, paths[1], "descriptor\n"); commit(f.root, [paths[1]], "readd");
  const changes = collect(f).changes;
  assert.equal(changes.filter((x) => x.path === paths[0]).length, 2);
  assert.ok(changes.some((x) => x.status === "M")); assert.ok(changes.some((x) => x.status === "D"));
});

test("non-ancestor evidence, unavailable objects and unsafe paths fail closed", (t) => {
  const f = fixture(t);
  assert.throws(() => collect(f, { evidenceCommit: sha("f") }), /HISTORY_GIT|HISTORY_OBJECT/);
  assert.throws(() => collect(f, { headCommit: f.evidenceCommit, evidenceCommit: f.binding }), /HISTORY_ANCESTRY/);
  for (const bad of ["../outside", "/absolute", "authority//file", "authority/./file", "authority\\file", "authority/file\0suffix", ":(glob)*"]) {
    assert.throws(() => collect(f, { manifestPath: bad }), /HISTORY_PATH/);
  }
  assert.throws(() => collect(f, { descriptorPath: paths[0] }), /HISTORY_PATH/);
});

test("strict parsers reject incomplete graph, unsafe UTF8, malformed raw records and path substitution", () => {
  const a = sha("a"), b = sha("b");
  for (const raw of [Buffer.from([0xff]), Buffer.from(`${a} ${b}\n${a} ${b}\n`), Buffer.from(`${a} nope\n`), Buffer.from(`${a} ${a}\n`), Buffer.from(`${a} ${b}`)]) {
    assert.throws(() => parsePromotionHistoryGraph(raw), /HISTORY_(UTF8|GRAPH)/);
  }
  for (const raw of [Buffer.from(`:100644 100644 ${a} ${b} M\0`), Buffer.from(`::100644 100644 100644 ${a} ${a} ${b} MM\0${paths[0]}\0`), Buffer.from(`:100644 100644 ${a} ${b} M\0outside\0`)]) {
    assert.throws(() => parsePromotionRawChanges(raw, new Set(paths), a), /HISTORY_(RAW|PATH)/);
  }
  assert.throws(() => parsePromotionAuthorityTree(Buffer.from(`100644 blob ${a}\toutside\0`), new Set(paths)), /HISTORY_PATH/);
  assert.throws(() => parsePromotionAuthorityTree(Buffer.from([0xff]), new Set(paths)), /HISTORY_UTF8/);
});

test("a three-parent merge inherits sealed authority without recounting origins", (t) => {
  const f = fixture(t);
  for (const branch of ["side-one", "side-two"]) {
    git(f.root, "switch", "--quiet", "-c", branch, f.evidenceCommit);
    put(f.root, branch); commit(f.root, [branch], branch);
  }
  git(f.root, "switch", "--quiet", "main");
  git(f.root, "merge", "--no-ff", "--no-edit", "side-one", "side-two");
  const result = collect(f);
  assert.equal(result.commits.get(result.headCommit).length, 3);
  origins(result, f);
});

test("real invalid UTF8 Git paths outside authority still fail the full-history text audit", (t) => {
  const f = fixture(t);
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], { cwd: f.root, input: "fixture", encoding: "utf8" }).trim();
  const entry = Buffer.concat([Buffer.from(`100644 ${blob}\tunrelated-`), Buffer.from([0xff]), Buffer.from(".txt\0")]);
  execFileSync("git", ["update-index", "-z", "--index-info"], { cwd: f.root, input: entry });
  git(f.root, "commit", "--quiet", "-m", "invalid path fixture");
  assert.throws(() => collect(f), /HISTORY_UTF8/);
});

test("real shallow history and a missing parent object cannot prove authority", (t) => {
  const f = fixture(t);
  const shallow = realpathSync(mkdtempSync(path.join(tmpdir(), "promotion-shallow-")));
  t.after(() => rmSync(shallow, { recursive: true, force: true }));
  git(f.root, "clone", "--quiet", "--depth=1", `file://${f.root}`, shallow);
  assert.throws(() => collect({ ...f, root: shallow }), /HISTORY_SHALLOW/);
  rmSync(path.join(f.root, ".git", "objects", f.binding.slice(0, 2), f.binding.slice(2)));
  assert.throws(() => collect(f), /HISTORY_(GIT|ANCESTRY|GRAPH)/);
});

test("graph record limits and empty or duplicate authority tree tokens are explicit failures", () => {
  const many = Array.from({ length: 10_001 }, (_, index) => `${(index + 1).toString(16).padStart(40, "0")}\n`).join("");
  assert.throws(() => parsePromotionHistoryGraph(Buffer.from(many)), /HISTORY_GRAPH_LIMIT/);
  const row = `100644 blob ${sha("a")}\t${paths[0]}\0`;
  assert.throws(() => parsePromotionAuthorityTree(Buffer.from(row + row), new Set(paths)), /HISTORY_PATH/);
  assert.throws(() => parsePromotionAuthorityTree(Buffer.from("\0"), new Set(paths)), /HISTORY_TREE/);
});

function objectParents(root, commit) {
  return git(root, "--no-replace-objects", "cat-file", "-p", commit).split("\n")
    .filter((line) => line.startsWith("parent ")).map((line) => line.slice(7));
}
function mergeWithTree(root, treeCommit, parents) {
  const tree = git(root, "rev-parse", `${treeCommit}^{tree}`);
  const merged = git(root, "commit-tree", tree, ...parents.flatMap((parent) => ["-p", parent]), "-m", "synthetic merge object");
  git(root, "update-ref", "HEAD", merged);
  return merged;
}
function withGraft(root, kind, line, action) {
  const graftPath = kind === "env" ? path.join(root, "custom-grafts") : path.join(root, ".git", "info", "grafts");
  mkdirSync(path.dirname(graftPath), { recursive: true });
  writeFileSync(graftPath, `${line}\n`);
  const previous = process.env.GIT_GRAFT_FILE;
  if (kind === "env") process.env.GIT_GRAFT_FILE = graftPath;
  else delete process.env.GIT_GRAFT_FILE;
  try { return action(); }
  finally {
    if (previous === undefined) delete process.env.GIT_GRAFT_FILE;
    else process.env.GIT_GRAFT_FILE = previous;
    assert.equal(readFileSync(graftPath, "utf8"), `${line}\n`, "collector must not change user graft data");
  }
}

for (const kind of ["default", "env", "linked-common"]) {
  test(`${kind} graft cannot hide the real third parent authority change`, (t) => {
    const f = fixture(t);
    git(f.root, "switch", "--quiet", "-c", "absent-side", f.evidenceCommit);
    put(f.root, "side.txt"); const absent = commit(f.root, ["side.txt"], "absent side");
    git(f.root, "switch", "--quiet", "-c", "bad-side", f.receiptCommit);
    put(f.root, paths[0], "tampered\n"); const bad = commit(f.root, [paths[0]], "bad parent");
    const parents = [f.receiptCommit, absent, bad];
    const head = mergeWithTree(f.root, f.receiptCommit, parents);
    assert.deepEqual(objectParents(f.root, head), parents);
    assert.throws(() => collect(f), /AUTHORITY_MERGE_CHANGE/);
    let selected = f;
    if (kind === "linked-common") {
      const linked = path.join(f.root, "linked");
      git(f.root, "worktree", "add", "--quiet", "--detach", linked, head);
      selected = { ...f, root: linked };
    }
    withGraft(f.root, kind, `${head} ${f.receiptCommit} ${absent}`, () => {
      assert.deepEqual(objectParents(f.root, head), parents);
      assert.throws(() => collect(selected), /AUTHORITY_MERGE_CHANGE/);
    });
  });
}

for (const kind of ["default", "env"]) {
  test(`${kind} evidence-boundary graft cannot exclude real side-branch mutations`, (t) => {
    const f = fixture(t);
    const independentRoot = git(f.root, "commit-tree", git(f.root, "rev-parse", `${f.evidenceCommit}^{tree}`), "-m", "independent root");
    const imported = git(f.root, "commit-tree", git(f.root, "rev-parse", `${f.receiptCommit}^{tree}`), "-p", independentRoot, "-m", "other authority origin");
    git(f.root, "switch", "--quiet", "-c", "foreign", imported);
    put(f.root, paths[0], "bad\n"); const bad = commit(f.root, [paths[0]], "mutate foreign authority");
    put(f.root, paths[0], "manifest\n"); const restored = commit(f.root, [paths[0]], "restore foreign authority");
    mergeWithTree(f.root, f.receiptCommit, [f.receiptCommit, restored]);
    assert.deepEqual(objectParents(f.root, f.evidenceCommit), []);
    const assertHistory = () => {
      const result = collect(f);
      assert.ok(result.commits.has(bad), "real mutation must not disappear across the evidence cutoff");
      assert.ok(result.changes.some((change) => change.commit === bad && change.status === "M"));
      assert.equal(result.changes.filter((change) => change.status === "A").length, 6);
      assert.ok(result.changes.length > 3, "old atomic workflow must still see the extra origin/mutations");
    };
    assertHistory();
    withGraft(f.root, kind, `${f.evidenceCommit} ${restored}`, assertHistory);
  });

  test(`${kind} harmless graft is ignored without changing real parents or origins`, (t) => {
    const f = fixture(t); const physical = objectParents(f.root, f.receiptCommit);
    withGraft(f.root, kind, `${f.receiptCommit} ${physical.join(" ")}`, () => {
      const result = collect(f);
      assert.deepEqual(result.commits.get(f.receiptCommit), physical);
      origins(result, f);
    });
  });
}
