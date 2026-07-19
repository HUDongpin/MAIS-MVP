import type { Band, Grade, GradeId, Standard } from "./types";
import { gradeK, grade1, grade2 } from "./grades-k2";
import { grade3, grade4, grade5 } from "./grades-35";
import { grade6, grade7, grade8 } from "./grades-68";
import { gradeHS } from "./grade-hs";

export * from "./types";
export { mathematicalPractices } from "./practices";
export type { Practice } from "./practices";

/** Every grade K → HS, in order. */
export const grades: Grade[] = [
  gradeK,
  grade1,
  grade2,
  grade3,
  grade4,
  grade5,
  grade6,
  grade7,
  grade8,
  gradeHS,
];

/** Grade bands used for navigation and color-coding. */
export const bands: Band[] = [
  {
    id: "early",
    label: "Early Elementary",
    grades: ["K", "1", "2"],
    colorVar: "--band-early",
    blurb: "Counting, place value, and the meaning of the four operations.",
  },
  {
    id: "upper",
    label: "Upper Elementary",
    grades: ["3", "4", "5"],
    colorVar: "--band-upper",
    blurb: "Multiplication and division, fractions as numbers, and decimals.",
  },
  {
    id: "middle",
    label: "Middle School",
    grades: ["6", "7", "8"],
    colorVar: "--band-middle",
    blurb: "Ratios, the rational-number system, expressions, and functions.",
  },
  {
    id: "high",
    label: "High School",
    grades: ["HS"],
    colorVar: "--band-high",
    blurb: "Algebra, functions, geometry, and statistics for college readiness.",
  },
];

const gradeById = new Map(grades.map((g) => [g.id, g]));

export function getGrade(id: string): Grade | undefined {
  return gradeById.get(id as GradeId);
}

export function getBand(id: string): Band | undefined {
  return bands.find((b) => b.id === id);
}

export function bandForGrade(id: GradeId): Band {
  return bands.find((b) => b.grades.includes(id))!;
}

/** Find a single standard by its canonical id, anywhere in K–12. */
export function findStandard(
  standardId: string,
): { grade: Grade; standard: Standard } | undefined {
  for (const grade of grades) {
    for (const domain of grade.domains) {
      for (const cluster of domain.clusters) {
        const standard = cluster.standards.find((s) => s.id === standardId);
        if (standard) return { grade, standard };
      }
    }
  }
  return undefined;
}
