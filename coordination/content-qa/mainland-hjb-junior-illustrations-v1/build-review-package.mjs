import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageRel = path.relative(projectRoot, __dirname);
const packageDir = path.join(projectRoot, packageRel);
const candidatesDir = path.join(packageDir, "candidates");
const lessonsPath = path.join(projectRoot, "coordination/content-qa/mainland-hjb-junior-lessons-v1/lessons.json");
const sourceImageDir =
  process.env.SOURCE_IMAGE_DIR ??
  "/Users/dongpinhu/.codex/generated_images/019e68bb-8ebe-74d2-8fde-029e971d2d7e";

const imageWidth = 1600;
const imageHeight = 900;
const slots = ["concept", "worked-example"];

const visualPlans = {
  "hjb-junior-s1-upper-polynomial-add-subtract": {
    concept: {
      alt: "Algebra tiles and color-coded term groups show like terms joining, brackets opening, and sign handling.",
      altZh: "代数块和同色项组展示同类项合并、括号展开和符号处理。",
      caption: "Polynomial addition and subtraction become safer when learners group like terms and track signs.",
      captionZh: "整式加减要先归类同类项，并始终追踪符号。",
      promptSubject: "algebra tiles and color-coded term groups arranged on a soft grid"
    },
    "worked-example": {
      alt: "A step-by-step algebra-tile workspace groups matching terms and uses a sign-check path to simplify.",
      altZh: "分步代数块工作区把相同项归组，并用符号检查路径完成化简。",
      caption: "Collect matching structures first, then check every sign before writing the simplified form.",
      captionZh: "先收集相同结构，再检查每个符号，最后写出化简结果。",
      promptSubject: "a step-by-step algebra-tile workspace with matching term groups and a sign-check path"
    }
  },
  "hjb-junior-s1-upper-polynomial-multiply-divide": {
    concept: {
      alt: "Exponent-law blocks, monomial tiles, and area rectangles connect polynomial multiplication and division.",
      altZh: "幂运算块、单项式块和面积模型矩形联系整式乘除。",
      caption: "Structure recognition helps learners choose the right exponent law or product model.",
      captionZh: "看清结构，才能选择合适的幂运算规则或乘积模型。",
      promptSubject: "exponent-law blocks, monomial tiles, area-model rectangles, and formula-pattern panels"
    },
    "worked-example": {
      alt: "An area model expands into colored pieces, then reverses through a division path into factor tiles.",
      altZh: "面积模型展开为彩色小块，再沿除法路径还原为因子块。",
      caption: "Use the rectangle model to check multiplication, then reverse it to reason about division.",
      captionZh: "用矩形模型检查乘法，再反向理解除法。",
      promptSubject: "an area-model workspace expanding and reversing into equal factor tiles"
    }
  },
  "hjb-junior-s1-upper-factorization": {
    concept: {
      alt: "Polynomial tiles are rearranged into factor groups with common-factor strips and formula-pattern shapes.",
      altZh: "整式块被重组成因式组，并突出公因式条和公式结构。",
      caption: "Factoring means finding the hidden product structure inside a polynomial.",
      captionZh: "因式分解就是在整式中找出隐藏的乘积结构。",
      promptSubject: "polynomial tiles rearranged from one combined rectangle into factor groups"
    },
    "worked-example": {
      alt: "A factorization board pulls out a shared strip, folds remaining tiles, and checks by expansion.",
      altZh: "因式分解板先提出公共部分，再折叠剩余块，并用展开作检查。",
      caption: "Pull out the complete common factor, then verify by multiplying back.",
      captionZh: "先完整提出公因式，再乘回去检查。",
      promptSubject: "a factorization workspace highlighting a shared strip and a visual expansion check"
    }
  },
  "hjb-junior-s1-upper-algebraic-fractions": {
    concept: {
      alt: "Layered fraction cards show numerator, denominator, domain restrictions, and equivalent transformations.",
      altZh: "分层分式卡展示分子、分母、取值限制和等价变形。",
      caption: "Algebraic fractions must keep denominator restrictions visible during every transformation.",
      captionZh: "分式变形时，分母取值限制必须一直保留。",
      promptSubject: "algebraic fraction tiles with domain-restriction markers and simplification paths"
    },
    "worked-example": {
      alt: "A simplification board pairs numerator and denominator factor blocks while excluded values remain visible.",
      altZh: "化简板把分子分母因子配对，同时保留不可取值提示。",
      caption: "Cancel factors, not terms, and keep the original restrictions attached.",
      captionZh: "约去的是因子，不是项；原来的限制条件要保留。",
      promptSubject: "a simplification board pairing factor blocks in numerator and denominator"
    }
  },
  "hjb-junior-s1-upper-figure-transformations": {
    concept: {
      alt: "A figure moves by translation, rotation, reflection, and symmetry while corresponding points leave color trails.",
      altZh: "图形经过平移、旋转、翻折和对称运动，对应点留下彩色轨迹。",
      caption: "Transformations change position or orientation while preserving key shape features.",
      captionZh: "图形运动改变位置或方向，但关键形状特征保持不变。",
      promptSubject: "a triangle and polygon moving across a grid through translation, rotation, reflection, and symmetry"
    },
    "worked-example": {
      alt: "A grid workspace checks translated, rotated, and reflected shapes with dotted vertex trails and overlays.",
      altZh: "网格工作区用顶点虚线轨迹和重叠图检查平移、旋转与翻折。",
      caption: "Match corresponding vertices first, then check size, direction, and orientation.",
      captionZh: "先匹配对应点，再检查大小、方向和朝向。",
      promptSubject: "a construction-checking grid with corresponding vertices and motion trails"
    }
  },
  "hjb-junior-s1-lower-linear-inequalities": {
    concept: {
      alt: "A number line, boundary points, shaded solution rays, and balance panels show inequality solution sets.",
      altZh: "数轴、边界点、解集射线和天平面板展示不等式解集。",
      caption: "Inequality solutions describe a whole set of values, not just one answer.",
      captionZh: "不等式的解表示一组数，而不只是一个答案。",
      promptSubject: "a number line with open and closed boundary points, solution rays, and balance-scale transformations"
    },
    "worked-example": {
      alt: "A solving path shows equal changes on both sides, a direction flip cue, and a final number-line check.",
      altZh: "解题路径展示两边同变、方向翻转线索和最终数轴检查。",
      caption: "Transform both sides carefully and flip the direction when the rule requires it.",
      captionZh: "两边变形要同步，遇到需要翻转方向的步骤要特别检查。",
      promptSubject: "a visual solving path with a direction-flip cue and final number-line check"
    }
  },
  "hjb-junior-s1-lower-intersecting-parallel-lines": {
    concept: {
      alt: "Intersecting and parallel lines highlight angle pairs, perpendicular cues, and matching arcs.",
      altZh: "相交线和平行线突出角对、垂直线索和匹配角弧。",
      caption: "Angle conclusions depend on the line condition that justifies them.",
      captionZh: "角关系结论必须依赖能够支持它的线的位置条件。",
      promptSubject: "parallel lines cut by a transversal plus intersecting-line angle pairs"
    },
    "worked-example": {
      alt: "A reasoning workspace uses a parallel condition to unlock matching angle arcs and reach a target angle.",
      altZh: "推理工作区用平行条件开启匹配角弧，并逐步到达目标角。",
      caption: "Name the relationship before calculating, so the diagram does not mislead you.",
      captionZh: "计算前先说清角关系，避免被图形外观误导。",
      promptSubject: "a geometry reasoning workspace where a parallel condition unlocks matching angle arcs"
    }
  },
  "hjb-junior-s1-lower-triangles": {
    concept: {
      alt: "Triangle diagrams show side-angle relationships, interior and exterior angle cues, and side-stick checks.",
      altZh: "三角形图展示边角关系、内外角线索和边长木棒检查。",
      caption: "Triangle reasoning begins by checking which side and angle conditions are valid.",
      captionZh: "三角形推理要先确认哪些边角条件成立。",
      promptSubject: "multiple triangles showing side-angle relationships, angle arcs, and triangle-inequality side sticks"
    },
    "worked-example": {
      alt: "A missing-measure workspace checks side validity before combining angle arcs and exterior-angle clues.",
      altZh: "求未知量工作区先检查边长是否能成三角形，再组合角弧和外角线索。",
      caption: "Confirm the triangle can exist before using angle or perimeter reasoning.",
      captionZh: "先确认三角形能成立，再使用角度或周长推理。",
      promptSubject: "a missing-measure triangle workspace with side-validity and exterior-angle checks"
    }
  },
  "hjb-junior-s1-lower-isosceles-triangles": {
    concept: {
      alt: "Isosceles and equilateral triangles show matching sides, base angles, and perpendicular-bisector arcs.",
      altZh: "等腰与等边三角形展示对应边、底角和垂直平分线弧迹。",
      caption: "Equal sides, equal angles, and equal distances are connected but must be justified correctly.",
      captionZh: "等边、等角和等距离相互关联，但使用时要说明依据。",
      promptSubject: "isosceles and equilateral triangles with matching side colors and perpendicular bisectors"
    },
    "worked-example": {
      alt: "A proof workspace separates isosceles properties from criteria using side ticks, angle arcs, and bisector checks.",
      altZh: "证明工作区用边记号、角弧和垂直平分线检查区分性质与判定。",
      caption: "Decide whether you are using a known property or proving a criterion.",
      captionZh: "先判断自己是在使用已知性质，还是在证明判定条件。",
      promptSubject: "a proof workspace distinguishing isosceles property use from criterion proof"
    }
  },
  "hjb-junior-s2-upper-real-numbers": {
    concept: {
      alt: "A number line connects rational points, root markers, decimal magnifiers, and real-number categories.",
      altZh: "数轴连接有理点、根式标记、小数放大镜和实数分类区域。",
      caption: "Real numbers become clearer when notation, category, and number-line position agree.",
      captionZh: "符号、分类和数轴位置一致时，实数理解才清楚。",
      promptSubject: "a number-line landscape extending from rational points to square-root and cube-root markers"
    },
    "worked-example": {
      alt: "A comparison board estimates root-like quantities, separates decimal patterns, and checks order on a number line.",
      altZh: "比较板估计根式数量，区分小数模式，并在数轴上检查大小顺序。",
      caption: "Estimate first, then place values on the same number line before comparing.",
      captionZh: "先估计，再放到同一数轴上比较。",
      promptSubject: "a comparison workspace estimating root-like quantities on a number line"
    }
  },
  "hjb-junior-s2-upper-quadratic-radicals": {
    concept: {
      alt: "Square-area cards, nonnegative markers, radical pieces, and like-radical groups show radical structure.",
      altZh: "正方形面积卡、非负提示、根式部件和同类根式组展示二次根式结构。",
      caption: "Radical operations require defined quantities and compatible radical parts.",
      captionZh: "二次根式运算要先保证有意义，再看根式部分是否相同。",
      promptSubject: "square-root expression cards connected to geometric square areas and like-radical groups"
    },
    "worked-example": {
      alt: "A simplification board splits square-area blocks into perfect-square chunks and keeps unlike radicals separate.",
      altZh: "化简板把面积块拆成完全平方部分，并把不同根式分开处理。",
      caption: "Simplify by factors and estimate the result to check whether it is reasonable.",
      captionZh: "按因子化简，并用估计检查结果是否合理。",
      promptSubject: "a radical simplification board splitting square-area blocks into perfect-square chunks"
    }
  },
  "hjb-junior-s2-upper-quadratic-equations": {
    concept: {
      alt: "A parabola, root markers, square-completion tiles, and factor blocks show quadratic-equation methods.",
      altZh: "抛物线、根点、配方方块和因式块展示一元二次方程方法。",
      caption: "Quadratic equations connect algebraic forms with graph roots and area structure.",
      captionZh: "一元二次方程把代数形式、图像根和面积结构联系起来。",
      promptSubject: "a parabola crossing an axis with completing-square tiles and factor blocks"
    },
    "worked-example": {
      alt: "A method-comparison workspace aligns factoring, completing the square, and parabola root checking.",
      altZh: "方法比较工作区并列因式分解、配方和抛物线根点检查。",
      caption: "Choose a method, then use the graph or area model to check the roots.",
      captionZh: "选定方法后，用图像或面积模型检查根是否合理。",
      promptSubject: "a solving workspace comparing factoring tiles, square completion, and graph-root checking"
    }
  },
  "hjb-junior-s2-upper-right-triangles": {
    concept: {
      alt: "Right triangles show square areas on each side, altitude cues, projections, and distance reasoning.",
      altZh: "直角三角形展示三边正方形面积、高线线索、投影和距离推理。",
      caption: "Right-triangle structure turns distance and area relationships into reliable checks.",
      captionZh: "直角三角形结构能把距离和面积关系转化为可靠检查。",
      promptSubject: "right triangles with square areas on each side, altitude and projection cues"
    },
    "worked-example": {
      alt: "A problem workspace verifies side relationships with square tiles and a right-triangle distance path.",
      altZh: "问题工作区用正方形面积块和直角三角形距离路径验证边的关系。",
      caption: "Identify the right angle first, then compare the side relationship it controls.",
      captionZh: "先找直角，再比较由它控制的边长关系。",
      promptSubject: "a right-triangle problem workspace with square-area tiles and an altitude check"
    }
  },
  "hjb-junior-s2-lower-quadrilaterals": {
    concept: {
      alt: "Quadrilateral families connect through side, angle, parallel, and diagonal property cues.",
      altZh: "四边形家族通过边、角、平行和对角线性质线索相互联系。",
      caption: "Quadrilateral classification depends on properties, not just appearance.",
      captionZh: "四边形分类依据性质，而不是只看外形。",
      promptSubject: "parallelogram, rectangle, rhombus, square, trapezoid, and quadrilateral families connected by property arrows"
    },
    "worked-example": {
      alt: "A proof workspace draws diagonals, splits quadrilaterals into triangles, and checks property conditions.",
      altZh: "证明工作区画出对角线，把四边形拆成三角形，并检查性质条件。",
      caption: "Use diagonals and triangle evidence to justify the quadrilateral property.",
      captionZh: "用对角线和三角形证据支撑四边形性质。",
      promptSubject: "a quadrilateral proof workspace with diagonal construction and property checks"
    }
  },
  "hjb-junior-s2-lower-coordinate-plane": {
    concept: {
      alt: "A coordinate plane shows quadrants, ordered-point markers, movement arrows, reflection cues, and a map path.",
      altZh: "平面直角坐标系展示象限、有序点、移动箭头、对称线索和地图路径。",
      caption: "Coordinate reading separates horizontal and vertical information in a fixed order.",
      captionZh: "读坐标要按固定顺序区分横向和纵向信息。",
      promptSubject: "a coordinate plane with four quadrants, point markers, movement arrows, and symmetry reflections"
    },
    "worked-example": {
      alt: "A point-location workspace moves horizontally then vertically and checks a route on a coordinate map.",
      altZh: "定位工作区先横向再纵向移动，并在坐标地图上检查路线。",
      caption: "Read movement one direction at a time before naming the point.",
      captionZh: "说出点的位置前，先逐方向读取移动。",
      promptSubject: "a point-location workspace with horizontal and vertical movement on a coordinate map"
    }
  },
  "hjb-junior-s2-lower-linear-functions": {
    concept: {
      alt: "Straight-line graphs, slope triangles, intercept markers, and table-to-graph arrows show linear functions.",
      altZh: "直线图像、斜率三角形、截距点和表格到图像箭头展示一次函数。",
      caption: "A linear function is read through rate of change, intercept, and graph direction.",
      captionZh: "一次函数要从变化率、截距和图像方向来读。",
      promptSubject: "straight-line graphs, slope triangles, intercept markers, and table-to-graph arrows"
    },
    "worked-example": {
      alt: "A table-to-line workspace turns colored pairs into plotted points, a line, and slope-intercept checks.",
      altZh: "表格到直线工作区把对应点画成图像，并检查斜率和截距。",
      caption: "Use points to draw the line, then use slope and intercept to verify the model.",
      captionZh: "先用点画线，再用斜率和截距验证模型。",
      promptSubject: "a table-to-line worked-example workspace with plotted points and slope triangle"
    }
  },
  "hjb-junior-s2-lower-inverse-functions": {
    concept: {
      alt: "Inverse-proportion curves, constant-area rectangles, asymptote cues, and opposite variable movement are shown.",
      altZh: "反比例曲线、定面积矩形、渐近线线索和变量反向变化同时呈现。",
      caption: "Inverse proportionality keeps a product relationship while quantities move in opposite directions.",
      captionZh: "反比例保持乘积关系，同时两个量常向相反方向变化。",
      promptSubject: "inverse-proportion curves with rectangular area cues and asymptote lines"
    },
    "worked-example": {
      alt: "A graph-check workspace slides a constant-area rectangle along an inverse curve and checks quadrant choice.",
      altZh: "图像检查工作区让定面积矩形沿反比例曲线移动，并检查象限选择。",
      caption: "Check the sign and quadrant before reading the curve relationship.",
      captionZh: "读曲线关系前，先检查符号和象限。",
      promptSubject: "a worked graph-check workspace with a rectangle of constant area sliding along an inverse curve"
    }
  },
  "hjb-junior-s3-upper-similar-triangles": {
    concept: {
      alt: "Similar triangles at different scales show matching angle arcs, proportional side bars, and projection rays.",
      altZh: "不同大小的相似三角形展示匹配角弧、比例边条和投影射线。",
      caption: "Similarity preserves shape while side lengths scale by the same factor.",
      captionZh: "相似保持形状，边长按同一个比例变化。",
      promptSubject: "pairs of triangles at different scales with matching angle arcs and proportional side bars"
    },
    "worked-example": {
      alt: "A proof-and-measurement workspace matches angles, pairs corresponding sides, and checks a scaled segment.",
      altZh: "证明与测量工作区匹配角、配对对应边，并检查缩放后的线段。",
      caption: "Match corresponding parts before setting up a proportion.",
      captionZh: "建立比例前，先匹配对应部分。",
      promptSubject: "a proof-and-measurement workspace identifying equal angles and corresponding sides"
    }
  },
  "hjb-junior-s3-upper-acute-trigonometry": {
    concept: {
      alt: "Right-triangle families with the same acute angle show side-ratio bands, quadrant cues, and height measurement.",
      altZh: "同一锐角的直角三角形族展示边比色带、象限线索和测高情境。",
      caption: "Trigonometric ratios depend on the acute angle and the relative sides.",
      captionZh: "锐角三角比取决于锐角和相关边的位置关系。",
      promptSubject: "right-triangle families with the same acute angle and side-ratio color bands"
    },
    "worked-example": {
      alt: "A height-measurement scene overlays a right triangle, sight line, side-ratio bands, and a reasonableness check.",
      altZh: "测高场景叠加直角三角形、视线、边比色带和合理性检查。",
      caption: "Draw the right triangle model before choosing the ratio.",
      captionZh: "选择三角比前，先画出直角三角形模型。",
      promptSubject: "a height-measurement worked-example with observer, sight line, and right-triangle overlay"
    }
  },
  "hjb-junior-s3-upper-quadratic-functions": {
    concept: {
      alt: "Parabolas show vertex, symmetry axis, intercept markers, transformations, and increase-decrease shading.",
      altZh: "抛物线展示顶点、对称轴、截点、变换和增减区间阴影。",
      caption: "A quadratic function is best read through vertex, symmetry, direction, and intercepts.",
      captionZh: "读二次函数要看顶点、对称、开口方向和截点。",
      promptSubject: "parabolas opening up and down with vertex point, axis of symmetry, and transformation arrows"
    },
    "worked-example": {
      alt: "A graph-reading workspace highlights vertex, symmetry line, roots, and changing intervals from table dots.",
      altZh: "读图工作区从表格点突出顶点、对称轴、根点和变化区间。",
      caption: "Use the graph to check the vertex and interval behavior after calculation.",
      captionZh: "计算后，用图像检查顶点和区间变化。",
      promptSubject: "a graph-reading workspace with parabola vertex, symmetry line, roots, and table dots"
    }
  },
  "hjb-junior-s3-lower-circle-regular-polygons": {
    concept: {
      alt: "A circle connects chords, arcs, central angles, tangent cues, regular polygons, and symmetry spokes.",
      altZh: "圆把弦、弧、圆心角、切线线索、正多边形和对称半径联系起来。",
      caption: "Circle and regular-polygon reasoning depends on equal arcs, radii, and symmetry.",
      captionZh: "圆与正多边形推理依赖等弧、半径和对称结构。",
      promptSubject: "a circle with chords, arcs, central angles, tangent cue, inscribed regular polygons, and symmetry spokes"
    },
    "worked-example": {
      alt: "A construction workspace divides a circle into equal arcs, builds a regular polygon, and checks tangent-radius structure.",
      altZh: "作图工作区把圆分成等弧，构造正多边形，并检查切线与半径结构。",
      caption: "Use equal divisions and radius relationships to justify the construction.",
      captionZh: "用等分和半径关系说明作图依据。",
      promptSubject: "a construction workspace dividing a circle into equal arcs and building a regular polygon"
    }
  },
  "hjb-junior-s3-lower-statistics-introduction": {
    concept: {
      alt: "Raw data dots become chart cards, center markers, spread bands, and a sampling model.",
      altZh: "原始数据点转化为图表卡、中心标记、离散带和抽样模型。",
      caption: "Statistics turns data into evidence by describing center, spread, and sampling limits.",
      captionZh: "统计用中心、离散程度和抽样限制把数据转化为证据。",
      promptSubject: "raw data dots becoming chart cards, center markers, spread bands, and a sampling bowl"
    },
    "worked-example": {
      alt: "A comparison workspace uses dot plots, bars, center markers, and spread bands to compare distributions.",
      altZh: "比较工作区用点图、条形、中心标记和离散带比较两个分布。",
      caption: "Compare center and spread together before making a data conclusion.",
      captionZh: "下数据结论前，要同时比较中心和离散程度。",
      promptSubject: "a data-analysis workspace comparing two distributions with center markers and spread bands"
    }
  }
};

