import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  isYoungLearnerPracticeGrade,
  isYoungLearnerPracticeRound,
  youngLearnerPracticeGrades,
  youngPracticePraise,
  youngPracticeStarLine,
  youngPracticeTip
} from "./youngLearnerPractice";

test("young learner grades cover K through P3 only", () => {
  deepEqual([...youngLearnerPracticeGrades].sort(), ["K", "P1", "P2", "P3"]);
  ok(isYoungLearnerPracticeGrade("K"));
  ok(isYoungLearnerPracticeGrade("P3"));
  equal(isYoungLearnerPracticeGrade("P4"), false);
  equal(isYoungLearnerPracticeGrade("S3"), false);
});

test("a round is young-learner only when non-empty and every question is K-P3", () => {
  equal(isYoungLearnerPracticeRound([]), false, "empty rounds must not flip into kid mode");
  ok(isYoungLearnerPracticeRound([{ grade: "K" }, { grade: "P1" }]));
  equal(isYoungLearnerPracticeRound([{ grade: "K" }, { grade: "P4" }]), false, "mixed rounds keep the standard UI");
});

test("praise and tips change register at the 50 and 80 percent thresholds", () => {
  for (const copyFor of [youngPracticePraise, youngPracticeTip]) {
    const low = copyFor(30);
    const middle = copyFor(60);
    const high = copyFor(90);
    notEqual(low.en, middle.en);
    notEqual(middle.en, high.en);
    equal(copyFor(80).en, high.en, "80 belongs to the top band");
    equal(copyFor(50).en, middle.en, "50 belongs to the middle band");
  }
});

test("kid copy ships all three languages and avoids the adult metacognition register", () => {
  const samples = [youngPracticePraise(90), youngPracticePraise(60), youngPracticePraise(20), youngPracticeTip(90), youngPracticeTip(60), youngPracticeTip(20)];
  for (const sample of samples) {
    ok(sample.en.length > 0 && Boolean(sample.zh?.length) && Boolean(sample.zhHans?.length), "praise/tip must be trilingual");
    for (const adultWord of ["metacognition", "misconception", "calibrate", "retrieval", "evidence"]) {
      ok(!sample.en.toLowerCase().includes(adultWord), `kid copy should not say "${adultWord}"`);
    }
  }
});

test("star line reports the collected stars for the round", () => {
  const line = youngPracticeStarLine(4, 5);
  ok(line.en.includes("4") && line.en.includes("5"));
  ok(line.zh?.includes("4/5"));
  ok(line.zhHans?.includes("4/5"));
});
