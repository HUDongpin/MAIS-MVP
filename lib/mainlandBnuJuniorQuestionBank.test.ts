import assert from "node:assert/strict";
import test from "node:test";
import approvedQuestionPackJson from "../coordination/content-qa/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json";
import {
  independentMainlandBnuJuniorAnswer,
  mainlandBnuJuniorQuestionGenerationMetadata,
  mainlandBnuJuniorQuestions
} from "../data/mainlandBnuJuniorQuestions";
import { mainlandBnuJuniorLessonSeeds, mainlandBnuJuniorSourceLessonCount } from "../data/mainlandBnuJuniorLessons";
import { mainlandBnuJuniorTopicMetadata, mainlandBnuJuniorTopics } from "../data/mainlandBnuJuniorTopics";
import { questions } from "../data/questions";
import { topics } from "../data/topics";
import { mainlandBnuJuniorRagCards } from "../data/rag/mainlandBnuJunior";
import { mainlandBnuJuniorAssessmentPatternCards } from "../data/rag/mainlandBnuJuniorAssessmentPatterns";
import { mainlandJuniorZhongkaoExamPatternCards } from "../data/rag/mainlandJuniorZhongkaoExamPatterns";
import { GET as getQuestionsRoute } from "../app/api/questions/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";
import { parseScalarAnswer, questionAnswerMatches } from "./server/answerMatching";
import {
  createStudentUser,
  getLessonBySlug,
  getLessonEntryTarget,
  getPublicQuestions,
  getRoadmapData
} from "./server/userStore";
import type { CurriculumProfile, GradeId, QuestionType } from "@/types";

type ApprovedQuestionPack = {
  approval: {
    decision: string;
    repairedRows: number;
    deepseekFailRowsReviewed: number;
  };
  questions: Array<{
    id: string;
    grade: GradeId;
    topicId: string;
    type: Exclude<QuestionType, "graph">;
    difficulty: string;
  }>;
};

const approvedQuestionPack = approvedQuestionPackJson as ApprovedQuestionPack;
const juniorGrades: Extract<GradeId, "S1" | "S2" | "S3">[] = ["S1", "S2", "S3"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const mainlandBnuProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" };
const mainlandPepProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };
const mainlandHjbProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" };
const expectedJuniorQuestionCount = 1500;
const expectedTopicCounts: Record<(typeof juniorGrades)[number], number> = { S1: 12, S2: 13, S3: 10 };

const reviewedMetaExplanationQuestionIds = [
  "bnu-junior-ds-v1-s1-014",
  "bnu-junior-ds-v1-s1-017",
  "bnu-junior-ds-v1-s1-019",
  "bnu-junior-ds-v1-s1-026",
  "bnu-junior-ds-v1-s1-028",
  "bnu-junior-ds-v1-s1-040",
  "bnu-junior-ds-v1-s1-138",
  "bnu-junior-ds-v1-s1-230",
  "bnu-junior-ds-v1-s1-276",
  "bnu-junior-ds-v1-s1-278",
  "bnu-junior-ds-v1-s1-281",
  "bnu-junior-ds-v1-s1-284",
  "bnu-junior-ds-v1-s1-287",
  "bnu-junior-ds-v1-s1-292",
  "bnu-junior-ds-v1-s1-293",
  "bnu-junior-ds-v1-s1-311",
  "bnu-junior-ds-v1-s1-312",
  "bnu-junior-ds-v1-s1-315",
  "bnu-junior-ds-v1-s1-317",
  "bnu-junior-ds-v1-s1-320",
  "bnu-junior-ds-v1-s1-327",
  "bnu-junior-ds-v1-s1-328",
  "bnu-junior-ds-v1-s1-332",
  "bnu-junior-ds-v1-s1-336",
  "bnu-junior-ds-v1-s1-434",
  "bnu-junior-ds-v1-s1-440",
  "bnu-junior-ds-v1-s1-450",
  "bnu-junior-ds-v1-s1-456",
  "bnu-junior-ds-v1-s1-485",
  "bnu-junior-ds-v1-s2-012",
  "bnu-junior-ds-v1-s2-013",
  "bnu-junior-ds-v1-s2-031",
  "bnu-junior-ds-v1-s2-066",
  "bnu-junior-ds-v1-s2-069",
  "bnu-junior-ds-v1-s2-132",
  "bnu-junior-ds-v1-s2-136",
  "bnu-junior-ds-v1-s2-156",
  "bnu-junior-ds-v1-s2-160",
  "bnu-junior-ds-v1-s2-192",
  "bnu-junior-ds-v1-s2-237",
  "bnu-junior-ds-v1-s2-240",
  "bnu-junior-ds-v1-s2-243",
  "bnu-junior-ds-v1-s2-244",
  "bnu-junior-ds-v1-s2-247",
  "bnu-junior-ds-v1-s2-248",
  "bnu-junior-ds-v1-s2-250",
  "bnu-junior-ds-v1-s2-252",
  "bnu-junior-ds-v1-s2-263",
  "bnu-junior-ds-v1-s2-264",
  "bnu-junior-ds-v1-s2-273",
  "bnu-junior-ds-v1-s2-285",
  "bnu-junior-ds-v1-s2-287",
  "bnu-junior-ds-v1-s2-291",
  "bnu-junior-ds-v1-s2-294",
  "bnu-junior-ds-v1-s2-296",
  "bnu-junior-ds-v1-s2-297",
  "bnu-junior-ds-v1-s2-299",
  "bnu-junior-ds-v1-s2-300",
  "bnu-junior-ds-v1-s2-303",
  "bnu-junior-ds-v1-s2-335",
  "bnu-junior-ds-v1-s2-362",
  "bnu-junior-ds-v1-s2-366",
  "bnu-junior-ds-v1-s2-381",
  "bnu-junior-ds-v1-s2-382",
  "bnu-junior-ds-v1-s2-446",
  "bnu-junior-ds-v1-s2-454",
  "bnu-junior-ds-v1-s2-481",
  "bnu-junior-ds-v1-s2-487",
  "bnu-junior-ds-v1-s2-489",
  "bnu-junior-ds-v1-s2-490",
  "bnu-junior-ds-v1-s2-493",
  "bnu-junior-ds-v1-s3-009",
  "bnu-junior-ds-v1-s3-018",
  "bnu-junior-ds-v1-s3-023",
  "bnu-junior-ds-v1-s3-027",
  "bnu-junior-ds-v1-s3-031",
  "bnu-junior-ds-v1-s3-033",
  "bnu-junior-ds-v1-s3-035",
  "bnu-junior-ds-v1-s3-036",
  "bnu-junior-ds-v1-s3-037",
  "bnu-junior-ds-v1-s3-039",
  "bnu-junior-ds-v1-s3-049",
  "bnu-junior-ds-v1-s3-065",
  "bnu-junior-ds-v1-s3-068",
  "bnu-junior-ds-v1-s3-122",
  "bnu-junior-ds-v1-s3-131",
  "bnu-junior-ds-v1-s3-134",
  "bnu-junior-ds-v1-s3-177",
  "bnu-junior-ds-v1-s3-178",
  "bnu-junior-ds-v1-s3-231",
  "bnu-junior-ds-v1-s3-237",
  "bnu-junior-ds-v1-s3-244",
  "bnu-junior-ds-v1-s3-267",
  "bnu-junior-ds-v1-s3-346",
  "bnu-junior-ds-v1-s3-349",
  "bnu-junior-ds-v1-s3-419",
  "bnu-junior-ds-v1-s3-421",
  "bnu-junior-ds-v1-s3-437"
] as const;

