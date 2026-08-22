"use client";

import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { VisualizationResetButton } from "@/components/visualizations/VisualizationResetButton";
import { useVisualizationTheme, type VisualizationTheme } from "@/components/visualizations/visualizationTheme";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import { clamp, formatNumber } from "@/lib/math";
import type { LocalizedText } from "@/types";
import {
  HK_SECONDARY_DEDICATED_LAB_IDS,
  HK_SECONDARY_DEDICATED_LAB_ID_SET,
  isHKSecondaryDedicatedLabId,
  type HKSecondaryDedicatedLabId
} from "./hkVisualizationLabRegistry";

export {
  HK_SECONDARY_DEDICATED_LAB_IDS,
  HK_SECONDARY_DEDICATED_LAB_ID_SET,
  isHKSecondaryDedicatedLabId
};
export type { HKSecondaryDedicatedLabId };

/**
 * Hong Kong secondary topics whose lesson promise cannot be represented by the
 * generic configured-template state. The list is deliberately exported so the
 * catalog/runtime and source-level contract tests can share one exact boundary.
 *
 * The five secondary topics already accepted on their existing specialist
 * bench (statistics-s1, data-handling, advanced-functions,
 * differentiation-intro, calculus) are intentionally absent.
 */
type ModelMode = {
  id: string;
  label: LocalizedText;
};

type ModelParameter = {
  id: string;
  label: LocalizedText;
  min: number;
  max: number;
  step: number;
  initial: number;
  unit?: string;
  excludeZero?: boolean;
  control?: "range" | "state";
};

type RangeProjectionMetadata = Readonly<{
  affects: string;
  projection: string;
  reason: string;
}>;

type RangeDomainMetadata = Readonly<{
  controls: Readonly<Record<string, RangeProjectionMetadata>>;
  id: string;
}>;

const triangleRangeParameterIds = Object.freeze(["ax", "ay", "bx", "by", "cx", "cy"] as const);

const HK_SECONDARY_RANGE_DOMAIN_METADATA: Partial<
  Record<HKSecondaryDedicatedLabId, RangeDomainMetadata>
> = {
  angles: {
    controls: Object.fromEntries(
      triangleRangeParameterIds.map((parameterId) => [
        parameterId,
        {
          affects: triangleRangeParameterIds.filter((candidateId) => candidateId !== parameterId).join(","),
          projection: "project-valid-triangle",
          reason: "triangle-must-remain-nondegenerate"
        }
      ])
    ),
    id: "triangle-validity-v1"
  },
  "quadratic-patterns": {
    controls: {
      a: {
        affects: "a",
        projection: "exclude-zero",
        reason: "quadratic-leading-coefficient-must-be-nonzero"
      }
    },
    id: "nonzero-quadratic-a-v1"
  },
  "identities-square-patterns": {
    controls: {
      a: {
        affects: "b",
        projection: "preserve-positive-order",
        reason: "identity-lengths-must-remain-positive-with-a-greater-than-b"
      },
      b: {
        affects: "a",
        projection: "preserve-positive-order",
        reason: "identity-lengths-must-remain-positive-with-a-greater-than-b"
      }
    },
    id: "identity-positive-a-gt-b-v1"
  }
};

export type HKSecondaryModelContract = {
  learningObjective: LocalizedText;
  coreRelation: LocalizedText;
  invariants: readonly string[];
  objects: readonly string[];
  formulaBindings: readonly {
    token: string;
    objectIds: readonly string[];
    meaning: string;
  }[];
  modes: readonly ModelMode[];
  parameters: readonly ModelParameter[];
};

const enZh = (en: string, zh: string, zhHans?: string): LocalizedText => (
  zhHans === undefined ? { en, zh } : { en, zh, zhHans }
);
const mode = (id: string, en: string, zh: string, zhHans?: string): ModelMode => ({ id, label: enZh(en, zh, zhHans) });
const parameter = (
  id: string,
  en: string,
  zh: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  options: Pick<ModelParameter, "unit" | "excludeZero" | "control"> = {}
): ModelParameter => ({ id, label: enZh(en, zh), min, max, step, initial, ...options });
const binding = (token: string, objectIds: string[], meaning: string) => ({ token, objectIds, meaning });

/**
 * Stable, source-readable teaching contracts. Each contract names the changing
 * parameters, the relation that must remain true, the rendered mathematical
 * objects, and the formula-to-object bindings used by the model below.
 */
export const HK_SECONDARY_MODEL_CONTRACTS = {
  integers: {
    learningObjective: enZh("Connect signed operations to directed movement through zero.", "把有符號運算連繫到穿越零的有向移動。"),
    coreRelation: enZh("Addition: end = start + operand; subtraction: end = start - operand.", "加法：終點 = 起點 + 運算數；減法：終點 = 起點 − 運算數。", "加法：终点 = 起点 + 运算数；减法：终点 = 起点 − 运算数。"),
    invariants: ["both start and operand may be negative", "positive movement is right and negative movement is left", "arrow endpoints equal the displayed signed operation"],
    objects: ["integer number line", "start point", "directed operation arrow", "end point", "zero reference"],
    formulaBindings: [binding("start", ["integer-start"], "initial position"), binding("signed operand", ["integer-arrow"], "operation, direction, and distance"), binding("end", ["integer-end"], "result")],
    modes: [mode("add", "Add", "加法"), mode("subtract", "Subtract", "減法")],
    parameters: [parameter("start", "Start integer", "起始整數", -10, 10, 1, -3), parameter("operand", "Signed operand", "有符號運算數", -10, 10, 1, 8)]
  },
  "algebra-basics": {
    learningObjective: enZh("Solve x + a = b by preserving a symbolic balance and checking by substitution.", "在保持符號天平平衡下解 x + a = b，並以代入檢查。"),
    coreRelation: enZh("x + a = b implies x + a - a = b - a and x = b - a.", "x + a = b 表示兩邊同減 a 後，x = b − a。", "x + a = b 表示两边同减 a 后，x = b − a。"),
    invariants: ["the same inverse operation is applied to both sides", "the x tile remains symbolic until isolated", "substitution restores the original equality"],
    objects: ["symbolic x tile", "signed unit tiles", "balance beam", "inverse-operation markers", "substitution check"],
    formulaBindings: [binding("x", ["algebra-x-tile"], "unknown value"), binding("a", ["algebra-left-units"], "signed constant on the left"), binding("b", ["algebra-right-units"], "right-side total"), binding("b-a", ["algebra-solution"], "isolated solution")],
    modes: [mode("equation", "Build equation", "建立方程"), mode("inverse", "Apply −a to both sides", "兩邊同減 a"), mode("check", "Substitution check", "代入檢查")],
    parameters: [parameter("a", "Left constant a", "左邊常數 a", -8, 8, 1, 3), parameter("b", "Right side b", "右邊 b", -10, 14, 1, 8)]
  },
  angles: {
    learningObjective: enZh("Change angles while preserving triangle, straight-line, and around-a-point sums.", "改變角度時保持三角形、直線和圍繞一點的角和不變。"),
    coreRelation: enZh("Triangle angles sum to 180°; a straight line sums to 180°; angles around a point sum to 360°.", "三角形內角和為 180°；一直線上的角和為 180°；一點周圍的角和為 360°。", "三角形内角和为 180°；一直线上的角和为 180°；一点周围的角和为 360°。"),
    invariants: ["triangle interior angles sum to 180", "adjacent angles on a line sum to 180", "angles around a point sum to 360"],
    objects: ["three draggable triangle vertices", "three measured interior angles", "straight reference ray", "full-turn reference"],
    formulaBindings: [binding("A", ["angle-a", "angle-vertex-a"], "angle at draggable vertex A"), binding("B", ["angle-b", "angle-vertex-b"], "angle at draggable vertex B"), binding("C", ["angle-c", "angle-vertex-c"], "angle at draggable vertex C")],
    modes: [mode("triangle", "Triangle", "三角形"), mode("straight", "Straight line", "直線"), mode("point", "Around a point", "圍繞一點")],
    parameters: [parameter("ax", "Vertex A x", "頂點 A 的 x", -8, 8, 0.25, -4), parameter("ay", "Vertex A y", "頂點 A 的 y", -5, 5, 0.25, -2), parameter("bx", "Vertex B x", "頂點 B 的 x", -8, 8, 0.25, 4), parameter("by", "Vertex B y", "頂點 B 的 y", -5, 5, 0.25, -2), parameter("cx", "Vertex C x", "頂點 C 的 x", -8, 8, 0.25, 1), parameter("cy", "Vertex C y", "頂點 C 的 y", -5, 5, 0.25, 3)]
  },
  ratios: {
    learningObjective: enZh("See equivalent ratios, scaling, and the unit rate in the same bar model.", "在同一條形模型中看見等值比、縮放和單位率。"),
    coreRelation: enZh("a:b = ka:kb and the unit rate is b/a.", "a:b = ka:kb，而單位率為 b/a。", "a:b = ka:kb，而单位率为 b/a。"),
    invariants: ["both parts use the same scale factor", "part-to-part ratio is unchanged", "unit rate is computed from the displayed parts"],
    objects: ["base ratio bar", "scaled ratio bar", "equal scale groups", "unit-rate marker"],
    formulaBindings: [binding("a:b", ["ratio-base"], "base ratio"), binding("k", ["ratio-scale-groups"], "common scale factor"), binding("b/a", ["ratio-unit-rate"], "amount of B per unit A")],
    modes: [mode("equivalent", "Equivalent ratio", "等值比"), mode("scale", "Scale groups", "縮放組"), mode("unit", "Unit rate", "單位率")],
    parameters: [parameter("a", "Part A", "A 部分", 1, 8, 1, 2), parameter("b", "Part B", "B 部分", 1, 8, 1, 3), parameter("k", "Scale factor", "倍大因子", 1, 6, 1, 4)]
  },
  "linear-equations": {
    learningObjective: enZh("For a ≠ 0, solve ax + b = c by applying inverse operations to both sides.", "在 a ≠ 0 的條件下，透過在等號兩邊施行逆運算解 ax + b = c。"),
    coreRelation: enZh("For a ≠ 0, ax + b = c implies x = (c - b)/a.", "當 a ≠ 0 時，ax + b = c 表示 x = (c − b)/a。", "当 a ≠ 0 时，ax + b = c 表示 x = (c − b)/a。"),
    invariants: ["the same inverse operation is applied to both sides", "equality is preserved at every step", "substitution verifies the solution"],
    objects: ["balance beam", "x blocks", "constant blocks", "inverse-operation steps", "verification state"],
    formulaBindings: [binding("ax", ["equation-x-blocks"], "variable groups"), binding("b", ["equation-constant"], "added constant"), binding("c", ["equation-right-side"], "balanced total"), binding("x", ["equation-solution"], "isolated value")],
    modes: [mode("equation", "Build equation", "建立方程"), mode("subtract", "Subtract b", "減去 b"), mode("divide", "Divide by a", "除以 a"), mode("check", "Check", "檢查")],
    parameters: [parameter("a", "Coefficient a", "係數 a", 1, 6, 1, 3), parameter("b", "Constant b", "常數 b", -8, 10, 1, 5), parameter("c", "Right side c", "右邊 c", -10, 30, 1, 20)]
  },
  coordinates: {
    learningObjective: enZh("Plot and order three signed points, then test pure translation and reflection rules.", "標示並依序連接三個有符號坐標點，再檢驗純平移與反射規則。"),
    coreRelation: enZh("Ordered points use (x,y); translation adds one vector; reflection in x=k maps x to 2k-x and keeps y.", "有序點使用 (x,y)；平移加入同一向量；關於 x=k 的反射把 x 映為 2k−x，並保持 y。", "有序点使用 (x,y)；平移加入同一向量；关于 x=k 的反射把 x 映为 2k−x，并保持 y。"),
    invariants: ["three learner-set points are connected A to B to C", "pure translation applies the same vector", "pure reflection changes only x about the stated mirror line"],
    objects: ["coordinate axes", "labelled points A B C", "ordered polyline", "translated image", "reflected image", "mirror line"],
    formulaBindings: [binding("A,B,C", ["coordinate-original-points"], "ordered signed points"), binding("vector", ["coordinate-translation-guides"], "pure translation"), binding("2k-x", ["coordinate-reflection-image"], "pure reflection in x=k")],
    modes: [mode("plot", "Plot three points", "標示三點"), mode("connect", "Connect in order", "依序連接"), mode("translate", "Pure translation", "純平移"), mode("reflect", "Pure reflection", "純反射")],
    parameters: [parameter("x1", "A x-coordinate", "A 的 x 坐標", -8, 8, 1, -3), parameter("y1", "A y-coordinate", "A 的 y 坐標", -6, 6, 1, -2), parameter("x2", "B x-coordinate", "B 的 x 坐標", -8, 8, 1, 0), parameter("y2", "B y-coordinate", "B 的 y 坐標", -6, 6, 1, 0), parameter("x3", "C x-coordinate", "C 的 x 坐標", -8, 8, 1, 4), parameter("y3", "C y-coordinate", "C 的 y 坐標", -6, 6, 1, 3), parameter("dx", "Translation x", "平移 x", -2, 2, 1, 2), parameter("dy", "Translation y", "平移 y", -1, 1, 1, 1), parameter("mirror", "Mirror line x = k", "反射軸 x = k", -1, 1, 1, 0)]
  },
  transformations: {
    learningObjective: enZh(
      "Track corresponding vertices through translation, reflection, and rotation, then explore origin-centred enlargement as enrichment.",
      "追蹤對應頂點在平移、反射和旋轉後的位置，並把以原點放大列作延伸學習。",
      "追踪对应顶点在平移、反射和旋转后的位置，并把以原点放大列作延伸学习。"
    ),
    coreRelation: enZh("Each mode applies exactly one pure coordinate rule to every vertex.", "每個模式只對所有頂點施行一條純坐標規則。", "每个模式只对所有顶点施行一条纯坐标规则。"),
    invariants: ["translation, reflection, and 90/180/270-degree rotation preserve side lengths", "reflection in x=k maps (x,y) to (2k-x,y)", "enlargement is pure about the origin"],
    objects: ["original triangle", "image triangle", "correspondence guides", "centre of transformation", "mirror line"],
    formulaBindings: [binding("(x,y)", ["transform-original"], "original vertex"), binding("T", ["transform-guides"], "coordinate rule"), binding("(x',y')", ["transform-image"], "image vertex")],
    modes: [mode("translate", "Pure translation", "純平移"), mode("reflect", "Reflect in x = k", "關於 x = k 反射"), mode("rotate-cw", "Rotate clockwise", "順時針旋轉"), mode("rotate-ccw", "Rotate anticlockwise", "逆時針旋轉"), mode("enlarge", "Enrichment · Enlarge about origin", "延伸學習 · 以原點放大", "延伸学习 · 以原点放大")],
    parameters: [parameter("dx", "Horizontal shift", "水平位移", -5, 5, 1, 3), parameter("dy", "Vertical shift", "垂直位移", -4, 4, 1, 2), parameter("mirror", "Mirror line x = k", "反射軸 x = k", -2, 2, 1, 0), parameter("angle", "Rotation angle", "旋轉角", 90, 270, 90, 90, { unit: "°" }), parameter("scale", "Scale factor", "比例因子", 0.5, 2.5, 0.25, 1.5)]
  },
  "probability-s2": {
    learningObjective: enZh("Generate real fair-die rolls and compare experimental P(even) with 1/2.", "實際生成公平骰結果，並比較實驗 P(偶數) 與 1/2。"),
    coreRelation: enZh("Experimental P(even) = even outcomes / all rolls; theoretical P(even) = 3/6.", "實驗 P(偶數) = 偶數結果 ÷ 總擲骰次數；理論 P(偶數) = 3/6。", "实验 P(偶数) = 偶数结果 ÷ 总掷骰次数；理论 P(偶数) = 3/6。"),
    invariants: ["each trial is one seeded integer from 1 through 6", "all-six face counts sum to total rolls", "cumulative even count matches the generated sequence"],
    objects: ["seeded six-sided die outcomes", "all-six face counts", "cumulative even-frequency path", "theoretical one-half reference"],
    formulaBindings: [binding("1..6", ["dice-outcome-marks"], "generated die faces"), binding("3/6", ["probability-theory-line"], "theoretical even probability"), binding("even/rolls", ["probability-running-path"], "experimental even probability")],
    modes: [mode("compare", "P(even) comparison", "P(偶數)比較"), mode("counts", "All-six counts", "六面次數")],
    parameters: [parameter("seed", "QA simulation seed", "QA 模擬種子", 1, 99, 1, 17, { control: "state" }), parameter("rolls", "Generated roll count", "已生成擲骰次數", 0, 1000, 1, 0, { control: "state" })]
  },
  polynomials: {
    learningObjective: enZh("Connect factors, an area partition, and the expanded polynomial.", "把因式、面積分割和展開後的多項式連繫起來。"),
    coreRelation: enZh("(x+p)(x+q) = x² + (p+q)x + pq.", "(x+p)(x+q) = x² + (p+q)x + pq。", "(x+p)(x+q) = x² + (p+q)x + pq。"),
    invariants: ["four partition areas sum to the whole rectangle", "middle coefficient is p+q", "constant term is pq"],
    objects: ["x squared tile", "px rectangle", "qx rectangle", "pq rectangle", "factor labels"],
    formulaBindings: [binding("x^2", ["polynomial-x2"], "square area"), binding("(p+q)x", ["polynomial-px", "polynomial-qx"], "combined rectangular areas"), binding("pq", ["polynomial-pq"], "constant rectangle")],
    modes: [mode("expand", "Expand", "展開"), mode("factor", "Factor", "因式分解")],
    parameters: [parameter("x", "Tile length x", "方塊邊長 x", 1, 6, 1, 3), parameter("p", "Factor p", "因子 p", 1, 5, 1, 2), parameter("q", "Factor q", "因子 q", 1, 5, 1, 3)]
  },
  "quadratic-patterns": {
    learningObjective: enZh("Relate independent a, b, and c values to one consistent quadratic graph.", "把獨立的 a、b、c 數值連繫到同一幅一致的二次函數圖象。", "把独立的 a、b、c 数值联系到同一幅一致的二次函数图象。"),
    coreRelation: enZh("y = ax²+bx+c, a≠0; vertex (h,k) has h=−b/(2a), k=c−b²/(4a); axis x=h and y-intercept c.", "y = ax²+bx+c，a≠0；頂點 (h,k) 滿足 h=−b/(2a)、k=c−b²/(4a)；對稱軸 x=h，y 截距為 c。", "y = ax²+bx+c，a≠0；顶点 (h,k) 满足 h=−b/(2a)、k=c−b²/(4a)；对称轴 x=h，y 截距为 c。"),
    invariants: ["a is independently positive or negative and never zero", "equation and curve use the same a b c", "vertex and symmetry axis agree", "only real visible x-intercepts are marked"],
    objects: ["quadratic curve", "vertex", "symmetry axis", "y-intercept", "visible real x-intercepts", "off-scale feature state"],
    formulaBindings: [binding("a", ["quadratic-curve"], "opening direction and width"), binding("h=−b/(2a)", ["quadratic-axis", "quadratic-vertex"], "vertex horizontal coordinate"), binding("k=c−b²/(4a)", ["quadratic-vertex"], "vertex vertical coordinate"), binding("c", ["quadratic-y-intercept"], "y-intercept"), binding("x-intercepts", ["quadratic-x-intercept"], "real roots visible in the plotted window")],
    modes: [mode("graph", "Graph", "圖像", "图像"), mode("features", "Key features", "主要特徵", "主要特征")],
    parameters: [parameter("a", "Coefficient a", "係數 a", -3, 3, 0.25, 1, { excludeZero: true }), parameter("b", "Coefficient b", "係數 b", -6, 6, 0.5, -2), parameter("c", "Constant c", "常數 c", -6, 6, 0.5, -3)]
  },
  "identities-square-patterns": {
    learningObjective: enZh("Build plus-square, minus-square, and difference-of-squares identities from exact area relations.", "以精確面積關係建立和平方、差平方及平方差恆等式。", "以精确面积关系建立和平方、差平方及平方差恒等式。"),
    coreRelation: enZh("(a+b)² ≡ a²+2ab+b²; (a−b)² ≡ a²−2ab+b²; and a²−b² ≡ (a−b)(a+b).", "(a+b)² ≡ a²+2ab+b²；(a−b)² ≡ a²−2ab+b²；而 a²−b² ≡ (a−b)(a+b)。", "(a+b)² ≡ a²+2ab+b²；(a−b)² ≡ a²−2ab+b²；而 a²−b² ≡ (a−b)(a+b)。"),
    invariants: ["the identity sign is equivalence, not a one-case equation", "plus-square and minus-square checks keep the signs of their 2ab terms distinct", "area pieces exactly fill the same whole", "difference-of-squares geometry keeps a greater than b"],
    objects: ["whole square", "a squared tile", "positive and negative two-ab terms", "b squared tile", "difference-of-squares rearrangement"],
    formulaBindings: [binding("a²", ["identity-a2"], "square with side a"), binding("+2ab", ["identity-cross-parts", "identity-plus-square-check"], "positive middle term in the plus-square identity"), binding("−2ab", ["identity-minus-cross-parts", "identity-minus-square-check"], "negative middle term in the minus-square identity"), binding("b²", ["identity-b2", "identity-minus-overlap"], "square with side b, including the overlap added back in the minus-square identity"), binding("(a−b)(a+b)", ["identity-difference-product"], "rearranged difference area")],
    modes: [mode("square-sum", "Square of a sum", "和的平方", "和的平方"), mode("square-difference", "Square of a difference", "差的平方", "差的平方"), mode("difference-of-squares", "Difference of squares", "平方差", "平方差")],
    parameters: [parameter("a", "Length a", "長度 a", 2, 10, 1, 6), parameter("b", "Length b", "長度 b", 1, 9, 1, 2)]
  },
  "trigonometry-basics": {
    learningObjective: enZh("Bind SOH-CAH-TOA ratios to the sides of one right triangle.", "把 SOH-CAH-TOA 比率綁定到同一個直角三角形的各邊。"),
    coreRelation: enZh("sin θ = opposite/hypotenuse; cos θ = adjacent/hypotenuse; tan θ = opposite/adjacent.", "sin θ = 對邊/斜邊；cos θ = 鄰邊/斜邊；tan θ = 對邊/鄰邊。", "sin θ = 对边/斜边；cos θ = 邻边/斜边；tan θ = 对边/邻边。"),
    invariants: ["triangle has one right angle", "side lengths come from the selected angle and hypotenuse", "all three ratios use the same triangle"],
    objects: ["right triangle", "opposite side", "adjacent side", "hypotenuse", "selected angle"],
    formulaBindings: [binding("opposite", ["trig-opposite"], "side across from theta"), binding("adjacent", ["trig-adjacent"], "non-hypotenuse side beside theta"), binding("hypotenuse", ["trig-hypotenuse"], "side opposite the right angle")],
    modes: [mode("sin", "Sine · SOH", "正弦 · SOH"), mode("cos", "Cosine · CAH", "餘弦 · CAH"), mode("tan", "Tangent · TOA", "正切 · TOA")],
    parameters: [parameter("theta", "Left acute angle θ", "左方銳角 θ", 10, 80, 1, 35, { unit: "°" }), parameter("hyp", "Hypotenuse", "斜邊", 3, 12, 0.5, 8), parameter("reference", "Reference acute angle", "參考銳角", 0, 1, 1, 0, { control: "state" })]
  },
  circles: {
    learningObjective: enZh("Connect a real circle construction to chord, tangent, arc, and same-arc angle invariants.", "把真實圓形作圖連繫到弦、切線、弧和同弧角不變量。", "把真实圆形作图联系到弦、切线、弧和同弧角不变量。"),
    coreRelation: enZh("A contact radius is perpendicular to its tangent; for the same arc, the central angle is twice the circumference angle.", "接觸點半徑垂直於切線；同弧所對的圓心角是圓周角的兩倍。", "接触点半径垂直于切线；同弧所对的圆心角是圆周角的两倍。"),
    invariants: ["all circumference points remain distance r from the centre", "chord and highlighted arc share endpoints", "contact radius and tangent are perpendicular", "central angle equals twice the same-arc circumference angle"],
    objects: ["circle and centre", "radius", "chord", "arc", "tangent and contact point", "circumference point", "central and circumference angles"],
    formulaBindings: [binding("r", ["circle-geometry-radius"], "radius"), binding("arc", ["circle-geometry-arc", "circle-geometry-chord"], "shared chord and arc endpoints"), binding("90°", ["circle-geometry-tangent"], "radius-tangent invariant"), binding("θ=2φ", ["circle-geometry-central-angle", "circle-geometry-circumference-angle"], "same-arc angle theorem")],
    modes: [mode("radius", "Radius", "半徑", "半径"), mode("chord", "Chord and arc", "弦與弧", "弦与弧"), mode("tangent", "Tangent", "切線", "切线"), mode("theorem", "Same-arc theorem", "同弧定理", "同弧定理")],
    parameters: [parameter("r", "Radius r", "半徑 r", 2, 10, 0.5, 5), parameter("theta", "Central angle α", "圓心角 α", 30, 160, 5, 100, { unit: "°" })]
  },
  "arc-length-sector-area": {
    learningObjective: enZh("Use the fraction θ/360 to derive arc length and sector area.", "用分數 θ/360 推導弧長和扇形面積。", "用分数 θ/360 推导弧长和扇形面积。"),
    coreRelation: enZh("Arc = (θ/360)·2πr; sector area = (θ/360)·πr².", "弧長 = (θ/360)·2πr；扇形面積 = (θ/360)·πr²。", "弧长 = (θ/360)·2πr；扇形面积 = (θ/360)·πr²。"),
    invariants: ["r is positive", "theta is greater than zero and at most 360 degrees", "the sector and arc use the same fraction of one full circle", "length and area use different units"],
    objects: ["circle and centre", "radius", "central angle", "arc", "sector", "full-turn fraction"],
    formulaBindings: [binding("r", ["circle-radius"], "radius"), binding("θ/360", ["circle-fraction", "circle-sector"], "fraction of a full turn"), binding("2πr", ["circle-arc"], "full circumference"), binding("πr²", ["circle-sector"], "full circle area")],
    modes: [mode("arc", "Arc length", "弧長", "弧长"), mode("sector", "Sector area", "扇形面積", "扇形面积")],
    parameters: [parameter("r", "Radius r", "半徑 r", 0.5, 12, 0.5, 5, { unit: "cm" }), parameter("theta", "Central angle θ", "圓心角 θ", 1, 360, 1, 90, { unit: "°" })]
  },
  functions: {
    learningObjective: enZh("Connect an input-output rule, value table, and graph across four function families.", "在四類函數中連繫輸入輸出規則、數表和圖像。"),
    coreRelation: enZh("Every table row and graph point is evaluated by the selected f(x).", "數表每一行和圖像每一點都由所選 f(x) 計算。", "数表每一行和图像每一点都由所选 f(x) 计算。"),
    invariants: ["one function rule drives machine, table, and curve", "the highlighted input has the same output in every representation", "family domain restrictions are shown"],
    objects: ["input-output machine", "value table", "function curve", "highlighted point", "family rule"],
    formulaBindings: [binding("x", ["function-input"], "machine input"), binding("f(x)", ["function-output", "function-curve"], "evaluated output"), binding("family", ["function-table"], "shared rule across representations")],
    modes: [mode("linear", "Linear", "線性"), mode("quadratic", "Quadratic", "二次"), mode("exponential", "Exponential", "指數"), mode("logarithmic", "Logarithmic", "對數")],
    parameters: [parameter("a", "Scale a", "伸縮 a", 0.5, 3, 0.25, 1), parameter("b", "Vertical shift b", "垂直平移 b", -4, 4, 0.5, 0), parameter("input", "Input x", "輸入 x", -4, 4, 0.5, 1)]
  },
  "coordinate-geometry": {
    learningObjective: enZh("Read gradient, distance, and midpoint from the same pair of points.", "從同一對點讀出斜率、距離和中點。"),
    coreRelation: enZh("m = change in y/change in x; d = √((Δx)²+(Δy)²); M uses coordinate averages.", "m = y 變化/x 變化；d = √((Δx)²+(Δy)²)；M 取坐標平均。", "m = y 变化/x 变化；d = √((Δx)²+(Δy)²)；M 取坐标平均。"),
    invariants: ["all measures use the same two endpoints", "midpoint bisects the segment", "distance is non-negative"],
    objects: ["point A", "point B", "rise-run triangle", "segment AB", "midpoint"],
    formulaBindings: [binding("change y", ["coordinate-rise"], "vertical change"), binding("change x", ["coordinate-run"], "horizontal change"), binding("distance", ["coordinate-geometry-segment"], "segment length"), binding("midpoint", ["coordinate-midpoint"], "coordinate averages")],
    modes: [mode("gradient", "Gradient", "斜率"), mode("distance", "Distance", "距離"), mode("midpoint", "Midpoint", "中點")],
    parameters: [parameter("x1", "A x-coordinate", "A 的 x 坐標", -7, 7, 1, -3), parameter("y1", "A y-coordinate", "A 的 y 坐標", -6, 6, 1, -2), parameter("x2", "B x-coordinate", "B 的 x 坐標", -7, 7, 1, 4), parameter("y2", "B y-coordinate", "B 的 y 坐標", -6, 6, 1, 3)]
  },
  "more-algebra": {
    learningObjective: enZh("Test index laws, identities, and rational simplification with exact symbolic structure.", "用精確符號結構檢驗指數律、恆等式和有理式化簡。"),
    coreRelation: enZh("Index laws, identities, and cancellation are valid only under their stated conditions.", "指數律、恆等式和約簡只在所列條件下成立。", "指数律、恒等式和约简只在所列条件下成立。"),
    invariants: ["exponents add when equal bases multiply", "signed identity terms agree for every x and k", "cancellation keeps the excluded value x = k"],
    objects: ["power stacks", "signed identity tiles", "common rational factor", "domain exclusion marker"],
    formulaBindings: [binding("m+n", ["algebra-power-stack"], "combined exponent"), binding("2kx", ["algebra-identity-cross-tiles"], "two cross rectangles"), binding("x-k", ["algebra-cancel-factor"], "cancelled nonzero factor")],
    modes: [mode("indices", "Indices", "指數"), mode("identity", "Identity", "恆等式"), mode("rational", "Rational expression", "有理式")],
    parameters: [parameter("x", "Value x", "數值 x", -5, 6, 1, 3), parameter("m", "Exponent m", "指數 m", 1, 6, 1, 2), parameter("n", "Exponent n", "指數 n", 1, 6, 1, 3), parameter("k", "Parameter k", "參數 k", 1, 5, 1, 2)]
  },
  "trigonometry-s5": {
    learningObjective: enZh("See amplitude, period, and phase shift as independent transformations of a trig graph.", "把振幅、周期和相位移看成三角圖像的獨立變換。"),
    coreRelation: enZh("y = A sin(2π(x−φ)/T) or A cos(2π(x−φ)/T).", "y = A sin(2π(x−φ)/T) 或 A cos(2π(x−φ)/T)。", "y = A sin(2π(x−φ)/T) 或 A cos(2π(x−φ)/T)。"),
    invariants: ["maximum distance from the midline equals |A|", "repeat length equals T", "phase marker equals phi"],
    objects: ["trig wave", "midline", "amplitude guide", "period guide", "phase marker"],
    formulaBindings: [binding("A", ["trig-wave", "trig-amplitude-guide"], "amplitude"), binding("T", ["trig-period-guide"], "period"), binding("phi", ["trig-phase-marker"], "phase shift")],
    modes: [mode("sin", "Sine", "正弦"), mode("cos", "Cosine", "餘弦")],
    parameters: [parameter("amplitude", "Amplitude A", "振幅 A", 0.5, 3.5, 0.25, 2), parameter("period", "Period T", "周期 T", 90, 360, 15, 180, { unit: "°" }), parameter("phase", "Phase shift φ", "相位移 φ", -180, 180, 15, 30, { unit: "°" })]
  },
  "probability-s5": {
    learningObjective: enZh("Update the sample space before counting conditional outcomes.", "先更新樣本空間，再計算條件結果。"),
    coreRelation: enZh("Conditional probability counts favourable outcomes inside the conditioned sample space.", "條件概率在更新後的樣本空間內計算有利結果。", "条件概率在更新后的样本空间内计算有利结果。"),
    invariants: ["counts never exceed available objects", "without-replacement branches decrement the selected colour", "combination counts use unordered pairs"],
    objects: ["red and blue objects", "counting combinations", "without-replacement tree", "conditioned sample space"],
    formulaBindings: [binding("n choose 2", ["probability-combination-space"], "two-object sample space"), binding("P(R1)", ["probability-first-red"], "first red branch"), binding("P(R2|R1)", ["probability-conditioned-red"], "updated red branch")],
    modes: [mode("counting", "Counting", "計數"), mode("conditional", "Conditional", "條件概率")],
    parameters: [parameter("red", "Red objects", "紅色物件", 1, 8, 1, 3), parameter("blue", "Blue objects", "藍色物件", 1, 8, 1, 2)]
  },
  "statistics-s6": {
    learningObjective: enZh("Standardize an observed value and locate its z-score on a normal model.", "把觀察值標準化，並在常態模型上找出其 z 分數位置。"),
    coreRelation: enZh("z = (x − mean)/standard deviation.", "z = (x − 平均數)/標準差。", "z = (x − 平均数)/标准差。"),
    invariants: ["z is zero at the mean", "one standard-deviation move changes z by one", "the observed marker uses the displayed x"],
    objects: ["normal curve", "mean marker", "standard-deviation bands", "observed-value marker", "z displacement"],
    formulaBindings: [binding("x", ["statistics-observed"], "observed value"), binding("mean", ["statistics-mean"], "distribution centre"), binding("standard deviation", ["statistics-sd-band"], "horizontal scale"), binding("z", ["statistics-z-displacement"], "standardized displacement")],
    modes: [mode("distribution", "Distribution", "分佈"), mode("standardize", "Standardize", "標準化")],
    parameters: [parameter("mean", "Mean μ", "平均數 μ", 20, 80, 1, 50), parameter("sd", "Standard deviation σ", "標準差 σ", 2, 20, 1, 10), parameter("observed", "Observed value x", "觀察值 x", 0, 100, 1, 70)]
  },
  "exam-revision": {
    learningObjective: enZh("Prioritize revision with evidence from mastery gaps, recent errors, and time pressure.", "根據掌握差距、近期錯誤和時間壓力排定溫習優先次序。"),
    coreRelation: enZh("Priority = 0.6(100 − mastery) + 8(recent errors); time = marks × minutes per mark.", "優先值 = 0.6(100 − 掌握度) + 8(近期錯誤)；時間 = 分數 × 每分分鐘。", "优先值 = 0.6(100 − 掌握度) + 8(近期错误)；时间 = 分数 × 每分分钟。"),
    invariants: ["lower mastery raises priority", "more recent errors raise priority", "timing uses the displayed marks and pace"],
    objects: ["topic priority bars", "mastery gaps", "recent-error weights", "time budget bar"],
    formulaBindings: [binding("100-mastery", ["revision-gap-bars"], "skill gap"), binding("recent errors", ["revision-error-markers"], "evidence weight"), binding("marks times pace", ["revision-time-budget"], "question time budget")],
    modes: [mode("priority", "Priority", "優先次序"), mode("timing", "Timing", "時間管理")],
    parameters: [parameter("algebra", "Algebra mastery", "代數掌握度", 0, 100, 5, 55, { unit: "%" }), parameter("geometry", "Geometry mastery", "幾何掌握度", 0, 100, 5, 70, { unit: "%" }), parameter("statistics", "Statistics mastery", "統計掌握度", 0, 100, 5, 40, { unit: "%" }), parameter("marks", "Question marks", "題目分數", 1, 12, 1, 4), parameter("pace", "Minutes per mark", "每分所需分鐘", 0.5, 3, 0.25, 1.5)]
  },
  "mixed-problem-solving": {
    learningObjective: enZh("Move from selecting a representation to building a model and checking the result.", "由選擇表示方式，推進到建立模型和檢查結果。"),
    coreRelation: enZh("Choose a representation → build a model → calculate → check units and reasonableness.", "選擇表示方式 → 建立模型 → 計算 → 檢查單位與合理性。", "选择表示方式 → 建立模型 → 计算 → 检查单位与合理性。"),
    invariants: ["the model uses every displayed known fact", "the target keeps its unit", "the check reverses the calculation"],
    objects: ["known-facts cards", "representation selector", "diagram table equation or graph model", "calculated target", "inverse check"],
    formulaBindings: [binding("rate,time", ["mixed-known-facts"], "given information"), binding("distance=rate times time", ["mixed-model"], "chosen equation"), binding("distance/time", ["mixed-check"], "inverse verification")],
    modes: [mode("strategy", "1 · Strategy", "1 · 策略"), mode("model", "2 · Model", "2 · 模型"), mode("check", "3 · Check", "3 · 檢查")],
    parameters: [parameter("rate", "Rate", "速率", 2, 30, 1, 12, { unit: "km/h" }), parameter("time", "Time", "時間", 0.5, 8, 0.5, 5, { unit: "h" }), parameter("representation", "Selected representation", "所選表示方式", 0, 3, 1, 0, { control: "state" })]
  }
} satisfies Record<HKSecondaryDedicatedLabId, HKSecondaryModelContract>;

