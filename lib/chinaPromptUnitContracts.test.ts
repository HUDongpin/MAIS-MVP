import assert from "node:assert/strict";
import test from "node:test";

import fixtureJson from "@/data/chinaPromptUnitContracts.json";
import { mainlandBnuHighQuestions } from "@/data/mainlandBnuHighQuestions";
import { mainlandBnuJuniorQuestions } from "@/data/mainlandBnuJuniorQuestions";
import { mainlandBnuPrimaryQuestions } from "@/data/mainlandBnuPrimaryQuestions";
import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { mainlandPepPrimaryRagV1Questions } from "@/data/mainlandPepPrimaryQuestions";
import { questionAnswerMatches } from "@/lib/server/answerMatching";

type UnitContract = {
  id: string;
  pack: keyof typeof questionsByPack;
  answer: string;
  dimension: string;
  unit: string;
  correctUnitAnswer: string;
  wrongUnitAnswer: string;
};

const questionsByPack = {
  pepPrimary: mainlandPepPrimaryRagV1Questions,
  bnuPrimary: mainlandBnuPrimaryQuestions,
  bnuJunior: mainlandBnuJuniorQuestions,
  bnuHigh: mainlandBnuHighQuestions,
  hjbPrimary: mainlandHjbPrimaryQuestions,
  hjbJunior: mainlandHjbJuniorQuestions
};

const fixture = fixtureJson as {
  schemaVersion: number;
  reviewScope: {
    contracts: number;
    sourceScannerTruePositives: number;
    separatelyAdjudicatedContracts: number;
    renewedAfterCanonicalCorrection: number;
    packCounts: Record<string, number>;
    dimensionCounts: Record<string, number>;
  };
  contracts: UnitContract[];
};

function countBy(rows: UnitContract[], key: "pack" | "dimension") {
  return Object.fromEntries(
    Array.from(new Set(rows.map((row) => row[key])))
      .sort()
      .map((value) => [value, rows.filter((row) => row[key] === value).length])
  );
}

test("all 141 current prompt-unit contracts grade bare, correct-unit, and wrong-unit responses safely", () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.reviewScope.contracts, 141);
  assert.equal(fixture.reviewScope.sourceScannerTruePositives, 139);
  assert.equal(fixture.reviewScope.separatelyAdjudicatedContracts, 2);
  assert.equal(fixture.reviewScope.renewedAfterCanonicalCorrection, 4);
  assert.equal(fixture.contracts.length, 141);
  assert.equal(new Set(fixture.contracts.map((contract) => contract.id)).size, 141);
  assert.deepEqual(countBy(fixture.contracts, "pack"), fixture.reviewScope.packCounts);
  assert.deepEqual(countBy(fixture.contracts, "dimension"), fixture.reviewScope.dimensionCounts);

  for (const contract of fixture.contracts) {
    const question = questionsByPack[contract.pack].find((candidate) => candidate.id === contract.id);
    assert.ok(question, `${contract.id} must remain in ${contract.pack}`);
    assert.notEqual(question.type, "multiple-choice", `${contract.id} is a free-response unit contract`);
    assert.equal(question.answer, contract.answer, `${contract.id} canonical changed and requires renewed adjudication`);

    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    };
    assert.equal(
      questionAnswerMatches(gradingQuestion, contract.answer),
      true,
      `${contract.id} bare answer ${contract.answer}`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, contract.correctUnitAnswer),
      true,
      `${contract.id} correct contextual unit ${contract.correctUnitAnswer}`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, contract.wrongUnitAnswer),
      false,
      `${contract.id} incompatible unit ${contract.wrongUnitAnswer}`
    );
  }
});

test("prompt-unit gate keeps structural and compound scanner exclusions out of scalar contracts", () => {
  const ids = new Set(fixture.contracts.map((contract) => contract.id));
  assert.equal(ids.has("pep-primary-p2-l-fi-128"), false, "quotient plus zero remainder is a compound answer");
  assert.equal(ids.has("bnu-junior-ds-v1-s3-015"), false, "circled condition labels are not the scalar 24");

  const structural = mainlandBnuJuniorQuestions.find((question) => question.id === "bnu-junior-ds-v1-s3-015");
  assert.ok(structural);
  assert.equal(structural.answer, "②④");
  assert.notEqual(structural.answer.normalize("NFKC"), structural.answer, "NFKC folds the circled labels; raw structure must win");
});
