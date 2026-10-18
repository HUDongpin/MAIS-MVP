#!/usr/bin/env node
// Exact append-only integration of reviewed PR276 homepage and protected main PR277.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes as parse } from "./promotion-workflow-json-guard.mjs";
import { stable, MANIFEST, assertArtifactSet } from "./promotion-required-check-legacy-successor-v1.mjs";
import { validateContent, assertObservation as assertCandidateObservation, COMMANDS as CANDIDATE_COMMANDS } from "./promotion-pr201-candidate.mjs";

export const BASE = "39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d";
export const SOURCE_PARENT = "39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d";
export const SOURCE_PARENT_TREE = "580f3fa6e4aa6970406bb41e949e3d002ac8a1f0";
export const SHARED_BASE = "656ac319b2ad5812d31ad952cbb18430b5e58065";
export const HOMEPAGE_EVIDENCE = "b8cecebf0fe9d6e296d24af6007f850f92fba4bd";
export const HOMEPAGE_TREE = "14bd331c869cead154e1900e7d00e58fd3ea57d6";
export const ORIGINAL_SOURCE = "a05d123e75139eeb36e0ca3b564652880fa38545";
const ORIGINAL_IMAGE = "components/home/brand-assets/pedanova-home-background-20260809-owner-selected-white-stylus.png";
export const SOURCE_TREE = "d40dfd26310497a7cd118887a11dded04f99fc6e";
// Owner-authorized freeze binds the real source commit, published successor PR,
// and freshly observed source. Acceptance still requires exact reviewed T/E.
// No CLI option or environment variable can supply production bindings.
export const SOURCE = "b8bba0fc661affd4ee0a71acd341280a2ab38cc4";
export const PULL_REQUEST = 276;
export const OBSERVATION_SHA = "90408097b338eebafb1378c71ded0a402cd973e43b131eab408dde3c90c48e2f";
export const PREDECESSOR = SOURCE;
export const HISTORICAL_BASE = "03717842b19e8b8fa9a3a2dbecf1b359bb842233";
export const SOURCE_INVENTORY = "0a2677b019c733ed24e2b134a34c840b11f147c230763e3fc48ab98c68a02290";
export const DIRECTORY = "coordination/integration/reviewed-code/pr276-v3";
export const ADMISSION = `${DIRECTORY}/admission.json`;
export const SOURCE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "components/home/PedaNovaHomeHero.tsx",
  "components/home/brand-assets/pedanova-home-background-20260809-owner-selected-white-stylus.png",
  "coordination/integration/reviewed-code/pr276-v1/a11-review.json",
  "coordination/integration/reviewed-code/pr276-v1/a11-review.md",
  "coordination/integration/reviewed-code/pr276-v1/a23-review.json",
  "coordination/integration/reviewed-code/pr276-v1/a23-review.md",
  "coordination/integration/reviewed-code/pr276-v1/admission.json",
  "coordination/integration/reviewed-code/pr276-v1/source-checks.json",
  "coordination/integration/reviewed-code/pr276-v1/source-observation.json",
  "coordination/integration/reviewed-code/pr276-v2/a11-review.json",
  "coordination/integration/reviewed-code/pr276-v2/a11-review.md",
  "coordination/integration/reviewed-code/pr276-v2/a23-review.json",
  "coordination/integration/reviewed-code/pr276-v2/a23-review.md",
  "coordination/integration/reviewed-code/pr276-v2/admission.json",
  "coordination/integration/reviewed-code/pr276-v2/source-checks.json",
  "coordination/integration/reviewed-code/pr276-v2/source-observation.json",
  "docs/pr276-reviewed-code-gate.md",
  "docs/pr276-v2-reviewed-code-gate.md",
  "scripts/promotion-reviewed-code-pr276-v2.mjs",
  "scripts/promotion-reviewed-code-pr276-v2.test.mjs",
  "scripts/promotion-reviewed-code-pr276.mjs",
  "scripts/promotion-reviewed-code-pr276.test.mjs",
  "tests/e2e/home-selected-hero.spec.ts"
].sort());
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "scripts/promotion-reviewed-code-pr276-v3.mjs",
  "scripts/promotion-reviewed-code-pr276-v3.test.mjs",
  "docs/pr276-v3-reviewed-code-gate.md"
].sort());
export const EVIDENCE_PATHS = Object.freeze([
  ADMISSION, `${DIRECTORY}/source-observation.json`, `${DIRECTORY}/source-checks.json`,
  ...["a11", "a23"].flatMap(role => [`${DIRECTORY}/${role}-review.json`, `${DIRECTORY}/${role}-review.md`])
].sort());
export const PRESERVED_PATHS = Object.freeze([
  "scripts/promotion-reviewed-code-pr259.mjs", "scripts/promotion-reviewed-code-pr259.test.mjs",
  "scripts/promotion-reviewed-code-pr270-pr271.mjs", "scripts/promotion-reviewed-code-pr270-pr271.test.mjs",
  "scripts/promotion-reviewed-code-pr264.mjs", "scripts/promotion-reviewed-code-pr264.test.mjs",
  "scripts/promotion-reviewed-code-pr276.mjs", "scripts/promotion-reviewed-code-pr276.test.mjs",
  "scripts/promotion-reviewed-code-pr276-v2.mjs", "scripts/promotion-reviewed-code-pr276-v2.test.mjs",
  "docs/pr276-v2-reviewed-code-gate.md", "coordination/integration/reviewed-code/pr276-v2",
  "scripts/promotion-pr201-candidate.mjs", "scripts/promotion-pr201-candidate.test.mjs",
  "scripts/pr201-candidate-regression.test.mjs", "docs/pr201-candidate-integration.md",
  "coordination/integration/pr201-diversity-228-v1",
  "data/generated-content/us-ar-g6-g12-pr201-diversity-228-v2",
  "coordination/session-logs/2026-10-18-A23-pr201-integration-228.md",
  "docs/pr276-reviewed-code-gate.md", "coordination/integration/reviewed-code/pr276-v1",
  "tests/e2e/home-selected-hero.spec.ts", ORIGINAL_IMAGE,
  "coordination/integration/reviewed-code/pr264-v1",
  "coordination/integration/reviewed-code/pr259-v3",
  "coordination/integration/reviewed-code/pr270-pr271-v1",
  "coordination/integration/legacy-successor",
  "scripts/promotion-required-check-legacy-successor-v1.mjs",
  "scripts/promotion-workflow-json-guard.mjs"
].sort());
const IDENTITIES = Object.freeze({ A11: "/root/a11_pr276_review", A23: "/root/a23_pr276_review" });
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const HASH = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
export const PERMISSIONS = Object.freeze({ ordinaryCodeEligible: true, mergeAllowed: false, liveAllowed: false, integrationAllowed: false, previewAllowed: false, deployAllowed: false, wholePackAccepted: false, historicalAuthorityTransferred: false });
export const BROWSER_TITLES = Object.freeze([
  ...["en", "zh-Hans", "zh"].flatMap(locale => ["320x568", "390x844", "639x900", "640x900", "768x1024", "1023x768", "1024x768", "1440x900", "2560x1440"].map(size => `homepage ${locale} ${size} keeps the selected image and copy readable`)),
  ...["390x844", "1440x900"].map(size => `homepage dark ${size} preserves readable copy`),
  "homepage CTA has visible keyboard focus and opens login",
  "homepage phone CTA opens login by touch"
]);
export const COMMANDS = Object.freeze([
  ["pr277-contract", ["--test", "scripts/promotion-pr201-candidate.test.mjs"]],
  ...CANDIDATE_COMMANDS.filter(([name]) => ["grading", "isolation"].includes(name)).map(([name, args]) => [`pr277-${name}`, args]),
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]],
  ["browser", ["node_modules/@playwright/test/cli.js", "test", "tests/e2e/home-selected-hero.spec.ts", "--project=desktop-chrome", "--workers=1", "--retries=0", "--reporter=json"]]
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
  // git status alone cannot detect files hidden by skip-worktree/assume-unchanged.
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

