import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import {
  familyForVisualizationLab,
  isPremiumThreeDLaunchLab,
  regionalPriorityForThreeDLaunchLab,
  threeDFamilyOverrideByLabId,
  threeDTemplateFamilyMap
} from "@/components/visualizations/three/threeDSceneMath";
import type { ThreeDFamilyId } from "@/components/visualizations/three/threeDSceneTypes";
import type { VisualizationTemplateId } from "@/components/visualizations/visualizationTemplateIds";
import type { GradeId, LearningAnalyticsEventSource, LocalizedText } from "@/types";

type DirectLabTemplateMetadata = {
  accent: string;
  analyticsSource: LearningAnalyticsEventSource;
  category: LocalizedText;
  formula: LocalizedText;
  qaProfile: FeaturedLabDefinition["qaProfile"];
};

const directLabTemplateMetadata: Record<VisualizationTemplateId, DirectLabTemplateMetadata> = {
  "angle-geometry": {
    accent: "#38bdf8",
    analyticsSource: "geometry",
    category: { en: "Geometry", zh: "幾何", zhHans: "几何" },
    formula: { en: "angle + structure", zh: "角度 + 結構", zhHans: "角度 + 结构" },
    qaProfile: "geometry-heavy"
  },
  "array-area": {
    accent: "#a78bfa",
    analyticsSource: "geometry",
    category: { en: "Arrays and area", zh: "陣列與面積", zhHans: "阵列与面积" },
    formula: { en: "rows x columns", zh: "行 x 列", zhHans: "行 x 列" },
    qaProfile: "geometry-heavy"
  },
  "base-ten": {
    accent: "#22d3ee",
    analyticsSource: "coordinate-plane",
    category: { en: "Place value", zh: "位值", zhHans: "位值" },
    formula: { en: "tens + ones", zh: "十位 + 個位", zhHans: "十位 + 个位" },
    qaProfile: "standard"
  },
  "calculus-rate-area": {
    accent: "#fb7185",
    analyticsSource: "calculus-stats",
    category: { en: "Calculus and rates", zh: "微積分與變化率", zhHans: "微积分与变化率" },
    formula: { en: "rate and area", zh: "變化率與面積", zhHans: "变化率与面积" },
    qaProfile: "graph-heavy"
  },
  "clock-money-data": {
    accent: "#f59e0b",
    analyticsSource: "probability",
    category: { en: "Time, money, and data", zh: "時間、金錢與數據", zhHans: "时间、金钱与数据" },
    formula: { en: "time / data", zh: "時間 / 數據", zhHans: "时间 / 数据" },
    qaProfile: "simulation"
  },
  "complex-plane": {
    accent: "#818cf8",
    analyticsSource: "coordinate-plane",
    category: { en: "Complex plane", zh: "複平面", zhHans: "复平面" },
    formula: { en: "a + bi", zh: "a + bi", zhHans: "a + bi" },
    qaProfile: "graph-heavy"
  },
  "coordinate-transform": {
    accent: "#06b6d4",
    analyticsSource: "coordinate-plane",
    category: { en: "Coordinates and transformations", zh: "坐標與變換", zhHans: "坐标与变换" },
    formula: { en: "(x, y) transform", zh: "(x, y) 變換", zhHans: "(x, y) 变换" },
    qaProfile: "graph-heavy"
  },
  "equation-balance": {
    accent: "#2dd4bf",
    analyticsSource: "function-model",
    category: { en: "Algebra balance", zh: "代數天平", zhHans: "代数天平" },
    formula: { en: "left = right", zh: "左邊 = 右邊", zhHans: "左边 = 右边" },
    qaProfile: "standard"
  },
  "fraction-bar": {
    accent: "#34d399",
    analyticsSource: "geometry",
    category: { en: "Fractions and ratio", zh: "分數與比例", zhHans: "分数与比例" },
    formula: { en: "part / whole", zh: "部分 / 整體", zhHans: "部分 / 整体" },
    qaProfile: "standard"
  },
  "function-family": {
    accent: "#60a5fa",
    analyticsSource: "function-model",
    category: { en: "Function families", zh: "函數族", zhHans: "函数族" },
    formula: { en: "f(x) family", zh: "f(x) 函數族", zhHans: "f(x) 函数族" },
    qaProfile: "graph-heavy"
  },
  "function-graph": {
    accent: "#3b82f6",
    analyticsSource: "function-graph",
    category: { en: "Functions and graphs", zh: "函數與圖像", zhHans: "函数与图象" },
    formula: { en: "y = f(x)", zh: "y = f(x)", zhHans: "y = f(x)" },
    qaProfile: "graph-heavy"
  },
  "measurement-scale": {
    accent: "#14b8a6",
    analyticsSource: "geometry",
    category: { en: "Measurement", zh: "度量", zhHans: "测量" },
    formula: { en: "measure and compare", zh: "量度與比較", zhHans: "测量与比较" },
    qaProfile: "standard"
  },
  "number-line": {
    accent: "#22d3ee",
    analyticsSource: "coordinate-plane",
    category: { en: "Number line", zh: "數線", zhHans: "数线" },
    formula: { en: "position on a line", zh: "數線上的位置", zhHans: "数线上的位置" },
    qaProfile: "standard"
  },
  "probability-simulation": {
    accent: "#facc15",
    analyticsSource: "probability",
    category: { en: "Probability simulation", zh: "概率模擬", zhHans: "概率模拟" },
    formula: { en: "frequency / trials", zh: "頻數 / 試驗次數", zhHans: "频数 / 试验次数" },
    qaProfile: "simulation"
  },
  "right-triangle-pythagorean": {
    accent: "#38bdf8",
    analyticsSource: "geometry",
    category: { en: "Right triangles", zh: "直角三角形", zhHans: "直角三角形" },
    formula: { en: "a^2 + b^2 = c^2", zh: "a^2 + b^2 = c^2", zhHans: "a^2 + b^2 = c^2" },
    qaProfile: "geometry-heavy"
  },
  "statistics-distribution": {
    accent: "#f59e0b",
    analyticsSource: "probability",
    category: { en: "Statistics and distributions", zh: "統計與分佈", zhHans: "统计与分布" },
    formula: { en: "center and spread", zh: "中心與離散", zhHans: "中心与离散" },
    qaProfile: "simulation"
  },
  "trig-unit-wave": {
    accent: "#c084fc",
    analyticsSource: "trig-wave",
    category: { en: "Trigonometry", zh: "三角學", zhHans: "三角学" },
    formula: { en: "sin(theta)", zh: "sin(theta)", zhHans: "sin(theta)" },
    qaProfile: "graph-heavy"
  },
  "vector-conic-3d/strategy-map": {
    accent: "#a78bfa",
    analyticsSource: "geometry",
    category: { en: "Advanced geometry strategy", zh: "進階幾何策略", zhHans: "进阶几何策略" },
    formula: { en: "3D structure", zh: "3D 結構", zhHans: "3D 结构" },
    qaProfile: "geometry-heavy"
  }
};

