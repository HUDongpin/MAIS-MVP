#!/usr/bin/env node
// Exact, non-live admission for the PR283 merge-assertion repair in PR285.
// Older checkers and evidence stay immutable; only this S -> T -> E chain is admitted.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, assertArtifactSet } from "./promotion-required-check-legacy-successor-v1.mjs";
import { PERMISSIONS, COMMANDS as PRIOR_COMMANDS, OBSERVATION_SHA, HISTORICAL_BASE, hash, inventory, assertMaterializedTree, commandEnvironment, observeCurrent as observePrior } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";
export { PERMISSIONS, OBSERVATION_SHA, hash, inventory, assertMaterializedTree };
export const BASE = "f573ac62c97cb0716054bc516f7d5136491ca002";
export const SOURCE = "4ef2e1cada5bd872f9ce74f274cc22d8f7b5c0a1";
export const SOURCE_TREE = "1915e22157f067e1cd6770a881feb12cee396ef6";
export const SOURCE_INVENTORY = "cb5b78568109506e494c0e0b88de3dba701b29b261de78bacaed875088c40302";
export const PULL_REQUEST = 285;
export const DIRECTORY = "coordination/integration/reviewed-code/pr283-merge-assertion-v1";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const SOURCE_PATHS = Object.freeze(["docs/pr283-e2-reviewed-code-gate.md", "scripts/promotion-reviewed-code-pr283-e2.test.mjs"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml", "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs", "scripts/promotion-reviewed-code-pr283-merge-assertion.test.mjs"].sort());
export const EVIDENCE_PATHS = Object.freeze([ADMISSION, `${DIRECTORY}/source-observation.json`, `${DIRECTORY}/source-checks.json`, `${DIRECTORY}/source-inventory.json`, ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])].sort());
export const IDENTITIES = Object.freeze({ A11: "/root/a11_pr283_source_admission", A23: "/root/pr283_successor_scope_review" });
const BANK = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
const BANK_SHA = "4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766";
const PROTECTED_PATHS = Object.freeze(["data/usArkansasQuestions.ts", "data/usArkansasTopics.ts", "scripts/promotion-reviewed-code-pr283-e2.mjs", "scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs", "coordination/integration/reviewed-code/pr283-e2/admission.json"]);
export const DECISION_RESULT = "pass";
export const DECISION_SCOPE = "exact-pr285-pr283-merge-assertion-only";
export const COMMANDS = Object.freeze([["repair-regression", ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr283-e2.test.mjs"]], ...PRIOR_COMMANDS.map(([name, args]) => [name, name === "types" ? args : [...args.slice(0, args.indexOf("--test") + 1), "--test-reporter=tap", ...args.slice(args.indexOf("--test") + 1)]])]);
export const TEST_COUNTS = Object.freeze({"seed": 5, "funnel": 9, "activity": 59, "repair-regression": 25});
export const TEST_TITLE_DIGESTS = Object.freeze({"seed": "5637cea3825d27985afb90a31aba06f2118a7b672c60e88ca13b3c791241ee29", "funnel": "46f00e844ccc7e12aede55a45f319c3d6959a6b2d95bdfd7416d31801670c833", "activity": "5e5151bb69d494b8ab995bc495208c6188817d6de24c8bd20ba2e574a95ab4ed", "repair-regression": "5c2486b44b5ce2732d44719604af5b00c6526a77a8488bec0faecfe5da22fa4a"});
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
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

function assertGitHistory(root) {
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const dir of new Set([rootGitDir(root), common])) {
    let exists = true; try { lstatSync(path.join(dir, "info/grafts")); } catch (error) { if (error.code === "ENOENT") exists = false; else throw error; }
    need(!exists, "REVIEWED_CODE_GRAFTS");
  }
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "REVIEWED_CODE_REPLACE_REFS");
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "REVIEWED_CODE_SHALLOW");
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "REVIEWED_CODE_ROOT_ALIAS"); assertGitHistory(root); clean(root);
  const head = line(root, "rev-parse", "HEAD");
  const admission = tracked(root, head, ADMISSION), a = admission.value;
  keys(a, ["schemaVersion", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest", "pullRequest", "toolingRelease", "toolingTree", "toolingDigest", "observationRawSha256", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr283-merge-assertion.v1" && a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY && a.pullRequest === PULL_REQUEST && a.observationRawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION"); need(Object.values(a.permissions).every(value => value === false), "REVIEWED_CODE_PERMISSION");
  same(parents(root, SOURCE), [BASE], "REVIEWED_CODE_SOURCE_PARENT");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "REVIEWED_CODE_SOURCE_PATHS");
  need(tree(root, SOURCE) === SOURCE_TREE && digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
  ancestor(root, SOURCE, head);
  need(COMMIT.test(a.toolingRelease ?? "") && HASH.test(a.toolingDigest ?? "") && HASH.test(a.checksRawSha256 ?? ""), "REVIEWED_CODE_RELEASE");
  same(parents(root, a.toolingRelease), [SOURCE], "REVIEWED_CODE_RELEASE_PARENT");
  same(changed(root, SOURCE, a.toolingRelease), CODE_PATHS, "REVIEWED_CODE_TOOLING_PATHS");
  need(tree(root, a.toolingRelease) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingRelease)) === a.toolingDigest, "REVIEWED_CODE_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(blob(root, a.toolingRelease, file).mode === "100644", "REVIEWED_CODE_TOOLING_MODE");
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
  need(COMMIT.test(base ?? ""), "REVIEWED_CODE_EVENT_BASE"); ancestor(root, base, head); ancestor(root, BASE, base);
  const eventBinding = assertEventComposition(eventName, event, { head, headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: tree(root, head), evidenceTree: tree(root, evidenceCommit), baseTree: tree(root, base) });
  // Exact S/T/E path partitions and HEAD tree equality preserve every other
  // baseline blob, including old gate/evidence, original bank and closed loaders.
  const bank = parse(blob(root, head, BANK).bytes);
  need(blob(root, head, BANK).rawSha256 === BANK_SHA && bank.questions.length === 1500 && bank.questions.find(q => q.id === "us-ar-g6-g12-v1-g12-c04-q014")?.answer === "38000", "REVIEWED_CODE_PROTECTED_BANK");
  for (const file of PROTECTED_PATHS) same(blob(root, head, file).objectId, blob(root, BASE, file).objectId, "REVIEWED_CODE_PROTECTED_BYTES");
  keys(a.reviews, ["A11", "A23"]);
  for (const role of ["A11", "A23"]) {
    const ref = a.reviews[role]; keys(ref, ["decisionRawSha256", "reportRawSha256"]);
    const decisionPath = `${DIRECTORY}/${role.toLowerCase()}-review.json`, reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`;
    const review = tracked(root, head, decisionPath), report = blob(root, head, reportPath), r = review.value;
    need(regular(root, reportPath).equals(report.bytes), "REVIEWED_CODE_WORKTREE_DRIFT");
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling", "toolingDigest", "sourceInventoryDigest", "observationRawSha256", "checksRawSha256", "result", "report", "liveAllowed"]); keys(r.report, ["path", "rawSha256"]);
    need(review.rawSha256 === ref.decisionRawSha256 && report.rawSha256 === ref.reportRawSha256 && r.schemaVersion === "promotion-reviewed-code-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] && r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingRelease && r.toolingDigest === a.toolingDigest && r.sourceInventoryDigest === SOURCE_INVENTORY && r.observationRawSha256 === OBSERVATION_SHA && r.checksRawSha256 === a.checksRawSha256 && r.result === "approved-for-ordinary-code-required-check" && r.liveAllowed === false && r.report.path === reportPath && r.report.rawSha256 === report.rawSha256, "REVIEWED_CODE_REVIEW_BINDING");
    need(typeof r.reviewedAt === "string" && Number.isFinite(Date.parse(r.reviewedAt)) && new Date(r.reviewedAt).toISOString() === r.reviewedAt && Date.parse(r.reviewedAt) <= Date.now(), "REVIEWED_CODE_REVIEW_TIME");
  }
  const observation = tracked(root, head, `${DIRECTORY}/source-observation.json`);
  need(observation.rawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  same(tracked(root, head, `${DIRECTORY}/source-inventory.json`).value, inventory(root, BASE, SOURCE), "REVIEWED_CODE_SOURCE_INVENTORY_RECORD");
  const checks = tracked(root, head, `${DIRECTORY}/source-checks.json`);
  need(checks.rawSha256 === a.checksRawSha256 && checks.value.schemaVersion === "promotion-pr283-repair-source-checks.v1" && checks.value.sourceCommit === SOURCE && checks.value.toolingRelease === a.toolingRelease && checks.value.result === "pass", "REVIEWED_CODE_CHECKS_BINDING");
  return { root, head, admission: a, admissionCommit: evidenceCommit, event: eventBinding, expectedObservation: observation.value };
}

export function verifyNodeTestReport(bytes, name) {
  const report = new TextDecoder("utf-8", { fatal: true }).decode(bytes), lines = report.split("\n"), count = TEST_COUNTS[name];
  need(Number.isSafeInteger(count) && count > 0 && report.startsWith("TAP version 13\n") && lines.filter(line => /^\s*TAP version\b/i.test(line)).length === 1, "REVIEWED_CODE_TEST_REPORT");
  need(!/^\s*(?:Bail out!|not ok\b)/im.test(report) && !/^\s*(?:ok \d+|1\.\.\d+).*#\s*(?:SKIP|TODO)\b/im.test(report), "REVIEWED_CODE_TEST_RESULT");
  let cursor = 1;
  const leaves = [], suites = [];
  const whitespace = () => {
    // Node prefixes test stdout with '#'. Never ignore structural TAP records.
    while (cursor < lines.length && (lines[cursor] === "" || /^\s*#(?! Subtest:| (?:tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/.test(lines[cursor]))) cursor++;
  };
  const scope = indent => {
    const prefix = " ".repeat(indent); let completed = 0;
    for (;;) {
      whitespace();
      const plan = lines[cursor]?.match(new RegExp(`^${prefix}1\\.\\.(\\d+)$`));
      if (plan) {
        need(completed > 0 && Number(plan[1]) === completed, "REVIEWED_CODE_TEST_COVERAGE"); cursor++; return;
      }
      const start = lines[cursor]?.match(new RegExp(`^${prefix}# Subtest: (.+)$`));
      need(start, "REVIEWED_CODE_TEST_COVERAGE"); cursor++; whitespace();
      const hasChildren = lines[cursor]?.startsWith(`${prefix}    # Subtest: `);
      if (hasChildren) scope(indent + 4);
      const result = lines[cursor]?.match(new RegExp(`^${prefix}ok (\\d+) - (.+)$`));
      need(result && Number(result[1]) === completed + 1 && result[2] === start[1], "REVIEWED_CODE_TEST_COVERAGE"); cursor++;
      need(lines[cursor] === `${prefix}  ---`, "REVIEWED_CODE_TEST_REPORT"); cursor++;
      let type = null, durationSeen = false;
      while (cursor < lines.length && lines[cursor] !== `${prefix}  ...`) {
        const line = lines[cursor++];
        const match = line.match(new RegExp(`^${prefix}  type: '(test|suite)'$`));
        if (match) { need(type === null, "REVIEWED_CODE_TEST_REPORT"); type = match[1]; }
        else {
          need(!durationSeen && new RegExp(`^${prefix}  duration_ms: [0-9]+(?:[.][0-9]+)?$`).test(line), "REVIEWED_CODE_TEST_REPORT");
          durationSeen = true;
        }
      }
      need(cursor < lines.length && durationSeen && type === (hasChildren ? "suite" : "test"), "REVIEWED_CODE_TEST_REPORT"); cursor++;
      (hasChildren ? suites : leaves).push(start[1]); completed++;
    }
  };
  scope(0);
  need(leaves.length === count && digest(leaves.sort()) === TEST_TITLE_DIGESTS[name], "REVIEWED_CODE_TEST_TITLES");
  same(suites.sort(), name === "funnel" ? ["auth funnel metrics", "auth funnel route"] : [], "REVIEWED_CODE_TEST_SUITES");
  // The root plan must be followed only by one canonical summary; a second
  // result/plan, duplicate stats or trailing hidden subtest cannot disappear.
  const summary = lines.slice(cursor).filter(line => line !== "");
  need(summary.every(line => /^# (?:tests|suites|pass|fail|cancelled|skipped|todo) \d+$/.test(line) || /^# duration_ms \d+(?:\.\d+)?$/.test(line)), "REVIEWED_CODE_TEST_REPORT");
  for (const [key, expected] of Object.entries({ tests: count, suites: suites.length, pass: count, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    const rows = summary.map(line => line.match(new RegExp(`^# ${key} (\\d+)$`))).filter(Boolean);
    need(rows.length === 1 && Number(rows[0][1]) === expected, "REVIEWED_CODE_TEST_STATS");
  }
  need(summary.filter(line => line.startsWith("# duration_ms ")).length <= 1, "REVIEWED_CODE_TEST_STATS");
}

export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "REVIEWED_CODE_TEST_SET");
  for (let index = 0; index < COMMANDS.length; index++) {
    const [name, args] = COMMANDS[index], row = records[index]; keys(row, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    need(row.name === name && row.exitCode === 0, "REVIEWED_CODE_TEST_EXIT"); same(row.args, args, "REVIEWED_CODE_TEST_COMMAND");
    const stdout = regular(root, `${name}.stdout`), stderr = regular(root, `${name}.stderr`);
    need(hash(stdout) === row.stdoutSha256 && hash(stderr) === row.stderrSha256, "REVIEWED_CODE_TEST_BYTES");
    if (name !== "types") verifyNodeTestReport(stdout, name);
  }
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
  same(preflight(options).head, context.head, "REVIEWED_CODE_HEAD_MOVED");
  const observation = await observePrior(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.pr283-merge-assertion.v1", event: context.event, sourceCommit: SOURCE, reviewedTooling: context.admission.toolingRelease, admissionCommit: context.admissionCommit, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "sourceCommit", "reviewedTooling", "admissionCommit", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.pr283-merge-assertion.v1" && current.sourceCommit === SOURCE && current.reviewedTooling === context.admission.toolingRelease && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
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
  const value = { schemaVersion: "promotion-reviewed-code-decision.pr283-merge-assertion.v1", result: DECISION_RESULT, scope: DECISION_SCOPE, event: context.event, sourceCommit: SOURCE, reviewedTooling: context.admission.toolingRelease, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, a11DecisionRawSha256: context.admission.reviews.A11.decisionRawSha256, a23DecisionRawSha256: context.admission.reviews.A23.decisionRawSha256, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: previous.decisionDigest, artifactRawSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "baseline-root": "baselineRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr283-merge-assertion\n"); return; }
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
