import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const gatePath = fileURLToPath(new URL("./promotion-reviewed-code-pr307.mjs", import.meta.url));
const g = existsSync(gatePath) ? await import("./promotion-reviewed-code-pr307.mjs") : {};
import YAML from "yaml";
test("the PR307 exact admission checker exposes preflight", () => assert.equal(typeof g.preflight, "function"));
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr307-source-checks.v1",
  "sourceCommit": "462cf236fc599d332deb77c62bb9bb45b5f65465",
  "sourceTree": "464ba82371c91a37de03d819e03adc4b8ce389d9",
  "executedAt": "2026-11-02T02:29:29.896Z",
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
      "stdoutSha256": "9397f308325acd1c7b4f20d927e186ed72279a430e32259030746a9fe722bd2a",
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
      "stdoutSha256": "6e917cd85a9ae00c39d933bc628ca90ac86f3df1e2c86f77ac69da2ce9de948c",
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
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr307-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR307 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
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
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR307 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr307-admission.v1", pullRequest: 307, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr307-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR307 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr307-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr307-required-check", scope: g.SCOPE,
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
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 307, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 307,
      pull_request: { number: 307, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the seventeen-file hourly scheduling source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 17); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.BASE]);
  assert.equal(entries.filter(e => e.before === null).length, 1);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR307_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR307_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR307_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR307_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr307-v1")<g.expectedWorkflow(before).indexOf("reviewed-code/pr306-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR307 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.deepEqual(g.IDENTITIES, { A11: "/root/low_frequency_release", A23: "/root/content_release_review" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR307_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR307_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR307_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR307_TOOLING_PATHS/),{extraTooling:["lib/pr307-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR307_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR307_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR307_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR307_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR307_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR307_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR307_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR307_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR307_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR307_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR307_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR307_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR307_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR307_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR307_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR307_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR307_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, hourly and historical activation commands", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name), ["types", "hourly-regressions", "historical-activation"]);
  assert.equal(g.COMMANDS[0].summary, null);
  assert.deepEqual(g.COMMANDS.filter(c=>c.summary?.tests).map(c=>c.summary.tests), [98,17]);
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR307_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR307_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR307_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR307_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR307_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR307_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR307_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR307_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR307_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR307_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add a native Shadow acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR307_SCHEMA/);
}, {admission: a => { a.historicalPromotionRevalidated = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
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
    assert.throws(() => g.verifyExecution("hourly-regressions", result), /PR307_COMMAND_FAILED/);
  }
});
test("fresh hourly and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("hourly-regressions", {status: 0, stdout: flatReport(["replacement"])}), /PR307_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR307_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(hourlyNames)}), /PR307_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR307_/);
  }
});
test("the one added session log is part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.filter(e=>e.before===null);
  assert.deepEqual(added.map(e=>e.path),["coordination/session-logs/2026-11-02-A22-teacher-notice-hourly-01a19836.md"]);
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR307_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e.before!==null)),/PR307_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr307.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR307_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR307_TYPE_OUTPUT/);
  }
});

