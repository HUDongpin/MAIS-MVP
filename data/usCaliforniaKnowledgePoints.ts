import type { GradeId } from "@/types";

export {
  californiaMathematicalPracticeStandards,
  californiaMathematicalPracticeByCode,
  californiaMathematicalPracticeStandardIds
} from "./usCaliforniaMathematicalPractices";
export type { CaliforniaMathematicalPracticeStandard } from "./usCaliforniaMathematicalPractices";

export type CaliforniaKnowledgePoint = {
  topicId: string;
  grade: GradeId;
  code: string;
  title: string;
};

const gradeCodeByGrade: Partial<Record<GradeId, string>> = {
  K: "K",
  P1: "1",
  P2: "2",
  P3: "3",
  P4: "4",
  P5: "5",
  P6: "6",
  S1: "7",
  S2: "8",
  S3: "9",
  S4: "10",
  S5: "11",
  S6: "12"
};

const generatedChapterPattern = /^us-ca-math-(p6|s1|s2|s3|s4|s5|s6)-chapter-(\d+)$/;

function letterForIndex(index: number) {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function stripCaliforniaGradePrefix(title: string) {
  return title.replace(/^California Grade \d+:\s+/, "");
}

function stripKnowledgePointPrefix(title: string) {
  return title.replace(/^(K|\d{1,2})-[A-Z]\.\d+\s+/, "");
}

function displayTitle(knowledgePoint: CaliforniaKnowledgePoint) {
  return `${knowledgePoint.code} ${knowledgePoint.title}`;
}

const californiaK5KnowledgePointSpecs: CaliforniaKnowledgePoint[] = [
  {
    topicId: "us-ca-math-k-k-cc-count-sequence",
    grade: "K",
    code: "K-A.1",
    title: "Kindergarten Counting and Cardinality: Count Sequence"
  },
  {
    topicId: "us-ca-math-k-k-cc-cardinality-compare",
    grade: "K",
    code: "K-B.1",
    title: "Kindergarten Counting and Cardinality: Cardinality Compare"
  },
  {
    topicId: "us-ca-math-k-k-oa-compose-decompose",
    grade: "K",
    code: "K-C.1",
    title: "Kindergarten Operations and Algebraic Thinking: Compose Decompose"
  },
  {
    topicId: "us-ca-math-k-k-nbt-teen-numbers",
    grade: "K",
    code: "K-D.1",
    title: "Kindergarten Number and Operations in Base Ten: Teen Numbers"
  },
  {
    topicId: "us-ca-math-k-k-md-attributes-data",
    grade: "K",
    code: "K-E.1",
    title: "Kindergarten Measurement and Data: Attributes Data"
  },
  {
    topicId: "us-ca-math-k-k-g-shapes-position",
    grade: "K",
    code: "K-F.1",
    title: "Kindergarten Geometry: Shapes Position"
  },
  {
    topicId: "us-ca-math-p1-1-oa-add-subtract",
    grade: "P1",
    code: "1-A.1",
    title: "Grade 1 Operations and Algebraic Thinking: Add Subtract"
  },
  {
    topicId: "us-ca-math-p1-1-nbt-place-value",
    grade: "P1",
    code: "1-B.1",
    title: "Grade 1 Number and Operations in Base Ten: Place Value"
  },
  {
    topicId: "us-ca-math-p1-1-md-measure-data",
    grade: "P1",
    code: "1-C.1",
    title: "Grade 1 Measurement and Data: Measure Data"
  },
  {
    topicId: "us-ca-math-p1-1-g-shape-reasoning",
    grade: "P1",
    code: "1-D.1",
    title: "Grade 1 Geometry: Shape Reasoning"
  },
  {
    topicId: "us-ca-math-p2-2-oa-fluency-arrays",
    grade: "P2",
    code: "2-A.1",
    title: "Grade 2 Operations and Algebraic Thinking: Fluency Arrays"
  },
  {
    topicId: "us-ca-math-p2-2-nbt-three-digit-place-value",
    grade: "P2",
    code: "2-B.1",
    title: "Grade 2 Number and Operations in Base Ten: Three Digit Place Value"
  },
  {
    topicId: "us-ca-math-p2-2-md-measure-data-money-time",
    grade: "P2",
    code: "2-C.1",
    title: "Grade 2 Measurement and Data: Measure Data Money Time"
  },
  {
    topicId: "us-ca-math-p2-2-g-partition-shapes",
    grade: "P2",
    code: "2-D.1",
    title: "Grade 2 Geometry: Partition Shapes"
  },
  {
    topicId: "us-ca-math-p3-3-oa-mult-div",
    grade: "P3",
    code: "3-A.1",
    title: "Grade 3 Operations and Algebraic Thinking: Mult Div"
  },
  {
    topicId: "us-ca-math-p3-3-nbt-arithmetic",
    grade: "P3",
    code: "3-B.1",
    title: "Grade 3 Number and Operations in Base Ten: Arithmetic"
  },
  {
    topicId: "us-ca-math-p3-3-nf-fraction-meaning",
    grade: "P3",
    code: "3-C.1",
    title: "Grade 3 Number and Operations - Fractions: Fraction Meaning"
  },
  {
    topicId: "us-ca-math-p3-3-md-time-data-area-perimeter",
    grade: "P3",
    code: "3-D.1",
    title: "Grade 3 Measurement and Data: Time Data Area Perimeter"
  },
  {
    topicId: "us-ca-math-p3-3-g-categories",
    grade: "P3",
    code: "3-E.1",
    title: "Grade 3 Geometry: Categories"
  },
  {
    topicId: "us-ca-math-p4-4-oa-factors-patterns",
    grade: "P4",
    code: "4-A.1",
    title: "Grade 4 Operations and Algebraic Thinking: Factors Patterns"
  },
  {
    topicId: "us-ca-math-p4-4-nbt-multi-digit",
    grade: "P4",
    code: "4-B.1",
    title: "Grade 4 Number and Operations in Base Ten: Multi Digit"
  },
  {
    topicId: "us-ca-math-p4-4-nf-fraction-decimal",
    grade: "P4",
    code: "4-C.1",
    title: "Grade 4 Number and Operations - Fractions: Fraction Decimal"
  },
  {
    topicId: "us-ca-math-p4-4-md-conversion-angles",
    grade: "P4",
    code: "4-D.1",
    title: "Grade 4 Measurement and Data: Conversion Angles"
  },
  {
    topicId: "us-ca-math-p4-4-g-lines-shapes",
    grade: "P4",
    code: "4-E.1",
    title: "Grade 4 Geometry: Lines Shapes"
  },
  {
    topicId: "us-ca-math-p5-5-oa-expressions-patterns",
    grade: "P5",
    code: "5-A.1",
    title: "Grade 5 Operations and Algebraic Thinking: Expressions Patterns"
  },
  {
    topicId: "us-ca-math-p5-5-nbt-decimals",
    grade: "P5",
    code: "5-B.1",
    title: "Grade 5 Number and Operations in Base Ten: Decimals"
  },
  {
    topicId: "us-ca-math-p5-5-nf-operations",
    grade: "P5",
    code: "5-C.1",
    title: "Grade 5 Number and Operations - Fractions: Operations"
  },
  {
    topicId: "us-ca-math-p5-5-md-volume-data",
    grade: "P5",
    code: "5-D.1",
    title: "Grade 5 Measurement and Data: Volume Data"
  },
  {
    topicId: "us-ca-math-p5-5-g-coordinate-shapes",
    grade: "P5",
    code: "5-E.1",
    title: "Grade 5 Geometry: Coordinate Shapes"
  }
];

export const californiaStaticKnowledgePointSpecs: CaliforniaKnowledgePoint[] = californiaK5KnowledgePointSpecs;

export const californiaStaticKnowledgePointByTopicId = new Map(
  californiaStaticKnowledgePointSpecs.map((knowledgePoint) => [knowledgePoint.topicId, knowledgePoint])
);

export function californiaKnowledgePointForTopic(
  topicId: string,
  grade: GradeId,
  fallbackTitle: string
): CaliforniaKnowledgePoint {
  const staticKnowledgePoint = californiaStaticKnowledgePointByTopicId.get(topicId);
  if (staticKnowledgePoint) return staticKnowledgePoint;

  const chapterMatch = topicId.match(generatedChapterPattern);
  const chapterNumber = chapterMatch ? Number(chapterMatch[2]) : 1;
  const gradeCode = gradeCodeByGrade[grade] ?? String(grade);
  const code = `${gradeCode}-${letterForIndex(Math.max(0, chapterNumber - 1))}.1`;
  return {
    topicId,
    grade,
    code,
    title: stripCaliforniaGradePrefix(stripKnowledgePointPrefix(fallbackTitle))
  };
}

export function californiaKnowledgePointDisplayTitle(
  topicId: string,
  grade: GradeId,
  fallbackTitle: string
) {
  return displayTitle(californiaKnowledgePointForTopic(topicId, grade, fallbackTitle));
}
