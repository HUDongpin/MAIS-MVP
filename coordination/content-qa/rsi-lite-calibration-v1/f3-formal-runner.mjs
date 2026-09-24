import { createHash, randomUUID } from "node:crypto";
import { access, chmod, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  F3_EXECUTION_AMENDMENT_ID,
  assertBudgetReservationAllowed,
  buildRoleProjection,
  validateRoleResult
} from "./f3-execution-contract.mjs";
import { buildSeatbeltProfile, sanitizeIsolationEnvironment } from "./isolation-harness.mjs";
import { runBoundedProcess } from "./process-lifecycle.mjs";

const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
const PROTOCOL_VERSION = "1.1.1-f2-r";
const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const PROVIDER_ROLES = Object.freeze([
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
]);
const MAX_INPUT_TOKENS_PER_CALL = 160_000;
const MAX_OUTPUT_TOKENS_PER_CALL = 24_000;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectionWorkerPath = path.join(scriptDirectory, "f3-role-projection-worker.mjs");
const executionContractPath = path.join(scriptDirectory, "f3-execution-contract.mjs");

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalSha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

function numericKey(value) {
  const text = String(value ?? "").trim();
  const fraction = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text);
  if (fraction && Number(fraction[2]) !== 0) return `n:${Number(fraction[1]) / Number(fraction[2])}`;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? `n:${numeric}` : `s:${text.toLowerCase()}`;
}

function deterministicFinding({ family, severity, code, surfaceId, detail }) {
  return {
    findingId: `det:${code}:${surfaceId}`,
    surfaceId,
    family,
    severity,
    code,
    detail,
    role: "deterministic-baseline"
  };
}

export function runDeterministicBaseline(packageContent) {
  if (!packageContent || typeof packageContent !== "object" || !Array.isArray(packageContent.questions) || !Array.isArray(packageContent.lessons)) {
    throw new Error("Deterministic baseline requires package questions and lessons.");
  }
  const findings = [];
  const push = (row) => findings.push(deterministicFinding(row));
  const promptGroups = new Map();
  for (const question of packageContent.questions) {
    const promptKey = stableStringify(question.prompt);
    promptGroups.set(promptKey, [...(promptGroups.get(promptKey) ?? []), question.id]);
    const candidateAnswerKey = numericKey(question.answer);
    const independentAnswerKey = numericKey(question.validation?.independentAnswer);
    const answerMismatch = candidateAnswerKey !== independentAnswerKey;
    if (answerMismatch) {
      push({ family: "F1", severity: "P0", code: "answer-independent-mismatch", surfaceId: question.id, detail: "The stored answer differs from the independently recorded answer contract." });
    }
    if (!answerMismatch && !(question.acceptedAnswers ?? []).some((answer) => numericKey(answer) === independentAnswerKey)) {
      push({ family: "F4", severity: "P0", code: "accepted-answer-false-reject", surfaceId: question.id, detail: "Accepted forms omit the independently recorded correct answer." });
    }
    if (question.type === "multiple-choice") {
      const optionKeys = (question.options ?? []).map((row) => numericKey(row?.en));
      const equivalentOptions = new Set(optionKeys).size !== optionKeys.length;
      const correctCount = optionKeys.filter((key) => key === candidateAnswerKey).length;
      if (equivalentOptions || correctCount !== 1) {
        push({ family: "F2", severity: "P1", code: "equivalent-or-multiple-correct-options", surfaceId: question.id, detail: "Multiple-choice options are not uniquely distinguishable under numeric normalization." });
      }
    }
    if (question.evidenceSurface?.visibleLabel !== question.evidenceSurface?.expectedLabel) {
      push({ family: "F5", severity: "P1", code: "evidence-label-mismatch", surfaceId: question.id, detail: "The visible static-evidence label differs from its declared content contract." });
    }
    if (question.validation?.independentAnswerProvenance !== "tool-derived-from-structured-model") {
      push({ family: "F9", severity: "P0", code: "oracle-provenance-contamination", surfaceId: question.id, detail: "The purported independent answer provenance is not independent." });
    }
  }
  for (const ids of promptGroups.values()) {
    if (ids.length > 1) {
      for (const surfaceId of ids) push({ family: "NATURAL", severity: "P2", code: "duplicate-tri-locale-prompt", surfaceId, detail: "The complete tri-locale prompt duplicates another question in this package." });
    }
  }
  const questionById = new Map(packageContent.questions.map((question) => [question.id, question]));
  for (const lesson of packageContent.lessons) {
    const question = questionById.get(lesson.workedExample?.questionId);
    if (!question) {
      push({ family: "NATURAL", severity: "P0", code: "lesson-question-missing", surfaceId: lesson.id, detail: "The lesson worked example references a missing question." });
      continue;
    }
    if (numericKey(lesson.workedExample?.answer) !== numericKey(question.validation?.independentAnswer)) {
      push({ family: "NATURAL", severity: "P1", code: "lesson-answer-mismatch", surfaceId: lesson.id, detail: "The lesson worked answer differs from the independently recorded question answer." });
    }
    if (stableStringify(lesson.workedExample?.explanation) !== stableStringify(question.explanation)) {
      push({ family: "NATURAL", severity: "P2", code: "lesson-explanation-mismatch", surfaceId: lesson.id, detail: "The lesson worked explanation differs from its linked question explanation." });
    }
  }
  const inspectedSurfaceIds = [...packageContent.questions.map((row) => row.id), ...packageContent.lessons.map((row) => row.id)];
  return {
    schemaVersion: 1,
    role: "deterministic-baseline",
    packageId: packageContent.packageId,
    inspectionComplete: true,
    inspectedSurfaceIds,
    findings: findings.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId) || left.code.localeCompare(right.code))
  };
}

function finiteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}

function usageCost({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }, prices) {
  return Number(((
    promptCacheHitTokens * prices.inputCacheHit
    + promptCacheMissTokens * prices.inputCacheMiss
    + outputTokens * prices.output
  ) / 1_000_000).toFixed(9));
}

export function createBudgetLedger({ caps, pricesUsdPerMillion, initialUsage = {} }) {
  const state = {
    providerCalls: finiteNonnegative(initialUsage.providerCalls ?? 0, "initial provider calls"),
    promptCacheHitTokens: finiteNonnegative(initialUsage.promptCacheHitTokens ?? 0, "initial cache-hit tokens"),
    promptCacheMissTokens: finiteNonnegative(initialUsage.promptCacheMissTokens ?? 0, "initial cache-miss tokens"),
    outputTokens: finiteNonnegative(initialUsage.outputTokens ?? 0, "initial output tokens"),
    apiCostUsd: finiteNonnegative(initialUsage.apiCostUsd ?? 0, "initial API cost"),
    conservativeFailureDebitTokens: finiteNonnegative(initialUsage.conservativeFailureDebitTokens ?? 0, "initial conservative failure tokens"),
    conservativeFailureDebitUsd: finiteNonnegative(initialUsage.conservativeFailureDebitUsd ?? 0, "initial conservative failure cost")
  };
  const reservations = new Map();

  function activeTotals() {
    return [...reservations.values()].reduce((totals, row) => ({
      inputTokens: totals.inputTokens + row.maxInputTokens,
      outputTokens: totals.outputTokens + row.maxOutputTokens,
      costUsd: totals.costUsd + row.worstCostUsd
    }), { inputTokens: 0, outputTokens: 0, costUsd: 0 });
  }

  function capUsage() {
    const active = activeTotals();
    return {
      providerCalls: state.providerCalls,
      promptCacheHitTokens: state.promptCacheHitTokens,
      promptCacheMissTokens: state.promptCacheMissTokens + state.conservativeFailureDebitTokens + active.inputTokens,
      outputTokens: state.outputTokens + active.outputTokens,
      apiCostUsd: state.apiCostUsd + state.conservativeFailureDebitUsd + active.costUsd
    };
  }

  function reservationFor(id) {
    const row = reservations.get(id);
    if (!row) throw new Error("Unknown or already settled provider reservation.");
    return row;
  }

  return Object.freeze({
    reserve({ maxInputTokens, maxOutputTokens }) {
      finiteNonnegative(maxInputTokens, "reserved input tokens");
      finiteNonnegative(maxOutputTokens, "reserved output tokens");
      assertBudgetReservationAllowed({
        usage: capUsage(),
        reservation: { providerCalls: 1, maxInputTokens, maxOutputTokens },
        caps,
        pricesUsdPerMillion
      });
      const id = randomUUID();
      const worstCostUsd = usageCost({ promptCacheHitTokens: 0, promptCacheMissTokens: maxInputTokens, outputTokens: maxOutputTokens }, pricesUsdPerMillion);
      reservations.set(id, { id, maxInputTokens, maxOutputTokens, worstCostUsd });
      state.providerCalls += 1;
      return Object.freeze({ id });
    },
    settleSuccess(reservation, providerUsage) {
      const row = reservationFor(reservation.id);
      const promptCacheHitTokens = finiteNonnegative(providerUsage.promptCacheHitTokens ?? 0, "provider cache-hit tokens");
      const promptCacheMissTokens = finiteNonnegative(providerUsage.promptCacheMissTokens ?? 0, "provider cache-miss tokens");
      const outputTokens = finiteNonnegative(providerUsage.completionTokens ?? 0, "provider completion tokens");
      if (promptCacheHitTokens + promptCacheMissTokens > row.maxInputTokens || outputTokens > row.maxOutputTokens) {
        throw new Error("Provider reported usage above its pre-call token reservation.");
      }
      reservations.delete(row.id);
      state.promptCacheHitTokens += promptCacheHitTokens;
      state.promptCacheMissTokens += promptCacheMissTokens;
      state.outputTokens += outputTokens;
      const apiCostUsd = usageCost({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }, pricesUsdPerMillion);
      state.apiCostUsd = Number((state.apiCostUsd + apiCostUsd).toFixed(9));
      return { providerCalls: 1, promptCacheHitTokens, promptCacheMissTokens, outputTokens, apiCostUsd };
    },
    settleFailure(reservation) {
      const row = reservationFor(reservation.id);
      reservations.delete(row.id);
      state.conservativeFailureDebitTokens += row.maxInputTokens + row.maxOutputTokens;
      state.conservativeFailureDebitUsd = Number((state.conservativeFailureDebitUsd + row.worstCostUsd).toFixed(9));
      return {
        providerCalls: 1,
        conservativeFailureDebitTokens: row.maxInputTokens + row.maxOutputTokens,
        conservativeFailureDebitUsd: row.worstCostUsd
      };
    },
    snapshot() {
      return {
        ...structuredClone(state),
        activeReservations: reservations.size
      };
    }
  });
}

