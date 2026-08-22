import assert from "node:assert/strict";
import { createHongKongDisplayed74Test } from "../hongKongDisplayed74FocusedTestLedger";

import {
  isRetiredHongKongQuestionId,
  retiredHongKongQuestionIds
} from "../hongKongQuestionRetirement";
import {
  historicalHongKongQuestions,
  historicalHongKongQuestionForId,
  questionMaterialFingerprint
} from "../hongKongQuestionVersioning";
import { normalizeQuestionDiagram, validateQuestionDiagram } from "../questionFigure";
import type { CoordinateGridQuestionDiagram, Question } from "../../types";

import {
  historicalQuestionDiagramSemanticSummary,
  materializeReferencedRetiredHongKongQuestions,
  projectLockedHongKongHistoricalQuestionRecord,
  referencedRetiredHongKongQuestionIds,
  requireResolvedRetiredHongKongQuestionRecords,
  retiredHongKongQuestionRecordsNeedPersistenceSync,
  resolveReferencedRetiredHongKongQuestionRecords,
  resolveRetiredHongKongHistoricalQuestionRecord
} from "./hongKongHistoricalQuestionProjection";

export const HONG_KONG_HISTORICAL_QUESTION_PROJECTION_CONTRACT_SUITE_ID =
  "hk-historical-question-projection-contract-v1" as const;
const test = createHongKongDisplayed74Test(
  HONG_KONG_HISTORICAL_QUESTION_PROJECTION_CONTRACT_SUITE_ID
);

const historicalDiagramQuestions = historicalHongKongQuestions.filter((question) => question.diagram);
const historicalCoordinateQuestions = historicalDiagramQuestions.filter(
  (question): question is Question & { diagram: CoordinateGridQuestionDiagram } =>
    question.diagram?.kind === "coordinate-grid"
);

function coordinateQuestion(questionId: string) {
  const question = historicalCoordinateQuestions.find((candidate) => candidate.id === questionId);
  assert.ok(question, `${questionId}: missing locked coordinate-grid fixture`);
  return question;
}

function rangeText([minimum, maximum]: [number, number]) {
  return `${minimum} to ${maximum}`;
}

function rangeTextZh([minimum, maximum]: [number, number]) {
  return `${minimum} 至 ${maximum}`;
}

test("the explicit projector preserves all 17 locked historical diagrams in the strict figure contract", () => {
  assert.equal(historicalDiagramQuestions.length, 17);
  assert.equal(historicalCoordinateQuestions.length, 14);

  const projected = historicalDiagramQuestions.map(projectLockedHongKongHistoricalQuestionRecord);
  assert.equal(projected.filter((record) => record.diagram).length, 17);

  for (const record of projected) {
    assert.ok(record.diagram, `${record.id}: projected diagram is missing`);
    assert.deepEqual(normalizeQuestionDiagram(record.diagram), record.diagram, `${record.id}: projection is not normalized`);
    assert.deepEqual(validateQuestionDiagram(record.diagram), [], `${record.id}: projected diagram has semantic issues`);
  }
});

