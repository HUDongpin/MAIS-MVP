import { ARMS, PROTOCOL_ID, PROTOCOL_VERSION } from "./protocol-design.mjs";
import { FINDING_TAXONOMY, buildRoleProjectionV2, validateRoleResultV2 } from "./role-contract.mjs";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { auditRepeatPairV2, validateProviderCallRecordV2 } from "./call-record-contract.mjs";

function exactIds(values, expected) {
  return Array.isArray(values)
    && values.every((value) => typeof value === "string" && value.length > 0)
    && new Set(values).size === values.length
    && canonicalSha256([...values].sort()) === canonicalSha256([...expected].sort());
}

const ARM_ROLES = Object.freeze({
  A_PRIME: ["deterministic-baseline"],
  B_PRIME: ["deterministic-baseline", "same-reviewer-critique", "same-reviewer-revision"],
  C0_PRIME: ["answer-blind-solver", "tool-verifier", "adversarial-grader", "bilingual-curriculum-critic", "evidence-verifier"]
});

/** Current offline receipts must state every boundary explicitly; no historical defaults. */
export function validateOfflineEvidenceV2(receipt) {
  const expected = {
    executionMode: "offline-mock", evidenceClass: "synthetic-calibration", providerCallsSimulated: true,
    liveProviderUsed: false, formalExecutionAuthorized: false, productionAuthorized: false,
    deploymentAuthorized: false, gitCommitAuthorized: false, gitPushAuthorized: false
  };
  for (const [key, value] of Object.entries(expected)) {
    if (receipt?.[key] !== value) throw new Error(`Current offline evidence requires ${key}=${JSON.stringify(value)}.`);
  }
  return true;
}

function validateExecution(execution, { role, packageId, projection, repeatGroupId, boundary }) {
  const { executionSha256, ...body } = execution;
  if (executionSha256 !== canonicalSha256(body)) throw new Error("Role execution self-hash drifted.");
  const deterministic = role === "deterministic-baseline";
  if (execution.role !== role || execution.executionBoundary !== boundary || execution.providerCalls !== (deterministic ? 0 : 1)
    || !Number.isSafeInteger(execution.providerAttemptCount) || execution.providerAttemptCount < (deterministic ? 0 : 1)
    || execution.providerAttemptCount > (deterministic ? 0 : 3)) throw new Error("Role execution boundary or call count drifted.");
  const result = deterministic ? execution.roleResult : execution.providerReceipt?.roleResult;
  if (deterministic ? execution.providerReceipt !== undefined : execution.roleResult !== undefined) throw new Error("Role execution has an ambiguous result source.");
  if (!deterministic) {
    const commitment = canonicalSha256(projection);
    const provider = execution.providerReceipt;
    const record = provider?.callRecord;
    if (canonicalSha256(execution.projection) !== commitment || execution.projectionSha256 !== commitment
      || provider?.projectionSha256 !== commitment) throw new Error("Role projection does not match its independent package and execution context.");
    if (validateProviderCallRecordV2(record).length || record.packageId !== packageId || record.role !== role
      || record.projectionSha256 !== commitment || record.repeatGroupId !== repeatGroupId) throw new Error("Role call-record package, projection or repeat binding drifted.");
  }
  const issues = validateRoleResultV2({ result, role, packageId, projection });
  if (result?.inspectionComplete !== true || issues.length) throw new Error(`Role inspection evidence is invalid (${issues.map((row) => row.code).join(",")}).`);
  return result;
}

function validateUsage(receipt) {
  const executions = receipt.roleExecutions;
  const calls = executions.reduce((total, row) => total + row.providerCalls, 0);
  const attempts = executions.reduce((total, row) => total + row.providerAttemptCount, 0);
  const expected = { providerCalls: calls, providerAttempts: attempts, failedProviderAttempts: attempts - calls,
    roleExecutions: executions.length, browserLaunches: 0, childProcesses: 0 };
  if (Object.entries(expected).some(([key, value]) => receipt.resourceUsage?.[key] !== value)) throw new Error("Receipt usage disagrees with actual role executions.");
}

