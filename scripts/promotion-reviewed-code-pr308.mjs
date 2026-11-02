#!/usr/bin/env node
// Exact PR308 recovery-and-ca004-native S -> T -> E admission. Earlier gates remain immutable.
import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "4847c89770f4a735c395773616f1d1a4a413152f";
export const SOURCE = "54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e";
export const SOURCE_TREE = "d53bd544a4da00c7243a561b61635967e8f7b899";
export const SOURCE_INVENTORY = "7bd30c345c5b12e94c70f3d152bbc4c71139cab162509175622e4887bfff9813";
export const CHECKS_SHA = "a9a5dbcbf85bdb2eb42cb79f62cebda348ea156dfd39cac697b6b6516f122cc0";
export const DIRECTORY = "coordination/integration/reviewed-code/pr308-v1";
export const PULL_REQUEST = 308;
export const NATIVE_ROOT='coordination/integration/ca-textbook-currentness-v1';
export const NATIVE_PREFIX=NATIVE_ROOT+'/attempts/ca-textbook-004';
export const NATIVE_CODE_PATHS=Object.freeze([NATIVE_ROOT+'/promotion.mjs',NATIVE_ROOT+'/currentness.mjs',NATIVE_ROOT+'/currentness.test.mjs',NATIVE_ROOT+'/README.md','.github/workflows/ca004-currentness-finalize.yml'].sort());
export const CODE_PATHS=Object.freeze(['.github/workflows/promotion-shadow.yml','scripts/promotion-reviewed-code-pr308.mjs','scripts/promotion-reviewed-code-pr308.test.mjs','docs/pr308-reviewed-code-gate.md','scripts/release-governance.test.mjs'].sort());
export const NATIVE_EVIDENCE_PATHS=Object.freeze(['candidate.json','source-inventory.json','checker-release.json','runtime.json','diagnostic-execution.json','diagnostic-observation.json','diagnostic-source-binding.json','diagnostic.stdout','diagnostic.stderr',...['a18','a11','a23','a22','a25'].flatMap(role=>['evidence/'+role+'.json','evidence/'+role+'.md'])].map(file=>NATIVE_PREFIX+'/'+file).sort());
export const EVIDENCE_PATHS=Object.freeze(['admission.json','source-inventory.json','source-checks.json',...['a11','a23'].flatMap(role=>[role+'-review.json',role+'-review.md'])].map(file=>DIRECTORY+'/'+file).sort());
export const ALL_EVIDENCE_PATHS=Object.freeze([...NATIVE_EVIDENCE_PATHS,...EVIDENCE_PATHS].sort());
export const EXECUTION_PATHS=Object.freeze([NATIVE_PREFIX+'/manifest.json',NATIVE_PREFIX+'/successor.json'].sort());
export const RECEIPT_PATHS=Object.freeze([NATIVE_PREFIX+'/canonical-receipt.json',NATIVE_PREFIX+'/receipts/fresh.json',NATIVE_PREFIX+'/receipts/replay.json']);
export const MANIFEST = NATIVE_PREFIX + "/manifest.json";

