import questionPackJson from "./generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json";
import {
  localizedHjbGeneratedAcceptedAnswers,
  localizeHjbGeneratedText,
  stripHjbGeneratorPromptPrefix
} from "./hjbQuestionLocalization";
import { mainlandHjbJuniorTopics } from "./mainlandHjbJuniorTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  Difficulty,
  DifficultyRecord,
  LocalizedText,
  MainlandHjbJuniorGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type MainlandHjbJuniorGeneratedBatch = "hjb-junior-v2-1500";

type GeneratedHjbJuniorQuestion = {
  id: string;
  batch: "hjb-junior-v2";
  grade: MainlandHjbJuniorGradeId;
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
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
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

type GeneratedHjbJuniorQuestionPack = {
  questions: GeneratedHjbJuniorQuestion[];
};

type ReviewedHjbJuniorCorrection = Partial<Pick<
  GeneratedHjbJuniorQuestion,
  "type" | "promptZhHans" | "optionsZhHans" | "answer" | "acceptedAnswers" | "explanationZhHans"
>>;

export type MainlandHjbJuniorQuestionGenerationMetadata = {
  batch: MainlandHjbJuniorGeneratedBatch;
  grade: MainlandHjbJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedHjbJuniorQuestionPack;
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbJuniorTopics.map((topic) => [topic.id, topic]));

const reviewedCorrections: Record<string, ReviewedHjbJuniorCorrection> = {
  "hjb-junior-ds-v2-s1-012": {
    answer: "11x²y",
    acceptedAnswers: ["11x²y", "11x^2y"],
    explanationZhHans: "先化简中括号：3xy²-(2x²y+xy²)-5x²y=2xy²-7x²y。原式=4x²y-(2xy²-7x²y)+2xy²=11x²y，两个xy²项恰好抵消。"
  },
  "hjb-junior-ds-v2-s1-096": {
    answer: "商式为2x²-x-3，余式为-6",
    acceptedAnswers: [
      "商式为2x²-x-3，余式为-6",
      "商式2x^2-x-3，余式-6",
      "商为2x²-x-3，余数为-6"
    ],
    explanationZhHans: "先算A+2B=2x³-3x²-2x-3。用综合除法除以x-1，系数2，-3，-2，-3依次得到商的系数2，-1，-3，余数-6，所以商式为2x²-x-3，余式为-6。"
  },
  "hjb-junior-ds-v2-s1-342": {
    promptZhHans: "在同一平面内，直线AB与直线CD相交于点O，且∠AOC=40°。过点O作射线OE，使得∠COE=60°，且射线OA、OE位于直线CD两侧。求∠AOE的度数。",
    answer: "100°",
    acceptedAnswers: ["100°", "100度", "100"],
    explanationZhHans: "射线OA、OE位于直线CD两侧，因此∠AOC与∠COE是∠AOE的两个相邻部分。∠AOE=∠AOC+∠COE=40°+60°=100°。"
  },
  "hjb-junior-ds-v2-s1-367": {
    optionsZhHans: ["90°", "118°", "152°", "28°"],
    answer: "152°",
    acceptedAnswers: ["152°", "152", "C"],
    explanationZhHans: "射线OC与OD互为反向射线，所以∠COE与∠DOE互补。∠COE=180°-28°=152°，第三项正确。"
  },
  "hjb-junior-ds-v2-s2-129": {
    promptZhHans: "某商店销售一种商品，每件进价为30元。售价为每件50元时，每月可售出200件；售价每降低1元，每月可多售出10件。设每件售价降低x元（x为非负整数，且0≤x≤20），每月利润为y元。（1）求y关于x的函数关系式，并写出x的取值范围；（2）当x为何值时，y有最大值？最大值是多少？（3）若商店希望每月利润不低于2160元，请写出x的取值范围。",
    answer: "（1）y=4000-10x²，0≤x≤20且x为整数；（2）x=0时，最大利润为4000元；（3）0≤x≤13且x为整数",
    acceptedAnswers: [
      "（1）y=4000-10x²，0≤x≤20且x为整数；（2）x=0时，最大利润为4000元；（3）0≤x≤13且x为整数",
      "(1)y=4000-10x^2,0<=x<=20且x为整数;(2)x=0时最大利润4000元;(3)0<=x<=13且x为整数"
    ],
    explanationZhHans: "降价x元后，单件利润为20-x元，销量为200+10x件，所以y=(20-x)(200+10x)=4000-10x²。由于x为非负整数且0≤x≤20，y随x增大而减小，故x=0时最大利润为4000元。由4000-10x²≥2160得x²≤184，结合取值范围可得0≤x≤13且x为整数。"
  },
  "hjb-junior-ds-v2-s2-186": {
    answer: "（1）Δ=1>0，方程总有两个不相等的实数根；（2）k=(-1±√13)/2",
    acceptedAnswers: [
      "（1）Δ=1>0，方程总有两个不相等的实数根；（2）k=(-1±√13)/2",
      "(1)Δ=1>0，方程恒有两个不等实根；(2)k=(-1±√13)/2"
    ],
    explanationZhHans: "（1）判别式Δ=(2k+1)²-4(k²+k)=1>0，所以对任意实数k，方程总有两个不相等的实数根。（2）由根与系数的关系，α+β=2k+1，αβ=k²+k。于是α²+β²=(α+β)²-2αβ=2k²+2k+1=7，解得k=(-1±√13)/2。"
  },
  "hjb-junior-ds-v2-s2-198": {
    answer: "DE=DF，因为角平分线上的点到角两边的距离相等；DE=DF=84/11",
    acceptedAnswers: [
      "DE=DF，因为角平分线上的点到角两边的距离相等；DE=DF=84/11",
      "由角平分线上的点到两边距离相等得DE=DF；DE=DF=84/11"
    ],
    explanationZhHans: "因为D在∠BAC的平分线上，且DE、DF分别垂直于角的两边，所以DE=DF。三角形三边为13、20、21，半周长为27，由海伦公式得面积为√(27×14×7×6)=126。又126=(1/2)×13×DE+(1/2)×20×DF=(33/2)DE，所以DE=DF=84/11。"
  },
  "hjb-junior-ds-v2-s2-240": {
    answer: "3",
    acceptedAnswers: ["3", "DE=3"],
    explanationZhHans: "由勾股定理得AB=10。角平分线定理给出BD∶DC=AB∶AC=10∶6=5∶3，而BC=8，所以DC=3。由于BC⊥AC，DC就是点D到AC的距离；D在∠BAC的平分线上，到AB与AC的距离相等，因此DE=DC=3。"
  },
  "hjb-junior-ds-v2-s2-401": {
    promptZhHans: "某快递公司收费标准如下：每件包裹首重1千克收费10元，续重每千克收费4元（不足1千克按1千克计算）。设x为按上述规则取整后的计费重量，其中x为正整数且x≥1，总费用为y元。写出y关于x的函数解析式。",
    answer: "y=4x+6",
    acceptedAnswers: ["y=4x+6", "y=6+4x", "y = 4x + 6"],
    explanationZhHans: "x已经表示按规则取整后的计费重量，且为不小于1的正整数。超过首重的计费重量为x-1千克，续重费用为4(x-1)元，因此y=10+4(x-1)=4x+6。"
  },
  "hjb-junior-ds-v2-s3-028": {
    optionsZhHans: ["a∶b=c∶d", "a∶c=d∶b", "a∶d=b∶c", "b∶c=a∶d"],
    answer: "a∶b=c∶d",
    acceptedAnswers: ["a∶b=c∶d", "A"],
    explanationZhHans: "a∶b=4∶9，而c∶d=6∶13.5=4∶9，所以第一项成立。其余三个比例式的两边比值均不相等。"
  },
  "hjb-junior-ds-v2-s3-062": {
    acceptedAnswers: ["①②③", "①,②,③", "①，②，③", "① ② ③"]
  },
  "hjb-junior-ds-v2-s3-177": {
    promptZhHans: "某商品每件进价40元，售价60元时每月可售出200件。售价每提高1元，月销量减少5件。设售价为x元（60≤x≤100），月利润为y元。（1）求y关于x的函数解析式；（2）售价定为多少元时，月利润最大？最大月利润是多少？",
    answer: "（1）y=-5x²+700x-20000；（2）售价70元时，最大月利润为4500元",
    acceptedAnswers: [
      "（1）y=-5x²+700x-20000；（2）售价70元时，最大月利润为4500元",
      "(1)y=-5x^2+700x-20000;(2)售价70元，最大月利润4500元"
    ],
    explanationZhHans: "售价为x元时，销量为200-5(x-60)=500-5x，故y=(x-40)(500-5x)=-5x²+700x-20000=-5(x-70)²+4500。在60≤x≤100内，x=70时月利润最大，为4500元。"
  },
  "hjb-junior-ds-v2-s3-192": {
    answer: "（1）y=-10x²+100x+2000；（2）降价5元时，最大日利润为2250元",
    acceptedAnswers: [
      "（1）y=-10x²+100x+2000；（2）降价5元时，最大日利润为2250元",
      "(1)y=-10x^2+100x+2000;(2)降价5元，最大日利润2250元"
    ],
    explanationZhHans: "降价x元后，单件利润为20-x元，每天销量为100+10x件，所以y=(20-x)(100+10x)=-10x²+100x+2000=-10(x-5)²+2250。因此降价5元时，每天总利润最大，为2250元。"
  },
  "hjb-junior-ds-v2-s3-198": {
    answer: "（1）y=-5x²+700x-20000，60≤x≤100；（2）售价70元时，最大月利润为4500元",
    acceptedAnswers: [
      "（1）y=-5x²+700x-20000，60≤x≤100；（2）售价70元时，最大月利润为4500元",
      "(1)y=-5x^2+700x-20000,60<=x<=100;(2)售价70元，最大月利润4500元"
    ],
    explanationZhHans: "售价为x元时，销量为200-5(x-60)=500-5x，故y=(x-40)(500-5x)=-5x²+700x-20000。由x≥60且销量不为负得60≤x≤100。配方为y=-5(x-70)²+4500，因此售价70元时最大月利润为4500元。"
  },
  "hjb-junior-ds-v2-s3-201": {
    answer: "（1）顶点为(-3,8)，对称轴为x=-3；（2）y=-2(x-2)²+6；（3）最大值为6，最小值为-12",
    acceptedAnswers: [
      "（1）顶点为(-3,8)，对称轴为x=-3；（2）y=-2(x-2)²+6；（3）最大值为6，最小值为-12",
      "(1)顶点(-3,8),对称轴x=-3;(2)y=-2(x-2)^2+6;(3)最大值6,最小值-12"
    ],
    explanationZhHans: "原函数顶点为(-3,8)，对称轴为x=-3。向右平移5个单位再向下平移2个单位，得y=-2(x-2)²+6。在-1≤x≤2上，x=2时取得最大值6；离对称轴最远的端点x=-1处取得最小值-12。"
  },
  "hjb-junior-ds-v2-s3-235": {
    optionsZhHans: [
      "A. 图像的开口向上",
      "B. 当 x < 1 时，y 随 x 的增大而增大",
      "C. 图像的顶点坐标为 (-1, 4)",
      "D. 图像与 x 轴没有交点"
    ],
    answer: "B. 当 x < 1 时，y 随 x 的增大而增大",
    acceptedAnswers: ["B. 当 x < 1 时，y 随 x 的增大而增大", "B"],
    explanationZhHans: "y=-x²+2x+3=-(x-1)²+4，图像开口向下，顶点为(1,4)，并与x轴有两个交点。对称轴左侧即x<1时，y随x增大而增大，所以只有B正确。"
  },
  "hjb-junior-ds-v2-s3-321": {
    answer: "圆心为(3,7/2)，因为它是AB与AC的中垂线交点",
    acceptedAnswers: [
      "圆心为(3,7/2)，因为它是AB与AC的中垂线交点",
      "圆心(3,7/2)，为AB和AC的中垂线交点"
    ],
    explanationZhHans: "AB的中点为(3,2)，所以AB的中垂线是x=3。设圆心为(3,y)，由它到A、C距离相等，得4+(y-2)²=(y-6)²，解得y=7/2。因此外接圆圆心为(3,7/2)，即两边中垂线的交点。"
  },
  "hjb-junior-ds-v2-s3-363": {
    promptZhHans: "已知⊙O的半径为5 cm，点P在直线l上，且OP=5 cm、OP⊥l。判断直线l与⊙O的位置关系，并说明理由。",
    answer: "相切",
    acceptedAnswers: ["相切", "直线l与⊙O相切", "l与⊙O相切"],
    explanationZhHans: "因为OP⊥l，所以OP就是圆心O到直线l的距离。该距离等于5 cm，恰好等于圆的半径，因此直线l与⊙O相切。"
  },
  "hjb-junior-ds-v2-s3-367": {
    optionsZhHans: ["5", "4", "3", "6"],
    answer: "3",
    acceptedAnswers: ["3", "C"],
    explanationZhHans: "直线与半径为4 cm的圆有两个公共点，当且仅当圆心到直线的距离d<4。四个选项中只有3满足，所以第三项正确。"
  },
  "hjb-junior-ds-v2-s3-387": {
    answer: "3",
    acceptedAnswers: ["3"],
    explanationZhHans: "半径垂直平分弦AB。AB=8，所以半弦长为4，圆心O到AB的距离为√(5²-4²)=3。另一条弦CD只用于说明两条弦位于圆心两侧；它不改变所问的O到AB的距离。"
  },
  "hjb-junior-ds-v2-s3-447": {
    promptZhHans: "某校九年级（2）班22名学生参加数学测验，成绩（单位：分）如下：68, 72, 76, 70, 68, 74, 72, 76, 70, 72, 74, 68, 76, 72, 70, 74, 68, 72, 76, 70, 74, 72。这组数据的方差是______（保留两位小数）。",
    answer: "7.27",
    acceptedAnswers: ["7.27"],
    explanationZhHans: "数据中68、70、72、74、76分别出现4、4、6、4、4次，总和为1584，平均数为72。总体方差=[4×(68-72)²+4×(70-72)²+6×(72-72)²+4×(74-72)²+4×(76-72)²]÷22=160÷22=80/11≈7.27。"
  },
  "hjb-junior-ds-v2-s1-324": {
    acceptedAnswers: [
      "65°，依据：两直线平行，内错角相等。",
      "65°，两直线平行，内错角相等"
    ]
  },
  "hjb-junior-ds-v2-s1-368": {
    acceptedAnswers: [
      "平行；同旁内角互补，两直线平行",
      "平行；同旁内角互补"
    ]
  },
  "hjb-junior-ds-v2-s3-072": {
    acceptedAnswers: [
      "不相似，因为AD/AB=3/8，AE/AC=2/6=1/3，两边成比例但夹角不一定相等，且第三边不成比例，故不满足相似条件。"
    ]
  },
  "hjb-junior-ds-v2-s3-082": {
    promptZhHans: "在△ABC和△DEF中，已知∠B=∠E=60°，AB=6，DE=9，BC=8。要使△ABC∽△DEF，还需满足哪个条件？",
    optionsZhHans: ["AC=12", "EF=12", "DF=12", "∠C=70°"],
    answer: "EF=12",
    acceptedAnswers: ["EF=12", "EF = 12"],
    explanationZhHans: "AB/DE=6/9=2/3。若EF=12，则BC/EF=8/12=2/3；又有夹角∠B=∠E=60°，所以由两边成比例且夹角相等可判定△ABC∽△DEF。其余条件不能与已知条件组成这一相似判定。"
  },
  "hjb-junior-ds-v2-s3-124": {
    promptZhHans: "在Rt△ABC中，∠C=90°，AB=5，BC=3。下列等式正确的是（ ）。",
    optionsZhHans: ["sinA=3/5", "cosA=3/5", "tanA=4/3", "sinB=3/5"],
    answer: "sinA=3/5",
    acceptedAnswers: ["sinA=3/5", "sinA = 3/5"],
    explanationZhHans: "由勾股定理得AC=4。对∠A而言，对边BC=3、邻边AC=4、斜边AB=5，所以sinA=3/5、cosA=4/5、tanA=3/4；同时sinB=AC/AB=4/5。因此修改后的选项中只有sinA=3/5正确。"
  },
  "hjb-junior-ds-v2-s1-103": {
    promptZhHans: "把各选项右边的乘积展开后，哪一个等式成立？"
  },
  "hjb-junior-ds-v2-s1-106": {
    optionsZhHans: [
      "\\(6a^2b^2(2a - 3b + 1)\\)",
      "\\(-6a^2b^2(2a - 3b + 1)\\)",
      "\\(6a^2b^2(-2a + 3b)\\)",
      "\\(-6a^2b^2(2a - 3b)\\)"
    ],
    explanationZhHans: "提取公因式\\(-6a^2b^2\\)，得\\(-12a^3b^2 + 18a^2b^3 - 6a^2b^2 = -6a^2b^2(2a - 3b + 1)\\)。A的整体符号错误，C和D漏掉常数项。"
  },
  "hjb-junior-ds-v2-s1-109": {
    optionsZhHans: ["A. -2x(x - 4)", "B. 2x(x + 4)", "C. -2x(x + 4)", "D. 2x(x - 4)"],
    explanationZhHans: "提取公因式-2x，得-2x²+8x=-2x(x-4)。把A展开可还原原式，其余选项展开后一次项或二次项的符号不符。"
  },
  "hjb-junior-ds-v2-s1-061": {
    promptZhHans: "计算6a⁸÷(2a³)的结果是（ ）。",
    optionsZhHans: ["A. 3a⁵", "B. 3a¹¹", "C. 4a⁵", "D. 3a²⁴"],
    answer: "3a⁵",
    acceptedAnswers: ["3a⁵", "3a^5", "A. 3a⁵", "A"],
    explanationZhHans: "系数相除得6÷2=3；同底数幂相除，底数不变、指数相减，a⁸÷a³=a⁵，所以结果是3a⁵。"
  },
  "hjb-junior-ds-v2-s1-252": {
    promptZhHans: "某校有240名七年级学生参加春游，计划共租5辆客车。45座客车每辆250元，60座客车每辆300元。若要使每位学生都有座位，且总租车费用不超过1400元，最多可以租用多少辆60座客车？",
    answer: "3",
    acceptedAnswers: ["3", "3辆"],
    explanationZhHans: "设租60座客车a辆，则租45座客车(5-a)辆。座位数满足60a+45(5-a)≥240，得a≥1；费用满足300a+250(5-a)≤1400，得a≤3。a为整数，所以最多租3辆60座客车。"
  },
  "hjb-junior-ds-v2-s1-251": {
    promptZhHans: "解不等式2x-5<3x+1，求它的解集。"
  },
  "hjb-junior-ds-v2-s1-316": {
    promptZhHans: "直线AB与CD相交于点O，若∠AOC=70°，则∠AOD的度数为（ ）。",
    optionsZhHans: ["A. 35°", "B. 70°", "C. 110°", "D. 140°"],
    answer: "110°",
    acceptedAnswers: ["110°", "110", "110度"],
    explanationZhHans: "∠AOC与∠AOD组成邻补角，和为180°，所以∠AOD=180°-70°=110°。"
  },
  "hjb-junior-ds-v2-s1-318": {
    promptZhHans: "已知直线l₁∥l₂，直线l₃与它们相交。若一组同旁内角∠1=65°，求另一个同旁内角∠2的度数，并说明理由。",
    answer: "∠2=115°，因为两直线平行，同旁内角互补。",
    acceptedAnswers: [
      "∠2=115°，因为两直线平行，同旁内角互补。",
      "180°-65°=115°；两直线平行，同旁内角互补。"
    ],
    explanationZhHans: "两条平行线被第三条直线所截，同旁内角互补，所以∠1+∠2=180°。因此∠2=180°-65°=115°。"
  },
  "hjb-junior-ds-v2-s1-442": {
    optionsZhHans: ["A. AD=BD", "B. AD∥BC", "C. BD=CD", "D. ∠B=∠BAD"],
    explanationZhHans: "等腰三角形顶角的角平分线也是底边上的中线和高，所以BD=CD且AD⊥BC。四个选项中只有C一定正确。"
  },
  "hjb-junior-ds-v2-s2-197": {
    promptZhHans: "利用勾股定理计算：一个直角三角形的两条直角边分别为6和8，斜边长为______。"
  },
  "hjb-junior-ds-v2-s2-065": {
    promptZhHans: "计算√12×√3，结果是______。",
    answer: "6",
    acceptedAnswers: ["6"],
    explanationZhHans: "√12×√3=√36=6；也可以先把√12化成2√3，再算2√3×√3=6。"
  },
  "hjb-junior-ds-v2-s2-253": {
    promptZhHans: "从边、角和对角线的性质判断：下列哪一项是每个平行四边形都具有的？"
  },
  "hjb-junior-ds-v2-s2-441": {
    promptZhHans: "已知反比例函数 y = k/x 的图像经过点A(2, -3)。当x=-6时，求y的值。",
    answer: "1",
    acceptedAnswers: ["1", "y=1", "y = 1"],
    explanationZhHans: "把A(2,-3)代入y=k/x，得k=2×(-3)=-6。因此y=-6/x；当x=-6时，y=(-6)÷(-6)=1。"
  },
  "hjb-junior-ds-v2-s2-315": {
    answer: "平移向量为(-2,-5)，所以B'(-1-2,1-5)=(-3,-4)。",
    acceptedAnswers: [
      "平移向量为(-2,-5)，所以B'(-1-2,1-5)=(-3,-4)。",
      "A到A'的平移向量是(-2,-5)，B'为(-3,-4)。"
    ],
    explanationZhHans: "由A(2,3)到A'(0,-2)，横坐标减少2、纵坐标减少5，平移向量为(-2,-5)。把同一向量作用于B(-1,1)，得B'(-1-2,1-5)=(-3,-4)。"
  },
  "hjb-junior-ds-v2-s3-088": {
    promptZhHans: "数学兴趣小组用测角仪测量旗杆高度。旗杆顶端为A、底端为B，测角仪顶端为C；过C作水平线交旗杆AB于D。已知CD=24米，∠ACD=35°。若要计算旗杆高出测角仪水平线的部分AD，应使用哪个三角比？",
    optionsZhHans: ["A. sin35°", "B. cos35°", "C. tan35°", "D. cot35°"],
    explanationZhHans: "在直角三角形ACD中，相对于∠ACD=35°，AD是对边，CD是邻边，因此tan35°=AD/CD，AD=24·tan35°。若继续求旗杆总高，还要加上测角仪顶端C离地面的高度。"
  },
  "hjb-junior-ds-v2-s3-004": {
    promptZhHans: "根据相似三角形对应边成比例，若△ABC∽△DEF，AB:DE=2:3，且AB=8，则DE=（ ）。"
  },
  "hjb-junior-ds-v2-s3-093": {
    promptZhHans: "小明站在离教学楼底部20米处，眼睛离地1.6米，测得楼顶的仰角为45°。已知地面水平、教学楼垂直于地面，求教学楼的高度。",
    answer: "21.6米",
    acceptedAnswers: ["21.6米", "21.6", "21.6 m"],
    explanationZhHans: "仰角为45°时，眼睛到楼顶的竖直高度与水平距离相等，都是20米。再加上眼睛离地高度1.6米，教学楼高20+1.6=21.6米。"
  },
  "hjb-junior-ds-v2-s3-168": {
    acceptedAnswers: []
  },
  "hjb-junior-ds-v2-s3-176": {
    promptZhHans: "已知二次函数 y = -2(x + 3)² + 8。当x取何值时，函数取得最大值？最大值是多少？",
    answer: "x=-3时，最大值为8",
    acceptedAnswers: ["x=-3时，最大值为8", "x=-3，最大值8", "-3，8", "-3, 8"],
    explanationZhHans: "函数写成顶点式y=-2(x+3)²+8，二次项系数-2<0，抛物线开口向下。顶点为(-3,8)，所以x=-3时函数取得最大值8。"
  },
  "hjb-junior-ds-v2-s3-404": {
    explanationZhHans: "两人的平均数都为8.8。按方差公式计算，甲的方差为0.56，乙的方差为1.36。平均数相同而甲的方差更小，说明甲的成绩更稳定，所以应选择甲。"
  },
  "hjb-junior-ds-v2-s1-174": {
    explanationZhHans: "原式中各分母必须非零，且除式本身不能为0。因此x²-4≠0、x²+2x≠0、x-2≠0，合并得x≠-2、0、2。在这个定义域内，原式化简为x；代入x=3，结果为3。"
  },
  "hjb-junior-ds-v2-s1-258": {
    answer: "80",
    acceptedAnswers: ["80本", "80", "80 books"],
    explanationZhHans: "设购进x本，则卖出(x-15)本。收入减去全部进货成本为120元，所以8(x-15)-5x=120。解得3x=240，x=80。因此书店购进了80本图书。"
  },
  "hjb-junior-ds-v2-s2-174": {
    promptZhHans: "一个矩形的长比宽多3米，面积是40平方米。求这个矩形的长和宽。",
    answer: "宽5米，长8米",
    acceptedAnswers: ["宽5米，长8米", "宽为5米，长为8米", "长8米，宽5米", "width 5 m, length 8 m"],
    explanationZhHans: "设宽为x米，则长为(x+3)米。由面积得x(x+3)=40，即x²+3x-40=0。分解得(x+8)(x-5)=0。长度为正，所以x=5，宽5米、长8米。"
  },
  "hjb-junior-ds-v2-s2-180": {
    promptZhHans: "两个连续正整数的积是72。求这两个正整数。",
    answer: "8和9",
    acceptedAnswers: ["8和9", "9和8", "8，9", "9，8", "8,9", "9,8", "8 and 9", "9 and 8"],
    explanationZhHans: "设较小的正整数为x，则另一个为x+1。由x(x+1)=72，得x²+x-72=0，即(x-8)(x+9)=0。因为x为正整数，所以x=8，这两个连续正整数是8和9。"
  },
  "hjb-junior-ds-v2-s2-210": {
    explanationZhHans: "角平分线上的点到角的两边距离相等。由勾股定理得AB=10；角平分线定理给出AD∶DB=AC∶BC=3∶4，所以AD=30/7、DB=40/7。D到AC的距离为DB·sinB=(40/7)·(3/5)=24/7，因此D到BC的距离也为24/7。两段距离之和为48/7。"
  },
  "hjb-junior-ds-v2-s3-262": {
    optionsZhHans: ["2√7 cm", "10 cm", "2√5 cm", "√30 cm"],
    answer: "2√7 cm",
    acceptedAnswers: ["2√7 cm", "√28 cm", "2√7", "√28", "A"],
    explanationZhHans: "连接OT，则OT垂直于切线PT。在直角三角形OPT中，OP=8 cm、OT=6 cm，所以PT=√(8²-6²)=√28=2√7 cm，只有第一项正确。"
  },
  "hjb-junior-ds-v2-s3-492": {
    answer: "32",
    acceptedAnswers: ["32", "A"],
    explanationZhHans: "平均数为500/6=250/3。方差为[(78-250/3)²+(85-250/3)²+(92-250/3)²+(88-250/3)²+(76-250/3)²+(81-250/3)²]÷6=281/9≈31.22。四个选项中32与31.22最接近。"
  }
};

type ReviewedHjbJuniorEnglishCorrection = {
  prompt: string;
  explanation: string;
  acceptedAnswers?: string[];
};

const reviewedEnglishCorrections: Record<string, ReviewedHjbJuniorEnglishCorrection> = {
  "hjb-junior-ds-v2-s1-342": {
    prompt: "On the straight line CD through O, ∠AOC=40° and ∠COE=60°. Rays OA and OE lie on opposite sides of line CD. Find ∠AOE.",
    explanation: "Because OA and OE lie on opposite sides of line CD, ∠AOE=∠AOC+∠COE=40°+60°=100°."
  },
  "hjb-junior-ds-v2-s2-180": {
    prompt: "The product of two consecutive positive integers is 72. Find both integers.",
    explanation: "Let the smaller integer be x. Then x(x+1)=72, so x=8 and the two positive integers are 8 and 9.",
    acceptedAnswers: ["8 and 9", "9 and 8"]
  },
  "hjb-junior-ds-v2-s2-401": {
    prompt: "A courier charges 10 yuan for the first billed kilogram and 4 yuan for each additional billed kilogram. Let x be the billed weight in kilograms, where x is a positive integer and x≥1, and let y be the total charge in yuan. Write y as a function of x.",
    explanation: "There are x−1 additional billed kilograms, so y=10+4(x−1)=4x+6."
  },
  "hjb-junior-ds-v2-s3-363": {
    prompt: "In ⊙O, the radius is 5. Point P lies on line l, OP=5, and OP is perpendicular to l. Determine the positional relationship between line l and ⊙O.",
    explanation: "The perpendicular distance from O to l is OP=5, equal to the radius, so line l is tangent to ⊙O at P."
  }
};

type ReviewedStructuredCompoundAnswer = Pick<
  GeneratedHjbJuniorQuestion,
  "answer" | "acceptedAnswers"
>;

const reviewedStructuredCompoundAnswers: Record<string, ReviewedStructuredCompoundAnswer> = {
  "hjb-junior-ds-v2-s1-003": {
    answer: "ab+3；-3",
    acceptedAnswers: ["ab+3；-3", "ab + 3；-3", "ab+3; -3"]
  },
  "hjb-junior-ds-v2-s1-015": {
    answer: "-5x²y；-10",
    acceptedAnswers: ["-5x²y；-10", "-5x^2y；-10", "-5x²y; -10"]
  },
  "hjb-junior-ds-v2-s1-033": {
    answer: "x²-2；-1",
    acceptedAnswers: ["x²-2；-1", "x^2-2；-1", "x² - 2; -1"]
  },
  "hjb-junior-ds-v2-s1-045": {
    answer: "3x²y+4xy；4",
    acceptedAnswers: ["3x²y+4xy；4", "3x^2y+4xy；4", "xy(3x+4)；4", "3x²y+4xy; 4"]
  },
  "hjb-junior-ds-v2-s1-153": {
    answer: "1；1",
    acceptedAnswers: ["1；1", "1; 1"]
  },
  "hjb-junior-ds-v2-s1-156": {
    answer: "1；1",
    acceptedAnswers: ["1；1", "1; 1"]
  },
  "hjb-junior-ds-v2-s1-159": {
    answer: "x；3",
    acceptedAnswers: ["x；3", "x; 3"]
  },
  "hjb-junior-ds-v2-s1-162": {
    answer: "1；1",
    acceptedAnswers: ["1；1", "1; 1"]
  },
  "hjb-junior-ds-v2-s1-168": {
    answer: "(x+3)/(x-3)；7",
    acceptedAnswers: ["(x+3)/(x-3)；7", "(x + 3)/(x - 3)；7", "(x+3)/(x-3); 7"]
  },
  "hjb-junior-ds-v2-s1-174": {
    answer: "x；3",
    acceptedAnswers: ["x；3", "x; 3"]
  },
  "hjb-junior-ds-v2-s1-177": {
    answer: "(x+2)/(x-2)；5",
    acceptedAnswers: ["(x+2)/(x-2)；5", "(x + 2)/(x - 2)；5", "(x+2)/(x-2); 5"]
  },
  "hjb-junior-ds-v2-s1-183": {
    answer: "1；1",
    acceptedAnswers: ["1；1", "1; 1"]
  },
  "hjb-junior-ds-v2-s1-189": {
    answer: "1；1",
    acceptedAnswers: ["1；1", "1; 1"]
  },
  "hjb-junior-ds-v2-s1-192": {
    answer: "(x+2)/x；5/3",
    acceptedAnswers: ["(x+2)/x；5/3", "(x + 2)/x；5/3", "(x+2)/x; 5/3"]
  },
  "hjb-junior-ds-v2-s2-105": {
    answer: "|x-2|/(x-2)-|x+1|/(x+1)；0",
    acceptedAnswers: [
      "|x-2|/(x-2)-|x+1|/(x+1)；0",
      "|x - 2|/(x - 2) - |x + 1|/(x + 1)；0",
      "|x-2|/(x-2)-|x+1|/(x+1); 0"
    ]
  }
};

const reviewedFinalOnlyCompoundIds = new Set([
  "hjb-junior-ds-v2-s1-102",
  "hjb-junior-ds-v2-s1-105",
  "hjb-junior-ds-v2-s1-117",
  "hjb-junior-ds-v2-s1-120",
  "hjb-junior-ds-v2-s1-294",
  "hjb-junior-ds-v2-s1-306",
  "hjb-junior-ds-v2-s1-327",
  "hjb-junior-ds-v2-s1-351",
  "hjb-junior-ds-v2-s1-357",
  "hjb-junior-ds-v2-s1-372",
  "hjb-junior-ds-v2-s2-045",
  "hjb-junior-ds-v2-s2-057",
  "hjb-junior-ds-v2-s2-123",
  "hjb-junior-ds-v2-s2-150",
  "hjb-junior-ds-v2-s2-213",
  "hjb-junior-ds-v2-s2-252",
  "hjb-junior-ds-v2-s2-258",
  "hjb-junior-ds-v2-s2-267",
  "hjb-junior-ds-v2-s2-270",
  "hjb-junior-ds-v2-s2-281",
  "hjb-junior-ds-v2-s2-297",
  "hjb-junior-ds-v2-s2-357",
  "hjb-junior-ds-v2-s3-027",
  "hjb-junior-ds-v2-s3-312",
  "hjb-junior-ds-v2-s3-360",
  "hjb-junior-ds-v2-s3-363",
  "hjb-junior-ds-v2-s3-375"
]);

const reviewedFinalOnlyPromptOverrides: Record<string, string> = {
  "hjb-junior-ds-v2-s2-150": "已知关于x的一元二次方程 x²-(k+3)x+2k+2=0 的两个实数根分别为α、β，且α²+β²=13，求k的值。",
  "hjb-junior-ds-v2-s3-360": "在△ABC中，AB=AC=5，BC=6。以A为圆心作圆与BC相切于点D，求该圆的半径。"
};

const finalOnlyDirectiveSuffixPattern = /\s*(?:[，,；;]\s*)?(?:请)?(?:并)?(?:写出(?:你的)?(?:完整)?(?:(?:计算|解题|推理))?过程|写出主要步骤|说明(?:你的)?(?:比较方法|理由|依据)|证明你的结论)[。.]?$/u;

function finalOnlyCompoundPrompt(question: GeneratedHjbJuniorQuestion) {
  return reviewedFinalOnlyPromptOverrides[question.id]
    ?? question.promptZhHans.replace(finalOnlyDirectiveSuffixPattern, "").trim();
}

const reviewedUnitAnswerAliases: Record<string, string[]> = {
  "hjb-junior-ds-v2-s1-258": ["80本"],
  "hjb-junior-ds-v2-s1-300": ["4支"]
};

const unsafeGeneratedAliasPattern = /(?:term-[a-f0-9]+(?:-[a-f0-9]+)*|[\u0000-\u001f\u007f])/iu;

function reviewedQuestion(question: GeneratedHjbJuniorQuestion): GeneratedHjbJuniorQuestion {
  const contentCorrected = { ...question, ...reviewedCorrections[question.id] };
  const structuredAnswer = reviewedStructuredCompoundAnswers[question.id];
  const contractCorrected = structuredAnswer
    ? {
        ...contentCorrected,
        ...structuredAnswer,
        promptZhHans: `${contentCorrected.promptZhHans} 请按“化简结果；代入值”格式作答。`
      }
    : contentCorrected;

  if (!reviewedFinalOnlyCompoundIds.has(question.id)) return contractCorrected;
  return {
    ...contractCorrected,
    promptZhHans: finalOnlyCompoundPrompt(contractCorrected)
  };
}

function reviewedAcceptedAnswers(question: GeneratedHjbJuniorQuestion) {
  return Array.from(new Set([
    ...localizedHjbGeneratedAcceptedAnswers(question),
    ...(reviewedUnitAnswerAliases[question.id] ?? []),
    ...(reviewedEnglishCorrections[question.id]?.acceptedAnswers ?? [])
  ])).filter((alias) => !unsafeGeneratedAliasPattern.test(alias));
}

const reviewedQuestions = questionPack.questions.map(reviewedQuestion);
const promptDuplicateCounts = new Map<string, number>();

reviewedQuestions.forEach((question) => {
  const promptKey = stripHjbGeneratorPromptPrefix(question.promptZhHans);
  promptDuplicateCounts.set(promptKey, (promptDuplicateCounts.get(promptKey) ?? 0) + 1);
});

const promptVariantIndexByQuestionId = new Map<string, number>();
const promptSeenCounts = new Map<string, number>();

reviewedQuestions.forEach((question) => {
  const promptKey = stripHjbGeneratorPromptPrefix(question.promptZhHans);
  if ((promptDuplicateCounts.get(promptKey) ?? 0) <= 1) return;
  const variantIndex = (promptSeenCounts.get(promptKey) ?? 0) + 1;
  promptSeenCounts.set(promptKey, variantIndex);
  promptVariantIndexByQuestionId.set(question.id, variantIndex);
});

function appendLocalizedText(value: LocalizedText, suffix: LocalizedText): LocalizedText {
  return {
    en: `${value.en}${suffix.en}`,
    zh: `${value.zh}${suffix.zh}`,
    zhHans: `${value.zhHans ?? value.zh}${suffix.zhHans ?? suffix.zh}`
  };
}

function localizedPromptForQuestion(question: GeneratedHjbJuniorQuestion) {
  const localizedPrompt = localizeHjbGeneratedText(question.promptZhHans);
  const reviewedEnglish = reviewedEnglishCorrections[question.id]?.prompt;
  const prompt = reviewedEnglish ? { ...localizedPrompt, en: reviewedEnglish } : localizedPrompt;
  const variantIndex = promptVariantIndexByQuestionId.get(question.id);
  if (!variantIndex) return prompt;
  return appendLocalizedText(prompt, {
    en: `\nVariant ${variantIndex}`,
    zh: `\n變式 ${variantIndex}`,
    zhHans: `\n变式 ${variantIndex}`
  });
}

function localizedExplanationForQuestion(question: GeneratedHjbJuniorQuestion) {
  const explanation = localizeHjbGeneratedText(question.explanationZhHans);
  const reviewedEnglish = reviewedEnglishCorrections[question.id]?.explanation;
  return reviewedEnglish ? { ...explanation, en: reviewedEnglish } : explanation;
}

function toQuestion(question: GeneratedHjbJuniorQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland HJB junior topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandHjbProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_HJB",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizedPromptForQuestion(question),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeHjbGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: reviewedAcceptedAnswers(question),
    explanation: localizedExplanationForQuestion(question)
  };
}

export const mainlandHjbJuniorQuestionGenerationMetadata: Record<string, MainlandHjbJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    reviewedQuestions.map((question) => [
      question.id,
      {
        batch: "hjb-junior-v2-1500" as const,
        grade: question.grade,
        semester: question.semester,
        topicId: question.topicId,
        volume: question.volume,
        unitTitle: question.unitTitle,
        type: question.type,
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        assessmentPatternCardIds: question.assessmentPatternCardIds,
        paperPatternCardIds: question.paperPatternCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbJuniorAnswer(question: Question) {
  return mainlandHjbJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbJuniorQuestions: Question[] = reviewedQuestions.map(toQuestion);