export function assertFrozen() {
  need(COMMIT.test(SOURCE ?? "") && COMMIT.test(SOURCE_PARENT) && COMMIT.test(SOURCE_PARENT_TREE) && COMMIT.test(ORIGINAL_SOURCE) && HASH.test(OBSERVATION_SHA ?? "") && Number.isSafeInteger(PULL_REQUEST) && PULL_REQUEST > 0 && ![259, 264, 270, 271, 272, 274].includes(PULL_REQUEST), "PR276_V3_ADMISSION_NOT_FROZEN");
}
export function assertPreservedContracts(root, ref) {
  for (const file of PRESERVED_PATHS) {
    const before = git(root, "ls-tree", "-z", SOURCE, "--", file);
    need(before.length > 0 && before.equals(git(root, "ls-tree", "-z", ref, "--", file)), "REVIEWED_CODE_PRIOR_CONTRACT");
  }
}
export function assertCombinedSource(root, ref = SOURCE) {
  const entries = commit => new Map(git(root, "ls-tree", "-r", "-z", commit).toString("utf8").split("\0").filter(Boolean).map(row => {
    const separator = row.indexOf("\t"); return [row.slice(separator + 1), row.slice(0, separator)];
  }));
  const base = entries(SHARED_BASE), homepage = entries(HOMEPAGE_EVIDENCE), main = entries(BASE), actual = entries(ref);
  const names = new Set([...base.keys(), ...homepage.keys(), ...main.keys(), ...actual.keys()]);
  const overlap = [];
  for (const file of names) {
    const homeChanged = base.get(file) !== homepage.get(file), mainChanged = base.get(file) !== main.get(file);
    if (homeChanged && mainChanged) overlap.push(file);
    if (file === ".github/workflows/promotion-shadow.yml") continue;
    const expected = mainChanged ? main.get(file) : homeChanged ? homepage.get(file) : base.get(file);
    need(actual.get(file) === expected, "REVIEWED_CODE_COMBINED_SOURCE_BYTES");
  }
  same(overlap.sort(), [".github/workflows/promotion-shadow.yml"], "REVIEWED_CODE_SOURCE_OVERLAP");
}
function assertSource(root) {
  need(tree(root, BASE) === SOURCE_PARENT_TREE && tree(root, HOMEPAGE_EVIDENCE) === HOMEPAGE_TREE, "REVIEWED_CODE_PARENT_TREE");
  same(parents(root, ORIGINAL_SOURCE), [SHARED_BASE], "REVIEWED_CODE_ORIGINAL_SOURCE_PARENT");
  ancestor(root, ORIGINAL_SOURCE, HOMEPAGE_EVIDENCE); ancestor(root, SHARED_BASE, BASE);
  same(parents(root, SOURCE), [HOMEPAGE_EVIDENCE, BASE], "REVIEWED_CODE_SOURCE_PARENTS");
  const originalImage = blob(root, ORIGINAL_SOURCE, ORIGINAL_IMAGE);
  need(originalImage.mode === "100644" && originalImage.rawSha256 === "d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889", "REVIEWED_CODE_ORIGINAL_IMAGE");
  same(identity(blob(root, SOURCE, ORIGINAL_IMAGE)), identity(originalImage), "REVIEWED_CODE_IMAGE_PRESERVED");
  need(tree(root, SOURCE) === SOURCE_TREE, "REVIEWED_CODE_SOURCE_TREE");
  assertCombinedSource(root);
  same(changed(root, BASE, SOURCE), SOURCE_PATHS, "REVIEWED_CODE_SOURCE_PATHS");
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
  assertPreservedContracts(root, SOURCE);
}

