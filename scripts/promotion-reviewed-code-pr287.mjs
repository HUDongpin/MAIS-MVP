#!/usr/bin/env node
// PR287 is a new ordinary-code admission. No historical approval is transferred.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";
import {
  hash, inventory, assertMaterializedTree, commandEnvironment,
  observeCurrent as observeHistoricalPolicy
} from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";

export const BASE = "f573ac62c97cb0716054bc516f7d5136491ca002";
export const SOURCE = "58070283c50c7a98a483964eb92907e9064cf9c4";
export const SOURCE_TREE = "61f7e18be23f29f3b35ded8bbfaf2fe8c002c1b9";
export const SOURCE_INVENTORY = "7229d9a25e6054dd848708c172c345cea207c84c51af78e0f3fba915d27f1a76";
export const SOURCE_CHECKS_SHA = "4ed2adf6254f5d094b20da0b8cb2208488eca0eff78083d7f7ec8ccebebe77d0";
export const SOURCE_OBSERVATION_SHA = "34194c2cc43e070f11b1928c680d53dff993b3187bdd9047165fc7fddc9b5056";
export const PULL_REQUEST = 287;
export const HISTORICAL_E2 = "9d789219a59625d5f7ff43a69205aec954f9518a";
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const HISTORICAL_EXECUTION = "ff709c0141ef8660604a20340b1c476bf2941f60";
export const DIRECTORY = "coordination/integration/reviewed-code/pr287-v1";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const BINDING = "scripts/promotion-reviewed-code-pr287-binding.mjs";
export const SCOPE = "exact-pr287-required-check-only";
export const REVIEW_RESULT = "approved-for-ordinary-code-required-check";
export const REVIEWERS = Object.freeze({ A11: "/root/a11_pr287_admission", A23: "/root/a23_pr287_admission" });
export const PERMISSIONS = Object.freeze({
  ordinaryCodeEligible: false, liveAllowed: false, integrationAllowed: false,
  previewAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false
});
export const SOURCE_PATHS = Object.freeze([
  "AGENTS.md", "CLAUDE.md", "scripts/next-clean-build.mjs", "scripts/next-clean-build.test.mjs",
  "coordination/agent-guidance/A10-rule-copy-preserve-and-align-20260908.md",
  "coordination/session-logs/2026-10-20-A22-A10-build-attestation-rules-01a159ed.md"
].sort());
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", BINDING,
  "scripts/promotion-reviewed-code-pr287.mjs", "scripts/promotion-reviewed-code-pr287.test.mjs",
  "docs/pr287-reviewed-code-gate.md"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, `${DIRECTORY}/source-checks.json`, `${DIRECTORY}/source-observation.json`,
  `${DIRECTORY}/source-inventory.json`, `${DIRECTORY}/source-intake.json`,
  ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])
].sort());
export const COMMANDS = Object.freeze([
  ["admission", ["--test", "scripts/promotion-reviewed-code-pr287.test.mjs"]],
  ["build", ["--test", "scripts/next-clean-build.test.mjs"]],
  ["adjacent", ["--test", "--test-concurrency=1", "scripts/cleanup-generated-artifacts.test.mjs", "scripts/release-build-gate.test.mjs", "scripts/check-stray-generated-types.test.mjs", "scripts/vercel-staging-build-gate.test.mjs"]],
  ["governance", ["--test", "--test-name-pattern=^package and coordination contracts preserve security versions and closure rules$", "scripts/release-governance.test.mjs"]]
]);
const JOBS = ["postgres-integration", "resend-webhook-postgres-integration", "snapshot", "teacher-notice-outbox-postgres16", "teacher-parent-e2e", "validate", "visualization-browser"];
const COMMIT = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const BINDING_KEYS = ["schemaVersion", "toolingCommit", "toolingTree", "toolingDigest", "evidenceCommit", "a11DecisionSha256", "a11ReportSha256", "a23DecisionSha256", "a23ReportSha256"];
const digest = value => hash(Buffer.from(stable(value)));
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, expected, code = "PR287_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...expected].sort(), code);
}
export function renderBinding(value) { return `export default Object.freeze(${stable(value)});\n`; }
export function parseBinding(bytes, pending = false) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const prefix = "export default Object.freeze(", suffix = ");\n";
  need(text.startsWith(prefix) && text.endsWith(suffix), "PR287_BINDING_LITERAL");
  const value = parse(Buffer.from(text.slice(prefix.length, -suffix.length)));
  keys(value, BINDING_KEYS, "PR287_BINDING_SCHEMA");
  need(value.schemaVersion === "pr287-final-binding.v1", "PR287_BINDING_SCHEMA");
  need(renderBinding(value) === text, "PR287_BINDING_LITERAL");
  for (const key of BINDING_KEYS.filter(key => key !== "schemaVersion")) {
    need(pending ? value[key] === null : (key.endsWith("Commit") || key === "toolingTree" ? COMMIT : HASH).test(value[key] ?? ""), "PR287_BINDING_NOT_FROZEN");
  }
  return value;
}
function rootGitDir(root) {
  const entry = path.join(root, ".git"), stat = lstatSync(entry);
  need(!stat.isSymbolicLink(), "PR287_GIT_ALIAS");
  if (stat.isDirectory()) return realpathSync(entry);
  need(stat.isFile(), "PR287_GIT_POINTER");
  const match = readFileSync(entry, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR287_GIT_POINTER");
  return realpathSync(path.resolve(root, match[1]));
}
function git(root, ...args) {
  return execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${rootGitDir(root)}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false", ...args],
    { cwd: root, env: GIT_ENV, maxBuffer: 128 * 1024 * 1024, timeout: 30000 });
}
function line(root, ...args) { return git(root, ...args).toString("utf8").trim(); }
function parents(root, ref) { return line(root, "show", "-s", "--format=%P", ref).split(" "); }
function tree(root, ref) { return line(root, "rev-parse", `${ref}^{tree}`); }
function changed(root, a, b) { return git(root, "diff", "--name-only", "--no-renames", "-z", a, b).toString("utf8").split("\0").filter(Boolean).sort(); }
function clean(root) { need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR287_DIRTY"); }
function blob(root, ref, file) {
  const row = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8");
  const match = row.match(/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/u);
  need(match && match[3] === file, "PR287_REGULAR_BLOB");
  return { mode: match[1], objectId: match[2], bytes: git(root, "show", `${ref}:${file}`) };
}
function regular(root, file) {
  need(typeof file === "string" && !path.isAbsolute(file) && !file.includes("\\") && file.split("/").every(part => part && part !== "." && part !== ".."), "PR287_PATH");
  const absolute = path.join(root, file), stat = lstatSync(absolute);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR287_FILE");
  return readFileSync(absolute);
}
function tracked(root, ref, file) {
  const item = blob(root, ref, file);
  need(regular(root, file).equals(item.bytes), "PR287_WORKTREE_DRIFT");
  return item.bytes;
}

export function assertEventComposition(eventName, event, actual) {
  need(["pull_request", "push"].includes(eventName), "PR287_EVENT_SCOPE");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(base === BASE && COMMIT.test(head ?? "") && head === actual.head, "PR287_EVENT_SCOPE");
  need(actual.headTree === actual.finalTree, "PR287_COMPOSITION");
  if (eventName === "pull_request") {
    need(event.number === PULL_REQUEST, "PR287_EVENT_SCOPE");
    need(head === actual.finalCommit, "PR287_COMPOSITION");
    same(actual.parents, [actual.evidenceCommit], "PR287_COMPOSITION");
  } else {
    need(event.ref === "refs/heads/main", "PR287_EVENT_SCOPE");
    same(actual.parents, [BASE, actual.finalCommit], "PR287_COMPOSITION");
  }
  return { eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, baseCommit: base, headCommit: head };
}

export function assertSourceChecks(value) {
  keys(value, ["schemaVersion", "repository", "sourceCommit", "sourceTree", "runId", "attempt", "event", "conclusion", "jobs"]);
  need(value.schemaVersion === "pr287-source-ci.v1" && value.repository === "HUDongpin/MAIS-MVP" && value.sourceCommit === SOURCE && value.sourceTree === SOURCE_TREE &&
    Number.isSafeInteger(value.runId) && value.runId > 0 && value.attempt === 1 && value.event === "pull_request" && value.conclusion === "success", "PR287_SOURCE_CHECKS");
  same(value.jobs, JOBS.map(name => ({ name, conclusion: "success" })), "PR287_SOURCE_CHECKS");
}

export function assertReview(value, role, binding, reportSha256) {
  keys(value, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "baseCommit", "reviewedSource", "sourceTree", "sourceInventoryDigest", "reviewedTooling", "toolingTree", "toolingDigest", "checksRawSha256", "observationRawSha256", "scope", "bindingProcedure", "result", "report", "permissions"]);
  const reviewedAt = Date.parse(value.reviewedAt);
  need(value.schemaVersion === "pr287-independent-review.v1" && value.role === role && value.reviewerIdentity === REVIEWERS[role] &&
    typeof value.reviewedAt === "string" && Number.isFinite(reviewedAt) && new Date(reviewedAt).toISOString() === value.reviewedAt &&
    reviewedAt <= Date.now(), "PR287_REVIEW_IDENTITY");
  need(value.baseCommit === BASE && value.reviewedSource === SOURCE && value.sourceTree === SOURCE_TREE && value.sourceInventoryDigest === SOURCE_INVENTORY &&
    value.reviewedTooling === binding.toolingCommit && value.toolingTree === binding.toolingTree && value.toolingDigest === binding.toolingDigest &&
    value.checksRawSha256 === SOURCE_CHECKS_SHA && value.observationRawSha256 === SOURCE_OBSERVATION_SHA &&
    value.scope === SCOPE && value.bindingProcedure === "T-E-F-literal-binding-v1" && value.result === REVIEW_RESULT, "PR287_REVIEW_BINDING");
  same(value.report, { path: `${DIRECTORY}/${role.toLowerCase()}-review.md`, rawSha256: reportSha256 }, "PR287_REVIEW_REPORT");
  same(value.permissions, PERMISSIONS, "PR287_REVIEW_PERMISSIONS");
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot && HASH.test(SOURCE_OBSERVATION_SHA ?? ""), "PR287_SOURCE_NOT_FROZEN");
  need(fileURLToPath(import.meta.url) === path.join(root, "scripts/promotion-reviewed-code-pr287.mjs"), "PR287_RUNNING_CHECKER");
  clean(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR287_SHALLOW");
  const head = line(root, "rev-parse", "HEAD");
  const bindingBytes = tracked(root, head, BINDING), binding = parseBinding(bindingBytes);
  const { toolingCommit: tooling, evidenceCommit: evidence } = binding;
  same(parents(root, SOURCE), [BASE], "PR287_SOURCE_PARENT");
  need(tree(root, SOURCE) === SOURCE_TREE && tree(root, BASE) === tree(root, HISTORICAL_E2), "PR287_SOURCE_TREE");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "PR287_SOURCE_PATHS");
  const sourceInventory = inventory(root, BASE, SOURCE);
  need(digest(sourceInventory) === SOURCE_INVENTORY, "PR287_SOURCE_INVENTORY");
  same(parents(root, tooling), [SOURCE], "PR287_TOOLING_PARENT");
  same(changed(root, SOURCE, tooling), CODE_PATHS, "PR287_TOOLING_PATHS");
  need(tree(root, tooling) === binding.toolingTree && digest(inventory(root, SOURCE, tooling)) === binding.toolingDigest, "PR287_TOOLING_BINDING");
  const pendingBinding = blob(root, tooling, BINDING);
  need(pendingBinding.mode === "100644", "PR287_BINDING_MODE");
  parseBinding(pendingBinding.bytes, true);
  for (const file of EVIDENCE_PATHS) need(git(root, "ls-tree", "-z", tooling, "--", file).length === 0, "PR287_EARLY_EVIDENCE");
  same(parents(root, evidence), [tooling], "PR287_EVIDENCE_PARENT");
  same(changed(root, tooling, evidence), EVIDENCE_PATHS, "PR287_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(blob(root, evidence, file).mode === "100644", "PR287_EVIDENCE_MODE");
  same(line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n"), [evidence], "PR287_ADMISSION_HISTORY");
  const bindingHistory = line(root, "log", head, "--format=%H", "--", BINDING).split("\n");
  need(bindingHistory.length === 2 && bindingHistory[1] === tooling, "PR287_BINDING_HISTORY");
  const finalCommit = bindingHistory[0];
  same(parents(root, finalCommit), [evidence], "PR287_FINAL_PARENT");
  same(changed(root, evidence, finalCommit), [BINDING], "PR287_FINAL_PATHS");
  const finalBinding = blob(root, finalCommit, BINDING);
  need(finalBinding.mode === "100644" && blob(root, evidence, BINDING).mode === "100644", "PR287_BINDING_MODE");
  need(finalBinding.bytes.equals(bindingBytes), "PR287_FINAL_BINDING");
  const event = assertEventComposition(eventName, parse(readFileSync(eventPath)), {
    head, headTree: tree(root, head), finalCommit, finalTree: tree(root, finalCommit), evidenceCommit: evidence, parents: parents(root, head)
  });
  for (const file of CODE_PATHS) tracked(root, head, file);
  const admission = parse(tracked(root, head, ADMISSION));
  same(admission, {
    schemaVersion: "pr287-admission.v1", baseCommit: BASE, sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: tooling, toolingTree: binding.toolingTree, toolingDigest: binding.toolingDigest,
    checksRawSha256: SOURCE_CHECKS_SHA, observationRawSha256: SOURCE_OBSERVATION_SHA, scope: SCOPE, permissions: PERMISSIONS
  }, "PR287_ADMISSION_BINDING");
  for (const role of ["A11", "A23"]) {
    const prefix = role.toLowerCase();
    const decisionBytes = tracked(root, head, `${DIRECTORY}/${prefix}-review.json`);
    const reportBytes = tracked(root, head, `${DIRECTORY}/${prefix}-review.md`);
    need(hash(decisionBytes) === binding[`${prefix}DecisionSha256`] && hash(reportBytes) === binding[`${prefix}ReportSha256`], "PR287_REVIEW_BYTES");
    assertReview(parse(decisionBytes), role, binding, hash(reportBytes));
  }
  const checkBytes = tracked(root, head, `${DIRECTORY}/source-checks.json`);
  const observationBytes = tracked(root, head, `${DIRECTORY}/source-observation.json`);
  need(hash(checkBytes) === SOURCE_CHECKS_SHA && hash(observationBytes) === SOURCE_OBSERVATION_SHA, "PR287_SOURCE_EVIDENCE_BYTES");
  assertSourceChecks(parse(checkBytes));
  const observation = parse(observationBytes);
  keys(observation, ["schemaVersion", "sourceCommit", "sourceTree", "observation", "liveAllowed", "historicalAuthorityTransferred"]);
  need(observation.schemaVersion === "pr287-source-observation.v1" && observation.sourceCommit === SOURCE && observation.sourceTree === SOURCE_TREE &&
    observation.liveAllowed === false && observation.historicalAuthorityTransferred === false, "PR287_SOURCE_OBSERVATION");
  same(parse(tracked(root, head, `${DIRECTORY}/source-inventory.json`)), sourceInventory, "PR287_SOURCE_INVENTORY");
  same(parse(tracked(root, head, `${DIRECTORY}/source-intake.json`)), {
    schemaVersion: "pr287-source-intake.v1", owner: "A25", sourceCommit: SOURCE, worktreeClean: true,
    statusSignature: hash(Buffer.alloc(0)), reviewablePaths: SOURCE_PATHS
  }, "PR287_SOURCE_INTAKE");
  // T/E/F exact pathsets above preserve every other source and historical byte.
  // A full materialization check also detects hidden index flags and aliases.
  assertMaterializedTree(root, head);
  return { root, head, event, binding, finalCommit, observation: observation.observation };
}

function artifactDirectory(value) {
  const physical = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(physical === value && physical.startsWith(`${temporary}/`) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "PR287_ARTIFACT_ROOT");
  return physical;
}
function save(root, name, value) { writeFileSync(path.join(root, name), `${stable(value)}\n`, { flag: "wx", mode: 0o600 }); }
export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "PR287_TEST_SET");
  for (let i = 0; i < COMMANDS.length; i++) {
    const [name, args] = COMMANDS[i], record = records[i];
    keys(record, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    same({ name: record.name, args: record.args, exitCode: record.exitCode }, { name, args, exitCode: 0 }, "PR287_TEST_COMMAND");
    need(hash(regular(root, `${name}.stdout`)) === record.stdoutSha256 && hash(regular(root, `${name}.stderr`)) === record.stderrSha256, "PR287_TEST_BYTES");
  }
}
async function observation(context) {
  const expectedObservation = parse(tracked(context.root, context.head, "coordination/integration/reviewed-code/pr283-e2/source-observation.json"));
  const current = await observeHistoricalPolicy({ root: context.root, head: context.head, expectedObservation });
  same(current, context.observation, "PR287_CURRENT_POLICY");
  return current;
}
export async function check(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot), records = [];
  for (const [name, args] of COMMANDS) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: commandEnvironment(name), timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, `${name}.stdout`), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, `${name}.stderr`), stderr, { flag: "wx", mode: 0o600 });
    need(result.status === 0 && !result.error && !result.signal, "PR287_TEST_FAILED");
    records.push({ name, args, exitCode: result.status, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  }
  verifyTestRecords(artifacts, records);
  const proof = { schemaVersion: "pr287-current.v1", event: context.event, finalCommit: context.finalCommit, toolingCommit: context.binding.toolingCommit, evidenceCommit: context.binding.evidenceCommit, tests: records, observation: await observation(context) };
  preflight(options);
  save(artifacts, "current.json", proof);
  return proof;
}
async function historicalDecision(context, options) {
  const root = realpathSync(options.historicalRoot);
  need(root === options.historicalRoot && root !== context.root && line(root, "rev-parse", "HEAD") === HISTORICAL_E2, "PR287_HISTORICAL_ROOT");
  clean(root); assertMaterializedTree(root, HISTORICAL_E2);
  same(parse(readFileSync(options.historicalEvent)), { number: 283, pull_request: { base: { sha: "fd2138127bdfe56981835c754c8bf944eabe7fb2" }, head: { sha: HISTORICAL_E2 } } }, "PR287_HISTORICAL_EVENT");
  const checker = "scripts/promotion-reviewed-code-pr283-e2.mjs";
  need(regular(root, checker).equals(blob(context.root, HISTORICAL_E2, checker).bytes), "PR287_HISTORICAL_CHECKER");
  const result = spawnSync(process.execPath, [path.join(root, checker), "verify", "--repo", root, "--event-name", "pull_request", "--event-path", options.historicalEvent,
    "--artifact-root", options.historicalArtifacts, "--baseline-root", options.baselineRoot, "--baseline-event", options.baselineEvent, "--baseline-artifacts", options.baselineArtifacts],
  { cwd: root, env: { ...commandEnvironment("historical"), ...(process.env.RUNNER_TEMP ? { RUNNER_TEMP: process.env.RUNNER_TEMP } : {}) }, timeout: 300000, maxBuffer: 2 * 1024 * 1024 });
  need(result.status === 0 && !result.error && !result.signal, "PR287_HISTORICAL_VERIFICATION");
  const prior = parse(result.stdout);
  need(prior.result === "pass" && prior.admissionCommit === HISTORICAL_E2 && prior.event.headCommit === HISTORICAL_E2, "PR287_HISTORICAL_PROOF");
  same(prior.permissions, PERMISSIONS, "PR287_HISTORICAL_PERMISSION");
  clean(root); assertMaterializedTree(root, HISTORICAL_E2);
  return { commit: HISTORICAL_E2, decisionDigest: prior.decisionDigest, artifactRawSha256: hash(regular(artifactDirectory(options.historicalArtifacts), "decision.json")) };
}
export async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "finalCommit", "toolingCommit", "evidenceCommit", "tests", "observation"]);
  need(current.schemaVersion === "pr287-current.v1" && current.finalCommit === context.finalCommit && current.toolingCommit === context.binding.toolingCommit && current.evidenceCommit === context.binding.evidenceCommit, "PR287_CURRENT_PROOF");
  same(current.event, context.event, "PR287_CURRENT_EVENT");
  verifyTestRecords(artifacts, current.tests);
  same(current.observation, await observation(context), "PR287_CURRENT_OBSERVATION");
  const historical = await historicalDecision(context, options);
  preflight(options);
  const value = { schemaVersion: "pr287-decision.v1", result: "pass", scope: SCOPE, event: context.event, sourceCommit: SOURCE, finalCommit: context.finalCommit,
    toolingCommit: context.binding.toolingCommit, evidenceCommit: context.binding.evidenceCommit, sourceInventoryDigest: SOURCE_INVENTORY,
    currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: historical, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "PR287_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "PR287_USAGE");
  const options = {}, names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot",
    "historical-root": "historicalRoot", "historical-event": "historicalEvent", "historical-artifacts": "historicalArtifacts",
    "baseline-root": "baselineRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" };
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i].slice(2)];
    need(args[i].startsWith("--") && key && !Object.hasOwn(options, key) && args[i + 1], "PR287_USAGE");
    options[key] = args[i + 1];
  }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "PR287_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr287-v1\n"); return; }
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  process.stderr.write(`${JSON.stringify({ result: "blocked", code: error.code ?? error.message, liveAllowed: false })}\n`); process.exitCode = 2;
});