test("all 14 locked legacy coordinate grids receive stable IDs, bilingual labels, and lossless semantic summaries", () => {
  const projected = historicalCoordinateQuestions.map(projectLockedHongKongHistoricalQuestionRecord);

  for (const record of projected) {
    assert.equal(record.diagram?.kind, "coordinate-grid", `${record.id}: wrong projected diagram kind`);
    if (record.diagram?.kind !== "coordinate-grid") continue;

    const elementIds = [
      ...(record.diagram.points ?? []).map((point) => point.id),
      ...(record.diagram.lines ?? []).map((line) => line.id)
    ];
    assert.ok(elementIds.every((id) => id.trim().length > 0), `${record.id}: blank element ID`);
    assert.equal(new Set(elementIds).size, elementIds.length, `${record.id}: duplicate point/line ID`);
    assert.ok(record.diagram.xAxisLabel.en && record.diagram.xAxisLabel.zh, `${record.id}: x-axis is not bilingual`);
    assert.ok(record.diagram.yAxisLabel.en && record.diagram.yAxisLabel.zh, `${record.id}: y-axis is not bilingual`);
    assert.equal(record.diagram.xTickInterval, 1, `${record.id}: x ticks changed`);
    assert.equal(record.diagram.yTickInterval, 1, `${record.id}: y ticks changed`);

    const summary = historicalQuestionDiagramSemanticSummary(record.diagram);
    assert.ok(summary, `${record.id}: semantic summary is missing`);
    assert.match(summary.en, new RegExp(record.diagram.xAxisLabel.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(summary.zh, new RegExp(record.diagram.xAxisLabel.zh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(summary.en, new RegExp(record.diagram.yAxisLabel.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(summary.zh, new RegExp(record.diagram.yAxisLabel.zh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(summary.en.includes(rangeText(record.diagram.xRange)), `${record.id}: English x range was lost`);
    assert.ok(summary.en.includes(rangeText(record.diagram.yRange)), `${record.id}: English y range was lost`);
    assert.ok(summary.zh.includes(rangeTextZh(record.diagram.xRange)), `${record.id}: Chinese x range was lost`);
    assert.ok(summary.zh.includes(rangeTextZh(record.diagram.yRange)), `${record.id}: Chinese y range was lost`);
    assert.match(summary.en, /tick interval 1/);
    assert.match(summary.zh, /刻度間距 1/);

    for (const point of record.diagram.points ?? []) {
      assert.ok(summary.en.includes(`${point.label} at (${point.x}, ${point.y})`), `${record.id}: English point ${point.label} was lost`);
      assert.ok(summary.zh.includes(`${point.label} 位於 (${point.x}, ${point.y})`), `${record.id}: Chinese point ${point.label} was lost`);
    }
    for (const line of record.diagram.lines ?? []) {
      assert.ok(summary.en.includes(line.label.en), `${record.id}: English line label was lost`);
      assert.ok(summary.zh.includes(line.label.zh), `${record.id}: Chinese line label was lost`);
      for (const point of line.points) {
        assert.ok(summary.en.includes(`(${point.x}, ${point.y})`), `${record.id}: English line geometry was lost`);
        assert.ok(summary.zh.includes(`(${point.x}, ${point.y})`), `${record.id}: Chinese line geometry was lost`);
      }
    }
  }

  const speed = projectLockedHongKongHistoricalQuestionRecord(coordinateQuestion("graph-p6-speed-distance"));
  assert.equal(speed.diagram?.kind, "coordinate-grid");
  if (speed.diagram?.kind === "coordinate-grid") {
    assert.equal(speed.diagram.xAxisLabel.en, "Time (hours)");
    assert.equal(speed.diagram.xAxisLabel.zh, "時間（小時）");
    assert.equal(speed.diagram.yAxisLabel.en, "Distance (km)");
    assert.equal(speed.diagram.yAxisLabel.zh, "路程（公里）");
    assert.deepEqual(speed.diagram.points?.map((point) => point.id), ["time-2-point"]);
    assert.deepEqual(speed.diagram.lines?.map((line) => line.id), ["journey-line"]);
  }

  const data = projectLockedHongKongHistoricalQuestionRecord(coordinateQuestion("graph-data-handling-highest-value"));
  assert.equal(data.diagram?.kind, "coordinate-grid");
  if (data.diagram?.kind === "coordinate-grid") {
    assert.equal(data.diagram.xAxisLabel.en, "Quiz number");
    assert.equal(data.diagram.xAxisLabel.zh, "測驗次序");
    assert.equal(data.diagram.yAxisLabel.en, "Score");
    assert.equal(data.diagram.yAxisLabel.zh, "分數");
    assert.deepEqual(data.diagram.points?.map((point) => point.id), ["score-high"]);
    assert.deepEqual(data.diagram.lines?.map((line) => line.id), ["quiz-scores"]);
  }
});

test("projection is immutable and fails closed for unknown or altered legacy coordinate payloads", () => {
  const before = structuredClone(historicalDiagramQuestions);
  historicalDiagramQuestions.forEach(projectLockedHongKongHistoricalQuestionRecord);
  assert.deepEqual(historicalDiagramQuestions, before, "projection mutated the locked snapshot objects");

  const source = coordinateQuestion("q28");
  const unknown = {
    ...structuredClone(source),
    id: "custom-coordinate-grid"
  } as Question;
  assert.equal(projectLockedHongKongHistoricalQuestionRecord(unknown).diagram, undefined);

  const altered = structuredClone(source) as Question;
  assert.equal(altered.diagram?.kind, "coordinate-grid");
  if (altered.diagram?.kind === "coordinate-grid") altered.diagram.xRange = [0, 6];
  assert.equal(projectLockedHongKongHistoricalQuestionRecord(altered).diagram, undefined);
  assert.equal(questionMaterialFingerprint(source), questionMaterialFingerprint(coordinateQuestion("q28")));
});

test("the lazy lookup resolves retired IDs only and returns persisted QuestionRecord-compatible fields", async () => {
  const retired = historicalCoordinateQuestions.find((question) => isRetiredHongKongQuestionId(question.id));
  assert.ok(retired, "expected at least one retired historical coordinate question");

  const record = await resolveRetiredHongKongHistoricalQuestionRecord(retired.id);
  assert.ok(record);
  assert.equal(record.id, retired.id);
  assert.equal(record.curriculum_track, "HK");
  assert.equal(record.curriculum_region, "HK");
  assert.equal(record.canonical_topic_id, retired.canonicalTopicId ?? retired.topicId);
  assert.equal(record.topic_id, retired.topicId);
  assert.equal(record.topic_title_en, retired.topic.en);
  assert.equal(record.topic_title_zh, retired.topic.zh);
  assert.equal(record.prompt_en, retired.prompt.en);
  assert.equal(record.prompt_zh, retired.prompt.zh);
  assert.deepEqual(record.options, retired.options ?? null);
  assert.equal(record.answer, retired.answer);
  assert.deepEqual(record.accepted_answers, retired.acceptedAnswers ?? null);
  assert.equal(record.explanation_en, retired.explanation.en);
  assert.equal(record.explanation_zh, retired.explanation.zh);
  assert.deepEqual(record.question_assets, retired.questionAssets ?? null);

  const retiredNumberLine = historicalDiagramQuestions.find(
    (question) => question.id === "graph-p4-decimals-number-line"
  );
  assert.ok(retiredNumberLine, "expected the locked P4 number-line generation");
  assert.equal(isRetiredHongKongQuestionId(retiredNumberLine.id), true);
  const retiredNumberLineRecord = await resolveRetiredHongKongHistoricalQuestionRecord(retiredNumberLine.id);
  assert.ok(retiredNumberLineRecord, "the retired P4 stimulus must remain projectable for historical attempts");
  assert.deepEqual(retiredNumberLineRecord.diagram, retiredNumberLine.diagram);

  const nonRetired = historicalHongKongQuestions.find(
    (question) => !isRetiredHongKongQuestionId(question.id)
  );
  assert.ok(nonRetired, "expected at least one unchanged historical question to remain active");
  assert.equal(await resolveRetiredHongKongHistoricalQuestionRecord(nonRetired.id), null);
  assert.equal(await resolveRetiredHongKongHistoricalQuestionRecord("q28-v2"), null);
  assert.equal(await resolveRetiredHongKongHistoricalQuestionRecord("missing-historical-question"), null);
});

test("every retired HK manifest ID resolves to one exact locked HK projection", async () => {
  // The prior 1007 retired IDs remain immutable; the exact displayed74
  // and residual28 preimages are now also retired behind reviewed successors.
  assert.equal(retiredHongKongQuestionIds.size, 1112);
  for (const questionId of retiredHongKongQuestionIds) {
    const locked = historicalHongKongQuestionForId(questionId);
    assert.ok(locked, `${questionId}: missing locked historical question`);
    assert.equal(locked.curriculumTrack, "HK", `${questionId}: wrong locked curriculum`);
    const projected = await resolveRetiredHongKongHistoricalQuestionRecord(questionId);
    assert.ok(projected, `${questionId}: runtime resolver returned null`);
    assert.equal(projected.id, questionId);
  }
});

test("reference collection materializes only retired IDs used by historical state", async () => {
  const retired = historicalHongKongQuestions.filter((question) => isRetiredHongKongQuestionId(question.id));
  assert.ok(retired.length >= 8);
  const ids = retired.slice(0, 8).map((question) => question.id);
  const active = historicalHongKongQuestions.find((question) => !isRetiredHongKongQuestionId(question.id));
  assert.ok(active);

  const source = {
    attempts: [{ question_id: ids[0] }, { question_id: active.id }],
    mistakes: [{ question_id: ids[1] }, { question_id: ids[0] }],
    learning_events: [{ question_id: ids[2] }, { question_id: null }],
    assessments: [{
      question_ids: [ids[3], active.id],
      paper_sections: [{ items: [{ questionId: ids[7] }] }]
    }],
    assessment_submissions: [{ answers: [{ questionId: ids[4] }] }],
    adaptive_recommendation_cache: [{ question_ids: [ids[5]] }],
    assignments: [
      { content_type: "practice", target_id: ids[6] },
      { content_type: "lesson", target_id: ids[0] }
    ]
  };

  assert.deepEqual(
    referencedRetiredHongKongQuestionIds(source, [ids[0], active.id, "unknown-id"]),
    [...ids].sort((left, right) => left.localeCompare(right))
  );
  const records = await resolveReferencedRetiredHongKongQuestionRecords(source);
  assert.deepEqual(
    records.map((record) => record.id),
    [...ids].sort((left, right) => left.localeCompare(right))
  );
});

test("question materialization retains active records, replaces referenced history, and removes unreferenced retired rows", async () => {
  const retired = historicalHongKongQuestions.filter((question) => isRetiredHongKongQuestionId(question.id));
  assert.ok(retired.length >= 3);
  const referencedIds = retired.slice(0, 2).map((question) => question.id);
  const unreferencedId = retired[2].id;
  const activeQuestion = historicalHongKongQuestions.find((question) => !isRetiredHongKongQuestionId(question.id));
  assert.ok(activeQuestion);

  const activeRecord = projectLockedHongKongHistoricalQuestionRecord(activeQuestion);
  const staleReferencedRecord = {
    ...projectLockedHongKongHistoricalQuestionRecord(retired[0]),
    prompt_en: "stale prompt that must not survive"
  };
  const unreferencedRecord = projectLockedHongKongHistoricalQuestionRecord(retired[2]);
  const source = {
    attempts: [{ question_id: referencedIds[0] }],
    mistakes: [{ question_id: referencedIds[1] }]
  };

  const materialized = await materializeReferencedRetiredHongKongQuestions(
    [activeRecord, staleReferencedRecord, unreferencedRecord],
    source
  );
  assert.deepEqual(
    materialized.map((record) => record.id),
    [activeRecord.id, ...referencedIds].sort((left, right) => {
      if (left === activeRecord.id) return -1;
      if (right === activeRecord.id) return 1;
      return left.localeCompare(right);
    })
  );
  assert.equal(materialized.some((record) => record.id === unreferencedId), false);
  assert.equal(materialized.find((record) => record.id === referencedIds[0])?.prompt_en, retired[0].prompt.en);

  const afterLastReferenceRemoval = await materializeReferencedRetiredHongKongQuestions(
    materialized,
    {}
  );
  assert.deepEqual(afterLastReferenceRemoval.map((record) => record.id), [activeRecord.id]);
  assert.deepEqual(
    await materializeReferencedRetiredHongKongQuestions(afterLastReferenceRemoval, {}),
    afterLastReferenceRemoval,
    "a second post-mutation materialization must be idempotent"
  );

  assert.equal(
    retiredHongKongQuestionRecordsNeedPersistenceSync(
      [activeRecord, staleReferencedRecord, unreferencedRecord],
      materialized
    ),
    true,
    "a same-ID stale payload and unreferenced retired row must trigger persistence repair"
  );
  assert.equal(
    retiredHongKongQuestionRecordsNeedPersistenceSync(
      structuredClone(materialized),
      materialized
    ),
    false,
    "the exact locked historical payload must be idempotent after persistence"
  );
  assert.doesNotThrow(() => retiredHongKongQuestionRecordsNeedPersistenceSync({}, []));
  assert.throws(
    () => requireResolvedRetiredHongKongQuestionRecords(
      [referencedIds[0], referencedIds[1]],
      [materialized.find((record) => record.id === referencedIds[0]) ?? null, null]
    ),
    new RegExp(referencedIds[1])
  );
});
