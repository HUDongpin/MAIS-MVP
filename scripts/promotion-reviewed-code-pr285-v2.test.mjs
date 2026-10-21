import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { BASE, OLD_HEAD, OLD_BASE, HISTORICAL_BASE, HISTORICAL_E2, SOURCE, SOURCE_TREE, SOURCE_INVENTORY, SOURCE_PATHS, CODE_PATHS, EVIDENCE_PATHS, DIRECTORY, ADMISSION, IDENTITIES, PERMISSIONS, COMMANDS, OBSERVATION_SHA, PULL_REQUEST, hash, inventory, preflight, assertMaterializedTree, verifyTestRecords, verifyNodeTestReport, verifyCurrentProof, bindHistoricalDecision, TEST_COUNTS, TEST_TITLE_DIGESTS, verifyDecision } from "./promotion-reviewed-code-pr285-v2.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = value => hash(Buffer.from(stable(value)));
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const observation = () => readFileSync(path.join(root, "coordination/integration/reviewed-code/pr283-e2/source-observation.json"));

// Synthetic review records are negative-test inputs, never independent approval.
// All writes/commits are confined to the disposable repository, with read-only
// access to real historical objects. Sparse fixtures test metadata only.
function fixture(run, mutate = () => {}, extraTooling = []) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr283-repair-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic Gate Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...CODE_PATHS, `${DIRECTORY}/`].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", SOURCE);
    for (const file of CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    for (const file of extraTooling) write(repo, file, "unreviewed tooling\n");
    const commit = (...files) => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic contract fixture; not acceptance"); };
    commit(...CODE_PATHS, ...extraTooling);
    const tooling = git(repo, "rev-parse", "HEAD"), toolingDigest = digest(inventory(repo, SOURCE, tooling));
    const checks = JSON.stringify({ schemaVersion: "promotion-pr285-v2-source-checks.v1", sourceCommit: SOURCE, toolingRelease: tooling, result: "pass", syntheticFixture: true }) + "\n";
    write(repo, `${DIRECTORY}/source-checks.json`, checks);
    write(repo, `${DIRECTORY}/source-observation.json`, observation());
    write(repo, `${DIRECTORY}/source-inventory.json`, stable(inventory(repo, BASE, SOURCE)) + "\n");
    const reviews = {};
    for (const role of ["A11", "A23"]) {
      const reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`, report = `Synthetic ${role} fixture, not independent acceptance.\n`;
      write(repo, reportPath, report);
      const review = { schemaVersion: "promotion-reviewed-code-review.v1", role, reviewerIdentity: IDENTITIES[role], reviewedAt: "2026-10-20T00:00:00.000Z", reviewedSource: SOURCE, reviewedTooling: tooling, toolingDigest, sourceInventoryDigest: SOURCE_INVENTORY, observationRawSha256: OBSERVATION_SHA, checksRawSha256: hash(Buffer.from(checks)), result: "approved-for-ordinary-code-required-check", report: { path: reportPath, rawSha256: hash(Buffer.from(report)) }, liveAllowed: false };
      mutate({ kind: "review", role, value: review, repo });
      const bytes = JSON.stringify(review) + "\n";
      write(repo, `${DIRECTORY}/${role.toLowerCase()}-review.json`, bytes);
      reviews[role] = { decisionRawSha256: hash(Buffer.from(bytes)), reportRawSha256: hash(Buffer.from(report)) };
    }
    const admission = { schemaVersion: "promotion-reviewed-code-pr285-after-pr287.v2", baseCommit: BASE, sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY, pullRequest: PULL_REQUEST, toolingRelease: tooling, toolingTree: git(repo, "rev-parse", `${tooling}^{tree}`), toolingDigest, observationRawSha256: OBSERVATION_SHA, checksRawSha256: hash(Buffer.from(checks)), reviews, permissions: PERMISSIONS };
    mutate({ kind: "admission", value: admission, repo });
    write(repo, ADMISSION, JSON.stringify(admission) + "\n"); commit(...EVIDENCE_PATHS);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ number: PULL_REQUEST, pull_request: { base: { sha: BASE }, head: { sha: git(repo, "rev-parse", "HEAD") } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, JSON.stringify(value)); return preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, eventPath, event, check, commit });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("source is the exact history-preserving sync of old PR285 and reviewed PR287 main", () => {
  assert.equal(git(root, "show", "-s", "--format=%P", SOURCE), `${OLD_HEAD} ${BASE}`);
  assert.equal(git(root, "rev-parse", `${SOURCE}^{tree}`), SOURCE_TREE);
  assert.equal(digest(inventory(root, BASE, SOURCE)), SOURCE_INVENTORY);
  assert.deepEqual(git(root, "diff", "--name-only", BASE, SOURCE).split("\n"), [...SOURCE_PATHS]);
  assert.equal(hash(observation()), OBSERVATION_SHA);
  assert.equal(SOURCE_PATHS.length, 13); assert.equal(CODE_PATHS.length, 4); assert.equal(EVIDENCE_PATHS.length, 8);
  assert.equal(PULL_REQUEST, 285); assert.ok(Object.values(PERMISSIONS).every(v => v === false));
});
test("real source plus exact synthetic tooling/evidence passes metadata preflight", () => fixture(({ check, evidence, tooling }) => {
  const result = check(); assert.equal(result.admissionCommit, evidence); assert.equal(result.admission.toolingRelease, tooling); assert.deepEqual(result.admission.permissions, PERMISSIONS);
}));
test("real preserving main merge keeps evidence binding and rejects an extra descendant", () => fixture(({ repo, check, evidence }) => {
  const merge = git(repo, "commit-tree", `${evidence}^{tree}`, "-p", BASE, "-p", evidence, "-m", "Synthetic preserving merge");
  git(repo, "checkout", "--detach", "-q", merge);
  const result = check("push", { ref: "refs/heads/main", before: BASE, after: merge });
  assert.equal(result.head, merge); assert.equal(result.admissionCommit, evidence); assert.notEqual(merge, evidence);
  const child = git(repo, "commit-tree", `${merge}^{tree}`, "-p", merge, "-m", "Synthetic unchanged tree");
  git(repo, "checkout", "--detach", "-q", child);
  assert.throws(() => check("push", { ref: "refs/heads/main", before: BASE, after: child }), /REVIEWED_CODE_COMPOSITION/);
}));
test("wrong PR, base, event head, push ref and changed push base are rejected", () => fixture(({ check, evidence }) => {
  for (const number of [283, 284, 286]) assert.throws(() => check("pull_request", { number, pull_request: { base: { sha: BASE }, head: { sha: evidence } } }), /REVIEWED_CODE_PR_BASE/);
  assert.throws(() => check("pull_request", { number: PULL_REQUEST, pull_request: { base: { sha: SOURCE }, head: { sha: evidence } } }), /REVIEWED_CODE_PR_BASE/);
  assert.throws(() => check("pull_request", { number: PULL_REQUEST, pull_request: { base: { sha: BASE }, head: { sha: SOURCE } } }), /REVIEWED_CODE_EVENT_HEAD/);
  assert.throws(() => check("push", { ref: "refs/heads/other", before: BASE, after: evidence }), /REVIEWED_CODE_PUSH_BASE/);
  assert.throws(() => check("push", { ref: "refs/heads/main", before: SOURCE, after: evidence }), /REVIEWED_CODE_PUSH_BASE/);
}));
test("an additional tooling path cannot be laundered by regenerated inventory hashes", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_TOOLING_PATHS/), () => {}, ["docs/unreviewed.md"]));
test("wrong tooling parent is rejected despite a matching tree and digest", () => fixture(({ repo, check }) => {
  const a = JSON.parse(readFileSync(path.join(repo, ADMISSION), "utf8"));
  const wrong = git(repo, "commit-tree", `${a.toolingRelease}^{tree}`, "-p", BASE, "-m", "Synthetic wrong tooling parent");
  a.toolingRelease = wrong; a.toolingDigest = digest(inventory(repo, SOURCE, wrong)); write(repo, ADMISSION, JSON.stringify(a));
  git(repo, "add", "--", ADMISSION); git(repo, "commit", "-qm", "Synthetic changed parent");
  assert.throws(check, /REVIEWED_CODE_RELEASE_PARENT/);
}));
test("same-tree orphan and grafted ancestry cannot impersonate source history", () => fixture(({ repo, check, evidence }) => {
  const orphan = git(repo, "commit-tree", `${evidence}^{tree}`, "-m", "Synthetic orphan");
  git(repo, "checkout", "--detach", "-q", orphan);
  assert.throws(check);
  write(repo, ".git/info/grafts", `${orphan} ${SOURCE}\n`);
  assert.throws(check, /REVIEWED_CODE_GRAFTS/);
}));
test("literal checkout targeting ignores core.worktree redirects and rejects replacement refs", () => fixture(({ repo, check, evidence, temporary }) => {
  const redirected = path.join(temporary, "redirected"); mkdirSync(redirected);
  git(repo, "config", "core.worktree", redirected); assert.equal(check().admissionCommit, evidence);
  git(repo, "config", "--unset", "core.worktree"); git(repo, "update-ref", `refs/replace/${SOURCE}`, BASE);
  assert.throws(check, /REVIEWED_CODE_REPLACE_REFS/);
}));
for (const file of ["public/unreviewed-candidate.json", "data/usArkansasQuestions.ts", "data/usArkansasTopics.ts", "scripts/promotion-reviewed-code-pr283-e2.mjs", "coordination/integration/reviewed-code/pr283-e2/a11-review.md"]) {
  test(`committed drift in ${file} cannot inherit admission`, () => fixture(({ repo, check, commit }) => { write(repo, file, "unreviewed\n"); commit(file); assert.throws(check, /REVIEWED_CODE_COMPOSITION/); }));
}
test("original 1500 pack and q014 cannot change", () => fixture(({ repo, check, commit }) => {
  const file = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
  const pack = JSON.parse(git(repo, "show", `${BASE}:${file}`)); assert.equal(pack.questions.length, 1500);
  const q = pack.questions.find(q => q.id.endsWith("g12-c04-q014")); assert.equal(q.answer, "38000"); q.answer = "38";
  write(repo, file, JSON.stringify(pack)); commit(file); assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
}));
for (const permission of Object.keys(PERMISSIONS)) test(`admission cannot elevate ${permission}`, () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_PERMISSION/), ({ kind, value }) => { if (kind === "admission") value.permissions = { ...value.permissions, [permission]: true }; }));
for (const [field, value] of [["reviewerIdentity", "self"], ["reviewedSource", BASE], ["reviewedTooling", SOURCE], ["result", "approved-for-independent-admission-preparation"], ["liveAllowed", true]]) {
  test(`rehashing a forged reviewer ${field} cannot pass`, () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_REVIEW_BINDING/), ({ kind, value: review }) => { if (kind === "review") review[field] = value; }));
}
test("dirty, symlinked, changed, missing and re-added evidence is rejected", () => {
  fixture(({ repo, check }) => { write(repo, `${DIRECTORY}/a11-review.md`, "dirty"); assert.throws(check, /REVIEWED_CODE_DIRTY/); });
  fixture(({ repo, check, commit }) => { const p = `${DIRECTORY}/a11-review.json`; rmSync(path.join(repo, p)); symlinkSync("a23-review.json", path.join(repo, p)); commit(p); assert.throws(check, /REVIEWED_CODE_(NONREGULAR_BLOB|EVIDENCE_MODE|COMPOSITION)/); });
  fixture(({ repo, check, commit }) => { const p = `${DIRECTORY}/a11-review.md`; write(repo, p, "forged"); commit(p); assert.throws(check, /REVIEWED_CODE_(COMPOSITION|REVIEW_BINDING)/); });
  fixture(({ repo, check, commit }) => { rmSync(path.join(repo, `${DIRECTORY}/a23-review.md`)); commit(`${DIRECTORY}/a23-review.md`); assert.throws(check); });
  fixture(({ repo, check, commit }) => { const bytes = readFileSync(path.join(repo, ADMISSION)); rmSync(path.join(repo, ADMISSION)); commit(ADMISSION); write(repo, ADMISSION, bytes); commit(ADMISSION); assert.throws(check, /REVIEWED_CODE_ADMISSION_HISTORY/); });
});
test("sparse metadata fixture cannot become full runtime acceptance", () => fixture(({ repo, check, evidence }) => { check(); assert.throws(() => assertMaterializedTree(repo, evidence), /REVIEWED_CODE_INDEX_FLAGS/); }));

test("new selector preserves old steps and rejects invalid present markers without fallback", () => {
  const old = YAML.parse(git(root, "show", `${SOURCE}:.github/workflows/promotion-shadow.yml`)), current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = old.jobs["promotion-shadow-gate"], after = current.jobs["promotion-shadow-gate"];
  assert.deepEqual(current.on, old.on); assert.equal(after.name, before.name); assert.equal(after.if, undefined); assert.deepEqual(after.permissions, before.permissions); assert.deepEqual(after.env, before.env);
  const retained = before.steps.filter(s => s.id !== "contract"), names = new Set(retained.map(s => s.name));
  assert.deepEqual(after.steps.filter(s => names.has(s.name)), retained);
  assert.equal(new Set(after.steps.map(s => s.name)).size, after.steps.length);
  for (const step of after.steps) assert.equal(step["continue-on-error"], undefined);
  const select = after.steps.find(s => s.id === "contract").run;
  assert.ok(select.indexOf(ADMISSION) < select.indexOf("pr287-v1/admission.json")); assert.match(select, /set -euo pipefail/); assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  assert.equal(after.steps.find(s => s.name === "Enforce PR285 v2 required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr285-v2' }}");
  const temp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr283-selector-")));
  try {
    write(temp, ADMISSION, "{invalid");
    const node = path.join(temp, "node"); writeFileSync(node, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$CALL_LOG"\nexit 23\n`, { mode: 0o755 });
    const log = path.join(temp, "calls");
    const result = spawnSync("/bin/bash", ["-c", select], { cwd: temp, env: { PATH: `${temp}:/usr/bin:/bin`, CALL_LOG: log, GITHUB_WORKSPACE: temp, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: path.join(temp, "event.json"), GITHUB_OUTPUT: path.join(temp, "output") } });
    assert.equal(result.status, 23); const calls = readFileSync(log, "utf8").trim().split("\n"); assert.equal(calls.length, 1); assert.match(calls[0], /promotion-reviewed-code-pr285-v2\.mjs select/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});


