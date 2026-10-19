#!/usr/bin/env node
// One reviewed integration of PR #282, PR #281, and PR #280.
// A11 and A23 reports are hash-bound and explicitly pending. This contract does
// not grant ordinary-code eligibility and does not weaken any older mode.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, MANIFEST, assertArtifactSet } from "./promotion-required-check-legacy-successor-v1.mjs";

export const BASE = "fd2138127bdfe56981835c754c8bf944eabe7fb2";
export const PR282_PARENT = "dbc1d25dba753fb8b57afc78a2c79d0481b29240";
export const PR282 = "4f6cc821491d4a604cb3461c6aa6caef0f942e73";
export const PR281 = "ab689091dcdcc2c31f92d1d2e8b7d3dbc3abcf02";
export const PR280 = "487fdc5a4c6b552d09c69f1d53885e0f8bc8a519";
export const MERGE282 = "1c6b7c87ee762012c10c32ac8bb4c12ae664c519";
export const MERGE281 = "8ddebc1549f919821198f71e123d1512acdf610d";
export const SOURCE = "64e2fad979f2a936e8347843fe1952fc1cf059f2";
export const SOURCE_TREE = "c792eb31abf1622800d54fd5a36082c318f09889";
export const PREDECESSOR = SOURCE;
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const PULL_REQUEST = 283;
export const PR282_INVENTORY = "8e148c204a9509f6116fa7892bcdb4750aad8857fbdc501e25ee292d68f04e13";
export const PR281_INVENTORY = "ecb5feaea46f31a3a1d83d008f8875cb129ca0db6727f1b16d717a7c61711691";
export const PR280_INVENTORY = "dff0cb6fc8b0c3283040433530ad7a61ec3d873f5688facb91dc3163204abe5a";
export const SOURCE_INVENTORY = "aab98d55161b36e3972d12f4991131548db2c94775f96a4aedd48edab4572419";
export const OBSERVATION_SHA = "3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0";
export const CI_MERGED_BLOB = "4cf391946f0b2c72ca946cab5f5f32cad279e612";
export const USERSTORE_MERGED_BLOB = "cb47cf71ccc4dfe80e85cdd6a13aecbcb1a86a5f";
export const DIRECTORY = "coordination/integration/reviewed-code/pr282-pr281-pr280-v1";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const REVIEW_RESULT = "pending-independent-review";
export const DECISION_RESULT = "pending";
export const DECISION_SCOPE = "exact-pr282-pr281-pr280-pending-independent-review";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "docs/pr282-pr281-pr280-reviewed-code-gate.md",
  "scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs",
  "scripts/promotion-reviewed-code-pr282-pr281-pr280.test.mjs"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, `${DIRECTORY}/source-observation.json`, `${DIRECTORY}/source-checks.json`,
  ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])
].sort());
export const PR282_PATHS = Object.freeze([
  ".env.example",
  ".env.local.example",
  ".github/workflows/ci.yml",
  "lib/server/demoSeedBackfill.test.ts",
  "lib/server/demoSeedBackfill.ts",
  "lib/server/demoSeedBackfillPersistence.test.ts",
  "lib/server/demoSeedBackfillProbe.ts",
  "lib/server/userStore.ts"
].sort());
export const PR281_PATHS = Object.freeze([
  ".github/workflows/ci.yml",
  "app/api/auth/funnel/route.test.ts",
  "lib/server/authFunnelMetrics.test.ts",
  "lib/server/authFunnelMetrics.ts"
].sort());
export const PR280_PATHS = Object.freeze([
  "lib/server/userStore.ts",
  "lib/server/userStore/studentActivityPersistence.ts",
  "lib/server/userStoreStudentActivityPersistence.test.ts"
].sort());
export const OVERLAP_PATHS = Object.freeze([".github/workflows/ci.yml", "lib/server/userStore.ts"]);
export const SOURCE_PATHS = Object.freeze([...new Set([...PR282_PATHS, ...PR281_PATHS, ...PR280_PATHS])].sort());
export const PRESERVED_PATHS = Object.freeze([
  "scripts/promotion-reviewed-code-pr259.mjs", "scripts/promotion-reviewed-code-pr259.test.mjs",
  "scripts/promotion-reviewed-code-pr270-pr271.mjs", "scripts/promotion-reviewed-code-pr270-pr271.test.mjs",
  "scripts/promotion-reviewed-code-pr264.mjs", "scripts/promotion-reviewed-code-pr264.test.mjs",
  "scripts/promotion-reviewed-code-pr276.mjs", "scripts/promotion-reviewed-code-pr276.test.mjs",
  "scripts/promotion-reviewed-code-pr276-v2.mjs", "scripts/promotion-reviewed-code-pr276-v2.test.mjs",
  "scripts/promotion-reviewed-code-pr276-v3.mjs", "scripts/promotion-reviewed-code-pr276-v3.test.mjs",
  "docs/pr259-reviewed-code-gate.md", "docs/pr264-reviewed-code-gate.md", "docs/pr270-pr271-reviewed-code-gate.md",
  "docs/pr276-reviewed-code-gate.md", "docs/pr276-v2-reviewed-code-gate.md", "docs/pr276-v3-reviewed-code-gate.md",
  "scripts/promotion-pr201-candidate.mjs", "scripts/promotion-pr201-candidate.test.mjs",
  "scripts/pr201-candidate-regression.test.mjs", "docs/pr201-candidate-integration.md",
  "coordination/integration/pr201-diversity-228-v1",
  "coordination/integration/reviewed-code/pr276-v3",
  "coordination/integration/reviewed-code/pr276-v2",
  "coordination/integration/reviewed-code/pr276-v1",
  "coordination/integration/reviewed-code/pr264-v1",
  "coordination/integration/reviewed-code/pr259-v3",
  "coordination/integration/reviewed-code/pr270-pr271-v1",
  "coordination/integration/legacy-successor",
  "scripts/promotion-required-check-legacy-successor-v1.mjs",
  "scripts/promotion-workflow-json-guard.mjs"
].sort());
const IDENTITIES = Object.freeze({ A11: "pending-independent-a11", A23: "pending-independent-a23" });
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const HASH = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
export const PERMISSIONS = Object.freeze({ ordinaryCodeEligible: false, liveAllowed: false, integrationAllowed: false, previewAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false });
export const COMMANDS = Object.freeze([
  ["seed", ["--import", "tsx", "--test", "lib/server/demoSeedBackfill.test.ts", "lib/server/demoSeedBackfillPersistence.test.ts"]],
  ["funnel", ["--import", "tsx", "--test", "--test-concurrency=1", "lib/server/authFunnelMetrics.test.ts", "app/api/auth/funnel/route.test.ts"]],
  ["activity", ["--import", "tsx", "--test", "lib/server/userStoreStudentActivityPersistence.test.ts"]],
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]]
]);
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
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
function identity(row) { if (!row) return null; const { bytes, ...result } = row; return result; }
export function inventory(root, a, b) { return changed(root, a, b).map(file => ({ path: file, before: identity(blob(root, a, file, true)), after: identity(blob(root, b, file, true)) })); }
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

