import type { Topic } from "@/types";

export type MainlandPepPrimarySemester = "upper" | "lower";

export type MainlandPepPrimaryQuestionFamily =
  | "number-sense"
  | "geometry-position"
  | "addition-subtraction"
  | "time-data"
  | "multiplication"
  | "measurement-geometry"
  | "division-remainder"
  | "place-value-measurement"
  | "operations-fractions"
  | "measurement-time-geometry"
  | "area-decimals"
  | "statistics-review"
  | "large-numbers-multiplication"
  | "angles-geometry"
  | "decimals-average"
  | "perimeter-area-lines"
  | "decimals-equations"
  | "polygon-area"
  | "factors-fractions"
  | "volume-data"
  | "percent-fractions"
  | "coordinate-data"
  | "ratio-proportion"
  | "negative-review";

type MainlandPepPrimaryTopicSeed = Omit<Topic, "curriculumTrack" | "status" | "mastery"> & {
  semester: MainlandPepPrimarySemester;
  family: MainlandPepPrimaryQuestionFamily;
  status?: Topic["status"];
  mastery?: number;
};

const mainlandPepProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_PEP" as const };

export const mainlandPepPrimaryTopicSeeds: MainlandPepPrimaryTopicSeed[] = [
  {
    id: "pep-primary-p1-upper-number-sense",
    grade: "P1",
    semester: "upper",
    family: "number-sense",
    title: { en: "Numbers Within 20", zh: "20以内数感" },
    description: { en: "Count, compare, compose, and decompose small whole numbers.", zh: "认读、比较、组成和分解20以内的数。" },
    difficulty: "Low",
    minutes: 18
  },
  {
    id: "pep-primary-p1-upper-shapes-position-time",
    grade: "P1",
    semester: "upper",
    family: "geometry-position",
    title: { en: "Shapes, Position, and Whole Hours", zh: "图形、位置与整时" },
    description: { en: "Recognize simple solids, describe positions, sort objects, and read whole-hour clocks.", zh: "认识简单立体图形，描述位置，按特征分类，并认读整时。" },
    difficulty: "Low",
    minutes: 18
  },
  {
    id: "pep-primary-p1-lower-within-100-add-sub",
    grade: "P1",
    semester: "lower",
    family: "addition-subtraction",
    title: { en: "Numbers Within 100 and Addition/Subtraction", zh: "100以内数与加减法" },
    description: { en: "Use tens and ones, make ten, and solve addition or subtraction stories.", zh: "理解十位个位，运用凑十和分解解决加减问题。" },
    difficulty: "Low",
    minutes: 20
  },
  {
    id: "pep-primary-p1-lower-money-data-review",
    grade: "P1",
    semester: "lower",
    family: "time-data",
    title: { en: "Money, Time, and Data", zh: "人民币、时间与数据" },
    description: { en: "Read simple money, clock, and category-count situations.", zh: "读懂简单人民币、时间和分类统计情境。" },
    difficulty: "Low",
    minutes: 20
  },
  {
    id: "pep-primary-p2-upper-multiplication-arrays",
    grade: "P2",
    semester: "upper",
    family: "multiplication",
    title: { en: "Multiplication and Arrays", zh: "表内乘法与阵列" },
    description: { en: "Connect equal groups, repeated addition, arrays, and multiplication facts.", zh: "联系几个几、连加、阵列和乘法口诀。" },
    difficulty: "Low",
    minutes: 24
  },
  {
    id: "pep-primary-p2-upper-length-angles-observation",
    grade: "P2",
    semester: "upper",
    family: "measurement-geometry",
    title: { en: "Length, Angles, and Observation", zh: "长度、角与观察物体" },
    description: { en: "Choose length units, compare measures, identify angles, and reason from views.", zh: "选择长度单位，比较测量结果，认识角，并从不同方向观察物体。" },
    difficulty: "Low",
    minutes: 24
  },
  {
    id: "pep-primary-p2-lower-division-remainder",
    grade: "P2",
    semester: "lower",
    family: "division-remainder",
    title: { en: "Division and Remainders", zh: "表内除法与有余数除法" },
    description: { en: "Use sharing, grouping, multiplication facts, and remainder checks.", zh: "用平均分、包含分、乘法口诀和余数检查解决除法问题。" },
    difficulty: "Medium",
    minutes: 26
  },
  {
    id: "pep-primary-p2-lower-place-value-measurement-data",
    grade: "P2",
    semester: "lower",
    family: "place-value-measurement",
    title: { en: "Place Value, Mass, Time, and Data", zh: "万以内数、质量、时间与数据" },
    description: { en: "Read thousands, compare numbers, use mass and time units, and read simple tables.", zh: "认识万以内数，比较数的大小，运用质量和时间单位，并读取简单统计表。" },
    difficulty: "Medium",
    minutes: 26
  },
  {
    id: "pep-primary-p3-upper-operations-fractions",
    grade: "P3",
    semester: "upper",
    family: "operations-fractions",
    title: { en: "Multi-digit Operations and Fractions", zh: "多位数运算与分数初步" },
    description: { en: "Estimate, calculate with place value, and name equal parts as fractions.", zh: "估算并用位值计算，认识平均分成的几分之一和几分之几。" },
    difficulty: "Medium",
    minutes: 28
  },
  {
    id: "pep-primary-p3-upper-measurement-time-geometry",
    grade: "P3",
    semester: "upper",
    family: "measurement-time-geometry",
    title: { en: "Measurement, Time, and Geometry", zh: "测量、年月日与几何" },
    description: { en: "Use units, elapsed time, simple angles, and pattern reasoning.", zh: "运用计量单位、经过时间、简单角和规律推理。" },
    difficulty: "Medium",
    minutes: 28
  },
  {
    id: "pep-primary-p3-lower-area-decimals",
    grade: "P3",
    semester: "lower",
    family: "area-decimals",
    title: { en: "Area and Decimals", zh: "面积与小数初步" },
    description: { en: "Separate area from perimeter and connect decimals with money or measures.", zh: "区分面积和周长，并把小数与钱数、长度等量联系起来。" },
    difficulty: "Medium",
    minutes: 30
  },
  {
    id: "pep-primary-p3-lower-statistics-review",
    grade: "P3",
    semester: "lower",
    family: "statistics-review",
    title: { en: "Data Reading and Review", zh: "统计表达与综合复习" },
    description: { en: "Read small data displays and solve short mixed review tasks.", zh: "读取小型统计图表，解决短小综合复习问题。" },
    difficulty: "Medium",
    minutes: 30
  },
  {
    id: "pep-primary-p4-upper-large-numbers-multiplication",
    grade: "P4",
    semester: "upper",
    family: "large-numbers-multiplication",
    title: { en: "Large Numbers and Multiplication", zh: "大数认识与三位数乘法" },
    description: { en: "Read, compare, round, estimate, and multiply larger whole numbers.", zh: "读写、比较、改写、取近似数，并计算较大整数乘法。" },
    difficulty: "Medium",
    minutes: 32
  },
  {
    id: "pep-primary-p4-upper-angles-geometry",
    grade: "P4",
    semester: "upper",
    family: "angles-geometry",
    title: { en: "Angles and Geometry Language", zh: "角的度量与几何语言" },
    description: { en: "Estimate and measure angles, classify angle types, and use basic geometry language.", zh: "估计和度量角，辨认角的类型，并使用基本几何语言。" },
    difficulty: "Medium",
    minutes: 30
  },
  {
    id: "pep-primary-p4-lower-decimals-average",
    grade: "P4",
    semester: "lower",
    family: "decimals-average",
    title: { en: "Decimal Operations and Average", zh: "小数运算与平均数" },
    description: { en: "Compare and calculate decimals, convert units, and interpret averages.", zh: "比较和计算小数，进行单位换算，并理解平均数的含义。" },
    difficulty: "Medium",
    minutes: 32
  },
  {
    id: "pep-primary-p4-lower-perimeter-area-lines",
    grade: "P4",
    semester: "lower",
    family: "perimeter-area-lines",
    title: { en: "Perimeter, Area, Parallel, and Perpendicular", zh: "周长面积、平行与垂直" },
    description: { en: "Use perimeter and area formulas and distinguish parallel or perpendicular relations.", zh: "运用周长和面积公式，辨别平行与垂直关系。" },
    difficulty: "Medium",
    minutes: 32
  },
  {
    id: "pep-primary-p5-upper-decimals-equations",
    grade: "P5",
    semester: "upper",
    family: "decimals-equations",
    title: { en: "Decimal Operations and Equations", zh: "小数乘除与简易方程" },
    description: { en: "Calculate with decimals, express unknowns, and solve simple equations.", zh: "进行小数乘除，表示未知数，并解简易方程。" },
    difficulty: "Medium",
    minutes: 34
  },
  {
    id: "pep-primary-p5-upper-polygon-area",
    grade: "P5",
    semester: "upper",
    family: "polygon-area",
    title: { en: "Polygon Area", zh: "多边形面积" },
    description: { en: "Find areas of parallelograms, triangles, and trapezoids by decomposition.", zh: "通过转化和分割求平行四边形、三角形和梯形面积。" },
    difficulty: "Medium",
    minutes: 34
  },
  {
    id: "pep-primary-p5-lower-factors-fractions",
    grade: "P5",
    semester: "lower",
    family: "factors-fractions",
    title: { en: "Factors, Multiples, and Fractions", zh: "因数倍数与分数运算" },
    description: { en: "Classify factors and multiples, simplify fractions, and add or subtract fractions.", zh: "辨认因数和倍数，约分通分，并进行分数加减。" },
    difficulty: "Medium",
    minutes: 34
  },
  {
    id: "pep-primary-p5-lower-volume-data",
    grade: "P5",
    semester: "lower",
    family: "volume-data",
    title: { en: "Cuboids, Cubes, and Data", zh: "长方体正方体与数据" },
    description: { en: "Use volume units, calculate cuboids and cubes, and interpret small data displays.", zh: "运用体积单位，计算长方体和正方体体积，并解释小型数据图表。" },
    difficulty: "Medium",
    minutes: 34
  },
  {
    id: "pep-primary-p6-upper-percent-fractions",
    grade: "P6",
    semester: "upper",
    family: "percent-fractions",
    title: { en: "Fraction Operations and Percent", zh: "分数运算与百分数" },
    description: { en: "Connect fractions, decimals, percentages, discounts, and growth contexts.", zh: "联系分数、小数、百分数、折扣和增长情境。" },
    difficulty: "Medium",
    minutes: 36
  },
  {
    id: "pep-primary-p6-upper-coordinate-data",
    grade: "P6",
    semester: "upper",
    family: "coordinate-data",
    title: { en: "Position and Data Displays", zh: "位置与数据表达" },
    description: { en: "Use ordered pairs, directions, and sector-style data reasoning.", zh: "使用数对、方向和扇形统计图式的数据推理。" },
    difficulty: "Medium",
    minutes: 34
  },
  {
    id: "pep-primary-p6-lower-ratio-proportion-scale",
    grade: "P6",
    semester: "lower",
    family: "ratio-proportion",
    title: { en: "Ratio, Proportion, and Scale", zh: "比、比例与比例尺" },
    description: { en: "Model ratios, direct proportion, inverse proportion, and scale.", zh: "建立比、正比例、反比例和比例尺模型。" },
    difficulty: "Medium",
    minutes: 38
  },
  {
    id: "pep-primary-p6-lower-negative-review",
    grade: "P6",
    semester: "lower",
    family: "negative-review",
    title: { en: "Negative Numbers and Primary Review", zh: "负数与小学总复习" },
    description: { en: "Interpret negative numbers and solve multi-topic transition review tasks.", zh: "理解负数意义，并解决跨知识点的升学衔接复习问题。" },
    difficulty: "Medium",
    minutes: 38
  }
];

export const mainlandPepPrimaryTopicMetadata: Record<
  string,
  { semester: MainlandPepPrimarySemester; family: MainlandPepPrimaryQuestionFamily }
> = Object.fromEntries(
  mainlandPepPrimaryTopicSeeds.map((topic) => [topic.id, { semester: topic.semester, family: topic.family }])
);

export const mainlandPepPrimaryTopics: Topic[] = mainlandPepPrimaryTopicSeeds.map((topic, index) => {
  const { semester: _semester, family: _family, status, mastery, ...topicData } = topic;

  return {
    ...topicData,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandPepProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_PEP",
    canonicalTopicId: topic.id,
    status: status ?? (index % 4 === 0 ? "completed" : index % 4 === 1 ? "in-progress" : "not-started"),
    mastery: mastery ?? (index % 4 === 0 ? 72 : index % 4 === 1 ? 48 : 0)
  };
});
