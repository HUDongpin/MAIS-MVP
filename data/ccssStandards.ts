import type { GradeId } from "@/types";

/**
 * Canonical CCSS Mathematics registry for the Math Universe map.
 *
 * K–8 standards are listed individually (titles are short paraphrases for UI, not the
 * legal standard text). High school is charted at domain level only — those clusters
 * render as sealed aggregate stars until HS content opens in MAIS.
 */

export type CcssArmId = "number" | "ratio" | "algebra" | "geometry" | "data";

export type CcssDomainId =
  | "CC" | "NBT" | "NS" | "NF" | "RP" | "OA" | "EE" | "F" | "MD" | "G" | "SP"
  | "HS.N" | "HS.A" | "HS.F" | "HS.G" | "HS.S";

export type CcssGradeBand = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "HS";

export type CcssStandard = {
  code: string;
  gradeBand: CcssGradeBand;
  domain: CcssDomainId;
  title: string;
};

export type CcssCluster = {
  id: string;
  gradeBand: CcssGradeBand;
  domain: CcssDomainId;
  arm: CcssArmId;
  standardCount: number;
  sealed: boolean;
};

export type CcssRoad = {
  id: "number-road" | "fraction-road" | "algebra-road" | "geometry-road" | "data-road";
  arm: CcssArmId;
  name: { en: string; zh: string; zhHans: string };
  clusterIds: string[];
};

export const ccssArmForDomain: Record<CcssDomainId, CcssArmId> = {
  CC: "number", NBT: "number", NS: "number", "HS.N": "number",
  NF: "ratio", RP: "ratio",
  OA: "algebra", EE: "algebra", F: "algebra", "HS.A": "algebra", "HS.F": "algebra",
  MD: "geometry", G: "geometry", "HS.G": "geometry",
  SP: "data", "HS.S": "data"
};

export const ccssGradeBandForGradeId: Partial<Record<GradeId, CcssGradeBand>> = {
  K: "K", P1: "1", P2: "2", P3: "3", P4: "4", P5: "5", P6: "6",
  S1: "7", S2: "8", S3: "HS", S4: "HS", S5: "HS", S6: "HS"
};

function s(gradeBand: CcssGradeBand, domain: CcssDomainId, index: number, title: string): CcssStandard {
  return { code: `${gradeBand}.${domain}.${index}`, gradeBand, domain, title };
}

