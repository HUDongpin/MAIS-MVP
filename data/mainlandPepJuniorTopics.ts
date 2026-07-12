import { mainlandPepJuniorRagCards } from "./rag/mainlandPepJunior";
import type { Difficulty, MainlandPepDifficultyBand, MainlandPepSemester, Topic } from "@/types";

type MainlandPepJuniorTopicMetadata = {
  semester: MainlandPepSemester;
  ragCardId: string;
  difficultyBand?: MainlandPepDifficultyBand;
};

const mainlandPepProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_PEP" as const };

const englishTitles: Record<string, string> = {
  "pep-junior-s1-upper-rational-numbers": "Rational Numbers and the Number Line",
  "pep-junior-s1-upper-expressions-linear-equations": "Expressions and One-Variable Linear Equations",
  "pep-junior-s1-upper-geometric-figures": "Foundations of Geometric Figures",
  "pep-junior-s1-lower-lines-coordinates": "Intersecting Lines, Parallel Lines, and Coordinates",
  "pep-junior-s1-lower-equations-inequalities-data": "Systems, Inequalities, and Introductory Data",
  "pep-junior-s2-upper-triangles-congruence": "Triangles, Congruence, and Axis Symmetry",
  "pep-junior-s2-upper-polynomials-fractions": "Polynomial Products, Factorization, and Algebraic Fractions",
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": "Radicals, Pythagorean Reasoning, and Quadrilaterals",
  "pep-junior-s2-lower-linear-functions-data": "Linear Functions and Data Analysis",
  "pep-junior-s3-upper-quadratics-circle-probability": "Quadratics, Circles, and Introductory Probability",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "Inverse Proportion, Similarity, and Right-Triangle Trigonometry"
};

function difficultyFromBand(band: MainlandPepDifficultyBand | undefined): Difficulty {
  if (band === "foundation") return "Low";
  if (band === "exam" || band === "challenge") return "High";
  return "Medium";
}

function minutesFromBand(band: MainlandPepDifficultyBand | undefined) {
  if (band === "foundation") return 40;
  if (band === "exam") return 50;
  if (band === "challenge") return 55;
  return 45;
}

export const mainlandPepJuniorTopicMetadata: Record<string, MainlandPepJuniorTopicMetadata> = Object.fromEntries(
  mainlandPepJuniorRagCards
    .filter((card) => card.stage === "junior-secondary")
    .map((card) => [
      card.id,
      {
        semester: card.semester,
        ragCardId: card.id,
        difficultyBand: card.difficultyBand
      }
    ])
);

export const mainlandPepJuniorTopics: Topic[] = mainlandPepJuniorRagCards
  .filter((card) => card.stage === "junior-secondary")
  .map((card, index) => ({
    id: card.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandPepProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_PEP",
    canonicalTopicId: card.id,
    grade: card.grade,
    title: { en: englishTitles[card.id] ?? card.unitTitle, zh: card.unitTitle, zhHans: card.unitTitle },
    description: {
      en: card.safeSummary,
      zh: `围绕${card.unitTitle}建立概念、方法、易错点诊断和原创练习迁移。`,
      zhHans: `围绕${card.unitTitle}建立概念、方法、易错点诊断和原创练习迁移。`
    },
    status: index % 4 === 0 ? "completed" : index % 4 === 1 ? "in-progress" : "not-started",
    difficulty: difficultyFromBand(card.difficultyBand),
    minutes: minutesFromBand(card.difficultyBand),
    mastery: index % 4 === 0 ? 70 : index % 4 === 1 ? 44 : 0
  }));
