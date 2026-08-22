import assert from "node:assert/strict";
import test from "node:test";
import * as translationValidation from "./china-lesson-english-translation-validation";
import {
  contextualAsciiMinusIndexes,
  criticalMathGroupingSignatures,
  indexedMathIdentifiers,
  mathExpressionSignatures,
  mathSymbolTokens,
  numericTokens,
  protectTranslationSource,
  restoreProtectedTranslation,
  validateRestoredTranslation,
  validateTranslation,
  type TranslationValidationEntry
} from "./china-lesson-english-translation-validation";

function entry(source: string, id = "fixture"): TranslationValidationEntry {
  return { id, source, contexts: ["unit-test"] };
}

function assertRejected(source: string, translated: string, pattern?: RegExp) {
  const validate = () => validateRestoredTranslation(entry(source), translated);
  if (pattern) assert.throws(validate, pattern);
  else assert.throws(validate);
}

test("unsigned number and operator validation rejects the observed sign corruptions", () => {
  assertRejected("16-8=8", "16 × -8 = 8", /negative operand|mathematical symbols/u);
  assertRejected("7+3=10", "7 + +3 = 10", /mathematical symbols changed/u);
  assertRejected("67-48=19", "67 - -48 = 19", /negative operand|mathematical symbols/u);
  assertRejected("15+(-5)=10", "15 plus -5 = 10", /operator|mathematical symbols/u);
});

test("legitimate unary signs, fractions, coordinates, and grouping remain valid", () => {
  const valid = [
    "-4 - (-2) = -2",
    "2×(-3)=-6",
    "(-6)÷(-6)=1",
    "3/4×2/5=3/10",
    "A(2, -3)"
  ];
  valid.forEach((value) => assert.equal(validateRestoredTranslation(entry(value), value), value));
  assert.equal(validateRestoredTranslation(entry("-4--2=-2"), "-4 - (-2) = -2"), "-4 - (-2) = -2");
  assertRejected("(2+3)×4=20", "2+3×4=20", /grouping/u);
  assert.notDeepEqual(criticalMathGroupingSignatures("(2+3)×4"), criticalMathGroupingSignatures("2+3×4"));
});

test("direct validation preserves identifiers, relations, ratios, products, and grouping", () => {
  const corruptions = [
    ["(x+1)^2", "x+1^2"],
    ["a₁=3", "a₂=3"],
    ["A=3,B=4", "A=4,B=3"],
    ["1<2", "2<1"],
    ["1:4", "4:1"],
    ["1:4", "1 to 4"],
    ["u·v=0", "uv=0"],
    ["x=3", "y=3"],
    ["P(A)=0.2", "P(B)=0.2"],
    ["ab=6", "ac=6"],
    ["2ab=6", "2ac=6"],
    ["xy=1", "xz=1"],
    ["sinx=1", "cosx=1"],
    ["aᵢ=1", "aᵤ=1"],
    ["aᵢ₊₁=2", "aᵢ₊₂=2"],
    ["xᶜ=1", "xᵅ=1"],
    ["x̄=4", "x=4"],
    ["ȳ=2", "y=2"],
    ["0.3̇=1/3", "0.3=1/3"],
    ["x∈ℝ", "x∈ℂ"],
    ["2ⁿ⁺¹", "2ⁿ⁻¹"],
    ["|A|=0", "(A)=0"],
    ["|x|=3", "||x||=3"]
  ] as const;
  corruptions.forEach(([source, target]) => assertRejected(source, target, /expression|identifier|symbol|grouping|ratio/u));

  assert.equal(validateRestoredTranslation(entry("AD⊥BC"), "AD ⟂ BC"), "AD ⟂ BC");
  assert.equal(validateRestoredTranslation(entry("u/v=2"), "u / v = 2"), "u / v = 2");
  assert.equal(
    validateRestoredTranslation(entry("故事书:科技书=5:3"), "Story books : Science books = 5 : 3"),
    "Story books : Science books = 5 : 3"
  );
  assert.equal(
    validateRestoredTranslation(entry("关于x轴对称"), "symmetric about the x-axis"),
    "symmetric about the x-axis"
  );
  assertRejected("关于x轴对称", "symmetric about the y-axis", /identifier/u);
  assert.equal(
    validateRestoredTranslation(entry("横坐标不变"), "The x-coordinate is unchanged."),
    "The x-coordinate is unchanged."
  );
  assert.equal(validateRestoredTranslation(entry("a 是整数"), "a is an integer"), "a is an integer");
  assert.equal(
    validateRestoredTranslation(entry("设a表示人数"), "Let a represent the number of people."),
    "Let a represent the number of people."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("极值点必须满足f′(1)=0；又f″(1)=6>0。"),
      "A local extremum requires f′(1)=0; f″(1)=6>0 confirms a local minimum."
    ),
    "A local extremum requires f′(1)=0; f″(1)=6>0 confirms a local minimum."
  );
  assertRejected("a 是整数", "b is an integer", /identifier/u);
  assert.equal(
    validateRestoredTranslation(
      entry("一个圆形花坛的半径是4米"),
      "A circular flower bed has a radius of 4 meters."
    ),
    "A circular flower bed has a radius of 4 meters."
  );
});

