"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { grades, primaryGrades, secondaryGrades } from "@/data/grades";
import { getMainlandHjbTransitDetails, isMainlandHjbRoadmapProfile } from "@/data/mainlandHjbRoadmapPresentation";
import { getMainlandPepTransitDetails, isMainlandPepRoadmapProfile } from "@/data/mainlandPepRoadmapPresentation";
import { topics as fallbackTopics } from "@/data/topics";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { curriculumProfileForTrack, curriculumTrackForProfile, publisherLabels } from "@/lib/curriculumProfile";
import { formatDifficultyLabel, formatGradeLabel, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import { cn } from "@/lib/utils";
import type { Grade, LessonSummary, LocalizedText, RoadmapData, Topic, TopicStatus } from "@/types";

type RoadmapBand = "primary" | "secondary";
type RoadmapMode = "student" | "network";

type LearningRoadmapProps = {
  forcedBand?: RoadmapBand | null;
  mode?: RoadmapMode;
};

export type TransitBranch = {
  station: string;
  stationLabel?: LocalizedText;
  busStops: string[];
  busStopLabels?: LocalizedText[];
};

export type TransitDetails = {
  branches: TransitBranch[];
};

export const routeColors = [
  "#e31b23",
  "#00a651",
  "#007dc5",
  "#f7941e",
  "#9d3a20",
  "#7f3f98",
  "#63b5e5",
  "#b5bd00"
];

export const busColors = ["#f6c84c", "#32c3a6", "#ef6aa7", "#7dd3fc"];

const statusStyles: Record<TopicStatus, string> = {
  completed: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
  "in-progress": "border-cyan-300/40 bg-cyan-400/15 text-cyan-200",
  "not-started": "border-slate-400/30 bg-slate-400/10 text-slate-300"
};

const studentStatusStyles: Record<TopicStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/35 dark:bg-emerald-400/10 dark:text-emerald-200",
  "in-progress": "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-300/35 dark:bg-cyan-400/10 dark:text-cyan-200",
  "not-started": "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300"
};

const stationStyles: Record<TopicStatus, string> = {
  completed: "border-emerald-200 bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.45)]",
  "in-progress": "border-cyan-100 bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.45)]",
  "not-started": "border-slate-200 bg-slate-950"
};