export const ccssStandards: CcssStandard[] = [
  // Kindergarten — 22 standards
  s("K", "CC", 1, "Count to 100 by ones and tens"),
  s("K", "CC", 2, "Count forward from a given number"),
  s("K", "CC", 3, "Write numbers 0 to 20"),
  s("K", "CC", 4, "Connect counting to cardinality"),
  s("K", "CC", 5, "Count to answer how many"),
  s("K", "CC", 6, "Compare groups: greater, less, equal"),
  s("K", "CC", 7, "Compare two written numerals"),
  s("K", "OA", 1, "Represent addition and subtraction with objects"),
  s("K", "OA", 2, "Solve add and subtract word problems within 10"),
  s("K", "OA", 3, "Decompose numbers within 10"),
  s("K", "OA", 4, "Make ten from a given number"),
  s("K", "OA", 5, "Fluently add and subtract within 5"),
  s("K", "NBT", 1, "Compose and decompose teen numbers"),
  s("K", "MD", 1, "Describe measurable attributes"),
  s("K", "MD", 2, "Compare two objects by an attribute"),
  s("K", "MD", 3, "Classify objects into categories and count"),
  s("K", "G", 1, "Describe object positions with shape names"),
  s("K", "G", 2, "Name shapes in any orientation"),
  s("K", "G", 3, "Identify flat and solid shapes"),
  s("K", "G", 4, "Compare and analyze shapes"),
  s("K", "G", 5, "Build and draw shapes"),
  s("K", "G", 6, "Compose simple shapes into larger shapes"),

  // Grade 1 — 21 standards
  s("1", "OA", 1, "Add and subtract word problems within 20"),
  s("1", "OA", 2, "Word problems with three addends"),
  s("1", "OA", 3, "Apply properties of operations"),
  s("1", "OA", 4, "Subtraction as an unknown-addend problem"),
  s("1", "OA", 5, "Relate counting to addition and subtraction"),
  s("1", "OA", 6, "Add and subtract within 20 with strategies"),
  s("1", "OA", 7, "Understand the meaning of the equal sign"),
  s("1", "OA", 8, "Find the unknown number in an equation"),
  s("1", "NBT", 1, "Count to 120 from any number"),
  s("1", "NBT", 2, "Understand tens and ones"),
  s("1", "NBT", 3, "Compare two-digit numbers"),
  s("1", "NBT", 4, "Add within 100 using place value"),
  s("1", "NBT", 5, "Mentally find 10 more or 10 less"),
  s("1", "NBT", 6, "Subtract multiples of 10"),
  s("1", "MD", 1, "Order and compare lengths"),
  s("1", "MD", 2, "Measure length with unit lengths"),
  s("1", "MD", 3, "Tell time in hours and half-hours"),
  s("1", "MD", 4, "Organize and interpret data with three categories"),
  s("1", "G", 1, "Defining vs non-defining shape attributes"),
  s("1", "G", 2, "Compose two- and three-dimensional shapes"),
  s("1", "G", 3, "Partition shapes into halves and fourths"),

  // Grade 2 — 26 standards
  s("2", "OA", 1, "Add and subtract word problems within 100"),
  s("2", "OA", 2, "Fluently add and subtract within 20"),
  s("2", "OA", 3, "Odd and even groups of objects"),
  s("2", "OA", 4, "Use addition for rectangular arrays"),
  s("2", "NBT", 1, "Understand hundreds, tens, and ones"),
  s("2", "NBT", 2, "Count within 1000; skip-count by 5s, 10s, 100s"),
  s("2", "NBT", 3, "Read and write numbers to 1000"),
  s("2", "NBT", 4, "Compare three-digit numbers"),
  s("2", "NBT", 5, "Fluently add and subtract within 100"),
  s("2", "NBT", 6, "Add up to four two-digit numbers"),
  s("2", "NBT", 7, "Add and subtract within 1000 with models"),
  s("2", "NBT", 8, "Mentally add or subtract 10 or 100"),
  s("2", "NBT", 9, "Explain why add and subtract strategies work"),
  s("2", "MD", 1, "Measure length with appropriate tools"),
  s("2", "MD", 2, "Measure with two different units"),
  s("2", "MD", 3, "Estimate lengths in standard units"),
  s("2", "MD", 4, "Compare lengths by a standard unit"),
  s("2", "MD", 5, "Add and subtract length word problems"),
  s("2", "MD", 6, "Represent whole numbers on a number line"),
  s("2", "MD", 7, "Tell time to five minutes"),
  s("2", "MD", 8, "Solve money word problems"),
  s("2", "MD", 9, "Line plots of measurement data"),
  s("2", "MD", 10, "Picture graphs and bar graphs"),
  s("2", "G", 1, "Recognize shapes by attributes"),
  s("2", "G", 2, "Partition rectangles into rows and columns"),
  s("2", "G", 3, "Partition circles and rectangles into equal shares"),

  // Grade 3 — 25 standards
  s("3", "OA", 1, "Interpret products of whole numbers"),
  s("3", "OA", 2, "Interpret whole-number quotients"),
  s("3", "OA", 3, "Multiply and divide word problems within 100"),
  s("3", "OA", 4, "Find the unknown in multiply or divide equations"),
  s("3", "OA", 5, "Apply properties of multiplication"),
  s("3", "OA", 6, "Division as an unknown-factor problem"),
  s("3", "OA", 7, "Fluently multiply and divide within 100"),
  s("3", "OA", 8, "Two-step word problems with four operations"),
  s("3", "OA", 9, "Identify arithmetic patterns"),
  s("3", "NBT", 1, "Round to the nearest 10 or 100"),
  s("3", "NBT", 2, "Fluently add and subtract within 1000"),
  s("3", "NBT", 3, "Multiply one-digit numbers by multiples of 10"),
  s("3", "NF", 1, "Understand unit fractions"),
  s("3", "NF", 2, "Represent fractions on a number line"),
  s("3", "NF", 3, "Explain fraction equivalence and compare"),
  s("3", "MD", 1, "Tell time to the minute; time intervals"),
  s("3", "MD", 2, "Measure and estimate mass and volume"),
  s("3", "MD", 3, "Draw scaled picture and bar graphs"),
  s("3", "MD", 4, "Line plots with halves and quarters"),
  s("3", "MD", 5, "Understand area as square units"),
  s("3", "MD", 6, "Measure area by counting unit squares"),
  s("3", "MD", 7, "Relate area to multiplication and addition"),
  s("3", "MD", 8, "Solve perimeter problems"),
  s("3", "G", 1, "Categories of shapes and their attributes"),
  s("3", "G", 2, "Partition shapes into equal areas"),

  // Grade 4 — 28 standards
  s("4", "OA", 1, "Interpret multiplication as comparison"),
  s("4", "OA", 2, "Word problems with multiplicative comparison"),
  s("4", "OA", 3, "Multi-step word problems with remainders"),
  s("4", "OA", 4, "Factors, multiples, prime and composite"),
  s("4", "OA", 5, "Generate and analyze number patterns"),
  s("4", "NBT", 1, "A digit is ten times the place to its right"),
  s("4", "NBT", 2, "Read, write, and compare multi-digit numbers"),
  s("4", "NBT", 3, "Round multi-digit whole numbers"),
  s("4", "NBT", 4, "Fluently add and subtract multi-digit numbers"),
  s("4", "NBT", 5, "Multiply up to four digits by one digit"),
  s("4", "NBT", 6, "Divide with up to four-digit dividends"),
  s("4", "NF", 1, "Explain equivalent fractions with models"),
  s("4", "NF", 2, "Compare fractions with unlike denominators"),
  s("4", "NF", 3, "Add and subtract fractions and mixed numbers"),
  s("4", "NF", 4, "Multiply a fraction by a whole number"),
  s("4", "NF", 5, "Express tenths as hundredths and add"),
  s("4", "NF", 6, "Use decimal notation for fractions"),
  s("4", "NF", 7, "Compare decimals to hundredths"),
  s("4", "MD", 1, "Know relative sizes of measurement units"),
  s("4", "MD", 2, "Word problems with measures and money"),
  s("4", "MD", 3, "Area and perimeter formulas for rectangles"),
  s("4", "MD", 4, "Line plots with fraction measurements"),
  s("4", "MD", 5, "Understand angles as turning"),
  s("4", "MD", 6, "Measure angles with a protractor"),
  s("4", "MD", 7, "Angle measure is additive"),
  s("4", "G", 1, "Draw and identify lines and angles"),
  s("4", "G", 2, "Classify shapes by lines and angles"),
  s("4", "G", 3, "Recognize and draw lines of symmetry"),

  // Grade 5 — 26 standards
  s("5", "OA", 1, "Use parentheses and evaluate expressions"),
  s("5", "OA", 2, "Write and interpret numerical expressions"),
  s("5", "OA", 3, "Generate and relate two numerical patterns"),
  s("5", "NBT", 1, "Place value: ten times and one tenth"),
  s("5", "NBT", 2, "Patterns with powers of 10"),
  s("5", "NBT", 3, "Read, write, and compare decimals"),
  s("5", "NBT", 4, "Round decimals to any place"),
  s("5", "NBT", 5, "Fluently multiply multi-digit numbers"),
  s("5", "NBT", 6, "Divide with two-digit divisors"),
  s("5", "NBT", 7, "Operate on decimals to hundredths"),
  s("5", "NF", 1, "Add and subtract fractions with unlike denominators"),
  s("5", "NF", 2, "Fraction word problems with estimation"),
  s("5", "NF", 3, "Fractions as division"),
  s("5", "NF", 4, "Multiply fractions and whole numbers"),
  s("5", "NF", 5, "Interpret multiplication as scaling"),
  s("5", "NF", 6, "Real-world fraction multiplication problems"),
  s("5", "NF", 7, "Divide unit fractions and whole numbers"),
  s("5", "MD", 1, "Convert measurement units within a system"),
  s("5", "MD", 2, "Line plots with fraction operations"),
  s("5", "MD", 3, "Understand volume as cubic units"),
  s("5", "MD", 4, "Measure volume by counting unit cubes"),
  s("5", "MD", 5, "Relate volume to multiplication and addition"),
  s("5", "G", 1, "Graph points on the coordinate plane"),
  s("5", "G", 2, "Real-world problems in the first quadrant"),
  s("5", "G", 3, "Attributes of two-dimensional figure categories"),
  s("5", "G", 4, "Classify figures in a hierarchy"),

  // Grade 6 — 29 standards
  s("6", "RP", 1, "Understand ratio language and notation"),
  s("6", "RP", 2, "Understand unit rates"),
  s("6", "RP", 3, "Solve ratio and rate problems"),
  s("6", "NS", 1, "Divide fractions by fractions"),
  s("6", "NS", 2, "Fluently divide multi-digit numbers"),
  s("6", "NS", 3, "Fluently operate on multi-digit decimals"),
  s("6", "NS", 4, "Greatest common factor and least common multiple"),
  s("6", "NS", 5, "Positive and negative numbers in context"),
  s("6", "NS", 6, "Rational numbers on the number line and plane"),
  s("6", "NS", 7, "Order and absolute value of rational numbers"),
  s("6", "NS", 8, "Graph points to solve real-world problems"),
  s("6", "EE", 1, "Whole-number exponents"),
  s("6", "EE", 2, "Write, read, and evaluate expressions"),
  s("6", "EE", 3, "Generate equivalent expressions"),
  s("6", "EE", 4, "Identify equivalent expressions"),
  s("6", "EE", 5, "Solutions of equations and inequalities"),
  s("6", "EE", 6, "Use variables to represent numbers"),
  s("6", "EE", 7, "Solve one-step equations"),
  s("6", "EE", 8, "Write inequalities for conditions"),
  s("6", "EE", 9, "Dependent and independent variables"),
  s("6", "G", 1, "Areas of triangles and polygons"),
  s("6", "G", 2, "Volumes with fractional edge lengths"),
  s("6", "G", 3, "Polygons in the coordinate plane"),
  s("6", "G", 4, "Nets and surface area"),
  s("6", "SP", 1, "Recognize statistical questions"),
  s("6", "SP", 2, "Distributions: center, spread, shape"),
  s("6", "SP", 3, "Measures of center vs variation"),
  s("6", "SP", 4, "Display data: plots, histograms, box plots"),
  s("6", "SP", 5, "Summarize numerical data sets"),

  // Grade 7 — 24 standards
  s("7", "RP", 1, "Unit rates with fractions"),
  s("7", "RP", 2, "Recognize and represent proportional relationships"),
  s("7", "RP", 3, "Multi-step ratio and percent problems"),
  s("7", "NS", 1, "Add and subtract rational numbers"),
  s("7", "NS", 2, "Multiply and divide rational numbers"),
  s("7", "NS", 3, "Four-operation problems with rational numbers"),
  s("7", "EE", 1, "Add, subtract, factor, expand expressions"),
  s("7", "EE", 2, "Rewrite expressions to see relationships"),
  s("7", "EE", 3, "Multi-step problems with rational numbers"),
  s("7", "EE", 4, "Solve word problems with equations and inequalities"),
  s("7", "G", 1, "Scale drawings of geometric figures"),
  s("7", "G", 2, "Draw shapes from given conditions"),
  s("7", "G", 3, "Cross-sections of three-dimensional figures"),
  s("7", "G", 4, "Area and circumference of circles"),
  s("7", "G", 5, "Angle relationships in figures"),
  s("7", "G", 6, "Area, volume, and surface area problems"),
  s("7", "SP", 1, "Sampling to learn about a population"),
  s("7", "SP", 2, "Draw inferences from random samples"),
  s("7", "SP", 3, "Visual overlap of two distributions"),
  s("7", "SP", 4, "Compare populations with measures"),
  s("7", "SP", 5, "Probability of a chance event"),
  s("7", "SP", 6, "Approximate probability from frequency"),
  s("7", "SP", 7, "Develop and compare probability models"),
  s("7", "SP", 8, "Probabilities of compound events"),

  // Grade 8 — 28 standards
  s("8", "NS", 1, "Rational vs irrational numbers"),
  s("8", "NS", 2, "Approximate irrational numbers"),
  s("8", "EE", 1, "Integer exponent properties"),
  s("8", "EE", 2, "Square and cube roots"),
  s("8", "EE", 3, "Powers of 10 for very large and small numbers"),
  s("8", "EE", 4, "Operations with scientific notation"),
  s("8", "EE", 5, "Graph and compare proportional relationships"),
  s("8", "EE", 6, "Slope and the equation y = mx + b"),
  s("8", "EE", 7, "Solve linear equations in one variable"),
  s("8", "EE", 8, "Solve systems of two linear equations"),
  s("8", "F", 1, "Understand functions as input-output rules"),
  s("8", "F", 2, "Compare functions in different representations"),
  s("8", "F", 3, "Interpret y = mx + b as a linear function"),
  s("8", "F", 4, "Construct a function to model a linear relationship"),
  s("8", "F", 5, "Describe functional relationships from graphs"),
  s("8", "G", 1, "Properties of rotations, reflections, translations"),
  s("8", "G", 2, "Congruence through rigid motions"),
  s("8", "G", 3, "Dilations and coordinates"),
  s("8", "G", 4, "Similarity through transformations"),
  s("8", "G", 5, "Angle facts: triangles, parallel lines"),
  s("8", "G", 6, "Explain a proof of the Pythagorean Theorem"),
  s("8", "G", 7, "Apply the Pythagorean Theorem"),
  s("8", "G", 8, "Distance between points with the Pythagorean Theorem"),
  s("8", "G", 9, "Volumes of cones, cylinders, and spheres"),
  s("8", "SP", 1, "Scatter plots and association"),
  s("8", "SP", 2, "Fit a straight line to data"),
  s("8", "SP", 3, "Interpret slope and intercept of a fitted line"),
  s("8", "SP", 4, "Two-way tables and relative frequencies")
];