test("sequence ellipses are exact math atoms without treating prose ellipses as notation", () => {
  assertRejected("1,2,3,…,n", "1,2,3,n", /mathematical symbols/u);
  assertRejected("a₁,a₂,...,aₙ", "a₁,a₂,aₙ", /mathematical symbols/u);
  assert.equal(validateRestoredTranslation(entry("1,2,3,...,n"), "1,2,3,…,n"), "1,2,3,…,n");
  assert.equal(validateRestoredTranslation(entry("Think... then answer."), "Think... then answer."), "Think... then answer.");
});

test("target grouping is balanced while conventional mixed interval endpoints remain valid", () => {
  assertRejected("x=1", "x = 1)", /unbalanced.*grouping/u);
  assertRejected("(x+1)^2", "(x+1^2", /unbalanced.*grouping|grouping/u);

  const intervals = ["(-∞,-2]", "[1,+∞)", "(a,b]", "[a,b)", "[0,2π)", "[0,π/2)"];
  intervals.forEach((value) => assert.equal(validateRestoredTranslation(entry(value), value), value));
});

test("natural English math labels preserve notation without turning prose labels into operands", () => {
  const serviceSource = "甲、乙两种服务的费用模型分别为C甲=20+3t和C乙=8+5t。";
  const serviceTarget = "The cost models for services Jia and Yi are C_Jia=20+3t and C_Yi=8+5t, respectively.";
  assert.equal(validateRestoredTranslation(entry(serviceSource), serviceTarget), serviceTarget);

  assert.equal(
    validateRestoredTranslation(entry("若c、d互为倒数，则cd=1。"), "If c and d are reciprocals, then cd=1."),
    "If c and d are reciprocals, then cd=1."
  );
  assert.deepEqual(indexedMathIdentifiers("若c、d互为倒数，则cd=1。"), ["c", "cd", "d"]);
  assert.equal(
    validateRestoredTranslation(entry("A方案可行，B方案不可行。"), "Plan A is feasible, but Plan B is not."),
    "Plan A is feasible, but Plan B is not."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("A、B不成正比例，D是和一定。"),
      "A and B are not directly proportional, and D has a constant sum."
    ),
    "A and B are not directly proportional, and D has a constant sum."
  );
  assert.equal(
    validateRestoredTranslation(entry("点A、B都在圆O上。"), "Points labeled A and B lie on circle O."),
    "Points labeled A and B lie on circle O."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("蚂蚁从长方体的顶点A沿表面爬到相对的顶点B。"),
      "An ant crawls along the cuboid's surface from vertex A to the opposite vertex B."
    ),
    "An ant crawls along the cuboid's surface from vertex A to the opposite vertex B."
  );
  assert.equal(validateRestoredTranslation(entry("求A'和B'。"), "Find A' and B'."), "Find A' and B'.");
  assert.equal(validateRestoredTranslation(entry("CD'=CD=6"), "CD'=CD=6"), "CD'=CD=6");
  assertRejected("求A'和B'。", "Find A and B'.", /identifier/u);

  assert.equal(
    validateRestoredTranslation(entry("1时=60分，60秒=1分。"), "1 hour=60 minutes, and 60 seconds=1 minute."),
    "1 hour=60 minutes, and 60 seconds=1 minute."
  );
  assert.equal(
    validateRestoredTranslation(entry("速度=路程÷时间。"), "Speed=distance÷time."),
    "Speed=distance÷time."
  );
  assert.equal(
    validateRestoredTranslation(entry("极差=最大值-最小值=170-155=15cm。"), "Range=maximum-minimum=170-155=15 cm."),
    "Range=maximum-minimum=170-155=15 cm."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("底面积=π×半径²，容积=底面积×高。"),
      "Base area=π×radius², and capacity=base area×height."
    ),
    "Base area=π×radius², and capacity=base area×height."
  );

  assert.equal(
    validateRestoredTranslation(entry("3mn和-2nm都含m和n。"), "Both 3mn and -2nm contain m and n."),
    "Both 3mn and -2nm contain m and n."
  );
  assert.equal(
    validateRestoredTranslation(entry("由递推关系求前n项和。"), "Use the recurrence to find the sum through term n."),
    "Use the recurrence to find the sum through term n."
  );
  assert.equal(
    validateRestoredTranslation(entry("用分母n计算方差。"), "Calculate the variance using denominator n."),
    "Calculate the variance using denominator n."
  );
  assert.equal(
    validateRestoredTranslation(entry("f'(x)的符号决定f的增减。"), "The sign of f'(x) determines where f increases or decreases."),
    "The sign of f'(x) determines where f increases or decreases."
  );
  assert.equal(
    validateRestoredTranslation(entry("直线r、s相交。"), "Lines r and s intersect."),
    "Lines r and s intersect."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("设直线l上的点为P(s)。"),
      "Let a point on line l be P(s)."
    ),
    "Let a point on line l be P(s)."
  );
  assert.deepEqual(indexedMathIdentifiers("Let a point on line l be P(s)."), ["P", "l", "s"]);
  assert.equal(validateRestoredTranslation(entry("z=3+4i"), "z=3+4i"), "z=3+4i");
  assertRejected("z=3+4i", "z=3+4j", /identifier|expression/u);
});

