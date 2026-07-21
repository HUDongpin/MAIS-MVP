import type {
  AccommodationCalculatorPolicy,
  AccommodationExtendedTime,
  LocalizedText,
  StudentAccommodations
} from "@/types";

// Pure, dependency-free helpers for per-student accommodations (IEP / 504).
// Shared by the server (persistence + question reduction), the teacher editor,
// and the student experience so the semantics stay identical everywhere.

export const accommodationExtendedTimeValues: AccommodationExtendedTime[] = [
  "none",
  "extra-half",
  "double",
  "unlimited"
];

export const accommodationCalculatorPolicyValues: AccommodationCalculatorPolicy[] = [
  "default",
  "allowed",
  "not-allowed"
];

// Answer-choice caps a teacher can pick from. 0 means "show all options".
export const accommodationAnswerChoiceOptions = [0, 3, 2] as const;
const minReducedAnswerChoices = 2;
const maxReducedAnswerChoices = 6;
const maxAccommodationNotesLength = 500;

export const defaultStudentAccommodations: StudentAccommodations = {
  extendedTime: "none",
  readAloud: false,
  maxAnswerChoices: 0,
  calculatorPolicy: "default",
  notes: ""
};

function normalizeMaxAnswerChoices(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const rounded = Math.round(numeric);
  if (rounded <= 0) return 0;
  return Math.max(minReducedAnswerChoices, Math.min(maxReducedAnswerChoices, rounded));
}

// Coerce arbitrary/persisted input into a valid accommodations object, falling
// back to the standard (no-op) defaults for anything missing or malformed.
export function normalizeStudentAccommodations(value: unknown): StudentAccommodations {
  const record = typeof value === "object" && value !== null
    ? value as Partial<StudentAccommodations>
    : null;
  if (!record) return { ...defaultStudentAccommodations };

  return {
    extendedTime: accommodationExtendedTimeValues.includes(record.extendedTime as AccommodationExtendedTime)
      ? record.extendedTime as AccommodationExtendedTime
      : "none",
    readAloud: record.readAloud === true,
    maxAnswerChoices: normalizeMaxAnswerChoices(record.maxAnswerChoices),
    calculatorPolicy: accommodationCalculatorPolicyValues.includes(record.calculatorPolicy as AccommodationCalculatorPolicy)
      ? record.calculatorPolicy as AccommodationCalculatorPolicy
      : "default",
    notes: typeof record.notes === "string" ? record.notes.replace(/\s+/g, " ").trim().slice(0, maxAccommodationNotesLength) : ""
  };
}

// Whether the profile carries any active accommodation. A student with only the
// default (no-op) settings has no plan on record. The free-text note alone counts
// as a plan so a saved note is never treated as "no accommodations".
export function accommodationsAreDefault(accommodations: StudentAccommodations): boolean {
  return (
    accommodations.extendedTime === "none" &&
    !accommodations.readAloud &&
    accommodations.maxAnswerChoices === 0 &&
    accommodations.calculatorPolicy === "default" &&
    accommodations.notes.trim().length === 0
  );
}

export function hasAccommodationsPlan(accommodations: StudentAccommodations): boolean {
  return !accommodationsAreDefault(accommodations);
}

// The time multiplier a student is entitled to. null = unlimited (no cap).
export function extendedTimeMultiplier(setting: AccommodationExtendedTime): number | null {
  switch (setting) {
    case "extra-half":
      return 1.5;
    case "double":
      return 2;
    case "unlimited":
      return null;
    case "none":
    default:
      return 1;
  }
}

export const accommodationExtendedTimeLabels: Record<AccommodationExtendedTime, LocalizedText> = {
  none: { en: "Standard time", zh: "標準時間", zhHans: "标准时间" },
  "extra-half": { en: "Extended time (1.5×)", zh: "延長時間（1.5 倍）", zhHans: "延长时间（1.5 倍）" },
  double: { en: "Double time (2×)", zh: "雙倍時間（2 倍）", zhHans: "双倍时间（2 倍）" },
  unlimited: { en: "Unlimited time", zh: "不限時間", zhHans: "不限时间" }
};

export const accommodationCalculatorPolicyLabels: Record<AccommodationCalculatorPolicy, LocalizedText> = {
  default: { en: "Follow class default", zh: "跟隨班級預設", zhHans: "跟随班级预设" },
  allowed: { en: "Calculator allowed", zh: "允許使用計算機", zhHans: "允许使用计算器" },
  "not-allowed": { en: "Calculator not allowed", zh: "不允許使用計算機", zhHans: "不允许使用计算器" }
};

// A short, human-readable list of the active accommodations, for banners/badges.
export function accommodationSummaryChips(accommodations: StudentAccommodations): LocalizedText[] {
  const chips: LocalizedText[] = [];
  if (accommodations.extendedTime !== "none") {
    chips.push(accommodationExtendedTimeLabels[accommodations.extendedTime]);
  }
  if (accommodations.readAloud) {
    chips.push({ en: "Read-aloud", zh: "朗讀支援", zhHans: "朗读支持" });
  }
  if (accommodations.maxAnswerChoices > 0) {
    chips.push({
      en: `${accommodations.maxAnswerChoices} answer choices`,
      zh: `${accommodations.maxAnswerChoices} 個選項`,
      zhHans: `${accommodations.maxAnswerChoices} 个选项`
    });
  }
  if (accommodations.calculatorPolicy !== "default") {
    chips.push(accommodationCalculatorPolicyLabels[accommodations.calculatorPolicy]);
  }
  return chips;
}
