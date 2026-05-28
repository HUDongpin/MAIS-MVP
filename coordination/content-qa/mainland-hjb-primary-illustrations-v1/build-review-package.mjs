import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageDir = path.relative(projectRoot, __dirname);
const questionPackPath = path.join(projectRoot, "coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json");
const outDir = path.join(projectRoot, packageDir);
const candidatesDir = path.join(outDir, "candidates");
const imageWidth = 1600;
const imageHeight = 900;
const slots = ["concept", "worked-example"];

const gradeOrder = ["P1", "P2", "P3", "P4", "P5", "P6"];
const semesterOrder = ["upper", "lower", "full-year"];
const generatedAt = new Date().toISOString();

const unitTitleEnByZhHans = {
  "我是小学生与数学学习习惯": "Becoming a Primary Student and Math Learning Habits",
  "认识立体图形": "Understanding Solid Shapes",
  "10以内数的认识": "Understanding Numbers within 10",
  "10以内数的加减法": "Addition and Subtraction within 10",
  "20以内的数与不进位不退位加减": "Numbers within 20 and Non-Regrouping Addition and Subtraction",
  "一年级上册整理与复习": "Grade 1 Volume 1 Review and Consolidation",
  "20以内数的加减法（二）": "Addition and Subtraction within 20 (II)",
  "100以内的数": "Numbers within 100",
  "100以内数的加减法（一）": "Addition and Subtraction within 100 (I)",
  "时间的初步认识": "Introductory Time",
  "长度的比较与测量": "Comparing and Measuring Length",
  "身体上的尺子与数学广场": "Body-Based Measures and Math Square",
  "一年级下册整理与复习": "Grade 1 Volume 2 Review and Consolidation",
  "100以内数的加减法（二）": "Addition and Subtraction within 100 (II)",
  "人民币与购物应用": "Renminbi and Shopping Applications",
  "校园方位与位置表达": "School Directions and Position Language",
  "表内乘法": "Multiplication Facts",
  "分类与整理": "Sorting and Organizing",
  "二年级上册数学广场与整理复习": "Grade 2 Volume 1 Math Square and Review",
  "表内除法": "Division Facts",
  "时间在哪里": "Finding Time",
  "万以内的数": "Numbers within 10,000",
  "两位数与三位数的加减法": "Addition and Subtraction of Two- and Three-Digit Numbers",
  "二年级下册数学广场与整理复习": "Grade 2 Volume 2 Math Square and Review",
  "三年级上册复习与数的运算": "Grade 3 Volume 1 Review and Number Operations",
  "乘与除": "Multiplication and Division",
  "时间与日程推理": "Time and Schedule Reasoning",
  "用一位数乘": "Multiplication by a One-Digit Number",
  "长方形与正方形": "Rectangles and Squares",
  "分数的初步认识": "Introductory Fractions",
  "三年级上册数学广场与整理复习": "Grade 3 Volume 1 Math Square and Review",
  "三年级下册复习与乘除运算": "Grade 3 Volume 2 Review and Multiplication-Division",
  "两位数乘除与问题解决": "Two-Digit Multiplication, Division, and Problem Solving",
  "小数的初步认识": "Introductory Decimals",
  "面积与周长": "Area and Perimeter",
  "数据整理与统计表达": "Data Organization and Statistical Representation",
  "三年级下册数学广场与整理复习": "Grade 3 Volume 2 Math Square and Review",
  "复习与提高": "Review and Extension",
  "数与量": "Numbers and Measurement",
  "分数的初步认识（二）": "Introductory Fractions (II)",
  "整数的四则运算": "Four Operations with Whole Numbers",
  "几何小实践": "Geometry Practice",
  "四年级上册整理与提高": "Grade 4 Volume 1 Review and Extension",
  "小数的认识与加减法": "Understanding Decimals, Addition, and Subtraction",
  "统计": "Statistics",
  "四年级下册整理与提高": "Grade 4 Volume 2 Review and Extension",
  "小数乘除法与估算": "Decimal Multiplication, Division, and Estimation",
  "用字母表示数与简易方程": "Using Letters for Numbers and Simple Equations",
  "平面图形面积": "Area of Plane Figures",
  "数据整理与平均数": "Data Organization and Averages",
  "因数、倍数与数的结构": "Factors, Multiples, and Number Structure",
  "分数意义、性质与加减": "Fraction Meaning, Properties, Addition, and Subtraction",
  "长方体、正方体与体积": "Cuboids, Cubes, and Volume",
  "统计表达与综合应用": "Statistical Representation and Integrated Applications",
  "数的整除": "Divisibility of Numbers",
  "分数": "Fractions",
  "比和比例": "Ratio and Proportion",
  "圆和扇形": "Circles and Sectors",
  "比与比例": "Ratio and Proportion",
  "圆与扇形": "Circles and Sectors",
  "可能性与统计图表": "Probability and Statistical Graphs",
  "圆柱与圆锥": "Cylinders and Cones",
  "二元一次方程组": "Systems of Linear Equations in Two Unknowns",
  "有理数": "Rational Numbers",
  "简单的代数式": "Simple Algebraic Expressions",
  "一元一次方程": "Linear Equations in One Unknown",
  "线段与角": "Line Segments and Angles",
  "长方体": "Cuboids"
};

