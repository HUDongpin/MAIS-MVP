import { createHash, randomUUID } from "node:crypto";
import { access, chmod, mkdir, mkdtemp, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROTOCOL_ID, PROTOCOL_VERSION, SOURCE_BASELINE } from "./calibration-design.mjs";
import { runBoundedProcess } from "./process-lifecycle.mjs";

const ARMS = Object.freeze(["A", "B", "C0", "C"]);
const ROLE_TASKS = Object.freeze({
  A: Object.freeze([
    Object.freeze({ role: "deterministic-baseline", taskId: "baseline-content-contracts" }),
    Object.freeze({ role: "manual-sentinel", taskId: "mandatory-surface-inventory" })
  ]),
  B: Object.freeze([
    Object.freeze({ role: "deterministic-baseline", taskId: "baseline-content-contracts" }),
    Object.freeze({ role: "same-reviewer-critique", taskId: "reflective-explanation-language-checks" }),
    Object.freeze({ role: "same-reviewer-revision", taskId: "finding-normalization-and-accounting" })
  ]),
  C0: Object.freeze([
    Object.freeze({ role: "answer-blind-solver", taskId: "independent-answer-check" }),
    Object.freeze({ role: "tool-verifier", taskId: "option-and-accepted-form-checks" }),
    Object.freeze({ role: "adversarial-grader", taskId: "explanation-claim-check" }),
    Object.freeze({ role: "bilingual-curriculum-critic", taskId: "tri-locale-semantic-check" }),
    Object.freeze({ role: "evidence-verifier", taskId: "evidence-provenance-and-lesson-checks" })
  ]),
  C: Object.freeze([
    Object.freeze({ role: "answer-blind-solver", taskId: "independent-answer-check" }),
    Object.freeze({ role: "tool-verifier", taskId: "option-and-accepted-form-checks" }),
    Object.freeze({ role: "adversarial-grader", taskId: "explanation-claim-check" }),
    Object.freeze({ role: "bilingual-curriculum-critic", taskId: "tri-locale-semantic-check" }),
    Object.freeze({ role: "evidence-verifier", taskId: "evidence-provenance-and-lesson-checks" })
  ])
});

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const roleWorkerPath = path.join(scriptDirectory, "sacrificial-role-worker.mjs");
const ALLOWED_DISPOSITIONS = new Set(["finding", "clean-with-evidence", "unjudgeable", "not-inspected"]);

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

function localized(text) {
  return { en: text, zh: text, zhHans: text };
}

function makeQuestion(index) {
  const left = 11 + index;
  const right = 3 + (index % 7);
  const correct = String(left + right);
  const type = ["multiple-choice", "fill-in", "short-answer"][index % 3];
  return {
    id: `sac-q-${String(index + 1).padStart(2, "0")}`,
    type,
    prompt: { en: `Calculate ${left} + ${right}.`, zh: `計算 ${left} + ${right}。`, zhHans: `计算 ${left} + ${right}。` },
    answer: correct,
    acceptedAnswers: [correct],
    answerContract: { canonicalAnswer: correct, normalizationRule: "trim and parse an exact base-10 integer" },
    explanation: { en: `${left} + ${right} = ${correct}.`, zh: `${left} + ${right} = ${correct}。`, zhHans: `${left} + ${right} = ${correct}。` },
    options: type === "multiple-choice"
      ? [correct, String(Number(correct) + 1), String(Number(correct) - 1), String(Number(correct) + 2)].map(localized)
      : undefined,
    evidenceSurface: { kind: "equation-result-label", expectedLabel: correct, visibleLabel: correct },
    validation: { independentAnswer: correct, independentAnswerProvenance: "tool-derived-from-structured-model" }
  };
}

function introduceSacrificialSignals(questions) {
  questions[0].answer = String(Number(questions[0].answer) + 1);
  const equivalentCorrect = questions[3].answer;
  questions[3].options[1] = localized(`${Number(equivalentCorrect).toFixed(1)}`);
  questions[2].explanation = {
    en: "13 + 5 = 19, so the recorded answer is 18.",
    zh: "13 + 5 = 19，所以記錄答案是 18。",
    zhHans: "13 + 5 = 19，所以记录答案是 18。"
  };
  questions[1].acceptedAnswers = [String(Number(questions[1].answer) + 1)];
  questions[4].evidenceSurface.visibleLabel = String(Number(questions[4].evidenceSurface.expectedLabel) + 2);
  questions[5].prompt.zhHans = "计算 99 + 1。";
  questions[6].validation.independentAnswerProvenance = "metadata-copy-from-candidate-answer";
}

