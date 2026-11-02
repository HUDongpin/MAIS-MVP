import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const gatePath = fileURLToPath(new URL("./promotion-reviewed-code-pr308.mjs", import.meta.url));
const g = existsSync(gatePath) ? await import("./promotion-reviewed-code-pr308.mjs") : {};
import YAML from "yaml";
test("the PR308 exact admission checker exposes preflight", () => assert.equal(typeof g.preflight, "function"));
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr308-source-checks.v1",
  "sourceCommit": "54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e",
  "sourceTree": "d53bd544a4da00c7243a561b61635967e8f7b899",
  "executedAt": "2026-11-02T03:31:35.634Z",
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
      "name": "account-and-california",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "lib/server/userStoreAccountDeletion.test.ts",
        "app/api/accountMediaErasure.test.ts",
        "lib/californiaGradeAware.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "bee822cb071568cd5bd7ad6477df62aa1849e6cbae7d049e31a1ef1807241fbe",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 37,
        "suites": 0,
        "pass": 37,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "2d43e4d32082a2203cb8a92b1e979e44e702853c3f9dd2e3a64d918f19789f92"
      }
    },
    {
      "name": "hourly-regressions",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "app/api/health/route.test.ts",
        "app/api/health/teacher-notices/route.test.ts",
        "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts",
        "lib/server/teacherNoticeEmailOutboxHandlers.test.ts",
        "lib/server/teacherNoticeOperationalHealth.test.ts",
        "lib/server/userStore/teacherNoticeOperationalReadModel.test.ts",
        "lib/server/userStore/teacherNoticeEmailCronHeartbeatPersistence.test.ts",
        "scripts/monitor-teacher-notice-health.test.mjs",
        "scripts/parent-production-acceptance.test.mjs"
      ],
      "exitCode": 0,
      "stdoutSha256": "e2f01cc3471d54e7e6758e82e81f7170f4100acba59f7540e1202cf1bfd662b2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 98,
        "suites": 0,
        "pass": 98,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "f929e1b209eec7ba7cb85eb11ab5bc3c604803f5dc305211af2933480ac600d9"
      }
    },
    {
      "name": "historical-activation",
      "args": [
        "--test",
        "--test-reporter=tap",
        "coordination/integration/ca-textbook-successor/activation/ca-textbook-003/activation.test.mjs"
      ],
      "exitCode": 0,
      "stdoutSha256": "7fabe46618a33d01d8ddbc679a1c99801865605dc41ee78ca23c9ce25a2e1ec2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 17,
        "suites": 0,
        "pass": 17,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "da026388acb67cad60dfffb17b5b21e7b99f93ce9381a732f6124b34dc43fb20"
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
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr308-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR308 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    run({ temporary, repo });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function fixture(run, options = {}) {
  temporaryRepo(({ temporary, repo }) => {
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.SOURCE_PATHS, ...g.NATIVE_CODE_PATHS, ...g.CODE_PATHS, g.DIRECTORY + "/", g.NATIVE_ROOT + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.NATIVE_CODE_COMMIT);
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR308 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr308-admission.v1", pullRequest: 308, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr308-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks))
    };
    for (const file of g.NATIVE_EVIDENCE_PATHS) write(repo, file, file.endsWith(".json") ? "{}\n" : "Synthetic native-shape placeholder; never execution evidence.\n");
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR308 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr308-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr308-required-check", scope: g.SCOPE,
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
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 308, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.ALL_EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD");
    for (const file of g.EXECUTION_PATHS) write(repo, file, "{\"fixture\":true}\n");
    commit([...g.EXECUTION_PATHS]);
    const execution = git(repo, "rev-parse", "HEAD");
    for (const file of g.RECEIPT_PATHS) write(repo, file, "{\"fixture\":true}\n");
    commit([...g.RECEIPT_PATHS]);
    const storage = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 308,
      pull_request: { number: 308, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, execution, storage, event, check, commit, eventPath });
  });
}

