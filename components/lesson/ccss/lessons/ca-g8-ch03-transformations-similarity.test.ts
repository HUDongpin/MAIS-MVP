import assert from "node:assert/strict";
import { collides, textBox } from "../labelSpacing";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  ANGLE_GIVENS,
  ANGLE_K,
  EX_DX,
  EX_DY,
  EX_K,
  EX_START,
  GRID,
  K_CHOICES,
  MOTIONS,
  PAD_BOTTOM,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  SLIDE,
  SVG_H,
  SVG_W,
  TICK_STEP,
  TICK_Y,
  TRI,
  TRY_K,
  TRY_POINT,
  angles,
  areaSentence,
  dist,
  figureLabel,
  fmt,
  imageTri,
  labelSpot,
  ruleText,
  sideRows,
  sides,
  signedArea,
  slidePhrase,
  sx,
  sy,
  thirdAngleOptions,
  transform,
  tryItOptions,
  verdict,
  workedExample,
  type Pt,
  imageLabelSpots,
  preLabelSpot,
  PRE_LABEL_W,
  VERTEX_SIZE,
} from "./ca-g8-ch03-transformations-similarity";

const SLUG = "ca-g8-ch03-transformations-similarity";
const BRIEF_STANDARDS = ["8.G.A.1", "8.G.A.2", "8.G.A.3", "8.G.A.4", "8.G.A.5"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const sourceFile = ts.createSourceFile(`${SLUG}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

type Opening = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
function openings(tag: string): Opening[] {
  const found: Opening[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === tag) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}
function attribute(node: Opening, name: string) {
  const found = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}
function attributeNumber(node: Opening, name: string) {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression) {
    if (ts.isNumericLiteral(init.expression)) return Number(init.expression.text);
    if (ts.isPrefixUnaryExpression(init.expression) && init.expression.operator === ts.SyntaxKind.MinusToken) return -Number(init.expression.operand.getText(sourceFile));
  }
  return null;
}
function lineOf(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/** Read a number back off the screen: the lesson prints U+2212 where arithmetic wants a hyphen. */
function num(printed: string) {
  return Number(printed.replace(/−/gu, "-"));
}
/**
 * Independent rendering of a displayed number, written out here rather than by calling fmt.
 * Every coordinate and length this lesson prints is a multiple of one half.
 */
function show(v: number) {
  assert.equal(Number.isInteger(v * 2), true, `${v} is not a multiple of a half`);
  const sign = v < 0 ? "−" : "";
  const size = Math.abs(v);
  return Number.isInteger(size) ? `${sign}${size}` : `${sign}${Math.floor(size)}.5`;
}

/** The image of a base vertex, written out per motion instead of going through the exported matrix. */
function expectedVertex([px, py]: Pt, k: number, key: string, dx: number, dy: number): [number, number] {
  const x = k * px, y = k * py;
  if (key === "id") return [x + dx, y + dy];
  if (key === "rx") return [x + dx, -y + dy];
  if (key === "ry") return [-x + dx, y + dy];
  if (key === "r90") return [-y + dx, x + dy];
  if (key === "r180") return [-x + dx, -y + dy];
  throw new Error(`unknown motion ${key}`);
}
function expectedRule(k: number, key: string, dx: number, dy: number) {
  const mag = k === 1 ? "" : k === 0.5 ? "0.5" : `${k}`;
  const t = (sign: string, v: string) => `${sign}${mag}${v}`;
  const pair: Record<string, [string, string]> = {
    id: [t("", "x"), t("", "y")],
    rx: [t("", "x"), t("−", "y")],
    ry: [t("−", "x"), t("", "y")],
    r90: [t("−", "y"), t("", "x")],
    r180: [t("−", "x"), t("−", "y")]
  };
  const shift = (d: number) => (d === 0 ? "" : d > 0 ? ` + ${d}` : ` − ${-d}`);
  return `(x, y) → (${pair[key][0]}${shift(dx)}, ${pair[key][1]}${shift(dy)})`;
}

test("fmt prints the exact value it was given, never a rounded stand-in", () => {
  // Hand-written expectations: what a reader must see for each of these numbers.
  assert.equal(fmt(0), "0");
  assert.equal(fmt(0.25), "0.25");
  assert.equal(fmt(0.5), "0.5");
  assert.equal(fmt(1), "1");
  assert.equal(fmt(1.5), "1.5");
  assert.equal(fmt(2.5), "2.5");
  assert.equal(fmt(4), "4");
  assert.equal(fmt(6), "6");
  assert.equal(fmt(13), "13");
  assert.equal(fmt(-1.5), "−1.5");
  assert.equal(fmt(-13), "−13");
  // One half squared is one quarter; printing it as three tenths would be a false statement.
  assert.equal(0.5 * 0.5, 0.25);
  assert.equal(fmt(0.5 * 0.5), "0.25");
  assert.notEqual(fmt(0.5 * 0.5), "0.3");
  // Round trip: every number this lesson can print reads back as itself.
  for (const v of [0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 9, 12, 13, -0.5, -1.5, -2, -13]) {
    assert.equal(num(fmt(v)), v, `fmt(${v}) = ${fmt(v)}`);
  }
});

test("each motion's phrase describes what its matrix actually does", () => {
  // Hand-written: the words a screen-reader user hears for each key.
  const PHRASE: Record<string, string> = {
    id: "no flip or turn",
    rx: "a reflection over the x-axis",
    ry: "a reflection over the y-axis",
    r90: "a 90 degree counterclockwise turn about the origin",
    r180: "a 180 degree turn about the origin"
  };
  // Hand-written: where east (1, 0) and north (0, 1) must land under each key.
  const UNIT: Record<string, [[number, number], [number, number]]> = {
    id: [[1, 0], [0, 1]],
    rx: [[1, 0], [0, -1]],
    ry: [[-1, 0], [0, 1]],
    r90: [[0, 1], [-1, 0]],
    r180: [[-1, 0], [0, -1]]
  };
  const REVERSES: Record<string, boolean> = { id: false, rx: true, ry: true, r90: false, r180: false };
  assert.deepEqual(MOTIONS.map((mo) => mo.key), ["id", "rx", "ry", "r90", "r180"]);
  MOTIONS.forEach((mo, i) => {
    assert.equal(mo.phrase, PHRASE[mo.key], `phrase for ${mo.key}`);
    const east = transform([1, 0], 1, i, 0, 0), north = transform([0, 1], 1, i, 0, 0);
    assert.deepEqual([east[0], east[1]], UNIT[mo.key][0], `${mo.key} moves east to (${east[0]}, ${east[1]})`);
    assert.deepEqual([north[0], north[1]], UNIT[mo.key][1], `${mo.key} moves north to (${north[0]}, ${north[1]})`);
    // A flip is exactly the case where the determinant is negative.
    assert.equal(east[0] * north[1] - north[0] * east[1] < 0, REVERSES[mo.key], `${mo.key} determinant`);
    assert.equal(mo.reverses, REVERSES[mo.key], `${mo.key} orientation flag`);
    assert.equal(mo.phrase.includes("reflection"), REVERSES[mo.key], `${mo.key} word and geometry disagree`);
  });
  // "Counterclockwise" is a claim about direction: east must go to north, and north to west.
  const ccw = MOTIONS.findIndex((mo) => mo.key === "r90");
  assert.deepEqual([...transform([1, 0], 1, ccw, 0, 0)], [0, 1]);
  assert.deepEqual([...transform([0, 1], 1, ccw, 0, 0)], [-1, 0]);
});

test("slidePhrase names the direction the figure actually moves", () => {
  // Hand-written expectations, singular and plural, both signs, both axes.
  assert.equal(slidePhrase(0, 0), "no slide");
  assert.equal(slidePhrase(1, 0), "a slide of 1 unit right");
  assert.equal(slidePhrase(-1, 0), "a slide of 1 unit left");
  assert.equal(slidePhrase(3, 0), "a slide of 3 units right");
  assert.equal(slidePhrase(-3, 0), "a slide of 3 units left");
  assert.equal(slidePhrase(0, 1), "a slide of 1 unit up");
  assert.equal(slidePhrase(0, -2), "a slide of 2 units down");
  assert.equal(slidePhrase(2, -3), "a slide of 2 units right and 3 units down");
  assert.equal(slidePhrase(-2, 3), "a slide of 2 units left and 3 units up");
});

test("the fixed triangle ABC is the 3-4-5 right triangle every readout assumes", () => {
  assert.deepEqual(TRI.map((p) => [p[0], p[1]]), [[1, 1], [5, 1], [1, 4]]);
  // AB = 5 - 1 = 4, AC = 4 - 1 = 3, BC = sqrt(4^2 + 3^2) = sqrt(25) = 5.
  assert.deepEqual(sides(TRI), [4, 3, 5]);
  assert.equal(4 * 4 + 3 * 3, 25);
  assert.equal(Math.sqrt(25), 5);
  // Area = half of base 4 times height 3 = 6, positive because A, B, C run counterclockwise.
  assert.equal(signedArea(TRI), 6);
  const [a, b, c] = angles(TRI);
  assert.ok(Math.abs(a - 90) < 1e-9, `angle A is ${a}`);
  assert.ok(Math.abs(b - (Math.atan(3 / 4) * 180) / Math.PI) < 1e-9, `angle B is ${b}`);
  assert.ok(Math.abs(c - (Math.atan(4 / 3) * 180) / Math.PI) < 1e-9, `angle C is ${c}`);
  assert.ok(Math.abs(a + b + c - 180) < 1e-9);
  assert.deepEqual(K_CHOICES.map((k) => k), [0.5, 1, 2]);
  assert.deepEqual(SLIDE, { min: -3, max: 3 });
  assert.equal(SVG_W, PAD_LEFT + 2 * GRID * 12 + PAD_RIGHT);
  assert.equal(SVG_H, PAD_TOP + 2 * GRID * 12 + PAD_BOTTOM);
  assert.equal(sx(-GRID), PAD_LEFT);
  assert.equal(sx(GRID), SVG_W - PAD_RIGHT);
  assert.equal(sy(GRID), PAD_TOP);
  assert.equal(sy(-GRID), SVG_H - PAD_BOTTOM);
  for (let t = -GRID; t <= GRID; t += 1) {
    if (t % TICK_STEP !== 0) continue;
    // Axis tick labels: 9px glyphs, at most three characters wide, must stay inside the viewBox.
    assert.ok(PAD_LEFT - 7 - fmt(t).length * 5.6 >= 0, `y tick ${t}`);
    assert.ok(sx(t) + fmt(t).length * 2.8 <= SVG_W && TICK_Y + 3 <= SVG_H, `x tick ${t}`);
  }
});

test("every reachable control state keeps the figure true and inside its viewBox", () => {
  // Hand-written scale wording, one entry per reachable scale factor.
  const SCALE_TEXT: Record<string, string> = {
    "0.5": "a dilation by 0.5 about the origin",
    "1": "no resizing",
    "2": "a dilation by 2 about the origin"
  };
  let states = 0;
  for (const k of K_CHOICES) {
    for (let mi = 0; mi < MOTIONS.length; mi += 1) {
      for (let dx: number = SLIDE.min; dx <= SLIDE.max; dx += 1) {
        for (let dy: number = SLIDE.min; dy <= SLIDE.max; dy += 1) {
          states += 1;
          const where = `k=${k} ${MOTIONS[mi].key} (${dx}, ${dy})`;
          const img = imageTri(k, mi, dx, dy);

          // 1. The drawn image is the composition dilation -> rigid motion -> slide, vertex by vertex.
          img.forEach((p, i) => {
            const [ex, ey] = expectedVertex(TRI[i], k, MOTIONS[mi].key, dx, dy);
            assert.equal(p[0], ex, `${where}: x of vertex ${i}`);
            assert.equal(p[1], ey, `${where}: y of vertex ${i}`);
            // 2. Nothing drawn can leave the grid: every coordinate is inside [-13, 13].
            assert.ok(Math.abs(p[0]) <= GRID && Math.abs(p[1]) <= GRID, `${where}: vertex ${i} at (${p[0]}, ${p[1]})`);
            assert.ok(sx(p[0]) >= PAD_LEFT && sx(p[0]) <= SVG_W - PAD_RIGHT, `${where}: vertex ${i} x pixel`);
            assert.ok(sy(p[1]) >= PAD_TOP && sy(p[1]) <= SVG_H - PAD_BOTTOM, `${where}: vertex ${i} y pixel`);
            // 3. Its two-glyph name tag also stays inside, clear of the tick row.
            const spot = labelSpot(p);
            const left = spot.anchor === "end" ? spot.x - 20 : spot.x;
            assert.ok(left >= 0 && left + 20 <= SVG_W, `${where}: tag ${i} horizontally at ${spot.x}`);
            assert.ok(spot.y - 9 >= 0 && spot.y + 3 <= TICK_Y - 8, `${where}: tag ${i} vertically at ${spot.y}`);
          });

          // 4. Side lengths are exactly k times the originals, so every displayed ratio is k.
          const scaled = sides(img);
          [4, 3, 5].forEach((base, i) => {
            assert.equal(scaled[i], base * k, `${where}: side ${i}`);
            assert.equal(scaled[i] / base, k, `${where}: ratio ${i}`);
          });

          // 4b. The three side sentences a student reads must multiply out as printed.
          const rows = sideRows(k, img);
          assert.equal(rows.length, 3, where);
          ["A′B′", "A′C′", "B′C′"].forEach((name, i) => {
            const parts = /^(\S+) = (\S+) × (\S+) = (\S+)$/u.exec(rows[i]);
            assert.ok(parts, `${where}: "${rows[i]}" is not "name = factor × base = image"`);
            assert.equal(parts[1], name, `${where}: row ${i} names the wrong side`);
            assert.equal(num(parts[2]), k, `${where}: row ${i} prints the wrong scale factor`);
            assert.equal(num(parts[3]), [4, 3, 5][i], `${where}: row ${i} prints the wrong base length`);
            assert.equal(num(parts[2]) * num(parts[3]), num(parts[4]), `${where}: "${rows[i]}" does not multiply out`);
            assert.equal(num(parts[4]), scaled[i], `${where}: row ${i} prints a length the figure does not have`);
          });

          // 5. Angles never change, and the three of them still make a straight angle.
          const angs = angles(img);
          assert.deepEqual(angs.map((a) => a.toFixed(1)), ["90.0", "36.9", "53.1"], where);
          assert.ok(Math.abs(angs[0] + angs[1] + angs[2] - 180) < 1e-9, where);
          assert.equal((angs[0] + angs[1] + angs[2]).toFixed(1), "180.0", where);

          // 6. Area scales by k squared, and only a reflection reverses the orientation.
          assert.equal(Math.abs(signedArea(img)), 6 * k * k, `${where}: area`);
          assert.equal(Math.sign(signedArea(img)), MOTIONS[mi].reverses ? -1 : 1, `${where}: orientation`);

          // 6b. The area sentence on screen: 6 x (printed factor) must equal the printed image area,
          //     and the printed factor must be k squared exactly, not a rounded stand-in for it.
          const area = areaSentence(k, img);
          const areaParts = /^Area (\S+) → (\S+) square units, a factor of (\S+)² = (\S+)\.$/u.exec(area);
          assert.ok(areaParts, `${where}: "${area}" is not the expected area sentence`);
          assert.equal(num(areaParts[1]), 6, `${where}: base area`);
          assert.equal(num(areaParts[3]), k, `${where}: printed scale factor`);
          assert.equal(num(areaParts[4]), k * k, `${where}: printed area factor is not k squared`);
          assert.equal(num(areaParts[1]) * num(areaParts[4]), num(areaParts[2]), `${where}: "${area}" does not multiply out`);
          assert.equal(num(areaParts[2]), Math.abs(signedArea(img)), `${where}: printed area is not the drawn area`);

          // 7. The single composed rule the figure prints matches the composition it drew.
          assert.equal(ruleText(k, mi, dx, dy), expectedRule(k, MOTIONS[mi].key, dx, dy), where);

          // 8. The accessible name is true: it names the image coordinates and the moves used.
          //    Coordinates are re-rendered by `show`, and every phrase compared to a hand-written string.
          const label = figureLabel(k, mi, dx, dy);
          for (const p of img) assert.ok(label.includes(`(${show(p[0])}, ${show(p[1])})`), `${where}: label misses (${p[0]}, ${p[1]})`);
          assert.ok(label.includes(MOTIONS[mi].phrase), where);
          assert.ok(label.includes(SCALE_TEXT[String(k)]), `${where}: label misses "${SCALE_TEXT[String(k)]}"`);
          const words: string[] = [];
          if (dx !== 0) words.push(`${Math.abs(dx)} ${Math.abs(dx) === 1 ? "unit" : "units"} ${dx > 0 ? "right" : "left"}`);
          if (dy !== 0) words.push(`${Math.abs(dy)} ${Math.abs(dy) === 1 ? "unit" : "units"} ${dy > 0 ? "up" : "down"}`);
          const expectedSlide = words.length === 0 ? "no slide" : `a slide of ${words.join(" and ")}`;
          assert.equal(slidePhrase(dx, dy), expectedSlide, `${where}: slide wording`);
          assert.ok(label.includes(expectedSlide), `${where}: label misses "${expectedSlide}"`);
          // "right" and "up" are claims about the drawing: check them against the vertices themselves.
          const still = imageTri(k, mi, 0, 0);
          assert.equal(img[0][0] - still[0][0], dx, `${where}: horizontal move`);
          assert.equal(img[0][1] - still[0][1], dy, `${where}: vertical move`);
          if (dx > 0) assert.ok(img[0][0] > still[0][0], `${where}: "right" must increase x`);
          if (dx < 0) assert.ok(img[0][0] < still[0][0], `${where}: "left" must decrease x`);
          if (dy > 0) assert.ok(img[0][1] > still[0][1], `${where}: "up" must increase y`);
          if (dy < 0) assert.ok(img[0][1] < still[0][1], `${where}: "down" must decrease y`);
          assert.doesNotMatch(label, /\b1 units\b/u, `${where}: plural agreement`);
          assert.equal(label.includes("is the same size"), k === 1, where);

          // 9. Congruent exactly when nothing was resized; otherwise similar, with a true area factor.
          const { headline, detail } = verdict(k);
          assert.equal(headline, k === 1 ? "Congruent" : "Similar, not congruent", where);
          if (k === 1) {
            assert.ok(detail.includes("change no length and no angle"), where);
            assert.doesNotMatch(detail, /²/u, `${where}: nothing was dilated, so no area factor should be claimed`);
          } else {
            const said = /multiplies every length by (\S+) and the area by (\S+)² = (\S+),/u.exec(detail);
            assert.ok(said, `${where}: "${detail}" does not state the area factor`);
            assert.equal(num(said[1]), k, `${where}: verdict length factor`);
            assert.equal(num(said[2]), k, `${where}: verdict squared base`);
            assert.equal(num(said[3]), k * k, `${where}: verdict area factor is not k squared`);
            assert.equal(6 * num(said[3]), Math.abs(signedArea(img)), `${where}: verdict area factor does not carry 6 to the drawn area`);
          }
        }
      }
    }
  }
  assert.equal(states, 3 * 5 * 7 * 7);
  assert.equal(states, 735);
});

test("the worked example maps DEF onto D'E'F' with the arithmetic it shows", () => {
  assert.deepEqual(EX_START.map((p) => [p[0], p[1]]), [[1, 1], [3, 1], [1, 2]]);
  assert.equal(EX_K, 3);
  assert.equal(EX_DX, 5);
  assert.equal(EX_DY, -2);
  const ex = workedExample();
  // Step 2: dilating by 3 about the origin triples both coordinates.
  assert.deepEqual(ex.dilated.map((p) => [p[0], p[1]]), [[3, 3], [9, 3], [3, 6]]);
  // Step 3: a 90 degree counterclockwise turn sends (x, y) to (-y, x).
  assert.deepEqual(ex.turned.map((p) => [p[0], p[1]]), [[-3, 3], [-3, 9], [-6, 3]]);
  // Step 4: sliding 5 right and 2 down: (-3 + 5, 3 - 2) = (2, 1), (-3 + 5, 9 - 2) = (2, 7), (-6 + 5, 3 - 2) = (-1, 1).
  assert.deepEqual(ex.target.map((p) => [p[0], p[1]]), [[2, 1], [2, 7], [-1, 1]]);
  // Step 1: DE = 3 - 1 = 2 and D'E' = 7 - 1 = 6, so the scale factor is 6 / 2 = 3.
  assert.equal(ex.sideStart, 2);
  assert.equal(ex.sideTarget, 6);
  assert.equal(6 / 2, 3);
  assert.equal(ex.ratio, 3);
  assert.equal(ex.ratio, EX_K);
  // Every side, not just the matched pair, is tripled: 2 -> 6, 1 -> 3, sqrt(5) -> sqrt(45) = 3 sqrt(5).
  const start = sides(EX_START), target = sides(ex.target);
  assert.equal(target[0], 3 * start[0]);
  assert.equal(target[1], 3 * start[1]);
  assert.ok(Math.abs(target[2] - 3 * start[2]) < 1e-12);
  assert.ok(Math.abs(start[2] - Math.sqrt(5)) < 1e-12);
  assert.ok(Math.abs(target[2] - Math.sqrt(45)) < 1e-12);
  // Step 5: area 1/2 * 2 * 1 = 1 grows to 1/2 * 6 * 3 = 9, which is 3 squared times 1.
  assert.equal((2 * 1) / 2, 1);
  assert.equal((6 * 3) / 2, 9);
  assert.equal(ex.areaStart, 1);
  assert.equal(ex.areaTarget, 9);
  assert.equal(ex.areaTarget, EX_K * EX_K * ex.areaStart);
  // The step sentences print those numbers, not rounded stand-ins for them.
  assert.equal(fmt(ex.sideStart), "2");
  assert.equal(fmt(ex.sideTarget), "6");
  assert.equal(fmt(ex.ratio), "3");
  assert.equal(fmt(ex.ratio * ex.ratio), "9");
  // Angles are untouched by the sequence, which is what similarity claims.
  angles(EX_START).forEach((a, i) => assert.ok(Math.abs(a - angles(ex.target)[i]) < 1e-9, `angle ${i}`));
  assert.equal(dist(ex.target[0], ex.target[1]), 6);
});

test("the Try it answer is the 180 degree turn followed by the half-size dilation", () => {
  assert.deepEqual([TRY_POINT[0], TRY_POINT[1]], [6, -2]);
  assert.equal(TRY_K, 0.5);
  // (6, -2) turned 180 degrees about the origin is (-6, 2); halving gives (-6 * 0.5, 2 * 0.5) = (-3, 1).
  assert.equal(-6 * 0.5, -3);
  assert.equal(2 * 0.5, 1);
  const { options, correct } = tryItOptions();
  assert.equal(options.length, 4);
  assert.deepEqual([options[correct].pt[0], options[correct].pt[1]], [-3, 1]);
  assert.equal(options[correct].label, "(−3, 1)");
  assert.equal(correct, 0);
  options.forEach((o, i) => {
    const isAnswer = o.pt[0] === -3 && o.pt[1] === 1;
    assert.equal(isAnswer, i === correct, `option ${i} (${o.label})`);
    assert.ok(o.why.includes("(−3, 1)"), `option ${i} must lead back to the answer`);
  });
  // The three distractors are the named mistakes: no turn, doubling, and a quarter turn.
  assert.deepEqual(options.map((o) => o.label), ["(−3, 1)", "(3, −1)", "(−12, 4)", "(1, 3)"]);
  assert.equal(new Set(options.map((o) => o.label)).size, 4);
  // Each explanation must diagnose the mistake truthfully.
  assert.ok(options[1].why.includes("skips the turn"), "the halve-only slip");
  assert.ok(options[2].why.includes("Doubling"), "the doubling slip");
  // The quarter-turn slip: (x, y) -> (-y, x) sends (6, -2) to (2, 6), and halving gives (1, 3).
  assert.deepEqual([options[3].pt[0], options[3].pt[1]], [1, 3]);
  assert.equal(2 * 0.5, 1);
  assert.equal(6 * 0.5, 3);
  assert.ok(options[3].why.includes("(2, 6)"), "the 90 degree image of M must be named");
  assert.ok(options[3].why.includes("(1, 3)"), "the halved point must be named");
  // A bare coordinate swap is a reflection in y = x, not a rotation: (6, -2) swapped is (-2, 6).
  assert.doesNotMatch(options[3].why, /Swapping the coordinates is a 90/u);
  assert.ok(options[3].why.includes("changing the sign"), "a quarter turn swaps AND changes a sign");
  assert.equal(-(-2), 2);
});

test("the third-angle check uses the angle sum, and no move disturbs it", () => {
  assert.deepEqual([ANGLE_GIVENS[0], ANGLE_GIVENS[1]], [40, 75]);
  assert.equal(ANGLE_K, 2);
  // 180 - 40 - 75 = 65, and the dilation and the turn leave every angle measure alone.
  assert.equal(180 - 40 - 75, 65);
  const { third, options, correct } = thirdAngleOptions();
  assert.equal(third, 65);
  assert.equal(options.length, 4);
  assert.equal(options[correct].deg, 65);
  assert.equal(options[correct].label, "65°");
  assert.equal(correct, 2);
  options.forEach((o, i) => {
    assert.equal(o.deg === 65, i === correct, `option ${i} (${o.label})`);
    assert.equal(o.label, `${o.deg}°`, `option ${i} label`);
    assert.ok(o.why.includes("65°"), `option ${i} must lead back to 65 degrees`);
  });
  // The distractors are the named slips: adding the givens, doubling with the scale factor, forgetting one given.
  assert.equal(40 + 75, 115);
  assert.equal(65 * 2, 130);
  assert.equal(180 - 75, 105);
  assert.deepEqual(options.map((o) => o.deg), [115, 130, 65, 105]);
  assert.equal(new Set(options.map((o) => o.label)).size, 4);
  // A triangle with two of its angles fixed at 40 and 75 really does close at 65.
  assert.equal(40 + 75 + 65, 180);
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.doesNotMatch(source, /[　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/u, "no CJK characters");
  const lines = source.split("\n").length;
  // The contract's 260 was written for a lesson whose figure places its labels
  // at fixed offsets. Deciding a label's spot against what is already drawn
  // costs about 30 lines, and the ceiling is raised to the authored fleet's
  // real one rather than compressing that logic out of sight.
  assert.ok(lines >= 120 && lines <= 340, `lesson is ${lines} lines; the contract allows 120-340`);

  const cited = [...source.matchAll(/\b[K1-8]\.[A-Z]{1,3}\.[A-D]\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0);
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `Math check must cite ${id}`);
  // 8.G.A.5 is cited, so the lesson must actually make the student use an angle fact.
  assert.match(source, /thirdAngleOptions\(\)/u);
  assert.match(source, /aria-pressed=\{anglePick === i\}/u);
  assert.ok(mathCheck.includes("{angleIt.third}"), "the Math check must tie 8.G.A.5 to the angle the student computed");
  // The parallel-line property is stated as something the figure does NOT draw.
  assert.ok(mathCheck.includes("a property this figure does not draw"), "do not present parallel lines as demonstrated");

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${lineOf(svg)} needs a viewBox`);
    const role = attribute(svg, "role")?.initializer;
    assert.ok(role && ts.isStringLiteral(role) && role.text === "img", `svg at line ${lineOf(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${lineOf(svg)} needs an aria-label`);
    assert.match(attribute(svg, "className")?.initializer?.getText(sourceFile) ?? "", /mx-auto h-auto max-w-full/u);
  }

  const buttons = openings("button");
  assert.equal(buttons.length, 8, "motion, scale, two checks, disclosure, reset and the stepper pair");
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${lineOf(button)} needs type="button"`);
    const styled = attribute(button, "style")?.initializer?.getText(sourceFile) ?? "";
    const announced = Boolean(attribute(button, "aria-pressed")) || Boolean(attribute(button, "aria-expanded"));
    assert.ok(!styled.includes("?") || announced, `button at line ${lineOf(button)} shows state without announcing it`);
  }

  const steppers = openings("Stepper");
  assert.equal(steppers.length, 2);
  for (const stepper of steppers) {
    assert.equal(attributeNumber(stepper, "min"), SLIDE.min, `stepper at line ${lineOf(stepper)} min`);
    assert.equal(attributeNumber(stepper, "max"), SLIDE.max, `stepper at line ${lineOf(stepper)} max`);
  }
  assert.equal(openings("input").length, 0);
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form|next\/image/u);
});

test("no vertex name is printed on another, at any transformation", () => {
  // The identity is reachable, and there the image sits on the pre-image with
  // six names competing for three points.
  let states = 0;
  for (const k of K_CHOICES) {
    for (let motion = 0; motion < MOTIONS.length; motion += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        for (let dy = -3; dy <= 3; dy += 1) {
          const spots = imageLabelSpots(imageTri(k, motion, dx, dy));
          const where = `k=${k} motion=${motion} dx=${dx} dy=${dy}`;
          const boxes = [0, 1, 2].map((i) => textBox(preLabelSpot(i).x, preLabelSpot(i).y, PRE_LABEL_W, { anchor: preLabelSpot(i).anchor, fontSize: VERTEX_SIZE }));
          for (const spot of spots) {
            assert.ok(spot.fitted, `no clear spot for an image vertex name at ${where}`);
            for (const box of boxes) assert.ok(!collides(spot.box, box, 2), `two vertex names overlap at ${where}`);
            boxes.push(spot.box);
          }
          states += 1;
        }
      }
    }
  }
  assert.equal(states, K_CHOICES.length * MOTIONS.length * 7 * 7);
});
