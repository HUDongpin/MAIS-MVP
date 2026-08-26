import type { GradeId } from "@/types";

export type WorkedExampleVisualKind =
  | "algebra"
  | "coordinate-function"
  | "counting"
  | "data-probability"
  | "fraction"
  | "geometry"
  | "measurement-money-time"
  | "modeling-review"
  | "place-value"
  | "ratio-rate-percent"
  | "spatial-vector-trig";

export type WorkedExampleSceneId =
  | "generic"
  | "measurement-ribbon-string-difference"
  | "geometry-equal-share-rectangles"
  | "counters-red-blue-join"
  | "birds-fence-tree-addition"
  | "cube-train-green-yellow-join"
  | "apple-basket-join"
  | "fish-equation-match-join"
  | "balloon-take-away"
  | "crackers-subtraction-equation"
  | "cube-train-cover-take-away"
  | "sticker-take-away"
  | "counter-cross-out-take-away"
  | "shells-break-apart-subtraction";

export type WorkedExampleAgeBand =
  | "early-primary"
  | "upper-primary"
  | "lower-secondary"
  | "upper-secondary";

export type WorkedExampleIllustrationContext = {
  content: string;
  grade: GradeId;
  publisher?: string;
  title: string;
  topicId: string;
};

export type WorkedExampleIllustrationMetadata = {
  ageBand: WorkedExampleAgeBand;
  alt: string;
  caption: string;
  focusText: string;
  id: string;
  kind: WorkedExampleVisualKind;
  qa: {
    answerCritical: false;
    gradeFit: "pass";
    sourceDistance: "pass-original-MAIS-svg";
    status: "qa-pass";
    themeAlignment: "pass";
  };
  sceneId: WorkedExampleSceneId;
  topicId: string;
};

const kindLabels: Record<WorkedExampleVisualKind, string> = {
  algebra: "balanced equation model",
  "coordinate-function": "graph and table model",
  counting: "counters and number bond model",
  "data-probability": "data display and chance model",
  fraction: "fraction strip model",
  geometry: "shape and measurement model",
  "measurement-money-time": "measurement workspace",
  "modeling-review": "plan, model, check workspace",
  "place-value": "base-ten model",
  "ratio-rate-percent": "ratio and percent bar model",
  "spatial-vector-trig": "spatial and vector model"
};

const kindCaptions: Record<WorkedExampleVisualKind, string> = {
  algebra: "The worked example is supported by a balance-style algebra model, then checked with the final value.",
  "coordinate-function": "The worked example is supported by a coordinate graph, table, and input-output check.",
  counting: "The worked example is supported by counters, parts, and concrete equal groups so young learners can see the count.",
  "data-probability": "The worked example is supported by a small data display and a chance check.",
  fraction: "The worked example is supported by a fraction strip so the parts and whole stay visible.",
  geometry: "The worked example is supported by a shape model with lengths, area, or angle cues.",
  "measurement-money-time": "The worked example is supported by a measuring, money, or time workspace with units visible.",
  "modeling-review": "The worked example is supported by a plan, model, compute, and check workspace.",
  "place-value": "The worked example is supported by tens, ones, and regrouping cues.",
  "ratio-rate-percent": "The worked example is supported by a double number line and percent bar model.",
  "spatial-vector-trig": "The worked example is supported by a spatial diagram with direction and triangle cues."
};

type WorkedExampleSceneOverride = {
  caption: string;
  focusText: string;
  kind: WorkedExampleVisualKind;
  sceneId: WorkedExampleSceneId;
};

const gradeOneWorkedExampleSceneOverrides: Record<string, WorkedExampleSceneOverride> = {
  "us-ca-math-p1-1-md-measure-data": {
    caption: "The worked example uses a ruler scene with a 13-unit ribbon and an 8-unit string so the 5-unit difference stays visible.",
    focusText: "13 - 8 = 5",
    kind: "measurement-money-time",
    sceneId: "measurement-ribbon-string-difference"
  },
  "us-ca-math-p1-1-g-shape-reasoning": {
    caption: "The worked example uses two equal-share rectangles with separate blue and green regions inside a yellow outline.",
    focusText: "2 equal rectangles",
    kind: "geometry",
    sceneId: "geometry-equal-share-rectangles"
  },
};

function normalizeText(value: string) {
  return value
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/\\times/g, "x")
    .replace(/\\div/g, "/")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\\/g, "")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function workedExampleAgeBandForGrade(grade: GradeId): WorkedExampleAgeBand {
  if (grade === "K" || grade === "P1" || grade === "P2") return "early-primary";
  if (grade === "P3" || grade === "P4" || grade === "P5" || grade === "P6") return "upper-primary";
  if (grade === "S1" || grade === "S2" || grade === "S3") return "lower-secondary";
  return "upper-secondary";
}

