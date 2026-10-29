import { Repository, dependency } from "./repository.mjs";
import {
  validateReleaseInventory,
  validateEvidenceInventory,
} from "./phase.mjs";
import { validateSchema } from "./schema.mjs";
import {
  validateCandidate,
  validateRegistry,
  validateOwnershipChange,
} from "./candidate.mjs";
import { validateEvidence, validateInventoryCoverage } from "./evidence.mjs";
import { observe } from "./runtime.mjs";
import { authenticateAdapterArtifacts } from "./storage-loader-policy-v1.mjs";
import { need, same, digest, hash, relative, time, unique } from "./common.mjs";
import {
  ROOT,
  VERSION,
  ANCHOR,
  BUNDLE_PATHS,
  SLUGS,
  SNAPSHOT,
  OLD_PROJECTION,
  OLD_PROJECTION_SHA,
  PRIOR_REGISTRY,
  PRIOR_REGISTRY_SHA,
  AR_PACK,
  AR_SHA,
  HISTORICAL_REGISTRY,
  HISTORICAL_REGISTRY_SHA,
  COMPATIBILITY,
  COMPATIBILITY_SHA,
  ALLOWED_SOURCE_PATHS,
  ROLES,
} from "./constants.mjs";
export function attemptPaths(m) {
  const prefix = `${ROOT}/attempts/${m.attemptId}`;
  same(
    [
      m.candidate.path,
      m.registry.path,
      m.disposition.path,
      m.evidenceIndex.path,
      m.descriptorPath,
      m.canonicalReceiptPath,
    ],
    [
      `${prefix}/inputs/candidate.json`,
      `${prefix}/inputs/registry.json`,
      `${prefix}/inputs/disposition.json`,
      `${prefix}/inputs/evidence-index.json`,
      `${prefix}/successor.json`,
      `${prefix}/canonical-receipt.json`,
    ],
    "CA_ATTEMPT_PATH",
  );
  return prefix;
}
export function validatePhase(repo, m, manifestPath, { stored = false } = {}) {
  validateSchema("manifest", m);
  const prefix = attemptPaths(m);
  need(
    m.checkerLedger.path === ROOT + "/checker-releases.json",
    "CA_LEDGER_PATH",
  );
  unique(m.sourceAuthors);
  unique(m.checkerAuthors);
  need(manifestPath === prefix + "/manifest.json", "CA_MANIFEST_PATH");
  need(m.baseCommit === ANCHOR, "CA_BASELINE");
  repo.ancestor(ANCHOR, m.baseCommit);
  repo.ancestor(m.baseCommit, m.sourceCommit);
  repo.ancestor(m.sourceCommit, m.checkerReleaseCommit);
  repo.ancestor(m.checkerReleaseCommit, m.evidenceCommit);
  need(
    m.sourceCommit !== m.checkerReleaseCommit &&
      m.checkerReleaseCommit !== m.evidenceCommit,
    "CA_PHASE_COLLAPSED",
  );
  repo.ancestor(m.evidenceCommit, repo.head);
  need(repo.tree(m.sourceCommit) === m.sourceTree, "CA_SOURCE_TREE");
  const execution = repo.addition(manifestPath);
  same(repo.parents(execution), [m.evidenceCommit], "CA_EXECUTION_PARENT");
  need(repo.addition(m.descriptorPath) === execution, "CA_ATOMIC_BINDING");
  same(
    repo.changed(m.evidenceCommit, execution),
    [manifestPath, m.descriptorPath].sort(),
    "CA_EXECUTION_PATHS",
  );
  repo.absent(m.evidenceCommit, manifestPath);
  repo.absent(m.evidenceCommit, m.descriptorPath);
  repo.absent(execution, m.canonicalReceiptPath);
  need(stored === false && repo.head === execution, "CA_EXECUTION_CHECKOUT");
  validateReleaseInventory(repo, m);
  validateEvidenceInventory(repo, m);
  const descriptor = repo.json(repo.head, { path: m.descriptorPath });
  validateSchema("descriptor", descriptor);
  same(
    descriptor.manifest,
    { path: manifestPath, sha256: repo.blob(execution, manifestPath).sha256 },
    "CA_DESCRIPTOR",
  );
  need(descriptor.evidenceCommit === m.evidenceCommit, "CA_DESCRIPTOR");
  repo.read(execution, { path: manifestPath });
  repo.read(execution, { path: m.descriptorPath });
  return execution;
}
export function authenticateRelease(repo, m) {
  validateReleaseInventory(repo, m);
  validateEvidenceInventory(repo, m);
  repo.absent(m.checkerReleaseCommit, m.checkerLedger.path);
  need(
    repo.addition(m.checkerLedger.path) === m.evidenceCommit,
    "CA_LEDGER_FIRST_ADD",
  );
  const ledger = repo.json(m.evidenceCommit, m.checkerLedger);
  validateSchema("ledger", ledger);
  need(
    ledger.version === VERSION &&
      ledger.releaseCommit === m.checkerReleaseCommit &&
      ledger.bundleDigest === m.checkerBundleDigest,
    "CA_RELEASE",
  );
  same(
    ledger.files.map((f) => f.path),
    BUNDLE_PATHS,
    "CA_BUNDLE_SCOPE",
  );
  need(
    digest({ files: ledger.files, dependencies: ledger.dependencies }) ===
      ledger.bundleDigest,
    "CA_BUNDLE_DIGEST",
  );
  for (const f of ledger.files) {
    repo.read(ledger.releaseCommit, f);
    repo.read(repo.head, f);
  }
  const dep = dependency(repo.root);
  same(ledger.dependencies, [dep.binding], "CA_DEPENDENCY_DRIFT");
  const reviewers = [];
  for (const ref of ledger.reviews) {
    const r = repo.json(m.evidenceCommit, ref);
    validateSchema("release-review", r);
    need(
      r.releaseCommit === ledger.releaseCommit &&
        r.bundleDigest === ledger.bundleDigest,
      "CA_RELEASE_REVIEW",
    );
    need(
      !m.sourceAuthors.includes(r.reviewer) &&
        !m.checkerAuthors.includes(r.reviewer),
      "CA_AUTHOR_REVIEW",
    );
    need(
      time(r.reviewedAt) >= repo.time(ledger.releaseCommit) &&
        Math.floor(time(r.reviewedAt) / 1000) <=
          repo.time(m.evidenceCommit) / 1000,
      "CA_REVIEW_TIME",
    );
    repo.read(m.evidenceCommit, r.report);
    reviewers.push(r);
  }
  same(reviewers.map((r) => r.role).sort(), ["A11", "A23"], "CA_RELEASE_ROLES");
  unique(reviewers.map((r) => r.reviewer));
  authenticateAdapterArtifacts(repo, m);
  return ledger;
}
export function loadCandidate(repo, m) {
  const c = repo.json(m.evidenceCommit, m.candidate);
  validateSchema("candidate", c);
  need(
    c.sourceCommit === m.sourceCommit && c.sourceTree === m.sourceTree,
    "CA_CANDIDATE_SOURCE",
  );
  same(
    c.files.map((f) => f.path),
    c.files
      .map((f) => f.path)
      .slice()
      .sort(),
    "CA_INVENTORY_ORDER",
  );
  unique(c.files.map((f) => f.path));
  unique(c.removals);
  for (const f of c.files) {
    need(ALLOWED_SOURCE_PATHS.includes(f.path), "CA_SOURCE_SCOPE");
    repo.read(m.sourceCommit, f);
    repo.read(repo.head, f);
  }
  for (const file of c.removals) {
    need(ALLOWED_SOURCE_PATHS.includes(file), "CA_SOURCE_SCOPE");
    repo.blob(m.baseCommit, file);
    repo.absent(m.sourceCommit, file);
    repo.absent(repo.head, file);
  }
  const ownership = {
    path: "coordination/release-intake/owner-pathspecs.json",
  };
  validateOwnershipChange(
    repo.json(m.baseCommit, ownership, false),
    repo.json(m.sourceCommit, ownership),
  );
  const changed = repo.changed(m.baseCommit, m.sourceCommit);
  need(
    changed.every(
      (p) =>
        c.files.some((f) => f.path === p) ||
        c.removals.includes(p) ||
        /^coordination\/session-logs\/[^/]+-pr225-[^/]+\.md$/u.test(p),
    ),
    "CA_SOURCE_DELTA",
  );
  need(
    hash(repo.git("ls-tree", "-r", "-z", m.sourceCommit)) ===
      m.sourceInventoryDigest,
    "CA_SOURCE_INVENTORY",
  );
  const snapshot = repo.json(m.sourceCommit, { path: SNAPSHOT });
  const projection = validateCandidate(c, snapshot, (p) =>
    repo.json(m.sourceCommit, { path: p }),
  );
  for (const a of c.assets) {
    repo.read(m.sourceCommit, a.retained);
    repo.read(repo.head, a.retained);
    repo.read(m.evidenceCommit, a.coverageReport);
    for (const witness of a.witnesses) {
      repo.read(m.sourceCommit, witness.source);
      repo.read(repo.head, witness.source);
      if (witness.kind === "retained-related")
        repo.read(m.baseCommit, witness.source, false);
    }
  }
  return { candidate: c, projection };
}
export function loadDisposition(repo, m, c) {
  const historical = {
    predecessor: { path: PRIOR_REGISTRY, sha256: PRIOR_REGISTRY_SHA },
    p242: { path: HISTORICAL_REGISTRY, sha256: HISTORICAL_REGISTRY_SHA },
    oldProjection: { path: OLD_PROJECTION, sha256: OLD_PROJECTION_SHA },
    arkansas: { path: AR_PACK, sha256: AR_SHA },
  };
  for (const ref of Object.values(historical)) {
    repo.read(ANCHOR, ref, false);
    repo.read(repo.head, ref);
  }
  const prior = repo.json(repo.head, historical.predecessor);
  for (const row of prior.resolutions)
    for (const artifact of [
      row.candidate,
      row.liveProjection,
      ...row.approvalReferences,
    ].filter(Boolean)) {
      const bound = { path: artifact.path, sha256: artifact.rawSha256 };
      repo.read(ANCHOR, bound, false);
      repo.read(repo.head, bound);
    }
  const disposition = repo.json(m.evidenceCommit, m.disposition),
    registry = repo.json(m.evidenceCommit, m.registry);
  validateSchema("disposition", disposition);
  same(
    disposition.predecessorRegistry,
    historical.predecessor,
    "CA_PREDECESSOR",
  );
  same(disposition.historicalRegistry, historical.p242, "CA_HISTORY");
  need(
    disposition.mappingDigest === digest(c.mappings) &&
      disposition.assetsDigest === digest(c.assets),
    "CA_DISPOSITION_BINDING",
  );
  const audit = repo.json(m.evidenceCommit, disposition.audit);
  need(audit.auditDigest === m.runtime.auditDigest, "CA_AUDIT");
  const proof = validateRegistry(
    prior,
    registry,
    disposition,
    digest(c),
    m.sourceCommit,
    audit,
  );
  same(
    m.runtime.compatibility,
    { path: COMPATIBILITY, sha256: COMPATIBILITY_SHA },
    "CA_COMPATIBILITY",
  );
  repo.read(repo.head, m.runtime.compatibility);
  return { registry, disposition, historyDigest: digest(historical), proof };
}
export function loadEvidence(repo, m, c, disposition, historyDigest) {
  const index = repo.json(m.evidenceCommit, m.evidenceIndex);
  validateSchema("index", index);
  same(
    index.entries.map((r) => r.role),
    ROLES,
    "CA_EVIDENCE_ROLES",
  );
  const records = [];
  let baselineFailures;
  for (const { role, record } of index.entries) {
    const e = repo.json(m.evidenceCommit, record);
    need(e.role === role, "CA_EVIDENCE_ROLE");
    validateEvidence(
      e,
      m,
      c,
      digest(disposition),
      historyDigest,
      repo.time(m.checkerReleaseCommit),
      repo.time(m.evidenceCommit),
    );
    repo.read(m.evidenceCommit, e.report);
    const d = e.details;
    if (role === "A18" && d.previous105Review)
      repo.read(m.evidenceCommit, d.previous105Review);
    if (role === "A24")
      baselineFailures = validateInventoryCoverage(
        repo.json(m.evidenceCommit, d.baselineInventory),
        repo.json(m.evidenceCommit, d.currentInventory),
      );
    if (role === "A11")
      for (const test of d.regressions)
        repo.read(m.evidenceCommit, test.report);
    if (role === "A22") {
      const att = repo.json(m.evidenceCommit, d.attestation);
      need(
        att.schemaVersion === 3 &&
          att.candidateSha === m.sourceCommit &&
          att.sourceTreeClean === true &&
          att.sourceTreeStable === true &&
          att.buildId === d.buildId &&
          att.artifactTree?.root === d.artifactRoot,
        "CA_BUILD_ATTESTATION",
      );
      if (d.buildLog) repo.read(m.evidenceCommit, d.buildLog);
    }
    records.push(e);
  }
  unique(
    records
      .filter((e) => ["A18", "A11", "A23"].includes(e.role))
      .map((e) => e.reviewer.sessionId),
  );
  return { records, baselineFailures };
}
export async function validateAttempt(
  root,
  manifestPath,
  { stored = false } = {},
) {
  relative(manifestPath);
  const repo = new Repository(root);
  repo.clean();
  const bytes = repo.read(repo.head, { path: manifestPath }).bytes;
  const m = repo.json(repo.head, { path: manifestPath });
  const execution = validatePhase(repo, m, manifestPath, { stored });
  const ledger = authenticateRelease(repo, m);
  const { candidate: c } = loadCandidate(repo, m);
  const { registry, disposition, historyDigest } = loadDisposition(repo, m, c);
  const evidence = loadEvidence(repo, m, c, disposition, historyDigest);
  const runtime = await observe(repo, m, registry, ledger.dependencies[0], c);
  need(runtime.mappingsDigest === digest(c.mappings), "CA_RUNTIME_MAPPING");
  repo.clean();
  const proof = {
    manifest: { path: manifestPath, sha256: hash(bytes) },
    executionCommit: execution,
    sourceCommit: m.sourceCommit,
    sourceTree: m.sourceTree,
    baseCommit: m.baseCommit,
    checkerReleaseCommit: m.checkerReleaseCommit,
    checkerBundleDigest: m.checkerBundleDigest,
    candidateDigest: digest(c),
    dispositionDigest: digest(disposition),
    registryDigest: digest(registry),
    evidenceDigest: digest(evidence.records),
    runtimeDigest: digest(runtime),
    sourceInventoryDigest: m.sourceInventoryDigest,
    historicalCustodyDigest: historyDigest,
  };
  validateSchema("proof", proof);
  return {
    schemaVersion: "ca-textbook-validation.v1",
    result: "pass",
    proof,
    baselineFailures: evidence.baselineFailures,
    lifecycleState: "shadow_ready",
    liveAllowed: false,
  };
}
