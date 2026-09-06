import { validateCoreReceiptV2, validateRepeatReceiptV2 } from "./scoring.mjs";
import { auditRepeatPairV2 } from "./call-record-contract.mjs";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { runDeterministicBaselineV2 } from "./deterministic-baseline.mjs";
import { ARMS, PROTOCOL_ID, PROTOCOL_VERSION, SOURCE_BASELINE } from "./protocol-design.mjs";
import { buildRoleProjectionV2, validateRoleResultV2 } from "./role-contract.mjs";

export const C0_PROVIDER_ROLES = Object.freeze([
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
]);

export const MAX_INPUT_TOKENS_PER_CALL_V2 = 220_000;
export const MAX_OUTPUT_TOKENS_PER_CALL_V2 = 24_000;

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

function executionRecord(body) {
  return { ...body, executionSha256: canonicalSha256(body) };
}

function zeroUsage() {
  return {
    providerCalls: 0,
    providerAttempts: 0,
    failedProviderAttempts: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    outputTokens: 0,
    apiCostUsd: 0,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0,
    liveLatencyMilliseconds: 0
  };
}

function addSettledSuccess(runUsage, settled, latencyMs) {
  runUsage.providerCalls += settled.providerCalls;
  runUsage.promptCacheHitTokens += settled.promptCacheHitTokens;
  runUsage.promptCacheMissTokens += settled.promptCacheMissTokens;
  runUsage.outputTokens += settled.outputTokens;
  runUsage.apiCostUsd = Number((runUsage.apiCostUsd + settled.apiCostUsd).toFixed(9));
  runUsage.liveLatencyMilliseconds += latencyMs;
}

async function providerExecution({
  role,
  packageId,
  projection,
  providerAdapter,
  budgetLedger,
  runUsage,
  repeatGroupId,
  executionBoundary,
  maxAttemptsPerRole
}) {
  let providerReceipt = null;
  let settledUsage = null;
  let attempt = 0;
  while (attempt < maxAttemptsPerRole) {
    attempt += 1;
    const reservation = budgetLedger.reserve({
      maxInputTokens: MAX_INPUT_TOKENS_PER_CALL_V2,
      maxOutputTokens: MAX_OUTPUT_TOKENS_PER_CALL_V2
    });
    runUsage.providerAttempts += 1;
    try {
      providerReceipt = await providerAdapter.runRole({
        role,
        packageId,
        projection,
        maxOutputTokens: MAX_OUTPUT_TOKENS_PER_CALL_V2,
        userId: "mais-rsi-lite-cal-v2",
        repeatGroupId
      });
    } catch (error) {
      const failure = budgetLedger.settleFailure(reservation);
      runUsage.failedProviderAttempts += 1;
      runUsage.conservativeFailureDebitTokens += failure.conservativeFailureDebitTokens;
      runUsage.conservativeFailureDebitUsd = Number((runUsage.conservativeFailureDebitUsd + failure.conservativeFailureDebitUsd).toFixed(9));
      if (error?.retryable !== true || attempt >= maxAttemptsPerRole) throw error;
      continue;
    }
    // A successful call must not be retried or failure-debited if the ledger
    // cannot durably settle its usage. Propagate that independent boundary.
    settledUsage = budgetLedger.settleSuccess(reservation, providerReceipt.usage);
    break;
  }
  if (!providerReceipt || !settledUsage) throw new Error("Provider execution ended without a settled successful result.");
  if (providerReceipt.projectionSha256 !== canonicalSha256(projection)) throw new Error("Provider receipt projection commitment drifted.");
  const violations = validateRoleResultV2({ result: providerReceipt.roleResult, role, packageId, projection });
  if (providerReceipt.roleResult.inspectionComplete !== true || violations.length > 0) {
    throw new Error(`Runner rejected a provider role result (${violations.map((row) => row.code).join(",") || "inspection-incomplete"}).`);
  }
  addSettledSuccess(runUsage, settledUsage, providerReceipt.latencyMs ?? 0);
  return executionRecord({
    role,
    executionBoundary,
    providerCalls: 1,
    providerAttemptCount: attempt,
    projection: structuredClone(projection),
    projectionSha256: canonicalSha256(projection),
    providerReceipt
  });
}

function deterministicExecution(result) {
  const body = {
    role: "deterministic-baseline",
    executionBoundary: "deterministic-single-pass",
    providerCalls: 0,
    providerAttemptCount: 0,
    roleResult: result
  };
  return executionRecord(body);
}

