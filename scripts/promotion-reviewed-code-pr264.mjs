#!/usr/bin/env node
// Dedicated PR264 source integration for successor PR274; no general exemption.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, MANIFEST, assertArtifactSet } from "./promotion-required-check-legacy-successor-v1.mjs";

export const BASE = "000e23d2951b31211370bd467dc56a953d8fcd54";
export const ORIGINAL_HEAD = "95534309f4fae99c484b9dd79185c207b168982a";
export const SOURCE_TREE = "547849e0d198eb185ba1287a997118b96904986b";
// Owner-authorized freeze binds the real source commit, published successor PR,
// and freshly observed source. Acceptance still requires exact reviewed T/E.
// No CLI option or environment variable can supply production bindings.
export const SOURCE = "0e11c83888b5f463b0169ebb3b5f73bba2e9f500";
export const PULL_REQUEST = 274;
export const OBSERVATION_SHA = "728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758";
export const PREDECESSOR = SOURCE;
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const SOURCE_INVENTORY = "c0d6c9555082ed61adfe9d412b4d74b0f975f9e254f1441c890e72901fc3f297";
export const DIRECTORY = "coordination/integration/reviewed-code/pr264-v1";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const SOURCE_PATHS = Object.freeze([
  "components/visualizations/ConfiguredVisualizationLab.tsx",
  "tests/e2e/hk-coordinate-transform-user-points.spec.ts"
].sort());
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "scripts/promotion-reviewed-code-pr264.mjs",
  "scripts/promotion-reviewed-code-pr264.test.mjs",
  "docs/pr264-reviewed-code-gate.md"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, `${DIRECTORY}/source-observation.json`, `${DIRECTORY}/source-checks.json`,
  ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])
].sort());
export const PRESERVED_PATHS = Object.freeze([
  "scripts/promotion-reviewed-code-pr259.mjs", "scripts/promotion-reviewed-code-pr259.test.mjs",
  "scripts/promotion-reviewed-code-pr270-pr271.mjs", "scripts/promotion-reviewed-code-pr270-pr271.test.mjs",
  "coordination/integration/reviewed-code/pr259-v3",
  "coordination/integration/reviewed-code/pr270-pr271-v1",
  "coordination/integration/legacy-successor",
  "scripts/promotion-required-check-legacy-successor-v1.mjs",
  "scripts/promotion-workflow-json-guard.mjs"
].sort());
const IDENTITIES = Object.freeze({ A11: "/root/a11_pr264_review", A23: "/root/a23_pr264_contract_design" });
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const HASH = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
export const PERMISSIONS = Object.freeze({ ordinaryCodeEligible: true, liveAllowed: false, integrationAllowed: false, previewAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false });
export const BROWSER_TITLES = Object.freeze(["Translate", "Reflect", "Dilate"].map(mode => `student-entered points obey ${mode} and share the triangle's invariant`));
export const COMMANDS = Object.freeze([
  ["models", ["--import", "tsx", "--test", "components/visualizations/configuredVisualizationLabModel.test.ts", "components/visualizations/configuredVisualizationLabRegressions.test.ts"]],
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]],
  ["browser", ["node_modules/@playwright/test/cli.js", "test", "tests/e2e/hk-coordinate-transform-user-points.spec.ts", "--project=desktop-chrome", "--workers=1", "--retries=0", "--reporter=json"]]
]);
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const digest = value => hash(Buffer.from(stable(value)));
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "REVIEWED_CODE_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function rootGitDir(root) {
  const entry = path.join(root, ".git"), stat = lstatSync(entry);
  need(!stat.isSymbolicLink(), "REVIEWED_CODE_GIT_ALIAS");
  if (stat.isDirectory()) return realpathSync(entry);
  need(stat.isFile(), "REVIEWED_CODE_GIT_POINTER");
  const match = readFileSync(entry, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "REVIEWED_CODE_GIT_POINTER"); return realpathSync(path.resolve(root, match[1]));
}
function git(root, ...args) { return execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${rootGitDir(root)}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false", ...args], { cwd: root, env: GIT_ENV, maxBuffer: 128 * 1024 * 1024, timeout: 30000 }); }
function line(root, ...args) { return git(root, ...args).toString("utf8").trim(); }
function ancestor(root, a, b) { git(root, "merge-base", "--is-ancestor", a, b); }
function changed(root, a, b) { return git(root, "diff", "--name-only", "--no-renames", "-z", a, b).toString("utf8").split("\0").filter(Boolean).sort(); }
function parents(root, ref) { return line(root, "show", "-s", "--format=%P", ref).split(" "); }
function tree(root, ref) { return line(root, "rev-parse", `${ref}^{tree}`); }
function blob(root, ref, file, optional = false) {
  need(typeof file === "string" && !path.isAbsolute(file) && !file.split("/").some(x => !x || x === "." || x === "..") && !file.includes("\\"), "REVIEWED_CODE_PATH");
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  if (optional && rows.length === 0) return null;
  need(rows.length === 1, "REVIEWED_CODE_BLOB_MISSING");
  const match = rows[0].match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u);
  need(match && match[3] === file, "REVIEWED_CODE_NONREGULAR_BLOB");
  const bytes = git(root, "show", `${ref}:${file}`);
  return { mode: match[1], objectId: match[2], rawSha256: hash(bytes), bytes };
}
function identity(row) { if (!row) return null; const { bytes, ...result } = row; return result; }
export function inventory(root, a, b) { return changed(root, a, b).map(file => ({ path: file, before: identity(blob(root, a, file, true)), after: identity(blob(root, b, file, true)) })); }
function regular(root, file) {
  const absolute = path.join(root, file), stat = lstatSync(absolute);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "REVIEWED_CODE_FILE");
  return readFileSync(absolute);
}
function tracked(root, ref, file) {
  const item = blob(root, ref, file);
  need(regular(root, file).equals(item.bytes), "REVIEWED_CODE_WORKTREE_DRIFT");
  return { ...item, value: parse(item.bytes) };
}
function clean(root) { need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "REVIEWED_CODE_DIRTY"); }

