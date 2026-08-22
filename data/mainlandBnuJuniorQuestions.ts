import questionPackJson from "./generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json";
import {
  stripHjbGeneratorPromptPrefix,
  toSafeMainlandSimplifiedText,
  toTraditionalHjbText
} from "./hjbQuestionLocalization";
import { chinaLessonEnglishTranslation } from "./chinaLessonEnglishTranslations";
import { mainlandBnuJuniorTopics } from "./mainlandBnuJuniorTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  CurriculumProfile,
  Difficulty,
  DifficultyRecord,
  MainlandBnuJuniorGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type MainlandBnuJuniorGeneratedBatch = "bnu-junior-v1-1500";

type GeneratedBnuJuniorQuestion = {
  id: string;
  batch: "bnu-junior-v1";
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  misconceptionTags: string[];
  difficulty: DifficultyRecord;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  zhongkaoPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-s18-review" | "pass";
  terminologyQaStatus: "pending-s18-review" | "pass";
  manualQaStatus: "pending-s18-review" | "approved";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedBnuJuniorQuestionPack = {
  questions: GeneratedBnuJuniorQuestion[];
};

type ReviewedBnuJuniorCorrection = Partial<Pick<
  GeneratedBnuJuniorQuestion,
  "promptZhHans" | "optionsZhHans" | "answer" | "acceptedAnswers" | "explanationZhHans"
>> & {
  promptEn?: string;
  optionsEn?: string[];
  explanationEn: string;
};

export type MainlandBnuJuniorQuestionGenerationMetadata = {
  batch: MainlandBnuJuniorGeneratedBatch;
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  zhongkaoPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedBnuJuniorQuestionPack;
const mainlandBnuJuniorProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const topicById = new Map(mainlandBnuJuniorTopics.map((topic) => [topic.id, topic]));
const parallelLineStandardContextZhHans = "直线上的点序依次为A-G-B、C-H-D，截线上的点序为E-G-H-F；点A、C位于截线EF同一侧，点B、D位于另一侧。";
const parallelLineStandardContextEn = "The point orders are A-G-B on line AB, C-H-D on line CD, and E-G-H-F on the transversal EF. Points A and C lie on the same side of EF, while B and D lie on the other side.";
const supplementalAcceptedAnswerCorrections: Record<string, string[]> = {
  "bnu-junior-ds-v1-s1-003": ["6个"],
  "bnu-junior-ds-v1-s1-005": ["5个"],
  "bnu-junior-ds-v1-s1-006": ["Minimum 4, maximum 8"],
  "bnu-junior-ds-v1-s1-009": ["5个"],
  "bnu-junior-ds-v1-s1-015": ["6个"],
  "bnu-junior-ds-v1-s1-024": ["5个"],
  "bnu-junior-ds-v1-s1-480": ["8个"],
  "bnu-junior-ds-v1-s1-378": ["Q = 40 - 5t; independent variable is t, dependent variable is Q"],
  "bnu-junior-ds-v1-s1-380": ["200/3 m/min (≈66.7 m/min)"],
  "bnu-junior-ds-v1-s1-381": ["(1) independent variable t, dependent variable s; (2) 30 km/h; (3) s = 120 - 30t"],
  "bnu-junior-ds-v1-s1-383": ["(1) y = 8 + 1.5⌈x-3⌉ (x≥3); (2) 17 yuan"],
  "bnu-junior-ds-v1-s1-460": ["25 equally likely ordered pairs in total; 9 cases where both draws are red balls."],
  "bnu-junior-ds-v1-s2-043": ["a is an irrational number (a = √20 = 2√5)"],
  "bnu-junior-ds-v1-s2-041": ["(1) -√3, √5, and √8 are all irrational numbers, since each is a non-terminating, non-repeating decimal. (2) √5 lies between 2 and 3 because 2²=4<5<9=3². (3) -√3<√5 because a negative number is less than a positive number."],
  "bnu-junior-ds-v1-s2-047": ["√5<2.5<√7; √5 is an irrational number because it is a non-terminating, non-repeating decimal."],
  "bnu-junior-ds-v1-s2-236": ["AB∥CD. Because ∠AGE and ∠GHC are corresponding angles and both equal 70°, so the two lines are parallel."],
  "bnu-junior-ds-v1-s2-125": ["When 0 ≤ x ≤ 3, y = 8; when x > 3, y = 8 + 1.5 × ⌈x - 3⌉. At x = 7.8: 7.8 - 3 = 4.8, ceil = 5, fare = 8 + 1.5×5 = 15.5 yuan."],
  "bnu-junior-ds-v1-s2-164": ["x + y = 17, 8x + 5y = 100; x = 5, y = 12"],
  "bnu-junior-ds-v1-s2-197": ["Jia's variance is 0.6, Yi's variance is 2.0, and Jia's performance is more consistent."],
  "bnu-junior-ds-v1-s2-200": ["Both Jia and Yi have mean height 86 cm; Jia's variance is 2.0 and Yi's variance is 6.0, so Jia's plant heights are more uniform."],
  "bnu-junior-ds-v1-s2-203": ["Recommend A (Jia). A's mean is 9 and variance is 0.4; B's mean is 9 and variance is 1.6; A is more consistent."],
  "bnu-junior-ds-v1-s3-234": ["6个"],
  "bnu-junior-ds-v1-s3-249": ["4个"],
  "bnu-junior-ds-v1-s3-270": ["90个"],
  "bnu-junior-ds-v1-s3-275": ["48千米/时", "48千米每小时"],
  "bnu-junior-ds-v1-s3-291": ["48个"]
};

const exactRuntimeAcceptedAnswerCorrections: Record<string, string[]> = {
  "bnu-junior-ds-v1-s2-258": ["3", "3个", "①②③"]
};

const reviewedCorrections: Record<string, ReviewedBnuJuniorCorrection> = {
  "bnu-junior-ds-v1-s1-041": {
    promptZhHans: "在本课学习的长方体和正方体中，哪些几何体由6个面、12条棱和8个顶点组成，并且每个面都是四边形？请写出所有符合条件的名称并说明理由。",
    promptEn: "Among the cuboid and cube studied in this lesson, which solids have 6 faces, 12 edges, and 8 vertices, with every face a quadrilateral? Name all that satisfy the conditions and explain why.",
    answer: "长方体和正方体。它们都有6个面、12条棱、8个顶点，且每个面都是四边形。",
    acceptedAnswers: [
      "长方体和正方体。它们都有6个面、12条棱、8个顶点，且每个面都是四边形。",
      "長方體和正方體。它們都有6個面、12條稜、8個頂點，且每個面都是四邊形。",
      "Cuboid and cube. Both have 6 faces, 12 edges, and 8 vertices, and every face is a quadrilateral."
    ],
    explanationZhHans: "长方体有6个面、12条棱和8个顶点，每个面都是长方形；正方体是特殊的长方体，6个面都是正方形。正方形和长方形都是四边形，所以两者都符合题目限定的条件。",
    explanationEn: "A cuboid has 6 faces, 12 edges, and 8 vertices, and every face is a rectangle. A cube is a special cuboid whose faces are squares. Since both rectangles and squares are quadrilaterals, both solids satisfy the stated conditions."
  },
  "bnu-junior-ds-v1-s3-006": {
    promptZhHans: "在矩形ABCD中，AB＝3，BC＝4，点P是边AD上且不与A重合的动点，连接BP，作点A关于BP的对称点A'。当点A'落在矩形ABCD的边上时，AP的长为______。",
    promptEn: "In rectangle ABCD, AB=3 and BC=4. Point P moves on side AD but does not coincide with A. Reflect A across BP to A'. If A' lies on a side of the rectangle, find AP.",
    answer: "3",
    acceptedAnswers: ["3"],
    explanationZhHans: "建立坐标系：A(0,0)、B(3,0)、D(0,4)，设P(0,x)，其中0<x≤4。点A关于直线BP的对称点为A'(6x²/(x²+9),18x/(x²+9))。A'在BC上时横坐标为3，解得x=3；A'在CD上要求18x/(x²+9)=4，该方程无实数解；A'在AB或AD上只会给出已排除的x=0。因此AP=3。",
    explanationEn: "Set A=(0,0), B=(3,0), D=(0,4), and P=(0,x), where 0<x<=4. Reflecting A across BP gives A'=(6x^2/(x^2+9), 18x/(x^2+9)). If A' lies on BC, its x-coordinate is 3, which gives x=3. The equation for A' on CD has no real solution, while AB or AD gives only the excluded endpoint x=0. Hence AP=3."
  },
  "bnu-junior-ds-v1-s3-007": {
    promptEn: "In rhombus ABCD, angle ABC is 120 degrees. Points E and F lie on BC and CD respectively, and triangle AEF is equilateral. If AB=2, find CE.",
    answer: "2",
    acceptedAnswers: ["2", "D", "第4项"],
    explanationZhHans: "取B(0,0)、C(2,0)、A(-1,√3)、D(1,√3)。设E(e,0)，F(2-t,t√3)，其中0≤e≤2、0≤t≤1。由△AEF为等边三角形，联立AE²=AF²=EF²可得e(3-t)=2t(t-1)。左边非负、右边非正，故只能同时为0；检验得t=1、e=0（t=0不满足等边条件）。因此E与B重合、F与D重合，CE=BC=2，选第4项。",
    explanationEn: "Use coordinates B=(0,0), C=(2,0), A=(-1,sqrt(3)), and D=(1,sqrt(3)). Write E=(e,0) and F=(2-t,t sqrt(3)). The equilateral conditions AE^2=AF^2=EF^2 imply e(3-t)=2t(t-1). The left side is nonnegative and the right side nonpositive, so both must be zero. Checking the endpoint cases leaves t=1 and e=0. Thus E=B and F=D, so CE=BC=2, option 4."
  },
  "bnu-junior-ds-v1-s3-013": {
    promptZhHans: "已知四边形ABCD中，对角线AC与BD相交于点O。给出以下四个条件：①AB=CD，AD=BC；②∠ABC=90°；③AC=BD，且AC⊥BD；④OA=OC，OB=OD，且AC=BD。请问能判定四边形ABCD为正方形的条件是（ ）",
    promptEn: "In quadrilateral ABCD, diagonals AC and BD meet at O. Conditions are: (1) AB=CD and AD=BC; (2) angle ABC=90 degrees; (3) AC=BD and AC is perpendicular to BD; (4) OA=OC, OB=OD, and AC=BD. Which pair guarantees that ABCD is a square?",
    optionsEn: ["Conditions 1 and 2", "Conditions 2 and 3", "Conditions 3 and 4", "Conditions 1 and 4"],
    answer: "③④",
    acceptedAnswers: ["③④", "C", "第3项"],
    explanationZhHans: "条件④说明两条对角线互相平分且相等，所以ABCD是矩形；再由条件③中的AC⊥BD可知该矩形也是菱形，故为正方形。①②只能得到矩形，①④也只能得到矩形；②③没有保证对角线互相平分或两组对边平行，不能判定为正方形。因此只有③④充分。",
    explanationEn: "Condition 4 says the diagonals bisect each other and are equal, so ABCD is a rectangle. Condition 3 additionally makes the diagonals perpendicular, so that rectangle is also a rhombus and therefore a square. Conditions 1 and 2 or 1 and 4 give only a rectangle, while 2 and 3 do not establish a parallelogram. Thus only conditions 3 and 4 are sufficient."
  },
  "bnu-junior-ds-v1-s3-019": {
    optionsZhHans: ["①③", "①③④", "①②④", "②③④"],
    optionsEn: ["Conditions 1 and 3", "Conditions 1, 3, and 4", "Conditions 1, 2, and 4", "Conditions 2, 3, and 4"],
    answer: "①②④",
    acceptedAnswers: ["①②④", "C", "第3项"],
    explanationZhHans: "由①得平行四边形；再由②得菱形，由④得矩形，所以①②④可判定为正方形。①③和①③④只保证矩形，不能保证邻边相等。②③④没有保证两条对角线互相平分或两组对边平行，也不足。因此只有第3项。",
    explanationEn: "Condition 1 makes ABCD a parallelogram. Condition 2 then makes it a rhombus, and condition 4 makes it a rectangle, so conditions 1, 2, and 4 guarantee a square. Conditions 1 and 3, even with 4, guarantee only a rectangle. Conditions 2, 3, and 4 do not establish that the diagonals bisect each other or that both pairs of opposite sides are parallel. Thus only option 3 is sufficient."
  },
  "bnu-junior-ds-v1-s3-022": {
    optionsZhHans: ["AB = BC", "∠BAD = 90°", "OA = OC", "∠BAD = 60°"],
    optionsEn: ["AB=BC", "angle BAD=90 degrees", "OA=OC", "angle BAD=60 degrees"],
    answer: "∠BAD = 90°",
    acceptedAnswers: ["∠BAD = 90°", "∠BAD=90°", "B", "第2项"],
    explanationZhHans: "已知两组对边分别平行，所以ABCD是平行四边形；又AC⊥BD，所以它是菱形。菱形再有一个直角即为正方形，故∠BAD=90°充分。AB=BC和OA=OC都是该菱形已经具有的性质，不能进一步保证直角；∠BAD=60°反而不能得到正方形。因此只有第2项。",
    explanationEn: "Both pairs of opposite sides are parallel, so ABCD is a parallelogram. Its perpendicular diagonals make it a rhombus. A rhombus with one right angle is a square, so angle BAD=90 degrees is sufficient. AB=BC and OA=OC already hold in this rhombus and do not force a right angle, while angle BAD=60 degrees rules out a square. Thus only option 2 works."
  },
  "bnu-junior-ds-v1-s3-175": {
    optionsZhHans: ["DE∥BC", "∠ADE=∠B", "AD/AB=AE/AC", "AD/DB=DE/BC"],
    optionsEn: ["DE is parallel to BC", "angle ADE equals angle B", "AD/AB=AE/AC", "AD/DB=DE/BC"],
    answer: "AD/DB=DE/BC",
    acceptedAnswers: ["AD/DB=DE/BC", "D"],
    explanationZhHans: "A由平行线得到两组对应角相等，可用AA判定相似；B与公共角∠DAE=∠BAC也可用AA判定；C由两组对应边成比例且夹角相等，可用SAS判定。D把分点比AD/DB与DE/BC相等，不能推出AD/AB=AE/AC或另一组对应角相等，因此不能保证△ADE∽△ABC。",
    explanationEn: "A gives two equal angle pairs from parallel lines, so AA applies. B combines angle ADE=angle B with the common angle at A, so AA applies. C gives proportional corresponding sides with the included angle equal, so SAS applies. D relates AD/DB to DE/BC but does not force AD/AB=AE/AC or a second equal-angle pair, so it is insufficient."
  },
  "bnu-junior-ds-v1-s3-274": {
    optionsZhHans: [
      "该函数的图象经过点 (2, -1)",
      "该函数的图象位于第一、三象限",
      "当 x > 0 时，y 随 x 的增大而减小",
      "a 的值为 2"
    ],
    optionsEn: [
      "The graph passes through (2, -1)",
      "The graph lies in quadrants I and III",
      "When x > 0, y decreases as x increases",
      "The value of a is 2"
    ],
    answer: "该函数的图象经过点 (2, -1)",
    acceptedAnswers: ["该函数的图象经过点 (2, -1)", "該函數的圖像經過點 (2, -1)", "The graph passes through (2, -1)", "A"],
    explanationZhHans: "由P(-1,2)得a=(-1)×2=-2，所以函数为y=-2/x。点(2,-1)满足函数关系，A正确；图象位于第二、四象限，B错误；当x>0时，y随x增大而增大，C所说的“减小”错误；a=-2，D错误。因此只有A正确。",
    explanationEn: "Substituting P(-1,2) gives a=(-1)(2)=-2, so y=-2/x. The point (2,-1) lies on the graph, making A true. The graph lies in quadrants II and IV, and for x>0 its y-value increases as x increases. Also a=-2. Thus B, C, and D are false, and only A is correct."
  },
  "bnu-junior-ds-v1-s1-002": {
    acceptedAnswers: [
      "长8 cm，宽3 cm。理由：从正前方观察，看到的是长方体的前面，前面的长是长方体的长8 cm，宽是长方体的高3 cm。",
      "長8 cm，寬3 cm。理由：從正前方觀察，看到的是長方體的前面，前面的長是長方體的長8 cm，寬是長方體的高3 cm。",
      "Length 8 cm, width 3 cm. Reason: When observing from the front, you see the front face of the cuboid. The length of the front face is the length of the cuboid 8 cm, and the width is the height of the cuboid 3 cm.",
      "Length 8 cm, width 3 cm. Reason: From directly ahead you see the front face, whose horizontal dimension is the prism's length (8 cm) and whose vertical dimension is the prism's height (3 cm).",
      "Length 8 cm, width 3 cm. Reason: From directly ahead you see the front face of the rectangular prism, whose horizontal dimension is the prism's length (8 cm) and whose vertical dimension is the prism's height (3 cm)."
    ],
    explanationZhHans: "从正前方看长方体，看到的是前面。前面的尺寸由长方体的长和高决定，因此长为8 cm，宽为3 cm。",
    explanationEn: "A front view shows the cuboid's front face. Its horizontal dimension is the cuboid's length, 8 cm, and its vertical dimension is the height, 3 cm."
  },
  "bnu-junior-ds-v1-s1-035": {
    acceptedAnswers: [
      "圆形，因为圆柱的上下底面是圆，从正上方看时视线垂直于底面，看到的是底面圆的形状。",
      "圓形，因為圓柱的上下底面是圓，從正上方看時視線垂直於底面，看到的是底面圓的形狀。",
      "A circle, because a cylinder has circular bases and a top view looks perpendicular to a base."
    ],
    explanationZhHans: "圆柱的俯视图是圆，因为视线方向与底面垂直，底面圆的投影即为圆。",
    explanationEn: "The top view of a cylinder is a circle because the viewing direction is perpendicular to its circular base."
  },
  "bnu-junior-ds-v1-s1-215": {
    acceptedAnswers: [
      "估计最喜欢篮球的居民约有580人。依据：样本中最喜欢篮球的比例为58÷200=0.29，用该比例估计总体，2000×0.29=580人。",
      "估計最喜歡籃球的居民約有580人。依據：樣本中最喜歡籃球的比例為58÷200=0.29，用該比例估計總體，2000×0.29=580人。",
      "About 580 residents, because 58/200=0.29 and 2000*0.29=580."
    ],
    explanationZhHans: "用样本比例估计总体比例：58/200=0.29，2000×0.29=580。前提是样本具有随机性和代表性。",
    explanationEn: "Use the sample proportion to estimate the population proportion: 58/200=0.29, so 2000*0.29=580, assuming the random sample is representative."
  },
  "bnu-junior-ds-v1-s1-422": {
    acceptedAnswers: [
      "关于x轴对称。因为点A和点B的横坐标相同，纵坐标互为相反数，所以它们关于x轴对称。",
      "關於x軸對稱。因為點A和點B的橫坐標相同，縱坐標互為相反數，所以它們關於x軸對稱。",
      "Symmetric about the x-axis. Since point A and point B have the same x-coordinate and their y-coordinates are opposites, they are symmetric about the x-axis."
    ],
    explanationZhHans: "点A(2,3)与点B(2,-3)横坐标相同，纵坐标互为相反数，符合关于x轴对称的点的坐标特征，因此对称轴是x轴。",
    explanationEn: "Points A(2,3) and B(2,-3) have the same x-coordinate and opposite y-coordinates, which is exactly the coordinate rule for reflection in the x-axis."
  },
  "bnu-junior-ds-v1-s2-389": {
    acceptedAnswers: [
      "3x^2y(2x - 3y + 1)，使用了提公因式法",
      "3x^2y(2x - 3y + 1)，提公因式法",
      "3x^2y(2x - 3y + 1), using the method of factoring out the common factor."
    ],
    explanationZhHans: "先找公因式：系数6、-9、3的最大公约数是3，字母部分都有x^2y，故公因式为3x^2y。提取后剩余2x - 3y + 1。",
    explanationEn: "The greatest common numerical factor is 3 and every term contains x^2y. Factoring out 3x^2y leaves 2x-3y+1."
  },
  "bnu-junior-ds-v1-s3-026": {
    acceptedAnswers: [
      "正方形。理由：由平行四边形和条件③得一个角是直角，故为矩形；由平行四边形和条件④得对角线互相垂直，故为菱形；既是矩形又是菱形，所以是正方形。",
      "正方形，因为平行四边形有一个角是直角且对角线互相垂直，所以是正方形"
    ],
    explanationZhHans: "平行四边形有一个直角就是矩形，对角线互相垂直又使它成为菱形；既是矩形又是菱形，所以是正方形。",
    explanationEn: "A parallelogram with a right angle is a rectangle, and perpendicular diagonals make it a rhombus. Being both a rectangle and a rhombus makes it a square."
  },
  "bnu-junior-ds-v1-s3-173": {
    answer: "相似，因为∠A=∠D=50°，∠B=∠F=60°，所以由两角分别相等可知△ABC∽△DFE。",
    acceptedAnswers: [
      "相似，因为∠A=∠D=50°，∠B=∠F=60°，所以由两角分别相等可知△ABC∽△DFE。",
      "相似，因为∠A=∠D且∠B=∠F，所以△ABC∽△DFE",
      "The triangles are similar: angle A equals angle D and angle B equals angle F, so triangle ABC is similar to triangle DFE."
    ],
    explanationZhHans: "△ABC中∠C=180°-50°-60°=70°；△DEF中∠F=180°-50°-70°=60°。因此∠A=∠D=50°，∠B=∠F=60°，∠C=∠E=70°，按A↔D、B↔F、C↔E的对应关系，由AA可知△ABC∽△DFE。",
    explanationEn: "Triangle ABC has angles 50, 60, and 70 degrees. Triangle DEF has angles D=50, E=70, and F=60 degrees. Thus A corresponds to D, B to F, and C to E, so AA gives triangle ABC similar to triangle DFE."
  },
  "bnu-junior-ds-v1-s1-014": {
    answer: "（1）6个面；（2）12条棱；（3）8个顶点",
    acceptedAnswers: ["（1）6个面；（2）12条棱；（3）8个顶点", "6个面，12条棱，8个顶点"],
    explanationZhHans: "两个棱长为2 cm的正方体沿整个面拼合后，外形是一个4 cm×2 cm×2 cm的长方体。长方体有6个面、12条棱和8个顶点。",
    explanationEn: "Joining the two 2 cm cubes along a whole face makes one 4 cm by 2 cm by 2 cm cuboid. A cuboid has 6 faces, 12 edges, and 8 vertices."
  },
  "bnu-junior-ds-v1-s1-017": {
    answer: "（1）6个面；（2）12条棱；（3）8个顶点",
    acceptedAnswers: ["（1）6个面；（2）12条棱；（3）8个顶点", "6个面，12条棱，8个顶点"],
    explanationZhHans: "两个同样的正方体以一个完整的面拼合，组合体的外轮廓是长方体。按组合体的完整面、棱和顶点计数，分别有6个面、12条棱和8个顶点。",
    explanationEn: "Two congruent cubes joined along one complete face form a cuboid. Counting the complete faces, edges, and vertices of that cuboid gives 6 faces, 12 edges, and 8 vertices."
  },
  "bnu-junior-ds-v1-s1-019": {
    answer: "5个",
    acceptedAnswers: ["5个", "5"],
    explanationZhHans: "把前排第1列和第3列各放2个小立方块，再在后排第2列放1个，共5个。正面各列最高层数为2、1、2，左面两排最高层数为2、1，因此5个可以实现；每个正面列又都必须至少有一堆，所以不可能少于5个。",
    explanationEn: "Place stacks of height 2 in the first and third columns of the front row and one cube in the second column of the back row. This uses 5 cubes and gives front maxima 2, 1, 2 and side maxima 2, 1, so 5 is attainable and minimal."
  },
  "bnu-junior-ds-v1-s1-026": {
    explanationZhHans: "把长方体表面沿三种方式展开，相对顶点间的候选距离分别为√((8+5)²+4²)=√185、√((8+4)²+5²)=13、√((5+4)²+8²)=√145。三者中√145最小，所以最短路线长为√145 cm。",
    explanationEn: "Unfolding the cuboid in the three possible ways gives candidate distances sqrt((8+5)^2+4^2)=sqrt(185), sqrt((8+4)^2+5^2)=13, and sqrt((5+4)^2+8^2)=sqrt(145). The smallest is sqrt(145) cm."
  },
  "bnu-junior-ds-v1-s1-028": {
    promptZhHans: "有一个密封的正方体盒子，六个面上分别标有数字1、2、3、4、5、6。与数字1、2、3相邻的四个面上的数字之和分别为14、14、14。请问与数字4相对的面上的数字是多少？",
    promptEn: "A sealed cube has the numbers 1, 2, 3, 4, 5, and 6 on its faces. The sums on the four faces adjacent to faces 1, 2, and 3 are 14, 14, and 14, respectively. Which number is opposite 4?",
    answer: "3",
    acceptedAnswers: ["3", "数字3"],
    explanationZhHans: "六个面的数字总和是21。若数字x的对面是y，则与x相邻的四面之和为21-x-y。由三组和都为14，依次得到1的对面是6、2的对面是5、3的对面是4，所以4的对面是3。",
    explanationEn: "The six face labels sum to 21. If y is opposite x, the four adjacent faces sum to 21-x-y. The three sums of 14 give opposite pairs 1-6, 2-5, and 3-4, so 3 is opposite 4."
  },
  "bnu-junior-ds-v1-s1-040": {
    explanationZhHans: "前排第1列和第3列各放2个小立方块，后排第2列放1个，就能同时得到正面2、1、2和左面2、1的最高层数，共需2+2+1=5个。每个正面列都必须出现，因此不能再减少。",
    explanationEn: "Use stacks of height 2 in the first and third front columns and one cube in the second back column. The required front and side maxima are then satisfied with 2+2+1=5 cubes, and no column can be omitted."
  },
  "bnu-junior-ds-v1-s1-138": {
    promptZhHans: "已知∠AOB=80°，射线OC在∠AOB外部，且∠AOC=130°。求∠BOC的所有可能值。",
    promptEn: "Given angle AOB=80 degrees, ray OC lies outside angle AOB, and angle AOC=130 degrees. Find every possible value of angle BOC.",
    answer: "50°或150°",
    acceptedAnswers: ["50°或150°", "50°，150°", "50度或150度"],
    explanationZhHans: "射线OC可能位于∠AOB的两侧。若OB位于OA与OC之间，则∠BOC=130°-80°=50°；若OA位于OB与OC之间，所求较小角为360°-(130°+80°)=150°。",
    explanationEn: "Ray OC can lie on either side of angle AOB. If OB lies between OA and OC, angle BOC is 130-80=50 degrees. In the other arrangement, the smaller angle is 360-(130+80)=150 degrees."
  },
  "bnu-junior-ds-v1-s1-230": {
    promptZhHans: "某班同学参加环保知识竞赛，成绩为：85，90，78，92，88，76，95，89，84，91，87，83，80，86，94。按70–79分、80–89分、90–99分三个分数段整理，哪个分数段人数最多？",
    promptEn: "A class scored 85, 90, 78, 92, 88, 76, 95, 89, 84, 91, 87, 83, 80, 86, and 94. Group the scores into 70-79, 80-89, and 90-99. Which group has the most students?",
    answer: "80~89分的人数最多，有8人。",
    acceptedAnswers: ["80~89分的人数最多，有8人。", "80–89分，8人", "80-89分有8人"],
    explanationZhHans: "70–79分有76、78，共2人；80–89分有80、83、84、85、86、87、88、89，共8人；90–99分有90、91、92、94、95，共5人。因此80–89分人数最多，有8人。",
    explanationEn: "There are 2 scores in 70-79, 8 scores in 80-89, and 5 scores in 90-99. Therefore the 80-89 group is the largest, with 8 students."
  },
  "bnu-junior-ds-v1-s1-276": {
    explanationZhHans: "(-2a²b)³=-8a⁶b³，除以4a³b²得-2a³b，再乘(-ab)²=a²b²，结果为-2a⁵b³。",
    explanationEn: "First, (-2a^2b)^3=-8a^6b^3. Dividing by 4a^3b^2 gives -2a^3b, and multiplying by (-ab)^2=a^2b^2 gives -2a^5b^3."
  },
  "bnu-junior-ds-v1-s1-278": {
    explanationZhHans: "(2x³)²=4x⁶，(-3x²)³=-27x⁶，(6x⁵)²=36x¹⁰。因此原式=(-108x¹²)/(36x¹⁰)=-3x²。",
    explanationEn: "We have (2x^3)^2=4x^6, (-3x^2)^3=-27x^6, and (6x^5)^2=36x^10. Hence the expression is -108x^12/(36x^10)=-3x^2."
  },
  "bnu-junior-ds-v1-s1-281": {
    explanationZhHans: "(-2a²b)³=-8a⁶b³，(1/2·ab²)²=1/4·a²b⁴。两式相乘得-2a⁸b⁷，再除以-a³b⁴，结果为2a⁵b³。",
    explanationEn: "The two powers are -8a^6b^3 and (1/4)a^2b^4. Their product is -2a^8b^7, and dividing by -a^3b^4 gives 2a^5b^3."
  },
  "bnu-junior-ds-v1-s1-284": {
    explanationZhHans: "展开并合并同类项：(x+2)(x-2)-(x-1)²=x²-4-(x²-2x+1)=2x-5。代入x=-1/2，得2×(-1/2)-5=-6。",
    explanationEn: "Expand and combine like terms: (x+2)(x-2)-(x-1)^2=x^2-4-(x^2-2x+1)=2x-5. Substituting x=-1/2 gives -6."
  },
  "bnu-junior-ds-v1-s1-287": {
    explanationZhHans: "另一边长为(6a³b²+4a²b³-2a²b²)÷(2ab)=3a²b+2ab²-ab。周长为2[2ab+(3a²b+2ab²-ab)]=6a²b+4ab²+2ab。",
    explanationEn: "The other side is (6a^3b^2+4a^2b^3-2a^2b^2)/(2ab)=3a^2b+2ab^2-ab. Thus the perimeter is 2[2ab+3a^2b+2ab^2-ab]=6a^2b+4ab^2+2ab."
  },
  "bnu-junior-ds-v1-s1-292": {
    explanationZhHans: "(-2a²)³=-8a⁶，(3ab²)²=9a²b⁴。相乘后除以a³b，得到-72a^(6+2-3)b^(4-1)=-72a⁵b³，所以选第3项。",
    explanationEn: "Since (-2a^2)^3=-8a^6 and (3ab^2)^2=9a^2b^4, division by a^3b gives -72a^(6+2-3)b^(4-1)=-72a^5b^3, option 3."
  },
  "bnu-junior-ds-v1-s1-293": {
    explanationZhHans: "(-2a²b)³=-8a⁶b³，(3ab²)²=9a²b⁴，乘积为-72a⁸b⁷。再除以-a³b⁴，得到72a⁵b³。",
    explanationEn: "The two powers are -8a^6b^3 and 9a^2b^4, so their product is -72a^8b^7. Dividing by -a^3b^4 gives 72a^5b^3."
  },
  "bnu-junior-ds-v1-s1-311": {
    promptZhHans: "直线AB与直线CD相交于点O，规定OA指向右方、OB指向左方，点D位于直线AB上方。射线OE在∠AOD内部，且∠AOE=30°，∠EOD=70°。过点O作直线MN⊥CD，并取点M位于直线AB上方。求∠BOM。",
    promptEn: "Lines AB and CD meet at O. Ray OA points right, ray OB points left, and D is above line AB. Ray OE lies inside angle AOD with angle AOE=30 degrees and angle EOD=70 degrees. Through O draw MN perpendicular to CD, choosing M above AB. Find angle BOM.",
    answer: "170°",
    acceptedAnswers: ["170°", "170度"],
    explanationZhHans: "∠AOD=30°+70°=100°。因此射线OD与向右的OA成100°角；与CD垂直且位于AB上方的射线OM与OA成10°角。OA与OB为反向射线，所以∠BOM=180°-10°=170°。",
    explanationEn: "Angle AOD is 30+70=100 degrees. The perpendicular ray OM above AB is therefore 10 degrees above the rightward ray OA. Since OB is opposite OA, angle BOM is 180-10=170 degrees."
  },
  "bnu-junior-ds-v1-s1-312": {
    explanationZhHans: "∠AOC与∠BOD是对顶角，所以∠BOD=80°。∠AOD与∠BOD互为邻补角，故∠AOD=100°。于是∠EOD=100°-35°=65°。",
    explanationEn: "Vertical angles give angle BOD=80 degrees. Since angles AOD and BOD form a linear pair, angle AOD=100 degrees, so angle EOD=100-35=65 degrees."
  },
  "bnu-junior-ds-v1-s1-315": {
    explanationZhHans: "∠AOD与∠BOD互为邻补角，所以∠AOD=180°-50°=130°。射线OE在∠AOD内，故∠EOD=130°-35°=95°。",
    explanationEn: "Angles AOD and BOD form a linear pair, so angle AOD=180-50=130 degrees. Subtracting angle AOE=35 degrees gives angle EOD=95 degrees."
  },
  "bnu-junior-ds-v1-s1-317": {
    explanationZhHans: "OC与OD是反向射线，所以∠COE+∠EOD=180°，得∠EOD=50°。于是∠AOD=∠AOE+∠EOD=100°。∠BOD与∠AOD互补，因此∠BOD=80°。",
    explanationEn: "Rays OC and OD are opposite, so angle EOD=180-130=50 degrees. Then angle AOD=50+50=100 degrees, and its linear-pair angle BOD is 80 degrees."
  },
  "bnu-junior-ds-v1-s1-320": {
    explanationZhHans: "∠AOC=50°，所以邻补角∠AOD=130°。OE平分∠AOD，故∠AOE=65°。OA与OB为反向射线，因此∠BOE=180°-65°=115°。",
    explanationEn: "The linear-pair angle AOD is 180-50=130 degrees. Its bisector gives angle AOE=65 degrees, so angle BOE=180-65=115 degrees."
  },
  "bnu-junior-ds-v1-s1-327": {
    explanationZhHans: "∠AOC=50°，所以∠AOD=180°-50°=130°。OE在∠AOD内，故∠DOE=130°-35°=95°。",
    explanationEn: "Angle AOD is supplementary to angle AOC, so it is 130 degrees. Subtracting angle AOE=35 degrees gives angle DOE=95 degrees."
  },
  "bnu-junior-ds-v1-s1-328": {
    explanationZhHans: "∠AOD与∠BOD互补，所以∠AOD=180°-110°=70°。再减去∠AOE=35°，得到∠EOD=35°，选第1项。",
    explanationEn: "Angle AOD=180-110=70 degrees. Therefore angle EOD=70-35=35 degrees, option 1."
  },
  "bnu-junior-ds-v1-s1-332": {
    promptZhHans: "直线AB与CD相交于点O，射线OE在∠AOD内部，且∠AOE=35°，∠EOD=55°。点F在直线CD上，且F与C在点O的同侧。求∠BOF，并判断直线AB与CD的位置关系。",
    promptEn: "Lines AB and CD meet at O. Ray OE lies inside angle AOD, with angle AOE=35 degrees and angle EOD=55 degrees. Point F lies on CD on the same side of O as C. Find angle BOF and state the relationship between AB and CD.",
    answer: "∠BOF=90°，AB⊥CD",
    acceptedAnswers: ["∠BOF=90°，AB⊥CD", "90°，AB⊥CD", "∠BOF=90度，AB垂直CD"],
    explanationZhHans: "∠AOD=35°+55°=90°，所以AB⊥CD。OB与OA反向，OF与OD反向，因此∠BOF与∠AOD是对顶角，∠BOF=90°。",
    explanationEn: "Angle AOD=35+55=90 degrees, so AB is perpendicular to CD. Rays OB and OF are opposite to OA and OD, respectively, making angle BOF vertical to angle AOD; hence angle BOF=90 degrees."
  },
  "bnu-junior-ds-v1-s1-336": {
    explanationZhHans: "∠AOD=35°+55°=90°，所以对顶角∠BOC=90°。OF平分∠BOC，因此∠BOF=90°÷2=45°。",
    explanationEn: "Angle AOD=35+55=90 degrees, so its vertical angle BOC is also 90 degrees. Since OF bisects angle BOC, angle BOF=45 degrees."
  },
  "bnu-junior-ds-v1-s1-434": {
    explanationZhHans: "直线BC经过B(4,3)和C(4,1)，方程为x=4。点A(2,3)到这条直线的水平距离是2，所以关于x=4对称后的横坐标为4+2=6，纵坐标不变，D=(6,3)。",
    explanationEn: "Line BC is x=4. Point A(2,3) is 2 units to its left, so its reflection is 2 units to the right with the same y-coordinate: D=(6,3)."
  },
  "bnu-junior-ds-v1-s1-440": {
    explanationZhHans: "A关于x轴的对称点为A'(2,-3)，B关于y轴的对称点为B'(-4,5)。因此A'B'=√[(-4-2)²+(5+3)²]=√100=10。",
    explanationEn: "The reflections are A'=(2,-3) and B'=(-4,5). Thus A'B'=sqrt((-4-2)^2+(5+3)^2)=sqrt(100)=10."
  },
  "bnu-junior-ds-v1-s1-450": {
    explanationZhHans: "C=(2,-3)，D=(-4,-1)。所以CD=√[(-4-2)²+(-1+3)²]=√40=2√10。",
    explanationEn: "The reflected points are C=(2,-3) and D=(-4,-1). Therefore CD=sqrt((-6)^2+2^2)=sqrt(40)=2sqrt(10)."
  },
  "bnu-junior-ds-v1-s1-456": {
    explanationZhHans: "C=(2,-3)，所以直线AC为x=2；D=(-2,-1)，而B=(2,-1)，所以直线BD为y=-1。两直线交于P=(2,-1)。",
    explanationEn: "Point C=(2,-3), so line AC is x=2. Point D=(-2,-1), so line BD through B=(2,-1) is y=-1. Their intersection is P=(2,-1)."
  },
  "bnu-junior-ds-v1-s1-485": {
    explanationZhHans: "四个事件的概率依次为1/2=0.50、3/10=0.30、1/6≈0.167、1/2=0.50。与0.35的差依次为0.15、0.05、约0.183、0.15，所以第2项最接近0.35。",
    explanationEn: "The four probabilities are 0.50, 0.30, about 0.167, and 0.50. Their distances from 0.35 are 0.15, 0.05, about 0.183, and 0.15, so option 2 is the closest."
  },
  "bnu-junior-ds-v1-s2-012": {
    explanationZhHans: "因为5²+12²=13²，所以△ABC在B点为直角。D在BC上且BD=4，于是△ABD也是直角三角形，AD=√(AB²+BD²)=√(25+16)=√41。",
    explanationEn: "Since 5^2+12^2=13^2, angle B is a right angle. Triangle ABD is therefore right-angled with legs 5 and 4, so AD=sqrt(25+16)=sqrt(41)."
  },
  "bnu-junior-ds-v1-s2-013": {
    explanationZhHans: "5²+12²=25+144=169=13²，所以△ABC是直角三角形。最长边AC所对的角是∠B，因此∠B=90°，选第1项。",
    explanationEn: "Because 5^2+12^2=13^2, triangle ABC is right-angled. The longest side AC is opposite angle B, so angle B is 90 degrees, option 1."
  },
  "bnu-junior-ds-v1-s2-031": {
    explanationZhHans: "AB²+BC²=5²+12²=169=AC²，所以由勾股定理的逆定理，△ABC是直角三角形。斜边是AC，故直角是∠B，选第1项。",
    explanationEn: "AB^2+BC^2=5^2+12^2=169=AC^2. By the converse of the Pythagorean theorem, the triangle is right-angled, and the angle opposite hypotenuse AC is angle B."
  },
  "bnu-junior-ds-v1-s2-066": {
    explanationZhHans: "正数的两个平方根互为相反数，所以(2a-3)+(5-a)=0，解得a=-2。两个平方根为-7和7，因此x=49，x的立方根为∛49。",
    explanationEn: "The two square roots of a positive number are opposites, so (2a-3)+(5-a)=0 and a=-2. The roots are -7 and 7, hence x=49 and its cube root is cube-root(49)."
  },
  "bnu-junior-ds-v1-s2-069": {
    explanationZhHans: "两个平方根互为相反数，故(2a-5)+(a+1)=0，得a=4/3。平方根为±7/3，所以这个正数是(7/3)²=49/9。",
    explanationEn: "The square roots are opposites, so (2a-5)+(a+1)=0 and a=4/3. The roots are plus or minus 7/3, making the number (7/3)^2=49/9."
  },
  "bnu-junior-ds-v1-s2-132": {
    explanationZhHans: "由两点(2,5)和(-1,-4)得斜率k=(5+4)/(2+1)=3，再得b=-1，所以函数为y=3x-1。它与两轴交于A(1/3,0)、B(0,-1)，故△AOB面积为1/2×1/3×1=1/6。",
    explanationEn: "The two given points give slope k=3 and intercept b=-1, so y=3x-1. The intercepts are A=(1/3,0) and B=(0,-1), and the triangle area is (1/2)(1/3)(1)=1/6."
  },
  "bnu-junior-ds-v1-s2-136": {
    explanationZhHans: "斜率k=[4-(-2)]/[1-(-2)]=2。代入点(1,4)得b=2，因此k+b=4，选第2项。",
    explanationEn: "The slope is [4-(-2)]/[1-(-2)]=2. Substitution into (1,4) gives b=2, so k+b=4, option 2."
  },
  "bnu-junior-ds-v1-s2-156": {
    explanationZhHans: "由-k+b=2和3k+b=-6，两式相减得4k=-8，所以k=-2。代回得b=0，因此k+b=-2。",
    explanationEn: "The data give -k+b=2 and 3k+b=-6. Subtracting yields 4k=-8, so k=-2 and b=0; therefore k+b=-2."
  },
  "bnu-junior-ds-v1-s2-160": {
    explanationZhHans: "解方程组得y=(3-a)/3，x=(a+6)/3。由y<0得a>3；此时x>0也自动成立，所以a>3，选第1项。",
    explanationEn: "Solving gives y=(3-a)/3 and x=(a+6)/3. The condition y<0 requires a>3, which also makes x>0, so option 1 is correct."
  },
  "bnu-junior-ds-v1-s2-192": {
    explanationZhHans: "由x+y=0得y=-x。代入3x-2y=5，得5x=5，所以x=1，y=-1。再代入4x+ay=1，得4-a=1，因此a=3。",
    explanationEn: "From x+y=0, y=-x. Substitution into 3x-2y=5 gives x=1 and y=-1. Then 4x+ay=1 becomes 4-a=1, so a=3."
  },
  "bnu-junior-ds-v1-s2-237": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=110°，∠CHF=70°；③∠BGH=80°，∠DHF=100°；④∠AGE=50°，∠CHG=130°。其中能判定AB∥CD的条件序号是______。`,
    promptEn: `${parallelLineStandardContextEn}\nConsider four conditions: (1) angle EGB=60 degrees and angle GHD=60 degrees; (2) angle AGH=110 degrees and angle CHF=70 degrees; (3) angle BGH=80 degrees and angle DHF=100 degrees; (4) angle AGE=50 degrees and angle CHG=130 degrees. List every condition that proves AB is parallel to CD.`,
    answer: "①",
    acceptedAnswers: ["①", "1", "条件①"],
    explanationZhHans: "条件①给出一对同位角∠EGB与∠GHD相等，因此能判定AB∥CD。其余三组在规定点序下既不是相等的同位角或内错角，也不是互补的同旁内角，所以只有①。",
    explanationEn: "Condition 1 makes the corresponding angles EGB and GHD equal, so it proves AB parallel to CD. None of the other pairs satisfies a valid converse parallel-line criterion in the declared order."
  },
  "bnu-junior-ds-v1-s2-240": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠AGE=60°，∠CHG=120°；②∠BGE=70°，∠DHF=70°；③∠AGH=110°，∠CHF=70°；④∠BGH=80°，∠CHG=100°。其中能判定AB∥CD的条件序号是______；若没有，请填“无”。`,
    promptEn: `${parallelLineStandardContextEn}\nConsider: (1) angle AGE=60 and angle CHG=120; (2) angle BGE=70 and angle DHF=70; (3) angle AGH=110 and angle CHF=70; (4) angle BGH=80 and angle CHG=100. List every condition proving AB parallel to CD, or write none.`,
    answer: "无",
    acceptedAnswers: ["无", "没有", "无一条件"],
    explanationZhHans: "按规定点序，①和④比较的是应当相等的角却给出互补值；②不是一对同位角或内错角；③的一对同位角不相等。因此四个条件都不能单独判定AB∥CD。",
    explanationEn: "With the declared point order, conditions 1 and 4 make angle pairs supplementary when they would need to be equal, condition 2 does not pair corresponding or alternate interior angles, and condition 3 gives unequal corresponding angles. None is sufficient."
  },
  "bnu-junior-ds-v1-s2-243": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=120°；②∠AGH=70°，∠CHF=70°；③∠BGH=110°，∠DHF=110°；④∠AGE=50°，∠CHG=130°。其中能判定AB∥CD的条件有多少个？`,
    promptEn: `${parallelLineStandardContextEn}\nOf these conditions, how many prove AB parallel to CD: (1) angle EGB=60 and angle GHD=120; (2) angle AGH=70 and angle CHF=70; (3) angle BGH=110 and angle DHF=110; (4) angle AGE=50 and angle CHG=130?`,
    answer: "2",
    acceptedAnswers: ["2", "2个", "②③"],
    explanationZhHans: "②中的∠AGH与∠CHF、③中的∠BGH与∠DHF分别是一对相等的同位角，都能判定平行。①和④对应的角不相等，因此共有2个条件。",
    explanationEn: "Conditions 2 and 3 each give a pair of equal corresponding angles, so each proves the lines parallel. Conditions 1 and 4 do not; therefore there are 2."
  },
  "bnu-junior-ds-v1-s2-244": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=120°；②∠AGE=110°，∠CHG=70°；③∠BGH=80°，∠DHF=100°；④∠AGH=90°，∠GHC=90°。其中能判定AB∥CD的条件共有几个？`,
    promptEn: `${parallelLineStandardContextEn}\nHow many conditions prove AB parallel to CD: (1) angle EGB=60 and angle GHD=120; (2) angle AGE=110 and angle CHG=70; (3) angle BGH=80 and angle DHF=100; (4) angle AGH=90 and angle GHC=90?`,
    answer: "1个",
    acceptedAnswers: ["1个", "1", "④"],
    explanationZhHans: "④中的∠AGH与∠GHC是同旁内角，90°+90°=180°，能判定AB∥CD。前三组都没有满足相应的平行线判定条件，所以共有1个。",
    explanationEn: "In condition 4, angles AGH and GHC are same-side interior angles and sum to 180 degrees, so it proves the lines parallel. The other conditions do not, leaving 1 valid condition."
  },
  "bnu-junior-ds-v1-s2-247": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=120°，∠GHD=60°；③∠BGH=120°，∠GHC=120°；④∠AGH=60°，∠CHF=120°。其中能判定AB∥CD的条件有几个？`,
    promptEn: `${parallelLineStandardContextEn}\nHow many conditions prove AB parallel to CD: (1) angle EGB=60 and angle GHD=60; (2) angle AGH=120 and angle GHD=60; (3) angle BGH=120 and angle GHC=120; (4) angle AGH=60 and angle CHF=120?`,
    answer: "2个",
    acceptedAnswers: ["2个", "2", "①③"],
    explanationZhHans: "①给出相等的同位角，③给出相等的内错角，所以二者都能判定AB∥CD。②的内错角不相等，④的同位角不相等，因此共有2个。",
    explanationEn: "Condition 1 gives equal corresponding angles, and condition 3 gives equal alternate interior angles. Conditions 2 and 4 give unequal required pairs, so exactly 2 conditions work."
  },
  "bnu-junior-ds-v1-s2-248": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠AGE=60°，∠CHG=120°；②∠BGE=70°，∠DHF=70°；③∠AGH=110°，∠CHF=70°；④∠BGH=80°，∠CHG=100°。哪些条件能判定AB∥CD？请写出所有序号并说明理由；若没有，请写“无”。`,
    promptEn: `${parallelLineStandardContextEn}\nWhich conditions prove AB parallel to CD: (1) angle AGE=60 and angle CHG=120; (2) angle BGE=70 and angle DHF=70; (3) angle AGH=110 and angle CHF=70; (4) angle BGH=80 and angle CHG=100? List all, or write none, and justify.`,
    answer: "无",
    acceptedAnswers: ["无", "没有", "无一条件"],
    explanationZhHans: "逐项对照平行线判定：①的同位角不相等，②所给两角不是同位角或内错角，③的同位角不相等，④的内错角不相等。因此没有一个条件足以判定AB∥CD。",
    explanationEn: "Condition 1 has unequal corresponding angles; condition 2 does not identify a corresponding or alternate interior pair; condition 3 has unequal corresponding angles; and condition 4 has unequal alternate interior angles. None is sufficient."
  },
  "bnu-junior-ds-v1-s2-250": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=120°，∠GHD=60°；③∠EGB=60°，∠CHF=120°；④∠AGH=120°，∠CHF=120°。其中能判定AB∥CD的条件有几个？`,
    promptEn: `${parallelLineStandardContextEn}\nHow many conditions prove AB parallel to CD: (1) angle EGB=60 and angle GHD=60; (2) angle AGH=120 and angle GHD=60; (3) angle EGB=60 and angle CHF=120; (4) angle AGH=120 and angle CHF=120?`,
    answer: "2个",
    acceptedAnswers: ["2个", "2", "①④"],
    explanationZhHans: "①给出相等的同位角，④给出相等的同位角，所以二者能判定平行。②的内错角不相等；③利用对顶角换算后，同位角仍不相等。因此共有2个。",
    explanationEn: "Conditions 1 and 4 give equal corresponding angles and prove the lines parallel. Conditions 2 and 3 do not satisfy the required equality, so the count is 2."
  },
  "bnu-junior-ds-v1-s2-252": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠AGE=60°，∠CHG=120°；②∠BGE=70°，∠DHF=70°；③∠AGH=50°，∠GHD=50°；④∠BGH=110°，∠CHF=70°。其中能判定AB∥CD的条件是______。`,
    promptEn: `${parallelLineStandardContextEn}\nList the conditions proving AB parallel to CD: (1) angle AGE=60 and angle CHG=120; (2) angle BGE=70 and angle DHF=70; (3) angle AGH=50 and angle GHD=50; (4) angle BGH=110 and angle CHF=70.`,
    answer: "③④",
    acceptedAnswers: ["③④", "③,④", "3,4"],
    explanationZhHans: "③中的∠AGH与∠GHD是相等的内错角；④中∠CHF与∠GHD为对顶角，所以∠BGH+∠GHD=110°+70°=180°，是一对互补的同旁内角。故③、④都能判定AB∥CD。",
    explanationEn: "Condition 3 gives equal alternate interior angles. In condition 4, angle CHF is vertical to GHD, so the same-side interior angles BGH and GHD sum to 180 degrees. Thus conditions 3 and 4 work."
  },
  "bnu-junior-ds-v1-s2-263": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=110°，∠CHF=110°；③∠BGH=70°，∠DHF=110°；④∠AGE=50°，∠CHG=130°。哪些条件能判定AB∥CD？请写出所有序号并说明理由。`,
    promptEn: `${parallelLineStandardContextEn}\nWhich conditions prove AB parallel to CD: (1) angle EGB=60 and angle GHD=60; (2) angle AGH=110 and angle CHF=110; (3) angle BGH=70 and angle DHF=110; (4) angle AGE=50 and angle CHG=130? List all and justify.`,
    answer: "①②",
    acceptedAnswers: ["①②", "①,②", "1,2"],
    explanationZhHans: "①中的∠EGB与∠GHD、②中的∠AGH与∠CHF分别是一对相等的同位角，因此都能判定AB∥CD。③、④所给角不满足相等或同旁互补的判定条件。",
    explanationEn: "Conditions 1 and 2 each give a pair of equal corresponding angles, so both prove AB parallel to CD. Conditions 3 and 4 satisfy neither the required equality nor a same-side supplementary relation."
  },
  "bnu-junior-ds-v1-s2-264": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠AGE=65°，∠CHG=115°；②∠BGE=70°，∠DHF=70°；③∠AGH=110°，∠CHF=70°；④∠BGH=120°，∠DHG=60°。其中能判定AB∥CD的条件是______。`,
    promptEn: `${parallelLineStandardContextEn}\nList the conditions proving AB parallel to CD: (1) angle AGE=65 and angle CHG=115; (2) angle BGE=70 and angle DHF=70; (3) angle AGH=110 and angle CHF=70; (4) angle BGH=120 and angle DHG=60.`,
    answer: "④",
    acceptedAnswers: ["④", "4", "条件④"],
    explanationZhHans: "④中的∠BGH与∠DHG是同旁内角，120°+60°=180°，能判定AB∥CD。其余条件中的对应角或内错角不相等，所以只有④。",
    explanationEn: "In condition 4, the same-side interior angles BGH and DHG sum to 180 degrees, proving the lines parallel. The angle pairs in the other conditions do not satisfy a converse criterion."
  },
  "bnu-junior-ds-v1-s2-246": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=70°，∠GHD=110°；②∠AGH=60°，∠CHF=60°；③∠BGH=80°，∠DHF=100°；④∠AGE=50°，∠CHG=130°。其中能判定AB∥CD的条件序号是______。`,
    promptEn: `${parallelLineStandardContextEn}\nWhich conditions prove AB parallel to CD: (1) angle EGB=70 and angle GHD=110; (2) angle AGH=60 and angle CHF=60; (3) angle BGH=80 and angle DHF=100; (4) angle AGE=50 and angle CHG=130?`,
    answer: "②",
    acceptedAnswers: ["②", "2", "条件②"],
    explanationZhHans: "按规定点序，②中的∠AGH与∠CHF是一对同位角，且二者都是60°，所以能判定AB∥CD。①、③、④中相应的同位角或内错角均不相等，因此只有②。",
    explanationEn: "With the declared point order, condition 2 gives equal corresponding angles AGH and CHF, both 60 degrees. The required angle pairs in conditions 1, 3, and 4 are unequal, so only condition 2 proves the lines parallel."
  },
  "bnu-junior-ds-v1-s2-249": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=120°，∠GHD=60°；③∠EGB=60°，∠CHF=120°；④∠AGH=120°，∠CHF=120°。其中能够判定AB∥CD的条件序号是______。（填写所有正确条件的序号）`,
    promptEn: `${parallelLineStandardContextEn}\nList every condition proving AB parallel to CD: (1) angle EGB=60 and angle GHD=60; (2) angle AGH=120 and angle GHD=60; (3) angle EGB=60 and angle CHF=120; (4) angle AGH=120 and angle CHF=120.`,
    answer: "①④",
    acceptedAnswers: ["①④", "①,④", "①、④", "1,4"],
    explanationZhHans: "①中的∠EGB与∠GHD、④中的∠AGH与∠CHF分别是一对相等的同位角，所以①、④都能判定AB∥CD。②、③中的对应角分别为120°与60°，不相等，不能判定。",
    explanationEn: "Conditions 1 and 4 each give equal corresponding angles and therefore prove the lines parallel. In conditions 2 and 3 the corresponding angles are 120 and 60 degrees, so they do not."
  },
  "bnu-junior-ds-v1-s2-253": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=60°，∠GHD=60°；②∠AGH=120°，∠GHD=60°；③∠EGB=60°，∠CHF=120°；④∠AGH=120°，∠CHF=120°。其中能判定AB∥CD的条件有（ ）`,
    promptEn: `${parallelLineStandardContextEn}\nHow many of these conditions prove AB parallel to CD: (1) angle EGB=60 and angle GHD=60; (2) angle AGH=120 and angle GHD=60; (3) angle EGB=60 and angle CHF=120; (4) angle AGH=120 and angle CHF=120?`,
    answer: "2个",
    acceptedAnswers: ["2个", "2", "①④"],
    explanationZhHans: "①与④分别给出一对相等的同位角，能判定AB∥CD；②与③的对应角不相等，不能判定。因此共有2个条件。",
    explanationEn: "Conditions 1 and 4 give equal corresponding angles. Conditions 2 and 3 do not. Therefore exactly two conditions prove the lines parallel."
  },
  "bnu-junior-ds-v1-s2-254": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=65°，∠CHG=115°，判断直线AB与CD是否平行，并说明理由。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE=65 degrees and angle CHG=115 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "不平行。∠AGE与∠CHG是一对同位角，但65°≠115°，所以AB与CD不平行。",
    acceptedAnswers: [
      "不平行。∠AGE与∠CHG是一对同位角，但65°≠115°，所以AB与CD不平行。",
      "AB与CD不平行，因为同位角∠AGE和∠CHG不相等。"
    ],
    explanationZhHans: "按规定点序，∠AGE与∠CHG是一对同位角。若AB∥CD，这两个角应相等；但65°≠115°，所以AB与CD不平行。",
    explanationEn: "In the declared configuration, angles AGE and CHG are corresponding. Parallel lines would make them equal, but 65 is not 115, so AB and CD are not parallel."
  },
  "bnu-junior-ds-v1-s2-255": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=65°，∠CHF=115°，判断AB与CD是否平行，并说明理由。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE=65 degrees and angle CHF=115 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
    acceptedAnswers: [
      "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
      "平行，因为∠AGE与∠CHF是同旁内角且和为180°。"
    ],
    explanationZhHans: "∠AGE与∠CHF是同旁内角，且65°+115°=180°。由同旁内角互补，两直线平行，得到AB∥CD。",
    explanationEn: "Angles AGE and CHF are same-side interior angles and sum to 180 degrees. By the converse criterion, AB is parallel to CD."
  },
  "bnu-junior-ds-v1-s2-256": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=50°，∠GHD=50°；②∠AGH=120°，∠GHD=50°；③∠BGH=130°，∠CHF=130°；④∠AGH=50°，∠CHF=130°。其中能判定AB∥CD的条件是哪一个？`,
    promptEn: `${parallelLineStandardContextEn}\nWhich condition proves AB parallel to CD: (1) angle EGB=50 and angle GHD=50; (2) angle AGH=120 and angle GHD=50; (3) angle BGH=130 and angle CHF=130; (4) angle AGH=50 and angle CHF=130?`,
    answer: "①",
    acceptedAnswers: ["①", "1", "A"],
    explanationZhHans: "①中的∠EGB与∠GHD是一对相等的同位角，能判定AB∥CD。②、③、④中按规定点序得到的对应角或内错角均不相等，因此只有①。",
    explanationEn: "Condition 1 gives equal corresponding angles EGB and GHD. The required corresponding or alternate angle pairs in conditions 2, 3, and 4 are unequal, so only condition 1 works."
  },
  "bnu-junior-ds-v1-s2-257": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=70°，∠CHF=110°，求证：AB∥CD。`,
    promptEn: `${parallelLineStandardContextEn}\nGiven angle AGE=70 degrees and angle CHF=110 degrees, prove that AB is parallel to CD.`,
    answer: "AB∥CD。因为∠AGE=70°，所以∠BGH=70°；∠BGH+∠CHF=180°，同旁内角互补，所以AB∥CD。",
    acceptedAnswers: [
      "AB∥CD。因为∠AGE=70°，所以∠BGH=70°；∠BGH+∠CHF=180°，同旁内角互补，所以AB∥CD。",
      "由∠BGH=70°且∠CHF=110°，同旁内角互补，得AB∥CD。"
    ],
    explanationZhHans: "∠BGH与∠AGE是对顶角，所以∠BGH=70°。又∠BGH+∠CHF=70°+110°=180°，它们是同旁内角，故AB∥CD。",
    explanationEn: "Angle BGH is vertical to AGE, so it is 70 degrees. Angles BGH and CHF are same-side interior angles and sum to 180 degrees; therefore AB is parallel to CD."
  },
  "bnu-junior-ds-v1-s2-258": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠EGB=50°，∠GHD=50°；②∠AGH=130°，∠GHC=50°；③∠BGH=130°，∠DHF=130°；④∠AGH=50°，∠CHF=130°。其中能够判定AB∥CD的条件共有几个？`,
    promptEn: `${parallelLineStandardContextEn}\nHow many conditions prove AB parallel to CD: (1) angle EGB=50 and angle GHD=50; (2) angle AGH=130 and angle GHC=50; (3) angle BGH=130 and angle DHF=130; (4) angle AGH=50 and angle CHF=130?`,
    answer: "3",
    acceptedAnswers: ["3", "3个", "①②③"],
    explanationZhHans: "①给出相等的同位角；②给出互补的同旁内角130°与50°；③给出相等的同位角。三者都能判定AB∥CD。④中的同位角50°与130°不相等，不能判定。因此共有3个。",
    explanationEn: "Condition 1 gives equal corresponding angles, condition 2 gives supplementary same-side interior angles, and condition 3 gives equal corresponding angles. Condition 4 gives unequal corresponding angles. Thus three conditions work."
  },
  "bnu-junior-ds-v1-s2-259": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n给出四个条件：①∠AGE=65°，∠CHF=65°；②∠AGH=115°，∠GHD=65°；③∠BGH=115°，∠DHF=115°；④∠AGH=115°，∠CHF=65°。其中能够判定AB∥CD的条件共有几个？`,
    promptEn: `${parallelLineStandardContextEn}\nHow many conditions prove AB parallel to CD: (1) angle AGE=65 and angle CHF=65; (2) angle AGH=115 and angle GHD=65; (3) angle BGH=115 and angle DHF=115; (4) angle AGH=115 and angle CHF=65?`,
    answer: "1个",
    acceptedAnswers: ["1个", "1", "③"],
    explanationZhHans: "③中的∠BGH与∠DHF是一对相等的同位角，所以能判定AB∥CD。①、②、④在规定点序下给出的对应角或内错角不相等，因此只有1个条件。",
    explanationEn: "Condition 3 gives equal corresponding angles BGH and DHF. The relevant angle pairs in conditions 1, 2, and 4 are unequal, so exactly one condition works."
  },
  "bnu-junior-ds-v1-s2-260": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=65°，∠CHF=115°，判断AB与CD是否平行，并写出推理依据。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE=65 degrees and angle CHF=115 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
    acceptedAnswers: [
      "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
      "平行，因为∠AGE与∠CHF是同旁内角且和为180°。"
    ],
    explanationZhHans: "∠AGE与∠CHF是同旁内角，且65°+115°=180°。由同旁内角互补，两直线平行，得到AB∥CD。",
    explanationEn: "Angles AGE and CHF are same-side interior angles and sum to 180 degrees, so AB is parallel to CD."
  },
  "bnu-junior-ds-v1-s2-266": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=72°，∠DHF=72°，判断AB与CD是否平行，并写出推理依据。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE is 72 degrees and angle DHF is 72 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "AB∥CD。因为∠BGH与∠AGE是对顶角，所以∠BGH=72°；又∠DHF=72°，故∠BGH=∠DHF。由同位角相等，得AB∥CD。",
    acceptedAnswers: [
      "AB∥CD。因为∠BGH与∠AGE是对顶角，所以∠BGH=72°；又∠DHF=72°，故∠BGH=∠DHF。由同位角相等，得AB∥CD。",
      "平行，因为∠BGH与∠AGE是对顶角，且∠BGH=∠DHF=72°，同位角相等。"
    ],
    explanationZhHans: "∠BGH与∠AGE是对顶角，所以∠BGH=72°。已知∠DHF=72°，因此∠BGH=∠DHF。它们是一对同位角，由同位角相等可判定AB∥CD。",
    explanationEn: "Angle BGH is vertical to angle AGE, so angle BGH is 72 degrees. Since angle DHF is also 72 degrees, these corresponding angles are equal; therefore AB is parallel to CD."
  },
  "bnu-junior-ds-v1-s2-269": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=70°，∠CHG=110°，判断AB与CD是否平行，并说明理由。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE=70 degrees and angle CHG=110 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "不平行。∠AGE与∠CHG是一对同位角，但70°≠110°，所以AB与CD不平行。",
    acceptedAnswers: [
      "不平行。∠AGE与∠CHG是一对同位角，但70°≠110°，所以AB与CD不平行。",
      "AB与CD不平行，因为同位角∠AGE和∠CHG不相等。"
    ],
    explanationZhHans: "按规定点序，∠AGE与∠CHG是一对同位角。若AB∥CD，它们应相等；但70°≠110°，所以AB与CD不平行。",
    explanationEn: "Angles AGE and CHG are corresponding in the declared configuration. They are unequal, 70 and 110 degrees, so AB and CD are not parallel."
  },
  "bnu-junior-ds-v1-s2-272": {
    promptZhHans: `${parallelLineStandardContextZhHans}\n若∠AGE=110°，∠CHG=70°，判断AB与CD是否平行，并说明理由。`,
    promptEn: `${parallelLineStandardContextEn}\nIf angle AGE=110 degrees and angle CHG=70 degrees, decide whether AB and CD are parallel and justify your answer.`,
    answer: "不平行。∠AGE与∠CHG是一对同位角，但110°≠70°，所以AB与CD不平行。",
    acceptedAnswers: [
      "不平行。∠AGE与∠CHG是一对同位角，但110°≠70°，所以AB与CD不平行。",
      "AB与CD不平行，因为同位角∠AGE和∠CHG不相等。"
    ],
    explanationZhHans: "按规定点序，∠AGE与∠CHG是一对同位角。若AB∥CD，它们应相等；但110°≠70°，所以AB与CD不平行。",
    explanationEn: "Angles AGE and CHG are corresponding in the declared configuration. They are unequal, 110 and 70 degrees, so AB and CD are not parallel."
  },
  "bnu-junior-ds-v1-s2-273": {
    answer: "90°",
    acceptedAnswers: ["90°", "90度"],
    explanationZhHans: "AB=AC，所以△ABC是等腰三角形。顶角的角平分线AD同时也是底边BC上的高，因此AD⊥BC，∠ADC=90°。",
    explanationEn: "Because AB=AC, triangle ABC is isosceles. The bisector from the vertex A is also perpendicular to the base BC, so angle ADC=90 degrees."
  },
  "bnu-junior-ds-v1-s2-285": {
    promptZhHans: "在△ABC中，AB=AC，∠A=40°，点D在边BC上，且BD=CD。求∠ADC的度数。",
    promptEn: "In triangle ABC, AB=AC and angle A=40 degrees. Point D lies on BC with BD=CD. Find angle ADC.",
    answer: "90°",
    acceptedAnswers: ["90°", "90度"],
    explanationZhHans: "D是底边BC的中点。在等腰三角形中，顶点A与底边中点D的连线也是底边上的高，所以AD⊥BC，∠ADC=90°。",
    explanationEn: "D is the midpoint of the base BC. In an isosceles triangle, the segment from the vertex to the midpoint of the base is an altitude, so AD is perpendicular to BC and angle ADC=90 degrees."
  },
  "bnu-junior-ds-v1-s2-287": {
    explanationZhHans: "AB=AC且AD平分顶角，所以AD也是底边BC上的高。因此AD⊥BC，∠ADC=90°。",
    explanationEn: "In the isosceles triangle, the vertex-angle bisector AD is also an altitude to BC. Therefore angle ADC is 90 degrees."
  },
  "bnu-junior-ds-v1-s2-291": {
    promptZhHans: "在△ABC中，AB=AC，∠A=40°，点D在边BC上，且BD=CD。求∠DAC的度数。",
    promptEn: "In triangle ABC, AB=AC and angle A=40 degrees. Point D lies on BC with BD=CD. Find angle DAC.",
    answer: "20°",
    acceptedAnswers: ["20°", "20度"],
    explanationZhHans: "D是等腰三角形底边BC的中点，所以AD也平分顶角∠A。于是∠DAC=40°÷2=20°。",
    explanationEn: "Since D is the midpoint of the base of the isosceles triangle, AD also bisects angle A. Thus angle DAC=40/2=20 degrees."
  },
  "bnu-junior-ds-v1-s2-294": {
    explanationZhHans: "AD平分∠A，所以∠BAD=∠CAD=20°。在四边形AEDF中，∠AED=∠AFD=90°，故∠EDF=360°-40°-90°-90°=140°。",
    explanationEn: "AD bisects angle A, so each half is 20 degrees. In quadrilateral AEDF, angles AED and AFD are right angles, giving angle EDF=360-40-90-90=140 degrees."
  },
  "bnu-junior-ds-v1-s2-296": {
    explanationZhHans: "等腰三角形中，顶角平分线AD也是底边BC上的高，因此∠ADC=90°。也可由∠C=70°、∠CAD=20°计算得180°-70°-20°=90°。",
    explanationEn: "The vertex-angle bisector of an isosceles triangle is also perpendicular to the base, so angle ADC=90 degrees. Equivalently, 180-70-20=90."
  },
  "bnu-junior-ds-v1-s2-297": {
    explanationZhHans: "AB=AC，所以∠C=∠B=40°，从而∠A=100°。AD平分∠A，得∠CAD=50°，故∠ADC=180°-40°-50°=90°。",
    explanationEn: "The base angles are both 40 degrees, so angle A=100 degrees. Its bisector gives angle CAD=50 degrees, and angle ADC=180-40-50=90 degrees."
  },
  "bnu-junior-ds-v1-s2-299": {
    promptZhHans: "在△ABC中，AB=AC，∠A=40°，点D在边BC上，且AD平分∠BAC。点E在边AC上，且DE⊥AC。求∠BDE的度数。",
    promptEn: "In triangle ABC, AB=AC and angle A=40 degrees. Point D lies on BC and AD bisects angle BAC. Point E lies on AC with DE perpendicular to AC. Find angle BDE.",
    answer: "160°",
    acceptedAnswers: ["160°", "160度", "∠BDE=160°"],
    explanationZhHans: "等腰三角形的顶角平分线AD也是底边上的高，所以∠BDA=90°。又∠DAC=20°且DE⊥AC，故∠ADE=70°。射线DA位于∠BDE内部，因此∠BDE=90°+70°=160°。",
    explanationEn: "The vertex-angle bisector AD is also perpendicular to BC, so angle BDA=90 degrees. Since angle DAC=20 degrees and DE is perpendicular to AC, angle ADE=70 degrees. Hence angle BDE=90+70=160 degrees."
  },
  "bnu-junior-ds-v1-s2-300": {
    explanationZhHans: "AD是等腰三角形顶角的平分线，因此也是BC上的高，直接得到∠ADC=90°。",
    explanationEn: "In an isosceles triangle, the vertex-angle bisector is also an altitude to the base, so angle ADC=90 degrees."
  },
  "bnu-junior-ds-v1-s2-303": {
    explanationZhHans: "AB=AC，所以∠C=∠B=50°，∠A=80°。AD平分∠A，得∠CAD=40°，于是∠ADC=180°-50°-40°=90°。",
    explanationEn: "The base angles are each 50 degrees, so angle A=80 degrees. Its bisector gives angle CAD=40 degrees, hence angle ADC=180-50-40=90 degrees."
  },
  "bnu-junior-ds-v1-s2-335": {
    explanationZhHans: "设售价为x元，则月销量为400-20(x-30)=1000-20x。利润条件为(x-20)(1000-20x)≥4500，化简得(x-35)²≤0，所以只能取x=35，且满足售价不超过40元。",
    explanationEn: "At price x, monthly sales are 400-20(x-30)=1000-20x. The profit condition (x-20)(1000-20x)>=4500 simplifies to (x-35)^2<=0, so the only possible price is 35 yuan."
  },
  "bnu-junior-ds-v1-s2-362": {
    answer: "(-2, -2)",
    acceptedAnswers: ["(-2, -2)", "(-2,-2)"],
    explanationZhHans: "A(2,3)向左4、向下1得到A'(-2,2)。逆时针旋转90°的坐标变换是(x,y)→(-y,x)，所以A''=(-2,-2)。",
    explanationEn: "Translating A gives A'=(-2,2). A 90-degree counterclockwise rotation maps (x,y) to (-y,x), so A''=(-2,-2)."
  },
  "bnu-junior-ds-v1-s2-366": {
    explanationZhHans: "A(2,3)向右4、向下1得到A'(6,2)。逆时针旋转90°时(x,y)变为(-y,x)，所以A''=(-2,6)。",
    explanationEn: "The translation gives A'=(6,2). Under a 90-degree counterclockwise rotation, (x,y) becomes (-y,x), so A''=(-2,6)."
  },
  "bnu-junior-ds-v1-s2-381": {
    answer: "√73",
    acceptedAnswers: ["√73", "sqrt(73)"],
    explanationZhHans: "A平移后为A'(6,2)。B(-1,2)逆时针旋转90°后为B'(-2,-1)。因此A'B'=√[(6+2)²+(2+1)²]=√(64+9)=√73。",
    explanationEn: "The transformed points are A'=(6,2) and B'=(-2,-1). Their distance is sqrt((6+2)^2+(2+1)^2)=sqrt(73)."
  },
  "bnu-junior-ds-v1-s2-382": {
    optionsZhHans: ["点P'的横坐标比点P的横坐标大3", "线段A'B'的长度大于线段AB的长度", "三角形A'B'C'的面积是三角形ABC面积的2倍", "平移后点C'的坐标为(7,1)"],
    optionsEn: ["The x-coordinate of P' is 3 greater than that of P.", "Segment A'B' is longer than segment AB.", "The area of triangle A'B'C' is twice that of triangle ABC.", "After the translation, C'=(7,1)."],
    answer: "点P'的横坐标比点P的横坐标大3",
    acceptedAnswers: ["点P'的横坐标比点P的横坐标大3"],
    explanationZhHans: "平移向量为(3,-2)，所以任意对应点的横坐标都增加3，第1项正确。平移保持长度和面积不变；C(4,1)平移后是(7,-1)，因此其余三项均错误。",
    explanationEn: "The translation vector is (3,-2), so every corresponding point has an x-coordinate 3 greater, making option 1 true. Translation preserves lengths and areas, and C moves to (7,-1), so the other options are false."
  },
  "bnu-junior-ds-v1-s2-446": {
    explanationZhHans: "1-1/(x+1)=x/(x+1)。再除以x/(x²-1)，得到[x/(x+1)]·[(x²-1)/x]=x-1。代入x=2，结果为1。",
    explanationEn: "First, 1-1/(x+1)=x/(x+1). Dividing by x/(x^2-1) gives [x/(x+1)][(x^2-1)/x]=x-1, which equals 1 at x=2."
  },
  "bnu-junior-ds-v1-s2-454": {
    explanationZhHans: "定义域要求x≠1且x≠-1。方程两边同乘(x-1)(x+1)，得2(x+1)=4，所以x=1；但x=1使原分母为0，是增根，故原方程无解。",
    explanationEn: "The domain excludes x=1 and x=-1. Multiplying through gives 2(x+1)=4, whose only solution is x=1. Since that value is excluded, the original equation has no solution."
  },
  "bnu-junior-ds-v1-s2-481": {
    optionsZhHans: ["70°", "110°", "140°", "180°"],
    optionsEn: ["70 degrees", "110 degrees", "140 degrees", "180 degrees"],
    answer: "180°",
    acceptedAnswers: ["180°", "180度"],
    explanationZhHans: "ABCD是平行四边形。设A为原点，向量AB=u、AD=v，则E=u/2，O=(u+v)/2，F=u/2+v。因此E、O、F共线且O在线段EF上，射线OE与OF反向，∠EOF=180°。",
    explanationEn: "ABCD is a parallelogram. With A as the origin, let AB=u and AD=v. Then E=u/2, O=(u+v)/2, and F=u/2+v, so E, O, and F are collinear with O between E and F. Thus angle EOF=180 degrees."
  },
  "bnu-junior-ds-v1-s2-487": {
    optionsZhHans: ["2组", "3组", "4组", "5组"],
    optionsEn: ["2 pairs", "3 pairs", "4 pairs", "5 pairs"],
    answer: "4组",
    acceptedAnswers: ["4组", "4", "①②、①③、①④、③④"],
    explanationZhHans: "①②给出一组对边平行且相等，③④给出两条对角线互相平分，都能判定平行四边形。若①与③或④组合，由AB∥CD可得△AOB∽△COD；OA=OC或OB=OD都会使相似比为1，从而另一组对应线段也相等，两条对角线互相平分。因此充分组合为①②、①③、①④、③④，共4组，选第3项。",
    explanationEn: "Conditions 1+2 give one pair of opposite sides parallel and equal, while 3+4 make the diagonals bisect each other. For 1+3 or 1+4, AB parallel to CD makes triangles AOB and COD similar. Either OA=OC or OB=OD forces scale factor 1, so the other diagonal is also bisected. Thus the four sufficient pairs are 1+2, 1+3, 1+4, and 3+4, so option 3 is correct."
  },
  "bnu-junior-ds-v1-s2-489": {
    optionsZhHans: ["2组", "3组", "4组", "5组"],
    optionsEn: ["2 pairs", "3 pairs", "4 pairs", "5 pairs"],
    answer: "4组",
    acceptedAnswers: ["4组", "4", "①②、①③、①④、③④"],
    explanationZhHans: "①②可用“一组对边平行且相等”判定平行四边形，③④可用“对角线互相平分”判定。另由AB∥CD可得△AOB∽△COD；配合OA=OC或OB=OD时相似比为1，便可推出另一条对角线也被O平分。因此①③和①④也成立，共有①②、①③、①④、③④四组，选第3项。",
    explanationEn: "Pair 1+2 proves a parallelogram using one opposite side pair parallel and equal, and 3+4 uses bisecting diagonals. Also, AB parallel to CD makes triangles AOB and COD similar. Combining this with either OA=OC or OB=OD forces scale factor 1 and makes the other diagonal bisected as well. Hence 1+3 and 1+4 also work, for four pairs in total, option 3."
  },
  "bnu-junior-ds-v1-s2-490": {
    explanationZhHans: "由AB∥CD且AB=CD，ABCD是平行四边形。余弦定理得BD²=6²+8²-2·6·8·cos60°=52，AC²=6²+8²-2·6·8·cos120°=148。中点四边形的周长等于AC+BD，所以为2√37+2√13。",
    explanationEn: "ABCD is a parallelogram. The cosine rule gives BD^2=52 and AC^2=148. The midpoint quadrilateral has perimeter AC+BD, so its perimeter is 2sqrt(37)+2sqrt(13)."
  },
  "bnu-junior-ds-v1-s2-493": {
    explanationZhHans: "已有AB∥CD。若再有AD∥BC，或AB=CD，都可判定平行四边形；若∠A=∠C，也可结合平行线角关系推出AD∥BC。只有AD=BC不能排除等腰梯形，所以选第4项。",
    explanationEn: "Given AB parallel to CD, either AD parallel to BC or AB=CD proves a parallelogram. The condition angle A=angle C also forces the other side pair parallel. AD=BC alone allows an isosceles trapezoid, so option 4 is insufficient."
  },
  "bnu-junior-ds-v1-s3-009": {
    answer: "√17/17",
    acceptedAnswers: ["√17/17", "1/√17", "sqrt(17)/17", "1/sqrt(17)"],
    explanationZhHans: "建立直角坐标系，取A(0,0)、B(4,0)、D(0,4)，则E(1,4)，直线AE为y=4x。过B且垂直于AE的直线为y=1-x/4，它与AD交于G(0,1)，与AE交于F(4/17,16/17)。因此FG=√[(4/17)²+(1/17)²]=√17/17。",
    explanationEn: "Use coordinates A(0,0), B(4,0), D(0,4), and E(1,4). Line AE is y=4x, while the line through B perpendicular to AE is y=1-x/4. Their intersection is F(4/17,16/17), and the latter line meets AD at G(0,1). Thus FG=sqrt((4/17)^2+(1/17)^2)=sqrt(17)/17."
  },
  "bnu-junior-ds-v1-s3-018": {
    promptZhHans: "已知四边形ABCD中，对角线AC与BD相交于点O。给出条件：①AB=CD，AD=BC；②∠ABC=90°，且AC=BD；③AB=BC=CD=DA；④AC⊥BD，且OA=OC，OB=OD。在条件③成立的前提下，再满足哪一个条件一定能判定四边形ABCD为正方形？（填序号）",
    promptEn: "In quadrilateral ABCD, diagonals AC and BD meet at O. Consider: (1) AB=CD and AD=BC; (2) angle ABC=90 degrees and AC=BD; (3) AB=BC=CD=DA; (4) AC is perpendicular to BD, OA=OC, and OB=OD. Given that condition (3) holds, which one additional condition guarantees that ABCD is a square?",
    answer: "②",
    acceptedAnswers: ["②", "2", "条件②"],
    explanationZhHans: "条件③说明四边形四边相等，因此它是菱形。再满足条件②中的∠ABC=90°时，菱形有一个直角，故它是正方形。条件①和条件④都是菱形已经具有的性质，不能进一步保证有直角。",
    explanationEn: "Condition 3 makes the quadrilateral a rhombus. Condition 2 adds a right angle, so the rhombus is a square. Conditions 1 and 4 are properties a rhombus already has and do not force a right angle."
  },
  "bnu-junior-ds-v1-s3-023": {
    answer: "(1) 能。理由：两组对边分别相等的四边形是平行四边形。\n(2) 不能。补充条件：AB∥CD且AD∥BC。\n(3) 能。理由：对角线互相垂直且平分的四边形是菱形。\n(4) 能。理由：两组对边分别平行的四边形是平行四边形，又对角线相等，所以是矩形。",
    acceptedAnswers: ["(1) 能。理由：两组对边分别相等的四边形是平行四边形。\n(2) 不能。补充条件：AB∥CD且AD∥BC。\n(3) 能。理由：对角线互相垂直且平分的四边形是菱形。\n(4) 能。理由：两组对边分别平行的四边形是平行四边形，又对角线相等，所以是矩形。"],
    explanationZhHans: "（1）能。两组对边分别相等的四边形是平行四边形。（2）不能。仅有一个直角和一组邻边相等仍不足；可补充AB∥CD且AD∥BC，使其先成为平行四边形，再由直角和邻边相等判定为正方形。（3）能。对角线互相垂直且互相平分的四边形是菱形。（4）能。两组对边分别平行先判定为平行四边形，再由对角线相等判定为矩形。",
    explanationEn: "(1) Yes. A quadrilateral with both pairs of opposite sides equal is a parallelogram. (2) No. One right angle and equal adjacent sides are not enough; adding both pairs of opposite sides parallel first gives a parallelogram, which is then a square. (3) Yes. Diagonals that are perpendicular and bisect each other characterize a rhombus. (4) Yes. The parallel opposite sides give a parallelogram, and equal diagonals then make it a rectangle."
  },
  "bnu-junior-ds-v1-s3-027": {
    explanationZhHans: "由AB=CD、AD=BC可判定ABCD为平行四边形，所以两条对角线互相平分。设AO=CO=x，则在直角三角形AOB中，x²+4²=5²，得x=3，因此AC=6。四边形面积为AC·BD/2=6×8/2=24。",
    explanationEn: "The two pairs of equal opposite sides make ABCD a parallelogram, so its diagonals bisect each other. Let AO=CO=x. In right triangle AOB, x^2+4^2=5^2, so x=3 and AC=6. The area is AC times BD divided by 2, namely 6*8/2=24."
  },
  "bnu-junior-ds-v1-s3-031": {
    promptZhHans: "已知四边形ABCD中，对角线AC与BD相交于点O。给出以下四个条件：①AB=CD，AD=BC；②∠ABC=90°，AB=BC；③AC⊥BD，OA=OC，OB=OD；④AB∥CD，AD∥BC，AC=BD。下列哪组条件一定能判定四边形ABCD为正方形？（ ）",
    promptEn: "In quadrilateral ABCD, diagonals AC and BD meet at O. Consider: (1) AB=CD and AD=BC; (2) angle ABC=90 degrees and AB=BC; (3) AC is perpendicular to BD and the diagonals bisect each other; (4) both pairs of opposite sides are parallel and AC=BD. Which option guarantees that ABCD is a square?",
    optionsZhHans: ["①和④", "①和③", "③和④", "仅②"],
    optionsEn: ["Conditions 1 and 4", "Conditions 1 and 3", "Conditions 3 and 4", "Condition 2 alone"],
    answer: "③和④",
    acceptedAnswers: ["③和④", "③④", "3和4", "conditions 3 and 4"],
    explanationZhHans: "条件③说明对角线互相垂直且互相平分，可判定四边形为菱形；条件④又说明它是对角线相等的平行四边形，即矩形。同时是菱形和矩形的四边形是正方形，所以选第3项。其余各组只能保证矩形或菱形，不能同时保证两者。",
    explanationEn: "Condition 3 makes the quadrilateral a rhombus because the diagonals are perpendicular and bisect each other. Condition 4 makes it a rectangle because it is a parallelogram with equal diagonals. A quadrilateral that is both a rhombus and a rectangle is a square, so option 3 is the unique sufficient set."
  },
  "bnu-junior-ds-v1-s3-033": {
    promptZhHans: "在四边形ABCD中，已知条件①成立，即AB∥CD，AD∥BC。另有条件：②AB=CD，AD=BC；③OA=OC，OB=OD；④∠ABC=90°。再满足哪一个条件一定能判定四边形ABCD为矩形？（填序号）",
    promptEn: "In quadrilateral ABCD, condition (1), AB parallel to CD and AD parallel to BC, is already known. Other conditions are: (2) AB=CD and AD=BC; (3) OA=OC and OB=OD; (4) angle ABC=90 degrees. Which one additional condition guarantees that ABCD is a rectangle?",
    answer: "④",
    acceptedAnswers: ["④", "4", "条件④"],
    explanationZhHans: "条件①已经说明ABCD是平行四边形。条件②和③都是平行四边形本身已有的性质，不能保证出现直角；再满足条件④时，平行四边形有一个直角，故它是矩形。",
    explanationEn: "Condition 1 already makes ABCD a parallelogram. Conditions 2 and 3 are properties it already has and do not force a right angle. Adding condition 4 gives a parallelogram with one right angle, hence a rectangle."
  },
  "bnu-junior-ds-v1-s3-035": {
    answer: "无",
    acceptedAnswers: ["无", "没有", "无单个条件", "none"],
    explanationZhHans: "没有一个单独条件足以判定正方形。①只能判定平行四边形；②未约束另外两边；③只能判定菱形；④至多可判定矩形，仍不能保证四边相等。因此应填“无”。",
    explanationEn: "No single listed condition guarantees a square. Condition 1 gives only a parallelogram; condition 2 does not constrain the other two sides; condition 3 gives a rhombus; and condition 4 can give a rectangle without equal sides. Therefore the answer is none."
  },
  "bnu-junior-ds-v1-s3-036": {
    explanationZhHans: "对角线互相平分说明ABCD是平行四边形；对角线互相垂直又说明它是菱形。平行四边形中∠ABC=90°，所以它也是矩形。既是菱形又是矩形的四边形是正方形。",
    explanationEn: "Diagonals that bisect each other make ABCD a parallelogram, and their perpendicularity makes it a rhombus. Since angle ABC is 90 degrees, it is also a rectangle. A quadrilateral that is both a rhombus and a rectangle is a square."
  },
  "bnu-junior-ds-v1-s3-037": {
    optionsZhHans: ["①②③", "①③④", "②③④", "①④"],
    optionsEn: ["Conditions 1, 2, and 3", "Conditions 1, 3, and 4", "Conditions 2, 3, and 4", "Conditions 1 and 4"],
    answer: "②③④",
    acceptedAnswers: ["②③④", "②、③、④", "2,3,4", "conditions 2, 3, and 4"],
    explanationZhHans: "条件③说明对角线互相平分，先判定ABCD为平行四边形；再由条件②判定它为菱形，由条件④判定它为矩形。因此②③④同时成立时，ABCD一定是正方形。其他选项分别缺少保证直角或保证四边相等的条件。",
    explanationEn: "Condition 3 makes ABCD a parallelogram. Condition 2 then makes it a rhombus, while condition 4 makes it a rectangle. Thus conditions 2, 3, and 4 together guarantee a square. Each other option lacks either a right-angle guarantee or an equal-side guarantee."
  },
  "bnu-junior-ds-v1-s3-039": {
    promptZhHans: "在四边形ABCD中，已知条件①成立，即AB=CD，AD=BC。另有条件：②∠ABC=90°，AB=BC；③AC⊥BD，OA=OC；④AC=BD，∠BAD=90°。再满足哪一个条件一定能判定四边形ABCD为正方形？（填序号）",
    promptEn: "In quadrilateral ABCD, condition (1), AB=CD and AD=BC, is already known. Other conditions are: (2) angle ABC=90 degrees and AB=BC; (3) AC is perpendicular to BD and OA=OC; (4) AC=BD and angle BAD=90 degrees. Which one additional condition guarantees that ABCD is a square?",
    answer: "②",
    acceptedAnswers: ["②", "2", "条件②"],
    explanationZhHans: "条件①先判定ABCD为平行四边形。再满足条件②时，一个角是直角且一组邻边相等，因此这个平行四边形同时是矩形和菱形，故为正方形。条件③只能进一步保证菱形，条件④只能进一步保证矩形。",
    explanationEn: "Condition 1 first makes ABCD a parallelogram. Adding condition 2 gives both a right angle and equal adjacent sides, so it is simultaneously a rectangle and a rhombus, hence a square. Condition 3 gives only a rhombus, while condition 4 gives only a rectangle."
  },
  "bnu-junior-ds-v1-s3-049": {
    explanationZhHans: "正方形边长BC=BE+EC=3。取AB=3，则直角三角形ABE中tan∠BAE=BE/AB=1/3，所以∠BAE≈18.4°，∠AEB≈71.6°。四个选项中75°最接近。",
    explanationEn: "The square has side BC=BE+EC=3. In right triangle ABE, tan(angle BAE)=BE/AB=1/3, so angle BAE is about 18.4 degrees and angle AEB is about 71.6 degrees. Of the choices, 75 degrees is closest."
  },
  "bnu-junior-ds-v1-s3-065": {
    answer: "k=(-1+√19)/2",
    acceptedAnswers: ["k=(-1+√19)/2", "(-1+√19)/2", "k=(√19-1)/2", "(√19-1)/2"],
    explanationZhHans: "（1）判别式Δ=(2k+1)²-4(k²+k)=1>0，所以方程对任意实数k都有两个不相等的实根。（2）原方程可分解为(x-k)(x-k-1)=0，两根为k和k+1。由勾股定理，k²+(k+1)²=10，解得k=(-1±√19)/2。直角边长必须为正，负号所得的两根均为负，舍去，故k=(-1+√19)/2。",
    explanationEn: "(1) The discriminant is (2k+1)^2-4(k^2+k)=1>0, so the equation always has two distinct real roots. (2) It factors as (x-k)(x-k-1)=0, giving roots k and k+1. The Pythagorean theorem gives k^2+(k+1)^2=10, so k=(-1 plus or minus sqrt(19))/2. Both leg lengths must be positive, which rejects the negative branch. Hence k=(-1+sqrt(19))/2."
  },
  "bnu-junior-ds-v1-s3-068": {
    explanationZhHans: "要保持为一元二次方程，先有k≠1。判别式Δ=[-2(k-1)]²-4(k-1)(k+2)=12(1-k)。方程有两个实数根需Δ≥0，结合k≠1，得到k<1。",
    explanationEn: "For the equation to remain quadratic, k cannot equal 1. Its discriminant is [-2(k-1)]^2-4(k-1)(k+2)=12(1-k). Requiring real roots gives k at most 1; together with k not equal to 1, this yields k<1."
  },
  "bnu-junior-ds-v1-s3-122": {
    explanationZhHans: "两枚硬币同为正面的概率是1/4，所以小明每局期望得分为2×1/4=1/2。一正一反的概率是2/4=1/2，所以小亮每局期望得分为1×1/2=1/2。两人的期望得分相同，因此游戏公平。",
    explanationEn: "Two heads occurs with probability 1/4, so Xiaoming's expected score is 2*(1/4)=1/2. One head and one tail occurs with probability 1/2, so Xiaoliang's expected score is 1*(1/2)=1/2. Their expected scores are equal, so the game is fair."
  },
  "bnu-junior-ds-v1-s3-131": {
    explanationZhHans: "两次颜色相同的概率为(3/6)²+(2/6)²+(1/6)²=14/36=7/18。因此两次颜色不同的概率为1-7/18=11/18。",
    explanationEn: "The probability of drawing the same color twice is (3/6)^2+(2/6)^2+(1/6)^2=7/18. Therefore the probability of different colors is 1-7/18=11/18."
  },
  "bnu-junior-ds-v1-s3-134": {
    explanationZhHans: "同色只可能是两红或两白。其概率为(2/5)(1/4)+(2/5)(1/4)=1/5，所以两次摸到同色球的概率是1/5。",
    explanationEn: "Matching colors can occur only as two red balls or two white balls. The probability is (2/5)(1/4)+(2/5)(1/4)=1/5."
  },
  "bnu-junior-ds-v1-s3-177": {
    explanationZhHans: "因为∠DAE=∠CAB且∠ADE=∠C，所以△ADE∽△ACB。对应边满足AD/AC=AE/AB，即5/AC=4/15，解得AC=75/4=18.75 cm。",
    explanationEn: "Angles DAE and CAB are equal, and angle ADE equals angle C, so triangles ADE and ACB are similar. Thus AD/AC=AE/AB, giving 5/AC=4/15 and AC=75/4=18.75 cm."
  },
  "bnu-junior-ds-v1-s3-178": {
    optionsZhHans: ["AE:EC=2:5", "DE:BC=2:3", "△ADE与△ABC的周长比为4:25", "△ADE与△ABC的面积比为4:25"],
    optionsEn: ["AE:EC=2:5", "DE:BC=2:3", "The perimeter ratio of triangles ADE and ABC is 4:25", "The area ratio of triangles ADE and ABC is 4:25"],
    answer: "△ADE与△ABC的面积比为4:25",
    acceptedAnswers: ["△ADE与△ABC的面积比为4:25", "三角形ADE与三角形ABC的面积比为4:25", "The area ratio of triangles ADE and ABC is 4:25"],
    explanationZhHans: "由DE∥BC，△ADE∽△ABC。因为AD:DB=2:3，所以AD:AB=2:5，相似比为2:5，周长比也是2:5，面积比为(2/5)²=4:25。因此只有第4项正确。",
    explanationEn: "Since DE is parallel to BC, triangles ADE and ABC are similar. From AD:DB=2:3, the scale factor AD:AB is 2:5. The perimeter ratio is 2:5 and the area ratio is (2/5)^2=4:25, so only option 4 is correct."
  },
  "bnu-junior-ds-v1-s3-231": {
    promptZhHans: "一个几何体由若干相同小立方块搭成。从正面看和从左面看，三个位置的列高都分别为3、3、3；从上面看，3×3方格中只有四个角和中心位置被占据。求这个几何体中小立方块总数的最小值。",
    promptEn: "A solid is built from identical unit cubes. In both the front view and the left view, the three column heights are 3, 3, and 3. In the 3-by-3 top-view grid, only the four corners and the center are occupied. Find the minimum possible number of cubes.",
    answer: "11",
    acceptedAnswers: ["11", "11个", "11个小立方块"],
    explanationZhHans: "俯视图的五个占据位置各至少有1个小立方块。中心位置堆到3层，可满足正面和左面中间列高为3；再把一对对角上的两个位置各堆到3层，可同时满足其余横、纵列的最大高度都是3。总数最少为5+2+2+2=11，并且该搭法确实可实现。",
    explanationEn: "Each of the five occupied top-view cells needs at least one cube. Raise the center stack to height 3, then raise two diagonally opposite corner stacks to height 3. This makes every front-view and left-view column reach height 3. The minimum is therefore 5+2+2+2=11, and the construction attains it."
  },
  "bnu-junior-ds-v1-s3-237": {
    answer: "22 cm²",
    acceptedAnswers: ["22 cm²", "22cm²", "22平方厘米", "22"],
    explanationZhHans: "俯视图有4个底层位置，正视图中间列还需在其中一个中间小立方块上方再放1个，所以共有5个小立方块。底层相邻面有3对，上下相邻面有1对，共4对接触面。表面积为5×6-4×2=22 cm²。",
    explanationEn: "The top view has four occupied base cells, and the front view requires one more cube above a middle base cube, so there are five cubes. There are three face contacts within the base and one vertical contact, four contacts in total. The surface area is 5*6-4*2=22 square centimetres."
  },
  "bnu-junior-ds-v1-s3-244": {
    explanationZhHans: "光线与桌面成45°，所以高3 cm在长边方向产生的水平投影长度为3/tan45°=3 cm。影子等于宽4 cm、总长6+3=9 cm的区域，面积为9×4=36 cm²，选第3项。",
    explanationEn: "At a 45-degree angle, the 3 cm height adds a horizontal projection of 3/tan(45 degrees)=3 cm along the long side. The shadow is 4 cm wide and 6+3=9 cm long, so its area is 36 square centimetres, option 3."
  },
  "bnu-junior-ds-v1-s3-267": {
    promptZhHans: "某工厂生产一批零件，原计划每天生产60个，需要20天完成。实际每天生产x个（x为正整数），实际生产天数为y天。生产总量不变，且x与y成反比例。若实际生产天数不超过25天，且每天生产量至少为40个，求x的取值范围。",
    promptEn: "A factory planned to produce 60 parts per day for 20 days. It actually produces x parts per day, where x is a positive integer, and takes y days. The total output is unchanged and x and y are inversely proportional. If production takes no more than 25 days and at least 40 parts are made per day, find the range of x.",
    answer: "x≥48",
    acceptedAnswers: ["x≥48", "x >= 48", "x为不小于48的正整数", "x is an integer at least 48"],
    explanationZhHans: "总量为60×20=1200，因此y=1200/x。由y≤25得1200/x≤25，即x≥48；这也自动满足x≥40。故x为不小于48的正整数。",
    explanationEn: "The total output is 60*20=1200, so y=1200/x. From y at most 25, 1200/x is at most 25, which gives x at least 48 and automatically meets x at least 40. Thus x is any positive integer at least 48."
  },
  "bnu-junior-ds-v1-s3-346": {
    explanationZhHans: "设点C到塔底的距离为x米，塔高为h米。由tan30°=h/x得x=√3h；点D离塔底x+20米，又有tan15°=h/(x+20)。代入tan15°=2-√3可解得h=10米，所以选第1项。",
    explanationEn: "Let the distance from C to the building be x metres and the height be h metres. From tan(30 degrees)=h/x, x=sqrt(3)h. Point D is x+20 metres away, and tan(15 degrees)=h/(x+20). Using tan(15 degrees)=2-sqrt(3) gives h=10 metres, so option 1 is correct."
  },
  "bnu-junior-ds-v1-s3-349": {
    answer: "15(3-√3)米",
    acceptedAnswers: ["15(3-√3)米", "15(3−√3)米", "15(3-√3)", "45-15√3米"],
    explanationZhHans: "设塔高为h米。点A在塔东侧且仰角为60°，所以AC=h/√3。向西走30米后仰角降为45°，点B必已越过塔底到西侧，故BC=30-AC。由tan45°=h/BC得BC=h，于是30-h/√3=h，解得h=15(3-√3)米，选第4项。",
    explanationEn: "Let the tower height be h metres. Since A is east of the tower and its elevation angle is 60 degrees, AC=h/sqrt(3). Moving 30 metres west lowers the angle to 45 degrees only after B has passed the tower, so BC=30-AC. Since tan(45 degrees)=h/BC, BC=h. Thus 30-h/sqrt(3)=h, giving h=15(3-sqrt(3)) metres, option 4."
  },
  "bnu-junior-ds-v1-s3-419": {
    explanationZhHans: "AB是直径，所以∠ACB=90°。又∠CAB=30°，而AB=2×4=8。在直角三角形ABC中，BC=AB·sin30°=8×1/2=4。",
    explanationEn: "Because AB is a diameter, angle ACB is 90 degrees. Also angle CAB is 30 degrees and AB=2*4=8. In right triangle ABC, BC=AB*sin(30 degrees)=8*(1/2)=4."
  },
  "bnu-junior-ds-v1-s3-421": {
    promptZhHans: "圆O的半径为5，点D在圆O外，且OD=13。由点D引圆O的切线DC，切点为C，则线段CD的长为（ ）。",
    promptEn: "Circle O has radius 5. Point D lies outside the circle and OD=13. Segment DC is tangent to the circle at C. What is the length of CD?",
    optionsZhHans: ["5", "8", "12", "13"],
    optionsEn: ["5", "8", "12", "13"],
    answer: "12",
    acceptedAnswers: ["12", "12个单位"],
    explanationZhHans: "半径OC垂直于切线DC，所以△OCD是直角三角形。由勾股定理，CD=√(OD²-OC²)=√(13²-5²)=√144=12，选第3项。",
    explanationEn: "A radius to a point of tangency is perpendicular to the tangent, so triangle OCD is right-angled at C. By the Pythagorean theorem, CD=sqrt(13^2-5^2)=sqrt(144)=12, option 3."
  },
  "bnu-junior-ds-v1-s3-437": {
    answer: "120°",
    acceptedAnswers: ["120°", "120度", "120"],
    explanationZhHans: "连接OC。因为CD是切线，所以OC⊥CD，△OCD中∠COD=60°。又OA与OD方向相反，故∠AOC=120°；在等腰三角形AOC中，∠CAO=30°。由于A、O、D共线，∠CAD=30°，所以△ACD中∠ACD=180°-30°-30°=120°。",
    explanationEn: "Join O to C. Since CD is tangent, OC is perpendicular to CD, so angle COD=60 degrees in triangle OCD. Rays OA and OD are opposite, hence angle AOC=120 degrees. Isosceles triangle AOC then has angle CAO=30 degrees. Because A, O, and D are collinear, angle CAD=30 degrees, and triangle ACD gives angle ACD=180-30-30=120 degrees."
  },
};

const remainingA18S1ReviewedCorrections: Record<string, ReviewedBnuJuniorCorrection> = {
  "bnu-junior-ds-v1-s1-008": {
    promptZhHans: "一个透明长方体容器的长、宽、高分别为8 cm、6 cm、5 cm，容器密封且放置在8 cm×6 cm的底面上，水深为4 cm。将容器翻转180°，使原来朝上的面成为新的底面、原来的底面成为新的顶面。求水的体积、翻转后的水深，并判断水是否接触新的顶面。",
    promptEn: "A sealed transparent cuboid is 8 cm long, 6 cm wide, and 5 cm high. It initially rests on its 8 cm by 6 cm base with water 4 cm deep. Turn it through 180 degrees so that the original top becomes the new base and the original base becomes the new top. Find the water volume and new depth, and determine whether the water reaches the new top.",
    answer: "水的体积为192 cm³；翻转后水深为4 cm，水不会接触成为新顶面的原底面。",
    acceptedAnswers: ["水的体积为192 cm³；翻转后水深为4 cm，水不会接触成为新顶面的原底面。"],
    explanationZhHans: "容器翻转前后的底面都是8 cm×6 cm，水的体积为8×6×4=192 cm³。翻转后水深为192÷(8×6)=4 cm，小于容器高5 cm，所以水不会接触成为新顶面的原底面。",
    explanationEn: "The base area is 8*6=48 square centimetres before and after the turn. The water volume is 48*4=192 cubic centimetres, so its new depth is 192/48=4 cm. Since 4<5, the water does not reach the new top."
  },
  "bnu-junior-ds-v1-s1-020": {
    answer: "（1）最少5个。（2）可按前、后两排分别摆成[2,0,2]和[0,1,0]的高度矩阵。",
    acceptedAnswers: ["（1）最少5个。（2）可按前、后两排分别摆成[2,0,2]和[0,1,0]的高度矩阵。"],
    explanationZhHans: "正视图要求三列最高分别为2、1、2，左视图要求前、后两排最高分别为2、1。前排摆成[2,0,2]，后排摆成[0,1,0]即可同时满足两视图，总数为2+2+1=5。正视图三列至少分别需要2、1、2个方块，因此总数不可能少于5，所以该搭法达到最小值。",
    explanationEn: "The front-view column maxima are 2, 1, and 2, while the two depth-row maxima are 2 and 1. Height rows [2,0,2] and [0,1,0] satisfy both views using five cubes. The front view alone requires at least 2+1+2=5 cubes, so this construction is minimal."
  },
  "bnu-junior-ds-v1-s1-024": {
    answer: "5",
    acceptedAnswers: ["5", "5个", "5个小立方块"],
    explanationZhHans: "把俯视位置看成2×2高度矩阵。可将正视图中高度3的列与左视图中高度3的排交于同一位置放3层，再将两个高度2的要求交于另一位置放2层，其余位置空置，总数为5。高度3与高度2来自不同的正视列，至少需要3+2=5个，所以最少为5个。",
    explanationEn: "Use a 2-by-2 height matrix. Put a height-3 stack where the height-3 front column meets the height-3 depth row, and a height-2 stack where the two height-2 requirements meet. This uses five cubes. The distinct front columns already require at least 3+2=5 cubes, so five is minimal."
  },
  "bnu-junior-ds-v1-s1-056": {
    answer: "不存在符合x≥0的时间。",
    acceptedAnswers: ["不存在符合x≥0的时间。", "无符合条件的时间", "无解"],
    explanationZhHans: "设经过x小时，其中x≥0。冷库温度绝对值为|-3-2x|=3+2x，水位为0.5+0.3x。令两者相等得3+2x=0.5+0.3x，解得x=-25/17，不满足x≥0。因此不存在符合条件的时间。",
    explanationEn: "For x>=0 hours, the temperature magnitude is |-3-2x|=3+2x and the water level is 0.5+0.3x. Equating them gives x=-25/17, outside the allowed domain. Therefore no qualifying time exists."
  },
  "bnu-junior-ds-v1-s1-072": {
    answer: "不存在符合x≥0的解。",
    acceptedAnswers: ["不存在符合x≥0的解。", "无符合条件的解", "无解"],
    explanationZhHans: "冷库内、外温度分别为y₁=-5-2x、y₂=3+1.5x。互为相反数要求-5-2x=-(3+1.5x)，解得x=-4，不满足x≥0。因此不存在符合条件的解。",
    explanationEn: "The inside and outside temperatures are y1=-5-2x and y2=3+1.5x. Being opposites requires -5-2x=-(3+1.5x), which gives x=-4. This violates x>=0, so there is no admissible solution."
  },
  "bnu-junior-ds-v1-s1-098": {
    answer: "（1）240人；（2）租4辆60座客车，总租金1200元，比租6辆45座客车的1320元少120元。",
    acceptedAnswers: ["（1）240人；（2）租4辆60座客车，总租金1200元，比租6辆45座客车的1320元少120元。"],
    explanationZhHans: "设原计划租45座客车x辆，则学生数为45x+15；改租60座客车时有一辆多余，其余x-1辆坐满，所以60(x-1)=45x+15，解得x=5，学生有240人。240人需6辆45座客车，租金6×220=1320元；需4辆60座客车，租金4×300=1200元。后者少120元。",
    explanationEn: "Let x be the originally planned number of 45-seat buses. Then 60(x-1)=45x+15, so x=5 and there are 240 students. They need six 45-seat buses costing 1320 yuan or four 60-seat buses costing 1200 yuan. The latter saves 120 yuan."
  },
  "bnu-junior-ds-v1-s1-122": {
    promptZhHans: "某校七年级组织研学活动，共有学生a人、老师b人，且a+b能被45整除。若每辆大巴可乘坐45人，需要租用大巴的数量用代数式表示为______；若实际租了x辆大巴，且每辆大巴租金为800元，总租金为______元。请将两个代数式分别写出，并说明第二个代数式中数字800表示什么。",
    promptEn: "A Grade 7 study trip has a students and b teachers, and a+b is divisible by 45. Each bus seats 45 people. Express the number of buses required. If x buses are rented at 800 yuan each, express the total rent and explain what 800 represents.",
    answer: "需要(a+b)/45辆；总租金800x元；800表示每辆大巴的租金。",
    acceptedAnswers: ["需要(a+b)/45辆；总租金800x元；800表示每辆大巴的租金。"],
    explanationZhHans: "总人数为a+b，且题目说明a+b能被45整除，所以恰需(a+b)/45辆。x辆车每辆800元，总租金为800x元；其中800表示每辆大巴的租金。",
    explanationEn: "There are a+b people, and divisibility by 45 makes the exact bus count (a+b)/45. Renting x buses at 800 yuan each costs 800x yuan, where 800 is the rent per bus."
  },
  "bnu-junior-ds-v1-s1-171": {
    answer: "设有x名学生，列方程5x+18=7x-4，解得x=11。",
    acceptedAnswers: ["设有x名学生，列方程5x+18=7x-4，解得x=11。"],
    explanationZhHans: "设有x名学生。两种分配方式对应的树苗总数相同，故5x+18=7x-4。移项得2x=22，所以x=11；代回两边均为73棵，符合题意。",
    explanationEn: "Let x be the number of students. The fixed seedling total gives 5x+18=7x-4, hence 2x=22 and x=11. Substitution gives 73 seedlings in both descriptions."
  },
  "bnu-junior-ds-v1-s1-178": {
    promptZhHans: "某文具店促销，购买笔记本有两种方案：方案一，每本按标价8元出售；方案二，购买会员卡需20元，之后每本按标价的6折出售。设购买笔记本x本。（1）用含x的代数式分别表示两种方案的总费用；（2）若购买15本，通过计算说明哪种方案更省钱；（3）求两个费用函数相等时x的值，本小问只求代数交点，允许x取非负实数。",
    promptEn: "A shop offers notebooks under two plans: plan 1 costs 8 yuan per notebook; plan 2 requires a 20-yuan membership card and then charges 60% of the marked price. Let x be the number of notebooks. Express both costs, compare them for 15 notebooks, and find their algebraic intersection, allowing nonnegative real x for the last part.",
    optionsZhHans: [
      "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案一更省钱；当x=25时费用相等",
      "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案二更省钱；当x=20时费用相等",
      "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案一更省钱；当x=20时费用相等",
      "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案二更省钱；当x=6.25时费用相等"
    ],
    optionsEn: [
      "Plan 1: 8x yuan; plan 2: 20+4.8x yuan; plan 1 is cheaper for 15; equal at x=25",
      "Plan 1: 8x yuan; plan 2: 20+4.8x yuan; plan 2 is cheaper for 15; equal at x=20",
      "Plan 1: 8x yuan; plan 2: 20+4.8x yuan; plan 1 is cheaper for 15; equal at x=20",
      "Plan 1: 8x yuan; plan 2: 20+4.8x yuan; plan 2 is cheaper for 15; equal at x=6.25"
    ],
    answer: "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案二更省钱；当x=6.25时费用相等",
    acceptedAnswers: ["方案一：8x元；方案二：(20+4.8x)元；购买15本时方案二更省钱；当x=6.25时费用相等", "D", "第4项"],
    explanationZhHans: "两种总费用分别为8x元和20+4.8x元。购买15本时，两者分别为120元和92元，所以方案二更省钱。令8x=20+4.8x，得3.2x=20，解得x=6.25。",
    explanationEn: "The two costs are 8x and 20+4.8x yuan. At x=15 they are 120 and 92 yuan, so plan 2 is cheaper. Solving 8x=20+4.8x gives x=6.25."
  },
  "bnu-junior-ds-v1-s1-182": {
    answer: "铅笔1.6元，笔记本3.6元",
    acceptedAnswers: ["铅笔1.6元，笔记本3.6元", "铅笔1.6元/支，笔记本3.6元/本"],
    explanationZhHans: "设每支铅笔x元，则每本笔记本x+2元。由3x+2(x+2)=12得5x=8，所以x=1.6，笔记本单价为3.6元。检验：3×1.6+2×3.6=12。",
    explanationEn: "Let a pencil cost x yuan, so a notebook costs x+2. From 3x+2(x+2)=12, x=1.6, and a notebook costs 3.6 yuan. The total checks as 12 yuan."
  },
  "bnu-junior-ds-v1-s1-188": {
    promptZhHans: "一个两位数，十位数字比个位数字小3，且这个两位数是个位数字的5倍。求这个两位数。",
    promptEn: "A two-digit number has a tens digit three less than its ones digit, and the number is five times its ones digit. Find the number.",
    answer: "25",
    acceptedAnswers: ["25"],
    explanationZhHans: "设个位数字为x，则十位数字为x-3，两位数为10(x-3)+x=11x-30。由11x-30=5x得x=5，十位数字为2，所以这个两位数是25。",
    explanationEn: "Let the ones digit be x, so the tens digit is x-3 and the number is 11x-30. The equation 11x-30=5x gives x=5, making the tens digit 2 and the number 25."
  },
  "bnu-junior-ds-v1-s1-224": {
    promptZhHans: "某校七年级共有300名学生，学校想了解学生在调查日前一天完成家庭作业所用的时间。请设计一个合理的调查方案，包括调查问题、调查对象、收集数据的方法和整理数据的步骤。",
    promptEn: "A school wants to learn how long its 300 Grade 7 students spent completing homework on the day before the survey. Design a suitable investigation covering the question, target population, data collection, and data organization.",
    answer: "调查问题：调查日前一天完成家庭作业用了多少分钟；调查对象：七年级全体300名学生；匿名问卷收集；按时间段分组统计频数和百分比。",
    acceptedAnswers: ["调查问题：调查日前一天完成家庭作业用了多少分钟；调查对象：七年级全体300名学生；匿名问卷收集；按时间段分组统计频数和百分比。"],
    explanationZhHans: "调查问题限定为同一个具体日期，避免“每天”含义不清。调查七年级全体300名学生并匿名填写，把分钟数按合理区间分组，再统计各组频数和百分比，即可得到可比较的数据。",
    explanationEn: "Using one specified day avoids ambiguity in the word daily. Survey all 300 Grade 7 students anonymously, group their reported minutes into suitable intervals, and calculate frequencies and percentages."
  },
  "bnu-junior-ds-v1-s1-233": {
    answer: "（1）方案二。（2）2小时6人，3小时10人，4小时9人，5小时10人，6小时5人。（3）3小时和5小时人数最多，均为10人。",
    acceptedAnswers: ["（1）方案二。（2）2小时6人，3小时10人，4小时9人，5小时10人，6小时5人。（3）3小时和5小时人数最多，均为10人。"],
    explanationZhHans: "方案二调查全班每名同学，数据最完整；方案一只有一人，方案三存在自愿填报偏差。逐项计数得到2小时6人、3小时10人、4小时9人、5小时10人、6小时5人，共40人。最高频数为10，对应3小时和5小时。",
    explanationEn: "Plan 2 surveys every class member. Counting the 40 observations gives frequencies 6, 10, 9, 10, and 5 for 2 through 6 hours. The largest frequency is 10, shared by 3 and 5 hours."
  },
  "bnu-junior-ds-v1-s1-237": {
    answer: "（1）总体是七年级全体学生一周平均作业时间。（2）个体是每名学生的一周平均作业时间。（3）样本是被抽取学生的一周平均作业时间。（4）若有n个班，样本容量为5n。",
    acceptedAnswers: ["（1）总体是七年级全体学生一周平均作业时间。（2）个体是每名学生的一周平均作业时间。（3）样本是被抽取学生的一周平均作业时间。（4）若有n个班，样本容量为5n。"],
    explanationZhHans: "研究变量是每名学生一周内每日作业时间的平均值。总体、个体和样本分别是全体学生、每名学生和被抽取学生对应的一周平均作业时间。每班抽5名学生，若七年级有n个班，共抽5n名学生，所以样本容量为5n；记录7天并不会把样本容量再乘7。",
    explanationEn: "The measured variable is each student's average daily homework time over one week. The population, individual, and sample are the corresponding weekly averages for all students, one student, and the sampled students. With five students from each of n classes, the sample size is 5n; seven daily records do not multiply the sample size."
  },
  "bnu-junior-ds-v1-s1-240": {
    answer: "不能。全班40人中只有15人选择运动，另有25人选择其他活动，不能说全班同学都这样认为。",
    acceptedAnswers: ["不能。全班40人中只有15人选择运动，另有25人选择其他活动，不能说全班同学都这样认为。"],
    explanationZhHans: "本题已经调查全班40人。虽然选择运动的15人是各选项中最多的，但另外25人选择了阅读、音乐或绘画，因此只能说运动是票数最多的选项，不能说全班同学都认为运动最受欢迎。",
    explanationEn: "All 40 class members were surveyed. Sport received the largest single count, 15, but the other 25 students chose other activities. Thus sport is the plurality choice, not something every student believes."
  },
  "bnu-junior-ds-v1-s1-242": {
    answer: "（1）方案一。（2）30~40分钟5人，40~50分钟10人，50~60分钟13人，60~70分钟9人，70~80分钟3人。（3）50~60分钟人数最多，占32.5%。",
    acceptedAnswers: ["（1）方案一。（2）30~40分钟5人，40~50分钟10人，50~60分钟13人，60~70分钟9人，70~80分钟3人。（3）50~60分钟人数最多，占32.5%。"],
    explanationZhHans: "方案一是对本班全体学生的全面调查。按左闭右开区间计数，五组频数依次为5、10、13、9、3，总数40。50~60分钟组频数13最大，占13÷40=32.5%。",
    explanationEn: "Plan 1 is a census of the class. Counting in left-closed, right-open intervals gives frequencies 5, 10, 13, 9, and 3. The 50-to-60-minute group is largest and represents 13/40=32.5%."
  },
  "bnu-junior-ds-v1-s1-264": {
    answer: "-24a^5",
    acceptedAnswers: ["-24a^5", "-24a⁵"],
    explanationZhHans: "(-2a²b)³=-8a⁶b³，(ab²)²=a²b⁴。依次进行除法和乘法：(-8a⁶b³)÷(a²b⁴)×3ab=(-8a⁴/b)×3ab=-24a⁵。",
    explanationEn: "Compute the powers first: (-2a^2b)^3=-8a^6b^3 and (ab^2)^2=a^2b^4. Then (-8a^6b^3)/(a^2b^4)*3ab=-24a^5."
  },
  "bnu-junior-ds-v1-s1-335": {
    promptZhHans: "已知直线AB与CD相交于点O，射线OE在∠AOD内部，且∠AOE=35°，∠EOD=55°。过点O作直线MN，使得∠BOM=40°。若∠CON=50°，判断直线AB与MN是否平行，并说明理由。",
    promptEn: "Lines AB and CD meet at O. Ray OE lies inside angle AOD, with angle AOE=35 degrees and angle EOD=55 degrees. A line MN through O satisfies angle BOM=40 degrees and angle CON=50 degrees. Determine whether AB and MN are parallel and justify your answer.",
    answer: "AB与MN不平行。两直线都过O，若平行则必须重合，但∠BOM=40°，所以不重合。",
    acceptedAnswers: ["AB与MN不平行。两直线都过O，若平行则必须重合，但∠BOM=40°，所以不重合。"],
    explanationZhHans: "直线AB与MN都经过点O。平面内两条经过同一点的直线若平行，只能是同一条直线；但∠BOM=40°而不是0°或180°，说明射线OM不在直线AB上。因此两直线不重合，也不平行。给出的∠CON=50°与这一位置关系相容。",
    explanationEn: "Both AB and MN pass through O. Two coplanar lines through the same point can be parallel only if they coincide. Since angle BOM is 40 degrees, OM is not on AB, so the lines are distinct and not parallel. The stated angle CON=50 degrees is consistent with this configuration."
  },
  "bnu-junior-ds-v1-s1-417": {
    promptZhHans: "小华记录了一辆汽车在平直公路上匀速行驶时，油箱内剩余油量y（升）与行驶路程x（千米）的部分数据如下表：\n\n| 行驶路程x（千米） | 0 | 50 | 100 | 150 | 200 |\n|---|---|---|---|---|---|\n| 剩余油量y（升） | 45 | 40 | 35 | 30 | 25 |\n\n（1）哪个是自变量，哪个是因变量？（2）行驶120千米时，估计剩余油量。（3）用t表示汽车还能继续行驶的路程，写出t与y的关系式，并说明行驶200千米后最多还能行驶多少千米。",
    promptEn: "A car's remaining fuel y in litres is recorded against distance x in kilometres: (0,45), (50,40), (100,35), (150,30), and (200,25). Identify the independent and dependent variables, estimate y at x=120, and let t be the remaining driving distance. Give t in terms of y and find the maximum additional distance after 200 km.",
    answer: "（1）x是自变量，y是因变量。（2）33升。（3）t=10y；行驶200千米后最多还能行驶250千米。",
    acceptedAnswers: ["（1）x是自变量，y是因变量。（2）33升。（3）t=10y；行驶200千米后最多还能行驶250千米。"],
    explanationZhHans: "y随x变化，所以x是自变量、y是因变量。每50千米耗油5升，即每千米0.1升；行驶120千米耗油12升，剩33升。每升油可行驶10千米，所以t=10y；行驶200千米后y=25，最多还能行驶250千米。",
    explanationEn: "Fuel y depends on distance x. Consumption is 5 litres per 50 km, so after 120 km, 33 litres remain. Each litre supports 10 km, hence t=10y. After 200 km, y=25, so the car can travel another 250 km."
  },
  "bnu-junior-ds-v1-s1-437": {
    answer: "2√10",
    acceptedAnswers: ["2√10", "2根号10", "√40"],
    explanationZhHans: "A(2,3)关于x轴的对称点是C(2,-3)，B(4,-1)关于y轴的对称点是D(-4,-1)。因此CD=√[(2-(-4))²+(-3-(-1))²]=√(36+4)=√40=2√10。",
    explanationEn: "Reflecting A=(2,3) across the x-axis gives C=(2,-3), and reflecting B=(4,-1) across the y-axis gives D=(-4,-1). Thus CD=sqrt(6^2+(-2)^2)=sqrt(40)=2sqrt(10)."
  },
  "bnu-junior-ds-v1-s1-458": {
    answer: "(4,1)",
    acceptedAnswers: ["(4,1)", "(4, 1)"],
    explanationZhHans: "直线l是线段AB的垂直平分线，因此关于l的轴对称会交换线段AB的两个端点。点A关于l的对称点就是点B，所以P=(4,1)。",
    explanationEn: "Reflection across the perpendicular bisector of segment AB interchanges its endpoints. Therefore A reflects to B, so P=(4,1)."
  },
  "bnu-junior-ds-v1-s1-482": {
    answer: "等可能结果为1,1,2,2,3,3,4,4；奇数结果有4个，概率为1/2。",
    acceptedAnswers: ["等可能结果为1,1,2,2,3,3,4,4；奇数结果有4个，概率为1/2。"],
    explanationZhHans: "八个扇形等可能，对应结果按扇形列为1,1,2,2,3,3,4,4。其中标奇数的扇形是两个1和两个3，共4个，所以概率为4/8=1/2。",
    explanationEn: "The eight sectors are equally likely and are labelled 1,1,2,2,3,3,4,4. Four sectors carry odd numbers, so the probability is 4/8=1/2."
  },
  "bnu-junior-ds-v1-s1-484": {
    answer: "等可能结果为(A,A),(A,B),(A,C),(A,D),(A,E),(B,A),(B,B),(B,C),(B,D),(B,E),(C,A),(C,B),(C,C),(C,D),(C,E),(D,A),(D,B),(D,C),(D,D),(D,E),(E,A),(E,B),(E,C),(E,D),(E,E)；相同字母有5种，概率为1/5。",
    acceptedAnswers: ["等可能结果为(A,A),(A,B),(A,C),(A,D),(A,E),(B,A),(B,B),(B,C),(B,D),(B,E),(C,A),(C,B),(C,C),(C,D),(C,E),(D,A),(D,B),(D,C),(D,D),(D,E),(E,A),(E,B),(E,C),(E,D),(E,E)；相同字母有5种，概率为1/5。"],
    explanationZhHans: "有放回抽取产生5×5=25个等可能有序结果，依次为(A,A)到(E,E)的全部有序组合。其中两次相同的是(A,A)、(B,B)、(C,C)、(D,D)、(E,E)，共5种，所以概率为5/25=1/5。",
    explanationEn: "Replacement gives 5*5=25 equally likely ordered pairs, all combinations from (A,A) through (E,E). Five pairs have matching letters, so the probability is 5/25=1/5."
  }
};

const remainingA18S2ReviewedCorrections: Record<string, ReviewedBnuJuniorCorrection> = {
  "bnu-junior-ds-v1-s2-044": {
    answer: "d<c<a<b",
    acceptedAnswers: ["d<c<a<b", "d < c < a < b", "³√(-8)<√(16/3)<√7<³√26"],
    explanationZhHans: "d=∛(-8)=-2。又c=√(16/3)=4/√3≈2.309，a=√7≈2.646，b=∛26≈2.962，所以从小到大为d<c<a<b。",
    explanationEn: "Here d=cube root(-8)=-2, c=sqrt(16/3) is about 2.309, a=sqrt(7) is about 2.646, and b=cube root(26) is about 2.962. Therefore d<c<a<b."
  },
  "bnu-junior-ds-v1-s2-050": {
    answer: "∛2",
    acceptedAnswers: ["∛2", "³√2", "2^(1/3)"],
    explanationZhHans: "三个式子√(a-3)、|b+2|、(c-1)²都非负，和为0时每一项都为0。因此a=3、b=-2、c=1，a+b+c=2，其立方根为∛2。",
    explanationEn: "All three terms are nonnegative, so each must be zero. Thus a=3, b=-2, and c=1, giving a+b+c=2. Its cube root is cube root(2)."
  },
  "bnu-junior-ds-v1-s2-164": {
    answer: "方程组为x+y=17，8x+5y=100；解得x=5，y=12。",
    acceptedAnswers: ["方程组为x+y=17，8x+5y=100；解得x=5，y=12。"],
    explanationZhHans: "总本数给出x+y=17，总价给出8x+5y=100。由y=17-x代入第二式，得8x+5(17-x)=100，所以x=5、y=12。",
    explanationEn: "The item count gives x+y=17 and the cost gives 8x+5y=100. Substituting y=17-x yields x=5 and y=12."
  },
  "bnu-junior-ds-v1-s2-165": {
    answer: "方程组为y=45x+15，y=60(x-1)；解得x=5，y=240。",
    acceptedAnswers: ["方程组为y=45x+15，y=60(x-1)；解得x=5，y=240。"],
    explanationZhHans: "45座方案有15人无座，故y=45x+15；60座方案多出一辆车，其余x-1辆坐满，故y=60(x-1)。联立得x=5、y=240。",
    explanationEn: "The 45-seat plan gives y=45x+15. Under the 60-seat plan one bus is unused and the other x-1 buses are full, so y=60(x-1). Solving gives x=5 and y=240."
  },
  "bnu-junior-ds-v1-s2-168": {
    answer: "方程组为3x+2y=210，2x+3y=215；解得x=40，y=45。",
    acceptedAnswers: ["方程组为3x+2y=210，2x+3y=215；解得x=40，y=45。"],
    explanationZhHans: "两种配车方式分别给出3x+2y=210和2x+3y=215。消元可得5x=200，所以x=40；代回得y=45。",
    explanationEn: "The two arrangements give 3x+2y=210 and 2x+3y=215. Elimination yields 5x=200, so x=40 and y=45."
  },
  "bnu-junior-ds-v1-s2-175": {
    optionsZhHans: [
      "{ x + y = 1, 2x - y = 8 }",
      "{ x - y = 5, 3x + y = 8 }",
      "{ 2x + y = 4, x - 2y = 6 }",
      "{ x + 2y = -1, 3x - y = 10 }"
    ],
    optionsEn: [
      "{ x+y=1, 2x-y=8 }",
      "{ x-y=5, 3x+y=8 }",
      "{ 2x+y=4, x-2y=6 }",
      "{ x+2y=-1, 3x-y=10 }"
    ],
    answer: "{ x + y = 1, 2x - y = 8 }",
    acceptedAnswers: ["{ x + y = 1, 2x - y = 8 }", "A", "第1项"],
    explanationZhHans: "把x=3、y=-2代入：第1项中3+(-2)=1且2×3-(-2)=8，两式都成立。其余三项各至少有一个方程不成立，因此只有第1项。",
    explanationEn: "Substituting x=3 and y=-2 satisfies both equations in option 1. Each other option has at least one false equation, so only option 1 is correct."
  },
  "bnu-junior-ds-v1-s2-188": {
    answer: "方程组为x+y=15，5x+8y=99；解得x=7，y=8。",
    acceptedAnswers: ["方程组为x+y=15，5x+8y=99；解得x=7，y=8。"],
    explanationZhHans: "总本数给出x+y=15，总价给出5x+8y=99。由x=15-y代入第二式，得75-5y+8y=99，所以y=8、x=7。",
    explanationEn: "The count gives x+y=15 and the cost gives 5x+8y=99. Substitution yields y=8 and x=7."
  },
  "bnu-junior-ds-v1-s2-189": {
    answer: "方程组为y=45x+15，y=50x-10；解得x=5，y=240。",
    acceptedAnswers: ["方程组为y=45x+15，y=50x-10；解得x=5，y=240。"],
    explanationZhHans: "按45人乘坐时有15人无座，故y=45x+15；按50人乘坐时空出10座，故y=50x-10。联立得5x=25，所以x=5、y=240。",
    explanationEn: "The two seating descriptions give y=45x+15 and y=50x-10. Solving gives x=5 and y=240."
  },
  "bnu-junior-ds-v1-s2-197": {
    answer: "甲的方差为0.6，乙的方差为2.0，甲的成绩更稳定。",
    acceptedAnswers: ["甲的方差为0.6，乙的方差为2.0，甲的成绩更稳定。"],
    explanationZhHans: "两人的平均数都是8。甲有3个7、4个8、3个9，方差为[3×(7-8)²+4×(8-8)²+3×(9-8)²]÷10=0.6。乙的方差为[2×(6-8)²+2×(7-8)²+2×(8-8)²+2×(9-8)²+2×(10-8)²]÷10=2.0。甲的方差更小，成绩更稳定。",
    explanationEn: "Both means are 8. A has three 7s, four 8s, and three 9s, giving variance 0.6. B has two of each score from 6 through 10, giving variance 2.0. Therefore A is more stable."
  },
  "bnu-junior-ds-v1-s2-200": {
    answer: "甲和乙的平均株高均为86厘米，甲的方差为2.0，乙的方差为6.0，因此甲的株高更整齐。",
    acceptedAnswers: ["甲和乙的平均株高均为86厘米，甲的方差为2.0，乙的方差为6.0，因此甲的株高更整齐。"],
    explanationZhHans: "两组数据的平均数都为86。甲组离均差平方和为20，方差为20÷10=2.0；乙组离均差平方和为60，方差为60÷10=6.0。甲的方差较小，所以株高更整齐。",
    explanationEn: "Both samples have mean 86. Their sums of squared deviations are 20 and 60, so the variances are 2.0 and 6.0. The smaller variance makes A more uniform."
  },
  "bnu-junior-ds-v1-s2-201": {
    answer: "甲班方差约为8，乙班方差约为74，甲班成绩更稳定。",
    acceptedAnswers: ["甲班方差约为8，乙班方差约为74，甲班成绩更稳定。"],
    explanationZhHans: "甲班平均数为169.5，方差为8.25，保留整数约为8；乙班平均数为168.8，方差为73.76，保留整数约为74。甲班方差较小，因此成绩更稳定。",
    explanationEn: "Class A has mean 169.5 and variance 8.25, which rounds to 8. Class B has mean 168.8 and variance 73.76, which rounds to 74. Class A is more stable."
  },
  "bnu-junior-ds-v1-s2-207": {
    answer: "甲班方差为34.8，乙班方差为177.0，乙班成绩离散程度更大。",
    acceptedAnswers: ["甲班方差为34.8，乙班方差为177.0，乙班成绩离散程度更大。"],
    explanationZhHans: "甲班平均分为85，离均差平方和为348，方差为34.8；乙班平均分为83，离均差平方和为1770，方差为177.0。乙班方差更大，成绩离散程度更大。",
    explanationEn: "Class A has mean 85 and variance 348/10=34.8. Class B has mean 83 and variance 1770/10=177.0. Thus Class B is more dispersed."
  },
  "bnu-junior-ds-v1-s2-212": {
    answer: "（1）甲班平均数190cm，中位数190cm；乙班平均数190cm，中位数190cm。（2）推荐甲班，因为甲班成绩的方差较小，成绩更整齐。",
    acceptedAnswers: ["（1）甲班平均数190cm，中位数190cm；乙班平均数190cm，中位数190cm。（2）推荐甲班，因为甲班成绩的方差较小，成绩更整齐。"],
    explanationZhHans: "两班平均数和中位数均为190 cm。甲班方差=[(-10)²+(-5)²+0²+5²+10²]÷5=50；乙班方差=[(-15)²+(-2)²+0²+2²+15²]÷5=91.6。甲班方差较小，成绩更整齐，所以推荐甲班。",
    explanationEn: "Both classes have mean and median 190 cm. Their variances are 50 and 91.6 respectively. Class A has the smaller variance and is therefore more consistent."
  },
  "bnu-junior-ds-v1-s2-213": {
    answer: "13.6875",
    acceptedAnswers: ["13.6875", "13.6875分²"],
    explanationZhHans: "去掉78和95后，数据为82、85、88、92，平均数为86.75。方差=[(82-86.75)²+(85-86.75)²+(88-86.75)²+(92-86.75)²]÷4=13.6875。",
    explanationEn: "After removing 78 and 95, the mean of 82, 85, 88, and 92 is 86.75. The average squared deviation is 13.6875."
  },
  "bnu-junior-ds-v1-s2-215": {
    answer: "（1）中位数是85分，众数是85分。（2）约1100人。",
    acceptedAnswers: ["（1）中位数是85分，众数是85分。（2）约1100人。"],
    explanationZhHans: "第10、11个数据均为85，所以中位数为85；85出现3次最多，所以众数为85。85分及以上有11人，占11/20，估计人数为2000×11/20=1100。",
    explanationEn: "The 10th and 11th values are 85, and 85 occurs most often. Eleven of the 20 scores are at least 85, so the estimate is 2000*11/20=1100 people."
  },
  "bnu-junior-ds-v1-s2-218": {
    answer: "（1）中位数是12cm，平均数是12.2cm。（2）优秀率30%，估计约120人。",
    acceptedAnswers: ["（1）中位数是12cm，平均数是12.2cm。（2）优秀率30%，估计约120人。"],
    explanationZhHans: "第10、11个数据都为12，所以中位数为12 cm；20个数据之和为244，平均数为244÷20=12.2 cm。不低于15 cm的有6人，优秀率为6/20=30%，估计全年级约400×30%=120人。",
    explanationEn: "The median is 12 cm. The sum is 244, so the mean is 12.2 cm. Six of 20 students reach 15 cm, giving 30% and an estimate of 120 out of 400."
  },
  "bnu-junior-ds-v1-s2-224": {
    answer: "（1）一班平均数190、中位数190；二班平均数196、中位数185。（2）一班方差50，二班方差754，一班更稳定。（3）选择一班更合适。",
    acceptedAnswers: ["（1）一班平均数190、中位数190；二班平均数196、中位数185。（2）一班方差50，二班方差754，一班更稳定。（3）选择一班更合适。"],
    explanationZhHans: "一班平均数和中位数均为190，方差为50。二班平均数为196、中位数为185，方差=[(-21)²+(-16)²+(-11)²+(-6)²+54²]÷5=754。一班方差小且中位数更高，发挥更稳定，因此选择一班更合适。",
    explanationEn: "Class 1 has mean and median 190 and variance 50. Class 2 has mean 196, median 185, and variance 754. Class 1 is much more stable and has the higher median, so it is the better choice."
  },
  "bnu-junior-ds-v1-s2-225": {
    answer: "甲的方差为0.49，乙的方差为1.45，应选甲参赛，因为甲更稳定。",
    acceptedAnswers: ["甲的方差为0.49，乙的方差为1.45，应选甲参赛，因为甲更稳定。"],
    explanationZhHans: "甲、乙平均数分别为7.9和7.5。按方差公式计算，甲的方差为0.49，乙的方差为1.45。甲的方差较小，发挥更稳定，应选甲参赛。",
    explanationEn: "The means are 7.9 and 7.5. Their population variances are 0.49 and 1.45. A has the smaller variance and should be selected for stability."
  },
  "bnu-junior-ds-v1-s2-228": {
    answer: "甲的方差为1.2，乙的方差为2.16，应选择甲。",
    acceptedAnswers: ["甲的方差为1.2，乙的方差为2.16，应选择甲。"],
    explanationZhHans: "甲、乙平均数分别为8和7.8。计算离均差平方的平均数，甲的方差为1.2，乙的方差为2.16。甲的方差较小，因此应选择甲。",
    explanationEn: "The means are 8 and 7.8, and the variances are 1.2 and 2.16. A has the smaller variance and is the more stable choice."
  },
  "bnu-junior-ds-v1-s2-230": {
    answer: "甲平均数为8、方差为0.6；乙平均数为8、方差为4.4；应选甲，因为方差更小。",
    acceptedAnswers: ["甲平均数为8、方差为0.6；乙平均数为8、方差为4.4；应选甲，因为方差更小。"],
    explanationZhHans: "两人的平均数都是8。甲的离均差平方和为6，方差为0.6；乙的离均差平方和为44，方差为4.4。比赛看重稳定性，应选择方差更小的甲。",
    explanationEn: "Both means are 8. A's sum of squared deviations is 6, giving variance 0.6; B's is 44, giving variance 4.4. For stability, choose A."
  },
  "bnu-junior-ds-v1-s2-275": {
    promptZhHans: "在△ABC中，∠C=90°，AC=6，BC=8。线段AB的垂直平分线交直线AC于点D，且D在C点外侧，交AB于点E。求CD的长度。",
    promptEn: "In right triangle ABC, angle C=90 degrees, AC=6, and BC=8. The perpendicular bisector of segment AB meets line AC at D beyond C and meets AB at E. Find CD.",
    answer: "7/3",
    acceptedAnswers: ["7/3", "7÷3"],
    explanationZhHans: "连接BD。D在线段AB的垂直平分线上，所以AD=BD。设CD=x，则D在C点外侧给出AD=6+x；在直角三角形BCD中，BD²=8²+x²。于是(6+x)²=64+x²，解得12x=28，即CD=x=7/3。",
    explanationEn: "Since D lies on the perpendicular bisector of AB, AD=BD. Let CD=x. Because D is beyond C, AD=6+x, while right triangle BCD gives BD^2=64+x^2. Thus (6+x)^2=64+x^2 and x=7/3."
  },
  "bnu-junior-ds-v1-s2-284": {
    answer: "因为AD平分∠BAC，且DE⊥AB、DF⊥AC，所以角平分线上的点D到∠BAC两边的距离相等，故DE=DF。",
    acceptedAnswers: ["因为AD平分∠BAC，且DE⊥AB、DF⊥AC，所以角平分线上的点D到∠BAC两边的距离相等，故DE=DF。"],
    explanationZhHans: "AD平分∠BAC，所以D在∠BAC的角平分线上。DE、DF分别垂直于角的两边AB、AC，因而是点D到两边的距离。角平分线上的点到角的两边距离相等，所以DE=DF。",
    explanationEn: "D lies on the bisector of angle BAC. Since DE and DF are perpendicular to AB and AC, they are D's distances to the two sides of the angle. A point on an angle bisector is equidistant from the sides, so DE=DF."
  },
  "bnu-junior-ds-v1-s2-305": {
    promptZhHans: "已知在△ABC中，AB=AC，∠A=40°，点D在直线BC上且位于C点外侧，∠BAD=70°。求证：AD=BD。",
    promptEn: "In triangle ABC, AB=AC and angle A=40 degrees. Point D lies on line BC beyond C, and angle BAD=70 degrees. Prove that AD=BD.",
    answer: "D在C点外侧，所以∠ABD=∠ABC=70°；又∠BAD=70°，故∠ABD=∠BAD，从而AD=BD。",
    acceptedAnswers: ["D在C点外侧，所以∠ABD=∠ABC=70°；又∠BAD=70°，故∠ABD=∠BAD，从而AD=BD。"],
    explanationZhHans: "由AB=AC且∠A=40°，得底角∠ABC=∠ACB=(180°-40°)÷2=70°。D在C点外侧，射线BD与BC同向，所以∠ABD=∠ABC=70°。又∠BAD=70°，故△ABD中∠ABD=∠BAD，它们所对的边相等，因此AD=BD。",
    explanationEn: "The base angles of isosceles triangle ABC are each 70 degrees. Since D is beyond C, ray BD has the same direction as BC, so angle ABD=70 degrees. This equals angle BAD, and therefore their opposite sides AD and BD are equal."
  },
  "bnu-junior-ds-v1-s2-317": {
    answer: "y=-20x²+1400x-20000，30≤x≤50",
    acceptedAnswers: ["y=-20x²+1400x-20000，30≤x≤50", "y=-20x^2+1400x-20000,30<=x<=50"],
    explanationZhHans: "售价为x元时，销量为400-20(x-30)=1000-20x。每件利润为x-20，所以y=(x-20)(1000-20x)=-20x²+1400x-20000。销量非负给出x≤50，结合x≥30，得30≤x≤50。",
    explanationEn: "At price x, sales are 400-20(x-30)=1000-20x. Thus y=(x-20)(1000-20x)=-20x^2+1400x-20000. Nonnegative sales and x>=30 give 30<=x<=50."
  },
  "bnu-junior-ds-v1-s2-326": {
    answer: "y=-20x²+1400x-20000，售价为35元时利润最大",
    acceptedAnswers: ["y=-20x²+1400x-20000，售价为35元时利润最大", "y=-20x^2+1400x-20000，售价为35元时利润最大"],
    explanationZhHans: "销量为1000-20x，所以y=(x-20)(1000-20x)=-20x²+1400x-20000。抛物线开口向下，顶点横坐标为x=-1400÷(2×-20)=35，因此售价35元时利润最大。",
    explanationEn: "Sales are 1000-20x, so y=(x-20)(1000-20x)=-20x^2+1400x-20000. This downward-opening parabola has vertex x=35, so 35 yuan maximizes profit."
  },
  "bnu-junior-ds-v1-s2-331": {
    answer: "2 < a ≤ 4",
    acceptedAnswers: ["2 < a ≤ 4", "2<a≤4", "B", "第2项"],
    explanationZhHans: "第一个不等式给出x>2，第二个给出x≤(10-a)/2。解集包含3，要求(10-a)/2≥3，即a≤4；解集不包含4，要求(10-a)/2<4，即a>2。故2<a≤4，选第2项。",
    explanationEn: "The system gives 2<x<=(10-a)/2. Including 3 requires the upper bound to be at least 3, so a<=4. Excluding 4 requires it to be below 4, so a>2. Hence 2<a<=4, option 2."
  },
  "bnu-junior-ds-v1-s2-347": {
    answer: "不存在符合条件的正整数x。",
    acceptedAnswers: ["不存在符合条件的正整数x。", "无符合条件的正整数", "无解"],
    explanationZhHans: "利润y=(10+x)(200-10x)=-10x²+100x+2000=-10(x-5)²+2250。其最大值为2250元，仍小于2400元，所以不存在使月利润不低于2400元的正整数x。",
    explanationEn: "Profit is y=(10+x)(200-10x)=-10(x-5)^2+2250. Its maximum is only 2250 yuan, below 2400, so no positive integer x qualifies."
  },
  "bnu-junior-ds-v1-s2-427": {
    optionsZhHans: ["方程的解为 x=-4", "方程的解为 x=0", "方程无解", "方程的解为 x=2 或 x=0"],
    optionsEn: ["The solution is x=-4", "The solution is x=0", "The equation has no solution", "The solutions are x=2 or x=0"],
    answer: "方程的解为 x=-4",
    acceptedAnswers: ["方程的解为 x=-4", "A", "第1项"],
    explanationZhHans: "定义域要求x≠±1。方程两边同乘(x-1)(x+1)，得3(x+1)=2(x-1)+1，解得x=-4。-4不使原分母为0，所以是原方程的解，选第1项。",
    explanationEn: "The domain excludes x=1 and x=-1. Multiplying by (x-1)(x+1) gives 3(x+1)=2(x-1)+1, so x=-4. It is allowed by the domain, making option 1 correct."
  },
  "bnu-junior-ds-v1-s2-435": {
    answer: "m=0或4",
    acceptedAnswers: ["m=0或4", "m=4或0", "m∈{0,4}"],
    explanationZhHans: "去分母得2(x+1)=m。原方程禁值为x=1和x=-1。若去分母后的根x=1，则m=4；若根x=-1，则m=0。两种情况下所得根都使原分母为0，都是增根，因此m=0或4。",
    explanationEn: "Clearing denominators gives 2(x+1)=m, while the original equation excludes x=1 and x=-1. Making the transformed root 1 gives m=4; making it -1 gives m=0. Both are extraneous roots, so m=0 or 4."
  },
  "bnu-junior-ds-v1-s2-437": {
    answer: "设原计划每天修x米，列方程1200/x-1200/(x+10)=4，解得x=50或-60；舍去-60，检验x=50符合题意。",
    acceptedAnswers: ["设原计划每天修x米，列方程1200/x-1200/(x+10)=4，解得x=50或-60；舍去-60，检验x=50符合题意。"],
    explanationZhHans: "设原计划每天修x米，则1200/x-1200/(x+10)=4。去分母整理得x²+10x-3000=0，解得x=50或x=-60。日进度应为正，舍去-60；检验1200/50-1200/60=24-20=4，所以x=50符合题意。",
    explanationEn: "Let x be the planned daily distance. The equation is 1200/x-1200/(x+10)=4, whose roots are 50 and -60. Reject the negative rate. Checking gives 24-20=4 days, so x=50 is valid."
  },
  "bnu-junior-ds-v1-s2-439": {
    optionsZhHans: ["当 \\(x=2\\) 时分式的值为 0", "当 \\(x=-2\\) 时分式的值为 0", "当 \\(x=0\\) 时分式的值为 -1", "分式化简后为 \\(\\frac{2}{x+2}\\)"],
    optionsEn: ["At x=2 the value is 0", "At x=-2 the value is 0", "At x=0 the value is -1", "The expression simplifies to 2/(x+2)"],
    answer: "分式化简后为 \\(\\frac{2}{x+2}\\)",
    acceptedAnswers: ["分式化简后为 \\(\\frac{2}{x+2}\\)", "D", "第4项"],
    explanationZhHans: "原式定义域为x≠±2。在定义域内，(2x-4)/(x²-4)=2(x-2)/[(x-2)(x+2)]=2/(x+2)。x=±2均无定义；x=0时原式等于1而不是-1。因此只有第4项正确。",
    explanationEn: "The domain excludes x=2 and x=-2. Within the domain, the expression simplifies to 2/(x+2). At x=0 its value is 1, not -1, so only option 4 is true."
  },
  "bnu-junior-ds-v1-s2-447": {
    answer: "无解",
    acceptedAnswers: ["无解", "方程无解"],
    explanationZhHans: "定义域要求x≠2。把右边化为(x-1)/(x-2)，两边同乘x-2得1+3(x-2)=x-1，解得x=2。但x=2使原方程分母为0，是增根，故原方程无解。",
    explanationEn: "The domain excludes x=2. Multiplying the rewritten equation by x-2 gives 1+3(x-2)=x-1 and the candidate x=2. Since that value is excluded, it is extraneous and the original equation has no solution."
  },
  "bnu-junior-ds-v1-s2-449": {
    answer: "m < -1 且 m ≠ -2",
    acceptedAnswers: ["m < -1 且 m ≠ -2", "m<-1且m≠-2"],
    explanationZhHans: "去分母得2x+m=x-1，所以x=-m-1。解为正数要求-m-1>0，即m<-1；原分母要求x≠1，所以-m-1≠1，即m≠-2。故m<-1且m≠-2。",
    explanationEn: "Solving gives x=-m-1. Positivity requires m<-1, and the original denominator requires x not equal 1, hence m not equal -2."
  },
  "bnu-junior-ds-v1-s2-461": {
    answer: "2",
    acceptedAnswers: ["2", "A", "第1项"],
    explanationZhHans: "分式值为0要求分子为0且分母不为0。x²-4=0给出x=±2；分母x²-x-6=(x-3)(x+2)，所以x=-2是禁值，只剩x=2，选第1项。",
    explanationEn: "A rational expression is zero when its numerator is zero and denominator nonzero. The numerator gives x=2 or -2, but the denominator excludes -2. Thus x=2, option 1."
  },
  "bnu-junior-ds-v1-s2-465": {
    promptZhHans: "已知四边形ABCD，对角线AC与BD交于点O。从下列条件中任选两个，能推出四边形ABCD是平行四边形的是（ ）①AB∥CD；②AD∥BC；③AB=CD；④∠BAD=90°。",
    promptEn: "In quadrilateral ABCD, diagonals AC and BD meet at O. Which pair of conditions guarantees that ABCD is a parallelogram? (1) AB is parallel to CD; (2) AD is parallel to BC; (3) AB=CD; (4) angle BAD=90 degrees.",
    answer: "①与③",
    acceptedAnswers: ["①与③", "A", "第1项"],
    explanationZhHans: "①与③说明同一组对边AB、CD平行且相等，可判定四边形ABCD为平行四边形。①与④、②与③、③与④都不满足任何一个充分判定条件，不能保证为平行四边形。因此选第1项。",
    explanationEn: "Conditions 1 and 3 say the same pair of opposite sides AB and CD are parallel and equal, which guarantees a parallelogram. None of the other listed pairs meets a sufficient criterion, so option 1 is correct."
  }
};

const remainingA18S3ReviewedCorrections: Record<string, ReviewedBnuJuniorCorrection> = {
  "bnu-junior-ds-v1-s3-069": {
    promptEn: "The quadratic equation (k-1)x^2 - 2(k-1)x + k + 2 = 0 has two distinct real roots in x. Find the range of k.",
    answer: "k < 1",
    acceptedAnswers: ["k < 1", "k<1"],
    explanationZhHans: "要使方程为一元二次方程，需k-1≠0。判别式Δ=[-2(k-1)]²-4(k-1)(k+2)，化简得Δ=-12(k-1)。由Δ>0得k<1，此范围已自动满足k≠1。因此k<1。",
    explanationEn: "The quadratic coefficient requires k-1 not equal to 0. The discriminant is [-2(k-1)]^2 - 4(k-1)(k+2) = -12(k-1). Requiring a positive discriminant gives k<1, which already excludes k=1."
  },
  "bnu-junior-ds-v1-s3-089": {
    promptEn: "A shop buys an item for 8 yuan and sells it for 10 yuan, selling 200 items per day. Each 0.5-yuan price increase reduces daily sales by 10 items. What selling prices give a daily profit of 640 yuan?",
    answer: "12元或16元",
    acceptedAnswers: ["12元或16元", "12或16", "售价12元或16元"],
    explanationZhHans: "设涨价x个0.5元，则售价为10+0.5x元，销量为200-10x件。由(10+0.5x-8)(200-10x)=640，化简得x²-16x+48=0，解得x=4或12。对应价格分别为10+0.5×4=12元与10+0.5×12=16元，所以售价为12元或16元。",
    explanationEn: "Let x be the number of 0.5-yuan increases. Then the price is 10+0.5x and sales are 200-10x. The equation (10+0.5x-8)(200-10x)=640 simplifies to x^2-16x+48=0, so x=4 or x=12. The prices are therefore 12 yuan or 16 yuan."
  },
  "bnu-junior-ds-v1-s3-209": {
    promptZhHans: "一个几何体由若干个相同的小立方块按竖直列搭成。从正面看有3列，各列最高层数从左到右为2、1、2；从左面看有2列，最高层数从前到后为2、1。从上面看，底面布局为2行3列，前排和后排的每个位置都有小立方块。请写出各位置的高度，按前排、后排各写一行，并求小立方块总数。",
    promptEn: "A solid is built from vertical stacks of identical cubes. Its front-view column heights are 2, 1, and 2 from left to right. Its left-view heights are 2 for the front row and 1 for the back row. The top-view footprint is a 2-by-3 grid with every position occupied. Write the height matrix by listing the front row and then the back row, and find the total number of cubes.",
    answer: "俯视高度矩阵为前排[2,1,2]、后排[1,1,1]；共8个小立方块。",
    acceptedAnswers: [
      "俯视高度矩阵为前排[2,1,2]、后排[1,1,1]；共8个小立方块。",
      "前排[2,1,2]，后排[1,1,1]，共8个"
    ],
    explanationZhHans: "后排最高层数为1，且后排3个位置都有小立方块，所以后排[1,1,1]。正面三列的最高层数为2、1、2；后排各列都只有1层，因此前排三列必须分别为2、1、2，即前排[2,1,2]。总数为2+1+2+1+1+1=8，共8个小立方块。",
    explanationEn: "Every back-row position is occupied and the back-row maximum is 1, so the back row is [1,1,1]. The front-view maxima are [2,1,2]; since the back row has height 1 throughout, the front row must be [2,1,2]. The total is 2+1+2+1+1+1=8 cubes."
  },
  "bnu-junior-ds-v1-s3-212": {
    promptEn: "A solid is built from identical cubes. Both its front view and its left view are full 2-by-2 square grids. What is the minimum number of cubes, and why?",
    answer: "最少由4个小立方块组成。",
    acceptedAnswers: ["最少由4个小立方块组成。", "4个"],
    explanationZhHans: "要让正面和左面各有两列且每列都达到2层，至少需要两摞2层高的小立方块。把这两摞放在2×2底面网格中互为对角的位置，每个视图的两列都能看到2层，总数为2+2=4。少于4个无法同时形成两摞2层高的立方块，因此最少为4个。",
    explanationEn: "Each of the two columns in both projections must reach height 2, so at least two stacks of height 2 are needed. Placing these stacks at diagonally opposite cells of a 2-by-2 footprint makes both the front and left views full 2-by-2 grids. Thus the minimum is 2+2=4 cubes."
  },
  "bnu-junior-ds-v1-s3-237": {
    promptZhHans: "一个由相同小立方块搭成的几何体，其正面和上面视图如下：\n正面看：第一层有3个正方形并排，第二层中间有1个正方形；\n上面看：前排有3个正方形，后排中间有1个正方形。\n第二层实际只有1个小立方块，位于中间列某个底层小立方块的正上方。每个小立方块的棱长为1 cm，求该几何体的表面积（含底面）。",
    promptEn: "A solid is built from identical cubes. In the front view, the first layer has three adjacent squares and the second layer has one square in the middle. In the top view, the front row has three squares and the back row has one square in the middle. There is exactly one cube in the second layer, directly above a middle-column base cube. Each cube has edge length 1 cm. Find the total surface area, including the base.",
    answer: "22 cm²",
    acceptedAnswers: ["22 cm²", "22cm²", "22平方厘米", "22"],
    explanationZhHans: "俯视图给出4个底层小立方块，第二层实际只有1个，所以共有5个。底层相邻面有3对，上下相邻面有1对，共4对接触面。表面积为5×6-4×2=22 cm²。",
    explanationEn: "The top view gives four base cubes, and there is exactly one cube in the second layer, for five cubes total. There are three face contacts in the base and one vertical contact. Hence the surface area is 5*6-4*2=22 square centimetres."
  },
  "bnu-junior-ds-v1-s3-238": {
    promptZhHans: "一个几何体由若干相同小立方块按竖直列搭成。从正面看有3列，各列最高层数从左到右为2、1、2；从左面看有2列，各列最高层数从前到后为2、2。俯视底面位置允许为空，只要求所有非空竖直列满足上述两个投影，不额外要求非空位置连成一片。若小立方块总数最少为n、最多为m，则m-n的值是（ ）。",
    promptEn: "A configuration consists of vertical stacks of identical cubes. Its front-view maximum heights are 2, 1, and 2, and its left-view maximum heights are 2 and 2. Cells in the top-view footprint may be empty; only the two projections must be satisfied, and occupied cells need not form one connected component. If the minimum number of cubes is n and the maximum is m, find m-n.",
    optionsZhHans: ["2", "3", "4", "5"],
    optionsEn: ["2", "3", "4", "5"],
    answer: "5",
    acceptedAnswers: ["5", "D", "第4项"],
    explanationZhHans: "最少时可取两排高度矩阵[2,1,0]和[0,0,2]，总数为5，且两个投影分别为[2,1,2]和[2,2]。最多时每排都取[2,1,2]，总数为10。因此m-n=10-5=5，选第4项。",
    explanationEn: "For the minimum, use height rows [2,1,0] and [0,0,2], totaling 5 while preserving both projections. For the maximum, both rows can be [2,1,2], totaling 10. Therefore m-n=10-5=5, the fourth option."
  },
  "bnu-junior-ds-v1-s3-239": {
    promptZhHans: "一个几何体由若干个相同的小立方块按竖直列搭成。从正面看有3列，各列最高层数从左到右为2、1、2；从左面看有2列，最高层数从前到后为2、1。从上面看，底面布局为2行3列，前排和后排的每个位置都有小立方块。求小立方块总数，并写出前排第一列的层数。",
    promptEn: "A solid is built from vertical stacks of identical cubes. Its front-view maximum heights are 2, 1, and 2 from left to right, and its left-view maximum heights are 2 for the front row and 1 for the back row. The top-view footprint is a 2-by-3 grid with every front-row and back-row cell occupied. Find the total number of cubes and the height of the front-row, first-column stack.",
    answer: "总个数为8，第一排第一列有2层。",
    acceptedAnswers: ["总个数为8，第一排第一列有2层。", "共8个，前排第一列2层"],
    explanationZhHans: "后排最高层数为1且3个位置都非空，所以后排为[1,1,1]。正面最高层数为[2,1,2]，故前排为[2,1,2]。总数为2+1+2+1+1+1=8，前排第一列有2层。",
    explanationEn: "The back-row maximum is 1 and all three cells are occupied, so the back row is [1,1,1]. The front-view maxima force the front row to be [2,1,2]. Thus the total is 2+1+2+1+1+1=8, and the front-row first column has height 2."
  },
  "bnu-junior-ds-v1-s3-241": {
    promptZhHans: "一个几何体由若干个相同的小立方块按竖直列搭成。从正面看有3列，各列最高层数从左到右分别为2、3、1；从左面看有2列，各列最高层数从前到后分别为2、3。俯视底面位置允许为空，只要求满足这两个投影。搭成这个几何体所用小立方块的个数不可能是（ ）。",
    promptEn: "A configuration consists of vertical stacks of identical cubes. Its front-view maximum heights are 2, 3, and 1, while its left-view maximum heights are 2 and 3. Cells in the top-view footprint may be empty; only these projections must be satisfied. Which total number of cubes is impossible?",
    optionsZhHans: ["6", "7", "8", "12"],
    optionsEn: ["6", "7", "8", "12"],
    answer: "12",
    acceptedAnswers: ["12", "D", "第4项"],
    explanationZhHans: "最少时可取两排高度矩阵[2,0,1]和[0,3,0]，总数为6；在不改变投影最高层数的前提下增加方块，可得到7个或8个。每个位置的高度不超过对应正面列高与左面列高的较小值，所以最大总数为(2+2+1)+(2+3+1)=11。故12个不可能，选第4项。",
    explanationEn: "A minimum arrangement is [2,0,1] and [0,3,0], totaling 6; adding cubes within the same projection bounds gives totals of 7 or 8. Each cell is bounded by the smaller of its front-view and left-view heights, so the maximum total is (2+2+1)+(2+3+1)=11. Therefore 12 is impossible, the fourth option."
  },
  "bnu-junior-ds-v1-s3-248": {
    promptZhHans: "一个正六棱柱的底面边长为2 cm，高为5 cm。规定底面上一条连接相对顶点的长对角线与从正前方观察时的画面水平方向平行；从正上方观察得到俯视图，从正左方观察得到左视图。请描述主视图、俯视图和左视图的形状，并写出各视图中的尺寸。",
    promptEn: "A right regular hexagonal prism has base side length 2 cm and height 5 cm. A long diagonal joining opposite base vertices is parallel to the horizontal direction in the front-view image. Describe the front, top, and left views and give their dimensions.",
    answer: "主视图是5 cm×4 cm的矩形；俯视图是边长2 cm的正六边形；左视图是5 cm×2√3 cm的矩形。",
    acceptedAnswers: [
      "主视图是5 cm×4 cm的矩形；俯视图是边长2 cm的正六边形；左视图是5 cm×2√3 cm的矩形。",
      "主视图：5cm×4cm矩形；俯视图：边长2cm的正六边形；左视图：5cm×2√3cm矩形"
    ],
    explanationZhHans: "正六边形边长为2 cm，其外接圆半径为2 cm，所以连接相对顶点的长对角线即外接圆直径为4 cm；对边距离为2√3 cm。长对角线沿主视图画面水平方向，故主视图是5 cm×4 cm矩形；左视图是5 cm×2√3 cm矩形；俯视图仍是边长2 cm的正六边形。",
    explanationEn: "A regular hexagon of side 2 cm has circumradius 2 cm, so its long diagonal is the 4 cm circumdiameter, while the distance between opposite sides is 2*sqrt(3) cm. The long diagonal is horizontal in the front image, giving a 5 by 4 cm front rectangle and a 5 by 2*sqrt(3) cm left rectangle. The top view is the regular hexagon."
  },
  "bnu-junior-ds-v1-s3-302": {
    promptZhHans: "某测量小组在河岸边选取相距30米的A、B两点测量塔高。A、B与塔底C在同一水平面内，∠CAB=30°，∠CBA=60°。在A点测得塔顶D的仰角为30°，在B点测得塔顶D的仰角为45°，塔身CD垂直于地面。求塔高CD。",
    promptEn: "Two observation points A and B are 30 metres apart. The tower base C lies in the same horizontal plane, with angle CAB=30 degrees and angle CBA=60 degrees. The angles of elevation to the tower top D are 30 degrees from A and 45 degrees from B, and CD is vertical. Find CD.",
    answer: "15米",
    acceptedAnswers: ["15米", "15 m", "15 meters", "15"],
    explanationZhHans: "在△ABC中，∠CAB=30°，∠CBA=60°，所以∠ACB=90°。AB=30米为斜边，故AC=15√3米，BC=15米。由A点仰角30°得CD=AC·tan30°=15米；由B点仰角45°也得CD=BC·tan45°=15米。因此塔高CD=15米。",
    explanationEn: "Triangle ABC is a 30-60-90 triangle with hypotenuse AB=30, so AC=15*sqrt(3) and BC=15. From A, CD=AC*tan(30 degrees)=15; from B, CD=BC*tan(45 degrees)=15. Thus the tower is 15 metres high."
  },
  "bnu-junior-ds-v1-s3-324": {
    promptEn: "From point C due east of a vertical building, the angle of elevation to its top is 60 degrees. After moving 20 metres farther east to D, the angle is 45 degrees. The building base B, C, and D are collinear on level ground. Find the building height in exact form.",
    answer: "30 + 10√3 米",
    acceptedAnswers: ["30 + 10√3 米", "(30+10√3)米", "30+10√3米"],
    explanationZhHans: "设AB=h米，则BC=h/tan60°=h/√3，BD=h/tan45°=h。因为D比C离建筑物远20米，所以h-h/√3=20。解得h=20√3/(√3-1)=10√3(√3+1)=30+10√3。因此AB=30+10√3米。",
    explanationEn: "Let the height be h. Then BC=h/sqrt(3) and BD=h. Since D is 20 metres farther from the building, h-h/sqrt(3)=20. Hence h=20*sqrt(3)/(sqrt(3)-1)=30+10*sqrt(3) metres."
  },
  "bnu-junior-ds-v1-s3-327": {
    promptZhHans: "某数学兴趣小组测量一座古塔的高度。塔底为O，他们在塔正东方向的点A测得塔顶仰角为60°，随后从A向正西走30米，越过塔底所在位置，到达塔西侧的点B，在B点测得塔顶仰角为45°。点A、O、B在同一水平直线上，测角仪高度忽略不计。求古塔高度。",
    promptEn: "A group measures a tower with base O. From point A due east of the tower, the angle of elevation is 60 degrees. They then walk 30 metres west, pass the tower base, and reach point B on the west side, where the angle is 45 degrees. A, O, and B are collinear on level ground. Find the tower height.",
    answer: "15(3-√3)米",
    acceptedAnswers: ["15(3-√3)米", "45-15√3米", "15(3-√3)"],
    explanationZhHans: "设塔高为h米。由A点仰角60°得OA=h/√3；由B点仰角45°得OB=h。O位于A、B之间，所以OA+OB=30，即h/√3+h=30。解得h=30√3/(√3+1)=45-15√3=15(3-√3)米。",
    explanationEn: "Let the height be h. The 60-degree observation gives OA=h/sqrt(3), and the 45-degree observation gives OB=h. Since O lies between A and B, OA+OB=30. Solving h/sqrt(3)+h=30 gives h=15(3-sqrt(3)) metres."
  },
  "bnu-junior-ds-v1-s3-344": {
    promptZhHans: "在水平地面上，A、B两点相距30米，C点处竖直安装标杆CD。地面三角形ABC满足∠CAB=30°，∠CBA=60°。从A点观察杆顶D的仰角为30°，从B点观察杆顶D的仰角为45°。求标杆高度CD。",
    promptEn: "Points A and B are 30 metres apart on level ground, and a vertical pole CD stands at C. Triangle ABC has angle CAB=30 degrees and angle CBA=60 degrees. The angles of elevation to D are 30 degrees from A and 45 degrees from B. Find the pole height CD.",
    answer: "15米",
    acceptedAnswers: ["15米", "15 m", "15 meters", "15"],
    explanationZhHans: "∠CAB=30°、∠CBA=60°，所以∠ACB=90°。在斜边AB=30米的30°-60°-90°三角形中，AC=15√3米，BC=15米。于是CD=AC·tan30°=15米，同时CD=BC·tan45°=15米。故标杆高度CD=15米。",
    explanationEn: "Since angles A and B are 30 and 60 degrees, angle C is 90 degrees. With hypotenuse AB=30, AC=15*sqrt(3) and BC=15. Therefore CD=AC*tan(30 degrees)=15, also agreeing with BC*tan(45 degrees)=15."
  }
};

const allReviewedCorrections: Record<string, ReviewedBnuJuniorCorrection> = {
  ...reviewedCorrections,
  ...remainingA18S1ReviewedCorrections,
  ...remainingA18S2ReviewedCorrections,
  ...remainingA18S3ReviewedCorrections
};

function applyReviewedBnuJuniorCorrection(question: GeneratedBnuJuniorQuestion): GeneratedBnuJuniorQuestion {
  const correction = allReviewedCorrections[question.id];
  const supplementalAliases = supplementalAcceptedAnswerCorrections[question.id];
  if (!correction && !supplementalAliases) return question;

  let reviewedQuestion = question;
  if (correction) {
    const { promptEn: _promptEn, optionsEn: _optionsEn, explanationEn: _explanationEn, ...contentCorrection } = correction;
    reviewedQuestion = { ...question, ...contentCorrection };
  }
  if (!supplementalAliases) return reviewedQuestion;

  return {
    ...reviewedQuestion,
    acceptedAnswers: Array.from(new Set([...(reviewedQuestion.acceptedAnswers ?? []), ...supplementalAliases]))
  };
}

const reviewedQuestionRows = questionPack.questions.map(applyReviewedBnuJuniorCorrection);

function toPolishedTraditionalBnuJuniorText(value: string) {
  return toTraditionalHjbText(value)
    .replace(/隻(?=有|能|可)/gu, "只")
    .replace(/若幹/gu, "若干")
    .replace(/纵/gu, "縱")
    .replace(/併且/gu, "並且");
}

function localizeBnuJuniorGeneratedText(value: string, englishOverride?: string) {
  const zhHans = toSafeMainlandSimplifiedText(stripHjbGeneratorPromptPrefix(value));
  return {
    en: englishOverride ?? chinaLessonEnglishTranslation(zhHans) ?? zhHans,
    zh: toPolishedTraditionalBnuJuniorText(zhHans),
    zhHans
  };
}

function localizedMainlandBnuJuniorAcceptedAnswers(question: GeneratedBnuJuniorQuestion) {
  const exactAliases = exactRuntimeAcceptedAnswerCorrections[question.id];
  if (exactAliases) return [...exactAliases];

  const aliases = [question.answer, ...(question.acceptedAnswers ?? [])].flatMap((alias) => {
    const zhHans = toSafeMainlandSimplifiedText(alias);
    const validatedEnglishAlias = chinaLessonEnglishTranslation(zhHans);
    return [
      zhHans,
      toPolishedTraditionalBnuJuniorText(zhHans),
      ...(validatedEnglishAlias ? [validatedEnglishAlias] : [])
    ];
  });
  return Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean)));
}

function toQuestion(question: GeneratedBnuJuniorQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU junior topic for ${question.topicId}`);
  const correction = allReviewedCorrections[question.id];

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuJuniorProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizeBnuJuniorGeneratedText(question.promptZhHans, correction?.promptEn),
    options: question.type === "multiple-choice"
      ? question.optionsZhHans.map((option, index) => localizeBnuJuniorGeneratedText(option, correction?.optionsEn?.[index]))
      : undefined,
    answer: question.answer,
    acceptedAnswers: localizedMainlandBnuJuniorAcceptedAnswers(question),
    explanation: localizeBnuJuniorGeneratedText(question.explanationZhHans, correction?.explanationEn)
  };
}

export const mainlandBnuJuniorQuestionGenerationMetadata: Record<string, MainlandBnuJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    reviewedQuestionRows.map((question) => [
      question.id,
      {
        batch: "bnu-junior-v1-1500" as const,
        grade: question.grade,
        semester: question.semester,
        topicId: question.topicId,
        volume: question.volume,
        unitTitle: question.unitTitle,
        type: question.type,
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        assessmentPatternCardIds: question.assessmentPatternCardIds,
        zhongkaoPatternCardIds: question.zhongkaoPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandBnuJuniorAnswer(question: Question) {
  return mainlandBnuJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandBnuJuniorQuestions: Question[] = reviewedQuestionRows.map(toQuestion);