function normalizedAggregateFindings(executions, includedRoles) {
  const findings = [];
  for (const execution of executions.filter((row) => includedRoles.has(row.role))) {
    const result = execution.roleResult ?? execution.providerReceipt?.roleResult;
    for (const finding of result?.findings ?? []) {
      const material = {
        sourceRole: execution.role,
        sourceFindingId: finding.findingId,
        surfaceId: finding.surfaceId,
        family: finding.family,
        severity: finding.severity,
        code: finding.code,
        detail: finding.detail
      };
      findings.push({ ...material, findingId: `v2-${canonicalSha256(material).slice(0, 24)}` });
    }
  }
  return findings.sort((left, right) => (
    left.surfaceId.localeCompare(right.surfaceId)
    || left.code.localeCompare(right.code)
    || left.sourceRole.localeCompare(right.sourceRole)
  ));
}

function surfaceResults(packageContent, findings, includedExecutions) {
  const findingBySurface = Map.groupBy(findings, (row) => row.surfaceId);
  const inspectionBySurface = new Map();
  for (const execution of includedExecutions) {
    const result = execution.roleResult ?? execution.providerReceipt?.roleResult;
    for (const surfaceId of result?.inspectedSurfaceIds ?? []) {
      inspectionBySurface.set(surfaceId, [...(inspectionBySurface.get(surfaceId) ?? []), execution.role]);
    }
  }
  const surfaces = [
    ...packageContent.questions.map((value) => ({ surfaceId: value.id, surfaceKind: "question", value })),
    ...packageContent.lessons.map((value) => ({ surfaceId: value.id, surfaceKind: "lesson", value }))
  ];
  return surfaces.map((surface) => {
    const findingIds = (findingBySurface.get(surface.surfaceId) ?? []).map((row) => row.findingId).sort();
    const inspectedByRoles = [...new Set(inspectionBySurface.get(surface.surfaceId) ?? [])].sort();
    const body = {
      surfaceId: surface.surfaceId,
      surfaceKind: surface.surfaceKind,
      disposition: findingIds.length > 0 ? "finding" : inspectedByRoles.length > 0 ? "clean-with-evidence" : "not-inspected",
      findingIds,
      inspectedByRoles,
      surfaceInputSha256: canonicalSha256(surface.value)
    };
    return { ...body, evidenceSha256: canonicalSha256(body) };
  });
}

function assertPackageBinding(planRow, packageContent) {
  if (!planRow || typeof planRow !== "object" || !packageContent || typeof packageContent !== "object") throw new Error("V2 package plan and content are required.");
  if (planRow.packageId !== packageContent.packageId) throw new Error("V2 package ID drifted from its run plan.");
  if (!ARMS.includes(planRow.arm)) throw new Error(`Unknown V2 arm: ${planRow.arm}`);
  if (packageContent.protocolId !== PROTOCOL_ID || packageContent.protocolVersion !== PROTOCOL_VERSION || packageContent.sourceBaseline !== SOURCE_BASELINE) throw new Error("V2 package protocol binding drifted.");
  if (canonicalSha256(packageContent) !== planRow.contentSha256) throw new Error("V2 package content commitment drifted.");
  if (!Array.isArray(packageContent.questions) || !Array.isArray(packageContent.lessons)) throw new Error("V2 package surfaces are missing.");
  if (!Array.isArray(packageContent.browserRoutes) || packageContent.browserRoutes.length !== 0) throw new Error("V2 content-only estimand requires zero browser routes.");
  assertSha256(planRow.candidateSetSha256, "candidate-set commitment");
  if (!planRow.authorizationBinding || typeof planRow.authorizationBinding !== "object") throw new Error("Formal authorization binding is required.");
}