const familyConfig = {
  habits: {
    subject: "a tidy math-learning habit scene with counters, clean tool cards, checking arrows, and observation cues without readable text",
    altZh: "整洁的数学学习场景展示计数片、工具卡片、检查箭头和观察线索。",
    captionZh: "良好的数学习惯从观察、表达、检查和使用工具开始。",
    altEn: "A tidy math-learning scene shows counters, tool cards, checking arrows, and observation cues.",
    captionEn: "Good math habits begin with observing, explaining, checking, and using tools."
  },
  number: {
    subject: "place-value blocks, counters, ten-frame structure, and a gentle number-line path for number sense",
    altZh: "位值块、计数片、十格结构和数线路径帮助理解数感。",
    captionZh: "先看清数量结构，再把数的组成和位置说清楚。",
    altEn: "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense.",
    captionEn: "Read the quantity structure first, then explain composition and position."
  },
  operation: {
    subject: "grouped counters, regrouping trays, part-whole bars, and forward/backward movement for calculation",
    altZh: "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。",
    captionZh: "运算前先判断数量关系，再用模型检查结果是否合理。",
    altEn: "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking.",
    captionEn: "Decide the quantity relationship first, then use a model to check the result."
  },
  multiplication: {
    subject: "equal groups transforming into arrays, rows, columns, and partial rectangles",
    altZh: "相同小组转化为阵列、行列和部分矩形。",
    captionZh: "乘除法模型要先保证每组数量相同。",
    altEn: "Equal groups transform into arrays, rows, columns, and partial rectangles.",
    captionEn: "Multiplication and division models begin with equal-size groups."
  },
  measurement: {
    subject: "rulers, measuring strips, comparison bars, unit tiles, and clock arcs for measurement reasoning",
    altZh: "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。",
    captionZh: "测量时要看清单位、起点和比较对象。",
    altEn: "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning.",
    captionEn: "Measurement depends on the unit, the start point, and the object being compared."
  },
  moneyPosition: {
    subject: "toy coins, a simple shopping tray, direction arrows, and position tiles without readable currency text",
    altZh: "玩具硬币、购物托盘、方向箭头和位置方块展示生活数量关系。",
    captionZh: "生活数学要先认清单位和位置，再解释数量变化。",
    altEn: "Toy coins, a shopping tray, direction arrows, and position tiles show everyday quantity relationships.",
    captionEn: "Everyday math starts by identifying units and positions before explaining change."
  },
  geometry: {
    subject: "flat shapes, line segments, angle arms, parallel and perpendicular line pairs, and transformation arrows",
    altZh: "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。",
    captionZh: "几何判断要同时看形状特征、位置关系和测量线索。",
    altEn: "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships.",
    captionEn: "Geometry reasoning combines shape features, position relationships, and measurement clues."
  },
  solid: {
    subject: "cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces for spatial reasoning",
    altZh: "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。",
    captionZh: "立体图形要分清结构、表面积和体积。",
    altEn: "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning.",
    captionEn: "Solid-geometry work separates structure, surface area, and volume."
  },
  fractionDecimal: {
    subject: "fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts",
    altZh: "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。",
    captionZh: "分数和小数都要先确认整体、单位和等分关系。",
    altEn: "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning.",
    captionEn: "Fractions and decimals begin with the whole, the unit, and equal parts."
  },
  ratio: {
    subject: "paired bars, scale strips, proportional grids, and matching arrows for ratio relationships",
    altZh: "配对条、比例尺、比例网格和对应箭头展示比与比例关系。",
    captionZh: "比例推理要保持对应量同步变化。",
    altEn: "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships.",
    captionEn: "Proportional reasoning keeps corresponding quantities changing together."
  },
  data: {
    subject: "original bar charts, dot plots, category tokens, average balance, and probability tiles",
    altZh: "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。",
    captionZh: "读数据要先配对类别与数值，再比较和解释结论。",
    altEn: "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking.",
    captionEn: "Read data by matching categories to values before comparing and interpreting."
  },
  algebra: {
    subject: "balance scales, unknown-value tiles, relationship arrows, paired equation paths, and simple coordinate cues",
    altZh: "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。",
    captionZh: "代数推理要保持等量关系，并逐步追踪未知量。",
    altEn: "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships.",
    captionEn: "Algebra reasoning preserves equality while tracking the unknown step by step."
  },
  review: {
    subject: "mixed review cards combining counters, shape panels, data tokens, and checking paths",
    altZh: "综合复习卡片组合计数片、图形面板、数据标记和检查路径。",
    captionZh: "综合复习要先判断题型，再选择合适模型。",
    altEn: "Mixed review cards combine counters, shape panels, data tokens, and checking paths.",
    captionEn: "Review work starts by identifying the task type, then choosing the right model."
  }
};

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function compareLessons(left, right) {
  return (
    gradeOrder.indexOf(left.grade) - gradeOrder.indexOf(right.grade) ||
    semesterOrder.indexOf(left.semester) - semesterOrder.indexOf(right.semester) ||
    left.firstIndex - right.firstIndex
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(";") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

function familyForLesson(lesson) {
  const text = `${lesson.unitTitle} ${lesson.conceptIds.join(" ")}`.toLowerCase();
  if (/习惯|小学生|habit/.test(text)) return "habits";
  if (/圆柱|圆锥|长方体|正方体|立体|体积|表面积|cuboid|cube|cylinder|cone|solid/.test(text)) return "solid";
  if (/比|比例|ratio|proportion|scale/.test(text)) return "ratio";
  if (/分数|小数|fraction|decimal/.test(text)) return "fractionDecimal";
  if (/统计|数据|可能性|平均|图表|probability|statistics|data|average/.test(text)) return "data";
  if (/方程|代数|字母|有理数|整除|未知|equation|algebra|rational|divisibility/.test(text)) return "algebra";
  if (/乘|除|倍数|因数|multiplication|division|factor|multiple/.test(text)) return "multiplication";
  if (/加减|运算|计算|四则|number operations|addition|subtraction|operation/.test(text)) return "operation";
  if (/时间|长度|测量|数与量|人民币|购物|measurement|time|length|money|shopping/.test(text)) {
    return /人民币|购物|方位|位置|校园|position|direction/.test(text) ? "moneyPosition" : "measurement";
  }
  if (/图形|几何|线段|角|面积|周长|圆|扇形|位置|方位|shape|geometry|line|angle|area|perimeter|circle|sector/.test(text)) return "geometry";
  if (/数|万|10|20|100|number|place/.test(text)) return "number";
  return "review";
}

function readLessons() {
  const pack = JSON.parse(readFileSync(questionPackPath, "utf8"));
  const byTopic = new Map();
  pack.questions.forEach((question, index) => {
    const lesson = byTopic.get(question.topicId) ?? {
      topicId: question.topicId,
      grade: question.grade,
      semester: question.semester,
      volume: question.volume,
      unitTitle: question.unitTitle,
      conceptIds: [],
      evidenceCardIds: [],
      questionCount: 0,
      firstIndex: index
    };
    lesson.conceptIds = unique([...lesson.conceptIds, ...(question.conceptIds ?? [])]);
    lesson.evidenceCardIds = unique([...lesson.evidenceCardIds, ...(question.evidenceCardIds ?? [])]);
    lesson.questionCount += 1;
    byTopic.set(question.topicId, lesson);
  });
  return Array.from(byTopic.values()).sort(compareLessons);
}

function lessonTitle(lesson) {
  const en = unitTitleEnByZhHans[lesson.unitTitle] ?? `HJB Primary ${lesson.unitTitle}`;
  return {
    en: `HJB Primary: ${en}`,
    zh: lesson.unitTitle,
    zhHans: lesson.unitTitle
  };
}

function slotLabel(slot) {
  return slot === "concept" ? "concept" : "worked-example";
}

function promptFor({ lesson, slot, config }) {
  const title = lessonTitle(lesson);
  const gradeLabel = `${lesson.grade} ${lesson.semester}`;
  const subject =
    slot === "concept"
      ? config.subject
      : `${config.subject}, arranged as a focused worked-example workspace with visual steps, highlighted model parts, and textless checking cues`;
  return [
    "Use case: scientific-educational.",
    `Asset type: 16:9 lesson illustration for MAIS 沪教版小学 math Lesson, review-only candidate.`,
    `Primary request: Create a clean original ${slotLabel(slot)} illustration for ${gradeLabel} ${lesson.unitTitle}.`,
    "Scene/backdrop: modern light math-learning canvas with subtle grid, generous whitespace, cyan/violet/emerald accents.",
    `Subject: ${subject}.`,
    `Learning objective: support the HJB primary unit ${lesson.unitTitle} using safe RAG abstractions and original MAIS-authored diagrams.`,
    "Style: crisp vector-like raster, polished app illustration, friendly for primary students, 16:9 landscape.",
    "Constraints: no textbook screenshot, no publisher layout, no copied diagram, no logos, no watermark, no page frame, no embedded readable text, no formulas, no source exercise reconstruction, no worksheet or textbook-page appearance, mathematically clear and age-appropriate.",
    `Lesson title metadata: ${title.en}. Evidence cards: ${lesson.evidenceCardIds.join(", ")}.`
  ].join(" ");
}

function illustrationForLessonSlot(lesson, slot) {
  const family = familyForLesson(lesson);
  const config = familyConfig[family];
  const title = lessonTitle(lesson);
  const id = `${lesson.topicId}-${slot}`;
  const altZh = slot === "concept"
    ? `${config.altZh}主题对应沪教版《${lesson.unitTitle}》。`
    : `${config.altZh}画面以例题工作区方式对应沪教版《${lesson.unitTitle}》。`;
  const captionZh = slot === "concept"
    ? config.captionZh
    : `${config.captionZh}例题中要把模型、步骤和检查连起来。`;
  const altEn = slot === "concept"
    ? `${config.altEn} The theme matches the HJB unit ${unitTitleEnByZhHans[lesson.unitTitle] ?? lesson.unitTitle}.`
    : `${config.altEn} The visual is arranged as a worked-example workspace for the HJB unit ${unitTitleEnByZhHans[lesson.unitTitle] ?? lesson.unitTitle}.`;
  const captionEn = slot === "concept"
    ? config.captionEn
    : `${config.captionEn} In a worked example, connect the model, the steps, and the check.`;

  return {
    id,
    topicId: lesson.topicId,
    slot,
    reviewStatus: "pending",
    decision: "pending",
    candidatePath: `${packageDir}/candidates/${lesson.topicId}/${slot}.png`,
    srcAfterApproval: `/lesson-illustrations/mainland-hjb-primary/${lesson.topicId}/${slot}.png`,
    width: imageWidth,
    height: imageHeight,
    ragCardIds: lesson.evidenceCardIds,
    evidenceCardIds: lesson.evidenceCardIds,
    conceptIds: lesson.conceptIds,
    grade: lesson.grade,
    semester: lesson.semester,
    volume: lesson.volume,
    lessonTitle: title,
    visualFamily: family,
    alt: { en: altEn, zh: altZh, zhHans: altZh },
    caption: { en: captionEn, zh: captionZh, zhHans: captionZh },
    generationPrompt: promptFor({ lesson, slot, config }),
    generator: "Codex local SVG-to-PNG raster fallback after bl auth was unavailable; regenerate selected rows with Codex built-in Image2 if required.",
    reviewerNotes: `Review ${lesson.unitTitle} ${slotLabel(slot)} illustration for math correctness, source distance, age fit, and absence of readable in-image text.`
  };
}

function defs(seed) {
  return `
    <defs>
      <linearGradient id="bg${seed}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f8fbff"/>
        <stop offset="0.55" stop-color="#effcff"/>
        <stop offset="1" stop-color="#f7f3ff"/>
      </linearGradient>
      <linearGradient id="cyan${seed}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#22d3ee" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#0ea5e9" stop-opacity="0.4"/>
      </linearGradient>
      <linearGradient id="violet${seed}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#a78bfa" stop-opacity="0.88"/>
        <stop offset="1" stop-color="#7c3aed" stop-opacity="0.35"/>
      </linearGradient>
      <linearGradient id="green${seed}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#34d399" stop-opacity="0.84"/>
        <stop offset="1" stop-color="#22c55e" stop-opacity="0.32"/>
      </linearGradient>
      <filter id="shadow${seed}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.11"/>
      </filter>
      <pattern id="grid${seed}" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0ea5e9" stroke-width="1" stroke-opacity="0.08"/>
      </pattern>
      <marker id="arrow${seed}" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto">
        <path d="M2,2 L12,7 L2,12 Z" fill="#06b6d4" opacity="0.7"/>
      </marker>
    </defs>
  `;
}

function panel(x, y, w, h, radius = 36) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#ffffff" fill-opacity="0.72" stroke="#bae6fd" stroke-opacity="0.8" stroke-width="2" filter="url(#shadow${currentSeed})"/>`;
}

let currentSeed = 0;

function dotGrid(x, y, columns, rows, gap, colorA = "#06b6d4", colorB = "#8b5cf6") {
  const dots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const color = column < columns / 2 ? colorA : colorB;
      dots.push(`<circle cx="${x + column * gap}" cy="${y + row * gap}" r="5.5" fill="${color}" opacity="${0.55 + ((row + column) % 3) * 0.13}"/>`);
    }
  }
  return dots.join("");
}