// High school is charted at domain level; counts are the CCSS standard counts per
// conceptual category (Modeling is distributed, so it carries no separate count).
export const ccssHighSchoolAggregates: Array<{ domain: CcssDomainId; standardCount: number; title: string }> = [
  { domain: "HS.N", standardCount: 27, title: "Number and Quantity" },
  { domain: "HS.A", standardCount: 27, title: "Algebra" },
  { domain: "HS.F", standardCount: 28, title: "Functions" },
  { domain: "HS.G", standardCount: 43, title: "Geometry" },
  { domain: "HS.S", standardCount: 31, title: "Statistics and Probability" }
];

export function ccssClusterId(gradeBand: CcssGradeBand, domain: CcssDomainId) {
  return domain.startsWith("HS.") ? domain : `${gradeBand}.${domain}`;
}

function buildClusters(): CcssCluster[] {
  const byId = new Map<string, CcssCluster>();
  for (const standard of ccssStandards) {
    const id = ccssClusterId(standard.gradeBand, standard.domain);
    const existing = byId.get(id);
    if (existing) existing.standardCount += 1;
    else {
      byId.set(id, {
        id,
        gradeBand: standard.gradeBand,
        domain: standard.domain,
        arm: ccssArmForDomain[standard.domain],
        standardCount: 1,
        sealed: false
      });
    }
  }
  for (const aggregate of ccssHighSchoolAggregates) {
    byId.set(aggregate.domain, {
      id: aggregate.domain,
      gradeBand: "HS",
      domain: aggregate.domain,
      arm: ccssArmForDomain[aggregate.domain],
      standardCount: aggregate.standardCount,
      sealed: true
    });
  }
  return [...byId.values()];
}

