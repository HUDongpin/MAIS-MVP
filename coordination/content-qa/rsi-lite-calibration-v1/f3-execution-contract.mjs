export const F3_EXECUTION_AMENDMENT_ID = "MAIS-RSI-LITE-CAL-V1-F3-1";

const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
const PROTOCOL_VERSION = "1.1.1-f2-r";
const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const ARMS = Object.freeze(["A", "B", "C0", "C"]);
const ROLE_CALLS_PER_RUN = Object.freeze({ A: 0, B: 2, C0: 5, C: 5 });
const FORBIDDEN_ROLE_KEYS = new Set([
  "arm",
  "variantId",
  "latentBundleId",
  "defectBlock",
  "gold",
  "goldLedger",
  "randomizationSeed",
  "seed"
]);

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

function roundUp(value, increment) {
  return Math.ceil(value / increment) * increment;
}

function finiteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}

function costUsd({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }, prices) {
  return (
    promptCacheHitTokens * prices.inputCacheHit
    + promptCacheMissTokens * prices.inputCacheMiss
    + outputTokens * prices.output
  ) / 1_000_000;
}

function packageIdentity(packageContent) {
  return {
    packageId: packageContent.packageId,
    protocolId: packageContent.protocolId,
    protocolVersion: packageContent.protocolVersion,
    sourceBaseline: packageContent.sourceBaseline,
    region: packageContent.region,
    curriculumTrack: packageContent.curriculumTrack,
    publisher: packageContent.publisher,
    gradeBand: packageContent.gradeBand
  };
}

function solverQuestion(question) {
  return {
    id: question.id,
    type: question.type,
    gradeBand: question.gradeBand,
    standardIds: structuredClone(question.standardIds ?? []),
    prompt: structuredClone(question.prompt),
    ...(question.options ? { options: structuredClone(question.options) } : {})
  };
}

function toolQuestion(question) {
  return {
    id: question.id,
    type: question.type,
    prompt: structuredClone(question.prompt),
    answer: question.answer,
    acceptedAnswers: structuredClone(question.acceptedAnswers ?? []),
    answerContract: structuredClone(question.answerContract ?? {}),
    ...(question.options ? { options: structuredClone(question.options) } : {})
  };
}

function adversarialQuestion(question) {
  return {
    id: question.id,
    type: question.type,
    prompt: structuredClone(question.prompt),
    answer: question.answer,
    acceptedAnswers: structuredClone(question.acceptedAnswers ?? []),
    explanation: structuredClone(question.explanation),
    misconceptionMap: structuredClone(question.misconceptionMap ?? {})
  };
}

function bilingualQuestion(question) {
  return {
    id: question.id,
    gradeBand: question.gradeBand,
    standardIds: structuredClone(question.standardIds ?? []),
    alignment: structuredClone(question.alignment ?? {}),
    prompt: structuredClone(question.prompt),
    ...(question.options ? { options: structuredClone(question.options) } : {})
  };
}