export const topicTransitDetails: Record<string, TransitDetails> = {
  "p1-counting-number-bonds": {
    branches: [
      { station: "Counting objects", busStops: ["One-to-one match", "Forward count", "Backward count"] },
      { station: "Compare numbers", busStops: ["More and fewer", "Equal groups", "Order to 20"] },
      { station: "Number bonds", busStops: ["Make 5", "Make 10", "Make 20"] },
      { station: "Story numbers", busStops: ["Draw objects", "Say the total", "Check the count"] }
    ]
  },
  "p1-addition-subtraction": {
    branches: [
      { station: "Join", busStops: ["Add with pictures", "Count on", "Write a number sentence"] },
      { station: "Take away", busStops: ["Cross out", "Count back", "Find what remains"] },
      { station: "Number line", busStops: ["Start point", "Jump forward", "Jump backward"] },
      { station: "Missing number", busStops: ["Use bonds", "Try both ways", "Check with objects"] }
    ]
  },
  "p1-shapes-patterns": {
    branches: [
      { station: "2D shapes", busStops: ["Circle", "Triangle", "Rectangle"] },
      { station: "Shape features", busStops: ["Sides", "Corners", "Same and different"] },
      { station: "Repeating patterns", busStops: ["AB pattern", "ABC pattern", "Find the next item"] },
      { station: "Build and explain", busStops: ["Use blocks", "Name the rule", "Create a new pattern"] }
    ]
  },
  "p1-measurement-time": {
    branches: [
      { station: "Length", busStops: ["Longer/shorter", "Direct compare", "Non-standard units"] },
      { station: "Mass", busStops: ["Heavier/lighter", "Balance idea", "Reasonable choice"] },
      { station: "Capacity", busStops: ["More/less", "Full/empty", "Compare containers"] },
      { station: "Time", busStops: ["O'clock", "Daily routine", "Before and after"] }
    ]
  },
  "p2-place-value": {
    branches: [
      { station: "Hundreds", busStops: ["Bundles of 100", "Tens and ones", "Expanded form"] },
      { station: "Read numbers", busStops: ["Digits", "Place names", "Number words"] },
      { station: "Order numbers", busStops: ["Compare hundreds", "Compare tens", "Compare ones"] },
      { station: "Mental checks", busStops: ["Round to nearest ten", "Estimate", "Explain value"] }
    ]
  },
  "p2-multiplication-foundations": {
    branches: [
      { station: "Equal groups", busStops: ["Same size groups", "Repeated addition", "Total count"] },
      { station: "Arrays", busStops: ["Rows", "Columns", "Skip count"] },
      { station: "Facts", busStops: ["2s", "5s", "10s"] },
      { station: "Word problems", busStops: ["Groups of", "Choose operation", "Check units"] }
    ]
  },
  "p2-money-time": {
    branches: [
      { station: "Coins and notes", busStops: ["HK dollars", "Add values", "Equivalent amounts"] },
      { station: "Buying", busStops: ["Total cost", "Change", "Reasonable money"] },
      { station: "Clock time", busStops: ["Hour hand", "Minute hand", "Half past"] },
      { station: "Timetable", busStops: ["Earlier/later", "Duration idea", "Daily schedule"] }
    ]
  },
  "p2-length-data": {
    branches: [
      { station: "Measure length", busStops: ["Centimetres", "Start at zero", "Read the mark"] },
      { station: "Compare length", busStops: ["Difference", "Order objects", "Estimate first"] },
      { station: "Pictographs", busStops: ["Symbols", "Key", "Total"] },
      { station: "Bar charts", busStops: ["Categories", "Scale", "Most and least"] }
    ]
  },
  "p3-multiplication-division": {
    branches: [
      { station: "Times tables", busStops: ["3s and 4s", "6s and 8s", "Fact families"] },
      { station: "Division sharing", busStops: ["Equal shares", "Remainders idea", "Check by multiply"] },
      { station: "Arrays and area", busStops: ["Rows", "Columns", "Commutative property"] },
      { station: "Mixed problems", busStops: ["Choose operation", "Draw model", "Check answer"] }
    ]
  },
  "p3-fractions-intro": {
    branches: [
      { station: "Equal parts", busStops: ["Halves", "Thirds", "Quarters"] },
      { station: "Fraction names", busStops: ["Numerator", "Denominator", "Unit fraction"] },
      { station: "Fraction bars", busStops: ["Shade parts", "Compare sizes", "Equivalent pieces"] },
      { station: "Real contexts", busStops: ["Food sharing", "Length strips", "Set fractions"] }
    ]
  },
  "p3-measurement": {
    branches: [
      { station: "Length", busStops: ["Metres", "Centimetres", "Convert simple units"] },
      { station: "Mass", busStops: ["Grams", "Kilograms", "Estimate"] },
      { station: "Capacity", busStops: ["Millilitres", "Litres", "Container choice"] },
      { station: "Problems", busStops: ["Read carefully", "Use units", "Check reasonableness"] }
    ]
  },
  "p3-geometry-patterns": {
    branches: [
      { station: "Right angles", busStops: ["Square corner", "Compare turns", "Identify shapes"] },
      { station: "Symmetry", busStops: ["Mirror line", "Match halves", "Complete figure"] },
      { station: "Grid moves", busStops: ["Rows and columns", "Position words", "Simple paths"] },
      { station: "Growing patterns", busStops: ["Count change", "Continue pattern", "Explain rule"] }
    ]
  },
  "p4-large-numbers": {
    branches: [
      { station: "Place value", busStops: ["Thousands", "Ten-thousands", "Expanded notation"] },
      { station: "Compare", busStops: ["Line up digits", "Use symbols", "Order numbers"] },
      { station: "Rounding", busStops: ["Nearest 10", "Nearest 100", "Estimate"] },
      { station: "Calculate", busStops: ["Column method", "Mental strategy", "Check size"] }
    ]
  },
  "p4-decimals": {
    branches: [
      { station: "Tenths", busStops: ["Fraction link", "Decimal point", "Place value"] },
      { station: "Hundredths", busStops: ["Money link", "Measure link", "Compare"] },
      { station: "Number line", busStops: ["Locate decimals", "Order", "Round"] },
      { station: "Operations", busStops: ["Add decimals", "Subtract decimals", "Estimate first"] }
    ]
  },
  "p4-angles": {
    branches: [
      { station: "Angle types", busStops: ["Acute", "Right", "Obtuse"] },
      { station: "Measure", busStops: ["Protractor", "Vertex", "Read scale"] },
      { station: "Turns", busStops: ["Quarter turn", "Half turn", "Full turn"] },
      { station: "Facts", busStops: ["Straight line", "Around a point", "Unknown angle"] }
    ]
  },
  "p4-perimeter-area": {
    branches: [
      { station: "Perimeter", busStops: ["Add sides", "Missing side", "Composite outline"] },
      { station: "Area units", busStops: ["Square units", "Count grid", "Cover surface"] },
      { station: "Rectangles", busStops: ["Length times width", "Formula meaning", "Units"] },
      { station: "Composite shapes", busStops: ["Split shapes", "Add areas", "Check overlaps"] }
    ]
  },
  "p5-fractions-operations": {
    branches: [
      { station: "Equivalent fractions", busStops: ["Multiply parts", "Simplify", "Common denominator"] },
      { station: "Add/subtract", busStops: ["Like denominators", "Unlike denominators", "Mixed numbers"] },
      { station: "Compare", busStops: ["Benchmark", "Common denominator", "Number line"] },
      { station: "Applications", busStops: ["Recipes", "Sharing", "Measure"] }
    ]
  },
  "p5-volume": {
    branches: [
      { station: "Cubes", busStops: ["Unit cubes", "Layers", "Count systematically"] },
      { station: "Cuboids", busStops: ["Length", "Width", "Height"] },
      { station: "Formula", busStops: ["Base area", "Multiply height", "Cubic units"] },
      { station: "Nets and models", busStops: ["Build shape", "Visualize layers", "Check dimensions"] }
    ]
  },
  "p5-rates": {
    branches: [
      { station: "Unit rate", busStops: ["Per one", "Divide to compare", "Best value"] },
      { station: "Speed idea", busStops: ["Distance", "Time", "Rate"] },
      { station: "Price contexts", busStops: ["Unit price", "Total price", "Discount check"] },
      { station: "Tables", busStops: ["Equivalent rates", "Scale up", "Scale down"] }
    ]
  },
  "p5-charts-averages": {
    branches: [
      { station: "Read charts", busStops: ["Scale", "Labels", "Compare bars"] },
      { station: "Average", busStops: ["Total", "Number of items", "Mean"] },
      { station: "Data claims", busStops: ["Most/least", "Trend", "Outlier"] },
      { station: "Explain", busStops: ["Use numbers", "Use context", "Write conclusion"] }
    ]
  },
  "p6-percentages": {
    branches: [
      { station: "Meaning", busStops: ["Per 100", "Fraction link", "Decimal link"] },
      { station: "Conversions", busStops: ["Fraction to percent", "Decimal to percent", "Percent to fraction"] },
      { station: "Find percent", busStops: ["Bar model", "Equivalent fraction", "Calculator check"] },
      { station: "Contexts", busStops: ["Discount", "Increase/decrease", "Score"] }
    ]
  },
  "p6-ratio-proportion": {
    branches: [
      { station: "Ratio language", busStops: ["Part-to-part", "Part-to-whole", "Simplify"] },
      { station: "Sharing", busStops: ["Total parts", "One part value", "Allocate"] },
      { station: "Scale", busStops: ["Maps", "Recipes", "Similar shapes"] },
      { station: "Proportion", busStops: ["Equivalent ratios", "Tables", "Reasoning"] }
    ]
  },
  "p6-speed": {
    branches: [
      { station: "Distance", busStops: ["Units", "Routes", "Compare paths"] },
      { station: "Time", busStops: ["Elapsed time", "Convert units", "Read tables"] },
      { station: "Speed", busStops: ["Distance per time", "Formula triangle", "Unit check"] },
      { station: "Graphs", busStops: ["Distance-time", "Slope idea", "Interpret motion"] }
    ]
  },
  "p6-pre-secondary-problem-solving": {
    branches: [
      { station: "Understand", busStops: ["Known facts", "Unknown target", "Key words"] },
      { station: "Represent", busStops: ["Draw diagram", "Make table", "Use equation"] },
      { station: "Plan", busStops: ["Break into steps", "Choose strategy", "Track units"] },
      { station: "Review", busStops: ["Check reasonableness", "Alternative method", "Write clearly"] }
    ]
  },
  integers: {
    branches: [
      { station: "Number line", busStops: ["Zero origin", "Left/right direction", "Compare positions"] },
      { station: "Directed numbers", busStops: ["Positive and negative", "Absolute value", "Ordering rules"] },
      { station: "Operations", busStops: ["Add/subtract signs", "Multiply/divide signs", "Brackets"] },
      { station: "Word problems", busStops: ["Temperature", "Money and elevation", "Reasonableness"] }
    ]
  },
  "algebra-basics": {
    branches: [
      { station: "Patterns", busStops: ["Term rules", "Sequences", "Input-output tables"] },
      { station: "Expressions", busStops: ["Variables", "Like terms", "Formulas"] },
      { station: "Substitution", busStops: ["Replace values", "Order of operations", "Check units"] },
      { station: "Simple equations", busStops: ["Balance model", "Inverse operations", "Self-checks"] }
    ]
  },
  angles: {
    branches: [
      { station: "Angle facts", busStops: ["Straight line", "At a point", "Vertically opposite"] },
      { station: "Parallel lines", busStops: ["Corresponding", "Alternate", "Interior"] },
      { station: "Polygons", busStops: ["Triangle sum", "Exterior angles", "Regular polygons"] },
      { station: "Diagrams", busStops: ["Label unknowns", "Reason chains", "Proof notes"] }
    ]
  },
  ratios: {
    branches: [
      { station: "Ratio language", busStops: ["Part-to-part", "Part-to-whole", "Simplify"] },
      { station: "Equivalent ratios", busStops: ["Scaling up", "Scaling down", "Ratio tables"] },
      { station: "Rates", busStops: ["Unit rate", "Speed", "Price per item"] },
      { station: "Scale", busStops: ["Map scale", "Drawing scale", "HK contexts"] }
    ]
  },
  "statistics-s1": {
    branches: [
      { station: "Data types", busStops: ["Categorical", "Discrete", "Continuous"] },
      { station: "Charts", busStops: ["Bar charts", "Pie charts", "Line graphs"] },
      { station: "Averages", busStops: ["Mean", "Median", "Mode"] },
      { station: "Variation", busStops: ["Range", "Outliers", "Compare groups"] }
    ]
  },
  "linear-equations": {
    branches: [
      { station: "Balance model", busStops: ["Equal sign meaning", "Do both sides", "Visual checks"] },
      { station: "One-step", busStops: ["Add/subtract", "Multiply/divide", "Fractions"] },
      { station: "Two-step", busStops: ["Collect constants", "Unknown first", "Brackets"] },
      { station: "Applications", busStops: ["Word equations", "Unknown choice", "Check roots"] }
    ]
  },
  coordinates: {
    branches: [
      { station: "Axes", busStops: ["Origin", "Quadrants", "Scale"] },
      { station: "Plot points", busStops: ["Ordered pairs", "Grid accuracy", "Read coordinates"] },
      { station: "Straight lines", busStops: ["Gradient idea", "Intercepts", "Line patterns"] },
      { station: "Transform grids", busStops: ["Image points", "Vectors", "Coordinate rules"] }
    ]
  },
  transformations: {
    branches: [
      { station: "Reflection", busStops: ["Mirror line", "Equal distance", "Image labels"] },
      { station: "Rotation", busStops: ["Centre", "Angle", "Direction"] },
      { station: "Translation", busStops: ["Vector", "Move every point", "Invariant shape"] },
      { station: "Enlargement", busStops: ["Scale factor", "Centre", "Similar figures"] }
    ]
  },
  "probability-s2": {
    branches: [
      { station: "Outcomes", busStops: ["Event language", "Favourable cases", "Impossible/certain"] },
      { station: "Sample space", busStops: ["Lists", "Tables", "Tree diagrams"] },
      { station: "Theoretical", busStops: ["Fractions", "Equally likely", "Complements"] },
      { station: "Simulation", busStops: ["Dice trials", "Relative frequency", "Compare results"] }
    ]
  },
  polynomials: {
    branches: [
      { station: "Terms", busStops: ["Coefficients", "Degree", "Like terms"] },
      { station: "Expand", busStops: ["Single brackets", "Double brackets", "Identities"] },
      { station: "Factorize", busStops: ["Common factor", "Grouping", "Quadratic factors"] },
      { station: "Structure", busStops: ["Patterns", "Check by expand", "Equivalent forms"] }
    ]
  },
  "quadratic-patterns": {
    branches: [
      { station: "Tables", busStops: ["First differences", "Second differences", "Prediction"] },
      { station: "Graphs", busStops: ["Plotting", "Scale", "Intercepts"] },
      { station: "Parabolas", busStops: ["Vertex", "Axis", "Opening"] },
      { station: "Equations", busStops: ["Roots", "Model choice", "Interpret coefficients"] }
    ]
  },
  "trigonometry-basics": {
    branches: [
      { station: "Right triangles", busStops: ["Hypotenuse", "Opposite", "Adjacent"] },
      { station: "Sine", busStops: ["SOH", "Find side", "Find angle"] },
      { station: "Cosine", busStops: ["CAH", "Calculator mode", "Applications"] },
      { station: "Tangent", busStops: ["TOA", "Gradient link", "Word problems"] }
    ]
  },
  circles: {
    branches: [
      { station: "Chords", busStops: ["Perpendicular bisector", "Equal chords", "Distance from centre"] },
      { station: "Tangents", busStops: ["Radius facts", "Tangent lengths", "Angle with radius"] },
      { station: "Arcs", busStops: ["Minor/major arcs", "Sectors", "Arc angles"] },
      { station: "Theorems", busStops: ["Cyclic angles", "Proof setup", "Diagram marks"] }
    ]
  },
  functions: {
    branches: [
      { station: "Input-output", busStops: ["Function machine", "Mapping", "Tables"] },
      { station: "Notation", busStops: ["f(x)", "Domain", "Range"] },
      { station: "Graphs", busStops: ["Intercepts", "Turning points", "Rate of change"] },
      { station: "Models", busStops: ["Linear", "Quadratic", "Real contexts"] }
    ]
  },
  "coordinate-geometry": {
    branches: [
      { station: "Gradient", busStops: ["Rise/run", "Parallel lines", "Perpendicular"] },
      { station: "Distance", busStops: ["Pythagoras link", "Segment length", "Circle radius"] },
      { station: "Midpoint", busStops: ["Average coordinates", "Bisectors", "Medians"] },
      { station: "Line equations", busStops: ["Slope-intercept", "Point-slope", "Loci"] }
    ]
  },
  "more-algebra": {
    branches: [
      { station: "Identities", busStops: ["Expansion", "Factor forms", "Verification"] },
      { station: "Indices", busStops: ["Laws", "Negative index", "Fractional index"] },
      { station: "Fractions", busStops: ["Rational expressions", "Restrictions", "Simplify"] },
      { station: "Rearranging", busStops: ["Subject change", "Cross multiply", "Formula checks"] }
    ]
  },
  "data-handling": {
    branches: [
      { station: "Distributions", busStops: ["Shape", "Spread", "Outliers"] },
      { station: "Charts", busStops: ["Box plots", "Scatter", "Histograms"] },
      { station: "Claims", busStops: ["Bias", "Sample size", "Misleading graphs"] },
      { station: "Interpretation", busStops: ["Context", "Conclusion writing", "Limitations"] }
    ]
  },
  "advanced-functions": {
    branches: [
      { station: "Polynomial", busStops: ["Degree", "End behavior", "Roots"] },
      { station: "Exponential", busStops: ["Growth/decay", "Parameters", "Applications"] },
      { station: "Logarithmic", busStops: ["Inverse idea", "Asymptotes", "Laws"] },
      { station: "Compare models", busStops: ["Transformations", "Fit to context", "Limitations"] }
    ]
  },
  "trigonometry-s5": {
    branches: [
      { station: "Identities", busStops: ["Pythagorean", "Compound angles", "Double angles"] },
      { station: "Graphs", busStops: ["Amplitude", "Period", "Phase shift"] },
      { station: "Equations", busStops: ["Principal values", "General solution", "Intervals"] },
      { station: "Applications", busStops: ["Bearings", "Heights", "Modelling cycles"] }
    ]
  },
  "probability-s5": {
    branches: [
      { station: "Counting", busStops: ["Addition rule", "Multiplication rule", "Complements"] },
      { station: "Arrangement", busStops: ["Permutations", "Combinations", "Restrictions"] },
      { station: "Conditional", busStops: ["Given events", "Venn diagrams", "Bayes idea"] },
      { station: "Decision trees", busStops: ["Branches", "Independent/dependent", "Expected value"] }
    ]
  },
  "differentiation-intro": {
    branches: [
      { station: "Gradient", busStops: ["Secants", "Tangents", "Rate of change"] },
      { station: "Limits", busStops: ["Approach value", "First principles", "Continuity idea"] },
      { station: "Derivative", busStops: ["Power rule", "Notation", "Higher derivatives"] },
      { station: "Tangent", busStops: ["Equation", "Normal", "Stationary points"] }
    ]
  },
  calculus: {
    branches: [
      { station: "Derivatives", busStops: ["Rules", "Optimization", "Curve sketching"] },
      { station: "Integrals", busStops: ["Antiderivative", "Definite area", "Constants"] },
      { station: "Applications", busStops: ["Kinematics", "Area", "Rates"] },
      { station: "Exam synthesis", busStops: ["Mixed questions", "Method choice", "Mark allocation"] }
    ]
  },
  "statistics-s6": {
    branches: [
      { station: "Sampling", busStops: ["Random samples", "Bias", "Sample size"] },
      { station: "Normal curve", busStops: ["Z-score", "Standardization", "Percentiles"] },
      { station: "Estimation", busStops: ["Confidence", "Margin of error", "Hypothesis idea"] },
      { station: "Interpretation", busStops: ["Data summaries", "Context", "Uncertainty"] }
    ]
  },
  "exam-revision": {
    branches: [
      { station: "Skill audit", busStops: ["Weak topics", "Formula recall", "Priority list"] },
      { station: "Timed sets", busStops: ["Pacing", "Question choice", "Accuracy check"] },
      { station: "Error log", busStops: ["Concept errors", "Careless slips", "Review cycle"] },
      { station: "Paper strategy", busStops: ["Mark schemes", "Section timing", "Final checks"] }
    ]
  },
  "mixed-problem-solving": {
    branches: [
      { station: "Read problem", busStops: ["Known/unknown", "Diagrams", "Constraints"] },
      { station: "Choose tools", busStops: ["Algebra link", "Geometry link", "Data link"] },
      { station: "Multi-step plan", busStops: ["Subgoals", "Assumptions", "Sequencing"] },
      { station: "Reflect", busStops: ["Reasonableness", "Alternative method", "Communicate answer"] }
    ]
  }
};

