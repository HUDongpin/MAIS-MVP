import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { authenticateRuntime, TRUSTED_BUNDLE_PATHS } from "./bootstrap.mjs";
import { contentDelta, validateManifest, validateDescriptor, validateEvidence, assertRegistrySuccessor, verifyReceiptShape, repository, assertEvidenceOnlyDelta, validateAttempt, collectAuthority, BUNDLE_PATHS, SOURCE_PATHS, ROOT, PACK, COMMON_BASE, IMPORT_COMMIT, ORIGINAL_PACK_HASH, REVIEWERS } from "./contract.mjs";
import { fingerprint, sha256 } from "../promotion-gate-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "../../../scripts/promotion-workflow-json-guard.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const h = "a".repeat(64), c = "b".repeat(40);
const ref = file => ({ path: file, rawSha256: h });
const delta = { changedIds: Array.from({ length: 22 }, (_, i) => `row-${String(i).padStart(2, "0")}`), changed: Array.from({ length: 22 }, (_, i) => ({ id: `row-${String(i).padStart(2, "0")}`, afterDigest: h })), changeDigest: h };
const policy = () => Object.fromEntries(["coveredFileCount", "coveredFilesDigest", "classificationsDigest", "frameworkEntrypointCount", "seedCount", "reachablePathCount", "reachablePathsDigest", "edgeCount", "edgeDigest", "topologyEdgeCount", "topologyEdgeDigest", "nextDynamicCallCount", "nextDynamicLiteralImportCount", "nextDynamicNonliteralImportCount", "nextDynamicCallsiteDigest", "fsReadAllowlistCount", "fsReadAllowlistDigest", "zeroBaselineCallCount"].map(key => [key, key.endsWith("Digest") ? h : 0]));
const manifest = () => ({
  schemaVersion: "promotion-legacy-successor-manifest.v1", gateId: "legacy-content-successor-nonlive", attemptId: "attempt-008", mode: "shadow", checkerVersion: "promotion-legacy-successor-v1",
  checkerRelease: { ledgerPath: `${ROOT}/checker-releases.v1.json`, ledgerRawSha256: h, releaseCommit: c, bundleDigest: h },
  candidate: { path: PACK, rawSha256: h, packageId: "us-ar-math-g6-g12-generated-bank-v1-1500", version: "1.1.0-correctness.22", status: "candidate-only" },
  source: { importCommit: IMPORT_COMMIT, commonBaseCommit: COMMON_BASE, reviewedSourceCommit: c, importedPaths: SOURCE_PATHS.map(file => ({ path: file, rawSha256: h, mode: "100644", objectId: c })), originalPack: { path: PACK, rawSha256: ORIGINAL_PACK_HASH } },
  historical: { commit: c, manifest: ref("history/manifest.json"), receipt: ref("history/receipt.json"), registry: ref("history/registry.json"), closure: ref("history/closure.json"), lifecycle: ref("history/lifecycle.json") },
  targetBaselineCommit: c, successor: { resolutionId: "de-reach-arkansas-g6-g12-questions-v1", decision: "de-reached", contentChanged: true, baselineOnly: false, wholePackAccepted: false, changedIds: delta.changedIds, unchangedCount: 1478, changeDigest: h },
  legacyResolution: { registryPath: `${ROOT}/attempt-008/inputs/legacy-resolution-registry.v1.json`, rawSha256: h },
  liveReachability: { compatibilityManifestPath: "compat.json", compatibilityManifestRawSha256: h, expectedRuntimePolicy: policy() },
  evidenceIndex: { path: `${ROOT}/attempt-008/inputs/evidence-index.v1.json`, rawSha256: h, evidenceCommit: c }, descriptor: { path: `${ROOT}/attempt-008/successor.v1.json` }, canonicalReceiptPath: `${ROOT}/attempt-008/promotion-shadow-receipt.v1.json`, lifecycleState: "shadow_ready", liveAllowed: false
});
const evidence = role => ({ schemaVersion: "promotion-legacy-successor-evidence.v1", role, reviewer: { sessionId: REVIEWERS[role], identity: REVIEWERS[role], independence: "independent-review" }, reviewedAt: "2026-09-27T00:00:00.000Z", result: "pass", candidateRawSha256: h, changeDigest: h, report: ref("review.md"), details: role === "A18" ? { reviewedRows: delta.changed.map(x => ({ id: x.id, recordDigest: x.afterDigest, verdict: "approved-bounded-correction" })), wholePackAccepted: false, limitations: ["22 selected rows only"] } : role === "A11" ? { checkerBundleDigest: h, negativeChecks: ["changed-qa-row", "changed-release-code", "duplicate-json-key", "fake-baseline-only", "future-receipt", "live-admission", "non-ar-registry-change", "same-reviewer"], sourceRegression: "pass" } : { checkerBundleDigest: h, disposition: "de-reached-successor", otherResolutionsPreserved: 17, approvedProjectionsPreserved: 3, historicalCustody: "preserved" }, liveAllowed: false });
const rehash = receipt => { receipt.semanticDigest = fingerprint(receipt.semantics); const { selfDigest, ...body } = receipt; receipt.selfDigest = fingerprint(body); return receipt; };
const receipt = () => rehash({ schemaVersion: "promotion-legacy-successor-receipt.v1", result: "pass", mode: "shadow", run: { id: "fixture-canonical", producedAt: "2026-09-27T00:00:00.000Z" }, semantics: { manifest: ref(`${ROOT}/attempt-008/promotion-manifest.v1.json`), executionCommit: c, sourceCommit: c, importedSourceCommit: IMPORT_COMMIT, targetBaselineCommit: c, candidateDigest: h, checkerVersion: "promotion-legacy-successor-v1", checkerBundleDigest: h, checkerReleaseCommit: c, changeDigest: h, changedRowCount: 22, unchangedRowCount: 1478, wholePackAccepted: false, runtimePolicyDigest: h, legacyProofDigest: h, sourceSnapshotDigest: h, dependenciesDigest: h, evidenceRecordCount: 5, independentReviewSessionCount: 3, coordinatorRoleRecordCount: 2, historicalAuthorityTransferred: false, historicalClosureOverwritten: false, lifecycleState: "shadow_ready", outputDigest: h, capabilityPolicyDigest: h, externalSideEffects: { network: 0, provider: 0, database: 0, deployment: 0, production: 0 }, temporaryOutputRehearsed: true, temporaryRollbackOnly: true, liveAllowed: false }, semanticDigest: h, selfDigest: h, liveAllowed: false });

