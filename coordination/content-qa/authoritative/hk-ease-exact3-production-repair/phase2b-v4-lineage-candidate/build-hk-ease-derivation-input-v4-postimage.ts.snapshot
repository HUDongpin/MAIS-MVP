import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const HK_EASE_V4_QUESTION_PACK_PATH =
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
export const HK_EASE_V4_SANITIZED_INPUT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
export const HK_EASE_V4_QUESTION_PACK_SHA256 =
  "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf";

export const HK_EASE_V4_SANITIZED_FORBIDDEN_KEYS = new Set([
  "answer",
  "acceptedAnswers",
  "explanation",
  "explanationEn",
  "explanationZh",
  "responseContract",
  "responsePolicy",
  "productionResponse"
]);

type UnknownRecord = Record<string, unknown>;

export type HongKongEaseV4ProblemPayload = {
  baseId: string;
  type: string;
  prompt: { en: string; zh: string };
  options: { en: string[] | null; zh: string[] | null };
  diagram: { present: boolean; value: unknown | null };
};

export type HongKongEaseV4SanitizedInputRow = HongKongEaseV4ProblemPayload & {
  index: number;
  problemPayloadSha256: string;
};

export type HongKongEaseV4SanitizedInput = {
  schemaVersion: "hk-ease-v4-sanitized-derivation-input-v1";
  sourcePath: typeof HK_EASE_V4_QUESTION_PACK_PATH;
  sourceSha256: typeof HK_EASE_V4_QUESTION_PACK_SHA256;
  questionCount: 701;
  orderedBaseIdSha256: string;
  rowsPayloadSha256: string;
  forbiddenKeysAtAnyDepth: string[];
  rows: HongKongEaseV4SanitizedInputRow[];
};

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`V4_SANITIZED_INPUT_INVALID_STRING:${label}`);
  }
  return value;
};

const optionalStringArray = (value: unknown, label: string): string[] | null => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`V4_SANITIZED_INPUT_INVALID_OPTIONS:${label}`);
  }
  return [...value];
};

export const canonicalHongKongEaseV4ProblemPayload = (
  row: Omit<HongKongEaseV4SanitizedInputRow, "index" | "problemPayloadSha256">
): string => JSON.stringify(row);

export const assertNoHongKongEaseV4ForbiddenKeys = (
  value: unknown,
  path = "$"
): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoHongKongEaseV4ForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (HK_EASE_V4_SANITIZED_FORBIDDEN_KEYS.has(key)) {
      throw new Error(`V4_SANITIZED_INPUT_FORBIDDEN_KEY:${path}.${key}`);
    }
    assertNoHongKongEaseV4ForbiddenKeys(child, `${path}.${key}`);
  }
};

export const buildHongKongEaseV4SanitizedInput = (
  questionPackValue: unknown,
  sourceBytesSha256: string
): HongKongEaseV4SanitizedInput => {
  if (sourceBytesSha256 !== HK_EASE_V4_QUESTION_PACK_SHA256) {
    throw new Error("V4_SOURCE_LINEAGE_DRIFT:question-pack-sha256");
  }
  if (!isRecord(questionPackValue) || !Array.isArray(questionPackValue.questions)) {
    throw new Error("V4_SANITIZED_INPUT_INVALID_PACK");
  }
  if (questionPackValue.questions.length !== 701) {
    throw new Error(
      `V4_QUESTION_ORDER_DRIFT:expected-701-got-${questionPackValue.questions.length}`
    );
  }

  const seenIds = new Set<string>();
  const rows = questionPackValue.questions.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`V4_SANITIZED_INPUT_INVALID_ROW:${index}`);
    }
    const baseId = exactString(candidate.id, `${index}.id`);
    if (seenIds.has(baseId)) {
      throw new Error(`V4_QUESTION_ORDER_DRIFT:duplicate-${baseId}`);
    }
    seenIds.add(baseId);
    const type = exactString(candidate.type, `${baseId}.type`);
    const optionsEn = optionalStringArray(candidate.optionsEn, `${baseId}.optionsEn`);
    const optionsZh = optionalStringArray(candidate.optionsZh, `${baseId}.optionsZh`);
    if ((optionsEn === null) !== (optionsZh === null)) {
      throw new Error(`V4_SANITIZED_INPUT_INVALID_OPTIONS:${baseId}.language-shape`);
    }
    if (optionsEn !== null && optionsZh !== null && optionsEn.length !== optionsZh.length) {
      throw new Error(`V4_SANITIZED_INPUT_INVALID_OPTIONS:${baseId}.language-length`);
    }
    const problemPayload: HongKongEaseV4ProblemPayload = {
      baseId,
      type,
      prompt: {
        en: exactString(candidate.promptEn, `${baseId}.promptEn`),
        zh: exactString(candidate.promptZh, `${baseId}.promptZh`)
      },
      options: {
        en: optionsEn,
        zh: optionsZh
      },
      diagram: {
        present: Object.hasOwn(candidate, "diagram"),
        value: Object.hasOwn(candidate, "diagram") ? candidate.diagram ?? null : null
      }
    };
    assertNoHongKongEaseV4ForbiddenKeys(problemPayload, `$.rows[${index}]`);
    return {
      index,
      ...problemPayload,
      problemPayloadSha256: sha256(canonicalHongKongEaseV4ProblemPayload(problemPayload))
    };
  });
  const artifact: HongKongEaseV4SanitizedInput = {
    schemaVersion: "hk-ease-v4-sanitized-derivation-input-v1",
    sourcePath: HK_EASE_V4_QUESTION_PACK_PATH,
    sourceSha256: HK_EASE_V4_QUESTION_PACK_SHA256,
    questionCount: 701,
    orderedBaseIdSha256: sha256(`${rows.map((row) => row.baseId).join("\n")}\n`),
    rowsPayloadSha256: sha256(JSON.stringify(rows)),
    forbiddenKeysAtAnyDepth: [...HK_EASE_V4_SANITIZED_FORBIDDEN_KEYS],
    rows
  };
  assertNoHongKongEaseV4ForbiddenKeys(artifact);
  return artifact;
};

export const renderHongKongEaseV4SanitizedInput = (
  artifact: HongKongEaseV4SanitizedInput
): string => `${JSON.stringify(artifact, null, 2)}\n`;

export const buildHongKongEaseV4SanitizedInputFromDisk = (): string => {
  const sourcePath = resolve(REPOSITORY_ROOT, HK_EASE_V4_QUESTION_PACK_PATH);
  const sourceBytes = readFileSync(sourcePath);
  const artifact = buildHongKongEaseV4SanitizedInput(
    JSON.parse(sourceBytes.toString("utf8")),
    sha256(sourceBytes)
  );
  return renderHongKongEaseV4SanitizedInput(artifact);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(
    resolve(REPOSITORY_ROOT, HK_EASE_V4_SANITIZED_INPUT_PATH),
    buildHongKongEaseV4SanitizedInputFromDisk(),
    "utf8"
  );
}
