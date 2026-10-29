import test from "node:test";
import assert from "node:assert/strict";
import { SLUGS } from "./constants.mjs";
import { adaptSnapshot } from "./candidate.mjs";
const snapshot = () => ({
  packageId: "ccss-textbook-claude-v1",
  generatedAt: "synthetic",
  generator: "synthetic test only",
  scope: { grades: ["6", "7", "8", "HS"], lessonCount: 35 },
  lessons: SLUGS.map((slug) => ({ slug })),
  practiceBySlug: Object.fromEntries(
    SLUGS.map((slug) => [
      slug,
      Array.from({ length: 3 }, (_, i) => ({
        kind: "numeric",
        prompt: "synthetic",
        answer: i,
        explanation: "synthetic",
      })),
    ]),
  ),
});
test("explicit slug adapter binds exactly35 lessons and105 check objects", () => {
  const p = adaptSnapshot(snapshot());
  assert.deepEqual(p.slugs, SLUGS);
  assert.equal(p.checks.length, 105);
  assert.equal(p.middle.length, 15);
  assert.equal(p.high.length, 20);
});
test("candidate cannot substitute, omit or duplicate a fixed lesson", () => {
  for (const change of [
    (s) => s.lessons.pop(),
    (s) => (s.lessons[0].slug = "foreign"),
    (s) => (s.lessons[0].slug = s.lessons[1].slug),
    (s) => s.practiceBySlug[SLUGS[0]].pop(),
  ]) {
    const s = snapshot();
    change(s);
    assert.throws(() => adaptSnapshot(s));
  }
});
import { validateSchema } from "./schema.mjs";
import {
  canonicalAuditExpectation,
  validateCanonicalAudit,
  strictReachableConsumers,
} from "./audit.mjs";
import { digest, hash, parse } from "./common.mjs";
import {
  validateCandidate,
  validateRegistry,
  validateOwnershipChange,
} from "./candidate.mjs";
import {
  validateEvidence,
  validateInventoryCoverage,
  inventoryRowsDigest,
  BASELINE_FAILURES,
  NEGATIVES,
} from "./evidence.mjs";
import {
  sealReceipt,
  verifyReceiptRecord,
  compareReceipts,
  verifyClosureRecord,
  validateFinalizationProofs,
  sealFinalization,
  verifyFinalizationRecord,
} from "./receipts.mjs";
import { validateRuntimeResult } from "./runtime.mjs";
import {
  ROOT,
  CORE_FILES,
  ROUTES,
  MIDDLE,
  HIGH,
  OLD_IDS,
  OLD_ASSETS,
  META_ROOT,
  LESSON_ROOT,
  SNAPSHOT,
  TARGET,
  ZERO_EFFECTS,
  topicFor,
  PRIOR_REGISTRY,
  PRIOR_REGISTRY_SHA,
} from "./constants.mjs";
import { readFileSync } from "node:fs";
import { classifyReviewedStorageOperations } from "./storage-loader-policy-v1.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const h = "a".repeat(64),
  s = "b".repeat(40),
  tree = "c".repeat(40),
  release = "d".repeat(40),
  execution = "e".repeat(40);
const ref = (p) => ({ path: p, sha256: h });
const bind = (p) => ({ path: p, mode: "100644", objectId: s, sha256: h });
function candidate() {
  const snapshotValue = snapshot();
  snapshotValue.lessons.forEach((r) => (r.topicId = topicFor(r.slug)));
  const c = {
    schemaVersion: "ca-textbook-candidate.v1",
    sourceCommit: s,
    sourceTree: tree,
    slugs: SLUGS,
    checksDigest: adaptSnapshot(snapshotValue).checksDigest,
    files: CORE_FILES.map(bind),
    removals: [],
    mappings: SLUGS.map((slug) => ({
      slug,
      topicId: topicFor(slug),
      primary: true,
    })),
    assets: OLD_ASSETS.map((asset, i) => ({
      oldId: OLD_IDS[i],
      retained: bind(asset),
      witnesses: [
        {
          kind: "new-opener",
          lessonId: MIDDLE[i],
          topicId: topicFor(MIDDLE[i]),
          source: bind(`${LESSON_ROOT}/${MIDDLE[i]}.tsx`),
        },
      ],
      coverageReport: ref(`${ROOT}/synthetic/coverage-${i}.md`),
    })),
  };
  return {
    c,
    snapshotValue,
    meta: (p) => {
      const slug = p.split("/").at(-1).replace(".meta.json", "");
      return {
        slug,
        topicId: topicFor(slug),
        practice: snapshotValue.practiceBySlug[slug],
      };
    },
  };
}
test("closed candidate inventory includes actual snapshot, all metadata, bodies/tests and routes", () => {
  const { c, snapshotValue, meta } = candidate();
  validateSchema("candidate", c);
  validateCandidate(c, snapshotValue, meta);
});
for (const [name, mutate] of [
  [
    "omitted body",
    (c) =>
      (c.files = c.files.filter(
        (f) => f.path !== `${LESSON_ROOT}/${SLUGS[0]}.tsx`,
      )),
  ],
  ["duplicate inventory", (c) => c.files.push(c.files[0])],
  ["wrong mapping", (c) => (c.mappings[0].topicId = "wrong")],
  ["missing retained asset", (c) => c.assets.pop()],
  [
    "duplicate witness",
    (c) => c.assets[0].witnesses.push(c.assets[0].witnesses[0]),
  ],
  ["missing coverage witness", (c) => (c.assets[0].witnesses = [])],
  ["check digest changed", (c) => (c.checksDigest = "f".repeat(64))],
])
  test("candidate rejects " + name, () => {
    const { c, snapshotValue, meta } = candidate();
    const changed = structuredClone(c);
    mutate(changed);
    assert.throws(() => {
      validateSchema("candidate", changed);
      validateCandidate(changed, snapshotValue, meta);
    });
  });
