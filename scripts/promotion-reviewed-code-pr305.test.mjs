import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr305.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr305-source-checks.v1",
  "sourceCommit": "d6a5455ec2e5d2f01c5f893c2129eaa0f4886651",
  "sourceTree": "06530773f3a2faeed7245896847627ef7c611d39",
  "executedAt": "2026-10-30T06:35:57.959Z",
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
      "name": "diagram-regressions",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "tests/e2e/math-diagram-coverage.test.ts",
        "tests/e2e/math-diagram-source-geometry.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "a1e240e0bbf91b6c765a23c71d9f3408358b475c2f2615e06eb04c0950d9b3a2",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 44,
        "suites": 0,
        "pass": 44,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "62beef340a3bf3179e634ed05a929c7574ceb00c6ed603629fe051fef81646ec"
      }
    },
    {
      "name": "inventory",
      "args": [
        "--import",
        "tsx",
        "scripts/audit-math-diagram-inventory.ts",
        "--json"
      ],
      "exitCode": 0,
      "stdoutSha256": "da26846d12359d77e5730cad3b68a3349c5593588237cc1e5d5f77ff733d6b98",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "reportDigest": "45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607",
        "discoveredRowDigestSha256": "737169bdab539145ee20787a9fdb35454dbd503636985eae70b5d58ae70a46bf",
        "currentFailureCount": 0,
        "historicalFailureCount": 10,
        "historicalFailuresDigest": "2b698c56c86d913773780ea01ff3e4c73d325499992d3850ca9aa907a8307e7d"
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
      "stdoutSha256": "969b5daee233071095a0f23a17fc801360c6d7823d1b3554a2962ac9e48a2a2b",
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
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr305-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR305 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
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
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR305 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr305-admission.v1", pullRequest: 305, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr305-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR305 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr305-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr305-required-check", scope: g.SCOPE,
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
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 305, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 305,
      pull_request: { number: 305, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the five-file diagram-inventory source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 5); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.BASE]);
  assert.equal(entries.filter(e => e.before === null).length, 3);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR305_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR305_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR305_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR305_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr305-v1")<g.expectedWorkflow(before).indexOf("ca-textbook-successor/activation/ca-textbook-003/admission"));
});
test("complete synthetic S T E chain accepts exactly PR305 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.deepEqual(g.IDENTITIES, { A11: "/root/pr305_gate_a11", A23: "/root/pr305_gate_a23" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR305_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR305_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR305_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR305_TOOLING_PATHS/),{extraTooling:["lib/pr305-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR305_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR305_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR305_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR305_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR305_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR305_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR305_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR305_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR305_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR305_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR305_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR305_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR305_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR305_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR305_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR305_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR305_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, diagram, inventory and historical activation commands", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name), ["types", "diagram-regressions", "inventory", "historical-activation"]);
  assert.equal(g.COMMANDS[0].summary, null);
  assert.deepEqual(g.COMMANDS.filter(c=>c.summary?.tests).map(c=>c.summary.tests), [44,17]);
  assert.equal(g.COMMANDS[2].summary.currentFailureCount, 0);
  assert.equal(g.COMMANDS[2].summary.historicalFailureCount, 10);
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR305_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR305_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR305_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR305_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR305_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR305_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR305_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR305_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR305_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR305_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add a native Shadow acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR305_SCHEMA/);
}, {admission: a => { a.historicalPromotionRevalidated = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
  "diagram-regressions": [
    "the current admitted graph satisfies coverage without resurrecting historical candidates",
    "a same-count lesson replacement cannot hide a missing route",
    "a retained lesson cannot silently change its canonical route",
    "an interactive lesson cannot lose its live parent binding",
    "the 35 admitted California openers cannot disappear from the graph",
    "a same-count practice figure replacement cannot hide a missing question",
    "a retained practice question cannot silently change diagram kind",
    "a same-count lab replacement cannot hide a missing live lab",
    "a signature lab cannot swap its primary renderer with a related bench",
    "a purpose-built HK lab cannot silently revert to the generic renderer",
    "a live 3D lab cannot disappear behind unchanged overall lab counts",
    "retired California signature-canvas 3D declarations must stay retired",
    "a same-count asset replacement cannot hide a missing live reference",
    "duplicate references cannot inflate coverage",
    "historical-only lessonRoutes cannot re-enter live coverage",
    "historical-only practiceFigures cannot re-enter live coverage",
    "historical-only visualizationLabs cannot re-enter live coverage",
    "historical-only liveAssetReferences cannot re-enter live coverage",
    "new identities may extend coverage while every retained binding stays intact",
    "report row ordering does not change identity coverage",
    "retired bitmaps cannot return through a renamed exporter",
    "modified immutable evidence fails closed: coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "missing immutable evidence fails closed: coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "modified immutable evidence fails closed: coordination/reports/2026-08-09-math-diagram-inventory.json",
    "missing immutable evidence fails closed: coordination/reports/2026-08-09-math-diagram-inventory.json",
    "a retained lesson cannot lose an embedded visualization",
    "a retained lesson cannot lose its interactive lesson binding",
    "new signature-canvas identities cannot reintroduce misleading 3D declarations",
    "all static angle arcs end on their defining rays without crossing past them",
    "known static lesson angle arcs remain semantically marked for strict geometry validation",
    "the reported precise-definitions angle keeps its exact arc below butt-capped defining rays",
    "shared semantic angle arcs use butt caps so paint ends exactly on the defining rays",
    "diagram inventory audits each topic through its canonical live lesson href",
    "diagram inventory counts product source surfaces without test or fixture markup",
    "diagram inventory classifies every CCSS control and its exceptional state policy",
    "ordinary CCSS buttons use a bounded fail-closed replayable state graph",
    "requested diagram IDs fail closed only inside suites whose inventory owns them",
    "standalone diagram routes remain in the live audit graph and the California textbook route carries no bitmap references",
    "browser audit enforces exact root-document width while retaining element paint tolerance",
    "layout stability freezes Manim canvases that mount after the progressive SVG fallback",
    "shared Practice figures keep graph paint clipped and narrow figures shrink or wrap",
    "Mistake Book preserves the mathematical figure needed to understand a stored graph mistake",
    "interactive geometry rejects collapsed triangles, duplicate points, and invisible Euler centers",
    "CCSS figure cards expose intrinsically wide diagrams as bounded, keyboard-accessible scroll regions"
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
const diagramNames = sourceNames["diagram-regressions"];

test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(diagramNames);
  for (const name of ["diagram-regressions", "historical-activation"]) assert.deepEqual(g.verifyExecution(name, { status: 0, stdout: flatReport(sourceNames[name]) }), g.COMMANDS.find(c=>c.name===name).summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("diagram-regressions", result), /PR305_COMMAND_FAILED/);
  }
});
test("fresh diagram and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("diagram-regressions", {status: 0, stdout: flatReport(["replacement"])}), /PR305_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR305_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(diagramNames)}), /PR305_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR305_/);
  }
});
test("the three added source files are part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.filter(e=>e.before===null);
  assert.deepEqual(added.map(e=>e.path),["docs/superpowers/plans/2026-10-30-diagram-inventory-repair.md","scripts/math-diagram-coverage.ts","tests/e2e/math-diagram-coverage.test.ts"]);
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR305_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e.before!==null)),/PR305_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr305.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR305_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR305_TYPE_OUTPUT/);
  }
});
test("inventory output binds every discovered row and original historical failure string", () => {
  const spec=g.COMMANDS.find(c=>c.name==="inventory");
  const stdout=execFileSync(process.execPath,spec.args,{cwd:root,env:g.commandEnvironment(),timeout:30000});
  const actual=parse(stdout);assert.deepEqual(g.verifyExecution("inventory",{status:0,stdout}),spec.summary);
  for (const mutate of [v=>{v.failures.push("new failure");},v=>{v.summary.lessonRouteCount--;},
    v=>{v.lessonRoutes[0].route="/unreviewed";},v=>{v.visualizationLabs[0].moduleId="unreviewed";},
    v=>{v.coverageBaseline.historicalFailures[0]="replaced historical failure";},
    v=>{v.coverageBaseline.historicalFailures.pop();},v=>{v.coverageBaseline.reference.sha256="0".repeat(64);},
    v=>{v.coverageBaseline.historicalReference.path="other.json";},v=>{v.coverageBaseline.scope="production-accepted";},
    v=>{v.globalInventoryPassed=true;},v=>{v.liveAllowed=true;},v=>{v.historicalPromotionRevalidated=true;}]) {
    const value=structuredClone(actual);mutate(value);
    assert.throws(()=>g.verifyExecution("inventory",{status:0,stdout:Buffer.from(json(value))}),/PR305_INVENTORY_REPORT/);
  }
  for (const bytes of [Buffer.from("{}"),Buffer.from('{"failures":[],"failures":[]}'),Buffer.from([0xff])]) {
    assert.throws(()=>g.verifyExecution("inventory",{status:0,stdout:bytes}),/PR305_INVENTORY_REPORT/);
  }
  assert.throws(()=>g.verifyExecution("inventory",{status:0,stdout,stderr:Buffer.from("unexpected diagnostic")}),/PR305_INVENTORY_REPORT/);
});

