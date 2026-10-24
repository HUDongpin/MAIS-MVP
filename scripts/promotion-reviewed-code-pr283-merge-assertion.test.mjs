import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { BASE, SOURCE, SOURCE_TREE, SOURCE_INVENTORY, SOURCE_PATHS, CODE_PATHS, EVIDENCE_PATHS, DIRECTORY, ADMISSION, IDENTITIES, PERMISSIONS, COMMANDS, OBSERVATION_SHA, PULL_REQUEST, hash, inventory, preflight, assertMaterializedTree, verifyTestRecords, verifyNodeTestReport, TEST_COUNTS, TEST_TITLE_DIGESTS, verifyDecision } from "./promotion-reviewed-code-pr283-merge-assertion.mjs";
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
    const checks = JSON.stringify({ schemaVersion: "promotion-pr283-repair-source-checks.v1", sourceCommit: SOURCE, toolingRelease: tooling, result: "pass", syntheticFixture: true }) + "\n";
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
    const admission = { schemaVersion: "promotion-reviewed-code-pr283-merge-assertion.v1", baseCommit: BASE, sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY, pullRequest: PULL_REQUEST, toolingRelease: tooling, toolingTree: git(repo, "rev-parse", `${tooling}^{tree}`), toolingDigest, observationRawSha256: OBSERVATION_SHA, checksRawSha256: hash(Buffer.from(checks)), reviews, permissions: PERMISSIONS };
    mutate({ kind: "admission", value: admission, repo });
    write(repo, ADMISSION, JSON.stringify(admission) + "\n"); commit(...EVIDENCE_PATHS);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ number: PULL_REQUEST, pull_request: { base: { sha: BASE }, head: { sha: git(repo, "rev-parse", "HEAD") } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, JSON.stringify(value)); return preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, eventPath, event, check, commit });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("source is the exact two-file direct child of the preserved main baseline", () => {
  assert.equal(git(root, "show", "-s", "--format=%P", SOURCE), BASE);
  assert.equal(git(root, "rev-parse", `${SOURCE}^{tree}`), SOURCE_TREE);
  assert.equal(digest(inventory(root, BASE, SOURCE)), SOURCE_INVENTORY);
  assert.deepEqual(git(root, "diff", "--name-only", BASE, SOURCE).split("\n"), [...SOURCE_PATHS]);
  assert.equal(hash(observation()), OBSERVATION_SHA);
  assert.equal(CODE_PATHS.length, 3); assert.equal(EVIDENCE_PATHS.length, 8);
  assert.equal(PULL_REQUEST, 285); assert.ok(Object.values(PERMISSIONS).every(v => v === false));
});
test("real source plus exact synthetic tooling/evidence passes metadata preflight", () => fixture(({ check, evidence, tooling }) => {
  const result = check(); assert.equal(result.admissionCommit, evidence); assert.equal(result.admission.toolingRelease, tooling); assert.deepEqual(result.admission.permissions, PERMISSIONS);
}));
test("real preserving main merge and identical-tree descendant keep the evidence binding", () => fixture(({ repo, check, evidence }) => {
  const merge = git(repo, "commit-tree", `${evidence}^{tree}`, "-p", BASE, "-p", evidence, "-m", "Synthetic preserving merge");
  git(repo, "checkout", "--detach", "-q", merge);
  const result = check("push", { ref: "refs/heads/main", before: BASE, after: merge });
  assert.equal(result.head, merge); assert.equal(result.admissionCommit, evidence); assert.notEqual(merge, evidence);
  const child = git(repo, "commit-tree", `${merge}^{tree}`, "-p", merge, "-m", "Synthetic unchanged tree");
  git(repo, "checkout", "--detach", "-q", child);
  assert.equal(check("push", { ref: "refs/heads/main", before: merge, after: child }).admissionCommit, evidence);
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
  for (const step of before.steps.filter(s => s.id !== "contract")) assert.deepEqual(after.steps.find(s => s.name === step.name), step);
  for (const step of after.steps) assert.equal(step["continue-on-error"], undefined);
  const select = after.steps.find(s => s.id === "contract").run;
  assert.ok(select.indexOf(ADMISSION) < select.indexOf("pr283-e2/admission.json")); assert.match(select, /set -euo pipefail/); assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  assert.equal(after.steps.find(s => s.name === "Enforce PR283 repair reviewed-code required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr283-merge-assertion' }}");
  const temp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr283-selector-")));
  try {
    write(temp, ADMISSION, "{invalid");
    const node = path.join(temp, "node"); writeFileSync(node, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$CALL_LOG"\nexit 23\n`, { mode: 0o755 });
    const log = path.join(temp, "calls");
    const result = spawnSync("/bin/bash", ["-c", select], { cwd: temp, env: { PATH: `${temp}:/usr/bin:/bin`, CALL_LOG: log, GITHUB_WORKSPACE: temp, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: path.join(temp, "event.json"), GITHUB_OUTPUT: path.join(temp, "output") } });
    assert.equal(result.status, 23); const calls = readFileSync(log, "utf8").trim().split("\n"); assert.equal(calls.length, 1); assert.match(calls[0], /promotion-reviewed-code-pr283-merge-assertion\.mjs select/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

// Test report fixtures: native nested funnel output plus synthetic flat reports
// with independently frozen test names. These never count as execution proof.
const reportTitles = {
  "seed": [
    "Vercel production and preview refuse demo seed writes unless the flag is on",
    "any Vercel deployment refuses demo seed backfill unless the flag is explicitly set",
    "local, dev, test, and CI with no VERCEL_ENV keep the backfill unless it is explicitly off",
    "production without the flag drops new demo seed rows and an explicit flag keeps a stored score",
    "user store persistence paths consult the demo seed backfill gate"
  ],
  "activity": [
    "dashboard and progress share saved-attempt accuracy outside the weekly window",
    "legacy userStore batches Postgres projection bulk inserts below the driver parameter limit",
    "legacy userStore clears student dashboard cache after dashboard-affecting mutations",
    "legacy userStore delegates analytics activity operations to extracted persistence",
    "legacy userStore scopes and de-duplicates student dashboard cache safely",
    "legacy userStore wires student dashboard Neon projection before full snapshot fallback",
    "lesson entry targets fall back to public catalog when authenticated targets are stale",
    "lesson entry targets use the student's current unit progress",
    "student activity persistence appends analytics events without legacy userStore imports",
    "student activity persistence authorizes resource downloads from assignments and assessments",
    "student activity persistence builds assessment detail data through projection boundary",
    "student activity persistence builds dashboard data from native tables",
    "student activity persistence builds progress data from native tables",
    "student activity persistence builds roadmap data from native tables",
    "student activity persistence builds student message data through fake storage",
    "student activity persistence creates and replies to student message threads",
    "student activity persistence deletes and clears mistake records",
    "student activity persistence lists public questions from public content storage",
    "student activity persistence lists student assignments through fake storage",
    "student activity persistence lists visualization sessions without legacy userStore imports",
    "student activity persistence marks authorized resource views through fake storage",
    "student activity persistence marks mistakes mastered once and calls reward hook",
    "student activity persistence marks visualization sessions through fake storage",
    "student activity persistence owns adaptive skill state normalization",
    "student activity persistence owns adaptive skill state record conversion",
    "student activity persistence owns analytics activity time helpers for legacy userStore",
    "student activity persistence owns attempt and mistake record defaults for legacy userStore",
    "student activity persistence owns attempt-derived lesson progress mutation",
    "student activity persistence owns indexed question and topic lookup helpers for legacy userStore",
    "student activity persistence owns lesson progress lookup with lesson slug priority",
    "student activity persistence owns lesson progress normalization",
    "student activity persistence owns lesson progress seed builders for legacy userStore",
    "student activity persistence owns linked assignment completion helpers for legacy userStore",
    "student activity persistence owns localized topic title helper with seed topic repair",
    "student activity persistence owns media object key helpers for legacy userStore",
    "student activity persistence owns mistake book item projection for legacy userStore",
    "student activity persistence owns public question projection with seed topic title repair",
    "student activity persistence owns roadmap helper boundary for legacy userStore",
    "student activity persistence owns student activity summary helpers for legacy userStore",
    "student activity persistence owns student assessment paper item helpers for legacy userStore",
    "student activity persistence owns topic label projection for legacy userStore",
    "student activity persistence reads mistake book items without legacy userStore imports",
    "student activity persistence records question attempts and updates mistake rows through fake storage",
    "student activity persistence refreshes adaptive recommendations through extracted boundary",
    "student activity persistence rejects unavailable assessment detail and submissions",
    "student activity persistence rejects unavailable assignment work submissions",
    "student activity persistence rejects unavailable question attempts before mutation hooks",
    "student activity persistence resolves adaptive decisions through extracted boundary",
    "student activity persistence resolves lesson details through native read model",
    "student activity persistence resolves lesson entry targets through extracted boundary",
    "student activity persistence returns resource detail data through fake storage",
    "student activity persistence returns stable empty dashboard data",
    "student activity persistence returns visualization session before slow side effects settle",
    "student activity persistence submits assessment answers and marks linked assignment",
    "student activity persistence submits assignment work through fake storage",
    "student activity persistence summarizes, exports, and clears analytics events",
    "student activity persistence updates lesson progress through native mutation boundary",
    "student dashboard fast path bypasses full database reads when it has data",
    "student progress fast path uses the projected read and skips the full snapshot"
  ],
  "repair-regression": [
    "a committed successor change to lib/server/demoSeedBackfill.ts fails full-tree binding",
    "a committed successor change to public/pr283-unreviewed-candidate.json fails full-tree binding",
    "committed admission cannot grant liveAllowed",
    "committed admission cannot grant ordinaryCodeEligible",
    "committed tampering of coordination/integration/reviewed-code/pr282-pr281-pr280-v1/a11-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a11-review.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a11-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a23-review.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/a23-review.md fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/source-checks.json fails evidence binding",
    "committed tampering of coordination/integration/reviewed-code/pr283-e2/source-observation.json fails evidence binding",
    "decision verification rejects eligibility, a live permission, and a changed scope",
    "passing metadata fixture remains ineligible for full runtime execution",
    "real Git preflight rejects push from a changed tree",
    "real Git preflight rejects push to another ref",
    "real Git preflight rejects stale PR event head",
    "real Git preflight rejects stale push event head",
    "real Git preflight rejects wrong PR base",
    "real Git preflight rejects wrong PR number",
    "real PR283 head binds independent review bytes to E2",
    "real main merge retains E2 ancestry and tree without requiring equal commit IDs",
    "removing and readding identical admission bytes cannot reset evidence history",
    "same-tree orphan cannot substitute for the real evidence ancestry",
    "selector runs E2 before the pending package and preserves every older step",
    "uncommitted evidence drift cannot use clean historical bytes"
  ]
};
const nativeFunnel = "TAP version 13\n# Subtest: auth funnel route\n    # Subtest: anonymous GET does not open the funnel database\n    ok 1 - anonymous GET does not open the funnel database\n      ---\n      duration_ms: 2.452542\n      type: 'test'\n      ...\n    # Subtest: signup load beacon returns 202 when the Vercel funnel directory does not exist yet\n    ok 2 - signup load beacon returns 202 when the Vercel funnel directory does not exist yet\n      ---\n      duration_ms: 6.201708\n      type: 'test'\n      ...\n    1..2\nok 1 - auth funnel route\n  ---\n  duration_ms: 8.995375\n  type: 'suite'\n  ...\n# Subtest: auth funnel metrics\n    # Subtest: event validation accepts the closed vocabulary and rejects everything else\n    ok 1 - event validation accepts the closed vocabulary and rejects everything else\n      ---\n      duration_ms: 0.452208\n      type: 'test'\n      ...\n    # Subtest: recording aggregates same-day events into counters and drops invalid entries\n    ok 2 - recording aggregates same-day events into counters and drops invalid entries\n      ---\n      duration_ms: 5.874167\n      type: 'test'\n      ...\n    # Subtest: batch size is capped\n    ok 3 - batch size is capped\n      ---\n      duration_ms: 2.349708\n      type: 'test'\n      ...\n    # Subtest: read window filters by day and retention prunes old counters\n    ok 4 - read window filters by day and retention prunes old counters\n      ---\n      duration_ms: 1.890291\n      type: 'test'\n      ...\n    # Subtest: recording creates a missing parent directory instead of failing the beacon write\n    ok 5 - recording creates a missing parent directory instead of failing the beacon write\n      ---\n      duration_ms: 1.8755\n      type: 'test'\n      ...\n    # Subtest: Vercel relocates the funnel file when the main database directory is not writable\n    ok 6 - Vercel relocates the funnel file when the main database directory is not writable\n      ---\n      duration_ms: 1.72875\n      type: 'test'\n      ...\n    # Subtest: an explicit funnel path is not relocated when its directory is not writable\n    ok 7 - an explicit funnel path is not relocated when its directory is not writable\n      ---\n      duration_ms: 0.726917\n      type: 'test'\n      ...\n    1..7\nok 2 - auth funnel metrics\n  ---\n  duration_ms: 15.394291\n  type: 'suite'\n  ...\n1..2\n# tests 9\n# suites 2\n# pass 9\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 2921.442542\n";
const flatReport = titles => `TAP version 13\n${titles.map((title, index) => `# Subtest: ${title}\nok ${index + 1} - ${title}\n  ---\n  duration_ms: 1\n  type: 'test'\n  ...`).join("\n")}\n1..${titles.length}\n# tests ${titles.length}\n# suites 0\n# pass ${titles.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
const reportFor = name => name === "types" ? "" : name === "funnel" ? nativeFunnel : flatReport(reportTitles[name]);
const proofRecords = artifacts => COMMANDS.map(([name, args]) => {
  const stdout = reportFor(name), stderr = "";
  writeFileSync(path.join(artifacts, `${name}.stdout`), stdout); writeFileSync(path.join(artifacts, `${name}.stderr`), stderr);
  return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from(stdout)), stderrSha256: hash(Buffer.from(stderr)) };
});

test("current test proof accepts complete flat and native nested reports and rejects tampering", () => {
  for (const [name] of COMMANDS) if (name !== "types") assert.doesNotThrow(() => verifyNodeTestReport(Buffer.from(reportFor(name)), name));
  const valid = reportFor("seed");
  for (const structural of ["ok 999 - hidden extra", "1..999", "# Subtest: hidden", "TAP version 13", "type: 'test'", "error: hidden failure"]) {
    assert.throws(() => verifyNodeTestReport(Buffer.from(valid.replace("  type: 'test'", `  ${structural}\n  type: 'test'`)), "seed"));
    assert.throws(() => verifyNodeTestReport(Buffer.from(nativeFunnel.replace("      type: 'test'", `      ${structural}\n      type: 'test'`)), "funnel"));
  }
  for (const bad of [valid + "TAP version 13\n", valid + "1..5\n", valid + "  1..5\n", valid + "ok 6 - extra\n", valid + "  ok 6 - extra\n", valid.replace("ok 1 -", "not ok 1 -"), valid.replace("ok 1 -", "ok 1 - # SKIP "), valid.replace("# skipped 0", "# skipped 1"), valid.replace("1..5", "1..4"), valid + "Bail out!\n"]) assert.throws(() => verifyNodeTestReport(Buffer.from(bad), "seed"));
  for (const bad of [nativeFunnel.replace("    ok 1 -", "    not ok 1 -"), nativeFunnel.replace("    ok 1 -", "    ok 1 - # SKIP "), nativeFunnel.replace("    1..7", "    1..6"), nativeFunnel.replace("    1..7", "    1..7\n    1..7"), nativeFunnel.replace("    ok 2 -", "    ok 1 -"), nativeFunnel.replace("type: 'suite'", "type: 'test'"), nativeFunnel.replace("# suites 2", "# suites 1")]) assert.throws(() => verifyNodeTestReport(Buffer.from(bad), "funnel"));
  for (const bytes of ["", "# tests 25\n# pass 25\n", "TAP version 13\n1..0 # SKIP\n"]) assert.throws(() => verifyNodeTestReport(Buffer.from(bytes), "repair-regression"));
  assert.equal(TEST_COUNTS["repair-regression"], 25); assert.match(TEST_TITLE_DIGESTS["repair-regression"], /^[a-f0-9]{64}$/);
  assert.throws(() => verifyTestRecords(root, []), /REVIEWED_CODE_TEST_SET/);
  assert.throws(() => verifyTestRecords(root, COMMANDS.map(([name, args]) => ({ name, args, exitCode: 1, stdoutSha256: "0".repeat(64), stderrSha256: "0".repeat(64) }))), /REVIEWED_CODE_TEST_EXIT/);
});
test("missing fresh current and native historical proof cannot produce a decision", () => fixture(({ repo, eventPath, check, temporary }) => {
  check(); const artifacts = path.join(temporary, "artifacts"); mkdirSync(artifacts, { mode: 0o700 });
  const run = spawnSync(process.execPath, [path.join(root, "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs"), "finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", eventPath, "--artifact-root", artifacts, "--baseline-root", repo, "--baseline-event", eventPath, "--baseline-artifacts", artifacts], { cwd: root, env: { ...process.env, RUNNER_TEMP: temporary }, encoding: "utf8" });
  assert.equal(run.status, 2); assert.match(run.stderr, /blocked/); assert.doesNotMatch(run.stdout, /"result":"pass"/);
}));
test("complete current proof still cannot replace missing native historical artifacts", () => fixture(({ repo, eventPath, check, temporary, tooling, evidence }) => {
  check(); const artifacts = path.join(temporary, "artifacts"), baselineArtifacts = path.join(temporary, "native"); mkdirSync(artifacts, { mode: 0o700 }); mkdirSync(baselineArtifacts, { mode: 0o700 });
  const records = proofRecords(artifacts); assert.doesNotThrow(() => verifyTestRecords(artifacts, records));
  writeFileSync(path.join(artifacts, "current.json"), JSON.stringify({ schemaVersion: "promotion-reviewed-code-current.pr283-merge-assertion.v1", event: { eventName: "pull_request", pullRequestNumber: PULL_REQUEST, baseCommit: BASE, headCommit: evidence }, sourceCommit: SOURCE, reviewedTooling: tooling, admissionCommit: evidence, tests: records, observation: {} }));
  const run = spawnSync(process.execPath, [path.join(root, "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs"), "finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", eventPath, "--artifact-root", artifacts, "--baseline-root", repo, "--baseline-event", eventPath, "--baseline-artifacts", baselineArtifacts], { cwd: root, env: { ...process.env, RUNNER_TEMP: temporary }, encoding: "utf8" });
  assert.equal(run.status, 2); assert.match(run.stderr, /ACTIVATION_ARTIFACT_SET/); assert.doesNotMatch(run.stdout, /"result":"pass"/);
}));
test("a stale current proof cannot substitute the source or an older head", () => fixture(({ repo, eventPath, check, temporary, tooling, evidence, event }) => {
  check(); const artifacts = path.join(temporary, "artifacts"); mkdirSync(artifacts, { mode: 0o700 });
  const correct = { schemaVersion: "promotion-reviewed-code-current.pr283-merge-assertion.v1", event: { eventName: "pull_request", pullRequestNumber: PULL_REQUEST, baseCommit: BASE, headCommit: evidence }, sourceCommit: SOURCE, reviewedTooling: tooling, admissionCommit: evidence, tests: [], observation: {} };
  for (const current of [{ ...correct, sourceCommit: BASE }, { ...correct, reviewedTooling: SOURCE }, { ...correct, event: { ...correct.event, headCommit: SOURCE } }]) {
    writeFileSync(path.join(artifacts, "current.json"), JSON.stringify(current));
    const run = spawnSync(process.execPath, [path.join(root, "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs"), "finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", eventPath, "--artifact-root", artifacts], { cwd: root, env: { ...process.env, RUNNER_TEMP: temporary }, encoding: "utf8" });
    assert.equal(run.status, 2); assert.match(run.stderr, /REVIEWED_CODE_CURRENT_(PROOF|EVENT)/); assert.doesNotMatch(run.stdout, /"result":"pass"/);
  }
}));
test("decision scope and every permission stay exact even after rehashing", () => {
  const expected = { result: "pass", scope: "exact-pr285-pr283-merge-assertion-only", permissions: PERMISSIONS, decisionDigest: "fixed" };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  for (const permission of Object.keys(PERMISSIONS)) assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, [permission]: true }, decisionDigest: "rehashed" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, scope: "other" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});
