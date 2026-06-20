import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTeacherAssessmentAnalysis,
  defaultAssessmentAnalysisSettings,
  normalizeAssessmentAnalysisSettings
} from "./teacherAssessmentAnalysis";
import type {
  TeacherAssessmentAnalysisItemInput,
  TeacherAssessmentAnalysisSubmissionInput
} from "./teacherAssessmentAnalysis";

function text(value: string) {
  return { en: value, zh: value, zhHans: value };
}

const items: TeacherAssessmentAnalysisItemInput[] = [
  {
    questionId: "q1",
    prompt: text("Question 1"),
    correctAnswer: "10",
    sectionId: "section-a",
    sectionTitle: text("Section A"),
    topicId: "linear-equations",
    topicTitle: text("Linear equations"),
    questionType: "manual",
    maxPoints: 10
  },
  {
    questionId: "q2",
    prompt: text("Question 2"),
    correctAnswer: "20",
    sectionId: "section-b",
    sectionTitle: text("Section B"),
    topicId: "geometry",
    topicTitle: text("Geometry"),
    questionType: "manual",
    maxPoints: 10
  }
];

function submission(
  index: number,
  q1Points: number,
  q2Points: number,
  overrides: Partial<TeacherAssessmentAnalysisSubmissionInput> = {}
): TeacherAssessmentAnalysisSubmissionInput {
  const maxScore = 20;
  const score = q1Points + q2Points;
  return {
    id: `submission-${index}`,
    studentId: `student-${index}`,
    studentName: `Student ${index}`,
    status: "graded",
    score,
    maxScore,
    submittedAt: "2026-06-04T01:00:00.000Z",
    answers: [
      {
        questionId: "q1",
        answer: String(q1Points),
        isCorrect: q1Points === 10,
        pointsEarned: q1Points,
        maxPoints: 10
      },
      {
        questionId: "q2",
        answer: String(q2Points),
        isCorrect: q2Points === 10,
        pointsEarned: q2Points,
        maxPoints: 10
      }
    ],
    ...overrides
  };
}

function sampleSubmissions() {
  return [
    submission(1, 10, 10),
    submission(2, 10, 10),
    submission(3, 9, 9),
    submission(4, 8, 8),
    submission(5, 7, 7),
    submission(6, 6, 6),
    submission(7, 6, 5),
    submission(8, 5, 5),
    submission(9, 4, 4),
    submission(10, 3, 3),
    submission(11, 0, 0, {
      status: "not-started",
      score: null,
      submittedAt: null,
      answers: []
    })
  ];
}

test("normalizes school analysis settings and rejects invalid score bands", () => {
  const settings = normalizeAssessmentAnalysisSettings({
    passThreshold: 62.4,
    excellentThreshold: 88.9,
    lowScoreThreshold: -20,
    borderlineRange: 40,
    scoreBands: [
      { label: "A", min: 90, max: 100 },
      { label: "Invalid", min: 80, max: 70 }
    ]
  });

  assert.equal(settings.passThreshold, 62);
  assert.equal(settings.excellentThreshold, 89);
  assert.equal(settings.lowScoreThreshold, 0);
  assert.equal(settings.borderlineRange, 30);
  assert.deepEqual(settings.scoreBands, [{ label: "A", min: 90, max: 100 }]);

  assert.equal(defaultAssessmentAnalysisSettings.passThreshold, 60);
  assert.equal(defaultAssessmentAnalysisSettings.excellentThreshold, 85);
  assert.equal(defaultAssessmentAnalysisSettings.lowScoreThreshold, 40);
});

test("calculates summary rates, score bands, and competition rankings from scored submissions only", () => {
  const analysis = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: sampleSubmissions(),
    items,
    totalStudents: 11,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a"
  });

  assert.equal(analysis.summary.submittedCount, 10);
  assert.equal(analysis.summary.totalStudents, 11);
  assert.equal(analysis.summary.highestScore, 100);
  assert.equal(analysis.summary.lowestScore, 30);
  assert.equal(analysis.summary.averageScore, 67.5);
  assert.equal(analysis.summary.standardDeviation, 23.4);
  assert.equal(analysis.summary.passRate, 60);
  assert.equal(analysis.summary.excellentRate, 30);
  assert.equal(analysis.summary.lowScoreRate, 20);

  assert.deepEqual(
    analysis.scoreBands.map((band) => [band.label, band.count, band.percentage]),
    [
      ["0-39", 1, 10],
      ["40-59", 3, 30],
      ["60-69", 1, 10],
      ["70-84", 2, 20],
      ["85-100", 3, 30]
    ]
  );

  assert.deepEqual(
    analysis.rankings.slice(0, 4).map((entry) => [entry.studentId, entry.rank, entry.percentage]),
    [
      ["student-1", 1, 100],
      ["student-2", 1, 100],
      ["student-3", 3, 90],
      ["student-4", 4, 80]
    ]
  );
  assert.equal(analysis.rankings.at(-1)?.rank, null);
});