// Synthetic reports derived from frozen native test names; fixtures are not execution proof.
const extraTitles = {
  "pr287-admission": [
    "PR287 event accepts only the exact finalized PR source",
    "PR287 future main composition requires exact merge parents and finalized tree",
    "binding data is canonical strict JSON, never executable module code",
    "synthetic real-Git S/T/E/F chain accepts exact finalized metadata and materialization",
    "real Git rejects an unreviewed source parent",
    "real Git rejects an unreviewed source path",
    "real Git rejects an unreviewed source digest",
    "real Git rejects an unreviewed tooling path",
    "real Git rejects an unreviewed evidence path",
    "real Git rejects an unreviewed final binding scope",
    "rehashed review records cannot change identity, source, tool, result, or permissions",
    "rehashed source CI cannot use a skipped job, wrong source, or reduced check set",
    "final binding and evidence modes must remain non-executable",
    "review timestamps reject impossible and future instants",
    "wrong PR/base, empty descendants, and changed-then-restored trees cannot inherit admission",
    "only the exact future main merge parent order and tree is accepted",
    "dirty, symlinked, hardlinked and hidden evidence or source fails closed",
    "new binding changes cannot launder re-added or rewritten historical evidence",
    "literal Git proof ignores a core.worktree redirect and replacement refs",
    "decision permissions and exact test commands/output bytes cannot be weakened",
    "new workflow preserves every historical step and executes fixed historical verification",
    "actual selector shell fails closed for invalid, symlinked or unknown new admission"
  ],
  "pr287-build": [
    "next clean build detects active Next processes in the same repository",
    "next clean build detects relative and retitled Next processes from PID cwd evidence",
    "next clean build fails closed when a relative Next process cannot be scoped",
    "next clean build scopes relative and retitled processes through live cwd evidence",
    "next clean build ignores the current process while checking active Next processes",
    "next clean build treats default builds as shared .next builds",
    "next clean build allows isolated generated dist directories",
    "next clean build records an exact, privacy-safe source and BUILD_ID attestation",
    "next clean build fails closed without every required attestation artifact",
    "next clean build attestation detects a required artifact changed after capture",
    "next clean build attestation detects executable or static output changed after capture",
    "next clean build refuses non-generated clean targets",
    "next clean build refuses next-dist directories outside generated roots",
    "next clean build refuses traversal aliases and nested .next-* targets",
    "next clean build refuses to remove a file at an allowed build path",
    "next clean build active-process guard cannot be bypassed by the legacy allow environment variable",
    "next clean build checks active processes for a non-shared dist directory",
    "next clean build runs guard, cleanup, and build in strict order despite the legacy skip variable",
    "next clean build restores tracked next-env.d.ts bytes after success and failure",
    "next clean build attests the restored source after a temporary Next sidecar change",
    "next clean build preserves a preexisting dirty source in its attestation",
    "next clean build attestation detects a persistent build-time change to source.js",
    "next clean build attestation detects a persistent build-time change to untracked-source.txt",
    "next clean build does not replace prior attestation when sidecar restoration fails",
    "next clean build restores the sidecar without publishing an attestation after a nonzero build",
    "next clean build restores the sidecar without publishing an attestation after a thrown build",
    "next clean build does not spawn when the process guard fails",
    "next clean build runs the stray-types guard between the process guard and cleanup",
    "next clean build does not clean or spawn when the stray-types guard throws",
    "MAIS_SKIP_STRAY_TYPES_CHECK bypasses the stray-types guard",
    "next clean build does not spawn when safe cleanup fails",
    "next clean build holds the canonical cleanup lock through build spawn",
    "next clean build lock contention prevents guard, cleanup, and build"
  ],
  "pr287-adjacent": [
    "flags a stray validator that references a deleted route as broken",
    "ignores validators under excluded dirs, dot dirs, and non-Next files",
    "assertNoBrokenStrayGeneratedTypes throws on broken and warns on valid strays",
    "passes cleanly when there are no stray validators",
    "CLI exits 1 on a broken stray and 0 once it is removed",
    "cleanup dry run can target Vercel staging without Playwright evidence",
    "cleanup dry run can target Next build artifacts without Playwright evidence",
    "cleanup dry run can target release build gate artifacts without active ad hoc Next dirs",
    "cleanup non-JSON dry run prints its release build gate summary",
    "cleanup dry run can target tmp scratch without deleting active Next build output",
    "cleanup refuses a generated target that is a symbolic link",
    "cleanup refuses a generated target below a symbolic link ancestor",
    "cleanup refuses to remove a target replaced after capture",
    "cleanup lock fails within a bounded timeout when another cleanup holds it",
    "cleanup apply removes only a captured generated directory",
    "cleanup allowlist accepts only .next, top-level .next-*, .tmp, and their descendants",
    "cleanup capture rejects disallowed in-repository targets before filesystem inspection",
    "cleanup default discovery ignores legacy .s11 and top-level temporary JSON targets",
    "cleanup Next discovery does not recursively auto-discover nested next-dist directories",
    "cleanup default discovery fails closed when an allowed target is a regular file",
    "cleanup default discovery fails closed when an allowed target is a symbolic link",
    "cleanup apply revalidates allowlist metadata and preserves the actual generated target",
    "cleanup rechecks captured dev identity before rename",
    "cleanup rechecks captured inode identity before rename",
    "cleanup rechecks captured mode identity before rename",
    "cleanup rechecks captured type identity before rename",
    "cleanup quarantine rename is random, atomic, and stays in the target parent",
    "cleanup rejects a quarantine whose canonical path escapes containment and restores it",
    "cleanup rejects a quarantine identity mutation and restores it",
    "release build gate validates the App Router dashboard server output",
    "release build child environment is a strict non-credential allowlist",
    "release build gate defaults to an isolated generated Next dist directory",
    "release build gate allows an explicit generated .tmp next dist directory",
    "release build gate refuses shared .next and non-generated clean targets",
    "release build gate restores the configured tsconfig after Next mutates it",
    "release build gate restores tsconfig and next-env after a mutating build action",
    "staging build gate builds only a private copy and re-verifies the upload package",
    "staging build gate fails closed and removes its private copy when build fails"
  ],
  "pr287-governance": [
    "package and coordination contracts preserve security versions and closure rules"
  ]
};