export const fallbackTransitDetails: TransitDetails = {
  branches: [
    { station: "Concept", busStops: ["Vocabulary", "Examples", "Misconceptions"] },
    { station: "Visual model", busStops: ["Diagram", "Simulation", "Interpretation"] },
    { station: "Practice", busStops: ["Guided checks", "Independent work", "Feedback"] },
    { station: "Checkpoint", busStops: ["Review", "Quiz", "Next step"] }
  ]
};

function getStatusLabel(status: TopicStatus, t: ReturnType<typeof useSettings>["t"]) {
  if (status === "completed") return t(dictionary.common.completed);
  if (status === "in-progress") return t(dictionary.common.inProgress);
  return t(dictionary.common.notStarted);
}

export function getGradeDisplayName(name: string, gradeId: string) {
  return name.replace(`${gradeId} / `, "").replace(` / ${gradeId}`, "");
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function transitDetailsForTopic(topic: Topic) {
  return getMainlandHjbTransitDetails(topic) ?? getMainlandPepTransitDetails(topic) ?? topicTransitDetails[topic.id] ?? fallbackTransitDetails;
}

function localizedBranchStation({
  branch,
  topic,
  branchIndex,
  language,
  text
}: {
  branch: TransitBranch;
  topic: Topic;
  branchIndex: number;
  language: ReturnType<typeof useSettings>["language"];
  text: ReturnType<typeof useSettings>["text"];
}) {
  const station = branch.stationLabel ? text(branch.stationLabel) : branch.station;
  if (!isChineseLanguage(language)) return station;
  if (hasCjkText(station)) return simplifyChineseText(station, language);
  return simplifyChineseText(`${text(topic.title)}重點${branchIndex + 1}`, language);
}

function localizedBranchStops({
  branch,
  language,
  text
}: {
  branch: TransitBranch;
  language: ReturnType<typeof useSettings>["language"];
  text: ReturnType<typeof useSettings>["text"];
}) {
  const stops = branch.busStopLabels?.length ? branch.busStopLabels.map((stop) => text(stop)) : branch.busStops;
  if (!isChineseLanguage(language)) return stops;
  if (stops.some(hasCjkText)) return stops.map((stop) => simplifyChineseText(stop, language));
  return ["核心概念", "視覺模型", "練習檢查"].map((stop) => simplifyChineseText(stop, language));
}

function TransitRoute({
  topic,
  index,
  gradeIndex,
  lesson
}: {
  topic: Topic;
  index: number;
  gradeIndex: number;
  lesson?: LessonSummary;
}) {
  const { language, text, t } = useSettings();
  const details = transitDetailsForTopic(topic);
  const routeColor = routeColors[(gradeIndex + index) % routeColors.length];
  const gradeLabel = formatGradeLabel(topic.grade, language, true);

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex items-center gap-3">
          <span className="h-4 w-10 rounded-full" style={{ backgroundColor: routeColor }} />
	          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {isChineseLanguage(language) ? simplifyChineseText(`${gradeLabel}路線${index + 1}`, language) : `Subway ${gradeLabel}-${index + 1}`}
            </span>
        </div>
        <h3 className="mt-3 text-xl font-black leading-tight text-white">{text(topic.title)}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", statusStyles[topic.status])}>
            {getStatusLabel(topic.status, t)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-slate-300">
	            {formatDifficultyLabel(topic.difficulty, language)}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
	            <span>{t(dictionary.common.mastery)}</span>
            <span>{topic.mastery}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${topic.mastery}%`, backgroundColor: routeColor }} />
          </div>
        </div>
        {lesson ? (
          <Link
            href={lessonHrefForSlug(lesson.slug)}
            className="focus-ring mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
          >
	            {t(dictionary.common.openLesson)}
          </Link>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
        <div className="relative pt-1">
          <span className="absolute left-8 right-8 top-[1.05rem] h-3 rounded-full" style={{ backgroundColor: routeColor }} />
          <div className="relative grid grid-cols-4 gap-4">
            {details.branches.map((branch, branchIndex) => {
	              const busColor = busColors[(index + branchIndex) % busColors.length];
                const stationLabel = localizedBranchStation({ branch, topic, branchIndex, language, text });
                const stops = localizedBranchStops({ branch, language, text });
	
	              return (
	              <div key={`${topic.id}-${branchIndex}-${branch.station}`} className="flex flex-col items-center text-center">
                <span className={cn("grid h-9 w-9 place-items-center rounded-full border-4", stationStyles[topic.status])}>
                  <span className="h-3 w-3 rounded-full bg-white" />
                </span>
	                <span className="mt-2 min-h-10 text-[11px] font-black leading-4 text-slate-100">{stationLabel}</span>

                <div className="mt-2 flex h-8 items-center justify-center">
                  <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: busColor }} />
                </div>

                <div className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                  <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black text-slate-950" style={{ backgroundColor: busColor }}>
	                    {isChineseLanguage(language) ? simplifyChineseText(`支線${index + 1}-${branchIndex + 1}`, language) : `BUS ${gradeLabel}${index + 1}-${String.fromCharCode(65 + branchIndex)}`}
	                  </span>
	                  <div className="relative mt-3 space-y-2 pl-3 text-left">
	                    <span className="absolute bottom-3 left-[1.05rem] top-3 w-1 rounded-full" style={{ backgroundColor: busColor }} />
	                    {stops.map((stop) => (
                      <div key={stop} className="relative flex min-h-8 items-center gap-2">
                        <span className="z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-white bg-slate-950">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: busColor }} />
                        </span>
                        <span className="text-[10px] font-bold leading-4 text-slate-300">{stop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function averageMastery(topics: Topic[]) {
  if (!topics.length) return 0;
  return Math.round(topics.reduce((total, topic) => total + topic.mastery, 0) / topics.length);
}

function countTopicsByStatus(topics: Topic[], status: TopicStatus) {
  return topics.filter((topic) => topic.status === status).length;
}

function selectStudentFocusTopics(topics: Topic[], maxTopics = 5) {
  if (topics.length <= maxTopics) return topics;

  const anchorIndex = topics.findIndex((topic) => topic.status === "in-progress");
  const fallbackIndex = topics.findIndex((topic) => topic.status === "not-started");
  const focusIndex = anchorIndex >= 0 ? anchorIndex : fallbackIndex >= 0 ? fallbackIndex : Math.max(topics.length - maxTopics, 0);
  const startIndex = Math.min(Math.max(focusIndex - 1, 0), Math.max(topics.length - maxTopics, 0));

  return topics.slice(startIndex, startIndex + maxTopics);
}

function StudentTopicCard({
  topic,
  topicPosition,
  gradeIndex,
  lesson
}: {
  topic: Topic;
  topicPosition: number;
  gradeIndex: number;
  lesson?: LessonSummary;
}) {
  const { language, text, t } = useSettings();
  const details = transitDetailsForTopic(topic);
  const routeColor = routeColors[(gradeIndex + topicPosition) % routeColors.length];
  const branchSummaries = details.branches.slice(0, 4).map((branch, branchIndex) =>
    localizedBranchStation({ branch, topic, branchIndex, language, text })
  );

  return (
    <article className="soft-panel min-w-0 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
              {topicPosition + 1}
            </span>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-black", studentStatusStyles[topic.status])}>
              {getStatusLabel(topic.status, t)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
              {formatDifficultyLabel(topic.difficulty, language)}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-black leading-tight text-slate-950 dark:text-white">{text(topic.title)}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{text(topic.description)}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left dark:border-white/10 dark:bg-white/[0.055] sm:text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t(dictionary.common.mastery)}</p>
          <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{topic.mastery}%</p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${topic.mastery}%`, backgroundColor: routeColor }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {branchSummaries.map((branch) => (
          <span key={branch} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
            {branch}
          </span>
        ))}
      </div>

      <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.035]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200">
          <span>{t({ en: "Focus details", zh: "重點細節", zhHans: "重点细节" })}</span>
          <span className="text-xs font-bold text-slate-400">
            {details.branches.length} {t({ en: "areas", zh: "個範圍", zhHans: "个范围" })}
          </span>
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-white/10 sm:grid-cols-2">
          {details.branches.map((branch, branchIndex) => {
            const branchTitle = localizedBranchStation({ branch, topic, branchIndex, language, text });
            const stops = localizedBranchStops({ branch, language, text });

            return (
              <div key={`${topic.id}-student-${branchIndex}-${branch.station}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                <p className="text-sm font-black text-slate-800 dark:text-white">{branchTitle}</p>
                <ul className="mt-2 space-y-1.5">
                  {stops.map((stop) => (
                    <li key={stop} className="flex gap-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-300">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: routeColor }} />
                      <span>{stop}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>

      {lesson ? (
        <Link
          href={lessonHrefForSlug(lesson.slug)}
          className="focus-ring mt-4 inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950 sm:w-fit"
        >
          {t(dictionary.common.openLesson)}
        </Link>
      ) : null}
    </article>
  );
}

function StudentLearningPath({
  grade,
  gradeIndex,
  topics,
  displayedRecommendedLesson,
  lessonByTopicId,
  contentUnavailable,
  activeCurriculumProfile
}: {
  grade: Grade;
  gradeIndex: number;
  topics: Topic[];
  displayedRecommendedLesson: LessonSummary | null;
  lessonByTopicId: Map<string, LessonSummary>;
  contentUnavailable?: LocalizedText | null;
  activeCurriculumProfile: ReturnType<typeof curriculumProfileForTrack>;
}) {
  const { language, text, t } = useSettings();
  const focusTopics = selectStudentFocusTopics(topics);
  const nextTopic = topics.find((topic) => topic.status === "in-progress") ?? topics.find((topic) => topic.status === "not-started") ?? topics[0] ?? null;
  const nextLesson = displayedRecommendedLesson ?? (nextTopic ? lessonByTopicId.get(nextTopic.id) ?? null : null);
  const completedCount = countTopicsByStatus(topics, "completed");
  const inProgressCount = countTopicsByStatus(topics, "in-progress");
  const notStartedCount = countTopicsByStatus(topics, "not-started");
  const mastery = averageMastery(topics);
  const gradeLabel = formatGradeLabel(grade.id, language, true);
  const hasHiddenTopics = focusTopics.length < topics.length;

  return (
    <div className="relative mt-8 space-y-6">
      {nextLesson ? (
        <section className="glass-panel border-cyan-200 bg-cyan-50/75 p-5 dark:border-cyan-300/30 dark:bg-cyan-400/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">
                {t({ en: "Start here", zh: "由這裡開始", zhHans: "从这里开始" })}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{text(nextLesson.title)}</h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-900/75 dark:text-cyan-50/85">
                {text(nextLesson.description)}
              </p>
            </div>
            <Link
              href={lessonHrefForSlug(nextLesson.slug)}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950 sm:w-fit"
            >
              {t(dictionary.common.openLesson)}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-black shadow-lg", isChineseLanguage(language) ? "text-base" : "text-2xl", "bg-slate-950 text-white dark:bg-white dark:text-slate-950")}>
              {gradeLabel}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t({ en: "Current grade path", zh: "目前年級路線", zhHans: "当前年级路线" })}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {gradeLabel} · {getGradeDisplayName(text(grade.name), grade.id)}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t(dictionary.common.age)} {grade.ageRange} · {text(grade.focus)}
              </p>
              <span className="mt-3 inline-flex w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100">
                {t(publisherLabels[activeCurriculumProfile.publisher])}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[25rem]">
            <div className="soft-panel px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t(dictionary.common.mastery)}</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{mastery}%</p>
            </div>
            <div className="soft-panel px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t(dictionary.common.completed)}</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-200">{completedCount}</p>
            </div>
            <div className="soft-panel px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t(dictionary.common.inProgress)}</p>
              <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-200">{inProgressCount || notStartedCount}</p>
            </div>
          </div>
        </div>
      </section>

      {contentUnavailable ? (
        <section className="rounded-2xl border border-amber-300/45 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800 shadow-sm dark:bg-amber-400/10 dark:text-amber-100">
          {text(contentUnavailable)}
        </section>
      ) : null}

      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              {t({ en: "Topic path", zh: "主題路線", zhHans: "主题路线" })}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {t({ en: "This grade's next topics", zh: "本年級下一步主題", zhHans: "本年级下一步主题" })}
            </h2>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {hasHiddenTopics
              ? t({
                  en: `Showing ${focusTopics.length} of ${topics.length} topics around the current learning point`,
                  zh: `顯示目前學習點附近 ${focusTopics.length} / ${topics.length} 個主題`,
                  zhHans: `显示当前学习点附近 ${focusTopics.length} / ${topics.length} 个主题`
                })
              : t({
                  en: `${topics.length} topics in ${gradeLabel}`,
                  zh: `${gradeLabel} 共 ${topics.length} 個主題`,
                  zhHans: `${gradeLabel} 共 ${topics.length} 个主题`
                })}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {focusTopics.map((topic) => {
            const topicPosition = Math.max(topics.findIndex((candidate) => candidate.id === topic.id), 0);

            return (
              <StudentTopicCard
                key={topic.id}
                topic={topic}
                topicPosition={topicPosition}
                gradeIndex={gradeIndex}
                lesson={lessonByTopicId.get(topic.id)}
              />
            );
          })}
        </div>

        {hasHiddenTopics ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300">
            {t({
              en: "The full curriculum map is still available from the Primary and Secondary map buttons above.",
              zh: "完整課程地圖仍可透過上方的小學及中學地圖按鈕查看。",
              zhHans: "完整课程地图仍可通过上方的小学及中学地图按钮查看。"
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function LearningRoadmap({ forcedBand = null, mode = "network" }: LearningRoadmapProps = {}) {
  const { currentUser, language, selectedGrade, text, t } = useSettings();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const activeRoadmapGrade = selectedGrade;
  const activeCurriculumProfile = currentUser?.curriculumProfile ?? roadmap?.curriculumProfile ?? curriculumProfileForTrack("HK");
  const activeCurriculumTrack = currentUser?.curriculumTrack ?? roadmap?.curriculumTrack ?? curriculumTrackForProfile(activeCurriculumProfile);
  const isMainlandPepRoadmap = isMainlandPepRoadmapProfile(activeCurriculumProfile);
  const isMainlandHjbRoadmap = isMainlandHjbRoadmapProfile(activeCurriculumProfile);
  const isMainlandPublisherRoadmap = isMainlandPepRoadmap || isMainlandHjbRoadmap;
  const isStudentMode = mode === "student" && Boolean(currentUser);
  const selectedBand: RoadmapBand = forcedBand ?? (activeRoadmapGrade.startsWith("P") ? "primary" : "secondary");
  const [roadmapBand, setRoadmapBand] = useState<RoadmapBand>(selectedBand);

  useEffect(() => {
    setRoadmapBand(selectedBand);
  }, [selectedBand]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoadmap() {
      try {
        const query = currentUser && !forcedBand && !isMainlandPublisherRoadmap ? `?grade=${activeRoadmapGrade}` : "";
        const response = await fetch(`/api/roadmap${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { roadmap?: RoadmapData };
        if (!cancelled) setRoadmap(body.roadmap ?? null);
      } catch {
        if (!cancelled) setRoadmap(null);
      }
    }

    void loadRoadmap();

    return () => {
      cancelled = true;
    };
  }, [activeRoadmapGrade, currentUser, forcedBand, isMainlandPublisherRoadmap]);

  const personalizedTopicById = useMemo(
    () => new Map((roadmap?.topics ?? []).map((topic) => [topic.id, topic])),
    [roadmap?.topics]
  );
  const lessonByTopicId = useMemo(
    () => new Map((roadmap?.lessons ?? []).map((lesson) => [lesson.topicId, lesson])),
    [roadmap?.lessons]
  );
  const visibleGrades = useMemo(() => {
    if (isStudentMode) return grades.filter((grade) => grade.id === activeRoadmapGrade);
    if (forcedBand) return forcedBand === "primary" ? primaryGrades : secondaryGrades;
    if (currentUser && isMainlandPublisherRoadmap) return grades;
    if (currentUser) return grades.filter((grade) => grade.id === activeRoadmapGrade);
    return roadmapBand === "primary" ? primaryGrades : secondaryGrades;
  }, [activeRoadmapGrade, currentUser, forcedBand, isMainlandPublisherRoadmap, isStudentMode, roadmapBand]);
  const visibleTopicCount = visibleGrades.reduce(
    (count, grade) =>
      count +
      (roadmap
        ? roadmap.topics.filter((topic) => topic.grade === grade.id).length
        : fallbackTopics.filter((topic) => topic.curriculumTrack === activeCurriculumTrack && topic.grade === grade.id).length),
    0
  );
  const visibleGradeIds = useMemo(() => new Set(visibleGrades.map((grade) => grade.id)), [visibleGrades]);
  const displayedRecommendedLesson = useMemo(() => {
    if (!roadmap) return null;
    if (roadmap.recommendedLesson && visibleGradeIds.has(roadmap.recommendedLesson.grade)) {
      return roadmap.recommendedLesson;
    }

    return (
      roadmap.lessons.find((lesson) => visibleGradeIds.has(lesson.grade) && lesson.status !== "completed") ??
      roadmap.lessons.find((lesson) => visibleGradeIds.has(lesson.grade)) ??
      null
    );
  }, [roadmap, visibleGradeIds]);

  if (isStudentMode) {
    const activeGrade = visibleGrades[0] ?? grades.find((grade) => grade.id === activeRoadmapGrade) ?? grades[0];
    const gradeIndex = Math.max(grades.findIndex((candidate) => candidate.id === activeGrade.id), 0);
    const sourceTopics = roadmap
      ? roadmap.topics.filter((topic) => topic.grade === activeGrade.id)
      : fallbackTopics.filter((topic) => topic.curriculumTrack === activeCurriculumTrack && topic.grade === activeGrade.id);
    const gradeTopics = sourceTopics.map((topic) => personalizedTopicById.get(topic.id) ?? topic);

    return (
      <StudentLearningPath
        grade={activeGrade}
        gradeIndex={gradeIndex}
        topics={gradeTopics}
        displayedRecommendedLesson={displayedRecommendedLesson}
        lessonByTopicId={lessonByTopicId}
        contentUnavailable={roadmap?.contentUnavailable}
        activeCurriculumProfile={activeCurriculumProfile}
      />
    );
  }

  return (
    <div className="relative mt-10 space-y-8">
      <section className="rounded-[2rem] border border-cyan-300/25 bg-slate-950/70 p-5 shadow-xl shadow-cyan-950/20 backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
	            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{t({ en: "Transit legend", zh: "交通圖例", zhHans: "交通图例" })}</p>
	            <h2 className="mt-2 text-2xl font-black text-white">
                  {isMainlandHjbRoadmap
                    ? t({ en: "HJB mathematics roadmap", zh: "滬教版數學學習路線圖", zhHans: "沪教版数学学习路线图" })
                    : activeCurriculumTrack === "MAINLAND_PEP_HIGH"
                    ? t({ en: "Mainland math roadmap", zh: "內地數學學習路線圖", zhHans: "内地数学学习路线图" })
                    : t({ en: "Hong Kong transit-style math roadmap", zh: "香港交通風格數學路線圖" })}
                </h2>
                <span className="mt-3 inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                  {t(publisherLabels[activeCurriculumProfile.publisher])}
                </span>
	            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
	              {t({
                  en: "Colored Subway routes represent core math concepts. Each Subway station branches into its own bus route of related subconcepts students can study next.",
                  zh: "彩色路線代表核心數學概念。每個站點會連到相關子概念支線，方便學生選擇下一步學習。",
                  zhHans: "彩色路线代表核心数学概念。每个站点会连到相关子概念支线，方便学生选择下一步学习。"
                })}
	            </p>
          </div>
          <div className="space-y-3">
            {!currentUser && !forcedBand ? (
              <div className="grid gap-2 rounded-3xl border border-white/10 bg-white/[0.055] p-2 text-sm font-black text-slate-200 sm:grid-cols-2">
                {([
                  ["primary", t({ en: "Primary P1-P6", zh: "小學 小一至小六", zhHans: "小学 P1-P6" })],
                  ["secondary", t({ en: "Secondary S1-S6", zh: "中學 中一至中六", zhHans: "中学 S1-S6" })]
                ] as const).map(([band, label]) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setRoadmapBand(band)}
                    aria-pressed={roadmapBand === band}
                    className={cn(
                      "focus-ring rounded-2xl px-4 py-3 transition hover:-translate-y-0.5",
                      roadmapBand === band ? "bg-cyan-300 text-slate-950 shadow-glow" : "bg-transparent text-slate-300 hover:bg-white/[0.08]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 text-sm font-bold text-slate-200 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
                <span className="h-3 w-12 rounded-full bg-[#e31b23]" />
	                {t({ en: "Subway core concept", zh: "核心概念路線", zhHans: "核心概念路线" })}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
                <span className="h-2 w-12 rounded-full bg-[#f6c84c]" />
	                {t({ en: "Bus detailed concept", zh: "詳細概念支線", zhHans: "详细概念支线" })}
              </div>
            </div>
            <p className="text-right text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
              {currentUser
                ? isMainlandHjbRoadmap
                  ? t({ en: "Personal P1-S6 HJB roadmap", zh: "個人滬教版小一至中六路線", zhHans: "个人沪教版P1-S6路线" })
                  : isMainlandPepRoadmap
                  ? t({ en: "Personal P1-S6 PEP roadmap", zh: "個人人教版小一至中六路線", zhHans: "个人人教版P1-S6路线" })
                  : t({ en: "Personal grade route", zh: "個人年級路線" })
                : `${visibleGrades.length} ${t(dictionary.common.grade)} · ${visibleTopicCount} ${t(dictionary.common.topic)}`}
            </p>
          </div>
        </div>
      </section>

      {displayedRecommendedLesson ? (
        <section className="rounded-[2rem] border border-emerald-300/35 bg-emerald-400/10 p-5 shadow-xl shadow-emerald-950/10 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
	              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">{t(dictionary.dashboard.nextLesson)}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text(displayedRecommendedLesson.title)}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800 dark:text-emerald-50/85">
                {text(displayedRecommendedLesson.description)}
              </p>
            </div>
            <Link
              href={lessonHrefForSlug(displayedRecommendedLesson.slug)}
              className="focus-ring inline-flex w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
            >
	              {t(dictionary.common.openLesson)}
            </Link>
          </div>
        </section>
      ) : null}

      {roadmap?.contentUnavailable ? (
        <section className="rounded-[2rem] border border-amber-300/45 bg-amber-400/10 p-5 text-sm font-bold leading-6 text-amber-800 shadow-xl shadow-amber-950/10 backdrop-blur-2xl dark:text-amber-100">
          {text(roadmap.contentUnavailable)}
        </section>
      ) : null}

      {visibleGrades.map((grade, visibleGradeIndex) => {
        const gradeIndex = Math.max(grades.findIndex((candidate) => candidate.id === grade.id), 0);
        const sourceTopics = roadmap
          ? roadmap.topics.filter((topic) => topic.grade === grade.id)
          : fallbackTopics.filter((topic) => topic.curriculumTrack === activeCurriculumTrack && topic.grade === grade.id);
        const gradeTopics = sourceTopics.map((topic) => personalizedTopicById.get(topic.id) ?? topic);
        const active = activeRoadmapGrade === grade.id;

        return (
          <motion.section
            key={grade.id}
            className={cn(
              "relative overflow-hidden rounded-[2rem] border bg-slate-950/80 p-5 shadow-xl backdrop-blur-2xl sm:p-6",
              active ? "border-cyan-300/45 shadow-cyan-500/10" : "border-white/10 shadow-black/20"
            )}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: visibleGradeIndex * 0.05 }}
          >
            <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
            <span className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", grade.color)} />

            <div className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
	                  <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-black shadow-lg", isChineseLanguage(language) ? "text-base" : "text-2xl", active ? "bg-white text-slate-950" : "bg-slate-900 text-white")}>
	                    {formatGradeLabel(grade.id, language, true)}
	                  </span>
	                  <div>
	                    <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">{t({ en: "Grade terminal", zh: "年級總站" })}</p>
	                    <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
	                      {formatGradeLabel(grade.id, language, true)} · {getGradeDisplayName(text(grade.name), grade.id)}
	                    </h2>
	                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{t(dictionary.common.age)} {grade.ageRange} · {text(grade.focus)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-emerald-200">{t(dictionary.common.completed)}</span>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1.5 text-cyan-200">{t(dictionary.common.inProgress)}</span>
                  <span className="rounded-full border border-slate-300/20 bg-white/[0.055] px-3 py-1.5 text-slate-300">{t(dictionary.common.notStarted)}</span>
                </div>
              </div>

              <div className="mt-7 overflow-x-auto pb-2">
                <div className="min-w-[940px] space-y-6">
                  {gradeTopics.map((topic, topicIndex) => (
                    <TransitRoute
                      key={topic.id}
                      topic={topic}
                      index={topicIndex}
                      gradeIndex={gradeIndex}
                      lesson={lessonByTopicId.get(topic.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