test("PR305 selection precedes the frozen PR304 contract and sanitizes both Node entries", () => {
  const workflow=readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8");
  assert.ok(workflow.indexOf(g.ADMISSION)<workflow.indexOf("ca-textbook-successor/activation/ca-textbook-003/admission.json"));
  assert.equal((workflow.match(/env -u NODE_OPTIONS -u NODE_PATH node scripts\/promotion-reviewed-code-pr305.mjs/g)??[]).length,2);
  assert.ok(workflow.includes("[[ -e "+g.ADMISSION+" || -L "+g.ADMISSION+" ]]"));
});
test("a present invalid PR305 marker fails without falling back to PR304", () => fixture(({repo,event,eventPath})=>{
  writeFileSync(eventPath,json(event()));
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr305.mjs"),"select","--repo",repo,"--event-name","pull_request","--event-path",eventPath],{env:g.commandEnvironment(),encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(result.stdout,"");
  assert.equal(parse(Buffer.from(result.stderr)).code,"PR305_SCHEMA");
},{admission:a=>{a.unreviewed=true;}}));
test("original PR304 checker, reports, receipts and activation evidence cannot enter tooling", () => {
  for(const file of [
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
    "coordination/reports/2026-08-09-math-diagram-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/canonical-receipt.json",
    "coordination/integration/ca-textbook-successor/activation/ca-textbook-003/a11.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/manifest.json"
  ])fixture(({check})=>assert.throws(check,/PR305_TOOLING_PATHS/),{extraTooling:[file]});
});
test("the inherited native evidence and three historical inventory reports are byte-frozen", () => {
  const files=["scripts/promotion-required-check-ca-textbook-successor.mjs","coordination/integration/ca-textbook-successor","coordination/reports/2026-08-09-math-diagram-inventory.json"];
  assert.equal(git(root,"diff","--name-only",g.BASE,g.SOURCE,"--",...files),"");
  for(const [file,hash,failures] of [
    ["coordination/reports/2026-08-09-math-diagram-inventory.json","5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc",0],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json","a7b6dfe9c4c13544a196c6887b9054339886ed3a5b992652765156486d430134",8],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json","8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805",10]
  ]){const bytes=readFileSync(path.join(root,file));assert.equal(g.hash(bytes),hash);assert.equal(parse(bytes).failures.length,failures);}
});
test("CLI rejects inherited Node loader authority", () => {
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr305.mjs"),"select"],{env:{...g.commandEnvironment(),NODE_PATH:"synthetic-untrusted-path"},encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(parse(Buffer.from(result.stderr)).code,"PR305_LOADER");
});
