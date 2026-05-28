import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageDir = path.relative(projectRoot, __dirname);
const lessonsPath = path.join(projectRoot, "coordination/content-qa/mainland-pep-primary-lessons-v1/lessons.json");
const outDir = path.join(projectRoot, packageDir);
const candidatesDir = path.join(outDir, "candidates");
const imageWidth = 1600;
const imageHeight = 900;
const slots = ["concept", "worked-example"];

const visualPlans = {
  "pep-primary-p1-upper-number-sense": {
    concept: {
      subject: "ten-frame counters, grouped dots, and a gentle number-line motif showing counting, comparing, composing, and decomposing numbers within 20",
      alt: "Ten-frame counters and grouped dots show counting, comparing, and breaking apart numbers within 20.",
      altZh: "十格计数片和分组点子展示20以内数的数数、比较和分解组成。",
      caption: "Small numbers become clearer when learners see the whole, the parts, and the counting path.",
      captionZh: "小数目的学习要同时看整体、部分和数数路径。"
    },
    worked: {
      subject: "a make-ten workspace where counters move into a full ten-frame and leftover counters form the next part",
      alt: "A make-ten workspace moves counters into a full ten-frame, then shows the leftover counters as the next part.",
      altZh: "凑十工作区把计数片移入完整十格，再把剩余计数片作为下一部分。",
      caption: "Make ten first, then add the remaining part to check the answer.",
      captionZh: "先凑成十，再加上剩余部分来检查答案。"
    }
  },
  "pep-primary-p1-upper-shapes-position-time": {
    concept: {
      subject: "simple solids, flat shapes, position arrows, and a whole-hour clock arranged as an early spatial-language scene",
      alt: "Simple shapes, position arrows, and a whole-hour clock support shape sorting and spatial language.",
      altZh: "简单图形、位置箭头和整时钟面帮助学生分类图形并表达位置。",
      caption: "Name the object, describe where it is, and use the clock hands carefully.",
      captionZh: "先说出物体名称，再描述位置，并仔细观察钟面指针。"
    },
    worked: {
      subject: "a sorting mat with shapes placed above, below, left, and right of a center object, plus a clear whole-hour clock check",
      alt: "A sorting mat places shapes around a center object and includes a whole-hour clock check.",
      altZh: "分类垫把图形放在中心物体的上下左右，并加入整时钟面检查。",
      caption: "Use position words and object features together, not just one visual clue.",
      captionZh: "要把位置词和物体特征结合起来判断，而不能只看单一线索。"
    }
  },
  "pep-primary-p1-lower-within-100-add-sub": {
    concept: {
      subject: "bundles of ten, loose ones, and a number-line path showing tens-and-ones place value and within-100 addition or subtraction",
      alt: "Bundles of ten, loose ones, and a number line connect place value with addition and subtraction within 100.",
      altZh: "十根一捆和散放个位配合数线，把100以内位值与加减法联系起来。",
      caption: "Read tens and ones first, then decide whether the story moves forward or backward.",
      captionZh: "先读十位和个位，再判断情境是在向前增加还是向后减少。"
    },
    worked: {
      subject: "a regrouping scene where ten loose counters join into one bundle while a number-line jump checks the result",
      alt: "Loose counters regroup into one ten bundle while a number-line jump checks the answer.",
      altZh: "散放计数片重新组成一捆十，旁边用数线跳步检查答案。",
      caption: "Regrouping works because ten ones can be traded for one ten.",
      captionZh: "重组的关键是十个一可以换成一个十。"
    }
  },
  "pep-primary-p1-lower-money-data-review": {
    concept: {
      subject: "original toy coins, a simple category chart, and a clock face showing money, time, and data as everyday quantities",
      alt: "Toy coins, a simple chart, and a clock face show money, time, and data as everyday quantities.",
      altZh: "玩具硬币、简单统计图和钟面把人民币、时间和数据表示成日常数量。",
      caption: "Everyday math starts by naming the unit and reading the representation.",
      captionZh: "生活中的数学要先说清单位，再读懂表示方法。"
    },
    worked: {
      subject: "a small shop-style counting tray with coin groups, a clock check, and a picture graph with original icons",
      alt: "A counting tray groups toy coins beside a clock check and an original picture graph.",
      altZh: "计数盘把玩具硬币分组，旁边配有钟面检查和原创图标统计图。",
      caption: "Group the value, read the time, then compare the data carefully.",
      captionZh: "先分组看价值，再读时间，最后认真比较数据。"
    }
  },
  "pep-primary-p2-upper-multiplication-arrays": {
    concept: {
      subject: "equal groups of counters transforming into a rectangular array to connect repeated addition with multiplication",
      alt: "Equal groups of counters transform into an array to show the meaning of multiplication.",
      altZh: "相同数量的小组转化为阵列，展示乘法的意义。",
      caption: "Multiplication is easier to trust when each group is equal.",
      captionZh: "每组数量相同时，乘法模型才清楚可靠。"
    },
    worked: {
      subject: "an array-building workspace where rows are highlighted one at a time and the total is checked by grouping",
      alt: "An array-building workspace highlights rows and checks the total by equal groups.",
      altZh: "阵列工作区逐行高亮，并用相同小组检查总数。",
      caption: "Count rows, count items in each row, then check with equal groups.",
      captionZh: "先数行数，再数每行个数，最后用相同小组检查。"
    }
  },
  "pep-primary-p2-upper-length-angles-observation": {
    concept: {
      subject: "a ruler, comparison bars, angle arms, and view cards for measuring length, recognizing angles, and observing objects",
      alt: "A ruler, angle arms, and view cards connect length measurement, angle recognition, and observation.",
      altZh: "尺子、角的两边和观察卡片联系长度测量、角的认识和观察物体。",
      caption: "Choose the unit, align the ruler, and describe the view from the correct side.",
      captionZh: "先选单位，尺子要对齐，并从正确方向描述看到的样子。"
    },
    worked: {
      subject: "a measurement station with two objects aligned to a ruler, a highlighted corner angle, and three view silhouettes",
      alt: "A measurement station aligns objects to a ruler, highlights an angle, and compares view silhouettes.",
      altZh: "测量台把物体与尺子对齐，突出一个角，并比较不同方向的轮廓。",
      caption: "A careful setup prevents length, angle, and view-reading mistakes.",
      captionZh: "摆放和观察要仔细，才能避免长度、角和视图判断错误。"
    }
  },
  "pep-primary-p2-lower-division-remainder": {
    concept: {
      subject: "counters shared into equal plates and grouped into same-size boxes, with a small leftover area for remainders",
      alt: "Counters are shared into equal plates and grouped into boxes, with leftovers kept visible.",
      altZh: "计数片被平均分到盘子里，也被按固定大小分组，剩余部分清楚可见。",
      caption: "Division can mean fair sharing or grouping, and the remainder must be smaller than one group.",
      captionZh: "除法可以表示平均分或包含分，余数必须比一组的数量小。"
    },
    worked: {
      subject: "a division workspace where counters are dealt one by one into groups and leftover counters are separated for checking",
      alt: "A division workspace deals counters into equal groups and separates leftovers for checking.",
      altZh: "除法工作区把计数片分入相同小组，并把剩余计数片单独检查。",
      caption: "Build equal groups first, then decide what the leftover means.",
      captionZh: "先建立相同小组，再判断剩余部分表示什么。"
    }
  },
  "pep-primary-p2-lower-place-value-measurement-data": {
    concept: {
      subject: "place-value blocks for thousands, a balance-scale mass cue, a clock strip, and a simple table-like data display",
      alt: "Place-value blocks, mass cues, time marks, and data tiles connect thousands, measurement, and data.",
      altZh: "位值块、质量线索、时间标记和数据方块联系万以内数、测量和统计。",
      caption: "Large numbers and measurements both depend on reading the unit position correctly.",
      captionZh: "读大数和读测量结果都要看清单位所在的位置。"
    },
    worked: {
      subject: "a comparison board with thousands-place blocks, mass objects on a scale, clock intervals, and colored category counts",
      alt: "A comparison board uses place-value blocks, mass objects, time intervals, and category counts.",
      altZh: "比较板使用位值块、质量物体、时间间隔和分类数量。",
      caption: "Compare by place value first, then use units to interpret the situation.",
      captionZh: "先按位值比较，再用单位解释情境。"
    }
  },
  "pep-primary-p3-upper-operations-fractions": {
    concept: {
      subject: "place-value operation cards beside equal-part fraction circles and bars to connect calculation and fraction meaning",
      alt: "Operation cards and equal-part fraction models connect multi-digit calculation with fraction meaning.",
      altZh: "多位数运算卡片和平均分的分数模型联系计算与分数意义。",
      caption: "Estimate the calculation and identify the whole before naming a fraction.",
      captionZh: "先估算结果，再确认整体，才能准确说出分数。"
    },
    worked: {
      subject: "a workspace with aligned place-value columns and a shaded equal-parts model where the whole is outlined",
      alt: "Aligned place-value columns sit beside a shaded equal-parts model with the whole outlined.",
      altZh: "对齐的位值栏旁边放着平均分阴影模型，并清楚标出整体。",
      caption: "Line up place value for operations and line up equal parts for fractions.",
      captionZh: "运算要对齐位值，分数要看清平均分的整体。"
    }
  },
  "pep-primary-p3-upper-measurement-time-geometry": {
    concept: {
      subject: "measurement units, elapsed-time arcs on a clock, simple angle shapes, and repeating pattern tiles",
      alt: "Measurement units, clock arcs, angles, and pattern tiles show measurement, time, and geometry reasoning.",
      altZh: "计量单位、钟面弧线、角和规律方块展示测量、时间与几何推理。",
      caption: "Measurement works best when the unit, start point, and geometric feature are all clear.",
      captionZh: "测量时要看清单位、起点和几何特征。"
    },
    worked: {
      subject: "an elapsed-time path between two clock faces with a measuring tape and simple angle comparison card",
      alt: "An elapsed-time path links clock faces with a measuring tape and angle comparison card.",
      altZh: "经过时间路径连接两个钟面，并配有卷尺和角的比较卡。",
      caption: "Mark the start, track the change, and check the unit at the end.",
      captionZh: "先标起点，再追踪变化，最后检查单位。"
    }
  },
  "pep-primary-p3-lower-area-decimals": {
    concept: {
      subject: "unit-square grids, perimeter boundary highlights, and decimal tenths on a measuring strip",
      alt: "Unit-square grids, boundary highlights, and decimal tenths separate area, perimeter, and decimal meaning.",
      altZh: "单位方格、边界高亮和十分位测量条区分面积、周长和小数意义。",
      caption: "Area counts covering squares; perimeter follows the outside boundary.",
      captionZh: "面积数覆盖的方格，周长沿外边界计算。"
    },
    worked: {
      subject: "a rectangle grid where interior squares are filled, boundary edges are traced, and a decimal measure is placed on a strip",
      alt: "A rectangle grid fills interior squares, traces boundary edges, and places a decimal on a measure strip.",
      altZh: "长方形方格填充内部方格、描出边界，并在测量条上表示小数。",
      caption: "Check whether you counted squares, edges, or decimal units.",
      captionZh: "要检查自己数的是方格、边线还是小数单位。"
    }
  },
  "pep-primary-p3-lower-statistics-review": {
    concept: {
      subject: "small original bar charts, picture-graph tokens, and mixed review cards connected by comparison arrows",
      alt: "Small bar charts, picture tokens, and review cards show data reading and mixed-topic comparison.",
      altZh: "小型条形图、图标统计和复习卡片展示数据读取与综合比较。",
      caption: "Data reading starts with matching each value to its category.",
      captionZh: "读数据要先把每个数值和对应类别配对。"
    },
    worked: {
      subject: "a data-reading board with colored bars, category tokens, and a highlighted comparison between two bars",
      alt: "A data-reading board highlights a comparison between two colored bars and category tokens.",
      altZh: "数据读取板高亮比较两条彩色条形和对应类别图标。",
      caption: "Read the scale, compare the bars, then state the conclusion.",
      captionZh: "先读刻度，再比较条形，最后说出结论。"
    }
  },
  "pep-primary-p4-upper-large-numbers-multiplication": {
    concept: {
      subject: "large place-value columns, rounding distance marks, and partial-product blocks for multi-digit multiplication",
      alt: "Place-value columns, rounding marks, and partial-product blocks support large numbers and multiplication.",
      altZh: "数位栏、取近似数标记和部分积方块帮助理解大数和多位数乘法。",
      caption: "Large-number work depends on place value, estimation, and partial products.",
      captionZh: "大数学习要依靠位值、估算和部分积。"
    },
    worked: {
      subject: "a multiplication area model split into partial rectangles, with an estimation meter checking reasonableness",
      alt: "A multiplication area model splits into partial rectangles and uses an estimation meter for checking.",
      altZh: "乘法面积模型分成多个部分矩形，并用估算仪表检查合理性。",
      caption: "Break the product into parts, then check whether the size makes sense.",
      captionZh: "先把积拆成部分，再检查结果大小是否合理。"
    }
  },
  "pep-primary-p4-upper-angles-geometry": {
    concept: {
      subject: "angle arms, a protractor-like arc, right and obtuse angle examples, and clean geometry-language markers",
      alt: "Angle arms and a protractor arc show how to estimate, measure, and classify angles.",
      altZh: "角的两边和量角弧线展示如何估计、度量和分类角。",
      caption: "Angle size comes from the opening, not the length of the arms.",
      captionZh: "角的大小看张开的程度，不看边画得有多长。"
    },
    worked: {
      subject: "a geometry measurement board where one angle is aligned to a protractor arc and compared with right-angle and obtuse-angle references",
      alt: "A geometry board aligns one angle to a protractor arc and compares it with angle references.",
      altZh: "几何板把一个角与量角弧线对齐，并和常见角进行比较。",
      caption: "Align the vertex and baseline before deciding the angle type.",
      captionZh: "先对准顶点和基准边，再判断角的类型。"
    }
  },
  "pep-primary-p4-lower-decimals-average": {
    concept: {
      subject: "decimal place-value strips, aligned decimal points, unit-conversion arrows, and an average balance beam",
      alt: "Decimal place-value strips, alignment marks, conversion arrows, and an average beam explain decimals and mean.",
      altZh: "小数位值条、对齐标记、单位换算箭头和平均数天平解释小数与平均数。",
      caption: "Compare decimals by place value, and treat average as a balancing value.",
      captionZh: "比较小数要看位值，平均数可以理解为平衡后的数值。"
    },
    worked: {
      subject: "a decimal operation workspace with aligned place-value columns and data blocks being leveled to the same height",
      alt: "A decimal operation workspace aligns place values and levels data blocks to show average.",
      altZh: "小数运算工作区对齐位值，并把数据块调整到同一高度表示平均。",
      caption: "Align before calculating, then interpret what the average represents.",
      captionZh: "计算前先对齐，再解释平均数代表什么。"
    }
  },
  "pep-primary-p4-lower-perimeter-area-lines": {
    concept: {
      subject: "rectangles with traced boundaries, filled unit squares, and pairs of parallel and perpendicular lines",
      alt: "Traced boundaries, filled unit squares, and line pairs distinguish perimeter, area, parallel, and perpendicular.",
      altZh: "描边、填充方格和平行垂直线组区分周长、面积、平行与垂直。",
      caption: "Perimeter follows the edge, area covers the inside, and line relations need clear conditions.",
      captionZh: "周长沿边走，面积看内部覆盖，线的位置关系要有明确条件。"
    },
    worked: {
      subject: "a rectangle card where the border path glows separately from interior grid squares, beside line-pair relation cards",
      alt: "A rectangle card separates a glowing border path from interior grid squares beside line-relation cards.",
      altZh: "长方形卡片把发光边界和内部方格分开显示，旁边配有线组关系卡。",
      caption: "Decide which feature the problem asks for before using a formula.",
      captionZh: "套公式前先判断题目问的是哪一种特征。"
    }
  },
  "pep-primary-p5-upper-decimals-equations": {
    concept: {
      subject: "decimal operation strips, a balance model with blank unknown blocks, and unit-price style quantity bars",
      alt: "Decimal operation strips and a balance with blank unknown blocks connect decimals with simple equations.",
      altZh: "小数运算条和带未知块的天平把小数乘除与简易方程联系起来。",
      caption: "Estimate decimal size first, then write the equal relationship before solving.",
      captionZh: "先估计小数结果大小，再写出等量关系并求解。"
    },
    worked: {
      subject: "a worked workspace with scaled decimal bars, a balance keeping both sides matched, and a final reasonableness check meter",
      alt: "Scaled decimal bars and a balanced equation model show solving with a reasonableness check.",
      altZh: "缩放的小数条和等式天平展示求解过程，并用合理性检查收尾。",
      caption: "Keep the balance unchanged while tracking the decimal place value.",
      captionZh: "求解时保持两边平衡，同时追踪小数位值。"
    }
  },
  "pep-primary-p5-upper-polygon-area": {
    concept: {
      subject: "parallelogram, triangle, and trapezoid shapes decomposed into rectangles on a unit grid",
      alt: "Polygons are cut and rearranged on a grid to reveal rectangle-based area reasoning.",
      altZh: "多边形在方格上被分割和重组，显示转化为长方形的面积思路。",
      caption: "Polygon area formulas come from decomposing and transforming shapes.",
      captionZh: "多边形面积公式来自图形的分割和转化。"
    },
    worked: {
      subject: "a polygon-area transformation board with a parallelogram sliding into a rectangle and triangle halves pairing",
      alt: "A transformation board slides a parallelogram into a rectangle and pairs triangle halves.",
      altZh: "面积转化板把平行四边形平移成长方形，并把三角形半块配对。",
      caption: "Move pieces without changing area, then compare with a familiar rectangle.",
      captionZh: "移动图形部件时面积不变，再和熟悉的长方形比较。"
    }
  },
  "pep-primary-p5-lower-factors-fractions": {
    concept: {
      subject: "factor-multiple number tiles, prime/composite sorting trays, and equivalent fraction bars",
      alt: "Number tiles and fraction bars connect factors, multiples, simplification, and equivalent fractions.",
      altZh: "数块和分数条联系因数、倍数、约分和等值分数。",
      caption: "Factors organize whole numbers; equivalent fractions preserve the same value.",
      captionZh: "因数帮助整理整数关系，等值分数保持同一个大小。"
    },
    worked: {
      subject: "a workspace where number tiles are sorted into factor groups and fraction bars are aligned to find common parts",
      alt: "Number tiles sort into factor groups while aligned fraction bars show common parts.",
      altZh: "数块被分入因数组，对齐的分数条显示共同单位。",
      caption: "Find the shared unit before adding or subtracting fractions.",
      captionZh: "分数加减前要先找到共同的单位。"
    }
  },
  "pep-primary-p5-lower-volume-data": {
    concept: {
      subject: "transparent cuboids made of unit cubes, volume layers, and a small data display beside the solid",
      alt: "Transparent cuboids made of unit cubes show volume layers beside a small data display.",
      altZh: "由单位立方体组成的透明长方体展示体积层数，旁边配有小型数据图。",
      caption: "Volume counts cubic units in layers, not just the outside surface.",
      captionZh: "体积数的是一层层立方单位，不只是外表面。"
    },
    worked: {
      subject: "a cuboid-building board where layers of unit cubes stack upward and a data card records layer counts visually",
      alt: "A cuboid-building board stacks unit-cube layers and records the layer count visually.",
      altZh: "长方体搭建板逐层堆叠单位立方体，并用数据卡记录层数。",
      caption: "Count one layer, then multiply by the number of layers.",
      captionZh: "先数一层有多少，再乘以层数。"
    }
  },
  "pep-primary-p6-upper-percent-fractions": {
    concept: {
      subject: "fraction bars, decimal strips, percent grids, discount tags without text, and growth arrows connected as equivalent representations",
      alt: "Fraction bars, decimal strips, percent grids, discount cues, and growth arrows show equivalent representations.",
      altZh: "分数条、小数条、百分格、折扣线索和增长箭头展示等值表示。",
      caption: "Fractions, decimals, and percentages are different views of the same quantity.",
      captionZh: "分数、小数和百分数是同一数量的不同表示。"
    },
    worked: {
      subject: "a conversion workspace where the same shaded quantity appears as a fraction bar, decimal strip, and percent grid",
      alt: "The same shaded amount appears as a fraction bar, decimal strip, and percent grid.",
      altZh: "同一阴影数量同时出现在分数条、小数条和百分格中。",
      caption: "Convert representation first, then interpret discount or growth in context.",
      captionZh: "先完成表示转换，再解释折扣或增长情境。"
    }
  },
  "pep-primary-p6-upper-coordinate-data": {
    concept: {
      subject: "a coordinate grid with ordered-position markers, direction arrows, and a sector-style data circle",
      alt: "A coordinate grid, direction arrows, and a sector-style data circle connect position with data displays.",
      altZh: "坐标网格、方向箭头和扇形数据圆把位置与数据表达联系起来。",
      caption: "Position needs an ordered pair, while data displays need a clear whole.",
      captionZh: "位置要用有顺序的数对，数据图要先看清整体。"
    },
    worked: {
      subject: "a map-style coordinate board with route arrows and a matching data-circle panel comparing parts of a whole",
      alt: "A map-style coordinate board shows route arrows beside a data-circle panel comparing parts of a whole.",
      altZh: "地图式坐标板展示路线箭头，旁边用数据圆比较整体中的部分。",
      caption: "Read horizontal and vertical movement in order, then compare each data part with the whole.",
      captionZh: "按顺序读横向和纵向移动，再把每个数据部分与整体比较。"
    }
  },
  "pep-primary-p6-lower-ratio-proportion-scale": {
    concept: {
      subject: "ratio bars, proportional double-number-line rails, scale-map tiles, and inverse-proportion balance cues",
      alt: "Ratio bars, double number lines, scale-map tiles, and balance cues model ratio and proportion.",
      altZh: "比值条、双数线、比例尺地图块和平衡线索建立比与比例模型。",
      caption: "Ratio compares quantities, and proportion keeps the comparison consistent.",
      captionZh: "比用于比较数量，比例表示这种比较保持一致。"
    },
    worked: {
      subject: "a proportion workspace with paired bars growing together, a small scale map, and arrows showing consistent multiplicative change",
      alt: "Paired bars grow together beside a scale map to show consistent multiplicative change.",
      altZh: "成对数量条按相同倍数变化，旁边配有比例尺小地图。",
      caption: "Use the same multiplier on both related quantities.",
      captionZh: "相关的两个数量要使用同一个倍数变化。"
    }
  },
  "pep-primary-p6-lower-negative-review": {
    concept: {
      subject: "a vertical temperature-style number line, positive and negative regions, and review cards for mixed primary topics",
      alt: "A vertical number line with positive and negative regions connects negative numbers with mixed review ideas.",
      altZh: "竖直数线用正负区域把负数意义和小学综合复习联系起来。",
      caption: "Negative numbers describe direction or position relative to zero.",
      captionZh: "负数表示相对于零的方向或位置。"
    },
    worked: {
      subject: "a review dashboard with a zero-centered number line, movement arrows above and below zero, and mixed-topic model cards",
      alt: "A review dashboard uses a zero-centered number line with movement arrows and mixed-topic model cards.",
      altZh: "复习面板使用以零为中心的数线、上下移动箭头和综合模型卡。",
      caption: "Locate zero first, then decide direction before solving the mixed problem.",
      captionZh: "先确定零的位置，再判断方向，最后解决综合问题。"
    }
  }
};