function flatReport(name) {
  const names = extraTitles[name];
  return Buffer.from("TAP version 13\n" + names.map((title, index) => `# Subtest: ${title}\nok ${index + 1} - ${title}\n  ---\n  duration_ms: 1\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n`);
}
for (const name of Object.keys(extraTitles)) test(`strict ${name} report rejects skips, hidden records, duplicates, truncation and forged titles`, () => {
  const report = flatReport(name); assert.doesNotThrow(() => verifyNodeTestReport(report, name));
  for (const mutate of [
    text => text.replace("# fail 0", "# fail 1"),
    text => text.replace("# skipped 0", "# skipped 1"),
    text => text.replace("ok 1 - ", "not ok 1 - "),
    text => text.replace(/(# Subtest: [^\n]+)\n/, "$1 # SKIP\n"),
    text => text.replace("  duration_ms: 1", "  duration_ms: 1\n  not ok 99 - hidden"),
    text => text.replace("  duration_ms: 1", "  duration_ms: 1\n  1..99"),
    text => text.replace("# pass ", "# pass 999\n# pass "),
    text => text + "ok 999 - extra\n",
    text => text.replace(extraTitles[name][0], "unreviewed test title"),
    text => text.slice(0, text.indexOf("1.."))
  ]) assert.throws(() => verifyNodeTestReport(Buffer.from(mutate(report.toString())), name), /REVIEWED_CODE_TEST/);
});
test("all nine current groups and existing governance scope are preserved", () => {
  assert.equal(COMMANDS.length, 9);
  assert.deepEqual(COMMANDS.map(([name]) => name), ["repair-regression", "seed", "funnel", "activity", "types", "pr287-admission", "pr287-build", "pr287-adjacent", "pr287-governance"]);
  assert.ok(COMMANDS[8][1].includes("--test-name-pattern=^package and coordination contracts preserve security versions and closure rules$"));
  assert.throws(() => verifyTestRecords(root, []), /REVIEWED_CODE_TEST_SET/);
});
test("source sync preserves all non-workflow blobs from both parents", () => {
  for (const file of SOURCE_PATHS.filter(p => p !== ".github/workflows/promotion-shadow.yml")) assert.equal(git(root, "rev-parse", `${SOURCE}:${file}`), git(root, "rev-parse", `${OLD_HEAD}:${file}`));
  const changed = new Set(SOURCE_PATHS);
  const mainPaths = git(root, "diff", "--name-only", "f573ac62c97cb0716054bc516f7d5136491ca002", BASE).split("\n");
  for (const file of mainPaths.filter(p => !changed.has(p))) assert.equal(git(root, "rev-parse", `${SOURCE}:${file}`), git(root, "rev-parse", `${BASE}:${file}`));
});

const legacyTitles = {
  "repair-regression": [
    "selector runs E2 before the pending package and preserves every older step",
    "real PR283 head binds independent review bytes to E2",
    "real main merge retains E2 ancestry and tree without requiring equal commit IDs",
    "real Git preflight rejects wrong PR number",
    "real Git preflight rejects wrong PR base",
    "real Git preflight rejects stale PR event head",
    "real Git preflight rejects stale push event head",
    "real Git preflight rejects push to another ref",
    "real Git preflight rejects push from a changed tree",
    "same-tree orphan cannot substitute for the real evidence ancestry",
    "a committed successor change to lib/server/demoSeedBackfill.ts fails full-tree binding",
    "a committed successor change to public/pr283-unreviewed-candidate.json fails full-tree binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a11-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a11-review.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a23-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a23-review.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr282-pr281-pr280-v1/a11-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/source-observation.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/source-checks.json fails evidence binding",
    "committed admission cannot grant ordinaryCodeEligible",
    "committed admission cannot grant liveAllowed",
    "removing and readding identical admission bytes cannot reset evidence history",
    "uncommitted evidence drift cannot use clean historical bytes",
    "passing metadata fixture remains ineligible for full runtime execution",
    "decision verification rejects eligibility, a live permission, and a changed scope"
  ],
  "seed": [
    "any Vercel deployment refuses demo seed backfill unless the flag is explicitly set",
    "local, dev, test, and CI with no VERCEL_ENV keep the backfill unless it is explicitly off",
    "production without the flag drops new demo seed rows and an explicit flag keeps a stored score",
    "user store persistence paths consult the demo seed backfill gate",
    "Vercel production and preview refuse demo seed writes unless the flag is on"
  ],
  "activity": [
    "student dashboard fast path bypasses full database reads when it has data",
    "student progress fast path uses the projected read and skips the full snapshot",
    "legacy userStore wires student dashboard Neon projection before full snapshot fallback",
    "legacy userStore batches Postgres projection bulk inserts below the driver parameter limit",
    "legacy userStore clears student dashboard cache after dashboard-affecting mutations",
    "legacy userStore scopes and de-duplicates student dashboard cache safely",
    "student activity persistence owns linked assignment completion helpers for legacy userStore",
    "student activity persistence owns attempt and mistake record defaults for legacy userStore",
    "student activity persistence owns adaptive skill state normalization",
    "student activity persistence owns adaptive skill state record conversion",
    "student activity persistence owns lesson progress normalization",
    "student activity persistence owns lesson progress seed builders for legacy userStore",
    "student activity persistence lists visualization sessions without legacy userStore imports",
    "student activity persistence lists public questions from public content storage",
    "student activity persistence marks visualization sessions through fake storage",
    "student activity persistence returns visualization session before slow side effects settle",
    "student activity persistence appends analytics events without legacy userStore imports",
    "student activity persistence summarizes, exports, and clears analytics events",
    "student activity persistence reads mistake book items without legacy userStore imports",
    "student activity persistence owns mistake book item projection for legacy userStore",
    "student activity persistence marks mistakes mastered once and calls reward hook",
    "student activity persistence deletes and clears mistake records",
    "student activity persistence records question attempts and updates mistake rows through fake storage",
    "student activity persistence rejects unavailable question attempts before mutation hooks",
    "student activity persistence authorizes resource downloads from assignments and assessments",
    "student activity persistence marks authorized resource views through fake storage",
    "student activity persistence returns resource detail data through fake storage",
    "student activity persistence lists student assignments through fake storage",
    "student activity persistence submits assignment work through fake storage",
    "student activity persistence rejects unavailable assignment work submissions",
    "student activity persistence builds student message data through fake storage",
    "student activity persistence creates and replies to student message threads",
    "student activity persistence builds assessment detail data through projection boundary",
    "student activity persistence submits assessment answers and marks linked assignment",
    "student activity persistence rejects unavailable assessment detail and submissions",
    "student activity persistence resolves lesson entry targets through extracted boundary",
    "lesson entry targets use the student's current unit progress",
    "lesson entry targets fall back to public catalog when authenticated targets are stale",
    "student activity persistence owns lesson progress lookup with lesson slug priority",
    "student activity persistence owns attempt-derived lesson progress mutation",
    "student activity persistence owns public question projection with seed topic title repair",
    "student activity persistence owns topic label projection for legacy userStore",
    "student activity persistence owns localized topic title helper with seed topic repair",
    "student activity persistence owns indexed question and topic lookup helpers for legacy userStore",
    "student activity persistence updates lesson progress through native mutation boundary",
    "student activity persistence resolves lesson details through native read model",
    "student activity persistence builds dashboard data from native tables",
    "student activity persistence returns stable empty dashboard data",
    "student activity persistence builds progress data from native tables",
    "dashboard and progress share saved-attempt accuracy outside the weekly window",
    "student activity persistence builds roadmap data from native tables",
    "student activity persistence resolves adaptive decisions through extracted boundary",
    "student activity persistence refreshes adaptive recommendations through extracted boundary",
    "student activity persistence owns analytics activity time helpers for legacy userStore",
    "student activity persistence owns student activity summary helpers for legacy userStore",
    "student activity persistence owns roadmap helper boundary for legacy userStore",
    "legacy userStore delegates analytics activity operations to extracted persistence",
    "student activity persistence owns student assessment paper item helpers for legacy userStore",
    "student activity persistence owns media object key helpers for legacy userStore"
  ]
};
const nativeFunnelFixture = "TAP version 13\n# Subtest: auth funnel route\n    # Subtest: anonymous GET does not open the funnel database\n    ok 1 - anonymous GET does not open the funnel database\n      ---\n      duration_ms: 2.123791\n      type: 'test'\n      ...\n    # Subtest: signup load beacon returns 202 when the Vercel funnel directory does not exist yet\n    ok 2 - signup load beacon returns 202 when the Vercel funnel directory does not exist yet\n      ---\n      duration_ms: 3.14675\n      type: 'test'\n      ...\n    1..2\nok 1 - auth funnel route\n  ---\n  duration_ms: 5.630292\n  type: 'suite'\n  ...\n# Subtest: auth funnel metrics\n    # Subtest: event validation accepts the closed vocabulary and rejects everything else\n    ok 1 - event validation accepts the closed vocabulary and rejects everything else\n      ---\n      duration_ms: 0.472375\n      type: 'test'\n      ...\n    # Subtest: recording aggregates same-day events into counters and drops invalid entries\n    ok 2 - recording aggregates same-day events into counters and drops invalid entries\n      ---\n      duration_ms: 5.945208\n      type: 'test'\n      ...\n    # Subtest: batch size is capped\n    ok 3 - batch size is capped\n      ---\n      duration_ms: 1.950125\n      type: 'test'\n      ...\n    # Subtest: read window filters by day and retention prunes old counters\n    ok 4 - read window filters by day and retention prunes old counters\n      ---\n      duration_ms: 1.772833\n      type: 'test'\n      ...\n    # Subtest: recording creates a missing parent directory instead of failing the beacon write\n    ok 5 - recording creates a missing parent directory instead of failing the beacon write\n      ---\n      duration_ms: 1.6835\n      type: 'test'\n      ...\n    # Subtest: Vercel relocates the funnel file when the main database directory is not writable\n    ok 6 - Vercel relocates the funnel file when the main database directory is not writable\n      ---\n      duration_ms: 1.904916\n      type: 'test'\n      ...\n    # Subtest: an explicit funnel path is not relocated when its directory is not writable\n    ok 7 - an explicit funnel path is not relocated when its directory is not writable\n      ---\n      duration_ms: 0.605625\n      type: 'test'\n      ...\n    1..7\nok 2 - auth funnel metrics\n  ---\n  duration_ms: 14.854875\n  type: 'suite'\n  ...\n1..2\n# tests 9\n# suites 2\n# pass 9\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1358.937708\n";

function allRecordFixture(run) {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr285-v2-records-")));
  try {
    const records = COMMANDS.map(([name, args]) => {
      let stdout;
      if (name === "types") stdout = Buffer.alloc(0);
      else if (name === "funnel") stdout = Buffer.from(nativeFunnelFixture);
      else {
        if (Object.hasOwn(legacyTitles, name)) extraTitles[name] = legacyTitles[name];
        stdout = flatReport(name);
      }
      writeFileSync(path.join(dir, `${name}.stdout`), stdout); writeFileSync(path.join(dir, `${name}.stderr`), "");
      return { name, args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(Buffer.alloc(0)) };
    });
    run({ dir, records });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test("complete nine-group proof rejects omitted, reordered, changed and self-rehashed forged outputs", () => allRecordFixture(({ dir, records }) => {
  assert.doesNotThrow(() => verifyTestRecords(dir, records));
  assert.throws(() => verifyTestRecords(dir, records.slice(0, -1)), /REVIEWED_CODE_TEST_SET/);
  for (const mutate of [
    rows => { [rows[5], rows[6]] = [rows[6], rows[5]]; },
    rows => { rows[5].name = "pr287-build"; },
    rows => { rows[5].args = ["--version"]; },
    rows => { rows[6].stdoutSha256 = "f".repeat(64); },
    rows => { rows[7].exitCode = 1; },
    rows => { rows[8] = rows[7]; }
  ]) { const changed = structuredClone(records); mutate(changed); assert.throws(() => verifyTestRecords(dir, changed), /REVIEWED_CODE_TEST/); }
  const file = path.join(dir, "pr287-build.stdout"), original = readFileSync(file);
  for (const mutate of [text => text.replace("# skipped 0", "# skipped 1"), text => text.replace("# tests 33", "# tests 32"), text => text.replace(extraTitles["pr287-build"][0], "unreviewed title"), text => text.replace("  duration_ms: 1", "  duration_ms: 1\n  not ok 99 - hidden")]) {
    const changed = Buffer.from(mutate(original.toString())); writeFileSync(file, changed);
    const rows = structuredClone(records); rows[6].stdoutSha256 = hash(changed);
    assert.throws(() => verifyTestRecords(dir, rows), /REVIEWED_CODE_TEST/);
  }
}));
test("valid current proof cannot reuse an old head, source, tooling, event or evidence", () => allRecordFixture(({ dir, records }) => {
  const context = { admission: { toolingRelease: "a".repeat(40) }, admissionCommit: "b".repeat(40), event: { eventName: "pull_request", pullRequestNumber: 285, baseCommit: BASE, headCommit: "b".repeat(40) } };
  const current = { schemaVersion: "promotion-reviewed-code-current.pr285-after-pr287.v2", event: context.event, sourceCommit: SOURCE, reviewedTooling: context.admission.toolingRelease, admissionCommit: context.admissionCommit, tests: records, observation: { syntheticBindingFixture: true } };
  assert.doesNotThrow(() => verifyCurrentProof(context, dir, current));
  for (const mutate of [x => { x.sourceCommit = OLD_HEAD; }, x => { x.reviewedTooling = OLD_HEAD; }, x => { x.admissionCommit = OLD_HEAD; }, x => { x.event.headCommit = OLD_HEAD; }, x => { x.event.baseCommit = OLD_BASE; }, x => { x.event.eventName = "push"; }, x => { x.event.pullRequestNumber = 287; }, x => { delete x.tests; }]) {
    const changed = structuredClone(current); mutate(changed); assert.throws(() => verifyCurrentProof(context, dir, changed), /REVIEWED_CODE/);
  }
}));

// Synthetic binding-only decisions. These are never native acceptance evidence.
function historicalFixture(name) {
  const old = name === "old";
  const value = { schemaVersion: old ? "promotion-reviewed-code-decision.pr283-merge-assertion.v1" : "pr287-decision.v1", result: "pass",
    scope: old ? "exact-pr285-pr283-merge-assertion-only" : "exact-pr287-required-check-only",
    event: { eventName: old ? "pull_request" : "push", pullRequestNumber: old ? 285 : null, baseCommit: OLD_BASE, headCommit: old ? OLD_HEAD : BASE },
    sourceCommit: old ? "4ef2e1cada5bd872f9ce74f274cc22d8f7b5c0a1" : "58070283c50c7a98a483964eb92907e9064cf9c4",
    currentProofRawSha256: "1".repeat(64), historicalBaselineOnly: { commit: old ? HISTORICAL_BASE : HISTORICAL_E2, decisionDigest: "2".repeat(64), artifactRawSha256: "3".repeat(64) }, permissions: PERMISSIONS };
  if (old) Object.assign(value, { reviewedTooling: "79e10d7293e52bc4fbf26f02d378696d71694ca3", toolingRelease: "79e10d7293e52bc4fbf26f02d378696d71694ca3", admissionCommit: OLD_HEAD, a11DecisionRawSha256: "54671fcda61147a7d8677555ac9d17ff5ed6372de4052961649ceba431cb2a79", a23DecisionRawSha256: "07846156cd9cf26ffc2c9fc7c69d058dd7b1ac0c43d19a33ace2b82e772a66b1" });
  else Object.assign(value, { toolingCommit: "56539dbded4fa58b2b640e2e9eefd11e19134013", evidenceCommit: "c46efcf1b8541aacf0891bda752263f97658bb5c", finalCommit: "f1149de7d71e379b655408c17c4e3cb92889110c", sourceInventoryDigest: "7229d9a25e6054dd848708c172c345cea207c84c51af78e0f3fba915d27f1a76" });
  return { ...value, decisionDigest: digest(value) };
}
const decisionBytes = value => Buffer.from(stable(value) + "\n");
for (const name of ["old", "main"]) test(`historical ${name} binding rejects rehashed wrong role, event, identity, permission and bytes`, () => {
  const good = historicalFixture(name), bytes = decisionBytes(good);
  assert.doesNotThrow(() => bindHistoricalDecision(name, bytes, bytes));
  const swapped = decisionBytes(historicalFixture(name === "old" ? "main" : "old")); assert.throws(() => bindHistoricalDecision(name, swapped, swapped));
  const fields = name === "old" ? ["reviewedTooling", "toolingRelease", "admissionCommit", "a11DecisionRawSha256", "a23DecisionRawSha256"] : ["toolingCommit", "evidenceCommit", "finalCommit", "sourceInventoryDigest"];
  const mutations = [x => { delete x.sourceCommit; }, x => { x.schemaVersion = "wrong"; }, x => { x.result = "blocked"; }, x => { x.scope = "other"; }, x => { x.sourceCommit = OLD_BASE; }, x => { x.event.headCommit = SOURCE; }, x => { x.event.baseCommit = BASE; }, x => { x.event.eventName = "schedule"; }, x => { x.event.pullRequestNumber = 999; }, x => { x.historicalBaselineOnly.commit = SOURCE; }, ...fields.map(field => x => { x[field] = "f".repeat(field.includes("Sha") || field.endsWith("Digest") ? 64 : 40); }), ...Object.keys(PERMISSIONS).map(key => x => { x.permissions = { ...x.permissions, [key]: true }; })];
  for (const mutate of mutations) {
    const changed = structuredClone(good); mutate(changed); delete changed.decisionDigest; changed.decisionDigest = digest(changed);
    const bad = decisionBytes(changed); assert.throws(() => bindHistoricalDecision(name, bad, bad), /REVIEWED_CODE/);
  }
  assert.throws(() => bindHistoricalDecision(name, bytes, swapped), /REVIEWED_CODE_HISTORY_DECISION/);
  const badDigest = decisionBytes({ ...good, decisionDigest: "0".repeat(64) }); assert.throws(() => bindHistoricalDecision(name, badDigest, badDigest), /REVIEWED_CODE_HISTORY_DIGEST/);
  assert.throws(() => bindHistoricalDecision(name, Buffer.from('{"result":"pass","result":"pass"}'), bytes));
  assert.throws(() => bindHistoricalDecision(name, Buffer.from("{"), bytes));
  assert.throws(() => bindHistoricalDecision("unknown", bytes, bytes), /REVIEWED_CODE_HISTORY_ROLE/);
});
test("final decision cannot omit, duplicate or swap either historical branch or elevate permissions", () => {
  const historical = ["old", "main"].map(name => { const bytes = decisionBytes(historicalFixture(name)); return bindHistoricalDecision(name, bytes, bytes); });
  const expected = { result: "pass", scope: "exact-pr285-after-pr287-required-check-only", historicalBaselineOnly: historical, permissions: PERMISSIONS };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  for (const records of [[historical[0]], [historical[1]], [historical[0], historical[0]], [...historical].reverse()]) assert.throws(() => verifyDecision({ ...expected, historicalBaselineOnly: records }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  for (const key of Object.keys(PERMISSIONS)) assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, [key]: true } }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});
