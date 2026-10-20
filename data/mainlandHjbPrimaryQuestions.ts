import questionPackJson from "./generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbPrimaryTopics } from "./mainlandHjbPrimaryTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  Difficulty,
  DifficultyRecord,
  MainlandHjbPrimaryGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type GeneratedHjbPrimaryQuestion = {
  id: string;
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  difficulty: DifficultyRecord;
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

type GeneratedHjbPrimaryQuestionPack = {
  questions: GeneratedHjbPrimaryQuestion[];
};

export type MainlandHjbPrimaryQuestionGenerationMetadata = {
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
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
  // These mirror the generated rows verbatim. They used to be narrowed to
  // `"pass"`/`"approved"`, which reported QA this content has not had: all 1,500
  // rows still say `pending-s18-review`, and only the automated source-distance
  // scan has passed. This package was de-reached on 2026-08-26 under
  // `de-reach-hjb-primary-v1` in
  // coordination/integration/v2/legacy-resolution-registry.v2.json
  // (`candidateMustBeUnreachable: true`, `liveAllowed: false`, empty
  // `approvalReferences`), and A04 removed the same overwrite from the HJB high
  // adapter in that slice. This matches that shape; see
  // docs/mainland-bnu-primary-candidate-gate.md.
  mathQaStatus: GeneratedHjbPrimaryQuestion["mathQaStatus"];
  terminologyQaStatus: GeneratedHjbPrimaryQuestion["terminologyQaStatus"];
  manualQaStatus: GeneratedHjbPrimaryQuestion["manualQaStatus"];
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedHjbPrimaryQuestionPack;
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbPrimaryTopics.map((topic) => [topic.id, topic]));

function toQuestion(question: GeneratedHjbPrimaryQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland HJB primary topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandHjbProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_HJB",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizeHjbGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeHjbGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: localizedHjbGeneratedAcceptedAnswers(question),
    explanation: localizeHjbGeneratedText(question.explanationZhHans)
  };
}

export const mainlandHjbPrimaryQuestionGenerationMetadata: Record<string, MainlandHjbPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: "hjb-primary-v1" as const,
        grade: question.grade,
        semester: question.semester,
        topicId: question.topicId,
        volume: question.volume,
        unitTitle: question.unitTitle,
        type: question.type,
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        assessmentPatternCardIds: question.assessmentPatternCardIds,
        paperPatternCardIds: question.paperPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: question.mathQaStatus,
        terminologyQaStatus: question.terminologyQaStatus,
        manualQaStatus: question.manualQaStatus,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbPrimaryAnswer(question: Question) {
  return mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbPrimaryQuestions: Question[] = questionPack.questions.map(toQuestion);