const substantiveExpectedAnswers: Record<string, string> = {
  "bnu-junior-ds-v1-s1-014": "（1）6个面；（2）12条棱；（3）8个顶点",
  "bnu-junior-ds-v1-s1-017": "（1）6个面；（2）12条棱；（3）8个顶点",
  "bnu-junior-ds-v1-s1-019": "5个",
  "bnu-junior-ds-v1-s1-028": "3",
  "bnu-junior-ds-v1-s1-138": "50°或150°",
  "bnu-junior-ds-v1-s1-230": "80~89分的人数最多，有8人。",
  "bnu-junior-ds-v1-s1-311": "170°",
  "bnu-junior-ds-v1-s1-332": "∠BOF=90°，AB⊥CD",
  "bnu-junior-ds-v1-s2-237": "①",
  "bnu-junior-ds-v1-s2-240": "无",
  "bnu-junior-ds-v1-s2-243": "2",
  "bnu-junior-ds-v1-s2-244": "1个",
  "bnu-junior-ds-v1-s2-247": "2个",
  "bnu-junior-ds-v1-s2-248": "无",
  "bnu-junior-ds-v1-s2-250": "2个",
  "bnu-junior-ds-v1-s2-252": "③④",
  "bnu-junior-ds-v1-s2-263": "①②",
  "bnu-junior-ds-v1-s2-264": "④",
  "bnu-junior-ds-v1-s2-273": "90°",
  "bnu-junior-ds-v1-s2-285": "90°",
  "bnu-junior-ds-v1-s2-291": "20°",
  "bnu-junior-ds-v1-s2-299": "160°",
  "bnu-junior-ds-v1-s2-362": "(-2, -2)",
  "bnu-junior-ds-v1-s2-381": "√73",
  "bnu-junior-ds-v1-s2-382": "点P'的横坐标比点P的横坐标大3",
  "bnu-junior-ds-v1-s2-481": "180°",
  "bnu-junior-ds-v1-s2-487": "4组",
  "bnu-junior-ds-v1-s2-489": "4组",
  "bnu-junior-ds-v1-s3-009": "√17/17",
  "bnu-junior-ds-v1-s3-018": "②",
  "bnu-junior-ds-v1-s3-031": "③和④",
  "bnu-junior-ds-v1-s3-033": "④",
  "bnu-junior-ds-v1-s3-035": "无",
  "bnu-junior-ds-v1-s3-037": "②③④",
  "bnu-junior-ds-v1-s3-039": "②",
  "bnu-junior-ds-v1-s3-065": "k=(-1+√19)/2",
  "bnu-junior-ds-v1-s3-178": "△ADE与△ABC的面积比为4:25",
  "bnu-junior-ds-v1-s3-231": "11",
  "bnu-junior-ds-v1-s3-237": "22 cm²",
  "bnu-junior-ds-v1-s3-267": "x≥48",
  "bnu-junior-ds-v1-s3-349": "15(3-√3)米",
  "bnu-junior-ds-v1-s3-421": "12",
  "bnu-junior-ds-v1-s3-437": "120°"
};

const parallelLineContextQuestionIds = [
  "bnu-junior-ds-v1-s2-237",
  "bnu-junior-ds-v1-s2-240",
  "bnu-junior-ds-v1-s2-243",
  "bnu-junior-ds-v1-s2-244",
  "bnu-junior-ds-v1-s2-246",
  "bnu-junior-ds-v1-s2-247",
  "bnu-junior-ds-v1-s2-248",
  "bnu-junior-ds-v1-s2-249",
  "bnu-junior-ds-v1-s2-250",
  "bnu-junior-ds-v1-s2-252",
  "bnu-junior-ds-v1-s2-253",
  "bnu-junior-ds-v1-s2-254",
  "bnu-junior-ds-v1-s2-255",
  "bnu-junior-ds-v1-s2-256",
  "bnu-junior-ds-v1-s2-257",
  "bnu-junior-ds-v1-s2-258",
  "bnu-junior-ds-v1-s2-259",
  "bnu-junior-ds-v1-s2-260",
  "bnu-junior-ds-v1-s2-263",
  "bnu-junior-ds-v1-s2-264",
  "bnu-junior-ds-v1-s2-266",
  "bnu-junior-ds-v1-s2-269",
  "bnu-junior-ds-v1-s2-272"
] as const;

const remainingParallelLineExpectedAnswers = {
  "bnu-junior-ds-v1-s2-246": "②",
  "bnu-junior-ds-v1-s2-249": "①④",
  "bnu-junior-ds-v1-s2-253": "2个",
  "bnu-junior-ds-v1-s2-254": "不平行。∠AGE与∠CHG是一对同位角，但65°≠115°，所以AB与CD不平行。",
  "bnu-junior-ds-v1-s2-255": "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
  "bnu-junior-ds-v1-s2-256": "①",
  "bnu-junior-ds-v1-s2-257": "AB∥CD。因为∠AGE=70°，所以∠BGH=70°；∠BGH+∠CHF=180°，同旁内角互补，所以AB∥CD。",
  "bnu-junior-ds-v1-s2-258": "3",
  "bnu-junior-ds-v1-s2-259": "1个",
  "bnu-junior-ds-v1-s2-260": "AB∥CD，因为∠AGE+∠CHF=180°，同旁内角互补。",
  "bnu-junior-ds-v1-s2-266": "AB∥CD。因为∠BGH与∠AGE是对顶角，所以∠BGH=72°；又∠DHF=72°，故∠BGH=∠DHF。由同位角相等，得AB∥CD。",
  "bnu-junior-ds-v1-s2-269": "不平行。∠AGE与∠CHG是一对同位角，但70°≠110°，所以AB与CD不平行。",
  "bnu-junior-ds-v1-s2-272": "不平行。∠AGE与∠CHG是一对同位角，但110°≠70°，所以AB与CD不平行。"
} as const;

const remainingA18ExpectedAnswers = {
  "bnu-junior-ds-v1-s1-008": "水的体积为192 cm³；翻转后水深为4 cm，水不会接触成为新顶面的原底面。",
  "bnu-junior-ds-v1-s1-020": "（1）最少5个。（2）可按前、后两排分别摆成[2,0,2]和[0,1,0]的高度矩阵。",
  "bnu-junior-ds-v1-s1-024": "5",
  "bnu-junior-ds-v1-s1-056": "不存在符合x≥0的时间。",
  "bnu-junior-ds-v1-s1-072": "不存在符合x≥0的解。",
  "bnu-junior-ds-v1-s1-098": "（1）240人；（2）租4辆60座客车，总租金1200元，比租6辆45座客车的1320元少120元。",
  "bnu-junior-ds-v1-s1-122": "需要(a+b)/45辆；总租金800x元；800表示每辆大巴的租金。",
  "bnu-junior-ds-v1-s1-171": "设有x名学生，列方程5x+18=7x-4，解得x=11。",
  "bnu-junior-ds-v1-s1-178": "方案一：8x元；方案二：(20+4.8x)元；购买15本时方案二更省钱；当x=6.25时费用相等",
  "bnu-junior-ds-v1-s1-182": "铅笔1.6元，笔记本3.6元",
  "bnu-junior-ds-v1-s1-188": "25",
  "bnu-junior-ds-v1-s1-224": "调查问题：调查日前一天完成家庭作业用了多少分钟；调查对象：七年级全体300名学生；匿名问卷收集；按时间段分组统计频数和百分比。",
  "bnu-junior-ds-v1-s1-233": "（1）方案二。（2）2小时6人，3小时10人，4小时9人，5小时10人，6小时5人。（3）3小时和5小时人数最多，均为10人。",
  "bnu-junior-ds-v1-s1-237": "（1）总体是七年级全体学生一周平均作业时间。（2）个体是每名学生的一周平均作业时间。（3）样本是被抽取学生的一周平均作业时间。（4）若有n个班，样本容量为5n。",
  "bnu-junior-ds-v1-s1-240": "不能。全班40人中只有15人选择运动，另有25人选择其他活动，不能说全班同学都这样认为。",
  "bnu-junior-ds-v1-s1-242": "（1）方案一。（2）30~40分钟5人，40~50分钟10人，50~60分钟13人，60~70分钟9人，70~80分钟3人。（3）50~60分钟人数最多，占32.5%。",
  "bnu-junior-ds-v1-s1-264": "-24a^5",
  "bnu-junior-ds-v1-s1-335": "AB与MN不平行。两直线都过O，若平行则必须重合，但∠BOM=40°，所以不重合。",
  "bnu-junior-ds-v1-s1-417": "（1）x是自变量，y是因变量。（2）33升。（3）t=10y；行驶200千米后最多还能行驶250千米。",
  "bnu-junior-ds-v1-s1-437": "2√10",
  "bnu-junior-ds-v1-s1-458": "(4,1)",
  "bnu-junior-ds-v1-s1-482": "等可能结果为1,1,2,2,3,3,4,4；奇数结果有4个，概率为1/2。",
  "bnu-junior-ds-v1-s1-484": "等可能结果为(A,A),(A,B),(A,C),(A,D),(A,E),(B,A),(B,B),(B,C),(B,D),(B,E),(C,A),(C,B),(C,C),(C,D),(C,E),(D,A),(D,B),(D,C),(D,D),(D,E),(E,A),(E,B),(E,C),(E,D),(E,E)；相同字母有5种，概率为1/5。",
  "bnu-junior-ds-v1-s2-044": "d<c<a<b",
  "bnu-junior-ds-v1-s2-050": "∛2",
  "bnu-junior-ds-v1-s2-164": "方程组为x+y=17，8x+5y=100；解得x=5，y=12。",
  "bnu-junior-ds-v1-s2-165": "方程组为y=45x+15，y=60(x-1)；解得x=5，y=240。",
  "bnu-junior-ds-v1-s2-168": "方程组为3x+2y=210，2x+3y=215；解得x=40，y=45。",
  "bnu-junior-ds-v1-s2-175": "{ x + y = 1, 2x - y = 8 }",
  "bnu-junior-ds-v1-s2-188": "方程组为x+y=15，5x+8y=99；解得x=7，y=8。",
  "bnu-junior-ds-v1-s2-189": "方程组为y=45x+15，y=50x-10；解得x=5，y=240。",
  "bnu-junior-ds-v1-s2-197": "甲的方差为0.6，乙的方差为2.0，甲的成绩更稳定。",
  "bnu-junior-ds-v1-s2-200": "甲和乙的平均株高均为86厘米，甲的方差为2.0，乙的方差为6.0，因此甲的株高更整齐。",
  "bnu-junior-ds-v1-s2-201": "甲班方差约为8，乙班方差约为74，甲班成绩更稳定。",
  "bnu-junior-ds-v1-s2-207": "甲班方差为34.8，乙班方差为177.0，乙班成绩离散程度更大。",
  "bnu-junior-ds-v1-s2-212": "（1）甲班平均数190cm，中位数190cm；乙班平均数190cm，中位数190cm。（2）推荐甲班，因为甲班成绩的方差较小，成绩更整齐。",
  "bnu-junior-ds-v1-s2-213": "13.6875",
  "bnu-junior-ds-v1-s2-215": "（1）中位数是85分，众数是85分。（2）约1100人。",
  "bnu-junior-ds-v1-s2-218": "（1）中位数是12cm，平均数是12.2cm。（2）优秀率30%，估计约120人。",
  "bnu-junior-ds-v1-s2-224": "（1）一班平均数190、中位数190；二班平均数196、中位数185。（2）一班方差50，二班方差754，一班更稳定。（3）选择一班更合适。",
  "bnu-junior-ds-v1-s2-225": "甲的方差为0.49，乙的方差为1.45，应选甲参赛，因为甲更稳定。",
  "bnu-junior-ds-v1-s2-228": "甲的方差为1.2，乙的方差为2.16，应选择甲。",
  "bnu-junior-ds-v1-s2-230": "甲平均数为8、方差为0.6；乙平均数为8、方差为4.4；应选甲，因为方差更小。",
  "bnu-junior-ds-v1-s2-275": "7/3",
  "bnu-junior-ds-v1-s2-284": "因为AD平分∠BAC，且DE⊥AB、DF⊥AC，所以角平分线上的点D到∠BAC两边的距离相等，故DE=DF。",
  "bnu-junior-ds-v1-s2-305": "D在C点外侧，所以∠ABD=∠ABC=70°；又∠BAD=70°，故∠ABD=∠BAD，从而AD=BD。",
  "bnu-junior-ds-v1-s2-317": "y=-20x²+1400x-20000，30≤x≤50",
  "bnu-junior-ds-v1-s2-326": "y=-20x²+1400x-20000，售价为35元时利润最大",
  "bnu-junior-ds-v1-s2-331": "2 < a ≤ 4",
  "bnu-junior-ds-v1-s2-347": "不存在符合条件的正整数x。",
  "bnu-junior-ds-v1-s2-427": "方程的解为 x=-4",
  "bnu-junior-ds-v1-s2-435": "m=0或4",
  "bnu-junior-ds-v1-s2-437": "设原计划每天修x米，列方程1200/x-1200/(x+10)=4，解得x=50或-60；舍去-60，检验x=50符合题意。",
  "bnu-junior-ds-v1-s2-439": "分式化简后为 \\(\\frac{2}{x+2}\\)",
  "bnu-junior-ds-v1-s2-447": "无解",
  "bnu-junior-ds-v1-s2-449": "m < -1 且 m ≠ -2",
  "bnu-junior-ds-v1-s2-461": "2",
  "bnu-junior-ds-v1-s2-465": "①与③",
  "bnu-junior-ds-v1-s3-069": "k < 1",
  "bnu-junior-ds-v1-s3-089": "12元或16元",
  "bnu-junior-ds-v1-s3-209": "俯视高度矩阵为前排[2,1,2]、后排[1,1,1]；共8个小立方块。",
  "bnu-junior-ds-v1-s3-212": "最少由4个小立方块组成。",
  "bnu-junior-ds-v1-s3-237": "22 cm²",
  "bnu-junior-ds-v1-s3-238": "5",
  "bnu-junior-ds-v1-s3-239": "总个数为8，第一排第一列有2层。",
  "bnu-junior-ds-v1-s3-241": "12",
  "bnu-junior-ds-v1-s3-248": "主视图是5 cm×4 cm的矩形；俯视图是边长2 cm的正六边形；左视图是5 cm×2√3 cm的矩形。",
  "bnu-junior-ds-v1-s3-253": "该函数图象位于第二、四象限",
  "bnu-junior-ds-v1-s3-302": "15米",
  "bnu-junior-ds-v1-s3-324": "30 + 10√3 米",
  "bnu-junior-ds-v1-s3-327": "15(3-√3)米",
  "bnu-junior-ds-v1-s3-344": "15米"
} as const;