function validateCoreExecutions(receipt, expectedPackage) {
  const roles = ARM_ROLES[receipt.arm];
  if (!Array.isArray(receipt.roleExecutions) || !exactIds(receipt.roleExecutions.map((row) => row?.role), roles)) {
    throw new Error("Actual role executions do not match the arm contract.");
  }
  const includedRoles = roles.filter((role) => role !== "same-reviewer-critique");
  if (!exactIds(receipt.aggregation?.includedRoles, includedRoles)) throw new Error("Aggregation roles do not match the arm contract.");
  const resultByRole = new Map();
  for (const role of roles) {
    const execution = receipt.roleExecutions.find((row) => row.role === role);
    const projection = buildRoleProjectionV2({ role, packageContent: expectedPackage });
    if (role === "same-reviewer-revision") {
      projection.reviewContext = { priorRole: "same-reviewer-critique", deterministicBaseline: resultByRole.get("deterministic-baseline"), priorRoleResult: resultByRole.get("same-reviewer-critique") };
    }
    const boundary = role === "deterministic-baseline" ? "deterministic-single-pass"
      : receipt.arm === "B_PRIME" ? "same-reviewer-sequential-context" : "c0-independent-projection-serial-within-package";
    resultByRole.set(role, validateExecution(execution, { role, packageId: receipt.packageId, projection, repeatGroupId: receipt.repeatGroupId, boundary }));
  }
  validateUsage(receipt);
  const findings = [];
  const inspectedBySurface = new Map();
  for (const role of includedRoles) {
    const result = resultByRole.get(role);
    for (const id of result.inspectedSurfaceIds) inspectedBySurface.set(id, [...(inspectedBySurface.get(id) ?? []), role]);
    for (const finding of result.findings) {
      const material = { sourceRole: role, sourceFindingId: finding.findingId, surfaceId: finding.surfaceId,
        family: finding.family, severity: finding.severity, code: finding.code, detail: finding.detail };
      findings.push({ ...material, findingId: `v2-${canonicalSha256(material).slice(0, 24)}` });
    }
  }
  const byId = (values) => [...values].sort((left, right) => left.findingId.localeCompare(right.findingId));
  if (!Array.isArray(receipt.findings) || canonicalSha256(byId(receipt.findings)) !== canonicalSha256(byId(findings))) {
    throw new Error("Aggregate findings do not match their actual included role sources.");
  }
  const material = receipt.findings.map(({ findingId, surfaceId, family, severity, code, sourceRole }) => ({ findingId, surfaceId, family, severity, code, sourceRole }));
  if (receipt.materialResultSha256 !== canonicalSha256(material)) throw new Error("Aggregate finding material commitment drifted.");
  return inspectedBySurface;
}

/** Shared scoring/persistence contract, bound to independently supplied content. */
export function validateCoreReceiptV2(receipt, expectedPackage) {
  if (!expectedPackage || !Array.isArray(expectedPackage.questions) || !Array.isArray(expectedPackage.lessons)) {
    throw new Error("An independent expected package is required for the surface denominator.");
  }
  if (!receipt || receipt.packageId !== expectedPackage.packageId || receipt.inputSha256 !== canonicalSha256(expectedPackage)) {
    throw new Error("Receipt expected-package input binding drifted.");
  }
  const { receiptSha256, ...receiptBody } = receipt;
  if (receiptSha256 !== canonicalSha256(receiptBody)) throw new Error("Receipt self-hash is invalid.");
  if (receipt.runKind !== "core" || !ARMS.includes(receipt.arm)) throw new Error("Expected a core receipt for a supported arm.");
  validateOfflineEvidenceV2(receipt);
  const inspectedBySurface = validateCoreExecutions(receipt, expectedPackage);
  const expected = [
    ...expectedPackage.questions.map((value) => ({ id: value.id, kind: "question", value })),
    ...expectedPackage.lessons.map((value) => ({ id: value.id, kind: "lesson", value }))
  ];
  const expectedIds = expected.map((row) => row.id);
  if (expected.length === 0 || !exactIds(expectedIds, expectedIds)) throw new Error("Expected surface IDs are empty or duplicated.");
  if (!Array.isArray(receipt.surfaceResults) || !exactIds(receipt.surfaceResults.map((row) => row?.surfaceId), expectedIds)) {
    throw new Error("Receipt surface denominator does not match the complete expected package.");
  }
  const expectedCoverage = {
    requiredSurfaces: expected.length, inspectedSurfaces: expected.length,
    questions: expectedPackage.questions.length, lessons: expectedPackage.lessons.length,
    browserRoutes: 0, notInspected: 0
  };
  if (Object.entries(expectedCoverage).some(([key, value]) => receipt.coverage?.[key] !== value)) {
    throw new Error("Receipt coverage disagrees with the expected surface denominator.");
  }
  if (!Array.isArray(receipt.findings)) throw new Error("Receipt findings are absent.");
  const findingIds = new Set();
  const bySurface = new Map(expectedIds.map((id) => [id, []]));
  for (const finding of receipt.findings) {
    const taxonomy = FINDING_TAXONOMY[finding?.code];
    if (!taxonomy || finding.family !== taxonomy.family || finding.severity !== taxonomy.severity) {
      throw new Error("Finding family or severity disagrees with its allowlisted code.");
    }
    if (typeof finding.findingId !== "string" || !finding.findingId || findingIds.has(finding.findingId)) {
      throw new Error("Finding IDs are absent or duplicated.");
    }
    if (!bySurface.has(finding.surfaceId)) throw new Error("Finding references an unknown surface.");
    findingIds.add(finding.findingId);
    bySurface.get(finding.surfaceId).push(finding.findingId);
  }
  for (const surface of receipt.surfaceResults) {
    const expectedSurface = expected.find((row) => row.id === surface.surfaceId);
    const ids = bySurface.get(surface.surfaceId);
    if (surface.surfaceKind !== expectedSurface.kind || surface.surfaceInputSha256 !== canonicalSha256(expectedSurface.value)) {
      throw new Error("Surface kind or input binding drifted.");
    }
    if (!exactIds(surface.findingIds, ids) || surface.disposition !== (ids.length ? "finding" : "clean-with-evidence")) {
      throw new Error("Surface disposition and finding-ID parity are contradictory.");
    }
    if (!Array.isArray(surface.inspectedByRoles) || surface.inspectedByRoles.length === 0
      || !exactIds(surface.inspectedByRoles, inspectedBySurface.get(surface.surfaceId) ?? [])) {
      throw new Error("Surface inspection evidence is absent or invalid.");
    }
    const { evidenceSha256, ...surfaceBody } = surface;
    if (evidenceSha256 !== canonicalSha256(surfaceBody)) throw new Error("Surface evidence self-hash drifted.");
  }
  return true;
}

