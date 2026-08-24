import { gradeIds, grades } from "./grades";
import { hasSignatureLab } from "./signatureLabAssignments";
import { topics } from "./topics";
import {
  familyForVisualizationLab,
  familyForVisualizationTemplate,
  isPremiumThreeDLaunchLab,
  isStandardThreeDLab,
  regionalPriorityForThreeDLaunchLab
} from "@/components/visualizations/three/threeDSceneMath";
import type { ThreeDVisualizationMetadata } from "@/components/visualizations/three/threeDSceneTypes";
import { visualizationTemplateIdValues } from "@/components/visualizations/visualizationTemplateIds";
import { toPrcSimplifiedText } from "@/lib/i18n";
import type { GradeId, LearningAnalyticsEventSource, LocalizedText, TextbookPublisher, Topic } from "../types";

export type VisualizationLabModuleId = "configured-visualization-lab" | "signature-lab";

export type VisualizationModuleId =
  | "coordinate-plane-demo"
  | "function-graph-explorer"
  | "geometry-explorer"
  | "probability-simulator"
  | "function-model-comparer"
  | "trig-wave-explorer"
  | "calculus-stats-lab"
  | VisualizationLabModuleId;

export type VisualizationTemplateId =
  | "number-line"
  | "base-ten"
  | "array-area"
  | "fraction-bar"
  | "clock-money-data"
  | "measurement-scale"
  | "angle-geometry"
  | "right-triangle-pythagorean"
  | "coordinate-transform"
  | "equation-balance"
  | "function-graph"
  | "function-family"
  | "complex-plane"
  | "trig-unit-wave"
  | "probability-simulation"
  | "statistics-distribution"
  | "calculus-rate-area"
  | "vector-conic-3d/strategy-map";

export type VisualizationCurriculumTrack =
  | "HK"
  | "US"
  | "MAINLAND_PEP_PRIMARY"
  | "MAINLAND_PEP_JUNIOR"
  | "MAINLAND_PEP_HIGH"
  | "MAINLAND_HJB"
  | "MAINLAND_BNU"
  | "CAPSTONE";
export type VisualizationTrackFilter = "all" | VisualizationCurriculumTrack;
export type VisualizationQaProfile = "standard" | "simulation" | "graph-heavy" | "geometry-heavy";

export type VisualizationSafeguardVerdict = "pass" | "concerns" | "fail";
export type VisualizationSafeguardStatus = "reviewed" | "approved" | "revoked";
export type VisualizationSafeguardDimensionRating = "pass" | "minor" | "major";
export type VisualizationSafeguardDimension = {
  label:
    | "Age Appropriateness"
    | "Factual Accuracy"
    | "Potential Misconceptions"
    | "Cultural Sensitivity"
    | "Pedagogical Soundness"
    | "Safety & Harm"
    | "Bias & Fairness"
    | "Inclusivity & Accessibility";
  rating: VisualizationSafeguardDimensionRating;
  findings: LocalizedText;
  recommendation?: LocalizedText;
};
export type VisualizationSafeguardReview = {
  status: VisualizationSafeguardStatus;
  verdict: VisualizationSafeguardVerdict;
  summary: LocalizedText;
  generator: "heuristic" | "human" | "llm";
  reviewedAt: string;
  approvedByName?: string;
  dimensions: VisualizationSafeguardDimension[];
};
export type VisualizationStudentNote = {
  text: LocalizedText;
  authorId: string;
  updatedAt: string;
};
export type VisualizationCaliforniaAlignment = {
  curriculumTrack: "US_CA_MATH";
  sourcePolicy: LocalizedText;
  standardIds: string[];
  domainId: string;
  domainTitle: LocalizedText;
  clusterId?: string;
  capabilitySummary: LocalizedText;
};

export type VisualizationTemplateConfig = {
  variant: string;
  focus: LocalizedText;
  formula?: LocalizedText;
  xLabel?: string;
  yLabel?: string;
  accent?: string;
};

export type FeaturedLabDefinition = {
  labId: string;
  grade: GradeId;
  title: LocalizedText;
  description: LocalizedText;
  category: LocalizedText;
  gradeLabel: LocalizedText;
  topicId: string;
  curriculumTrack: VisualizationCurriculumTrack;
  publisher?: TextbookPublisher;
  californiaAlignment?: VisualizationCaliforniaAlignment;
  primaryForTopic: boolean;
  analyticsSource: LearningAnalyticsEventSource;
  moduleId: VisualizationLabModuleId;
  templateId: VisualizationTemplateId;
  templateConfig: VisualizationTemplateConfig;
  threeD?: ThreeDVisualizationMetadata;
  qaProfile: VisualizationQaProfile;
  safeguard?: VisualizationSafeguardReview;
  studentNote?: VisualizationStudentNote;
};

export type GradeLabGroupDefinition = {
  grade: GradeId;
  name: LocalizedText;
  focus: LocalizedText;
  accent: string;
  labs: FeaturedLabDefinition[];
};

const templateMetadata: Record<
  VisualizationTemplateId,
  {
    category: LocalizedText;
    analyticsSource: LearningAnalyticsEventSource;
    qaProfile: VisualizationQaProfile;
  }
> = {
  "number-line": {
    category: { en: "Number line", zh: "數線", zhHans: "数线" },
    analyticsSource: "coordinate-plane",
    qaProfile: "standard"
  },
  "base-ten": {
    category: { en: "Place value", zh: "位值", zhHans: "数位" },
    analyticsSource: "coordinate-plane",
    qaProfile: "standard"
  },
  "array-area": {
    category: { en: "Arrays and area", zh: "陣列與面積", zhHans: "阵列与面积" },
    analyticsSource: "geometry",
    qaProfile: "geometry-heavy"
  },
  "fraction-bar": {
    category: { en: "Fractions and ratio", zh: "分數與比例", zhHans: "分数与比例" },
    analyticsSource: "geometry",
    qaProfile: "standard"
  },
  "clock-money-data": {
    category: { en: "Time, money, and data", zh: "時間、金錢與數據", zhHans: "时间、金钱与数据" },
    analyticsSource: "probability",
    qaProfile: "simulation"
  },
  "measurement-scale": {
    category: { en: "Measurement", zh: "度量", zhHans: "测量" },
    analyticsSource: "geometry",
    qaProfile: "standard"
  },
  "angle-geometry": {
    category: { en: "Geometry", zh: "幾何", zhHans: "几何" },
    analyticsSource: "geometry",
    qaProfile: "geometry-heavy"
  },
  "right-triangle-pythagorean": {
    category: { en: "Right triangles", zh: "直角三角形", zhHans: "直角三角形" },
    analyticsSource: "geometry",
    qaProfile: "geometry-heavy"
  },
  "coordinate-transform": {
    category: { en: "Coordinates and transformations", zh: "坐標與變換", zhHans: "坐标与变换" },
    analyticsSource: "coordinate-plane",
    qaProfile: "graph-heavy"
  },
  "equation-balance": {
    category: { en: "Algebra balance", zh: "代數天平", zhHans: "代数天平" },
    analyticsSource: "function-model",
    qaProfile: "standard"
  },
  "function-graph": {
    category: { en: "Functions and graphs", zh: "函數與圖像", zhHans: "函数与图象" },
    analyticsSource: "function-graph",
    qaProfile: "graph-heavy"
  },
  "function-family": {
    category: { en: "Function families", zh: "函數族", zhHans: "函数族" },
    analyticsSource: "function-model",
    qaProfile: "graph-heavy"
  },
  "complex-plane": {
    category: { en: "Complex plane", zh: "複平面", zhHans: "复平面" },
    analyticsSource: "coordinate-plane",
    qaProfile: "graph-heavy"
  },
  "trig-unit-wave": {
    category: { en: "Trigonometry", zh: "三角學", zhHans: "三角学" },
    analyticsSource: "trig-wave",
    qaProfile: "graph-heavy"
  },
  "probability-simulation": {
    category: { en: "Probability simulation", zh: "概率模擬", zhHans: "概率模拟" },
    analyticsSource: "probability",
    qaProfile: "simulation"
  },
  "statistics-distribution": {
    category: { en: "Statistics and distributions", zh: "統計與分佈", zhHans: "统计与分布" },
    analyticsSource: "probability",
    qaProfile: "simulation"
  },
  "calculus-rate-area": {
    category: { en: "Calculus and rates", zh: "微積分與變化率", zhHans: "微积分与变化率" },
    analyticsSource: "calculus-stats",
    qaProfile: "graph-heavy"
  },
  "vector-conic-3d/strategy-map": {
    category: { en: "Advanced geometry strategy", zh: "進階幾何策略", zhHans: "进阶几何策略" },
    analyticsSource: "geometry",
    qaProfile: "geometry-heavy"
  }
};

const configuredModuleId: VisualizationLabModuleId = "configured-visualization-lab";
const signatureModuleId: VisualizationLabModuleId = "signature-lab";

const hiddenVisualizationLabIds = new Set<string>();

function isVisibleVisualizationLab(lab: FeaturedLabDefinition) {
  return !hiddenVisualizationLabIds.has(lab.labId);
}

const topicTemplateOverrides: Partial<Record<string, VisualizationTemplateId>> = {
  "p2-length-data": "measurement-scale",
  "p4-decimals": "number-line",
  "p4-angles": "angle-geometry",
  "p6-pre-secondary-problem-solving": "fraction-bar",
  "p6-speed": "array-area",
  "more-algebra": "function-family",
  "bnu-primary-p5-upper-multiples-factors": "array-area",
  "hjb-primary-p5-lower-factors-multiples": "array-area",
  "bnu-primary-p1-lower-observe-objects": "angle-geometry",
  "bnu-primary-p3-upper-observe-objects": "angle-geometry",
  "bnu-primary-p4-lower-observe-objects": "angle-geometry",
  "bnu-high-s4-预备知识": "function-graph",
  "hjb-high-s4-等式与不等式": "function-graph",
  "us-ar-math-g2-gm-3": "measurement-scale",
  "us-ar-math-g2-gm-4": "measurement-scale",
  "us-ar-math-g2-gm-5": "measurement-scale",
  "us-ar-math-g2-gm-6": "measurement-scale",
  "us-ar-math-g08-chapter-02-functions-and-rate-of-change": "function-family",
  "us-fl-math-s2-chapter-02-functions-and-rate-of-change": "function-family",
  "us-ar-math-g10-chapter-01-congruence-and-proof": "right-triangle-pythagorean",
  "us-ca-math-s4-chapter-01": "right-triangle-pythagorean",
  "us-ca-math-s1-chapter-01": "fraction-bar",
  "functions": "function-graph",
  "advanced-functions": "function-family",
  "mixed-problem-solving": "function-family",
  "exam-revision": "statistics-distribution",
  "pep-primary-p6-upper-coordinate-data": "coordinate-transform",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "right-triangle-pythagorean",
  "pep-junior-s2-upper-polynomials-fractions": "equation-balance",
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": "right-triangle-pythagorean",
  "pep-high-s4-quadratic-inequalities": "function-graph",
  "pep-high-s5-conics": "vector-conic-3d/strategy-map",
  "pep-high-s6-analytic-geometry-synthesis": "vector-conic-3d/strategy-map",
  "pep-high-s6-exam-practice": "function-family",
  "pep-primary-p3-lower-area-decimals": "array-area",
  "pep-primary-p5-upper-polygon-area": "array-area",
  "bnu-junior-s1-upper-algebraic-expressions": "equation-balance",
  "bnu-junior-s1-lower-variable-relationships": "function-family",
  "bnu-junior-s1-lower-polynomial-multiply-divide": "equation-balance",
  "bnu-junior-s2-upper-pythagorean-theorem": "right-triangle-pythagorean",
  "bnu-junior-s2-upper-real-numbers": "number-line",
  "bnu-primary-p1-upper-review": "number-line",
  "bnu-primary-p1-lower-math-play-review": "number-line",
  "bnu-primary-p3-upper-decimal-introduction": "number-line",
  "bnu-primary-p3-upper-mixed-operations": "equation-balance",
  "bnu-primary-p3-upper-perimeter": "array-area",
  "bnu-primary-p3-lower-area": "array-area",
  "bnu-primary-p3-upper-math-play-review": "array-area",
  "bnu-primary-p3-lower-math-play-review": "array-area",
  "bnu-primary-p5-upper-polygon-area": "array-area",
  "bnu-primary-p5-lower-fraction-division": "fraction-bar",
  "bnu-primary-p6-upper-ratio": "fraction-bar",
  "bnu-primary-p6-lower-cylinders-cones": "vector-conic-3d/strategy-map",
  "bnu-high-s5-圆锥曲线": "vector-conic-3d/strategy-map",
  "hjb-primary-p1-upper-review": "number-line",
  "hjb-primary-p1-lower-body-rulers-math-square": "measurement-scale",
  "hjb-primary-p1-lower-review": "base-ten",
  "hjb-primary-p2-upper-math-square-review": "array-area",
  "hjb-primary-p2-lower-math-square-review": "array-area",
  "hjb-primary-p3-upper-rectangle-square-geometry": "array-area",
  "hjb-primary-p3-upper-math-square-review": "array-area",
  "hjb-primary-p3-lower-area-measurement": "array-area",
  "hjb-primary-p3-lower-math-square-review": "array-area",
  "hjb-primary-p4-lower-vertical-parallel-lines": "angle-geometry",
  "hjb-primary-p5-upper-plane-figure-area": "array-area",
  "hjb-primary-p6-lower-cylinder-cone": "vector-conic-3d/strategy-map",
  "hjb-junior-s1-upper-polynomial-add-subtract": "equation-balance",
  "hjb-junior-s1-upper-polynomial-multiply-divide": "equation-balance",
  "hjb-junior-s1-upper-factorization": "equation-balance",
  "hjb-junior-s2-upper-right-triangles": "right-triangle-pythagorean",
  "hjb-junior-s2-upper-real-numbers": "number-line",
  "hjb-junior-s2-upper-quadratic-radicals": "number-line",
  "hjb-high-s5-简单几何体": "vector-conic-3d/strategy-map",
  "hjb-high-s5-圆锥曲线": "vector-conic-3d/strategy-map",
  "hjb-high-s6-圆锥曲线综合复习": "vector-conic-3d/strategy-map",
  "hjb-high-s6-三角-向量与解析几何综合": "vector-conic-3d/strategy-map",
  "us-ar-math-g07-chapter-01-proportional-relationships": "fraction-bar",
  "us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry": "coordinate-transform",
  "us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning": "right-triangle-pythagorean",
  "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models": "function-family",
  "us-ar-math-g11-chapter-05-statistical-inference-and-claims": "statistics-distribution",
  "us-ar-math-g12-chapter-01-quantities-units-and-precision": "statistics-distribution",
  "us-ar-math-k-gm-6": "measurement-scale",
  "us-ar-math-k-npv-3": "number-line",
  "us-ar-math-g1-gm-3": "measurement-scale",
  "us-ar-math-g1-gm-4": "measurement-scale",
  "us-ar-math-g1-npv-8": "fraction-bar",
  "us-ar-math-g2-npv-7": "fraction-bar",
  "us-ar-math-g3-gm-6": "array-area",
  "us-ar-math-g3-gm-7": "array-area",
  "us-ar-math-g4-gm-3": "angle-geometry",
  "us-ar-math-g5-car-13": "equation-balance",
  "us-ar-math-g5-npv-2": "base-ten",
  "us-ar-math-g4-gm-7": "array-area",
  "us-ar-math-g4-da-2": "statistics-distribution",
  "us-ar-math-g5-da-2": "statistics-distribution",
  "us-ar-math-g12-chapter-03-decision-statistics": "statistics-distribution",
  "us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry": "coordinate-transform",
  "us-fl-math-s1-chapter-01-proportional-relationships": "fraction-bar",
  "us-ca-math-k-k-cc-count-sequence": "number-line",
  "us-ca-math-k-k-cc-cardinality-compare": "number-line",
  "us-ca-math-k-k-oa-compose-decompose": "number-line",
  "us-ca-math-k-k-nbt-teen-numbers": "base-ten",
  "us-ca-math-k-k-md-attributes-data": "measurement-scale",
  "us-ca-math-k-k-g-shapes-position": "angle-geometry",
  "us-ca-math-p1-1-md-measure-data": "measurement-scale",
  "us-ca-math-p1-1-h3-cube-train-join-models-to-10": "number-line",
  "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10": "number-line",
  "us-ca-math-p2-2-g-partition-shapes": "fraction-bar",
  "us-ca-math-p3-3-oa-mult-div": "array-area",
  "us-ca-math-p3-3-md-time-data-area-perimeter": "measurement-scale",
  "us-ca-math-p3-3-g-categories": "angle-geometry",
  "us-ca-math-p4-4-oa-factors-patterns": "array-area",
  "us-ca-math-p4-4-md-conversion-angles": "measurement-scale",
  "us-ca-math-p5-5-oa-expressions-patterns": "equation-balance",
  "us-ca-math-p5-5-md-volume-data": "array-area",
  "us-ca-math-s4-chapter-02": "right-triangle-pythagorean",
  "us-ca-math-s2-chapter-02": "function-family",
  "us-ca-math-s5-chapter-02": "function-family",
  "us-ca-math-s5-chapter-05": "statistics-distribution",
  "us-ca-math-s2-chapter-04": "coordinate-transform",
  "us-ca-math-s6-chapter-01": "statistics-distribution",
  "us-ca-math-s6-chapter-03": "statistics-distribution",
  "us-ca-math-s6-chapter-05": "statistics-distribution",
};