type Translator = (value: LocalizedText) => string;
type NumericState = Record<string, number>;

type ModelRender = {
  formula: LocalizedText;
  summary: string;
  surface: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
};

const mathematicalFormula = (value: string): LocalizedText => ({ en: value, zh: value, zhHans: value });

const BLUE = "#22d3ee";
const AMBER = "#facc15";
const GREEN = "#34d399";
const ROSE = "#fb7185";
const PURPLE = "#c084fc";
const WIDTH = 640;
const HEIGHT = 400;

function initialStateFor(id: HKSecondaryDedicatedLabId): NumericState {
  return Object.fromEntries(HK_SECONDARY_MODEL_CONTRACTS[id].parameters.map((item) => [item.id, item.initial]));
}

function formatValue(value: number, unit?: string) {
  return `${formatNumber(value, Number.isInteger(value) ? 0 : 2)}${unit ? ` ${unit}` : ""}`;
}

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function greatestCommonDivisor(first: number, second: number) {
  let left = Math.abs(Math.round(first));
  let right = Math.abs(Math.round(second));
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
}

function reducedPositiveFraction(numerator: number, denominator: number) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function exactPiMultiple(numerator: number, denominator: number, unit: string) {
  const reduced = reducedPositiveFraction(numerator, denominator);
  if (reduced.denominator === 1) {
    return `${reduced.numerator === 1 ? "" : reduced.numerator}π ${unit}`;
  }
  return `${reduced.numerator === 1 ? "" : reduced.numerator}π/${reduced.denominator} ${unit}`;
}

function pointOnCircle(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy - radius * Math.sin(radians) };
}

function pointsAttribute(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

type DiagramPoint = { x: number; y: number };
type DiagramSegment = { start: DiagramPoint; end: DiagramPoint };

function polygonSegments(points: DiagramPoint[]): DiagramSegment[] {
  return points.map((point, index) => ({ start: point, end: points[(index + 1) % points.length] }));
}

function distanceFromPointToSegment(point: DiagramPoint, segment: DiagramSegment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-9) return Math.hypot(point.x - segment.start.x, point.y - segment.start.y);
  const t = clamp(((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (segment.start.x + t * dx), point.y - (segment.start.y + t * dy));
}

function pointInsidePolygon(point: DiagramPoint, polygon: DiagramPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function labelPositionsOutsidePolygon(
  points: DiagramPoint[],
  obstacles: { polygons: DiagramPoint[][]; segments: DiagramSegment[] }
) {
  const centroid = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 }
  );
  return points.map((point) => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const outwardAngle = Math.atan2(dy, dx);
    const candidates = [30, 38, 46, 54].flatMap((distance) =>
      Array.from({ length: 17 }, (_, index) => -120 + index * 15).map((offsetDegrees) => {
        const angle = outwardAngle + (offsetDegrees * Math.PI) / 180;
        const centre = { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
        const inBounds = centre.x >= 24 && centre.x <= WIDTH - 24 && centre.y >= 30 && centre.y <= HEIGHT - 30;
        const insidePaintedRegion = obstacles.polygons.some((polygon) => pointInsidePolygon(centre, polygon));
        const lineClearance = Math.min(...obstacles.segments.map((segment) => distanceFromPointToSegment(centre, segment)));
        return {
          centre,
          score: (inBounds ? 0 : -10000) + (insidePaintedRegion ? -1000 : 0) + lineClearance * 10 - distance * 0.1 - Math.abs(offsetDegrees) * 0.02
        };
      })
    );
    const best = candidates.reduce((winner, candidate) => candidate.score > winner.score ? candidate : winner);
    return { x: best.centre.x, y: best.centre.y + 5 };
  });
}

function graphPath(
  evaluate: (x: number) => number,
  options: { xMin: number; xMax: number; yMin: number; yMax: number; left?: number; right?: number; top?: number; bottom?: number; samples?: number }
) {
  const { xMin, xMax, yMin, yMax, left = 62, right = 602, top = 42, bottom = 352, samples = 180 } = options;
  const commands: string[] = [];
  let previous: { x: number; y: number } | null = null;
  let lastDrawn: { x: number; y: number } | null = null;

  function map(point: { x: number; y: number }) {
    return {
      x: left + ((point.x - xMin) / (xMax - xMin)) * (right - left),
      y: bottom - ((point.y - yMin) / (yMax - yMin)) * (bottom - top)
    };
  }

  for (let index = 0; index < samples; index += 1) {
    const x = xMin + (index / (samples - 1)) * (xMax - xMin);
    const y = evaluate(x);
    if (!Number.isFinite(y)) {
      previous = null;
      lastDrawn = null;
      continue;
    }

    const current = { x, y };
    if (previous) {
      const deltaY = current.y - previous.y;
      let startRatio = 0;
      let endRatio = 1;
      if (Math.abs(deltaY) < 1e-12) {
        if (current.y < yMin || current.y > yMax) {
          startRatio = 1;
          endRatio = 0;
        }
      } else {
        const firstCrossing = (yMin - previous.y) / deltaY;
        const secondCrossing = (yMax - previous.y) / deltaY;
        startRatio = Math.max(0, Math.min(firstCrossing, secondCrossing));
        endRatio = Math.min(1, Math.max(firstCrossing, secondCrossing));
      }

      if (startRatio <= endRatio) {
        const clippedStart = map({
          x: previous.x + (current.x - previous.x) * startRatio,
          y: clamp(previous.y + deltaY * startRatio, yMin, yMax)
        });
        const clippedEnd = map({
          x: previous.x + (current.x - previous.x) * endRatio,
          y: clamp(previous.y + deltaY * endRatio, yMin, yMax)
        });
        const continues = lastDrawn
          && Math.abs(lastDrawn.x - clippedStart.x) < 0.02
          && Math.abs(lastDrawn.y - clippedStart.y) < 0.02;
        if (!continues) commands.push(`M ${clippedStart.x.toFixed(2)} ${clippedStart.y.toFixed(2)}`);
        commands.push(`L ${clippedEnd.x.toFixed(2)} ${clippedEnd.y.toFixed(2)}`);
        lastDrawn = clippedEnd;
      } else {
        lastDrawn = null;
      }
    }
    previous = current;
  }
  return commands.join(" ");
}

function coordinateMap(x: number, y: number, xMax = 10, yMax = 7) {
  const equalUnitScale = Math.min(270 / xMax, 150 / yMax);
  return { x: 320 + x * equalUnitScale, y: 200 - y * equalUnitScale };
}

function Grid({ theme, xTicks = 10, yTicks = 7 }: { theme: VisualizationTheme; xTicks?: number; yTicks?: number }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: xTicks * 2 + 1 }, (_, index) => index - xTicks).map((tick) => {
        const point = coordinateMap(tick, 0, xTicks, yTicks);
        return <line key={`x-${tick}`} x1={point.x} x2={point.x} y1="42" y2="352" stroke={tick === 0 ? theme.axisStrong : theme.grid} strokeWidth={tick === 0 ? 2.5 : 1} />;
      })}
      {Array.from({ length: yTicks * 2 + 1 }, (_, index) => index - yTicks).map((tick) => {
        const point = coordinateMap(0, tick, xTicks, yTicks);
        return <line key={`y-${tick}`} x1="50" x2="590" y1={point.y} y2={point.y} stroke={tick === 0 ? theme.axisStrong : theme.grid} strokeWidth={tick === 0 ? 2.5 : 1} />;
      })}
    </g>
  );
}

function Surface({ label, theme, children, name, interactive = false }: { label: string; theme: VisualizationTheme; children: ReactNode; name: string; interactive?: boolean }) {
  const { t } = useSettings();
  const panHint = t(enZh(
    "Swipe or use Shift + mouse wheel to pan the full diagram.",
    "左右滑動，或按住 Shift 並滾動滑鼠滾輪，以查看完整圖形。",
    "左右滑动，或按住 Shift 并滚动鼠标滚轮，以查看完整图形。"
  ));
  return (
    <div className="min-w-0">
      <div
        data-viz-pan-container
        tabIndex={0}
        role="region"
        aria-label={`${label}. ${panHint}`}
        className="focus-ring min-w-0 overflow-x-auto overscroll-x-contain rounded-3xl"
      >
        <svg
          data-viz-surface=""
          data-hk-viz-surface={name}
          data-viz-interactive={String(interactive)}
          role={interactive ? "group" : "img"}
          aria-label={label}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="aspect-[8/5] h-auto w-full min-w-[640px] overflow-visible"
        >
          <rect width={WIDTH} height={HEIGHT} rx="24" fill={theme.svgBackground} />
          {children}
        </svg>
      </div>
      <p data-viz-pan-hint className="mt-2 text-xs font-semibold text-slate-500 dark:text-white/55">{panHint}</p>
    </div>
  );
}

function MetricCard({ label, value, color = BLUE }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2 dark:border-white/10 dark:bg-white/[0.055]">
      <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-slate-500 dark:text-white/55">{label}</p>
      <p className="mt-1 flex min-w-0 items-center gap-2 break-words text-base font-black text-slate-950 dark:text-white">
        <span
          data-viz-color-swatch
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border border-slate-950/20 dark:border-white/30"
          style={{ backgroundColor: color }}
        />
        <span className="min-w-0 break-words">{value}</span>
      </p>
    </div>
  );
}