export async function runPackageV2({
  planRow,
  packageContent,
  providerAdapter,
  budgetLedger,
  maxAttemptsPerRole = 2
}) {
  assertPackageBinding(planRow, packageContent);
  if (!providerAdapter || typeof providerAdapter.runRole !== "function") throw new Error("V2 provider adapter is required.");
  if (providerAdapter.executionMode !== "offline-mock") throw new Error("Historical V2 live execution is disabled; an explicit offline-mock adapter is required.");
  if (!budgetLedger || typeof budgetLedger.reserve !== "function") throw new Error("V2 budget ledger is required.");
  if (!Number.isSafeInteger(maxAttemptsPerRole) || maxAttemptsPerRole < 1 || maxAttemptsPerRole > 3) throw new Error("V2 attempts per role must be from one through three.");
  const startedAt = new Date().toISOString();
  const runUsage = zeroUsage();
  const executions = [];
  let includedRoles;

  if (planRow.arm === "A_PRIME") {
    executions.push(deterministicExecution(runDeterministicBaselineV2(packageContent)));
    includedRoles = new Set(["deterministic-baseline"]);
  } else if (planRow.arm === "B_PRIME") {
    const baseline = runDeterministicBaselineV2(packageContent);
    executions.push(deterministicExecution(baseline));
    const critiqueProjection = buildRoleProjectionV2({ role: "same-reviewer-critique", packageContent });
    const critique = await providerExecution({
      role: "same-reviewer-critique",
      packageId: packageContent.packageId,
      projection: critiqueProjection,
      providerAdapter,
      budgetLedger,
      runUsage,
      repeatGroupId: planRow.repeatGroupId ?? null,
      executionBoundary: "same-reviewer-sequential-context",
      maxAttemptsPerRole
    });
    executions.push(critique);
    const revisionProjection = {
      ...buildRoleProjectionV2({ role: "same-reviewer-revision", packageContent }),
      reviewContext: {
        priorRole: "same-reviewer-critique",
        deterministicBaseline: baseline,
        priorRoleResult: structuredClone(critique.providerReceipt.roleResult)
      }
    };
    executions.push(await providerExecution({
      role: "same-reviewer-revision",
      packageId: packageContent.packageId,
      projection: revisionProjection,
      providerAdapter,
      budgetLedger,
      runUsage,
      repeatGroupId: planRow.repeatGroupId ?? null,
      executionBoundary: "same-reviewer-sequential-context",
      maxAttemptsPerRole
    }));
    includedRoles = new Set(["deterministic-baseline", "same-reviewer-revision"]);
  } else {
    for (const role of C0_PROVIDER_ROLES) {
      const projection = buildRoleProjectionV2({ role, packageContent });
      executions.push(await providerExecution({
        role,
        packageId: packageContent.packageId,
        projection,
        providerAdapter,
        budgetLedger,
        runUsage,
        repeatGroupId: planRow.repeatGroupId ?? null,
        executionBoundary: "c0-independent-projection-serial-within-package",
        maxAttemptsPerRole
      }));
    }
    includedRoles = new Set(C0_PROVIDER_ROLES);
  }

  const findings = normalizedAggregateFindings(executions, includedRoles);
  const includedExecutions = executions.filter((row) => includedRoles.has(row.role));
  const surfaces = surfaceResults(packageContent, findings, includedExecutions);
  const notInspected = surfaces.filter((row) => row.disposition === "not-inspected").length;
  if (notInspected > 0) throw new Error(`V2 run refused completion because ${notInspected} mandatory surfaces were not inspected.`);
  const runId = `v2-core-${planRow.arm.toLowerCase()}-${planRow.packageId}`;
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    schemaVersion: 2,
    runKind: "core",
    runId,
    packageId: planRow.packageId,
    latentBundleId: planRow.latentBundleId,
    variantId: planRow.variantId,
    region: planRow.region,
    arm: planRow.arm,
    inputSha256: planRow.contentSha256,
    candidateSetSha256: planRow.candidateSetSha256,
    authorizationBinding: structuredClone(planRow.authorizationBinding),
    repeatGroupId: planRow.repeatGroupId ?? null,
    status: "formal-core-run-complete",
    executionMode: "offline-mock",
    evidenceClass: "synthetic-calibration",
    providerCallsSimulated: true,
    formalExecutionAuthorized: false,
    liveProviderUsed: false,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false,
    startedAt,
    completedAt: new Date().toISOString(),
    roleExecutions: executions,
    aggregation: { includedRoles: [...includedRoles] },
    findings,
    materialResultSha256: canonicalSha256(findings.map(({ findingId, surfaceId, family, severity, code, sourceRole }) => ({ findingId, surfaceId, family, severity, code, sourceRole }))),
    coverage: {
      requiredSurfaces: surfaces.length,
      inspectedSurfaces: surfaces.length,
      questions: packageContent.questions.length,
      lessons: packageContent.lessons.length,
      browserRoutes: 0,
      notInspected
    },
    surfaceResults: surfaces,
    resourceUsage: {
      ...runUsage,
      roleExecutions: executions.length,
      browserLaunches: 0,
      childProcesses: 0
    },
    providerReservationContract: {
      maxInputTokensPerCall: MAX_INPUT_TOKENS_PER_CALL_V2,
      maxOutputTokensPerCall: MAX_OUTPUT_TOKENS_PER_CALL_V2,
      maxAttemptsPerRole
    },
    completionClaim: {
      coreRunComplete: true,
      contentAccepted: false,
      openFindingCount: findings.length
    }
  };
  return { ...body, receiptSha256: canonicalSha256(body) };
}

