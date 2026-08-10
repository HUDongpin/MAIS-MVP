import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { answerMatches } from "@/lib/server/answerMatching";

type LocalizedText = {
  en: string;
  zh: string;
  zhHans: string;
};

type Grade1Checkpoint = {
  id: string;
  grade: string;
  knowledgePointId: string;
  type: "multiple-choice" | "fill-in" | "short-answer";
  prompt: LocalizedText;
  options?: LocalizedText[];
  answer: string;
  acceptedAnswers: string[];
  explanation: LocalizedText;
  answerKey: {
    correctAnswer: string;
    acceptedAnswers: string[];
    solutionSteps: string[];
  };
  independentAnswer: string;
  independentSolution: string;
  validation: {
    computedAnswer: string;
  };
};

const pack = JSON.parse(
  readFileSync(
    path.resolve(
      process.cwd(),
      "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json"
    ),
    "utf8"
  )
) as { questions: Grade1Checkpoint[] };

const suffixes = ["q01", "q02", "q03", "q05", "q06"] as const;
type TargetSuffix = (typeof suffixes)[number];

const knowledgePointIds = {
  h2: "us-ca-math-p1-1-h2-picture-story-addition-equations",
  h3: "us-ca-math-p1-1-h3-cube-train-join-models-to-10",
  h5: "us-ca-math-p1-1-h5-model-equation-join-stories-to-10",
  h6: "us-ca-math-p1-1-h6-equation-match-join-stories-to-10",
  l2: "us-ca-math-p1-1-l2-picture-story-subtraction-equations",
  l3: "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10",
  l5: "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10"
} as const;

type TargetPage = keyof typeof knowledgePointIds;

const targetKnowledgePointIds: ReadonlySet<string> = new Set(Object.values(knowledgePointIds));
const targetQuestions = pack.questions.filter(
  (question) =>
    targetKnowledgePointIds.has(question.knowledgePointId) &&
    suffixes.includes(question.id.slice(-3) as TargetSuffix)
);

function pageQuestions(page: TargetPage) {
  return targetQuestions.filter(
    (question) => question.knowledgePointId === knowledgePointIds[page]
  );
}

function question(page: TargetPage, suffix: TargetSuffix) {
  const found = pageQuestions(page).find((candidate) => candidate.id.endsWith(`-${suffix}`));
  assert.ok(found, `missing ${page} ${suffix}`);
  return found;
}

const completeAdditionEquation = /^\d+ \+ \d+ = \d+$/;
const completeSubtractionEquation = /^\d+ - \d+ = \d+$/;
const completeEquation = /^\d+ [+-] \d+ = \d+$/;

function equationIsTrue(equation: string) {
  const match = equation.match(/^(\d+) ([+-]) (\d+) = (\d+)$/);
  assert.ok(match, `not a complete arithmetic equation: ${equation}`);
  const left = Number(match[1]);
  const right = Number(match[3]);
  const result = Number(match[4]);
  return (match[2] === "+" ? left + right : left - right) === result;
}

test("the repair slice is exactly the 35 displayed Grade 1 checkpoint IDs", () => {
  assert.equal(targetQuestions.length, 35);
  assert.equal(new Set(targetQuestions.map((candidate) => candidate.id)).size, 35);

  const expectedTypes: Record<TargetPage, Grade1Checkpoint["type"][]> = {
    h2: ["multiple-choice", "fill-in", "short-answer", "multiple-choice", "fill-in"],
    h3: ["multiple-choice", "fill-in", "short-answer", "multiple-choice", "fill-in"],
    h5: ["multiple-choice", "fill-in", "short-answer", "multiple-choice", "fill-in"],
    h6: ["multiple-choice", "fill-in", "short-answer", "multiple-choice", "fill-in"],
    l2: ["fill-in", "fill-in", "short-answer", "fill-in", "fill-in"],
    l3: ["fill-in", "fill-in", "short-answer", "fill-in", "fill-in"],
    l5: ["fill-in", "fill-in", "short-answer", "fill-in", "fill-in"]
  };

  (Object.keys(knowledgePointIds) as TargetPage[]).forEach((page) => {
    const rows = pageQuestions(page);
    assert.equal(rows.length, 5, `${page} should contribute five displayed rows`);
    assert.deepEqual(
      rows.map((candidate) => candidate.id.slice(-3)).sort(),
      [...suffixes].sort(),
      `${page} should contain only the five displayed suffixes`
    );
    assert.deepEqual(
      suffixes.map((suffix) => question(page, suffix).type),
      expectedTypes[page],
      `${page} response types should remain stable`
    );
    assert.equal(
      new Set(rows.map((candidate) => candidate.prompt.en)).size,
      5,
      `${page} should present five distinct tasks`
    );
  });
});