test("source is exactly the nineteen-file recovery composition source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 19); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), ["5c77f4d3fde75eb9274268a064dad1cb771633d5"]);
  assert.equal(entries.filter(e => e.before === null).length, 14);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR308_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR308_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR308_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR308_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr308-v1")<g.expectedWorkflow(before).indexOf("reviewed-code/pr307-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR308 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.deepEqual(g.IDENTITIES, { A11: "/root/ca004_release_a11", A23: "/root/ca004_release_a23" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR308_EVENT/);
  }
}));
test("only ordered B F parents and equal F tree admit the main merge", () => fixture(({repo,storage,check})=>{
  const merge=git(repo,"commit-tree",storage+"^{tree}","-p",g.BASE,"-p",storage,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[storage,g.BASE],[g.BASE],[storage]]){
    const next=git(repo,"commit-tree",storage+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR308_(EVENT|PHASE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR308_(EVENT_PR|PHASE_HEAD)/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR308_TOOLING_PATHS/),{extraTooling:["lib/pr308-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR308_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR308_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR308_PHASE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR308_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR308_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR308_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR308_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR308_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR308_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR308_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR308_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR308_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR308_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR308_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR308_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR308_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR308_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, hourly and historical activation commands", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name), ["types", "account-and-california", "hourly-regressions", "historical-activation"]);
  assert.equal(g.COMMANDS[0].summary, null);
  assert.deepEqual(g.COMMANDS.filter(c=>c.summary?.tests).map(c=>c.summary.tests), [37,98,17]);
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR308_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR308_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR308_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR308_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR308_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR308_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR308_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR308_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR308_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR308_PHASE_ADDITION_HISTORY/);
}));
test("offline evidence cannot add a native Shadow acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR308_SCHEMA/);
}, {admission: a => { a.historicalPromotionRevalidated = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
  "account-and-california": [
    "self complete erasure clears dead cookie and reports physical completion",
    "self postcommit purge failure clears dead cookie and cannot report erasure success",
    "blocked self deletion keeps the active cookie and never claims account removal",
    "current admin exact learner retry accepts durable student marker after account erasure",
    "admin postcommit purge failure reports deleted plus pending without clearing admin cookie",
    "admin cleanup retry cannot target an unknown account without an erasure marker",
    "admin may retry physical cleanup for any already-deleted account role",
    "exact confirmation and current admin authorization remain required for cleanup retry",
    "existing non-student account remains outside the learner deletion endpoint",
    "California curriculum labels use English U.S. grade names instead of P/S grade aliases",
    "California practice and onboarding surfaces do not render Primary/Secondary grade labels",
    "California candidate-only elementary projections remain excluded from runtime seeds",
    "California lesson entry does not expose candidate-only lesson seeds as live lessons",
    "California high school preview remains review-only and stores pathway metadata",
    "California middle school textbook page presents interactive chapters, not a complete course claim",
    "every table in the Database type has an explicit deletion rule",
    "every deletion rule documents its rationale and does something",
    "deleting a student removes their own records",
    "deleting a student cascades through enrollment, submission and live-session chains",
    "rows belonging to other people survive with the departing user de-identified",
    "forum threads, replies and me-too rosters are cleaned",
    "nested live-session attendance and random-call rosters drop the learner",
    "no trace of the deleted learner remains anywhere in the state",
    "deleting a parent clears the guardian link and their message thread",
    "teacher deletion is blocked while they own classes with learners",
    "students and parents are never blocked, and an empty-handed teacher is not either",
    "co-teacher and admin erasure cannot cascade through another learner's authored assignment",
    "empty current enrollment does not authorize erasing retained class work or reports",
    "the same guard covers authored assessments, paths, live work and frozen archives",
    "unrelated learner work and empty teaching drafts do not block teacher erasure",
    "data export returns the subject's own rows without credentials",
    "data export excludes other people's records",
    "data export includes learner-owned roster and grading details through subject parents",
    "teacher export does not inherit learners' records through class ownership",
    "deletion is idempotent and safe on an unknown user",
    "an empty user id is rejected rather than matching blank fields",
    "R18 deleting the last selected learner preserves explicit deny-all assessment audience"
  ],
  "hourly-regressions": [
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
    "route preserves strict readiness with two aligned hourly crons and no scheduled health or keepalive",
    "teacher-notice health route exposes only a dynamic Node GET endpoint",
    "teacher-notice health route authenticates only with its dedicated health-check secret",
    "teacher-notice health fails closed before reading operations for invalid config or credentials",
    "teacher-notice health returns 200 only for a fresh matching durable scheduler heartbeat",
    "teacher-notice health converts persistence or aggregate validation failures to an opaque 503",
    "teacher send handler is teacher-only, origin-free, private, and preserves the notice-attempt response",
    "teacher send handler rejects an explicit invalid key and derives a stable legacy key when omitted",
    "teacher send handler rejects stand-ins, returns opaque 404, and masks storage failures",
    "reminder-run handler fails closed on arrays and every explicitly invalid optional field before persistence",
    "reminder-run handler masks auth, authorization, database, and schema failures with a private stable 503",
    "reminder-run handler preserves valid pagination and stable status mappings",
    "cron handler requires the exact configured bearer and returns aggregate-only results",
    "cron handler durably records candidate-bound started and terminal heartbeat transitions",
    "send, reminder-run, deliveries alias, and cron routes use the reviewed handlers and never read request origin",
    "Vercel schedules the outbox worker separately and the environment example names only server-private configuration",
    "operational health reports stable aggregate-only unhealthy reasons",
    "operational health rebuilds every nested DTO and never claims scheduler health without a durable heartbeat",
    "operational health fails closed on invalid aggregate data",
    "operational health allows future-scheduled queued rows only when actionable age stays null",
    "operational health fails closed for missing, incomplete, failed, stale, or wrong-release heartbeat",
    "a recent durable scheduler failure survives a newer success and recovers after the bounded window",
    "hourly operations allow one interval plus fifteen minutes, then report each overdue aggregate",
    "heartbeat SQLite schema v2 migration is strict, atomic, and idempotent",
    "heartbeat SQLite migration upgrades an exact v1 database and preserves a current failure",
    "heartbeat SQLite transitions are candidate-bound and stale runs cannot overwrite a newer run",
    "heartbeat SQLite success requires a previously persisted matching started run",
    "heartbeat SQLite durably retains the last failure across a newer successful run",
    "heartbeat PostgreSQL catalog attestation is exact and schema statements are candidate-bound",
    "heartbeat PostgreSQL migration inspects under one atomic transaction and rejects partial state",
    "heartbeat PostgreSQL runtime uses advisory-before-relation lock order and attests before mutation",
    "SQLite operational read model returns only aggregate queue, reconciliation, and recent provider outcomes",
    "SQLite operational read model separates total queued rows from worker-actionable rows",
    "SQLite operational read model exposes only candidate match and durable heartbeat state",
    "operational ages fail closed when a durable timestamp is materially in the future",
    "a future actionable timestamp cannot hide behind an older queue minimum",
    "a future terminal timestamp cannot hide behind aggregate terminal counts",
    "a future provider-accepted completion cannot hide behind an older terminal timestamp",
    "provider outcome integrity and counts are bounded to the recent observation window",
    "provider outcomes fail closed when the latest durable receipt is materially in the future",
    "SQLite operational read model represents an empty durable store with zero counts and null ages",
    "configured operational read model fails closed before I/O for unsupported or incomplete storage config",
    "configured operational read model rejects non-durable SQLite on Vercel before I/O",
    "configured PostgreSQL operational reads do not derive observation time from the app host",
    "configured PostgreSQL operational reads coalesce only overlapping health requests",
    "configured PostgreSQL operational read coalescing releases a failed request",
    "configured operational read model opens and attests the existing SQLite contracts read-only",
    "PostgreSQL operational read model normalizes aggregate rows without selecting identifiers",
    "PostgreSQL operational read model rejects catalog drift before aggregate queries",
    "PostgreSQL operational read model takes shared schema and relation locks before attestation",
    "PostgreSQL operational reads fail fast instead of deadlocking behind a migration advisory lock",
    "PostgreSQL operational transaction configures and locks before its DB-clock snapshot",
    "operational aggregation fails closed on unknown durable statuses even before health evaluation",
    "monitor checks both exact production origins with authenticated read-only GET",
    "monitor fails closed for stale/mismatched health, cached responses, cookies, and redirects",
    "monitor accepts a matching successful heartbeat through the hourly grace boundary",
    "monitor drill intentionally fails only after both healthy origins were checked",
    "monitor never accepts arbitrary origins or a short credential",
    "monitor retries a bounded in-progress heartbeat and recovers after success",
    "monitor still fails closed after three persistent unhealthy responses",
    "monitor identifies each rejected origin without exposing authentication responses",
    "monitor reports only bounded allowlisted reasons after persistent 503 responses",
    "monitor distinguishes unavailable 503 and transient HTTP responses without inventing reasons",
    "monitor redacts network and body-stream errors while preserving retry boundaries",
    "monitor validates privacy and JSON before reporting any 503 health reasons",
    "scheduled monitor is read-only, bounded, and supports an explicit alert drill",
    "production-write authorization is exact-family, exact-target, exact-SHA, and runtime-secret bound",
    "each acceptance workflow attempt has a bounded replay-safe execution identity",
    "release record must prove exact source, provider, aliases, Postgres schema, and both read-only smokes",
    "release record loader accepts one bounded regular JSON file and rejects links or malformed input",
    "provider JSON streaming stops and cancels at the response bound",
    "protected production-health loader selects only acceptance secrets and never pulls sensitive Vercel values",
    "production acceptance workflow is protected-main-only, serialized, exact-artifact-bound, and non-deploying",
    "synthetic family credentials are deterministic, role-separated, and restricted to Resend test delivery",
    "production session cookies and private parent responses are inspected without retaining values",
    "concurrent parent message evidence requires one durable write across at least two production processes",
    "Resend delivery and webhook progress accept only the official delivered test channel",
    "acceptance rejects polling budgets beyond the bounded hourly window",
    "full acceptance orchestration handles new teachers without exposing credentials or durable identifiers",
    "full acceptance orchestration handles existing teachers without exposing credentials or durable identifiers",
    "full acceptance orchestration handles registration-race teachers without exposing credentials or durable identifiers",
    "full acceptance orchestration handles hourly-delayed teachers without exposing credentials or durable identifiers",
    "full acceptance orchestration handles hourly-missing teachers without exposing credentials or durable identifiers",
    "full acceptance orchestration handles hourly-baseline-missing teachers without exposing credentials or durable identifiers",
    "teacher establishment stops on missing invite or non-401 login failure without registration"
  ],
  "historical-activation": [
    "exact PR304 and ordered same-tree main events are admitted",
    "PR event rejects other PR",
    "PR event rejects wrong base",
    "PR event rejects wrong head",
    "PR event rejects fork source",
    "PR event rejects other repository",
    "PR event rejects non-main target",
    "main rejects squash, reversed parents, changed tree, wrong ref and moved base",
    "closed activation record accepts its exact shape only",
    "post-code review requires distinct fixed identity, exact F/X/code and bounded chronology",
    "activation compares stored canonical with newly generated fresh and replay",
    "CLI rejects unexpected authority parameters without echoing raw input",
    "ACT-01 rejects a substituted storage commit even with matching internal references",
    "ACT-01 pins all three designated stored receipt byte hashes",
    "ACT-01 rejects review paths added, deleted and re-added before the only marker addition",
    "ACT-02 binds verification responses to exact transport, proof and distinct replay identity",
    "A23-ACT-01 rereads the exact artifact inventory and rejects mutations and aliases"
  ]
};
const hourlyNames = sourceNames["hourly-regressions"];

test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(hourlyNames);
  for (const name of ["hourly-regressions", "historical-activation"]) assert.deepEqual(g.verifyExecution(name, { status: 0, stdout: flatReport(sourceNames[name]) }), g.COMMANDS.find(c=>c.name===name).summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("hourly-regressions", result), /PR308_COMMAND_FAILED/);
  }
});
test("fresh hourly and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("hourly-regressions", {status: 0, stdout: flatReport(["replacement"])}), /PR308_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR308_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(hourlyNames)}), /PR308_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR308_/);
  }
});
test("the fourteen added historical evidence and custody files are exact frozen source input", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.filter(e=>e.before===null);
  assert.deepEqual(added.map(e=>e.path),["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization-input.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A11.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A11.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A22.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A22.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A23.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A23.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A25.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A25.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/main.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/native-execution.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/native-result.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/pr.json", "coordination/session-logs/2026-11-02-A12-account-deletion-shared-work.md"]);
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR308_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e.before!==null)),/PR308_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr308.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR308_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR308_TYPE_OUTPUT/);
  }
});

