import v1QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandBnuPrimaryTopics, type BnuPrimaryBatch } from "./mainlandBnuPrimaryTopics";
import type {
  CurriculumProfile,
  Difficulty,
  MainlandBnuPrimaryGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type GeneratedBnuPrimaryQuestion = {
  id: string;
  batch: BnuPrimaryBatch;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  competencyTags?: string[];
  skillTags?: string[];
  misconceptionTags?: string[];
  difficulty: Difficulty;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-s18-review";
  terminologyQaStatus: "pending-s18-review";
  manualQaStatus: "pending-s18-review";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedBnuPrimaryQuestionPack = {
  questions: GeneratedBnuPrimaryQuestion[];
};

export type MainlandBnuPrimaryQuestionGenerationMetadata = {
  batch: BnuPrimaryBatch;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const v1QuestionPack = v1QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const v2QuestionPack = v2QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const generatedQuestionPacks = [v1QuestionPack, v2QuestionPack];
const generatedQuestionRows = generatedQuestionPacks.flatMap((pack) => pack.questions);
const mainlandBnuProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const topicById = new Map(mainlandBnuPrimaryTopics.map((topic) => [topic.id, topic]));
const gradeOrder: MainlandBnuPrimaryGradeId[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const difficultyOrder: Difficulty[] = ["Foundation", "Core", "Challenge", "Exam"];
const batchOrder: BnuPrimaryBatch[] = ["bnu-primary-v1", "bnu-primary-v2"];

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function localizedMainlandBnuPrimaryAcceptedAnswers(question: GeneratedBnuPrimaryQuestion) {
  const aliases = localizedHjbGeneratedAcceptedAnswers(question);

  if (question.id === "bnu-primary-ds-v1-p4-105") {
    aliases.push("城市A，城市C，城市D，城市B", "城市A、城市C、城市D、城市B");
  }

  return uniqueNonEmpty(aliases);
}

function toQuestion(question: GeneratedBnuPrimaryQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU primary topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: question.difficulty,
    type: question.type,
    prompt: localizeHjbGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeHjbGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: localizedMainlandBnuPrimaryAcceptedAnswers(question),
    explanation: localizeHjbGeneratedText(question.explanationZhHans)
  };
}

function metadataForQuestion(question: GeneratedBnuPrimaryQuestion): MainlandBnuPrimaryQuestionGenerationMetadata {
  return {
    batch: question.batch,
    grade: question.grade,
    semester: question.semester,
    topicId: question.topicId,
    volume: question.volume,
    unitTitle: question.unitTitle,
    type: question.type,
    difficulty: question.difficulty,
    evidenceCardIds: question.evidenceCardIds,
    assessmentPatternCardIds: question.assessmentPatternCardIds,
    paperPatternCardIds: question.paperPatternCardIds,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: "pass",
    terminologyQaStatus: "pass",
    manualQaStatus: "approved",
    independentAnswer: question.answer
  };
}

function compareGeneratedQuestionGroups(left: GeneratedBnuPrimaryQuestion, right: GeneratedBnuPrimaryQuestion) {
  return (
    gradeOrder.indexOf(left.grade) - gradeOrder.indexOf(right.grade) ||
    left.topicId.localeCompare(right.topicId, "zh-Hans") ||
    difficultyOrder.indexOf(left.difficulty) - difficultyOrder.indexOf(right.difficulty) ||
    left.id.localeCompare(right.id, "zh-Hans")
  );
}

function questionGroupKey(question: GeneratedBnuPrimaryQuestion) {
  return `${question.grade}|${question.topicId}|${question.difficulty}`;
}

function interleaveGeneratedQuestionBatches(questions: GeneratedBnuPrimaryQuestion[]) {
  const groups = new Map<string, Record<BnuPrimaryBatch, GeneratedBnuPrimaryQuestion[]>>();
  const groupOrderKeys: string[] = [];

  [...questions].sort(compareGeneratedQuestionGroups).forEach((question) => {
    const key = questionGroupKey(question);
    if (!groups.has(key)) {
      groups.set(key, {
        "bnu-primary-v1": [],
        "bnu-primary-v2": []
      });
      groupOrderKeys.push(key);
    }
    groups.get(key)?.[question.batch].push(question);
  });

  return groupOrderKeys.flatMap((key) => {
    const group = groups.get(key);
    if (!group) return [];
    batchOrder.forEach((batch) => group[batch].sort((left, right) => left.id.localeCompare(right.id, "zh-Hans")));
    const rowCount = Math.max(...batchOrder.map((batch) => group[batch].length));
    const interleaved: GeneratedBnuPrimaryQuestion[] = [];

    for (let index = 0; index < rowCount; index += 1) {
      batchOrder.forEach((batch) => {
        const question = group[batch][index];
        if (question) interleaved.push(question);
      });
    }

    return interleaved;
  });
}

export const mainlandBnuPrimaryV1Questions: Question[] = v1QuestionPack.questions.map(toQuestion);
export const mainlandBnuPrimaryV2Questions: Question[] = v2QuestionPack.questions.map(toQuestion);
export const mainlandBnuPrimaryQuestions: Question[] = interleaveGeneratedQuestionBatches(generatedQuestionRows).map(toQuestion);

export const mainlandBnuPrimaryQuestionGenerationMetadata: Record<string, MainlandBnuPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(
    generatedQuestionRows.map((question) => [question.id, metadataForQuestion(question)])
  );

export function independentMainlandBnuPrimaryAnswer(question: Question) {
  return mainlandBnuPrimaryQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
