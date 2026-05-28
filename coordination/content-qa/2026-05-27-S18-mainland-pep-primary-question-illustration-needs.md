# S18 Mainland PEP Primary Question Illustration Needs Audit

- Date: 2026-05-27
- Generated at: 2026-05-27 20:43:12 Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: `data/mainlandPepPrimaryQuestions.ts`
- Scope: MAINLAND_PEP primary P1-P6, current `primary-rag-v1` question bank
- Output queue CSV: `2026-05-27-S18-mainland-pep-primary-question-illustration-queue.csv`
- Output queue JSONL: `2026-05-27-S18-mainland-pep-primary-question-illustration-queue.jsonl`

## Executive Summary

This audit classifies all 1,200 Mainland PEP primary questions for question-level illustration production under the strong-recommendation standard: illustrations are counted when they materially improve young learners' understanding, not only when a question is impossible without an image.

- Total audited questions: 1200
- Suggested GPT Image2 production candidates: 1100
- Optional / low-priority illustration candidates: 100
- Need-level split: core 700, recommended 400, optional 100
- No GPT Image2 calls were made; this is a planning and counting artifact only.
- Existing lesson-level illustrations are not treated as question-level diagrams.

## Need-Level Definitions

| Need Level | Priority | Meaning | Production Decision |
| --- | --- | --- | --- |
| `core` | P1 | The representation is central to the math idea, especially for counting, geometry, fraction, area, volume, coordinate, and number-line reasoning. | Generate first |
| `recommended` | P2 | The question is answerable from text, but a concrete visual strongly supports primary students' modeling and explanation. | Generate after P1 |
| `optional` | P3 | The question is mainly symbolic or ordinary computation; an image can decorate or scaffold but is not needed for the first production pass. | Hold unless full coverage is desired |

## Grade Totals

| Grade | Total | Suggested For Images | Core | Recommended | Optional | Main Illustration Kinds |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P1 | 200 | 200 | 150 | 50 | 0 | 数数物/十框/数的组成、积木/立体图形/位置观察、具体物加减/拿走与增加、分类统计/最多最少 |
| P2 | 200 | 200 | 150 | 50 | 0 | 相同小组/阵列乘法、尺子/角/观察物体、平均分/包含分/余数、位值方块/千百十个 |
| P3 | 200 | 200 | 100 | 100 | 0 | 分数涂色/平均分整体、钟表/测量/经过时间、面积方格/长方形模型、数据/平均数/统计表达 |
| P4 | 200 | 150 | 100 | 50 | 50 | 角/平角/量角器线索、小数测量/平均数数据图、长方形周长/面积/平行垂直 |
| P5 | 200 | 150 | 100 | 50 | 50 | 三角形/梯形/平行四边形面积、分数条/通分约分/分数运算、长方体/正方体/体积单位 |
| P6 | 200 | 200 | 100 | 100 | 0 | 百分数模型/百格/扇形占比、坐标平面/数对/方向、比/比例/线段图、负数数轴/温度变化 |

## Global Totals

| Dimension | Breakdown |
| --- | --- |
| Need level | core: 700; optional: 100; recommended: 400 |
| Question type | fill-in: 450; multiple-choice: 450; short-answer: 300 |
| Illustration kind | angle: 50; area-grid: 150; array: 100; bar-chart: 150; blocks: 50; clock: 50; coordinate-plane: 50; counters: 100; fraction-area: 100; number-line: 50; percent-model: 50; ratio-bar: 50; ruler: 50; sharing-groups: 50; solid: 100; ten-frame: 50 |
| Family count | addition-subtraction: 50; angles-geometry: 50; area-decimals: 50; coordinate-data: 50; decimals-average: 50; decimals-equations: 50; division-remainder: 50; factors-fractions: 50; geometry-position: 50; large-numbers-multiplication: 50; measurement-geometry: 50; measurement-time-geometry: 50; multiplication: 50; negative-review: 50; number-sense: 50; operations-fractions: 50; percent-fractions: 50; perimeter-area-lines: 50; place-value-measurement: 50; polygon-area: 50; ratio-proportion: 50; statistics-review: 50; time-data: 50; volume-data: 50 |

## Family Classification