test("metadata parity does not trust aggregate snapshot alone", () => {
  const { c, snapshotValue, meta } = candidate();
  assert.throws(
    () =>
      validateCandidate(c, snapshotValue, (p) => ({
        ...meta(p),
        practice: [],
      })),
    /CA_META_SNAPSHOT_PARITY/,
  );
});
test("closed schema rejects unknown fields, duplicate JSON and unsafe paths", () => {
  const { c } = candidate();
  assert.throws(
    () => validateSchema("candidate", { ...c, liveAllowed: true }),
    /CA_SCHEMA/,
  );
  assert.throws(() => parse(Buffer.from('{"x":1,"x":2}')));
  assert.throws(() => parse(Buffer.from([255])));
});
const prior = () =>
  parse(
    readFileSync(
      new URL(
        "../legacy-successor/attempt-009/inputs/legacy-resolution-registry.v1.json",
        import.meta.url,
      ),
    ),
  );
function disposition() {
  const { c } = candidate(),
    p = prior(),
    audit = canonicalAuditExpectation(),
    d = {
      schemaVersion: "ca-textbook-disposition.v1",
      resolutionId: TARGET,
      candidateDigest: digest(c),
      mappingDigest: digest(c.mappings),
      oldIds: OLD_IDS,
      middleSlugs: MIDDLE,
      additionalHighSlugs: HIGH,
      contentChanged: true,
      baselineOnly: false,
      predecessorRegistry: ref(PRIOR_REGISTRY),
      historicalRegistry: ref("historical.json"),
      audit: ref("audit.json"),
      assetsDigest: digest(c.assets),
      liveAllowed: false,
    };
  const next = structuredClone(p);
  next.schemaVersion = "ca-textbook-registry.v1";
  next.expectedCanonicalAudit = audit;
  next.targetBaselineCommit = s;
  const old = next.resolutions.find((r) => r.resolutionId === TARGET);
  Object.assign(old, {
    decision: "retired-replaced-projection",
    historicalProjection: old.liveProjection,
    liveProjection: null,
    replacement: { candidateDigest: digest(c), mappingDigest: d.mappingDigest },
    enforcement: {
      candidateMustBeUnreachable: true,
      liveProjectionMustBeReachable: false,
      liveAllowed: false,
    },
  });
  return { p, next, d, c, audit };
}
test("only California approved projection is retired; predecessor raw binding retained", () => {
  assert.equal(
    hash(
      readFileSync(
        new URL(
          "../legacy-successor/attempt-009/inputs/legacy-resolution-registry.v1.json",
          import.meta.url,
        ),
      ),
    ),
    PRIOR_REGISTRY_SHA,
  );
  const { p, next, d, c, audit } = disposition();
  assert.deepEqual(validateRegistry(p, next, d, digest(c), s, audit), {
    preservedOtherResolutions: 17,
    preservedOtherApprovedProjections: 2,
    retiredProjectionCount: 1,
  });
});
for (const [name, mutate] of [
  [
    "AR regression",
    (n) =>
      (n.resolutions.find(
        (r) => r.resolutionId === "de-reach-arkansas-g6-g12-questions-v1",
      ).candidate.rawSha256 = h),
  ],
  [
    "second projection removal",
    (n) =>
      (n.resolutions.find(
        (r) => r.decision === "approved-projection",
      ).liveProjection = null),
  ],
  ["ratchet reopened", (n) => (n.ratchet.activeExceptions = ["fake"])],
  ["extra resolution", (n) => n.resolutions.push(n.resolutions[0])],
])
  test("registry rejects " + name, () => {
    const { p, next, d, c, audit } = disposition();
    mutate(next);
    assert.throws(
      () => validateRegistry(p, next, d, digest(c), s, audit),
      /CA_OTHER_REGISTRY_DRIFT/,
    );
  });
