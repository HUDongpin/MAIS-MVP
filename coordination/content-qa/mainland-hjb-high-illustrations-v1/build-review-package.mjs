import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageDir = path.relative(projectRoot, __dirname);
const candidatesDir = path.join(__dirname, "candidates");
const imageWidth = 1600;
const imageHeight = 900;
const slots = ["concept", "worked-example"];
const generatedAt = new Date().toISOString();

const questionPackPaths = [
  "coordination/content-qa/mainland-hjb-high-generated-bank-v1/question-pack.json",
  "coordination/content-qa/mainland-hjb-high-generated-bank-v2/question-pack.json",
  "coordination/content-qa/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json",
  "coordination/content-qa/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json"
];

const visualTemplates = [
  {
    match: /集合|逻辑/u,
    concept: {
      subject: "a large universe frame with two translucent overlapping sets, condition gates, boundary markers, and small abstract dots showing membership and logical condition filtering",
      alt: "Overlapping set regions inside a universe frame show membership, operations, and condition filtering.",
      altZh: "全集框中的重叠集合区域展示元素归属、集合运算和条件筛选。",
      caption: "Fix the universe first, then compare which region satisfies each condition.",
      captionZh: "先确定全集，再比较每个条件对应的区域。"
    },
    worked: {
      subject: "a set-operation workspace that narrows from a universe rectangle to an intersection region and then checks a complementary region with clean color overlays",
      alt: "A set-operation workspace narrows to an intersection region and checks the complement visually.",
      altZh: "集合运算工作区逐步缩小到交集区域，并用补集区域作目视检查。",
      caption: "Use the shared region and its complement to avoid reversing the condition.",
      captionZh: "用公共区域和补集一起检查，避免把条件方向弄反。"
    }
  },
  {
    match: /等式|不等式/u,
    concept: {
      subject: "a balanced scale, a number line split into solution intervals, and a softly drawn parabola crossing an axis to connect equality, inequality, roots, and sign regions",
      alt: "A balance scale, number line, and parabola connect equality, inequality, roots, and sign intervals.",
      altZh: "天平、数轴和抛物线把等式、不等式、根和符号区间联系起来。",
      caption: "Equivalent transformations must preserve the solution set and interval endpoints.",
      captionZh: "等价变形要保持解集和端点判断不变。"
    },
    worked: {
      subject: "a worked-example sign chart beside a parabola and interval rail, with endpoint dots and shaded valid regions but no readable formulas",
      alt: "A sign chart beside a parabola highlights endpoint choices and valid solution intervals.",
      altZh: "抛物线旁的符号表突出端点选择和有效解区间。",
      caption: "Mark roots, test intervals, then write only the regions that satisfy the inequality.",
      captionZh: "先标根，再测区间，最后只写满足不等式的部分。"
    }
  },
  {
    match: /幂函数|指数函数|对数函数/u,
    concept: {
      subject: "power, exponential, and logarithmic curves on one clean coordinate plane, with inverse-like mirroring, growth comparison bands, and domain-range cues",
      alt: "Power, exponential, and logarithmic curves compare growth, domain, range, and inverse structure.",
      altZh: "幂函数、指数函数和对数函数曲线比较增长、定义域、值域和互逆结构。",
      caption: "Compare function families by shape, domain, monotonicity, and transformation behavior.",
      captionZh: "比较函数族时，要同时看形状、定义域、单调性和变换。"
    },
    worked: {
      subject: "a graph-reading workspace matching curve shape to parameter cards and highlighted intervals, without any readable symbolic equations",
      alt: "A graph-reading workspace matches curve shapes with parameters and highlighted intervals.",
      altZh: "读图工作区把曲线形状、参数线索和高亮区间对应起来。",
      caption: "Move between graph features and symbolic choices by checking the same restriction twice.",
      captionZh: "在图像特征和式子选择之间转换时，要重复检查同一限制条件。"
    }
  },
  {
    match: /幂、指数与对数/u,
    concept: {
      subject: "stacked exponent tiles, radical blocks, and logarithm arrows that show reversible power-log relationships with domain and base-condition checkpoints",
      alt: "Exponent tiles, radical blocks, and logarithm arrows show reversible power-log relationships.",
      altZh: "指数方块、根式模块和对数箭头展示幂与对数的可逆关系。",
      caption: "Power and logarithm rules work only after checking base and domain conditions.",
      captionZh: "使用幂和对数法则前，必须先检查底数和定义域条件。"
    },
    worked: {
      subject: "a conversion board where exponent, radical, and logarithm forms are linked by arrows and checkpoint badges, with no actual textbook expressions",
      alt: "A conversion board links exponent, radical, and logarithm forms through reversible arrows.",
      altZh: "转换板用可逆箭头连接指数式、根式和对数式。",
      caption: "Rewrite one step at a time, and verify that each form keeps the same restriction.",
      captionZh: "每次只改写一步，并确认不同形式保留相同限制。"
    }
  },
  {
    match: /导数/u,
    concept: {
      subject: "a smooth function curve with moving tangent lines, slope arrows, local extrema markers, and interval behavior bands",
      alt: "A curve with tangent lines and extrema markers shows derivative slope and interval behavior.",
      altZh: "曲线、切线和极值标记展示导数斜率与区间变化。",
      caption: "A derivative turns local change into slope information that guides monotonicity and extrema.",
      captionZh: "导数把局部变化转化为斜率信息，用来判断单调性和极值。"
    },
    worked: {
      subject: "a derivative reasoning workspace moving from tangent slope signs to an interval chart and final curve-shape check",
      alt: "A derivative workspace moves from tangent-slope signs to an interval chart and curve check.",
      altZh: "导数工作区从切线斜率符号推进到区间表和曲线检查。",
      caption: "Use sign changes to locate behavior, then check the curve before concluding.",
      captionZh: "用符号变化定位函数行为，再用曲线检查结论。"
    }
  },
  {
    match: /函数/u,
    concept: {
      subject: "a function machine, input-output mapping dots, domain and range windows, monotonic intervals, and symmetry/parity cues on a graph",
      alt: "A function machine and graph windows show domain, range, monotonicity, and symmetry cues.",
      altZh: "函数机器和图像窗口展示定义域、值域、单调性和对称线索。",
      caption: "Start with the allowed inputs, then read how outputs behave across intervals.",
      captionZh: "先确定允许输入，再分区间读取输出怎样变化。"
    },
    worked: {
      subject: "a graph-reading board that highlights a valid input window, output heights, zero crossings, and interval arrows",
      alt: "A graph-reading board highlights input windows, output heights, zeros, and interval arrows.",
      altZh: "读图板突出输入范围、输出高度、零点和区间箭头。",
      caption: "Domain, zeros, and monotonicity should be checked as separate graph features.",
      captionZh: "定义域、零点和单调性要作为不同图像特征分别检查。"
    }
  },
  {
    match: /三角|三角函数/u,
    concept: {
      subject: "a unit circle linked to sine and cosine waveforms, with angle rotation, sign quadrants, period bands, and transformation handles",
      alt: "A unit circle links angle rotation to trigonometric waveforms, signs, and periods.",
      altZh: "单位圆把角的旋转与三角函数波形、符号和周期联系起来。",
      caption: "Use the unit circle to explain signs, reference angles, and periodic graph behavior.",
      captionZh: "用单位圆解释符号、参考角和图像周期。"
    },
    worked: {
      subject: "a trigonometry solution workspace that checks a highlighted angle on a unit circle against matching intervals on a waveform",
      alt: "A trigonometry workspace checks a unit-circle angle against highlighted waveform intervals.",
      altZh: "三角工作区把单位圆上的角与波形中的高亮区间互相检查。",
      caption: "Judge the sign and reference angle first, then use the period to complete the solution.",
      captionZh: "先判断符号和参考角，再利用周期补全解。"
    }
  },
  {
    match: /平面向量/u,
    concept: {
      subject: "directed arrows on a coordinate grid showing vector addition, decomposition, dot-product projection, and angle comparison through color and shadows",
      alt: "Directed grid arrows show vector addition, decomposition, projection, and angle comparison.",
      altZh: "坐标网格上的有向箭头展示向量加法、分解、投影和夹角比较。",
      caption: "Vector diagrams must preserve both length and direction before calculation.",
      captionZh: "向量图示在计算前必须同时保留长度和方向。"
    },
    worked: {
      subject: "a vector worked-example board decomposing one arrow into components, projecting onto another direction, and checking the dot-product sign visually",
      alt: "A vector board decomposes an arrow into components and checks projection direction.",
      altZh: "向量板把箭头分解为分量，并检查投影方向。",
      caption: "Break the vector into components before using projection or dot-product reasoning.",
      captionZh: "使用投影或数量积前，先把向量分解为清楚分量。"
    }
  },
  {
    match: /复数/u,
    concept: {
      subject: "a complex plane with real and imaginary axes, conjugate reflection, modulus circles, and arrow addition cues",
      alt: "A complex plane shows real-imaginary location, conjugate reflection, modulus circles, and arrows.",
      altZh: "复平面展示实部虚部定位、共轭反射、模长圆和箭头运算。",
      caption: "Complex numbers can be checked algebraically and geometrically on the same plane.",
      captionZh: "复数可以同时用代数运算和复平面几何来检查。"
    },
    worked: {
      subject: "a complex-number worked-example scene combining two arrows into a resulting point and reflecting it to verify conjugate behavior",
      alt: "A complex-plane worked example combines arrows and reflects a point to check conjugates.",
      altZh: "复平面例题把箭头合成为结果点，并通过反射检查共轭。",
      caption: "Track real and imaginary movement separately, then check the final point visually.",
      captionZh: "分别追踪实部和虚部移动，再用图像检查最终点。"
    }
  },
  {
    match: /空间直线|简单几何体|立体几何/u,
    concept: {
      subject: "transparent solids, planes, line segments, parallel-perpendicular cues, and distance markers in a clean spatial-geometry composition",
      alt: "Transparent solids and planes show line-plane relations, parallelism, perpendicularity, and distance cues.",
      altZh: "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。",
      caption: "Spatial geometry needs explicit line-plane relations, not only visual appearance.",
      captionZh: "立体几何要依据明确的线面关系推理，不能只凭外观。"
    },
    worked: {
      subject: "a spatial-geometry proof workspace adding an auxiliary plane and right-angle cue inside a transparent prism-like solid",
      alt: "A spatial-geometry workspace adds an auxiliary plane and right-angle cue inside a transparent solid.",
      altZh: "立体几何工作区在透明几何体内加入辅助平面和直角线索。",
      caption: "Add auxiliary planes or segments to turn spatial relations into visible arguments.",
      captionZh: "加入辅助平面或线段，把空间关系转化为可见论证。"
    }
  },
  {
    match: /空间向量/u,
    concept: {
      subject: "3D coordinate axes with spatial arrows, component shadows on coordinate planes, angle markers, and plane-normal cues",
      alt: "3D coordinate arrows and component shadows show spatial vectors, angles, and plane normals.",
      altZh: "三维坐标箭头和分量投影展示空间向量、夹角和平面法向量。",
      caption: "Spatial vectors translate geometry into coordinates, components, and products.",
      captionZh: "空间向量把几何关系转化为坐标、分量和数量积。"
    },
    worked: {
      subject: "a 3D vector workspace projecting an arrow onto coordinate planes and comparing it with a plane normal to check angle or distance",
      alt: "A 3D vector workspace projects an arrow and compares it with a plane normal.",
      altZh: "三维向量工作区投影箭头，并与平面法向量比较。",
      caption: "Use components and normal directions to check angle, distance, or perpendicularity.",
      captionZh: "用分量和法向方向检查夹角、距离或垂直关系。"
    }
  },
  {
    match: /概率/u,
    concept: {
      subject: "a sample-space grid with event regions, complement shading, tree-diagram branches, and a small simulation trail of random outcomes",
      alt: "A sample-space grid, event regions, branches, and simulation trail show probability structure.",
      altZh: "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。",
      caption: "Begin with the sample space, then describe events and their relationships.",
      captionZh: "先确定样本空间，再描述事件及其关系。"
    },
    worked: {
      subject: "a probability worked-example board that narrows from all outcomes to a highlighted event and checks complement or branch counts",
      alt: "A probability board narrows all outcomes to a highlighted event and checks complement counts.",
      altZh: "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。",
      caption: "List the possible outcomes first to avoid missing or double-counting favorable cases.",
      captionZh: "先列清所有可能结果，避免漏数或重复计数。"
    }
  },
  {
    match: /统计|成对数据/u,
    concept: {
      subject: "sample dots transforming into a histogram, box plot, scatter plot, and trend band, with center-spread and sampling-bias cues",
      alt: "Data points transform into distribution and scatter visuals to show center, spread, and trend.",
      altZh: "数据点转化为分布图和散点图，展示中心、离散和趋势。",
      caption: "Statistics turns data into evidence by describing distribution, spread, and relationship.",
      captionZh: "统计把数据转化为证据，要描述分布、离散和关系。"
    },
    worked: {
      subject: "a data-analysis workspace comparing two distributions and a paired-data scatter plot with a soft regression trend band",
      alt: "A data workspace compares distributions and a paired-data scatter plot with a trend band.",
      altZh: "数据工作区比较两个分布，并用趋势带分析成对数据散点图。",
      caption: "Compare shape and spread before making a conclusion from the data.",
      captionZh: "根据数据下结论前，要先比较形状和离散程度。"
    }
  },
  {
    match: /平面直角坐标系中的直线|解析几何直线/u,
    concept: {
      subject: "coordinate-plane lines with slope triangles, intercept markers, distance bands, and perpendicular-parallel cues",
      alt: "Coordinate lines with slope triangles and intercept markers show analytic-geometry structure.",
      altZh: "坐标直线、斜率三角形和截距标记展示解析几何结构。",
      caption: "Line problems become clearer when slope, intercept, distance, and position are separated.",
      captionZh: "直线问题要分清斜率、截距、距离和位置关系。"
    },
    worked: {
      subject: "an analytic-geometry workspace constructing a line from two points, then checking slope, intercept, and a perpendicular distance cue",
      alt: "An analytic-geometry workspace builds a line from points and checks slope and distance.",
      altZh: "解析几何工作区由点构造直线，并检查斜率和距离。",
      caption: "Translate geometric conditions into coordinate checks before solving.",
      captionZh: "求解前先把几何条件转化为坐标检查。"
    }
  },
  {
    match: /圆锥曲线/u,
    concept: {
      subject: "ellipse, parabola, and hyperbola outlines on a coordinate plane with focus-directrix and axis cues drawn as abstract guides",
      alt: "Conic outlines on a coordinate plane show axes, foci, and geometric constraints.",
      altZh: "坐标平面上的圆锥曲线轮廓展示轴、焦点和几何约束。",
      caption: "Conic sections connect equations with focus, axis, and distance relationships.",
      captionZh: "圆锥曲线把方程与焦点、轴和距离关系联系起来。"
    },
    worked: {
      subject: "a conic worked-example board highlighting one curve, its focus points, an axis line, and a coordinate-check panel without formulas",
      alt: "A conic workspace highlights one curve with focus points, an axis, and coordinate checks.",
      altZh: "圆锥曲线工作区突出一条曲线、焦点、轴线和坐标检查。",
      caption: "Identify the curve type and key elements before calculating parameters.",
      captionZh: "计算参数前，先判断曲线类型和关键元素。"
    }
  },
  {
    match: /数列/u,
    concept: {
      subject: "ordered sequence tiles, difference arrows, ratio arcs, partial-sum blocks, and a growth path across a clean horizontal timeline",
      alt: "Sequence tiles with difference arrows, ratio arcs, and sum blocks show ordered growth.",
      altZh: "数列方块、差分箭头、比值弧线和求和模块展示有序增长。",
      caption: "A sequence should be read by term position, change pattern, and sum structure.",
      captionZh: "数列要从项的位置、变化规律和求和结构来读。"
    },
    worked: {
      subject: "a sequence workspace extending a pattern from early terms to a general position and checking a partial-sum block model",
      alt: "A sequence workspace extends early terms to a general position and checks a sum model.",
      altZh: "数列工作区从前几项推广到一般位置，并检查求和模型。",
      caption: "Look for the recurrence or common change before writing a general rule.",
      captionZh: "写通项前，先寻找递推关系或共同变化。"
    }
  },
  {
    match: /计数/u,
    concept: {
      subject: "branching choices, grid arrangements, grouping boxes, and permutation-combination paths shown as abstract colored routes",
      alt: "Branching choices, arrangement grids, and grouping boxes show counting-principle structure.",
      altZh: "分步分支、排列网格和分组框展示计数原理结构。",
      caption: "Counting starts by deciding whether choices are ordered, grouped, or staged.",
      captionZh: "计数先要判断选择是有顺序、需分组，还是分步完成。"
    },
    worked: {
      subject: "a counting workspace that separates stages, blocks impossible paths, and compares ordered routes with unordered groups",
      alt: "A counting workspace separates stages and compares ordered routes with unordered groups.",
      altZh: "计数工作区分离步骤，并比较有序路径和无序分组。",
      caption: "Partition the cases cleanly so no outcome is missed or counted twice.",
      captionZh: "把情况划分清楚，才能避免遗漏或重复计数。"
    }
  }
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function loadRagCards() {
  const sourcePath = path.join(projectRoot, "data/rag/mainlandHjbHigh.ts");
  const source = readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require(specifier) {
      if (specifier === "@/types") return {};
      throw new Error(`Unexpected require while loading RAG cards: ${specifier}`);
    }
  };
  vm.runInNewContext(output, sandbox, { filename: sourcePath });
  return sandbox.exports.mainlandHjbHighRagCards ?? sandbox.module.exports.mainlandHjbHighRagCards;
}