export function assertFrozenMainRoot(root, currentRoot) {
  need(typeof root === "string", "REVIEWED_CODE_FROZEN_MAIN_ROOT");
  const physical = realpathSync(root), temporary = realpathSync(process.env.RUNNER_TEMP ?? tmpdir());
  need(physical === root && root !== currentRoot && root.startsWith(`${temporary}/`) && !lstatSync(root).isSymbolicLink(), "REVIEWED_CODE_FROZEN_MAIN_ROOT");
  need(line(root, "rev-parse", "HEAD") === BASE && tree(root, "HEAD") === SOURCE_PARENT_TREE, "REVIEWED_CODE_FROZEN_MAIN_HEAD");
  clean(root); assertMaterializedTree(root, BASE);
  return { commit: BASE, tree: SOURCE_PARENT_TREE };
}

export function assertEventComposition(eventName, event, actual) {
  assertFrozen();
  need(["pull_request", "push"].includes(eventName), "REVIEWED_CODE_EVENT");
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(COMMIT.test(base ?? "") && COMMIT.test(head ?? "") && head === actual.head, "REVIEWED_CODE_EVENT_HEAD");
  need(actual.headDescendsEvidence && actual.baseAncestorHead && actual.headTree === actual.evidenceTree, "REVIEWED_CODE_COMPOSITION");
  if (eventName === "pull_request") {
    need(event.number === PULL_REQUEST && base === BASE, "REVIEWED_CODE_PR_BASE");
  } else {
    need(event.ref === "refs/heads/main" && actual.baseDescendsBaseline && (base === BASE || actual.baseTree === actual.evidenceTree), "REVIEWED_CODE_PUSH_BASE");
  }
  return { eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, baseCommit: base, headCommit: head };
}

