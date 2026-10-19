#!/usr/bin/env node
// Evidence E2 for the independent A11 and A23 reviews of PR #283.
// Source S and the pending checker stay intact. Eligibility stays false.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, assertArtifactSet } from "./promotion-required-check-legacy-successor-v1.mjs";
import {
  BASE, SOURCE, PR282, PR281, PR280, PR282_PARENT, MERGE282, MERGE281, SOURCE_TREE,
  PR282_INVENTORY, PR281_INVENTORY, PR280_INVENTORY, SOURCE_INVENTORY, OBSERVATION_SHA,
  PERMISSIONS, COMMANDS, PULL_REQUEST, HISTORICAL_BASE, hash, inventory, assertMergedSources,
  assertMaterializedTree, commandEnvironment, verifyTestRecords, observeCurrent as observePrior
} from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";

export const REVIEWED_TOOLING = "f88aaaecfa74f5688df019ee4a7906108865cdc7";
export const REVIEWED_TOOLING_DIGEST = "b0bce222b72a2e72819302dae0bb1ae9e44544bd003513f30aedca2412d31c81";
export const PENDING_EVIDENCE = "ba5acef1091b73f580a372b747dde1c380ae1640";
export const A23_COMMIT = "b99f44611cb7b7150a8d0ec4c3f7dacba67b1e4b";
export const A11_DECISION_SHA = "c6110aded13b6740d6412f0df80442d4fc5508425265297ddd166ed61815559e";
export const A11_REPORT_SHA = "3780c79a12a24153eef8bb38bff7c1af10bab6718e5aa0a2e43939f9d67c6305";
export const A23_DECISION_SHA = "093cf6c450b93d4f2e2f30ebd112f1b6daad1c545fee9a12c1cb936a1e094671";
export const A23_REPORT_SHA = "6d867c3b58e9bc6459af1261a62b68044f63b112e5f1993b8ba7125e7a019d2a";
export const V1_ADMISSION_SHA = "f281e025af3174a0dc82e7c4af49b0e769185304005e9e55688858899a463c41";
export const CHECKS_SHA = "6de19a576536f7f71e99ddada6a7858258c1c2e1ec17139f901914b4e6d213d4";
export const DIRECTORY = "coordination/integration/reviewed-code/pr283-e2";
export const V1 = "coordination/integration/reviewed-code/pr282-pr281-pr280-v1";
export const A23_DIRECTORY = "coordination/integration/reviewed-code/pr282-pr281-pr280-a23-independent";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const A11_COMMENT_PATH = "pull-request-283-comment:independent-a11-review.md";
export const DECISION_RESULT = "pass";
export const DECISION_SCOPE = "exact-pr282-pr281-pr280-independent-reviews-eligibility-withheld";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "docs/pr283-e2-reviewed-code-gate.md",
  "scripts/promotion-reviewed-code-pr283-e2.mjs",
  "scripts/promotion-reviewed-code-pr283-e2.test.mjs"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION,
  `${DIRECTORY}/a11-review.json`,
  `${DIRECTORY}/a11-review.md`,
  `${DIRECTORY}/a23-review.json`,
  `${DIRECTORY}/a23-review.md`,
  `${DIRECTORY}/source-checks.json`,
  `${DIRECTORY}/source-observation.json`,
  `${V1}/a11-review.json`,
  `${V1}/a11-review.md`,
  `${V1}/a23-review.json`,
  `${V1}/a23-review.md`,
  `${V1}/admission.json`
].sort());
const FROZEN_SCRIPTS = Object.freeze([
  "scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs",
  "scripts/promotion-reviewed-code-pr282-pr281-pr280.test.mjs",
  "docs/pr282-pr281-pr280-reviewed-code-gate.md"
]);
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const HASH = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
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
function sameBytes(root, ref, file, sha, code) { need(blob(root, ref, file).rawSha256 === sha, code); }

