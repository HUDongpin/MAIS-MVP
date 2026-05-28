import { gradeIds, grades } from "./grades";
import { topics } from "./topics";
import type { GradeId, LearningAnalyticsEventSource, LocalizedText, Topic } from "../types";

export type VisualizationModuleId =
  | "coordinate-plane-demo"
  | "function-graph-explorer"
  | "geometry-explorer"
  | "probability-simulator"
  | "function-model-comparer"
  | "trig-wave-explorer"
  | "calculus-stats-lab"
  | "configured-visualization-lab";

export type VisualizationTemplateId =
  | "number-line"
  | "base-ten"
  | "array-area"
  | "fraction-bar"
  | "clock-money-data"
  | "measurement-scale"
  | "angle-geometry"
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

export type VisualizationCurriculumTrack = "HK" | "MAINLAND_PEP_PRIMARY" | "MAINLAND_PEP_JUNIOR" | "MAINLAND_PEP_HIGH" | "CAPSTONE";
export type VisualizationTrackFilter = "all" | VisualizationCurriculumTrack;
export type VisualizationQaProfile = "standard" | "simulation" | "graph-heavy" | "geometry-heavy";

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
  primaryForTopic: boolean;
  analyticsSource: LearningAnalyticsEventSource;
  moduleId: VisualizationModuleId;
  templateId: VisualizationTemplateId;
  templateConfig: VisualizationTemplateConfig;
  qaProfile: VisualizationQaProfile;
};

export type GradeLabGroupDefinition = {
  grade: GradeId;
  name: LocalizedText;
  focus: LocalizedText;
  accent: string;
  labs: FeaturedLabDefinition[];
};

const legacyModuleByTopicId: Record<string, VisualizationModuleId> = {
  "p1-counting-number-bonds": "coordinate-plane-demo",
  "p1-addition-subtraction": "coordinate-plane-demo",
  "p1-shapes-patterns": "geometry-explorer",
  "p2-place-value": "coordinate-plane-demo",
  "p2-multiplication-foundations": "geometry-explorer",
  "p2-length-data": "geometry-explorer",
  "p3-fractions-intro": "geometry-explorer",
  "p3-geometry-patterns": "geometry-explorer",
  "p4-decimals": "coordinate-plane-demo",
  "p4-angles": "geometry-explorer",
  "p4-perimeter-area": "geometry-explorer",
  "p5-fractions-operations": "geometry-explorer",
  "p5-volume": "geometry-explorer",
  "p5-charts-averages": "probability-simulator",
  "p6-percentages": "function-model-comparer",
  "p6-speed": "coordinate-plane-demo",
  integers: "coordinate-plane-demo",
  angles: "geometry-explorer",
  coordinates: "coordinate-plane-demo",
  transformations: "coordinate-plane-demo",
  "probability-s2": "probability-simulator",
  "quadratic-patterns": "function-graph-explorer",
  functions: "function-model-comparer",
  "coordinate-geometry": "coordinate-plane-demo",
  "advanced-functions": "function-model-comparer",
  "trigonometry-s5": "trig-wave-explorer",
  "differentiation-intro": "calculus-stats-lab",
  calculus: "calculus-stats-lab",
  "statistics-s6": "calculus-stats-lab"
};