function sectorPath(cx: number, cy: number, radius: number, startDegrees: number, endDegrees: number) {
  const start = pointOnCircle(cx, cy, radius, startDegrees);
  const end = pointOnCircle(cx, cy, radius, endDegrees);
  const sweep = Math.abs(endDegrees - startDegrees);
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function lineEquationSummary(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return {
    dx,
    dy,
    gradient: dx === 0 ? null : dy / dx,
    distance: Math.hypot(dx, dy),
    midpoint: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  };
}

function renderIntegers(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const signedStep = activeMode === "subtract" ? -state.operand : state.operand;
  const end = state.start + signedStep;
  const map = (value: number) => 70 + ((value + 20) / 40) * 500;
  const startX = map(state.start);
  const endX = map(end);
  const arrowY = 178;
  return {
    formula: mathematicalFormula(`${formatNumber(state.start, 0)} ${activeMode === "subtract" ? "-" : "+"} (${formatNumber(state.operand, 0)}) = ${formatNumber(end, 0)}`),
    summary: t(enZh(
      `Start at ${state.start}; the signed operand is ${state.operand}. ${activeMode === "subtract" ? "Subtracting" : "Adding"} it moves ${Math.abs(signedStep)} unit${Math.abs(signedStep) === 1 ? "" : "s"} ${signedStep >= 0 ? "right" : "left"}; finish at ${end}.`,
      `由 ${state.start} 開始，運算數是 ${state.operand}。${activeMode === "subtract" ? "減去" : "加上"}它後向${signedStep >= 0 ? "右" : "左"}移動 ${Math.abs(signedStep)} 個單位，到達 ${end}。`,
      `由 ${state.start} 开始，运算数是 ${state.operand}。${activeMode === "subtract" ? "减去" : "加上"}它后向${signedStep >= 0 ? "右" : "左"}移动 ${Math.abs(signedStep)} 个单位，到达 ${end}。`
    )),
    surface: (
      <Surface name="integer-number-line" label={t(enZh("Signed movement on an integer number line", "整數數線上的有向移動"))} theme={theme}>
        <defs>
          <marker id="hk-integer-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
            <path d="M 0 0 L 12 6 L 0 12 Z" fill={AMBER} />
          </marker>
        </defs>
        <line data-viz-mark data-viz-name="integer-number-line" x1="70" x2="570" y1="235" y2="235" stroke={theme.axisStrong} strokeWidth="5" strokeLinecap="round" />
        {Array.from({ length: 41 }, (_, index) => -20 + index).map((tick) => (
          <line key={tick} data-viz-mark data-viz-name="integer-tick" data-viz-value={tick} x1={map(tick)} x2={map(tick)} y1={tick === 0 ? 211 : tick % 5 === 0 ? 217 : 224} y2={tick === 0 ? 259 : tick % 5 === 0 ? 253 : 246} stroke={tick === 0 ? GREEN : theme.axis} strokeWidth={tick === 0 ? 5 : tick % 5 === 0 ? 3 : 1.5} />
        ))}
        {[-20, -10, 0, 10, 20].map((tick) => <text key={tick} data-viz-label data-viz-name="integer-tick-label" x={map(tick)} y="286" textAnchor="middle" fill={theme.text} className="text-sm font-black">{tick}</text>)}
        {signedStep === 0 ? (
          <circle data-viz-mark data-viz-name="integer-zero-movement" data-viz-start={state.start} data-viz-end={end} cx={startX} cy={arrowY} r="25" fill="none" stroke={AMBER} strokeWidth="8" strokeDasharray="8 6" />
        ) : (
          <path
            data-viz-mark
            data-viz-name="integer-arrow"
            data-viz-start={state.start}
            data-viz-signed-step={signedStep}
            data-viz-end={end}
            d={`M ${startX} ${arrowY} Q ${(startX + endX) / 2} ${Math.max(82, arrowY - Math.abs(endX - startX) * 0.28)} ${endX} ${arrowY}`}
            fill="none"
            stroke={AMBER}
            strokeWidth="8"
            strokeLinecap="round"
            markerEnd="url(#hk-integer-arrow)"
          />
        )}
        <circle data-viz-mark data-viz-name="integer-start" data-viz-value={state.start} cx={startX} cy="235" r="13" fill={BLUE} stroke={theme.pointStroke} strokeWidth="4" />
        <circle data-viz-mark data-viz-name="integer-end" data-viz-value={end} cx={endX} cy="235" r="13" fill={GREEN} stroke={theme.pointStroke} strokeWidth="4" />
        <text data-viz-label data-viz-name="integer-start-label" x={startX} y="326" textAnchor="middle" fill={theme.text} className="text-sm font-black">S={state.start}</text>
        <text data-viz-label data-viz-name="integer-end-label" x={endX} y="356" textAnchor="middle" fill={theme.text} className="text-sm font-black">E={end}</text>
        <line data-viz-mark data-viz-name="integer-zero" x1={map(0)} x2={map(0)} y1="263" y2="270" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
      </Surface>
    )
  };
}

function renderAlgebraBasics(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const solution = state.b - state.a;
  const verifiedLeft = solution + state.a;
  const stepIndex = ["equation", "inverse", "check"].indexOf(activeMode);
  const leftUnits = Math.min(10, Math.abs(Math.round(state.a)));
  const rightUnits = Math.min(14, Math.abs(Math.round(state.b)));
  return {
    formula: mathematicalFormula(activeMode === "equation"
      ? `x ${state.a >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.a), 0)} = ${formatNumber(state.b, 0)}`
      : activeMode === "inverse"
        ? `x + (${formatNumber(state.a, 0)}) - (${formatNumber(state.a, 0)}) = ${formatNumber(state.b, 0)} - (${formatNumber(state.a, 0)}); x = ${formatNumber(solution, 0)}`
        : `${formatNumber(solution, 0)} + (${formatNumber(state.a, 0)}) = ${formatNumber(verifiedLeft, 0)} = ${formatNumber(state.b, 0)}`),
    summary: t(enZh(
      `The symbolic balance x + (${state.a}) = ${state.b} stays equal when ${state.a} is subtracted from both sides. This isolates x = ${solution}; substitution gives ${verifiedLeft} = ${state.b}.`,
      `符號天平 x + (${state.a}) = ${state.b} 的兩邊同減 ${state.a} 後仍相等，得到 x = ${solution}；代入後 ${verifiedLeft} = ${state.b}。`,
      `符号天平 x + (${state.a}) = ${state.b} 的两边同减 ${state.a} 后仍相等，得到 x = ${solution}；代入后 ${verifiedLeft} = ${state.b}。`
    )),
    surface: (
      <Surface name="algebra-symbolic-balance" label={t(enZh("Symbolic equation balance with inverse operations", "帶逆運算的符號方程天平"))} theme={theme}>
        <line data-viz-mark data-viz-name="algebra-balance-beam" data-viz-equal="true" x1="76" x2="564" y1="216" y2="216" stroke={theme.axisStrong} strokeWidth="9" strokeLinecap="round" />
        <path data-viz-name="algebra-left-pan" d="M 92 222 L 66 318 H 264 L 238 222" fill={theme.softFill} stroke={BLUE} strokeWidth="4" />
        <path data-viz-name="algebra-right-pan" d="M 402 222 L 376 318 H 574 L 548 222" fill={theme.softFill} stroke={GREEN} strokeWidth="4" />
        <path data-viz-mark data-viz-name="algebra-balance-stand" d="M 320 216 L 272 356 H 368 Z" fill={PURPLE} opacity="0.65" stroke={theme.pointStroke} strokeWidth="3" />
        <g data-viz-overlap-ok="algebra-x-tile-label" data-viz-overlap-reason="The x glyph names the single symbolic tile that contains it.">
          <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="algebra-x-tile" data-viz-solution={solution} x="92" y="252" width="70" height="52" rx="12" fill={BLUE} opacity="0.86" stroke={theme.pointStroke} strokeWidth="3" />
          <text data-viz-label data-viz-overlap-member="label" data-viz-name="algebra-symbol-label" x="127" y="285" textAnchor="middle" fill="#0f172a" className="text-lg font-black">x</text>
        </g>
        <g data-viz-mark data-viz-name="algebra-left-units" data-viz-value={state.a} opacity={stepIndex >= 1 ? 0.22 : 1}>
          {Array.from({ length: leftUnits }, (_, index) => <rect key={index} x={174 + (index % 4) * 19} y={258 + Math.floor(index / 4) * 19} width="14" height="14" rx="3" fill={state.a >= 0 ? AMBER : ROSE} />)}
        </g>
        <text data-viz-label data-viz-name="algebra-left-constant-label" x="208" y="344" textAnchor="middle" fill={theme.text} className="text-sm font-black">a = {formatNumber(state.a, 0)}</text>
        <g data-viz-mark data-viz-name="algebra-right-units" data-viz-value={state.b}>
          {Array.from({ length: rightUnits }, (_, index) => <rect key={index} x={408 + (index % 7) * 20} y={258 + Math.floor(index / 7) * 20} width="15" height="15" rx="3" fill={state.b >= 0 ? GREEN : ROSE} />)}
        </g>
        <text data-viz-label data-viz-name="algebra-right-value-label" x="475" y="344" textAnchor="middle" fill={theme.text} className="text-sm font-black">b = {formatNumber(state.b, 0)}</text>
        <g data-viz-name="algebra-inverse-operation" data-viz-operation={-state.a} data-viz-applied-both-sides="true" opacity={stepIndex >= 1 ? 1 : 0.28}>
          <path d="M 150 126 V 184 M 490 126 V 184" stroke={AMBER} strokeWidth="8" strokeLinecap="round" />
          <g data-viz-overlap-ok="algebra-inverse-left-label" data-viz-overlap-reason="The minus-a glyph names the single left inverse-operation token that contains it.">
            <circle data-viz-mark data-viz-overlap-member="mark" data-viz-name="algebra-inverse-left-token" cx="150" cy="104" r="18" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="algebra-inverse-left-label" x="150" y="109" textAnchor="middle" fill="#0f172a" className="text-xs font-black">−a</text>
          </g>
          <g data-viz-overlap-ok="algebra-inverse-right-label" data-viz-overlap-reason="The minus-a glyph names the single right inverse-operation token that contains it.">
            <circle data-viz-mark data-viz-overlap-member="mark" data-viz-name="algebra-inverse-right-token" cx="490" cy="104" r="18" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="algebra-inverse-right-label" x="490" y="109" textAnchor="middle" fill="#0f172a" className="text-xs font-black">−a</text>
          </g>
        </g>
        <circle data-viz-mark data-viz-name="algebra-solution" data-viz-x={solution} data-viz-substitution-left={verifiedLeft} data-viz-substitution-right={state.b} data-viz-verified={String(verifiedLeft === state.b)} cx="320" cy="72" r={activeMode === "check" ? 24 : 15} fill={activeMode === "check" ? GREEN : AMBER} stroke={theme.pointStroke} strokeWidth="4" />
      </Surface>
    )
  };
}

function triangleAngle(vertex: { x: number; y: number }, first: { x: number; y: number }, second: { x: number; y: number }) {
  const firstVector = { x: first.x - vertex.x, y: first.y - vertex.y };
  const secondVector = { x: second.x - vertex.x, y: second.y - vertex.y };
  const denominator = Math.hypot(firstVector.x, firstVector.y) * Math.hypot(secondVector.x, secondVector.y);
  if (denominator < 1e-8) return 0;
  return Math.acos(clamp((firstVector.x * secondVector.x + firstVector.y * secondVector.y) / denominator, -1, 1)) * 180 / Math.PI;
}

function triangleAreaFromState(state: NumericState) {
  return Math.abs((state.bx - state.ax) * (state.cy - state.ay) - (state.by - state.ay) * (state.cx - state.ax)) / 2;
}

function triangleMinimumSideFromState(state: NumericState) {
  return Math.min(
    Math.hypot(state.ax - state.bx, state.ay - state.by),
    Math.hypot(state.bx - state.cx, state.by - state.cy),
    Math.hypot(state.cx - state.ax, state.cy - state.ay)
  );
}

function triangleStateIsValid(state: NumericState) {
  return triangleAreaFromState(state) >= 0.25 && triangleMinimumSideFromState(state) >= 2.5;
}

export function projectValidTriangleCoordinate(current: NumericState, coordinateId: string, requestedValue: number) {
  const requested = { ...current, [coordinateId]: requestedValue };
  if (triangleStateIsValid(requested)) return requested;

  const coordinateIds = ["ax", "ay", "bx", "by", "cx", "cy"];
  const companionId = `${coordinateId.slice(0, 1)}${coordinateId.endsWith("x") ? "y" : "x"}`;
  const companionIds = [companionId, ...coordinateIds.filter((id) => id !== coordinateId && id !== companionId)];
  const companionStep = 0.25;
  let candidateOrder = 0;
  const nearestCandidate: {
    value: {
      candidate: NumericState;
      candidateOrder: number;
      squaredDisplacement: number;
    } | null;
  } = { value: null };

  function considerCandidate(candidate: NumericState) {
    const order = candidateOrder++;
    if (candidate[coordinateId] !== requestedValue || !triangleStateIsValid(candidate)) return;
    const squaredDisplacement = coordinateIds.reduce((total, id) => (
      total + (candidate[id] - requested[id]) ** 2
    ), 0);
    if (!Number.isFinite(squaredDisplacement)) return;
    if (
      nearestCandidate.value === null
      || squaredDisplacement < nearestCandidate.value.squaredDisplacement
      || (
        squaredDisplacement === nearestCandidate.value.squaredDisplacement
        && order < nearestCandidate.value.candidateOrder
      )
    ) {
      nearestCandidate.value = { candidate, candidateOrder: order, squaredDisplacement };
    }
  }

  for (const candidateCompanionId of companionIds) {
    const companionIsX = candidateCompanionId.endsWith("x");
    const companionMin = companionIsX ? -8 : -5;
    const companionMax = companionIsX ? 8 : 5;
    const startingValue = requested[candidateCompanionId];
    const checkedValues = new Set<number>();

    for (let offset = companionStep; offset <= companionMax - companionMin + companionStep; offset += companionStep) {
      for (const direction of [1, -1]) {
        const companionValue = clamp(round(startingValue + direction * offset, 2), companionMin, companionMax);
        if (checkedValues.has(companionValue)) continue;
        checkedValues.add(companionValue);
        const candidate = { ...requested, [candidateCompanionId]: companionValue };
        considerCandidate(candidate);
      }
    }
  }

  const changedVertex = coordinateId.slice(0, 1);
  for (const fallbackVertex of ["a", "b", "c"].filter((vertex) => vertex !== changedVertex)) {
    for (let fallbackX = -8; fallbackX <= 8; fallbackX += companionStep) {
      for (let fallbackY = -5; fallbackY <= 5; fallbackY += companionStep) {
        const candidate = { ...requested, [`${fallbackVertex}x`]: fallbackX, [`${fallbackVertex}y`]: fallbackY };
        considerCandidate(candidate);
      }
    }
  }

  const otherVertices = ["a", "b", "c"].filter((vertex) => vertex !== changedVertex);
  const mirroredBoundaryCandidates = [-1, 1].flatMap((mirror) => [false, true].map((swap) => {
    const firstOther = otherVertices[0];
    const secondOther = otherVertices[1];
    if (coordinateId.endsWith("x")) {
      const changedY = mirror * 5;
      const [firstX, secondX] = swap ? [8, -8] : [-8, 8];
      return {
        ...requested,
        [`${changedVertex}y`]: changedY,
        [`${firstOther}x`]: firstX,
        [`${firstOther}y`]: -changedY,
        [`${secondOther}x`]: secondX,
        [`${secondOther}y`]: -changedY
      };
    }
    const changedX = mirror * 8;
    const [firstY, secondY] = swap ? [5, -5] : [-5, 5];
    return {
      ...requested,
      [`${changedVertex}x`]: changedX,
      [`${firstOther}x`]: -changedX,
      [`${firstOther}y`]: firstY,
      [`${secondOther}x`]: -changedX,
      [`${secondOther}y`]: secondY
    };
  }));
  for (const candidate of mirroredBoundaryCandidates) considerCandidate(candidate);

  if (nearestCandidate.value !== null) return nearestCandidate.value.candidate;
  if (triangleStateIsValid(current)) return current;
  throw new Error("Unable to project a finite non-degenerate triangle state.");
}

function interiorAngleArcPath(
  vertex: { x: number; y: number },
  first: { x: number; y: number },
  second: { x: number; y: number },
  radius: number
) {
  const startAngle = Math.atan2(first.y - vertex.y, first.x - vertex.x) * 180 / Math.PI;
  const endAngle = Math.atan2(second.y - vertex.y, second.x - vertex.x) * 180 / Math.PI;
  const delta = ((endAngle - startAngle + 540) % 360) - 180;
  const startRadians = startAngle * Math.PI / 180;
  const endRadians = (startAngle + delta) * Math.PI / 180;
  const start = { x: vertex.x + radius * Math.cos(startRadians), y: vertex.y + radius * Math.sin(startRadians) };
  const end = { x: vertex.x + radius * Math.cos(endRadians), y: vertex.y + radius * Math.sin(endRadians) };
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 ${delta >= 0 ? 1 : 0} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

type NumericStateSetter = (updater: (current: NumericState) => NumericState) => void;

function renderAngles(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator, setState: NumericStateSetter): ModelRender {
  const vertices = [
    { id: "a", label: "A", x: state.ax, y: state.ay, color: BLUE },
    { id: "b", label: "B", x: state.bx, y: state.by, color: AMBER },
    { id: "c", label: "C", x: state.cx, y: state.cy, color: GREEN }
  ];
  const angles = [
    triangleAngle(vertices[0], vertices[1], vertices[2]),
    triangleAngle(vertices[1], vertices[0], vertices[2]),
    triangleAngle(vertices[2], vertices[0], vertices[1])
  ];
  const angleSum = angles.reduce((sum, value) => sum + value, 0);
  const screenVertices = vertices.map((vertex) => ({ x: 320 + vertex.x * 27, y: 200 - vertex.y * 27 }));
  const centroid = screenVertices.reduce((sum, point) => ({ x: sum.x + point.x / 3, y: sum.y + point.y / 3 }), { x: 0, y: 0 });
  const labelPositions = screenVertices.map((point) => {
    const length = Math.max(1, Math.hypot(point.x - centroid.x, point.y - centroid.y));
    return {
      x: clamp(point.x + ((point.x - centroid.x) / length) * 58, 28, WIDTH - 28),
      y: clamp(point.y + ((point.y - centroid.y) / length) * 58, 32, HEIGHT - 24)
    };
  });
  const straightPartner = 180 - angles[0];
  const pointRemainder = 360 - angles[0] - angles[1];
  const cx = 320;
  const cy = 212;

  function setVertex(id: string, x: number, y: number) {
    setState((current) => {
      const targetX = clamp(round(x, 2), -8, 8);
      const targetY = clamp(round(y, 2), -5, 5);
      let next = { ...current };
      if (targetX !== current[`${id}x`]) next = projectValidTriangleCoordinate(next, `${id}x`, targetX);
      if (targetY !== current[`${id}y`]) next = projectValidTriangleCoordinate(next, `${id}y`, targetY);
      return next;
    });
  }

  function moveVertexFromPointer(id: string, event: ReactPointerEvent<SVGCircleElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * WIDTH;
    const svgY = ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * HEIGHT;
    setVertex(id, (svgX - 320) / 27, (200 - svgY) / 27);
  }

  function moveVertexFromKeyboard(vertex: (typeof vertices)[number], event: ReactKeyboardEvent<SVGCircleElement>) {
    const delta = event.shiftKey ? 1 : 0.25;
    const movement = event.key === "ArrowLeft" ? { x: -delta, y: 0 }
      : event.key === "ArrowRight" ? { x: delta, y: 0 }
        : event.key === "ArrowUp" ? { x: 0, y: delta }
          : event.key === "ArrowDown" ? { x: 0, y: -delta }
            : null;
    if (!movement) return;
    event.preventDefault();
    setVertex(vertex.id, vertex.x + movement.x, vertex.y + movement.y);
  }

  const formula = mathematicalFormula(activeMode === "triangle"
    ? `${formatNumber(angles[0], 2)}° + ${formatNumber(angles[1], 2)}° + ${formatNumber(angles[2], 2)}° = ${formatNumber(angleSum, 2)}°`
    : activeMode === "straight"
      ? `${formatNumber(angles[0], 2)}° + ${formatNumber(straightPartner, 2)}° = 180°`
      : `${formatNumber(angles[0], 2)}° + ${formatNumber(angles[1], 2)}° + ${formatNumber(pointRemainder, 2)}° = 360°`);
  return {
    formula,
    summary: t(enZh(
      `Triangle vertices A(${state.ax}, ${state.ay}), B(${state.bx}, ${state.by}), C(${state.cx}, ${state.cy}) give angles ${formatNumber(angles[0], 2)}°, ${formatNumber(angles[1], 2)}°, ${formatNumber(angles[2], 2)}° and sum ${formatNumber(angleSum, 4)}° (rounding tolerance 0.01°).`,
      `三角形頂點 A(${state.ax}, ${state.ay})、B(${state.bx}, ${state.by})、C(${state.cx}, ${state.cy}) 的三角為 ${formatNumber(angles[0], 2)}°、${formatNumber(angles[1], 2)}°、${formatNumber(angles[2], 2)}°，總和 ${formatNumber(angleSum, 4)}°（捨入容差 0.01°）。`,
      `三角形顶点 A(${state.ax}, ${state.ay})、B(${state.bx}, ${state.by})、C(${state.cx}, ${state.cy}) 的三角为 ${formatNumber(angles[0], 2)}°、${formatNumber(angles[1], 2)}°、${formatNumber(angles[2], 2)}°，总和 ${formatNumber(angleSum, 4)}°（舍入容差 0.01°）。`
    )),
    surface: (
      <Surface name="angle-invariants" label={t(enZh("Draggable triangle and related angle-sum invariants", "可拖曳三角形與相關角和不變量"))} theme={theme} interactive>
        {activeMode === "triangle" ? (
          <>
            <polygon data-viz-mark data-viz-name="angle-triangle" data-viz-angle-sum={formatNumber(angleSum, 6)} data-viz-rounding-tolerance="0.01" points={pointsAttribute(screenVertices)} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="6" strokeLinejoin="round" />
            {vertices.map((vertex, index) => {
              const point = screenVertices[index];
              return (
                <g key={vertex.id}>
                  <circle
                    data-viz-name={`angle-vertex-${vertex.id}`}
                    data-viz-pointer-target="angle-vertex-hit-area"
                    data-viz-hit-diameter="48"
                    data-viz-vertex={vertex.label}
                    data-viz-x={vertex.x}
                    data-viz-y={vertex.y}
                    data-viz-angle={formatNumber(angles[index], 6)}
                    cx={point.x}
                    cy={point.y}
                    r="24"
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth="1"
                    tabIndex={0}
                    role="button"
                    aria-label={t(enZh(`Drag vertex ${vertex.label}; arrow keys also move it`, `拖曳頂點 ${vertex.label}；亦可用方向鍵移動`))}
                    aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                    className="peer focus:outline-none"
                    style={{ cursor: "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      moveVertexFromPointer(vertex.id, event);
                    }}
                    onPointerMove={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) moveVertexFromPointer(vertex.id, event);
                    }}
                    onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
                    onPointerCancel={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onKeyDown={(event) => moveVertexFromKeyboard(vertex, event)}
                  />
                  <circle
                    data-viz-mark
                    data-viz-name={`angle-vertex-handle-${vertex.id}`}
                    data-viz-vertex={vertex.label}
                    data-viz-x={vertex.x}
                    data-viz-y={vertex.y}
                    data-viz-angle={formatNumber(angles[index], 6)}
                    aria-hidden="true"
                    pointerEvents="none"
                    cx={point.x}
                    cy={point.y}
                    r="14"
                    fill={vertex.color}
                    stroke={theme.pointStroke}
                    strokeWidth="4"
                  />
                  <circle
                    data-viz-vertex-focus-ring={vertex.id}
                    aria-hidden="true"
                    pointerEvents="none"
                    cx={point.x}
                    cy={point.y}
                    r="21"
                    fill="none"
                    stroke={theme.text}
                    strokeWidth="3"
                    className="opacity-0 transition-opacity motion-reduce:transition-none peer-focus:opacity-100"
                  />
                  <path
                    data-viz-mark
                    data-viz-name={`angle-${vertex.id}`}
                    data-viz-degrees={formatNumber(angles[index], 6)}
                    d={interiorAngleArcPath(point, screenVertices[(index + 1) % 3], screenVertices[(index + 2) % 3], 30)}
                    fill="none"
                    stroke={vertex.color}
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <text data-viz-label data-viz-name={`angle-label-${vertex.id}`} x={labelPositions[index].x} y={labelPositions[index].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">{vertex.label}</text>
                </g>
              );
            })}
            <g data-viz-mark data-viz-name="angle-sum-state" data-viz-angle-a={formatNumber(angles[0], 6)} data-viz-angle-b={formatNumber(angles[1], 6)} data-viz-angle-c={formatNumber(angles[2], 6)} data-viz-sum={formatNumber(angleSum, 6)} />
          </>
        ) : activeMode === "straight" ? (
          <>
            <line data-viz-mark data-viz-name="angle-straight-line" x1="92" x2="548" y1={cy} y2={cy} stroke={theme.axisStrong} strokeWidth="7" strokeLinecap="round" />
            <line data-viz-mark data-viz-name="angle-shared-ray" x1={cx} x2={pointOnCircle(cx, cy, 136, angles[0]).x} y1={cy} y2={pointOnCircle(cx, cy, 136, angles[0]).y} stroke={AMBER} strokeWidth="8" strokeLinecap="round" />
            <path data-viz-mark data-viz-name="angle-a" data-viz-degrees={formatNumber(angles[0], 6)} d={sectorPath(cx, cy, 82, 0, angles[0])} fill={BLUE} opacity="0.62" />
            <path data-viz-mark data-viz-name="angle-straight-partner" data-viz-degrees={formatNumber(straightPartner, 6)} d={sectorPath(cx, cy, 70, angles[0], 180)} fill={GREEN} opacity="0.62" />
          </>
        ) : (
          <>
            <circle data-viz-mark data-viz-name="angle-full-turn" data-viz-total="360" cx={cx} cy={cy} r="146" fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="5" />
            <path data-viz-mark data-viz-name="angle-a" data-viz-degrees={formatNumber(angles[0], 6)} d={sectorPath(cx, cy, 142, 0, angles[0])} fill={BLUE} opacity="0.62" />
            <path data-viz-mark data-viz-name="angle-b" data-viz-degrees={formatNumber(angles[1], 6)} d={sectorPath(cx, cy, 142, angles[0], angles[0] + angles[1])} fill={AMBER} opacity="0.62" />
            <path data-viz-mark data-viz-name="angle-around-point-remainder" data-viz-degrees={formatNumber(pointRemainder, 6)} d={sectorPath(cx, cy, 142, angles[0] + angles[1], 360)} fill={GREEN} opacity="0.52" />
          </>
        )}
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="∠A" value={`${formatNumber(angles[0], 2)}°`} color={BLUE} />
        <MetricCard label="∠B" value={`${formatNumber(angles[1], 2)}°`} color={AMBER} />
        <MetricCard label="∠C" value={`${formatNumber(angles[2], 2)}°`} color={GREEN} />
        <p data-viz-label data-viz-name="angle-endpoint-projection-note" className="col-span-3 rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-white/65">
          {t(enZh(
            "Every slider endpoint is reachable. If a move would merge points or flatten the triangle, the nearest companion coordinate moves just enough to keep a valid triangle.",
            "每個滑桿端點都可到達。若移動會令頂點重合或三角形變平，最近的配對坐標會作最小調整以保持有效三角形。",
            "每个滑杆端点都可到达。若移动会令顶点重合或三角形变平，最近的配对坐标会作最小调整以保持有效三角形。"
          ))}
        </p>
      </div>
    )
  };
}

function renderRatios(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const total = state.a + state.b;
  const baseWidth = 430;
  const aWidth = (state.a / total) * baseWidth;
  const scaledA = state.a * state.k;
  const scaledB = state.b * state.k;
  const unitRate = state.b / state.a;
  const formula = activeMode === "equivalent"
    ? enZh(
      `a:b = ka:kb; ${formatNumber(state.a, 0)}:${formatNumber(state.b, 0)} = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`,
      `a:b = ka:kb；${formatNumber(state.a, 0)}:${formatNumber(state.b, 0)} = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`,
      `a:b = ka:kb；${formatNumber(state.a, 0)}:${formatNumber(state.b, 0)} = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`
    )
    : activeMode === "scale"
      ? enZh(
        `multiply both terms by k = ${formatNumber(state.k, 0)}: (${formatNumber(state.a, 0)}×${formatNumber(state.k, 0)}):(${formatNumber(state.b, 0)}×${formatNumber(state.k, 0)}) = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`,
        `兩項同乘 k = ${formatNumber(state.k, 0)}：(${formatNumber(state.a, 0)}×${formatNumber(state.k, 0)}):(${formatNumber(state.b, 0)}×${formatNumber(state.k, 0)}) = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`,
        `两项同乘 k = ${formatNumber(state.k, 0)}：(${formatNumber(state.a, 0)}×${formatNumber(state.k, 0)}):(${formatNumber(state.b, 0)}×${formatNumber(state.k, 0)}) = ${formatNumber(scaledA, 0)}:${formatNumber(scaledB, 0)}`
      )
      : enZh(
        `unit rate B per A = ${formatNumber(state.b, 0)}/${formatNumber(state.a, 0)} = ${formatNumber(unitRate, 2)}`,
        `每 1 份 A 對應 B = ${formatNumber(state.b, 0)}/${formatNumber(state.a, 0)} = ${formatNumber(unitRate, 2)}`,
        `每 1 份 A 对应 B = ${formatNumber(state.b, 0)}/${formatNumber(state.a, 0)} = ${formatNumber(unitRate, 2)}`
      );
  return {
    formula,
    summary: t(enZh(
      activeMode === "equivalent"
        ? `${state.a}:${state.b} and ${scaledA}:${scaledB} are equivalent because both terms share the same multiplier k = ${state.k}.`
        : activeMode === "scale"
          ? `Build ${state.k} equal copies of ${state.a}:${state.b}; together they contain ${scaledA} A-parts and ${scaledB} B-parts.`
          : `Divide B = ${state.b} by A = ${state.a}; every 1 A-part corresponds to ${formatNumber(unitRate, 2)} B-parts.`,
      activeMode === "equivalent"
        ? `${state.a}:${state.b} 與 ${scaledA}:${scaledB} 是等值比，因為兩項使用相同乘數 k = ${state.k}。`
        : activeMode === "scale"
          ? `建立 ${state.k} 組相同的 ${state.a}:${state.b}；合共有 ${scaledA} 份 A 和 ${scaledB} 份 B。`
          : `以 B = ${state.b} 除以 A = ${state.a}；每 1 份 A 對應 ${formatNumber(unitRate, 2)} 份 B。`,
      activeMode === "equivalent"
        ? `${state.a}:${state.b} 与 ${scaledA}:${scaledB} 是等值比，因为两项使用相同乘数 k = ${state.k}。`
        : activeMode === "scale"
          ? `建立 ${state.k} 组相同的 ${state.a}:${state.b}；合共有 ${scaledA} 份 A 和 ${scaledB} 份 B。`
          : `以 B = ${state.b} 除以 A = ${state.a}；每 1 份 A 对应 ${formatNumber(unitRate, 2)} 份 B。`
    )),
    surface: (
      <Surface name="ratio-scaling" label={t(enZh("Equivalent and scaled ratio bars", "等值與縮放比條"))} theme={theme}>
        <g data-viz-mark data-viz-name="ratio-mode-state" data-viz-ratio-operation={activeMode} />
        <g data-viz-name="ratio-base" data-viz-a={state.a} data-viz-b={state.b} opacity={activeMode === "scale" ? 0.56 : 1}>
          <rect x="105" y="90" width={baseWidth} height="64" rx="18" fill={theme.emptyFill} stroke={theme.axis} strokeWidth="3" />
          <g data-viz-overlap-ok="ratio-base-a-label" data-viz-overlap-reason="The A value names the single blue ratio segment that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="ratio-base-a-segment" x="105" y="90" width={aWidth} height="64" rx="18" fill={BLUE} opacity="0.82" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="ratio-base-a-label" x={105 + aWidth / 2} y="129" textAnchor="middle" fill="#0f172a" className="text-sm font-black">A={formatNumber(state.a, 0)}</text>
          </g>
          <g data-viz-overlap-ok="ratio-base-b-label" data-viz-overlap-reason="The B value names the single amber ratio segment that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="ratio-base-b-segment" x={105 + aWidth} y="90" width={baseWidth - aWidth} height="64" rx="18" fill={AMBER} opacity="0.82" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="ratio-base-b-label" x={105 + aWidth + (baseWidth - aWidth) / 2} y="129" textAnchor="middle" fill="#0f172a" className="text-sm font-black">B={formatNumber(state.b, 0)}</text>
          </g>
        </g>
        <g data-viz-mark data-viz-name="ratio-equivalence-state" data-viz-active={String(activeMode === "equivalent")} opacity={activeMode === "equivalent" ? 1 : 0}>
          <text data-viz-label data-viz-name="ratio-equivalence-label" x="320" y="197" textAnchor="middle" fill={theme.text} className="text-3xl font-black">=</text>
        </g>
        <g data-viz-mark data-viz-name="ratio-scale-state" data-viz-active={String(activeMode === "scale")} opacity={activeMode === "scale" ? 1 : 0}>
          <path d="M 240 190 H 400" stroke={PURPLE} strokeWidth="5" strokeLinecap="round" />
          <text data-viz-label data-viz-name="ratio-scale-operation-label" x="320" y="184" textAnchor="middle" fill={theme.text} className="text-sm font-black">× k={formatNumber(state.k, 0)}</text>
        </g>
        <g data-viz-mark data-viz-name="ratio-scale-groups" data-viz-scale={state.k} opacity={activeMode === "scale" ? 1 : activeMode === "equivalent" ? 0.68 : 0.24}>
          {Array.from({ length: Math.round(state.k) }, (_, index) => (
            <g key={index}>
              <rect x={68 + index * (500 / state.k)} y="222" width={500 / state.k - 8} height="78" rx="13" fill={theme.softFill} stroke={PURPLE} strokeWidth="2" />
              <rect x={74 + index * (500 / state.k)} y="232" width={(500 / state.k - 20) * (state.a / total)} height="58" rx="10" fill={BLUE} opacity="0.75" />
              <rect x={74 + index * (500 / state.k) + (500 / state.k - 20) * (state.a / total)} y="232" width={(500 / state.k - 20) * (state.b / total)} height="58" rx="10" fill={AMBER} opacity="0.75" />
            </g>
          ))}
        </g>
        <text data-viz-label data-viz-name="ratio-scaled-a-label" x="204" y="334" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(scaledA, 0)} A</text>
        <text data-viz-label data-viz-name="ratio-scaled-b-label" x="436" y="334" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(scaledB, 0)} B</text>
        <circle data-viz-mark data-viz-name="ratio-unit-rate" data-viz-value={formatNumber(unitRate, 4)} cx="566" cy="122" r={activeMode === "unit" ? 24 : 12} fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" />
        <text data-viz-label data-viz-name="ratio-unit-rate-label" x="520" y="52" textAnchor="middle" fill={theme.text} className="text-sm font-black">1 A → {formatNumber(unitRate, 2)} B</text>
      </Surface>
    )
  };
}

function renderLinearEquation(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const solution = (state.c - state.b) / state.a;
  const leftAfterSubtract = state.a * solution;
  const rightAfterSubtract = state.c - state.b;
  const verified = Math.abs(state.a * solution + state.b - state.c) < 1e-9;
  const beamRotation = verified ? 0 : clamp((state.a * solution + state.b - state.c) * 0.8, -8, 8);
  const stepIndex = ["equation", "subtract", "divide", "check"].indexOf(activeMode);
  const formula = mathematicalFormula(activeMode === "equation"
    ? `${formatNumber(state.a, 0)}x ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 0)} = ${formatNumber(state.c, 0)}`
    : activeMode === "subtract"
      ? `${formatNumber(state.a, 0)}x = ${formatNumber(state.c, 0)} - (${formatNumber(state.b, 0)}) = ${formatNumber(rightAfterSubtract, 2)}`
      : activeMode === "divide"
        ? `x = ${formatNumber(rightAfterSubtract, 2)}/${formatNumber(state.a, 0)} = ${formatNumber(solution, 2)}`
        : `${formatNumber(state.a, 0)}(${formatNumber(solution, 2)}) ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 0)} = ${formatNumber(state.c, 0)}`);
  return {
    formula,
    summary: t(enZh(
      `Inverse steps preserve equality: subtract ${state.b}, divide by ${state.a}, then substitute x = ${formatNumber(solution, 2)}; check ${verified ? "passes" : "fails"}.`,
      `逆運算保持等式：減去 ${state.b}，再除以 ${state.a}，得到 x = ${formatNumber(solution, 2)}；代入檢查${verified ? "成立" : "不成立"}。`,
      `逆运算保持等式：减去 ${state.b}，再除以 ${state.a}，得到 x = ${formatNumber(solution, 2)}；代入检查${verified ? "成立" : "不成立"}。`
    )),
    surface: (
      <Surface name="linear-equation-balance" label={t(enZh("Equation balance and inverse-operation steps", "方程天平與逆運算步驟"))} theme={theme}>
        <g transform={`rotate(${beamRotation} 320 210)`}>
          <line data-viz-mark data-viz-name="equation-balance-beam" x1="104" x2="536" y1="210" y2="210" stroke={theme.axisStrong} strokeWidth="9" strokeLinecap="round" />
          <path data-viz-name="equation-left-pan" d="M 108 216 L 78 302 H 236 L 206 216" fill={theme.softFill} stroke={BLUE} strokeWidth="4" />
          <path data-viz-name="equation-right-pan" d="M 434 216 L 404 302 H 562 L 532 216" fill={theme.softFill} stroke={GREEN} strokeWidth="4" />
        </g>
        <path data-viz-mark data-viz-name="equation-stand" d="M 320 210 L 276 342 H 364 Z" fill={PURPLE} opacity="0.68" stroke={theme.pointStroke} strokeWidth="3" />
        <g data-viz-mark data-viz-name="equation-x-blocks" data-viz-count={state.a} data-viz-solution={formatNumber(solution, 4)} opacity={stepIndex >= 2 ? 0.72 : 1}>
          {Array.from({ length: Math.round(state.a) }, (_, index) => <rect key={index} x={92 + (index % 3) * 32} y={238 + Math.floor(index / 3) * 35} width="22" height="28" rx="5" fill={BLUE} stroke={theme.pointStroke} strokeWidth="2" />)}
        </g>
        <text data-viz-label data-viz-name="equation-x-label" x="140" y="330" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(state.a, 0)}x</text>
        <rect data-viz-mark data-viz-name="equation-constant" data-viz-value={state.b} x="190" y="254" width="30" height="34" rx="7" fill={state.b >= 0 ? AMBER : ROSE} opacity={stepIndex >= 1 ? 0.24 : 0.9} stroke={theme.pointStroke} strokeWidth="2" />
        <text data-viz-label data-viz-name="equation-constant-label" x="205" y="310" textAnchor="middle" fill={theme.text} className="text-sm font-black">b={formatNumber(state.b, 0)}</text>
        <g data-viz-overlap-ok="equation-right-side-label" data-viz-overlap-reason="The c value names the single right-side balance block that contains it.">
          <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="equation-right-side" data-viz-value={state.c} x="450" y="248" width="66" height="40" rx="10" fill={GREEN} opacity="0.86" />
          <text data-viz-label data-viz-overlap-member="label" data-viz-name="equation-right-label" x="483" y="273" textAnchor="middle" fill="#0f172a" className="text-sm font-black">c={formatNumber(state.c, 0)}</text>
        </g>
        <g data-viz-mark data-viz-name="equation-solution" data-viz-x={formatNumber(solution, 4)} data-viz-left-after-subtract={formatNumber(leftAfterSubtract, 4)} data-viz-right-after-subtract={formatNumber(rightAfterSubtract, 4)} data-viz-subtract-b-both-sides="true" data-viz-divide-a-both-sides="true" data-viz-substitution-verified={String(verified)}>
          {[0, 1, 2, 3].map((index) => <circle key={index} cx={212 + index * 72} cy="92" r={index <= stepIndex ? 15 : 10} fill={index <= stepIndex ? GREEN : theme.emptyFill} stroke={index === stepIndex ? AMBER : theme.axis} strokeWidth={index === stepIndex ? 5 : 2} />)}
          <line x1="227" x2="413" y1="92" y2="92" stroke={theme.axis} strokeWidth="4" />
        </g>
      </Surface>
    )
  };
}

