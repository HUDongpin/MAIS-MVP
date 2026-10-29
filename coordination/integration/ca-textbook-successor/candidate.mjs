import {
  SLUGS,
  MIDDLE,
  HIGH,
  SNAPSHOT,
  META_ROOT,
  LESSON_ROOT,
  CORE_FILES,
  OLD_IDS,
  OLD_ASSETS,
  topicFor,
  TARGET,
} from "./constants.mjs";
import { need, same, digest, unique } from "./common.mjs";
import { validateCanonicalAudit } from "./audit.mjs";
export function adaptSnapshot(snapshot) {
  need(
    snapshot?.packageId === "ccss-textbook-claude-v1" &&
      Array.isArray(snapshot.lessons),
    "CA_CANDIDATE",
  );
  const slugs = snapshot.lessons.map((r) => r?.slug);
  unique(slugs);
  same([...slugs].sort(), SLUGS, "CA_SLUGS");
  same(Object.keys(snapshot.practiceBySlug ?? {}).sort(), SLUGS, "CA_CHECKS");
  const checks = SLUGS.flatMap((slug) => {
    const rows = snapshot.practiceBySlug[slug];
    need(Array.isArray(rows) && rows.length === 3, "CA_CHECKS");
    return rows.map((q, i) => {
      need(
        q &&
          ["numeric", "mc"].includes(q.kind) &&
          typeof q.prompt === "string" &&
          q.prompt.length > 0 &&
          typeof q.explanation === "string" &&
          Object.hasOwn(q, "answer"),
        "CA_CHECKS",
      );
      return { id: `${slug}-check-${i + 1}`, digest: digest(q) };
    });
  });
  return {
    slugs: SLUGS,
    middle: MIDDLE,
    high: HIGH,
    checks,
    checksDigest: digest(checks),
  };
}
export function validateCandidate(c, snapshot, readJson) {
  const p = adaptSnapshot(snapshot);
  same(c.slugs, SLUGS, "CA_SLUGS");
  need(c.checksDigest === p.checksDigest, "CA_CHECKS_DIGEST");
  const paths = c.files.map((f) => f.path);
  unique(paths);
  for (const f of CORE_FILES) need(paths.includes(f), "CA_INVENTORY_MISSING");
  need(
    paths.every(
      (p) =>
        !p.endsWith(".env") &&
        !p.includes("/node_modules/") &&
        !p.startsWith(".git/"),
    ),
    "CA_INVENTORY_PATH",
  );
  same(
    c.mappings,
    SLUGS.map((slug) => ({ slug, topicId: topicFor(slug), primary: true })),
    "CA_MAPPING",
  );
  for (const slug of SLUGS) {
    const meta = readJson(`${META_ROOT}/${slug}.meta.json`);
    need(meta.slug === slug && meta.topicId === topicFor(slug), "CA_METADATA");
    same(
      meta.practice,
      snapshot.practiceBySlug[slug],
      "CA_META_SNAPSHOT_PARITY",
    );
    const row = snapshot.lessons.find((x) => x.slug === slug);
    need(row.topicId === meta.topicId, "CA_METADATA");
  }
  same(
    c.assets.map((x) => x.retained.path),
    OLD_ASSETS,
    "CA_ASSETS",
  );
  for (const [i, a] of c.assets.entries()) {
    need(a.oldId === OLD_IDS[i], "CA_ASSET_MAPPING");
    need(
      Array.isArray(a.witnesses) && a.witnesses.length > 0,
      "CA_COVERAGE_MISSING",
    );
    unique(a.witnesses.map((w) => w.topicId + "/" + w.lessonId));
    for (const witness of a.witnesses) {
      need(MIDDLE.map(topicFor).includes(witness.topicId), "CA_WITNESS_TOPIC");
      need(
        /^[a-z0-9][a-z0-9-]{1,95}$/u.test(witness.lessonId) &&
          witness.source.path === `${LESSON_ROOT}/${witness.lessonId}.tsx`,
        "CA_WITNESS_SOURCE",
      );
      if (witness.kind === "new-opener") {
        need(
          MIDDLE.includes(witness.lessonId) &&
            witness.topicId === topicFor(witness.lessonId),
          "CA_WITNESS_OPENER",
        );
        same(
          witness.source,
          c.files.find((f) => f.path === witness.source.path),
          "CA_WITNESS_BYTES",
        );
      } else
        need(
          witness.kind === "retained-related" &&
            !SLUGS.includes(witness.lessonId),
          "CA_WITNESS_RELATED",
        );
    }
  }
  return p;
}
export function validateRegistry(
  prior,
  next,
  disposition,
  candidateDigest,
  sourceCommit,
  canonicalAudit,
) {
  need(prior.resolutions.length === 18, "CA_PRIOR_REGISTRY");
  const old = prior.resolutions.find((r) => r.resolutionId === TARGET);
  need(old?.decision === "approved-projection", "CA_PRIOR_DISPOSITION");
  const expected = structuredClone(prior);
  expected.schemaVersion = "ca-textbook-registry.v1";
  expected.targetBaselineCommit = sourceCommit;
  const index = expected.resolutions.findIndex(
    (r) => r.resolutionId === TARGET,
  );
  expected.resolutions[index] = {
    ...old,
    decision: "retired-replaced-projection",
    liveProjection: null,
    historicalProjection: old.liveProjection,
    replacement: { candidateDigest, mappingDigest: disposition.mappingDigest },
    enforcement: {
      candidateMustBeUnreachable: true,
      liveProjectionMustBeReachable: false,
      liveAllowed: false,
    },
  };
  validateCanonicalAudit(prior.expectedCanonicalAudit, "before");
  validateCanonicalAudit(canonicalAudit, "after");
  expected.expectedCanonicalAudit = canonicalAudit;
  same(next, expected, "CA_OTHER_REGISTRY_DRIFT");
  need(
    disposition.resolutionId === TARGET &&
      disposition.candidateDigest === candidateDigest &&
      disposition.contentChanged === true &&
      disposition.baselineOnly === false,
    "CA_DISPOSITION",
  );
  same(disposition.oldIds, OLD_IDS, "CA_OLD_IDS");
  same(disposition.middleSlugs, MIDDLE, "CA_REPLACEMENT_IDS");
  same(disposition.additionalHighSlugs, HIGH, "CA_HIGH_IDS");
  need(
    prior.resolutions.filter((r) => r.decision === "approved-projection")
      .length === 3,
    "CA_PRIOR_REGISTRY",
  );
  return {
    preservedOtherResolutions: 17,
    preservedOtherApprovedProjections: 2,
    retiredProjectionCount: 1,
  };
}

export function validateOwnershipChange(before, after) {
  const expected = structuredClone(before),
    owner = expected.packages.find((row) => row.id === "A05-lessons");
  need(owner?.owner === "A05", "CA_OWNERSHIP_BASE");
  const slot = owner.pathspecs.indexOf("data/lessons.ts");
  need(slot >= 0, "CA_OWNERSHIP_BASE");
  owner.pathspecs.splice(
    slot + 1,
    0,
    "data/ccssLessonAssignments.ts",
    "data/ccssTextbookRegistry.ts",
  );
  expected.resolutionChecks.unshift(
    { path: "data/ccssLessonAssignments.ts", expectedOwner: "A05" },
    { path: "data/ccssTextbookRegistry.ts", expectedOwner: "A05" },
  );
  same(after, expected, "CA_OWNERSHIP_DELTA");
}