export function preflight({ repoRoot, eventName, eventPath }) {
  assertFrozen();
  const root = realpathSync(repoRoot); need(root === repoRoot, "REVIEWED_CODE_ROOT_ALIAS"); clean(root);
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "REVIEWED_CODE_SHALLOW");
  const head = line(root, "rev-parse", "HEAD");
  const admission = tracked(root, head, ADMISSION), a = admission.value;
  keys(a, ["schemaVersion", "baseCommit", "homepageEvidence", "sourceCommit", "sourceTree", "sourceInventoryDigest", "toolingRelease", "toolingTree", "toolingDigest", "observationRawSha256", "checksRawSha256", "reviews", "permissions"]);
  need(a.schemaVersion === "promotion-reviewed-code-pr276.v3" && a.baseCommit === BASE && a.homepageEvidence === HOMEPAGE_EVIDENCE && a.sourceCommit === SOURCE && a.sourceTree === tree(root, SOURCE) && a.sourceInventoryDigest === SOURCE_INVENTORY && a.observationRawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_SCOPE");
  same(a.permissions, PERMISSIONS, "REVIEWED_CODE_PERMISSION");
  assertSource(root);
  ancestor(root, BASE, SOURCE); ancestor(root, HOMEPAGE_EVIDENCE, SOURCE); ancestor(root, SOURCE, head);
  need(digest(inventory(root, BASE, SOURCE)) === SOURCE_INVENTORY, "REVIEWED_CODE_SOURCE_INVENTORY");
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
    keys(r, ["schemaVersion", "role", "reviewerIdentity", "reviewedAt", "reviewedSource", "reviewedTooling", "toolingDigest", "sourceInventoryDigest", "observationRawSha256", "checksRawSha256", "result", "report", "liveAllowed"]);
    keys(r.report, ["path", "rawSha256"]);
    need(review.rawSha256 === ref.decisionRawSha256 && report.rawSha256 === ref.reportRawSha256 && r.schemaVersion === "promotion-reviewed-code-review.v1" && r.role === role && r.reviewerIdentity === IDENTITIES[role] && r.reviewedSource === SOURCE && r.reviewedTooling === a.toolingRelease && r.toolingDigest === a.toolingDigest && r.sourceInventoryDigest === SOURCE_INVENTORY && r.observationRawSha256 === OBSERVATION_SHA && r.checksRawSha256 === a.checksRawSha256 && r.result === "approved-for-ordinary-code-required-check" && r.liveAllowed === false && r.report.path === reportPath && r.report.rawSha256 === report.rawSha256, "REVIEWED_CODE_REVIEW_BINDING");
    need(typeof r.reviewedAt === "string" && Number.isFinite(Date.parse(r.reviewedAt)) && new Date(r.reviewedAt).toISOString() === r.reviewedAt && Date.parse(r.reviewedAt) <= Date.now(), "REVIEWED_CODE_REVIEW_TIME");
  }
  const observation = tracked(root, head, `${DIRECTORY}/source-observation.json`);
  need(observation.rawSha256 === OBSERVATION_SHA, "REVIEWED_CODE_OBSERVATION_BINDING");
  const checks = tracked(root, head, `${DIRECTORY}/source-checks.json`);
  need(checks.rawSha256 === a.checksRawSha256, "REVIEWED_CODE_CHECKS_BINDING");
  assertPreservedContracts(root, head);
  // The full root-tree equality above covers every candidate, projection, old
  // review, dependency, historical record and file mode; none is exempted.
  return { root, head, admission: a, admissionCommit: evidenceCommit, event: eventBinding, expectedObservation: observation.value };
}

