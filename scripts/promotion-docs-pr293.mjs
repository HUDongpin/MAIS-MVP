#!/usr/bin/env node
// Exact non-live documentation admission. Historical Promotion checkers and
// evidence are preserved; this contract cannot admit another PR or runtime delta.
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
export const BASE = "b69384c4036fe347275b363768cd497c50c131b5";
export const DOCS_HEAD = "3e554af94e14cefd689fb3a34e8c16046add2d95";
export const SOURCE = "dfe90dbcfee1d6dd4a827d40a31af206604a0c90";
export const SOURCE_TREE = "fe21a7a9fb2a364e66b59715626c7157d9ef754e";
export const SOURCE_INVENTORY = "93a42a7749d992c785fbb0612c04933bd5c6a278c1ca34e18b0c5f91aac19ae1";
export const SOURCE_PATHS = Object.freeze([
  "coordination/content-qa/2026-09-27-A18-successor-22-fresh-review.md",
  "coordination/release-intake/2026-10-20-A25-agentops-whisper-custody-succession-01a15840.md",
  "coordination/release-intake/2026-10-20-A25-agentops-whisper-origin-delete-01a15856.md",
  "coordination/release-intake/2026-10-20-A25-ca60-nine-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-ca60-nine-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-galaxy-kernel-hk-education-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-kernel-hk-education-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-lehmann-manim-trig-content-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-lehmann-manim-trig-content-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-lesson-next-oauth-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-lesson-next-oauth-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-paused-qa-three-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-pr134-pr94-pr91-pr86-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-pr134-pr94-pr91-pr86-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-practice-tutor-custody-succession-01a15856.md",
  "coordination/release-intake/2026-10-20-A25-practice-tutor-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-third-seven-custody-succession-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-third-seven-origin-delete-01a1591c.md",
  "coordination/release-intake/2026-10-20-A25-unicode-custody-succession-01a15749.md",
  "coordination/release-intake/2026-10-20-A25-unicode-origin-delete-01a15749.md",
  "coordination/release-intake/2026-10-23-A10-historical-document-index-01a16956.json",
  "coordination/release-intake/2026-10-23-A10-historical-document-index-01a16956.md",
  "coordination/release-intake/owner-package-manifest.json",
  "coordination/release-intake/owner-pathspecs.json"
].sort());
export const DIRECTORY = "coordination/integration/reviewed-code/pr293-docs-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "docs/pr293-documentation-gate.md",
  "scripts/promotion-docs-pr293.mjs", "scripts/promotion-docs-pr293.test.mjs"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, DIRECTORY + "/source-inventory.json", DIRECTORY + "/source-checks.json",
  ...["a11", "a23"].flatMap(role => [DIRECTORY + "/" + role + "-review.json", DIRECTORY + "/" + role + "-review.md"])
].sort());
export const IDENTITIES = Object.freeze({ A11: "/root/a11_pr293", A23: "/root/a23_pr293" });
export const PERMISSIONS = Object.freeze({
  liveAllowed: false, contentApproval: false, previewAllowed: false,
  deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false
});
export const TEST_COUNT = 22;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR293_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR293_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR293_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR293_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR293_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR293_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR293_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR293_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR293_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR293_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr285-v2/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-docs-pr293.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr285-v2/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr285-v2"';
  const stepAnchor = "      - name: Test PR285 v2 and all preserved contracts\n";
  const steps = [
    "      - name: Verify exact PR293 historical documents and ownership configuration",
    "        if: \u0024{{ steps.contract.outputs.mode == 'reviewed-docs-pr293' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-docs-pr293"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-docs-pr293.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR293 documentation admission proof",
    "        if: \u0024{{ always() && steps.contract.outputs.mode == 'reviewed-docs-pr293' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-docs-pr293",
    "          path: \u0024{{ runner.temp }}/promotion-docs-pr293",
    "          if-no-files-found: warn",
    "          retention-days: 14",
    ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR293_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-docs-pr293" && "$mode" != "reviewed-code-pr285-v2"')
    .replace(stepAnchor, steps + stepAnchor);
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR293_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR293_DIRTY");
  const head = line(root, "rev-parse", "HEAD");
  const record = tracked(root, head, ADMISSION), a = record.value;
  keys(a, ["schemaVersion", "pullRequest", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr293-documentation-admission.v1" && a.pullRequest === 293 && a.baseCommit === BASE &&
    a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY, "PR293_SCOPE");
  same(a.permissions, PERMISSIONS, "PR293_PERMISSION");
  same(parents(root, SOURCE), [DOCS_HEAD, BASE], "PR293_SOURCE_PARENTS");
  need(tree(root, SOURCE) === SOURCE_TREE && digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "PR293_SOURCE_BYTES");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "PR293_SOURCE_PATHS");
  need(SHA.test(a.toolingCommit) && HASH.test(a.toolingInventoryDigest) && HASH.test(a.checksRawSha256), "PR293_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR293_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR293_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR293_TOOLING_BYTES");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR293_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, BASE, workflow).toString("utf8")), "PR293_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR293_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR293_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR293_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) {
    need(git(root, "ls-tree", "-z", a.toolingCommit, "--", file).length === 0, "PR293_EVIDENCE_REUSE");
    need(regular(root, file).equals(blob(root, evidenceCommit, file)), "PR293_EVIDENCE_DRIFT");
  }
  need(tree(root, head) === tree(root, evidenceCommit), "PR293_EVIDENCE_TREE");
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR293_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === 293 && pr?.number === 293 && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR293_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR293_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR293_EVENT_MERGE");
  }
  same(tracked(root, head, DIRECTORY + "/source-inventory.json").value, inventory(root, BASE, SOURCE), "PR293_SOURCE_INVENTORY");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === a.checksRawSha256, "PR293_CHECKS");
  keys(checks.value, ["schemaVersion", "sourceCommit", "toolingCommit", "toolingInventoryDigest", "result", "contractTests", "ownerPackageGate"], "PR293_CHECKS");
  need(checks.value.schemaVersion === "pr293-source-checks.v1" && checks.value.sourceCommit === SOURCE &&
    checks.value.toolingCommit === a.toolingCommit && checks.value.toolingInventoryDigest === a.toolingInventoryDigest &&
    checks.value.result === "pass", "PR293_CHECKS");
  same(checks.value.contractTests, { tests: TEST_COUNT, pass: TEST_COUNT, fail: 0 }, "PR293_CHECKS");
  same(checks.value.ownerPackageGate, { valid: true, resolutionChecks: 42 }, "PR293_CHECKS");
  keys(a.reviews, ["A11", "A23"], "PR293_REVIEW");
  for (const role of ["A11", "A23"]) {
    const binding = a.reviews[role]; keys(binding, ["decisionRawSha256", "reportRawSha256"], "PR293_REVIEW");
    const prefix = DIRECTORY + "/" + role.toLowerCase(), review = tracked(root, head, prefix + "-review.json");
    const r = review.value, report = blob(root, head, prefix + "-review.md");
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling",
      "toolingInventoryDigest", "sourceInventoryDigest", "checksRawSha256", "result", "report", "liveAllowed"], "PR293_REVIEW");
    keys(r.report, ["path", "rawSha256"], "PR293_REVIEW");
    need(hash(review.bytes) === binding.decisionRawSha256 && hash(report) === binding.reportRawSha256 &&
      r.schemaVersion === "pr293-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] &&
      r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingCommit && r.toolingInventoryDigest === a.toolingInventoryDigest &&
      r.sourceInventoryDigest === SOURCE_INVENTORY && r.checksRawSha256 === a.checksRawSha256 &&
      r.result === "approved-for-exact-documentation-required-check" && r.liveAllowed === false &&
      r.report.path === prefix + "-review.md" && r.report.rawSha256 === hash(report), "PR293_REVIEW");
    const date = Date.parse(r.reviewedAt);
    need(Number.isFinite(date) && new Date(date).toISOString() === r.reviewedAt && date <= Date.now(), "PR293_REVIEW_TIME");
  }
  return { root, head, evidenceCommit, admission: a, event: {
    name: eventName, pullRequest: eventName === "pull_request" ? 293 : null,
    baseCommit: BASE, headCommit: head
  } };
}

