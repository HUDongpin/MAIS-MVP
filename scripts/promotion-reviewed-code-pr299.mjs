#!/usr/bin/env node
// Exact PR299 P2-copy-only S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap, commandSummary as parseCommandSummary } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "6e38018d2ab794bdf4034286fa05bd031c699a23";
export const SOURCE = "8bcb388e3eb27fb5d602557f0fa03ecfdb8755ea";
export const SOURCE_TREE = "1325966de5df35028c2f783413c51b03f9024f5d";
export const SOURCE_INVENTORY = "8f8b1311cf07600c31e61253b77f885dd99f6a629abbf7647af09e7bdb137a41";
export const CHECKS_SHA = "a5e916a43b1ab49c0e544489131a19e7a836600b165a2c950a4de63078f970e9";
export const PULL_REQUEST = 299;
export const DIRECTORY = "coordination/integration/reviewed-code/pr299-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze(["data/lessons.ts"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr299.mjs","scripts/promotion-reviewed-code-pr299.test.mjs","docs/pr299-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json","runtime-evidence.json",...["a18","a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A18:"/root/p2_a18_admission", A11:"/root/p2_evidence_review", A23:"/root/p2_a23_admission" });
export const SCOPE = "exact-pr299-p2-copy-required-check-only";
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
    "name": "lesson-render-routing",
    "args": [
      "node_modules/tsx/dist/cli.mjs",
      "--tsconfig",
      "tsconfig.lesson-visualization-render.json",
      "--test",
      "--test-reporter=tap",
      "components/visualizations/lessonVisualizationRender.test.tsx",
      "components/visualizations/bespokeLabRouting.test.ts"
    ],
    "summary": {
      "tests": 8,
      "suites": 0,
      "pass": 8,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "8b585d58dc37c6628a1eec352ff5ba17427660061e1393e8946c83a2b2fdefda"
    }
  },
  {
    "name": "zh-hans",
    "args": [
      "scripts/audit-zh-hans.mjs",
      "--fail-on-critical"
    ],
    "summary": {
      "advisory": 3509,
      "ceiling": 3512,
      "nonPackCritical": 0,
      "packRegression": false
    }
  }
].map(command => Object.freeze({ ...command, args: Object.freeze(command.args),
  summary: command.summary === null ? null : Object.freeze(command.summary) })));