function localized(en, zhHans) {
  return { en, zh: zhHans, zhHans };
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

function pngDimensions(filePath) {
  if (!existsSync(filePath)) return null;
  const buffer = readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function promptFor({ lesson, slot, plan }) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const sourceKind = slot === "concept" ? "concept" : "worked-example";

  return [
    "Use case: scientific-educational.",
    "Asset type: 16:9 lesson illustration for MAIS 人教版小学 math Lesson, review-only candidate.",
    `Primary request: Create a clean original ${sourceKind} illustration for ${lesson.metadata.grade} ${zh.title}.`,
    "Scene/backdrop: modern light math-learning canvas with subtle grid, generous whitespace, cyan/violet/emerald accents.",
    `Subject: ${plan.subject}.`,
    `Learning objective: ${en.objectives.slice(0, 2).join(" ")}`,
    "Style: crisp vector-like raster, polished app illustration, friendly for primary students, 16:9 landscape.",
    "Constraints: no textbook screenshot, no publisher layout, no copied diagram, no logos, no watermark, no page frame, no embedded readable text, no formulas, no source exercise reconstruction, no worksheet or textbook-page appearance, mathematically clear and age-appropriate."
  ].join(" ");
}

function approvedForProduction(lesson) {
  return (
    lesson.reviewStatus === "approved" &&
    lesson.integrationStatus === "production-integrated" &&
    lesson.futureProductionMapping?.productionLessonSeedReady === true
  );
}

function buildIllustrations(lessons) {
  return lessons.flatMap((lesson) => {
    const topicId = lesson.metadata.topicId;
    const plan = visualPlans[topicId];
    if (!plan) throw new Error(`Missing visual plan for ${topicId}`);

    return slots.map((slot) => {
      const slotPlan = slot === "concept" ? plan.concept : plan.worked;
      const id = `${topicId}-${slot}`;
      const candidatePath = `${packageDir}/candidates/${topicId}/${slot}.png`;
      mkdirSync(path.join(projectRoot, path.dirname(candidatePath)), { recursive: true });

      return {
        id,
        topicId,
        slot,
        reviewStatus: "pending-human-review",
        decision: "",
        candidatePath,
        srcAfterApproval: `/lesson-illustrations/mainland-pep-primary/${topicId}/${slot}.png`,
        width: imageWidth,
        height: imageHeight,
        ragCardIds: lesson.metadata.evidenceCardIds ?? [],
        examPatternCardIds: lesson.metadata.examPatternCardIds ?? [],
        grade: lesson.metadata.grade,
        semester: lesson.metadata.semester,
        lessonTitle: localized(lesson.studentLesson.en.title, lesson.studentLesson.zhHans.title),
        alt: localized(slotPlan.alt, slotPlan.altZh),
        caption: localized(slotPlan.caption, slotPlan.captionZh),
        generationPrompt: promptFor({ lesson, slot, plan: slotPlan }),
        generator: "Codex built-in image_gen (GPT Image2-style workflow)",
        reviewerNotes: `Review ${lesson.studentLesson.zhHans.title} ${slot} illustration for math correctness, source distance, and age fit.`
      };
    });
  });
}

function buildManualReviewCsv(illustrations) {
  const header = [
    "id",
    "topicId",
    "slot",
    "reviewStatus",
    "decision",
    "candidatePath",
    "srcAfterApproval",
    "ragCardIds",
    "altZhHans",
    "captionZhHans",
    "reviewerNotes"
  ];
  const rows = illustrations.map((illustration) => [
    illustration.id,
    illustration.topicId,
    illustration.slot,
    illustration.reviewStatus,
    illustration.decision,
    illustration.candidatePath,
    illustration.srcAfterApproval,
    illustration.ragCardIds,
    illustration.alt.zhHans,
    illustration.caption.zhHans,
    illustration.reviewerNotes
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function buildIndexMarkdown(manifest, validation) {
  const lines = [
    "# Mainland PEP Primary Lesson Illustrations V1 Review",
    "",
    `- Generated at: ${manifest.generatedAt}`,
    `- Generator: ${manifest.model}`,
    "- Scope: 24 Mainland PEP primary lessons, 2 candidates per lesson.",
    "- Production status: Review only. Approved images must not be copied to `public/` until all rows are manually approved.",
    `- Validation: ${validation.summary.existingCandidates}/${validation.summary.expectedCandidates} candidates exist; ${validation.summary.normalizedCandidates}/${validation.summary.expectedCandidates} are ${imageWidth}x${imageHeight}.`,
    "",
    "## Review Criteria",
    "",
    "- Mathematical correctness and fit to the lesson objective.",
    "- No copied textbook/page/screenshot look, publisher marks, logos, or watermarks.",
    "- No wrong formulas, unreadable text, stray labels, or misleading geometry/data encoding.",
    "- Clear student learning value and accurate alt/caption text.",
    "",
    "## Candidates"
  ];

  manifest.illustrations.forEach((illustration) => {
    const imageSrc = path.relative(packageDir, illustration.candidatePath);
    lines.push(
      "",
      `### ${illustration.topicId} / ${illustration.slot}`,
      "",
      `![${illustration.id}](${imageSrc})`,
      "",
      `- ID: \`${illustration.id}\``,
      `- Status: \`${illustration.reviewStatus}\``,
      `- Grade/Semester: \`${illustration.grade}\` / \`${illustration.semester}\``,
      `- RAG cards: \`${illustration.ragCardIds.join("`, `")}\``,
      `- Alt zh-Hans: ${illustration.alt.zhHans}`,
      `- Caption zh-Hans: ${illustration.caption.zhHans}`
    );
  });

  return lines.join("\n") + "\n";
}

function buildIndexHtml(manifest, validation) {
  const cards = manifest.illustrations.map((illustration) => {
    const imageSrc = path.relative(packageDir, illustration.candidatePath);
    return `
      <article class="card">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(illustration.alt.en)}" loading="lazy" />
        <div class="body">
          <p class="eyebrow">${escapeHtml(illustration.grade)} · ${escapeHtml(illustration.semester)} · ${escapeHtml(illustration.slot)}</p>
          <h2>${escapeHtml(illustration.lessonTitle.zhHans)}</h2>
          <p><strong>ID</strong> <code>${escapeHtml(illustration.id)}</code></p>
          <p><strong>Status</strong> <code>${escapeHtml(illustration.reviewStatus)}</code></p>
          <p><strong>RAG</strong> ${escapeHtml(illustration.ragCardIds.join(", "))}</p>
          <p><strong>Alt</strong> ${escapeHtml(illustration.alt.zhHans)}</p>
          <p><strong>Caption</strong> ${escapeHtml(illustration.caption.zhHans)}</p>
        </div>
      </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mainland PEP Primary Lesson Illustrations V1 Review</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    header { padding: 32px clamp(20px, 4vw, 56px); background: linear-gradient(135deg, #ecfeff, #f5f3ff); border-bottom: 1px solid #cbd5e1; }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 4vw, 44px); line-height: 1.05; }
    header p { margin: 6px 0; color: #475569; font-weight: 650; }
    main { padding: 28px clamp(20px, 4vw, 56px) 56px; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 22px; }
    .card { overflow: hidden; border: 1px solid #dbeafe; border-radius: 18px; background: rgba(255,255,255,.92); box-shadow: 0 16px 40px rgba(15,23,42,.08); }
    img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #e2e8f0; }
    .body { padding: 18px; }
    .eyebrow { margin: 0 0 8px; color: #0891b2; font-size: 12px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    p { color: #475569; line-height: 1.55; }
    code { font-size: 12px; background: #f1f5f9; padding: 2px 5px; border-radius: 6px; }
    @media (prefers-color-scheme: dark) {
      body { background: #020617; color: #f8fafc; }
      header { background: linear-gradient(135deg, #083344, #2e1065); border-color: rgba(255,255,255,.14); }
      header p, p { color: #cbd5e1; }
      .card { background: rgba(15,23,42,.88); border-color: rgba(125,211,252,.22); }
      code { background: rgba(255,255,255,.08); color: #e0f2fe; }
    }
  </style>
</head>
<body>
  <header>
    <h1>人教版小学 Lesson 插图审核包</h1>
    <p>Generated at: ${escapeHtml(manifest.generatedAt)}</p>
    <p>Scope: 24 lessons × 2 slots = 48 candidates. Production status: review-only, not integrated.</p>
    <p>Validation: ${validation.summary.existingCandidates}/${validation.summary.expectedCandidates} PNG candidates exist; ${validation.summary.normalizedCandidates}/${validation.summary.expectedCandidates} are ${imageWidth}x${imageHeight}.</p>
  </header>
  <main>
    ${cards}
  </main>
</body>
</html>
`;
}

function validate(manifest) {
  const keySet = new Set();
  const issues = [];
  const details = manifest.illustrations.map((illustration) => {
    const key = `${illustration.topicId}:${illustration.slot}`;
    if (keySet.has(key)) issues.push(`${key}: duplicate illustration key`);
    keySet.add(key);
    if (!illustration.ragCardIds.length) issues.push(`${illustration.id}: missing RAG traceability`);
    if (!illustration.alt.en.trim() || !illustration.alt.zh.trim() || !illustration.alt.zhHans.trim()) {
      issues.push(`${illustration.id}: missing localized alt text`);
    }
    if (!illustration.caption.en.trim() || !illustration.caption.zh.trim() || !illustration.caption.zhHans.trim()) {
      issues.push(`${illustration.id}: missing localized caption`);
    }

    const absolutePath = path.join(projectRoot, illustration.candidatePath);
    const dimensions = pngDimensions(absolutePath);
    const exists = Boolean(dimensions);
    const normalized = Boolean(dimensions && dimensions.width === imageWidth && dimensions.height === imageHeight);
    if (!exists) issues.push(`${illustration.id}: PNG candidate missing or invalid`);
    if (dimensions && !normalized) issues.push(`${illustration.id}: unexpected dimensions ${dimensions.width}x${dimensions.height}`);

    return {
      id: illustration.id,
      topicId: illustration.topicId,
      slot: illustration.slot,
      candidatePath: illustration.candidatePath,
      exists,
      dimensions,
      normalized
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    pass: issues.length === 0,
    summary: {
      expectedTopics: 24,
      expectedCandidates: 48,
      manifestCandidates: manifest.illustrations.length,
      existingCandidates: details.filter((detail) => detail.exists).length,
      normalizedCandidates: details.filter((detail) => detail.normalized).length,
      allowedStatuses: ["pending", "approved", "rejected", "regenerate"],
      packageStatus: "review-only-not-integrated"
    },
    issues,
    details
  };
}

const lessonPack = JSON.parse(readFileSync(lessonsPath, "utf8"));
const lessons = lessonPack.lessons.filter(approvedForProduction);

if (lessons.length !== 24) {
  throw new Error(`Expected 24 approved primary lessons, found ${lessons.length}`);
}

const illustrations = buildIllustrations(lessons);
const manifest = {
  version: "mainland-pep-primary-illustrations-v1",
  scope: "MAINLAND_PEP_PRIMARY",
  model: "gpt-image-2 via Codex built-in image_gen workflow",
  size: {
    width: imageWidth,
    height: imageHeight
  },
  generatedAt: new Date().toISOString(),
  reviewStatus: "pending-human-review",
  productionStatus: "review-only-not-integrated",
  generationPolicy: [
    "Use MAIS safe-RAG abstractions and approved primary lesson summaries only.",
    "Do not copy, reconstruct, or imitate textbook screenshots, page layouts, figures, source examples, or publisher visual style.",
    "Generate fresh MAIS-authored educational visuals with no logos, no watermarks, and no embedded textbook text.",
    "Avoid in-image formulas and labels where possible; learner-facing wording belongs in captions and alt text.",
    "Only rows later marked approved in manual-review.csv may be copied to public lesson illustration assets."
  ],
  sourceEvidence: [
    "data/rag/mainlandPepPrimary.ts",
    "data/rag/mainlandPepPrimaryExamPatterns.ts",
    "coordination/content-qa/mainland-pep-primary-lessons-v1/lessons.json",
    "coordination/content-qa/2026-05-23-S18-mainland-pep-primary-rag-verification.md",
    "coordination/content-qa/mainland-pep-primary-lessons-v1/final-s18-qa-report.md"
  ],
  illustrations
};

mkdirSync(outDir, { recursive: true });

const validation = validate(manifest);
writeFileSync(path.join(outDir, "illustration-plan.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(path.join(outDir, "manual-review.csv"), buildManualReviewCsv(illustrations));
writeFileSync(path.join(outDir, "validation-report.json"), JSON.stringify(validation, null, 2) + "\n");
writeFileSync(path.join(outDir, "index.md"), buildIndexMarkdown(manifest, validation));
writeFileSync(path.join(outDir, "index.html"), buildIndexHtml(manifest, validation));

console.log(JSON.stringify(validation.summary, null, 2));
if (!validation.pass) {
  console.log(`${validation.issues.length} validation issue(s); most are expected before PNG generation.`);
}