export function verifyTestReport(bytes, count) {
  const lines = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split("\n")
    .filter(line => !/^#(?! Subtest:| (?:TAP|ok|not ok|1\.\.|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/u.test(line));
  need(Number.isSafeInteger(count) && count > 0 && lines[0] === "TAP version 13", "PR293_TEST_REPORT");
  let cursor = 1;
  for (let number = 1; number <= count; number++) {
    const start = lines[cursor++]?.match(/^# Subtest: (.+)$/u);
    need(start && lines[cursor++] === "ok " + number + " - " + start[1] && !/#\s*(?:SKIP|TODO)/iu.test(start[1]), "PR293_TEST_REPORT");
    need(lines[cursor++] === "  ---", "PR293_TEST_REPORT");
    const diagnostic = [];
    while (cursor < lines.length && lines[cursor] !== "  ...") diagnostic.push(lines[cursor++]);
    need(diagnostic.length === 2 && diagnostic.filter(v => /^  duration_ms: [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1 &&
      diagnostic.includes("  type: 'test'") && lines[cursor++] === "  ...", "PR293_TEST_REPORT");
  }
  need(lines[cursor++] === "1.." + count, "PR293_TEST_REPORT");
  const summary = lines.slice(cursor).filter(Boolean);
  need(summary.length === 8, "PR293_TEST_REPORT");
  for (const [key, value] of Object.entries({ tests: count, suites: 0, pass: count, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    need(summary.filter(v => v === "# " + key + " " + value).length === 1, "PR293_TEST_REPORT");
  }
  need(summary.filter(v => /^# duration_ms [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1, "PR293_TEST_REPORT");
  return { tests: count, pass: count, fail: 0 };
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir() };
}
function artifactRoot(value) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "PR293_ARTIFACT_ROOT");
  return root;
}
export function check(options) {
  const context = preflight(options), artifacts = artifactRoot(options.artifactRoot);
  assertMaterializedTree(context.root, context.head);
  const commands = [
    ["contract-tests", ["--test", "--test-reporter=tap", "scripts/promotion-docs-pr293.test.mjs"], TEST_COUNT],
    ["owner-tests", ["--test", "--test-reporter=tap", "--test-name-pattern=shared owner resolver|package gate rejects ambiguous|package gate requires every package wildcard", "scripts/release-governance.test.mjs"], 3],
    ["owner-package", ["scripts/release-package-gate.mjs", "--json"], null]
  ];
  const records = [];
  for (const [name, args, count] of commands) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: commandEnvironment(), timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    need(result.status === 0 && !result.error && !result.signal, "PR293_COMMAND_FAILED");
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    let resultSummary;
    if (count !== null) resultSummary = verifyTestReport(stdout, count);
    else {
      const pkg = parse(stdout);
      need(pkg.valid === true && Array.isArray(pkg.errors) && pkg.errors.length === 0 &&
        pkg.ownerPathspecs?.valid === true && pkg.ownerPathspecs.resolutionCheckCount === 42, "PR293_OWNER_GATE");
      resultSummary = { valid: true, resolutionChecks: 42 };
    }
    writeFileSync(path.join(artifacts, name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    records.push({ name, args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), result: resultSummary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR293_SOURCE_MOVED");
  const decision = {
    schemaVersion: "pr293-documentation-decision.v1", result: "pass",
    scope: "exact-pr293-historical-documents-and-owner-configuration-only",
    event: context.event, sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: context.admission.toolingCommit,
    evidenceCommit: context.evidenceCommit, reviewBindings: context.admission.reviews,
    preservedBaseline: BASE, baselineRuntimeBytesChanged: false,
    historicalPromotionRevalidated: false, commands: records, permissions: PERMISSIONS
  };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR293_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR293_USAGE");
  for (let index = 0; index < args.length; index += 2) {
    const name = names[args[index].replace(/^--/u, "")];
    need(args[index].startsWith("--") && name && options[name] === undefined && args[index + 1], "PR293_USAGE");
    options[name] = args[index + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR293_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-docs-pr293\n"); }
  else { need(options.artifactRoot, "PR293_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR293_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
