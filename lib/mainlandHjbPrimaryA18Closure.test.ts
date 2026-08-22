import assert from "node:assert/strict";
import test from "node:test";

import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { localizedCorrectAnswerForFeedback } from "@/lib/server/answerFeedback";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { LocalizedText, Question } from "@/types";

type Locale = "zhHans" | "zh" | "en";

const byId = new Map(mainlandHjbPrimaryQuestions.map((question) => [question.id, question]));

function requiredQuestion(id: string) {
  const question = byId.get(id);
  assert.ok(question, `Missing HJB Primary A18 closure question ${id}`);
  return question;
}

function text(value: LocalizedText, locale: Locale) {
  return value[locale] ?? (locale === "zhHans" ? value.zh : value.zhHans) ?? value.en;
}

function gradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

function assertCleanTrilingualSurface(question: Question) {
  for (const locale of ["zhHans", "zh", "en"] as const) {
    assert.ok(text(question.prompt, locale).trim(), `${question.id} ${locale} prompt`);
    assert.ok(text(question.explanation, locale).trim(), `${question.id} ${locale} explanation`);
    assert.doesNotMatch(text(question.prompt, locale), /term-[a-f0-9]/iu, `${question.id} ${locale} prompt`);
    assert.doesNotMatch(text(question.explanation, locale), /term-[a-f0-9]/iu, `${question.id} ${locale} explanation`);
    for (const option of question.options ?? []) {
      assert.ok(text(option, locale).trim(), `${question.id} ${locale} option`);
      assert.doesNotMatch(text(option, locale), /term-[a-f0-9]/iu, `${question.id} ${locale} option`);
    }
  }
}

const aliasContracts = {
  "hjb-primary-ds-v1-p1-125": {
    answer: "平十法",
    aliases: ["分拆减数", "分拆减数法", "平十", "平十法"],
    promptEn: "When calculating 17 - 8, Xiaoding splits 8 into 7 and 1, first calculates 17 - 7 = 10, and then calculates 10 - 1 = 9. What is this method called?",
    explanationZhHans: "把减数8拆成7和1，先减7凑成10，再减1得9。这种方法叫平十法，也叫分拆减数法。",
    explanationEn: "Split the subtrahend 8 into 7 and 1. Subtract 7 first to bridge to 10, then subtract 1 to get 9. This is the bridge-to-ten method, also called splitting the subtrahend."
  },
  "hjb-primary-ds-v1-p1-128": {
    answer: "平十法",
    aliases: ["连减", "连减法", "分拆减数", "分拆减数法", "平十", "平十法"],
    promptEn: "When calculating 12 - 7, Xiaoming splits 7 into 2 and 5, first calculates 12 - 2 = 10, and then calculates 10 - 5 = 5. What is this method called?",
    explanationZhHans: "把减数7拆成2和5，先减2凑成10，再减5得5。这是连减法，也叫平十法或分拆减数法。",
    explanationEn: "Split the subtrahend 7 into 2 and 5. Subtract 2 first to bridge to 10, then subtract 5 to get 5. This is successive subtraction, also called the bridge-to-ten method or splitting the subtrahend."
  }
} as const;

for (const [id, contract] of Object.entries(aliasContracts)) {
  test(`${id} accepts every correct bridge-to-ten terminology alias`, () => {
    const question = requiredQuestion(id);
    assert.equal(question.answer, contract.answer);
    assert.equal(question.prompt.en, contract.promptEn);
    assert.equal(question.explanation.zhHans, contract.explanationZhHans);
    assert.equal(question.explanation.en, contract.explanationEn);
    for (const alias of contract.aliases) {
      assert.equal(questionAnswerMatches(gradingQuestion(question), alias), true, `${id}: ${alias}`);
    }
    assertCleanTrilingualSurface(question);
  });
}

