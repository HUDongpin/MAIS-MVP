import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { isRetiredHongKongQuestionId } from "../hongKongQuestionRetirement";
import { normalizeQuestionDiagram, questionDiagramAltText } from "../questionFigure";
import type {
  CurriculumRegion,
  CurriculumTrack,
  Difficulty,
  GradeId,
  LocalizedText,
  Question,
  QuestionAsset,
  QuestionDiagram,
  QuestionType,
  TextbookPublisher
} from "../../types";

/**
 * Server-persistence projection of a locked historical Question. The field
 * names intentionally match userStore's persisted QuestionRecord contract,
 * without importing the stateful userStore module into this lazy boundary.
 */
export type HongKongHistoricalQuestionRecord = {
  id: string;
  curriculum_track: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  canonical_topic_id?: string;
  grade: GradeId;
  topic_id: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt_en: string;
  prompt_zh: string;
  options: LocalizedText[] | null;
  answer: string;
  accepted_answers?: string[] | null;
  explanation_en: string;
  explanation_zh: string;
  diagram?: QuestionDiagram | null;
  question_assets?: QuestionAsset[] | null;
};

export type HongKongHistoricalQuestionReferenceSource = {
  attempts?: { question_id?: string | null }[];
  mistakes?: { question_id?: string | null }[];
  learning_events?: { question_id?: string | null }[];
  assessments?: {
    question_ids?: string[] | null;
    paper_sections?: { items?: { questionId?: string | null }[] | null }[] | null;
  }[];
  assessment_submissions?: { answers?: { questionId?: string | null }[] | null }[];
  adaptive_recommendation_cache?: { question_ids?: string[] | null }[];
  assignments?: { content_type?: string | null; target_id?: string | null }[];
};

export class HongKongHistoricalQuestionResolutionError extends Error {
  constructor(questionIds: string[]) {
    super(`Referenced retired Hong Kong questions are missing from the locked snapshot: ${questionIds.join(", ")}`);
    this.name = "HongKongHistoricalQuestionResolutionError";
  }
}

type LegacyCoordinatePoint = {
  label: string;
  x: number;
  y: number;
};

type LegacyCoordinateLine = {
  label: string;
  points: { x: number; y: number }[];
};

type LegacyCoordinateGrid = {
  kind: "coordinate-grid";
  xRange: [number, number];
  yRange: [number, number];
  points?: LegacyCoordinatePoint[];
  lines?: LegacyCoordinateLine[];
};

type LockedCoordinateGridContract = {
  sourceSha256: string;
  xAxisLabel: LocalizedText;
  yAxisLabel: LocalizedText;
  pointIds: string[];
  lines: { id: string; label: LocalizedText }[];
};

const coordinateAxes = {
  xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
  yAxisLabel: { en: "y-coordinate", zh: "y 坐標" }
} as const;

const functionAxes = {
  xAxisLabel: { en: "Input x", zh: "輸入 x" },
  yAxisLabel: { en: "Output f(x)", zh: "輸出 f(x)" }
} as const;

/**
 * These fingerprints bind the migration to the immutable 3f8f12c4 snapshot.
 * A same-ID custom or modified payload does not inherit a migration merely by
 * resembling one of the old coordinate-grid shapes.
 */
