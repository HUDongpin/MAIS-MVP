"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { useVisualizationTheme } from "@/components/visualizations/visualizationTheme";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import type { LocalizedText } from "@/types";
import {
  HK_PRIMARY_DEDICATED_LAB_IDS,
  HK_PRIMARY_DEDICATED_LAB_ID_SET,
  isHKPrimaryDedicatedLabId
} from "./hkVisualizationLabRegistry";
import type { HKPrimaryDedicatedLabId } from "./hkVisualizationLabRegistry";

/**
 * Hong Kong P1-P6 topics whose lesson promise needs a dedicated learner model.
 * The two PASS-B topics stay on their existing static/configured models:
 * p2-multiplication-foundations and p3-fractions-intro.
 */
export {
  HK_PRIMARY_DEDICATED_LAB_IDS,
  HK_PRIMARY_DEDICATED_LAB_ID_SET,
  isHKPrimaryDedicatedLabId
} from "./hkVisualizationLabRegistry";
export type { HKPrimaryDedicatedLabId } from "./hkVisualizationLabRegistry";

export type HKPrimaryFormulaBinding = {
  tokenId: string;
  objectIds: readonly string[];
  meaning: string;
};

export type HKPrimaryVisualizationContract = {
  grade: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  learningObjective: string;
  coreRelation: string;
  invariants: readonly string[];
  stateKeys: readonly string[];
  visualObjects: readonly string[];
  formulaBindings: readonly HKPrimaryFormulaBinding[];
};

/**
 * Source-readable mathematical contracts used by A18/A11 regression gates.
 * Every object named here is rendered from the corresponding live state.
 */
export const HK_PRIMARY_VISUALIZATION_CONTRACTS = {
  "p1-counting-number-bonds": {
    grade: "P1",
    learningObjective: "Compose and decompose a total within 20.",
    coreRelation: "known part + missing part = total",
    invariants: ["Both parts are non-negative.", "The two parts always equal the total."],
    stateKeys: ["total", "knownPart"],
    visualObjects: ["counter set", "whole node", "known-part node", "missing-part node"],
    formulaBindings: [{ tokenId: "total", objectIds: ["counter-set", "whole-node"], meaning: "The unchanged whole." }]
  },
  "p1-addition-subtraction": {
    grade: "P1",
    learningObjective: "Interpret addition as forward movement and subtraction as backward movement.",
    coreRelation: "end = start + signed step",
    invariants: ["The arrow starts at start.", "Its direction follows the selected operation."],
    stateKeys: ["operation", "start", "step"],
    visualObjects: ["number line", "start point", "directed jump", "end point"],
    formulaBindings: [{ tokenId: "signed-step", objectIds: ["directed-jump"], meaning: "Direction and size of the operation." }]
  },
  "p1-shapes-patterns": {
    grade: "P1",
    learningObjective: "Recognise shape properties and extend a repeating rule.",
    coreRelation: "repeat unit determines every later term",
    invariants: ["The repeat unit does not change.", "The next shape follows the selected rule."],
    stateKeys: ["patternRule", "revealedTerms"],
    visualObjects: ["repeat-unit bracket", "shape sequence", "next-shape target"],
    formulaBindings: [{ tokenId: "repeat-unit", objectIds: ["repeat-bracket", "shape-sequence"], meaning: "The shortest repeating block." }]
  },
  "p1-measurement-time": {
    grade: "P1",
    learningObjective: "Compare lengths and read an analogue clock to the half hour.",
    coreRelation: "measurement counts equal units; equal clock-face intervals determine whole- and half-hour hand positions",
    invariants: ["Ruler units remain equal.", "A half hour places the minute hand at 6."],
    stateKeys: ["mode", "length", "hour", "halfHour"],
    visualObjects: ["unit ruler", "comparison bars", "clock face", "hour hand", "minute hand"],
    formulaBindings: [{ tokenId: "equal-unit", objectIds: ["unit-ruler", "length-bar"], meaning: "Length is counted with equal units." }]
  },
  "p2-place-value": {
    grade: "P2",
    learningObjective: "Read and build numbers from 0 to 1000 using hundreds, tens, and ones.",
    coreRelation: "number = 100 x hundreds + 10 x tens + ones",
    invariants: ["Each place contains 0 to 9 units except the special 1000 state.", "Regrouping ten of a place produces one of the next place."],
    stateKeys: ["number"],
    visualObjects: ["thousand cube", "hundred flats", "ten rods", "one units", "place-value table"],
    formulaBindings: [{ tokenId: "hundreds", objectIds: ["hundred-flat", "hundreds-column"], meaning: "Hundreds digit and its base-ten blocks." }]
  },
  "p2-money-time": {
    grade: "P2",
    learningObjective: "Pay with Hong Kong money, find change, and read half-hour times.",
    coreRelation: "change = payment - price; minutes determine hand position",
    invariants: ["Payment is never below price.", "The clock hands share the same centre."],
    stateKeys: ["mode", "price", "payment", "hour", "halfHour"],
    visualObjects: ["HK dollar notes", "price bar", "change segment", "clock face", "clock hands"],
    formulaBindings: [{ tokenId: "change", objectIds: ["payment-bar", "change-segment"], meaning: "The unused part of the payment." }]
  },
  "p2-length-data": {
    grade: "P2",
    learningObjective: "Estimate and measure suitable lengths in metres, choose a suitable measuring tool, and read a strict one-to-one pictogram.",
    coreRelation: "1 m = 100 cm; one pictogram icon represents exactly one object",
    invariants: ["The estimate and measurement refer to the same target.", "The chosen tool is evaluated against that target.", "Each pictogram icon represents exactly one object."],
    stateKeys: ["displayMode", "target", "tool", "estimateCm", "measuredCm", "measuredMetres", "measuredRemainderCm", "pictogramBlueCount"],
    visualObjects: ["metre reference", "estimate and measured lines", "measuring-tool choice", "one-to-one pictogram key", "pictogram category totals"],
    formulaBindings: [
      { tokenId: "metre", objectIds: ["metre-reference", "estimate-line", "measured-line"], meaning: "One metre is the same length as 100 centimetres." },
      { tokenId: "one-icon", objectIds: ["pictogram-key", "pictogram-category", "pictogram-icon"], meaning: "Every icon contributes exactly one object to its category total." }
    ]
  },
  "p3-multiplication-division": {
    grade: "P3",
    learningObjective: "Connect multiplication facts with equal sharing and grouping.",
    coreRelation: "groups x items per group = total; total / groups = items per group",
    invariants: ["Every group has equal size.", "Multiplication and division preserve the same total."],
    stateKeys: ["mode", "groups", "itemsPerGroup"],
    visualObjects: ["equal groups", "array", "shared counters"],
    formulaBindings: [{
      tokenId: "total",
      objectIds: ["multiplication-array", "array-counter", "equal-sharing-groups", "shared-counter", "total-tray"],
      meaning: "The same total is shown in the multiplication array, equal-sharing groups, and total tray."
    }]
  },
  "p3-measurement": {
    grade: "P3",
    learningObjective: "Choose meaningful metric units or read a value from a scaled bar chart.",
    coreRelation: "base quantity = displayed quantity x unit scale; bar height is read against one shared numerical scale",
    invariants: ["Changing units does not change the physical quantity.", "Conversion factors remain exact.", "Every bar starts on the zero axis and uses the same scale interval."],
    stateKeys: ["model", "quantityType", "baseValue", "unit", "selectedCategory"],
    visualObjects: ["measurement scale", "measured quantity", "conversion marker", "bar-chart axes", "scaled data bars", "selected-value guide"],
    formulaBindings: [
      { tokenId: "scale", objectIds: ["measured-quantity", "conversion-marker"], meaning: "How many base units one selected unit represents." },
      { tokenId: "bar-value", objectIds: ["bar-chart", "data-bar", "selected-value-guide"], meaning: "The selected bar height and its reading on the shared numerical scale." }
    ]
  },
  "p3-geometry-patterns": {
    grade: "P3",
    learningObjective: "Recognise concrete quadrilaterals and triangles from their visible sides, vertices, and parallel or equal-side properties.",
    coreRelation: "a quadrilateral has four sides and four vertices; a triangle has three sides and three vertices",
    invariants: ["Every displayed shape is a closed polygon.", "The visible side and vertex counts agree with the selected shape family.", "Property marks describe only the displayed shape."],
    stateKeys: ["shapeFamily", "shapeType"],
    visualObjects: ["shape outline", "labelled vertices", "side markers", "parallel-side guides", "equal-side guides"],
    formulaBindings: [{ tokenId: "shape-properties", objectIds: ["shape-outline", "shape-side", "shape-vertex"], meaning: "The visible sides and vertices determine the stated concrete properties." }]
  },
  "p4-large-numbers": {
    grade: "P4",
    learningObjective: "Find complete factor pairs, test divisibility, and identify common factors, HCF, common multiples, and LCM.",
    coreRelation: "d is a factor of n exactly when n divided by d has remainder zero; HCF is the greatest common factor and LCM is the least positive common multiple",
    invariants: ["All inputs are positive integers.", "Every factor pair is shown exactly once.", "One is neither prime nor composite.", "HCF and LCM are selected from visible intersections."],
    stateKeys: ["mode", "firstNumber", "secondNumber", "candidateDivisor"],
    visualObjects: ["factor-pair array", "remainder test", "factor-list intersection", "positive-multiple rows", "HCF marker", "LCM marker"],
    formulaBindings: [
      { tokenId: "factor-test", objectIds: ["remainder-test", "factor-pair"], meaning: "Remainder zero is the exact factor condition." },
      { tokenId: "common-extrema", objectIds: ["common-factor", "hcf-marker", "common-multiple", "lcm-marker"], meaning: "The maximum common factor and least positive common multiple." }
    ]
  },
  "p4-decimals": {
    grade: "P4",
    learningObjective: "Locate tenths and hundredths precisely on a number line.",
    coreRelation: "decimal = ones + tenths/10 + hundredths/100",
    invariants: ["Hundredth ticks are equally spaced.", "The marker coordinate equals the decimal value."],
    stateKeys: ["decimalValue"],
    visualObjects: ["decimal number line", "tenths ticks", "hundredths marker", "place-value decomposition"],
    formulaBindings: [{ tokenId: "hundredths", objectIds: ["hundredths-marker", "decimal-number-line"], meaning: "Hundredths digit and its position." }]
  },
  "p4-angles": {
    grade: "P4",
    learningObjective: "Recognise quadrilateral family relationships and compose familiar quadrilaterals from congruent pieces.",
    coreRelation: "square is both a rectangle and a rhombus; rectangle, rhombus, and square are parallelograms",
    invariants: ["A rhombus has four equal sides and two pairs of parallel opposite sides.", "Rectangle and square membership is supported by four visible right-angle marks.", "Subset arrows are never reversed.", "Each composition preserves the outer shape and uses the stated congruent pieces."],
    stateKeys: ["mode", "familyShape", "composition", "rightAngleCount"],
    visualObjects: ["quadrilateral outline", "equal-side marks", "parallel-side marks", "right-angle marks", "family inclusion map", "composition pieces", "shared composition boundary"],
    formulaBindings: [
      { tokenId: "family-inclusion", objectIds: ["quadrilateral-outline", "equal-side-mark", "parallel-side-mark", "right-angle-mark", "family-inclusion-map"], meaning: "Visible equal-side, parallel-side, and right-angle evidence supports only the forward family inclusions." },
      { tokenId: "composition", objectIds: ["composition-piece", "composition-boundary"], meaning: "Two congruent pieces exactly cover the named outer shape." }
    ]
  },
  "p4-perimeter-area": {
    grade: "P4",
    learningObjective: "Distinguish boundary length from covered square units.",
    coreRelation: "perimeter = 2(length + width); area = length x width",
    invariants: ["Boundary segments define perimeter.", "Interior unit squares define area."],
    stateKeys: ["length", "width", "focus"],
    visualObjects: ["rectangle boundary", "unit-square grid", "dimension arrows"],
    formulaBindings: [{ tokenId: "length-width", objectIds: ["dimension-arrows", "rectangle-grid"], meaning: "The same dimensions feed both formulas." }]
  },
  "p5-fractions-operations": {
    grade: "P5",
    learningObjective: "Add or subtract as many as three fractions with unlike denominators using a common partition.",
    coreRelation: "fractions are renamed over the least common denominator before numerators are combined",
    invariants: ["Equivalent renaming preserves each addend's value.", "Simplification preserves the final value."],
    stateKeys: ["operation", "termCount", "firstFraction", "secondFraction", "thirdFraction"],
    visualObjects: ["three source fraction bars", "least-common-denominator partition", "signed result bar", "simplified fraction"],
    formulaBindings: [{ tokenId: "least-common-denominator", objectIds: ["source-bars", "common-partition-part", "signed-result-line"], meaning: "Unlike pieces are converted to one shared piece size." }]
  },
  "p5-volume": {
    grade: "P5",
    learningObjective: "Build a cuboid from unit-cube layers and calculate its volume.",
    coreRelation: "volume = length x width x height",
    invariants: ["Each layer contains length x width cubes.", "There are height equal layers."],
    stateKeys: ["length", "width", "height", "visibleLayers"],
    visualObjects: ["unit cubes", "cuboid footprint", "layer stack", "dimension arrows"],
    formulaBindings: [{ tokenId: "height", objectIds: ["layer-stack", "dimension-arrows"], meaning: "Number of equal footprint layers." }]
  },
  "p5-rates": {
    grade: "P5",
    learningObjective: "Use equal-unit and unitary reasoning to find a price for one item and scale it.",
    coreRelation: "price per item = total price / number of equal items",
    invariants: ["Equivalent rates scale both quantities by the same factor.", "The per-one value stays constant."],
    stateKeys: ["totalPrice", "itemCount", "targetCount"],
    visualObjects: ["equal-price groups", "one-item price", "scaled target group"],
    formulaBindings: [{ tokenId: "per-one", objectIds: ["one-item-price", "equal-price-groups"], meaning: "Price corresponding to exactly one equal item." }]
  },
  "p5-charts-averages": {
    grade: "P5",
    learningObjective: "Read and compare two related data series in a composite bar chart.",
    coreRelation: "category difference = second-series value - first-series value",
    invariants: ["Both series share one category axis and one numerical scale.", "Each paired bar keeps its source value."],
    stateKeys: ["selectedCategory", "firstSeries", "secondSeries"],
    visualObjects: ["paired data bars", "shared scale", "category selector", "difference bracket"],
    formulaBindings: [{ tokenId: "difference", objectIds: ["paired-data-bars", "difference-bracket", "equality-marker"], meaning: "The comparison between the two series in one category." }]
  },
  "p6-percentages": {
    grade: "P6",
    learningObjective: "Connect a percentage with equivalent forms, then use a given base and given percentage to increase or decrease an amount.",
    coreRelation: "p% = p/100; change = base x p/100; final = base plus or minus change",
    invariants: ["The whole grid always has 100 equal cells.", "The change is calculated from the given base, not inferred from two endpoint values.", "Increase adds the change and decrease subtracts it."],
    stateKeys: ["mode", "percent", "baseAmount", "direction"],
    visualObjects: ["hundred grid", "shaded cells", "fraction bar", "decimal marker", "given-base segment", "given-percent change segment", "final-amount segment"],
    formulaBindings: [
      { tokenId: "percent", objectIds: ["shaded-cell", "fraction-bar", "decimal-marker"], meaning: "One value across three equivalent representations." },
      { tokenId: "given-change", objectIds: ["given-base", "given-percent-change", "final-amount"], meaning: "The given percentage of the base is added or subtracted exactly once." }
    ]
  },
  "p6-ratio-proportion": {
    grade: "P6",
    learningObjective: "Interpret the mean as fair share and read one or two ordered continuous series on a broken-line graph.",
    coreRelation: "mean = total divided by count; ordered time points are joined only by adjacent line segments",
    invariants: ["The total is preserved by fair sharing.", "Axes show a complete scale and units.", "At most two series are displayed.", "Table values, plotted points, and mean readouts stay synchronized.", "No segment extrapolates beyond the first or last recorded time."],
    stateKeys: ["mode", "value1", "value2", "value3", "value4", "seriesCount", "seriesBShift"],
    visualObjects: ["observation stacks", "fair-share mean line", "time axis", "value axis", "ordered series points", "adjacent line segments", "data table", "series mean readout"],
    formulaBindings: [
      { tokenId: "mean", objectIds: ["observation-stack", "fair-share-mean", "series-mean"], meaning: "The preserved total divided equally across four observations." },
      { tokenId: "ordered-series", objectIds: ["broken-line-series", "series-point", "data-table"], meaning: "Each table value supplies the point at the same recorded time." }
    ]
  },
  "p6-speed": {
    grade: "P6",
    learningObjective: "Relate speed, time, and distance on a distance-time graph.",
    coreRelation: "distance = speed x time",
    invariants: ["Constant speed produces a straight line through the origin.", "Graph gradient equals speed."],
    stateKeys: ["speed", "time"],
    visualObjects: ["time axis", "distance axis", "constant-speed line", "current journey point"],
    formulaBindings: [{ tokenId: "speed", objectIds: ["constant-speed-line", "gradient-triangle"], meaning: "Distance gained per time unit." }]
  },
  "p6-pre-secondary-problem-solving": {
    grade: "P6",
    learningObjective: "Represent, plan, solve, and check a multi-step word problem.",
    coreRelation: "within budget: remaining = budget - spending; over budget: overspend = spending - budget",
    invariants: ["Each workflow step uses the same quantities.", "The check uses non-negative remaining or positive overspend and balances both sides."],
    stateKeys: ["workflowStep", "budget", "count", "unitPrice", "extraCost"],
    visualObjects: ["bar model", "strategy table", "calculation chain", "check balance"],
    formulaBindings: [{ tokenId: "budget-balance", objectIds: ["bar-model", "bar-remainder", "bar-over-budget", "calculation-result", "check-balance"], meaning: "The signed budget comparison verified in three representations." }]
  }
} as const satisfies Record<HKPrimaryDedicatedLabId, HKPrimaryVisualizationContract>;

export type HKPrimaryVisualizationLabProps = {
  lab: FeaturedLabDefinition;
  controlFooterAction?: ReactNode;
};

type ModelShellProps = {
  labId: HKPrimaryDedicatedLabId;
  state: PrimarySemanticState;
  objective: LocalizedText;
  formula: LocalizedText;
  summary: ReactNode;
  surface: ReactNode;
  controls: ReactNode;
  controlFooterAction?: ReactNode;
};

const HK_PRIMARY_RANGE_DOMAIN_IDS = {
  "p1-counting-number-bonds": "number-bond-v1",
  "p1-addition-subtraction": "bounded-step-v1",
  "p2-money-time": "payment-at-least-price-v1",
  "p4-large-numbers": "divisor-within-number-v1",
  "p5-fractions-operations": "proper-fractions-v1",
  "p5-volume": "visible-layers-v1"
} as const satisfies Partial<Record<HKPrimaryDedicatedLabId, string>>;

type RangeProjectionMetadata =
  | {
      rangeAffects: string;
      rangeProjection: "clamp-and-visibility" | "clamp-min" | "clamp-max";
      rangeProjectionReason: string;
    }
  | {
      rangeAffects?: never;
      rangeProjection?: never;
      rangeProjectionReason?: never;
    };

const FACTOR_DIVISOR_RANGE_PROJECTION_METADATA = Object.freeze({
  rangeAffects: "candidateDivisor",
  rangeProjection: "clamp-max",
  rangeProjectionReason: "test-divisor-must-not-exceed-tested-number"
} as const satisfies RangeProjectionMetadata);
const NO_RANGE_PROJECTION_METADATA = Object.freeze({} as const satisfies RangeProjectionMetadata);

export function hkPrimaryFactorsDivisorRangeProjectionMetadata(
  mode: "factor-pairs" | "common-hcf-lcm"
) {
  return mode === "factor-pairs"
    ? FACTOR_DIVISOR_RANGE_PROJECTION_METADATA
    : NO_RANGE_PROJECTION_METADATA;
}

const semantic = {
  main: "#22d3ee",
  change: "#f59e0b",
  result: "#34d399",
  parameter: "#a78bfa",
  attention: "#fb7185",
  reference: "#64748b"
} as const;

const HKPrimaryLabIdContext = createContext<HKPrimaryDedicatedLabId | null>(null);
type PrimarySemanticStatePrimitive = string | number | boolean;
type PrimarySemanticStateValue = PrimarySemanticStatePrimitive | readonly PrimarySemanticStatePrimitive[];
type PrimarySemanticState = Readonly<Record<string, PrimarySemanticStateValue>>;
type PrimaryStateReporter = (labId: HKPrimaryDedicatedLabId, state: PrimarySemanticState) => void;
const HKPrimaryStateReporterContext = createContext<PrimaryStateReporter | null>(null);

const HK_PRIMARY_CANONICAL_STATES = {
  "p1-counting-number-bonds": { total: 12, knownPart: 7 },
  "p1-addition-subtraction": { operation: "add", start: 6, step: 5 },
  "p1-shapes-patterns": { patternRule: "AB", revealedTerms: 6 },
  "p1-measurement-time": { mode: "measure", length: 7, hour: 3, halfHour: false },
  "p2-place-value": { number: 347 },
  "p2-money-time": { mode: "money", price: 32, payment: 50, hour: 9, halfHour: true },
  "p2-length-data": { displayMode: "metres", target: "desk", tool: "metre-ruler", estimateCm: 120, measuredCm: 110, measuredMetres: 1, measuredRemainderCm: 10, pictogramBlueCount: 4 },
  "p3-multiplication-division": { mode: "multiply", groups: 4, itemsPerGroup: 3 },
  "p3-measurement": { model: "measurement", quantityType: "length", baseValue: 250, unit: "small", selectedCategory: "B" },
  "p3-geometry-patterns": { shapeFamily: "quadrilateral", shapeType: "rectangle" },
  "p4-large-numbers": { mode: "factor-pairs", firstNumber: 24, secondNumber: 18, candidateDivisor: 6 },
  "p4-decimals": { decimalValue: 1.37 },
  "p4-angles": { mode: "families", familyShape: "rhombus", composition: "rectangle-diagonal", rightAngleCount: 0 },
  "p4-perimeter-area": { length: 7, width: 4, focus: "both" },
  "p5-fractions-operations": { operation: "add", termCount: "three", firstFraction: "1/2", secondFraction: "1/3", thirdFraction: "1/4" },
  "p5-volume": { length: 4, width: 3, height: 3, visibleLayers: 2 },
  "p5-rates": { totalPrice: 24, itemCount: 4, targetCount: 7 },
  "p5-charts-averages": { selectedCategory: "B", firstSeries: [6, 8, 5, 9], secondSeries: [4, 7, 8, 6] },
  "p6-percentages": { mode: "equivalence", percent: 37, baseAmount: 200, direction: "increase" },
  "p6-ratio-proportion": { mode: "mean-fair-share", value1: 4, value2: 8, value3: 6, value4: 10, seriesCount: 1, seriesBShift: 2 },
  "p6-speed": { speed: 12, time: 6 },
  "p6-pre-secondary-problem-solving": { workflowStep: "represent", budget: 120, count: 3, unitPrice: 24, extraCost: 18 }
} as const satisfies Record<HKPrimaryDedicatedLabId, PrimarySemanticState>;

const localized = (en: string, zh: string, zhHans?: string): LocalizedText => (
  zhHans === undefined ? { en, zh } : { en, zh, zhHans }
);
const mathematicalFormula = (value: string): LocalizedText => ({ en: value, zh: value, zhHans: value });

function useReportPrimaryState(labId: HKPrimaryDedicatedLabId, state: PrimarySemanticState) {
  const reportState = useContext(HKPrimaryStateReporterContext);
  const serializedState = JSON.stringify(state);

  useEffect(() => {
    if (!reportState) return;
    reportState(labId, JSON.parse(serializedState) as PrimarySemanticState);
  }, [labId, reportState, serializedState]);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gcd(first: number, second: number) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b > 0) [a, b] = [b, a % b];
  return a || 1;
}

function quotientDisplay(numerator: number, denominator: number, prefix = "") {
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  if (reducedDenominator === 1) return `${prefix}${reducedNumerator}`;

  let terminatingDenominator = reducedDenominator;
  while (terminatingDenominator % 2 === 0) terminatingDenominator /= 2;
  while (terminatingDenominator % 5 === 0) terminatingDenominator /= 5;
  const relation = terminatingDenominator === 1 ? "=" : "≈";
  const digits = terminatingDenominator === 1 ? 4 : 2;
  return `${prefix}${reducedNumerator}/${reducedDenominator} ${relation} ${prefix}${formatDecimal(numerator / denominator, digits)}`;
}

function formatDecimal(value: number, digits = 2) {
  return Number(value.toFixed(digits)).toString();
}

function ModelShell({ labId, state, objective, formula, summary, surface, controls, controlFooterAction }: ModelShellProps) {
  const { t } = useSettings();
  const formulaPanHintId = useId();
  useReportPrimaryState(labId, state);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">{surface}</div>
      <aside className="min-w-0 space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/80 sm:p-5">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            {t(localized("Learning goal", "學習目標", "学习目标"))}
          </p>
          <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{t(objective)}</p>
        </div>
        <div className="min-w-0">
          <p id={formulaPanHintId} data-viz-formula-pan-hint className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:hidden">
            {t(localized("Swipe or use the arrow keys to read the whole formula.", "左右滑動或使用方向鍵閱讀完整算式。", "左右滑动或使用方向键阅读完整算式。"))}
          </p>
          <div
            data-hk-viz-formula={labId}
            data-viz-formula-scroll-container
            aria-describedby={formulaPanHintId}
            tabIndex={0}
            className="focus-ring overflow-x-auto rounded-2xl border border-cyan-200/70 bg-cyan-50 px-3 py-3 font-mono text-sm font-black text-cyan-950 dark:border-cyan-400/20 dark:bg-cyan-950/40 dark:text-cyan-100"
          >
            {t(formula)}
          </div>
        </div>
        <div className="space-y-3">{controls}</div>
        <div
          data-hk-viz-summary={labId}
          data-viz-state-summary
          aria-live="polite"
          aria-atomic="true"
          className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-3 py-3 text-sm font-bold leading-6 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-100"
        >
          {summary}
        </div>
        {controlFooterAction ? <div data-viz-lesson-action-slot>{controlFooterAction}</div> : null}
      </aside>
    </div>
  );
}