const topicFormulaOverrides: Partial<Record<string, LocalizedText>> = {
  "p1-counting-number-bonds": {
    en: "known part + missing part = total",
    zh: "已知部分 + 未知部分 = 總數",
    zhHans: "已知部分 + 未知部分 = 总数"
  },
  "p1-shapes-patterns": {
    en: "shape pattern -> next shape",
    zh: "圖形規律 -> 下一個圖形",
    zhHans: "图形规律 -> 下一个图形"
  },
  "p2-length-data": {
    en: "cm measure -> bar chart",
    zh: "厘米量度 -> 棒形圖",
    zhHans: "厘米测量 -> 柱形图"
  },
  "p4-decimals": {
    en: "tenths/10 + hundredths/100 = decimal",
    zh: "十分位/10 + 百分位/100 = 小數",
    zhHans: "十分位/10 + 百分位/100 = 小数"
  },
  "p4-angles": {
    en: "angle size in degrees",
    zh: "角的大小（度）",
    zhHans: "角的大小（度）"
  },
  "circles": {
    en: "chord/tangent/arc -> angle relation",
    zh: "弦/切線/弧 -> 角關係",
    zhHans: "弦/切线/弧 -> 角关系"
  },
  "functions": {
    en: "input -> output -> graph",
    zh: "輸入 -> 輸出 -> 圖像",
    zhHans: "输入 -> 输出 -> 图象"
  },
  "advanced-functions": {
    en: "model family -> graph behavior",
    zh: "模型族 -> 圖像特徵",
    zhHans: "模型族 -> 图象特征"
  },
  "p4-perimeter-area": {
    en: "side lengths -> perimeter and area",
    zh: "邊長 -> 周界與面積",
    zhHans: "边长 -> 周长与面积"
  },
  "p5-volume": {
    en: "unit cubes = volume",
    zh: "單位正方體 = 體積",
    zhHans: "单位正方体 = 体积"
  },
  "p6-pre-secondary-problem-solving": {
    en: "diagram -> table -> check",
    zh: "圖像 -> 表格 -> 檢查",
    zhHans: "图象 -> 表格 -> 检查"
  },
  "p6-speed": {
    en: "distance = speed x time",
    zh: "距離 = 速率 x 時間",
    zhHans: "距离 = 速率 x 时间"
  },
  "mixed-problem-solving": {
    en: "strategy -> model -> check",
    zh: "策略 -> 模型 -> 檢查",
    zhHans: "策略 -> 模型 -> 检查"
  },
  "exam-revision": {
    en: "skill gap + timing -> revision priority",
    zh: "能力差距 + 時間 -> 溫習優先次序",
    zhHans: "能力差距 + 时间 -> 复习优先顺序"
  },
  "pep-high-s6-exam-practice": {
    en: "strategy -> model -> check",
    zh: "策略 -> 模型 -> 檢查",
    zhHans: "策略 -> 模型 -> 检查"
  },
  "pep-primary-p3-lower-area-decimals": {
    en: "area units + decimal measure",
    zh: "面積單位 + 小數度量",
    zhHans: "面积单位 + 小数测量"
  },
  "pep-primary-p4-lower-perimeter-area-lines": {
    en: "perimeter + area + line relation",
    zh: "周界 + 面積 + 直線關係",
    zhHans: "周长 + 面积 + 直线关系"
  },
  "pep-primary-p2-upper-length-angles-observation": {
    en: "length unit + angle type -> observation",
    zh: "長度單位 + 角類型 -> 觀察",
    zhHans: "长度单位 + 角类型 -> 观察"
  },
  "pep-primary-p5-upper-polygon-area": {
    en: "base x height -> polygon area",
    zh: "底 x 高 -> 多邊形面積",
    zhHans: "底 x 高 -> 多边形面积"
  },
  "pep-junior-s1-upper-geometric-figures": {
    en: "point + line + plane -> solid view",
    zh: "點 + 線 + 面 -> 立體觀察",
    zhHans: "点 + 线 + 面 -> 立体观察"
  },
  "pep-junior-s1-lower-lines-coordinates": {
    en: "line angle + coordinate -> relation",
    zh: "線角 + 坐標 -> 關係",
    zhHans: "线角 + 坐标 -> 关系"
  },
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": {
    en: "a^2 + b^2 = c^2 -> right-triangle check",
    zh: "a^2 + b^2 = c^2 -> 直角三角形檢查",
    zhHans: "a^2 + b^2 = c^2 -> 直角三角形检查"
  },
  "pep-junior-s3-lower-inverse-similarity-trigonometry": {
    en: "front view + top view + side view -> spatial model",
    zh: "正視圖 + 俯視圖 + 左視圖 -> 空間模型",
    zhHans: "正视图 + 俯视图 + 左视图 -> 空间模型"
  },
  "bnu-primary-p1-upper-review": {
    en: "number + operation -> check",
    zh: "數與運算 -> 檢查",
    zhHans: "数与运算 -> 检查"
  },
  "bnu-primary-p1-lower-plane-shapes": {
    en: "sides + corners -> shape",
    zh: "邊 + 角 -> 圖形",
    zhHans: "边 + 角 -> 图形"
  },
  "bnu-junior-s1-lower-variable-relationships": {
    en: "table -> graph -> formula",
    zh: "表格 -> 圖像 -> 公式",
    zhHans: "表格 -> 图象 -> 公式"
  },
  "bnu-primary-p1-lower-math-play-review": {
    en: "number + pattern -> check",
    zh: "數與規律 -> 檢查",
    zhHans: "数与规律 -> 检查"
  },
  "bnu-junior-s1-upper-algebraic-expressions": {
    en: "like terms -> simplified expression",
    zh: "同類項 -> 化簡代數式",
    zhHans: "同类项 -> 化简代数式"
  },
  "bnu-junior-s1-lower-axis-symmetry": {
    en: "mirror line -> equal distance",
    zh: "對稱軸 -> 等距",
    zhHans: "对称轴 -> 等距"
  },
  "bnu-junior-s2-upper-pythagorean-theorem": {
    en: "a^2 + b^2 = c^2",
    zh: "a^2 + b^2 = c^2",
    zhHans: "a^2 + b^2 = c^2"
  },
  "bnu-primary-p3-upper-decimal-introduction": {
    en: "tenths/10 + hundredths/100 = decimal",
    zh: "十分位/10 + 百分位/100 = 小數",
    zhHans: "十分位/10 + 百分位/100 = 小数"
  },
  "bnu-primary-p2-lower-plane-shapes": {
    en: "sides + corners -> shape",
    zh: "邊 + 角 -> 圖形",
    zhHans: "边 + 角 -> 图形"
  },
  "bnu-primary-p3-upper-mixed-operations": {
    en: "operation order -> result",
    zh: "運算順序 -> 結果",
    zhHans: "运算顺序 -> 结果"
  },
  "bnu-primary-p3-upper-perimeter": {
    en: "sum of side lengths = perimeter",
    zh: "邊長總和 = 周界",
    zhHans: "边长总和 = 周长"
  },
  "bnu-primary-p3-lower-area": {
    en: "unit squares = area",
    zh: "單位正方形 = 面積",
    zhHans: "单位正方形 = 面积"
  },
  "bnu-primary-p3-upper-math-play-review": {
    en: "operation + geometry -> check",
    zh: "運算 + 幾何 -> 檢查",
    zhHans: "运算 + 几何 -> 检查"
  },
  "bnu-primary-p3-lower-math-play-review": {
    en: "array + measure -> check",
    zh: "陣列 + 度量 -> 檢查",
    zhHans: "阵列 + 测量 -> 检查"
  },
  "bnu-primary-p4-lower-decimal-multiplication": {
    en: "decimal factor x decimal factor = product",
    zh: "小數因數 x 小數因數 = 積",
    zhHans: "小数因数 x 小数因数 = 积"
  },
  "hjb-primary-p1-upper-review": {
    en: "number + operation -> check",
    zh: "數與運算 -> 檢查",
    zhHans: "数与运算 -> 检查"
  },
  "hjb-primary-p1-lower-body-rulers-math-square": {
    en: "body benchmark -> estimate -> measure",
    zh: "身體基準 -> 估計 -> 量度",
    zhHans: "身体基准 -> 估计 -> 测量"
  },
  "hjb-primary-p2-upper-math-square-review": {
    en: "array model -> multiplication check",
    zh: "陣列模型 -> 乘法檢查",
    zhHans: "阵列模型 -> 乘法检查"
  },
  "hjb-primary-p2-lower-math-square-review": {
    en: "array model -> division check",
    zh: "陣列模型 -> 除法檢查",
    zhHans: "阵列模型 -> 除法检查"
  },
  "hjb-primary-p3-upper-rectangle-square-geometry": {
    en: "rectangle sides -> perimeter",
    zh: "長方形邊長 -> 周界",
    zhHans: "长方形边长 -> 周长"
  },
  "hjb-primary-p3-upper-math-square-review": {
    en: "array model -> perimeter and area check",
    zh: "陣列模型 -> 周界與面積檢查",
    zhHans: "阵列模型 -> 周长与面积检查"
  },
  "hjb-primary-p3-lower-area-measurement": {
    en: "unit squares + boundary = area and perimeter",
    zh: "單位正方形 + 邊界 = 面積與周界",
    zhHans: "单位正方形 + 边界 = 面积与周长"
  },
  "hjb-primary-p4-upper-geometry-circle-lines-angles": {
    en: "circle + line + angle -> relation",
    zh: "圓 + 線 + 角 -> 關係",
    zhHans: "圆 + 线 + 角 -> 关系"
  },
  "hjb-junior-s3-lower-circle-regular-polygons": {
    en: "central angle = 360 / n",
    zh: "圓心角 = 360 / n",
    zhHans: "圆心角 = 360 / n"
  },
  "hjb-junior-s2-upper-right-triangles": {
    en: "a^2 + b^2 = c^2",
    zh: "a^2 + b^2 = c^2",
    zhHans: "a^2 + b^2 = c^2"
  },
  "hjb-high-s6-三角-向量与解析几何综合": {
    en: "vector + analytic geometry -> synthesis",
    zh: "向量 + 解析幾何 -> 綜合",
    zhHans: "向量 + 解析几何 -> 综合"
  },
  "us-ar-math-g07-chapter-01-proportional-relationships": {
    en: "constant ratio",
    zh: "固定比例",
    zhHans: "固定比例"
  },
  "us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry": {
    en: "distance^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zh: "距離^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zhHans: "距离^2 = (x2 - x1)^2 + (y2 - y1)^2"
  },
  "us-ar-math-g3-gm-6": {
    en: "length x width = rectangle area",
    zh: "長 x 闊 = 長方形面積",
    zhHans: "长 x 宽 = 长方形面积"
  },
  "us-ar-math-g3-gm-7": {
    en: "length x width = rectangle area",
    zh: "長 x 闊 = 長方形面積",
    zhHans: "长 x 宽 = 长方形面积"
  },
  "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models": {
    en: "exponential <-> logarithmic model",
    zh: "指數模型 <-> 對數模型",
    zhHans: "指数模型 <-> 对数模型"
  },
  "us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning": {
    en: "similarity ratio -> right-triangle measure",
    zh: "相似比例 -> 直角三角形量度",
    zhHans: "相似比例 -> 直角三角形测量"
  },
  "us-ar-math-g11-chapter-05-statistical-inference-and-claims": {
    en: "sample -> inference -> claim",
    zh: "樣本 -> 推斷 -> 結論",
    zhHans: "样本 -> 推断 -> 结论"
  },
  "us-ar-math-g12-chapter-01-quantities-units-and-precision": {
    en: "measurement = mean +/- uncertainty",
    zh: "測量值 = 平均 +/- 不確定度",
    zhHans: "测量值 = 平均 +/- 不确定度"
  },
  "us-ar-math-k-npv-1": {
    en: "next number = current number + 1",
    zh: "下一個數 = 目前數 + 1",
    zhHans: "下一个数 = 当前数 + 1"
  },
  "us-ar-math-k-npv-3": {
    en: "ordinal position -> order",
    zh: "序數位置 -> 次序",
    zhHans: "序数位置 -> 次序"
  },
  "us-ar-math-g1-npv-8": {
    en: "equal shares = one whole",
    zh: "等份 = 一個整體",
    zhHans: "等份 = 一个整体"
  },
  "us-ar-math-g2-npv-7": {
    en: "same whole -> equal parts",
    zh: "同一整體 -> 等分部分",
    zhHans: "同一整体 -> 等分部分"
  },
  "us-ar-math-g2-gm-7": {
    en: "sum of side lengths = perimeter",
    zh: "邊長總和 = 周界",
    zhHans: "边长总和 = 周长"
  },
  "us-ar-math-g4-gm-7": {
    en: "rectangle area and perimeter",
    zh: "長方形面積與周界",
    zhHans: "长方形面积与周长"
  },
  "us-ar-math-g5-npv-2": {
    en: "10 x place value = next place",
    zh: "10 x 位值 = 下一位",
    zhHans: "10 x 数位 = 下一位"
  },
  "us-ar-math-g5-car-9": {
    en: "fraction x fraction = product",
    zh: "分數 x 分數 = 積",
    zhHans: "分数 x 分数 = 积"
  },
  "us-ar-math-g5-gm-2": {
    en: "fractional length x width = area",
    zh: "分數邊長 x 寬 = 面積",
    zhHans: "分数边长 x 宽 = 面积"
  },
  "us-ar-math-g5-npv-6": {
    en: "fraction factor x whole = product size",
    zh: "分數因數 x 整體 = 積的大小",
    zhHans: "分数因数 x 整体 = 积的大小"
  },
  "us-fl-math-s1-chapter-01-proportional-relationships": {
    en: "constant ratio",
    zh: "固定比例",
    zhHans: "固定比例"
  },
  "us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry": {
    en: "distance^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zh: "距離^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zhHans: "距离^2 = (x2 - x1)^2 + (y2 - y1)^2"
  },
  "us-ca-math-k-k-cc-count-sequence": {
    en: "count 1, 2, 3 -> next number",
    zh: "數 1、2、3 -> 下一個數",
    zhHans: "数 1、2、3 -> 下一个数"
  },
  "us-ca-math-k-k-cc-cardinality-compare": {
    en: "count each group -> compare",
    zh: "數每一組 -> 比多少",
    zhHans: "数每一组 -> 比多少"
  },
  "us-ca-math-k-k-oa-compose-decompose": {
    en: "part + part = whole within 10",
    zh: "部分 + 部分 = 10 以內的整體",
    zhHans: "部分 + 部分 = 10 以内的整体"
  },
  "us-ca-math-k-k-nbt-teen-numbers": {
    en: "10 + extra ones = teen number",
    zh: "10 + 多出的個 = 十幾",
    zhHans: "10 + 多出的个 = 十几"
  },
  "us-ca-math-k-k-md-attributes-data": {
    en: "attribute -> sort -> count",
    zh: "屬性 -> 分類 -> 數一數",
    zhHans: "属性 -> 分类 -> 数一数"
  },
  "us-ca-math-k-k-g-shapes-position": {
    en: "shape + position word",
    zh: "圖形 + 位置詞",
    zhHans: "图形 + 位置词"
  },
  "us-ca-math-p1-1-nbt-place-value": {
    en: "tens + ones = number",
    zh: "十位 + 個位 = 數",
    zhHans: "十位 + 个位 = 数"
  },
  "us-ca-math-p1-1-md-measure-data": {
    en: "measure -> sort -> data",
    zh: "量一量 -> 分類 -> 數據",
    zhHans: "量一量 -> 分类 -> 数据"
  },
  "us-ca-math-p1-1-g-shape-reasoning": {
    en: "shape attributes -> compose",
    zh: "圖形特徵 -> 組合",
    zhHans: "图形特征 -> 组合"
  },
  "us-ca-math-p1-1-h1-picture-join-stories-to-10": {
    en: "part + part = whole within 10",
    zh: "部分 + 部分 = 10 以內的整體",
    zhHans: "部分 + 部分 = 10 以内的整体"
  },
  "us-ca-math-p1-1-h2-picture-story-addition-equations": {
    en: "part + part = whole",
    zh: "部分 + 部分 = 整體",
    zhHans: "部分 + 部分 = 整体"
  },
  "us-ca-math-p1-1-h3-cube-train-join-models-to-10": {
    en: "cube train parts -> total",
    zh: "方塊列車的部分 -> 總數",
    zhHans: "方块列车的部分 -> 总数"
  },
  "us-ca-math-p1-1-h4-join-stories-within-10": {
    en: "start + more = total",
    zh: "開始的數 + 多一些 = 總數",
    zhHans: "开始的数 + 多一些 = 总数"
  },
  "us-ca-math-p1-1-h5-model-equation-join-stories-to-10": {
    en: "model -> equation -> total",
    zh: "模型 -> 算式 -> 總數",
    zhHans: "模型 -> 算式 -> 总数"
  },
  "us-ca-math-p1-1-h6-equation-match-join-stories-to-10": {
    en: "story -> matching equation",
    zh: "故事 -> 配對算式",
    zhHans: "故事 -> 配对算式"
  },
  "us-ca-math-p1-1-l1-picture-take-away-stories-to-10": {
    en: "whole - part = left",
    zh: "整體 - 部分 = 剩下",
    zhHans: "整体 - 部分 = 剩下"
  },
  "us-ca-math-p1-1-l2-picture-story-subtraction-equations": {
    en: "whole - part = left",
    zh: "整體 - 部分 = 剩下",
    zhHans: "整体 - 部分 = 剩下"
  },
  "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10": {
    en: "cube train - cubes = left",
    zh: "方塊列車 - 方塊 = 剩下",
    zhHans: "方块列车 - 方块 = 剩下"
  },
  "us-ca-math-p1-1-l4-take-away-stories-within-10": {
    en: "start - change = left",
    zh: "開始的數 - 拿走 = 剩下",
    zhHans: "开始的数 - 拿走 = 剩下"
  },
  "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10": {
    en: "model -> equation -> left",
    zh: "模型 -> 算式 -> 剩下",
    zhHans: "模型 -> 算式 -> 剩下"
  },
  "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10": {
    en: "whole = part + part",
    zh: "整體 = 部分 + 部分",
    zhHans: "整体 = 部分 + 部分"
  },
  "us-ca-math-p2-2-nbt-three-digit-place-value": {
    en: "hundreds + tens + ones = number",
    zh: "百位 + 十位 + 個位 = 數",
    zhHans: "百位 + 十位 + 个位 = 数"
  },
  "us-ca-math-p2-2-g-partition-shapes": {
    en: "equal shares = one whole",
    zh: "等份 = 一個整體",
    zhHans: "等份 = 一个整体"
  },
  "us-ca-math-p3-3-oa-mult-div": {
    en: "rows x groups = total; total / groups = size",
    zh: "行 x 組 = 總數；總數 / 組 = 每組數",
    zhHans: "行 x 组 = 总数；总数 / 组 = 每组数"
  },
  "us-ca-math-p3-3-md-time-data-area-perimeter": {
    en: "measure -> record -> compare",
    zh: "量度 -> 記錄 -> 比較",
    zhHans: "测量 -> 记录 -> 比较"
  },
  "us-ca-math-p3-3-g-categories": {
    en: "shape attributes -> category",
    zh: "圖形特徵 -> 分類",
    zhHans: "图形特征 -> 分类"
  },
  "us-ca-math-p4-4-oa-factors-patterns": {
    en: "factor x factor = multiple",
    zh: "因數 x 因數 = 倍數",
    zhHans: "因数 x 因数 = 倍数"
  },
  "us-ca-math-p4-4-md-conversion-angles": {
    en: "unit measure -> angle measure",
    zh: "單位度量 -> 角度度量",
    zhHans: "单位测量 -> 角度测量"
  },
  "us-ca-math-p5-5-oa-expressions-patterns": {
    en: "pattern -> expression",
    zh: "規律 -> 表達式",
    zhHans: "规律 -> 表达式"
  },
  "us-ca-math-p5-5-md-volume-data": {
    en: "unit cubes -> volume data",
    zh: "單位正方體 -> 體積數據",
    zhHans: "单位正方体 -> 体积数据"
  },
  "us-ca-math-s5-chapter-02": {
    en: "exponential <-> logarithmic model",
    zh: "指數模型 <-> 對數模型",
    zhHans: "指数模型 <-> 对数模型"
  },
  "pep-primary-p5-lower-volume-data": {
    en: "base area x height = volume",
    zh: "底面積 x 高 = 體積",
    zhHans: "底面积 x 高 = 体积"
  },
  "pep-primary-p6-upper-coordinate-data": {
    en: "ordered pair -> position display",
    zh: "有序數對 -> 位置表示",
    zhHans: "有序数对 -> 位置表示"
  },
  "pep-junior-s3-upper-quadratics-circle-probability": {
    en: "quadratic + circle + probability -> model choice",
    zh: "二次 + 圓 + 概率 -> 模型選擇",
    zhHans: "二次 + 圆 + 概率 -> 模型选择"
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    en: "factor -> simplify -> check",
    zh: "分解因式 -> 化簡 -> 檢查",
    zhHans: "分解因式 -> 化简 -> 检查"
  },
  "pep-junior-s2-lower-linear-functions-data": {
    en: "y = kx + b -> data trend",
    zh: "y = kx + b -> 數據趨勢",
    zhHans: "y = kx + b -> 数据趋势"
  },
  "pep-high-s4-function-properties": {
    en: "domain -> range -> behavior",
    zh: "定義域 -> 值域 -> 性質",
    zhHans: "定义域 -> 值域 -> 性质"
  },
  "pep-high-s4-exp-log": {
    en: "a^x <-> log_a(x)",
    zh: "a^x <-> log_a(x)",
    zhHans: "a^x <-> log_a(x)"
  },
  "pep-high-s4-quadratic-inequalities": {
    en: "quadratic graph -> sign intervals",
    zh: "二次圖像 -> 正負區間",
    zhHans: "二次图象 -> 正负区间"
  },
  "pep-high-s5-conics": {
    en: "conic equation -> graph",
    zh: "圓錐曲線方程 -> 圖像",
    zhHans: "圆锥曲线方程 -> 图象"
  },
  "pep-high-s4-plane-vectors": {
    en: "u + v -> resultant vector",
    zh: "u + v -> 合成向量",
    zhHans: "u + v -> 合成向量"
  },
  "pep-high-s4-solid-geometry-intro": {
    en: "line-plane relation -> distance/angle",
    zh: "線面關係 -> 距離/角",
    zhHans: "线面关系 -> 距离/角"
  },
  "pep-high-s5-lines-circles": {
    en: "line equation + circle equation -> constraint",
    zh: "直線方程 + 圓方程 -> 約束",
    zhHans: "直线方程 + 圆方程 -> 约束"
  },
  "pep-high-s5-sequences": {
    en: "a_n -> term and sum",
    zh: "a_n -> 項與和",
    zhHans: "a_n -> 项与和"
  },
  "pep-high-s5-space-vectors": {
    en: "3D vector dot product -> angle/distance",
    zh: "三維向量點積 -> 角/距離",
    zhHans: "三维向量点积 -> 角/距离"
  },
  "pep-high-s6-analytic-geometry-synthesis": {
    en: "line + conic + vector -> condition",
    zh: "直線 + 圓錐曲線 + 向量 -> 條件",
    zhHans: "直线 + 圆锥曲线 + 向量 -> 条件"
  },
  "bnu-primary-p5-lower-cuboid-introduction": {
    en: "net faces -> surface area",
    zh: "展開圖面 -> 表面積",
    zhHans: "展开图面 -> 表面积"
  },
  "bnu-primary-p5-lower-cuboid-volume": {
    en: "base area x height = volume",
    zh: "底面積 x 高 = 體積",
    zhHans: "底面积 x 高 = 体积"
  },
  "bnu-primary-p5-upper-composite-area": {
    en: "area parts -> total area",
    zh: "部分面積 -> 總面積",
    zhHans: "部分面积 -> 总面积"
  },
  "bnu-primary-p5-upper-polygon-area": {
    en: "decompose -> base-height area",
    zh: "分解圖形 -> 底高面積",
    zhHans: "分解图形 -> 底高面积"
  },
  "bnu-primary-p5-lower-fraction-multiplication": {
    en: "fraction x fraction = product",
    zh: "分數 x 分數 = 積",
    zhHans: "分数 x 分数 = 积"
  },
  "bnu-primary-p5-lower-review-activity": {
    en: "fraction + cuboid + data -> review",
    zh: "分數 + 長方體 + 數據 -> 複習",
    zhHans: "分数 + 长方体 + 数据 -> 复习"
  },
  "bnu-junior-s1-lower-polynomial-multiply-divide": {
    en: "polynomial operation -> check",
    zh: "多項式運算 -> 檢查",
    zhHans: "多项式运算 -> 检查"
  },
  "bnu-junior-s2-upper-real-numbers": {
    en: "rational + irrational -> real number line",
    zh: "有理數 + 無理數 -> 實數數線",
    zhHans: "有理数 + 无理数 -> 实数数线"
  },
  "bnu-primary-p5-lower-fraction-division": {
    en: "fraction / fraction = quotient",
    zh: "分數 / 分數 = 商",
    zhHans: "分数 / 分数 = 商"
  },
  "bnu-primary-p6-upper-fraction-mixed-operations": {
    en: "fraction operations -> result",
    zh: "分數運算 -> 結果",
    zhHans: "分数运算 -> 结果"
  },
  "bnu-primary-p6-upper-ratio": {
    en: "a:b = a / b",
    zh: "a:b = a / b",
    zhHans: "a:b = a / b"
  },
  "bnu-primary-p6-lower-cylinders-cones": {
    en: "cylinder volume -> cone volume",
    zh: "圓柱體積 -> 圓錐體積",
    zhHans: "圆柱体积 -> 圆锥体积"
  },
  "bnu-junior-s1-upper-plane-figures": {
    en: "points + lines + angles -> figure",
    zh: "點 + 線 + 角 -> 圖形",
    zhHans: "点 + 线 + 角 -> 图形"
  },
  "bnu-junior-s2-lower-parallelograms": {
    en: "parallel sides -> parallelogram property",
    zh: "平行邊 -> 平行四邊形性質",
    zhHans: "平行边 -> 平行四边形性质"
  },
  "bnu-junior-s2-upper-linear-functions": {
    en: "y = kx + b",
    zh: "y = kx + b",
    zhHans: "y = kx + b"
  },
  "bnu-junior-s2-lower-triangle-proof-applications": {
    en: "triangle facts -> proof",
    zh: "三角形事實 -> 證明",
    zhHans: "三角形事实 -> 证明"
  },
  "bnu-junior-s3-upper-inverse-proportion": {
    en: "xy = k",
    zh: "xy = k",
    zhHans: "xy = k"
  },
  "bnu-junior-s3-upper-similar-figures": {
    en: "corresponding side ratios are equal",
    zh: "對應邊比例相等",
    zhHans: "对应边比例相等"
  },
  "bnu-junior-s3-upper-special-parallelograms": {
    en: "criteria -> rectangle/rhombus/square",
    zh: "判定條件 -> 矩形/菱形/正方形",
    zhHans: "判定条件 -> 矩形/菱形/正方形"
  },
  "bnu-junior-s1-upper-spatial-figures": {
    en: "solid -> view/net",
    zh: "立體 -> 視圖/展開圖",
    zhHans: "立体 -> 视图/展开图"
  },
  "bnu-junior-s3-upper-projection-views": {
    en: "3D object -> front/top/side view",
    zh: "立體物件 -> 正/俯/側視圖",
    zhHans: "立体物件 -> 正/俯/侧视图"
  },
  "bnu-junior-s3-lower-circle": {
    en: "chord/tangent/arc -> angle relation",
    zh: "弦/切線/弧 -> 角關係",
    zhHans: "弦/切线/弧 -> 角关系"
  },
  "bnu-primary-p6-upper-circles": {
    en: "radius -> circumference and area",
    zh: "半徑 -> 周長與面積",
    zhHans: "半径 -> 周长与面积"
  },
  "bnu-primary-p6-upper-review-activity": {
    en: "circle + fraction + data -> review",
    zh: "圓 + 分數 + 數據 -> 複習",
    zhHans: "圆 + 分数 + 数据 -> 复习"
  },
  "bnu-high-s4-函数": {
    en: "domain -> range -> property",
    zh: "定義域 -> 值域 -> 性質",
    zhHans: "定义域 -> 值域 -> 性质"
  },
  "bnu-high-s4-函数应用": {
    en: "function model -> zero/growth",
    zh: "函數模型 -> 零點/增長",
    zhHans: "函数模型 -> 零点/增长"
  },
  "bnu-high-s4-指数运算与指数函数": {
    en: "a^x -> growth/decay",
    zh: "a^x -> 增長/衰減",
    zhHans: "a^x -> 增长/衰减"
  },
  "bnu-high-s4-对数运算与对数函数": {
    en: "log_a(xy) = log_a x + log_a y",
    zh: "log_a(xy) = log_a x + log_a y",
    zhHans: "log_a(xy) = log_a x + log_a y"
  },
  "bnu-high-s5-圆锥曲线": {
    en: "conic equation -> graph",
    zh: "圓錐曲線方程 -> 圖像",
    zhHans: "圆锥曲线方程 -> 图象"
  },
  "bnu-high-s4-平面向量及其应用": {
    en: "vector components -> dot product",
    zh: "向量分量 -> 點積",
    zhHans: "向量分量 -> 点积"
  },
  "bnu-high-s4-立体几何初步": {
    en: "spatial relation -> distance/angle",
    zh: "空間關係 -> 距離/角",
    zhHans: "空间关系 -> 距离/角"
  },
  "bnu-high-s5-空间向量与立体几何": {
    en: "space vector -> line-plane relation",
    zh: "空間向量 -> 線面關係",
    zhHans: "空间向量 -> 线面关系"
  },
  "bnu-high-s5-数学建模活动-三": {
    en: "assumption -> model -> communicate",
    zh: "假設 -> 建模 -> 表達",
    zhHans: "假设 -> 建模 -> 表达"
  },
  "bnu-high-s5-直线与圆": {
    en: "line equation + circle equation -> position",
    zh: "直線方程 + 圓方程 -> 位置關係",
    zhHans: "直线方程 + 圆方程 -> 位置关系"
  },
  "bnu-high-s6-数列": {
    en: "a_n -> recurrence and sum",
    zh: "a_n -> 遞推與求和",
    zhHans: "a_n -> 递推与求和"
  },
  "bnu-high-s6-高三数列与导数综合复习": {
    en: "sequence term + derivative -> synthesis",
    zh: "數列項 + 導數 -> 綜合",
    zhHans: "数列项 + 导数 -> 综合"
  },
  "hjb-primary-p3-lower-math-square-review": {
    en: "array + perimeter + data -> review",
    zh: "陣列 + 周界 + 數據 -> 複習",
    zhHans: "阵列 + 周长 + 数据 -> 复习"
  },
  "hjb-primary-p4-upper-large-numbers-measurement": {
    en: "place value + measurement unit -> compare",
    zh: "位值 + 度量單位 -> 比較",
    zhHans: "数位 + 测量单位 -> 比较"
  },
  "hjb-primary-p4-upper-review-integration": {
    en: "number + circle/angle -> review",
    zh: "數 + 圓/角 -> 複習",
    zhHans: "数 + 圆/角 -> 复习"
  },
  "hjb-primary-p4-lower-vertical-parallel-lines": {
    en: "parallel/perpendicular lines -> relation",
    zh: "平行/垂直線 -> 關係",
    zhHans: "平行/垂直线 -> 关系"
  },
  "hjb-primary-p5-upper-plane-figure-area": {
    en: "decompose -> plane-figure area",
    zh: "分解圖形 -> 平面圖形面積",
    zhHans: "分解图形 -> 平面图形面积"
  },
  "hjb-primary-p5-lower-cuboid-cube": {
    en: "unit cubes -> cuboid volume",
    zh: "單位正方體 -> 長方體體積",
    zhHans: "单位正方体 -> 长方体体积"
  },
  "hjb-primary-p6-lower-cylinder-cone": {
    en: "cylinder volume -> cone volume",
    zh: "圓柱體積 -> 圓錐體積",
    zhHans: "圆柱体积 -> 圆锥体积"
  },
  "hjb-primary-p6-lower-cuboid": {
    en: "length x width x height = volume",
    zh: "長 x 闊 x 高 = 體積",
    zhHans: "长 x 宽 x 高 = 体积"
  },
  "hjb-junior-s1-upper-polynomial-add-subtract": {
    en: "like terms -> simplified expression",
    zh: "同類項 -> 化簡代數式",
    zhHans: "同类项 -> 化简代数式"
  },
  "hjb-junior-s1-upper-polynomial-multiply-divide": {
    en: "polynomial operation -> check",
    zh: "多項式運算 -> 檢查",
    zhHans: "多项式运算 -> 检查"
  },
  "hjb-junior-s1-upper-factorization": {
    en: "expanded form <-> factors",
    zh: "展開式 <-> 因式",
    zhHans: "展开式 <-> 因式"
  },
  "hjb-junior-s2-upper-real-numbers": {
    en: "rational + irrational -> real number line",
    zh: "有理數 + 無理數 -> 實數數線",
    zhHans: "有理数 + 无理数 -> 实数数线"
  },
  "hjb-junior-s2-upper-quadratic-radicals": {
    en: "sqrt(a) -> real-number position",
    zh: "sqrt(a) -> 實數位置",
    zhHans: "sqrt(a) -> 实数位置"
  },
  "hjb-junior-s2-lower-quadrilaterals": {
    en: "properties -> quadrilateral type",
    zh: "性質 -> 四邊形類型",
    zhHans: "性质 -> 四边形类型"
  },
  "hjb-junior-s2-lower-linear-functions": {
    en: "y = kx + b",
    zh: "y = kx + b",
    zhHans: "y = kx + b"
  },
  "hjb-junior-s2-lower-inverse-functions": {
    en: "xy = k",
    zh: "xy = k",
    zhHans: "xy = k"
  },
  "hjb-junior-s3-upper-similar-triangles": {
    en: "corresponding side ratios are equal",
    zh: "對應邊比例相等",
    zhHans: "对应边比例相等"
  },
  "hjb-primary-p6-upper-circle-sector": {
    en: "sector angle / 360 -> arc and area",
    zh: "扇形角/360 -> 弧長與面積",
    zhHans: "扇形角/360 -> 弧长与面积"
  },
  "hjb-primary-p6-lower-circle-sector": {
    en: "sector angle / 360 -> arc and area",
    zh: "扇形角/360 -> 弧長與面積",
    zhHans: "扇形角/360 -> 弧长与面积"
  },
  "hjb-high-s5-简单几何体": {
    en: "surface area + volume -> solid model",
    zh: "表面積 + 體積 -> 立體模型",
    zhHans: "表面积 + 体积 -> 立体模型"
  },
  "hjb-high-s5-圆锥曲线": {
    en: "conic equation -> graph",
    zh: "圓錐曲線方程 -> 圖像",
    zhHans: "圆锥曲线方程 -> 图象"
  },
  "hjb-high-s6-圆锥曲线综合复习": {
    en: "conic equation -> strategy map",
    zh: "圓錐曲線方程 -> 策略圖",
    zhHans: "圆锥曲线方程 -> 策略图"
  },
  "hjb-high-s4-平面向量": {
    en: "vector components -> dot product",
    zh: "向量分量 -> 點積",
    zhHans: "向量分量 -> 点积"
  },
  "hjb-high-s4-函数的概念-性质及应用": {
    en: "domain -> range -> property",
    zh: "定義域 -> 值域 -> 性質",
    zhHans: "定义域 -> 值域 -> 性质"
  },
  "hjb-high-s4-幂函数-指数函数与对数函数": {
    en: "power/exponential/log -> growth",
    zh: "冪/指數/對數 -> 增長",
    zhHans: "幂/指数/对数 -> 增长"
  },
  "hjb-high-s5-平面直角坐标系中的直线": {
    en: "slope + point -> line equation",
    zh: "斜率 + 點 -> 直線方程",
    zhHans: "斜率 + 点 -> 直线方程"
  },
  "hjb-high-s5-空间向量及其应用": {
    en: "space vector -> distance/angle",
    zh: "空間向量 -> 距離/角",
    zhHans: "空间向量 -> 距离/角"
  },
  "hjb-high-s5-空间直线与平面": {
    en: "line-plane relation -> proof and measure",
    zh: "線面關係 -> 證明與度量",
    zhHans: "线面关系 -> 证明与度量"
  },
  "hjb-high-s5-数列": {
    en: "a_n -> recurrence and sum",
    zh: "a_n -> 遞推與求和",
    zhHans: "a_n -> 递推与求和"
  },
  "hjb-high-s6-解析几何直线综合复习": {
    en: "slope + distance -> line strategy",
    zh: "斜率 + 距離 -> 直線策略",
    zhHans: "斜率 + 距离 -> 直线策略"
  },
  "hjb-high-s6-空间向量综合复习": {
    en: "space vector -> review strategy",
    zh: "空間向量 -> 複習策略",
    zhHans: "空间向量 -> 复习策略"
  },
  "hjb-high-s6-立体几何与空间向量综合": {
    en: "solid geometry + vector -> synthesis",
    zh: "立體幾何 + 向量 -> 綜合",
    zhHans: "立体几何 + 向量 -> 综合"
  },
  "hjb-high-s6-数列与计数综合": {
    en: "sequence + counting -> synthesis",
    zh: "數列 + 計數 -> 綜合",
    zhHans: "数列 + 计数 -> 综合"
  },
  "hjb-high-s6-数列综合复习": {
    en: "a_n -> sequence review strategy",
    zh: "a_n -> 數列複習策略",
    zhHans: "a_n -> 数列复习策略"
  },
  "us-ar-math-g3-gm-8": {
    en: "unit cubes -> volume estimate",
    zh: "單位正方體 -> 體積估計",
    zhHans: "单位正方体 -> 体积估计"
  },
  "us-ar-math-g3-gm-9": {
    en: "unit cubes -> volume problem",
    zh: "單位正方體 -> 體積問題",
    zhHans: "单位正方体 -> 体积问题"
  },
  "us-ar-math-g5-gm-3": {
    en: "unit cubes = volume",
    zh: "單位正方體 = 體積",
    zhHans: "单位正方体 = 体积"
  },
  "us-ar-math-g5-gm-4": {
    en: "length x width x height = volume",
    zh: "長 x 闊 x 高 = 體積",
    zhHans: "长 x 宽 x 高 = 体积"
  },
  "us-ar-math-g5-gm-5": {
    en: "sum of prism volumes",
    zh: "長方體體積相加",
    zhHans: "长方体体积相加"
  },
  "us-ar-math-k-gm-6": {
    en: "compare length -> longer/shorter",
    zh: "比較長度 -> 較長/較短",
    zhHans: "比较长度 -> 较长/较短"
  },
  "us-ar-math-g1-gm-1": {
    en: "sides + corners -> shape attribute",
    zh: "邊 + 角 -> 圖形特徵",
    zhHans: "边 + 角 -> 图形特征"
  },
  "us-ar-math-g1-gm-2": {
    en: "shape parts -> composite shape",
    zh: "圖形部分 -> 組合圖形",
    zhHans: "图形部分 -> 组合图形"
  },
  "us-ar-math-g1-gm-3": {
    en: "unit count x unit = length",
    zh: "單位數 x 單位 = 長度",
    zhHans: "单位数 x 单位 = 长度"
  },
  "us-ar-math-g1-gm-4": {
    en: "compare through third length",
    zh: "透過第三長度比較",
    zhHans: "通过第三长度比较"
  },
  "us-ar-math-g2-gm-1": {
    en: "attributes -> 2D shape",
    zh: "特徵 -> 平面圖形",
    zhHans: "特征 -> 平面图形"
  },
  "us-ar-math-g2-gm-2": {
    en: "faces + edges + vertices -> 3D shape",
    zh: "面 + 邊 + 頂點 -> 立體圖形",
    zhHans: "面 + 边 + 顶点 -> 立体图形"
  },
  "us-ar-math-g3-car-9": {
    en: "known factor x unknown factor = product",
    zh: "已知因數 x 未知因數 = 積",
    zhHans: "已知因数 x 未知因数 = 积"
  },
  "us-ar-math-g5-car-13": {
    en: "expression -> value",
    zh: "算式 -> 值",
    zhHans: "算式 -> 值"
  },
  "us-ar-math-g5-gm-1": {
    en: "attributes -> shape hierarchy",
    zh: "圖形特徵 -> 層級分類",
    zhHans: "图形特征 -> 层级分类"
  },
  "us-ar-math-g10-chapter-03-circle-geometry": {
    en: "chord/tangent/arc -> circle theorem",
    zh: "弦/切線/弧 -> 圓定理",
    zhHans: "弦/切线/弧 -> 圆定理"
  },
  "us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume": {
    en: "area -> surface area -> volume",
    zh: "面積 -> 表面積 -> 體積",
    zhHans: "面积 -> 表面积 -> 体积"
  },
  "us-ar-math-g4-da-2": {
    en: "fraction data -> line plot",
    zh: "分數數據 -> 線圖",
    zhHans: "分数数据 -> 线图"
  },
  "us-ar-math-g5-da-2": {
    en: "fraction line plot -> operation",
    zh: "分數線圖 -> 運算",
    zhHans: "分数线图 -> 运算"
  },
  "us-ar-math-g12-chapter-03-decision-statistics": {
    en: "sample evidence -> statistical decision",
    zh: "樣本證據 -> 統計決策",
    zhHans: "样本证据 -> 统计决策"
  },
  "us-ca-math-s3-chapter-02": {
    en: "function notation -> value",
    zh: "函數記號 -> 值",
    zhHans: "函数记号 -> 值"
  },
  "us-ca-math-s5-chapter-01": {
    en: "parent function -> transformation",
    zh: "母函數 -> 變換",
    zhHans: "母函数 -> 变换"
  },
  "us-ca-math-s2-chapter-02": {
    en: "input -> output -> rate",
    zh: "輸入 -> 輸出 -> 變化率",
    zhHans: "输入 -> 输出 -> 变化率"
  },
  "us-ca-math-s5-chapter-05": {
    en: "sample -> inference -> claim",
    zh: "樣本 -> 推斷 -> 結論",
    zhHans: "样本 -> 推断 -> 结论"
  },
  "us-ca-math-s6-chapter-01": {
    en: "measurement = mean +/- uncertainty",
    zh: "測量值 = 平均 +/- 不確定度",
    zhHans: "测量值 = 平均 +/- 不确定度"
  },
  "us-ca-math-s6-chapter-04": {
    en: "function -> rate of change",
    zh: "函數 -> 變化率",
    zhHans: "函数 -> 变化率"
  },
  "us-ca-math-p6-chapter-04": {
    en: "area -> surface area -> volume",
    zh: "面積 -> 表面積 -> 體積",
    zhHans: "面积 -> 表面积 -> 体积"
  },
  "us-ca-math-s6-chapter-03": {
    en: "sample evidence -> statistical decision",
    zh: "樣本證據 -> 統計決策",
    zhHans: "样本证据 -> 统计决策"
  },
  "us-ca-math-s6-chapter-05": {
    en: "assumption -> model -> check",
    zh: "假設 -> 模型 -> 檢查",
    zhHans: "假设 -> 模型 -> 检查"
  },
  "us-ca-math-s4-chapter-02": {
    en: "similarity ratio -> right-triangle measure",
    zh: "相似比例 -> 直角三角形量度",
    zhHans: "相似比例 -> 直角三角形测量"
  },
  "us-ca-math-s2-chapter-04": {
    en: "distance^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zh: "距離^2 = (x2 - x1)^2 + (y2 - y1)^2",
    zhHans: "距离^2 = (x2 - x1)^2 + (y2 - y1)^2"
  },
  "us-ca-math-s4-chapter-03": {
    en: "chord/tangent/arc -> circle theorem",
    zh: "弦/切線/弧 -> 圓定理",
    zhHans: "弦/切线/弧 -> 圆定理"
  },
};