type FinalBnuJuniorClosureContract = {
  id: string;
  answer: string;
  staleAnswers?: readonly string[];
  promptPatterns?: readonly RegExp[];
  explanationPatterns?: readonly RegExp[];
  options?: readonly string[];
  expectedOptionIndex?: number;
};

const finalBnuJuniorClosureContracts: readonly FinalBnuJuniorClosureContract[] = [
  {
    id: "bnu-junior-ds-v1-s2-266",
    answer: remainingParallelLineExpectedAnswers["bnu-junior-ds-v1-s2-266"],
    staleAnswers: ["AB∥CD。因为∠AGE=65°，所以∠BGH=65°；∠CHF=115°，所以∠DHF=65°。∠BGH=∠DHF，同位角相等，所以AB∥CD。"],
    promptPatterns: [/∠AGE=72°/u, /∠DHF=72°/u],
    explanationPatterns: [/对顶角/u, /同位角相等/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-069",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-069"],
    staleAnswers: ["k < 3 且 k ≠ 1"],
    explanationPatterns: [/Δ\s*=\s*-12\(k-1\)/u, /k<1/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-089",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-089"],
    staleAnswers: ["12元或14元"],
    explanationPatterns: [/x=4或12/u, /售价为12元或16元/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-209",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-209"],
    staleAnswers: ["从上面看：第一行从左到右：2,1；第二行从左到右：1,0；第三行从左到右：2,1。最少需要7个小立方块，最多需要7个小立方块。"],
    promptPatterns: [/2行3列/u, /每个位置都有小立方块/u, /前排/u, /后排/u],
    explanationPatterns: [/前排\[2,1,2\]/u, /后排\[1,1,1\]/u, /共8个/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-212",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-212"],
    explanationPatterns: [/对角/u, /2层/u, /4个/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-237",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-237"],
    promptPatterns: [/第二层实际只有1个/u],
    explanationPatterns: [/5×6-4×2=22/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-238",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-238"],
    staleAnswers: ["2"],
    explanationPatterns: [/最少[^。]*5/u, /最多[^。]*10/u],
    options: ["2", "3", "4", "5"],
    expectedOptionIndex: 3
  },
  {
    id: "bnu-junior-ds-v1-s3-239",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-239"],
    staleAnswers: ["总个数为7，第一行第一列位置的小立方块层数为2"],
    promptPatterns: [/2行3列/u, /每个位置都有小立方块/u, /前排/u, /后排/u],
    explanationPatterns: [/2\+1\+2\+1\+1\+1=8/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-241",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-241"],
    staleAnswers: ["9"],
    promptPatterns: [/最高层数[^。]*2、3、1/u, /最高层数[^。]*2、3/u],
    explanationPatterns: [/最少[^。]*6/u, /最大[^。]*11/u],
    options: ["6", "7", "8", "12"],
    expectedOptionIndex: 3
  },
  {
    id: "bnu-junior-ds-v1-s3-248",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-248"],
    staleAnswers: ["主视图是矩形，长5 cm、宽4 cm；俯视图是正六边形，边长为2 cm；左视图是矩形，长5 cm、宽约3.46 cm。"],
    promptPatterns: [/连接相对顶点的长对角线/u, /画面水平方向/u],
    explanationPatterns: [/外接圆直径为4 cm/u, /对边距离为2√3 cm/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-302",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-302"],
    staleAnswers: ["15√3米"],
    promptPatterns: [/∠CAB=30°，∠CBA=60°/u],
    explanationPatterns: [/AC=15√3/u, /BC=15/u, /CD=15/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-324",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-324"],
    staleAnswers: ["10√3 + 10 米"],
    explanationPatterns: [/h-h\/√3=20/u, /30\+10√3/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-327",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-327"],
    staleAnswers: ["15(3+√3)米"],
    promptPatterns: [/塔西侧/u],
    explanationPatterns: [/OA\+OB=30/u, /15\(3-√3\)/u]
  },
  {
    id: "bnu-junior-ds-v1-s3-344",
    answer: remainingA18ExpectedAnswers["bnu-junior-ds-v1-s3-344"],
    staleAnswers: ["15√3米"],
    promptPatterns: [/∠CAB=30°，∠CBA=60°/u],
    explanationPatterns: [/AC=15√3/u, /BC=15/u, /CD=15/u]
  }
];

const studentVisibleMetaPattern = /(?:根据题意复核计算|复核要点|原(?:记录|答案|解析)|提供的\s*answer|答案却|当前作答|修复前|已更正|更正为)/iu;
const selfCorrectionPattern = /[？?]\s*(?:检查|更正)|更正[:：]/u;

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