test("PR308 selection precedes the frozen PR307 contract and sanitizes both Node entries", () => {
  const workflow=readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8");
  assert.ok(workflow.indexOf(g.ADMISSION)<workflow.indexOf("reviewed-code/pr307-v1/admission.json"));
  assert.equal((workflow.match(/env -u NODE_OPTIONS -u NODE_PATH node scripts\/promotion-reviewed-code-pr308.mjs/g)??[]).length,3);
  assert.ok(workflow.includes("[[ -e "+g.ADMISSION+" || -L "+g.ADMISSION+" ]]"));
});
test("a present invalid PR308 marker fails without falling back to PR307", () => fixture(({repo,event,eventPath})=>{
  writeFileSync(eventPath,json(event()));
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr308.mjs"),"select","--repo",repo,"--event-name","pull_request","--event-path",eventPath],{env:g.commandEnvironment(),encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(result.stdout,"");
  assert.equal(parse(Buffer.from(result.stderr)).code,"PR308_SCHEMA");
},{admission:a=>{a.unreviewed=true;}}));
test("original PR307 checker, reports, receipts and activation evidence cannot enter tooling", () => {
  for(const file of [
    "scripts/promotion-reviewed-code-pr306.mjs",
    "coordination/integration/reviewed-code/pr307-v1/admission.json",
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
    "coordination/reports/2026-08-09-math-diagram-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/canonical-receipt.json",
    "coordination/integration/ca-textbook-successor/activation/ca-textbook-003/a11.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/manifest.json"
  ])fixture(({check})=>assert.throws(check,/PR308_TOOLING_PATHS/),{extraTooling:[file]});
});
test("the inherited native evidence and three historical inventory reports are byte-frozen", () => {
  const files=["scripts/promotion-reviewed-code-pr306.mjs","scripts/promotion-reviewed-code-pr306.test.mjs","coordination/integration/reviewed-code/pr307-v1","scripts/promotion-reviewed-code-pr305.mjs","scripts/promotion-reviewed-code-pr305.test.mjs","coordination/integration/reviewed-code/pr305-v1","scripts/promotion-required-check-ca-textbook-successor.mjs","coordination/integration/ca-textbook-successor/constants.mjs","coordination/integration/ca-textbook-successor/contract.mjs","coordination/integration/ca-textbook-successor/receipts.mjs","coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/canonical-receipt.json","coordination/reports/2026-08-09-math-diagram-inventory.json"];
  assert.equal(git(root,"diff","--name-only",g.BASE,g.SOURCE,"--",...files),"");
  for(const [file,hash,failures] of [
    ["coordination/reports/2026-08-09-math-diagram-inventory.json","5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc",0],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json","a7b6dfe9c4c13544a196c6887b9054339886ed3a5b992652765156486d430134",8],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json","8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805",10]
  ]){const bytes=readFileSync(path.join(root,file));assert.equal(g.hash(bytes),hash);assert.equal(parse(bytes).failures.length,failures);}
});
test("CLI rejects inherited Node loader authority", () => {
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr308.mjs"),"select"],{env:{...g.commandEnvironment(),NODE_PATH:"synthetic-untrusted-path"},encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(parse(Buffer.from(result.stderr)).code,"PR308_LOADER");
});


