#!/usr/bin/env node
// Exact PR297 S -> T -> E admission. Existing gates and evidence remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "b16991a6263d41642266b7b0b5f65446b11e5e1f";
export const SOURCE = "0d91ff35fd9a46a070119949ea4509fb8b46a011";
export const SOURCE_TREE = "f7453315bf0925d700ded5aba7e426c70ac0a3ca";
export const SOURCE_INVENTORY = "f929d9ff7795a6d6d1cfc71bc3b60ef6f2a8f8c3d31be32c5f971784f73114ed";
export const CHECKS_SHA = "4a187a9727e2bc7dfead3de555425aef0e70e6c463dfca0407914115d789b8da";
export const RUNTIME_SHA = "c257505882a6f8720d6e11537ea776d2565a4cf56e993e692fe75ac9b6b56d85";
export const PULL_REQUEST = 297;
export const DIRECTORY = "coordination/integration/reviewed-code/pr297-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "scripts/promotion-reviewed-code-pr297.mjs",
  "scripts/promotion-reviewed-code-pr297.test.mjs", "docs/pr297-reviewed-code-gate.md"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  "admission.json", "source-inventory.json", "source-checks.json", "runtime-evidence.json",
  ...["a18", "a11", "a23"].flatMap(role => [role + "-review.json", role + "-review.md"])
].map(file => DIRECTORY + "/" + file).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated: false, liveAllowed: false,
  previewAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false });
