import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, linkSync, chmodSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";
import * as production from "./promotion-reviewed-code-pr276-v3.mjs";
import { assertObservation as assertCandidateObservation, validateContent } from "./promotion-pr201-candidate.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { HOMEPAGE_EVIDENCE, HOMEPAGE_TREE, SHARED_BASE, BASE, SOURCE, SOURCE_PARENT, ORIGINAL_SOURCE, HISTORICAL_BASE, SOURCE_TREE, SOURCE_PATHS, SOURCE_INVENTORY, CODE_PATHS, EVIDENCE_PATHS, DIRECTORY, ADMISSION, COMMANDS, PERMISSIONS, PRESERVED_PATHS, BROWSER_TITLES, hash, inventory, verifyBrowserReport, verifyTestRecords, assertMaterializedTree } = production;
const fixtureNumber = 9992763; // Deliberately synthetic; never a production PR binding.
const observation = '{"syntheticFixture":true}\n';
const observationHash = hash(Buffer.from(observation));
const digest = value => hash(Buffer.from(stable(value)));
const git = (cwd, ...args) => execFileSync("/usr/bin/git", args, {
  cwd, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" }, maxBuffer: 128 * 1024 * 1024
}).toString("utf8").trim();
function write(dir, file, bytes) {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), bytes);
}
function goodBrowserReport() {
  return { errors: [], stats: { expected: BROWSER_TITLES.length, unexpected: 0, flaky: 0, skipped: 0 }, suites: [{
    suites: [], specs: BROWSER_TITLES.map(title => ({ title, file: "home-selected-hero.spec.ts", ok: true,
      tests: [{ projectName: "desktop-chrome", expectedStatus: "passed", status: "expected", results: [{ status: "passed", retry: 0, errors: [] }] }]
    }))
  }] };
}