const analyticsSourceByModuleId: Partial<Record<VisualizationModuleId, LearningAnalyticsEventSource>> = {
  "coordinate-plane-demo": "coordinate-plane",
  "function-graph-explorer": "function-graph",
  "geometry-explorer": "geometry",
  "probability-simulator": "probability",
  "function-model-comparer": "function-model",
  "trig-wave-explorer": "trig-wave",
  "calculus-stats-lab": "calculus-stats"
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
    category: { en: "Place value", zh: "位值", zhHans: "位值" },
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

const configuredModuleId: VisualizationModuleId = "configured-visualization-lab";

function visualizationTrackForTopic(topic: Topic): VisualizationCurriculumTrack {
  if (topic.id.startsWith("pep-primary-")) return "MAINLAND_PEP_PRIMARY";
  if (topic.id.startsWith("pep-junior-")) return "MAINLAND_PEP_JUNIOR";
  if (topic.id.startsWith("pep-high-")) return "MAINLAND_PEP_HIGH";
  return "HK";
}

function lowerTopicText(topic: Topic) {
  return `${topic.id} ${topic.title.en} ${topic.description.en}`.toLowerCase();
}

function templateForTopic(topic: Topic): VisualizationTemplateId {
  const text = lowerTopicText(topic);

  if (/complex|複數|复数/.test(text)) return "complex-plane";
  if (/trig|sine|cosine|tangent|三角/.test(text)) return "trig-unit-wave";
  if (/calculus|derivative|differentiation|integral|rate of change|導|微分|微積分/.test(text)) return "calculus-rate-area";
  if (/probability|random|sample|counting principles|permutation|combination|概率|随机|计数/.test(text)) return "probability-simulation";
  if (/statistics|data|average|distribution|bivariate|chart|regression|variance|統計|统计|數據|数据|平均/.test(text)) return "statistics-distribution";
  if (/vector|conic|solid|space|complex|circle|line|plane|analytic geometry|立体|空間|空间|向量|圆锥|圓|圆|复数/.test(text)) return "vector-conic-3d/strategy-map";
  if (/coordinate|transform|slope|midpoint|position|坐標|坐标|位置|變換|变换/.test(text)) return "coordinate-transform";
  if (/function|polynomial|quadratic|exponential|logarithmic|sequence|函數|函数|多項式|多项式|二次|指数|对数|數列|数列/.test(text)) return "function-family";
  if (/equation|inequal|algebra|identity|sets|logic|unknown|方程|不等式|代數|代数|集合|逻辑/.test(text)) return "equation-balance";
  if (/fraction|percent|ratio|proportion|scale|分數|分数|百分|比例|比/.test(text)) return "fraction-bar";
  if (/area|array|multiplication|division|volume|polygon|perimeter|面積|面积|體積|体积|乘|除|周界|周长|多边形/.test(text)) return "array-area";
  if (/angle|geometry|shape|symmetry|pattern|parallel|perpendicular|幾何|几何|角|圖形|图形|對稱|对称|平行|垂直/.test(text)) return "angle-geometry";
  if (/measure|length|mass|capacity|unit|度量|测量|長度|长度|质量|重量|容量|单位/.test(text)) return "measurement-scale";
  if (/money|time|clock|hour|人民币|金錢|金钱|時間|时间/.test(text)) return "clock-money-data";
  if (/place value|base|hundred|thousand|large number|位值|大數|大数|万以内/.test(text)) return "base-ten";

  return "number-line";
}

function trackLabel(track: VisualizationCurriculumTrack): LocalizedText {
  if (track === "MAINLAND_PEP_PRIMARY") return { en: "Mainland PEP primary", zh: "人教版小學", zhHans: "人教版小学" };
  if (track === "MAINLAND_PEP_JUNIOR") return { en: "Mainland PEP junior secondary", zh: "人教版初中", zhHans: "人教版初中" };
  if (track === "MAINLAND_PEP_HIGH") return { en: "Mainland PEP high school", zh: "人教版高中", zhHans: "人教版高中" };
  if (track === "CAPSTONE") return { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" };
  return { en: "Hong Kong P1-S6", zh: "香港小一至中六", zhHans: "香港小学一年级至高三" };
}

function labTitleForTopic(topic: Topic, track: VisualizationCurriculumTrack): LocalizedText {
  const mainland = track === "MAINLAND_PEP_PRIMARY" || track === "MAINLAND_PEP_JUNIOR" || track === "MAINLAND_PEP_HIGH";
  return {
    en: `${topic.title.en} Visual Lab`,
    zh: mainland ? `${topic.title.zh}可视化实验` : `${topic.title.zh}視覺化實驗`,
    zhHans: `${topic.title.zh}可视化实验`
  };
}

function labDescriptionForTopic(topic: Topic, templateId: VisualizationTemplateId, track: VisualizationCurriculumTrack): LocalizedText {
  const template = templateMetadata[templateId];
  const mainland = track === "MAINLAND_PEP_PRIMARY" || track === "MAINLAND_PEP_JUNIOR" || track === "MAINLAND_PEP_HIGH";

  return {
    en: `Use a focused ${template.category.en.toLowerCase()} model to explore ${topic.title.en.toLowerCase()} with sliders, diagrams, and live feedback.`,
    zh: mainland
      ? `通过${template.category.zhHans ?? template.category.zh}模型，用滑杆、图形和即时反馈探索${topic.title.zh}。`
      : `透過${template.category.zh}模型，用滑桿、圖形和即時回饋探索${topic.title.zh}。`,
    zhHans: `通过${template.category.zhHans ?? template.category.zh}模型，用滑杆、图形和即时反馈探索${topic.title.zh}。`
  };
}

function gradeLabelForTopic(topic: Topic, track: VisualizationCurriculumTrack): LocalizedText {
  const label = trackLabel(track);
  return {
    en: `${topic.grade} · ${label.en}`,
    zh: `${topic.grade} · ${label.zh}`,
    zhHans: `${topic.grade} · ${label.zhHans ?? label.zh}`
  };
}

function templateConfigForTopic(topic: Topic, templateId: VisualizationTemplateId): VisualizationTemplateConfig {
  return {
    variant: topic.id,
    focus: topic.description,
    formula: formulaForTemplate(templateId),
    xLabel: xLabelForTemplate(templateId),
    yLabel: yLabelForTemplate(templateId),
    accent: accentForTopic(topic)
  };
}

function formulaForTemplate(templateId: VisualizationTemplateId) {
  if (templateId === "function-graph") return { en: "y = ax^2 + bx + c", zh: "y = ax^2 + bx + c" };
  if (templateId === "function-family") return { en: "f(x)", zh: "f(x)" };
  if (templateId === "complex-plane") return { en: "z = a + bi", zh: "z = a + bi" };
  if (templateId === "trig-unit-wave") return { en: "y = a sin(bx + c)", zh: "y = a sin(bx + c)" };
  if (templateId === "calculus-rate-area") return { en: "dy/dx", zh: "dy/dx" };
  if (templateId === "fraction-bar") return { en: "part / whole", zh: "部分 / 整體", zhHans: "部分 / 整体" };
  if (templateId === "probability-simulation") return { en: "frequency / trials", zh: "頻數 / 試驗次數", zhHans: "频数 / 试验次数" };
  if (templateId === "statistics-distribution") return { en: "mean +/- spread", zh: "平均數 +/- 離散程度", zhHans: "平均数 +/- 离散程度" };
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
  const moduleId = legacyModuleByTopicId[topic.id] ?? configuredModuleId;

  return {
    labId: topic.id,
    grade: topic.grade,
    title: labTitleForTopic(topic, curriculumTrack),
    description: labDescriptionForTopic(topic, templateId, curriculumTrack),
    category: template.category,
    gradeLabel: gradeLabelForTopic(topic, curriculumTrack),
    topicId: topic.id,
    curriculumTrack,
    primaryForTopic: true,
    analyticsSource: analyticsSourceByModuleId[moduleId] ?? template.analyticsSource,
    moduleId,
    templateId,
    templateConfig: templateConfigForTopic(topic, templateId),
    qaProfile: template.qaProfile
  };
}

const capstoneLabDefinitions: FeaturedLabDefinition[] = [
  {
    labId: "capstone-primary-number-sense-bridge",
    grade: "P6",
    title: { en: "Primary Number Sense Bridge", zh: "小學數感綜合橋", zhHans: "小学数感综合桥" },
    description: { en: "Connect counting, place value, operations, fractions, and percent on one scalable model.", zh: "把數數、位值、運算、分數和百分數放到同一個可縮放模型中。", zhHans: "把数数、位值、运算、分数和百分数放到同一个可缩放模型中。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "P6 · Capstone", zh: "小六 · 綜合", zhHans: "小学六年级 · 综合" },
    topicId: "p6-pre-secondary-problem-solving",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "function-model",
    moduleId: configuredModuleId,
    templateId: "fraction-bar",
    templateConfig: { variant: "capstone-primary-number-sense", focus: { en: "Number sense across primary mathematics", zh: "小學數學的數感銜接", zhHans: "小学数学的数感衔接" }, formula: { en: "fraction = decimal = percent", zh: "分數 = 小數 = 百分數", zhHans: "分数 = 小数 = 百分数" }, accent: "#22d3ee" },
    qaProfile: "standard"
  },
  {
    labId: "capstone-primary-measurement-proportion-bridge",
    grade: "P6",
    title: { en: "Measurement and Proportion Bridge", zh: "度量與比例綜合橋", zhHans: "测量与比例综合桥" },
    description: { en: "Compare length, area, volume, rate, ratio, and scale with linked sliders.", zh: "用連動滑桿比較長度、面積、體積、率、比例和比例尺。", zhHans: "用联动滑杆比较长度、面积、体积、率、比例和比例尺。" },
    category: { en: "Capstone bridge", zh: "綜合銜接", zhHans: "综合衔接" },
    gradeLabel: { en: "P6 · Capstone", zh: "小六 · 綜合", zhHans: "小学六年级 · 综合" },
    topicId: "p6-ratio-proportion",
    curriculumTrack: "CAPSTONE",
    primaryForTopic: false,
    analyticsSource: "geometry",
    moduleId: configuredModuleId,
    templateId: "measurement-scale",
    templateConfig: { variant: "capstone-measurement-proportion", focus: { en: "Measurement units and proportional reasoning", zh: "度量單位與比例推理", zhHans: "测量单位与比例推理" }, formula: { en: "scale factor", zh: "比例因子", zhHans: "比例因子" }, accent: "#34d399" },
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
    templateConfig: { variant: "capstone-junior-algebra-geometry", focus: { en: "Junior algebra, geometry, and graph strategy", zh: "初中代數、幾何與圖像策略", zhHans: "初中代数、几何与图象策略" }, formula: { en: "graph + constraint", zh: "圖像 + 條件", zhHans: "图象 + 条件" }, accent: "#facc15" },
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
    templateConfig: { variant: "capstone-senior-functions", focus: { en: "Senior model interpretation across functions, calculus, and statistics", zh: "高中函數、微積分與統計的模型詮釋", zhHans: "高中函数、微积分与统计的模型解释" }, formula: { en: "model -> rate -> distribution", zh: "模型 -> 變化率 -> 分佈", zhHans: "模型 -> 变化率 -> 分布" }, accent: "#c084fc" },
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
    qaProfile: "geometry-heavy"
  }
];

export const visualizationLabCatalog: FeaturedLabDefinition[] = [
  ...topics.map(createTopicLab),
  ...capstoneLabDefinitions
];

export const primaryVisualizationLabs = visualizationLabCatalog.filter((lab) => lab.primaryForTopic);
export const capstoneVisualizationLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "CAPSTONE");
export const visualizationLabCount = visualizationLabCatalog.length;
export const visualizationTemplateIds = Object.keys(templateMetadata) as VisualizationTemplateId[];
export const visualizationTrackLabels: Record<VisualizationCurriculumTrack, LocalizedText> = {
  HK: trackLabel("HK"),
  MAINLAND_PEP_PRIMARY: trackLabel("MAINLAND_PEP_PRIMARY"),
  MAINLAND_PEP_JUNIOR: trackLabel("MAINLAND_PEP_JUNIOR"),
  MAINLAND_PEP_HIGH: trackLabel("MAINLAND_PEP_HIGH"),
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