function loadTopics() {
  const questions = questionPackPaths.flatMap((relativePath) => readJson(relativePath).questions ?? []);
  const topics = new Map();
  questions.forEach((question) => {
    const bucket = topics.get(question.topicId) ?? [];
    bucket.push(question);
    topics.set(question.topicId, bucket);
  });

  return Array.from(topics.entries())
    .sort((left, right) => {
      const leftQuestion = left[1][0];
      const rightQuestion = right[1][0];
      return leftQuestion.grade.localeCompare(rightQuestion.grade) || left[0].localeCompare(right[0], "zh-Hans");
    })
    .map(([topicId, topicQuestions]) => {
      const first = topicQuestions[0];
      return {
        id: topicId,
        grade: first.grade,
        titleZhHans: first.topicTitleZhHans,
        volume: first.volume,
        chapter: first.chapter,
        conceptIds: unique(topicQuestions.flatMap((question) => question.conceptIds ?? [])),
        evidenceCardIds: unique(topicQuestions.flatMap((question) => question.evidenceCardIds ?? [])),
        questionCount: topicQuestions.length
      };
    });
}

function templateForTopic(topic) {
  const haystack = `${topic.titleZhHans} ${topic.chapter}`;
  return visualTemplates.find((template) => template.match.test(haystack)) ?? visualTemplates.find((template) => /函数/u.test(template.match.source));
}