| Topic | Family | Questions | Need | Kind | Category | Rationale |
| --- | --- | ---: | --- | --- | --- | --- |
| 100以内数与加减法 | `addition-subtraction` | 50 | `recommended` | `counters` | 具体物加减/拿走与增加 | 题目可计算，但具体物能帮助 P1 学生把情境动作转化为加减法。 |
| 角的度量与几何语言 | `angles-geometry` | 50 | `core` | `angle` | 角/平角/量角器线索 | 角的大小、平角关系和方向判断需要几何直观支持。 |
| 面积与小数初步 | `area-decimals` | 50 | `core` | `area-grid` | 面积方格/长方形模型 | 面积与周长容易混淆，方格面积图能直接对应单位面积。 |
| 位置与数据表达 | `coordinate-data` | 50 | `core` | `coordinate-plane` | 坐标平面/数对/方向 | 数对和位置题需要坐标平面或路线图，图像是核心表征。 |
| 小数运算与平均数 | `decimals-average` | 50 | `recommended` | `bar-chart` | 小数测量/平均数数据图 | 小数测量和平均数可以通过条形数据图减轻单位与数量解释负担。 |
| 小数乘除与简易方程 | `decimals-equations` | 50 | `optional` | `counters` | 小数方程/购物情境可选图 | 题目主要考小数运算或简易方程，图像支架可选，优先级低于具象和几何数据题。 |
| 表内除法与有余数除法 | `division-remainder` | 50 | `recommended` | `sharing-groups` | 平均分/包含分/余数 | 题目可直接列式，但分组图能帮助学生区分商与余数的意义。 |
| 因数倍数与分数运算 | `factors-fractions` | 50 | `recommended` | `fraction-area` | 分数条/通分约分/分数运算 | 分数运算可符号计算，但分数条能解释同分母、整体和等值关系。 |
| 图形、位置与整时 | `geometry-position` | 50 | `core` | `solid` | 积木/立体图形/位置观察 | 立体图形和位置语言对低年级学生高度依赖实物表征。 |
| 大数认识与三位数乘法 | `large-numbers-multiplication` | 50 | `optional` | `array` | 大数乘法情境/可选阵列 | 题目主要是纯计算或普通乘法应用，插图可作情境装饰但不是优先生产对象。 |
| 长度、角与观察物体 | `measurement-geometry` | 50 | `core` | `ruler` | 尺子/角/观察物体 | 长度、角和观察物体题需要对齐、方向和形状线索，图像支架价值高。 |
| 测量、年月日与几何 | `measurement-time-geometry` | 50 | `recommended` | `clock` | 钟表/测量/经过时间 | 当前题干多为经过时间与测量情境，配钟表或测量图能增强理解但不是全部题目的唯一解题条件。 |
| 表内乘法与阵列 | `multiplication` | 50 | `core` | `array` | 相同小组/阵列乘法 | 乘法意义需要从几个几、阵列和重复加法建立直观连接。 |
| 负数与小学总复习 | `negative-review` | 50 | `core` | `number-line` | 负数数轴/温度变化 | 负数大小和温度变化需要参考零点，数轴是核心支架。 |
| 20以内数感 | `number-sense` | 50 | `core` | `ten-frame` | 数数物/十框/数的组成 | P1 数感题依赖数量、整体与部分的可视化；十框和计数物能直接支撑数数与分解。 |
| 多位数运算与分数初步 | `operations-fractions` | 50 | `core` | `fraction-area` | 分数涂色/平均分整体 | 分数初步必须明确整体与平均分，面积模型是核心表征。 |
| 分数运算与百分数 | `percent-fractions` | 50 | `recommended` | `percent-model` | 百分数模型/百格/扇形占比 | 百分数应用可计算，百格或占比图能帮助学生识别整体和部分。 |
| 周长面积、平行与垂直 | `perimeter-area-lines` | 50 | `core` | `area-grid` | 长方形周长/面积/平行垂直 | 周长与面积的区别适合用边框和方格两种可视模型对照。 |
| 万以内数、质量、时间与数据 | `place-value-measurement` | 50 | `core` | `blocks` | 位值方块/千百十个 | 万以内数和位值判断适合用位值块、数位表或测量情境辅助。 |
| 多边形面积 | `polygon-area` | 50 | `core` | `area-grid` | 三角形/梯形/平行四边形面积 | 多边形面积依赖底、高、分割与转化，必须有清晰图形支架。 |
| 比、比例与比例尺 | `ratio-proportion` | 50 | `recommended` | `ratio-bar` | 比/比例/线段图 | 比和比例题适合用比例条表达份数关系，尤其适合后续讲解图。 |
| 统计表达与综合复习 | `statistics-review` | 50 | `recommended` | `bar-chart` | 数据/平均数/统计表达 | 平均数和小数据题可计算，统计图能帮助学生看见数据集合和均衡意义。 |
| 人民币、时间与数据 | `time-data` | 50 | `core` | `bar-chart` | 分类统计/最多最少 | 分类数量比较适合用小型统计图或图标计数承载，能减少低年级读题负担。 |
| 长方体正方体与数据 | `volume-data` | 50 | `core` | `solid` | 长方体/正方体/体积单位 | 体积、表面积和单位立方体需要空间模型，否则学生容易混淆平方与立方单位。 |

