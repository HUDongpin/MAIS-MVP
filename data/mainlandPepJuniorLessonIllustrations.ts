import type { LocalizedText } from "@/types";

export type MainlandPepJuniorLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandPepJuniorLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandPepJuniorLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

export const mainlandPepJuniorLessonIllustrations = [
  {
    "id": "pep-junior-s1-upper-rational-numbers-concept",
    "topicId": "pep-junior-s1-upper-rational-numbers",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-rational-numbers/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A number line expands from zero with positive and negative direction, opposite-number mirror points, and distance-from-zero cues highlighted by color.",
      "zh": "数轴以零为中心展开，正负方向、相反数镜像点和到零的距离被不同颜色突出。",
      "zhHans": "数轴以零为中心展开，正负方向、相反数镜像点和到零的距离被不同颜色突出。"
    },
    "caption": {
      "en": "Rational-number reasoning starts by placing direction, position, and distance on one number line.",
      "zh": "有理数学习先把方向、位置和距离放在同一条数轴上理解。",
      "zhHans": "有理数学习先把方向、位置和距离放在同一条数轴上理解。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-rational-numbers"
    ]
  },
  {
    "id": "pep-junior-s1-upper-rational-numbers-worked-example",
    "topicId": "pep-junior-s1-upper-rational-numbers",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-rational-numbers/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A number-line operation workspace uses curved movement arrows to show the start, direction changes, final point, and distance checks.",
      "zh": "数轴运算工作区用弧形移动箭头表示起点、方向变化、终点和距离检查。",
      "zhHans": "数轴运算工作区用弧形移动箭头表示起点、方向变化、终点和距离检查。"
    },
    "caption": {
      "en": "Track movement direction first, then check the operation with distance from zero and the final position.",
      "zh": "先看移动方向，再用离零距离和终点位置检查有理数运算。",
      "zhHans": "先看移动方向，再用离零距离和终点位置检查有理数运算。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-rational-numbers"
    ]
  },
  {
    "id": "pep-junior-s1-upper-expressions-linear-equations-concept",
    "topicId": "pep-junior-s1-upper-expressions-linear-equations",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-expressions-linear-equations/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Blank algebra tiles sit on both sides of a balance, with same-color groups showing quantity expressions and equation balance.",
      "zh": "天平两侧放置空白代数块，同色块成组，显示数量表达和方程平衡关系。",
      "zhHans": "天平两侧放置空白代数块，同色块成组，显示数量表达和方程平衡关系。"
    },
    "caption": {
      "en": "When letters represent quantities, identify like structures first and preserve balance on both sides.",
      "zh": "用字母表示数量时，先看同类结构，再保持等式两边平衡。",
      "zhHans": "用字母表示数量时，先看同类结构，再保持等式两边平衡。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-expressions-linear-equations"
    ]
  },
  {
    "id": "pep-junior-s1-upper-expressions-linear-equations-worked-example",
    "topicId": "pep-junior-s1-upper-expressions-linear-equations",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-expressions-linear-equations/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A visual equation-solving flow removes matching blank blocks from both sides and leaves the unknown block matched to unit blocks.",
      "zh": "解方程视觉流程展示两边同时移去相同空白块，最后留下未知块与单位块的对应。",
      "zhHans": "解方程视觉流程展示两边同时移去相同空白块，最后留下未知块与单位块的对应。"
    },
    "caption": {
      "en": "The key to solving a one-variable linear equation is making the same change to both sides at each step.",
      "zh": "解一元一次方程的关键是每一步都对等式两边做相同改变。",
      "zhHans": "解一元一次方程的关键是每一步都对等式两边做相同改变。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-expressions-linear-equations"
    ]
  },
  {
    "id": "pep-junior-s1-upper-geometric-figures-concept",
    "topicId": "pep-junior-s1-upper-geometric-figures",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-geometric-figures/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Points, lines, rays, segments, angles, and translucent solids are arranged as a map of basic geometric objects.",
      "zh": "点、线、射线、线段、角和透明立体图形被排列成几何对象学习图。",
      "zhHans": "点、线、射线、线段、角和透明立体图形被排列成几何对象学习图。"
    },
    "caption": {
      "en": "Geometric reasoning begins with precise objects and definitions, not appearance alone.",
      "zh": "几何推理从准确识别对象和定义开始，而不是只凭图形外观判断。",
      "zhHans": "几何推理从准确识别对象和定义开始，而不是只凭图形外观判断。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-geometric-figures"
    ]
  },
  {
    "id": "pep-junior-s1-upper-geometric-figures-worked-example",
    "topicId": "pep-junior-s1-upper-geometric-figures",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-upper-geometric-figures/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A construction-checking workspace shows segment endpoints, compass arcs, angle arcs, and length-comparison cues.",
      "zh": "几何作图检查区展示线段端点、圆规弧迹、角度弧和长度比较线索。",
      "zhHans": "几何作图检查区展示线段端点、圆规弧迹、角度弧和长度比较线索。"
    },
    "caption": {
      "en": "When comparing segments or angles, let measurement and construction evidence support the conclusion.",
      "zh": "比较线段或角时，要让测量和作图证据支持结论。",
      "zhHans": "比较线段或角时，要让测量和作图证据支持结论。"
    },
    "ragCardIds": [
      "pep-junior-s1-upper-geometric-figures"
    ]
  },
  {
    "id": "pep-junior-s1-lower-lines-coordinates-concept",
    "topicId": "pep-junior-s1-lower-lines-coordinates",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-lower-lines-coordinates/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Parallel lines cut by a transversal highlight angle relationships beside a coordinate grid showing horizontal and vertical point movement.",
      "zh": "平行线被截线穿过并高亮角关系，旁边坐标网格展示点的水平和竖直移动。",
      "zhHans": "平行线被截线穿过并高亮角关系，旁边坐标网格展示点的水平和竖直移动。"
    },
    "caption": {
      "en": "Angle relationships require line conditions, while coordinate movement separates horizontal and vertical change.",
      "zh": "角关系需要线的位置条件，坐标移动需要分清横向和纵向变化。",
      "zhHans": "角关系需要线的位置条件，坐标移动需要分清横向和纵向变化。"
    },
    "ragCardIds": [
      "pep-junior-s1-lower-lines-coordinates"
    ]
  },
  {
    "id": "pep-junior-s1-lower-lines-coordinates-worked-example",
    "topicId": "pep-junior-s1-lower-lines-coordinates",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-lower-lines-coordinates/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual places corresponding angle arcs beside coordinate point movement, using color to separate angle conditions from position change.",
      "zh": "例题图把同位角弧与坐标点移动并列，用颜色区分角条件和位置变化。",
      "zhHans": "例题图把同位角弧与坐标点移动并列，用颜色区分角条件和位置变化。"
    },
    "caption": {
      "en": "Confirm the parallel condition before reading angles, then separate horizontal and vertical movement.",
      "zh": "先确认平行条件，再读角；先看横向移动，再看竖向移动。",
      "zhHans": "先确认平行条件，再读角；先看横向移动，再看竖向移动。"
    },
    "ragCardIds": [
      "pep-junior-s1-lower-lines-coordinates"
    ]
  },
  {
    "id": "pep-junior-s1-lower-equations-inequalities-data-concept",
    "topicId": "pep-junior-s1-lower-equations-inequalities-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-lower-equations-inequalities-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Two constraint paths meet at a shared point, with an inequality interval and data-dot cloud showing models, solution sets, and data judgment.",
      "zh": "两个约束路径汇合到公共点，不等式区间和数据点云并列显示模型、解集与数据判断。",
      "zhHans": "两个约束路径汇合到公共点，不等式区间和数据点云并列显示模型、解集与数据判断。"
    },
    "caption": {
      "en": "Systems, inequalities, and data analysis all ask what the conditions can justify.",
      "zh": "方程组、不等式和数据分析都在回答条件能支持什么结论。",
      "zhHans": "方程组、不等式和数据分析都在回答条件能支持什么结论。"
    },
    "ragCardIds": [
      "pep-junior-s1-lower-equations-inequalities-data"
    ]
  },
  {
    "id": "pep-junior-s1-lower-equations-inequalities-data-worked-example",
    "topicId": "pep-junior-s1-lower-equations-inequalities-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s1-lower-equations-inequalities-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A problem workspace shows constraints narrowing, boundary points checked, and data dots grouped into a reasonable conclusion.",
      "zh": "解题工作区展示约束收窄、边界点检查和数据点分组形成合理结论。",
      "zhHans": "解题工作区展示约束收窄、边界点检查和数据点分组形成合理结论。"
    },
    "caption": {
      "en": "Define constraints first, check boundaries, then keep data conclusions within the evidence.",
      "zh": "先定义限制条件，再检查边界，最后让数据结论不过度延伸。",
      "zhHans": "先定义限制条件，再检查边界，最后让数据结论不过度延伸。"
    },
    "ragCardIds": [
      "pep-junior-s1-lower-equations-inequalities-data"
    ]
  },
  {
    "id": "pep-junior-s2-upper-triangles-congruence-concept",
    "topicId": "pep-junior-s2-upper-triangles-congruence",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-upper-triangles-congruence/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Two triangles are connected by matching side and angle colors, with an axis-symmetric figure showing reflection and corresponding points.",
      "zh": "两个三角形用对应边角颜色连接，旁边轴对称图形展示镜像和对应点。",
      "zhHans": "两个三角形用对应边角颜色连接，旁边轴对称图形展示镜像和对应点。"
    },
    "caption": {
      "en": "Congruence and symmetry both require identifying correspondences before using properties or criteria.",
      "zh": "全等和对称都要先找清楚对应关系，再使用性质或判定。",
      "zhHans": "全等和对称都要先找清楚对应关系，再使用性质或判定。"
    },
    "ragCardIds": [
      "pep-junior-s2-upper-triangles-congruence"
    ]
  },
  {
    "id": "pep-junior-s2-upper-triangles-congruence-worked-example",
    "topicId": "pep-junior-s2-upper-triangles-congruence",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-upper-triangles-congruence/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A proof visual marks corresponding sides and angles in triangles sharing a side, with a fold line suggesting symmetry.",
      "zh": "证明示意图在共享边三角形中标出对应边和角，并用折叠线提示对称关系。",
      "zhHans": "证明示意图在共享边三角形中标出对应边和角，并用折叠线提示对称关系。"
    },
    "caption": {
      "en": "Before writing proof, confirm corresponding vertices, parts, and sufficient criteria.",
      "zh": "写证明前，先确认对应顶点、对应边角和足够的判定条件。",
      "zhHans": "写证明前，先确认对应顶点、对应边角和足够的判定条件。"
    },
    "ragCardIds": [
      "pep-junior-s2-upper-triangles-congruence"
    ]
  },
  {
    "id": "pep-junior-s2-upper-polynomials-fractions-concept",
    "topicId": "pep-junior-s2-upper-polynomials-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-upper-polynomials-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Blank colored rectangles move from an area model into grouped structures, with matching upper and lower blocks suggesting simplification.",
      "zh": "空白彩色矩形块从面积模型重组为分组结构，并显示上下匹配块的约分线索。",
      "zhHans": "空白彩色矩形块从面积模型重组为分组结构，并显示上下匹配块的约分线索。"
    },
    "caption": {
      "en": "Polynomial operations and fraction simplification both begin with structure before symbols.",
      "zh": "整式运算和分式化简都要先看结构，再进行符号运算。",
      "zhHans": "整式运算和分式化简都要先看结构，再进行符号运算。"
    },
    "ragCardIds": [
      "pep-junior-s2-upper-polynomials-fractions"
    ]
  },
  {
    "id": "pep-junior-s2-upper-polynomials-fractions-worked-example",
    "topicId": "pep-junior-s2-upper-polynomials-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-upper-polynomials-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual shows expanded blocks, common groups, matching blocks canceled, and a visual reminder about denominator restrictions.",
      "zh": "例题图展示展开块、共同分组、匹配块消去和分母限制的视觉提醒。",
      "zhHans": "例题图展示展开块、共同分组、匹配块消去和分母限制的视觉提醒。"
    },
    "caption": {
      "en": "Factorization should be checked by expansion, and fraction equations require restriction checks.",
      "zh": "因式分解要能反向展开检查，分式方程还要检查限制条件。",
      "zhHans": "因式分解要能反向展开检查，分式方程还要检查限制条件。"
    },
    "ragCardIds": [
      "pep-junior-s2-upper-polynomials-fractions"
    ]
  },
  {
    "id": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals-concept",
    "topicId": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-lower-roots-pythagorean-quadrilaterals/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A right triangle has translucent side-area squares, with overlapping parallelogram and special quadrilateral shapes nearby.",
      "zh": "直角三角形三边附着半透明面积方块，旁边叠放平行四边形和特殊四边形。",
      "zhHans": "直角三角形三边附着半透明面积方块，旁边叠放平行四边形和特殊四边形。"
    },
    "caption": {
      "en": "Exact lengths, right-triangle conditions, and quadrilateral classification should support each other rather than rely on appearance.",
      "zh": "精确长度、直角条件和四边形分类要互相支持，而不能只凭图像猜测。",
      "zhHans": "精确长度、直角条件和四边形分类要互相支持，而不能只凭图像猜测。"
    },
    "ragCardIds": [
      "pep-junior-s2-lower-roots-pythagorean-quadrilaterals"
    ]
  },
  {
    "id": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals-worked-example",
    "topicId": "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-lower-roots-pythagorean-quadrilaterals/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual highlights a hypotenuse on a grid and uses parallel-side and diagonal cues to check quadrilateral properties.",
      "zh": "例题图在网格中高亮直角三角形斜边，并用平行边和对角线检查四边形性质。",
      "zhHans": "例题图在网格中高亮直角三角形斜边，并用平行边和对角线检查四边形性质。"
    },
    "caption": {
      "en": "Confirm the right angle before using Pythagorean reasoning, and confirm the quadrilateral class before using its properties.",
      "zh": "用勾股关系前先确认直角，用四边形性质前先确认所属类别。",
      "zhHans": "用勾股关系前先确认直角，用四边形性质前先确认所属类别。"
    },
    "ragCardIds": [
      "pep-junior-s2-lower-roots-pythagorean-quadrilaterals"
    ]
  },
  {
    "id": "pep-junior-s2-lower-linear-functions-data-concept",
    "topicId": "pep-junior-s2-lower-linear-functions-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-lower-linear-functions-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Blank dot arrays, a rising line, a motion path, and a data cloud connect tables, graphs, contexts, and statistical summaries.",
      "zh": "空白点阵、上升直线、运动路径和数据点云相连，展示表、图、情境和统计概括的转换。",
      "zhHans": "空白点阵、上升直线、运动路径和数据点云相连，展示表、图、情境和统计概括的转换。"
    },
    "caption": {
      "en": "Linear functions require translation among representations, while data analysis reads center and spread.",
      "zh": "一次函数要在表、式、图和情境之间互相解释，数据分析要看中心和离散。",
      "zhHans": "一次函数要在表、式、图和情境之间互相解释，数据分析要看中心和离散。"
    },
    "ragCardIds": [
      "pep-junior-s2-lower-linear-functions-data"
    ]
  },
  {
    "id": "pep-junior-s2-lower-linear-functions-data-worked-example",
    "topicId": "pep-junior-s2-lower-linear-functions-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s2-lower-linear-functions-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual highlights two points on a line, a slope staircase, a point check, and data-summary markers.",
      "zh": "例题图突出直线上的两个点、斜率阶梯、点的检验和数据摘要标记。",
      "zhHans": "例题图突出直线上的两个点、斜率阶梯、点的检验和数据摘要标记。"
    },
    "caption": {
      "en": "Read rate of change first, check point membership, then choose a fitting data summary.",
      "zh": "读一次函数时先看变化率，再检查点是否符合关系；读数据时选择合适的代表值。",
      "zhHans": "读一次函数时先看变化率，再检查点是否符合关系；读数据时选择合适的代表值。"
    },
    "ragCardIds": [
      "pep-junior-s2-lower-linear-functions-data"
    ]
  },
  {
    "id": "pep-junior-s3-upper-quadratics-circle-probability-concept",
    "topicId": "pep-junior-s3-upper-quadratics-circle-probability",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s3-upper-quadratics-circle-probability/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A parabola with vertex and symmetry cues, circle chord-arc relationships, and a probability sample-space array form a synthesis visual.",
      "zh": "抛物线顶点和对称线索、圆的弦弧关系以及概率样本空间点阵组合成综合图。",
      "zhHans": "抛物线顶点和对称线索、圆的弦弧关系以及概率样本空间点阵组合成综合图。"
    },
    "caption": {
      "en": "Quadratic models, circle relations, and probability models all turn visual features into reasoning evidence.",
      "zh": "二次模型、圆的关系和概率模型都需要把图形特征转化为推理依据。",
      "zhHans": "二次模型、圆的关系和概率模型都需要把图形特征转化为推理依据。"
    },
    "ragCardIds": [
      "pep-junior-s3-upper-quadratics-circle-probability"
    ]
  },
  {
    "id": "pep-junior-s3-upper-quadratics-circle-probability-worked-example",
    "topicId": "pep-junior-s3-upper-quadratics-circle-probability",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s3-upper-quadratics-circle-probability/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual places key parabola points, related circle arcs, and grouped equally likely regions side by side.",
      "zh": "例题图把抛物线关键点、圆中相关角弧和等可能区域分组并列呈现。",
      "zhHans": "例题图把抛物线关键点、圆中相关角弧和等可能区域分组并列呈现。"
    },
    "caption": {
      "en": "For synthesis problems, extract graph features first, then state the circle relation and complete sample space.",
      "zh": "综合题要先提取图像特征，再说明圆的关系和完整样本空间。",
      "zhHans": "综合题要先提取图像特征，再说明圆的关系和完整样本空间。"
    },
    "ragCardIds": [
      "pep-junior-s3-upper-quadratics-circle-probability"
    ]
  },
  {
    "id": "pep-junior-s3-lower-inverse-similarity-trigonometry-concept",
    "topicId": "pep-junior-s3-lower-inverse-similarity-trigonometry",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s3-lower-inverse-similarity-trigonometry/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An inverse-proportion curve, scaled similar triangles, and color-coded right-triangle side-angle cues show proportional measurement.",
      "zh": "反比例曲线、相似三角形缩放箭头和直角三角形边角颜色线索共同展示比例测量。",
      "zhHans": "反比例曲线、相似三角形缩放箭头和直角三角形边角颜色线索共同展示比例测量。"
    },
    "caption": {
      "en": "Proportional relationships transfer across function graphs, similar figures, and right-triangle measurement.",
      "zh": "比例关系可以在函数图像、相似图形和直角三角形测量中互相迁移。",
      "zhHans": "比例关系可以在函数图像、相似图形和直角三角形测量中互相迁移。"
    },
    "ragCardIds": [
      "pep-junior-s3-lower-inverse-similarity-trigonometry"
    ]
  },
  {
    "id": "pep-junior-s3-lower-inverse-similarity-trigonometry-worked-example",
    "topicId": "pep-junior-s3-lower-inverse-similarity-trigonometry",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-junior/pep-junior-s3-lower-inverse-similarity-trigonometry/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked visual shows two similar measurement triangles, a scale bridge, a selected point on an inverse curve, and right-triangle side-angle relations.",
      "zh": "例题图展示两个相似测量三角形、比例桥、反比例曲线上选点和直角三角形边角关系。",
      "zhHans": "例题图展示两个相似测量三角形、比例桥、反比例曲线上选点和直角三角形边角关系。"
    },
    "caption": {
      "en": "For measurement problems, find similarity or proportion first, then choose the correct side-angle relationship.",
      "zh": "解决测量问题时，先找相似或比例，再选择正确的边角关系。",
      "zhHans": "解决测量问题时，先找相似或比例，再选择正确的边角关系。"
    },
    "ragCardIds": [
      "pep-junior-s3-lower-inverse-similarity-trigonometry"
    ]
  }
] satisfies MainlandPepJuniorLessonIllustration[];

const mainlandPepJuniorLessonIllustrationByTopicAndSlot = new Map(
  mainlandPepJuniorLessonIllustrations.map((illustration) => [
    `${illustration.topicId}:${illustration.slot}`,
    illustration
  ])
);

export function getMainlandPepJuniorLessonIllustration(
  topicId: string,
  slot: MainlandPepJuniorLessonIllustrationSlot
) {
  return mainlandPepJuniorLessonIllustrationByTopicAndSlot.get(`${topicId}:${slot}`) ?? null;
}
