import type { LocalizedText } from "@/types";

export type MainlandHjbHighLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandHjbHighLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandHjbHighLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

// Draft metadata retained after asset removal. The live export below is
// withdrawn because `852fe6dd39` deleted the low-quality PNGs from
// public/lesson-illustrations/mainland-hjb-high/ without withdrawing the
// metadata, leaving the lesson surface pointing at files that no longer exist.
export const mainlandHjbHighLessonIllustrationDrafts = [
  {
    "id": "hjb-high-s4-等式与不等式-concept",
    "topicId": "hjb-high-s4-等式与不等式",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-等式与不等式/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A balance scale, number line, and parabola connect equality, inequality, roots, and sign intervals.",
      "zh": "天平、数轴和抛物线把等式、不等式、根和符号区间联系起来。",
      "zhHans": "天平、数轴和抛物线把等式、不等式、根和符号区间联系起来。"
    },
    "caption": {
      "en": "Equivalent transformations must preserve the solution set and interval endpoints.",
      "zh": "等价变形要保持解集和端点判断不变。",
      "zhHans": "等价变形要保持解集和端点判断不变。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-equations-inequalities"
    ]
  },
  {
    "id": "hjb-high-s4-等式与不等式-worked-example",
    "topicId": "hjb-high-s4-等式与不等式",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-等式与不等式/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sign chart beside a parabola highlights endpoint choices and valid solution intervals.",
      "zh": "抛物线旁的符号表突出端点选择和有效解区间。",
      "zhHans": "抛物线旁的符号表突出端点选择和有效解区间。"
    },
    "caption": {
      "en": "Mark roots, test intervals, then write only the regions that satisfy the inequality.",
      "zh": "先标根，再测区间，最后只写满足不等式的部分。",
      "zhHans": "先标根，再测区间，最后只写满足不等式的部分。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-equations-inequalities"
    ]
  },
  {
    "id": "hjb-high-s4-复数-concept",
    "topicId": "hjb-high-s4-复数",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-复数/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A complex plane shows real-imaginary location, conjugate reflection, modulus circles, and arrows.",
      "zh": "复平面展示实部虚部定位、共轭反射、模长圆和箭头运算。",
      "zhHans": "复平面展示实部虚部定位、共轭反射、模长圆和箭头运算。"
    },
    "caption": {
      "en": "Complex numbers can be checked algebraically and geometrically on the same plane.",
      "zh": "复数可以同时用代数运算和复平面几何来检查。",
      "zhHans": "复数可以同时用代数运算和复平面几何来检查。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-complex-numbers"
    ]
  },
  {
    "id": "hjb-high-s4-复数-worked-example",
    "topicId": "hjb-high-s4-复数",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-复数/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A complex-plane worked example combines arrows and reflects a point to check conjugates.",
      "zh": "复平面例题把箭头合成为结果点，并通过反射检查共轭。",
      "zhHans": "复平面例题把箭头合成为结果点，并通过反射检查共轭。"
    },
    "caption": {
      "en": "Track real and imaginary movement separately, then check the final point visually.",
      "zh": "分别追踪实部和虚部移动，再用图像检查最终点。",
      "zhHans": "分别追踪实部和虚部移动，再用图像检查最终点。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-complex-numbers"
    ]
  },
  {
    "id": "hjb-high-s4-函数的概念-性质及应用-concept",
    "topicId": "hjb-high-s4-函数的概念-性质及应用",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-函数的概念-性质及应用/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A function machine and graph windows show domain, range, monotonicity, and symmetry cues.",
      "zh": "函数机器和图像窗口展示定义域、值域、单调性和对称线索。",
      "zhHans": "函数机器和图像窗口展示定义域、值域、单调性和对称线索。"
    },
    "caption": {
      "en": "Start with the allowed inputs, then read how outputs behave across intervals.",
      "zh": "先确定允许输入，再分区间读取输出怎样变化。",
      "zhHans": "先确定允许输入，再分区间读取输出怎样变化。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-function-concepts-applications"
    ]
  },
  {
    "id": "hjb-high-s4-函数的概念-性质及应用-worked-example",
    "topicId": "hjb-high-s4-函数的概念-性质及应用",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-函数的概念-性质及应用/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A graph-reading board highlights input windows, output heights, zeros, and interval arrows.",
      "zh": "读图板突出输入范围、输出高度、零点和区间箭头。",
      "zhHans": "读图板突出输入范围、输出高度、零点和区间箭头。"
    },
    "caption": {
      "en": "Domain, zeros, and monotonicity should be checked as separate graph features.",
      "zh": "定义域、零点和单调性要作为不同图像特征分别检查。",
      "zhHans": "定义域、零点和单调性要作为不同图像特征分别检查。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-function-concepts-applications"
    ]
  },
  {
    "id": "hjb-high-s4-集合与逻辑-concept",
    "topicId": "hjb-high-s4-集合与逻辑",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-集合与逻辑/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Overlapping set regions inside a universe frame show membership, operations, and condition filtering.",
      "zh": "全集框中的重叠集合区域展示元素归属、集合运算和条件筛选。",
      "zhHans": "全集框中的重叠集合区域展示元素归属、集合运算和条件筛选。"
    },
    "caption": {
      "en": "Fix the universe first, then compare which region satisfies each condition.",
      "zh": "先确定全集，再比较每个条件对应的区域。",
      "zhHans": "先确定全集，再比较每个条件对应的区域。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-sets-logic"
    ]
  },
  {
    "id": "hjb-high-s4-集合与逻辑-worked-example",
    "topicId": "hjb-high-s4-集合与逻辑",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-集合与逻辑/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A set-operation workspace narrows to an intersection region and checks the complement visually.",
      "zh": "集合运算工作区逐步缩小到交集区域，并用补集区域作目视检查。",
      "zhHans": "集合运算工作区逐步缩小到交集区域，并用补集区域作目视检查。"
    },
    "caption": {
      "en": "Use the shared region and its complement to avoid reversing the condition.",
      "zh": "用公共区域和补集一起检查，避免把条件方向弄反。",
      "zhHans": "用公共区域和补集一起检查，避免把条件方向弄反。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-sets-logic"
    ]
  },
  {
    "id": "hjb-high-s4-幂-指数与对数-concept",
    "topicId": "hjb-high-s4-幂-指数与对数",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-幂-指数与对数/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Exponent tiles, radical blocks, and logarithm arrows show reversible power-log relationships.",
      "zh": "指数方块、根式模块和对数箭头展示幂与对数的可逆关系。",
      "zhHans": "指数方块、根式模块和对数箭头展示幂与对数的可逆关系。"
    },
    "caption": {
      "en": "Power and logarithm rules work only after checking base and domain conditions.",
      "zh": "使用幂和对数法则前，必须先检查底数和定义域条件。",
      "zhHans": "使用幂和对数法则前，必须先检查底数和定义域条件。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-powers-exponents-logarithms"
    ]
  },
  {
    "id": "hjb-high-s4-幂-指数与对数-worked-example",
    "topicId": "hjb-high-s4-幂-指数与对数",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-幂-指数与对数/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A conversion board links exponent, radical, and logarithm forms through reversible arrows.",
      "zh": "转换板用可逆箭头连接指数式、根式和对数式。",
      "zhHans": "转换板用可逆箭头连接指数式、根式和对数式。"
    },
    "caption": {
      "en": "Rewrite one step at a time, and verify that each form keeps the same restriction.",
      "zh": "每次只改写一步，并确认不同形式保留相同限制。",
      "zhHans": "每次只改写一步，并确认不同形式保留相同限制。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-powers-exponents-logarithms"
    ]
  },
  {
    "id": "hjb-high-s4-幂函数-指数函数与对数函数-concept",
    "topicId": "hjb-high-s4-幂函数-指数函数与对数函数",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-幂函数-指数函数与对数函数/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Power, exponential, and logarithmic curves compare growth, domain, range, and inverse structure.",
      "zh": "幂函数、指数函数和对数函数曲线比较增长、定义域、值域和互逆结构。",
      "zhHans": "幂函数、指数函数和对数函数曲线比较增长、定义域、值域和互逆结构。"
    },
    "caption": {
      "en": "Compare function families by shape, domain, monotonicity, and transformation behavior.",
      "zh": "比较函数族时，要同时看形状、定义域、单调性和变换。",
      "zhHans": "比较函数族时，要同时看形状、定义域、单调性和变换。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-power-exponential-log-functions"
    ]
  },
  {
    "id": "hjb-high-s4-幂函数-指数函数与对数函数-worked-example",
    "topicId": "hjb-high-s4-幂函数-指数函数与对数函数",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-幂函数-指数函数与对数函数/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A graph-reading workspace matches curve shapes with parameters and highlighted intervals.",
      "zh": "读图工作区把曲线形状、参数线索和高亮区间对应起来。",
      "zhHans": "读图工作区把曲线形状、参数线索和高亮区间对应起来。"
    },
    "caption": {
      "en": "Move between graph features and symbolic choices by checking the same restriction twice.",
      "zh": "在图像特征和式子选择之间转换时，要重复检查同一限制条件。",
      "zhHans": "在图像特征和式子选择之间转换时，要重复检查同一限制条件。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-power-exponential-log-functions"
    ]
  },
  {
    "id": "hjb-high-s4-平面向量-concept",
    "topicId": "hjb-high-s4-平面向量",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-平面向量/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Directed grid arrows show vector addition, decomposition, projection, and angle comparison.",
      "zh": "坐标网格上的有向箭头展示向量加法、分解、投影和夹角比较。",
      "zhHans": "坐标网格上的有向箭头展示向量加法、分解、投影和夹角比较。"
    },
    "caption": {
      "en": "Vector diagrams must preserve both length and direction before calculation.",
      "zh": "向量图示在计算前必须同时保留长度和方向。",
      "zhHans": "向量图示在计算前必须同时保留长度和方向。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-plane-vectors"
    ]
  },
  {
    "id": "hjb-high-s4-平面向量-worked-example",
    "topicId": "hjb-high-s4-平面向量",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-平面向量/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A vector board decomposes an arrow into components and checks projection direction.",
      "zh": "向量板把箭头分解为分量，并检查投影方向。",
      "zhHans": "向量板把箭头分解为分量，并检查投影方向。"
    },
    "caption": {
      "en": "Break the vector into components before using projection or dot-product reasoning.",
      "zh": "使用投影或数量积前，先把向量分解为清楚分量。",
      "zhHans": "使用投影或数量积前，先把向量分解为清楚分量。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-plane-vectors"
    ]
  },
  {
    "id": "hjb-high-s4-三角-concept",
    "topicId": "hjb-high-s4-三角",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-三角/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A unit circle links angle rotation to trigonometric waveforms, signs, and periods.",
      "zh": "单位圆把角的旋转与三角函数波形、符号和周期联系起来。",
      "zhHans": "单位圆把角的旋转与三角函数波形、符号和周期联系起来。"
    },
    "caption": {
      "en": "Use the unit circle to explain signs, reference angles, and periodic graph behavior.",
      "zh": "用单位圆解释符号、参考角和图像周期。",
      "zhHans": "用单位圆解释符号、参考角和图像周期。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometry-foundations"
    ]
  },
  {
    "id": "hjb-high-s4-三角-worked-example",
    "topicId": "hjb-high-s4-三角",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-三角/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A trigonometry workspace checks a unit-circle angle against highlighted waveform intervals.",
      "zh": "三角工作区把单位圆上的角与波形中的高亮区间互相检查。",
      "zhHans": "三角工作区把单位圆上的角与波形中的高亮区间互相检查。"
    },
    "caption": {
      "en": "Judge the sign and reference angle first, then use the period to complete the solution.",
      "zh": "先判断符号和参考角，再利用周期补全解。",
      "zhHans": "先判断符号和参考角，再利用周期补全解。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometry-foundations"
    ]
  },
  {
    "id": "hjb-high-s4-三角函数-concept",
    "topicId": "hjb-high-s4-三角函数",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-三角函数/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A function machine and graph windows show domain, range, monotonicity, and symmetry cues.",
      "zh": "函数机器和图像窗口展示定义域、值域、单调性和对称线索。",
      "zhHans": "函数机器和图像窗口展示定义域、值域、单调性和对称线索。"
    },
    "caption": {
      "en": "Start with the allowed inputs, then read how outputs behave across intervals.",
      "zh": "先确定允许输入，再分区间读取输出怎样变化。",
      "zhHans": "先确定允许输入，再分区间读取输出怎样变化。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometric-functions"
    ]
  },
  {
    "id": "hjb-high-s4-三角函数-worked-example",
    "topicId": "hjb-high-s4-三角函数",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s4-三角函数/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A graph-reading board highlights input windows, output heights, zeros, and interval arrows.",
      "zh": "读图板突出输入范围、输出高度、零点和区间箭头。",
      "zhHans": "读图板突出输入范围、输出高度、零点和区间箭头。"
    },
    "caption": {
      "en": "Domain, zeros, and monotonicity should be checked as separate graph features.",
      "zh": "定义域、零点和单调性要作为不同图像特征分别检查。",
      "zhHans": "定义域、零点和单调性要作为不同图像特征分别检查。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometric-functions"
    ]
  },
  {
    "id": "hjb-high-s5-概率初步-concept",
    "topicId": "hjb-high-s5-概率初步",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-概率初步/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sample-space grid, event regions, branches, and simulation trail show probability structure.",
      "zh": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。",
      "zhHans": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。"
    },
    "caption": {
      "en": "Begin with the sample space, then describe events and their relationships.",
      "zh": "先确定样本空间，再描述事件及其关系。",
      "zhHans": "先确定样本空间，再描述事件及其关系。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-probability-foundations"
    ]
  },
  {
    "id": "hjb-high-s5-概率初步-worked-example",
    "topicId": "hjb-high-s5-概率初步",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-概率初步/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A probability board narrows all outcomes to a highlighted event and checks complement counts.",
      "zh": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。",
      "zhHans": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。"
    },
    "caption": {
      "en": "List the possible outcomes first to avoid missing or double-counting favorable cases.",
      "zh": "先列清所有可能结果，避免漏数或重复计数。",
      "zhHans": "先列清所有可能结果，避免漏数或重复计数。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-probability-foundations"
    ]
  },
  {
    "id": "hjb-high-s5-简单几何体-concept",
    "topicId": "hjb-high-s5-简单几何体",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-简单几何体/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Transparent solids and planes show line-plane relations, parallelism, perpendicularity, and distance cues.",
      "zh": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。",
      "zhHans": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。"
    },
    "caption": {
      "en": "Spatial geometry needs explicit line-plane relations, not only visual appearance.",
      "zh": "立体几何要依据明确的线面关系推理，不能只凭外观。",
      "zhHans": "立体几何要依据明确的线面关系推理，不能只凭外观。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-simple-solids"
    ]
  },
  {
    "id": "hjb-high-s5-简单几何体-worked-example",
    "topicId": "hjb-high-s5-简单几何体",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-简单几何体/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A spatial-geometry workspace adds an auxiliary plane and right-angle cue inside a transparent solid.",
      "zh": "立体几何工作区在透明几何体内加入辅助平面和直角线索。",
      "zhHans": "立体几何工作区在透明几何体内加入辅助平面和直角线索。"
    },
    "caption": {
      "en": "Add auxiliary planes or segments to turn spatial relations into visible arguments.",
      "zh": "加入辅助平面或线段，把空间关系转化为可见论证。",
      "zhHans": "加入辅助平面或线段，把空间关系转化为可见论证。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-simple-solids"
    ]
  },
  {
    "id": "hjb-high-s5-空间向量及其应用-concept",
    "topicId": "hjb-high-s5-空间向量及其应用",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-空间向量及其应用/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "3D coordinate arrows and component shadows show spatial vectors, angles, and plane normals.",
      "zh": "三维坐标箭头和分量投影展示空间向量、夹角和平面法向量。",
      "zhHans": "三维坐标箭头和分量投影展示空间向量、夹角和平面法向量。"
    },
    "caption": {
      "en": "Spatial vectors translate geometry into coordinates, components, and products.",
      "zh": "空间向量把几何关系转化为坐标、分量和数量积。",
      "zhHans": "空间向量把几何关系转化为坐标、分量和数量积。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s5-空间向量及其应用-worked-example",
    "topicId": "hjb-high-s5-空间向量及其应用",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-空间向量及其应用/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A 3D vector workspace projects an arrow and compares it with a plane normal.",
      "zh": "三维向量工作区投影箭头，并与平面法向量比较。",
      "zhHans": "三维向量工作区投影箭头，并与平面法向量比较。"
    },
    "caption": {
      "en": "Use components and normal directions to check angle, distance, or perpendicularity.",
      "zh": "用分量和法向方向检查夹角、距离或垂直关系。",
      "zhHans": "用分量和法向方向检查夹角、距离或垂直关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s5-空间直线与平面-concept",
    "topicId": "hjb-high-s5-空间直线与平面",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-空间直线与平面/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Transparent solids and planes show line-plane relations, parallelism, perpendicularity, and distance cues.",
      "zh": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。",
      "zhHans": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。"
    },
    "caption": {
      "en": "Spatial geometry needs explicit line-plane relations, not only visual appearance.",
      "zh": "立体几何要依据明确的线面关系推理，不能只凭外观。",
      "zhHans": "立体几何要依据明确的线面关系推理，不能只凭外观。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-spatial-lines-planes"
    ]
  },
  {
    "id": "hjb-high-s5-空间直线与平面-worked-example",
    "topicId": "hjb-high-s5-空间直线与平面",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-空间直线与平面/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A spatial-geometry workspace adds an auxiliary plane and right-angle cue inside a transparent solid.",
      "zh": "立体几何工作区在透明几何体内加入辅助平面和直角线索。",
      "zhHans": "立体几何工作区在透明几何体内加入辅助平面和直角线索。"
    },
    "caption": {
      "en": "Add auxiliary planes or segments to turn spatial relations into visible arguments.",
      "zh": "加入辅助平面或线段，把空间关系转化为可见论证。",
      "zhHans": "加入辅助平面或线段，把空间关系转化为可见论证。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-spatial-lines-planes"
    ]
  },
  {
    "id": "hjb-high-s5-平面直角坐标系中的直线-concept",
    "topicId": "hjb-high-s5-平面直角坐标系中的直线",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-平面直角坐标系中的直线/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Coordinate lines with slope triangles and intercept markers show analytic-geometry structure.",
      "zh": "坐标直线、斜率三角形和截距标记展示解析几何结构。",
      "zhHans": "坐标直线、斜率三角形和截距标记展示解析几何结构。"
    },
    "caption": {
      "en": "Line problems become clearer when slope, intercept, distance, and position are separated.",
      "zh": "直线问题要分清斜率、截距、距离和位置关系。",
      "zhHans": "直线问题要分清斜率、截距、距离和位置关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s5-平面直角坐标系中的直线-worked-example",
    "topicId": "hjb-high-s5-平面直角坐标系中的直线",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-平面直角坐标系中的直线/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An analytic-geometry workspace builds a line from points and checks slope and distance.",
      "zh": "解析几何工作区由点构造直线，并检查斜率和距离。",
      "zhHans": "解析几何工作区由点构造直线，并检查斜率和距离。"
    },
    "caption": {
      "en": "Translate geometric conditions into coordinate checks before solving.",
      "zh": "求解前先把几何条件转化为坐标检查。",
      "zhHans": "求解前先把几何条件转化为坐标检查。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s5-数列-concept",
    "topicId": "hjb-high-s5-数列",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-数列/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Sequence tiles with difference arrows, ratio arcs, and sum blocks show ordered growth.",
      "zh": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。",
      "zhHans": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。"
    },
    "caption": {
      "en": "A sequence should be read by term position, change pattern, and sum structure.",
      "zh": "数列要从项的位置、变化规律和求和结构来读。",
      "zhHans": "数列要从项的位置、变化规律和求和结构来读。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences"
    ]
  },
  {
    "id": "hjb-high-s5-数列-worked-example",
    "topicId": "hjb-high-s5-数列",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-数列/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sequence workspace extends early terms to a general position and checks a sum model.",
      "zh": "数列工作区从前几项推广到一般位置，并检查求和模型。",
      "zhHans": "数列工作区从前几项推广到一般位置，并检查求和模型。"
    },
    "caption": {
      "en": "Look for the recurrence or common change before writing a general rule.",
      "zh": "写通项前，先寻找递推关系或共同变化。",
      "zhHans": "写通项前，先寻找递推关系或共同变化。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences"
    ]
  },
  {
    "id": "hjb-high-s5-统计-concept",
    "topicId": "hjb-high-s5-统计",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-统计/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Data points transform into distribution and scatter visuals to show center, spread, and trend.",
      "zh": "数据点转化为分布图和散点图，展示中心、离散和趋势。",
      "zhHans": "数据点转化为分布图和散点图，展示中心、离散和趋势。"
    },
    "caption": {
      "en": "Statistics turns data into evidence by describing distribution, spread, and relationship.",
      "zh": "统计把数据转化为证据，要描述分布、离散和关系。",
      "zhHans": "统计把数据转化为证据，要描述分布、离散和关系。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-statistics"
    ]
  },
  {
    "id": "hjb-high-s5-统计-worked-example",
    "topicId": "hjb-high-s5-统计",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-统计/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A data workspace compares distributions and a paired-data scatter plot with a trend band.",
      "zh": "数据工作区比较两个分布，并用趋势带分析成对数据散点图。",
      "zhHans": "数据工作区比较两个分布，并用趋势带分析成对数据散点图。"
    },
    "caption": {
      "en": "Compare shape and spread before making a conclusion from the data.",
      "zh": "根据数据下结论前，要先比较形状和离散程度。",
      "zhHans": "根据数据下结论前，要先比较形状和离散程度。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-statistics"
    ]
  },
  {
    "id": "hjb-high-s5-圆锥曲线-concept",
    "topicId": "hjb-high-s5-圆锥曲线",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-圆锥曲线/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Conic outlines on a coordinate plane show axes, foci, and geometric constraints.",
      "zh": "坐标平面上的圆锥曲线轮廓展示轴、焦点和几何约束。",
      "zhHans": "坐标平面上的圆锥曲线轮廓展示轴、焦点和几何约束。"
    },
    "caption": {
      "en": "Conic sections connect equations with focus, axis, and distance relationships.",
      "zh": "圆锥曲线把方程与焦点、轴和距离关系联系起来。",
      "zhHans": "圆锥曲线把方程与焦点、轴和距离关系联系起来。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-conics"
    ]
  },
  {
    "id": "hjb-high-s5-圆锥曲线-worked-example",
    "topicId": "hjb-high-s5-圆锥曲线",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s5-圆锥曲线/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A conic workspace highlights one curve with focus points, an axis, and coordinate checks.",
      "zh": "圆锥曲线工作区突出一条曲线、焦点、轴线和坐标检查。",
      "zhHans": "圆锥曲线工作区突出一条曲线、焦点、轴线和坐标检查。"
    },
    "caption": {
      "en": "Identify the curve type and key elements before calculating parameters.",
      "zh": "计算参数前，先判断曲线类型和关键元素。",
      "zhHans": "计算参数前，先判断曲线类型和关键元素。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-conics"
    ]
  },
  {
    "id": "hjb-high-s6-成对数据的统计分析-concept",
    "topicId": "hjb-high-s6-成对数据的统计分析",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-成对数据的统计分析/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Data points transform into distribution and scatter visuals to show center, spread, and trend.",
      "zh": "数据点转化为分布图和散点图，展示中心、离散和趋势。",
      "zhHans": "数据点转化为分布图和散点图，展示中心、离散和趋势。"
    },
    "caption": {
      "en": "Statistics turns data into evidence by describing distribution, spread, and relationship.",
      "zh": "统计把数据转化为证据，要描述分布、离散和关系。",
      "zhHans": "统计把数据转化为证据，要描述分布、离散和关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-bivariate-data"
    ]
  },
  {
    "id": "hjb-high-s6-成对数据的统计分析-worked-example",
    "topicId": "hjb-high-s6-成对数据的统计分析",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-成对数据的统计分析/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A data workspace compares distributions and a paired-data scatter plot with a trend band.",
      "zh": "数据工作区比较两个分布，并用趋势带分析成对数据散点图。",
      "zhHans": "数据工作区比较两个分布，并用趋势带分析成对数据散点图。"
    },
    "caption": {
      "en": "Compare shape and spread before making a conclusion from the data.",
      "zh": "根据数据下结论前，要先比较形状和离散程度。",
      "zhHans": "根据数据下结论前，要先比较形状和离散程度。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-bivariate-data"
    ]
  },
  {
    "id": "hjb-high-s6-导数及其运用-concept",
    "topicId": "hjb-high-s6-导数及其运用",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-导数及其运用/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A curve with tangent lines and extrema markers shows derivative slope and interval behavior.",
      "zh": "曲线、切线和极值标记展示导数斜率与区间变化。",
      "zhHans": "曲线、切线和极值标记展示导数斜率与区间变化。"
    },
    "caption": {
      "en": "A derivative turns local change into slope information that guides monotonicity and extrema.",
      "zh": "导数把局部变化转化为斜率信息，用来判断单调性和极值。",
      "zhHans": "导数把局部变化转化为斜率信息，用来判断单调性和极值。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-derivatives"
    ]
  },
  {
    "id": "hjb-high-s6-导数及其运用-worked-example",
    "topicId": "hjb-high-s6-导数及其运用",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-导数及其运用/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A derivative workspace moves from tangent-slope signs to an interval chart and curve check.",
      "zh": "导数工作区从切线斜率符号推进到区间表和曲线检查。",
      "zhHans": "导数工作区从切线斜率符号推进到区间表和曲线检查。"
    },
    "caption": {
      "en": "Use sign changes to locate behavior, then check the curve before concluding.",
      "zh": "用符号变化定位函数行为，再用曲线检查结论。",
      "zhHans": "用符号变化定位函数行为，再用曲线检查结论。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-derivatives"
    ]
  },
  {
    "id": "hjb-high-s6-概率初步续-concept",
    "topicId": "hjb-high-s6-概率初步续",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-概率初步续/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sample-space grid, event regions, branches, and simulation trail show probability structure.",
      "zh": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。",
      "zhHans": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。"
    },
    "caption": {
      "en": "Begin with the sample space, then describe events and their relationships.",
      "zh": "先确定样本空间，再描述事件及其关系。",
      "zhHans": "先确定样本空间，再描述事件及其关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-probability-continuation"
    ]
  },
  {
    "id": "hjb-high-s6-概率初步续-worked-example",
    "topicId": "hjb-high-s6-概率初步续",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-概率初步续/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A probability board narrows all outcomes to a highlighted event and checks complement counts.",
      "zh": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。",
      "zhHans": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。"
    },
    "caption": {
      "en": "List the possible outcomes first to avoid missing or double-counting favorable cases.",
      "zh": "先列清所有可能结果，避免漏数或重复计数。",
      "zhHans": "先列清所有可能结果，避免漏数或重复计数。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-probability-continuation"
    ]
  },
  {
    "id": "hjb-high-s6-概率统计综合-concept",
    "topicId": "hjb-high-s6-概率统计综合",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-概率统计综合/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sample-space grid, event regions, branches, and simulation trail show probability structure.",
      "zh": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。",
      "zhHans": "样本空间网格、事件区域、分支和模拟轨迹展示概率结构。"
    },
    "caption": {
      "en": "Begin with the sample space, then describe events and their relationships.",
      "zh": "先确定样本空间，再描述事件及其关系。",
      "zhHans": "先确定样本空间，再描述事件及其关系。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-probability-foundations",
      "hjb-high-compulsory-3-statistics",
      "hjb-high-selective-2-probability-continuation",
      "hjb-high-selective-2-bivariate-data"
    ]
  },
  {
    "id": "hjb-high-s6-概率统计综合-worked-example",
    "topicId": "hjb-high-s6-概率统计综合",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-概率统计综合/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A probability board narrows all outcomes to a highlighted event and checks complement counts.",
      "zh": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。",
      "zhHans": "概率板从全部结果缩小到高亮事件，并检查补集或分支计数。"
    },
    "caption": {
      "en": "List the possible outcomes first to avoid missing or double-counting favorable cases.",
      "zh": "先列清所有可能结果，避免漏数或重复计数。",
      "zhHans": "先列清所有可能结果，避免漏数或重复计数。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-probability-foundations",
      "hjb-high-compulsory-3-statistics",
      "hjb-high-selective-2-probability-continuation",
      "hjb-high-selective-2-bivariate-data"
    ]
  },
  {
    "id": "hjb-high-s6-函数-导数与不等式综合-concept",
    "topicId": "hjb-high-s6-函数-导数与不等式综合",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-函数-导数与不等式综合/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A balance scale, number line, and parabola connect equality, inequality, roots, and sign intervals.",
      "zh": "天平、数轴和抛物线把等式、不等式、根和符号区间联系起来。",
      "zhHans": "天平、数轴和抛物线把等式、不等式、根和符号区间联系起来。"
    },
    "caption": {
      "en": "Equivalent transformations must preserve the solution set and interval endpoints.",
      "zh": "等价变形要保持解集和端点判断不变。",
      "zhHans": "等价变形要保持解集和端点判断不变。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-function-concepts-applications",
      "hjb-high-selective-2-derivatives"
    ]
  },
  {
    "id": "hjb-high-s6-函数-导数与不等式综合-worked-example",
    "topicId": "hjb-high-s6-函数-导数与不等式综合",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-函数-导数与不等式综合/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sign chart beside a parabola highlights endpoint choices and valid solution intervals.",
      "zh": "抛物线旁的符号表突出端点选择和有效解区间。",
      "zhHans": "抛物线旁的符号表突出端点选择和有效解区间。"
    },
    "caption": {
      "en": "Mark roots, test intervals, then write only the regions that satisfy the inequality.",
      "zh": "先标根，再测区间，最后只写满足不等式的部分。",
      "zhHans": "先标根，再测区间，最后只写满足不等式的部分。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-1-function-concepts-applications",
      "hjb-high-selective-2-derivatives"
    ]
  },
  {
    "id": "hjb-high-s6-计数原理-concept",
    "topicId": "hjb-high-s6-计数原理",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-计数原理/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Branching choices, arrangement grids, and grouping boxes show counting-principle structure.",
      "zh": "分步分支、排列网格和分组框展示计数原理结构。",
      "zhHans": "分步分支、排列网格和分组框展示计数原理结构。"
    },
    "caption": {
      "en": "Counting starts by deciding whether choices are ordered, grouped, or staged.",
      "zh": "计数先要判断选择是有顺序、需分组，还是分步完成。",
      "zhHans": "计数先要判断选择是有顺序、需分组，还是分步完成。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-counting-principles"
    ]
  },
  {
    "id": "hjb-high-s6-计数原理-worked-example",
    "topicId": "hjb-high-s6-计数原理",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-计数原理/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A counting workspace separates stages and compares ordered routes with unordered groups.",
      "zh": "计数工作区分离步骤，并比较有序路径和无序分组。",
      "zhHans": "计数工作区分离步骤，并比较有序路径和无序分组。"
    },
    "caption": {
      "en": "Partition the cases cleanly so no outcome is missed or counted twice.",
      "zh": "把情况划分清楚，才能避免遗漏或重复计数。",
      "zhHans": "把情况划分清楚，才能避免遗漏或重复计数。"
    },
    "ragCardIds": [
      "hjb-high-selective-2-counting-principles"
    ]
  },
  {
    "id": "hjb-high-s6-解析几何直线综合复习-concept",
    "topicId": "hjb-high-s6-解析几何直线综合复习",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-解析几何直线综合复习/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Coordinate lines with slope triangles and intercept markers show analytic-geometry structure.",
      "zh": "坐标直线、斜率三角形和截距标记展示解析几何结构。",
      "zhHans": "坐标直线、斜率三角形和截距标记展示解析几何结构。"
    },
    "caption": {
      "en": "Line problems become clearer when slope, intercept, distance, and position are separated.",
      "zh": "直线问题要分清斜率、截距、距离和位置关系。",
      "zhHans": "直线问题要分清斜率、截距、距离和位置关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s6-解析几何直线综合复习-worked-example",
    "topicId": "hjb-high-s6-解析几何直线综合复习",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-解析几何直线综合复习/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An analytic-geometry workspace builds a line from points and checks slope and distance.",
      "zh": "解析几何工作区由点构造直线，并检查斜率和距离。",
      "zhHans": "解析几何工作区由点构造直线，并检查斜率和距离。"
    },
    "caption": {
      "en": "Translate geometric conditions into coordinate checks before solving.",
      "zh": "求解前先把几何条件转化为坐标检查。",
      "zhHans": "求解前先把几何条件转化为坐标检查。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s6-空间向量综合复习-concept",
    "topicId": "hjb-high-s6-空间向量综合复习",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-空间向量综合复习/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "3D coordinate arrows and component shadows show spatial vectors, angles, and plane normals.",
      "zh": "三维坐标箭头和分量投影展示空间向量、夹角和平面法向量。",
      "zhHans": "三维坐标箭头和分量投影展示空间向量、夹角和平面法向量。"
    },
    "caption": {
      "en": "Spatial vectors translate geometry into coordinates, components, and products.",
      "zh": "空间向量把几何关系转化为坐标、分量和数量积。",
      "zhHans": "空间向量把几何关系转化为坐标、分量和数量积。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s6-空间向量综合复习-worked-example",
    "topicId": "hjb-high-s6-空间向量综合复习",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-空间向量综合复习/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A 3D vector workspace projects an arrow and compares it with a plane normal.",
      "zh": "三维向量工作区投影箭头，并与平面法向量比较。",
      "zhHans": "三维向量工作区投影箭头，并与平面法向量比较。"
    },
    "caption": {
      "en": "Use components and normal directions to check angle, distance, or perpendicularity.",
      "zh": "用分量和法向方向检查夹角、距离或垂直关系。",
      "zhHans": "用分量和法向方向检查夹角、距离或垂直关系。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s6-立体几何与空间向量综合-concept",
    "topicId": "hjb-high-s6-立体几何与空间向量综合",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-立体几何与空间向量综合/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Transparent solids and planes show line-plane relations, parallelism, perpendicularity, and distance cues.",
      "zh": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。",
      "zhHans": "透明立体和辅助平面展示线面关系、平行、垂直和距离线索。"
    },
    "caption": {
      "en": "Spatial geometry needs explicit line-plane relations, not only visual appearance.",
      "zh": "立体几何要依据明确的线面关系推理，不能只凭外观。",
      "zhHans": "立体几何要依据明确的线面关系推理，不能只凭外观。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-spatial-lines-planes",
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s6-立体几何与空间向量综合-worked-example",
    "topicId": "hjb-high-s6-立体几何与空间向量综合",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-立体几何与空间向量综合/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A spatial-geometry workspace adds an auxiliary plane and right-angle cue inside a transparent solid.",
      "zh": "立体几何工作区在透明几何体内加入辅助平面和直角线索。",
      "zhHans": "立体几何工作区在透明几何体内加入辅助平面和直角线索。"
    },
    "caption": {
      "en": "Add auxiliary planes or segments to turn spatial relations into visible arguments.",
      "zh": "加入辅助平面或线段，把空间关系转化为可见论证。",
      "zhHans": "加入辅助平面或线段，把空间关系转化为可见论证。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-3-spatial-lines-planes",
      "hjb-high-selective-1-space-vectors"
    ]
  },
  {
    "id": "hjb-high-s6-三角-向量与解析几何综合-concept",
    "topicId": "hjb-high-s6-三角-向量与解析几何综合",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-三角-向量与解析几何综合/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A unit circle links angle rotation to trigonometric waveforms, signs, and periods.",
      "zh": "单位圆把角的旋转与三角函数波形、符号和周期联系起来。",
      "zhHans": "单位圆把角的旋转与三角函数波形、符号和周期联系起来。"
    },
    "caption": {
      "en": "Use the unit circle to explain signs, reference angles, and periodic graph behavior.",
      "zh": "用单位圆解释符号、参考角和图像周期。",
      "zhHans": "用单位圆解释符号、参考角和图像周期。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometric-functions",
      "hjb-high-compulsory-2-plane-vectors",
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s6-三角-向量与解析几何综合-worked-example",
    "topicId": "hjb-high-s6-三角-向量与解析几何综合",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-三角-向量与解析几何综合/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A trigonometry workspace checks a unit-circle angle against highlighted waveform intervals.",
      "zh": "三角工作区把单位圆上的角与波形中的高亮区间互相检查。",
      "zhHans": "三角工作区把单位圆上的角与波形中的高亮区间互相检查。"
    },
    "caption": {
      "en": "Judge the sign and reference angle first, then use the period to complete the solution.",
      "zh": "先判断符号和参考角，再利用周期补全解。",
      "zhHans": "先判断符号和参考角，再利用周期补全解。"
    },
    "ragCardIds": [
      "hjb-high-compulsory-2-trigonometric-functions",
      "hjb-high-compulsory-2-plane-vectors",
      "hjb-high-selective-1-lines"
    ]
  },
  {
    "id": "hjb-high-s6-数列与计数综合-concept",
    "topicId": "hjb-high-s6-数列与计数综合",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-数列与计数综合/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Sequence tiles with difference arrows, ratio arcs, and sum blocks show ordered growth.",
      "zh": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。",
      "zhHans": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。"
    },
    "caption": {
      "en": "A sequence should be read by term position, change pattern, and sum structure.",
      "zh": "数列要从项的位置、变化规律和求和结构来读。",
      "zhHans": "数列要从项的位置、变化规律和求和结构来读。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences",
      "hjb-high-selective-2-counting-principles"
    ]
  },
  {
    "id": "hjb-high-s6-数列与计数综合-worked-example",
    "topicId": "hjb-high-s6-数列与计数综合",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-数列与计数综合/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sequence workspace extends early terms to a general position and checks a sum model.",
      "zh": "数列工作区从前几项推广到一般位置，并检查求和模型。",
      "zhHans": "数列工作区从前几项推广到一般位置，并检查求和模型。"
    },
    "caption": {
      "en": "Look for the recurrence or common change before writing a general rule.",
      "zh": "写通项前，先寻找递推关系或共同变化。",
      "zhHans": "写通项前，先寻找递推关系或共同变化。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences",
      "hjb-high-selective-2-counting-principles"
    ]
  },
  {
    "id": "hjb-high-s6-数列综合复习-concept",
    "topicId": "hjb-high-s6-数列综合复习",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-数列综合复习/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Sequence tiles with difference arrows, ratio arcs, and sum blocks show ordered growth.",
      "zh": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。",
      "zhHans": "数列方块、差分箭头、比值弧线和求和模块展示有序增长。"
    },
    "caption": {
      "en": "A sequence should be read by term position, change pattern, and sum structure.",
      "zh": "数列要从项的位置、变化规律和求和结构来读。",
      "zhHans": "数列要从项的位置、变化规律和求和结构来读。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences"
    ]
  },
  {
    "id": "hjb-high-s6-数列综合复习-worked-example",
    "topicId": "hjb-high-s6-数列综合复习",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-数列综合复习/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sequence workspace extends early terms to a general position and checks a sum model.",
      "zh": "数列工作区从前几项推广到一般位置，并检查求和模型。",
      "zhHans": "数列工作区从前几项推广到一般位置，并检查求和模型。"
    },
    "caption": {
      "en": "Look for the recurrence or common change before writing a general rule.",
      "zh": "写通项前，先寻找递推关系或共同变化。",
      "zhHans": "写通项前，先寻找递推关系或共同变化。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-sequences"
    ]
  },
  {
    "id": "hjb-high-s6-圆锥曲线综合复习-concept",
    "topicId": "hjb-high-s6-圆锥曲线综合复习",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-圆锥曲线综合复习/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Conic outlines on a coordinate plane show axes, foci, and geometric constraints.",
      "zh": "坐标平面上的圆锥曲线轮廓展示轴、焦点和几何约束。",
      "zhHans": "坐标平面上的圆锥曲线轮廓展示轴、焦点和几何约束。"
    },
    "caption": {
      "en": "Conic sections connect equations with focus, axis, and distance relationships.",
      "zh": "圆锥曲线把方程与焦点、轴和距离关系联系起来。",
      "zhHans": "圆锥曲线把方程与焦点、轴和距离关系联系起来。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-conics"
    ]
  },
  {
    "id": "hjb-high-s6-圆锥曲线综合复习-worked-example",
    "topicId": "hjb-high-s6-圆锥曲线综合复习",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-high/hjb-high-s6-圆锥曲线综合复习/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A conic workspace highlights one curve with focus points, an axis, and coordinate checks.",
      "zh": "圆锥曲线工作区突出一条曲线、焦点、轴线和坐标检查。",
      "zhHans": "圆锥曲线工作区突出一条曲线、焦点、轴线和坐标检查。"
    },
    "caption": {
      "en": "Identify the curve type and key elements before calculating parameters.",
      "zh": "计算参数前，先判断曲线类型和关键元素。",
      "zhHans": "计算参数前，先判断曲线类型和关键元素。"
    },
    "ragCardIds": [
      "hjb-high-selective-1-conics"
    ]
  }
] satisfies MainlandHjbHighLessonIllustration[];

export const mainlandHjbHighLessonIllustrationWithdrawal = {
  date: "2026-07-31",
  decision: "withdrawn-assets-removed",
  scope: "MAINLAND_HJB high-school lesson illustrations",
  reason:
    "Commit 852fe6dd39 (2026-06-20) removed the low-quality PNG assets under public/lesson-illustrations/mainland-hjb-high/ but left this metadata live, so every rendered lesson illustration resolved to a 404. Withdrawn from live lessons pending replacement asset production and approval."
} as const;

export const mainlandHjbHighLessonIllustrations: MainlandHjbHighLessonIllustration[] = [];

export function getMainlandHjbHighLessonIllustration(
  _topicId: string,
  _slot: MainlandHjbHighLessonIllustrationSlot
): MainlandHjbHighLessonIllustration | null {
  return null;
}