const multipleChoiceContracts = {
  "hjb-primary-ds-v1-p2-028": {
    promptZhHans: "下面哪个金额正好等于3元8角？",
    promptEn: "Which amount is exactly equal to 3 yuan and 8 jiao?",
    optionsZhHans: ["3.3元", "3.7元", "3.8元", "3.9元"],
    optionsEn: ["3.3 yuan", "3.7 yuan", "3.8 yuan", "3.9 yuan"],
    answer: "3.8元",
    answerEn: "3.8 yuan",
    explanationZhHans: "8角=0.8元，所以3元8角=3.8元，只有第三个选项正确。",
    explanationEn: "Eight jiao is 0.8 yuan, so 3 yuan and 8 jiao equals 3.8 yuan. Only the third option is correct.",
    expectedIndex: 2
  },
  "hjb-primary-ds-v1-p2-064": {
    promptZhHans: "以操场为原点O(0,0)，向东为x轴正方向，向北为y轴正方向。图书馆在(0,2)，花坛在(2,0)，校门在(0,-2)。小明在图书馆东面1格，小红在操场北面1格，小刚在花坛西面1格，小丽在校门南面1格。谁和小明在以操场为中心的同一个方向？",
    promptEn: "Use the playground as the origin O(0,0), with east as the positive x-direction and north as the positive y-direction. The library is at (0,2), the flower bed at (2,0), and the school gate at (0,-2). Xiaoming is one grid square east of the library, Xiaohong one square north of the playground, Xiaogang one square west of the flower bed, and Xiaoli one square south of the gate. Who is in the same direction from the playground as Xiaoming?",
    optionsZhHans: ["小红", "小刚", "小丽", "没有人"],
    optionsEn: ["Xiaohong", "Xiaogang", "Xiaoli", "No one"],
    answer: "没有人",
    answerEn: "No one",
    explanationZhHans: "小明在(1,2)，相对操场在东北方向；小红在(0,1)，小刚在(1,0)，小丽在(0,-3)，分别在北、东、南方向。因此没有人与小明方向相同。",
    explanationEn: "Xiaoming is at (1,2), northeast of the playground. Xiaohong is at (0,1), Xiaogang at (1,0), and Xiaoli at (0,-3), which are north, east, and south respectively. Therefore no one is in the same direction as Xiaoming.",
    expectedIndex: 3
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
    answerEn: "Multiplication: 1 and 3; addition: 2 and 4",
    explanationZhHans: "①和③含乘号，是乘法算式；②和④含加号，是加法算式。因此第一种分类正确。",
    explanationEn: "Expressions 1 and 3 contain multiplication signs, while 2 and 4 contain addition signs. Therefore the first classification is correct.",
    expectedIndex: 0
  },
  "hjb-primary-ds-v1-p2-201": {
    promptZhHans: "用数字卡片3、0、5、8各一次摆出一个四位数，要求这个数只读一个零，并且千位上的数字比百位上的数字小。下面哪个数符合要求？",
    promptEn: "Use each of the digit cards 3, 0, 5, and 8 once to make a four-digit number. The number must be read with exactly one zero, and its thousands digit must be less than its hundreds digit. Which number meets both conditions?",
    optionsZhHans: ["3508", "3085", "5083", "8053"],
    optionsEn: ["3508", "3085", "5083", "8053"],
    answer: "3508",
    answerEn: "3508",
    explanationZhHans: "3508读作“三千五百零八”，只读一个零，并且千位3小于百位5。其余三个数的百位都是0，千位数字都大于0，不符合条件。",
    explanationEn: "3508 is read with one zero, and its thousands digit 3 is less than its hundreds digit 5. In each other option the hundreds digit is 0, so its thousands digit is not less than its hundreds digit.",
    expectedIndex: 0
  },
  "hjb-primary-ds-v1-p3-040": {
    promptZhHans: "老师把一些铅笔分给小朋友，每人分4支正好分完；每人分6支也正好分完。铅笔的数量可能是多少支？",
    promptEn: "A teacher can distribute some pencils equally with either 4 pencils per child or 6 pencils per child, with none left over. How many pencils could there be?",
    optionsZhHans: ["18支", "24支", "30支", "42支"],
    optionsEn: ["18 pencils", "24 pencils", "30 pencils", "42 pencils"],
    answer: "24支",
    answerEn: "24 pencils",
    explanationZhHans: "铅笔数必须同时是4和6的倍数，也就是12的倍数。四个选项中只有24是12的倍数，所以选第二项。",
    explanationEn: "The number must be divisible by both 4 and 6, so it must be a multiple of 12. Only 24 is a multiple of 12.",
    expectedIndex: 1
  },
  "hjb-primary-ds-v1-p3-237": {
    promptZhHans: "学校要给一块长8米、宽5米的长方形花坛围上篱笆。下面哪个说法正确？",
    promptEn: "A school will put a fence around a rectangular flower bed that is 8 metres long and 5 metres wide. Which statement is correct?",
    optionsZhHans: ["篱笆长40米", "篱笆长26米", "花坛面积是26平方米", "花坛面积是45平方米"],
    optionsEn: ["The fence is 40 m long", "The fence is 26 m long", "The area is 26 m²", "The area is 45 m²"],
    answer: "篱笆长26米",
    answerEn: "The fence is 26 m long",
    explanationZhHans: "篱笆长度是花坛周长，(8+5)×2=26（米）；花坛面积是8×5=40（平方米）。因此只有第二项正确。",
    explanationEn: "The fence length is the perimeter: (8+5)×2=26 m. The area is 8×5=40 m². Therefore only the second option is correct.",
    expectedIndex: 1
  },
  "hjb-primary-ds-v1-p3-249": {
    promptZhHans: "三（2）班最喜欢各运动项目的人数为：足球12人，篮球8人，乒乓球10人，羽毛球6人。下面哪个说法正确？",
    promptEn: "In Class 3(2), 12 students prefer football, 8 basketball, 10 table tennis, and 6 badminton. Which statement is correct?",
    optionsZhHans: ["喜欢足球的人数是喜欢羽毛球人数的3倍", "喜欢篮球的人数比喜欢乒乓球的少2人", "喜欢乒乓球的人数比喜欢篮球的多4人", "喜欢篮球的人数最少"],
    optionsEn: ["Football has three times as many students as badminton", "Basketball has 2 fewer students than table tennis", "Table tennis has 4 more students than basketball", "Basketball has the fewest students"],
    answer: "喜欢篮球的人数比喜欢乒乓球的少2人",
    answerEn: "Basketball has 2 fewer students than table tennis",
    explanationZhHans: "10-8=2，所以喜欢篮球的比喜欢乒乓球的少2人。12不是6的3倍，10只比8多2，人数最少的是羽毛球。因此只有第二项正确。",
    explanationEn: "Because 10-8=2, basketball has 2 fewer students than table tennis. Twelve is not three times 6, table tennis has only 2 more than basketball, and badminton has the fewest students. Only the second option is correct.",
    expectedIndex: 1
  },
  "hjb-primary-ds-v1-p4-199": {
    promptZhHans: "某地连续6个月每月1日记录的平均气温分别为：1月2℃，2月5℃，3月9℃，4月14℃，5月19℃，6月24℃。下面哪个说法正确？",
    promptEn: "The recorded average temperatures on the first day of six consecutive months were 2°C in January, 5°C in February, 9°C in March, 14°C in April, 19°C in May, and 24°C in June. Which statement is correct?",
    optionsZhHans: ["记录的平均气温一直下降", "3月1日到4月1日上升了6℃", "6月1日记录的平均气温最高，为24℃", "1月1日到2月1日上升了2℃"],
    optionsEn: ["The recorded average temperature decreased throughout", "It rose by 6°C from March 1 to April 1", "The highest recorded average temperature was 24°C on June 1", "It rose by 2°C from January 1 to February 1"],
    answer: "6月1日记录的平均气温最高，为24℃",
    answerEn: "The highest recorded average temperature was 24°C on June 1",
    explanationZhHans: "六个记录值依次上升，最高记录值是6月1日的24℃。3月1日到4月1日上升5℃，1月1日到2月1日上升3℃，所以只有第三项正确。",
    explanationEn: "The six recorded values increase, and the highest is 24°C on June 1. The rise from March 1 to April 1 is 5°C, and from January 1 to February 1 is 3°C. Only the third option is correct.",
    expectedIndex: 2
  },
  "hjb-primary-ds-v1-p5-106": {
    promptZhHans: "五（1）班第一小组6名同学1分钟跳绳的次数是120、135、110、125、130、140。关于这组数据，下面哪个说法正确？",
    promptEn: "Six students in the first group of Class 5(1) made 120, 135, 110, 125, 130, and 140 jumps in one minute. Which statement about the data is correct?",
    optionsZhHans: ["平均数是130次", "平均数是125次", "平均数约127次", "平均数是128次"],
    optionsEn: ["The mean is 130", "The mean is 125", "The mean is about 127", "The mean is 128"],
    answer: "平均数约127次",
    answerEn: "The mean is about 127",
    explanationZhHans: "总次数是120+135+110+125+130+140=760，平均数是760÷6≈126.67，取整约为127次。因此第三项正确。",
    explanationEn: "The total is 120+135+110+125+130+140=760. The mean is 760÷6≈126.67, which is about 127 to the nearest whole number. The third option is correct.",
    expectedIndex: 2
  },
  "hjb-primary-ds-v1-p5-148": {
    promptZhHans: "下面哪个数既是42的因数，又是7的倍数？",
    promptEn: "Which number is both a factor of 42 and a multiple of 7?",
    optionsZhHans: ["12", "21", "28", "35"],
    optionsEn: ["12", "21", "28", "35"],
    answer: "21",
    answerEn: "21",
    explanationZhHans: "21×2=42，所以21是42的因数；21=7×3，所以21也是7的倍数。其余三个选项不同时满足两个条件。",
    explanationEn: "Since 21×2=42, 21 is a factor of 42; since 21=7×3, it is also a multiple of 7. None of the other options meets both conditions.",
    expectedIndex: 1
  },
  "hjb-primary-ds-v1-p6-052": {
    promptZhHans: "下面哪组中的两个比可以组成比例？",
    promptEn: "In which option can the two ratios form a proportion?",
    optionsZhHans: ["6:10和9:15", "20:5和1:4", "0.5:0.2和3:2", "1.2:0.4和0.6:0.3"],
    optionsEn: ["6:10 and 9:15", "20:5 and 1:4", "0.5:0.2 and 3:2", "1.2:0.4 and 0.6:0.3"],
    answer: "6:10和9:15",
    answerEn: "6:10 and 9:15",
    explanationZhHans: "6:10=3:5，9:15=3:5，两个比相等，可以组成比例。其余各组的两个比值分别不相等，所以只有第一项正确。",
    explanationEn: "Both 6:10 and 9:15 simplify to 3:5, so they form a proportion. The two ratios in every other option have different values. Only the first option is correct.",
    expectedIndex: 0
  },
  "hjb-primary-ds-v1-p6-205": {
    promptZhHans: "方程2(x-3)=8去括号后得到下面哪个方程？",
    promptEn: "Which equation results when the brackets in 2(x-3)=8 are expanded?",
    optionsZhHans: ["x - 3 = 4", "2x - 3 = 8", "x - 3 = 8", "2x - 6 = 8"],
    optionsEn: ["x - 3 = 4", "2x - 3 = 8", "x - 3 = 8", "2x - 6 = 8"],
    answer: "2x - 6 = 8",
    answerEn: "2x - 6 = 8",
    explanationZhHans: "用乘法分配律把2分别乘括号内的x和-3，得到2x-6=8，所以选第四项。",
    explanationEn: "Distribute 2 to both x and -3 inside the brackets to obtain 2x-6=8. Therefore the fourth option is correct.",
    expectedIndex: 3
  },
  "hjb-primary-ds-v1-p6-213": {
    promptZhHans: "方程2(x-4)=10两边同时除以2后得到下面哪个方程？",
    promptEn: "Which equation results when both sides of 2(x-4)=10 are divided by 2?",
    optionsZhHans: ["x - 4 = 5", "2x - 4 = 10", "x - 4 = 10", "2x - 8 = 10"],
    optionsEn: ["x - 4 = 5", "2x - 4 = 10", "x - 4 = 10", "2x - 8 = 10"],
    answer: "x - 4 = 5",
    answerEn: "x - 4 = 5",
    explanationZhHans: "方程两边同时除以2，左边2(x-4)÷2=x-4，右边10÷2=5，得到x-4=5，所以选第一项。",
    explanationEn: "Dividing both sides by 2 gives 2(x-4)÷2=x-4 and 10÷2=5, so the result is x-4=5. The first option is correct.",
    expectedIndex: 0
  }
} as const;