export async function runPackageRepeatV2({
  originalReceipt,
  expectedPackage,
  repeatPlanRow,
  providerAdapter,
  budgetLedger,
  maxAttemptsPerRole = 2
}) {
  if (providerAdapter?.executionMode !== "offline-mock") throw new Error("Historical V2 live execution is disabled; an explicit offline-mock adapter is required.");
  if (!originalReceipt || typeof originalReceipt !== "object") throw new Error("Original core receipt is required for a repeat.");
  validateCoreReceiptV2(originalReceipt, expectedPackage);
  const { receiptSha256, ...originalBody } = originalReceipt;
  if (receiptSha256 !== canonicalSha256(originalBody) || originalReceipt.status !== "formal-core-run-complete") throw new Error("Original core receipt is invalid or incomplete.");
  if (!repeatPlanRow || repeatPlanRow.originalPackageId !== originalReceipt.packageId || repeatPlanRow.arm !== originalReceipt.arm) throw new Error("Repeat plan is not bound to the original package receipt.");
  if (repeatPlanRow.repeatGroupId !== originalReceipt.repeatGroupId || typeof repeatPlanRow.repeatGroupId !== "string" || repeatPlanRow.repeatGroupId === "") throw new Error("Repeat group was not precommitted on the original call records.");
  const originals = originalReceipt.roleExecutions.filter((row) => row.providerCalls === 1);
  if (originals.length !== repeatPlanRow.providerCalls) throw new Error("Repeat call denominator drifted from the original role executions.");
  const runUsage = zeroUsage();
  const executions = [];
  const pairAudits = [];
  for (const original of originals) {
    if (original.projectionSha256 !== canonicalSha256(original.projection)) throw new Error("Original frozen projection drifted before repeat execution.");
    const repeated = await providerExecution({
      role: original.role,
      packageId: originalReceipt.packageId,
      projection: structuredClone(original.projection),
      providerAdapter,
      budgetLedger,
      runUsage,
      repeatGroupId: repeatPlanRow.repeatGroupId,
      executionBoundary: "repeat-of-exact-frozen-core-projection",
      maxAttemptsPerRole
    });
    const audit = auditRepeatPairV2([original.providerReceipt.callRecord, repeated.providerReceipt.callRecord]);
    if (audit.length > 0) throw new Error(`Repeat pair drifted (${audit.map((row) => row.code).join(",")}).`);
    executions.push(repeated);
    pairAudits.push({
      role: original.role,
      originalRecordSha256: original.providerReceipt.callRecord.recordSha256,
      repeatedRecordSha256: repeated.providerReceipt.callRecord.recordSha256,
      projectionSha256: original.projectionSha256,
      requestParametersSha256: original.providerReceipt.callRecord.requestParametersSha256,
      auditIssueCount: 0
    });
  }
  const runId = `v2-repeat-${repeatPlanRow.repeatGroupId}-${String(repeatPlanRow.repeatIndex).padStart(2, "0")}`;
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    schemaVersion: 2,
    runKind: "repeat",
    runId,
    repeatGroupId: repeatPlanRow.repeatGroupId,
    repeatIndex: repeatPlanRow.repeatIndex,
    originalPackageId: originalReceipt.packageId,
    packageId: originalReceipt.packageId,
    latentBundleId: originalReceipt.latentBundleId,
    region: originalReceipt.region,
    arm: originalReceipt.arm,
    candidateSetSha256: originalReceipt.candidateSetSha256,
    authorizationBinding: structuredClone(originalReceipt.authorizationBinding),
    status: "formal-repeat-run-complete",
    executionMode: "offline-mock",
    evidenceClass: "synthetic-calibration",
    providerCallsSimulated: true,
    formalExecutionAuthorized: false,
    liveProviderUsed: false,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false,
    sameFrozenProjectionUsed: true,
    sameRequestParametersUsed: true,
    repeatCritiqueNotFedIntoRevision: originalReceipt.arm === "B_PRIME",
    roleExecutions: executions,
    pairAudits,
    resourceUsage: {
      ...runUsage,
      roleExecutions: executions.length,
      browserLaunches: 0,
      childProcesses: 0
    },
    completionClaim: { repeatRunComplete: true, includedInCoreEstimand: false }
  };
  const receipt = { ...body, receiptSha256: canonicalSha256(body) };
  validateRepeatReceiptV2(receipt, originalReceipt, expectedPackage);
  return receipt;
}