test("PR307 selection precedes the frozen PR306 contract and sanitizes both Node entries", () => {
  const workflow=readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8");
  assert.ok(workflow.indexOf(g.ADMISSION)<workflow.indexOf("reviewed-code/pr306-v1/admission.json"));
  assert.equal((workflow.match(/env -u NODE_OPTIONS -u NODE_PATH node scripts\/promotion-reviewed-code-pr307.mjs/g)??[]).length,2);
  assert.ok(workflow.includes("[[ -e "+g.ADMISSION+" || -L "+g.ADMISSION+" ]]"));
});
test("a present invalid PR307 marker fails without falling back to PR306", () => fixture(({repo,event,eventPath})=>{
  writeFileSync(eventPath,json(event()));
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr307.mjs"),"select","--repo",repo,"--event-name","pull_request","--event-path",eventPath],{env:g.commandEnvironment(),encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(result.stdout,"");
  assert.equal(parse(Buffer.from(result.stderr)).code,"PR307_SCHEMA");
},{admission:a=>{a.unreviewed=true;}}));
test("original PR306 checker, reports, receipts and activation evidence cannot enter tooling", () => {
  for(const file of [
    "scripts/promotion-reviewed-code-pr306.mjs",
    "coordination/integration/reviewed-code/pr306-v1/admission.json",
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
    "coordination/reports/2026-08-09-math-diagram-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/canonical-receipt.json",
    "coordination/integration/ca-textbook-successor/activation/ca-textbook-003/a11.json",
    "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/manifest.json"
  ])fixture(({check})=>assert.throws(check,/PR307_TOOLING_PATHS/),{extraTooling:[file]});
});
test("the inherited native evidence and three historical inventory reports are byte-frozen", () => {
  const files=["scripts/promotion-reviewed-code-pr306.mjs","scripts/promotion-reviewed-code-pr306.test.mjs","coordination/integration/reviewed-code/pr306-v1","scripts/promotion-reviewed-code-pr305.mjs","scripts/promotion-reviewed-code-pr305.test.mjs","coordination/integration/reviewed-code/pr305-v1","scripts/promotion-required-check-ca-textbook-successor.mjs","coordination/integration/ca-textbook-successor","coordination/reports/2026-08-09-math-diagram-inventory.json"];
  assert.equal(git(root,"diff","--name-only",g.BASE,g.SOURCE,"--",...files),"");
  for(const [file,hash,failures] of [
    ["coordination/reports/2026-08-09-math-diagram-inventory.json","5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc",0],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json","a7b6dfe9c4c13544a196c6887b9054339886ed3a5b992652765156486d430134",8],
    ["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json","8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805",10]
  ]){const bytes=readFileSync(path.join(root,file));assert.equal(g.hash(bytes),hash);assert.equal(parse(bytes).failures.length,failures);}
});
test("CLI rejects inherited Node loader authority", () => {
  const result=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr307.mjs"),"select"],{env:{...g.commandEnvironment(),NODE_PATH:"synthetic-untrusted-path"},encoding:"utf8"});
  assert.equal(result.status,2);assert.equal(parse(Buffer.from(result.stderr)).code,"PR307_LOADER");
});


test("CI pins only the two Playwright browser jobs to the supported Ubuntu image", () => {
  const beforeText = execFileSync("git", ["show", g.SOURCE + ":.github/workflows/ci.yml"], {cwd: root}).toString();
  const afterText = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.equal(afterText, g.expectedCiWorkflow(beforeText));
  const before = YAML.parse(beforeText), after = YAML.parse(afterText);
  assert.deepEqual(Object.keys(after.jobs), Object.keys(before.jobs));
  for (const [name, job] of Object.entries(after.jobs)) {
    const expected = structuredClone(before.jobs[name]);
    if (["teacher-parent-e2e", "visualization-browser"].includes(name)) expected["runs-on"] = "ubuntu-24.04";
    assert.deepEqual(job, expected, name);
  }
  assert.deepEqual({...after, jobs: undefined}, {...before, jobs: undefined});
  assert.throws(() => g.expectedCiWorkflow("unknown workflow"), /PR307_CI_WORKFLOW/);
  assert.throws(() => g.expectedCiWorkflow(beforeText.replace("  teacher-parent-e2e:", "  changed-job:")), /PR307_CI_WORKFLOW/);
});

test("extra CI weakening cannot enter the bounded runner compatibility repair", () => fixture(({check}) => {
  assert.throws(check, /PR307_CI_WORKFLOW/);
}, {tooling: repo => {
  const file = path.join(repo, ".github/workflows/ci.yml");
  writeFileSync(file, readFileSync(file, "utf8").replace("runs-on: ubuntu-latest", "runs-on: ubuntu-22.04"));
}}));

test("browser jobs use the OS supported by installed Playwright before dependency installation", () => {
  const workflow = YAML.parse(readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8"));
  assert.equal(workflow.jobs["visualization-browser"]["runs-on"], "ubuntu-24.04");
  assert.equal(workflow.jobs["teacher-parent-e2e"]["runs-on"], "ubuntu-24.04");
});