function evidence() {
  const { c } = candidate(),
    m = {
      sourceCommit: s,
      sourceTree: tree,
      checkerReleaseCommit: release,
      sourceAuthors: ["author"],
      sourceInventoryDigest: h,
    };
  return {
    c,
    m,
    e: {
      schemaVersion: "ca-textbook-evidence.v1",
      role: "A18",
      reviewer: {
        sessionId: "actual-independent-test-session",
        independence: "independent-review",
      },
      reviewedAt: new Date(Date.now() - 1000).toISOString(),
      sourceCommit: s,
      sourceTree: tree,
      checkerReleaseCommit: release,
      candidateDigest: digest(c),
      report: ref("synthetic-review.md"),
      details: {
        slugs: SLUGS,
        checksDigest: c.checksDigest,
        unresolvedFindings: 0,
        acceptance: "bounded-35-lessons-105-checks",
        previous105Review: null,
        limitations: ["synthetic test record, not real acceptance"],
        humanSignoff: false,
      },
      liveAllowed: false,
    },
  };
}
test("exact A18 scope is all35 lesson identities and105 objects, not a pass-only flag", () => {
  const { c, m, e } = evidence();
  validateEvidence(e, m, c, h, h, Date.now() - 10000, Date.now());
});
for (const [name, change] of [
  ["stale source", (e) => (e.sourceCommit = "f".repeat(40))],
  ["author reviewing own work", (e) => (e.reviewer.sessionId = "author")],
  ["only 105 prior review", (e) => (e.details.slugs = [])],
  ["unresolved QA", (e) => (e.details.unresolvedFindings = 1)],
  ["future review", (e) => (e.reviewedAt = "2999-01-01T00:00:00.000Z")],
  ["unknown role", (e) => (e.role = "A99")],
  ["made-up approval", (e) => (e.result = "pass")],
])
  test("QA rejects " + name, () => {
    const { c, m, e } = evidence();
    change(e);
    assert.throws(() =>
      validateEvidence(e, m, c, h, h, Date.now() - 10000, Date.now()),
    );
  });
function inventories() {
  const references = [
    ...OLD_ASSETS.map((asset) => ({
      assetPath: asset.slice(6),
      manifest: "synthetic-retired",
    })),
    ...Array.from({ length: 224 }, (_, i) => ({
      assetPath: "/synthetic-" + i,
      manifest: "synthetic-other",
    })),
    ...Array.from({ length: 60 }, (_, i) => ({
      assetPath: "/synthetic-" + i,
      manifest: "synthetic-duplicate",
    })),
  ];
  const base = {
    schemaVersion: 6,
    provenance: {
      contract: "math-diagram-source-graph-v1",
      generator: "scripts/audit-math-diagram-inventory.ts",
      inputRoots: ["app", "components", "data", "public"],
    },
    summary: {
      liveAssetReferenceCount: 299,
      uniqueLiveAssetCount: 239,
      ccssLessonCount: 1,
    },
    failures: [...BASELINE_FAILURES],
    lessonRoutes: SLUGS.map((slug) => ({
      topicId: topicFor(slug),
      interactiveLessonIds: [],
    })),
    ccssLessons: [{ lessonId: "synthetic-existing" }],
    practiceFigures: [],
    visualizationLabs: [],
    signatureBenches: [],
    liveAssetReferences: references,
    publicSvgAssets: [],
    standaloneDiagramRoutes: [
      {
        id: "california-middle-school-textbook",
        interaction: "replacement-textbook-images",
      },
    ],
    sourceSurfaces: [{ file: "synthetic-existing" }],
  };
  const next = structuredClone(base);
  next.summary = {
    liveAssetReferenceCount: 284,
    uniqueLiveAssetCount: 224,
    ccssLessonCount: 36,
  };
  next.liveAssetReferences = references.slice(15);
  next.failures.push(
    "inventory coverage liveAssetReferenceCount shrank below reviewed baseline 299: 284",
    "inventory coverage uniqueLiveAssetCount shrank below reviewed baseline 239: 224",
  );
  next.ccssLessons.push(
    ...SLUGS.map((lessonId) => ({
      lessonId,
      sourceFile: LESSON_ROOT + "/" + lessonId + ".tsx",
      liveMountCount: 1,
      inlineSvgCount: 1,
      missingExplicitButtonTypeCount: 0,
      sideEffectSignalCount: 0,
    })),
  );
  next.sourceSurfaces.push(
    ...SLUGS.map((slug) => ({ file: LESSON_ROOT + "/" + slug + ".tsx" })),
  );
  next.lessonRoutes = SLUGS.map((slug) => ({
    topicId: topicFor(slug),
    interactiveLessonIds: [slug],
  }));
  next.standaloneDiagramRoutes[0].interaction = "interactive-ccss-lessons";
  for (const report of [base, next])
    report.provenance.discoveredRowDigestSha256 = inventoryRowsDigest(report);
  return { base, next };
}
test("global inventory preserves eight baseline failures and exact fifteen retired references", () => {
  const { base, next } = inventories();
  assert.equal(
    validateInventoryCoverage(base, next).globalInventoryPassed,
    false,
  );
});
for (const [name, mutate] of [
  ["hidden baseline failure", (r) => r.failures.shift()],
  ["forged count", (r) => r.summary.liveAssetReferenceCount++],
  [
    "other asset replaced",
    (r) =>
      (r.liveAssetReferences[0] = {
        assetPath: "/foreign",
        manifest: "synthetic",
      }),
  ],
  ["other lesson changed", (r) => (r.ccssLessons[0].extra = true)],
  ["new figure omitted", (r) => (r.ccssLessons[1].inlineSvgCount = 0)],
  [
    "route missing new opener",
    (r) => (r.lessonRoutes[0].interactiveLessonIds = []),
  ],
  ["other surface changed", (r) => (r.sourceSurfaces[0].extra = true)],
  [
    "replacement lesson missing",
    (r) => {
      r.ccssLessons.pop();
      r.summary.ccssLessonCount--;
    },
  ],
])
  test("inventory rejects rehashed " + name, () => {
    const { base, next } = inventories();
    mutate(next);
    next.provenance.discoveredRowDigestSha256 = inventoryRowsDigest(next);
    assert.throws(() => validateInventoryCoverage(base, next));
  });