export function buildSacrificialBundle() {
  const questions = Array.from({ length: 24 }, (_, index) => makeQuestion(index));
  introduceSacrificialSignals(questions);
  return {
    packageId: "sacrificial-tri-locale-f2-r-v1",
    fixtureVersion: PROTOCOL_VERSION,
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    sacrificial: true,
    formalSample: false,
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    estimandScope: "content-surfaces-only",
    source: "synthetic-owner-authored-public-fixture",
    questions,
    lessons: [20, 21].map((questionIndex, lessonIndex) => ({
      id: `sac-lesson-${lessonIndex + 1}`,
      title: {
        en: lessonIndex === 0 ? "Checking addition" : "Explaining an addition result",
        zh: lessonIndex === 0 ? "檢查加法" : "解釋加法結果",
        zhHans: lessonIndex === 0 ? "检查加法" : "解释加法结果"
      },
      workedExample: {
        questionId: questions[questionIndex].id,
        answer: questions[questionIndex].answer,
        explanation: structuredClone(questions[questionIndex].explanation)
      }
    })),
    browserRoutes: []
  };
}

// This literal pins the exact public fixture. It is updated only with a protocol-version change.
export const SACRIFICIAL_FIXTURE_SHA256 = "8b69115670dadf5424aee704f6b0c3e38f10e1b3e074661b56553a272aee058d";

function assertCanonicalFixture(bundle) {
  if (canonicalSha256(bundle) !== SACRIFICIAL_FIXTURE_SHA256) {
    throw new Error("F2-R runner rejected the bundle because its fixture commitment is not canonical.");
  }
}

function finding({ surfaceId, family, severity, code, evidence, role }) {
  return {
    findingId: `${code}:${surfaceId}`,
    surfaceId,
    family,
    severity,
    code,
    evidence,
    role,
    disposition: "candidate-finding-needs-independent-review"
  };
}

function parseAdditionPrompt(text) {
  const match = /(-?\d+)\s*\+\s*(-?\d+)/.exec(text);
  return match ? Number(match[1]) + Number(match[2]) : null;
}

function normalizedNumeric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `n:${numeric}` : `s:${String(value).trim().toLowerCase()}`;
}

function arithmeticClaimIsInvalid(text) {
  const match = /(-?\d+)\s*\+\s*(-?\d+)\s*=\s*(-?\d+)/.exec(text);
  return Boolean(match && Number(match[1]) + Number(match[2]) !== Number(match[3]));
}

function numericTokens(text) {
  return [...String(text).matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => match[0]).join("|");
}

function inspectLessons(bundle, role) {
  const questions = new Map(bundle.questions.map((question) => [question.id, question]));
  return bundle.lessons.map((lesson) => {
    const question = questions.get(lesson.workedExample.questionId);
    const checks = {
      referencedQuestionExists: Boolean(question),
      workedAnswerMatches: Boolean(question && lesson.workedExample.answer === question.answer),
      explanationMatches: Boolean(question && stableStringify(lesson.workedExample.explanation) === stableStringify(question.explanation)),
      triLocaleTitlePresent: Boolean(lesson.title.en && lesson.title.zh && lesson.title.zhHans)
    };
    return { surfaceId: lesson.id, surfaceKind: "lesson", role, checks, passed: Object.values(checks).every(Boolean) };
  });
}

function baselineTask(bundle, role) {
  const findings = [];
  for (const question of bundle.questions) {
    const solved = parseAdditionPrompt(question.prompt.en);
    if (solved !== null && String(solved) !== question.answer) {
      findings.push(finding({ surfaceId: question.id, family: "F1", severity: "P0", code: "stored-independent-answer-mismatch", evidence: "The stored answer differs from an answer independently solved from the prompt.", role }));
    }
    if (question.type === "multiple-choice") {
      const normalized = question.options.map((row) => normalizedNumeric(row.en));
      if (new Set(normalized).size !== normalized.length) findings.push(finding({ surfaceId: question.id, family: "F2", severity: "P1", code: "numerically-equivalent-options", evidence: "Two option values normalize to the same numeric value.", role }));
    }
    if (question.answer === question.validation.independentAnswer && !question.acceptedAnswers.includes(question.answer)) {
      findings.push(finding({ surfaceId: question.id, family: "F4", severity: "P0", code: "accepted-answer-false-reject", evidence: "acceptedAnswers does not include the independently verified answer.", role }));
    }
    if (question.evidenceSurface.expectedLabel !== question.evidenceSurface.visibleLabel) {
      findings.push(finding({ surfaceId: question.id, family: "F5", severity: "P1", code: "static-evidence-label-mismatch", evidence: "The static evidence label differs from its content contract.", role }));
    }
    if (question.validation.independentAnswerProvenance !== "tool-derived-from-structured-model") {
      findings.push(finding({ surfaceId: question.id, family: "F9", severity: "P0", code: "non-independent-oracle-provenance", evidence: "The purported independent answer is identified as a metadata copy.", role }));
    }
  }
  return { findings, lessonChecks: inspectLessons(bundle, role), inspectedSurfaceIds: [...bundle.questions.map((row) => row.id), ...bundle.lessons.map((row) => row.id)] };
}