function renderCoordinates(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const original = [
    { label: "A", x: state.x1, y: state.y1, color: BLUE },
    { label: "B", x: state.x2, y: state.y2, color: AMBER },
    { label: "C", x: state.x3, y: state.y3, color: GREEN }
  ];
  const image = original.map((point) => activeMode === "translate"
    ? { ...point, x: point.x + state.dx, y: point.y + state.dy }
    : activeMode === "reflect"
      ? { ...point, x: 2 * state.mirror - point.x }
      : point);
  const originalScreen = original.map((point) => coordinateMap(point.x, point.y, 10, 7));
  const imageScreen = image.map((point) => coordinateMap(point.x, point.y, 10, 7));
  const coincidenceGroups = original.map((point) => original.filter((candidate) => candidate.x === point.x && candidate.y === point.y));
  const coincidentLabels = Array.from(new Set(coincidenceGroups.filter((group) => group.length > 1).map((group) => group.map((point) => point.label).join("="))));
  const hasImage = activeMode === "translate" || activeMode === "reflect";
  const coordinateOriginalLabelPosition = (point: typeof original[number], index: number) => {
    const screen = originalScreen[index];
    if (coincidenceGroups[index].length > 1) {
      return { x: screen.x + [-42, 42, 0][index], y: screen.y + [-32, -32, 48][index] };
    }
    if (activeMode === "reflect" && point.label === "B") return { x: screen.x - 18, y: screen.y + 44 };
    return { x: screen.x + [-24, 0, 24][index], y: screen.y + [28, -28, -22][index] };
  };
  const coordinateImageLabelPosition = (point: { x: number; y: number }, index: number) => {
    if (activeMode === "reflect" && index === 1) return { x: point.x + 28, y: point.y - 26 };
    return { x: point.x + [-20, 20, 0][index], y: point.y + [28, 28, -24][index] };
  };
  const formula = activeMode === "translate"
    ? mathematicalFormula(`(x,y) → (x+${formatNumber(state.dx, 0)}, y+${formatNumber(state.dy, 0)})`)
    : activeMode === "reflect"
      ? enZh(
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y), reflection in x=${formatNumber(state.mirror, 0)}`,
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y)，關於 x=${formatNumber(state.mirror, 0)} 反射`,
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y)，关于 x=${formatNumber(state.mirror, 0)} 反射`
      )
      : mathematicalFormula(`A(${state.x1},${state.y1}) → B(${state.x2},${state.y2}) → C(${state.x3},${state.y3})`);
  return {
    formula,
    summary: t(enZh(
      `Ordered signed points are A(${state.x1}, ${state.y1}), B(${state.x2}, ${state.y2}), C(${state.x3}, ${state.y3}). ${activeMode === "translate" ? `Pure translation adds (${state.dx}, ${state.dy}) to each point.` : activeMode === "reflect" ? `Pure reflection in x = ${state.mirror} maps x to 2k-x and leaves y unchanged.` : "They are plotted and connected A to B to C."}`,
      `有序有符號點為 A(${state.x1}, ${state.y1})、B(${state.x2}, ${state.y2})、C(${state.x3}, ${state.y3})。${activeMode === "translate" ? `純平移把 (${state.dx}, ${state.dy}) 加到每一點。` : activeMode === "reflect" ? `關於 x = ${state.mirror} 的純反射把 x 映為 2k-x，y 不變。` : "各點依 A、B、C 次序標示並連接。"}`,
      `有序有符号点为 A(${state.x1}, ${state.y1})、B(${state.x2}, ${state.y2})、C(${state.x3}, ${state.y3})。${activeMode === "translate" ? `纯平移把 (${state.dx}, ${state.dy}) 加到每一点。` : activeMode === "reflect" ? `关于 x = ${state.mirror} 的纯反射把 x 映为 2k-x，y 不变。` : "各点依 A、B、C 次序标示并连接。"}`
    )),
    surface: (
      <Surface name="coordinate-plot" label={t(enZh("Three signed coordinate points with ordered connection and pure transformations", "三個有符號坐標點、依序連線與純變換"))} theme={theme}>
        <Grid theme={theme} />
        {activeMode === "reflect" ? <line data-viz-mark data-viz-name="coordinate-mirror-line" data-viz-k={state.mirror} x1={coordinateMap(state.mirror, 0).x} x2={coordinateMap(state.mirror, 0).x} y1="42" y2="352" stroke={PURPLE} strokeWidth="6" strokeDasharray="9 8" /> : null}
        <polyline data-viz-mark data-viz-name="coordinate-ordered-segment" data-viz-order="A-B-C" points={pointsAttribute(originalScreen)} fill="none" stroke={activeMode === "plot" ? theme.axis : AMBER} strokeWidth={activeMode === "plot" ? 3 : 7} strokeLinecap="round" strokeLinejoin="round" opacity={activeMode === "plot" ? 0.36 : 0.9} />
        <g data-viz-mark data-viz-name="coordinate-coincidence-state" data-viz-has-coincidence={String(coincidentLabels.length > 0)} data-viz-groups={coincidentLabels.join("|")} />
        <g data-viz-mark data-viz-name="coordinate-original-points" data-viz-points={original.map((point) => `${point.label}:${point.x},${point.y}`).join("|")}>
          {original.map((point, index) => (
            <g key={point.label}>
              <circle data-viz-name={`coordinate-point-${point.label.toLowerCase()}`} data-viz-point-label={point.label} data-viz-x={point.x} data-viz-y={point.y} data-viz-coincident={String(coincidenceGroups[index].length > 1)} cx={originalScreen[index].x} cy={originalScreen[index].y} r={12 + coincidenceGroups[index].findIndex((candidate) => candidate.label === point.label) * 6} fill={coincidenceGroups[index].findIndex((candidate) => candidate.label === point.label) === 0 ? point.color : "none"} stroke={point.color} strokeWidth="4" />
              <text
                data-viz-label
                data-viz-name={`coordinate-label-${point.label.toLowerCase()}`}
                x={coordinateOriginalLabelPosition(point, index).x}
                y={coordinateOriginalLabelPosition(point, index).y}
                textAnchor="middle"
                fill={theme.text}
                className="text-sm font-black"
              >
                {point.label}
              </text>
            </g>
          ))}
        </g>
        {hasImage ? (
          <>
            <polyline data-viz-mark data-viz-name={activeMode === "translate" ? "coordinate-translation-image" : "coordinate-reflection-image"} data-viz-points={image.map((point) => `${point.x},${point.y}`).join("|")} points={pointsAttribute(imageScreen)} fill={GREEN} fillOpacity="0.16" stroke={GREEN} strokeWidth="6" strokeLinejoin="round" />
            <g data-viz-mark data-viz-name={activeMode === "translate" ? "coordinate-translation-guides" : "coordinate-reflection-guides"}>
              {originalScreen.map((point, index) => <line key={index} x1={point.x} y1={point.y} x2={imageScreen[index].x} y2={imageScreen[index].y} stroke={PURPLE} strokeWidth="2.5" strokeDasharray="6 7" />)}
              {imageScreen.map((point, index) => (
                <g key={index}>
                  <circle cx={point.x} cy={point.y} r="10" fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" />
                  <text data-viz-label data-viz-name={`coordinate-image-label-${original[index].label.toLowerCase()}`} x={coordinateImageLabelPosition(point, index).x} y={coordinateImageLabelPosition(point, index).y} textAnchor="middle" fill={theme.text} className="text-sm font-black">{original[index].label}′</text>
                </g>
              ))}
            </g>
          </>
        ) : null}
      </Surface>
    )
  };
}

function transformPoint(point: { x: number; y: number }, activeMode: string, state: NumericState) {
  if (activeMode === "translate") return { x: point.x + state.dx, y: point.y + state.dy };
  if (activeMode === "reflect") return { x: 2 * state.mirror - point.x, y: point.y };
  if (activeMode === "rotate-cw" || activeMode === "rotate-ccw") {
    const signedAngle = activeMode === "rotate-cw" ? -state.angle : state.angle;
    const radians = (signedAngle * Math.PI) / 180;
    return { x: point.x * Math.cos(radians) - point.y * Math.sin(radians), y: point.x * Math.sin(radians) + point.y * Math.cos(radians) };
  }
  return { x: point.x * state.scale, y: point.y * state.scale };
}

function renderTransformations(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const original = [{ x: -4, y: -2 }, { x: -1, y: -2 }, { x: -2, y: 2 }];
  const image = original.map((point) => transformPoint(point, activeMode, state));
  const originalScreen = original.map((point) => coordinateMap(point.x, point.y, 10, 7));
  const imageScreen = image.map((point) => coordinateMap(point.x, point.y, 10, 7));
  const transformationSegments = [
    ...polygonSegments(originalScreen),
    ...polygonSegments(imageScreen),
    ...originalScreen.map((point, index) => ({ start: point, end: imageScreen[index] })),
    { start: { x: 50, y: 200 }, end: { x: 590, y: 200 } },
    { start: { x: 320, y: 42 }, end: { x: 320, y: 352 } },
    ...(activeMode === "reflect" ? [{
      start: { x: coordinateMap(state.mirror, 0).x, y: 42 },
      end: { x: coordinateMap(state.mirror, 0).x, y: 352 }
    }] : [])
  ];
  const transformationObstacles = { polygons: [originalScreen, imageScreen], segments: transformationSegments };
  const originalLabelPositions = labelPositionsOutsidePolygon(originalScreen, transformationObstacles);
  const imageLabelPositions = labelPositionsOutsidePolygon(imageScreen, transformationObstacles);
  const formula = activeMode === "translate"
    ? mathematicalFormula(`(x,y) → (x+${formatNumber(state.dx, 0)}, y+${formatNumber(state.dy, 0)})`)
    : activeMode === "reflect"
      ? enZh(
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y), mirror x=${formatNumber(state.mirror, 0)}`,
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y)，對稱軸 x=${formatNumber(state.mirror, 0)}`,
        `(x,y) → (${formatNumber(2 * state.mirror, 0)}-x, y)，对称轴 x=${formatNumber(state.mirror, 0)}`
      )
      : activeMode === "rotate-cw"
        ? enZh(
          `(x,y) → rotation ${formatNumber(state.angle, 0)}° clockwise about (0,0)`,
          `(x,y) → 繞 (0,0) 順時針旋轉 ${formatNumber(state.angle, 0)}°`,
          `(x,y) → 绕 (0,0) 顺时针旋转 ${formatNumber(state.angle, 0)}°`
        )
        : activeMode === "rotate-ccw"
          ? enZh(
            `(x,y) → rotation ${formatNumber(state.angle, 0)}° anticlockwise about (0,0)`,
            `(x,y) → 繞 (0,0) 逆時針旋轉 ${formatNumber(state.angle, 0)}°`,
            `(x,y) → 绕 (0,0) 逆时针旋转 ${formatNumber(state.angle, 0)}°`
          )
          : enZh(
            `(x,y) → (${formatNumber(state.scale, 2)}x, ${formatNumber(state.scale, 2)}y) about (0,0)`,
            `(x,y) → (${formatNumber(state.scale, 2)}x, ${formatNumber(state.scale, 2)}y)，中心為 (0,0)`,
            `(x,y) → (${formatNumber(state.scale, 2)}x, ${formatNumber(state.scale, 2)}y)，中心为 (0,0)`
          );
  return {
    formula,
    summary: t(enZh(
      `${activeMode === "enlarge" ? "Enrichment: origin-centred enlargement" : activeMode} is a pure transformation: A(${original[0].x}, ${original[0].y}) maps to A′(${formatNumber(image[0].x, 2)}, ${formatNumber(image[0].y, 2)}), and all three vertices use only that rule.`,
      `${activeMode === "translate" ? "純平移" : activeMode === "reflect" ? "純反射" : activeMode === "rotate-cw" ? "順時針旋轉" : activeMode === "rotate-ccw" ? "逆時針旋轉" : "延伸學習：以原點放大"}把 A(${original[0].x}, ${original[0].y}) 映至 A′(${formatNumber(image[0].x, 2)}, ${formatNumber(image[0].y, 2)})；三個頂點只使用這一規則。`,
      `${activeMode === "translate" ? "纯平移" : activeMode === "reflect" ? "纯反射" : activeMode === "rotate-cw" ? "顺时针旋转" : activeMode === "rotate-ccw" ? "逆时针旋转" : "延伸学习：以原点放大"}把 A(${original[0].x}, ${original[0].y}) 映至 A′(${formatNumber(image[0].x, 2)}, ${formatNumber(image[0].y, 2)})；三个顶点只使用这一规则。`
    )),
    surface: (
      <Surface name="coordinate-transformations" label={t(enZh("Original and transformed triangle", "原圖形與變換後三角形"))} theme={theme}>
        <Grid theme={theme} />
        {activeMode === "reflect" ? <line data-viz-mark data-viz-name="transform-mirror-line" data-viz-k={state.mirror} x1={coordinateMap(state.mirror, 0).x} x2={coordinateMap(state.mirror, 0).x} y1="42" y2="352" stroke={PURPLE} strokeWidth="6" strokeDasharray="9 9" /> : null}
        <circle data-viz-mark data-viz-name="transform-centre" cx="320" cy="200" r="8" fill={AMBER} stroke={theme.pointStroke} strokeWidth="2" />
        <polygon data-viz-name="transform-original-fill" points={pointsAttribute(originalScreen)} fill={BLUE} opacity="0.55" stroke="none" />
        <polygon data-viz-mark data-viz-name="transform-original" data-viz-points={pointsAttribute(original)} points={pointsAttribute(originalScreen)} fill="none" stroke={BLUE} strokeWidth="5" />
        <polygon data-viz-name="transform-image-fill" points={pointsAttribute(imageScreen)} fill={GREEN} opacity="0.52" stroke="none" />
        <polygon data-viz-mark data-viz-name="transform-image" data-viz-points={pointsAttribute(image)} data-viz-mode-kind={activeMode === "enlarge" ? "enrichment" : "core"} points={pointsAttribute(imageScreen)} fill="none" stroke={GREEN} strokeWidth="5" />
        <text data-viz-label data-viz-name="transform-original-label" x={originalLabelPositions[0].x} y={originalLabelPositions[0].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">A</text>
        <text data-viz-label data-viz-name="transform-original-label-b" x={originalLabelPositions[1].x} y={originalLabelPositions[1].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">B</text>
        <text data-viz-label data-viz-name="transform-original-label-c" x={originalLabelPositions[2].x} y={originalLabelPositions[2].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">C</text>
        <text data-viz-label data-viz-name="transform-image-label" x={imageLabelPositions[0].x} y={imageLabelPositions[0].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">A′</text>
        <text data-viz-label data-viz-name="transform-image-label-b" x={imageLabelPositions[1].x} y={imageLabelPositions[1].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">B′</text>
        <text data-viz-label data-viz-name="transform-image-label-c" x={imageLabelPositions[2].x} y={imageLabelPositions[2].y} textAnchor="middle" fill={theme.text} className="text-sm font-black">C′</text>
        <g data-viz-mark data-viz-name="transform-guides" data-viz-mode={activeMode}>
          {originalScreen.map((point, index) => <line key={index} x1={point.x} y1={point.y} x2={imageScreen[index].x} y2={imageScreen[index].y} stroke={AMBER} strokeWidth="2.5" strokeDasharray="6 8" />)}
        </g>
      </Surface>
    )
  };
}

function seededDieSequence(seed: number, rolls: number) {
  let generatorState = Math.max(1, Math.floor(seed)) >>> 0;
  const outcomes: number[] = [];
  const runningFrequency: number[] = [];
  const faceCounts = [0, 0, 0, 0, 0, 0];
  let evenCount = 0;
  for (let index = 0; index < rolls; index += 1) {
    generatorState = (Math.imul(1664525, generatorState) + 1013904223) >>> 0;
    const face = Math.floor((generatorState / 4294967296) * 6) + 1;
    outcomes.push(face);
    faceCounts[face - 1] += 1;
    if (face % 2 === 0) evenCount += 1;
    runningFrequency.push(evenCount / (index + 1));
  }
  return { outcomes, runningFrequency, faceCounts, evenCount };
}

function renderProbabilityS2(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator, setState: NumericStateSetter): ModelRender {
  const rolls = Math.max(0, Math.round(state.rolls));
  const simulation = seededDieSequence(state.seed, rolls);
  const experimental = rolls === 0 ? 0 : simulation.evenCount / rolls;
  const path = simulation.runningFrequency.map((value, index) => {
    const x = rolls === 1 ? 570 : 70 + (index / Math.max(1, rolls - 1)) * 500;
    const y = 330 - value * 250;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  const theoryY = 330 - 0.5 * 250;
  const visibleOutcomes = simulation.outcomes.slice(Math.max(0, rolls - 60));
  const maxFaceCount = Math.max(1, ...simulation.faceCounts);
  return {
    formula: rolls === 0
      ? enZh("P(even) theoretical = 3/6 = 1/2; no rolls yet", "P(偶數) 理論值 = 3/6 = 1/2；尚未擲骰", "P(偶数) 理论值 = 3/6 = 1/2；尚未掷骰")
      : enZh(
        `P(even) experimental = ${simulation.evenCount}/${rolls} = ${formatNumber(experimental, 3)}`,
        `P(偶數) 實驗值 = ${simulation.evenCount}/${rolls} = ${formatNumber(experimental, 3)}`,
        `P(偶数) 实验值 = ${simulation.evenCount}/${rolls} = ${formatNumber(experimental, 3)}`
      ),
    summary: t(enZh(
      `Seed ${state.seed} generated ${rolls} fair six-sided die rolls. Face counts [1..6] are ${simulation.faceCounts.join(", ")}; ${simulation.evenCount} are even, so experimental P(even) = ${rolls === 0 ? "not yet available" : formatNumber(experimental, 3)}. More rolls may tend toward, but do not guarantee, 1/2.`,
      `種子 ${state.seed} 已生成 ${rolls} 次公平六面骰結果。1 至 6 的次數為 ${simulation.faceCounts.join("、")}；偶數有 ${simulation.evenCount} 次，實驗 P(偶數) = ${rolls === 0 ? "尚未可用" : formatNumber(experimental, 3)}。增加試驗只可能趨近 1/2，並不保證相等。`,
      `种子 ${state.seed} 已生成 ${rolls} 次公平六面骰结果。1 至 6 的次数为 ${simulation.faceCounts.join("、")}；偶数有 ${simulation.evenCount} 次，实验 P(偶数) = ${rolls === 0 ? "尚未可用" : formatNumber(experimental, 3)}。增加试验只可能趋近 1/2，并不保证相等。`
    )),
    surface: (
      <Surface name="six-sided-die-probability" label={t(enZh("Cumulative fair six-sided die simulation", "累積公平六面骰模擬"))} theme={theme}>
        {activeMode === "counts" ? (
          <g data-viz-mark data-viz-name="dice-face-counts" data-viz-total={rolls} data-viz-counts={simulation.faceCounts.join(",")}>
            {simulation.faceCounts.map((count, index) => {
              const height = count === 0 ? 2 : (count / maxFaceCount) * 230;
              const x = 86 + index * 82;
              return (
                <g key={index}>
                  <rect data-viz-face={index + 1} data-viz-count={count} x={x} y={328 - height} width="54" height={height} rx="10" fill={(index + 1) % 2 === 0 ? GREEN : BLUE} opacity="0.82" stroke={theme.pointStroke} strokeWidth="2" />
                  <text data-viz-label data-viz-name="dice-face-label" x={x + 27} y="350" textAnchor="middle" fill={theme.text} className="text-sm font-black">{index + 1}</text>
                  <text data-viz-label data-viz-name="dice-count-label" x={x + 27} y={Math.max(66, 318 - height)} textAnchor="middle" fill={theme.text} className="text-xs font-bold">{count}</text>
                </g>
              );
            })}
            <g data-viz-mark data-viz-name="dice-outcome-marks" data-viz-recent-faces={visibleOutcomes.join(",")}>
              {visibleOutcomes.slice(-12).map((face, index) => (
                <g key={index}>
                  <circle cx={90 + index * 42} cy="376" r="13" fill={face % 2 === 0 ? GREEN : ROSE} stroke={theme.pointStroke} strokeWidth="2" />
                  <text data-viz-label x={90 + index * 42} y="381" textAnchor="middle" fill={theme.pointStroke} className="text-xs font-black">{face}</text>
                </g>
              ))}
            </g>
          </g>
        ) : (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((value) => <line key={value} x1="70" x2="570" y1={330 - value * 250} y2={330 - value * 250} stroke={theme.grid} />)}
            <line data-viz-mark data-viz-name="probability-theory-line" data-viz-probability="0.5" x1="70" x2="570" y1={theoryY} y2={theoryY} stroke={AMBER} strokeWidth="5" strokeDasharray="12 9" />
            {rolls > 0 ? <path data-viz-mark data-viz-name="probability-running-path" data-viz-rolls={rolls} data-viz-even={simulation.evenCount} data-viz-frequency={formatNumber(experimental, 6)} data-viz-seed={state.seed} d={path} fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}
            {rolls > 0 ? <circle data-viz-mark data-viz-name="probability-final-frequency" cx="570" cy={330 - experimental * 250} r="10" fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" /> : null}
          </>
        )}
      </Surface>
    ),
    actions: (
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t(enZh("Generate die rolls", "生成擲骰結果"))}>
        {[1, 20].map((count) => (
          <button
            key={count}
            type="button"
            data-viz-roll={count}
            onClick={() => setState((current) => ({ ...current, rolls: Math.min(1000, current.rolls + count) }))}
            className="focus-ring min-h-[44px] rounded-2xl border border-cyan-300 bg-cyan-100 px-4 py-3 text-sm font-black text-cyan-900 transition hover:bg-cyan-200 motion-reduce:transition-none dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/20"
          >
            {t(enZh(`Roll ${count}`, `擲 ${count} 次`, `掷 ${count} 次`))}
          </button>
        ))}
      </div>
    ),
    details: (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard label={t(enZh("Theoretical P(even)", "理論 P(偶數)"))} value="0.500" color={AMBER} />
        <MetricCard label={t(enZh("Experimental P(even)", "實驗 P(偶數)"))} value={rolls === 0 ? "—" : formatNumber(experimental, 3)} color={BLUE} />
        <MetricCard label={t(enZh("Generated rolls", "已生成擲骰"))} value={formatNumber(rolls, 0)} color={GREEN} />
      </div>
    )
  };
}

function renderPolynomials(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const totalWidth = state.x + state.p;
  const totalHeight = state.x + state.q;
  const scale = Math.min(330 / totalWidth, 245 / totalHeight);
  const xSize = state.x * scale;
  const pSize = state.p * scale;
  const qSize = state.q * scale;
  const left = 152;
  const top = 78;
  const middleCoefficient = state.p + state.q;
  const constant = state.p * state.q;
  const totalArea = totalWidth * totalHeight;
  return {
    formula: mathematicalFormula(`(x+${formatNumber(state.p, 0)})(x+${formatNumber(state.q, 0)}) = x^2 + ${formatNumber(middleCoefficient, 0)}x + ${formatNumber(constant, 0)}`),
    summary: t(enZh(
      `The rectangle partitions into x², ${state.p}x, ${state.q}x, and ${constant}; their sum is x² + ${middleCoefficient}x + ${constant}. At x = ${state.x}, total area = ${totalArea}.`,
      `長方形分成 x²、${state.p}x、${state.q}x 和 ${constant}；總和為 x² + ${middleCoefficient}x + ${constant}。當 x = ${state.x}，總面積為 ${totalArea}。`,
      `长方形分成 x²、${state.p}x、${state.q}x 和 ${constant}；总和为 x² + ${middleCoefficient}x + ${constant}。当 x = ${state.x}，总面积为 ${totalArea}。`
    )),
    surface: (
      <Surface name="polynomial-area-model" label={t(enZh("Area model for expanding and factoring a polynomial", "多項式展開與因式分解的面積模型"))} theme={theme}>
        <g opacity={activeMode === "factor" ? 0.82 : 1}>
          <g data-viz-overlap-ok="polynomial-x2-label" data-viz-overlap-reason="The x-squared term names the single area tile that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="polynomial-x2" data-viz-area={state.x ** 2} x={left} y={top} width={xSize} height={xSize} fill={BLUE} opacity="0.72" stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="polynomial-x2-label" x={left + xSize / 2} y={top + xSize / 2 + 6} textAnchor="middle" fill="#0f172a" className="text-base font-black">x²</text>
          </g>
          <g data-viz-overlap-ok="polynomial-px-label" data-viz-overlap-reason="The px term names the single area tile that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="polynomial-px" data-viz-area={state.p * state.x} x={left + xSize} y={top} width={pSize} height={xSize} fill={AMBER} opacity="0.74" stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="polynomial-px-label" x={left + xSize + pSize / 2} y={top + xSize / 2 + 6} textAnchor="middle" fill="#0f172a" className="text-sm font-black">{formatNumber(state.p, 0)}x</text>
          </g>
          <g data-viz-overlap-ok="polynomial-qx-label" data-viz-overlap-reason="The qx term names the single area tile that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="polynomial-qx" data-viz-area={state.q * state.x} x={left} y={top + xSize} width={xSize} height={qSize} fill={PURPLE} opacity="0.7" stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="polynomial-qx-label" x={left + xSize / 2} y={top + xSize + qSize / 2 + 6} textAnchor="middle" fill="#0f172a" className="text-sm font-black">{formatNumber(state.q, 0)}x</text>
          </g>
          <g data-viz-overlap-ok="polynomial-pq-label" data-viz-overlap-reason="The pq term names the single area tile that contains it.">
            <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="polynomial-pq" data-viz-area={constant} x={left + xSize} y={top + xSize} width={pSize} height={qSize} fill={GREEN} opacity="0.74" stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-overlap-member="label" data-viz-name="polynomial-pq-label" x={left + xSize + pSize / 2} y={top + xSize + qSize / 2 + 6} textAnchor="middle" fill="#0f172a" className="text-sm font-black">{formatNumber(constant, 0)}</text>
          </g>
        </g>
        <rect data-viz-name="polynomial-whole" data-viz-width-factor={`x+${state.p}`} data-viz-height-factor={`x+${state.q}`} data-viz-area={totalArea} x={left} y={top} width={xSize + pSize} height={xSize + qSize} fill="none" stroke={activeMode === "factor" ? GREEN : theme.axisStrong} strokeWidth="7" />
        <path data-viz-name="polynomial-factor-braces" d={`M ${left} ${top - 18} H ${left + xSize + pSize} M ${left - 18} ${top} V ${top + xSize + qSize}`} stroke={activeMode === "factor" ? AMBER : theme.axis} strokeWidth="5" strokeLinecap="round" />
      </Surface>
    )
  };
}

function renderQuadraticFunctions(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const a = Math.abs(state.a) < 1e-9 ? 0.25 : state.a;
  const b = state.b;
  const c = state.c;
  const evaluate = (x: number) => a * x * x + b * x + c;
  const vertexX = -b / (2 * a);
  const vertexY = c - (b ** 2) / (4 * a);
  const discriminant = b ** 2 - 4 * a * c;
  const xIntercepts = discriminant < -1e-10
    ? []
    : Math.abs(discriminant) <= 1e-10
      ? [-b / (2 * a)]
      : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
  const map = (x: number, y: number) => ({
    x: 62 + ((x + 8) / 16) * 540,
    y: 352 - ((y + 10) / 20) * 310
  });
  const path = graphPath(evaluate, { xMin: -8, xMax: 8, yMin: -10, yMax: 10, left: 62, right: 602, top: 42, bottom: 352, samples: 360 });
  const vertexVisible = vertexX >= -8 && vertexX <= 8 && vertexY >= -10 && vertexY <= 10;
  const axisVisible = vertexX >= -8 && vertexX <= 8;
  const vertexPoint = map(
    vertexVisible ? vertexX : clamp(vertexX, -7.4, 7.4),
    vertexVisible ? vertexY : clamp(vertexY, -9, 9)
  );
  const vertexOffscaleDirection = [
    vertexX < -8 ? "left" : vertexX > 8 ? "right" : null,
    vertexY < -10 ? "below" : vertexY > 10 ? "above" : null
  ].filter(Boolean).join("-");
  const yIntercept = map(0, c);
  const visibleIntercepts = xIntercepts.filter((value) => value >= -8 && value <= 8);
  const equation = `y = ${formatNumber(a, 2)}x^2 ${b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(b), 2)}x ${c >= 0 ? "+" : "-"} ${formatNumber(Math.abs(c), 2)}`;
  const rootClassification = discriminant < -1e-10
    ? t(enZh("no real roots", "沒有實根", "没有实根"))
    : Math.abs(discriminant) <= 1e-10
      ? t(enZh("one repeated real root", "一個重實根", "一个重实根"))
      : t(enZh("two real roots", "兩個實根", "两个实根"));
  const xInterceptText = xIntercepts.length === 0 ? rootClassification : xIntercepts.map((value) => formatNumber(value, 3)).join(", ");
  return {
    formula: mathematicalFormula(equation),
    summary: t(enZh(
      `The same coefficients drive every feature: a = ${formatNumber(a, 2)} opens ${a > 0 ? "up" : "down"}; vertex (${formatNumber(vertexX, 3)}, ${formatNumber(vertexY, 3)}), axis x = ${formatNumber(vertexX, 3)}, y-intercept ${formatNumber(c, 3)}; discriminant ${formatNumber(discriminant, 3)} gives ${rootClassification}${xIntercepts.length ? ` at x = ${xInterceptText}` : ""}.`,
      `所有特徵均由同一組係數產生：a = ${formatNumber(a, 2)} 令圖像向${a > 0 ? "上" : "下"}開；頂點 (${formatNumber(vertexX, 3)}, ${formatNumber(vertexY, 3)})，對稱軸 x = ${formatNumber(vertexX, 3)}，y 截距 ${formatNumber(c, 3)}；判別式 ${formatNumber(discriminant, 3)} 表示${rootClassification}${xIntercepts.length ? `，x = ${xInterceptText}` : ""}。`,
      `所有特征均由同一组系数产生：a = ${formatNumber(a, 2)} 令图像向${a > 0 ? "上" : "下"}开；顶点 (${formatNumber(vertexX, 3)}, ${formatNumber(vertexY, 3)})，对称轴 x = ${formatNumber(vertexX, 3)}，y 截距 ${formatNumber(c, 3)}；判别式 ${formatNumber(discriminant, 3)} 表示${rootClassification}${xIntercepts.length ? `，x = ${xInterceptText}` : ""}。`
    )),
    surface: (
      <Surface name="quadratic-functions" label={t(enZh("Quadratic graph with coefficient-consistent features", "係數一致的二次函數圖象", "系数一致的二次函数图象"))} theme={theme}>
        <defs><clipPath id="hk-quadratic-window"><rect x="62" y="42" width="540" height="310" /></clipPath></defs>
        {Array.from({ length: 9 }, (_, index) => -8 + index * 2).map((tick) => <line key={`x-${tick}`} x1={map(tick, 0).x} x2={map(tick, 0).x} y1="42" y2="352" stroke={tick === 0 ? theme.axisStrong : theme.grid} strokeWidth={tick === 0 ? 3 : 1} />)}
        {Array.from({ length: 11 }, (_, index) => -10 + index * 2).map((tick) => <line key={`y-${tick}`} x1="62" x2="602" y1={map(0, tick).y} y2={map(0, tick).y} stroke={tick === 0 ? theme.axisStrong : theme.grid} strokeWidth={tick === 0 ? 3 : 1} />)}
        {[-8, -4, 0, 4, 8].map((tick) => <text key={`xl-${tick}`} data-viz-label data-viz-name="quadratic-x-tick-label" x={map(tick, 0).x} y="379" textAnchor="middle" fill={theme.tickText} className="text-xs font-bold">{tick}</text>)}
        {[-10, -5, 0, 5, 10].map((tick) => <text key={`yl-${tick}`} data-viz-label data-viz-name="quadratic-y-tick-label" x="45" y={map(0, tick).y + 4} textAnchor="middle" fill={theme.tickText} className="text-xs font-bold">{tick}</text>)}
        <g clipPath="url(#hk-quadratic-window)">
          <path data-viz-mark data-viz-name="quadratic-curve" data-viz-a={a} data-viz-b={b} data-viz-c={c} d={path} fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" />
          {axisVisible ? <line data-viz-mark data-viz-name="quadratic-axis" data-viz-x={formatNumber(vertexX, 8)} x1={map(vertexX, 0).x} x2={map(vertexX, 0).x} y1="42" y2="352" stroke={AMBER} strokeWidth="4" strokeDasharray="8 7" opacity={activeMode === "features" ? 1 : 0.55} /> : <g data-viz-mark data-viz-name="quadratic-axis" data-viz-x={formatNumber(vertexX, 8)} data-viz-offscale="true" />}
          {vertexVisible ? <circle data-viz-mark data-viz-name="quadratic-vertex" data-viz-x={formatNumber(vertexX, 8)} data-viz-y={formatNumber(vertexY, 8)} data-viz-offscale="false" cx={vertexPoint.x} cy={vertexPoint.y} r="12" fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" /> : null}
          <circle data-viz-mark data-viz-name="quadratic-y-intercept" data-viz-x="0" data-viz-y={c} cx={yIntercept.x} cy={yIntercept.y} r="10" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
          {visibleIntercepts.map((value) => <circle key={value} data-viz-mark data-viz-name="quadratic-x-intercept" data-viz-x={formatNumber(value, 8)} data-viz-y="0" cx={map(value, 0).x} cy={map(value, 0).y} r="10" fill={PURPLE} stroke={theme.pointStroke} strokeWidth="3" />)}
        </g>
        {!vertexVisible ? <path data-viz-mark data-viz-name="quadratic-vertex" data-viz-x={formatNumber(vertexX, 8)} data-viz-y={formatNumber(vertexY, 8)} data-viz-offscale="true" data-viz-offscale-direction={vertexOffscaleDirection} d={`M ${vertexPoint.x - 11} ${vertexPoint.y} L ${vertexPoint.x} ${vertexPoint.y - 12} L ${vertexPoint.x + 11} ${vertexPoint.y} L ${vertexPoint.x} ${vertexPoint.y + 12} Z`} fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" /> : null}
        <g data-viz-mark data-viz-name="quadratic-feature-state" data-viz-equation={equation} data-viz-opening={a > 0 ? "up" : "down"} data-viz-vertex={`${formatNumber(vertexX, 8)},${formatNumber(vertexY, 8)}`} data-viz-h={formatNumber(vertexX, 8)} data-viz-k={formatNumber(vertexY, 8)} data-viz-axis={formatNumber(vertexX, 8)} data-viz-y-intercept={c} data-viz-discriminant={formatNumber(discriminant, 8)} data-viz-real-root-count={xIntercepts.length} data-viz-x-intercepts={xIntercepts.map((value) => formatNumber(value, 8)).join(",")} />
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetricCard label={t(enZh("Opening", "開口", "开口"))} value={t(a > 0 ? enZh("Up", "向上", "向上") : enZh("Down", "向下", "向下"))} color={BLUE} />
        <MetricCard label={t(enZh("Vertex", "頂點", "顶点"))} value={`(${formatNumber(vertexX, 2)}, ${formatNumber(vertexY, 2)})`} color={GREEN} />
        <MetricCard label={t(enZh("Axis", "對稱軸", "对称轴"))} value={`x=${formatNumber(vertexX, 2)}`} color={AMBER} />
        <MetricCard label={t(enZh("y-intercept", "y 截距", "y 截距"))} value={formatNumber(c, 2)} color={ROSE} />
        <MetricCard label={t(enZh("x-intercepts", "x 截距", "x 截距"))} value={xInterceptText} color={PURPLE} />
      </div>
    )
  };
}

function renderIdentitiesSquarePatterns(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const a = Math.max(2, Math.round(state.a));
  const b = clamp(Math.round(state.b), 1, a - 1);
  const squareTotal = (a + b) ** 2;
  const minusSquareTotal = (a - b) ** 2;
  const plusSquareExpansion = a ** 2 + 2 * a * b + b ** 2;
  const minusSquareExpansion = a ** 2 - 2 * a * b + b ** 2;
  const difference = a ** 2 - b ** 2;
  const isSquareSum = activeMode === "square-sum";
  const isSquareDifference = activeMode === "square-difference";
  const totalScale = 270 / (a + b);
  const wholeSize = (a + b) * totalScale;
  const aSize = a * totalScale;
  const bSize = b * totalScale;
  const wholeLeft = (WIDTH - wholeSize) / 2;
  const wholeTop = (HEIGHT - wholeSize) / 2;
  const minusSquareScale = 270 / a;
  const minusWholeSize = a * minusSquareScale;
  const minusRemovedSize = b * minusSquareScale;
  const minusResultSize = (a - b) * minusSquareScale;
  const minusWholeLeft = (WIDTH - minusWholeSize) / 2;
  const minusWholeTop = (HEIGHT - minusWholeSize) / 2;
  const differenceScale = Math.min(80, 165 / a, 285 / (a + b));
  const sourceSize = a * differenceScale;
  const removedSize = b * differenceScale;
  const differencePieceHeight = (a - b) * differenceScale;
  const productWidth = (a + b) * differenceScale;
  const productHeight = differencePieceHeight;
  const exactFormula = isSquareSum
    ? `(${a}+${b})^2 ≡ ${a}^2 + 2(${a})(${b}) + ${b}^2 = ${squareTotal}`
    : isSquareDifference
      ? `(${a}-${b})^2 ≡ ${a}^2 - 2(${a})(${b}) + ${b}^2 = ${minusSquareTotal}`
      : `${a}^2 - ${b}^2 ≡ (${a}-${b})(${a}+${b}) = ${difference}`;
  return {
    formula: mathematicalFormula(exactFormula),
    summary: t(enZh(
      isSquareSum
        ? `For every allowed a and b, the same square has area (${a}+${b})² = ${squareTotal} and partitions exactly into ${a ** 2} + ${2 * a * b} + ${b ** 2}. The symbol ≡ states an identity.`
        : isSquareDifference
          ? `From an ${a} by ${a} square, subtract two ${a} by ${b} strips and add back their ${b} by ${b} overlap once: ${a ** 2} − ${2 * a * b} + ${b ** 2} = ${minusSquareTotal} = (${a}−${b})². The symbol ≡ states an identity.`
          : `Removing a ${b} by ${b} square from an ${a} by ${a} square leaves area ${difference}; the pieces rearrange into (${a}-${b}) by (${a}+${b}). The symbol ≡ states an identity.`,
      isSquareSum
        ? `對所有允許的 a、b，同一正方形面積 (${a}+${b})² = ${squareTotal}，並精確分成 ${a ** 2} + ${2 * a * b} + ${b ** 2}。符號 ≡ 表示恆等式。`
        : isSquareDifference
          ? `從 ${a}×${a} 正方形減去兩條 ${a}×${b} 長條，再把重複減去的 ${b}×${b} 重疊區加回一次：${a ** 2} − ${2 * a * b} + ${b ** 2} = ${minusSquareTotal} = (${a}−${b})²。符號 ≡ 表示恆等式。`
          : `從 ${a}×${a} 正方形移去 ${b}×${b} 正方形後，剩餘面積為 ${difference}；分塊可重排成 (${a}-${b})×(${a}+${b})。符號 ≡ 表示恆等式。`,
      isSquareSum
        ? `对所有允许的 a、b，同一正方形面积 (${a}+${b})² = ${squareTotal}，并精确分成 ${a ** 2} + ${2 * a * b} + ${b ** 2}。符号 ≡ 表示恒等式。`
        : isSquareDifference
          ? `从 ${a}×${a} 正方形减去两条 ${a}×${b} 长条，再把重复减去的 ${b}×${b} 重叠区加回一次：${a ** 2} − ${2 * a * b} + ${b ** 2} = ${minusSquareTotal} = (${a}−${b})²。符号 ≡ 表示恒等式。`
          : `从 ${a}×${a} 正方形移去 ${b}×${b} 正方形后，剩余面积为 ${difference}；分块可重排成 (${a}-${b})×(${a}+${b})。符号 ≡ 表示恒等式。`
    )),
    surface: (
      <Surface name="identity-square-patterns" label={t(enZh("Exact area model for square identities", "平方恆等式的精確面積模型", "平方恒等式的精确面积模型"))} theme={theme}>
        {isSquareSum ? (
          <g data-viz-mark data-viz-name="identity-square-whole" data-viz-a={a} data-viz-b={b} data-viz-area={squareTotal}>
            <rect x={wholeLeft} y={wholeTop} width={aSize} height={aSize} fill={BLUE} opacity="0.76" stroke={theme.pointStroke} strokeWidth="3" data-viz-name="identity-a2" data-viz-area={a ** 2} />
            <g data-viz-name="identity-cross-parts" data-viz-area={2 * a * b}>
              <rect x={wholeLeft + aSize} y={wholeTop} width={bSize} height={aSize} fill={AMBER} opacity="0.76" stroke={theme.pointStroke} strokeWidth="3" />
              <rect x={wholeLeft} y={wholeTop + aSize} width={aSize} height={bSize} fill={PURPLE} opacity="0.72" stroke={theme.pointStroke} strokeWidth="3" />
            </g>
            <rect x={wholeLeft + aSize} y={wholeTop + aSize} width={bSize} height={bSize} fill={GREEN} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" data-viz-name="identity-b2" data-viz-area={b ** 2} />
            <rect x={wholeLeft} y={wholeTop} width={wholeSize} height={wholeSize} fill="none" stroke={theme.axisStrong} strokeWidth="7" />
          </g>
        ) : isSquareDifference ? (
          <g data-viz-mark data-viz-name="identity-minus-square-model" data-viz-a={a} data-viz-b={b} data-viz-area={minusSquareTotal} data-viz-left={minusSquareTotal} data-viz-right={minusSquareExpansion} data-viz-valid={String(minusSquareTotal === minusSquareExpansion)}>
            <rect data-viz-name="identity-a2" data-viz-area={a ** 2} x={minusWholeLeft} y={minusWholeTop} width={minusWholeSize} height={minusWholeSize} fill={BLUE} opacity="0.28" stroke={theme.axisStrong} strokeWidth="7" />
            <g data-viz-name="identity-minus-cross-parts" data-viz-signed-area={-2 * a * b} data-viz-each-area={a * b}>
              <rect x={minusWholeLeft + minusResultSize} y={minusWholeTop} width={minusRemovedSize} height={minusWholeSize} fill={ROSE} opacity="0.68" stroke={theme.pointStroke} strokeWidth="3" />
              <rect x={minusWholeLeft} y={minusWholeTop + minusResultSize} width={minusWholeSize} height={minusRemovedSize} fill={AMBER} opacity="0.68" stroke={theme.pointStroke} strokeWidth="3" />
            </g>
            <rect data-viz-name="identity-minus-overlap" data-viz-area={b ** 2} data-viz-role="add-back-once" x={minusWholeLeft + minusResultSize} y={minusWholeTop + minusResultSize} width={minusRemovedSize} height={minusRemovedSize} fill={GREEN} opacity="0.9" stroke={theme.pointStroke} strokeWidth="4" />
            <rect data-viz-name="identity-minus-square-result" data-viz-side={a - b} data-viz-area={minusSquareTotal} x={minusWholeLeft} y={minusWholeTop} width={minusResultSize} height={minusResultSize} fill={PURPLE} opacity="0.78" stroke={theme.pointStroke} strokeWidth="5" />
          </g>
        ) : (
          <g data-viz-mark data-viz-name="identity-difference-state" data-viz-a={a} data-viz-b={b} data-viz-area={difference}>
            <g data-viz-name="identity-difference-source" data-viz-area={difference}>
              <rect data-viz-piece="a(a-b)" data-viz-area={a * (a - b)} x="58" y="112" width={sourceSize} height={differencePieceHeight} fill={BLUE} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />
              <rect data-viz-piece="b(a-b)" data-viz-area={b * (a - b)} x="58" y={112 + differencePieceHeight} width={differencePieceHeight} height={removedSize} fill={AMBER} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />
              <rect x={58 + differencePieceHeight} y={112 + differencePieceHeight} width={removedSize} height={removedSize} fill={theme.svgBackground} stroke={ROSE} strokeWidth="5" strokeDasharray="8 6" data-viz-name="identity-b2" data-viz-area={b ** 2} />
              <rect data-viz-name="identity-a2" data-viz-area={a ** 2} x="58" y="112" width={sourceSize} height={sourceSize} fill="none" stroke={theme.axisStrong} strokeWidth="6" />
            </g>
            <path d={`M ${244} 200 H ${292}`} stroke={AMBER} strokeWidth="8" strokeLinecap="round" />
            <g data-viz-name="identity-difference-product" data-viz-width={a + b} data-viz-height={a - b} data-viz-area={difference}>
              <rect data-viz-piece="a(a-b)" data-viz-area={a * (a - b)} x="320" y={200 - productHeight / 2} width={sourceSize} height={productHeight} fill={BLUE} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />
              <rect data-viz-piece="b(a-b)" data-viz-area={b * (a - b)} x={320 + sourceSize} y={200 - productHeight / 2} width={removedSize} height={productHeight} fill={AMBER} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />
              <rect x="320" y={200 - productHeight / 2} width={productWidth} height={productHeight} fill="none" stroke={GREEN} strokeWidth="7" />
            </g>
          </g>
        )}
      </Surface>
    ),
    details: (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="a" value={String(a)} color={BLUE} />
          <MetricCard label="b" value={String(b)} color={GREEN} />
          <MetricCard label={isSquareSum ? "a² + 2ab + b²" : isSquareDifference ? "a² − 2ab + b²" : "a² − b²"} value={String(isSquareSum ? squareTotal : isSquareDifference ? minusSquareTotal : difference)} color={AMBER} />
          <MetricCard label={t(enZh("Identity", "恆等式", "恒等式"))} value="≡" color={PURPLE} />
        </div>
        <div data-viz-identity-checklist className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t(enZh("Compare the plus-square and minus-square identities", "比較和平方與差平方恆等式", "比较和平方与差平方恒等式"))}>
          <div data-viz-mark data-viz-name="identity-plus-square-check" data-viz-left={squareTotal} data-viz-right={plusSquareExpansion} data-viz-middle-term={2 * a * b} data-viz-middle-sign="plus" data-viz-valid={String(squareTotal === plusSquareExpansion)}>
            <MetricCard label="(a+b)² ≡ a² + 2ab + b²" value={`${squareTotal} ≡ ${plusSquareExpansion}`} color={GREEN} />
          </div>
          <div data-viz-mark data-viz-name="identity-minus-square-check" data-viz-left={minusSquareTotal} data-viz-right={minusSquareExpansion} data-viz-middle-term={-2 * a * b} data-viz-middle-sign="minus" data-viz-valid={String(minusSquareTotal === minusSquareExpansion)}>
            <MetricCard label="(a−b)² ≡ a² − 2ab + b²" value={`${minusSquareTotal} ≡ ${minusSquareExpansion}`} color={ROSE} />
          </div>
        </div>
      </div>
    )
  };
}

function renderTrigonometryBasics(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator, setState: NumericStateSetter): ModelRender {
  const radians = (state.theta * Math.PI) / 180;
  const verticalLength = state.hyp * Math.sin(radians);
  const baseLength = state.hyp * Math.cos(radians);
  const referenceIsLeft = state.reference === 0;
  const referenceAngle = referenceIsLeft ? state.theta : 90 - state.theta;
  const opposite = referenceIsLeft ? verticalLength : baseLength;
  const adjacent = referenceIsLeft ? baseLength : verticalLength;
  const adjacentSegment = referenceIsLeft ? "base" : "vertical";
  const oppositeSegment = referenceIsLeft ? "vertical" : "base";
  const ratio = activeMode === "sin" ? opposite / state.hyp : activeMode === "cos" ? adjacent / state.hyp : opposite / adjacent;
  const triangleScale = Math.min(34, 390 / Math.max(0.1, baseLength), 238 / Math.max(0.1, verticalLength));
  const basePx = baseLength * triangleScale;
  const heightPx = verticalLength * triangleScale;
  const origin = { x: 140, y: 316 };
  const right = { x: origin.x + basePx, y: origin.y };
  const top = { x: right.x, y: origin.y - heightPx };
  const hypotenusePixelLength = Math.max(1, Math.hypot(top.x - origin.x, top.y - origin.y));
  const hypotenuseLabel = {
    x: (origin.x + top.x) / 2 - (heightPx / hypotenusePixelLength) * 46,
    y: (origin.y + top.y) / 2 - (basePx / hypotenusePixelLength) * 46
  };
  const hypotenuseLabelAngle = Math.atan2(top.y - origin.y, top.x - origin.x) * 180 / Math.PI;
  const formula = activeMode === "sin"
    ? enZh(
      `sin ${formatNumber(referenceAngle, 0)}° = opposite/hypotenuse = ${formatNumber(opposite, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`,
      `sin ${formatNumber(referenceAngle, 0)}° = 對邊/斜邊 = ${formatNumber(opposite, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`,
      `sin ${formatNumber(referenceAngle, 0)}° = 对边/斜边 = ${formatNumber(opposite, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`
    )
    : activeMode === "cos"
      ? enZh(
        `cos ${formatNumber(referenceAngle, 0)}° = adjacent/hypotenuse = ${formatNumber(adjacent, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`,
        `cos ${formatNumber(referenceAngle, 0)}° = 鄰邊/斜邊 = ${formatNumber(adjacent, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`,
        `cos ${formatNumber(referenceAngle, 0)}° = 邻边/斜边 = ${formatNumber(adjacent, 2)}/${formatNumber(state.hyp, 2)} = ${formatNumber(ratio, 3)}`
      )
      : enZh(
        `tan ${formatNumber(referenceAngle, 0)}° = opposite/adjacent = ${formatNumber(opposite, 2)}/${formatNumber(adjacent, 2)} = ${formatNumber(ratio, 3)}`,
        `tan ${formatNumber(referenceAngle, 0)}° = 對邊/鄰邊 = ${formatNumber(opposite, 2)}/${formatNumber(adjacent, 2)} = ${formatNumber(ratio, 3)}`,
        `tan ${formatNumber(referenceAngle, 0)}° = 对边/邻边 = ${formatNumber(opposite, 2)}/${formatNumber(adjacent, 2)} = ${formatNumber(ratio, 3)}`
      );
  return {
    formula,
    summary: t(enZh(
      `Using the ${referenceIsLeft ? "left" : "upper"} acute angle ${formatNumber(referenceAngle, 0)}°: opposite = ${formatNumber(opposite, 2)}, adjacent (the non-hypotenuse side next to the selected θ) = ${formatNumber(adjacent, 2)}, hypotenuse = ${formatNumber(state.hyp, 2)}, and ${activeMode} = ${formatNumber(ratio, 3)}.`,
      `以${referenceIsLeft ? "左方" : "上方"}銳角 ${formatNumber(referenceAngle, 0)}° 為參考：對邊 = ${formatNumber(opposite, 2)}，鄰邊（所選 θ 旁且不是斜邊的一邊）= ${formatNumber(adjacent, 2)}，斜邊 = ${formatNumber(state.hyp, 2)}，${activeMode} = ${formatNumber(ratio, 3)}。`,
      `以${referenceIsLeft ? "左方" : "上方"}锐角 ${formatNumber(referenceAngle, 0)}° 为参考：对边 = ${formatNumber(opposite, 2)}，邻边（所选 θ 旁且不是斜边的一边）= ${formatNumber(adjacent, 2)}，斜边 = ${formatNumber(state.hyp, 2)}，${activeMode} = ${formatNumber(ratio, 3)}。`
    )),
    surface: (
      <Surface name="soh-cah-toa" label={t(enZh("Right triangle with SOH CAH TOA side bindings", "綁定 SOH CAH TOA 邊長的直角三角形"))} theme={theme}>
        <polygon data-viz-name="trig-triangle" data-viz-left-angle={state.theta} data-viz-reference-angle={referenceAngle} data-viz-reference-vertex={referenceIsLeft ? "left" : "upper"} data-viz-adjacent-segment={adjacentSegment} data-viz-opposite-segment={oppositeSegment} data-viz-adjacent-definition="non-hypotenuse-side-next-to-selected-theta" points={pointsAttribute([origin, right, top])} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="5" />
        <line data-viz-mark data-viz-name={referenceIsLeft ? "trig-adjacent" : "trig-opposite"} data-viz-side-segment="base" data-viz-side-definition={referenceIsLeft ? "non-hypotenuse-side-next-to-selected-theta" : "side-across-from-selected-theta"} data-viz-length={formatNumber(baseLength, 5)} x1={origin.x} y1={origin.y} x2={right.x} y2={right.y} stroke={referenceIsLeft ? (activeMode === "cos" || activeMode === "tan" ? AMBER : BLUE) : (activeMode === "sin" || activeMode === "tan" ? ROSE : BLUE)} strokeWidth="10" strokeLinecap="round" />
        <line data-viz-mark data-viz-name={referenceIsLeft ? "trig-opposite" : "trig-adjacent"} data-viz-side-segment="vertical" data-viz-side-definition={referenceIsLeft ? "side-across-from-selected-theta" : "non-hypotenuse-side-next-to-selected-theta"} data-viz-length={formatNumber(verticalLength, 5)} x1={right.x} y1={right.y} x2={top.x} y2={top.y} stroke={referenceIsLeft ? (activeMode === "sin" || activeMode === "tan" ? ROSE : BLUE) : (activeMode === "cos" || activeMode === "tan" ? AMBER : BLUE)} strokeWidth="10" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="trig-hypotenuse" data-viz-length={state.hyp} x1={top.x} y1={top.y} x2={origin.x} y2={origin.y} stroke={activeMode === "sin" || activeMode === "cos" ? GREEN : BLUE} strokeWidth="10" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="trig-right-angle" d={`M ${right.x - 28} ${right.y} V ${right.y - 28} H ${right.x}`} fill="none" stroke={AMBER} strokeWidth="5" />
        <path data-viz-mark data-viz-name="trig-theta" data-viz-degrees={referenceAngle} d={interiorAngleArcPath(referenceIsLeft ? origin : top, referenceIsLeft ? right : right, referenceIsLeft ? top : origin, 48)} fill="none" stroke={PURPLE} strokeWidth="7" strokeLinecap="round" />
        <text data-viz-label data-viz-name={referenceIsLeft ? "trig-adjacent-label" : "trig-opposite-label"} x={(origin.x + right.x) / 2} y={origin.y + 35} textAnchor="middle" fill={theme.text} className="text-sm font-black">{t(referenceIsLeft ? enZh("adjacent", "鄰邊", "邻边") : enZh("opposite", "對邊", "对边"))} {formatNumber(baseLength, 2)}</text>
        <text data-viz-label data-viz-name={referenceIsLeft ? "trig-opposite-label" : "trig-adjacent-label"} x={right.x + 38} y={(right.y + top.y) / 2} transform={`rotate(-90 ${right.x + 38} ${(right.y + top.y) / 2})`} textAnchor="middle" fill={theme.text} className="text-sm font-black">{t(referenceIsLeft ? enZh("opposite", "對邊", "对边") : enZh("adjacent", "鄰邊", "邻边"))} {formatNumber(verticalLength, 2)}</text>
        <text data-viz-label data-viz-name="trig-hypotenuse-label" x={hypotenuseLabel.x} y={hypotenuseLabel.y} transform={`rotate(${hypotenuseLabelAngle} ${hypotenuseLabel.x} ${hypotenuseLabel.y})`} textAnchor="middle" fill={theme.text} className="text-sm font-black">{t(enZh("hypotenuse", "斜邊", "斜边"))} {formatNumber(state.hyp, 2)}</text>
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label={t(enZh("Opposite", "對邊"))} value={formatNumber(opposite, 2)} color={ROSE} />
        <MetricCard label={t(enZh("Adjacent", "鄰邊"))} value={formatNumber(adjacent, 2)} color={AMBER} />
        <MetricCard label={t(enZh("Hypotenuse", "斜邊"))} value={formatNumber(state.hyp, 2)} color={GREEN} />
      </div>
    ),
    actions: (
      <div data-viz-mode-group="reference-angle" className="grid grid-cols-2 gap-2" role="group" aria-label={t(enZh("Select the reference acute angle", "選擇參考銳角", "选择参考锐角"))}>
        {[{ id: 0, label: enZh("Left acute angle", "左方銳角", "左方锐角") }, { id: 1, label: enZh("Upper acute angle", "上方銳角", "上方锐角") }].map((item) => {
          const active = state.reference === item.id;
          return <button key={item.id} type="button" data-viz-mode-group="reference-angle" data-viz-reference-angle={item.id === 0 ? "left" : "upper"} data-viz-active={String(active)} aria-pressed={active} onClick={() => setState((current) => ({ ...current, reference: item.id }))} className={`focus-ring min-h-[44px] rounded-2xl border px-3 py-2 text-sm font-black ${active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75"}`}>{t(item.label)}</button>;
        })}
      </div>
    )
  };
}

function renderCircleGeometry(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const cx = 320;
  const cy = 210;
  const radiusPx = 84 + ((state.r - 2) / 8) * 60;
  const alpha = state.theta;
  const angleA = 90 - alpha / 2;
  const angleB = 90 + alpha / 2;
  const pointA = pointOnCircle(cx, cy, radiusPx, angleA);
  const pointB = pointOnCircle(cx, cy, radiusPx, angleB);
  const pointC = pointOnCircle(cx, cy, radiusPx, 270);
  const radiusVector = { x: pointA.x - cx, y: pointA.y - cy };
  const tangentUnit = { x: -radiusVector.y / radiusPx, y: radiusVector.x / radiusPx };
  const tangentHalfLength = clamp(radiusPx * 0.78, 76, 105);
  const tangentStart = { x: pointA.x - tangentUnit.x * tangentHalfLength, y: pointA.y - tangentUnit.y * tangentHalfLength };
  const tangentEnd = { x: pointA.x + tangentUnit.x * tangentHalfLength, y: pointA.y + tangentUnit.y * tangentHalfLength };
  const inscribed = alpha / 2;
  const arc = `M ${pointA.x.toFixed(2)} ${pointA.y.toFixed(2)} A ${radiusPx} ${radiusPx} 0 0 0 ${pointB.x.toFixed(2)} ${pointB.y.toFixed(2)}`;
  const formula = activeMode === "radius"
    ? mathematicalFormula(`OA = OB = OC = r = ${formatNumber(state.r, 2)}`)
    : activeMode === "chord"
      ? enZh(
        "A,B,C ∈ ⊙O; endpoints(arc AB) = endpoints(chord AB) = {A,B}",
        "A、B、C ∈ ⊙O；弧 AB 端點 = 弦 AB 端點 = {A,B}",
        "A、B、C ∈ ⊙O；弧 AB 端点 = 弦 AB 端点 = {A,B}"
      )
      : activeMode === "tangent"
        ? mathematicalFormula("OA ⟂ t_A; ∠(OA,t_A) = 90°")
        : mathematicalFormula(`∠AOB = ${formatNumber(alpha, 1)}° = 2∠ACB = 2(${formatNumber(inscribed, 1)}°)`);
  return {
    formula,
    summary: t(enZh(
      `A, B, and C all remain on the circle of radius ${formatNumber(state.r, 2)}. Chord AB and the highlighted arc share endpoints; OA is perpendicular to the tangent at A; ∠AOB = ${formatNumber(alpha, 1)}° and ∠ACB = ${formatNumber(inscribed, 1)}°.`,
      `A、B、C 均保持在半徑 ${formatNumber(state.r, 2)} 的圓上。弦 AB 與亮示弧共用端點；OA 垂直於 A 點切線；∠AOB = ${formatNumber(alpha, 1)}°，∠ACB = ${formatNumber(inscribed, 1)}°。`,
      `A、B、C 均保持在半径 ${formatNumber(state.r, 2)} 的圆上。弦 AB 与亮示弧共用端点；OA 垂直于 A 点切线；∠AOB = ${formatNumber(alpha, 1)}°，∠ACB = ${formatNumber(inscribed, 1)}°。`
    )),
    surface: (
      <Surface name="circle-geometry" label={t(enZh("Circle geometry with chord tangent arc and same-arc angles", "包含弦、切線、弧和同弧角的圓幾何", "包含弦、切线、弧和同弧角的圆几何"))} theme={theme}>
        <circle data-viz-name="circle-geometry-fill" cx={cx} cy={cy} r={radiusPx} fill={theme.softFill} stroke="none" />
        <circle data-viz-mark data-viz-name="circle-geometry-circle" data-viz-r={state.r} data-viz-radius={state.r} data-viz-pixel-radius={formatNumber(radiusPx, 6)} cx={cx} cy={cy} r={radiusPx} fill="none" stroke={BLUE} strokeWidth="7" />
        <circle data-viz-mark data-viz-name="circle-geometry-centre" data-viz-label="O" cx={cx} cy={cy} r="9" fill={theme.axisStrong} />
        <path data-viz-mark data-viz-name="circle-geometry-arc" data-viz-central-angle={alpha} d={arc} fill="none" stroke={activeMode === "chord" || activeMode === "theorem" ? AMBER : ROSE} strokeWidth={activeMode === "chord" || activeMode === "theorem" ? 11 : 7} strokeLinecap="round" />
        <line data-viz-mark data-viz-name="circle-geometry-chord" data-viz-a="A" data-viz-b="B" x1={pointA.x} y1={pointA.y} x2={pointB.x} y2={pointB.y} stroke={activeMode === "chord" ? GREEN : PURPLE} strokeWidth={activeMode === "chord" ? 9 : 6} strokeLinecap="round" />
        <line data-viz-mark data-viz-name="circle-geometry-radius" data-viz-r={state.r} data-viz-from="O" data-viz-to="A" data-viz-length={state.r} x1={cx} y1={cy} x2={pointA.x} y2={pointA.y} stroke={activeMode === "radius" || activeMode === "tangent" ? AMBER : theme.axisStrong} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="circle-geometry-radius" data-viz-r={state.r} data-viz-from="O" data-viz-to="B" data-viz-length={state.r} x1={cx} y1={cy} x2={pointB.x} y2={pointB.y} stroke={theme.axis} strokeWidth="4" />
        <line data-viz-mark data-viz-name="circle-geometry-radius" data-viz-r={state.r} data-viz-from="O" data-viz-to="C" data-viz-length={state.r} x1={cx} y1={cy} x2={pointC.x} y2={pointC.y} stroke={activeMode === "radius" ? GREEN : theme.axis} strokeWidth={activeMode === "radius" ? 7 : 4} strokeLinecap="round" />
        <line data-viz-mark data-viz-name="circle-geometry-tangent" data-viz-contact="A" data-viz-perpendicular-to="OA" data-viz-angle="90" x1={tangentStart.x} y1={tangentStart.y} x2={tangentEnd.x} y2={tangentEnd.y} stroke={activeMode === "tangent" ? GREEN : theme.axis} strokeWidth={activeMode === "tangent" ? 9 : 5} strokeLinecap="round" />
        <g data-viz-mark data-viz-name="circle-geometry-central-angle" data-viz-degrees={alpha}>
          <path d={sectorPath(cx, cy, 48, angleA, angleB)} fill={PURPLE} opacity={activeMode === "theorem" ? 0.72 : 0.32} />
        </g>
        <path data-viz-mark data-viz-name="circle-geometry-circumference-angle" data-viz-degrees={inscribed} data-viz-same-chord="AB" d={interiorAngleArcPath(pointC, pointA, pointB, 42)} fill="none" stroke={GREEN} strokeWidth={activeMode === "theorem" ? 8 : 5} strokeLinecap="round" />
        <line x1={pointC.x} y1={pointC.y} x2={pointA.x} y2={pointA.y} stroke={activeMode === "theorem" ? GREEN : theme.axis} strokeWidth={activeMode === "theorem" ? 6 : 3} />
        <line x1={pointC.x} y1={pointC.y} x2={pointB.x} y2={pointB.y} stroke={activeMode === "theorem" ? GREEN : theme.axis} strokeWidth={activeMode === "theorem" ? 6 : 3} />
        {[{ point: pointA, label: "A" }, { point: pointB, label: "B" }, { point: pointC, label: "C" }].map(({ point, label }) => <circle key={label} data-viz-mark data-viz-name={`circle-geometry-point-${label.toLowerCase()}`} data-viz-point={label} data-viz-distance-from-o={state.r} cx={point.x} cy={point.y} r="10" fill={label === "C" ? GREEN : ROSE} stroke={theme.pointStroke} strokeWidth="3" />)}
        {[{ point: pointA, label: "A" }, { point: pointB, label: "B" }, { point: pointC, label: "C" }].map(({ point, label }) => {
          const radialLength = Math.max(1, Math.hypot(point.x - cx, point.y - cy));
          return <text key={`label-${label}`} data-viz-label data-viz-name={`circle-geometry-label-${label.toLowerCase()}`} x={point.x + ((point.x - cx) / radialLength) * 24} y={point.y + ((point.y - cy) / radialLength) * 24 + 5} textAnchor="middle" fill={theme.text} className="text-sm font-black">{label}</text>;
        })}
        <text data-viz-label data-viz-name="circle-geometry-label-o" x={cx + 20} y={cy + 22} fill={theme.text} className="text-sm font-black">O</text>
        <g data-viz-mark data-viz-name="circle-geometry-invariant" data-viz-central={alpha} data-viz-inscribed={inscribed} data-viz-central-equals-twice-inscribed={String(Math.abs(alpha - 2 * inscribed) < 1e-9)} data-viz-tangent-perpendicular="true" />
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="r" value={formatNumber(state.r, 2)} color={BLUE} />
        <MetricCard label="∠AOB" value={`${formatNumber(alpha, 1)}°`} color={PURPLE} />
        <MetricCard label="∠ACB" value={`${formatNumber(inscribed, 1)}°`} color={GREEN} />
      </div>
    )
  };
}

function renderArcLengthSectorArea(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const cx = 320;
  const cy = 210;
  const radiusPx = 72 + ((state.r - 0.5) / 11.5) * 76;
  const startDegrees = 0;
  const endDegrees = state.theta;
  const start = pointOnCircle(cx, cy, radiusPx, startDegrees);
  const end = pointOnCircle(cx, cy, radiusPx, endDegrees);
  const fraction = state.theta / 360;
  const arcCoefficient = fraction * 2 * state.r;
  const sectorCoefficient = fraction * state.r ** 2;
  const arcApproximation = arcCoefficient * Math.PI;
  const sectorApproximation = sectorCoefficient * Math.PI;
  const radiusHalfUnits = Math.round(state.r * 2);
  const arcExactFraction = reducedPositiveFraction(state.theta * radiusHalfUnits, 360);
  const sectorExactFraction = reducedPositiveFraction(state.theta * radiusHalfUnits ** 2, 1440);
  const isFullCircle = state.theta === 360;
  const arc = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radiusPx} ${radiusPx} 0 ${state.theta > 180 ? 1 : 0} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  const exactValue = activeMode === "arc"
    ? exactPiMultiple(state.theta * radiusHalfUnits, 360, "cm")
    : exactPiMultiple(state.theta * radiusHalfUnits ** 2, 1440, "cm²");
  const approximateValue = activeMode === "arc" ? `${formatNumber(arcApproximation, 3)} cm` : `${formatNumber(sectorApproximation, 3)} cm²`;
  const formula = mathematicalFormula(activeMode === "arc"
    ? `L = (${formatNumber(state.theta, 0)}/360) × 2π(${formatNumber(state.r, 2)}) = ${exactValue} ≈ ${approximateValue}`
    : `A = (${formatNumber(state.theta, 0)}/360) × π(${formatNumber(state.r, 2)})^2 = ${exactValue} ≈ ${approximateValue}`);
  return {
    formula,
    summary: t(enZh(
      `The angle ${formatNumber(state.theta, 0)}° is ${formatNumber(state.theta, 0)}/360 of a full turn. With r = ${formatNumber(state.r, 2)} cm, the ${activeMode === "arc" ? "arc length" : "sector area"} is exactly ${exactValue}, approximately ${approximateValue}.${isFullCircle ? " This is the complete circle." : ""}`,
      `${formatNumber(state.theta, 0)}° 是整周的 ${formatNumber(state.theta, 0)}/360。當 r = ${formatNumber(state.r, 2)} cm，${activeMode === "arc" ? "弧長" : "扇形面積"}的精確值是 ${exactValue}，近似值是 ${approximateValue}。${isFullCircle ? "這是完整的圓。" : ""}`,
      `${formatNumber(state.theta, 0)}° 是整周的 ${formatNumber(state.theta, 0)}/360。当 r = ${formatNumber(state.r, 2)} cm，${activeMode === "arc" ? "弧长" : "扇形面积"}的精确值是 ${exactValue}，近似值是 ${approximateValue}。${isFullCircle ? "这是完整的圆。" : ""}`
    )),
    surface: (
      <Surface name="arc-length-sector-area" label={t(enZh("Arc length and sector area as a fraction of a full circle", "以整圓分數表示弧長和扇形面積", "以整圆分数表示弧长和扇形面积"))} theme={theme}>
        <circle data-viz-mark data-viz-name="circle" data-viz-r={state.r} data-viz-radius={state.r} data-viz-pixel-radius={formatNumber(radiusPx, 6)} cx={cx} cy={cy} r={radiusPx} fill={theme.softFill} stroke={BLUE} strokeWidth="7" />
        {activeMode === "sector" ? (
          isFullCircle
            ? <circle data-viz-mark data-viz-name="circle-sector" data-viz-fraction={fraction} data-viz-area-coefficient={formatNumber(sectorCoefficient, 8)} data-viz-exact-pi-numerator={sectorExactFraction.numerator} data-viz-exact-pi-denominator={sectorExactFraction.denominator} cx={cx} cy={cy} r={radiusPx - 4} fill={GREEN} opacity="0.5" />
            : <path data-viz-mark data-viz-name="circle-sector" data-viz-fraction={fraction} data-viz-area-coefficient={formatNumber(sectorCoefficient, 8)} data-viz-exact-pi-numerator={sectorExactFraction.numerator} data-viz-exact-pi-denominator={sectorExactFraction.denominator} d={sectorPath(cx, cy, radiusPx - 4, startDegrees, endDegrees)} fill={GREEN} opacity="0.58" />
        ) : null}
        {isFullCircle ? (
          <circle data-viz-mark data-viz-name="circle-arc" data-viz-fraction={fraction} data-viz-length-coefficient={formatNumber(arcCoefficient, 8)} data-viz-exact-pi-numerator={arcExactFraction.numerator} data-viz-exact-pi-denominator={arcExactFraction.denominator} cx={cx} cy={cy} r={radiusPx} fill="none" stroke={AMBER} strokeWidth={activeMode === "arc" ? 12 : 6} />
        ) : (
          <path data-viz-mark data-viz-name="circle-arc" data-viz-fraction={fraction} data-viz-length-coefficient={formatNumber(arcCoefficient, 8)} data-viz-exact-pi-numerator={arcExactFraction.numerator} data-viz-exact-pi-denominator={arcExactFraction.denominator} d={arc} fill="none" stroke={activeMode === "arc" ? AMBER : ROSE} strokeWidth={activeMode === "arc" ? 12 : 7} strokeLinecap="round" />
        )}
        <circle data-viz-mark data-viz-name="circle-centre" cx={cx} cy={cy} r="9" fill={theme.axisStrong} />
        <line data-viz-mark data-viz-name="circle-radius" data-viz-r={state.r} data-viz-length={state.r} x1={cx} y1={cy} x2={start.x} y2={start.y} stroke={PURPLE} strokeWidth="7" strokeLinecap="round" />
        {!isFullCircle ? <line data-viz-mark data-viz-name="circle-radius" data-viz-r={state.r} data-viz-length={state.r} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={PURPLE} strokeWidth="7" strokeLinecap="round" /> : null}
        <g data-viz-mark data-viz-name="circle-fraction" data-viz-theta={state.theta} data-viz-denominator="360" data-viz-value={formatNumber(fraction, 8)} data-viz-arc-pi-numerator={arcExactFraction.numerator} data-viz-arc-pi-denominator={arcExactFraction.denominator} data-viz-sector-pi-numerator={sectorExactFraction.numerator} data-viz-sector-pi-denominator={sectorExactFraction.denominator} />
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <MetricCard label={t(enZh("Full-turn fraction", "整周分數", "整周分数"))} value={`${formatNumber(state.theta, 0)}/360`} color={PURPLE} />
        <MetricCard label={t(enZh("Exact value", "精確值", "精确值"))} value={exactValue} color={AMBER} />
        <MetricCard label={t(enZh("Approximation", "近似值", "近似值"))} value={approximateValue} color={GREEN} />
      </div>
    )
  };
}

function evaluateFunctionFamily(family: string, x: number, a: number, b: number) {
  if (family === "linear") return a * x + b;
  if (family === "quadratic") return a * x * x + b;
  if (family === "exponential") return a * 2 ** (x / 2) + b;
  return x <= -4.9 ? Number.NaN : a * Math.log(x + 5) + b;
}

function renderFunctions(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const evaluate = (x: number) => evaluateFunctionFamily(activeMode, x, state.a, state.b);
  const output = evaluate(state.input);
  const tableInputs = [-2, -1, 0, 1, 2];
  const table = tableInputs.map((x) => ({ x, y: evaluate(x) }));
  const path = graphPath(evaluate, { xMin: -4.8, xMax: 5, yMin: -8, yMax: 14, left: 268, right: 602, top: 48, bottom: 340 });
  const outputInView = Number.isFinite(output) && output >= -8 && output <= 14;
  const inputPoint = {
    x: 268 + ((state.input + 4.8) / 9.8) * 334,
    y: 340 - ((clamp(output, -8, 14) + 8) / 22) * 292
  };
  const formula = mathematicalFormula(activeMode === "linear"
    ? `f(x) = ${formatNumber(state.a, 2)}x ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 2)}`
    : activeMode === "quadratic"
      ? `f(x) = ${formatNumber(state.a, 2)}x^2 ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 2)}`
      : activeMode === "exponential"
        ? `f(x) = ${formatNumber(state.a, 2)} × 2^(x/2) ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 2)}`
        : `f(x) = ${formatNumber(state.a, 2)} ln(x+5) ${state.b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(state.b), 2)}, x > -5`);
  return {
    formula,
    summary: t(enZh(
      `${activeMode} rule sends input x = ${formatNumber(state.input, 2)} to f(x) = ${formatNumber(output, 2)}; the machine, five-row table, and curve use this same rule.`,
      `${activeMode === "linear" ? "線性" : activeMode === "quadratic" ? "二次" : activeMode === "exponential" ? "指數" : "對數"}規則把輸入 x = ${formatNumber(state.input, 2)} 變成 f(x) = ${formatNumber(output, 2)}；機器、五行數表和曲線均使用同一規則。`,
      `${activeMode === "linear" ? "线性" : activeMode === "quadratic" ? "二次" : activeMode === "exponential" ? "指数" : "对数"}规则把输入 x = ${formatNumber(state.input, 2)} 变成 f(x) = ${formatNumber(output, 2)}；机器、五行数表和曲线均使用同一规则。`
    )),
    surface: (
      <Surface name="function-machine-table-graph" label={t(enZh("Input-output machine linked to a function graph", "連接函數圖像的輸入輸出機器"))} theme={theme}>
        <g data-viz-overlap-ok="function-input-label" data-viz-overlap-reason="The input value names the single function-machine input block that contains it.">
          <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="function-input" data-viz-x={state.input} x="42" y="90" width="78" height="64" rx="18" fill={BLUE} opacity="0.84" stroke={theme.pointStroke} strokeWidth="3" />
          <text data-viz-label data-viz-overlap-member="label" data-viz-name="function-input-label" x="81" y="128" textAnchor="middle" fill="#0f172a" className="text-sm font-black">x={formatNumber(state.input, 1)}</text>
        </g>
        <path data-viz-mark data-viz-name="function-machine-flow" d="M 124 122 H 156" stroke={AMBER} strokeWidth="7" strokeLinecap="round" />
        <g data-viz-overlap-ok="function-rule-label" data-viz-overlap-reason="The f glyph names the single function-rule block that contains it.">
          <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="function-rule" data-viz-family={activeMode} data-viz-a={state.a} data-viz-b={state.b} x="160" y="70" width="76" height="104" rx="24" fill={PURPLE} opacity="0.68" stroke={theme.pointStroke} strokeWidth="3" />
          <text data-viz-label data-viz-overlap-member="label" data-viz-name="function-rule-label" x="198" y="127" textAnchor="middle" fill="#0f172a" className="text-base font-black">f</text>
        </g>
        <path data-viz-mark data-viz-name="function-machine-flow" d="M 240 122 H 266" stroke={AMBER} strokeWidth="7" strokeLinecap="round" />
        <g data-viz-overlap-ok="function-output-label" data-viz-overlap-reason="The evaluated value names the single function-machine output block that contains it.">
          <rect data-viz-mark data-viz-overlap-member="mark" data-viz-name="function-output" data-viz-y={formatNumber(output, 6)} x="42" y="218" width="194" height="70" rx="20" fill={GREEN} opacity="0.76" stroke={theme.pointStroke} strokeWidth="3" />
          <text data-viz-label data-viz-overlap-member="label" data-viz-name="function-output-label" x="139" y="260" textAnchor="middle" fill="#0f172a" className="text-sm font-black">f(x)={formatNumber(output, 2)}</text>
        </g>
        <g transform="translate(0 0)">
          {[0, 1, 2, 3, 4].map((index) => <line key={`v-${index}`} x1={268 + index * 83.5} x2={268 + index * 83.5} y1="48" y2="340" stroke={theme.grid} />)}
          {[0, 1, 2, 3, 4].map((index) => <line key={`h-${index}`} x1="268" x2="602" y1={48 + index * 73} y2={48 + index * 73} stroke={theme.grid} />)}
        </g>
        <path data-viz-mark data-viz-name="function-curve" data-viz-family={activeMode} data-viz-a={state.a} data-viz-b={state.b} d={path} fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
        <text data-viz-label data-viz-name="function-x-axis-label" x="594" y="334" textAnchor="end" fill={theme.text} className="text-xs font-black">x</text>
        <text data-viz-label data-viz-name="function-y-axis-label" x="278" y="66" textAnchor="start" fill={theme.text} className="text-xs font-black">f(x)</text>
        {outputInView ? (
          <circle data-viz-mark data-viz-name="function-highlighted-point" data-viz-x={state.input} data-viz-y={formatNumber(output, 6)} data-viz-offscale="false" cx={inputPoint.x} cy={inputPoint.y} r="10" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
        ) : (
          <g data-viz-mark data-viz-name="function-highlighted-point" data-viz-x={state.input} data-viz-y={formatNumber(output, 6)} data-viz-offscale="true" data-viz-offscale-direction={output > 14 ? "above" : "below"}>
            <path d={output > 14 ? `M ${inputPoint.x - 11} 62 L ${inputPoint.x} 44 L ${inputPoint.x + 11} 62 Z` : `M ${inputPoint.x - 11} 326 L ${inputPoint.x} 344 L ${inputPoint.x + 11} 326 Z`} fill={ROSE} stroke={theme.pointStroke} strokeWidth="2" />
          </g>
        )}
        <g data-viz-mark data-viz-name="function-table" data-viz-values={table.map((row) => `${row.x}:${formatNumber(row.y, 3)}`).join("|")}>
          {table.map((row, index) => <circle key={row.x} cx={78 + index * 34} cy={340 - clamp((row.y + 8) * 5, 8, 88)} r="7" fill={index % 2 ? AMBER : GREEN} />)}
        </g>
      </Surface>
    ),
    details: (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
        <table className="w-full min-w-[300px] text-center text-sm">
          <caption className="sr-only">{t(enZh("Function input-output table", "函數輸入輸出數表"))}</caption>
          <thead className="bg-slate-100/80 text-slate-600 dark:bg-white/[0.07] dark:text-white/65"><tr><th className="px-3 py-2">x</th>{table.map((row) => <th key={row.x} className="px-3 py-2">{row.x}</th>)}</tr></thead>
          <tbody><tr><th className="px-3 py-2 text-slate-600 dark:text-white/65">f(x)</th>{table.map((row) => <td key={row.x} className="px-3 py-2 font-black text-cyan-600 dark:text-cyan-300">{formatNumber(row.y, 2)}</td>)}</tr></tbody>
        </table>
      </div>
    )
  };
}

function renderCoordinateGeometry(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const metrics = lineEquationSummary(state.x1, state.y1, state.x2, state.y2);
  const coincident = state.x1 === state.x2 && state.y1 === state.y2;
  const a = coordinateMap(state.x1, state.y1, 10, 7);
  const b = coordinateMap(state.x2, state.y2, 10, 7);
  const midpoint = coordinateMap(metrics.midpoint.x, metrics.midpoint.y, 10, 7);
  const corner = coordinateMap(state.x2, state.y1, 10, 7);
  const formula = activeMode === "gradient"
    ? metrics.gradient === null
      ? enZh("gradient undefined because change x = 0", "斜率未定義，因為 x 的變化量 = 0", "斜率未定义，因为 x 的变化量 = 0")
      : enZh(
        `m = change y/change x = ${formatNumber(metrics.dy, 0)}/${formatNumber(metrics.dx, 0)} = ${formatNumber(metrics.gradient, 3)}`,
        `m = y 的變化量/x 的變化量 = ${formatNumber(metrics.dy, 0)}/${formatNumber(metrics.dx, 0)} = ${formatNumber(metrics.gradient, 3)}`,
        `m = y 的变化量/x 的变化量 = ${formatNumber(metrics.dy, 0)}/${formatNumber(metrics.dx, 0)} = ${formatNumber(metrics.gradient, 3)}`
      )
    : activeMode === "distance"
      ? mathematicalFormula(`d = sqrt((${formatNumber(metrics.dx, 0)})^2 + (${formatNumber(metrics.dy, 0)})^2) = ${formatNumber(metrics.distance, 3)}`)
      : mathematicalFormula(`M = ((${formatNumber(state.x1, 0)}+${formatNumber(state.x2, 0)})/2, (${formatNumber(state.y1, 0)}+${formatNumber(state.y2, 0)})/2) = (${formatNumber(metrics.midpoint.x, 2)}, ${formatNumber(metrics.midpoint.y, 2)})`);
  return {
    formula,
    summary: t(enZh(
      `${coincident ? `A and B coincide at (${state.x1}, ${state.y1})` : `For A(${state.x1}, ${state.y1}) and B(${state.x2}, ${state.y2})`}: gradient = ${metrics.gradient === null ? "undefined" : formatNumber(metrics.gradient, 3)}, distance = ${formatNumber(metrics.distance, 3)}, midpoint = (${formatNumber(metrics.midpoint.x, 2)}, ${formatNumber(metrics.midpoint.y, 2)}).`,
      `${coincident ? `A 與 B 在 (${state.x1}, ${state.y1}) 重合` : `對 A(${state.x1}, ${state.y1}) 與 B(${state.x2}, ${state.y2})`}：斜率 = ${metrics.gradient === null ? "未定義" : formatNumber(metrics.gradient, 3)}，距離 = ${formatNumber(metrics.distance, 3)}，中點 = (${formatNumber(metrics.midpoint.x, 2)}, ${formatNumber(metrics.midpoint.y, 2)})。`,
      `${coincident ? `A 与 B 在 (${state.x1}, ${state.y1}) 重合` : `对 A(${state.x1}, ${state.y1}) 与 B(${state.x2}, ${state.y2})`}：斜率 = ${metrics.gradient === null ? "未定义" : formatNumber(metrics.gradient, 3)}，距离 = ${formatNumber(metrics.distance, 3)}，中点 = (${formatNumber(metrics.midpoint.x, 2)}, ${formatNumber(metrics.midpoint.y, 2)})。`
    )),
    surface: (
      <Surface name="coordinate-geometry" label={t(enZh("Gradient distance and midpoint on one segment", "同一線段上的斜率、距離與中點"))} theme={theme}>
        <Grid theme={theme} />
        <g data-viz-mark data-viz-name="coordinate-coincidence-state" data-viz-coincident={String(coincident)} data-viz-point-a={`${state.x1},${state.y1}`} data-viz-point-b={`${state.x2},${state.y2}`} />
        <line data-viz-mark data-viz-name="coordinate-geometry-segment" data-viz-distance={formatNumber(metrics.distance, 6)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={activeMode === "distance" ? AMBER : BLUE} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="coordinate-run" data-viz-change-x={metrics.dx} x1={a.x} y1={a.y} x2={corner.x} y2={corner.y} stroke={activeMode === "gradient" ? AMBER : theme.axis} strokeWidth="5" strokeDasharray="8 7" />
        <line data-viz-mark data-viz-name="coordinate-rise" data-viz-change-y={metrics.dy} x1={corner.x} y1={corner.y} x2={b.x} y2={b.y} stroke={activeMode === "gradient" ? ROSE : theme.axis} strokeWidth="5" strokeDasharray="8 7" />
        <circle data-viz-mark data-viz-name="coordinate-point-a" data-viz-x={state.x1} data-viz-y={state.y1} data-viz-coincident={String(coincident)} cx={a.x} cy={a.y} r="11" fill={BLUE} stroke={theme.pointStroke} strokeWidth="3" />
        <circle data-viz-mark data-viz-name="coordinate-point-b" data-viz-x={state.x2} data-viz-y={state.y2} data-viz-coincident={String(coincident)} cx={b.x} cy={b.y} r={coincident ? 18 : 11} fill={coincident ? "none" : GREEN} stroke={GREEN} strokeWidth={coincident ? 5 : 3} />
        <text data-viz-label data-viz-name="coordinate-point-a-label" x={a.x - (coincident ? 42 : 24)} y={a.y - (coincident ? 32 : 20)} textAnchor="middle" fill={theme.text} className="text-sm font-black">A</text>
        <text data-viz-label data-viz-name="coordinate-point-b-label" x={b.x + (coincident ? 42 : 24)} y={b.y - (coincident ? 32 : 20)} textAnchor="middle" fill={theme.text} className="text-sm font-black">B</text>
        <circle data-viz-mark data-viz-name="coordinate-midpoint" data-viz-x={formatNumber(metrics.midpoint.x, 4)} data-viz-y={formatNumber(metrics.midpoint.y, 4)} cx={midpoint.x} cy={midpoint.y} r={coincident ? 24 : activeMode === "midpoint" ? 14 : 8} fill={coincident ? "none" : PURPLE} stroke={PURPLE} strokeWidth="3" />
        {coincident ? <text data-viz-label data-viz-name="coordinate-coincident-label" x={a.x} y={a.y + 46} textAnchor="middle" fill={theme.text} className="text-sm font-black">A = B</text> : null}
      </Surface>
    )
  };
}

function renderMoreAlgebra(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const indexLeft = state.x ** state.m * state.x ** state.n;
  const indexRight = state.x ** (state.m + state.n);
  const identityLeft = (state.x + state.k) ** 2;
  const identityRight = state.x ** 2 + 2 * state.k * state.x + state.k ** 2;
  const rationalUndefined = state.x === state.k;
  const rationalNumerator = state.x ** 2 - state.k ** 2;
  const rationalValue = rationalUndefined ? null : rationalNumerator / (state.x - state.k);
  const identityTerms = [state.x ** 2, 2 * state.k * state.x, state.k ** 2];
  const identityScale = 300 / Math.max(1, ...identityTerms.map((value) => Math.abs(value)));
  const formula = activeMode === "indices"
    ? mathematicalFormula(`${formatNumber(state.x, 0)}^${formatNumber(state.m, 0)} × ${formatNumber(state.x, 0)}^${formatNumber(state.n, 0)} = ${formatNumber(state.x, 0)}^(${formatNumber(state.m + state.n, 0)}) = ${formatNumber(indexRight, 0)}`)
    : activeMode === "identity"
      ? enZh(
        `(x+${formatNumber(state.k, 0)})^2 = x^2 + ${formatNumber(2 * state.k, 0)}x + ${formatNumber(state.k ** 2, 0)} = ${formatNumber(identityRight, 0)} at x=${formatNumber(state.x, 0)}`,
        `當 x=${formatNumber(state.x, 0)} 時，(x+${formatNumber(state.k, 0)})^2 = x^2 + ${formatNumber(2 * state.k, 0)}x + ${formatNumber(state.k ** 2, 0)} = ${formatNumber(identityRight, 0)}`,
        `当 x=${formatNumber(state.x, 0)} 时，(x+${formatNumber(state.k, 0)})^2 = x^2 + ${formatNumber(2 * state.k, 0)}x + ${formatNumber(state.k ** 2, 0)} = ${formatNumber(identityRight, 0)}`
      )
      : mathematicalFormula(`(x^2-${formatNumber(state.k ** 2, 0)})/(x-${formatNumber(state.k, 0)}) = x+${formatNumber(state.k, 0)}, x ≠ ${formatNumber(state.k, 0)}`);
  const equalityHolds = activeMode === "indices" ? indexLeft === indexRight : activeMode === "identity" ? identityLeft === identityRight : !rationalUndefined && rationalValue === state.x + state.k;
  return {
    formula,
    summary: t(enZh(
      activeMode === "indices"
        ? `Equal-base powers combine by adding exponents: ${state.m} + ${state.n} = ${state.m + state.n}; both sides evaluate to ${formatNumber(indexRight, 0)}.`
        : activeMode === "identity"
          ? `The square and its four algebraic areas agree: both sides evaluate to ${formatNumber(identityRight, 0)} for x = ${state.x}.`
          : rationalUndefined
            ? `At x = k = ${state.k}, the cancelled factor x - k is zero, so the original rational expression is undefined even though x + k = ${state.x + state.k}.`
            : `The factor x - ${state.k} cancels only because x ≠ ${state.k}; both defined expressions equal ${formatNumber(rationalValue ?? 0, 2)}.`,
      activeMode === "indices"
        ? `同底冪相乘時指數相加：${state.m} + ${state.n} = ${state.m + state.n}；兩邊均為 ${formatNumber(indexRight, 0)}。`
        : activeMode === "identity"
          ? `平方與四個代數面積相等：當 x = ${state.x}，兩邊均為 ${formatNumber(identityRight, 0)}。`
          : rationalUndefined
            ? `當 x = k = ${state.k}，被約去的因子 x - k 為零，所以原有理式未定義，即使 x + k = ${state.x + state.k}。`
            : `只有 x ≠ ${state.k} 時才可約去因子 x - ${state.k}；兩個已定義的式均為 ${formatNumber(rationalValue ?? 0, 2)}。`,
      activeMode === "indices"
        ? `同底幂相乘时指数相加：${state.m} + ${state.n} = ${state.m + state.n}；两边均为 ${formatNumber(indexRight, 0)}。`
        : activeMode === "identity"
          ? `平方与四个代数面积相等：当 x = ${state.x}，两边均为 ${formatNumber(identityRight, 0)}。`
          : rationalUndefined
            ? `当 x = k = ${state.k}，被约去的因子 x - k 为零，所以原有理式未定义，即使 x + k = ${state.x + state.k}。`
            : `只有 x ≠ ${state.k} 时才可约去因子 x - ${state.k}；两个已定义的式均为 ${formatNumber(rationalValue ?? 0, 2)}。`
    )),
    surface: (
      <Surface name="senior-algebra-structures" label={t(enZh("Index identity and rational algebra structures", "指數、恆等式與有理代數結構"))} theme={theme}>
        {activeMode === "indices" ? (
          <>
            <g data-viz-mark data-viz-name="algebra-power-stack" data-viz-base={state.x} data-viz-m={state.m} data-viz-n={state.n}>
              {Array.from({ length: Math.round(state.m) }, (_, index) => <rect key={`m-${index}`} x={92 + index * 36} y="116" width="28" height="80" rx="9" fill={BLUE} opacity="0.8" />)}
              {Array.from({ length: Math.round(state.n) }, (_, index) => <rect key={`n-${index}`} x={340 + index * 36} y="116" width="28" height="80" rx="9" fill={PURPLE} opacity="0.8" />)}
            </g>
            <path data-viz-mark data-viz-name="algebra-exponent-combine" d="M 210 254 C 262 316 378 316 430 254" fill="none" stroke={AMBER} strokeWidth="8" strokeLinecap="round" />
            <g data-viz-mark data-viz-name="algebra-combined-power" data-viz-exponent={state.m + state.n}>
              {Array.from({ length: Math.round(state.m + state.n) }, (_, index) => <circle key={index} cx={224 + index * 32} cy="326" r="11" fill={GREEN} />)}
            </g>
          </>
        ) : activeMode === "identity" ? (
          <g data-viz-mark data-viz-name="algebra-identity-area" data-viz-model="signed-tiles" data-viz-x={state.x} data-viz-k={state.k} data-viz-left={identityLeft} data-viz-right={identityRight}>
            <line x1="320" x2="320" y1="54" y2="350" stroke={theme.axisStrong} strokeWidth="5" />
            {identityTerms.map((term, index) => {
              const width = Math.max(4, Math.abs(term) * identityScale);
              return <rect key={index} data-viz-name={index === 0 ? "algebra-identity-x2" : index === 1 ? "algebra-identity-cross-tiles" : "algebra-identity-k2"} data-viz-term={term} data-viz-sign={term < 0 ? "negative" : "positive"} x={term < 0 ? 320 - width : 320} y={82 + index * 92} width={width} height="54" rx="12" fill={term < 0 ? ROSE : index === 0 ? BLUE : index === 1 ? AMBER : GREEN} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />;
            })}
            <g data-viz-name="algebra-identity-total" data-viz-value={identityRight} />
          </g>
        ) : (
          <>
            <rect data-viz-mark data-viz-name="algebra-rational-numerator" data-viz-value={rationalNumerator} x="108" y="92" width="424" height="84" rx="22" fill={BLUE} opacity="0.7" stroke={theme.pointStroke} strokeWidth="3" />
            <line data-viz-mark data-viz-name="algebra-fraction-bar" x1="98" x2="542" y1="202" y2="202" stroke={theme.axisStrong} strokeWidth="7" strokeLinecap="round" />
            <rect data-viz-mark data-viz-name="algebra-cancel-factor" data-viz-factor={state.x - state.k} x="194" y="230" width="252" height="72" rx="20" fill={rationalUndefined ? ROSE : AMBER} opacity="0.78" stroke={theme.pointStroke} strokeWidth="3" />
            <path data-viz-mark data-viz-name="algebra-domain-exclusion" data-viz-excluded={state.k} data-viz-current-x={state.x} d="M 270 320 L 370 356 M 370 320 L 270 356" stroke={rationalUndefined ? ROSE : GREEN} strokeWidth="8" strokeLinecap="round" opacity={rationalUndefined ? 1 : 0.42} />
          </>
        )}
        <circle data-viz-mark data-viz-name="algebra-equality-check" data-viz-valid={String(equalityHolds)} data-viz-defined={String(activeMode !== "rational" || !rationalUndefined)} cx="564" cy="52" r="16" fill={activeMode === "rational" && rationalUndefined ? AMBER : equalityHolds ? GREEN : ROSE} stroke={theme.pointStroke} strokeWidth="3" />
      </Surface>
    )
  };
}

function renderTrigonometryS5(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const evaluate = (degrees: number) => {
    const radians = (2 * Math.PI * (degrees - state.phase)) / state.period;
    return state.amplitude * (activeMode === "cos" ? Math.cos(radians) : Math.sin(radians));
  };
  const displayMin = -180;
  const displayMax = 720;
  const mapX = (degrees: number) => 62 + ((degrees - displayMin) / (displayMax - displayMin)) * 540;
  const mapY = (value: number) => 200 - (value / 4) * 138;
  const path = Array.from({ length: 301 }, (_, index) => displayMin + index * 3).map((degrees, index) => `${index === 0 ? "M" : "L"} ${mapX(degrees).toFixed(2)} ${mapY(evaluate(degrees)).toFixed(2)}`).join(" ");
  const phaseX = mapX(state.phase);
  const periodStart = mapX(state.phase);
  const periodEnd = mapX(state.phase + state.period);
  const phaseExpression = state.phase >= 0 ? `x-${formatNumber(state.phase, 0)}°` : `x+${formatNumber(Math.abs(state.phase), 0)}°`;
  return {
    formula: mathematicalFormula(`y = ${formatNumber(state.amplitude, 2)} ${activeMode} (2π(${phaseExpression})/${formatNumber(state.period, 0)}°)`),
    summary: t(enZh(
      `${activeMode === "sin" ? "Sine" : "Cosine"} wave: amplitude ${formatNumber(state.amplitude, 2)}, period ${formatNumber(state.period, 0)}°, phase shift ${formatNumber(state.phase, 0)}°.`,
      `${activeMode === "sin" ? "正弦" : "餘弦"}波：振幅 ${formatNumber(state.amplitude, 2)}，周期 ${formatNumber(state.period, 0)}°，相位移 ${formatNumber(state.phase, 0)}°。`,
      `${activeMode === "sin" ? "正弦" : "余弦"}波：振幅 ${formatNumber(state.amplitude, 2)}，周期 ${formatNumber(state.period, 0)}°，相位移 ${formatNumber(state.phase, 0)}°。`
    )),
    surface: (
      <Surface name="senior-trig-wave" label={t(enZh("Trig wave with amplitude period and phase bindings", "綁定振幅、周期與相位的三角波"))} theme={theme}>
        {[-180, 0, 180, 360, 540, 720].map((degrees) => <line key={degrees} x1={mapX(degrees)} x2={mapX(degrees)} y1="48" y2="352" stroke={degrees === 0 ? theme.axisStrong : theme.grid} strokeWidth={degrees === 0 ? 2.5 : 1} />)}
        {[-4, -2, 0, 2, 4].map((value) => <line key={value} x1="62" x2="602" y1={mapY(value)} y2={mapY(value)} stroke={value === 0 ? theme.axisStrong : theme.grid} strokeWidth={value === 0 ? 2.5 : 1} />)}
        <path data-viz-mark data-viz-name="trig-wave" data-viz-kind={activeMode} data-viz-amplitude={state.amplitude} data-viz-period={state.period} data-viz-phase={state.phase} d={path} fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="trig-amplitude-guide" data-viz-amplitude={state.amplitude} x1="92" x2="92" y1={mapY(0)} y2={mapY(state.amplitude)} stroke={AMBER} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="trig-period-guide" data-viz-period={state.period} x1={periodStart} x2={periodEnd} y1="326" y2="326" stroke={GREEN} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="trig-phase-marker" data-viz-phase={state.phase} x1={phaseX} x2={phaseX} y1="48" y2="352" stroke={ROSE} strokeWidth="4" strokeDasharray="8 8" />
      </Surface>
    )
  };
}

function choose(n: number, r: number) {
  if (r < 0 || n < r) return 0;
  if (r === 0 || n === r) return 1;
  let result = 1;
  for (let index = 1; index <= Math.min(r, n - r); index += 1) result = (result * (n - index + 1)) / index;
  return Math.round(result);
}

function renderProbabilityS5(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const red = Math.round(state.red);
  const blue = Math.round(state.blue);
  const total = red + blue;
  const totalPairs = choose(total, 2);
  const blueOnly = choose(blue, 2);
  const favourablePairs = totalPairs - blueOnly;
  const favourableProbability = favourablePairs / totalPairs;
  const firstRed = red / total;
  const secondRedGivenFirst = total > 1 ? (red - 1) / (total - 1) : 0;
  const bothRed = firstRed * secondRedGivenFirst;
  const formula = activeMode === "counting"
    ? enZh(
      `favourable pairs = ${favourablePairs}; P(at least one red) = ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}`,
      `有利配對數 = ${favourablePairs}；P(至少一個紅色) = ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}`,
      `有利配对数 = ${favourablePairs}；P(至少一个红色) = ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}`
    )
    : mathematicalFormula(`P(R2 | R1) = (${red}-1)/(${total}-1) = ${formatNumber(secondRedGivenFirst, 3)}; P(RR) = ${formatNumber(bothRed, 3)}`);
  return {
    formula,
    summary: t(enZh(
      activeMode === "counting"
        ? `${total} objects give ${totalPairs} unordered pairs; the favourable count is ${favourablePairs}, so the probability is ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}.`
        : `After the first red is known, ${red - 1} red objects remain among ${total - 1}; P(second red | first red) = ${formatNumber(secondRedGivenFirst, 3)}.`,
      activeMode === "counting"
        ? `${total} 個物件共有 ${totalPairs} 個無序配對；有利配對數是 ${favourablePairs}，所以概率為 ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}。`
        : `已知第一個是紅色後，${total - 1} 個餘下物件中有 ${red - 1} 個紅色；P(第二紅 | 第一紅) = ${formatNumber(secondRedGivenFirst, 3)}。`,
      activeMode === "counting"
        ? `${total} 个物件共有 ${totalPairs} 个无序配对；有利配对数是 ${favourablePairs}，所以概率为 ${favourablePairs}/${totalPairs} = ${formatNumber(favourableProbability, 3)}。`
        : `已知第一个是红色后，${total - 1} 个余下物件中有 ${red - 1} 个红色；P(第二红 | 第一红) = ${formatNumber(secondRedGivenFirst, 3)}。`
    )),
    surface: (
      <Surface name="conditional-probability" label={t(enZh("Counting and conditional probability model", "計數與條件概率模型"))} theme={theme}>
        <g data-viz-mark data-viz-name="probability-favourable-count" data-viz-count={favourablePairs} data-viz-total={totalPairs} />
        <g data-viz-mark data-viz-name="probability-at-least-one-red" data-viz-probability={formatNumber(favourableProbability, 8)} data-viz-fraction={`${favourablePairs}/${totalPairs}`} />
        <g data-viz-mark data-viz-name="probability-objects" data-viz-red={red} data-viz-blue={blue}>
          {Array.from({ length: total }, (_, index) => <circle key={index} cx={92 + index * (456 / Math.max(1, total - 1))} cy="76" r="18" fill={index < red ? ROSE : BLUE} stroke={theme.pointStroke} strokeWidth="3" />)}
        </g>
        <text data-viz-label data-viz-name="probability-red-label" x="190" y={activeMode === "conditional" ? 142 : 120} textAnchor="middle" fill={theme.text} className="text-sm font-black">R = {t(enZh("red", "紅色", "红色"))} ({red})</text>
        <text data-viz-label data-viz-name="probability-blue-label" x="450" y={activeMode === "conditional" ? 142 : 120} textAnchor="middle" fill={theme.text} className="text-sm font-black">B = {t(enZh("blue", "藍色", "蓝色"))} ({blue})</text>
        {activeMode === "counting" ? (
          <g data-viz-mark data-viz-name="probability-combination-space" data-viz-total={totalPairs} data-viz-favourable={favourablePairs}>
            {Array.from({ length: totalPairs }, (_, index) => <rect key={index} x={74 + (index % 20) * 24} y={142 + Math.floor(index / 20) * 34} width="16" height="22" rx="5" fill={index < favourablePairs ? GREEN : theme.emptyFill} stroke={index < favourablePairs ? GREEN : theme.axis} strokeWidth="1.5" />)}
          </g>
        ) : (
          <g data-viz-mark data-viz-name="probability-tree" data-viz-without-replacement="true">
            <circle cx="104" cy="224" r="10" fill={theme.axisStrong} />
            <line data-viz-name="probability-first-red" data-viz-probability={formatNumber(firstRed, 6)} x1="114" y1="220" x2="300" y2="148" stroke={ROSE} strokeWidth="7" strokeLinecap="round" />
            <line data-viz-name="probability-first-blue" data-viz-probability={formatNumber(blue / total, 6)} x1="114" y1="228" x2="300" y2="300" stroke={BLUE} strokeWidth="7" strokeLinecap="round" />
            <line data-viz-name="probability-conditioned-red" data-viz-probability={formatNumber(secondRedGivenFirst, 6)} x1="310" y1="148" x2="520" y2="104" stroke={GREEN} strokeWidth="8" strokeLinecap="round" />
            <line data-viz-name="probability-conditioned-blue" data-viz-probability={formatNumber(blue / (total - 1), 6)} x1="310" y1="148" x2="520" y2="190" stroke={AMBER} strokeWidth="6" strokeLinecap="round" />
            <circle cx="304" cy="148" r="12" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
            <circle cx="304" cy="300" r="12" fill={BLUE} stroke={theme.pointStroke} strokeWidth="3" />
            <circle cx="524" cy="104" r="12" fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" />
            <circle cx="524" cy="190" r="12" fill={AMBER} stroke={theme.pointStroke} strokeWidth="3" />
            <text data-viz-label data-viz-name="probability-first-red-label" x="200" y="164" textAnchor="middle" fill={theme.text} className="text-xs font-black">P(R₁)={formatNumber(firstRed, 3)}</text>
            <text data-viz-label data-viz-name="probability-conditioned-red-label" x="416" y="112" textAnchor="middle" fill={theme.text} className="text-xs font-black">P(R₂|R₁)={formatNumber(secondRedGivenFirst, 3)}</text>
          </g>
        )}
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label={t(enZh("Favourable pairs", "有利配對數", "有利配对数"))} value={`${favourablePairs} / ${totalPairs}`} color={GREEN} />
        <MetricCard label={t(enZh("P(at least one red)", "P(至少一個紅色)", "P(至少一个红色)"))} value={formatNumber(favourableProbability, 3)} color={ROSE} />
      </div>
    )
  };
}

function renderStatisticsS6(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const z = (state.observed - state.mean) / state.sd;
  const mapZ = (value: number) => 70 + ((value + 4) / 8) * 500;
  const densityY = (value: number) => 322 - Math.exp(-0.5 * value * value) * 220;
  const curve = Array.from({ length: 181 }, (_, index) => -4 + index * (8 / 180)).map((value, index) => `${index === 0 ? "M" : "L"} ${mapZ(value).toFixed(2)} ${densityY(value).toFixed(2)}`).join(" ");
  const zInView = z >= -4 && z <= 4;
  const observedX = mapZ(clamp(z, -4, 4));
  return {
    formula: mathematicalFormula(`z = (x-μ)/σ = (${formatNumber(state.observed, 0)}-${formatNumber(state.mean, 0)})/${formatNumber(state.sd, 0)} = ${formatNumber(z, 3)}`),
    summary: t(enZh(
      `Observed x = ${state.observed}, mean μ = ${state.mean}, standard deviation σ = ${state.sd}; z = ${formatNumber(z, 3)}, so x is ${formatNumber(Math.abs(z), 2)} standard deviations ${z >= 0 ? "above" : "below"} the mean.`,
      `觀察值 x = ${state.observed}，平均數 μ = ${state.mean}，標準差 σ = ${state.sd}；z = ${formatNumber(z, 3)}，即 x 位於平均數${z >= 0 ? "以上" : "以下"} ${formatNumber(Math.abs(z), 2)} 個標準差。`,
      `观察值 x = ${state.observed}，平均数 μ = ${state.mean}，标准差 σ = ${state.sd}；z = ${formatNumber(z, 3)}，即 x 位于平均数${z >= 0 ? "以上" : "以下"} ${formatNumber(Math.abs(z), 2)} 个标准差。`
    )),
    surface: (
      <Surface name="z-score-normal-model" label={t(enZh("Normal distribution with observed value and z-score", "帶觀察值與 z 分數的常態分佈"))} theme={theme}>
        <path data-viz-mark data-viz-name="statistics-normal-curve" data-viz-mean={state.mean} data-viz-sd={state.sd} d={curve} fill={theme.softFill} stroke={BLUE} strokeWidth="6" />
        <line data-viz-mark data-viz-name="statistics-baseline" x1="70" x2="570" y1="322" y2="322" stroke={theme.axisStrong} strokeWidth="4" />
        <line data-viz-mark data-viz-name="statistics-mean" data-viz-value={state.mean} x1={mapZ(0)} x2={mapZ(0)} y1="92" y2="336" stroke={GREEN} strokeWidth="6" />
        {[-2, -1, 1, 2].map((band) => <line key={band} data-viz-mark data-viz-name="statistics-sd-band" data-viz-z={band} data-viz-value={state.mean + band * state.sd} x1={mapZ(band)} x2={mapZ(band)} y1={densityY(band)} y2="328" stroke={PURPLE} strokeWidth={Math.abs(band) === 1 ? 4 : 2.5} strokeDasharray="7 7" />)}
        <line data-viz-mark data-viz-name="statistics-observed" data-viz-value={state.observed} data-viz-z={formatNumber(z, 6)} data-viz-offscale={String(!zInView)} data-viz-offscale-direction={!zInView ? z > 4 ? "right" : "left" : "none"} x1={observedX} x2={observedX} y1="70" y2="338" stroke={ROSE} strokeWidth="7" strokeDasharray={zInView ? undefined : "10 7"} />
        {!zInView ? <path data-viz-mark data-viz-name="statistics-offscale-arrow" data-viz-z={formatNumber(z, 6)} data-viz-direction={z > 4 ? "right" : "left"} d={z > 4 ? "M 548 52 L 584 70 L 548 88 Z" : "M 92 52 L 56 70 L 92 88 Z"} fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" /> : null}
        <line data-viz-mark data-viz-name="statistics-z-displacement" data-viz-z={formatNumber(z, 6)} x1={mapZ(0)} x2={observedX} y1={activeMode === "standardize" ? 62 : 350} y2={activeMode === "standardize" ? 62 : 350} stroke={AMBER} strokeWidth="8" strokeLinecap="round" />
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="x" value={formatNumber(state.observed, 2)} color={ROSE} />
        <MetricCard label="μ" value={formatNumber(state.mean, 2)} color={GREEN} />
        <MetricCard label="z" value={formatNumber(z, 3)} color={AMBER} />
      </div>
    )
  };
}

function revisionPriority(mastery: number, errors: number) {
  return 0.6 * (100 - mastery) + 8 * errors;
}

function renderExamRevision(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator): ModelRender {
  const topics = [
    { id: "algebra", mastery: state.algebra, errors: 4, color: BLUE, label: t(enZh("Algebra", "代數")) },
    { id: "geometry", mastery: state.geometry, errors: 2, color: PURPLE, label: t(enZh("Geometry", "幾何")) },
    { id: "statistics", mastery: state.statistics, errors: 5, color: GREEN, label: t(enZh("Statistics", "統計")) }
  ].map((topic) => ({ ...topic, priority: revisionPriority(topic.mastery, topic.errors) }));
  const ranked = [...topics].sort((left, right) => right.priority - left.priority);
  const masteryGapTotal = topics.reduce((total, topic) => total + (100 - topic.mastery), 0);
  const recentErrorsTotal = topics.reduce((total, topic) => total + topic.errors, 0);
  const priorityTotal = topics.reduce((total, topic) => total + topic.priority, 0);
  const timeBudget = state.marks * state.pace;
  const formula = activeMode === "priority"
    ? enZh(
      "priority = 0.6(100-mastery) + 8(recent errors)",
      "優先值 = 0.6(100−掌握度) + 8(近期錯誤)",
      "优先值 = 0.6(100−掌握度) + 8(近期错误)"
    )
    : enZh(
      `time budget = ${formatNumber(state.marks, 0)} marks × ${formatNumber(state.pace, 2)} min/mark = ${formatNumber(timeBudget, 2)} min`,
      `時間預算 = ${formatNumber(state.marks, 0)} 分 × 每分 ${formatNumber(state.pace, 2)} 分鐘 = ${formatNumber(timeBudget, 2)} 分鐘`,
      `时间预算 = ${formatNumber(state.marks, 0)} 分 × 每分 ${formatNumber(state.pace, 2)} 分钟 = ${formatNumber(timeBudget, 2)} 分钟`
    );
  return {
    formula,
    summary: t(enZh(
      activeMode === "priority"
        ? `${ranked[0].label} ranks first at ${formatNumber(ranked[0].priority, 1)} because the model combines its mastery gap with recent errors.`
        : `At ${formatNumber(state.pace, 2)} minutes per mark, a ${formatNumber(state.marks, 0)}-mark question receives ${formatNumber(timeBudget, 2)} minutes.`,
      activeMode === "priority"
        ? `${ranked[0].label} 以 ${formatNumber(ranked[0].priority, 1)} 排第一；模型同時考慮掌握差距與近期錯誤。`
        : `按每分 ${formatNumber(state.pace, 2)} 分鐘，${formatNumber(state.marks, 0)} 分題應分配 ${formatNumber(timeBudget, 2)} 分鐘。`,
      activeMode === "priority"
        ? `${ranked[0].label} 以 ${formatNumber(ranked[0].priority, 1)} 排第一；模型同时考虑掌握差距与近期错误。`
        : `按每分 ${formatNumber(state.pace, 2)} 分钟，${formatNumber(state.marks, 0)} 分题应分配 ${formatNumber(timeBudget, 2)} 分钟。`
    )),
    surface: (
      <Surface name="revision-priority" label={t(enZh("Evidence-based revision priority and timing model", "以證據為本的溫習優先與時間模型"))} theme={theme}>
        {activeMode === "priority" ? (
          <g data-viz-mark data-viz-name="revision-priority-bars" data-viz-ranking={ranked.map((topic) => topic.id).join(",")} data-viz-top-topic={ranked[0].id} data-viz-top-priority={formatNumber(ranked[0].priority, 4)} data-viz-mastery-gap-total={masteryGapTotal} data-viz-recent-errors-total={recentErrorsTotal} data-viz-priority-total={formatNumber(priorityTotal, 4)}>
            {topics.map((topic, index) => (
              <g key={topic.id}>
                <rect data-viz-name="revision-gap-bars" data-viz-topic={topic.id} data-viz-mastery={topic.mastery} x="92" y={82 + index * 92} width={(100 - topic.mastery) * 3.8} height="28" rx="9" fill={topic.color} opacity="0.42" />
                <rect data-viz-name="revision-priority-score" data-viz-topic={topic.id} data-viz-priority={formatNumber(topic.priority, 4)} x="92" y={116 + index * 92} width={topic.priority * 4.2} height="34" rx="10" fill={topic.color} opacity="0.88" />
                <g data-viz-name="revision-error-markers" data-viz-topic={topic.id} data-viz-errors={topic.errors}>
                  {Array.from({ length: topic.errors }, (_, errorIndex) => <circle key={errorIndex} cx={500 + errorIndex * 18} cy={98 + index * 92} r="6" fill={ROSE} />)}
                </g>
              </g>
            ))}
          </g>
        ) : (
          <g data-viz-mark data-viz-name="revision-time-budget" data-viz-marks={state.marks} data-viz-pace={state.pace} data-viz-minutes={formatNumber(timeBudget, 4)}>
            <rect x="82" y="156" width="476" height="84" rx="24" fill={theme.emptyFill} stroke={theme.axis} strokeWidth="4" />
            <rect x="82" y="156" width={clamp(timeBudget / 36, 0, 1) * 476} height="84" rx="24" fill={GREEN} opacity="0.82" />
            {Array.from({ length: Math.round(state.marks) }, (_, index) => <line key={index} x1={82 + ((index + 1) / state.marks) * (clamp(timeBudget / 36, 0, 1) * 476)} x2={82 + ((index + 1) / state.marks) * (clamp(timeBudget / 36, 0, 1) * 476)} y1="156" y2="240" stroke={theme.pointStroke} strokeWidth="2" opacity="0.42" />)}
            <path d="M 82 286 H 558" stroke={theme.axisStrong} strokeWidth="5" strokeLinecap="round" />
            <circle cx={82 + clamp(timeBudget / 36, 0, 1) * 476} cy="286" r="13" fill={AMBER} stroke={theme.pointStroke} strokeWidth="3" />
          </g>
        )}
      </Surface>
    ),
    details: activeMode === "priority" ? (
      <div className="grid gap-2 sm:grid-cols-3">
        {ranked.map((topic, index) => <MetricCard key={topic.id} label={`${index + 1}. ${topic.label}`} value={formatNumber(topic.priority, 1)} color={topic.color} />)}
      </div>
    ) : undefined
  };
}

function renderMixedProblem(state: NumericState, activeMode: string, theme: VisualizationTheme, t: Translator, setState: NumericStateSetter): ModelRender {
  const distance = state.rate * state.time;
  const reverseRate = distance / state.time;
  const graphLeft = 278;
  const graphRight = 494;
  const graphTop = 104;
  const graphBottom = 244;
  const graphPoint = {
    x: graphLeft + (state.time / 8) * (graphRight - graphLeft),
    y: graphBottom - (distance / 240) * (graphBottom - graphTop)
  };
  const diagramDistanceScaleMax = 240;
  const diagramDistanceScaleWidth = 204;
  const diagramTravelWidth = (distance / diagramDistanceScaleMax) * diagramDistanceScaleWidth;
  const stages = ["strategy", "model", "check"];
  const activeIndex = stages.indexOf(activeMode);
  const representations = [
    { id: 0, key: "diagram", label: enZh("Diagram", "圖", "图") },
    { id: 1, key: "table", label: enZh("Table", "表", "表") },
    { id: 2, key: "equation", label: enZh("Equation", "方程", "方程") },
    { id: 3, key: "graph", label: enZh("Graph", "圖像", "图像") }
  ];
  const representation = representations[Math.round(state.representation)] ?? representations[0];
  return {
    formula: activeMode === "strategy"
      ? mathematicalFormula(`R_${representation.id + 1}; v=${formatNumber(state.rate, 2)} km/h, t=${formatNumber(state.time, 2)} h, d=?`)
      : activeMode === "model"
        ? enZh(
          `distance = rate × time = ${formatNumber(state.rate, 2)} × ${formatNumber(state.time, 2)} = ${formatNumber(distance, 2)} km`,
          `距離 = 速率 × 時間 = ${formatNumber(state.rate, 2)} × ${formatNumber(state.time, 2)} = ${formatNumber(distance, 2)} km`,
          `路程 = 速度 × 时间 = ${formatNumber(state.rate, 2)} × ${formatNumber(state.time, 2)} = ${formatNumber(distance, 2)} km`
        )
        : enZh(
          `check: distance/time = ${formatNumber(distance, 2)}/${formatNumber(state.time, 2)} = ${formatNumber(reverseRate, 2)} km/h`,
          `檢查：距離/時間 = ${formatNumber(distance, 2)}/${formatNumber(state.time, 2)} = ${formatNumber(reverseRate, 2)} km/h`,
          `检查：路程/时间 = ${formatNumber(distance, 2)}/${formatNumber(state.time, 2)} = ${formatNumber(reverseRate, 2)} km/h`
        ),
    summary: t(enZh(
      `${t(representation.label)} represents the same rate-time facts; the model gives ${formatNumber(distance, 2)} km, and the inverse check returns ${formatNumber(reverseRate, 2)} km/h with matching units.`,
      `${t(representation.label)}表示同一組速率與時間資料；模型得到 ${formatNumber(distance, 2)} km，逆向檢查回復 ${formatNumber(reverseRate, 2)} km/h，單位一致。`,
      `${t(representation.label)}表示同一组速率与时间资料；模型得到 ${formatNumber(distance, 2)} km，逆向检查回复 ${formatNumber(reverseRate, 2)} km/h，单位一致。`
    )),
    surface: (
      <Surface name="mixed-problem-workflow" label={t(enZh("Strategy model and check workflow", "策略、模型與檢查流程"))} theme={theme}>
        <defs>
          <marker id="hk-mixed-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M 0 0 L 12 6 L 0 12 Z" fill={AMBER} /></marker>
        </defs>
        <g data-viz-mark data-viz-name="mixed-known-facts" data-viz-rate={state.rate} data-viz-rate-unit="km/h" data-viz-time={state.time} data-viz-time-unit="h" />
        <g>
          <rect x="42" y="70" width="164" height="72" rx="20" fill={theme.softFill} stroke={BLUE} strokeWidth="5" />
          <text data-viz-label data-viz-name="mixed-known-rate-label" x="124" y="100" textAnchor="middle" fill={theme.text} className="text-sm font-black">
            <tspan x="124" dy="0">{t(enZh("Known rate", "已知速率", "已知速度"))}</tspan>
            <tspan x="124" dy="24">v = {formatNumber(state.rate, 2)} km/h</tspan>
          </text>
        </g>
        <g>
          <rect x="42" y="172" width="164" height="72" rx="20" fill={theme.softFill} stroke={PURPLE} strokeWidth="5" />
          <text data-viz-label data-viz-name="mixed-known-time-label" x="124" y="202" textAnchor="middle" fill={theme.text} className="text-sm font-black">
            <tspan x="124" dy="0">{t(enZh("Known time", "已知時間", "已知时间"))}</tspan>
            <tspan x="124" dy="24">t = {formatNumber(state.time, 2)} h</tspan>
          </text>
        </g>
        <path data-viz-mark data-viz-name="mixed-flow-arrow" d="M 214 156 H 248" stroke={AMBER} strokeWidth="8" strokeLinecap="round" markerEnd="url(#hk-mixed-arrow)" />
        <g data-viz-mark data-viz-name="mixed-model" data-viz-representation={representation.key} data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)} data-viz-distance-unit="km" />
        <g data-viz-representation-stage={activeIndex >= 1 ? "model-ready" : "strategy-selected"}>
          {representation.key === "diagram" ? (
            <g data-viz-name="mixed-representation-diagram" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)}>
              <rect x="258" y="96" width="246" height="160" rx="24" fill={theme.softFill} stroke={activeIndex === 1 ? AMBER : GREEN} strokeWidth={activeIndex === 1 ? 7 : 4} />
              <line data-viz-mark data-viz-name="mixed-diagram-distance-scale" data-viz-scale-max={diagramDistanceScaleMax} data-viz-scale-unit="km" x1="278" x2={278 + diagramDistanceScaleWidth} y1="178" y2="178" stroke={theme.axis} strokeWidth="4" strokeLinecap="round" />
              <line data-viz-mark data-viz-name="mixed-diagram-distance" data-viz-distance={formatNumber(distance, 5)} x1="278" x2={278 + diagramTravelWidth} y1="178" y2="178" stroke={GREEN} strokeWidth="10" strokeLinecap="round" />
              <circle cx="278" cy="178" r="10" fill={BLUE} stroke={theme.pointStroke} strokeWidth="3" />
              <circle data-viz-mark data-viz-name="mixed-diagram-distance-end" data-viz-distance={formatNumber(distance, 5)} cx={278 + diagramTravelWidth} cy="178" r="8" fill={GREEN} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-label x="381" y="126" textAnchor="middle" fill={theme.text} className="text-sm font-black">v = {formatNumber(state.rate, 2)} km/h</text>
              <text data-viz-label x="381" y="153" textAnchor="middle" fill={theme.text} className="text-sm font-black">t = {formatNumber(state.time, 2)} h</text>
              <text data-viz-label x="278" y="202" textAnchor="middle" fill={theme.tickText} className="text-[11px] font-black">0</text>
              <text data-viz-label x={278 + diagramDistanceScaleWidth} y="202" textAnchor="middle" fill={theme.tickText} className="text-[11px] font-black">240 km</text>
              <text data-viz-label x="381" y="226" textAnchor="middle" fill={theme.text} className="text-sm font-black">d = {formatNumber(distance, 2)} km</text>
              <text data-viz-label data-viz-name="mixed-diagram-scale-label" x="381" y="246" textAnchor="middle" fill={theme.tickText} className="text-[10px] font-bold">{t(enZh("Shared 0–240 km scale", "共用 0–240 km 尺度", "共用 0–240 km 尺度"))}</text>
            </g>
          ) : representation.key === "table" ? (
            <g data-viz-name="mixed-representation-table" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)}>
              <rect x="258" y="104" width="246" height="144" rx="16" fill={theme.softFill} stroke={activeIndex === 1 ? AMBER : GREEN} strokeWidth="5" />
              {[1, 2].map((index) => <line key={`v-${index}`} x1={258 + index * 82} x2={258 + index * 82} y1="104" y2="248" stroke={theme.axis} strokeWidth="3" />)}
              <line x1="258" x2="504" y1="166" y2="166" stroke={theme.axis} strokeWidth="3" />
              <g data-viz-mark data-viz-name="mixed-table-values" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)} />
              {[t(enZh("Rate", "速率", "速度")), t(enZh("Time", "時間", "时间")), t(enZh("Distance", "距離", "路程"))].map((label, index) => <text key={label} data-viz-label x={299 + index * 82} y="141" textAnchor="middle" fill={theme.text} className="text-xs font-black">{label}</text>)}
              <text data-viz-label x="299" y="207" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(state.rate, 2)}</text>
              <text data-viz-label x="381" y="207" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(state.time, 2)}</text>
              <text data-viz-label x="463" y="207" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(distance, 2)}</text>
              <text data-viz-label x="299" y="231" textAnchor="middle" fill={theme.tickText} className="text-xs font-bold">km/h</text>
              <text data-viz-label x="381" y="231" textAnchor="middle" fill={theme.tickText} className="text-xs font-bold">h</text>
              <text data-viz-label x="463" y="231" textAnchor="middle" fill={theme.tickText} className="text-xs font-bold">km</text>
            </g>
          ) : representation.key === "equation" ? (
            <g data-viz-name="mixed-representation-equation" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)}>
              <rect x="258" y="108" width="246" height="136" rx="22" fill={theme.softFill} stroke={activeIndex === 1 ? AMBER : PURPLE} strokeWidth="5" />
              <g data-viz-mark data-viz-name="mixed-equation-values" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)} data-viz-valid={String(Math.abs(state.rate * state.time - distance) < 1e-9)} />
              <text data-viz-label x="381" y="145" textAnchor="middle" fill={theme.text} className="text-base font-black">d = v × t</text>
              <text data-viz-label x="381" y="176" textAnchor="middle" fill={theme.text} className="text-sm font-black">{formatNumber(state.rate, 2)} km/h × {formatNumber(state.time, 2)} h</text>
              <text data-viz-label x="381" y="205" textAnchor="middle" fill={theme.text} className="text-sm font-black">= {formatNumber(distance, 2)} km</text>
              <text data-viz-label x="381" y="232" textAnchor="middle" fill={theme.text} className="text-xs font-black">✓ {t(enZh("units match", "單位相符", "单位相符"))}</text>
            </g>
          ) : (
            <g data-viz-name="mixed-representation-graph" data-viz-rate={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)}>
              <rect x="258" y="88" width="246" height="180" rx="18" fill={theme.softFill} stroke={activeIndex === 1 ? AMBER : GREEN} strokeWidth="4" />
              <path data-viz-mark data-viz-name="mixed-graph-axes" d={`M ${graphLeft} ${graphTop} V ${graphBottom} H ${graphRight}`} fill="none" stroke={theme.axisStrong} strokeWidth="5" strokeLinecap="round" />
              <line data-viz-mark data-viz-name="mixed-graph-rate-line" data-viz-gradient={state.rate} data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)} x1={graphLeft} y1={graphBottom} x2={graphPoint.x} y2={graphPoint.y} stroke={GREEN} strokeWidth="7" strokeLinecap="round" />
              <line x1={graphPoint.x} x2={graphPoint.x} y1={graphPoint.y} y2={graphBottom} stroke={PURPLE} strokeWidth="2.5" strokeDasharray="6 6" />
              <line x1={graphLeft} x2={graphPoint.x} y1={graphPoint.y} y2={graphPoint.y} stroke={BLUE} strokeWidth="2.5" strokeDasharray="6 6" />
              <circle data-viz-mark data-viz-name="mixed-graph-target-point" data-viz-time={state.time} data-viz-distance={formatNumber(distance, 5)} cx={graphPoint.x} cy={graphPoint.y} r="10" fill={ROSE} stroke={theme.pointStroke} strokeWidth="3" />
              <text data-viz-label x="496" y="262" textAnchor="end" fill={theme.text} className="text-xs font-black">t (h)</text>
              <text data-viz-label x="271" y="103" textAnchor="end" fill={theme.text} className="text-xs font-black">d (km)</text>
              <text data-viz-label x="381" y="282" textAnchor="middle" fill={theme.text} className="text-xs font-black">({formatNumber(state.time, 2)} h, {formatNumber(distance, 2)} km) · v={formatNumber(state.rate, 2)} km/h</text>
            </g>
          )}
        </g>
        <path data-viz-mark data-viz-name="mixed-flow-arrow" d="M 516 164 H 532" stroke={AMBER} strokeWidth="7" strokeLinecap="round" markerEnd="url(#hk-mixed-arrow)" />
        <g data-viz-mark data-viz-name="mixed-check" data-viz-reverse-rate={formatNumber(reverseRate, 5)} data-viz-valid={String(Math.abs(reverseRate - state.rate) < 1e-9)} />
        <g>
          <circle cx="574" cy="164" r="36" fill={activeIndex >= 2 ? GREEN : theme.emptyFill} stroke={activeIndex === 2 ? AMBER : theme.axis} strokeWidth={activeIndex === 2 ? 7 : 3} />
          <text data-viz-label x="574" y="153" textAnchor="middle" fill={activeIndex >= 2 ? "#0f172a" : theme.text} className="text-xs font-black">
            <tspan x="574" dy="0">{t(enZh("Check", "檢查", "检查"))}</tspan>
            <tspan x="574" dy="18">{formatNumber(reverseRate, 2)}</tspan>
            <tspan x="574" dy="16">km/h</tspan>
          </text>
        </g>
        <g data-viz-mark data-viz-name="mixed-stage-progress" data-viz-active-stage={activeMode}>
          {stages.map((stage, index) => <circle key={stage} cx={224 + index * 96} cy="316" r={index <= activeIndex ? 16 : 10} fill={index <= activeIndex ? GREEN : theme.emptyFill} stroke={index === activeIndex ? AMBER : theme.axis} strokeWidth={index === activeIndex ? 5 : 2} />)}
          <line x1="240" x2="400" y1="316" y2="316" stroke={theme.axis} strokeWidth="4" />
        </g>
      </Surface>
    ),
    details: (
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label={t(enZh("Known rate", "已知速率"))} value={`${formatNumber(state.rate, 2)} km/h`} color={BLUE} />
        <MetricCard label={t(enZh("Known time", "已知時間"))} value={`${formatNumber(state.time, 2)} h`} color={PURPLE} />
        <MetricCard label={t(enZh("Target distance", "目標距離"))} value={`${formatNumber(distance, 2)} km`} color={GREEN} />
      </div>
    ),
    actions: (
      <div data-viz-mode-group="representation" className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t(enZh("Choose a representation", "選擇表示方式", "选择表示方式"))}>
        {representations.map((item) => {
          const active = representation.id === item.id;
          return <button key={item.key} type="button" data-viz-mode-group="representation" data-viz-representation={item.key} data-viz-active={String(active)} aria-pressed={active} onClick={() => setState((current) => ({ ...current, representation: item.id }))} className={`focus-ring min-h-[44px] rounded-2xl border px-3 py-2 text-sm font-black ${active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75"}`}>{t(item.label)}</button>;
        })}
      </div>
    )
  };
}