test("all 35 rows keep answer, accepted-answer, explanation, and independent evidence aligned", () => {
  targetQuestions.forEach((candidate) => {
    assert.equal(candidate.grade, "P1");
    assert.equal(candidate.answerKey.correctAnswer, candidate.answer, `${candidate.id} answer key`);
    assert.equal(candidate.independentAnswer, candidate.answer, `${candidate.id} independent answer`);
    assert.equal(candidate.validation.computedAnswer, candidate.answer, `${candidate.id} computed answer`);
    assert.ok(candidate.acceptedAnswers.includes(candidate.answer), `${candidate.id} accepted answer`);
    assert.deepEqual(
      candidate.answerKey.acceptedAnswers,
      candidate.acceptedAnswers,
      `${candidate.id} accepted-answer copies`
    );
    assert.ok(candidate.answerKey.solutionSteps.some((step) => step.trim().length > 0));
    assert.ok(candidate.independentSolution.trim().length > 0);

    (["en", "zh", "zhHans"] as const).forEach((locale) => {
      assert.ok(candidate.prompt[locale].trim().length > 0, `${candidate.id} ${locale} prompt`);
      assert.ok(
        candidate.explanation[locale].trim().length > 0,
        `${candidate.id} ${locale} explanation`
      );
    });

    if (candidate.type === "multiple-choice") {
      assert.equal(candidate.options?.length, 4, `${candidate.id} option count`);
      const optionTexts = candidate.options?.map((option) => option.en) ?? [];
      const acceptedForms = [candidate.answer, ...candidate.acceptedAnswers];
      assert.equal(new Set(optionTexts).size, 4, `${candidate.id} options should be distinct`);
      assert.equal(
        optionTexts.filter((option) => option === candidate.answer).length,
        1,
        `${candidate.id} should expose one keyed choice`
      );
      assert.equal(
        optionTexts.filter((option) =>
          acceptedForms.some((accepted) => answerMatches(option, accepted))
        ).length,
        1,
        `${candidate.id} should expose exactly one choice accepted by runtime grading`
      );
    } else {
      assert.equal(candidate.options, undefined, `${candidate.id} should not expose choices`);
    }
  });
});

test("H2 and L2 require complete picture-story equations instead of bare totals", () => {
  pageQuestions("h2").forEach((candidate) => {
    assert.match(candidate.prompt.en, /picture/i);
    assert.match(candidate.prompt.en, /complete (?:addition )?equation/i);
    assert.match(candidate.answer, completeAdditionEquation);
  });
  pageQuestions("l2").forEach((candidate) => {
    assert.match(candidate.prompt.en, /picture/i);
    assert.match(candidate.prompt.en, /complete (?:subtraction )?equation/i);
    assert.match(candidate.answer, completeSubtractionEquation);
  });

  pageQuestions("h2")
    .filter((candidate) => candidate.type === "multiple-choice")
    .forEach((candidate) => {
      const equations = candidate.options?.map((option) => option.en) ?? [];
      equations.forEach((equation) => assert.match(equation, completeEquation));
      assert.equal(equations.filter(equationIsTrue).length, 1);
    });
});

test("H3 and L3 use explicit cube-train representations and five different actions", () => {
  [...pageQuestions("h3"), ...pageQuestions("l3")].forEach((candidate) => {
    assert.match(candidate.prompt.en, /cube train/i);
    assert.match(candidate.prompt.en, /snap|unsnap|split|connected/i);
  });

  const expectedPrompts: Record<"h3" | "l3", Record<TargetSuffix, RegExp>> = {
    h3: {
      q01: /How many cubes are in the joined train/i,
      q02: /before the join/i,
      q03: /Write the complete addition equation/i,
      q05: /Which complete equation represents this action/i,
      q06: /section that was added/i
    },
    l3: {
      q01: /How many cubes remain connected/i,
      q02: /unsnapped section/i,
      q03: /Write the complete subtraction equation/i,
      q05: /before it was split/i,
      q06: /What number should replace/i
    }
  };

  (["h3", "l3"] as const).forEach((page) => {
    suffixes.forEach((suffix) => {
      assert.match(question(page, suffix).prompt.en, expectedPrompts[page][suffix]);
    });
  });
});

test("H5 and L5 assess model-equation correspondence through distinct response tasks", () => {
  [...pageQuestions("h5"), ...pageQuestions("l5")].forEach((candidate) => {
    assert.match(`${candidate.prompt.en} ${candidate.explanation.en}`, /model/i);
    assert.match(`${candidate.prompt.en} ${candidate.explanation.en}`, /equation|=/i);
  });

  const expectedPrompts: Record<"h5" | "l5", Record<TargetSuffix, RegExp>> = {
    h5: {
      q01: /Which complete equation matches the model/i,
      q02: /Complete the matching equation/i,
      q03: /correctly labels the model/i,
      q05: /Which counter model description/i,
      q06: /joined group contain/i
    },
    l5: {
      q01: /complete subtraction equation that matches the model/i,
      q02: /uncrossed part show/i,
      q03: /correctly labels the model/i,
      q05: /How many blocks should be crossed out/i,
      q06: /full starting model contain/i
    }
  };

  (["h5", "l5"] as const).forEach((page) => {
    suffixes.forEach((suffix) => {
      assert.match(question(page, suffix).prompt.en, expectedPrompts[page][suffix]);
    });
  });
});

test("H6 uses complete equations and one mathematically true choice per choice set", () => {
  pageQuestions("h6").forEach((candidate) => {
    assert.match(candidate.answer, completeAdditionEquation);
    assert.match(candidate.prompt.en, /complete (?:addition )?equation/i);
  });

  pageQuestions("h6")
    .filter((candidate) => candidate.type === "multiple-choice")
    .forEach((candidate) => {
      const equations = candidate.options?.map((option) => option.en) ?? [];
      assert.equal(equations.length, 4);
      equations.forEach((equation) => assert.match(equation, completeEquation));
      assert.equal(equations.filter(equationIsTrue).length, 1);
      assert.equal(equations.find(equationIsTrue), candidate.answer);
    });
});
