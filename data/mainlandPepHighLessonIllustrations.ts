import type { LocalizedText } from "@/types";

export type MainlandPepHighLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandPepHighLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandPepHighLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

export const mainlandPepHighLessonIllustrations = [
  {
    "id": "pep-high-s4-complex-numbers-concept",
    "topicId": "pep-high-s4-complex-numbers",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-complex-numbers/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "The complex plane is shown as a horizontal-real and vertical-imaginary grid with points, modulus circles, and conjugate symmetry.",
      "zh": "复平面以横向实部和纵向虚部网格呈现，含点、模长圆和共轭对称。",
      "zhHans": "复平面以横向实部和纵向虚部网格呈现，含点、模长圆和共轭对称。"
    },
    "caption": {
      "en": "Complex numbers can be calculated algebraically and located geometrically.",
      "zh": "复数既能进行代数运算，也能在复平面中定位。",
      "zhHans": "复数既能进行代数运算，也能在复平面中定位。"
    },
    "ragCardIds": [
      "pep-high-complex-numbers"
    ]
  },
  {
    "id": "pep-high-s4-complex-numbers-worked-example",
    "topicId": "pep-high-s4-complex-numbers",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-complex-numbers/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked-example visual shows two complex-plane arrows combining into a resulting point with a conjugate reflection check.",
      "zh": "复数例题图展示两个复平面箭头合成为结果点，并用共轭反射检查。",
      "zhHans": "复数例题图展示两个复平面箭头合成为结果点，并用共轭反射检查。"
    },
    "caption": {
      "en": "Track real and imaginary movement separately, then check the final point visually.",
      "zh": "分别追踪实部和虚部移动，再用图像检查最终点。",
      "zhHans": "分别追踪实部和虚部移动，再用图像检查最终点。"
    },
    "ragCardIds": [
      "pep-high-complex-numbers"
    ]
  },
  {
    "id": "pep-high-s4-exp-log-concept",
    "topicId": "pep-high-s4-exp-log",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-exp-log/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Exponential growth and logarithmic growth curves appear as inverse-looking paths around a diagonal mirror.",
      "zh": "指数增长和对数增长曲线围绕一条对角镜像线呈现互逆关系。",
      "zhHans": "指数增长和对数增长曲线围绕一条对角镜像线呈现互逆关系。"
    },
    "caption": {
      "en": "Exponential and logarithmic functions are best compared through growth shape and inverse structure.",
      "zh": "比较指数与对数函数，要同时看增长形状和互逆结构。",
      "zhHans": "比较指数与对数函数，要同时看增长形状和互逆结构。"
    },
    "ragCardIds": [
      "pep-high-exponential-logarithmic-functions"
    ]
  },
  {
    "id": "pep-high-s4-exp-log-worked-example",
    "topicId": "pep-high-s4-exp-log",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-exp-log/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A conversion workspace links an exponential curve, a logarithmic curve, and matching points through color-coded arrows.",
      "zh": "转换工作区用彩色箭头连接指数曲线、对数曲线和对应点。",
      "zhHans": "转换工作区用彩色箭头连接指数曲线、对数曲线和对应点。"
    },
    "caption": {
      "en": "Move between forms by matching the same relationship from two viewpoints.",
      "zh": "指数式与对数式转换，本质是从两个视角看同一关系。",
      "zhHans": "指数式与对数式转换，本质是从两个视角看同一关系。"
    },
    "ragCardIds": [
      "pep-high-exponential-logarithmic-functions"
    ]
  },
  {
    "id": "pep-high-s4-function-properties-concept",
    "topicId": "pep-high-s4-function-properties",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-function-properties/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A function machine maps each input point to one output while a curve shows domain, range, monotonicity, and symmetry cues.",
      "zh": "函数机器把每个输入对应到一个输出，旁边曲线展示定义域、值域、单调性和对称线索。",
      "zhHans": "函数机器把每个输入对应到一个输出，旁边曲线展示定义域、值域、单调性和对称线索。"
    },
    "caption": {
      "en": "A function is a rule with one output for each allowed input, then its graph reveals behavior.",
      "zh": "函数先是每个允许输入对应唯一输出的规则，再由图像观察性质。",
      "zhHans": "函数先是每个允许输入对应唯一输出的规则，再由图像观察性质。"
    },
    "ragCardIds": [
      "pep-high-function-concepts-properties",
      "pep-high-function-zero-modeling"
    ]
  },
  {
    "id": "pep-high-s4-function-properties-worked-example",
    "topicId": "pep-high-s4-function-properties",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-function-properties/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A graph-reading workspace highlights a valid input window, output heights, and monotonic intervals.",
      "zh": "读图工作区突出有效输入范围、输出高度和单调区间。",
      "zhHans": "读图工作区突出有效输入范围、输出高度和单调区间。"
    },
    "caption": {
      "en": "Read the domain first, then describe how the output changes across intervals.",
      "zh": "先读定义域，再分区间描述函数值怎样变化。",
      "zhHans": "先读定义域，再分区间描述函数值怎样变化。"
    },
    "ragCardIds": [
      "pep-high-function-concepts-properties"
    ]
  },
  {
    "id": "pep-high-s4-plane-vectors-concept",
    "topicId": "pep-high-s4-plane-vectors",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-plane-vectors/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Plane vectors appear as directed arrows on a grid, with addition, decomposition, and projection shown by color and shadows.",
      "zh": "平面向量以网格上的有向箭头呈现，用颜色和投影展示加法、分解与投影。",
      "zhHans": "平面向量以网格上的有向箭头呈现，用颜色和投影展示加法、分解与投影。"
    },
    "caption": {
      "en": "Vectors carry both length and direction, so diagrams should preserve orientation.",
      "zh": "向量同时包含大小和方向，画图时必须保留方向信息。",
      "zhHans": "向量同时包含大小和方向，画图时必须保留方向信息。"
    },
    "ragCardIds": [
      "pep-high-plane-vectors"
    ]
  },
  {
    "id": "pep-high-s4-plane-vectors-worked-example",
    "topicId": "pep-high-s4-plane-vectors",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-plane-vectors/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A vector worked-example graphic decomposes one arrow into perpendicular components and compares a projection direction.",
      "zh": "向量例题图把一个箭头分解为垂直分量，并比较投影方向。",
      "zhHans": "向量例题图把一个箭头分解为垂直分量，并比较投影方向。"
    },
    "caption": {
      "en": "Break the vector into components before using dot-product or projection reasoning.",
      "zh": "使用数量积或投影前，先把向量分解为清楚的分量。",
      "zhHans": "使用数量积或投影前，先把向量分解为清楚的分量。"
    },
    "ragCardIds": [
      "pep-high-plane-vectors",
      "pep-high-sine-cosine-vector-applications"
    ]
  },
  {
    "id": "pep-high-s4-probability-concept",
    "topicId": "pep-high-s4-probability",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-probability/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A probability model shows a sample-space grid, event regions, complement shading, and a simulation trail of random outcomes.",
      "zh": "概率模型展示样本空间网格、事件区域、对立事件阴影和随机模拟轨迹。",
      "zhHans": "概率模型展示样本空间网格、事件区域、对立事件阴影和随机模拟轨迹。"
    },
    "caption": {
      "en": "Begin with the sample space, then describe the event and its relationship to other events.",
      "zh": "先确定样本空间，再描述事件以及它与其他事件的关系。",
      "zhHans": "先确定样本空间，再描述事件以及它与其他事件的关系。"
    },
    "ragCardIds": [
      "pep-high-probability",
      "pep-high-probability-event-operations"
    ]
  },
  {
    "id": "pep-high-s4-probability-worked-example",
    "topicId": "pep-high-s4-probability",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-probability/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A probability worked-example scene narrows from all possible outcomes to a highlighted event and its complement.",
      "zh": "概率例题图从全部可能结果逐步缩小到高亮事件及其对立事件。",
      "zhHans": "概率例题图从全部可能结果逐步缩小到高亮事件及其对立事件。"
    },
    "caption": {
      "en": "List all possible outcomes first so no favorable case is missed or counted twice.",
      "zh": "先列全所有可能结果，避免漏数或重复计数有利情况。",
      "zhHans": "先列全所有可能结果，避免漏数或重复计数有利情况。"
    },
    "ragCardIds": [
      "pep-high-probability"
    ]
  },
  {
    "id": "pep-high-s4-quadratic-inequalities-concept",
    "topicId": "pep-high-s4-quadratic-inequalities",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-quadratic-inequalities/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A parabola crosses a horizontal axis, with interval regions shaded to connect roots, signs, and inequality solutions.",
      "zh": "一条抛物线穿过横轴，并用区间阴影联系根、符号与不等式解集。",
      "zhHans": "一条抛物线穿过横轴，并用区间阴影联系根、符号与不等式解集。"
    },
    "caption": {
      "en": "Quadratic inequalities become clearer when roots split the number line into sign intervals.",
      "zh": "二次不等式要先用根把数轴分成符号区间。",
      "zhHans": "二次不等式要先用根把数轴分成符号区间。"
    },
    "ragCardIds": [
      "pep-high-quadratic-inequalities",
      "pep-high-basic-inequality-optimization"
    ]
  },
  {
    "id": "pep-high-s4-quadratic-inequalities-worked-example",
    "topicId": "pep-high-s4-quadratic-inequalities",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-quadratic-inequalities/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked-example scene compares a parabola with a sign chart so the selected solution interval is visually checked.",
      "zh": "例题图把抛物线与符号表并列，帮助目视检查所选解区间。",
      "zhHans": "例题图把抛物线与符号表并列，帮助目视检查所选解区间。"
    },
    "caption": {
      "en": "Check the interval choice against the graph before writing the final solution set.",
      "zh": "写最终解集前，先用图像检查区间选择。",
      "zhHans": "写最终解集前，先用图像检查区间选择。"
    },
    "ragCardIds": [
      "pep-high-quadratic-inequalities"
    ]
  },
  {
    "id": "pep-high-s4-sets-logic-concept",
    "topicId": "pep-high-s4-sets-logic",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-sets-logic/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Two translucent set regions overlap inside a larger universe frame to show membership, intersection, union, and boundary thinking.",
      "zh": "两个半透明集合区域在全集框中相交，展示元素归属、交集、并集和边界意识。",
      "zhHans": "两个半透明集合区域在全集框中相交，展示元素归属、交集、并集和边界意识。"
    },
    "caption": {
      "en": "Start by fixing the universe, then compare the regions that meet each condition.",
      "zh": "先确定全集，再比较满足不同条件的区域。",
      "zhHans": "先确定全集，再比较满足不同条件的区域。"
    },
    "ragCardIds": [
      "pep-high-sets-logic",
      "pep-high-logic-quantifiers-conditions"
    ]
  },
  {
    "id": "pep-high-s4-sets-logic-worked-example",
    "topicId": "pep-high-s4-sets-logic",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-sets-logic/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A set-operation workspace highlights the overlap of even numbers and numbers greater than a threshold without using textbook wording.",
      "zh": "集合运算工作区突出偶数集合与大于某阈值集合的重叠部分，不使用教材原文。",
      "zhHans": "集合运算工作区突出偶数集合与大于某阈值集合的重叠部分，不使用教材原文。"
    },
    "caption": {
      "en": "The visual route is to isolate the shared region first, then widen to the combined region.",
      "zh": "可视化解法先找共同区域，再扩展到合并区域。",
      "zhHans": "可视化解法先找共同区域，再扩展到合并区域。"
    },
    "ragCardIds": [
      "pep-high-sets-logic"
    ]
  },
  {
    "id": "pep-high-s4-solid-geometry-intro-concept",
    "topicId": "pep-high-s4-solid-geometry-intro",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-solid-geometry-intro/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A transparent prism shows points, lines, planes, parallel relations, perpendicular relations, and spatial distance cues.",
      "zh": "透明棱柱展示点、线、面、平行关系、垂直关系和空间距离线索。",
      "zhHans": "透明棱柱展示点、线、面、平行关系、垂直关系和空间距离线索。"
    },
    "caption": {
      "en": "Spatial reasoning depends on relations between lines and planes, not only on how a drawing looks.",
      "zh": "立体几何要依据线面关系推理，不能只凭图形外观。",
      "zhHans": "立体几何要依据线面关系推理，不能只凭图形外观。"
    },
    "ragCardIds": [
      "pep-high-solid-geometry-intro"
    ]
  },
  {
    "id": "pep-high-s4-solid-geometry-intro-worked-example",
    "topicId": "pep-high-s4-solid-geometry-intro",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-solid-geometry-intro/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A spatial worked-example scene marks an auxiliary plane and a right-angle cue inside a transparent solid.",
      "zh": "立体几何例题图在透明几何体内标出辅助平面和直角线索。",
      "zhHans": "立体几何例题图在透明几何体内标出辅助平面和直角线索。"
    },
    "caption": {
      "en": "Add an auxiliary plane or segment to turn a 3D relation into a visible 2D argument.",
      "zh": "加入辅助平面或线段，可把空间关系转化为可见的平面论证。",
      "zhHans": "加入辅助平面或线段，可把空间关系转化为可见的平面论证。"
    },
    "ragCardIds": [
      "pep-high-solid-geometry-intro"
    ]
  },
  {
    "id": "pep-high-s4-statistics-concept",
    "topicId": "pep-high-s4-statistics",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-statistics/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A statistics dashboard shows sampled dots becoming a histogram, box plot, and center-spread summary.",
      "zh": "统计仪表板展示样本点转化为直方图、箱线图和中心离散概括。",
      "zhHans": "统计仪表板展示样本点转化为直方图、箱线图和中心离散概括。"
    },
    "caption": {
      "en": "Statistics turns data into evidence by describing distribution, center, spread, and sampling bias.",
      "zh": "统计把数据转化为证据，要描述分布、中心、离散程度和抽样偏差。",
      "zhHans": "统计把数据转化为证据，要描述分布、中心、离散程度和抽样偏差。"
    },
    "ragCardIds": [
      "pep-high-statistics",
      "pep-high-statistics-sampling-estimation"
    ]
  },
  {
    "id": "pep-high-s4-statistics-worked-example",
    "topicId": "pep-high-s4-statistics",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-statistics/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked statistics visual compares two distributions with different spread while their centers are visibly close.",
      "zh": "统计例题图比较两个中心接近但离散程度不同的分布。",
      "zhHans": "统计例题图比较两个中心接近但离散程度不同的分布。"
    },
    "caption": {
      "en": "Do not judge a data set by the average alone; compare spread and shape too.",
      "zh": "不能只看平均数判断数据，还要比较离散程度和形状。",
      "zhHans": "不能只看平均数判断数据，还要比较离散程度和形状。"
    },
    "ragCardIds": [
      "pep-high-statistics"
    ]
  },
  {
    "id": "pep-high-s4-trigonometry-concept",
    "topicId": "pep-high-s4-trigonometry",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-trigonometry/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A unit circle connects rotating angle motion to a wave graph, showing signs, periodicity, and graph features.",
      "zh": "单位圆把旋转角运动连接到波形图，展示符号、周期和图像特征。",
      "zhHans": "单位圆把旋转角运动连接到波形图，展示符号、周期和图像特征。"
    },
    "caption": {
      "en": "The unit circle explains why trigonometric graphs repeat with predictable signs and shape.",
      "zh": "单位圆能解释三角函数图像为何按规律重复并呈现不同符号。",
      "zhHans": "单位圆能解释三角函数图像为何按规律重复并呈现不同符号。"
    },
    "ragCardIds": [
      "pep-high-trigonometric-functions",
      "pep-high-trigonometric-identities-transformations"
    ]
  },
  {
    "id": "pep-high-s4-trigonometry-worked-example",
    "topicId": "pep-high-s4-trigonometry",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s4-trigonometry/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked trigonometry scene uses a unit-circle angle and a highlighted wave segment to check signs and periodic solutions.",
      "zh": "三角例题图用单位圆角度和高亮波形区段检查符号与周期解。",
      "zhHans": "三角例题图用单位圆角度和高亮波形区段检查符号与周期解。"
    },
    "caption": {
      "en": "Use the circle for sign and reference angle, then use the wave for periodic checking.",
      "zh": "先用单位圆判断符号和参考角，再用波形检查周期。",
      "zhHans": "先用单位圆判断符号和参考角，再用波形检查周期。"
    },
    "ragCardIds": [
      "pep-high-trigonometric-functions",
      "pep-high-sine-cosine-theorems"
    ]
  },
  {
    "id": "pep-high-s5-conics-concept",
    "topicId": "pep-high-s5-conics",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-conics/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Ellipse, parabola, and hyperbola shapes share a coordinate space with foci, directrix cues, and parameter highlights.",
      "zh": "椭圆、抛物线和双曲线共处坐标空间，展示焦点、准线线索和参数高亮。",
      "zhHans": "椭圆、抛物线和双曲线共处坐标空间，展示焦点、准线线索和参数高亮。"
    },
    "caption": {
      "en": "Conic equations describe shape, focus structure, and changing parameter constraints.",
      "zh": "圆锥曲线方程同时描述形状、焦点结构和参数约束变化。",
      "zhHans": "圆锥曲线方程同时描述形状、焦点结构和参数约束变化。"
    },
    "ragCardIds": [
      "pep-high-conic-sections",
      "pep-high-exam-conics-analytic-geometry"
    ]
  },
  {
    "id": "pep-high-s5-conics-worked-example",
    "topicId": "pep-high-s5-conics",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-conics/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A conic worked-example graphic shows an ellipse with foci, a chord, and a moving point used for geometric constraints.",
      "zh": "圆锥曲线例题图展示带焦点的椭圆、弦和用于几何约束的动点。",
      "zhHans": "圆锥曲线例题图展示带焦点的椭圆、弦和用于几何约束的动点。"
    },
    "caption": {
      "en": "Mark the fixed points and moving point before translating the geometry into equations.",
      "zh": "先标清定点和动点，再把几何关系转化为方程。",
      "zhHans": "先标清定点和动点，再把几何关系转化为方程。"
    },
    "ragCardIds": [
      "pep-high-conic-sections"
    ]
  },
  {
    "id": "pep-high-s5-derivatives-concept",
    "topicId": "pep-high-s5-derivatives",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-derivatives/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A smooth curve has a tangent line, slope indicator, increasing/decreasing bands, and extrema markers.",
      "zh": "光滑曲线配有切线、斜率指示、增减区间和极值标记。",
      "zhHans": "光滑曲线配有切线、斜率指示、增减区间和极值标记。"
    },
    "caption": {
      "en": "The derivative describes local change, then reveals monotonicity, extrema, and optimization.",
      "zh": "导数描述局部变化，并进一步揭示单调性、极值和最优化。",
      "zhHans": "导数描述局部变化，并进一步揭示单调性、极值和最优化。"
    },
    "ragCardIds": [
      "pep-high-derivatives-applications",
      "pep-high-exam-derivatives-optimization"
    ]
  },
  {
    "id": "pep-high-s5-derivatives-worked-example",
    "topicId": "pep-high-s5-derivatives",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-derivatives/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A derivative worked-example scene aligns a curve, tangent point, sign chart bands, and an optimization target marker.",
      "zh": "导数例题图把曲线、切点、符号区间和最优化目标点对齐展示。",
      "zhHans": "导数例题图把曲线、切点、符号区间和最优化目标点对齐展示。"
    },
    "caption": {
      "en": "Use the derivative sign pattern to justify where a function increases, decreases, or reaches an extremum.",
      "zh": "用导数符号变化说明函数增减和极值位置。",
      "zhHans": "用导数符号变化说明函数增减和极值位置。"
    },
    "ragCardIds": [
      "pep-high-derivatives-applications",
      "pep-high-derivative-tangent-inequality"
    ]
  },
  {
    "id": "pep-high-s5-lines-circles-concept",
    "topicId": "pep-high-s5-lines-circles",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-lines-circles/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A coordinate plane shows lines, a circle, tangent distance, chord relation, and intersection cases.",
      "zh": "坐标平面展示直线、圆、切线距离、弦关系和交点情况。",
      "zhHans": "坐标平面展示直线、圆、切线距离、弦关系和交点情况。"
    },
    "caption": {
      "en": "Line and circle equations make geometric position relationships measurable.",
      "zh": "直线和圆的方程让几何位置关系可以被计算。",
      "zhHans": "直线和圆的方程让几何位置关系可以被计算。"
    },
    "ragCardIds": [
      "pep-high-lines-circles",
      "pep-high-exam-analytic-lines-circles"
    ]
  },
  {
    "id": "pep-high-s5-lines-circles-worked-example",
    "topicId": "pep-high-s5-lines-circles",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-lines-circles/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked-example scene highlights the distance from a circle center to a line to decide the line-circle relation.",
      "zh": "例题图突出圆心到直线的距离，用于判断直线与圆的位置关系。",
      "zhHans": "例题图突出圆心到直线的距离，用于判断直线与圆的位置关系。"
    },
    "caption": {
      "en": "For line-circle position, compare center-to-line distance with the radius.",
      "zh": "判断直线与圆的位置关系，要比较圆心到直线距离和半径。",
      "zhHans": "判断直线与圆的位置关系，要比较圆心到直线距离和半径。"
    },
    "ragCardIds": [
      "pep-high-lines-circles"
    ]
  },
  {
    "id": "pep-high-s5-sequences-concept",
    "topicId": "pep-high-s5-sequences",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-sequences/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sequence appears as ordered blocks whose height changes by a pattern, with recursion arrows and a partial-sum staircase.",
      "zh": "数列以有序方块呈现，高度按规律变化，并展示递推箭头和部分和阶梯。",
      "zhHans": "数列以有序方块呈现，高度按规律变化，并展示递推箭头和部分和阶梯。"
    },
    "caption": {
      "en": "Sequences are ordered patterns; sums collect those terms into a new structure.",
      "zh": "数列是有顺序的规律，求和会把各项累积成新的结构。",
      "zhHans": "数列是有顺序的规律，求和会把各项累积成新的结构。"
    },
    "ragCardIds": [
      "pep-high-sequences",
      "pep-high-sequences-summation-recursion"
    ]
  },
  {
    "id": "pep-high-s5-sequences-worked-example",
    "topicId": "pep-high-s5-sequences",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-sequences/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sequence worked-example visual compares term growth with the accumulated sum using two linked staircases.",
      "zh": "数列例题图用两个相连阶梯比较项的增长和累积和。",
      "zhHans": "数列例题图用两个相连阶梯比较项的增长和累积和。"
    },
    "caption": {
      "en": "Separate the rule for each term from the rule for the accumulated sum.",
      "zh": "要区分通项规律和累加和规律。",
      "zhHans": "要区分通项规律和累加和规律。"
    },
    "ragCardIds": [
      "pep-high-sequences"
    ]
  },
  {
    "id": "pep-high-s5-space-vectors-concept",
    "topicId": "pep-high-s5-space-vectors",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-space-vectors/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A 3D coordinate space contains vectors, a plane normal, and distance/angle cues for solid geometry reasoning.",
      "zh": "三维坐标空间中包含向量、平面法向量以及距离和角度线索，用于立体几何推理。",
      "zhHans": "三维坐标空间中包含向量、平面法向量以及距离和角度线索，用于立体几何推理。"
    },
    "caption": {
      "en": "Space vectors turn line-plane position questions into coordinate and dot-product reasoning.",
      "zh": "空间向量能把线面位置问题转化为坐标与数量积推理。",
      "zhHans": "空间向量能把线面位置问题转化为坐标与数量积推理。"
    },
    "ragCardIds": [
      "pep-high-space-vectors-solid-geometry"
    ]
  },
  {
    "id": "pep-high-s5-space-vectors-worked-example",
    "topicId": "pep-high-s5-space-vectors",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s5-space-vectors/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked-example graphic projects a point to a plane and compares a direction vector with a normal vector.",
      "zh": "空间向量例题图把点投影到平面，并比较方向向量与法向量。",
      "zhHans": "空间向量例题图把点投影到平面，并比较方向向量与法向量。"
    },
    "caption": {
      "en": "Choose direction vectors and normal vectors before calculating angles or distances.",
      "zh": "计算角度或距离前，先选定方向向量和法向量。",
      "zhHans": "计算角度或距离前，先选定方向向量和法向量。"
    },
    "ragCardIds": [
      "pep-high-space-vectors-solid-geometry",
      "pep-high-exam-space-vectors-geometry"
    ]
  },
  {
    "id": "pep-high-s6-analytic-geometry-synthesis-concept",
    "topicId": "pep-high-s6-analytic-geometry-synthesis",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-analytic-geometry-synthesis/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Analytic geometry synthesis combines a conic, line, circle, vectors, and parameter region in one coordinate workspace.",
      "zh": "解析几何综合图在同一坐标工作区结合圆锥曲线、直线、圆、向量和参数区域。",
      "zhHans": "解析几何综合图在同一坐标工作区结合圆锥曲线、直线、圆、向量和参数区域。"
    },
    "caption": {
      "en": "Coordinate geometry synthesis works by translating several geometric constraints into one algebraic plan.",
      "zh": "解析几何综合要把多个几何约束转化为统一的代数计划。",
      "zhHans": "解析几何综合要把多个几何约束转化为统一的代数计划。"
    },
    "ragCardIds": [
      "pep-high-conic-sections",
      "pep-high-exam-conics-analytic-geometry"
    ]
  },
  {
    "id": "pep-high-s6-analytic-geometry-synthesis-worked-example",
    "topicId": "pep-high-s6-analytic-geometry-synthesis",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-analytic-geometry-synthesis/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked analytic-geometry scene shows a conic intersected by a moving line, with a chord midpoint and vector cue.",
      "zh": "解析几何例题图展示动直线与圆锥曲线相交，并突出弦中点和向量线索。",
      "zhHans": "解析几何例题图展示动直线与圆锥曲线相交，并突出弦中点和向量线索。"
    },
    "caption": {
      "en": "Use the diagram to name the moving objects, then translate intersection and midpoint conditions.",
      "zh": "先用图像明确动对象，再转化交点和中点条件。",
      "zhHans": "先用图像明确动对象，再转化交点和中点条件。"
    },
    "ragCardIds": [
      "pep-high-conic-sections"
    ]
  },
  {
    "id": "pep-high-s6-bivariate-data-concept",
    "topicId": "pep-high-s6-bivariate-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-bivariate-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A scatter plot with trend line, residual arrows, and cluster cues shows correlation and regression ideas.",
      "zh": "散点图配有趋势线、残差箭头和聚类线索，展示相关与回归思想。",
      "zhHans": "散点图配有趋势线、残差箭头和聚类线索，展示相关与回归思想。"
    },
    "caption": {
      "en": "Bivariate analysis studies direction, strength, model fit, and what residuals reveal.",
      "zh": "成对数据分析要看方向、强弱、模型拟合以及残差透露的信息。",
      "zhHans": "成对数据分析要看方向、强弱、模型拟合以及残差透露的信息。"
    },
    "ragCardIds": [
      "pep-high-bivariate-statistics",
      "pep-high-exam-bivariate-data"
    ]
  },
  {
    "id": "pep-high-s6-bivariate-data-worked-example",
    "topicId": "pep-high-s6-bivariate-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-bivariate-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked regression visual compares observed points with predicted points and highlights residual distances.",
      "zh": "回归例题图比较观测点和预测点，并突出残差距离。",
      "zhHans": "回归例题图比较观测点和预测点，并突出残差距离。"
    },
    "caption": {
      "en": "Use the regression line for prediction, then inspect residuals to judge model fit.",
      "zh": "用回归线预测后，还要观察残差判断模型拟合。",
      "zhHans": "用回归线预测后，还要观察残差判断模型拟合。"
    },
    "ragCardIds": [
      "pep-high-bivariate-statistics"
    ]
  },
  {
    "id": "pep-high-s6-counting-concept",
    "topicId": "pep-high-s6-counting",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-counting/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Counting principles are shown through branching cases, ordered arrangements, unordered selections, and a binomial pattern triangle.",
      "zh": "计数原理通过分步分支、有序排列、无序选择和二项式结构图呈现。",
      "zhHans": "计数原理通过分步分支、有序排列、无序选择和二项式结构图呈现。"
    },
    "caption": {
      "en": "Choose whether order matters and whether cases overlap before counting.",
      "zh": "计数前先判断顺序是否重要，以及分类是否重叠。",
      "zhHans": "计数前先判断顺序是否重要，以及分类是否重叠。"
    },
    "ragCardIds": [
      "pep-high-counting-principles",
      "pep-high-exam-counting-method-taxonomy"
    ]
  },
  {
    "id": "pep-high-s6-counting-worked-example",
    "topicId": "pep-high-s6-counting",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-counting/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A counting worked-example visual separates cases into non-overlapping branches before filling arrangement slots.",
      "zh": "计数例题图先把情况分成互不重叠的分支，再填入排列槽位。",
      "zhHans": "计数例题图先把情况分成互不重叠的分支，再填入排列槽位。"
    },
    "caption": {
      "en": "A reliable counting solution uses clear cases first, then counts each case exactly once.",
      "zh": "可靠的计数解法先分类清楚，再保证每种情况只数一次。",
      "zhHans": "可靠的计数解法先分类清楚，再保证每种情况只数一次。"
    },
    "ragCardIds": [
      "pep-high-counting-principles"
    ]
  },
  {
    "id": "pep-high-s6-derivative-synthesis-concept",
    "topicId": "pep-high-s6-derivative-synthesis",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-derivative-synthesis/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Derivative synthesis is shown as layers of curve behavior, tangent conditions, zero points, and inequality regions.",
      "zh": "导数综合图把曲线性质、切线条件、零点和不等式区域分层展示。",
      "zhHans": "导数综合图把曲线性质、切线条件、零点和不等式区域分层展示。"
    },
    "caption": {
      "en": "Synthesis problems often combine derivative signs, tangent constraints, zeros, and inequality reasoning.",
      "zh": "导数综合题常把导数符号、切线约束、零点和不等式推理结合起来。",
      "zhHans": "导数综合题常把导数符号、切线约束、零点和不等式推理结合起来。"
    },
    "ragCardIds": [
      "pep-high-derivatives-tangent-zeros-inequalities",
      "pep-high-exam-derivative-tangent-inequality"
    ]
  },
  {
    "id": "pep-high-s6-derivative-synthesis-worked-example",
    "topicId": "pep-high-s6-derivative-synthesis",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-derivative-synthesis/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A synthesis worked-example visual aligns a curve, tangent constraint, derivative sign bands, and allowed parameter region.",
      "zh": "综合例题图对齐曲线、切线约束、导数符号区间和允许参数区域。",
      "zhHans": "综合例题图对齐曲线、切线约束、导数符号区间和允许参数区域。"
    },
    "caption": {
      "en": "Track each condition separately, then intersect the allowed regions.",
      "zh": "先分别追踪每个条件，再取共同满足的区域。",
      "zhHans": "先分别追踪每个条件，再取共同满足的区域。"
    },
    "ragCardIds": [
      "pep-high-derivatives-tangent-zeros-inequalities"
    ]
  },
  {
    "id": "pep-high-s6-exam-practice-concept",
    "topicId": "pep-high-s6-exam-practice",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-exam-practice/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An exam-strategy map connects functions, geometry, probability, and checking loops into one problem-solving route.",
      "zh": "考试策略图把函数、几何、概率和检验环节连接成一条解题路线。",
      "zhHans": "考试策略图把函数、几何、概率和检验环节连接成一条解题路线。"
    },
    "caption": {
      "en": "Mixed practice starts with recognizing the dominant structure and choosing a strategy before calculating.",
      "zh": "综合练习先识别主结构并选择策略，再开始计算。",
      "zhHans": "综合练习先识别主结构并选择策略，再开始计算。"
    },
    "ragCardIds": [
      "pep-high-function-zero-modeling",
      "pep-high-exam-legacy-stream-migration"
    ]
  },
  {
    "id": "pep-high-s6-exam-practice-worked-example",
    "topicId": "pep-high-s6-exam-practice",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-exam-practice/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked mixed-practice scene shows a four-step strategy: represent, choose method, solve, and check visually.",
      "zh": "综合例题图展示四步策略：表示、选法、求解和图像检验。",
      "zhHans": "综合例题图展示四步策略：表示、选法、求解和图像检验。"
    },
    "caption": {
      "en": "For a mixed problem, make the representation visible before committing to algebraic work.",
      "zh": "处理综合题时，先把关系表示出来，再进入代数计算。",
      "zhHans": "处理综合题时，先把关系表示出来，再进入代数计算。"
    },
    "ragCardIds": [
      "pep-high-function-zero-modeling",
      "pep-high-exam-derivatives-optimization"
    ]
  },
  {
    "id": "pep-high-s6-probability-statistics-synthesis-concept",
    "topicId": "pep-high-s6-probability-statistics-synthesis",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-probability-statistics-synthesis/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Probability-statistics synthesis connects a decision tree, distribution bars, scatter plot, and inference dashboard.",
      "zh": "概率统计综合图连接决策树、分布柱、散点图和推断仪表板。",
      "zhHans": "概率统计综合图连接决策树、分布柱、散点图和推断仪表板。"
    },
    "caption": {
      "en": "Mixed problems ask whether the situation is mainly counting, probability, distribution, or data interpretation.",
      "zh": "综合题要先判断情境主要属于计数、概率、分布还是数据解释。",
      "zhHans": "综合题要先判断情境主要属于计数、概率、分布还是数据解释。"
    },
    "ragCardIds": [
      "pep-high-conditional-probability-distributions",
      "pep-high-exam-regression-independence"
    ]
  },
  {
    "id": "pep-high-s6-probability-statistics-synthesis-worked-example",
    "topicId": "pep-high-s6-probability-statistics-synthesis",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-probability-statistics-synthesis/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A synthesis worked-example graphic moves from event tree to distribution summary and final data-based decision.",
      "zh": "综合例题图从事件树推进到分布概括，再到基于数据的判断。",
      "zhHans": "综合例题图从事件树推进到分布概括，再到基于数据的判断。"
    },
    "caption": {
      "en": "Map the random process first, then summarize the distribution before interpreting the result.",
      "zh": "先梳理随机过程，再概括分布，最后解释结果。",
      "zhHans": "先梳理随机过程，再概括分布，最后解释结果。"
    },
    "ragCardIds": [
      "pep-high-conditional-probability-distributions"
    ]
  },
  {
    "id": "pep-high-s6-random-variables-concept",
    "topicId": "pep-high-s6-random-variables",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-random-variables/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Random outcomes map into a distribution chart with expected value balance and variance spread cues.",
      "zh": "随机结果映射到分布图，并展示期望平衡点和方差离散线索。",
      "zhHans": "随机结果映射到分布图，并展示期望平衡点和方差离散线索。"
    },
    "caption": {
      "en": "A random variable turns outcomes into numbers, then a distribution describes likelihood and spread.",
      "zh": "随机变量把结果转化为数值，分布则描述可能性和离散程度。",
      "zhHans": "随机变量把结果转化为数值，分布则描述可能性和离散程度。"
    },
    "ragCardIds": [
      "pep-high-random-variables-distributions",
      "pep-high-conditional-probability-distributions"
    ]
  },
  {
    "id": "pep-high-s6-random-variables-worked-example",
    "topicId": "pep-high-s6-random-variables",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-high/pep-high-s6-random-variables/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A worked-example visual builds a probability distribution from outcome groups and checks its center and spread.",
      "zh": "随机变量例题图由结果分组建立概率分布，并检查中心与离散程度。",
      "zhHans": "随机变量例题图由结果分组建立概率分布，并检查中心与离散程度。"
    },
    "caption": {
      "en": "After listing values and probabilities, check that the distribution is complete before calculating summary measures.",
      "zh": "列出取值和概率后，先检查分布完整，再计算期望和方差。",
      "zhHans": "列出取值和概率后，先检查分布完整，再计算期望和方差。"
    },
    "ragCardIds": [
      "pep-high-random-variables-distributions"
    ]
  }
] satisfies MainlandPepHighLessonIllustration[];

const mainlandPepHighLessonIllustrationByTopicAndSlot = new Map(
  mainlandPepHighLessonIllustrations.map((illustration) => [
    `${illustration.topicId}:${illustration.slot}`,
    illustration
  ])
);

export function getMainlandPepHighLessonIllustration(
  topicId: string,
  slot: MainlandPepHighLessonIllustrationSlot
) {
  return mainlandPepHighLessonIllustrationByTopicAndSlot.get(`${topicId}:${slot}`) ?? null;
}
