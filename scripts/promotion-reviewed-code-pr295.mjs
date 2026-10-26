#!/usr/bin/env node
// Exact non-live admission of the PR #295 teacher-notice schedule merge.
// Historical Promotion checkers stay in place. This contract cannot admit
// another PR, a probe-criteria change, or a live promotion.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";
import { hash, inventory, assertMaterializedTree } from "./promotion-reviewed-code-pr282-pr281-pr280.mjs";
export { stable, hash, inventory, assertMaterializedTree };
export const digest = value => hash(Buffer.from(stable(value)));
export const BASE = "63b02c4ec6a4415af0056313e8ad384bf4b61ee1";
export const PR295 = "50f323b0ee86437490ffbe2267fdd2f9709ab5de";
export const PR295_PARENT = "fbc0f7e53bf95d534d7665d2d7c4dc621556315d";
export const SOURCE = "a7b7d104f2dfc93e8ab5282b5e90586e123f452c";
export const SOURCE_TREE = "a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9";
export const SOURCE_INVENTORY = "c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5";
export const PROBE = "scripts/monitor-teacher-notice-health.mjs";
export const PROBE_BLOB = "34d8b50957af26e9bfdef6f343117b6bea4db0b4";
export const SCHEDULE = "7 * * * *";
export const SCHEDULE_WORKFLOW = ".github/workflows/teacher-notice-health-monitor.yml";
export const SCHEDULE_TEST = "scripts/monitor-teacher-notice-health.test.mjs";
export const PULL_REQUEST = 296;
export const SOURCE_PULL_REQUEST = 295;
export const SOURCE_PATHS = Object.freeze([SCHEDULE_WORKFLOW, SCHEDULE_TEST].sort());
export const DIRECTORY = "coordination/integration/reviewed-code/pr295-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "docs/pr295-reviewed-code-gate.md",
  "scripts/promotion-reviewed-code-pr295.mjs", "scripts/promotion-reviewed-code-pr295.test.mjs"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, DIRECTORY + "/source-inventory.json", DIRECTORY + "/source-checks.json",
  ...["a11", "a23"].flatMap(role => [DIRECTORY + "/" + role + "-review.json", DIRECTORY + "/" + role + "-review.md"])
].sort());
export const IDENTITIES = Object.freeze({ A11: "pending-independent-a11", A23: "pending-independent-a23" });
export const REVIEW_RESULT = "pending-independent-review";
export const PERMISSIONS = Object.freeze({
  ordinaryCodeEligible: false, liveAllowed: false, integrationAllowed: false,
  previewAllowed: false, deployAllowed: false, wholePackAccepted: false,
  historicalAuthorityTransferred: false
});
export const TEST_COUNT = 22;
export const MONITOR_COUNT = 7;
export const DECISION_RESULT = "pending";
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR295_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR295_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR295_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR295_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR295_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR295_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR295_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR295_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR295_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR295_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
function assertSchedule(bytes) {
  const crons = bytes.toString("utf8").split("\n").filter(row => row.startsWith("    - cron:"));
  need(crons.length === 1 && crons[0] === '    - cron: "' + SCHEDULE + '"', "PR295_SCHEDULE");
}

