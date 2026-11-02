#!/usr/bin/env node
// Exact PR307 hourly-teacher-notice S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "b56ede5c36f94d7ee8884048ce80e6f1afea8521";
export const SOURCE = "462cf236fc599d332deb77c62bb9bb45b5f65465";
export const SOURCE_TREE = "464ba82371c91a37de03d819e03adc4b8ce389d9";
export const SOURCE_INVENTORY = "ab48a5bc2331532a91558d5f5b2ef9d7bd67bb428286712dd8e5853961469889";
export const CHECKS_SHA = "62aef65d947cf0e4d7475c695b92974f701f5a66448d02bc3630ce1e78db1894";
export const PULL_REQUEST = 307;
export const DIRECTORY = "coordination/integration/reviewed-code/pr307-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze([".github/workflows/parent-production-acceptance.yml", ".github/workflows/teacher-notice-health-monitor.yml", "RELEASE.md", "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts", "app/api/health/route.test.ts", "app/api/health/teacher-notices/route.test.ts", "coordination/session-logs/2026-11-02-A22-teacher-notice-hourly-01a19836.md", "lib/server/teacherNoticeEmailOutboxHandlers.test.ts", "lib/server/teacherNoticeOperationalHealth.test.ts", "lib/server/teacherNoticeOperationalHealth.ts", "lib/server/userStore/teacherNoticeOperationalReadModel.test.ts", "lib/server/userStore/teacherNoticeOperationalReadModel.ts", "scripts/monitor-teacher-notice-health.mjs", "scripts/monitor-teacher-notice-health.test.mjs", "scripts/parent-production-acceptance.mjs", "scripts/parent-production-acceptance.test.mjs", "vercel.json"]);
export const CODE_PATHS = Object.freeze([".github/workflows/ci.yml", ".github/workflows/promotion-shadow.yml", "docs/pr307-reviewed-code-gate.md", "scripts/promotion-reviewed-code-pr307.mjs", "scripts/promotion-reviewed-code-pr307.test.mjs"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/low_frequency_release", A23:"/root/content_release_review" });
export const SCOPE = "exact-pr307-hourly-teacher-notice-required-check-only";
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
export const CONTRACT_TEST_COUNT = 45;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR307_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR307_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR307_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR307_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR307_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR307_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR307_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR307_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR307_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR307_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr306-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr307.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr306-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr306"';
  const stepAnchor = "      - name: Verify exact PR306 regional provider policy admission\n";
  const steps = [
    "      - name: Verify exact PR307 hourly teacher-notice admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr307' }}",
    "        timeout-minutes: 25",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr307"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr307.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR307 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr307' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr307",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr307",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR307_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr307" && "$mode" != "reviewed-code-pr306"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function expectedCiWorkflow(before) {
  let after = before;
  for (const name of ["visualization-browser", "teacher-parent-e2e"]) {
    const anchor = "  " + name + ":\n";
    need(after.split(anchor).length === 2, "PR307_CI_WORKFLOW");
    const start = after.indexOf(anchor), contentStart = start + anchor.length;
    const next = after.slice(contentStart).search(/^  [A-Za-z0-9_-]+:/m);
    const end = next < 0 ? after.length : contentStart + next;
    const block = after.slice(start, end);
    need((block.match(/^    runs-on: ubuntu-latest$/gm) ?? []).length === 1, "PR307_CI_WORKFLOW");
    after = after.slice(0, start) + block.replace(/^    runs-on: ubuntu-latest$/m, "    runs-on: ubuntu-24.04") + after.slice(end);
  }
  return after;
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR307_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR307_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR307_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR307_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR307_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR307_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR307_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr307-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR307_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR307_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR307_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR307_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR307_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR307_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR307_ARTIFACT_ROOT");
  return root;
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR307_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
  const spec = COMMANDS.find(command => command.name === name);
  need(name === "gate-contract" || spec, "PR307_COMMANDS");
  let summary;
  if (name === "types") {
    need(stdout.length === 0 && stderr.length === 0, "PR307_TYPE_OUTPUT"); summary = null;
  } else summary = testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR307_CONTRACT_COUNT");
  else same(summary, spec.summary, "PR307_TEST_COUNT_OR_NAMES");
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr307.test.mjs"] }, ...COMMANDS];
  const records = [];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command.args, { cwd: context.root, env: commandEnvironment(), timeout: command.name === "gate-contract" ? 600000 : command.name === "types" ? 300000 : 180000, maxBuffer: 8 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, command.name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, command.name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    const summary = verifyExecution(command.name, result);
    records.push({ name: command.name, args: command.args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), summary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR307_SOURCE_MOVED");
  const decision = { schemaVersion: "pr307-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, policyScope: "hourly-scheduling-and-bounded-ci-runners", historicalNativeExecuted: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR307_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr307-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr307-required-check", "PR307_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR307_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR307_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR307_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR307_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR307_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr307-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA, "PR307_SCOPE");
  same(a.permissions, PERMISSIONS, "PR307_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR307_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [BASE], "PR307_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR307_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr307-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR307_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR307_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR307_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR307_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR307_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR307_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR307_WORKFLOW");
  const ci = ".github/workflows/ci.yml";
  need(blob(root, a.toolingCommit, ci).toString("utf8") === expectedCiWorkflow(blob(root, SOURCE, ci).toString("utf8")), "PR307_CI_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR307_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR307_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR307_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR307_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR307_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR307_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR307_CHECKS_TIME");
  keys(a.reviews, ["A11", "A23"], "PR307_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR307_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR307_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR307_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR307_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR307_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR307_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR307_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  need(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(a => !/^--?(?:loader|import|require|experimental-loader)/u.test(a)), "PR307_LOADER");
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR307_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR307_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR307_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR307_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr307\n"); }
  else { need(options.artifactRoot, "PR307_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR307_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