test("closed schemas compile and accept their explicit bounded fixtures", async () => {
  for (const [name, value] of [["manifest", manifest()], ["evidence", evidence("A18")], ["receipt", receipt()]]) {
    const schema = parsePromotionWorkflowJsonBytes(await readFile(path.join(root, ROOT, "schemas", `${name}.v1.schema.json`)));
    assert.equal(new Ajv2020({ strict: true }).compile(schema)(value), true, name);
  }
  assert.doesNotThrow(() => validateManifest(manifest())); assert.doesNotThrow(() => verifyReceiptShape(receipt()));
});
test("runtime policy schema rejects an empty policy and positive authority aliases", async () => {
  const schema = parsePromotionWorkflowJsonBytes(await readFile(path.join(root, ROOT, "schemas", "manifest.v1.schema.json")));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  for (const value of [{}, { ...policy(), productionAccepted: true }]) { const m = manifest(); m.liveReachability.expectedRuntimePolicy = value; assert.equal(validate(m), false); }
});

for (const [title, edit] of [
  ["live-admission", m => { m.liveAllowed = true; }],
  ["fake-baseline-only", m => { m.successor.baselineOnly = true; m.successor.contentChanged = false; }],
  ["full-pack-acceptance", m => { m.successor.wholePackAccepted = true; }],
  ["wrong-attempt", m => { m.attemptId = "attempt-007"; }],
  ["source-ancestry-fiction", m => { m.source.importCommit = m.targetBaselineCommit; }],
  ["path-escape", m => { m.descriptor.path = "../authority.json"; }],
  ["extra-authority-alias", m => { m.mergeApproved = true; }]
]) test(title, () => { const m = manifest(); edit(m); assert.throws(() => validateManifest(m)); });

