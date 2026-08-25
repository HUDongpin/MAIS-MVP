import {
  canonicalJson,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalizeStrictItemJsonV4,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs";

export const CALIFORNIA_RUNTIME_GRADES_V1 = Object.freeze([...RUNTIME_SOURCE_ENUMERATION_GRADES]);

export type LocalizedTextLikeV1 = {
  en: string;
  zh: string;
  zhHans?: string;
};

export type RuntimeQuestionLikeV1 = {
  id: string;
  curriculumTrack?: string;
  curriculumProfile?: {
    region?: string;
    publisher?: string;
  };
  region?: string;
  publisher?: string;
  canonicalTopicId?: string;
  grade: string;
  topicId: string;
  topic: LocalizedTextLikeV1;
  difficulty: unknown;
  type: string;
  prompt: LocalizedTextLikeV1;
  options?: LocalizedTextLikeV1[];
  answer?: string;
  acceptedAnswers?: string[];
  explanation?: LocalizedTextLikeV1;
  diagram?: unknown;
  questionAssets?: unknown[];
  [key: string]: unknown;
};

export type RuntimeSourceItemLikeV1 = {
  id: string;
  [key: string]: unknown;
};

export type QuestionTopicCatalogLikeV1 = {
  totalQuestions: number;
  topics: Array<{
    topicId: string;
    grade: string;
    topic: LocalizedTextLikeV1;
    questionCount: number;
  }>;
};

export type CaliforniaRuntimeSourceAdapterV1 = {
  invocationGrades?: string[];
  getRawQuestions(): Promise<RuntimeSourceItemLikeV1[]>;
  getConvertedQuestions(): Promise<RuntimeQuestionLikeV1[]>;
  getPublicQuestions(grade: string): Promise<RuntimeQuestionLikeV1[]>;
  getTopicCatalog(grade: string): Promise<QuestionTopicCatalogLikeV1>;
  getQuestionForAttempt(itemId: string): Promise<RuntimeQuestionLikeV1 | null>;
  getGenerationMetadata(itemId: string): unknown;
};

type FrameFailureCodeV1 =
  | "RAW_FULL_ID_MISMATCH"
  | "FULL_PUBLIC_ID_MISMATCH"
  | "PUBLIC_FIELD_MISMATCH"
  | "SERIALIZATION_FAILED";

type FrameFailureV1 = {
  code: FrameFailureCodeV1;
  itemId: string;
  grade: string | null;
  redactedDetailHash: string;
};

function plainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function strictNormalized(value: unknown) {
  return canonicalizeStrictItemJsonV4(value);
}

function strictHash(value: unknown) {
  return sha256Hex(canonicalJson(strictNormalized(value)));
}

function strictEqual(left: unknown, right: unknown) {
  return canonicalJson(strictNormalized(left)) === canonicalJson(strictNormalized(right));
}

function assertQuestionArray(value: unknown, label: string): asserts value is RuntimeSourceItemLikeV1[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must return an array`);
  value.forEach((row, index) => {
    if (!plainObject(row) || typeof row.id !== "string" || row.id.length === 0) {
      throw new TypeError(`${label}[${index}] lacks a stable item ID`);
    }
  });
}

function assertNoDuplicateIds(rows: RuntimeSourceItemLikeV1[], label: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) throw new TypeError(`duplicate ID ${row.id} in ${label}; first-wins collapse is forbidden`);
    seen.add(row.id);
  }
}

function californiaProfileMatches(row: RuntimeQuestionLikeV1) {
  return row.curriculumTrack === "US_CA_MATH"
    && (row.publisher === "US_CA_MATH" || row.curriculumProfile?.publisher === "US_CA_MATH")
    && (row.region === "US" || row.curriculumProfile?.region === "US");
}

function publicProjection(question: RuntimeQuestionLikeV1) {
  return {
    id: question.id,
    curriculumTrack: question.curriculumTrack,
    curriculumProfile: question.curriculumProfile,
    region: question.region,
    publisher: question.publisher,
    canonicalTopicId: question.canonicalTopicId ?? question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    diagram: question.diagram,
    questionAssets: question.questionAssets,
  };
}

function materialPresence(question: RuntimeQuestionLikeV1) {
  return {
    answer: typeof question.answer === "string" && question.answer.length > 0
      || Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0,
    options: Array.isArray(question.options) && question.options.length > 0,
    explanation: plainObject(question.explanation),
  };
}

function failure(code: FrameFailureCodeV1, itemId: string, grade: string | null, detail: string): FrameFailureV1 {
  return {
    code,
    itemId,
    grade,
    redactedDetailHash: sha256Hex(detail),
  };
}

function idSetDifference(left: Set<string>, right: Set<string>) {
  return [...left].filter((value) => !right.has(value)).sort(codePointCompare);
}

export async function extractCaliforniaRuntimeInventoryV1({
  adapter,
}: {
  adapter: CaliforniaRuntimeSourceAdapterV1;
}) {
  if (!plainObject(adapter)) throw new TypeError("California runtime source adapter is required");
  const rawQuestions = await adapter.getRawQuestions();
  const convertedQuestions = await adapter.getConvertedQuestions();
  assertQuestionArray(rawQuestions, "raw California source");
  assertQuestionArray(convertedQuestions, "converted California source");
  assertNoDuplicateIds(rawQuestions, "raw California source");
  assertNoDuplicateIds(convertedQuestions, "converted California source");

  const frameFailureLedger: FrameFailureV1[] = [];
  const serializationFailedIds = new Set<string>();
  const rawIds = new Set(rawQuestions.map((row) => row.id));
  const convertedIds = new Set(convertedQuestions.map((row) => row.id));
  for (const itemId of idSetDifference(rawIds, convertedIds)) {
    frameFailureLedger.push(failure("RAW_FULL_ID_MISMATCH", itemId, null, `raw item absent from converted source:${itemId}`));
  }
  for (const itemId of idSetDifference(convertedIds, rawIds)) {
    frameFailureLedger.push(failure("RAW_FULL_ID_MISMATCH", itemId, null, `converted item absent from raw source:${itemId}`));
  }

  const publicRows: RuntimeQuestionLikeV1[] = [];
  const gradeProjectionInvocations = [];
  for (const grade of CALIFORNIA_RUNTIME_GRADES_V1) {
    const rows = await adapter.getPublicQuestions(grade);
    const catalog = await adapter.getTopicCatalog(grade);
    assertQuestionArray(rows, `public grade projection ${grade}`);
    if (!plainObject(catalog) || !Array.isArray(catalog.topics) || !Number.isSafeInteger(catalog.totalQuestions)) {
      throw new TypeError(`topic catalog ${grade} has an invalid shape`);
    }
    for (const row of rows) {
      if (row.grade !== grade || !californiaProfileMatches(row)) {
        frameFailureLedger.push(failure("PUBLIC_FIELD_MISMATCH", row.id, grade, `grade/profile mismatch:${row.id}:${grade}`));
      }
    }
    const catalogTopicIds = new Set(catalog.topics.map((topic) => topic.topicId));
    if (catalog.totalQuestions !== rows.length) {
      frameFailureLedger.push(failure("PUBLIC_FIELD_MISMATCH", `grade:${grade}`, grade, `catalog count mismatch:${grade}`));
    }
    for (const row of rows) {
      if (!catalogTopicIds.has(row.topicId)) {
        frameFailureLedger.push(failure("PUBLIC_FIELD_MISMATCH", row.id, grade, `catalog topic absent:${row.topicId}`));
      }
    }
    const publicLeafHashes = rows.map((row) => {
      try {
        return strictHash(row);
      } catch (error) {
        serializationFailedIds.add(row.id);
        frameFailureLedger.push(failure(
          "SERIALIZATION_FAILED",
          row.id,
          grade,
          `public projection serialization:${row.id}:${error instanceof Error ? error.name : "UnknownError"}`,
        ));
        return sha256Hex(canonicalJson([row.id, grade, "SERIALIZATION_FAILED"]));
      }
    });
    let topicCatalogRootHash: string;
    try {
      topicCatalogRootHash = strictHash(catalog);
    } catch (error) {
      frameFailureLedger.push(failure(
        "SERIALIZATION_FAILED",
        `grade:${grade}`,
        grade,
        `topic catalog serialization:${grade}:${error instanceof Error ? error.name : "UnknownError"}`,
      ));
      topicCatalogRootHash = sha256Hex(canonicalJson([grade, "CATALOG_SERIALIZATION_FAILED"]));
    }
    gradeProjectionInvocations.push({
      grade,
      itemCount: rows.length,
      publicContentRootHash: sha256Hex(canonicalJson(publicLeafHashes)),
      topicCatalogRootHash,
    });
    publicRows.push(...rows);
  }
  assertNoDuplicateIds(publicRows, "13-grade public runtime union");

  const publicIds = new Set(publicRows.map((row) => row.id));
  for (const itemId of idSetDifference(convertedIds, publicIds)) {
    frameFailureLedger.push(failure("FULL_PUBLIC_ID_MISMATCH", itemId, null, `converted item absent from public union:${itemId}`));
  }
  for (const itemId of idSetDifference(publicIds, convertedIds)) {
    frameFailureLedger.push(failure("FULL_PUBLIC_ID_MISMATCH", itemId, null, `public item absent from converted source:${itemId}`));
  }

  const rawById = new Map(rawQuestions.map((row) => [row.id, row]));
  const convertedById = new Map(convertedQuestions.map((row) => [row.id, row]));
  const itemRecords = [];
  for (const publicQuestion of publicRows) {
    const itemId = publicQuestion.id;
    const convertedQuestion = convertedById.get(itemId) ?? null;
    const rawQuestion = rawById.get(itemId) ?? null;
    const attemptQuestion = await adapter.getQuestionForAttempt(itemId);
    const metadata = adapter.getGenerationMetadata(itemId) ?? null;
    const record = {
      itemId,
      grade: publicQuestion.grade,
      rawQuestion,
      convertedQuestion,
      publicQuestion,
      attemptQuestion,
      generationMetadata: metadata,
      materialPresence: materialPresence(attemptQuestion ?? publicQuestion),
      retainedForDefectReview: true,
      exclusionCode: null,
    };
    try {
      if (serializationFailedIds.has(itemId)) throw new TypeError("public projection failed strict serialization");
      strictNormalized(record);
      if (convertedQuestion === null || attemptQuestion === null
        || !strictEqual(convertedQuestion, attemptQuestion)
        || !strictEqual(publicProjection(convertedQuestion), publicQuestion)) {
        frameFailureLedger.push(failure("PUBLIC_FIELD_MISMATCH", itemId, publicQuestion.grade, `route parity mismatch:${itemId}`));
      }
      itemRecords.push({
        ...record,
        recordHash: strictHash(record),
      });
    } catch (error) {
      if (!serializationFailedIds.has(itemId)) {
        frameFailureLedger.push(failure(
          "SERIALIZATION_FAILED",
          itemId,
          publicQuestion.grade,
          `serialization:${itemId}:${error instanceof Error ? error.name : "UnknownError"}`,
        ));
      }
      itemRecords.push({
        ...record,
        recordHash: null,
      });
    }
  }

  frameFailureLedger.sort((left, right) => (
    codePointCompare(left.itemId, right.itemId)
      || codePointCompare(left.code, right.code)
      || codePointCompare(left.redactedDetailHash, right.redactedDetailHash)
  ));
  const validRecordHashes = itemRecords
    .map((record) => record.recordHash)
    .filter((value): value is string => typeof value === "string")
    .sort(codePointCompare);
  return Object.freeze({
    schemaVersion: "CaliforniaRuntimeInventoryDiagnosticV1",
    designId: "MAIS-NATURAL-CA60-V4",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionOrder: Object.freeze([...CALIFORNIA_RUNTIME_GRADES_V1]),
    gradeProjectionInvocations: Object.freeze(gradeProjectionInvocations),
    rawSourceItemCount: rawQuestions.length,
    convertedItemCount: convertedQuestions.length,
    runtimeVisibleItemCount: publicRows.length,
    itemRecords: Object.freeze(itemRecords),
    itemRecordRootHash: sha256Hex(canonicalJson(validRecordHashes)),
    frameFailureLedger: Object.freeze(frameFailureLedger),
    frameFailureLedgerRootHash: sha256Hex(canonicalJson(frameFailureLedger)),
    freezeEligible: frameFailureLedger.length === 0,
    diagnosticOnly: true,
    providerRequestCount: 0,
  });
}