test("calculates item score rate, difficulty, discrimination, and knowledge mastery", () => {
  const analysis = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: sampleSubmissions(),
    items,
    totalStudents: 11,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a"
  });

  const q1 = analysis.itemAnalysis.find((item) => item.questionId === "q1");
  const q2 = analysis.itemAnalysis.find((item) => item.questionId === "q2");
  assert.equal(q1?.averagePoints, 6.8);
  assert.equal(q1?.scoreRate, 68);
  assert.equal(q1?.difficultyIndex, 68);
  assert.equal(q1?.discriminationIndex, 56.7);
  assert.equal(q1?.correctRate, 20);
  assert.equal(q2?.scoreRate, 67);
  assert.equal(q2?.discriminationIndex, 56.7);

  assert.deepEqual(
    analysis.knowledgeMastery.map((topic) => [topic.topicId, topic.earnedPoints, topic.maxPoints, topic.masteryRate, topic.questionCount]),
    [
      ["geometry", 67, 100, 67, 1],
      ["linear-equations", 68, 100, 68, 1]
    ]
  );
});

test("returns no discrimination when fewer than 10 scored students are available", () => {
  const analysis = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: sampleSubmissions().slice(0, 9),
    items,
    totalStudents: 9,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a"
  });

  assert.equal(analysis.itemAnalysis[0]?.discriminationIndex, null);
});

test("classifies borderline students and computes same-grade comparison cohorts", () => {
  const currentScores = sampleSubmissions()
    .filter((entry) => entry.score !== null)
    .map((entry) => Math.round(((entry.score ?? 0) / entry.maxScore) * 100));
  const analysis = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: sampleSubmissions(),
    items,
    totalStudents: 11,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a",
    gradeComparisonCohorts: [
      {
        classId: "class-a",
        className: "Class A",
        assessmentId: "assessment-a",
        studentCount: 11,
        scorePercentages: currentScores
      },
      {
        classId: "class-b",
        className: "Class B",
        assessmentId: "assessment-b",
        studentCount: 4,
        scorePercentages: [80, 80, 70]
      }
    ]
  });

  const borderlineByStudent = analysis.borderlineStudents.map((entry) => [entry.studentId, entry.type, entry.percentage, entry.threshold]);
  assert.deepEqual(borderlineByStudent, [
    ["student-3", "excellent-borderline", 90, 85],
    ["student-4", "excellent-borderline", 80, 85],
    ["student-9", "low-score-risk", 40, 40],
    ["student-10", "low-score-risk", 30, 40],
    ["student-6", "pass-borderline", 60, 60],
    ["student-7", "pass-borderline", 55, 60]
  ]);

  assert.equal(analysis.gradeComparison.available, true);
  assert.equal(analysis.gradeComparison.assessmentCount, 2);
  assert.equal(analysis.gradeComparison.gradeAverageScore, 69.6);
  assert.equal(analysis.gradeComparison.currentClassAverageScore, 67.5);
  assert.equal(analysis.gradeComparison.currentClassRank, 2);
});

test("handles empty and single scored cohorts consistently", () => {
  const empty = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: [],
    items,
    totalStudents: 0,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a"
  });
  assert.equal(empty.summary.averageScore, null);
  assert.equal(empty.summary.standardDeviation, null);
  assert.equal(empty.summary.passRate, null);

  const single = buildTeacherAssessmentAnalysis({
    settings: defaultAssessmentAnalysisSettings,
    submissions: [submission(1, 7, 7)],
    items,
    totalStudents: 1,
    currentClassId: "class-a",
    currentAssessmentId: "assessment-a"
  });
  assert.equal(single.summary.averageScore, 70);
  assert.equal(single.summary.standardDeviation, 0);
});