function renderDedicatedModel(
  id: HKSecondaryDedicatedLabId,
  state: NumericState,
  activeMode: string,
  theme: VisualizationTheme,
  t: Translator,
  setState: NumericStateSetter
): ModelRender {
  switch (id) {
    case "integers": return renderIntegers(state, activeMode, theme, t);
    case "algebra-basics": return renderAlgebraBasics(state, activeMode, theme, t);
    case "angles": return renderAngles(state, activeMode, theme, t, setState);
    case "ratios": return renderRatios(state, activeMode, theme, t);
    case "linear-equations": return renderLinearEquation(state, activeMode, theme, t);
    case "coordinates": return renderCoordinates(state, activeMode, theme, t);
    case "transformations": return renderTransformations(state, activeMode, theme, t);
    case "probability-s2": return renderProbabilityS2(state, activeMode, theme, t, setState);
    case "polynomials": return renderPolynomials(state, activeMode, theme, t);
    case "quadratic-patterns": return renderQuadraticFunctions(state, activeMode, theme, t);
    case "identities-square-patterns": return renderIdentitiesSquarePatterns(state, activeMode, theme, t);
    case "trigonometry-basics": return renderTrigonometryBasics(state, activeMode, theme, t, setState);
    case "circles": return renderCircleGeometry(state, activeMode, theme, t);
    case "arc-length-sector-area": return renderArcLengthSectorArea(state, activeMode, theme, t);
    case "functions": return renderFunctions(state, activeMode, theme, t);
    case "coordinate-geometry": return renderCoordinateGeometry(state, activeMode, theme, t);
    case "more-algebra": return renderMoreAlgebra(state, activeMode, theme, t);
    case "trigonometry-s5": return renderTrigonometryS5(state, activeMode, theme, t);
    case "probability-s5": return renderProbabilityS5(state, activeMode, theme, t);
    case "statistics-s6": return renderStatisticsS6(state, activeMode, theme, t);
    case "exam-revision": return renderExamRevision(state, activeMode, theme, t);
    case "mixed-problem-solving": return renderMixedProblem(state, activeMode, theme, t, setState);
  }
}