export const ADMISSION = DIRECTORY + "/admission.json";
export const NATIVE_CODE_COMMIT = "f2daf39aa92c40c26849aaa8e648031c7f7229ff";
export const NATIVE_CODE_TREE = "f813a316994c2a55bc3965f5aaa5a69ee09c2386";
export const NATIVE_CODE_INVENTORY = "fe340b33a38ad8e4f3d232e1e9a8571f8ed7eb61c5ad1303e30dcf57113f15d0";
export const SOURCE_PATHS = Object.freeze(["coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization-input.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A11.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A11.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A22.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A22.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A23.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A23.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A25.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/A25.md", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/main.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/native-execution.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/native-result.json", "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/finalization/pr.json", "coordination/session-logs/2026-11-02-A12-account-deletion-shared-work.md", "lib/californiaGradeAware.test.ts", "lib/server/userStore/accountDeletionPersistence.ts", "lib/server/userStoreAccountDeletion.test.ts", "package-lock.json", "package.json"]);

export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/ca004_release_a11", A23:"/root/ca004_release_a23" });
export const SCOPE = "exact-pr308-recovery-and-ca004-native-required-check-only";
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
].map(c => Object.freeze({ ...c, args: Object.freeze(c.args), summary: c.summary === null ? null : Object.freeze(c.summary) })));
export const TOOLING_COMMANDS = Object.freeze([
  {
    "name": "native-contract",
    "args": [
      "--test",
      "--test-reporter=tap",
      "coordination/integration/ca-textbook-currentness-v1/currentness.test.mjs"
    ],
    "summary": {
      "tests": 47,
      "suites": 0,
      "pass": 47,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "79e702b76bc14bcf67ca6de1aeb94301c0b92721d14aca7ed2754cdab0429407"
    }
  },
  {
    "name": "release-governance",
    "args": [
      "--test",
      "--test-reporter=tap",
      "--test-concurrency=1",
      "scripts/classroom-load-smoke.test.mjs",
      "scripts/release-build-gate.test.mjs",
      "scripts/release-governance.test.mjs"
    ],
    "summary": {
      "tests": 175,
      "suites": 0,
      "pass": 164,
      "fail": 0,
      "cancelled": 0,
      "skipped": 11,
      "todo": 0,
      "resultNamesDigest": "ea2f05004adbe1f9696924975b6bbfe8614132c9b61409884de4845091f8d740",
      "skippedNames": [
        "Promotion Shadow npm commands are exact and expose no live-capable alias",
        "Promotion Shadow CI is an all-change fail-closed non-live gate",
        "Promotion Shadow CI authenticates expected-fail receipts and leaves the final gate red",
        "Promotion Shadow CI replays the canonical execution commit from a fixed detached worktree",
        "Promotion Shadow CI extracts only a committed, exact canonical execution binding",
        "Promotion Shadow CI rejects injected, non-ancestor, and colliding historical worktrees",
        "Promotion Shadow CI prepares only the externally pinned frozen audit release",
        "Promotion Shadow receipt verification reports execute fail closed for exact receipt bindings",
        "Promotion Shadow artifact preflight requires every exact non-empty JSON file before upload",
        "Promotion Shadow final enforcement remains red for an authentic failed Receipt",
        "Promotion Shadow terminal current-HEAD report assertion executes fail closed"
      ]
    }
  }
].map(c => Object.freeze({ ...c, args: Object.freeze(c.args), summary: Object.freeze(c.summary) })));
export const CONTRACT_TEST_COUNT = 69;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR308_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR308_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR308_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR308_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR308_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR308_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR308_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR308_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR308_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR308_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor="          if [[ -e coordination/integration/reviewed-code/pr307-v1/admission.json";
  const selector=[
    "          if [[ -e "+ADMISSION+" || -L "+ADMISSION+" ]]; then",
    "            mode=$(env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr308.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr307-v1/admission.json"
  ].join("\n");
  const modeAnchor='          if [[ "$mode" != "reviewed-code-pr307"';
  const stepAnchor="      - name: Verify exact PR307 hourly teacher-notice admission\n";
  const steps=[
    "      - name: Verify exact PR308 recovery and CA004 native admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr308' }}",
    "        timeout-minutes: 90",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          execution="$RUNNER_TEMP/ca004-pr308-execution"',
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr308"',
    '          test ! -e "$execution" && test ! -L "$execution"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    "          execution_sha=$(env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr308.mjs execution \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    '          test "${#execution_sha}" -eq 40',
    '          case "$execution_sha" in *[!0-9a-f]*) exit 1 ;; esac',
    '          git -c gc.auto=0 -c maintenance.auto=false clone --quiet --no-hardlinks --no-checkout "$GITHUB_WORKSPACE" "$execution"',
    '          git -C "$execution" checkout --quiet --detach "$execution_sha"',
    '          mkdir -p "$execution/node_modules"',
    '          cp -R "$GITHUB_WORKSPACE/node_modules/typescript" "$execution/node_modules/typescript"',
    '          install -d -m 0700 "$artifacts"',
    "          env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr308.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --execution "$execution" --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR308 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr308' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr308",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr308",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n")+"\n";
  for(const token of [anchor,modeAnchor,stepAnchor])need(before.split(token).length===2,"PR308_WORKFLOW");
  return before.replace(anchor,selector).replace(modeAnchor,'          if [[ "$mode" != "reviewed-code-pr308" && "$mode" != "reviewed-code-pr307"').replace(stepAnchor,steps+stepAnchor);
}