const lockedCoordinateGridContractByQuestionId = new Map<string, LockedCoordinateGridContract>([
  ["q28", {
    sourceSha256: "0e79b700990053c5fcab720feac366a7d54a7f9ce84a5ac29ece42ccbe8c5108",
    ...coordinateAxes,
    pointIds: ["point-a", "point-b"],
    lines: [{ id: "line-ab", label: { en: "Line AB", zh: "直線 AB" } }]
  }],
  ["graph-p6-speed-distance", {
    sourceSha256: "d8e5d30d8688e3975857467b159274cd97ee9588a206dc594a7b96e32c9c60c7",
    xAxisLabel: { en: "Time (hours)", zh: "時間（小時）" },
    yAxisLabel: { en: "Distance (km)", zh: "路程（公里）" },
    pointIds: ["time-2-point"],
    lines: [{ id: "journey-line", label: { en: "Journey", zh: "旅程" } }]
  }],
  ["graph-coordinates-read-point", {
    sourceSha256: "2b48395c03b63881d2c0899004b15105eb8c57c69ff7775824aa3f3e3ab18a2a",
    ...coordinateAxes,
    pointIds: ["point-c"],
    lines: []
  }],
  ["graph-coordinates-quadrant", {
    sourceSha256: "24369beb9ad7a3cf00f94779be57c7b702054b4a58610d0857db44becb908a9f",
    ...coordinateAxes,
    pointIds: ["point-p"],
    lines: []
  }],
  ["graph-quadratic-patterns-vertex", {
    sourceSha256: "3dc7f532bf65b6575ae007cc6c1dc62e1760f87845a2c5aeb45aa81a12ba25d4",
    ...coordinateAxes,
    pointIds: ["vertex"],
    lines: [{ id: "quad-vertex", label: { en: "Parabola", zh: "拋物線" } }]
  }],
  ["graph-quadratic-patterns-axis", {
    sourceSha256: "357ae8c4a06a4ae4a6ee7e5d5b02f6fdc0cd5e14d576f7620a6a4cb1985e6b77",
    ...coordinateAxes,
    pointIds: ["vertex"],
    lines: [{ id: "quad-axis", label: { en: "Parabola", zh: "拋物線" } }]
  }],
  ["graph-quadratic-patterns-y-intercept", {
    sourceSha256: "0d5e159935bbe268e8d2f364464757c0ffd9f61cd6b6b446743ad45ac8e3e494",
    ...coordinateAxes,
    pointIds: ["y-intercept"],
    lines: [{ id: "quad-yint", label: { en: "Parabola", zh: "拋物線" } }]
  }],
  ["graph-quadratic-patterns-roots", {
    sourceSha256: "16c62347c413266bca25bbddf750b9f5801971f12343e250b051e9b2dee799ea",
    ...coordinateAxes,
    pointIds: ["left-root", "right-root"],
    lines: [{ id: "quad-roots", label: { en: "Parabola", zh: "拋物線" } }]
  }],
  ["graph-quadratic-patterns-opening", {
    sourceSha256: "a21be594a29ebc55eab29399ef55b254f382ccccd11c839c6c455d09d166cb0c",
    ...coordinateAxes,
    pointIds: ["vertex"],
    lines: [{ id: "quad-opening", label: { en: "Parabola", zh: "拋物線" } }]
  }],
  ["graph-functions-read-output", {
    sourceSha256: "282287c36ee0af9f8ab30bddb1a1cb8750469620122e5f1e3f061e07da360f68",
    ...functionAxes,
    pointIds: ["output-point"],
    lines: [{ id: "func-output", label: { en: "Function f", zh: "函數 f" } }]
  }],
  ["graph-functions-zero", {
    sourceSha256: "76052098ed81b73dbe28223f2a6ae7ceb6b64866e57d2ed78aea11f17e72a7a1",
    ...functionAxes,
    pointIds: ["zero-point"],
    lines: [{ id: "func-zero", label: { en: "Function f", zh: "函數 f" } }]
  }],
  ["graph-coordinate-geometry-gradient", {
    sourceSha256: "7663aaa26165d99a0f0f124c8b147a8f39287b527d60f4e74766784396f42f7c",
    ...coordinateAxes,
    pointIds: ["point-a", "point-b"],
    lines: [{ id: "line-ab-gradient", label: { en: "Line AB", zh: "直線 AB" } }]
  }],
  ["graph-coordinate-geometry-midpoint", {
    sourceSha256: "24fe5067ff2106c02de2cfa276d752efaecedb8b11249e37728ec6785278d661",
    ...coordinateAxes,
    pointIds: ["point-a", "point-b"],
    lines: [{ id: "segment-ab-mid", label: { en: "Segment AB", zh: "線段 AB" } }]
  }],
  ["graph-data-handling-highest-value", {
    sourceSha256: "2da889cbeed8f3f3ce0397679e56a0e580917c6b339ecdcc576f122b6ed114a5",
    xAxisLabel: { en: "Quiz number", zh: "測驗次序" },
    yAxisLabel: { en: "Score", zh: "分數" },
    pointIds: ["score-high"],
    lines: [{ id: "quiz-scores", label: { en: "Quiz scores", zh: "測驗分數" } }]
  }]
]);

