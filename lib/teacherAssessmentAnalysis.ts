import type {
  AssessmentAnalysisBorderlineType,
  AssessmentAnalysisSettings,
  AssessmentSubmissionAnswer,
  AssessmentSubmissionStatus,
  LocalizedText,
  QuestionType,
  TeacherAssessmentAnalysis,
  TeacherAssessmentGradeComparisonClass,
  TeacherAssessmentQuestionAnalytics,
  TeacherAssessmentRankingEntry
} from "@/types";

export type TeacherAssessmentAnalysisSubmissionInput = {
  id: string;
  studentId: string;
  studentName: string;
  status: AssessmentSubmissionStatus;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  answers: AssessmentSubmissionAnswer[];
};

export type TeacherAssessmentAnalysisItemInput = {
  questionId: string;
  prompt: LocalizedText;
  correctAnswer?: string;
  explanation?: LocalizedText;
  sectionId?: string;
  sectionTitle?: LocalizedText;
  topicId?: string;
  topicTitle?: LocalizedText;
  questionType?: QuestionType | "manual";
  maxPoints: number;
};

export type TeacherAssessmentGradeComparisonCohortInput = {
  classId: string;
  className: string;
  assessmentId: string;
  studentCount: number;
  scorePercentages: number[];
};

export const defaultAssessmentAnalysisSettings: AssessmentAnalysisSettings = {
  passThreshold: 60,
  excellentThreshold: 85,
  lowScoreThreshold: 40,
  borderlineRange: 5,
  scoreBands: [
    { label: "0-39", min: 0, max: 39 },
    { label: "40-59", min: 40, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-84", min: 70, max: 84 },
    { label: "85-100", min: 85, max: 100 }
  ]
};

function bounded(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100) : null;
}

function normalizeBandLabel(min: number, max: number) {
  return `${min}-${max}`;
}

export function normalizeAssessmentAnalysisSettings(value?: Partial<AssessmentAnalysisSettings> | null): AssessmentAnalysisSettings {
  const fallback = defaultAssessmentAnalysisSettings;
  const rawBands = Array.isArray(value?.scoreBands) && value?.scoreBands.length ? value.scoreBands : fallback.scoreBands;
  const scoreBands = rawBands
    .map((band) => {
      const min = bounded(band?.min, 0, 0, 100);
      const max = bounded(band?.max, 100, 0, 100);
      if (max < min) return null;
      const label = typeof band?.label === "string" && band.label.trim() ? band.label.trim().slice(0, 32) : normalizeBandLabel(min, max);
      return { label, min, max };
    })
    .filter((band): band is AssessmentAnalysisSettings["scoreBands"][number] => Boolean(band))
    .slice(0, 8);

  return {
    passThreshold: bounded(value?.passThreshold, fallback.passThreshold, 0, 100),
    excellentThreshold: bounded(value?.excellentThreshold, fallback.excellentThreshold, 0, 100),
    lowScoreThreshold: bounded(value?.lowScoreThreshold, fallback.lowScoreThreshold, 0, 100),
    borderlineRange: bounded(value?.borderlineRange, fallback.borderlineRange, 0, 30),
    scoreBands: scoreBands.length ? scoreBands : fallback.scoreBands,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : undefined
  };
}

function submissionPercentage(submission: Pick<TeacherAssessmentAnalysisSubmissionInput, "score" | "maxScore">) {
  return submission.score === null || submission.maxScore <= 0 ? null : round((submission.score / submission.maxScore) * 100);
}

function scoredSubmissions(submissions: TeacherAssessmentAnalysisSubmissionInput[]) {
  return submissions
    .map((submission) => ({ submission, percentage: submissionPercentage(submission) }))
    .filter((entry): entry is { submission: TeacherAssessmentAnalysisSubmissionInput; percentage: number } => entry.percentage !== null);
}

function standardDeviation(values: number[]) {
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length;
  return round(Math.sqrt(variance), 1);
}