function readLessons() {
  const parsed = JSON.parse(readFileSync(lessonsPath, "utf8"));
  return parsed.lessons.filter((lesson) =>
    lesson.reviewStatus === "approved" &&
    lesson.integrationStatus === "production-integrated" &&
    lesson.sourceDistanceStatus === "passed-safe-rag"
  );
}

function sourceImages() {
  if (!existsSync(sourceImageDir)) {
    throw new Error(`Source image directory not found: ${sourceImageDir}`);
  }

  return readdirSync(sourceImageDir)
    .filter((file) => file.endsWith(".png"))
    .map((file) => {
      const fullPath = path.join(sourceImageDir, file);
      return { fullPath, mtimeMs: statSync(fullPath).mtimeMs };
    })
    .sort((left, right) => left.mtimeMs - right.mtimeMs);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(rows) {
  const headers = [
    "id",
    "topicId",
    "slot",
    "reviewStatus",
    "decision",
    "candidatePath",
    "srcAfterApproval",
    "altZhHans",
    "captionZhHans",
    "ragCardIds",
    "reviewerNotes"
  ];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  });
  writeFileSync(path.join(packageDir, "manual-review.csv"), `${lines.join("\n")}\n`);
}

function imageDimensions(filePath) {
  const result = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const width = result.stdout.match(/pixelWidth: (\d+)/)?.[1];
  const height = result.stdout.match(/pixelHeight: (\d+)/)?.[1];
  if (!width || !height) return null;
  return { width: Number(width), height: Number(height) };
}