test("same identity with a different session cannot impersonate another independent role", () => {
  const e = evidence("A18"); e.reviewer.identity = REVIEWERS.A11;
  assert.throws(() => validateEvidence(e, manifest(), delta));
  e.reviewer.identity = REVIEWERS.A18; e.reviewer.sessionId = "/root/new-a18-session";
  assert.throws(() => validateEvidence(e, manifest(), delta));
});
test("changed-qa-row rejects stale selected record approval", () => {
  const e = evidence("A18"); e.details.reviewedRows[3].recordDigest = "c".repeat(64);
  assert.throws(() => validateEvidence(e, manifest(), delta));
});
test("A11 cannot omit a required independent negative boundary", () => {
  const e = evidence("A11"); e.details.negativeChecks.pop(); assert.throws(() => validateEvidence(e, manifest(), delta));
});
test("future review dates and impossible dates are rejected", () => {
  for (const value of ["2099-01-01T00:00:00.000Z", "2026-02-30T00:00:00.000Z"]) {
    const e = evidence("A18"); e.reviewedAt = value; assert.throws(() => validateEvidence(e, manifest(), delta));
  }
});
test("descriptor binds actual content/checker change and exact Manifest", () => {
  const m = manifest(), manifestRef = ref(`${ROOT}/attempt-008/promotion-manifest.v1.json`);
  const d = { schemaVersion: "promotion-legacy-successor-descriptor.v1", relation: "immutable-content-successor", manifest: manifestRef, evidenceCommit: c, historicalManifest: m.historical.manifest, historicalReceipt: m.historical.receipt, candidateChanged: true, checkerChanged: true, baselineOnly: false, liveAllowed: false };
  assert.doesNotThrow(() => validateDescriptor(d, m, manifestRef)); d.relation = "append-only-reaffirmation";
  assert.throws(() => validateDescriptor(d, m, manifestRef));
});
test("registry successor preserves every unrelated resolution object and baseline metadata truth", () => {
  const m = manifest(), original = { targetBaselineCommit: "d".repeat(40), ratchet: { retained: true }, expectedCanonicalAudit: { retained: true }, resolutions: [{ resolutionId: m.successor.resolutionId, decision: "de-reached", liveProjection: null, approvalReferences: [], candidate: { path: PACK, rawSha256: ORIGINAL_PACK_HASH } }, { resolutionId: "unrelated", decision: "approved-projection", candidate: { rawSha256: h } }] };
  const next = structuredClone(original); next.targetBaselineCommit = c; next.resolutions[0].candidate.rawSha256 = h;
  assert.doesNotThrow(() => assertRegistrySuccessor(original, next, m)); next.resolutions[1].candidate.rawSha256 = "c".repeat(64);
  assert.throws(() => assertRegistrySuccessor(original, next, m));
});

for (const [title, edit] of [
  ["rehash-production-claim", r => { r.semantics.productionAccepted = true; }],
  ["rehash-deploy-claim", r => { r.semantics.deployAllowed = true; }],
  ["rehash-positive-external-effect", r => { r.semantics.externalSideEffects.database = 1; }],
  ["rehash-live-authority", r => { r.semantics.liveAllowed = true; }],
  ["rehash-transferred-history", r => { r.semantics.historicalAuthorityTransferred = true; }],
  ["rehash-fake-closure", r => { r.semantics.lifecycleState = "shadow_passed"; }],
  ["rehash-invalid-run", r => { r.run.id = "unsafe id"; }],
  ["rehash-invalid-date", r => { r.run.producedAt = "2026-02-30T00:00:00.000Z"; }]
]) test(title, () => { const r = receipt(); edit(r); assert.throws(() => verifyReceiptShape(rehash(r))); });

test("strict parser rejects duplicate keys, UTF-8 corruption and non-finite numbers", () => {
  for (const bytes of [Buffer.from('{"liveAllowed":false,"liveAllowed":true}'), Buffer.from([0xff]), Buffer.from('{"n":1e999}')]) assert.throws(() => parsePromotionWorkflowJsonBytes(bytes));
});

test("real candidate retains 1478 untouched rows and truthful selected content change", async () => {
  const gitFile = await readFile(path.join(root, ".git"), "utf8");
  const gitDir = gitFile.match(/^gitdir: (.+)/u)[1];
  const bytes = execFileSync("/usr/bin/git", [`--git-dir=${gitDir}`, `--work-tree=${root}`, "show", `${COMMON_BASE}:${PACK}`], { maxBuffer: 32 * 1024 * 1024, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1" } });
  const before = parsePromotionWorkflowJsonBytes(bytes), after = parsePromotionWorkflowJsonBytes(await readFile(path.join(root, PACK)));
  const d = contentDelta(before, after);
  assert.equal(d.changedIds.length, 22); assert.equal(d.unchangedCount, 1478); assert.equal(d.wholePackAccepted, false);
  const changedIdentity = structuredClone(after); changedIdentity.questions[0].standardIds = ["unreviewed.standard"];
  assert.throws(() => contentDelta(before, changedIdentity));
});

async function gitFixture() {
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), "mais-successor-test-")));
  const git = (...args) => execFileSync("/usr/bin/git", ["-C", directory, ...args], { env: { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }, maxBuffer: 32 * 1024 * 1024 }).toString().trim();
  git("init", "-q"); git("config", "user.name", "Local Contract Fixture"); git("config", "user.email", "fixture@example.invalid");
  const put = async (file, value) => { const dest = path.join(directory, file); await mkdir(path.dirname(dest), { recursive: true }); await writeFile(dest, typeof value === "string" ? value : JSON.stringify(value)); };
  const save = (...files) => { git("add", "--", ...files); git("commit", "-q", "-m", "bounded fixture"); return git("rev-parse", "HEAD"); };
  return { directory, git, put, save, dispose: () => rm(directory, { recursive: true }) };
}