export function expectedReleaseGovernance(before) {
  need((before.match(/15[.]5[.]23/g) ?? []).length === 4, "PR308_GOVERNANCE_DELTA");
  const direct = '    saxes: "^6.0.0",\n    svix:';
  need(before.split(direct).length === 2, "PR308_GOVERNANCE_DELTA");
  let after = before.replaceAll("15.5.23", "15.5.28").replace(direct, '    saxes: "^6.0.0",\n    sharp: "0.35.5",\n    svix:');
  const lock = '  assert.equal(packageLock.packages["node_modules/next"].version, "15.5.28");';
  need(after.split(lock).length === 3, "PR308_GOVERNANCE_DELTA");
  after = after.replaceAll(lock, lock + '\n  assert.equal(packageLock.packages[""].dependencies.sharp, "0.35.5");\n  assert.equal(packageLock.packages["node_modules/sharp"].version, "0.35.5");');
  const manifest = '  assert.equal(packageJson.dependencies.next, "15.5.28");';
  need(after.split(manifest).length === 2, "PR308_GOVERNANCE_DELTA");
  return after.replace(manifest, manifest + '\n  assert.equal(packageJson.dependencies.sharp, "0.35.5");');
}
export function validateFinitePhaseChain(actual,expected){
 keys(expected,['sourceCommit','nativeCodeCommit'],'PR308_PHASE_EXPECTED');
 keys(actual,['sourceCommit','nativeCodeCommit','toolingCommit','evidenceCommit','executionCommit','storageCommit','headCommit','parents','paths','additions','headTreeMatchesStorage'],'PR308_PHASE_SCHEMA');
 const phases=['native','tooling','evidence','execution','storage'];
 keys(actual.parents,[...phases,'head'],'PR308_PHASE_SCHEMA');keys(actual.paths,phases,'PR308_PHASE_SCHEMA');
 for(const value of Object.values(expected))need(SHA.test(value),'PR308_PHASE_SHA');
 const ids=['sourceCommit','nativeCodeCommit','toolingCommit','evidenceCommit','executionCommit','storageCommit'];
 need(ids.every(k=>SHA.test(actual[k]))&&new Set(ids.map(k=>actual[k])).size===ids.length&&SHA.test(actual.headCommit),'PR308_PHASE_SHA');
 need(actual.sourceCommit===expected.sourceCommit&&actual.nativeCodeCommit===expected.nativeCodeCommit,'PR308_PHASE_SOURCE');
 const parentIds=[actual.sourceCommit,actual.nativeCodeCommit,actual.toolingCommit,actual.evidenceCommit,actual.executionCommit];
 const pathLists=[NATIVE_CODE_PATHS,CODE_PATHS,ALL_EVIDENCE_PATHS,EXECUTION_PATHS,RECEIPT_PATHS];
 for(const [i,phase] of phases.entries()){
  same(actual.parents[phase],[parentIds[i]],'PR308_PHASE_PARENT');
  need(Array.isArray(actual.paths[phase])&&new Set(actual.paths[phase]).size===actual.paths[phase].length,'PR308_PHASE_PATHS');
  same([...actual.paths[phase]].sort(),[...pathLists[i]].sort(),'PR308_PHASE_PATHS');
 }
 const additions=[...ALL_EVIDENCE_PATHS.map(path=>({path,commit:actual.evidenceCommit})),...EXECUTION_PATHS.map(path=>({path,commit:actual.executionCommit})),...RECEIPT_PATHS.map(path=>({path,commit:actual.storageCommit}))];
 need(Array.isArray(actual.additions),'PR308_PHASE_ADDITIONS');for(const row of actual.additions)keys(row,['path','commit'],'PR308_PHASE_ADDITIONS');
 same([...actual.additions].sort((a,b)=>a.path.localeCompare(b.path)),additions.sort((a,b)=>a.path.localeCompare(b.path)),'PR308_PHASE_ADDITIONS');
 need(actual.headTreeMatchesStorage===true,'PR308_PHASE_TREE');
 if(actual.headCommit===actual.storageCommit)same(actual.parents.head,[actual.executionCommit],'PR308_PHASE_HEAD');
 else {need(!ids.map(k=>actual[k]).includes(actual.headCommit),'PR308_PHASE_HEAD');same(actual.parents.head,[BASE,actual.storageCommit],'PR308_PHASE_HEAD');}
 return {sourceCommit:actual.sourceCommit,nativeCodeCommit:actual.nativeCodeCommit,toolingCommit:actual.toolingCommit,evidenceCommit:actual.evidenceCommit,executionCommit:actual.executionCommit,storageCommit:actual.storageCommit,headCommit:actual.headCommit,phaseDigest:digest(actual)};
}