test("Mainland BNU junior public bank promotes the S18-approved 1500-question package", () => {
  const publicBnuJuniorQuestions = questions.filter((question) => Boolean(mainlandBnuJuniorQuestionGenerationMetadata[question.id]));
  const approvedIds = new Set(approvedQuestionPack.questions.map((question) => question.id));
  const bankIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));

  assert.equal(approvedQuestionPack.approval.decision, "approved-for-public-integration");
  assert.equal(approvedQuestionPack.approval.deepseekFailRowsReviewed, 153);
  assert.ok(approvedQuestionPack.approval.repairedRows >= 153);
  assert.equal(approvedQuestionPack.questions.length, expectedJuniorQuestionCount);
  assert.equal(mainlandBnuJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(Object.keys(mainlandBnuJuniorQuestionGenerationMetadata).length, expectedJuniorQuestionCount);
  assert.equal(publicBnuJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(approvedIds.size, expectedJuniorQuestionCount);
  assert.equal(bankIds.size, expectedJuniorQuestionCount);
  assert.ok(publicBnuJuniorQuestions.every((question) => approvedIds.has(question.id)));
});

test("Mainland BNU junior bank keeps approved grade, type, difficulty, and topic coverage", () => {
  assert.equal(mainlandBnuJuniorTopics.length, 35);
  assert.equal(Object.keys(mainlandBnuJuniorTopicMetadata).length, 35);
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.grade)), {
    S1: 500,
    S2: 500,
    S3: 500
  });
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.type)), {
    "multiple-choice": 525,
    "short-answer": 525,
    "fill-in": 450
  });
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.difficulty)), {
    Medium: 695,
    Low: 290,
    High: 515
  });

  juniorGrades.forEach((grade) => {
    const gradeQuestions = mainlandBnuJuniorQuestions.filter((question) => question.grade === grade);
    generatedTypes.forEach((type) => {
      assert.ok(gradeQuestions.some((question) => question.type === type), `${grade} should include ${type} questions`);
    });
  });

  mainlandBnuJuniorTopics.forEach((topic) => {
    const metadata = mainlandBnuJuniorTopicMetadata[topic.id];
    assert.ok(metadata, `${topic.id} should have topic metadata`);
    assert.ok(metadata.questionCount > 0, `${topic.id} should have generated questions`);
    assert.ok(topics.some((candidate) => candidate.id === topic.id && candidate.publisher === "MAINLAND_BNU"));
  });
});

test("Mainland BNU junior questions are publisher-scoped, approved, and independently answerable", () => {
  const topicIds = new Set(mainlandBnuJuniorTopics.map((topic) => topic.id));
  const ids = new Set<string>();
  const prompts = new Set<string>();

  mainlandBnuJuniorQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.deepEqual(question.curriculumProfile, mainlandBnuProfile);
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_BNU");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);

    const normalizedPrompt = `${question.grade}:${question.type}:${question.prompt.zhHans ?? question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!prompts.has(normalizedPrompt), `${question.id} duplicates a BNU junior generated prompt`);
    prompts.add(normalizedPrompt);

    assert.ok(question.prompt.en.trim() && question.prompt.zh.trim() && question.prompt.zhHans?.trim(), `${question.id} is missing localized prompt text`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim() && question.explanation.zhHans?.trim(), `${question.id} is missing localized explanation text`);
    assert.equal(/term-[0-9a-f]+/i.test(`${question.prompt.en} ${question.explanation.en}`), false, `${question.id} should not expose machine placeholder tokens in English fallback`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), question.answer, `${question.id} answer should match approved QA metadata`);
  });
});

test("Mainland BNU junior production metadata marks rows approved and cites valid evidence", () => {
  const ragCardIds = new Set(mainlandBnuJuniorRagCards.map((card) => card.id));
  const assessmentPatternCardIds = new Set(mainlandBnuJuniorAssessmentPatternCards.map((card) => card.id));
  const zhongkaoPatternCardIds = new Set(mainlandJuniorZhongkaoExamPatternCards.map((card) => card.id));

  mainlandBnuJuniorQuestions.forEach((question) => {
    const metadata = mainlandBnuJuniorQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing production metadata`);
    assert.equal(metadata.batch, "bnu-junior-v1-1500");
    assert.equal(metadata.sourceDistanceStatus, "passed-auto-source-scan");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.terminologyQaStatus, "pass");
    assert.equal(metadata.manualQaStatus, "approved");
    assert.equal(metadata.grade, question.grade);
    assert.equal(metadata.type, question.type);
    assert.equal(metadata.topicId, question.topicId);
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one BNU junior safe-RAG card`);
    assert.ok(metadata.assessmentPatternCardIds.length > 0, `${question.id} should cite at least one BNU junior assessment-pattern card`);
    assert.ok(metadata.zhongkaoPatternCardIds.length > 0, `${question.id} should cite at least one shared zhongkao pattern card`);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} cites unknown BNU junior RAG evidence`);
    assert.ok(metadata.assessmentPatternCardIds.every((cardId) => assessmentPatternCardIds.has(cardId)), `${question.id} cites unknown BNU junior assessment evidence`);
    assert.ok(metadata.zhongkaoPatternCardIds.every((cardId) => zhongkaoPatternCardIds.has(cardId)), `${question.id} cites unknown zhongkao evidence`);
  });
});

