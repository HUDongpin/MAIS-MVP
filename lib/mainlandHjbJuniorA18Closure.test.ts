import assert from "node:assert/strict";
import test from "node:test";

import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { Question } from "@/types";

const byId = new Map(mainlandHjbJuniorQuestions.map((question) => [question.id, question]));

function question(id: string) {
  const value = byId.get(id);
  assert.ok(value, `Missing HJB Junior A18 closure question ${id}`);
  return value;
}

function gradingQuestion(value: Question) {
  return {
    id: value.id,
    answer: value.answer,
    accepted_answers: value.acceptedAnswers ?? null,
    options: value.options ?? null,
    prompt: value.prompt
  };
}

function simplified(value: Question["prompt"] | NonNullable<Question["options"]>[number] | undefined) {
  return value?.zhHans ?? value?.zh ?? value?.en ?? "";
}

function assertUniqueMc(id: string, expectedIndex: number) {
  const value = question(id);
  assert.equal(value.type, "multiple-choice", `${id} must remain multiple-choice`);
  assert.equal(value.options?.length, 4, `${id} must expose four options`);

  for (const language of ["en", "zh", "zhHans"] as const) {
    const acceptedIndexes: number[] = (value.options ?? []).flatMap((
      option: NonNullable<Question["options"]>[number],
      index: number
    ): number[] => {
      const displayed = language === "zhHans" ? option.zhHans ?? option.zh : option[language];
      return questionAnswerMatches(gradingQuestion(value), displayed) ? [index] : [];
    });
    assert.deepEqual(acceptedIndexes, [expectedIndex], `${id} ${language} production matcher key`);
  }
}

test("s1-367 independently keys the 152-degree ray angle", () => {
  assert.equal(180 - 28, 152);
  const value = question("hjb-junior-ds-v2-s1-367");
  assert.deepEqual(value.options?.map(simplified), ["90°", "118°", "152°", "28°"]);
  assert.equal(value.answer, "152°");
  assertUniqueMc(value.id, 2);
});

test("s3-028 retains exactly one true proportion", () => {
  assert.equal(4 / 9, 6 / 13.5);
  assert.notEqual(4 / 6, 13.5 / 9);
  const value = question("hjb-junior-ds-v2-s3-028");
  assert.deepEqual(value.options?.map(simplified), [
    "a∶b=c∶d",
    "a∶c=d∶b",
    "a∶d=b∶c",
    "b∶c=a∶d"
  ]);
  assert.equal(value.answer, "a∶b=c∶d");
  assertUniqueMc(value.id, 0);
});

test("s3-235 removes the duplicate true vertex statement", () => {
  const vertexX = -2 / (2 * -1);
  const vertexY = -(vertexX ** 2) + 2 * vertexX + 3;
  assert.deepEqual([vertexX, vertexY], [1, 4]);
  const value = question("hjb-junior-ds-v2-s3-235");
  assert.equal(simplified(value.options?.[2]), "C. 图像的顶点坐标为 (-1, 4)");
  assertUniqueMc(value.id, 1);
});

test("s3-367 removes zero as a second secant-distance answer", () => {
  const value = question("hjb-junior-ds-v2-s3-367");
  assert.deepEqual(value.options?.map(simplified), ["5", "4", "3", "6"]);
  assert.equal(value.answer, "3");
  assertUniqueMc(value.id, 2);
});

test("s1-012 simplifies to 11x-squared-y with no xy-squared term", () => {
  assert.equal(4 - (-2 - 5), 11);
  assert.equal(-(3 - 1) + 2, 0);
  const value = question("hjb-junior-ds-v2-s1-012");
  assert.equal(value.answer, "11x²y");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "11x^2y"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "11x²y+4xy²"), false);
});

test("s1-096 polynomial division has quotient 2x-squared-x-3 and remainder -6", () => {
  const dividend = [2, -3, -2, -3];
  const synthetic = [dividend[0]];
  for (let index = 1; index < dividend.length; index += 1) {
    synthetic.push(dividend[index] + synthetic[index - 1]);
  }
  assert.deepEqual(synthetic, [2, -1, -3, -6]);
  const value = question("hjb-junior-ds-v2-s1-096");
  assert.equal(value.answer, "商式为2x²-x-3，余式为-6");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "商式2x^2-x-3，余式-6"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "2x²-x-3"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "-6"), false);
});