function reflectiveTask(bundle, role) {
  const findings = [];
  for (const question of bundle.questions) {
    if (arithmeticClaimIsInvalid(question.explanation.en)) findings.push(finding({ surfaceId: question.id, family: "F3", severity: "P1", code: "invalid-explanation-arithmetic", evidence: "The worked explanation contains a false arithmetic equality.", role }));
    const languageNumbers = [question.prompt.en, question.prompt.zh, question.prompt.zhHans].map(numericTokens);
    if (new Set(languageNumbers).size !== 1) findings.push(finding({ surfaceId: question.id, family: "F6", severity: "P1", code: "cross-language-numeric-semantic-mismatch", evidence: "Numeric entities differ across the three language prompts.", role }));
  }
  return { findings, lessonChecks: [], inspectedSurfaceIds: bundle.questions.map((row) => row.id) };
}

function independentAnswerTask(bundle, role) {
  const findings = baselineTask(bundle, role).findings.filter((row) => row.family === "F1");
  return { findings, lessonChecks: [], inspectedSurfaceIds: bundle.questions.map((row) => row.id) };
}

function optionAcceptedTask(bundle, role) {
  const findings = baselineTask(bundle, role).findings.filter((row) => row.family === "F2" || row.family === "F4");
  return { findings, lessonChecks: [], inspectedSurfaceIds: bundle.questions.map((row) => row.id) };
}

function explanationTask(bundle, role) {
  const findings = reflectiveTask(bundle, role).findings.filter((row) => row.family === "F3");
  return { findings, lessonChecks: [], inspectedSurfaceIds: bundle.questions.map((row) => row.id) };
}

function languageTask(bundle, role) {
  const findings = reflectiveTask(bundle, role).findings.filter((row) => row.family === "F6");
  return { findings, lessonChecks: [], inspectedSurfaceIds: bundle.questions.map((row) => row.id) };
}

function evidenceTask(bundle, role) {
  const findings = baselineTask(bundle, role).findings.filter((row) => row.family === "F5" || row.family === "F9");
  return { findings, lessonChecks: inspectLessons(bundle, role), inspectedSurfaceIds: [...bundle.questions.map((row) => row.id), ...bundle.lessons.map((row) => row.id)] };
}

function inventoryTask(bundle) {
  return { findings: [], lessonChecks: inspectLessons(bundle, "manual-sentinel"), inspectedSurfaceIds: [...bundle.questions.map((row) => row.id), ...bundle.lessons.map((row) => row.id)] };
}

function normalizationTask(bundle) {
  return { findings: [], lessonChecks: [], inspectedSurfaceIds: [...bundle.questions.map((row) => row.id), ...bundle.lessons.map((row) => row.id)] };
}

export function executeSacrificialRoleTask({ role, taskId, bundle }) {
  const expected = Object.values(ROLE_TASKS).flat().find((row) => row.role === role && row.taskId === taskId);
  if (!expected) throw new Error(`Unknown sacrificial role task: ${role}:${taskId}`);
  if (role === "deterministic-baseline") return baselineTask(bundle, role);
  if (role === "manual-sentinel") return inventoryTask(bundle);
  if (role === "same-reviewer-critique") return reflectiveTask(bundle, role);
  if (role === "same-reviewer-revision") return normalizationTask(bundle);
  if (role === "answer-blind-solver") return independentAnswerTask(bundle, role);
  if (role === "tool-verifier") return optionAcceptedTask(bundle, role);
  if (role === "adversarial-grader") return explanationTask(bundle, role);
  if (role === "bilingual-curriculum-critic") return languageTask(bundle, role);
  if (role === "evidence-verifier") return evidenceTask(bundle, role);
  throw new Error(`Unimplemented sacrificial role: ${role}`);
}

function roleContract(arm) {
  const topology = arm === "A"
    ? "baseline-single-pass"
    : arm === "B"
      ? "same-reviewer-critique-revise"
      : arm === "C0"
        ? "serial-shared-state"
        : "isolated-child-process-roles";
  return {
    topology,
    roles: ROLE_TASKS[arm].map((row) => row.role),
    roleTasks: ROLE_TASKS[arm].map((row) => row.taskId),
    toolCaps: arm === "A"
      ? { deterministicChecks: 1, expressionChecks: 0, languageChecks: 0, staticEvidenceChecks: 1, providerCalls: 0 }
      : { deterministicChecks: 1, expressionChecks: 1, languageChecks: 1, staticEvidenceChecks: 1, providerCalls: 0 },
    writerCount: 1
  };
}

function uniqueSortedFindings(rows) {
  return [...new Map(rows.map((row) => [row.findingId, row])).values()].sort((left, right) => left.surfaceId.localeCompare(right.surfaceId) || left.code.localeCompare(right.code));
}