export const ccssClusters: CcssCluster[] = buildClusters();

export const ccssClusterById = new Map(ccssClusters.map((cluster) => [cluster.id, cluster]));

export const ccssStandardsByClusterId = (() => {
  const map = new Map<string, CcssStandard[]>();
  for (const standard of ccssStandards) {
    const id = ccssClusterId(standard.gradeBand, standard.domain);
    const list = map.get(id);
    if (list) list.push(standard);
    else map.set(id, [standard]);
  }
  return map;
})();

export const ccssProgressionRoads: CcssRoad[] = [
  {
    id: "number-road",
    arm: "number",
    name: { en: "The Number Road", zh: "數之航路", zhHans: "数之航路" },
    clusterIds: ["K.CC", "K.NBT", "1.NBT", "2.NBT", "3.NBT", "4.NBT", "5.NBT", "6.NS", "7.NS", "8.NS", "HS.N"]
  },
  {
    id: "fraction-road",
    arm: "ratio",
    name: { en: "The Fraction Road", zh: "分數航路", zhHans: "分数航路" },
    clusterIds: ["3.NF", "4.NF", "5.NF", "6.RP", "7.RP"]
  },
  {
    id: "algebra-road",
    arm: "algebra",
    name: { en: "The Algebra Road", zh: "代數航路", zhHans: "代数航路" },
    clusterIds: ["K.OA", "1.OA", "2.OA", "3.OA", "4.OA", "5.OA", "6.EE", "7.EE", "8.EE", "8.F", "HS.A", "HS.F"]
  },
  {
    id: "geometry-road",
    arm: "geometry",
    name: { en: "The Geometry Road", zh: "幾何航路", zhHans: "几何航路" },
    clusterIds: ["K.G", "1.G", "2.G", "3.G", "4.G", "5.G", "6.G", "7.G", "8.G", "HS.G"]
  },
  {
    id: "data-road",
    arm: "data",
    name: { en: "The Data Road", zh: "數據航路", zhHans: "数据航路" },
    clusterIds: ["6.SP", "7.SP", "8.SP", "HS.S"]
  }
];

