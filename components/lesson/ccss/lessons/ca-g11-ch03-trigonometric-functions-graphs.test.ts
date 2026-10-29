import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  BASE_SIN,
  BUOY,
  CONTROLS,
  SAMPLES,
  SVG,
  UNIT,
  WHEEL,
  Y_HI,
  arcPath,
  arcPoint,
  arccosDegrees,
  exactCos,
  exactSin,
  exactSource,
  fraction,
  mirrorCoincides,
  mirrorNote,
  mirrorRadius,
  num,
  rad,
  radianLabel,
  reference,
  riderHeight,
  riderX,
  signedFixed,
  tryItOptions,
  wavePoints,
  wheelHeight,
  workedExample,
  xPix,
  yPix
} from "./ca-g11-ch03-trigonometric-functions-graphs";

const SLUG = "ca-g11-ch03-trigonometric-functions-graphs";
/** Exactly the standard list in the chapter brief for us-ca-math-s5-chapter-03. */
const BRIEF_STANDARDS = ["F-TF.1", "F-TF.2", "F-TF.3", "F-TF.4", "F-TF.5", "F-TF.6", "F-TF.7", "F-TF.8", "F-TF.9"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
const sourceFile = ts.createSourceFile(`${SLUG}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));

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

function attribute(node: Opening, name: string): ts.JsxAttribute | undefined {
  const found = node.attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}

function attributeNumber(node: Opening, name: string): number | null {
  const init = attribute(node, name)?.initializer;
  if (!init || !ts.isJsxExpression(init) || !init.expression) return null;
  const expression = init.expression;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(expression.operand)) return -Number(expression.operand.text);
  return null;
}

function attributeIdentifier(node: Opening, name: string): string | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) return init.expression.text;
  return null;
}

function attributeText(node: Opening, name: string): string {
  return attribute(node, name)?.initializer?.getText(sourceFile) ?? "";
}

function lineOf(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/** The exact surds the figure prints, evaluated independently of the lesson. */
const EXACT: Record<string, number> = {
  "0": 0,
  "1": 1,
  "1/2": 1 / 2,
  "√2/2": Math.sqrt(2) / 2,
  "√3/2": Math.sqrt(3) / 2,
  "(√6 − √2)/4": (Math.sqrt(6) - Math.sqrt(2)) / 4,
  "(√6 + √2)/4": (Math.sqrt(6) + Math.sqrt(2)) / 4
};

function stripMinus(text: string) {
  return text.startsWith("−") ? text.slice(1) : text;
}

function exactValue(text: string) {
  const negative = text.startsWith("−");
  const body = stripMinus(text);
  assert.ok(Object.prototype.hasOwnProperty.call(EXACT, body), `unknown exact label: ${text}`);
  return negative ? -EXACT[body] : EXACT[body];
}

function parseRadianLabel(text: string) {
  if (text === "0") return { n: 0, d: 1 };
  const m = /^(\d*)π(?:\/(\d+))?$/u.exec(text);
  assert.ok(m, `radian label did not parse: ${text}`);
  return { n: m[1] === "" ? 1 : Number(m[1]), d: m[2] === undefined ? 1 : Number(m[2]) };
}

/** Reads a "−0.500"-style readout back as a number, refusing an ASCII hyphen or a negative zero. */
function parseSignedFixed(text: string, dp: number, where: string) {
  assert.ok(!text.includes("-"), `${where}: "${text}" uses an ASCII hyphen instead of the typographic minus`);
  assert.doesNotMatch(text, /^−0(?:\.0+)?$/u, `${where}: "${text}" prints a negative zero`);
  assert.match(text, new RegExp(`^−?\\d+\\.\\d{${dp}}$`, "u"), `${where}: "${text}" is not a ${dp}-place readout`);
  return Number(text.replace("−", "-"));
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

const NEAR = 1e-12;
const close = (actual: number, expected: number, message: string) =>
  assert.ok(Math.abs(actual - expected) < NEAR, `${message}: ${actual} vs ${expected}`);

test("the two panels share one scale that maps the declared corners exactly", () => {
  assert.equal(UNIT, 20);
  assert.equal(yPix(Y_HI), SVG.padTop);
  assert.equal(yPix(0), SVG.h - SVG.padBottom);
  assert.equal(xPix(0), SVG.gx0);
  assert.equal(xPix(360), SVG.gx1);
  assert.equal(xPix(180), (SVG.gx0 + SVG.gx1) / 2);
  // The wheel can never overlap the graph panel or leave the canvas.
  assert.ok(SVG.cx + CONTROLS.radius.max * UNIT + 8 < SVG.gx0, "the widest wheel must stay clear of the graph axis");
  assert.ok(SVG.cx - CONTROLS.radius.max * UNIT - 8 > 0, "the widest wheel must stay on the canvas");
  // Declared bounds keep every reachable wheel between the ground and the top of the window.
  assert.equal(CONTROLS.hub.min - CONTROLS.radius.max, 0);
  assert.equal(CONTROLS.hub.max + CONTROLS.radius.max, Y_HI);
  assert.equal(360 % CONTROLS.deg.step, 0);
});

test("signedFixed keeps every readout free of ASCII hyphens and negative zero", () => {
  assert.equal(signedFixed(0, 2), "0.00");
  assert.equal(signedFixed(8.6, 2), "8.60");
  assert.equal(signedFixed(-0.5, 3), "−0.500");
  assert.equal(signedFixed(-1, 3), "−1.000");
  // Math.cos(3π/2) and Math.sin(2π) are tiny negatives; they must print as a clean zero.
  assert.equal(Math.cos((3 * Math.PI) / 2) < 0, true);
  assert.equal(signedFixed(Math.cos((3 * Math.PI) / 2), 3), "0.000");
  assert.equal(Math.sin(2 * Math.PI) < 0, true);
  assert.equal(signedFixed(Math.sin(2 * Math.PI), 3), "0.000");
  assert.equal(signedFixed(-0.0004, 3), "0.000");
  assert.equal(signedFixed(-0.0006, 3), "−0.001");
  assert.equal(num(-0.5), "−0.5");
  assert.equal(num(4.5), "4.5");
  assert.equal(num(-0), "0");
});

test("every reachable (angle, radius, hub) keeps the figure's claims true and its ink inside the viewBox", () => {
  let states = 0;
  let exactChecks = 0;
  let coincidences = 0;
  const arcPaths = new Set<string>();
  for (let deg = CONTROLS.deg.min; deg <= CONTROLS.deg.max; deg += CONTROLS.deg.step) {
    for (let radius = CONTROLS.radius.min; radius <= CONTROLS.radius.max; radius += CONTROLS.radius.step) {
      for (let hub = CONTROLS.hub.min; hub <= CONTROLS.hub.max; hub += CONTROLS.hub.step) {
        states += 1;
        const where = `deg=${deg} radius=${radius} hub=${hub}`;
        const cosV = Math.cos((deg * Math.PI) / 180);
        const sinV = Math.sin((deg * Math.PI) / 180);
        assert.equal(rad(deg), (deg * Math.PI) / 180, where);

        // 1. The height readout: h = hub + radius sin, banded by the wheel, mirrored at −θ.
        const h = hub + radius * sinV;
        close(riderHeight(hub, radius, deg), h, `${where}: height`);
        assert.ok(h >= hub - radius - NEAR && h <= hub + radius + NEAR, `${where}: height ${h} outside the band`);
        assert.ok(hub - radius >= 0 && hub + radius <= Y_HI, `${where}: the band must fit the window`);
        close(riderHeight(hub, radius, -deg), 2 * hub - h, `${where}: mirror height`);
        close(riderX(radius, -deg), riderX(radius, deg), `${where}: −θ keeps the same horizontal offset`);
        // Periodicity: one more full turn lands on the identical point.
        close(riderHeight(hub, radius, deg + 360), h, `${where}: height after another turn`);
        close(riderX(radius, deg + 360), riderX(radius, deg), `${where}: column after another turn`);

        // 2. The Pythagorean identity, both as printed and as a distance from the hub.
        close(cosV * cosV + sinV * sinV, 1, `${where}: identity`);
        assert.equal(Number((cosV * cosV).toFixed(3)) + Number((sinV * sinV).toFixed(3)), 1, `${where}: the printed squares must total 1.000`);
        assert.equal((cosV * cosV + sinV * sinV).toFixed(3), "1.000", where);
        close(Math.hypot(radius * cosV, radius * sinV), radius, `${where}: distance from the hub`);

        // 3. Every printed number carries a typographic minus and never a negative zero,
        //    and reads back as the value it claims to show.
        close(parseSignedFixed(signedFixed(cosV, 3), 3, `${where}: cos note`), Number(cosV.toFixed(3)), `${where}: cos note value`);
        close(parseSignedFixed(signedFixed(sinV, 3), 3, `${where}: sin note`), Number(sinV.toFixed(3)), `${where}: sin note value`);
        close(parseSignedFixed(signedFixed(h, 2), 2, `${where}: height readout`), Number(h.toFixed(2)), `${where}: height readout value`);
        close(parseSignedFixed(signedFixed(2 * hub - h, 2), 2, `${where}: mirror readout`), Number((2 * hub - h).toFixed(2)), `${where}: mirror readout value`);

        // 4. The mirror dot is either visibly apart from the rider or the copy says it is not.
        const note = mirrorNote(hub, radius, deg);
        const separation = Math.abs(yPix(2 * hub - h) - yPix(h));
        assert.ok(!note.includes("-"), `${where}: the mirror note uses an ASCII hyphen`);
        assert.ok(!note.includes("−0°"), `${where}: the mirror note names a negative zero angle`);
        assert.equal(mirrorCoincides(deg), deg === 0 || deg === 180 || deg === 360, `${where}: coincidence must be exactly the sin θ = 0 angles`);
        if (mirrorCoincides(deg)) {
          coincidences += 1;
          close(separation, 0, `${where}: the two markers really do coincide`);
          assert.equal(mirrorRadius(deg), 8.5, where);
          assert.ok(mirrorRadius(deg) > 5.5 + 2, `${where}: the ring must clear the filled rider marker`);
          assert.ok(note.includes("directly under the rider"), `${where}: the copy must admit the overlap — ${note}`);
        } else {
          assert.equal(mirrorRadius(deg), 4, where);
          assert.ok(separation >= 4, `${where}: the two markers are only ${separation} px apart`);
          assert.ok(note.includes("hollow dot"), `${where}: ${note}`);
          assert.ok(note.includes(`${num(-deg)}°`), `${where}: the mirror angle must be printed with a typographic minus`);
        }

        // 5. Every painted element stays inside the viewBox.
        const rx = riderX(radius, deg);
        const marker = 5.5 + 2;
        assert.ok(rx - marker >= 0 && rx + marker <= SVG.w, `${where}: rider column ${rx}`);
        assert.ok(rx + marker < SVG.gx0 + 1, `${where}: the rider stays in the left panel`);
        assert.ok(yPix(h) - marker >= 0 && yPix(h) + marker <= SVG.h, `${where}: rider row ${yPix(h)}`);
        assert.ok(yPix(2 * hub - h) - mirrorRadius(deg) >= 0 && yPix(2 * hub - h) + mirrorRadius(deg) <= SVG.h, `${where}: mirror ring`);
        assert.ok(rx - mirrorRadius(deg) >= 0 && rx + mirrorRadius(deg) <= SVG.w, `${where}: mirror ring column`);
        assert.ok(yPix(hub) - radius * UNIT - 1.25 >= 0, `${where}: top of the wheel`);
        assert.ok(yPix(hub) + radius * UNIT + 1.25 <= SVG.h, `${where}: bottom of the wheel`);
        assert.ok(xPix(deg) + marker <= SVG.w && xPix(deg) - marker >= 0, `${where}: graph marker`);
        const wave = wavePoints(hub, radius);
        assert.equal(wave.length, SAMPLES + 1, where);
        for (const point of wave) {
          close(point.y, yPix(hub + radius * Math.sin((point.deg * Math.PI) / 180)), `${where}: wave sample ${point.deg}`);
          assert.ok(point.x >= SVG.gx0 - 1e-9 && point.x <= SVG.gx1 + 1e-9, `${where}: wave x ${point.x}`);
          assert.ok(point.y - 1.25 >= 0 && point.y + 1.25 <= SVG.h, `${where}: wave y ${point.y}`);
        }
        assert.ok(yPix(0) + 16 + 4 <= SVG.h, `${where}: the degree labels sit on the canvas`);

        // 6. The arc that makes radian measure visible: drawn on the r = 1 m circle, and
        //    its measured length really is the radian value the figure prints.
        const centre = { x: SVG.cx, y: yPix(hub) };
        const drawn = arcPath(deg, hub);
        arcPaths.add(`${hub}|${drawn}`);
        const coords = [...drawn.matchAll(/(\d+\.\d\d) (\d+\.\d\d)/gu)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
        assert.equal(coords.length, 3, `${where}: the arc is drawn as two half sweeps`);
        [0, deg / 2, deg].forEach((d, i) => {
          const expected = arcPoint(d, hub);
          close(coords[i].x, Number(expected.x.toFixed(2)), `${where}: arc node ${d} x`);
          close(coords[i].y, Number(expected.y.toFixed(2)), `${where}: arc node ${d} y`);
        });
        assert.ok(drawn.includes(`A ${UNIT} ${UNIT} 0 0 0 `), `${where}: the arc must sweep the r = 1 m circle counterclockwise: ${drawn}`);
        if (radius === CONTROLS.radius.min) {
          let measured = 0;
          let previous = arcPoint(0, hub);
          for (let i = 1; i <= 1000; i += 1) {
            const next = arcPoint((deg * i) / 1000, hub);
            measured += Math.hypot(next.x - previous.x, next.y - previous.y);
            close(Math.hypot(next.x - centre.x, next.y - centre.y), UNIT, `${where}: arc point ${i} must sit on the r = 1 m circle`);
            assert.ok(next.x - 1.75 >= 0 && next.x + 1.75 < SVG.gx0, `${where}: arc x ${next.x}`);
            assert.ok(next.y - 1.75 >= 0 && next.y + 1.75 <= SVG.h, `${where}: arc y ${next.y}`);
            previous = next;
          }
          // Chord-sum arc length, in radius-lengths, against the radian value the figure prints.
          assert.ok(Math.abs(measured / UNIT - (deg * Math.PI) / 180) < 1e-4, `${where}: the drawn arc is ${measured / UNIT} radius-lengths but the figure prints ${(deg * Math.PI) / 180}`);
        }

        // 7. The exact-value readouts agree with the computed cosine and sine, and the
        //    figure's stated provenance matches the label it actually prints.
        if (radius === CONTROLS.radius.min && hub === CONTROLS.hub.min) {
          exactChecks += 1;
          close(exactValue(exactCos(deg)), cosV, `${where}: exact cos ${exactCos(deg)}`);
          close(exactValue(exactSin(deg)), sinV, `${where}: exact sin ${exactSin(deg)}`);
          const ref = reference(deg);
          assert.ok(ref >= 0 && ref <= 90 && ref % 15 === 0, `${where}: reference angle ${ref}`);
          close(Math.abs(sinV), Math.sin((ref * Math.PI) / 180), `${where}: reference angle keeps the sine size`);
          const label = parseRadianLabel(radianLabel(deg));
          assert.equal(label.n * 180, deg * label.d, `${where}: ${radianLabel(deg)} must equal ${deg} degrees`);
          assert.equal(gcd(Math.abs(label.n) || 1, label.d), 1, `${where}: ${radianLabel(deg)} must be reduced`);

          const labels = [exactCos(deg), exactSin(deg)].map(stripMinus);
          const fromLabels = labels.every((t) => t === "0" || t === "1")
            ? "the axes of the unit circle"
            : labels.some((t) => t.includes("√6"))
              ? "the addition formulas"
              : labels.some((t) => t === "√2/2")
                ? "the 45-45-90 triangle"
                : "the 30-60-90 triangle";
          const stated = exactSource(deg);
          assert.equal(stated.from, fromLabels, `${where}: prints ${labels.join(" and ")} but claims they come from ${stated.from}`);
          // The reduction credit: the rule, evaluated, must reproduce this very angle.
          const d = deg % 360;
          if (stated.rule === null) {
            assert.ok(ref === 0 || ref === 90 || d === ref, `${where}: an angle off the axes and out of the first quadrant needs a reduction`);
          } else {
            const parsed = /^(\d+)° ([−+]) (\d+)°$/u.exec(stated.rule);
            assert.ok(parsed, `${where}: unreadable reduction "${stated.rule}"`);
            const base = Number(parsed[1]);
            const offset = Number(parsed[3]);
            assert.ok(base === 180 || base === 360, `${where}: F-TF.3 names the π ± x and 2π − x readings, not ${base}`);
            assert.equal(base + (parsed[2] === "−" ? -offset : offset), d, `${where}: "${stated.rule}" does not evaluate to ${d}`);
            assert.equal(offset, ref, `${where}: the reduction must be written on the reference angle`);
            close(Math.abs(Math.cos((offset * Math.PI) / 180)), Math.abs(cosV), `${where}: the reduction must preserve the cosine size`);
            close(Math.abs(Math.sin((offset * Math.PI) / 180)), Math.abs(sinV), `${where}: the reduction must preserve the sine size`);
          }
        }
      }
    }
  }
  assert.equal(states, 25 * 4 * 5);
  assert.equal(exactChecks, 25);
  assert.equal(coincidences, 3 * 4 * 5);
  assert.equal(arcPaths.size, 25 * 5, "the arc must be redrawn for every angle and hub height");
  // Spot values, written out by hand from the special triangles.
  assert.equal(exactCos(0), "1");
  assert.equal(exactSin(0), "0");
  assert.equal(exactSin(30), "1/2");
  assert.equal(exactCos(60), "1/2");
  assert.equal(exactSin(45), "√2/2");
  assert.equal(exactSin(120), "√3/2");
  assert.equal(exactCos(120), "−1/2");
  assert.equal(exactSin(210), "−1/2");
  assert.equal(exactCos(270), "0");
  assert.equal(exactSin(315), "−√2/2");
  assert.equal(exactCos(360), "1");
  assert.equal(radianLabel(0), "0");
  assert.equal(radianLabel(30), "π/6");
  assert.equal(radianLabel(90), "π/2");
  assert.equal(radianLabel(120), "2π/3");
  assert.equal(radianLabel(180), "π");
  assert.equal(radianLabel(360), "2π");
  // Provenance, spelled out by hand for the four kinds of angle in the grid.
  assert.equal(exactSource(90).from, "the axes of the unit circle");
  assert.equal(exactSource(270).from, "the axes of the unit circle");
  assert.equal(exactSource(180).from, "the axes of the unit circle");
  assert.equal(exactSource(30).from, "the 30-60-90 triangle");
  assert.equal(exactSource(240).from, "the 30-60-90 triangle");
  assert.equal(exactSource(135).from, "the 45-45-90 triangle");
  assert.equal(exactSource(15).from, "the addition formulas");
  assert.equal(exactSource(345).from, "the addition formulas");
  assert.equal(exactSource(60).rule, null);
  assert.equal(exactSource(90).rule, null);
  assert.equal(exactSource(150).rule, "180° − 30°");
  assert.equal(exactSource(195).rule, "180° + 15°");
  assert.equal(exactSource(315).rule, "360° − 45°");
  // sin 15° = sin(45° − 30°) = sin45 cos30 − cos45 sin30, the addition formula the Math check cites.
  close(exactValue(BASE_SIN[15]), Math.sin(Math.PI / 4) * Math.cos(Math.PI / 6) - Math.cos(Math.PI / 4) * Math.sin(Math.PI / 6), "sin 15 from the addition formula");
  close(exactValue(BASE_SIN[75]), Math.sin(Math.PI / 4) * Math.cos(Math.PI / 6) + Math.cos(Math.PI / 4) * Math.sin(Math.PI / 6), "sin 75 from the addition formula");
});

test("the worked example recomputes independently from the four wheel constants", () => {
  assert.deepEqual({ ...WHEEL }, { radius: 9, hub: 11, turn: 20, target: 15.5 });
  const ex = workedExample();
  // Boarding at the bottom: h(0) = 11 − 9 = 2 m; half a turn later 11 + 9 = 20 m.
  assert.equal(11 - 9, 2);
  assert.equal(11 + 9, 20);
  assert.equal(ex.low, 2);
  assert.equal(ex.high, 20);
  close(wheelHeight(0), 2, "h(0)");
  close(wheelHeight(10), 20, "h(10)");
  // Isolate the cosine: 11 − 9cos = 15.5, so −9cos = 4.5 and cos = −0.5.
  assert.equal(15.5 - 11, 4.5);
  assert.equal(4.5 / -9, -0.5);
  assert.equal(ex.cosValue, -0.5);
  // arccos(−1/2) = 120° = 2π/3, the only angle in [0°, 180°] with that cosine.
  assert.equal(ex.deg, 120);
  close(Math.cos((120 * Math.PI) / 180), -0.5, "cos 120");
  for (let d = 0; d <= 180; d += 15) {
    if (d !== 120) assert.ok(Math.abs(Math.cos((d * Math.PI) / 180) + 0.5) > 1e-6, `cos ${d} must not also equal −0.5`);
  }
  assert.equal(arccosDegrees(1), 0);
  assert.equal(arccosDegrees(0), 90);
  assert.equal(arccosDegrees(-1), 180);
  assert.equal(ex.radians, "2π/3");
  // Time: 120/360 of a 20 s turn is 20/3 s ≈ 6.67 s.
  assert.equal(ex.first.n, 20);
  assert.equal(ex.first.d, 3);
  assert.equal(ex.first.text, "20/3");
  close(ex.first.value, (120 / 360) * 20, "first time");
  assert.equal(ex.first.value.toFixed(2), "6.67");
  close(wheelHeight(ex.first.value), 15.5, "height at the first time");
  assert.equal(wheelHeight(ex.first.value).toFixed(1), "15.5");
  // Mirror angle 360 − 120 = 240, giving 240/360 × 20 = 40/3 s ≈ 13.33 s.
  assert.equal(ex.second.n, 40);
  assert.equal(ex.second.d, 3);
  close(ex.second.value, 20 - 20 / 3, "second time");
  assert.equal(ex.second.value.toFixed(2), "13.33");
  close(wheelHeight(ex.second.value), 15.5, "height at the second time");
  // 20/3 really is the FIRST crossing, and both crossings repeat every 20 s.
  for (let i = 0; i < 2000; i += 1) {
    const t = (i / 2000) * (20 / 3);
    assert.ok(wheelHeight(t) < 15.5 + NEAR, `h(${t}) must not reach the target before 20/3 s`);
  }
  for (const k of [1, 2, 5]) {
    close(wheelHeight(ex.first.value + 20 * k), 15.5, `first time plus ${k} turns`);
    close(wheelHeight(ex.second.value + 20 * k), 15.5, `second time plus ${k} turns`);
  }
  // The identity fixes the sideways offset: sin = √(1 − 1/4) = √3/2, so 9 × √3/2 ≈ 7.79 m.
  assert.equal(ex.sinText, "√3/2");
  close(ex.sinValue, Math.sqrt(3) / 2, "sine from the identity");
  close(ex.sinValue, Math.sin((120 * Math.PI) / 180), "sine of 120 degrees");
  close(ex.across, (9 * Math.sqrt(3)) / 2, "sideways offset");
  assert.equal(ex.across.toFixed(2), "7.79");
  close(ex.cosValue * ex.cosValue + ex.sinValue * ex.sinValue, 1, "identity at the solved angle");
  assert.equal(fraction(2400, 360).text, "20/3");
  assert.equal(fraction(360, 360).text, "1");
});

test("the worked example's bottom-based angle is reconciled with the figure's hub-based angle", () => {
  // The figure measures θ across from the hub; the worked example measures φ up from the
  // bottom, so φ = θ + 90°. The lesson must say so, and the two frames must agree everywhere.
  assert.ok(source.includes("measured up from the bottom of the wheel"), "step 2 must name the change of reference ray");
  assert.ok(source.includes("cos φ"), "the worked example must use φ, not θ");
  assert.ok(!source.includes("cos²θ + sin²θ = 1 fills in"), "the worked-example identity line must use φ");
  for (let i = 0; i <= 400; i += 1) {
    const t = (i / 400) * WHEEL.turn;
    const phi = (2 * Math.PI * t) / WHEEL.turn;
    const theta = phi - Math.PI / 2;
    close(WHEEL.hub - WHEEL.radius * Math.cos(phi), WHEEL.hub + WHEEL.radius * Math.sin(theta), `frames must agree at t=${t}`);
    close(WHEEL.radius * Math.sin(phi), WHEEL.radius * Math.cos(theta), `horizontal offsets must agree at t=${t}`);
  }
  // At the solved angle the sideways offset is the same number in either frame.
  close(WHEEL.radius * Math.sin((120 * Math.PI) / 180), WHEEL.radius * Math.cos((30 * Math.PI) / 180), "7.79 m either way");
  close(WHEEL.radius * Math.sin((120 * Math.PI) / 180), (9 * Math.sqrt(3)) / 2, "the printed 7.79 m");
});

test("the Math check never hands the live figure a height it cannot reach", () => {
  // The figure's band, from the declared control bounds, walked exhaustively.
  let lowest = Infinity;
  let highest = -Infinity;
  for (let deg = CONTROLS.deg.min; deg <= CONTROLS.deg.max; deg += CONTROLS.deg.step) {
    for (let radius = CONTROLS.radius.min; radius <= CONTROLS.radius.max; radius += CONTROLS.radius.step) {
      for (let hub = CONTROLS.hub.min; hub <= CONTROLS.hub.max; hub += CONTROLS.hub.step) {
        const h = hub + radius * Math.sin((deg * Math.PI) / 180);
        lowest = Math.min(lowest, h);
        highest = Math.max(highest, h);
      }
    }
  }
  assert.equal(Number(lowest.toFixed(9)), CONTROLS.hub.min - CONTROLS.radius.max);
  assert.equal(Number(highest.toFixed(9)), CONTROLS.hub.max + CONTROLS.radius.max);
  assert.equal(Number(highest.toFixed(9)), 12);
  // 15.5 m belongs to the worked example's wheel and to nothing on screen, so the sentence
  // that names it must name that wheel too.
  assert.ok(WHEEL.target > highest, "the worked example's target is out of the figure's reach, by construction");
  const at = mathCheck.indexOf("{WHEEL.target}");
  assert.ok(at > 0, "the Math check must state the worked example's target height");
  const before = mathCheck.slice(Math.max(0, at - 200), at);
  const after = mathCheck.slice(at, at + 260);
  assert.ok(before.includes("worked example"), `the target height must be attributed to the worked example, not the figure: ...${before.slice(-90)}`);
  assert.ok(after.includes("{WHEEL.radius}") && after.includes("{WHEEL.hub}"), "the sentence must name the worked example's own wheel");
  assert.ok(!/that model repeats/u.test(mathCheck), "the target height must not be pinned on the live figure's model");
  // No literal metre height anywhere in the Math check may sit outside the figure's band.
  const literals = [...mathCheck.matchAll(/(\d+(?:\.\d+)?) m\b/gu)].map((m) => Number(m[1]));
  assert.ok(literals.length > 0, "the Math check does talk in metres");
  for (const value of literals) {
    assert.ok(value >= lowest - 1e-9 && value <= highest + 1e-9, `the Math check names ${value} m, outside the figure's [${lowest}, ${highest}] band`);
  }
});