const topicTitleOverrides: Partial<Record<string, LocalizedText>> = {
  "us-ca-math-k-k-cc-count-sequence": localizedUsTopicTitle("K-A.1 Kindergarten Counting and Cardinality: Count Sequence"),
  "us-ca-math-k-k-cc-cardinality-compare": localizedUsTopicTitle("K-B.1 Kindergarten Counting and Cardinality: Cardinality Compare"),
  "us-ca-math-k-k-oa-compose-decompose": localizedUsTopicTitle("K-C.1 Kindergarten Operations and Algebraic Thinking: Compose and Decompose"),
  "us-ca-math-k-k-nbt-teen-numbers": localizedUsTopicTitle("K-D.1 Kindergarten Number and Operations in Base Ten: Teen Numbers"),
  "us-ca-math-k-k-md-attributes-data": localizedUsTopicTitle("K-E.1 Kindergarten Measurement and Data: Attributes and Data"),
  "us-ca-math-k-k-g-shapes-position": localizedUsTopicTitle("K-F.1 Kindergarten Geometry: Shapes and Position"),
  "us-ar-math-g4-gm-3": localizedUsTopicTitle("Arkansas Unknown Angle Measures"),
  "us-ar-math-g10-chapter-03-circle-geometry": localizedUsTopicTitle("Arkansas Circle Geometry"),
  "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models": localizedUsTopicTitle("Arkansas Exponential and Logarithmic Models"),
  "us-ar-math-g12-chapter-03-decision-statistics": localizedUsTopicTitle("Arkansas Decision Statistics"),
};