const proof = () => ({
  manifest: ref(`${ROOT}/attempts/ca-textbook-test/manifest.json`),
  executionCommit: execution,
  sourceCommit: s,
  sourceTree: tree,
  baseCommit: "1".repeat(40),
  checkerReleaseCommit: release,
  checkerBundleDigest: h,
  candidateDigest: h,
  dispositionDigest: h,
  registryDigest: h,
  evidenceDigest: h,
  runtimeDigest: h,
  sourceInventoryDigest: h,
  historicalCustodyDigest: h,
});
test("three distinct non-live receipts compare with stable semantics", () => {
  const p = proof(),
    receipts = ["canonical-test", "fresh-test", "replay-test"].map((id) =>
      sealReceipt(p, id, h),
    );
  assert.equal(compareReceipts(receipts, p).distinctExecutions, 3);
});
for (const [name, mutate] of [
  ["network side effect", (r) => (r.effects.network = 1)],
  ["live permission", (r) => (r.liveAllowed = true)],
  ["wrong source", (r) => (r.binding.sourceCommit = "f".repeat(40))],
  ["incomplete rollback", (r) => (r.rehearsal.rollbackComplete = false)],
  ["future time", (r) => (r.producedAt = "2999-01-01T00:00:00.000Z")],
])
  test("receipt rejects rehashed " + name, () => {
    const p = proof(),
      r = sealReceipt(p, "synthetic-run", h);
    mutate(r);
    r.semanticDigest = digest({
      binding: r.binding,
      effects: r.effects,
      rehearsal: r.rehearsal,
      lifecycleState: r.lifecycleState,
      liveAllowed: r.liveAllowed,
    });
    delete r.rawDigest;
    r.rawDigest = digest(r);
    assert.throws(() => verifyReceiptRecord(r, p));
  });