/**
 * Maps a MAIS topic to its CCSS domain-grade cluster. California topic ids embed the
 * CCSS domain token (e.g. us-ca-math-p1-1-nbt-place-value → NBT); other curricula fall
 * back to keyword classification handled by the caller.
 */
const topicDomainTokens: Array<{ token: string; domain: CcssDomainId }> = [
  { token: "-cc-", domain: "CC" },
  { token: "-nbt-", domain: "NBT" },
  { token: "-nf-", domain: "NF" },
  { token: "-ns-", domain: "NS" },
  { token: "-rp-", domain: "RP" },
  { token: "-oa-", domain: "OA" },
  { token: "-ee-", domain: "EE" },
  { token: "-md-", domain: "MD" },
  { token: "-sp-", domain: "SP" },
  { token: "-g-", domain: "G" },
  { token: "-f-", domain: "F" }
];

export function ccssClusterIdForTopic(topicId: string, grade: GradeId): string | null {
  const gradeBand = ccssGradeBandForGradeId[grade];
  if (!gradeBand) return null;

  if (gradeBand === "HS") {
    for (const { token, domain } of topicDomainTokens) {
      if (!topicId.includes(token)) continue;
      if (domain === "G") return "HS.G";
      if (domain === "F") return "HS.F";
      if (domain === "SP") return "HS.S";
      if (domain === "NS" || domain === "NBT" || domain === "CC") return "HS.N";
      return "HS.A";
    }
    return "HS.A";
  }

  for (const { token, domain } of topicDomainTokens) {
    if (!topicId.includes(token)) continue;
    const id = ccssClusterId(gradeBand, domain);
    if (ccssClusterById.has(id)) return id;
  }
  return null;
}
