import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr302.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr302-source-checks.v1",
  "sourceCommit": "08194177bac98d715d6fb90c114aa65ce3c7cf19",
  "sourceTree": "04f0792e6f22e3c807aa97cb15f9666413fe7c5d",
  "executedAt": "2026-10-28T21:00:16.944Z",
  "nodeMajor": 24,
  "liveProbePerformed": false,
  "commands": [
    {
      "name": "types",
      "args": [
        "--max-old-space-size=6144",
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "--incremental",
        "false"
      ],
      "exitCode": 0,
      "stdoutSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": null
    },
    {
      "name": "schedules",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts",
        "app/api/health/route.test.ts",
        "lib/server/teacherNoticeEmailOutboxHandlers.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "222b39847babe2ba8f357ab54fff09c3bd71293bd3a6455ef0ec9a2517858dd2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 24,
        "suites": 0,
        "pass": 24,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "6e14ae6c0858bae11b1a05f203013c2fb2c760945cb925ac9a12fb9e9ecff8f5"
      }
    },
    {
      "name": "health",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "lib/server/teacherNoticeOperationalHealth.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "557d3b528762f472658a23b3284c8d9551190d7d0b8af175b379bd12fde7078e",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 6,
        "suites": 0,
        "pass": 6,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "609784b3c5b7eefb576013618bc7630ea268c0a6587b87c8d4ef115ff7c37f05"
      }
    },
    {
      "name": "monitor",
      "args": [
        "--test",
        "--test-reporter=tap",
        "scripts/monitor-teacher-notice-health.test.mjs"
      ],
      "exitCode": 0,
      "stdoutSha256": "58668ca7966f7494cac7a8e24c0479630fb2dece26f8f9acf846e62f27e983e2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 12,
        "suites": 0,
        "pass": 12,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "313e118d45e2228d944397fd319158d451ac0b022d44964f4d5f84dc5db47bf1"
      }
    },
    {
      "name": "ownership",
      "args": [
        "scripts/release-package-gate.mjs",
        "--json"
      ],
      "exitCode": 0,
      "stdoutSha256": "bb32ac843ce0d2ee1b99f2e43bb2b284bc1108b09531bd97a4f098fb1e02ea5d",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "valid": true,
        "packageCount": 9,
        "ownerPackageCount": 39,
        "resolutionCheckCount": 43,
        "exactPathCheckCount": 44,
        "wildcardPathCheckCount": 14,
        "reportDigest": "21fe3853bef4770dcb8dd4be118705e5fe6ea4e9f5532b2c621ee3b1298d3125"
      }
    }
  ]
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const json = value => JSON.stringify(value, null, 2) + "\n";
function temporaryRepo(run) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr302-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR302 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    run({ temporary, repo });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function fixture(run, options = {}) {
  temporaryRepo(({ temporary, repo }) => {
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.SOURCE_PATHS, ...g.CODE_PATHS, g.DIRECTORY + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.SOURCE);
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR302 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr302-admission.v1", pullRequest: 302, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr302-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR302 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr302-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr302-required-check", scope: g.SCOPE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
        toolingCommit: tooling, toolingTree: admission.toolingTree, toolingInventoryDigest: admission.toolingInventoryDigest,
        checksRawSha256: g.CHECKS_SHA, reportRawSha256: g.hash(report),
        permissions: g.PERMISSIONS, reviewedAt: new Date().toISOString(), findings: ["Synthetic shape test only; not independent reviewer evidence."] };
      options.review?.(role, review);
      const decision = Buffer.from(json(review)), prefix = g.DIRECTORY + "/" + role.toLowerCase() + "-review";
      write(repo, prefix + ".json", decision); write(repo, prefix + ".md", report);
      admission.reviews[role] = { decisionRawSha256: g.hash(decision), reportRawSha256: g.hash(report) };
    }
    options.admission?.(admission);
    let bytes = json(admission);
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 302, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 302,
      pull_request: { number: 302, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the eight-file cron and ownership source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 8); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.BASE]);
  assert.equal(entries.filter(e => e.before === null).length, 1);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR302_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR302_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR302_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR302_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr302-v1")<g.expectedWorkflow(before).indexOf("pr301-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR302 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.deepEqual(g.IDENTITIES, { A11: "/root/pr286_source_review", A23: "/root/pr300_a23" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR302_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR302_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR302_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR302_TOOLING_PATHS/),{extraTooling:["lib/pr302-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR302_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR302_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR302_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR302_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR302_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR302_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR302_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR302_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR302_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR302_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR302_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR302_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR302_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR302_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR302_FILE/);
}));
test("materialization rejects hidden index flags and changed bytes", () => temporaryRepo(({repo})=>{
  write(repo,"source.txt","original\n");git(repo,"add","--","source.txt");git(repo,"commit","-qm","fixture");const head=git(repo,"rev-parse","HEAD");
  g.assertMaterializedTree(repo,head);git(repo,"update-index","--assume-unchanged","source.txt");assert.throws(()=>g.assertMaterializedTree(repo,head),/INDEX_FLAGS/);
  git(repo,"update-index","--no-assume-unchanged","source.txt");write(repo,"source.txt","changed\n");assert.throws(()=>g.assertMaterializedTree(repo,head),/SOURCE_BYTES/);
}));
const nested = `TAP version 13
# Subtest: parent
    # Subtest: child
    ok 1 - child
      ---
      duration_ms: 1.0
      type: 'test'
      ...
    1..1
ok 1 - parent
  ---
  duration_ms: 2.0
  type: 'test'
  ...
1..1
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3.0
`;
test("nested t.test parent remains a test and is counted accurately",()=>{
  const result=g.testSummary(Buffer.from(nested));assert.equal(result.tests,2);assert.equal(result.resultNamesDigest,g.digest(["child","parent"]));
  const suite=nested.replace("  type: 'test'\n  ...\n1..1","  type: 'suite'\n  ...\n1..1").replace("# tests 2","# tests 1").replace("# suites 0","# suites 1").replace("# pass 2","# pass 1");
  assert.equal(g.testSummary(Buffer.from(suite)).suites,1);
});
test("TAP rejects false child plans truncation duplicated summaries and unconsumed results",()=>{
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR302_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR302_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, schedule, health, monitor and ownership commands", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name), ["types", "schedules", "health", "monitor", "ownership"]);
  assert.equal(g.COMMANDS[0].summary, null);
  assert.deepEqual(g.COMMANDS.slice(1,4).map(c=>c.summary.tests), [24,6,12]);
  assert.ok(g.COMMANDS.slice(1,4).every(c=>c.summary.skipped===0));
  assert.equal(g.COMMANDS[4].summary.valid, true);
});
test("child environment excludes health credentials provider keys database URLs and NODE_OPTIONS", () => {
  const names = ["NODE_OPTIONS", "DATABASE_URL", "OPENAI_API_KEY", "TEACHER_NOTICE_HEALTH_SECRET", "CRON_SECRET", "NODE_PATH"];
  const before = Object.fromEntries(names.map(k => [k, process.env[k]]));
  try {
    for (const name of names) process.env[name] = "synthetic-private-value";
    const env = g.commandEnvironment();
    for (const name of names) assert.equal(env[name], undefined);
    assert.equal(env.NODE_ENV, "test");
  } finally { for (const [k,v] of Object.entries(before)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});
test("artifact output requires a fresh private canonical temporary directory outside the repository", () => temporaryRepo(({ temporary, repo }) => {
  const before = process.env.RUNNER_TEMP; process.env.RUNNER_TEMP = temporary;
  try {
    const output = path.join(temporary, "proof"); mkdirSync(output, { mode: 0o700 });
    assert.equal(g.assertArtifactRoot(output, repo), output);
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR302_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR302_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR302_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR302_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR302_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR302_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR302_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR302_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR302_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR302_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add a live-cron acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR302_SCHEMA/);
}, {admission: a => { a.liveCronProven = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
  "schedules": [
    "teacher notice webhook maintenance route is a dynamic Node cron endpoint",
    "missing explicit cron secret is anonymous in {}",
    "missing explicit cron secret is anonymous in {\"NODE_ENV\":\"development\"}",
    "missing explicit cron secret is anonymous in {\"NODE_ENV\":\"test\"}",
    "missing explicit cron secret is anonymous in {\"NODE_ENV\":\"production\"}",
    "missing explicit cron secret is anonymous in {\"VERCEL\":\"1\",\"VERCEL_ENV\":\"production\"}",
    "only exact configured cron bearer enables details and alerts, including self-hosted production",
    "invalid configured cron secret cannot enable trusted even if the request matches its visible text",
    "public bursts singleflight the strict probe and never spend the alert or shared-error budget",
    "trusted concurrent down checks share both the probe and one alert",
    "production malformed and non-durable SQLite snapshots are degraded; explicit local demo is separate",
    "a timed-out underlying probe never creates more hanging probes or unbounded trusted responses",
    "alert transport timeout cannot hold the health response or accumulate uncooperative sends",
    "route preserves strict readiness with aligned lower-frequency crons and no scheduled keepalive",
    "teacher send handler is teacher-only, origin-free, private, and preserves the notice-attempt response",
    "teacher send handler rejects an explicit invalid key and derives a stable legacy key when omitted",
    "teacher send handler rejects stand-ins, returns opaque 404, and masks storage failures",
    "reminder-run handler fails closed on arrays and every explicitly invalid optional field before persistence",
    "reminder-run handler masks auth, authorization, database, and schema failures with a private stable 503",
    "reminder-run handler preserves valid pagination and stable status mappings",
    "cron handler requires the exact configured bearer and returns aggregate-only results",
    "cron handler durably records candidate-bound started and terminal heartbeat transitions",
    "send, reminder-run, deliveries alias, and cron routes use the reviewed handlers and never read request origin",
    "Vercel schedules the outbox worker separately and the environment example names only server-private configuration"
  ],
  "health": [
    "operational health reports stable aggregate-only unhealthy reasons",
    "operational health rebuilds every nested DTO and never claims scheduler health without a durable heartbeat",
    "operational health fails closed on invalid aggregate data",
    "operational health allows future-scheduled queued rows only when actionable age stays null",
    "operational health fails closed for missing, incomplete, failed, stale, or wrong-release heartbeat",
    "a recent durable scheduler failure survives a newer success and recovers after the bounded window"
  ],
  "monitor": [
    "monitor checks both exact production origins with authenticated read-only GET",
    "monitor fails closed for stale/mismatched health, cached responses, cookies, and redirects",
    "monitor drill intentionally fails only after both healthy origins were checked",
    "monitor never accepts arbitrary origins or a short credential",
    "monitor retries a bounded in-progress heartbeat and recovers after success",
    "monitor still fails closed after three persistent unhealthy responses",
    "monitor identifies each rejected origin without exposing authentication responses",
    "monitor reports only bounded allowlisted reasons after persistent 503 responses",
    "monitor distinguishes unavailable 503 and transient HTTP responses without inventing reasons",
    "monitor redacts network and body-stream errors while preserving retry boundaries",
    "monitor validates privacy and JSON before reporting any 503 health reasons",
    "scheduled monitor is read-only, bounded, and supports an explicit alert drill"
  ]
};
const scheduleNames = sourceNames.schedules;

test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(scheduleNames);
  for (const name of ["schedules", "health", "monitor"]) assert.deepEqual(g.verifyExecution(name, { status: 0, stdout: flatReport(sourceNames[name]) }), g.COMMANDS.find(c=>c.name===name).summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("schedules", result), /PR302_COMMAND_FAILED/);
  }
});
test("fresh schedule and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("schedules", {status: 0, stdout: flatReport(["replacement"])}), /PR302_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR302_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(scheduleNames)}), /PR302_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR302_/);
  }
});
test("the added lifecycle record is part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.find(e=>e.before===null);
  assert.equal(added.path,"coordination/session-logs/2026-10-29-A22-pr269-current-main-01a1824f.md");
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR302_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e!==added)),/PR302_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr302.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR302_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR302_TYPE_OUTPUT/);
  }
});
test("ownership output must retain the complete strict-JSON mapping result and its fixed digest", () => {
  const spec=g.COMMANDS.find(c=>c.name==="ownership");
  const stdout=execFileSync(process.execPath,spec.args,{cwd:root,env:g.commandEnvironment(),timeout:30000});
  const actual=parse(stdout);assert.deepEqual(g.verifyExecution("ownership",{status:0,stdout}),spec.summary);
  for (const mutate of [v=>{v.valid=false;},v=>{v.errors.push("unmapped");},v=>{v.packageCount--;},
    v=>{v.ownerPathspecs.resolutions.find(r=>r.path==="vercel.json").ownerId="A22";},
    v=>{v.coverage.resolutions.find(r=>r.path==="vercel.json").status="unmapped";},
    v=>{v.packages.find(p=>p.finalState==="blocker report").finalState="reviewed commit";},
    v=>{v.liveAllowed=true;}]) {
    const value=structuredClone(actual);mutate(value);
    assert.throws(()=>g.verifyExecution("ownership",{status:0,stdout:Buffer.from(json(value))}),/PR302_OWNERSHIP_REPORT/);
  }
  for (const bytes of [Buffer.from("{}"),Buffer.from('{"valid":false,"valid":true}'),Buffer.from([0xff])]) {
    assert.throws(()=>g.verifyExecution("ownership",{status:0,stdout:bytes}),/PR302_OWNERSHIP_REPORT/);
  }
  assert.throws(()=>g.verifyExecution("ownership",{status:0,stdout,stderr:Buffer.from("unexpected diagnostic")}),/PR302_OWNERSHIP_REPORT/);
});