test("missing or duplicated execution is not a replay", () => {
  const p = proof(),
    r = sealReceipt(p, "synthetic-run", h);
  assert.throws(() => compareReceipts([r, r], p), /CA_RECEIPT_COVERAGE/);
  assert.throws(() => compareReceipts([r, r, r], p), /CA_DUPLICATE/);
});
test("a digest alone cannot authenticate a closure", () => {
  const closure = {
    schemaVersion: "ca-textbook-closure.v1",
    binding: proof(),
    receipts: [1, 2, 3].map((i) => ({
      path: "receipt" + i + ".json",
      storageCommit: s,
      sha256: h,
    })),
    receiptHashes: [h, h, h],
    finalizationEvidenceDigest: h,
    mainCommit: s,
    finalizationCommit: "9".repeat(40),
    sourceCurrent: true,
    lifecycleState: "shadow_passed",
    liveAllowed: false,
  };
  closure.closureDigest = digest(closure);
  assert.equal(verifyClosureRecord(closure, closure), true);
  const other = { ...closure, mainCommit: release };
  delete other.closureDigest;
  other.closureDigest = digest(other);
  assert.throws(() => verifyClosureRecord(other, closure), /CA_CLOSURE_FORGED/);
});
test("runtime rejects missing retirement, missing replacement or blindspots", () => {
  const { next } = disposition(),
    m = {
      sourceCommit: s,
      runtime: {
        policyDigest: h,
        auditDigest: next.expectedCanonicalAudit.auditDigest,
      },
    },
    value = {
      result: "pass",
      sourceCommit: s,
      policyDigest: h,
      audit: next.expectedCanonicalAudit,
      jsonConsumers: [ref("package.json")],
      reachable: [
        SNAPSHOT,
        ...SLUGS.map((x) => `${LESSON_ROOT}/${x}.tsx`),
        ...next.resolutions
          .filter((r) => r.decision === "approved-projection")
          .map((r) => r.liveProjection.path),
      ],
      correlated: Object.fromEntries(
        next.resolutions.map((r) => [r.resolutionId, 0]),
      ),
      unresolvedImports: 0,
      unregisteredLoaders: 0,
      mappingsDigest: h,
      effects: { ...ZERO_EFFECTS },
    };
  const profile = parse(
    readFileSync(new URL("./storage-loader-profile.v1.json", import.meta.url)),
  );
  value.storageLoaderProof = classifyReviewedStorageOperations(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."),
    profile.operations.map(
      ({ kind, callee, position, normalizedExpressionDigest }) => ({
        sourcePath: profile.source.path,
        sourceRawSha256: profile.source.sha256,
        kind,
        callee,
        position,
        normalizedExpressionDigest,
      }),
    ),
    profile.parserVersion,
  );
  m.checkerReleaseCommit = release;
  m.checkerBundleDigest = h;
  value.dependencyResolution = {
    schemaVersion: "ca-dependency-resolution.v1",
    strategy: "explicit-captured-file-url",
    entryRelativePath: "node_modules/typescript/lib/typescript.js",
    entrySha256: h,
    dependencyTreeDigest: h,
    version: "5.8.3",
    checkerReleaseCommit: release,
    checkerBundleDigest: h,
    entryExecuted: true,
    sourceSnapshotExecuted: false,
    codeAndDataSeparated: true,
  };
  value.issuedObservationDigest = h;
  value.rawDetectedLoaders = 4;
  value.reviewedStorageLoaders = 4;
  const { c } = candidate();
  value.memberships = SLUGS.map((lessonId) => ({
    kind: "new-opener",
    lessonId,
    topicId: topicFor(lessonId),
  }));
  validateRuntimeResult(value, m, next, c);
  for (const change of [
    (v) =>
      v.reachable.push(
        "data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json",
      ),
    (v) => v.reachable.splice(v.reachable.indexOf(SNAPSHOT), 1),
    (v) => (v.unresolvedImports = 1),
    (v) =>
      (v.memberships = v.memberships.filter(
        (row) => row.lessonId !== MIDDLE[0],
      )),
    (v) => (v.effects.database = 1),
  ]) {
    const v = structuredClone(value);
    change(v);
    assert.throws(() => validateRuntimeResult(v, m, next, c));
  }
});
test("lifecycle output recomputes closure and two immutable registry events", () => {
  const closure = {
    schemaVersion: "ca-textbook-closure.v1",
    binding: proof(),
    receipts: [1, 2, 3].map((i) => ({
      path: "synthetic-" + i + ".json",
      storageCommit: s,
      sha256: h,
    })),
    receiptHashes: [h, h, h],
    finalizationEvidenceDigest: h,
    mainCommit: s,
    finalizationCommit: "9".repeat(40),
    sourceCurrent: true,
    lifecycleState: "shadow_passed",
    liveAllowed: false,
  };
  closure.closureDigest = digest(closure);
  const expected = sealFinalization(closure);
  assert.equal(verifyFinalizationRecord(expected, expected), true);
  const changed = structuredClone(expected);
  changed.registry.events[1].previousEventDigest = "0".repeat(64);
  delete changed.registry.events[1].eventDigest;
  changed.registry.events[1].eventDigest = digest(changed.registry.events[1]);
  delete changed.registry.registryDigest;
  changed.registry.registryDigest = digest(changed.registry);
  assert.throws(
    () => verifyFinalizationRecord(changed, expected),
    /CA_FINALIZATION_FORGED/,
  );
});
function finalizationFixture() {
  const p = proof(),
    finalHead = "9".repeat(40),
    mainHead = "8".repeat(40),
    releaseHead = "7".repeat(40),
    storage = "6".repeat(40),
    prefix = ROOT + "/attempts/ca-textbook-test";
  const files = [
    ".github/workflows/promotion-shadow.yml",
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
  ].map(bind);
  const transports = [
    "canonical-receipt.json",
    "receipts/fresh.json",
    "receipts/replay.json",
  ].map((path) => ({
    path: prefix + "/" + path,
    storageCommit: storage,
    sha256: h,
  }));
  const input = {
    schemaVersion: "ca-textbook-finalization.v1",
    manifestPath: p.manifest.path,
    receipts: transports,
    evidence: ["A11", "A22", "A23", "A25"].map((role) =>
      ref(prefix + "/finalization/" + role + ".json"),
    ),
    prProof: ref(prefix + "/finalization/pr.json"),
    mainProof: ref(prefix + "/finalization/main.json"),
    liveAllowed: false,
    releaseCommit: releaseHead,
    releaseInventoryDigest: digest(files),
    releaseFiles: files,
  };
  const receiptRecords = [
    "canonical-synthetic",
    "fresh-synthetic",
    "replay-synthetic",
  ].map((runId) => {
    const value = sealReceipt(p, runId, h);
    value.producedAt = "2026-10-01T00:00:00.000Z";
    delete value.rawDigest;
    value.rawDigest = digest(value);
    return value;
  });
  const receiptBlobs = Object.fromEntries(
    transports.map((t, i) => {
      const bytes = Buffer.from(JSON.stringify(receiptRecords[i]));
      t.sha256 = hash(bytes);
      return [
        t.path,
        { path: t.path, mode: "100644", objectId: s, sha256: t.sha256, bytes },
      ];
    }),
  );
  const documents = {};
  for (const [i, ref] of input.evidence.entries()) {
    const role = ["A11", "A22", "A23", "A25"][i];
    documents[ref.path] = {
      schemaVersion: "ca-textbook-finalization-evidence.v1",
      role,
      reviewer: "synthetic-" + role,
      reviewedAt: "2026-10-01T00:00:01.000Z",
      executionCommit: p.executionCommit,
      receiptHashes: transports.map((t) => t.sha256),
      report: { path: prefix + "/finalization/" + role + ".md", sha256: h },
      result: "approved-nonlive-finalization",
      liveAllowed: false,
      releaseCommit: releaseHead,
      releaseInventoryDigest: input.releaseInventoryDigest,
    };
  }
  const names = [
    "snapshot",
    "validate",
    "postgres-integration",
    "visualization-browser",
    "teacher-notice-outbox-postgres16",
    "resend-webhook-postgres-integration",
    "teacher-parent-e2e",
    "promotion-shadow-gate",
  ];
  for (const [ref, event, head] of [
    [input.prProof, "pull_request", releaseHead],
    [input.mainProof, "push", mainHead],
  ])
    documents[ref.path] = {
      schemaVersion: "ca-textbook-ci-proof.v1",
      repository: "HUDongpin/MAIS-MVP",
      event,
      pullRequestNumber: event === "pull_request" ? 304 : null,
      head,
      base: p.baseCommit,
      checks: names.map((name) => ({
        name,
        conclusion: "success",
        head,
        runId: 1,
      })),
      liveAllowed: false,
      observedAt: "2026-10-01T00:00:01.000Z",
    };
  const storedPaths = [
    prefix + "/finalization-input.json",
    ...Object.keys(documents),
    ...input.evidence.map((ref) => documents[ref.path].report.path),
  ].sort();
  const repo = {
    head: finalHead,
    ancestor() {},
    time: (ref) =>
      Date.parse(
        ref === finalHead
          ? "2026-10-01T00:00:03.000Z"
          : "2026-10-01T00:00:00.000Z",
      ),
    changed: (a, b) =>
      a === p.executionCommit
        ? (b === storage
            ? transports.map((t) => t.path)
            : [...files.map((f) => f.path), ...transports.map((t) => t.path)]
          ).sort()
        : storedPaths,
    absent() {},
    entries: () => transports.map((t) => receiptBlobs[t.path]),
    read: (head, ref) => receiptBlobs[ref.path],
    blob: (head, file) => receiptBlobs[file] ?? { objectId: s },
    json: (head, ref) =>
      structuredClone(
        documents[ref.path] ??
          receiptRecords[transports.findIndex((t) => t.path === ref.path)],
      ),
    parents: () => [p.baseCommit, releaseHead],
    tree: () => tree,
  };
  return {
    repo,
    input,
    p,
    documents,
    receipts: receiptRecords,
    m: {
      canonicalReceiptPath: prefix + "/canonical-receipt.json",
      sourceAuthors: ["synthetic-author"],
      checkerAuthors: ["synthetic-checker-author"],
    },
  };
}
test("finalization validates complete records against exact release and main composition", () => {
  const { repo, input, p, m, receipts } = finalizationFixture();
  assert.equal(
    validateFinalizationProofs(repo, input, p, receipts, m).mainCommit,
    "8".repeat(40),
  );
});
for (const [name, mutate] of [
  [
    "missing activation",
    (f) => {
      f.input.releaseFiles = [];
      f.input.releaseInventoryDigest = digest([]);
      f.repo.changed = () => [];
    },
  ],
  [
    "extra runtime activation",
    (f) => {
      f.input.releaseFiles.push(bind("app/foreign/page.tsx"));
      f.input.releaseInventoryDigest = digest(f.input.releaseFiles);
      f.repo.changed = () => f.input.releaseFiles.map((x) => x.path).sort();
    },
  ],
  ["wrong main parent", (f) => (f.repo.parents = () => [f.p.baseCommit])],
  [
    "wrong main tree",
    (f) => (f.repo.tree = (ref) => (ref === "8".repeat(40) ? "wrong" : tree)),
  ],
  ["missing CI check", (f) => f.documents[f.input.prProof.path].checks.pop()],
  [
    "CI wrong head",
    (f) => (f.documents[f.input.prProof.path].checks[0].head = s),
  ],
  [
    "wrong CI repository",
    (f) => (f.documents[f.input.prProof.path].repository = "other/repo"),
  ],
  [
    "future CI record",
    (f) =>
      (f.documents[f.input.prProof.path].observedAt =
        "2999-01-01T00:00:00.000Z"),
  ],
  ["missing finalization role", (f) => f.input.evidence.pop()],
  [
    "duplicated independent reviewer",
    (f) =>
      (f.documents[f.input.evidence[2].path].reviewer =
        f.documents[f.input.evidence[0].path].reviewer),
  ],
  [
    "author as reviewer",
    (f) =>
      (f.documents[f.input.evidence[0].path].reviewer = "synthetic-author"),
  ],
  [
    "checker author as reviewer",
    (f) =>
      (f.documents[f.input.evidence[0].path].reviewer =
        "synthetic-checker-author"),
  ],
  [
    "report outside own attempt",
    (f) =>
      (f.documents[f.input.evidence[0].path].report.path =
        "historic/approval.md"),
  ],
  [
    "extra finalization source change",
    (f) => {
      const previous = f.repo.changed;
      f.repo.changed = (a, b) =>
        a === f.p.executionCommit
          ? previous(a, b)
          : [...previous(a, b), "app/foreign/page.tsx"];
    },
  ],
  [
    "checker drift at storage",
    (f) =>
      (f.repo.blob = (ref) => ({
        objectId: ref === f.repo.head ? "0".repeat(40) : s,
      })),
  ],
])
  test("finalization rejects " + name, () => {
    const f = finalizationFixture();
    mutate(f);
    assert.throws(() =>
      validateFinalizationProofs(f.repo, f.input, f.p, f.receipts, f.m),
    );
  });