const topicFocusOverrides: Partial<Record<string, LocalizedText>> = {
  "us-ca-math-k-k-cc-count-sequence": {
    en: "A kindergarten counting-path lab where children tap small steps, say the number sequence, and connect the next number to one more object.",
    zh: "幼兒園數數路徑實驗：孩子輕觸小步，說出數序，並把下一個數連到多一個物件。",
    zhHans: "幼儿园数数路径实验：孩子轻触小步，说出数序，并把下一个数连到多一个物件。"
  },
  "us-ca-math-k-k-cc-cardinality-compare": {
    en: "A kindergarten compare-groups lab for counting two small collections and deciding which has more, fewer, or the same number.",
    zh: "幼兒園比較小組實驗：數兩組小集合，判斷哪一組較多、較少或一樣多。",
    zhHans: "幼儿园比较小组实验：数两组小集合，判断哪一组较多、较少或一样多。"
  },
  "us-ca-math-k-k-oa-compose-decompose": {
    en: "A kindergarten part-whole lab for making and breaking numbers within 10 with friendly counters before writing any symbols.",
    zh: "幼兒園部分與整體實驗：先用友善小圓片組合、拆分 10 以內的數，再看符號。",
    zhHans: "幼儿园部分与整体实验：先用友善小圆片组合、拆分 10 以内的数，再看符号。"
  },
  "us-ca-math-k-k-nbt-teen-numbers": {
    en: "A kindergarten ten-and-some-more lab for building teen numbers with one ten and extra ones.",
    zh: "幼兒園十加幾實驗：用一個十和多出的個來組成十幾。",
    zhHans: "幼儿园十加几实验：用一个十和多出的个来组成十几。"
  },
  "us-ca-math-k-k-md-attributes-data": {
    en: "A kindergarten sorting lab for choosing an attribute, sorting objects, and counting each small group.",
    zh: "幼兒園分類實驗：選一個屬性，把物件分組，再數每一小組。",
    zhHans: "幼儿园分类实验：选一个属性，把物件分组，再数每一小组。"
  },
  "us-ca-math-k-k-g-shapes-position": {
    en: "A kindergarten shape-and-position lab for naming simple shapes and placing them above, below, beside, or inside.",
    zh: "幼兒園圖形與位置實驗：命名簡單圖形，並放在上方、下方、旁邊或裡面。",
    zhHans: "幼儿园图形与位置实验：命名简单图形，并放在上方、下方、旁边或里面。"
  },
  "us-ar-math-g4-gm-3": usStandardsFocus("Arkansas 4.GM.3", "Unknown Angle Measures", "幾何角度", "几何角度"),
  "us-ar-math-g10-chapter-03-circle-geometry": usStandardsFocus("Arkansas AR.Math.HS.G-C", "Circle Geometry", "幾何", "几何"),
  "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models": usStandardsFocus("Arkansas AR.Math.HS.F-LE", "Exponential and Logarithmic Models", "函數族", "函数族"),
  "us-ar-math-g12-chapter-03-decision-statistics": usStandardsFocus("Arkansas AR.Math.HS.F-IF", "Decision Statistics", "統計與分佈", "统计与分布"),
  "us-ca-math-s4-chapter-03": {
    en: "California Math Practice Beta Chapter 3 strand for Circle Geometry, with MAIS-authored standards-aligned practice questions.",
    zh: "用幾何模型，觀察California Grade 10: 圓的幾何中的關鍵關係。",
    zhHans: "用几何模型，观察California Grade 10: 圆的几何中的关键关系。"
  },
  "us-ca-math-s5-chapter-02": {
    en: "California Math Practice Beta Chapter 2 strand for Exponential and Logarithmic Models, with MAIS-authored standards-aligned practice questions.",
    zh: "用函數族模型，觀察California Grade 11: 指數與對數模型中的關鍵關係。",
    zhHans: "用函数族模型，观察California Grade 11: 指数与对数模型中的关键关系。"
  },
  "us-ca-math-s6-chapter-03": {
    en: "California Math Practice Beta Chapter 3 strand for Decision Statistics, with MAIS-authored standards-aligned practice questions.",
    zh: "用統計與分佈模型，觀察California Grade 12: 決策統計中的關鍵關係。",
    zhHans: "用统计与分布模型，观察California Grade 12: 决策统计中的关键关系。"
  },
};

type CaliforniaDomainAlignmentRecord = {
  domainTitle: LocalizedText;
  standardIds: string[];
  capabilitySummary: LocalizedText;
};

type CaliforniaClusterAlignmentRecord = {
  domainId: string;
  standardIds: string[];
};