test("Mainland BNU junior multiple-choice items have four unique options and one correct option", () => {
  mainlandBnuJuniorQuestions
    .filter((question) => question.type === "multiple-choice")
    .forEach((question) => {
      const options = question.options ?? [];
      const optionValues = options.map((option) => option.zhHans ?? option.zh);
      assert.equal(options.length, 4, `${question.id} should have four options`);
      assert.equal(new Set(optionValues).size, 4, `${question.id} should have unique options`);
      assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should have exactly one correct option`);
    });
});

test("Mainland BNU junior lesson seeds provide formal S1-S3 textbook coverage", () => {
  const bnuQuestionIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));
  const lessonTopicIds = new Set(mainlandBnuJuniorLessonSeeds.map((lesson) => lesson.topicId));

  assert.equal(mainlandBnuJuniorSourceLessonCount, 105);
  assert.equal(mainlandBnuJuniorLessonSeeds.length, mainlandBnuJuniorTopics.length);
  mainlandBnuJuniorTopics.forEach((topic) => {
    assert.equal(lessonTopicIds.has(topic.id), true, `${topic.id} should have a BNUP junior formal lesson`);
  });
  mainlandBnuJuniorLessonSeeds.forEach((lessonSeed) => {
    assert.ok(lessonSeed.topicId.startsWith("bnu-junior-"), `${lessonSeed.topicId} should use a BNUP junior slug`);
    assert.equal(lessonSeed.productionReady, true);
    assert.equal(lessonSeed.practiceQuestionIds?.length, 8, `${lessonSeed.topicId} should have an 8-question checkpoint`);
    assert.ok(lessonSeed.practiceQuestionIds?.every((questionId) => bnuQuestionIds.has(questionId) && /^bnu-junior-ds-v1-/.test(questionId)));
    assert.ok(lessonSeed.blocks.some((block) => block.type === "teacher-guide"), `${lessonSeed.topicId} should include teacher guidance`);
  });
});

test("Mainland BNU S1-S3 Lesson, Roadmap, Practice, and question API expose approved junior content", async () => {
  const bnuJuniorQuestionIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));

  for (const grade of juniorGrades) {
    const result = await createStudentUser({
      name: `Mainland BNU ${grade} Junior Scope`,
      username: `mainland-bnu-${grade.toLowerCase()}-junior-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandBnuProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.equal(roadmap.topics.length, expectedTopicCounts[grade]);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_BNU"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU"));
    assert.ok(questionsForGrade.every((question) => bnuJuniorQuestionIds.has(question.id) && /^bnu-junior-ds-v1-/.test(question.id)));

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a BNUP junior lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^bnu-junior-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped BNUP junior lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_BNU" && bnuJuniorQuestionIds.has(question.id) && /^bnu-junior-ds-v1-/.test(question.id)));
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));

    const teacherView = entryTarget ? await getLessonBySlug(null, entryTarget.slug, mainlandBnuProfile) : null;
    assert.equal(teacherView?.publisher, "MAINLAND_BNU");
    assert.equal(teacherView?.practiceQuestions.length, 8);
    assert.ok(teacherView?.practiceQuestions.every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id)));
    assert.ok(teacherView?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepS1Questions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandPepProfile });
  assert.equal(pepS1Questions.some((question) => bnuJuniorQuestionIds.has(question.id)), false);
  assert.ok(pepS1Questions.every((question) => question.publisher === "MAINLAND_PEP"));

  const hjbS1Questions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandHjbProfile });
  assert.equal(hjbS1Questions.some((question) => bnuJuniorQuestionIds.has(question.id)), false);
  assert.ok(hjbS1Questions.every((question) => question.publisher === "MAINLAND_HJB"));

  const result = await createStudentUser({
    name: "Mainland BNU API S1",
    username: `mainland-bnu-api-s1-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S1",
    curriculumProfile: mainlandBnuProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const token = await createSessionToken(result.session.user.id);
  const response = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S1&publisher=MAINLAND_BNU", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
  }));
  const body = await response.json() as { questions?: Array<{ curriculumTrack?: string; publisher?: string; id?: string }> };

  assert.equal(response.status, 200);
  assert.equal(body.questions?.length, 500);
  assert.ok(body.questions?.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id ?? "")));
});

test("Mainland BNU junior rewrites the exact 98 reviewed meta-explanation rows for students", () => {
  assert.equal(reviewedMetaExplanationQuestionIds.length, 98);
  assert.equal(new Set(reviewedMetaExplanationQuestionIds).size, 98);

  const reviewedQuestions = reviewedMetaExplanationQuestionIds.map((questionId) => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should remain in the runtime bank`);
    return question;
  });

  assert.deepEqual(countBy(reviewedQuestions.map((question) => question.grade)), { S1: 29, S2: 42, S3: 27 });

  reviewedQuestions.forEach((question) => {
    const visibleText = [
      question.prompt.en,
      question.prompt.zh,
      question.prompt.zhHans ?? "",
      question.explanation.en,
      question.explanation.zh,
      question.explanation.zhHans ?? "",
      ...(question.options ?? []).flatMap((option) => [option.en, option.zh, option.zhHans ?? ""])
    ].join("\n");
    const traditionalVisibleText = [
      question.prompt.zh,
      question.explanation.zh,
      ...(question.options ?? []).map((option) => option.zh)
    ].join("\n");
    assert.equal(studentVisibleMetaPattern.test(visibleText), false, `${question.id} should not expose QA meta narration`);
    assert.equal(selfCorrectionPattern.test(visibleText), false, `${question.id} should not expose internal self-correction narration`);
    assert.doesNotMatch(traditionalVisibleText, /(?:隻有|隻能|隻可|若幹|纵|併且)/u, `${question.id} should not expose context-invalid Traditional Chinese conversion`);
    assert.match(question.explanation.en, /[A-Za-z]/u, `${question.id} should have a real English explanation`);
    assert.match(question.explanation.zh, /[\u3400-\u9fff]/u, `${question.id} should have a Traditional Chinese explanation`);
    assert.doesNotMatch(question.explanation.zh, /隻(?:有|能|可)/u, `${question.id} should use 只 for a Traditional Chinese adverb`);
    assert.match(question.explanation.zhHans ?? "", /[\u3400-\u9fff]/u, `${question.id} should have a Simplified Chinese explanation`);

    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${question.id} canonical answer should grade itself`);
  });
});

test("All 17,700 Mainland runtime prompts and explanations exclude internal QA narration", () => {
  const mainlandRuntimeQuestions = questions.filter((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH");
  assert.equal(mainlandRuntimeQuestions.length, 17_700);
  assert.equal(new Set(mainlandRuntimeQuestions.map((question) => question.id)).size, 17_700);

  const violations: Array<{ questionId: string; field: "prompt" | "explanation"; locale: "en" | "zh" | "zhHans" }> = [];
  mainlandRuntimeQuestions.forEach((question) => {
    (["prompt", "explanation"] as const).forEach((field) => {
      (["en", "zh", "zhHans"] as const).forEach((locale) => {
        const visibleText = question[field][locale] ?? "";
        if (studentVisibleMetaPattern.test(visibleText) || selfCorrectionPattern.test(visibleText)) {
          violations.push({ questionId: question.id, field, locale });
        }
      });
    });
  });

  assert.deepEqual(violations, []);
});

test("Mainland BNU junior applies all 43 substantive A18 answer corrections", () => {
  assert.equal(Object.keys(substantiveExpectedAnswers).length, 43);
  Object.entries(substantiveExpectedAnswers).forEach(([questionId, expectedAnswer]) => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.equal(question.answer, expectedAnswer, `${questionId} should expose the independently adjudicated answer`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), expectedAnswer, `${questionId} metadata answer should follow the reviewed correction`);
  });
});

test("Mainland BNU junior independently repairs the artifact-missed S3-023 canonical response", () => {
  const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s3-023");
  assert.ok(question);
  assert.match(question.answer, /AB∥CD且AD∥BC/u);
  assert.doesNotMatch(question.answer, /AB∥CD（或AD∥BC/u);
  assert.equal(independentMainlandBnuJuniorAnswer(question), question.answer);
  const gradingQuestion = {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
  assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true);
  assert.equal(questionAnswerMatches(
    gradingQuestion,
    "(1) 能。理由：两组对边分别相等的四边形是平行四边形。\n(2) 不能。补充条件：AB∥CD（或AD∥BC等）。\n(3) 能。理由：对角线互相垂直且平分的四边形是菱形。\n(4) 能。理由：两组对边分别平行的四边形是平行四边形，又对角线相等，所以是矩形。"
  ), false, "the former one-parallel-pair response must not grade as complete");
});

test("Mainland BNU junior reviewed multiple-choice rows have one structural key hit", () => {
  reviewedMetaExplanationQuestionIds.forEach((questionId) => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should exist`);
    if (question.type !== "multiple-choice") return;

    const options = question.options ?? [];
    const optionText = options.map((option) => option.zhHans ?? option.zh);
    assert.equal(options.length, 4, `${questionId} should keep four options`);
    assert.equal(new Set(optionText).size, 4, `${questionId} should not contain duplicate options`);
    assert.ok(optionText.every((option) => option.trim().length > 0), `${questionId} should not contain a blank option`);

    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options
    };
    const canonicalIndex = optionText.indexOf(question.answer);
    assert.notEqual(canonicalIndex, -1, `${questionId} canonical answer should identify one stored option`);

    (["en", "zh", "zhHans"] as const).forEach((locale) => {
      const localizedOptionText = options.map((option) => option[locale] ?? "");
      assert.equal(new Set(localizedOptionText).size, 4, `${questionId} should have four distinct ${locale} options`);
      assert.ok(localizedOptionText.every((option) => option.trim().length > 0), `${questionId} should not contain a blank ${locale} option`);
      const optionHitIndices = localizedOptionText
        .map((option, index) => ({ index, matches: questionAnswerMatches(gradingQuestion, option) }))
        .filter(({ matches }) => matches)
        .map(({ index }) => index);
      assert.deepEqual(optionHitIndices, [canonicalIndex], `${questionId} should have exactly one ${locale} option matching the canonical key`);
    });
  });
});

