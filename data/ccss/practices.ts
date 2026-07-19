/**
 * The eight Standards for Mathematical Practice.
 *
 * CCSS-M has two halves: the grade-level *content* standards (encoded per
 * grade) and these *practice* standards, which describe the habits of mind
 * that run across every grade K–12. Canonical ids are `CCSS.MATH.PRACTICE.MP1`
 * … `MP8`.
 */

export interface Practice {
  id: string; // canonical CCSS id
  code: string; // short code, e.g. "MP1"
  title: string;
  description: string;
}

export const mathematicalPractices: Practice[] = [
  {
    id: "CCSS.MATH.PRACTICE.MP1",
    code: "MP1",
    title: "Make sense of problems and persevere in solving them",
    description:
      "Start by understanding the problem, plan a path, and keep going when the first approach stalls.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP2",
    code: "MP2",
    title: "Reason abstractly and quantitatively",
    description:
      "Move fluently between the numbers in a situation and the symbols that represent them.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP3",
    code: "MP3",
    title: "Construct viable arguments and critique the reasoning of others",
    description:
      "Justify your conclusions and listen to, question, and build on the reasoning of classmates.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP4",
    code: "MP4",
    title: "Model with mathematics",
    description:
      "Use math to describe real situations — with equations, diagrams, tables, or graphs.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP5",
    code: "MP5",
    title: "Use appropriate tools strategically",
    description:
      "Choose the right tool — ruler, number line, calculator, or diagram — for the task at hand.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP6",
    code: "MP6",
    title: "Attend to precision",
    description:
      "Communicate precisely: clear definitions, correct units, and accurate calculations.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP7",
    code: "MP7",
    title: "Look for and make use of structure",
    description:
      "Notice patterns and structure — like place value or the distributive property — and use them.",
  },
  {
    id: "CCSS.MATH.PRACTICE.MP8",
    code: "MP8",
    title: "Look for and express regularity in repeated reasoning",
    description:
      "Spot when calculations repeat, and turn that regularity into general methods and shortcuts.",
  },
];
