#!/usr/bin/env node
// Exact PR302 cron/configuration S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "934c332427bab4ce49e39897bde7102c50a6ca93";
export const SOURCE = "08194177bac98d715d6fb90c114aa65ce3c7cf19";
export const SOURCE_TREE = "04f0792e6f22e3c807aa97cb15f9666413fe7c5d";
export const SOURCE_INVENTORY = "7e47ee60806a4e2e2c6200920c1c0811777a2b2df26d7676d6970d4534c196a0";
export const CHECKS_SHA = "11e9e3fa600dec1b869d7de1f87b1918fbd0ff4b1242bb6ccf20ce4cdc2a5f7b";
export const PULL_REQUEST = 302;
export const DIRECTORY = "coordination/integration/reviewed-code/pr302-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze([".github/workflows/teacher-notice-health-monitor.yml", "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts", "app/api/health/route.test.ts", "coordination/release-intake/owner-package-manifest.json", "coordination/release-intake/owner-pathspecs.json", "coordination/session-logs/2026-10-29-A22-pr269-current-main-01a1824f.md", "lib/server/teacherNoticeEmailOutboxHandlers.test.ts", "vercel.json"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr302.mjs","scripts/promotion-reviewed-code-pr302.test.mjs","docs/pr302-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/pr286_source_review", A23:"/root/pr300_a23" });
export const SCOPE = "exact-pr302-cron-configuration-required-check-only";
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
    "name": "schedules",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts",
      "app/api/health/route.test.ts",
      "lib/server/teacherNoticeEmailOutboxHandlers.test.ts"
    ],
    "summary": {
      "tests": 24,
      "suites": 0,
      "pass": 24,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "6e14ae6c0858bae11b1a05f203013c2fb2c760945cb925ac9a12fb9e9ecff8f5"
    }
  },
  {
    "name": "health",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "lib/server/teacherNoticeOperationalHealth.test.ts"
    ],
    "summary": {
      "tests": 6,
      "suites": 0,
      "pass": 6,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "609784b3c5b7eefb576013618bc7630ea268c0a6587b87c8d4ef115ff7c37f05"
    }
  },
  {
    "name": "monitor",
    "args": [
      "--test",
      "--test-reporter=tap",
      "scripts/monitor-teacher-notice-health.test.mjs"
    ],
    "summary": {
      "tests": 12,
      "suites": 0,
      "pass": 12,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "313e118d45e2228d944397fd319158d451ac0b022d44964f4d5f84dc5db47bf1"
    }
  },
  {
    "name": "ownership",
    "args": [
      "scripts/release-package-gate.mjs",
      "--json"
    ],
    "summary": {
      "valid": true,
      "packageCount": 9,
      "ownerPackageCount": 39,
      "resolutionCheckCount": 43,
      "exactPathCheckCount": 44,
      "wildcardPathCheckCount": 14,
      "reportDigest": "21fe3853bef4770dcb8dd4be118705e5fe6ea4e9f5532b2c621ee3b1298d3125"
    }
  }
].map(c => Object.freeze({ ...c, args: Object.freeze(c.args), summary: c.summary === null ? null : Object.freeze(c.summary) })));
export const CONTRACT_TEST_COUNT = 37;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR302_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR302_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR302_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR302_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR302_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR302_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR302_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR302_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR302_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR302_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr301-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr302.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr301-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr301"';
  const stepAnchor = "      - name: Verify exact PR301 Nova admission\n";
  const steps = [
    "      - name: Verify exact PR302 cron admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr302' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr302"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr302.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR302 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr302' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr302",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr302",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR302_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr302" && "$mode" != "reviewed-code-pr301"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR302_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR302_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR302_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR302_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR302_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR302_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR302_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr302-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR302_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR302_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR302_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR302_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR302_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR302_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR302_ARTIFACT_ROOT");
  return root;
}
export function ownershipSummary(bytes) {
  let value;
  try { value = parse(bytes); } catch { fail("PR302_OWNERSHIP_REPORT"); }
  keys(value, ["valid", "errors", "packageCount", "allowedFinalStates", "packages", "ownerPathspecs", "coverage"], "PR302_OWNERSHIP_REPORT");
  const owners = value.ownerPathspecs, coverage = value.coverage;
  need(value.valid === true && Array.isArray(value.errors) && value.errors.length === 0 &&
    Array.isArray(value.packages) && value.packages.length === value.packageCount &&
    owners && owners.valid === true && coverage && coverage.valid === true &&
    Array.isArray(owners.resolutions) && owners.resolutions.length === owners.resolutionCheckCount &&
    Array.isArray(coverage.resolutions) && coverage.resolutions.length === coverage.exactPathCheckCount &&
    Array.isArray(coverage.wildcardResolutions) && coverage.wildcardResolutions.length === coverage.wildcardPathCheckCount &&
    [...owners.resolutions, ...coverage.resolutions, ...coverage.wildcardResolutions].every(row => row?.status === "resolved"), "PR302_OWNERSHIP_REPORT");
  const summary = { valid: true, packageCount: value.packageCount, ownerPackageCount: owners.packageCount,
    resolutionCheckCount: owners.resolutionCheckCount, exactPathCheckCount: coverage.exactPathCheckCount,
    wildcardPathCheckCount: coverage.wildcardPathCheckCount, reportDigest: digest(value) };
  need([summary.packageCount, summary.ownerPackageCount, summary.resolutionCheckCount,
    summary.exactPathCheckCount, summary.wildcardPathCheckCount].every(n => Number.isInteger(n) && n > 0), "PR302_OWNERSHIP_REPORT");
  return summary;
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR302_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
  const spec = COMMANDS.find(command => command.name === name);
  need(name === "gate-contract" || spec, "PR302_COMMANDS");
  let summary;
  if (name === "types") {
    need(stdout.length === 0 && stderr.length === 0, "PR302_TYPE_OUTPUT"); summary = null;
  } else if (name === "ownership") {
    need(stderr.length === 0, "PR302_OWNERSHIP_REPORT"); summary = ownershipSummary(stdout);
  } else summary = testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR302_CONTRACT_COUNT");
  else same(summary, spec.summary, name === "ownership" ? "PR302_OWNERSHIP_REPORT" : "PR302_TEST_COUNT_OR_NAMES");
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr302.test.mjs"] }, ...COMMANDS];
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
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR302_SOURCE_MOVED");
  const decision = { schemaVersion: "pr302-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, liveCronProven: false, measuredSavingsProven: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR302_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr302-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr302-required-check", "PR302_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR302_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR302_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR302_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR302_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR302_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr302-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA, "PR302_SCOPE");
  same(a.permissions, PERMISSIONS, "PR302_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR302_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [BASE], "PR302_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR302_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr302-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR302_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR302_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR302_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR302_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR302_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR302_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR302_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR302_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR302_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR302_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR302_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR302_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR302_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR302_CHECKS_TIME");
  keys(a.reviews, ["A11", "A23"], "PR302_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR302_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR302_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR302_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR302_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR302_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR302_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR302_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR302_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR302_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR302_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR302_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr302\n"); }
  else { need(options.artifactRoot, "PR302_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR302_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