function executionRow(task, result, executionBoundary) {
  const body = {
    role: task.role,
    taskId: task.taskId,
    executionBoundary,
    exitCode: 0,
    providerCalls: 0,
    toolPasses: 1,
    findingIds: result.findings.map((row) => row.findingId).sort(),
    inspectedSurfaceIds: [...new Set(result.inspectedSurfaceIds)].sort(),
    lessonEvidenceIds: result.lessonChecks.map((row) => row.surfaceId).sort()
  };
  return { ...body, resultSha256: canonicalSha256(body) };
}

async function executeChildRole(task, bundle) {
  const result = await runBoundedProcess({
    executable: process.execPath,
    args: [roleWorkerPath],
    options: {
      cwd: scriptDirectory,
      env: { LANG: "C", LC_ALL: "C", PATH: process.env.PATH ?? "" }
    },
    input: `${JSON.stringify({ ...task, bundle })}\n`,
    timeoutMilliseconds: 10_000,
    terminationGraceMilliseconds: 250,
    label: `Sacrificial role ${task.role}`
  });
  if (result.code !== 0) throw new Error(`Sacrificial role ${task.role} failed (${result.code ?? result.signal}): ${result.stderr.trim()}`);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Sacrificial role ${task.role} emitted invalid JSON: ${error.message}`);
  }
}

async function executeArmTasks(arm, bundle) {
  const tasks = ROLE_TASKS[arm];
  if (arm === "C") {
    const results = await Promise.all(tasks.map((task) => executeChildRole(task, structuredClone(bundle))));
    return results.map((result, index) => ({ task: tasks[index], result, execution: executionRow(tasks[index], result, "child-process") }));
  }
  const sharedState = { bundle, completedTasks: [] };
  return tasks.map((task) => {
    const result = executeSacrificialRoleTask({ ...task, bundle: sharedState.bundle });
    sharedState.completedTasks.push(task.taskId);
    const boundary = arm === "C0" ? "serial-shared-state" : arm === "B" ? "same-reviewer-shared-state" : "baseline-single-pass";
    return { task, result, execution: executionRow(task, result, boundary) };
  });
}

function requiredSurfaces(bundle) {
  return [
    ...bundle.questions.map((row) => ({ surfaceId: row.id, surfaceKind: "question", value: row })),
    ...bundle.lessons.map((row) => ({ surfaceId: row.id, surfaceKind: "lesson", value: row }))
  ];
}

function buildSurfaceResults(bundle, findings, roleResults) {
  const findingsBySurface = Map.groupBy(findings, (row) => row.surfaceId);
  const inspectedBySurface = new Map();
  for (const { task, result } of roleResults) {
    for (const surfaceId of result.inspectedSurfaceIds) inspectedBySurface.set(surfaceId, [...(inspectedBySurface.get(surfaceId) ?? []), task.taskId]);
  }
  return requiredSurfaces(bundle).map((surface) => {
    const findingIds = (findingsBySurface.get(surface.surfaceId) ?? []).map((row) => row.findingId).sort();
    const checksApplied = [...new Set(inspectedBySurface.get(surface.surfaceId) ?? [])].sort();
    const body = {
      surfaceId: surface.surfaceId,
      surfaceKind: surface.surfaceKind,
      disposition: findingIds.length > 0 ? "finding" : checksApplied.length > 0 ? "clean-with-evidence" : "not-inspected",
      findingIds,
      checksApplied,
      surfaceInputSha256: canonicalSha256(surface.value)
    };
    return { ...body, evidenceSha256: canonicalSha256(body) };
  });
}

function materialFindingRows(findings) {
  return findings.map(({ findingId, surfaceId, family, severity, code, role, disposition }) => ({ findingId, surfaceId, family, severity, code, role, disposition }));
}

export async function runSacrificialArm({ arm, bundle }) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm: ${arm}`);
  assertCanonicalFixture(bundle);
  const roleResults = await executeArmTasks(arm, bundle);
  const findings = uniqueSortedFindings(roleResults.flatMap((row) => row.result.findings));
  const surfaceResults = buildSurfaceResults(bundle, findings, roleResults);
  const inspectedSurfaces = surfaceResults.filter((row) => row.disposition !== "not-inspected").length;
  const unjudgeable = surfaceResults.filter((row) => row.disposition === "unjudgeable").length;
  const notInspected = surfaceResults.filter((row) => row.disposition === "not-inspected").length;
  const openP0 = findings.filter((row) => row.severity === "P0").length;
  const openP1 = findings.filter((row) => row.severity === "P1").length;
  const receiptBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    runId: `sacrificial-${arm}`,
    arm,
    sacrificial: true,
    formalSample: false,
    fixtureIdentity: { packageId: bundle.packageId, fixtureVersion: bundle.fixtureVersion, fixtureSha256: SACRIFICIAL_FIXTURE_SHA256 },
    status: "candidate-only",
    executionMode: "offline-deterministic",
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    liveProviderCalibrated: false,
    inputSha256: canonicalSha256(bundle),
    materialResultSha256: canonicalSha256(materialFindingRows(findings)),
    roleContract: roleContract(arm),
    roleExecutions: roleResults.map((row) => row.execution),
    coverage: {
      requiredSurfaces: surfaceResults.length,
      inspectedSurfaces,
      questions: bundle.questions.length,
      lessons: bundle.lessons.length,
      browserRoutes: 0,
      unjudgeable,
      notInspected
    },
    surfaceResults,
    findings,
    completionClaim: {
      state: findings.length > 0 ? "incomplete-findings-open" : "candidate-no-findings-not-formal",
      formalCompletionClaim: false,
      candidateComplete: false,
      openP0,
      openP1
    },
    resourceUsage: {
      providerCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      apiCost: 0,
      browserLaunches: 0,
      roleCalls: roleResults.length,
      childProcesses: arm === "C" ? roleResults.length : 0,
      deterministicToolPasses: roleResults.reduce((sum, row) => sum + row.execution.toolPasses, 0),
      operationalHumanMinutes: 0,
      liveLatencyMilliseconds: null
    },
    excludedChecks: ["browser-render-content-only-estimand"],
    checksNotRun: ["live-provider-model-quality", "live-provider-latency", "live-provider-token-cost", "independent-A18-adjudication", "formal-48-run"]
  };
  return { ...receiptBody, receiptSha256: canonicalSha256(receiptBody) };
}