## Validation

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| Total question count | 1200 | 1200 | PASS |
| Need-level totals | core 700, recommended 400, optional 100 | core 700, recommended 400, optional 100 | PASS |
| Suggested GPT Image2 production count | 1100 | 1100 | PASS |
| Every family has 5 manual-review samples | 24 families x 5 samples | 24 families x >=5 samples | PASS |
| Optional full-review pool | 100 optional rows | 100 optional rows | PASS |
| P1 production total | total 200, production 200, optional 0 | total 200, production 200, optional 0 | PASS |
| P2 production total | total 200, production 200, optional 0 | total 200, production 200, optional 0 | PASS |
| P3 production total | total 200, production 200, optional 0 | total 200, production 200, optional 0 | PASS |
| P4 production total | total 200, production 150, optional 50 | total 200, production 150, optional 50 | PASS |
| P5 production total | total 200, production 150, optional 50 | total 200, production 150, optional 50 | PASS |
| P6 production total | total 200, production 200, optional 0 | total 200, production 200, optional 0 | PASS |

## Manual Review Samples

Each family includes 5 sample questions for S18 spot-checking before GPT Image2 production. Samples confirm that the rule-based family classification maps to the current generated prompts.

### 数数物/十框/数的组成 (`number-sense`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p1-u-mc-001 | P1 | multiple-choice | `core` | `ten-frame` | 乐乐有14枚彩笔，已经用掉11枚，还剩多少枚？ |
| pep-primary-p1-u-mc-002 | P1 | multiple-choice | `core` | `ten-frame` | 第2小组：一个数的组成中，总数是10，其中一部分是7，另一部分是多少？ |
| pep-primary-p1-u-mc-003 | P1 | multiple-choice | `core` | `ten-frame` | 第3小组：一个数的组成中，总数是11，其中一部分是10，另一部分是多少？ |
| pep-primary-p1-u-mc-004 | P1 | multiple-choice | `core` | `ten-frame` | 第4小组：一个数的组成中，总数是12，其中一部分是2，另一部分是多少？ |
| pep-primary-p1-u-mc-005 | P1 | multiple-choice | `core` | `ten-frame` | 第5小组：一个数的组成中，总数是13，其中一部分是4，另一部分是多少？ |

### 积木/立体图形/位置观察 (`geometry-position`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p1-u-fi-091 | P1 | fill-in | `core` | `solid` | 观察一个积木：相对的面形状相同，多数面是长方形。这个积木属于哪种立体图形？ |
| pep-primary-p1-u-fi-092 | P1 | fill-in | `core` | `solid` | 第92小组：下面描述的是哪种立体图形：相对的面是长方形？ |
| pep-primary-p1-u-fi-093 | P1 | fill-in | `core` | `solid` | 第93小组：下面描述的是哪种立体图形：每个面都是正方形？ |
| pep-primary-p1-u-fi-094 | P1 | fill-in | `core` | `solid` | 观察一个积木：上下两个面都是圆形。这个积木属于哪种立体图形？ |
| pep-primary-p1-u-fi-095 | P1 | fill-in | `core` | `solid` | 浩浩摸到一个立体图形，它每个面都是正方形。这个图形最可能是什么？ |

### 具体物加减/拿走与增加 (`addition-subtraction`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p1-l-fi-101 | P1 | fill-in | `recommended` | `counters` | 晨晨原来有66张积木，送出10张，现在有多少张？ |
| pep-primary-p1-l-fi-102 | P1 | fill-in | `recommended` | `counters` | 种植区记录了72个作品，后来撤下15个，现在记录多少个？ |
| pep-primary-p1-l-fi-103 | P1 | fill-in | `recommended` | `counters` | 一袋材料先有78个，活动中用掉20个，活动后有多少个？ |
| pep-primary-p1-l-fi-104 | P1 | fill-in | `recommended` | `counters` | 种植区记录了58个作品，后来撤下7个，现在记录多少个？ |
| pep-primary-p1-l-fi-105 | P1 | fill-in | `recommended` | `counters` | 一袋材料先有64个，活动中用掉12个，活动后有多少个？ |

### 分类统计/最多最少 (`time-data`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p1-l-fi-151 | P1 | fill-in | `core` | `bar-chart` | 第151小组：班级统计红卡4张、蓝卡7张、绿卡7张，数量最多的是几张？ |
| pep-primary-p1-l-fi-152 | P1 | fill-in | `core` | `bar-chart` | 第152小组：班级统计红卡5张、蓝卡9张、绿卡5张，数量最多的是几张？ |
| pep-primary-p1-l-fi-153 | P1 | fill-in | `core` | `bar-chart` | 第153小组：班级统计红卡6张、蓝卡5张、绿卡8张，数量最多的是几张？ |
| pep-primary-p1-l-fi-154 | P1 | fill-in | `core` | `bar-chart` | 第154小组：班级统计红卡7张、蓝卡7张、绿卡6张，数量最多的是几张？ |
| pep-primary-p1-l-fi-155 | P1 | fill-in | `core` | `bar-chart` | 第155小组：班级统计红卡3张、蓝卡9张、绿卡4张，数量最多的是几张？ |

