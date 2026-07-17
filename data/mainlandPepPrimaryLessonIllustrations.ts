import type { LocalizedText } from "@/types";

export type MainlandPepPrimaryLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandPepPrimaryLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandPepPrimaryLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

// Draft metadata authored ahead of asset production. The live export below is
// withdrawn until approved PNG assets exist under
// public/lesson-illustrations/mainland-pep-primary/.
export const mainlandPepPrimaryLessonIllustrationDrafts = [
  {
    "id": "pep-primary-p1-upper-number-sense-concept",
    "topicId": "pep-primary-p1-upper-number-sense",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-upper-number-sense/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Ten-frame counters and grouped dots show counting, comparing, and breaking apart numbers within 20.",
      "zh": "十格计数片和分组点子展示20以内数的数数、比较和分解组成。",
      "zhHans": "十格计数片和分组点子展示20以内数的数数、比较和分解组成。"
    },
    "caption": {
      "en": "Small numbers become clearer when learners see the whole, the parts, and the counting path.",
      "zh": "小数目的学习要同时看整体、部分和数数路径。",
      "zhHans": "小数目的学习要同时看整体、部分和数数路径。"
    },
    "ragCardIds": [
      "pep-primary-p1-upper-number-sense-within-20",
      "pep-primary-p1-upper-shapes-position-clock"
    ]
  },
  {
    "id": "pep-primary-p1-upper-number-sense-worked-example",
    "topicId": "pep-primary-p1-upper-number-sense",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-upper-number-sense/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A make-ten workspace moves counters into a full ten-frame, then shows the leftover counters as the next part.",
      "zh": "凑十工作区把计数片移入完整十格，再把剩余计数片作为下一部分。",
      "zhHans": "凑十工作区把计数片移入完整十格，再把剩余计数片作为下一部分。"
    },
    "caption": {
      "en": "Make ten first, then add the remaining part to check the answer.",
      "zh": "先凑成十，再加上剩余部分来检查答案。",
      "zhHans": "先凑成十，再加上剩余部分来检查答案。"
    },
    "ragCardIds": [
      "pep-primary-p1-upper-number-sense-within-20",
      "pep-primary-p1-upper-shapes-position-clock"
    ]
  },
  {
    "id": "pep-primary-p1-upper-shapes-position-time-concept",
    "topicId": "pep-primary-p1-upper-shapes-position-time",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-upper-shapes-position-time/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Simple shapes, position arrows, and a whole-hour clock support shape sorting and spatial language.",
      "zh": "简单图形、位置箭头和整时钟面帮助学生分类图形并表达位置。",
      "zhHans": "简单图形、位置箭头和整时钟面帮助学生分类图形并表达位置。"
    },
    "caption": {
      "en": "Name the object, describe where it is, and use the clock hands carefully.",
      "zh": "先说出物体名称，再描述位置，并仔细观察钟面指针。",
      "zhHans": "先说出物体名称，再描述位置，并仔细观察钟面指针。"
    },
    "ragCardIds": [
      "pep-primary-p1-upper-number-sense-within-20",
      "pep-primary-p1-upper-shapes-position-clock"
    ]
  },
  {
    "id": "pep-primary-p1-upper-shapes-position-time-worked-example",
    "topicId": "pep-primary-p1-upper-shapes-position-time",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-upper-shapes-position-time/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A sorting mat places shapes around a center object and includes a whole-hour clock check.",
      "zh": "分类垫把图形放在中心物体的上下左右，并加入整时钟面检查。",
      "zhHans": "分类垫把图形放在中心物体的上下左右，并加入整时钟面检查。"
    },
    "caption": {
      "en": "Use position words and object features together, not just one visual clue.",
      "zh": "要把位置词和物体特征结合起来判断，而不能只看单一线索。",
      "zhHans": "要把位置词和物体特征结合起来判断，而不能只看单一线索。"
    },
    "ragCardIds": [
      "pep-primary-p1-upper-number-sense-within-20",
      "pep-primary-p1-upper-shapes-position-clock"
    ]
  },
  {
    "id": "pep-primary-p1-lower-within-100-add-sub-concept",
    "topicId": "pep-primary-p1-lower-within-100-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-lower-within-100-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Bundles of ten, loose ones, and a number line connect place value with addition and subtraction within 100.",
      "zh": "十根一捆和散放个位配合数线，把100以内位值与加减法联系起来。",
      "zhHans": "十根一捆和散放个位配合数线，把100以内位值与加减法联系起来。"
    },
    "caption": {
      "en": "Read tens and ones first, then decide whether the story moves forward or backward.",
      "zh": "先读十位和个位，再判断情境是在向前增加还是向后减少。",
      "zhHans": "先读十位和个位，再判断情境是在向前增加还是向后减少。"
    },
    "ragCardIds": [
      "pep-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "pep-primary-p1-lower-within-100-add-sub-worked-example",
    "topicId": "pep-primary-p1-lower-within-100-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-lower-within-100-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Loose counters regroup into one ten bundle while a number-line jump checks the answer.",
      "zh": "散放计数片重新组成一捆十，旁边用数线跳步检查答案。",
      "zhHans": "散放计数片重新组成一捆十，旁边用数线跳步检查答案。"
    },
    "caption": {
      "en": "Regrouping works because ten ones can be traded for one ten.",
      "zh": "重组的关键是十个一可以换成一个十。",
      "zhHans": "重组的关键是十个一可以换成一个十。"
    },
    "ragCardIds": [
      "pep-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "pep-primary-p1-lower-money-data-review-concept",
    "topicId": "pep-primary-p1-lower-money-data-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-lower-money-data-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Toy coins, a simple chart, and a clock face show money, time, and data as everyday quantities.",
      "zh": "玩具硬币、简单统计图和钟面把人民币、时间和数据表示成日常数量。",
      "zhHans": "玩具硬币、简单统计图和钟面把人民币、时间和数据表示成日常数量。"
    },
    "caption": {
      "en": "Everyday math starts by naming the unit and reading the representation.",
      "zh": "生活中的数学要先说清单位，再读懂表示方法。",
      "zhHans": "生活中的数学要先说清单位，再读懂表示方法。"
    },
    "ragCardIds": [
      "pep-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "pep-primary-p1-lower-money-data-review-worked-example",
    "topicId": "pep-primary-p1-lower-money-data-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p1-lower-money-data-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A counting tray groups toy coins beside a clock check and an original picture graph.",
      "zh": "计数盘把玩具硬币分组，旁边配有钟面检查和原创图标统计图。",
      "zhHans": "计数盘把玩具硬币分组，旁边配有钟面检查和原创图标统计图。"
    },
    "caption": {
      "en": "Group the value, read the time, then compare the data carefully.",
      "zh": "先分组看价值，再读时间，最后认真比较数据。",
      "zhHans": "先分组看价值，再读时间，最后认真比较数据。"
    },
    "ragCardIds": [
      "pep-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "pep-primary-p2-upper-multiplication-arrays-concept",
    "topicId": "pep-primary-p2-upper-multiplication-arrays",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-upper-multiplication-arrays/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups of counters transform into an array to show the meaning of multiplication.",
      "zh": "相同数量的小组转化为阵列，展示乘法的意义。",
      "zhHans": "相同数量的小组转化为阵列，展示乘法的意义。"
    },
    "caption": {
      "en": "Multiplication is easier to trust when each group is equal.",
      "zh": "每组数量相同时，乘法模型才清楚可靠。",
      "zhHans": "每组数量相同时，乘法模型才清楚可靠。"
    },
    "ragCardIds": [
      "pep-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "pep-primary-p2-upper-multiplication-arrays-worked-example",
    "topicId": "pep-primary-p2-upper-multiplication-arrays",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-upper-multiplication-arrays/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An array-building workspace highlights rows and checks the total by equal groups.",
      "zh": "阵列工作区逐行高亮，并用相同小组检查总数。",
      "zhHans": "阵列工作区逐行高亮，并用相同小组检查总数。"
    },
    "caption": {
      "en": "Count rows, count items in each row, then check with equal groups.",
      "zh": "先数行数，再数每行个数，最后用相同小组检查。",
      "zhHans": "先数行数，再数每行个数，最后用相同小组检查。"
    },
    "ragCardIds": [
      "pep-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "pep-primary-p2-upper-length-angles-observation-concept",
    "topicId": "pep-primary-p2-upper-length-angles-observation",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-upper-length-angles-observation/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A ruler, angle arms, and view cards connect length measurement, angle recognition, and observation.",
      "zh": "尺子、角的两边和观察卡片联系长度测量、角的认识和观察物体。",
      "zhHans": "尺子、角的两边和观察卡片联系长度测量、角的认识和观察物体。"
    },
    "caption": {
      "en": "Choose the unit, align the ruler, and describe the view from the correct side.",
      "zh": "先选单位，尺子要对齐，并从正确方向描述看到的样子。",
      "zhHans": "先选单位，尺子要对齐，并从正确方向描述看到的样子。"
    },
    "ragCardIds": [
      "pep-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "pep-primary-p2-upper-length-angles-observation-worked-example",
    "topicId": "pep-primary-p2-upper-length-angles-observation",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-upper-length-angles-observation/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A measurement station aligns objects to a ruler, highlights an angle, and compares view silhouettes.",
      "zh": "测量台把物体与尺子对齐，突出一个角，并比较不同方向的轮廓。",
      "zhHans": "测量台把物体与尺子对齐，突出一个角，并比较不同方向的轮廓。"
    },
    "caption": {
      "en": "A careful setup prevents length, angle, and view-reading mistakes.",
      "zh": "摆放和观察要仔细，才能避免长度、角和视图判断错误。",
      "zhHans": "摆放和观察要仔细，才能避免长度、角和视图判断错误。"
    },
    "ragCardIds": [
      "pep-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "pep-primary-p2-lower-division-remainder-concept",
    "topicId": "pep-primary-p2-lower-division-remainder",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-lower-division-remainder/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Counters are shared into equal plates and grouped into boxes, with leftovers kept visible.",
      "zh": "计数片被平均分到盘子里，也被按固定大小分组，剩余部分清楚可见。",
      "zhHans": "计数片被平均分到盘子里，也被按固定大小分组，剩余部分清楚可见。"
    },
    "caption": {
      "en": "Division can mean fair sharing or grouping, and the remainder must be smaller than one group.",
      "zh": "除法可以表示平均分或包含分，余数必须比一组的数量小。",
      "zhHans": "除法可以表示平均分或包含分，余数必须比一组的数量小。"
    },
    "ragCardIds": [
      "pep-primary-p2-lower-division-measurement-data"
    ]
  },
  {
    "id": "pep-primary-p2-lower-division-remainder-worked-example",
    "topicId": "pep-primary-p2-lower-division-remainder",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-lower-division-remainder/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A division workspace deals counters into equal groups and separates leftovers for checking.",
      "zh": "除法工作区把计数片分入相同小组，并把剩余计数片单独检查。",
      "zhHans": "除法工作区把计数片分入相同小组，并把剩余计数片单独检查。"
    },
    "caption": {
      "en": "Build equal groups first, then decide what the leftover means.",
      "zh": "先建立相同小组，再判断剩余部分表示什么。",
      "zhHans": "先建立相同小组，再判断剩余部分表示什么。"
    },
    "ragCardIds": [
      "pep-primary-p2-lower-division-measurement-data"
    ]
  },
  {
    "id": "pep-primary-p2-lower-place-value-measurement-data-concept",
    "topicId": "pep-primary-p2-lower-place-value-measurement-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-lower-place-value-measurement-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, mass cues, time marks, and data tiles connect thousands, measurement, and data.",
      "zh": "位值块、质量线索、时间标记和数据方块联系万以内数、测量和统计。",
      "zhHans": "位值块、质量线索、时间标记和数据方块联系万以内数、测量和统计。"
    },
    "caption": {
      "en": "Large numbers and measurements both depend on reading the unit position correctly.",
      "zh": "读大数和读测量结果都要看清单位所在的位置。",
      "zhHans": "读大数和读测量结果都要看清单位所在的位置。"
    },
    "ragCardIds": [
      "pep-primary-p2-lower-division-measurement-data"
    ]
  },
  {
    "id": "pep-primary-p2-lower-place-value-measurement-data-worked-example",
    "topicId": "pep-primary-p2-lower-place-value-measurement-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p2-lower-place-value-measurement-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A comparison board uses place-value blocks, mass objects, time intervals, and category counts.",
      "zh": "比较板使用位值块、质量物体、时间间隔和分类数量。",
      "zhHans": "比较板使用位值块、质量物体、时间间隔和分类数量。"
    },
    "caption": {
      "en": "Compare by place value first, then use units to interpret the situation.",
      "zh": "先按位值比较，再用单位解释情境。",
      "zhHans": "先按位值比较，再用单位解释情境。"
    },
    "ragCardIds": [
      "pep-primary-p2-lower-division-measurement-data"
    ]
  },
  {
    "id": "pep-primary-p3-upper-operations-fractions-concept",
    "topicId": "pep-primary-p3-upper-operations-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-upper-operations-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Operation cards and equal-part fraction models connect multi-digit calculation with fraction meaning.",
      "zh": "多位数运算卡片和平均分的分数模型联系计算与分数意义。",
      "zhHans": "多位数运算卡片和平均分的分数模型联系计算与分数意义。"
    },
    "caption": {
      "en": "Estimate the calculation and identify the whole before naming a fraction.",
      "zh": "先估算结果，再确认整体，才能准确说出分数。",
      "zhHans": "先估算结果，再确认整体，才能准确说出分数。"
    },
    "ragCardIds": [
      "pep-primary-p3-upper-multidigit-operations-fractions"
    ]
  },
  {
    "id": "pep-primary-p3-upper-operations-fractions-worked-example",
    "topicId": "pep-primary-p3-upper-operations-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-upper-operations-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Aligned place-value columns sit beside a shaded equal-parts model with the whole outlined.",
      "zh": "对齐的位值栏旁边放着平均分阴影模型，并清楚标出整体。",
      "zhHans": "对齐的位值栏旁边放着平均分阴影模型，并清楚标出整体。"
    },
    "caption": {
      "en": "Line up place value for operations and line up equal parts for fractions.",
      "zh": "运算要对齐位值，分数要看清平均分的整体。",
      "zhHans": "运算要对齐位值，分数要看清平均分的整体。"
    },
    "ragCardIds": [
      "pep-primary-p3-upper-multidigit-operations-fractions"
    ]
  },
  {
    "id": "pep-primary-p3-upper-measurement-time-geometry-concept",
    "topicId": "pep-primary-p3-upper-measurement-time-geometry",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-upper-measurement-time-geometry/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Measurement units, clock arcs, angles, and pattern tiles show measurement, time, and geometry reasoning.",
      "zh": "计量单位、钟面弧线、角和规律方块展示测量、时间与几何推理。",
      "zhHans": "计量单位、钟面弧线、角和规律方块展示测量、时间与几何推理。"
    },
    "caption": {
      "en": "Measurement works best when the unit, start point, and geometric feature are all clear.",
      "zh": "测量时要看清单位、起点和几何特征。",
      "zhHans": "测量时要看清单位、起点和几何特征。"
    },
    "ragCardIds": [
      "pep-primary-p3-upper-multidigit-operations-fractions"
    ]
  },
  {
    "id": "pep-primary-p3-upper-measurement-time-geometry-worked-example",
    "topicId": "pep-primary-p3-upper-measurement-time-geometry",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-upper-measurement-time-geometry/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "An elapsed-time path links clock faces with a measuring tape and angle comparison card.",
      "zh": "经过时间路径连接两个钟面，并配有卷尺和角的比较卡。",
      "zhHans": "经过时间路径连接两个钟面，并配有卷尺和角的比较卡。"
    },
    "caption": {
      "en": "Mark the start, track the change, and check the unit at the end.",
      "zh": "先标起点，再追踪变化，最后检查单位。",
      "zhHans": "先标起点，再追踪变化，最后检查单位。"
    },
    "ragCardIds": [
      "pep-primary-p3-upper-multidigit-operations-fractions"
    ]
  },
  {
    "id": "pep-primary-p3-lower-area-decimals-concept",
    "topicId": "pep-primary-p3-lower-area-decimals",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-lower-area-decimals/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Unit-square grids, boundary highlights, and decimal tenths separate area, perimeter, and decimal meaning.",
      "zh": "单位方格、边界高亮和十分位测量条区分面积、周长和小数意义。",
      "zhHans": "单位方格、边界高亮和十分位测量条区分面积、周长和小数意义。"
    },
    "caption": {
      "en": "Area counts covering squares; perimeter follows the outside boundary.",
      "zh": "面积数覆盖的方格，周长沿外边界计算。",
      "zhHans": "面积数覆盖的方格，周长沿外边界计算。"
    },
    "ragCardIds": [
      "pep-primary-p3-lower-area-decimal-data"
    ]
  },
  {
    "id": "pep-primary-p3-lower-area-decimals-worked-example",
    "topicId": "pep-primary-p3-lower-area-decimals",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-lower-area-decimals/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A rectangle grid fills interior squares, traces boundary edges, and places a decimal on a measure strip.",
      "zh": "长方形方格填充内部方格、描出边界，并在测量条上表示小数。",
      "zhHans": "长方形方格填充内部方格、描出边界，并在测量条上表示小数。"
    },
    "caption": {
      "en": "Check whether you counted squares, edges, or decimal units.",
      "zh": "要检查自己数的是方格、边线还是小数单位。",
      "zhHans": "要检查自己数的是方格、边线还是小数单位。"
    },
    "ragCardIds": [
      "pep-primary-p3-lower-area-decimal-data"
    ]
  },
  {
    "id": "pep-primary-p3-lower-statistics-review-concept",
    "topicId": "pep-primary-p3-lower-statistics-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-lower-statistics-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Small bar charts, picture tokens, and review cards show data reading and mixed-topic comparison.",
      "zh": "小型条形图、图标统计和复习卡片展示数据读取与综合比较。",
      "zhHans": "小型条形图、图标统计和复习卡片展示数据读取与综合比较。"
    },
    "caption": {
      "en": "Data reading starts with matching each value to its category.",
      "zh": "读数据要先把每个数值和对应类别配对。",
      "zhHans": "读数据要先把每个数值和对应类别配对。"
    },
    "ragCardIds": [
      "pep-primary-p3-lower-area-decimal-data"
    ]
  },
  {
    "id": "pep-primary-p3-lower-statistics-review-worked-example",
    "topicId": "pep-primary-p3-lower-statistics-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p3-lower-statistics-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A data-reading board highlights a comparison between two colored bars and category tokens.",
      "zh": "数据读取板高亮比较两条彩色条形和对应类别图标。",
      "zhHans": "数据读取板高亮比较两条彩色条形和对应类别图标。"
    },
    "caption": {
      "en": "Read the scale, compare the bars, then state the conclusion.",
      "zh": "先读刻度，再比较条形，最后说出结论。",
      "zhHans": "先读刻度，再比较条形，最后说出结论。"
    },
    "ragCardIds": [
      "pep-primary-p3-lower-area-decimal-data"
    ]
  },
  {
    "id": "pep-primary-p4-upper-large-numbers-multiplication-concept",
    "topicId": "pep-primary-p4-upper-large-numbers-multiplication",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-upper-large-numbers-multiplication/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value columns, rounding marks, and partial-product blocks support large numbers and multiplication.",
      "zh": "数位栏、取近似数标记和部分积方块帮助理解大数和多位数乘法。",
      "zhHans": "数位栏、取近似数标记和部分积方块帮助理解大数和多位数乘法。"
    },
    "caption": {
      "en": "Large-number work depends on place value, estimation, and partial products.",
      "zh": "大数学习要依靠位值、估算和部分积。",
      "zhHans": "大数学习要依靠位值、估算和部分积。"
    },
    "ragCardIds": [
      "pep-primary-p4-upper-large-numbers-angles"
    ]
  },
  {
    "id": "pep-primary-p4-upper-large-numbers-multiplication-worked-example",
    "topicId": "pep-primary-p4-upper-large-numbers-multiplication",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-upper-large-numbers-multiplication/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A multiplication area model splits into partial rectangles and uses an estimation meter for checking.",
      "zh": "乘法面积模型分成多个部分矩形，并用估算仪表检查合理性。",
      "zhHans": "乘法面积模型分成多个部分矩形，并用估算仪表检查合理性。"
    },
    "caption": {
      "en": "Break the product into parts, then check whether the size makes sense.",
      "zh": "先把积拆成部分，再检查结果大小是否合理。",
      "zhHans": "先把积拆成部分，再检查结果大小是否合理。"
    },
    "ragCardIds": [
      "pep-primary-p4-upper-large-numbers-angles"
    ]
  },
  {
    "id": "pep-primary-p4-upper-angles-geometry-concept",
    "topicId": "pep-primary-p4-upper-angles-geometry",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-upper-angles-geometry/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Angle arms and a protractor arc show how to estimate, measure, and classify angles.",
      "zh": "角的两边和量角弧线展示如何估计、度量和分类角。",
      "zhHans": "角的两边和量角弧线展示如何估计、度量和分类角。"
    },
    "caption": {
      "en": "Angle size comes from the opening, not the length of the arms.",
      "zh": "角的大小看张开的程度，不看边画得有多长。",
      "zhHans": "角的大小看张开的程度，不看边画得有多长。"
    },
    "ragCardIds": [
      "pep-primary-p4-upper-large-numbers-angles"
    ]
  },
  {
    "id": "pep-primary-p4-upper-angles-geometry-worked-example",
    "topicId": "pep-primary-p4-upper-angles-geometry",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-upper-angles-geometry/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A geometry board aligns one angle to a protractor arc and compares it with angle references.",
      "zh": "几何板把一个角与量角弧线对齐，并和常见角进行比较。",
      "zhHans": "几何板把一个角与量角弧线对齐，并和常见角进行比较。"
    },
    "caption": {
      "en": "Align the vertex and baseline before deciding the angle type.",
      "zh": "先对准顶点和基准边，再判断角的类型。",
      "zhHans": "先对准顶点和基准边，再判断角的类型。"
    },
    "ragCardIds": [
      "pep-primary-p4-upper-large-numbers-angles"
    ]
  },
  {
    "id": "pep-primary-p4-lower-decimals-average-concept",
    "topicId": "pep-primary-p4-lower-decimals-average",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-lower-decimals-average/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Decimal place-value strips, alignment marks, conversion arrows, and an average beam explain decimals and mean.",
      "zh": "小数位值条、对齐标记、单位换算箭头和平均数天平解释小数与平均数。",
      "zhHans": "小数位值条、对齐标记、单位换算箭头和平均数天平解释小数与平均数。"
    },
    "caption": {
      "en": "Compare decimals by place value, and treat average as a balancing value.",
      "zh": "比较小数要看位值，平均数可以理解为平衡后的数值。",
      "zhHans": "比较小数要看位值，平均数可以理解为平衡后的数值。"
    },
    "ragCardIds": [
      "pep-primary-p4-lower-decimal-operations-average"
    ]
  },
  {
    "id": "pep-primary-p4-lower-decimals-average-worked-example",
    "topicId": "pep-primary-p4-lower-decimals-average",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-lower-decimals-average/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A decimal operation workspace aligns place values and levels data blocks to show average.",
      "zh": "小数运算工作区对齐位值，并把数据块调整到同一高度表示平均。",
      "zhHans": "小数运算工作区对齐位值，并把数据块调整到同一高度表示平均。"
    },
    "caption": {
      "en": "Align before calculating, then interpret what the average represents.",
      "zh": "计算前先对齐，再解释平均数代表什么。",
      "zhHans": "计算前先对齐，再解释平均数代表什么。"
    },
    "ragCardIds": [
      "pep-primary-p4-lower-decimal-operations-average"
    ]
  },
  {
    "id": "pep-primary-p4-lower-perimeter-area-lines-concept",
    "topicId": "pep-primary-p4-lower-perimeter-area-lines",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-lower-perimeter-area-lines/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Traced boundaries, filled unit squares, and line pairs distinguish perimeter, area, parallel, and perpendicular.",
      "zh": "描边、填充方格和平行垂直线组区分周长、面积、平行与垂直。",
      "zhHans": "描边、填充方格和平行垂直线组区分周长、面积、平行与垂直。"
    },
    "caption": {
      "en": "Perimeter follows the edge, area covers the inside, and line relations need clear conditions.",
      "zh": "周长沿边走，面积看内部覆盖，线的位置关系要有明确条件。",
      "zhHans": "周长沿边走，面积看内部覆盖，线的位置关系要有明确条件。"
    },
    "ragCardIds": [
      "pep-primary-p4-lower-decimal-operations-average"
    ]
  },
  {
    "id": "pep-primary-p4-lower-perimeter-area-lines-worked-example",
    "topicId": "pep-primary-p4-lower-perimeter-area-lines",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p4-lower-perimeter-area-lines/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A rectangle card separates a glowing border path from interior grid squares beside line-relation cards.",
      "zh": "长方形卡片把发光边界和内部方格分开显示，旁边配有线组关系卡。",
      "zhHans": "长方形卡片把发光边界和内部方格分开显示，旁边配有线组关系卡。"
    },
    "caption": {
      "en": "Decide which feature the problem asks for before using a formula.",
      "zh": "套公式前先判断题目问的是哪一种特征。",
      "zhHans": "套公式前先判断题目问的是哪一种特征。"
    },
    "ragCardIds": [
      "pep-primary-p4-lower-decimal-operations-average"
    ]
  },
  {
    "id": "pep-primary-p5-upper-decimals-equations-concept",
    "topicId": "pep-primary-p5-upper-decimals-equations",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-upper-decimals-equations/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Decimal operation strips and a balance with blank unknown blocks connect decimals with simple equations.",
      "zh": "小数运算条和带未知块的天平把小数乘除与简易方程联系起来。",
      "zhHans": "小数运算条和带未知块的天平把小数乘除与简易方程联系起来。"
    },
    "caption": {
      "en": "Estimate decimal size first, then write the equal relationship before solving.",
      "zh": "先估计小数结果大小，再写出等量关系并求解。",
      "zhHans": "先估计小数结果大小，再写出等量关系并求解。"
    },
    "ragCardIds": [
      "pep-primary-p5-upper-decimals-equations-polygons"
    ]
  },
  {
    "id": "pep-primary-p5-upper-decimals-equations-worked-example",
    "topicId": "pep-primary-p5-upper-decimals-equations",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-upper-decimals-equations/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Scaled decimal bars and a balanced equation model show solving with a reasonableness check.",
      "zh": "缩放的小数条和等式天平展示求解过程，并用合理性检查收尾。",
      "zhHans": "缩放的小数条和等式天平展示求解过程，并用合理性检查收尾。"
    },
    "caption": {
      "en": "Keep the balance unchanged while tracking the decimal place value.",
      "zh": "求解时保持两边平衡，同时追踪小数位值。",
      "zhHans": "求解时保持两边平衡，同时追踪小数位值。"
    },
    "ragCardIds": [
      "pep-primary-p5-upper-decimals-equations-polygons"
    ]
  },
  {
    "id": "pep-primary-p5-upper-polygon-area-concept",
    "topicId": "pep-primary-p5-upper-polygon-area",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-upper-polygon-area/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Polygons are cut and rearranged on a grid to reveal rectangle-based area reasoning.",
      "zh": "多边形在方格上被分割和重组，显示转化为长方形的面积思路。",
      "zhHans": "多边形在方格上被分割和重组，显示转化为长方形的面积思路。"
    },
    "caption": {
      "en": "Polygon area formulas come from decomposing and transforming shapes.",
      "zh": "多边形面积公式来自图形的分割和转化。",
      "zhHans": "多边形面积公式来自图形的分割和转化。"
    },
    "ragCardIds": [
      "pep-primary-p5-upper-decimals-equations-polygons"
    ]
  },
  {
    "id": "pep-primary-p5-upper-polygon-area-worked-example",
    "topicId": "pep-primary-p5-upper-polygon-area",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-upper-polygon-area/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A transformation board slides a parallelogram into a rectangle and pairs triangle halves.",
      "zh": "面积转化板把平行四边形平移成长方形，并把三角形半块配对。",
      "zhHans": "面积转化板把平行四边形平移成长方形，并把三角形半块配对。"
    },
    "caption": {
      "en": "Move pieces without changing area, then compare with a familiar rectangle.",
      "zh": "移动图形部件时面积不变，再和熟悉的长方形比较。",
      "zhHans": "移动图形部件时面积不变，再和熟悉的长方形比较。"
    },
    "ragCardIds": [
      "pep-primary-p5-upper-decimals-equations-polygons"
    ]
  },
  {
    "id": "pep-primary-p5-lower-factors-fractions-concept",
    "topicId": "pep-primary-p5-lower-factors-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-lower-factors-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Number tiles and fraction bars connect factors, multiples, simplification, and equivalent fractions.",
      "zh": "数块和分数条联系因数、倍数、约分和等值分数。",
      "zhHans": "数块和分数条联系因数、倍数、约分和等值分数。"
    },
    "caption": {
      "en": "Factors organize whole numbers; equivalent fractions preserve the same value.",
      "zh": "因数帮助整理整数关系，等值分数保持同一个大小。",
      "zhHans": "因数帮助整理整数关系，等值分数保持同一个大小。"
    },
    "ragCardIds": [
      "pep-primary-p5-lower-fractions-factors-volume"
    ]
  },
  {
    "id": "pep-primary-p5-lower-factors-fractions-worked-example",
    "topicId": "pep-primary-p5-lower-factors-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-lower-factors-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Number tiles sort into factor groups while aligned fraction bars show common parts.",
      "zh": "数块被分入因数组，对齐的分数条显示共同单位。",
      "zhHans": "数块被分入因数组，对齐的分数条显示共同单位。"
    },
    "caption": {
      "en": "Find the shared unit before adding or subtracting fractions.",
      "zh": "分数加减前要先找到共同的单位。",
      "zhHans": "分数加减前要先找到共同的单位。"
    },
    "ragCardIds": [
      "pep-primary-p5-lower-fractions-factors-volume"
    ]
  },
  {
    "id": "pep-primary-p5-lower-volume-data-concept",
    "topicId": "pep-primary-p5-lower-volume-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-lower-volume-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Transparent cuboids made of unit cubes show volume layers beside a small data display.",
      "zh": "由单位立方体组成的透明长方体展示体积层数，旁边配有小型数据图。",
      "zhHans": "由单位立方体组成的透明长方体展示体积层数，旁边配有小型数据图。"
    },
    "caption": {
      "en": "Volume counts cubic units in layers, not just the outside surface.",
      "zh": "体积数的是一层层立方单位，不只是外表面。",
      "zhHans": "体积数的是一层层立方单位，不只是外表面。"
    },
    "ragCardIds": [
      "pep-primary-p5-lower-fractions-factors-volume"
    ]
  },
  {
    "id": "pep-primary-p5-lower-volume-data-worked-example",
    "topicId": "pep-primary-p5-lower-volume-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p5-lower-volume-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A cuboid-building board stacks unit-cube layers and records the layer count visually.",
      "zh": "长方体搭建板逐层堆叠单位立方体，并用数据卡记录层数。",
      "zhHans": "长方体搭建板逐层堆叠单位立方体，并用数据卡记录层数。"
    },
    "caption": {
      "en": "Count one layer, then multiply by the number of layers.",
      "zh": "先数一层有多少，再乘以层数。",
      "zhHans": "先数一层有多少，再乘以层数。"
    },
    "ragCardIds": [
      "pep-primary-p5-lower-fractions-factors-volume"
    ]
  },
  {
    "id": "pep-primary-p6-upper-percent-fractions-concept",
    "topicId": "pep-primary-p6-upper-percent-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-upper-percent-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction bars, decimal strips, percent grids, discount cues, and growth arrows show equivalent representations.",
      "zh": "分数条、小数条、百分格、折扣线索和增长箭头展示等值表示。",
      "zhHans": "分数条、小数条、百分格、折扣线索和增长箭头展示等值表示。"
    },
    "caption": {
      "en": "Fractions, decimals, and percentages are different views of the same quantity.",
      "zh": "分数、小数和百分数是同一数量的不同表示。",
      "zhHans": "分数、小数和百分数是同一数量的不同表示。"
    },
    "ragCardIds": [
      "pep-primary-p6-upper-percent-position-data"
    ]
  },
  {
    "id": "pep-primary-p6-upper-percent-fractions-worked-example",
    "topicId": "pep-primary-p6-upper-percent-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-upper-percent-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "The same shaded amount appears as a fraction bar, decimal strip, and percent grid.",
      "zh": "同一阴影数量同时出现在分数条、小数条和百分格中。",
      "zhHans": "同一阴影数量同时出现在分数条、小数条和百分格中。"
    },
    "caption": {
      "en": "Convert representation first, then interpret discount or growth in context.",
      "zh": "先完成表示转换，再解释折扣或增长情境。",
      "zhHans": "先完成表示转换，再解释折扣或增长情境。"
    },
    "ragCardIds": [
      "pep-primary-p6-upper-percent-position-data"
    ]
  },
  {
    "id": "pep-primary-p6-upper-coordinate-data-concept",
    "topicId": "pep-primary-p6-upper-coordinate-data",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-upper-coordinate-data/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A coordinate grid, direction arrows, and a sector-style data circle connect position with data displays.",
      "zh": "坐标网格、方向箭头和扇形数据圆把位置与数据表达联系起来。",
      "zhHans": "坐标网格、方向箭头和扇形数据圆把位置与数据表达联系起来。"
    },
    "caption": {
      "en": "Position needs an ordered pair, while data displays need a clear whole.",
      "zh": "位置要用有顺序的数对，数据图要先看清整体。",
      "zhHans": "位置要用有顺序的数对，数据图要先看清整体。"
    },
    "ragCardIds": [
      "pep-primary-p6-upper-percent-position-data"
    ]
  },
  {
    "id": "pep-primary-p6-upper-coordinate-data-worked-example",
    "topicId": "pep-primary-p6-upper-coordinate-data",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-upper-coordinate-data/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A map-style coordinate board shows route arrows beside a data-circle panel comparing parts of a whole.",
      "zh": "地图式坐标板展示路线箭头，旁边用数据圆比较整体中的部分。",
      "zhHans": "地图式坐标板展示路线箭头，旁边用数据圆比较整体中的部分。"
    },
    "caption": {
      "en": "Read horizontal and vertical movement in order, then compare each data part with the whole.",
      "zh": "按顺序读横向和纵向移动，再把每个数据部分与整体比较。",
      "zhHans": "按顺序读横向和纵向移动，再把每个数据部分与整体比较。"
    },
    "ragCardIds": [
      "pep-primary-p6-upper-percent-position-data"
    ]
  },
  {
    "id": "pep-primary-p6-lower-ratio-proportion-scale-concept",
    "topicId": "pep-primary-p6-lower-ratio-proportion-scale",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-lower-ratio-proportion-scale/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Ratio bars, double number lines, scale-map tiles, and balance cues model ratio and proportion.",
      "zh": "比值条、双数线、比例尺地图块和平衡线索建立比与比例模型。",
      "zhHans": "比值条、双数线、比例尺地图块和平衡线索建立比与比例模型。"
    },
    "caption": {
      "en": "Ratio compares quantities, and proportion keeps the comparison consistent.",
      "zh": "比用于比较数量，比例表示这种比较保持一致。",
      "zhHans": "比用于比较数量，比例表示这种比较保持一致。"
    },
    "ragCardIds": [
      "pep-primary-p6-lower-proportion-negative-review"
    ]
  },
  {
    "id": "pep-primary-p6-lower-ratio-proportion-scale-worked-example",
    "topicId": "pep-primary-p6-lower-ratio-proportion-scale",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-lower-ratio-proportion-scale/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars grow together beside a scale map to show consistent multiplicative change.",
      "zh": "成对数量条按相同倍数变化，旁边配有比例尺小地图。",
      "zhHans": "成对数量条按相同倍数变化，旁边配有比例尺小地图。"
    },
    "caption": {
      "en": "Use the same multiplier on both related quantities.",
      "zh": "相关的两个数量要使用同一个倍数变化。",
      "zhHans": "相关的两个数量要使用同一个倍数变化。"
    },
    "ragCardIds": [
      "pep-primary-p6-lower-proportion-negative-review"
    ]
  },
  {
    "id": "pep-primary-p6-lower-negative-review-concept",
    "topicId": "pep-primary-p6-lower-negative-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-lower-negative-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A vertical number line with positive and negative regions connects negative numbers with mixed review ideas.",
      "zh": "竖直数线用正负区域把负数意义和小学综合复习联系起来。",
      "zhHans": "竖直数线用正负区域把负数意义和小学综合复习联系起来。"
    },
    "caption": {
      "en": "Negative numbers describe direction or position relative to zero.",
      "zh": "负数表示相对于零的方向或位置。",
      "zhHans": "负数表示相对于零的方向或位置。"
    },
    "ragCardIds": [
      "pep-primary-p6-lower-proportion-negative-review"
    ]
  },
  {
    "id": "pep-primary-p6-lower-negative-review-worked-example",
    "topicId": "pep-primary-p6-lower-negative-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-pep-primary/pep-primary-p6-lower-negative-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A review dashboard uses a zero-centered number line with movement arrows and mixed-topic model cards.",
      "zh": "复习面板使用以零为中心的数线、上下移动箭头和综合模型卡。",
      "zhHans": "复习面板使用以零为中心的数线、上下移动箭头和综合模型卡。"
    },
    "caption": {
      "en": "Locate zero first, then decide direction before solving the mixed problem.",
      "zh": "先确定零的位置，再判断方向，最后解决综合问题。",
      "zhHans": "先确定零的位置，再判断方向，最后解决综合问题。"
    },
    "ragCardIds": [
      "pep-primary-p6-lower-proportion-negative-review"
    ]
  }
] satisfies MainlandPepPrimaryLessonIllustration[];

export const mainlandPepPrimaryLessonIllustrationWithdrawal = {
  date: "2026-07-09",
  decision: "withdrawn-assets-not-promoted",
  scope: "MAINLAND_PEP primary lesson illustrations",
  reason:
    "Authored illustration metadata was integrated ahead of asset production; no approved public PNG assets exist in the repository or candidate packages. Withdrawn from live lessons pending A21/A24 asset production and A18 approval."
} as const;

export const mainlandPepPrimaryLessonIllustrations: MainlandPepPrimaryLessonIllustration[] = [];

export function getMainlandPepPrimaryLessonIllustration(
  _topicId: string,
  _slot: MainlandPepPrimaryLessonIllustrationSlot
): MainlandPepPrimaryLessonIllustration | null {
  return null;
}
