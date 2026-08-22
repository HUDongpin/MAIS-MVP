import type { Question } from "@/types";
import { hongKongResidual28Promotions } from "./hongKongResidual28Promotion";

function assertContract(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid HK residual47 repair contract: ${message}`);
}

export const hongKongResidual47Repairs = hongKongResidual28Promotions;
const repairByBaseId = new Map(hongKongResidual47Repairs.map((repair) => [repair.baseId, repair] as const));

export function applyHongKongResidual47Replacement(question: Question, path: string, value: string) {
  assertContract(typeof path === "string", `${question.id}: replacement path is not a string`);
  assertContract(typeof value === "string", `${question.id}: replacement ${path} is not a string`);
  const optionPath = path.match(/^options\[(\d+)]\.(en|zh)$/);
  if (optionPath) {
    assertContract(Array.isArray(question.options), `${question.id}: missing options array for ${path}`);
    const optionIndex = Number(optionPath[1]);
    assertContract(Number.isInteger(optionIndex), `${question.id}: non-integer option index for ${path}`);
    assertContract(optionIndex >= 0 && optionIndex < question.options.length, `${question.id}: option index out of range for ${path}`);
    const option = question.options[optionIndex];
    assertContract(Boolean(option) && typeof option === "object", `${question.id}: missing option target for ${path}`);
    const locale = optionPath[2] as "en" | "zh";
    assertContract(typeof option[locale] === "string", `${question.id}: missing option locale for ${path}`);
    option[locale] = value;
    return;
  }
  if (path === "answer") {
    question.answer = value;
    return;
  }
  if (path === "explanation.en" || path === "explanation.zh") {
    question.explanation[path.endsWith(".en") ? "en" : "zh"] = value;
    return;
  }
  if (path === "prompt.en" || path === "prompt.zh") {
    question.prompt[path.endsWith(".en") ? "en" : "zh"] = value;
    return;
  }
  assertContract(false, `${question.id}: unsupported replacement path ${path}`);
}

export function applyHongKongResidual47Repairs(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const repaired = questions.map((question) => {
    const repair = repairByBaseId.get(question.id);
    if (!repair) return question;
    assertContract(question.curriculumTrack === "HK", `${question.id}: repair resolved outside HK`);
    assertContract(!seen.has(question.id), `${question.id}: duplicate active repair source`);
    seen.add(question.id);
    const next = structuredClone(question);
    for (const [path, value] of Object.entries(repair.replacements)) {
      assertContract(typeof value === "string", `${question.id}: replacement ${path} is not a string`);
      applyHongKongResidual47Replacement(next, path, value);
    }
    return next;
  });

  assertContract(seen.size === repairByBaseId.size, "one or more exact28 source rows is missing");
  return repaired;
}
