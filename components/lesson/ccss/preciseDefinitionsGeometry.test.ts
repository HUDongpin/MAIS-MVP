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
  const lineTags = Array.from(
    angleSource.matchAll(
      /<line\b(?=[^>]*\bdata-diagram-defining-ray\b)[^>]*>/gu
    ),
    (match) => match[0]
  );
  const numericAttribute = (tag: string, name: string) => {
    const value = tag.match(new RegExp(`\\b${name}=\\{([\\d.]+)\\}`, "u"))?.[1];
    assert.ok(value, `${name} must remain a literal numeric ray coordinate`);
    return Number(value);
  };
  const lines = lineTags.map((tag) => ["x1", "y1", "x2", "y2"].map((name) => numericAttribute(tag, name)));
  assert.equal(lines.length, 2, "Angle diagram should have two rays");

  const arcTag = angleSource.match(/<path\b(?=[^>]*\bdata-diagram-angle-arc\b)[^>]*>/)?.[0];
  assert.ok(arcTag, "Angle diagram should expose its semantic angle arc");
  const arc = arcTag.match(
    /\bd="M ([\d.]+) ([\d.]+) A ([\d.]+) ([\d.]+) 0 0 0 ([\d.]+) ([\d.]+)"/
  );
  assert.ok(arc, "Angle diagram should have a circular arc");

  const arcIndex = angleSource.indexOf(arcTag);
  const rayTags = Array.from(
    angleSource.matchAll(/<line\b(?=[^>]*\bdata-diagram-defining-ray\b)[^>]*>/gu),
    (match) => match[0]
  );
  const firstRayIndex = Math.min(...rayTags.map((tag) => angleSource.indexOf(tag)));
  assert.ok(
    arcIndex >= 0 && firstRayIndex > arcIndex,
    "The exact arc must paint before the defining rays so its antialiased endpoint cannot cover their boundary"
  );
  assert.match(arcTag, /\bstrokeLinecap="butt"/u, "The arc must not gain an outward-projecting cap");

  const [, arcStartXText, arcStartYText, radiusXText, radiusYText, arcEndXText, arcEndYText] = arc;
  const arcStartX = Number(arcStartXText);
  const arcStartY = Number(arcStartYText);
  const radiusX = Number(radiusXText);
  const radiusY = Number(radiusYText);
  const arcEndX = Number(arcEndXText);
  const arcEndY = Number(arcEndYText);
  const slantedRay = lines.find(([, startY, , endY]) => Math.abs(endY - startY) > 0.01);
  assert.ok(slantedRay, "Angle diagram should retain one non-horizontal defining ray");
  const [vertexX, vertexY, rayEndX, rayEndY] = slantedRay;
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
