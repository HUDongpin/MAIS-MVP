export const FINDING_TAXONOMY = Object.freeze({
  ANSWER_INDEPENDENT_MISMATCH: Object.freeze({ family: "F1", severity: "P0", label: "answer differs from independent solution" }),
  UNSOLVABLE_OR_UNIT_DOMAIN_BOUNDARY: Object.freeze({ family: "F1", severity: "P0", label: "unsolvable or invalid domain or unit boundary" }),
  EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS: Object.freeze({ family: "F2", severity: "P1", label: "equivalent or multiple correct choices" }),
  MISSING_OPTIONS: Object.freeze({ family: "F2", severity: "P1", label: "multiple-choice options absent" }),
  EXPLANATION_STEP_MISMATCH: Object.freeze({ family: "F3", severity: "P1", label: "explanation step conflicts with the solution" }),
  ACCEPTED_ANSWER_FALSE_REJECT: Object.freeze({ family: "F4", severity: "P0", label: "correct response is rejected" }),
  NEAR_ANSWER_FALSE_ACCEPT: Object.freeze({ family: "F4", severity: "P0", label: "incorrect near answer is accepted" }),
  EVIDENCE_LABEL_MISMATCH: Object.freeze({ family: "F5", severity: "P1", label: "visible evidence disagrees with its contract" }),
  LANGUAGE_SEMANTIC_MISMATCH: Object.freeze({ family: "F6", severity: "P1", label: "localized versions ask different mathematics" }),
  CURRICULUM_GRADE_PUBLISHER_MISMATCH: Object.freeze({ family: "F7", severity: "P1", label: "curriculum, grade, or publisher mismatch" }),
  TEMPLATE_IDENTITY_LEAKAGE: Object.freeze({ family: "F8", severity: "P0", label: "internal template or identity is visible" }),
  ORACLE_PROVENANCE_CONTAMINATION: Object.freeze({ family: "F9", severity: "P0", label: "independent oracle provenance is contaminated" }),
  DUPLICATE_TRI_LOCALE_PROMPT: Object.freeze({ family: "NATURAL", severity: "P2", label: "duplicate tri-locale prompt" }),
  LESSON_QUESTION_MISSING: Object.freeze({ family: "NATURAL", severity: "P0", label: "lesson references a missing question" }),
  LESSON_ANSWER_MISMATCH: Object.freeze({ family: "NATURAL", severity: "P1", label: "lesson answer differs from its question" }),
  LESSON_EXPLANATION_MISMATCH: Object.freeze({ family: "NATURAL", severity: "P2", label: "lesson explanation differs from its question" })
});

const ALL_CODES = Object.freeze(Object.keys(FINDING_TAXONOMY));

export const ROLE_FINDING_ALLOWLISTS = Object.freeze({
  "deterministic-baseline": Object.freeze([
    "ANSWER_INDEPENDENT_MISMATCH",
    "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
    "MISSING_OPTIONS",
    "ACCEPTED_ANSWER_FALSE_REJECT",
    "EVIDENCE_LABEL_MISMATCH",
    "TEMPLATE_IDENTITY_LEAKAGE",
    "ORACLE_PROVENANCE_CONTAMINATION",
    "DUPLICATE_TRI_LOCALE_PROMPT",
    "LESSON_QUESTION_MISSING",
    "LESSON_ANSWER_MISMATCH",
    "LESSON_EXPLANATION_MISMATCH"
  ]),
  "answer-blind-solver": Object.freeze([
    "ANSWER_INDEPENDENT_MISMATCH",
    "UNSOLVABLE_OR_UNIT_DOMAIN_BOUNDARY",
    "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
    "MISSING_OPTIONS"
  ]),
  "tool-verifier": Object.freeze([
    "ANSWER_INDEPENDENT_MISMATCH",
    "UNSOLVABLE_OR_UNIT_DOMAIN_BOUNDARY",
    "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
    "MISSING_OPTIONS",
    "ACCEPTED_ANSWER_FALSE_REJECT",
    "NEAR_ANSWER_FALSE_ACCEPT",
    "ORACLE_PROVENANCE_CONTAMINATION"
  ]),
  "adversarial-grader": Object.freeze([
    "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
    "MISSING_OPTIONS",
    "EXPLANATION_STEP_MISMATCH",
    "ACCEPTED_ANSWER_FALSE_REJECT",
    "NEAR_ANSWER_FALSE_ACCEPT"
  ]),
  "bilingual-curriculum-critic": Object.freeze([
    "LANGUAGE_SEMANTIC_MISMATCH",
    "CURRICULUM_GRADE_PUBLISHER_MISMATCH"
  ]),
  "evidence-verifier": Object.freeze([
    "EVIDENCE_LABEL_MISMATCH",
    "TEMPLATE_IDENTITY_LEAKAGE",
    "ORACLE_PROVENANCE_CONTAMINATION",
    "LESSON_QUESTION_MISSING",
    "LESSON_ANSWER_MISMATCH",
    "LESSON_EXPLANATION_MISMATCH"
  ]),
  "same-reviewer-critique": ALL_CODES,
  "same-reviewer-revision": ALL_CODES
});