export const RUNTIME_SHA = "069d7c90e07711e265e3d159f14cc6996e10b03e7b62f98d43ff3a7474d01294";
export const SOURCE_BEFORE_SHA = "d41b63a1cb2d04fbfc8c15bec036641a9cd9c91d7d5ee823f79610ef30bf3918";
export const SOURCE_AFTER_SHA = "ebef4b43e92c9a97d036bf5e86a563c04ab6cd650d6a14d0a299f62ef9fd02b2";
export const RUNTIME_DEPENDENCIES = Object.freeze([
  {
    "path": "components/visualizations/GeometryExplorer.tsx",
    "sha256": "bed0fc1e081720293cdea19479ec734e3430536597ac22ad4fcaa593bfd7900c",
    "same_as_baseline": true
  },
  {
    "path": "components/lesson/LessonView.tsx",
    "sha256": "27d3c3420b986500f948d5f1b3bd4e204ea76c74e558c73413aa71991cd088bd",
    "same_as_baseline": true
  },
  {
    "path": "components/lesson/lessonContentText.ts",
    "sha256": "5a41082852116a890afc790e5fc418c59eadbb90272a75861de7f450a530351f",
    "same_as_baseline": true
  },
  {
    "path": "data/topics.ts",
    "sha256": "91215da1fd6b955d898459e32169742191442e6942e07a7880ddf7fe198268ff",
    "same_as_baseline": true
  },
  {
    "path": "data/visualizationLabs.ts",
    "sha256": "53e742b29845f014d378440829ea6e03c2b4ce2f26fe493b002d022890998923",
    "same_as_baseline": true
  },
  {
    "path": "lib/i18n.ts",
    "sha256": "9832c03eb485e7efec3ced47394bfe393006cae14a0d5748d5aae9f7e03a71bb",
    "same_as_baseline": true
  },
  {
    "path": "types/index.ts",
    "sha256": "b244961341a1f5296cdd6169c4bf5370f39c11eb8b27a8098bdc7837702985d7",
    "same_as_baseline": true
  },
  {
    "path": "components/visualizations/lessonVisualizationRender.test.tsx",
    "sha256": "0a1b3f63d3fe9d57d001ab810a7020c9132cfa631d066befe4f39387db327c45",
    "same_as_baseline": true
  },
  {
    "path": "components/visualizations/bespokeLabRouting.test.ts",
    "sha256": "567bcf43cc7bb4c0412b6c9335c067f7fd9fae5e116e2059c1112687df38c2da",
    "same_as_baseline": true
  },
  {
    "path": "tsconfig.lesson-visualization-render.json",
    "sha256": "325dcb622458e488c5fe4d14521a32c4545497c71f3d02c576f8c57bcdc9d37f",
    "same_as_baseline": true
  },
  {
    "path": "package.json",
    "sha256": "cea2ef7cd6e778a949fce8cf75a1002dc63503793fb12c6545b7f6e0ce26464f",
    "same_as_baseline": true
  },
  {
    "path": "package-lock.json",
    "sha256": "58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767",
    "same_as_baseline": true
  }
].map(row => Object.freeze(row)));
const BEFORE_COPY = "    visualization: {\n      title: { en: \"Compare lengths on a diagram\", zh: \"在圖形上比較長度\" },\n      content: {\n        en: \"Move points and compare side lengths to support measurement language.\",\n        zh: \"移動點並比較邊長，支援度量語言。\"\n      },\n      moduleId: \"geometry-explorer\",\n      source: \"geometry\"\n    }";
const AFTER_COPY = "    visualization: {\n      title: { en: \"Adjust lengths and compare bars\", zh: \"調整長度，並比較棒形圖\", zhHans: \"调整长度，并比较条形图\" },\n      content: {\n        en: \"Use the A, B and C sliders to change each length in centimetres. Compare the bars to find the longest, then check the total length.\",\n        zh: \"使用 A、B、C 滑塊調整各項的厘米長度。比較棒形圖，找出最長的一項，再查看總長。\",\n        zhHans: \"使用 A、B、C 滑块调整各项的厘米长度。比较条形图，找出最长的一项，再查看总长。\"\n      },\n      moduleId: \"geometry-explorer\",\n      source: \"geometry\"\n    }";
const BROWSER_STATES = Object.freeze([
  {
    "label": "initial",
    "values": [
      6,
      9,
      12
    ],
    "total": 27,
    "longest": "C",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "A maximum with two longest",
    "values": [
      12,
      9,
      12
    ],
    "total": 33,
    "longest": "A, C",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "all maximum and three longest",
    "values": [
      12,
      12,
      12
    ],
    "total": 36,
    "longest": "A, B, C",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "C minimum",
    "values": [
      12,
      12,
      1
    ],
    "total": 25,
    "longest": "A, B",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "all minimum",
    "values": [
      1,
      1,
      1
    ],
    "total": 3,
    "longest": "A, B, C",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "keyboard unit step",
    "values": [
      1,
      2,
      1
    ],
    "total": 4,
    "longest": "B",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "pointer drag C maximum",
    "values": [
      1,
      2,
      12
    ],
    "total": 15,
    "longest": "C",
    "barGeometryAndVisibleSummary": true
  },
  {
    "label": "reset",
    "values": [
      6,
      9,
      12
    ],
    "total": 27,
    "longest": "C",
    "barGeometryAndVisibleSummary": true
  }
]);
export const CONTRACT_TEST_COUNT = 43;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR299_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR299_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR299_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR299_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR299_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR299_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR299_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR299_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR299_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR299_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr298-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr299.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr298-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr298"';
  const stepAnchor = "      - name: Verify exact PR298 monitor admission\n";
  const steps = [
    "      - name: Verify exact PR299 P2 copy admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr299' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr299"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr299.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR299 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr299' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr299",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr299",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR299_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr299" && "$mode" != "reviewed-code-pr298"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR299_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR299_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR299_SOURCE_INVENTORY");
    for (const side of [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR299_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR299_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR299_SOURCE_INVENTORY");
}
export function expectedLessonSource(beforeBytes) {
  need(hash(beforeBytes) === SOURCE_BEFORE_SHA, "PR299_SOURCE_BASE_BYTES");
  const before = new TextDecoder("utf-8", { fatal: true }).decode(beforeBytes);
  need(before.split(BEFORE_COPY).length === 2, "PR299_SOURCE_COPY_ANCHOR");
  return Buffer.from(before.replace(BEFORE_COPY, AFTER_COPY));
}
export function validateSourceBytes(beforeBytes, afterBytes) {
  need(expectedLessonSource(beforeBytes).equals(Buffer.from(afterBytes)) && hash(afterBytes) === SOURCE_AFTER_SHA, "PR299_SOURCE_COPY_SCOPE");
}
export function validateRuntimeEvidence(value) {
  keys(value, ["schemaVersion", "baseCommit", "sourceCommit", "sourceTree", "sourceFile", "sourceFileSha256", "previousExecution",
    "evidenceVerification", "provenance", "browserReexecutedInCi", "liveAllowed", "wholeLessonApproved", "route", "languages",
    "stateCount", "results", "actions", "artifacts", "dependencies", "screenshots", "visualLimit"], "PR299_RUNTIME_SCHEMA");
  need(value.schemaVersion === "pr299-local-browser-evidence.v1" && value.baseCommit === BASE && value.sourceCommit === SOURCE &&
    value.sourceTree === SOURCE_TREE && value.sourceFile === "data/lessons.ts" && value.sourceFileSha256 === SOURCE_AFTER_SHA, "PR299_RUNTIME_SOURCE");
  need(value.browserReexecutedInCi === false && value.liveAllowed === false && value.wholeLessonApproved === false &&
    value.route === "/student/lessons/p2-length-data" && value.stateCount === 24, "PR299_RUNTIME_SCOPE");
  same(value.languages, ["en", "zh", "zhHans"], "PR299_RUNTIME_LANGUAGES");
  keys(value.previousExecution, ["checkedAt", "sourceWorktreeHeadAtExecution", "sourceFileSha256", "recordSha256",
    "priorA18RecordSha256", "priorA18Reviewer", "priorA18Verdict"], "PR299_RUNTIME_PROVENANCE");
  const previous = value.previousExecution;
  need(typeof previous.checkedAt === "string" && Number.isFinite(Date.parse(previous.checkedAt)) && Date.parse(previous.checkedAt) <= Date.now() &&
    previous.sourceWorktreeHeadAtExecution === BASE && previous.sourceFileSha256 === SOURCE_AFTER_SHA &&
    previous.recordSha256 === "3dcf0a955c63b15ec054dcb5c9ba3c6ee5d0721ee477433dba2322ce7144b4ef" &&
    previous.priorA18RecordSha256 === "3c79b3f38da54932887cb8d63f0cff46217ddae25d98a2a71de4601ee501dd5c" &&
    previous.priorA18Reviewer === "/root/a18_p2_copy_review" && previous.priorA18Verdict === "approved-for-integration-review", "PR299_RUNTIME_PROVENANCE");
  keys(value.evidenceVerification, ["reviewer", "manifestSha256", "originalIndependentA18Verified"], "PR299_RUNTIME_PROVENANCE");
  need(value.evidenceVerification.reviewer === IDENTITIES.A11 && value.evidenceVerification.manifestSha256 === "1bd6042007531a88a03b458f96ec191e09b76cdffa5a9e675f40b8996b1d3f50" &&
    value.evidenceVerification.originalIndependentA18Verified === true &&
    value.provenance === "Consumed prior local desktop execution at identical source and dependency bytes; no CI browser replay or production validation." &&
    value.actions === "real keyboard Home/End/ArrowRight and mouse pointer drag" && typeof value.visualLimit === "string" && value.visualLimit.length > 0, "PR299_RUNTIME_PROVENANCE");
  need(Array.isArray(value.results) && value.results.length === 3, "PR299_RUNTIME_STATES");
  for (let index = 0; index < value.results.length; index++) {
    const result = value.results[index]; keys(result, ["language", "states", "pageErrors", "exactTitleAndCopyVisible"], "PR299_RUNTIME_STATES");
    need(result.language === value.languages[index] && result.exactTitleAndCopyVisible === true, "PR299_RUNTIME_STATES");
    same(result.pageErrors, [], "PR299_RUNTIME_ERRORS"); same(result.states, BROWSER_STATES, "PR299_RUNTIME_STATES");
  }
  same(value.dependencies, RUNTIME_DEPENDENCIES, "PR299_RUNTIME_DEPENDENCIES");
  for (const [name, expectedLength] of [["artifacts", 15], ["screenshots", 3]]) {
    need(Array.isArray(value[name]) && value[name].length === expectedLength, "PR299_RUNTIME_ARTIFACTS");
    const paths = new Set();
    for (const row of value[name]) {
      keys(row, ["path", "sha256", "bytes"], "PR299_RUNTIME_ARTIFACTS");
      need(typeof row.path === "string" && !row.path.includes("\\") && !path.posix.isAbsolute(row.path) && path.posix.normalize(row.path) === row.path &&
        !row.path.startsWith("../") && !paths.has(row.path) && HASH.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes > 0, "PR299_RUNTIME_ARTIFACTS");
      need(row.path.startsWith(name === "screenshots" ? "output/playwright/pr172-p2-length-copy/" : ".local/pr172-p2-length-copy/"), "PR299_RUNTIME_ARTIFACTS");
      paths.add(row.path);
    }
  }
}
export function validateRuntimeDependencies(root, value, head) {
  for (const dependency of value.dependencies) {
    const original = blob(root, BASE, dependency.path), source = blob(root, SOURCE, dependency.path), current = blob(root, head, dependency.path);
    need(original.equals(source) && source.equals(current) && hash(source) === dependency.sha256, "PR299_RUNTIME_DEPENDENCY_DRIFT");
  }
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR299_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr299-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR299_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR299_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR299_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR299_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR299_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR299_TEST_REPORT"); }
}
export function commandSummary(name, stdout) {
  try { return parseCommandSummary(name, stdout); } catch { fail("PR299_COMMAND_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_ENABLE_DEMO_USER: "false",
    AI_TUTOR_PROVIDER_PROFILE: "offline-fixture", TSX_DISABLE_CACHE: "1", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR299_ARTIFACT_ROOT");
  return root;
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR299_COMMAND_FAILED");
  const summary = name === "gate-contract" ? testSummary(Buffer.from(result.stdout ?? [])) : commandSummary(name, Buffer.from(result.stdout ?? []));
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR299_CONTRACT_COUNT");
  else {
    const spec = COMMANDS.find(command => command.name === name);
    need(spec, "PR299_COMMANDS"); same(summary, spec.summary, "PR299_TEST_COUNT_OR_NAMES");
  }
  return summary;
}
export function check(options) {
  need(Number(process.versions.node.split(".")[0]) === 24, "PR299_NODE_VERSION");
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr299.test.mjs"] }, ...COMMANDS];
  const records = [];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command.args, { cwd: context.root, env: commandEnvironment(), timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, command.name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, command.name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    const summary = verifyExecution(command.name, result);
    records.push({ name: command.name, args: command.args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), summary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR299_SOURCE_MOVED");
  const decision = { schemaVersion: "pr299-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, consumedRuntimeEvidenceSha256: RUNTIME_SHA,
    browserReexecutedInCi: false, productionValidated: false, wholeLessonApproved: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "runtimeEvidenceRawSha256", "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR299_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr299-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === (role === "A18" ? "approved-for-integration-review" : "approved-for-exact-pr299-required-check"), "PR299_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, runtimeEvidenceRawSha256: RUNTIME_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR299_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR299_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR299_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR299_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR299_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "runtimeEvidenceRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr299-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA && a.runtimeEvidenceRawSha256 === RUNTIME_SHA, "PR299_SCOPE");
  same(a.permissions, PERMISSIONS, "PR299_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR299_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [BASE], "PR299_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  validateSourceBytes(blob(root, BASE, "data/lessons.ts"), blob(root, SOURCE, "data/lessons.ts"));
  need(regular(root, "data/lessons.ts").equals(blob(root, SOURCE, "data/lessons.ts")), "PR299_SOURCE_COPY_DRIFT");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr299-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR299_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR299_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR299_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR299_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR299_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR299_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR299_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR299_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR299_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR299_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR299_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR299_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json"), runtime = tracked(root, head, DIRECTORY + "/runtime-evidence.json");
  need(hash(checks.bytes) === CHECKS_SHA && hash(runtime.bytes) === RUNTIME_SHA, "PR299_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value); validateRuntimeEvidence(runtime.value); validateRuntimeDependencies(root, runtime.value, head);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR299_CHECKS_TIME");
  need(Date.parse(runtime.value.previousExecution.checkedAt) <= sourceTime * 1000, "PR299_RUNTIME_EXECUTION_TIME");
  keys(a.reviews, ["A18", "A11", "A23"], "PR299_REVIEWS");
  for (const role of ["A18", "A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR299_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR299_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR299_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR299_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR299_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR299_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR299_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value, runtime: runtime.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR299_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR299_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR299_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR299_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr299\n"); }
  else { need(options.artifactRoot, "PR299_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR299_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
