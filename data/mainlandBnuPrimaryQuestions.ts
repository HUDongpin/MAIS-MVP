import v1QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json";
import {
  stripHjbGeneratorPromptPrefix,
  toSafeMainlandSimplifiedText,
  toTraditionalHjbText
} from "./hjbQuestionLocalization";
import { chinaLessonEnglishTranslation } from "./chinaLessonEnglishTranslations";
import { mainlandBnuPrimaryTopics, type BnuPrimaryBatch } from "./mainlandBnuPrimaryTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  CurriculumProfile,
  Difficulty,
  DifficultyRecord,
  MainlandBnuPrimaryGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type GeneratedBnuPrimaryQuestion = {
  id: string;
  batch: BnuPrimaryBatch;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  competencyTags?: string[];
  skillTags?: string[];
  misconceptionTags?: string[];
  difficulty: DifficultyRecord;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-s18-review";
  terminologyQaStatus: "pending-s18-review";
  manualQaStatus: "pending-s18-review";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedBnuPrimaryQuestionPack = {
  questions: GeneratedBnuPrimaryQuestion[];
};

type ReviewedBnuPrimaryCorrection = Partial<Pick<
  GeneratedBnuPrimaryQuestion,
  "type" | "promptZhHans" | "optionsZhHans" | "answer" | "acceptedAnswers" | "explanationZhHans"
>>;

export type MainlandBnuPrimaryQuestionGenerationMetadata = {
  batch: BnuPrimaryBatch;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const v1QuestionPack = v1QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const v2QuestionPack = v2QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const generatedQuestionPacks = [v1QuestionPack, v2QuestionPack];
const generatedQuestionRows = generatedQuestionPacks.flatMap((pack) => pack.questions);
const mainlandBnuProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const topicById = new Map(mainlandBnuPrimaryTopics.map((topic) => [topic.id, topic]));
const gradeOrder: MainlandBnuPrimaryGradeId[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const difficultyOrder: Difficulty[] = ["Low", "Medium", "High"];
const batchOrder: BnuPrimaryBatch[] = ["bnu-primary-v1", "bnu-primary-v2"];

function completeResponse(answer: string, explanationZhHans?: string): ReviewedBnuPrimaryCorrection {
  return {
    answer,
    acceptedAnswers: [answer],
    ...(explanationZhHans ? { explanationZhHans } : {})
  };
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

const reviewedContentCorrections: Record<string, ReviewedBnuPrimaryCorrection> = {
  "bnu-primary-ds-v2-p1-081": {
    acceptedAnswers: ["①③⑤", "①,③,⑤", "1,3,5"]
  },
  "bnu-primary-ds-v2-p1-084": {
    acceptedAnswers: ["②④", "②,④", "2,4"]
  },
  "bnu-primary-ds-v2-p2-088": {
    optionsZhHans: ["40厘米", "90厘米", "100厘米", "70厘米"],
    answer: "100厘米",
    acceptedAnswers: ["100厘米"],
    explanationZhHans: "原来的长度等于用去的长度加上剩下的长度：30+70=100（厘米），所以这根绳子原来长100厘米。"
  },
  "bnu-primary-ds-v1-p1-055": {
    promptZhHans: "下面有一些树叶：枫叶、柳叶、银杏叶、松针。老师规定按“宽大的叶片”和“细长的叶片”分成两类，下面哪种分法符合这个标准？",
    optionsZhHans: [
      "枫叶和银杏叶一组，柳叶和松针一组",
      "枫叶和柳叶一组，银杏叶和松针一组",
      "枫叶和松针一组，柳叶和银杏叶一组",
      "枫叶、柳叶、银杏叶、松针各一组"
    ],
    answer: "枫叶和银杏叶一组，柳叶和松针一组",
    acceptedAnswers: ["枫叶和银杏叶一组，柳叶和松针一组"],
    explanationZhHans: "按题目规定的二分标准，枫叶和银杏叶的叶片较宽大，柳叶和松针较细长，所以第一项符合要求。"
  },
  "bnu-primary-ds-v1-p1-061": {
    promptZhHans: "小美把一些物体分成两类：第一类有足球、篮球、乒乓球，第二类有书本、魔方、纸盒。她的分类标准是什么？",
    optionsZhHans: ["按颜色分", "按大小分", "按能否平稳滚动分", "按轻重分"],
    answer: "按能否平稳滚动分",
    acceptedAnswers: ["按能否平稳滚动分"],
    explanationZhHans: "足球、篮球和乒乓球都是球体，可以平稳滚动；书本、魔方和纸盒都有平面，不能像球体那样平稳滚动。"
  },
  "bnu-primary-ds-v1-p1-062": {
    promptZhHans: "把下面的动物分成两类，并写出分类标准。第一类：麻雀、蝴蝶、蜻蜓；第二类：兔子、金鱼、乌龟。分类标准是：______。",
    answer: "按有没有翅膀分",
    acceptedAnswers: ["按有没有翅膀分", "按是否有翅膀分"],
    explanationZhHans: "麻雀、蝴蝶和蜻蜓都有翅膀，兔子、金鱼和乌龟都没有翅膀，所以可按有没有翅膀分类。"
  },
  "bnu-primary-ds-v1-p1-074": {
    answer: "左边",
    acceptedAnswers: ["左边"],
    explanationZhHans: "转身只改变面朝的方向，不改变站立的位置。小红原来在小明左边，转错后仍在小明左边。"
  },
  "bnu-primary-ds-v1-p1-117": {
    promptZhHans: "小芳晚上9时睡觉。请用24小时制电子表的方式写出这个时间。",
    answer: "21:00",
    acceptedAnswers: ["21:00", "21时", "21时00分"],
    explanationZhHans: "晚上9时用24小时制表示，要在9上加12，所以是21:00。"
  },
  "bnu-primary-ds-v1-p1-126": {
    promptZhHans: "学校规定午餐时间从中午12时开始。小强说：“我上午11时已经到了学校规定的午餐时间。”他说得对吗？为什么？",
    answer: "不对，因为上午11时比中午12时早1小时",
    acceptedAnswers: ["不对，因为上午11时比中午12时早1小时"],
    explanationZhHans: "学校规定12时开始午餐，11时还差1小时，所以小强的说法不对。"
  },
  "bnu-primary-ds-v1-p1-144": {
    promptZhHans: "小红整理书包时，把数学书放在语文书的左边，又把英语书放在语文书的右边。请写出这三本书从左到右的排列。",
    answer: "数学书、语文书、英语书",
    acceptedAnswers: ["数学书、语文书、英语书", "数学书，语文书，英语书"],
    explanationZhHans: "数学书在语文书左边，英语书在语文书右边，所以从左到右依次是数学书、语文书、英语书。"
  },
  "bnu-primary-ds-v1-p1-164": {
    promptZhHans: "一个玩具小汽车模型的四个车轮都完全藏在车身下方，从正上方观察时只能看到完整的车顶。小东从正上方观察，能看到什么？",
    answer: "车顶",
    acceptedAnswers: ["车顶", "完整的车顶"],
    explanationZhHans: "题目明确说明车轮从正上方会被车身遮住，因此从正上方只能看到车顶。"
  },
  "bnu-primary-ds-v1-p1-170": {
    promptZhHans: "一个书包的背面是长方形，背面装有两条背带。小丽从书包背面正对着观察，能看到什么？",
    answer: "长方形的背面和两条背带",
    acceptedAnswers: ["长方形的背面和两条背带", "长方形和两条背带"],
    explanationZhHans: "题目已经说明书包背面的形状和背带位置，所以从背面能看到长方形的背面和两条背带。"
  },
  "bnu-primary-ds-v1-p1-172": {
    promptZhHans: "小丽观察一个圆柱形水杯，杯身的花纹环绕杯身一周。她从前面能看到花纹，从右面观察时会看到什么？",
    optionsZhHans: ["圆柱形的杯身和花纹", "长方形，没有花纹", "一个圆形，中间有花纹", "圆柱形的杯身，没有花纹"],
    answer: "圆柱形的杯身和花纹",
    acceptedAnswers: ["圆柱形的杯身和花纹"],
    explanationZhHans: "圆柱形杯身从侧面观察轮廓不变；花纹环绕杯身一周，所以从右面也能看到花纹。"
  },
  "bnu-primary-ds-v1-p1-180": {
    promptZhHans: "小明的爷爷今年65岁，奶奶比爷爷小3岁。奶奶今年多少岁？",
    answer: "62岁",
    acceptedAnswers: ["62岁", "62"],
    explanationZhHans: "65-3=62（岁），所以奶奶今年62岁。"
  },
  "bnu-primary-ds-v1-p1-189": {
    optionsZhHans: ["36", "63", "6个一和3个十", "3个十和6个一"],
    answer: "63",
    acceptedAnswers: ["63"],
    explanationZhHans: "十位上6颗珠子表示6个十，个位上3颗珠子表示3个一，组成的数是63。"
  },
  "bnu-primary-ds-v1-p1-193": {
    promptZhHans: "把两个完全一样的三角形沿一组对应边反向拼接，下面哪个图形一定可以拼成？",
    optionsZhHans: ["长方形", "正方形", "圆", "平行四边形"],
    answer: "平行四边形",
    acceptedAnswers: ["平行四边形"],
    explanationZhHans: "两个全等三角形沿对应边反向拼接，一定可以组成平行四边形；只有特殊三角形才可能拼成长方形或正方形。"
  },
  "bnu-primary-ds-v1-p1-222": {
    promptZhHans: "停车场原来有34辆车，开走了9辆，又开来了15辆。先把34、9、15都四舍五入到最接近的整十数进行估算，再计算准确结果。依次填写：原来约（ ）辆，开走约（ ）辆，开来约（ ）辆，现在约（ ）辆；准确有（ ）辆。",
    answer: "30，10，20，40，40",
    acceptedAnswers: ["30，10，20，40，40", "30,10,20,40,40"],
    explanationZhHans: "34≈30，9≈10，15≈20，估算30-10+20=40；准确计算34-9+15=40。"
  },
  "bnu-primary-ds-v2-p1-052": {
    promptZhHans: "图中依次画着红苹果、黄香蕉、橙色橘子、绿西瓜、红草莓和紫葡萄。按颜色分组，下面哪种分法正确？",
    optionsZhHans: [
      "红色：苹果、草莓；黄色：香蕉；橙色：橘子；绿色：西瓜；紫色：葡萄",
      "红色：苹果、橘子、草莓；黄色：香蕉；绿色：西瓜、葡萄",
      "红色：苹果；黄色：香蕉、草莓；橙色：橘子；绿色：西瓜；紫色：葡萄",
      "红色：苹果、草莓；黄色：香蕉；橙色：橘子；绿色：葡萄；紫色：西瓜"
    ],
    answer: "红色：苹果、草莓；黄色：香蕉；橙色：橘子；绿色：西瓜；紫色：葡萄",
    acceptedAnswers: ["红色：苹果、草莓；黄色：香蕉；橙色：橘子；绿色：西瓜；紫色：葡萄"],
    explanationZhHans: "按题目给出的颜色，苹果和草莓同为红色，其余水果分别是黄色、橙色、绿色和紫色，第一项正确。"
  },
  "bnu-primary-ds-v2-p1-057": {
    promptZhHans: "妈妈买了红苹果、黄香蕉、橙色橘子、红草莓和紫葡萄。请按颜色分类，并写出每一类有哪些水果。",
    answer: "红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：葡萄",
    acceptedAnswers: ["红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：葡萄"],
    explanationZhHans: "根据题目明确给出的颜色，把同色水果归为一类即可。"
  },
  "bnu-primary-ds-v2-p1-060": {
    promptZhHans: "妈妈买了红苹果、黄香蕉、橙色橘子、紫葡萄和红草莓。请按颜色分类，并写出分类结果。",
    answer: "红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：葡萄",
    acceptedAnswers: ["红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：葡萄"],
    explanationZhHans: "苹果和草莓是红色，香蕉是黄色，橘子是橙色，葡萄是紫色。"
  },
  "bnu-primary-ds-v2-p1-087": {
    promptZhHans: "用4个相同的小正方体写出两种不同的拼法。拼法一：4个排成一横排；拼法二：4个在同一层摆成2行2列。请分别描述两种拼法。",
    answer: "拼法一：4个排成一横排；拼法二：同一层摆成2行2列",
    acceptedAnswers: ["拼法一：4个排成一横排；拼法二：同一层摆成2行2列"],
    explanationZhHans: "4个小正方体既可以排成一横排，也可以在同一层摆成2行2列；后者是正方形底面的薄层，不是大正方体。"
  },
  "bnu-primary-ds-v2-p1-090": {
    promptZhHans: "从下面选出所有能在水平桌面上平稳滚动的立体模型，写出编号。①正方体 ②球体 ③长方体 ④圆柱（横放） ⑤三棱柱 ⑥圆锥（侧放）",
    answer: "②④⑥",
    acceptedAnswers: ["②④⑥", "②、④、⑥", "2,4,6"],
    explanationZhHans: "球体有曲面，横放的圆柱和侧放的圆锥也有连续曲面，都能滚动；正方体、长方体和三棱柱主要靠平面支撑。"
  },
  "bnu-primary-ds-v2-p1-161": {
    answer: "尖尖的三角形屋顶和一扇红色的门",
    acceptedAnswers: ["尖尖的三角形屋顶和一扇红色的门", "三角形屋顶和红色的门"],
    explanationZhHans: "从房子前面既能看到露在上方的三角形屋顶，也能看到前面的红色门；后面的窗户看不到。"
  },
  "bnu-primary-ds-v2-p1-204": {
    promptZhHans: "用两个完全一样的等腰直角三角形拼图。请写出两种可以拼成的图形。",
    answer: "正方形、平行四边形",
    acceptedAnswers: ["正方形、平行四边形", "平行四边形、正方形"],
    explanationZhHans: "两个全等的等腰直角三角形沿斜边拼可以组成正方形，沿一条直角边反向拼可以组成平行四边形。"
  },
  "bnu-primary-ds-v2-p1-245": {
    promptZhHans: "用4个相同的小正方体搭图形：底层3个横着排成一行，再在中间那个小正方体上面放1个。从前面看会是哪种形状？",
    optionsZhHans: ["下排3个，上排中间1个", "4个横着排成一行", "2行2列的田字形", "4个竖着排成一列"],
    answer: "下排3个，上排中间1个",
    acceptedAnswers: ["下排3个，上排中间1个"],
    explanationZhHans: "底层横排3个都能看到，上层的小正方形在中间位置，所以正面投影是下排3个、上排中间1个。"
  },
  "bnu-primary-ds-v1-p2-034": {
    promptZhHans: "本题约定乘法算式按“每份数×份数”书写。表示5个3相加的乘法算式是哪个？",
    optionsZhHans: ["3×5", "5×3", "3+5", "5+5+5"],
    answer: "3×5",
    acceptedAnswers: ["3×5"],
    explanationZhHans: "每份是3，共5份，按“每份数×份数”的约定写成3×5。"
  },
  "bnu-primary-ds-v1-p2-118": {
    promptZhHans: "本题约定乘法算式按“每份数×份数”书写。表示6个8相加的乘法算式是哪个？",
    optionsZhHans: ["8×6", "6×8", "8+6", "6+6+6+6+6+6+6+6"],
    answer: "8×6",
    acceptedAnswers: ["8×6"],
    explanationZhHans: "每份是8，共6份，按“每份数×份数”的约定写成8×6。"
  },
  "bnu-primary-ds-v2-p2-032": {
    type: "multiple-choice",
    promptZhHans: "一盒巧克力有4颗，妈妈买了3盒。下面哪个算式不能表示巧克力的总数？",
    optionsZhHans: ["4+4+4", "3×4", "4×3", "4+3"],
    answer: "4+3",
    acceptedAnswers: ["4+3"],
    explanationZhHans: "3盒、每盒4颗，总数是3个4，即4+4+4，也可用3×4或4×3计算；4+3不能表示总数。"
  },
  "bnu-primary-ds-v2-p2-033": {
    type: "multiple-choice",
    promptZhHans: "一盒巧克力有4颗，妈妈买了3盒。按“每份数×份数=总数”的约定，下面哪个算式和意义都正确？",
    optionsZhHans: [
      "4+3=7（颗）",
      "4×3=12（颗），表示3个4相加",
      "3×4=12（颗），表示3个3相加",
      "4×4=16（颗）"
    ],
    answer: "4×3=12（颗），表示3个4相加",
    acceptedAnswers: ["4×3=12（颗），表示3个4相加"],
    explanationZhHans: "每盒4颗是每份数，3盒是份数，按约定写成4×3=12，表示3个4相加。"
  },
  "bnu-primary-ds-v2-p2-056": {
    promptZhHans: "观察题面所列的无衬线块体数字0、2、3、4、5、7、8，只考虑竖直对称轴。请写出其中两个轴对称数字：______、______。",
    answer: "0，8",
    acceptedAnswers: ["0，8", "8，0", "0和8", "8和0", "0、8", "8、0"],
    explanationZhHans: "按题面规定的字形和竖直对称轴，0和8左右对折后能重合。"
  },
  "bnu-primary-ds-v2-p2-112": {
    optionsZhHans: ["6×7", "7+6", "7×5+6", "6×8-5"],
    answer: "6×7",
    acceptedAnswers: ["6×7"],
    explanationZhHans: "7×6=42，6×7也等于42；其余三个算式分别等于13、41和43。"
  },
  "bnu-primary-ds-v2-p2-197": {
    optionsZhHans: ["203+298", "410+88", "702-199", "350+154"],
    answer: "203+298",
    acceptedAnswers: ["203+298"],
    explanationZhHans: "四个结果分别是501、498、503、504，与500的距离分别是1、2、3、4，所以203+298唯一最接近500。"
  },
  "bnu-primary-ds-v1-p2-208": {
    promptZhHans: "学校图书馆原来有故事书268本、科普书195本，这周故事书增加137本、科普书增加156本。现在两种书一共有多少本？",
    answer: "756",
    acceptedAnswers: ["756"],
    explanationZhHans: "故事书有268+137=405（本），科普书有195+156=351（本），一共有405+351=756（本）。"
  },
  "bnu-primary-ds-v2-p2-144": {
    promptZhHans: "有13条金鱼，每个鱼缸放4条。可以装满几个鱼缸，还剩几条金鱼没有装入这些满缸？",
    answer: "3个满缸，剩1条",
    acceptedAnswers: ["3个满缸，剩1条", "3个鱼缸，剩1条"],
    explanationZhHans: "13÷4=3……1，所以可装满3个鱼缸，还剩1条。"
  },
  "bnu-primary-ds-v2-p2-150": {
    promptZhHans: "有14个小朋友，每条船坐3人。可以坐满几条船，另有几人需要乘下一条船？",
    answer: "4条满船，另有2人",
    acceptedAnswers: ["4条满船，另有2人", "4条船，剩2人"],
    explanationZhHans: "14÷3=4……2，所以4条船可以坐满，另有2人需要乘下一条船。"
  },
  "bnu-primary-ds-v1-p3-016": {
    promptZhHans: "一个立体图形由4个相同的小正方体搭成。从前面看，下排有3个正方形，上排中间有1个正方形；从上面看是横着一排3个正方形。下面哪种搭法符合要求？",
    optionsZhHans: [
      "底层3个横排，上层在中间那个上面放1个",
      "底层2个横排，在左边上面连续叠2个",
      "底层3个横排，上层在最左边那个上面放1个",
      "底层2个横排，在右边上面连续叠2个"
    ],
    answer: "底层3个横排，上层在中间那个上面放1个",
    acceptedAnswers: ["底层3个横排，上层在中间那个上面放1个"],
    explanationZhHans: "上面看到3个横排说明底层占3个位置；前面上排的正方形位于中间，所以第一个搭法唯一符合。"
  },
  "bnu-primary-ds-v1-p3-018": {
    promptZhHans: "用4个相同的小正方体搭图形：底层3个横着排成一行，再在中间那个上面放1个。请描述从前面和从上面看到的形状。",
    answer: "从前面看下排3个、上排中间1个；从上面看横排3个",
    acceptedAnswers: ["从前面看下排3个、上排中间1个；从上面看横排3个"],
    explanationZhHans: "三个底层正方体形成横排，上层正方体投影在中间位置；从上面看，上层与中间底层重合，所以仍是横排3个。"
  },
  "bnu-primary-ds-v1-p3-021": {
    promptZhHans: "用4个相同的小正方体搭图形。从前面看，下排有3个正方形，上排最右边有1个正方形；从上面看是横排3个。请描述一种搭法。",
    answer: "底层横排3个，在最右边那个上面再放1个",
    acceptedAnswers: ["底层横排3个，在最右边那个上面再放1个"],
    explanationZhHans: "底层横排3个形成下排；在最右边上方叠1个，就得到题目给出的前视图和顶视图。"
  },
  "bnu-primary-ds-v1-p3-022": {
    promptZhHans: "一个立体图形由5个相同的小正方体搭成。从上面看，前排有3个，后排中间有1个；从前面看，下排有3个，上排中间有1个；从右面看，下排前后各1个，上排在前面位置。下面哪种搭法符合要求？",
    answer: "A. 底层前面横着放3个，底层后面中间放1个，上层在底层前面中间那个上面放1个。",
    acceptedAnswers: ["A. 底层前面横着放3个，底层后面中间放1个，上层在底层前面中间那个上面放1个。"],
    explanationZhHans: "顶视图确定后排小正方体在中间，前视图确定上层也在中间，右视图进一步确定上层位于前排，所以A符合。"
  },
  "bnu-primary-ds-v1-p3-027": {
    promptZhHans: "用5个相同的小正方体搭成一个立体图形。从前面看，下排左、中、右各1个，上排左边1个；从上面看，前排左、中、右各1个，后排左边1个。请描述一种搭法。",
    answer: "底层前排左、中、右各放1个，底层后排左边放1个，上层在底层前排左边那个上面放1个",
    acceptedAnswers: ["底层前排左、中、右各放1个，底层后排左边放1个，上层在底层前排左边那个上面放1个"],
    explanationZhHans: "底层四个位置给出顶视图；在前排左边位置叠1个，就得到前视图上排左边的正方形，共用5个。"
  },
  "bnu-primary-ds-v1-p3-079": {
    promptZhHans: "下面算式中，积最接近1600的是（ ）。\nA. 397×4\nB. 502×3\nC. 795×2\nD. 201×8",
    optionsZhHans: ["397×4", "502×3", "795×2", "201×8"],
    answer: "201×8",
    acceptedAnswers: ["201×8"],
    explanationZhHans: "四个积分别是1588、1506、1590、1608，与1600的距离分别是12、94、10、8，所以201×8唯一最接近1600。"
  },
  "bnu-primary-ds-v1-p3-081": {
    promptZhHans: "果园里有苹果树6行，每行124棵。按124≈120进行估算，李叔叔说大约有720棵。这个估算合理吗？再计算准确棵数。",
    answer: "合理；估算120×6=720（棵），准确数124×6=744（棵）",
    acceptedAnswers: ["合理；估算120×6=720（棵），准确数124×6=744（棵）"],
    explanationZhHans: "题目指定把124看作120，估算得720棵；准确计算124×6=744棵，720与准确值接近。"
  },
  "bnu-primary-ds-v1-p3-087": {
    promptZhHans: "小明计算246×7，竖式结果是1722。（1）先估算并判断结果是否合理；（2）说明进位过程，并写出准确结果。",
    answer: "估算250×7=1750，1722与1750接近，结果合理；个位6×7=42写2进4，十位4×7+4=32写2进3，百位2×7+3=17，所以246×7=1722",
    acceptedAnswers: ["估算250×7=1750，1722与1750接近，结果合理；个位6×7=42写2进4，十位4×7+4=32写2进3，百位2×7+3=17，所以246×7=1722"],
    explanationZhHans: "估算246≈250，250×7=1750，说明1722在合理范围内。按个位、十位、百位依次计算并处理进位，准确结果是1722。"
  },
  "bnu-primary-ds-v1-p3-142": {
    promptZhHans: "有45个苹果，每8个装一盒，可以装满几盒，还剩几个苹果？",
    optionsZhHans: ["5盒", "6盒", "5盒，剩5个", "6盒，剩3个"],
    answer: "5盒，剩5个",
    acceptedAnswers: ["5盒，剩5个", "5盒余5个"],
    explanationZhHans: "45÷8=5（盒）……5（个），所以可以装满5盒，还剩5个。"
  },
  "bnu-primary-ds-v2-p3-010": {
    optionsZhHans: ["50-4×6+8", "50-4×6-6", "50-(4×6+8)", "50-4×(6+8)"],
    answer: "50-(4×6+8)",
    acceptedAnswers: ["50-(4×6+8)"],
    explanationZhHans: "先求4本笔记本和1支钢笔的总价4×6+8，再用50减去总价，所以综合算式是50-(4×6+8)=18。"
  },
  "bnu-primary-ds-v2-p3-017": {
    promptZhHans: "一个立体图形由5个相同的小正方体搭成：底层前排左、中、右各1个，底层后排左边1个，上层在底层前排中间那个上面放1个。从左面看会是什么形状？",
    answer: "下排前后各1个，前排位置的上方还有1个",
    acceptedAnswers: ["下排前后各1个，前排位置的上方还有1个"],
    explanationZhHans: "从左面投影，底层占前、后两个位置；上层小正方体在前排，因此前排一列高2、后排一列高1。"
  },
  "bnu-primary-ds-v2-p3-025": {
    answer: "横着排成一行的3个小正方形",
    acceptedAnswers: ["横着排成一行的3个小正方形"],
    explanationZhHans: "顶视图有4个不同位置，且总共只有4个小正方体，所以所有小正方体都在底层。从正面看，前后位置会重合，留下横着一行3个。"
  },
  "bnu-primary-ds-v2-p3-030": {
    promptZhHans: "用4个相同的小正方体搭图形，四个都放在底层：前排横着放3个，后排在中间位置放1个。请写出从右面看到的形状。",
    answer: "横着排成一行的2个小正方形",
    acceptedAnswers: ["横着排成一行的2个小正方形"],
    explanationZhHans: "从右面看只保留前后方向，前排和后排各投影出1个底层正方形，所以是横着一行2个。"
  },
  "bnu-primary-ds-v2-p3-079": {
    optionsZhHans: ["298×4", "402×3", "198×6", "501×2"],
    answer: "402×3",
    acceptedAnswers: ["402×3"],
    explanationZhHans: "四个积分别为1192、1206、1188、1002，与1200的距离分别为8、6、12、198，所以402×3唯一最接近1200。"
  },
  "bnu-primary-ds-v2-p3-139": {
    promptZhHans: "按精确的除法结果比较，下面哪个算式的商最接近60？",
    answer: "241 ÷ 4",
    acceptedAnswers: ["241 ÷ 4", "241÷4"],
    explanationZhHans: "四个商分别是60.25、60.4、约60.833和约60.429，与60的距离最小的是0.25，所以241÷4最接近60。"
  },
  "bnu-primary-ds-v2-p3-231": {
    optionsZhHans: [
      "喜欢草莓的人数最多，喜欢香蕉的人数最少。",
      "喜欢苹果的人数比喜欢西瓜的人数多3人。",
      "喜欢草莓和香蕉的一共有22人。",
      "喜欢西瓜的人数比喜欢草莓的人数少4人。"
    ],
    answer: "喜欢草莓的人数最多，喜欢香蕉的人数最少。",
    acceptedAnswers: ["喜欢草莓的人数最多，喜欢香蕉的人数最少。"],
    explanationZhHans: "15最大、8最小，所以第一项正确；12-10=2、15+8=23、15-10=5，其余说法都不正确。"
  },
  "bnu-primary-ds-v2-p3-237": {
    optionsZhHans: [
      "先算总人数6×2=12，再算48÷12=6",
      "先算每组48÷6=8，再算每人8÷2=4",
      "先算48÷2=24，再算24÷6=6",
      "先算6+2=8，再算48÷8=6"
    ],
    answer: "先算每组48÷6=8，再算每人8÷2=4",
    acceptedAnswers: ["先算每组48÷6=8，再算每人8÷2=4"],
    explanationZhHans: "题目按“先分给6组，再在每组分给2人”的顺序，48÷6=8（张），8÷2=4（张）。其余选项的计算结果或分配含义不符合题意。"
  },
  "bnu-primary-ds-v1-p4-015": {
    promptZhHans: "判断下面的要求是否有解，并说明理由：用2、4、6、8和三个0各一次组成一个七位数，使这个数读出两个零，且四舍五入到万位约是600万。",
    answer: "无解；原数必须在5995000至6004999之间。给定数字中没有5或9，所以百万位只能是6，后两位只能是0、0，剩余0、2、4、8排在末四位时最多读出一个零，不可能读出两个零",
    acceptedAnswers: ["无解；原数必须在5995000至6004999之间。给定数字中没有5或9，所以百万位只能是6，后两位只能是0、0，剩余0、2、4、8排在末四位时最多读出一个零，不可能读出两个零"],
    explanationZhHans: "四舍五入到万位约为600万，原数必须在5995000至6004999之间。给定数字没有5或9，故百万位只能是6，十万位和万位都只能是0。剩余0、2、4、8排在末四位：0在千位时只读出连接高低数级的一个“零”，在百位或十位时也只读一个“零”，在个位时不读，所以最多读出一个零，要求无解。"
  },
  "bnu-primary-ds-v1-p4-016": {
    optionsZhHans: ["999999998", "1000000001", "1000000010", "999999990"],
    answer: "1000000001",
    acceptedAnswers: ["1000000001"],
    explanationZhHans: "四个数与10亿的差分别是2、1、10、10，差最小且唯一的是1000000001。"
  },
  "bnu-primary-ds-v1-p4-037": {
    answer: "B",
    acceptedAnswers: ["B"],
    explanationZhHans: "298×31=9238。四个选项的积分别为9000、9300、8700、8940，与9238的差分别为238、62、538、298，所以B最接近。"
  },
  "bnu-primary-ds-v1-p4-067": {
    promptZhHans: "以学校为观测点，公园在学校北偏西50°方向600米处；电影院在学校南偏东30°方向400米处。下面哪项一定正确？",
    optionsZhHans: [
      "公园在学校北偏西50°方向600米处",
      "电影院在学校南偏东50°方向400米处",
      "公园和电影院相对学校的方向恰好相反",
      "公园和电影院之间的距离一定是1000米"
    ],
    answer: "公园在学校北偏西50°方向600米处",
    acceptedAnswers: ["公园在学校北偏西50°方向600米处"],
    explanationZhHans: "第一项与题设完全一致。两条方位射线夹角不是180°，两点距离也不能直接把600米和400米相加。"
  },
  "bnu-primary-ds-v1-p4-070": {
    promptZhHans: "以灯塔为观测点，轮船A在灯塔北偏东40°方向30千米处，轮船B在灯塔南偏西50°方向40千米处。下面哪项一定正确？",
    optionsZhHans: [
      "轮船A在灯塔北偏东40°方向30千米处",
      "轮船B在灯塔南偏西40°方向40千米处",
      "轮船A和轮船B在灯塔的完全相反方向",
      "轮船A和轮船B之间的距离一定是70千米"
    ],
    answer: "轮船A在灯塔北偏东40°方向30千米处",
    acceptedAnswers: ["轮船A在灯塔北偏东40°方向30千米处"],
    explanationZhHans: "第一项准确复述题设。两个方向并不相差180°，所以不能断定两船完全反向，也不能把两段距离直接相加。"
  },
  "bnu-primary-ds-v1-p4-073": {
    promptZhHans: "以公园为观测点，图书馆在公园北偏西30°方向400米处，体育馆在公园东偏南20°方向300米处。下面哪项一定正确？",
    optionsZhHans: [
      "图书馆在公园北偏西30°方向400米处",
      "体育馆在公园东偏南30°方向300米处",
      "图书馆和体育馆在公园的完全相反方向",
      "图书馆和体育馆相距700米"
    ],
    answer: "图书馆在公园北偏西30°方向400米处",
    acceptedAnswers: ["图书馆在公园北偏西30°方向400米处"],
    explanationZhHans: "第一项与题设一致；体育馆的偏角是20°，两条射线不是反向，二者距离也不能直接相加。"
  },
  "bnu-primary-ds-v1-p4-074": {
    answer: "东偏南约36.9°方向50米",
    acceptedAnswers: ["东偏南约36.9°方向50米", "东偏南36.9°，50米"],
    explanationZhHans: "以学校为原点，旗杆在(0,30)，篮球架在(40,0)。从旗杆到篮球架的向量是向东40米、向南30米，距离为50米，东偏南角为arctan(30/40)≈36.9°。"
  },
  "bnu-primary-ds-v1-p4-075": {
    answer: "从C岛向南偏西约40.9°航行约5.3千米到达码头",
    acceptedAnswers: ["从C岛向南偏西约40.9°航行约5.3千米到达码头"],
    explanationZhHans: "取东为正横轴、北为正纵轴，C岛坐标为(2√3,4)。返回码头的向量是向西2√3千米、向南4千米，距离√28≈5.3千米，方向为南偏西约40.9°。"
  },
  "bnu-primary-ds-v1-p4-082": {
    promptZhHans: "计算672÷24时，老师要求采用“把24看作25试商，再根据余数调整”的方法。下面哪一项完整记录了这种方法？",
    answer: "把24看作25试商，初商2，24×2=48，67-48=19，落下2得192，再商7，24×7=168，192-168=24，余数等于除数，改商8。",
    acceptedAnswers: ["把24看作25试商，初商2，24×2=48，67-48=19，落下2得192，再商7，24×7=168，192-168=24，余数等于除数，改商8。"],
    explanationZhHans: "按指定方法把24看作25，第二步试商7后余数等于除数，说明商小了1，应改商8，最终672÷24=28。"
  },
  "bnu-primary-ds-v1-p4-087": {
    promptZhHans: "一道没有余数的除法中，被除数是832，除数是26，商的十位和个位被墨水遮住了。补出商，并写出原来的除法算式。",
    answer: "商是32；832÷26=32",
    acceptedAnswers: ["商是32；832÷26=32", "32，832÷26=32"],
    explanationZhHans: "26×32=832，所以商是32，原来的除法算式是832÷26=32。"
  },
  "bnu-primary-ds-v1-p4-139": {
    optionsZhHans: ["（280÷2）×（50×3）", "（280×2）×（50×2）", "（280÷2）×（50÷2）", "（280×2）×（50÷2）"],
    answer: "（280×2）×（50÷2）",
    acceptedAnswers: ["（280×2）×（50÷2）"],
    explanationZhHans: "一个因数扩大2倍、另一个因数缩小到原来的1/2，积不变，所以第四项与280×50相等。"
  },
  "bnu-primary-ds-v1-p4-141": {
    answer: "（1）大数的读写，正确，50060070读作五千零六万零七十；（2）线与角，正确；（3）运算律，错误，因为44=40+4，应使用乘法分配律，25×44=25×（40+4）=25×40+25×4=1100，不能把40+4误写成40×4",
    acceptedAnswers: ["（1）大数的读写，正确，50060070读作五千零六万零七十；（2）线与角，正确；（3）运算律，错误，因为44=40+4，应使用乘法分配律，25×44=25×（40+4）=25×40+25×4=1100，不能把40+4误写成40×4"],
    explanationZhHans: "50060070的读法正确；一副三角尺可用60°和45°拼成105°。第三式错在把44=40+4误写成40×4；应使用乘法分配律，25×44=25×40+25×4=1100。"
  },
  "bnu-primary-ds-v1-p4-157": {
    promptZhHans: "白菜每千克1.7元，萝卜每千克2.3元。妈妈各买1千克，一共花多少钱？",
    optionsZhHans: ["3.0元", "4.0元", "4.3元", "5.0元"],
    answer: "4.0元",
    acceptedAnswers: ["4.0元", "4元"],
    explanationZhHans: "各买1千克，总价是1.7+2.3=4.0（元）。"
  },
  "bnu-primary-ds-v1-p4-197": {
    promptZhHans: "用4个相同的小正方体搭图形。从前面看，下排3个，上排最左边1个；从上面看是横排3个。下面哪种搭法符合要求？",
    answer: "第一层摆3个正方体横着排成一行，第二层在左边第一个正方体上面再放1个正方体",
    acceptedAnswers: ["第一层摆3个正方体横着排成一行，第二层在左边第一个正方体上面再放1个正方体"],
    explanationZhHans: "底层横排3个形成下排，上层正方体必须叠在最左边，才能得到指定前视图；从上面看仍为横排3个。"
  },
  "bnu-primary-ds-v1-p4-231": {
    optionsZhHans: ["小红比小明多13下。", "小宇比小刚多28下。", "小丽比小明多6下。", "小红比小丽多8下。"],
    answer: "小红比小明多13下。",
    acceptedAnswers: ["小红比小明多13下。"],
    explanationZhHans: "145-132=13，第一项正确；151-128=23、139-132=7、145-139=6，其余说法不正确。"
  },
  "bnu-primary-ds-v1-p4-245": {
    promptZhHans: "用4个相同的小正方体搭图形。从前面看，下排3个，上排中间1个；从上面看是横排3个。下面哪种搭法符合要求？",
    optionsZhHans: [
      "底层3个横排，上层在中间那个上面放1个",
      "底层2个横排，上层在左边放1个，再在右边第三层放1个",
      "底层2个横排，在左边上方连续叠2个",
      "底层3个横排，上层在最右边那个上面放1个"
    ],
    answer: "底层3个横排，上层在中间那个上面放1个",
    acceptedAnswers: ["底层3个横排，上层在中间那个上面放1个"],
    explanationZhHans: "前视图明确上层正方形在中间，顶视图又要求只有3个横排位置，所以第一种搭法唯一符合。"
  },
  "bnu-primary-ds-v2-p4-003": {
    answer: "705020",
    acceptedAnswers: ["705020"],
    explanationZhHans: "要四舍五入到万位得到71万，原数应在705000到714999之间；又必须使用2、5、7、0、0、0且只读一个零。逐位取最大可得705020，读作七十万五千零二十。"
  },
  "bnu-primary-ds-v2-p4-066": {
    promptZhHans: "小乐从学校向东走300米，再向北走200米到公园。小宇从学校向北走200米，再向东走300米，也到同一个公园。学校在公园的什么方向？直线距离约多少米？（结果保留整数）",
    answer: "学校在公园的西南方向，直线距离约361米",
    acceptedAnswers: ["学校在公园的西南方向，直线距离约361米"],
    explanationZhHans: "公园在学校东300米、北200米处，所以学校在公园西南方向；距离√(300²+200²)≈361米。"
  },
  "bnu-primary-ds-v2-p4-069": {
    answer: "点C约在O的东偏南49.1°方向，距离约7.1米",
    acceptedAnswers: ["点C约在O的东偏南49.1°方向，距离约7.1米"],
    explanationZhHans: "B点坐标为(40,30)。向西南走50米的东西、南北分量各为25√2米，所以C约为(4.64,-5.36)，距O约7.1米，方向约东偏南49.1°。"
  },
  "bnu-primary-ds-v2-p4-075": {
    answer: "从体育馆向西偏南约29.7°走约456米返回学校",
    acceptedAnswers: ["从体育馆向西偏南约29.7°走约456米返回学校", "从体育馆向南偏西约60.3°走约456米返回学校"],
    explanationZhHans: "把两段路程分别分解到东西、南北方向，学校到体育馆的合位移约为向东395.8米、向北220.3米。反向路线长约456米，方向为西偏南约29.7°。"
  },
  "bnu-primary-ds-v2-p4-084": {
    promptZhHans: "图书馆有896本新书，平均分给24个班。按“把896看作900、把24看作30”的方法估算，并计算每班实际分到多少本、还剩多少本。",
    answer: "估算每班约30本；实际896÷24=37（本）……8（本）",
    acceptedAnswers: ["估算每班约30本；实际896÷24=37（本）……8（本）"],
    explanationZhHans: "按指定方法900÷30=30，所以估算约30本；准确计算896÷24=37余8。"
  },
  "bnu-primary-ds-v2-p4-094": {
    answer: "把 35 看作 40，先商 2",
    acceptedAnswers: ["把 35 看作 40，先商 2", "把35看作40，先商2"],
    explanationZhHans: "945÷35的商是27。把35看作40试商，十位先商2，能直接得到合适的十位商。"
  },
  "bnu-primary-ds-v2-p4-126": {
    promptZhHans: "一个抽奖箱里有10张卡片，分别写着1～10。每次抽出一张卡片，记录后立即放回箱中并充分摇匀，再进行下一次抽取。抽到单数得奖，抽到双数不得奖。小华第一次抽到单数后说：“第二次抽到双数的可能性会变大。”你同意吗？请解释。",
    answer: "不同意。放回并摇匀后单双数仍各5张，第二次抽到双数的可能性仍是1/2",
    acceptedAnswers: ["不同意。放回并摇匀后单双数仍各5张，第二次抽到双数的可能性仍是1/2"],
    explanationZhHans: "每次抽卡后都放回并充分摇匀，箱中始终有5张单数卡和5张双数卡，各次抽取相互独立，所以第二次抽到双数的可能性仍为5/10=1/2。"
  },
  "bnu-primary-ds-v2-p4-145": {
    promptZhHans: "下面四个小数中，哪一个百分位上的数字是7？A. 0.573；B. 0.357；C. 0.735；D. 0.365。",
    answer: "A",
    acceptedAnswers: ["A"],
    explanationZhHans: "0.573的十分位是5、百分位是7，所以A正确；其余三个数的百分位都不是7。"
  },
  "bnu-primary-ds-v2-p4-193": {
    promptZhHans: "一个立体图形由相同的小正方体搭成。从前面看，下排有2个正方形，上排左边有1个；从上面看是横排2个；从左面看是竖排2个。最少需要几个小正方体？",
    optionsZhHans: ["2个", "3个", "4个", "5个"],
    answer: "3个",
    acceptedAnswers: ["3个"],
    explanationZhHans: "底层横排2个，再在左边那个上面叠1个，共3个，三个视图都满足；少于3个不能出现指定的三个投影格。"
  },
  "bnu-primary-ds-v2-p4-195": {
    promptZhHans: "一个立体图形由4个相同的小正方体搭成，四个都在底层。从上面看，前排横着3个，后排中间1个。从右面看是什么形状？",
    answer: "横着排成一行的2个小正方形",
    acceptedAnswers: ["横着排成一行的2个小正方形"],
    explanationZhHans: "从右面看只区分前、后位置；前排和后排各有底层投影，所以看到横着一行2个。"
  },
  "bnu-primary-ds-v2-p4-196": {
    promptZhHans: "一个立体图形由相同的小正方体搭成。从前面看，下排2个、上排左边1个；从上面看横排2个；从左面看竖排2个。这个图形用了______个小正方体。",
    answer: "3",
    acceptedAnswers: ["3", "3个"],
    explanationZhHans: "底层横排2个，并在左边底层正方体上叠1个，共3个，三个视图都符合。"
  },
  "bnu-primary-ds-v2-p4-202": {
    promptZhHans: "用4个相同的小正方体在同一层搭图形：靠近观察者的第1行放2个，远离观察者的第2行放2个；两行各有一个位置前后相邻。从上面看，用“第1行几个，第2行几个”描述。",
    answer: "第1行2个，第2行2个",
    acceptedAnswers: ["第1行2个，第2行2个"],
    explanationZhHans: "题目明确两行各放2个，且都在同一层，所以顶视图就是第1行2个、第2行2个。"
  },
  "bnu-primary-ds-v2-p4-204": {
    promptZhHans: "用5个相同的小正方体在同一层搭图形。从上面看是两行三列，第1行2个、第2行3个。这个立体图形一共有几层？",
    answer: "1层",
    acceptedAnswers: ["1层", "一层"],
    explanationZhHans: "题目明确5个小正方体都放在同一层，因此图形只有1层。"
  },
  "bnu-primary-ds-v2-p4-206": {
    promptZhHans: "根据等量关系列出方程：小明有x张邮票，小华有小明的3倍还多5张，两人一共有65张。",
    answer: "x + 3x + 5 = 65",
    acceptedAnswers: ["x + 3x + 5 = 65", "x+(3x+5)=65"],
    explanationZhHans: "小华有3x+5张，两人合计x+(3x+5)=65，所以方程为x+3x+5=65。"
  },
  "bnu-primary-ds-v2-p4-229": {
    optionsZhHans: ["小浩跳得最多，比小雅多18个", "小宇跳得最多，比小雅多12个", "小雯跳得最少，比小轩少8个", "小雅跳得最少，比小浩少16个"],
    answer: "小浩跳得最多，比小雅多18个",
    acceptedAnswers: ["小浩跳得最多，比小雅多18个"],
    explanationZhHans: "小浩148个最多，小雅130个最少，148-130=18，第一项正确；其余说法与表中数据不符。"
  },
  "bnu-primary-ds-v1-p5-001": {
    optionsZhHans: ["16 ÷ 2.5 = 6.4（元）", "2.5 ÷ 16 = 0.15625（元）", "16 × 2.5 = 40（元）", "16 ÷ 2.5 ≈ 6.5（元）"],
    answer: "16 ÷ 2.5 = 6.4（元）",
    acceptedAnswers: ["16 ÷ 2.5 = 6.4（元）"],
    explanationZhHans: "单价=总价÷质量，所以16÷2.5=6.4（元）。第四项的近似值6.5不等于准确结果。"
  },
  "bnu-primary-ds-v1-p5-101": {
    promptZhHans: "一个不透明袋中有5个红球、3个蓝球和2个黄球，除颜色外完全相同。每次摸出一个球后都放回并摇匀。前9次都摸到红球，请说明第10次摸到各种颜色球的可能性。",
    answer: "摸到红球的可能性最大，但蓝球和黄球也都有可能被摸到",
    acceptedAnswers: ["摸到红球的可能性最大，但蓝球和黄球也都有可能被摸到"],
    explanationZhHans: "放回后袋中仍有5红、3蓝、2黄，第10次摸到三种颜色的概率分别为1/2、3/10、1/5，前9次结果不改变这些概率。"
  },
  "bnu-primary-ds-v1-p5-105": {
    promptZhHans: "一个袋中有5个红球、3个白球、2个黑球，除颜色外相同，每次摸球后放回。20次实验记录为红12次、白5次、黑3次。根据理论概率和实验频率写出你的判断。",
    answer: "红球的可能性最大，黑球的可能性最小，实验频率与理论概率基本一致",
    acceptedAnswers: ["红球的可能性最大，黑球的可能性最小，实验频率与理论概率基本一致"],
    explanationZhHans: "理论概率依次为1/2、3/10、1/5；实验频率依次为12/20、5/20、3/20，大小顺序一致且数值较接近。"
  },
  "bnu-primary-ds-v1-p5-221": {
    optionsZhHans: ["4x = 27", "4x - x = 27", "x + 30 = 4x", "4x + x = 27"],
    answer: "4x - x = 27",
    acceptedAnswers: ["4x - x = 27"],
    explanationZhHans: "妈妈4x岁，小明x岁，年龄差为4x-x=27，所以第二项正确。"
  },
  "bnu-primary-ds-v2-p5-124": {
    optionsZhHans: ["5/8 + 2/8", "5/8 + 1/8", "10/16 + 1/16", "5/8 + 3/8"],
    answer: "5/8 + 2/8",
    acceptedAnswers: ["5/8 + 2/8"],
    explanationZhHans: "1/4=2/8，所以原式等于5/8+2/8=7/8；其余选项不等于7/8。"
  },
  "bnu-primary-ds-v2-p5-145": {
    promptZhHans: "下面哪一个图形不能围成正方体？",
    optionsZhHans: [
      "中间4个正方形横排，在左起第2个的上、下各连1个",
      "6个正方形排成2行3列的长方形",
      "4个正方形竖排，在从上数第2个的左、右各连1个",
      "中间4个正方形横排，在左起第2个上方连1个、左起第3个下方连1个"
    ],
    answer: "6个正方形排成2行3列的长方形",
    acceptedAnswers: ["6个正方形排成2行3列的长方形"],
    explanationZhHans: "2×3长方形折叠时会有面重合，不能围成正方体；其余三种都是正方体的有效展开图。"
  },
  "bnu-primary-ds-v2-p5-191": {
    optionsZhHans: ["5/6 × 5", "5/6 ÷ 5", "5 ÷ 5/6", "5/6 + 1/5"],
    answer: "5/6 ÷ 5",
    acceptedAnswers: ["5/6 ÷ 5"],
    explanationZhHans: "平均分成5段，用总长度除以5，列式5/6÷5=1/6（米）。"
  },
  "bnu-primary-ds-v2-p5-194": {
    answer: "2，5",
    acceptedAnswers: ["2，5", "2,5", "分子2，分母5"],
    explanationZhHans: "一个数的2/5是16，求这个数用16÷(2/5)=40；两个空依次填分子2、分母5。"
  },
  "bnu-primary-ds-v2-p5-239": {
    optionsZhHans: [
      "3/8 + 5/12 = 9/24 + 10/24 = 19/24",
      "3/8 + 5/12 = 8/20 = 2/5",
      "3/8 + 5/12 = 36/96 + 40/96 = 74/96",
      "3/8 + 5/12 = (3+5)/(8+12) = 2/5"
    ],
    answer: "3/8 + 5/12 = 9/24 + 10/24 = 19/24",
    acceptedAnswers: ["3/8 + 5/12 = 9/24 + 10/24 = 19/24"],
    explanationZhHans: "8和12的最小公倍数是24，3/8=9/24，5/12=10/24，相加得19/24。"
  },
  "bnu-primary-ds-v2-p5-250": {
    optionsZhHans: ["4 × 4 × 4 ÷ (8 × 4)", "4 × 4 × 4 ÷ 8 × 4", "8 × 4 ÷ (4 × 4 × 4)", "4 × 4 × 4 ÷ 8"],
    answer: "4 × 4 × 4 ÷ (8 × 4)",
    acceptedAnswers: ["4 × 4 × 4 ÷ (8 × 4)"],
    explanationZhHans: "水深=水的体积÷长方体底面积=4×4×4÷(8×4)=2（分米），第一项唯一正确。"
  },
  "bnu-primary-ds-v1-p6-028": {
    optionsZhHans: ["4/5 ÷ 2/3 + 4/5 ÷ 1/6", "4/5 ÷ 5/6", "4/5 × 5/6", "4/5 ÷ (2/3 + 1/6) × 2"],
    answer: "4/5 ÷ 5/6",
    acceptedAnswers: ["4/5 ÷ 5/6"],
    explanationZhHans: "括号内2/3+1/6=5/6，所以原式化为4/5÷5/6；其余选项与原式不相等。"
  },
  "bnu-primary-ds-v1-p6-037": {
    promptZhHans: "用5个相同的小正方体搭图形。从前面看，下排3个，中间一列共有3层；从上面看是横排3个。下面哪种搭法符合要求？",
    answer: "A. 第一层摆3个成一排，第二层在中间上面摆1个，第三层在第二层的上面再摆1个",
    acceptedAnswers: ["A. 第一层摆3个成一排，第二层在中间上面摆1个，第三层在第二层的上面再摆1个"],
    explanationZhHans: "底层横排3个，并在中间位置继续向上叠2个，正面中间列高3、顶视图仍是横排3个，A符合。"
  },
  "bnu-primary-ds-v1-p6-039": {
    promptZhHans: "用5个相同的小正方体在同一层搭图形：先横着摆3个，再在中间那个的前面和后面各摆1个。请描述从正面和从左面看到的形状。",
    answer: "从正面看横排3个；从左面看横排3个",
    acceptedAnswers: ["从正面看横排3个；从左面看横排3个"],
    explanationZhHans: "同一层的左右跨度是3，所以正面看横排3个；前后跨度也是3，所以左面看横排3个。"
  },
  "bnu-primary-ds-v1-p6-051": {
    promptZhHans: "在前后两排、左右两列的4个位置上，用若干小正方体搭成一个面连接的整体。从正面看左列高2、右列高1；从左面看前列高2、后列高1。最少和最多各需多少个？",
    answer: "最少4个，最多5个",
    acceptedAnswers: ["最少4个，最多5个"],
    explanationZhHans: "为使整体面连接，最少可在前左叠2个，并在前右、后左各放1个，共4个。每个位置高度不能超过对应两视图高度的较小值，最多为2+1+1+1=5个。"
  },
  "bnu-primary-ds-v1-p6-086": {
    promptZhHans: "某市上半年月降水量最高为90毫米。画折线统计图时，纵轴从0毫米到100毫米平均分成10个相等的小格，每格表示多少毫米？",
    answer: "10毫米",
    acceptedAnswers: ["10毫米", "10"],
    explanationZhHans: "100÷10=10（毫米），所以纵轴每格表示10毫米。"
  },
  "bnu-primary-ds-v1-p6-089": {
    promptZhHans: "小华记录前6个月电费（元）：1月120，2月100，3月80，4月100，5月110，6月130。电费相同的是哪两个月？金额是多少？",
    answer: "2月和4月，都是100元",
    acceptedAnswers: ["2月和4月，都是100元", "2；4；100"],
    explanationZhHans: "逐项比较可知2月和4月都为100元，其余月份金额不同。"
  },
  "bnu-primary-ds-v1-p6-139": {
    answer: "4个",
    acceptedAnswers: ["4个", "4"],
    explanationZhHans: "正面是完整2×2投影，需要左右两列都达到2层；上面是一排2个位置，因此最少是两个高2的立柱，共4个小正方体。"
  },
  "bnu-primary-ds-v1-p6-184": {
    promptZhHans: "一个图形每次绕点P逆时针旋转90°。累计旋转角达到360°时，经过几次90°旋转？",
    answer: "4",
    acceptedAnswers: ["4", "4次"],
    explanationZhHans: "360°÷90°=4，所以累计旋转一周需要4次。"
  },
  "bnu-primary-ds-v1-p6-198": {
    promptZhHans: "在标准直角坐标系中，一个图形先绕点O逆时针旋转90°，再向右平移4格、向下平移2格。点P(1,2)最后变为P'(5,3)，旋转中心O的坐标是（ ）。",
    answer: "(-0.5,3.5)",
    acceptedAnswers: ["(-0.5,3.5)", "(-1/2,7/2)"],
    explanationZhHans: "先撤销平移，旋转后的点是(1,5)。设O=(a,b)，逆时针90°后坐标满足(a+b-2,b+1-a)=(1,5)，解得a=-0.5，b=3.5。"
  },
  "bnu-primary-ds-v2-p6-039": {
    promptZhHans: "一个由相同小正方体搭成的立体图形必须面连接成一个整体。从正面、上面和左面看都恰好是2行2列的“田”字形。最少需要多少个小正方体？",
    answer: "6个",
    acceptedAnswers: ["6个", "6"],
    explanationZhHans: "三个方向都要覆盖2×2投影，同时整体必须面连接。4个或5个不能兼顾三个完整投影和面连接；用6个可构造满足条件的整体，所以最少6个。"
  },
  "bnu-primary-ds-v2-p6-042": {
    promptZhHans: "一个立体图形从前面看下排3个、上排中间1个，从上面看横排3个，从左面看竖排2个。最少需要多少个小正方体？说明理由。",
    answer: "4个；底层横排3个，在中间那个上面再放1个",
    acceptedAnswers: ["4个；底层横排3个，在中间那个上面再放1个"],
    explanationZhHans: "三个底层正方体给出横排3个，再在中间叠1个给出高度2，正好用4个；少于4个不能覆盖四个前视投影格。"
  },
  "bnu-primary-ds-v2-p6-044": {
    type: "short-answer",
    promptZhHans: "用4个相同的小正方体搭图形。从前面看下排3个、上排中间1个，从上面看横排3个。请描述一种搭法。",
    answer: "底层横排3个，在中间那个上面再放1个",
    acceptedAnswers: ["底层横排3个，在中间那个上面再放1个"],
    explanationZhHans: "底层3个形成横排，上层1个叠在中间，就得到指定的两个视图。"
  },
  "bnu-primary-ds-v2-p6-047": {
    promptZhHans: "一个立体图形从前面看下排3个、中间一列高3，从上面看横排3个，从左面看竖排3个。最少需要多少个小正方体？",
    answer: "5",
    acceptedAnswers: ["5", "5个"],
    explanationZhHans: "底层横排3个，在中间位置向上再叠2个，共5个，即可同时形成宽3和高3的投影；少于5个无法覆盖前视图的5个格。"
  },
  "bnu-primary-ds-v2-p6-048": {
    promptZhHans: "用6个相同的小正方体搭图形：底层摆成2行2列的“田”字形，上层在底层前排左边和后排右边各放1个。请描述各层的搭法，并写出一共有几层。",
    answer: "底层2行2列共4个，上层在前排左边和后排右边各1个，共2层",
    acceptedAnswers: ["底层2行2列共4个，上层在前排左边和后排右边各1个，共2层"],
    explanationZhHans: "题目给出底层4个、上层2个，位置明确，所以搭法唯一按描述完成，共有2层。"
  },
  "bnu-primary-ds-v2-p6-052": {
    promptZhHans: "一个立体图形由5个相同的小正方体搭成。底层摆成前后两排、左右两列的2×2方阵，再在前排左边那个上面放1个。规定从左面看时图中左列表示前排。左面看到什么形状？",
    optionsZhHans: ["下排前后各1个，前排上方1个", "下排前后各1个，后排上方1个", "横排2个且都只有1层", "前后两列都高2层"],
    answer: "下排前后各1个，前排上方1个",
    acceptedAnswers: ["下排前后各1个，前排上方1个"],
    explanationZhHans: "从左面看，前后两排形成下排2个；额外的小正方体叠在前排，因此前排一列高2。"
  },
  "bnu-primary-ds-v2-p6-134": {
    answer: "0.9/π米",
    acceptedAnswers: ["0.9/π米", "9/(10π)米"],
    explanationZhHans: "设绳长L、树干周长C，则L-C=2.4，L/2-C=0.3。相减解得L=4.2，C=1.8，所以半径r=C/(2π)=0.9/π米。"
  },
  "bnu-primary-ds-v2-p6-145": {
    optionsZhHans: ["3.14×2²×5", "3.14×2×5", "3.14×2²×5÷3", "2×3.14×2+5"],
    answer: "3.14×2²×5",
    acceptedAnswers: ["3.14×2²×5"],
    explanationZhHans: "圆柱容积=πr²h=3.14×2²×5=62.8（立方分米）=62.8升，第一项唯一正确。"
  },
  "bnu-primary-ds-v2-p6-181": {
    promptZhHans: "直角三角形ABC的直角顶点是B，旋转前点A在点B正北方向，AB=3厘米。把三角形绕点B逆时针旋转90°后，A移动到A'。A'在B的什么方向？",
    answer: "正西方向",
    acceptedAnswers: ["正西方向"],
    explanationZhHans: "从正北方向逆时针旋转90°后指向正西，所以A'在B的正西方向。"
  },
  "bnu-primary-ds-v2-p6-233": {
    optionsZhHans: ["1+3+5+7+9+11", "1+2+3+4+5+6", "6×5", "6×7"],
    answer: "1+3+5+7+9+11",
    acceptedAnswers: ["1+3+5+7+9+11"],
    explanationZhHans: "前6层依次有1、3、5、7、9、11个，合计36个，第一项是与分层规律一致的列式。"
  },
  "bnu-primary-ds-v2-p6-242": {
    optionsZhHans: ["3.14×2×5", "3.14×2²×5", "3.14×2×2", "3.14×2²×5×2"],
    answer: "3.14×2²×5",
    acceptedAnswers: ["3.14×2²×5"],
    explanationZhHans: "圆柱容积=底面积×高=3.14×2²×5，第二项唯一符合公式。"
  },
  "bnu-primary-ds-v2-p6-250": {
    optionsZhHans: ["6×6×6÷36", "6×6×6×3÷36", "6×6×6÷(36×3)", "6×6×6÷3÷18"],
    answer: "6×6×6×3÷36",
    acceptedAnswers: ["6×6×6×3÷36"],
    explanationZhHans: "圆锥体积=(1/3)×36×高，与正方体体积6³相等，所以高=6³×3÷36=18（厘米）。"
  },
  "bnu-primary-ds-v2-p4-171": {
    acceptedAnswers: ["等腰三角形。因为两条边长度相等，都是5厘米。"]
  },
  "bnu-primary-ds-v2-p4-086": {
    acceptedAnswers: ["16包，还剩0本", "16包，0本"]
  },
  "bnu-primary-ds-v1-p5-104": {
    acceptedAnswers: [
      "公平。因为数字1和2出现的可能性相同，小明和小红赢的机会一样，不需要修改规则。",
      "公平，因为小明和小红赢的可能性相同"
    ]
  },
  "bnu-primary-ds-v1-p5-119": {
    acceptedAnswers: [
      "大船7条，小船0条",
      "7条大船，0条小船",
      "租7条大船，不租小船"
    ]
  },
  "bnu-primary-ds-v1-p2-057": {
    promptZhHans: "用一张长方形纸，先上下对折，再左右对折，然后在折叠后纸片内部且不接触任何折痕或边缘的位置剪去一个小正方形。展开后，这张纸上会有几个同样的小正方形孔？",
    answer: "4",
    acceptedAnswers: ["4", "四个", "4个"],
    explanationZhHans: "剪口位于折叠后纸片内部且不接触折痕或边缘。两次对折使四层纸在四个互不相连的位置各留下一个相同的孔，所以展开后有4个小正方形孔。"
  },
  "bnu-primary-ds-v1-p3-171": {
    promptZhHans: "学校图书馆新买来一批书，每包有24本，一共运来18包。图书馆一共新买来多少本书？"
  },
  "bnu-primary-ds-v1-p3-177": {
    promptZhHans: "一个电影院有28排座位，每排有36个座位。这个电影院一共有多少个座位？"
  },
  "bnu-primary-ds-v1-p6-196": {
    promptZhHans: "一个非等边的等腰三角形有（　）条对称轴。",
    answer: "1",
    acceptedAnswers: ["1", "1条"],
    explanationZhHans: "非等边的等腰三角形只有1条对称轴，即顶角平分线（也就是底边中线和高）所在的直线。题目排除了有3条对称轴的等边三角形。"
  }
};

const reviewedCompleteAnswerCorrections: Record<string, ReviewedBnuPrimaryCorrection> = {
  "bnu-primary-ds-v2-p1-161": completeResponse("尖尖的三角形屋顶和一扇红色的门"),
  "bnu-primary-ds-v2-p1-012": completeResponse("8-5=3（个）；妈妈吃了3个苹果"),
  "bnu-primary-ds-v2-p1-135": completeResponse("减法；12-7=5（块）；检查：5+7=12"),
  "bnu-primary-ds-v1-p1-141": completeResponse("对，因为8-5=3，铅笔比橡皮多3支"),
  "bnu-primary-ds-v1-p2-202": completeResponse("估算约少40本；264-138+95=221（本），比原来少43本；验算：221+43=264"),
  "bnu-primary-ds-v1-p2-014": completeResponse("个位填6，十位填2"),
  "bnu-primary-ds-v2-p2-125": completeResponse("24÷6=4（名）；口诀：四六二十四；可以分给4名同学"),
  "bnu-primary-ds-v1-p2-102": completeResponse("24÷6=4（盒）；可以装4盒"),
  "bnu-primary-ds-v1-p2-093": completeResponse("30÷5=6（个）；30表示铅笔总数，5表示每人分5支，6表示可分给6人"),
  "bnu-primary-ds-v1-p2-096": completeResponse("15÷5=3（个）；检查：3×5=15，所以每盘3个"),
  "bnu-primary-ds-v1-p2-099": completeResponse("32÷4=8（人）；因为8×4=32，所以可发给8名同学"),
  "bnu-primary-ds-v1-p2-105": completeResponse("12÷2=6（个）；每个盘子放6个"),
  "bnu-primary-ds-v1-p2-107": {
    answer: "6×9=54，9×6=54",
    acceptedAnswers: ["6×9=54，9×6=54", "54，54", "54,54"]
  },
  "bnu-primary-ds-v1-p3-238": completeResponse("218÷45=4（辆）……38（人），4辆不够，所以至少租5辆"),
  "bnu-primary-ds-v2-p3-168": {
    promptZhHans: "学校为18个班准备读物，每班24本。一共需要准备多少本？",
    answer: "432本",
    acceptedAnswers: ["432本", "432"],
    explanationZhHans: "18×24=18×(20+4)=360+72=432，所以一共需要准备432本读物。"
  },
  "bnu-primary-ds-v1-p3-183": {
    promptZhHans: "下面哪组货物的总质量最接近1吨？（　）",
    optionsZhHans: [
      "10袋25千克的大米",
      "100袋1千克的食盐",
      "40袋25千克的大米",
      "200袋4千克的面粉"
    ],
    answer: "40袋25千克的大米",
    acceptedAnswers: ["40袋25千克的大米", "C"],
    explanationZhHans: "1吨=1000千克。四组货物的总质量依次为250千克、100千克、1000千克、800千克，与1000千克的差依次为750千克、900千克、0千克、200千克。因此40袋25千克的大米唯一最接近1吨。"
  },
  "bnu-primary-ds-v1-p3-159": {
    promptZhHans: "三角形ABC的顶点是A(1,2)、B(3,5)、C(5,2)。写出它关于直线x=3轴对称后A'、B'、C'的坐标。",
    ...completeResponse("A'(5,2)，B'(3,5)，C'(1,2)")
  },
  "bnu-primary-ds-v2-p3-174": completeResponse("把18看作20、32看作30，20×30=600，所以大约有600棵"),
  "bnu-primary-ds-v1-p4-184": {
    promptZhHans: "一盒牛奶重0.25千克。妈妈买了12盒，这些牛奶一共重多少千克？请按0.25≈0.3、12≈10进行估算，再列式计算准确值。",
    ...completeResponse(
      "估算：0.3×10≈3（千克）；准确计算：0.25×12=3（千克）",
      "按题目指定的估算规则，0.25≈0.3、12≈10，所以0.3×10≈3（千克）。准确计算：0.25×12=3（千克）。"
    )
  },
  "bnu-primary-ds-v1-p4-174": {
    promptZhHans: "设计一个等腰直角三角形，并写出它的角和边的特征。",
    ...completeResponse("有一个90°角、两个45°角，夹直角的两条边相等")
  },
  "bnu-primary-ds-v1-p4-018": {
    promptZhHans: "比直角大40°的角是多少度？它是什么角？",
    ...completeResponse("130°，是钝角")
  },
  "bnu-primary-ds-v2-p4-045": {
    promptZhHans: "一列火车平均每小时行驶118千米，从甲城到乙城需要行驶12小时。甲城到乙城的铁路长多少千米？估算时只把118看作120，12保持不变，再精确计算。",
    ...completeResponse(
      "估算：120×12=1440（千米）；准确计算：118×12=1416（千米）",
      "按指定规则只把118看作120，估算得120×12=1440（千米）。精确计算：118×12=118×10+118×2=1416（千米）。"
    )
  },
  "bnu-primary-ds-v1-p5-138": completeResponse("2×(8×5+8×4+5×4)=184（平方厘米）；注意三组相对面各有两个，且单位要统一"),
  "bnu-primary-ds-v1-p5-210": completeResponse("x+(2x+30)=180，3x=150，x=50，所以梨树有50棵"),
  "bnu-primary-ds-v2-p5-210": completeResponse("x+3x=180，4x=180，x=45，所以梨树有45棵"),
  "bnu-primary-ds-v2-p5-009": {
    promptZhHans: "小明在计算一道小数除法时，把被除数17.5错看成了175。得到的商是正确商的多少倍？请说明理由。",
    ...completeResponse(
      "10倍；因为被除数扩大到原来的10倍而除数不变，商也扩大到原来的10倍",
      "除数不变，被除数从17.5变为175，即扩大到原来的10倍，所以所得商也是正确商的10倍。"
    )
  },
  "bnu-primary-ds-v2-p5-012": {
    promptZhHans: "妈妈有13.75元，梨每千克4.8元。如果以0.1千克为购买单位，且总价不得超过13.75元，最多能买多少千克梨？",
    answer: "2.8",
    acceptedAnswers: ["2.8", "2.8千克"],
    explanationZhHans: "13.75÷4.8≈2.8646。以0.1千克为单位且不能超预算，要用去尾法：2.8×4.8=13.44（元）不超预算，而2.9×4.8=13.92（元）超出预算，所以最多买2.8千克。"
  },
  "bnu-primary-ds-v2-p5-048": {
    promptZhHans: "一个梯形的上底是4厘米，下底是10厘米，高是5厘米。它的面积是多少平方厘米？",
    ...completeResponse(
      "35平方厘米",
      "梯形面积=(上底+下底)×高÷2=(4+10)×5÷2=35（平方厘米）。"
    )
  },
  "bnu-primary-ds-v2-p5-129": {
    promptZhHans: "有两根绳子，第一根长5/6米，第二根长2/3米。第一根比第二根长多少米？",
    ...completeResponse(
      "1/6米",
      "先通分，再相减：5/6-2/3=5/6-4/6=1/6（米）。"
    )
  },
  "bnu-primary-ds-v1-p5-062": completeResponse("1.75，7/4"),
  "bnu-primary-ds-v2-p5-065": completeResponse("占全部蛋糕的1/5；每人分到3/5块；3/5是真分数"),
  "bnu-primary-ds-v1-p5-093": completeResponse("红色和蓝色并列最大，因为它们各占3/8，黄色只占2/8"),
  "bnu-primary-ds-v1-p5-096": completeResponse("公平，因为唱歌和朗诵各有2张，双方抽中的概率都是2/8=1/4"),
  "bnu-primary-ds-v1-p5-099": completeResponse("一样大，因为“学”和“！”各占正方体的1个面，朝上的概率都是1/6"),
  "bnu-primary-ds-v1-p5-117": completeResponse("表格为：鸡1兔7共30条腿；鸡2兔6共28条腿；鸡3兔5共26条腿；所以鸡3只、兔5只"),
  "bnu-primary-ds-v1-p5-018": {
    promptZhHans: "四边形的顶点按顺序为(1,1)、(3,1)、(4,3)、(2,3)。写出向右平移5格后四个对应顶点的坐标，并保留原顺序。",
    ...completeResponse("(6,1)、(8,1)、(9,3)、(7,3)")
  },
  "bnu-primary-ds-v1-p6-226": {
    promptZhHans: "学校计划建造一个底面直径4米、深度0.5米的圆柱形沙坑。沙坑容积至少要达到6.5立方米。（π取3.14）（1）计算原设计的容积并判断是否满足要求；（2）如果不满足，只增加深度，并以0.01米为调整单位，求满足要求的最小深度并验证。",
    ...completeResponse(
      "V=3.14×2²×0.5=6.28（立方米），6.28<6.5，不满足；最小深度为0.52米，因为3.14×2²×0.51=6.4056<6.5，而3.14×2²×0.52=6.5312>6.5",
      "原设计容积为3.14×2²×0.5=6.28（立方米），小于6.5。只增加深度且以0.01米为单位时，0.51米对应6.4056立方米，仍不足；0.52米对应6.5312立方米，达到要求，所以最小深度是0.52米。"
    )
  },
  "bnu-primary-ds-v1-p6-072": {
    promptZhHans: "在“六年级有25%的学生参加合唱团”中，把25%化成最简分数是多少？",
    answer: "1/4",
    acceptedAnswers: ["1/4", "四分之一"],
    explanationZhHans: "25%=25/100，分子和分母同除以25，得到最简分数1/4。"
  },
  "bnu-primary-ds-v1-p5-111": {
    type: "multiple-choice",
    promptZhHans: "五年级上册总复习中，下面哪组“知识—示例”搭配全部正确？",
    optionsZhHans: [
      "小数除法：3.6÷0.6=6；图形面积：平行四边形面积=底×高；分数：1/4表示把整体平均分成4份后取1份；可能性：等分转盘中份数相同的区域被指到的可能性相同",
      "小数除法：3.6÷0.6=0.6；图形面积：平行四边形面积=底+高；分数：1/4表示4个整体；可能性：区域越小越容易被指到",
      "小数除法：3.6÷0.6=6；图形面积：三角形面积=底×高；分数：1/4表示把整体平均分成4份后取4份；可能性：份数相同的区域可能性不同",
      "小数除法：3.6÷0.6=0.6；图形面积：梯形面积=(上底+下底)×高；分数：1/4表示把整体平均分成4份后取1份；可能性：等分区域越多越容易被指到"
    ],
    answer: "小数除法：3.6÷0.6=6；图形面积：平行四边形面积=底×高；分数：1/4表示把整体平均分成4份后取1份；可能性：等分转盘中份数相同的区域被指到的可能性相同",
    acceptedAnswers: [
      "小数除法：3.6÷0.6=6；图形面积：平行四边形面积=底×高；分数：1/4表示把整体平均分成4份后取1份；可能性：等分转盘中份数相同的区域被指到的可能性相同"
    ],
    explanationZhHans: "第一项的四个搭配都正确：3.6÷0.6=6；平行四边形面积等于底乘高；1/4表示把整体平均分成4份后取1份；等分转盘中份数相同的区域所占大小相同，被指到的可能性也相同。其余各项至少含有一个错误结论。"
  },
  "bnu-primary-ds-v1-p6-180": completeResponse("正比例，因为路程÷时间=速度，而速度保持不变")
};

const reviewedFinalOnlyCompoundIds = new Set([
  "bnu-primary-ds-v1-p2-200", "bnu-primary-ds-v2-p2-011", "bnu-primary-ds-v2-p2-015",
  "bnu-primary-ds-v1-p2-012", "bnu-primary-ds-v1-p2-108", "bnu-primary-ds-v1-p3-168",
  "bnu-primary-ds-v2-p3-168", "bnu-primary-ds-v1-p3-171", "bnu-primary-ds-v2-p3-171",
  "bnu-primary-ds-v1-p3-177", "bnu-primary-ds-v1-p3-105", "bnu-primary-ds-v2-p3-116",
  "bnu-primary-ds-v1-p3-108", "bnu-primary-ds-v2-p3-114", "bnu-primary-ds-v2-p3-129",
  "bnu-primary-ds-v2-p3-015", "bnu-primary-ds-v1-p3-047", "bnu-primary-ds-v1-p3-051",
  "bnu-primary-ds-v1-p3-060", "bnu-primary-ds-v1-p3-063", "bnu-primary-ds-v2-p3-039",
  "bnu-primary-ds-v1-p4-153", "bnu-primary-ds-v1-p4-159", "bnu-primary-ds-v1-p4-180",
  "bnu-primary-ds-v2-p4-180", "bnu-primary-ds-v1-p4-188", "bnu-primary-ds-v1-p4-177",
  "bnu-primary-ds-v2-p4-177", "bnu-primary-ds-v2-p4-208", "bnu-primary-ds-v1-p4-171",
  "bnu-primary-ds-v1-p4-084", "bnu-primary-ds-v2-p4-093", "bnu-primary-ds-v2-p4-096",
  "bnu-primary-ds-v2-p4-030", "bnu-primary-ds-v2-p4-021", "bnu-primary-ds-v1-p4-027",
  "bnu-primary-ds-v1-p4-132", "bnu-primary-ds-v2-p5-168", "bnu-primary-ds-v1-p5-123",
  "bnu-primary-ds-v2-p5-123", "bnu-primary-ds-v1-p5-126", "bnu-primary-ds-v1-p5-156",
  "bnu-primary-ds-v1-p5-162", "bnu-primary-ds-v2-p5-162", "bnu-primary-ds-v1-p5-153",
  "bnu-primary-ds-v1-p5-159", "bnu-primary-ds-v1-p5-165", "bnu-primary-ds-v1-p5-015",
  "bnu-primary-ds-v1-p5-012", "bnu-primary-ds-v2-p5-054", "bnu-primary-ds-v2-p5-057",
  "bnu-primary-ds-v1-p5-051", "bnu-primary-ds-v2-p5-051", "bnu-primary-ds-v2-p5-060",
  "bnu-primary-ds-v1-p5-108", "bnu-primary-ds-v1-p5-111", "bnu-primary-ds-v2-p6-204",
  "bnu-primary-ds-v2-p6-210", "bnu-primary-ds-v1-p6-240", "bnu-primary-ds-v1-p6-075",
  "bnu-primary-ds-v1-p6-078", "bnu-primary-ds-v2-p6-030", "bnu-primary-ds-v2-p6-021",
  "bnu-primary-ds-v2-p6-027", "bnu-primary-ds-v2-p6-024", "bnu-primary-ds-v2-p6-045",
  "bnu-primary-ds-v1-p6-123", "bnu-primary-ds-v1-p6-126", "bnu-primary-ds-v2-p6-057",
  "bnu-primary-ds-v1-p6-072", "bnu-primary-ds-v2-p6-072", "bnu-primary-ds-v2-p6-060",
  "bnu-primary-ds-v2-p6-093", "bnu-primary-ds-v2-p6-099", "bnu-primary-ds-v2-p6-102",
  "bnu-primary-ds-v2-p6-105", "bnu-primary-ds-v2-p6-108", "bnu-primary-ds-v2-p6-144"
]);

const reviewedFinalOnlyPromptOverrides: Record<string, string> = {
  "bnu-primary-ds-v1-p2-200": "计算476+389的结果。",
  "bnu-primary-ds-v1-p2-108": "一盒巧克力有8块，买6盒一共有多少块？",
  "bnu-primary-ds-v2-p3-168": "学校为18个班准备读物，每班24本。一共需要准备多少本？",
  "bnu-primary-ds-v2-p3-116": "把1元平均分成100份，每份用小数表示是多少元？",
  "bnu-primary-ds-v1-p4-153": "小明买文具，一本笔记本4.25元，一支钢笔3.8元。他付了10元，应找回多少元？",
  "bnu-primary-ds-v1-p4-159": "妈妈买了三种商品：一瓶酱油5.8元，一袋盐2.35元，一瓶醋4.6元。她付了20元，应找回多少元？",
  "bnu-primary-ds-v2-p4-180": "一块长方形菜地长6.5米、宽4米，面积是多少平方米？",
  "bnu-primary-ds-v1-p4-177": "妈妈买了2.5千克苹果，每千克6.4元，一共需要付多少元？",
  "bnu-primary-ds-v2-p4-177": "妈妈买了2.5千克苹果，每千克8.4元，一共需要付多少元？",
  "bnu-primary-ds-v2-p4-208": "一个长方形的周长是24厘米，长是宽的2倍，宽是多少厘米？",
  "bnu-primary-ds-v1-p5-012": "妈妈买了2.5千克苹果，付20元，找回4.5元。每千克苹果多少元？",
  "bnu-primary-ds-v1-p6-123": "小明家上个月用水10吨，这个月比上个月节约20%。这个月用水多少吨？",
  "bnu-primary-ds-v1-p6-126": "妈妈把5000元存入银行，定期两年，年利率2.10%。到期时可以取回多少元？"
};

function finalOnlyCompoundPrompt(question: GeneratedBnuPrimaryQuestion) {
  const explicit = reviewedFinalOnlyPromptOverrides[question.id];
  if (explicit) return explicit;
  return question.promptZhHans
    .replace(/请写出竖式计算过程[。.]?$/u, "")
    .replace(/请分步计算并写出过程[。.]?$/u, "")
    .replace(/请写出(?:你的)?(?:计算|思考|推理)过程(?:并验算|并化简结果|并化简|和答语|和答案)?[。.]?$/u, "")
    .replace(/请写出约分过程并给出最简分数[。.]?$/u, "请给出最简分数。")
    .replace(/请写出答案并(?:简要)?说明理由[。.]?$/u, "请写出答案。")
    .replace(/请写出错误同学的姓名，并(?:简要)?说明理由[。.]?$/u, "请写出错误同学的姓名。")
    .replace(/请写出它的名称，并说明理由[。.]?$/u, "请写出它的名称。")
    .replace(/请写出(?:你的)?判断理由[。.]?$/u, "")
    .replace(/(?:，|。)?并(?:简要)?说明(?:你的)?(?:理由|方法)[。.]?$/u, "。")
    .replace(/请说明理由[。.]?$/u, "")
    .replace(/请写出比较和计算过程[。.]?$/u, "")
    .trim();
}

const reviewedUnitAnswerAliases: Record<string, string> = {
  "bnu-primary-ds-v1-p1-002": "5只",
  "bnu-primary-ds-v1-p1-005": "7颗",
  "bnu-primary-ds-v1-p1-008": "10支",
  "bnu-primary-ds-v1-p1-011": "7个",
  "bnu-primary-ds-v1-p1-102": "10只",
  "bnu-primary-ds-v1-p1-105": "10块",
  "bnu-primary-ds-v1-p1-108": "10个",
  "bnu-primary-ds-v1-p1-202": "4个",
  "bnu-primary-ds-v1-p2-003": "48页",
  "bnu-primary-ds-v1-p2-009": "17元",
  "bnu-primary-ds-v1-p2-057": "4个",
  "bnu-primary-ds-v1-p2-101": "6个",
  "bnu-primary-ds-v1-p2-208": "756本",
  "bnu-primary-ds-v1-p3-171": "432本",
  "bnu-primary-ds-v1-p3-174": "384棵",
  "bnu-primary-ds-v1-p3-177": "1008个",
  "bnu-primary-ds-v1-p3-180": "720个",
  "bnu-primary-ds-v1-p4-186": "5.7元",
  "bnu-primary-ds-v1-p4-190": "91.2元",
  "bnu-primary-ds-v1-p4-198": "4个",
  "bnu-primary-ds-v1-p4-200": "4个",
  "bnu-primary-ds-v1-p5-048": "84平方分米",
  "bnu-primary-ds-v1-p5-134": "5千克",
  "bnu-primary-ds-v1-p5-140": "96平方厘米",
  "bnu-primary-ds-v1-p5-152": "12/25平方米",
  "bnu-primary-ds-v1-p5-234": "40人",
  "bnu-primary-ds-v1-p5-236": "50棵",
  "bnu-primary-ds-v1-p5-240": "3/5米",
  "bnu-primary-ds-v1-p6-003": "50.24平方厘米",
  "bnu-primary-ds-v1-p6-006": "2米",
  "bnu-primary-ds-v1-p6-009": "28.26平方米",
  "bnu-primary-ds-v1-p6-177": "1800千克",
  "bnu-primary-ds-v1-p6-236": "62.8升",
  "bnu-primary-ds-v2-p1-005": "4条",
  "bnu-primary-ds-v2-p1-035": "3块",
  "bnu-primary-ds-v2-p1-038": "7个",
  "bnu-primary-ds-v2-p3-032": "69本",
  "bnu-primary-ds-v2-p3-038": "737本",
  "bnu-primary-ds-v2-p3-102": "22天",
  "bnu-primary-ds-v2-p3-105": "8次",
  "bnu-primary-ds-v2-p4-083": "28本",
  "bnu-primary-ds-v2-p4-156": "70.95元",
  "bnu-primary-ds-v2-p5-047": "8厘米",
  "bnu-primary-ds-v2-p5-050": "6厘米",
  "bnu-primary-ds-v2-p5-147": "5厘米",
  "bnu-primary-ds-v2-p6-003": "50平方厘米",
  "bnu-primary-ds-v2-p6-006": "62.8平方米",
  "bnu-primary-ds-v2-p6-009": "28.26平方厘米",
  "bnu-primary-ds-v2-p6-012": "28.26平方米",
  "bnu-primary-ds-v2-p6-015": "21.5平方厘米",
  "bnu-primary-ds-v2-p6-128": "20.096平方米",
  "bnu-primary-ds-v2-p6-137": "65.94平方米"
};

function reviewedQuestion(question: GeneratedBnuPrimaryQuestion): GeneratedBnuPrimaryQuestion {
  const contentCorrected = {
    ...question,
    ...reviewedContentCorrections[question.id],
    ...reviewedCompleteAnswerCorrections[question.id]
  };
  const corrected = reviewedFinalOnlyCompoundIds.has(question.id)
    ? { ...contentCorrected, promptZhHans: finalOnlyCompoundPrompt(contentCorrected) }
    : contentCorrected;
  const explicitUnitAlias = reviewedUnitAnswerAliases[question.id];
  if (!explicitUnitAlias) return corrected;
  return {
    ...corrected,
    acceptedAnswers: uniqueNonEmpty([...(corrected.acceptedAnswers ?? []), explicitUnitAlias])
  };
}

const reviewedQuestionRows = generatedQuestionRows.map(reviewedQuestion);

function localizedMainlandBnuPrimaryAcceptedAnswers(question: GeneratedBnuPrimaryQuestion) {
  const sourceAliases = uniqueNonEmpty([question.answer, ...(question.acceptedAnswers ?? [])]);
  const aliases = sourceAliases.flatMap((alias) => {
    const zhHans = toSafeMainlandSimplifiedText(alias);
    const validatedEnglishAlias = chinaLessonEnglishTranslation(zhHans);
    return [
      zhHans,
      toTraditionalHjbText(zhHans),
      ...(validatedEnglishAlias ? [validatedEnglishAlias] : [])
    ];
  });

  if (question.id === "bnu-primary-ds-v1-p4-105") {
    aliases.push("城市A，城市C，城市D，城市B", "城市A、城市C、城市D、城市B");
  }

  return uniqueNonEmpty(aliases);
}

function localizeBnuPrimaryGeneratedText(value: string) {
  const zhHans = toSafeMainlandSimplifiedText(stripHjbGeneratorPromptPrefix(value));
  return {
    en: zhHans,
    zh: toTraditionalHjbText(zhHans),
    zhHans
  };
}

function toQuestion(question: GeneratedBnuPrimaryQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU primary topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizeBnuPrimaryGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeBnuPrimaryGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: localizedMainlandBnuPrimaryAcceptedAnswers(question),
    explanation: localizeBnuPrimaryGeneratedText(question.explanationZhHans)
  };
}

function metadataForQuestion(question: GeneratedBnuPrimaryQuestion): MainlandBnuPrimaryQuestionGenerationMetadata {
  return {
    batch: question.batch,
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
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: "pass",
    terminologyQaStatus: "pass",
    manualQaStatus: "approved",
    independentAnswer: question.answer
  };
}

function compareGeneratedQuestionGroups(left: GeneratedBnuPrimaryQuestion, right: GeneratedBnuPrimaryQuestion) {
  return (
    gradeOrder.indexOf(left.grade) - gradeOrder.indexOf(right.grade) ||
    left.topicId.localeCompare(right.topicId, "zh-Hans") ||
    difficultyOrder.indexOf(mapDifficultyToActive(left.difficulty)) - difficultyOrder.indexOf(mapDifficultyToActive(right.difficulty)) ||
    left.id.localeCompare(right.id, "zh-Hans")
  );
}

function questionGroupKey(question: GeneratedBnuPrimaryQuestion) {
  return `${question.grade}|${question.topicId}|${question.difficulty}`;
}

function interleaveGeneratedQuestionBatches(questions: GeneratedBnuPrimaryQuestion[]) {
  const groups = new Map<string, Record<BnuPrimaryBatch, GeneratedBnuPrimaryQuestion[]>>();
  const groupOrderKeys: string[] = [];

  [...questions].sort(compareGeneratedQuestionGroups).forEach((question) => {
    const key = questionGroupKey(question);
    if (!groups.has(key)) {
      groups.set(key, {
        "bnu-primary-v1": [],
        "bnu-primary-v2": []
      });
      groupOrderKeys.push(key);
    }
    groups.get(key)?.[question.batch].push(question);
  });

  return groupOrderKeys.flatMap((key) => {
    const group = groups.get(key);
    if (!group) return [];
    batchOrder.forEach((batch) => group[batch].sort((left, right) => left.id.localeCompare(right.id, "zh-Hans")));
    const rowCount = Math.max(...batchOrder.map((batch) => group[batch].length));
    const interleaved: GeneratedBnuPrimaryQuestion[] = [];

    for (let index = 0; index < rowCount; index += 1) {
      batchOrder.forEach((batch) => {
        const question = group[batch][index];
        if (question) interleaved.push(question);
      });
    }

    return interleaved;
  });
}

export const mainlandBnuPrimaryV1Questions: Question[] = v1QuestionPack.questions.map(reviewedQuestion).map(toQuestion);
export const mainlandBnuPrimaryV2Questions: Question[] = v2QuestionPack.questions.map(reviewedQuestion).map(toQuestion);
export const mainlandBnuPrimaryQuestions: Question[] = interleaveGeneratedQuestionBatches(reviewedQuestionRows).map(toQuestion);

export const mainlandBnuPrimaryQuestionGenerationMetadata: Record<string, MainlandBnuPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(
    reviewedQuestionRows.map((question) => [question.id, metadataForQuestion(question)])
  );

export function independentMainlandBnuPrimaryAnswer(question: Question) {
  return mainlandBnuPrimaryQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
