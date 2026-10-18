import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ADMISSION, BASE, SOURCE, PREDECESSOR, PR282, PR281, PR280, MERGE282, MERGE281, PR282_PARENT,
  PR282_INVENTORY, PR281_INVENTORY, PR280_INVENTORY, SOURCE_INVENTORY, OBSERVATION_SHA,
  CODE_PATHS, EVIDENCE_PATHS, PR282_PATHS, PR281_PATHS, PR280_PATHS, OVERLAP_PATHS, SOURCE_PATHS,
  DIRECTORY, PERMISSIONS, COMMANDS, PULL_REQUEST, HISTORICAL_BASE, REVIEW_RESULT, DECISION_RESULT, DECISION_SCOPE,
  hash, inventory, preflight, assertEventComposition, verifyTestRecords, assertMaterializedTree, verifyDecision,
  assertMergedSources, assertPreservedContracts
} from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = value => hash(Buffer.from(stable(value)));
const git = (cwd, ...args) => execFileSync("/usr/bin/git", args, {
  cwd, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" }, maxBuffer: 128 * 1024 * 1024
}).toString("utf8").trim();
const write = (dir, file, bytes) => {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), bytes);
};
const observationText = () => readFileSync(path.join(root, `${DIRECTORY}/source-observation.json`));

