import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  CONTROLS,
  EXAMPLE,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  PATH_STEPS,
  SVG_H,
  SVG_W,
  TRY,
  T_MAX,
  axisMax,
  ballExpr,
  ballHeight,
  ballPath,
  discriminantLine,
  droneExpr,
  droneHeight,
  droneSegment,
  factorText,
  figureAriaLabel,
  fmt,
  gcd,
  heightComparison,
  isSquare,
  landing,
  meetingSummary,
  meetings,
  neg,
  nowReadout,
  reduce,
  scaleX,
  scaleY,
  secondsText,
  standardForm,
  timeLabel,
  tryItOptions,
  vertex,
  workedExample
} from "./ca-g9-ch03-linear-quadratic-models";

/** Every value a control can take, from its declared min/max/step. */
const grid = (c: { min: number; max: number; step: number }) => Array.from({ length: (c.max - c.min) / c.step + 1 }, (_, i) => c.min + i * c.step);
/** Read a signed number that the lesson printed with a typographic minus. */
const num = (s: string) => Number(s.replace("−", "-"));

const SLUG = "ca-g9-ch03-linear-quadratic-models";
const BRIEF_STANDARDS = [
  "A-REI.1", "A-REI.2", "A-REI.3", "A-REI.4", "A-REI.5", "A-REI.6", "A-REI.7", "A-REI.8", "A-REI.9",
  "A-REI.10", "A-REI.11", "A-REI.12", "A-SSE.1", "A-SSE.2", "A-SSE.3"
];
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

function attribute(node: Opening, name: string): ts.JsxAttribute | undefined {
  const found = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === name);
  return found && ts.isJsxAttribute(found) ? found : undefined;
}

function attributeNumber(node: Opening, name: string): number | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isNumericLiteral(init.expression)) return Number(init.expression.text);
  return null;
}

function attributeIdentifier(node: Opening, name: string): string | null {
  const init = attribute(node, name)?.initializer;
  if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) return init.expression.text;
  return null;
}

