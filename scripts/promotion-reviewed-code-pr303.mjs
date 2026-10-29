#!/usr/bin/env node
// Exact PR303 browser-evidence binding S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "53563fab0b85c59236ee27f3becaa5412dde856e";
export const SOURCE = "012ba0ee454e30a0705e2c206d6b15c6895dc585";
export const SOURCE_TREE = "da5db2e4c74bb12fb0e827be00b507b27cb0f0f4";
export const SOURCE_INVENTORY = "910995318171293aeada10cdc7ffdfcababca2673bf32a84a4a7374f9740271a";
export const CHECKS_SHA = "4fcfa076ef84f7def197fa2439f43f4fde44565e4429e8ccdc1d48ab50fb409b";
export const PULL_REQUEST = 303;
export const DIRECTORY = "coordination/integration/reviewed-code/pr303-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze(["components/visualizations/three/manim/mathSceneV2CatalogDecoupledFixtures.test.ts", "components/visualizations/three/manim/mathSceneV2CatalogDecoupledFixtures.ts", "components/visualizations/three/manim/mathSceneV2CrossAgentHandoff.test.ts", "components/visualizations/three/manim/mathSceneV2FinalClosureAudit.test.ts", "components/visualizations/three/manim/mathSceneV2FinalObjectiveAuditRequestPacket.test.ts", "components/visualizations/three/manim/mathSceneV2FinalObjectiveVerifiedClosurePipeline.test.ts", "components/visualizations/three/manim/mathSceneV2TranscriptVerifiedClosurePipeline.test.ts", "components/visualizations/three/manim/mathSceneV2VerifiedClosurePipeline.test.ts", "components/visualizations/visualizationBrowserRegressionEvidence.test.ts", "components/visualizations/visualizationBrowserRegressionEvidence.ts", "coordination/session-logs/2026-10-29-A06-pr275-current-main-01a1824f.md"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr303.mjs","scripts/promotion-reviewed-code-pr303.test.mjs","docs/pr303-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json","runtime-evidence.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/pr286_source_review", A23:"/root/pr300_a23" });
export const SCOPE = "exact-pr303-browser-evidence-binding-required-check-only";
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
].map(c => Object.freeze({ ...c, args: Object.freeze(c.args), summary: c.summary === null ? null : Object.freeze(c.summary) })));
export const CONTRACT_TEST_COUNT = 42;

