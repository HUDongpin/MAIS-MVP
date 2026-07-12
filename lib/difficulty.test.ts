import assert from "node:assert/strict";
import test from "node:test";
import {
  activeDifficulties,
  historicalDifficultyRecords,
  isActiveDifficulty,
  mapDifficultyToActive,
  visibleDifficultiesForSelection
} from "./difficulty";
import type { Difficulty } from "@/types";

const projectDifficultyContract = {
  Low: true,
  Medium: true,
  High: true
} satisfies Record<Difficulty, true>;

test("current difficulty selections expose only the active three-level scale", () => {
  assert.deepEqual(Object.keys(projectDifficultyContract), activeDifficulties);
  assert.deepEqual(activeDifficulties, ["Low", "Medium", "High"]);
  assert.deepEqual(visibleDifficultiesForSelection, ["Low", "Medium", "High"]);
  assert.equal(isActiveDifficulty("Low"), true);
  assert.equal(isActiveDifficulty("Foundation"), false);
  assert.equal(isActiveDifficulty("Core"), false);
  assert.equal(isActiveDifficulty("Challenge"), false);
  assert.equal(isActiveDifficulty("Exam"), false);
});

test("historical four-level difficulty records are retained only as legacy mappings", () => {
  assert.deepEqual(historicalDifficultyRecords, ["Foundation", "Core", "Challenge", "Exam"]);
  assert.equal(mapDifficultyToActive("Foundation"), "Low");
  assert.equal(mapDifficultyToActive("Core"), "Medium");
  assert.equal(mapDifficultyToActive("Challenge"), "High");
  assert.equal(mapDifficultyToActive("Exam"), "High");
});