test("s2-129 profit threshold includes exactly the integer reductions 0 through 13", () => {
  const profit = (x: number) => (20 - x) * (200 + 10 * x);
  assert.equal(profit(0), 4000);
  assert.equal(profit(1), 3990);
  assert.deepEqual(
    Array.from({ length: 21 }, (_, x) => x).filter((x) => profit(x) >= 2160),
    Array.from({ length: 14 }, (_, x) => x)
  );
  const value = question("hjb-junior-ds-v2-s2-129");
  assert.match(simplified(value.prompt), /非负整数/u);
  assert.equal(
    value.answer,
    "（1）y=4000-10x²，0≤x≤20且x为整数；（2）x=0时，最大利润为4000元；（3）0≤x≤13且x为整数"
  );
  assert.equal(questionAnswerMatches(gradingQuestion(value), "2≤x≤8"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "0≤x≤13"), false);
});

test("s2-186 derives both irrational k values from alpha-squared plus beta-squared", () => {
  const roots = [(-1 + Math.sqrt(13)) / 2, (-1 - Math.sqrt(13)) / 2];
  roots.forEach((k) => assert.ok(Math.abs(2 * k ** 2 + 2 * k + 1 - 7) < 1e-12));
  const value = question("hjb-junior-ds-v2-s2-186");
  assert.equal(value.answer, "（1）Δ=1>0，方程总有两个不相等的实数根；（2）k=(-1±√13)/2");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "k=1或k=-2"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "k=(-1+√13)/2"), false);
});

test("s2-198 proves equal angle-bisector distances and computes 84/11", () => {
  const area = Math.sqrt(27 * 14 * 7 * 6);
  assert.equal(area, 126);
  assert.equal((2 * area) / (13 + 20), 84 / 11);
  const value = question("hjb-junior-ds-v2-s2-198");
  assert.equal(
    value.answer,
    "DE=DF，因为角平分线上的点到角两边的距离相等；DE=DF=84/11"
  );
  assert.equal(questionAnswerMatches(gradingQuestion(value), "DE=DF"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "84/11"), false);
});

test("s2-240 uses the angle-bisector ratio to obtain DE=3", () => {
  assert.equal(8 * 3 / (5 + 3), 3);
  const value = question("hjb-junior-ds-v2-s2-240");
  assert.equal(value.answer, "3");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "3"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "24/7"), false);
});

test("s3-177 computes the corrected profit polynomial and 4500 maximum", () => {
  const profit = (x: number) => (x - 40) * (500 - 5 * x);
  assert.equal(profit(70), 4500);
  const value = question("hjb-junior-ds-v2-s3-177");
  assert.match(simplified(value.prompt), /60≤x≤100/u);
  assert.equal(value.answer, "（1）y=-5x²+700x-20000；（2）售价70元时，最大月利润为4500元");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "2500元"), false);
});

test("s3-192 computes the 2250 profit maximum", () => {
  const profit = (x: number) => (20 - x) * (100 + 10 * x);
  assert.equal(profit(5), 2250);
  const value = question("hjb-junior-ds-v2-s3-192");
  assert.equal(value.answer, "（1）y=-10x²+100x+2000；（2）降价5元时，最大日利润为2250元");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "2025元"), false);
});

test("s3-198 computes the corrected profit polynomial, domain, and maximum", () => {
  const profit = (x: number) => (x - 40) * (500 - 5 * x);
  assert.equal(profit(70), 4500);
  const value = question("hjb-junior-ds-v2-s3-198");
  assert.equal(
    value.answer,
    "（1）y=-5x²+700x-20000，60≤x≤100；（2）售价70元时，最大月利润为4500元"
  );
  assert.equal(questionAnswerMatches(gradingQuestion(value), "500元"), false);
});

test("s3-201 evaluates the translated parabola minimum as -12", () => {
  const translated = (x: number) => -2 * (x - 2) ** 2 + 6;
  assert.deepEqual([translated(2), translated(-1)], [6, -12]);
  const value = question("hjb-junior-ds-v2-s3-201");
  assert.equal(
    value.answer,
    "（1）顶点为(-3,8)，对称轴为x=-3；（2）y=-2(x-2)²+6；（3）最大值为6，最小值为-12"
  );
  assert.equal(questionAnswerMatches(gradingQuestion(value), "最小值为-2"), false);
});

test("s3-321 locates the circumcenter at (3,7/2)", () => {
  const centerY = 7 / 2;
  assert.equal(2 ** 2 + (centerY - 2) ** 2, (centerY - 6) ** 2);
  const value = question("hjb-junior-ds-v2-s3-321");
  assert.equal(value.answer, "圆心为(3,7/2)，因为它是AB与AC的中垂线交点");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "(3,2)"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "(3,7/2)"), false);
});