// All commits, marker/review records and bindings created below are synthetic
// unit fixtures in an independent temporary Git repository. No production ref,
// source/evidence file or acceptance report is written by this harness.
async function fixture(run, mutate = () => {}, options = {}) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr276-v3-contract-fixture-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR276 Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
    write(repo, ".git/objects/info/alternates", path.join(common, "objects") + "\n");
    const source = git(repo, "commit-tree", SOURCE_TREE, ...(options.wrongSourceParent ? ["-p", BASE] : ["-p", HOMEPAGE_EVIDENCE, "-p", BASE]), "-m", "Synthetic source composition");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...CODE_PATHS, "scripts/promotion-required-check-legacy-successor-v1.mjs", "scripts/promotion-workflow-json-guard.mjs", "scripts/promotion-pr201-candidate.mjs", "scripts/promotion-reviewed-code-pr264.mjs", `${DIRECTORY}/`].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", source);
    for (const file of CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    const checkerPath = path.join(repo, "scripts/promotion-reviewed-code-pr276-v3.mjs");
    let checker = readFileSync(checkerPath, "utf8");
    for (const [key, value] of [["SOURCE", source], ["PULL_REQUEST", fixtureNumber], ["OBSERVATION_SHA", observationHash]]) {
      const declaration = new RegExp(`^export const ${key} = (?:null|"[a-f0-9]{40,64}"|[0-9]+);$`, "gm");
      assert.equal([...checker.matchAll(declaration)].length, 1, `one literal production ${key} binding`);
      checker = checker.replace(declaration, `export const ${key} = ${JSON.stringify(value)};`);
    }
    writeFileSync(checkerPath, checker);
    for (const file of options.extraTooling ?? []) write(repo, file, "synthetic extra tooling\n");
    git(repo, "add", "--sparse", "--", ...CODE_PATHS, ...(options.extraTooling ?? []));
    git(repo, "commit", "-q", "-m", "Synthetic tooling freeze");
    const release = git(repo, "rev-parse", "HEAD"), toolingDigest = digest(inventory(repo, source, release));
    const checks = '{"syntheticFixture":true}\n';
    write(repo, `${DIRECTORY}/source-checks.json`, checks);
    write(repo, `${DIRECTORY}/source-observation.json`, observation);
    const reviews = {};
    for (const [role, identity] of [["A11", "/root/a11_pr276_review"], ["A23", "/root/a23_pr276_review"]]) {
      const reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`;
      const report = `Synthetic ${role} fixture. NOT approval.\n`;
      write(repo, reportPath, report);
      const review = { schemaVersion: "promotion-reviewed-code-review.v1", role, reviewerIdentity: identity,
        reviewedAt: "2026-10-05T00:00:00.000Z", reviewedSource: source, reviewedTooling: release, toolingDigest,
        sourceInventoryDigest: SOURCE_INVENTORY, observationRawSha256: observationHash, checksRawSha256: hash(Buffer.from(checks)),
        result: "approved-for-ordinary-code-required-check", report: { path: reportPath, rawSha256: hash(Buffer.from(report)) }, liveAllowed: false };
      mutate({ kind: "review", role, value: review, repo });
      const bytes = JSON.stringify(review) + "\n";
      write(repo, `${DIRECTORY}/${role.toLowerCase()}-review.json`, bytes);
      reviews[role] = { decisionRawSha256: hash(Buffer.from(bytes)), reportRawSha256: hash(Buffer.from(report)) };
    }
    const admission = { schemaVersion: "promotion-reviewed-code-pr276.v3", baseCommit: BASE, homepageEvidence: HOMEPAGE_EVIDENCE, sourceCommit: source, sourceTree: SOURCE_TREE,
      sourceInventoryDigest: SOURCE_INVENTORY, toolingRelease: release, toolingTree: git(repo, "rev-parse", `${release}^{tree}`), toolingDigest,
      observationRawSha256: observationHash, checksRawSha256: hash(Buffer.from(checks)), reviews, permissions: PERMISSIONS };
    mutate({ kind: "admission", value: admission, repo });
    write(repo, ADMISSION, JSON.stringify(admission) + "\n");
    git(repo, "add", "--", ...EVIDENCE_PATHS); git(repo, "commit", "-q", "-m", "Synthetic evidence, not acceptance");
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const api = await import(pathToFileURL(checkerPath));
    const event = () => ({ number: fixtureNumber, pull_request: { base: { sha: BASE }, head: { sha: git(repo, "rev-parse", "HEAD") } } });
    const check = () => { writeFileSync(eventPath, JSON.stringify(event())); return api.preflight({ repoRoot: repo, eventName: "pull_request", eventPath }); };
    await run({ repo, source, release, evidence, api, eventPath, event, check, temporary });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("production CLI refuses missing evidence; unfinished freeze cannot be injected through environment", () => {
  const unfinished = [production.SOURCE, production.PULL_REQUEST, production.OBSERVATION_SHA].some(value => value === null);
  if (unfinished) assert.throws(production.assertFrozen, /PR276_V3_ADMISSION_NOT_FROZEN/);
  else assert.doesNotThrow(production.assertFrozen);
  for (const op of ["select", "preflight", "check", "finalize", "verify"]) {
    const r = spawnSync(process.execPath, ["scripts/promotion-reviewed-code-pr276-v3.mjs", op, "--repo", root, "--event-name", "pull_request", "--event-path", "/no-fixture-event.json"], { cwd: root, encoding: "utf8", env: { ...process.env, SOURCE: BASE, PULL_REQUEST: String(fixtureNumber), OBSERVATION_SHA: observationHash } });
    assert.equal(r.status, 2);
    if (unfinished) assert.match(r.stderr, /PR276_V3_ADMISSION_NOT_FROZEN/);
    assert.equal(r.stdout, "");
  }
});
test("combined source is the exact two-parent union and preserves both earlier packages", () => {
  assert.deepEqual(git(root, "show", "-s", "--format=%P", SOURCE).split(" "), [HOMEPAGE_EVIDENCE, BASE]);
  assert.equal(git(root, "rev-parse", HOMEPAGE_EVIDENCE + "^{tree}"), HOMEPAGE_TREE);
  assert.equal(digest(inventory(root, BASE, SOURCE_TREE)), SOURCE_INVENTORY);
  assert.deepEqual(inventory(root, BASE, SOURCE_TREE).map(r => r.path), SOURCE_PATHS);
  production.assertCombinedSource(root, SOURCE);
  production.assertPreservedContracts(root, SOURCE);
  const hero = inventory(root, BASE, SOURCE_TREE).find(r => r.path === "components/home/PedaNovaHomeHero.tsx");
  assert.equal(hero.after.rawSha256, "6a8c14fd875ba98e2756ff291be1a70b1d0406bbbc6474254d39437e955f842a");
  const selectedImage = inventory(root, SHARED_BASE, ORIGINAL_SOURCE).find(row => row.path.endsWith("owner-selected-white-stylus.png"));
  assert.equal(selectedImage.after.rawSha256, "d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889");
  assert.equal(CODE_PATHS.length, 4); assert.equal(EVIDENCE_PATHS.length, 7);
  for (const [key, value] of Object.entries(PERMISSIONS)) assert.equal(value, key === "ordinaryCodeEligible");
});
test("synthetic exact S/T/E chain exercises successful metadata preflight", () => fixture(({ check, evidence }) => assert.equal(check().admissionCommit, evidence)));
test("combined source cannot omit the homepage parent even with identical source tree", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_SOURCE_PARENTS/), undefined, { wrongSourceParent: true }));
test("extra tooling cannot be laundered by matching evidence digests", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_TOOLING_PATHS/), undefined, { extraTooling: ["docs/synthetic-extra.md"] }));
test("one-byte runtime drift and added public candidate fail full-tree equality", async () => {
  for (const file of ["components/home/PedaNovaHomeHero.tsx", "data/generated-content/us-ar-g6-g12-pr201-diversity-228-v2/revised-228.json", "data/usArkansasQuestions.ts", "public/synthetic-candidate.json"]) await fixture(({ repo, check }) => {
    write(repo, file, "synthetic source drift\n"); git(repo, "add", "--sparse", "--", file); git(repo, "commit", "-q", "-m", "Synthetic drift");
    assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
});
test("wrong PR numbers and changed bases never inherit old admission", () => fixture(({ api, evidence, eventPath, repo }) => {
  for (const number of [259, 264, 270, 271, 272, 274]) {
    writeFileSync(eventPath, JSON.stringify({ number, pull_request: { base: { sha: BASE }, head: { sha: evidence } } }));
    assert.throws(() => api.preflight({ repoRoot: repo, eventName: "pull_request", eventPath }), /REVIEWED_CODE_PR_BASE/);
  }
  const actual = { head: evidence, headDescendsEvidence: true, baseAncestorHead: true, headTree: "same", evidenceTree: "same" };
  assert.throws(() => api.assertEventComposition("pull_request", { number: fixtureNumber, pull_request: { base: { sha: HISTORICAL_BASE }, head: { sha: evidence } } }, actual), /REVIEWED_CODE_PR_BASE/);
}));
test("real Git preserving main merge and unchanged-tree child satisfy exact push rules", () => fixture(({ repo, api, evidence, eventPath }) => {
  git(repo, "checkout", "-q", "--detach", BASE); git(repo, "merge", "--no-ff", "--no-edit", evidence);
  let head = git(repo, "rev-parse", "HEAD");
  writeFileSync(eventPath, JSON.stringify({ before: BASE, after: head, ref: "refs/heads/main" }));
  assert.equal(api.preflight({ repoRoot: repo, eventName: "push", eventPath }).head, head);
  const before = head; git(repo, "commit", "--allow-empty", "-q", "-m", "Synthetic unchanged tree"); head = git(repo, "rev-parse", "HEAD");
  writeFileSync(eventPath, JSON.stringify({ before, after: head, ref: "refs/heads/main" }));
  assert.equal(api.preflight({ repoRoot: repo, eventName: "push", eventPath }).head, head);
  writeFileSync(eventPath, JSON.stringify({ before, after: head, ref: "refs/heads/other" }));
  assert.throws(() => api.preflight({ repoRoot: repo, eventName: "push", eventPath }), /REVIEWED_CODE_PUSH_BASE/);
}));
test("rehashed counterfeit reviewer, stale source and approval permissions are rejected", async () => {
  for (const field of ["reviewerIdentity", "reviewedSource", "result", "liveAllowed"]) await fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_REVIEW_BINDING/), item => {
    if (item.kind === "review" && item.role === "A23") item.value[field] = field === "liveAllowed" ? true : field === "reviewedSource" ? BASE : "forged";
  });
  await fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_PERMISSION/), item => { if (item.kind === "admission") item.value.permissions = { ...PERMISSIONS, deployAllowed: true }; });
});
test("dirty, symlinked, hardlinked or re-added review evidence fails", async () => {
  await fixture(({ repo, check }) => { write(repo, `${DIRECTORY}/a11-review.md`, "changed\n"); assert.throws(check, /REVIEWED_CODE_DIRTY/); });
  await fixture(({ repo, check }) => {
    const file = `${DIRECTORY}/a11-review.md`; rmSync(path.join(repo, file)); symlinkSync("a23-review.md", path.join(repo, file));
    git(repo, "add", "--", file); git(repo, "commit", "-q", "-m", "Synthetic symlink"); assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
  await fixture(({ repo, check, temporary }) => {
    linkSync(path.join(repo, ADMISSION), path.join(temporary, "admission-hardlink")); assert.throws(check, /REVIEWED_CODE_FILE/);
  });
  await fixture(({ repo, check }) => {
    const bytes = readFileSync(path.join(repo, ADMISSION)); rmSync(path.join(repo, ADMISSION)); git(repo, "add", "--", ADMISSION); git(repo, "commit", "-q", "-m", "Synthetic remove");
    write(repo, ADMISSION, bytes); git(repo, "add", "--", ADMISSION); git(repo, "commit", "-q", "-m", "Synthetic re-add"); assert.throws(check, /REVIEWED_CODE_ADMISSION_HISTORY/);
  });
});
test("prior PR277 A18 evidence cannot change even when other bindings are self-consistent", () => fixture(({ repo, api }) => {
  const file = "coordination/integration/pr201-diversity-228-v1/a18/qa-decision.json";
  write(repo, file, "{}\n"); git(repo, "add", "--sparse", "--", file); git(repo, "commit", "-q", "-m", "Synthetic prior drift");
  assert.throws(() => api.assertPreservedContracts(repo, "HEAD"), /REVIEWED_CODE_PRIOR_CONTRACT/);
}));
test("literal Git binding ignores core.worktree redirects and replacement refs", () => fixture(({ repo, source, check, evidence, temporary }) => {
  const redirect = path.join(temporary, "redirect"); mkdirSync(redirect); git(repo, "config", "core.worktree", redirect);
  assert.equal(check().head, evidence); git(repo, "config", "--unset", "core.worktree"); git(repo, "replace", source, BASE);
  assert.equal(check().head, evidence);
}));
test("actual execution rejects sparse materialization after metadata-only preflight", () => fixture(({ repo, evidence, check }) => {
  assert.equal(check().head, evidence); assert.throws(() => assertMaterializedTree(repo, evidence), /REVIEWED_CODE_INDEX_FLAGS/);
}));
test("browser proof requires all 31 real homepage cases, no skipped/flaky/retried/filtered pass", () => {
  const verify = r => verifyBrowserReport(Buffer.from(JSON.stringify(r)));
  assert.doesNotThrow(() => verify(goodBrowserReport()));
  const mutations = [r => r.suites[0].specs.pop(), r => r.suites[0].specs[0].title = "unrelated", r => r.stats.skipped = 1,
    r => r.suites[0].specs[0].tests[0].results[0].retry = 1, r => r.suites[0].specs[0].tests[0].status = "flaky",
    r => r.suites[0].specs[0].tests[0].expectedStatus = "failed", r => r.errors.push({ message: "page error" }),
    r => r.suites[0].specs[0].tests[0].projectName = "mobile-chrome"];
  for (const mutate of mutations) { const r = goodBrowserReport(); mutate(r); assert.throws(() => verify(r), /REVIEWED_CODE_BROWSER/); }
  assert.throws(() => verifyBrowserReport(Buffer.from('{"suites":[],"suites":[]}')));
});
test("exact successful commands and output hashes are required, including browser JSON", () => {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr276-v3-proof-fixture-")));
  try {
    const rows = COMMANDS.map(([name, args]) => {
      const stdout = name === "browser" ? JSON.stringify(goodBrowserReport()) : "synthetic output\n";
      write(dir, `${name}.stdout`, stdout); write(dir, `${name}.stderr`, "");
      return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from(stdout)), stderrSha256: hash(Buffer.alloc(0)) };
    });
    assert.doesNotThrow(() => verifyTestRecords(dir, rows));
    assert.throws(() => verifyTestRecords(dir, rows.slice(1)), /REVIEWED_CODE_TEST_SET/);
    assert.throws(() => verifyTestRecords(dir, rows.map((r, i) => i ? r : { ...r, exitCode: 1 })), /REVIEWED_CODE_TEST_EXIT/);
    assert.throws(() => verifyTestRecords(dir, rows.map((r, i) => i ? r : { ...r, args: ["--version"] })), /REVIEWED_CODE_TEST_COMMAND/);
    write(dir, "types.stdout", "changed\n"); assert.throws(() => verifyTestRecords(dir, rows), /REVIEWED_CODE_TEST_BYTES/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("workflow adds strict marker-first mode and preserves every prior execution step", () => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${SOURCE}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], previous = before.jobs["promotion-shadow-gate"];
  assert.equal(job.name, previous.name); assert.equal(job.if, undefined); assert.deepEqual(current.on, before.on);
  assert.deepEqual(job.permissions, previous.permissions); assert.deepEqual(job.env, previous.env);
  for (const step of previous.steps.filter(s => s.id !== "contract")) assert.deepEqual(job.steps.find(s => s.name === step.name), step);
  const select = job.steps.find(s => s.id === "contract").run;
  assert.ok(select.indexOf("pr276-v3/admission.json") < select.indexOf("pr276-v2/admission.json"));
  assert.match(select, /-L coordination\/integration\/reviewed-code\/pr276-v3\/admission\.json/);
  assert.match(select, /set -euo pipefail/); assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  const named = name => job.steps.find(s => s.name === name);
  for (const name of ["Test exact PR276 v3 reviewed-code contract", "Check current PR276 v3 composition", "Prepare historical baseline for PR276 v3 reviewed code", "Verify historical non-live chain for PR276 v3 reviewed code", "Finalize PR276 v3 reviewed-code decision"])
    assert.equal(named(name).if, "${{ steps.contract.outputs.mode == 'reviewed-code-pr276-v3' }}");
  assert.equal(named("Enforce PR276 v3 reviewed-code required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr276-v3' }}");
  assert.match(named("Test exact PR276 v3 reviewed-code contract").run, /playwright install --with-deps chromium/);
  assert.match(named("Verify historical non-live chain for PR276 v3 reviewed code").run, /promotion-required-check-legacy-successor-v1\.mjs.*evaluate/);
  for (const step of job.steps) assert.equal(step["continue-on-error"], undefined);
});
test("bound synthetic CLI finalizer refuses missing current or native proof", () => fixture(({ repo, api, check, eventPath, temporary }) => {
  const context = check(), artifacts = path.join(temporary, "artifacts"), native = path.join(temporary, "native");
  mkdirSync(artifacts, { mode: 0o700 }); mkdirSync(native, { mode: 0o700 });
  const invoke = () => spawnSync(process.execPath, [path.join(repo, "scripts/promotion-reviewed-code-pr276-v3.mjs"), "finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", eventPath, "--artifact-root", artifacts, "--baseline-artifacts", native], { cwd: repo, encoding: "utf8", env: { ...process.env, RUNNER_TEMP: temporary } });
  let result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /ENOENT/); assert.equal(result.stdout, "");
  const tests = COMMANDS.map(([name, args]) => {
    const stdout = name === "browser" ? JSON.stringify(goodBrowserReport()) : "fixture\n";
    write(artifacts, `${name}.stdout`, stdout); write(artifacts, `${name}.stderr`, "");
    return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from(stdout)), stderrSha256: hash(Buffer.alloc(0)) };
  });
  write(artifacts, "current.json", JSON.stringify({ schemaVersion: "promotion-reviewed-code-current.v3", event: context.event, sourceCommit: api.SOURCE, admissionCommit: context.admissionCommit, frozenMain: {commit: BASE, tree: production.SOURCE_PARENT_TREE}, tests, observation: {} }));
  result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /REVIEWED_CODE_FROZEN_MAIN_ROOT/); assert.equal(result.stdout, "");
  write(artifacts, "current.json", JSON.stringify({ schemaVersion: "promotion-reviewed-code-current.v1", event: context.event, sourceCommit: api.SOURCE, admissionCommit: context.admissionCommit, tests, observation: {} }));
  result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /REVIEWED_CODE_SCHEMA/); assert.equal(result.stdout, "");
}));
test("decision verification rejects changed scope and permission even if rehashed", () => {
  const expected = { result: "pass", scope: "exact-pr276-pr277-composition-only", permissions: PERMISSIONS, decisionDigest: "fixture" };
  assert.doesNotThrow(() => production.verifyDecision(structuredClone(expected), expected));
  assert.throws(() => production.verifyDecision({ ...expected, permissions: { ...PERMISSIONS, liveAllowed: true }, decisionDigest: "forged" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});

test("PR276 has its own exact event binding without transferring PR274 admission", () => {
  const head = SOURCE;
  const event = { number: 276, pull_request: { base: { sha: BASE }, head: { sha: head } } };
  const actual = { head, headDescendsEvidence: true, baseAncestorHead: true, headTree: "same", evidenceTree: "same" };
  assert.doesNotThrow(() => production.assertEventComposition("pull_request", event, actual));
});

test("combined admission cannot substitute main for its frozen homepage parent", () => fixture(({check}) => assert.throws(check, /REVIEWED_CODE_SCOPE/), item => {
  if (item.kind === "admission") item.value.homepageEvidence = BASE;
}));


test("current PR201 content validator preserves the 228/1272 split while the old whole-tree admission refuses combined code", () => {
  const content = validateContent(root);
  assert.equal(content.revisedRows, 228); assert.equal(content.unchangedRows, 1272);
  const result = spawnSync(process.execPath, ["scripts/promotion-pr201-candidate.mjs", "inspect", "--repo", root], {cwd:root,encoding:"utf8"});
  assert.equal(result.status, 2); assert.match(result.stderr, /PR201_OUT_OF_SCOPE/);
});

test("combined observation permits only one extra candidate and rejects changed reachability and canonical audit", () => {
  const prior = JSON.parse(readFileSync(path.join(root, "coordination/integration/reviewed-code/pr276-v2/source-observation.json")));
  const combined = structuredClone(prior); combined.expectedRuntimePolicy.coveredFileCount += 1;
  combined.expectedRuntimePolicy.coveredFilesDigest = "new-exact-coverage";
  combined.expectedRuntimePolicy.classificationsDigest = "new-exact-classification";
  assert.doesNotThrow(() => assertCandidateObservation(combined, combined, prior));
  assert.throws(() => assertCandidateObservation(combined, prior, prior), /PR201_CURRENT_OBSERVATION/);
  for (const change of [x => x.expectedRuntimePolicy.coveredFileCount++, x => x.expectedRuntimePolicy.injectedReachableChange = true, x => x.canonicalAuditDigest = "0".repeat(64)]) {
    const bad = structuredClone(combined); change(bad);
    assert.throws(() => assertCandidateObservation(bad, bad, prior), /PR201_(COVERAGE_DELTA|RUNTIME_BOUNDARY|CANONICAL_AUDIT)/);
  }
});

test("new selector executes fail-closed for a malformed present marker and cannot fall back", () => fixture(({repo,temporary}) => {
  const workflow=YAML.parse(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"));
  const selector=workflow.jobs["promotion-shadow-gate"].steps.find(s=>s.id==="contract").run;
  write(repo, ADMISSION, '{"schemaVersion":"malformed"}\n');
  const result=spawnSync("bash",["-c",selector],{cwd:repo,encoding:"utf8",env:{...process.env,GITHUB_WORKSPACE:repo,GITHUB_EVENT_NAME:"pull_request",GITHUB_EVENT_PATH:"/no-event",GITHUB_OUTPUT:path.join(temporary,"selector-output")}});
  assert.notEqual(result.status,0); assert.match(result.stderr,/REVIEWED_CODE_(DIRTY|SCHEMA)/);
  assert.equal(result.stdout,"");
}));

test("new route actually wires frozen PR277 and the unchanged pinned historical fetch", () => {
  const workflow=YAML.parse(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"));
  const steps=workflow.jobs["promotion-shadow-gate"].steps;
  const original=steps.find(s=>s.name==="Fetch pinned historical PR262 source");
  const current=steps.find(s=>s.name==="Fetch pinned historical PR262 source for PR276 v3");
  assert.deepEqual({...current,name:original.name,if:original.if},original);
  assert.equal(current.if,"${{ steps.contract.outputs.mode == 'reviewed-code-pr276-v3' }}");
  for(const name of ["Check current PR276 v3 composition","Finalize PR276 v3 reviewed-code decision","Enforce PR276 v3 reviewed-code required check"])
    assert.match(steps.find(s=>s.name===name).run,/--frozen-main-root "\$RUNNER_TEMP\/promotion-pr276-v3-frozen-main"/);
  const snapshot=steps.find(s=>s.name==="Prepare exact PR277 main contract snapshot");
  assert.equal(snapshot.if,current.if); assert.match(snapshot.run,new RegExp(BASE));
  assert.equal(production.COMMANDS.filter(([name])=>name==="pr277-contract").length,1);
  assert.deepEqual(production.COMMANDS.find(([name])=>name==="pr277-contract")[1],["--test","scripts/promotion-pr201-candidate.test.mjs"]);
});


test("browser command environment retains Playwright's real run-owned path guard", () => {
  const environment=production.commandEnvironment("browser", SOURCE, path.join(os.tmpdir(),"pr276-external-candidate-artifacts"));
  assert.equal(environment.HK_MATH_DB_PATH,undefined); assert.equal(environment.NODE_ENV,undefined);
  assert.equal(environment.MAIS_ALLOW_EXTERNAL_ARTIFACTS,undefined);
  const run=spawnSync(process.execPath,[...COMMANDS.find(([name])=>name==="browser")[1],"--list"],{cwd:root,env:environment,encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024});
  assert.equal(run.status,0,run.stderr);
  assert.equal(production.commandEnvironment("pr277-grading",SOURCE,"/synthetic-artifacts").HK_MATH_DB_PATH,"/synthetic-artifacts/regression.sqlite");
});