test("retirement coverage supports multiple retained related lessons without a positional bijection", () => {
  const { c, snapshotValue, meta } = candidate();
  const coverage = c.assets[10];
  coverage.witnesses = [
    {
      kind: "retained-related",
      lessonId: "rational-irrational",
      topicId: topicFor(MIDDLE[10]),
      source: bind(LESSON_ROOT + "/rational-irrational.tsx"),
    },
    {
      kind: "retained-related",
      lessonId: "approximate-irrationals",
      topicId: topicFor(MIDDLE[10]),
      source: bind(LESSON_ROOT + "/approximate-irrationals.tsx"),
    },
  ];
  validateSchema("candidate", c);
  validateCandidate(c, snapshotValue, meta);
  assert.equal(coverage.witnesses.length, 2);
});
test("a related witness cannot masquerade as a new opener or point to a different body", () => {
  for (const mutate of [
    (w) => (w.kind = "retained-related"),
    (w) => (w.source.path = LESSON_ROOT + "/foreign.tsx"),
    (w) => (w.topicId = "not-a-registered-middle-topic"),
  ]) {
    const { c, snapshotValue, meta } = candidate();
    mutate(c.assets[0].witnesses[0]);
    assert.throws(() => validateCandidate(c, snapshotValue, meta));
  }
});
test("ownership correction is restricted to the two A05 mappings and resolution checks", () => {
  const before = {
      packages: [
        {
          id: "A05-lessons",
          owner: "A05",
          pathspecs: ["data/lessons.ts", "data/*Lessons.ts"],
        },
      ],
      resolutionChecks: [],
      other: "preserved",
    },
    after = structuredClone(before);
  after.packages[0].pathspecs.splice(
    1,
    0,
    "data/ccssLessonAssignments.ts",
    "data/ccssTextbookRegistry.ts",
  );
  after.resolutionChecks.push(
    { path: "data/ccssLessonAssignments.ts", expectedOwner: "A05" },
    { path: "data/ccssTextbookRegistry.ts", expectedOwner: "A05" },
  );
  validateOwnershipChange(before, after);
  after.other = "drift";
  assert.throws(
    () => validateOwnershipChange(before, after),
    /CA_OWNERSHIP_DELTA/,
  );
});

