#!/usr/bin/env node
// Evidence E2 for the independent A11 and A23 reviews of PR #295.
// Source S and the pending checker stay intact. Eligibility stays false.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable } from "./promotion-required-check-legacy-successor-v1.mjs";
import {
  hash, inventory, assertMaterializedTree, digest, PERMISSIONS, BASE, PR295, PR295_PARENT, SOURCE,
  SOURCE_TREE, SOURCE_INVENTORY, PROBE, PROBE_BLOB, SCHEDULE, SCHEDULE_WORKFLOW, SCHEDULE_TEST,
  PULL_REQUEST, SOURCE_PULL_REQUEST, SOURCE_PATHS, DIRECTORY as V1
} from "./promotion-reviewed-code-pr295.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest, PERMISSIONS };
export const REVIEWED_TOOLING = "cd5eedb77f6cabb9ca627a38d15fce7713dbc84d";
export const REVIEWED_TOOLING_TREE = "f676edca97330fafdb31b7315c097e64b4202395";
export const REVIEWED_TOOLING_DIGEST = "a333ef913eb7fd6ed16378e087018b2b12242fd121dd56f1511918135ca16a00";
export const PENDING_EVIDENCE = "bead6e80cc82f916ee3801581031bd5df9954eac";
export const PENDING_TREE = "e961c6f55cd893dc9329b6e475721f2ed345d249";
export const CHECKS_SHA = "af708ee467b49334ae97301ced2ccb468f06987de4f2f243c41e9a6c27d245b6";
export const PENDING_ADMISSION_SHA = "873323f8417ff4172c7d7807725b0523bbc5438f6c2a8771a89f8f053cfa6b3d";
export const V1_ADMISSION_SHA = "95475317f423563ec23df3fcdc27f13734dcaf83618299ac44024178cf6d3ab1";
export const PENDING_A11_DECISION_SHA = "7aa005e577d6f0512f92bab694a51db9dd4ef16b45958abe6072b258d84e7361";
export const PENDING_A11_REPORT_SHA = "68af94637a7c14ad90c8c2a0aeeb792e1bae47a3521441890369ea80a52577b3";
export const PENDING_A23_DECISION_SHA = "1ed65d4212b253dbe336fffa6d180a81f1669af4b0bc11fdf3e60fe9f2e977d6";
export const PENDING_A23_REPORT_SHA = "c26de1dd8224b7fead7a078bea2bc01759dbe453c2896c8ca6736bcc18a0b52a";
export const A11_DECISION_SHA = "ee149b19c5e4914d33e08e41f61a79ddf46d70162952fce204a624488cadd3f7";
export const A11_REPORT_SHA = "00fc0a4bbfc3f332466727ebc7d5eeeb4d188bb00d56b0c5eb167f10da0e3110";
export const A23_DECISION_SHA = "d950197c546016e3a355bf5532995c8d707ea020a505e95650aff2ceb977ef4b";
export const A23_REPORT_SHA = "0ce1b8d47e2e2642ef57524c34eb9d53bb38bf38a301c587f337f1bab89bc717";
export const A11_COMMENT_PATH = "pull-request-296-comment:independent-a11-review.md";
export const A23_COMMENT_PATH = "pull-request-296-comment:independent-a23-review.md";
export const DIRECTORY = "coordination/integration/reviewed-code/pr295-e2";
export const ADMISSION = DIRECTORY + "/admission.json";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "docs/pr295-e2-reviewed-code-gate.md",
  "scripts/promotion-reviewed-code-pr295-e2.mjs", "scripts/promotion-reviewed-code-pr295-e2.test.mjs"
].sort());
const REVIEW_FILES = Object.freeze(["a11-review.json", "a11-review.md", "a23-review.json", "a23-review.md"]);
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, DIRECTORY + "/source-checks.json", DIRECTORY + "/source-inventory.json",
  ...REVIEW_FILES.flatMap(file => [DIRECTORY + "/" + file, V1 + "/" + file]),
  V1 + "/admission.json"
].sort());
const FROZEN_PATHS = Object.freeze([
  "docs/pr295-reviewed-code-gate.md", "scripts/promotion-reviewed-code-pr295.mjs", "scripts/promotion-reviewed-code-pr295.test.mjs"
]);
export const TEST_COUNT = 16;
export const MONITOR_COUNT = 7;
export const DECISION_RESULT = "pass";
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR295_E2_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR295_E2_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR295_E2_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR295_E2_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR295_E2_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR295_E2_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR295_E2_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR295_E2_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR295_E2_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR295_E2_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
function sha256(bytes) { return hash(bytes); }
function assertSchedule(bytes) {
  const crons = bytes.toString("utf8").split("\n").filter(row => row.startsWith("    - cron:"));
  need(crons.length === 1 && crons[0] === '    - cron: "' + SCHEDULE + '"', "PR295_E2_SCHEDULE");
}
function assertSource(root) {
  same(parents(root, SOURCE), [BASE, PR295], "PR295_E2_SOURCE_PARENTS");
  same(parents(root, PR295), [PR295_PARENT], "PR295_E2_SOURCE_PARENTS");
  same(parents(root, PR295_PARENT), [BASE], "PR295_E2_SOURCE_PARENTS");
  need(tree(root, SOURCE) === SOURCE_TREE && tree(root, PR295) === SOURCE_TREE, "PR295_E2_SOURCE_TREE");
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "PR295_E2_SOURCE_BYTES");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "PR295_E2_SOURCE_PATHS");
  for (const ref of [BASE, SOURCE, PR295]) need(line(root, "rev-parse", ref + ":" + PROBE) === PROBE_BLOB, "PR295_E2_PROBE");
  assertSchedule(blob(root, SOURCE, SCHEDULE_WORKFLOW));
}
function assertReviews(root, head) {
  const pending = [
    ["a11-review.json", PENDING_A11_DECISION_SHA], ["a11-review.md", PENDING_A11_REPORT_SHA],
    ["a23-review.json", PENDING_A23_DECISION_SHA], ["a23-review.md", PENDING_A23_REPORT_SHA]
  ];
  for (const [file, digest] of pending) need(sha256(blob(root, PENDING_EVIDENCE, V1 + "/" + file)) === digest, "PR295_E2_PENDING_BYTES");
  need(sha256(blob(root, PENDING_EVIDENCE, V1 + "/admission.json")) === PENDING_ADMISSION_SHA, "PR295_E2_PENDING_ADMISSION");
  const current = [
    ["a11-review.json", A11_DECISION_SHA], ["a11-review.md", A11_REPORT_SHA],
    ["a23-review.json", A23_DECISION_SHA], ["a23-review.md", A23_REPORT_SHA]
  ];
  for (const [file, digest] of current) {
    const v1 = blob(root, head, V1 + "/" + file), e2 = blob(root, head, DIRECTORY + "/" + file);
    need(sha256(v1) === digest && sha256(e2) === digest && v1.equals(e2), "PR295_E2_REVIEW_BYTES");
  }
  need(sha256(blob(root, head, V1 + "/admission.json")) === V1_ADMISSION_SHA, "PR295_E2_V1_ADMISSION");
  const a11 = tracked(root, head, DIRECTORY + "/a11-review.json").value;
  const a23 = tracked(root, head, DIRECTORY + "/a23-review.json").value;
  need(a11.schemaVersion === "pr295-review.v1" && a11.role === "A11" && a11.reviewerIdentity === "independent-a11-pr296" &&
    a11.result === "approved-for-ordinary-code-required-check" && a11.liveAllowed === false && a11.reviewedSource === SOURCE &&
    a11.reviewedTooling === REVIEWED_TOOLING && a11.toolingInventoryDigest === REVIEWED_TOOLING_DIGEST &&
    a11.sourceInventoryDigest === SOURCE_INVENTORY && a11.checksRawSha256 === CHECKS_SHA &&
    a11.report?.path === A11_COMMENT_PATH && a11.report.rawSha256 === A11_REPORT_SHA, "PR295_E2_A11_BINDING");
  need(a23.schemaVersion === "promotion-reviewed-code-review.v1" && a23.role === "A23" && a23.reviewerIdentity === "/root/a23_pr296_review" &&
    a23.result === "approved-for-later-ordinary-code-admission" && a23.result !== "approved-for-ordinary-code-required-check" &&
    a23.liveAllowed === false && a23.reviewedSource === SOURCE && a23.reviewedTooling === REVIEWED_TOOLING &&
    a23.toolingInventoryDigest === REVIEWED_TOOLING_DIGEST && a23.sourceInventoryDigest === SOURCE_INVENTORY &&
    a23.checksRawSha256 === CHECKS_SHA && a23.evidenceCommit === PENDING_EVIDENCE && a23.probeBlob === PROBE_BLOB &&
    a23.schedule === SCHEDULE && a23.report?.path === A23_COMMENT_PATH && a23.report.rawSha256 === A23_REPORT_SHA, "PR295_E2_A23_BINDING");
  need(sha256(blob(root, head, V1 + "/source-checks.json")) === CHECKS_SHA && sha256(blob(root, head, DIRECTORY + "/source-checks.json")) === CHECKS_SHA, "PR295_E2_CHECKS");
  need(blob(root, head, V1 + "/source-inventory.json").equals(blob(root, PENDING_EVIDENCE, V1 + "/source-inventory.json")) &&
    blob(root, head, DIRECTORY + "/source-inventory.json").equals(blob(root, head, V1 + "/source-inventory.json")), "PR295_E2_INVENTORY");
}

