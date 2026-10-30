#!/usr/bin/env node
// Exact PR305 diagram-inventory S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "4501af09d87e44ab849283892bf6d1323ce0c4c6";
export const SOURCE = "d6a5455ec2e5d2f01c5f893c2129eaa0f4886651";
export const SOURCE_TREE = "06530773f3a2faeed7245896847627ef7c611d39";
export const SOURCE_INVENTORY = "1732c817dbc0224ed224749cd31fb1c6398e5800056e2d3b64a2e81a5730eab9";
export const CHECKS_SHA = "27afe6bf7288378b0cd37a34127465da4544e53d419d5440a78eea1bba5e4143";
export const PULL_REQUEST = 305;
export const DIRECTORY = "coordination/integration/reviewed-code/pr305-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze(["docs/superpowers/plans/2026-10-30-diagram-inventory-repair.md", "scripts/audit-math-diagram-inventory.ts", "scripts/math-diagram-coverage.ts", "tests/e2e/math-diagram-coverage.test.ts", "tests/e2e/math-diagram-source-geometry.test.ts"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr305.mjs","scripts/promotion-reviewed-code-pr305.test.mjs","docs/pr305-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/pr305_gate_a11", A23:"/root/pr305_gate_a23" });
export const SCOPE = "exact-pr305-diagram-inventory-required-check-only";
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
    "name": "diagram-regressions",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "--test-concurrency=1",
      "tests/e2e/math-diagram-coverage.test.ts",
      "tests/e2e/math-diagram-source-geometry.test.ts"
    ],
    "summary": {
      "tests": 44,
      "suites": 0,
      "pass": 44,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "62beef340a3bf3179e634ed05a929c7574ceb00c6ed603629fe051fef81646ec"
    }
  },
  {
    "name": "inventory",
    "args": [
      "--import",
      "tsx",
      "scripts/audit-math-diagram-inventory.ts",
      "--json"
    ],
    "summary": {
      "reportDigest": "45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607",
      "discoveredRowDigestSha256": "737169bdab539145ee20787a9fdb35454dbd503636985eae70b5d58ae70a46bf",
      "currentFailureCount": 0,
      "historicalFailureCount": 10,
      "historicalFailuresDigest": "2b698c56c86d913773780ea01ff3e4c73d325499992d3850ca9aa907a8307e7d"
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
export const CONTRACT_TEST_COUNT = 42;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR305_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR305_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR305_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR305_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR305_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR305_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR305_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR305_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR305_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR305_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/ca-textbook-successor/activation/ca-textbook-003/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr305.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/ca-textbook-successor/activation/ca-textbook-003/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "ca-textbook-003"';
  const stepAnchor = "      - name: Test exact California textbook activation\n";
  const steps = [
    "      - name: Verify exact PR305 diagram inventory admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr305' }}",
    "        timeout-minutes: 20",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr305"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr305.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR305 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr305' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr305",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr305",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR305_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr305" && "$mode" != "ca-textbook-003"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR305_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR305_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR305_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR305_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR305_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR305_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR305_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr305-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR305_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR305_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR305_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR305_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR305_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR305_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR305_ARTIFACT_ROOT");
  return root;
}
export function inventorySummary(bytes) {
  let value;
  try { value = parse(bytes); } catch { fail("PR305_INVENTORY_REPORT"); }
  keys(value, ["schemaVersion", "coverageBaseline", "provenance", "lessonRoutes", "ccssLessons", "practiceFigures", "visualizationLabs", "signatureBenches", "liveAssetReferences", "publicSvgAssets", "standaloneDiagramRoutes", "sourceSurfaces", "summary", "failures"], "PR305_INVENTORY_REPORT");
  need(value.schemaVersion === 6 && Array.isArray(value.failures) && value.failures.length === 0 &&
    value.coverageBaseline?.scope === "source-inventory-only" &&
    Array.isArray(value.coverageBaseline.historicalFailures) && value.coverageBaseline.historicalFailures.length === 10,
    "PR305_INVENTORY_REPORT");
  same(value.coverageBaseline.reference, {"path": "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json", "sha256": "8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805"}, "PR305_INVENTORY_REPORT");
  same(value.coverageBaseline.historicalReference, {"path": "coordination/reports/2026-08-09-math-diagram-inventory.json", "sha256": "5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc"}, "PR305_INVENTORY_REPORT");
  return { reportDigest: digest(value), discoveredRowDigestSha256: value.provenance?.discoveredRowDigestSha256,
    currentFailureCount: value.failures.length, historicalFailureCount: value.coverageBaseline.historicalFailures.length,
    historicalFailuresDigest: digest(value.coverageBaseline.historicalFailures) };
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR305_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
  const spec = COMMANDS.find(command => command.name === name);
  need(name === "gate-contract" || spec, "PR305_COMMANDS");
  let summary;
  if (name === "types") {
    need(stdout.length === 0 && stderr.length === 0, "PR305_TYPE_OUTPUT"); summary = null;
  } else if (name === "inventory") {
    need(stderr.length === 0, "PR305_INVENTORY_REPORT"); summary = inventorySummary(stdout);
  } else summary = testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR305_CONTRACT_COUNT");
  else same(summary, spec.summary, name === "inventory" ? "PR305_INVENTORY_REPORT" : "PR305_TEST_COUNT_OR_NAMES");
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr305.test.mjs"] }, ...COMMANDS];
  const records = [];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command.args, { cwd: context.root, env: commandEnvironment(), timeout: command.name === "types" ? 300000 : 180000, maxBuffer: 8 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, command.name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, command.name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    const summary = verifyExecution(command.name, result);
    records.push({ name: command.name, args: command.args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), summary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR305_SOURCE_MOVED");
  const decision = { schemaVersion: "pr305-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, inventoryScope: "source-inventory-only", historicalFailureCount: 10, historicalNativeExecuted: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR305_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr305-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr305-required-check", "PR305_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR305_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR305_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR305_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR305_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR305_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr305-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA, "PR305_SCOPE");
  same(a.permissions, PERMISSIONS, "PR305_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR305_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), [BASE], "PR305_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR305_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr305-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR305_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR305_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR305_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR305_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR305_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR305_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR305_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR305_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR305_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR305_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR305_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR305_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR305_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR305_CHECKS_TIME");
  keys(a.reviews, ["A11", "A23"], "PR305_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR305_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR305_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR305_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR305_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR305_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR305_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR305_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  need(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(a => !/^--?(?:loader|import|require|experimental-loader)/u.test(a)), "PR305_LOADER");
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR305_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR305_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR305_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR305_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr305\n"); }
  else { need(options.artifactRoot, "PR305_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR305_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