for (const [id, contract] of Object.entries(multipleChoiceContracts)) {
  test(`${id} has one independently true option in every learner locale`, () => {
    const question = requiredQuestion(id);
    assert.equal(question.type, "multiple-choice");
    assert.equal(question.prompt.zhHans, contract.promptZhHans);
    assert.equal(question.prompt.en, contract.promptEn);
    assert.deepEqual((question.options ?? []).map((option) => option.zhHans), contract.optionsZhHans);
    assert.deepEqual((question.options ?? []).map((option) => option.en), contract.optionsEn);
    assert.equal(question.answer, contract.answer);
    assert.equal(question.explanation.zhHans, contract.explanationZhHans);
    assert.equal(question.explanation.en, contract.explanationEn);
    for (const locale of ["zhHans", "zh", "en"] as const) {
      const hits = (question.options ?? []).map((option) =>
        questionAnswerMatches(gradingQuestion(question), text(option, locale))
      );
      assert.deepEqual(
        hits,
        [0, 1, 2, 3].map((index) => index === contract.expectedIndex),
        `${id} ${locale} unique option`
      );
    }
    assert.equal(questionAnswerMatches(gradingQuestion(question), contract.answerEn), true, `${id} English answer`);
    assertCleanTrilingualSurface(question);
  });
}