export const RUNTIME_SHA = "f91f11e308e738f93e93c4e06970fd07c50329fc7182b1e78071c25eb55c70c6";
export const RUNTIME_DIGESTS = Object.freeze({
  "build": "250985be38584ee1d706651a8e3846e511794baaa86b3947cba34f9413567387",
  "browser": "abe31a7f7232a33292eb8ef42623dd7e2da2fa7f0ba71ae654df71e79b2f1ea2",
  "baseline": "fc4e4862f9c2e9265661c7d031afc4bbfbbb2dd2a634e94388277530b5889cf5"
});
export const RUNTIME_ROOTS = Object.freeze([
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
].map(Object.freeze));
export const RUNTIME_DEPENDENCIES = Object.freeze([
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
].map(Object.freeze));
export const RUNTIME_LIMITS = Object.freeze({
  "buildReexecutedInPromotion": false,
  "browserReexecutedInPromotion": false,
  "baselineReexecutedInPromotion": false,
  "syntheticFixturesAreExecutionEvidence": false,
  "broaderManimAccepted": false,
  "liveAllowed": false
});
const RUNTIME_PART_KEYS = {
  "build": [
    "sourceCommit",
    "buildId",
    "distDir",
    "sourceTreeClean",
    "sourceTreeStable",
    "buildStartedAt",
    "completedAt",
    "attestationPath",
    "attestationRawSha256",
    "artifactDigests",
    "artifactTree",
    "artifactDigestsVerifiedAfterRuntime"
  ],
  "browser": [
    "args",
    "reportPath",
    "reportSha256",
    "stderrSha256",
    "executionPath",
    "executionRawSha256",
    "playwrightVersion",
    "startedAt",
    "durationMs",
    "configuration",
    "summary",
    "tests"
  ],
  "baseline": [
    "sourceCommit",
    "sourceTree",
    "baselineHead",
    "baselineTree",
    "verificationPath",
    "verificationRawSha256",
    "comparisonPath",
    "comparisonRawSha256",
    "stdoutSha256",
    "stderrSha256",
    "actualExitCode",
    "summary",
    "failureSignature",
    "fullOutcomeDigest",
    "inputCount",
    "inputDigest",
    "manimFileCount",
    "all62TitlesAndOutcomesIdentical",
    "newFailures",
    "disappearedFailures",
    "changedFailures",
    "accepted",
    "startedAt",
    "completedAt"
  ]
};
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR303_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR303_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR303_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR303_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR303_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR303_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR303_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR303_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR303_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR303_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr302-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr303.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr302-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr302"';
  const stepAnchor = "      - name: Verify exact PR302 cron admission\n";
  const steps = [
    "      - name: Verify exact PR303 browser evidence admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr303' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr303"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr303.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR303 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr303' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr303",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr303",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR303_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr303" && "$mode" != "reviewed-code-pr302"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR303_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR303_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR303_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR303_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR303_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR303_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR303_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr303-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR303_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR303_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR303_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR303_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR303_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR303_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR303_ARTIFACT_ROOT");
  return root;
}
export function validateRuntimeEvidence(r) {
  keys(r,["schemaVersion","sourceCommit","sourceTree","recordedAt","environment","nodeMajor","build","browser","runtimeRoots","dependencies","baseline","limits"],"PR303_RUNTIME_SCHEMA");
  need(r.schemaVersion==="pr303-runtime-evidence.v1" && r.sourceCommit===SOURCE && r.sourceTree===SOURCE_TREE &&
    r.environment==="local-clean-production-build-with-offline-fixtures" && r.nodeMajor===24 && canonicalTime(r.recordedAt),"PR303_RUNTIME_SOURCE");
  for (const part of ["build","browser","baseline"]) {
    keys(r[part],RUNTIME_PART_KEYS[part],"PR303_RUNTIME_SCHEMA");
    need(digest(r[part])===RUNTIME_DIGESTS[part],"PR303_RUNTIME_BINDING");
  }
  same(r.runtimeRoots,RUNTIME_ROOTS,"PR303_RUNTIME_DEPENDENCIES");
  same(r.dependencies,RUNTIME_DEPENDENCIES,"PR303_RUNTIME_DEPENDENCIES");
  same(r.limits,RUNTIME_LIMITS,"PR303_RUNTIME_LIMITS");
  const b=r.build,p=r.browser,k=r.baseline;
  need(b.sourceCommit===SOURCE && b.sourceTreeClean===true && b.sourceTreeStable===true && b.artifactDigestsVerifiedAfterRuntime===true &&
    canonicalTime(b.buildStartedAt) && canonicalTime(b.completedAt) && Date.parse(b.completedAt)>=Date.parse(b.buildStartedAt),"PR303_RUNTIME_BUILD");
  need(b.artifactTree.algorithm==="sha256" && HASH.test(b.artifactTree.root) && Number.isInteger(b.artifactTree.fileCount) && b.artifactTree.fileCount>0 &&
    Number.isInteger(b.artifactTree.totalBytes) && b.artifactTree.totalBytes>0,"PR303_RUNTIME_BUILD");
  same(p.summary,{passed:3,failed:0,skipped:0,flaky:0,retries:0},"PR303_RUNTIME_BROWSER");
  need(canonicalTime(p.startedAt) && Number.isFinite(p.durationMs) && p.durationMs>0 && p.configuration.browserChannel==="" &&
    p.configuration.project==="desktop-chrome" && p.configuration.workers===1 && p.configuration.retries===0 &&
    p.configuration.providerProfile==="offline-fixture" && p.configuration.nodeEnvironment==="production","PR303_RUNTIME_BROWSER");
  same(p.tests.map(t=>t.title),["Translate","Reflect","Dilate"].map(m=>`student-entered points obey ${m} and share the triangle's invariant`),"PR303_RUNTIME_BROWSER");
  for(const t of p.tests) need(t.project==="desktop-chrome" && t.status==="passed" && t.retry===0 && canonicalTime(t.startedAt) &&
    Number.isFinite(t.durationMs) && t.durationMs>0 && Date.parse(t.startedAt)>=Date.parse(b.completedAt) &&
    Date.parse(t.startedAt)+t.durationMs<=Date.parse(p.startedAt)+p.durationMs+1,"PR303_RUNTIME_TIME");
  need(k.sourceCommit===SOURCE && k.sourceTree===SOURCE_TREE && k.actualExitCode===1 && k.accepted===false &&
    k.all62TitlesAndOutcomesIdentical===true && k.newFailures===0 && k.disappearedFailures===0 && k.changedFailures===0 &&
    k.failureSignature==="7518c34359707c5f8d2f52d3c4175dfd1c4003b2510de0cbe6ba82c638927945" &&
    canonicalTime(k.startedAt) && canonicalTime(k.completedAt) && Date.parse(k.completedAt)>=Date.parse(k.startedAt),"PR303_RUNTIME_BASELINE");
  same(k.summary,{tests:62,suites:0,pass:36,fail:26,cancelled:0,skipped:0,todo:0},"PR303_RUNTIME_BASELINE");
  need(Date.parse(r.recordedAt)>=Math.max(Date.parse(b.completedAt),Date.parse(p.startedAt)+p.durationMs,Date.parse(k.completedAt)),"PR303_RUNTIME_TIME");
}
export function validateRuntimeDependencies(root,r,head) {
  for(const entry of r.runtimeRoots) for(const ref of [SOURCE,head]) {
    const row=line(root,"ls-tree",ref,"--",entry.path);
    need(row.startsWith("040000 tree ") && row.endsWith("\t"+entry.path) && line(root,"rev-parse",ref+":"+entry.path)===entry.tree,"PR303_RUNTIME_DEPENDENCY");
  }
  for(const entry of r.dependencies) need(hash(blob(root,SOURCE,entry.path))===entry.sha256 && hash(blob(root,head,entry.path))===entry.sha256 &&
    hash(regular(root,entry.path))===entry.sha256,"PR303_RUNTIME_DEPENDENCY");
  need(tree(root,r.baseline.baselineHead)===r.baseline.baselineTree,"PR303_RUNTIME_BASELINE");
  git(root,"merge-base","--is-ancestor",r.baseline.baselineHead,BASE);
}
export function verifyExecution(name, result) {
  need(result.status===0 && !result.error && !result.signal,"PR303_COMMAND_FAILED");
  const stdout=Buffer.from(result.stdout??[]),stderr=Buffer.from(result.stderr??[]),spec=COMMANDS.find(c=>c.name===name);
  need(name==="gate-contract" || spec,"PR303_COMMANDS");
  const summary=name==="types" ? (need(stdout.length===0 && stderr.length===0,"PR303_TYPE_OUTPUT"),null) : testSummary(stdout);
  if(name==="gate-contract") need(summary.tests===CONTRACT_TEST_COUNT && summary.skipped===0,"PR303_CONTRACT_COUNT");
  else same(summary,spec.summary,"PR303_TEST_COUNT_OR_NAMES");
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr303.test.mjs"] }, ...COMMANDS];
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
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR303_SOURCE_MOVED");
  const decision = { schemaVersion: "pr303-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, consumedRuntimeEvidenceSha256: RUNTIME_SHA, buildReexecutedInPromotion: false, browserReexecutedInPromotion: false, baselineReexecutedInPromotion: false, retainedManimFailures: 26, broaderManimAccepted: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "runtimeEvidenceRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR303_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr303-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr303-required-check", "PR303_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, runtimeEvidenceRawSha256: RUNTIME_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR303_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR303_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR303_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR303_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR303_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "runtimeEvidenceRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr303-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA && a.runtimeEvidenceRawSha256 === RUNTIME_SHA, "PR303_SCOPE");
  same(a.permissions, PERMISSIONS, "PR303_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR303_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [BASE], "PR303_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR303_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr303-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR303_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR303_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR303_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR303_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR303_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR303_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR303_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR303_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR303_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR303_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR303_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR303_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR303_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const runtime=tracked(root,head,DIRECTORY+"/runtime-evidence.json");
  need(hash(runtime.bytes)===RUNTIME_SHA,"PR303_RUNTIME_EVIDENCE");
  validateRuntimeEvidence(runtime.value);validateRuntimeDependencies(root,runtime.value,head);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR303_CHECKS_TIME");
  need(Date.parse(runtime.value.recordedAt)>=sourceTime*1000 && Math.floor(Date.parse(runtime.value.recordedAt)/1000)<=toolingTime &&
    [runtime.value.build.buildStartedAt,runtime.value.browser.startedAt,runtime.value.baseline.startedAt].every(t=>Date.parse(t)>=sourceTime*1000),"PR303_RUNTIME_TIME");
  keys(a.reviews, ["A11", "A23"], "PR303_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR303_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR303_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR303_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR303_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR303_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR303_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR303_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR303_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR303_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR303_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR303_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr303\n"); }
  else { need(options.artifactRoot, "PR303_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR303_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