### 相同小组/阵列乘法 (`multiplication`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p2-u-mc-001 | P2 | multiple-choice | `core` | `array` | 晨晨摆了8行书签，每行2个，一共有多少个？ |
| pep-primary-p2-u-mc-002 | P2 | multiple-choice | `core` | `array` | 科学桌有2个托盘，每个托盘放6个模型，一共放了多少个模型？ |
| pep-primary-p2-u-mc-003 | P2 | multiple-choice | `core` | `array` | 手工课分成4组，每组做2个作品，一共做多少个作品？ |
| pep-primary-p2-u-mc-004 | P2 | multiple-choice | `core` | `array` | 第4小组：有6组，每组6个，一共有多少个？ |
| pep-primary-p2-u-mc-005 | P2 | multiple-choice | `core` | `array` | 第5小组：有7组，每组9个，一共有多少个？ |

### 尺子/角/观察物体 (`measurement-geometry`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p2-u-fi-091 | P2 | fill-in | `core` | `ruler` | 乐乐量到一条纸带长23厘米，另一条比它长16厘米。另一条长多少厘米？ |
| pep-primary-p2-u-fi-092 | P2 | fill-in | `core` | `ruler` | 运动场有一根绳子长28厘米，新绳子比它长6厘米，新绳子长多少厘米？ |
| pep-primary-p2-u-fi-093 | P2 | fill-in | `core` | `ruler` | 手工桌上的蓝条长33厘米，红条比蓝条长8厘米。红条长多少厘米？ |
| pep-primary-p2-u-fi-094 | P2 | fill-in | `core` | `ruler` | 浩浩量到一条纸带长38厘米，另一条比它长10厘米。另一条长多少厘米？ |
| pep-primary-p2-u-fi-095 | P2 | fill-in | `core` | `ruler` | 第95小组：一根彩带长50厘米，另一根比它长16厘米。另一根长多少厘米？ |

### 平均分/包含分/余数 (`division-remainder`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p2-l-fi-101 | P2 | fill-in | `recommended` | `sharing-groups` | 小林把23张卡片按每6张一份整理，商和余数是多少？ |
| pep-primary-p2-l-fi-102 | P2 | fill-in | `recommended` | `sharing-groups` | 晨晨把39张彩笔按每4张一份整理，商和余数是多少？ |
| pep-primary-p2-l-fi-103 | P2 | fill-in | `recommended` | `sharing-groups` | 第103小组：把47个物品按每组7个分组，商和余数是多少？ |
| pep-primary-p2-l-fi-104 | P2 | fill-in | `recommended` | `sharing-groups` | 种植区有54个材料，每7个装一袋，可以装几袋，还剩几个？ |
| pep-primary-p2-l-fi-105 | P2 | fill-in | `recommended` | `sharing-groups` | 第105小组：把7个物品按每组2个分组，商和余数是多少？ |

### 位值方块/千百十个 (`place-value-measurement`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p2-l-fi-151 | P2 | fill-in | `core` | `blocks` | 第151小组：在数8357中，百位上的数字是几？ |
| pep-primary-p2-l-fi-152 | P2 | fill-in | `core` | `blocks` | 第152小组：在数1604中，百位上的数字是几？ |
| pep-primary-p2-l-fi-153 | P2 | fill-in | `core` | `blocks` | 第153小组：在数2951中，百位上的数字是几？ |
| pep-primary-p2-l-fi-154 | P2 | fill-in | `core` | `blocks` | 第154小组：在数3208中，百位上的数字是几？ |
| pep-primary-p2-l-fi-155 | P2 | fill-in | `core` | `blocks` | 第155小组：在数4555中，百位上的数字是几？ |

### 分数涂色/平均分整体 (`operations-fractions`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p3-u-mc-001 | P3 | multiple-choice | `core` | `fraction-area` | 小林把一张纸平均分成8份，涂色7份。涂色部分占几分之几？ |
| pep-primary-p3-u-mc-002 | P3 | multiple-choice | `core` | `fraction-area` | 第2小组：把一个整体平均分成6份，其中涂色3份。涂色部分占几分之几？ |
| pep-primary-p3-u-mc-003 | P3 | multiple-choice | `core` | `fraction-area` | 第3小组：把一个整体平均分成7份，其中涂色4份。涂色部分占几分之几？ |
| pep-primary-p3-u-mc-004 | P3 | multiple-choice | `core` | `fraction-area` | 第4小组：把一个整体平均分成8份，其中涂色5份。涂色部分占几分之几？ |
| pep-primary-p3-u-mc-005 | P3 | multiple-choice | `core` | `fraction-area` | 第5小组：把一个整体平均分成4份，其中涂色3份。涂色部分占几分之几？ |