test("Mainland BNU junior parallel-line cluster declares a complete ray order", () => {
  parallelLineContextQuestionIds.forEach((questionId) => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should exist`);
    const prompt = question.prompt.zhHans ?? question.prompt.zh;
    assert.match(prompt, /A-G-B/u, `${questionId} should declare the order on line AB`);
    assert.match(prompt, /C-H-D/u, `${questionId} should declare the order on line CD`);
    assert.match(prompt, /E-G-H-F/u, `${questionId} should declare the order on transversal EF`);
    assert.match(prompt, /A、C[^。；]*同一侧/u, `${questionId} should declare the same-side relationship`);
  });
});

test("Mainland BNU junior closes the remaining A18 parallel-line adjudications", () => {
  const byId = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  assert.equal(Object.keys(remainingParallelLineExpectedAnswers).length, 13);

  Object.entries(remainingParallelLineExpectedAnswers).forEach(([questionId, expectedAnswer]) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    const prompt = question.prompt.zhHans ?? question.prompt.zh;
    assert.match(prompt, /A-G-B/u, `${questionId} should declare the order on line AB`);
    assert.match(prompt, /C-H-D/u, `${questionId} should declare the order on line CD`);
    assert.match(prompt, /E-G-H-F/u, `${questionId} should declare the order on transversal EF`);
    assert.match(prompt, /A、C[^。；]*同一侧/u, `${questionId} should declare the same-side relationship`);
    assert.equal(question.answer, expectedAnswer, `${questionId} should expose the independently enumerated result`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), expectedAnswer);
    assert.equal(questionAnswerMatches({
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    }, question.answer), true, `${questionId} canonical should grade itself`);
  });

  const expectedMcIndexes: Record<string, number> = {
    "bnu-junior-ds-v1-s2-253": 1,
    "bnu-junior-ds-v1-s2-256": 0,
    "bnu-junior-ds-v1-s2-259": 0
  };
  Object.entries(expectedMcIndexes).forEach(([questionId, expectedIndex]) => {
    const question = byId.get(questionId);
    assert.ok(question);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    const hits = (question.options ?? []).flatMap((option, index) =>
      questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh) ? [index] : []
    );
    assert.deepEqual(hits, [expectedIndex], `${questionId} should have one real matcher option hit`);
  });

  const threeConditions = byId.get("bnu-junior-ds-v1-s2-258");
  assert.ok(threeConditions);
  const threeConditionsGrading = {
    id: threeConditions.id,
    answer: threeConditions.answer,
    accepted_answers: threeConditions.acceptedAnswers ?? null,
    options: threeConditions.options ?? null,
    prompt: threeConditions.prompt
  };
  assert.equal(questionAnswerMatches(threeConditionsGrading, "3"), true);
  assert.equal(questionAnswerMatches(threeConditionsGrading, "3个"), true);
  assert.equal(questionAnswerMatches(threeConditionsGrading, "2"), false, "the stale former scalar must be rejected");
  assert.equal(questionAnswerMatches(threeConditionsGrading, "2个"), false, "the stale former count alias must be rejected");
});

test("Mainland BNU junior speed contracts reject a same-scalar length", () => {
  const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s3-275");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(questionAnswerMatches(gradingQuestion, "48"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "48千米/时"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "48千米每小时"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "48千米"), false);
});

test("Mainland BNU junior repaired prompts remove the adjudicated contradictions", () => {
  const promptChecks: Record<string, RegExp> = {
    "bnu-junior-ds-v1-s1-028": /14[^\d]+14[^\d]+14/u,
    "bnu-junior-ds-v1-s1-138": /所有可能/u,
    "bnu-junior-ds-v1-s1-230": /70[–-]79/u,
    "bnu-junior-ds-v1-s1-311": /OA指向右方/u,
    "bnu-junior-ds-v1-s1-332": /求∠BOF/u,
    "bnu-junior-ds-v1-s2-285": /BD=CD/u,
    "bnu-junior-ds-v1-s2-291": /BD=CD/u,
    "bnu-junior-ds-v1-s2-299": /DE⊥AC/u,
    "bnu-junior-ds-v1-s3-018": /条件③成立/u,
    "bnu-junior-ds-v1-s3-033": /条件①成立/u,
    "bnu-junior-ds-v1-s3-039": /条件①成立/u,
    "bnu-junior-ds-v1-s3-231": /中心位置/u,
    "bnu-junior-ds-v1-s3-421": /OD=13/u
  };

  Object.entries(promptChecks).forEach(([questionId, pattern]) => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, pattern, `${questionId} should expose its repaired complete prompt`);
  });

  const translatedTriangle = mainlandBnuJuniorQuestions.find((question) => question.id === "bnu-junior-ds-v1-s2-382");
  assert.deepEqual(translatedTriangle?.options?.map((option) => option.zhHans ?? option.zh), [
    "点P'的横坐标比点P的横坐标大3",
    "线段A'B'的长度大于线段AB的长度",
    "三角形A'B'C'的面积是三角形ABC面积的2倍",
    "平移后点C'的坐标为(7,1)"
  ]);
  const midpointAngle = mainlandBnuJuniorQuestions.find((question) => question.id === "bnu-junior-ds-v1-s2-481");
  assert.ok(midpointAngle?.options?.some((option) => (option.zhHans ?? option.zh) === "180°"));
});

test("Mainland BNU junior recovery blockers are well-posed and have unique MC keys", () => {
  const byId = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  const commonSolid = byId.get("bnu-junior-ds-v1-s1-041");
  assert.ok(commonSolid);
  assert.match(commonSolid.prompt.zhHans ?? commonSolid.prompt.zh, /在本课学习的长方体和正方体中/u);
  assert.match(commonSolid.prompt.zhHans ?? commonSolid.prompt.zh, /哪些/u);
  assert.match(commonSolid.answer, /长方体和正方体/u);

  const expectedMcRows = [
    {
      id: "bnu-junior-ds-v1-s3-175",
      expectedIndex: 3,
      expectedOption: "AD/DB=DE/BC",
      promptPattern: /哪个条件不能/u
    },
    {
      id: "bnu-junior-ds-v1-s3-274",
      expectedIndex: 0,
      expectedOption: "该函数的图象经过点 (2, -1)",
      promptPattern: /说法正确/u
    }
  ] as const;

  expectedMcRows.forEach(({ id, expectedIndex, expectedOption, promptPattern }) => {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, promptPattern);
    assert.equal(question.answer, expectedOption);
    assert.equal(question.options?.[expectedIndex]?.zhHans ?? question.options?.[expectedIndex]?.zh, expectedOption);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    const optionHits = (question.options ?? []).map((option) =>
      questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh)
    );
    assert.deepEqual(optionHits, [0, 1, 2, 3].map((index) => index === expectedIndex), `${id} unique matcher key`);
  });

  const inverseProportion = byId.get("bnu-junior-ds-v1-s3-274");
  assert.match(inverseProportion?.options?.[2]?.zhHans ?? inverseProportion?.options?.[2]?.zh ?? "", /随 x 的增大而减小/u);
});

test("Mainland BNU junior A18 geometry closure repairs the five remaining current-source defects", () => {
  const byId = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  const get = (id: string) => {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    return question;
  };
  const grading = (question: (typeof mainlandBnuJuniorQuestions)[number]) => ({
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  });
  const assertUniqueOption = (id: string, expectedIndex: number) => {
    const question = get(id);
    const hits = (question.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(grading(question), option.zhHans ?? option.zh) ? [index] : []
    ));
    assert.deepEqual(hits, [expectedIndex], `${id} should have exactly one production matcher key`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), question.answer);
    return question;
  };

  const reflection = get("bnu-junior-ds-v1-s3-006");
  assert.match(reflection.prompt.zhHans ?? reflection.prompt.zh, /P是边AD上且不与A重合/u);
  assert.equal(reflection.answer, "3");
  assert.equal(questionAnswerMatches(grading(reflection), "3"), true);
  assert.equal(questionAnswerMatches(grading(reflection), "0"), false);
  assert.equal(questionAnswerMatches(grading(reflection), "1"), false);

  const equilateral = assertUniqueOption("bnu-junior-ds-v1-s3-007", 3);
  assert.equal(equilateral.answer, "2");
  assert.match(equilateral.explanation.zhHans ?? equilateral.explanation.zh, /E与B重合、F与D重合/u);

  const squareConditions = assertUniqueOption("bnu-junior-ds-v1-s3-013", 2);
  assert.match(squareConditions.prompt.zhHans ?? squareConditions.prompt.zh, /②∠ABC=90°；③/u);
  assert.doesNotMatch(squareConditions.prompt.zhHans ?? squareConditions.prompt.zh, /②∠ABC=90°，AB=BC/u);
  assert.deepEqual(squareConditions.options?.map((option) => option.zhHans ?? option.zh), ["①②", "②③", "③④", "①④"]);

  const sufficientSet = assertUniqueOption("bnu-junior-ds-v1-s3-019", 2);
  assert.deepEqual(sufficientSet.options?.map((option) => option.zhHans ?? option.zh), ["①③", "①③④", "①②④", "②③④"]);
  assert.equal(sufficientSet.answer, "①②④");

  const rhombusToSquare = assertUniqueOption("bnu-junior-ds-v1-s3-022", 1);
  assert.deepEqual(rhombusToSquare.options?.map((option) => option.zhHans ?? option.zh), [
    "AB = BC",
    "∠BAD = 90°",
    "OA = OC",
    "∠BAD = 60°"
  ]);
  assert.equal(rhombusToSquare.answer, "∠BAD = 90°");
});

finalBnuJuniorClosureContracts.forEach((contract) => {
  test(`Mainland BNU junior final A18 closure is complete for ${contract.id}`, () => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === contract.id);
    assert.ok(question, `${contract.id} should exist`);
    assert.equal(question.answer, contract.answer, `${contract.id} canonical answer`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), contract.answer, `${contract.id} metadata answer`);
    assert.match(question.prompt.en, /[A-Za-z]/u, `${contract.id} should have a real English prompt`);
    assert.match(question.explanation.en, /[A-Za-z]/u, `${contract.id} should have a real English explanation`);

    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${contract.id} canonical should grade itself`);
    contract.staleAnswers?.forEach((staleAnswer) => {
      assert.equal(questionAnswerMatches(gradingQuestion, staleAnswer), false, `${contract.id} should reject stale answer ${staleAnswer}`);
    });
    contract.promptPatterns?.forEach((pattern) => {
      assert.match(question.prompt.zhHans ?? question.prompt.zh, pattern, `${contract.id} repaired prompt`);
    });
    contract.explanationPatterns?.forEach((pattern) => {
      assert.match(question.explanation.zhHans ?? question.explanation.zh, pattern, `${contract.id} repaired explanation`);
    });

    if (contract.options) {
      assert.deepEqual(
        question.options?.map((option) => option.zhHans ?? option.zh),
        [...contract.options],
        `${contract.id} repaired options`
      );
    }
    if (contract.expectedOptionIndex !== undefined) {
      (["en", "zh", "zhHans"] as const).forEach((locale) => {
        const hits = (question.options ?? []).flatMap((option, index) =>
          questionAnswerMatches(gradingQuestion, option[locale] ?? "") ? [index] : []
        );
        assert.deepEqual(hits, [contract.expectedOptionIndex], `${contract.id} ${locale} option matcher hit`);
      });
    }

    if (contract.id === "bnu-junior-ds-v1-s2-266") {
      const formerDuplicate = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-260");
      assert.ok(formerDuplicate);
      assert.notEqual(question.prompt.zhHans, formerDuplicate.prompt.zhHans, `${contract.id} should be a genuinely distinct problem`);
      assert.notEqual(question.prompt.en, formerDuplicate.prompt.en, `${contract.id} should be distinct in English too`);
    }
  });
});

