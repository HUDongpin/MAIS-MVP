#!/usr/bin/env node
// One additive, non-live PR201 candidate slice. Local validation is not CI admission.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, assertArtifactSet, MANIFEST } from "./promotion-required-check-legacy-successor-v1.mjs";
import { inventory, assertMaterializedTree } from "./promotion-reviewed-code-pr264.mjs";

export const BASE = "656ac319b2ad5812d31ad952cbb18430b5e58065";
export const PLAN_HASH = "4d17dc2824446dc8c000960ef5778ffd0e9b030eea409011df6bebf4405d1049";
export const PREDECESSOR = "ac9260368713c2ab364dedd5508c07fa6fc3b91d";
export const DIRECTORY = "coordination/integration/pr201-diversity-228-v1";
export const REVIEW_DIRECTORY = `${DIRECTORY}/revisions/historical-source-fetch-v1`;
export const REVISION_PATHS = Object.freeze([".github/workflows/promotion-shadow.yml", "docs/pr201-candidate-integration.md", "scripts/promotion-pr201-candidate.mjs", "scripts/promotion-pr201-candidate.test.mjs"]);
export const PLAN = `${DIRECTORY}/plan.json`;
export const ADMISSION = `${REVIEW_DIRECTORY}/admission.json`;
export const DATA = "data/generated-content/us-ar-g6-g12-pr201-diversity-228-v2/revised-228.json";
export const BANK = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml", "scripts/promotion-pr201-candidate.mjs",
  "scripts/promotion-pr201-candidate.test.mjs", "scripts/pr201-candidate-regression.test.mjs",
  "docs/pr201-candidate-integration.md", "coordination/session-logs/2026-10-18-A23-pr201-integration-228.md"
].sort());
export const EVIDENCE_PATHS = Object.freeze([ADMISSION, ...["a11", "a23"].flatMap(role => [`${REVIEW_DIRECTORY}/${role}-review.json`, `${REVIEW_DIRECTORY}/${role}-review.md`])].sort());
export const PERMISSIONS = Object.freeze({ liveAllowed: false, mergeAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false });
export const COMMANDS = Object.freeze([
  ["contract", ["--test", "scripts/promotion-pr201-candidate.test.mjs"]],
  ["grading", ["--import", "tsx", "--test", "scripts/pr201-candidate-regression.test.mjs"]],
  ["isolation", ["--import", "tsx", "--test", "--test-concurrency=1", "--test-name-pattern=^(only promoted US practice packages are live while candidate packages stay unreachable|Arkansas local-maximum candidate accepts the requested calendar year|Arkansas accumulated-profit candidate grades dollars at the requested scale)$", "lib/mainlandPepHighQuestionBank.test.ts", "lib/fullQuestionBankSolvability.test.ts"]],
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]]
]);
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export const digest = value => hash(Buffer.from(stable(value)));
const SHA = /^[a-f0-9]{40}$/u, HASH = /^[a-f0-9]{64}$/u;
const GIT_ENV = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" };
function need(ok, code) { if (!ok) throw new Error(`PR201_${code}`); }
function same(a, b, code) { need(stable(a) === stable(b), code); }
function keys(value, expected) { need(value && typeof value === "object" && !Array.isArray(value), "SCHEMA"); same(Object.keys(value).sort(), [...expected].sort(), "SCHEMA"); }
function git(root, ...args) {
  const entry = path.join(root, ".git"), s = lstatSync(entry); need(!s.isSymbolicLink(), "GIT_ALIAS");
  const pointer = s.isDirectory() ? entry : path.resolve(root, readFileSync(entry, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u)?.[1] ?? "invalid");
  return execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${realpathSync(pointer)}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false", ...args], { cwd: root, env: GIT_ENV, timeout: 30000, maxBuffer: 128 * 1024 * 1024 });
}
const line = (root, ...args) => git(root, ...args).toString("utf8").trim();
const names = bytes => bytes.toString("utf8").split("\0").filter(Boolean).sort();
const changed = (root, a, b) => names(git(root, "diff", "--name-only", "--no-renames", "-z", a, b));
const tree = (root, ref) => line(root, "rev-parse", `${ref}^{tree}`);
const parents = (root, ref) => line(root, "show", "-s", "--format=%P", ref).split(" ");
const ancestor = (root, a, b) => git(root, "merge-base", "--is-ancestor", a, b);
function regular(root, file) {
  need(typeof file === "string" && !path.isAbsolute(file) && !file.includes("\\") && file.split("/").every(x => x && x !== "." && x !== ".."), "PATH");
  let absolute = root;
  for (const part of file.split("/")) { absolute = path.join(absolute, part); need(!lstatSync(absolute).isSymbolicLink(), "FILE_ALIAS"); }
  const stat = lstatSync(absolute);
  need(stat.isFile() && stat.nlink === 1 && stat.size < 32 * 1024 * 1024 && realpathSync(absolute) === absolute, "FILE");
  return readFileSync(absolute);
}
function blob(root, ref, file) { return git(root, "show", `${ref}:${file}`); }
function clean(root) { need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "DIRTY_CI"); }
function flags(root) { need(names(git(root, "ls-files", "-v", "-z")).every(row => row.startsWith("H ")), "INDEX_FLAGS"); }
function tracked(root, ref, file) { const bytes = regular(root, file); need(bytes.equals(blob(root, ref, file)), "WORKTREE_DRIFT"); return parse(bytes); }

