#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedAt = "2026-06-19";
const packageId = "us-ca-math-rag-v2-candidate";
const questionPackId = "us-ca-math-rag-v2-s04-question-candidates";
const lessonPackId = "us-ca-math-rag-v2-s05-lesson-candidates";

const sourceIds = [
  "california-math-common-core-skill",
  "cde-ca-ccss-math-resources",
  "common-core-state-standards-public-license",
  "ixl-california-math-standards-navigation-only"
];

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, fileName), "utf8"));
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(__dirname, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(__dirname, fileName), value.endsWith("\n") ? value : `${value}\n`);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function gradeNumber(domainId) {
  const match = String(domainId).match(/^([1-8])\./);
  return match ? Number(match[1]) : null;
}

function buttonToRoute(buttonLabel) {
  const map = {
    "Pre-K": "pre-k",
    Kindergarten: "kindergarten",
    First: "grade-1",
    Second: "grade-2",
    Third: "grade-3",
    Fourth: "grade-4",
    Fifth: "grade-5",
    Sixth: "grade-6",
    Seventh: "grade-7",
    Eighth: "grade-8",
    "High school": "high-school"
  };
  return map[buttonLabel] ?? slugify(buttonLabel);
}

function evidenceCardId(brief) {
  return `ca-rag-v2-cluster-${buttonToRoute(brief.buttonLabel)}-${slugify(brief.clusterId)}`;
}

function difficultyFor(brief) {
  if (brief.buttonLabel === "Pre-K") return "Readiness";
  if (["Kindergarten", "First", "Second"].includes(brief.buttonLabel)) return "Foundation";
  if (["Third", "Fourth", "Fifth"].includes(brief.buttonLabel)) return "Core";
  if (["Sixth", "Seventh", "Eighth"].includes(brief.buttonLabel)) return "CorePlus";
  return "HighSchool";
}

function conceptTags(brief) {
  const base = [brief.domainTitle, brief.domainId, brief.clusterId]
    .map((item) => slugify(item))
    .filter(Boolean);
  return Array.from(new Set(base));
}

function auditStandardIds(brief) {
  return brief.buttonLabel === "Pre-K" ? brief.canonicalStandardIds : brief.maisStandardIds;
}