function normalizeImage(filePath) {
  const result = spawnSync("sips", ["-z", String(imageHeight), String(imageWidth), filePath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`sips normalization failed for ${filePath}: ${result.stderr || result.stdout}`);
  }
}

function buildPrompt(lesson, slot, plan) {
  return [
    "Create a clean 16:9 educational math illustration for a Shanghai Education Press junior-secondary lesson.",
    `Topic: ${lesson.metadata.volume} ${lesson.metadata.unitTitle}, ${slot} slot.`,
    `Visual idea: ${plan.promptSubject}.`,
    "Style: modern vector-like math learning art, airy white background, cyan/violet/emerald/gold accents, crisp mathematical geometry or symbolic shapes.",
    "No textbook page layout, no publisher marks, no logos, no watermark, no copied source visual style, and no long readable text.",
    "Suitable as a MAIS Lesson page illustration."
  ].join(" ");
}

function ensurePlanCoverage(lessons) {
  const missing = lessons
    .map((lesson) => lesson.metadata.topicId)
    .filter((topicId) => !visualPlans[topicId]);
  if (missing.length) throw new Error(`Missing visual plans for: ${missing.join(", ")}`);
}

function buildPackage() {
  mkdirSync(candidatesDir, { recursive: true });

  const lessons = readLessons();
  ensurePlanCoverage(lessons);
  const images = sourceImages();
  const expected = lessons.length * slots.length;
  if (lessons.length !== 22) throw new Error(`Expected 22 approved HJB junior lessons, received ${lessons.length}`);
  if (images.length !== expected) throw new Error(`Expected ${expected} source images, received ${images.length}`);

  const planRows = [];
  let imageIndex = 0;

  lessons.forEach((lesson) => {
    const topicId = lesson.metadata.topicId;
    slots.forEach((slot) => {
      const slotPlan = visualPlans[topicId][slot];
      const id = `${topicId}-${slot}`;
      const targetDir = path.join(candidatesDir, topicId);
      const candidatePath = path.join(targetDir, `${slot}.png`);
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(images[imageIndex].fullPath, candidatePath);
      normalizeImage(candidatePath);
      imageIndex += 1;

      const candidateRel = path.relative(projectRoot, candidatePath);
      planRows.push({
        id,
        topicId,
        unitTitleZhHans: lesson.metadata.unitTitle,
        volume: lesson.metadata.volume,
        slot,
        reviewStatus: "pending",
        decision: "pending",
        candidatePath: candidateRel,
        srcAfterApproval: `/lesson-illustrations/mainland-hjb-junior/${topicId}/${slot}.png`,
        alt: {
          en: slotPlan.alt,
          zh: slotPlan.altZh,
          zhHans: slotPlan.altZh
        },
        caption: {
          en: slotPlan.caption,
          zh: slotPlan.captionZh,
          zhHans: slotPlan.captionZh
        },
        ragCardIds: lesson.metadata.evidenceCardIds,
        prompt: buildPrompt(lesson, slot, slotPlan),
        reviewerNotes: "Pending owner/S18 math correctness, source-distance, and age-fit review."
      });
    });
  });

  const missingCandidates = planRows.filter((row) => !existsSync(path.join(projectRoot, row.candidatePath)));
  const dimensions = planRows.map((row) => {
    const dims = imageDimensions(path.join(projectRoot, row.candidatePath));
    return { id: row.id, ...dims };
  });
  const invalidDimensions = dimensions.filter((item) => item.width !== imageWidth || item.height !== imageHeight);

  writeFileSync(
    path.join(packageDir, "illustration-plan.json"),
    `${JSON.stringify(
      {
        schemaVersion: "mainland-hjb-junior-illustrations-v1",
        generatedAt: new Date().toISOString(),
        generator: "Codex built-in image generation requested as GPT Image2-style review candidates; source images retained under ~/.codex/generated_images.",
        productionStatus: "review-only",
        approvalGate: "Do not copy to public/ or wire into LessonView until all manual-review.csv rows are approved.",
        sourceLessonPack: "coordination/content-qa/mainland-hjb-junior-lessons-v1/lessons.json",
        sourceRag: ["data/rag/mainlandHjbJunior.ts", "data/mainlandHjbJuniorTopics.ts"],
        imageWidth,
        imageHeight,
        candidates: planRows
      },
      null,
      2
    )}\n`
  );

  writeCsv(
    planRows.map((row) => ({
      ...row,
      altZhHans: row.alt.zhHans,
      captionZhHans: row.caption.zhHans,
      ragCardIds: row.ragCardIds.join("|")
    }))
  );

  const mdLines = [
    "# Mainland HJB Junior Lesson Illustrations V1 Review",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    "- Generator: Codex built-in image generation, kept as review-only candidates.",
    "- Scope: 22 Mainland HJB junior-secondary lessons, 2 candidates per lesson.",
    "- Production status: Review only. Do not copy into `public/lesson-illustrations/mainland-hjb-junior/` until all rows in `manual-review.csv` are approved.",
    "- Review statuses: all 44 rows start as `pending`.",
    "",
    "## Review Criteria",
    "",
    "- Mathematical correctness and fit to the lesson objective.",
    "- No copied textbook/page/screenshot look, publisher marks, logos, or watermarks.",
    "- No misleading geometry, graph, data encoding, or unreadable mathematical clutter.",
    "- Clear student learning value and accurate alt/caption text.",
    "",
    "## Candidates",
    ""
  ];

  planRows.forEach((row) => {
    mdLines.push(`### ${row.topicId} / ${row.slot}`);
    mdLines.push("");
    mdLines.push(`![${row.id}](${path.relative(packageDir, path.join(projectRoot, row.candidatePath))})`);
    mdLines.push("");
    mdLines.push(`- ID: \`${row.id}\``);
    mdLines.push("- Status: `pending`");
    mdLines.push(`- RAG cards: \`${row.ragCardIds.join("`, `")}\``);
    mdLines.push(`- Alt zh-Hans: ${row.alt.zhHans}`);
    mdLines.push(`- Caption zh-Hans: ${row.caption.zhHans}`);
    mdLines.push("");
  });
  writeFileSync(path.join(packageDir, "index.md"), `${mdLines.join("\n")}\n`);

  const cards = planRows
    .map((row) => {
      const imageRel = path.relative(packageDir, path.join(projectRoot, row.candidatePath));
      return `
      <article class="card">
        <img src="${imageRel}" alt="${row.alt.en.replaceAll('"', "&quot;")}" />
        <div class="body">
          <h2>${row.topicId} <span>${row.slot}</span></h2>
          <p class="status">pending review</p>
          <p>${row.caption.zhHans}</p>
          <p class="meta">RAG: ${row.ragCardIds.join(", ")}</p>
        </div>
      </article>`;
    })
    .join("\n");

  writeFileSync(
    path.join(packageDir, "index.html"),
    `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mainland HJB Junior Lesson Illustrations V1 Review</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f8fbff; color: #172033; }
    body { margin: 0; padding: 32px; }
    header { max-width: 1100px; margin: 0 auto 28px; }
    h1 { margin: 0 0 10px; font-size: 30px; }
    p { line-height: 1.65; }
    code { background: #edf2ff; border-radius: 6px; padding: 2px 6px; }
    .grid { max-width: 1360px; margin: 0 auto; display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); }
    .card { overflow: hidden; border: 1px solid #d9e8f8; border-radius: 14px; background: white; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
    img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #eef6ff; }
    .body { padding: 14px 16px 18px; }
    h2 { margin: 0; font-size: 15px; line-height: 1.4; color: #0f172a; }
    h2 span { color: #0e7490; font-weight: 800; }
    .status { display: inline-block; margin: 10px 0 6px; border-radius: 999px; background: #fef3c7; color: #92400e; padding: 3px 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .meta { color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <h1>Mainland HJB Junior Lesson Illustrations V1 Review</h1>
    <p>44 Codex-generated review candidates for 22 沪教版初中 lessons. All rows start as <code>pending</code>; approved images may only be promoted after manual review updates <code>manual-review.csv</code>.</p>
  </header>
  <main class="grid">
${cards}
  </main>
</body>
</html>
`
  );

  writeFileSync(
    path.join(packageDir, "validation-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        expectedCandidates: expected,
        existingCandidates: expected - missingCandidates.length,
        missingCandidates: missingCandidates.map((row) => row.id),
        invalidDimensions,
        allDimensionsNormalized: invalidDimensions.length === 0,
        productionIntegrated: false,
        publicAssetRoot: "/lesson-illustrations/mainland-hjb-junior",
        reviewStatusCounts: {
          pending: planRows.length,
          approved: 0,
          rejected: 0,
          revise: 0
        }
      },
      null,
      2
    )}\n`
  );
}

buildPackage();