for (const [name, code] of [["future-receipt", "SUCCESSOR_FUTURE_RECEIPT_ALREADY_BOUND"], ["descriptor-added-before-binding", "SUCCESSOR_ATOMIC_BINDING_REQUIRED"]]) {
  test(`real Git history rejects ${name}`, async () => {
    const f = await gitFixture();
    try {
      await f.put("base.txt", "base"); const baseline = f.save("base.txt");
      const m = manifest(); m.targetBaselineCommit = baseline; m.source.reviewedSourceCommit = baseline; m.checkerRelease.releaseCommit = baseline;
      await f.put("evidence.txt", "fixture is not an approval");
      if (name === "descriptor-added-before-binding") await f.put(m.descriptor.path, {});
      m.evidenceIndex.evidenceCommit = f.save("evidence.txt", ...(name === "descriptor-added-before-binding" ? [m.descriptor.path] : []));
      const mp = `${ROOT}/attempt-008/promotion-manifest.v1.json`;
      await f.put(mp, m);
      if (name === "future-receipt") {
        await f.put(m.descriptor.path, { schemaVersion: "promotion-legacy-successor-descriptor.v1", relation: "immutable-content-successor", manifest: { path: mp, rawSha256: sha256(Buffer.from(JSON.stringify(m))) }, evidenceCommit: m.evidenceIndex.evidenceCommit, historicalManifest: m.historical.manifest, historicalReceipt: m.historical.receipt, candidateChanged: true, checkerChanged: true, baselineOnly: false, liveAllowed: false });
        await f.put(m.canonicalReceiptPath, {});
      }
      f.save(mp, ...(name === "future-receipt" ? [m.descriptor.path, m.canonicalReceiptPath] : []));
      await assert.rejects(validateAttempt(f.directory, mp), e => e.code === code);
    } finally { await f.dispose(); }
  });
}

test("changed-release-code stays RED even when candidate recalculates the current ledger digest", async () => {
  const f = await gitFixture();
  try {
    for (const file of BUNDLE_PATHS) await f.put(file, file.endsWith(".json") ? {} : "// synthetic boundary fixture\n");
    const release = f.save(...BUNDLE_PATHS);
    await f.put(`${ROOT}/contract.mjs`, "// tampered after frozen release\n");
    const bound = await Promise.all(BUNDLE_PATHS.map(async file => ({ path: file, rawSha256: (await import("../promotion-gate-lib.mjs")).sha256(await readFile(path.join(f.directory, file))) })));
    const digest = fingerprint(bound);
    const ledger = { schemaVersion: "promotion-checker-releases.legacy-successor.v1", entries: [{ version: "promotion-legacy-successor-v1", bundleAlgorithm: "sha256-stable-json-path-raw-v1", bundlePaths: BUNDLE_PATHS, bundleDigest: digest, releaseCommit: release, reviewReferences: [], dependencyBindings: [] }] };
    await f.put(`${ROOT}/checker-releases.v1.json`, ledger); f.save(`${ROOT}/contract.mjs`, `${ROOT}/checker-releases.v1.json`);
    const m = manifest(); m.targetBaselineCommit = release; m.checkerRelease.releaseCommit = release; m.checkerRelease.bundleDigest = digest;
    m.checkerRelease.ledgerRawSha256 = (await import("../promotion-gate-lib.mjs")).sha256(await readFile(path.join(f.directory, ROOT, "checker-releases.v1.json")));
    await assert.rejects(collectAuthority(await repository(f.directory), m), e => e.code === "SUCCESSOR_RELEASE_BYTES_DRIFT");
  } finally { await f.dispose(); }
});