test("Mainland BNU junior S2-258 exposes only the three adjudicated aliases", () => {
  const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-258");
  assert.ok(question);
  assert.deepEqual(question.acceptedAnswers, ["3", "3个", "①②③"]);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  ["3", "3个", "①②③"].forEach((answer) => {
    assert.equal(questionAnswerMatches(gradingQuestion, answer), true, `S2-258 should accept ${answer}`);
  });
  ["2", "2个", "2個", "①④"].forEach((answer) => {
    assert.equal(questionAnswerMatches(gradingQuestion, answer), false, `S2-258 should reject ${answer}`);
  });
});

([
  { id: "bnu-junior-ds-v1-s2-237", canonical: "①", bare: "1" },
  { id: "bnu-junior-ds-v1-s3-039", canonical: "②", bare: "2" }
] as const).forEach(({ id, canonical, bare }) => {
  test(`Mainland BNU junior circled response ${id} preserves its raw canonical and accepts declared bare input ${bare}`, () => {
    const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === id);
    assert.ok(question);
    assert.equal(question.answer, canonical);
    assert.equal(parseScalarAnswer(canonical), null);
    assert.equal(question.acceptedAnswers?.includes(bare), true, `${id} should declare bare input ${bare}`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(gradingQuestion, canonical), true);
    assert.equal(questionAnswerMatches(gradingQuestion, bare), true, `${id} should accept declared bare input ${bare}`);
  });
});

test("Mainland BNU junior closes all remaining A18 deterministic content defects", () => {
  const byId = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  assert.equal(Object.keys(remainingA18ExpectedAnswers).length, 72);

  Object.entries(remainingA18ExpectedAnswers).forEach(([questionId, expectedAnswer]) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.equal(question.answer, expectedAnswer, `${questionId} independently adjudicated answer`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), expectedAnswer, `${questionId} metadata parity`);
    assert.equal(questionAnswerMatches({
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    }, question.answer), true, `${questionId} canonical should grade itself`);
  });

  const promptPatterns: Record<string, RegExp> = {
    "bnu-junior-ds-v1-s1-008": /翻转180°/u,
    "bnu-junior-ds-v1-s1-122": /a\+b能被45整除/u,
    "bnu-junior-ds-v1-s1-188": /是个位数字的5倍/u,
    "bnu-junior-ds-v1-s1-224": /调查日前一天/u,
    "bnu-junior-ds-v1-s1-335": /∠CON=50°/u,
    "bnu-junior-ds-v1-s1-417": /行驶200千米后/u,
    "bnu-junior-ds-v1-s2-305": /C点外侧/u,
    "bnu-junior-ds-v1-s3-209": /每个位置都有小立方块/u,
    "bnu-junior-ds-v1-s3-237": /第二层实际只有1个/u,
    "bnu-junior-ds-v1-s3-248": /连接相对顶点的长对角线[^。]*画面水平方向/u,
    "bnu-junior-ds-v1-s3-302": /∠CAB=30°，∠CBA=60°/u,
    "bnu-junior-ds-v1-s3-327": /塔西侧/u,
    "bnu-junior-ds-v1-s3-344": /∠CAB=30°，∠CBA=60°/u
  };
  Object.entries(promptPatterns).forEach(([questionId, pattern]) => {
    const question = byId.get(questionId);
    assert.ok(question);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, pattern, `${questionId} repaired prompt contract`);
  });

  assert.match(byId.get("bnu-junior-ds-v1-s2-197")?.explanation.zhHans ?? "", /3×\(7-8\)²/u);
  assert.match(byId.get("bnu-junior-ds-v1-s2-212")?.explanation.zhHans ?? "", /91\.6/u);
  assert.match(byId.get("bnu-junior-ds-v1-s3-212")?.explanation.zhHans ?? "", /对角/u);
  assert.match(byId.get("bnu-junior-ds-v1-s3-241")?.explanation.zhHans ?? "", /最大[^。]*11/u);

  const expectedMcIndexes: Record<string, number> = {
    "bnu-junior-ds-v1-s1-178": 3,
    "bnu-junior-ds-v1-s2-175": 0,
    "bnu-junior-ds-v1-s2-331": 1,
    "bnu-junior-ds-v1-s2-427": 0,
    "bnu-junior-ds-v1-s2-439": 3,
    "bnu-junior-ds-v1-s2-461": 0,
    "bnu-junior-ds-v1-s2-465": 0,
    "bnu-junior-ds-v1-s3-238": 3,
    "bnu-junior-ds-v1-s3-241": 3,
    "bnu-junior-ds-v1-s3-253": 1
  };
  Object.entries(expectedMcIndexes).forEach(([questionId, expectedIndex]) => {
    const question = byId.get(questionId);
    assert.ok(question);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    const hits = (question.options ?? []).flatMap((option, index) =>
      questionAnswerMatches(gradingQuestion, option.zhHans ?? option.zh) ? [index] : []
    );
    assert.deepEqual(hits, [expectedIndex], `${questionId} should have one semantic/scoring option key`);
  });
});

test("Mainland BNU junior compound-response contracts reject answer fragments", () => {
  const byId = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  const fragments: Record<string, string[]> = {
    "bnu-junior-ds-v1-s1-171": ["11"],
    "bnu-junior-ds-v1-s1-482": ["1/2"],
    "bnu-junior-ds-v1-s1-484": ["1/5"],
    "bnu-junior-ds-v1-s2-164": ["x=5,y=12"],
    "bnu-junior-ds-v1-s2-165": ["240"],
    "bnu-junior-ds-v1-s2-168": ["x=40,y=45"],
    "bnu-junior-ds-v1-s2-188": ["x=7,y=8"],
    "bnu-junior-ds-v1-s2-189": ["240"],
    "bnu-junior-ds-v1-s2-230": ["选甲"],
    "bnu-junior-ds-v1-s2-284": ["DE=DF"],
    "bnu-junior-ds-v1-s2-437": ["50"]
  };
  assert.equal(Object.keys(fragments).length, 11);

  Object.entries(fragments).forEach(([questionId, incompleteAnswers]) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true);
    incompleteAnswers.forEach((fragment) => {
      assert.equal(questionAnswerMatches(gradingQuestion, fragment), false, `${questionId} must reject incomplete fragment ${fragment}`);
    });
  });
});

test("BNU junior front-view dimensions accept a complete natural English explanation and reject partials", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s1-002");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(
    questionAnswerMatches(
      gradingQuestion,
      "Length 8 cm, width 3 cm. Reason: From directly ahead you see the front face, whose horizontal dimension is the prism's length (8 cm) and whose vertical dimension is the prism's height (3 cm)."
    ),
    true
  );
  assert.equal(
    questionAnswerMatches(
      gradingQuestion,
      "Length 8 cm, width 3 cm. Reason: From directly ahead you see the front face of the rectangular prism, whose horizontal dimension is the prism's length (8 cm) and whose vertical dimension is the prism's height (3 cm)."
    ),
    true
  );
  for (const incompleteOrWrong of [
    "Length 8 cm, width 3 cm.",
    "From directly ahead you see the front face.",
    "Length 8 cm, width 5 cm. Reason: The front face uses the prism's length and width."
  ]) {
    assert.equal(questionAnswerMatches(gradingQuestion, incompleteOrWrong), false, incompleteOrWrong);
  }
});

test("BNU junior cube-count range accepts both requested English fields and rejects partials", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s1-006");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(questionAnswerMatches(gradingQuestion, "Minimum 4, maximum 8"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "Minimum 4"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "Maximum 8"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "Minimum 4, maximum 7"), false);
});

test("BNU junior variable and probability compound responses accept complete English forms only", () => {
  const cases = [
    {
      id: "bnu-junior-ds-v1-s1-378",
      complete: "Q = 40 - 5t; independent variable is t, dependent variable is Q",
      partials: ["Q = 40 - 5t", "independent variable is t, dependent variable is Q"]
    },
    {
      id: "bnu-junior-ds-v1-s1-460",
      complete: "25 equally likely ordered pairs in total; 9 cases where both draws are red balls.",
      partials: ["25 equally likely ordered pairs in total", "9 cases where both draws are red balls"]
    }
  ];
  for (const { id, complete, partials } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(gradingQuestion, complete), true, id);
    for (const partial of partials) {
      assert.equal(questionAnswerMatches(gradingQuestion, partial), false, `${id}: ${partial}`);
    }
  }
});

