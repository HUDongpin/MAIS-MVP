import { FINDING_TAXONOMY, ROLE_FINDING_ALLOWLISTS } from "./role-contract.mjs";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function numericKey(value) {
  const text = String(value ?? "").trim();
  const fraction = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text);
  if (fraction && Number(fraction[2]) !== 0) return `n:${Number(fraction[1]) / Number(fraction[2])}`;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? `n:${numeric}` : `s:${text.toLowerCase()}`;
}

function finding({ code, surfaceId, detail }) {
  const taxonomy = FINDING_TAXONOMY[code];
  if (!taxonomy || !ROLE_FINDING_ALLOWLISTS["deterministic-baseline"].includes(code)) throw new Error(`Deterministic code is outside its allowlist: ${code}`);
  return {
    findingId: `det-v2:${code}:${surfaceId}`,
    surfaceId,
    family: taxonomy.family,
    severity: taxonomy.severity,
    code,
    detail,
    role: "deterministic-baseline"
  };
}

function visibleTemplateLabel(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function runDeterministicBaselineV2(packageContent) {
  if (!packageContent || typeof packageContent !== "object" || !Array.isArray(packageContent.questions) || !Array.isArray(packageContent.lessons)) {
    throw new Error("Deterministic v2 baseline requires package questions and lessons.");
  }
  const findings = [];
  const push = (row) => findings.push(finding(row));
  const promptGroups = new Map();
  for (const question of packageContent.questions) {
    const promptKey = stableStringify(question.prompt);
    promptGroups.set(promptKey, [...(promptGroups.get(promptKey) ?? []), question.id]);
    const answerKey = numericKey(question.answer);
    const independentKey = numericKey(question.validation?.independentAnswer);
    const answerMismatch = answerKey !== independentKey;
    if (answerMismatch) {
      push({
        code: "ANSWER_INDEPENDENT_MISMATCH",
        surfaceId: question.id,
        detail: "Stored answer differs from the independently recorded answer."
      });
    }
    if (!answerMismatch && !(question.acceptedAnswers ?? []).some((answer) => numericKey(answer) === independentKey)) {
      push({
        code: "ACCEPTED_ANSWER_FALSE_REJECT",
        surfaceId: question.id,
        detail: "Accepted forms omit the independently recorded correct answer."
      });
    }
    if (question.type === "multiple-choice") {
      if (!Array.isArray(question.options) || question.options.length === 0) {
        push({
          code: "MISSING_OPTIONS",
          surfaceId: question.id,
          detail: "The surface is multiple-choice but has no options."
        });
      } else {
        const optionKeys = question.options.map((row) => numericKey(row?.en));
        const equivalentOptions = new Set(optionKeys).size !== optionKeys.length;
        const correctCount = optionKeys.filter((key) => key === answerKey).length;
        if (equivalentOptions || correctCount !== 1) {
          push({
            code: "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
            surfaceId: question.id,
            detail: "Options are not uniquely distinguishable under numeric normalization."
          });
        }
      }
    }
    if (question.evidenceSurface?.visibleLabel !== question.evidenceSurface?.expectedLabel) {
      push({
        code: "EVIDENCE_LABEL_MISMATCH",
        surfaceId: question.id,
        detail: "Visible static-evidence label differs from the declared contract."
      });
    }
    if (visibleTemplateLabel(question.templateTrace?.publicLabel)) {
      push({
        code: "TEMPLATE_IDENTITY_LEAKAGE",
        surfaceId: question.id,
        detail: "A non-empty internal template or identity label is publicly visible."
      });
    }
    if (question.validation?.independentAnswerProvenance !== "tool-derived-from-structured-model") {
      push({
        code: "ORACLE_PROVENANCE_CONTAMINATION",
        surfaceId: question.id,
        detail: "The purported independent answer provenance is not independent."
      });
    }
  }
  for (const ids of promptGroups.values()) {
    if (ids.length > 1) {
      for (const surfaceId of ids) {
        push({
          code: "DUPLICATE_TRI_LOCALE_PROMPT",
          surfaceId,
          detail: "The complete tri-locale prompt duplicates another question in the package."
        });
      }
    }
  }
  const questionById = new Map(packageContent.questions.map((question) => [question.id, question]));
  for (const lesson of packageContent.lessons) {
    const question = questionById.get(lesson.workedExample?.questionId);
    if (!question) {
      push({
        code: "LESSON_QUESTION_MISSING",
        surfaceId: lesson.id,
        detail: "Lesson worked example references a missing question."
      });
      continue;
    }
    if (numericKey(lesson.workedExample?.answer) !== numericKey(question.validation?.independentAnswer)) {
      push({
        code: "LESSON_ANSWER_MISMATCH",
        surfaceId: lesson.id,
        detail: "Lesson answer differs from the independently recorded question answer."
      });
    }
    if (stableStringify(lesson.workedExample?.explanation) !== stableStringify(question.explanation)) {
      push({
        code: "LESSON_EXPLANATION_MISMATCH",
        surfaceId: lesson.id,
        detail: "Lesson explanation differs from its linked question explanation."
      });
    }
  }
  const inspectedSurfaceIds = [
    ...packageContent.questions.map((row) => row.id),
    ...packageContent.lessons.map((row) => row.id)
  ];
  return {
    schemaVersion: 2,
    role: "deterministic-baseline",
    packageId: packageContent.packageId,
    inspectionComplete: true,
    inspectedSurfaceIds,
    findings: findings.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId) || left.code.localeCompare(right.code))
  };
}