export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr295-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr295-e2.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr295-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr295"';
  const stepAnchor = "      - name: Verify exact PR295 teacher-notice schedule admission\n";
  const steps = [
    "      - name: Verify exact PR295 E2 independent review admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr295-e2' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr295-e2"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr295-e2.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR295 E2 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr295-e2' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr295-e2",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr295-e2",
    "          if-no-files-found: warn",
    "          retention-days: 14",
    ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR295_E2_WORKFLOW");
  const next = before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr295-e2" && "$mode" != "reviewed-code-pr295"')
    .replace(stepAnchor, steps + stepAnchor);
  need(next.includes("promotion-reviewed-code-pr295.mjs select") && next.includes("reviewed-docs-pr293"), "PR295_E2_WORKFLOW");
  return next;
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR295_E2_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR295_E2_DIRTY");
  const head = line(root, "rev-parse", "HEAD");
  const record = tracked(root, head, ADMISSION), a = record.value;
  keys(a, ["schemaVersion", "pullRequest", "sourcePullRequest", "baseCommit", "reviewedCommit", "reviewedParent",
    "sourceCommit", "sourceTree", "sourceInventoryDigest", "reviewedTooling", "reviewedToolingTree", "reviewedToolingDigest",
    "pendingEvidence", "pendingTree", "toolingRelease", "toolingTree", "toolingDigest", "checksRawSha256",
    "v1AdmissionRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr295-e2.v1" && a.pullRequest === PULL_REQUEST &&
    a.sourcePullRequest === SOURCE_PULL_REQUEST && a.baseCommit === BASE && a.reviewedCommit === PR295 &&
    a.reviewedParent === PR295_PARENT && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE &&
    a.sourceInventoryDigest === SOURCE_INVENTORY && a.reviewedTooling === REVIEWED_TOOLING &&
    a.reviewedToolingTree === REVIEWED_TOOLING_TREE && a.reviewedToolingDigest === REVIEWED_TOOLING_DIGEST &&
    a.pendingEvidence === PENDING_EVIDENCE && a.pendingTree === PENDING_TREE && a.checksRawSha256 === CHECKS_SHA &&
    a.v1AdmissionRawSha256 === V1_ADMISSION_SHA, "PR295_E2_SCOPE");
  same(a.permissions, PERMISSIONS, "PR295_E2_PERMISSION");
  need(Object.values(a.permissions).every(value => value === false), "PR295_E2_PERMISSION");
  assertSource(root);
  same(parents(root, REVIEWED_TOOLING), [SOURCE], "PR295_E2_TOOLING_PARENT");
  same(parents(root, PENDING_EVIDENCE), [REVIEWED_TOOLING], "PR295_E2_PENDING_PARENT");
  need(tree(root, PENDING_EVIDENCE) === PENDING_TREE && tree(root, REVIEWED_TOOLING) === REVIEWED_TOOLING_TREE, "PR295_E2_PENDING_TREE");
  need(digest(inventory(root, SOURCE, REVIEWED_TOOLING)) === REVIEWED_TOOLING_DIGEST, "PR295_E2_TOOLING_DIGEST");
  for (const file of FROZEN_PATHS) need(blob(root, head, file).equals(blob(root, REVIEWED_TOOLING, file)), "PR295_E2_PRIOR_CHECKER");
  need(line(root, "rev-parse", head + ":" + PROBE) === PROBE_BLOB, "PR295_E2_PROBE");
  need(SHA.test(a.toolingRelease) && HASH.test(a.toolingDigest), "PR295_E2_RELEASE");
  same(parents(root, a.toolingRelease), [PENDING_EVIDENCE], "PR295_E2_RELEASE_PARENT");
  same(changed(root, PENDING_EVIDENCE, a.toolingRelease), CODE_PATHS, "PR295_E2_TOOLING_PATHS");
  need(tree(root, a.toolingRelease) === a.toolingTree && digest(inventory(root, PENDING_EVIDENCE, a.toolingRelease)) === a.toolingDigest, "PR295_E2_RELEASE_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingRelease, file)), "PR295_E2_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingRelease, workflow).toString("utf8") === expectedWorkflow(blob(root, PENDING_EVIDENCE, workflow).toString("utf8")), "PR295_E2_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR295_E2_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingRelease], "PR295_E2_EVIDENCE_PARENT");
  same(changed(root, a.toolingRelease, evidenceCommit), EVIDENCE_PATHS, "PR295_E2_EVIDENCE_PATHS");
  need(tree(root, head) === tree(root, evidenceCommit), "PR295_E2_EVIDENCE_TREE");
  assertReviews(root, head);
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR295_E2_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR295_E2_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR295_E2_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR295_E2_EVENT_MERGE");
  }
  keys(a.reviews, ["A11", "A23"], "PR295_E2_REVIEW");
  need(a.reviews.A11.decisionRawSha256 === A11_DECISION_SHA && a.reviews.A11.reportRawSha256 === A11_REPORT_SHA &&
    a.reviews.A23.decisionRawSha256 === A23_DECISION_SHA && a.reviews.A23.reportRawSha256 === A23_REPORT_SHA, "PR295_E2_REVIEW_BINDING");
  return { root, head, evidenceCommit, admission: a, event: {
    name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head
  } };
}