function localizedText(en: string, zh = en, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

const californiaSourcePolicy: LocalizedText = localizedText(
  "Uses California/Common Core standard identifiers and domain structure only; student-facing wording is MAIS-authored and avoids copied IXL, CDE, or CCSS prose.",
  "僅使用 California/Common Core 標準代號與領域結構；學生可見文字由 MAIS 自寫，避免複製 IXL、CDE 或 CCSS 原文。",
  "仅使用 California/Common Core 标准代号与领域结构；学生可见文字由 MAIS 自写，避免复制 IXL、CDE 或 CCSS 原文。"
);

const californiaDomainAlignments: Record<string, CaliforniaDomainAlignmentRecord> = {
  "K.CC": {
    domainTitle: localizedText("Counting and Cardinality", "數數與基數", "数数与基数"),
    standardIds: ["K.CC.A.1", "K.CC.A.2", "K.CC.A.3", "K.CC.B.4", "K.CC.B.5", "K.CC.C.6", "K.CC.C.7"],
    capabilitySummary: localizedText("Connect number words, written numerals, ordered counts, and quantity comparisons with concrete or picture models.")
  },
  "K.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["K.OA.A.1", "K.OA.A.2", "K.OA.A.3", "K.OA.A.4", "K.OA.A.5"],
    capabilitySummary: localizedText("Represent joining, separating, and decomposing within 10 with objects, drawings, equations, and part-whole models.")
  },
  "K.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["K.NBT.A.1"],
    capabilitySummary: localizedText("Treat teen numbers as one ten and extra ones through base-ten and ten-frame representations.")
  },
  "K.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["K.MD.A.1", "K.MD.A.2", "K.MD.B.3"],
    capabilitySummary: localizedText("Describe, compare, classify, and organize measurable attributes with simple visual data models.")
  },
  "K.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["K.G.A.1", "K.G.A.2", "K.G.A.3", "K.G.B.4", "K.G.B.5", "K.G.B.6"],
    capabilitySummary: localizedText("Name, compare, compose, and position two- and three-dimensional shapes.")
  },
  "1.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["1.OA.A.1", "1.OA.A.2", "1.OA.B.3", "1.OA.B.4", "1.OA.C.5", "1.OA.C.6", "1.OA.D.7", "1.OA.D.8"],
    capabilitySummary: localizedText("Model addition and subtraction situations, properties, unknowns, and fluency within 20.")
  },
  "1.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["1.NBT.A.1", "1.NBT.B.2", "1.NBT.B.3", "1.NBT.C.4", "1.NBT.C.5", "1.NBT.C.6"],
    capabilitySummary: localizedText("Count, compare, and operate with two-digit numbers using tens, ones, and place-value structure.")
  },
  "1.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["1.MD.A.1", "1.MD.A.2", "1.MD.B.3", "1.MD.C.4"],
    capabilitySummary: localizedText("Compare lengths, iterate units, tell time, and interpret simple data displays.")
  },
  "1.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["1.G.A.1", "1.G.A.2", "1.G.A.3"],
    capabilitySummary: localizedText("Compose, partition, and reason about defining attributes of shapes.")
  },
  "2.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["2.OA.A.1", "2.OA.B.2", "2.OA.C.3", "2.OA.C.4"],
    capabilitySummary: localizedText("Solve addition/subtraction problems, build fluency, and represent equal groups with arrays.")
  },
  "2.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["2.NBT.A.1", "2.NBT.A.2", "2.NBT.A.3", "2.NBT.A.4", "2.NBT.B.5", "2.NBT.B.6", "2.NBT.B.7", "2.NBT.B.8", "2.NBT.B.9"],
    capabilitySummary: localizedText("Represent, compare, add, and subtract within 1000 using base-ten reasoning.")
  },
  "2.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["2.MD.A.1", "2.MD.A.2", "2.MD.A.3", "2.MD.A.4", "2.MD.B.5", "2.MD.B.6", "2.MD.C.7", "2.MD.C.8", "2.MD.D.9", "2.MD.D.10"],
    capabilitySummary: localizedText("Measure length, connect measurement to number lines, work with time/money, and display data.")
  },
  "2.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["2.G.A.1", "2.G.A.2", "2.G.A.3"],
    capabilitySummary: localizedText("Recognize shape attributes and partition rectangles or circles into equal shares.")
  },
  "3.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["3.OA.A.1", "3.OA.A.2", "3.OA.A.3", "3.OA.A.4", "3.OA.B.5", "3.OA.B.6", "3.OA.C.7", "3.OA.D.8", "3.OA.D.9"],
    capabilitySummary: localizedText("Interpret multiplication and division, solve situations, use properties, and identify patterns.")
  },
  "3.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["3.NBT.A.1", "3.NBT.A.2", "3.NBT.A.3"],
    capabilitySummary: localizedText("Round and compute with multi-digit numbers using place-value strategies.")
  },
  "3.NF": {
    domainTitle: localizedText("Number and Operations - Fractions", "數與運算：分數", "数与运算：分数"),
    standardIds: ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"],
    capabilitySummary: localizedText("Understand fractions as numbers, locate them on number lines, and reason about equivalence or comparison.")
  },
  "3.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["3.MD.A.1", "3.MD.A.2", "3.MD.B.3", "3.MD.B.4", "3.MD.C.5", "3.MD.C.6", "3.MD.C.7", "3.MD.D.8"],
    capabilitySummary: localizedText("Reason about elapsed time, measurement, graphing, area, and perimeter models.")
  },
  "3.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["3.G.A.1", "3.G.A.2"],
    capabilitySummary: localizedText("Classify shapes by attributes and partition shapes into fractional areas.")
  },
  "4.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["4.OA.A.1", "4.OA.A.2", "4.OA.A.3", "4.OA.B.4", "4.OA.C.5"],
    capabilitySummary: localizedText("Use multiplicative comparison, factors, multiples, primes, composites, and pattern rules.")
  },
  "4.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["4.NBT.A.1", "4.NBT.A.2", "4.NBT.A.3", "4.NBT.B.4", "4.NBT.B.5", "4.NBT.B.6"],
    capabilitySummary: localizedText("Generalize place value and perform multi-digit operations with models and reasonableness checks.")
  },
  "4.NF": {
    domainTitle: localizedText("Number and Operations - Fractions", "數與運算：分數", "数与运算：分数"),
    standardIds: ["4.NF.A.1", "4.NF.A.2", "4.NF.B.3", "4.NF.B.4", "4.NF.C.5", "4.NF.C.6", "4.NF.C.7"],
    capabilitySummary: localizedText("Use fraction equivalence, comparison, operations, whole-number multiplication, and decimal notation.")
  },
  "4.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["4.MD.A.1", "4.MD.A.2", "4.MD.A.3", "4.MD.B.4", "4.MD.C.5", "4.MD.C.6", "4.MD.C.7"],
    capabilitySummary: localizedText("Use unit conversion, area/perimeter formulas, line plots, and angle measure.")
  },
  "4.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["4.G.A.1", "4.G.A.2", "4.G.A.3"],
    capabilitySummary: localizedText("Reason about lines, angles, symmetry, and shape classification.")
  },
  "5.OA": {
    domainTitle: localizedText("Operations and Algebraic Thinking", "運算與代數思維", "运算与代数思维"),
    standardIds: ["5.OA.A.1", "5.OA.A.2", "5.OA.B.3"],
    capabilitySummary: localizedText("Write and interpret numerical expressions and analyze pattern relationships.")
  },
  "5.NBT": {
    domainTitle: localizedText("Number and Operations in Base Ten", "十進位數與運算", "十进位数与运算"),
    standardIds: ["5.NBT.A.1", "5.NBT.A.2", "5.NBT.A.3", "5.NBT.A.4", "5.NBT.B.5", "5.NBT.B.6", "5.NBT.B.7"],
    capabilitySummary: localizedText("Use place-value patterns and decimal operations with powers of ten, rounding, and algorithms.")
  },
  "5.NF": {
    domainTitle: localizedText("Number and Operations - Fractions", "數與運算：分數", "数与运算：分数"),
    standardIds: ["5.NF.A.1", "5.NF.A.2", "5.NF.B.3", "5.NF.B.4", "5.NF.B.5", "5.NF.B.6", "5.NF.B.7"],
    capabilitySummary: localizedText("Use fraction addition/subtraction and multiplication/division models before algorithms.")
  },
  "5.MD": {
    domainTitle: localizedText("Measurement and Data", "度量與數據", "测量与数据"),
    standardIds: ["5.MD.A.1", "5.MD.B.2", "5.MD.C.3", "5.MD.C.4", "5.MD.C.5"],
    capabilitySummary: localizedText("Convert measures, display data, and reason about volume with layers and unit cubes.")
  },
  "5.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["5.G.A.1", "5.G.A.2", "5.G.B.3", "5.G.B.4"],
    capabilitySummary: localizedText("Graph points on coordinate planes and classify shapes by properties.")
  },
  "6.RP": {
    domainTitle: localizedText("Ratios and Proportional Relationships", "比與比例關係", "比与比例关系"),
    standardIds: ["6.RP.1", "6.RP.2", "6.RP.3"],
    capabilitySummary: localizedText("Connect ratios, rates, percent, tables, double number lines, equations, and coordinate plots.")
  },
  "6.NS": {
    domainTitle: localizedText("The Number System", "數系", "数系"),
    standardIds: ["6.NS.1", "6.NS.2", "6.NS.3", "6.NS.4", "6.NS.5", "6.NS.6", "6.NS.7", "6.NS.8"],
    capabilitySummary: localizedText("Use rational numbers, number-line position, coordinate-plane signs, and arithmetic fluency.")
  },
  "6.EE": {
    domainTitle: localizedText("Expressions and Equations", "表達式與方程", "表达式与方程"),
    standardIds: ["6.EE.1", "6.EE.2", "6.EE.3", "6.EE.4", "6.EE.5", "6.EE.6", "6.EE.7", "6.EE.8", "6.EE.9"],
    capabilitySummary: localizedText("Represent variables, expressions, equations, inequalities, and dependent relationships.")
  },
  "6.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["6.G.1", "6.G.2", "6.G.3", "6.G.4"],
    capabilitySummary: localizedText("Find area, surface area, and volume using decomposition, nets, and coordinate geometry.")
  },
  "6.SP": {
    domainTitle: localizedText("Statistics and Probability", "統計與概率", "统计与概率"),
    standardIds: ["6.SP.1", "6.SP.2", "6.SP.3", "6.SP.4", "6.SP.5"],
    capabilitySummary: localizedText("Describe statistical questions, distributions, center, variability, and data displays.")
  },
  "7.RP": {
    domainTitle: localizedText("Ratios and Proportional Relationships", "比與比例關係", "比与比例关系"),
    standardIds: ["7.RP.1", "7.RP.2", "7.RP.3"],
    capabilitySummary: localizedText("Analyze proportional relationships, unit rates, graphs, equations, and percent reasoning.")
  },
  "7.NS": {
    domainTitle: localizedText("The Number System", "數系", "数系"),
    standardIds: ["7.NS.1", "7.NS.2", "7.NS.3"],
    capabilitySummary: localizedText("Operate with signed rational numbers and connect operations to real-world constraints.")
  },
  "7.EE": {
    domainTitle: localizedText("Expressions and Equations", "表達式與方程", "表达式与方程"),
    standardIds: ["7.EE.1", "7.EE.2", "7.EE.3", "7.EE.4"],
    capabilitySummary: localizedText("Use equivalent expressions and equations or inequalities to solve multi-step problems.")
  },
  "7.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["7.G.1", "7.G.2", "7.G.3", "7.G.4", "7.G.5", "7.G.6"],
    capabilitySummary: localizedText("Reason about scale drawings, circles, angles, area, surface area, and volume.")
  },
  "7.SP": {
    domainTitle: localizedText("Statistics and Probability", "統計與概率", "统计与概率"),
    standardIds: ["7.SP.1", "7.SP.2", "7.SP.3", "7.SP.4", "7.SP.5", "7.SP.6", "7.SP.7", "7.SP.8"],
    capabilitySummary: localizedText("Use samples, comparisons, probability models, and simulations to make informal inferences.")
  },
  "8.NS": {
    domainTitle: localizedText("The Number System", "數系", "数系"),
    standardIds: ["8.NS.1", "8.NS.2"],
    capabilitySummary: localizedText("Reason about rational and irrational numbers, approximations, and number-line placement.")
  },
  "8.EE": {
    domainTitle: localizedText("Expressions and Equations", "表達式與方程", "表达式与方程"),
    standardIds: ["8.EE.1", "8.EE.2", "8.EE.3", "8.EE.4", "8.EE.5", "8.EE.6", "8.EE.7", "8.EE.8"],
    capabilitySummary: localizedText("Use exponents, roots, proportional lines, linear equations, and systems.")
  },
  "8.F": {
    domainTitle: localizedText("Functions", "函數", "函数"),
    standardIds: ["8.F.1", "8.F.2", "8.F.3", "8.F.4", "8.F.5"],
    capabilitySummary: localizedText("Compare functions across graphs, tables, equations, and verbal descriptions.")
  },
  "8.G": {
    domainTitle: localizedText("Geometry", "幾何", "几何"),
    standardIds: ["8.G.1", "8.G.2", "8.G.3", "8.G.4", "8.G.5", "8.G.6", "8.G.7", "8.G.8", "8.G.9"],
    capabilitySummary: localizedText("Use transformations, similarity, congruence, Pythagorean reasoning, and volume.")
  },
  "8.SP": {
    domainTitle: localizedText("Statistics and Probability", "統計與概率", "统计与概率"),
    standardIds: ["8.SP.1", "8.SP.2", "8.SP.3", "8.SP.4"],
    capabilitySummary: localizedText("Investigate bivariate data with scatter plots, trend lines, and two-way tables.")
  },
  "N-RN": {
    domainTitle: localizedText("Number and Quantity - Real Number System", "數與量：實數系", "数与量：实数系"),
    standardIds: ["N-RN.1", "N-RN.2", "N-RN.3"],
    capabilitySummary: localizedText("Extend exponent properties and reason about rational or irrational expressions.")
  },
  "N-Q": {
    domainTitle: localizedText("Number and Quantity - Quantities", "數與量：數量", "数与量：数量"),
    standardIds: ["N-Q.1", "N-Q.2", "N-Q.3"],
    capabilitySummary: localizedText("Choose units, define quantities, and report precision in modeling contexts.")
  },
  "N-CN": {
    domainTitle: localizedText("Number and Quantity - Complex Numbers", "數與量：複數", "数与量：复数"),
    standardIds: ["N-CN.1", "N-CN.2", "N-CN.3", "N-CN.4", "N-CN.5", "N-CN.6", "N-CN.7", "N-CN.8", "N-CN.9"],
    capabilitySummary: localizedText("Operate with complex numbers and connect complex solutions to polynomial equations.")
  },
  "N-VM": {
    domainTitle: localizedText("Number and Quantity - Vector and Matrix Quantities", "數與量：向量與矩陣", "数与量：向量与矩阵"),
    standardIds: ["N-VM.1", "N-VM.2", "N-VM.3", "N-VM.4", "N-VM.5", "N-VM.6", "N-VM.7", "N-VM.8", "N-VM.9", "N-VM.10", "N-VM.11", "N-VM.12"],
    capabilitySummary: localizedText("Use vectors and matrices for quantities, transformations, and modeling when assigned.")
  },
  "A-SSE": {
    domainTitle: localizedText("Algebra - Seeing Structure in Expressions", "代數：看見表達式結構", "代数：看见表达式结构"),
    standardIds: ["A-SSE.1", "A-SSE.2", "A-SSE.3", "A-SSE.4"],
    capabilitySummary: localizedText("Interpret, rewrite, and use structure in expressions.")
  },
  "A-APR": {
    domainTitle: localizedText("Algebra - Arithmetic with Polynomials and Rational Expressions", "代數：多項式與有理式運算", "代数：多项式与有理式运算"),
    standardIds: ["A-APR.1", "A-APR.2", "A-APR.3", "A-APR.4", "A-APR.5", "A-APR.6", "A-APR.7"],
    capabilitySummary: localizedText("Operate with polynomials or rational expressions and use identities, zeros, and graphs.")
  },
  "A-CED": {
    domainTitle: localizedText("Algebra - Creating Equations", "代數：建立方程", "代数：建立方程"),
    standardIds: ["A-CED.1", "A-CED.2", "A-CED.3", "A-CED.4"],
    capabilitySummary: localizedText("Create equations, inequalities, systems, and rearranged formulas to model constraints.")
  },
  "A-REI": {
    domainTitle: localizedText("Algebra - Reasoning with Equations and Inequalities", "代數：方程與不等式推理", "代数：方程与不等式推理"),
    standardIds: ["A-REI.1", "A-REI.2", "A-REI.3", "A-REI.4", "A-REI.5", "A-REI.6", "A-REI.7", "A-REI.8", "A-REI.9", "A-REI.10", "A-REI.11", "A-REI.12"],
    capabilitySummary: localizedText("Solve and justify equations, inequalities, systems, and graphical solution sets.")
  },
  "F-IF": {
    domainTitle: localizedText("Functions - Interpreting Functions", "函數：詮釋函數", "函数：诠释函数"),
    standardIds: ["F-IF.1", "F-IF.2", "F-IF.3", "F-IF.4", "F-IF.5", "F-IF.6", "F-IF.7", "F-IF.8", "F-IF.9"],
    capabilitySummary: localizedText("Interpret notation, features, rates of change, and representations of functions.")
  },
  "F-BF": {
    domainTitle: localizedText("Functions - Building Functions", "函數：建立函數", "函数：建立函数"),
    standardIds: ["F-BF.1", "F-BF.2", "F-BF.3", "F-BF.4", "F-BF.5"],
    capabilitySummary: localizedText("Build functions from contexts, operations, transformations, inverses, and sequences.")
  },
  "F-LE": {
    domainTitle: localizedText("Functions - Linear, Quadratic, and Exponential Models", "函數：線性、二次與指數模型", "函数：线性、二次与指数模型"),
    standardIds: ["F-LE.1", "F-LE.2", "F-LE.3", "F-LE.4", "F-LE.5"],
    capabilitySummary: localizedText("Build and interpret linear, quadratic, and exponential models.")
  },
  "F-TF": {
    domainTitle: localizedText("Functions - Trigonometric Functions", "函數：三角函數", "函数：三角函数"),
    standardIds: ["F-TF.1", "F-TF.2", "F-TF.3", "F-TF.4", "F-TF.5", "F-TF.6", "F-TF.7", "F-TF.8", "F-TF.9"],
    capabilitySummary: localizedText("Use radian measure, unit-circle reasoning, trig graphs, identities, and inverse trig where assigned.")
  },
  "G-CO": {
    domainTitle: localizedText("Geometry - Congruence", "幾何：全等", "几何：全等"),
    standardIds: ["G-CO.1", "G-CO.2", "G-CO.3", "G-CO.4", "G-CO.5", "G-CO.6", "G-CO.7", "G-CO.8", "G-CO.9", "G-CO.10", "G-CO.11", "G-CO.12", "G-CO.13"],
    capabilitySummary: localizedText("Use transformations, congruence criteria, constructions, and proof reasoning.")
  },
  "G-SRT": {
    domainTitle: localizedText("Geometry - Similarity, Right Triangles, and Trigonometry", "幾何：相似、直角三角形與三角", "几何：相似、直角三角形与三角"),
    standardIds: ["G-SRT.1", "G-SRT.2", "G-SRT.3", "G-SRT.4", "G-SRT.5", "G-SRT.6", "G-SRT.7", "G-SRT.8", "G-SRT.9", "G-SRT.10", "G-SRT.11"],
    capabilitySummary: localizedText("Use similarity, right-triangle relationships, trig ratios, and related triangle models.")
  },
  "G-C": {
    domainTitle: localizedText("Geometry - Circles", "幾何：圓", "几何：圆"),
    standardIds: ["G-C.1", "G-C.2", "G-C.3", "G-C.4", "G-C.5"],
    capabilitySummary: localizedText("Reason about circle theorems, arcs, sectors, and constructions.")
  },
  "G-GPE": {
    domainTitle: localizedText("Geometry - Expressing Geometric Properties with Equations", "幾何：用方程表達性質", "几何：用方程表达性质"),
    standardIds: ["G-GPE.1", "G-GPE.2", "G-GPE.3", "G-GPE.4", "G-GPE.5", "G-GPE.6", "G-GPE.7"],
    capabilitySummary: localizedText("Use coordinates, equations, distance, midpoint, slope, and conic relationships.")
  },
  "G-GMD": {
    domainTitle: localizedText("Geometry - Geometric Measurement and Dimension", "幾何：幾何度量與維度", "几何：几何测量与维度"),
    standardIds: ["G-GMD.1", "G-GMD.2", "G-GMD.3", "G-GMD.4"],
    capabilitySummary: localizedText("Use geometric measurement, volume formulas, cross-sections, and units.")
  },
  "G-MG": {
    domainTitle: localizedText("Geometry - Modeling with Geometry", "幾何：用幾何建模", "几何：用几何建模"),
    standardIds: ["G-MG.1", "G-MG.2", "G-MG.3"],
    capabilitySummary: localizedText("Apply geometric ideas to design, density, scale, and optimization contexts.")
  },
  "S-ID": {
    domainTitle: localizedText("Statistics and Probability - Interpreting Categorical and Quantitative Data", "統計與概率：詮釋數據", "统计与概率：诠释数据"),
    standardIds: ["S-ID.1", "S-ID.2", "S-ID.3", "S-ID.4", "S-ID.5", "S-ID.6", "S-ID.7", "S-ID.8", "S-ID.9"],
    capabilitySummary: localizedText("Summarize, compare, fit, and interpret one- and two-variable data.")
  },
  "S-IC": {
    domainTitle: localizedText("Statistics and Probability - Making Inferences and Justifying Conclusions", "統計與概率：推論與結論", "统计与概率：推论与结论"),
    standardIds: ["S-IC.1", "S-IC.2", "S-IC.3", "S-IC.4", "S-IC.5", "S-IC.6"],
    capabilitySummary: localizedText("Use sampling, simulation, experiments, and inference decisions.")
  },
  "S-CP": {
    domainTitle: localizedText("Statistics and Probability - Conditional Probability and Rules of Probability", "統計與概率：條件概率與概率規則", "统计与概率：条件概率与概率规则"),
    standardIds: ["S-CP.1", "S-CP.2", "S-CP.3", "S-CP.4", "S-CP.5", "S-CP.6", "S-CP.7", "S-CP.8", "S-CP.9"],
    capabilitySummary: localizedText("Use events, independence, conditional probability, and probability rules.")
  },
  "S-MD": {
    domainTitle: localizedText("Statistics and Probability - Using Probability to Make Decisions", "統計與概率：用概率決策", "统计与概率：用概率决策"),
    standardIds: ["S-MD.1", "S-MD.2", "S-MD.3", "S-MD.4", "S-MD.5", "S-MD.6", "S-MD.7"],
    capabilitySummary: localizedText("Use expected value, probability models, payoff tables, and decision comparisons.")
  },
  Modeling: {
    domainTitle: localizedText("Modeling", "建模", "建模"),
    standardIds: ["Modeling"],
    capabilitySummary: localizedText("Formulate assumptions, represent constraints, compute, interpret, validate, and revise models.")
  }
};