test("s3-387 identifies the distance to the length-8 chord as 3", () => {
  assert.deepEqual([Math.sqrt(25 - 16), Math.sqrt(25 - 9)], [3, 4]);
  const value = question("hjb-junior-ds-v2-s3-387");
  assert.equal(value.answer, "3");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "3"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "4"), false);
});

test("s3-447 repairs the mistyped score so the intended population variance is 80/11", () => {
  const scores = [68, 72, 76, 70, 68, 74, 72, 76, 70, 72, 74, 68, 76, 72, 70, 74, 68, 72, 76, 70, 74, 72];
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
  assert.equal(mean, 72);
  assert.ok(Math.abs(variance - 80 / 11) < 1e-12);
  assert.equal(variance.toFixed(2), "7.27");
  const value = question("hjb-junior-ds-v2-s3-447");
  assert.match(simplified(value.prompt), /68, 72, 76, 70/u);
  assert.equal(value.answer, "7.27");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "7.27"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "6.95"), false);
});

test("s1-342 fixes the ray side and uniquely determines 100 degrees", () => {
  const value = question("hjb-junior-ds-v2-s1-342");
  assert.match(simplified(value.prompt), /OA、OE位于直线CD两侧/u);
  assert.equal(value.answer, "100°");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "100°"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "20°"), false);
});

test("s2-180 requires both consecutive positive integers", () => {
  const value = question("hjb-junior-ds-v2-s2-180");
  assert.match(simplified(value.prompt), /两个连续正整数的积是72/u);
  assert.equal(value.answer, "8和9");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "8和9"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "9和8"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "8"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "9"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "x(x+1)=72"), false);
});

test("s2-401 states the integer-mass condition required by its linear fee formula", () => {
  const value = question("hjb-junior-ds-v2-s2-401");
  assert.match(simplified(value.prompt), /x为按上述规则取整后的计费重量/u);
  assert.match(simplified(value.prompt), /正整数且x≥1/u);
  assert.equal(value.answer, "y=4x+6");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "y=4x+6"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "4x+6"), false);
});

test("s3-363 adds perpendicularity and uniquely determines tangency", () => {
  const value = question("hjb-junior-ds-v2-s3-363");
  assert.match(simplified(value.prompt), /OP⊥l/u);
  assert.equal(value.answer, "相切");
  assert.equal(questionAnswerMatches(gradingQuestion(value), value.answer), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "相切或相交"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "相交"), false);
});

test("s3-062 rejects the bare concatenated circled-number alias", () => {
  const value = question("hjb-junior-ds-v2-s3-062");
  assert.equal(value.answer, "①②③");
  assert.equal(questionAnswerMatches(gradingQuestion(value), "①②③"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "①,②,③"), true);
  assert.equal(value.acceptedAnswers?.includes("123"), false);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "123"), false);
});

test("s1-342 exposes the approved human English condition and derivation", () => {
  const value = question("hjb-junior-ds-v2-s1-342");
  assert.equal(
    value.prompt.en,
    "On the straight line CD through O, ∠AOC=40° and ∠COE=60°. Rays OA and OE lie on opposite sides of line CD. Find ∠AOE."
  );
  assert.equal(
    value.explanation.en,
    "Because OA and OE lie on opposite sides of line CD, ∠AOE=∠AOC+∠COE=40°+60°=100°."
  );
});

test("s2-180 exposes the approved human English pair contract", () => {
  const value = question("hjb-junior-ds-v2-s2-180");
  assert.equal(
    value.prompt.en,
    "The product of two consecutive positive integers is 72. Find both integers."
  );
  assert.equal(
    value.explanation.en,
    "Let the smaller integer be x. Then x(x+1)=72, so x=8 and the two positive integers are 8 and 9."
  );
  assert.equal(questionAnswerMatches(gradingQuestion(value), "8 and 9"), true);
  assert.equal(questionAnswerMatches(gradingQuestion(value), "9 and 8"), true);
});

test("s2-401 exposes the approved human English billed-weight condition", () => {
  const value = question("hjb-junior-ds-v2-s2-401");
  assert.equal(
    value.prompt.en,
    "A courier charges 10 yuan for the first billed kilogram and 4 yuan for each additional billed kilogram. Let x be the billed weight in kilograms, where x is a positive integer and x≥1, and let y be the total charge in yuan. Write y as a function of x."
  );
  assert.equal(
    value.explanation.en,
    "There are x−1 additional billed kilograms, so y=10+4(x−1)=4x+6."
  );
});