export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr293-docs-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr295.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr293-docs-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-docs-pr293"';
  const stepAnchor = "      - name: Verify exact PR293 historical documents and ownership configuration\n";
  const steps = [
    "      - name: Verify exact PR295 teacher-notice schedule admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr295' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr295"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr295.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR295 reviewed-code admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr295' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr295",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr295",
    "          if-no-files-found: warn",
    "          retention-days: 14",
    ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR295_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr295" && "$mode" != "reviewed-docs-pr293"')
    .replace(stepAnchor, steps + stepAnchor);
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR295_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR295_DIRTY");
  const head = line(root, "rev-parse", "HEAD");
  const record = tracked(root, head, ADMISSION), a = record.value;
  keys(a, ["schemaVersion", "pullRequest", "sourcePullRequest", "baseCommit", "reviewedCommit", "reviewedParent",
    "sourceCommit", "sourceTree", "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest",
    "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr295.v1" && a.pullRequest === PULL_REQUEST &&
    a.sourcePullRequest === SOURCE_PULL_REQUEST && a.baseCommit === BASE && a.reviewedCommit === PR295 &&
    a.reviewedParent === PR295_PARENT && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE &&
    a.sourceInventoryDigest === SOURCE_INVENTORY, "PR295_SCOPE");
  same(a.permissions, PERMISSIONS, "PR295_PERMISSION");
  same(parents(root, SOURCE), [BASE, PR295], "PR295_SOURCE_PARENTS");
  same(parents(root, PR295), [PR295_PARENT], "PR295_SOURCE_PARENTS");
  same(parents(root, PR295_PARENT), [BASE], "PR295_SOURCE_PARENTS");
  need(tree(root, SOURCE) === SOURCE_TREE && tree(root, PR295) === SOURCE_TREE, "PR295_SOURCE_TREE");
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "PR295_SOURCE_BYTES");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "PR295_SOURCE_PATHS");
  for (const ref of [BASE, SOURCE, PR295]) need(line(root, "rev-parse", ref + ":" + PROBE) === PROBE_BLOB, "PR295_PROBE");
  assertSchedule(blob(root, SOURCE, SCHEDULE_WORKFLOW));
  need(blob(root, SOURCE, SCHEDULE_TEST).toString("utf8").includes('cron: "' + SCHEDULE + '"'), "PR295_SCHEDULE");
  need(SHA.test(a.toolingCommit) && HASH.test(a.toolingInventoryDigest) && HASH.test(a.checksRawSha256), "PR295_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR295_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR295_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR295_TOOLING_BYTES");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR295_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, BASE, workflow).toString("utf8")), "PR295_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR295_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR295_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR295_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) {
    need(git(root, "ls-tree", "-z", a.toolingCommit, "--", file).length === 0, "PR295_EVIDENCE_REUSE");
    need(regular(root, file).equals(blob(root, evidenceCommit, file)), "PR295_EVIDENCE_DRIFT");
  }
  need(tree(root, head) === tree(root, evidenceCommit), "PR295_EVIDENCE_TREE");
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR295_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR295_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR295_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR295_EVENT_MERGE");
  }
  same(tracked(root, head, DIRECTORY + "/source-inventory.json").value, inventory(root, BASE, SOURCE), "PR295_SOURCE_INVENTORY");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === a.checksRawSha256, "PR295_CHECKS");
  keys(checks.value, ["schemaVersion", "sourceCommit", "reviewedCommit", "toolingCommit", "toolingInventoryDigest",
    "result", "contractTests", "monitorTests", "probeUnchanged", "schedule"], "PR295_CHECKS");
  need(checks.value.schemaVersion === "pr295-source-checks.v1" && checks.value.sourceCommit === SOURCE &&
    checks.value.reviewedCommit === PR295 && checks.value.toolingCommit === a.toolingCommit &&
    checks.value.toolingInventoryDigest === a.toolingInventoryDigest && checks.value.result === "pass" &&
    checks.value.probeUnchanged === true && checks.value.schedule === SCHEDULE, "PR295_CHECKS");
  same(checks.value.contractTests, { tests: TEST_COUNT, pass: TEST_COUNT, fail: 0 }, "PR295_CHECKS");
  same(checks.value.monitorTests, { tests: MONITOR_COUNT, pass: MONITOR_COUNT, fail: 0 }, "PR295_CHECKS");
  keys(a.reviews, ["A11", "A23"], "PR295_REVIEW");
  for (const role of ["A11", "A23"]) {
    const binding = a.reviews[role]; keys(binding, ["decisionRawSha256", "reportRawSha256"], "PR295_REVIEW");
    const prefix = DIRECTORY + "/" + role.toLowerCase(), review = tracked(root, head, prefix + "-review.json");
    const r = review.value, report = blob(root, head, prefix + "-review.md");
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling",
      "toolingInventoryDigest", "sourceInventoryDigest", "checksRawSha256", "result", "report", "liveAllowed"], "PR295_REVIEW");
    keys(r.report, ["path", "rawSha256"], "PR295_REVIEW");
    need(hash(review.bytes) === binding.decisionRawSha256 && hash(report) === binding.reportRawSha256 &&
      r.schemaVersion === "pr295-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] &&
      r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingCommit && r.toolingInventoryDigest === a.toolingInventoryDigest &&
      r.sourceInventoryDigest === SOURCE_INVENTORY && r.checksRawSha256 === a.checksRawSha256 &&
      r.result === REVIEW_RESULT && r.result !== "approved-for-ordinary-code-required-check" && r.liveAllowed === false &&
      r.report.path === prefix + "-review.md" && r.report.rawSha256 === hash(report), "PR295_REVIEW");
    const date = Date.parse(r.reviewedAt);
    need(Number.isFinite(date) && new Date(date).toISOString() === r.reviewedAt && date <= Date.now(), "PR295_REVIEW_TIME");
  }
  return { root, head, evidenceCommit, admission: a, event: {
    name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null,
    baseCommit: BASE, headCommit: head
  } };
}