const FORBIDDEN_PROJECTION_KEYS = new Set([
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

function withOptions(question, body) {
  return question.options === undefined ? body : { ...body, options: structuredClone(question.options) };
}

function solverQuestion(question) {
  return withOptions(question, {
    id: question.id,
    type: question.type,
    gradeBand: question.gradeBand,
    standardIds: structuredClone(question.standardIds ?? []),
    prompt: structuredClone(question.prompt)
  });
}

function toolQuestion(question) {
  return withOptions(question, {
    id: question.id,
    type: question.type,
    prompt: structuredClone(question.prompt),
    answer: question.answer,
    acceptedAnswers: structuredClone(question.acceptedAnswers ?? []),
    answerContract: structuredClone(question.answerContract ?? {}),
    validation: structuredClone(question.validation ?? {})
  });
}

function adversarialQuestion(question) {
  return withOptions(question, {
    id: question.id,
    type: question.type,
    prompt: structuredClone(question.prompt),
    answer: question.answer,
    acceptedAnswers: structuredClone(question.acceptedAnswers ?? []),
    explanation: structuredClone(question.explanation),
    misconceptionMap: structuredClone(question.misconceptionMap ?? {})
  });
}

function bilingualQuestion(question) {
  return withOptions(question, {
    id: question.id,
    type: question.type,
    gradeBand: question.gradeBand,
    standardIds: structuredClone(question.standardIds ?? []),
    alignment: structuredClone(question.alignment ?? {}),
    prompt: structuredClone(question.prompt)
  });
}

function evidenceQuestion(question) {
  return {
    id: question.id,
    type: question.type,
    prompt: structuredClone(question.prompt),
    evidenceSurface: structuredClone(question.evidenceSurface ?? {}),
    templateTrace: structuredClone(question.templateTrace ?? {}),
    validation: structuredClone(question.validation ?? {})
  };
}

function collectKeys(value, into = []) {
  if (Array.isArray(value)) {
    for (const row of value) collectKeys(row, into);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      into.push(key);
      collectKeys(child, into);
    }
  }
  return into;
}

function findingContract(role) {
  const allowedCodes = ROLE_FINDING_ALLOWLISTS[role];
  return {
    schemaVersion: 2,
    closedTaxonomy: true,
    allowedCodes: [...allowedCodes],
    definitions: Object.fromEntries(allowedCodes.map((code) => [code, { ...FINDING_TAXONOMY[code] }])),
    findingRequiredFields: ["findingId", "surfaceId", "family", "severity", "code", "detail"],
    missingOptionsRule: "MISSING_OPTIONS is valid only when type is multiple-choice and options are absent or empty."
  };
}

export function buildRoleProjectionV2({ role, packageContent }) {
  assertRecord(packageContent, "package content");
  if (!ROLE_FINDING_ALLOWLISTS[role]) throw new Error(`Unknown v2 role: ${role}`);
  if (!Array.isArray(packageContent.questions) || !Array.isArray(packageContent.lessons)) throw new Error("Package questions and lessons are required.");
  const base = { ...packageIdentity(packageContent), findingContract: findingContract(role) };
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
  } else {
    projection = { ...structuredClone(packageContent), findingContract: findingContract(role) };
  }
  const leakedKey = collectKeys(projection).find((key) => FORBIDDEN_PROJECTION_KEYS.has(key));
  if (leakedKey) throw new Error(`Forbidden concealed key leaked into role projection: ${leakedKey}`);
  return projection;
}

