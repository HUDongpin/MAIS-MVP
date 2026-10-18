import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, linkSync, chmodSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";
import * as production from "./promotion-reviewed-code-pr275.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { BASE, SOURCE_TREE, SOURCE_PATHS, SOURCE_INVENTORY, CODE_PATHS, EVIDENCE_PATHS, DIRECTORY, ADMISSION, COMMANDS, PERMISSIONS, PRESERVED_PATHS, BROWSER_TITLES, NODE_TEST_TITLES, EVIDENCE_TEST_COUNT, hash, inventory, verifyEvidenceReport, verifyModelsReport, verifyBrowserReport, verifyTestRecords, assertMaterializedTree } = production;
const fixtureNumber = 999275; // Deliberately synthetic; never a production PR binding.
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
function goodNodeReport(kind) {
  const titles = NODE_TEST_TITLES[kind], count = titles.length;
  return "TAP version 13\n" + titles.map((title, i) => `ok ${i + 1} - ${title}\n`).join("")
    + `1..${count}\n# tests ${count}\n# pass ${count}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
}
const goodEvidenceReport = () => goodNodeReport("evidence");
const goodModelsReport = () => goodNodeReport("models");
function goodBrowserReport() {
  return { errors: [], stats: { expected: 3, unexpected: 0, flaky: 0, skipped: 0 }, suites: [{
    suites: [], specs: BROWSER_TITLES.map(title => ({ title, file: "hk-coordinate-transform-user-points.spec.ts", ok: true,
      tests: [{ projectName: "desktop-chrome", expectedStatus: "passed", status: "expected", results: [{ status: "passed", retry: 0, errors: [] }] }]
    }))
  }] };
}

// All commits, marker/review records and bindings created below are synthetic
// unit fixtures in an independent temporary Git repository. No production ref,
// source/evidence file or acceptance report is written by this harness.
async function fixture(run, mutate = () => {}, options = {}) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr275-contract-fixture-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR275 Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
    write(repo, ".git/objects/info/alternates", path.join(common, "objects") + "\n");
    const source = git(repo, "commit-tree", options.wrongSourceTree ? git(repo, "rev-parse", `${BASE}^{tree}`) : SOURCE_TREE, "-p", options.wrongSourceParent ? production.HISTORICAL_BASE : BASE, "-m", "Synthetic source composition");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...CODE_PATHS, "scripts/promotion-required-check-legacy-successor-v1.mjs", "scripts/promotion-workflow-json-guard.mjs", `${DIRECTORY}/`].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", source);
    for (const file of CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    const checkerPath = path.join(repo, "scripts/promotion-reviewed-code-pr275.mjs");
    let checker = readFileSync(checkerPath, "utf8");
    for (const [key, value] of [["SOURCE", source], ["PULL_REQUEST", fixtureNumber], ["OBSERVATION_SHA", observationHash]]) {
      const declaration = new RegExp(`^export const ${key} = (?:null|"[a-f0-9]{40,64}"|[0-9]+);$`, "gm");
      assert.equal([...checker.matchAll(declaration)].length, 1, `one literal production ${key} binding`);
      checker = checker.replace(declaration, `export const ${key} = ${JSON.stringify(value)};`);
    }
    writeFileSync(checkerPath, checker);
    for (const file of options.extraTooling ?? []) write(repo, file, "synthetic extra tooling\n");
    if (options.wrongToolingParent) git(repo, "commit", "--allow-empty", "-q", "-m", "Synthetic extra parent");
    git(repo, "add", "--sparse", "--", ...CODE_PATHS, ...(options.extraTooling ?? []));
    git(repo, "commit", "-q", "-m", "Synthetic tooling freeze");
    const release = git(repo, "rev-parse", "HEAD"), toolingDigest = digest(inventory(repo, source, release));
    const checks = '{"syntheticFixture":true}\n';
    write(repo, `${DIRECTORY}/source-checks.json`, checks);
    write(repo, `${DIRECTORY}/source-observation.json`, observation);
    const reviews = {};
    for (const [role, identity] of [["A11", "/root/pr275_a11_review"], ["A23", "/root/pr275_gate_review"]]) {
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
    const admission = { schemaVersion: "promotion-reviewed-code-pr275.v1", baseCommit: BASE, sourceCommit: source, sourceTree: SOURCE_TREE,
      sourceInventoryDigest: SOURCE_INVENTORY, toolingRelease: release, toolingTree: git(repo, "rev-parse", `${release}^{tree}`), toolingDigest,
      observationRawSha256: observationHash, checksRawSha256: hash(Buffer.from(checks)), reviews, permissions: PERMISSIONS };
    mutate({ kind: "admission", value: admission, repo });
    write(repo, ADMISSION, JSON.stringify(admission) + "\n");
    for (const file of options.extraEvidence ?? []) write(repo, file, "synthetic extra evidence\n");
    if (options.wrongEvidenceParent) git(repo, "commit", "--allow-empty", "-q", "-m", "Synthetic extra evidence parent");
    git(repo, "add", "--", ...EVIDENCE_PATHS, ...(options.extraEvidence ?? [])); git(repo, "commit", "-q", "-m", "Synthetic evidence, not acceptance");
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const api = await import(pathToFileURL(checkerPath));
    const event = () => ({ number: fixtureNumber, pull_request: { base: { sha: BASE }, head: { sha: git(repo, "rev-parse", "HEAD") } } });
    const check = () => { writeFileSync(eventPath, JSON.stringify(event())); return api.preflight({ repoRoot: repo, eventName: "pull_request", eventPath }); };
    await run({ repo, source, release, evidence, api, eventPath, event, check, temporary });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("production CLI refuses missing evidence; unfinished freeze cannot be injected through environment", () => {
  const unfinished = [production.SOURCE, production.PULL_REQUEST, production.OBSERVATION_SHA].some(value => value === null);
  if (unfinished) assert.throws(production.assertFrozen, /PR275_ADMISSION_NOT_FROZEN/);
  else assert.doesNotThrow(production.assertFrozen);
  for (const op of ["select", "preflight", "check", "finalize", "verify"]) {
    const r = spawnSync(process.execPath, ["scripts/promotion-reviewed-code-pr275.mjs", op, "--repo", root, "--event-name", "pull_request", "--event-path", "/no-fixture-event.json"], { cwd: root, encoding: "utf8", env: { ...process.env, SOURCE: BASE, PULL_REQUEST: String(fixtureNumber), OBSERVATION_SHA: observationHash } });
    assert.equal(r.status, 2);
    if (unfinished) assert.match(r.stderr, /PR275_ADMISSION_NOT_FROZEN/);
    assert.equal(r.stdout, "");
  }
});
test("source composition pins exactly the four reviewed blobs and retains all prior contracts", () => {
  assert.equal(digest(inventory(root, BASE, SOURCE_TREE)), SOURCE_INVENTORY);
  assert.deepEqual(inventory(root, BASE, SOURCE_TREE).map(r => r.path), SOURCE_PATHS);
  for (const file of SOURCE_PATHS) assert.equal(git(root, "rev-parse", `${SOURCE_TREE}:${file}`), git(root, "rev-parse", `${production.SOURCE}:${file}`));
  production.assertPreservedContracts(root, BASE);
  assert.equal(PRESERVED_PATHS.filter(p => p.startsWith("coordination/integration/reviewed-code/")).length, 3);
  assert.equal(CODE_PATHS.length, 4); assert.equal(EVIDENCE_PATHS.length, 7);
  for (const [key, value] of Object.entries(PERMISSIONS)) assert.equal(value, key === "ordinaryCodeEligible");
});
test("synthetic exact S/T/E chain exercises successful metadata preflight", () => fixture(({ check, evidence }) => assert.equal(check().admissionCommit, evidence)));
test("source cannot drop original ancestry even with identical source tree", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_SOURCE_PARENT/), undefined, { wrongSourceParent: true }));
test("untracked Git grafts cannot counterfeit a direct source-to-tooling parent", () => fixture(({ repo, source, release, check }) => {
  assert.throws(check, /REVIEWED_CODE_RELEASE_PARENT/);
  const rawCommit = git(repo, "cat-file", "-p", release);
  assert.ok(!rawCommit.includes(`parent ${source}\n`));
  write(repo, ".git/info/grafts", `${release} ${source}\n`);
  assert.throws(check, /REVIEWED_CODE_RELEASE_PARENT/);
}, undefined, { wrongToolingParent: true }));
test("extra tooling cannot be laundered by matching evidence digests", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_TOOLING_PATHS/), undefined, { extraTooling: ["docs/synthetic-extra.md"] }));
test("one-byte runtime drift and added public candidate fail full-tree equality", async () => {
  for (const file of [SOURCE_PATHS[0], "public/synthetic-candidate.json"]) await fixture(({ repo, check }) => {
    write(repo, file, "synthetic source drift\n"); git(repo, "add", "--sparse", "--", file); git(repo, "commit", "-q", "-m", "Synthetic drift");
    assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
});
test("wrong PR numbers and changed bases never inherit old admission", () => fixture(({ api, evidence, eventPath, repo }) => {
  for (const number of [259, 264, 270, 271, 272, 274, 275]) {
    writeFileSync(eventPath, JSON.stringify({ number, pull_request: { base: { sha: BASE }, head: { sha: evidence } } }));
    assert.throws(() => api.preflight({ repoRoot: repo, eventName: "pull_request", eventPath }), /REVIEWED_CODE_PR_BASE/);
  }
  const actual = { head: evidence, headDescendsEvidence: true, baseAncestorHead: true, headTree: "same", evidenceTree: "same" };
  assert.throws(() => api.assertEventComposition("pull_request", { number: fixtureNumber, pull_request: { base: { sha: production.HISTORICAL_BASE }, head: { sha: evidence } } }, actual), /REVIEWED_CODE_PR_BASE/);
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
test("prior PR274 evidence cannot change even when other bindings are self-consistent", () => fixture(({ repo, api }) => {
  const file = "coordination/integration/reviewed-code/pr264-v1/admission.json";
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
test("browser proof requires all three real modes, no skipped/flaky/retried/filtered pass", () => {
  const verify = r => verifyBrowserReport(Buffer.from(JSON.stringify(r)));
  assert.doesNotThrow(() => verify(goodBrowserReport()));
  const mutations = [r => r.suites[0].specs.pop(), r => r.suites[0].specs[0].title = "unrelated", r => r.stats.skipped = 1,
    r => r.suites[0].specs[0].tests[0].results[0].retry = 1, r => r.suites[0].specs[0].tests[0].status = "flaky",
    r => r.suites[0].specs[0].tests[0].expectedStatus = "failed", r => r.errors.push({ message: "page error" }),
    r => r.suites[0].specs[0].tests[0].projectName = "mobile-chrome"];
  for (const mutate of mutations) { const r = goodBrowserReport(); mutate(r); assert.throws(() => verify(r), /REVIEWED_CODE_BROWSER/); }
  assert.throws(() => verifyBrowserReport(Buffer.from('{"suites":[],"suites":[]}')));
});
test("browser proof rejects suffix collisions and singular errors", () => {
  const verify = value => verifyBrowserReport(Buffer.from(JSON.stringify(value)));
  for (const mutate of [
    r => { for (const spec of r.suites[0].specs) spec.file = "totally-unrelated-hk-coordinate-transform-user-points.spec.ts"; },
    r => { r.suites[0].specs[0].tests[0].results[0].error = { message: "reported failure" }; }
  ]) {
    const report = goodBrowserReport(); mutate(report);
    assert.throws(() => verify(report), /REVIEWED_CODE_BROWSER/);
  }
  const absolute = goodBrowserReport();
  for (const spec of absolute.suites[0].specs) spec.file = "/checkout/tests/e2e/hk-coordinate-transform-user-points.spec.ts";
  assert.doesNotThrow(() => verify(absolute));
});
test("exact successful commands and output hashes are required, including browser JSON", () => {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr275-proof-fixture-")));
  try {
    const rows = COMMANDS.map(([name, args]) => {
      const stdout = name === "browser" ? JSON.stringify(goodBrowserReport()) : name === "evidence" ? goodEvidenceReport() : name === "models" ? goodModelsReport() : "synthetic output\n";
      write(dir, `${name}.stdout`, stdout); write(dir, `${name}.stderr`, "");
      return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from(stdout)), stderrSha256: hash(Buffer.alloc(0)) };
    });
    assert.doesNotThrow(() => verifyTestRecords(dir, rows));
    assert.throws(() => verifyTestRecords(dir, rows.slice(1)), /REVIEWED_CODE_TEST_SET/);
    assert.throws(() => verifyTestRecords(dir, rows.map((r, i) => i ? r : { ...r, exitCode: 1 })), /REVIEWED_CODE_TEST_EXIT/);
    assert.throws(() => verifyTestRecords(dir, rows.map((r, i) => i ? r : { ...r, args: ["--version"] })), /REVIEWED_CODE_TEST_COMMAND/);
    write(dir, "models.stdout", "");
    const emptyModelRows = rows.map(row => row.name === "models" ? { ...row, stdoutSha256: hash(Buffer.alloc(0)) } : row);
    assert.throws(() => verifyTestRecords(dir, emptyModelRows), /REVIEWED_CODE_MODELS_REPORT/);
    write(dir, "models.stdout", "changed\n"); assert.throws(() => verifyTestRecords(dir, rows), /REVIEWED_CODE_TEST_BYTES/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("workflow adds strict marker-first mode and preserves every prior execution step", () => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${BASE}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], previous = before.jobs["promotion-shadow-gate"];
  assert.equal(job.name, previous.name); assert.equal(job.if, undefined); assert.deepEqual(current.on, before.on);
  assert.deepEqual(job.permissions, previous.permissions); assert.deepEqual(job.env, previous.env);
  for (const step of previous.steps.filter(s => s.id !== "contract")) assert.deepEqual(job.steps.find(s => s.name === step.name), step);
  const select = job.steps.find(s => s.id === "contract").run;
  assert.ok(select.indexOf("pr275-v1/admission.json") < select.indexOf("pr264-v1/admission.json"));
  assert.match(select, /-L coordination\/integration\/reviewed-code\/pr275-v1\/admission\.json/);
  assert.match(select, /set -euo pipefail/); assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  const named = name => job.steps.find(s => s.name === name);
  for (const name of ["Test exact PR275 reviewed-code contract", "Check current PR275 composition", "Prepare historical baseline for PR275 reviewed code", "Verify historical non-live chain for PR275 reviewed code", "Finalize PR275 reviewed-code decision"])
    assert.equal(named(name).if, "${{ steps.contract.outputs.mode == 'reviewed-code-pr275' }}");
  assert.equal(named("Enforce PR275 reviewed-code required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr275' }}");
  assert.match(named("Test exact PR275 reviewed-code contract").run, /playwright install --with-deps chromium/);
  assert.match(named("Verify historical non-live chain for PR275 reviewed code").run, /promotion-required-check-legacy-successor-v1\.mjs.*evaluate/);
  for (const step of job.steps) assert.equal(step["continue-on-error"], undefined);
});
test("bound synthetic CLI finalizer refuses missing current or native proof", () => fixture(({ repo, api, check, eventPath, temporary }) => {
  const context = check(), artifacts = path.join(temporary, "artifacts"), native = path.join(temporary, "native");
  mkdirSync(artifacts, { mode: 0o700 }); mkdirSync(native, { mode: 0o700 });
  const invoke = () => spawnSync(process.execPath, [path.join(repo, "scripts/promotion-reviewed-code-pr275.mjs"), "finalize", "--repo", repo, "--event-name", "pull_request", "--event-path", eventPath, "--artifact-root", artifacts, "--baseline-artifacts", native], { cwd: repo, encoding: "utf8", env: { ...process.env, RUNNER_TEMP: temporary } });
  let result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /ENOENT/); assert.equal(result.stdout, "");
  const tests = COMMANDS.map(([name, args]) => {
    const stdout = name === "browser" ? JSON.stringify(goodBrowserReport()) : name === "evidence" ? goodEvidenceReport() : name === "models" ? goodModelsReport() : "fixture\n";
    write(artifacts, `${name}.stdout`, stdout); write(artifacts, `${name}.stderr`, "");
    return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from(stdout)), stderrSha256: hash(Buffer.alloc(0)) };
  });
  write(artifacts, "current.json", JSON.stringify({ schemaVersion: "promotion-reviewed-code-current.v1", event: context.event, sourceCommit: api.SOURCE, admissionCommit: context.admissionCommit, tests, observation: {} }));
  result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /ACTIVATION_ARTIFACT_SET/); assert.equal(result.stdout, "");
  for (const file of ["decision.v1.json", "fresh.json", "fresh.stderr", "native-runs.v1.json", "verification.json", "verification.stderr"]) write(native, file, "{}");
  chmodSync(path.join(native, "fresh.json"), 0o644);
  result = invoke(); assert.equal(result.status, 2); assert.match(result.stderr, /ACTIVATION_ARTIFACT_FILE/); assert.equal(result.stdout, "");
}));
test("decision verification rejects changed scope and permission even if rehashed", () => {
  const expected = { result: "pass", scope: "exact-pr275-source-integration-only", permissions: PERMISSIONS, decisionDigest: "fixture" };
  assert.doesNotThrow(() => production.verifyDecision(structuredClone(expected), expected));
  assert.throws(() => production.verifyDecision({ ...expected, permissions: { ...PERMISSIONS, liveAllowed: true }, decisionDigest: "forged" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});

function selectFixture(marker, reject = false) {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr275-selector-fixture-")));
  try {
    const markerPath = path.join(dir, "coordination/integration/reviewed-code/pr275-v1/admission.json");
    mkdirSync(path.dirname(markerPath), { recursive: true });
    if (marker === "file") writeFileSync(markerPath, "{}\n");
    if (marker === "symlink") symlinkSync("missing-target", markerPath);
    mkdirSync(path.join(dir, "bin"));
    writeFileSync(path.join(dir, "bin/node"), `#!/bin/sh\nprintf '%s\\n' "$1" >> "$GITHUB_WORKSPACE/calls"\ncase "$1" in\n*pr275.mjs) ${reject ? "exit 2" : "echo reviewed-code-pr275"} ;;\n*) echo successor ;;\nesac\n`, { mode: 0o755 });
    const workflow = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
    const script = workflow.jobs["promotion-shadow-gate"].steps.find(step => step.id === "contract").run;
    const result = spawnSync("/bin/bash", ["-c", script], { cwd: dir, encoding: "utf8", env: { PATH: `${dir}/bin:/usr/bin:/bin`, GITHUB_WORKSPACE: dir, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: path.join(dir, "event.json"), GITHUB_OUTPUT: path.join(dir, "output") } });
    return { status: result.status, calls: readFileSync(path.join(dir, "calls"), "utf8") };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("workflow executes PR275 selection first when its marker is present", () => {
  const result = selectFixture("file");
  assert.equal(result.status, 0);
  assert.equal(result.calls, "scripts/promotion-reviewed-code-pr275.mjs\n");
});

test("a malformed or symlink PR275 marker fails without falling back", () => {
  for (const marker of ["file", "symlink"]) {
    const result = selectFixture(marker, true);
    assert.notEqual(result.status, 0);
    assert.equal(result.calls, "scripts/promotion-reviewed-code-pr275.mjs\n");
  }
});


test("wrong source tree, intermediate parents and extra evidence cannot be admitted", async () => {
  for (const [options, code] of [
    [{ wrongSourceTree: true }, /REVIEWED_CODE_SCOPE/],
    [{ wrongToolingParent: true }, /REVIEWED_CODE_RELEASE_PARENT/],
    [{ wrongEvidenceParent: true }, /REVIEWED_CODE_EVIDENCE_PARENT/],
    [{ extraEvidence: [DIRECTORY + "/extra.json"] }, /REVIEWED_CODE_EVIDENCE_PATHS/]
  ]) await fixture(({check}) => assert.throws(check, code), undefined, options);
});

test("all 49 evidence behaviors are required, with no filtered, skipped or fabricated counts", () => {
  assert.doesNotThrow(() => verifyEvidenceReport(Buffer.from(goodEvidenceReport())));
  for (const report of [
    goodEvidenceReport().replace("# tests 49", "# tests 48"),
    goodEvidenceReport().replace("# skipped 0", "# skipped 1"),
    goodEvidenceReport().replace("ok 2 -", "ok 1 -"),
    goodEvidenceReport().replace(`ok 3 - ${NODE_TEST_TITLES.evidence[2]}`, `ok 3 - ${NODE_TEST_TITLES.evidence[2]} # SKIP`),
    goodEvidenceReport().replace(`ok 1 - ${NODE_TEST_TITLES.evidence[0]}`, `ok 1 - ${NODE_TEST_TITLES.evidence[0]} # skip not executed`),
    goodEvidenceReport().replaceAll(" - ", " - unrelated test "),
    goodEvidenceReport() + "Bail out! execution aborted\n",
    goodEvidenceReport().replace("1..49", "1..1"),
    goodEvidenceReport() + "# fail 0\n",
    "synthetic output\n"
  ]) assert.throws(() => verifyEvidenceReport(Buffer.from(report)), /REVIEWED_CODE_EVIDENCE/);
});

test("exact prior scripts, evidence and documentation stay unchanged in the working proposal", () => {
  for (const file of PRESERVED_PATHS) {
    assert.equal(git(root, "diff", "--name-only", BASE, "--", file), "", file);
  }
});

test("all 35 model/source cases require complete named TAP proof", () => {
  assert.doesNotThrow(() => verifyModelsReport(Buffer.from(goodModelsReport())));
  for (const output of ["", goodModelsReport().replaceAll(" - ", " - unrelated "), goodModelsReport() + "Bail out!\n", goodModelsReport().replace("# todo 0", "# todo 1")]) {
    assert.throws(() => verifyModelsReport(Buffer.from(output)), /REVIEWED_CODE_MODELS/);
  }
});

test("TAP proof rejects every extra or malformed result and plan record", () => {
  for (const [kind, verify] of [["evidence", verifyEvidenceReport], ["models", verifyModelsReport]]) {
    for (const suffix of [
      "ok 999\n",
      "  ok 999 # SKIP ignored\n",
      "1..999 # second plan\n",
      "  1..999\n",
      "TAP version 13\n"
    ]) assert.throws(() => verify(Buffer.from(goodNodeReport(kind) + suffix)), /REVIEWED_CODE_(EVIDENCE|MODELS)/);
  }
});