export async function runAllSacrificialArms(bundle = buildSacrificialBundle()) {
  const receipts = [];
  for (const arm of ARMS) receipts.push(await runSacrificialArm({ arm, bundle }));
  return receipts;
}

function addFinding(rows, code, detail) {
  rows.push({ code, detail });
}

export function validateSacrificialReceipt(receipt, bundle) {
  const validation = [];
  const push = (code, detail) => addFinding(validation, code, detail);
  if (!receipt || typeof receipt !== "object") return [{ code: "receipt-shape", detail: "Receipt is not an object." }];
  if (canonicalSha256(bundle) !== SACRIFICIAL_FIXTURE_SHA256) push("fixture-commitment", "Bundle is not the committed fixture.");
  if (receipt.protocolId !== PROTOCOL_ID || receipt.protocolVersion !== PROTOCOL_VERSION) push("protocol-boundary", "Protocol identity mismatch.");
  if (receipt.sourceBaseline !== SOURCE_BASELINE) push("source-baseline", "Source baseline mismatch.");
  if (!ARMS.includes(receipt.arm)) push("arm", "Unknown arm.");
  if (receipt.runId !== `sacrificial-${receipt.arm}`) push("run-id", "Run ID is not bound to the arm.");
  if (receipt.executionMode !== "offline-deterministic") push("execution-mode", "Unexpected execution mode.");
  if (receipt.formalExecutionAuthorized !== false || receipt.formalSample !== false) push("formal-boundary", "Formal execution must be disabled.");
  if (receipt.productionAuthorized !== false) push("production-boundary", "Production must be disabled.");
  if (receipt.liveProviderCalibrated !== false) push("provider-claim", "Offline receipt cannot claim provider calibration.");
  if (receipt.inputSha256 !== canonicalSha256(bundle)) push("input-hash", "Input hash mismatch.");
  if (stableStringify(receipt.fixtureIdentity) !== stableStringify({ packageId: bundle.packageId, fixtureVersion: bundle.fixtureVersion, fixtureSha256: SACRIFICIAL_FIXTURE_SHA256 })) push("fixture-identity", "Fixture identity mismatch.");

  const expectedContract = ARMS.includes(receipt.arm) ? roleContract(receipt.arm) : null;
  if (stableStringify(receipt.roleContract) !== stableStringify(expectedContract)) push("role-contract", "Role, task, topology, tool, or writer contract drifted.");
  const expectedTasks = ARMS.includes(receipt.arm) ? ROLE_TASKS[receipt.arm] : [];
  const executions = Array.isArray(receipt.roleExecutions) ? receipt.roleExecutions : [];
  if (executions.length !== expectedTasks.length) push("role-execution-topology", "Role execution count mismatch.");
  executions.forEach((row, index) => {
    const expectedTask = expectedTasks[index];
    const expectedBoundary = receipt.arm === "C" ? "child-process" : receipt.arm === "C0" ? "serial-shared-state" : receipt.arm === "B" ? "same-reviewer-shared-state" : "baseline-single-pass";
    if (!expectedTask || row.role !== expectedTask.role || row.taskId !== expectedTask.taskId || row.executionBoundary !== expectedBoundary) push("role-execution-topology", `Unexpected role execution at index ${index}.`);
    const { resultSha256, ...executionBody } = row;
    if (resultSha256 !== canonicalSha256(executionBody)) push("role-result-hash", `Role result hash mismatch at index ${index}.`);
  });

  const required = requiredSurfaces(bundle);
  const expectedById = new Map(required.map((row) => [row.surfaceId, row]));
  const surfaceResults = Array.isArray(receipt.surfaceResults) ? receipt.surfaceResults : [];
  const surfaceIds = surfaceResults.map((row) => row.surfaceId);
  if (surfaceResults.length !== required.length || new Set(surfaceIds).size !== required.length || required.some((row) => !surfaceIds.includes(row.surfaceId))) push("surface-topology", "Mandatory surface results are missing or duplicated.");
  for (const row of surfaceResults) {
    const expected = expectedById.get(row.surfaceId);
    if (!expected || row.surfaceKind !== expected.surfaceKind || !ALLOWED_DISPOSITIONS.has(row.disposition)) push("surface-topology", `Invalid surface result ${row.surfaceId}.`);
    if (expected && row.surfaceInputSha256 !== canonicalSha256(expected.value)) push("surface-input-hash", `Surface input hash mismatch for ${row.surfaceId}.`);
    const { evidenceSha256, ...evidenceBody } = row;
    if (evidenceSha256 !== canonicalSha256(evidenceBody)) push("surface-evidence-hash", `Surface evidence hash mismatch for ${row.surfaceId}.`);
  }

  const findings = Array.isArray(receipt.findings) ? receipt.findings : [];
  if (new Set(findings.map((row) => row.findingId)).size !== findings.length) push("finding-topology", "Finding IDs are duplicated.");
  if (findings.some((row) => !expectedById.has(row.surfaceId))) push("finding-topology", "A finding names a non-mandatory surface.");
  for (const row of surfaceResults) {
    const expectedFindingIds = findings.filter((findingRow) => findingRow.surfaceId === row.surfaceId).map((findingRow) => findingRow.findingId).sort();
    if (stableStringify(row.findingIds) !== stableStringify(expectedFindingIds)) push("finding-surface-link", `Finding linkage mismatch for ${row.surfaceId}.`);
    if ((row.disposition === "finding") !== (expectedFindingIds.length > 0)) push("finding-surface-link", `Disposition mismatch for ${row.surfaceId}.`);
  }
  if (receipt.materialResultSha256 !== canonicalSha256(materialFindingRows(findings))) push("material-result-hash", "Material finding hash was not recomputed from findings.");

  const coverage = receipt.coverage ?? {};
  const inspected = surfaceResults.filter((row) => row.disposition !== "not-inspected").length;
  const unjudgeable = surfaceResults.filter((row) => row.disposition === "unjudgeable").length;
  const notInspected = surfaceResults.filter((row) => row.disposition === "not-inspected").length;
  if (coverage.requiredSurfaces !== required.length || coverage.inspectedSurfaces !== inspected || coverage.questions !== bundle.questions.length || coverage.lessons !== bundle.lessons.length || coverage.browserRoutes !== 0 || coverage.unjudgeable !== unjudgeable || coverage.notInspected !== notInspected) push("coverage", "Coverage is not derived from surface results.");

  const openP0 = findings.filter((row) => row.severity === "P0").length;
  const openP1 = findings.filter((row) => row.severity === "P1").length;
  const expectedState = findings.length > 0 ? "incomplete-findings-open" : "candidate-no-findings-not-formal";
  const completion = receipt.completionClaim ?? {};
  if (completion.formalCompletionClaim !== false || completion.candidateComplete !== false || completion.state !== expectedState || completion.openP0 !== openP0 || completion.openP1 !== openP1 || notInspected > 0 || unjudgeable > 0) push("completion-claim", "Completion state is inconsistent with findings or mandatory coverage.");

  const usage = receipt.resourceUsage ?? {};
  if (usage.providerCalls !== 0 || usage.apiCost !== 0 || usage.inputTokens !== 0 || usage.outputTokens !== 0) push("provider-spend", "Offline mode must have zero provider spend and tokens.");
  if (usage.roleCalls !== executions.length || usage.deterministicToolPasses !== executions.reduce((sum, row) => sum + (row.toolPasses ?? 0), 0)) push("resource-accounting", "Observed role/tool accounting mismatch.");
  if (usage.childProcesses !== (receipt.arm === "C" ? executions.length : 0)) push("resource-accounting", "Child-process accounting mismatch.");

  const { receiptSha256, ...receiptBody } = receipt;
  if (receiptSha256 !== canonicalSha256(receiptBody)) push("receipt-hash", "Receipt hash mismatch.");
  return validation;
}