// Synthetic reviewer records below are test fixtures, never acceptance evidence.
function fixture(run, mutate = () => {}, extraTooling = []) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr282-pr281-pr280-gate-test-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic Gate Fixture");
    git(repo, "config", "user.email", "fixture@example.invalid");
    const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
    write(repo, ".git/objects/info/alternates", path.join(common, "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...CODE_PATHS, "scripts/promotion-required-check-legacy-successor-v1.mjs", "scripts/promotion-workflow-json-guard.mjs"].map(item => "/" + item).join("\n") + "\n/" + DIRECTORY + "/\n");
    git(repo, "checkout", "--detach", "-q", PREDECESSOR);
    for (const file of CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    for (const file of extraTooling) write(repo, file, "unreviewed tooling byte\n");
    git(repo, "add", "--sparse", "--", ...CODE_PATHS, ...extraTooling);
    git(repo, "commit", "-q", "-m", "Synthetic tooling release");
    const release = git(repo, "rev-parse", "HEAD"), toolingDigest = digest(inventory(repo, PREDECESSOR, release));
    const checks = '{"syntheticFixture":true}\n';
    write(repo, `${DIRECTORY}/source-checks.json`, checks);
    const observation = observationText();
    write(repo, `${DIRECTORY}/source-observation.json`, observation);
    const reviews = {};
    for (const [role, id] of [["A11", "pending-independent-a11"], ["A23", "pending-independent-a23"]]) {
      const reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`;
      const report = `Synthetic ${role} unit-test fixture. Not approval and not an independent review.\n`;
      write(repo, reportPath, report);
      const review = {
        schemaVersion: "promotion-reviewed-code-review.v1", role, reviewerIdentity: id, reviewedAt: "2026-10-18T00:00:00.000Z",
        reviewedSource: SOURCE, reviewedTooling: release, toolingDigest, sourceInventoryDigest: SOURCE_INVENTORY,
        pr282InventoryDigest: PR282_INVENTORY, pr281InventoryDigest: PR281_INVENTORY, pr280InventoryDigest: PR280_INVENTORY,
        observationRawSha256: OBSERVATION_SHA, checksRawSha256: hash(Buffer.from(checks)), result: REVIEW_RESULT,
        report: { path: reportPath, rawSha256: hash(Buffer.from(report)) }, liveAllowed: false
      };
      mutate({ kind: "review", role, value: review, repo });
      const bytes = JSON.stringify(review) + "\n";
      write(repo, `${DIRECTORY}/${role.toLowerCase()}-review.json`, bytes);
      reviews[role] = { decisionRawSha256: hash(Buffer.from(bytes)), reportRawSha256: hash(Buffer.from(report)) };
    }
    const admission = {
      schemaVersion: "promotion-reviewed-code-pr282-pr281-pr280.v1", baseCommit: BASE, sourceCommit: SOURCE,
      sourceTree: git(repo, "rev-parse", `${SOURCE}^{tree}`), pr282Commit: PR282, pr282ParentCommit: PR282_PARENT,
      pr281Commit: PR281, pr280Commit: PR280, merge282Commit: MERGE282, merge281Commit: MERGE281,
      pr282InventoryDigest: PR282_INVENTORY, pr281InventoryDigest: PR281_INVENTORY, pr280InventoryDigest: PR280_INVENTORY,
      sourceInventoryDigest: SOURCE_INVENTORY, toolingRelease: release, toolingTree: git(repo, "rev-parse", `${release}^{tree}`),
      toolingDigest, observationRawSha256: OBSERVATION_SHA, checksRawSha256: hash(Buffer.from(checks)), reviews, permissions: PERMISSIONS
    };
    mutate({ kind: "admission", value: admission, repo });
    write(repo, ADMISSION, JSON.stringify(admission) + "\n");
    git(repo, "add", "--", ...EVIDENCE_PATHS);
    git(repo, "commit", "-q", "-m", "Synthetic evidence");
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ number: PULL_REQUEST, pull_request: { base: { sha: BASE }, head: { sha: git(repo, "rev-parse", "HEAD") } } });
    const check = () => { writeFileSync(eventPath, JSON.stringify(event())); return preflight({ repoRoot: repo, eventName: "pull_request", eventPath }); };
    run({ repo, check, release, evidence, eventPath, event, temporary });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test("combined source inventories, exclusive blobs and pending permissions are pinned", () => {
  assert.equal(digest(inventory(root, BASE, PR282)), PR282_INVENTORY);
  assert.equal(digest(inventory(root, BASE, PR281)), PR281_INVENTORY);
  assert.equal(digest(inventory(root, BASE, PR280)), PR280_INVENTORY);
  assert.equal(digest(inventory(root, BASE, SOURCE)), SOURCE_INVENTORY);
  assert.equal(hash(observationText()), OBSERVATION_SHA);
  assert.equal(PR282_PATHS.length, 8); assert.equal(PR281_PATHS.length, 4); assert.equal(PR280_PATHS.length, 3);
  assert.deepEqual([...OVERLAP_PATHS], [".github/workflows/ci.yml", "lib/server/userStore.ts"]);
  assert.equal(SOURCE_PATHS.length, PR282_PATHS.length + PR281_PATHS.length + PR280_PATHS.length - OVERLAP_PATHS.length);
  assert.equal(CODE_PATHS.length, 4); assert.equal(EVIDENCE_PATHS.length, 7);
  assert.equal(REVIEW_RESULT, "pending-independent-review");
  assert.equal(DECISION_RESULT, "pending");
  for (const value of Object.values(PERMISSIONS)) assert.equal(value, false);
  assertMergedSources(root);
  assertPreservedContracts(root, SOURCE);
});

test("real Git exact tooling and evidence chain admits the pending package", () => fixture(({ check, evidence }) => assert.equal(check().admissionCommit, evidence)));

test("one-byte source drift and an added public file fail full-tree equality", () => {
  for (const file of ["lib/server/demoSeedBackfill.ts", "lib/server/authFunnelMetrics.ts", "lib/server/userStore/studentActivityPersistence.ts"]) fixture(({ repo, check }) => {
    write(repo, file, git(repo, "show", `${SOURCE}:${file}`) + "\n// unreviewed runtime mutation\n");
    git(repo, "add", "--sparse", "--", file);
    git(repo, "commit", "-q", "-m", "Synthetic source drift");
    assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
  fixture(({ repo, check }) => {
    write(repo, "public/new-candidate.json", "{\"candidate\":true}\n");
    git(repo, "add", "--sparse", "--", "public/new-candidate.json");
    git(repo, "commit", "-q", "-m", "Synthetic public injection");
    assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
});

test("an extra tooling file is rejected before evidence can launder it", () => fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_TOOLING_PATHS/), () => {}, ["docs/unreviewed-tooling.md"]));

test("source pull request numbers cannot inherit this admission", () => fixture(({ repo, eventPath, evidence }) => {
  for (const number of [282, 281, 280, 276, 272, 259]) {
    writeFileSync(eventPath, JSON.stringify({ number, pull_request: { base: { sha: BASE }, head: { sha: evidence } } }));
    assert.throws(() => preflight({ repoRoot: repo, eventName: "pull_request", eventPath }), /REVIEWED_CODE_PR_BASE/);
  }
}));

test("post-merge main with the exact tree passes; a changed tree or other branch fails", () => {
  const event = { before: BASE, after: "a".repeat(40), ref: "refs/heads/main" };
  const actual = { head: event.after, headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: "tree", evidenceTree: "tree", baseTree: "base" };
  assert.equal(assertEventComposition("push", event, actual).headCommit, event.after);
  assert.throws(() => assertEventComposition("push", event, { ...actual, headTree: "changed" }), /REVIEWED_CODE_COMPOSITION/);
  assert.throws(() => assertEventComposition("push", { ...event, ref: "refs/heads/other" }, actual), /REVIEWED_CODE_PUSH_BASE/);
  assert.throws(() => assertEventComposition("pull_request", { number: PULL_REQUEST, pull_request: { base: { sha: SOURCE }, head: { sha: "a".repeat(40) } } }, { head: "a".repeat(40), headDescendsEvidence: true, baseAncestorHead: true, headTree: "tree", evidenceTree: "tree" }), /REVIEWED_CODE_PR_BASE/);
});

test("forged approval, stale source and publication permissions fail closed", () => {
  for (const field of ["reviewerIdentity", "reviewedSource", "result", "liveAllowed"]) fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_REVIEW_BINDING/), item => {
    if (item.kind === "review" && item.role === "A23") item.value[field] = field === "liveAllowed" ? true : field === "result" ? "approved-for-ordinary-code-required-check" : field === "reviewedSource" ? BASE : "forged";
  });
  fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_PERMISSION/), item => {
    if (item.kind === "admission") item.value.permissions = { ...PERMISSIONS, ordinaryCodeEligible: true };
  });
  fixture(({ check }) => assert.throws(check, /REVIEWED_CODE_PERMISSION/), item => {
    if (item.kind === "admission") item.value.permissions = { ...PERMISSIONS, deployAllowed: true };
  });
});

test("dirty, symlinked or re-added evidence is rejected", () => {
  fixture(({ repo, check }) => { write(repo, `${DIRECTORY}/a11-review.md`, "changed\n"); assert.throws(check, /REVIEWED_CODE_DIRTY/); });
  fixture(({ repo, check }) => {
    const file = `${DIRECTORY}/a23-review.md`; rmSync(path.join(repo, file)); symlinkSync("a11-review.md", path.join(repo, file));
    git(repo, "add", "--", file); git(repo, "commit", "-q", "-m", "Synthetic symlink");
    assert.throws(check, /REVIEWED_CODE_COMPOSITION/);
  });
  fixture(({ repo, check }) => {
    const saved = readFileSync(path.join(repo, ADMISSION)); rmSync(path.join(repo, ADMISSION));
    git(repo, "add", "--", ADMISSION); git(repo, "commit", "-q", "-m", "Synthetic removal");
    write(repo, ADMISSION, saved); git(repo, "add", "--", ADMISSION); git(repo, "commit", "-q", "-m", "Synthetic re-add");
    assert.throws(check, /REVIEWED_CODE_ADMISSION_HISTORY/);
  });
});

test("strict JSON rejects duplicate keys and invalid UTF-8", () => {
  assert.throws(() => parsePromotionWorkflowJsonBytes(Buffer.from('{"result":"blocked","result":"pass"}')));
  assert.throws(() => parsePromotionWorkflowJsonBytes(Buffer.from([0xff])));
});

test("current tests require exact commands, outputs and successful exits", () => {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr282-proof-test-")));
  try {
    const rows = COMMANDS.map(([name, args]) => {
      writeFileSync(path.join(dir, `${name}.stdout`), "pass\n");
      writeFileSync(path.join(dir, `${name}.stderr`), "");
      return { name, args, exitCode: 0, stdoutSha256: hash(Buffer.from("pass\n")), stderrSha256: hash(Buffer.alloc(0)) };
    });
    assert.doesNotThrow(() => verifyTestRecords(dir, rows));
    assert.throws(() => verifyTestRecords(dir, rows.slice(1)), /REVIEWED_CODE_TEST_SET/);
    assert.throws(() => verifyTestRecords(dir, rows.map((row, index) => index ? row : { ...row, exitCode: 1 })), /REVIEWED_CODE_TEST_EXIT/);
    writeFileSync(path.join(dir, "seed.stdout"), "forged\n");
    assert.throws(() => verifyTestRecords(dir, rows), /REVIEWED_CODE_TEST_BYTES/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("selector adds this package ahead of pr276-v3 and leaves every previous step unchanged", () => {
  const current = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const before = YAML.parse(git(root, "show", `${BASE}:.github/workflows/promotion-shadow.yml`));
  const job = current.jobs["promotion-shadow-gate"], previous = before.jobs["promotion-shadow-gate"];
  assert.equal(job.name, "promotion-shadow-gate"); assert.equal(job.if, undefined); assert.deepEqual(current.on, before.on);
  assert.deepEqual(job.permissions, previous.permissions); assert.deepEqual(job.env, previous.env);
  for (const step of previous.steps.filter(item => item.id !== "contract")) assert.deepEqual(job.steps.find(item => item.name === step.name), step);
  const select = job.steps.find(item => item.id === "contract").run;
  assert.ok(select.indexOf("pr282-pr281-pr280-v1/admission.json") < select.indexOf("pr276-v3/admission.json"));
  assert.match(select, /-L coordination\/integration\/reviewed-code\/pr282-pr281-pr280-v1\/admission\.json/);
  assert.match(select, /set -euo pipefail/); assert.doesNotMatch(select, /\|\|\s*(true|mode=)/);
  for (const mode of ["v2", "successor", "reviewed-code", "reviewed-code-pr270-pr271", "reviewed-code-pr264", "reviewed-code-pr276", "reviewed-code-pr276-v2", "candidate-pr201", "reviewed-code-pr276-v3", "reviewed-code-pr282-pr281-pr280"]) assert.match(select, new RegExp(mode.replaceAll("-", "\\-")));
  const named = name => job.steps.find(item => item.name === name);
  for (const name of ["Test exact PR282/PR281/PR280 reviewed-code contract", "Check current PR282/PR281/PR280 composition", "Prepare historical baseline for PR282/PR281/PR280 reviewed code", "Verify historical non-live chain for PR282/PR281/PR280 reviewed code", "Finalize PR282/PR281/PR280 reviewed-code decision"]) assert.equal(named(name).if, "${{ steps.contract.outputs.mode == 'reviewed-code-pr282-pr281-pr280' }}");
  assert.equal(named("Enforce PR282/PR281/PR280 reviewed-code required check").if, "${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr282-pr281-pr280' }}");
  assert.match(named("Enforce PR282/PR281/PR280 reviewed-code required check").run, /promotion-reviewed-code-pr282-pr281-pr280\.mjs verify/);
  assert.match(named("Verify historical non-live chain for PR282/PR281/PR280 reviewed code").run, /promotion-required-check-legacy-successor-v1\.mjs.*evaluate/);
  assert.match(named("Prepare historical baseline for PR282/PR281/PR280 reviewed code").run, /03717842b19e8b8fa9a3a2dbecf1b359bb842233/);
  assert.match(named("Prepare historical baseline for PR282/PR281/PR280 reviewed code").run, /npm ci --ignore-scripts/);
  assert.doesNotMatch(named("Prepare historical baseline for PR282/PR281/PR280 reviewed code").run, /ln -s/);
  for (const step of job.steps) assert.equal(step["continue-on-error"], undefined);
  assert.equal(HISTORICAL_BASE, "03717842b19e8b8fa9a3a2dbecf1b359bb842233");
});

test("a malformed present marker cannot fall back to an older contract", () => fixture(({ repo, temporary }) => {
  const workflow = YAML.parse(readFileSync(path.join(root, ".github/workflows/promotion-shadow.yml"), "utf8"));
  const selector = workflow.jobs["promotion-shadow-gate"].steps.find(item => item.id === "contract").run;
  write(repo, ADMISSION, "{\"schemaVersion\":\"malformed\"}\n");
  const result = spawnSync("bash", ["-c", selector], { cwd: repo, encoding: "utf8", env: { ...process.env, GITHUB_WORKSPACE: repo, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: "/no-event", GITHUB_OUTPUT: path.join(temporary, "selector-output") } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REVIEWED_CODE_(DIRTY|SCHEMA)/);
  assert.equal(result.stdout, "");
}));

test("full preflight accepts an actual preserving main merge and unchanged-tree child", () => fixture(({ repo, evidence, eventPath }) => {
  git(repo, "checkout", "-q", "--detach", BASE);
  git(repo, "merge", "--no-ff", "--no-edit", evidence);
  let head = git(repo, "rev-parse", "HEAD");
  writeFileSync(eventPath, JSON.stringify({ before: BASE, after: head, ref: "refs/heads/main" }));
  assert.equal(preflight({ repoRoot: repo, eventName: "push", eventPath }).head, head);
  const before = head; git(repo, "commit", "--allow-empty", "-q", "-m", "Synthetic unchanged tree"); head = git(repo, "rev-parse", "HEAD");
  writeFileSync(eventPath, JSON.stringify({ before, after: head, ref: "refs/heads/main" }));
  assert.equal(preflight({ repoRoot: repo, eventName: "push", eventPath }).head, head);
}));

test("actual execution rejects sparse materialization after metadata preflight", () => fixture(({ repo, check, evidence }) => {
  assert.equal(check().head, evidence);
  assert.throws(() => assertMaterializedTree(repo, evidence), /REVIEWED_CODE_INDEX_FLAGS/);
}));

test("decision verification rejects a pass result, a changed scope, and a rehashed permission", () => {
  const expected = { result: DECISION_RESULT, scope: DECISION_SCOPE, permissions: PERMISSIONS, decisionDigest: "fixed" };
  assert.doesNotThrow(() => verifyDecision(structuredClone(expected), expected));
  assert.throws(() => verifyDecision({ ...expected, result: "pass" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, permissions: { ...PERMISSIONS, liveAllowed: true }, decisionDigest: "rehashed" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
  assert.throws(() => verifyDecision({ ...expected, scope: "exact-pr270-pr271-ordinary-code-only" }, expected), /REVIEWED_CODE_DECISION_MISMATCH/);
});