function projectionSurfaces(projection) {
  return [
    ...(projection.questions ?? []),
    ...(projection.lessons ?? [])
  ];
}

export function validateRoleResultV2({ result, role, packageId, projection }) {
  const issues = [];
  const push = (code, detail, findingId = null) => issues.push({ code, detail, ...(findingId ? { findingId } : {}) });
  if (!result || typeof result !== "object" || Array.isArray(result)) return [{ code: "result-shape", detail: "Role result must be an object." }];
  if (!ROLE_FINDING_ALLOWLISTS[role]) return [{ code: "unknown-role", detail: `Unknown role ${role}.` }];
  const forbidden = collectKeys(result).find((key) => FORBIDDEN_PROJECTION_KEYS.has(key));
  if (forbidden) push("forbidden-result-field", `Role result contains forbidden field ${forbidden}.`);
  if (result.schemaVersion !== 2) push("schema-version", "Role result schemaVersion must be 2.");
  if (result.role !== role) push("role-binding", "Role result does not match the assigned role.");
  if (result.packageId !== packageId) push("package-binding", "Role result does not match the assigned package.");
  const surfaces = projectionSurfaces(projection);
  const surfaceById = new Map(surfaces.map((surface) => [surface.id, surface]));
  const expectedIds = [...surfaceById.keys()];
  const inspected = Array.isArray(result.inspectedSurfaceIds) ? result.inspectedSurfaceIds : [];
  if (!Array.isArray(result.inspectedSurfaceIds)) push("inspection-shape", "inspectedSurfaceIds must be an array.");
  if (new Set(inspected).size !== inspected.length) push("duplicate-surface-id", "Role result contains duplicate inspected surfaces.");
  if (inspected.some((surfaceId) => !surfaceById.has(surfaceId))) push("unknown-surface-id", "Role result inspects a surface outside its projection.");
  if (result.inspectionComplete === true && (inspected.length !== expectedIds.length || expectedIds.some((surfaceId) => !inspected.includes(surfaceId)))) {
    push("surface-topology", "A complete role result must enumerate every projected surface exactly once.");
  }
  const findings = Array.isArray(result.findings) ? result.findings : [];
  if (!Array.isArray(result.findings)) push("finding-shape", "findings must be an array.");
  const findingIds = findings.map((row) => row?.findingId);
  if (new Set(findingIds).size !== findingIds.length) push("duplicate-finding-id", "Role result contains duplicate finding IDs.");
  for (const finding of findings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
      push("finding-contract", "Each finding must be an object.");
      continue;
    }
    const findingId = typeof finding.findingId === "string" ? finding.findingId : null;
    const surface = surfaceById.get(finding.surfaceId);
    if (!surface) push("finding-topology", "Finding references an unknown surface.", findingId);
    if (typeof finding.findingId !== "string" || finding.findingId.trim() === "" || typeof finding.detail !== "string" || finding.detail.trim() === "") {
      push("finding-contract", "Finding requires a stable ID and non-empty detail.", findingId);
    }
    if (typeof finding.family !== "string" || finding.family.trim() === "") push("finding-family-required", "Finding family is required.", findingId);
    const taxonomy = FINDING_TAXONOMY[finding.code];
    if (!taxonomy) {
      push("unknown-finding-code", `Finding code ${finding.code ?? "<missing>"} is outside the closed taxonomy.`, findingId);
      continue;
    }
    if (!ROLE_FINDING_ALLOWLISTS[role].includes(finding.code)) push("finding-code-not-allowed-for-role", `Code ${finding.code} is not allowed for ${role}.`, findingId);
    if (typeof finding.family === "string" && finding.family !== taxonomy.family) push("finding-family-code-mismatch", `Family ${finding.family} disagrees with code ${finding.code}.`, findingId);
    if (finding.severity !== taxonomy.severity) push("finding-severity-taxonomy-mismatch", `Severity ${finding.severity} disagrees with code ${finding.code}.`, findingId);
    if (finding.code === "MISSING_OPTIONS" && surface) {
      if (surface.type !== "multiple-choice") {
        push("missing-options-not-multiple-choice", "MISSING_OPTIONS is forbidden unless type is multiple-choice.", findingId);
      } else if (Array.isArray(surface.options) && surface.options.length > 0) {
        push("missing-options-not-missing", "MISSING_OPTIONS is false because projected options are present.", findingId);
      }
    }
  }
  return issues;
}