const responseContracts = {
  "hjb-primary-ds-v1-p2-120": {
    promptZhHans: "早晨太阳从东方升起。小杰面向太阳，说：“前面是东，后面是西，左面是北，右面是南。”他说得对吗？请完整写出判断和四个方向。",
    promptEn: "In the morning, the Sun rises in the east. Xiaojie faces the Sun and says, 'East is in front, west is behind, north is to the left, and south is to the right.' Is he correct? Give the decision and all four directions.",
    answer: "对；前面是东，后面是西，左面是北，右面是南。",
    answerEn: "Correct; east is in front, west is behind, north is to the left, and south is to the right.",
    explanationZhHans: "早晨太阳从东方升起，面向太阳就是面向东；面向东时，后面是西，左面是北，右面是南，所以小杰的说法完全正确。",
    explanationEn: "The Sun rises in the east, so facing the morning Sun means facing east. West is behind, north is to the left, and south is to the right. Xiaojie's complete statement is correct.",
    rejected: ["对", "左北右南"]
  },
  "hjb-primary-ds-v1-p2-138": {
    promptZhHans: "小丽用一根长20厘米的绳子沿课桌长边连续量3次。第三次量到课桌边缘时，有5厘米绳子超出桌边。课桌长边是多少厘米？请列式计算。",
    promptEn: "Xiaoli uses a 20 cm rope to measure along the long edge of a desk three consecutive times. On the third placement, 5 cm of the rope extends beyond the desk edge. How long is the desk edge? Write the calculation.",
    answer: "20×3-5=55（厘米）",
    answerEn: "20×3-5=55 cm",
    explanationZhHans: "三次绳长共20×3=60（厘米），其中5厘米超出桌边，不属于课桌长度，所以课桌长边是60-5=55（厘米）。",
    explanationEn: "Three rope lengths total 20×3=60 cm. The 5 cm extending beyond the desk is not part of its length, so the desk edge is 60-5=55 cm.",
    rejected: ["65厘米"]
  },
  "hjb-primary-ds-v1-p3-011": {
    promptZhHans: "小马虎把528看成582，与196相加得到778。请依次写出百位、十位、个位的变化，并求正确的和。",
    promptEn: "Xiaomahu misread 528 as 582 and added 196 to get 778. State the changes in the hundreds, tens, and ones places, then find the correct sum.",
    answer: "百位不变，十位多了6个十，个位少了6个一；正确的和是724。",
    answerEn: "The hundreds digit is unchanged, the tens increase by six tens, and the ones decrease by six ones; the correct sum is 724.",
    explanationZhHans: "582比528多54：百位不变，十位由2变8，多6个十；个位由8变2，少6个一，净增加60-6=54。因此正确的和是778-54=724。",
    explanationEn: "582 is 54 greater than 528: the hundreds digit is unchanged, the tens increase from 2 to 8 by six tens, and the ones decrease from 8 to 2 by six ones, for a net increase of 60-6=54. Therefore the correct sum is 778-54=724.",
    rejected: ["724", "十位多6，个位少6"]
  },
  "hjb-primary-ds-v1-p3-108": {
    promptZhHans: "一根绳子对折一次，使两端重合，再在折后绳子的中点剪一刀，同时剪断两层。展开后，依次填写段数和从一端到另一端各段占原绳长的分数，格式为“___段；___，___，___”。",
    promptEn: "Fold a rope once so that its two ends coincide, then make one cut at the midpoint of the folded rope, cutting through both layers. After unfolding, enter the number of pieces and the fraction of the original length of each piece from one end to the other, in the format '___ pieces; ___, ___, ___'.",
    answer: "3段；1/4，1/2，1/4",
    answerEn: "3 pieces; 1/4, 1/2, 1/4",
    explanationZhHans: "折后中点对应原绳的1/4和3/4位置，一刀同时形成两个切口。展开后共有3段，长度依次是原绳的1/4、1/2、1/4。",
    explanationEn: "The midpoint of the folded rope corresponds to the 1/4 and 3/4 points of the original rope, so cutting both layers creates two cut points. After unfolding there are three pieces of lengths 1/4, 1/2, and 1/4 of the original rope.",
    rejected: ["3段", "1/4", "3段；1/4", "3段，其中一段是原来绳子的1/4"]
  },
  "hjb-primary-ds-v1-p4-048": {
    promptZhHans: "小华和小明各有一块同样大小的长方形蛋糕。小华吃了2/8，小明吃了3/8。依次填写吃得更多的人和比较理由，格式为“___；___”。",
    promptEn: "Xiaohua and Xiaoming each have an equally sized rectangular cake. Xiaohua eats 2/8 and Xiaoming eats 3/8. Enter who eats more and the comparison reason in the format '___; ___'.",
    answer: "小明；整体相同、分母相同，分子3>2，所以3/8>2/8。",
    answerEn: "Xiaoming; the wholes and denominators are the same, and 3>2, so 3/8>2/8.",
    explanationZhHans: "两块蛋糕同样大，整体相同；两个分数的分母同为8，所以可以直接比较分子。3>2，因此3/8>2/8，小明吃得更多。",
    explanationEn: "The cakes are equally sized, so the wholes are the same. Both fractions have denominator 8, so compare their numerators directly. Since 3>2, 3/8>2/8 and Xiaoming eats more.",
    rejected: ["小明", "3/8>2/8", "小明；3/8>2/8"]
  },
  "hjb-primary-ds-v1-p4-099": {
    promptZhHans: "用量角器量∠AOB时，射线OA与量角器右端的0°刻度线重合，射线OB经过内圈130°、外圈50°的同一条刻度线。小圆读130°，小方读50°。依次填写角度、读对的人和理由，格式为“___；___；___”。",
    promptEn: "When measuring angle AOB, ray OA aligns with the 0° mark at the right end of the protractor. Ray OB crosses the same tick marked 130° on the inner scale and 50° on the outer scale. Xiaoyuan reads 130° and Xiaofang reads 50°. Enter the angle, who reads it correctly, and the reason in the format '___; ___; ___'.",
    answer: "130°；小圆；OA对准右端0°，应从右端0°起读内圈刻度。",
    answerEn: "130°; Xiaoyuan; OA aligns with 0° on the right, so read the inner scale starting from that right-hand 0° mark.",
    explanationZhHans: "读量角器时要从与角的一边重合的0°刻度起读。OA对准右端0°，因此沿内圈从右向左读到OB是130°，小圆正确。",
    explanationEn: "A protractor must be read from the 0° mark aligned with one side of the angle. Because OA aligns with the right-hand 0° mark, read the inner scale from right to left to OB, giving 130°. Xiaoyuan is correct.",
    rejected: ["130°", "小圆", "130°；小圆"]
  },
  "hjb-primary-ds-v1-p4-188": {
    promptZhHans: "折线统计图的纵轴以115为起始刻度线，每相邻两条刻度线相差5。若星期二的数据是135，且不把115这条起始线计入向上的条数，135应画在115上方第几条刻度线上？",
    promptEn: "A line graph's vertical axis starts at the 115 gridline, and adjacent gridlines differ by 5. If Tuesday's value is 135, and the 115 starting line is not counted among the lines above it, on which gridline above 115 should 135 be plotted?",
    answer: "第4条刻度线",
    answerEn: "the 4th gridline",
    explanationZhHans: "135-115=20，20÷5=4。不计115起始线，135在它上方第4条刻度线上。",
    explanationEn: "135-115=20 and 20÷5=4. Excluding the 115 starting line, 135 is on the fourth gridline above it.",
    rejected: ["第5条刻度线"]
  },
  "hjb-primary-ds-v1-p4-236": {
    promptZhHans: "一个小数恰有两位小数。用“五舍六入”法保留一位小数，即百分位是0至5时舍去，是6至9时向十分位进1。所得结果是3.5，这个两位小数最大是多少？",
    promptEn: "A number has exactly two decimal places. It is rounded to one decimal place using the rule 'discard 0 through 5, round up 6 through 9' according to the hundredths digit. The result is 3.5. What is the greatest possible two-decimal-place number?",
    answer: "3.55",
    answerEn: "3.55",
    explanationZhHans: "要使原数尽量大且舍去百分位后仍为3.5，十分位取5，百分位最多取5。因此最大是3.55；若百分位是6，就会进位得到3.6。",
    explanationEn: "To make the original number as large as possible while still discarding the hundredths digit to get 3.5, use 5 in the tenths place and at most 5 in the hundredths place. Thus the greatest number is 3.55; a hundredths digit of 6 would round it to 3.6.",
    rejected: ["3.54", "3.56"]
  },
  "hjb-primary-ds-v1-p5-036": {
    promptZhHans: "学校图书馆里，故事书本数是科技书的3倍。故事书借出15本后，剩下的故事书比科技书多55本。科技书和故事书原来各有多少本？请按“科技书___本；故事书___本”的格式填写。",
    promptEn: "A school library originally has three times as many storybooks as science books. After 15 storybooks are lent out, the remaining number of storybooks is 55 more than the number of science books. How many of each were there originally? Answer in the format '___ science books; ___ storybooks'.",
    answer: "科技书35本；故事书105本",
    answerEn: "35 science books; 105 storybooks",
    explanationZhHans: "设科技书有x本，则故事书有3x本。根据题意列方程3x-15=x+55，解得x=35，故事书有3×35=105本。检验：105-15-35=55。",
    explanationEn: "Let x be the number of science books, so there are 3x storybooks. The condition gives 3x-15=x+55, hence x=35 and 3x=105. Check: 105-15-35=55.",
    rejected: ["35", "105", "科技书35本", "故事书105本", "35本；105本"]
  },
  "hjb-primary-ds-v1-p5-105": {
    promptZhHans: "某商店星期一到星期日卖出的书包数依次是8、6、9、7、10、12、11个。依次填写日平均数和高于平均数的星期，格式为“平均___个；星期___”。",
    promptEn: "A shop sells 8, 6, 9, 7, 10, 12, and 11 schoolbags from Monday through Sunday. Enter the daily mean and the days above the mean in the format 'mean ___; ___'.",
    answer: "平均9个；星期五、星期六、星期日",
    answerEn: "mean 9; Friday, Saturday, and Sunday",
    explanationZhHans: "总数是8+6+9+7+10+12+11=63，平均数是63÷7=9。只有星期五10个、星期六12个、星期日11个高于9；星期三9个等于平均数，不算高于。",
    explanationEn: "The total is 8+6+9+7+10+12+11=63, so the mean is 63÷7=9. Only Friday's 10, Saturday's 12, and Sunday's 11 are above 9; Wednesday's 9 equals the mean and is not above it.",
    rejected: ["9", "平均9个", "星期五、星期六、星期日", "星期三、星期五、星期六、星期日"]
  },
  "hjb-primary-ds-v1-p5-125": {
    promptZhHans: "环保小组上周5个上学日收集废纸5.2、4.8、5.0、5.6、4.4千克。本周也按5个上学日估算，假设每天收集量约等于上周日平均数；每千克废纸可换0.8千克再生纸。依次填写上周日平均数和本周约能换的再生纸质量。",
    promptEn: "Over five school days last week, an environmental group collected 5.2, 4.8, 5.0, 5.6, and 4.4 kg of waste paper. Estimate this week as five school days, with each day's collection equal to last week's daily mean. Each kilogram of waste paper can be exchanged for 0.8 kg of recycled paper. Enter last week's daily mean and the amount of recycled paper expected this week.",
    answer: "日平均5千克；本周约换20千克再生纸",
    answerEn: "daily mean 5 kg; about 20 kg of recycled paper this week",
    explanationZhHans: "上周总量是5.2+4.8+5.0+5.6+4.4=25（千克），日平均是25÷5=5（千克）。本周5个上学日估计收集5×5=25（千克），可换25×0.8=20（千克）再生纸。",
    explanationEn: "Last week's total was 5.2+4.8+5.0+5.6+4.4=25 kg, so the daily mean was 25÷5=5 kg. Over five school days this week, estimate 5×5=25 kg of waste paper, which exchanges for 25×0.8=20 kg of recycled paper.",
    rejected: ["5千克", "20千克", "日平均5千克", "本周约换20千克再生纸", "平均数5千克，大约能换4千克再生纸"]
  },
  "hjb-primary-ds-v1-p5-126": {
    promptZhHans: "6名同学1分钟跳绳的成绩是145、138、152、140、148、155下。（1）求平均数，结果保留两位小数；（2）说明这个平均数表示什么。请完整填写两项。",
    promptEn: "Six students make 145, 138, 152, 140, 148, and 155 jumps in one minute. (1) Find the mean, rounded to two decimal places. (2) State what the mean represents. Complete both parts.",
    answer: "（1）146.33下；（2）表示这6名同学1分钟跳绳的整体水平。",
    answerEn: "(1) 146.33 jumps; (2) it represents the overall one-minute jump-rope performance of the six students.",
    explanationZhHans: "总成绩是145+138+152+140+148+155=878（下），平均数是878÷6=439/3≈146.33（下）。平均数用于表示这6名同学1分钟跳绳的整体水平。",
    explanationEn: "The total is 145+138+152+140+148+155=878 jumps. The mean is 878÷6=439/3≈146.33 jumps. This mean represents the overall one-minute jump-rope performance of the six students.",
    rejected: ["146.33", "146.33下", "整体水平", "146下"]
  }
} as const;

