#!/usr/bin/env node
// Exact successor admission for PR285 after the history-preserving PR287 sync.
// Frozen PR285 v1 and PR287 gates remain unchanged and both verify historical proof.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";
import { PERMISSIONS, OBSERVATION_SHA, hash, inventory, assertMaterializedTree, commandEnvironment, observeCurrent as observePrior } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";
import { COMMANDS as V1_COMMANDS, verifyTestRecords as verifyV1Records } from "./promotion-reviewed-code-pr283-merge-assertion.mjs";
import { COMMANDS as MAIN_COMMANDS } from "./promotion-reviewed-code-pr287.mjs";
export { PERMISSIONS, OBSERVATION_SHA, hash, inventory, assertMaterializedTree };
export const BASE = "00114a71813b589990e95a2ca44745c2650fa499";
export const SOURCE = "6efe84b8ea6cf119a288b561e441c5c3a3560a8e";
export const SOURCE_TREE = "29c8a78a58d1c950bba303607191acc0dd6157b5";
export const SOURCE_INVENTORY = "3549f1339ad879dbdffad72aaac15eff238e74ab157a22b869edb885d24354f5";
export const PULL_REQUEST = 285;
export const OLD_HEAD = "2354960b2d00685cdea7c253c6d4bd0c9f0e48d1";
export const OLD_BASE = "f573ac62c97cb0716054bc516f7d5136491ca002";
export const HISTORICAL_E2 = "9d789219a59625d5f7ff43a69205aec954f9518a";
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const DIRECTORY = "coordination/integration/reviewed-code/pr285-v2";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const SOURCE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/a11-review.json", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/a11-review.md", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/a23-review.json", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/a23-review.md", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/admission.json", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/source-checks.json", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/source-inventory.json", "coordination/integration/reviewed-code/pr283-merge-assertion-v1/source-observation.json", "docs/pr283-e2-reviewed-code-gate.md", "scripts/promotion-reviewed-code-pr283-e2.test.mjs", "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs", "scripts/promotion-reviewed-code-pr283-merge-assertion.test.mjs"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml", "docs/pr285-v2-reviewed-code-gate.md", "scripts/promotion-reviewed-code-pr285-v2.mjs", "scripts/promotion-reviewed-code-pr285-v2.test.mjs"].sort());
export const EVIDENCE_PATHS = Object.freeze([ADMISSION, `${DIRECTORY}/source-observation.json`, `${DIRECTORY}/source-checks.json`, `${DIRECTORY}/source-inventory.json`, ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])].sort());
export const IDENTITIES = Object.freeze({ A11: "/root/a11_pr283_source_admission", A23: "/root/pr285_v2_a23_review" });
const BANK = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
const BANK_SHA = "4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766";
const PROTECTED_PATHS = Object.freeze(["data/usArkansasQuestions.ts", "data/usArkansasTopics.ts", "scripts/promotion-reviewed-code-pr283-e2.mjs", "scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs", "coordination/integration/reviewed-code/pr283-e2/admission.json"]);
export const DECISION_RESULT = "pass";
export const DECISION_SCOPE = "exact-pr285-after-pr287-required-check-only";
export const COMMANDS = Object.freeze([...V1_COMMANDS, ...MAIN_COMMANDS.map(([name, args]) => [`pr287-${name}`, [...args.slice(0, args.indexOf("--test") + 1), "--test-reporter=tap", ...args.slice(args.indexOf("--test") + 1)]])]);
export const TEST_COUNTS = Object.freeze({ "pr287-admission": 22, "pr287-build": 33, "pr287-adjacent": 38, "pr287-governance": 1 });
export const TEST_TITLE_DIGESTS = Object.freeze({"pr287-admission": "8b2bf3628fd512cedb27331b78cac3e60398b7969fe1947a4681cbf15649c8c9", "pr287-build": "828356939e26cce873aa792e43861bcce63faa9aab6ef2955c41bfaccebf6c4f", "pr287-adjacent": "9846ac4a65861c8672e2becb1c15b6cccdf2b50ad47821e08ff84904ac12d4d2", "pr287-governance": "df3fc624ff399b0b5c3d1b7d8f680b7700f8bb37a154bec08efce82cba5d3531"});
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
  if (eventName === "pull_request") {
    need(event.number === PULL_REQUEST && base === BASE, "REVIEWED_CODE_PR_BASE");
    need(head === actual.evidenceCommit, "REVIEWED_CODE_COMPOSITION");
  } else {
    need(event.ref === "refs/heads/main" && base === BASE, "REVIEWED_CODE_PUSH_BASE");
    same(actual.parents, [BASE, actual.evidenceCommit], "REVIEWED_CODE_COMPOSITION");
  }
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
  need(a.schemaVersion === "promotion-reviewed-code-pr285-after-pr287.v2" && a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY && a.pullRequest === PULL_REQUEST && a.observationRawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION"); need(Object.values(a.permissions).every(value => value === false), "REVIEWED_CODE_PERMISSION");
  same(parents(root, SOURCE), [OLD_HEAD, BASE], "REVIEWED_CODE_SOURCE_PARENT");
  ancestor(root, OLD_HEAD, SOURCE); ancestor(root, BASE, SOURCE);
  for (const file of SOURCE_PATHS.filter(file => file !== ".github/workflows/promotion-shadow.yml")) {
    const before = blob(root, OLD_HEAD, file), current = blob(root, SOURCE, file);
    same([current.mode, current.objectId], [before.mode, before.objectId], "REVIEWED_CODE_SOURCE_PRESERVATION");
  }
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
  const eventBinding = assertEventComposition(eventName, event, { head, evidenceCommit, parents: parents(root, head), headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: tree(root, head), evidenceTree: tree(root, evidenceCommit), baseTree: tree(root, base) });
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
  need(checks.rawSha256 === a.checksRawSha256 && checks.value.schemaVersion === "promotion-pr285-v2-source-checks.v1" && checks.value.sourceCommit === SOURCE && checks.value.toolingRelease === a.toolingRelease && checks.value.result === "pass", "REVIEWED_CODE_CHECKS_BINDING");
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
  same(suites, [], "REVIEWED_CODE_TEST_SUITES");
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
  verifyV1Records(root, records.slice(0, V1_COMMANDS.length));
  for (let index = V1_COMMANDS.length; index < COMMANDS.length; index++) {
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
  assertMaterializedTree(context.root, context.head);
  same(preflight(options).head, context.head, "REVIEWED_CODE_HEAD_MOVED");
  const observation = await observePrior(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.pr285-after-pr287.v2", event: context.event, sourceCommit: SOURCE, reviewedTooling: context.admission.toolingRelease, admissionCommit: context.admissionCommit, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
// This binds already verified native outputs; it never substitutes for native verification.
export function bindHistoricalDecision(name, stdoutBytes, artifactBytes) {
  need(name === "old" || name === "main", "REVIEWED_CODE_HISTORY_ROLE");
  const actual = parse(stdoutBytes), stored = parse(artifactBytes);
  same(actual, stored, "REVIEWED_CODE_HISTORY_DECISION");
  const old = name === "old", head = old ? OLD_HEAD : BASE;
  const expectedEvent = { eventName: old ? "pull_request" : "push", pullRequestNumber: old ? 285 : null, baseCommit: OLD_BASE, headCommit: head };
  const common = ["schemaVersion", "result", "scope", "event", "sourceCommit", "currentProofRawSha256", "historicalBaselineOnly", "permissions", "decisionDigest"];
  keys(actual, [...common, ...(old ? ["reviewedTooling", "toolingRelease", "admissionCommit", "a11DecisionRawSha256", "a23DecisionRawSha256"] : ["toolingCommit", "evidenceCommit", "finalCommit", "sourceInventoryDigest"])]);
  same(actual.event, expectedEvent, "REVIEWED_CODE_HISTORY_EVENT");
  need(actual.schemaVersion === (old ? "promotion-reviewed-code-decision.pr283-merge-assertion.v1" : "pr287-decision.v1") && actual.result === "pass" &&
    actual.scope === (old ? "exact-pr285-pr283-merge-assertion-only" : "exact-pr287-required-check-only") &&
    actual.sourceCommit === (old ? "4ef2e1cada5bd872f9ce74f274cc22d8f7b5c0a1" : "58070283c50c7a98a483964eb92907e9064cf9c4"), "REVIEWED_CODE_HISTORY_SCOPE");
  same(actual.permissions, PERMISSIONS, "REVIEWED_CODE_HISTORY_PERMISSIONS");
  keys(actual.historicalBaselineOnly, ["commit", "decisionDigest", "artifactRawSha256"]);
  need(actual.historicalBaselineOnly.commit === (old ? HISTORICAL_BASE : HISTORICAL_E2) && HASH.test(actual.historicalBaselineOnly.decisionDigest ?? "") &&
    HASH.test(actual.historicalBaselineOnly.artifactRawSha256 ?? "") && HASH.test(actual.currentProofRawSha256 ?? ""), "REVIEWED_CODE_HISTORY_BINDING");
  if (old) need(actual.reviewedTooling === "79e10d7293e52bc4fbf26f02d378696d71694ca3" && actual.toolingRelease === actual.reviewedTooling && actual.admissionCommit === OLD_HEAD &&
    actual.a11DecisionRawSha256 === "54671fcda61147a7d8677555ac9d17ff5ed6372de4052961649ceba431cb2a79" && actual.a23DecisionRawSha256 === "07846156cd9cf26ffc2c9fc7c69d058dd7b1ac0c43d19a33ace2b82e772a66b1", "REVIEWED_CODE_HISTORY_BINDING");
  else need(actual.toolingCommit === "56539dbded4fa58b2b640e2e9eefd11e19134013" && actual.evidenceCommit === "c46efcf1b8541aacf0891bda752263f97658bb5c" &&
    actual.finalCommit === "f1149de7d71e379b655408c17c4e3cb92889110c" && actual.sourceInventoryDigest === "7229d9a25e6054dd848708c172c345cea207c84c51af78e0f3fba915d27f1a76", "REVIEWED_CODE_HISTORY_BINDING");
  const { decisionDigest, ...body } = actual; need(decisionDigest === digest(body), "REVIEWED_CODE_HISTORY_DIGEST");
  return { role: old ? "previous-pr285" : "reviewed-main-pr287", commit: head, event: expectedEvent, decisionDigest, artifactRawSha256: hash(artifactBytes) };
}
export function verifyHistoricalProofs(context, historyRoot) {
  need(typeof historyRoot === "string", "REVIEWED_CODE_HISTORY_ROOT");
  const history = artifactDirectory(historyRoot);
  const roots = Object.fromEntries(["old", "main", "e2", "baseline"].map(name => [name, path.join(history, `${name}-root`)]));
  const expectedHeads = { old: OLD_HEAD, main: BASE, e2: HISTORICAL_E2, baseline: HISTORICAL_BASE };
  for (const [name, root] of Object.entries(roots)) {
    need(realpathSync(root) === root && root !== context.root && line(root, "rev-parse", "HEAD") === expectedHeads[name], "REVIEWED_CODE_HISTORY_HEAD");
    assertGitHistory(root); clean(root); assertMaterializedTree(root, expectedHeads[name]);
  }
  const oldEvent = { number: 285, pull_request: { base: { sha: OLD_BASE }, head: { sha: OLD_HEAD } } };
  const mainEvent = { before: OLD_BASE, after: BASE, ref: "refs/heads/main" };
  same(parse(regular(history, "old-event.json")), oldEvent, "REVIEWED_CODE_HISTORY_EVENT");
  same(parse(regular(history, "main-event.json")), mainEvent, "REVIEWED_CODE_HISTORY_EVENT");
  const baselineArgs = ["--baseline-root", roots.baseline, "--baseline-event", path.join(history, "baseline-event.json"), "--baseline-artifacts", path.join(history, "baseline-artifacts")];
  const entries = [
    { name: "old", checker: "scripts/promotion-reviewed-code-pr283-merge-assertion.mjs", eventName: "pull_request", args: baselineArgs },
    { name: "main", checker: "scripts/promotion-reviewed-code-pr287.mjs", eventName: "push", args: ["--historical-root", roots.e2, "--historical-event", path.join(history, "e2-event.json"), "--historical-artifacts", path.join(history, "e2-artifacts"), ...baselineArgs] }
  ];
  return entries.map(entry => {
    const root = roots[entry.name], head = expectedHeads[entry.name];
    const checkerBytes = regular(root, entry.checker);
    need(checkerBytes.equals(blob(context.root, head, entry.checker).bytes), "REVIEWED_CODE_HISTORY_CHECKER");
    const artifacts = artifactDirectory(path.join(history, `${entry.name}-artifacts`));
    const result = spawnSync(process.execPath, [path.join(root, entry.checker), "verify", "--repo", root, "--event-name", entry.eventName,
      "--event-path", path.join(history, `${entry.name}-event.json`), "--artifact-root", artifacts, ...entry.args],
      { cwd: root, env: { ...commandEnvironment("historical"), ...(process.env.RUNNER_TEMP ? { RUNNER_TEMP: process.env.RUNNER_TEMP } : {}) }, timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
    need(result.status === 0 && !result.error && !result.signal, `REVIEWED_CODE_HISTORY_${entry.name.toUpperCase()}_VERIFICATION`);
    const binding = bindHistoricalDecision(entry.name, result.stdout, regular(artifacts, "decision.json"));
    assertMaterializedTree(root, head); clean(root); need(line(root, "rev-parse", "HEAD") === head, "REVIEWED_CODE_HISTORY_HEAD");
    return binding;
  });
}
export function verifyCurrentProof(context, artifacts, current) {
  keys(current, ["schemaVersion", "event", "sourceCommit", "reviewedTooling", "admissionCommit", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.pr285-after-pr287.v2" && current.sourceCommit === SOURCE && current.reviewedTooling === context.admission.toolingRelease && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
  same(current.event, context.event, "REVIEWED_CODE_CURRENT_EVENT");
  verifyTestRecords(artifacts, current.tests);
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  verifyCurrentProof(context, artifacts, current);
  assertMaterializedTree(context.root, context.head);
  same(current.observation, await observePrior(context), "REVIEWED_CODE_CURRENT_OBSERVATION");
  const historicalProofs = verifyHistoricalProofs(context, options.historyRoot);
  assertMaterializedTree(context.root, context.head);
  same(preflight(options).head, context.head, "REVIEWED_CODE_HEAD_MOVED");
  const value = { schemaVersion: "promotion-reviewed-code-decision.pr285-after-pr287.v2", result: DECISION_RESULT, scope: DECISION_SCOPE, event: context.event, sourceCommit: SOURCE, reviewedTooling: context.admission.toolingRelease, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, a11DecisionRawSha256: context.admission.reviews.A11.decisionRawSha256, a23DecisionRawSha256: context.admission.reviews.A23.decisionRawSha256, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: historicalProofs, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "history-root": "historyRoot" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr285-v2\n"); return; }
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