test("BNU junior average-speed grading accepts a consistent exact-plus-rounded English answer", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s1-380");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(questionAnswerMatches(gradingQuestion, "200/3 m/min (≈66.7 m/min)"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "200/3 m/min (≈66.8 m/min)"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "200/3 cm/min (≈66.7 cm/min)"), false);
});

test("BNU junior time-distance table accepts all three requested English fields and rejects subsets", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s1-381");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "(1) independent variable t, dependent variable s; (2) 30 km/h; (3) s = 120 - 30t";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  for (const partialOrWrong of [
    "(1) independent variable t, dependent variable s",
    "(2) 30 km/h; (3) s = 120 - 30t",
    "(1) independent variable t, dependent variable s; (2) 30 km/h; (3) s = 120 + 30t"
  ]) {
    assert.equal(questionAnswerMatches(gradingQuestion, partialOrWrong), false, partialOrWrong);
  }
});

test("BNU junior stepped taxi fare accepts the complete English model and prediction only", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s1-383");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "(1) y = 8 + 1.5⌈x-3⌉ (x≥3); (2) 17 yuan";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "y = 8 + 1.5⌈x-3⌉ (x≥3)"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "17 yuan"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "(1) y = 8 + 1.5(x-3); (2) 15.95 yuan"), false);
});

test("BNU junior real-number reasoning and piecewise fare accept complete provider English forms", () => {
  const realNumber = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-043");
  assert.ok(realNumber);
  const realNumberGrading = {
    id: realNumber.id,
    answer: realNumber.answer,
    accepted_answers: realNumber.acceptedAnswers ?? null,
    options: realNumber.options ?? null,
    prompt: realNumber.prompt
  };
  assert.equal(questionAnswerMatches(realNumberGrading, "a is an irrational number (a = √20 = 2√5)"), true);
  assert.equal(questionAnswerMatches(realNumberGrading, "a is a rational number (a = √20)"), false);

  const fare = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-125");
  assert.ok(fare);
  const fareGrading = {
    id: fare.id,
    answer: fare.answer,
    accepted_answers: fare.acceptedAnswers ?? null,
    options: fare.options ?? null,
    prompt: fare.prompt
  };
  const complete = "When 0 ≤ x ≤ 3, y = 8; when x > 3, y = 8 + 1.5 × ⌈x - 3⌉. At x = 7.8: 7.8 - 3 = 4.8, ceil = 5, fare = 8 + 1.5×5 = 15.5 yuan.";
  assert.equal(questionAnswerMatches(fareGrading, complete), true);
  assert.equal(questionAnswerMatches(fareGrading, "When 0 ≤ x ≤ 3, y = 8; when x > 3, y = 8 + 1.5 × ⌈x - 3⌉."), false);
  assert.equal(questionAnswerMatches(fareGrading, "15.5 yuan"), false);
});

test("BNU junior radical ordering accepts the complete English order-classification-reason contract", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-047");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "√5<2.5<√7; √5 is an irrational number because it is a non-terminating, non-repeating decimal.";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "√5<2.5<√7"), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "√5 is an irrational number because it is a non-terminating, non-repeating decimal."), false);
});

test("BNU junior three-part real-number response accepts every requested English result and reason", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-041");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "(1) -√3, √5, and √8 are all irrational numbers, since each is a non-terminating, non-repeating decimal. (2) √5 lies between 2 and 3 because 2²=4<5<9=3². (3) -√3<√5 because a negative number is less than a positive number.";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  for (const partial of [
    "(1) -√3, √5, and √8 are all irrational numbers.",
    "(2) √5 lies between 2 and 3 because 2²=4<5<9=3².",
    "(3) -√3<√5 because a negative number is less than a positive number."
  ]) {
    assert.equal(questionAnswerMatches(gradingQuestion, partial), false, partial);
  }
});

test("BNU junior parallel-line proof accepts the complete independently derived English explanation", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-236");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options
  };

  assert.equal(
    questionAnswerMatches(
      gradingQuestion,
      "AB∥CD. Because ∠AGE and ∠GHC are corresponding angles and both equal 70°, so the two lines are parallel."
    ),
    true
  );
  assert.equal(questionAnswerMatches(gradingQuestion, "AB∥CD."), false);
  assert.equal(
    questionAnswerMatches(gradingQuestion, "∠AGE and ∠GHC are corresponding angles and both equal 70°."),
    false
  );
  assert.equal(
    questionAnswerMatches(
      gradingQuestion,
      "AB is not parallel to CD because the two corresponding angles are equal."
    ),
    false
  );
});

test("BNU junior systems and variance accept complete independently verified English responses", () => {
  const cases = [
    {
      id: "bnu-junior-ds-v1-s2-164",
      complete: "x + y = 17, 8x + 5y = 100; x = 5, y = 12",
      partials: ["x + y = 17, 8x + 5y = 100", "x = 5, y = 12"]
    },
    {
      id: "bnu-junior-ds-v1-s2-197",
      complete: "Jia's variance is 0.6, Yi's variance is 2.0, and Jia's performance is more consistent.",
      partials: ["Jia's variance is 0.6, Yi's variance is 2.0", "Jia's performance is more consistent."]
    }
  ];
  for (const { id, complete, partials } of cases) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(questionAnswerMatches(gradingQuestion, complete), true, id);
    for (const partial of partials) {
      assert.equal(questionAnswerMatches(gradingQuestion, partial), false, `${id}: ${partial}`);
    }
  }
});

test("BNU junior plant-height comparison accepts both means, both variances, and the conclusion", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-200");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "Both Jia and Yi have mean height 86 cm; Jia's variance is 2.0 and Yi's variance is 6.0, so Jia's plant heights are more uniform.";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  for (const partial of [
    "Both Jia and Yi have mean height 86 cm.",
    "Jia's variance is 2.0 and Yi's variance is 6.0.",
    "Jia's plant heights are more uniform."
  ]) {
    assert.equal(questionAnswerMatches(gradingQuestion, partial), false, partial);
  }
});

test("BNU junior athlete selection accepts recommendation, means, variances, and consistency reason", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s2-203");
  assert.ok(question);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  const complete = "Recommend A (Jia). A's mean is 9 and variance is 0.4; B's mean is 9 and variance is 1.6; A is more consistent.";
  assert.equal(questionAnswerMatches(gradingQuestion, complete), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "Recommend A (Jia)."), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "A's mean is 9 and variance is 0.4; B's mean is 9 and variance is 1.6."), false);
  assert.equal(questionAnswerMatches(gradingQuestion, "Recommend B (Yi). A's mean is 9 and variance is 0.4; B's mean is 9 and variance is 1.6; B is more consistent."), false);
});

test("BNU junior s3-104 asks only for the probability that its single-field scorer accepts", () => {
  const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s3-104");
  assert.ok(question);
  const expectedPrompt = "一个不透明的袋子里装有4个红球和1个蓝球，这些球除颜色外完全相同。小刚从袋子里随机摸出一个球，记录颜色后放回并摇匀，然后再随机摸出一个球。求两次摸球中至少有一次摸出红球的概率。";
  const expectedExplanation = "把每个球视为一个等可能结果。两次有放回摸球共有5×5=25个等可能的有序结果；两次都摸到蓝球只有1个结果，所以至少一次摸到红球有25-1=24个结果，概率为24/25。";
  assert.equal(question.prompt.zhHans, expectedPrompt);
  assert.doesNotMatch(question.prompt.zhHans, /列出/u);
  assert.equal(question.explanation.zhHans, expectedExplanation);
  assert.match(question.explanation.zhHans, /5×5=25/u);
  assert.match(question.explanation.zhHans, /25-1=24/u);
  assert.equal(question.answer, "24/25");
  assert.deepEqual(question.acceptedAnswers, ["24/25", "0.96"]);

  const approved = (approvedQuestionPackJson.questions as Array<{
    id: string;
    promptZhHans: string;
    answer: string;
    acceptedAnswers: string[];
    explanationZhHans: string;
  }>).find((candidate) => candidate.id === question.id);
  assert.ok(approved);
  assert.equal(approved.promptZhHans, expectedPrompt);
  assert.equal(approved.explanationZhHans, expectedExplanation);
  assert.equal(approved.answer, question.answer);
  assert.deepEqual(approved.acceptedAnswers, question.acceptedAnswers);

  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(questionAnswerMatches(gradingQuestion, "24/25"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "0.96"), true);
});

test("Mainland BNU junior compares triangle angles under the valid vertex correspondence", () => {
  const question = mainlandBnuJuniorQuestions.find((candidate) => candidate.id === "bnu-junior-ds-v1-s3-173");
  assert.ok(question);
  assert.match(question.answer, /^相似/u);
  assert.match(question.answer, /△ABC∽△DFE/u);
  assert.match(question.answer, /∠B=∠F/u);
  assert.doesNotMatch(question.answer, /^不相似/u);
  const gradingQuestion = {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
  assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "相似"), false, "the requested reason must not be omitted");
});
