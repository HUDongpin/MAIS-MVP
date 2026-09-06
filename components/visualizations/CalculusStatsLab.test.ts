import assert from "node:assert/strict";
import test from "node:test";

import { calculusStatsModesForTopic } from "./calculusStatsModes";

test("statistics lesson cannot switch into the unrelated calculus tangent mode", () => {
  assert.deepEqual(calculusStatsModesForTopic("statistics-s6"), ["normal"]);
  assert.deepEqual(calculusStatsModesForTopic("calculus"), ["tangent", "normal"]);
  assert.deepEqual(calculusStatsModesForTopic("differentiation-intro"), ["tangent", "normal"]);
});