test("s3-363 exposes the approved human English perpendicular-tangent condition", () => {
  const value = question("hjb-junior-ds-v2-s3-363");
  assert.equal(
    value.prompt.en,
    "In ⊙O, the radius is 5. Point P lies on line l, OP=5, and OP is perpendicular to l. Determine the positional relationship between line l and ⊙O."
  );
  assert.equal(
    value.explanation.en,
    "The perpendicular distance from O to l is OP=5, equal to the radius, so line l is tangent to ⊙O at P."
  );
});

const correctedRuntimeIds = [
  "hjb-junior-ds-v2-s1-012",
  "hjb-junior-ds-v2-s1-096",
  "hjb-junior-ds-v2-s1-342",
  "hjb-junior-ds-v2-s1-367",
  "hjb-junior-ds-v2-s2-129",
  "hjb-junior-ds-v2-s2-180",
  "hjb-junior-ds-v2-s2-186",
  "hjb-junior-ds-v2-s2-198",
  "hjb-junior-ds-v2-s2-240",
  "hjb-junior-ds-v2-s2-401",
  "hjb-junior-ds-v2-s3-028",
  "hjb-junior-ds-v2-s3-062",
  "hjb-junior-ds-v2-s3-177",
  "hjb-junior-ds-v2-s3-192",
  "hjb-junior-ds-v2-s3-198",
  "hjb-junior-ds-v2-s3-201",
  "hjb-junior-ds-v2-s3-235",
  "hjb-junior-ds-v2-s3-321",
  "hjb-junior-ds-v2-s3-363",
  "hjb-junior-ds-v2-s3-367",
  "hjb-junior-ds-v2-s3-387",
  "hjb-junior-ds-v2-s3-447"
] as const;

function numericTokens(value: string) {
  return new Set(value.match(/\d+(?:\.\d+)?/gu) ?? []);
}

test("all 22 corrected runtime English surfaces retain the Chinese numeric answer slots without CJK", () => {
  correctedRuntimeIds.forEach((id) => {
    const value = question(id);
    const englishSurface = [
      value.prompt.en,
      value.explanation.en,
      ...(value.options?.map((option) => option.en) ?? [])
    ].join("\n");
    assert.doesNotMatch(englishSurface, /[\u3400-\u9fff]/u, `${id} English must not contain CJK`);

    const requiredNumbers = new Set([
      ...numericTokens(value.prompt.zhHans ?? value.prompt.zh),
      ...numericTokens(value.answer)
    ]);
    const englishNumbers = numericTokens(englishSurface);
    requiredNumbers.forEach((number) => {
      assert.equal(englishNumbers.has(number), true, `${id} English must retain numeric slot ${number}`);
    });
  });
});

test("all 1,500 HJB Junior canonicals and stored aliases self-match", () => {
  assert.equal(mainlandHjbJuniorQuestions.length, 1_500);

  mainlandHjbJuniorQuestions.forEach((value) => {
    assert.equal(
      questionAnswerMatches(gradingQuestion(value), value.answer),
      true,
      `${value.id} canonical must match`
    );
    (value.acceptedAnswers ?? []).forEach((alias) => {
      assert.equal(
        questionAnswerMatches(gradingQuestion(value), alias),
        true,
        `${value.id} stored alias must match: ${alias}`
      );
    });
  });
});

const multipleChoiceQuestions = mainlandHjbJuniorQuestions.filter(
  (value) => value.type === "multiple-choice"
);

test(`all ${multipleChoiceQuestions.length} HJB Junior MC rows have unique options and one matcher hit`, () => {
  multipleChoiceQuestions.forEach((value) => {
    assert.equal(value.options?.length, 4, `${value.id} must expose four options`);

    for (const language of ["en", "zh", "zhHans"] as const) {
      const displayed: string[] = (value.options ?? []).map((
        option: NonNullable<Question["options"]>[number]
      ): string =>
        language === "zhHans" ? option.zhHans ?? option.zh : option[language]
      );
      assert.equal(new Set(displayed).size, 4, `${value.id} ${language} options must be unique`);
      const acceptedIndexes: number[] = displayed.flatMap((option: string, index: number): number[] =>
        questionAnswerMatches(gradingQuestion(value), option) ? [index] : []
      );
      assert.equal(
        acceptedIndexes.length,
        1,
        `${value.id} ${language} must have exactly one matcher hit; got ${acceptedIndexes.join(",")}`
      );
    }
  });
});