export async function observeCurrent(context) {
  assertMaterializedTree(context.root, context.head);
  const manifest = tracked(context.root, context.head, MANIFEST).value;
  const historical = tracked(context.root, context.head, manifest.historical.manifest.path);
  need(historical.rawSha256 === manifest.historical.manifest.rawSha256, "REVIEWED_CODE_HISTORICAL_MANIFEST");
  const { observePreparation } = await import(pathToFileURL(path.join(context.root, "coordination/integration/legacy-successor/contract.mjs")));
  const observation = await observePreparation(context.root, historical.value);
  const priorHomepage = tracked(context.root, context.head, "coordination/integration/reviewed-code/pr276-v2/source-observation.json");
  assertCandidateObservation(observation, context.expectedObservation, priorHomepage.value);
  const content = validateContent(context.root);
  need(content.revisedRows === 228 && content.unchangedRows === 1272, "REVIEWED_CODE_CANDIDATE_SCOPE");
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
export function verifyBrowserReport(bytes) {
  const report = parse(bytes), specifications = [];
  function walk(suite) {
    need(suite && Array.isArray(suite.specs) && Array.isArray(suite.suites ?? []), "REVIEWED_CODE_BROWSER_SCHEMA");
    specifications.push(...suite.specs);
    for (const child of suite.suites ?? []) walk(child);
  }
  need(Array.isArray(report.suites) && Array.isArray(report.errors) && report.errors.length === 0, "REVIEWED_CODE_BROWSER_SCHEMA");
  for (const suite of report.suites) walk(suite);
  need(specifications.length === BROWSER_TITLES.length, "REVIEWED_CODE_BROWSER_COVERAGE");
  same(specifications.map(spec => spec.title).sort(), [...BROWSER_TITLES].sort(), "REVIEWED_CODE_BROWSER_TITLES");
  for (const spec of specifications) {
    need(spec.file?.replaceAll("\\", "/").endsWith("home-selected-hero.spec.ts") && spec.ok === true && Array.isArray(spec.tests) && spec.tests.length === 1, "REVIEWED_CODE_BROWSER_SPEC");
    const test = spec.tests[0];
    need(test.projectName === "desktop-chrome" && test.expectedStatus === "passed" && test.status === "expected" && Array.isArray(test.results) && test.results.length === 1, "REVIEWED_CODE_BROWSER_TEST");
    const result = test.results[0];
    need(result.status === "passed" && result.retry === 0 && Array.isArray(result.errors) && result.errors.length === 0, "REVIEWED_CODE_BROWSER_RESULT");
  }
  need(report.stats?.expected === BROWSER_TITLES.length && report.stats.unexpected === 0 && report.stats.flaky === 0 && report.stats.skipped === 0, "REVIEWED_CODE_BROWSER_STATS");
}
export function verifyTestRecords(root, records) {
  need(Array.isArray(records) && records.length === COMMANDS.length, "REVIEWED_CODE_TEST_SET");
  for (let index = 0; index < COMMANDS.length; index++) {
    const [name, args] = COMMANDS[index], row = records[index]; keys(row, ["name", "args", "exitCode", "stdoutSha256", "stderrSha256"]);
    need(row.name === name && row.exitCode === 0, "REVIEWED_CODE_TEST_EXIT"); same(row.args, args, "REVIEWED_CODE_TEST_COMMAND");
    need(hash(regular(root, `${name}.stdout`)) === row.stdoutSha256 && hash(regular(root, `${name}.stderr`)) === row.stderrSha256, "REVIEWED_CODE_TEST_BYTES");
    if (name === "browser") verifyBrowserReport(regular(root, "browser.stdout"));
  }
}
export function commandEnvironment(name, head, artifacts) {
  const inherited = Object.fromEntries(["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "CI", "PLAYWRIGHT_BROWSERS_PATH"].filter(key => typeof process.env[key] === "string").map(key => [key, process.env[key]]));
  const base = { ...inherited, AI_TUTOR_PROVIDER_PROFILE: "offline-fixture", PLAYWRIGHT_BROWSER_CHANNEL: "", PLAYWRIGHT_RUN_ID: `pr276-v3-admission-${head}`, PLAYWRIGHT_PORT: "3396" };
  // Candidate regressions use an isolated synthetic SQLite file. Playwright must
  // select its own run-owned .tmp database and production build environment.
  return name.startsWith("pr277-") ? { ...base, NODE_ENV: "test", HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_DB_PATH: path.join(artifacts, "regression.sqlite") } : base;
}
export async function check(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot), records = [];
  assertMaterializedTree(context.root, context.head);
  const frozenMain = assertFrozenMainRoot(options.frozenMainRoot, context.root);
  validateContent(context.root);
  for (const [name, args] of COMMANDS) {
    const result = spawnSync(process.execPath, args, { cwd: name === "pr277-contract" ? options.frozenMainRoot : context.root, env: commandEnvironment(name, context.head, artifacts), timeout: name === "browser" ? 900000 : name.startsWith("pr277-") ? 600000 : 300000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = Buffer.from(result.stdout ?? []), stderr = Buffer.from(result.stderr ?? []);
    writeFileSync(path.join(artifacts, `${name}.stdout`), stdout, { flag: "wx", mode: 0o600 });
    writeFileSync(path.join(artifacts, `${name}.stderr`), stderr, { flag: "wx", mode: 0o600 });
    need(result.status === 0 && !result.signal && !result.error, "REVIEWED_CODE_TEST_FAILED");
    records.push({ name, args, exitCode: result.status, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  }
  verifyTestRecords(artifacts, records);
  same(assertFrozenMainRoot(options.frozenMainRoot, context.root), frozenMain, "REVIEWED_CODE_FROZEN_MAIN_DRIFT");
  const observation = await observeCurrent(context);
  const proof = { schemaVersion: "promotion-reviewed-code-current.v3", event: context.event, sourceCommit: SOURCE, admissionCommit: context.admissionCommit, frozenMain, tests: records, observation };
  save(artifacts, "current.json", proof); return proof;
}
async function decision(options) {
  const context = preflight(options), artifacts = artifactDirectory(options.artifactRoot);
  const current = parse(regular(artifacts, "current.json"));
  keys(current, ["schemaVersion", "event", "sourceCommit", "admissionCommit", "frozenMain", "tests", "observation"]);
  need(current.schemaVersion === "promotion-reviewed-code-current.v3" && current.sourceCommit === SOURCE && current.admissionCommit === context.admissionCommit, "REVIEWED_CODE_CURRENT_PROOF");
  same(current.event, context.event, "REVIEWED_CODE_CURRENT_EVENT"); verifyTestRecords(artifacts, current.tests);
  same(current.frozenMain, assertFrozenMainRoot(options.frozenMainRoot, context.root), "REVIEWED_CODE_FROZEN_MAIN_PROOF");
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
  const value = { schemaVersion: "promotion-reviewed-code-decision.v3", result: "pass", scope: "exact-pr276-pr277-composition-only", event: context.event, homepageEvidence: HOMEPAGE_EVIDENCE, sourceCommit: SOURCE, toolingRelease: context.admission.toolingRelease, admissionCommit: context.admissionCommit, sourceInventoryDigest: SOURCE_INVENTORY, currentProofRawSha256: hash(regular(artifacts, "current.json")), historicalBaselineOnly: { commit: HISTORICAL_BASE, decisionDigest: previous.decisionDigest, artifactRawSha256: hash(regular(options.baselineArtifacts, "decision.v1.json")) }, permissions: PERMISSIONS };
  return { ...value, decisionDigest: digest(value) };
}
export function verifyDecision(actual, expected) { same(actual, expected, "REVIEWED_CODE_DECISION_MISMATCH"); }
async function main() {
  const [operation, ...args] = process.argv.slice(2); need(["select", "preflight", "check", "finalize", "verify"].includes(operation), "REVIEWED_CODE_USAGE");
  const names = { "repo": "repoRoot", "event-name": "eventName", "event-path": "eventPath", "artifact-root": "artifactRoot", "baseline-root": "baselineRoot", "frozen-main-root": "frozenMainRoot", "baseline-event": "baselineEvent", "baseline-artifacts": "baselineArtifacts" }, options = {};
  need(args.length % 2 === 0, "REVIEWED_CODE_USAGE");
  for (let index = 0; index < args.length; index += 2) { const key = names[args[index].slice(2)]; need(args[index].startsWith("--") && key && !Object.hasOwn(options, key) && args[index + 1], "REVIEWED_CODE_USAGE"); options[key] = args[index + 1]; }
  for (const key of ["repoRoot", "eventName", "eventPath"]) need(options[key], "REVIEWED_CODE_USAGE");
  if (operation === "select") { preflight(options); process.stdout.write("reviewed-code-pr276-v3\n"); return; }
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