test("publisher acronyms, implicit factors, units, and articles stay distinct", () => {
  const publisherTitle = "BNU Edition Junior High: Proving Parallel Lines";
  assert.equal(
    validateRestoredTranslation(entry("北师大版初中：平行线的证明"), publisherTitle),
    publisherTitle
  );
  assert.deepEqual(indexedMathIdentifiers(publisherTitle), []);
  assert.equal(
    validateRestoredTranslation(
      entry("科技组6格，美术组5格，音乐组4格，体育组7格"),
      "Science group: 6 squares, Art group: 5 squares, Music group: 4 squares, PE group: 7 squares"
    ),
    "Science group: 6 squares, Art group: 5 squares, Music group: 4 squares, PE group: 7 squares"
  );
  assert.deepEqual(indexedMathIdentifiers("Segment PE has length 4."), ["PE"]);

  assert.equal(
    validateRestoredTranslation(entry("甲的方差更小。"), "Shooter Jia has the smaller variance."),
    "Shooter Jia has the smaller variance."
  );

  const sequenceFormula = "a_n=a1+(n-1)d";
  assert.equal(validateRestoredTranslation(entry(sequenceFormula), sequenceFormula), sequenceFormula);
  assertRejected(sequenceFormula, "a_n=a1+(n-1)", /expression|identifier/u);
  assert.equal(validateRestoredTranslation(entry("10=2a"), "10=2a"), "10=2a");
  assertRejected("10=2a", "10=2", /expression|identifier/u);

  const measurementSource = "设边长为 x m，面积为 y m²。";
  const measurementTarget = "Let the side length be x m and the area be y m².";
  assert.equal(validateRestoredTranslation(entry(measurementSource), measurementTarget), measurementTarget);
  assert.deepEqual(indexedMathIdentifiers(measurementSource), ["x", "y"]);

  const articleSource = "必须区分离散指标 n 与实变量。";
  const articleTarget = "You must distinguish the discrete index n from a real variable.";
  assert.equal(validateRestoredTranslation(entry(articleSource), articleTarget), articleTarget);
  const pointArticleSource = "给定非零法向量 n 和点 P。";
  const pointArticleTarget = "Given a nonzero normal vector n and a point P.";
  assert.equal(validateRestoredTranslation(entry(pointArticleSource), pointArticleTarget), pointArticleTarget);
});

test("function arguments and parameter notation are not count-noun plural placeholders", () => {
  assert.equal(validateRestoredTranslation(entry("P(s)、Q(t)分别在两条直线上。"), "P(s) and Q(t) lie on two lines."), "P(s) and Q(t) lie on two lines.");
  assert.equal(validateRestoredTranslation(entry("x∈[0,2π)"), "x∈[0,2π)"), "x∈[0,2π)");
  assertRejected("3小时30分钟", "3 hour(s) 30 minute(s)", /parenthetical plural/u);
});