for (const [id, contract] of Object.entries(responseContracts)) {
  test(`${id} uses the independently recomputed complete response contract`, () => {
    const question = requiredQuestion(id);
    assert.equal(question.prompt.zhHans, contract.promptZhHans);
    assert.equal(question.prompt.en, contract.promptEn);
    assert.equal(question.answer, contract.answer);
    assert.equal(question.explanation.zhHans, contract.explanationZhHans);
    assert.equal(question.explanation.en, contract.explanationEn);
    assert.equal(questionAnswerMatches(gradingQuestion(question), contract.answer), true, `${id} canonical`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), contract.answerEn), true, `${id} English answer`);
    for (const partial of contract.rejected) {
      assert.equal(questionAnswerMatches(gradingQuestion(question), partial), false, `${id} rejects ${partial}`);
    }
    assertCleanTrilingualSurface(question);
  });
}

test("hjb-primary-ds-v1-p3-235 remains byte-for-byte unchanged and has one true option", () => {
  const question = requiredQuestion("hjb-primary-ds-v1-p3-235");
  assert.equal(
    question.prompt.zhHans,
    "学校举行跳绳比赛，记录了三（2）班四名同学一分钟跳绳的次数：小杰跳了142下，小文跳了135下，小宇跳了148下，小琪跳了139下。下面哪个结论是正确的？"
  );
  assert.deepEqual((question.options ?? []).map((option) => option.zhHans), [
    "小宇跳得最多，是148下",
    "小杰比小文多跳6下",
    "小琪跳得最少，是139下",
    "小宇比小琪多跳8下"
  ]);
  assert.equal(question.answer, "小宇跳得最多，是148下");
  assert.equal(
    question.explanation.zhHans,
    "比较数据：148>142>139>135，所以小宇跳得最多。小杰比小文多7下，小文跳得最少，小宇比小琪多9下。"
  );
  for (const locale of ["zhHans", "zh", "en"] as const) {
    const hits = (question.options ?? []).map((option) =>
      questionAnswerMatches(gradingQuestion(question), text(option, locale))
    );
    assert.deepEqual(hits, [true, false, false, false], `${locale} unique option`);
  }
});