export const IDENTITIES = Object.freeze({ A18: "/root/a18_pr297", A11: "/root/root_dirty_disposition", A23: "/root/a23_pr293" });
export const SCOPE = "exact-pr297-runtime-required-check-only";
export const COMMANDS = Object.freeze([
  {
    "name": "critical-units",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "--test-reporter=tap",
      "app/api/accountMediaErasure.test.ts",
      "app/api/attempts/routeSessionRevision.test.ts",
      "app/api/auth/google/callback/malformedStateCookie.test.ts",
      "app/api/auth/google/callback/route.test.ts",
      "app/api/malformedSessionCookie.test.ts",
      "app/api/studentActivityIdentity.test.ts",
      "components/learning/courseIdentityPipeline.test.ts",
      "lib/curriculumCourses.test.ts",
      "lib/lessonProgressRequest.test.ts",
      "lib/server/accountDataPostgres.test.mjs",
      "lib/server/demoSeedBackfill.test.ts",
      "lib/server/demoSeedBackfillPersistence.test.ts",
      "lib/server/googleOAuth.test.ts",
      "lib/server/learnerAuthorityState.test.ts",
      "lib/server/mediaObjectStore.test.ts",
      "lib/server/mediaOwnerErasure.test.ts",
      "lib/server/observabilityHooks.test.ts",
      "lib/server/requestMutationActor.test.ts",
      "lib/server/studentActivityPostgres.test.ts",
      "lib/server/studentSubmissionConcurrency.test.ts",
      "lib/server/teacherClassAccess.test.ts",
      "lib/server/teacherMediaAccess.test.ts",
      "lib/server/userStore/lessonSeedQuestionScan.test.mjs",
      "lib/server/userStore/parentPostgresScopedMutations.test.ts",
      "lib/server/userStore/postgresDeferredProjectionSync.test.mjs",
      "lib/server/userStore/postgresLessonMutation.test.mjs",
      "lib/server/userStore/postgresProjectionNoop.test.mjs",
      "lib/server/userStore/postgresStorageReadiness.test.ts",
      "lib/server/userStore/scopedLessonContext.test.ts",
      "lib/server/userStoreAccountDeletion.test.ts",
      "lib/server/userStoreAiGovernancePersistence.test.ts",
      "lib/server/userStoreAuthAdminStoragePersistence.test.ts",
      "lib/server/userStoreAuthSessionPersistence.test.ts",
      "lib/server/userStoreDemoCaliforniaLink.test.ts",
      "lib/server/userStoreGamificationGamePersistence.test.ts",
      "lib/server/userStoreGamificationRewardRedemptionPersistence.test.ts",
      "lib/server/userStoreGuardianInvitationPersistence.test.ts",
      "lib/server/userStoreNovaPostgresAdmission.test.ts",
      "lib/server/userStoreParentPostgresScopedReads.test.ts",
      "lib/server/userStoreSessionRevisionPostgres.test.ts",
      "lib/server/userStoreStudentActivityPersistence.test.ts",
      "lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts",
      "lib/server/userStoreTeacherOpsOperationsPersistence.test.ts"
    ],
    "summary": {
      "tests": 565,
      "suites": 0,
      "pass": 565,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "b6d6d6a35eb432ad3162bace9ada2d9eb8807da892e30e42171b30be5127cace"
    }
  },
  {
    "name": "schema",
    "args": [
      "--test",
      "--test-reporter=tap",
      "scripts/postgres-schema-fast-path.test.mjs"
    ],
    "summary": {
      "tests": 10,
      "suites": 0,
      "pass": 10,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "33e9fc6a3e9a688da901676c1b0af4c6e1810eb563cc2a4597a23260d875289d"
    }
  },
  {
    "name": "mvp",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "lib/mvpReadiness.test.ts"
    ],
    "summary": {
      "tests": 34,
      "suites": 0,
      "pass": 34,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "d343494289f85f5d55d2bd1b455bf8b4627aa2c070098ff6c419e7f540f2392a"
    }
  },
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
    "name": "zh-hans",
    "args": [
      "scripts/audit-zh-hans.mjs",
      "--fail-on-critical"
    ],
    "summary": {
      "advisory": 3511,
      "ceiling": 3512,
      "nonPackCritical": 0,
      "packRegression": false
    }
  }
]);
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR297_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR297_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR297_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR297_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR297_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR297_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR297_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR297_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR297_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR297_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr295-e2/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(node scripts/promotion-reviewed-code-pr297.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr295-e2/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr295-e2"';
  const stepAnchor = "      - name: Verify exact PR295 E2 independent review admission\n";
  const steps = [
    "      - name: Verify exact PR297 runtime admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr297' }}",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr297"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          node scripts/promotion-reviewed-code-pr297.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR297 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr297' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr297",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr297",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR297_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr297" && "$mode" != "reviewed-code-pr295-e2"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function sourcePartition(entries) {
  const result = { runtime: [], tests: [], docs: [] };
  for (const { path: file } of entries) {
    const kind = /(?:\.test\.|\.spec\.|^tests\/)/u.test(file) ? "tests"
      : /^(?:docs|coordination)\//u.test(file) || file.endsWith(".md") ? "docs" : "runtime";
    result[kind].push(file);
  }
  return result;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "runtimeEvidenceRawSha256", "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR297_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr297-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === (role === "A18" ? "approved-for-integration-review" : "approved-for-exact-pr297-required-check"), "PR297_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, runtimeEvidenceRawSha256: RUNTIME_SHA,
    reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR297_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR297_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR297_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR297_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR297_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "runtimeEvidenceRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr297-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA && a.runtimeEvidenceRawSha256 === RUNTIME_SHA, "PR297_SCOPE");
  same(a.permissions, PERMISSIONS, "PR297_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR297_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  const entries = inventory(root, BASE, SOURCE);
  need(digest(entries) === SOURCE_INVENTORY, "PR297_SOURCE_INVENTORY");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr297-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries, partitions: sourcePartition(entries) }, "PR297_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR297_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR297_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR297_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR297_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR297_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR297_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR297_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR297_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR297_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR297_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR297_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  const runtime = tracked(root, head, DIRECTORY + "/runtime-evidence.json");
  need(hash(checks.bytes) === CHECKS_SHA && hash(runtime.bytes) === RUNTIME_SHA, "PR297_EXECUTION_EVIDENCE");
  need(checks.value.sourceCommit === SOURCE && checks.value.sourceTree === SOURCE_TREE, "PR297_CHECKS_SOURCE");
  same(checks.value.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR297_COMMANDS");
  keys(a.reviews, ["A18", "A11", "A23"], "PR297_REVIEWS");
  for (const role of ["A18", "A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR297_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR297_REVIEW_HASH");
    validateReview(r.value, role, a, report);
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR297_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR297_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR297_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR297_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value, runtime: runtime.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
// Parse Node TAP recursively, including t.test children whose parent is type:'test'.
// Every numbered result, nested plan, diagnostic and root statistic is consumed.
export function testSummary(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes), lines = text.split("\n");
  need(lines[0] === "TAP version 13" && lines.filter(v => /^\s*TAP version\b/iu.test(v)).length === 1 &&
    !/^\s*(?:Bail out!|not ok\b)/imu.test(text) && !/^\s*(?:ok \d+|1\.\.\d+).*#\s*(?:SKIP|TODO)\b/imu.test(text), "PR297_TEST_REPORT");
  let cursor = 1, tests = 0, suites = 0;
  const resultNames = [];
  const whitespace = () => {
    while (cursor < lines.length && (lines[cursor] === "" || /^\s*#(?! Subtest:| (?:TAP|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\b)/u.test(lines[cursor]))) cursor++;
  };
  const scope = indent => {
    const prefix = " ".repeat(indent); let completed = 0;
    for (;;) {
      whitespace();
      const plan = lines[cursor]?.match(new RegExp(`^${prefix}1\\.\\.(\\d+)$`));
      if (plan) { need(completed > 0 && Number(plan[1]) === completed, "PR297_TEST_COVERAGE"); cursor++; return; }
      const start = lines[cursor]?.match(new RegExp(`^${prefix}# Subtest: (.+)$`));
      need(start, "PR297_TEST_COVERAGE"); cursor++; whitespace();
      const hasChildren = lines[cursor]?.startsWith(`${prefix}    # Subtest: `);
      if (hasChildren) scope(indent + 4);
      const result = lines[cursor]?.match(new RegExp(`^${prefix}ok (\\d+) - (.+)$`));
      need(result && Number(result[1]) === completed + 1 && result[2] === start[1], "PR297_TEST_COVERAGE"); cursor++;
      need(lines[cursor++] === `${prefix}  ---`, "PR297_TEST_REPORT");
      let type = null, durationSeen = false;
      while (cursor < lines.length && lines[cursor] !== `${prefix}  ...`) {
        const row = lines[cursor++], match = row.match(new RegExp(`^${prefix}  type: '(test|suite)'$`));
        if (match) { need(type === null, "PR297_TEST_REPORT"); type = match[1]; }
        else { need(!durationSeen && new RegExp(`^${prefix}  duration_ms: [0-9]+(?:[.][0-9]+)?$`).test(row), "PR297_TEST_REPORT"); durationSeen = true; }
      }
      need(lines[cursor++] === `${prefix}  ...` && durationSeen && (type === "test" || (type === "suite" && hasChildren)), "PR297_TEST_REPORT");
      if (type === "suite") suites++; else tests++;
      resultNames.push(start[1]); completed++;
    }
  };
  scope(0);
  const rows = lines.slice(cursor).filter(Boolean), expected = { tests, suites, pass: tests, fail: 0, cancelled: 0, skipped: 0, todo: 0 };
  need(tests > 0 && rows.length === 8, "PR297_TEST_STATS");
  for (const [key, value] of Object.entries(expected)) need(rows.filter(v => v === `# ${key} ${value}`).length === 1, "PR297_TEST_STATS");
  need(rows.filter(v => /^# duration_ms [0-9]+(?:[.][0-9]+)?$/u.test(v)).length === 1, "PR297_TEST_STATS");
  return { ...expected, resultNamesDigest: digest(resultNames) };
}
export function commandSummary(name, stdout) {
  if (name === "types") { need(stdout.length === 0, "PR297_TYPE_OUTPUT"); return null; }
  if (name === "zh-hans") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
    const matches = [...text.matchAll(/^Gate passed \(advisory (\d+)\/(\d+), non-pack critical 0, no pack regression\)\.$/gmu)];
    need(matches.length === 1 && !text.includes("Gate FAILED:"), "PR297_ZH_HANS");
    return { advisory: Number(matches[0][1]), ceiling: Number(matches[0][2]), nonPackCritical: 0, packRegression: false };
  }
  return testSummary(stdout);
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(), NODE_ENV: "test", HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_ENABLE_DEMO_USER: "false", AI_TUTOR_PROVIDER_PROFILE: "offline-fixture", TSX_DISABLE_CACHE: "1", NEXT_TELEMETRY_DISABLED: "1" };
}
function artifactRoot(value) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "PR297_ARTIFACT_ROOT");
  return root;
}
export function check(options) {
  const context = preflight(options), artifacts = artifactRoot(options.artifactRoot);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr297.test.mjs"], summary: null }, ...COMMANDS];
  const records = [];
  for (const c of commands) {
    const result = spawnSync(process.execPath, c.args, { cwd: context.root, env: commandEnvironment(), timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, c.name + ".stdout"), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, c.name + ".stderr"), stderr, { flag: "wx", mode: 0o600 });
    need(result.status === 0 && !result.error && !result.signal, "PR297_COMMAND_FAILED");
    const summary = commandSummary(c.name, stdout);
    if (c.name !== "gate-contract") same(summary, c.summary, "PR297_TEST_COUNT_OR_NAMES");
    else need(summary.skipped === 0 && summary.tests === CONTRACT_TEST_COUNT, "PR297_CONTRACT_COUNT");
    records.push({ name: c.name, args: c.args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), summary });
  }
  assertMaterializedTree(context.root, context.head);
  const after = preflight(options);
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR297_SOURCE_MOVED");
  const decision = { schemaVersion: "pr297-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, consumedRuntimeEvidenceSha256: RUNTIME_SHA,
    nativePgReexecutedInCi: false, httpReexecutedInCi: false, legacyDirectBudgetPassed: false,
    broadLessonAllPassed: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export const CONTRACT_TEST_COUNT = 25;
function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR297_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR297_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR297_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR297_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr297\n"); }
  else { need(options.artifactRoot, "PR297_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR297_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