function evidenceQuestion(question) {
  return {
    id: question.id,
    prompt: structuredClone(question.prompt),
    evidenceSurface: structuredClone(question.evidenceSurface ?? {}),
    templateTrace: structuredClone(question.templateTrace ?? {}),
    validation: structuredClone(question.validation ?? {})
  };
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const row of value) collectKeys(row, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

export function buildF3RunPlan({ sealedManifest, publicManifest }) {
  assertRecord(sealedManifest, "sealed manifest");
  assertRecord(publicManifest, "public manifest");
  for (const [label, value] of [["sealed manifest", sealedManifest], ["public manifest", publicManifest]]) {
    if (value.protocolId !== PROTOCOL_ID || value.protocolVersion !== PROTOCOL_VERSION) throw new Error(`${label} protocol drifted.`);
    if (value.sourceBaseline !== SOURCE_BASELINE) throw new Error(`${label} source baseline drifted.`);
    assertSha256(value.candidateSetSha256, `${label} candidate-set commitment`);
  }
  if (sealedManifest.candidateSetSha256 !== publicManifest.candidateSetSha256) throw new Error("Candidate-set commitment differs between sealed and public manifests.");
  if (!Array.isArray(sealedManifest.packageAssignments) || sealedManifest.packageAssignments.length !== 48) {
    throw new Error("F3 requires exactly 48 sealed package assignments.");
  }
  if (!Array.isArray(publicManifest.packages) || publicManifest.packages.length !== 48) {
    throw new Error("F3 requires exactly 48 public package commitments.");
  }
  const publicById = new Map(publicManifest.packages.map((row) => [row.packageId, row]));
  if (publicById.size !== 48) throw new Error("Public manifest contains a duplicate package commitment.");
  const seen = new Set();
  const plan = sealedManifest.packageAssignments.map((assignment) => {
    if (seen.has(assignment.packageId)) throw new Error(`Duplicate package assignment: ${assignment.packageId}`);
    seen.add(assignment.packageId);
    if (!ARMS.includes(assignment.arm)) throw new Error(`Unknown arm in package assignment: ${assignment.arm}`);
    const publicRow = publicById.get(assignment.packageId);
    if (!publicRow) throw new Error(`Package assignment is absent from the public manifest: ${assignment.packageId}`);
    assertSha256(publicRow.contentSha256, `content commitment for ${assignment.packageId}`);
    return {
      packageId: assignment.packageId,
      latentBundleId: assignment.latentBundleId,
      region: assignment.region,
      variantId: assignment.variantId,
      arm: assignment.arm,
      contentSha256: publicRow.contentSha256
    };
  });
  const counts = Object.fromEntries(ARMS.map((arm) => [arm, plan.filter((row) => row.arm === arm).length]));
  if (ARMS.some((arm) => counts[arm] !== 12)) throw new Error(`F3 arm balance must be exactly 12 per arm: ${JSON.stringify(counts)}`);
  return plan.sort((left, right) => left.packageId.localeCompare(right.packageId));
}

export function buildRoleProjection({ role, packageContent }) {
  assertRecord(packageContent, "package content");
  if (!Array.isArray(packageContent.questions) || !Array.isArray(packageContent.lessons)) throw new Error("Package questions and lessons are required.");
  const base = packageIdentity(packageContent);
  let projection;
  if (role === "answer-blind-solver") {
    projection = { ...base, questions: packageContent.questions.map(solverQuestion) };
  } else if (role === "tool-verifier") {
    projection = { ...base, questions: packageContent.questions.map(toolQuestion) };
  } else if (role === "adversarial-grader") {
    projection = { ...base, questions: packageContent.questions.map(adversarialQuestion) };
  } else if (role === "bilingual-curriculum-critic") {
    projection = {
      ...base,
      questions: packageContent.questions.map(bilingualQuestion),
      lessons: packageContent.lessons.map((lesson) => ({
        id: lesson.id,
        gradeBand: lesson.gradeBand,
        alignment: structuredClone(lesson.alignment ?? {}),
        title: structuredClone(lesson.title)
      }))
    };
  } else if (role === "evidence-verifier") {
    projection = {
      ...base,
      questions: packageContent.questions.map(evidenceQuestion),
      lessons: structuredClone(packageContent.lessons)
    };
  } else if (role === "same-reviewer-critique" || role === "same-reviewer-revision") {
    projection = structuredClone(packageContent);
  } else {
    throw new Error(`Unknown F3 role: ${role}`);
  }
  const leakedKey = collectKeys(projection).find((key) => FORBIDDEN_ROLE_KEYS.has(key));
  if (leakedKey) throw new Error(`Forbidden concealed key leaked into role projection: ${leakedKey}`);
  return projection;
}

export function estimateF3Budget({
  runCountsByArm,
  estimatedInputTokensPerProviderCall,
  maxOutputTokensPerProviderCall,
  pricesUsdPerMillion
}) {
  for (const arm of ARMS) finiteNonnegative(runCountsByArm?.[arm], `${arm} run count`);
  finiteNonnegative(estimatedInputTokensPerProviderCall, "estimated input tokens per call");
  finiteNonnegative(maxOutputTokensPerProviderCall, "maximum output tokens per call");
  const plannedProviderCalls = ARMS.reduce((sum, arm) => sum + runCountsByArm[arm] * ROLE_CALLS_PER_RUN[arm], 0);
  const plannedInputTokens = plannedProviderCalls * estimatedInputTokensPerProviderCall;
  const plannedMaxOutputTokens = plannedProviderCalls * maxOutputTokensPerProviderCall;
  const expectedOffPeakCostUsd = Number((
    plannedInputTokens * pricesUsdPerMillion.offPeakInputCacheMiss / 1_000_000
    + plannedMaxOutputTokens * pricesUsdPerMillion.offPeakOutput / 1_000_000
  ).toFixed(6));
  const peakCostBeforeSafetyUsd = Number((
    plannedInputTokens * pricesUsdPerMillion.peakInputCacheMiss / 1_000_000
    + plannedMaxOutputTokens * pricesUsdPerMillion.peakOutput / 1_000_000
  ).toFixed(6));
  const safetyMultiplier = 1.35;
  return {
    plannedProviderCalls,
    plannedInputTokens,
    plannedMaxOutputTokens,
    expectedOffPeakCostUsd,
    peakCostBeforeSafetyUsd,
    safetyMultiplier,
    providerCallCap: Math.max(200, roundUp(plannedProviderCalls * safetyMultiplier, 10)),
    tokenCap: Math.max(30_000_000, roundUp((plannedInputTokens + plannedMaxOutputTokens) * safetyMultiplier, 10_000_000)),
    currencyCapUsd: Math.max(50, roundUp(peakCostBeforeSafetyUsd * safetyMultiplier, 5)),
    wallClockMinutesCap: 720,
    activeMachineMinutesCap: 720,
    operationalHumanMinutesCap: 120,
    browserMinutesCap: 0
  };
}

export function assertBudgetReservationAllowed({ usage, reservation, caps, pricesUsdPerMillion }) {
  const nextCalls = finiteNonnegative(usage.providerCalls, "used provider calls") + finiteNonnegative(reservation.providerCalls, "reserved provider calls");
  if (nextCalls > caps.providerCallCap) throw new Error(`Provider-call cap would be exceeded (${nextCalls} > ${caps.providerCallCap}).`);
  const usedTokens = finiteNonnegative(usage.promptCacheHitTokens, "used cache-hit tokens")
    + finiteNonnegative(usage.promptCacheMissTokens, "used cache-miss tokens")
    + finiteNonnegative(usage.outputTokens, "used output tokens");
  const reservedTokens = finiteNonnegative(reservation.maxInputTokens, "reserved input tokens")
    + finiteNonnegative(reservation.maxOutputTokens, "reserved output tokens");
  if (usedTokens + reservedTokens > caps.tokenCap) throw new Error(`Token cap would be exceeded (${usedTokens + reservedTokens} > ${caps.tokenCap}).`);
  const worstReservationCost = (
    reservation.maxInputTokens * pricesUsdPerMillion.inputCacheMiss
    + reservation.maxOutputTokens * pricesUsdPerMillion.output
  ) / 1_000_000;
  const projectedCost = finiteNonnegative(usage.apiCostUsd, "used API cost") + worstReservationCost;
  if (projectedCost > caps.currencyCapUsd) throw new Error(`Currency cap would be exceeded (${projectedCost} > ${caps.currencyCapUsd}).`);
  return true;
}

export function accumulateProviderUsage({ usage, providerUsage, pricesUsdPerMillion }) {
  const promptCacheHitTokens = finiteNonnegative(providerUsage.promptCacheHitTokens ?? 0, "provider cache-hit tokens");
  const promptCacheMissTokens = finiteNonnegative(providerUsage.promptCacheMissTokens ?? 0, "provider cache-miss tokens");
  const outputTokens = finiteNonnegative(providerUsage.completionTokens ?? 0, "provider completion tokens");
  return {
    providerCalls: finiteNonnegative(usage.providerCalls, "used provider calls") + 1,
    promptCacheHitTokens: finiteNonnegative(usage.promptCacheHitTokens, "used cache-hit tokens") + promptCacheHitTokens,
    promptCacheMissTokens: finiteNonnegative(usage.promptCacheMissTokens, "used cache-miss tokens") + promptCacheMissTokens,
    outputTokens: finiteNonnegative(usage.outputTokens, "used output tokens") + outputTokens,
    apiCostUsd: Number((finiteNonnegative(usage.apiCostUsd, "used API cost") + costUsd({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }, pricesUsdPerMillion)).toFixed(9))
  };
}

export function validateRoleResult({ result, role, packageId, expectedSurfaceIds }) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  if (!result || typeof result !== "object" || Array.isArray(result)) return [{ code: "result-shape", detail: "Role result must be an object." }];
  const forbidden = collectKeys(result).find((key) => FORBIDDEN_ROLE_KEYS.has(key));
  if (forbidden) push("forbidden-result-field", `Role result contains forbidden field ${forbidden}.`);
  if (result.schemaVersion !== 1) push("schema-version", "Role result schemaVersion must be 1.");
  if (result.role !== role) push("role-binding", "Role result does not match the assigned role.");
  if (result.packageId !== packageId) push("package-binding", "Role result does not match the assigned package.");
  const expected = [...expectedSurfaceIds];
  const expectedSet = new Set(expected);
  const inspected = Array.isArray(result.inspectedSurfaceIds) ? result.inspectedSurfaceIds : [];
  if (new Set(inspected).size !== inspected.length) push("duplicate-surface-id", "Role result contains duplicate inspected surface IDs.");
  if (inspected.some((surfaceId) => !expectedSet.has(surfaceId))) push("unknown-surface-id", "Role result inspects a surface outside its projection.");
  if (result.inspectionComplete === true && (inspected.length !== expected.length || expected.some((surfaceId) => !inspected.includes(surfaceId)))) {
    push("surface-topology", "A complete role result must enumerate every projected surface exactly once.");
  }
  const rows = Array.isArray(result.findings) ? result.findings : [];
  if (!Array.isArray(result.findings)) push("finding-shape", "Role findings must be an array.");
  const findingIds = rows.map((row) => row?.findingId);
  if (new Set(findingIds).size !== findingIds.length) push("duplicate-finding-id", "Role result contains duplicate finding IDs.");
  for (const row of rows) {
    if (!row || typeof row !== "object" || !expectedSet.has(row.surfaceId)) {
      push("finding-topology", "A finding references an unknown surface.");
      continue;
    }
    if (typeof row.findingId !== "string" || !row.findingId || !["P0", "P1", "P2", "P3"].includes(row.severity) || typeof row.code !== "string" || typeof row.detail !== "string") {
      push("finding-contract", "A finding is missing its stable ID, severity, code, or detail.");
    }
  }
  return findings;
}