### 钟表/测量/经过时间 (`measurement-time-geometry`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p3-u-fi-076 | P3 | fill-in | `recommended` | `clock` | 乐乐从10:00开始练习口算，练习了46分钟。练习时间是多少分钟？ |
| pep-primary-p3-u-fi-077 | P3 | fill-in | `recommended` | `clock` | 运动场的小活动在12:00开始，持续52分钟。活动持续了多久？ |
| pep-primary-p3-u-fi-078 | P3 | fill-in | `recommended` | `clock` | 阅读时间从9:00开始，记录表写着持续18分钟。持续时间是多少？ |
| pep-primary-p3-u-fi-079 | P3 | fill-in | `recommended` | `clock` | 第79小组：阅读活动从12:00开始，持续50分钟。活动持续了多少分钟？ |
| pep-primary-p3-u-fi-080 | P3 | fill-in | `recommended` | `clock` | 第80小组：阅读活动从8:00开始，持续15分钟。活动持续了多少分钟？ |

### 面积方格/长方形模型 (`area-decimals`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p3-l-fi-101 | P3 | fill-in | `core` | `area-grid` | 晨晨画了一个长方形，长8厘米、宽3厘米。面积是多少？ |
| pep-primary-p3-l-fi-102 | P3 | fill-in | `core` | `area-grid` | 种植区有一张长方形标签，长10厘米、宽6厘米。标签面积是多少？ |
| pep-primary-p3-l-fi-103 | P3 | fill-in | `core` | `area-grid` | 一块长方形纸板长3厘米、宽3厘米，它的面积是多少平方厘米？ |
| pep-primary-p3-l-fi-104 | P3 | fill-in | `core` | `area-grid` | 第104小组：一个长方形长8厘米、宽6厘米，面积是多少？ |
| pep-primary-p3-l-fi-105 | P3 | fill-in | `core` | `area-grid` | 第105小组：一个长方形长9厘米、宽2厘米，面积是多少？ |

### 数据/平均数/统计表达 (`statistics-review`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p3-l-sa-151 | P3 | short-answer | `recommended` | `bar-chart` | 浩浩三次跳绳成绩是6下、8下、10下，平均每次多少下？ |
| pep-primary-p3-l-sa-152 | P3 | short-answer | `recommended` | `bar-chart` | 乐乐三次跳绳成绩是12下、14下、16下，平均每次多少下？ |
| pep-primary-p3-l-sa-153 | P3 | short-answer | `recommended` | `bar-chart` | 小辰在数学角整理三盒彩笔，分别有6支、8支、10支，平均每盒有多少支？ |
| pep-primary-p3-l-sa-154 | P3 | short-answer | `recommended` | `bar-chart` | 美术柜记录了三组数据：8、10、12。这三个数的平均数是多少？ |
| pep-primary-p3-l-sa-155 | P3 | short-answer | `recommended` | `bar-chart` | 佳佳在科学桌整理三盒彩笔，分别有6支、8支、10支，平均每盒有多少支？ |

### 大数乘法情境/可选阵列 (`large-numbers-multiplication`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p4-u-mc-001 | P4 | multiple-choice | `optional` | `array` | 手工桌每箱有29本练习本，准备33箱，一共有多少本？ |
| pep-primary-p4-u-mc-002 | P4 | multiple-choice | `optional` | `array` | 佳佳统计每排13个座位，共37排，一共有多少个座位？ |
| pep-primary-p4-u-mc-003 | P4 | multiple-choice | `optional` | `array` | 仓库每包有15张卡片，41包共有多少张卡片？ |
| pep-primary-p4-u-mc-004 | P4 | multiple-choice | `optional` | `array` | 第4小组：计算：16x32=？ |
| pep-primary-p4-u-mc-005 | P4 | multiple-choice | `optional` | `array` | 第5小组：计算：17x35=？ |

### 角/平角/量角器线索 (`angles-geometry`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p4-u-fi-076 | P4 | fill-in | `core` | `angle` | 乐乐画了两个组成平角的角，其中一个是45°，另一个是多少度？ |
| pep-primary-p4-u-fi-077 | P4 | fill-in | `core` | `angle` | 一条直线上的两个相邻角和为180°，已知一个角是51°，另一个角是多少？ |
| pep-primary-p4-u-fi-078 | P4 | fill-in | `core` | `angle` | 手工桌的角度卡显示一个角为57°，它的邻补角是多少度？ |
| pep-primary-p4-u-fi-079 | P4 | fill-in | `core` | `angle` | 第79小组：两个角组成一个平角，其中一个角是60°，另一个角是多少度？ |
| pep-primary-p4-u-fi-080 | P4 | fill-in | `core` | `angle` | 第80小组：两个角组成一个平角，其中一个角是65°，另一个角是多少度？ |