/** Repeats retain the original projections, including B's original critique context. */
export function validateRepeatReceiptV2(receipt, originalReceipt, expectedPackage) {
  validateOfflineEvidenceV2(receipt);
  validateCoreReceiptV2(originalReceipt, expectedPackage);
  const { receiptSha256, ...body } = receipt;
  if (receiptSha256 !== canonicalSha256(body) || receipt.runKind !== "repeat" || receipt.status !== "formal-repeat-run-complete") throw new Error("Repeat receipt is invalid or incomplete.");
  if (receipt.arm === "A_PRIME" || receipt.arm !== originalReceipt.arm || receipt.packageId !== originalReceipt.packageId
    || receipt.originalPackageId !== originalReceipt.packageId || receipt.candidateSetSha256 !== originalReceipt.candidateSetSha256
    || canonicalSha256(receipt.authorizationBinding) !== canonicalSha256(originalReceipt.authorizationBinding)
    || !receipt.repeatGroupId || receipt.repeatGroupId !== originalReceipt.repeatGroupId) throw new Error("Repeat receipt is not bound to the original core receipt.");
  const originals = originalReceipt.roleExecutions.filter((row) => row.providerCalls === 1);
  if (!Array.isArray(receipt.roleExecutions) || !exactIds(receipt.roleExecutions.map((row) => row?.role), originals.map((row) => row.role))) throw new Error("Repeat role executions drifted from the original arm.");
  if (!Array.isArray(receipt.pairAudits) || !exactIds(receipt.pairAudits.map((row) => row?.role), originals.map((row) => row.role))) throw new Error("Repeat pair evidence is incomplete.");
  for (const original of originals) {
    const execution = receipt.roleExecutions.find((row) => row.role === original.role);
    validateExecution(execution, { role: original.role, packageId: receipt.packageId, projection: original.projection,
      repeatGroupId: receipt.repeatGroupId, boundary: "repeat-of-exact-frozen-core-projection" });
    const left = original.providerReceipt.callRecord;
    const right = execution.providerReceipt.callRecord;
    const expectedAudit = { role: original.role, originalRecordSha256: left.recordSha256, repeatedRecordSha256: right.recordSha256,
      projectionSha256: original.projectionSha256, requestParametersSha256: left.requestParametersSha256, auditIssueCount: 0 };
    if (auditRepeatPairV2([left, right]).length || canonicalSha256(receipt.pairAudits.find((row) => row.role === original.role)) !== canonicalSha256(expectedAudit)) throw new Error("Repeat pair evidence disagrees with its actual call records.");
  }
  if (receipt.sameFrozenProjectionUsed !== true || receipt.sameRequestParametersUsed !== true
    || receipt.repeatCritiqueNotFedIntoRevision !== (receipt.arm === "B_PRIME")) throw new Error("Repeat projection evidence claims drifted.");
  validateUsage(receipt);
  return true;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function f1Score(precision, sensitivity) {
  return precision === null || sensitivity === null || precision + sensitivity === 0
    ? null
    : 2 * precision * sensitivity / (precision + sensitivity);
}

function surfaceKey(packageId, surfaceId) {
  return `${packageId}::${surfaceId}`;
}

function binomialCoefficient(n, k) {
  const reduced = Math.min(k, n - k);
  let value = 1;
  for (let index = 1; index <= reduced; index += 1) value = value * (n - reduced + index) / index;
  return value;
}

function exactMcNemarP(leftWins, rightWins) {
  const discordant = leftWins + rightWins;
  if (discordant === 0) return 1;
  const tail = Math.min(leftWins, rightWins);
  let cumulative = 0;
  for (let count = 0; count <= tail; count += 1) cumulative += binomialCoefficient(discordant, count) / (2 ** discordant);
  return Math.min(1, 2 * cumulative);
}

function validateInputs(runReceipts, goldInstances, expectedPackages) {
  if (!Array.isArray(runReceipts) || !Array.isArray(goldInstances)) throw new Error("Scoring requires run receipts and gold instances arrays.");
  if (!Array.isArray(expectedPackages) || expectedPackages.length === 0
    || !exactIds(expectedPackages.map((row) => row?.packageId), expectedPackages.map((row) => row?.packageId))) {
    throw new Error("Scoring requires independent expected packages for its denominator.");
  }
  const expectedByPackage = new Map(expectedPackages.map((row) => [row.packageId, row]));
  if (!exactIds(runReceipts.map((row) => row?.packageId), [...expectedByPackage.keys()])) {
    throw new Error("Scoring receipt denominator does not cover all expected packages.");
  }
  const receiptByPackage = new Map();
  for (const receipt of runReceipts) {
    validateCoreReceiptV2(receipt, expectedByPackage.get(receipt.packageId));
    if (!ARMS.includes(receipt.arm)) throw new Error(`Unknown v2 arm ${receipt.arm}.`);
    if (receiptByPackage.has(receipt.packageId)) throw new Error(`Duplicate package receipt ${receipt.packageId}.`);
    receiptByPackage.set(receipt.packageId, receipt);
    if (!Array.isArray(receipt.surfaceResults) || !Array.isArray(receipt.findings)) throw new Error(`Receipt ${receipt.packageId} lacks findings or surface results.`);
    const surfaceIds = new Set(receipt.surfaceResults.map((row) => row.surfaceId));
    if (surfaceIds.size !== receipt.surfaceResults.length) throw new Error(`Receipt ${receipt.packageId} contains duplicate surfaces.`);
    for (const finding of receipt.findings) {
      const taxonomy = FINDING_TAXONOMY[finding.code];
      if (!taxonomy) throw new Error(`Finding ${finding.findingId ?? "<unknown>"} uses an unknown code.`);
      if (finding.family !== taxonomy.family) throw new Error(`Finding ${finding.findingId ?? "<unknown>"} family disagrees with its code family.`);
      if (!surfaceIds.has(finding.surfaceId)) throw new Error(`Finding ${finding.findingId ?? "<unknown>"} references an unknown surface.`);
    }
  }
  for (const instance of goldInstances) {
    const receipt = receiptByPackage.get(instance.packageId);
    if (!receipt || receipt.arm !== instance.arm) throw new Error(`Gold instance ${instance.latentDefectId} is not bound to its arm receipt.`);
    if (!receipt.surfaceResults.some((row) => row.surfaceId === instance.surfaceId)) throw new Error(`Gold surface ${instance.surfaceId} is absent from its receipt denominator.`);
    if (instance.acceptedCodes !== undefined) {
      if (!Array.isArray(instance.acceptedCodes) || instance.acceptedCodes.length === 0) throw new Error(`Gold instance ${instance.latentDefectId} has an invalid acceptedCodes contract.`);
      for (const code of instance.acceptedCodes) {
        const taxonomy = FINDING_TAXONOMY[code];
        if (!taxonomy || taxonomy.family !== instance.family) throw new Error(`Gold instance ${instance.latentDefectId} accepted code disagrees with its family.`);
      }
    }
  }
  return receiptByPackage;
}

function detectionState(receipt, instance) {
  const surface = receipt.surfaceResults.find((row) => row.surfaceId === instance.surfaceId);
  const surfaceDetected = surface?.disposition === "finding";
  const findings = receipt.findings.filter((row) => row.surfaceId === instance.surfaceId);
  const concordantDetected = findings.some((row) => row.family === instance.family && FINDING_TAXONOMY[row.code]?.family === instance.family);
  const acceptedCodes = Array.isArray(instance.acceptedCodes) && instance.acceptedCodes.length > 0
    ? new Set(instance.acceptedCodes)
    : null;
  const codeFamilyConcordantDetected = findings.some((row) => (
    row.family === instance.family
    && FINDING_TAXONOMY[row.code]?.family === instance.family
    && (!acceptedCodes || acceptedCodes.has(row.code))
  ));
  return { surfaceDetected, concordantDetected, codeFamilyConcordantDetected, findings };
}

function armMetrics(arm, runReceipts, goldInstances) {
  const receipts = runReceipts.filter((row) => row.arm === arm);
  const instances = goldInstances.filter((row) => row.arm === arm);
  const receiptByPackage = new Map(receipts.map((row) => [row.packageId, row]));
  const allSurfaces = new Set(receipts.flatMap((receipt) => receipt.surfaceResults.map((row) => surfaceKey(receipt.packageId, row.surfaceId))));
  const predictedPositive = new Set(receipts.flatMap((receipt) => receipt.surfaceResults
    .filter((row) => row.disposition === "finding")
    .map((row) => surfaceKey(receipt.packageId, row.surfaceId))));
  const goldPositive = new Set(instances.map((row) => surfaceKey(row.packageId, row.surfaceId)));
  const truePositives = [...goldPositive].filter((key) => predictedPositive.has(key)).length;
  const falseNegatives = goldPositive.size - truePositives;
  const falsePositives = [...predictedPositive].filter((key) => !goldPositive.has(key)).length;
  const trueNegatives = allSurfaces.size - goldPositive.size - falsePositives;
  const sensitivity = ratio(truePositives, truePositives + falseNegatives);
  const specificity = ratio(trueNegatives, trueNegatives + falsePositives);
  const precision = ratio(truePositives, truePositives + falsePositives);

  let concordantTruePositives = 0;
  let codeFamilyConcordantTruePositives = 0;
  let surfaceDetectedGoldInstances = 0;
  let discordantGoldSurfaceFindingCount = 0;
  const familyCounts = {};
  for (const instance of instances) {
    const state = detectionState(receiptByPackage.get(instance.packageId), instance);
    if (state.surfaceDetected) surfaceDetectedGoldInstances += 1;
    if (state.concordantDetected) concordantTruePositives += 1;
    if (state.codeFamilyConcordantDetected) codeFamilyConcordantTruePositives += 1;
    else if (state.surfaceDetected) discordantGoldSurfaceFindingCount += 1;
    familyCounts[instance.family] ??= { goldInstances: 0, truePositives: 0, falseNegatives: 0 };
    familyCounts[instance.family].goldInstances += 1;
    if (state.concordantDetected) familyCounts[instance.family].truePositives += 1;
    else familyCounts[instance.family].falseNegatives += 1;
  }
  const concordantFalseNegatives = instances.length - concordantTruePositives;
  const codeFamilyConcordantFalseNegatives = instances.length - codeFamilyConcordantTruePositives;
  return {
    runs: receipts.length,
    surfaceDetection: {
      totalSurfaces: allSurfaces.size,
      goldPositiveSurfaces: goldPositive.size,
      truePositives,
      falseNegatives,
      falsePositives,
      trueNegatives,
      sensitivity,
      specificity,
      precision,
      f1: f1Score(precision, sensitivity),
      falsePositiveRate: ratio(falsePositives, falsePositives + trueNegatives)
    },
    familyConcordantDetection: {
      goldInstances: instances.length,
      truePositives: concordantTruePositives,
      falseNegatives: concordantFalseNegatives,
      sensitivity: ratio(concordantTruePositives, instances.length),
      surfaceDetectedGoldInstances,
      concordanceRateAmongSurfaceDetectedGold: ratio(concordantTruePositives, surfaceDetectedGoldInstances),
      byFamily: familyCounts
    },
    codeFamilyConcordantDetection: {
      goldInstances: instances.length,
      goldInstancesWithAcceptedCodes: instances.filter((row) => Array.isArray(row.acceptedCodes) && row.acceptedCodes.length > 0).length,
      truePositives: codeFamilyConcordantTruePositives,
      falseNegatives: codeFamilyConcordantFalseNegatives,
      sensitivity: ratio(codeFamilyConcordantTruePositives, instances.length),
      fallbackWhenAcceptedCodesAbsent: "family-concordant-code-mapping",
      concordanceRateAmongSurfaceDetectedGold: ratio(codeFamilyConcordantTruePositives, surfaceDetectedGoldInstances)
    },
    discordantGoldSurfaceFindingCount
  };
}

function matchedOutcome(instancesByDefect, receiptByPackage, leftArm, rightArm, outcome) {
  let leftWins = 0;
  let rightWins = 0;
  let bothDetect = 0;
  let neitherDetect = 0;
  for (const instances of instancesByDefect.values()) {
    const byArm = new Map(instances.map((row) => [row.arm, row]));
    const leftInstance = byArm.get(leftArm);
    const rightInstance = byArm.get(rightArm);
    if (!leftInstance || !rightInstance) throw new Error(`Matched defect is missing ${leftArm} or ${rightArm}.`);
    const left = detectionState(receiptByPackage.get(leftInstance.packageId), leftInstance)[outcome];
    const right = detectionState(receiptByPackage.get(rightInstance.packageId), rightInstance)[outcome];
    if (left && !right) leftWins += 1;
    else if (!left && right) rightWins += 1;
    else if (left && right) bothDetect += 1;
    else neitherDetect += 1;
  }
  return {
    matchedDefects: instancesByDefect.size,
    leftWins,
    rightWins,
    bothDetect,
    neitherDetect,
    discordantPairs: leftWins + rightWins,
    pairedDetectionDifference: ratio(leftWins - rightWins, instancesByDefect.size),
    exactMcNemarP: exactMcNemarP(leftWins, rightWins),
    inferenceStatus: "calibration-with-cluster-aware-interpretation-required"
  };
}

function matchedComparisons(runReceipts, goldInstances) {
  const receiptByPackage = new Map(runReceipts.map((row) => [row.packageId, row]));
  const instancesByDefect = new Map();
  for (const instance of goldInstances) {
    instancesByDefect.set(instance.latentDefectId, [...(instancesByDefect.get(instance.latentDefectId) ?? []), instance]);
  }
  for (const [latentDefectId, instances] of instancesByDefect) {
    if (instances.length !== 3 || new Set(instances.map((row) => row.arm)).size !== 3) throw new Error(`Latent defect ${latentDefectId} is not matched across the three v2 arms.`);
  }
  const pairs = [
    ["B_PRIME", "A_PRIME"],
    ["C0_PRIME", "A_PRIME"],
    ["C0_PRIME", "B_PRIME"]
  ];
  return Object.fromEntries(pairs.map(([leftArm, rightArm]) => [
    `${leftArm}_vs_${rightArm}`,
    {
      leftArm,
      rightArm,
      surfaceDetection: matchedOutcome(instancesByDefect, receiptByPackage, leftArm, rightArm, "surfaceDetected"),
      familyConcordantDetection: matchedOutcome(instancesByDefect, receiptByPackage, leftArm, rightArm, "concordantDetected"),
      codeFamilyConcordantDetection: matchedOutcome(instancesByDefect, receiptByPackage, leftArm, rightArm, "codeFamilyConcordantDetected")
    }
  ]));
}

export function scoreCalibrationV2({ runReceipts, goldInstances, expectedPackages }) {
  validateInputs(runReceipts, goldInstances, expectedPackages);
  return {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    status: "candidate-scoring-contract",
    arms: [...ARMS],
    armMetrics: Object.fromEntries(ARMS.map((arm) => [arm, armMetrics(arm, runReceipts, goldInstances)])),
    matchedComparisons: matchedComparisons(runReceipts, goldInstances),
    primaryMetricRule: "Report surface, family-concordant, and accepted-code-plus-family-concordant detection together; never substitute one for another.",
    claimBoundary: {
      syntheticCalibrationOnly: true,
      naturalQuestionBankGeneralizationClaim: false,
      productionReadinessClaim: false,
      livePromotionClaim: false
    }
  };
}
