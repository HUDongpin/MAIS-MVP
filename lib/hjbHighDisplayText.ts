const chapterTitleEnByZhHans: Record<string, string> = {
  "集合与逻辑": "Sets and Logic",
  "等式与不等式": "Equations and Inequalities",
  "幂、指数与对数": "Powers, Exponents, and Logarithms",
  "幂函数、指数函数与对数函数": "Power, Exponential, and Logarithmic Functions",
  "函数的概念、性质及应用": "Function Concepts, Properties, and Applications",
  "三角": "Trigonometry",
  "三角函数": "Trigonometric Functions",
  "平面向量": "Plane Vectors",
  "复数": "Complex Numbers",
  "空间直线与平面": "Lines and Planes in Space",
  "简单几何体": "Basic Solid Geometry",
  "概率初步": "Introductory Probability",
  "统计": "Statistics",
  "平面直角坐标系中的直线": "Lines in the Coordinate Plane",
  "圆锥曲线": "Conic Sections",
  "空间向量及其应用": "Spatial Vectors and Applications",
  "数列": "Sequences",
  "导数及其运用": "Derivatives and Applications",
  "计数原理": "Counting Principles",
  "概率初步续": "Further Introductory Probability",
  "成对数据的统计分析": "Statistical Analysis of Paired Data"
};

const volumeTitleEnByZhHans: Record<string, string> = {
  "必修 第一册": "Compulsory Volume 1",
  "必修 第二册": "Compulsory Volume 2",
  "必修 第三册": "Compulsory Volume 3",
  "选择性必修 第一册": "Selective Compulsory Volume 1",
  "选择性必修 第二册": "Selective Compulsory Volume 2"
};

function containsChineseText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

export function formatHjbHighChapterTitleEn(chapter: string) {
  return chapterTitleEnByZhHans[chapter] ?? (containsChineseText(chapter) ? "Senior Mathematics Unit" : chapter);
}

export function formatHjbHighVolumeTitleEn(volume: string) {
  return volumeTitleEnByZhHans[volume] ?? (containsChineseText(volume) ? "HJB Senior Mathematics Volume" : volume);
}

export function translateHjbHighDisplayTextEn(value: string) {
  return [...Object.entries(volumeTitleEnByZhHans), ...Object.entries(chapterTitleEnByZhHans)].reduce(
    (text, [source, target]) => text.split(source).join(target),
    value
  );
}