### 小数测量/平均数数据图 (`decimals-average`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p4-l-fi-101 | P4 | fill-in | `recommended` | `bar-chart` | 小林量到两段彩带分别长1.5米和2.7米，一共长多少米？ |
| pep-primary-p4-l-fi-102 | P4 | fill-in | `recommended` | `bar-chart` | 浩浩量到两段彩带分别长1米和2.3米，一共长多少米？ |
| pep-primary-p4-l-fi-103 | P4 | fill-in | `recommended` | `bar-chart` | 图书角记录两次用水量为1.2升和2.6升，合计多少升？ |
| pep-primary-p4-l-fi-104 | P4 | fill-in | `recommended` | `bar-chart` | 两盒彩泥质量分别是1.4千克和2千克，总质量是多少千克？ |
| pep-primary-p4-l-fi-105 | P4 | fill-in | `recommended` | `bar-chart` | 晨晨量到两段彩带分别长1.6米和2.3米，一共长多少米？ |

### 长方形周长/面积/平行垂直 (`perimeter-area-lines`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p4-l-sa-151 | P4 | short-answer | `core` | `area-grid` | 乐乐给长9厘米、宽7厘米的长方形卡片贴边框，边框长多少厘米？ |
| pep-primary-p4-l-sa-152 | P4 | short-answer | `core` | `area-grid` | 数学角有一块长方形展示板，长11厘米、宽3厘米，周长是多少？ |
| pep-primary-p4-l-sa-153 | P4 | short-answer | `core` | `area-grid` | 一张长方形纸长13厘米、宽6厘米，沿边走一圈是多少厘米？ |
| pep-primary-p4-l-sa-154 | P4 | short-answer | `core` | `area-grid` | 第154小组：一个长方形长6厘米、宽3厘米，周长是多少？ |
| pep-primary-p4-l-sa-155 | P4 | short-answer | `core` | `area-grid` | 第155小组：一个长方形长7厘米、宽5厘米，周长是多少？ |

### 小数方程/购物情境可选图 (`decimals-equations`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p5-u-mc-001 | P5 | multiple-choice | `optional` | `counters` | 小林买了4本同价练习本，又买了4元的书签，共用24元。每本练习本多少元？ |
| pep-primary-p5-u-mc-002 | P5 | multiple-choice | `optional` | `counters` | 一个数乘3再加11等于38，这个数是多少？ |
| pep-primary-p5-u-mc-003 | P5 | multiple-choice | `optional` | `counters` | 阅读区的等量关系是5x+6=26，求x的值。 |
| pep-primary-p5-u-mc-004 | P5 | multiple-choice | `optional` | `counters` | 小林买了2本同价练习本，又买了10元的书签，共用24元。每本练习本多少元？ |
| pep-primary-p5-u-mc-005 | P5 | multiple-choice | `optional` | `counters` | 一个数乘4再加5等于45，这个数是多少？ |

### 三角形/梯形/平行四边形面积 (`polygon-area`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p5-u-fi-061 | P5 | fill-in | `core` | `area-grid` | 乐乐剪出一个三角形，底是6厘米，高是9厘米，面积是多少？ |
| pep-primary-p5-u-fi-062 | P5 | fill-in | `core` | `area-grid` | 运动场展示的三角形标着底8厘米、高4厘米。它的面积是多少？ |
| pep-primary-p5-u-fi-063 | P5 | fill-in | `core` | `area-grid` | 一块三角形纸板的底为10厘米，高为7厘米，面积是多少平方厘米？ |
| pep-primary-p5-u-fi-064 | P5 | fill-in | `core` | `area-grid` | 第64小组：一个三角形的底是10厘米，高是4厘米，面积是多少？ |
| pep-primary-p5-u-fi-065 | P5 | fill-in | `core` | `area-grid` | 第65小组：一个三角形的底是11厘米，高是6厘米，面积是多少？ |

### 分数条/通分约分/分数运算 (`factors-fractions`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p5-l-fi-101 | P5 | fill-in | `recommended` | `fraction-area` | 晨晨先完成3/8页练习，又完成2/8页，一共完成几分之几页？ |
| pep-primary-p5-l-fi-102 | P5 | fill-in | `recommended` | `fraction-area` | 两段同样长的纸带分别占全长的2/10和2/10，合起来是多少？ |
| pep-primary-p5-l-fi-103 | P5 | fill-in | `recommended` | `fraction-area` | 阅读区的记录显示两次用料为1/6包和2/6包，一共用了多少包？ |
| pep-primary-p5-l-fi-104 | P5 | fill-in | `recommended` | `fraction-area` | 第104小组：计算：3/8+2/8=？ |
| pep-primary-p5-l-fi-105 | P5 | fill-in | `recommended` | `fraction-area` | 第105小组：计算：1/9+1/9=？ |

### 长方体/正方体/体积单位 (`volume-data`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p5-l-sa-151 | P5 | short-answer | `core` | `solid` | 第151小组：一个长方体长4厘米、宽4厘米、高3厘米，体积是多少？ |
| pep-primary-p5-l-sa-152 | P5 | short-answer | `core` | `solid` | 第152小组：一个长方体长5厘米、宽6厘米、高2厘米，体积是多少？ |
| pep-primary-p5-l-sa-153 | P5 | short-answer | `core` | `solid` | 第153小组：一个长方体长6厘米、宽3厘米、高5厘米，体积是多少？ |
| pep-primary-p5-l-sa-154 | P5 | short-answer | `core` | `solid` | 浩浩搭了一个长方体，长7厘米、宽4厘米、高2厘米，体积是多少？ |
| pep-primary-p5-l-sa-155 | P5 | short-answer | `core` | `solid` | 第155小组：一个长方体长8厘米、宽2厘米、高3厘米，体积是多少？ |