function borderlineTypesFor(percentageValue: number, settings: AssessmentAnalysisSettings): AssessmentAnalysisBorderlineType[] {
  const types: AssessmentAnalysisBorderlineType[] = [];
  if (Math.abs(percentageValue - settings.passThreshold) <= settings.borderlineRange) types.push("pass-borderline");
  if (Math.abs(percentageValue - settings.excellentThreshold) <= settings.borderlineRange) types.push("excellent-borderline");
  if (percentageValue <= settings.lowScoreThreshold + settings.borderlineRange) types.push("low-score-risk");
  return types;
}

function buildRankings(submissions: TeacherAssessmentAnalysisSubmissionInput[], settings: AssessmentAnalysisSettings): TeacherAssessmentRankingEntry[] {
  const sorted = scoredSubmissions(submissions).sort((a, b) => b.percentage - a.percentage || a.submission.studentName.localeCompare(b.submission.studentName));
  const rankByStudentId = new Map<string, number>();
  let previousPercentage: number | null = null;
  let currentRank = 0;
  sorted.forEach((entry, index) => {
    if (previousPercentage === null || entry.percentage !== previousPercentage) currentRank = index + 1;
    previousPercentage = entry.percentage;
    rankByStudentId.set(entry.submission.studentId, currentRank);
  });

  return submissions
    .map((submission) => {
      const percentageValue = submissionPercentage(submission);
      return {
        rank: percentageValue === null ? null : rankByStudentId.get(submission.studentId) ?? null,
        studentId: submission.studentId,
        studentName: submission.studentName,
        status: submission.status,
        score: submission.score,
        maxScore: submission.maxScore,
        percentage: percentageValue,
        submittedAt: submission.submittedAt,
        borderlineTypes: percentageValue === null ? [] : borderlineTypesFor(percentageValue, settings)
      };
    })
    .sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank || a.studentName.localeCompare(b.studentName);
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return a.studentName.localeCompare(b.studentName);
    });
}

function average(values: number[]) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 1) : null;
}

function answerFor(submission: TeacherAssessmentAnalysisSubmissionInput, questionId: string) {
  return submission.answers.find((answer) => answer.questionId === questionId);
}

function answerPointsRate(answer: AssessmentSubmissionAnswer | undefined, maxPoints: number) {
  const earned = answer?.pointsEarned;
  const answerMax = answer?.maxPoints && answer.maxPoints > 0 ? answer.maxPoints : maxPoints;
  if (earned === null || typeof earned === "undefined" || answerMax <= 0) return null;
  return Math.max(0, Math.min(100, (earned / answerMax) * 100));
}

function groupItemRate(group: Array<{ submission: TeacherAssessmentAnalysisSubmissionInput }>, questionId: string, maxPoints: number) {
  const rates = group
    .map((entry) => answerPointsRate(answerFor(entry.submission, questionId), maxPoints))
    .filter((value): value is number => value !== null);
  return average(rates);
}

function itemDiscrimination(
  questionId: string,
  maxPoints: number,
  scored: Array<{ submission: TeacherAssessmentAnalysisSubmissionInput; percentage: number }>
) {
  if (scored.length < 10) return null;
  const groupSize = Math.max(1, Math.round(scored.length * 0.27));
  const ordered = [...scored].sort((a, b) => b.percentage - a.percentage);
  const topRate = groupItemRate(ordered.slice(0, groupSize), questionId, maxPoints);
  const bottomRate = groupItemRate(ordered.slice(-groupSize), questionId, maxPoints);
  return topRate === null || bottomRate === null ? null : round(topRate - bottomRate, 1);
}