async function atomicWrite(filePath, value, mode = 0o644) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode, flag: "wx" });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, filePath);
  await chmod(filePath, mode);
}

function validateReceiptSet(receipts, bundle) {
  if (!Array.isArray(receipts) || receipts.length !== ARMS.length) throw new Error("Exactly four sacrificial receipts are required.");
  if (stableStringify(receipts.map((row) => row.arm)) !== stableStringify(ARMS)) throw new Error("Sacrificial receipts must be ordered A, B, C0, C exactly once.");
  for (const receipt of receipts) {
    const findings = validateSacrificialReceipt(receipt, bundle);
    if (findings.length > 0) throw new Error(`Invalid sacrificial receipt for ${receipt.arm}: ${findings.map((row) => row.code).join(", ")}`);
  }
}

function sacrificialSummary(receipts) {
  return {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "candidate-only",
    estimandScope: "content-surfaces-only",
    executionMode: "offline-deterministic",
    receiptCount: receipts.length,
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    liveProviderCalibrated: false,
    countsByArm: Object.fromEntries(receipts.map((receipt) => [receipt.arm, {
      findings: receipt.findings.length,
      requiredSurfaces: receipt.coverage.requiredSurfaces,
      inspectedSurfaces: receipt.coverage.inspectedSurfaces,
      providerCalls: receipt.resourceUsage.providerCalls,
      apiCost: receipt.resourceUsage.apiCost,
      childProcesses: receipt.resourceUsage.childProcesses
    }])),
    interpretation: "Committed public-fixture topology, semantic-validation, lifecycle, and deterministic replay evidence only; no live-model, causal-effect, browser-render, independent content-readiness, or formal-run claim.",
    remainingGates: ["A18-independent-review", "A11-independent-runner-review", "A22-independent-isolation-review", "A25-independent-preflight", "owner-budget-signature", "separate-explicit-F3-authorization"]
  };
}