test("prose hyphens are not classified as subtraction", () => {
  const prose = "Use the x-coordinate of the two-digit number in a one-to-one mapping.";
  assert.deepEqual(contextualAsciiMinusIndexes(prose), []);
  assert.deepEqual(mathSymbolTokens(prose), []);
  assert.equal(validateRestoredTranslation(entry(prose), prose), prose);

  const miniCheck = "Mini-check 1 uses a one-to-one mapping.";
  assert.equal(validateRestoredTranslation(entry(miniCheck), miniCheck), miniCheck);
  assert.deepEqual(contextualAsciiMinusIndexes("A-B and x - 1"), [1, 10]);
  assert.deepEqual(contextualAsciiMinusIndexes("AB-AC, cosβ-cosα, 45-seat, two- and three-digit"), [2, 11]);

  const nonFormulaFixtures = [
    "The temperature is -3°C.",
    "A square meter is written as m².",
    "The area is 1 cm².",
    "Use term-by-term analysis."
  ];
  nonFormulaFixtures.forEach((value) => assert.equal(validateRestoredTranslation(entry(value), value), value));
});

test("source fullwidth math typography normalizes to standard English typography", () => {
  assert.equal(validateRestoredTranslation(entry("25－8＝17"), "25 - 8 = 17"), "25 - 8 = 17");
  assertRejected("25－8＝17", "25－8＝17", /full-width/u);
  assert.equal(validateRestoredTranslation(entry("3≈3，改用英文标点"), "3 ≈ 3, using English punctuation"), "3 ≈ 3, using English punctuation");
  assert.equal(validateRestoredTranslation(entry("① 6×7=42；② 90°"), "① 6 × 7 = 42; ② 90°"), "① 6 × 7 = 42; ② 90°");
  assert.equal(validateRestoredTranslation(entry("把0.6∶1.2化简"), "Reduce 0.6∶1.2."), "Reduce 0.6∶1.2.");
  assert.equal(validateRestoredTranslation(entry("气温是-3℃"), "The temperature is -3°C."), "The temperature is -3°C.");
  assert.equal(validateRestoredTranslation(entry("π取3.14"), "Use π = 3.14."), "Use π = 3.14.");
  assert.equal(validateRestoredTranslation(entry("∠B=50度"), "∠B = 50°."), "∠B = 50°.");
  assert.equal(validateRestoredTranslation(entry("AD⊥BC"), "AD ⟂ BC"), "AD ⟂ BC");
  assert.equal(validateRestoredTranslation(entry("现在是8时30分"), "It is 8:30."), "It is 8:30.");
  const exactUnicodeSymbols = [
    ["⊙O", "O"],
    ["△ABC≌△DEF", "△ABC△DEF"],
    ["∛8=2", "8=2"],
    ["A∩B=∅", "A∩B={}"],
    ["∑aᵢ=1", "aᵢ=1"],
    ["A∴B", "A B"],
    ["A∵B", "A B"],
    ["∁UA", "A"]
  ] as const;
  exactUnicodeSymbols.forEach(([source, target]) => assertRejected(source, target, /mathematical symbols/u));
});

test("formula signatures preserve each expression while allowing natural prose reordering", () => {
  const source = "某水池在t=0时有水120立方米。";
  const target = "A tank contains 120 cubic meters of water at t = 0.";
  assert.deepEqual(mathExpressionSignatures(source), mathExpressionSignatures(target));
  assert.equal(validateRestoredTranslation(entry(source), target), target);
  assertRejected("7+3=10", "3+7=10", /expression structure/u);
});

test("ordinal validation covers teens and hyphenated machine forms", () => {
  ["3th", "8-th", "12-th"].forEach((ordinal) => assertRejected("第3项", `Choose the ${ordinal} item.`, /ordinal/u));
  const validOrdinals = ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"];
  validOrdinals.forEach((ordinal) => {
    const number = ordinal.match(/\d+/u)?.[0] ?? "";
    assert.equal(
      validateRestoredTranslation(entry(`第${number}项`), `Choose the ${ordinal} item.`),
      `Choose the ${ordinal} item.`
    );
  });
});