function buildItemAnalysis(
  submissions: TeacherAssessmentAnalysisSubmissionInput[],
  items: TeacherAssessmentAnalysisItemInput[]
): TeacherAssessmentQuestionAnalytics[] {
  const scored = scoredSubmissions(submissions);
  return items.map((item) => {
    const answers = submissions
      .map((submission) => answerFor(submission, item.questionId))
      .filter((answer): answer is AssessmentSubmissionAnswer => Boolean(answer));
    const respondedAnswers = answers.filter((answer) => answer.isCorrect !== null || answer.pointsEarned !== null);
    const correctCount = respondedAnswers.filter((answer) => answer.isCorrect).length;
    const wrongCounts = new Map<string, number>();
    respondedAnswers
      .filter((answer) => answer.isCorrect === false && answer.answer.trim())
      .forEach((answer) => wrongCounts.set(answer.answer, (wrongCounts.get(answer.answer) ?? 0) + 1));
    const earnedPoints = respondedAnswers.reduce((sum, answer) => sum + (answer.pointsEarned ?? 0), 0);
    const availablePoints = respondedAnswers.reduce((sum, answer) => sum + (answer.maxPoints > 0 ? answer.maxPoints : item.maxPoints), 0);
    const scoreRate = percent(earnedPoints, availablePoints);

    return {
      questionId: item.questionId,
      prompt: item.prompt,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      sectionId: item.sectionId,
      sectionTitle: item.sectionTitle,
      topicId: item.topicId,
      topicTitle: item.topicTitle,
      questionType: item.questionType,
      maxPoints: item.maxPoints,
      averagePoints: respondedAnswers.length ? round(earnedPoints / respondedAnswers.length, 1) : null,
      scoreRate,
      difficultyIndex: scoreRate,
      discriminationIndex: itemDiscrimination(item.questionId, item.maxPoints, scored),
      correctRate: percent(correctCount, respondedAnswers.length),
      correctCount,
      totalResponses: respondedAnswers.length,
      commonWrongAnswer: Array.from(wrongCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    };
  });
}

function buildKnowledgeMastery(submissions: TeacherAssessmentAnalysisSubmissionInput[], items: TeacherAssessmentAnalysisItemInput[]) {
  const topicMap = new Map<string, {
    topicTitle: LocalizedText;
    earnedPoints: number;
    maxPoints: number;
    questionIds: Set<string>;
  }>();

  items.forEach((item) => {
    const topicId = item.topicId ?? "unmapped";
    const record = topicMap.get(topicId) ?? {
      topicTitle: item.topicTitle ?? { en: "Unmapped topic", zh: "未對應課題", zhHans: "未对应课题" },
      earnedPoints: 0,
      maxPoints: 0,
      questionIds: new Set<string>()
    };
    record.questionIds.add(item.questionId);
    submissions.forEach((submission) => {
      const answer = answerFor(submission, item.questionId);
      if (!answer || answer.pointsEarned === null) return;
      record.earnedPoints += answer.pointsEarned;
      record.maxPoints += answer.maxPoints > 0 ? answer.maxPoints : item.maxPoints;
    });
    topicMap.set(topicId, record);
  });

  return Array.from(topicMap.entries())
    .map(([topicId, record]) => ({
      topicId,
      topicTitle: record.topicTitle,
      earnedPoints: round(record.earnedPoints, 1),
      maxPoints: round(record.maxPoints, 1),
      masteryRate: percent(record.earnedPoints, record.maxPoints),
      questionCount: record.questionIds.size
    }))
    .sort((a, b) => (a.masteryRate ?? 101) - (b.masteryRate ?? 101) || a.topicId.localeCompare(b.topicId));
}

function buildGradeComparison(
  currentClassId: string,
  currentAssessmentId: string,
  cohorts: TeacherAssessmentGradeComparisonCohortInput[] = []
) {
  const classes: TeacherAssessmentGradeComparisonClass[] = cohorts.map((cohort) => ({
    classId: cohort.classId,
    className: cohort.className,
    assessmentId: cohort.assessmentId,
    averageScore: average(cohort.scorePercentages),
    submittedCount: cohort.scorePercentages.length,
    studentCount: cohort.studentCount
  }));
  const allPercentages = cohorts.flatMap((cohort) => cohort.scorePercentages);
  const rankedClasses = classes
    .filter((cohort) => cohort.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1) || a.className.localeCompare(b.className));
  let currentClassRank: number | null = null;
  let previousAverage: number | null = null;
  let rank = 0;
  rankedClasses.forEach((cohort, index) => {
    if (previousAverage === null || cohort.averageScore !== previousAverage) rank = index + 1;
    previousAverage = cohort.averageScore;
    if (cohort.classId === currentClassId && cohort.assessmentId === currentAssessmentId) currentClassRank = rank;
  });
  const currentClass = classes.find((cohort) => cohort.classId === currentClassId && cohort.assessmentId === currentAssessmentId);
  const available = classes.length > 1 && allPercentages.length > 0;

  return {
    available,
    scopeLabel: { en: "Same school, grade, year, and exam group", zh: "同校同年級同學年同考試組", zhHans: "同校同年级同学年同考试组" },
    assessmentCount: cohorts.length,
    classCount: new Set(cohorts.map((cohort) => cohort.classId)).size,
    submittedCount: allPercentages.length,
    gradeAverageScore: average(allPercentages),
    currentClassAverageScore: currentClass?.averageScore ?? null,
    currentClassRank,
    classes,
    message: available
      ? { en: "Grade comparison is based on matched exam-group submissions.", zh: "年級對比按同一考試組提交記錄計算。", zhHans: "年级对比按同一考试组提交记录计算。" }
      : { en: "No matched same-grade paper is available yet.", zh: "暫無可比較的同年級同卷數據。", zhHans: "暂无可比较的同年级同卷数据。" }
  };
}