export async function writeSacrificialArtifacts({ directory, bundle, receipts }) {
  assertCanonicalFixture(bundle);
  validateReceiptSet(receipts, bundle);
  const receiptDirectory = path.join(directory, "sacrificial-receipts");
  await mkdir(receiptDirectory, { recursive: true });
  await atomicWrite(path.join(directory, "sacrificial-bundle.json"), bundle);
  for (const receipt of receipts) await atomicWrite(path.join(receiptDirectory, `${receipt.arm}.json`), receipt);
  const summary = sacrificialSummary(receipts);
  await atomicWrite(path.join(directory, "f2-sacrificial-summary.json"), summary);
  const files = [
    { path: "sacrificial-bundle.json", sha256: canonicalSha256(`${JSON.stringify(bundle, null, 2)}\n`) },
    ...receipts.map((receipt) => ({ path: `sacrificial-receipts/${receipt.arm}.json`, sha256: canonicalSha256(`${JSON.stringify(receipt, null, 2)}\n`) })),
    { path: "f2-sacrificial-summary.json", sha256: canonicalSha256(`${JSON.stringify(summary, null, 2)}\n`) }
  ];
  const manifestBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    fixtureSha256: SACRIFICIAL_FIXTURE_SHA256,
    complete: true,
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    files
  };
  await atomicWrite(path.join(directory, "f2-snapshot-commit-manifest.json"), { ...manifestBody, manifestSha256: canonicalSha256(manifestBody) });
  return summary;
}

async function writeAttemptFiles(stagingDirectory, bundle, receipts, runtimeObservation) {
  await mkdir(path.join(stagingDirectory, "receipts"), { recursive: true, mode: 0o700 });
  const files = [];
  const rows = [
    ["bundle.json", bundle],
    ["summary.json", sacrificialSummary(receipts)],
    ...(runtimeObservation ? [["runtime-observation.json", runtimeObservation]] : []),
    ...receipts.map((receipt) => [`receipts/${receipt.arm}.json`, receipt])
  ];
  for (const [relativePath, value] of rows) {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    await writeFile(path.join(stagingDirectory, relativePath), text, { encoding: "utf8", mode: 0o600, flag: "wx" });
    files.push({ path: relativePath, sha256: canonicalSha256(text) });
  }
  return files;
}

