import questionPackJson from "./generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbPrimaryTopics } from "./mainlandHjbPrimaryTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  Difficulty,
  DifficultyRecord,
  MainlandHjbPrimaryGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type GeneratedHjbPrimaryQuestion = {
  id: string;
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
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

type GeneratedHjbPrimaryQuestionPack = {
  questions: GeneratedHjbPrimaryQuestion[];
};

type ReviewedHjbPrimaryCorrection = Partial<Pick<
  GeneratedHjbPrimaryQuestion,
  "type" | "promptZhHans" | "optionsZhHans" | "answer" | "acceptedAnswers" | "explanationZhHans"
>> & {
  promptEn?: string;
  optionsEn?: string[];
  explanationEn?: string;
};

export type MainlandHjbPrimaryQuestionGenerationMetadata = {
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
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

const questionPack = questionPackJson as GeneratedHjbPrimaryQuestionPack;
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbPrimaryTopics.map((topic) => [topic.id, topic]));

const reviewedCorrections: Record<string, ReviewedHjbPrimaryCorrection> = {
  "hjb-primary-ds-v1-p1-125": {
    promptEn: "When calculating 17 - 8, Xiaoding splits 8 into 7 and 1, first calculates 17 - 7 = 10, and then calculates 10 - 1 = 9. What is this method called?",
    acceptedAnswers: [
      "分拆减数",
      "分拆减数法",
      "平十",
      "平十法",
      "splitting the subtrahend",
      "bridge-to-ten method"
    ],
    explanationZhHans: "把减数8拆成7和1，先减7凑成10，再减1得9。这种方法叫平十法，也叫分拆减数法。",
    explanationEn: "Split the subtrahend 8 into 7 and 1. Subtract 7 first to bridge to 10, then subtract 1 to get 9. This is the bridge-to-ten method, also called splitting the subtrahend."
  },
  "hjb-primary-ds-v1-p1-128": {
    promptEn: "When calculating 12 - 7, Xiaoming splits 7 into 2 and 5, first calculates 12 - 2 = 10, and then calculates 10 - 5 = 5. What is this method called?",
    acceptedAnswers: [
      "连减",
      "连减法",
      "分拆减数",
      "分拆减数法",
      "平十",
      "平十法",
      "successive subtraction",
      "splitting the subtrahend",
      "bridge-to-ten method"
    ],
    explanationZhHans: "把减数7拆成2和5，先减2凑成10，再减5得5。这是连减法，也叫平十法或分拆减数法。",
    explanationEn: "Split the subtrahend 7 into 2 and 5. Subtract 2 first to bridge to 10, then subtract 5 to get 5. This is successive subtraction, also called the bridge-to-ten method or splitting the subtrahend."
  },
  "hjb-primary-ds-v1-p1-156": {
    answer: "20 stickers",
    acceptedAnswers: ["20张", "20"]
  },
  "hjb-primary-ds-v1-p2-028": {
    promptZhHans: "下面哪个金额正好等于3元8角？",
    promptEn: "Which amount is exactly equal to 3 yuan and 8 jiao?",
    optionsZhHans: ["3.3元", "3.7元", "3.8元", "3.9元"],
    optionsEn: ["3.3 yuan", "3.7 yuan", "3.8 yuan", "3.9 yuan"],
    answer: "3.8元",
    acceptedAnswers: ["3.8元", "3.8 yuan"],
    explanationZhHans: "8角=0.8元，所以3元8角=3.8元，只有第三个选项正确。",
    explanationEn: "Eight jiao is 0.8 yuan, so 3 yuan and 8 jiao equals 3.8 yuan. Only the third option is correct."
  },
  "hjb-primary-ds-v1-p2-064": {
    promptZhHans: "以操场为原点O(0,0)，向东为x轴正方向，向北为y轴正方向。图书馆在(0,2)，花坛在(2,0)，校门在(0,-2)。小明在图书馆东面1格，小红在操场北面1格，小刚在花坛西面1格，小丽在校门南面1格。谁和小明在以操场为中心的同一个方向？",
    promptEn: "Use the playground as the origin O(0,0), with east as the positive x-direction and north as the positive y-direction. The library is at (0,2), the flower bed at (2,0), and the school gate at (0,-2). Xiaoming is one grid square east of the library, Xiaohong one square north of the playground, Xiaogang one square west of the flower bed, and Xiaoli one square south of the gate. Who is in the same direction from the playground as Xiaoming?",
    optionsZhHans: ["小红", "小刚", "小丽", "没有人"],
    optionsEn: ["Xiaohong", "Xiaogang", "Xiaoli", "No one"],
    answer: "没有人",
    acceptedAnswers: ["没有人", "无人", "No one"],
    explanationZhHans: "小明在(1,2)，相对操场在东北方向；小红在(0,1)，小刚在(1,0)，小丽在(0,-3)，分别在北、东、南方向。因此没有人与小明方向相同。",
    explanationEn: "Xiaoming is at (1,2), northeast of the playground. Xiaohong is at (0,1), Xiaogang at (1,0), and Xiaoli at (0,-3), which are north, east, and south respectively. Therefore no one is in the same direction as Xiaoming."
  },
  "hjb-primary-ds-v1-p2-096": {
    answer: "20 picture cards",
    acceptedAnswers: ["20张", "20"]
  },
  "hjb-primary-ds-v1-p2-120": {
    promptZhHans: "早晨太阳从东方升起。小杰面向太阳，说：“前面是东，后面是西，左面是北，右面是南。”他说得对吗？请完整写出判断和四个方向。",
    promptEn: "In the morning, the Sun rises in the east. Xiaojie faces the Sun and says, 'East is in front, west is behind, north is to the left, and south is to the right.' Is he correct? Give the decision and all four directions.",
    answer: "对；前面是东，后面是西，左面是北，右面是南。",
    acceptedAnswers: [
      "对；前面是东，后面是西，左面是北，右面是南。",
      "正确；前面是东，后面是西，左面是北，右面是南。",
      "Correct; east is in front, west is behind, north is to the left, and south is to the right."
    ],
    explanationZhHans: "早晨太阳从东方升起，面向太阳就是面向东；面向东时，后面是西，左面是北，右面是南，所以小杰的说法完全正确。",
    explanationEn: "The Sun rises in the east, so facing the morning Sun means facing east. West is behind, north is to the left, and south is to the right. Xiaojie's complete statement is correct."
  },
  "hjb-primary-ds-v1-p2-124": {
    promptZhHans: "复习课上，老师让同学们把下面的算式按运算符号分类：①3×5，②2+2+2，③4×6，④5+5+5。下面哪种分类正确？",
    promptEn: "In a review lesson, the teacher asks the class to classify these expressions by operation sign: 1) 3×5, 2) 2+2+2, 3) 4×6, and 4) 5+5+5. Which classification is correct?",
    optionsZhHans: [
      "乘法算式：①③；加法算式：②④",
      "乘法算式：①④；加法算式：②③",
      "乘法算式：②③；加法算式：①④",
      "乘法算式：①②；加法算式：③④"
    ],
    optionsEn: [
      "Multiplication: 1 and 3; addition: 2 and 4",
      "Multiplication: 1 and 4; addition: 2 and 3",
      "Multiplication: 2 and 3; addition: 1 and 4",
      "Multiplication: 1 and 2; addition: 3 and 4"
    ],
    answer: "乘法算式：①③；加法算式：②④",
    acceptedAnswers: [
      "乘法算式：①③；加法算式：②④",
      "Multiplication: 1 and 3; addition: 2 and 4"
    ],
    explanationZhHans: "①和③含乘号，是乘法算式；②和④含加号，是加法算式。因此第一种分类正确。",
    explanationEn: "Expressions 1 and 3 contain multiplication signs, while 2 and 4 contain addition signs. Therefore the first classification is correct."
  },
  "hjb-primary-ds-v1-p2-138": {
    promptZhHans: "小丽用一根长20厘米的绳子沿课桌长边连续量3次。第三次量到课桌边缘时，有5厘米绳子超出桌边。课桌长边是多少厘米？请列式计算。",
    promptEn: "Xiaoli uses a 20 cm rope to measure along the long edge of a desk three consecutive times. On the third placement, 5 cm of the rope extends beyond the desk edge. How long is the desk edge? Write the calculation.",
    answer: "20×3-5=55（厘米）",
    acceptedAnswers: ["20×3-5=55（厘米）", "20×3-5=55厘米", "20×3-5=55 cm"],
    explanationZhHans: "三次绳长共20×3=60（厘米），其中5厘米超出桌边，不属于课桌长度，所以课桌长边是60-5=55（厘米）。",
    explanationEn: "Three rope lengths total 20×3=60 cm. The 5 cm extending beyond the desk is not part of its length, so the desk edge is 60-5=55 cm."
  },
  "hjb-primary-ds-v1-p2-201": {
    promptZhHans: "用数字卡片3、0、5、8各一次摆出一个四位数，要求这个数只读一个零，并且千位上的数字比百位上的数字小。下面哪个数符合要求？",
    promptEn: "Use each of the digit cards 3, 0, 5, and 8 once to make a four-digit number. The number must be read with exactly one zero, and its thousands digit must be less than its hundreds digit. Which number meets both conditions?",
    optionsZhHans: ["3508", "3085", "5083", "8053"],
    optionsEn: ["3508", "3085", "5083", "8053"],
    answer: "3508",
    acceptedAnswers: ["3508"],
    explanationZhHans: "3508读作“三千五百零八”，只读一个零，并且千位3小于百位5。其余三个数的百位都是0，千位数字都大于0，不符合条件。",
    explanationEn: "3508 is read with one zero, and its thousands digit 3 is less than its hundreds digit 5. In each other option the hundreds digit is 0, so its thousands digit is not less than its hundreds digit."
  },
  "hjb-primary-ds-v1-p3-011": {
    promptZhHans: "小马虎把528看成582，与196相加得到778。请依次写出百位、十位、个位的变化，并求正确的和。",
    promptEn: "Xiaomahu misread 528 as 582 and added 196 to get 778. State the changes in the hundreds, tens, and ones places, then find the correct sum.",
    answer: "百位不变，十位多了6个十，个位少了6个一；正确的和是724。",
    acceptedAnswers: [
      "百位不变，十位多了6个十，个位少了6个一；正确的和是724。",
      "百位不变，十位多6个十，个位少6个一；正确的和是724。",
      "The hundreds digit is unchanged, the tens increase by six tens, and the ones decrease by six ones; the correct sum is 724."
    ],
    explanationZhHans: "582比528多54：百位不变，十位由2变8，多6个十；个位由8变2，少6个一，净增加60-6=54。因此正确的和是778-54=724。",
    explanationEn: "582 is 54 greater than 528: the hundreds digit is unchanged, the tens increase from 2 to 8 by six tens, and the ones decrease from 8 to 2 by six ones, for a net increase of 60-6=54. Therefore the correct sum is 778-54=724."
  },
  "hjb-primary-ds-v1-p3-040": {
    promptZhHans: "老师把一些铅笔分给小朋友，每人分4支正好分完；每人分6支也正好分完。铅笔的数量可能是多少支？",
    promptEn: "A teacher can distribute some pencils equally with either 4 pencils per child or 6 pencils per child, with none left over. How many pencils could there be?",
    optionsZhHans: ["18支", "24支", "30支", "42支"],
    optionsEn: ["18 pencils", "24 pencils", "30 pencils", "42 pencils"],
    answer: "24支",
    acceptedAnswers: ["24支", "24 pencils"],
    explanationZhHans: "铅笔数必须同时是4和6的倍数，也就是12的倍数。四个选项中只有24是12的倍数，所以选第二项。",
    explanationEn: "The number must be divisible by both 4 and 6, so it must be a multiple of 12. Only 24 is a multiple of 12."
  },
  "hjb-primary-ds-v1-p3-108": {
    promptZhHans: "一根绳子对折一次，使两端重合，再在折后绳子的中点剪一刀，同时剪断两层。展开后，依次填写段数和从一端到另一端各段占原绳长的分数，格式为“___段；___，___，___”。",
    promptEn: "Fold a rope once so that its two ends coincide, then make one cut at the midpoint of the folded rope, cutting through both layers. After unfolding, enter the number of pieces and the fraction of the original length of each piece from one end to the other, in the format '___ pieces; ___, ___, ___'.",
    answer: "3段；1/4，1/2，1/4",
    acceptedAnswers: [
      "3段；1/4，1/2，1/4",
      "3段；1/4、1/2、1/4",
      "3 pieces; 1/4, 1/2, 1/4"
    ],
    explanationZhHans: "折后中点对应原绳的1/4和3/4位置，一刀同时形成两个切口。展开后共有3段，长度依次是原绳的1/4、1/2、1/4。",
    explanationEn: "The midpoint of the folded rope corresponds to the 1/4 and 3/4 points of the original rope, so cutting both layers creates two cut points. After unfolding there are three pieces of lengths 1/4, 1/2, and 1/4 of the original rope."
  },
  "hjb-primary-ds-v1-p3-237": {
    promptZhHans: "学校要给一块长8米、宽5米的长方形花坛围上篱笆。下面哪个说法正确？",
    promptEn: "A school will put a fence around a rectangular flower bed that is 8 metres long and 5 metres wide. Which statement is correct?",
    optionsZhHans: ["篱笆长40米", "篱笆长26米", "花坛面积是26平方米", "花坛面积是45平方米"],
    optionsEn: ["The fence is 40 m long", "The fence is 26 m long", "The area is 26 m²", "The area is 45 m²"],
    answer: "篱笆长26米",
    acceptedAnswers: ["篱笆长26米", "The fence is 26 m long"],
    explanationZhHans: "篱笆长度是花坛周长，(8+5)×2=26（米）；花坛面积是8×5=40（平方米）。因此只有第二项正确。",
    explanationEn: "The fence length is the perimeter: (8+5)×2=26 m. The area is 8×5=40 m². Therefore only the second option is correct."
  },
  "hjb-primary-ds-v1-p3-249": {
    promptZhHans: "三（2）班最喜欢各运动项目的人数为：足球12人，篮球8人，乒乓球10人，羽毛球6人。下面哪个说法正确？",
    promptEn: "In Class 3(2), 12 students prefer football, 8 basketball, 10 table tennis, and 6 badminton. Which statement is correct?",
    optionsZhHans: [
      "喜欢足球的人数是喜欢羽毛球人数的3倍",
      "喜欢篮球的人数比喜欢乒乓球的少2人",
      "喜欢乒乓球的人数比喜欢篮球的多4人",
      "喜欢篮球的人数最少"
    ],
    optionsEn: [
      "Football has three times as many students as badminton",
      "Basketball has 2 fewer students than table tennis",
      "Table tennis has 4 more students than basketball",
      "Basketball has the fewest students"
    ],
    answer: "喜欢篮球的人数比喜欢乒乓球的少2人",
    acceptedAnswers: [
      "喜欢篮球的人数比喜欢乒乓球的少2人",
      "Basketball has 2 fewer students than table tennis"
    ],
    explanationZhHans: "10-8=2，所以喜欢篮球的比喜欢乒乓球的少2人。12不是6的3倍，10只比8多2，人数最少的是羽毛球。因此只有第二项正确。",
    explanationEn: "Because 10-8=2, basketball has 2 fewer students than table tennis. Twelve is not three times 6, table tennis has only 2 more than basketball, and badminton has the fewest students. Only the second option is correct."
  },
  "hjb-primary-ds-v1-p4-048": {
    promptZhHans: "小华和小明各有一块同样大小的长方形蛋糕。小华吃了2/8，小明吃了3/8。依次填写吃得更多的人和比较理由，格式为“___；___”。",
    promptEn: "Xiaohua and Xiaoming each have an equally sized rectangular cake. Xiaohua eats 2/8 and Xiaoming eats 3/8. Enter who eats more and the comparison reason in the format '___; ___'.",
    answer: "小明；整体相同、分母相同，分子3>2，所以3/8>2/8。",
    acceptedAnswers: [
      "小明；整体相同、分母相同，分子3>2，所以3/8>2/8。",
      "小明；两块蛋糕同样大，分母相同，3>2，所以3/8>2/8。",
      "Xiaoming; the wholes and denominators are the same, and 3>2, so 3/8>2/8."
    ],
    explanationZhHans: "两块蛋糕同样大，整体相同；两个分数的分母同为8，所以可以直接比较分子。3>2，因此3/8>2/8，小明吃得更多。",
    explanationEn: "The cakes are equally sized, so the wholes are the same. Both fractions have denominator 8, so compare their numerators directly. Since 3>2, 3/8>2/8 and Xiaoming eats more."
  },
  "hjb-primary-ds-v1-p4-099": {
    promptZhHans: "用量角器量∠AOB时，射线OA与量角器右端的0°刻度线重合，射线OB经过内圈130°、外圈50°的同一条刻度线。小圆读130°，小方读50°。依次填写角度、读对的人和理由，格式为“___；___；___”。",
    promptEn: "When measuring angle AOB, ray OA aligns with the 0° mark at the right end of the protractor. Ray OB crosses the same tick marked 130° on the inner scale and 50° on the outer scale. Xiaoyuan reads 130° and Xiaofang reads 50°. Enter the angle, who reads it correctly, and the reason in the format '___; ___; ___'.",
    answer: "130°；小圆；OA对准右端0°，应从右端0°起读内圈刻度。",
    acceptedAnswers: [
      "130°；小圆；OA对准右端0°，应从右端0°起读内圈刻度。",
      "130度；小圆；OA对准右端0度，应读内圈130度。",
      "130°; Xiaoyuan; OA aligns with 0° on the right, so read the inner scale starting from that right-hand 0° mark."
    ],
    explanationZhHans: "读量角器时要从与角的一边重合的0°刻度起读。OA对准右端0°，因此沿内圈从右向左读到OB是130°，小圆正确。",
    explanationEn: "A protractor must be read from the 0° mark aligned with one side of the angle. Because OA aligns with the right-hand 0° mark, read the inner scale from right to left to OB, giving 130°. Xiaoyuan is correct."
  },
  "hjb-primary-ds-v1-p4-188": {
    promptZhHans: "折线统计图的纵轴以115为起始刻度线，每相邻两条刻度线相差5。若星期二的数据是135，且不把115这条起始线计入向上的条数，135应画在115上方第几条刻度线上？",
    promptEn: "A line graph's vertical axis starts at the 115 gridline, and adjacent gridlines differ by 5. If Tuesday's value is 135, and the 115 starting line is not counted among the lines above it, on which gridline above 115 should 135 be plotted?",
    answer: "第4条刻度线",
    acceptedAnswers: ["第4条刻度线", "第4条", "4", "the 4th gridline"],
    explanationZhHans: "135-115=20，20÷5=4。不计115起始线，135在它上方第4条刻度线上。",
    explanationEn: "135-115=20 and 20÷5=4. Excluding the 115 starting line, 135 is on the fourth gridline above it."
  },
  "hjb-primary-ds-v1-p4-199": {
    promptZhHans: "某地连续6个月每月1日记录的平均气温分别为：1月2℃，2月5℃，3月9℃，4月14℃，5月19℃，6月24℃。下面哪个说法正确？",
    promptEn: "The recorded average temperatures on the first day of six consecutive months were 2°C in January, 5°C in February, 9°C in March, 14°C in April, 19°C in May, and 24°C in June. Which statement is correct?",
    optionsZhHans: [
      "记录的平均气温一直下降",
      "3月1日到4月1日上升了6℃",
      "6月1日记录的平均气温最高，为24℃",
      "1月1日到2月1日上升了2℃"
    ],
    optionsEn: [
      "The recorded average temperature decreased throughout",
      "It rose by 6°C from March 1 to April 1",
      "The highest recorded average temperature was 24°C on June 1",
      "It rose by 2°C from January 1 to February 1"
    ],
    answer: "6月1日记录的平均气温最高，为24℃",
    acceptedAnswers: [
      "6月1日记录的平均气温最高，为24℃",
      "The highest recorded average temperature was 24°C on June 1"
    ],
    explanationZhHans: "六个记录值依次上升，最高记录值是6月1日的24℃。3月1日到4月1日上升5℃，1月1日到2月1日上升3℃，所以只有第三项正确。",
    explanationEn: "The six recorded values increase, and the highest is 24°C on June 1. The rise from March 1 to April 1 is 5°C, and from January 1 to February 1 is 3°C. Only the third option is correct."
  },
  "hjb-primary-ds-v1-p4-236": {
    promptZhHans: "一个小数恰有两位小数。用“五舍六入”法保留一位小数，即百分位是0至5时舍去，是6至9时向十分位进1。所得结果是3.5，这个两位小数最大是多少？",
    promptEn: "A number has exactly two decimal places. It is rounded to one decimal place using the rule 'discard 0 through 5, round up 6 through 9' according to the hundredths digit. The result is 3.5. What is the greatest possible two-decimal-place number?",
    answer: "3.55",
    acceptedAnswers: ["3.55"],
    explanationZhHans: "要使原数尽量大且舍去百分位后仍为3.5，十分位取5，百分位最多取5。因此最大是3.55；若百分位是6，就会进位得到3.6。",
    explanationEn: "To make the original number as large as possible while still discarding the hundredths digit to get 3.5, use 5 in the tenths place and at most 5 in the hundredths place. Thus the greatest number is 3.55; a hundredths digit of 6 would round it to 3.6."
  },
  "hjb-primary-ds-v1-p5-036": {
    promptZhHans: "学校图书馆里，故事书本数是科技书的3倍。故事书借出15本后，剩下的故事书比科技书多55本。科技书和故事书原来各有多少本？请按“科技书___本；故事书___本”的格式填写。",
    promptEn: "A school library originally has three times as many storybooks as science books. After 15 storybooks are lent out, the remaining number of storybooks is 55 more than the number of science books. How many of each were there originally? Answer in the format '___ science books; ___ storybooks'.",
    answer: "科技书35本；故事书105本",
    acceptedAnswers: [
      "科技书35本；故事书105本",
      "科技书35本，故事书105本",
      "35 science books; 105 storybooks"
    ],
    explanationZhHans: "设科技书有x本，则故事书有3x本。根据题意列方程3x-15=x+55，解得x=35，故事书有3×35=105本。检验：105-15-35=55。",
    explanationEn: "Let x be the number of science books, so there are 3x storybooks. The condition gives 3x-15=x+55, hence x=35 and 3x=105. Check: 105-15-35=55."
  },
  "hjb-primary-ds-v1-p5-105": {
    promptZhHans: "某商店星期一到星期日卖出的书包数依次是8、6、9、7、10、12、11个。依次填写日平均数和高于平均数的星期，格式为“平均___个；星期___”。",
    promptEn: "A shop sells 8, 6, 9, 7, 10, 12, and 11 schoolbags from Monday through Sunday. Enter the daily mean and the days above the mean in the format 'mean ___; ___'.",
    answer: "平均9个；星期五、星期六、星期日",
    acceptedAnswers: [
      "平均9个；星期五、星期六、星期日",
      "日平均9个；星期五、星期六、星期日",
      "mean 9; Friday, Saturday, and Sunday"
    ],
    explanationZhHans: "总数是8+6+9+7+10+12+11=63，平均数是63÷7=9。只有星期五10个、星期六12个、星期日11个高于9；星期三9个等于平均数，不算高于。",
    explanationEn: "The total is 8+6+9+7+10+12+11=63, so the mean is 63÷7=9. Only Friday's 10, Saturday's 12, and Sunday's 11 are above 9; Wednesday's 9 equals the mean and is not above it."
  },
  "hjb-primary-ds-v1-p5-106": {
    promptZhHans: "五（1）班第一小组6名同学1分钟跳绳的次数是120、135、110、125、130、140。关于这组数据，下面哪个说法正确？",
    promptEn: "Six students in the first group of Class 5(1) made 120, 135, 110, 125, 130, and 140 jumps in one minute. Which statement about the data is correct?",
    optionsZhHans: ["平均数是130次", "平均数是125次", "平均数约127次", "平均数是128次"],
    optionsEn: ["The mean is 130", "The mean is 125", "The mean is about 127", "The mean is 128"],
    answer: "平均数约127次",
    acceptedAnswers: ["平均数约127次", "平均数约为127次", "The mean is about 127"],
    explanationZhHans: "总次数是120+135+110+125+130+140=760，平均数是760÷6≈126.67，取整约为127次。因此第三项正确。",
    explanationEn: "The total is 120+135+110+125+130+140=760. The mean is 760÷6≈126.67, which is about 127 to the nearest whole number. The third option is correct."
  },
  "hjb-primary-ds-v1-p5-125": {
    promptZhHans: "环保小组上周5个上学日收集废纸5.2、4.8、5.0、5.6、4.4千克。本周也按5个上学日估算，假设每天收集量约等于上周日平均数；每千克废纸可换0.8千克再生纸。依次填写上周日平均数和本周约能换的再生纸质量。",
    promptEn: "Over five school days last week, an environmental group collected 5.2, 4.8, 5.0, 5.6, and 4.4 kg of waste paper. Estimate this week as five school days, with each day's collection equal to last week's daily mean. Each kilogram of waste paper can be exchanged for 0.8 kg of recycled paper. Enter last week's daily mean and the amount of recycled paper expected this week.",
    answer: "日平均5千克；本周约换20千克再生纸",
    acceptedAnswers: [
      "日平均5千克；本周约换20千克再生纸",
      "平均5千克；本周大约换20千克再生纸",
      "daily mean 5 kg; about 20 kg of recycled paper this week"
    ],
    explanationZhHans: "上周总量是5.2+4.8+5.0+5.6+4.4=25（千克），日平均是25÷5=5（千克）。本周5个上学日估计收集5×5=25（千克），可换25×0.8=20（千克）再生纸。",
    explanationEn: "Last week's total was 5.2+4.8+5.0+5.6+4.4=25 kg, so the daily mean was 25÷5=5 kg. Over five school days this week, estimate 5×5=25 kg of waste paper, which exchanges for 25×0.8=20 kg of recycled paper."
  },
  "hjb-primary-ds-v1-p5-126": {
    promptZhHans: "6名同学1分钟跳绳的成绩是145、138、152、140、148、155下。（1）求平均数，结果保留两位小数；（2）说明这个平均数表示什么。请完整填写两项。",
    promptEn: "Six students make 145, 138, 152, 140, 148, and 155 jumps in one minute. (1) Find the mean, rounded to two decimal places. (2) State what the mean represents. Complete both parts.",
    answer: "（1）146.33下；（2）表示这6名同学1分钟跳绳的整体水平。",
    acceptedAnswers: [
      "（1）146.33下；（2）表示这6名同学1分钟跳绳的整体水平。",
      "146.33下；表示这6名同学1分钟跳绳的整体水平。",
      "(1) 146.33 jumps; (2) it represents the overall one-minute jump-rope performance of the six students."
    ],
    explanationZhHans: "总成绩是145+138+152+140+148+155=878（下），平均数是878÷6=439/3≈146.33（下）。平均数用于表示这6名同学1分钟跳绳的整体水平。",
    explanationEn: "The total is 145+138+152+140+148+155=878 jumps. The mean is 878÷6=439/3≈146.33 jumps. This mean represents the overall one-minute jump-rope performance of the six students."
  },
  "hjb-primary-ds-v1-p5-148": {
    promptZhHans: "下面哪个数既是42的因数，又是7的倍数？",
    promptEn: "Which number is both a factor of 42 and a multiple of 7?",
    optionsZhHans: ["12", "21", "28", "35"],
    optionsEn: ["12", "21", "28", "35"],
    answer: "21",
    acceptedAnswers: ["21"],
    explanationZhHans: "21×2=42，所以21是42的因数；21=7×3，所以21也是7的倍数。其余三个选项不同时满足两个条件。",
    explanationEn: "Since 21×2=42, 21 is a factor of 42; since 21=7×3, it is also a multiple of 7. None of the other options meets both conditions."
  },
  "hjb-primary-ds-v1-p6-052": {
    promptZhHans: "下面哪组中的两个比可以组成比例？",
    promptEn: "In which option can the two ratios form a proportion?",
    optionsZhHans: ["6:10和9:15", "20:5和1:4", "0.5:0.2和3:2", "1.2:0.4和0.6:0.3"],
    optionsEn: ["6:10 and 9:15", "20:5 and 1:4", "0.5:0.2 and 3:2", "1.2:0.4 and 0.6:0.3"],
    answer: "6:10和9:15",
    acceptedAnswers: ["6:10和9:15", "6:10 and 9:15"],
    explanationZhHans: "6:10=3:5，9:15=3:5，两个比相等，可以组成比例。其余各组的两个比值分别不相等，所以只有第一项正确。",
    explanationEn: "Both 6:10 and 9:15 simplify to 3:5, so they form a proportion. The two ratios in every other option have different values. Only the first option is correct."
  },
  "hjb-primary-ds-v1-p6-205": {
    promptZhHans: "方程2(x-3)=8去括号后得到下面哪个方程？",
    promptEn: "Which equation results when the brackets in 2(x-3)=8 are expanded?",
    optionsZhHans: ["x - 3 = 4", "2x - 3 = 8", "x - 3 = 8", "2x - 6 = 8"],
    optionsEn: ["x - 3 = 4", "2x - 3 = 8", "x - 3 = 8", "2x - 6 = 8"],
    answer: "2x - 6 = 8",
    acceptedAnswers: ["2x - 6 = 8", "2x-6=8"],
    explanationZhHans: "用乘法分配律把2分别乘括号内的x和-3，得到2x-6=8，所以选第四项。",
    explanationEn: "Distribute 2 to both x and -3 inside the brackets to obtain 2x-6=8. Therefore the fourth option is correct."
  },
  "hjb-primary-ds-v1-p6-213": {
    promptZhHans: "方程2(x-4)=10两边同时除以2后得到下面哪个方程？",
    promptEn: "Which equation results when both sides of 2(x-4)=10 are divided by 2?",
    optionsZhHans: ["x - 4 = 5", "2x - 4 = 10", "x - 4 = 10", "2x - 8 = 10"],
    optionsEn: ["x - 4 = 5", "2x - 4 = 10", "x - 4 = 10", "2x - 8 = 10"],
    answer: "x - 4 = 5",
    acceptedAnswers: ["x - 4 = 5", "x-4=5"],
    explanationZhHans: "方程两边同时除以2，左边2(x-4)÷2=x-4，右边10÷2=5，得到x-4=5，所以选第一项。",
    explanationEn: "Dividing both sides by 2 gives 2(x-4)÷2=x-4 and 10÷2=5, so the result is x-4=5. The first option is correct."
  },
  "hjb-primary-ds-v1-p5-001": {
    optionsZhHans: ["0.5元", "19.5元", "0.05元", "5元"],
    answer: "0.5元",
    acceptedAnswers: ["0.5元", "0.5 yuan"],
    explanationZhHans: "先算苹果的总价：7.8×2.5=19.5（元）。再算找回的钱：20-19.5=0.5（元）。因此应找回0.5元。"
  },
  "hjb-primary-ds-v1-p1-028": {
    promptZhHans: "下面哪个物体的形状通常最接近圆柱？\nA. 粉笔盒\nB. 直筒水杯\nC. 篮球\nD. 魔方",
    optionsZhHans: ["A. 粉笔盒", "B. 直筒水杯", "C. 篮球", "D. 魔方"],
    answer: "B. 直筒水杯",
    acceptedAnswers: ["B. 直筒水杯", "直筒水杯"],
    explanationZhHans: "直筒水杯通常上下一样粗，底面和杯口都是圆形，侧面是曲面，整体最接近圆柱。粉笔盒和魔方分别接近长方体、正方体，篮球接近球。"
  },
  "hjb-primary-ds-v1-p1-099": {
    promptZhHans: "小美把长方体和正方体归为第一类，把圆柱和球归为第二类。请根据物体表面的特点，用一句话说明她的分类理由。",
    answer: "第一类图形的所有面都是平面，第二类图形至少有一个曲面。",
    acceptedAnswers: [
      "第一类图形的所有面都是平面，第二类图形至少有一个曲面。",
      "第一类所有面都是平面，第二类至少有一个曲面。"
    ],
    explanationZhHans: "长方体和正方体的所有面都是平面；圆柱既有平面也有曲面，球面是曲面。因此应按“所有面都是平面”和“至少有一个曲面”来分类。"
  },
  "hjb-primary-ds-v1-p1-101": {
    promptZhHans: "小乐把长方体、正方体归为第一类，把圆柱、球归为第二类。请填空：第一类图形的所有面都是（ ），第二类图形至少有一个（ ）。",
    answer: "平面，曲面",
    acceptedAnswers: ["平面，曲面", "平面 曲面", "平面；曲面"],
    explanationZhHans: "长方体和正方体的所有面都是平面；圆柱和球都至少有一个曲面，所以两空依次填“平面”和“曲面”。"
  },
  "hjb-primary-ds-v1-p1-116": {
    promptZhHans: "在整理数学知识时，小明把内容分成三类：第一类①②，第二类③④，第三类⑤⑥。其中①数数、②加法、③减法、④长方体、⑤正方体、⑥圆柱。这样的分类对吗？如果不对，请指出分错的内容，并把它们重新分成两类。",
    promptEn: "While organizing math topics, Xiaoming made three groups: the first group contains 1 and 2, the second contains 3 and 4, and the third contains 5 and 6. Here 1 is counting, 2 is addition, 3 is subtraction, 4 is a cuboid, 5 is a cube, and 6 is a cylinder. Is this classification correct? If not, identify the misplaced items and regroup all six items into two categories.",
    answer: "不对；①②③是数和运算，④⑤⑥是立体图形。",
    acceptedAnswers: [
      "不对；①②③是数和运算，④⑤⑥是立体图形。",
      "不对，①②③是数和运算，④⑤⑥是立体图形。",
      "不對；①②③是數和運算，④⑤⑥是立體圖形。",
      "No. Items 1, 2, and 3 are numbers and operations; items 4, 5, and 6 are solid figures."
    ],
    explanationZhHans: "③减法与①数数、②加法同属数和运算，④长方体与⑤正方体、⑥圆柱同属立体图形。因此小明把③和④放在同一类是错误的；正确的两类是①②③和④⑤⑥。",
    explanationEn: "Subtraction (3) belongs with counting (1) and addition (2) as numbers and operations. A cuboid (4) belongs with a cube (5) and a cylinder (6) as solid figures. Therefore putting 3 and 4 together is the error; the correct groups are 1-2-3 and 4-5-6."
  },
  "hjb-primary-ds-v1-p3-126": {
    acceptedAnswers: [
      "拆分法（或数的分解法），将238拆成200、30和8分别乘4再相加。",
      "拆分法，将238拆成200、30和8分别乘4再相加",
      "数的分解法，将238拆成200、30和8分别乘4再相加"
    ]
  },
  "hjb-primary-ds-v1-p4-057": {
    acceptedAnswers: [
      "小明拿的更多。因为两块蛋糕同样大，第一块分成4份，每份是1/4；第二块分成6份，每份是1/6。1/4大于1/6，所以小明拿的更多。"
    ]
  },
  "hjb-primary-ds-v1-p4-125": {
    acceptedAnswers: [
      "方法合理，结果在3平方米到5平方米之间均可。例如：用庹量出黑板长约4米，宽约1米，面积约4平方米。",
      "用庹量，长约4米，宽约1米，面积约4平方米"
    ]
  },
  "hjb-primary-ds-v1-p1-175": {
    promptZhHans: "下面哪个钟面表示6时半？",
    explanationZhHans: "6时半时，分针指向6，时针位于6和7之间，所以应选择分针指向6、时针位于6和7之间的钟面。"
  },
  "hjb-primary-ds-v1-p1-196": {
    type: "short-answer"
  },
  "hjb-primary-ds-v1-p1-066": {
    acceptedAnswers: ["8-3=5，原来有5只小鸟。", "8-3=5，原来有5只。", "8-3=5（只）"]
  },
  "hjb-primary-ds-v1-p1-161": {
    type: "short-answer"
  },
  "hjb-primary-ds-v1-p1-216": {
    type: "short-answer",
    answer: "门宽大约是72厘米，因为一拃约12厘米，6×12=72（厘米）。",
    acceptedAnswers: [
      "门宽大约是72厘米，因为一拃约12厘米，6×12=72（厘米）。",
      "约72厘米；6×12=72（厘米）。"
    ],
    explanationZhHans: "小明一拃约12厘米，门宽约6拃，所以估计门宽为6×12=72厘米。估测结果应写“大约72厘米”。"
  },
  "hjb-primary-ds-v1-p2-051": {
    promptZhHans: "学校平面图上，教学楼在校门的北面，操场在教学楼的东面。请问操场在校门的哪个方向？",
    answer: "东北",
    acceptedAnswers: ["东北", "东北方向", "东北面"],
    explanationZhHans: "从校门先向北到教学楼，再向东到操场，所以操场在校门的东北方向。"
  },
  "hjb-primary-ds-v1-p2-054": {
    promptZhHans: "从学校出发，先向北走2格，再向东走1格，最后向南走1格到电影院。电影院在学校的哪个方向？",
    explanationZhHans: "向北2格再向南1格，合起来向北1格；同时向东1格，所以电影院在学校的东北方向。"
  },
  "hjb-primary-ds-v1-p2-006": {
    answer: "56-23=33（颗）；验算：33+23=56（颗），所以还剩33颗。",
    acceptedAnswers: [
      "56-23=33（颗）；验算：33+23=56（颗），所以还剩33颗。",
      "56-23=33；33+23=56；还剩33颗。"
    ],
    explanationZhHans: "竖式计算56-23，个位6-3=3，十位5-2=3，得33。再用加法验算：33+23=56，与原数相等，所以还剩33颗。"
  },
  "hjb-primary-ds-v1-p2-078": {
    answer: "方法一：4+4+4+4+4=20，5×4=20；方法二：5+5+5+5=20，4×5=20。一共有20个苹果。",
    acceptedAnswers: [
      "方法一：4+4+4+4+4=20，5×4=20；方法二：5+5+5+5=20，4×5=20。一共有20个苹果。",
      "4+4+4+4+4=20，5×4=20；5+5+5+5=20，4×5=20。"
    ],
    explanationZhHans: "5袋、每袋4个可以看作5个4相加：4+4+4+4+4=20，对应5×4=20；也可利用乘法交换律写成4×5=20，并用5+5+5+5=20表示。一共有20个苹果。"
  },
  "hjb-primary-ds-v1-p2-187": {
    optionsZhHans: ["A. 4008", "B. 4080", "C. 4800", "D. 4010"],
    explanationZhHans: "4800读作“四千八百”，末尾的两个0不读。4008读作“四千零八”，4080读作“四千零八十”，4010读作“四千零一十”，后三个数都要读出“零”。"
  },
  "hjb-primary-ds-v1-p2-116": {
    type: "short-answer",
    acceptedAnswers: [
      "他错在第二步用加法，应该用减法。改正：3×5=15（元），15-8=7（元）。",
      "第二步15+8错了，应改为15-8=7（元）。"
    ]
  },
  "hjb-primary-ds-v1-p2-119": {
    type: "short-answer"
  },
  "hjb-primary-ds-v1-p2-117": {
    acceptedAnswers: [
      "够，还剩7元。计算：25+8=33（元），40-33=7（元）。答：够，还剩7元。",
      "25+8=33（元），40-33=7（元），所以钱够，还剩7元。"
    ]
  },
  "hjb-primary-ds-v1-p3-046": {
    explanationZhHans: "2:15加1小时是3:15，再加40分钟是3:55。分钟相加未满60，所以小时不再进1；如果分钟满60，就要向小时进1。"
  },
  "hjb-primary-ds-v1-p3-042": {
    answer: "从8:10到11:10是3小时，再到11:40是30分钟，共3小时30分钟。",
    acceptedAnswers: [
      "从8:10到11:10是3小时，再到11:40是30分钟，共3小时30分钟。",
      "11:40-8:10=3小时30分钟。"
    ]
  },
  "hjb-primary-ds-v1-p3-067": {
    optionsZhHans: [
      "A. 估算：20×8=160，精确：24×8=192，192比160大一些，合理。",
      "B. 估算：30×8=240，精确：24×8=192，192比240小，说明算错了。",
      "C. 估算：24×10=240，精确：24×8=192，192比240小，说明算错了。",
      "D. 估算：25×8=200，精确：24×8=192，192与200相差很大，说明算错了。"
    ],
    explanationZhHans: "把24看作20，估得20×8=160；精确结果192比160大一些，数量级和大小关系都合理。B、C、D虽然写出了精确结果，却错误地把合理的差异判断成计算错误。"
  },
  "hjb-primary-ds-v1-p3-083": {
    promptZhHans: "一个正方形相框的边长是6厘米，它的周长是______厘米。",
    answer: "24",
    acceptedAnswers: ["24", "24厘米"],
    explanationZhHans: "正方形四条边相等，周长=边长×4=6×4=24厘米。"
  },
  "hjb-primary-ds-v1-p3-215": {
    optionsZhHans: [
      "A. 小刚跳得最快，他跳了135下",
      "B. 小红跳得最慢，她跳了98下，所以小红不喜欢跳绳",
      "C. 小军比小丽多跳20下",
      "D. 小刚比小红多跳47下"
    ],
    explanationZhHans: "在相同的1分钟内，135下最多，所以小刚跳得最快。不能由成绩推断小红是否喜欢跳绳；小军比小丽多120-110=10下；小刚比小红多135-98=37下。"
  },
  "hjb-primary-ds-v1-p3-236": {
    type: "short-answer",
    answer: "正确结果是15.5；小胖没有把相同数位对齐，错误地移动了小数点。",
    acceptedAnswers: [
      "正确结果是15.5；小胖没有把相同数位对齐，错误地移动了小数点。",
      "15.5；没有把相同数位对齐，错误地移动了小数点。"
    ],
    explanationZhHans: "计算12.5+3时，应把3写成3.0并让小数点对齐，得到15.5。小胖把12.5变成125后没有按相同倍数处理另一个加数，最后又随意点小数点，改变了数的大小。"
  },
  "hjb-primary-ds-v1-p3-234": {
    type: "short-answer",
    acceptedAnswers: [
      "他忘记加小数部分0.5和0.2，正确结果是5.7",
      "忘记计算0.5+0.2=0.7；正确结果是5.7。"
    ]
  },
  "hjb-primary-ds-v1-p4-074": {
    explanationZhHans: "（1）298<300且19<20，所以298×19<300×20=6000。（2）21×20=420>403，因此403÷21<20。两处都应填“＜”。"
  },
  "hjb-primary-ds-v1-p4-006": {
    answer: "把23看成32，多加了9，所以正确的和是78-9=69。",
    acceptedAnswers: ["把23看成32，多加了9，所以正确的和是78-9=69。", "多加了9；78-9=69。"]
  },
  "hjb-primary-ds-v1-p4-009": {
    answer: "错误算式中的另一个乘数是189÷21=9，所以正确的积是12×9=108。",
    acceptedAnswers: [
      "错误算式中的另一个乘数是189÷21=9，所以正确的积是12×9=108。",
      "189÷21=9，12×9=108。"
    ]
  },
  "hjb-primary-ds-v1-p4-094": {
    optionsZhHans: [
      "A. 线段有两个端点，射线有一个端点，直线没有端点。",
      "B. 角的大小与边的长短有关。",
      "C. 圆的直径是半径的3倍。",
      "D. 用10倍的放大镜看一个30°的角，看到的角是300°。"
    ],
    explanationZhHans: "线段有两个端点，射线有一个端点，直线没有端点，所以A正确。角的大小与两边张开的程度有关；同一个圆中直径是半径的2倍；放大镜不会改变角的度数。"
  },
  "hjb-primary-ds-v1-p4-124": {
    optionsZhHans: [
      "A. 494999和504999",
      "B. 494999和505000",
      "C. 495001和504998",
      "D. 490000和509999"
    ],
    explanationZhHans: "省略万位后面的尾数时看千位。495001的千位是5，向万位进1，约为50万；504998的千位是4，舍去，约为50万。其他各组至少有一个数约为49万或51万。"
  },
  "hjb-primary-ds-v1-p4-142": {
    promptZhHans: "下面哪个算式运用了乘法结合律？",
    optionsZhHans: [
      "A. 25×(4×7)=(25×4)×7",
      "B. 45×99=45×100-45",
      "C. 36+25=25+36",
      "D. (45+55)+2=45+(55+2)"
    ],
    answer: "25×(4×7)=(25×4)×7",
    acceptedAnswers: ["25×(4×7)=(25×4)×7", "A. 25×(4×7)=(25×4)×7", "A"],
    explanationZhHans: "乘法结合律可以改变三个因数的结合顺序而不改变积，A符合(a×b)×c=a×(b×c)。B运用了乘法分配律，C是加法交换律，D是加法结合律。"
  },
  "hjb-primary-ds-v1-p4-163": {
    promptZhHans: "下面各数中，把数中的所有“0”都去掉后，大小不变的是（ ）。",
    explanationZhHans: "8.300中的所有0都在小数末尾，全部去掉后是8.3，大小不变。8.030、8.003和80.30中都有起占位作用的0，全部去掉会改变数的大小。"
  },
  "hjb-primary-ds-v1-p4-189": {
    optionsZhHans: [
      "A. 第1天20℃，第2天22℃，第3天23℃，第4天24℃，第5天25℃，第6天26℃",
      "B. 第1天18℃，第2天21℃，第3天20℃，第4天22℃，第5天23℃，第6天24℃",
      "C. 第1天22℃，第2天24℃，第3天23℃，第4天25℃，第5天26℃，第6天27℃",
      "D. 第1天19℃，第2天20℃，第3天22℃，第4天23℃，第5天24℃，第6天25℃"
    ],
    explanationZhHans: "折线图横轴间隔相同时，线段越陡表示相邻两天温差越大。B中第1天到第2天上升3℃，大于同组其余相邻温差，也大于其他选项的最大相邻温差2℃，所以选B。"
  },
  "hjb-primary-ds-v1-p5-223": {
    optionsZhHans: [
      "A. 这6个月的气温每月都上升6℃",
      "B. 气温上升最快的是2月到3月",
      "C. 气温上升最快的是5月到6月",
      "D. 4月的气温比3月上升了6℃"
    ],
    explanationZhHans: "相邻月份的升温分别为3℃、5℃、6℃、6℃、6℃。因此并非每月都上升6℃，最快升温有三段，不能只说2月到3月或5月到6月；4月比3月上升16-10=6℃，所以D正确。"
  },
  "hjb-primary-ds-v1-p5-006": {
    answer: "估算：(12.5-2.8)÷3≈10÷3≈3.3（米）；计算：(12.5-2.8)÷3=9.7÷3≈3.23（米）。",
    acceptedAnswers: [
      "估算：(12.5-2.8)÷3≈10÷3≈3.3（米）；计算：(12.5-2.8)÷3=9.7÷3≈3.23（米）。",
      "约3.3米；(12.5-2.8)÷3≈3.23米。"
    ]
  },
  "hjb-primary-ds-v1-p5-009": {
    answer: "估算：2.5×7.6≈20（元），约找回30元；计算：2.5×7.6=19（元），50-19=31（元）。31元接近30元，结果合理。",
    acceptedAnswers: [
      "估算：2.5×7.6≈20（元），约找回30元；计算：2.5×7.6=19（元），50-19=31（元）。31元接近30元，结果合理。",
      "估计找回约30元；实际找回31元，结果合理。"
    ]
  },
  "hjb-primary-ds-v1-p5-096": {
    answer: "（1）平均数约为145.7下；（2）6人中有4人的成绩超过140下，平均成绩也超过140下，说明这一组的整体成绩较高。",
    acceptedAnswers: [
      "（1）平均数约为145.7下；（2）6人中有4人的成绩超过140下，平均成绩也超过140下，说明这一组的整体成绩较高。",
      "平均数约145.7下；4人超过140下，整体成绩较高。"
    ],
    explanationZhHans: "平均数=(148+152+139+145+150+140)÷6=874÷6≈145.7（下）。6人中有4人的成绩超过140下，且平均数超过140下，因此可以用这些数据说明小组整体成绩较高。"
  },
  "hjb-primary-ds-v1-p5-163": {
    promptZhHans: "计算1/4+1/2，下面哪个结果正确？",
    optionsZhHans: ["A. 3/4", "B. 2/6", "C. 1/6", "D. 2/4"],
    answer: "3/4",
    acceptedAnswers: ["3/4", "四分之三", "A. 3/4", "A"],
    explanationZhHans: "先把1/2通分成2/4，再计算1/4+2/4=3/4，所以A正确。"
  },
  "hjb-primary-ds-v1-p6-058": {
    optionsZhHans: [
      "A. 圆的直径是半径的一半。",
      "B. 计算圆的周长可以用公式C=πd，计算面积也可以用同一个公式。",
      "C. 扇形是圆的一部分，所以扇形的面积一定比圆的面积小。",
      "D. 圆心角是90°的扇形，它的面积等于圆面积的四分之一。"
    ],
    explanationZhHans: "同一个圆中直径是半径的2倍，A错误；圆的面积公式是S=πr²，B错误；按本课约定，圆心角为360°时扇形与整圆重合，C中的“一定”不成立；90°是360°的四分之一，所以D正确。"
  },
  "hjb-primary-ds-v1-p6-091": {
    optionsZhHans: [
      "A. 它的直径是2厘米",
      "B. 它的周长是4π厘米",
      "C. 它的面积是16π平方厘米",
      "D. 它的周长是16π厘米"
    ],
    explanationZhHans: "半径为4厘米时，直径是8厘米，周长是2πr=8π厘米，面积是πr²=16π平方厘米，所以只有C正确。"
  },
  "hjb-primary-ds-v1-p6-065": {
    promptZhHans: "一个圆的周长是25.12厘米，它的直径是______厘米。（π取3.14）",
    answer: "8",
    acceptedAnswers: ["8", "8厘米"],
    explanationZhHans: "由圆的周长公式C=πd可得d=C÷π=25.12÷3.14=8厘米。"
  },
  "hjb-primary-ds-v1-p6-201": {
    optionsZhHans: ["A. 3x + 20 = 2", "B. 3x - 2 = 20", "C. 20 - 3x = 2", "D. 3x = 20 + 2"],
    explanationZhHans: "找回的钱等于付出的钱减去商品总价，所以20-3x=2。A、B、D都不能正确表示“付20元，买3支钢笔后找回2元”的数量关系。"
  },
  "hjb-primary-ds-v1-p6-117": {
    acceptedAnswers: [
      "（1）40名；（2）6人；（3）乒乓球的可能性大，因为喜欢乒乓球的人数（10人）比喜欢足球的人数（8人）多，所以抽到乒乓球的概率更高。",
      "（1）40名；（2）6人；（3）乒乓球，因为10人多于8人，所以可能性更大。"
    ]
  },
  "hjb-primary-ds-v1-p6-165": {
    answer: ">；因为-2.5在数轴上位于-3的右边，所以-2.5>-3。",
    acceptedAnswers: [
      ">；因为-2.5在数轴上位于-3的右边，所以-2.5>-3。",
      ">；两个负数中绝对值较小的数较大，|-2.5|<|-3|。"
    ]
  },
  "hjb-primary-ds-v1-p6-237": {
    promptZhHans: "一个无盖长方体纸盒，长10厘米、宽8厘米、高6厘米。制作这个纸盒至少需要多少平方厘米的硬纸板？",
    optionsZhHans: ["A. 296平方厘米", "B. 376平方厘米", "C. 480平方厘米", "D. 188平方厘米"],
    answer: "296平方厘米",
    acceptedAnswers: ["296平方厘米", "296", "A. 296平方厘米", "A"],
    explanationZhHans: "无盖纸盒需要一个底面和四个侧面。面积=10×8+2×(10×6)+2×(8×6)=80+120+96=296平方厘米。"
  },
  "hjb-primary-ds-v1-p1-236": {
    promptZhHans: "小明做了两道题。第一题：45+8，他先算45+5=50，再算50+3=53。第二题：62-9，他先算62-2=60，再算60-7=53。请分别判断两道题是否算对了。",
    answer: "两道题都算对了",
    acceptedAnswers: ["两道题都算对了", "两道都对", "两题都正确", "第一题和第二题都算对了"],
    explanationZhHans: "第一题把8分成5和3，45+5+3=53；第二题把9分成2和7，62-2-7=53。两道题的分拆方法和结果都正确。"
  },
  "hjb-primary-ds-v1-p2-075": {
    promptEn: "Eight flowerpots are arranged in one row along a school corridor. One flower stand is placed between each pair of adjacent flowerpots. How many flower stands are needed? Write a number sentence and answer."
  },
  "hjb-primary-ds-v1-p2-077": {
    promptZhHans: "每行有6颗☆，摆了3行。一共有多少颗☆？",
    promptEn: "There are 6 stars in each row and 3 rows. How many stars are there altogether?",
    answer: "18",
    acceptedAnswers: ["18", "18颗", "3×6=18", "6×3=18"],
    explanationZhHans: "3行、每行6颗，就是3个6，所以3×6=18。一共有18颗☆。",
    explanationEn: "Three rows with 6 stars in each row make 3 groups of 6, so 3×6=18. There are 18 stars altogether."
  },
  "hjb-primary-ds-v1-p2-080": {
    promptZhHans: "根据口诀“四六二十四”，写出一个对应的乘法算式。",
    answer: "4×6=24",
    acceptedAnswers: ["4×6=24", "6×4=24", "4×6 = 24", "6×4 = 24"],
    explanationZhHans: "口诀“四六二十四”表示4和6相乘得24，所以可以写4×6=24，也可以写6×4=24。"
  },
  "hjb-primary-ds-v1-p2-217": {
    answer: "B. 312 + 189",
    acceptedAnswers: ["B. 312 + 189", "312 + 189", "B"],
    explanationZhHans: "四个结果依次是493、501、511、495，与500的差依次是7、1、11、5。501与500只相差1，所以312+189最接近500。"
  },
  "hjb-primary-ds-v1-p2-232": {
    promptZhHans: "观察数列2，4，8，14，22，32。相邻两数的差依次为2，4，6，8，10。按照这个规律，下一个数是多少？",
    answer: "44",
    acceptedAnswers: ["44"],
    explanationZhHans: "相邻两数的差依次增加2，所以下一个差是12。32+12=44，因此下一个数是44。"
  },
  "hjb-primary-ds-v1-p3-020": {
    promptZhHans: "估算198+305时，把198看作200，把305看作300，估算结果是500。精确结果比500大还是小？",
    answer: "大",
    acceptedAnswers: ["大", "比500大", "大于500"],
    explanationZhHans: "精确计算198+305=503，503>500，所以精确结果比500大。"
  },
  "hjb-primary-ds-v1-p3-073": {
    answer: "601 × 2",
    acceptedAnswers: ["601 × 2", "601×2", "D. 601 × 2", "D"],
    explanationZhHans: "四个积依次为1192、1209、1210、1202，与1200的差依次为8、9、10、2。1202的差最小，所以601×2的积最接近1200。"
  },
  "hjb-primary-ds-v1-p3-216": {
    promptZhHans: "三（1）班同学最喜欢的水果人数为：苹果8人、香蕉12人、橘子5人、葡萄10人。最受欢迎和最不受欢迎的水果分别是什么？",
    answer: "香蕉；橘子",
    acceptedAnswers: ["香蕉；橘子", "香蕉,橘子", "香蕉、橘子"],
    explanationZhHans: "12最大，5最小，所以最受欢迎的是香蕉，最不受欢迎的是橘子。"
  },
  "hjb-primary-ds-v1-p3-218": {
    promptZhHans: "三（3）班图书角有故事书20本、科普书15本、漫画书10本、其他图书5本。故事书比漫画书多多少本？",
    answer: "10",
    acceptedAnswers: ["10", "10本"],
    explanationZhHans: "故事书有20本，漫画书有10本，20-10=10，所以故事书比漫画书多10本。"
  },
  "hjb-primary-ds-v1-p3-220": {
    promptZhHans: "三（5）班同学出生季节人数为：春季8人、夏季12人、秋季10人、冬季6人。夏季比冬季多多少人？",
    answer: "6",
    acceptedAnswers: ["6", "6人"],
    explanationZhHans: "夏季有12人，冬季有6人，12-6=6，所以夏季比冬季多6人。"
  },
  "hjb-primary-ds-v1-p4-079": {
    optionsZhHans: ["200÷（80÷4）", "200÷80÷4", "200÷（80÷4）×4", "200×（80÷4）"],
    answer: "200÷（80÷4）",
    acceptedAnswers: ["200÷（80÷4）", "200÷(80÷4)", "A"],
    explanationZhHans: "先求每次运煤量：80÷4=20（吨）；再求运200吨需要的次数：200÷20=10（次）。综合算式是200÷（80÷4），只有第一项正确。"
  },
  "hjb-primary-ds-v1-p4-103": {
    optionsZhHans: [
      "A. 同一个圆中，半径是直径的2倍。",
      "B. 圆只有一条对称轴。",
      "C. 圆心决定圆的位置，半径决定圆的大小。",
      "D. 圆上各点到圆心的距离不都相等。"
    ],
    answer: "C. 圆心决定圆的位置，半径决定圆的大小。",
    acceptedAnswers: ["C. 圆心决定圆的位置，半径决定圆的大小。", "圆心决定圆的位置，半径决定圆的大小。", "C"],
    explanationZhHans: "同一个圆中，直径是半径的2倍；圆有无数条对称轴；圆上各点到圆心的距离都等于半径。因此只有C正确。"
  },
  "hjb-primary-ds-v1-p4-147": {
    promptZhHans: "学校图书馆新买来故事书和科技书共240本，故事书的本数是科技书的3倍。故事书和科技书各有多少本？",
    promptEn: "The school library bought 240 storybooks and science books altogether. The number of storybooks is 3 times the number of science books. How many of each were bought?",
    answer: "科技书60本，故事书180本",
    acceptedAnswers: [
      "科技书60本，故事书180本",
      "科技书：60本；故事书：180本",
      "科技书：240÷(3+1)=60（本），故事书：60×3=180（本）"
    ],
    explanationZhHans: "科技书和故事书共有240本，故事书本数是科技书的3倍。把科技书本数看作1份，故事书就是3份，共4份。科技书有240÷4=60（本），故事书有60×3=180（本）。",
    explanationEn: "There are 240 science books and storybooks altogether, and there are 3 times as many storybooks as science books. Treat the science books as 1 part and the storybooks as 3 parts, making 4 parts in total. There are 240÷4=60 science books and 60×3=180 storybooks."
  },
  "hjb-primary-ds-v1-p4-151": {
    optionsZhHans: ["125×80+8", "125×80+125×8", "125×80×8", "125×（80-8）"],
    answer: "125×80+125×8",
    acceptedAnswers: ["125×80+125×8", "B"],
    explanationZhHans: "应用乘法分配律，125×（80+8）=125×80+125×8。其余三项都不等于原式，所以只有第二项正确。"
  },
  "hjb-primary-ds-v1-p5-008": {
    explanationZhHans: "2.4×3.6中两个因数相对24和36都缩小10倍，积缩小100倍，得8.64。0.24×0.36中两个因数都缩小100倍，积缩小10000倍，得0.0864。240是24的10倍，0.036是36的1/1000，积是864的1/100，得8.64。"
  },
  "hjb-primary-ds-v1-p5-122": {
    promptZhHans: "五年级（1）班第一小组6名同学1分钟跳绳的成绩是142、138、155、130、148、151下。这6名同学的平均成绩是多少下？",
    answer: "144",
    acceptedAnswers: ["144", "144下"],
    explanationZhHans: "总成绩是142+138+155+130+148+151=864（下），平均成绩是864÷6=144（下）。"
  },
  "hjb-primary-ds-v1-p6-040": {
    optionsZhHans: ["3∶4 和 6∶9", "0.2∶0.5 和 4∶9", "1/2∶1/3 和 3∶2", "5∶8 和 15∶20"],
    answer: "1/2∶1/3 和 3∶2",
    acceptedAnswers: ["1/2∶1/3 和 3∶2", "C"],
    explanationZhHans: "1/2∶1/3=3∶2，所以第三组能组成比例。其余各组的两个比值不相等。"
  },
  "hjb-primary-ds-v1-p6-131": {
    promptZhHans: "一个有盖圆柱形铁桶，底面直径是4分米，高是5分米。做这个铁桶至少需要多少平方分米的铁皮？（得数保留整数）",
    answer: "88",
    acceptedAnswers: ["88", "88平方分米"],
    explanationZhHans: "有盖铁桶需要一个侧面和两个底面。侧面积为3.14×4×5=62.8（平方分米），两个底面的面积为2×3.14×2²=25.12（平方分米），总面积为87.92平方分米，保留整数得88平方分米。"
  },
  "hjb-primary-ds-v1-p6-207": {
    promptEn: "Which equation has x=3 as its solution?",
    optionsZhHans: ["2x+1=5", "3x-4=5", "4x-3=8", "5x+2=18"],
    optionsEn: ["2x+1=5", "3x-4=5", "4x-3=8", "5x+2=18"],
    answer: "3x-4=5",
    acceptedAnswers: ["3x-4=5", "3x-4 = 5", "B"],
    explanationZhHans: "把x=3分别代入四个方程：2×3+1=7≠5；3×3-4=5；4×3-3=9≠8；5×3+2=17≠18。只有第二个方程成立，所以解为x=3的是3x-4=5。",
    explanationEn: "Substitute x=3 into all four equations: 2×3+1=7≠5; 3×3-4=5; 4×3-3=9≠8; and 5×3+2=17≠18. Only the second equation is true, so the equation with solution x=3 is 3x-4=5."
  },
  "hjb-primary-ds-v1-p6-224": {
    answer: "射线AB、射线BA、射线BC、射线CB；线段AC=8 cm",
    acceptedAnswers: [
      "射线AB、射线BA、射线BC、射线CB；线段AC=8 cm",
      "射线AC、射线BA、射线BC、射线CB；线段AC=8 cm",
      "射线AB、射线BA、射线BC、射线CA；线段AC=8 cm",
      "射线AC、射线BA、射线BC、射线CA；线段AC=8 cm",
      "rays AB, BA, BC and CB; AC=8 cm"
    ],
    explanationZhHans: "三点的顺序是A—B—C。射线AB与射线AC的端点和方向相同，是同一条射线；射线CB与射线CA也是同一条射线。因此可用射线AB、BA、BC、CB表示全部4条不同的射线。线段AC=AB+BC=5+3=8 cm。"
  },
  "hjb-primary-ds-v1-p1-210": {
    promptZhHans: "一根绳子是直的，另一根绳子是弯曲的。请写出公平比较两根绳子长短的方法。"
  },
  "hjb-primary-ds-v1-p4-090": {
    promptZhHans: "李师傅每小时加工45个零件，张师傅每小时加工55个零件。两人一起工作6小时后，还剩80个零件没有加工。这批零件一共有多少个？",
    promptEn: "Li processes 45 parts per hour and Zhang processes 55 parts per hour. After they work together for 6 hours, 80 parts remain. How many parts are in the batch altogether?"
  },
  "hjb-primary-ds-v1-p5-027": {
    promptZhHans: "一个长方形的面积是8.64平方米，宽是2.4米。按指定规则把8.64估成9、把2.4估成2.5。依次填写估算长度和准确长度，格式为“估算___米；准确___米”。",
    promptEn: "A rectangle has area 8.64 square metres and width 2.4 metres. For the estimate, use 8.64≈9 and 2.4≈2.5. Enter the estimated and exact lengths in the format 'estimate ___ m; exact ___ m'.",
    answer: "估算3.6米；准确3.6米",
    acceptedAnswers: [
      "估算3.6米；准确3.6米",
      "估算3.6米,准确3.6米",
      "估算3.6米，准确3.6米"
    ],
    explanationZhHans: "按指定估算规则，9÷2.5=3.6（米），所以估算长度为3.6米。准确计算8.64÷2.4=3.6（米），准确长度也是3.6米。两个字段都要填写。"
  },
  "hjb-primary-ds-v1-p6-204": {
    promptZhHans: "学校图书馆有科技书和故事书共120本，科技书的本数是故事书的3倍。设故事书有x本。依次填写原始方程、x的值和科技书本数，格式为“方程；x=___；___本”。",
    promptEn: "A school library has 120 science and story books altogether, and there are three times as many science books as story books. Let x be the number of story books. Enter the original equation, x, and the number of science books in that order.",
    answer: "x+3x=120；x=30；90本",
    acceptedAnswers: [
      "x+3x=120；x=30；90本",
      "3x+x=120；x=30；90本",
      "x+3x=120, x=30, 90本",
      "3x+x=120, x=30, 90本"
    ],
    explanationZhHans: "设故事书有x本，则科技书有3x本。根据总数列方程x+3x=120（也可写3x+x=120），解得x=30，所以科技书有3×30=90本。三个字段都要填写。"
  },
  "hjb-primary-ds-v1-p4-146": {
    promptZhHans: "计算25×36。请写出一种使用乘法结合律的简便计算过程。"
  },
  "hjb-primary-ds-v1-p4-161": {
    promptZhHans: "把32拆成8×4，利用乘法结合律简便计算125×32。请写出计算过程和结果。",
    answer: "125×32=125×8×4=1000×4=4000",
    acceptedAnswers: [
      "125×32=125×8×4=1000×4=4000",
      "125×(8×4)=(125×8)×4=4000",
      "方法一，4000"
    ],
    explanationZhHans: "把32写成8×4，利用乘法结合律先算125×8=1000，再算1000×4=4000。"
  },
  "hjb-primary-ds-v1-p6-126": {
    promptZhHans: "一个不透明的袋子里有大小、形状相同的红球5个、黄球3个、蓝球2个。任意摸出一个球，摸到哪种颜色的球可能性最大？请说明理由。"
  },
  "hjb-primary-ds-v1-p6-216": {
    promptZhHans: "学校图书馆购进故事书和科技书共156本，故事书的本数是科技书的3倍少12本。设科技书有x本，请列出方程。"
  },
  "hjb-primary-ds-v1-p3-007": {
    promptZhHans: "小马虎计算345+278时得到513。他最可能漏掉了哪些进位？",
    optionsZhHans: [
      "只漏掉个位向十位的进位",
      "只漏掉十位向百位的进位",
      "个位向十位、十位向百位的两次进位都漏掉了",
      "没有漏掉进位"
    ],
    answer: "个位向十位、十位向百位的两次进位都漏掉了",
    acceptedAnswers: ["个位向十位、十位向百位的两次进位都漏掉了", "两次进位都漏了", "C"],
    explanationZhHans: "正确计算中，个位5+8=13要向十位进1，十位4+7+1=12还要向百位进1。若两次进位都漏掉，就会写成百位3+2=5、十位4+7只写1、个位5+8只写3，得到513。因此错误来自两次进位都遗漏。"
  }
};

const reviewedFinalOnlyCompoundIds = new Set([
  "hjb-primary-ds-v1-p1-123", "hjb-primary-ds-v1-p1-131", "hjb-primary-ds-v1-p2-009",
  "hjb-primary-ds-v1-p2-012", "hjb-primary-ds-v1-p2-018", "hjb-primary-ds-v1-p2-021",
  "hjb-primary-ds-v1-p2-042", "hjb-primary-ds-v1-p2-129", "hjb-primary-ds-v1-p2-132",
  "hjb-primary-ds-v1-p3-003", "hjb-primary-ds-v1-p3-018", "hjb-primary-ds-v1-p3-048",
  "hjb-primary-ds-v1-p3-057", "hjb-primary-ds-v1-p3-072", "hjb-primary-ds-v1-p3-075",
  "hjb-primary-ds-v1-p3-078", "hjb-primary-ds-v1-p3-117",
  "hjb-primary-ds-v1-p3-120", "hjb-primary-ds-v1-p3-162", "hjb-primary-ds-v1-p4-012",
  "hjb-primary-ds-v1-p4-066", "hjb-primary-ds-v1-p4-087", "hjb-primary-ds-v1-p4-114",
  "hjb-primary-ds-v1-p4-135", "hjb-primary-ds-v1-p4-226", "hjb-primary-ds-v1-p5-003",
  "hjb-primary-ds-v1-p5-036", "hjb-primary-ds-v1-p5-177", "hjb-primary-ds-v1-p6-027",
  "hjb-primary-ds-v1-p6-033", "hjb-primary-ds-v1-p6-087", "hjb-primary-ds-v1-p6-090",
  "hjb-primary-ds-v1-p6-149", "hjb-primary-ds-v1-p6-168", "hjb-primary-ds-v1-p6-177"
]);

const reviewedFinalOnlyPromptOverrides: Record<string, string> = {
  "hjb-primary-ds-v1-p1-123": "计算15-9的结果。",
  "hjb-primary-ds-v1-p1-131": "小乐有13颗糖，送给朋友一些后还剩7颗。小乐送出了多少颗糖？",
  "hjb-primary-ds-v1-p2-009": "计算34+29的结果。",
  "hjb-primary-ds-v1-p2-012": "小华有56张贴纸，送给小丽29张后，还剩多少张？",
  "hjb-primary-ds-v1-p2-018": "计算81-37的结果。",
  "hjb-primary-ds-v1-p2-021": "计算73-46的结果。",
  "hjb-primary-ds-v1-p2-129": "小明面向东站立，向右转两次后面向哪个方向？",
  "hjb-primary-ds-v1-p2-132": "小丁有35元，想买一个28元的文具盒和一支6元的笔。他带的钱够吗？如果够，还剩多少元；如果不够，还差多少元？",
  "hjb-primary-ds-v1-p3-117": "小明把一根彩带平均剪成5段，用其中2段包装礼物。他用了这根彩带的几分之几？",
  "hjb-primary-ds-v1-p3-162": "果园里摘了15筐苹果，每筐重28千克。一辆卡车载重500千克，一次能全部运走吗？",
  "hjb-primary-ds-v1-p4-114": "三角形ABC中，∠A=50°，∠B=60°，∠C是多少度？",
  "hjb-primary-ds-v1-p4-226": "在方格纸上，一条直线经过A(2,1)和B(2,5)。请填空：这条直线是______的，它与水平方向互相______。",
  "hjb-primary-ds-v1-p5-036": "学校图书馆里，故事书本数是科技书的3倍。故事书借出15本后，剩下的故事书比科技书多55本。科技书和故事书原来各有多少本？请按“科技书___本；故事书___本”的格式填写。",
  "hjb-primary-ds-v1-p6-149": "一个两位数的个位数字与十位数字之和为12。交换两个数位后，新数比原数大36。原数是多少？",
  "hjb-primary-ds-v1-p6-168": "某天早晨气温是-5℃，中午上升8℃，傍晚又下降3℃。傍晚气温是多少摄氏度？"
};

function finalOnlyCompoundPrompt(question: GeneratedHjbPrimaryQuestion) {
  const explicit = reviewedFinalOnlyPromptOverrides[question.id];
  if (explicit) return explicit;
  return question.promptZhHans
    .replace(/请写出(?:你的)?(?:计算|思考|推理)过程(?:并验算|并注明单位|并说明[^。]*|和答案)?[。.]?$/u, "")
    .replace(/请写出完整过程[。.]?$/u, "")
    .replace(/请写出过程[。.]?$/u, "")
    .replace(/请写出答案并(?:简要)?说明理由[。.]?$/u, "请写出答案。")
    .replace(/请写出(?:比较和)?计算过程[。.]?$/u, "")
    .replace(/请说明理由[。.]?$/u, "")
    .replace(/(?:，|。)?并说明(?:你的)?(?:理由|方法)[。.]?$/u, "。")
    .trim();
}

const reviewedUnitAnswerAliases: Record<string, string[]> = {
  "hjb-primary-ds-v1-p1-056": ["3只"],
  "hjb-primary-ds-v1-p1-057": ["4个"],
  "hjb-primary-ds-v1-p1-062": ["3个"],
  "hjb-primary-ds-v1-p1-065": ["7个"],
  "hjb-primary-ds-v1-p4-090": ["680个"],
  "hjb-primary-ds-v1-p4-093": ["28.26平方米"],
  "hjb-primary-ds-v1-p4-240": ["232本"],
  "hjb-primary-ds-v1-p5-030": ["20.6元"],
  "hjb-primary-ds-v1-p5-135": ["40人"],
  "hjb-primary-ds-v1-p5-161": ["3/5米"],
  "hjb-primary-ds-v1-p6-063": ["28.26平方厘米"],
  "hjb-primary-ds-v1-p6-093": ["28.26平方厘米"],
  "hjb-primary-ds-v1-p6-096": ["19.625平方厘米"],
  "hjb-primary-ds-v1-p6-099": ["65.94平方米"],
  "hjb-primary-ds-v1-p6-108": ["28.26平方米"],
  "hjb-primary-ds-v1-p6-131": ["88平方分米"],
  "hjb-primary-ds-v1-p6-135": ["100.48平方米"],
};

const unsafeGeneratedAliasPattern = /(?:term-[a-f0-9]+(?:-[a-f0-9]+)*|[\u0000-\u001f\u007f])/iu;

function reviewedQuestion(question: GeneratedHjbPrimaryQuestion): GeneratedHjbPrimaryQuestion {
  const correction = reviewedCorrections[question.id];
  const contentCorrected = correction
    ? (() => {
        const {
          promptEn: _promptEn,
          optionsEn: _optionsEn,
          explanationEn: _explanationEn,
          ...contentCorrection
        } = correction;
        return { ...question, ...contentCorrection };
      })()
    : question;
  return reviewedFinalOnlyCompoundIds.has(question.id)
    ? { ...contentCorrected, promptZhHans: finalOnlyCompoundPrompt(contentCorrected) }
    : contentCorrected;
}

function optionTextWithoutLabel(value: string) {
  return value.trim().replace(/^[A-F][.．、]\s*/u, "").trim();
}

function parsedEmbeddedOptions(prompt: string) {
  const startMatch = prompt.match(/(?:^|[?？；;\n]\s*)A[.．、]\s*/u);
  if (!startMatch || startMatch.index === undefined) return null;
  const labelOffset = startMatch[0].lastIndexOf("A");
  const start = startMatch.index + labelOffset;
  const optionText = prompt.slice(start);
  const matches = Array.from(optionText.matchAll(/(?:^|[；;\n]\s*)([A-F])[.．、]\s*([\s\S]*?)(?=(?:[；;\n]\s*[A-F][.．、])|$)/gu));
  if (matches.length < 2) return null;
  const options = matches.map((match) => `${match[1]}. ${match[2].trim()}`);
  return { prompt: prompt.slice(0, start).trim().replace(/[；;]$/u, ""), options };
}

function normalizeOptionComparison(value: string) {
  return optionTextWithoutLabel(value).normalize("NFKC").replace(/\s+/gu, "").replace(/[。；;]$/u, "");
}

function questionWithStructuredOptions(question: GeneratedHjbPrimaryQuestion): GeneratedHjbPrimaryQuestion {
  if (question.type !== "multiple-choice") return question;
  const parsed = parsedEmbeddedOptions(question.promptZhHans);
  if (!parsed || parsed.options.length !== question.optionsZhHans.length) return question;
  const sourceOptionsAreLabels = question.optionsZhHans.every((option, index) => option.trim() === String.fromCharCode(65 + index));
  const optionsMatch = question.optionsZhHans.every(
    (option, index) => normalizeOptionComparison(option) === normalizeOptionComparison(parsed.options[index])
  );
  if (!sourceOptionsAreLabels && !optionsMatch) return question;
  return { ...question, promptZhHans: parsed.prompt, optionsZhHans: parsed.options };
}

function reviewedAcceptedAnswers(question: GeneratedHjbPrimaryQuestion) {
  return Array.from(new Set([
    ...localizedHjbGeneratedAcceptedAnswers(question),
    ...(reviewedUnitAnswerAliases[question.id] ?? [])
  ])).filter((alias) => !unsafeGeneratedAliasPattern.test(alias));
}

const reviewedQuestions = questionPack.questions.map(reviewedQuestion).map(questionWithStructuredOptions);

function toQuestion(question: GeneratedHjbPrimaryQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland HJB primary topic for ${question.topicId}`);
  const correction = reviewedCorrections[question.id];
  const localizedPrompt = localizeHjbGeneratedText(question.promptZhHans);
  const localizedExplanation = localizeHjbGeneratedText(question.explanationZhHans);

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
    prompt: correction?.promptEn ? { ...localizedPrompt, en: correction.promptEn } : localizedPrompt,
    options: question.type === "multiple-choice"
      ? question.optionsZhHans.map((option, index) => {
          const localizedOption = localizeHjbGeneratedText(option);
          return correction?.optionsEn?.[index]
            ? { ...localizedOption, en: correction.optionsEn[index] }
            : localizedOption;
        })
      : undefined,
    answer: question.answer,
    acceptedAnswers: reviewedAcceptedAnswers(question),
    explanation: correction?.explanationEn
      ? { ...localizedExplanation, en: correction.explanationEn }
      : localizedExplanation
  };
}

export const mainlandHjbPrimaryQuestionGenerationMetadata: Record<string, MainlandHjbPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(
    reviewedQuestions.map((question) => [
      question.id,
      {
        batch: "hjb-primary-v1" as const,
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
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbPrimaryAnswer(question: Question) {
  return mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbPrimaryQuestions: Question[] = reviewedQuestions.map(toQuestion);