for (const [name, mutate] of [
  [
    "extra direct conflict",
    (a) => {
      a.directConflictCount++;
      a.newConflictCount++;
      a.reachableCandidateLikeCount++;
    },
  ],
  [
    "extra correlated conflict",
    (a) => {
      a.correlatedConflictCount++;
      a.newConflictCount++;
      a.reachableCandidateLikeCount++;
    },
  ],
  [
    "extra opaque conflict",
    (a) => {
      a.opaqueConflictCount++;
      a.ambiguousConflictCount++;
      a.reachableCandidateLikeCount++;
    },
  ],
  [
    "copied digest with falsified count",
    (a) => {
      a.directConflictCount++;
    },
  ],
])
  test("A23-R3 rejects " + name, () => {
    const { p, next, d, c, audit } = disposition();
    mutate(audit);
    if (!name.startsWith("copied")) {
      const { auditDigest, ...body } = audit;
      audit.auditDigest = digest(body);
    }
    next.expectedCanonicalAudit = audit;
    assert.throws(() => validateRegistry(p, next, d, digest(c), s, audit));
  });
for (const latest of ["release", "main", "pr-ci", "main-ci"])
  test("A23-R4 review cannot predate " + latest, () => {
    const f = finalizationFixture(),
      at = Date.parse("2026-10-01T00:00:00.000Z");
    f.repo.time = (ref) =>
      ref === f.repo.head
        ? at + 5000
        : (latest === "release" && ref === f.input.releaseCommit) ||
            (latest === "main" && ref === "8".repeat(40))
          ? at + 2000
          : at;
    for (const key of [f.input.prProof.path, f.input.mainProof.path])
      f.documents[key].observedAt =
        latest === "release" || latest === "main"
          ? "2026-10-01T00:00:03.000Z"
          : key ===
              (latest === "pr-ci"
                ? f.input.prProof.path
                : f.input.mainProof.path)
            ? "2026-10-01T00:00:02.000Z"
            : "2026-10-01T00:00:01.000Z";
    assert.throws(
      () => validateFinalizationProofs(f.repo, f.input, f.p, f.receipts, f.m),
      /CA_FINAL_EVIDENCE_TIME/,
    );
  });

