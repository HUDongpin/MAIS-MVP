#!/usr/bin/env node

// One reviewed, non-live activation of the immutable Arkansas correctness
// successor. The old v2.6 required-check path remains a separate workflow leg.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync, lstatSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

export const ACTIVATION_PATH = "coordination/integration/legacy-successor/activation/activation.v1.json";
export const EXECUTION = "ff709c0141ef8660604a20340b1c476bf2941f60";
export const STORAGE = "5b1445e32f72156e1effa27ae31c3e08ec4d0fab";
export const FROZEN_RELEASE = "611eacd502547cb75355de66e216a3785634f159";
export const MANIFEST = "coordination/integration/legacy-successor/attempt-009/promotion-manifest.v1.json";
export const RECEIPT = "coordination/integration/legacy-successor/attempt-009/promotion-shadow-receipt.v1.json";
export const PACK = "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
export const MANIFEST_SHA = "a2dd9179fb3e49afd7f920b76e3a68c1c552e758c407b3124ccc5395065ac5f0";
export const RECEIPT_SHA = "dc6495b8ff09a4d1369a9780fe112572dd368dabda08ae3f5e036044d94ff32c";
export const PACK_SHA = "4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766";
export const SEMANTIC_DIGEST = "b8f3e7c8801cb06021c94cc50dc9cf6ab977a4d91b6b0968f554ceda4dd6049f";
export const BUNDLE_DIGEST = "37da13cdb32066c73156b5809b5733796615f3f47870db4478c0e94c18510582";
export const CODE_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "scripts/promotion-required-check-legacy-successor-v1.mjs",
  "scripts/promotion-required-check-legacy-successor-v1.test.mjs",
  "scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs",
  "scripts/promotion-shadow-workflow-v2.test.mjs"
].sort());
export const REVIEW_PATHS = Object.freeze({
  A11: Object.freeze({ decision: "coordination/integration/legacy-successor/activation/a11-review.v1.json", report: "coordination/integration/legacy-successor/activation/a11-review.md" }),
  A23: Object.freeze({ decision: "coordination/integration/legacy-successor/activation/a23-review.v1.json", report: "coordination/integration/legacy-successor/activation/a23-review.md" })
});
const REVIEW_FILES = Object.freeze(Object.values(REVIEW_PATHS).flatMap(x => [x.decision, x.report]).sort());
const REVIEW_IDENTITIES = Object.freeze({
  A11: "/root/a11_pr172_copy_verify",
  A23: "/root/a23_successor_design_review"
});
const HEX40 = /^[a-f0-9]{40}$/u;
const HEX64 = /^[a-f0-9]{64}$/u;
const GIT_ENV = Object.freeze({ PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_PAGER: "cat", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" });
const ARTIFACT_FILES = Object.freeze(["decision.v1.json", "fresh.json", "fresh.stderr", "native-runs.v1.json", "verification.json", "verification.stderr"]);
const sha = value => createHash("sha256").update(value).digest("hex");
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(ok, code) { if (!ok) fail(code); }
function keys(value, expected, code) {
  need(value !== null && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), code);
}
export function stable(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) need(Object.hasOwn(value, i), "ACTIVATION_SPARSE_JSON");
    return `[${value.map(stable).join(",")}]`;
  }
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  need(value !== undefined && (typeof value !== "number" || Number.isFinite(value)), "ACTIVATION_UNSAFE_JSON");
  return JSON.stringify(value);
}
const digest = value => sha(Buffer.from(stable(value)));
const parse = bytes => parsePromotionWorkflowJsonBytes(bytes);
function same(left, right, code) { need(stable(left) === stable(right), code); }
function utf8Nul(buffer, code) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  need(text === "" || text.endsWith("\0"), code);
  return text === "" ? [] : text.slice(0, -1).split("\0");
}
function rootGitDir(root) {
  const entry = path.join(root, ".git");
  const st = lstatSync(entry); need(!st.isSymbolicLink(), "ACTIVATION_GIT_ALIAS");
  if (st.isDirectory()) return realpathSync(entry);
  need(st.isFile(), "ACTIVATION_GIT_INVALID");
  const match = readFileSync(entry, "utf8").match(/^gitdir: ([^\r\n\0]+)\n?$/u);
  need(match, "ACTIVATION_GIT_INVALID");
  return realpathSync(path.resolve(root, match[1]));
}
function git(root, ...args) {
  return execFileSync("/usr/bin/git", ["--no-replace-objects", "--literal-pathspecs", "--no-optional-locks", `--git-dir=${rootGitDir(root)}`, `--work-tree=${root}`, "-c", `core.worktree=${root}`, "-c", "core.fsmonitor=false", ...args], { env: GIT_ENV, maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
}
function line(root, ...args) { const value = git(root, ...args).toString("utf8"); need(/^[^\r\n]+\n$/u.test(value), "ACTIVATION_GIT_LINE_INVALID"); return value.trimEnd(); }
function ancestor(root, older, newer) {
  try { git(root, "merge-base", "--is-ancestor", older, newer); } catch { fail("ACTIVATION_ANCESTRY_INVALID"); }
}
function parents(root, ref) { return line(root, "show", "-s", "--format=%P", ref).split(" "); }
function changed(root, a, b) { return utf8Nul(git(root, "diff", "--name-only", "--no-renames", "-z", a, b, "--"), "ACTIVATION_DIFF_INVALID").sort(); }
function treeBlob(root, commit, file) {
  const rows = utf8Nul(git(root, "ls-tree", "-z", commit, "--", file), "ACTIVATION_TREE_INVALID");
  need(rows.length === 1, "ACTIVATION_TREE_MISSING");
  const match = rows[0].match(/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)$/u);
  need(match && match[3] === file, "ACTIVATION_TREE_INVALID");
  const bytes = git(root, "show", `${commit}:${file}`);
  return { path: file, mode: match[1], objectId: match[2], rawSha256: sha(bytes), bytes };
}
function trackedJson(root, commit, file) {
  const row = treeBlob(root, commit, file);
  need(readFileSync(path.join(root, file)).equals(row.bytes), "ACTIVATION_WORKTREE_BYTE_DRIFT");
  return { ...row, value: parse(row.bytes) };
}
function exactPaths(actual, expected, code) { same(actual, [...expected].sort(), code); }
export function singleFirstAddition(root, releaseCommit, file = ACTIVATION_PATH) {
  const raw = git(root, "log", "--format=%H", "--diff-filter=A", "--", file).toString("utf8").trim();
  const commits = raw ? raw.split("\n") : [];
  need(commits.length === 1 && HEX40.test(commits[0]) && parents(root, commits[0]).length === 1 && parents(root, commits[0])[0] === releaseCommit, "ACTIVATION_MARKER_HISTORY");
  return commits[0];
}

export function markerMode(delta, baseEntry, headEntry) {
  need(Buffer.isBuffer(delta) && Buffer.isBuffer(baseEntry) && Buffer.isBuffer(headEntry), "ACTIVATION_SELECTOR_INVALID");
  if (baseEntry.length === 0 && headEntry.length === 0 && delta.length === 0) return "v2";
  if (baseEntry.length === 0 && headEntry.length > 0 && delta.equals(Buffer.from(`A\0${ACTIVATION_PATH}\0`))) return "successor";
  if (baseEntry.length > 0 && headEntry.length > 0 && baseEntry.equals(headEntry) && delta.length === 0) return "successor";
  fail("ACTIVATION_SELECTOR_MUTATED");
}
export function assertFuturePaths(paths, protectedPaths) {
  need(Array.isArray(paths) && protectedPaths instanceof Set, "ACTIVATION_FUTURE_PATHS_INVALID");
  for (const file of paths) {
    need(typeof file === "string" && file.length > 0 && !file.startsWith("/") && !file.includes("..") && !file.includes("\\"), "ACTIVATION_FUTURE_PATHS_INVALID");
    need(!protectedPaths.has(file) && !file.startsWith("coordination/integration/") && !file.startsWith("scripts/promotion-"), "ACTIVATION_FUTURE_PROMOTION_DRIFT");
    // The runtime policy projection is structural; equal edges do not prove
    // equal lesson text or answer bytes. Later runtime/code changes require a
    // fresh reviewed successor. Only non-runtime documentation and standalone
    // tests can reuse this exact activation authority.
    need(file === "README.md" || (file.startsWith("docs/") && /\.(?:md|txt)$/u.test(file)) || file.startsWith("tests/") || (file.startsWith("coordination/release-intake/") && file.endsWith(".md")), "ACTIVATION_FUTURE_RUNTIME_OR_CODE_DRIFT");
  }
  return paths;
}
export function assertFutureTreeModes(root, earlier, later, paths) {
  for (const file of paths) for (const ref of [earlier, later]) {
    const rows = utf8Nul(git(root, "ls-tree", "-z", ref, "--", file), "ACTIVATION_FUTURE_TREE_INVALID");
    need(rows.length <= 1, "ACTIVATION_FUTURE_TREE_INVALID");
    if (rows.length === 0) continue;
    need(/^(100644|100755) blob [a-f0-9]{40}\t[^\0]+$/u.test(rows[0]) && rows[0].endsWith(`\t${file}`), "ACTIVATION_FUTURE_MODE_INVALID");
  }
}
function github(root, eventName, eventPath) {
  need(["pull_request", "push"].includes(eventName), "ACTIVATION_EVENT_INVALID");
  const event = parse(readFileSync(eventPath));
  const base = eventName === "pull_request" ? event.pull_request?.base?.sha : event.before;
  const head = eventName === "pull_request" ? event.pull_request?.head?.sha : event.after;
  need(HEX40.test(base ?? "") && HEX40.test(head ?? "") && (eventName !== "push" || event.ref === "refs/heads/main"), "ACTIVATION_EVENT_INVALID");
  need(line(root, "rev-parse", "HEAD") === head, "ACTIVATION_HEAD_MISMATCH");
  need(line(root, "rev-parse", "--is-shallow-repository") === "false", "ACTIVATION_SHALLOW_HISTORY");
  ancestor(root, base, head);
  const selector = git(root, "diff", "--name-status", "--no-renames", "-z", base, head, "--", ACTIVATION_PATH);
  const baseEntry = git(root, "ls-tree", "-z", base, "--", ACTIVATION_PATH);
  const headEntry = git(root, "ls-tree", "-z", head, "--", ACTIVATION_PATH);
  return { base, head, eventName, pullRequestNumber: eventName === "pull_request" ? event.number : null, selectorMode: markerMode(selector, baseEntry, headEntry) };
}

export function assertReceiptEnvelope(receipt, verification, fresh, freshRunId) {
  keys(receipt, ["schemaVersion", "result", "mode", "run", "semantics", "semanticDigest", "liveAllowed", "selfDigest"], "ACTIVATION_RECEIPT_SHAPE");
  const { selfDigest, ...body } = receipt;
  need(digest(body) === selfDigest && digest(receipt.semantics) === receipt.semanticDigest && receipt.semanticDigest === SEMANTIC_DIGEST, "ACTIVATION_RECEIPT_DIGEST");
  need(receipt.schemaVersion === "promotion-legacy-successor-receipt.v1" && receipt.result === "pass" && receipt.mode === "shadow" && receipt.liveAllowed === false && receipt.semantics.liveAllowed === false && receipt.semantics.wholePackAccepted === false && receipt.semantics.historicalAuthorityTransferred === false && receipt.semantics.historicalClosureOverwritten === false && receipt.semantics.lifecycleState === "shadow_ready", "ACTIVATION_RECEIPT_NONLIVE");
  need(receipt.semantics.executionCommit === EXECUTION && receipt.semantics.checkerReleaseCommit === FROZEN_RELEASE && receipt.semantics.checkerBundleDigest === BUNDLE_DIGEST && receipt.semantics.candidateDigest === PACK_SHA && receipt.semantics.manifest.path === MANIFEST && receipt.semantics.manifest.rawSha256 === MANIFEST_SHA, "ACTIVATION_RECEIPT_BINDING");
  same(receipt.semantics.externalSideEffects, { network: 0, provider: 0, database: 0, deployment: 0, production: 0 }, "ACTIVATION_SIDE_EFFECTS");
  need(receipt.semantics.temporaryOutputRehearsed === true && receipt.semantics.temporaryRollbackOnly === true, "ACTIVATION_ROLLBACK");
  keys(verification, ["schemaVersion", "result", "semanticDigest", "receiptRawSha256", "storageCommit", "executionCommit", "liveAllowed"], "ACTIVATION_VERIFICATION_SHAPE");
  need(verification.schemaVersion === "promotion-legacy-successor-verification.v1" && verification.result === "pass" && verification.semanticDigest === SEMANTIC_DIGEST && verification.receiptRawSha256 === RECEIPT_SHA && verification.storageCommit === STORAGE && verification.executionCommit === EXECUTION && verification.liveAllowed === false, "ACTIVATION_VERIFICATION_INVALID");
  keys(fresh, ["schemaVersion", "result", "mode", "run", "semantics", "semanticDigest", "liveAllowed", "selfDigest"], "ACTIVATION_FRESH_SHAPE");
  const { selfDigest: freshSelf, ...freshBody } = fresh;
  need(digest(freshBody) === freshSelf && digest(fresh.semantics) === fresh.semanticDigest && fresh.schemaVersion === receipt.schemaVersion && fresh.result === "pass" && fresh.mode === "shadow" && fresh.liveAllowed === false && fresh.semanticDigest === SEMANTIC_DIGEST, "ACTIVATION_FRESH_INVALID");
  same(fresh.semantics, receipt.semantics, "ACTIVATION_FRESH_BINDING");
  const replayId = `${receipt.run.id[0] === "v" ? "r" : "v"}verify-${sha(Buffer.from(receipt.run.id))}`;
  need(typeof freshRunId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(freshRunId) && fresh.run.id === freshRunId && new Set([receipt.run.id, replayId, freshRunId]).size === 3, "ACTIVATION_RUN_IDENTITY");
}

export function preflight({ repoRoot, eventName, eventPath }) {
  const root = realpathSync(repoRoot); need(root === repoRoot, "ACTIVATION_ROOT_ALIAS");
  need(git(root, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "ACTIVATION_WORKTREE_DIRTY");
  const event = github(root, eventName, eventPath);
  need(event.selectorMode === "successor", "ACTIVATION_SELECTOR_ABSENT");
  ancestor(root, STORAGE, event.head);
  const selected = trackedJson(root, event.head, ACTIVATION_PATH);
  need(selected.mode === "100644", "ACTIVATION_MARKER_MODE");
  const m = selected.value;
  keys(m, ["schemaVersion", "releaseCommit", "codeDigest", "executionCommit", "storageCommit", "manifestRawSha256", "receiptRawSha256", "candidateRawSha256", "receiptSemanticDigest", "reviews", "liveAllowed"], "ACTIVATION_MARKER_SHAPE");
  need(m.schemaVersion === "promotion-legacy-successor-activation.v1" && m.executionCommit === EXECUTION && m.storageCommit === STORAGE && m.manifestRawSha256 === MANIFEST_SHA && m.receiptRawSha256 === RECEIPT_SHA && m.candidateRawSha256 === PACK_SHA && m.receiptSemanticDigest === SEMANTIC_DIGEST && m.liveAllowed === false && HEX40.test(m.releaseCommit ?? "") && HEX64.test(m.codeDigest ?? ""), "ACTIVATION_MARKER_BINDING");
  need(parents(root, STORAGE).length === 1 && parents(root, STORAGE)[0] === EXECUTION, "ACTIVATION_STORAGE_PARENT");
  need(parents(root, m.releaseCommit).length === 1 && parents(root, m.releaseCommit)[0] === STORAGE, "ACTIVATION_RELEASE_PARENT");
  exactPaths(changed(root, STORAGE, m.releaseCommit), CODE_PATHS, "ACTIVATION_CODE_PATHSET");
  const codeRows = CODE_PATHS.map(file => {
    const current = treeBlob(root, event.head, file), frozen = treeBlob(root, m.releaseCommit, file);
    need(frozen.mode === "100644" && current.mode === frozen.mode && current.objectId === frozen.objectId && current.bytes.equals(frozen.bytes), "ACTIVATION_CODE_DRIFT");
    return [file, frozen.mode, frozen.rawSha256];
  });
  need(digest(codeRows) === m.codeDigest, "ACTIVATION_CODE_DIGEST");
  need(Array.isArray(m.reviews) && m.reviews.length === 2, "ACTIVATION_REVIEW_SET");
  for (const [index, role] of ["A11", "A23"].entries()) {
    const entry = m.reviews[index]; keys(entry, ["role", "decision", "report"], "ACTIVATION_REVIEW_SET");
    for (const key of ["decision", "report"]) {
      keys(entry[key], ["path", "rawSha256"], "ACTIVATION_REVIEW_SET");
      need(entry[key].path === REVIEW_PATHS[role][key] && HEX64.test(entry[key].rawSha256), "ACTIVATION_REVIEW_SET");
    }
    const review = trackedJson(root, event.head, entry.decision.path);
    need(review.mode === "100644", "ACTIVATION_REVIEW_MODE");
    need(review.rawSha256 === entry.decision.rawSha256, "ACTIVATION_REVIEW_DIGEST");
    const report = treeBlob(root, event.head, entry.report.path);
    need(report.mode === "100644" && report.rawSha256 === entry.report.rawSha256 && readFileSync(path.join(root, entry.report.path)).equals(report.bytes), "ACTIVATION_REPORT_DIGEST");
    keys(review.value, ["schemaVersion", "role", "reviewerIdentity", "reviewerSessionId", "reviewedAt", "reviewedCommit", "codeDigest", "result", "report", "liveAllowed"], "ACTIVATION_REVIEW_SHAPE");
    keys(review.value.report, ["path", "rawSha256"], "ACTIVATION_REVIEW_SHAPE");
    need(review.value.schemaVersion === "promotion-legacy-successor-activation-review.v1" && review.value.role === role && review.value.reviewerIdentity === REVIEW_IDENTITIES[role] && review.value.reviewerSessionId === REVIEW_IDENTITIES[role] && review.value.reviewedCommit === m.releaseCommit && review.value.codeDigest === m.codeDigest && review.value.result === "approved-for-required-check-integration" && review.value.liveAllowed === false && stable(review.value.report) === stable(entry.report) && typeof review.value.reviewedAt === "string" && Number.isFinite(Date.parse(review.value.reviewedAt)) && new Date(review.value.reviewedAt).toISOString() === review.value.reviewedAt && Date.parse(review.value.reviewedAt) <= Date.now(), "ACTIVATION_REVIEW_INVALID");
  }
  // A separately reviewed commit must add the marker and both reviews exactly once.
  const markerCommit = singleFirstAddition(root, m.releaseCommit);
  exactPaths(changed(root, m.releaseCommit, markerCommit), [ACTIVATION_PATH, ...REVIEW_FILES], "ACTIVATION_EVIDENCE_PATHSET");
  const futurePaths = changed(root, markerCommit, event.head);
  const manifest = trackedJson(root, event.head, MANIFEST);
  need(manifest.rawSha256 === MANIFEST_SHA, "ACTIVATION_MANIFEST_DRIFT");
  const ledger = trackedJson(root, event.head, manifest.value.checkerRelease.ledgerPath);
  const release = ledger.value.entries?.filter(x => x.version === "promotion-legacy-successor-v1.1");
  need(release?.length === 1 && stable(release[0].bundlePaths) === stable([...release[0].bundlePaths].sort()), "ACTIVATION_BUNDLE_INVALID");
  const registry = trackedJson(root, event.head, manifest.value.legacyResolution.registryPath);
  const protectedPaths = new Set([ACTIVATION_PATH, ...CODE_PATHS, ...REVIEW_FILES, ...release[0].bundlePaths, MANIFEST, RECEIPT, PACK,
    "lib/fullQuestionBankSolvability.test.ts", "scripts/arkansas-correctness-solvers.mjs", "scripts/audit-us-math-item-quality.mjs",
    "package.json", "package-lock.json", ".github/workflows/promotion-shadow.yml"]);
  for (const row of registry.value.resolutions ?? []) {
    if (row.candidate?.path) protectedPaths.add(row.candidate.path);
    if (row.liveProjection?.path) protectedPaths.add(row.liveProjection.path);
    for (const approval of row.approvalReferences ?? []) if (approval.path) protectedPaths.add(approval.path);
  }
  assertFuturePaths(futurePaths, protectedPaths);
  assertFutureTreeModes(root, markerCommit, event.head, futurePaths);
  exactPaths(changed(root, STORAGE, event.head), [...CODE_PATHS, ACTIVATION_PATH, ...REVIEW_FILES, ...futurePaths], "ACTIVATION_HEAD_PATHSET");
  const receipt = treeBlob(root, STORAGE, RECEIPT);
  need(receipt.mode === "100644" && receipt.rawSha256 === RECEIPT_SHA && treeBlob(root, event.head, RECEIPT).bytes.equals(receipt.bytes), "ACTIVATION_CANONICAL_RECEIPT_DRIFT");
  need(git(root, "ls-tree", "-z", EXECUTION, "--", RECEIPT).length === 0, "ACTIVATION_FUTURE_RECEIPT");
  exactPaths(changed(root, EXECUTION, STORAGE), [RECEIPT], "ACTIVATION_STORAGE_PATHSET");
  need(treeBlob(root, event.head, PACK).rawSha256 === PACK_SHA && treeBlob(root, event.head, MANIFEST).rawSha256 === MANIFEST_SHA, "ACTIVATION_CANDIDATE_DRIFT");
  const canonical = parse(receipt.bytes);
  need(sha(receipt.bytes) === RECEIPT_SHA && canonical.semanticDigest === SEMANTIC_DIGEST && canonical.liveAllowed === false, "ACTIVATION_CANONICAL_RECEIPT_INVALID");
  return { event, marker: m, canonical, canonicalBytes: receipt.bytes, codeDigest: m.codeDigest, futurePaths,
    expectedRuntimePolicy: manifest.value.liveReachability.expectedRuntimePolicy,
    expectedCanonicalAudit: registry.value.expectedCanonicalAudit,
    historicalManifestPath: manifest.value.historical.manifest.path,
    historicalManifestRawSha256: manifest.value.historical.manifest.rawSha256 };
}

async function currentHeadObservation(repoRoot, context) {
  if (context.futurePaths.length === 0) return { changedPathCount: 0, changedPathsDigest: digest([]), runtimePolicyDigest: context.canonical.semantics.runtimePolicyDigest, canonicalAuditDigest: context.expectedCanonicalAudit.auditDigest };
  const historical = trackedJson(repoRoot, context.event.head, context.historicalManifestPath);
  need(historical.rawSha256 === context.historicalManifestRawSha256, "ACTIVATION_HISTORICAL_MANIFEST_DRIFT");
  const { observePreparation } = await import(pathToFileURL(path.join(repoRoot, "coordination/integration/legacy-successor/contract.mjs")).href);
  const observed = await observePreparation(repoRoot, historical.value);
  same(observed.expectedRuntimePolicy, context.expectedRuntimePolicy, "ACTIVATION_CURRENT_RUNTIME_DRIFT");
  same(observed.canonicalAudit, context.expectedCanonicalAudit, "ACTIVATION_CURRENT_LEGACY_DRIFT");
  need(digest(observed.expectedRuntimePolicy) === context.canonical.semantics.runtimePolicyDigest, "ACTIVATION_CURRENT_RUNTIME_DIGEST");
  return { changedPathCount: context.futurePaths.length, changedPathsDigest: digest(context.futurePaths), runtimePolicyDigest: digest(observed.expectedRuntimePolicy), canonicalAuditDigest: observed.canonicalAuditDigest };
}

function evidence(artifactRoot, context) {
  const meta = parse(readFileSync(path.join(artifactRoot, "native-runs.v1.json")));
  keys(meta, ["schemaVersion", "verification", "fresh", "freshRunId"], "ACTIVATION_RUN_METADATA");
  need(meta.schemaVersion === "promotion-legacy-successor-native-runs.v1", "ACTIVATION_RUN_METADATA");
  const outputs = {};
  for (const name of ["verification", "fresh"]) {
    const row = meta[name]; keys(row, ["exitCode", "stdoutSha256", "stderrSha256"], "ACTIVATION_RUN_METADATA");
    const raw = readFileSync(path.join(artifactRoot, `${name}.json`));
    const err = readFileSync(path.join(artifactRoot, `${name}.stderr`));
    need(row.exitCode === 0 && sha(raw) === row.stdoutSha256 && sha(err) === row.stderrSha256, "ACTIVATION_NATIVE_EXIT_OR_BYTES");
    outputs[name] = parse(raw);
  }
  assertReceiptEnvelope(context.canonical, outputs.verification, outputs.fresh, meta.freshRunId);
  return { meta, outputs };
}
export function assertArtifactSet(artifactRoot) {
  const runnerTemp = realpathSync(process.env.RUNNER_TEMP ?? tmpdir());
  const root = realpathSync(artifactRoot);
  need(root === artifactRoot && root.startsWith(`${runnerTemp}/`), "ACTIVATION_ARTIFACT_ROOT");
  const rootStat = lstatSync(root);
  need(rootStat.isDirectory() && !rootStat.isSymbolicLink() && (rootStat.mode & 0o777) === 0o700, "ACTIVATION_ARTIFACT_ROOT");
  same(readdirSync(root).sort(), ARTIFACT_FILES, "ACTIVATION_ARTIFACT_SET");
  for (const name of ARTIFACT_FILES) {
    const file = path.join(root, name), stat = lstatSync(file);
    need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && (stat.mode & 0o777) === 0o600 && stat.size <= 32 * 1024 * 1024 && realpathSync(file) === file, "ACTIVATION_ARTIFACT_FILE");
  }
  return root;
}
function decision(context, data, headObservation) {
  const payload = {
    schemaVersion: "promotion-legacy-successor-required-check-decision.v1",
    result: "pass", code: "legacy_successor_current_head_nonlive_chain_passed",
    event: { eventName: context.event.eventName, pullRequestNumber: context.event.pullRequestNumber, baseCommit: context.event.base, headCommit: context.event.head },
    bindings: { activationCodeDigest: context.codeDigest, executionCommit: EXECUTION, storageCommit: STORAGE, checkerReleaseCommit: FROZEN_RELEASE, checkerBundleDigest: BUNDLE_DIGEST, manifestRawSha256: MANIFEST_SHA, candidateRawSha256: PACK_SHA, canonicalReceiptRawSha256: RECEIPT_SHA, semanticDigest: SEMANTIC_DIGEST },
    native: { verificationOutputRawSha256: data.meta.verification.stdoutSha256, freshOutputRawSha256: data.meta.fresh.stdoutSha256, freshRunIdentityDigest: sha(Buffer.from(data.meta.freshRunId)) },
    currentHead: headObservation,
    permissions: { liveAllowed: false, integrationAllowed: false, previewAllowed: false, deployAllowed: false }
  };
  return { ...payload, decisionDigest: digest(payload) };
}
function runNative(execution, operation, flags, root, basename) {
  const script = path.join(execution, "coordination/integration/legacy-successor/promotion.mjs");
  const child = spawnSync(process.execPath, [script, operation, ...flags, "--json"], {
    cwd: execution, env: { PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/local/bin" },
    timeout: operation === "verify-receipt" ? 1_200_000 : 900_000, maxBuffer: 4 * 1024 * 1024
  });
  const stdout = Buffer.from(child.stdout ?? []), stderr = Buffer.from(child.stderr ?? []);
  writeFileSync(path.join(root, `${basename}.json`), stdout, { flag: "wx", mode: 0o600 });
  writeFileSync(path.join(root, `${basename}.stderr`), stderr, { flag: "wx", mode: 0o600 });
  need(child.status === 0 && !child.signal && !child.error, "ACTIVATION_NATIVE_FAILED");
  return { exitCode: child.status, stdoutSha256: sha(stdout), stderrSha256: sha(stderr) };
}
export function select({ repoRoot, eventName, eventPath }) { return github(realpathSync(repoRoot), eventName, eventPath).selectorMode; }
export async function evaluate({ repoRoot, executionRoot, eventName, eventPath, artifactRoot, runId }) {
  const context = preflight({ repoRoot, eventName, eventPath });
  const headObservation = await currentHeadObservation(repoRoot, context);
  const runnerTemp = realpathSync(process.env.RUNNER_TEMP ?? tmpdir());
  const root = realpathSync(artifactRoot); need(root === artifactRoot && root.startsWith(`${runnerTemp}/`) && (lstatSync(root).mode & 0o777) === 0o700, "ACTIVATION_ARTIFACT_ROOT");
  const execution = realpathSync(executionRoot); need(execution === executionRoot && execution !== repoRoot && execution.startsWith(`${runnerTemp}/`), "ACTIVATION_EXECUTION_ROOT");
  need(line(execution, "rev-parse", "HEAD") === EXECUTION && git(execution, "status", "--porcelain=v1", "--untracked-files=all").length === 0, "ACTIVATION_EXECUTION_WORKTREE");
  need(realpathSync(path.join(execution, "node_modules")) === path.join(execution, "node_modules"), "ACTIVATION_EXECUTION_DEPENDENCIES");
  need(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId ?? ""), "ACTIVATION_RUN_IDENTITY");
  const replayId = `${context.canonical.run.id[0] === "v" ? "r" : "v"}verify-${sha(Buffer.from(context.canonical.run.id))}`;
  need(new Set([runId, context.canonical.run.id, replayId]).size === 3, "ACTIVATION_RUN_IDENTITY");
  const verification = runNative(execution, "verify-receipt", ["--receipt", RECEIPT, "--storage-commit", STORAGE, "--receipt-sha256", RECEIPT_SHA], root, "verification");
  const fresh = runNative(execution, "shadow", ["--manifest", MANIFEST, "--run-id", runId], root, "fresh");
  const meta = { schemaVersion: "promotion-legacy-successor-native-runs.v1", verification, fresh, freshRunId: runId };
  writeFileSync(path.join(root, "native-runs.v1.json"), `${stable(meta)}\n`, { flag: "wx", mode: 0o600 });
  const record = decision(context, evidence(root, context), headObservation);
  writeFileSync(path.join(root, "decision.v1.json"), `${stable(record)}\n`, { flag: "wx", mode: 0o600 });
  assertArtifactSet(root);
  return record;
}
export async function verify({ repoRoot, eventName, eventPath, artifactRoot }) {
  const context = preflight({ repoRoot, eventName, eventPath });
  const headObservation = await currentHeadObservation(repoRoot, context);
  const root = assertArtifactSet(artifactRoot);
  const actual = parse(readFileSync(path.join(root, "decision.v1.json")));
  same(actual, decision(context, evidence(root, context), headObservation), "ACTIVATION_DECISION_MISMATCH");
  need(actual.result === "pass" && actual.permissions.liveAllowed === false, "ACTIVATION_DECISION_BLOCKED");
  return actual;
}

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  need(["select", "preflight", "evaluate", "verify"].includes(operation), "ACTIVATION_USAGE");
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    need(args[i]?.startsWith("--") && args[i + 1] && !Object.hasOwn(options, args[i].slice(2)), "ACTIVATION_USAGE");
    options[args[i].slice(2)] = args[i + 1];
  }
  const allowed = operation === "select" || operation === "preflight" ? ["repo", "event-name", "event-path"] : operation === "evaluate" ? ["repo", "event-name", "event-path", "execution", "artifact-root", "run-id"] : ["repo", "event-name", "event-path", "artifact-root"];
  need(JSON.stringify(Object.keys(options).sort()) === JSON.stringify(allowed.sort()), "ACTIVATION_USAGE");
  const common = { repoRoot: options.repo, eventName: options["event-name"], eventPath: options["event-path"] };
  if (operation === "select") process.stdout.write(`${select(common)}\n`);
  else if (operation === "preflight") process.stdout.write(`${stable(preflight(common).event)}\n`);
  else if (operation === "evaluate") process.stdout.write(`${stable(await evaluate({ ...common, executionRoot: options.execution, artifactRoot: options["artifact-root"], runId: options["run-id"] }))}\n`);
  else process.stdout.write(`${stable(await verify({ ...common, artifactRoot: options["artifact-root"] }))}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch (error) {
    const code = typeof error?.code === "string" && /^[A-Z][A-Z0-9_]{2,95}$/u.test(error.code) ? error.code : "ACTIVATION_INTERNAL";
    process.stdout.write(`${stable({ schemaVersion: "promotion-legacy-successor-required-check-error.v1", result: "blocked", code, liveAllowed: false })}\n`);
    process.exitCode = 2;
  }
}