function expectedSurfaceIds(projection) {
  return [
    ...(projection.questions ?? []).map((row) => row.id),
    ...(projection.lessons ?? []).map((row) => row.id)
  ];
}

function executionRecord(body) {
  return { ...body, executionSha256: canonicalSha256(body) };
}

function deterministicExecution(result) {
  const body = {
    role: "deterministic-baseline",
    executionBoundary: "baseline-single-pass",
    providerCalls: 0,
    childProcesses: 0,
    credentialEnvironmentAbsent: null,
    roleResult: result
  };
  return executionRecord(body);
}

async function childProjection(role, packageContent) {
  if (process.platform !== "darwin") throw new Error("F3 isolated child roles require macOS Seatbelt deny-default enforcement.");
  await access("/usr/bin/sandbox-exec");
  const temporaryRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), "mais-f3-role-")));
  try {
    await chmod(temporaryRoot, 0o700);
    const runtimeDirectory = path.join(temporaryRoot, "runtime");
    const inputDirectory = path.join(temporaryRoot, "input");
    const ownOutbox = path.join(temporaryRoot, "outbox");
    const temporaryDirectory = path.join(ownOutbox, "tmp");
    await Promise.all([
      mkdir(runtimeDirectory, { mode: 0o700 }),
      mkdir(inputDirectory, { mode: 0o700 }),
      mkdir(temporaryDirectory, { recursive: true, mode: 0o700 })
    ]);
    const runtimeWorkerPath = path.join(runtimeDirectory, "f3-role-projection-worker.mjs");
    const runtimeContractPath = path.join(runtimeDirectory, "f3-execution-contract.mjs");
    const inputPath = path.join(inputDirectory, "projection-input.json");
    const outputPath = path.join(ownOutbox, "projection-output.json");
    await Promise.all([
      writeFile(runtimeWorkerPath, await readFile(projectionWorkerPath), { mode: 0o500, flag: "wx" }),
      writeFile(runtimeContractPath, await readFile(executionContractPath), { mode: 0o400, flag: "wx" }),
      writeFile(inputPath, `${JSON.stringify({ role, packageContent })}\n`, { encoding: "utf8", mode: 0o400, flag: "wx" })
    ]);
    const nodeExecutable = await realpath(process.execPath);
    const profile = buildSeatbeltProfile({ nodeExecutable, runtimeDirectory, inputPath, ownOutbox });
    const result = await runBoundedProcess({
      executable: "/usr/bin/sandbox-exec",
      args: ["-p", profile, nodeExecutable, runtimeWorkerPath, inputPath, outputPath],
      options: {
        cwd: runtimeDirectory,
        env: sanitizeIsolationEnvironment(process.env, { roleId: role, temporaryDirectory })
      },
      timeoutMilliseconds: 30_000,
      terminationGraceMilliseconds: 500,
      label: `F3 isolated role projection ${role}`
    });
    if (result.code !== 0) throw new Error(`F3 isolated role projection ${role} failed (${result.code ?? result.signal}): ${result.stderr.trim()}`);
    let payload;
    try {
      payload = JSON.parse(await readFile(outputPath, "utf8"));
    } catch {
      throw new Error(`F3 isolated role projection ${role} emitted invalid JSON.`);
    }
    if (payload.role !== role || payload.credentialEnvironmentAbsent !== true) throw new Error(`F3 isolated role projection ${role} did not prove a credential-free environment.`);
    return {
      ...payload,
      enforcementMode: "macos-seatbelt-deny-default",
      networkDeniedByProfile: true,
      repositoryReadDeniedByProfile: true,
      profileSha256: canonicalSha256(profile)
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function providerExecution({ role, packageId, projection, executionBoundary, providerAdapter, budgetLedger, runUsage, isolationEvidence = null, maxTransientAttemptsPerRole }) {
  let providerReceipt;
  let settledUsage;
  let attempt = 0;
  while (attempt < maxTransientAttemptsPerRole) {
    attempt += 1;
    const reservation = budgetLedger.reserve({ maxInputTokens: MAX_INPUT_TOKENS_PER_CALL, maxOutputTokens: MAX_OUTPUT_TOKENS_PER_CALL });
    runUsage.providerAttempts += 1;
    try {
      providerReceipt = await providerAdapter.runRole({ role, packageId, projection, maxOutputTokens: MAX_OUTPUT_TOKENS_PER_CALL, userId: "mais-rsi-lite-f3" });
    } catch (error) {
      const failureDebit = budgetLedger.settleFailure(reservation);
      runUsage.failedProviderAttempts += 1;
      runUsage.conservativeFailureDebitTokens += failureDebit.conservativeFailureDebitTokens;
      runUsage.conservativeFailureDebitUsd = Number((runUsage.conservativeFailureDebitUsd + failureDebit.conservativeFailureDebitUsd).toFixed(9));
      if (error?.retryable !== true || attempt >= maxTransientAttemptsPerRole) throw error;
      continue;
    }
    settledUsage = budgetLedger.settleSuccess(reservation, providerReceipt.usage);
    break;
  }
  if (!providerReceipt || !settledUsage) throw new Error("Provider execution ended without a settled result.");
  runUsage.providerCalls += settledUsage.providerCalls;
  runUsage.promptCacheHitTokens += settledUsage.promptCacheHitTokens;
  runUsage.promptCacheMissTokens += settledUsage.promptCacheMissTokens;
  runUsage.outputTokens += settledUsage.outputTokens;
  runUsage.apiCostUsd = Number((runUsage.apiCostUsd + settledUsage.apiCostUsd).toFixed(9));
  const violations = validateRoleResult({ result: providerReceipt.roleResult, role, packageId, expectedSurfaceIds: expectedSurfaceIds(projection) });
  if (violations.length > 0) throw new Error(`Runner rejected role result (${violations.map((row) => row.code).join(",")}).`);
  return executionRecord({
    role,
    executionBoundary,
    providerCalls: 1,
    childProcesses: executionBoundary === "isolated-child-process-role" ? 1 : 0,
    credentialEnvironmentAbsent: executionBoundary === "isolated-child-process-role" ? true : null,
    isolationEvidence,
    projectionSha256: canonicalSha256(projection),
    providerReceipt,
    providerAttemptCount: attempt
  });
}

function normalizedAggregateFindings(executions, includedRoles) {
  const rows = [];
  for (const execution of executions.filter((row) => includedRoles.has(row.role))) {
    const roleResult = execution.roleResult ?? execution.providerReceipt?.roleResult;
    for (const finding of roleResult?.findings ?? []) {
      const body = {
        sourceRole: execution.role,
        sourceFindingId: finding.findingId,
        surfaceId: finding.surfaceId,
        severity: finding.severity,
        code: finding.code,
        detail: finding.detail,
        ...(finding.family ? { family: finding.family } : {})
      };
      rows.push({ ...body, findingId: `f3-${canonicalSha256(body).slice(0, 24)}` });
    }
  }
  return rows.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId) || left.code.localeCompare(right.code) || left.sourceRole.localeCompare(right.sourceRole));
}