test("CI records identify PR304 and use null for the main push", () => {
  const f = finalizationFixture();
  validateSchema("ci-proof", {
    ...f.documents[f.input.prProof.path],
    pullRequestNumber: 304,
  });
  validateSchema("ci-proof", {
    ...f.documents[f.input.mainProof.path],
    pullRequestNumber: null,
  });
});

for (const [field, value] of [
  ["correlatedConflictDigest", "f".repeat(64)],
  ["opaqueConflictDigest", "f".repeat(64)],
  ["candidateSetDigest", "f".repeat(64)],
  ["opaqueConflictCount", 0],
])
  test("A23-R3 rejects same-scope identity/ambiguity drift in " + field, () => {
    const audit = canonicalAuditExpectation();
    audit[field] = value;
    delete audit.auditDigest;
    audit.auditDigest = digest(audit);
    assert.throws(() => validateCanonicalAudit(audit), /CA_AUDIT_TRANSITION/);
  });
test("finalization cannot use a different PR with the same head or a PR number on main", () => {
  for (const key of ["prProof", "mainProof"]) {
    const f = finalizationFixture();
    f.documents[f.input[key].path].pullRequestNumber =
      key === "prProof" ? null : 304;
    assert.throws(
      () => validateFinalizationProofs(f.repo, f.input, f.p, f.receipts, f.m),
      /CA_PR_BINDING|CA_MAIN_BINDING/,
    );
  }
});

// Regression fixture from the authenticated R1 observer on real source 98d086c8.
const actualSourceRetirementAudit = {
  "schemaVersion": "promotion-legacy-conflict-union-audit.v1",
  "candidateLikeCount": 37,
  "candidateSetDigest": "6e8cbaea92a7fa4f50d7efbe95849171381624ab553a1eacdea53dd55490f84f",
  "directConflictCount": 0,
  "directConflictDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "correlatedConflictCount": 2,
  "correlatedConflictDigest": "53083f06ab5692aa0e4c1e56722ac67b499069436866c334f6f63c2799cfa48f",
  "ambiguousConflictCount": 3,
  "ambiguousConflictDigest": "2b2247bf2672d0d5d4580d5d529843e682024f0a1fa716c5382298322cc0d2d3",
  "reachableCandidateLikeCount": 5,
  "knownConflictCount": 0,
  "newConflictCount": 2,
  "opaqueConflictCount": 3,
  "reachableConflictDigest": "1dccdfb7852a43ed7c793b9dc5c7b2a14e0a66b15f02009f6eeb1f54da0c39ef",
  "newConflictDigest": "53083f06ab5692aa0e4c1e56722ac67b499069436866c334f6f63c2799cfa48f",
  "opaqueConflictDigest": "2b2247bf2672d0d5d4580d5d529843e682024f0a1fa716c5382298322cc0d2d3",
  "secondaryBlockedCondition": {
    "code": "LEGACY_DISCOVERY_INCOMPLETE",
    "conflictCount": 3,
    "conflictDigest": "2b2247bf2672d0d5d4580d5d529843e682024f0a1fa716c5382298322cc0d2d3"
  },
  "auditDigest": "b20edcfbfd4ea4a09243e467128a4c54ecb8c363faa93fc022fa571904120df4"
};
test("actual Linux source retirement retains the exact legacy comment marker", () => {
  assert.doesNotThrow(() => validateCanonicalAudit(actualSourceRetirementAudit));
  assert.equal(canonicalAuditExpectation("before").auditDigest, "e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91");
});
test("actual Linux source retirement cannot suppress the marker or change opaque identity", () => {
  for (const field of ["opaqueConflictDigest", "ambiguousConflictDigest", "reachableConflictDigest"]) {
    const drift = structuredClone(actualSourceRetirementAudit);
    drift[field] = "f".repeat(64);
    delete drift.auditDigest; drift.auditDigest = digest(drift);
    assert.throws(() => validateCanonicalAudit(drift), /CA_AUDIT_TRANSITION/);
  }
  const suppressed = structuredClone(actualSourceRetirementAudit);
  suppressed.opaqueConflictCount = 2; suppressed.ambiguousConflictCount = 2;
  delete suppressed.auditDigest; suppressed.auditDigest = digest(suppressed);
  assert.throws(() => validateCanonicalAudit(suppressed), /CA_AUDIT_TRANSITION/);
});