export function verifyTestReport(bytes, count) {
  const lines = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split("\n")
    .filter(row => !/^#(?! Subtest:| (?:TAP|ok|not ok|1\.\.|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/u.test(row));
  need(Number.isSafeInteger(count) && count > 0 && lines[0] === "TAP version 13", "PR295_TEST_REPORT");
  let cursor = 1;
  for (let number = 1; number <= count; number++) {
    const start = lines[cursor++]?.match(/^# Subtest: (.+)$/u);
    need(start && lines[cursor++] === "ok " + number + " - " + start[1] && !/#\s*(?:SKIP|TODO)/iu.test(start[1]), "PR295_TEST_REPORT");
    need(lines[cursor++] === "  ---", "PR295_TEST_REPORT");
    const diagnostic = [];
    while (cursor < lines.length && lines[cursor] !== "  ...") diagnostic.push(lines[cursor++]);
    need(diagnostic.length === 2 && diagnostic.filter(v => /^  duration_ms: [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1 &&
      diagnostic.includes("  type: 'test'") && lines[cursor++] === "  ...", "PR295_TEST_REPORT");
  }
  need(lines[cursor++] === "1.." + count, "PR295_TEST_REPORT");
  const summary = lines.slice(cursor).filter(Boolean);
  need(summary.length === 8, "PR295_TEST_REPORT");
  for (const [key, value] of Object.entries({ tests: count, suites: 0, pass: count, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    need(summary.filter(v => v === "# " + key + " " + value).length === 1, "PR295_TEST_REPORT");
  }
  need(summary.filter(v => /^# duration_ms [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1, "PR295_TEST_REPORT");
  return { tests: count, pass: count, fail: 0 };
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir() };
}
function artifactRoot(value) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "PR295_ARTIFACT_ROOT");
  return root;
}
export function check(options) {
  const context = preflight(options), artifacts = artifactRoot(options.artifactRoot);
  assertMaterializedTree(context.root, context.head);
  const commands = [
    ["contract-tests", ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr295.test.mjs"], TEST_COUNT],
    ["monitor-tests", ["--test", "--test-reporter=tap", "scripts/monitor-teacher-notice-health.test.mjs"], MONITOR_COUNT]
  ];
  const records = [];
  for (const [name, args, count] of commands) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: commandEnvironment(), timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    need(result.status === 0 && !result.error && !result.signal, "PR295_COMMAND_FAILED");
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    const resultSummary = verifyTestReport(stdout, count);
    writeFileSync(path.join(artifacts, name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    records.push({ name, args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), result: resultSummary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR295_SOURCE_MOVED");
  const decision = {
    schemaVersion: "promotion-reviewed-code-decision.pr295.v1", result: DECISION_RESULT,
    scope: "exact-pr295-teacher-notice-health-schedule-pending-independent-review",
    event: context.event, sourceCommit: SOURCE, sourceTree: SOURCE_TREE, reviewedCommit: PR295,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: context.admission.toolingCommit,
    evidenceCommit: context.evidenceCommit, reviewBindings: context.admission.reviews,
    probeBlobUnchanged: true, schedule: SCHEDULE, preservedBaseline: BASE,
    commands: records, permissions: PERMISSIONS
  };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR295_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR295_USAGE");
  for (let index = 0; index < args.length; index += 2) {
    const name = names[args[index].replace(/^--/u, "")];
    need(args[index].startsWith("--") && name && options[name] === undefined && args[index + 1], "PR295_USAGE");
    options[name] = args[index + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR295_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr295\n"); }
  else { need(options.artifactRoot, "PR295_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR295_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