function sha256Json(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isLegacyCoordinateGrid(value: unknown): value is LegacyCoordinateGrid {
  return Boolean(value && typeof value === "object" && (value as { kind?: unknown }).kind === "coordinate-grid");
}

function upgradeLockedCoordinateGrid(questionId: string, value: unknown) {
  const contract = lockedCoordinateGridContractByQuestionId.get(questionId);
  if (!contract || !isLegacyCoordinateGrid(value)) return undefined;
  if (sha256Json(value) !== contract.sourceSha256) return undefined;

  const points = (value.points ?? []).map((point, index) => ({
    id: contract.pointIds[index] ?? "",
    label: point.label,
    x: point.x,
    y: point.y
  }));
  const lines = (value.lines ?? []).map((line, index) => ({
    id: contract.lines[index]?.id ?? "",
    label: contract.lines[index]?.label ?? { en: "", zh: "" },
    points: line.points.map((point) => ({ ...point }))
  }));

  if (points.length !== contract.pointIds.length || lines.length !== contract.lines.length) return undefined;

  return normalizeQuestionDiagram({
    kind: "coordinate-grid",
    xRange: [...value.xRange],
    yRange: [...value.yRange],
    xAxisLabel: { ...contract.xAxisLabel },
    yAxisLabel: { ...contract.yAxisLabel },
    xTickInterval: 1,
    yTickInterval: 1,
    points,
    lines
  });
}

function projectedDiagram(questionId: string, value: unknown) {
  if (isLegacyCoordinateGrid(value)) return upgradeLockedCoordinateGrid(questionId, value);
  return normalizeQuestionDiagram(value);
}

/**
 * Pure adapter for an object already obtained from the immutable HK snapshot.
 * The returned arrays and diagram are rebuilt so downstream mutation cannot
 * modify the imported snapshot object.
 */
export function projectLockedHongKongHistoricalQuestionRecord(
  question: Question
): HongKongHistoricalQuestionRecord {
  const diagram = projectedDiagram(question.id, question.diagram);
  const curriculumRegion = question.region
    ?? question.curriculumProfile?.region
    ?? (question.curriculumTrack === "HK" ? "HK" : undefined);
  const textbookPublisher = question.publisher ?? question.curriculumProfile?.publisher;

  return {
    id: question.id,
    curriculum_track: question.curriculumTrack,
    ...(curriculumRegion ? { curriculum_region: curriculumRegion } : {}),
    ...(textbookPublisher ? { textbook_publisher: textbookPublisher } : {}),
    canonical_topic_id: question.canonicalTopicId ?? question.topicId,
    grade: question.grade,
    topic_id: question.topicId,
    topic_title_en: question.topic.en,
    topic_title_zh: question.topic.zh,
    difficulty: question.difficulty,
    type: question.type,
    prompt_en: question.prompt.en,
    prompt_zh: question.prompt.zh,
    options: question.options ? structuredClone(question.options) : null,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ? [...question.acceptedAnswers] : null,
    explanation_en: question.explanation.en,
    explanation_zh: question.explanation.zh,
    ...(diagram ? { diagram } : {}),
    question_assets: question.questionAssets ? structuredClone(question.questionAssets) : null
  };
}

/**
 * Loads the 877 KB snapshot only after the compact manifest proves the ID is a
 * retired HK ID. Active, versioned-active, and unknown IDs are rejected.
 */
export async function resolveRetiredHongKongHistoricalQuestionRecord(questionId: string) {
  if (!isRetiredHongKongQuestionId(questionId)) return null;

  const { historicalHongKongQuestionForId } = await import("../hongKongQuestionVersioning");
  const historicalQuestion = historicalHongKongQuestionForId(questionId);
  if (!historicalQuestion || historicalQuestion.curriculumTrack !== "HK") return null;
  return projectLockedHongKongHistoricalQuestionRecord(historicalQuestion);
}

/**
 * Finds only historical IDs that are still referenced by append-only learner
 * or teacher state. Canonical lesson blocks are deliberately excluded: active
 * lesson selection maps them to the current version, whereas attempts,
 * mistakes, published assessments, submissions, and recommendation snapshots
 * must continue to resolve the exact question object that they recorded.
 */
export function referencedRetiredHongKongQuestionIds(
  source: HongKongHistoricalQuestionReferenceSource,
  additionalQuestionIds: Iterable<string> = []
) {
  const candidates: Array<string | null | undefined> = [
    ...(source.attempts ?? []).map((record) => record.question_id),
    ...(source.mistakes ?? []).map((record) => record.question_id),
    ...(source.learning_events ?? []).map((record) => record.question_id),
    ...(source.assessments ?? []).flatMap((record) => record.question_ids ?? []),
    ...(source.assessments ?? []).flatMap((record) =>
      (record.paper_sections ?? []).flatMap((section) =>
        (section.items ?? []).map((item) => item.questionId)
      )
    ),
    ...(source.assessment_submissions ?? []).flatMap((record) =>
      (record.answers ?? []).map((answer) => answer.questionId)
    ),
    ...(source.adaptive_recommendation_cache ?? []).flatMap((record) => record.question_ids ?? []),
    ...(source.assignments ?? [])
      .filter((record) => record.content_type === "practice")
      .map((record) => record.target_id),
    ...additionalQuestionIds
  ];

  return [...new Set(candidates.filter(
    (questionId): questionId is string =>
      typeof questionId === "string" && isRetiredHongKongQuestionId(questionId)
  ))].sort((left, right) => left.localeCompare(right));
}

export async function resolveReferencedRetiredHongKongQuestionRecords(
  source: HongKongHistoricalQuestionReferenceSource,
  additionalQuestionIds: Iterable<string> = []
) {
  const referencedQuestionIds = referencedRetiredHongKongQuestionIds(source, additionalQuestionIds);
  const records = await Promise.all(
    referencedQuestionIds
      .map((questionId) => resolveRetiredHongKongHistoricalQuestionRecord(questionId))
  );
  return requireResolvedRetiredHongKongQuestionRecords(referencedQuestionIds, records);
}

export function requireResolvedRetiredHongKongQuestionRecords(
  referencedQuestionIds: string[],
  records: Array<HongKongHistoricalQuestionRecord | null>
) {
  const unresolvedQuestionIds = referencedQuestionIds.filter((_, index) => !records[index]);
  if (unresolvedQuestionIds.length) {
    throw new HongKongHistoricalQuestionResolutionError(unresolvedQuestionIds);
  }
  return records as HongKongHistoricalQuestionRecord[];
}

/**
 * Rebuilds the persisted question collection with exact locked records for
 * referenced retired IDs only. Any unreferenced retired record is removed;
 * non-retired canonical/custom records remain in their original order.
 */
export async function materializeReferencedRetiredHongKongQuestions(
  questions: HongKongHistoricalQuestionRecord[],
  source: HongKongHistoricalQuestionReferenceSource,
  additionalQuestionIds: Iterable<string> = []
) {
  const historicalQuestions = await resolveReferencedRetiredHongKongQuestionRecords(
    source,
    additionalQuestionIds
  );
  return [
    ...questions.filter((question) => !isRetiredHongKongQuestionId(question.id)),
    ...historicalQuestions
  ];
}

/**
 * Detects both missing historical rows and same-ID legacy payloads whose
 * locked question/diagram shape still needs to be persisted.
 */
export function retiredHongKongQuestionRecordsNeedPersistenceSync(
  storedQuestions: HongKongHistoricalQuestionRecord[] | unknown,
  normalizedQuestions: HongKongHistoricalQuestionRecord[]
) {
  const retiredRecordsById = (records: HongKongHistoricalQuestionRecord[] | unknown) =>
    (Array.isArray(records) ? records as HongKongHistoricalQuestionRecord[] : [])
      .filter((question) => isRetiredHongKongQuestionId(question.id))
      .sort((left, right) => left.id.localeCompare(right.id));

  return !isDeepStrictEqual(
    retiredRecordsById(storedQuestions),
    retiredRecordsById(normalizedQuestions)
  );
}

function formatNumber(value: number) {
  return Object.is(value, -0) ? "0" : String(value);
}

function coordinatePair(point: { x: number; y: number }) {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;
}

/**
 * A lossless bilingual description for historical coordinate grids. The
 * generic renderer alt text intentionally stays short; this audit/persistence
 * summary retains the contextual axes, ranges, ticks, labelled points, and
 * every line vertex so the migrated historical stimulus remains inspectable.
 */
export function historicalQuestionDiagramSemanticSummary(
  diagram: QuestionDiagram | null | undefined
): LocalizedText | undefined {
  if (!diagram) return undefined;
  if (diagram.kind !== "coordinate-grid") return questionDiagramAltText(diagram);

  const xTick = diagram.xTickInterval ?? "automatic";
  const yTick = diagram.yTickInterval ?? "automatic";
  const pointTextEn = (diagram.points ?? []).length
    ? (diagram.points ?? []).map((point) => `${point.label} at ${coordinatePair(point)}`).join("; ")
    : "none";
  const pointTextZh = (diagram.points ?? []).length
    ? (diagram.points ?? []).map((point) => `${point.label} 位於 ${coordinatePair(point)}`).join("；")
    : "沒有";
  const lineTextEn = (diagram.lines ?? []).length
    ? (diagram.lines ?? []).map((line) =>
      `${line.label.en} through ${line.points.map(coordinatePair).join(", ")}`
    ).join("; ")
    : "none";
  const lineTextZh = (diagram.lines ?? []).length
    ? (diagram.lines ?? []).map((line) =>
      `${line.label.zh}依次通過 ${line.points.map(coordinatePair).join("、")}`
    ).join("；")
    : "沒有";

  return {
    en: `Coordinate grid. x-axis: ${diagram.xAxisLabel.en}, range ${formatNumber(diagram.xRange[0])} to ${formatNumber(diagram.xRange[1])}, tick interval ${xTick}; y-axis: ${diagram.yAxisLabel.en}, range ${formatNumber(diagram.yRange[0])} to ${formatNumber(diagram.yRange[1])}, tick interval ${yTick}. Points: ${pointTextEn}. Lines: ${lineTextEn}.`,
    zh: `座標網格。x 軸：${diagram.xAxisLabel.zh}，範圍 ${formatNumber(diagram.xRange[0])} 至 ${formatNumber(diagram.xRange[1])}，刻度間距 ${xTick}；y 軸：${diagram.yAxisLabel.zh}，範圍 ${formatNumber(diagram.yRange[0])} 至 ${formatNumber(diagram.yRange[1])}，刻度間距 ${yTick}。標示點：${pointTextZh}。線：${lineTextZh}。`
  };
}
