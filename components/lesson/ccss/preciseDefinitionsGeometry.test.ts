import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lessonSource = readFileSync(
  "components/lesson/ccss/lessons/precise-definitions.tsx",
  "utf8"
);

test("the precise-definitions angle arc ends on its slanted ray", () => {
  const angleStart = lessonSource.indexOf('{t.draw === "angle"');
  const angleEnd = lessonSource.indexOf('{t.draw === "circle"', angleStart);
  assert.ok(angleStart >= 0 && angleEnd > angleStart, "Angle diagram source should be present");

  const angleSource = lessonSource.slice(angleStart, angleEnd);
  const lines = Array.from(
    angleSource.matchAll(
      /<line x1=\{([\d.]+)\} y1=\{([\d.]+)\} x2=\{([\d.]+)\} y2=\{([\d.]+)\}/g
    ),
    (match) => match.slice(1).map(Number)
  );
  assert.equal(lines.length, 2, "Angle diagram should have two rays");

  const [, slantedRay] = lines;
  const arc = angleSource.match(
    /<path d="M ([\d.]+) ([\d.]+) A ([\d.]+) ([\d.]+) 0 0 0 ([\d.]+) ([\d.]+)"/
  );
  assert.ok(arc, "Angle diagram should have a circular arc");

  const [, arcStartXText, arcStartYText, radiusXText, radiusYText, arcEndXText, arcEndYText] = arc;
  const [vertexX, vertexY, rayEndX, rayEndY] = slantedRay;
  const arcStartX = Number(arcStartXText);
  const arcStartY = Number(arcStartYText);
  const radiusX = Number(radiusXText);
  const radiusY = Number(radiusYText);
  const arcEndX = Number(arcEndXText);
  const arcEndY = Number(arcEndYText);
  const rayDx = rayEndX - vertexX;
  const rayDy = rayEndY - vertexY;
  const arcDx = arcEndX - vertexX;
  const arcDy = arcEndY - vertexY;

  assert.equal(radiusX, radiusY, "The angle marker should use a circular arc");
  assert.ok(
    Math.abs(arcStartX - vertexX - radiusX) < 0.01 && Math.abs(arcStartY - vertexY) < 0.01,
    "The arc should start on the positive horizontal ray"
  );
  assert.ok(
    Math.abs(Math.hypot(arcDx, arcDy) - radiusX) < 0.01,
    "The arc endpoint should stay at the declared radius from the vertex"
  );
  assert.ok(
    rayDx * arcDx + rayDy * arcDy > 0,
    "The arc endpoint should land on the forward ray, not its opposite extension"
  );
  assert.ok(
    Math.abs(rayDx * arcDy - rayDy * arcDx) / Math.hypot(rayDx, rayDy) < 0.01,
    "The arc endpoint should meet the slanted ray instead of extending past it"
  );
});
