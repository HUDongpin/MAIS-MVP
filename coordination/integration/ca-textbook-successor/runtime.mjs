import { runCapturedObserver } from "./capsule.mjs";
import { need, same, digest, unique } from "./common.mjs";
import { validateCanonicalAudit } from "./audit.mjs";
import { validateSchema } from "./schema.mjs";
import { validateStorageLoaderProof } from "./storage-loader-policy-v1.mjs";
import {
  ROOT,
  SLUGS,
  SNAPSHOT,
  OLD_PROJECTION,
  LESSON_ROOT,
  TARGET,
  ZERO_EFFECTS,
} from "./constants.mjs";
export function validateRuntimeResult(value, m, registry, candidate) {
  need(
    value.result === "pass" &&
      value.sourceCommit === m.sourceCommit &&
      value.policyDigest === m.runtime.policyDigest &&
      value.audit?.auditDigest === m.runtime.auditDigest,
    "CA_RUNTIME_PROOF",
  );
  validateCanonicalAudit(value.audit);
  same(value.audit, registry.expectedCanonicalAudit, "CA_AUDIT_OBSERVATION");
  validateSchema("json-consumers", value.jsonConsumers);
  unique(value.jsonConsumers.map((row) => row.path));
  same(
    value.jsonConsumers.map((row) => row.path),
    value.jsonConsumers.map((row) => row.path).sort(),
    "CA_JSON_CONSUMER_ORDER",
  );
  validateStorageLoaderProof(value.storageLoaderProof);
  need(
    value.rawDetectedLoaders === value.storageLoaderProof.rawDetectedCount &&
      value.reviewedStorageLoaders ===
        value.storageLoaderProof.reviewedStorageCount &&
      value.unregisteredLoaders ===
        value.storageLoaderProof.unclassifiedCount &&
      /^[a-f0-9]{64}$/u.test(value.issuedObservationDigest),
    "CA_STORAGE_RUNTIME_PROOF",
  );
  validateSchema("dependency-resolution", value.dependencyResolution);
  need(
    value.dependencyResolution.checkerReleaseCommit ===
      m.checkerReleaseCommit &&
      value.dependencyResolution.checkerBundleDigest === m.checkerBundleDigest,
    "CA_DEPENDENCY_RESOLUTION",
  );
  same(value.effects, ZERO_EFFECTS, "CA_SIDE_EFFECTS");
  need(
    value.unresolvedImports === 0 && value.unregisteredLoaders === 0,
    "CA_SCAN_BLIND_SPOT",
  );
  const reachable = new Set(value.reachable);
  need(
    !reachable.has(OLD_PROJECTION) && reachable.has(SNAPSHOT),
    "CA_PROJECTION_REACHABILITY",
  );
  for (const slug of SLUGS)
    need(reachable.has(`${LESSON_ROOT}/${slug}.tsx`), "CA_LESSON_REACHABILITY");
  for (const row of registry.resolutions) {
    need(!reachable.has(row.candidate.path), "CA_CANDIDATE_REACHABLE");
    if (row.resolutionId === TARGET) continue;
    if (row.decision === "approved-projection")
      need(reachable.has(row.liveProjection.path), "CA_OTHER_PROJECTION");
    else need(value.correlated[row.resolutionId] === 0, "CA_OTHER_DEREACH");
  }
  const witnesses = candidate.assets.flatMap((asset) => asset.witnesses);
  for (const witness of witnesses) {
    need(
      value.memberships.some(
        (row) =>
          row.kind === witness.kind &&
          row.topicId === witness.topicId &&
          row.lessonId === witness.lessonId,
      ),
      "CA_WITNESS_NOT_MOUNTED",
    );
    need(reachable.has(witness.source.path), "CA_WITNESS_UNREACHABLE");
  }
  return {
    policyDigest: value.policyDigest,
    auditDigest: value.audit.auditDigest,
    jsonConsumerCount: value.jsonConsumers.length,
    jsonConsumerDigest: digest(value.jsonConsumers),
    mappingsDigest: value.mappingsDigest,
    witnessMembershipDigest: digest(
      witnesses.map(({ kind, topicId, lessonId }) => ({
        kind,
        topicId,
        lessonId,
      })),
    ),
    rawDetectedLoaders: value.rawDetectedLoaders,
    reviewedStorageLoaders: value.reviewedStorageLoaders,
    unclassifiedLoaders: value.unregisteredLoaders,
    storageLoaderPartitionDigest: value.storageLoaderProof.partitionDigest,
    issuedObservationDigest: value.issuedObservationDigest,
    dependencyResolutionDigest: digest(value.dependencyResolution),
    retiredProjectionUnreachable: true,
    newLessonCount: 35,
    effects: ZERO_EFFECTS,
  };
}
export async function observe(
  repo,
  m,
  registry,
  expectedDependency,
  candidate,
) {
  const result = await runCapturedObserver(
    repo,
    m,
    registry,
    expectedDependency,
  );
  need(
    result.result === "pass",
    result.code?.startsWith("CA_") ? result.code : "CA_OBSERVER_BLOCKED",
  );
  return validateRuntimeResult(result, m, registry, candidate);
}
