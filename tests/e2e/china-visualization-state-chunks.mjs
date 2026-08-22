import { createHash } from "node:crypto";

export const CHINA_VISUALIZATION_STATE_CHUNK_POLICY = Object.freeze({
  chunkFinalizationBudgetMs: 30_000,
  chunkSetupBudgetMs: 60_000,
  id: "china-visualization-state-chunks-v2",
  maxStatesPerChunk: 32,
  minimumChunkTimeoutMs: 120_000,
  perStateAuditBudgetMs: 15_000,
  schemaVersion: 2,
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalValue(value, path = "value") {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError(`${path} must not contain a non-finite number.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      canonicalValue(entry, `${path}[${index}]`),
    );
  }
  if (!isPlainObject(value)) {
    throw new TypeError(
      `${path} must contain only JSON-compatible plain values.`,
    );
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue(value[key], `${path}.${key}`)]),
  );
}

function sha256Canonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)))
    .digest("hex");
}

function assertNonEmptyString(label, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function assertSha256(label, value) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertUniqueNonEmptyStrings(label, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }
  values.forEach((value, index) =>
    assertNonEmptyString(`${label}[${index}]`, value),
  );
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${label} must not contain duplicates.`);
  }
}

function parseStateId(stateId, label = "state id") {
  let parsed;
  try {
    parsed = JSON.parse(stateId);
  } catch {
    throw new TypeError(
      `${label} is not valid JSON: ${JSON.stringify(stateId)}.`,
    );
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "string" ||
    parsed[0].length === 0 ||
    typeof parsed[1] !== "string" ||
    parsed[1].length === 0
  ) {
    throw new TypeError(`${label} must encode [labId, stateName].`);
  }
  return { labId: parsed[0], stateName: parsed[1] };
}

function orderedUnique(values) {
  return [...new Set(values)];
}

function assertStateSequence(stateIds) {
  assertUniqueNonEmptyStrings("state ids", stateIds);
  const parsed = stateIds.map((stateId, index) =>
    parseStateId(stateId, `state ids[${index}]`),
  );
  const labIds = orderedUnique(parsed.map(({ labId }) => labId));
  const closedLabs = new Set();
  let activeLab = null;

  for (const [index, state] of parsed.entries()) {
    if (state.labId !== activeLab) {
      if (activeLab !== null) closedLabs.add(activeLab);
      if (closedLabs.has(state.labId)) {
        throw new TypeError(
          `state ids re-open lab ${JSON.stringify(state.labId)} after its contiguous range closed.`,
        );
      }
      activeLab = state.labId;
    }
    const previous = parsed[index - 1];
    if (previous?.labId === state.labId && previous.stateName === "reset") {
      throw new TypeError(
        `${state.labId} contains a state after its terminal reset receipt.`,
      );
    }
  }

  for (const labId of labIds) {
    const owned = parsed.filter((state) => state.labId === labId);
    if (owned[0]?.stateName !== "default") {
      throw new TypeError(`${labId} must start with its default state.`);
    }
    if (owned.at(-1)?.stateName !== "reset") {
      throw new TypeError(
        `${labId} must end with exactly one terminal reset state.`,
      );
    }
    if (owned.filter(({ stateName }) => stateName === "reset").length !== 1) {
      throw new TypeError(`${labId} must contain exactly one reset state.`);
    }
  }

  return { labIds, parsed };
}

function normalizeScope(scope, labCount, stateCount) {
  if (!isPlainObject(scope))
    throw new TypeError("scope must be a plain object.");
  const selection = scope.selection;
  if (selection !== "full" && selection !== "partial") {
    throw new TypeError("scope.selection must be full or partial.");
  }
  const filters = scope.filters ?? [];
  if (!Array.isArray(filters))
    throw new TypeError("scope.filters must be an array.");
  filters.forEach((filter, index) =>
    assertNonEmptyString(`scope.filters[${index}]`, filter),
  );
  if (new Set(filters).size !== filters.length) {
    throw new TypeError("scope.filters must not contain duplicates.");
  }
  const integerFields = [
    ["catalogLabCount", scope.catalogLabCount],
    ["catalogStateCount", scope.catalogStateCount],
    ["shardIndex", scope.shardIndex],
    ["shardTotal", scope.shardTotal],
  ];
  for (const [label, value] of integerFields) {
    const allowsZero = label === "shardIndex";
    if (!Number.isInteger(value) || (allowsZero ? value < 0 : value <= 0)) {
      throw new TypeError(
        `scope.${label} must be ${allowsZero ? "a non-negative" : "a positive"} integer.`,
      );
    }
  }
  if (scope.shardIndex >= scope.shardTotal) {
    throw new TypeError(
      "scope.shardIndex must be smaller than scope.shardTotal.",
    );
  }
  const normalized = {
    catalogLabCount: scope.catalogLabCount,
    catalogStateCount: scope.catalogStateCount,
    filters: [...filters],
    selection,
    selectedLabCount: labCount,
    selectedStateCount: stateCount,
    shardIndex: scope.shardIndex,
    shardTotal: scope.shardTotal,
  };
  const releaseAcceptance =
    selection === "full" &&
    filters.length === 0 &&
    scope.shardIndex === 0 &&
    scope.shardTotal === 1 &&
    scope.catalogLabCount === labCount &&
    scope.catalogStateCount === stateCount;
  if (selection === "full" && !releaseAcceptance) {
    throw new TypeError(
      "A full scope must have no filters, one unsharded run, and exact catalog lab/state counts.",
    );
  }
  return { normalized, releaseAcceptance };
}

export function chinaVisualizationStateChunkTimeoutMs(stateCount) {
  if (
    !Number.isInteger(stateCount) ||
    stateCount <= 0 ||
    stateCount > CHINA_VISUALIZATION_STATE_CHUNK_POLICY.maxStatesPerChunk
  ) {
    throw new TypeError(
      `stateCount must be an integer from 1 to ${CHINA_VISUALIZATION_STATE_CHUNK_POLICY.maxStatesPerChunk}; received ${String(stateCount)}.`,
    );
  }
  const policy = CHINA_VISUALIZATION_STATE_CHUNK_POLICY;
  return Math.max(
    policy.minimumChunkTimeoutMs,
    policy.chunkSetupBudgetMs +
      stateCount * policy.perStateAuditBudgetMs +
      policy.chunkFinalizationBudgetMs,
  );
}

function chunkDescriptors(stateIds, parsedStates, identity) {
  const chunks = [];
  const chunkSize = CHINA_VISUALIZATION_STATE_CHUNK_POLICY.maxStatesPerChunk;
  for (
    let stateOffset = 0;
    stateOffset < stateIds.length;
    stateOffset += chunkSize
  ) {
    const chunkStateIds = stateIds.slice(stateOffset, stateOffset + chunkSize);
    const chunkParsedStates = parsedStates.slice(
      stateOffset,
      stateOffset + chunkSize,
    );
    const index = chunks.length;
    const stateEndExclusive = stateOffset + chunkStateIds.length;
    const descriptorCore = {
      auditPlanSha256: identity.auditPlanSha256,
      buildSha256: identity.buildSha256,
      cellSha256: identity.cellSha256,
      id: `${identity.cellId}:state-chunk:${String(index).padStart(4, "0")}`,
      index,
      labIds: orderedUnique(chunkParsedStates.map(({ labId }) => labId)),
      requiresFreshPage: true,
      requiresIndependentMount: true,
      runSha256: identity.runSha256,
      stateCount: chunkStateIds.length,
      stateEndExclusive,
      stateIds: chunkStateIds,
      stateOffset,
      statePlanSha256: sha256Canonical(chunkStateIds),
      timeoutMs: chinaVisualizationStateChunkTimeoutMs(chunkStateIds.length),
    };
    chunks.push({
      ...descriptorCore,
      chunkPlanSha256: sha256Canonical(descriptorCore),
    });
  }
  return chunks;
}

function planHashInput(plan) {
  return {
    auditIds: plan.auditIds,
    auditPlanSha256: plan.auditPlanSha256,
    buildId: plan.buildId,
    buildSha256: plan.buildSha256,
    cell: plan.cell,
    cellSha256: plan.cellSha256,
    chunkPlans: plan.chunks.map(
      ({ runPlanSha256: _ignored, ...chunk }) => chunk,
    ),
    policy: plan.policy,
    releaseAcceptance: plan.releaseAcceptance,
    resetPlanSha256: plan.resetPlanSha256,
    resetStateIds: plan.resetStateIds,
    runId: plan.runId,
    runSha256: plan.runSha256,
    schemaVersion: plan.schemaVersion,
    scope: plan.scope,
    stateIds: plan.stateIds,
    statePlanSha256: plan.statePlanSha256,
  };
}

export function buildChinaVisualizationStateChunkPlan({
  auditIds,
  buildId,
  cell,
  runId,
  scope,
  stateIds,
}) {
  assertUniqueNonEmptyStrings("audit ids", auditIds);
  assertNonEmptyString("buildId", buildId);
  assertNonEmptyString("runId", runId);
  if (!isPlainObject(cell)) throw new TypeError("cell must be a plain object.");
  assertNonEmptyString("cell.id", cell.id);
  const canonicalCell = canonicalValue(cell, "cell");
  const { labIds, parsed } = assertStateSequence(stateIds);
  const { normalized: normalizedScope, releaseAcceptance } = normalizeScope(
    scope,
    labIds.length,
    stateIds.length,
  );
  const identity = {
    auditPlanSha256: sha256Canonical(auditIds),
    buildSha256: sha256Canonical({ buildId }),
    cellId: cell.id,
    cellSha256: sha256Canonical(canonicalCell),
    runSha256: sha256Canonical({ runId }),
  };
  const chunks = chunkDescriptors(stateIds, parsed, identity);
  const resetStateIds = stateIds.filter(
    (stateId, index) => parsed[index].stateName === "reset",
  );
  const partialPlan = {
    auditIds: [...auditIds],
    auditPlanSha256: identity.auditPlanSha256,
    buildId,
    buildSha256: identity.buildSha256,
    cell: canonicalCell,
    cellSha256: identity.cellSha256,
    chunkCount: chunks.length,
    chunks,
    policy: CHINA_VISUALIZATION_STATE_CHUNK_POLICY,
    releaseAcceptance,
    resetPlanSha256: sha256Canonical(resetStateIds),
    resetStateIds,
    runId,
    runSha256: identity.runSha256,
    schemaVersion: CHINA_VISUALIZATION_STATE_CHUNK_POLICY.schemaVersion,
    scope: normalizedScope,
    stateCount: stateIds.length,
    stateIds: [...stateIds],
    statePlanSha256: sha256Canonical(stateIds),
  };
  const runPlanSha256 = sha256Canonical(planHashInput(partialPlan));
  const frozenChunks = chunks.map((chunk) =>
    Object.freeze({ ...chunk, runPlanSha256 }),
  );
  return Object.freeze({
    ...partialPlan,
    auditIds: Object.freeze([...partialPlan.auditIds]),
    cell: Object.freeze({ ...partialPlan.cell }),
    chunks: Object.freeze(frozenChunks),
    policy: CHINA_VISUALIZATION_STATE_CHUNK_POLICY,
    resetStateIds: Object.freeze([...resetStateIds]),
    runPlanSha256,
    scope: Object.freeze({
      ...normalizedScope,
      filters: Object.freeze([...normalizedScope.filters]),
    }),
    stateIds: Object.freeze([...stateIds]),
  });
}

export function validateChinaVisualizationStateChunkPlan(plan) {
  const errors = [];
  if (!isPlainObject(plan)) return ["state-chunk plan is missing or malformed"];
  try {
    const rebuilt = buildChinaVisualizationStateChunkPlan({
      auditIds: plan.auditIds,
      buildId: plan.buildId,
      cell: plan.cell,
      runId: plan.runId,
      scope: {
        catalogLabCount: plan.scope?.catalogLabCount,
        catalogStateCount: plan.scope?.catalogStateCount,
        filters: plan.scope?.filters,
        selection: plan.scope?.selection,
        shardIndex: plan.scope?.shardIndex,
        shardTotal: plan.scope?.shardTotal,
      },
      stateIds: plan.stateIds,
    });
    if (JSON.stringify(plan) !== JSON.stringify(rebuilt)) {
      errors.push(
        "state-chunk plan counts, offsets, order, policy, timeout, or hashes drifted",
      );
    }
  } catch (error) {
    errors.push(
      `state-chunk plan cannot be reconstructed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return errors;
}

function validateAuditReceipts(auditReceipts, plan, prefix, errors) {
  if (
    !Array.isArray(auditReceipts) ||
    auditReceipts.length !== plan.auditIds.length
  ) {
    errors.push(`${prefix} does not contain every mandatory audit receipt`);
    return;
  }
  auditReceipts.forEach((auditReceipt, index) => {
    const auditId = plan.auditIds[index];
    if (
      !isPlainObject(auditReceipt) ||
      auditReceipt.auditId !== auditId ||
      auditReceipt.status !== "passed" ||
      !SHA256_PATTERN.test(auditReceipt.evidenceSha256 ?? "")
    ) {
      errors.push(
        `${prefix} audit ${index} is missing, failed, out of order, or lacks evidence`,
      );
    }
  });
}

function validateStateReceipt(
  stateReceipt,
  expectedStateId,
  expectedStateIndex,
  chunkStateIndex,
  plan,
  errors,
) {
  const prefix = `state receipt ${expectedStateIndex}`;
  if (!isPlainObject(stateReceipt)) {
    errors.push(`${prefix} is missing or malformed`);
    return;
  }
  if (
    stateReceipt.stateId !== expectedStateId ||
    stateReceipt.stateIndex !== expectedStateIndex ||
    stateReceipt.chunkStateIndex !== chunkStateIndex
  ) {
    errors.push(
      `${prefix} has a gap, overlap, duplicate, or out-of-order identity`,
    );
  }
  if (stateReceipt.executionStatus !== "executed") {
    errors.push(`${prefix} was not executed and cannot earn a receipt`);
  }
  for (const field of [
    "requestedStateSha256",
    "observedBeforeSha256",
    "observedAfterSha256",
  ]) {
    if (!SHA256_PATTERN.test(stateReceipt[field] ?? "")) {
      errors.push(`${prefix} ${field} is not a SHA-256 digest`);
    }
  }
  if (
    stateReceipt.requestedStateSha256 !== stateReceipt.observedBeforeSha256 ||
    stateReceipt.requestedStateSha256 !== stateReceipt.observedAfterSha256
  ) {
    errors.push(
      `${prefix} requested/before/after signatures do not match exactly`,
    );
  }
  validateAuditReceipts(stateReceipt.auditReceipts, plan, prefix, errors);
  const { stateName } = parseStateId(expectedStateId, prefix);
  if (stateName === "reset") {
    if (
      !isPlainObject(stateReceipt.resetReceipt) ||
      stateReceipt.resetReceipt.status !== "passed" ||
      stateReceipt.resetReceipt.stateId !== expectedStateId ||
      !SHA256_PATTERN.test(stateReceipt.resetReceipt.evidenceSha256 ?? "")
    ) {
      errors.push(
        `${prefix} is terminal reset but lacks its reset evidence receipt`,
      );
    }
  } else if (stateReceipt.resetReceipt !== null) {
    errors.push(`${prefix} is not reset but carries a reset receipt`);
  }
}

export function createChinaVisualizationStateChunkReceipt({
  auditEvidenceByStateId,
  chunkIndex,
  mountEvidenceByLabId,
  observedAfterByStateId,
  observedBeforeByStateId,
  pageInstanceId,
  plan,
  requestedByStateId,
  resetEvidenceByStateId,
  terminalStatus = "completed",
}) {
  const planErrors = validateChinaVisualizationStateChunkPlan(plan);
  if (planErrors.length > 0) throw new TypeError(planErrors.join("; "));
  const chunk = plan.chunks[chunkIndex];
  if (!chunk)
    throw new RangeError(
      `chunkIndex ${String(chunkIndex)} is outside the plan.`,
    );
  assertNonEmptyString("pageInstanceId", pageInstanceId);
  if (terminalStatus !== "completed") {
    throw new TypeError(
      "Only a completed chunk may issue an acceptance receipt.",
    );
  }
  const stateReceipts = chunk.stateIds.map((stateId, chunkStateIndex) => {
    const stateIndex = chunk.stateOffset + chunkStateIndex;
    const requestedStateSha256 = requestedByStateId?.[stateId];
    const observedBeforeSha256 = observedBeforeByStateId?.[stateId];
    const observedAfterSha256 = observedAfterByStateId?.[stateId];
    assertSha256(`${stateId} requested state`, requestedStateSha256);
    assertSha256(`${stateId} observed-before state`, observedBeforeSha256);
    assertSha256(`${stateId} observed-after state`, observedAfterSha256);
    if (
      requestedStateSha256 !== observedBeforeSha256 ||
      requestedStateSha256 !== observedAfterSha256
    ) {
      throw new TypeError(
        `${stateId} did not retain its exact requested signature before and after audits.`,
      );
    }
    const auditEvidence = auditEvidenceByStateId?.[stateId];
    if (!isPlainObject(auditEvidence)) {
      throw new TypeError(`${stateId} has no mandatory audit evidence map.`);
    }
    const auditReceipts = plan.auditIds.map((auditId) => {
      const evidenceSha256 = auditEvidence[auditId];
      assertSha256(`${stateId} ${auditId} evidence`, evidenceSha256);
      return Object.freeze({ auditId, evidenceSha256, status: "passed" });
    });
    const { stateName } = parseStateId(stateId);
    let resetReceipt = null;
    if (stateName === "reset") {
      const evidenceSha256 = resetEvidenceByStateId?.[stateId];
      assertSha256(`${stateId} reset evidence`, evidenceSha256);
      resetReceipt = Object.freeze({
        evidenceSha256,
        stateId,
        status: "passed",
      });
    }
    return Object.freeze({
      auditReceipts: Object.freeze(auditReceipts),
      chunkStateIndex,
      executionStatus: "executed",
      observedAfterSha256,
      observedBeforeSha256,
      requestedStateSha256,
      resetReceipt,
      stateId,
      stateIndex,
    });
  });
  const mountReceipts = chunk.labIds.map((labId) => {
    const evidenceSha256 = mountEvidenceByLabId?.[labId];
    assertSha256(`${labId} mount evidence`, evidenceSha256);
    return Object.freeze({
      evidenceSha256,
      labId,
      pageInstanceId,
      status: "mounted",
    });
  });
  return Object.freeze({
    auditPlanSha256: plan.auditPlanSha256,
    buildSha256: plan.buildSha256,
    cellSha256: plan.cellSha256,
    chunkId: chunk.id,
    chunkIndex,
    chunkPlanSha256: chunk.chunkPlanSha256,
    freshPage: true,
    independentMount: true,
    mountReceipts: Object.freeze(mountReceipts),
    pageInstanceId,
    runPlanSha256: plan.runPlanSha256,
    runSha256: plan.runSha256,
    schemaVersion: plan.schemaVersion,
    statePlanSha256: chunk.statePlanSha256,
    stateReceipts: Object.freeze(stateReceipts),
    terminalStatus,
    timeoutMs: chunk.timeoutMs,
  });
}

export function validateChinaVisualizationStateChunkReceipts({
  plan,
  receipts,
  requireReleaseAcceptance = true,
}) {
  const errors = validateChinaVisualizationStateChunkPlan(plan);
  if (errors.length > 0) return errors;
  if (requireReleaseAcceptance && !plan.releaseAcceptance) {
    errors.push(
      "filtered, sharded, or partial state-chunk scope cannot satisfy full release acceptance",
    );
  }
  if (!Array.isArray(receipts))
    return [...errors, "state-chunk receipts are missing or malformed"];
  if (receipts.length !== plan.chunkCount) {
    errors.push(
      "state-chunk receipt count is partial or contains unexpected chunks",
    );
  }
  const seenChunkIds = new Set();
  const seenPageInstanceIds = new Set();
  const executedStateIds = [];
  const resetStateIds = [];

  for (const [index, chunk] of plan.chunks.entries()) {
    const receipt = receipts[index];
    if (!isPlainObject(receipt)) {
      errors.push(`chunk receipt ${index} is missing or malformed`);
      continue;
    }
    if (seenChunkIds.has(receipt.chunkId))
      errors.push(`chunk receipt ${index} duplicates a chunk id`);
    seenChunkIds.add(receipt.chunkId);
    if (
      typeof receipt.pageInstanceId !== "string" ||
      receipt.pageInstanceId.length === 0 ||
      seenPageInstanceIds.has(receipt.pageInstanceId)
    ) {
      errors.push(
        `chunk receipt ${index} does not prove one unique fresh page`,
      );
    }
    seenPageInstanceIds.add(receipt.pageInstanceId);
    if (
      receipt.schemaVersion !== plan.schemaVersion ||
      receipt.chunkId !== chunk.id ||
      receipt.chunkIndex !== index ||
      receipt.chunkPlanSha256 !== chunk.chunkPlanSha256 ||
      receipt.statePlanSha256 !== chunk.statePlanSha256 ||
      receipt.auditPlanSha256 !== plan.auditPlanSha256 ||
      receipt.cellSha256 !== plan.cellSha256 ||
      receipt.buildSha256 !== plan.buildSha256 ||
      receipt.runSha256 !== plan.runSha256 ||
      receipt.runPlanSha256 !== plan.runPlanSha256
    ) {
      errors.push(
        `chunk receipt ${index} has wrong plan, audit, cell, build, or run hashes`,
      );
    }
    if (
      receipt.timeoutMs !== chunk.timeoutMs ||
      receipt.freshPage !== true ||
      receipt.independentMount !== true ||
      receipt.terminalStatus !== "completed"
    ) {
      errors.push(
        `chunk receipt ${index} has timeout drift, reused page semantics, or an interrupted terminal status`,
      );
    }
    if (
      !Array.isArray(receipt.mountReceipts) ||
      receipt.mountReceipts.length !== chunk.labIds.length
    ) {
      errors.push(
        `chunk receipt ${index} lacks every independent Lab mount receipt`,
      );
    } else {
      receipt.mountReceipts.forEach((mountReceipt, mountIndex) => {
        if (
          !isPlainObject(mountReceipt) ||
          mountReceipt.labId !== chunk.labIds[mountIndex] ||
          mountReceipt.pageInstanceId !== receipt.pageInstanceId ||
          mountReceipt.status !== "mounted" ||
          !SHA256_PATTERN.test(mountReceipt.evidenceSha256 ?? "")
        ) {
          errors.push(
            `chunk receipt ${index} mount ${mountIndex} is missing, out of order, or unproven`,
          );
        }
      });
    }
    if (
      !Array.isArray(receipt.stateReceipts) ||
      receipt.stateReceipts.length !== chunk.stateCount
    ) {
      errors.push(
        `chunk receipt ${index} is partial or contains unexpected state receipts`,
      );
      continue;
    }
    receipt.stateReceipts.forEach((stateReceipt, chunkStateIndex) => {
      const expectedStateId = chunk.stateIds[chunkStateIndex];
      const expectedStateIndex = chunk.stateOffset + chunkStateIndex;
      validateStateReceipt(
        stateReceipt,
        expectedStateId,
        expectedStateIndex,
        chunkStateIndex,
        plan,
        errors,
      );
      if (isPlainObject(stateReceipt)) {
        executedStateIds.push(stateReceipt.stateId);
        if (stateReceipt.resetReceipt !== null)
          resetStateIds.push(stateReceipt.stateId);
      }
    });
  }

  if (JSON.stringify(executedStateIds) !== JSON.stringify(plan.stateIds)) {
    errors.push(
      "executed state receipts have a gap, overlap, duplicate, or out-of-order aggregate",
    );
  }
  if (JSON.stringify(resetStateIds) !== JSON.stringify(plan.resetStateIds)) {
    errors.push(
      "terminal reset receipts are missing, duplicated, or out of order",
    );
  }
  return errors;
}

export function aggregateChinaVisualizationStateChunkReceipts(options) {
  const errors = validateChinaVisualizationStateChunkReceipts(options);
  if (errors.length > 0) {
    throw new Error(
      `China Visualization state-chunk receipts rejected: ${errors.join("; ")}.`,
    );
  }
  const { plan, receipts } = options;
  return Object.freeze({
    auditPlanSha256: plan.auditPlanSha256,
    buildSha256: plan.buildSha256,
    cellSha256: plan.cellSha256,
    chunkCount: plan.chunkCount,
    executedStateCount: plan.stateCount,
    pageInstanceCount: new Set(
      receipts.map(({ pageInstanceId }) => pageInstanceId),
    ).size,
    resetReceiptCount: plan.resetStateIds.length,
    runPlanSha256: plan.runPlanSha256,
    runSha256: plan.runSha256,
    schemaVersion: plan.schemaVersion,
    statePlanSha256: plan.statePlanSha256,
    status: "complete",
  });
}