export function assertMaterializedTree(root, head) {
  // git status alone cannot detect files hidden by skip-worktree/assume-unchanged.
  const flags = git(root, "ls-files", "-v", "-z").toString("utf8").split("\0").filter(Boolean);
  need(flags.every(row => row.startsWith("H ")), "REVIEWED_CODE_INDEX_FLAGS");
  const rows = new TextDecoder("utf-8", { fatal: true }).decode(git(root, "ls-tree", "-r", "-z", head)).split("\0").filter(Boolean);
  for (const row of rows) {
    const match = row.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u);
    need(match, "REVIEWED_CODE_SOURCE_MODE");
    const file = path.join(root, match[3]), stat = lstatSync(file);
    need(stat.isFile() && !stat.isSymbolicLink() && realpathSync(file) === file && ((stat.mode & 0o111) ? "100755" : "100644") === match[1], "REVIEWED_CODE_SOURCE_FILE");
    const bytes = readFileSync(file);
    const objectId = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    need(objectId === match[2], "REVIEWED_CODE_SOURCE_BYTES");
  }
}

export function assertFrozen() {
  need(COMMIT.test(SOURCE ?? "") && HASH.test(OBSERVATION_SHA ?? "") && Number.isSafeInteger(PULL_REQUEST) && PULL_REQUEST > 0 && ![259, 264, 270, 271, 272].includes(PULL_REQUEST), "PR264_ADMISSION_NOT_FROZEN");
}
export function assertPreservedContracts(root, ref) {
  for (const file of PRESERVED_PATHS) {
    const before = git(root, "ls-tree", "-z", BASE, "--", file);
    need(before.length > 0 && before.equals(git(root, "ls-tree", "-z", ref, "--", file)), "REVIEWED_CODE_PRIOR_CONTRACT");
  }
}
function assertSource(root) {
  same(parents(root, SOURCE), [BASE, ORIGINAL_HEAD], "REVIEWED_CODE_SOURCE_PARENT");
  need(tree(root, SOURCE) === SOURCE_TREE, "REVIEWED_CODE_SOURCE_TREE");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "REVIEWED_CODE_SOURCE_PATHS");
  for (const file of SOURCE_PATHS) same(identity(blob(root, SOURCE, file)), identity(blob(root, ORIGINAL_HEAD, file)), "REVIEWED_CODE_SOURCE_PROVENANCE");
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
  assertPreservedContracts(root, SOURCE);
}
export function assertEventComposition(eventName, event, actual) {
  assertFrozen();
  need(["pull_request", "push"].includes(eventName), "REVIEWED_CODE_EVENT");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(COMMIT.test(base ?? "") && COMMIT.test(head ?? "") && head === actual.head, "REVIEWED_CODE_EVENT_HEAD");
  need(actual.headDescendsEvidence && actual.baseAncestorHead && actual.headTree === actual.evidenceTree, "REVIEWED_CODE_COMPOSITION");
  if (eventName === "pull_request") {
    need(event.number === PULL_REQUEST && base === BASE, "REVIEWED_CODE_PR_BASE");
  } else {
    need(event.ref === "refs/heads/main" && actual.baseDescendsBaseline && (base === BASE || actual.baseTree === actual.evidenceTree), "REVIEWED_CODE_PUSH_BASE");
  }
  return { eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, baseCommit: base, headCommit: head };
}