test("shared Chinese classifier answers use question-specific English canonicals and feedback", () => {
  const contracts = [
    {
      id: "hjb-primary-ds-v1-p1-156",
      answer: "20 stickers",
      rejected: ["20 items", "20 picture cards"],
      feedback: { en: "20 stickers", zh: "20張", zhHans: "20张" }
    },
    {
      id: "hjb-primary-ds-v1-p2-096",
      answer: "20 picture cards",
      rejected: ["20 items", "20 stickers"],
      feedback: { en: "20 picture cards", zh: "20張", zhHans: "20张" }
    }
  ] as const;

  for (const contract of contracts) {
    const question = requiredQuestion(contract.id);
    assert.equal(question.answer, contract.answer, `${contract.id} English canonical`);
    for (const accepted of [contract.answer, "20张", "20張", "20"]) {
      assert.equal(
        questionAnswerMatches(gradingQuestion(question), accepted),
        true,
        `${contract.id} accepts ${accepted}`
      );
    }
    for (const rejected of contract.rejected) {
      assert.equal(
        questionAnswerMatches(gradingQuestion(question), rejected),
        false,
        `${contract.id} rejects ${rejected}`
      );
    }
    assert.deepEqual(localizedCorrectAnswerForFeedback({
      type: question.type,
      answer: question.answer,
      acceptedAnswers: question.acceptedAnswers,
      options: question.options
    }), contract.feedback, `${contract.id} feedback`);
  }
});

