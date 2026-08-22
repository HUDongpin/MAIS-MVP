import { createHash } from "node:crypto";

export const CHINA_VISUALIZATION_STATE_BUDGET_POLICY = Object.freeze({
  id: "china-visualization-state-budget-v1",
  minimumPackageTimeoutMs: 180_000,
  packageSetupBudgetMs: 60_000,
  perLabBudgetMs: 60_000,
  perStateBudgetMs: 1_250,
  schemaVersion: 1
});

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertUniqueNonEmptyStrings(label, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }
  if (values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new TypeError(`${label} must contain only non-empty strings.`);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${label} must not contain duplicates.`);
  }
}

export function chinaVisualizationPackageTimeoutMs({ labCount, stateCount }) {
  if (!Number.isInteger(labCount) || labCount <= 0) {
    throw new TypeError(`labCount must be a positive integer; received ${String(labCount)}.`);
  }
  if (!Number.isInteger(stateCount) || stateCount <= 0) {
    throw new TypeError(`stateCount must be a positive integer; received ${String(stateCount)}.`);
  }
  const policy = CHINA_VISUALIZATION_STATE_BUDGET_POLICY;
  return Math.max(
    policy.minimumPackageTimeoutMs,
    policy.packageSetupBudgetMs +
      labCount * policy.perLabBudgetMs +
      stateCount * policy.perStateBudgetMs
  );
}

export function buildChinaVisualizationStateBudgetManifest(packages) {
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new TypeError("State-budget preflight requires at least one deterministic package.");
  }

  const packageIds = packages.map((entry) => entry?.id);
  assertUniqueNonEmptyStrings("package ids", packageIds);

  const plannedLabIds = [];
  const plannedStateIds = [];
  const packagePlans = packages.map((entry, packageIndex) => {
    assertUniqueNonEmptyStrings(`${entry.id} lab ids`, entry.labIds);
    assertUniqueNonEmptyStrings(`${entry.id} state ids`, entry.stateIds);
    const packageLabSet = new Set(entry.labIds);
    for (const stateId of entry.stateIds) {
      let parsed;
      try {
        parsed = JSON.parse(stateId);
      } catch {
        throw new TypeError(`${entry.id} contains a malformed state receipt ${JSON.stringify(stateId)}.`);
      }
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 2 ||
        typeof parsed[0] !== "string" ||
        typeof parsed[1] !== "string" ||
        parsed[1].length === 0 ||
        !packageLabSet.has(parsed[0])
      ) {
        throw new TypeError(`${entry.id} state receipt is not owned by its package: ${stateId}.`);
      }
    }
    for (const labId of entry.labIds) {
      if (!entry.stateIds.some((stateId) => JSON.parse(stateId)[0] === labId)) {
        throw new TypeError(`${entry.id} has no planned state for ${labId}.`);
      }
    }

    const labOffset = plannedLabIds.length;
    const stateOffset = plannedStateIds.length;
    plannedLabIds.push(...entry.labIds);
    plannedStateIds.push(...entry.stateIds);
    return Object.freeze({
      id: entry.id,
      index: packageIndex,
      labCount: entry.labIds.length,
      labOffset,
      labPlanSha256: sha256Json(entry.labIds),
      stateCount: entry.stateIds.length,
      stateOffset,
      statePlanSha256: sha256Json(entry.stateIds),
      timeoutMs: chinaVisualizationPackageTimeoutMs({
        labCount: entry.labIds.length,
        stateCount: entry.stateIds.length
      })
    });
  });

  assertUniqueNonEmptyStrings("planned lab ids", plannedLabIds);
  assertUniqueNonEmptyStrings("planned state ids", plannedStateIds);

  return Object.freeze({
    labCount: plannedLabIds.length,
    labPlanSha256: sha256Json(plannedLabIds),
    packageCount: packagePlans.length,
    packagePlanSha256: sha256Json(packageIds),
    packagePlans: Object.freeze(packagePlans),
    policy: CHINA_VISUALIZATION_STATE_BUDGET_POLICY,
    schemaVersion: CHINA_VISUALIZATION_STATE_BUDGET_POLICY.schemaVersion,
    stateCount: plannedStateIds.length,
    statePlanSha256: sha256Json(plannedStateIds)
  });
}

export function validateChinaVisualizationStateBudgetManifest({
  manifest,
  plannedLabIds,
  plannedPackageIds,
  plannedStateIds
}) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["state-budget manifest is missing or malformed"];
  }
  const policy = CHINA_VISUALIZATION_STATE_BUDGET_POLICY;
  if (
    manifest.schemaVersion !== policy.schemaVersion ||
    JSON.stringify(manifest.policy) !== JSON.stringify(policy)
  ) {
    errors.push("state-budget policy or schema drifted from the canonical contract");
  }
  if (
    manifest.packageCount !== plannedPackageIds.length ||
    manifest.labCount !== plannedLabIds.length ||
    manifest.stateCount !== plannedStateIds.length ||
    manifest.packagePlanSha256 !== sha256Json(plannedPackageIds) ||
    manifest.labPlanSha256 !== sha256Json(plannedLabIds) ||
    manifest.statePlanSha256 !== sha256Json(plannedStateIds)
  ) {
    errors.push("state-budget aggregate counts or plan hashes do not match the run ledger");
  }

  const packagePlans = Array.isArray(manifest.packagePlans) ? manifest.packagePlans : [];
  if (packagePlans.length !== plannedPackageIds.length) {
    errors.push("state-budget package plan count does not match the run ledger");
    return errors;
  }

  let expectedLabOffset = 0;
  let expectedStateOffset = 0;
  for (const [index, packagePlan] of packagePlans.entries()) {
    if (!packagePlan || typeof packagePlan !== "object" || Array.isArray(packagePlan)) {
      errors.push(`state-budget package ${index} is malformed`);
      continue;
    }
    const labCount = Number(packagePlan.labCount);
    const stateCount = Number(packagePlan.stateCount);
    const labs = plannedLabIds.slice(expectedLabOffset, expectedLabOffset + labCount);
    const states = plannedStateIds.slice(expectedStateOffset, expectedStateOffset + stateCount);
    let expectedTimeoutMs = null;
    try {
      expectedTimeoutMs = chinaVisualizationPackageTimeoutMs({ labCount, stateCount });
    } catch {
      errors.push(`state-budget package ${index} has invalid lab/state counts`);
    }
    if (
      packagePlan.id !== plannedPackageIds[index] ||
      packagePlan.index !== index ||
      packagePlan.labOffset !== expectedLabOffset ||
      packagePlan.stateOffset !== expectedStateOffset ||
      packagePlan.labPlanSha256 !== sha256Json(labs) ||
      packagePlan.statePlanSha256 !== sha256Json(states) ||
      packagePlan.timeoutMs !== expectedTimeoutMs
    ) {
      errors.push(`state-budget package ${index} has a gap, overlap, order drift, hash drift, or timeout drift`);
    }
    expectedLabOffset += labCount;
    expectedStateOffset += stateCount;
  }
  if (expectedLabOffset !== plannedLabIds.length || expectedStateOffset !== plannedStateIds.length) {
    errors.push("state-budget package offsets do not cover the complete run plan exactly once");
  }
  return errors;
}