const californiaClusterStandards: Record<string, CaliforniaClusterAlignmentRecord> = {
  "K.CC.count-sequence": { domainId: "K.CC", standardIds: ["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"] },
  "K.CC.cardinality-compare": { domainId: "K.CC", standardIds: ["K.CC.B.4", "K.CC.B.5", "K.CC.C.6", "K.CC.C.7"] },
  "K.OA.compose-decompose": { domainId: "K.OA", standardIds: ["K.OA.A.1", "K.OA.A.2", "K.OA.A.3", "K.OA.A.4", "K.OA.A.5"] },
  "K.NBT.teen-numbers": { domainId: "K.NBT", standardIds: ["K.NBT.A.1"] },
  "K.MD.attributes-data": { domainId: "K.MD", standardIds: ["K.MD.A.1", "K.MD.A.2", "K.MD.B.3"] },
  "K.G.shapes-position": { domainId: "K.G", standardIds: ["K.G.A.1", "K.G.A.2", "K.G.A.3", "K.G.B.4", "K.G.B.5", "K.G.B.6"] },
  "1.OA.add-subtract": { domainId: "1.OA", standardIds: ["1.OA.A.1", "1.OA.A.2", "1.OA.B.3", "1.OA.B.4", "1.OA.C.5", "1.OA.C.6", "1.OA.D.7", "1.OA.D.8"] },
  "1.NBT.place-value": { domainId: "1.NBT", standardIds: ["1.NBT.A.1", "1.NBT.B.2", "1.NBT.B.3", "1.NBT.C.4", "1.NBT.C.5", "1.NBT.C.6"] },
  "1.MD.measure-data": { domainId: "1.MD", standardIds: ["1.MD.A.1", "1.MD.A.2", "1.MD.B.3", "1.MD.C.4"] },
  "1.G.shape-reasoning": { domainId: "1.G", standardIds: ["1.G.A.1", "1.G.A.2", "1.G.A.3"] },
  "2.OA.fluency-arrays": { domainId: "2.OA", standardIds: ["2.OA.A.1", "2.OA.B.2", "2.OA.C.3", "2.OA.C.4"] },
  "2.NBT.three-digit-place-value": { domainId: "2.NBT", standardIds: ["2.NBT.A.1", "2.NBT.A.2", "2.NBT.A.3", "2.NBT.A.4", "2.NBT.B.5", "2.NBT.B.6", "2.NBT.B.7", "2.NBT.B.8", "2.NBT.B.9"] },
  "2.MD.measure-data-money-time": { domainId: "2.MD", standardIds: ["2.MD.A.1", "2.MD.A.2", "2.MD.A.3", "2.MD.A.4", "2.MD.B.5", "2.MD.B.6", "2.MD.C.7", "2.MD.C.8", "2.MD.D.9", "2.MD.D.10"] },
  "2.G.partition-shapes": { domainId: "2.G", standardIds: ["2.G.A.1", "2.G.A.2", "2.G.A.3"] },
  "3.OA.mult-div": { domainId: "3.OA", standardIds: ["3.OA.A.1", "3.OA.A.2", "3.OA.A.3", "3.OA.A.4", "3.OA.B.5", "3.OA.B.6", "3.OA.C.7", "3.OA.D.8", "3.OA.D.9"] },
  "3.NBT.arithmetic": { domainId: "3.NBT", standardIds: ["3.NBT.A.1", "3.NBT.A.2", "3.NBT.A.3"] },
  "3.NF.fraction-meaning": { domainId: "3.NF", standardIds: ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"] },
  "3.MD.time-data-area-perimeter": { domainId: "3.MD", standardIds: ["3.MD.A.1", "3.MD.A.2", "3.MD.B.3", "3.MD.B.4", "3.MD.C.5", "3.MD.C.6", "3.MD.C.7", "3.MD.D.8"] },
  "3.G.categories": { domainId: "3.G", standardIds: ["3.G.A.1", "3.G.A.2"] },
  "4.OA.factors-patterns": { domainId: "4.OA", standardIds: ["4.OA.A.1", "4.OA.A.2", "4.OA.A.3", "4.OA.B.4", "4.OA.C.5"] },
  "4.NBT.multi-digit": { domainId: "4.NBT", standardIds: ["4.NBT.A.1", "4.NBT.A.2", "4.NBT.A.3", "4.NBT.B.4", "4.NBT.B.5", "4.NBT.B.6"] },
  "4.NF.fraction-decimal": { domainId: "4.NF", standardIds: ["4.NF.A.1", "4.NF.A.2", "4.NF.B.3", "4.NF.B.4", "4.NF.C.5", "4.NF.C.6", "4.NF.C.7"] },
  "4.MD.conversion-angles": { domainId: "4.MD", standardIds: ["4.MD.A.1", "4.MD.A.2", "4.MD.A.3", "4.MD.B.4", "4.MD.C.5", "4.MD.C.6", "4.MD.C.7"] },
  "4.G.lines-shapes": { domainId: "4.G", standardIds: ["4.G.A.1", "4.G.A.2", "4.G.A.3"] },
  "5.OA.expressions-patterns": { domainId: "5.OA", standardIds: ["5.OA.A.1", "5.OA.A.2", "5.OA.B.3"] },
  "5.NBT.decimals": { domainId: "5.NBT", standardIds: ["5.NBT.A.1", "5.NBT.A.2", "5.NBT.A.3", "5.NBT.A.4", "5.NBT.B.5", "5.NBT.B.6", "5.NBT.B.7"] },
  "5.NF.operations": { domainId: "5.NF", standardIds: ["5.NF.A.1", "5.NF.A.2", "5.NF.B.3", "5.NF.B.4", "5.NF.B.5", "5.NF.B.6", "5.NF.B.7"] },
  "5.MD.volume-data": { domainId: "5.MD", standardIds: ["5.MD.A.1", "5.MD.B.2", "5.MD.C.3", "5.MD.C.4", "5.MD.C.5"] },
  "5.G.coordinate-shapes": { domainId: "5.G", standardIds: ["5.G.A.1", "5.G.A.2", "5.G.B.3", "5.G.B.4"] }
};

const californiaChapterDomainOverrides: Partial<Record<string, string>> = {
  "us-ca-math-p6-chapter-01": "6.RP",
  "us-ca-math-p6-chapter-02": "6.NS",
  "us-ca-math-p6-chapter-03": "6.EE",
  "us-ca-math-p6-chapter-04": "6.G",
  "us-ca-math-p6-chapter-05": "6.SP",
  "us-ca-math-s1-chapter-01": "7.RP",
  "us-ca-math-s1-chapter-02": "7.NS",
  "us-ca-math-s1-chapter-03": "7.EE",
  "us-ca-math-s1-chapter-04": "7.G",
  "us-ca-math-s1-chapter-05": "7.SP",
  "us-ca-math-s2-chapter-01": "8.EE",
  "us-ca-math-s2-chapter-02": "8.F",
  "us-ca-math-s2-chapter-03": "8.G",
  "us-ca-math-s2-chapter-04": "8.G",
  "us-ca-math-s2-chapter-05": "8.SP",
  "us-ca-math-s3-chapter-01": "A-CED",
  "us-ca-math-s3-chapter-02": "F-IF",
  "us-ca-math-s3-chapter-03": "F-LE",
  "us-ca-math-s3-chapter-04": "G-GPE",
  "us-ca-math-s3-chapter-05": "S-ID",
  "us-ca-math-s4-chapter-01": "G-CO",
  "us-ca-math-s4-chapter-02": "G-SRT",
  "us-ca-math-s4-chapter-03": "G-C",
  "us-ca-math-s4-chapter-04": "A-SSE",
  "us-ca-math-s4-chapter-05": "S-CP",
  "us-ca-math-s5-chapter-01": "F-BF",
  "us-ca-math-s5-chapter-02": "F-LE",
  "us-ca-math-s5-chapter-03": "F-TF",
  "us-ca-math-s5-chapter-04": "S-ID",
  "us-ca-math-s5-chapter-05": "S-IC",
  "us-ca-math-s6-chapter-01": "N-Q",
  "us-ca-math-s6-chapter-02": "A-APR",
  "us-ca-math-s6-chapter-03": "S-MD",
  "us-ca-math-s6-chapter-04": "F-IF",
  "us-ca-math-s6-chapter-05": "Modeling"
};

/**
 * Cross-domain standards a California chapter genuinely carries on top of its
 * primary domain.
 *
 * The domain fallback in `californiaAlignmentForTopic` gives every chapter its
 * own domain and nothing else, so a standard whose CCSS domain has no chapter of
 * its own is invisible to the catalog even when a ported bench teaches it. The
 * 2026-07-25 depth audit found 33 such standards: benches existed, sometimes
 * already rendering, but no lab alignment named the standard.
 *
 * The rule for adding a line here is strict, because a standard listed without a
 * visual behind it is exactly the "coverage on paper" this table exists to undo:
 * **every standard below is taught by a bench attached to that same chapter in
 * `data/signatureLabAssignments.ts`.** Standards in these domains that no bench
 * teaches (G-GPE.4/.6/.7, A-REI.1/.5/.10, G-GMD.2, N-Q.2/.3, N-RN.3, N-VM.4/.5,
 * the rest of N-CN) are deliberately absent — they are build work, not tagging.
 */
const californiaChapterSupplementalStandards: Partial<Record<string, string[]>> = {
  // 8-A.1 Linear Equations and Systems Readiness — irrationals are the readiness
  // prerequisite for radicals; 8.NS has no chapter of its own in the CA catalog.
  "us-ca-math-s2-chapter-01": ["8.NS.A.1", "8.NS.A.2"], // RationalNumbersLab, IrrationalLab
  // 9-A.1 Equations from Context — creating a constraint and solving it are the
  // same lesson; A-REI has no chapter of its own.
  "us-ca-math-s3-chapter-01": ["A-REI.1", "A-REI.3", "A-REI.5", "A-REI.6", "A-REI.10", "A-REI.12"], // EquationLab, InequalityLab, SystemsOfEquationsLab, SubstitutionLab, TwoVariableInequalityLab
  // G-GPE.6/.7 added 2026-07-25 with the MAIS-authored CoordinateMethodsLab.
  // The chapter already carried G-GPE.1/.2/.3/.5 from the conic benches; these
  // two are what coordinates let you COMPUTE, and no ported bench taught them.
  "us-ca-math-s3-chapter-04": ["G-GPE.6", "G-GPE.7"], // CoordinateMethodsLab
  // 9-B.1 Function Notation and Interpretation — "where f(x) = g(x)" is read off
  // the graph, so it belongs with function interpretation.
  "us-ca-math-s3-chapter-02": ["A-REI.11"], // AbsoluteValueLab
  // 10-C.1 Circle Geometry — G-GMD.1 is literally the circumference/area/volume
  // argument, and the solids follow from circle area.
  // G-MG.1/.2/.3 added 2026-07-25 with the MAIS-authored GeometricModelingLab:
  // modelling an object as a solid, density, and a least-metal design are the
  // natural next questions once the solids' own measures are in hand, and G-MG
  // had no chapter anywhere in the CA catalog.
  "us-ca-math-s4-chapter-03": ["G-GMD.1", "G-GMD.3", "G-GMD.4", "G-MG.1", "G-MG.2", "G-MG.3"], // PyramidLab, SphereLab, CrossSectionLab, RevolutionLab, GeometricModelingLab
  // 10-D.1 Quadratic Structure — solving the quadratic and the linear-quadratic
  // system are this chapter's work, not a separate A-REI chapter's.
  "us-ca-math-s4-chapter-04": ["A-REI.4", "A-REI.7"], // QuadraticEquationLab, LineParabolaLab
  // 11-B.1 Exponential and Logarithmic Models — rational exponents underpin the
  // exponential function; radical equations are where extraneous roots appear.
  "us-ca-math-s5-chapter-02": ["N-RN.1", "N-RN.2", "N-RN.3", "A-REI.2"], // RationalExponentLab, ExtraneousLab, ClosureLab
  // 12-A.1 Quantities, Units, and Precision — vector and matrix quantities sit in
  // the same CCSS category (Number & Quantity) as N-Q, and the matrix form of a
  // linear system is taught on the same bench.
  "us-ca-math-s6-chapter-01": [
    "N-VM.1",
    "N-VM.2",
    "N-VM.3",
    "N-VM.4",
    "N-VM.5",
    "N-VM.6",
    "N-VM.7",
    "N-VM.8",
    "N-VM.9",
    "N-VM.10",
    "N-VM.11",
    "N-VM.12",
    "A-REI.8",
    "A-REI.9"
  ], // VectorLab, MatrixLab
  // 12-B.1 Polynomial Structure and Behavior — complex roots are polynomial
  // behaviour; the plane is the prerequisite the bench builds first.
  "us-ca-math-s6-chapter-02": ["N-CN.1", "N-CN.2", "N-CN.3", "N-CN.4", "N-CN.5", "N-CN.6", "N-CN.7", "N-CN.9"] // ComplexPlaneLab, ComplexArithmeticLab
};

function isCaliforniaTopic(topic: Topic) {
  return topic.curriculumTrack === "US_CA_MATH" || topic.publisher === "US_CA_MATH" || topic.id.startsWith("us-ca-math-");
}

function domainCodeFromStandardId(standardId: string) {
  if (standardId === "Modeling") return "Modeling";
  const parts = standardId.split(".");
  if (parts.length < 2) return standardId;
  // High-school category codes (e.g. "A-APR.1") keep the whole first segment as the domain.
  if (parts[0].includes("-")) return parts[0];
  // K-8 codes are "<grade>.<DOMAIN>[.<cluster>].<number>" (canonical CCSS includes the
  // cluster letter, e.g. "K.CC.A.1"); the domain is always the first two segments.
  return `${parts[0]}.${parts[1]}`;
}

function extractCaliforniaStandardIds(topic: Topic) {
  const text = [topic.description.en, topic.description.zh, topic.description.zhHans ?? ""].join(" ");
  // Matches canonical CCSS with the optional cluster letter (e.g. 'K.CC.A.1', '3.NF.A.2a')
  // as well as the legacy cluster-letter-less form ('K.CC.1'), plus HS category codes.
  const matches =
    text.match(/\b(?:K|\d{1,2})\.[A-Z]{1,3}(?:\.[A-Z])?\.\d+[a-z]?\b|\b[A-Z]-[A-Z]{1,4}\.\d+[a-z]?\b|\bModeling\b/g) ??
    [];
  return Array.from(new Set(matches));
}

function clusterAlignmentFromTopicId(topicId: string) {
  const match = topicId.match(/^us-ca-math-(?:k|p[1-5])-(k|[1-5])-([a-z]+)-(.+)$/);
  if (!match) return null;

  const gradeCode = match[1] === "k" ? "K" : match[1];
  const domainId = `${gradeCode}.${match[2].toUpperCase()}`;
  const clusterId = `${domainId}.${match[3]}`;
  const cluster = californiaClusterStandards[clusterId];
  return cluster ? { clusterId, ...cluster } : null;
}

function californiaFallbackDomainCode(topic: Topic, templateId: VisualizationTemplateId) {
  const text = [topic.id, topic.title.en, topic.description.en].join(" ").toLowerCase();
  const gradeDomainPrefix: Partial<Record<GradeId, string>> = {
    K: "K",
    P1: "1",
    P2: "2",
    P3: "3",
    P4: "4",
    P5: "5",
    P6: "6",
    S1: "7",
    S2: "8"
  };
  const k8Prefix = gradeDomainPrefix[topic.grade];

  if (k8Prefix && topic.grade !== "S2") {
    if (k8Prefix === "6" || k8Prefix === "7") {
      if (/\bratio|proportion|percent|rate/.test(text)) return `${k8Prefix}.RP`;
      if (/\brational|number system|number line|integer|signed/.test(text)) return `${k8Prefix}.NS`;
      if (/\bexpression|equation|algebra|variable|linear/.test(text)) return `${k8Prefix}.EE`;
      if (/\bdata|statistics|probability|sampling|inference/.test(text)) return `${k8Prefix}.SP`;
      if (/\bgeometry|measure|area|volume|scale|circle|angle/.test(text)) return `${k8Prefix}.G`;
      return `${k8Prefix}.EE`;
    }
    if (/\bfraction|decimal/.test(text) && ["3", "4", "5"].includes(k8Prefix)) return `${k8Prefix}.NF`;
    if (/\bplace value|base ten|multi-digit|decimal|number system|rational number|number line/.test(text)) return `${k8Prefix}.NBT`;
    if (/\bexpression|equation|algebra|variable|operation|add|subtract|multiplication|division|factor|pattern/.test(text)) return `${k8Prefix}.OA`;
    if (/\bmeasure|data|time|money|perimeter|area|volume|angle|statistics/.test(text)) return `${k8Prefix}.MD`;
    if (/\bshape|geometry|coordinate|triangle|circle|line|volume/.test(text)) return `${k8Prefix}.G`;
  }

  if (topic.grade === "S2") {
    if (/\bfunction|rate of change/.test(text) || templateId === "function-family") return "8.F";
    if (/\bdata|bivariate|scatter/.test(text)) return "8.SP";
    if (/\bgeometry|transform|similarity|pythagorean|coordinate/.test(text)) return "8.G";
    return "8.EE";
  }

  if (/\bdecision|expected value|probability decision/.test(text)) return "S-MD";
  if (/\binference|sampling|claims/.test(text)) return "S-IC";
  if (/\bprobability|conditional/.test(text)) return "S-CP";
  if (/\bdata|statistics|residual|distribution/.test(text)) return "S-ID";
  if (/\bcircle/.test(text)) return "G-C";
  if (/\bsimilarity|right-triangle|trig/.test(text) && templateId !== "trig-unit-wave") return "G-SRT";
  if (/\bcongruence|proof/.test(text)) return "G-CO";
  if (/\bcoordinate geometry|conic/.test(text)) return "G-GPE";
  if (/\bgeometry|volume|dimension/.test(text)) return "G-GMD";
  if (/\btrigonometric|trig|sine|cosine/.test(text) || templateId === "trig-unit-wave") return "F-TF";
  if (/\bexponential|logarithmic|linear|quadratic/.test(text)) return "F-LE";
  if (/\bfunction transformation|inverse|sequence/.test(text)) return "F-BF";
  if (/\bfunction|rate/.test(text)) return "F-IF";
  if (/\bpolynomial/.test(text)) return "A-APR";
  if (/\bstructure|quadratic/.test(text)) return "A-SSE";
  if (/\bequation|inequality|algebra/.test(text)) return "A-CED";
  if (/\bcomplex/.test(text)) return "N-CN";
  if (/\bvector|matrix/.test(text)) return "N-VM";
  if (/\bquantity|unit|precision/.test(text)) return "N-Q";
  if (/\bmodel/.test(text)) return "Modeling";
  return "F-IF";
}

function californiaAlignmentForTopic(topic: Topic, templateId: VisualizationTemplateId): VisualizationCaliforniaAlignment | undefined {
  if (!isCaliforniaTopic(topic)) return undefined;

  const explicitStandardIds = extractCaliforniaStandardIds(topic);
  const cluster = clusterAlignmentFromTopicId(topic.id);
  const domainCode =
    californiaChapterDomainOverrides[topic.id] ??
    (explicitStandardIds.length > 0 ? domainCodeFromStandardId(explicitStandardIds[0]) : undefined) ??
    cluster?.domainId ??
    californiaFallbackDomainCode(topic, templateId);
  const domain = californiaDomainAlignments[domainCode] ?? californiaDomainAlignments.Modeling;
  // A chapter description that only names its strand ("...Chapter 4 strand for
  // Modeling...") scrapes to the bare "Modeling" token. That must not outrank the
  // chapter's declared domain: it is how "9-D.1 Coordinate Geometry Methods"
  // (G-GPE) and "12-A.1 Quantities, Units, and Precision" (N-Q) came to claim a
  // single "Modeling" pseudo-standard and none of their own CCSS standards.
  // A chapter whose declared domain really is Modeling keeps the scraped value.
  const scrapedOnlyModeling = explicitStandardIds.length === 1 && explicitStandardIds[0] === "Modeling";
  const chapterOutranksModelingScrape = scrapedOnlyModeling && domainCode !== "Modeling";
  const resolvedStandardIds =
    explicitStandardIds.length > 0 && !chapterOutranksModelingScrape
      ? explicitStandardIds
      : (cluster?.standardIds ?? domain.standardIds);
  const standardIds = [
    ...new Set([
      ...resolvedStandardIds,
      // The scraped "Modeling" tag is kept alongside the domain it no longer
      // replaces, so the modeling benches that join on it stay attached.
      ...(chapterOutranksModelingScrape ? explicitStandardIds : []),
      ...(californiaChapterSupplementalStandards[topic.id] ?? [])
    ])
  ];

  return {
    curriculumTrack: "US_CA_MATH",
    sourcePolicy: californiaSourcePolicy,
    standardIds,
    domainId: `CA.CCSS.Math.${domainCode}`,
    domainTitle: domain.domainTitle,
    clusterId: cluster?.clusterId,
    capabilitySummary: domain.capabilitySummary
  };
}

function californiaSafeguardForTopic(
  topic: Topic,
  templateId: VisualizationTemplateId,
  qaProfile: VisualizationQaProfile,
  moduleId: VisualizationLabModuleId
): VisualizationSafeguardReview | undefined {
  if (!isCaliforniaTopic(topic)) return undefined;

  // The review must describe what actually renders (2026-08-25 truthfulness
  // pass): signature topics show a Claude Math Visual canvas bench, template
  // topics the deterministic SVG renderer.
  const rendersSignatureBench = moduleId === "signature-lab";

  const hasApproximationRisk =
    qaProfile === "simulation" ||
    qaProfile === "graph-heavy" ||
    templateId === "probability-simulation" ||
    templateId === "statistics-distribution" ||
    templateId === "calculus-rate-area" ||
    templateId === "function-family" ||
    templateId === "function-graph";

  return {
    status: "reviewed",
    verdict: "concerns",
    generator: "heuristic",
    reviewedAt: rendersSignatureBench ? "2026-08-25T00:00:00.000Z" : "2026-06-19T00:00:00.000Z",
    summary: rendersSignatureBench
      ? localizedText(
          "Heuristic review found this California math canvas bench — a ported Claude Math Visual lab with a mutation-tested audit proof — suitable for guided practice, but teacher approval is still required before public, code, snapshot, or API sharing.",
          "啟發式審查認為這個 California 數學畫布實驗（移植自 Claude Math Visual、附帶變異測試審計證明）適合引導練習，但在公開、程式碼、快照或 API 分享前仍需要教師批准。",
          "启发式审查认为这个 California 数学画布实验（移植自 Claude Math Visual、附带变异测试审计证明）适合引导练习，但在公开、代码、快照或 API 分享前仍需要教师批准。"
        )
      : localizedText(
          "Heuristic review found this deterministic California math SVG suitable for guided practice, but teacher approval is still required before public, code, snapshot, or API sharing.",
          "啟發式審查認為這個確定性 California 數學 SVG 適合引導練習，但在公開、程式碼、快照或 API 分享前仍需要教師批准。",
          "启发式审查认为这个确定性 California 数学 SVG 适合引导练习，但在公开、代码、快照或 API 分享前仍需要教师批准。"
        ),
    dimensions: [
      {
        label: "Age Appropriateness",
        rating: "pass",
        findings: localizedText(
          "Grade, topic, controls, and notation are inherited from the California topic record and stay within a compact practice-lab interaction.",
          "年級、主題、控制項與符號來自 California 主題記錄，互動保持在精簡練習實驗範圍內。",
          "年级、主题、控件与符号来自 California 主题记录，互动保持在精简练习实验范围内。"
        )
      },
      {
        label: "Factual Accuracy",
        rating: "pass",
        findings: rendersSignatureBench
          ? localizedText(
              "The bench ships with an audit script that slices the model out of the shipped file, re-derives every quiz key, and proves the calibration stamp holds exact arithmetic.",
              "此實驗附帶審計腳本：從交付檔案切出模型、重新推導每個測驗答案，並證明校準判定使用精確算術。",
              "此实验附带审计脚本：从交付文件切出模型、重新推导每个测验答案，并证明校准判定使用精确算术。"
            )
          : localizedText(
              "The SVG uses deterministic template fields, formulas, labels, and scale transforms rather than generated script.",
              "SVG 使用確定性的模板欄位、公式、標籤與尺度轉換，而不是生成式腳本。",
              "SVG 使用确定性的模板字段、公式、标签与尺度转换，而不是生成式脚本。"
            )
      },
      {
        label: "Potential Misconceptions",
        rating: hasApproximationRisk ? "minor" : "pass",
        findings: hasApproximationRisk
          ? localizedText(
              "Graphs, distributions, simulations, or scaled shapes may look exact even though they are visual models for reasoning.",
              "圖像、分佈、模擬或縮放圖形可能看似精確，但它們是用於推理的視覺模型。",
              "图像、分布、模拟或缩放图形可能看似精确，但它们是用于推理的视觉模型。"
            )
          : localizedText("The main model makes the represented relationship visible without adding a likely false rule."),
        recommendation: hasApproximationRisk
          ? localizedText(
              "Use the Read me first note to remind students which values are exact, approximate, or illustrative.",
              "使用 Read me first 提醒學生哪些值是精確、近似或示意。",
              "使用 Read me first 提醒学生哪些值是精确、近似或示意。"
            )
          : undefined
      },
      {
        label: "Cultural Sensitivity",
        rating: "pass",
        findings: localizedText("No scenario names, stereotypes, or culturally loaded examples are introduced in this visualization metadata.")
      },
      {
        label: "Pedagogical Soundness",
        rating: "pass",
        findings: rendersSignatureBench
          ? localizedText(
              "The bench teaches through staged steps — predict, check, then a final calibration — keeping one mathematical relationship in focus with dials that unlock per step.",
              "實驗以分段步驟教學——先預測、再檢查、最後校準——聚焦一個數學關係，旋鈕按步驟解鎖。",
              "实验以分段步骤教学——先预测、再检查、最后校准——聚焦一个数学关系，旋钮按步骤解锁。"
            )
          : localizedText(
              "The activity keeps one mathematical relationship in focus and links learner controls to visible SVG marks and live feedback.",
              "活動聚焦一個數學關係，並把學習者控制項連到可見 SVG 標記與即時回饋。",
              "活动聚焦一个数学关系，并把学习者控件连到可见 SVG 标记与即时反馈。"
            )
      },
      {
        label: "Safety & Harm",
        rating: "pass",
        findings: localizedText("The lab is mathematics-only and does not introduce procedural real-world safety instructions or private data collection.")
      },
      {
        label: "Bias & Fairness",
        rating: "pass",
        findings: localizedText("The interaction uses neutral mathematical representations and does not vary feedback by learner identity.")
      },
      {
        label: "Inclusivity & Accessibility",
        rating: "minor",
        findings: rendersSignatureBench
          ? localizedText(
              "The bench draws on a canvas with a labelled surface and named staged controls, but a canvas interior exposes fewer semantic marks than an SVG template, so a teacher should still check screen-reader flow, color contrast, and mobile fit before approval.",
              "實驗在畫布上繪製，附有標籤表面與具名分段控制項，但畫布內部的語義標記少於 SVG 模板，教師批准前仍應檢查螢幕閱讀器流程、色彩對比與手機適配。",
              "实验在画布上绘制，附有标签表面与具名分段控件，但画布内部的语义标记少于 SVG 模板，教师批准前仍应检查屏幕阅读器流程、色彩对比与手机适配。"
            )
          : localizedText(
              "The component includes responsive SVG labels and named controls, but a teacher should still check screen-reader flow, color contrast, and mobile label fit before approval.",
              "元件包含響應式 SVG 標籤與具名控制項，但教師批准前仍應檢查螢幕閱讀器流程、色彩對比與手機標籤適配。",
              "组件包含响应式 SVG 标签与具名控件，但教师批准前仍应检查屏幕阅读器流程、色彩对比与手机标签适配。"
            ),
        recommendation: localizedText(
          "Verify the lab on the target classroom devices before approving external sharing.",
          "批准外部分發前，請在目標課堂裝置上驗證實驗。",
          "批准外部分发前，请在目标课堂设备上验证实验。"
        )
      }
    ]
  };
}

function californiaStudentNoteForTopic(
  topic: Topic,
  alignment: VisualizationCaliforniaAlignment,
  templateId: VisualizationTemplateId,
  moduleId: VisualizationLabModuleId
): VisualizationStudentNote {
  const standards = alignment.standardIds.slice(0, 4).join(", ");
  const moreStandards = alignment.standardIds.length > 4 ? "..." : "";
  const modelType = templateMetadata[templateId].category.en.toLowerCase();

  // Signature topics render a Claude Math Visual canvas bench, so the note
  // describes staged steps and exact arithmetic instead of the template's
  // slider model (2026-08-25 truthfulness pass).
  if (moduleId === "signature-lab") {
    return {
      authorId: "S06-visualization-safeguard",
      updatedAt: "2026-08-25T00:00:00.000Z",
      text: {
        en: `Read me first: This interactive math bench is a California standards-aligned lab for ${topic.title.en}. It supports ${alignment.domainId} (${standards}${moreStandards}) and teaches through staged steps — predict, check, then calibrate. Values are exact unless labelled as rounded; do not treat the picture as a complete California course or official standards text.`,
        zh: `Read me first：這個互動數學實驗是面向 ${topic.title.zh} 的 California 標準對齊實驗，支援 ${alignment.domainId}（${standards}${moreStandards}），以分段步驟教學——先預測、再檢查、最後校準。除標明為約數外，數值均為精確值；不要把圖像視為完整 California 課程或官方標準原文。`,
        zhHans: `Read me first：这个互动数学实验是面向 ${simplifiedCatalogText(topic.title)} 的 California 标准对齐实验，支持 ${alignment.domainId}（${standards}${moreStandards}），以分段步骤教学——先预测、再检查、最后校准。除标明为约数外，数值均为精确值；不要把图像视为完整 California 课程或官方标准原文。`
      }
    };
  }

  return {
    authorId: "S06-visualization-safeguard",
    updatedAt: "2026-06-19T00:00:00.000Z",
    text: {
      en: `Read me first: This ${modelType} is a deterministic California standards-aligned practice visualization for ${topic.title.en}. It supports ${alignment.domainId} (${standards}${moreStandards}) with MAIS-authored wording. Use the sliders to reason about the relationship; do not treat the picture as a complete California course, official standards text, or proof that approximate visual values are exact.`,
      zh: `Read me first：這個${templateMetadata[templateId].category.zh}是面向 ${topic.title.zh} 的確定性 California 標準對齊練習視覺化，支援 ${alignment.domainId}（${standards}${moreStandards}），文字由 MAIS 自寫。請用滑桿推理關係；不要把圖像視為完整 California 課程、官方標準原文，或把近似視覺值當成精確值。`,
      zhHans: `Read me first：这个${simplifiedCatalogText(templateMetadata[templateId].category)}是面向 ${simplifiedCatalogText(topic.title)} 的确定性 California 标准对齐练习可视化，支持 ${alignment.domainId}（${standards}${moreStandards}），文字由 MAIS 自写。请用滑块推理关系；不要把图像视为完整 California 课程、官方标准原文，或把近似视觉值当成精确值。`
    }
  };
}

function visualizationTrackForTopic(topic: Topic): VisualizationCurriculumTrack {
  if (topic.id.startsWith("pep-primary-")) return "MAINLAND_PEP_PRIMARY";
  if (topic.id.startsWith("pep-junior-")) return "MAINLAND_PEP_JUNIOR";
  if (topic.id.startsWith("pep-high-")) return "MAINLAND_PEP_HIGH";
  if (topic.id.startsWith("hjb-")) return "MAINLAND_HJB";
  if (topic.id.startsWith("bnu-")) return "MAINLAND_BNU";
  if (topic.id.startsWith("us-")) return "US";
  return "HK";
}

function lowerTopicText(topic: Topic) {
  return [
    topic.id,
    topic.title.en,
    topic.title.zh,
    topic.title.zhHans,
    topic.description.en,
    topic.description.zh,
    topic.description.zhHans
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function templateForTopic(topic: Topic): VisualizationTemplateId {
  const topicTemplateOverride = topicTemplateOverrides[topic.id];
  if (topicTemplateOverride) return topicTemplateOverride;

  const text = lowerTopicText(topic);
  const titleText = [topic.id, topic.title.en, topic.title.zh, topic.title.zhHans].filter(Boolean).join(" ").toLowerCase();
  const primaryGrade = /^(K|P[1-6])$/.test(topic.grade);

  if (/\bcomplex\b|\bimaginary\b|複數|复数/.test(text)) return "complex-plane";
  if (/\bcalculus\b|\bderivative\b|\bderivatives\b|\bdifferentiation\b|\bintegral\b|\brate of change\b|導|导|微分|微積分|微积分/.test(text)) return "calculus-rate-area";
  if (/\bpaired data\b|\bbivariate\b|\bcorrelation\b|\bregression\b|\btwo-way\b|成對數據|成对数据/.test(text)) return "statistics-distribution";
  if (primaryGrade && /\bcounting sequence\b|\bskip count\b|\bskip counting\b|\bcount to\b|\bcount by\b|數數|数数/.test(text)) return "number-line";
  if (/\bcoordinate plane\b|\bcoordinate methods\b|\bline slope\b|\bline equations\b|\blines and circles\b|\bpoint-to-line distance\b|直线和圆|直線和圓|平面直角坐标系中的直线|平面直角坐標系中的直線|解析几何直线|解析幾何直線/.test(text)) return "coordinate-transform";
  if (
    /\btriangle\b|\btriangles\b|\bquadrilateral\b|\bquadrilaterals\b|\bparallelogram\b|\bparallelograms\b|\brhombus\b|\brectangle\b|\bsquare properties\b|\bpythagorean\b|\bcircle geometry\b|\bcircles?\b|\bsector\b|\barc\b|\bchord\b|三角形|四邊形|四边形|平行四边形|勾股|圆|圓/.test(text) &&
    !/\btrig|\bsine\b|\bcosine\b|三角函數|三角函数/.test(titleText)
  ) {
    return "angle-geometry";
  }
  if (/\btrig|\bsine\b|\bcosine\b|\btangent\b|三角/.test(text)) return "trig-unit-wave";
  if (/\binequal|\binequality\b|\binequalities\b|不等式/.test(text)) return "equation-balance";
  if (/\bquadratic\b|\bparabola\b|\bparabolas\b|二次/.test(text)) return "function-graph";
  if (/\bfunction\b|\bpolynomial\b|\bexponential\b|\blogarithmic\b|\bsequence\b|函數|函数|多項式|多项式|指数|对数|數列|数列/.test(text)) return "function-family";
  if (/\bprobability\b|\brandom\b|\bsample\b|\bcounting principles\b|\bpermutation\b|\bcombination\b|概率|随机|计数/.test(text)) return "probability-simulation";
  if (/\bvolume by layers\b|\bunit cubes?\b|\bcuboids?\b|\bcubes?\b|\bcylinders?\b|\bcones?\b|\bsurface area\b|\bvolume units?\b|\brectangular prism\b|長方體|长方体|正方體|正方体|圓柱|圆柱|圓錐|圆锥|體積|体积/.test(text)) return "array-area";
  if (/\barea of polygons\b|\bplane figure area\b|\bpolygon area\b|\barea reasoning\b|\bbase-height\b|\bcommon polygons\b|多邊形的面積|多边形的面积|平面图形的面积/.test(text)) return "array-area";
  if (
    /\btimes tables\b|\bequal groups\b|\bsharing\b|乘數表|乘数表|等量分組|等量分组|平均分/.test(text) ||
    ((/\bmultiplication\b|\bdivision\b|乘法|除法/.test(titleText)) && !(/\bfraction\b|\bfractions\b|分數|分数/.test(titleText)))
  ) {
    return "array-area";
  }
  if (/\bfraction\b|\bfractions\b|分數|分数/.test(titleText) && !(/\balgebraic\b|\bequation\b|\bequations\b|代數|代数|方程/.test(titleText))) {
    return "fraction-bar";
  }
  if (/\bmoney\b|\btime\b|\bclock\b|\bhour\b|\bminute\b|\bcoin\b|\bcoins\b|\bdollar\b|\bdollars\b|\bpenny\b|\bpennies\b|\bdime\b|\bdimes\b|人民币|金錢|金钱|時間|时间/.test(text)) return "clock-money-data";
  if (/\bstatistics\b|\bdata\b|\baverage\b|\bdistribution\b|\bbivariate\b|\bchart\b|\bregression\b|\bvariance\b|\bclassification\b|\bsorting\b|分類|分类|統計|统计|數據|数据|平均/.test(text)) return "statistics-distribution";
  if (primaryGrade && /\bsolid\b|\bsolids\b|\bthree-dimensional\b|\b3d\b|立体|立體/.test(text)) return "angle-geometry";
  if (/\bnumber line\b|\brational numbers\b|\bintegers\b|\bsigned rational\b|\babsolute value\b|數線|数线|數軸|数轴|有理數|有理数|整數|整数/.test(text)) return "number-line";
  if (/\boperation-law\b|\boperation laws\b|\bequivalent transformations\b|\balgebraic fractions\b|運算律|运算律|代數分式|代数分式/.test(text)) return "equation-balance";
  if (/\bvector\b|\bconic\b|\bsolid\b|\bsolids\b|\bspace geometry\b|\bthree-dimensional\b|\b3d\b|\banalytic geometry\b|\bcircle theorem\b|立体几何|立體幾何|空間幾何|空间几何|向量|圆锥曲线|圓錐曲線/.test(text)) return "vector-conic-3d/strategy-map";
  if (/\bequation\b|\bequations\b|\binequal|\balgebra\b|\bidentity\b|\bsets\b|\blogic\b|\bunknown\b|\bfactorization\b|\bfactorisation\b|方程|不等式|代數|代数|集合|逻辑|因式分解/.test(text)) return "equation-balance";
  if (/\bcoordinate\b|\bcoordinates\b|\btransform\b|\btransformation\b|\btransformations\b|\bslope\b|\bmidpoint\b|\bposition\b|坐標|坐标|位置|變換|变换/.test(text)) return "coordinate-transform";
  if (/\bfraction\b|\bfractions\b|\bpercent\b|\bpercentage\b|\bratio\b|\bratios\b|\bproportion\b|\bproportions\b|\bscale\b|分數|分数|百分|比例|比率/.test(text)) return "fraction-bar";
  if (/area|array|multiplication|division|volume|polygon|perimeter|面積|面积|體積|体积|乘|除|周界|周长|多边形/.test(text)) return "array-area";
  if (/angle|geometry|shape|symmetry|pattern|parallel|perpendicular|幾何|几何|角|圖形|图形|對稱|对称|平行|垂直/.test(text)) return "angle-geometry";
  if (/\bmeasure\b|\bmeasurement\b|\blength\b|\bmass\b|\bcapacity\b|\brate\b|\brates\b|度量|测量|長度|长度|质量|重量|容量|单位/.test(text)) return "measurement-scale";
  if (/place value|base|hundred|thousand|large number|位值|大數|大数|万以内/.test(text)) return "base-ten";

  return "number-line";
}

function trackLabel(track: VisualizationCurriculumTrack): LocalizedText {
  if (track === "MAINLAND_PEP_PRIMARY") return { en: "Mainland PEP primary", zh: "人教版小學", zhHans: "人教版小学" };
  if (track === "MAINLAND_PEP_JUNIOR") return { en: "Mainland China PEP junior secondary", zh: "中國大陸人教版初中", zhHans: "中国大陆人教版初中" };
  if (track === "MAINLAND_PEP_HIGH") return { en: "Mainland PEP high school", zh: "人教版高中", zhHans: "人教版高中" };
  if (track === "MAINLAND_HJB") return { en: "Mainland HJB", zh: "滬教版", zhHans: "沪教版" };
  if (track === "MAINLAND_BNU") return { en: "Mainland BNU", zh: "北師大版", zhHans: "北师大版" };
  if (track === "US") return { en: "US math standards", zh: "美國數學標準", zhHans: "美国数学标准" };
  if (track === "CAPSTONE") return { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" };
  return { en: "Hong Kong P1-S6", zh: "香港小一至中六", zhHans: "香港小学一年级至高三" };
}

function localizedUsTopicTitle(en: string): LocalizedText {
  return { en, zh: en, zhHans: en };
}

function usStandardsFocus(sourceLabel: string, topicName: string, zhModel: string, zhHansModel: string = zhModel): LocalizedText {
  return {
    en: `${sourceLabel} live practice strand for ${topicName}, with MAIS-authored standards-aligned practice questions.`,
    zh: `用${zhModel}模型，觀察${topicName}中的關鍵關係。`,
    zhHans: `用${zhHansModel}模型，观察${topicName}中的关键关系。`
  };
}

function usNcFocus(topicName: string): LocalizedText {
  return {
    en: `North Carolina live pathway for ${topicName}, aligned to North Carolina Standard Course of Study for Mathematics with MAIS-authored safe-card content.`,
    zh: `用美國北卡羅來納${topicName}模型，觀察關鍵關係。`,
    zhHans: `用美国北卡罗来纳${topicName}模型，观察关键关系。`
  };
}

function simplifiedCatalogText(value: LocalizedText) {
  return value.zhHans ?? toPrcSimplifiedText(value.zh);
}

function displayTitleForTopic(topic: Topic): LocalizedText {
  return topicTitleOverrides[topic.id] ?? topic.title;
}

function labTitleForTopic(topic: Topic, track: VisualizationCurriculumTrack): LocalizedText {
  const mainland = track !== "HK" && track !== "US" && track !== "CAPSTONE";
  const title = displayTitleForTopic(topic);
  return {
    en: `${title.en} Visual Lab`,
    zh: mainland ? `${title.zh}可视化实验` : `${title.zh}視覺化實驗`,
    zhHans: `${simplifiedCatalogText(title)}可视化实验`
  };
}

function labDescriptionForTopic(topic: Topic, templateId: VisualizationTemplateId, track: VisualizationCurriculumTrack): LocalizedText {
  const template = templateMetadata[templateId];
  const mainland = track !== "HK" && track !== "US" && track !== "CAPSTONE";
  const title = displayTitleForTopic(topic);

  return {
    en: `Use a focused ${template.category.en.toLowerCase()} model to explore ${title.en.toLowerCase()} with sliders, diagrams, and live feedback.`,
    zh: mainland
      ? `通过${simplifiedCatalogText(template.category)}模型，用滑块、图形和即时反馈探索${simplifiedCatalogText(title)}。`
      : `透過${template.category.zh}模型，用滑桿、圖形和即時回饋探索${title.zh}。`,
    zhHans: `通过${simplifiedCatalogText(template.category)}模型，用滑块、图形和即时反馈探索${simplifiedCatalogText(title)}。`
  };
}

function gradeLabelForTopic(topic: Topic, track: VisualizationCurriculumTrack): LocalizedText {
  const label = trackLabel(track);
  return {
    en: `${topic.grade} · ${label.en}`,
    zh: `${topic.grade} · ${label.zh}`,
    zhHans: `${topic.grade} · ${simplifiedCatalogText(label)}`
  };
}

function labFocusForTopic(topic: Topic, templateId: VisualizationTemplateId, track: VisualizationCurriculumTrack): LocalizedText {
  const template = templateMetadata[templateId];
  const mainland = track === "MAINLAND_PEP_PRIMARY" || track === "MAINLAND_PEP_JUNIOR" || track === "MAINLAND_PEP_HIGH";
  const topicFocusOverride = topicFocusOverrides[topic.id];
  if (topicFocusOverride) return topicFocusOverride;
  const title = displayTitleForTopic(topic);

  return {
    en: topic.description.en,
    zh: mainland
      ? `用${simplifiedCatalogText(template.category)}模型，观察${simplifiedCatalogText(title)}中的关键关系。`
      : `用${template.category.zh}模型，觀察${title.zh}中的關鍵關係。`,
    zhHans: `用${simplifiedCatalogText(template.category)}模型，观察${simplifiedCatalogText(title)}中的关键关系。`
  };
}

function templateConfigForTopic(topic: Topic, templateId: VisualizationTemplateId, track: VisualizationCurriculumTrack): VisualizationTemplateConfig {
  return {
    variant: topic.id,
    focus: labFocusForTopic(topic, templateId, track),
    formula: topicFormulaOverrides[topic.id] ?? formulaForTemplate(templateId),
    xLabel: xLabelForTemplate(templateId),
    yLabel: yLabelForTemplate(templateId),
    accent: accentForTopic(topic)
  };
}

function formulaForTemplate(templateId: VisualizationTemplateId) {
  if (templateId === "number-line") return { en: "start + step = end", zh: "起點 + 步長 = 終點", zhHans: "起点 + 步长 = 终点" };
  if (templateId === "base-ten") return { en: "10 x tens + ones", zh: "10 x 十位 + 個位", zhHans: "10 x 十位 + 个位" };
  if (templateId === "array-area") return { en: "rows x columns = area", zh: "行 x 列 = 面積", zhHans: "行 x 列 = 面积" };
  if (templateId === "clock-money-data") return { en: "time -> angle; data -> bar", zh: "時間 -> 角度；數據 -> 棒形", zhHans: "时间 -> 角度；数据 -> 柱形" };
  if (templateId === "measurement-scale") return { en: "units x scale = measure", zh: "單位數 x 刻度 = 度量", zhHans: "单位数 x 刻度 = 测量值" };
  if (templateId === "angle-geometry") return { en: "angle A +/- angle B", zh: "角 A +/- 角 B", zhHans: "角 A +/- 角 B" };
  if (templateId === "right-triangle-pythagorean") return { en: "a^2 + b^2 = c^2", zh: "a^2 + b^2 = c^2", zhHans: "a^2 + b^2 = c^2" };
  if (templateId === "coordinate-transform") return { en: "(x, y) -> (x', y')", zh: "(x, y) -> (x', y')", zhHans: "(x, y) -> (x', y')" };
  if (templateId === "equation-balance") return { en: "left side = right side", zh: "左邊 = 右邊", zhHans: "左边 = 右边" };
  if (templateId === "function-graph") return { en: "y = ax^2 + bx + c", zh: "y = ax^2 + bx + c" };
  if (templateId === "function-family") return { en: "f(x)", zh: "f(x)" };
  if (templateId === "complex-plane") return { en: "z = a + bi", zh: "z = a + bi" };
  if (templateId === "trig-unit-wave") return { en: "y = a sin(bx + c)", zh: "y = a sin(bx + c)" };
  if (templateId === "calculus-rate-area") return { en: "dy/dx", zh: "dy/dx" };
  if (templateId === "fraction-bar") return { en: "part / whole", zh: "部分 / 整體", zhHans: "部分 / 整体" };
  if (templateId === "probability-simulation") return { en: "frequency / trials", zh: "頻數 / 試驗次數", zhHans: "频数 / 试验次数" };
  if (templateId === "statistics-distribution") return { en: "mean +/- spread", zh: "平均數 +/- 離散程度", zhHans: "平均数 +/- 离散程度" };
  if (templateId === "vector-conic-3d/strategy-map") return { en: "vector -> conic -> volume", zh: "向量 -> 圓錐曲線 -> 體積", zhHans: "向量 -> 圆锥曲线 -> 体积" };
  return undefined;
}

function xLabelForTemplate(templateId: VisualizationTemplateId) {
  if (templateId === "complex-plane") return "Re";
  if (templateId.includes("function") || templateId.includes("trig") || templateId.includes("calculus")) return "x";
  if (templateId === "statistics-distribution" || templateId === "probability-simulation") return "trial";
  return "model";
}

function yLabelForTemplate(templateId: VisualizationTemplateId) {
  if (templateId === "complex-plane") return "Im";
  if (templateId.includes("function") || templateId.includes("trig") || templateId.includes("calculus")) return "y";
  if (templateId === "statistics-distribution" || templateId === "probability-simulation") return "frequency";
  return "value";
}

function accentForTopic(topic: Topic) {
  const palette = ["#22d3ee", "#a3e635", "#facc15", "#fb7185", "#c084fc", "#38bdf8", "#34d399", "#f472b6"];
  const score = Array.from(topic.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[score % palette.length];
}

function createTopicLab(topic: Topic): FeaturedLabDefinition {
  const curriculumTrack = visualizationTrackForTopic(topic);
  const templateId = templateForTopic(topic);
  const template = templateMetadata[templateId];
  const premiumLaunch = isPremiumThreeDLaunchLab(topic.id);
  const standardThreeDLab = isStandardThreeDLab(topic.id);
  // Topics with a curated signature lab render that bench; every other topic
  // keeps the shared template renderer untouched.
  const moduleId = hasSignatureLab(topic.id) ? signatureModuleId : configuredModuleId;
  const californiaAlignment = californiaAlignmentForTopic(topic, templateId);
  const safeguard = californiaSafeguardForTopic(topic, templateId, template.qaProfile, moduleId);
  const threeDFamilyId = familyForVisualizationLab(topic.id, templateId);
  const launchRegionalPriority = regionalPriorityForThreeDLaunchLab(topic.id);
  const threeD: ThreeDVisualizationMetadata = {
    enabled: premiumLaunch || standardThreeDLab,
    fallbackTemplateId: templateId,
    familyId: threeDFamilyId,
    coverageTier: premiumLaunch ? "premium-3d" : "standard-3d",
    premiumLaunch,
    regionalPriority: launchRegionalPriority ??
      (curriculumTrack === "MAINLAND_PEP_PRIMARY" ||
      curriculumTrack === "MAINLAND_PEP_JUNIOR" ||
      curriculumTrack === "MAINLAND_PEP_HIGH" ||
      curriculumTrack === "MAINLAND_BNU" ||
      curriculumTrack === "MAINLAND_HJB"
        ? "mainland"
        : curriculumTrack === "US" && topic.publisher === "US_CA_MATH"
          ? "california"
          : curriculumTrack === "HK"
            ? "hong-kong"
            : undefined)
  };

  return {
    labId: topic.id,
    grade: topic.grade,
    title: labTitleForTopic(topic, curriculumTrack),
    description: labDescriptionForTopic(topic, templateId, curriculumTrack),
    category: template.category,
    gradeLabel: gradeLabelForTopic(topic, curriculumTrack),
    topicId: topic.id,
    curriculumTrack,
    publisher: topic.publisher ?? topic.curriculumProfile?.publisher,
    californiaAlignment,
    primaryForTopic: true,
    analyticsSource: template.analyticsSource,
    moduleId,
    templateId,
    templateConfig: templateConfigForTopic(topic, templateId, curriculumTrack),
    threeD,
    qaProfile: template.qaProfile,
    safeguard,
    studentNote: californiaAlignment ? californiaStudentNoteForTopic(topic, californiaAlignment, templateId, moduleId) : undefined
  };
}

const capstoneLabDefinitions: FeaturedLabDefinition[] = [
  {
    labId: "capstone-primary-number-sense-bridge",
    grade: "P6",
    title: { en: "Primary Number Sense Bridge", zh: "小學數感綜合橋", zhHans: "小学数感综合桥" },
    description: { en: "Connect counting, place value, operations, fractions, and percent on one scalable model.", zh: "把數數、位值、運算、分數和百分數放到同一個可縮放模型中。", zhHans: "把数数、数位、运算、分数和百分数放到同一个可缩放模型中。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "P6 · Capstone", zh: "小六 · 綜合", zhHans: "小学六年级 · 综合" },
    topicId: "p6-pre-secondary-problem-solving",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "function-model",
    moduleId: configuredModuleId,
    templateId: "fraction-bar",
    templateConfig: { variant: "capstone-primary-number-sense", focus: { en: "Number sense across primary mathematics", zh: "小學數學的數感銜接", zhHans: "小学数学的数感衔接" }, formula: { en: "fraction = decimal = percent", zh: "分數 = 小數 = 百分數", zhHans: "分数 = 小数 = 百分数" }, accent: "#22d3ee" },
    threeD: {
      enabled: true,
      fallbackTemplateId: "fraction-bar",
      familyId: familyForVisualizationTemplate("fraction-bar"),
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
    qaProfile: "standard"
  },
  {
    labId: "capstone-primary-measurement-proportion-bridge",
    grade: "P6",
    title: { en: "Measurement and Proportion Bridge", zh: "度量與比例綜合橋", zhHans: "测量与比例综合桥" },
    description: { en: "Compare length, area, volume, rate, ratio, and scale with linked sliders.", zh: "用連動滑桿比較長度、面積、體積、率、比例和比例尺。", zhHans: "用联动滑块比较长度、面积、体积、率、比例和比例尺。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "P6 · Capstone", zh: "小六 · 綜合", zhHans: "小学六年级 · 综合" },
    topicId: "p6-ratio-proportion",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "geometry",
    moduleId: configuredModuleId,
    templateId: "measurement-scale",
    templateConfig: { variant: "capstone-measurement-proportion", focus: { en: "Measurement units and proportional reasoning", zh: "度量單位與比例推理", zhHans: "测量单位与比例推理" }, formula: { en: "measure -> ratio -> scale factor", zh: "度量 -> 比例 -> 比例因子", zhHans: "测量 -> 比例 -> 比例因子" }, accent: "#34d399" },
    threeD: {
      enabled: true,
      fallbackTemplateId: "measurement-scale",
      familyId: familyForVisualizationTemplate("measurement-scale"),
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
    qaProfile: "geometry-heavy"
  },
  {
    labId: "capstone-junior-algebra-geometry-bridge",
    grade: "S3",
    title: { en: "Junior Algebra Geometry Bridge", zh: "初中代數幾何綜合橋", zhHans: "初中代数几何综合桥" },
    description: { en: "Move between expressions, equations, coordinates, transformations, and geometric constraints.", zh: "在代數式、方程、坐標、變換和幾何限制之間切換。", zhHans: "在代数式、方程、坐标、变换和几何限制之间切换。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "S3 · Capstone", zh: "中三 · 綜合", zhHans: "初三 · 综合" },
    topicId: "mixed-problem-solving",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "coordinate-plane",
    moduleId: configuredModuleId,
    templateId: "coordinate-transform",
    templateConfig: { variant: "capstone-junior-algebra-geometry", focus: { en: "Junior algebra, geometry, and graph strategy", zh: "初中代數、幾何與圖像策略", zhHans: "初中代数、几何与图象策略" }, formula: { en: "graph + constraint", zh: "圖像 + 條件", zhHans: "图象 + 条件" }, xLabel: "x", yLabel: "y", accent: "#facc15" },
    threeD: {
      enabled: true,
      fallbackTemplateId: "coordinate-transform",
      familyId: familyForVisualizationTemplate("coordinate-transform"),
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
    qaProfile: "graph-heavy"
  },
  {
    labId: "capstone-senior-function-calculus-stats-bridge",
    grade: "S6",
    title: { en: "Senior Function Calculus Statistics Bridge", zh: "高中函數微積分統計綜合橋", zhHans: "高中函数微积分统计综合桥" },
    description: { en: "Connect model choice, gradients, accumulated area, distributions, and exam interpretation.", zh: "連繫模型選擇、斜率、累積面積、分佈和考試詮釋。", zhHans: "联系模型选择、斜率、累积面积、分布和考试解释。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "S6 · Capstone", zh: "中六 · 綜合", zhHans: "高三 · 综合" },
    topicId: "statistics-s6",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "calculus-stats",
    moduleId: configuredModuleId,
    templateId: "calculus-rate-area",
    templateConfig: { variant: "capstone-senior-functions", focus: { en: "Senior model interpretation across functions, calculus, and statistics", zh: "高中函數、微積分與統計的模型詮釋", zhHans: "高中函数、微积分与统计的模型解释" }, formula: { en: "model -> rate -> distribution", zh: "模型 -> 變化率 -> 分佈", zhHans: "模型 -> 变化率 -> 分布" }, xLabel: "x", yLabel: "y", accent: "#c084fc" },
    threeD: {
      enabled: true,
      fallbackTemplateId: "calculus-rate-area",
      familyId: familyForVisualizationTemplate("calculus-rate-area"),
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
    qaProfile: "graph-heavy"
  },
  {
    labId: "capstone-hk-mainland-crosswalk-explorer",
    grade: "S6",
    title: { en: "HK and Mainland Crosswalk Explorer", zh: "香港與內地課程銜接探索器", zhHans: "香港与内地课程衔接探索器" },
    description: { en: "Compare how parallel topics appear across HK and Mainland PEP pathways.", zh: "比較相近知識點在香港與人教版路線中的呈現方式。", zhHans: "比较相近知识点在香港与人教版路线中的呈现方式。" },
    category: { en: "Curriculum crosswalk", zh: "課程對照", zhHans: "课程对照" },
    gradeLabel: { en: "P1-S6 · Crosswalk", zh: "小一至中六 · 對照", zhHans: "小学一年级至高三 · 对照" },
    topicId: "exam-revision",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "learning-path",
    moduleId: configuredModuleId,
    templateId: "vector-conic-3d/strategy-map",
    templateConfig: { variant: "capstone-curriculum-crosswalk", focus: { en: "Cross-track curriculum comparison and strategy selection", zh: "跨課程對照與策略選擇", zhHans: "跨课程对照与策略选择" }, formula: { en: "topic -> model -> practice", zh: "課題 -> 模型 -> 練習", zhHans: "课题 -> 模型 -> 练习" }, accent: "#fb7185" },
    threeD: {
      enabled: true,
      fallbackTemplateId: "vector-conic-3d/strategy-map",
      familyId: "three-curriculum-crosswalk-map",
      coverageTier: "capstone-3d",
      premiumLaunch: true,
      regionalPriority: "cross-region"
    },
    qaProfile: "geometry-heavy"
  }
];

export const visualizationLabCatalog: FeaturedLabDefinition[] = [
  ...topics.map(createTopicLab).filter(isVisibleVisualizationLab),
  ...capstoneLabDefinitions.filter(isVisibleVisualizationLab)
];

export const primaryVisualizationLabs = visualizationLabCatalog.filter((lab) => lab.primaryForTopic);
export const capstoneVisualizationLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "CAPSTONE");
export const visualizationLabCount = visualizationLabCatalog.length;
export const visualizationTemplateIds = [...visualizationTemplateIdValues] as VisualizationTemplateId[];
export const visualizationTrackLabels: Record<VisualizationCurriculumTrack, LocalizedText> = {
  HK: trackLabel("HK"),
  US: trackLabel("US"),
  MAINLAND_PEP_PRIMARY: trackLabel("MAINLAND_PEP_PRIMARY"),
  MAINLAND_PEP_JUNIOR: trackLabel("MAINLAND_PEP_JUNIOR"),
  MAINLAND_PEP_HIGH: trackLabel("MAINLAND_PEP_HIGH"),
  MAINLAND_HJB: trackLabel("MAINLAND_HJB"),
  MAINLAND_BNU: trackLabel("MAINLAND_BNU"),
  CAPSTONE: trackLabel("CAPSTONE")
};

export const visualizationLabByLabId = new Map(visualizationLabCatalog.map((lab) => [lab.labId, lab]));
export const primaryVisualizationLabByTopicId = new Map(primaryVisualizationLabs.map((lab) => [lab.topicId, lab]));
export const visualizationLabelsByTopicId: Record<string, string> = Object.fromEntries(
  primaryVisualizationLabs.map((lab) => [lab.topicId, lab.title.en.replace(/ Visual Lab$/, "")])
);

export function getVisualizationLabByLabId(labId: string | null | undefined) {
  return labId ? visualizationLabByLabId.get(labId) ?? null : null;
}

export function getPrimaryVisualizationLabForTopic(topicId: string | null | undefined) {
  return topicId ? primaryVisualizationLabByTopicId.get(topicId) ?? null : null;
}

export function getVisualizationLabsForGrade(grade: GradeId, track: VisualizationTrackFilter = "all") {
  return visualizationLabCatalog.filter((lab) => lab.grade === grade && (track === "all" || lab.curriculumTrack === track));
}

export function filterVisualizationLabsByTrack(labs: FeaturedLabDefinition[], track: VisualizationTrackFilter) {
  if (track === "all") return labs;
  return labs.filter((lab) => lab.curriculumTrack === track);
}

export const gradeLabGroups: GradeLabGroupDefinition[] = gradeIds.map((grade) => {
  const gradeMeta = grades.find((candidate) => candidate.id === grade);
  const labs = visualizationLabCatalog.filter((lab) => lab.grade === grade);

  return {
    grade,
    name: gradeMeta?.name ?? { en: grade, zh: grade },
    focus: gradeMeta?.focus ?? { en: "Interactive mathematics models", zh: "互動數學模型" },
    accent: gradeMeta?.color ?? "from-cyan-300 to-blue-500",
    labs
  };
});