function numberVisual(slot, rng) {
  const step = slot === "concept" ? 0 : 38;
  return `
    ${panel(140, 116, 530, 460)}
    ${panel(748, 124, 600, 430)}
    ${dotGrid(214, 210, 10, 5, 38)}
    <path d="M210 482 C330 410 455 565 595 456" fill="none" stroke="#22c55e" stroke-width="11" stroke-linecap="round" opacity="0.38"/>
    ${Array.from({ length: 4 }, (_, i) => `<rect x="${804 + i * 78}" y="${218 + step * (i % 2)}" width="56" height="${190 - i * 24}" rx="14" fill="url(#cyan${currentSeed})" opacity="0.72"/>`).join("")}
    ${Array.from({ length: 5 }, (_, i) => `<circle cx="${870 + i * 82}" cy="${454 - (i % 3) * 38}" r="22" fill="${i % 2 ? "#8b5cf6" : "#06b6d4"}" opacity="0.55"/>`).join("")}
    <path d="M202 692 C380 622 515 746 710 684 S1020 610 1288 700" fill="none" stroke="#0f172a" stroke-opacity="0.38" stroke-width="5"/>
    ${Array.from({ length: 9 }, (_, i) => `<circle cx="${230 + i * 128}" cy="${682 + Math.sin(i + rng()) * 28}" r="${i % 3 === 0 ? 16 : 11}" fill="${i % 2 ? "#a78bfa" : "#22d3ee"}" stroke="#ffffff" stroke-width="5"/>`).join("")}
  `;
}

function operationVisual(slot) {
  const leftShift = slot === "concept" ? 0 : 22;
  return `
    ${panel(118, 124, 590, 500)}
    ${panel(770, 130, 570, 500)}
    <rect x="194" y="214" width="170" height="300" rx="28" fill="#ecfeff" stroke="#67e8f9" stroke-width="3"/>
    <rect x="410" y="214" width="170" height="300" rx="28" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="3"/>
    ${dotGrid(232 + leftShift, 270, 4, 5, 36, "#06b6d4", "#06b6d4")}
    ${dotGrid(448 - leftShift, 270, 4, 5, 36, "#8b5cf6", "#8b5cf6")}
    <path d="M624 364 C690 342 716 326 760 320" fill="none" stroke="#06b6d4" stroke-width="7" marker-end="url(#arrow${currentSeed})" opacity="0.62"/>
    ${Array.from({ length: 5 }, (_, i) => `<rect x="${850 + i * 72}" y="${248 + i * 20}" width="52" height="${190 - i * 14}" rx="14" fill="${i % 2 ? "url(#violet" + currentSeed + ")" : "url(#green" + currentSeed + ")"}" opacity="0.7"/>`).join("")}
    <path d="M836 512 C930 464 1046 566 1148 496 C1202 458 1234 438 1308 450" fill="none" stroke="#8b5cf6" stroke-opacity="0.45" stroke-width="8" stroke-linecap="round"/>
    ${stepTiles()}
  `;
}

function multiplicationVisual(slot) {
  const rows = slot === "concept" ? 4 : 5;
  return `
    ${panel(132, 120, 565, 530)}
    ${panel(760, 122, 580, 530)}
    ${Array.from({ length: rows }, (_, row) =>
      Array.from({ length: 6 }, (_, col) => `<circle cx="${230 + col * 58}" cy="${224 + row * 58}" r="18" fill="${row % 2 ? "#8b5cf6" : "#06b6d4"}" opacity="0.68"/>`).join("")
    ).join("")}
    <path d="M538 332 C630 320 680 314 756 310" fill="none" stroke="#22c55e" stroke-width="8" marker-end="url(#arrow${currentSeed})" opacity="0.7"/>
    ${Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => `<rect x="${862 + col * 74}" y="${206 + row * 70}" width="52" height="46" rx="12" fill="${(row + col) % 2 ? "url(#cyan" + currentSeed + ")" : "url(#violet" + currentSeed + ")"}" opacity="0.68"/>`).join("")
    ).join("")}
    <rect x="850" y="502" width="390" height="78" rx="22" fill="#dcfce7" stroke="#86efac" stroke-width="3" opacity="0.75"/>
    <path d="M870 542 H1218" stroke="#22c55e" stroke-width="9" stroke-linecap="round" opacity="0.52"/>
    ${stepTiles()}
  `;
}

function measurementVisual(slot) {
  const clockX = slot === "concept" ? 1050 : 1088;
  return `
    ${panel(110, 110, 640, 520)}
    ${panel(820, 126, 520, 500)}
    <rect x="184" y="250" width="476" height="72" rx="18" fill="#fef9c3" stroke="#facc15" stroke-width="3" opacity="0.88"/>
    ${Array.from({ length: 10 }, (_, i) => `<line x1="${214 + i * 44}" y1="250" x2="${214 + i * 44}" y2="${i % 2 ? 286 : 306}" stroke="#0f172a" stroke-opacity="0.35" stroke-width="4"/>`).join("")}
    <rect x="218" y="384" width="380" height="58" rx="18" fill="#e0f2fe" stroke="#38bdf8" stroke-width="3"/>
    <rect x="218" y="468" width="286" height="58" rx="18" fill="#ede9fe" stroke="#a78bfa" stroke-width="3"/>
    <circle cx="${clockX}" cy="360" r="132" fill="#ffffff" stroke="#7dd3fc" stroke-width="8"/>
    <circle cx="${clockX}" cy="360" r="12" fill="#06b6d4"/>
    <line x1="${clockX}" y1="360" x2="${clockX}" y2="260" stroke="#0f172a" stroke-opacity="0.58" stroke-width="8" stroke-linecap="round"/>
    <line x1="${clockX}" y1="360" x2="${clockX + 84}" y2="416" stroke="#8b5cf6" stroke-opacity="0.62" stroke-width="8" stroke-linecap="round"/>
    <path d="M922 534 C1000 584 1126 588 1238 530" fill="none" stroke="#22c55e" stroke-width="7" marker-end="url(#arrow${currentSeed})" opacity="0.58"/>
    ${stepTiles()}
  `;
}

function moneyPositionVisual() {
  return `
    ${panel(116, 120, 590, 500)}
    ${panel(776, 130, 560, 492)}
    ${Array.from({ length: 7 }, (_, i) => `<circle cx="${214 + (i % 4) * 88}" cy="${232 + Math.floor(i / 4) * 96}" r="36" fill="${i % 2 ? "#fde68a" : "#fef3c7"}" stroke="#f59e0b" stroke-width="5" opacity="0.86"/>`).join("")}
    <rect x="196" y="442" width="370" height="92" rx="26" fill="#ecfeff" stroke="#67e8f9" stroke-width="3"/>
    ${Array.from({ length: 5 }, (_, i) => `<rect x="${838 + i * 74}" y="${240 + (i % 2) * 86}" width="58" height="58" rx="16" fill="${i % 2 ? "url(#violet" + currentSeed + ")" : "url(#cyan" + currentSeed + ")"}" opacity="0.72"/>`).join("")}
    <path d="M922 484 h260" stroke="#06b6d4" stroke-width="9" marker-end="url(#arrow${currentSeed})" opacity="0.58"/>
    <path d="M1050 558 v-246" stroke="#8b5cf6" stroke-width="9" marker-end="url(#arrow${currentSeed})" opacity="0.44"/>
    ${stepTiles()}
  `;
}

function geometryVisual(slot) {
  const offset = slot === "concept" ? 0 : 36;
  return `
    ${panel(120, 112, 600, 520)}
    ${panel(792, 118, 540, 520)}
    <polygon points="230,470 380,230 530,470" fill="url(#cyan${currentSeed})" stroke="#0891b2" stroke-width="5" opacity="0.68"/>
    <rect x="410" y="320" width="170" height="170" rx="18" fill="url(#violet${currentSeed})" stroke="#7c3aed" stroke-width="5" opacity="0.56"/>
    <circle cx="310" cy="318" r="80" fill="url(#green${currentSeed})" stroke="#16a34a" stroke-width="5" opacity="0.55"/>
    <line x1="862" y1="${250 + offset}" x2="1240" y2="${250 + offset}" stroke="#06b6d4" stroke-width="9" stroke-linecap="round"/>
    <line x1="862" y1="${380 - offset}" x2="1240" y2="${380 - offset}" stroke="#8b5cf6" stroke-width="9" stroke-linecap="round"/>
    <line x1="960" y1="520" x2="1180" y2="310" stroke="#22c55e" stroke-width="9" stroke-linecap="round"/>
    <path d="M1015 468 A118 118 0 0 1 1092 390" fill="none" stroke="#f59e0b" stroke-width="8" opacity="0.72"/>
    ${stepTiles()}
  `;
}

function solidVisual(slot) {
  const lift = slot === "concept" ? 0 : 28;
  return `
    ${panel(118, 116, 600, 528)}
    ${panel(790, 124, 548, 520)}
    <path d="M238 280 L430 220 L564 300 L372 370 Z" fill="#e0f2fe" stroke="#06b6d4" stroke-width="5"/>
    <path d="M238 280 L372 370 L372 542 L238 448 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="5"/>
    <path d="M372 370 L564 300 L564 468 L372 542 Z" fill="#dbeafe" stroke="#0284c7" stroke-width="5"/>
    ${Array.from({ length: 3 }, (_, i) => `<rect x="${855 + i * 78}" y="${222 + lift}" width="58" height="58" rx="10" fill="${i % 2 ? "#c4b5fd" : "#67e8f9"}" stroke="#ffffff" stroke-width="4"/>`).join("")}
    <ellipse cx="1088" cy="300" rx="84" ry="28" fill="#dcfce7" stroke="#22c55e" stroke-width="5"/>
    <rect x="1004" y="300" width="168" height="190" fill="#dcfce7" stroke="#22c55e" stroke-width="5" opacity="0.72"/>
    <ellipse cx="1088" cy="490" rx="84" ry="28" fill="#bbf7d0" stroke="#22c55e" stroke-width="5"/>
    <path d="M1242 498 L1320 290 L1390 498 Z" fill="#ede9fe" stroke="#8b5cf6" stroke-width="5" opacity="0.72"/>
    ${stepTiles()}
  `;
}

function fractionDecimalVisual(slot) {
  const split = slot === "concept" ? 5 : 7;
  return `
    ${panel(120, 116, 610, 520)}
    ${panel(798, 126, 540, 510)}
    <circle cx="330" cy="352" r="146" fill="#f8fafc" stroke="#06b6d4" stroke-width="7"/>
    <path d="M330 352 L330 206 A146 146 0 0 1 456 425 Z" fill="url(#cyan${currentSeed})" opacity="0.72"/>
    <path d="M330 352 L456 425 A146 146 0 0 1 218 446 Z" fill="url(#violet${currentSeed})" opacity="0.36"/>
    ${Array.from({ length: split }, (_, i) => `<rect x="${852 + i * 66}" y="248" width="52" height="220" rx="14" fill="${i < Math.ceil(split / 2) ? "#67e8f9" : "#ddd6fe"}" opacity="0.72"/>`).join("")}
    <rect x="850" y="518" width="390" height="42" rx="18" fill="#dcfce7" stroke="#86efac" stroke-width="3"/>
    <path d="M850 538 H1240" stroke="#22c55e" stroke-width="8" opacity="0.45"/>
    ${stepTiles()}
  `;
}

function ratioVisual(slot) {
  const scale = slot === "concept" ? 1 : 1.18;
  return `
    ${panel(116, 124, 610, 492)}
    ${panel(786, 128, 560, 492)}
    <rect x="220" y="260" width="320" height="64" rx="22" fill="url(#cyan${currentSeed})" opacity="0.68"/>
    <rect x="220" y="378" width="${Math.round(320 * scale)}" height="64" rx="22" fill="url(#violet${currentSeed})" opacity="0.58"/>
    <path d="M584 286 C664 298 710 326 770 358" fill="none" stroke="#06b6d4" stroke-width="8" marker-end="url(#arrow${currentSeed})" opacity="0.66"/>
    ${Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 6 }, (_, col) => `<rect x="${860 + col * 62}" y="${228 + row * 60}" width="44" height="42" rx="10" fill="${(row + col) % 3 === 0 ? "#86efac" : (col % 2 ? "#c4b5fd" : "#67e8f9")}" opacity="0.68"/>`).join("")
    ).join("")}
    <path d="M886 528 H1218" stroke="#22c55e" stroke-width="9" marker-end="url(#arrow${currentSeed})" opacity="0.54"/>
    ${stepTiles()}
  `;
}

function dataVisual(slot) {
  const bars = slot === "concept" ? [150, 240, 110, 290, 190] : [210, 120, 260, 170, 300];
  return `
    ${panel(120, 118, 590, 510)}
    ${panel(780, 124, 560, 510)}
    ${bars.map((h, i) => `<rect x="${210 + i * 78}" y="${510 - h}" width="48" height="${h}" rx="14" fill="${i % 2 ? "url(#violet" + currentSeed + ")" : "url(#cyan" + currentSeed + ")"}" opacity="0.76"/>`).join("")}
    <path d="M190 520 H612" stroke="#0f172a" stroke-opacity="0.36" stroke-width="5"/>
    ${dotGrid(850, 246, 9, 5, 38, "#06b6d4", "#22c55e")}
    <path d="M858 530 C950 450 1070 608 1210 464" fill="none" stroke="#8b5cf6" stroke-width="9" stroke-linecap="round" opacity="0.44"/>
    <circle cx="1210" cy="464" r="28" fill="#8b5cf6" opacity="0.65"/>
    ${stepTiles()}
  `;
}

function algebraVisual(slot) {
  const tilt = slot === "concept" ? 0 : 18;
  return `
    ${panel(118, 126, 610, 500)}
    ${panel(784, 124, 560, 506)}
    <line x1="420" y1="230" x2="${420 + tilt}" y2="506" stroke="#0f172a" stroke-opacity="0.48" stroke-width="10" stroke-linecap="round"/>
    <line x1="252" y1="360" x2="588" y2="360" stroke="#06b6d4" stroke-width="10" stroke-linecap="round"/>
    <path d="M284 360 L224 492 H344 Z" fill="#e0f2fe" stroke="#06b6d4" stroke-width="5"/>
    <path d="M554 360 L494 492 H614 Z" fill="#ede9fe" stroke="#8b5cf6" stroke-width="5"/>
    ${Array.from({ length: 4 }, (_, i) => `<rect x="${870 + i * 82}" y="${242 + (i % 2) * 76}" width="64" height="64" rx="16" fill="${i % 2 ? "#c4b5fd" : "#67e8f9"}" stroke="#ffffff" stroke-width="5"/>`).join("")}
    <path d="M880 520 C975 465 1050 586 1160 500 C1202 468 1238 444 1300 454" fill="none" stroke="#22c55e" stroke-width="8" marker-end="url(#arrow${currentSeed})" opacity="0.56"/>
    ${stepTiles()}
  `;
}

function reviewVisual(slot) {
  const dy = slot === "concept" ? 0 : 28;
  return `
    ${panel(106, 116, 1240, 520)}
    ${[0, 1, 2, 3].map((i) => `<rect x="${178 + i * 284}" y="${214 + (i % 2) * dy}" width="212" height="272" rx="34" fill="#ffffff" fill-opacity="0.78" stroke="${["#67e8f9", "#c4b5fd", "#86efac", "#fcd34d"][i]}" stroke-width="4"/>`).join("")}
    ${dotGrid(224, 270, 4, 4, 34)}
    <polygon points="494,410 570,280 646,410" fill="url(#violet${currentSeed})" opacity="0.62"/>
    <circle cx="570" cy="330" r="52" fill="url(#green${currentSeed})" opacity="0.5"/>
    ${[150, 210, 120].map((h, i) => `<rect x="${790 + i * 48}" y="${468 - h}" width="34" height="${h}" rx="10" fill="#22d3ee" opacity="${0.48 + i * 0.12}"/>`).join("")}
    <path d="M1060 420 C1120 330 1210 506 1270 360" fill="none" stroke="#8b5cf6" stroke-width="9" stroke-linecap="round" opacity="0.48"/>
    ${stepTiles()}
  `;
}

function stepTiles() {
  return `
    <rect x="250" y="704" width="230" height="86" rx="24" fill="#ecfeff" stroke="#67e8f9" stroke-width="3" opacity="0.88"/>
    <rect x="600" y="704" width="230" height="86" rx="24" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="3" opacity="0.88"/>
    <rect x="950" y="704" width="230" height="86" rx="24" fill="#ecfdf5" stroke="#86efac" stroke-width="3" opacity="0.88"/>
    <path d="M500 746 H570" stroke="#06b6d4" stroke-width="8" marker-end="url(#arrow${currentSeed})" opacity="0.55"/>
    <path d="M850 746 H920" stroke="#06b6d4" stroke-width="8" marker-end="url(#arrow${currentSeed})" opacity="0.55"/>
    <circle cx="316" cy="747" r="20" fill="#06b6d4" opacity="0.58"/>
    <path d="M666 762 C690 716 740 716 768 760" fill="none" stroke="#8b5cf6" stroke-width="7" stroke-linecap="round" opacity="0.56"/>
    <path d="M1012 748 C1060 704 1106 794 1150 732" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round" opacity="0.56"/>
  `;
}

function familyVisual(family, slot, rng) {
  if (family === "habits") return reviewVisual(slot);
  if (family === "number") return numberVisual(slot, rng);
  if (family === "operation") return operationVisual(slot);
  if (family === "multiplication") return multiplicationVisual(slot);
  if (family === "measurement") return measurementVisual(slot);
  if (family === "moneyPosition") return moneyPositionVisual(slot);
  if (family === "geometry") return geometryVisual(slot);
  if (family === "solid") return solidVisual(slot);
  if (family === "fractionDecimal") return fractionDecimalVisual(slot);
  if (family === "ratio") return ratioVisual(slot);
  if (family === "data") return dataVisual(slot);
  if (family === "algebra") return algebraVisual(slot);
  return reviewVisual(slot);
}

function buildSvg(illustration) {
  const seed = hashString(illustration.id);
  currentSeed = seed;
  const rng = createRng(seed);
  const family = illustration.visualFamily;
  const accent = ["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b"][seed % 4];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
  ${defs(seed)}
  <rect width="${imageWidth}" height="${imageHeight}" fill="url(#bg${seed})"/>
  <rect width="${imageWidth}" height="${imageHeight}" fill="url(#grid${seed})"/>
  <circle cx="${180 + Math.round(rng() * 180)}" cy="${120 + Math.round(rng() * 100)}" r="${90 + Math.round(rng() * 45)}" fill="#22d3ee" opacity="0.12"/>
  <circle cx="${1260 + Math.round(rng() * 110)}" cy="${154 + Math.round(rng() * 110)}" r="${100 + Math.round(rng() * 60)}" fill="#a78bfa" opacity="0.12"/>
  <path d="M0 658 C226 612 390 706 612 670 C882 628 1090 584 1600 646 V900 H0 Z" fill="#ecfeff" opacity="0.72"/>
  <path d="M0 684 C250 630 460 746 730 700 C1020 650 1230 616 1600 680" fill="none" stroke="${accent}" stroke-width="5" opacity="0.22"/>
  ${familyVisual(family, illustration.slot, rng)}
  <circle cx="1460" cy="760" r="28" fill="${accent}" opacity="0.22"/>
  <circle cx="1416" cy="812" r="12" fill="#0ea5e9" opacity="0.32"/>
  <circle cx="1508" cy="820" r="16" fill="#8b5cf6" opacity="0.22"/>
</svg>`;
}