test("literal one agreement is strict without flagging decimals or expressions", () => {
  assertRejected("每份1份", "Each part is 1 parts.", /plural noun/u);
  assertRejected("有1行", "There is 1 rows.", /plural noun/u);
  assertRejected("1个小正方体", "1 small cubes are black.", /plural noun|verb agreement/u);
  assertRejected("1个花架", "1 flower stands are left.", /plural noun|verb agreement/u);
  assertRejected("其中1个", "1 of them are red.", /verb agreement/u);
  assertRejected("还多1辆车", "1 more vehicles are parked.", /plural noun|verb agreement/u);
  assertRejected("1个是黑色", "1 are black.", /verb agreement/u);
  assertRejected("有1个红球", "There are 1 red balls.", /plural noun|verb agreement/u);
  assertRejected("一个孩子准备好了", "One child are ready.", /verb agreement/u);

  const valid = [
    "The distance is 0.1 meters.",
    "There are x - 1 people.",
    "1 times 5 is 5.",
    "1 is odd.",
    "One shows the result.",
    "The equations x = 1 are equivalent.",
    "There are 1.5 meters between the points.",
    "A 5×1 meter rectangle has area 5 m²."
  ];
  valid.forEach((value) => assert.equal(validateRestoredTranslation(entry(value), value), value));
  const coordinatedSource = "实数a、b、1两两不同。已知集合A={1,a,b}，B={a,a²,ab}，且A=B。求a^{2023}+b^{2024}。";
  const coordinatedTarget = "The real numbers a, b, and 1 are pairwise distinct. Given the sets A={1,a,b} and B={a,a²,ab}, with A=B, find a^{2023}+b^{2024}.";
  assert.equal(validateRestoredTranslation(entry(coordinatedSource), coordinatedTarget), coordinatedTarget);
});

test("language-style gates reject punctuation, terminology, Markdown, and literal multiplication rhymes", () => {
  assertRejected("答案是8", "Answer：8。", /full-width/u);
  assertRejected("所以x=2", "Therefore; x = 2.; Rotation follows.", /period-semicolon/u);
  assertRejected("最简公分母", "Find the simplest common denominator.", /least or lowest/u);
  assertRejected("用竖式计算", "Use vertical calculation.", /column method/u);
  assertRejected("加减法（三）", "*Addition and Subtraction (Three)*", /Markdown/u);
  assertRejected("六六三十六", "six six thirty-six", /multiplication rhyme/u);
  assertRejected("五七三十五", "five seven thirty-five", /multiplication rhyme/u);
  assertRejected("八九七十二", "eight nine seventy-two", /multiplication rhyme/u);
  assertRejected("三年级二班", "Class Grade 3 Class 2", /grade\/class/u);
  assertRejected("从1楼到5楼", "from the 1 floor to the 5 floor", /floor.*ordinal/u);
  assertRejected("这个时刻是上午还是下午", "The time shown is AM ( ).", /AM\/PM blank/u);
  assertRejected("两组数分别是2个0.01", "The values are 2 0.01.", /adjacent numeric atoms/u);
  assertRejected("五个2秒", "Record 5 2s intervals.", /adjacent numeric atoms/u);
  assertRejected("一张20元钞票", "1 20-yuan bills", /plural noun/u);
  assert.equal(validateRestoredTranslation(entry("从1楼到5楼"), "from the 1st floor to the 5th floor"), "from the 1st floor to the 5th floor");
  assert.equal(validateRestoredTranslation(entry("table 1 2\n3 4"), "table 1 2\n3 4"), "table 1 2\n3 4");
  assert.equal(
    validateRestoredTranslation(entry("在横线上填数：____。"), "Fill in the blank: ____."),
    "Fill in the blank: ____."
  );
  assert.equal(
    validateRestoredTranslation(entry("数列依次为二、四、八"), "The sequence begins two four eight."),
    "The sequence begins two four eight."
  );
  assert.equal(validateRestoredTranslation(entry("逐项分析"), "Use term-by-term analysis."), "Use term-by-term analysis.");
  assert.equal(validateRestoredTranslation(entry("线段QA"), "segment QA"), "segment QA");
  const meridiemSource = "下午2时记录气温，横轴表示星期。";
  const meridiemTarget = "Record the temperature at 2 p.m.; then plot the data on the horizontal axis.";
  assert.equal(validateRestoredTranslation(entry(meridiemSource), meridiemTarget), meridiemTarget);
  const articleSource = "随机事件是可能发生也可能不发生的事件。其他选项都是必然事件。";
  const articleTarget = "A random event is one that may or may not happen. The other options are certain events.";
  assert.equal(validateRestoredTranslation(entry(articleSource), articleTarget), articleTarget);
  assert.equal(
    validateRestoredTranslation(entry("B. 1884平方厘米"), "B. 1884 square centimeters"),
    "B. 1884 square centimeters"
  );
  assertRejected("B. 1884平方厘米", "C. 1884 square centimeters", /identifier/u);
  assert.equal(validateRestoredTranslation(entry("A错，B对"), "A is wrong; B is correct."), "A is wrong; B is correct.");
  assert.equal(
    validateRestoredTranslation(
      entry("选项A、C、D均改变了运算顺序。"),
      "Options A, C, and D all change the order of operations."
    ),
    "Options A, C, and D all change the order of operations."
  );
  assert.equal(
    validateRestoredTranslation(
      entry("选项C正确。A错误，B和D也错误。"),
      "Option C is correct. A is wrong, and B and D are also wrong."
    ),
    "Option C is correct. A is wrong, and B and D are also wrong."
  );
  assertRejected(
    "选项A、C、D均改变了运算顺序。",
    "Options A, B, and D all change the order of operations.",
    /identifier/u
  );
  assert.deepEqual(indexedMathIdentifiers(articleTarget), []);
  assert.equal(
    validateRestoredTranslation(entry("小明的更甜"), "Xiao Ming's is sweeter."),
    "Xiao Ming's is sweeter."
  );
  assertRejected("复核结果", "Passed the QA review.", /internal workflow/u);
});