const templateIdByThreeDFamily = Object.fromEntries(
  Object.entries(threeDTemplateFamilyMap).map(([templateId, familyId]) => [familyId, templateId])
) as Partial<Record<ThreeDFamilyId, VisualizationTemplateId>>;

// Snapshot of data/visualizationLabs.ts template assignments for premium
// launch labs. The direct topic route must render the same model the catalog
// route renders; visualizationDiagnostics.premiumSmoke.test.ts asserts sync.
const catalogTemplateByPremiumLabId: Record<string, VisualizationTemplateId> = {
  "advanced-functions": "function-family",
  "bnu-high-s4-三角函数": "trig-unit-wave",
  "bnu-high-s4-三角恒等变换": "trig-unit-wave",
  "bnu-high-s4-复数": "complex-plane",
  "bnu-high-s4-平面向量及其应用": "vector-conic-3d/strategy-map",
  "bnu-high-s4-数学建模活动-二": "trig-unit-wave",
  "bnu-high-s4-立体几何初步": "vector-conic-3d/strategy-map",
  "bnu-high-s5-圆锥曲线": "vector-conic-3d/strategy-map",
  "bnu-high-s5-数学建模活动-三": "vector-conic-3d/strategy-map",
  "bnu-high-s5-空间向量与立体几何": "vector-conic-3d/strategy-map",
  "bnu-high-s6-导数及其应用": "calculus-rate-area",
  "bnu-high-s6-数列": "function-family",
  "bnu-high-s6-高三数列与导数综合复习": "calculus-rate-area",
  "bnu-junior-s1-upper-spatial-figures": "vector-conic-3d/strategy-map",
  "bnu-junior-s3-lower-right-triangle-trigonometry": "trig-unit-wave",
  "bnu-junior-s3-upper-projection-views": "vector-conic-3d/strategy-map",
  "bnu-primary-p6-lower-cylinders-cones": "vector-conic-3d/strategy-map",
  "calculus": "calculus-rate-area",
  "capstone-hk-mainland-crosswalk-explorer": "vector-conic-3d/strategy-map",
  "capstone-junior-algebra-geometry-bridge": "coordinate-transform",
  "capstone-primary-measurement-proportion-bridge": "measurement-scale",
  "capstone-primary-number-sense-bridge": "fraction-bar",
  "capstone-senior-function-calculus-stats-bridge": "calculus-rate-area",
  "differentiation-intro": "calculus-rate-area",
  "functions": "function-graph",
  "hjb-high-s4-三角": "trig-unit-wave",
  "hjb-high-s4-三角函数": "trig-unit-wave",
  "hjb-high-s4-复数": "complex-plane",
  "hjb-high-s4-平面向量": "vector-conic-3d/strategy-map",
  "hjb-high-s5-圆锥曲线": "vector-conic-3d/strategy-map",
  "hjb-high-s5-数列": "function-family",
  "hjb-high-s5-空间向量及其应用": "vector-conic-3d/strategy-map",
  "hjb-high-s5-空间直线与平面": "vector-conic-3d/strategy-map",
  "hjb-high-s5-简单几何体": "vector-conic-3d/strategy-map",
  "hjb-high-s6-三角-向量与解析几何综合": "vector-conic-3d/strategy-map",
  "hjb-high-s6-函数-导数与不等式综合": "calculus-rate-area",
  "hjb-high-s6-圆锥曲线综合复习": "vector-conic-3d/strategy-map",
  "hjb-high-s6-导数及其运用": "calculus-rate-area",
  "hjb-high-s6-数列与计数综合": "function-family",
  "hjb-high-s6-数列综合复习": "function-family",
  "hjb-high-s6-空间向量综合复习": "vector-conic-3d/strategy-map",
  "hjb-high-s6-立体几何与空间向量综合": "vector-conic-3d/strategy-map",
  "hjb-junior-s3-upper-acute-trigonometry": "trig-unit-wave",
  "hjb-primary-p6-lower-cylinder-cone": "vector-conic-3d/strategy-map",
  "mixed-problem-solving": "function-family",
  "pep-high-s4-complex-numbers": "complex-plane",
  "pep-high-s4-plane-vectors": "vector-conic-3d/strategy-map",
  "pep-high-s4-quadratic-inequalities": "function-graph",
  "pep-high-s4-solid-geometry-intro": "vector-conic-3d/strategy-map",
  "pep-high-s4-trigonometry": "trig-unit-wave",
  "pep-high-s5-conics": "vector-conic-3d/strategy-map",
  "pep-high-s5-derivatives": "calculus-rate-area",
  "pep-high-s5-space-vectors": "vector-conic-3d/strategy-map",
  "pep-high-s6-analytic-geometry-synthesis": "vector-conic-3d/strategy-map",
  "pep-high-s6-derivative-synthesis": "calculus-rate-area",
  "pep-high-s6-exam-practice": "function-family",
  "pep-junior-s3-lower-inverse-similarity-trigonometry": "right-triangle-pythagorean",
  "probability-s5": "probability-simulation",
  "quadratic-patterns": "function-graph",
  "trigonometry-basics": "trig-unit-wave",
  "trigonometry-s5": "trig-unit-wave",
  "us-ar-math-g08-chapter-02-functions-and-rate-of-change": "function-family",
  "us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts": "function-graph",
  "us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs": "trig-unit-wave",
  "us-ar-math-g12-chapter-02-polynomial-structure-and-behavior": "function-family",
  "us-ar-math-g12-chapter-04-function-analysis-and-rates": "function-family",
  "us-ar-math-g12-chapter-05-capstone-modeling": "calculus-rate-area",
  "us-fl-math-s2-chapter-02-functions-and-rate-of-change": "function-family",
};