export function verifyTestReport(bytes, count) {
  const lines = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split("\n")
    .filter(row => !/^#(?! Subtest:| (?:TAP|ok|not ok|1\.\.|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/u.test(row));
  need(Number.isSafeInteger(count) && count > 0 && lines[0] === "TAP version 13", "PR295_E2_TEST_REPORT");
  let cursor = 1;
  for (let number = 1; number <= count; number++) {
    const start = lines[cursor++]?.match(/^# Subtest: (.+)$/u);
    need(start && lines[cursor++] === "ok " + number + " - " + start[1] && !/#\s*(?:SKIP|TODO)/iu.test(start[1]), "PR295_E2_TEST_REPORT");
    need(lines[cursor++] === "  ---", "PR295_E2_TEST_REPORT");
    const diagnostic = [];
    while (cursor < lines.length && lines[cursor] !== "  ...") diagnostic.push(lines[cursor++]);
    need(diagnostic.length === 2 && diagnostic.filter(v => /^  duration_ms: [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1 &&
      diagnostic.includes("  type: 'test'") && lines[cursor++] === "  ...", "PR295_E2_TEST_REPORT");
  }
  need(lines[cursor++] === "1.." + count, "PR295_E2_TEST_REPORT");
  const summary = lines.slice(cursor).filter(Boolean);
  need(summary.length === 8, "PR295_E2_TEST_REPORT");
  for (const [key, value] of Object.entries({ tests: count, suites: 0, pass: count, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    need(summary.filter(v => v === "# " + key + " " + value).length === 1, "PR295_E2_TEST_REPORT");
  }
  need(summary.filter(v => /^# duration_ms [0-9]+(?:\.[0-9]+)?$/u.test(v)).length === 1, "PR295_E2_TEST_REPORT");
  return { tests: count, pass: count, fail: 0 };
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir() };
}
function artifactRoot(value) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "PR295_E2_ARTIFACT_ROOT");
  return root;
}
export function check(options) {
  const context = preflight(options), artifacts = artifactRoot(options.artifactRoot);
  assertMaterializedTree(context.root, context.head);
  const commands = [
    ["contract-tests", ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr295-e2.test.mjs"], TEST_COUNT],
    ["monitor-tests", ["--test", "--test-reporter=tap", "scripts/monitor-teacher-notice-health.test.mjs"], MONITOR_COUNT]
  ];
  const records = [];
  for (const [name, args, count] of commands) {
    const result = spawnSync(process.execPath, args, { cwd: context.root, env: commandEnvironment(), timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    need(result.status === 0 && !result.error && !result.signal, "PR295_E2_COMMAND_FAILED");
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    const resultSummary = verifyTestReport(stdout, count);
    writeFileSync(path.join(artifacts, name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    records.push({ name, args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), result: resultSummary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR295_E2_SOURCE_MOVED");
  const decision = {
    schemaVersion: "promotion-reviewed-code-decision.pr295-e2.v1", result: DECISION_RESULT,
    scope: "exact-pr295-independent-reviews-eligibility-withheld",
    event: context.event, sourceCommit: SOURCE, sourceTree: SOURCE_TREE, reviewedCommit: PR295,
    pendingEvidence: PENDING_EVIDENCE, reviewedTooling: REVIEWED_TOOLING,
    toolingRelease: context.admission.toolingRelease, evidenceCommit: context.evidenceCommit,
    a11Result: "approved-for-ordinary-code-required-check", a23Result: "approved-for-later-ordinary-code-admission",
    reviewBindings: context.admission.reviews, probeBlobUnchanged: true, schedule: SCHEDULE,
    commands: records, permissions: PERMISSIONS
  };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR295_E2_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR295_E2_USAGE");
  for (let index = 0; index < args.length; index += 2) {
    const name = names[args[index].replace(/^--/u, "")];
    need(args[index].startsWith("--") && name && options[name] === undefined && args[index + 1], "PR295_E2_USAGE");
    options[name] = args[index + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR295_E2_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr295-e2\n"); }
  else { need(options.artifactRoot, "PR295_E2_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR295_E2_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