test("literal generated term tokens are hard failures while pseudo-English is categorized conservatively", () => {
  assertRejected("测试占位符", "Use term-6362______sheets here.", /literal term-\* placeholder/u);
  assertRejected("测试占位符", "term-81ea-term-5df1", /literal term-\* placeholder/u);
  assert.equal(validateRestoredTranslation(entry("逐项分析"), "Use term-by-term analysis."), "Use term-by-term analysis.");

  const detector = (translationValidation as unknown as {
    englishSurfaceLanguageFindings?: (value: string) => Array<{ category: string }>;
  }).englishSurfaceLanguageFindings;
  assert.equal(typeof detector, "function", "Expected the conservative surface-language detector to be exported");
  assert.deepEqual(detector?.("term-6362______sheets"), [{ category: "fallback-term-token" }]);
  assert.deepEqual(detector?.("times surface which one items is same equal and can can be used"), [
    { category: "pseudo-times-surface" },
    { category: "pseudo-one-items" },
    { category: "pseudo-same-equal" },
    { category: "pseudo-can-can" }
  ]);
  assert.deepEqual(detector?.("none number items; part separately; correct of is; in requires"), [
    { category: "pseudo-none-number-items" },
    { category: "pseudo-part-separately" },
    { category: "pseudo-correct-of-is" },
    { category: "pseudo-in-requires" }
  ]);
  assert.deepEqual(detector?.("Find the surface area. Use one item. The two equal sides have the same length."), []);

  [
    ["times surface method", "pseudo-times-surface"],
    ["one items remains", "pseudo-one-items"],
    ["the values are same equal", "pseudo-same-equal"],
    ["we can can solve it", "pseudo-can-can"],
    ["none number items remain", "pseudo-none-number-items"],
    ["part separately before solving", "pseudo-part-separately"],
    ["the correct of is A", "pseudo-correct-of-is"],
    ["fill in requires a value", "pseudo-in-requires"]
  ].forEach(([translated, category]) => {
    assertRejected("检查英语表达", translated, new RegExp(`pseudo-English.*${category}`, "u"));
  });
});