const specialTemplateByLabId: Record<string, VisualizationTemplateId> = {
  "functions": "function-graph",
  "hjb-primary-p6-lower-cylinder-cone": "vector-conic-3d/strategy-map",
  "bnu-primary-p6-lower-cylinders-cones": "vector-conic-3d/strategy-map",
  "pep-high-s4-plane-vectors": "vector-conic-3d/strategy-map"
};

const fastTwoDimensionalDirectLabIds = new Set<string>();

const gradeLabelPrefixByRegion: Record<NonNullable<FeaturedLabDefinition["threeD"]>["regionalPriority"] & string, LocalizedText> = {
  california: { en: "US math standards", zh: "美國數學標準", zhHans: "美国数学标准" },
  "cross-region": { en: "Cross-region pathway", zh: "跨地區路徑", zhHans: "跨地区路径" },
  "hong-kong": { en: "Hong Kong curriculum", zh: "香港課程", zhHans: "香港课程" },
  mainland: { en: "Mainland China curriculum", zh: "中國內地課程", zhHans: "中国内地课程" }
};

/**
 * Hand-authored direct-lab definitions, keyed by lab id. Empty since the
 * 2026-08-25 California premium-3D descope removed the sole entry
 * (`us-ca-math-s4-chapter-05`, whose direct route bypassed the signature
 * system with a configured template lab). California topics render their
 * Claude signature bench on the Visualization Lab page instead, and the old
 * direct URLs redirect there.
 */