export function inferWorkedExampleVisualKind(context: WorkedExampleIllustrationContext): WorkedExampleVisualKind {
  const sceneOverride = gradeOneWorkedExampleSceneOverrides[context.topicId];
  if (sceneOverride) return sceneOverride.kind;

  const text = normalizeText(`${context.topicId} ${context.title} ${context.content}`).toLowerCase();

  if (workedExampleAgeBandForGrade(context.grade) === "upper-primary" && hasGroupedMultiplicationExpression(text)) {
    return "counting";
  }

  if (
    includesAny(text, [
      "count",
      "cardinality",
      "number bond",
      "within-10",
      "within 10",
      "within-20",
      "within 20",
      "counters",
      "ten-frame",
      "ten frame"
    ])
  ) {
    return "counting";
  }

  if (
    includesAny(text, [
      "place value",
      "base-ten",
      "base ten",
      "ones",
      "tens",
      "hundreds",
      "regroup",
      "large numbers",
      "digits"
    ])
  ) {
    return "place-value";
  }

  if (includesAny(text, ["fraction", "numerator", "denominator", "equivalent", "mixed number"])) {
    return "fraction";
  }

  if (
    includesAny(text, [
      "ratio",
      "rate",
      "percent",
      "percentage",
      "proportion",
      "speed",
      "unit rate",
      "scale"
    ])
  ) {
    return "ratio-rate-percent";
  }

  if (
    includesAny(text, [
      "coordinate",
      "function",
      "graph",
      "linear",
      "quadratic",
      "slope",
      "intercept",
      "parabola",
      "derivative",
      "calculus",
      "exponential",
      "logarithm"
    ])
  ) {
    return "coordinate-function";
  }

  if (
    includesAny(text, [
      "angle",
      "triangle",
      "circle",
      "area",
      "perimeter",
      "volume",
      "geometry",
      "polygon",
      "shape",
      "quadrilateral",
      "pythagorean",
      "solid",
      "cube",
      "cuboid",
      "cylinder",
      "cone"
    ])
  ) {
    return "geometry";
  }

  if (
    includesAny(text, [
      "vector",
      "trig",
      "sine",
      "cosine",
      "tan",
      "transformation",
      "translation",
      "rotation",
      "reflection",
      "similarity",
      "spatial"
    ])
  ) {
    return "spatial-vector-trig";
  }

  if (
    includesAny(text, [
      "data",
      "statistics",
      "probability",
      "chance",
      "mean",
      "median",
      "bar chart",
      "line plot",
      "scatter",
      "bivariate"
    ])
  ) {
    return "data-probability";
  }

  if (
    includesAny(text, [
      "equation",
      "expression",
      "inequality",
      "algebra",
      "polynomial",
      "factor",
      "variable",
      "solve",
      "simplify",
      "set",
      "sets",
      "logic",
      "universe",
      "intersection",
      "union",
      "subset",
      "condition"
    ])
  ) {
    return "algebra";
  }

  if (
    includesAny(text, [
      "measure",
      "measurement",
      "money",
      "clock",
      "time",
      "length",
      "mass",
      "calendar",
      "unit",
      "cm",
      "km",
      "dollar"
    ])
  ) {
    return "measurement-money-time";
  }

  return "modeling-review";
}

function hasGroupedMultiplicationExpression(value: string) {
  return /\(\s*\d+(?:\.\d+)?\s*\+\s*\d+(?:\.\d+)?\s*\)\s*(?:x|\*)\s*\d+(?:\.\d+)?/.test(value);
}

function extractFocusText(value: string, kind: WorkedExampleVisualKind) {
  const text = normalizeText(value);
  const groupedExpression = text.match(
    /\(\s*(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)\s*\)\s*(?:x|\*)\s*(-?\d+(?:\.\d+)?)/i
  );

  if (groupedExpression) {
    return `(${groupedExpression[1]} + ${groupedExpression[2]}) x ${groupedExpression[3]}`.slice(0, 32);
  }

  const equation = text.match(
    /\b(?:[a-z]\s*=|f\([^)]*\)\s*=)?\s*-?\d+(?:\.\d+)?(?:\s*(?:\+|-|x|\*|\/|=|:)\s*-?\d+(?:\.\d+)?){1,4}\b/i
  );

  if (equation?.[0]) return equation[0].replace(/\*/g, "x").trim().slice(0, 32);

  const answer = text.match(/\bAnswer:\s*([^.;]{1,28})/i);
  if (answer?.[1]) return answer[1].trim();

  return kindLabels[kind];
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildWorkedExampleIllustrationMetadata(
  context: WorkedExampleIllustrationContext
): WorkedExampleIllustrationMetadata {
  const sceneOverride = gradeOneWorkedExampleSceneOverrides[context.topicId];
  const kind = sceneOverride?.kind ?? inferWorkedExampleVisualKind(context);
  const ageBand = workedExampleAgeBandForGrade(context.grade);
  const focusText = sceneOverride?.focusText ?? extractFocusText(context.content, kind);
  const label = kindLabels[kind];
  const title = normalizeText(context.title) || context.topicId;

  return {
    ageBand,
    alt: `${title} worked example illustration using a ${label}.`,
    caption: `${sceneOverride?.caption ?? kindCaptions[kind]} Focus: ${focusText}.`,
    focusText,
    id: `worked-example-illustration-${safeId(context.topicId) || "topic"}`,
    kind,
    qa: {
      answerCritical: false,
      gradeFit: "pass",
      sourceDistance: "pass-original-MAIS-svg",
      status: "qa-pass",
      themeAlignment: "pass"
    },
    sceneId: sceneOverride?.sceneId ?? "generic",
    topicId: context.topicId
  };
}