test("calendar dates and Chinese numeric scales use natural deterministic English", () => {
  assert.equal(validateRestoredTranslation(entry("3月1日"), "March 1"), "March 1");
  assert.equal(validateRestoredTranslation(entry("3月至4月"), "March to April"), "March to April");
  assertRejected("3月1日", "month 3 day 1", /calendar|numeric tokens/u);
  assertRejected("3月1日", "April 1", /calendar/u);
  assertRejected("3月至4月", "April to March", /calendar/u);
  const monthlySource = "某城市2024年1~6月的月平均气温如下：1月2℃，2月5℃，3月10℃，4月16℃，5月22℃，6月28℃。这6个月的平均气温是多少摄氏度？";
  const monthlyTarget = "The monthly average temperatures in a city from January to June 2024 are: January 2°C, February 5°C, March 10°C, April 16°C, May 22°C, and June 28°C. What is the mean over these 6 months in degrees Celsius?";
  assert.equal(validateRestoredTranslation(entry(monthlySource), monthlyTarget), monthlyTarget);
  assertRejected(monthlySource, monthlyTarget.replace("January to June", "June to January"), /calendar/u);
  const monthlyTableSource = "某城市2023年1~6月的月平均气温如下：| 月份 | 1月 | 2月 | 3月 | 4月 | 5月 | 6月 | | 气温（℃） | 2 | 5 | 10 | 16 | 22 | 28 |";
  const monthlyTableTarget = "The monthly average temperatures in a city from January to June 2023 are: | Month | January | February | March | April | May | June | | Temperature (°C) | 2 | 5 | 10 | 16 | 22 | 28 |";
  assert.equal(validateRestoredTranslation(entry(monthlyTableSource), monthlyTableTarget), monthlyTableTarget);
  assertRejected(monthlyTableSource, monthlyTableTarget.replace("January to June", "June to January"), /calendar/u);
  const leapYearSource = "2024年是闰年，2月有29天。从2月1日到3月1日经过29天。29÷7=4周余1天，星期四往后推1天是星期五。";
  const leapYearTarget = "2024 is a leap year, so February has 29 days. From February 1 to March 1, 29 days pass. Since 29÷7=4 weeks with a remainder of 1 calendar day, moving forward by 1 calendar day from Thursday gives Friday.";
  assert.equal(validateRestoredTranslation(entry(leapYearSource), leapYearTarget), leapYearTarget);
  assertRejected(leapYearSource, leapYearTarget.replace("February has", "March has"), /calendar/u);
  assertRejected("13月1日", "Month 13, day 1", /calendar month/u);
  assert.deepEqual(numericTokens("9亿"), ["900000000"]);
  assert.deepEqual(numericTokens("500万千瓦时"), ["5000000"]);
  assert.deepEqual(numericTokens("1万亿"), ["1000000000000"]);
  assert.deepEqual(numericTokens("1.2万亿"), ["1200000000000"]);
  assert.equal(validateRestoredTranslation(entry("9亿"), "900,000,000"), "900,000,000");
  assert.equal(validateRestoredTranslation(entry("500万千瓦时"), "5,000,000 kilowatt-hours"), "5,000,000 kilowatt-hours");
  assertRejected("9亿", "9 hundred million", /numeric scale|numeric tokens/u);
  assert.deepEqual(numericTokens("大月有1、3、5、7、8、10、12月"), ["1", "10", "12", "3", "5", "7", "8"]);
  assert.deepEqual(numericTokens("50005万位是5"), ["5", "50005"]);
  assert.deepEqual(numericTokens("50005万亿位是5"), ["5", "50005"]);
  assert.equal(validateRestoredTranslation(entry("星期一"), "Monday"), "Monday");
  assert.equal(validateRestoredTranslation(entry("周一至周五"), "Monday to Friday"), "Monday to Friday");
  assertRejected("星期一", "Sunday", /weekday/u);
  assertRejected("周一至周五", "Friday to Monday", /weekday/u);
});

test("clock readings use clock notation rather than duration wording", () => {
  assert.equal(validateRestoredTranslation(entry("10时15分"), "10:15"), "10:15");
  assert.equal(validateRestoredTranslation(entry("现在是8时30分"), "It is 8:30."), "It is 8:30.");
  assertRejected("10时15分", "10 hours 15 minutes", /clock/u);
  assertRejected("8时30分", "8 hours 30 minutes", /clock/u);
});

test("measurement units preserve dimension and quantity order", () => {
  assert.equal(validateRestoredTranslation(entry("5厘米"), "5 centimeters"), "5 centimeters");
  assert.equal(validateRestoredTranslation(entry("5平方米"), "5 m²"), "5 m²");
  assert.equal(validateRestoredTranslation(entry("2小时20分钟"), "2 hours 20 minutes"), "2 hours 20 minutes");
  assert.equal(validateRestoredTranslation(entry("500毫升"), "500 milliliters"), "500 milliliters");
  assert.equal(validateRestoredTranslation(entry("3千克"), "3 kilograms"), "3 kilograms");
  assert.equal(validateRestoredTranslation(entry("3℃"), "3°C"), "3°C");
  assert.equal(validateRestoredTranslation(entry("5元3角"), "5 yuan 3 jiao"), "5 yuan 3 jiao");
  assert.equal(validateRestoredTranslation(entry("60千米/时"), "60 km/h"), "60 km/h");
  assertRejected("5厘米", "5 meters", /measurement units/u);
  assertRejected("5平方米", "5 cubic meters", /measurement units/u);
  assertRejected("2小时20分钟", "2 minutes 20 hours", /measurement units/u);
  assertRejected("500毫升", "500 liters", /measurement units/u);
  assertRejected("3千克", "3 grams", /measurement units/u);
  assertRejected("3℃", "3°F", /measurement units/u);
  assertRejected("5元", "5 dollars", /measurement units/u);
  assertRejected("5元3角", "5 yuan 3 dollars", /measurement units/u);
  assertRejected("60千米/时", "60 meters per second", /measurement units/u);
  assertRejected("1立方厘米", "1 cubic centimeters", /plural noun/u);
  assertRejected("3小时30分钟", "3 hour(s) 30 minute(s)", /parenthetical plural/u);
});