test("the A18 HJB Primary closure inventory is exactly 27 repairs plus one protected false positive", () => {
  assert.equal(Object.keys(aliasContracts).length, 2);
  assert.equal(Object.keys(multipleChoiceContracts).length, 13);
  assert.equal(Object.keys(responseContracts).length, 12);
  assert.equal(2 + 13 + 12, 27);
});

test("all 1,500 HJB Primary canonicals and stored aliases self-match", () => {
  assert.equal(mainlandHjbPrimaryQuestions.length, 1_500);
  for (const question of mainlandHjbPrimaryQuestions) {
    assert.equal(
      questionAnswerMatches(gradingQuestion(question), question.answer),
      true,
      `${question.id} canonical must match`
    );
    for (const alias of question.acceptedAnswers ?? []) {
      assert.equal(
        questionAnswerMatches(gradingQuestion(question), alias),
        true,
        `${question.id} stored alias must match: ${alias}`
      );
    }
  }
});

const allMultipleChoiceQuestions = mainlandHjbPrimaryQuestions.filter(
  (question) => question.type === "multiple-choice"
);

test(`all ${allMultipleChoiceQuestions.length} HJB Primary MC rows expose four unique choices and one matcher hit per locale`, () => {
  for (const question of allMultipleChoiceQuestions) {
    assert.equal(question.options?.length, 4, `${question.id} must expose four options`);
    for (const locale of ["zhHans", "zh", "en"] as const) {
      const displayed: string[] = (question.options ?? []).map((option: LocalizedText): string => text(option, locale));
      assert.equal(new Set(displayed).size, 4, `${question.id} ${locale} options must be unique`);
      const acceptedIndexes: number[] = displayed.flatMap((option: string, index: number): number[] =>
        questionAnswerMatches(gradingQuestion(question), option) ? [index] : []
      );
      assert.equal(
        acceptedIndexes.length,
        1,
        `${question.id} ${locale} must have exactly one matcher hit; got ${acceptedIndexes.join(",")}`
      );
    }
  }
});
