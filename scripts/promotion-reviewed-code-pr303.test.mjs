import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr303.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr303-source-checks.v1",
  "sourceCommit": "012ba0ee454e30a0705e2c206d6b15c6895dc585",
  "sourceTree": "da5db2e4c74bb12fb0e827be00b507b27cb0f0f4",
  "executedAt": "2026-10-28T23:42:11.394Z",
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
      "name": "evidence-fixtures",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "--test-concurrency=1",
        "components/visualizations/visualizationBrowserRegressionEvidence.test.ts",
        "components/visualizations/visualizationBrowserRegressionPackages.test.ts",
        "components/visualizations/visualizationReleaseReadinessEvidence.test.ts",
        "components/visualizations/three/manim/mathSceneV2CatalogDecoupledFixtures.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "6a0b5b0a5c0f6d10a438df8582fc27e3fbbee53ccb1c73003cb0f4e67bdc7c7c",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 58,
        "suites": 0,
        "pass": 58,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "1c8b191a92f016b9ada9ee0e5840df59a53aa3ab886ed3558d5cf5f348096edd"
      }
    },
    {
      "name": "models",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "components/visualizations/configuredVisualizationLabModel.test.ts",
        "components/visualizations/configuredVisualizationLabRegressions.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "3363e5a30356f36a0cad6117665eecf4ffd8ad59b8ba9bc5ef8255a6dc868100",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 35,
        "suites": 0,
        "pass": 35,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "458fc5a793be04f96d6bebcc6648c1df266e4b29b42aeeffa2b7f619de29702a"
      }
    }
  ]
};
const frozenRuntime = {
  "schemaVersion": "pr303-runtime-evidence.v1",
  "sourceCommit": "012ba0ee454e30a0705e2c206d6b15c6895dc585",
  "sourceTree": "da5db2e4c74bb12fb0e827be00b507b27cb0f0f4",
  "recordedAt": "2026-10-29T00:31:11.307Z",
  "environment": "local-clean-production-build-with-offline-fixtures",
  "nodeMajor": 24,
  "build": {
    "sourceCommit": "012ba0ee454e30a0705e2c206d6b15c6895dc585",
    "buildId": "jDmkCyPmSP6Dzpbp_BGQg",
    "distDir": ".tmp/china-lesson-e2e-runtime/outputs/pr275-source-012ba0ee-v1/next-dist",
    "sourceTreeClean": true,
    "sourceTreeStable": true,
    "buildStartedAt": "2026-10-28T23:47:47.367Z",
    "completedAt": "2026-10-28T23:48:59.115Z",
    "attestationPath": ".tmp/china-lesson-e2e-runtime/outputs/pr275-source-012ba0ee-v1/next-dist/mais-build-attestation.json",
    "attestationRawSha256": "bc05dc1721a9921926c6ec19ed9ff716c848cffd8720bda9a1994fd36dfc5be1",
    "artifactDigests": {
      "BUILD_ID": "6c6393e97feae0df485ee1f96622693c3ff4c4acc4d8fd3201ea8242b45cdce3",
      "required-server-files.json": "402994aea24e07b27c9f3ad48c560b82033393dd8639718169c2f95ac8e521a7",
      "server/app-paths-manifest.json": "aac5b9438e0e92000bdf6b369d58f776944774fbfdb07ee95b9861f74c6da381"
    },
    "artifactTree": {
      "algorithm": "sha256",
      "exclusions": [
        "mais-build-attestation.json",
        "cache/**",
        "diagnostics/**",
        "trace",
        "trace-build"
      ],
      "fileCount": 2560,
      "totalBytes": 112187636,
      "root": "95fd4e6111bbb55bfc0519dc722e482ed985cd795063509d469981b3918a6346"
    },
    "artifactDigestsVerifiedAfterRuntime": true
  },
  "browser": {
    "args": [
      "node_modules/@playwright/test/cli.js",
      "test",
      "tests/e2e/hk-coordinate-transform-user-points.spec.ts",
      "--project=desktop-chrome",
      "--workers=1",
      "--retries=0",
      "--reporter=json"
    ],
    "reportPath": ".local/pr275-current-main-20261029/browser-v1.stdout",
    "reportSha256": "6eaa8164b2575256e4e220ea63e48ffaad86f71fe7c520a3554d548f22635cc8",
    "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "executionPath": ".local/pr275-current-main-20261029/browser-execution-v1.json",
    "executionRawSha256": "9cfa73846dee8387551eb1f5d25168d58c36c4c05d2f0d7936af8e54836dea73",
    "playwrightVersion": "1.59.1",
    "startedAt": "2026-10-28T23:47:46.976Z",
    "durationMs": 82922.373,
    "configuration": {
      "testFile": "tests/e2e/hk-coordinate-transform-user-points.spec.ts",
      "project": "desktop-chrome",
      "workers": 1,
      "retries": 0,
      "browserChannel": "",
      "nodeEnvironment": "production",
      "providerProfile": "offline-fixture",
      "port": 3397,
      "runId": "pr275-source-012ba0ee-v1"
    },
    "summary": {
      "passed": 3,
      "failed": 0,
      "skipped": 0,
      "flaky": 0,
      "retries": 0
    },
    "tests": [
      {
        "title": "student-entered points obey Translate and share the triangle's invariant",
        "project": "desktop-chrome",
        "status": "passed",
        "retry": 0,
        "startedAt": "2026-10-28T23:49:01.899Z",
        "durationMs": 2892
      },
      {
        "title": "student-entered points obey Reflect and share the triangle's invariant",
        "project": "desktop-chrome",
        "status": "passed",
        "retry": 0,
        "startedAt": "2026-10-28T23:49:04.906Z",
        "durationMs": 2443
      },
      {
        "title": "student-entered points obey Dilate and share the triangle's invariant",
        "project": "desktop-chrome",
        "status": "passed",
        "retry": 0,
        "startedAt": "2026-10-28T23:49:07.353Z",
        "durationMs": 2490
      }
    ]
  },
  "runtimeRoots": [
    {
      "path": "app",
      "tree": "7fa2d5cda45ab1454479c9e625ee731833416e3c"
    },
    {
      "path": "components",
      "tree": "8f3a97dce52b1df03b750a7ff90cec6c2cca77d6"
    },
    {
      "path": "data",
      "tree": "ad0541819435962777d15ec42e402f0669d72e7f"
    },
    {
      "path": "lib",
      "tree": "2563779315e4d3265c6e35280f0fe2a6fd07fcf1"
    },
    {
      "path": "public",
      "tree": "3a6d7e0dfc9ac58c731746eca622b4fb75791361"
    },
    {
      "path": "tests",
      "tree": "933fcc8c9b18a8c36022929640df004347c89de1"
    },
    {
      "path": "types",
      "tree": "6b13b1323c334db862ef825a1e1553002a1f068b"
    }
  ],
  "dependencies": [
    {
      "path": "middleware.ts",
      "sha256": "58c728f3696109f49d9c406a99b6e83d6319d9a90ca26ca17c7d4ba844e5b689"
    },
    {
      "path": "next-env.d.ts",
      "sha256": "85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6"
    },
    {
      "path": "next.config.ts",
      "sha256": "7c7f4eaa48ec3c9200410dbf69e8efa1db7c49ebe4e872890467660fd9376cdc"
    },
    {
      "path": "package-lock.json",
      "sha256": "58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767"
    },
    {
      "path": "package.json",
      "sha256": "cea2ef7cd6e778a949fce8cf75a1002dc63503793fb12c6545b7f6e0ce26464f"
    },
    {
      "path": "playwright.config.ts",
      "sha256": "d12a066778dffd25abc027203fa38795bdc2c73ab16665664753917cb2eaee2f"
    },
    {
      "path": "scripts/check-stray-generated-types.mjs",
      "sha256": "05ea295b22e470e562b80b5d6dcc0bd2be6a86ad734c99a05af5cc76cda04c76"
    },
    {
      "path": "scripts/cleanup-generated-artifacts.mjs",
      "sha256": "1adf99e24d8188bcb779dfc6bd75d619109bbde010db50127bad5210b83149b8"
    },
    {
      "path": "scripts/next-clean-build.mjs",
      "sha256": "0fef158c03b111a227201a0068bd8bb2c31bd2f4a4579c3fa192e8219f3f73ec"
    },
    {
      "path": "scripts/with-next-env-restore.mjs",
      "sha256": "bf53f3100f2e99433f18d7a618a2a7bd655bad3ba89f81b73544ea37c6177369"
    },
    {
      "path": "tsconfig.json",
      "sha256": "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8"
    },
    {
      "path": "tsconfig.next.json",
      "sha256": "1f39ca3df18b90924fdf68bea41304033b29cf0de5311dccb15b23cd2dee1970"
    }
  ],
  "baseline": {
    "sourceCommit": "012ba0ee454e30a0705e2c206d6b15c6895dc585",
    "sourceTree": "da5db2e4c74bb12fb0e827be00b507b27cb0f0f4",
    "baselineHead": "2f8ba3f05cbff0d76357d72adaba2ca57f650759",
    "baselineTree": "72bb0e0ebb9faaebf893677027ec98f1cf474610",
    "verificationPath": ".local/pr275-current-main-20261029/clean-source-baseline/verification.json",
    "verificationRawSha256": "8b73f9be26955ed83a7715ac14e0d8894bf874b0c1ff3a28540488384a4fb86f",
    "comparisonPath": ".local/pr275-current-main-20261029/clean-source-baseline/comparison.json",
    "comparisonRawSha256": "9288a36846ae7e169f495a665a15a7188355ad0d285312f34c68bf9202e00282",
    "stdoutSha256": "861b455aa46cc2f691cb347aaeb512151532d6b4d31af8a93fa5447bd40b15d5",
    "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "actualExitCode": 1,
    "summary": {
      "tests": 62,
      "suites": 0,
      "pass": 36,
      "fail": 26,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0
    },
    "failureSignature": "7518c34359707c5f8d2f52d3c4175dfd1c4003b2510de0cbe6ba82c638927945",
    "fullOutcomeDigest": "0aefde2279f70823234d83bea62215d88fa60671c1896a97ad506edf379881a7",
    "inputCount": 465,
    "inputDigest": "90898ed150d2d394776d47e27328f5355c3d589136aa1e0410fed384dd840ec7",
    "manimFileCount": 411,
    "all62TitlesAndOutcomesIdentical": true,
    "newFailures": 0,
    "disappearedFailures": 0,
    "changedFailures": 0,
    "accepted": false,
    "startedAt": "2026-10-28T23:42:12.501Z",
    "completedAt": "2026-10-28T23:42:15.949Z"
  },
  "limits": {
    "buildReexecutedInPromotion": false,
    "browserReexecutedInPromotion": false,
    "baselineReexecutedInPromotion": false,
    "syntheticFixturesAreExecutionEvidence": false,
    "broaderManimAccepted": false,
    "liveAllowed": false
  }
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const json = value => JSON.stringify(value, null, 2) + "\n";
function temporaryRepo(run) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr303-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR303 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    run({ temporary, repo });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function fixture(run, options = {}) {
  temporaryRepo(({ temporary, repo }) => {
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.SOURCE_PATHS, ...g.CODE_PATHS, ...g.RUNTIME_DEPENDENCIES.map(e=>e.path), g.DIRECTORY + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.SOURCE);
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR303 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr303-admission.v1", pullRequest: 303, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, runtimeEvidenceRawSha256: g.RUNTIME_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr303-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks)),
      "runtime-evidence.json": Buffer.from(json(frozenRuntime))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR303 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr303-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr303-required-check", scope: g.SCOPE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
        toolingCommit: tooling, toolingTree: admission.toolingTree, toolingInventoryDigest: admission.toolingInventoryDigest,
        checksRawSha256: g.CHECKS_SHA, runtimeEvidenceRawSha256: g.RUNTIME_SHA, reportRawSha256: g.hash(report),
        permissions: g.PERMISSIONS, reviewedAt: new Date().toISOString(), findings: ["Synthetic shape test only; not independent reviewer evidence."] };
      options.review?.(role, review);
      const decision = Buffer.from(json(review)), prefix = g.DIRECTORY + "/" + role.toLowerCase() + "-review";
      write(repo, prefix + ".json", decision); write(repo, prefix + ".md", report);
      admission.reviews[role] = { decisionRawSha256: g.hash(decision), reportRawSha256: g.hash(report) };
    }
    options.admission?.(admission);
    let bytes = json(admission);
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 303, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 303,
      pull_request: { number: 303, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the eleven-file browser-binding source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 11); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.BASE]);
  assert.equal(entries.filter(e => e.before === null).length, 1);
});
test("an extra source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR303_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR303_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR303_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR303_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr303-v1")<g.expectedWorkflow(before).indexOf("pr302-v1/admission"));
});
test("complete synthetic S T E chain accepts exactly PR303 and no deployment permissions", () => fixture(({check,evidence})=>{
  assert.deepEqual(g.IDENTITIES, { A11: "/root/pr286_source_review", A23: "/root/pr300_a23" });
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR303_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR303_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR303_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR303_TOOLING_PATHS/),{extraTooling:["lib/pr303-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR303_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR303_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR303_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR303_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR303_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR303_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR303_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR303_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR303_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR303_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR303_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR303_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR303_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR303_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR303_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR303_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR303_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution retains exact types, evidence-fixture and model commands", () => {
  assert.deepEqual(g.COMMANDS,frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.name),["types","evidence-fixtures","models"]);
  assert.equal(g.COMMANDS[0].summary,null);assert.deepEqual(g.COMMANDS.slice(1).map(c=>c.summary.tests),[58,35]);
  assert.ok(g.COMMANDS.slice(1).every(c=>c.summary.skipped===0));
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR303_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR303_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR303_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR303_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR303_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR303_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR303_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR303_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR303_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR303_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add broad Manim acceptance", () => fixture(({check}) => {
  assert.throws(check, /PR303_SCHEMA/);
}, {admission: a => { a.broaderManimAccepted = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const sourceNames = {
  "evidence-fixtures": [
    "synthetic closure bindings exercise the real matcher without altering historical evidence",
    "synthetic closure inputs keep plan and configuration snapshots independent",
    "MAIS Manim v2 catalog-decoupled fixtures cover every rendered teaching target",
    "MAIS Manim v2 catalog-decoupled fixtures keep A11 projection-view browser representative",
    "MAIS Manim v2 catalog-decoupled fixtures can build the browser regression plan without live catalog input",
    "MAIS Manim v2 catalog-decoupled fixtures belong to the evidence review package",
    "MAIS Manim v2 catalog-decoupled fixtures serialize review manifest attributes",
    "MAIS Manim v2 catalog-decoupled fixtures serialize A11/A18/A22 handoff manifest attributes",
    "explicit bundled Chromium channel remains bound and replays without coercion",
    "historical package IDs cannot certify a different lab collection",
    "browser evidence rejects stale source commit under an unchanged package ID",
    "browser evidence rejects dirty source under an unchanged package ID",
    "browser evidence rejects different lab set under an unchanged package ID",
    "browser evidence rejects missing lab under an unchanged package ID",
    "browser evidence rejects different project under an unchanged package ID",
    "browser evidence rejects different test selector under an unchanged package ID",
    "browser evidence rejects different test file under an unchanged package ID",
    "browser evidence rejects different timeout under an unchanged package ID",
    "browser evidence rejects different retries under an unchanged package ID",
    "browser evidence rejects different workers under an unchanged package ID",
    "browser evidence rejects different browser channel under an unchanged package ID",
    "browser evidence rejects different sweep mode under an unchanged package ID",
    "browser evidence rejects different environment under an unchanged package ID",
    "browser evidence rejects different lab selector under an unchanged package ID",
    "matching records need an independently supplied expected execution",
    "duplicate package records cannot win by array order",
    "an empty plan cannot pass without checking any labs",
    "lab order and selector whitespace do not change the bound experiment set",
    "a partial run collection only certifies matching packages",
    "a sparse unfilled lab list cannot certify an experiment set",
    "a sparse deleted-element lab list cannot certify an experiment set",
    "inherited execution configuration fields cannot bypass comparison",
    "partially inherited recorded configuration is rejected even when inherited values match",
    "validated evidence remains a snapshot when its source inputs are reused",
    "source fields lost during snapshotting cannot contribute to a pass",
    "the same captured source value is validated, returned and replayed",
    "a sparse all-missing package plan cannot produce an aggregate pass",
    "a sparse partly-missing package plan cannot produce an aggregate pass",
    "plan selectors must agree with its advertised lab set",
    "an empty recorded lab set cannot certify the plan",
    "an duplicate recorded lab set cannot certify the plan",
    "an extra recorded lab set cannot certify the plan",
    "malformed imported execution metadata fails closed instead of throwing",
    "branch names cannot stand in for immutable source commits",
    "a failed run with otherwise matching bindings never counts as passing",
    "release-readiness consumes the rejected evidence as incomplete",
    "Visualization Lab browser evidence matrix passes only explicitly bound matching runs",
    "matching P4 evidence uses the recorded run and the exact expected execution",
    "Visualization Lab browser evidence matrix keeps the broad gate red until A11/A22 consume the split contract",
    "Visualization Lab browser evidence matrix carries required A11 root smoke attributes from the plan",
    "Visualization Lab browser regression plan chunks HK demo-safe sweeps",
    "Visualization Lab browser regression plan keeps canonical premium variants live",
    "Visualization Lab browser regression plan covers every HK lab without cross-track mixing",
    "Visualization Lab browser regression plan serializes stable A11 handoff attributes",
    "Visualization Lab browser regression plan publishes root attributes A11 should smoke-check",
    "Visualization release-readiness evidence keeps the Manim slice blocked until A11, A18, and A22 close their gates",
    "Visualization release-readiness evidence exposes the exact A11/A22/A18 follow-up actions",
    "Visualization release-readiness evidence serializes stable data attributes for A11/A22 handoff"
  ],
  "models": [
    "calculus probe reaches both slider ends and its area lower limit stays before the probe",
    "base-ten grade bounds and labels match the reachable place values",
    "reflection fixes every point on its mirror line, at every slider position",
    "dilation fixes its centre and scales both coordinates by the same factor",
    "every coordinate-transform slider position is a distinct state",
    "angle model reaches the angles school geometry is built on",
    "angle model reports complementary and supplementary pairs correctly",
    "place-value model carries hundreds and reaches its topic's range",
    "probability readouts never claim a rounded decimal equals an exact value",
    "trig amplitudes are exact at the precision they are displayed",
    "fraction model keeps the numerator within the whole it draws",
    "measurement ruler exposes visible numeric centimeter labels",
    "number-line lab labels every integer unit from 0 to 18",
    "grade 1 add-subtract number-line lab uses Set, Start, and Step controls",
    "probability lab reports both decimal and percent notation",
    "array-area layout keeps cells below the title badge clearance zone",
    "configured visualization mode buttons produce distinct visible model states",
    "clock-money-data value uses fractional hours instead of raw minute steps",
    "3D labs show the 2D configured surface while the heavy runtime loads",
    "fraction bar shaded overlays are clipped to rounded bar outlines",
    "right-triangle lab fits max geometry, emphasizes squares, and labels square values",
    "configured functions use raw mathematical coordinates and an SVG plot clip instead of false boundary plateaus",
    "configured coordinate transformations project off-grid points to an explicit bounded edge indicator",
    "angle geometry keeps extreme rays inside the panel and combines equal-angle labels",
    "array and statistics summaries avoid graph collisions at reported slider extremes",
    "calculus tick and axis labels occupy gutters outside the plotted marks",
    "mode buttons use distinct active colors for visual emphasis",
    "configured visualization renderer omits introductory metadata panels from lab and lesson embeds",
    "configured visualization lab exposes a footer action slot for lesson embeds",
    "public configured visualization wrapper accepts and forwards an explicit 3D presentation",
    "configured visualization range sliders respond to input and change events",
    "configured Three.js canvas readiness is stable across slider value changes",
    "coordinate-transform vertex labels use collision-aware positions",
    "angle-geometry labels use collision-aware positions at equal high values",
    "early-primary shape names use a collision-free lane below every reachable polygon"
  ]
};
const evidenceNames=sourceNames["evidence-fixtures"];

test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(evidenceNames);
  for (const name of ["evidence-fixtures", "models"]) assert.deepEqual(g.verifyExecution(name, { status: 0, stdout: flatReport(sourceNames[name]) }), g.COMMANDS.find(c=>c.name===name).summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("evidence-fixtures", result), /PR303_COMMAND_FAILED/);
  }
});
test("fresh evidence and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("evidence-fixtures", {status: 0, stdout: flatReport(["replacement"])}), /PR303_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR303_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(evidenceNames)}), /PR303_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[1]) && Object.isFrozen(g.COMMANDS[1].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR303_/);
  }
});
test("the added lifecycle record is part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.find(e=>e.before===null);
  assert.equal(added.path,"coordination/session-logs/2026-10-29-A06-pr275-current-main-01a1824f.md");
  const changed=structuredClone(entries);changed.find(e=>e.before===null).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR303_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e!==added)),/PR303_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr303.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR303_USAGE",liveAllowed:false,result:"blocked"});
  }
});