test("the Try it choices name the true period of a 2.5 sin(pi t / 4) + 6 buoy", () => {
  assert.equal(BUOY.amp, 2.5);
  assert.equal(BUOY.mid, 6);
  close(BUOY.b, Math.PI / 4, "angular frequency");
  const { period, options, correct } = tryItOptions();
  // 2π ÷ (π/4) = 8, computed straight from the definition of period.
  assert.equal(period, 8);
  assert.equal(options.length, 4);
  assert.deepEqual(options.map((o) => o.value), [2, 4, 6, 8]);
  assert.equal(new Set(options.map((o) => o.value)).size, 4);
  assert.equal(options[correct].value, 8);
  assert.equal(correct, 3);
  const height = (t: number) => 2.5 * Math.sin((Math.PI * t) / 4) + 6;
  for (let i = 0; i <= 400; i += 1) {
    const t = i / 10;
    close(height(t + 8), height(t), `the buoy repeats after 8 s at t=${t}`);
    assert.ok(height(t) >= 3.5 - NEAR && height(t) <= 8.5 + NEAR, `height at t=${t} must stay in the band`);
  }
  for (const shorter of [2, 4, 6]) {
    const matches = Array.from({ length: 401 }, (_, i) => i / 10).every((t) => Math.abs(height(t + shorter) - height(t)) < NEAR);
    assert.ok(!matches, `${shorter} s cannot be the period`);
  }
  // The distractors are exactly the quarter cycle, the half cycle and the midline.
  assert.equal(options[0].value, 8 / 4);
  assert.equal(options[1].value, 8 / 2);
  assert.equal(options[2].value, BUOY.mid);
  close(height(0), 6, "the buoy starts on the midline");
  close(height(2), 8.5, "a quarter cycle later it is at the crest");
  close(height(4), 6, "a half cycle later it is back on the midline");
  close(height(6), 3.5, "three quarters later it is at the trough");
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'), "file must start with the client directive");
  assert.doesNotMatch(source, /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u, "no CJK characters");
  for (const banned of ["Math.random", "fetch(", "localStorage", "sessionStorage", "dangerouslySetInnerHTML", "<form", "next/image", "Codex", "candidate", "S18", "QA"]) {
    assert.ok(!source.includes(banned), `source must not contain ${banned}`);
  }
  const lines = source.split("\n").length;
  assert.ok(lines >= 120 && lines <= 260, `lesson is ${lines} lines; the contract allows 120-260`);

  const cited = [...source.matchAll(/\b[A-Z]-[A-Z]{2,3}\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);

  // A citation is only allowed where the lesson actually does the work: each id is paired
  // with the code that develops it, so the gate cannot be passed by name-dropping alone.
  const EVIDENCE: Record<string, string[]> = {
    "F-TF.1": ["arcPath(deg, hub)", 'label="arc on r = 1 m"', "{rad(deg).toFixed(3)} m"],
    "F-TF.2": ["exactCos(deg)", "exactSin(deg)", "riderX(radius, deg)"],
    "F-TF.3": ["{src.from}", "reduction", "exactSource(deg)"],
    "F-TF.4": ["riderHeight(hub, radius, -deg)", "mirrorNote(hub, radius, deg)", "{deg + 360}"],
    "F-TF.5": ["amplitude {radius}, midline {hub}", "{hub - radius} m and {hub + radius} m"],
    "F-TF.6": ["arccosDegrees", "0 ≤ φ ≤ π"],
    "F-TF.7": ["{ex.first.text}", "{ex.second.text}"],
    "F-TF.8": ["cos²θ + sin²θ =", "(cosV * cosV + sinV * sinV)"],
    "F-TF.9": ["BASE_SIN[15]", "the addition formulas"]
  };
  assert.deepEqual(Object.keys(EVIDENCE).sort(), [...BRIEF_STANDARDS].sort(), "every brief standard needs an evidence entry");
  for (const [id, fragments] of Object.entries(EVIDENCE)) {
    assert.ok(mathCheck.includes(id), `Math check must cite ${id}`);
    for (const fragment of fragments) assert.ok(source.includes(fragment), `${id} is cited but the lesson never does "${fragment}"`);
  }

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${lineOf(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `svg at line ${lineOf(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${lineOf(svg)} needs an aria-label`);
  }
  // The arc is drawn from state, not from a fixed path string.
  const paths = openings("path");
  assert.equal(paths.length, 1);
  assert.equal(attributeText(paths[0], "d"), "{arcPath(deg, hub)}");
  const rings = openings("circle").filter((node) => attributeText(node, "r") === "{mirrorRadius(deg)}");
  assert.equal(rings.length, 1, "the mirror ring must size itself from state");

  const buttons = openings("button");
  // Two inside Stepper, the step disclosure, Start over, and the mapped Try it choice.
  assert.equal(buttons.length, 5);
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${lineOf(button)} needs type="button"`);
  }

  const steppers = openings("Stepper").filter((node) => attribute(node, "value"));
  assert.equal(steppers.length, 3);
  const bound = new Set<string>();
  for (const stepper of steppers) {
    const name = attributeIdentifier(stepper, "value");
    assert.ok(name === "deg" || name === "radius" || name === "hub", `Stepper at line ${lineOf(stepper)} must bind a declared control`);
    bound.add(name);
    const declared = CONTROLS[name];
    assert.equal(attributeNumber(stepper, "min"), declared.min, `${name} min`);
    assert.equal(attributeNumber(stepper, "max"), declared.max, `${name} max`);
    assert.equal(attributeNumber(stepper, "step"), declared.step, `${name} step`);
  }
  assert.equal(bound.size, 3);
  assert.equal(openings("input").length, 0, "this lesson declares its controls as steppers only");

  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{choice === i\}/u);
  for (const title of ["The Unit Circle", "Exact Trig Values", "Symmetry &amp; Periodicity", "Modeling Periodic Phenomena", "Inverse Trig Functions", "The Pythagorean Identity"]) {
    assert.ok(source.includes(title), `the roadmap must name "${title}"`);
  }
});

test("the opening prose's claim about where the wheel is fast is the one the mathematics makes", () => {
  // h(t) = hub − R·cos(2πt/T) has dh/dt = 0 at BOTH the bottom (t = 0) and the top
  // (t = T/2), and is steepest at hub level (t = T/4). The lesson used to say you
  // "rise quickly" near the bottom, which is false and is the exact misconception
  // F-TF.5 modelling has to undo.
  const dt = 1;
  const nearBottom = Math.abs(wheelHeight(dt) - wheelHeight(0));
  const intoTop = Math.abs(wheelHeight(WHEEL.turn / 2) - wheelHeight(WHEEL.turn / 2 - dt));
  const atMidline = Math.abs(wheelHeight(WHEEL.turn / 4 + dt / 2) - wheelHeight(WHEEL.turn / 4 - dt / 2));

  // The two extremes are equally slow — the curve is symmetric about its midline.
  assert.ok(Math.abs(nearBottom - intoTop) < 1e-9, `bottom ${nearBottom} vs top ${intoTop} must match`);
  // And the midline really is the fast part.
  assert.ok(atMidline > nearBottom * 2, `midline ${atMidline} must dwarf the extremes ${nearBottom}`);

  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");
  assert.match(source, /Halfway up you rise fastest/u, "the prose must name the midline as the fast part");
  assert.equal(source.split("Near the bottom you rise quickly").length - 1, 0, "the false contrast must not come back");
});