function englishTitle(topic, ragCards) {
  const source = ragCards[0]?.chapter ?? topic.chapter ?? topic.titleZhHans;
  const translations = new Map([
    ["集合与逻辑", "Sets and Logic"],
    ["等式与不等式", "Equations and Inequalities"],
    ["幂、指数与对数", "Powers, Exponents, and Logarithms"],
    ["幂函数、指数函数与对数函数", "Power, Exponential, and Logarithmic Functions"],
    ["函数的概念、性质及应用", "Function Concepts, Properties, and Applications"],
    ["三角", "Trigonometry"],
    ["三角函数", "Trigonometric Functions"],
    ["平面向量", "Plane Vectors"],
    ["复数", "Complex Numbers"],
    ["空间直线与平面", "Lines and Planes in Space"],
    ["简单几何体", "Basic Solid Geometry"],
    ["概率初步", "Introductory Probability"],
    ["统计", "Statistics"],
    ["平面直角坐标系中的直线", "Lines in the Coordinate Plane"],
    ["圆锥曲线", "Conic Sections"],
    ["空间向量及其应用", "Spatial Vectors and Applications"],
    ["数列", "Sequences"],
    ["导数及其运用", "Derivatives and Applications"],
    ["计数原理", "Counting Principles"],
    ["概率初步续", "Further Introductory Probability"],
    ["成对数据的统计分析", "Statistical Analysis of Paired Data"],
    ["跨册综合：三角向量解析几何", "Synthesis of Trigonometry, Vectors, and Analytic Geometry"],
    ["跨册综合：函数与导数", "Synthesis of Functions and Derivatives"],
    ["跨册综合：数列与计数", "Synthesis of Sequences and Counting"],
    ["跨册综合：概率统计", "Synthesis of Probability and Statistics"],
    ["跨册综合：立体几何与空间向量", "Synthesis of Solid Geometry and Spatial Vectors"]
  ]);
  return translations.get(source) ?? translations.get(topic.titleZhHans) ?? "HJB Senior Mathematics";
}