function SvgFrame({ label, children, height = 360 }: { label: string; children: ReactNode; height?: number }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const panHintId = useId();

  return (
    <div className={theme.paddedSurfaceClassName}>
      <p
        id={panHintId}
        data-viz-pan-hint
        className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300"
      >
        {t(localized("Swipe horizontally or use the arrow keys to pan the model.", "左右滑動或使用方向鍵平移模型。", "左右滑动或使用方向键平移模型。"))}
      </p>
      <div
        data-viz-scroll-container
        aria-label={label}
        aria-describedby={panHintId}
        tabIndex={0}
        className="focus-ring max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl"
      >
        <svg
          data-viz-surface=""
          role="img"
          aria-label={label}
          viewBox={`0 0 640 ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto min-h-[360px] w-full min-w-[640px] overflow-visible"
        >
          <rect width="640" height={height} fill={theme.svgBackground} />
          <rect x="18" y="18" width="604" height={height - 36} rx="24" fill={theme.panelFill} stroke={theme.panelStroke} strokeWidth="2" />
          {children}
        </svg>
      </div>
    </div>
  );
}

function RangeControl({
  controlId,
  label,
  value,
  min,
  max,
  step = 1,
  output,
  rangeAffects,
  rangeProjection,
  rangeProjectionReason,
  onChange
}: {
  controlId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  output?: string;
  onChange: (value: number) => void;
} & RangeProjectionMetadata) {
  return (
    <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words">{label}</span>
        <output className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-900 dark:bg-white/10 dark:text-white">
          {output ?? value}
        </output>
      </span>
      <input
        data-viz-control="range"
        data-viz-parameter={controlId}
        data-viz-range-affects={rangeAffects}
        data-viz-range-projection={rangeProjection}
        data-viz-range-projection-reason={rangeProjectionReason}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="focus-ring min-h-11 w-full cursor-pointer accent-cyan-500"
      />
    </label>
  );
}

function ModeButtons<T extends string>({
  groupId,
  dependsOnGroupId,
  label,
  value,
  options,
  onChange
}: {
  groupId: string;
  dependsOnGroupId?: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} data-viz-mode-group={groupId} data-viz-mode-depends-on={dependsOnGroupId} className="grid grid-cols-2 gap-2">
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-viz-mode-button
            data-viz-mode-group={groupId}
            data-viz-mode-depends-on={dependsOnGroupId}
            data-viz-mode-index={index}
            data-viz-mode={option.value}
            data-viz-mode-active={String(active)}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-black transition-colors motion-reduce:transition-none ${
              active
                ? "border-cyan-400 bg-cyan-100 text-cyan-950 dark:bg-cyan-400/20 dark:text-cyan-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ResetButton({ label, onReset }: { label: string; onReset: () => void }) {
  const topicId = useContext(HKPrimaryLabIdContext);

  return (
    <button
      type="button"
      data-viz-reset-model
      data-viz-reset-module-id="configured-visualization-lab"
      data-viz-reset-topic-id={topicId ?? undefined}
      onClick={onReset}
      className="focus-ring min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800 transition-colors hover:border-cyan-400 hover:bg-cyan-50 motion-reduce:transition-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-cyan-300 dark:hover:bg-cyan-400/10"
    >
      {label}
    </button>
  );
}

function svgTextColor(mode: "day" | "night") {
  return mode === "day" ? "#0f172a" : "#f8fafc";
}

function CountingNumberBondsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [total, setTotal] = useState(12);
  const [knownPart, setKnownPart] = useState(7);
  const known = clamp(knownPart, 0, total);
  const missing = total - known;
  const counters = Array.from({ length: 20 }, (_, index) => index);

  function reset() {
    setTotal(12);
    setKnownPart(7);
  }

  return (
    <ModelShell
      labId="p1-counting-number-bonds"
      state={{ total, knownPart: known }}
      objective={localized("Build one whole from two parts and keep the total unchanged.", "由兩個部分組成一個整體，並保持總數不變。", "由两个部分组成一个整体，并保持总数不变。")}
      formula={mathematicalFormula(`${known} + ${missing} = ${total}`)}
      summary={t(localized(`${known} known and ${missing} missing make ${total}.`, `${known} 個已知部分和 ${missing} 個未知部分合成 ${total}。`, `${known} 个已知部分和 ${missing} 个未知部分合成 ${total}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Number bond counters and part-whole diagram", "數的組合計數物和部分—整體圖", "数的组合计数物和部分—整体图"))}>
          <g data-viz-mark data-viz-name="counter-set" data-viz-total={total} transform="translate(76 66)">
            {counters.map((index) => {
              const filled = index < total;
              const part = index < known ? "known" : "missing";
              return (
                <circle
                  key={index}
                  data-viz-mark
                  data-viz-name="counter"
                  data-viz-part={filled ? part : "empty"}
                  cx={(index % 10) * 48}
                  cy={Math.floor(index / 10) * 48}
                  r="16"
                  fill={!filled ? theme.emptyFill : part === "known" ? semantic.main : semantic.change}
                  stroke={filled ? theme.pointStroke : theme.panelStroke}
                  strokeWidth="3"
                  strokeDasharray={filled ? undefined : "5 4"}
                />
              );
            })}
          </g>
          <path data-viz-mark data-viz-name="known-connector" d="M260 238 L214 276" fill="none" stroke={semantic.main} strokeWidth="7" strokeLinecap="round" />
          <path data-viz-mark data-viz-name="missing-connector" d="M380 238 L426 276" fill="none" stroke={semantic.change} strokeWidth="7" strokeLinecap="round" />
          <g data-viz-mark data-viz-name="whole-node">
            <g
              data-viz-overlap-ok="label-inside-own-whole-node"
              data-viz-overlap-reason="The total label is intentionally centered inside its own whole node."
            >
              <circle data-viz-mark data-viz-overlap-member="mark" cx="320" cy="220" r="42" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-overlap-member="label" x="320" y="232" textAnchor="middle" fill="#052e16" fontSize="32" fontWeight="900">{total}</text>
            </g>
          </g>
          <g data-viz-mark data-viz-name="known-part-node">
            <g
              data-viz-overlap-ok="label-inside-own-known-part-node"
              data-viz-overlap-reason="The known-part label is intentionally centered inside its own part node."
            >
              <circle data-viz-mark data-viz-overlap-member="mark" cx="170" cy="300" r="38" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-overlap-member="label" x="170" y="311" textAnchor="middle" fill="#082f49" fontSize="28" fontWeight="900">{known}</text>
            </g>
          </g>
          <g data-viz-mark data-viz-name="missing-part-node">
            <g
              data-viz-overlap-ok="label-inside-own-missing-part-node"
              data-viz-overlap-reason="The missing-part label is intentionally centered inside its own part node."
            >
              <circle data-viz-mark data-viz-overlap-member="mark" cx="470" cy="300" r="38" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-overlap-member="label" x="470" y="311" textAnchor="middle" fill="#451a03" fontSize="28" fontWeight="900">{missing}</text>
            </g>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl
            controlId="total"
            label={t(localized("Whole (total)", "整體（總數）", "整体（总数）"))}
            value={total}
            min={0}
            max={20}
            rangeAffects="knownPart"
            rangeProjection="clamp-and-visibility"
            rangeProjectionReason="known-part-must-not-exceed-whole"
            onChange={(value) => {
              setTotal(value);
              setKnownPart((current) => Math.min(current, value));
            }}
          />
          {total > 0 ? (
            <RangeControl
              controlId="knownPart"
              label={t(localized("Known part", "已知部分", "已知部分"))}
              value={known}
              min={0}
              max={total}
              onChange={setKnownPart}
            />
          ) : (
            <div data-viz-fixed-parameter="knownPart" data-viz-fixed-parameter-value="0" className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <span>{t(localized("Known part", "已知部分", "已知部分"))}</span>
              <output className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-slate-900 dark:bg-white/10 dark:text-white">0</output>
            </div>
          )}
          <ResetButton label={t(localized("Reset number bond", "重設數的組合", "重设数的组合"))} onReset={reset} />
        </>
      }
    />
  );
}

type AddSubtractMode = "add" | "subtract";

function AdditionSubtractionModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [operation, setOperation] = useState<AddSubtractMode>("add");
  const [start, setStart] = useState(6);
  const [rawStep, setRawStep] = useState(5);
  const maximumStep = operation === "add" ? 20 - start : start;
  const step = clamp(rawStep, 0, maximumStep);
  const end = operation === "add" ? start + step : start - step;
  const startX = 70 + start * 25;
  const endX = 70 + end * 25;

  function chooseOperation(next: AddSubtractMode) {
    setOperation(next);
    setRawStep((current) => Math.min(current, next === "add" ? 20 - start : start));
  }

  function reset() {
    setOperation("add");
    setStart(6);
    setRawStep(5);
  }

  return (
    <ModelShell
      labId="p1-addition-subtraction"
      state={{ operation, start, step }}
      objective={localized("Walk forward to add and backward to subtract on the same number line.", "在同一條數線上向前做加法，向後做減法。", "在同一条数线上向前做加法，向后做减法。")}
      formula={mathematicalFormula(`${start} ${operation === "add" ? "+" : "−"} ${step} = ${end}`)}
      summary={t(localized(`Start at ${start}, move ${step} places ${operation === "add" ? "forward" : "backward"}, and land on ${end}.`, `由 ${start} 開始，向${operation === "add" ? "前" : "後"}走 ${step} 格，到達 ${end}。`, `由 ${start} 开始，向${operation === "add" ? "前" : "后"}走 ${step} 格，到达 ${end}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Addition and subtraction number-line walk", "加減法數線步行", "加减法数线步行"))}>
          <line data-viz-mark data-viz-name="number-line" x1="70" x2="570" y1="245" y2="245" stroke={theme.axisStrong} strokeWidth="5" strokeLinecap="round" />
          {Array.from({ length: 21 }, (_, value) => {
            const x = 70 + value * 25;
            return (
              <g key={value} data-viz-mark data-viz-name="number-line-tick" data-viz-value={value}>
                <line x1={x} x2={x} y1="233" y2="258" stroke={theme.axis} strokeWidth={value % 5 === 0 ? 4 : 2} />
                {value % 2 === 0 ? <text x={x} y="284" textAnchor="middle" fill={theme.tickText} fontSize="13" fontWeight="700">{value}</text> : null}
              </g>
            );
          })}
          {step > 0 ? (
            <>
              <path
                data-viz-mark
                data-viz-name="directed-jump"
                data-viz-operation={operation}
                data-viz-start={start}
                data-viz-step={step}
                data-viz-end={end}
                d={`M${startX} 220 Q${(startX + endX) / 2} ${120 - Math.abs(endX - startX) * 0.08} ${endX} 220`}
                fill="none"
                stroke={operation === "add" ? semantic.main : semantic.change}
                strokeWidth="9"
                strokeLinecap="round"
              />
              <polygon
                data-viz-mark
                data-viz-name="jump-arrowhead"
                points={operation === "add" ? `${endX},220 ${endX - 18},208 ${endX - 15},231` : `${endX},220 ${endX + 18},208 ${endX + 15},231`}
                fill={operation === "add" ? semantic.main : semantic.change}
              />
              <circle data-viz-mark data-viz-name="start-point" cx={startX} cy="245" r="10" fill={semantic.parameter} stroke={theme.pointStroke} strokeWidth="3" />
              <circle data-viz-mark data-viz-name="end-point" cx={endX} cy="245" r="12" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
            </>
          ) : (
            <circle data-viz-mark data-viz-name="stationary-point" data-viz-value={start} cx={startX} cy="245" r="15" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
          )}
          <text x={startX} y="326" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{t(localized("START", "開始", "开始"))}</text>
          <text x={endX} y="76" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{t(localized("END", "終點", "终点"))}</text>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons
            groupId="operation"
            label={t(localized("Operation", "運算", "运算"))}
            value={operation}
            options={[
              { value: "add", label: t(localized("Add forward", "向前加", "向前加")) },
              { value: "subtract", label: t(localized("Subtract backward", "向後減", "向后减")) }
            ]}
            onChange={chooseOperation}
          />
          <RangeControl controlId="start" label={t(localized("Starting number", "起始數", "起始数"))} value={start} min={0} max={20} rangeAffects="step" rangeProjection="clamp-and-visibility" rangeProjectionReason="step-must-remain-on-number-line" onChange={(value) => { setStart(value); setRawStep((current) => Math.min(current, operation === "add" ? 20 - value : value)); }} />
          {maximumStep > 0 ? (
            <RangeControl controlId="step" label={t(localized("Number of steps", "步數", "步数"))} value={step} min={0} max={maximumStep} onChange={setRawStep} />
          ) : (
            <div data-viz-fixed-parameter="step" data-viz-fixed-parameter-value="0" className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <span>{t(localized("Number of steps", "步數", "步数"))}</span>
              <output className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-slate-900 dark:bg-white/10 dark:text-white">0</output>
            </div>
          )}
          <ResetButton label={t(localized("Reset number-line walk", "重設數線步行", "重设数线步行"))} onReset={reset} />
        </>
      }
    />
  );
}

type PatternRule = "AB" | "ABC" | "AAB";
type PatternShapeKind = "circle" | "square" | "triangle";

function PatternShape({ kind, x, y, size = 22, color, name }: { kind: PatternShapeKind; x: number; y: number; size?: number; color: string; name: string }) {
  if (kind === "circle") return <circle data-viz-mark data-viz-name={name} data-viz-shape={kind} cx={x} cy={y} r={size} fill={color} stroke="#0f172a" strokeWidth="3" />;
  if (kind === "square") return <rect data-viz-mark data-viz-name={name} data-viz-shape={kind} x={x - size} y={y - size} width={size * 2} height={size * 2} rx="5" fill={color} stroke="#0f172a" strokeWidth="3" />;
  return <polygon data-viz-mark data-viz-name={name} data-viz-shape={kind} points={`${x},${y - size - 3} ${x - size - 3},${y + size} ${x + size + 3},${y + size}`} fill={color} stroke="#0f172a" strokeWidth="3" />;
}

function ShapesPatternsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [rule, setRule] = useState<PatternRule>("AB");
  const [terms, setTerms] = useState(6);
  const units: Record<PatternRule, readonly PatternShapeKind[]> = {
    AB: ["circle", "square"],
    ABC: ["circle", "square", "triangle"],
    AAB: ["circle", "circle", "square"]
  };
  const colors: Record<PatternShapeKind, string> = { circle: semantic.main, square: semantic.change, triangle: semantic.result };
  const unit = units[rule];
  const next = unit[terms % unit.length];
  const nextLabel = localized(
    next === "circle" ? "circle" : next === "square" ? "square" : "triangle",
    next === "circle" ? "圓形" : next === "square" ? "正方形" : "三角形",
    next === "circle" ? "圆形" : next === "square" ? "正方形" : "三角形"
  );

  function reset() {
    setRule("AB");
    setTerms(6);
  }

  return (
    <ModelShell
      labId="p1-shapes-patterns"
      state={{ patternRule: rule, revealedTerms: terms }}
      objective={localized("Find the shortest repeating shape unit and use it to predict what comes next.", "找出最短的重複圖形單位，並用它預測下一項。", "找出最短的重复图形单位，并用它预测下一项。")}
      formula={localized(`${rule} → ${nextLabel.en}`, `${rule} → ${nextLabel.zh}`, `${rule} → ${nextLabel.zhHans ?? nextLabel.zh}`)}
      summary={t(localized(`The repeat unit is ${rule}. After ${terms} shown shapes, the next shape is a ${next}.`, `重複單位是 ${rule}。顯示 ${terms} 個圖形後，下一個是${next === "circle" ? "圓形" : next === "square" ? "正方形" : "三角形"}。`, `重复单位是 ${rule}。显示 ${terms} 个图形后，下一个是${next === "circle" ? "圆形" : next === "square" ? "正方形" : "三角形"}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Repeating shape sequence and next-shape target", "重複圖形序列和下一項目標", "重复图形序列和下一项目标"))}>
          <rect data-viz-mark data-viz-name="repeat-unit-box" x="54" y="76" width={unit.length * 62 + 24} height="92" rx="18" fill={theme.softFill} stroke={semantic.parameter} strokeWidth="4" strokeDasharray="10 6" />
          <path data-viz-mark data-viz-name="repeat-bracket" d={`M66 185 V202 H${66 + unit.length * 62} V185`} fill="none" stroke={semantic.parameter} strokeWidth="4" />
          <text x={66 + (unit.length * 62) / 2} y="228" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{rule}</text>
          <g data-viz-mark data-viz-name="shape-sequence" data-viz-rule={rule} data-viz-terms={terms}>
            {Array.from({ length: terms }, (_, index) => {
              const kind = unit[index % unit.length];
              return <PatternShape key={index} kind={kind} x={92 + index * 62} y={122} color={colors[kind]} name="pattern-shape" />;
            })}
          </g>
          <line data-viz-mark data-viz-name="prediction-arrow" x1="120" x2="455" y1="286" y2="286" stroke={theme.axisStrong} strokeWidth="6" strokeLinecap="round" />
          <polygon data-viz-mark data-viz-name="prediction-arrowhead" points="455,286 433,274 433,298" fill={theme.axisStrong} />
          <g data-viz-mark data-viz-name="next-shape-target">
            <circle cx="520" cy="286" r="46" fill={theme.emptyFill} stroke={semantic.result} strokeWidth="4" strokeDasharray="8 6" />
            <PatternShape kind={next} x={520} y={286} color={colors[next]} name="predicted-shape" />
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons
            groupId="pattern-rule"
            label={t(localized("Repeating rule", "重複規律", "重复规律"))}
            value={rule}
            options={[
              { value: "AB", label: "AB" },
              { value: "ABC", label: "ABC" },
              { value: "AAB", label: "AAB" }
            ]}
            onChange={setRule}
          />
          <RangeControl controlId="revealedTerms" label={t(localized("Shapes already shown", "已顯示圖形數目", "已显示图形数目"))} value={terms} min={3} max={8} onChange={setTerms} />
          <ResetButton label={t(localized("Reset pattern", "重設規律", "重设规律"))} onReset={reset} />
        </>
      }
    />
  );
}

type MeasurementTimeMode = "measure" | "time";

function MeasurementTimeModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<MeasurementTimeMode>("measure");
  const [length, setLength] = useState(7);
  const [hour, setHour] = useState(3);
  const [halfHour, setHalfHour] = useState(false);
  const minute = halfHour ? 30 : 0;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const handEnd = (angle: number, radius: number) => ({
    x: 320 + Math.sin((angle * Math.PI) / 180) * radius,
    y: 190 - Math.cos((angle * Math.PI) / 180) * radius
  });
  const hourEnd = handEnd(hourAngle, 55);
  const minuteEnd = handEnd(minuteAngle, 80);

  function reset() {
    setMode("measure");
    setLength(7);
    setHour(3);
    setHalfHour(false);
  }

  return (
    <ModelShell
      labId="p1-measurement-time"
      state={{ mode, length, hour, halfHour }}
      objective={localized("Count equal length units and read whole or half hours on a clock.", "數相等的長度單位，並閱讀整點或半點時間。", "数相等的长度单位，并阅读整点或半点时间。")}
      formula={mode === "measure"
        ? localized(`${length} × 1 unit = ${length} units`, `${length} × 1 個單位 = ${length} 個單位`, `${length} × 1 个单位 = ${length} 个单位`)
        : mathematicalFormula(`${hour}:${minute === 0 ? "00" : minute}`)}
      summary={mode === "measure"
        ? t(localized(`The cyan strip is ${length} equal units long; the amber reference is 5 units.`, `青色長條長 ${length} 個相等單位；琥珀色參考長條長 5 個單位。`, `青色长条长 ${length} 个相等单位；琥珀色参考长条长 5 个单位。`))
        : t(localized(`The clock shows ${hour}:${minute === 0 ? "00" : minute}.`, `時鐘顯示 ${hour}:${minute === 0 ? "00" : minute}。`, `时钟显示 ${hour}:${minute === 0 ? "00" : minute}。`))}
      controlFooterAction={controlFooterAction}
      surface={mode === "measure" ? (
        <SvgFrame label={t(localized("Equal-unit ruler and two compared lengths", "相等單位直尺和兩個比較長度", "相等单位直尺和两个比较长度"))}>
          <line data-viz-mark data-viz-name="unit-ruler" x1="74" x2="566" y1="278" y2="278" stroke={theme.axisStrong} strokeWidth="5" />
          {Array.from({ length: 13 }, (_, index) => {
            const x = 74 + index * 41;
            return <g key={index} data-viz-mark data-viz-name="unit-tick"><line x1={x} x2={x} y1="264" y2="294" stroke={theme.axis} strokeWidth="3" /><text x={x} y="320" textAnchor="middle" fill={theme.tickText} fontSize="14">{index}</text></g>;
          })}
          <g data-viz-mark data-viz-name="length-bar" data-viz-units={length}>
            <g
              data-viz-overlap-ok="label-inside-own-length-bar"
              data-viz-overlap-reason="The length label is intentionally centered inside its own measured-length bar."
            >
              <rect data-viz-mark data-viz-overlap-member="mark" x="74" y="96" width={length * 41} height="54" rx="14" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-overlap-member="label" x={74 + (length * 41) / 2} y="130" textAnchor="middle" fill="#082f49" fontSize="20" fontWeight="900">{length}</text>
            </g>
          </g>
          <g data-viz-mark data-viz-name="reference-bar" data-viz-units="5">
            <g
              data-viz-overlap-ok="label-inside-own-reference-bar"
              data-viz-overlap-reason="The reference label is intentionally centered inside its own comparison bar."
            >
              <rect data-viz-mark data-viz-overlap-member="mark" x="74" y="178" width={5 * 41} height="54" rx="14" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-overlap-member="label" x={74 + (5 * 41) / 2} y="212" textAnchor="middle" fill="#451a03" fontSize="20" fontWeight="900">5</text>
            </g>
          </g>
        </SvgFrame>
      ) : (
        <SvgFrame label={t(localized("Analogue clock showing a whole or half hour", "顯示整點或半點的指針時鐘", "显示整点或半点的指针时钟"))}>
          <g data-viz-mark data-viz-name="clock-face" data-viz-hour={hour} data-viz-minute={minute} data-viz-half-hour={String(halfHour)}>
            <circle cx="320" cy="190" r="132" fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="5" />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index * Math.PI) / 6;
              const x1 = 320 + Math.sin(angle) * 112;
              const y1 = 190 - Math.cos(angle) * 112;
              const x2 = 320 + Math.sin(angle) * 126;
              const y2 = 190 - Math.cos(angle) * 126;
              return <line key={index} data-viz-mark data-viz-name="clock-tick" x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.axisStrong} strokeWidth={index % 3 === 0 ? 5 : 3} />;
            })}
            {[12, 3, 6, 9].map((value, index) => {
              const positions = [{ x: 320, y: 100 }, { x: 420, y: 198 }, { x: 320, y: 292 }, { x: 220, y: 198 }];
              return <text key={value} x={positions[index].x} y={positions[index].y} textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="20" fontWeight="900">{value}</text>;
            })}
          </g>
          <line data-viz-mark data-viz-name="hour-hand" data-viz-hour={hour} data-viz-minute={minute} x1="320" y1="190" x2={hourEnd.x} y2={hourEnd.y} stroke={semantic.main} strokeWidth="13" strokeLinecap="round" />
          <line data-viz-mark data-viz-name="minute-hand" data-viz-hour={hour} data-viz-minute={minute} x1="320" y1="190" x2={minuteEnd.x} y2={minuteEnd.y} stroke={semantic.change} strokeWidth="8" strokeLinecap="round" />
          <circle data-viz-mark data-viz-name="clock-centre" cx="320" cy="190" r="11" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
        </SvgFrame>
      )}
      controls={
        <>
          <ModeButtons
            groupId="model"
            label={t(localized("Model", "模型", "模型"))}
            value={mode}
            options={[
              { value: "measure", label: t(localized("Measure length", "量度長度", "测量长度")) },
              { value: "time", label: t(localized("Read time", "閱讀時間", "阅读时间")) }
            ]}
            onChange={setMode}
          />
          {mode === "measure" ? (
            <RangeControl controlId="length" label={t(localized("Length in equal units", "相等單位的長度", "相等单位的长度"))} value={length} min={1} max={12} onChange={setLength} />
          ) : (
            <>
              <RangeControl controlId="hour" label={t(localized("Hour", "小時", "小时"))} value={hour} min={1} max={12} onChange={setHour} />
              <ModeButtons
                groupId="minutes"
                label={t(localized("Minutes", "分鐘", "分钟"))}
                value={halfHour ? "half" : "whole"}
                options={[
                  { value: "whole", label: t(localized("Whole hour", "整點", "整点")) },
                  { value: "half", label: t(localized("Half hour", "半點", "半点")) }
                ]}
                onChange={(value) => setHalfHour(value === "half")}
              />
            </>
          )}
          <ResetButton label={t(localized("Reset measurement and time", "重設度量與時間", "重设测量与时间"))} onReset={reset} />
        </>
      }
    />
  );
}

function PlaceValueModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [number, setNumber] = useState(347);
  const isThousand = number === 1000;
  const hundreds = isThousand ? 0 : Math.floor(number / 100);
  const tens = isThousand ? 0 : Math.floor((number % 100) / 10);
  const ones = isThousand ? 0 : number % 10;
  const columns = [
    { key: "hundreds", value: hundreds, color: semantic.parameter, x: 80 },
    { key: "tens", value: tens, color: semantic.main, x: 250 },
    { key: "ones", value: ones, color: semantic.change, x: 420 }
  ] as const;

  return (
    <ModelShell
      labId="p2-place-value"
      state={{ number }}
      objective={localized("Build any number to 1000 from hundreds, tens, and ones, then regroup ten hundreds as one thousand.", "用百、十、個建立一千以內的數，並把十個百重組成一個千。", "用百、十、个建立一千以内的数，并把十个百重组为一个千。")}
      formula={mathematicalFormula(isThousand ? "10 × 100 = 1000" : `${hundreds} × 100 + ${tens} × 10 + ${ones} = ${number}`)}
      summary={isThousand
        ? t(localized("Ten hundreds regroup as one thousand.", "十個百重組成一個千。", "十个百重组为一个千。"))
        : t(localized(`${number} has ${hundreds} hundreds, ${tens} tens, and ${ones} ones.`, `${number} 有 ${hundreds} 個百、${tens} 個十和 ${ones} 個一。`, `${number} 有 ${hundreds} 个百、${tens} 个十和 ${ones} 个一。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Base-ten blocks and hundreds-tens-ones table", "十進制積木和百、十、個數位表", "十进制积木和百、十、个数位表"))}>
          {isThousand ? (
            <g data-viz-name="thousand-regrouping" data-viz-value="1000">
              <g data-viz-mark data-viz-name="regroup-hundreds" data-viz-count="10">
                {Array.from({ length: 10 }, (_, index) => (
                  <rect
                    key={index}
                    data-viz-mark
                    data-viz-name="hundred-flat"
                    x={62 + (index % 5) * 32}
                    y={94 + Math.floor(index / 5) * 46}
                    width="26"
                    height="32"
                    rx="4"
                    fill={semantic.parameter}
                    stroke={theme.pointStroke}
                    strokeWidth="2"
                  />
                ))}
                <text x="127" y="212" textAnchor="middle" fill={theme.text} fontSize="17" fontWeight="900">10 × 100</text>
              </g>
              <path data-viz-mark data-viz-name="regroup-arrow" d="M225 150 H306" stroke={semantic.change} strokeWidth="7" strokeLinecap="round" />
              <polygon points="306,150 284,136 284,164" fill={semantic.change} />
              <g data-viz-name="thousand-cube" data-viz-value="1000">
                <rect x="350" y="68" width="190" height="220" rx="20" fill={semantic.result} />
                <rect data-viz-mark data-viz-name="thousand-cube-boundary" x="350" y="68" width="190" height="220" rx="20" fill="none" stroke={theme.pointStroke} strokeWidth="5" />
                {Array.from({ length: 9 }, (_, index) => <line key={`v-${index}`} x1={369 + index * 17} x2={369 + index * 17} y1="78" y2="278" stroke="rgba(15,23,42,.22)" strokeWidth="2" />)}
                {Array.from({ length: 9 }, (_, index) => <line key={`h-${index}`} x1="360" x2="530" y1={90 + index * 20} y2={90 + index * 20} stroke="rgba(15,23,42,.22)" strokeWidth="2" />)}
                <g
                  data-viz-overlap-ok="label-inside-own-thousand-cube"
                  data-viz-overlap-reason="The thousand label is intentionally centered inside its own opaque regrouping label card."
                >
                  <rect data-viz-mark data-viz-overlap-member="mark" x="390" y="158" width="110" height="58" rx="16" fill={theme.labelFill} stroke={semantic.result} strokeWidth="3" />
                  <text data-viz-overlap-member="label" x="445" y="197" textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="32" fontWeight="900">1000</text>
                </g>
              </g>
            </g>
          ) : (
            <g data-viz-mark data-viz-name="place-value-table" data-viz-number={number}>
              {columns.map((column) => (
                <g key={column.key} data-viz-mark data-viz-name={`${column.key}-column`} data-viz-value={column.value}>
                  <g
                    data-viz-overlap-ok={`label-inside-own-${column.key}-column`}
                    data-viz-overlap-reason="The place heading is intentionally shown inside its own place-value column."
                  >
                    <rect data-viz-mark data-viz-overlap-member="mark" x={column.x} y="70" width="140" height="228" rx="20" fill={theme.softFill} stroke={column.color} strokeWidth="3" />
                    <text data-viz-overlap-member="label" x={column.x + 70} y="102" textAnchor="middle" fill={column.color} fontSize="14" fontWeight="900">{column.key === "hundreds" ? "100" : column.key === "tens" ? "10" : "1"}</text>
                  </g>
                  {Array.from({ length: column.value }, (_, index) => {
                    const row = Math.floor(index / 3);
                    const col = index % 3;
                    const x = column.x + 26 + col * 40;
                    const y = 126 + row * 44;
                    return column.key === "hundreds" ? (
                      <rect key={index} data-viz-mark data-viz-name="hundred-flat" x={x - 13} y={y - 13} width="26" height="26" rx="3" fill={column.color} stroke={theme.pointStroke} strokeWidth="2" />
                    ) : column.key === "tens" ? (
                      <rect key={index} data-viz-mark data-viz-name="ten-rod" x={x - 5} y={y - 16} width="10" height="32" rx="3" fill={column.color} stroke={theme.pointStroke} strokeWidth="2" />
                    ) : (
                      <circle key={index} data-viz-mark data-viz-name="one-unit" cx={x} cy={y} r="8" fill={column.color} stroke={theme.pointStroke} strokeWidth="2" />
                    );
                  })}
                  <g
                    data-viz-name="place-digit"
                    data-viz-digit={column.value}
                    data-viz-overlap-ok={`label-inside-own-${column.key}-digit-node`}
                    data-viz-overlap-reason="The digit is intentionally centered inside its own place-value node."
                  >
                    <circle data-viz-mark data-viz-overlap-member="mark" cx={column.x + 70} cy="318" r="20" fill={column.color} stroke={theme.pointStroke} strokeWidth="3" />
                    <text data-viz-overlap-member="label" x={column.x + 70} y="326" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900">{column.value}</text>
                  </g>
                </g>
              ))}
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl controlId="number" label={t(localized("Number from 0 to 1000", "0 至 1000 的數", "0 至 1000 的数"))} value={number} min={0} max={1000} onChange={setNumber} />
          <ResetButton label={t(localized("Reset place-value model", "重設位值模型", "重设数位模型"))} onReset={() => setNumber(347)} />
        </>
      }
    />
  );
}

type MoneyTimeMode = "money" | "time";

function MoneyTimeModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<MoneyTimeMode>("money");
  const [price, setPrice] = useState(32);
  const [payment, setPayment] = useState(50);
  const [hour, setHour] = useState(9);
  const [halfHour, setHalfHour] = useState(true);
  const safePayment = Math.max(payment, price);
  const change = safePayment - price;
  const paymentBarWidth = 488;
  const priceSegmentWidth = (paymentBarWidth * price) / safePayment;
  const changeSegmentWidth = (paymentBarWidth * change) / safePayment;
  const minute = halfHour ? 30 : 0;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const pointOnClock = (angle: number, radius: number) => ({ x: 320 + Math.sin((angle * Math.PI) / 180) * radius, y: 188 - Math.cos((angle * Math.PI) / 180) * radius });
  const hourPoint = pointOnClock(hourAngle, 68);
  const minutePoint = pointOnClock(minuteAngle, 102);

  function reset() {
    setMode("money");
    setPrice(32);
    setPayment(50);
    setHour(9);
    setHalfHour(true);
  }

  return (
    <ModelShell
      labId="p2-money-time"
      state={{ mode, price, payment: safePayment, hour, halfHour }}
      objective={localized("Find change with Hong Kong dollars and read a whole or half-hour time.", "用港幣找續，並閱讀整點或半點時間。", "用港币找零，并阅读整点或半点时间。")}
      formula={mathematicalFormula(mode === "money" ? `HK$${safePayment} − HK$${price} = HK$${change}` : `${hour}:${minute === 0 ? "00" : minute}`)}
      summary={mode === "money"
        ? t(localized(`Pay HK$${safePayment} for an item costing HK$${price}; the change is HK$${change}.`, `用 HK$${safePayment} 購買價值 HK$${price} 的物品，找續 HK$${change}。`, `用 HK$${safePayment} 购买价值 HK$${price} 的物品，找零 HK$${change}。`))
        : t(localized(`The clock shows ${hour}:${minute === 0 ? "00" : minute}.`, `時鐘顯示 ${hour}:${minute === 0 ? "00" : minute}。`, `时钟显示 ${hour}:${minute === 0 ? "00" : minute}。`))}
      controlFooterAction={controlFooterAction}
      surface={mode === "money" ? (
        <SvgFrame label={t(localized("Hong Kong dollar payment and change bar", "港幣付款和找續長條", "港币付款和找零长条"))}>
          <g data-viz-mark data-viz-name="hk-dollar-notes">
            <g
              data-viz-overlap-ok="label-inside-own-hk-dollar-note"
              data-viz-overlap-reason="The currency label is intentionally centered inside its own Hong Kong dollar note."
            >
              <rect data-viz-mark data-viz-overlap-member="mark" x="86" y="72" width="176" height="84" rx="12" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="3" opacity="0.92" />
              <text data-viz-overlap-member="label" x="174" y="124" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900">HK$</text>
            </g>
            {[1, 2].map((index) => (
              <rect key={index} data-viz-mark x={86 + index * 150} y={72 + index * 12} width="176" height="84" rx="12" fill={index === 1 ? semantic.parameter : semantic.result} stroke={theme.pointStroke} strokeWidth="3" opacity="0.92" />
            ))}
          </g>
          <rect data-viz-name="payment-bar" data-viz-payment={safePayment} x="76" y="228" width={paymentBarWidth} height="70" rx="16" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="3" />
          <g
            data-viz-overlap-ok={priceSegmentWidth >= 72 ? "label-inside-own-price-segment" : undefined}
            data-viz-overlap-reason={priceSegmentWidth >= 72 ? "The price label is intentionally centered inside its own payment segment." : undefined}
          >
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="price-segment" data-viz-price={price} x="76" y="228" width={priceSegmentWidth} height="70" rx="16" fill={semantic.main} />
            {priceSegmentWidth >= 72 ? <text data-viz-overlap-member="label" x={76 + priceSegmentWidth / 2} y="270" textAnchor="middle" fill="#082f49" fontSize="17" fontWeight="900">HK${price}</text> : null}
          </g>
          {change > 0 ? (
            <g
              data-viz-overlap-ok={changeSegmentWidth >= 82 ? "label-inside-own-change-segment" : undefined}
              data-viz-overlap-reason={changeSegmentWidth >= 82 ? "The change label is intentionally centered inside its own payment segment." : undefined}
            >
              <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="change-segment" data-viz-change={change} x={76 + priceSegmentWidth} y="228" width={changeSegmentWidth} height="70" rx="16" fill={semantic.change} />
              {changeSegmentWidth >= 82 ? <text data-viz-overlap-member="label" x={76 + priceSegmentWidth + changeSegmentWidth / 2} y="270" textAnchor="middle" fill="#451a03" fontSize="17" fontWeight="900">+HK${change}</text> : null}
            </g>
          ) : null}
        </SvgFrame>
      ) : (
        <SvgFrame label={t(localized("Clock for whole and half-hour time", "整點和半點時鐘", "整点和半点时钟"))}>
          <circle data-viz-mark data-viz-name="clock-face" data-viz-hour={hour} data-viz-minute={minute} data-viz-half-hour={String(halfHour)} cx="320" cy="188" r="132" fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="5" />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * Math.PI) / 6;
            return <line key={index} data-viz-mark data-viz-name="clock-tick" x1={320 + Math.sin(angle) * 111} y1={188 - Math.cos(angle) * 111} x2={320 + Math.sin(angle) * 126} y2={188 - Math.cos(angle) * 126} stroke={theme.axisStrong} strokeWidth={index % 3 === 0 ? 5 : 3} />;
          })}
          <line data-viz-mark data-viz-name="hour-hand" data-viz-hour={hour} data-viz-minute={minute} x1="320" y1="188" x2={hourPoint.x} y2={hourPoint.y} stroke={semantic.main} strokeWidth="13" strokeLinecap="round" />
          <line data-viz-mark data-viz-name="minute-hand" data-viz-hour={hour} data-viz-minute={minute} x1="320" y1="188" x2={minutePoint.x} y2={minutePoint.y} stroke={semantic.change} strokeWidth="8" strokeLinecap="round" />
          <circle data-viz-mark data-viz-name="clock-centre" cx="320" cy="188" r="11" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
        </SvgFrame>
      )}
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "money", label: t(localized("Hong Kong money", "港幣", "港币")) },
            { value: "time", label: t(localized("Clock time", "時鐘時間", "时钟时间")) }
          ]} onChange={setMode} />
          {mode === "money" ? (
            <>
              <RangeControl controlId="price" label={t(localized("Price (HK$)", "價格（港幣）", "价格（港币）"))} value={price} min={1} max={99} rangeAffects="payment" rangeProjection="clamp-min" rangeProjectionReason="payment-must-cover-price" onChange={(value) => { setPrice(value); setPayment((current) => Math.max(current, value)); }} />
              <RangeControl controlId="payment" label={t(localized("Payment (HK$)", "付款（港幣）", "付款（港币）"))} value={safePayment} min={price} max={100} onChange={setPayment} />
            </>
          ) : (
            <>
              <RangeControl controlId="hour" label={t(localized("Hour", "小時", "小时"))} value={hour} min={1} max={12} onChange={setHour} />
              <ModeButtons groupId="minutes" label={t(localized("Minutes", "分鐘", "分钟"))} value={halfHour ? "half" : "whole"} options={[
                { value: "whole", label: t(localized("Whole hour", "整點", "整点")) },
                { value: "half", label: t(localized("Half hour", "半點", "半点")) }
              ]} onChange={(value) => setHalfHour(value === "half")} />
            </>
          )}
          <ResetButton label={t(localized("Reset money and time", "重設金錢與時間", "重设金钱与时间"))} onReset={reset} />
        </>
      }
    />
  );
}

type LengthDataMode = "metres" | "pictogram";
type MetreTarget = "desk" | "classroom-width" | "playground-path";
type MetreTool = "metre-ruler" | "tape-measure" | "trundle-wheel";

const metreTargets: Record<MetreTarget, {
  label: LocalizedText;
  estimateMethod: LocalizedText;
  expectedTool: MetreTool;
  estimateCm: number;
  measuredCm: number;
  maxCm: number;
}> = {
  desk: {
    label: localized("Desk length", "書桌長度", "书桌长度"),
    estimateMethod: localized("arm span", "臂展", "臂展"),
    expectedTool: "metre-ruler",
    estimateCm: 120,
    measuredCm: 110,
    maxCm: 200
  },
  "classroom-width": {
    label: localized("Classroom width", "課室闊度", "教室宽度"),
    estimateMethod: localized("paces", "步幅", "步幅"),
    expectedTool: "tape-measure",
    estimateCm: 700,
    measuredCm: 760,
    maxCm: 1000
  },
  "playground-path": {
    label: localized("Playground path", "操場小徑", "操场小径"),
    estimateMethod: localized("paces", "步幅", "步幅"),
    expectedTool: "trundle-wheel",
    estimateCm: 1800,
    measuredCm: 1900,
    maxCm: 2500
  }
};

const metreTools: Record<MetreTool, LocalizedText> = {
  "metre-ruler": localized("metre ruler", "米尺", "米尺"),
  "tape-measure": localized("measuring tape", "捲尺", "卷尺"),
  "trundle-wheel": localized("trundle wheel", "測距輪", "测距轮")
};

function LengthDataModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<LengthDataMode>("metres");
  const [target, setTarget] = useState<MetreTarget>("desk");
  const [tool, setTool] = useState<MetreTool>("metre-ruler");
  const [estimateCm, setEstimateCm] = useState(120);
  const [measuredCm, setMeasuredCm] = useState(110);
  const [pictogramBlueCount, setPictogramBlueCount] = useState(4);
  const definition = metreTargets[target];
  const comparisonMaximum = Math.max(200, estimateCm, measuredCm);
  const comparisonScale = 414 / comparisonMaximum;
  const estimateDifference = Math.abs(estimateCm - measuredCm);
  const measuredMetres = Math.floor(measuredCm / 100);
  const measuredRemainderCm = measuredCm % 100;
  const toolIsSuitable = tool === definition.expectedTool;
  const pictogramData = useMemo(() => [
    { id: "blue", label: localized("Blue team", "藍隊", "蓝队"), count: pictogramBlueCount, color: semantic.main },
    { id: "amber", label: localized("Amber team", "黃隊", "黄队"), count: 3, color: semantic.change },
    { id: "green", label: localized("Green team", "綠隊", "绿队"), count: 5, color: semantic.result }
  ], [pictogramBlueCount]);

  function chooseTarget(next: MetreTarget) {
    const nextDefinition = metreTargets[next];
    setTarget(next);
    setTool(nextDefinition.expectedTool);
    setEstimateCm(nextDefinition.estimateCm);
    setMeasuredCm(nextDefinition.measuredCm);
  }

  function reset() {
    setMode("metres");
    setTarget("desk");
    setTool("metre-ruler");
    setEstimateCm(120);
    setMeasuredCm(110);
    setPictogramBlueCount(4);
  }

  return (
    <ModelShell
      labId="p2-length-data"
      state={{ displayMode: mode, target, tool, estimateCm, measuredCm, measuredMetres, measuredRemainderCm, pictogramBlueCount }}
      objective={localized("Estimate and measure a suitable length in metres, choose a suitable tool, or read a strict one-to-one pictogram.", "以米估計和量度合適的長度、選擇合適工具，或閱讀嚴格一對一象形圖。", "以米估计和测量合适的长度、选择合适工具，或阅读严格一对一象形图。")}
      formula={mode === "metres"
        ? localized(
          `1 m = 100 cm; measured ${measuredCm} cm = ${measuredMetres} m ${measuredRemainderCm} cm; estimate difference = ${estimateDifference} cm`,
          `1 米 = 100 厘米；實測 ${measuredCm} 厘米 = ${measuredMetres} 米 ${measuredRemainderCm} 厘米；估測相差 ${estimateDifference} 厘米`,
          `1 米 = 100 厘米；实测 ${measuredCm} 厘米 = ${measuredMetres} 米 ${measuredRemainderCm} 厘米；估测相差 ${estimateDifference} 厘米`
        )
        : localized(
          `1 icon = 1 object; totals = ${pictogramData.map((item) => item.count).join(", ")}`,
          `1 個圖示 = 1 件物件；各組總數 = ${pictogramData.map((item) => item.count).join("、")}`,
          `1 个图示 = 1 件物品；各组总数 = ${pictogramData.map((item) => item.count).join("、")}`
        )}
      summary={mode === "metres"
        ? t(localized(
          `${definition.label.en}: estimate with ${definition.estimateMethod.en}, then measure. ${t(metreTools[tool])} is ${toolIsSuitable ? "suitable" : "not the best choice"} for this target.`,
          `${definition.label.zh}：先用${definition.estimateMethod.zh}估計，再量度。${t(metreTools[tool])}${toolIsSuitable ? "適合" : "並非最合適"}這個目標。`,
          `${definition.label.zhHans}：先用${definition.estimateMethod.zhHans}估计，再测量。${t(metreTools[tool])}${toolIsSuitable ? "适合" : "并非最合适"}这个目标。`
        ))
        : t(localized(
          "The key is exact: every visible icon contributes one object to its category total.",
          "圖例是嚴格一對一：每個可見圖示為該組總數增加一件物件。",
          "图例是严格一对一：每个可见图示为该组总数增加一件物品。"
        ))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Metre estimation and strict one-to-one pictogram", "米的估測和嚴格一對一象形圖", "米的估测和严格一对一象形图"))}>
          {mode === "metres" ? (
            <g data-viz-mark data-viz-name="metre-measurement" data-viz-target={target} data-viz-tool={tool} data-viz-tool-suitable={String(toolIsSuitable)}>
              <g data-viz-mark data-viz-name="metre-reference" data-viz-metres="1" data-viz-centimetres="100">
                <line x1="116" x2={116 + 100 * comparisonScale} y1="68" y2="68" stroke={semantic.parameter} strokeWidth="9" strokeLinecap="round" />
                <line x1="116" x2="116" y1="55" y2="81" stroke={semantic.parameter} strokeWidth="4" />
                <line x1={116 + 100 * comparisonScale} x2={116 + 100 * comparisonScale} y1="55" y2="81" stroke={semantic.parameter} strokeWidth="4" />
                <text x={116 + 50 * comparisonScale} y="48" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">1 m = 100 cm</text>
              </g>
              <text x="320" y="106" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">{t(definition.label)}</text>
              <g data-viz-mark data-viz-name="estimate-line" data-viz-centimetres={estimateCm} data-viz-method={t(definition.estimateMethod)}>
                <text x="104" y="158" textAnchor="end" fill={theme.tickText} fontSize="15" fontWeight="800">{t(localized("Estimate", "估計", "估计"))}</text>
                <line x1="126" x2={126 + estimateCm * comparisonScale} y1="151" y2="151" stroke={semantic.main} strokeWidth="14" strokeLinecap="round" />
                <text x={Math.min(548, 142 + estimateCm * comparisonScale)} y="158" fill={theme.text} fontSize="15" fontWeight="900">{estimateCm} cm</text>
              </g>
              <g data-viz-mark data-viz-name="measured-line" data-viz-centimetres={measuredCm} data-viz-metres={measuredMetres} data-viz-remainder-centimetres={measuredRemainderCm}>
                <text x="104" y="224" textAnchor="end" fill={theme.tickText} fontSize="15" fontWeight="800">{t(localized("Measured", "實測", "实测"))}</text>
                <line x1="126" x2={126 + measuredCm * comparisonScale} y1="217" y2="217" stroke={semantic.result} strokeWidth="14" strokeLinecap="round" />
                <text x={Math.min(548, 142 + measuredCm * comparisonScale)} y="224" fill={theme.text} fontSize="15" fontWeight="900">{measuredCm} cm</text>
              </g>
              <g
                data-viz-name="measuring-tool-choice"
                data-viz-tool={tool}
                data-viz-expected-tool={definition.expectedTool}
                data-viz-suitable={String(toolIsSuitable)}
                data-viz-overlap-ok="label-inside-own-tool-status-card"
                data-viz-overlap-reason="The selected tool and suitability symbol are intentionally centered inside their own status card."
              >
                <rect data-viz-mark data-viz-overlap-member="mark" x="148" y="266" width="344" height="58" rx="18" fill={toolIsSuitable ? "rgba(52,211,153,.26)" : "rgba(251,113,133,.22)"} stroke={toolIsSuitable ? semantic.result : semantic.attention} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="320" y="302" textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="16" fontWeight="900">{t(metreTools[tool])} · {toolIsSuitable ? "✓" : "↺"}</text>
              </g>
            </g>
          ) : (
            <g data-viz-mark data-viz-name="pictogram" data-viz-one-icon-value="1" data-viz-unit="object">
              {pictogramData.map((item, row) => (
                <g key={item.id} data-viz-mark data-viz-name="pictogram-category" data-viz-category={item.id} data-viz-total={item.count} data-viz-one-icon-value="1">
                  <text x="112" y={91 + row * 82} textAnchor="end" fill={svgTextColor(theme.mode)} fontSize="16" fontWeight="900">{t(item.label)}</text>
                  {Array.from({ length: item.count }, (_, index) => (
                    <circle key={index} data-viz-mark data-viz-name="pictogram-icon" data-viz-icon-value="1" data-viz-unit="object" cx={148 + index * 54} cy={84 + row * 82} r="18" fill={item.color} stroke={theme.pointStroke} strokeWidth="3" />
                  ))}
                  <text x="558" y={91 + row * 82} textAnchor="end" fill={theme.text} fontSize="17" fontWeight="900">{item.count}</text>
                </g>
              ))}
              <g data-viz-mark data-viz-name="pictogram-key" data-viz-one-icon-value="1" data-viz-unit="object">
                <circle data-viz-mark data-viz-name="pictogram-key-icon" data-viz-icon-value="1" cx="214" cy="315" r="13" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="2" />
                <text x="240" y="322" fill={theme.tickText} fontSize="16" fontWeight="900">= 1 {t(localized("object", "件物件", "件物品"))}</text>
              </g>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "metres", label: t(localized("Metres", "米", "米")) },
            { value: "pictogram", label: t(localized("1:1 pictogram", "一對一象形圖", "一对一象形图")) }
          ]} onChange={setMode} />
          {mode === "metres" ? (
            <>
              <ModeButtons groupId="target" label={t(localized("Target", "量度目標", "测量目标"))} value={target} options={(
                ["desk", "classroom-width", "playground-path"] as const
              ).map((value) => ({ value, label: t(metreTargets[value].label) }))} onChange={chooseTarget} />
              <ModeButtons groupId="tool" dependsOnGroupId="target" label={t(localized("Measuring tool", "量度工具", "测量工具"))} value={tool} options={(
                ["metre-ruler", "tape-measure", "trundle-wheel"] as const
              ).map((value) => ({ value, label: t(metreTools[value]) }))} onChange={setTool} />
              <RangeControl controlId="estimateCm" label={t(localized("Estimate (cm)", "估計（厘米）", "估计（厘米）"))} value={estimateCm} min={50} max={definition.maxCm} step={10} output={`${estimateCm} cm`} onChange={setEstimateCm} />
              <RangeControl controlId="measuredCm" label={t(localized("Measured length (cm)", "實測長度（厘米）", "实测长度（厘米）"))} value={measuredCm} min={50} max={definition.maxCm} step={10} output={`${measuredCm} cm`} onChange={setMeasuredCm} />
            </>
          ) : (
            <RangeControl controlId="pictogramBlueCount" label={t(localized("Blue team objects", "藍隊物件數", "蓝队物品数"))} value={pictogramBlueCount} min={1} max={7} onChange={setPictogramBlueCount} />
          )}
          <ResetButton label={t(localized("Reset metres and pictogram", "重設米與象形圖", "重置米与象形图"))} onReset={reset} />
        </>
      }
    />
  );
}

type MultiplyDivideMode = "multiply" | "share";

function MultiplicationDivisionModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<MultiplyDivideMode>("multiply");
  const [groups, setGroups] = useState(4);
  const [itemsPerGroup, setItemsPerGroup] = useState(3);
  const total = groups * itemsPerGroup;
  const arrayCellWidth = 42;
  const arrayCellHeight = 27;
  const arrayWidth = itemsPerGroup * arrayCellWidth;
  const arrayHeight = groups * arrayCellHeight;
  const arrayStartX = 320 - arrayWidth / 2;
  const arrayStartY = 48 + (216 - arrayHeight) / 2;

  return (
    <ModelShell
      labId="p3-multiplication-division"
      state={{ mode, groups, itemsPerGroup }}
      objective={localized("Keep one total while switching between a multiplication array and equal sharing.", "在乘法陣列和平均分之間切換，保持同一總數。", "在乘法阵列和平均分之间切换，保持同一总数。")}
      formula={mathematicalFormula(mode === "multiply" ? `${groups} × ${itemsPerGroup} = ${total}` : `${total} ÷ ${groups} = ${itemsPerGroup}`)}
      summary={mode === "multiply"
        ? t(localized(`${groups} rows with ${itemsPerGroup} counters in each row form a ${groups} × ${itemsPerGroup} array with total ${total}.`, `${groups} 行陣列，每行 ${itemsPerGroup} 個圓點，組成 ${groups} × ${itemsPerGroup}，總數是 ${total}。`, `${groups} 行阵列，每行 ${itemsPerGroup} 个圆点，组成 ${groups} × ${itemsPerGroup}，总数是 ${total}。`))
        : t(localized(`Share ${total} equally among ${groups} groups; each group receives ${itemsPerGroup}.`, `把 ${total} 個平均分給 ${groups} 組，每組得到 ${itemsPerGroup} 個。`, `把 ${total} 个平均分给 ${groups} 组，每组得到 ${itemsPerGroup} 个。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Multiplication array and equal sharing", "乘法陣列與平均分", "乘法阵列与平均分"))}>
          {mode === "multiply" ? (
            <g
              data-viz-mark
              data-viz-name="multiplication-array"
              data-viz-rows={groups}
              data-viz-columns={itemsPerGroup}
              data-viz-total={total}
            >
              <rect
                data-viz-mark
                data-viz-name="multiplication-array-frame"
                x={arrayStartX - 12}
                y={arrayStartY - 12}
                width={arrayWidth + 24}
                height={arrayHeight + 24}
                rx="18"
                fill={theme.softFill}
                stroke={semantic.main}
                strokeWidth="4"
              />
              {Array.from({ length: groups }, (_, rowIndex) => (
                <g key={rowIndex} data-viz-mark data-viz-name="multiplication-array-row" data-viz-row={rowIndex + 1}>
                  {Array.from({ length: itemsPerGroup }, (_, columnIndex) => {
                    const x = arrayStartX + columnIndex * arrayCellWidth;
                    const y = arrayStartY + rowIndex * arrayCellHeight;
                    return (
                      <g
                        key={columnIndex}
                        data-viz-mark
                        data-viz-name="multiplication-array-cell"
                        data-viz-row={rowIndex + 1}
                        data-viz-column={columnIndex + 1}
                      >
                        <rect x={x} y={y} width={arrayCellWidth} height={arrayCellHeight} fill={theme.panelFill} stroke={theme.grid} strokeWidth="2" />
                        <circle data-viz-mark data-viz-name="array-counter" cx={x + arrayCellWidth / 2} cy={y + arrayCellHeight / 2} r="9" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="2" />
                      </g>
                    );
                  })}
                </g>
              ))}
            </g>
          ) : (
            <g data-viz-mark data-viz-name="equal-sharing-groups" data-viz-groups={groups} data-viz-items-per-group={itemsPerGroup} data-viz-total={total}>
              {Array.from({ length: groups }, (_, groupIndex) => {
                const columns = Math.min(groups, 4);
                const row = Math.floor(groupIndex / columns);
                const col = groupIndex % columns;
                const groupWidth = 112;
                const groupHeight = 104;
                const x = 67 + col * 143;
                const y = 54 + row * 118;
                return (
                  <g key={groupIndex} data-viz-mark data-viz-name="equal-share-group" data-viz-group={groupIndex + 1}>
                    <rect x={x} y={y} width={groupWidth} height={groupHeight} rx="22" fill={theme.softFill} stroke={semantic.parameter} strokeWidth="3" />
                    {Array.from({ length: itemsPerGroup }, (_, itemIndex) => {
                      const itemCols = 3;
                      return <circle key={itemIndex} data-viz-mark data-viz-name="shared-counter" cx={x + 29 + (itemIndex % itemCols) * 28} cy={y + 28 + Math.floor(itemIndex / itemCols) * 28} r="9" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="2" />;
                    })}
                  </g>
                );
              })}
            </g>
          )}
          <g
            data-viz-name="total-tray"
            data-viz-total={total}
            data-viz-overlap-ok="label-inside-own-total-tray"
            data-viz-overlap-reason="The conserved total is intentionally centered inside its own total tray."
          >
            <rect data-viz-mark data-viz-overlap-member="mark" x="218" y="294" width="204" height="42" rx="16" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-overlap-member="label" x="320" y="322" textAnchor="middle" fill="#052e16" fontSize="19" fontWeight="900">{total}</text>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="operation" label={t(localized("Operation view", "運算視圖", "运算视图"))} value={mode} options={[
            { value: "multiply", label: t(localized("Array multiplication", "陣列乘法", "阵列乘法")) },
            { value: "share", label: t(localized("Equal sharing", "平均分", "平均分")) }
          ]} onChange={setMode} />
          <RangeControl controlId="groups" label={t(localized("Number of groups", "組數", "组数"))} value={groups} min={2} max={8} onChange={setGroups} />
          <RangeControl controlId="itemsPerGroup" label={t(localized("Items in each group", "每組數目", "每组数目"))} value={itemsPerGroup} min={1} max={6} onChange={setItemsPerGroup} />
          <ResetButton label={t(localized("Reset equal groups", "重設等量組", "重设等量组"))} onReset={() => { setMode("multiply"); setGroups(4); setItemsPerGroup(3); }} />
        </>
      }
    />
  );
}

type MeasurementQuantity = "length" | "mass" | "capacity";
type MeasurementUnit = "small" | "large";
type P3MeasurementModel = "measurement" | "bar-chart";
type P3BarCategory = "A" | "B" | "C" | "D";

const measurementDefinitions = {
  length: { small: "cm", large: "m", factor: 100, defaultValue: 250, max: 5000 },
  mass: { small: "g", large: "kg", factor: 1000, defaultValue: 1500, max: 5000 },
  capacity: { small: "mL", large: "L", factor: 1000, defaultValue: 1250, max: 5000 }
} as const;

const p3BarData: readonly { category: P3BarCategory; value: number; color: string }[] = [
  { category: "A", value: 0, color: semantic.main },
  { category: "B", value: 4, color: semantic.change },
  { category: "C", value: 8, color: semantic.result },
  { category: "D", value: 6, color: semantic.parameter }
];

function MeasurementUnitsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [model, setModel] = useState<P3MeasurementModel>("measurement");
  const [quantityType, setQuantityType] = useState<MeasurementQuantity>("length");
  const [unit, setUnit] = useState<MeasurementUnit>("small");
  const [baseValue, setBaseValue] = useState<number>(measurementDefinitions.length.defaultValue);
  const [selectedCategory, setSelectedCategory] = useState<P3BarCategory>("B");
  const definition = measurementDefinitions[quantityType];
  const displayedValue = unit === "small" ? baseValue : baseValue / definition.factor;
  const displayedUnit = definition[unit];
  const filledWidth = 430 * (baseValue / definition.max);
  const selectedBar = p3BarData.find((item) => item.category === selectedCategory) ?? p3BarData[1];

  function chooseQuantity(next: MeasurementQuantity) {
    setQuantityType(next);
    setBaseValue(measurementDefinitions[next].defaultValue);
    setUnit("small");
  }

  function reset() {
    setModel("measurement");
    setQuantityType("length");
    setUnit("small");
    setBaseValue(measurementDefinitions.length.defaultValue);
    setSelectedCategory("B");
  }

  return (
    <ModelShell
      labId="p3-measurement"
      state={{ model, quantityType, baseValue, unit, selectedCategory }}
      objective={localized("Choose an appropriate metric unit, or read an exact value from a bar chart with a shared scale.", "選擇合適的公制單位，或從共用刻度的棒形圖讀取準確數值。", "选择合适的公制单位，或从共用刻度的条形图读取准确数值。")}
      formula={model === "measurement"
        ? mathematicalFormula(`${baseValue} ${definition.small} = ${formatDecimal(baseValue / definition.factor, 3)} ${definition.large}`)
        : localized(
          `Class ${selectedCategory}: ${selectedBar.value} books; scale interval = 2 books`,
          `${selectedCategory} 班：${selectedBar.value} 本書；每個刻度 = 2 本書`,
          `${selectedCategory} 班：${selectedBar.value} 本书；每个刻度 = 2 本书`
        )}
      summary={model === "measurement"
        ? t(localized(`The same ${quantityType} is ${formatDecimal(displayedValue, 3)} ${displayedUnit}; changing the unit changes the number, not the quantity.`, `同一${quantityType === "length" ? "長度" : quantityType === "mass" ? "質量" : "容量"}是 ${formatDecimal(displayedValue, 3)} ${displayedUnit}；更換單位只改變數值，不改變所量度的量。`, `同一${quantityType === "length" ? "长度" : quantityType === "mass" ? "质量" : "容量"}是 ${formatDecimal(displayedValue, 3)} ${displayedUnit}；更换单位只改变数值，不改变所测量的量。`))
        : t(localized(`Class ${selectedCategory} reaches ${selectedBar.value} books on the common vertical scale.`, `${selectedCategory} 班在共用縱軸刻度上讀作 ${selectedBar.value} 本書。`, `${selectedCategory} 班在共用纵轴刻度上读作 ${selectedBar.value} 本书。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Metric measurement or scaled bar chart", "公制度量或有刻度棒形圖", "公制测量或有刻度条形图"))}>
          {model === "measurement" ? (
            <>
              <g data-viz-mark data-viz-name="measurement-scale" data-viz-quantity={quantityType} data-viz-base-value={baseValue}>
                <rect x="92" y="118" width="456" height="96" rx="28" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="4" />
                <rect data-viz-mark data-viz-name="measured-quantity" x="105" y="131" width={Math.max(8, filledWidth)} height="70" rx="20" fill={quantityType === "length" ? semantic.main : quantityType === "mass" ? semantic.parameter : semantic.result} />
                {Array.from({ length: 11 }, (_, index) => <line key={index} data-viz-mark data-viz-name="scale-tick" x1={105 + index * 43} x2={105 + index * 43} y1="219" y2={index % 5 === 0 ? 250 : 238} stroke={theme.axis} strokeWidth={index % 5 === 0 ? 4 : 2} />)}
              </g>
              <g data-viz-mark data-viz-name="conversion-marker" data-viz-quantity={quantityType} data-viz-unit={unit} data-viz-displayed-unit={displayedUnit} data-viz-displayed-value={formatDecimal(displayedValue, 3)}>
                <g
                  data-viz-overlap-ok="label-inside-own-small-unit-node"
                  data-viz-overlap-reason="The small-unit symbol is intentionally centered inside its own conversion node."
                >
                  <circle data-viz-mark data-viz-overlap-member="mark" cx="220" cy="294" r="40" fill={unit === "small" ? semantic.main : theme.emptyFill} stroke={semantic.main} strokeWidth="4" />
                  <text data-viz-overlap-member="label" x="220" y="301" textAnchor="middle" fill={unit === "small" ? "#082f49" : svgTextColor(theme.mode)} fontSize="17" fontWeight="900">{definition.small}</text>
                </g>
                <g
                  data-viz-overlap-ok="label-inside-own-large-unit-node"
                  data-viz-overlap-reason="The large-unit symbol is intentionally centered inside its own conversion node."
                >
                  <circle data-viz-mark data-viz-overlap-member="mark" cx="420" cy="294" r="40" fill={unit === "large" ? semantic.result : theme.emptyFill} stroke={semantic.result} strokeWidth="4" />
                  <text data-viz-overlap-member="label" x="420" y="301" textAnchor="middle" fill={unit === "large" ? "#052e16" : svgTextColor(theme.mode)} fontSize="17" fontWeight="900">{definition.large}</text>
                </g>
                <line x1="267" x2="373" y1="294" y2="294" stroke={theme.axisStrong} strokeWidth="5" />
                <polygon points="373,294 353,282 353,306" fill={theme.axisStrong} />
              </g>
            </>
          ) : (
            <g data-viz-mark data-viz-name="bar-chart" data-viz-scale-min="0" data-viz-scale-max="10" data-viz-scale-interval="2" data-viz-unit="books">
              <g data-viz-mark data-viz-name="bar-chart-axes">
                <line data-viz-mark data-viz-name="bar-chart-y-axis" x1="94" x2="94" y1="298" y2="46" stroke={theme.axisStrong} strokeWidth="5" />
                <line data-viz-mark data-viz-name="bar-chart-x-axis" x1="94" x2="568" y1="298" y2="298" stroke={theme.axisStrong} strokeWidth="5" />
                {Array.from({ length: 6 }, (_, index) => {
                  const value = index * 2;
                  const y = 298 - value * 24;
                  return (
                    <g key={value} data-viz-mark data-viz-name="bar-chart-scale-tick" data-viz-value={value}>
                      <line x1="84" x2="568" y1={y} y2={y} stroke={value === 0 ? theme.axisStrong : theme.grid} strokeWidth={value === 0 ? 3 : 1.5} />
                      <text x="72" y={y + 5} textAnchor="end" fill={theme.tickText} fontSize="13" fontWeight="800">{value}</text>
                    </g>
                  );
                })}
                <text x="36" y="174" textAnchor="middle" transform="rotate(-90 36 174)" fill={theme.tickText} fontSize="14" fontWeight="900">{t(localized("Books", "書本數量", "书本数量"))}</text>
                <text x="330" y="342" textAnchor="middle" fill={theme.tickText} fontSize="14" fontWeight="900">{t(localized("Class", "班別", "班级"))}</text>
              </g>
              {p3BarData.map((item, index) => {
                const x = 134 + index * 108;
                const height = item.value * 24;
                const selected = item.category === selectedCategory;
                return (
                  <g key={item.category} data-viz-mark data-viz-name="data-bar" data-viz-category={item.category} data-viz-value={item.value} data-viz-selected={String(selected)} data-viz-zero-height={String(item.value === 0)}>
                    <rect x={x} y={298 - height} width="68" height={height} rx="9" fill={item.color} opacity={selected ? 1 : 0.62} stroke={selected ? theme.pointStroke : theme.panelStroke} strokeWidth={selected ? 4 : 2} />
                    <text x={x + 34} y={288 - height} textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{item.value}</text>
                    <text x={x + 34} y="324" textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">{item.category}</text>
                  </g>
                );
              })}
              <line data-viz-mark data-viz-name="selected-value-guide" data-viz-category={selectedCategory} data-viz-value={selectedBar.value} x1="94" x2={134 + p3BarData.findIndex((item) => item.category === selectedCategory) * 108 + 34} y1={298 - selectedBar.value * 24} y2={298 - selectedBar.value * 24} stroke={semantic.attention} strokeWidth="4" strokeDasharray="7 5" />
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={model} options={[
            { value: "measurement", label: t(localized("Measurement", "度量", "测量")) },
            { value: "bar-chart", label: t(localized("Bar chart", "棒形圖", "条形图")) }
          ]} onChange={setModel} />
          {model === "measurement" ? (
            <>
              <ModeButtons groupId="quantity" label={t(localized("Quantity", "量", "量"))} value={quantityType} options={[
                { value: "length", label: t(localized("Length", "長度", "长度")) },
                { value: "mass", label: t(localized("Mass", "質量", "质量")) },
                { value: "capacity", label: t(localized("Capacity", "容量", "容量")) }
              ]} onChange={chooseQuantity} />
              <ModeButtons groupId="displayed-unit" label={t(localized("Displayed unit", "顯示單位", "显示单位"))} value={unit} options={[
                { value: "small", label: definition.small },
                { value: "large", label: definition.large }
              ]} onChange={setUnit} />
              <RangeControl controlId="baseValue" label={t(localized(`Quantity in ${definition.small}`, `以 ${definition.small} 表示的量`, `以 ${definition.small} 表示的量`))} value={baseValue} min={quantityType === "length" ? 10 : 50} max={definition.max} step={quantityType === "length" ? 10 : 50} output={`${baseValue} ${definition.small}`} onChange={setBaseValue} />
            </>
          ) : (
            <ModeButtons groupId="bar-category" label={t(localized("Read category", "讀取類別", "读取类别"))} value={selectedCategory} options={p3BarData.map((item) => ({ value: item.category, label: `${t(localized("Class", "班", "班"))} ${item.category}` }))} onChange={setSelectedCategory} />
          )}
          <ResetButton label={t(localized("Reset measurement", "重設度量", "重设测量"))} onReset={reset} />
        </>
      }
    />
  );
}

type P3ShapeFamily = "quadrilateral" | "triangle";
type P3ShapeType = "rectangle" | "square" | "parallelogram" | "trapezium" | "triangle-different" | "triangle-two-equal" | "triangle-three-equal";

type P3ShapeDefinition = {
  family: P3ShapeFamily;
  label: LocalizedText;
  property: LocalizedText;
  points: readonly { x: number; y: number }[];
  parallelGroups: readonly number[];
  equalGroups: readonly number[];
};

function pointOnSegment(start: { x: number; y: number }, end: { x: number; y: number }, ratio: number) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio
  };
}

const P3_SHAPE_DEFINITIONS: Record<P3ShapeType, P3ShapeDefinition> = {
  rectangle: {
    family: "quadrilateral",
    label: localized("Rectangle", "長方形", "长方形"),
    property: localized("Two pairs of parallel sides; opposite sides are equal.", "有兩對平行邊；相對的邊相等。", "有两对平行边；相对的边相等。"),
    points: [{ x: 170, y: 86 }, { x: 470, y: 86 }, { x: 470, y: 270 }, { x: 170, y: 270 }],
    parallelGroups: [0, 1, 0, 1],
    equalGroups: [0, 1, 0, 1]
  },
  square: {
    family: "quadrilateral",
    label: localized("Square", "正方形", "正方形"),
    property: localized("Two pairs of parallel sides; all four sides are equal.", "有兩對平行邊；四條邊全部相等。", "有两对平行边；四条边全部相等。"),
    points: [{ x: 218, y: 70 }, { x: 422, y: 70 }, { x: 422, y: 274 }, { x: 218, y: 274 }],
    parallelGroups: [0, 1, 0, 1],
    equalGroups: [0, 0, 0, 0]
  },
  parallelogram: {
    family: "quadrilateral",
    label: localized("Parallelogram", "平行四邊形", "平行四边形"),
    property: localized("Two pairs of parallel sides; opposite sides are equal.", "有兩對平行邊；相對的邊相等。", "有两对平行边；相对的边相等。"),
    points: [{ x: 220, y: 82 }, { x: 484, y: 82 }, { x: 420, y: 270 }, { x: 156, y: 270 }],
    parallelGroups: [0, 1, 0, 1],
    equalGroups: [0, 1, 0, 1]
  },
  trapezium: {
    family: "quadrilateral",
    label: localized("Trapezium", "梯形", "梯形"),
    property: localized("One pair of opposite sides is parallel.", "一對相對的邊互相平行。", "一对相对的边互相平行。"),
    points: [{ x: 226, y: 86 }, { x: 430, y: 86 }, { x: 500, y: 270 }, { x: 138, y: 270 }],
    parallelGroups: [0, -1, 0, -1],
    equalGroups: [-1, -1, -1, -1]
  },
  "triangle-different": {
    family: "triangle",
    label: localized("Triangle · three different sides", "三角形 · 三邊不同", "三角形 · 三边不同"),
    property: localized("It has three sides and three vertices; the three side lengths are different.", "它有三條邊和三個頂點；三條邊的長度不同。", "它有三条边和三个顶点；三条边的长度不同。"),
    points: [{ x: 154, y: 278 }, { x: 486, y: 278 }, { x: 382, y: 64 }],
    parallelGroups: [-1, -1, -1],
    equalGroups: [0, 1, 2]
  },
  "triangle-two-equal": {
    family: "triangle",
    label: localized("Triangle · two equal sides", "三角形 · 兩邊相等", "三角形 · 两边相等"),
    property: localized("It has three sides and three vertices; two sides are equal.", "它有三條邊和三個頂點；其中兩條邊相等。", "它有三条边和三个顶点；其中两条边相等。"),
    points: [{ x: 164, y: 278 }, { x: 476, y: 278 }, { x: 320, y: 62 }],
    parallelGroups: [-1, -1, -1],
    equalGroups: [1, 0, 0]
  },
  "triangle-three-equal": {
    family: "triangle",
    label: localized("Triangle · three equal sides", "三角形 · 三邊相等", "三角形 · 三边相等"),
    property: localized("It has three sides and three vertices; all three sides are equal.", "它有三條邊和三個頂點；三條邊全部相等。", "它有三条边和三个顶点；三条边全部相等。"),
    points: [{ x: 178, y: 280 }, { x: 462, y: 280 }, { x: 320, y: 34 }],
    parallelGroups: [-1, -1, -1],
    equalGroups: [0, 0, 0]
  }
};

function GeometryPatternsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [shapeFamily, setShapeFamily] = useState<P3ShapeFamily>("quadrilateral");
  const [shapeType, setShapeType] = useState<P3ShapeType>("rectangle");
  const definition = P3_SHAPE_DEFINITIONS[shapeType];
  const sideCount = definition.points.length;
  const vertexCount = definition.points.length;
  const parallelPairs = new Set(definition.parallelGroups.filter((group) => group >= 0)).size;
  const points = definition.points.map((point) => `${point.x},${point.y}`).join(" ");
  const centroid = definition.points.reduce(
    (total, point) => ({ x: total.x + point.x / vertexCount, y: total.y + point.y / vertexCount }),
    { x: 0, y: 0 }
  );
  const shapeOptions: readonly { value: P3ShapeType; label: string }[] = shapeFamily === "quadrilateral"
    ? (["rectangle", "square", "parallelogram", "trapezium"] as const).map((value) => ({ value, label: t(P3_SHAPE_DEFINITIONS[value].label) }))
    : (["triangle-different", "triangle-two-equal", "triangle-three-equal"] as const).map((value) => ({ value, label: t(P3_SHAPE_DEFINITIONS[value].label) }));

  function chooseFamily(next: P3ShapeFamily) {
    setShapeFamily(next);
    setShapeType(next === "quadrilateral" ? "rectangle" : "triangle-different");
  }

  function reset() {
    setShapeFamily("quadrilateral");
    setShapeType("rectangle");
  }

  return (
    <ModelShell
      labId="p3-geometry-patterns"
      state={{ shapeFamily, shapeType }}
      objective={localized("Recognise quadrilaterals and triangles by looking at their sides, vertices, and marked properties.", "觀察邊、頂點和標記的性質，辨認四邊形和三角形。", "观察边、顶点和标记的性质，辨认四边形和三角形。")}
      formula={localized(
        `${definition.label.en}: ${sideCount} sides · ${vertexCount} vertices`,
        `${definition.label.zh}：${sideCount} 條邊 · ${vertexCount} 個頂點`,
        `${definition.label.zhHans ?? definition.label.zh}：${sideCount} 条边 · ${vertexCount} 个顶点`
      )}
      summary={`${t(definition.label)} — ${t(definition.property)}`}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Concrete quadrilateral and triangle properties", "具體四邊形和三角形的性質", "具体四边形和三角形的性质"))}>
          <g
            data-viz-mark
            data-viz-name="shape-model"
            data-viz-shape-family={shapeFamily}
            data-viz-shape-type={shapeType}
            data-viz-side-count={sideCount}
            data-viz-vertex-count={vertexCount}
            data-viz-parallel-pairs={parallelPairs}
          >
            <polygon
              data-viz-mark
              data-viz-name="shape-outline"
              data-viz-shape-family={shapeFamily}
              data-viz-shape-type={shapeType}
              data-viz-side-count={sideCount}
              data-viz-vertex-count={vertexCount}
              data-viz-parallel-pairs={parallelPairs}
              points={points}
              fill={theme.softFill}
              stroke={theme.panelStroke}
              strokeWidth="3"
            />
            {definition.points.map((point, index) => {
              const next = definition.points[(index + 1) % definition.points.length];
              const equalGroup = definition.equalGroups[index];
              const parallelGroup = definition.parallelGroups[index];
              const equalMarker = pointOnSegment(point, next, 0.42);
              const parallelMarker = pointOnSegment(point, next, 0.64);
              return (
                <g
                  key={`side-${index}`}
                  data-viz-mark
                  data-viz-name="shape-side"
                  data-viz-side-index={index + 1}
                  data-viz-equal-group={equalGroup < 0 ? "none" : equalGroup}
                  data-viz-parallel-group={parallelGroup < 0 ? "none" : parallelGroup}
                >
                  <line
                    x1={point.x}
                    y1={point.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={theme.axisStrong}
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  {equalGroup >= 0 ? (
                    <g
                      data-viz-mark
                      data-viz-name="equal-side-marker"
                      data-viz-group={equalGroup}
                      data-viz-marker-count={equalGroup + 1}
                      data-viz-group-pattern={`${equalGroup + 1}-ticks`}
                    >
                      {Array.from({ length: equalGroup + 1 }, (_, markerIndex) => (
                        <circle
                          key={markerIndex}
                          cx={equalMarker.x + (markerIndex - equalGroup / 2) * 10}
                          cy={equalMarker.y}
                          r="4"
                          fill={theme.labelFill}
                          stroke={theme.axisStrong}
                          strokeWidth="2.5"
                        />
                      ))}
                    </g>
                  ) : null}
                  {parallelGroup >= 0 ? (
                    <g
                      data-viz-mark
                      data-viz-name="parallel-side-marker"
                      data-viz-group={parallelGroup}
                      data-viz-marker-count={parallelGroup + 1}
                      data-viz-group-pattern={`${parallelGroup + 1}-diamonds`}
                    >
                      {Array.from({ length: parallelGroup + 1 }, (_, markerIndex) => {
                        const markerX = parallelMarker.x + (markerIndex - parallelGroup / 2) * 12;
                        return <rect key={markerIndex} x={markerX - 5} y={parallelMarker.y - 5} width="10" height="10" transform={`rotate(45 ${markerX} ${parallelMarker.y})`} fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="2.5" />;
                      })}
                    </g>
                  ) : null}
                </g>
              );
            })}
            {definition.points.map((point, index) => {
              const deltaX = point.x - centroid.x;
              const deltaY = point.y - centroid.y;
              const radialLength = Math.max(1, Math.hypot(deltaX, deltaY));
              let labelX = point.x + (deltaX / radialLength) * 32;
              let labelY = point.y + (deltaY / radialLength) * 32 + 5;
              if (labelY < 22 || labelY > 298) {
                labelX = point.x + (deltaX >= 0 ? 34 : -34);
                labelY = Math.min(298, Math.max(22, point.y + 5));
              }
              return (
                <g key={`vertex-${index}`} data-viz-mark data-viz-name="shape-vertex" data-viz-vertex-index={index + 1}>
                  <circle cx={point.x} cy={point.y} r="11" fill={semantic.parameter} stroke={theme.pointStroke} strokeWidth="3" />
                  <text x={labelX} y={labelY} textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{String.fromCharCode(65 + index)}</text>
                </g>
              );
            })}
          </g>
          <g
            data-viz-name="shape-property-counts"
            data-viz-sides={sideCount}
            data-viz-vertices={vertexCount}
            data-viz-parallel-pairs={parallelPairs}
            data-viz-overlap-ok="label-inside-own-shape-property-card"
            data-viz-overlap-reason="The side, vertex, and parallel-pair summary is intentionally centered inside its own property card."
          >
            <rect data-viz-mark data-viz-overlap-member="mark" x="82" y="306" width="476" height="38" rx="14" fill={theme.labelFill} stroke={theme.panelStroke} strokeWidth="2" />
            <text data-viz-overlap-member="label" x="320" y="331" textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">
              {t(localized(`${sideCount} sides · ${vertexCount} vertices · ${parallelPairs} parallel pair${parallelPairs === 1 ? "" : "s"}`, `${sideCount} 條邊 · ${vertexCount} 個頂點 · ${parallelPairs} 對平行邊`, `${sideCount} 条边 · ${vertexCount} 个顶点 · ${parallelPairs} 对平行边`))}
            </text>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="shape-family" label={t(localized("Shape family", "圖形類別", "图形类别"))} value={shapeFamily} options={[
            { value: "quadrilateral", label: t(localized("Quadrilaterals", "四邊形", "四边形")) },
            { value: "triangle", label: t(localized("Triangles", "三角形", "三角形")) }
          ]} onChange={chooseFamily} />
          <ModeButtons groupId="shape-example" dependsOnGroupId="shape-family" label={t(localized("Concrete shape", "具體圖形", "具体图形"))} value={shapeType} options={shapeOptions} onChange={setShapeType} />
          <ResetButton label={t(localized("Reset shape properties", "重設圖形性質", "重设图形性质"))} onReset={reset} />
        </>
      }
    />
  );
}

type FactorsMultiplesMode = "factor-pairs" | "common-hcf-lcm";

type FactorsMultiplesState = {
  mode: FactorsMultiplesMode;
  firstNumber: number;
  secondNumber: number;
  candidateDivisor: number;
};

export function hkPrimaryTransitionFactorsMultiplesState(
  state: FactorsMultiplesState,
  update: Partial<FactorsMultiplesState>
): FactorsMultiplesState {
  const mode = update.mode ?? state.mode;
  const firstNumber = clamp(update.firstNumber ?? state.firstNumber, 1, mode === "factor-pairs" ? 60 : 20);
  const secondNumber = clamp(update.secondNumber ?? state.secondNumber, 1, 20);
  const candidateDivisor = clamp(update.candidateDivisor ?? state.candidateDivisor, 1, firstNumber);
  return { mode, firstNumber, secondNumber, candidateDivisor };
}

function positiveFactors(value: number) {
  return Array.from({ length: value }, (_, index) => index + 1).filter((candidate) => value % candidate === 0);
}

function completeFactorPairs(value: number): readonly (readonly [number, number])[] {
  return Array.from({ length: Math.floor(Math.sqrt(value)) }, (_, index) => index + 1)
    .filter((candidate) => value % candidate === 0)
    .map((candidate) => [candidate, value / candidate] as const);
}

function FactorsMultiplesModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [factorsState, setFactorsState] = useState<FactorsMultiplesState>({
    mode: "factor-pairs",
    firstNumber: 24,
    secondNumber: 18,
    candidateDivisor: 6
  });
  const { mode, firstNumber, secondNumber, candidateDivisor } = factorsState;
  const divisorRangeProjectionMetadata = hkPrimaryFactorsDivisorRangeProjectionMetadata(mode);
  const safeDivisor = Math.min(candidateDivisor, firstNumber);
  const quotient = Math.floor(firstNumber / safeDivisor);
  const remainder = firstNumber % safeDivisor;
  const factorPairs = completeFactorPairs(firstNumber);
  const firstFactors = positiveFactors(firstNumber);
  const secondFactors = positiveFactors(secondNumber);
  const commonFactors = firstFactors.filter((factor) => secondNumber % factor === 0);
  const hcf = gcd(firstNumber, secondNumber);
  const lcm = (firstNumber * secondNumber) / hcf;
  const multipleLimit = lcm * 2;
  const firstMultiples = Array.from({ length: Math.floor(multipleLimit / firstNumber) }, (_, index) => firstNumber * (index + 1));
  const secondMultiples = Array.from({ length: Math.floor(multipleLimit / secondNumber) }, (_, index) => secondNumber * (index + 1));
  const classification = firstNumber === 1 ? "neither" : firstFactors.length === 2 ? "prime" : "composite";
  const classificationLabel = classification === "neither"
    ? localized("neither prime nor composite", "既非質數亦非合數", "既非质数也非合数")
    : classification === "prime"
      ? localized("prime", "質數", "质数")
      : localized("composite", "合數", "合数");

  function chooseMode(next: FactorsMultiplesMode) {
    setFactorsState((current) => hkPrimaryTransitionFactorsMultiplesState(current, { mode: next }));
  }

  function chooseFirstNumber(value: number) {
    setFactorsState((current) => hkPrimaryTransitionFactorsMultiplesState(current, { firstNumber: value }));
  }

  function chooseSecondNumber(value: number) {
    setFactorsState((current) => hkPrimaryTransitionFactorsMultiplesState(current, { secondNumber: value }));
  }

  function chooseCandidateDivisor(value: number) {
    setFactorsState((current) => hkPrimaryTransitionFactorsMultiplesState(current, { candidateDivisor: value }));
  }

  function reset() {
    setFactorsState({ mode: "factor-pairs", firstNumber: 24, secondNumber: 18, candidateDivisor: 6 });
  }

  return (
    <ModelShell
      labId="p4-large-numbers"
      state={{ mode, firstNumber, secondNumber, candidateDivisor: safeDivisor }}
      objective={localized("Build complete factor pairs, test a factor by its remainder, and locate HCF and LCM in common lists.", "列出完整因數對、用餘數檢驗因數，並在公因數和公倍數列表找出 HCF 與 LCM。", "列出完整因数对、用余数检验因数，并在公因数和公倍数列表找出 HCF 与 LCM。")}
      formula={mode === "factor-pairs"
        ? localized(
          `${firstNumber} ÷ ${safeDivisor} = ${quotient} remainder ${remainder}; factor iff remainder = 0`,
          `${firstNumber} ÷ ${safeDivisor} = ${quotient} 餘 ${remainder}；餘數 = 0 才是因數`,
          `${firstNumber} ÷ ${safeDivisor} = ${quotient} 余 ${remainder}；余数 = 0 才是因数`
        )
        : localized(
          `common factors = {${commonFactors.join(", ")}}; HCF = ${hcf}; least positive common multiple = ${lcm}`,
          `公因數 = {${commonFactors.join("、")}}；HCF = ${hcf}；最小正公倍數 = ${lcm}`,
          `公因数 = {${commonFactors.join("、")}}；HCF = ${hcf}；最小正公倍数 = ${lcm}`
        )}
      summary={mode === "factor-pairs"
        ? t(localized(`${factorPairs.length} complete factor pair${factorPairs.length === 1 ? "" : "s"} multiply to ${firstNumber}. ${firstNumber} is ${classificationLabel.en}.`, `共有 ${factorPairs.length} 對完整因數對，乘積都是 ${firstNumber}；${firstNumber} 是${classificationLabel.zh}。`, `共有 ${factorPairs.length} 对完整因数对，乘积都是 ${firstNumber}；${firstNumber} 是${classificationLabel.zhHans}。`))
        : t(localized(`${hcf} is the greatest value in the common-factor intersection. ${lcm} is the first positive value shared by both multiple rows.`, `${hcf} 是公因數交集中的最大值；${lcm} 是兩列正倍數首次共有的數。`, `${hcf} 是公因数交集中的最大值；${lcm} 是两行正倍数首次共有的数。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Factor pairs and common HCF/LCM lists", "因數對與 HCF／LCM 公共列表", "因数对与 HCF／LCM 公共列表"))}>
          {mode === "factor-pairs" ? (
            <g data-viz-mark data-viz-name="factor-pair-array" data-viz-number={firstNumber} data-viz-complete="true" data-viz-pair-count={factorPairs.length}>
              {factorPairs.map(([left, right], index) => {
                const x = 76 + (index % 3) * 176;
                const y = 58 + Math.floor(index / 3) * 68;
                return (
                  <g
                    key={left}
                    data-viz-name="factor-pair"
                    data-viz-left={left}
                    data-viz-right={right}
                    data-viz-overlap-ok={`label-inside-own-factor-pair-${left}-${right}`}
                    data-viz-overlap-reason="The factor-pair equation is intentionally centered inside its own factor-pair card."
                  >
                    <rect data-viz-mark data-viz-overlap-member="mark" x={x} y={y} width="150" height="48" rx="14" fill={theme.softFill} stroke={semantic.main} strokeWidth="3" />
                    <text data-viz-overlap-member="label" x={x + 75} y={y + 31} textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="18" fontWeight="900">{left} × {right}</text>
                  </g>
                );
              })}
              <g
                data-viz-name="number-classification"
                data-viz-classification={classification}
                data-viz-overlap-ok="label-inside-own-number-classification-card"
                data-viz-overlap-reason="The number classification is intentionally centered inside its own classification card."
              >
                <rect data-viz-mark data-viz-overlap-member="mark" x="172" y="207" width="296" height="44" rx="14" fill={classification === "prime" ? "rgba(52,211,153,.24)" : classification === "composite" ? "rgba(167,139,250,.24)" : theme.softFill} stroke={classification === "prime" ? semantic.result : classification === "composite" ? semantic.parameter : semantic.reference} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="320" y="235" textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="16" fontWeight="900">{firstNumber}: {t(classificationLabel)}</text>
              </g>
              <g
                data-viz-name="remainder-test"
                data-viz-dividend={firstNumber}
                data-viz-divisor={safeDivisor}
                data-viz-quotient={quotient}
                data-viz-remainder={remainder}
                data-viz-is-factor={String(remainder === 0)}
                data-viz-overlap-ok="label-inside-own-remainder-test-card"
                data-viz-overlap-reason="The division check is intentionally centered inside its own remainder-test card."
              >
                <rect data-viz-mark data-viz-overlap-member="mark" x="116" y="273" width="408" height="58" rx="18" fill={remainder === 0 ? "rgba(52,211,153,.25)" : "rgba(251,113,133,.2)"} stroke={remainder === 0 ? semantic.result : semantic.attention} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="320" y="308" textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="18" fontWeight="900">{firstNumber} ÷ {safeDivisor} = {quotient} r {remainder} · {remainder === 0 ? `✓ ${t(localized("factor", "因數", "因数"))}` : `✕ ${t(localized("not a factor", "不是因數", "不是因数"))}`}</text>
              </g>
            </g>
          ) : (
            <g data-viz-mark data-viz-name="common-hcf-lcm-model" data-viz-first={firstNumber} data-viz-second={secondNumber} data-viz-hcf={hcf} data-viz-lcm={lcm}>
              <g data-viz-mark data-viz-name="factor-list-intersection" data-viz-common-factors={commonFactors.join(",")}>
                {[
                  { id: "first", value: firstNumber, factors: firstFactors, y: 69, color: semantic.main },
                  { id: "second", value: secondNumber, factors: secondFactors, y: 125, color: semantic.change }
                ].map((row) => (
                  <g key={row.id} data-viz-mark data-viz-name="factor-list" data-viz-number={row.value} data-viz-factors={row.factors.join(",")}>
                    <text x="72" y={row.y + 6} textAnchor="end" fill={theme.text} fontSize="14" fontWeight="900">F({row.value})</text>
                    {row.factors.map((factor, index) => {
                      const common = commonFactors.includes(factor);
                      return (
                        <g
                          key={factor}
                          data-viz-name={common ? "common-factor" : "factor-list-item"}
                          data-viz-value={factor}
                          data-viz-overlap-ok={`label-inside-own-${row.id}-factor-${factor}`}
                          data-viz-overlap-reason="Each factor value is intentionally centered inside its own factor node."
                        >
                          <circle data-viz-mark data-viz-overlap-member="mark" cx={108 + index * 54} cy={row.y} r={factor === hcf ? 20 : 16} fill={common ? semantic.result : theme.emptyFill} stroke={factor === hcf ? semantic.attention : row.color} strokeWidth={factor === hcf ? 5 : 3} />
                          <text data-viz-overlap-member="label" x={108 + index * 54} y={row.y + 5} textAnchor="middle" fill={common ? "#052e16" : svgTextColor(theme.mode)} fontSize="13" fontWeight="900">{factor}</text>
                        </g>
                      );
                    })}
                  </g>
                ))}
                <g data-viz-mark data-viz-name="hcf-marker" data-viz-value={hcf}>
                  <text x="548" y="105" textAnchor="end" fill={theme.text} fontSize="16" fontWeight="900">HCF = {hcf}</text>
                </g>
              </g>
              <g data-viz-mark data-viz-name="positive-multiple-rows" data-viz-limit={multipleLimit} data-viz-common-multiples={`${lcm},${multipleLimit}`}>
                {[
                  { id: "first", value: firstNumber, values: firstMultiples, y: 228, color: semantic.main },
                  { id: "second", value: secondNumber, values: secondMultiples, y: 288, color: semantic.change }
                ].map((row) => (
                  <g key={row.id} data-viz-mark data-viz-name="positive-multiple-list" data-viz-number={row.value} data-viz-values={row.values.join(",")}>
                    <text x="74" y={row.y + 5} textAnchor="end" fill={theme.text} fontSize="14" fontWeight="900">M({row.value})</text>
                    <line x1="98" x2="542" y1={row.y} y2={row.y} stroke={theme.gridStrong} strokeWidth="3" />
                    {row.values.map((multiple) => {
                      const common = multiple % lcm === 0;
                      const x = 98 + (multiple / multipleLimit) * 444;
                      return (
                        <g key={multiple} data-viz-mark data-viz-name={common ? "common-multiple" : "positive-multiple"} data-viz-value={multiple}>
                          <circle cx={x} cy={row.y} r={multiple === lcm ? 11 : common ? 8 : 5} fill={common ? semantic.result : row.color} stroke={multiple === lcm ? semantic.attention : theme.pointStroke} strokeWidth={multiple === lcm ? 4 : 1.5} />
                          {multiple === lcm ? <text x={x} y={row.y - 17} textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{lcm}</text> : null}
                        </g>
                      );
                    })}
                  </g>
                ))}
                <g data-viz-mark data-viz-name="lcm-marker" data-viz-value={lcm}>
                  <text x="320" y="336" textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">LCM = {lcm}</text>
                </g>
              </g>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "factor-pairs", label: t(localized("Factor pairs", "因數對", "因数对")) },
            { value: "common-hcf-lcm", label: t(localized("Common factors and multiples", "公因數與公倍數", "公因数与公倍数")) }
          ]} onChange={chooseMode} />
          <RangeControl controlId="firstNumber" label={t(localized("First positive integer", "第一個正整數", "第一个正整数"))} value={firstNumber} min={1} max={mode === "factor-pairs" ? 60 : 20} {...divisorRangeProjectionMetadata} onChange={chooseFirstNumber} />
          {mode === "factor-pairs" ? (
            <RangeControl controlId="candidateDivisor" label={t(localized("Test divisor", "檢驗除數", "检验除数"))} value={safeDivisor} min={1} max={firstNumber} onChange={chooseCandidateDivisor} />
          ) : (
            <RangeControl controlId="secondNumber" label={t(localized("Second positive integer", "第二個正整數", "第二个正整数"))} value={secondNumber} min={1} max={20} onChange={chooseSecondNumber} />
          )}
          <ResetButton label={t(localized("Reset factors and multiples", "重設因數與倍數", "重置因数与倍数"))} onReset={reset} />
        </>
      }
    />
  );
}

function DecimalsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [decimalValue, setDecimalValue] = useState(1.37);
  const hundred = Math.round(decimalValue * 100);
  const value = hundred / 100;
  const ones = Math.floor(value);
  const tenths = Math.floor((hundred % 100) / 10);
  const hundredths = hundred % 10;
  const markerX = 72 + (value / 2) * 496;
  const lowerTenth = value >= 2 ? 1.9 : Math.floor(value * 10) / 10;
  const hundredthIndex = Math.round((value - lowerTenth) * 100);

  return (
    <ModelShell
      labId="p4-decimals"
      state={{ decimalValue: value }}
      objective={localized("Link ones, tenths, and hundredths to an exact point on a decimal number line.", "把個位、十分位和百分位連繫到小數數線上的準確位置。", "把个位、十分位和百分位连接到小数数线上的准确位置。")}
      formula={mathematicalFormula(`${ones} + ${tenths}/10 + ${hundredths}/100 = ${value.toFixed(2)}`)}
      summary={t(localized(`${value.toFixed(2)} is ${ones} one, ${tenths} tenths, and ${hundredths} hundredths.`, `${value.toFixed(2)} 是 ${ones} 個一、${tenths} 個十分之一和 ${hundredths} 個百分之一。`, `${value.toFixed(2)} 是 ${ones} 个一、${tenths} 个十分之一和 ${hundredths} 个百分之一。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Decimal number line with a magnified hundredths interval", "帶百分位放大區間的小數數線", "带百分位放大区间的小数数线"))}>
          <g data-viz-mark data-viz-name="decimal-number-line" data-viz-value={value.toFixed(2)}>
            <line x1="72" x2="568" y1="118" y2="118" stroke={theme.axisStrong} strokeWidth="5" />
            {Array.from({ length: 21 }, (_, index) => {
              const x = 72 + index * 24.8;
              return <g key={index} data-viz-mark data-viz-name="tenths-tick"><line x1={x} x2={x} y1="104" y2={index % 10 === 0 ? 145 : 134} stroke={theme.axis} strokeWidth={index % 10 === 0 ? 4 : 2} />{index % 5 === 0 ? <text x={x} y="169" textAnchor="middle" fill={theme.tickText} fontSize="14">{(index / 10).toFixed(1)}</text> : null}</g>;
            })}
            <circle data-viz-mark data-viz-name="decimal-marker" cx={markerX} cy="118" r="14" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
            <line data-viz-mark data-viz-name="magnify-connector" x1={markerX} x2="320" y1="140" y2="218" stroke={semantic.parameter} strokeWidth="4" strokeDasharray="7 6" />
          </g>
          <g data-viz-name="hundredths-interval" data-viz-lower={lowerTenth.toFixed(1)} data-viz-hundredth={hundredthIndex}>
            <rect x="116" y="218" width="408" height="100" rx="20" fill={theme.softFill} stroke={semantic.parameter} strokeWidth="3" />
            <line x1="146" x2="494" y1="270" y2="270" stroke={theme.axisStrong} strokeWidth="4" />
            {Array.from({ length: 11 }, (_, index) => {
              const x = 146 + index * 34.8;
              return <line key={index} data-viz-mark data-viz-name="hundredth-tick" x1={x} x2={x} y1="256" y2="286" stroke={theme.axis} strokeWidth={index === hundredthIndex ? 5 : 2} />;
            })}
            <circle data-viz-mark data-viz-name="hundredths-marker" cx={146 + hundredthIndex * 34.8} cy="270" r="12" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="3" />
            <text x="146" y="308" textAnchor="middle" fill={theme.tickText} fontSize="13">{lowerTenth.toFixed(1)}</text>
            <text x="494" y="308" textAnchor="middle" fill={theme.tickText} fontSize="13">{(lowerTenth + 0.1).toFixed(1)}</text>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl controlId="decimalValue" label={t(localized("Decimal value", "小數值", "小数值"))} value={value} min={0} max={2} step={0.01} output={value.toFixed(2)} onChange={(next) => setDecimalValue(Math.round(next * 100) / 100)} />
          <ResetButton label={t(localized("Reset decimal", "重設小數", "重设小数"))} onReset={() => setDecimalValue(1.37)} />
        </>
      }
    />
  );
}

type QuadrilateralMode = "families" | "composition";
type QuadrilateralFamilyShape = "parallelogram" | "rectangle" | "rhombus" | "square";
type QuadrilateralComposition = "rectangle-diagonal" | "square-diagonal" | "trapeziums-rectangle";

type QuadrilateralPoint = { x: number; y: number };
type QuadrilateralDefinition = {
  label: LocalizedText;
  points: readonly [QuadrilateralPoint, QuadrilateralPoint, QuadrilateralPoint, QuadrilateralPoint];
  equalGroups: readonly [number, number, number, number];
  parallelGroups: readonly [number, number, number, number];
  rightAngleCorners: readonly number[];
  properties: LocalizedText;
};

const quadrilateralDefinitions: Record<QuadrilateralFamilyShape, QuadrilateralDefinition> = {
  parallelogram: {
    label: localized("Parallelogram", "平行四邊形", "平行四边形"),
    points: [{ x: 72, y: 98 }, { x: 280, y: 98 }, { x: 330, y: 260 }, { x: 122, y: 260 }],
    equalGroups: [1, 2, 1, 2],
    parallelGroups: [1, 2, 1, 2],
    rightAngleCorners: [],
    properties: localized("Opposite sides are equal; two pairs of opposite sides are parallel.", "對邊相等；有兩對對邊平行。", "对边相等；有两对对边平行。")
  },
  rectangle: {
    label: localized("Rectangle", "長方形", "长方形"),
    points: [{ x: 72, y: 98 }, { x: 330, y: 98 }, { x: 330, y: 260 }, { x: 72, y: 260 }],
    equalGroups: [1, 2, 1, 2],
    parallelGroups: [1, 2, 1, 2],
    rightAngleCorners: [0, 1, 2, 3],
    properties: localized("Opposite sides are equal and parallel; all four corners are right corners.", "對邊相等且平行；四個角都是直角。", "对边相等且平行；四个角都是直角。")
  },
  rhombus: {
    label: localized("Rhombus", "菱形", "菱形"),
    points: [{ x: 201, y: 68 }, { x: 342, y: 179 }, { x: 201, y: 290 }, { x: 60, y: 179 }],
    equalGroups: [1, 1, 1, 1],
    parallelGroups: [1, 2, 1, 2],
    rightAngleCorners: [],
    properties: localized("All four sides are equal; two pairs of opposite sides are parallel.", "四邊相等；有兩對對邊平行。", "四边相等；有两对对边平行。")
  },
  square: {
    label: localized("Square", "正方形", "正方形"),
    points: [{ x: 96, y: 70 }, { x: 310, y: 70 }, { x: 310, y: 284 }, { x: 96, y: 284 }],
    equalGroups: [1, 1, 1, 1],
    parallelGroups: [1, 2, 1, 2],
    rightAngleCorners: [0, 1, 2, 3],
    properties: localized("All four sides are equal and all four corners are right corners.", "四邊相等，而且四個角都是直角。", "四边相等，而且四个角都是直角。")
  }
};

function QuadrilateralCompositionModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<QuadrilateralMode>("families");
  const [familyShape, setFamilyShape] = useState<QuadrilateralFamilyShape>("rhombus");
  const [composition, setComposition] = useState<QuadrilateralComposition>("rectangle-diagonal");
  const definition = quadrilateralDefinitions[familyShape];
  const rightAngleCount = definition.rightAngleCorners.length;
  const points = definition.points.map((point) => `${point.x},${point.y}`).join(" ");
  const compositionFormula = composition === "rectangle-diagonal"
    ? localized("rectangle + one diagonal → 2 congruent right triangles", "長方形加一條對角線 → 2 個全等直角三角形", "长方形加一条对角线 → 2 个全等直角三角形")
    : composition === "square-diagonal"
      ? localized("square + one diagonal → 2 congruent isosceles right triangles", "正方形加一條對角線 → 2 個全等等腰直角三角形", "正方形加一条对角线 → 2 个全等等腰直角三角形")
      : localized("2 congruent right trapeziums → 1 rectangle", "2 個全等直角梯形 → 1 個長方形", "2 个全等直角梯形 → 1 个长方形");

  function reset() {
    setMode("families");
    setFamilyShape("rhombus");
    setComposition("rectangle-diagonal");
  }

  return (
    <ModelShell
      labId="p4-angles"
      state={{ mode, familyShape, composition, rightAngleCount }}
      objective={localized("Use visible equal-side, parallel-side, and right-angle marks to organise quadrilateral families, then compose an outer shape from two congruent pieces.", "運用可見的等邊、平行邊和直角記號整理四邊形家族，再用兩個全等部分拼成外框圖形。", "运用可见的等边、平行边和直角记号整理四边形家族，再用两个全等部分拼成外框图形。")}
      formula={mode === "families"
        ? localized(
          "square ⊆ rectangle; square ⊆ rhombus; rectangle ⊆ parallelogram; rhombus ⊆ parallelogram",
          "正方形 ⊆ 長方形；正方形 ⊆ 菱形；長方形 ⊆ 平行四邊形；菱形 ⊆ 平行四邊形",
          "正方形 ⊆ 长方形；正方形 ⊆ 菱形；长方形 ⊆ 平行四边形；菱形 ⊆ 平行四边形"
        )
        : compositionFormula}
      summary={mode === "families"
        ? t(localized(`${definition.label.en}: ${definition.properties.en} The arrows point only from a subset to a larger family.`, `${definition.label.zh}：${definition.properties.zh} 箭嘴只由子集指向較大的家族。`, `${definition.label.zhHans}：${definition.properties.zhHans} 箭头只由子集指向较大的家族。`))
        : t(compositionFormula)}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Quadrilateral family inclusion and shape composition", "四邊形家族包含關係與圖形拼合", "四边形家族包含关系与图形拼合"))}>
          {mode === "families" ? (
            <g data-viz-mark data-viz-name="quadrilateral-families" data-viz-selected-shape={familyShape}>
              <g data-viz-mark data-viz-name="quadrilateral-outline" data-viz-shape={familyShape} data-viz-equal-side-count={familyShape === "rhombus" || familyShape === "square" ? 4 : 2} data-viz-parallel-pair-count="2" data-viz-right-angle-count={rightAngleCount}>
                <polygon points={points} fill="rgba(34,211,238,.18)" stroke={theme.axisStrong} strokeWidth="4" strokeLinejoin="round" />
                {definition.points.map((point, index) => {
                  const next = definition.points[(index + 1) % definition.points.length];
                  const equalMarker = pointOnSegment(point, next, 0.42);
                  const parallelMarker = pointOnSegment(point, next, 0.64);
                  const equalGroup = definition.equalGroups[index];
                  const parallelGroup = definition.parallelGroups[index];
                  return (
                    <g key={index} data-viz-mark data-viz-name="quadrilateral-side" data-viz-side={index + 1} data-viz-equal-group={equalGroup} data-viz-parallel-group={parallelGroup}>
                      <line x1={point.x} y1={point.y} x2={next.x} y2={next.y} stroke={theme.axisStrong} strokeWidth="8" strokeLinecap="round" opacity="0.82" />
                      <g data-viz-mark data-viz-name="equal-side-mark" data-viz-group={equalGroup} data-viz-marker-count={equalGroup} data-viz-group-pattern={`${equalGroup}-ticks`}>
                        {Array.from({ length: equalGroup }, (_, markerIndex) => (
                          <circle key={markerIndex} cx={equalMarker.x + (markerIndex - (equalGroup - 1) / 2) * 11} cy={equalMarker.y} r="4" fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="2.5" />
                        ))}
                      </g>
                      <g data-viz-mark data-viz-name="parallel-side-mark" data-viz-group={parallelGroup} data-viz-marker-count={parallelGroup} data-viz-group-pattern={`${parallelGroup}-diamonds`}>
                        {Array.from({ length: parallelGroup }, (_, markerIndex) => {
                          const markerX = parallelMarker.x + (markerIndex - (parallelGroup - 1) / 2) * 12;
                          return <rect key={markerIndex} x={markerX - 5} y={parallelMarker.y - 5} width="10" height="10" transform={`rotate(45 ${markerX} ${parallelMarker.y})`} fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="2.5" />;
                        })}
                      </g>
                    </g>
                  );
                })}
                <g
                  data-viz-mark
                  data-viz-name="right-angle-marks"
                  data-viz-shape={familyShape}
                  data-viz-right-angle-count={rightAngleCount}
                >
                  {definition.rightAngleCorners.map((cornerIndex) => {
                    const corner = definition.points[cornerIndex];
                    const previous = definition.points[(cornerIndex + definition.points.length - 1) % definition.points.length];
                    const next = definition.points[(cornerIndex + 1) % definition.points.length];
                    const previousLength = Math.hypot(previous.x - corner.x, previous.y - corner.y);
                    const nextLength = Math.hypot(next.x - corner.x, next.y - corner.y);
                    const previousUnit = {
                      x: (previous.x - corner.x) / previousLength,
                      y: (previous.y - corner.y) / previousLength
                    };
                    const nextUnit = {
                      x: (next.x - corner.x) / nextLength,
                      y: (next.y - corner.y) / nextLength
                    };
                    const markerSize = 22;
                    const first = {
                      x: corner.x + previousUnit.x * markerSize,
                      y: corner.y + previousUnit.y * markerSize
                    };
                    const middle = {
                      x: first.x + nextUnit.x * markerSize,
                      y: first.y + nextUnit.y * markerSize
                    };
                    const last = {
                      x: corner.x + nextUnit.x * markerSize,
                      y: corner.y + nextUnit.y * markerSize
                    };
                    return (
                      <path
                        key={cornerIndex}
                        data-viz-mark
                        data-viz-name="right-angle-mark"
                        data-viz-angle-kind="right"
                        data-viz-corner={cornerIndex + 1}
                        data-viz-evidence="square-corner"
                        d={`M${first.x} ${first.y} L${middle.x} ${middle.y} L${last.x} ${last.y}`}
                        fill="none"
                        stroke={semantic.attention}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </g>
                <text x="201" y="332" textAnchor="middle" fill={theme.text} fontSize="17" fontWeight="900">{t(definition.label)}</text>
              </g>
              <g data-viz-mark data-viz-name="family-inclusion-map" data-viz-direction="subset-to-superset">
                <g data-viz-name="family-node" data-viz-family="parallelogram" data-viz-overlap-ok="label-inside-own-parallelogram-family-node" data-viz-overlap-reason="The family name is intentionally centered inside its own parallelogram node."><rect data-viz-mark data-viz-overlap-member="mark" x="420" y="48" width="168" height="42" rx="13" fill={semantic.parameter} /><text data-viz-overlap-member="label" x="504" y="75" textAnchor="middle" fill="#2e1065" fontSize="14" fontWeight="900">{t(quadrilateralDefinitions.parallelogram.label)}</text></g>
                <g data-viz-name="family-node" data-viz-family="rectangle" data-viz-overlap-ok="label-inside-own-rectangle-family-node" data-viz-overlap-reason="The family name is intentionally centered inside its own rectangle node."><rect data-viz-mark data-viz-overlap-member="mark" x="352" y="150" width="126" height="42" rx="13" fill={semantic.main} /><text data-viz-overlap-member="label" x="415" y="177" textAnchor="middle" fill="#082f49" fontSize="14" fontWeight="900">{t(quadrilateralDefinitions.rectangle.label)}</text></g>
                <g data-viz-name="family-node" data-viz-family="rhombus" data-viz-overlap-ok="label-inside-own-rhombus-family-node" data-viz-overlap-reason="The family name is intentionally centered inside its own rhombus node."><rect data-viz-mark data-viz-overlap-member="mark" x="510" y="150" width="112" height="42" rx="13" fill={semantic.change} /><text data-viz-overlap-member="label" x="566" y="177" textAnchor="middle" fill="#451a03" fontSize="14" fontWeight="900">{t(quadrilateralDefinitions.rhombus.label)}</text></g>
                <g data-viz-name="family-node" data-viz-family="square" data-viz-overlap-ok="label-inside-own-square-family-node" data-viz-overlap-reason="The family name is intentionally centered inside its own square node."><rect data-viz-mark data-viz-overlap-member="mark" x="428" y="258" width="132" height="42" rx="13" fill={semantic.result} /><text data-viz-overlap-member="label" x="494" y="285" textAnchor="middle" fill="#052e16" fontSize="14" fontWeight="900">{t(quadrilateralDefinitions.square.label)}</text></g>
                <path data-viz-mark data-viz-name="subset-arrow" data-viz-from="rectangle" data-viz-to="parallelogram" d="M430 146 L480 96" fill="none" stroke={theme.axisStrong} strokeWidth="4" markerEnd="url(#quadrilateral-arrow)" />
                <path data-viz-mark data-viz-name="subset-arrow" data-viz-from="rhombus" data-viz-to="parallelogram" d="M554 146 L526 96" fill="none" stroke={theme.axisStrong} strokeWidth="4" markerEnd="url(#quadrilateral-arrow)" />
                <path data-viz-mark data-viz-name="subset-arrow" data-viz-from="square" data-viz-to="rectangle" d="M470 254 L430 198" fill="none" stroke={theme.axisStrong} strokeWidth="4" markerEnd="url(#quadrilateral-arrow)" />
                <path data-viz-mark data-viz-name="subset-arrow" data-viz-from="square" data-viz-to="rhombus" d="M520 254 L552 198" fill="none" stroke={theme.axisStrong} strokeWidth="4" markerEnd="url(#quadrilateral-arrow)" />
                <defs><marker id="quadrilateral-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill={theme.axisStrong} /></marker></defs>
              </g>
            </g>
          ) : (
            <g data-viz-mark data-viz-name="shape-composition" data-viz-composition={composition} data-viz-piece-count="2" data-viz-congruent="true">
              {composition === "rectangle-diagonal" ? (
                <>
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="1" data-viz-piece-type="right-triangle" points="120,76 520,76 520,286" fill="rgba(34,211,238,.35)" stroke={semantic.main} strokeWidth="4" />
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="2" data-viz-piece-type="right-triangle" points="120,76 520,286 120,286" fill="rgba(245,158,11,.35)" stroke={semantic.change} strokeWidth="4" />
                  <rect data-viz-mark data-viz-name="composition-boundary" data-viz-outer-shape="rectangle" x="120" y="76" width="400" height="210" fill="none" stroke={theme.axisStrong} strokeWidth="6" />
                </>
              ) : composition === "square-diagonal" ? (
                <>
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="1" data-viz-piece-type="isosceles-right-triangle" points="190,54 450,54 450,314" fill="rgba(34,211,238,.35)" stroke={semantic.main} strokeWidth="4" />
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="2" data-viz-piece-type="isosceles-right-triangle" points="190,54 450,314 190,314" fill="rgba(245,158,11,.35)" stroke={semantic.change} strokeWidth="4" />
                  <rect data-viz-mark data-viz-name="composition-boundary" data-viz-outer-shape="square" x="190" y="54" width="260" height="260" fill="none" stroke={theme.axisStrong} strokeWidth="6" />
                </>
              ) : (
                <>
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="1" data-viz-piece-type="right-trapezium" points="120,76 250,76 390,286 120,286" fill="rgba(34,211,238,.35)" stroke={semantic.main} strokeWidth="4" />
                  <polygon data-viz-mark data-viz-name="composition-piece" data-viz-piece="2" data-viz-piece-type="right-trapezium" points="250,76 520,76 520,286 390,286" fill="rgba(245,158,11,.35)" stroke={semantic.change} strokeWidth="4" />
                  <rect data-viz-mark data-viz-name="composition-boundary" data-viz-outer-shape="rectangle" x="120" y="76" width="400" height="210" fill="none" stroke={theme.axisStrong} strokeWidth="6" />
                </>
              )}
              <text x="320" y="340" textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">{t(compositionFormula)}</text>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "families", label: t(localized("Quadrilateral families", "四邊形家族", "四边形家族")) },
            { value: "composition", label: t(localized("Shape composition", "圖形拼合", "图形拼合")) }
          ]} onChange={setMode} />
          {mode === "families" ? (
            <ModeButtons groupId="family-shape" label={t(localized("Quadrilateral", "四邊形", "四边形"))} value={familyShape} options={(
              ["parallelogram", "rectangle", "rhombus", "square"] as const
            ).map((value) => ({ value, label: t(quadrilateralDefinitions[value].label) }))} onChange={setFamilyShape} />
          ) : (
            <ModeButtons groupId="composition" label={t(localized("Composition", "拼合方式", "拼合方式"))} value={composition} options={[
              { value: "rectangle-diagonal", label: t(localized("Rectangle diagonal", "長方形對角線", "长方形对角线")) },
              { value: "square-diagonal", label: t(localized("Square diagonal", "正方形對角線", "正方形对角线")) },
              { value: "trapeziums-rectangle", label: t(localized("Two trapeziums", "兩個梯形", "两个梯形")) }
            ]} onChange={setComposition} />
          )}
          <ResetButton label={t(localized("Reset quadrilateral model", "重設四邊形模型", "重置四边形模型"))} onReset={reset} />
        </>
      }
    />
  );
}

type PerimeterAreaFocus = "both" | "perimeter" | "area";

function PerimeterAreaModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [length, setLength] = useState(7);
  const [width, setWidth] = useState(4);
  const [focus, setFocus] = useState<PerimeterAreaFocus>("both");
  const perimeter = 2 * (length + width);
  const area = length * width;
  const cell = Math.min(48, 390 / length, 230 / width);
  const plotWidth = length * cell;
  const plotHeight = width * cell;
  const x = 320 - plotWidth / 2;
  const y = 180 - plotHeight / 2;

  return (
    <ModelShell
      labId="p4-perimeter-area"
      state={{ length, width, focus }}
      objective={localized("See perimeter on the boundary and area in the covered unit squares of one rectangle.", "在同一長方形上觀察外圍的周界和內部方格的面積。", "在同一长方形上观察外围的周长和内部方格的面积。")}
      formula={mathematicalFormula(`P = 2(${length} + ${width}) = ${perimeter}; A = ${length} × ${width} = ${area}`)}
      summary={t(localized(`The boundary is ${perimeter} units long and the inside covers ${area} square units. Focus: ${focus}.`, `外圍長 ${perimeter} 個單位，內部覆蓋 ${area} 個平方單位。焦點：${focus === "both" ? "兩者" : focus === "perimeter" ? "周界" : "面積"}。`, `外围长 ${perimeter} 个单位，内部覆盖 ${area} 个平方单位。焦点：${focus === "both" ? "两者" : focus === "perimeter" ? "周长" : "面积"}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Rectangle boundary and interior unit-square grid", "長方形外圍和內部單位方格", "长方形外围和内部单位方格"))}>
          <g data-viz-mark data-viz-name="rectangle-grid" data-viz-length={length} data-viz-width={width} data-viz-area={area}>
            {Array.from({ length: width }, (_, row) => Array.from({ length }, (_, col) => (
              <rect key={`${row}-${col}`} data-viz-mark data-viz-name="unit-square" x={x + col * cell} y={y + row * cell} width={cell} height={cell} fill={focus === "perimeter" ? theme.emptyFill : "rgba(52,211,153,.32)"} stroke={theme.gridStrong} strokeWidth="1.5" />
            )))}
            <rect data-viz-mark data-viz-name="rectangle-boundary" data-viz-perimeter={perimeter} x={x} y={y} width={plotWidth} height={plotHeight} fill="none" stroke={focus === "area" ? semantic.reference : semantic.change} strokeWidth="9" />
          </g>
          <g data-viz-mark data-viz-name="dimension-arrows">
            <line x1={x} x2={x + plotWidth} y1={y + plotHeight + 20} y2={y + plotHeight + 20} stroke={semantic.main} strokeWidth="4" />
            <line x1={x - 28} x2={x - 28} y1={y} y2={y + plotHeight} stroke={semantic.parameter} strokeWidth="4" />
            <text x={320} y={y + plotHeight + 42} textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">{length}</text>
            <text x={x - 48} y={180} textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">{width}</text>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="focus" label={t(localized("Highlight", "顯示重點", "显示重点"))} value={focus} options={[
            { value: "both", label: t(localized("Both", "兩者", "两者")) },
            { value: "perimeter", label: t(localized("Boundary", "周界", "周长")) },
            { value: "area", label: t(localized("Inside", "面積", "面积")) }
          ]} onChange={setFocus} />
          <RangeControl controlId="length" label={t(localized("Length", "長", "长"))} value={length} min={2} max={10} onChange={setLength} />
          <RangeControl controlId="width" label={t(localized("Width", "闊", "宽"))} value={width} min={2} max={8} onChange={setWidth} />
          <ResetButton label={t(localized("Reset rectangle", "重設長方形", "重设长方形"))} onReset={() => { setLength(7); setWidth(4); setFocus("both"); }} />
        </>
      }
    />
  );
}

