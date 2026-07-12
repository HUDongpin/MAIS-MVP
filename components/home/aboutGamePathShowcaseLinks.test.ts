import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/home/AboutGamePathShowcase.tsx", "utf8");

test("About game path exposes real game route links for Adventure Island and Fishing Master", () => {
  assert.match(source, /import Link from "next\/link"/);
  assert.match(source, /studentPracticeGameHrefs/);
  assert.match(source, /href=\{studentPracticeGameHrefs\.adventureIsland\}/);
  assert.match(source, /href=\{studentPracticeGameHrefs\.fishingMaster\}/);
});