test("type checking requires empty output and cannot hide an emitted diagnostic", () => {
  assert.equal(g.verifyExecution("types", {status:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}), null);
  for (const result of [{status:0,stdout:Buffer.from("error TS0001")},{status:0,stderr:Buffer.from("diagnostic")}]) {
    assert.throws(()=>g.verifyExecution("types",result),/PR303_TYPE_OUTPUT/);
  }
});
test("runtime record binds the real clean build, three modes and retained failing baseline",()=>{
  g.validateRuntimeEvidence(frozenRuntime);g.validateRuntimeDependencies(root,frozenRuntime,g.SOURCE);
  assert.equal(g.hash(Buffer.from(json(frozenRuntime))),g.RUNTIME_SHA);
  assert.ok(Date.parse(frozenRuntime.browser.startedAt)<Date.parse(frozenRuntime.build.buildStartedAt));
  assert.equal(frozenRuntime.baseline.actualExitCode,1);assert.equal(frozenRuntime.baseline.summary.fail,26);
  assert.ok(Object.values(frozenRuntime.limits).every(v=>v===false));
});
test("runtime browser gaps, retries, false clean flags and widened claims fail closed",()=>{
  for(const mutate of [r=>{r.build.sourceTreeClean=false;},r=>{r.build.sourceTreeStable=false;},r=>{r.build.artifactTree.exclusions.push("server/**");},
    r=>{r.browser.tests.pop();},r=>{r.browser.tests[0].retry=1;},r=>{r.browser.summary.skipped=1;},
    r=>{r.browser.configuration.browserChannel="chrome";},r=>{r.browser.reportSha256="0".repeat(64);},r=>{r.limits.browserReexecutedInPromotion=true;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR303_RUNTIME/);
  }
});
test("baseline failures cannot be erased, accepted or changed behind the same total",()=>{
  for(const mutate of [r=>{r.baseline.actualExitCode=0;},r=>{r.baseline.accepted=true;},r=>{r.baseline.summary.fail=0;},
    r=>{r.baseline.failureSignature="0".repeat(64);},r=>{r.baseline.newFailures=1;},r=>{r.baseline.disappearedFailures=1;},
    r=>{r.baseline.changedFailures=1;},r=>{r.limits.broaderManimAccepted=true;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR303_RUNTIME/);
  }
});
test("runtime directory identity and critical working bytes remain bound to S",()=>fixture(({repo,commit})=>{
  const p=path.join(repo,"next.config.ts"),bytes=readFileSync(p);writeFileSync(p,Buffer.concat([bytes,Buffer.from("\n// synthetic drift\n")]));
  assert.throws(()=>g.validateRuntimeDependencies(repo,frozenRuntime,git(repo,"rev-parse","HEAD")),/PR303_RUNTIME_DEPENDENCY/);writeFileSync(p,bytes);
  write(repo,"app/pr303-runtime-drift.ts","synthetic unreviewed runtime path\n");commit(["app/pr303-runtime-drift.ts"]);
  assert.throws(()=>g.validateRuntimeDependencies(repo,frozenRuntime,git(repo,"rev-parse","HEAD")),/PR303_RUNTIME_DEPENDENCY/);
}));
test("runtime raw evidence and reviewer binding cannot be retargeted",()=>{
  fixture(({check})=>assert.throws(check,/PR303_RUNTIME_EVIDENCE/),{core:(file,bytes)=>file==="runtime-evidence.json"?Buffer.from(json({...parse(bytes),nodeMajor:25})):bytes});
  fixture(({check})=>assert.throws(check,/PR303_SCOPE/),{admission:a=>{a.runtimeEvidenceRawSha256="0".repeat(64);}});
  fixture(({check})=>assert.throws(check,/PR303_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A23")r.runtimeEvidenceRawSha256="0".repeat(64);}});
});
test("runtime recording cannot predate observed results or claim a future time",()=>{
  for(const recordedAt of ["2026-01-01T00:00:00.000Z","2999-01-01T00:00:00.000Z",0,"not-a-date"]){
    assert.throws(()=>g.validateRuntimeEvidence({...structuredClone(frozenRuntime),recordedAt}),/PR303_RUNTIME/);
  }
});