type FractionOperation = "add" | "subtract";
type FractionTermCount = "two" | "three";

function lcm(first: number, second: number) {
  return Math.abs(first * second) / gcd(first, second);
}

function FractionOperationsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [operation, setOperation] = useState<FractionOperation>("add");
  const [termCount, setTermCount] = useState<FractionTermCount>("three");
  const [firstNumerator, setFirstNumerator] = useState(1);
  const [firstDenominator, setFirstDenominator] = useState(2);
  const [secondNumerator, setSecondNumerator] = useState(1);
  const [secondDenominator, setSecondDenominator] = useState(3);
  const [thirdNumerator, setThirdNumerator] = useState(1);
  const [thirdDenominator, setThirdDenominator] = useState(4);
  const commonTwo = lcm(firstDenominator, secondDenominator);
  const commonDenominator = termCount === "three" ? lcm(commonTwo, thirdDenominator) : commonTwo;
  const sign = operation === "add" ? 1 : -1;
  const firstCommon = firstNumerator * (commonDenominator / firstDenominator);
  const secondCommon = secondNumerator * (commonDenominator / secondDenominator);
  const thirdCommon = termCount === "three" ? thirdNumerator * (commonDenominator / thirdDenominator) : 0;
  const resultNumerator = firstCommon + sign * secondCommon + sign * thirdCommon;
  const divisor = gcd(resultNumerator, commonDenominator);
  const simplifiedNumerator = resultNumerator / divisor;
  const simplifiedDenominator = commonDenominator / divisor;
  const sourceFractions = [
    { numerator: firstNumerator, denominator: firstDenominator, commonNumerator: firstCommon, color: semantic.main },
    { numerator: secondNumerator, denominator: secondDenominator, commonNumerator: secondCommon, color: semantic.change },
    ...(termCount === "three" ? [{ numerator: thirdNumerator, denominator: thirdDenominator, commonNumerator: thirdCommon, color: semantic.parameter }] : [])
  ];
  const resultValue = resultNumerator / commonDenominator;
  const resultX = 320 + clamp(resultValue, -3, 3) * 82;
  const symbol = operation === "add" ? "+" : "−";
  const sourceFormula = sourceFractions.map((fraction) => `${fraction.numerator}/${fraction.denominator}`).join(` ${symbol} `);

  function reset() {
    setOperation("add");
    setTermCount("three");
    setFirstNumerator(1);
    setFirstDenominator(2);
    setSecondNumerator(1);
    setSecondDenominator(3);
    setThirdNumerator(1);
    setThirdDenominator(4);
  }

  return (
    <ModelShell
      labId="p5-fractions-operations"
      state={{
        operation,
        termCount,
        firstFraction: `${firstNumerator}/${firstDenominator}`,
        secondFraction: `${secondNumerator}/${secondDenominator}`,
        thirdFraction: `${thirdNumerator}/${thirdDenominator}`
      }}
      objective={localized("Rename two or three unlike fractions over one common partition before adding or subtracting.", "先把兩個或三個異分母分數改寫成共同分割，再進行加減。", "先把两个或三个异分母分数改写成共同分割，再进行加减。")}
      formula={mathematicalFormula(`${sourceFormula} = ${resultNumerator}/${commonDenominator} = ${simplifiedNumerator}/${simplifiedDenominator}`)}
      summary={t(localized(`The least common partition has ${commonDenominator} equal pieces. The result ${resultNumerator}/${commonDenominator} simplifies to ${simplifiedNumerator}/${simplifiedDenominator}.`, `最小共同分割有 ${commonDenominator} 等份。結果 ${resultNumerator}/${commonDenominator} 約簡為 ${simplifiedNumerator}/${simplifiedDenominator}。`, `最小共同分割有 ${commonDenominator} 等份。结果 ${resultNumerator}/${commonDenominator} 约分为 ${simplifiedNumerator}/${simplifiedDenominator}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Unlike fraction bars converted to a common partition and combined", "異分母分數條轉成共同分割後合併", "异分母分数条转成共同分割后合并"))}>
          <g data-viz-mark data-viz-name="source-bars" data-viz-common-denominator={commonDenominator}>
            {sourceFractions.map((fraction, row) => {
              const y = 52 + row * 70;
              const commonPieceWidth = 360 / commonDenominator;
              return (
                <g
                  key={row}
                  data-viz-mark
                  data-viz-name="source-fraction-bar"
                  data-viz-numerator={fraction.numerator}
                  data-viz-denominator={fraction.denominator}
                  data-viz-common-numerator={fraction.commonNumerator}
                  data-viz-common-denominator={commonDenominator}
                >
                  <rect x="170" y={y} width="360" height="44" rx="10" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="3" />
                  {Array.from({ length: commonDenominator }, (_, index) => (
                    <rect
                      key={index}
                      data-viz-mark
                      data-viz-name="common-partition-part"
                      data-viz-filled={String(index < fraction.commonNumerator)}
                      x={170 + index * commonPieceWidth}
                      y={y}
                      width={commonPieceWidth}
                      height="44"
                      fill={index < fraction.commonNumerator ? fraction.color : "transparent"}
                      stroke={theme.gridStrong}
                      strokeWidth={commonDenominator > 24 ? 0.65 : 1.2}
                    />
                  ))}
                  <text x="94" y={y + 28} textAnchor="middle" fill={fraction.color} fontSize="13" fontWeight="900">{fraction.numerator}/{fraction.denominator} ≡ {fraction.commonNumerator}/{commonDenominator}</text>
                  {row > 0 ? <text x="151" y={y + 29} textAnchor="middle" fill={theme.textMuted} fontSize="20" fontWeight="900">{symbol}</text> : null}
                </g>
              );
            })}
          </g>
          <g data-viz-mark data-viz-name="signed-result-line" data-viz-common-denominator={commonDenominator} data-viz-result-numerator={resultNumerator}>
            <line x1="74" x2="566" y1="302" y2="302" stroke={theme.axisStrong} strokeWidth="5" />
            {[-3, -2, -1, 0, 1, 2, 3].map((value) => <g key={value}><line x1={320 + value * 82} x2={320 + value * 82} y1="290" y2="314" stroke={theme.axis} strokeWidth={value === 0 ? 4 : 2} /><text x={320 + value * 82} y="340" textAnchor="middle" fill={theme.tickText} fontSize="13">{value}</text></g>)}
            <line data-viz-mark data-viz-name="signed-result-bar" x1="320" x2={resultX} y1="302" y2="302" stroke={resultValue >= 0 ? semantic.result : semantic.attention} strokeWidth="15" strokeLinecap="round" />
            <circle data-viz-mark data-viz-name="result-marker" data-viz-value={resultValue} cx={resultX} cy="302" r="13" fill={resultValue >= 0 ? semantic.result : semantic.attention} stroke={theme.pointStroke} strokeWidth="3" />
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="operation" label={t(localized("Operation", "運算", "运算"))} value={operation} options={[
            { value: "add", label: t(localized("Add", "加", "加")) },
            { value: "subtract", label: t(localized("Subtract", "減", "减")) }
          ]} onChange={setOperation} />
          <ModeButtons groupId="term-count" label={t(localized("Number of fractions", "分數數目", "分数数目"))} value={termCount} options={[
            { value: "two", label: t(localized("Two", "兩個", "两个")) },
            { value: "three", label: t(localized("Three", "三個", "三个")) }
          ]} onChange={setTermCount} />
          <div className="rounded-2xl border border-cyan-200/70 p-3 dark:border-cyan-400/20">
            <RangeControl controlId="firstNumerator" label={t(localized("First numerator", "第一個分子", "第一个分子"))} value={firstNumerator} min={0} max={firstDenominator - 1} onChange={setFirstNumerator} />
            <RangeControl controlId="firstDenominator" label={t(localized("First denominator", "第一個分母", "第一个分母"))} value={firstDenominator} min={2} max={6} rangeAffects="firstNumerator" rangeProjection="clamp-max" rangeProjectionReason="proper-fraction-numerator-must-be-below-denominator" onChange={(value) => { setFirstDenominator(value); setFirstNumerator((current) => Math.min(current, value - 1)); }} />
          </div>
          <div className="rounded-2xl border border-amber-200/70 p-3 dark:border-amber-400/20">
            <RangeControl controlId="secondNumerator" label={t(localized("Second numerator", "第二個分子", "第二个分子"))} value={secondNumerator} min={0} max={secondDenominator - 1} onChange={setSecondNumerator} />
            <RangeControl controlId="secondDenominator" label={t(localized("Second denominator", "第二個分母", "第二个分母"))} value={secondDenominator} min={2} max={6} rangeAffects="secondNumerator" rangeProjection="clamp-max" rangeProjectionReason="proper-fraction-numerator-must-be-below-denominator" onChange={(value) => { setSecondDenominator(value); setSecondNumerator((current) => Math.min(current, value - 1)); }} />
          </div>
          {termCount === "three" ? (
            <div className="rounded-2xl border border-violet-200/70 p-3 dark:border-violet-400/20">
              <RangeControl controlId="thirdNumerator" label={t(localized("Third numerator", "第三個分子", "第三个分子"))} value={thirdNumerator} min={0} max={thirdDenominator - 1} onChange={setThirdNumerator} />
              <RangeControl controlId="thirdDenominator" label={t(localized("Third denominator", "第三個分母", "第三个分母"))} value={thirdDenominator} min={2} max={6} rangeAffects="thirdNumerator" rangeProjection="clamp-max" rangeProjectionReason="proper-fraction-numerator-must-be-below-denominator" onChange={(value) => { setThirdDenominator(value); setThirdNumerator((current) => Math.min(current, value - 1)); }} />
            </div>
          ) : null}
          <ResetButton label={t(localized("Reset fractions", "重設分數", "重设分数"))} onReset={reset} />
        </>
      }
    />
  );
}

function UnitCube({ x, y, size = 22 }: { x: number; y: number; size?: number }) {
  const half = size;
  const rise = size * 0.52;
  const height = size * 1.08;
  return (
    <g data-viz-mark data-viz-name="unit-cube">
      <polygon points={`${x},${y - height} ${x + half},${y - height + rise} ${x},${y - height + rise * 2} ${x - half},${y - height + rise}`} fill="#67e8f9" stroke="#0f172a" strokeWidth="1.5" />
      <polygon points={`${x - half},${y - height + rise} ${x},${y - height + rise * 2} ${x},${y} ${x - half},${y - rise}`} fill="#22d3ee" stroke="#0f172a" strokeWidth="1.5" />
      <polygon points={`${x + half},${y - height + rise} ${x},${y - height + rise * 2} ${x},${y} ${x + half},${y - rise}`} fill="#0ea5e9" stroke="#0f172a" strokeWidth="1.5" />
    </g>
  );
}

function VolumeModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [length, setLength] = useState(4);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [visibleLayers, setVisibleLayers] = useState(2);
  const volume = length * width * height;
  const layerSize = length * width;
  const layers = clamp(visibleLayers, 1, height);
  const cubeOriginX = 320;
  const cubeOriginY = 258;
  const cubeStepX = 22;
  const cubeStepY = 11;
  const cubeLayerRise = 25;
  const footprintTopY = cubeOriginY - 24;
  const cubes = Array.from({ length: layers }, (_, z) =>
    Array.from({ length: width }, (_, row) =>
      Array.from({ length }, (_, column) => ({ z, row, column }))
    )
  ).flat(2);

  return (
    <ModelShell
      labId="p5-volume"
      state={{ length, width, height, visibleLayers: layers }}
      objective={localized("See a cuboid as equal layers of unit cubes and connect its three dimensions to volume.", "把長方體看成相等的單位立方體層，並把三個尺寸連繫到體積。", "把长方体看成相等的单位正方体层，并把三个尺寸连接到体积。")}
      formula={localized(
        `V = ${length} × ${width} × ${height} = ${volume} cubic units`,
        `V = ${length} × ${width} × ${height} = ${volume} 個立方單位`,
        `V = ${length} × ${width} × ${height} = ${volume} 个立方单位`
      )}
      summary={t(localized(`Each layer has ${length} × ${width} = ${layerSize} cubes. ${height} layers make ${volume} cubes; ${layers} ${layers === 1 ? "layer is" : "layers are"} currently revealed.`, `每層有 ${length} × ${width} = ${layerSize} 個立方體。${height} 層共有 ${volume} 個；現在顯示 ${layers} 層。`, `每层有 ${length} × ${width} = ${layerSize} 个正方体。${height} 层共有 ${volume} 个；现在显示 ${layers} 层。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Cuboid built from visible unit-cube layers", "由可見單位立方體層建成的長方體", "由可见单位正方体层建成的长方体"))}>
          <g data-viz-mark data-viz-name="cuboid-footprint" data-viz-length={length} data-viz-width={width} data-viz-height={height} data-viz-volume={volume}>
            <polygon
              points={`${cubeOriginX},${footprintTopY} ${cubeOriginX + length * cubeStepX},${footprintTopY + length * cubeStepY} ${cubeOriginX + (length - width) * cubeStepX},${footprintTopY + (length + width) * cubeStepY} ${cubeOriginX - width * cubeStepX},${footprintTopY + width * cubeStepY}`}
              fill={theme.softFill}
              stroke={semantic.parameter}
              strokeWidth="4"
              strokeDasharray="8 6"
            />
          </g>
          <g data-viz-mark data-viz-name="layer-stack" data-viz-visible-layers={layers} data-viz-total-layers={height} data-viz-layer-size={layerSize} data-viz-volume={volume}>
            {cubes
              .sort((a, b) => a.z - b.z || (a.row + a.column) - (b.row + b.column) || a.row - b.row)
              .map(({ z, row, column }) => (
                <g key={`${z}-${row}-${column}`} data-viz-layer={z + 1}>
                  <UnitCube x={cubeOriginX + (column - row) * cubeStepX} y={cubeOriginY + (column + row) * cubeStepY - z * cubeLayerRise} />
                </g>
              ))}
          </g>
          <g data-viz-mark data-viz-name="dimension-arrows">
            <line x1="94" x2="94" y1={cubeOriginY - (height - 1) * cubeLayerRise - 42} y2="306" stroke={semantic.change} strokeWidth="5" />
            <polygon points={`94,${cubeOriginY - (height - 1) * cubeLayerRise - 42} 84,${cubeOriginY - (height - 1) * cubeLayerRise - 22} 104,${cubeOriginY - (height - 1) * cubeLayerRise - 22}`} fill={semantic.change} />
            <text x="70" y="210" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">h={height}</text>
            <text x="500" y="326" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">l={length}</text>
            <text x="164" y="326" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">w={width}</text>
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl controlId="length" label={t(localized("Length in cubes", "長（立方體數）", "长（正方体数）"))} value={length} min={1} max={5} onChange={setLength} />
          <RangeControl controlId="width" label={t(localized("Width in cubes", "闊（立方體數）", "宽（正方体数）"))} value={width} min={1} max={4} onChange={setWidth} />
          <RangeControl controlId="height" label={t(localized("Height in layers", "高（層數）", "高（层数）"))} value={height} min={1} max={4} rangeAffects="visibleLayers" rangeProjection="clamp-max" rangeProjectionReason="revealed-layers-must-not-exceed-height" onChange={(value) => { setHeight(value); setVisibleLayers((current) => Math.min(current, value)); }} />
          <RangeControl controlId="visibleLayers" label={t(localized("Layers revealed", "顯示層數", "显示层数"))} value={layers} min={1} max={height} onChange={setVisibleLayers} />
          <ResetButton label={t(localized("Reset cuboid", "重設長方體", "重设长方体"))} onReset={() => { setLength(4); setWidth(3); setHeight(3); setVisibleLayers(2); }} />
        </>
      }
    />
  );
}

function RatesModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [totalPrice, setTotalPrice] = useState(24);
  const [itemCount, setItemCount] = useState(4);
  const [targetCount, setTargetCount] = useState(7);
  const unitPrice = totalPrice / itemCount;
  const targetPrice = unitPrice * targetCount;
  const unitPriceDisplay = quotientDisplay(totalPrice, itemCount, "HK$");
  const targetPriceDisplay = quotientDisplay(totalPrice * targetCount, itemCount, "HK$");

  return (
    <ModelShell
      labId="p5-rates"
      state={{ totalPrice, itemCount, targetCount }}
      objective={localized("Share a total price equally to find the price of one item, then scale to another number of items.", "把總價平均分配以找出一件的價格，再按另一件數倍增。", "把总价平均分配以找出一件的价格，再按另一件数倍增。")}
      formula={localized(
        `HK$${totalPrice} ÷ ${itemCount} = ${unitPriceDisplay} each; ${targetCount} items = ${targetPriceDisplay}`,
        `HK$${totalPrice} ÷ ${itemCount} = 每件 ${unitPriceDisplay}；${targetCount} 件 = ${targetPriceDisplay}`,
        `HK$${totalPrice} ÷ ${itemCount} = 每件 ${unitPriceDisplay}；${targetCount} 件 = ${targetPriceDisplay}`
      )}
      summary={t(localized(`${itemCount} equal items cost HK$${totalPrice}. The exact one-item price is shown before any decimal approximation: ${unitPriceDisplay}; ${targetCount} items cost ${targetPriceDisplay}.`, `${itemCount} 件等價物品共 HK$${totalPrice}。單價先顯示精確值，再顯示小數近似值：${unitPriceDisplay}；${targetCount} 件共 ${targetPriceDisplay}。`, `${itemCount} 件等价物品共 HK$${totalPrice}。单价先显示精确值，再显示小数近似值：${unitPriceDisplay}；${targetCount} 件共 ${targetPriceDisplay}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Equal price groups, one-item price, and scaled target group", "等價價格組、一件價格和倍增目標組", "等价价格组、一件价格和倍增目标组"))}>
          <g data-viz-mark data-viz-name="equal-price-groups" data-viz-items={itemCount} data-viz-total-price={totalPrice}>
            <rect x="74" y="72" width="492" height="68" rx="16" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="3" />
            {Array.from({ length: itemCount }, (_, index) => (
              <g key={index} data-viz-mark data-viz-name="equal-price-segment" data-viz-unit-price={formatDecimal(unitPrice)}>
                <rect x={74 + index * (492 / itemCount)} y="72" width={492 / itemCount} height="68" fill={index % 2 === 0 ? "rgba(34,211,238,.42)" : "rgba(167,139,250,.42)"} stroke={theme.gridStrong} strokeWidth="2" />
              </g>
            ))}
          </g>
          <path data-viz-mark data-viz-name="unitary-arrow" d="M320 152 V202" stroke={theme.axisStrong} strokeWidth="5" />
          <polygon points="320,202 308,182 332,182" fill={theme.axisStrong} />
          <g
            data-viz-name="one-item-price"
            data-viz-unit-price={formatDecimal(unitPrice)}
            data-viz-overlap-ok="label-inside-own-unit-price-card"
            data-viz-overlap-reason="The one-item price is intentionally centered inside its own unit-price card."
          >
            <rect data-viz-mark data-viz-overlap-member="mark" x="140" y="210" width="360" height="64" rx="18" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-overlap-member="label" x="320" y="250" textAnchor="middle" fill="#052e16" fontSize="16" fontWeight="900">1 = {quotientDisplay(totalPrice, itemCount, "HK$")}</text>
          </g>
          <g data-viz-mark data-viz-name="scaled-target-group" data-viz-target-count={targetCount} data-viz-target-price={formatDecimal(targetPrice)}>
            {Array.from({ length: targetCount }, (_, index) => <circle key={index} data-viz-mark data-viz-name="target-item" cx={130 + index * (380 / Math.max(1, targetCount - 1))} cy="318" r="15" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="2" />)}
          </g>
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl controlId="totalPrice" label={t(localized("Total price (HK$)", "總價（港幣）", "总价（港币）"))} value={totalPrice} min={4} max={100} onChange={setTotalPrice} />
          <RangeControl controlId="itemCount" label={t(localized("Equal item count", "等價物品數目", "等价物品数目"))} value={itemCount} min={1} max={10} onChange={setItemCount} />
          <RangeControl controlId="targetCount" label={t(localized("Target item count", "目標物品數目", "目标物品数目"))} value={targetCount} min={1} max={10} onChange={setTargetCount} />
          <ResetButton label={t(localized("Reset unitary price", "重設單一價格", "重设单一价格"))} onReset={() => { setTotalPrice(24); setItemCount(4); setTargetCount(7); }} />
        </>
      }
    />
  );
}

function CompositeChartsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [selectedCategory, setSelectedCategory] = useState<"A" | "B" | "C" | "D">("B");
  const [firstSeries, setFirstSeries] = useState([6, 8, 5, 9]);
  const [secondSeries, setSecondSeries] = useState([4, 7, 8, 6]);
  const categories = ["A", "B", "C", "D"] as const;
  const selectedIndex = categories.indexOf(selectedCategory);
  const firstValue = firstSeries[selectedIndex];
  const secondValue = secondSeries[selectedIndex];
  const difference = secondValue - firstValue;
  const scale = 23;
  const comparisonCopy = difference === 0
    ? localized("the two series are equal", "兩組相同", "两组相同")
    : difference > 0
      ? localized(`series 2 is ${difference} higher`, `第二組高 ${difference}`, `第二组高 ${difference}`)
      : localized(`series 2 is ${Math.abs(difference)} lower`, `第二組低 ${Math.abs(difference)}`, `第二组低 ${Math.abs(difference)}`);

  function updateSeries(setter: typeof setFirstSeries, value: number) {
    setter((current) => current.map((entry, index) => index === selectedIndex ? value : entry));
  }

  function reset() {
    setSelectedCategory("B");
    setFirstSeries([6, 8, 5, 9]);
    setSecondSeries([4, 7, 8, 6]);
  }

  return (
    <ModelShell
      labId="p5-charts-averages"
      state={{ selectedCategory, firstSeries, secondSeries }}
      objective={localized("Read paired bars on one shared scale and compare two series category by category.", "在同一刻度上閱讀成對棒形，並逐類別比較兩組數據。", "在同一刻度上阅读成对柱形，并逐类别比较两组数据。")}
      formula={mathematicalFormula(`${selectedCategory}: ${secondValue} − ${firstValue} = ${difference}`)}
      summary={t(localized(`In category ${selectedCategory}, series 1 is ${firstValue} and series 2 is ${secondValue}; ${comparisonCopy.en}.`, `在類別 ${selectedCategory}，第一組是 ${firstValue}，第二組是 ${secondValue}；${comparisonCopy.zh}。`, `在类别 ${selectedCategory}，第一组是 ${firstValue}，第二组是 ${secondValue}；${comparisonCopy.zhHans}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Composite bar chart with two series and a selected-category difference", "包含兩組數據和所選類別差距的複合棒形圖", "包含两组数据和所选类别差距的复式柱形图"))}>
          <g data-viz-mark data-viz-name="series-legend">
            <rect x="340" y="28" width="20" height="14" rx="4" fill={semantic.main} />
            <text x="368" y="40" fill={theme.tickText} fontSize="13" fontWeight="900">{t(localized("Series 1", "第一組", "第一组"))}</text>
            <rect x="454" y="28" width="20" height="14" rx="4" fill={semantic.change} />
            <text x="482" y="40" fill={theme.tickText} fontSize="13" fontWeight="900">{t(localized("Series 2", "第二組", "第二组"))}</text>
          </g>
          <g data-viz-mark data-viz-name="shared-scale">
            <line x1="88" x2="568" y1="310" y2="310" stroke={theme.axisStrong} strokeWidth="4" />
            <line x1="88" x2="88" y1="58" y2="310" stroke={theme.axisStrong} strokeWidth="4" />
            {Array.from({ length: 11 }, (_, value) => <g key={value} data-viz-mark data-viz-name="scale-tick"><line x1="80" x2="568" y1={310 - value * scale} y2={310 - value * scale} stroke={value === 0 ? theme.axisStrong : theme.grid} strokeWidth={value === 0 ? 3 : 1} /><text x="66" y={315 - value * scale} textAnchor="middle" fill={theme.tickText} fontSize="12">{value}</text></g>)}
          </g>
          <g data-viz-mark data-viz-name="paired-data-bars" data-viz-selected-category={selectedCategory}>
            {categories.map((category, index) => {
              const x = 125 + index * 112;
              const active = category === selectedCategory;
              return (
                <g key={category} data-viz-mark data-viz-name="category-pair" data-viz-category={category}>
                  {active ? <rect data-viz-mark data-viz-name="category-highlight" x={x - 18} y="54" width="94" height="264" rx="14" fill={theme.softFill} stroke={semantic.parameter} strokeWidth="2" strokeDasharray="6 5" /> : null}
                  <rect data-viz-mark data-viz-name="first-series-bar" data-viz-value={firstSeries[index]} x={x} y={310 - firstSeries[index] * scale} width="30" height={firstSeries[index] * scale} rx="6" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="2" />
                  <rect data-viz-mark data-viz-name="second-series-bar" data-viz-value={secondSeries[index]} x={x + 34} y={310 - secondSeries[index] * scale} width="30" height={secondSeries[index] * scale} rx="6" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="2" />
                  <text x={x + 32} y="336" textAnchor="middle" fill={active ? theme.text : theme.tickText} fontSize="16" fontWeight="900">{category}</text>
                </g>
              );
            })}
          </g>
          {difference === 0 ? (
            <line data-viz-mark data-viz-name="equality-marker" data-viz-value={firstValue} x1={125 + selectedIndex * 112} x2={189 + selectedIndex * 112} y1={310 - firstValue * scale - 9} y2={310 - firstValue * scale - 9} stroke={semantic.result} strokeWidth="6" strokeLinecap="round" />
          ) : (
            <line data-viz-mark data-viz-name="difference-bracket" x1={159 + selectedIndex * 112} x2={159 + selectedIndex * 112} y1={310 - firstValue * scale} y2={310 - secondValue * scale} stroke={semantic.result} strokeWidth="6" strokeLinecap="round" />
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="category" label={t(localized("Category", "類別", "类别"))} value={selectedCategory} options={categories.map((category) => ({ value: category, label: category }))} onChange={setSelectedCategory} />
          <RangeControl controlId="firstSeriesValue" label={t(localized("Series 1 value", "第一組數值", "第一组数值"))} value={firstValue} min={0} max={10} onChange={(value) => updateSeries(setFirstSeries, value)} />
          <RangeControl controlId="secondSeriesValue" label={t(localized("Series 2 value", "第二組數值", "第二组数值"))} value={secondValue} min={0} max={10} onChange={(value) => updateSeries(setSecondSeries, value)} />
          <ResetButton label={t(localized("Reset composite chart", "重設複合棒形圖", "重设复式柱形图"))} onReset={reset} />
        </>
      }
    />
  );
}

function PercentagesModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<"equivalence" | "given-change">("equivalence");
  const [percent, setPercent] = useState(37);
  const [baseAmount, setBaseAmount] = useState(200);
  const [changeDirection, setChangeDirection] = useState<"increase" | "decrease">("increase");
  const divisor = gcd(percent, 100);
  const fractionNumerator = percent / divisor;
  const fractionDenominator = 100 / divisor;
  const decimal = percent / 100;
  const changeAmount = (baseAmount * percent) / 100;
  const finalAmount = changeDirection === "increase" ? baseAmount + changeAmount : baseAmount - changeAmount;
  const diagramMaximum = changeDirection === "increase" ? Math.max(1, finalAmount) : Math.max(1, baseAmount);
  const diagramScale = 390 / diagramMaximum;
  const baseWidth = baseAmount * diagramScale;
  const changeWidth = changeAmount * diagramScale;
  const finalWidth = finalAmount * diagramScale;
  const changeStartX = changeDirection === "increase" ? 124 + baseWidth : 124 + finalWidth;

  function reset() {
    setMode("equivalence");
    setPercent(37);
    setBaseAmount(200);
    setChangeDirection("increase");
  }

  return (
    <ModelShell
      labId="p6-percentages"
      state={{ mode, percent, baseAmount, direction: changeDirection }}
      objective={localized("Read equivalent percentage forms, then apply a given percentage increase or decrease to a given base.", "閱讀百分數的等值表示，再把給定百分率的增加或減少應用於給定基數。", "阅读百分数的等值表示，再把给定百分率的增加或减少应用于给定基数。")}
      formula={mode === "equivalence"
        ? mathematicalFormula(`${percent}% = ${percent}/100 = ${fractionNumerator}/${fractionDenominator} = ${decimal.toFixed(2)}`)
        : localized(
          `change = ${baseAmount} × ${percent}/100 = ${formatDecimal(changeAmount, 2)}; final = ${baseAmount} ${changeDirection === "increase" ? "+" : "−"} ${formatDecimal(changeAmount, 2)} = ${formatDecimal(finalAmount, 2)}`,
          `改變量 = ${baseAmount} × ${percent}/100 = ${formatDecimal(changeAmount, 2)}；最後數量 = ${baseAmount} ${changeDirection === "increase" ? "+" : "−"} ${formatDecimal(changeAmount, 2)} = ${formatDecimal(finalAmount, 2)}`,
          `改变量 = ${baseAmount} × ${percent}/100 = ${formatDecimal(changeAmount, 2)}；最后数量 = ${baseAmount} ${changeDirection === "increase" ? "+" : "−"} ${formatDecimal(changeAmount, 2)} = ${formatDecimal(finalAmount, 2)}`
        )}
      summary={mode === "equivalence"
        ? t(localized(`${percent} of 100 cells are shaded, so the value is ${percent}%, ${fractionNumerator}/${fractionDenominator}, or ${decimal.toFixed(2)}.`, `100 格中有 ${percent} 格塗色，所以數值是 ${percent}%、${fractionNumerator}/${fractionDenominator} 或 ${decimal.toFixed(2)}。`, `100 格中有 ${percent} 格涂色，所以数值是 ${percent}%、${fractionNumerator}/${fractionDenominator} 或 ${decimal.toFixed(2)}。`))
        : t(localized(`The given ${percent}% of the base ${baseAmount} is ${formatDecimal(changeAmount, 2)}. ${changeDirection === "increase" ? "Add" : "Subtract"} that change once to get ${formatDecimal(finalAmount, 2)}.`, `給定基數 ${baseAmount} 的 ${percent}% 是 ${formatDecimal(changeAmount, 2)}；把這個改變量${changeDirection === "increase" ? "加上" : "減去"}一次，得到 ${formatDecimal(finalAmount, 2)}。`, `给定基数 ${baseAmount} 的 ${percent}% 是 ${formatDecimal(changeAmount, 2)}；把这个改变量${changeDirection === "increase" ? "加上" : "减去"}一次，得到 ${formatDecimal(finalAmount, 2)}。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Equivalent percentages and a given-percent change model", "百分數等值表示與給定百分率改變模型", "百分数等值表示与给定百分率改变模型"))}>
          {mode === "equivalence" ? (
            <>
              <g data-viz-mark data-viz-name="hundred-grid" data-viz-percent={percent} transform="translate(62 50)">
                {Array.from({ length: 100 }, (_, index) => (
                  <rect
                    key={index}
                    data-viz-mark
                    data-viz-name={index < percent ? "shaded-cell" : "unshaded-cell"}
                    data-viz-shaded={String(index < percent)}
                    x={(index % 10) * 25}
                    y={Math.floor(index / 10) * 25}
                    width="22"
                    height="22"
                    rx="3"
                    fill={index < percent ? semantic.main : theme.emptyFill}
                    stroke={index < percent ? "#0e7490" : theme.gridStrong}
                    strokeWidth="1.5"
                  />
                ))}
              </g>
              <g data-viz-mark data-viz-name="equivalent-representations">
                <rect data-viz-mark data-viz-name="fraction-bar" x="358" y="75" width="218" height="50" rx="14" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="3" />
                <rect data-viz-mark data-viz-name="fraction-bar-fill" x="358" y="75" width={(218 * percent) / 100} height="50" rx="14" fill={semantic.result} />
                <g data-viz-name="fraction-value" data-viz-value={`${fractionNumerator}/${fractionDenominator}`} data-viz-overlap-ok="label-inside-own-fraction-value-node" data-viz-overlap-reason="The fraction is intentionally centered inside its own equivalent-form node.">
                  <circle data-viz-mark data-viz-overlap-member="mark" cx="414" cy="190" r="44" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
                  <text data-viz-overlap-member="label" x="414" y="197" textAnchor="middle" fill="#052e16" fontSize="17" fontWeight="900">{fractionNumerator}/{fractionDenominator}</text>
                </g>
                <g data-viz-name="decimal-marker" data-viz-value={decimal.toFixed(2)} data-viz-overlap-ok="label-inside-own-decimal-value-node" data-viz-overlap-reason="The decimal is intentionally centered inside its own equivalent-form node.">
                  <circle data-viz-mark data-viz-overlap-member="mark" cx="520" cy="190" r="44" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="3" />
                  <text data-viz-overlap-member="label" x="520" y="197" textAnchor="middle" fill="#451a03" fontSize="18" fontWeight="900">{decimal.toFixed(2)}</text>
                </g>
                <g data-viz-name="percent-value" data-viz-value={percent} data-viz-overlap-ok="label-inside-own-percent-value-card" data-viz-overlap-reason="The percentage is intentionally centered inside its own equivalent-form card.">
                  <rect data-viz-mark data-viz-overlap-member="mark" x="380" y="264" width="174" height="62" rx="18" fill={semantic.parameter} stroke={theme.pointStroke} strokeWidth="3" />
                  <text data-viz-overlap-member="label" x="467" y="304" textAnchor="middle" fill="#2e1065" fontSize="28" fontWeight="900">{percent}%</text>
                </g>
              </g>
            </>
          ) : (
            <g data-viz-name="given-percent-change" data-viz-direction={changeDirection} data-viz-base={baseAmount} data-viz-percent={percent} data-viz-change={formatDecimal(changeAmount, 2)} data-viz-final={formatDecimal(finalAmount, 2)}>
              <text x="320" y="63" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">{t(localized("Given base", "給定基數", "给定基数"))}: {baseAmount} · {t(localized("Given percent", "給定百分率", "给定百分率"))}: {percent}%</text>
              <g data-viz-mark data-viz-name="given-base" data-viz-value={baseAmount}>
                {baseWidth > 0 ? (
                  <rect data-viz-mark data-viz-name="original-amount-bar" data-viz-value={baseAmount} x="124" y="104" width={baseWidth} height="62" rx="15" fill="rgba(34,211,238,.28)" stroke={theme.axisStrong} strokeWidth="4" />
                ) : (
                  <circle data-viz-mark data-viz-name="zero-base-marker" data-viz-value="0" cx="124" cy="128" r="8" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="4" />
                )}
              </g>
              {changeDirection === "increase" ? (
                <g data-viz-mark data-viz-name="percent-change-segment" data-viz-operation="add" data-viz-value={formatDecimal(changeAmount, 2)}>
                  {changeWidth > 0 ? <rect x={changeStartX} y="104" width={changeWidth} height="62" rx="15" fill="rgba(52,211,153,.36)" stroke={theme.axisStrong} strokeWidth="4" /> : <rect data-viz-mark data-viz-name="zero-change-marker" data-viz-marker-shape="diamond" data-viz-value="0" x={changeStartX - 6} y={baseAmount === 0 ? 146 : 129} width="12" height="12" transform={`rotate(45 ${changeStartX} ${baseAmount === 0 ? 152 : 135})`} fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="4" />}
                </g>
              ) : (
                <g data-viz-mark data-viz-name="percent-change-segment" data-viz-operation="subtract" data-viz-value={formatDecimal(changeAmount, 2)}>
                  {changeWidth > 0 ? <rect x={changeStartX} y="104" width={changeWidth} height="62" rx="15" fill="rgba(251,113,133,.35)" stroke={theme.axisStrong} strokeWidth="4" strokeDasharray="8 5" /> : <rect data-viz-mark data-viz-name="zero-change-marker" data-viz-marker-shape="diamond" data-viz-value="0" x={changeStartX - 6} y={baseAmount === 0 ? 146 : 129} width="12" height="12" transform={`rotate(45 ${changeStartX} ${baseAmount === 0 ? 152 : 135})`} fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="4" />}
                </g>
              )}
              <g data-viz-name="given-change-values">
                <g data-viz-overlap-ok="label-inside-own-base-value-card" data-viz-overlap-reason="The given base is intentionally centered inside its own value card.">
                  <rect data-viz-mark data-viz-overlap-member="mark" x="118" y="177" width="174" height="40" rx="12" fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="2" />
                  <text data-viz-overlap-member="label" data-viz-name="base-value-readout" data-viz-value={baseAmount} x="205" y="205" textAnchor="middle" fill={theme.text} fontSize="14" fontWeight="900">{t(localized("Base", "基數", "基数"))} = {baseAmount}</text>
                </g>
                <g data-viz-overlap-ok="label-inside-own-change-value-card" data-viz-overlap-reason="The signed percentage change is intentionally centered inside its own value card.">
                  <rect data-viz-mark data-viz-overlap-member="mark" x="348" y="177" width="174" height="40" rx="12" fill={theme.labelFill} stroke={theme.axisStrong} strokeWidth="2" strokeDasharray={changeDirection === "increase" ? undefined : "7 5"} />
                  <text data-viz-overlap-member="label" data-viz-name="change-value-readout" data-viz-value={formatDecimal(changeAmount, 2)} x="455" y="205" textAnchor="middle" fill={theme.text} fontSize="14" fontWeight="900">{t(localized("Change", "改變量", "改变量"))} = {changeDirection === "increase" ? "+" : "−"}{formatDecimal(changeAmount, 2)}</text>
                </g>
              </g>
              <g data-viz-mark data-viz-name="final-amount" data-viz-value={formatDecimal(finalAmount, 2)} data-viz-direction={changeDirection}>
                {finalWidth > 0 ? <line data-viz-mark data-viz-name="final-amount-bar" data-viz-value={formatDecimal(finalAmount, 2)} x1="124" x2={124 + finalWidth} y1="232" y2="232" stroke={theme.axisStrong} strokeWidth="14" strokeLinecap="round" /> : <circle data-viz-mark data-viz-name="zero-final-marker" data-viz-value="0" cx="124" cy="232" r="8" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="4" />}
                <line x1="124" x2="124" y1="220" y2="244" stroke={theme.axisStrong} strokeWidth="4" />
                {finalWidth > 0 ? <line x1={124 + finalWidth} x2={124 + finalWidth} y1="220" y2="244" stroke={theme.axisStrong} strokeWidth="4" /> : null}
                <text data-viz-name="final-value-readout" data-viz-value={formatDecimal(finalAmount, 2)} x="320" y="278" textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="900">{t(localized("Final", "最後數量", "最后数量"))} = {formatDecimal(finalAmount, 2)}</text>
              </g>
              <g data-viz-name="given-change-formula" data-viz-base={baseAmount} data-viz-percent={percent} data-viz-change={formatDecimal(changeAmount, 2)} data-viz-overlap-ok="label-inside-own-given-change-formula-card" data-viz-overlap-reason="The percentage-change calculation is intentionally centered inside its own formula card.">
                <rect data-viz-mark data-viz-overlap-member="mark" x="122" y="300" width="396" height="42" rx="14" fill={theme.softFill} stroke={theme.panelStroke} strokeWidth="2" />
                <text data-viz-overlap-member="label" x="320" y="327" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{baseAmount} × {percent}/100 = {formatDecimal(changeAmount, 2)}</text>
              </g>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "equivalence", label: t(localized("Equivalent forms", "等值表示", "等值表示")) },
            { value: "given-change", label: t(localized("Given-percent change", "給定百分率改變", "给定百分率改变")) }
          ]} onChange={setMode} />
          <RangeControl controlId="percent" label={t(localized("Given percentage", "給定百分數", "给定百分数"))} value={percent} min={0} max={100} output={`${percent}%`} onChange={setPercent} />
          {mode === "given-change" ? (
            <>
              <RangeControl controlId="baseAmount" label={t(localized("Given base", "給定基數", "给定基数"))} value={baseAmount} min={0} max={500} step={5} onChange={setBaseAmount} />
              <ModeButtons groupId="direction" label={t(localized("Direction", "改變方向", "改变方向"))} value={changeDirection} options={[
                { value: "increase", label: t(localized("Increase", "增加", "增加")) },
                { value: "decrease", label: t(localized("Decrease", "減少", "减少")) }
              ]} onChange={setChangeDirection} />
            </>
          ) : null}
          <ResetButton label={t(localized("Reset percentage", "重設百分數", "重置百分数"))} onReset={reset} />
        </>
      }
    />
  );
}

type AveragesGraphMode = "mean-fair-share" | "broken-line";

const HK_PRIMARY_AVERAGES_GRAPH_TIMES = [9, 10, 11, 12] as const;
const HK_PRIMARY_AVERAGES_GRAPH_TOP_Y = 34;
const HK_PRIMARY_AVERAGES_GRAPH_BOTTOM_Y = 276;
const HK_PRIMARY_AVERAGES_GRAPH_MAXIMUM = 14;

function hkPrimaryAveragesGraphX(index: number) {
  return 94 + index * 92;
}

function hkPrimaryAveragesGraphY(value: number) {
  return HK_PRIMARY_AVERAGES_GRAPH_BOTTOM_Y
    - (value / HK_PRIMARY_AVERAGES_GRAPH_MAXIMUM)
      * (HK_PRIMARY_AVERAGES_GRAPH_BOTTOM_Y - HK_PRIMARY_AVERAGES_GRAPH_TOP_Y);
}

export function hkPrimaryAveragesSeriesProjection(
  values: readonly [number, number, number, number],
  seriesBShift: number
) {
  const seriesA = [...values] as [number, number, number, number];
  const seriesB = seriesA.map((value) => value + seriesBShift);
  const totalA = seriesA.reduce((total, value) => total + value, 0);
  const totalB = seriesB.reduce((total, value) => total + value, 0);
  const meanA = totalA / seriesA.length;
  const meanB = totalB / seriesB.length;
  return { meanA, meanB, seriesA, seriesB, totalA, totalB } as const;
}

export function hkPrimaryAveragesGraphProjection(
  values: readonly [number, number, number, number],
  seriesBShift: number
) {
  const series = hkPrimaryAveragesSeriesProjection(values, seriesBShift);
  const pointsFor = (observations: readonly number[]) => observations.map((value, index) => ({
    hour: HK_PRIMARY_AVERAGES_GRAPH_TIMES[index],
    value,
    x: hkPrimaryAveragesGraphX(index),
    y: hkPrimaryAveragesGraphY(value)
  }));
  const segmentsFor = (points: ReturnType<typeof pointsFor>) => points.slice(0, -1).map((point, index) => ({
    fromHour: point.hour,
    fromValue: point.value,
    toHour: points[index + 1].hour,
    toValue: points[index + 1].value,
    x1: point.x,
    x2: points[index + 1].x,
    y1: point.y,
    y2: points[index + 1].y
  }));
  const pointsA = pointsFor(series.seriesA);
  const pointsB = pointsFor(series.seriesB);
  return {
    ...series,
    meanLineA: { value: series.meanA, y: hkPrimaryAveragesGraphY(series.meanA) },
    meanLineB: { value: series.meanB, y: hkPrimaryAveragesGraphY(series.meanB) },
    pointsA,
    pointsB,
    segmentsA: segmentsFor(pointsA),
    segmentsB: segmentsFor(pointsB),
    seriesCoincident: seriesBShift === 0,
    seriesMeansEqual: series.meanA === series.meanB,
    tableRows: HK_PRIMARY_AVERAGES_GRAPH_TIMES.map((hour, index) => ({
      hour,
      seriesA: series.seriesA[index],
      seriesB: series.seriesB[index]
    }))
  } as const;
}

function AveragesLineGraphsModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [mode, setMode] = useState<AveragesGraphMode>("mean-fair-share");
  const [value1, setValue1] = useState(4);
  const [value2, setValue2] = useState(8);
  const [value3, setValue3] = useState(6);
  const [value4, setValue4] = useState(10);
  const [seriesCount, setSeriesCount] = useState<1 | 2>(1);
  const [seriesBShift, setSeriesBShift] = useState(2);
  const {
    meanA,
    meanB,
    meanLineA,
    meanLineB,
    pointsA,
    pointsB,
    segmentsA,
    segmentsB,
    seriesA,
    seriesB,
    seriesCoincident,
    seriesMeansEqual,
    tableRows,
    totalA,
    totalB
  } = useMemo(
    () => hkPrimaryAveragesGraphProjection(
      [value1, value2, value3, value4],
      seriesBShift
    ),
    [seriesBShift, value1, value2, value3, value4]
  );
  const times = HK_PRIMARY_AVERAGES_GRAPH_TIMES;
  const graphTopY = HK_PRIMARY_AVERAGES_GRAPH_TOP_Y;
  const graphBottomY = HK_PRIMARY_AVERAGES_GRAPH_BOTTOM_Y;
  const graphX = hkPrimaryAveragesGraphX;
  const graphY = hkPrimaryAveragesGraphY;
  const fairShareBaselineY = 304;
  const fairShareUnitSpacing = 18;
  const fairShareY = (value: number) => fairShareBaselineY - value * fairShareUnitSpacing;

  function reset() {
    setMode("mean-fair-share");
    setValue1(4);
    setValue2(8);
    setValue3(6);
    setValue4(10);
    setSeriesCount(1);
    setSeriesBShift(2);
  }

  return (
    <ModelShell
      labId="p6-ratio-proportion"
      state={{ mode, value1, value2, value3, value4, seriesCount, seriesBShift }}
      objective={localized("Interpret the mean as a fair share, or connect ordered continuous-time readings on a broken-line graph.", "把平均數理解為公平分配，或在折線圖連接按連續時間排列的讀數。", "把平均数理解为公平分配，或在折线图连接按连续时间排列的读数。")}
      formula={mode === "mean-fair-share"
        ? localized(
          `mean = (${seriesA.join(" + ")}) ÷ 4 = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}`,
          `平均數 = (${seriesA.join(" + ")}) ÷ 4 = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}`,
          `平均数 = (${seriesA.join(" + ")}) ÷ 4 = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}`
        )
        : localized(
          `Series A mean = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}${seriesCount === 2 ? `; Series B mean = ${totalB} ÷ 4 = ${formatDecimal(meanB, 2)}` : ""}`,
          `數列 A 平均數 = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}${seriesCount === 2 ? `；數列 B 平均數 = ${totalB} ÷ 4 = ${formatDecimal(meanB, 2)}` : ""}`,
          `数列 A 平均数 = ${totalA} ÷ 4 = ${formatDecimal(meanA, 2)}${seriesCount === 2 ? `；数列 B 平均数 = ${totalB} ÷ 4 = ${formatDecimal(meanB, 2)}` : ""}`
        )}
      summary={mode === "mean-fair-share"
        ? t(localized(`The total ${totalA} is preserved. Sharing it equally among 4 observations gives ${formatDecimal(meanA, 2)} each.`, `總數 ${totalA} 保持不變，平均分給 4 個觀察值，每份是 ${formatDecimal(meanA, 2)}。`, `总数 ${totalA} 保持不变，平均分给 4 个观测值，每份是 ${formatDecimal(meanA, 2)}。`))
        : t(localized(`Readings at 9:00, 10:00, 11:00, and 12:00 are joined only to the next recorded time. The table, points, and mean use the same values.`, `9:00、10:00、11:00 和 12:00 的讀數只連接到下一個記錄時間；表格、點和平均數使用同一組數值。`, `9:00、10:00、11:00 和 12:00 的读数只连接到下一个记录时间；表格、点和平均数使用同一组数值。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Fair-share mean and ordered broken-line graph", "公平分配平均數與按序折線圖", "公平分配平均数与有序折线图"))}>
          {mode === "mean-fair-share" ? (
            <g data-viz-mark data-viz-name="mean-fair-share" data-viz-total={totalA} data-viz-count="4" data-viz-mean={formatDecimal(meanA, 2)}>
              {seriesA.map((value, index) => {
                const x = 128 + index * 128;
                return (
                  <g key={index} data-viz-mark data-viz-name="observation-stack" data-viz-observation={index + 1} data-viz-value={value}>
                    <rect x={x - 34} y="68" width="68" height="236" rx="18" fill={theme.emptyFill} stroke={theme.panelStroke} strokeWidth="3" />
                    {Array.from({ length: value }, (_, item) => <circle key={item} data-viz-mark data-viz-name="observation-unit" cx={x} cy={fairShareY(item + 1)} r="8" fill={index % 2 === 0 ? semantic.main : semantic.change} stroke={theme.pointStroke} strokeWidth="1.5" />)}
                    <text x={x} y="330" textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">{value}</text>
                  </g>
                );
              })}
              <line data-viz-mark data-viz-name="fair-share-mean" data-viz-value={formatDecimal(meanA, 2)} x1="82" x2="558" y1={fairShareY(meanA)} y2={fairShareY(meanA)} stroke={semantic.result} strokeWidth="5" strokeDasharray="10 7" />
              <g data-viz-name="series-mean-card" data-viz-overlap-ok="label-inside-own-fair-share-mean-card" data-viz-overlap-reason="The fair-share mean is intentionally centered inside its own mean card.">
                <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="series-mean" data-viz-series="A" data-viz-total={totalA} data-viz-count="4" data-viz-value={formatDecimal(meanA, 2)} x="224" y="24" width="192" height="42" rx="14" fill="rgba(52,211,153,.25)" stroke={semantic.result} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="320" y="51" textAnchor="middle" fill={svgTextColor(theme.mode)} fontSize="16" fontWeight="900">{t(localized("mean", "平均數", "平均数"))} = {formatDecimal(meanA, 2)}</text>
              </g>
            </g>
          ) : (
            <g data-viz-name="broken-line-graph" data-viz-series-count={seriesCount} data-viz-series-coincident={seriesCount === 2 ? String(seriesCoincident) : undefined} data-viz-order="continuous-time" data-viz-extrapolation="none" data-viz-unit="degrees-celsius">
              <g data-viz-mark data-viz-name="broken-line-axes" data-viz-x-unit="hour" data-viz-y-unit="degrees-celsius" data-viz-y-min="0" data-viz-y-max="14" data-viz-y-interval="2">
                <line x1="94" x2="370" y1="276" y2="276" stroke={theme.axisStrong} strokeWidth="5" />
                <line x1="94" x2="94" y1="276" y2={graphTopY} stroke={theme.axisStrong} strokeWidth="5" />
                {Array.from({ length: 8 }, (_, index) => {
                  const value = index * 2;
                  const y = graphY(value);
                  return <g key={value} data-viz-mark data-viz-name="value-axis-tick" data-viz-value={value}><line x1="86" x2="370" y1={y} y2={y} stroke={value === 0 ? theme.axisStrong : theme.grid} strokeWidth={value === 0 ? 3 : 1.5} /><text x="76" y={y + 5} textAnchor="end" fill={theme.tickText} fontSize="12">{value}</text></g>;
                })}
                {times.map((time, index) => <g key={time} data-viz-mark data-viz-name="time-axis-tick" data-viz-hour={time}><line x1={graphX(index)} x2={graphX(index)} y1="270" y2="286" stroke={theme.axis} strokeWidth="2" /><text x={graphX(index)} y="304" textAnchor="middle" fill={theme.tickText} fontSize="12">{time}:00</text></g>)}
                <text x="232" y="326" textAnchor="middle" fill={theme.tickText} fontSize="13" fontWeight="900">{t(localized("Time (h)", "時間（小時）", "时间（小时）"))}</text>
                <text x="32" y="164" textAnchor="middle" transform="rotate(-90 32 164)" fill={theme.tickText} fontSize="13" fontWeight="900">°C</text>
              </g>
              <g data-viz-mark data-viz-name="broken-line-series" data-viz-series="A" data-viz-values={seriesA.join(",")} data-viz-mean={formatDecimal(meanA, 2)}>
                {segmentsA.map((segment, index) => <line key={index} data-viz-mark data-viz-name="adjacent-line-segment" data-viz-series="A" data-viz-from-hour={segment.fromHour} data-viz-to-hour={segment.toHour} data-viz-from-value={segment.fromValue} data-viz-to-value={segment.toValue} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke={semantic.main} strokeWidth="5" />)}
                {pointsA.map((point, index) => <circle key={index} data-viz-mark data-viz-name="series-point" data-viz-series="A" data-viz-hour={point.hour} data-viz-value={point.value} cx={point.x} cy={point.y} r="8" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="3" />)}
                <line data-viz-mark data-viz-name="series-mean" data-viz-series="A" data-viz-value={formatDecimal(meanLineA.value, 2)} x1="94" x2="370" y1={meanLineA.y} y2={meanLineA.y} stroke={semantic.main} strokeWidth="2" strokeDasharray="6 5" />
              </g>
              {seriesCount === 2 ? (
                <g data-viz-mark data-viz-name="broken-line-series" data-viz-series="B" data-viz-values={seriesB.join(",")} data-viz-mean={formatDecimal(meanB, 2)}>
                  {segmentsB.map((segment, index) => <line key={index} data-viz-mark data-viz-name="adjacent-line-segment" data-viz-series="B" data-viz-from-hour={segment.fromHour} data-viz-to-hour={segment.toHour} data-viz-from-value={segment.fromValue} data-viz-to-value={segment.toValue} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke={semantic.change} strokeWidth="5" />)}
                  {pointsB.map((point, index) => <circle key={index} data-viz-mark data-viz-name="series-point" data-viz-series="B" data-viz-hour={point.hour} data-viz-value={point.value} cx={point.x} cy={point.y} r="8" fill={semantic.change} stroke={theme.pointStroke} strokeWidth="3" />)}
                  <line data-viz-mark data-viz-name="series-mean" data-viz-series="B" data-viz-value={formatDecimal(meanLineB.value, 2)} x1="94" x2="370" y1={meanLineB.y} y2={meanLineB.y} stroke={semantic.change} strokeWidth="2" strokeDasharray="6 5" />
                </g>
              ) : null}
              <g data-viz-name="data-table" data-viz-series-count={seriesCount}>
                <rect x="404" y="54" width="208" height="214" rx="14" fill={theme.softFill} stroke={theme.panelStroke} strokeWidth="3" />
                <text x="442" y="80" textAnchor="middle" fill={theme.text} fontSize="12" fontWeight="900">{t(localized("Time", "時間", "时间"))}</text>
                <text x="506" y="80" textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">A</text>
                {seriesCount === 2 ? <text x="572" y="80" textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">B</text> : null}
                {tableRows.map((row, index) => (
                  <g key={row.hour} data-viz-mark data-viz-name="data-table-row" data-viz-hour={row.hour} data-viz-series-a={row.seriesA} data-viz-series-b={seriesCount === 2 ? row.seriesB : undefined}>
                    <line x1="416" x2="600" y1={91 + index * 38} y2={91 + index * 38} stroke={theme.grid} strokeWidth="1.5" />
                    <text x="442" y={116 + index * 38} textAnchor="middle" fill={theme.tickText} fontSize="12">{row.hour}:00</text>
                    <text x="506" y={116 + index * 38} textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{row.seriesA}</text>
                    {seriesCount === 2 ? <text x="572" y={116 + index * 38} textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{row.seriesB}</text> : null}
                  </g>
                ))}
              </g>
              <g data-viz-mark data-viz-name="series-mean-readout" data-viz-series-a-mean={formatDecimal(meanA, 2)} data-viz-series-b-mean={seriesCount === 2 ? formatDecimal(meanB, 2) : undefined} data-viz-series-means-equal={seriesCount === 2 ? String(seriesMeansEqual) : undefined}>
                <text x="508" y="300" textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{t(localized("mean A", "平均數 A", "平均数 A"))} = {formatDecimal(meanA, 2)}</text>
                {seriesCount === 2 ? <text x="508" y="322" textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{t(localized("mean B", "平均數 B", "平均数 B"))} = {formatDecimal(meanB, 2)}</text> : null}
              </g>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="model" label={t(localized("Model", "模型", "模型"))} value={mode} options={[
            { value: "mean-fair-share", label: t(localized("Mean as fair share", "平均數公平分配", "平均数公平分配")) },
            { value: "broken-line", label: t(localized("Broken-line graph", "折線圖", "折线图")) }
          ]} onChange={setMode} />
          <RangeControl controlId="value1" label={t(localized("Reading at 9:00", "9:00 讀數", "9:00 读数"))} value={value1} min={0} max={12} onChange={setValue1} />
          <RangeControl controlId="value2" label={t(localized("Reading at 10:00", "10:00 讀數", "10:00 读数"))} value={value2} min={0} max={12} onChange={setValue2} />
          <RangeControl controlId="value3" label={t(localized("Reading at 11:00", "11:00 讀數", "11:00 读数"))} value={value3} min={0} max={12} onChange={setValue3} />
          <RangeControl controlId="value4" label={t(localized("Reading at 12:00", "12:00 讀數", "12:00 读数"))} value={value4} min={0} max={12} onChange={setValue4} />
          {mode === "broken-line" ? (
            <>
              <ModeButtons groupId="series-count" label={t(localized("Series", "數列", "数列"))} value={String(seriesCount) as "1" | "2"} options={[
                { value: "1", label: t(localized("One series", "一個數列", "一个数列")) },
                { value: "2", label: t(localized("Two series", "兩個數列", "两个数列")) }
              ]} onChange={(value) => setSeriesCount(Number(value) as 1 | 2)} />
              {seriesCount === 2 ? <RangeControl controlId="seriesBShift" label={t(localized("Series B offset", "數列 B 偏移量", "数列 B 偏移量"))} value={seriesBShift} min={0} max={2} onChange={setSeriesBShift} /> : null}
            </>
          ) : null}
          <ResetButton label={t(localized("Reset averages and graph", "重設平均數與折線圖", "重置平均数与折线图"))} onReset={reset} />
        </>
      }
    />
  );
}

function SpeedModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [speed, setSpeed] = useState(12);
  const [time, setTime] = useState(6);
  const distance = speed * time;
  const maxTime = 10;
  const maxDistance = 200;
  const x = 96 + (time / maxTime) * 448;
  const y = 304 - (distance / maxDistance) * 232;
  const lineEndTime = Math.min(maxTime, maxDistance / speed);
  const lineEndDistance = speed * lineEndTime;
  const lineEndX = 96 + (lineEndTime / maxTime) * 448;
  const lineEndY = 304 - (lineEndDistance / maxDistance) * 232;

  return (
    <ModelShell
      labId="p6-speed"
      state={{ speed, time }}
      objective={localized("Read constant speed as the gradient of a distance-time graph and locate one journey point.", "把固定速率閱讀為距離—時間圖的斜率，並找出一個旅程點。", "把恒定速度阅读为距离—时间图的斜率，并找出一个行程点。")}
      formula={localized(
        `distance = ${speed} km/h × ${time} h = ${distance} km`,
        `距離 = ${speed} km/h × ${time} h = ${distance} km`,
        `路程 = ${speed} km/h × ${time} h = ${distance} km`
      )}
      summary={t(localized(`At ${speed} km/h for ${time} hours, the journey reaches ${distance} km. The straight line gains ${speed} km for each hour.`, `以每小時 ${speed} 公里行駛 ${time} 小時，路程是 ${distance} 公里；直線每小時上升 ${speed} 公里。`, `以每小时 ${speed} 公里行驶 ${time} 小时，路程是 ${distance} 公里；直线每小时上升 ${speed} 公里。`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Distance-time graph with constant-speed line and journey point", "帶固定速率直線和旅程點的距離—時間圖", "带恒定速度直线和行程点的距离—时间图"))}>
          <g data-viz-mark data-viz-name="distance-time-axes">
            <line data-viz-mark data-viz-name="time-axis" x1="96" x2="560" y1="304" y2="304" stroke={theme.axisStrong} strokeWidth="5" />
            <line data-viz-mark data-viz-name="distance-axis" x1="96" x2="96" y1="304" y2="56" stroke={theme.axisStrong} strokeWidth="5" />
            {Array.from({ length: 6 }, (_, index) => <g key={`x-${index}`} data-viz-mark data-viz-name="time-tick"><line x1={96 + index * 89.6} x2={96 + index * 89.6} y1="296" y2="316" stroke={theme.axis} strokeWidth="2" /><text x={96 + index * 89.6} y="336" textAnchor="middle" fill={theme.tickText} fontSize="13">{index * 2}</text></g>)}
            {Array.from({ length: 5 }, (_, index) => <g key={`y-${index}`} data-viz-mark data-viz-name="distance-tick"><line x1="86" x2="106" y1={304 - index * 58} y2={304 - index * 58} stroke={theme.axis} strokeWidth="2" /><text x="64" y={309 - index * 58} textAnchor="middle" fill={theme.tickText} fontSize="13">{index * 50}</text></g>)}
            <text x="570" y="326" fill={theme.tickText} fontSize="14" fontWeight="900">h</text>
            <text x="54" y="54" fill={theme.tickText} fontSize="14" fontWeight="900">km</text>
          </g>
          <line data-viz-mark data-viz-name="constant-speed-line" data-viz-speed={speed} x1="96" y1="304" x2={lineEndX} y2={lineEndY} stroke={semantic.main} strokeWidth="7" strokeLinecap="round" />
          <g data-viz-mark data-viz-name="gradient-triangle" data-viz-run={time} data-viz-rise={distance}>
            <path d={`M96 304 H${x} V${y}`} fill="none" stroke={semantic.change} strokeWidth="4" strokeDasharray="8 6" />
          </g>
          <circle data-viz-mark data-viz-name="journey-point" data-viz-time={time} data-viz-distance={distance} cx={x} cy={y} r="14" fill={semantic.result} stroke={theme.pointStroke} strokeWidth="3" />
        </SvgFrame>
      }
      controls={
        <>
          <RangeControl controlId="speed" label={t(localized("Speed (km/h)", "速率（公里/小時）", "速度（公里/小时）"))} value={speed} min={5} max={20} output={`${speed} km/h`} onChange={setSpeed} />
          <RangeControl controlId="time" label={t(localized("Time (hours)", "時間（小時）", "时间（小时）"))} value={time} min={1} max={10} output={`${time} h`} onChange={setTime} />
          <ResetButton label={t(localized("Reset journey graph", "重設旅程圖", "重设行程图"))} onReset={() => { setSpeed(12); setTime(6); }} />
        </>
      }
    />
  );
}

type ProblemWorkflowStep = "represent" | "plan" | "solve" | "check";

export function hkPrimaryBudgetBalance({
  budget,
  count,
  unitPrice,
  extraCost
}: {
  budget: number;
  count: number;
  unitPrice: number;
  extraCost: number;
}) {
  const itemCost = count * unitPrice;
  const totalSpending = itemCost + extraCost;
  const remaining = budget - totalSpending;
  const withinBudget = remaining >= 0;
  const overspend = Math.max(0, -remaining);
  return { itemCost, totalSpending, remaining, withinBudget, overspend } as const;
}

function ProblemSolvingModel({ controlFooterAction }: { controlFooterAction?: ReactNode }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const [workflowStep, setWorkflowStep] = useState<ProblemWorkflowStep>("represent");
  const [budget, setBudget] = useState(120);
  const [count, setCount] = useState(3);
  const [unitPrice, setUnitPrice] = useState(24);
  const [extraCost, setExtraCost] = useState(18);
  const { itemCost, totalSpending, remaining, withinBudget, overspend } = hkPrimaryBudgetBalance({
    budget,
    count,
    unitPrice,
    extraCost
  });
  const absoluteTotal = Math.max(budget, totalSpending);
  const barWidth = 470;
  const budgetWidth = (barWidth * budget) / absoluteTotal;
  const itemWidth = (barWidth * itemCost) / absoluteTotal;
  const extraWidth = (barWidth * extraCost) / absoluteTotal;
  const remainderWidth = withinBudget ? (barWidth * remaining) / absoluteTotal : 0;
  const overspendWidth = withinBudget ? 0 : (barWidth * overspend) / absoluteTotal;
  const stepName = workflowStep === "represent" ? localized("Represent", "表示", "表示") : workflowStep === "plan" ? localized("Plan", "規劃", "规划") : workflowStep === "solve" ? localized("Solve", "解答", "解答") : localized("Check", "驗算", "验算");

  function reset() {
    setWorkflowStep("represent");
    setBudget(120);
    setCount(3);
    setUnitPrice(24);
    setExtraCost(18);
  }

  return (
    <ModelShell
      labId="p6-pre-secondary-problem-solving"
      state={{ workflowStep, budget, count, unitPrice, extraCost }}
      objective={localized("Carry one set of quantities through represent, plan, solve, and check stages of a multi-step problem.", "把同一組數量依次帶過表示、規劃、解答和驗算的多步解難階段。", "把同一组数量依次带过表示、规划、解答和验算的多步解题阶段。")}
      formula={withinBudget
        ? localized(
          `remaining = ${budget} − (${count} × ${unitPrice}) − ${extraCost} = ${remaining}`,
          `餘款 = ${budget} − (${count} × ${unitPrice}) − ${extraCost} = ${remaining}`,
          `余款 = ${budget} − (${count} × ${unitPrice}) − ${extraCost} = ${remaining}`
        )
        : localized(
          `overspend = (${count} × ${unitPrice}) + ${extraCost} − ${budget} = ${overspend}`,
          `超支 = (${count} × ${unitPrice}) + ${extraCost} − ${budget} = ${overspend}`,
          `超支 = (${count} × ${unitPrice}) + ${extraCost} − ${budget} = ${overspend}`
        )}
      summary={t(localized(`${stepName.en}: ${count} items cost HK$${itemCost}, plus HK$${extraCost}. ${withinBudget ? `HK$${remaining} remains from HK$${budget}.` : `This exceeds the HK$${budget} budget by HK$${Math.abs(remaining)}.`}`, `${stepName.zh}：${count} 件物品共 HK$${itemCost}，另加 HK$${extraCost}。${withinBudget ? `由 HK$${budget} 餘下 HK$${remaining}。` : `超出 HK$${budget} 預算 HK$${Math.abs(remaining)}。`}`, `${stepName.zhHans}：${count} 件物品共 HK$${itemCost}，另加 HK$${extraCost}。${withinBudget ? `由 HK$${budget} 剩下 HK$${remaining}。` : `超出 HK$${budget} 预算 HK$${Math.abs(remaining)}。`}`))}
      controlFooterAction={controlFooterAction}
      surface={
        <SvgFrame label={t(localized("Four-stage multi-step problem-solving model", "四階段多步解難模型", "四阶段多步解题模型"))}>
          {workflowStep === "represent" ? (
            <g
              data-viz-name="bar-model"
              data-viz-budget={budget}
              data-viz-item-cost={itemCost}
              data-viz-extra-cost={extraCost}
              data-viz-remaining={remaining}
              data-viz-scale-total={absoluteTotal}
              data-viz-total-spending={totalSpending}
              data-viz-within-budget={String(withinBudget)}
              data-viz-overspend={overspend}
            >
              <rect data-viz-name="comparison-scale" x="85" y="128" width={barWidth} height="92" rx="18" fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="3" />
              <g
                data-viz-name="bar-items"
                data-viz-overlap-ok={itemWidth > 80 ? "label-inside-own-item-segment" : undefined}
                data-viz-overlap-reason={itemWidth > 80 ? "The item-cost label is intentionally centered inside its own bar segment." : undefined}
              >
                <rect data-viz-mark data-viz-name="bar-items-segment" data-viz-overlap-member="mark" x="85" y="128" width={itemWidth} height="92" rx="18" fill={semantic.main} />
                {itemWidth > 80 ? <text data-viz-overlap-member="label" x={85 + itemWidth / 2} y="180" textAnchor="middle" fill="#082f49" fontSize="17" fontWeight="900">{count}×{unitPrice}</text> : null}
              </g>
              <g
                data-viz-name="bar-extra"
                data-viz-overlap-ok={extraWidth > 66 ? "label-inside-own-extra-segment" : undefined}
                data-viz-overlap-reason={extraWidth > 66 ? "The extra-cost label is intentionally centered inside its own bar segment." : undefined}
              >
                <rect data-viz-mark data-viz-name="bar-extra-segment" data-viz-overlap-member="mark" x={85 + itemWidth} y="128" width={extraWidth} height="92" fill={semantic.change} />
                {extraWidth > 66 ? <text data-viz-overlap-member="label" x={85 + itemWidth + extraWidth / 2} y="180" textAnchor="middle" fill="#451a03" fontSize="17" fontWeight="900">+{extraCost}</text> : null}
              </g>
              {withinBudget ? (
                <g
                  data-viz-name="bar-remainder"
                  data-viz-remaining={remaining}
                  data-viz-overlap-ok={remainderWidth > 34 ? "label-inside-own-remainder-segment" : undefined}
                  data-viz-overlap-reason={remainderWidth > 34 ? "The remaining-budget label is intentionally centered inside its own bar segment." : undefined}
                >
                  <rect data-viz-mark data-viz-name="bar-remainder-segment" data-viz-overlap-member="mark" x={85 + itemWidth + extraWidth} y="128" width={remainderWidth} height="92" rx="18" fill={semantic.result} />
                  {remainderWidth > 34 ? <text data-viz-overlap-member="label" x={85 + itemWidth + extraWidth + remainderWidth / 2} y="180" textAnchor="middle" fill="#052e16" fontSize="17" fontWeight="900">{remaining}</text> : null}
                </g>
              ) : (
                <rect data-viz-mark data-viz-name="bar-over-budget" data-viz-overspend={overspend} x={85 + budgetWidth} y="226" width={overspendWidth} height="18" rx="9" fill={semantic.attention} />
              )}
              <line data-viz-mark data-viz-name="budget-marker" data-viz-budget={budget} x1={85 + budgetWidth} x2={85 + budgetWidth} y1="112" y2="246" stroke={semantic.parameter} strokeWidth="5" />
              <text x={85 + budgetWidth} y="102" textAnchor="middle" fill={theme.text} fontSize="14" fontWeight="900">B={budget}</text>
            </g>
          ) : workflowStep === "plan" ? (
            <g data-viz-mark data-viz-name="strategy-table">
              {[{ x: 72, value: count, color: semantic.parameter }, { x: 212, value: unitPrice, color: semantic.main }, { x: 352, value: itemCost, color: semantic.result }, { x: 492, value: extraCost, color: semantic.change }].map((node, index) => (
                <g key={index} data-viz-name="strategy-node">
                  <g data-viz-overlap-ok={`label-inside-own-strategy-node-${index + 1}`} data-viz-overlap-reason="Each planning value is intentionally centered inside its own strategy node.">
                    <circle data-viz-mark data-viz-overlap-member="mark" cx={node.x} cy="176" r="46" fill={node.color} stroke={theme.pointStroke} strokeWidth="3" />
                    <text data-viz-overlap-member="label" x={node.x} y="184" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="900">{node.value}</text>
                  </g>
                  {index < 3 ? <><line x1={node.x + 50} x2={node.x + 86} y1="176" y2="176" stroke={theme.axisStrong} strokeWidth="5" /><polygon points={`${node.x + 86},176 ${node.x + 69},165 ${node.x + 69},187`} fill={theme.axisStrong} /></> : null}
                </g>
              ))}
            </g>
          ) : workflowStep === "solve" ? (
            <g data-viz-mark data-viz-name="calculation-chain">
              {(withinBudget
                ? [`${count}×${unitPrice}`, itemCost, `${itemCost}+${extraCost}`, totalSpending, `${budget}−${totalSpending}`, remaining]
                : [`${count}×${unitPrice}`, itemCost, `${itemCost}+${extraCost}`, totalSpending, `${totalSpending}−${budget}`, t(localized(`over ${overspend}`, `超支 ${overspend}`, `超支 ${overspend}`))]
              ).map((value, index) => {
                const x = 96 + (index % 3) * 220;
                const y = 110 + Math.floor(index / 3) * 126;
                return <g
                  key={index}
                  data-viz-name={index === 5 ? "calculation-result" : "calculation-step"}
                  data-viz-result-kind={index === 5 ? (withinBudget ? "remaining" : "overspend") : undefined}
                  data-viz-result-value={index === 5 ? (withinBudget ? remaining : overspend) : undefined}
                  data-viz-total-spending={index === 5 ? totalSpending : undefined}
                  data-viz-remaining={index === 5 ? remaining : undefined}
                  data-viz-overspend={index === 5 ? overspend : undefined}
                  data-viz-within-budget={index === 5 ? String(withinBudget) : undefined}
                  data-viz-overlap-ok={`label-inside-own-calculation-card-${index + 1}`}
                  data-viz-overlap-reason="Each calculation value is intentionally centered inside its own calculation card."
                ><rect data-viz-mark data-viz-overlap-member="mark" x={x - 70} y={y - 34} width="140" height="68" rx="16" fill={index === 5 ? (withinBudget ? semantic.result : semantic.attention) : index % 2 === 0 ? theme.softFill : semantic.main} stroke={theme.pointStroke} strokeWidth="3" /><text data-viz-overlap-member="label" x={x} y={y + 7} textAnchor="middle" fill={index === 5 && withinBudget ? "#052e16" : svgTextColor(theme.mode)} fontSize="18" fontWeight="900">{value}</text></g>;
              })}
            </g>
          ) : (
            <g
              data-viz-name="check-balance"
              data-viz-left={withinBudget ? totalSpending + remaining : budget + overspend}
              data-viz-right={withinBudget ? budget : totalSpending}
              data-viz-status={withinBudget ? "within-budget" : "over-budget"}
              data-viz-total-spending={totalSpending}
              data-viz-remaining={remaining}
              data-viz-overspend={overspend}
              data-viz-within-budget={String(withinBudget)}
            >
              <line data-viz-mark data-viz-name="check-balance-stand" x1="320" x2="320" y1="92" y2="282" stroke={theme.axisStrong} strokeWidth="7" />
              <line data-viz-mark data-viz-name="check-balance-beam" x1="128" x2="512" y1="246" y2="246" stroke={withinBudget ? semantic.result : semantic.attention} strokeWidth="10" strokeLinecap="round" />
              <g data-viz-name="check-left-card" data-viz-overlap-ok="label-inside-own-check-left-card" data-viz-overlap-reason="The left check total is intentionally centered inside its own comparison card.">
                <rect data-viz-mark data-viz-overlap-member="mark" x="106" y="126" width="172" height="72" rx="16" fill={semantic.main} stroke={theme.pointStroke} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="192" y="170" textAnchor="middle" fill="#082f49" fontSize="17" fontWeight="900">{withinBudget ? `${totalSpending}+${remaining}` : `${budget}+${overspend}`}</text>
              </g>
              <g data-viz-name="check-right-card" data-viz-overlap-ok="label-inside-own-check-right-card" data-viz-overlap-reason="The right check total is intentionally centered inside its own comparison card.">
                <rect data-viz-mark data-viz-overlap-member="mark" x="362" y="126" width="172" height="72" rx="16" fill={withinBudget ? semantic.result : semantic.attention} stroke={theme.pointStroke} strokeWidth="3" />
                <text data-viz-overlap-member="label" x="448" y="170" textAnchor="middle" fill={withinBudget ? "#052e16" : "#4c0519"} fontSize="20" fontWeight="900">{withinBudget ? budget : totalSpending}</text>
              </g>
            </g>
          )}
        </SvgFrame>
      }
      controls={
        <>
          <ModeButtons groupId="workflow" label={t(localized("Problem-solving stage", "解難階段", "解题阶段"))} value={workflowStep} options={[
            { value: "represent", label: t(localized("Represent", "表示", "表示")) },
            { value: "plan", label: t(localized("Plan", "規劃", "规划")) },
            { value: "solve", label: t(localized("Solve", "解答", "解答")) },
            { value: "check", label: t(localized("Check", "驗算", "验算")) }
          ]} onChange={setWorkflowStep} />
          <RangeControl controlId="budget" label={t(localized("Budget (HK$)", "預算（港幣）", "预算（港币）"))} value={budget} min={50} max={200} onChange={setBudget} />
          <RangeControl controlId="count" label={t(localized("Item count", "物品數目", "物品数目"))} value={count} min={1} max={6} onChange={setCount} />
          <RangeControl controlId="unitPrice" label={t(localized("Unit price (HK$)", "單價（港幣）", "单价（港币）"))} value={unitPrice} min={5} max={40} onChange={setUnitPrice} />
          <RangeControl controlId="extraCost" label={t(localized("Extra cost (HK$)", "額外費用（港幣）", "额外费用（港币）"))} value={extraCost} min={0} max={50} onChange={setExtraCost} />
          <ResetButton label={t(localized("Reset problem workflow", "重設解難流程", "重设解题流程"))} onReset={reset} />
        </>
      }
    />
  );
}

type DedicatedModelProps = {
  controlFooterAction?: ReactNode;
};

const HK_PRIMARY_DEDICATED_MODELS = {
  "p1-counting-number-bonds": CountingNumberBondsModel,
  "p1-addition-subtraction": AdditionSubtractionModel,
  "p1-shapes-patterns": ShapesPatternsModel,
  "p1-measurement-time": MeasurementTimeModel,
  "p2-place-value": PlaceValueModel,
  "p2-money-time": MoneyTimeModel,
  "p2-length-data": LengthDataModel,
  "p3-multiplication-division": MultiplicationDivisionModel,
  "p3-measurement": MeasurementUnitsModel,
  "p3-geometry-patterns": GeometryPatternsModel,
  "p4-large-numbers": FactorsMultiplesModel,
  "p4-decimals": DecimalsModel,
  "p4-angles": QuadrilateralCompositionModel,
  "p4-perimeter-area": PerimeterAreaModel,
  "p5-fractions-operations": FractionOperationsModel,
  "p5-volume": VolumeModel,
  "p5-rates": RatesModel,
  "p5-charts-averages": CompositeChartsModel,
  "p6-percentages": PercentagesModel,
  "p6-ratio-proportion": AveragesLineGraphsModel,
  "p6-speed": SpeedModel,
  "p6-pre-secondary-problem-solving": ProblemSolvingModel
} as const satisfies Record<HKPrimaryDedicatedLabId, ComponentType<DedicatedModelProps>>;

type HKPrimaryVisualizationRuntimeProps = Omit<HKPrimaryVisualizationLabProps, "lab"> & {
  lab: FeaturedLabDefinition & { labId: HKPrimaryDedicatedLabId };
};

function HKPrimaryVisualizationRuntime({
  lab,
  controlFooterAction
}: HKPrimaryVisualizationRuntimeProps) {
  const DedicatedModel = HK_PRIMARY_DEDICATED_MODELS[lab.labId];
  const [reportedState, setReportedState] = useState<{ labId: HKPrimaryDedicatedLabId; state: PrimarySemanticState }>(() => ({
    labId: lab.labId,
    state: HK_PRIMARY_CANONICAL_STATES[lab.labId]
  }));
  const currentState = reportedState.labId === lab.labId
    ? reportedState.state
    : HK_PRIMARY_CANONICAL_STATES[lab.labId];
  const reportState = useCallback<PrimaryStateReporter>((labId, state) => {
    setReportedState((current) => {
      if (current.labId === labId && JSON.stringify(current.state) === JSON.stringify(state)) return current;
      return { labId, state };
    });
  }, []);

  return (
    <div
      data-hk-viz-model="primary-dedicated-v1"
      data-hk-viz-topic={lab.labId}
      data-hk-viz-contract={lab.labId}
      data-hk-viz-state={JSON.stringify(currentState)}
      data-hk-viz-state-keys={JSON.stringify(HK_PRIMARY_VISUALIZATION_CONTRACTS[lab.labId].stateKeys)}
      data-viz-active-lab={lab.labId}
      data-viz-range-domain-id={HK_PRIMARY_RANGE_DOMAIN_IDS[lab.labId as keyof typeof HK_PRIMARY_RANGE_DOMAIN_IDS]}
      className="min-w-0"
    >
      <HKPrimaryStateReporterContext.Provider value={reportState}>
        <HKPrimaryLabIdContext.Provider value={lab.labId}>
          <DedicatedModel controlFooterAction={controlFooterAction} />
        </HKPrimaryLabIdContext.Provider>
      </HKPrimaryStateReporterContext.Provider>
    </div>
  );
}

export function HKPrimaryVisualizationLab({ lab, controlFooterAction }: HKPrimaryVisualizationLabProps) {
  if (!isHKPrimaryDedicatedLabId(lab.labId)) return null;
  const primaryLab = { ...lab, labId: lab.labId } as FeaturedLabDefinition & { labId: HKPrimaryDedicatedLabId };
  return <HKPrimaryVisualizationRuntime key={primaryLab.labId} lab={primaryLab} controlFooterAction={controlFooterAction} />;
}