export function preflight({ repoRoot, eventName, eventPath }) {
  assertFrozen();
  const root = realpathSync(repoRoot); need(root === repoRoot, "REVIEWED_CODE_ROOT_ALIAS"); clean(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "REVIEWED_CODE_SHALLOW");
  const head = line(root, "rev-parse", "HEAD");
  const admission = tracked(root, head, ADMISSION), a = admission.value;
  keys(a, ["schemaVersion", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest", "toolingRelease", "toolingTree", "toolingDigest", "observationRawSha256", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr264.v1" && a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === tree(root, SOURCE) && a.sourceInventoryDigest === SOURCE_INVENTORY && a.observationRawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION");
  assertSource(root);
  ancestor(root, BASE, SOURCE); ancestor(root, ORIGINAL_HEAD, SOURCE); ancestor(root, SOURCE, head);
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
  need(COMMIT.test(a.toolingRelease ?? "") && HASH.test(a.toolingDigest ?? "") && HASH.test(a.checksRawSha256 ?? ""), "REVIEWED_CODE_RELEASE");
  same(parents(root, a.toolingRelease), [PREDECESSOR], "REVIEWED_CODE_RELEASE_PARENT");
  same(changed(root, PREDECESSOR, a.toolingRelease), CODE_PATHS, "REVIEWED_CODE_TOOLING_PATHS");
  need(tree(root, a.toolingRelease) === a.toolingTree && digest(inventory(root, PREDECESSOR, a.toolingRelease)) === a.toolingDigest, "REVIEWED_CODE_TOOLING_DIGEST");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && COMMIT.test(additions[0]), "REVIEWED_CODE_ADMISSION_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingRelease], "REVIEWED_CODE_EVIDENCE_PARENT");
  same(changed(root, a.toolingRelease, evidenceCommit), EVIDENCE_PATHS, "REVIEWED_CODE_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) {
    need(blob(root, a.toolingRelease, file, true) === null, "REVIEWED_CODE_EVIDENCE_REUSE");
    need(blob(root, evidenceCommit, file).mode === "100644", "REVIEWED_CODE_EVIDENCE_MODE");
  }
  ancestor(root, evidenceCommit, head);
  const event = parse(readFileSync(eventPath));
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  need(COMMIT.test(base ?? ""), "REVIEWED_CODE_EVENT_BASE");
  ancestor(root, base, head); ancestor(root, BASE, base);
  const eventBinding = assertEventComposition(eventName, event, { head, headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: tree(root, head), evidenceTree: tree(root, evidenceCommit), baseTree: tree(root, base) });
  need(a.reviews && !Array.isArray(a.reviews), "REVIEWED_CODE_REVIEWS"); keys(a.reviews, ["A11", "A23"]);
  for (const role of ["A11", "A23"]) {
    const ref = a.reviews[role]; keys(ref, ["decisionRawSha256", "reportRawSha256"]);
    const decisionPath = `${DIRECTORY}/${role.toLowerCase()}-review.json`, reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`;
    const review = tracked(root, head, decisionPath), report = blob(root, head, reportPath), r = review.value;
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling", "toolingDigest", "sourceInventoryDigest", "observationRawSha256", "checksRawSha256", "result", "report", "liveAllowed"]);
    keys(r.report, ["path", "rawSha256"]);
    need(review.rawSha256 === ref.decisionRawSha256 && report.rawSha256 === ref.reportRawSha256 && r.schemaVersion === "promotion-reviewed-code-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] && r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingRelease && r.toolingDigest === a.toolingDigest && r.sourceInventoryDigest === SOURCE_INVENTORY && r.observationRawSha256 === OBSERVATION_SHA && r.checksRawSha256 === a.checksRawSha256 && r.result === "approved-for-ordinary-code-required-check" && r.liveAllowed === false && r.report.path === reportPath && r.report.rawSha256 === report.rawSha256, "REVIEWED_CODE_REVIEW_BINDING");
    need(typeof r.reviewedAt === "string" && Number.isFinite(Date.parse(r.reviewedAt)) && new Date(r.reviewedAt).toISOString() === r.reviewedAt && Date.parse(r.reviewedAt) <= Date.now(), "REVIEWED_CODE_REVIEW_TIME");
  }
  const observation = tracked(root, head, `${DIRECTORY}/source-observation.json`);
  need(observation.rawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  const checks = tracked(root, head, `${DIRECTORY}/source-checks.json`);
  need(checks.rawSha256 === a.checksRawSha256, "REVIEWED_CODE_CHECKS_BINDING");
  assertPreservedContracts(root, head);
  // The full root-tree equality above covers every candidate, projection, old
  // review, dependency, historical record and file mode; none is exempted.
  return { root, head, admission: a, admissionCommit: evidenceCommit, event: eventBinding, expectedObservation: observation.value };
}

export async function observeCurrent(context) {
  assertMaterializedTree(context.root, context.head);
  const manifest = tracked(context.root, context.head, MANIFEST).value;
  const historical = tracked(context.root, context.head, manifest.historical.manifest.path);
  need(historical.rawSha256 === manifest.historical.manifest.rawSha256, "REVIEWED_CODE_HISTORICAL_MANIFEST");
  const { observePreparation } = await import(pathToFileURL(path.join(context.root, "coordination/integration/legacy-successor/contract.mjs")));
  const observation = await observePreparation(context.root, historical.value);
  same(observation, context.expectedObservation, "REVIEWED_CODE_CURRENT_REACHABILITY");
  const registry = tracked(context.root, context.head, manifest.legacyResolution.registryPath);
  need(registry.rawSha256 === manifest.legacyResolution.rawSha256, "REVIEWED_CODE_REGISTRY");
  same(observation.canonicalAudit, registry.value.expectedCanonicalAudit, "REVIEWED_CODE_CANONICAL_AUDIT");
  assertMaterializedTree(context.root, context.head);
  clean(context.root); need(line(context.root, "rev-parse", "HEAD") === context.head, "REVIEWED_CODE_HEAD_MOVED");
  return { reviewedObservationRawSha256: OBSERVATION_SHA, runtimePolicyDigest: digest(observation.expectedRuntimePolicy), canonicalAuditDigest: observation.canonicalAuditDigest };
}

function artifactDirectory(value) {
  const physical = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(physical === value && physical.startsWith(`${temporary}/`) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "REVIEWED_CODE_ARTIFACT_ROOT");
  return physical;
}
function save(root, file, value) { writeFileSync(path.join(root, file), `${stable(value)}\n`, { flag: "wx", mode: 0o600 }); }
export function verifyBrowserReport(bytes) {
  const report = parse(bytes), specifications = [];
  function walk(suite) {
    need(suite && Array.isArray(suite.specs) && Array.isArray(suite.suites ?? []), "REVIEWED_CODE_BROWSER_SCHEMA");
    specifications.push(...suite.specs);
    for (const child of suite.suites ?? []) walk(child);
  }
  need(Array.isArray(report.suites) && Array.isArray(report.errors) && report.errors.length === 0, "REVIEWED_CODE_BROWSER_SCHEMA");
  for (const suite of report.suites) walk(suite);
  need(specifications.length === BROWSER_TITLES.length, "REVIEWED_CODE_BROWSER_COVERAGE");
  same(specifications.map(spec => spec.title).sort(), [...BROWSER_TITLES].sort(), "REVIEWED_CODE_BROWSER_TITLES");
  for (const spec of specifications) {
    need(spec.file?.replaceAll("\\", "/").endsWith("hk-coordinate-transform-user-points.spec.ts") && spec.ok === true && Array.isArray(spec.tests) && spec.tests.length === 1, "REVIEWED_CODE_BROWSER_SPEC");
    const test = spec.tests[0];
    need(test.projectName === "desktop-chrome" && test.expectedStatus === "passed" && test.status === "expected" && Array.isArray(test.results) && test.results.length === 1, "REVIEWED_CODE_BROWSER_TEST");
    const result = test.results[0];
    need(result.status === "passed" && result.retry === 0 && Array.isArray(result.errors) && result.errors.length === 0, "REVIEWED_CODE_BROWSER_RESULT");
  }
  need(report.stats?.expected === 3 && report.stats.unexpected === 0 && report.stats.flaky === 0 && report.stats.skipped === 0, "REVIEWED_CODE_BROWSER_STATS");
}
export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "REVIEWED_CODE_TEST_SET");
  for (let index = 0; index < COMMANDS.length; index++) {
    const [name, args] = COMMANDS[index], row = records[index]; keys(row, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    need(row.name === name && row.exitCode === 0, "REVIEWED_CODE_TEST_EXIT"); same(row.args, args, "REVIEWED_CODE_TEST_COMMAND");
    need(hash(regular(root, `${name}.stdout`)) === row.stdoutSha256 && hash(regular(root, `${name}.stderr`)) === row.stderrSha256, "REVIEWED_CODE_TEST_BYTES");
    if (name === "browser") verifyBrowserReport(regular(root, "browser.stdout"));
  }
}
export async function check(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot), records = [];
  assertMaterializedTree(context.root, context.head);
  for (const [name, args] of COMMANDS) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: { ...Object.fromEntries(["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "CI", "PLAYWRIGHT_BROWSERS_PATH"].filter(key => typeof process.env[key] === "string").map(key => [key, process.env[key]])), AI_TUTOR_PROVIDER_PROFILE: "offline-fixture", PLAYWRIGHT_BROWSER_CHANNEL: "", PLAYWRIGHT_RUN_ID: `pr264-admission-${context.head}`, PLAYWRIGHT_PORT: "3394" }, timeout: name === "browser" ? 900000 : 300000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, `${name}.stdout`), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, `${name}.stderr`), stderr, { flag: "wx", mode: 0o600 });
    need(result.status === 0 && !result.signal && !result.error, "REVIEWED_CODE_TEST_FAILED");
    records.push({ name, args, exitCode: result.status, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  }
  verifyTestRecords(artifacts, records);
  const observation = await observeCurrent(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.v1", event: context.event, sourceCommit: SOURCE, admissionCommit: context.admissionCommit, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "sourceCommit", "admissionCommit", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.v1" && current.sourceCommit === SOURCE && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
  same(current.event, context.event, "REVIEWED_CODE_CURRENT_EVENT"); verifyTestRecords(artifacts, current.tests);
  assertArtifactSet(options.baselineArtifacts);
  same(current.observation, await observeCurrent(context), "REVIEWED_CODE_CURRENT_OBSERVATION");
  const baselineRoot = realpathSync(options.baselineRoot);
  need(baselineRoot === options.baselineRoot && baselineRoot !== context.root && line(baselineRoot, "rev-parse", "HEAD") === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_ROOT"); clean(baselineRoot); assertMaterializedTree(baselineRoot, HISTORICAL_BASE);
  const baselineEvent = parse(readFileSync(options.baselineEvent));
  same(baselineEvent, { number: 259, pull_request: { base: { sha: HISTORICAL_BASE }, head: { sha: HISTORICAL_BASE } } }, "REVIEWED_CODE_BASELINE_EVENT");
  const legacy = path.join(baselineRoot, "scripts/promotion-required-check-legacy-successor-v1.mjs");
  need(hash(readFileSync(legacy)) === blob(context.root, HISTORICAL_BASE, "scripts/promotion-required-check-legacy-successor-v1.mjs").rawSha256, "REVIEWED_CODE_BASELINE_CHECKER");
  const { verify } = await import(pathToFileURL(legacy));
  const previous = await verify({ repoRoot: baselineRoot, eventName: "pull_request", eventPath: options.baselineEvent, artifactRoot: options.baselineArtifacts });
  assertMaterializedTree(baselineRoot, HISTORICAL_BASE); clean(baselineRoot);
  need(previous.result === "pass" && previous.event.baseCommit === HISTORICAL_BASE && previous.event.headCommit === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_PROOF");
  const value = { schemaVersion: "promotion-reviewed-code-decision.v1", result: "pass", scope: "exact-pr264-source-integration-only", event: context.event, sourceCommit: SOURCE, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, sourceInventoryDigest: SOURCE_INVENTORY, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: previous.decisionDigest, artifactRawSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { "repo": "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "baseline-root": "baselineRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr264\n"); return; }
  let result;
  if (operation === "preflight") result = preflight(options).event;
  if (operation === "check") result = await check(options);
  if (["finalize", "verify"].includes(operation)) {
    result = await decision(options);
    if (operation === "finalize") save(artifactDirectory(options.artifactRoot), "decision.json", result);
    else verifyDecision(parse(regular(artifactDirectory(options.artifactRoot), "decision.json")), result);
  }
  process.stdout.write(`${stable(result)}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write(`${JSON.stringify({ result: "blocked", code: error.code ?? error.message, liveAllowed: false })}\n`); process.exitCode = 2; });