function line(node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function assertInside(label: string, x: number, y: number, margin: number) {
  assert.ok(x - margin >= 0 && x + margin <= SVG_W, `${label}: x=${x} (margin ${margin}) leaves the ${SVG_W}px viewBox`);
  assert.ok(y - margin >= 0 && y + margin <= SVG_H, `${label}: y=${y} (margin ${margin}) leaves the ${SVG_H}px viewBox`);
}

/** Parse "16t² ± Bt ± C = 0" back into the coefficients of t and 1 (missing terms are 0). */
function parseStandardForm(s: string) {
  const m = /^16t²(?: ([+−]) (\d+)t)?(?: ([+−]) (\d+))? = 0$/u.exec(s);
  assert.ok(m, `standard form did not parse: ${s}`);
  const sign = (c: string | undefined) => (c === "−" ? -1 : 1);
  return { t: m[2] === undefined ? 0 : sign(m[1]) * Number(m[2]), one: m[4] === undefined ? 0 : sign(m[3]) * Number(m[4]) };
}

test("the scale functions map the declared plot corners exactly", () => {
  assert.equal(scaleX(0), PAD_L);
  assert.equal(scaleX(T_MAX), SVG_W - PAD_R);
  for (const yMax of [40, 60, 80]) {
    assert.equal(scaleY(0, yMax), SVG_H - PAD_B);
    assert.equal(scaleY(yMax, yMax), PAD_T);
  }
  assert.equal(T_MAX, 4.5);
  assert.ok(PAD_L - 8 - 30 >= 0, "y-axis tick labels (\"80 ft\" at 11px) need room left of the axis");
  assert.ok(PAD_T - 9 - 9 >= 0, "the peak label sits 9px above the vertex and needs 9px of glyph height");
});

test("every reachable control state keeps the figure true and inside its viewBox", () => {
  let states = 0;
  let tangent = 0, exactPairs = 0, noMeeting = 0, rejectedRoots = 0, offGraph = 0, shortestSegment = Infinity;

  for (const speed of grid(CONTROLS.speed)) {
    for (const launch of grid(CONTROLS.launch)) {
      const k = speed / 8; // v = 8k, so the vertex is (k/4, h0 + k²) and h(q/4) = −q² + 2kq + h0
      const vx = vertex(speed, launch);
      assert.equal(vx.t, k / 4);
      assert.equal(vx.h, launch + k * k);
      assert.equal(ballHeight(speed, launch, vx.t), vx.h);
      for (const d of [0.25, 0.5, 1, 2]) {
        assert.ok(ballHeight(speed, launch, vx.t + d) < vx.h, `peak is a maximum (speed=${speed}, launch=${launch})`);
        assert.ok(ballHeight(speed, launch, vx.t - d) < vx.h, `peak is a maximum (speed=${speed}, launch=${launch})`);
      }
      // Completing the square is an identity at every slider time (all values are dyadic, so equality is exact).
      for (const q of grid(CONTROLS.quarter)) {
        const t = q / 4;
        assert.equal(-16 * (t - vx.t) * (t - vx.t) + vx.h, ballHeight(speed, launch, t), `vertex form at t=${t}`);
        assert.equal(ballHeight(speed, launch, t), -q * q + 2 * k * q + launch, `integer height at q=${q}`);
      }
      // Landing time solves h(t) = 0 and comes after the peak, inside the time axis.
      const land = landing(speed, launch);
      assert.ok(Math.abs(ballHeight(speed, launch, land.t)) < 1e-9, `landing (speed=${speed}, launch=${launch})`);
      assert.ok(land.t > vx.t && land.t <= T_MAX, `landing at ${land.t} must fit the ${T_MAX}s axis`);
      // Exactness must follow from the root itself, not from re-running the same predicate: 32t − v is the
      // whole number whose square is v² + 64h0, found here by search rather than by Math.sqrt.
      const landD = speed * speed + 64 * launch;
      let landRoot = -1;
      for (let n = 0; n * n <= landD; n += 1) if (n * n === landD) landRoot = n;
      assert.equal(land.exact, landRoot >= 0, `speed=${speed} launch=${launch}: D=${landD}, search says square=${landRoot >= 0}`);
      assert.equal(
        land.exact,
        Number.isInteger(32 * land.t - speed) && (32 * land.t - speed) * (32 * land.t - speed) === landD,
        `speed=${speed} launch=${launch}: "t = " is claimed only when 32t − v is a whole square root of D`
      );
      if (land.exact) {
        assert.equal(land.t, (speed + landRoot) / 32, `speed=${speed} launch=${launch}: exact landing time`);
        assert.ok(Number.isInteger(land.t * 4), "an exact landing time is a multiple of a quarter second");
        assert.equal(ballHeight(speed, launch, land.t), 0);
      }
      assert.equal(timeLabel(land.t, land.exact).startsWith("t = "), landRoot >= 0, `speed=${speed} launch=${launch}: label form`);
      // The drawn parabola: PATH_STEPS + 1 points from launch to touchdown, never below the ground or above the peak.
      const pts = ballPath(speed, launch);
      assert.equal(pts.length, PATH_STEPS + 1);
      assert.deepEqual(pts[0], { t: 0, h: launch });
      assert.equal(pts[PATH_STEPS].h, 0);
      for (const p of pts) assert.ok(p.t >= 0 && p.t <= land.t && p.h >= 0 && p.h <= vx.h, `path point (${p.t}, ${p.h})`);
      const shown = ballExpr(speed, launch);
      const bm = /^−16t² \+ (\d+)t(?: \+ (\d+))?$/u.exec(shown);
      assert.ok(bm, `ball expression did not parse: ${shown}`);
      assert.equal(Number(bm[1]), speed);
      assert.equal(bm[2] === undefined ? 0 : Number(bm[2]), launch);

      for (const climb of grid(CONTROLS.climb)) {
        for (const base of grid(CONTROLS.base)) {
          const where = `speed=${speed} launch=${launch} climb=${climb} base=${base}`;
          const m = meetings(speed, launch, climb, base);
          // The equation the lesson PRINTS is the only source of B and C here: parse it back, then check the
          // parsed polynomial against the two models themselves at several times.
          const sf = parseStandardForm(standardForm(m.B, m.C));
          for (const t of [0, 0.25, 1, 2.5, 4.5]) {
            const printed = 16 * t * t + sf.t * t + sf.one;
            const modelled = droneHeight(climb, base, t) - ballHeight(speed, launch, t);
            assert.ok(Math.abs(printed - modelled) < 1e-9, `${where}: printed equation gives ${printed} at t=${t}, but d(t) − h(t) = ${modelled}`);
          }
          const B = 0 - sf.t, C = 0 - sf.one; // "0 −" rather than unary minus so a zero coefficient stays +0
          assert.equal(m.B, B, `${where}: B must be the one in the printed equation`);
          assert.equal(m.C, C, `${where}: C must be the one in the printed equation`);
          assert.equal(m.D, sf.t * sf.t - 4 * 16 * sf.one, `${where}: D must be b² − 4ac of the printed equation`);
          assert.ok(m.D % 64 === 0, `${where}: B is a multiple of 8, so D = 64E (D=${m.D})`);
          let meetRoot = -1;
          for (let n = 0; n * n <= m.D; n += 1) if (n * n === m.D) meetRoot = n;
          assert.equal(m.exact, meetRoot >= 0, `${where}: D=${m.D}, search says square=${meetRoot >= 0}`);
          assert.equal(m.exact, isSquare(m.D / 64), `${where}: 64E is a perfect square exactly when E is`);
          const all = [...m.rejected, ...m.times];
          assert.equal(all.length, m.D < 0 ? 0 : m.D === 0 ? 1 : 2, `${where}: root count follows the discriminant sign`);
          if (m.D < 0) noMeeting += 1;
          if (m.D === 0) tangent += 1;
          if (m.exact && m.D > 0) exactPairs += 1;
          rejectedRoots += m.rejected.length;
          for (let i = 1; i < all.length; i += 1) assert.ok(all[i - 1] < all[i], `${where}: roots ascend and are distinct`);
          for (const t of m.times) assert.ok(t >= 0, where);
          for (const t of m.rejected) assert.ok(t < 0, where);
          for (const t of all) {
            const diff = ballHeight(speed, launch, t) - droneHeight(climb, base, t);
            if (m.exact) {
              assert.ok(diff === 0, `${where}: exact root t=${t} must satisfy h(t) = d(t) exactly (got ${diff})`);
              assert.ok(Number.isInteger(t * 4), `${where}: exact root t=${t} is a multiple of a quarter second`);
            } else assert.ok(Math.abs(diff) < 1e-7, `${where}: root t=${t} gives h − d = ${diff}`);
            // D is what the quadratic formula needs it to be: (32t − B)² for each root of 16t² − Bt − C.
            assert.ok(Math.abs((32 * t - m.B) * (32 * t - m.B) - m.D) < 1e-6, `${where}: (32t − B)² = ${(32 * t - m.B) ** 2} does not reproduce D = ${m.D} at t=${t}`);
            if (m.D > 0) {
              // Independent check: a simple root is where h − d changes sign (roots are at least 0.5 s apart).
              const before = ballHeight(speed, launch, t - 0.01) - droneHeight(climb, base, t - 0.01);
              const after = ballHeight(speed, launch, t + 0.01) - droneHeight(climb, base, t + 0.01);
              assert.ok(before * after < 0, `${where}: sign change around t=${t}`);
            }
          }
          for (const t of m.times) assert.ok(t <= land.t + 1e-9, `${where}: a meeting at height ≥ 0 happens before the ball lands`);
          if (m.D === 0) {
            // Tangency: the ball never rises above the drone's line.
            for (const q of grid(CONTROLS.quarter)) assert.ok(ballHeight(speed, launch, q / 4) <= droneHeight(climb, base, q / 4), where);
          }

          // Readout strings. The discriminant line must show the printed equation's own b and c, and do the arithmetic right.
          const dl = discriminantLine(m.B, m.C, m.D);
          const dm = /^\((−?\d+)\)² − 4\(16\)\((−?\d+)\) = (−?\d+)$/u.exec(dl);
          assert.ok(dm, `${where}: discriminant line did not parse: ${dl}`);
          assert.equal(num(dm[1]), sf.t, `${where}: discriminant line must use the printed b`);
          assert.equal(num(dm[2]), sf.one, `${where}: discriminant line must use the printed c`);
          assert.equal(num(dm[3]), num(dm[1]) * num(dm[1]) - 4 * 16 * num(dm[2]), `${where}: b² − 4ac arithmetic in "${dl}"`);
          assert.equal(num(dm[3]), m.D, `${where}: the shown discriminant is the one the summary describes`);
          const de = droneExpr(climb, base);
          if (climb === 0) assert.equal(de, `${base}`, where);
          else {
            const dm = /^(\d+)t(?: \+ (\d+))?$/u.exec(de);
            assert.ok(dm, `${where}: drone expression did not parse: ${de}`);
            assert.equal(Number(dm[1]), climb);
            assert.equal(dm[2] === undefined ? 0 : Number(dm[2]), base);
          }
          const summary = meetingSummary(m);
          assert.ok(summary.startsWith(m.D < 0 ? "is negative" : m.D === 0 ? "is zero" : "is positive"), `${where}: ${summary}`);
          assert.equal(summary.includes("before the throw"), m.rejected.length > 0, `${where}: ${summary}`);
          for (const t of m.times) {
            const label = timeLabel(t, m.exact);
            assert.ok(label.startsWith(m.exact ? "t = " : "t ≈ "), label);
            const value = Number(label.slice(4, -2));
            if (m.exact) assert.equal(value, t, label);
            else assert.ok(Math.abs(value - t) <= 0.005 && /\.\d\d s$/u.test(label), label);
          }

          // Axis: a multiple of 20, at least 40, tall enough for the peak and for one second of climb, and not wastefully taller.
          const yMax = axisMax(speed, launch, base, climb);
          assert.ok(yMax % 20 === 0 && yMax >= 40 && yMax >= vx.h && yMax >= base + climb, `${where}: yMax=${yMax}`);
          assert.ok(yMax === 40 || yMax - 20 < Math.max(vx.h, base + climb), `${where}: yMax=${yMax} is one step too tall`);
          assert.ok(Number.isInteger(yMax / 4), `${where}: tick labels are whole feet`);

          // Drawing: every painted element stays inside the viewBox.
          for (const p of pts) assertInside(`${where} path point`, scaleX(p.t), scaleY(p.h, yMax), 2);
          const seg = droneSegment(climb, base, yMax);
          // The drone's line is a LINE, not a dot: a butt-capped zero-length <line> paints nothing at all.
          const segPx = Math.hypot(scaleX(seg.t1) - scaleX(0), scaleY(seg.y1, yMax) - scaleY(base, yMax));
          shortestSegment = Math.min(shortestSegment, segPx);
          assert.ok(segPx >= 6, `${where}: drone line is only ${segPx.toFixed(2)}px long`);
          // ...and a different climb rate must draw a different line, or the aria-label announces a change the picture never makes.
          const drawnByClimb = grid(CONTROLS.climb).map((r) => {
            const y = axisMax(speed, launch, base, r), g = droneSegment(r, base, y);
            return `${y}|${scaleY(base, y).toFixed(4)}|${scaleX(g.t1).toFixed(4)},${scaleY(g.y1, y).toFixed(4)}`;
          });
          assert.equal(new Set(drawnByClimb).size, drawnByClimb.length, `${where}: climb rates share a drawing — ${drawnByClimb.join("  ")}`);
          assert.ok(seg.t1 >= 0 && seg.t1 <= T_MAX && seg.y1 >= base && seg.y1 <= yMax, `${where}: drone segment ${JSON.stringify(seg)}`);
          if (droneHeight(climb, base, T_MAX) <= yMax) assert.equal(seg.t1, T_MAX, `${where}: a line that fits runs the whole axis`);
          else assert.ok(Math.abs(seg.y1 - yMax) < 1e-9, `${where}: a line that leaves the plot exits through the top edge`);
          assert.ok(Math.abs(seg.y1 - Math.min(yMax, droneHeight(climb, base, seg.t1))) < 1e-9, where);
          assertInside(`${where} drone start`, scaleX(0), scaleY(base, yMax), 2);
          assertInside(`${where} drone end`, scaleX(seg.t1), scaleY(seg.y1, yMax), 2);
          assertInside(`${where} vertex marker`, scaleX(vx.t), scaleY(vx.h, yMax), 6);
          assert.ok(scaleY(vx.h, yMax) - 9 - 9 >= 0 && scaleX(vx.t) - 34 >= 0 && scaleX(vx.t) + 34 <= SVG_W, `${where}: peak label`);
          for (const t of m.times) {
            assertInside(`${where} meeting marker t=${t}`, scaleX(t), scaleY(droneHeight(climb, base, t), yMax), 6);
            assert.ok(Math.abs(scaleY(droneHeight(climb, base, t), yMax) - scaleY(ballHeight(speed, launch, t), yMax)) < 1e-6, where);
          }

          for (const q of grid(CONTROLS.quarter)) {
            states += 1;
            const t = q / 4;
            const hNow = ballHeight(speed, launch, t);
            const dNow = droneHeight(climb, base, t);
            assert.equal(dNow, 2 * (climb / 8) * q + base, `${where} q=${q}: drone height is an integer`);
            assert.equal(hNow < 0, t > land.t, `${where} q=${q}: "landed" readout agrees with the landing time`);
            assertInside(`${where} q=${q} ball marker`, scaleX(t), scaleY(Math.max(0, hNow), yMax), 7);
            if (dNow <= yMax) assertInside(`${where} q=${q} drone marker`, scaleX(t), scaleY(dNow, yMax), 7);
            assertInside(`${where} q=${q} time line top`, scaleX(t), PAD_T, 1);
            assert.equal(fmt(t, true), String(t));
            assert.ok(/^\d+(?:\.(?:25|5|75))?$/u.test(fmt(t, true)), `slider time ${fmt(t, true)} reads as a clean quarter`);

            // --- the four sentences the figure renders, parsed back and checked against integer arithmetic ---
            const hInt = -q * q + 2 * k * q + launch;      // = hNow, proven above
            const dInt = 2 * (climb / 8) * q + base;       // = dNow, proven above
            const drawnDrone = dInt <= yMax;               // the component only paints the drone dot when it fits
            if (!drawnDrone) offGraph += 1;

            const readout = nowReadout(speed, launch, climb, base, q);
            const rm = /^At t = (\d+(?:\.\d+)?) s: ball (?:(on the ground)|(\d+) ft), drone (\d+) ft( \(off the top of the graph\))?\.$/u.exec(readout);
            assert.ok(rm, `${where} q=${q}: readout did not parse: ${readout}`);
            assert.equal(Number(rm[1]), t, `${where} q=${q}: ${readout}`);
            assert.equal(rm[2] !== undefined, hInt < 0, `${where} q=${q}: "on the ground" exactly when h < 0 (h=${hInt}) — ${readout}`);
            if (rm[3] !== undefined) assert.equal(Number(rm[3]), hInt, `${where} q=${q}: ${readout}`);
            assert.equal(Number(rm[4]), dInt, `${where} q=${q}: ${readout}`);
            assert.equal(rm[5] !== undefined, !drawnDrone, `${where} q=${q}: the off-graph note must appear exactly when the drone dot is suppressed — ${readout}`);

            const cmp = heightComparison(speed, launch, climb, base, q);
            if (hInt < 0) {
              const cm = /^The ball already landed when t [=≈] (\d+(?:\.\d+)?) s\.$/u.exec(cmp);
              assert.ok(cm, `${where} q=${q}: ${cmp}`);
              assert.ok(Math.abs(ballHeight(speed, launch, Number(cm[1]))) < 1, `${where}: the announced landing time ${cm![1]} is not a root of h`);
              assert.ok(Number(cm![1]) <= t, `${where} q=${q}: the ball cannot have landed in the future`);
            } else {
              assert.equal(cmp === "The ball is higher.", hInt > dInt, `${where} q=${q}: h=${hInt} d=${dInt} — ${cmp}`);
              assert.equal(cmp === "The drone is higher.", hInt < dInt, `${where} q=${q}: h=${hInt} d=${dInt} — ${cmp}`);
              assert.equal(cmp === "Same height: a meeting point.", hInt === dInt, `${where} q=${q}: h=${hInt} d=${dInt} — ${cmp}`);
              if (hInt === dInt) assert.ok(m.times.some((x) => Math.abs(x - t) < 1e-9), `${where} q=${q}: a same-height moment must be one of the meeting times`);
            }

            const aria = figureAriaLabel(speed, launch, climb, base, q);
            assert.ok(aria.includes(`starts at ${launch} ft`), `${where} q=${q}: ${aria}`);
            assert.ok(aria.includes(`peaks at ${launch + k * k} ft`), `${where} q=${q}: ${aria}`);
            assert.ok(aria.includes(`Markers show t = ${t} s`), `${where} q=${q}: ${aria}`);
            assert.equal(aria.includes("do not meet"), m.times.length === 0, `${where} q=${q}: ${aria}`);
            assert.equal(aria.includes("off the top of the graph"), !drawnDrone, `${where} q=${q}: ${aria}`);
            assert.equal(aria.includes("leaving the top of the graph"), seg.t1 < T_MAX, `${where} q=${q}: ${aria}`);
            const spoken = /climbs (\d+) ft every second/u.exec(aria);
            assert.equal(spoken !== null, climb > 0, `${where} q=${q}: a climb rate is announced exactly when the drone climbs — ${aria}`);
            if (spoken) {
              assert.equal(Number(spoken[1]), climb, `${where} q=${q}: the announced climb rate must be the drawn one`);
              assert.ok(segPx >= 6, `${where} q=${q}: the label claims a ${climb} ft/s climb but the line is ${segPx.toFixed(2)}px long`);
            } else assert.ok(aria.includes(`hovers at ${base} ft`), `${where} q=${q}: ${aria}`);
          }
        }
      }
    }
  }
  assert.equal(states, 7 * 9 * 4 * 5 * 19);
  assert.ok(tangent > 0, "the grid reaches at least one tangent (discriminant zero) state");
  assert.ok(exactPairs > 0, "the grid reaches states with two exact meeting times");
  assert.ok(noMeeting > 0, "the grid reaches states where the paths never meet");
  assert.ok(rejectedRoots > 0, "the grid reaches states with a before-the-throw root");
  assert.ok(offGraph > 0, "the grid reaches states where the drone flies above the plot, so the off-graph wording is exercised");
  assert.ok(shortestSegment >= 90, `the shortest drone line in the whole grid is ${shortestSegment.toFixed(2)}px`);
});

test("the time slider speaks a grammatical value at every stop, including the seed state", () => {
  for (const q of grid(CONTROLS.quarter)) {
    const t = q / 4;
    const said = secondsText(t);
    assert.doesNotMatch(said, /\b1 seconds\b/u, `slider stop q=${q} announces "${said}"`);
    assert.ok(said.startsWith(`${t} `), `slider stop q=${q} announces "${said}"`);
    assert.equal(said.endsWith(" second"), t === 1, `only t = 1 takes the singular; q=${q} announces "${said}"`);
    assert.equal(said.endsWith(" seconds"), t !== 1, `every other stop takes the plural; q=${q} announces "${said}"`);
  }
  assert.equal(secondsText(0), "0 seconds");
  assert.equal(secondsText(0.25), "0.25 seconds");
  assert.equal(secondsText(1), "1 second");
  assert.equal(secondsText(4.5), "4.5 seconds");
  // The seed state is what a screen reader announces before anything is touched.
  assert.match(source, /const \[quarter, setQuarter\] = useState\(4\)/u);
  assert.equal(secondsText(4 / 4), "1 second");
  assert.ok(source.includes("aria-valuetext={secondsText(tNow)}"), "the slider must speak through the pluralizing helper");
  // No template literal anywhere in the lesson may drop a value straight in front of a bare plural noun.
  for (const m of source.matchAll(/\$\{[^{}]*\}\s+(seconds|minutes|hours|feet|inches|steps|times|solutions|roots|points|meters|degrees)\b/gu)) {
    assert.fail(`template literal interpolates a value directly before "${m[1]}": ${m[0]}`);
  }
});

test("worked example values recompute independently from the four constants", () => {
  assert.deepEqual(EXAMPLE, { rate: 8, start: 6, speed: 40, target: 30 });
  const ex = workedExample();
  // Drone: 8t + 6 = 30 -> 8t = 24 -> t = 3
  assert.equal(30 - 6, 24);
  assert.equal(ex.droneStep, 24);
  assert.equal(24 / 8, 3);
  assert.equal(ex.droneTime, 3);
  assert.equal(8 * 3 + 6, 30);
  // Ball: −16t² + 40t + 6 = 30 -> −16t² + 40t − 24 = 0 -> divide by −8 -> 2t² − 5t + 3 = 0
  assert.equal(6 - 30, -24);
  assert.equal(ex.C, -24);
  assert.equal(gcd(gcd(16, 40), 24), 8);
  assert.equal(ex.g, 8);
  assert.equal(-16 / -8, 2);
  assert.equal(40 / -8, -5);
  assert.equal(-24 / -8, 3);
  assert.deepEqual([ex.a, ex.b, ex.c], [2, -5, 3]);
  for (const t of [0, 1, 1.5, 2, 3.25]) assert.ok(-8 * (2 * t * t - 5 * t + 3) === -16 * t * t + 40 * t - 24, `dividing by −8 is reversible at t=${t}`);
  // Discriminant: (−5)² − 4·2·3 = 25 − 24 = 1
  assert.equal((-5) * (-5), 25);
  assert.equal(4 * 2 * 3, 24);
  assert.equal(25 - 24, 1);
  assert.equal(ex.disc, 1);
  // Roots: (5 ± 1) / 4 -> 1 and 3/2
  assert.equal((5 - 1) / 4, 1);
  assert.equal((5 + 1) / 4, 1.5);
  assert.deepEqual(ex.roots, [1, 1.5]);
  assert.deepEqual(reduce(4, 4), { p: 1, q: 1 });
  assert.deepEqual(reduce(6, 4), { p: 3, q: 2 });
  assert.equal(factorText({ p: 1, q: 1 }), "t − 1");
  assert.equal(factorText({ p: 3, q: 2 }), "2t − 3");
  assert.equal(ex.lead, 1);
  assert.equal(ex.factored, "(t − 1)(2t − 3) = 0");
  // (t − 1)(2t − 3) expands to 2t² − 5t + 3 at every t.
  for (const t of [-2, 0, 0.5, 1, 1.5, 4]) assert.ok((t - 1) * (2 * t - 3) === 2 * t * t - 5 * t + 3, `expansion at t=${t}`);
  // Checks in the original model: h(1) = −16 + 40 + 6 = 30; h(1.5) = −36 + 60 + 6 = 30
  assert.equal(-16 * 1 * 1, -16);
  assert.equal(-16 + 40 + 6, 30);
  assert.equal(-16 * 1.5 * 1.5, -36);
  assert.equal(40 * 1.5, 60);
  assert.equal(-36 + 60 + 6, 30);
  assert.deepEqual(ex.checks, [30, 30]);
  assert.equal(neg(-36), "−36");
  assert.equal(neg(30), "30");
  // Vertex: t = 40/32 = 1.25, h = 6 + 40²/64 = 6 + 25 = 31, which is above the 30 ft target.
  assert.equal(40 / 32, 1.25);
  assert.equal((40 * 40) / 64, 25);
  assert.equal(6 + 25, 31);
  assert.equal(ex.peakT, 1.25);
  assert.equal(ex.peak, 31);
  assert.equal(-16 * 1.25 * 1.25 + 40 * 1.25 + 6, 31);
  assert.ok(ex.peak > EXAMPLE.target, "two crossing times require the peak to clear the target");
  assert.equal(standardForm(40, -24), "16t² − 40t + 24 = 0");
  assert.equal(standardForm(0, 0), "16t² = 0");
  assert.equal(standardForm(-8, 8), "16t² + 8t − 8 = 0");
});

test("the Try it correct option is the true maximum height of −16t² + 64t + 5", () => {
  assert.deepEqual(TRY, { speed: 64, launch: 5 });
  const { options, correct } = tryItOptions();
  assert.equal(options.length, 4);
  assert.ok(correct >= 0 && correct < options.length);
  // Vertex at t = 64/32 = 2; h(2) = −16·4 + 128 + 5 = 69.
  assert.equal(64 / 32, 2);
  assert.equal(-16 * 4 + 64 * 2 + 5, 69);
  assert.equal(options[correct].value, 69);
  // Brute force: no sampled time beats 69, and t = 2 attains it.
  let best = -Infinity;
  for (let t = 0; t <= 5; t += 0.001) best = Math.max(best, -16 * t * t + 64 * t + 5);
  assert.ok(best <= 69 + 1e-9 && best > 69 - 1e-3, `sampled maximum ${best}`);
  assert.equal(-16 * 2 * 2 + 64 * 2 + 5, 69);
  options.forEach((o, i) => assert.equal(o.value === 69, i === correct, `option ${i} (${o.value} ft)`));
  assert.equal(new Set(options.map((o) => o.value)).size, 4, "all four choices must read differently");
  assert.deepEqual(options.map((o) => o.value), [53, 69, 5, 64]);
});

test("lesson source honors the authoring contract", () => {
  assert.ok(source.startsWith('"use client";'), "file must start with the client directive");
  assert.doesNotMatch(source, /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u, "no CJK characters");
  for (const banned of ["Math.random", "fetch(", "localStorage", "dangerouslySetInnerHTML", "<form", "next/image", "Codex", "candidate", "S18", "QA"]) {
    assert.ok(!source.includes(banned), `source must not contain ${banned}`);
  }
  const lines = source.split("\n").length;
  assert.ok(lines >= 120 && lines <= 260, `lesson is ${lines} lines; the contract allows 120–260`);

  const cited = [...source.matchAll(/\b[A-Z]-[A-Z]{2,3}\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite its standards");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of ["A-SSE.1", "A-SSE.2", "A-SSE.3", "A-REI.1", "A-REI.3", "A-REI.4", "A-REI.7", "A-REI.10", "A-REI.11"]) {
    assert.ok(mathCheck.includes(id), `Math check must cite ${id}`);
  }

  const svgs = openings("svg");
  assert.equal(svgs.length, 1);
  for (const svg of svgs) {
    assert.ok(attribute(svg, "viewBox"), `svg at line ${line(svg)} needs a viewBox`);
    assert.ok(attribute(svg, "role"), `svg at line ${line(svg)} needs role="img"`);
    assert.ok(attribute(svg, "aria-label"), `svg at line ${line(svg)} needs an aria-label`);
  }

  const buttons = openings("button");
  // Source-level openings: two inside Stepper, the disclosure button, Start over, and the mapped choice button.
  assert.equal(buttons.length, 5, "stepper pair, disclosure, reset and choice buttons expected");
  for (const button of buttons) {
    const init = attribute(button, "type")?.initializer;
    assert.ok(init && ts.isStringLiteral(init) && init.text === "button", `button at line ${line(button)} needs type="button"`);
  }

  // Inline min/max literals on every control must agree with the exported CONTROLS grid the tests enumerate.
  const steppers = openings("Stepper");
  assert.equal(steppers.length, 4);
  for (const stepper of steppers) {
    const name = attributeIdentifier(stepper, "value") as keyof typeof CONTROLS | null;
    assert.ok(name && name in CONTROLS, `Stepper at line ${line(stepper)} must bind a declared control`);
    const declared = CONTROLS[name as keyof typeof CONTROLS];
    assert.equal(attributeNumber(stepper, "min"), declared.min, `${name} min`);
    assert.equal(attributeNumber(stepper, "max"), declared.max, `${name} max`);
    assert.equal(attributeNumber(stepper, "step") ?? 1, declared.step, `${name} step`);
  }
  const ranges = openings("input");
  assert.equal(ranges.length, 1);
  assert.equal(attributeIdentifier(ranges[0], "value"), "quarter");
  assert.equal(attributeNumber(ranges[0], "min"), CONTROLS.quarter.min);
  assert.equal(attributeNumber(ranges[0], "max"), CONTROLS.quarter.max);

  // The figure's load-bearing sentences come from exported helpers, so the grid test above can see them.
  assert.match(source, /aria-label=\{figureAriaLabel\(speed, launch, climb, base, quarter\)\}/u);
  assert.ok(source.includes("{nowReadout(speed, launch, climb, base, quarter)}"), "the now-readout must render from its helper");
  assert.ok(source.includes("{heightComparison(speed, launch, climb, base, quarter)}"), "the comparison sentence must render from its helper");
  assert.ok(source.includes("{discriminantLine(meet.B, meet.C, meet.D)}"), "the discriminant line must render from its helper");
  assert.ok(source.includes("{droneWords(climb, base)}"), "the drone sentence must render from its helper");
  // The disclosure button controls a real element, and the choice buttons announce their pressed state.
  assert.match(source, /aria-expanded=\{shown > 0\} aria-controls=\{stepsId\}/u);
  assert.match(source, /<ol id=\{stepsId\}/u);
  assert.match(source, /aria-pressed=\{pick === i\}/u);
  // Every lesson title from the chapter roadmap appears in prose.
  for (const title of ["Every Step Has a Reason", "Reading an Expression&apos;s Parts", "Completing the Square", "Radical &amp; Rational Equations", "Four Ways to Solve a Quadratic", "Solving Systems by Elimination", "A Line Meets a Parabola", "Systems as Matrix Equations", "A Graph IS the Solution Set", "Graphing Inequalities"]) {
    assert.ok(source.includes(title), `roadmap must name "${title}"`);
  }
});