function generationPrompt(topic, slot, slotPlan, ragCards) {
  const safeSummary = ragCards.map((card) => card.safeSummary).filter(Boolean).slice(0, 3).join(" ");
  const concepts = topic.conceptIds.slice(0, 8).join(", ");
  const pitfalls = unique(ragCards.flatMap((card) => card.misconceptionTags ?? [])).slice(0, 5).join(", ");
  const role = slot === "concept" ? "core concept visual" : "worked-example visual support";

  return [
    "Use case: scientific-educational lesson illustration.",
    `Create a clean 16:9 MAIS math-learning ${role} for Shanghai Education Press high-school mathematics.`,
    `Topic: ${englishTitle(topic, ragCards)} / ${topic.titleZhHans}.`,
    `Visual focus: ${slotPlan.subject}.`,
    concepts ? `Safe RAG concept spine: ${concepts}.` : "",
    safeSummary ? `Safe RAG summary basis: ${safeSummary}` : "",
    pitfalls ? `Common misconception cues to avoid or clarify visually: ${pitfalls}.` : "",
    "Style: modern vector-like raster, crisp geometric forms, cyan/violet/emerald accents with restrained warm highlight, soft shadows, generous whitespace, suitable for a polished lesson page.",
    "Do not copy, reconstruct, or imitate Shanghai Education Press textbook pages, screenshots, diagrams, exercise layouts, worked examples, publisher marks, logos, or watermarks.",
    "No readable embedded text, no long formulas, no textbook page layout, no brand marks, no photo of printed material, no low-resolution artifacts."
  ].filter(Boolean).join(" ");
}