export function assertMaterializedTree(root, head) {
  const flags = git(root, "ls-files", "-v", "-z").toString("utf8").split("\0").filter(Boolean);
  need(flags.every(row => row.startsWith("H ")), "REVIEWED_CODE_INDEX_FLAGS");
  const rows = new TextDecoder("utf-8", { fatal: true }).decode(git(root, "ls-tree", "-r", "-z", head)).split("\0").filter(Boolean);
  for (const row of rows) {
    const match = row.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u);
    need(match, "REVIEWED_CODE_SOURCE_MODE");
    const file = path.join(root, match[3]), stat = lstatSync(file);
    need(stat.isFile() && !stat.isSymbolicLink() && realpathSync(file) === file && ((stat.mode & 0o111) ? "100755" : "100644") === match[1], "REVIEWED_CODE_SOURCE_FILE");
    const bytes = readFileSync(file);
    const objectId = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    need(objectId === match[2], "REVIEWED_CODE_SOURCE_BYTES");
  }
}

function mergedFile(baseBytes, oursBytes, theirsBytes) {
  const directory = mkdtempSync(path.join(realpathSync(tmpdir()), "reviewed-code-merge-"));
  try {
    const baseFile = path.join(directory, "base"), oursFile = path.join(directory, "ours"), theirsFile = path.join(directory, "theirs");
    writeFileSync(baseFile, baseBytes); writeFileSync(oursFile, oursBytes); writeFileSync(theirsFile, theirsBytes);
    const result = spawnSync("/usr/bin/git", ["merge-file", "-q", oursFile, baseFile, theirsFile], { env: GIT_ENV, timeout: 30000 });
    need(result.status === 0 && !result.error, "REVIEWED_CODE_MERGE_FILE");
    return readFileSync(oursFile);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

export function assertPreservedContracts(root, ref) {
  for (const file of PRESERVED_PATHS) {
    const before = git(root, "ls-tree", "-z", BASE, "--", file);
    need(before.length > 0 && before.equals(git(root, "ls-tree", "-z", ref, "--", file)), "REVIEWED_CODE_PRIOR_CONTRACT");
  }
}

export function assertMergedSources(root) {
  same(parents(root, PR282_PARENT), [BASE], "REVIEWED_CODE_PR282_PARENT");
  same(parents(root, PR282), [PR282_PARENT], "REVIEWED_CODE_PR282_PARENT");
  same(parents(root, PR281), [BASE], "REVIEWED_CODE_PR281_PARENT");
  same(parents(root, PR280), [BASE], "REVIEWED_CODE_PR280_PARENT");
  same(parents(root, MERGE282), [BASE, PR282], "REVIEWED_CODE_MERGE282_PARENT");
  same(parents(root, MERGE281), [MERGE282, PR281], "REVIEWED_CODE_MERGE281_PARENT");
  same(parents(root, SOURCE), [MERGE281, PR280], "REVIEWED_CODE_SOURCE_PARENT");
  need(tree(root, MERGE282) === tree(root, PR282), "REVIEWED_CODE_MERGE282_TREE");
  need(tree(root, SOURCE) === SOURCE_TREE, "REVIEWED_CODE_SOURCE_TREE");
  ancestor(root, BASE, PR282); ancestor(root, BASE, PR281); ancestor(root, BASE, PR280);
  ancestor(root, PR282, SOURCE); ancestor(root, PR281, SOURCE); ancestor(root, PR280, SOURCE);
  ancestor(root, MERGE282, SOURCE); ancestor(root, MERGE281, SOURCE);
  same(changed(root, BASE, PR282), PR282_PATHS, "REVIEWED_CODE_PR282_PATHS");
  same(changed(root, BASE, PR281), PR281_PATHS, "REVIEWED_CODE_PR281_PATHS");
  same(changed(root, BASE, PR280), PR280_PATHS, "REVIEWED_CODE_PR280_PATHS");
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "REVIEWED_CODE_SOURCE_PARTITION");
  const overlap = [...PR282_PATHS, ...PR281_PATHS, ...PR280_PATHS].filter((file, index, all) => all.indexOf(file) !== index);
  same([...new Set(overlap)].sort(), [...OVERLAP_PATHS], "REVIEWED_CODE_SOURCE_OVERLAP");
  for (const file of PR282_PATHS) if (!OVERLAP_PATHS.includes(file)) need(blob(root, SOURCE, file).objectId === blob(root, PR282, file).objectId, "REVIEWED_CODE_PR282_BLOB");
  for (const file of PR281_PATHS) if (!OVERLAP_PATHS.includes(file)) need(blob(root, SOURCE, file).objectId === blob(root, PR281, file).objectId, "REVIEWED_CODE_PR281_BLOB");
  for (const file of PR280_PATHS) if (!OVERLAP_PATHS.includes(file)) need(blob(root, SOURCE, file).objectId === blob(root, PR280, file).objectId, "REVIEWED_CODE_PR280_BLOB");
  const ciBase = blob(root, BASE, ".github/workflows/ci.yml"), ci282 = blob(root, PR282, ".github/workflows/ci.yml"), ci281 = blob(root, PR281, ".github/workflows/ci.yml"), ciMerged = blob(root, SOURCE, ".github/workflows/ci.yml");
  need(ciMerged.objectId === CI_MERGED_BLOB && ciMerged.objectId === blob(root, MERGE281, ".github/workflows/ci.yml").objectId, "REVIEWED_CODE_CI_BLOB");
  need(ci282.objectId !== ci281.objectId && ciMerged.objectId !== ci282.objectId && ciMerged.objectId !== ci281.objectId, "REVIEWED_CODE_CI_SIDE_DROPPED");
  need(mergedFile(ciBase.bytes, ci282.bytes, ci281.bytes).equals(ciMerged.bytes), "REVIEWED_CODE_CI_MERGE");
  const storeBase = blob(root, BASE, "lib/server/userStore.ts"), store282 = blob(root, PR282, "lib/server/userStore.ts"), store280 = blob(root, PR280, "lib/server/userStore.ts"), storeMerged = blob(root, SOURCE, "lib/server/userStore.ts");
  need(storeMerged.objectId === USERSTORE_MERGED_BLOB && blob(root, MERGE281, "lib/server/userStore.ts").objectId === store282.objectId, "REVIEWED_CODE_USERSTORE_BLOB");
  need(store282.objectId !== store280.objectId && storeMerged.objectId !== store282.objectId && storeMerged.objectId !== store280.objectId, "REVIEWED_CODE_USERSTORE_SIDE_DROPPED");
  need(mergedFile(storeBase.bytes, store282.bytes, store280.bytes).equals(storeMerged.bytes), "REVIEWED_CODE_USERSTORE_MERGE");
  need(digest(inventory(root, BASE, PR282)) === PR282_INVENTORY, "REVIEWED_CODE_PR282_INVENTORY");
  need(digest(inventory(root, BASE, PR281)) === PR281_INVENTORY, "REVIEWED_CODE_PR281_INVENTORY");
  need(digest(inventory(root, BASE, PR280)) === PR280_INVENTORY, "REVIEWED_CODE_PR280_INVENTORY");
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
  assertPreservedContracts(root, SOURCE);
}

export function assertEventComposition(eventName, event, actual) {
  need(["pull_request", "push"].includes(eventName), "REVIEWED_CODE_EVENT");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(COMMIT.test(base ?? "") && COMMIT.test(head ?? "") && head === actual.head, "REVIEWED_CODE_EVENT_HEAD");
  need(actual.headDescendsEvidence && actual.baseAncestorHead && actual.headTree === actual.evidenceTree, "REVIEWED_CODE_COMPOSITION");
  if (eventName === "pull_request") {
    need(event.number === PULL_REQUEST && base === BASE && ![259, 264, 270, 271, 272, 274, 276, 280, 281, 282].includes(event.number), "REVIEWED_CODE_PR_BASE");
  } else {
    need(event.ref === "refs/heads/main" && actual.baseDescendsBaseline && (base === BASE || actual.baseTree === actual.evidenceTree), "REVIEWED_CODE_PUSH_BASE");
  }
  return { eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, baseCommit: base, headCommit: head };
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "REVIEWED_CODE_ROOT_ALIAS"); clean(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "REVIEWED_CODE_SHALLOW");
  const head = line(root, "rev-parse", "HEAD");
  const admission = tracked(root, head, ADMISSION), a = admission.value;
  keys(a, ["schemaVersion", "baseCommit", "sourceCommit", "sourceTree", "pr282Commit", "pr282ParentCommit", "pr281Commit", "pr280Commit", "merge282Commit", "merge281Commit", "pr282InventoryDigest", "pr281InventoryDigest", "pr280InventoryDigest", "sourceInventoryDigest", "toolingRelease", "toolingTree", "toolingDigest", "observationRawSha256", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr282-pr281-pr280.v1" && a.baseCommit === BASE && a.sourceCommit === SOURCE && a.sourceTree === tree(root, SOURCE) && a.sourceTree === SOURCE_TREE && a.pr282Commit === PR282 && a.pr282ParentCommit === PR282_PARENT && a.pr281Commit === PR281 && a.pr280Commit === PR280 && a.merge282Commit === MERGE282 && a.merge281Commit === MERGE281 && a.pr282InventoryDigest === PR282_INVENTORY && a.pr281InventoryDigest === PR281_INVENTORY && a.pr280InventoryDigest === PR280_INVENTORY && a.sourceInventoryDigest === SOURCE_INVENTORY && a.observationRawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION");
  need(Object.values(a.permissions).every(value => value === false), "REVIEWED_CODE_PERMISSION");
  assertMergedSources(root);
  ancestor(root, BASE, SOURCE); ancestor(root, SOURCE, head);
  need(COMMIT.test(a.toolingRelease ?? "") && HASH.test(a.toolingDigest ?? "") && HASH.test(a.checksRawSha256 ?? ""), "REVIEWED_CODE_RELEASE");
  same(parents(root, a.toolingRelease), [PREDECESSOR], "REVIEWED_CODE_RELEASE_PARENT");
  same(changed(root, PREDECESSOR, a.toolingRelease), CODE_PATHS, "REVIEWED_CODE_TOOLING_PATHS");
  need(tree(root, a.toolingRelease) === a.toolingTree && digest(inventory(root, PREDECESSOR, a.toolingRelease)) === a.toolingDigest, "REVIEWED_CODE_TOOLING_DIGEST");
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
  need(COMMIT.test(base ?? ""), "REVIEWED_CODE_EVENT_BASE");
  ancestor(root, base, head); ancestor(root, BASE, base);
  const eventBinding = assertEventComposition(eventName, event, { head, headDescendsEvidence: true, baseAncestorHead: true, baseDescendsBaseline: true, headTree: tree(root, head), evidenceTree: tree(root, evidenceCommit), baseTree: tree(root, base) });
  need(a.reviews && !Array.isArray(a.reviews), "REVIEWED_CODE_REVIEWS"); keys(a.reviews, ["A11", "A23"]);
  for (const role of ["A11", "A23"]) {
    const ref = a.reviews[role]; keys(ref, ["decisionRawSha256", "reportRawSha256"]);
    const decisionPath = `${DIRECTORY}/${role.toLowerCase()}-review.json`, reportPath = `${DIRECTORY}/${role.toLowerCase()}-review.md`;
    const review = tracked(root, head, decisionPath), report = blob(root, head, reportPath), r = review.value;
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling", "toolingDigest", "sourceInventoryDigest", "pr282InventoryDigest", "pr281InventoryDigest", "pr280InventoryDigest", "observationRawSha256", "checksRawSha256", "result", "report", "liveAllowed"]);
    keys(r.report, ["path", "rawSha256"]);
    need(review.rawSha256 === ref.decisionRawSha256 && report.rawSha256 === ref.reportRawSha256 && r.schemaVersion === "promotion-reviewed-code-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] && r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingRelease && r.toolingDigest === a.toolingDigest && r.sourceInventoryDigest === SOURCE_INVENTORY && r.pr282InventoryDigest === PR282_INVENTORY && r.pr281InventoryDigest === PR281_INVENTORY && r.pr280InventoryDigest === PR280_INVENTORY && r.observationRawSha256 === OBSERVATION_SHA && r.checksRawSha256 === a.checksRawSha256 && r.result === REVIEW_RESULT && r.result !== "approved-for-ordinary-code-required-check" && r.liveAllowed === false && r.report.path === reportPath && r.report.rawSha256 === report.rawSha256, "REVIEWED_CODE_REVIEW_BINDING");
    need(typeof r.reviewedAt === "string" && Number.isFinite(Date.parse(r.reviewedAt)) && new Date(r.reviewedAt).toISOString() === r.reviewedAt && Date.parse(r.reviewedAt) <= Date.now(), "REVIEWED_CODE_REVIEW_TIME");
  }
  const observation = tracked(root, head, `${DIRECTORY}/source-observation.json`);
  need(observation.rawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  const checks = tracked(root, head, `${DIRECTORY}/source-checks.json`);
  need(checks.rawSha256 === a.checksRawSha256, "REVIEWED_CODE_CHECKS_BINDING");
  assertPreservedContracts(root, head);
  return { root, head, admission: a, admissionCommit: evidenceCommit, event: eventBinding, expectedObservation: observation.value };
}

export async function observeCurrent(context) {
  assertMaterializedTree(context.root, context.head);
  const manifest = tracked(context.root, context.head, MANIFEST).value;
  const historical = tracked(context.root, context.head, manifest.historical.manifest.path);
  need(historical.rawSha256 === manifest.historical.manifest.rawSha256, "REVIEWED_CODE_HISTORICAL_MANIFEST");
  const { observePreparation } = await import(pathToFileURL(path.join(context.root, "coordination/integration/legacy-successor/contract.mjs")));
  const observation = await observePreparation(context.root, historical.value);
  same(observation, context.expectedObservation, "REVIEWED_CODE_CURRENT_REACHABILITY");
  const registry = tracked(context.root, context.head, manifest.legacyResolution.registryPath);
  need(registry.rawSha256 === manifest.legacyResolution.rawSha256, "REVIEWED_CODE_REGISTRY");
  same(observation.canonicalAudit, registry.value.expectedCanonicalAudit, "REVIEWED_CODE_CANONICAL_AUDIT");
  assertMaterializedTree(context.root, context.head);
  clean(context.root); need(line(context.root, "rev-parse", "HEAD") === context.head, "REVIEWED_CODE_HEAD_MOVED");
  return { reviewedObservationRawSha256: OBSERVATION_SHA, runtimePolicyDigest: digest(observation.expectedRuntimePolicy), canonicalAuditDigest: observation.canonicalAuditDigest };
}

function artifactDirectory(value) {
  const physical = realpathSync(value), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir()), stat = lstatSync(value);
  need(physical === value && physical.startsWith(`${temporary}/`) && stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, "REVIEWED_CODE_ARTIFACT_ROOT");
  return physical;
}
function save(root, file, value) { writeFileSync(path.join(root, file), `${stable(value)}\n`, { flag: "wx", mode: 0o600 }); }
export function commandEnvironment(name) {
  const inherited = Object.fromEntries(["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "CI", "PLAYWRIGHT_BROWSERS_PATH"].filter(key => typeof process.env[key] === "string").map(key => [key, process.env[key]]));
  const base = { ...inherited, AI_TUTOR_PROVIDER_PROFILE: "offline-fixture" };
  return name === "types" ? { ...base, NODE_OPTIONS: "--max-old-space-size=6144" } : base;
}
export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "REVIEWED_CODE_TEST_SET");
  for (let index = 0; index < COMMANDS.length; index++) {
    const [name, args] = COMMANDS[index], row = records[index]; keys(row, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    need(row.name === name && row.exitCode === 0, "REVIEWED_CODE_TEST_EXIT"); same(row.args, args, "REVIEWED_CODE_TEST_COMMAND");
    need(hash(regular(root, `${name}.stdout`)) === row.stdoutSha256 && hash(regular(root, `${name}.stderr`)) === row.stderrSha256, "REVIEWED_CODE_TEST_BYTES");
  }
}
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
  const observation = await observeCurrent(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.pr282-pr281-pr280.v1", event: context.event, sourceCommit: SOURCE, pr282Commit: PR282, pr281Commit: PR281, pr280Commit: PR280, admissionCommit: context.admissionCommit, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "sourceCommit", "pr282Commit", "pr281Commit", "pr280Commit", "admissionCommit", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.pr282-pr281-pr280.v1" && current.sourceCommit === SOURCE && current.pr282Commit === PR282 && current.pr281Commit === PR281 && current.pr280Commit === PR280 && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
  same(current.event, context.event, "REVIEWED_CODE_CURRENT_EVENT"); verifyTestRecords(artifacts, current.tests);
  assertArtifactSet(options.baselineArtifacts);
  same(current.observation, await observeCurrent(context), "REVIEWED_CODE_CURRENT_OBSERVATION");
  const baselineRoot = realpathSync(options.baselineRoot);
  need(baselineRoot === options.baselineRoot && baselineRoot !== context.root && line(baselineRoot, "rev-parse", "HEAD") === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_ROOT"); clean(baselineRoot); assertMaterializedTree(baselineRoot, HISTORICAL_BASE);
  const baselineEvent = parse(readFileSync(options.baselineEvent));
  same(baselineEvent, { number: 259, pull_request: { base: { sha: HISTORICAL_BASE }, head: { sha: HISTORICAL_BASE } } }, "REVIEWED_CODE_BASELINE_EVENT");
  const legacy = path.join(baselineRoot, "scripts/promotion-required-check-legacy-successor-v1.mjs");
  need(hash(readFileSync(legacy)) === blob(context.root, HISTORICAL_BASE, "scripts/promotion-required-check-legacy-successor-v1.mjs").rawSha256, "REVIEWED_CODE_BASELINE_CHECKER");
  const { verify } = await import(pathToFileURL(legacy));
  const previous = await verify({ repoRoot: baselineRoot, eventName: "pull_request", eventPath: options.baselineEvent, artifactRoot: options.baselineArtifacts });
  assertMaterializedTree(baselineRoot, HISTORICAL_BASE); clean(baselineRoot);
  need(previous.result === "pass" && previous.event.baseCommit === HISTORICAL_BASE && previous.event.headCommit === HISTORICAL_BASE, "REVIEWED_CODE_BASELINE_PROOF");
  const value = { schemaVersion: "promotion-reviewed-code-decision.pr282-pr281-pr280.v1", result: DECISION_RESULT, scope: DECISION_SCOPE, event: context.event, sourceCommit: SOURCE, pr282Commit: PR282, pr281Commit: PR281, pr280Commit: PR280, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, sourceInventoryDigest: SOURCE_INVENTORY, pr282InventoryDigest: PR282_INVENTORY, pr281InventoryDigest: PR281_INVENTORY, pr280InventoryDigest: PR280_INVENTORY, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: previous.decisionDigest, artifactRawSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { "repo": "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "baseline-root": "baselineRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr282-pr281-pr280\n"); return; }
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