export function validateContent(root) {
  const rawPlan = regular(root, PLAN); need(hash(rawPlan) === PLAN_HASH, "PLAN_HASH");
  const plan = parse(rawPlan); need(plan.baseCommit === BASE, "BASE"); same(plan.permissions, PERMISSIONS, "PERMISSION");
  for (const [file, sha] of Object.entries(plan.artifacts)) need(hash(regular(root, file)) === sha, "ARTIFACT_HASH");
  need(hash(regular(root, BANK)) === plan.originalBank.sha256 && regular(root, BANK).equals(blob(root, BASE, BANK)), "ORIGINAL_BANK");
  const read = name => parse(regular(root, `${DIRECTORY}/a18/${name}`));
  const rows = parse(regular(root, DATA)), scope = read("scope.json"), candidate = read("question-pack.json"), decision = read("qa-decision.json");
  const ids = rows.map(row => row.id), selected = new Set(ids);
  need(rows.length === 228 && selected.size === 228, "ROW_COUNT"); same([...ids].sort(), [...scope.rowIds].sort(), "ROW_SCOPE");
  need(decision.verdict === "approved-for-integration-review" && decision.accepted === 228 && decision.pending === 0 && decision.rejected === 0 && decision.blockingFindings === 0 && decision.liveAllowed === false && decision.wholePackAccepted === false, "A18_DECISION");
  need(decision.candidateSha256 === plan.candidateSha256 && decision.revised228Sha256 === plan.revised228Sha256, "A18_BINDING");
  const manifest = new Map(read("item-manifest.json").items.map(item => [item.id, item]));
  const reviewed = new Map();
  for (const ref of decision.reviewSources) {
    need(hash(regular(root, `${DIRECTORY}/a18/${ref.path}`)) === ref.sha256, "A18_REVIEW_HASH");
    const report = read(ref.path); need((report.candidateSha256 ?? report.fullPackSha256) === plan.candidateSha256, "A18_REVIEW_CANDIDATE");
    for (const item of report.items ?? report.rows) { need(!reviewed.has(item.id), "A18_DUPLICATE"); reviewed.set(item.id, item.candidateRowSha256 ?? item.rowSha256); }
  }
  same([...reviewed.keys()].sort(), [...ids].sort(), "A18_COVERAGE");
  for (const row of rows) { need(digest(row) === manifest.get(row.id)?.candidateRowSha256 && digest(row) === reviewed.get(row.id), "A18_ROW_HASH"); }
  const original = parse(regular(root, BANK)).questions, current = new Map(candidate.questions.map(q => [q.id, q])), revision = new Map(rows.map(q => [q.id, q]));
  same(original.map(q => q.id), candidate.questions.map(q => q.id), "FULL_PACK_ORDER");
  same(original.filter(q => stable(q) !== stable(current.get(q.id))).map(q => q.id).sort(), [...ids].sort(), "FULL_PACK_MASK");
  for (const id of ids) same(revision.get(id), current.get(id), "ROW_EMBEDDING");
  const q014 = original.find(q => q.id === "us-ar-g6-g12-v1-g12-c04-q014");
  need(q014?.answer === "38000" && !selected.has(q014.id), "Q014");
  return { plan, sourcePaths: [...Object.keys(plan.artifacts), PLAN, ...CODE_PATHS].sort(), revisedRows: rows.length, unchangedRows: original.length - rows.length };
}
export function inspect(repoRoot) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "ROOT_ALIAS"); flags(root);
  ancestor(root, BASE, PREDECESSOR); ancestor(root, PREDECESSOR, "HEAD"); const content = validateContent(root);
  const paths = new Set([...names(git(root, "diff", "--name-only", "--no-renames", "-z", PREDECESSOR)), ...names(git(root, "ls-files", "--others", "--exclude-standard", "-z"))]);
  need([...paths].every(file => REVISION_PATHS.includes(file) || EVIDENCE_PATHS.includes(file)), "OUT_OF_SCOPE");
  for (const file of content.sourcePaths) regular(root, file);
  return { schemaVersion: "pr201-local-inspection.v1", result: "pass", scope: "local-228-nonlive-slice", baselineCommit: BASE, predecessorCommit: PREDECESSOR, revisedRows: content.revisedRows, unchangedRows: content.unchangedRows, sourceDigest: digest(content.sourcePaths.map(file => ({ path: file, sha256: hash(regular(root, file)) }))), ciAdmission: "not-frozen", ...PERMISSIONS };
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "ROOT_ALIAS");
  // An absent real binding must never fall back to an older passing contract.
  let exists = true; try { lstatSync(path.join(root, ADMISSION)); } catch (error) { if (error.code === "ENOENT") exists = false; else throw error; }
  need(exists, "ADMISSION_NOT_FROZEN"); clean(root); flags(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "SHALLOW");
  const head = line(root, "rev-parse", "HEAD"), a = tracked(root, head, ADMISSION); validateContent(root);
  keys(a, ["schemaVersion", "baseCommit", "predecessorCommit", "sourceCommit", "sourceTree", "sourceInventoryDigest", "pullRequest", "reviews", "permissions"]);
  need(a.schemaVersion === "pr201-candidate-admission.v2" && a.baseCommit === BASE && a.predecessorCommit === PREDECESSOR && SHA.test(a.sourceCommit) && HASH.test(a.sourceInventoryDigest) && Number.isSafeInteger(a.pullRequest) && a.pullRequest > 0, "ADMISSION");
  same(a.permissions, PERMISSIONS, "PERMISSION"); ancestor(root, BASE, PREDECESSOR); same(parents(root, a.sourceCommit), [PREDECESSOR], "SOURCE_PARENT");
  same(changed(root, PREDECESSOR, a.sourceCommit), REVISION_PATHS, "SOURCE_PATHS");
  need(tree(root, a.sourceCommit) === a.sourceTree && digest(inventory(root, PREDECESSOR, a.sourceCommit)) === a.sourceInventoryDigest, "SOURCE_DIGEST");
  for (const file of REVISION_PATHS) need(line(root, "ls-tree", PREDECESSOR, "--", file).startsWith("100644 blob "), "REVISION_SOURCE_MODE");
  const additions = line(root, "log", head, "--format=%H", "--diff-filter=A", "--", ADMISSION).split("\n");
  need(additions.length === 1 && SHA.test(additions[0]), "ADMISSION_HISTORY"); const evidence = additions[0];
  same(parents(root, evidence), [a.sourceCommit], "EVIDENCE_PARENT"); same(changed(root, a.sourceCommit, evidence), EVIDENCE_PATHS, "EVIDENCE_PATHS");
  for (const file of EVIDENCE_PATHS) { need(line(root, "ls-tree", a.sourceCommit, "--", file) === "", "EVIDENCE_REUSE"); need(line(root, "ls-tree", evidence, "--", file).startsWith("100644 blob "), "EVIDENCE_MODE"); }
  for (const file of REVISION_PATHS) need(line(root, "ls-tree", a.sourceCommit, "--", file).startsWith("100644 blob "), "SOURCE_MODE");
  ancestor(root, evidence, head); need(tree(root, head) === tree(root, evidence), "TREE_DRIFT");
  keys(a.reviews, ["A11", "A23"]);
  for (const role of ["A11", "A23"]) {
    const ref = a.reviews[role], file = `${REVIEW_DIRECTORY}/${role.toLowerCase()}-review.json`, reportPath = `${REVIEW_DIRECTORY}/${role.toLowerCase()}-review.md`;
    keys(ref, ["decisionSha256", "reportSha256"]); const review = tracked(root, head, file);
    keys(review, ["schemaVersion", "role", "reviewer", "reviewedAt", "predecessorCommit", "sourceCommit", "sourceInventoryDigest", "result", "permissions"]);
    need(hash(regular(root, file)) === ref.decisionSha256 && hash(regular(root, reportPath)) === ref.reportSha256, "REVIEW_HASH");
    need(review.schemaVersion === "pr201-candidate-review.v2" && review.predecessorCommit === PREDECESSOR && review.role === role && review.reviewer === ({ A11: "/root/pr201_minimal_consumer_review", A23: "/root/pr201_minimal_gate_review" })[role] && Number.isFinite(Date.parse(review.reviewedAt)) && Date.parse(review.reviewedAt) <= Date.now() && review.sourceCommit === a.sourceCommit && review.sourceInventoryDigest === a.sourceInventoryDigest && review.result === "approved-for-nonlive-candidate-admission", "REVIEW_BINDING");
    same(review.permissions, PERMISSIONS, "REVIEW_PERMISSION");
  }
  const event = parse(readFileSync(eventPath)); need(["pull_request", "push"].includes(eventName), "EVENT");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const eventHead = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(SHA.test(base ?? "") && eventHead === head, "EVENT_HEAD"); ancestor(root, base, head);
  if (eventName === "pull_request") need(base === BASE && event.number === a.pullRequest, "EVENT_PR");
  else need(event.ref === "refs/heads/main" && (base === BASE || tree(root, base) === tree(root, evidence)), "EVENT_PUSH");
  assertMaterializedTree(root, head);
  return { root, head, evidenceCommit: evidence, admission: a, event: { eventName, baseCommit: base, headCommit: head, pullRequest: eventName === "pull_request" ? event.number : null } };
}
function artifacts(value) {
  const temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), absolute = realpathSync(value), stat = lstatSync(value);
  need(absolute === value && absolute.startsWith(`${temporary}/`) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "ARTIFACT_ROOT"); return absolute;
}
const save = (root, file, value) => writeFileSync(path.join(root, file), stable(value) + "\n", { flag: "wx", mode: 0o600 });
export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "TEST_SET");
  for (let i = 0; i < COMMANDS.length; i++) {
    const row = records[i], [name, args] = COMMANDS[i]; keys(row, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    need(row.name === name && row.exitCode === 0, "TEST_EXIT"); same(row.args, args, "TEST_COMMAND");
    need(hash(regular(root, `${name}.stdout`)) === row.stdoutSha256 && hash(regular(root, `${name}.stderr`)) === row.stderrSha256, "TEST_BYTES");
  }
}
export function assertObservation(actual, expected, baseline) {
  same(actual, expected, "CURRENT_OBSERVATION");
  same(actual.canonicalAudit, baseline.canonicalAudit, "CANONICAL_AUDIT");
  need(actual.canonicalAuditDigest === baseline.canonicalAuditDigest, "CANONICAL_AUDIT");
  const currentPolicy = { ...actual.expectedRuntimePolicy }, baselinePolicy = { ...baseline.expectedRuntimePolicy };
  need(currentPolicy.coveredFileCount === baselinePolicy.coveredFileCount + 1, "COVERAGE_DELTA");
  for (const key of ["coveredFileCount", "coveredFilesDigest", "classificationsDigest"]) { delete currentPolicy[key]; delete baselinePolicy[key]; }
  same(currentPolicy, baselinePolicy, "RUNTIME_BOUNDARY");
}
export async function observeCurrent(context) {
  assertMaterializedTree(context.root, context.head);
  const manifest = tracked(context.root, context.head, MANIFEST);
  const historicalBytes = regular(context.root, manifest.historical.manifest.path);
  need(hash(historicalBytes) === manifest.historical.manifest.rawSha256, "HISTORICAL_MANIFEST");
  const { observePreparation } = await import(pathToFileURL(path.join(context.root, "coordination/integration/legacy-successor/contract.mjs")));
  const observation = await observePreparation(context.root, parse(historicalBytes));
  const expected = tracked(context.root, context.head, `${DIRECTORY}/source-observation.json`);
  const baseline = parse(blob(context.root, BASE, "coordination/integration/reviewed-code/pr264-v1/source-observation.json"));
  assertObservation(observation, expected, baseline);
  const registryBytes = regular(context.root, manifest.legacyResolution.registryPath);
  need(hash(registryBytes) === manifest.legacyResolution.rawSha256, "REGISTRY");
  same(observation.canonicalAudit, parse(registryBytes).expectedCanonicalAudit, "CANONICAL_AUDIT");
  assertMaterializedTree(context.root, context.head); clean(context.root); need(line(context.root, "rev-parse", "HEAD") === context.head, "HEAD_MOVED");
  return { observationSha256: hash(regular(context.root, `${DIRECTORY}/source-observation.json`)), runtimePolicyDigest: digest(observation.expectedRuntimePolicy), canonicalAuditDigest: observation.canonicalAuditDigest };
}
export async function check(options) {
  const context = preflight(options), output = artifacts(options.artifactRoot), records = [];
  for (const [name, args] of COMMANDS) {
    const run = spawnSync(process.execPath, args, { cwd: context.root, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.RUNNER_TEMP ?? tmpdir(), NODE_ENV: "test", HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_DB_PATH: path.join(output, "regression.sqlite"), AI_TUTOR_PROVIDER_PROFILE: "offline-fixture" }, timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = Buffer.from(run.stdout ?? []), stderr = Buffer.from(run.stderr ?? []);
    writeFileSync(path.join(output, `${name}.stdout`), stdout, { flag: "wx", mode: 0o600 }); writeFileSync(path.join(output, `${name}.stderr`), stderr, { flag: "wx", mode: 0o600 });
    need(run.status === 0 && !run.signal && !run.error, "TEST_FAILED"); records.push({ name, args, exitCode: 0, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  }
  verifyTestRecords(output, records); const observation = await observeCurrent(context);
  const proof = { schemaVersion: "pr201-current-proof.v2", event: context.event, sourceCommit: context.admission.sourceCommit, evidenceCommit: context.evidenceCommit, tests: records, observation };
  save(output, "current.json", proof); return proof;
}
async function decision(options) {
  const c = preflight(options), output = artifacts(options.artifactRoot), proof = parse(regular(output, "current.json"));
  keys(proof, ["schemaVersion", "event", "sourceCommit", "evidenceCommit", "tests", "observation"]);
  need(proof.schemaVersion === "pr201-current-proof.v2" && proof.sourceCommit === c.admission.sourceCommit && proof.evidenceCommit === c.evidenceCommit, "CURRENT_BINDING");
  same(proof.event, c.event, "CURRENT_EVENT"); verifyTestRecords(output, proof.tests); same(proof.observation, await observeCurrent(c), "CURRENT_OBSERVATION");
  assertArtifactSet(options.baselineArtifacts);
  const baseline = realpathSync(options.baselineRoot); need(baseline === options.baselineRoot && baseline !== c.root && line(baseline, "rev-parse", "HEAD") === HISTORICAL_BASE, "HISTORICAL_ROOT");
  clean(baseline); assertMaterializedTree(baseline, HISTORICAL_BASE);
  same(parse(readFileSync(options.baselineEvent)), { number: 259, pull_request: { base: { sha: HISTORICAL_BASE }, head: { sha: HISTORICAL_BASE } } }, "HISTORICAL_EVENT");
  const file = "scripts/promotion-required-check-legacy-successor-v1.mjs"; need(regular(baseline, file).equals(blob(c.root, HISTORICAL_BASE, file)), "HISTORICAL_CHECKER");
  const legacy = await import(pathToFileURL(path.join(baseline, file))); const prior = await legacy.verify({ repoRoot: baseline, eventName: "pull_request", eventPath: options.baselineEvent, artifactRoot: options.baselineArtifacts });
  need(prior.result === "pass" && prior.event.baseCommit === HISTORICAL_BASE && prior.event.headCommit === HISTORICAL_BASE, "HISTORICAL_PROOF");
  clean(baseline); assertMaterializedTree(baseline, HISTORICAL_BASE);
  const result = { schemaVersion: "pr201-candidate-decision.v2", result: "pass", scope: "exact-228-candidate-historical-fetch-revision-only", predecessorCommit: PREDECESSOR, event: c.event, sourceCommit: c.admission.sourceCommit, evidenceCommit: c.evidenceCommit, sourceInventoryDigest: c.admission.sourceInventoryDigest, currentProofSha256: hash(regular(output, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: prior.decisionDigest, artifactSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...result, decisionDigest: digest(result) };
}
export async function main(argv) {
  const [operation, ...args] = argv; need(["inspect", "select", "preflight", "check", "finalize", "verify"].includes(operation), "USAGE");
  const fields = { "--repo": "repoRoot", "--event-name": "eventName", "--event-path": "eventPath", "--artifact-root": "artifactRoot", "--baseline-root": "baselineRoot", "--baseline-event": "baselineEvent", "--baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "USAGE"); for (let i = 0; i < args.length; i += 2) { const key = fields[args[i]]; need(key && !Object.hasOwn(options, key) && args[i + 1], "USAGE"); options[key] = args[i + 1]; }
  need(options.repoRoot, "USAGE");
  if (operation === "inspect") { need(Object.keys(options).length === 1, "USAGE"); return inspect(options.repoRoot); }
  need(options.eventName && options.eventPath, "USAGE");
  if (operation === "select") { preflight(options); return "candidate-pr201"; }
  if (operation === "preflight") return preflight(options).event;
  if (operation === "check") return check(options);
  const result = await decision(options);
  if (operation === "finalize") save(artifacts(options.artifactRoot), "decision.json", result);
  else same(parse(regular(artifacts(options.artifactRoot), "decision.json")), result, "DECISION_MISMATCH");
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then(value => process.stdout.write(typeof value === "string" ? value + "\n" : stable(value) + "\n")).catch(error => { process.stderr.write(String(error.message) + "\n"); process.exitCode = 2; });
