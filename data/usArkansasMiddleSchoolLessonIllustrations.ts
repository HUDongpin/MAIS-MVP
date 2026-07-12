import type { LocalizedText } from "@/types";

export type UsArkansasMiddleSchoolLessonIllustrationSlot = "concept" | "worked-example";

export type UsArkansasMiddleSchoolLessonIllustration = {
  id: string;
  topicId: string;
  slot: UsArkansasMiddleSchoolLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

type ArkansasIllustrationChapterSeed = {
  sourceChapterId: string;
  topicId: string;
  gradeLabel: string;
  chapterTitle: string;
  standardIds: string[];
};

const chapterSeeds: ArkansasIllustrationChapterSeed[] = [
  {
    sourceChapterId: "us-ar-math-p6-chapter-01",
    topicId: "us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning",
    gradeLabel: "Grade 6",
    chapterTitle: "Ratios, Rates, and Percent Reasoning",
    standardIds: ["AR.Math.G6.RP"]
  },
  {
    sourceChapterId: "us-ar-math-p6-chapter-02",
    topicId: "us-ar-math-g06-chapter-02-rational-numbers-and-the-number-line",
    gradeLabel: "Grade 6",
    chapterTitle: "Rational Numbers and the Number Line",
    standardIds: ["AR.Math.G6.NS"]
  },
  {
    sourceChapterId: "us-ar-math-p6-chapter-03",
    topicId: "us-ar-math-g06-chapter-03-expressions-equations-and-variables",
    gradeLabel: "Grade 6",
    chapterTitle: "Expressions, Equations, and Variables",
    standardIds: ["AR.Math.G6.EE"]
  },
  {
    sourceChapterId: "us-ar-math-p6-chapter-04",
    topicId: "us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume",
    gradeLabel: "Grade 6",
    chapterTitle: "Geometry: Area, Surface Area, and Volume",
    standardIds: ["AR.Math.G6.G"]
  },
  {
    sourceChapterId: "us-ar-math-p6-chapter-05",
    topicId: "us-ar-math-g06-chapter-05-statistics-and-data-distributions",
    gradeLabel: "Grade 6",
    chapterTitle: "Statistics and Data Distributions",
    standardIds: ["AR.Math.G6.SP"]
  },
  {
    sourceChapterId: "us-ar-math-s1-chapter-01",
    topicId: "us-ar-math-g07-chapter-01-proportional-relationships",
    gradeLabel: "Grade 7",
    chapterTitle: "Proportional Relationships",
    standardIds: ["AR.Math.G7.RP"]
  },
  {
    sourceChapterId: "us-ar-math-s1-chapter-02",
    topicId: "us-ar-math-g07-chapter-02-operations-with-rational-numbers",
    gradeLabel: "Grade 7",
    chapterTitle: "Operations with Rational Numbers",
    standardIds: ["AR.Math.G7.NS"]
  },
  {
    sourceChapterId: "us-ar-math-s1-chapter-03",
    topicId: "us-ar-math-g07-chapter-03-linear-expressions-and-equations",
    gradeLabel: "Grade 7",
    chapterTitle: "Linear Expressions and Equations",
    standardIds: ["AR.Math.G7.EE"]
  },
  {
    sourceChapterId: "us-ar-math-s1-chapter-04",
    topicId: "us-ar-math-g07-chapter-04-scale-geometry-and-measurement",
    gradeLabel: "Grade 7",
    chapterTitle: "Scale, Geometry, and Measurement",
    standardIds: ["AR.Math.G7.G"]
  },
  {
    sourceChapterId: "us-ar-math-s1-chapter-05",
    topicId: "us-ar-math-g07-chapter-05-sampling-probability-and-inference",
    gradeLabel: "Grade 7",
    chapterTitle: "Sampling, Probability, and Inference",
    standardIds: ["AR.Math.G7.SP"]
  },
  {
    sourceChapterId: "us-ar-math-s2-chapter-01",
    topicId: "us-ar-math-g08-chapter-01-linear-equations-and-systems-readiness",
    gradeLabel: "Grade 8",
    chapterTitle: "Linear Equations and Systems Readiness",
    standardIds: ["AR.Math.G8.EE"]
  },
  {
    sourceChapterId: "us-ar-math-s2-chapter-02",
    topicId: "us-ar-math-g08-chapter-02-functions-and-rate-of-change",
    gradeLabel: "Grade 8",
    chapterTitle: "Functions and Rate of Change",
    standardIds: ["AR.Math.G8.F"]
  },
  {
    sourceChapterId: "us-ar-math-s2-chapter-03",
    topicId: "us-ar-math-g08-chapter-03-transformations-and-similarity",
    gradeLabel: "Grade 8",
    chapterTitle: "Transformations and Similarity",
    standardIds: ["AR.Math.G8.G"]
  },
  {
    sourceChapterId: "us-ar-math-s2-chapter-04",
    topicId: "us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry",
    gradeLabel: "Grade 8",
    chapterTitle: "Pythagorean Reasoning and Coordinate Geometry",
    standardIds: ["AR.Math.G8.G"]
  },
  {
    sourceChapterId: "us-ar-math-s2-chapter-05",
    topicId: "us-ar-math-g08-chapter-05-bivariate-data-and-claims",
    gradeLabel: "Grade 8",
    chapterTitle: "Bivariate Data and Claims",
    standardIds: ["AR.Math.G8.SP"]
  }
];

const slotLabels: Record<UsArkansasMiddleSchoolLessonIllustrationSlot, string> = {
  concept: "concept opener",
  "worked-example": "worked example"
};

function localized(en: string): LocalizedText {
  return { en, zh: en, zhHans: en };
}

function toIllustration(
  chapter: ArkansasIllustrationChapterSeed,
  slot: UsArkansasMiddleSchoolLessonIllustrationSlot
): UsArkansasMiddleSchoolLessonIllustration {
  const slotLabel = slotLabels[slot];
  return {
    id: `${chapter.topicId}-${slot}`,
    topicId: chapter.topicId,
    slot,
    src: `/lesson-illustrations/us-ar-middle-school/${chapter.topicId}/${slot}-s24clip.png`,
    width: 1600,
    height: 900,
    alt: localized(
      `${chapter.gradeLabel} Arkansas ${chapter.chapterTitle} ${slotLabel} with deterministic mathematical labels, tables, axes, values, formulas, or measurements over an approved classroom-style background.`
    ),
    caption: localized(
      `${chapter.chapterTitle}: exact math is rendered as a deterministic layer; the background provides context only.`
    ),
    ragCardIds: [chapter.topicId, ...chapter.standardIds]
  };
}

// Draft metadata built ahead of S24 exact-layer asset production. The live
// export below is withdrawn until validated 1600x900 PNG assets exist under
// public/lesson-illustrations/us-ar-middle-school/.
export const usArkansasMiddleSchoolLessonIllustrationDrafts = chapterSeeds.flatMap((chapter) => [
  toIllustration(chapter, "concept"),
  toIllustration(chapter, "worked-example")
]) satisfies UsArkansasMiddleSchoolLessonIllustration[];

export const usArkansasMiddleSchoolLessonIllustrationWithdrawal = {
  date: "2026-07-09",
  decision: "withdrawn-assets-not-promoted",
  scope: "US Arkansas middle-school lesson illustrations",
  reason:
    "Illustration metadata was integrated ahead of S24 exact-layer asset production; no PNG assets exist in the repository or candidate packages. Withdrawn from live lessons pending A24 exact-layer production and A18 approval."
} as const;

export const usArkansasMiddleSchoolLessonIllustrations: UsArkansasMiddleSchoolLessonIllustration[] = [];

export function getUsArkansasMiddleSchoolLessonIllustration(
  _topicId: string,
  _slot: UsArkansasMiddleSchoolLessonIllustrationSlot
): UsArkansasMiddleSchoolLessonIllustration | null {
  return null;
}