test("the release-governance repair changes only the reviewed dependency assertions", () => {
 const before=execFileSync("git",["show",g.SOURCE+":scripts/release-governance.test.mjs"],{cwd:root}).toString();
 const actual=readFileSync(path.join(root,"scripts/release-governance.test.mjs"),"utf8");
 assert.equal(actual,g.expectedReleaseGovernance(before));
 assert.equal((actual.match(/test[.]skip[(]/g)??[]).length,11);
 assert.throws(()=>g.expectedReleaseGovernance(before.replace('next: "15.5.23"','next: "changed"')),/PR308_GOVERNANCE_DELTA/);
});
test("a release-governance assertion cannot be deleted inside the exact tooling slice",()=>fixture(({check})=>assert.throws(check,/PR308_GOVERNANCE_DELTA/),{tooling:repo=>{
 const file=path.join(repo,"scripts/release-governance.test.mjs");writeFileSync(file,readFileSync(file,"utf8").replace('  assert.equal(packageJson.dependencies.sharp, "0.35.5");',''));
}}));

test("native artifact custody requires all seven exact operations and unchanged private bytes",()=>temporaryRepo(({temporary})=>{
 const output=path.join(temporary,"native");mkdirSync(output,{mode:0o700});
 const operations=[["validate","validate"],["fresh","shadow"],["replay","shadow"],["verify-canonical","verify-receipt"],["verify-fresh","verify-receipt"],["verify-replay","verify-receipt"],["observe-current","observe-current"]];
 const timestamp=new Date().toISOString();
 const runs=operations.map(([label,operation])=>{
  const record={label,operation,startedAt:timestamp,completedAt:timestamp,elapsedMs:0,exitCode:0,signal:null};
  for(const channel of ["stdout","stderr"]){const bytes=Buffer.from(channel==="stdout"?"{}\n":""),name=label+"."+channel;writeFileSync(path.join(output,name),bytes,{mode:0o600});record[channel]={name,sha256:g.hash(bytes),bytes:bytes.length};}
  return record;
 });
 writeFileSync(path.join(output,"runs.json"),json(runs),{mode:0o600});
 assert.equal(g.verifyNativeArtifactInventory(output,runs).length,15);
 assert.throws(()=>g.verifyNativeArtifactInventory(output,runs.slice(0,-1)),/PR308_NATIVE_RUN_INVENTORY/);
 const file=path.join(output,"observe-current.stdout");writeFileSync(file,"[]\n");assert.throws(()=>g.verifyNativeArtifactInventory(output,runs),/PR308_NATIVE_ARTIFACT_DRIFT/);
}));

test("workflow materializes the preflight-bound execution and does not permit a caller-selected SHA",()=>{
 const before=execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
 const workflow=YAML.parse(g.expectedWorkflow(before));
 const steps=workflow.jobs["promotion-shadow-gate"].steps;
 const step=steps.find(s=>s.name==="Verify exact PR308 recovery and CA004 native admission");
 assert.equal(step["if"],"${{ steps.contract.outputs.mode == 'reviewed-code-pr308' }}");
 assert.ok(step.run.includes("promotion-reviewed-code-pr308.mjs execution"));
 assert.ok(step.run.includes('checkout --quiet --detach "$execution_sha"'));
 assert.ok(step.run.includes('--execution "$execution" --artifact-root "$artifacts"'));
 assert.ok(step.run.includes('--no-hardlinks --no-checkout "$GITHUB_WORKSPACE"'));
});

const sha=c=>c.repeat(40);
function phaseFixture(){
 const source=sha('a'),native=sha('b'),tooling=sha('c'),evidence=sha('d'),execution=sha('e'),storage=sha('f');
 return {expected:{sourceCommit:source,nativeCodeCommit:native},actual:{sourceCommit:source,nativeCodeCommit:native,toolingCommit:tooling,evidenceCommit:evidence,executionCommit:execution,storageCommit:storage,headCommit:storage,
 parents:{native:[source],tooling:[native],evidence:[tooling],execution:[evidence],storage:[execution],head:[execution]},
 paths:{native:g.NATIVE_CODE_PATHS,tooling:g.CODE_PATHS,evidence:g.ALL_EVIDENCE_PATHS,execution:g.EXECUTION_PATHS,storage:g.RECEIPT_PATHS},
 additions:[...g.ALL_EVIDENCE_PATHS.map(path=>({path,commit:evidence})),...g.EXECUTION_PATHS.map(path=>({path,commit:execution})),...g.RECEIPT_PATHS.map(path=>({path,commit:storage}))],
 headTreeMatchesStorage:true}};
}
test('PR308 phase grammar is an implemented closed finite protocol',()=>assert.equal(typeof g.validateFinitePhaseChain,'function'));
test('only C R1 R2 E X F and H equal F are admitted',()=>{
 const {actual,expected}=phaseFixture();assert.equal(g.validateFinitePhaseChain(actual,expected).storageCommit,actual.storageCommit);
});
for(const phase of ['native','tooling','evidence','execution','storage']) test(`phase ${phase} rejects an extra path or inserted parent`,()=>{
 const {actual,expected}=phaseFixture();const changed=structuredClone(actual);changed.paths[phase].push('app/foreign.ts');assert.throws(()=>g.validateFinitePhaseChain(changed,expected),/PR308_PHASE/);
 const wrong=structuredClone(actual);wrong.parents[phase]=[sha('0')];assert.throws(()=>g.validateFinitePhaseChain(wrong,expected),/PR308_PHASE/);
});
test('all evidence and future receipt files first appear only at their designated phase',()=>{
 const {actual,expected}=phaseFixture();const early=structuredClone(actual);early.additions.find(row=>row.path===g.RECEIPT_PATHS[0]).commit=actual.executionCommit;assert.throws(()=>g.validateFinitePhaseChain(early,expected),/PR308_PHASE/);
 const readded=structuredClone(actual);readded.additions.push({...readded.additions[0]});assert.throws(()=>g.validateFinitePhaseChain(readded,expected),/PR308_PHASE/);
});
test('a new H descendant cannot be inserted after receipt storage',()=>{
 const {actual,expected}=phaseFixture();actual.headCommit=sha('0');actual.parents.head=[actual.storageCommit];assert.throws(()=>g.validateFinitePhaseChain(actual,expected),/PR308_PHASE/);
});
test('the only alternate head is ordered BASE F same-tree main merge',()=>{
 const {actual,expected}=phaseFixture();actual.headCommit=sha('0');actual.parents.head=[g.BASE,actual.storageCommit];g.validateFinitePhaseChain(actual,expected);
 for(const parents of [[actual.storageCommit,g.BASE],[g.BASE],[actual.storageCommit]])assert.throws(()=>g.validateFinitePhaseChain({...actual,parents:{...actual.parents,head:parents}},expected),/PR308_PHASE/);
 assert.throws(()=>g.validateFinitePhaseChain({...actual,headTreeMatchesStorage:false},expected),/PR308_PHASE/);
});
test('unknown authority keys and collapsed phases are rejected',()=>{
 const {actual,expected}=phaseFixture();assert.throws(()=>g.validateFinitePhaseChain({...actual,allowDescendants:true},expected),/PR308_PHASE/);
 assert.throws(()=>g.validateFinitePhaseChain({...actual,executionCommit:actual.evidenceCommit},expected),/PR308_PHASE/);
});

const skipped='Promotion Shadow npm commands are exact and expose no live-capable alias';
const report=(names=[['executed',false],[skipped,true]])=>Buffer.from('TAP version 13\n'+names.map(([name,skip],i)=>`# Subtest: ${name}\nok ${i+1} - ${name}${skip?' # SKIP':''}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join('')+`1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.filter(x=>!x[1]).length}\n# fail 0\n# cancelled 0\n# skipped ${names.filter(x=>x[1]).length}\n# todo 0\n# duration_ms 2.0\n`);
test('governance TAP validator keeps approved historical skips distinct from passed checks',()=>{assert.equal(typeof g.releaseGovernanceSummary,'function');const s=g.releaseGovernanceSummary(report());assert.equal(s.pass,1);assert.equal(s.skipped,1);assert.deepEqual(s.skippedNames,[skipped]);});
test('new or renamed skipped checks are rejected',()=>{assert.throws(()=>g.releaseGovernanceSummary(report([['new skipped test',true]])),/PR308_GOVERNANCE/);});
test('failed, cancelled, TODO or malformed results cannot masquerade as expected skips',()=>{for(const text of [report().toString().replace('ok 1 -','not ok 1 -'),report().toString().replace('# SKIP','# TODO'),report().toString().replace('# cancelled 0','# cancelled 1'),report().toString()+'ok 3 - hidden\n',report().toString().replace('# pass 1','# pass 2')])assert.throws(()=>g.releaseGovernanceSummary(Buffer.from(text)),/PR308_GOVERNANCE/);});
test('a skip duplicated under another index cannot inflate approved historical omissions',()=>{assert.throws(()=>g.releaseGovernanceSummary(report([[skipped,true],[skipped,true]])),/PR308_GOVERNANCE/);});

const nativeHash='a'.repeat(64),nativeSha='b'.repeat(40),nativeProof={sourceCommit:nativeSha};
const nativeTransport={path:'canonical.json',storageCommit:nativeSha,sha256:nativeHash};
const nativeOutput=()=>({schemaVersion:'ca004-verification.v1',result:'pass',transport:nativeTransport,binding:nativeProof,semanticDigest:nativeHash,replayRunId:'verify-12345678-1234-4123-8123-123456789abc',liveAllowed:false});
test('native verification output is bound to transported bytes, proof and a distinct replay',()=>{
 assert.equal(typeof g.validateNativeVerification,'function');const seen=new Set();g.validateNativeVerification(nativeOutput(),nativeTransport,nativeProof,{semanticDigest:nativeHash},seen);assert.equal(seen.size,1);assert.throws(()=>g.validateNativeVerification(nativeOutput(),nativeTransport,nativeProof,{semanticDigest:nativeHash},seen),/PR308_NATIVE/);
});
for(const [name,mutate] of [['wrong transport',x=>x.transport={...nativeTransport,sha256:'c'.repeat(64)}],['wrong proof',x=>x.binding={}],['extra authority',x=>x.deployAllowed=true],['live',x=>x.liveAllowed=true],['wrong semantic',x=>x.semanticDigest='d'.repeat(64)],['missing replay',x=>x.replayRunId='']])test(`native verification rejects ${name}`,()=>{assert.equal(typeof g.validateNativeVerification,'function');const x=nativeOutput();mutate(x);assert.throws(()=>g.validateNativeVerification(x,nativeTransport,nativeProof,{semanticDigest:nativeHash},new Set()),/PR308_NATIVE/);});

test("observe-current CLI envelope is checked before its native observation is unwrapped",()=>{
 assert.equal(typeof g.unwrapCurrentObservation,"function");
 const observation={schemaVersion:"ca004-current-observation.v1",liveAllowed:false};
 assert.equal(g.unwrapCurrentObservation({result:"pass",observation,liveAllowed:false}),observation);
 for(const value of [observation,{result:"blocked",observation,liveAllowed:false},{result:"pass",observation,liveAllowed:true},{result:"pass",observation,liveAllowed:false,deployAllowed:true},{result:"pass",observation:null,liveAllowed:false}])assert.throws(()=>g.unwrapCurrentObservation(value),/PR308_NATIVE_CURRENT_ENVELOPE/);
});
