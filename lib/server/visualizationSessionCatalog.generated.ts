/* eslint-disable */
/**
 * GENERATED server-only visualization session projection.
 *
 * Runtime API code imports this file instead of the UI-coupled visualization
 * catalog. The parity contract regenerates the exact rows from the catalog and
 * fails on any tuple drift. Keep rows sorted by [labId, topicId, source].
 */

import type {
  GradeId,
  LearningAnalyticsEventSource,
  TextbookPublisher
} from "@/types";

export type GeneratedVisualizationSessionCatalogEntry = {
  labId: string;
  topicId: string;
  source: LearningAnalyticsEventSource;
  grade: GradeId;
  curriculumTrack:
    | "HK"
    | "US"
    | "MAINLAND_PEP_PRIMARY"
    | "MAINLAND_PEP_JUNIOR"
    | "MAINLAND_PEP_HIGH"
    | "MAINLAND_HJB"
    | "MAINLAND_BNU"
    | "CAPSTONE";
  publisher: TextbookPublisher | null;
  directoryModuleId: string;
  lessonModuleId: "configured-visualization-lab";
};

export const generatedVisualizationSessionCatalog = [
  {
    "labId": "advanced-functions",
    "topicId": "advanced-functions",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:advanced-functions:advanced-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "algebra-basics",
    "topicId": "algebra-basics",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:algebra-basics:algebra-basics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "angles",
    "topicId": "angles",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:angles:angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "arc-length-sector-area",
    "topicId": "arc-length-sector-area",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:arc-length-sector-area:arc-length-sector-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-三角函数",
    "topicId": "bnu-high-s4-三角函数",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "trig-wave:bnu-high-s4-三角函数:bnu-high-s4-三角函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-三角恒等变换",
    "topicId": "bnu-high-s4-三角恒等变换",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "trig-wave:bnu-high-s4-三角恒等变换:bnu-high-s4-三角恒等变换",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-函数",
    "topicId": "bnu-high-s4-函数",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s4-函数:bnu-high-s4-函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-函数应用",
    "topicId": "bnu-high-s4-函数应用",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s4-函数应用:bnu-high-s4-函数应用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-复数",
    "topicId": "bnu-high-s4-复数",
    "source": "coordinate-plane",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-high-s4-复数:bnu-high-s4-复数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-对数运算与对数函数",
    "topicId": "bnu-high-s4-对数运算与对数函数",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s4-对数运算与对数函数:bnu-high-s4-对数运算与对数函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-平面向量及其应用",
    "topicId": "bnu-high-s4-平面向量及其应用",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-high-s4-平面向量及其应用:bnu-high-s4-平面向量及其应用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-指数运算与指数函数",
    "topicId": "bnu-high-s4-指数运算与指数函数",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s4-指数运算与指数函数:bnu-high-s4-指数运算与指数函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-数学建模活动-一",
    "topicId": "bnu-high-s4-数学建模活动-一",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s4-数学建模活动-一:bnu-high-s4-数学建模活动-一",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-数学建模活动-二",
    "topicId": "bnu-high-s4-数学建模活动-二",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "trig-wave:bnu-high-s4-数学建模活动-二:bnu-high-s4-数学建模活动-二",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-概率",
    "topicId": "bnu-high-s4-概率",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-high-s4-概率:bnu-high-s4-概率",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-立体几何初步",
    "topicId": "bnu-high-s4-立体几何初步",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-high-s4-立体几何初步:bnu-high-s4-立体几何初步",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-统计",
    "topicId": "bnu-high-s4-统计",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-high-s4-统计:bnu-high-s4-统计",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s4-预备知识",
    "topicId": "bnu-high-s4-预备知识",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-graph:bnu-high-s4-预备知识:bnu-high-s4-预备知识",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-圆锥曲线",
    "topicId": "bnu-high-s5-圆锥曲线",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-high-s5-圆锥曲线:bnu-high-s5-圆锥曲线",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-数学建模活动-三",
    "topicId": "bnu-high-s5-数学建模活动-三",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-high-s5-数学建模活动-三:bnu-high-s5-数学建模活动-三",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-概率",
    "topicId": "bnu-high-s5-概率",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-high-s5-概率:bnu-high-s5-概率",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-直线与圆",
    "topicId": "bnu-high-s5-直线与圆",
    "source": "coordinate-plane",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-high-s5-直线与圆:bnu-high-s5-直线与圆",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-空间向量与立体几何",
    "topicId": "bnu-high-s5-空间向量与立体几何",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-high-s5-空间向量与立体几何:bnu-high-s5-空间向量与立体几何",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-统计案例",
    "topicId": "bnu-high-s5-统计案例",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-high-s5-统计案例:bnu-high-s5-统计案例",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s5-计数原理",
    "topicId": "bnu-high-s5-计数原理",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-high-s5-计数原理:bnu-high-s5-计数原理",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s6-导数及其应用",
    "topicId": "bnu-high-s6-导数及其应用",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "calculus-stats:bnu-high-s6-导数及其应用:bnu-high-s6-导数及其应用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s6-数列",
    "topicId": "bnu-high-s6-数列",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-high-s6-数列:bnu-high-s6-数列",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-high-s6-高三数列与导数综合复习",
    "topicId": "bnu-high-s6-高三数列与导数综合复习",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "calculus-stats:bnu-high-s6-高三数列与导数综合复习:bnu-high-s6-高三数列与导数综合复习",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-axis-symmetry",
    "topicId": "bnu-junior-s1-lower-axis-symmetry",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s1-lower-axis-symmetry:bnu-junior-s1-lower-axis-symmetry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-intersecting-parallel-lines",
    "topicId": "bnu-junior-s1-lower-intersecting-parallel-lines",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s1-lower-intersecting-parallel-lines:bnu-junior-s1-lower-intersecting-parallel-lines",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-polynomial-multiply-divide",
    "topicId": "bnu-junior-s1-lower-polynomial-multiply-divide",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s1-lower-polynomial-multiply-divide:bnu-junior-s1-lower-polynomial-multiply-divide",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-probability-introduction",
    "topicId": "bnu-junior-s1-lower-probability-introduction",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-junior-s1-lower-probability-introduction:bnu-junior-s1-lower-probability-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-triangles",
    "topicId": "bnu-junior-s1-lower-triangles",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s1-lower-triangles:bnu-junior-s1-lower-triangles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-lower-variable-relationships",
    "topicId": "bnu-junior-s1-lower-variable-relationships",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s1-lower-variable-relationships:bnu-junior-s1-lower-variable-relationships",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-algebraic-expressions",
    "topicId": "bnu-junior-s1-upper-algebraic-expressions",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s1-upper-algebraic-expressions:bnu-junior-s1-upper-algebraic-expressions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-data-collection",
    "topicId": "bnu-junior-s1-upper-data-collection",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-junior-s1-upper-data-collection:bnu-junior-s1-upper-data-collection",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-linear-equations",
    "topicId": "bnu-junior-s1-upper-linear-equations",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s1-upper-linear-equations:bnu-junior-s1-upper-linear-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-plane-figures",
    "topicId": "bnu-junior-s1-upper-plane-figures",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s1-upper-plane-figures:bnu-junior-s1-upper-plane-figures",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-rational-numbers",
    "topicId": "bnu-junior-s1-upper-rational-numbers",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-junior-s1-upper-rational-numbers:bnu-junior-s1-upper-rational-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s1-upper-spatial-figures",
    "topicId": "bnu-junior-s1-upper-spatial-figures",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s1-upper-spatial-figures:bnu-junior-s1-upper-spatial-figures",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-algebraic-fractions-equations",
    "topicId": "bnu-junior-s2-lower-algebraic-fractions-equations",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s2-lower-algebraic-fractions-equations:bnu-junior-s2-lower-algebraic-fractions-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-factorization",
    "topicId": "bnu-junior-s2-lower-factorization",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s2-lower-factorization:bnu-junior-s2-lower-factorization",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-inequalities-systems",
    "topicId": "bnu-junior-s2-lower-inequalities-systems",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s2-lower-inequalities-systems:bnu-junior-s2-lower-inequalities-systems",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-parallelograms",
    "topicId": "bnu-junior-s2-lower-parallelograms",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s2-lower-parallelograms:bnu-junior-s2-lower-parallelograms",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-transformations",
    "topicId": "bnu-junior-s2-lower-transformations",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-junior-s2-lower-transformations:bnu-junior-s2-lower-transformations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-lower-triangle-proof-applications",
    "topicId": "bnu-junior-s2-lower-triangle-proof-applications",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s2-lower-triangle-proof-applications:bnu-junior-s2-lower-triangle-proof-applications",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-data-analysis",
    "topicId": "bnu-junior-s2-upper-data-analysis",
    "source": "probability",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-junior-s2-upper-data-analysis:bnu-junior-s2-upper-data-analysis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-linear-functions",
    "topicId": "bnu-junior-s2-upper-linear-functions",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s2-upper-linear-functions:bnu-junior-s2-upper-linear-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-linear-systems",
    "topicId": "bnu-junior-s2-upper-linear-systems",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s2-upper-linear-systems:bnu-junior-s2-upper-linear-systems",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-parallel-lines-proof",
    "topicId": "bnu-junior-s2-upper-parallel-lines-proof",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s2-upper-parallel-lines-proof:bnu-junior-s2-upper-parallel-lines-proof",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-position-coordinates",
    "topicId": "bnu-junior-s2-upper-position-coordinates",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-junior-s2-upper-position-coordinates:bnu-junior-s2-upper-position-coordinates",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-pythagorean-theorem",
    "topicId": "bnu-junior-s2-upper-pythagorean-theorem",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s2-upper-pythagorean-theorem:bnu-junior-s2-upper-pythagorean-theorem",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s2-upper-real-numbers",
    "topicId": "bnu-junior-s2-upper-real-numbers",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-junior-s2-upper-real-numbers:bnu-junior-s2-upper-real-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-lower-circle",
    "topicId": "bnu-junior-s3-lower-circle",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s3-lower-circle:bnu-junior-s3-lower-circle",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-lower-quadratic-functions",
    "topicId": "bnu-junior-s3-lower-quadratic-functions",
    "source": "function-graph",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-graph:bnu-junior-s3-lower-quadratic-functions:bnu-junior-s3-lower-quadratic-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-lower-right-triangle-trigonometry",
    "topicId": "bnu-junior-s3-lower-right-triangle-trigonometry",
    "source": "trig-wave",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "trig-wave:bnu-junior-s3-lower-right-triangle-trigonometry:bnu-junior-s3-lower-right-triangle-trigonometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-lower-statistics-probability",
    "topicId": "bnu-junior-s3-lower-statistics-probability",
    "source": "probability",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-junior-s3-lower-statistics-probability:bnu-junior-s3-lower-statistics-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-inverse-proportion",
    "topicId": "bnu-junior-s3-upper-inverse-proportion",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-junior-s3-upper-inverse-proportion:bnu-junior-s3-upper-inverse-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-probability-advanced",
    "topicId": "bnu-junior-s3-upper-probability-advanced",
    "source": "probability",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-junior-s3-upper-probability-advanced:bnu-junior-s3-upper-probability-advanced",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-projection-views",
    "topicId": "bnu-junior-s3-upper-projection-views",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s3-upper-projection-views:bnu-junior-s3-upper-projection-views",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-quadratic-equations",
    "topicId": "bnu-junior-s3-upper-quadratic-equations",
    "source": "function-graph",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-graph:bnu-junior-s3-upper-quadratic-equations:bnu-junior-s3-upper-quadratic-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-similar-figures",
    "topicId": "bnu-junior-s3-upper-similar-figures",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s3-upper-similar-figures:bnu-junior-s3-upper-similar-figures",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-junior-s3-upper-special-parallelograms",
    "topicId": "bnu-junior-s3-upper-special-parallelograms",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-junior-s3-upper-special-parallelograms:bnu-junior-s3-upper-special-parallelograms",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-math-play-review",
    "topicId": "bnu-primary-p1-lower-math-play-review",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-lower-math-play-review:bnu-primary-p1-lower-math-play-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-observe-objects",
    "topicId": "bnu-primary-p1-lower-observe-objects",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p1-lower-observe-objects:bnu-primary-p1-lower-observe-objects",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-plane-shapes",
    "topicId": "bnu-primary-p1-lower-plane-shapes",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p1-lower-plane-shapes:bnu-primary-p1-lower-plane-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-within-100-add-sub-integrated",
    "topicId": "bnu-primary-p1-lower-within-100-add-sub-integrated",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-lower-within-100-add-sub-integrated:bnu-primary-p1-lower-within-100-add-sub-integrated",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-within-100-add-sub-nonregrouping",
    "topicId": "bnu-primary-p1-lower-within-100-add-sub-nonregrouping",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-lower-within-100-add-sub-nonregrouping:bnu-primary-p1-lower-within-100-add-sub-nonregrouping",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-within-100-number-sense",
    "topicId": "bnu-primary-p1-lower-within-100-number-sense",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-lower-within-100-number-sense:bnu-primary-p1-lower-within-100-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-lower-within-20-regrouping",
    "topicId": "bnu-primary-p1-lower-within-20-regrouping",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-lower-within-20-regrouping:bnu-primary-p1-lower-within-20-regrouping",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-classification",
    "topicId": "bnu-primary-p1-upper-classification",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p1-upper-classification:bnu-primary-p1-upper-classification",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-clock-introduction",
    "topicId": "bnu-primary-p1-upper-clock-introduction",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p1-upper-clock-introduction:bnu-primary-p1-upper-clock-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-comparison",
    "topicId": "bnu-primary-p1-upper-comparison",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p1-upper-comparison:bnu-primary-p1-upper-comparison",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-life-number-sense",
    "topicId": "bnu-primary-p1-upper-life-number-sense",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-upper-life-number-sense:bnu-primary-p1-upper-life-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-position-order",
    "topicId": "bnu-primary-p1-upper-position-order",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-upper-position-order:bnu-primary-p1-upper-position-order",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-review",
    "topicId": "bnu-primary-p1-upper-review",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-upper-review:bnu-primary-p1-upper-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-solid-shapes",
    "topicId": "bnu-primary-p1-upper-solid-shapes",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p1-upper-solid-shapes:bnu-primary-p1-upper-solid-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-within-10-add-sub",
    "topicId": "bnu-primary-p1-upper-within-10-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-upper-within-10-add-sub:bnu-primary-p1-upper-within-10-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p1-upper-within-20-add-sub",
    "topicId": "bnu-primary-p1-upper-within-20-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p1-upper-within-20-add-sub:bnu-primary-p1-upper-within-20-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-data-recording-review",
    "topicId": "bnu-primary-p2-lower-data-recording-review",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p2-lower-data-recording-review:bnu-primary-p2-lower-data-recording-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-direction-position",
    "topicId": "bnu-primary-p2-lower-direction-position",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-lower-direction-position:bnu-primary-p2-lower-direction-position",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-division-strengthening",
    "topicId": "bnu-primary-p2-lower-division-strengthening",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-lower-division-strengthening:bnu-primary-p2-lower-division-strengthening",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-large-numbers",
    "topicId": "bnu-primary-p2-lower-large-numbers",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-lower-large-numbers:bnu-primary-p2-lower-large-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-measurement",
    "topicId": "bnu-primary-p2-lower-measurement",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-lower-measurement:bnu-primary-p2-lower-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-plane-shapes",
    "topicId": "bnu-primary-p2-lower-plane-shapes",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-lower-plane-shapes:bnu-primary-p2-lower-plane-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-three-digit-add-sub",
    "topicId": "bnu-primary-p2-lower-three-digit-add-sub",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-lower-three-digit-add-sub:bnu-primary-p2-lower-three-digit-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-lower-time",
    "topicId": "bnu-primary-p2-lower-time",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p2-lower-time:bnu-primary-p2-lower-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-add-sub-review",
    "topicId": "bnu-primary-p2-upper-add-sub-review",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-upper-add-sub-review:bnu-primary-p2-upper-add-sub-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-division-facts-review",
    "topicId": "bnu-primary-p2-upper-division-facts-review",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-upper-division-facts-review:bnu-primary-p2-upper-division-facts-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-division-introduction",
    "topicId": "bnu-primary-p2-upper-division-introduction",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-upper-division-introduction:bnu-primary-p2-upper-division-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-measurement",
    "topicId": "bnu-primary-p2-upper-measurement",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-upper-measurement:bnu-primary-p2-upper-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-multiplication-facts-2-to-5",
    "topicId": "bnu-primary-p2-upper-multiplication-facts-2-to-5",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-upper-multiplication-facts-2-to-5:bnu-primary-p2-upper-multiplication-facts-2-to-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-multiplication-facts-6-to-9",
    "topicId": "bnu-primary-p2-upper-multiplication-facts-6-to-9",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-upper-multiplication-facts-6-to-9:bnu-primary-p2-upper-multiplication-facts-6-to-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-multiplication-introduction",
    "topicId": "bnu-primary-p2-upper-multiplication-introduction",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p2-upper-multiplication-introduction:bnu-primary-p2-upper-multiplication-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-shape-transformations",
    "topicId": "bnu-primary-p2-upper-shape-transformations",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p2-upper-shape-transformations:bnu-primary-p2-upper-shape-transformations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p2-upper-shopping-money",
    "topicId": "bnu-primary-p2-upper-shopping-money",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p2-upper-shopping-money:bnu-primary-p2-upper-shopping-money",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-area",
    "topicId": "bnu-primary-p3-lower-area",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-area:bnu-primary-p3-lower-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-data-representation",
    "topicId": "bnu-primary-p3-lower-data-representation",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p3-lower-data-representation:bnu-primary-p3-lower-data-representation",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-division",
    "topicId": "bnu-primary-p3-lower-division",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-division:bnu-primary-p3-lower-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-fraction-introduction",
    "topicId": "bnu-primary-p3-lower-fraction-introduction",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-fraction-introduction:bnu-primary-p3-lower-fraction-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-mass-units",
    "topicId": "bnu-primary-p3-lower-mass-units",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-mass-units:bnu-primary-p3-lower-mass-units",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-math-play-review",
    "topicId": "bnu-primary-p3-lower-math-play-review",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-math-play-review:bnu-primary-p3-lower-math-play-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-shape-motion",
    "topicId": "bnu-primary-p3-lower-shape-motion",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p3-lower-shape-motion:bnu-primary-p3-lower-shape-motion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-lower-two-digit-multiplication",
    "topicId": "bnu-primary-p3-lower-two-digit-multiplication",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-lower-two-digit-multiplication:bnu-primary-p3-lower-two-digit-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-calendar-time",
    "topicId": "bnu-primary-p3-upper-calendar-time",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p3-upper-calendar-time:bnu-primary-p3-upper-calendar-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-decimal-introduction",
    "topicId": "bnu-primary-p3-upper-decimal-introduction",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p3-upper-decimal-introduction:bnu-primary-p3-upper-decimal-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-math-play-review",
    "topicId": "bnu-primary-p3-upper-math-play-review",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-upper-math-play-review:bnu-primary-p3-upper-math-play-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-mixed-operations",
    "topicId": "bnu-primary-p3-upper-mixed-operations",
    "source": "function-model",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-primary-p3-upper-mixed-operations:bnu-primary-p3-upper-mixed-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-multi-digit-multiplication",
    "topicId": "bnu-primary-p3-upper-multi-digit-multiplication",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-upper-multi-digit-multiplication:bnu-primary-p3-upper-multi-digit-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-multiplication-division-fluency",
    "topicId": "bnu-primary-p3-upper-multiplication-division-fluency",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-upper-multiplication-division-fluency:bnu-primary-p3-upper-multiplication-division-fluency",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-observe-objects",
    "topicId": "bnu-primary-p3-upper-observe-objects",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-upper-observe-objects:bnu-primary-p3-upper-observe-objects",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-perimeter",
    "topicId": "bnu-primary-p3-upper-perimeter",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p3-upper-perimeter:bnu-primary-p3-upper-perimeter",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p3-upper-three-digit-add-sub",
    "topicId": "bnu-primary-p3-upper-three-digit-add-sub",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p3-upper-three-digit-add-sub:bnu-primary-p3-upper-three-digit-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-data-representation-analysis",
    "topicId": "bnu-primary-p4-lower-data-representation-analysis",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p4-lower-data-representation-analysis:bnu-primary-p4-lower-data-representation-analysis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-decimal-meaning-add-sub",
    "topicId": "bnu-primary-p4-lower-decimal-meaning-add-sub",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p4-lower-decimal-meaning-add-sub:bnu-primary-p4-lower-decimal-meaning-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-decimal-multiplication",
    "topicId": "bnu-primary-p4-lower-decimal-multiplication",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-lower-decimal-multiplication:bnu-primary-p4-lower-decimal-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-equations",
    "topicId": "bnu-primary-p4-lower-equations",
    "source": "function-model",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-primary-p4-lower-equations:bnu-primary-p4-lower-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-math-play-review",
    "topicId": "bnu-primary-p4-lower-math-play-review",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p4-lower-math-play-review:bnu-primary-p4-lower-math-play-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-observe-objects",
    "topicId": "bnu-primary-p4-lower-observe-objects",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-lower-observe-objects:bnu-primary-p4-lower-observe-objects",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-lower-triangles-quadrilaterals",
    "topicId": "bnu-primary-p4-lower-triangles-quadrilaterals",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-lower-triangles-quadrilaterals:bnu-primary-p4-lower-triangles-quadrilaterals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-direction-position",
    "topicId": "bnu-primary-p4-upper-direction-position",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p4-upper-direction-position:bnu-primary-p4-upper-direction-position",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-division",
    "topicId": "bnu-primary-p4-upper-division",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-upper-division:bnu-primary-p4-upper-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-large-numbers",
    "topicId": "bnu-primary-p4-upper-large-numbers",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p4-upper-large-numbers:bnu-primary-p4-upper-large-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-lines-angles",
    "topicId": "bnu-primary-p4-upper-lines-angles",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-upper-lines-angles:bnu-primary-p4-upper-lines-angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-math-play-review",
    "topicId": "bnu-primary-p4-upper-math-play-review",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p4-upper-math-play-review:bnu-primary-p4-upper-math-play-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-multiplication",
    "topicId": "bnu-primary-p4-upper-multiplication",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p4-upper-multiplication:bnu-primary-p4-upper-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-negative-numbers",
    "topicId": "bnu-primary-p4-upper-negative-numbers",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p4-upper-negative-numbers:bnu-primary-p4-upper-negative-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-operation-laws",
    "topicId": "bnu-primary-p4-upper-operation-laws",
    "source": "function-model",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-primary-p4-upper-operation-laws:bnu-primary-p4-upper-operation-laws",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p4-upper-probability",
    "topicId": "bnu-primary-p4-upper-probability",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p4-upper-probability:bnu-primary-p4-upper-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-cuboid-introduction",
    "topicId": "bnu-primary-p5-lower-cuboid-introduction",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-cuboid-introduction:bnu-primary-p5-lower-cuboid-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-cuboid-volume",
    "topicId": "bnu-primary-p5-lower-cuboid-volume",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-cuboid-volume:bnu-primary-p5-lower-cuboid-volume",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-data-analysis",
    "topicId": "bnu-primary-p5-lower-data-analysis",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p5-lower-data-analysis:bnu-primary-p5-lower-data-analysis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-equations",
    "topicId": "bnu-primary-p5-lower-equations",
    "source": "function-model",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "function-model:bnu-primary-p5-lower-equations:bnu-primary-p5-lower-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-fraction-add-sub",
    "topicId": "bnu-primary-p5-lower-fraction-add-sub",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-fraction-add-sub:bnu-primary-p5-lower-fraction-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-fraction-division",
    "topicId": "bnu-primary-p5-lower-fraction-division",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-fraction-division:bnu-primary-p5-lower-fraction-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-fraction-multiplication",
    "topicId": "bnu-primary-p5-lower-fraction-multiplication",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-fraction-multiplication:bnu-primary-p5-lower-fraction-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-position",
    "topicId": "bnu-primary-p5-lower-position",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p5-lower-position:bnu-primary-p5-lower-position",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-lower-review-activity",
    "topicId": "bnu-primary-p5-lower-review-activity",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-lower-review-activity:bnu-primary-p5-lower-review-activity",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-composite-area",
    "topicId": "bnu-primary-p5-upper-composite-area",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-upper-composite-area:bnu-primary-p5-upper-composite-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-decimal-division",
    "topicId": "bnu-primary-p5-upper-decimal-division",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-upper-decimal-division:bnu-primary-p5-upper-decimal-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-fraction-meaning",
    "topicId": "bnu-primary-p5-upper-fraction-meaning",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-upper-fraction-meaning:bnu-primary-p5-upper-fraction-meaning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-multiples-factors",
    "topicId": "bnu-primary-p5-upper-multiples-factors",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-upper-multiples-factors:bnu-primary-p5-upper-multiples-factors",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-polygon-area",
    "topicId": "bnu-primary-p5-upper-polygon-area",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p5-upper-polygon-area:bnu-primary-p5-upper-polygon-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-probability",
    "topicId": "bnu-primary-p5-upper-probability",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p5-upper-probability:bnu-primary-p5-upper-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-review-activity",
    "topicId": "bnu-primary-p5-upper-review-activity",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p5-upper-review-activity:bnu-primary-p5-upper-review-activity",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p5-upper-symmetry-translation",
    "topicId": "bnu-primary-p5-upper-symmetry-translation",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p5-upper-symmetry-translation:bnu-primary-p5-upper-symmetry-translation",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-cylinders-cones",
    "topicId": "bnu-primary-p6-lower-cylinders-cones",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-lower-cylinders-cones:bnu-primary-p6-lower-cylinders-cones",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-direct-inverse-proportion",
    "topicId": "bnu-primary-p6-lower-direct-inverse-proportion",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-lower-direct-inverse-proportion:bnu-primary-p6-lower-direct-inverse-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-final-review",
    "topicId": "bnu-primary-p6-lower-final-review",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p6-lower-final-review:bnu-primary-p6-lower-final-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-geometric-motion",
    "topicId": "bnu-primary-p6-lower-geometric-motion",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "coordinate-plane:bnu-primary-p6-lower-geometric-motion:bnu-primary-p6-lower-geometric-motion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-math-play",
    "topicId": "bnu-primary-p6-lower-math-play",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-lower-math-play:bnu-primary-p6-lower-math-play",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-lower-proportion",
    "topicId": "bnu-primary-p6-lower-proportion",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-lower-proportion:bnu-primary-p6-lower-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-circles",
    "topicId": "bnu-primary-p6-upper-circles",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-circles:bnu-primary-p6-upper-circles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-data-processing",
    "topicId": "bnu-primary-p6-upper-data-processing",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "probability:bnu-primary-p6-upper-data-processing:bnu-primary-p6-upper-data-processing",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-fraction-mixed-operations",
    "topicId": "bnu-primary-p6-upper-fraction-mixed-operations",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-fraction-mixed-operations:bnu-primary-p6-upper-fraction-mixed-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-observe-objects",
    "topicId": "bnu-primary-p6-upper-observe-objects",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-observe-objects:bnu-primary-p6-upper-observe-objects",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-percentage-applications",
    "topicId": "bnu-primary-p6-upper-percentage-applications",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-percentage-applications:bnu-primary-p6-upper-percentage-applications",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-percentage-meaning",
    "topicId": "bnu-primary-p6-upper-percentage-meaning",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-percentage-meaning:bnu-primary-p6-upper-percentage-meaning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-ratio",
    "topicId": "bnu-primary-p6-upper-ratio",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-ratio:bnu-primary-p6-upper-ratio",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "bnu-primary-p6-upper-review-activity",
    "topicId": "bnu-primary-p6-upper-review-activity",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_BNU",
    "publisher": "MAINLAND_BNU",
    "directoryModuleId": "geometry:bnu-primary-p6-upper-review-activity:bnu-primary-p6-upper-review-activity",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "calculus",
    "topicId": "calculus",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "calculus-stats:calculus:calculus",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "capstone-hk-mainland-crosswalk-explorer",
    "topicId": "exam-revision",
    "source": "learning-path",
    "grade": "S6",
    "curriculumTrack": "CAPSTONE",
    "publisher": null,
    "directoryModuleId": "learning-path:capstone-hk-mainland-crosswalk-explorer:exam-revision",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "capstone-junior-algebra-geometry-bridge",
    "topicId": "mixed-problem-solving",
    "source": "coordinate-plane",
    "grade": "S3",
    "curriculumTrack": "CAPSTONE",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:capstone-junior-algebra-geometry-bridge:mixed-problem-solving",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "capstone-primary-measurement-proportion-bridge",
    "topicId": "p6-ratio-proportion",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "CAPSTONE",
    "publisher": null,
    "directoryModuleId": "geometry:capstone-primary-measurement-proportion-bridge:p6-ratio-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "capstone-primary-number-sense-bridge",
    "topicId": "p6-pre-secondary-problem-solving",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "CAPSTONE",
    "publisher": null,
    "directoryModuleId": "function-model:capstone-primary-number-sense-bridge:p6-pre-secondary-problem-solving",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "capstone-senior-function-calculus-stats-bridge",
    "topicId": "statistics-s6",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "CAPSTONE",
    "publisher": null,
    "directoryModuleId": "calculus-stats:capstone-senior-function-calculus-stats-bridge:statistics-s6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "circles",
    "topicId": "circles",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:circles:circles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "coordinate-geometry",
    "topicId": "coordinate-geometry",
    "source": "coordinate-plane",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:coordinate-geometry:coordinate-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "coordinates",
    "topicId": "coordinates",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:coordinates:coordinates",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "data-handling",
    "topicId": "data-handling",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:data-handling:data-handling",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "differentiation-intro",
    "topicId": "differentiation-intro",
    "source": "calculus-stats",
    "grade": "S5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "calculus-stats:differentiation-intro:differentiation-intro",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "exam-revision",
    "topicId": "exam-revision",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:exam-revision:exam-revision",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "functions",
    "topicId": "functions",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-graph:functions:functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-三角",
    "topicId": "hjb-high-s4-三角",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "trig-wave:hjb-high-s4-三角:hjb-high-s4-三角",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-三角函数",
    "topicId": "hjb-high-s4-三角函数",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "trig-wave:hjb-high-s4-三角函数:hjb-high-s4-三角函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-函数的概念-性质及应用",
    "topicId": "hjb-high-s4-函数的概念-性质及应用",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s4-函数的概念-性质及应用:hjb-high-s4-函数的概念-性质及应用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-复数",
    "topicId": "hjb-high-s4-复数",
    "source": "coordinate-plane",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-high-s4-复数:hjb-high-s4-复数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-幂-指数与对数",
    "topicId": "hjb-high-s4-幂-指数与对数",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s4-幂-指数与对数:hjb-high-s4-幂-指数与对数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-幂函数-指数函数与对数函数",
    "topicId": "hjb-high-s4-幂函数-指数函数与对数函数",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s4-幂函数-指数函数与对数函数:hjb-high-s4-幂函数-指数函数与对数函数",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-平面向量",
    "topicId": "hjb-high-s4-平面向量",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s4-平面向量:hjb-high-s4-平面向量",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-等式与不等式",
    "topicId": "hjb-high-s4-等式与不等式",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-graph:hjb-high-s4-等式与不等式:hjb-high-s4-等式与不等式",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s4-集合与逻辑",
    "topicId": "hjb-high-s4-集合与逻辑",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s4-集合与逻辑:hjb-high-s4-集合与逻辑",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-圆锥曲线",
    "topicId": "hjb-high-s5-圆锥曲线",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s5-圆锥曲线:hjb-high-s5-圆锥曲线",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-平面直角坐标系中的直线",
    "topicId": "hjb-high-s5-平面直角坐标系中的直线",
    "source": "coordinate-plane",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-high-s5-平面直角坐标系中的直线:hjb-high-s5-平面直角坐标系中的直线",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-数列",
    "topicId": "hjb-high-s5-数列",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s5-数列:hjb-high-s5-数列",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-概率初步",
    "topicId": "hjb-high-s5-概率初步",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s5-概率初步:hjb-high-s5-概率初步",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-空间向量及其应用",
    "topicId": "hjb-high-s5-空间向量及其应用",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s5-空间向量及其应用:hjb-high-s5-空间向量及其应用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-空间直线与平面",
    "topicId": "hjb-high-s5-空间直线与平面",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s5-空间直线与平面:hjb-high-s5-空间直线与平面",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-简单几何体",
    "topicId": "hjb-high-s5-简单几何体",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s5-简单几何体:hjb-high-s5-简单几何体",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s5-统计",
    "topicId": "hjb-high-s5-统计",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s5-统计:hjb-high-s5-统计",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-三角-向量与解析几何综合",
    "topicId": "hjb-high-s6-三角-向量与解析几何综合",
    "source": "geometry",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s6-三角-向量与解析几何综合:hjb-high-s6-三角-向量与解析几何综合",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-函数-导数与不等式综合",
    "topicId": "hjb-high-s6-函数-导数与不等式综合",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "calculus-stats:hjb-high-s6-函数-导数与不等式综合:hjb-high-s6-函数-导数与不等式综合",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-圆锥曲线综合复习",
    "topicId": "hjb-high-s6-圆锥曲线综合复习",
    "source": "geometry",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s6-圆锥曲线综合复习:hjb-high-s6-圆锥曲线综合复习",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-导数及其运用",
    "topicId": "hjb-high-s6-导数及其运用",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "calculus-stats:hjb-high-s6-导数及其运用:hjb-high-s6-导数及其运用",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-成对数据的统计分析",
    "topicId": "hjb-high-s6-成对数据的统计分析",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s6-成对数据的统计分析:hjb-high-s6-成对数据的统计分析",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-数列与计数综合",
    "topicId": "hjb-high-s6-数列与计数综合",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s6-数列与计数综合:hjb-high-s6-数列与计数综合",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-数列综合复习",
    "topicId": "hjb-high-s6-数列综合复习",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-high-s6-数列综合复习:hjb-high-s6-数列综合复习",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-概率初步续",
    "topicId": "hjb-high-s6-概率初步续",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s6-概率初步续:hjb-high-s6-概率初步续",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-概率统计综合",
    "topicId": "hjb-high-s6-概率统计综合",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s6-概率统计综合:hjb-high-s6-概率统计综合",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-空间向量综合复习",
    "topicId": "hjb-high-s6-空间向量综合复习",
    "source": "geometry",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s6-空间向量综合复习:hjb-high-s6-空间向量综合复习",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-立体几何与空间向量综合",
    "topicId": "hjb-high-s6-立体几何与空间向量综合",
    "source": "geometry",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-high-s6-立体几何与空间向量综合:hjb-high-s6-立体几何与空间向量综合",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-解析几何直线综合复习",
    "topicId": "hjb-high-s6-解析几何直线综合复习",
    "source": "coordinate-plane",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-high-s6-解析几何直线综合复习:hjb-high-s6-解析几何直线综合复习",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-high-s6-计数原理",
    "topicId": "hjb-high-s6-计数原理",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-high-s6-计数原理:hjb-high-s6-计数原理",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-lower-intersecting-parallel-lines",
    "topicId": "hjb-junior-s1-lower-intersecting-parallel-lines",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s1-lower-intersecting-parallel-lines:hjb-junior-s1-lower-intersecting-parallel-lines",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-lower-isosceles-triangles",
    "topicId": "hjb-junior-s1-lower-isosceles-triangles",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s1-lower-isosceles-triangles:hjb-junior-s1-lower-isosceles-triangles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-lower-linear-inequalities",
    "topicId": "hjb-junior-s1-lower-linear-inequalities",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s1-lower-linear-inequalities:hjb-junior-s1-lower-linear-inequalities",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-lower-triangles",
    "topicId": "hjb-junior-s1-lower-triangles",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s1-lower-triangles:hjb-junior-s1-lower-triangles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-upper-algebraic-fractions",
    "topicId": "hjb-junior-s1-upper-algebraic-fractions",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s1-upper-algebraic-fractions:hjb-junior-s1-upper-algebraic-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-upper-factorization",
    "topicId": "hjb-junior-s1-upper-factorization",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s1-upper-factorization:hjb-junior-s1-upper-factorization",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-upper-figure-transformations",
    "topicId": "hjb-junior-s1-upper-figure-transformations",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-junior-s1-upper-figure-transformations:hjb-junior-s1-upper-figure-transformations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-upper-polynomial-add-subtract",
    "topicId": "hjb-junior-s1-upper-polynomial-add-subtract",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s1-upper-polynomial-add-subtract:hjb-junior-s1-upper-polynomial-add-subtract",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s1-upper-polynomial-multiply-divide",
    "topicId": "hjb-junior-s1-upper-polynomial-multiply-divide",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s1-upper-polynomial-multiply-divide:hjb-junior-s1-upper-polynomial-multiply-divide",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-lower-coordinate-plane",
    "topicId": "hjb-junior-s2-lower-coordinate-plane",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-junior-s2-lower-coordinate-plane:hjb-junior-s2-lower-coordinate-plane",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-lower-inverse-functions",
    "topicId": "hjb-junior-s2-lower-inverse-functions",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s2-lower-inverse-functions:hjb-junior-s2-lower-inverse-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-lower-linear-functions",
    "topicId": "hjb-junior-s2-lower-linear-functions",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-junior-s2-lower-linear-functions:hjb-junior-s2-lower-linear-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-lower-quadrilaterals",
    "topicId": "hjb-junior-s2-lower-quadrilaterals",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s2-lower-quadrilaterals:hjb-junior-s2-lower-quadrilaterals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-upper-quadratic-equations",
    "topicId": "hjb-junior-s2-upper-quadratic-equations",
    "source": "function-graph",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-graph:hjb-junior-s2-upper-quadratic-equations:hjb-junior-s2-upper-quadratic-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-upper-quadratic-radicals",
    "topicId": "hjb-junior-s2-upper-quadratic-radicals",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-junior-s2-upper-quadratic-radicals:hjb-junior-s2-upper-quadratic-radicals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-upper-real-numbers",
    "topicId": "hjb-junior-s2-upper-real-numbers",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-junior-s2-upper-real-numbers:hjb-junior-s2-upper-real-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s2-upper-right-triangles",
    "topicId": "hjb-junior-s2-upper-right-triangles",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s2-upper-right-triangles:hjb-junior-s2-upper-right-triangles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s3-lower-circle-regular-polygons",
    "topicId": "hjb-junior-s3-lower-circle-regular-polygons",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s3-lower-circle-regular-polygons:hjb-junior-s3-lower-circle-regular-polygons",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s3-lower-statistics-introduction",
    "topicId": "hjb-junior-s3-lower-statistics-introduction",
    "source": "probability",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-junior-s3-lower-statistics-introduction:hjb-junior-s3-lower-statistics-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s3-upper-acute-trigonometry",
    "topicId": "hjb-junior-s3-upper-acute-trigonometry",
    "source": "trig-wave",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "trig-wave:hjb-junior-s3-upper-acute-trigonometry:hjb-junior-s3-upper-acute-trigonometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s3-upper-quadratic-functions",
    "topicId": "hjb-junior-s3-upper-quadratic-functions",
    "source": "function-graph",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-graph:hjb-junior-s3-upper-quadratic-functions:hjb-junior-s3-upper-quadratic-functions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-junior-s3-upper-similar-triangles",
    "topicId": "hjb-junior-s3-upper-similar-triangles",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-junior-s3-upper-similar-triangles:hjb-junior-s3-upper-similar-triangles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-body-rulers-math-square",
    "topicId": "hjb-primary-p1-lower-body-rulers-math-square",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p1-lower-body-rulers-math-square:hjb-primary-p1-lower-body-rulers-math-square",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-length-measurement",
    "topicId": "hjb-primary-p1-lower-length-measurement",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p1-lower-length-measurement:hjb-primary-p1-lower-length-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-review",
    "topicId": "hjb-primary-p1-lower-review",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-lower-review:hjb-primary-p1-lower-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-time-introduction",
    "topicId": "hjb-primary-p1-lower-time-introduction",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p1-lower-time-introduction:hjb-primary-p1-lower-time-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-within-100-add-sub",
    "topicId": "hjb-primary-p1-lower-within-100-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-lower-within-100-add-sub:hjb-primary-p1-lower-within-100-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-within-100-number-sense",
    "topicId": "hjb-primary-p1-lower-within-100-number-sense",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-lower-within-100-number-sense:hjb-primary-p1-lower-within-100-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-lower-within-20-regrouping",
    "topicId": "hjb-primary-p1-lower-within-20-regrouping",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-lower-within-20-regrouping:hjb-primary-p1-lower-within-20-regrouping",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-review",
    "topicId": "hjb-primary-p1-upper-review",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-upper-review:hjb-primary-p1-upper-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-school-math-habits",
    "topicId": "hjb-primary-p1-upper-school-math-habits",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-upper-school-math-habits:hjb-primary-p1-upper-school-math-habits",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-solids-introduction",
    "topicId": "hjb-primary-p1-upper-solids-introduction",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p1-upper-solids-introduction:hjb-primary-p1-upper-solids-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-within-10-add-sub",
    "topicId": "hjb-primary-p1-upper-within-10-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-upper-within-10-add-sub:hjb-primary-p1-upper-within-10-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-within-10-number-sense",
    "topicId": "hjb-primary-p1-upper-within-10-number-sense",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-upper-within-10-number-sense:hjb-primary-p1-upper-within-10-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p1-upper-within-20-number-add-sub",
    "topicId": "hjb-primary-p1-upper-within-20-number-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p1-upper-within-20-number-add-sub:hjb-primary-p1-upper-within-20-number-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-lower-division-facts",
    "topicId": "hjb-primary-p2-lower-division-facts",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p2-lower-division-facts:hjb-primary-p2-lower-division-facts",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-lower-math-square-review",
    "topicId": "hjb-primary-p2-lower-math-square-review",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p2-lower-math-square-review:hjb-primary-p2-lower-math-square-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-lower-time",
    "topicId": "hjb-primary-p2-lower-time",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p2-lower-time:hjb-primary-p2-lower-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-lower-two-three-digit-add-sub",
    "topicId": "hjb-primary-p2-lower-two-three-digit-add-sub",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p2-lower-two-three-digit-add-sub:hjb-primary-p2-lower-two-three-digit-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-lower-within-10000-number-sense",
    "topicId": "hjb-primary-p2-lower-within-10000-number-sense",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p2-lower-within-10000-number-sense:hjb-primary-p2-lower-within-10000-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-classification",
    "topicId": "hjb-primary-p2-upper-classification",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p2-upper-classification:hjb-primary-p2-upper-classification",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-math-square-review",
    "topicId": "hjb-primary-p2-upper-math-square-review",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p2-upper-math-square-review:hjb-primary-p2-upper-math-square-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-money-shopping",
    "topicId": "hjb-primary-p2-upper-money-shopping",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p2-upper-money-shopping:hjb-primary-p2-upper-money-shopping",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-multiplication-facts",
    "topicId": "hjb-primary-p2-upper-multiplication-facts",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p2-upper-multiplication-facts:hjb-primary-p2-upper-multiplication-facts",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-school-position-direction",
    "topicId": "hjb-primary-p2-upper-school-position-direction",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p2-upper-school-position-direction:hjb-primary-p2-upper-school-position-direction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p2-upper-within-100-add-sub",
    "topicId": "hjb-primary-p2-upper-within-100-add-sub",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p2-upper-within-100-add-sub:hjb-primary-p2-upper-within-100-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-area-measurement",
    "topicId": "hjb-primary-p3-lower-area-measurement",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-lower-area-measurement:hjb-primary-p3-lower-area-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-data-statistics",
    "topicId": "hjb-primary-p3-lower-data-statistics",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p3-lower-data-statistics:hjb-primary-p3-lower-data-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-decimal-introduction",
    "topicId": "hjb-primary-p3-lower-decimal-introduction",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-lower-decimal-introduction:hjb-primary-p3-lower-decimal-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-math-square-review",
    "topicId": "hjb-primary-p3-lower-math-square-review",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-lower-math-square-review:hjb-primary-p3-lower-math-square-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-review-multiplication-division",
    "topicId": "hjb-primary-p3-lower-review-multiplication-division",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-lower-review-multiplication-division:hjb-primary-p3-lower-review-multiplication-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-lower-two-digit-multiplication-division",
    "topicId": "hjb-primary-p3-lower-two-digit-multiplication-division",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-lower-two-digit-multiplication-division:hjb-primary-p3-lower-two-digit-multiplication-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-fraction-introduction",
    "topicId": "hjb-primary-p3-upper-fraction-introduction",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-fraction-introduction:hjb-primary-p3-upper-fraction-introduction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-math-square-review",
    "topicId": "hjb-primary-p3-upper-math-square-review",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-math-square-review:hjb-primary-p3-upper-math-square-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-multiplication-division-extension",
    "topicId": "hjb-primary-p3-upper-multiplication-division-extension",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-multiplication-division-extension:hjb-primary-p3-upper-multiplication-division-extension",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-one-digit-multiplication",
    "topicId": "hjb-primary-p3-upper-one-digit-multiplication",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-one-digit-multiplication:hjb-primary-p3-upper-one-digit-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-rectangle-square-geometry",
    "topicId": "hjb-primary-p3-upper-rectangle-square-geometry",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-rectangle-square-geometry:hjb-primary-p3-upper-rectangle-square-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-review-place-value-operations",
    "topicId": "hjb-primary-p3-upper-review-place-value-operations",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p3-upper-review-place-value-operations:hjb-primary-p3-upper-review-place-value-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p3-upper-time-measurement",
    "topicId": "hjb-primary-p3-upper-time-measurement",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p3-upper-time-measurement:hjb-primary-p3-upper-time-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-lower-decimals-meaning-add-sub",
    "topicId": "hjb-primary-p4-lower-decimals-meaning-add-sub",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p4-lower-decimals-meaning-add-sub:hjb-primary-p4-lower-decimals-meaning-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-lower-line-statistics",
    "topicId": "hjb-primary-p4-lower-line-statistics",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p4-lower-line-statistics:hjb-primary-p4-lower-line-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-lower-review-integration",
    "topicId": "hjb-primary-p4-lower-review-integration",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p4-lower-review-integration:hjb-primary-p4-lower-review-integration",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-lower-review-operation-properties",
    "topicId": "hjb-primary-p4-lower-review-operation-properties",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p4-lower-review-operation-properties:hjb-primary-p4-lower-review-operation-properties",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-lower-vertical-parallel-lines",
    "topicId": "hjb-primary-p4-lower-vertical-parallel-lines",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-lower-vertical-parallel-lines:hjb-primary-p4-lower-vertical-parallel-lines",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-four-operations-problem-solving",
    "topicId": "hjb-primary-p4-upper-four-operations-problem-solving",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p4-upper-four-operations-problem-solving:hjb-primary-p4-upper-four-operations-problem-solving",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-fraction-extension",
    "topicId": "hjb-primary-p4-upper-fraction-extension",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-upper-fraction-extension:hjb-primary-p4-upper-fraction-extension",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-geometry-circle-lines-angles",
    "topicId": "hjb-primary-p4-upper-geometry-circle-lines-angles",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-upper-geometry-circle-lines-angles:hjb-primary-p4-upper-geometry-circle-lines-angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-large-numbers-measurement",
    "topicId": "hjb-primary-p4-upper-large-numbers-measurement",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-upper-large-numbers-measurement:hjb-primary-p4-upper-large-numbers-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-review-integration",
    "topicId": "hjb-primary-p4-upper-review-integration",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-upper-review-integration:hjb-primary-p4-upper-review-integration",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p4-upper-review-operations-fractions",
    "topicId": "hjb-primary-p4-upper-review-operations-fractions",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p4-upper-review-operations-fractions:hjb-primary-p4-upper-review-operations-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-lower-cuboid-cube",
    "topicId": "hjb-primary-p5-lower-cuboid-cube",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p5-lower-cuboid-cube:hjb-primary-p5-lower-cuboid-cube",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-lower-factors-multiples",
    "topicId": "hjb-primary-p5-lower-factors-multiples",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p5-lower-factors-multiples:hjb-primary-p5-lower-factors-multiples",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-lower-fractions-equivalence-operations",
    "topicId": "hjb-primary-p5-lower-fractions-equivalence-operations",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p5-lower-fractions-equivalence-operations:hjb-primary-p5-lower-fractions-equivalence-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-lower-statistics-review",
    "topicId": "hjb-primary-p5-lower-statistics-review",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p5-lower-statistics-review:hjb-primary-p5-lower-statistics-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-upper-data-average",
    "topicId": "hjb-primary-p5-upper-data-average",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p5-upper-data-average:hjb-primary-p5-upper-data-average",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-upper-decimal-operations",
    "topicId": "hjb-primary-p5-upper-decimal-operations",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p5-upper-decimal-operations:hjb-primary-p5-upper-decimal-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-upper-equations-relationships",
    "topicId": "hjb-primary-p5-upper-equations-relationships",
    "source": "function-model",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-primary-p5-upper-equations-relationships:hjb-primary-p5-upper-equations-relationships",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p5-upper-plane-figure-area",
    "topicId": "hjb-primary-p5-upper-plane-figure-area",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p5-upper-plane-figure-area:hjb-primary-p5-upper-plane-figure-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-circle-sector",
    "topicId": "hjb-primary-p6-lower-circle-sector",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-lower-circle-sector:hjb-primary-p6-lower-circle-sector",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-cuboid",
    "topicId": "hjb-primary-p6-lower-cuboid",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-lower-cuboid:hjb-primary-p6-lower-cuboid",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-cylinder-cone",
    "topicId": "hjb-primary-p6-lower-cylinder-cone",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-lower-cylinder-cone:hjb-primary-p6-lower-cylinder-cone",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-linear-equations-inequalities",
    "topicId": "hjb-primary-p6-lower-linear-equations-inequalities",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-primary-p6-lower-linear-equations-inequalities:hjb-primary-p6-lower-linear-equations-inequalities",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-linear-systems",
    "topicId": "hjb-primary-p6-lower-linear-systems",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-primary-p6-lower-linear-systems:hjb-primary-p6-lower-linear-systems",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-probability-statistics",
    "topicId": "hjb-primary-p6-lower-probability-statistics",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "probability:hjb-primary-p6-lower-probability-statistics:hjb-primary-p6-lower-probability-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-ratio-proportion",
    "topicId": "hjb-primary-p6-lower-ratio-proportion",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-lower-ratio-proportion:hjb-primary-p6-lower-ratio-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-rational-numbers",
    "topicId": "hjb-primary-p6-lower-rational-numbers",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "coordinate-plane:hjb-primary-p6-lower-rational-numbers:hjb-primary-p6-lower-rational-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-segments-angles",
    "topicId": "hjb-primary-p6-lower-segments-angles",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-lower-segments-angles:hjb-primary-p6-lower-segments-angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-lower-simple-algebraic-expressions",
    "topicId": "hjb-primary-p6-lower-simple-algebraic-expressions",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "function-model:hjb-primary-p6-lower-simple-algebraic-expressions:hjb-primary-p6-lower-simple-algebraic-expressions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-upper-circle-sector",
    "topicId": "hjb-primary-p6-upper-circle-sector",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-upper-circle-sector:hjb-primary-p6-upper-circle-sector",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-upper-divisibility",
    "topicId": "hjb-primary-p6-upper-divisibility",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-upper-divisibility:hjb-primary-p6-upper-divisibility",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-upper-fractions",
    "topicId": "hjb-primary-p6-upper-fractions",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-upper-fractions:hjb-primary-p6-upper-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "hjb-primary-p6-upper-ratio-proportion",
    "topicId": "hjb-primary-p6-upper-ratio-proportion",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_HJB",
    "publisher": "MAINLAND_HJB",
    "directoryModuleId": "geometry:hjb-primary-p6-upper-ratio-proportion:hjb-primary-p6-upper-ratio-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "identities-square-patterns",
    "topicId": "identities-square-patterns",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:identities-square-patterns:identities-square-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "integers",
    "topicId": "integers",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:integers:integers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "linear-equations",
    "topicId": "linear-equations",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:linear-equations:linear-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "mixed-problem-solving",
    "topicId": "mixed-problem-solving",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:mixed-problem-solving:mixed-problem-solving",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "more-algebra",
    "topicId": "more-algebra",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:more-algebra:more-algebra",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p1-addition-subtraction",
    "topicId": "p1-addition-subtraction",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:p1-addition-subtraction:p1-addition-subtraction",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p1-counting-number-bonds",
    "topicId": "p1-counting-number-bonds",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:p1-counting-number-bonds:p1-counting-number-bonds",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p1-measurement-time",
    "topicId": "p1-measurement-time",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p1-measurement-time:p1-measurement-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p1-shapes-patterns",
    "topicId": "p1-shapes-patterns",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p1-shapes-patterns:p1-shapes-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p2-length-data",
    "topicId": "p2-length-data",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p2-length-data:p2-length-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p2-money-time",
    "topicId": "p2-money-time",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p2-money-time:p2-money-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p2-multiplication-foundations",
    "topicId": "p2-multiplication-foundations",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p2-multiplication-foundations:p2-multiplication-foundations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p2-place-value",
    "topicId": "p2-place-value",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:p2-place-value:p2-place-value",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p3-fractions-intro",
    "topicId": "p3-fractions-intro",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p3-fractions-intro:p3-fractions-intro",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p3-geometry-patterns",
    "topicId": "p3-geometry-patterns",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p3-geometry-patterns:p3-geometry-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p3-measurement",
    "topicId": "p3-measurement",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p3-measurement:p3-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p3-multiplication-division",
    "topicId": "p3-multiplication-division",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p3-multiplication-division:p3-multiplication-division",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p4-angles",
    "topicId": "p4-angles",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p4-angles:p4-angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p4-decimals",
    "topicId": "p4-decimals",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:p4-decimals:p4-decimals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p4-large-numbers",
    "topicId": "p4-large-numbers",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p4-large-numbers:p4-large-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p4-perimeter-area",
    "topicId": "p4-perimeter-area",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p4-perimeter-area:p4-perimeter-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p5-charts-averages",
    "topicId": "p5-charts-averages",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p5-charts-averages:p5-charts-averages",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p5-fractions-operations",
    "topicId": "p5-fractions-operations",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p5-fractions-operations:p5-fractions-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p5-rates",
    "topicId": "p5-rates",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p5-rates:p5-rates",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p5-volume",
    "topicId": "p5-volume",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p5-volume:p5-volume",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p6-percentages",
    "topicId": "p6-percentages",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p6-percentages:p6-percentages",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p6-pre-secondary-problem-solving",
    "topicId": "p6-pre-secondary-problem-solving",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p6-pre-secondary-problem-solving:p6-pre-secondary-problem-solving",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p6-ratio-proportion",
    "topicId": "p6-ratio-proportion",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:p6-ratio-proportion:p6-ratio-proportion",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "p6-speed",
    "topicId": "p6-speed",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:p6-speed:p6-speed",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-complex-numbers",
    "topicId": "pep-high-s4-complex-numbers",
    "source": "coordinate-plane",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-high-s4-complex-numbers:pep-high-s4-complex-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-exp-log",
    "topicId": "pep-high-s4-exp-log",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-high-s4-exp-log:pep-high-s4-exp-log",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-function-properties",
    "topicId": "pep-high-s4-function-properties",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-high-s4-function-properties:pep-high-s4-function-properties",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-plane-vectors",
    "topicId": "pep-high-s4-plane-vectors",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-high-s4-plane-vectors:pep-high-s4-plane-vectors",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-probability",
    "topicId": "pep-high-s4-probability",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s4-probability:pep-high-s4-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-quadratic-inequalities",
    "topicId": "pep-high-s4-quadratic-inequalities",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-graph:pep-high-s4-quadratic-inequalities:pep-high-s4-quadratic-inequalities",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-sets-logic",
    "topicId": "pep-high-s4-sets-logic",
    "source": "function-model",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-high-s4-sets-logic:pep-high-s4-sets-logic",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-solid-geometry-intro",
    "topicId": "pep-high-s4-solid-geometry-intro",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-high-s4-solid-geometry-intro:pep-high-s4-solid-geometry-intro",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-statistics",
    "topicId": "pep-high-s4-statistics",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s4-statistics:pep-high-s4-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s4-trigonometry",
    "topicId": "pep-high-s4-trigonometry",
    "source": "trig-wave",
    "grade": "S4",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "trig-wave:pep-high-s4-trigonometry:pep-high-s4-trigonometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s5-conics",
    "topicId": "pep-high-s5-conics",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-high-s5-conics:pep-high-s5-conics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s5-derivatives",
    "topicId": "pep-high-s5-derivatives",
    "source": "calculus-stats",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "calculus-stats:pep-high-s5-derivatives:pep-high-s5-derivatives",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s5-lines-circles",
    "topicId": "pep-high-s5-lines-circles",
    "source": "coordinate-plane",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-high-s5-lines-circles:pep-high-s5-lines-circles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s5-sequences",
    "topicId": "pep-high-s5-sequences",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-high-s5-sequences:pep-high-s5-sequences",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s5-space-vectors",
    "topicId": "pep-high-s5-space-vectors",
    "source": "geometry",
    "grade": "S5",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-high-s5-space-vectors:pep-high-s5-space-vectors",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-analytic-geometry-synthesis",
    "topicId": "pep-high-s6-analytic-geometry-synthesis",
    "source": "geometry",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-high-s6-analytic-geometry-synthesis:pep-high-s6-analytic-geometry-synthesis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-bivariate-data",
    "topicId": "pep-high-s6-bivariate-data",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s6-bivariate-data:pep-high-s6-bivariate-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-counting",
    "topicId": "pep-high-s6-counting",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s6-counting:pep-high-s6-counting",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-derivative-synthesis",
    "topicId": "pep-high-s6-derivative-synthesis",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "calculus-stats:pep-high-s6-derivative-synthesis:pep-high-s6-derivative-synthesis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-exam-practice",
    "topicId": "pep-high-s6-exam-practice",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-high-s6-exam-practice:pep-high-s6-exam-practice",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-probability-statistics-synthesis",
    "topicId": "pep-high-s6-probability-statistics-synthesis",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s6-probability-statistics-synthesis:pep-high-s6-probability-statistics-synthesis",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-high-s6-random-variables",
    "topicId": "pep-high-s6-random-variables",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-high-s6-random-variables:pep-high-s6-random-variables",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s1-lower-equations-inequalities-data",
    "topicId": "pep-junior-s1-lower-equations-inequalities-data",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-junior-s1-lower-equations-inequalities-data:pep-junior-s1-lower-equations-inequalities-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s1-lower-lines-coordinates",
    "topicId": "pep-junior-s1-lower-lines-coordinates",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-junior-s1-lower-lines-coordinates:pep-junior-s1-lower-lines-coordinates",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s1-upper-expressions-linear-equations",
    "topicId": "pep-junior-s1-upper-expressions-linear-equations",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-junior-s1-upper-expressions-linear-equations:pep-junior-s1-upper-expressions-linear-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s1-upper-geometric-figures",
    "topicId": "pep-junior-s1-upper-geometric-figures",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-junior-s1-upper-geometric-figures:pep-junior-s1-upper-geometric-figures",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s1-upper-rational-numbers",
    "topicId": "pep-junior-s1-upper-rational-numbers",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-junior-s1-upper-rational-numbers:pep-junior-s1-upper-rational-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s2-lower-linear-functions-data",
    "topicId": "pep-junior-s2-lower-linear-functions-data",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-junior-s2-lower-linear-functions-data:pep-junior-s2-lower-linear-functions-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    "topicId": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-junior-s2-lower-roots-pythagorean-quadrilaterals:pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s2-upper-polynomials-fractions",
    "topicId": "pep-junior-s2-upper-polynomials-fractions",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-junior-s2-upper-polynomials-fractions:pep-junior-s2-upper-polynomials-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s2-upper-triangles-congruence",
    "topicId": "pep-junior-s2-upper-triangles-congruence",
    "source": "geometry",
    "grade": "S2",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-junior-s2-upper-triangles-congruence:pep-junior-s2-upper-triangles-congruence",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s3-lower-inverse-similarity-trigonometry",
    "topicId": "pep-junior-s3-lower-inverse-similarity-trigonometry",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-junior-s3-lower-inverse-similarity-trigonometry:pep-junior-s3-lower-inverse-similarity-trigonometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-junior-s3-upper-quadratics-circle-probability",
    "topicId": "pep-junior-s3-upper-quadratics-circle-probability",
    "source": "geometry",
    "grade": "S3",
    "curriculumTrack": "MAINLAND_PEP_JUNIOR",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-junior-s3-upper-quadratics-circle-probability:pep-junior-s3-upper-quadratics-circle-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p1-lower-money-data-review",
    "topicId": "pep-primary-p1-lower-money-data-review",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p1-lower-money-data-review:pep-primary-p1-lower-money-data-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p1-lower-within-100-add-sub",
    "topicId": "pep-primary-p1-lower-within-100-add-sub",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-primary-p1-lower-within-100-add-sub:pep-primary-p1-lower-within-100-add-sub",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p1-upper-number-sense",
    "topicId": "pep-primary-p1-upper-number-sense",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-primary-p1-upper-number-sense:pep-primary-p1-upper-number-sense",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p1-upper-shapes-position-time",
    "topicId": "pep-primary-p1-upper-shapes-position-time",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p1-upper-shapes-position-time:pep-primary-p1-upper-shapes-position-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p2-lower-division-remainder",
    "topicId": "pep-primary-p2-lower-division-remainder",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p2-lower-division-remainder:pep-primary-p2-lower-division-remainder",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p2-lower-place-value-measurement-data",
    "topicId": "pep-primary-p2-lower-place-value-measurement-data",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p2-lower-place-value-measurement-data:pep-primary-p2-lower-place-value-measurement-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p2-upper-length-angles-observation",
    "topicId": "pep-primary-p2-upper-length-angles-observation",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p2-upper-length-angles-observation:pep-primary-p2-upper-length-angles-observation",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p2-upper-multiplication-arrays",
    "topicId": "pep-primary-p2-upper-multiplication-arrays",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p2-upper-multiplication-arrays:pep-primary-p2-upper-multiplication-arrays",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p3-lower-area-decimals",
    "topicId": "pep-primary-p3-lower-area-decimals",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p3-lower-area-decimals:pep-primary-p3-lower-area-decimals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p3-lower-statistics-review",
    "topicId": "pep-primary-p3-lower-statistics-review",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p3-lower-statistics-review:pep-primary-p3-lower-statistics-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p3-upper-measurement-time-geometry",
    "topicId": "pep-primary-p3-upper-measurement-time-geometry",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p3-upper-measurement-time-geometry:pep-primary-p3-upper-measurement-time-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p3-upper-operations-fractions",
    "topicId": "pep-primary-p3-upper-operations-fractions",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p3-upper-operations-fractions:pep-primary-p3-upper-operations-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p4-lower-decimals-average",
    "topicId": "pep-primary-p4-lower-decimals-average",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "probability:pep-primary-p4-lower-decimals-average:pep-primary-p4-lower-decimals-average",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p4-lower-perimeter-area-lines",
    "topicId": "pep-primary-p4-lower-perimeter-area-lines",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p4-lower-perimeter-area-lines:pep-primary-p4-lower-perimeter-area-lines",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p4-upper-angles-geometry",
    "topicId": "pep-primary-p4-upper-angles-geometry",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p4-upper-angles-geometry:pep-primary-p4-upper-angles-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p4-upper-large-numbers-multiplication",
    "topicId": "pep-primary-p4-upper-large-numbers-multiplication",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p4-upper-large-numbers-multiplication:pep-primary-p4-upper-large-numbers-multiplication",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p5-lower-factors-fractions",
    "topicId": "pep-primary-p5-lower-factors-fractions",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p5-lower-factors-fractions:pep-primary-p5-lower-factors-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p5-lower-volume-data",
    "topicId": "pep-primary-p5-lower-volume-data",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p5-lower-volume-data:pep-primary-p5-lower-volume-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p5-upper-decimals-equations",
    "topicId": "pep-primary-p5-upper-decimals-equations",
    "source": "function-model",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "function-model:pep-primary-p5-upper-decimals-equations:pep-primary-p5-upper-decimals-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p5-upper-polygon-area",
    "topicId": "pep-primary-p5-upper-polygon-area",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p5-upper-polygon-area:pep-primary-p5-upper-polygon-area",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p6-lower-negative-review",
    "topicId": "pep-primary-p6-lower-negative-review",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-primary-p6-lower-negative-review:pep-primary-p6-lower-negative-review",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p6-lower-ratio-proportion-scale",
    "topicId": "pep-primary-p6-lower-ratio-proportion-scale",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p6-lower-ratio-proportion-scale:pep-primary-p6-lower-ratio-proportion-scale",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p6-upper-coordinate-data",
    "topicId": "pep-primary-p6-upper-coordinate-data",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "coordinate-plane:pep-primary-p6-upper-coordinate-data:pep-primary-p6-upper-coordinate-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "pep-primary-p6-upper-percent-fractions",
    "topicId": "pep-primary-p6-upper-percent-fractions",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "MAINLAND_PEP_PRIMARY",
    "publisher": "MAINLAND_PEP",
    "directoryModuleId": "geometry:pep-primary-p6-upper-percent-fractions:pep-primary-p6-upper-percent-fractions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "polynomials",
    "topicId": "polynomials",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-model:polynomials:polynomials",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "probability-s2",
    "topicId": "probability-s2",
    "source": "probability",
    "grade": "S2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:probability-s2:probability-s2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "probability-s5",
    "topicId": "probability-s5",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:probability-s5:probability-s5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "quadratic-patterns",
    "topicId": "quadratic-patterns",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "function-graph:quadratic-patterns:quadratic-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "ratios",
    "topicId": "ratios",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "geometry:ratios:ratios",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "statistics-s1",
    "topicId": "statistics-s1",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:statistics-s1:statistics-s1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "statistics-s6",
    "topicId": "statistics-s6",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "probability:statistics-s6:statistics-s6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "transformations",
    "topicId": "transformations",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "coordinate-plane:transformations:transformations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "trigonometry-basics",
    "topicId": "trigonometry-basics",
    "source": "trig-wave",
    "grade": "S3",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "trig-wave:trigonometry-basics:trigonometry-basics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "trigonometry-s5",
    "topicId": "trigonometry-s5",
    "source": "trig-wave",
    "grade": "S5",
    "curriculumTrack": "HK",
    "publisher": null,
    "directoryModuleId": "trig-wave:trigonometry-s5:trigonometry-s5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning",
    "topicId": "us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning:us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g06-chapter-02-rational-numbers-and-the-number-line",
    "topicId": "us-ar-math-g06-chapter-02-rational-numbers-and-the-number-line",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g06-chapter-02-rational-numbers-and-the-number-line:us-ar-math-g06-chapter-02-rational-numbers-and-the-number-line",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g06-chapter-03-expressions-equations-and-variables",
    "topicId": "us-ar-math-g06-chapter-03-expressions-equations-and-variables",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g06-chapter-03-expressions-equations-and-variables:us-ar-math-g06-chapter-03-expressions-equations-and-variables",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume",
    "topicId": "us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume:us-ar-math-g06-chapter-04-geometry-area-surface-area-and-volume",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g06-chapter-05-statistics-and-data-distributions",
    "topicId": "us-ar-math-g06-chapter-05-statistics-and-data-distributions",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g06-chapter-05-statistics-and-data-distributions:us-ar-math-g06-chapter-05-statistics-and-data-distributions",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g07-chapter-01-proportional-relationships",
    "topicId": "us-ar-math-g07-chapter-01-proportional-relationships",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g07-chapter-01-proportional-relationships:us-ar-math-g07-chapter-01-proportional-relationships",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g07-chapter-02-operations-with-rational-numbers",
    "topicId": "us-ar-math-g07-chapter-02-operations-with-rational-numbers",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g07-chapter-02-operations-with-rational-numbers:us-ar-math-g07-chapter-02-operations-with-rational-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g07-chapter-03-linear-expressions-and-equations",
    "topicId": "us-ar-math-g07-chapter-03-linear-expressions-and-equations",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g07-chapter-03-linear-expressions-and-equations:us-ar-math-g07-chapter-03-linear-expressions-and-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g07-chapter-04-scale-geometry-and-measurement",
    "topicId": "us-ar-math-g07-chapter-04-scale-geometry-and-measurement",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g07-chapter-04-scale-geometry-and-measurement:us-ar-math-g07-chapter-04-scale-geometry-and-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g07-chapter-05-sampling-probability-and-inference",
    "topicId": "us-ar-math-g07-chapter-05-sampling-probability-and-inference",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g07-chapter-05-sampling-probability-and-inference:us-ar-math-g07-chapter-05-sampling-probability-and-inference",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g08-chapter-01-linear-equations-and-systems-readiness",
    "topicId": "us-ar-math-g08-chapter-01-linear-equations-and-systems-readiness",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g08-chapter-01-linear-equations-and-systems-readiness:us-ar-math-g08-chapter-01-linear-equations-and-systems-readiness",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g08-chapter-02-functions-and-rate-of-change",
    "topicId": "us-ar-math-g08-chapter-02-functions-and-rate-of-change",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g08-chapter-02-functions-and-rate-of-change:us-ar-math-g08-chapter-02-functions-and-rate-of-change",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g08-chapter-03-transformations-and-similarity",
    "topicId": "us-ar-math-g08-chapter-03-transformations-and-similarity",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g08-chapter-03-transformations-and-similarity:us-ar-math-g08-chapter-03-transformations-and-similarity",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry",
    "topicId": "us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry:us-ar-math-g08-chapter-04-pythagorean-reasoning-and-coordinate-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g08-chapter-05-bivariate-data-and-claims",
    "topicId": "us-ar-math-g08-chapter-05-bivariate-data-and-claims",
    "source": "probability",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g08-chapter-05-bivariate-data-and-claims:us-ar-math-g08-chapter-05-bivariate-data-and-claims",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g09-chapter-01-equations-from-context",
    "topicId": "us-ar-math-g09-chapter-01-equations-from-context",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g09-chapter-01-equations-from-context:us-ar-math-g09-chapter-01-equations-from-context",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g09-chapter-02-function-notation-and-interpretation",
    "topicId": "us-ar-math-g09-chapter-02-function-notation-and-interpretation",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g09-chapter-02-function-notation-and-interpretation:us-ar-math-g09-chapter-02-function-notation-and-interpretation",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g09-chapter-03-linear-and-quadratic-models",
    "topicId": "us-ar-math-g09-chapter-03-linear-and-quadratic-models",
    "source": "function-graph",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-graph:us-ar-math-g09-chapter-03-linear-and-quadratic-models:us-ar-math-g09-chapter-03-linear-and-quadratic-models",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g09-chapter-04-coordinate-geometry-methods",
    "topicId": "us-ar-math-g09-chapter-04-coordinate-geometry-methods",
    "source": "coordinate-plane",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g09-chapter-04-coordinate-geometry-methods:us-ar-math-g09-chapter-04-coordinate-geometry-methods",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g09-chapter-05-modeling-with-evidence",
    "topicId": "us-ar-math-g09-chapter-05-modeling-with-evidence",
    "source": "probability",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g09-chapter-05-modeling-with-evidence:us-ar-math-g09-chapter-05-modeling-with-evidence",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-1",
    "topicId": "us-ar-math-g1-car-1",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-1:us-ar-math-g1-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-2",
    "topicId": "us-ar-math-g1-car-2",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-2:us-ar-math-g1-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-3",
    "topicId": "us-ar-math-g1-car-3",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-3:us-ar-math-g1-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-4",
    "topicId": "us-ar-math-g1-car-4",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-4:us-ar-math-g1-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-5",
    "topicId": "us-ar-math-g1-car-5",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-5:us-ar-math-g1-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-6",
    "topicId": "us-ar-math-g1-car-6",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-6:us-ar-math-g1-car-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-7",
    "topicId": "us-ar-math-g1-car-7",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-7:us-ar-math-g1-car-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-8",
    "topicId": "us-ar-math-g1-car-8",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-car-8:us-ar-math-g1-car-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-car-9",
    "topicId": "us-ar-math-g1-car-9",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g1-car-9:us-ar-math-g1-car-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-da-1",
    "topicId": "us-ar-math-g1-da-1",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g1-da-1:us-ar-math-g1-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-da-2",
    "topicId": "us-ar-math-g1-da-2",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g1-da-2:us-ar-math-g1-da-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-1",
    "topicId": "us-ar-math-g1-gm-1",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g1-gm-1:us-ar-math-g1-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-2",
    "topicId": "us-ar-math-g1-gm-2",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g1-gm-2:us-ar-math-g1-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-3",
    "topicId": "us-ar-math-g1-gm-3",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g1-gm-3:us-ar-math-g1-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-4",
    "topicId": "us-ar-math-g1-gm-4",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g1-gm-4:us-ar-math-g1-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-5",
    "topicId": "us-ar-math-g1-gm-5",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g1-gm-5:us-ar-math-g1-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-6",
    "topicId": "us-ar-math-g1-gm-6",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g1-gm-6:us-ar-math-g1-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-gm-7",
    "topicId": "us-ar-math-g1-gm-7",
    "source": "probability",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g1-gm-7:us-ar-math-g1-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-1",
    "topicId": "us-ar-math-g1-npv-1",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-1:us-ar-math-g1-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-2",
    "topicId": "us-ar-math-g1-npv-2",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-2:us-ar-math-g1-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-3",
    "topicId": "us-ar-math-g1-npv-3",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-3:us-ar-math-g1-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-4",
    "topicId": "us-ar-math-g1-npv-4",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-4:us-ar-math-g1-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-5",
    "topicId": "us-ar-math-g1-npv-5",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-5:us-ar-math-g1-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-6",
    "topicId": "us-ar-math-g1-npv-6",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-6:us-ar-math-g1-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-7",
    "topicId": "us-ar-math-g1-npv-7",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g1-npv-7:us-ar-math-g1-npv-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g1-npv-8",
    "topicId": "us-ar-math-g1-npv-8",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g1-npv-8:us-ar-math-g1-npv-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g10-chapter-01-congruence-and-proof",
    "topicId": "us-ar-math-g10-chapter-01-congruence-and-proof",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g10-chapter-01-congruence-and-proof:us-ar-math-g10-chapter-01-congruence-and-proof",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning",
    "topicId": "us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning:us-ar-math-g10-chapter-02-similarity-and-right-triangle-reasoning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g10-chapter-03-circle-geometry",
    "topicId": "us-ar-math-g10-chapter-03-circle-geometry",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g10-chapter-03-circle-geometry:us-ar-math-g10-chapter-03-circle-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts",
    "topicId": "us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-graph:us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts:us-ar-math-g10-chapter-04-quadratic-structure-in-geometry-contexts",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g10-chapter-05-conditional-probability",
    "topicId": "us-ar-math-g10-chapter-05-conditional-probability",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g10-chapter-05-conditional-probability:us-ar-math-g10-chapter-05-conditional-probability",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g11-chapter-01-function-transformations-and-inverses",
    "topicId": "us-ar-math-g11-chapter-01-function-transformations-and-inverses",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g11-chapter-01-function-transformations-and-inverses:us-ar-math-g11-chapter-01-function-transformations-and-inverses",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models",
    "topicId": "us-ar-math-g11-chapter-02-exponential-and-logarithmic-models",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g11-chapter-02-exponential-and-logarithmic-models:us-ar-math-g11-chapter-02-exponential-and-logarithmic-models",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs",
    "topicId": "us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs",
    "source": "trig-wave",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "trig-wave:us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs:us-ar-math-g11-chapter-03-trigonometric-functions-and-graphs",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g11-chapter-04-data-modeling-and-residuals",
    "topicId": "us-ar-math-g11-chapter-04-data-modeling-and-residuals",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g11-chapter-04-data-modeling-and-residuals:us-ar-math-g11-chapter-04-data-modeling-and-residuals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g11-chapter-05-statistical-inference-and-claims",
    "topicId": "us-ar-math-g11-chapter-05-statistical-inference-and-claims",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g11-chapter-05-statistical-inference-and-claims:us-ar-math-g11-chapter-05-statistical-inference-and-claims",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g12-chapter-01-quantities-units-and-precision",
    "topicId": "us-ar-math-g12-chapter-01-quantities-units-and-precision",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g12-chapter-01-quantities-units-and-precision:us-ar-math-g12-chapter-01-quantities-units-and-precision",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g12-chapter-02-polynomial-structure-and-behavior",
    "topicId": "us-ar-math-g12-chapter-02-polynomial-structure-and-behavior",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g12-chapter-02-polynomial-structure-and-behavior:us-ar-math-g12-chapter-02-polynomial-structure-and-behavior",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g12-chapter-03-decision-statistics",
    "topicId": "us-ar-math-g12-chapter-03-decision-statistics",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g12-chapter-03-decision-statistics:us-ar-math-g12-chapter-03-decision-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g12-chapter-04-function-analysis-and-rates",
    "topicId": "us-ar-math-g12-chapter-04-function-analysis-and-rates",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g12-chapter-04-function-analysis-and-rates:us-ar-math-g12-chapter-04-function-analysis-and-rates",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g12-chapter-05-capstone-modeling",
    "topicId": "us-ar-math-g12-chapter-05-capstone-modeling",
    "source": "calculus-stats",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "calculus-stats:us-ar-math-g12-chapter-05-capstone-modeling:us-ar-math-g12-chapter-05-capstone-modeling",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-1",
    "topicId": "us-ar-math-g2-car-1",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-1:us-ar-math-g2-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-2",
    "topicId": "us-ar-math-g2-car-2",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-2:us-ar-math-g2-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-3",
    "topicId": "us-ar-math-g2-car-3",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-3:us-ar-math-g2-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-4",
    "topicId": "us-ar-math-g2-car-4",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-4:us-ar-math-g2-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-5",
    "topicId": "us-ar-math-g2-car-5",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-car-5:us-ar-math-g2-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-6",
    "topicId": "us-ar-math-g2-car-6",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-6:us-ar-math-g2-car-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-7",
    "topicId": "us-ar-math-g2-car-7",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-7:us-ar-math-g2-car-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-car-8",
    "topicId": "us-ar-math-g2-car-8",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-car-8:us-ar-math-g2-car-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-da-1",
    "topicId": "us-ar-math-g2-da-1",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-da-1:us-ar-math-g2-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-da-2",
    "topicId": "us-ar-math-g2-da-2",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-da-2:us-ar-math-g2-da-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-1",
    "topicId": "us-ar-math-g2-gm-1",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-1:us-ar-math-g2-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-10",
    "topicId": "us-ar-math-g2-gm-10",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-gm-10:us-ar-math-g2-gm-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-11",
    "topicId": "us-ar-math-g2-gm-11",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-gm-11:us-ar-math-g2-gm-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-12",
    "topicId": "us-ar-math-g2-gm-12",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-gm-12:us-ar-math-g2-gm-12",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-2",
    "topicId": "us-ar-math-g2-gm-2",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-2:us-ar-math-g2-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-3",
    "topicId": "us-ar-math-g2-gm-3",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-3:us-ar-math-g2-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-4",
    "topicId": "us-ar-math-g2-gm-4",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-4:us-ar-math-g2-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-5",
    "topicId": "us-ar-math-g2-gm-5",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-5:us-ar-math-g2-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-6",
    "topicId": "us-ar-math-g2-gm-6",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-6:us-ar-math-g2-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-7",
    "topicId": "us-ar-math-g2-gm-7",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-7:us-ar-math-g2-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-8",
    "topicId": "us-ar-math-g2-gm-8",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-gm-8:us-ar-math-g2-gm-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-gm-9",
    "topicId": "us-ar-math-g2-gm-9",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g2-gm-9:us-ar-math-g2-gm-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-1",
    "topicId": "us-ar-math-g2-npv-1",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-1:us-ar-math-g2-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-2",
    "topicId": "us-ar-math-g2-npv-2",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-2:us-ar-math-g2-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-3",
    "topicId": "us-ar-math-g2-npv-3",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-3:us-ar-math-g2-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-4",
    "topicId": "us-ar-math-g2-npv-4",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-4:us-ar-math-g2-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-5",
    "topicId": "us-ar-math-g2-npv-5",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-5:us-ar-math-g2-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-6",
    "topicId": "us-ar-math-g2-npv-6",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g2-npv-6:us-ar-math-g2-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g2-npv-7",
    "topicId": "us-ar-math-g2-npv-7",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g2-npv-7:us-ar-math-g2-npv-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-1",
    "topicId": "us-ar-math-g3-car-1",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-car-1:us-ar-math-g3-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-2",
    "topicId": "us-ar-math-g3-car-2",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-car-2:us-ar-math-g3-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-3",
    "topicId": "us-ar-math-g3-car-3",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-car-3:us-ar-math-g3-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-4",
    "topicId": "us-ar-math-g3-car-4",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-car-4:us-ar-math-g3-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-5",
    "topicId": "us-ar-math-g3-car-5",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-car-5:us-ar-math-g3-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-6",
    "topicId": "us-ar-math-g3-car-6",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-car-6:us-ar-math-g3-car-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-7",
    "topicId": "us-ar-math-g3-car-7",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-car-7:us-ar-math-g3-car-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-8",
    "topicId": "us-ar-math-g3-car-8",
    "source": "function-model",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g3-car-8:us-ar-math-g3-car-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-car-9",
    "topicId": "us-ar-math-g3-car-9",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-car-9:us-ar-math-g3-car-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-da-1",
    "topicId": "us-ar-math-g3-da-1",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g3-da-1:us-ar-math-g3-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-da-2",
    "topicId": "us-ar-math-g3-da-2",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g3-da-2:us-ar-math-g3-da-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-1",
    "topicId": "us-ar-math-g3-gm-1",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-1:us-ar-math-g3-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-10",
    "topicId": "us-ar-math-g3-gm-10",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g3-gm-10:us-ar-math-g3-gm-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-11",
    "topicId": "us-ar-math-g3-gm-11",
    "source": "probability",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g3-gm-11:us-ar-math-g3-gm-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-2",
    "topicId": "us-ar-math-g3-gm-2",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-2:us-ar-math-g3-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-3",
    "topicId": "us-ar-math-g3-gm-3",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-3:us-ar-math-g3-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-4",
    "topicId": "us-ar-math-g3-gm-4",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-4:us-ar-math-g3-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-5",
    "topicId": "us-ar-math-g3-gm-5",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-5:us-ar-math-g3-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-6",
    "topicId": "us-ar-math-g3-gm-6",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-6:us-ar-math-g3-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-7",
    "topicId": "us-ar-math-g3-gm-7",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-7:us-ar-math-g3-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-8",
    "topicId": "us-ar-math-g3-gm-8",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-8:us-ar-math-g3-gm-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-gm-9",
    "topicId": "us-ar-math-g3-gm-9",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-gm-9:us-ar-math-g3-gm-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-1",
    "topicId": "us-ar-math-g3-npv-1",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-npv-1:us-ar-math-g3-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-10",
    "topicId": "us-ar-math-g3-npv-10",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-10:us-ar-math-g3-npv-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-11",
    "topicId": "us-ar-math-g3-npv-11",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-11:us-ar-math-g3-npv-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-2",
    "topicId": "us-ar-math-g3-npv-2",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-npv-2:us-ar-math-g3-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-3",
    "topicId": "us-ar-math-g3-npv-3",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-npv-3:us-ar-math-g3-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-4",
    "topicId": "us-ar-math-g3-npv-4",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g3-npv-4:us-ar-math-g3-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-5",
    "topicId": "us-ar-math-g3-npv-5",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-5:us-ar-math-g3-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-6",
    "topicId": "us-ar-math-g3-npv-6",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-6:us-ar-math-g3-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-7",
    "topicId": "us-ar-math-g3-npv-7",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-7:us-ar-math-g3-npv-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-8",
    "topicId": "us-ar-math-g3-npv-8",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-8:us-ar-math-g3-npv-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g3-npv-9",
    "topicId": "us-ar-math-g3-npv-9",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g3-npv-9:us-ar-math-g3-npv-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-1",
    "topicId": "us-ar-math-g4-car-1",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-car-1:us-ar-math-g4-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-10",
    "topicId": "us-ar-math-g4-car-10",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-10:us-ar-math-g4-car-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-11",
    "topicId": "us-ar-math-g4-car-11",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-11:us-ar-math-g4-car-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-2",
    "topicId": "us-ar-math-g4-car-2",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-car-2:us-ar-math-g4-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-3",
    "topicId": "us-ar-math-g4-car-3",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-3:us-ar-math-g4-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-4",
    "topicId": "us-ar-math-g4-car-4",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-4:us-ar-math-g4-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-5",
    "topicId": "us-ar-math-g4-car-5",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-5:us-ar-math-g4-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-6",
    "topicId": "us-ar-math-g4-car-6",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-6:us-ar-math-g4-car-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-7",
    "topicId": "us-ar-math-g4-car-7",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-car-7:us-ar-math-g4-car-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-8",
    "topicId": "us-ar-math-g4-car-8",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-car-8:us-ar-math-g4-car-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-car-9",
    "topicId": "us-ar-math-g4-car-9",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-car-9:us-ar-math-g4-car-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-da-1",
    "topicId": "us-ar-math-g4-da-1",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g4-da-1:us-ar-math-g4-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-da-2",
    "topicId": "us-ar-math-g4-da-2",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g4-da-2:us-ar-math-g4-da-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-1",
    "topicId": "us-ar-math-g4-gm-1",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-1:us-ar-math-g4-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-10",
    "topicId": "us-ar-math-g4-gm-10",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g4-gm-10:us-ar-math-g4-gm-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-11",
    "topicId": "us-ar-math-g4-gm-11",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-11:us-ar-math-g4-gm-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-2",
    "topicId": "us-ar-math-g4-gm-2",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-2:us-ar-math-g4-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-3",
    "topicId": "us-ar-math-g4-gm-3",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-3:us-ar-math-g4-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-4",
    "topicId": "us-ar-math-g4-gm-4",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-4:us-ar-math-g4-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-5",
    "topicId": "us-ar-math-g4-gm-5",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-5:us-ar-math-g4-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-6",
    "topicId": "us-ar-math-g4-gm-6",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-6:us-ar-math-g4-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-7",
    "topicId": "us-ar-math-g4-gm-7",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-7:us-ar-math-g4-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-8",
    "topicId": "us-ar-math-g4-gm-8",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-gm-8:us-ar-math-g4-gm-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-gm-9",
    "topicId": "us-ar-math-g4-gm-9",
    "source": "probability",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g4-gm-9:us-ar-math-g4-gm-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-1",
    "topicId": "us-ar-math-g4-npv-1",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-1:us-ar-math-g4-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-10",
    "topicId": "us-ar-math-g4-npv-10",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-10:us-ar-math-g4-npv-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-2",
    "topicId": "us-ar-math-g4-npv-2",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-2:us-ar-math-g4-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-3",
    "topicId": "us-ar-math-g4-npv-3",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-3:us-ar-math-g4-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-4",
    "topicId": "us-ar-math-g4-npv-4",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-4:us-ar-math-g4-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-5",
    "topicId": "us-ar-math-g4-npv-5",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-npv-5:us-ar-math-g4-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-6",
    "topicId": "us-ar-math-g4-npv-6",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g4-npv-6:us-ar-math-g4-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-7",
    "topicId": "us-ar-math-g4-npv-7",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-npv-7:us-ar-math-g4-npv-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-8",
    "topicId": "us-ar-math-g4-npv-8",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-npv-8:us-ar-math-g4-npv-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g4-npv-9",
    "topicId": "us-ar-math-g4-npv-9",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g4-npv-9:us-ar-math-g4-npv-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-1",
    "topicId": "us-ar-math-g5-car-1",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-1:us-ar-math-g5-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-10",
    "topicId": "us-ar-math-g5-car-10",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-10:us-ar-math-g5-car-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-11",
    "topicId": "us-ar-math-g5-car-11",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-11:us-ar-math-g5-car-11",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-12",
    "topicId": "us-ar-math-g5-car-12",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-car-12:us-ar-math-g5-car-12",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-13",
    "topicId": "us-ar-math-g5-car-13",
    "source": "function-model",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "function-model:us-ar-math-g5-car-13:us-ar-math-g5-car-13",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-14",
    "topicId": "us-ar-math-g5-car-14",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-car-14:us-ar-math-g5-car-14",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-2",
    "topicId": "us-ar-math-g5-car-2",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-2:us-ar-math-g5-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-3",
    "topicId": "us-ar-math-g5-car-3",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-car-3:us-ar-math-g5-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-4",
    "topicId": "us-ar-math-g5-car-4",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-car-4:us-ar-math-g5-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-5",
    "topicId": "us-ar-math-g5-car-5",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-5:us-ar-math-g5-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-6",
    "topicId": "us-ar-math-g5-car-6",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-6:us-ar-math-g5-car-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-7",
    "topicId": "us-ar-math-g5-car-7",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-7:us-ar-math-g5-car-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-8",
    "topicId": "us-ar-math-g5-car-8",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-8:us-ar-math-g5-car-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-car-9",
    "topicId": "us-ar-math-g5-car-9",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-car-9:us-ar-math-g5-car-9",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-da-1",
    "topicId": "us-ar-math-g5-da-1",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g5-da-1:us-ar-math-g5-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-da-2",
    "topicId": "us-ar-math-g5-da-2",
    "source": "probability",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-g5-da-2:us-ar-math-g5-da-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-1",
    "topicId": "us-ar-math-g5-gm-1",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-1:us-ar-math-g5-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-2",
    "topicId": "us-ar-math-g5-gm-2",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-2:us-ar-math-g5-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-3",
    "topicId": "us-ar-math-g5-gm-3",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-3:us-ar-math-g5-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-4",
    "topicId": "us-ar-math-g5-gm-4",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-4:us-ar-math-g5-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-5",
    "topicId": "us-ar-math-g5-gm-5",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-5:us-ar-math-g5-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-6",
    "topicId": "us-ar-math-g5-gm-6",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-gm-6:us-ar-math-g5-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-7",
    "topicId": "us-ar-math-g5-gm-7",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-gm-7:us-ar-math-g5-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-gm-8",
    "topicId": "us-ar-math-g5-gm-8",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-gm-8:us-ar-math-g5-gm-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-1",
    "topicId": "us-ar-math-g5-npv-1",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-npv-1:us-ar-math-g5-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-2",
    "topicId": "us-ar-math-g5-npv-2",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-npv-2:us-ar-math-g5-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-3",
    "topicId": "us-ar-math-g5-npv-3",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-npv-3:us-ar-math-g5-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-4",
    "topicId": "us-ar-math-g5-npv-4",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-npv-4:us-ar-math-g5-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-5",
    "topicId": "us-ar-math-g5-npv-5",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-g5-npv-5:us-ar-math-g5-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-g5-npv-6",
    "topicId": "us-ar-math-g5-npv-6",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-g5-npv-6:us-ar-math-g5-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-car-1",
    "topicId": "us-ar-math-k-car-1",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-car-1:us-ar-math-k-car-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-car-2",
    "topicId": "us-ar-math-k-car-2",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-car-2:us-ar-math-k-car-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-car-3",
    "topicId": "us-ar-math-k-car-3",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-car-3:us-ar-math-k-car-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-car-4",
    "topicId": "us-ar-math-k-car-4",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-car-4:us-ar-math-k-car-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-car-5",
    "topicId": "us-ar-math-k-car-5",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-car-5:us-ar-math-k-car-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-da-1",
    "topicId": "us-ar-math-k-da-1",
    "source": "probability",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-k-da-1:us-ar-math-k-da-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-1",
    "topicId": "us-ar-math-k-gm-1",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-gm-1:us-ar-math-k-gm-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-2",
    "topicId": "us-ar-math-k-gm-2",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-k-gm-2:us-ar-math-k-gm-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-3",
    "topicId": "us-ar-math-k-gm-3",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-k-gm-3:us-ar-math-k-gm-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-4",
    "topicId": "us-ar-math-k-gm-4",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-k-gm-4:us-ar-math-k-gm-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-5",
    "topicId": "us-ar-math-k-gm-5",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-k-gm-5:us-ar-math-k-gm-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-6",
    "topicId": "us-ar-math-k-gm-6",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "geometry:us-ar-math-k-gm-6:us-ar-math-k-gm-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-7",
    "topicId": "us-ar-math-k-gm-7",
    "source": "probability",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-k-gm-7:us-ar-math-k-gm-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-gm-8",
    "topicId": "us-ar-math-k-gm-8",
    "source": "probability",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "probability:us-ar-math-k-gm-8:us-ar-math-k-gm-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-1",
    "topicId": "us-ar-math-k-npv-1",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-1:us-ar-math-k-npv-1",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-2",
    "topicId": "us-ar-math-k-npv-2",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-2:us-ar-math-k-npv-2",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-3",
    "topicId": "us-ar-math-k-npv-3",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-3:us-ar-math-k-npv-3",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-4",
    "topicId": "us-ar-math-k-npv-4",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-4:us-ar-math-k-npv-4",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-5",
    "topicId": "us-ar-math-k-npv-5",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-5:us-ar-math-k-npv-5",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-6",
    "topicId": "us-ar-math-k-npv-6",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-6:us-ar-math-k-npv-6",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-7",
    "topicId": "us-ar-math-k-npv-7",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-7:us-ar-math-k-npv-7",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ar-math-k-npv-8",
    "topicId": "us-ar-math-k-npv-8",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_AR_MATH",
    "directoryModuleId": "coordinate-plane:us-ar-math-k-npv-8:us-ar-math-k-npv-8",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-cc-cardinality-compare",
    "topicId": "us-ca-math-k-k-cc-cardinality-compare",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-k-k-cc-cardinality-compare:us-ca-math-k-k-cc-cardinality-compare",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-cc-count-sequence",
    "topicId": "us-ca-math-k-k-cc-count-sequence",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-k-k-cc-count-sequence:us-ca-math-k-k-cc-count-sequence",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-g-shapes-position",
    "topicId": "us-ca-math-k-k-g-shapes-position",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-k-k-g-shapes-position:us-ca-math-k-k-g-shapes-position",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-md-attributes-data",
    "topicId": "us-ca-math-k-k-md-attributes-data",
    "source": "geometry",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-k-k-md-attributes-data:us-ca-math-k-k-md-attributes-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-nbt-teen-numbers",
    "topicId": "us-ca-math-k-k-nbt-teen-numbers",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-k-k-nbt-teen-numbers:us-ca-math-k-k-nbt-teen-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-k-k-oa-compose-decompose",
    "topicId": "us-ca-math-k-k-oa-compose-decompose",
    "source": "coordinate-plane",
    "grade": "K",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-k-k-oa-compose-decompose:us-ca-math-k-k-oa-compose-decompose",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-g-shape-reasoning",
    "topicId": "us-ca-math-p1-1-g-shape-reasoning",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p1-1-g-shape-reasoning:us-ca-math-p1-1-g-shape-reasoning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h1-picture-join-stories-to-10",
    "topicId": "us-ca-math-p1-1-h1-picture-join-stories-to-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-h1-picture-join-stories-to-10:us-ca-math-p1-1-h1-picture-join-stories-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h2-picture-story-addition-equations",
    "topicId": "us-ca-math-p1-1-h2-picture-story-addition-equations",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-h2-picture-story-addition-equations:us-ca-math-p1-1-h2-picture-story-addition-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h3-cube-train-join-models-to-10",
    "topicId": "us-ca-math-p1-1-h3-cube-train-join-models-to-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-h3-cube-train-join-models-to-10:us-ca-math-p1-1-h3-cube-train-join-models-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h4-join-stories-within-10",
    "topicId": "us-ca-math-p1-1-h4-join-stories-within-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-h4-join-stories-within-10:us-ca-math-p1-1-h4-join-stories-within-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h5-model-equation-join-stories-to-10",
    "topicId": "us-ca-math-p1-1-h5-model-equation-join-stories-to-10",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-h5-model-equation-join-stories-to-10:us-ca-math-p1-1-h5-model-equation-join-stories-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-h6-equation-match-join-stories-to-10",
    "topicId": "us-ca-math-p1-1-h6-equation-match-join-stories-to-10",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-h6-equation-match-join-stories-to-10:us-ca-math-p1-1-h6-equation-match-join-stories-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l1-picture-take-away-stories-to-10",
    "topicId": "us-ca-math-p1-1-l1-picture-take-away-stories-to-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-l1-picture-take-away-stories-to-10:us-ca-math-p1-1-l1-picture-take-away-stories-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l2-picture-story-subtraction-equations",
    "topicId": "us-ca-math-p1-1-l2-picture-story-subtraction-equations",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-l2-picture-story-subtraction-equations:us-ca-math-p1-1-l2-picture-story-subtraction-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10",
    "topicId": "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-l3-cube-train-take-away-models-to-10:us-ca-math-p1-1-l3-cube-train-take-away-models-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l4-take-away-stories-within-10",
    "topicId": "us-ca-math-p1-1-l4-take-away-stories-within-10",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-l4-take-away-stories-within-10:us-ca-math-p1-1-l4-take-away-stories-within-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10",
    "topicId": "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10:us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10",
    "topicId": "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10",
    "source": "function-model",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10:us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-md-measure-data",
    "topicId": "us-ca-math-p1-1-md-measure-data",
    "source": "geometry",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p1-1-md-measure-data:us-ca-math-p1-1-md-measure-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-nbt-place-value",
    "topicId": "us-ca-math-p1-1-nbt-place-value",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-nbt-place-value:us-ca-math-p1-1-nbt-place-value",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p1-1-oa-add-subtract",
    "topicId": "us-ca-math-p1-1-oa-add-subtract",
    "source": "coordinate-plane",
    "grade": "P1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p1-1-oa-add-subtract:us-ca-math-p1-1-oa-add-subtract",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p2-2-g-partition-shapes",
    "topicId": "us-ca-math-p2-2-g-partition-shapes",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p2-2-g-partition-shapes:us-ca-math-p2-2-g-partition-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p2-2-md-measure-data-money-time",
    "topicId": "us-ca-math-p2-2-md-measure-data-money-time",
    "source": "probability",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-p2-2-md-measure-data-money-time:us-ca-math-p2-2-md-measure-data-money-time",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p2-2-nbt-three-digit-place-value",
    "topicId": "us-ca-math-p2-2-nbt-three-digit-place-value",
    "source": "coordinate-plane",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p2-2-nbt-three-digit-place-value:us-ca-math-p2-2-nbt-three-digit-place-value",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p2-2-oa-fluency-arrays",
    "topicId": "us-ca-math-p2-2-oa-fluency-arrays",
    "source": "geometry",
    "grade": "P2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p2-2-oa-fluency-arrays:us-ca-math-p2-2-oa-fluency-arrays",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p3-3-g-categories",
    "topicId": "us-ca-math-p3-3-g-categories",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p3-3-g-categories:us-ca-math-p3-3-g-categories",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p3-3-md-time-data-area-perimeter",
    "topicId": "us-ca-math-p3-3-md-time-data-area-perimeter",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p3-3-md-time-data-area-perimeter:us-ca-math-p3-3-md-time-data-area-perimeter",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p3-3-nbt-arithmetic",
    "topicId": "us-ca-math-p3-3-nbt-arithmetic",
    "source": "coordinate-plane",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p3-3-nbt-arithmetic:us-ca-math-p3-3-nbt-arithmetic",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p3-3-nf-fraction-meaning",
    "topicId": "us-ca-math-p3-3-nf-fraction-meaning",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p3-3-nf-fraction-meaning:us-ca-math-p3-3-nf-fraction-meaning",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p3-3-oa-mult-div",
    "topicId": "us-ca-math-p3-3-oa-mult-div",
    "source": "geometry",
    "grade": "P3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p3-3-oa-mult-div:us-ca-math-p3-3-oa-mult-div",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p4-4-g-lines-shapes",
    "topicId": "us-ca-math-p4-4-g-lines-shapes",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p4-4-g-lines-shapes:us-ca-math-p4-4-g-lines-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p4-4-md-conversion-angles",
    "topicId": "us-ca-math-p4-4-md-conversion-angles",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p4-4-md-conversion-angles:us-ca-math-p4-4-md-conversion-angles",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p4-4-nbt-multi-digit",
    "topicId": "us-ca-math-p4-4-nbt-multi-digit",
    "source": "coordinate-plane",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p4-4-nbt-multi-digit:us-ca-math-p4-4-nbt-multi-digit",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p4-4-nf-fraction-decimal",
    "topicId": "us-ca-math-p4-4-nf-fraction-decimal",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p4-4-nf-fraction-decimal:us-ca-math-p4-4-nf-fraction-decimal",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p4-4-oa-factors-patterns",
    "topicId": "us-ca-math-p4-4-oa-factors-patterns",
    "source": "geometry",
    "grade": "P4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p4-4-oa-factors-patterns:us-ca-math-p4-4-oa-factors-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p5-5-g-coordinate-shapes",
    "topicId": "us-ca-math-p5-5-g-coordinate-shapes",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p5-5-g-coordinate-shapes:us-ca-math-p5-5-g-coordinate-shapes",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p5-5-md-volume-data",
    "topicId": "us-ca-math-p5-5-md-volume-data",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p5-5-md-volume-data:us-ca-math-p5-5-md-volume-data",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p5-5-nbt-decimals",
    "topicId": "us-ca-math-p5-5-nbt-decimals",
    "source": "coordinate-plane",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p5-5-nbt-decimals:us-ca-math-p5-5-nbt-decimals",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p5-5-nf-operations",
    "topicId": "us-ca-math-p5-5-nf-operations",
    "source": "geometry",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p5-5-nf-operations:us-ca-math-p5-5-nf-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p5-5-oa-expressions-patterns",
    "topicId": "us-ca-math-p5-5-oa-expressions-patterns",
    "source": "function-model",
    "grade": "P5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p5-5-oa-expressions-patterns:us-ca-math-p5-5-oa-expressions-patterns",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p6-chapter-01",
    "topicId": "us-ca-math-p6-chapter-01",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p6-chapter-01:us-ca-math-p6-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p6-chapter-02",
    "topicId": "us-ca-math-p6-chapter-02",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-p6-chapter-02:us-ca-math-p6-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p6-chapter-03",
    "topicId": "us-ca-math-p6-chapter-03",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-p6-chapter-03:us-ca-math-p6-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p6-chapter-04",
    "topicId": "us-ca-math-p6-chapter-04",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-p6-chapter-04:us-ca-math-p6-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-p6-chapter-05",
    "topicId": "us-ca-math-p6-chapter-05",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-p6-chapter-05:us-ca-math-p6-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s1-chapter-01",
    "topicId": "us-ca-math-s1-chapter-01",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-s1-chapter-01:us-ca-math-s1-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s1-chapter-02",
    "topicId": "us-ca-math-s1-chapter-02",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-s1-chapter-02:us-ca-math-s1-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s1-chapter-03",
    "topicId": "us-ca-math-s1-chapter-03",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s1-chapter-03:us-ca-math-s1-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s1-chapter-04",
    "topicId": "us-ca-math-s1-chapter-04",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-s1-chapter-04:us-ca-math-s1-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s1-chapter-05",
    "topicId": "us-ca-math-s1-chapter-05",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s1-chapter-05:us-ca-math-s1-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s2-chapter-01",
    "topicId": "us-ca-math-s2-chapter-01",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s2-chapter-01:us-ca-math-s2-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s2-chapter-02",
    "topicId": "us-ca-math-s2-chapter-02",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s2-chapter-02:us-ca-math-s2-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s2-chapter-03",
    "topicId": "us-ca-math-s2-chapter-03",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-s2-chapter-03:us-ca-math-s2-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s2-chapter-04",
    "topicId": "us-ca-math-s2-chapter-04",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-s2-chapter-04:us-ca-math-s2-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s2-chapter-05",
    "topicId": "us-ca-math-s2-chapter-05",
    "source": "probability",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s2-chapter-05:us-ca-math-s2-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s3-chapter-01",
    "topicId": "us-ca-math-s3-chapter-01",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s3-chapter-01:us-ca-math-s3-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s3-chapter-02",
    "topicId": "us-ca-math-s3-chapter-02",
    "source": "function-model",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s3-chapter-02:us-ca-math-s3-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s3-chapter-03",
    "topicId": "us-ca-math-s3-chapter-03",
    "source": "function-graph",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-graph:us-ca-math-s3-chapter-03:us-ca-math-s3-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s3-chapter-04",
    "topicId": "us-ca-math-s3-chapter-04",
    "source": "coordinate-plane",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "coordinate-plane:us-ca-math-s3-chapter-04:us-ca-math-s3-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s3-chapter-05",
    "topicId": "us-ca-math-s3-chapter-05",
    "source": "probability",
    "grade": "S3",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s3-chapter-05:us-ca-math-s3-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s4-chapter-01",
    "topicId": "us-ca-math-s4-chapter-01",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-s4-chapter-01:us-ca-math-s4-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s4-chapter-02",
    "topicId": "us-ca-math-s4-chapter-02",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-s4-chapter-02:us-ca-math-s4-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s4-chapter-03",
    "topicId": "us-ca-math-s4-chapter-03",
    "source": "geometry",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "geometry:us-ca-math-s4-chapter-03:us-ca-math-s4-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s4-chapter-04",
    "topicId": "us-ca-math-s4-chapter-04",
    "source": "function-graph",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-graph:us-ca-math-s4-chapter-04:us-ca-math-s4-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s4-chapter-05",
    "topicId": "us-ca-math-s4-chapter-05",
    "source": "probability",
    "grade": "S4",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s4-chapter-05:us-ca-math-s4-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s5-chapter-01",
    "topicId": "us-ca-math-s5-chapter-01",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s5-chapter-01:us-ca-math-s5-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s5-chapter-02",
    "topicId": "us-ca-math-s5-chapter-02",
    "source": "function-model",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s5-chapter-02:us-ca-math-s5-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s5-chapter-03",
    "topicId": "us-ca-math-s5-chapter-03",
    "source": "trig-wave",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "trig-wave:us-ca-math-s5-chapter-03:us-ca-math-s5-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s5-chapter-04",
    "topicId": "us-ca-math-s5-chapter-04",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s5-chapter-04:us-ca-math-s5-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s5-chapter-05",
    "topicId": "us-ca-math-s5-chapter-05",
    "source": "probability",
    "grade": "S5",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s5-chapter-05:us-ca-math-s5-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s6-chapter-01",
    "topicId": "us-ca-math-s6-chapter-01",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s6-chapter-01:us-ca-math-s6-chapter-01",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s6-chapter-02",
    "topicId": "us-ca-math-s6-chapter-02",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s6-chapter-02:us-ca-math-s6-chapter-02",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s6-chapter-03",
    "topicId": "us-ca-math-s6-chapter-03",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s6-chapter-03:us-ca-math-s6-chapter-03",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s6-chapter-04",
    "topicId": "us-ca-math-s6-chapter-04",
    "source": "function-model",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "function-model:us-ca-math-s6-chapter-04:us-ca-math-s6-chapter-04",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-ca-math-s6-chapter-05",
    "topicId": "us-ca-math-s6-chapter-05",
    "source": "probability",
    "grade": "S6",
    "curriculumTrack": "US",
    "publisher": "US_CA_MATH",
    "directoryModuleId": "probability:us-ca-math-s6-chapter-05:us-ca-math-s6-chapter-05",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-p6-chapter-01-ratios-rates-and-percents",
    "topicId": "us-fl-math-p6-chapter-01-ratios-rates-and-percents",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "geometry:us-fl-math-p6-chapter-01-ratios-rates-and-percents:us-fl-math-p6-chapter-01-ratios-rates-and-percents",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-p6-chapter-02-rational-numbers",
    "topicId": "us-fl-math-p6-chapter-02-rational-numbers",
    "source": "coordinate-plane",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "coordinate-plane:us-fl-math-p6-chapter-02-rational-numbers:us-fl-math-p6-chapter-02-rational-numbers",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-p6-chapter-03-expressions-and-equations",
    "topicId": "us-fl-math-p6-chapter-03-expressions-and-equations",
    "source": "function-model",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "function-model:us-fl-math-p6-chapter-03-expressions-and-equations:us-fl-math-p6-chapter-03-expressions-and-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-p6-chapter-04-geometry-measurement",
    "topicId": "us-fl-math-p6-chapter-04-geometry-measurement",
    "source": "geometry",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "geometry:us-fl-math-p6-chapter-04-geometry-measurement:us-fl-math-p6-chapter-04-geometry-measurement",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-p6-chapter-05-statistics",
    "topicId": "us-fl-math-p6-chapter-05-statistics",
    "source": "probability",
    "grade": "P6",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "probability:us-fl-math-p6-chapter-05-statistics:us-fl-math-p6-chapter-05-statistics",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s1-chapter-01-proportional-relationships",
    "topicId": "us-fl-math-s1-chapter-01-proportional-relationships",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "geometry:us-fl-math-s1-chapter-01-proportional-relationships:us-fl-math-s1-chapter-01-proportional-relationships",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s1-chapter-02-rational-operations",
    "topicId": "us-fl-math-s1-chapter-02-rational-operations",
    "source": "coordinate-plane",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "coordinate-plane:us-fl-math-s1-chapter-02-rational-operations:us-fl-math-s1-chapter-02-rational-operations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s1-chapter-03-linear-expressions-and-equations",
    "topicId": "us-fl-math-s1-chapter-03-linear-expressions-and-equations",
    "source": "function-model",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "function-model:us-fl-math-s1-chapter-03-linear-expressions-and-equations:us-fl-math-s1-chapter-03-linear-expressions-and-equations",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s1-chapter-04-scale-and-geometry",
    "topicId": "us-fl-math-s1-chapter-04-scale-and-geometry",
    "source": "geometry",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "geometry:us-fl-math-s1-chapter-04-scale-and-geometry:us-fl-math-s1-chapter-04-scale-and-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s1-chapter-05-probability-and-inference",
    "topicId": "us-fl-math-s1-chapter-05-probability-and-inference",
    "source": "probability",
    "grade": "S1",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "probability:us-fl-math-s1-chapter-05-probability-and-inference:us-fl-math-s1-chapter-05-probability-and-inference",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s2-chapter-01-linear-equations-and-systems-readiness",
    "topicId": "us-fl-math-s2-chapter-01-linear-equations-and-systems-readiness",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "function-model:us-fl-math-s2-chapter-01-linear-equations-and-systems-readiness:us-fl-math-s2-chapter-01-linear-equations-and-systems-readiness",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s2-chapter-02-functions-and-rate-of-change",
    "topicId": "us-fl-math-s2-chapter-02-functions-and-rate-of-change",
    "source": "function-model",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "function-model:us-fl-math-s2-chapter-02-functions-and-rate-of-change:us-fl-math-s2-chapter-02-functions-and-rate-of-change",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s2-chapter-03-transformations-and-similarity",
    "topicId": "us-fl-math-s2-chapter-03-transformations-and-similarity",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "coordinate-plane:us-fl-math-s2-chapter-03-transformations-and-similarity:us-fl-math-s2-chapter-03-transformations-and-similarity",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry",
    "topicId": "us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry",
    "source": "coordinate-plane",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "coordinate-plane:us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry:us-fl-math-s2-chapter-04-pythagorean-and-coordinate-geometry",
    "lessonModuleId": "configured-visualization-lab"
  },
  {
    "labId": "us-fl-math-s2-chapter-05-bivariate-data",
    "topicId": "us-fl-math-s2-chapter-05-bivariate-data",
    "source": "probability",
    "grade": "S2",
    "curriculumTrack": "US",
    "publisher": "US_FL_MATH",
    "directoryModuleId": "probability:us-fl-math-s2-chapter-05-bivariate-data:us-fl-math-s2-chapter-05-bivariate-data",
    "lessonModuleId": "configured-visualization-lab"
  }
] as const satisfies readonly GeneratedVisualizationSessionCatalogEntry[];