### 百分数模型/百格/扇形占比 (`percent-fractions`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p6-u-mc-001 | P6 | multiple-choice | `recommended` | `percent-model` | 小林有90张练习卡，完成了20%。完成了多少张？ |
| pep-primary-p6-u-mc-002 | P6 | multiple-choice | `recommended` | `percent-model` | 晨晨有190张练习卡，完成了50%。完成了多少张？ |
| pep-primary-p6-u-mc-003 | P6 | multiple-choice | `recommended` | `percent-model` | 科学桌准备90个材料，其中20%已经分类。已经分类多少个？ |
| pep-primary-p6-u-mc-004 | P6 | multiple-choice | `recommended` | `percent-model` | 一份调查共有110人参加，50%选择了A项。选择A项的有多少人？ |
| pep-primary-p6-u-mc-005 | P6 | multiple-choice | `recommended` | `percent-model` | 数学角准备170个材料，其中20%已经分类。已经分类多少个？ |

### 坐标平面/数对/方向 (`coordinate-data`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p6-u-fi-061 | P6 | fill-in | `core` | `coordinate-plane` | 第61小组：点A的横坐标是2，纵坐标是0，请写出它的数对。 |
| pep-primary-p6-u-fi-062 | P6 | fill-in | `core` | `coordinate-plane` | 第62小组：点A的横坐标是3，纵坐标是2，请写出它的数对。 |
| pep-primary-p6-u-fi-063 | P6 | fill-in | `core` | `coordinate-plane` | 第63小组：点A的横坐标是-3，纵坐标是-2，请写出它的数对。 |
| pep-primary-p6-u-fi-064 | P6 | fill-in | `core` | `coordinate-plane` | 第64小组：点A的横坐标是-2，纵坐标是0，请写出它的数对。 |
| pep-primary-p6-u-fi-065 | P6 | fill-in | `core` | `coordinate-plane` | 第65小组：点A的横坐标是-1，纵坐标是2，请写出它的数对。 |

### 比/比例/线段图 (`ratio-proportion`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p6-l-fi-101 | P6 | fill-in | `recommended` | `ratio-bar` | 乐乐把30升饮料按2:3分成两份，较大的那份是多少升？ |
| pep-primary-p6-l-fi-102 | P6 | fill-in | `recommended` | `ratio-bar` | 运动场有15米彩带，按2:3剪成两段，较长的一段是多少米？ |
| pep-primary-p6-l-fi-103 | P6 | fill-in | `recommended` | `ratio-bar` | 婷婷把25个奖章按2:3分给两组，人数多的一组分到多少个？ |
| pep-primary-p6-l-fi-104 | P6 | fill-in | `recommended` | `ratio-bar` | 第104小组：把30升饮料按2:3分成两部分，较大的部分是多少升？ |
| pep-primary-p6-l-fi-105 | P6 | fill-in | `recommended` | `ratio-bar` | 第105小组：把10升饮料按2:3分成两部分，较大的部分是多少升？ |

### 负数数轴/温度变化 (`negative-review`)

| Question ID | Grade | Type | Need | Kind | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-primary-p6-l-sa-151 | P6 | short-answer | `core` | `number-line` | 第151小组：气温是-3°C，升高9°C后是多少摄氏度？ |
| pep-primary-p6-l-sa-152 | P6 | short-answer | `core` | `number-line` | 第152小组：气温是-2°C，升高3°C后是多少摄氏度？ |
| pep-primary-p6-l-sa-153 | P6 | short-answer | `core` | `number-line` | 第153小组：气温是-1°C，升高5°C后是多少摄氏度？ |
| pep-primary-p6-l-sa-154 | P6 | short-answer | `core` | `number-line` | 第154小组：气温是0°C，升高7°C后是多少摄氏度？ |
| pep-primary-p6-l-sa-155 | P6 | short-answer | `core` | `number-line` | 第155小组：气温是1°C，升高9°C后是多少摄氏度？ |

## Optional Full-Review Index

The 100 optional rows were reviewed as the complete optional pool. They are not recommended for the first GPT Image2 production pass unless the owner wants full 1,200-question visual coverage.

### 大数乘法情境/可选阵列 (`large-numbers-multiplication`)

