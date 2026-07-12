import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/learning/SubwayNetworkMap.tsx", "utf8");
const gradesSource = fs.readFileSync("data/grades.ts", "utf8");

function parseStringArrayDeclaration(fileSource: string, name: string) {
  const match = fileSource.match(new RegExp(String.raw`const ${name} = \[([^\]]+)\]`));
  assert.ok(match, `Could not find ${name} declaration`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function parseNumberArrayDeclaration(fileSource: string, name: string) {
  const match = fileSource.match(new RegExp(String.raw`const ${name} = \[([^\]]+)\]`));
  assert.ok(match, `Could not find ${name} declaration`);
  return match[1].split(",").map((value) => Number(value.trim())).filter(Number.isFinite);
}

function parseNumberConstant(fileSource: string, name: string, fallback: number) {
  const match = fileSource.match(new RegExp(String.raw`const ${name} = ([0-9]+)`));
  return match ? Number(match[1]) : fallback;
}

test("primary roadmap has a terminal x-coordinate for every primary grade", () => {
  const primaryGradeIds = parseStringArrayDeclaration(gradesSource, "primaryGradeIds");
  const gradeXs = parseNumberArrayDeclaration(source, "gradeXs");

  assert.equal(gradeXs.length, primaryGradeIds.length);
});

test("roadmap spine and mini-map do not hard-code the sixth coordinate as the last grade", () => {
  assert.doesNotMatch(source, /gradeXs\[5\]/);
});

test("route index layout keeps every primary grade entry inside the panel", () => {
  const primaryGradeIds = parseStringArrayDeclaration(gradesSource, "primaryGradeIds");
  const panel = {
    x: parseNumberConstant(source, "routeIndexPanelX", 54),
    width: parseNumberConstant(source, "routeIndexPanelWidth", 470)
  };
  const entry = {
    startX: parseNumberConstant(source, "routeIndexEntryStartX", 90),
    width: parseNumberConstant(source, "routeIndexSwatchSize", 44),
    spacing: parseNumberConstant(source, "routeIndexColumnSpacing", 136)
  };
  const bottomRowCount = Math.max(0, primaryGradeIds.length - 3);
  const bottomRowRightEdge = entry.startX + (bottomRowCount - 1) * entry.spacing + entry.width;

  assert.ok(
    bottomRowRightEdge <= panel.x + panel.width,
    `bottom row right edge ${bottomRowRightEdge} exceeds panel right edge ${panel.x + panel.width}`
  );
});