function validAttemptId(attemptId) {
  return typeof attemptId === "string" && /^[a-z0-9][a-z0-9._-]{2,79}$/i.test(attemptId);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function abortError(signal) {
  if (!signal?.aborted) return null;
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Sacrificial attempt aborted before commit.");
  error.name = "AbortError";
  return error;
}

async function finalizeReservation({ activePath, terminalPath, attemptId, status }) {
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    attemptId,
    status,
    formalExecutionAuthorized: false,
    productionAuthorized: false
  };
  await writeFile(activePath, `${JSON.stringify({ ...body, recordSha256: canonicalSha256(body) }, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "w"
  });
  await rename(activePath, terminalPath);
}

export async function writeSacrificialAttempt({ outputRoot, attemptId, bundle, receipts, runtimeObservation, beforeCommit, signal }) {
  if (!path.isAbsolute(outputRoot)) throw new Error("outputRoot must be absolute.");
  if (!validAttemptId(attemptId)) throw new Error("attemptId has an invalid shape.");
  const initialAbort = abortError(signal);
  if (initialAbort) throw initialAbort;
  assertCanonicalFixture(bundle);
  validateReceiptSet(receipts, bundle);
  const reservationsDirectory = path.join(outputRoot, ".reservations");
  const stagingRoot = path.join(outputRoot, ".staging");
  const attemptsDirectory = path.join(outputRoot, "attempts");
  await Promise.all([
    mkdir(reservationsDirectory, { recursive: true, mode: 0o700 }),
    mkdir(stagingRoot, { recursive: true, mode: 0o700 }),
    mkdir(attemptsDirectory, { recursive: true, mode: 0o700 })
  ]);
  const reservationPath = path.join(reservationsDirectory, `${attemptId}.lock`);
  const abortedReservationPath = path.join(reservationsDirectory, `${attemptId}.aborted.json`);
  const committedReservationPath = path.join(reservationsDirectory, `${attemptId}.committed.json`);
  const attemptDirectory = path.join(attemptsDirectory, attemptId);
  if (
    await pathExists(abortedReservationPath)
    || await pathExists(committedReservationPath)
    || await pathExists(attemptDirectory)
  ) throw new Error(`Attempt ${attemptId} is already reserved.`);
  let reservation;
  try {
    reservation = await open(reservationPath, "wx", 0o600);
    await reservation.writeFile(`${PROTOCOL_ID}\n${attemptId}\n`);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`Attempt ${attemptId} is already reserved.`);
    throw error;
  } finally {
    await reservation?.close();
  }
  let stagingDirectory;
  let committed = false;
  try {
    const postReservationAbort = abortError(signal);
    if (postReservationAbort) throw postReservationAbort;
    stagingDirectory = await mkdtemp(path.join(stagingRoot, `${attemptId}-`));
    await chmod(stagingDirectory, 0o700);
    const files = await writeAttemptFiles(stagingDirectory, bundle, receipts, runtimeObservation);
    const manifestBody = {
      protocolId: PROTOCOL_ID,
      protocolVersion: PROTOCOL_VERSION,
      sourceBaseline: SOURCE_BASELINE,
      attemptId,
      fixtureSha256: SACRIFICIAL_FIXTURE_SHA256,
      receiptArms: ARMS,
      complete: true,
      formalExecutionAuthorized: false,
      productionAuthorized: false,
      files
    };
    await writeFile(path.join(stagingDirectory, "commit-manifest.json"), `${JSON.stringify({ ...manifestBody, manifestSha256: canonicalSha256(manifestBody) }, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    if (beforeCommit) await beforeCommit({ stagingDirectory, attemptId, signal });
    const preCommitAbort = abortError(signal);
    if (preCommitAbort) throw preCommitAbort;
    await rename(stagingDirectory, attemptDirectory);
    committed = true;
    await finalizeReservation({
      activePath: reservationPath,
      terminalPath: committedReservationPath,
      attemptId,
      status: "committed-candidate-attempt"
    });
    return { attemptId, attemptDirectory, manifestSha256: canonicalSha256(manifestBody) };
  } catch (error) {
    if (!committed && stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
    if (await pathExists(reservationPath)) {
      await finalizeReservation({
        activePath: reservationPath,
        terminalPath: committed ? committedReservationPath : abortedReservationPath,
        attemptId,
        status: committed ? "committed-candidate-attempt" : "aborted-before-commit"
      });
    }
    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function validateSacrificialAttempt({ attemptDirectory, bundle }) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  try {
    const manifest = await readJson(path.join(attemptDirectory, "commit-manifest.json"));
    const { manifestSha256, ...manifestBody } = manifest;
    if (manifestSha256 !== canonicalSha256(manifestBody)) push("attempt-manifest-hash", "Attempt manifest hash mismatch.");
    if (manifest.complete !== true || manifest.formalExecutionAuthorized !== false || manifest.productionAuthorized !== false) push("attempt-boundary", "Attempt is not a completed F2-only commit.");
    if (manifest.fixtureSha256 !== SACRIFICIAL_FIXTURE_SHA256 || canonicalSha256(bundle) !== SACRIFICIAL_FIXTURE_SHA256) push("fixture-commitment", "Attempt fixture mismatch.");
    for (const row of manifest.files ?? []) {
      const text = await readFile(path.join(attemptDirectory, row.path), "utf8");
      if (canonicalSha256(text) !== row.sha256) push("attempt-file-hash", row.path);
    }
    const storedBundle = await readJson(path.join(attemptDirectory, "bundle.json"));
    if (canonicalSha256(storedBundle) !== canonicalSha256(bundle)) push("attempt-bundle-hash", "Stored bundle mismatch.");
    const receipts = [];
    for (const arm of ARMS) {
      const receipt = await readJson(path.join(attemptDirectory, "receipts", `${arm}.json`));
      receipts.push(receipt);
      for (const findingRow of validateSacrificialReceipt(receipt, bundle)) push(`receipt-${findingRow.code}`, `${arm}: ${findingRow.detail}`);
    }
    if (stableStringify(receipts.map((row) => row.arm)) !== stableStringify(ARMS)) push("attempt-receipt-topology", "Receipt arms mismatch.");
  } catch (error) {
    push("attempt-incomplete", error instanceof Error ? error.message : String(error));
  }
  return findings;
}