async function renderCandidate(illustration) {
  const target = path.join(projectRoot, illustration.candidatePath);
  mkdirSync(path.dirname(target), { recursive: true });
  const svg = buildSvg(illustration);
  await sharp(Buffer.from(svg)).png().toFile(target);
}

function readPngSize(filePath) {
  if (!existsSync(filePath)) return null;
  const buffer = readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function validate(manifest) {
  const issues = [];
  const topicSlots = new Map();
  const expectedCandidates = manifest.illustrations.length;
  let existingCandidates = 0;
  let normalizedCandidates = 0;

  manifest.illustrations.forEach((illustration) => {
    const absolutePath = path.join(projectRoot, illustration.candidatePath);
    const size = readPngSize(absolutePath);
    if (!size) {
      issues.push(`${illustration.id}: PNG candidate missing or invalid`);
      return;
    }
    existingCandidates += 1;
    if (size.width === imageWidth && size.height === imageHeight) {
      normalizedCandidates += 1;
    } else {
      issues.push(`${illustration.id}: expected ${imageWidth}x${imageHeight}, found ${size.width}x${size.height}`);
    }
    const slotSet = topicSlots.get(illustration.topicId) ?? new Set();
    slotSet.add(illustration.slot);
    topicSlots.set(illustration.topicId, slotSet);
  });

  manifest.lessons.forEach((lesson) => {
    const slotSet = topicSlots.get(lesson.topicId) ?? new Set();
    slots.forEach((slot) => {
      if (!slotSet.has(slot)) issues.push(`${lesson.topicId}: missing ${slot} slot`);
    });
  });

  return {
    pass: issues.length === 0,
    summary: {
      expectedLessons: manifest.lessons.length,
      expectedCandidates,
      existingCandidates,
      normalizedCandidates,
      expectedSize: `${imageWidth}x${imageHeight}`,
      pendingReviewRows: manifest.illustrations.filter((illustration) => illustration.reviewStatus === "pending").length
    },
    issues
  };
}

function buildManualReviewCsv(illustrations) {
  const rows = [
    [
      "id",
      "topicId",
      "slot",
      "reviewStatus",
      "decision",
      "candidatePath",
      "srcAfterApproval",
      "grade",
      "semester",
      "volume",
      "ragCardIds",
      "altZhHans",
      "captionZhHans",
      "reviewerNotes"
    ].map(csvCell).join(",")
  ];
  illustrations.forEach((illustration) => {
    rows.push([
      illustration.id,
      illustration.topicId,
      illustration.slot,
      illustration.reviewStatus,
      illustration.decision,
      illustration.candidatePath,
      illustration.srcAfterApproval,
      illustration.grade,
      illustration.semester,
      illustration.volume,
      illustration.ragCardIds,
      illustration.alt.zhHans,
      illustration.caption.zhHans,
      illustration.reviewerNotes
    ].map(csvCell).join(","));
  });
  return `${rows.join("\n")}\n`;
}

function buildIndexMarkdown(manifest, validation) {
  const lines = [
    "# Mainland HJB Primary Lesson Illustrations V1 Review",
    "",
    `- Generated at: ${manifest.generatedAt}`,
    `- Generator: ${manifest.model}`,
    "- Scope: 70 沪教版小学 lessons, 2 candidates per lesson.",
    "- Production status: review-only. Do not copy to `public/lesson-illustrations/mainland-hjb-primary/` until manual approval is recorded.",
    `- Validation: ${validation.summary.existingCandidates}/${validation.summary.expectedCandidates} PNG candidates exist; ${validation.summary.normalizedCandidates}/${validation.summary.expectedCandidates} are ${imageWidth}x${imageHeight}.`,
    "",
    "## Review Criteria",
    "",
    "- Mathematical correctness and fit to the HJB primary lesson objective.",
    "- No copied textbook/page/screenshot look, publisher marks, logos, or watermarks.",
    "- No readable embedded text, wrong formulas, source exercise reconstruction, or worksheet/page-frame appearance.",
    "- Clear primary-student learning value and accurate bilingual alt/caption text.",
    "",
    "## Candidates",
    ""
  ];
  manifest.illustrations.forEach((illustration) => {
    const imagePath = `candidates/${illustration.topicId}/${illustration.slot}.png`;
    lines.push(
      `### ${illustration.topicId} / ${illustration.slot}`,
      "",
      `![${illustration.id}](${imagePath})`,
      "",
      `- ID: \`${illustration.id}\``,
      `- Status: \`${illustration.reviewStatus}\``,
      `- Decision: \`${illustration.decision}\``,
      `- Grade/Semester/Volume: \`${illustration.grade}\` / \`${illustration.semester}\` / \`${illustration.volume}\``,
      `- RAG cards: \`${illustration.ragCardIds.join("`, `")}\``,
      `- Alt zh-Hans: ${illustration.alt.zhHans}`,
      `- Caption zh-Hans: ${illustration.caption.zhHans}`,
      ""
    );
  });
  return `${lines.join("\n")}\n`;
}

function buildIndexHtml(manifest, validation) {
  const cards = manifest.illustrations.map((illustration) => {
    const imagePath = `candidates/${illustration.topicId}/${illustration.slot}.png`;
    return `
      <article class="card">
        <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(illustration.alt.zhHans)}" loading="lazy" />
        <div class="body">
          <h2>${escapeHtml(illustration.topicId)} <span>${escapeHtml(illustration.slot)}</span></h2>
          <p><strong>ID:</strong> ${escapeHtml(illustration.id)}</p>
          <p><strong>Status:</strong> ${escapeHtml(illustration.reviewStatus)} / ${escapeHtml(illustration.decision)}</p>
          <p><strong>Grade:</strong> ${escapeHtml(illustration.grade)} · ${escapeHtml(illustration.semester)} · ${escapeHtml(illustration.volume)}</p>
          <p><strong>Lesson:</strong> ${escapeHtml(illustration.lessonTitle.zhHans)}</p>
          <p><strong>RAG:</strong> ${escapeHtml(illustration.ragCardIds.join(", "))}</p>
          <p><strong>Alt:</strong> ${escapeHtml(illustration.alt.zhHans)}</p>
          <p><strong>Caption:</strong> ${escapeHtml(illustration.caption.zhHans)}</p>
        </div>
      </article>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mainland HJB Primary Lesson Illustrations V1 Review</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      body { margin: 0; padding: 32px; }
      header { max-width: 1120px; margin: 0 auto 28px; }
      h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.15; }
      p { line-height: 1.65; }
      .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin-top: 18px; }
      .pill { border: 1px solid #bae6fd; background: #ffffff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06); }
      main { max-width: 1420px; margin: 0 auto; display: grid; gap: 22px; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); }
      .card { overflow: hidden; border: 1px solid #dbeafe; border-radius: 20px; background: #ffffff; box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08); }
      img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #eef6ff; }
      .body { padding: 16px 18px 20px; }
      h2 { margin: 0 0 10px; font-size: 18px; line-height: 1.35; }
      h2 span { color: #0891b2; font-size: 14px; }
      .body p { margin: 7px 0; font-size: 14px; }
      strong { color: #334155; }
    </style>
  </head>
  <body>
    <header>
      <h1>Mainland HJB Primary Lesson Illustrations V1 Review</h1>
      <p>Review-only package for 沪教版小学 Lesson illustrations. Mark rows in <code>manual-review.csv</code> as <code>approved</code>, <code>revise</code>, or <code>reject</code>. Production integration must copy only approved rows.</p>
      <div class="summary">
        <div class="pill"><strong>Generated</strong><br />${escapeHtml(manifest.generatedAt)}</div>
        <div class="pill"><strong>Scope</strong><br />70 lessons × 2 slots = 140 candidates</div>
        <div class="pill"><strong>Validation</strong><br />${validation.summary.existingCandidates}/${validation.summary.expectedCandidates} PNGs; ${validation.summary.normalizedCandidates}/${validation.summary.expectedCandidates} at ${imageWidth}×${imageHeight}</div>
        <div class="pill"><strong>Status</strong><br />Review-only, pending manual approval</div>
      </div>
    </header>
    <main>
      ${cards}
    </main>
  </body>
</html>
`;
}

const lessons = readLessons();
const illustrations = lessons.flatMap((lesson) => slots.map((slot) => illustrationForLessonSlot(lesson, slot)));
const manifest = {
  version: "mainland-hjb-primary-illustrations-v1",
  scope: "MAINLAND_HJB_PRIMARY",
  model: "Codex local SVG-to-PNG raster fallback; built-in Image2 probe succeeded but was not batch-addressable from shell",
  size: { width: imageWidth, height: imageHeight },
  generatedAt,
  reviewStatus: "pending",
  productionStatus: "review-only",
  generationPolicy: [
    "Use MAIS safe-RAG abstractions, HJB primary topic metadata, and approved generated question-pack metadata only.",
    "Do not copy, reconstruct, or imitate textbook screenshots, page layouts, figures, source examples, or publisher visual style.",
    "Generate fresh MAIS-authored educational visuals with no logos, no watermarks, and no embedded textbook text.",
    "Avoid in-image formulas and labels; learner-facing wording belongs in captions and alt text.",
    "Only rows later marked approved in manual-review.csv may be copied to public lesson illustration assets."
  ],
  sourceEvidence: [
    "data/rag/mainlandHjbPrimary.ts",
    "data/rag/mainlandHjbPrimaryAssessmentPatterns.ts",
    "data/mainlandHjbPrimaryLessons.ts",
    "data/mainlandHjbPrimaryTopics.ts",
    "coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json",
    "coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/qa-report.md"
  ],
  lessons: lessons.map((lesson) => ({
    topicId: lesson.topicId,
    grade: lesson.grade,
    semester: lesson.semester,
    volume: lesson.volume,
    unitTitle: lesson.unitTitle,
    lessonTitle: lessonTitle(lesson),
    conceptIds: lesson.conceptIds,
    evidenceCardIds: lesson.evidenceCardIds,
    questionCount: lesson.questionCount,
    visualFamily: familyForLesson(lesson)
  })),
  illustrations
};

mkdirSync(candidatesDir, { recursive: true });
for (const illustration of illustrations) {
  await renderCandidate(illustration);
}

const validation = validate(manifest);
writeFileSync(path.join(outDir, "illustration-plan.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(path.join(outDir, "manual-review.csv"), buildManualReviewCsv(illustrations));
writeFileSync(path.join(outDir, "validation-report.json"), `${JSON.stringify(validation, null, 2)}\n`);
writeFileSync(path.join(outDir, "index.md"), buildIndexMarkdown(manifest, validation));
writeFileSync(path.join(outDir, "index.html"), buildIndexHtml(manifest, validation));

console.log(JSON.stringify(validation.summary, null, 2));
if (!validation.pass) {
  console.error(`${validation.issues.length} validation issue(s) found.`);
  validation.issues.slice(0, 20).forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
}
