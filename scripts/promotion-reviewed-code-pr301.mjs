#!/usr/bin/env node
// Exact PR301 Nova source, local runtime evidence and independent admission.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "638d6e7e0a16f1693a6a1afca72bb43ef9debbac";
export const SOURCE = "5e20119b246f3b4d34d8fbfc079f12cae17affdc";
export const SOURCE_PARENT = "324355a3c6245f24fbee1f7d3a28b9e2595c1790";
export const SOURCE_TREE = "f2b917b9b696fc85464810412bf8a611e46450e7";
export const SOURCE_INVENTORY = "ac767603f4afb4ac1767ddc84317a11abf1125945ca95775d2b9c02c86cd526e";
export const CHECKS_SHA = "c51a01272d74dd9958ee33ea78590732380e348078411377c3ce03a0828f6a23";
export const RUNTIME_SHA = "a16f7217aa8598c57e3ba4d35c7e9a63f331dae8ec0f56e32ca4eb2794c9d859";
export const PULL_REQUEST = 301;
export const DIRECTORY = "coordination/integration/reviewed-code/pr301-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze([".github/workflows/ci.yml", "app/api/ai-tutor/resolve/route.ts", "app/api/ai-tutor/voice/route.ts", "app/api/ai-tutor/voice/voiceBundle.test.mjs", "app/dashboard/page.tsx", "components/math/mathTextFormatting.test.ts", "components/math/mathTextFormatting.ts", "coordination/session-logs/2026-10-29-A07-pr258-current-main-01a1824f.md", "lib/server/llmProvider.ts", "lib/server/llmProviderNewlines.test.ts", "next.config.ts", "tests/e2e/ai-tutor-deepseek.spec.ts"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr301.mjs","scripts/promotion-reviewed-code-pr301.test.mjs","docs/pr301-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json","runtime-evidence.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/pr286_source_review", A23:"/root/pr300_a23" });
export const SCOPE = "exact-pr301-nova-voice-formatting-required-check-only";
export const COMMANDS = Object.freeze([
  {
    "name": "types",
    "args": [
      "--max-old-space-size=6144",
      "node_modules/typescript/bin/tsc",
      "--noEmit",
      "--incremental",
      "false"
    ],
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
].map(c => Object.freeze({ ...c, args: Object.freeze(c.args), summary: c.summary === null ? null : Object.freeze(c.summary) })));
export const CONTRACT_TEST_COUNT = 41;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR301_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR301_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR301_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR301_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
}
function git(root, ...args) {
  return execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks",
    "--git-dir=" + gitDirectory(root), "--work-tree=" + root, "-c", "core.worktree=" + root, "-c", "core.fsmonitor=false", ...args],
  { cwd: root, env: GIT_ENV, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024, timeout: 30000 });
}
const line = (root, ...args) => git(root, ...args).toString("utf8").trim();
const changed = (root, a, b) => git(root, "diff", "--name-only", "--no-renames", "-z", a, b).toString("utf8").split("\0").filter(Boolean).sort();
const parents = (root, ref) => line(root, "show", "-s", "--format=%P", ref).split(" ");
const tree = (root, ref) => line(root, "rev-parse", ref + "^{tree}");
function regular(root, file) {
  const absolute = path.join(root, file), stat = lstatSync(absolute);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR301_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR301_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR301_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR301_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR301_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR301_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr300-v2/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr301.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr300-v2/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr300-v2"';
  const stepAnchor = "      - name: Verify exact PR300 v2 classroom safety admission\n";
  const steps = [
    "      - name: Verify exact PR301 Nova admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr301' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr301"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr301.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR301 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr301' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr301",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr301",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR301_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr301" && "$mode" != "reviewed-code-pr300-v2"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR301_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR301_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR301_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR301_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR301_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR301_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR301_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr301-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR301_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR301_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR301_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR301_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR301_COMMANDS");
}

export const RUNTIME_REPORTS = Object.freeze([
  {
    "name": "desktop",
    "reportPath": ".local/pr258-current-main-20261029/desktop-v3.json",
    "reportSha256": "0f7c9532b07329689830b07d8f98f6f73c70b1acde3ba01c7731966c2a3ae51d",
    "stderrSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "playwrightVersion": "1.59.1",
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
]);
export const RUNTIME_DEPENDENCIES = Object.freeze([
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
]);
export const RUNTIME_SCREENSHOTS = Object.freeze([
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
]);
export const RUNTIME_COMPILED_VOICE = Object.freeze({
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
});
export const RUNTIME_LIMITS = Object.freeze({
  "browserReexecutedInCi": false,
  "liveProviderValidated": false,
  "microphoneValidated": false,
  "speakerValidated": false,
  "deploymentPerformed": false
});

export function validateRuntimeEvidence(r) {
  keys(r,["schemaVersion","sourceCommit","sourceTree","recordedAt","environment","nodeMajor","build","compiledVoice","commands","screenshots","sourceDependencies","limits"],"PR301_RUNTIME_SCHEMA");
  need(r.schemaVersion==="pr301-runtime-evidence.v1" && r.sourceCommit===SOURCE && r.sourceTree===SOURCE_TREE && r.nodeMajor===24 &&
    r.environment==="local-production-build-with-mocked-providers" && canonicalTime(r.recordedAt),"PR301_RUNTIME_SOURCE");
  same(r.limits,RUNTIME_LIMITS,"PR301_RUNTIME_LIMITS");
  keys(r.build,["sourceCommit","buildId","distDir","sourceTreeClean","sourceTreeStable","completedAt","attestationRawSha256","artifactTree","artifactDigestsVerifiedAfterRuntime","stdoutSha256","stderrSha256"],"PR301_RUNTIME_BUILD");
  const b=r.build;
  need(b.sourceCommit===SOURCE && b.sourceTreeClean===true && b.sourceTreeStable===true && b.artifactDigestsVerifiedAfterRuntime===true &&
    /^[A-Za-z0-9_-]{8,128}$/u.test(b.buildId) && b.distDir===".tmp/china-lesson-e2e-runtime/outputs/pr258-20261029/next-dist-v3" &&
    canonicalTime(b.completedAt) && Date.parse(b.completedAt)<=Date.parse(r.recordedAt) &&
    [b.attestationRawSha256,b.stdoutSha256,b.stderrSha256].every(v=>HASH.test(v)),"PR301_RUNTIME_BUILD");
  keys(b.artifactTree,["algorithm","exclusions","fileCount","totalBytes","root"],"PR301_RUNTIME_BUILD");
  same(b.artifactTree.exclusions,["mais-build-attestation.json","cache/**","diagnostics/**","trace","trace-build"],"PR301_RUNTIME_BUILD");
  need(b.artifactTree.algorithm==="sha256" && HASH.test(b.artifactTree.root) && Number.isSafeInteger(b.artifactTree.fileCount) && b.artifactTree.fileCount>0 &&
    Number.isSafeInteger(b.artifactTree.totalBytes) && b.artifactTree.totalBytes>0,"PR301_RUNTIME_BUILD");
  same(r.compiledVoice,RUNTIME_COMPILED_VOICE,"PR301_RUNTIME_VOICE");
  need(Array.isArray(r.commands) && r.commands.length===3,"PR301_RUNTIME_COMMANDS");
  for(const c of r.commands) {
    keys(c,["name","reportPath","reportSha256","stderrSha256","playwrightVersion","startedAt","durationMs","summary","tests","args"],"PR301_RUNTIME_COMMANDS");
    need(canonicalTime(c.startedAt) && Date.parse(c.startedAt)>=Date.parse(b.completedAt) && Number.isFinite(c.durationMs) && c.durationMs>0 && c.durationMs<=600000 &&
      Date.parse(c.startedAt)+c.durationMs<=Date.parse(r.recordedAt),"PR301_RUNTIME_TIME");
  }
  same(r.commands.map(({startedAt,durationMs,...c})=>c),RUNTIME_REPORTS,"PR301_RUNTIME_COMMANDS");
  same(r.screenshots,RUNTIME_SCREENSHOTS,"PR301_RUNTIME_SCREENSHOTS");
  same(r.sourceDependencies,RUNTIME_DEPENDENCIES,"PR301_RUNTIME_DEPENDENCIES");
}
export function validateRuntimeDependencies(root,r,head) {
  same(r.sourceDependencies,RUNTIME_DEPENDENCIES,"PR301_RUNTIME_DEPENDENCIES");
  for(const {path:file,sha256} of RUNTIME_DEPENDENCIES) {
    for(const ref of [SOURCE,head]) need(hash(blob(root,ref,file))===sha256,"PR301_RUNTIME_DEPENDENCY_BYTES");
    need(hash(regular(root,file))===sha256,"PR301_RUNTIME_DEPENDENCY_BYTES");
  }
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR301_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR301_ARTIFACT_ROOT");
  return root;
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR301_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []);
  const summary = name === "types" ? (need(stdout.length === 0, "PR301_TYPE_OUTPUT"), null) : testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR301_CONTRACT_COUNT");
  else {
    const spec = COMMANDS.find(command => command.name === name);
    need(spec, "PR301_COMMANDS"); same(summary, spec.summary, "PR301_TEST_COUNT_OR_NAMES");
  }
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr301.test.mjs"] }, ...COMMANDS];
  const records = [];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command.args, { cwd: context.root, env: commandEnvironment(), timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, command.name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, command.name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    const summary = verifyExecution(command.name, result);
    records.push({ name: command.name, args: command.args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), summary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR301_SOURCE_MOVED");
  const decision = { schemaVersion: "pr301-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, consumedRuntimeEvidenceSha256: RUNTIME_SHA, browserReexecutedInCi: false, buildReexecutedInPromotion: false, liveVoiceProven: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "runtimeEvidenceRawSha256", "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR301_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr301-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr301-required-check", "PR301_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, runtimeEvidenceRawSha256: RUNTIME_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR301_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR301_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR301_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR301_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR301_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "runtimeEvidenceRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr301-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA && a.runtimeEvidenceRawSha256 === RUNTIME_SHA, "PR301_SCOPE");
  same(a.permissions, PERMISSIONS, "PR301_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR301_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [SOURCE_PARENT], "PR301_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR301_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr301-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR301_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR301_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR301_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR301_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR301_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR301_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR301_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR301_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR301_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR301_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR301_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR301_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json"), runtime = tracked(root, head, DIRECTORY + "/runtime-evidence.json");
  need(hash(checks.bytes) === CHECKS_SHA && hash(runtime.bytes) === RUNTIME_SHA, "PR301_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value); validateRuntimeEvidence(runtime.value); validateRuntimeDependencies(root, runtime.value, head);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR301_CHECKS_TIME");
  need(Date.parse(runtime.value.recordedAt) >= sourceTime * 1000 && Math.floor(Date.parse(runtime.value.recordedAt) / 1000) <= toolingTime, "PR301_RUNTIME_TIME");
  keys(a.reviews, ["A11", "A23"], "PR301_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR301_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR301_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR301_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR301_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR301_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR301_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR301_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR301_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR301_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR301_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR301_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr301\n"); }
  else { need(options.artifactRoot, "PR301_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR301_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
