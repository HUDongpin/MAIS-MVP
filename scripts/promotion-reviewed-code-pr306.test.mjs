import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr306.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr306-source-checks.v1",
  "sourceCommit": "dd0c4a51d7e6cd23d734da3f7f8e292d7e426042",
  "sourceTree": "ff3dd1ea83b47cc61bdb79bdaa1b43be3c7d7db5",
  "executedAt": "2026-10-30T14:53:45.305Z",
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
      "name": "provider-policy",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "lib/aiProviderCompanyPolicy.test.ts",
        "lib/browserSpeechPolicy.test.ts",
        "lib/practiceReadAloud.test.ts",
        "lib/server/regionScopedProviders.test.ts",
        "lib/server/aiProviderPolicyContext.test.ts",
        "lib/server/tutorProviderPolicyProof.test.ts",
        "tests/e2e/ai-provider-company-policy.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "1f5466561b97b449224d43520e046049517ac56fe0885c070fa692513ecb4533",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 49,
        "suites": 0,
        "pass": 49,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "c5abe27da96884f13792639735c71a4a7965b0adc7faf2e7c7c874068948d811"
      }
    },
    {
      "name": "auth-admission",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "lib/server/aiTutorAdmission.test.ts",
        "lib/server/aiTutorResolveAdmissionContract.test.ts",
        "lib/server/userStore/authAdmissionPersistence.test.ts",
        "lib/server/userStore/authStore.test.ts",
        "lib/server/userStore/aiTutorAdmissionConnectionPrimer.test.ts",
        "lib/server/userStore/aiTutorJournalPersistence.test.ts",
        "lib/server/userStore/aiTutorPolicyAdmissionPersistence.test.ts",
        "lib/server/userStoreNovaPostgresAdmission.test.ts",
        "lib/server/userStoreAiGovernancePersistence.test.ts",
        "lib/server/userStoreAuthSessionPersistence.test.ts",
        "lib/server/userStoreAuth.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "76f555fea7968e79da55a497663da161888bf142f8420d93326f8ffd61cca39a",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 169,
        "suites": 0,
        "pass": 169,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "63f4bdbb75514c87fca39e76585ef80be4b0afd822ed60dbe25bd7ba33d0aa1f"
      }
    },
    {
      "name": "parent-safe-boundary",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "app/parent/parentRscSafeBoundary.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "ecd1aac47305b9e1f7f4a0178539c4699dd604c11615925ef20053d179d878c2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 7,
        "suites": 0,
        "pass": 7,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "d33d4b87478c896b7661db58df876e2a2dd46a20e2e43b7bf9a7fa5c1b29ca2e"
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
      "stdoutSha256": "b825df5c49b312a83fa71e175f7dfcb5dc825b5a654bd1180200edcf1828d7c4",
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
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr306-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR306 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
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
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR306 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr306-admission.v1", pullRequest: 306, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr306-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR306 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr306-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr306-required-check", scope: g.SCOPE,
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
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 306, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 306,
      pull_request: { number: 306, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the 57-file regional-provider source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 57); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), ["465196f63df4766404fd35e0cd447fcd8193a211"]);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", "465196f63df4766404fd35e0cd447fcd8193a211").split(" "), ["037499f8102570602d4ef2610c55b6da4b245e63"]);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", "037499f8102570602d4ef2610c55b6da4b245e63").split(" "), [g.BASE]);
  assert.equal(entries.filter(e => e.before === null).length, 13);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR306_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR306_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR306_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR306_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr306-v1")<g.expectedWorkflow(before).indexOf("coordination/integration/reviewed-code/pr305-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR306 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.equal(g.PULL_REQUEST, 306, "the actual requested PR number is independent of fixture configuration");
  assert.deepEqual(g.IDENTITIES, { A11: "/root/pr306_gate_a11", A23: "/root/pr306_gate_a23" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=305;e.pull_request.number=305;},e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR306_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR306_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR306_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR306_TOOLING_PATHS/),{extraTooling:["lib/pr306-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR306_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR306_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR306_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR306_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR306_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR306_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR306_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR306_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR306_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR306_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR306_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR306_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR306_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR306_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR306_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR306_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR306_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, provider, auth and historical activation commands", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name), ["types", "provider-policy", "auth-admission", "parent-safe-boundary", "historical-activation"]);
  assert.equal(g.COMMANDS[0].summary, null);
  assert.deepEqual(g.COMMANDS.filter(c=>c.summary?.tests).map(c=>c.summary.tests), [49,169,7,17]);
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR306_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR306_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR306_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR306_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR306_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR306_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR306_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR306_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR306_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR306_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add a native Shadow acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR306_SCHEMA/);
}, {admission: a => { a.historicalPromotionRevalidated = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
  "provider-policy": [
    "US policy follows the API company, independently of its model or regional hostname",
    "endpoint identity rejects lookalikes, URL credentials, non-TLS and alternate ports for US",
    "OpenRouter cannot override the US upstream-company allowlist or fall back outside it",
    "HK and Mainland preserve all existing service-company choices",
    "missing policy context cannot relax the US company restriction",
    "the trusted stored region takes precedence, with legacy-track fallback for incomplete profiles",
    "US and unknown included subjects cannot be relaxed by an HK actor",
    "restricted requests cannot follow an unchecked provider redirect",
    "US and unresolved regions cannot start an unidentified browser speech service",
    "restricted read-aloud selects an explicit local voice and cannot fall back to a remote default",
    "the practice and guided-tour speaker never calls synthesis with a remote or default US voice",
    "maps UI languages to spoken language codes",
    "builds English utterances with numbered choices",
    "builds Chinese utterances with Chinese ordinals and full-width punctuation",
    "skips empty options and works without any options",
    "persisted learner and class contexts keep US data on US companies even for an HK teacher",
    "authentication does not disguise missing stored region as unrestricted HK for providers",
    "normalization, persistence and hot-row projection preserve unresolved and explicit US policy",
    "a stored region survives conflicting legacy publishers in raw and persisted authentication",
    "bootstrap and login decoding retain the nullable policy before browser speech decisions",
    "US text and vision use the requested OpenRouter gateway even for a Qwen model",
    "HK and Mainland preserve preferred and generic provider behavior",
    "missing US keys never select an otherwise configured forbidden provider",
    "a custom compatible endpoint cannot claim the US identity of its configuration slot",
    "US capabilities report Alibaba voice and speech as unavailable",
    "the transport rejects Alibaba US before any fetch or regional retry",
    "OpenRouter requires an explicit model and cannot silently use configured DeepInfra",
    "US generic and LLM requests reject redirects while HK retains its request settings",
    "reply policy proof binds the authenticated actor, normalized spoken text and restrictive region",
    "server-owned history retains US policy across context changes and omits legacy unlabelled turns",
    "spoken-text canonicalization remains stable when the length boundary falls on whitespace",
    "tutor draft serialization and restoration retain only bounded policy proofs",
    "Nova Lens response decoding and tutor opening carry the proof into the displayed reply",
    "US refuses the Alibaba capability before any network operation: app/api/ai-tutor/voice/route.ts",
    "US refuses the Alibaba capability before any network operation: app/api/ai-tutor/speech/route.ts",
    "US refuses the Alibaba capability before any network operation: app/api/lesson-audio/route.ts",
    "HK and Mainland speech keep the configured Alibaba path",
    "a US-target reply cannot be read through Alibaba by an HK teacher",
    "US tutor text and image ignore forged HK request context",
    "US tutor failures and missing keys never fall back to Alibaba",
    "an HK teacher's authorized US target keeps the restrictive tutor policy",
    "US OCR skips SimpleTex and uses the allowed Mathpix endpoint",
    "another owner's stored OCR image cannot inherit an HK admin's unrestricted routing",
    "client-supplied old history is not forwarded without server policy provenance",
    "US Nova Lens uses an allowed service and HK retains DeepSeek",
    "Nova Lens signs the final region for read-aloud, including a restricted subject",
    "teacher generation binds an authorized US class even for an HK teacher",
    "US EdUHK proxy generation sends neither of its two requests",
    "capability status is private and differs by authenticated region"
  ],
  "auth-admission": [
    "a pending authentication lookup fails closed and ignores a late resolution",
    "a pending classroom-policy lookup fails closed and ignores a late resolution",
    "a pending rate-limit lookup fails closed and ignores a late resolution",
    "a null authentication result remains unauthenticated without governance calls",
    "successful admission preserves auth then classroom-policy then rate-limit order",
    "a fallback-only classroom policy stops before rate-limit consumption",
    "an abort signal stops admission before a later stage can run",
    "Nova resolver runs auth, classroom policy, and rate admission through bounded fail-closed stages",
    "Nova resolver attests the returned model and does not penalize Qwen for client cancellation",
    "public Nova stream emits provider evidence only from a successful resolver response",
    "connection primer coalesces only the active attempt and primes again after success",
    "connection primer clears a failed attempt so the next request can retry",
    "an expired queued primer never destroys the active admission transaction",
    "an admission operation destroys its dedicated client on abort before releasing",
    "a completed admission operation removes its abort listener",
    "a pre-aborted admission operation never starts or destroys a client",
    "a failed client destruction still settles the aborted wrapper",
    "a stalled postgres.js cold BEGIN is destroyed after startup completes",
    "journal overlay replaces matching snapshot ids and appends stable journal-only rows",
    "journal overlay emits every immutable id exactly once",
    "persistence lane serializes work and continues after a rejected task",
    "policy admission maps projected class rows to the strictest student policy",
    "aborting policy admission rejects promptly without unsafe postgres.js cancellation",
    "authoritative students without a class receive the existing default-open policy",
    "policy admission fails closed on a stale schema marker or corrupt class projection",
    "a non-null malformed classroom policy fails closed instead of normalizing open",
    "auth admission maps one authoritative joined row",
    "auth admission treats zero authoritative rows as an unauthenticated miss",
    "only an authoritative zero-row result can use the exact seeded fallback",
    "auth admission rejects corrupt joined rows instead of treating them as a miss",
    "auth admission propagates database failures without converting them to null",
    "a missing auth migration table remains an unavailable database error",
    "a pre-aborted auth admission never creates a database query",
    "aborting a pending auth admission rejects without invoking unsafe postgres.js cancellation",
    "auth admission removes abort listeners after success and failure",
    "abort listeners stay isolated across independently scheduled auth lookups",
    "auth admission rejects promptly while the underlying query settles under server timeout",
    "the auth admission slot drops an aborted waiter before the next transaction starts",
    "an isolated slow rate lane cannot head-of-line block a policy lane",
    "three independent admission lanes can be active without cross-domain serialization",
    "a pre-aborted auth admission never enters the transaction slot",
    "a missing or stale auth schema marker fails closed",
    "joined auth rows preserve the existing user, curriculum, and settings mapping",
    "missing or malformed joined settings use the existing default settings",
    "missing or malformed identity rows cannot become authenticated sessions",
    "joined auth mapping preserves non-student roles",
    "the auth facade forwards the signed revision and admission signal to one session-aware lookup",
    "the auth facade propagates session lookup failures without an ID-only fallback",
    "AI governance persistence store records tutor messages and token usage without legacy userStore imports",
    "AI governance persistence lets a narrow message journal bypass the snapshot mutation",
    "AI governance persistence lets a narrow usage journal bypass the snapshot mutation",
    "AI governance journal failures never fall back to a snapshot mutation",
    "an inapplicable journal hook preserves the legacy snapshot writer",
    "AI Tutor database context only runs for an explicit database-backed anchor or scope",
    "AI governance persistence skips snapshots when no AI Tutor database evidence is requested",
    "AI governance persistence treats blank database evidence selectors as unrequested",
    "AI governance persistence preserves snapshots for every explicit AI Tutor evidence selector",
    "AI governance persistence uses the narrow pre-snapshot hook for Nova token quota",
    "AI governance persistence falls back to one snapshot when Nova token quota hook is unavailable",
    "AI governance persistence owns durable event normalization for legacy database load",
    "AI governance persistence owns durable event collection normalization for legacy userStore",
    "AI governance persistence owns tutor message and usage record defaults for legacy userStore",
    "AI governance persistence owns adaptive LLM cache status normalization helpers",
    "AI governance persistence owns cached LLM recommendation normalization",
    "AI governance persistence owns adaptive recommendation cache record normalization",
    "AI governance persistence store evaluates durable rate limits and admin summaries",
    "AI governance admin summary replaces legacy Nova rate events with the dedicated Postgres ledger",
    "AI governance persistence uses narrow pre-snapshot hooks for Nova policy and rate admission",
    "AI governance persistence keeps snapshot fallback when narrow hooks are not applicable",
    "AI governance persistence resolves pilot platform loop data through extracted boundary",
    "AI governance persistence builds AI Tutor database context through extracted boundary",
    "AI governance persistence owns AI Tutor context list and scope helpers",
    "AI governance persistence owns AI Tutor database context result assembly",
    "AI governance persistence owns AI Tutor context subject resolution",
    "AI governance persistence owns AI Tutor context scope access decisions",
    "AI governance persistence owns AI Tutor requested scope set",
    "AI governance persistence owns student dashboard scope context",
    "AI governance persistence owns teacher dashboard scope context",
    "AI governance persistence owns teacher-student profile scope context",
    "AI governance persistence owns adaptive engine scope context",
    "AI governance persistence owns recent tutor message context inputs",
    "AI governance persistence owns requested database record lookup for AI Tutor context",
    "AI governance persistence owns requested curriculum context filtering",
    "AI governance persistence owns AI Tutor lesson context input",
    "AI governance persistence owns recent practice context inputs",
    "AI governance persistence owns AI Tutor context summary builders",
    "AI governance persistence owns AI Tutor inline context line builders",
    "AI governance persistence owns pilot platform helper builders for legacy userStore",
    "AI governance persistence owns pilot teacher review queue builder for legacy userStore",
    "AI governance persistence owns parent-safe draft filtering for pilot parent view",
    "legacy userStore delegates pilot platform loop data through AI governance domain store",
    "AI governance persistence owns pilot platform loop data builder for legacy userStore",
    "legacy userStore delegates AI Tutor database context through AI governance domain store",
    "legacy userStore re-exports AI Tutor context types from AI governance persistence",
    "credential lookup continues past a duplicate username with the wrong password",
    "credential lookup still supports exact email login for a duplicated demo user",
    "hot auth table lookup continues past a duplicate username with the wrong password",
    "hot auth table overlay replaces stale snapshot auth rows",
    "auth session persistence resolves authenticated users without legacy userStore imports",
    "auth session persistence owns hot auth row helpers",
    "auth session persistence owns password crypto helpers for legacy userStore",
    "auth session persistence owns identity normalization helpers for legacy userStore",
    "auth session persistence owns auth user record normalization for legacy userStore",
    "auth session persistence owns user settings record normalization for legacy userStore",
    "auth session persistence owns password reset token record normalization for legacy userStore",
    "auth session persistence owns avatar and profile sanitizers for legacy userStore",
    "auth session persistence owns student profile record normalization for legacy userStore",
    "auth session persistence owns student profile lookup helper for legacy userStore",
    "auth session persistence owns curriculum profile lookup helpers for legacy userStore",
    "auth session persistence owns record curriculum profile helper for legacy userStore",
    "legacy userStore consumes auth hot row helpers from auth session persistence",
    "auth session persistence owns hot-table test hook factory for legacy userStore",
    "auth session persistence owns hot-table projection helpers for legacy userStore",
    "auth session persistence owns default user settings records for legacy userStore",
    "auth session persistence owns authenticated session projection for legacy userStore",
    "auth session persistence owns database-backed authenticated user projection for legacy userStore",
    "auth session persistence owns database-backed login result projection for legacy userStore",
    "auth session persistence matches credential users without legacy userStore imports",
    "auth session persistence authenticates snapshot users without legacy userStore imports",
    "auth session persistence authenticates login users and preserves snapshot database handoff",
    "auth session persistence lets login fast hooks short-circuit or fall back by retry policy",
    "auth session persistence identifies demo login retry candidates",
    "auth session persistence owns demo seed boundary helpers for legacy userStore",
    "auth settings grade selection lets Student Jon use California Kindergarten through Grade 12",
    "auth session persistence owns example account seed selectors for legacy userStore",
    "auth session persistence owns demo account sync helpers for legacy userStore",
    "auth session persistence owns bootstrap admin helpers for legacy userStore",
    "auth session persistence owns fixed example account scope helpers for legacy userStore",
    "auth session persistence owns storage-free example account records for legacy userStore",
    "auth session persistence owns storage-free example database adapter for legacy userStore",
    "auth session persistence owns storage-free example authenticated user for legacy userStore",
    "auth session persistence authenticates flexible fixed example accounts",
    "flexible fixed example login authenticates the persisted active user and never fabricates revision or password state",
    "auth session persistence completes missing student curriculum setup",
    "auth session persistence preserves existing student curriculum setup",
    "auth session persistence creates parent users through snapshot storage",
    "auth session persistence rejects invalid parent account creation",
    "auth session persistence creates student users and seeds lesson progress",
    "auth session persistence creates teacher users without student progress rows",
    "auth session persistence rejects invalid student and teacher account creation",
    "auth session persistence uses hot lookup before snapshot reads",
    "auth session persistence falls back and rejects unavailable profiles",
    "auth session persistence updates settings through snapshot storage",
    "auth session persistence lets hot settings update short-circuit snapshot storage",
    "auth session persistence updates profile names and avatar media safely",
    "auth session persistence changes authenticated passwords through snapshot storage",
    "successful password changes revoke every unused reset token for only that account",
    "disabling an account revokes every unused reset token for only that account",
    "session-aware authentication treats legacy users as revision one and fails closed",
    "session admission and issuance fall back to revision-aware snapshot state when hot auth opts out",
    "password changes and resets atomically increment the stored session revision",
    "logout-all and disable state transitions each revoke every previously minted session",
    "password change, reset, and logout-all revoke two independently minted device tokens",
    "auth session persistence creates password reset requests without legacy userStore imports",
    "auth session persistence resets passwords and consumes valid reset tokens",
    "successful password resets revoke every unused sibling token for only that account",
    "auth session persistence rejects malformed reset expiry without mutating account state",
    "auth session persistence lets password reset hot hooks short-circuit snapshot storage",
    "legacy userStore delegates authenticated user lookup to extracted auth session persistence",
    "Nova Postgres admission uses a narrow policy read and atomic per-user rate ledger",
    "Nova Postgres rate admission does not route through the global app_state mutation",
    "Nova Postgres policy admission uses one dedicated abort-bounded projection join",
    "Nova Postgres token quota uses a bounded abortable aggregate before snapshot fallback",
    "Nova journal writers dual-write the legacy snapshot without full snapshot hydration",
    "Nova v3 migration makes classroom projections authoritative before the marker",
    "slow rate admission cannot occupy the policy or authentication connection lane",
    "Nova quota soft timeout aborts the pending Postgres lookup",
    "Nova authentication uses one authoritative abort-bounded Postgres join without snapshot fallback",
    "Nova authentication verifies the session before the dedicated admission lookup"
  ],
  "parent-safe-boundary": [
    "parent server pages project raw persistence models before crossing into client components",
    "parent HTML and RSC responses are explicitly private and non-cacheable",
    "parent layout failures still reach a privacy-safe family-specific fallback",
    "parent message filters and replies use explicit label-control associations",
    "all parent client props accept only parent-safe DTO types",
    "an authenticated parent with an explicit invalid child selection reaches the 404 boundary",
    "the server-seeded app shell serializes only its explicit safe user allowlist"
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
const providerNames = sourceNames["provider-policy"];

test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(providerNames);
  for (const name of ["provider-policy", "auth-admission", "parent-safe-boundary", "historical-activation"]) assert.deepEqual(g.verifyExecution(name, { status: 0, stdout: flatReport(sourceNames[name]) }), g.COMMANDS.find(c=>c.name===name).summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("provider-policy", result), /PR306_COMMAND_FAILED/);
  }
});
test("fresh provider and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("provider-policy", {status: 0, stdout: flatReport(["replacement"])}), /PR306_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR306_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(providerNames)}), /PR306_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR306_/);
  }
});
test("the thirteen added source files are part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.filter(e=>e.before===null);
  assert.deepEqual(added.map(e=>e.path),["components/providers/useAiProviderRegion.ts", "docs/superpowers/plans/2026-10-30-provider-company-policy.md", "lib/aiProviderCompanyPolicy.test.ts", "lib/aiProviderCompanyPolicy.ts", "lib/browserSpeechPolicy.test.ts", "lib/browserSpeechPolicy.ts", "lib/server/aiProviderPolicyContext.test.ts", "lib/server/aiProviderPolicyContext.ts", "lib/server/regionScopedProviders.test.ts", "lib/server/regionScopedProviders.ts", "lib/server/tutorProviderPolicyProof.test.ts", "lib/server/tutorProviderPolicyProof.ts", "tests/e2e/ai-provider-company-policy.test.ts"]);
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR306_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e.before!==null)),/PR306_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr306.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR306_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR306_TYPE_OUTPUT/);
  }
});
test("PR306 selection precedes the frozen PR305 contract and sanitizes both Node entries", () => {
  const workflow=readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8");
  assert.ok(workflow.indexOf(g.ADMISSION)<workflow.indexOf("coordination/integration/reviewed-code/pr305-v1/admission.json"));
  assert.equal((workflow.match(/env -u NODE_OPTIONS -u NODE_PATH node scripts\/promotion-reviewed-code-pr306.mjs/g)??[]).length,2);
  assert.ok(workflow.includes("[[ -e "+g.ADMISSION+" || -L "+g.ADMISSION+" ]]"));
});
test("a present invalid PR306 marker fails without falling back to PR305", () => fixture(({repo,event,eventPath})=>{
  writeFileSync(eventPath,json(event()));
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr306.mjs"),"select","--repo",repo,"--event-name","pull_request","--event-path",eventPath],{env:g.commandEnvironment(),encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(result.stdout,"");
  assert.equal(parse(Buffer.from(result.stderr)).code,"PR306_SCHEMA");
},{admission:a=>{a.unreviewed=true;}}));
test("original PR305 and PR304 checkers, reports, receipts and evidence cannot enter tooling", () => {
  for(const file of [
    "scripts/promotion-reviewed-code-pr305.mjs",
    "coordination/integration/reviewed-code/pr305-v1/admission.json",
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
    "coordination/reports/2026-08-09-math-diagram-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/canonical-receipt.json",
    "coordination/integration/ca-textbook-successor/activation/ca-textbook-003/a11.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/manifest.json"
  ])fixture(({check})=>assert.throws(check,/PR306_TOOLING_PATHS/),{extraTooling:[file]});
});
test("the inherited native evidence and three historical inventory reports are byte-frozen", () => {
  const files=["scripts/promotion-reviewed-code-pr305.mjs","scripts/promotion-reviewed-code-pr305.test.mjs","coordination/integration/reviewed-code/pr305-v1","scripts/promotion-required-check-ca-textbook-successor.mjs","coordination/integration/ca-textbook-successor","coordination/reports/2026-08-09-math-diagram-inventory.json"];
  assert.equal(git(root,"diff","--name-only",g.BASE,g.SOURCE,"--",...files),"");
  for(const [file,hash,failures] of [
    ["coordination/reports/2026-08-09-math-diagram-inventory.json","5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc",0],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json","a7b6dfe9c4c13544a196c6887b9054339886ed3a5b992652765156486d430134",8],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json","8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805",10]
  ]){const bytes=readFileSync(path.join(root,file));assert.equal(g.hash(bytes),hash);assert.equal(parse(bytes).failures.length,failures);}
});
test("CLI rejects inherited Node loader authority", () => {
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr306.mjs"),"select"],{env:{...g.commandEnvironment(),NODE_PATH:"synthetic-untrusted-path"},encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(parse(Buffer.from(result.stderr)).code,"PR306_LOADER");
});