function buildIllustrations(topics, ragCardById) {
  return topics.flatMap((topic) => {
    const template = templateForTopic(topic);
    const ragCards = topic.evidenceCardIds.map((cardId) => ragCardById.get(cardId)).filter(Boolean);
    const cardsForPrompt = ragCards.length ? ragCards : [];

    return slots.map((slot) => {
      const slotPlan = slot === "concept" ? template.concept : template.worked;
      const id = `${topic.id}-${slot}`;
      const candidatePath = `${packageDir}/candidates/${topic.id}/${slot}.png`;

      return {
        id,
        topicId: topic.id,
        grade: topic.grade,
        titleZhHans: topic.titleZhHans,
        volume: topic.volume,
        chapter: topic.chapter,
        slot,
        reviewStatus: "pending",
        decision: "pending",
        srcAfterApproval: `/lesson-illustrations/mainland-hjb-high/${topic.id}/${slot}.png`,
        candidatePath,
        width: imageWidth,
        height: imageHeight,
        ragCardIds: topic.evidenceCardIds,
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
        generationPrompt: generationPrompt(topic, slot, slotPlan, cardsForPrompt),
        generator: "Codex built-in image_gen after bl unavailable; intended model path GPT Image2-style review generation"
      };
    });
  });
}

function pngDimensions(filePath) {
  if (!existsSync(filePath)) return null;
  const buffer = readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function imageMarkdown(illustration) {
  const relative = `candidates/${illustration.topicId}/${illustration.slot}.png`;
  return [
    `### ${illustration.topicId} / ${illustration.slot}`,
    "",
    `![${illustration.id}](${relative})`,
    "",
    `- ID: \`${illustration.id}\``,
    `- Status: \`${illustration.reviewStatus}\``,
    `- Grade: \`${illustration.grade}\``,
    `- Volume: ${illustration.volume}`,
    `- Chapter: ${illustration.chapter}`,
    `- RAG cards: \`${illustration.ragCardIds.join("`, `")}\``,
    `- Alt zh-Hans: ${illustration.alt.zhHans}`,
    `- Caption zh-Hans: ${illustration.caption.zhHans}`,
    ""
  ].join("\n");
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function imageCardHtml(illustration) {
  const relative = `candidates/${illustration.topicId}/${illustration.slot}.png`;
  return `
    <article class="card">
      <img src="${htmlEscape(relative)}" alt="${htmlEscape(illustration.alt.zhHans)}" loading="lazy">
      <div class="body">
        <h2>${htmlEscape(illustration.topicId)} <span>${htmlEscape(illustration.slot)}</span></h2>
        <p>${htmlEscape(illustration.caption.zhHans)}</p>
        <dl>
          <dt>ID</dt><dd><code>${htmlEscape(illustration.id)}</code></dd>
          <dt>Status</dt><dd><code>${htmlEscape(illustration.reviewStatus)}</code></dd>
          <dt>Grade</dt><dd>${htmlEscape(illustration.grade)}</dd>
          <dt>Volume</dt><dd>${htmlEscape(illustration.volume)}</dd>
          <dt>Chapter</dt><dd>${htmlEscape(illustration.chapter)}</dd>
          <dt>RAG</dt><dd>${htmlEscape(illustration.ragCardIds.join(" | "))}</dd>
        </dl>
      </div>
    </article>`;
}

function writeReviewFiles(plan) {
  mkdirSync(candidatesDir, { recursive: true });
  plan.illustrations.forEach((illustration) => {
    mkdirSync(path.join(candidatesDir, illustration.topicId), { recursive: true });
  });

  writeFileSync(path.join(__dirname, "illustration-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);

  const csvHeader = [
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
  const rows = plan.illustrations.map((illustration) => [
    illustration.id,
    illustration.topicId,
    illustration.slot,
    illustration.reviewStatus,
    illustration.decision,
    illustration.candidatePath,
    illustration.srcAfterApproval,
    illustration.alt.zhHans,
    illustration.caption.zhHans,
    illustration.ragCardIds,
    ""
  ].map(csvCell).join(","));
  writeFileSync(path.join(__dirname, "manual-review.csv"), `${csvHeader.join(",")}\n${rows.join("\n")}\n`);

  const indexMarkdown = [
    "# Mainland HJB High Lesson Illustrations V1 Review",
    "",
    `- Generated at: ${plan.generatedAt}`,
    "- Generator: Codex built-in image generation after `bl` reported no DashScope API key in the shell.",
    "- Scope: 30 Mainland HJB high-school lessons, 2 candidates per lesson.",
    "- Production status: Not integrated. These assets remain review-only until manual approval is recorded.",
    "- Review statuses: all 60 candidates start as `pending`.",
    "",
    "## Review Criteria",
    "",
    "- Mathematical correctness and fit to the HJB lesson objective.",
    "- No copied textbook/page/screenshot look, publisher marks, logos, or watermarks.",
    "- No wrong formulas, unreadable text, stray labels, or misleading geometry/data encoding.",
    "- Clear student learning value and accurate alt/caption text.",
    "",
    "## Candidates",
    "",
    ...plan.illustrations.map(imageMarkdown)
  ].join("\n");
  writeFileSync(path.join(__dirname, "index.md"), indexMarkdown);

  const indexHtml = `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mainland HJB High Lesson Illustrations V1 Review</title>
  <style>
    :root { color-scheme: light dark; --bg: #f8fafc; --ink: #0f172a; --muted: #64748b; --line: #dbeafe; --card: rgba(255,255,255,.84); --accent: #0891b2; }
    @media (prefers-color-scheme: dark) { :root { --bg: #020617; --ink: #e5edf7; --muted: #94a3b8; --line: rgba(125,211,252,.22); --card: rgba(15,23,42,.86); --accent: #67e8f9; } }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { max-width: 1180px; margin: 0 auto; padding: 32px 20px 18px; }
    h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 48px); line-height: 1.05; }
    .summary { color: var(--muted); max-width: 900px; }
    main { max-width: 1180px; margin: 0 auto; padding: 0 20px 40px; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .card { overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: var(--card); box-shadow: 0 18px 44px rgba(15,23,42,.08); }
    .card img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: rgba(8,145,178,.08); }
    .body { padding: 16px; }
    h2 { margin: 0 0 8px; font-size: 16px; line-height: 1.3; }
    h2 span { color: var(--accent); }
    p { margin: 0 0 12px; color: var(--muted); }
    dl { display: grid; grid-template-columns: 70px 1fr; gap: 6px 10px; margin: 0; }
    dt { color: var(--muted); font-weight: 700; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
  </style>
</head>
<body>
  <header>
    <h1>Mainland HJB High Lesson Illustrations V1 Review</h1>
    <p class="summary">60 review-only candidates for 30 Shanghai Education Press high-school math lessons. Production integration remains blocked until manual approval is recorded in <code>manual-review.csv</code>.</p>
  </header>
  <main>
    ${plan.illustrations.map(imageCardHtml).join("\n")}
  </main>
</body>
</html>`;
  writeFileSync(path.join(__dirname, "index.html"), indexHtml);
}

function buildValidationReport(plan) {
  const missingCandidates = [];
  const wrongDimensions = [];

  plan.illustrations.forEach((illustration) => {
    const absolute = path.join(projectRoot, illustration.candidatePath);
    const dimensions = pngDimensions(absolute);
    if (!dimensions) {
      missingCandidates.push(illustration.candidatePath);
      return;
    }
    if (dimensions.width !== imageWidth || dimensions.height !== imageHeight) {
      wrongDimensions.push({
        candidatePath: illustration.candidatePath,
        width: dimensions.width,
        height: dimensions.height
      });
    }
  });

  return {
    generatedAt,
    expectedCandidates: plan.illustrations.length,
    existingCandidates: plan.illustrations.length - missingCandidates.length,
    missingCandidates,
    wrongDimensions,
    productionIntegrated: false,
    publicAssetRoot: "/lesson-illustrations/mainland-hjb-high",
    approvedCandidates: 0
  };
}

const topics = loadTopics();
const ragCards = loadRagCards();
const ragCardById = new Map(ragCards.map((card) => [card.id, card]));
const illustrations = buildIllustrations(topics, ragCardById);
const plan = {
  version: "mainland-hjb-high-illustrations-v1",
  scope: "MAINLAND_HJB_HIGH",
  model: "gpt-image-2-review-workflow; generated via Codex built-in image_gen after bl auth unavailable",
  size: {
    width: imageWidth,
    height: imageHeight
  },
  reviewStatus: "pending-review",
  productionIntegrated: false,
  generationPolicy: [
    "Use MAIS safe-RAG abstractions only.",
    "Do not copy, reconstruct, or imitate textbook screenshots, page layouts, figures, or publisher visual style.",
    "Generate fresh MAIS-authored educational visuals with no logos, no watermarks, and no embedded textbook text.",
    "Avoid in-image formulas and labels where possible; learner-facing wording belongs in captions and alt text."
  ],
  topics: topics.map((topic) => ({
    id: topic.id,
    grade: topic.grade,
    titleZhHans: topic.titleZhHans,
    volume: topic.volume,
    chapter: topic.chapter,
    conceptIds: topic.conceptIds,
    evidenceCardIds: topic.evidenceCardIds,
    questionCount: topic.questionCount
  })),
  illustrations,
  generator: "S05 Codex",
  generatedAt,
  summary: {
    topicCount: topics.length,
    candidateCount: illustrations.length,
    slots
  }
};

writeReviewFiles(plan);
const validationReport = buildValidationReport(plan);
writeFileSync(path.join(__dirname, "validation-report.json"), `${JSON.stringify(validationReport, null, 2)}\n`);

if (topics.length !== 30) {
  throw new Error(`Expected 30 HJB high topics, found ${topics.length}`);
}
if (illustrations.length !== 60) {
  throw new Error(`Expected 60 HJB high illustration rows, found ${illustrations.length}`);
}
if (validationReport.missingCandidates.length || validationReport.wrongDimensions.length) {
  console.log(JSON.stringify(validationReport, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(validationReport, null, 2));
}
