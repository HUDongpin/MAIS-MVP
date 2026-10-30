#!/usr/bin/env node
// Exact PR306 regional provider policy S -> T -> E admission. Earlier gates remain immutable.
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, hash, inventory, assertMaterializedTree, digest } from "./promotion-reviewed-code-pr295-e2.mjs";
import { testSummary as parseNodeTap } from "./promotion-reviewed-code-pr297.mjs";
export { stable, hash, inventory, assertMaterializedTree, digest };
export const BASE = "4532f5a3e2d8c91ad387e3875925fba8a5091b86";
export const SOURCE = "dd0c4a51d7e6cd23d734da3f7f8e292d7e426042";
export const SOURCE_TREE = "ff3dd1ea83b47cc61bdb79bdaa1b43be3c7d7db5";
export const SOURCE_INVENTORY = "d1785da97c30aeed268bdef4d08b6e89fcd5566d3c5e7f0008af021a4c08af56";
export const CHECKS_SHA = "3caf16cdb3f5d9e15b21d51254c67b84f618adc7b1d16806930fd437bc615591";
export const PULL_REQUEST = 306;
export const DIRECTORY = "coordination/integration/reviewed-code/pr306-v1";
export const ADMISSION = DIRECTORY + "/admission.json";
export const SOURCE_PATHS = Object.freeze([".env.local.example", ".github/workflows/ci.yml", "app/api/ai-tutor/resolve/route.ts", "app/api/ai-tutor/speech/route.ts", "app/api/ai-tutor/status/route.ts", "app/api/ai-tutor/voice/route.ts", "app/api/handwriting-recognition/route.ts", "app/api/lesson-audio/route.ts", "app/api/nova-lens/runs/route.ts", "app/api/teacher/assignments/route.ts", "app/api/teacher/question-generation/route.ts", "app/parent/parentRscSafeBoundary.test.ts", "components/ai/AITutorProvider.tsx", "components/ai/NovaLensGlobalOverlay.tsx", "components/lesson/LessonView.tsx", "components/onboarding/GuidedTour.tsx", "components/practice/PracticeQuestionCard.tsx", "components/practice/useReadAloud.ts", "components/providers/AppProviders.tsx", "components/providers/useAiProviderRegion.ts", "components/visualizations/signature/CountingLab.jsx", "components/visualizations/signature/TeenNumbersLab.jsx", "docs/superpowers/plans/2026-10-30-provider-company-policy.md", "lib/aiProviderCompanyPolicy.test.ts", "lib/aiProviderCompanyPolicy.ts", "lib/aiTutorCapacity.test.ts", "lib/appShellBootstrap.ts", "lib/browserSpeechPolicy.test.ts", "lib/browserSpeechPolicy.ts", "lib/llmProviderConfig.ts", "lib/practiceReadAloud.ts", "lib/server/aiProviderPolicyContext.test.ts", "lib/server/aiProviderPolicyContext.ts", "lib/server/apiSurfaceSecurity.test.ts", "lib/server/eduhkOpenApi.ts", "lib/server/llmProvider.ts", "lib/server/regionScopedProviders.test.ts", "lib/server/regionScopedProviders.ts", "lib/server/teacherAssignmentGeneration.ts", "lib/server/teacherReviewLessonLLM.ts", "lib/server/tutorModerationProvider.ts", "lib/server/tutorProviderPolicyProof.test.ts", "lib/server/tutorProviderPolicyProof.ts", "lib/server/tutorVoiceModeration.ts", "lib/server/userStore.ts", "lib/server/userStore/aiGovernancePersistence.ts", "lib/server/userStore/authAdmissionPersistence.test.ts", "lib/server/userStore/authSessionPersistence.ts", "lib/server/userStore/teacherOpsClassPersistence.ts", "lib/server/userStore/teacherOpsLessonKitPersistence.ts", "lib/server/userStore/teacherOpsSubmissionPersistence.ts", "lib/server/userStoreAuthSessionPersistence.test.ts", "lib/server/userStoreTeacherOpsClassPersistence.test.ts", "lib/server/userStoreTeacherOpsLessonKitPersistence.test.ts", "lib/server/userStoreTeacherOpsSubmissionPersistence.test.ts", "tests/e2e/ai-provider-company-policy.test.ts", "types/index.ts"]);
export const CODE_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml","scripts/promotion-reviewed-code-pr306.mjs","scripts/promotion-reviewed-code-pr306.test.mjs","docs/pr306-reviewed-code-gate.md"].sort());
export const EVIDENCE_PATHS = Object.freeze(["admission.json","source-inventory.json","source-checks.json",...["a11","a23"].flatMap(r=>[r+"-review.json",r+"-review.md"])].map(f=>DIRECTORY+"/"+f).sort());
export const PERMISSIONS = Object.freeze({ historicalPromotionRevalidated:false,liveAllowed:false,previewAllowed:false,deployAllowed:false,wholePackAccepted:false,historicalAuthorityTransferred:false });
export const IDENTITIES = Object.freeze({ A11:"/root/pr306_gate_a11", A23:"/root/pr306_gate_a23" });
export const SCOPE = "exact-pr306-provider-company-policy-required-check-only";
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
    "name": "provider-policy",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "--test-concurrency=1",
      "lib/aiProviderCompanyPolicy.test.ts",
      "lib/browserSpeechPolicy.test.ts",
      "lib/practiceReadAloud.test.ts",
      "lib/server/regionScopedProviders.test.ts",
      "lib/server/aiProviderPolicyContext.test.ts",
      "lib/server/tutorProviderPolicyProof.test.ts",
      "tests/e2e/ai-provider-company-policy.test.ts"
    ],
    "summary": {
      "tests": 49,
      "suites": 0,
      "pass": 49,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "c5abe27da96884f13792639735c71a4a7965b0adc7faf2e7c7c874068948d811"
    }
  },
  {
    "name": "auth-admission",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "--test-concurrency=1",
      "lib/server/aiTutorAdmission.test.ts",
      "lib/server/aiTutorResolveAdmissionContract.test.ts",
      "lib/server/userStore/authAdmissionPersistence.test.ts",
      "lib/server/userStore/authStore.test.ts",
      "lib/server/userStore/aiTutorAdmissionConnectionPrimer.test.ts",
      "lib/server/userStore/aiTutorJournalPersistence.test.ts",
      "lib/server/userStore/aiTutorPolicyAdmissionPersistence.test.ts",
      "lib/server/userStoreNovaPostgresAdmission.test.ts",
      "lib/server/userStoreAiGovernancePersistence.test.ts",
      "lib/server/userStoreAuthSessionPersistence.test.ts",
      "lib/server/userStoreAuth.test.ts"
    ],
    "summary": {
      "tests": 169,
      "suites": 0,
      "pass": 169,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "63f4bdbb75514c87fca39e76585ef80be4b0afd822ed60dbe25bd7ba33d0aa1f"
    }
  },
  {
    "name": "parent-safe-boundary",
    "args": [
      "--import",
      "tsx",
      "--test",
      "--test-reporter=tap",
      "app/parent/parentRscSafeBoundary.test.ts"
    ],
    "summary": {
      "tests": 7,
      "suites": 0,
      "pass": 7,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "resultNamesDigest": "d33d4b87478c896b7661db58df876e2a2dd46a20e2e43b7bf9a7fa5c1b29ca2e"
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
export const CONTRACT_TEST_COUNT = 41;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_GRAFT_FILE: "/dev/null", LC_ALL: "C" });
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u, REPOSITORY = "HUDongpin/MAIS-MVP";
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, names, code = "PR306_SCHEMA") {
  need(value && typeof value === "object" && !Array.isArray(value), code);
  same(Object.keys(value).sort(), [...names].sort(), code);
}
function gitDirectory(root) {
  const file = path.join(root, ".git"), stat = lstatSync(file);
  need(!stat.isSymbolicLink(), "PR306_GIT_DIRECTORY");
  if (stat.isDirectory()) return realpathSync(file);
  need(stat.isFile(), "PR306_GIT_DIRECTORY");
  const match = readFileSync(file, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "PR306_GIT_DIRECTORY"); return realpathSync(path.resolve(root, match[1]));
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
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size < 16 * 1024 * 1024 && realpathSync(absolute) === absolute, "PR306_FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) {
  const rows = git(root, "ls-tree", "-z", ref, "--", file).toString("utf8").split("\0").filter(Boolean);
  need(rows.length === 1 && rows[0].startsWith("100644 blob ") && rows[0].endsWith("\t" + file), "PR306_BLOB");
  return git(root, "show", ref + ":" + file);
}
function tracked(root, ref, file) {
  const bytes = blob(root, ref, file);
  need(regular(root, file).equals(bytes), "PR306_WORKTREE_DRIFT");
  return { bytes, value: parse(bytes) };
}
function history(root) {
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "PR306_SHALLOW");
  need(line(root, "for-each-ref", "--format=%(refname)", "refs/replace/") === "", "PR306_REPLACE");
  const common = line(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  for (const directory of new Set([gitDirectory(root), common])) {
    try { lstatSync(path.join(directory, "info/grafts")); fail("PR306_GRAFT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
export function expectedWorkflow(before) {
  const anchor = "          if [[ -e coordination/integration/reviewed-code/pr305-v1/admission.json";
  const selector = [
    "          if [[ -e " + ADMISSION + " || -L " + ADMISSION + " ]]; then",
    "            mode=$(env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr306.mjs select \\",
    '              --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH")',
    "          elif [[ -e coordination/integration/reviewed-code/pr305-v1/admission.json"
  ].join("\n");
  const modeAnchor = '          if [[ "$mode" != "reviewed-code-pr305"';
  const stepAnchor = "      - name: Verify exact PR305 diagram inventory admission\n";
  const steps = [
    "      - name: Verify exact PR306 regional provider policy admission",
    "        if: ${{ steps.contract.outputs.mode == 'reviewed-code-pr306' }}",
    "        timeout-minutes: 20",
    "        run: |",
    "          set -euo pipefail",
    "          umask 077",
    '          artifacts="$RUNNER_TEMP/promotion-reviewed-code-pr306"',
    '          test ! -e "$artifacts" && test ! -L "$artifacts"',
    '          install -d -m 0700 "$artifacts"',
    "          env -u NODE_OPTIONS -u NODE_PATH node scripts/promotion-reviewed-code-pr306.mjs check \\",
    '            --repo "$GITHUB_WORKSPACE" --event-name "$GITHUB_EVENT_NAME" --event-path "$GITHUB_EVENT_PATH" \\',
    '            --artifact-root "$artifacts"',
    "",
    "      - name: Upload exact PR306 admission proof",
    "        if: ${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr306' }}",
    "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    "        with:",
    "          name: promotion-reviewed-code-pr306",
    "          path: ${{ runner.temp }}/promotion-reviewed-code-pr306",
    "          if-no-files-found: warn",
    "          retention-days: 14", ""
  ].join("\n") + "\n";
  for (const token of [anchor, modeAnchor, stepAnchor]) need(before.split(token).length === 2, "PR306_WORKFLOW");
  return before.replace(anchor, selector)
    .replace(modeAnchor, '          if [[ "$mode" != "reviewed-code-pr306" && "$mode" != "reviewed-code-pr305"')
    .replace(stepAnchor, steps + stepAnchor);
}
export function validateSourceInventory(entries) {
  need(Array.isArray(entries), "PR306_SOURCE_INVENTORY");
  same(entries.map(entry => entry?.path), SOURCE_PATHS, "PR306_SOURCE_PATHS");
  for (const entry of entries) {
    keys(entry, ["path", "before", "after"], "PR306_SOURCE_INVENTORY");
    for (const side of entry.before === null ? [entry.after] : [entry.before, entry.after]) {
      keys(side, ["mode", "objectId", "rawSha256"], "PR306_SOURCE_INVENTORY");
      need(side.mode === "100644" && SHA.test(side.objectId) && HASH.test(side.rawSha256), "PR306_SOURCE_INVENTORY");
    }
  }
  need(digest(entries) === SOURCE_INVENTORY, "PR306_SOURCE_INVENTORY");
}
function canonicalTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value && Date.parse(value) <= Date.now();
}
export function validateSourceChecks(checks) {
  keys(checks, ["schemaVersion", "sourceCommit", "sourceTree", "executedAt", "nodeMajor", "liveProbePerformed", "commands"], "PR306_CHECKS_SCHEMA");
  need(checks.schemaVersion === "pr306-source-checks.v1" && checks.sourceCommit === SOURCE && checks.sourceTree === SOURCE_TREE &&
    checks.nodeMajor === 24 && checks.liveProbePerformed === false && canonicalTime(checks.executedAt), "PR306_CHECKS_SOURCE");
  need(Array.isArray(checks.commands) && checks.commands.length === COMMANDS.length, "PR306_COMMANDS");
  for (const command of checks.commands) {
    keys(command, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256", "summary"], "PR306_CHECKS_SCHEMA");
    need(command.exitCode === 0 && HASH.test(command.stdoutSha256) && HASH.test(command.stderrSha256), "PR306_EXECUTION_EVIDENCE");
  }
  same(checks.commands.map(({ name, args, summary }) => ({ name, args, summary })), COMMANDS, "PR306_COMMANDS");
}
export function testSummary(bytes) {
  try { return parseNodeTap(bytes); } catch { fail("PR306_TEST_REPORT"); }
}
export function commandEnvironment() {
  return { ...GIT_ENV, PATH: process.env.PATH ?? GIT_ENV.PATH, HOME: process.env.HOME ?? tmpdir(), TMPDIR: tmpdir(),
    NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" };
}
export function assertArtifactRoot(value, repoRoot) {
  const root = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(root === value && root.startsWith(temporary + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep) &&
    stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700 && readdirSync(root).length === 0, "PR306_ARTIFACT_ROOT");
  return root;
}
export function verifyExecution(name, result) {
  need(result.status === 0 && !result.error && !result.signal, "PR306_COMMAND_FAILED");
  const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
  const spec = COMMANDS.find(command => command.name === name);
  need(name === "gate-contract" || spec, "PR306_COMMANDS");
  let summary;
  if (name === "types") {
    need(stdout.length === 0 && stderr.length === 0, "PR306_TYPE_OUTPUT"); summary = null;
  } else summary = testSummary(stdout);
  if (name === "gate-contract") need(summary.tests === CONTRACT_TEST_COUNT && summary.skipped === 0, "PR306_CONTRACT_COUNT");
  else same(summary, spec.summary, "PR306_TEST_COUNT_OR_NAMES");
  return summary;
}
export function check(options) {
  const context = preflight(options), artifacts = assertArtifactRoot(options.artifactRoot, context.root);
  assertMaterializedTree(context.root, context.head);
  const commands = [{ name: "gate-contract", args: ["--test", "--test-reporter=tap", "scripts/promotion-reviewed-code-pr306.test.mjs"] }, ...COMMANDS];
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
  need(after.head === context.head && after.evidenceCommit === context.evidenceCommit, "PR306_SOURCE_MOVED");
  const decision = { schemaVersion: "pr306-decision.v1", result: "pass", scope: SCOPE, event: context.event,
    sourceCommit: SOURCE, sourceTree: SOURCE_TREE, sourceInventoryDigest: SOURCE_INVENTORY,
    toolingCommit: context.admission.toolingCommit, evidenceCommit: context.evidenceCommit,
    reviewBindings: context.admission.reviews, commands: records, policyScope: "service-company-routing", historicalNativeExecuted: false, permissions: PERMISSIONS };
  decision.decisionDigest = digest(decision);
  writeFileSync(path.join(artifacts, "decision.json"), stable(decision) + "\n", { flag: "wx", mode: 0o600 });
  return decision;
}
export function validateReview(review, role, admission, reportBytes) {
  keys(review, ["schemaVersion", "role", "reviewerIdentity", "result", "scope", "sourceCommit", "sourceTree",
    "sourceInventoryDigest", "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256",
    "reportRawSha256", "permissions", "reviewedAt", "findings"], "PR306_REVIEW_SCHEMA");
  need(review.schemaVersion === "pr306-independent-review.v1" && review.role === role &&
    review.reviewerIdentity === IDENTITIES[role] && review.scope === SCOPE &&
    review.result === "approved-for-exact-pr306-required-check", "PR306_REVIEW_DECISION");
  for (const [key, expected] of Object.entries({ sourceCommit: SOURCE, sourceTree: SOURCE_TREE,
    sourceInventoryDigest: SOURCE_INVENTORY, toolingCommit: admission.toolingCommit, toolingTree: admission.toolingTree,
    toolingInventoryDigest: admission.toolingInventoryDigest, checksRawSha256: CHECKS_SHA, reportRawSha256: hash(reportBytes) })) need(review[key] === expected, "PR306_REVIEW_BINDING");
  same(review.permissions, PERMISSIONS, "PR306_PERMISSION");
  need(typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
    new Date(review.reviewedAt).toISOString() === review.reviewedAt && Date.parse(review.reviewedAt) <= Date.now() &&
    Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(v => typeof v === "string" && v.length > 0), "PR306_REVIEW_FACTS");
}
export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot);
  need(root === repoRoot, "PR306_ROOT"); history(root);
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "PR306_DIRTY");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION).value;
  keys(a, ["schemaVersion", "pullRequest", "scope", "baseCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest",
    "toolingCommit", "toolingTree", "toolingInventoryDigest", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "pr306-admission.v1" && a.pullRequest === PULL_REQUEST && a.scope === SCOPE &&
    a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === SOURCE_TREE && a.sourceInventoryDigest === SOURCE_INVENTORY &&
    a.checksRawSha256 === CHECKS_SHA, "PR306_SCOPE");
  same(a.permissions, PERMISSIONS, "PR306_PERMISSION");
  need(tree(root, SOURCE) === SOURCE_TREE, "PR306_SOURCE_TREE");
  git(root, "merge-base", "--is-ancestor", BASE, SOURCE);
  same(parents(root, SOURCE), ["465196f63df4766404fd35e0cd447fcd8193a211"], "PR306_SOURCE_PARENTS");
  same(parents(root, "465196f63df4766404fd35e0cd447fcd8193a211"), ["037499f8102570602d4ef2610c55b6da4b245e63"], "PR306_SOURCE_PARENTS");
  same(parents(root, "037499f8102570602d4ef2610c55b6da4b245e63"), [BASE], "PR306_SOURCE_PARENTS");
  const entries = inventory(root, BASE, SOURCE);
  validateSourceInventory(entries);
  for (const file of SOURCE_PATHS) need(regular(root, file).equals(blob(root, SOURCE, file)), "PR306_SOURCE_WORKTREE");
  const recordedInventory = tracked(root, head, DIRECTORY + "/source-inventory.json").value;
  same(recordedInventory, { schemaVersion: "pr306-source-inventory.v1", baseCommit: BASE, sourceCommit: SOURCE,
    sourceTree: SOURCE_TREE, inventoryDigest: SOURCE_INVENTORY, entries }, "PR306_SOURCE_INVENTORY");
  need(SHA.test(a.toolingCommit) && SHA.test(a.toolingTree) && HASH.test(a.toolingInventoryDigest), "PR306_TOOLING");
  same(parents(root, a.toolingCommit), [SOURCE], "PR306_TOOLING_PARENT");
  same(changed(root, SOURCE, a.toolingCommit), CODE_PATHS, "PR306_TOOLING_PATHS");
  need(tree(root, a.toolingCommit) === a.toolingTree && digest(inventory(root, SOURCE, a.toolingCommit)) === a.toolingInventoryDigest, "PR306_TOOLING_DIGEST");
  for (const file of CODE_PATHS) need(regular(root, file).equals(blob(root, a.toolingCommit, file)), "PR306_TOOLING_DRIFT");
  const workflow = ".github/workflows/promotion-shadow.yml";
  need(blob(root, a.toolingCommit, workflow).toString("utf8") === expectedWorkflow(blob(root, SOURCE, workflow).toString("utf8")), "PR306_WORKFLOW");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "PR306_EVIDENCE_HISTORY");
  const evidenceCommit = additions[0];
  same(parents(root, evidenceCommit), [a.toolingCommit], "PR306_EVIDENCE_PARENT");
  same(changed(root, a.toolingCommit, evidenceCommit), EVIDENCE_PATHS, "PR306_EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) need(line(root, "ls-tree", a.toolingCommit, "--", file) === "", "PR306_EVIDENCE_NOT_NEW");
  need(tree(root, head) === tree(root, evidenceCommit), "PR306_EVIDENCE_TREE");
  const checks = tracked(root, head, DIRECTORY + "/source-checks.json");
  need(hash(checks.bytes) === CHECKS_SHA, "PR306_EXECUTION_EVIDENCE");
  validateSourceChecks(checks.value);
  const sourceTime = Number(line(root, "show", "-s", "--format=%ct", SOURCE));
  const toolingTime = Number(line(root, "show", "-s", "--format=%ct", a.toolingCommit));
  const evidenceTime = Number(line(root, "show", "-s", "--format=%ct", evidenceCommit));
  need(Date.parse(checks.value.executedAt) >= sourceTime * 1000 && Math.floor(Date.parse(checks.value.executedAt) / 1000) <= toolingTime, "PR306_CHECKS_TIME");
  keys(a.reviews, ["A11", "A23"], "PR306_REVIEWS");
  for (const role of ["A11", "A23"]) {
    const prefix = DIRECTORY + "/" + role.toLowerCase() + "-review", r = tracked(root, head, prefix + ".json");
    const report = blob(root, head, prefix + ".md");
    need(regular(root, prefix + ".md").equals(report), "PR306_REVIEW_WORKTREE");
    same(a.reviews[role], { decisionRawSha256: hash(r.bytes), reportRawSha256: hash(report) }, "PR306_REVIEW_HASH");
    validateReview(r.value, role, a, report);
    need(Date.parse(r.value.reviewedAt) >= toolingTime * 1000 && Math.floor(Date.parse(r.value.reviewedAt) / 1000) <= evidenceTime, "PR306_REVIEW_TIME");
  }
  const event = parse(readFileSync(eventPath));
  need(event.repository?.full_name === REPOSITORY, "PR306_EVENT_REPOSITORY");
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    need(event.number === PULL_REQUEST && pr?.number === PULL_REQUEST && pr.base?.ref === "main" && pr.base.sha === BASE &&
      pr.base.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY &&
      pr.head.sha === head && head === evidenceCommit, "PR306_EVENT_PR");
  } else {
    need(eventName === "push" && event.ref === "refs/heads/main" && event.before === BASE && event.after === head, "PR306_EVENT_PUSH");
    same(parents(root, head), [BASE, evidenceCommit], "PR306_EVENT_MERGE");
  }
  return { root, head, evidenceCommit, admission: a, checks: checks.value,
    event: { name: eventName, pullRequest: eventName === "pull_request" ? PULL_REQUEST : null, baseCommit: BASE, headCommit: head } };
}
function main() {
  need(!process.env.NODE_OPTIONS && !process.env.NODE_PATH && process.execArgv.every(a => !/^--?(?:loader|import|require|experimental-loader)/u.test(a)), "PR306_LOADER");
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "check"].includes(operation), "PR306_USAGE");
  const names = { repo: "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot" }, options = {};
  need(args.length % 2 === 0, "PR306_USAGE");
  for (let i = 0; i < args.length; i += 2) {
    const name = names[args[i].replace(/^--/u, "")];
    need(args[i].startsWith("--") && name && options[name] === undefined && args[i + 1], "PR306_USAGE"); options[name] = args[i + 1];
  }
  for (const name of ["repoRoot", "eventName", "eventPath"]) need(options[name], "PR306_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr306\n"); }
  else { need(options.artifactRoot, "PR306_USAGE"); process.stdout.write(stable(check(options)) + "\n"); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(stable({ result: "blocked", code: error.code ?? "PR306_FAILED", liveAllowed: false }) + "\n"); process.exitCode = 2; }
}