`pep-primary-p4-u-mc-001`, `pep-primary-p4-u-mc-002`, `pep-primary-p4-u-mc-003`, `pep-primary-p4-u-mc-004`, `pep-primary-p4-u-mc-005`, `pep-primary-p4-u-mc-006`, `pep-primary-p4-u-mc-007`, `pep-primary-p4-u-mc-008`, `pep-primary-p4-u-mc-009`, `pep-primary-p4-u-mc-010`, `pep-primary-p4-u-mc-011`, `pep-primary-p4-u-mc-012`, `pep-primary-p4-u-mc-013`, `pep-primary-p4-u-mc-014`, `pep-primary-p4-u-mc-015`, `pep-primary-p4-u-mc-016`, `pep-primary-p4-u-mc-017`, `pep-primary-p4-u-mc-018`, `pep-primary-p4-u-mc-019`, `pep-primary-p4-u-mc-020`, `pep-primary-p4-u-mc-021`, `pep-primary-p4-u-mc-022`, `pep-primary-p4-u-mc-023`, `pep-primary-p4-u-mc-024`, `pep-primary-p4-u-mc-025`, `pep-primary-p4-u-mc-026`, `pep-primary-p4-u-mc-027`, `pep-primary-p4-u-mc-028`, `pep-primary-p4-u-mc-029`, `pep-primary-p4-u-mc-030`, `pep-primary-p4-u-mc-031`, `pep-primary-p4-u-mc-032`, `pep-primary-p4-u-mc-033`, `pep-primary-p4-u-mc-034`, `pep-primary-p4-u-mc-035`, `pep-primary-p4-u-mc-036`, `pep-primary-p4-u-mc-037`, `pep-primary-p4-u-mc-038`, `pep-primary-p4-u-mc-039`, `pep-primary-p4-u-mc-040`, `pep-primary-p4-u-mc-041`, `pep-primary-p4-u-mc-042`, `pep-primary-p4-u-mc-043`, `pep-primary-p4-u-mc-044`, `pep-primary-p4-u-mc-045`, `pep-primary-p4-u-mc-046`, `pep-primary-p4-u-mc-047`, `pep-primary-p4-u-mc-048`, `pep-primary-p4-u-mc-049`, `pep-primary-p4-u-mc-050`

### 小数方程/购物情境可选图 (`decimals-equations`)

`pep-primary-p5-u-mc-001`, `pep-primary-p5-u-mc-002`, `pep-primary-p5-u-mc-003`, `pep-primary-p5-u-mc-004`, `pep-primary-p5-u-mc-005`, `pep-primary-p5-u-mc-006`, `pep-primary-p5-u-mc-007`, `pep-primary-p5-u-mc-008`, `pep-primary-p5-u-mc-009`, `pep-primary-p5-u-mc-010`, `pep-primary-p5-u-mc-011`, `pep-primary-p5-u-mc-012`, `pep-primary-p5-u-mc-013`, `pep-primary-p5-u-mc-014`, `pep-primary-p5-u-mc-015`, `pep-primary-p5-u-mc-016`, `pep-primary-p5-u-mc-017`, `pep-primary-p5-u-mc-018`, `pep-primary-p5-u-mc-019`, `pep-primary-p5-u-mc-020`, `pep-primary-p5-u-mc-021`, `pep-primary-p5-u-mc-022`, `pep-primary-p5-u-mc-023`, `pep-primary-p5-u-mc-024`, `pep-primary-p5-u-mc-025`, `pep-primary-p5-u-mc-026`, `pep-primary-p5-u-mc-027`, `pep-primary-p5-u-mc-028`, `pep-primary-p5-u-mc-029`, `pep-primary-p5-u-mc-030`, `pep-primary-p5-u-mc-031`, `pep-primary-p5-u-mc-032`, `pep-primary-p5-u-mc-033`, `pep-primary-p5-u-mc-034`, `pep-primary-p5-u-mc-035`, `pep-primary-p5-u-mc-036`, `pep-primary-p5-u-mc-037`, `pep-primary-p5-u-mc-038`, `pep-primary-p5-u-mc-039`, `pep-primary-p5-u-mc-040`, `pep-primary-p5-u-mc-041`, `pep-primary-p5-u-mc-042`, `pep-primary-p5-u-mc-043`, `pep-primary-p5-u-mc-044`, `pep-primary-p5-u-mc-045`, `pep-primary-p5-u-mc-046`, `pep-primary-p5-u-mc-047`, `pep-primary-p5-u-mc-048`, `pep-primary-p5-u-mc-049`, `pep-primary-p5-u-mc-050`

## GPT Image2 Production Guidance

- First pass: generate only `core` and `recommended` rows, total 1100.
- Keep exact numerals, answer choices, formulas, and labels out of the image model where practical; add them later as deterministic overlays if question-level rendering is implemented.
- Use the `illustrationKind` column to batch similar prompts and create reusable visual templates.
- Do not copy textbook visual layouts, screenshots, publisher marks, or workbook page designs.
- Do not modify `Question` types or product question data until asset naming, storage, and UI rendering are separately assigned.

## Checks Not Run

Not run: content QA/report-only change. The generator performed its own count validations and compiled the source question data into `.tmp/` for read-only inspection.