test("literal repository binding ignores hostile inherited Git environment", async () => {
  const f = await gitFixture(); const previous = process.env.GIT_DIR;
  try {
    await f.put("base.txt", "test"); const expected = f.save("base.txt");
    process.env.GIT_DIR = "/untrusted/nonexistent/git";
    assert.equal((await repository(f.directory)).head, expected);
  } finally { if (previous === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = previous; await f.dispose(); }
});

for (const rehashed of [false, true]) test(`bootstrap rejects poisoned dependency bytes${rehashed ? " and rehashed ledger" : ""} without importing their code`, async () => {
  const f = await gitFixture();
  try {
    const names = ["ajv", "fast-deep-equal", "fast-uri", "json-schema-traverse", "require-from-string", "typescript", "yaml"];
    const lock = { packages: Object.fromEntries(names.map(name => [`node_modules/${name}`, { version: "0.0.0-fixture", integrity: "sha512-fixture" }])) };
    for (const file of TRUSTED_BUNDLE_PATHS) await f.put(file, file === "package-lock.json" ? lock : file.endsWith(".json") ? {} : "// fixture bytes; never executed\n");
    await f.put(".gitignore", "node_modules/\n");
    const deps = [];
    for (const name of names) {
      const pkg = { name, version: "0.0.0-fixture" };
      const packageBytes = Buffer.from(JSON.stringify(pkg)), code = "// original inert dependency\n";
      await f.put(`node_modules/${name}/package.json`, JSON.stringify(pkg)); await f.put(`node_modules/${name}/index.js`, code);
      deps.push({ name, version: "0.0.0-fixture", integrity: "sha512-fixture", fileCount: 2, treeDigest: fingerprint([["index.js", "100644", sha256(Buffer.from(code))], ["package.json", "100644", sha256(packageBytes)]]) });
    }
    await f.put(`${ROOT}/frozen-dependency-bindings.v1.json`, {schemaVersion:"promotion-frozen-dependency-bindings.v1",packages:deps});
    const release = f.save(...TRUSTED_BUNDLE_PATHS, ".gitignore");
    const bindings = await Promise.all(TRUSTED_BUNDLE_PATHS.map(async file => ({ path: file, rawSha256: sha256(await readFile(path.join(f.directory, file))) })));
    const ledger = { schemaVersion: "promotion-checker-releases.legacy-successor.v1", entries: [{ version: "promotion-legacy-successor-v1", releaseCommit: release, bundleDigest: fingerprint(bindings), bundlePaths: TRUSTED_BUNDLE_PATHS, dependencyBindings: deps }] };
    const lp = `${ROOT}/checker-releases.v1.json`; await f.put(lp, ledger);
    const mp = `${ROOT}/attempt-008/promotion-manifest.v1.json`, m = manifest();
    m.checkerRelease = { ledgerPath: lp, ledgerRawSha256: sha256(Buffer.from(JSON.stringify(ledger))), releaseCommit: release, bundleDigest: fingerprint(bindings) };
    await f.put(mp, m); f.save(lp, mp);
    delete globalThis.successorPoisonExecuted;
    await f.put("node_modules/ajv/index.js", "globalThis.successorPoisonExecuted = true; throw Error('poison');\n");
    if (rehashed) {
      const poison = await readFile(path.join(f.directory, "node_modules/ajv/index.js"));
      ledger.entries[0].dependencyBindings[0].treeDigest = fingerprint([["index.js", "100644", sha256(poison)], ["package.json", "100644", sha256(await readFile(path.join(f.directory, "node_modules/ajv/package.json")))]]);
      await f.put(lp, ledger); m.checkerRelease.ledgerRawSha256 = sha256(Buffer.from(JSON.stringify(ledger))); await f.put(mp, m); f.save(lp, mp);
    }
    await assert.rejects(authenticateRuntime(f.directory, ["validate", "--manifest", mp, "--json"]), e => e.code === (rehashed ? "SUCCESSOR_BOOTSTRAP_FROZEN_DEPENDENCY_DRIFT" : "SUCCESSOR_BOOTSTRAP_DEPENDENCY_DRIFT"));
    assert.equal(globalThis.successorPoisonExecuted, undefined);
  } finally { await f.dispose(); }
});

for (const file of ["next.config.mjs", "jsconfig.alias.json", "tsconfig.next.json", "pages/hidden.tsx"]) test(`real Git delta rejects post-freeze protected input ${file}`, async () => {
  const f = await gitFixture();
  try {
    await f.put("base.txt", "base"); const baseline = f.save("base.txt");
    await f.put(`${ROOT}/allowed-evidence.json`, {}); const evidence = f.save(`${ROOT}/allowed-evidence.json`);
    assertEvidenceOnlyDelta(await repository(f.directory), baseline, evidence);
    await f.put(file, file.endsWith(".json") ? {} : "// unauthorized runtime input"); const changed = f.save(file);
    assert.throws(() => assertEvidenceOnlyDelta({git:(...args)=>Buffer.from(f.git(...args))}, baseline, changed), e=>e.code === "SUCCESSOR_PROTECTED_BASELINE_DRIFT");
  } finally { await f.dispose(); }
});