const premiumThreeDDirectLabById: Record<string, FeaturedLabDefinition> = {};

function titleCaseToken(token: string) {
  if (/^g\d{2}$/i.test(token)) return `Grade ${Number(token.slice(1))}`;
  if (/^s\d$/i.test(token)) return token.toUpperCase();
  if (/^p\d$/i.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function humanizeLabId(labId: string) {
  return labId
    .split("-")
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

function inferGradeFromLabId(labId: string): GradeId {
  const primaryMatch = labId.match(/(?:^|-)p([1-6])(?:-|$)/i);
  if (primaryMatch) return `P${primaryMatch[1]}` as GradeId;

  const secondaryMatch = labId.match(/(?:^|-)s([1-6])(?:-|$)/i);
  if (secondaryMatch) return `S${secondaryMatch[1]}` as GradeId;

  const usGradeMatch = labId.match(/(?:^|-)g(0?[1-9]|1[0-2])(?:-|$)/i);
  if (usGradeMatch) {
    const usGrade = Number(usGradeMatch[1]);
    if (usGrade <= 6) return `P${usGrade}` as GradeId;
    return `S${Math.min(6, Math.max(1, usGrade - 6))}` as GradeId;
  }

  if (labId.includes("calculus") || labId.includes("exam-practice")) return "S6";
  if (labId.includes("trigonometry-s5") || labId.includes("probability-s5") || labId.includes("advanced-functions")) return "S5";
  if (labId.includes("quadratic") || labId.includes("functions")) return "S4";

  return "S4";
}

function inferTemplateIdFromLabId(labId: string): VisualizationTemplateId {
  const catalogTemplateId = catalogTemplateByPremiumLabId[labId];
  if (catalogTemplateId) return catalogTemplateId;

  const explicitTemplateId = specialTemplateByLabId[labId];
  if (explicitTemplateId) return explicitTemplateId;

  // Only an explicit per-lab family override may short-circuit template
  // inference; falling back through familyForVisualizationLab would resolve
  // every other lab to the probe template and dead-end the keyword rules.
  const overrideFamilyId = threeDFamilyOverrideByLabId[labId];
  const overrideFamilyTemplateId = overrideFamilyId ? templateIdByThreeDFamily[overrideFamilyId] : undefined;
  if (overrideFamilyTemplateId) return overrideFamilyTemplateId;

  const normalizedLabId = labId.toLowerCase();
  if (normalizedLabId.includes("probability")) return "probability-simulation";
  if (normalizedLabId.includes("statistics") || normalizedLabId.includes("statistical") || normalizedLabId.includes("data")) return "statistics-distribution";
  if (normalizedLabId.includes("trig") || normalizedLabId.includes("三角")) return "trig-unit-wave";
  if (normalizedLabId.includes("derivative") || normalizedLabId.includes("differentiation") || normalizedLabId.includes("calculus") || normalizedLabId.includes("導數") || normalizedLabId.includes("导数")) return "calculus-rate-area";
  if (normalizedLabId.includes("complex") || normalizedLabId.includes("複數") || normalizedLabId.includes("复数")) return "complex-plane";
  if (normalizedLabId.includes("coordinate") || normalizedLabId.includes("vector") || normalizedLabId.includes("向量")) return "coordinate-transform";
  if (normalizedLabId.includes("triangle") || normalizedLabId.includes("pythagorean") || normalizedLabId.includes("similarity")) return "right-triangle-pythagorean";
  if (normalizedLabId.includes("conic") || normalizedLabId.includes("geometry") || normalizedLabId.includes("solid") || normalizedLabId.includes("space") || normalizedLabId.includes("projection") || normalizedLabId.includes("圆锥") || normalizedLabId.includes("立体")) return "vector-conic-3d/strategy-map";
  if (normalizedLabId.includes("equation") || normalizedLabId.includes("inequalit")) return "equation-balance";
  if (normalizedLabId.includes("function") || normalizedLabId.includes("polynomial") || normalizedLabId.includes("quadratic") || normalizedLabId.includes("函数") || normalizedLabId.includes("函數")) return "function-family";
  if (normalizedLabId.includes("number") || normalizedLabId.includes("sequence") || normalizedLabId.includes("数列") || normalizedLabId.includes("數列")) return "number-line";
  if (normalizedLabId.includes("measure") || normalizedLabId.includes("proportion")) return "measurement-scale";

  return "function-family";
}

function inferTrackAndPublisher(labId: string): Pick<FeaturedLabDefinition, "curriculumTrack" | "publisher"> {
  if (labId.startsWith("us-ca-math-")) return { curriculumTrack: "US", publisher: "US_CA_MATH" };
  if (labId.startsWith("us-ar-math-")) return { curriculumTrack: "US", publisher: "US_AR_MATH" };
  if (labId.startsWith("us-fl-math-")) return { curriculumTrack: "US", publisher: "US_FL_MATH" };
  if (labId.startsWith("pep-primary-")) return { curriculumTrack: "MAINLAND_PEP_PRIMARY", publisher: "MAINLAND_PEP" };
  if (labId.startsWith("pep-junior-")) return { curriculumTrack: "MAINLAND_PEP_JUNIOR", publisher: "MAINLAND_PEP" };
  if (labId.startsWith("pep-high-")) return { curriculumTrack: "MAINLAND_PEP_HIGH", publisher: "MAINLAND_PEP" };
  if (labId.startsWith("bnu-")) return { curriculumTrack: "MAINLAND_BNU", publisher: "MAINLAND_BNU" };
  if (labId.startsWith("hjb-")) return { curriculumTrack: "MAINLAND_HJB", publisher: "MAINLAND_HJB" };
  if (labId.startsWith("capstone-")) return { curriculumTrack: "CAPSTONE" };
  return { curriculumTrack: "HK" };
}

function gradeLabelForDirectLab(grade: GradeId, regionalPriority: NonNullable<FeaturedLabDefinition["threeD"]>["regionalPriority"]) {
  const prefix = regionalPriority ? gradeLabelPrefixByRegion[regionalPriority] : gradeLabelPrefixByRegion["hong-kong"];

  return {
    en: `${grade} · ${prefix.en}`,
    zh: `${grade} · ${prefix.zh}`,
    zhHans: `${grade} · ${prefix.zhHans}`
  };
}

function buildGenericPremiumThreeDDirectLab(labId: string): FeaturedLabDefinition | null {
  if (!isPremiumThreeDLaunchLab(labId)) return null;

  const templateId = inferTemplateIdFromLabId(labId);
  const metadata = directLabTemplateMetadata[templateId];
  const grade = inferGradeFromLabId(labId);
  const regionalPriority = regionalPriorityForThreeDLaunchLab(labId);
  const title = humanizeLabId(labId);
  const trackAndPublisher = inferTrackAndPublisher(labId);
  const familyId = familyForVisualizationLab(labId, templateId);
  const useFastTwoDimensionalSurface = fastTwoDimensionalDirectLabIds.has(labId);

  return {
    labId,
    grade,
    title: {
      en: `${title} Visual Lab`,
      zh: `${title}視覺化實驗`,
      zhHans: `${title}可视化实验`
    },
    description: {
      en: "Use a focused 3D visualization model to explore this topic with sliders, diagrams, and live feedback.",
      zh: "透過聚焦的 3D 視覺化模型，用滑桿、圖形和即時回饋探索這個主題。",
      zhHans: "通过聚焦的 3D 可视化模型，用滑杆、图形和即时反馈探索这个主题。"
    },
    category: metadata.category,
    gradeLabel: gradeLabelForDirectLab(grade, regionalPriority),
    topicId: labId,
    ...trackAndPublisher,
    primaryForTopic: true,
    analyticsSource: metadata.analyticsSource,
    moduleId: "configured-visualization-lab",
    templateId,
    templateConfig: {
      variant: labId,
      focus: {
        en: "Premium 3D launch model for this standards-aligned visualization topic.",
        zh: "此標準對齊視覺化主題的 Premium 3D 啟動模型。",
        zhHans: "此标准对齐可视化主题的 Premium 3D 启动模型。"
      },
      formula: metadata.formula,
      xLabel: "input",
      yLabel: "output",
      accent: metadata.accent
    },
    threeD: {
      enabled: !useFastTwoDimensionalSurface,
      fallbackTemplateId: templateId,
      familyId,
      coverageTier: "premium-3d",
      premiumLaunch: true,
      regionalPriority
    },
    qaProfile: metadata.qaProfile
  };
}

export function getPremiumThreeDDirectLab(labId: string) {
  return premiumThreeDDirectLabById[labId] ?? buildGenericPremiumThreeDDirectLab(labId);
}
