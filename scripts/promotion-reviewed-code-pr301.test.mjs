import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, linkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as g from "./promotion-reviewed-code-pr301.mjs";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
const frozenChecks = {
  "schemaVersion": "pr301-source-checks.v1",
  "sourceCommit": "5e20119b246f3b4d34d8fbfc079f12cae17affdc",
  "sourceTree": "f2b917b9b696fc85464810412bf8a611e46450e7",
  "executedAt": "2026-10-28T19:14:36.767Z",
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
      "name": "provider-display",
      "args": [
        "--import",
        "tsx",
        "--test",
        "--test-reporter=tap",
        "lib/server/llmProvider.test.ts",
        "lib/server/llmProviderNewlines.test.ts",
        "components/math/mathTextFormatting.test.ts"
      ],
      "exitCode": 0,
      "stdoutSha256": "eea82c5476ca8118d402abda5d36f701dd836fae6ad12eeab3722b9b0980f1bb",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": {
        "tests": 40,
        "suites": 0,
        "pass": 40,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "resultNamesDigest": "dcfe4c282c1681294cd1acfe768c97d88e8bdcd69745a55556d8818d3478919c"
      }
    }
  ]
};
const frozenRuntime = {
  "schemaVersion": "pr301-runtime-evidence.v1",
  "sourceCommit": "5e20119b246f3b4d34d8fbfc079f12cae17affdc",
  "sourceTree": "f2b917b9b696fc85464810412bf8a611e46450e7",
  "recordedAt": "2026-10-28T19:14:11.733Z",
  "environment": "local-production-build-with-mocked-providers",
  "nodeMajor": 24,
  "build": {
    "sourceCommit": "5e20119b246f3b4d34d8fbfc079f12cae17affdc",
    "buildId": "M-lRkZo1mG8k0xmqg5RWi",
    "distDir": ".tmp/china-lesson-e2e-runtime/outputs/pr258-20261029/next-dist-v3",
    "sourceTreeClean": true,
    "sourceTreeStable": true,
    "completedAt": "2026-10-28T18:52:51.186Z",
    "attestationRawSha256": "d2ba45fa5e12df5d0de3e38978bdad5a4592cac0b21be8444df090d8497e542f",
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
      "totalBytes": 104819306,
      "root": "558f6f163d478da769bd9a8021370bc90a3a57d5be190f46206cf093b74ac60e"
    },
    "artifactDigestsVerifiedAfterRuntime": true,
    "stdoutSha256": "b2e721b6212846261d7f46854584fa9888b131f56e52a80e3aea3c14d272f672",
    "stderrSha256": "9ffbae4111cf750a46f15568218d61fa52ac3bce1665773bcc8bcc5d57c8db12"
  },
  "compiledVoice": {
    "args": [
      "--test",
      "--test-reporter=tap",
      "app/api/ai-tutor/voice/voiceBundle.test.mjs"
    ],
    "exitCode": 0,
    "stdoutSha256": "bcbd61a2e1e14047312b882e406c00c2419657f6cf7a646c6903c0fd03fb4e1f",
    "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "summary": {
      "tests": 1,
      "suites": 0,
      "pass": 1,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "1a1bb358e97dcbb18b81a8013475a72805257209048883670c0b743f7b487058"
    }
  },
  "commands": [
    {
      "name": "desktop",
      "reportPath": ".local/pr258-current-main-20261029/desktop-v3.json",
      "reportSha256": "0f7c9532b07329689830b07d8f98f6f73c70b1acde3ba01c7731966c2a3ae51d",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "playwrightVersion": "1.59.1",
      "startedAt": "2026-10-28T18:55:14.980Z",
      "durationMs": 19954.347999999998,
      "summary": {
        "passed": 3,
        "failed": 0,
        "skipped": 0,
        "flaky": 0,
        "retries": 0
      },
      "tests": [
        {
          "title": "compiled Nova voice route sends long realtime frames through external ws",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "Nova Tutor accepts fenced JSON, embedded JSON, malformed reply JSON, and useful plain text provider replies",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "frontend Nova Tutor keeps paragraph breaks and LaTeX in a reply",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        }
      ],
      "args": [
        "node",
        "node_modules/playwright/cli.js",
        "test",
        "tests/e2e/ai-tutor-deepseek.spec.ts",
        "--project=desktop-chrome",
        "--grep",
        "compiled Nova voice route|Nova Tutor accepts fenced JSON|frontend Nova Tutor keeps paragraph breaks",
        "--retries=0",
        "--reporter=json"
      ]
    },
    {
      "name": "mobile",
      "reportPath": ".local/pr258-current-main-20261029/mobile-v3.json",
      "reportSha256": "c812085645c3cc40b08843c8f7aed98a22245260a1792ff8e9eb3ad0565ad73c",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "playwrightVersion": "1.59.1",
      "startedAt": "2026-10-28T18:55:35.273Z",
      "durationMs": 5689.259,
      "summary": {
        "passed": 1,
        "failed": 0,
        "skipped": 0,
        "flaky": 0,
        "retries": 0
      },
      "tests": [
        {
          "title": "frontend Nova Tutor keeps paragraph breaks and LaTeX in a reply",
          "project": "mobile-chrome",
          "status": "passed",
          "retry": 0
        }
      ],
      "args": [
        "node",
        "node_modules/playwright/cli.js",
        "test",
        "tests/e2e/ai-tutor-deepseek.spec.ts",
        "--project=mobile-chrome",
        "--grep",
        "frontend Nova Tutor keeps paragraph breaks",
        "--retries=0",
        "--reporter=json"
      ]
    },
    {
      "name": "backend",
      "reportPath": ".local/pr258-current-main-20261029/backend-v3.json",
      "reportSha256": "ee30ecaf4cd1b37e374114a498df3ca2196dc0c634b17cfbe3f59331ba924a67",
      "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "playwrightVersion": "1.59.1",
      "startedAt": "2026-10-28T18:59:04.003Z",
      "durationMs": 18345.823999999997,
      "summary": {
        "passed": 6,
        "failed": 0,
        "skipped": 0,
        "flaky": 0,
        "retries": 0
      },
      "tests": [
        {
          "title": "demo accounts stay locked to their fixed example curriculum and grade during login",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "demo US student login resolves the seeded account when a stale duplicate username exists",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "teacher self-registration requires the configured invite code",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "auth, student learning APIs, analytics, password reset, and Nova Tutor boundaries",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "Practice Arena adaptive set uses completed lesson outcomes as engine evidence",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        },
        {
          "title": "teacher, classroom, resource, assessment, reports, messaging, and admin APIs",
          "project": "desktop-chrome",
          "status": "passed",
          "retry": 0
        }
      ],
      "args": [
        "npm",
        "run",
        "test:backend",
        "--",
        "--retries=0",
        "--reporter=json"
      ]
    }
  ],
  "screenshots": [
    {
      "project": "desktop-chrome",
      "path": ".tmp/china-lesson-e2e-runtime/outputs/pr258-20261029/desktop-v3-results/ai-tutor-deepseek-frontend-e5133-breaks-and-LaTeX-in-a-reply-desktop-chrome/nova-paragraphs.png",
      "sha256": "dc1d1dfd1cf3d6e571dfc98914bfa4cba472bf997df358ab273be5c62d25ca1d",
      "bytes": 71512,
      "width": 420,
      "height": 720
    },
    {
      "project": "mobile-chrome",
      "path": ".tmp/china-lesson-e2e-runtime/outputs/pr258-20261029/mobile-v3-results/ai-tutor-deepseek-frontend-e5133-breaks-and-LaTeX-in-a-reply-mobile-chrome/nova-paragraphs.png",
      "sha256": "2a114491fc72406116e2d50c72c3f95dfc45b90080ff4c3ea65427eb6f0ab539",
      "bytes": 213541,
      "width": 1015,
      "height": 1933
    }
  ],
  "sourceDependencies": [
    {
      "path": ".github/workflows/ci.yml",
      "sha256": "70d7972e26932f0163aba1544024be5ccbbd5d75d0f87a3a4460eb74bd22c05d"
    },
    {
      "path": "app/api/ai-tutor/resolve/route.ts",
      "sha256": "46afe3e45d8c39fe9fc611904b6ec2c6b1b234026d99816e3647bd227a46a232"
    },
    {
      "path": "app/api/ai-tutor/voice/route.ts",
      "sha256": "535a7108636b14de88d8c4b1c7acb439b835504ba0e46fe7cef5800d445bb31d"
    },
    {
      "path": "app/api/ai-tutor/voice/voiceBundle.test.mjs",
      "sha256": "fa0905535f7cde70302c2bed9cfcf412f14d01aa2fa8f724e8347b93b1926093"
    },
    {
      "path": "app/dashboard/page.tsx",
      "sha256": "3ac1a6366b1f545f24787ac525a181f2a22aa63cde1c383a795e9e71e9898d1f"
    },
    {
      "path": "app/globals.css",
      "sha256": "07ea6a7e0da1bd44fd6ef8563a867ee6bd99b0cd01ffb70769612f2db005e3ed"
    },
    {
      "path": "app/layout.tsx",
      "sha256": "1abf6521e5e2810f4f6dc33b5ed6cfe052f6c10467c2a428fe3bdd39cde1f4b9"
    },
    {
      "path": "components/math/MathText.tsx",
      "sha256": "24e27285ef72b242b887e18ffee861751de4ac03a900913eaf9ad73a5684f7e0"
    },
    {
      "path": "components/math/mathTextFormatting.test.ts",
      "sha256": "b09dd3990d09526e0346c91a24ca0014433b084df31b51305a385843e707d4c0"
    },
    {
      "path": "components/math/mathTextFormatting.ts",
      "sha256": "3429fb35ea655ae1811ce40fca7dc800bb935510b1184621bfa1bdfe4310782a"
    },
    {
      "path": "coordination/session-logs/2026-10-29-A07-pr258-current-main-01a1824f.md",
      "sha256": "bd17c3be740650be084420e57d824f66e3f12a587fe2eae8ca527fa6f290f463"
    },
    {
      "path": "lib/server/llmProvider.ts",
      "sha256": "99d16d6c32a4e7c4fc16bd7bb4cd7c304eb695df1d614ab2c027ef03149171b6"
    },
    {
      "path": "lib/server/llmProviderNewlines.test.ts",
      "sha256": "eabf52ba9a8ce622d550b96faf19e9ad58754da51fb69a057ef329eb7cfbb54f"
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
      "path": "scripts/next-clean-build.mjs",
      "sha256": "0fef158c03b111a227201a0068bd8bb2c31bd2f4a4579c3fa192e8219f3f73ec"
    },
    {
      "path": "tests/e2e/ai-tutor-deepseek.spec.ts",
      "sha256": "6211323051eb3b1db9cec73cbb9c4b49ed00be82a6b8dfd4e1f5510cb09ee1b7"
    },
    {
      "path": "tests/e2e/backend-api.spec.ts",
      "sha256": "15ff9dfddf0a1f5c96b5d01e76665e5f4a791d35a87b3aae30bb2e490327666b"
    },
    {
      "path": "tests/e2e/deepseek-fetch-proxy.cjs",
      "sha256": "bc708895a56107f88596c4d01214df41ec3ea56311b6512094a87a6b4c184cd8"
    },
    {
      "path": "tsconfig.json",
      "sha256": "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8"
    }
  ],
  "limits": {
    "browserReexecutedInCi": false,
    "liveProviderValidated": false,
    "microphoneValidated": false,
    "speakerValidated": false,
    "deploymentPerformed": false
  }
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" };
const git = (cwd, ...args) => execFileSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 }).toString("utf8").trim();
const write = (repo, file, bytes) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), bytes); };
const json = value => JSON.stringify(value, null, 2) + "\n";
function temporaryRepo(run) {
  const temporary = realpathSync(mkdtempSync(path.join(os.tmpdir(), "pr301-contract-")));
  const repo = path.join(temporary, "repo"); mkdirSync(repo);
  try {
    git(repo, "init", "-q", "--initial-branch=fixture");
    git(repo, "config", "user.name", "Synthetic PR301 Fixture"); git(repo, "config", "user.email", "fixture@example.invalid");
    git(repo, "config", "commit.gpgsign", "false"); git(repo, "config", "core.hooksPath", "/dev/null");
    run({ temporary, repo });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function fixture(run, options = {}) {
  temporaryRepo(({ temporary, repo }) => {
    write(repo, ".git/objects/info/alternates", path.join(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"), "objects") + "\n");
    git(repo, "config", "core.sparseCheckout", "true");
    write(repo, ".git/info/sparse-checkout", [...g.SOURCE_PATHS, ...g.RUNTIME_DEPENDENCIES.map(d=>d.path), ...g.CODE_PATHS, g.DIRECTORY + "/"].map(p => "/" + p).join("\n") + "\n");
    git(repo, "checkout", "--detach", "-q", g.SOURCE);
    const commit = files => { git(repo, "add", "--sparse", "--", ...files); git(repo, "commit", "-qm", "Synthetic PR301 test fixture; not an approval"); };
    for (const file of g.CODE_PATHS) write(repo, file, readFileSync(path.join(root, file)));
    options.tooling?.(repo);
    for (const file of options.extraTooling ?? []) write(repo, file, "Unreviewed delta\n");
    commit([...g.CODE_PATHS, ...(options.extraTooling ?? [])]);
    const tooling = git(repo, "rev-parse", "HEAD");
    const admission = { schemaVersion: "pr301-admission.v1", pullRequest: 301, scope: g.SCOPE, baseCommit: g.BASE,
      sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, sourceInventoryDigest: g.SOURCE_INVENTORY,
      toolingCommit: tooling, toolingTree: git(repo, "rev-parse", "HEAD^{tree}"), toolingInventoryDigest: g.digest(g.inventory(repo, g.SOURCE, tooling)),
      checksRawSha256: g.CHECKS_SHA, runtimeEvidenceRawSha256: g.RUNTIME_SHA, reviews: {}, permissions: g.PERMISSIONS };
    const core = {
      "source-inventory.json": Buffer.from(json({ schemaVersion: "pr301-source-inventory.v1", baseCommit: g.BASE,
        sourceCommit: g.SOURCE, sourceTree: g.SOURCE_TREE, inventoryDigest: g.SOURCE_INVENTORY,
        entries: g.inventory(root, g.BASE, g.SOURCE) })),
      "source-checks.json": Buffer.from(json(frozenChecks)),
      "runtime-evidence.json": Buffer.from(json(frozenRuntime))
    };
    for (const [file, bytes] of Object.entries(core)) {
      write(repo, g.DIRECTORY + "/" + file, options.core?.(file, bytes) ?? bytes);
    }
    for (const role of ["A11", "A23"]) {
      const report = Buffer.from("Synthetic PR301 contract fixture. Not an actual review or approval.\n");
      const review = { schemaVersion: "pr301-independent-review.v1", role, reviewerIdentity: g.IDENTITIES[role],
        result: "approved-for-exact-pr301-required-check", scope: g.SCOPE,
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
    if (options.duplicate) bytes = bytes.replace('"schemaVersion":', '"pullRequest": 301, "schemaVersion":');
    write(repo, g.ADMISSION, bytes);
    for (const file of options.extraEvidence ?? []) write(repo, file, "Extra unreviewed evidence\n");
    commit([...g.EVIDENCE_PATHS, ...(options.extraEvidence ?? [])]);
    const evidence = git(repo, "rev-parse", "HEAD"), eventPath = path.join(temporary, "event.json");
    const event = () => ({ repository: { full_name: "HUDongpin/MAIS-MVP" }, number: 301,
      pull_request: { number: 301, base: { ref: "main", sha: g.BASE, repo: { full_name: "HUDongpin/MAIS-MVP" } },
        head: { sha: git(repo, "rev-parse", "HEAD"), repo: { full_name: "HUDongpin/MAIS-MVP" } } } });
    const check = (eventName = "pull_request", value = event()) => { writeFileSync(eventPath, json(value)); return g.preflight({ repoRoot: repo, eventName, eventPath }); };
    run({ repo, temporary, tooling, evidence, event, check, commit, eventPath });
  });
}

test("source is exactly the twelve-file Nova source delta on the current-main base", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.equal(entries.length, 12); assert.equal(g.digest(entries), g.SOURCE_INVENTORY);
  g.validateSourceInventory(entries);
  assert.deepEqual(entries.map(e => e.path), g.SOURCE_PATHS);
  assert.deepEqual(git(root, "show", "-s", "--format=%P", g.SOURCE).split(" "), [g.SOURCE_PARENT]);
  assert.equal(entries.filter(e => e.before === null).length, 4);
});
test("a third source path or source mode/hash drift is rejected", () => {
  const entries = g.inventory(root, g.BASE, g.SOURCE);
  assert.throws(() => g.validateSourceInventory([...entries, { ...entries[0], path: "app/unreviewed.ts" }]), /PR301_SOURCE/);
  const changed = structuredClone(entries); changed[0].after.mode = "100755";
  assert.throws(() => g.validateSourceInventory(changed), /PR301_SOURCE/);
  assert.throws(() => g.validateSourceInventory([...entries].reverse()), /PR301_SOURCE/);
});
test("workflow is exactly the three deterministic insertions with old actions and steps retained", () => {
  const before = execFileSync("git",["show",g.SOURCE+":.github/workflows/promotion-shadow.yml"],{cwd:root}).toString();
  assert.equal(readFileSync(path.join(root,".github/workflows/promotion-shadow.yml"),"utf8"),g.expectedWorkflow(before));
  assert.throws(()=>g.expectedWorkflow("unknown workflow"),/PR301_WORKFLOW/);
  assert.ok(g.expectedWorkflow(before).indexOf("pr301-v1")<g.expectedWorkflow(before).indexOf("pr300-v2/admission"));
});
test("complete synthetic S T E chain accepts exactly PR301 and no deployment permissions", () => fixture(({check,evidence})=>{
  const result=check();assert.equal(result.evidenceCommit,evidence);assert.ok(Object.values(result.admission.permissions).every(v=>v===false));
}));
test("wrong PR repository fork ref base and head fail closed", () => fixture(({check,event})=>{
  for(const mutate of [e=>{e.number=296;},e=>{e.pull_request.number=299;},e=>{e.repository.full_name="other/repo";},
    e=>{e.pull_request.head.repo.full_name="other/repo";},e=>{e.pull_request.base.repo.full_name="other/repo";},
    e=>{e.pull_request.base.ref="dev";},e=>{e.pull_request.base.sha=g.SOURCE;},e=>{e.pull_request.head.sha=g.SOURCE;}]){
    const e=event();mutate(e);assert.throws(()=>check("pull_request",e),/PR301_EVENT/);
  }
}));
test("only ordered B E parents and equal E tree admit the main merge", () => fixture(({repo,evidence,check})=>{
  const merge=git(repo,"commit-tree",evidence+"^{tree}","-p",g.BASE,"-p",evidence,"-m","Synthetic merge");
  git(repo,"checkout","--detach","-q",merge);
  const event={repository:{full_name:"HUDongpin/MAIS-MVP"},ref:"refs/heads/main",before:g.BASE,after:merge};
  assert.equal(check("push",event).head,merge);
  for(const parents of [[evidence,g.BASE],[g.BASE],[evidence]]){
    const next=git(repo,"commit-tree",evidence+"^{tree}",...parents.flatMap(p=>["-p",p]),"-m","Invalid composition");
    git(repo,"checkout","--detach","-q",next);assert.throws(()=>check("push",{...event,after:next}),/PR301_(EVENT|EVIDENCE)/);
  }
}));
test("same-tree empty descendants cannot reuse E", () => fixture(({repo,check})=>{
  git(repo,"commit","--allow-empty","-qm","Unreviewed descendant");assert.throws(check,/PR301_EVENT_PR/);
}));
test("extra tooling runtime path is rejected even with recomputed inventory", () => fixture(({check})=>assert.throws(check,/PR301_TOOLING_PATHS/),{extraTooling:["lib/pr301-extra.ts"]}));
test("old checker edits are not admitted as tooling", () => fixture(({check})=>assert.throws(check,/PR301_TOOLING_PATHS/),{extraTooling:["scripts/promotion-reviewed-code-pr295.mjs"]}));
test("workflow weakening fails deterministic reconstruction", () => fixture(({check})=>assert.throws(check,/PR301_WORKFLOW/),{
  tooling:repo=>{const p=path.join(repo,".github/workflows/promotion-shadow.yml");writeFileSync(p,readFileSync(p,"utf8").replace("    runs-on: ubuntu-latest","    continue-on-error: true\n    runs-on: ubuntu-latest"));}
}));
test("extra evidence path fails exact E partition", () => fixture(({check})=>assert.throws(check,/PR301_EVIDENCE_PATHS/),{extraEvidence:[g.DIRECTORY+"/extra.json"]}));
test("source retargeting and unsupported live claims change the frozen execution bytes", () => fixture(({check})=>assert.throws(check,/PR301_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="source-checks.json"?Buffer.from(json({...parse(bytes),liveProbePerformed:true,sourceCommit:g.BASE})):bytes
}));
test("changed commands cannot be hidden by recomputing admission hashes", () => fixture(({check})=>assert.throws(check,/PR301_SCOPE/),{admission:a=>{a.checksRawSha256="0".repeat(64);}}));
test("wrong independent identity is rejected despite internally consistent review hashes", () => fixture(({check})=>assert.throws(check,/PR301_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A23")r.reviewerIdentity=g.IDENTITIES.A11;}}));
test("reviewers cannot upgrade the bounded decision to whole-pack admission", () => fixture(({check})=>assert.throws(check,/PR301_REVIEW_DECISION/),{review:(role,r)=>{if(role==="A11")r.result="approved-for-whole-pack";}}));
test("stale tooling binding and future review time fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR301_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.toolingCommit=g.SOURCE;}});
  fixture(({repo,check})=>{
    assert.throws(check,/PR301_REVIEW_FACTS/);
    const a=parse(readFileSync(path.join(repo,g.ADMISSION))),r=parse(readFileSync(path.join(repo,g.DIRECTORY,"a11-review.json"))),report=readFileSync(path.join(repo,g.DIRECTORY,"a11-review.md"));
    for(const reviewedAt of [0,["2026-10-26"],"2026-10-26","2026-02-30T00:00:00.000Z","not-a-date"])assert.throws(()=>g.validateReview({...r,reviewedAt},"A11",a,report),/PR301_REVIEW_FACTS/);
    g.validateReview({...r,reviewedAt:"2026-10-26T00:00:00.000Z"},"A11",a,report);
  },{review:(role,r)=>{if(role==="A11")r.reviewedAt="2999-01-01T00:00:00.000Z";}});
});
test("permission widening and unknown admission keys fail closed", () => {
  fixture(({check})=>assert.throws(check,/PR301_PERMISSION/),{admission:a=>{a.permissions={...a.permissions,deployAllowed:true};}});
  fixture(({check})=>assert.throws(check,/PR301_SCHEMA/),{admission:a=>{a.allowDescendants=true;}});
});
test("duplicate JSON authority is rejected", () => fixture(({check})=>assert.throws(check,error=>error.code==="PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"),{duplicate:true}));
test("dirty source and symlink or hardlink evidence fail closed", () => fixture(({repo,temporary,check})=>{
  write(repo,"extra-untracked.txt","x");assert.throws(check,/PR301_DIRTY/);rmSync(path.join(repo,"extra-untracked.txt"));
  const p=path.join(repo,g.ADMISSION),bytes=readFileSync(p),outside=path.join(temporary,"admission.json");writeFileSync(outside,bytes);
  rmSync(p);symlinkSync(outside,p);assert.throws(check,/PR301_(DIRTY|FILE)/);rmSync(p);linkSync(outside,p);assert.throws(check,/PR301_FILE/);
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
  for(const value of [nested.replace("    1..1","    1..2"),nested.slice(0,nested.indexOf("# tests")),nested+"# tests 2\n",nested+"ok 2 - hidden\n",nested.replace("ok 1 - child","ok 2 - child"),nested.replace("# Subtest: child","# Subtest: false")])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR301_TEST/);
});
test("TAP rejects failure skipped zero tests TODO and malformed UTF8",()=>{
  for(const value of [nested.replace("ok 1 - child","not ok 1 - child"),nested.replace("ok 1 - child","ok 1 - child # SKIP"),nested.replace("ok 1 - child","ok 1 - child # TODO"),"TAP version 13\n1..0\n# tests 0\n",nested+"Bail out!\n"])assert.throws(()=>g.testSummary(Buffer.from(value)),/PR301_TEST/);
  assert.throws(()=>g.testSummary(Buffer.from([0xff])));
});
test("source execution reruns strict types and exact provider/display cases", () => {
  assert.deepEqual(g.COMMANDS, frozenChecks.commands.map(({name,args,summary})=>({name,args,summary})));
  assert.deepEqual(g.COMMANDS.map(c=>c.summary?.tests ?? null), [null, 40]);
  assert.ok(g.COMMANDS.every(c=>c.summary===null || c.summary.skipped===0));
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
    writeFileSync(path.join(output, "old.json"), "{}"); assert.throws(() => g.assertArtifactRoot(output, repo), /PR301_ARTIFACT/);
    rmSync(path.join(output, "old.json"));
    const publicOutput = path.join(temporary, "public-proof"); mkdirSync(publicOutput); chmodSync(publicOutput, 0o755); assert.throws(() => g.assertArtifactRoot(publicOutput, repo), /PR301_ARTIFACT/);
    const alias = path.join(temporary, "alias"); symlinkSync(output, alias); assert.throws(() => g.assertArtifactRoot(alias, repo), /PR301_ARTIFACT/);
    const inside = path.join(repo, "proof"); mkdirSync(inside, { mode: 0o700 }); assert.throws(() => g.assertArtifactRoot(inside, repo), /PR301_ARTIFACT/);
    const outside = path.dirname(temporary); assert.throws(() => g.assertArtifactRoot(outside, repo), /PR301_ARTIFACT/);
  } finally { if (before === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = before; }
}));
test("reviews cannot predate the tooling commit", () => fixture(({ check }) => {
  assert.throws(check, /PR301_REVIEW_TIME/);
}, { review: (role, review) => { if (role === "A11") review.reviewedAt = "2026-10-26T00:00:00.000Z"; } }));
test("grafts replace refs and shallow histories fail closed", () => {
  fixture(({repo,check}) => { write(repo, ".git/info/grafts", "synthetic\n"); assert.throws(check, /PR301_GRAFT/); });
  fixture(({repo,check}) => { git(repo,"update-ref","refs/replace/"+g.SOURCE,g.BASE); assert.throws(check, /PR301_REPLACE/); });
  fixture(({repo,check}) => { write(repo,".git/shallow",g.SOURCE+"\n"); assert.throws(check, /PR301_SHALLOW/); });
});
test("reintroduced admission markers cannot become a fresh approval", () => fixture(({repo,check,commit}) => {
  const admission = readFileSync(path.join(repo,g.ADMISSION));
  git(repo,"rm","--",g.ADMISSION); git(repo,"commit","-qm","Synthetic marker deletion; not an approval");
  write(repo,g.ADMISSION,admission); commit([g.ADMISSION]);
  assert.throws(check,/PR301_EVIDENCE_HISTORY/);
}));
test("offline evidence cannot add a live-voice acceptance claim", () => fixture(({check}) => {
  assert.throws(check, /PR301_SCHEMA/);
}, {admission: a => { a.liveVoiceProven = true; }}));

function flatReport(names) {
  return Buffer.from("TAP version 13\n" + names.map((name, i) => `# Subtest: ${name}\nok ${i + 1} - ${name}\n  ---\n  duration_ms: 1.0\n  type: 'test'\n  ...\n`).join("") + `1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1.0\n`);
}
const providerNames = [
  "math display normalization preserves paragraph breaks",
  "MathText renders paragraphs alongside LaTeX without errors",
  "text provider config accepts legacy production LLM aliases",
  "Qwen text fallback config uses shared DashScope credentials without exposing DeepSeek state",
  "Qwen API keys drop wrapping quotes and a Bearer prefix without logging the secret",
  "Nova Tutor defaults text and image turns to Qwen3.8 Max",
  "Qwen-specific config keeps provider identity on official workspace endpoints",
  "Nova text default is isolated from the shared Qwen image model",
  "Nova image model is isolated from other Qwen vision consumers",
  "provider circuit breaker skips an open primary and selects the fallback",
  "text provider config prefers DEEPSEEK variables over legacy LLM aliases",
  "DeepSeek request body uses the V4 Pro chat-completion contract",
  "DeepSeek JSON mode can disable thinking for short structured reranks",
  "Qwen request body uses DashScope chat-completion limits",
  "Qwen request body can disable thinking for latency-bound Nova Tutor calls",
  "Nova disables Qwen thinking for every Nova Qwen text model",
  "provider timeout keeps AI Tutor below the serverless hard timeout edge",
  "AI Tutor text provider timeout preserves the Qwen-only deadline cap",
  "DeepSeek resolved-IP transport preserves HTTPS server name and host metadata",
  "provider completion budget stays aligned with concise tutor replies",
  "Nova edge deadline keeps most of the live budget instead of starving the provider",
  "provider reply extraction accepts string and array content",
  "provider usage extraction tolerates missing fields without inventing values",
  "deepinfra api url resolves to the deepinfra provider",
  "text candidates stay qwen-first until deepinfra is preferred",
  "deepinfra preference makes it primary when its key is configured",
  "keyless deepinfra preference falls back to the configured qwen primary",
  "image provider config prefers deepinfra vision when configured and preferred",
  "deepinfra request body uses openai-compatible max_tokens without thinking fields",
  "DashScope regional URL expansion keeps Beijing, Singapore, and US hosts",
  "DashScope HTTP 401 failovers to the next regional host and remembers the working region",
  "DashScope HTTP 401 on every regional host stays a 401 without looping",
  "non-DashScope Qwen 401 and DashScope 503 do not hop regions",
  "Nova converts literal provider line breaks without changing LaTeX commands",
  "Nova decodes escaped newlines before lowercase prose and preserves paragraph breaks",
  "Nova preserves complete mathematical regions including custom and uppercase commands",
  "Nova preserves recognized bare math commands without hiding ordinary text behind a lowercase exclusion",
  "Nova leaves explicit code spans and escaped backslashes intact",
  "Nova protects complete code delimiter runs and fence types before decoding following prose",
  "Nova preserves explicit fenced code through the end when a closing fence is absent"
];
test("a failed child cannot be accepted merely because it printed a passing report", () => {
  const stdout = flatReport(providerNames);
  assert.deepEqual(g.verifyExecution("provider-display", { status: 0, stdout }), g.COMMANDS[1].summary);
  for (const result of [{status: 1, stdout}, {status: null, signal: "SIGTERM", stdout}, {status: 0, error: new Error("synthetic"), stdout}]) {
    assert.throws(() => g.verifyExecution("provider-display", result), /PR301_COMMAND_FAILED/);
  }
});
test("fresh provider/display and checker reports must retain their exact count and names", () => {
  assert.throws(() => g.verifyExecution("provider-display", {status: 0, stdout: flatReport(["replacement"])}), /PR301_TEST_COUNT_OR_NAMES/);
  assert.throws(() => g.verifyExecution("gate-contract", {status: 0, stdout: flatReport(["replacement"])}), /PR301_CONTRACT_COUNT/);
  assert.throws(() => g.verifyExecution("unregistered", {status: 0, stdout: flatReport(providerNames)}), /PR301_COMMANDS/);
  assert.ok(Object.isFrozen(g.COMMANDS[0]) && Object.isFrozen(g.COMMANDS[0].args) && Object.isFrozen(g.COMMANDS[1].summary));
});


test("source check schema rejects future time, command drift, failures and unknown claims", () => {
  g.validateSourceChecks(frozenChecks);
  for (const mutate of [c=>{c.executedAt="2999-01-01T00:00:00.000Z";},c=>{c.executedAt=0;},
    c=>{c.commands[0].args.push("--test-only");},c=>{c.commands[1].summary.tests=1;},
    c=>{c.commands[0].exitCode=1;},c=>{c.commands[0].stdoutSha256="bad";},c=>{c.liveProbePerformed=true;}]) {
    const c=structuredClone(frozenChecks);mutate(c);assert.throws(()=>g.validateSourceChecks(c),/PR301_/);
  }
});
test("the added lifecycle record is part of the exact frozen source inventory", () => {
  const entries=g.inventory(root,g.BASE,g.SOURCE),added=entries.find(e=>e.path==="coordination/session-logs/2026-10-29-A07-pr258-current-main-01a1824f.md");
  assert.equal(added.path,"coordination/session-logs/2026-10-29-A07-pr258-current-main-01a1824f.md");
  const changed=structuredClone(entries);changed.find(e=>e.path===added.path).after.rawSha256="0".repeat(64);
  assert.throws(()=>g.validateSourceInventory(changed),/PR301_SOURCE_INVENTORY/);
  assert.throws(()=>g.validateSourceInventory(entries.filter(e=>e!==added)),/PR301_SOURCE_PATHS/);
});
test("CLI rejects missing and duplicate arguments before attempting authority checks", () => {
  for(const args of [["select"],["select","--repo",root,"--repo",root],["check","--unknown","x"]]) {
    const r=spawnSync(process.execPath,[path.join(root,"scripts/promotion-reviewed-code-pr301.mjs"),...args],{env:g.commandEnvironment(),encoding:"utf8"});
    assert.equal(r.status,2);assert.deepEqual(parse(Buffer.from(r.stderr)),{code:"PR301_USAGE",liveAllowed:false,result:"blocked"});
  }
});


test("frozen clean-source local runtime evidence has complete desktop mobile and backend coverage",()=>{
  g.validateRuntimeEvidence(frozenRuntime);
  assert.deepEqual(frozenRuntime.commands.map(c=>c.summary.passed),[3,1,6]);
  assert.equal(frozenRuntime.compiledVoice.summary.tests,1);
  assert.equal(frozenRuntime.screenshots.length,2);
});
test("runtime evidence rejects stale sources dirty builds and upgraded live claims",()=>{
  for(const mutate of [r=>{r.sourceCommit=g.BASE;},r=>{r.build.sourceTreeClean=false;},r=>{r.build.sourceTreeStable=false;},
    r=>{r.limits.liveProviderValidated=true;},r=>{r.limits.browserReexecutedInCi=true;},r=>{r.build.artifactTree.fileCount=0;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR301_RUNTIME/);
  }
});
test("runtime command gaps skips retries and altered screenshot or dependency bindings fail closed",()=>{
  for(const mutate of [r=>{r.commands.pop();},r=>{r.commands[0].summary.skipped=1;},r=>{r.commands[1].tests[0].retry=1;},
    r=>{r.commands[0].args.push("--update-snapshots");},r=>{r.screenshots[0].sha256="0".repeat(64);},r=>{r.sourceDependencies[0].path="../outside";}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR301_RUNTIME/);
  }
});
test("modified runtime bytes cannot reuse the frozen admission",()=>fixture(({check})=>assert.throws(check,/PR301_EXECUTION_EVIDENCE/),{
  core:(file,bytes)=>file==="runtime-evidence.json"?Buffer.from(json({...parse(bytes),environment:"production-live"})):bytes
}));
test("recomputed runtime authority and mismatched review runtime binding are rejected",()=>{
  fixture(({check})=>assert.throws(check,/PR301_SCOPE/),{admission:a=>{a.runtimeEvidenceRawSha256="0".repeat(64);}});
  fixture(({check})=>assert.throws(check,/PR301_REVIEW_BINDING/),{review:(role,r)=>{if(role==="A11")r.runtimeEvidenceRawSha256="0".repeat(64);}});
});
test("type output and runtime execution chronology cannot be weakened",()=>{
  assert.equal(g.verifyExecution("types",{status:0,stdout:Buffer.alloc(0)}),null);
  assert.throws(()=>g.verifyExecution("types",{status:0,stdout:Buffer.from("unexpected")}),/PR301_TYPE_OUTPUT/);
  for(const mutate of [r=>{r.recordedAt="2999-01-01T00:00:00.000Z";},r=>{r.commands[0].startedAt="2020-01-01T00:00:00.000Z";},r=>{r.commands[0].durationMs=-1;}]){
    const r=structuredClone(frozenRuntime);mutate(r);assert.throws(()=>g.validateRuntimeEvidence(r),/PR301_RUNTIME/);
  }
});