function surfaceResults(packageContent, findings, executions) {
  const findingMap = Map.groupBy(findings, (row) => row.surfaceId);
  const inspectionMap = new Map();
  for (const execution of executions) {
    const result = execution.roleResult ?? execution.providerReceipt?.roleResult;
    for (const surfaceId of result?.inspectedSurfaceIds ?? []) inspectionMap.set(surfaceId, [...(inspectionMap.get(surfaceId) ?? []), execution.role]);
  }
  const surfaces = [
    ...packageContent.questions.map((value) => ({ surfaceId: value.id, surfaceKind: "question", value })),
    ...packageContent.lessons.map((value) => ({ surfaceId: value.id, surfaceKind: "lesson", value }))
  ];
  return surfaces.map((surface) => {
    const findingIds = (findingMap.get(surface.surfaceId) ?? []).map((row) => row.findingId).sort();
    const inspectedByRoles = [...new Set(inspectionMap.get(surface.surfaceId) ?? [])].sort();
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
  if (!planRow || typeof planRow !== "object" || !packageContent || typeof packageContent !== "object") throw new Error("F3 package plan and content are required.");
  if (planRow.packageId !== packageContent.packageId) throw new Error("F3 package ID drifted from its run plan.");
  if (!["A", "B", "C0", "C"].includes(planRow.arm)) throw new Error(`Unknown F3 arm: ${planRow.arm}`);
  if (packageContent.protocolId !== PROTOCOL_ID || packageContent.protocolVersion !== PROTOCOL_VERSION || packageContent.sourceBaseline !== SOURCE_BASELINE) {
    throw new Error("F3 package protocol or source baseline drifted.");
  }
  if (canonicalSha256(packageContent) !== planRow.contentSha256) throw new Error("F3 package content commitment drifted.");
  if (!Array.isArray(packageContent.browserRoutes) || packageContent.browserRoutes.length !== 0) throw new Error("F3 content-only estimand requires zero browser routes.");
}

export async function runF3Package({ planRow, packageContent, providerAdapter, budgetLedger, maxTransientAttemptsPerRole = 3 }) {
  assertPackageBinding(planRow, packageContent);
  if (!providerAdapter || typeof providerAdapter.runRole !== "function") throw new Error("F3 provider adapter is required even when arm A makes zero calls.");
  if (!budgetLedger || typeof budgetLedger.reserve !== "function") throw new Error("F3 budget ledger is required.");
  if (!Number.isSafeInteger(maxTransientAttemptsPerRole) || maxTransientAttemptsPerRole < 1 || maxTransientAttemptsPerRole > 3) throw new Error("F3 transient attempts per role must be an integer from one through three.");
  const startedAt = new Date().toISOString();
  const runUsage = {
    providerCalls: 0,
    providerAttempts: 0,
    failedProviderAttempts: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    outputTokens: 0,
    apiCostUsd: 0,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0
  };
  const executions = [];
  let includedRoles;

  if (planRow.arm === "A") {
    executions.push(deterministicExecution(runDeterministicBaseline(packageContent)));
    includedRoles = new Set(["deterministic-baseline"]);
  } else if (planRow.arm === "B") {
    const baseline = runDeterministicBaseline(packageContent);
    executions.push(deterministicExecution(baseline));
    const critiqueProjection = buildRoleProjection({ role: "same-reviewer-critique", packageContent });
    const critique = await providerExecution({
      role: "same-reviewer-critique",
      packageId: packageContent.packageId,
      projection: critiqueProjection,
      executionBoundary: "same-reviewer-shared-state",
      providerAdapter,
      budgetLedger,
      runUsage,
      maxTransientAttemptsPerRole
    });
    executions.push(critique);
    const revisionProjection = {
      ...buildRoleProjection({ role: "same-reviewer-revision", packageContent }),
      reviewContext: {
        priorRole: "same-reviewer-critique",
        deterministicBaseline: baseline,
        priorRoleResult: critique.providerReceipt.roleResult
      }
    };
    executions.push(await providerExecution({
      role: "same-reviewer-revision",
      packageId: packageContent.packageId,
      projection: revisionProjection,
      executionBoundary: "same-reviewer-shared-state",
      providerAdapter,
      budgetLedger,
      runUsage,
      maxTransientAttemptsPerRole
    }));
    includedRoles = new Set(["deterministic-baseline", "same-reviewer-revision"]);
  } else {
    for (const role of PROVIDER_ROLES) {
      let projection;
      let executionBoundary;
      if (planRow.arm === "C") {
        const prepared = await childProjection(role, structuredClone(packageContent));
        projection = prepared.projection;
        executionBoundary = "isolated-child-process-role";
        executions.push(await providerExecution({
          role,
          packageId: packageContent.packageId,
          projection,
          executionBoundary,
          providerAdapter,
          budgetLedger,
          runUsage,
          maxTransientAttemptsPerRole,
          isolationEvidence: {
            enforcementMode: prepared.enforcementMode,
            credentialEnvironmentAbsent: prepared.credentialEnvironmentAbsent,
            networkDeniedByProfile: prepared.networkDeniedByProfile,
            repositoryReadDeniedByProfile: prepared.repositoryReadDeniedByProfile,
            profileSha256: prepared.profileSha256
          }
        }));
        continue;
      } else {
        projection = buildRoleProjection({ role, packageContent });
        executionBoundary = "serial-shared-state";
      }
      executions.push(await providerExecution({ role, packageId: packageContent.packageId, projection, executionBoundary, providerAdapter, budgetLedger, runUsage, maxTransientAttemptsPerRole }));
    }
    includedRoles = new Set(PROVIDER_ROLES);
  }

  const findings = normalizedAggregateFindings(executions, includedRoles);
  const surfaces = surfaceResults(packageContent, findings, executions);
  const notInspected = surfaces.filter((row) => row.disposition === "not-inspected").length;
  if (notInspected > 0) throw new Error(`F3 run refused completion because ${notInspected} mandatory surfaces were not inspected.`);
  const runId = `f3-${planRow.arm.toLowerCase()}-${planRow.packageId}`;
  const receiptBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: planRow.candidateSetSha256 ?? null,
    authorizationBinding: planRow.authorizationBinding ?? null,
    runId,
    packageId: planRow.packageId,
    latentBundleId: planRow.latentBundleId,
    variantId: planRow.variantId,
    region: planRow.region,
    arm: planRow.arm,
    inputSha256: planRow.contentSha256,
    formalSample: true,
    formalExecutionAuthorized: true,
    liveProviderUsed: providerAdapter.provider === "DeepSeek",
    productionAuthorized: false,
    deploymentAuthorized: false,
    status: "formal-evaluation-run-complete",
    executionMode: providerAdapter.provider === "DeepSeek" ? "formal-live-provider" : "formal-rehearsal-adapter",
    startedAt,
    completedAt: new Date().toISOString(),
    roleExecutions: executions,
    findings,
    materialResultSha256: canonicalSha256(findings.map(({ findingId, surfaceId, severity, code, sourceRole }) => ({ findingId, surfaceId, severity, code, sourceRole }))),
    coverage: {
      requiredSurfaces: surfaces.length,
      inspectedSurfaces: surfaces.length - notInspected,
      questions: packageContent.questions.length,
      lessons: packageContent.lessons.length,
      browserRoutes: 0,
      notInspected
    },
    surfaceResults: surfaces,
    resourceUsage: {
      ...runUsage,
      roleCalls: executions.length,
      childProcesses: executions.reduce((sum, row) => sum + row.childProcesses, 0),
      browserLaunches: 0,
      operationalHumanMinutes: 0,
      liveLatencyMilliseconds: executions.reduce((sum, row) => sum + (row.providerReceipt?.latencyMs ?? 0), 0)
    },
    providerReservationContract: {
      maxInputTokensPerCall: MAX_INPUT_TOKENS_PER_CALL,
      maxOutputTokensPerCall: MAX_OUTPUT_TOKENS_PER_CALL,
      maxTransientAttemptsPerRole
    },
    completionClaim: {
      executionComplete: true,
      contentAccepted: false,
      openFindingCount: findings.length,
      state: findings.length > 0 ? "execution-complete-findings-recorded" : "execution-complete-no-findings-recorded"
    },
    excludedChecks: ["browser-render-content-only-estimand", "production-deployment"],
    pendingPostRunChecks: ["sealed-gold-scoring", "matched-quadruplet-analysis", "independent-result-validation"]
  };
  return { ...receiptBody, receiptSha256: canonicalSha256(receiptBody) };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function protectedWrite(filePath, value) {
  await writeFile(filePath, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(filePath, 0o600);
}

export async function writeCommittedF3Run({ outputRoot, receipt }) {
  if (!path.isAbsolute(outputRoot)) throw new Error("F3 output root must be absolute.");
  if (!receipt || typeof receipt !== "object" || !/^[a-z0-9][a-z0-9._-]{2,127}$/i.test(receipt.runId ?? "")) throw new Error("F3 receipt has no safe run ID.");
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await chmod(outputRoot, 0o700);
  const runDirectory = path.join(outputRoot, receipt.runId);
  if (await exists(runDirectory)) {
    let marker;
    let stored;
    try {
      marker = JSON.parse(await readFile(path.join(runDirectory, "COMMITTED.json"), "utf8"));
      stored = JSON.parse(await readFile(path.join(runDirectory, "receipt.json"), "utf8"));
    } catch {
      throw new Error(`Existing F3 run directory is partial or unreadable: ${receipt.runId}`);
    }
    if (marker.receiptSha256 !== receipt.receiptSha256 || stored.receiptSha256 !== receipt.receiptSha256) {
      throw new Error(`Refusing conflicting committed run overwrite: ${receipt.runId}`);
    }
    const { receiptSha256: storedSha256, ...storedBody } = stored;
    if (storedSha256 !== canonicalSha256(storedBody) || canonicalSha256(stored) !== marker.receiptFileCanonicalSha256) {
      throw new Error(`Committed F3 run failed resume verification: ${receipt.runId}`);
    }
    return { runDirectory, resumed: true, receiptSha256: storedSha256 };
  }
  const { receiptSha256, ...receiptBody } = receipt;
  if (receiptSha256 !== canonicalSha256(receiptBody)) throw new Error("F3 receipt self-hash is invalid.");
  const stagingDirectory = path.join(outputRoot, `.${receipt.runId}.staging-${process.pid}-${randomUUID()}`);
  await mkdir(stagingDirectory, { mode: 0o700 });
  try {
    await protectedWrite(path.join(stagingDirectory, "receipt.json"), receipt);
    const markerBody = {
      protocolId: receipt.protocolId,
      protocolVersion: receipt.protocolVersion,
      executionAmendmentId: receipt.executionAmendmentId,
      runId: receipt.runId,
      candidateSetSha256: receipt.candidateSetSha256,
      authorizationBindingSha256: canonicalSha256(receipt.authorizationBinding),
      inputSha256: receipt.inputSha256,
      receiptSha256,
      receiptFileCanonicalSha256: canonicalSha256(receipt),
      complete: true
    };
    await protectedWrite(path.join(stagingDirectory, "COMMITTED.json"), { ...markerBody, markerSha256: canonicalSha256(markerBody) });
    await rename(stagingDirectory, runDirectory);
    return { runDirectory, resumed: false, receiptSha256 };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function readCommittedF3Run({ outputRoot, planRow, allowedAuthorizationBindingSha256 = [] }) {
  if (!path.isAbsolute(outputRoot)) throw new Error("F3 output root must be absolute.");
  const runId = `f3-${planRow.arm.toLowerCase()}-${planRow.packageId}`;
  const runDirectory = path.join(outputRoot, runId);
  if (!(await exists(runDirectory))) return null;
  let marker;
  let receipt;
  try {
    marker = JSON.parse(await readFile(path.join(runDirectory, "COMMITTED.json"), "utf8"));
    receipt = JSON.parse(await readFile(path.join(runDirectory, "receipt.json"), "utf8"));
  } catch {
    throw new Error(`Existing F3 run directory is partial or unreadable: ${runId}`);
  }
  const { markerSha256, ...markerBody } = marker;
  const { receiptSha256, ...receiptBody } = receipt;
  const receiptAuthorizationBindingSha256 = canonicalSha256(receipt.authorizationBinding);
  const expectedAuthorizationBindingSha256 = canonicalSha256(planRow.authorizationBinding ?? null);
  const allowedAuthorizationBindings = new Set([expectedAuthorizationBindingSha256, ...allowedAuthorizationBindingSha256]);
  if (
    markerSha256 !== canonicalSha256(markerBody)
    || receiptSha256 !== canonicalSha256(receiptBody)
    || marker.receiptSha256 !== receiptSha256
    || marker.receiptFileCanonicalSha256 !== canonicalSha256(receipt)
    || receipt.runId !== runId
    || receipt.packageId !== planRow.packageId
    || receipt.arm !== planRow.arm
    || receipt.inputSha256 !== planRow.contentSha256
    || receipt.candidateSetSha256 !== (planRow.candidateSetSha256 ?? null)
    || !allowedAuthorizationBindings.has(receiptAuthorizationBindingSha256)
    || marker.authorizationBindingSha256 !== receiptAuthorizationBindingSha256
    || receipt.status !== "formal-evaluation-run-complete"
  ) {
    throw new Error(`Committed F3 run failed resume verification: ${runId}`);
  }
  return { runDirectory, receipt };
}