export function buildTeacherAssessmentAnalysis({
  settings,
  submissions,
  items,
  totalStudents,
  gradeComparisonCohorts,
  currentClassId,
  currentAssessmentId
}: {
  settings: AssessmentAnalysisSettings;
  submissions: TeacherAssessmentAnalysisSubmissionInput[];
  items: TeacherAssessmentAnalysisItemInput[];
  totalStudents: number;
  gradeComparisonCohorts?: TeacherAssessmentGradeComparisonCohortInput[];
  currentClassId: string;
  currentAssessmentId: string;
}): TeacherAssessmentAnalysis {
  const normalizedSettings = normalizeAssessmentAnalysisSettings(settings);
  const scored = scoredSubmissions(submissions);
  const percentages = scored.map((entry) => entry.percentage);
  const highestScore = percentages.length ? Math.max(...percentages) : null;
  const lowestScore = percentages.length ? Math.min(...percentages) : null;
  const rankings = buildRankings(submissions, normalizedSettings);
  const scoreBands = normalizedSettings.scoreBands.map((band) => {
    const count = percentages.filter((percentageValue) => percentageValue >= band.min && percentageValue <= band.max).length;
    return {
      ...band,
      count,
      percentage: percent(count, percentages.length) ?? 0
    };
  });
  const itemAnalysis = buildItemAnalysis(submissions, items);

  return {
    settings: normalizedSettings,
    summary: {
      submittedCount: scored.length,
      totalStudents,
      highestScore,
      lowestScore,
      averageScore: average(percentages),
      standardDeviation: standardDeviation(percentages),
      passRate: percent(percentages.filter((value) => value >= normalizedSettings.passThreshold).length, percentages.length),
      excellentRate: percent(percentages.filter((value) => value >= normalizedSettings.excellentThreshold).length, percentages.length),
      lowScoreRate: percent(percentages.filter((value) => value <= normalizedSettings.lowScoreThreshold).length, percentages.length)
    },
    scoreBands,
    rankings,
    itemAnalysis,
    knowledgeMastery: buildKnowledgeMastery(submissions, items),
    gradeComparison: buildGradeComparison(currentClassId, currentAssessmentId, gradeComparisonCohorts),
    borderlineStudents: rankings
      .flatMap((entry) => entry.borderlineTypes.map((type) => {
        const threshold =
          type === "excellent-borderline"
            ? normalizedSettings.excellentThreshold
            : type === "low-score-risk"
              ? normalizedSettings.lowScoreThreshold
              : normalizedSettings.passThreshold;
        return {
          studentId: entry.studentId,
          studentName: entry.studentName,
          type,
          score: entry.score,
          maxScore: entry.maxScore,
          percentage: entry.percentage,
          threshold,
          gap: entry.percentage === null ? 0 : round(entry.percentage - threshold, 1)
        };
      }))
      .sort((a, b) => a.type.localeCompare(b.type) || Math.abs(a.gap) - Math.abs(b.gap) || a.studentName.localeCompare(b.studentName))
  };
}