export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR308_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR308_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR308_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR308_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR308_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR308_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR308_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr308-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR308_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR308_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR308_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR308_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR308_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR308_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR308_ARTIFACT_ROOT");
  return root;
}
export const HISTORICAL_GOVERNANCE_SKIPS=Object.freeze([
  "Promotion Shadow npm commands are exact and expose no live-capable alias",
  "Promotion Shadow CI is an all-change fail-closed non-live gate",
  "Promotion Shadow CI authenticates expected-fail receipts and leaves the final gate red",
  "Promotion Shadow CI replays the canonical execution commit from a fixed detached worktree",
  "Promotion Shadow CI extracts only a committed, exact canonical execution binding",
  "Promotion Shadow CI rejects injected, non-ancestor, and colliding historical worktrees",
  "Promotion Shadow CI prepares only the externally pinned frozen audit release",
  "Promotion Shadow receipt verification reports execute fail closed for exact receipt bindings",
  "Promotion Shadow artifact preflight requires every exact non-empty JSON file before upload",
  "Promotion Shadow final enforcement remains red for an authentic failed Receipt",
  "Promotion Shadow terminal current-HEAD report assertion executes fail closed"
]);
export function releaseGovernanceSummary(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes), lines = text.split("\n");
  need(lines[0] === "TAP version 13" && lines.filter(v => /^\s*TAP version\b/iu.test(v)).length === 1 &&
    !/^\s*(?:Bail out!|not ok\b)/imu.test(text) && !/^\s*(?:ok \d+|1\.\.\d+).*#\s*TODO\b/imu.test(text), "PR308_GOVERNANCE_REPORT");
  let cursor = 1, tests = 0, suites = 0, skipped = 0;
  const skippedNames = [];
  const resultNames = [];
  const whitespace = () => {
    while (cursor < lines.length && (lines[cursor] === "" || /^\s*#(?! Subtest:| (?:TAP|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/u.test(lines[cursor]))) cursor++;
  };
  const scope = indent => {
    const prefix = " ".repeat(indent); let completed = 0;
    for (;;) {
      whitespace();
      const plan = lines[cursor]?.match(new RegExp(`^${prefix}1\\.\\.(\\d+)$`));
      if (plan) { need(completed > 0 && Number(plan[1]) === completed, "PR308_GOVERNANCE_COVERAGE"); cursor++; return; }
      const start = lines[cursor]?.match(new RegExp(`^${prefix}# Subtest: (.+)$`));
      need(start, "PR308_GOVERNANCE_COVERAGE"); cursor++; whitespace();
      const hasChildren = lines[cursor]?.startsWith(`${prefix}    # Subtest: `);
      if (hasChildren) scope(indent + 4);
      const result = lines[cursor]?.match(new RegExp(`^${prefix}ok (\\d+) - (.+?)( # SKIP)?$`));
      need(result && Number(result[1]) === completed + 1 && result[2] === start[1], "PR308_GOVERNANCE_COVERAGE"); cursor++;
      need(lines[cursor++] === `${prefix}  ---`, "PR308_GOVERNANCE_REPORT");
      let type = null, durationSeen = false;
      while (cursor < lines.length && lines[cursor] !== `${prefix}  ...`) {
        const row = lines[cursor++], match = row.match(new RegExp(`^${prefix}  type: '(test|suite)'$`));
        if (match) { need(type === null, "PR308_GOVERNANCE_REPORT"); type = match[1]; }
        else { need(!durationSeen && new RegExp(`^${prefix}  duration_ms: [0-9]+(?:[.][0-9]+)?$`).test(row), "PR308_GOVERNANCE_REPORT"); durationSeen = true; }
      }
      need(lines[cursor++] === `${prefix}  ...` && durationSeen && (type === "test" || (type === "suite" && hasChildren)), "PR308_GOVERNANCE_REPORT");
      if (result[3]) {
        need(type === "test" && !hasChildren && HISTORICAL_GOVERNANCE_SKIPS.includes(start[1]) && !skippedNames.includes(start[1]), "PR308_GOVERNANCE_SKIP");
        skipped++; skippedNames.push(start[1]);
      }
      if (type === "suite") suites++; else tests++;
      resultNames.push(start[1]); completed++;
    }
  };
  scope(0);
  const rows = lines.slice(cursor).filter(Boolean), expected = { tests, suites, pass: tests - skipped, fail: 0, cancelled: 0, skipped, todo: 0 };
  need(tests > 0 && rows.length === 8, "PR308_GOVERNANCE_STATS");
  for (const [key, value] of Object.entries(expected)) need(rows.filter(v => v === `# ${key} ${value}`).length === 1, "PR308_GOVERNANCE_STATS");
  need(rows.filter(v => /^# duration_ms [0-9]+(?:[.][0-9]+)?$/u.test(v)).length === 1, "PR308_GOVERNANCE_STATS");
  return { ...expected, resultNamesDigest: digest(resultNames), skippedNames };
}

export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR308_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
  const spec = [...COMMANDS,...TOOLING_COMMANDS].find(command => command.name === name);
  need(name === "gate-contract" || spec, "PR308_COMMANDS");
  let summary;
  if (name === "types") {
    need(stdout.length === 0 && stderr.length === 0, "PR308_TYPE_OUTPUT"); summary = null;
  } else if(name === "release-governance") summary=releaseGovernanceSummary(stdout);
  else summary = testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR308_CONTRACT_COUNT");
  else same(summary, spec.summary, "PR308_TEST_COUNT_OR_NAMES");
  return summary;
}
export function validateNativeVerification(value,transport,proof,stored,seenReplayIds){
 keys(value,['schemaVersion','result','transport','binding','semanticDigest','replayRunId','liveAllowed'],'PR308_NATIVE_VERIFICATION_SCHEMA');
 need(value.schemaVersion==='ca004-verification.v1'&&value.result==='pass'&&value.liveAllowed===false,'PR308_NATIVE_VERIFICATION_SCOPE');
 same(value.transport,transport,'PR308_NATIVE_VERIFICATION_TRANSPORT');same(value.binding,proof,'PR308_NATIVE_VERIFICATION_BINDING');
 need(/^[a-f0-9]{64}$/.test(value.semanticDigest)&&value.semanticDigest===stored.semanticDigest,'PR308_NATIVE_VERIFICATION_SEMANTIC');
 need(typeof value.replayRunId==='string'&&/^verify-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.replayRunId)&&!seenReplayIds.has(value.replayRunId),'PR308_NATIVE_VERIFICATION_REPLAY');seenReplayIds.add(value.replayRunId);return value;
}

export function validateNativeValidation(value,context,nativeContext,native) {
  keys(value,["schemaVersion","result","binding","observation","lifecycleState","liveAllowed"],"PR308_NATIVE_VALIDATION_SCHEMA");
  need(value.schemaVersion==="ca004-validation.v1"&&value.result==="pass"&&value.lifecycleState==="shadow_ready"&&value.liveAllowed===false,"PR308_NATIVE_VALIDATION_SCOPE");
  const expected={sourceCommit:SOURCE,sourceTree:SOURCE_TREE,candidateDigest:native.CANDIDATE_DIGEST,checkerReleaseCommit:context.admission.toolingCommit,checkerBundleDigest:nativeContext.m.checkerBundleDigest,evidenceCommit:context.evidenceCommit,executionCommit:context.executionCommit,executionTree:tree(context.root,context.executionCommit),manifestSha256:hash(blob(context.root,context.executionCommit,MANIFEST)),observerBundleDigest:digest({files:nativeContext.ledger.observerFiles,dependencies:nativeContext.ledger.dependencies}),policyDigest:nativeContext.diagnostic.projection.policyDigest,auditDigest:nativeContext.diagnostic.projection.auditDigest,historicalClosureDigest:nativeContext.history.historicalResult.closure.closureDigest,runtimeDigest:digest(value.observation?.runtime)};
  same(value.binding,expected,"PR308_NATIVE_VALIDATION_BINDING");
  keys(value.observation,["schemaVersion","sourceCommit","sourceTree","executionCommit","observedHead","observedTree","event","receiptStorage","treeProjectionDigest","runtime","registryDigest","liveAllowed"],"PR308_NATIVE_OBSERVATION_SCHEMA");
  need(value.observation.schemaVersion==="ca004-current-observation.v1"&&value.observation.sourceCommit===SOURCE&&value.observation.sourceTree===SOURCE_TREE&&value.observation.executionCommit===context.executionCommit&&value.observation.observedHead===context.executionCommit&&value.observation.observedTree===expected.executionTree&&value.observation.event==="execution"&&value.observation.receiptStorage===null&&value.observation.liveAllowed===false,"PR308_NATIVE_OBSERVATION_BINDING");
  for(const key of ["treeProjectionDigest","registryDigest"])need(HASH.test(value.observation[key]),"PR308_NATIVE_OBSERVATION_HASH");
  return value.binding;
}
export function unwrapCurrentObservation(value) {
  keys(value,["result","observation","liveAllowed"],"PR308_NATIVE_CURRENT_ENVELOPE");
  need(value.result==="pass"&&value.liveAllowed===false&&value.observation&&typeof value.observation==="object"&&!Array.isArray(value.observation),"PR308_NATIVE_CURRENT_ENVELOPE");
  return value.observation;
}
export function validateCurrentObservation(value,context,validation) {
  keys(value,["schemaVersion","sourceCommit","sourceTree","executionCommit","observedHead","observedTree","event","receiptStorage","treeProjectionDigest","runtime","registryDigest","liveAllowed"],"PR308_NATIVE_CURRENT_SCHEMA");
  need(value.schemaVersion==="ca004-current-observation.v1"&&value.sourceCommit===SOURCE&&value.sourceTree===SOURCE_TREE&&value.executionCommit===context.head&&value.observedHead===context.head&&value.observedTree===tree(context.root,context.head)&&value.event===context.event.name&&value.receiptStorage===context.storageCommit&&value.liveAllowed===false,"PR308_NATIVE_CURRENT_BINDING");
  for(const key of ["treeProjectionDigest","registryDigest"])need(HASH.test(value[key]),"PR308_NATIVE_CURRENT_HASH");
  same(value.runtime,validation.observation.runtime,"PR308_NATIVE_CURRENT_RUNTIME");
  need(value.registryDigest===validation.observation.registryDigest,"PR308_NATIVE_CURRENT_REGISTRY");return value;
}
export function verifyNativeArtifactInventory(root,runs,decisionBytes=null) {
  const directory=lstatSync(root);
  need(directory.isDirectory()&&!directory.isSymbolicLink()&&realpathSync(root)===root&&(directory.mode&0o777)===0o700,"PR308_NATIVE_ARTIFACT_ROOT");
  same(runs.map(row=>[row.label,row.operation]),[["validate","validate"],["fresh","shadow"],["replay","shadow"],["verify-canonical","verify-receipt"],["verify-fresh","verify-receipt"],["verify-replay","verify-receipt"],["observe-current","observe-current"]],"PR308_NATIVE_RUN_INVENTORY");
  const expected=new Map();
  for(const run of runs){
    keys(run,["label","operation","startedAt","completedAt","elapsedMs","exitCode","signal","stdout","stderr"],"PR308_NATIVE_RUN_RECORD");
    need(run.exitCode===0&&run.signal===null&&Number.isFinite(run.elapsedMs)&&run.elapsedMs>=0&&canonicalTime(run.startedAt)&&canonicalTime(run.completedAt)&&Date.parse(run.startedAt)<=Date.parse(run.completedAt),"PR308_NATIVE_RUN_RECORD");
    for(const channel of ["stdout","stderr"]){const record=run[channel];keys(record,["name","sha256","bytes"],"PR308_NATIVE_ARTIFACT_BINDING");need(record.name===run.label+"."+channel&&HASH.test(record.sha256)&&Number.isSafeInteger(record.bytes)&&record.bytes>=0&&record.bytes<=32*1024*1024&&(channel!=="stderr"||record.bytes===0),"PR308_NATIVE_ARTIFACT_BINDING");expected.set(record.name,record);}
  }
  const runsBytes=Buffer.from(JSON.stringify(runs,null,2)+"\n");expected.set("runs.json",{name:"runs.json",sha256:hash(runsBytes),bytes:runsBytes.length});
  if(decisionBytes!==null){need(Buffer.isBuffer(decisionBytes),"PR308_NATIVE_DECISION_BYTES");expected.set("decision.json",{name:"decision.json",sha256:hash(decisionBytes),bytes:decisionBytes.length});}
  same(readdirSync(root).sort(),[...expected.keys()].sort(),"PR308_NATIVE_ARTIFACT_INVENTORY");
  return [...expected.keys()].sort().map(name=>{const file=path.join(root,name),record=expected.get(name),stat=lstatSync(file);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&realpathSync(file)===file&&(stat.mode&0o777)===0o600&&stat.size===record.bytes,"PR308_NATIVE_ARTIFACT_FILE");const bytes=readFileSync(file);need(hash(bytes)===record.sha256,"PR308_NATIVE_ARTIFACT_DRIFT");if(name==="runs.json")same(parse(bytes),runs,"PR308_NATIVE_RUN_RECORD");return record;});
}
export async function check(options) {
  const context=preflight(options),artifacts=assertArtifactRoot(options.artifactRoot,context.root);
  const executionRoot=realpathSync(options.executionRoot);
  need(executionRoot===options.executionRoot&&path.isAbsolute(executionRoot)&&!executionRoot.startsWith(context.root+path.sep)&&!context.root.startsWith(executionRoot+path.sep)&&executionRoot!==context.root,"PR308_EXECUTION_ROOT");
  need(line(executionRoot,"rev-parse","HEAD")===context.executionCommit&&line(executionRoot,"status","--porcelain=v1","--untracked-files=all")==="","PR308_EXECUTION_CHECKOUT");
  assertMaterializedTree(context.root,context.head);assertMaterializedTree(executionRoot,context.executionCommit);
  for(const file of [...NATIVE_CODE_PATHS,...CODE_PATHS])need(regular(executionRoot,file).equals(regular(context.root,file)),"PR308_EXECUTION_CODE");
  const ordinaryRoot=path.join(artifacts,"ordinary"),nativeRoot=path.join(artifacts,"native");mkdirSync(ordinaryRoot,{mode:0o700});mkdirSync(nativeRoot,{mode:0o700});
  const commands=[{name:"gate-contract",args:["--test","--test-reporter=tap","scripts/promotion-reviewed-code-pr308.test.mjs"]},...TOOLING_COMMANDS,...COMMANDS],records=[];
  for(const command of commands){
    const result=spawnSync(process.execPath,command.args,{cwd:context.root,env:commandEnvironment(),timeout:["gate-contract","release-governance","native-contract"].includes(command.name)?300000:command.name==="types"?300000:180000,maxBuffer:32*1024*1024});
    const stdout=Buffer.from(result.stdout??[]),stderr=Buffer.from(result.stderr??[]);for(const [channel,bytes] of [["stdout",stdout],["stderr",stderr]])writeFileSync(path.join(ordinaryRoot,command.name+"."+channel),bytes,{flag:"wx",mode:0o600});
    const summary=verifyExecution(command.name,result);records.push({name:command.name,args:command.args,exitCode:0,stdoutSha256:hash(stdout),stderrSha256:hash(stderr),summary});
  }
  const native=await import(pathToFileURL(path.join(context.root,NATIVE_ROOT,"currentness.mjs")));
  same(native.CODE_PATHS,NATIVE_CODE_PATHS,"PR308_NATIVE_API_SCOPE");same(native.OUTER_CODE_PATHS,CODE_PATHS,"PR308_NATIVE_API_SCOPE");same(native.EVIDENCE_PATHS,ALL_EVIDENCE_PATHS,"PR308_NATIVE_API_SCOPE");same(native.EXECUTION_PATHS,EXECUTION_PATHS,"PR308_NATIVE_API_SCOPE");same(native.RECEIPT_PATHS,RECEIPT_PATHS,"PR308_NATIVE_API_SCOPE");
  need(native.SOURCE===SOURCE&&native.SOURCE_TREE===SOURCE_TREE&&native.BASE===BASE&&native.MANIFEST===MANIFEST,"PR308_NATIVE_API_BINDING");
  const nativeContext=await native.phasePreflight(executionRoot,MANIFEST);
  need(nativeContext.m.checkerInnerCommit===NATIVE_CODE_COMMIT&&nativeContext.m.checkerReleaseCommit===context.admission.toolingCommit&&nativeContext.m.evidenceCommit===context.evidenceCommit&&nativeContext.executionCommit===context.executionCommit,"PR308_NATIVE_PHASE_BINDING");
  const transports=RECEIPT_PATHS.map(file=>({path:file,storageCommit:context.storageCommit,sha256:hash(blob(context.root,context.storageCommit,file))}));
  const stored=transports.map(transport=>parse(blob(context.root,transport.storageCommit,transport.path)));
  const runs=[];
  const save=(name,bytes)=>{writeFileSync(path.join(nativeRoot,name),bytes,{flag:"wx",mode:0o600});return {name,sha256:hash(bytes),bytes:bytes.length};};
  const invoke=(label,operation,extra=[])=>{
    const args=[path.join(executionRoot,NATIVE_ROOT,"promotion.mjs"),operation,"--repo",executionRoot,"--manifest",MANIFEST,...extra];
    const startedAt=new Date().toISOString(),started=Date.now();const result=spawnSync(process.execPath,args,{cwd:executionRoot,env:commandEnvironment(),timeout:({validate:180000,shadow:360000,"verify-receipt":540000,"observe-current":360000}[operation])+15000,maxBuffer:32*1024*1024});
    const stdout=Buffer.from(result.stdout??[]),stderr=Buffer.from(result.stderr??[]);runs.push({label,operation,startedAt,completedAt:new Date().toISOString(),elapsedMs:Date.now()-started,exitCode:result.status,signal:result.signal??null,stdout:save(label+".stdout",stdout),stderr:save(label+".stderr",stderr)});
    const next=path.join(nativeRoot,"runs.next.json");writeFileSync(next,JSON.stringify(runs,null,2)+"\n",{flag:"wx",mode:0o600});renameSync(next,path.join(nativeRoot,"runs.json"));
    need(!result.error&&result.status===0&&stderr.length===0,"PR308_NATIVE_EXECUTION_FAILED");return parse(stdout);
  };
  const validation=invoke("validate","validate"),proof=validateNativeValidation(validation,context,nativeContext,native);
  for(const receipt of stored)native.verifyReceiptRecord(receipt,proof);
  const prefix="pr308-"+randomUUID(),fresh=invoke("fresh","shadow",["--run-id",prefix+"-fresh","--execute"]),replay=invoke("replay","shadow",["--run-id",prefix+"-replay","--execute"]);
  need(fresh.runId===prefix+"-fresh"&&replay.runId===prefix+"-replay","PR308_NATIVE_RUN_ID");
  const seen=new Set([...stored.map(receipt=>receipt.runId),fresh.runId,replay.runId]);need(seen.size===5,"PR308_NATIVE_RUN_ID");
  for(const [i,transport] of transports.entries()){
    const result=invoke("verify-"+["canonical","fresh","replay"][i],"verify-receipt",["--path",transport.path,"--storage-commit",transport.storageCommit,"--sha256",transport.sha256,"--execute"]);
    validateNativeVerification(result,transport,proof,stored[i],seen);
  }
  const storedComparison=native.compareReceipts(stored,proof),freshComparison=native.compareReceipts([stored[0],fresh,replay],proof);
  need(storedComparison.semanticDigest===freshComparison.semanticDigest,"PR308_NATIVE_COMPARISON");
  const observation=validateCurrentObservation(unwrapCurrentObservation(invoke("observe-current","observe-current",["--observed-repo",context.root,"--execute"])),context,validation);
  const nativeArtifacts=verifyNativeArtifactInventory(nativeRoot,runs);
  const ordinaryFiles=records.flatMap(record=>[record.name+".stdout",record.name+".stderr"]).sort();
  same(readdirSync(ordinaryRoot).sort(),ordinaryFiles,"PR308_ORDINARY_ARTIFACT_SCOPE");
  for(const record of records)for(const channel of ["stdout","stderr"]){const bytes=regular(ordinaryRoot,record.name+"."+channel);need(hash(bytes)===record[channel+"Sha256"],"PR308_ORDINARY_ARTIFACT_DRIFT");}
  same(readdirSync(artifacts).sort(),["native","ordinary"],"PR308_ARTIFACT_SCOPE");
  assertMaterializedTree(context.root,context.head);assertMaterializedTree(executionRoot,context.executionCommit);
  const after=preflight(options);need(after.head===context.head&&after.phase.phaseDigest===context.phase.phaseDigest,"PR308_SOURCE_MOVED");
  const decision={schemaVersion:"pr308-decision.v1",result:"pass",scope:SCOPE,event:context.event,phase:context.phase,sourceCommit:SOURCE,sourceTree:SOURCE_TREE,sourceInventoryDigest:SOURCE_INVENTORY,toolingCommit:context.admission.toolingCommit,reviewBindings:context.admission.reviews,commands:records,native:{proof,storedComparison,freshComparison,currentObservation:observation,artifactBindings:nativeArtifacts,artifactSetDigest:digest(nativeArtifacts),runCount:runs.length,finalizationProven:false},permissions:PERMISSIONS};
  decision.decisionDigest=digest(decision);writeFileSync(path.join(artifacts,"decision.json"),stable(decision)+"\n",{flag:"wx",mode:0o600});return decision;
}

export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR308_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr308-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr308-required-check", "PR308_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR308_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR308_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR308_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR308_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR308_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr308-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA, "PR308_SCOPE");
  same(a.permissions, PERMISSIONS, "PR308_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR308_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), ["5c77f4d3fde75eb9274268a064dad1cb771633d5"], "PR308_SOURCE_PARENTS");
  same(parents(root, "5c77f4d3fde75eb9274268a064dad1cb771633d5"), ["9e29c05bb0fe334f19035b6e4c908d69d9e66f9d", "dd61016253fa9e8d869ef19abbd6bccee7e342c5"], "PR308_SOURCE_PARENTS");
  same(parents(root, "9e29c05bb0fe334f19035b6e4c908d69d9e66f9d"), [BASE, "4490ee972ba6b2a746501bca0341b4b43d0b7da2"], "PR308_SOURCE_PARENTS");
  same(parents(root, "4490ee972ba6b2a746501bca0341b4b43d0b7da2"), ["6bb35e00111e20a8b1bb6c683dd6438f388eb27c"], "PR308_SOURCE_PARENTS");
  same(parents(root, "6bb35e00111e20a8b1bb6c683dd6438f388eb27c"), ["b56ede5c36f94d7ee8884048ce80e6f1afea8521"], "PR308_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR308_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr308-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR308_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR308_TOOLING");
  need(SHA.test(NATIVE_CODE_COMMIT) && SHA.test(NATIVE_CODE_TREE) && HASH.test(NATIVE_CODE_INVENTORY), "PR308_NATIVE_CODE_NOT_FROZEN");
  same(parents(root, NATIVE_CODE_COMMIT), [SOURCE], "PR308_NATIVE_CODE_PARENT");
  same(changed(root, SOURCE, NATIVE_CODE_COMMIT), NATIVE_CODE_PATHS, "PR308_NATIVE_CODE_PATHS");
  need(tree(root, NATIVE_CODE_COMMIT) === NATIVE_CODE_TREE && digest(inventory(root, SOURCE, NATIVE_CODE_COMMIT)) === NATIVE_CODE_INVENTORY, "PR308_NATIVE_CODE_DIGEST");
  same(parents(root, a.toolingCommit), [NATIVE_CODE_COMMIT], "PR308_TOOLING_PARENT");
  same(changed(root, NATIVE_CODE_COMMIT, a.toolingCommit), CODE_PATHS, "PR308_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR308_TOOLING_DIGEST");
  for (const file of NATIVE_CODE_PATHS) need(regular(root, file).equals(blob(root, NATIVE_CODE_COMMIT, file)), "PR308_NATIVE_CODE_DRIFT");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR308_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR308_WORKFLOW");
  const governance = "scripts/release-governance.test.mjs";
  need(blob(root, a.toolingCommit, governance).toString("utf8") === expectedReleaseGovernance(blob(root, SOURCE, governance).toString("utf8")), "PR308_GOVERNANCE_DELTA");
  const addition = file => {
    const revisions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", file).split("\n");
    need(revisions.length === 1 && SHA.test(revisions[0]), "PR308_PHASE_ADDITION_HISTORY");
    return revisions[0];
  };
  const evidenceCommit = addition(ADMISSION), executionCommit = addition(MANIFEST), storageCommit = addition(RECEIPT_PATHS[0]);
  const phase = validateFinitePhaseChain({
    sourceCommit: SOURCE, nativeCodeCommit: NATIVE_CODE_COMMIT, toolingCommit: a.toolingCommit,
    evidenceCommit, executionCommit, storageCommit, headCommit: head,
    parents: {native: parents(root,NATIVE_CODE_COMMIT),tooling:parents(root,a.toolingCommit),evidence:parents(root,evidenceCommit),execution:parents(root,executionCommit),storage:parents(root,storageCommit),head:parents(root,head)},
    paths: {native:changed(root,SOURCE,NATIVE_CODE_COMMIT),tooling:changed(root,NATIVE_CODE_COMMIT,a.toolingCommit),evidence:changed(root,a.toolingCommit,evidenceCommit),execution:changed(root,evidenceCommit,executionCommit),storage:changed(root,executionCommit,storageCommit)},
    additions: [...ALL_EVIDENCE_PATHS,...EXECUTION_PATHS,...RECEIPT_PATHS].map(file=>({path:file,commit:addition(file)})),
    headTreeMatchesStorage:tree(root,head)===tree(root,storageCommit)
  }, {sourceCommit:SOURCE,nativeCodeCommit:NATIVE_CODE_COMMIT});
  for(const file of [...ALL_EVIDENCE_PATHS,...EXECUTION_PATHS,...RECEIPT_PATHS])need(line(root,"ls-tree",a.toolingCommit,"--",file)==="","PR308_PHASE_FUTURE_FILE");
  same(changed(root,SOURCE,head),[...NATIVE_CODE_PATHS,...CODE_PATHS,...ALL_EVIDENCE_PATHS,...EXECUTION_PATHS,...RECEIPT_PATHS].sort(),"PR308_OBSERVED_TREE_SCOPE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR308_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR308_CHECKS_TIME");
  keys(a.reviews, ["A11", "A23"], "PR308_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR308_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR308_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR308_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR308_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === storageCommit, "PR308_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR308_EVENT_PUSH");
    same(parents(root, head), [BASE, storageCommit], "PR308_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, executionCommit, storageCommit, phase, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
async function main() {
  need(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(a => !/^--?(?:loader|import|require|experimental-loader)/u.test(a)), "PR308_LOADER");
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "execution", "check"].includes(operation), "PR308_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", execution: "executionRoot" }, options = {};
  need(args.length % 2 === 0, "PR308_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR308_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR308_USAGE");
  keys(options, operation === "check" ? ["repoRoot","eventName","eventPath","artifactRoot","executionRoot"] : ["repoRoot","eventName","eventPath"], "PR308_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr308\n"); }
  else if(operation === "execution") process.stdout.write(preflight(options).executionCommit + "\n");
  else { need(options.artifactRoot && options.executionRoot, "PR308_USAGE"); process.stdout.write(stable(await check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR308_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; });
}