test("all eight Chinese bearings have a canonical English reference axis", () => {
  const bearings = [
    ["东偏北", "north of east"],
    ["东偏南", "south of east"],
    ["西偏北", "north of west"],
    ["西偏南", "south of west"],
    ["北偏东", "east of north"],
    ["北偏西", "west of north"],
    ["南偏东", "east of south"],
    ["南偏西", "west of south"]
  ] as const;
  bearings.forEach(([source, canonical]) => {
    assert.equal(
      validateRestoredTranslation(entry(`${source}30°`), `30° ${canonical}`),
      `30° ${canonical}`
    );
  });
  assertRejected("东偏北30°", "30° east of north", /canonical form/u);
  assertRejected("东偏南25°", "25° east of south", /canonical form/u);
});

test("protection covers every complete numeric literal after math placeholders", () => {
  const sources = ["16-8=8", "7+3=10", "3/4×2/5=3/10", "P(A)=0.2", "x1+x2=2; x1x2=3"];
  sources.forEach((source) => {
    const protection = protectTranslationSource(source);
    const protectedNumbers = protection.tokens
      .filter((token) => token.placeholder.startsWith("ZXQNUM"))
      .map((token) => token.value)
      .sort();
    assert.deepEqual(protectedNumbers, numericTokens(source), source);
    assert.doesNotMatch(protection.protectedSource, /\d/u, source);
    assert.equal(restoreProtectedTranslation(entry(source), protection.protectedSource), source);
    assert.equal(validateTranslation(entry(source), protection.protectedSource), source);
  });

  const source = "16-8=8";
  const protection = protectTranslationSource(source);
  const minusToken = protection.tokens.find((token) => token.value === "-");
  assert.ok(minusToken?.placeholder.startsWith("ZXQMATH"));

  const ordered = Array.from(protection.protectedSource.matchAll(/ZXQMATH[A-Z]+?QXZ/gu), (match) => match[0]);
  assert.ok(ordered.length >= 2);
  const reordered = protection.protectedSource
    .replace(ordered[0], "TEMPORARYTOKEN")
    .replace(ordered[1], ordered[0])
    .replace("TEMPORARYTOKEN", ordered[1]);
  assert.throws(() => restoreProtectedTranslation(entry(source), reordered), /changed order/u);

  assert.deepEqual(mathSymbolTokens("x1+x2=2; x1x2=3"), ["+", "=", "="]);
  assert.deepEqual(mathSymbolTokens("3x4=12"), ["×", "="]);
});

test("provider validation allows prose number reordering but rejects formula corruption", () => {
  const prose = protectTranslationSource("比3多2");
  const three = prose.tokens.find((token) => token.value === "3")?.placeholder;
  const two = prose.tokens.find((token) => token.value === "2")?.placeholder;
  assert.ok(three && two);
  assert.equal(validateTranslation(entry("比3多2"), `${two} more than ${three}`), "2 more than 3");

  const formula = protectTranslationSource("A=3,B=4");
  const formulaThree = formula.tokens.find((token) => token.value === "3")?.placeholder;
  const formulaFour = formula.tokens.find((token) => token.value === "4")?.placeholder;
  assert.ok(formulaThree && formulaFour);
  const swappedFormula = formula.protectedSource
    .replace(formulaThree, "TEMPORARYTOKEN")
    .replace(formulaFour, formulaThree)
    .replace("TEMPORARYTOKEN", formulaFour);
  assert.throws(() => validateTranslation(entry("A=3,B=4"), swappedFormula), /expression structure/u);

  const grouped = protectTranslationSource("(x+1)^2");
  assert.throws(
    () => validateTranslation(entry("(x+1)^2"), grouped.protectedSource.replace("(", "")),
    /unbalanced.*grouping|grouping/u
  );

  const adversarial = ["a₁=3", "1:4", "u·v=0", "x=3"];
  adversarial.forEach((source) => {
    const protection = protectTranslationSource(source);
    const mathToken = protection.tokens.find((token) => token.placeholder.startsWith("ZXQMATH"));
    assert.ok(mathToken, source);
    assert.throws(
      () => validateTranslation(entry(source), protection.protectedSource.replace(mathToken.placeholder, "changed")),
      /protected mathematical tokens|protected token/u,
      source
    );
  });
});