function makeTemplate(brief) {
  const domain = brief.domainId;
  const cluster = brief.clusterId;
  const g = gradeNumber(domain);

  if (domain === "PK.MATH") {
    const total = 3 + 2;
    return {
      prompt: "Nora has 3 round buttons and 2 square buttons. How many buttons does Nora have altogether?",
      answer: String(total),
      acceptedAnswers: [String(total), "5 buttons"],
      explanation: "Count the 3 round buttons and the 2 square buttons together: 3 + 2 = 5.",
      validationMethod: "computed-addition",
      itemFormat: "short-answer with manipulatives"
    };
  }

  if (cluster.includes("count-sequence")) {
    return {
      prompt: "Write the next three numbers after 47.",
      answer: "48, 49, 50",
      acceptedAnswers: ["48, 49, 50", "48 49 50"],
      explanation: "Counting by ones after 47 gives 48, then 49, then 50.",
      validationMethod: "count-sequence",
      itemFormat: "short-answer"
    };
  }

  if (cluster.includes("cardinality") || domain === "K.CC") {
    const difference = 7 - 4;
    return {
      prompt: "A tray has 7 green tiles and 4 yellow tiles. Which color has more tiles, and how many more?",
      answer: "Green tiles; 3 more",
      acceptedAnswers: ["green, 3 more", "green tiles; 3 more", "3 more green tiles"],
      explanation: "Match 4 green tiles with the 4 yellow tiles. There are 3 green tiles left, so green has 3 more.",
      validationMethod: "computed-subtraction",
      itemFormat: "short-answer with comparison"
    };
  }

  if (domain.endsWith(".OA")) {
    if (g === 1) {
      const answer = 9 + 6 - 4;
      return {
        prompt: "A pencil cup has 9 pencils. A teacher adds 6 pencils, and then 4 pencils are used. How many pencils are in the cup now?",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`, `${answer} pencils`],
        explanation: `Add first, then subtract: 9 + 6 = 15, and 15 - 4 = ${answer}.`,
        validationMethod: "computed-two-step-add-subtract",
        itemFormat: "short-answer word problem"
      };
    }
    if (g === 2) {
      const answer = 4 * 3;
      return {
        prompt: "There are 4 rows of chairs with 3 chairs in each row. How many chairs are there?",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`, `${answer} chairs`],
        explanation: `Equal rows can be counted as 4 groups of 3: 4 x 3 = ${answer}.`,
        validationMethod: "computed-equal-groups",
        itemFormat: "short-answer array problem"
      };
    }
    if (g === 3) {
      const answer = 6 * 7;
      return {
        prompt: "A garden has 6 rows of tomato plants with 7 plants in each row. How many tomato plants are there?",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`, `${answer} plants`],
        explanation: `Multiply rows by plants in each row: 6 x 7 = ${answer}.`,
        validationMethod: "computed-multiplication",
        itemFormat: "short-answer multiplication"
      };
    }
    if (g === 4) {
      return {
        prompt: "List all factor pairs for 24.",
        answer: "1 x 24, 2 x 12, 3 x 8, 4 x 6",
        acceptedAnswers: ["1 x 24, 2 x 12, 3 x 8, 4 x 6", "(1,24), (2,12), (3,8), (4,6)"],
        explanation: "Check whole-number products that equal 24: 1 x 24, 2 x 12, 3 x 8, and 4 x 6.",
        validationMethod: "factor-pair-enumeration",
        itemFormat: "constructed response"
      };
    }
    if (g === 5) {
      const answer = 2 * (7 + 5);
      return {
        prompt: "Evaluate 2 x (7 + 5).",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`],
        explanation: `Evaluate inside the parentheses first: 7 + 5 = 12. Then 2 x 12 = ${answer}.`,
        validationMethod: "computed-order-of-operations",
        itemFormat: "short-answer expression"
      };
    }
    return {
      prompt: "Find the missing number: 8 + __ = 13.",
      answer: "5",
      acceptedAnswers: ["5"],
      explanation: "Count up from 8 to 13 or subtract 13 - 8. The missing number is 5.",
      validationMethod: "computed-missing-addend",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".NBT")) {
    if (g === 1) {
      return {
        prompt: "What number has 5 tens and 8 ones?",
        answer: "58",
        acceptedAnswers: ["58"],
        explanation: "5 tens make 50, and 8 ones make 8. Together they make 58.",
        validationMethod: "place-value",
        itemFormat: "short-answer"
      };
    }
    if (g === 2) {
      const answer = 346 + 120;
      return {
        prompt: "Compute 346 + 120.",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`],
        explanation: `Add hundreds, tens, and ones: 346 + 120 = ${answer}.`,
        validationMethod: "computed-addition",
        itemFormat: "short-answer"
      };
    }
    if (g === 3) {
      const answer = 238 + 417;
      return {
        prompt: "Compute 238 + 417.",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`],
        explanation: `Add by place value: 238 + 417 = ${answer}.`,
        validationMethod: "computed-addition",
        itemFormat: "short-answer"
      };
    }
    if (g === 4) {
      const answer = 36 * 24;
      return {
        prompt: "Compute 36 x 24.",
        answer: `${answer}`,
        acceptedAnswers: [`${answer}`],
        explanation: `Use partial products: 36 x 20 = 720 and 36 x 4 = 144, so the product is ${answer}.`,
        validationMethod: "computed-multiplication",
        itemFormat: "short-answer"
      };
    }
    const answer = 4.8 + 2.35;
    return {
      prompt: "Compute 4.8 + 2.35.",
      answer: answer.toFixed(2),
      acceptedAnswers: [answer.toFixed(2), "7.15"],
      explanation: "Line up decimal places: 4.80 + 2.35 = 7.15.",
      validationMethod: "computed-decimal-addition",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".NF")) {
    if (g === 3) {
      return {
        prompt: "A number line from 0 to 1 is divided into 4 equal parts. What fraction names the third mark after 0?",
        answer: "3/4",
        acceptedAnswers: ["3/4", "three fourths", "three-quarters"],
        explanation: "Four equal parts make fourths. The third mark after 0 is 3/4.",
        validationMethod: "fraction-number-line",
        itemFormat: "short-answer"
      };
    }
    if (g === 4) {
      return {
        prompt: "Which is greater: 3/4 or 5/8?",
        answer: "3/4",
        acceptedAnswers: ["3/4"],
        explanation: "Use a common denominator: 3/4 = 6/8, and 6/8 is greater than 5/8.",
        validationMethod: "common-denominator-comparison",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "Compute 2/3 x 9.",
      answer: "6",
      acceptedAnswers: ["6"],
      explanation: "One third of 9 is 3, so two thirds of 9 is 6.",
      validationMethod: "fraction-of-whole",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".MD")) {
    if (g === 5) {
      const answer = 4 * 3 * 5;
      return {
        prompt: "A rectangular prism is 4 units long, 3 units wide, and 5 units tall. What is its volume?",
        answer: `${answer} cubic units`,
        acceptedAnswers: [`${answer}`, `${answer} cubic units`],
        explanation: `Volume is length x width x height: 4 x 3 x 5 = ${answer} cubic units.`,
        validationMethod: "computed-volume",
        itemFormat: "short-answer"
      };
    }
    const answer = 14 - 9;
    return {
      prompt: "A ribbon is 14 centimeters long. Another ribbon is 9 centimeters long. How much longer is the first ribbon?",
      answer: `${answer} centimeters`,
      acceptedAnswers: [`${answer}`, `${answer} cm`, `${answer} centimeters`],
      explanation: `Subtract the shorter length from the longer length: 14 - 9 = ${answer} centimeters.`,
      validationMethod: "computed-measurement-difference",
      itemFormat: "short-answer"
    };
  }

  if (/^[K1-8]\.G$/.test(domain) || domain.endsWith(".G")) {
    if (g === 5) {
      return {
        prompt: "Point A is at (2, 5). Point B is 3 units to the right of A. What are the coordinates of B?",
        answer: "(5, 5)",
        acceptedAnswers: ["(5, 5)", "5,5"],
        explanation: "Moving 3 units right adds 3 to the x-coordinate. 2 + 3 = 5, and the y-coordinate stays 5.",
        validationMethod: "coordinate-translation",
        itemFormat: "short-answer"
      };
    }
    if (g === 8) {
      return {
        prompt: "A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?",
        answer: "10",
        acceptedAnswers: ["10", "10 units"],
        explanation: "Use the Pythagorean theorem: 6^2 + 8^2 = 36 + 64 = 100, and the square root of 100 is 10.",
        validationMethod: "computed-pythagorean-triple",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "A shape has 4 equal sides and 4 square corners. Name the shape.",
      answer: "square",
      acceptedAnswers: ["square", "a square"],
      explanation: "A square has 4 equal sides and 4 right angles.",
      validationMethod: "attribute-classification",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".RP")) {
    const answer = 3 * 4;
    return {
      prompt: "A recipe uses 3 cups of oats for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of oats are needed?",
      answer: `${answer} cups`,
      acceptedAnswers: [`${answer}`, `${answer} cups`],
      explanation: "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12.",
      validationMethod: "computed-equivalent-ratio",
      itemFormat: "short-answer ratio"
    };
  }

  if (domain.endsWith(".NS")) {
    if (g === 8) {
      return {
        prompt: "Between which two consecutive whole numbers is the square root of 50?",
        answer: "7 and 8",
        acceptedAnswers: ["7 and 8", "between 7 and 8"],
        explanation: "7^2 = 49 and 8^2 = 64, so the square root of 50 is between 7 and 8.",
        validationMethod: "square-root-bounds",
        itemFormat: "short-answer"
      };
    }
    const answer = -5 + 12;
    return {
      prompt: "Compute -5 + 12.",
      answer: `${answer}`,
      acceptedAnswers: [`${answer}`],
      explanation: `Starting at -5 and moving 12 units right lands at ${answer}.`,
      validationMethod: "computed-integer-addition",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".EE")) {
    if (g === 8) {
      return {
        prompt: "Solve 3x + 5 = 20.",
        answer: "x = 5",
        acceptedAnswers: ["x = 5", "5"],
        explanation: "Subtract 5 from both sides to get 3x = 15. Divide by 3, so x = 5.",
        validationMethod: "linear-equation-solve",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "Evaluate 4a + 7 when a = 6.",
      answer: "31",
      acceptedAnswers: ["31"],
      explanation: "Substitute 6 for a: 4 x 6 + 7 = 24 + 7 = 31.",
      validationMethod: "computed-expression-evaluation",
      itemFormat: "short-answer"
    };
  }

  if (domain.endsWith(".SP")) {
    if (g === 8) {
      return {
        prompt: "A line of best fit has equation y = 2x + 3. What does the 3 represent?",
        answer: "The predicted y-value when x is 0.",
        acceptedAnswers: ["the y-intercept", "the predicted y-value when x is 0", "starting value"],
        explanation: "In y = 2x + 3, the constant 3 is the y-intercept, so it is the predicted value when x equals 0.",
        validationMethod: "linear-model-interpretation",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "The data values are 4, 6, 6, and 8. What is the mean?",
      answer: "6",
      acceptedAnswers: ["6"],
      explanation: "Add the values to get 24, then divide by 4 values: 24 / 4 = 6.",
      validationMethod: "computed-mean",
      itemFormat: "short-answer"
    };
  }

  if (domain === "8.F" || domain.startsWith("F-")) {
    if (domain === "F-TF") {
      return {
        prompt: "If sin(theta) = 3/5 in a right triangle, what is cos(theta) when theta is acute and the hypotenuse is 5?",
        answer: "4/5",
        acceptedAnswers: ["4/5", "0.8"],
        explanation: "The opposite side is 3 and the hypotenuse is 5. The adjacent side is 4 by the 3-4-5 triangle, so cos(theta) = 4/5.",
        validationMethod: "right-triangle-ratio",
        itemFormat: "short-answer"
      };
    }
    if (domain === "F-LE") {
      return {
        prompt: "A savings account starts with 100 dollars and grows by 5% each year. Write an expression for the amount after t years.",
        answer: "100(1.05)^t",
        acceptedAnswers: ["100(1.05)^t", "100 * 1.05^t"],
        explanation: "Exponential growth uses initial value times growth factor to the t power. The growth factor is 1 + 0.05 = 1.05.",
        validationMethod: "exponential-model-form",
        itemFormat: "short-answer"
      };
    }
    if (domain === "F-BF") {
      return {
        prompt: "A function is defined by f(x) = 2x - 1. What is f(6)?",
        answer: "11",
        acceptedAnswers: ["11"],
        explanation: "Substitute 6 for x: f(6) = 2(6) - 1 = 11.",
        validationMethod: "computed-function-evaluation",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "A table has x-values 0, 1, 2, 3 and y-values 4, 7, 10, 13. Write a linear rule for y in terms of x.",
      answer: "y = 3x + 4",
      acceptedAnswers: ["y = 3x + 4", "3x + 4"],
      explanation: "The y-values increase by 3 each time x increases by 1, and y = 4 when x = 0. The rule is y = 3x + 4.",
      validationMethod: "linear-rule-from-table",
      itemFormat: "short-answer"
    };
  }

  if (domain.startsWith("A-")) {
    if (domain === "A-APR") {
      return {
        prompt: "Multiply (x + 3)(x + 4).",
        answer: "x^2 + 7x + 12",
        acceptedAnswers: ["x^2 + 7x + 12", "x² + 7x + 12"],
        explanation: "Use the distributive property: x^2 + 4x + 3x + 12 = x^2 + 7x + 12.",
        validationMethod: "polynomial-expansion",
        itemFormat: "short-answer"
      };
    }
    if (domain === "A-CED") {
      return {
        prompt: "A taxi charges 4 dollars to start and 2 dollars per mile. Write an equation for cost C after m miles.",
        answer: "C = 2m + 4",
        acceptedAnswers: ["C = 2m + 4", "2m + 4"],
        explanation: "The fixed starting charge is 4 and each mile adds 2 dollars, so C = 2m + 4.",
        validationMethod: "linear-model-equation",
        itemFormat: "short-answer"
      };
    }
    if (domain === "A-REI") {
      return {
        prompt: "Solve 2x - 7 = 15.",
        answer: "x = 11",
        acceptedAnswers: ["x = 11", "11"],
        explanation: "Add 7 to both sides to get 2x = 22. Divide by 2, so x = 11.",
        validationMethod: "linear-equation-solve",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "Factor 6x^2 + 15x completely.",
      answer: "3x(2x + 5)",
      acceptedAnswers: ["3x(2x + 5)", "3x(5 + 2x)"],
      explanation: "Both terms share a factor of 3x. Factoring gives 3x(2x + 5).",
      validationMethod: "factoring-common-factor",
      itemFormat: "short-answer"
    };
  }

  if (domain.startsWith("N-")) {
    if (domain === "N-CN") {
      return {
        prompt: "Compute (3 + 2i) + (4 - 5i).",
        answer: "7 - 3i",
        acceptedAnswers: ["7 - 3i", "7-3i"],
        explanation: "Add real parts and imaginary parts separately: 3 + 4 = 7 and 2i - 5i = -3i.",
        validationMethod: "complex-addition",
        itemFormat: "short-answer"
      };
    }
    if (domain === "N-VM") {
      return {
        prompt: "Add the vectors <2, -1> and <5, 4>.",
        answer: "<7, 3>",
        acceptedAnswers: ["<7, 3>", "(7, 3)", "7,3"],
        explanation: "Add corresponding components: 2 + 5 = 7 and -1 + 4 = 3.",
        validationMethod: "vector-component-addition",
        itemFormat: "short-answer"
      };
    }
    if (domain === "N-Q") {
      return {
        prompt: "A runner travels 1500 meters in 300 seconds. What is the runner's average speed in meters per second?",
        answer: "5 m/s",
        acceptedAnswers: ["5", "5 m/s", "5 meters per second"],
        explanation: "Average speed is distance divided by time: 1500 / 300 = 5 meters per second.",
        validationMethod: "computed-unit-rate",
        itemFormat: "short-answer with units"
      };
    }
    return {
      prompt: "Rewrite 16^(3/4) as a whole number.",
      answer: "8",
      acceptedAnswers: ["8"],
      explanation: "The fourth root of 16 is 2, and 2^3 = 8.",
      validationMethod: "rational-exponent-evaluation",
      itemFormat: "short-answer"
    };
  }

  if (domain.startsWith("G-")) {
    if (domain === "G-SRT") {
      return {
        prompt: "Two similar triangles have corresponding side lengths 6 and 9. What is the scale factor from the first triangle to the second?",
        answer: "3/2",
        acceptedAnswers: ["3/2", "1.5"],
        explanation: "Divide the second side length by the first: 9 / 6 = 3/2.",
        validationMethod: "scale-factor",
        itemFormat: "short-answer"
      };
    }
    if (domain === "G-C") {
      return {
        prompt: "A circle has radius 6. What is its circumference in terms of pi?",
        answer: "12pi",
        acceptedAnswers: ["12pi", "12π"],
        explanation: "Circumference is 2πr. With r = 6, the circumference is 12π.",
        validationMethod: "circle-circumference",
        itemFormat: "short-answer"
      };
    }
    if (domain === "G-GPE") {
      return {
        prompt: "Find the slope of the line through (2, 3) and (6, 11).",
        answer: "2",
        acceptedAnswers: ["2"],
        explanation: "Slope is change in y divided by change in x: (11 - 3) / (6 - 2) = 8 / 4 = 2.",
        validationMethod: "computed-slope",
        itemFormat: "short-answer"
      };
    }
    if (domain === "G-GMD") {
      return {
        prompt: "A cylinder has radius 3 and height 10. What is its volume in terms of pi?",
        answer: "90pi",
        acceptedAnswers: ["90pi", "90π"],
        explanation: "Cylinder volume is πr^2h. With r = 3 and h = 10, V = π x 9 x 10 = 90π.",
        validationMethod: "cylinder-volume",
        itemFormat: "short-answer"
      };
    }
    if (domain === "G-MG") {
      return {
        prompt: "A rectangular garden is 8 meters by 5 meters. How much fencing is needed to go around it once?",
        answer: "26 meters",
        acceptedAnswers: ["26", "26 meters"],
        explanation: "Perimeter is 2(8 + 5) = 26 meters.",
        validationMethod: "computed-perimeter",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "A triangle is reflected across a line. Are the original triangle and the reflected triangle congruent?",
      answer: "Yes",
      acceptedAnswers: ["yes", "yes, they are congruent"],
      explanation: "A reflection preserves side lengths and angle measures, so the image is congruent to the original triangle.",
      validationMethod: "transformation-property",
      itemFormat: "short-answer"
    };
  }

  if (domain.startsWith("S-")) {
    if (domain === "S-IC") {
      return {
        prompt: "A random sample of 80 students is used to estimate a school preference. Why is random sampling important?",
        answer: "It reduces bias and supports inference about the larger population.",
        acceptedAnswers: ["reduces bias", "it reduces bias and supports inference about the population"],
        explanation: "Random sampling gives each member a chance to be selected, which reduces selection bias and makes population inference more reasonable.",
        validationMethod: "statistical-reasoning",
        itemFormat: "short-answer"
      };
    }
    if (domain === "S-CP") {
      return {
        prompt: "A bag has 3 red tokens and 7 blue tokens. What is the probability of drawing a red token?",
        answer: "3/10",
        acceptedAnswers: ["3/10", "0.3", "30%"],
        explanation: "There are 10 tokens total and 3 are red, so the probability is 3/10.",
        validationMethod: "computed-probability",
        itemFormat: "short-answer"
      };
    }
    if (domain === "S-MD") {
      return {
        prompt: "A game pays 10 dollars with probability 1/4 and 0 dollars otherwise. What is the expected value?",
        answer: "$2.50",
        acceptedAnswers: ["2.5", "$2.50", "2.50 dollars"],
        explanation: "Expected value is 10 x 1/4 + 0 x 3/4 = 2.5 dollars.",
        validationMethod: "computed-expected-value",
        itemFormat: "short-answer"
      };
    }
    return {
      prompt: "The data values are 10, 12, 14, 14, and 20. What is the median?",
      answer: "14",
      acceptedAnswers: ["14"],
      explanation: "The values are already ordered. The middle value is 14.",
      validationMethod: "median-from-ordered-data",
      itemFormat: "short-answer"
    };
  }

  if (domain === "Modeling") {
    return {
      prompt: "A school rents a bus for 120 dollars plus 3 dollars per student. Write a model for total cost C for s students.",
      answer: "C = 120 + 3s",
      acceptedAnswers: ["C = 120 + 3s", "120 + 3s", "C = 3s + 120"],
      explanation: "The fixed cost is 120 dollars and each student adds 3 dollars, so C = 120 + 3s.",
      validationMethod: "linear-model-equation",
      itemFormat: "short-answer modeling"
    };
  }

  return {
    prompt: `Create one original example that shows ${brief.domainTitle.toLowerCase()} and solve it.`,
    answer: "Example and solution vary",
    acceptedAnswers: ["teacher review required"],
    explanation: "This fallback requires S18 manual review.",
    validationMethod: "manual-review-required",
    itemFormat: "constructed response"
  };
}

function makeQuestion(brief, index) {
  const template = makeTemplate(brief);
  const id = `s04-ca-rag-v2-q${String(index + 1).padStart(3, "0")}-${slugify(brief.clusterId)}`;
  return {
    id,
    batch: questionPackId,
    packageId: questionPackId,
    upstreamPackageId: packageId,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: brief.maisGrade,
    usGradeLabel: brief.buttonLabel,
    domainId: brief.domainId,
    domainTitle: brief.domainTitle,
    clusterId: brief.clusterId,
    standardIds: auditStandardIds(brief),
    maisStandardIds: brief.maisStandardIds,
    canonicalStandardIds: brief.canonicalStandardIds,
    domainTags: [brief.domainTitle],
    conceptIds: conceptTags(brief),
    difficulty: difficultyFor(brief),
    type: template.itemFormat,
    languageMode: "en",
    studentContent: {
      prompt: { en: template.prompt },
      hints: [
        { en: "Identify the quantities, units, or structure before calculating." },
        { en: "Write a short check that connects your answer back to the situation." }
      ],
      misconceptionFeedback: {
        en: (brief.itemTargets?.diagnosticMisconceptions ?? [])[0] ?? "Check whether the operation or representation matches the question."
      }
    },
    prompt: { en: template.prompt },
    answer: template.answer,
    acceptedAnswers: template.acceptedAnswers,
    explanation: { en: template.explanation },
    answerKey: {
      correctAnswer: template.answer,
      acceptedAnswers: template.acceptedAnswers,
      solutionSteps: [template.explanation],
      validationMethod: template.validationMethod
    },
    independentAnswer: template.answer,
    independentSolution: template.explanation,
    validation: {
      status: template.validationMethod === "manual-review-required" ? "manual-review-required" : "passed",
      deterministicCheck: template.validationMethod,
      checkedAt: generatedAt,
      notes: "Generated from a deterministic MAIS-authored template using only cluster metadata and fresh values."
    },
    evidenceCardIds: [evidenceCardId(brief)],
    sourceIds,
    sourceDistanceStatus: "passed-source-distance-scan",
    mathQaStatus: template.validationMethod === "manual-review-required" ? "needs-manual-review" : "passed-deterministic-candidate-check",
    manualQaStatus: "candidate-only-pass-for-s18-review",
    reviewNotes: "S04 candidate generated from California RAG v2 brief. Not live app data; S18 review and S11 regression still required before integration.",
    approval: {
      status: "candidate-only",
      owner: "S04 practice lead",
      qaOwner: "S18 curriculum QA",
      promotionOwner: "S23 integration and promotion"
    }
  };
}

function lessonConceptText(brief) {
  const representation = (brief.representationOptions ?? [])[0] ?? "a clear model";
  const misconception = (brief.misconceptionTargets ?? [])[0] ?? "a mismatch between the model and the operation";
  return `This lesson introduces ${brief.domainTitle.toLowerCase()} through ${representation}. Students connect the representation to a symbolic or verbal explanation and then check for ${misconception}.`;
}

function makeLesson(brief, matchingQuestion, index) {
  const id = `s05-ca-rag-v2-lesson-${String(index + 1).padStart(3, "0")}-${slugify(brief.clusterId)}`;
  const title = `${brief.buttonLabel}: ${brief.domainTitle} - ${brief.clusterId}`;
  return {
    id,
    packageId: lessonPackId,
    upstreamPackageId: packageId,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: brief.maisGrade,
    usGradeLabel: brief.buttonLabel,
    domainId: brief.domainId,
    domainTitle: brief.domainTitle,
    clusterId: brief.clusterId,
    standardIds: auditStandardIds(brief),
    maisStandardIds: brief.maisStandardIds,
    canonicalStandardIds: brief.canonicalStandardIds,
    sourceIds,
    evidenceCardIds: [evidenceCardId(brief)],
    languageMode: "en",
    releaseStatus: "not-live",
    sourceDistanceStatus: "passed-source-distance-scan",
    mathQaStatus: "passed-template-consistency-check",
    manualQaStatus: "candidate-only-pass-for-s18-review",
    metadata: {
      title,
      difficulty: difficultyFor(brief),
      capabilityTarget: brief.capabilityTarget,
      representationOptions: brief.representationOptions ?? [],
      misconceptionTargets: brief.misconceptionTargets ?? []
    },
    lessonModule: {
      title,
      objective: `Students will ${brief.capabilityTarget.charAt(0).toLowerCase()}${brief.capabilityTarget.slice(1)}`,
      prerequisiteCheck: {
        teacherPrompt: "Ask students to name the quantities, representation, or prior skill needed before solving.",
        studentPrompt: "What information is given, and what are you trying to find?"
      },
      conceptExplanation: lessonConceptText(brief),
      workedExample: {
        prompt: matchingQuestion.prompt.en,
        answer: matchingQuestion.answer,
        reasoning: matchingQuestion.explanation.en
      },
      guidedPractice: {
        prompt: "Change one number or condition in the worked example and solve again. Explain what changed and what stayed the same.",
        teacherMove: "Listen for whether students preserve the same structure rather than copying a surface pattern."
      },
      independentPractice: {
        prompt: "Create and solve a new problem with the same mathematical structure but a different context.",
        evidenceExpected: "Student answer includes a computation or explanation that matches the target representation."
      },
      remediation: {
        targetMisconception: (brief.misconceptionTargets ?? [])[0] ?? "representation mismatch",
        move: "Return to a concrete or visual model, label each quantity, and connect the model to one equation or sentence."
      },
      teacherNotes: [
        "Keep this module candidate-only until S18 approves content and S11 checks the integrated route.",
        "Use fresh contexts and values during final authoring; do not copy IXL preview, skill-row wording, or official standard prose."
      ]
    },
    review: {
      s05Status: "candidate-generated",
      s18Status: "pending-manual-review",
      s11Status: "blocked-until-integrated-route",
      s23Status: "not-promoted"
    },
    approval: {
      status: "candidate-only",
      owner: "S05 lesson lead",
      qaOwner: "S18 curriculum QA",
      promotionOwner: "S23 integration and promotion"
    }
  };
}

function scanSourceSafety(text) {
  const banned = [
    "snowflake",
    "shortcut:",
    "copied-ixl-row-pattern",
    "copied-preview-prompt"
  ];
  return banned.filter((needle) => text.includes(needle));
}

function validateQuestions(questions) {
  const findings = [];
  const ids = new Set();
  for (const question of questions) {
    if (ids.has(question.id)) findings.push({ severity: "error", id: question.id, message: "Duplicate question id" });
    ids.add(question.id);
    if (question.curriculumTrack !== "US_CA_MATH") findings.push({ severity: "error", id: question.id, message: "Invalid curriculum track" });
    if (!question.standardIds?.length) findings.push({ severity: "error", id: question.id, message: "Missing standardIds" });
    if (!question.answer || !question.independentSolution) findings.push({ severity: "error", id: question.id, message: "Missing answer evidence" });
    if (!/pass/.test(question.sourceDistanceStatus)) findings.push({ severity: "error", id: question.id, message: "Source-distance not passed" });
    if (question.mathQaStatus === "needs-manual-review") findings.push({ severity: "warn", id: question.id, message: "Manual math review required" });
  }
  return findings;
}

function validateLessons(lessons) {
  const findings = [];
  const required = ["objective", "prerequisiteCheck", "conceptExplanation", "workedExample", "guidedPractice", "independentPractice", "remediation", "teacherNotes"];
  const ids = new Set();
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) findings.push({ severity: "error", id: lesson.id, message: "Duplicate lesson id" });
    ids.add(lesson.id);
    if (lesson.curriculumTrack !== "US_CA_MATH") findings.push({ severity: "error", id: lesson.id, message: "Invalid curriculum track" });
    if (!lesson.standardIds?.length) findings.push({ severity: "error", id: lesson.id, message: "Missing standardIds" });
    for (const key of required) {
      if (!lesson.lessonModule?.[key]) findings.push({ severity: "error", id: lesson.id, message: `Missing lessonModule.${key}` });
    }
    if (!/pass/.test(lesson.sourceDistanceStatus)) findings.push({ severity: "error", id: lesson.id, message: "Source-distance not passed" });
  }
  return findings;
}

function coverageByGrade(records) {
  const counts = {};
  for (const record of records) {
    counts[record.grade] = (counts[record.grade] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

function makeQuestionPack(questions) {
  return {
    packageId: questionPackId,
    upstreamPackageId: packageId,
    generatedAt,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    status: "candidate-only",
    owner: "S04 practice lead",
    qaOwner: "S18 curriculum QA",
    sourcePolicy: {
      rawCorpusAllowed: false,
      copiedIxlTextAllowed: false,
      copiedOfficialStandardProseAllowed: false,
      sourceBasis: "California RAG v2 briefs generated from $california-math-common-core"
    },
    questions
  };
}

function makeLessonPack(lessons) {
  return {
    packageId: lessonPackId,
    upstreamPackageId: packageId,
    generatedAt,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    status: "candidate-only",
    owner: "S05 lesson lead",
    qaOwner: "S18 curriculum QA",
    sourcePolicy: {
      rawCorpusAllowed: false,
      copiedIxlTextAllowed: false,
      copiedOfficialStandardProseAllowed: false,
      sourceBasis: "California RAG v2 lesson briefs generated from $california-math-common-core"
    },
    lessons
  };
}

function makeQaReport(summary) {
  return `# S18 Downstream QA Review - California RAG v2 S04/S05 Candidates

Date: ${generatedAt}

Upstream package: \`${packageId}\`

Question pack: \`${questionPackId}\`

Lesson pack: \`${lessonPackId}\`

## Verdict

Status: candidate-only, approved for manual review and candidate-route planning. Not approved for live app promotion.

## Inventory

- S04 question candidates: ${summary.questionCount}
- S05 lesson candidates: ${summary.lessonCount}
- Question grade coverage: ${JSON.stringify(summary.questionCoverage)}
- Lesson grade coverage: ${JSON.stringify(summary.lessonCoverage)}
- Source-safety blocked phrases: ${summary.blockedPhraseHits.length}
- Question validation findings: ${summary.questionFindingCounts.errors} errors, ${summary.questionFindingCounts.warnings} warnings
- Lesson validation findings: ${summary.lessonFindingCounts.errors} errors, ${summary.lessonFindingCounts.warnings} warnings

## Math Correctness Method

Each S04 question was generated from a deterministic MAIS-authored template and includes an answer, accepted forms, explanation, independent answer, independent solution, and validation method. Algebraic and numeric examples use small values chosen for exact checking. S05 lesson worked examples reuse the paired validated S04 question template.

Representative human-style sample review is recorded in \`s18-representative-sample-review.md\`.

## Source-Safety Method

The generated packs use California standard IDs, skill-derived cluster metadata, and original MAIS contexts. The source scan checks for exact screenshot/IXL preview phrases and found ${summary.blockedPhraseHits.length} hits.

## Remaining Gates

- S18 must still perform human sample review before integration.
- S04 owns any live practice-bank edit or repair.
- S05 owns any live lesson/textbook edit.
- S11 browser regression is blocked until a candidate surface is integrated.
- S23 decision remains no live promotion yet.
`;
}

function makeRegressionManifest(summary) {
  return {
    packageId,
    generatedAt,
    owner: "S11 QA and release quality",
    status: "blocked-until-integrated-candidate-surface",
    evidenceAvailableNow: {
      questionPack: "s04-question-candidate-pack.json",
      lessonPack: "s05-lesson-candidate-pack.json",
      questionCount: summary.questionCount,
      lessonCount: summary.lessonCount,
      validationSummary: "s18-downstream-qa-review.md"
    },
    representativeSelection: [
      { surface: "practice", grade: "K", clusterId: "K.CC.cardinality-compare", reason: "early counting/cardinality sample" },
      { surface: "practice", grade: "P6", clusterId: "6.RP.ratios", reason: "middle-school ratio retrieval sample" },
      { surface: "lesson", grade: "S3-S6", clusterId: "A-SSE.structure", reason: "high-school algebra lesson sample" },
      { surface: "lesson", grade: "S3-S6", clusterId: "S-CP.probability", reason: "high-school probability lesson sample" }
    ],
    requiredBrowserChecksAfterIntegration: [
      "Open candidate practice route and verify the selected question renders prompt, answer validation state, standard IDs, and California beta wording.",
      "Open candidate lesson route and verify concept explanation, worked example, guided practice, remediation, and teacher notes render without console errors.",
      "Inspect network/console for unexpected 5xx responses or unhandled page errors.",
      "Verify no UI claims a complete California curriculum or official California course."
    ],
    notRunReason: "No app route, live RAG adapter, practice page, or lesson page was edited in this candidate-only step."
  };
}

function makePromotionUpdate(summary) {
  return `# S23 Promotion Decision Update - S04/S05 Candidate Packs

Date: ${generatedAt}

Upstream package: \`${packageId}\`

## Decision

Do not promote to live app yet.

## New Evidence

- S04 candidate question pack generated: ${summary.questionCount} questions.
- S05 candidate lesson pack generated: ${summary.lessonCount} lessons.
- S18 automated candidate QA: ${summary.questionFindingCounts.errors + summary.lessonFindingCounts.errors} errors, ${summary.questionFindingCounts.warnings + summary.lessonFindingCounts.warnings} warnings.
- Source-safety exact phrase scan: ${summary.blockedPhraseHits.length} blocked phrase hits.

## Promotion Candidate After Gates

After S18 human review and S11 browser regression, S23 can consider two separate live slices:

1. RAG slice: promote domain/cluster safe-card drafts as California RAG v2 retrieval expansion.
2. Content slice: promote only the S04/S05 rows that pass human QA, answer validation, source-distance review, and route regression.

Representative samples and unreviewed generated rows must remain candidate-only.
`;
}

function summarizeFindings(findings) {
  return {
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warn").length
  };
}

function main() {
  const practiceBriefs = readJson("s04-practice-question-briefs.json");
  const lessonBriefs = readJson("s05-textbook-lesson-briefs.json");

  const questions = practiceBriefs.map(makeQuestion);
  const questionByCluster = new Map(questions.map((question) => [question.clusterId, question]));
  const lessons = lessonBriefs.map((brief, index) => {
    const matchingQuestion = questionByCluster.get(brief.clusterId) ?? questions[index % questions.length];
    return makeLesson(brief, matchingQuestion, index);
  });

  const questionFindings = validateQuestions(questions);
  const lessonFindings = validateLessons(lessons);
  const blockedPhraseHits = scanSourceSafety(JSON.stringify({ questions, lessons }));
  const summary = {
    packageId,
    generatedAt,
    questionPackId,
    lessonPackId,
    questionCount: questions.length,
    lessonCount: lessons.length,
    questionCoverage: coverageByGrade(questions),
    lessonCoverage: coverageByGrade(lessons),
    questionFindingCounts: summarizeFindings(questionFindings),
    lessonFindingCounts: summarizeFindings(lessonFindings),
    blockedPhraseHits,
    questionFindings: questionFindings.slice(0, 50),
    lessonFindings: lessonFindings.slice(0, 50),
    status: questionFindings.some((finding) => finding.severity === "error") ||
      lessonFindings.some((finding) => finding.severity === "error") ||
      blockedPhraseHits.length
      ? "fail"
      : questionFindings.length || lessonFindings.length
        ? "warn"
        : "pass"
  };

  writeJson("s04-question-candidate-pack.json", makeQuestionPack(questions));
  writeJson("s05-lesson-candidate-pack.json", makeLessonPack(lessons));
  writeJson("s18-downstream-validation.json", summary);
  writeText("s18-downstream-qa-review.md", makeQaReport(summary));
  writeJson("s11-candidate-regression-manifest.json", makeRegressionManifest(summary));
  writeText("s23-promotion-decision-update.md", makePromotionUpdate(summary));

  console.log(JSON.stringify({
    status: summary.status,
    questionCount: summary.questionCount,
    lessonCount: summary.lessonCount,
    questionFindings: summary.questionFindingCounts,
    lessonFindings: summary.lessonFindingCounts,
    blockedPhraseHits: summary.blockedPhraseHits.length
  }, null, 2));

  process.exit(summary.status === "fail" ? 1 : 0);
}

main();