type HKSecondaryVisualizationLabProps = {
  lab: FeaturedLabDefinition;
  controlFooterAction?: ReactNode;
};

function HKSecondaryVisualizationRuntime({
  lab,
  dedicatedId,
  controlFooterAction
}: HKSecondaryVisualizationLabProps & { dedicatedId: HKSecondaryDedicatedLabId }) {
  const { t } = useSettings();
  const theme = useVisualizationTheme();
  const contract = HK_SECONDARY_MODEL_CONTRACTS[dedicatedId];
  const [numericState, setState] = useState<NumericState>(() => initialStateFor(dedicatedId));
  const [activeMode, setActiveMode] = useState(contract.modes[0].id);
  const rendered = useMemo(
    () => renderDedicatedModel(dedicatedId, numericState, activeMode, theme, t, setState),
    [activeMode, dedicatedId, numericState, t, theme]
  );
  const renderedFormula = t(rendered.formula);
  const title = t(lab.title);
  const formulaPanHint = t({
    en: "Focus this formula and scroll horizontally to read any hidden terms.",
    zh: "聚焦此公式並水平捲動，以閱讀任何隱藏項。",
    zhHans: "聚焦此公式并水平滚动，以阅读任何隐藏项。"
  });
  const activeModeDefinition = contract.modes.find((item) => item.id === activeMode) ?? contract.modes[0];
  const mainModeGroup = dedicatedId === "trigonometry-basics"
    ? "ratio"
    : dedicatedId === "mixed-problem-solving"
      ? "workflow"
      : "model";
  const rangeDomain = HK_SECONDARY_RANGE_DOMAIN_METADATA[dedicatedId];
  const state = { ...numericState, activeMode };
  const exactState = contract.parameters.map((item) => `${t(item.label)}=${formatValue(numericState[item.id], item.unit)}`).join("; ");

  function updateParameter(definition: ModelParameter, event: ChangeEvent<HTMLInputElement>) {
    const requestedValue = clamp(Number(event.target.value), definition.min, definition.max);
    setState((current) => {
      if (dedicatedId === "angles") return projectValidTriangleCoordinate(current, definition.id, requestedValue);
      let value = requestedValue;
      if (definition.excludeZero && Math.abs(value) < definition.step) {
        const previousValue = current[definition.id];
        value = value < 0 || (value === 0 && previousValue > 0) ? -definition.step : definition.step;
      }
      const next = { ...current, [definition.id]: value };
      if (dedicatedId === "identities-square-patterns") {
        if (definition.id === "a" && next.b >= next.a) next.b = Math.max(1, next.a - 1);
        if (definition.id === "b" && next.b >= next.a) next.a = Math.min(10, next.b + 1);
      }
      return next;
    });
  }

  function resetModel() {
    setState(initialStateFor(dedicatedId));
    setActiveMode(contract.modes[0].id);
  }

  return (
    <section
      data-hk-viz-model="secondary-dedicated-v1"
      data-hk-viz-topic={lab.labId}
      data-hk-viz-contract={dedicatedId}
      data-hk-viz-state={JSON.stringify(state)}
      data-hk-viz-state-keys={JSON.stringify([...contract.parameters.map((item) => item.id), "activeMode"])}
      data-viz-range-domain-id={rangeDomain?.id}
      className="space-y-5"
    >
      <header className="rounded-3xl border border-slate-200/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.045] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{lab.grade} · {t(enZh("Dedicated HK model", "香港專用模型"))}</p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{title}</h2>
          </div>
          <span className="rounded-full border border-emerald-300/60 bg-emerald-100/70 px-3 py-1.5 text-xs font-black text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-200">
            {t(enZh("Exact lesson model", "精確課堂模型"))}
          </span>
        </div>
        <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-white/68">{t(contract.learningObjective)}</p>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(290px,350px)]">
        <div className="min-w-0 space-y-4">
          <div className={theme.compactSurfaceClassName}>{rendered.surface}</div>

          <div
            data-viz-state-summary
            aria-live="polite"
            aria-atomic="true"
            className="rounded-3xl border border-slate-200/70 bg-white/75 p-4 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-white/75"
          >
            <p className="font-bold text-slate-900 dark:text-white">{rendered.summary}</p>
            <p className="mt-2 break-words text-xs font-semibold text-slate-500 dark:text-white/55">
              {t(enZh("Mode", "模式"))}: {t(activeModeDefinition.label)} · {exactState}
            </p>
          </div>

          {rendered.details}

          {rendered.actions}

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label={t(enZh("Visual color meanings", "視覺顏色含義"))}>
            <MetricCard label={t(enZh("Given / object", "已知／物件"))} value={t(enZh("Blue", "藍色"))} color={BLUE} />
            <MetricCard label={t(enZh("Change / relation", "變化／關係"))} value={t(enZh("Amber", "琥珀色"))} color={AMBER} />
            <MetricCard label={t(enZh("Result / invariant", "結果／不變量"))} value={t(enZh("Green", "綠色"))} color={GREEN} />
            <MetricCard label={t(enZh("Condition / attention", "條件／注意"))} value={t(enZh("Rose", "玫紅色"))} color={ROSE} />
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">{t(enZh("Explore a relation", "探索關係"))}</p>
            <div data-viz-mode-group={mainModeGroup} className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1" role="group" aria-label={t(enZh("Model modes", "模型模式"))}>
              {contract.modes.map((item) => {
                const active = item.id === activeMode;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-viz-mode-button
                    data-viz-mode-group={mainModeGroup}
                    data-viz-mode={item.id}
                    data-viz-active={String(active)}
                    data-viz-mode-active={String(active)}
                    aria-pressed={active}
                    onClick={() => setActiveMode(item.id)}
                    className={`focus-ring min-h-[44px] rounded-2xl border px-4 py-2.5 text-left text-sm font-black transition motion-reduce:transition-none ${active ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-md" : "border-slate-200/80 bg-slate-50 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.1]"}`}
                  >
                    {t(item.label)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {contract.parameters.filter((definition) => definition.control !== "state").map((definition) => {
              const projectionMetadata = rangeDomain?.controls[definition.id];
              return (
                <label key={definition.id} className="block rounded-3xl border border-slate-200/70 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <span className="flex min-w-0 items-start justify-between gap-3 text-sm font-bold text-slate-700 dark:text-white/75">
                    <span className="min-w-0 break-words">{t(definition.label)}</span>
                    <output className="shrink-0 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200">
                      {formatValue(numericState[definition.id], definition.unit)}
                    </output>
                  </span>
                  <input
                    type="range"
                    data-viz-parameter={definition.id}
                    data-viz-range-affects={projectionMetadata?.affects}
                    data-viz-range-projection={projectionMetadata?.projection}
                    data-viz-range-projection-reason={projectionMetadata?.reason}
                    aria-label={`${t(definition.label)} · ${t(lab.title)}`}
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    value={numericState[definition.id]}
                    onChange={(event) => updateParameter(definition, event)}
                    className="focus-ring mt-3 h-11 w-full cursor-pointer accent-cyan-500"
                  />
                </label>
              );
            })}
          </div>

          <div data-viz-formula data-viz-formula-topic={dedicatedId} className="rounded-3xl border border-cyan-200/70 bg-cyan-50/75 p-4 dark:border-cyan-300/15 dark:bg-cyan-300/[0.055]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">{t(enZh("Live formula", "即時公式"))}</p>
            <div
              data-viz-formula-scroll
              tabIndex={0}
              role="region"
              aria-label={`${title}. ${formulaPanHint}`}
              className="focus-ring mt-2 min-w-0 overflow-x-auto overscroll-x-contain rounded-lg"
            >
              <MathText
                as="p"
                text={renderedFormula}
                renderBareMath
                ariaLabel={renderedFormula}
                className="min-w-max break-words py-1 pr-2 text-base font-black text-slate-950 dark:text-white"
              />
            </div>
            <p data-viz-formula-pan-hint className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/55">{formulaPanHint}</p>
            <p className="mt-3 break-words text-xs font-semibold leading-5 text-slate-600 dark:text-white/60">
              {t(enZh("Core invariant", "核心不變量", "核心不变量"))}: {t(contract.coreRelation)}
            </p>
          </div>

          <VisualizationResetButton moduleId="configured-visualization-lab" onReset={resetModel} topicId={lab.labId} />
          {controlFooterAction ? <div className="min-w-0">{controlFooterAction}</div> : null}
        </aside>
      </div>
    </section>
  );
}

/**
 * Returns null outside the exact dedicated HK secondary boundary. The caller
 * can therefore keep the established generic/specialist fallback unchanged.
 */
export function HKSecondaryVisualizationLab({ lab, controlFooterAction }: HKSecondaryVisualizationLabProps) {
  if (!isHKSecondaryDedicatedLabId(lab.labId)) return null;
  return <HKSecondaryVisualizationRuntime key={lab.labId} lab={lab} dedicatedId={lab.labId} controlFooterAction={controlFooterAction} />;
}