function assertReviews(root, head) {
  const a11Decision = tracked(root, head, `${DIRECTORY}/a11-review.json`);
  const a11Report = blob(root, head, `${DIRECTORY}/a11-review.md`);
  const a11 = a11Decision.value;
  need(a11Decision.rawSha256 === A11_DECISION_SHA && a11Report.rawSha256 === A11_REPORT_SHA, "REVIEWED_CODE_A11_BYTES");
  need(a11.role === "A11" && a11.reviewerIdentity === "independent-a11-pr283" && a11.result === "approved-for-ordinary-code-required-check" && a11.liveAllowed === false && a11.reviewedSource === SOURCE && a11.reviewedTooling === REVIEWED_TOOLING && a11.toolingDigest === REVIEWED_TOOLING_DIGEST && a11.report.path === A11_COMMENT_PATH && a11.report.rawSha256 === A11_REPORT_SHA && a11.observationRawSha256 === OBSERVATION_SHA && a11.checksRawSha256 === CHECKS_SHA, "REVIEWED_CODE_A11_BINDING");
  const a23Decision = tracked(root, head, `${DIRECTORY}/a23-review.json`);
  const a23Report = blob(root, head, `${DIRECTORY}/a23-review.md`);
  const a23 = a23Decision.value;
  need(a23Decision.rawSha256 === A23_DECISION_SHA && a23Report.rawSha256 === A23_REPORT_SHA, "REVIEWED_CODE_A23_BYTES");
  need(a23.role === "A23" && a23.reviewerIdentity === "/root/a23_pr282_pr281_pr280_review" && a23.result === "approved-for-later-ordinary-code-admission" && a23.result !== "approved-for-ordinary-code-required-check" && a23.liveAllowed === false && a23.reviewedSource === SOURCE && a23.reviewedTooling === REVIEWED_TOOLING && a23.toolingDigest === REVIEWED_TOOLING_DIGEST && a23.report.path === `${A23_DIRECTORY}/a23-review.md` && a23.report.rawSha256 === A23_REPORT_SHA && a23.observationRawSha256 === OBSERVATION_SHA && a23.checksRawSha256 === CHECKS_SHA, "REVIEWED_CODE_A23_BINDING");
  for (const file of ["a11-review.json", "a11-review.md", "a23-review.json", "a23-review.md"]) {
    need(blob(root, head, `${V1}/${file}`).rawSha256 === blob(root, head, `${DIRECTORY}/${file}`).rawSha256, "REVIEWED_CODE_V1_REPLACEMENT");
  }
  sameBytes(root, head, `${A23_DIRECTORY}/a23-review.md`, A23_REPORT_SHA, "REVIEWED_CODE_A23_ORIGINAL");
  sameBytes(root, head, `${A23_DIRECTORY}/a23-review.json`, A23_DECISION_SHA, "REVIEWED_CODE_A23_ORIGINAL");
  sameBytes(root, head, `${V1}/admission.json`, V1_ADMISSION_SHA, "REVIEWED_CODE_V1_ADMISSION");
  sameBytes(root, head, `${DIRECTORY}/source-observation.json`, OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  sameBytes(root, head, `${V1}/source-observation.json`, OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  sameBytes(root, head, `${DIRECTORY}/source-checks.json`, CHECKS_SHA, "REVIEWED_CODE_CHECKS_BINDING");
  sameBytes(root, head, `${V1}/source-checks.json`, CHECKS_SHA, "REVIEWED_CODE_CHECKS_BINDING");
}

export function assertEventComposition(eventName, event, actual) {
  need(["pull_request", "push"].includes(eventName), "REVIEWED_CODE_EVENT");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(COMMIT.test(base ?? "") && COMMIT.test(head ?? "") && head === actual.head, "REVIEWED_CODE_EVENT_HEAD");
  need(actual.headDescendsEvidence && actual.baseAncestorHead && actual.headTree === actual.evidenceTree, "REVIEWED_CODE_COMPOSITION");
  if (eventName === "pull_request") need(event.number === PULL_REQUEST && base === BASE, "REVIEWED_CODE_PR_BASE");
  else need(event.ref === "refs/heads/main" && actual.baseDescendsBaseline && (base === BASE || actual.baseTree === actual.evidenceTree), "REVIEWED_CODE_PUSH_BASE");
  return { eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, baseCommit: base, headCommit: head };
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "REVIEWED_CODE_ROOT_ALIAS"); clean(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "REVIEWED_CODE_SHALLOW");
  const head = line(root, "rev-parse", "HEAD");
  const admission = tracked(root, head, ADMISSION), a = admission.value;
  keys(a, ["schemaVersion", "baseCommit", "sourceCommit", "sourceTree", "pr282Commit", "pr282ParentCommit", "pr281Commit", "pr280Commit", "merge282Commit", "merge281Commit", "pr282InventoryDigest", "pr281InventoryDigest", "pr280InventoryDigest", "sourceInventoryDigest", "reviewedTooling", "reviewedToolingDigest", "a23Commit", "pendingEvidence", "toolingRelease", "toolingTree", "toolingDigest", "observationRawSha256", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr283-e2.v1" && a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.pr282Commit === PR282 && a.pr282ParentCommit === PR282_PARENT && a.pr281Commit === PR281 && a.pr280Commit === PR280 && a.merge282Commit === MERGE282 && a.merge281Commit === MERGE281 && a.pr282InventoryDigest === PR282_INVENTORY && a.pr281InventoryDigest === PR281_INVENTORY && a.pr280InventoryDigest === PR280_INVENTORY && a.sourceInventoryDigest === SOURCE_INVENTORY && a.reviewedTooling === REVIEWED_TOOLING && a.reviewedToolingDigest === REVIEWED_TOOLING_DIGEST && a.a23Commit === A23_COMMIT && a.pendingEvidence === PENDING_EVIDENCE && a.observationRawSha256 === OBSERVATION_SHA && a.checksRawSha256 === CHECKS_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION");
  need(Object.values(a.permissions).every(value => value === false), "REVIEWED_CODE_PERMISSION");
  assertMergedSources(root);
  same(parents(root, REVIEWED_TOOLING), [SOURCE], "REVIEWED_CODE_REVIEWED_TOOLING_PARENT");
  same(parents(root, PENDING_EVIDENCE), [REVIEWED_TOOLING], "REVIEWED_CODE_PENDING_PARENT");
  same(parents(root, A23_COMMIT), [PENDING_EVIDENCE], "REVIEWED_CODE_A23_PARENT");
  ancestor(root, SOURCE, head); ancestor(root, REVIEWED_TOOLING, head); ancestor(root, A23_COMMIT, head);
  for (const file of FROZEN_SCRIPTS) need(blob(root, head, file).rawSha256 === blob(root, REVIEWED_TOOLING, file).rawSha256, "REVIEWED_CODE_PRIOR_CHECKER");
  need(COMMIT.test(a.toolingRelease ?? "") && HASH.test(a.toolingDigest ?? ""), "REVIEWED_CODE_RELEASE");
  same(parents(root, a.toolingRelease), [A23_COMMIT], "REVIEWED_CODE_RELEASE_PARENT");
  same(changed(root, A23_COMMIT, a.toolingRelease), CODE_PATHS, "REVIEWED_CODE_TOOLING_PATHS");
  need(tree(root, a.toolingRelease) === a.toolingTree && digest(inventory(root, A23_COMMIT, a.toolingRelease)) === a.toolingDigest, "REVIEWED_CODE_TOOLING_DIGEST");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && COMMIT.test(additions[0]), "REVIEWED_CODE_ADMISSION_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingRelease], "REVIEWED_CODE_EVIDENCE_PARENT");
  same(changed(root, a.toolingRelease, evidenceCommit), EVIDENCE_PATHS, "REVIEWED_CODE_EVIDENCE_PATHS");
  ancestor(root, evidenceCommit, head);
  assertReviews(root, head);
  const event = parse(readFileSync(eventPath));
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  need(COMMIT.test(base ?? ""), "REVIEWED_CODE_EVENT_BASE");
  ancestor(root, base, head); ancestor(root, BASE, base);
  const eventBinding = assertEventComposition(eventName, event, { head, headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: tree(root, head), evidenceTree: tree(root, evidenceCommit), baseTree: tree(root, base) });
  keys(a.reviews, ["A11", "A23"]);
  need(a.reviews.A11.decisionRawSha256 === A11_DECISION_SHA && a.reviews.A11.reportRawSha256 === A11_REPORT_SHA && a.reviews.A23.decisionRawSha256 === A23_DECISION_SHA && a.reviews.A23.reportRawSha256 === A23_REPORT_SHA, "REVIEWED_CODE_REVIEW_BINDING");
  return { root, head, admission: a, admissionCommit: evidenceCommit, event: eventBinding, expectedObservation: tracked(root, head, `${DIRECTORY}/source-observation.json`).value };
}

function artifactDirectory(value) {
  const physical = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(physical === value && physical.startsWith(`${temporary}/`) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "REVIEWED_CODE_ARTIFACT_ROOT");
  return physical;
}
function save(root, file, value) { writeFileSync(path.join(root, file), `${stable(value)}\n`, { flag: "wx", mode: 0o600 }); }
export async function check(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot), records = [];
  assertMaterializedTree(context.root, context.head);
  for (const [name, args] of COMMANDS) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: commandEnvironment(name), timeout: name === "activity" || name === "types" ? 600000 : 300000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, `${name}.stdout`), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, `${name}.stderr`), stderr, { flag: "wx", mode: 0o600 });
    need(result.status === 0 && !result.signal && !result.error, "REVIEWED_CODE_TEST_FAILED");
    records.push({ name, args, exitCode: result.status, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  }
  verifyTestRecords(artifacts, records);
  const observation = await observePrior(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.pr283-e2.v1", event: context.event, sourceCommit: SOURCE, reviewedTooling: REVIEWED_TOOLING, admissionCommit: context.admissionCommit, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "sourceCommit", "reviewedTooling", "admissionCommit", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.pr283-e2.v1" && current.sourceCommit === SOURCE && current.reviewedTooling === REVIEWED_TOOLING && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
  same(current.event, context.event, "REVIEWED_CODE_CURRENT_EVENT");
  verifyTestRecords(artifacts, current.tests);
  assertArtifactSet(options.baselineArtifacts);
  same(current.observation, await observePrior(context), "REVIEWED_CODE_CURRENT_OBSERVATION");
  const baselineRoot = realpathSync(options.baselineRoot);
  need(baselineRoot === options.baselineRoot && baselineRoot !== context.root && line(baselineRoot, "rev-parse", "HEAD") === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_ROOT");
  clean(baselineRoot); assertMaterializedTree(baselineRoot, HISTORICAL_BASE);
  const baselineEvent = parse(readFileSync(options.baselineEvent));
  same(baselineEvent, { number: 259, pull_request: { base: { sha: HISTORICAL_BASE }, head: { sha: HISTORICAL_BASE } } }, "REVIEWED_CODE_BASELINE_EVENT");
  const legacy = path.join(baselineRoot, "scripts/promotion-required-check-legacy-successor-v1.mjs");
  need(hash(readFileSync(legacy)) === blob(context.root, HISTORICAL_BASE, "scripts/promotion-required-check-legacy-successor-v1.mjs").rawSha256, "REVIEWED_CODE_BASELINE_CHECKER");
  const { verify } = await import(pathToFileURL(legacy));
  const previous = await verify({ repoRoot: baselineRoot, eventName: "pull_request", eventPath: options.baselineEvent, artifactRoot: options.baselineArtifacts });
  assertMaterializedTree(baselineRoot, HISTORICAL_BASE); clean(baselineRoot);
  need(previous.result === "pass" && previous.event.baseCommit === HISTORICAL_BASE && previous.event.headCommit === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_PROOF");
  const value = { schemaVersion: "promotion-reviewed-code-decision.pr283-e2.v1", result: DECISION_RESULT, scope: DECISION_SCOPE, event: context.event, sourceCommit: SOURCE, reviewedTooling: REVIEWED_TOOLING, a23Commit: A23_COMMIT, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, a11DecisionRawSha256: A11_DECISION_SHA, a23DecisionRawSha256: A23_DECISION_SHA, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: previous.decisionDigest, artifactRawSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "baseline-root": "baselineRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr283-e2\n"); return; }
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
