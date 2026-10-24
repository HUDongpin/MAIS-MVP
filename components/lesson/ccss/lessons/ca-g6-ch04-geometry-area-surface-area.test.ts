import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  EDGES,
  GIFT,
  GRID,
  NET_H,
  NET_PAD,
  NET_S,
  NET_W,
  PLOT,
  PLOT_CORNERS,
  PLOT_H,
  PLOT_W,
  amount,
  boxFacts,
  giftChoices,
  giftNotes,
  gx,
  gy,
  mixed,
  netLayout,
  plotAriaLabel,
  plotPieces,
  plotSteps,
} from "./ca-g6-ch04-geometry-area-surface-area";

const SLUG = "ca-g6-ch04-geometry-area-surface-area";
const BRIEF_STANDARDS = ["6.G.A.1", "6.G.A.2", "6.G.A.3", "6.G.A.4"];
const source = readFileSync(path.join(process.cwd(), `components/lesson/ccss/lessons/${SLUG}.tsx`), "utf8");

function range(lo: number, hi: number) {
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/**
 * Independent mixed-number writer: reduces the fraction first and looks the
 * remainder up by name, rather than indexing a table of eighths.
 */
const NAMED: Record<string, string> = { "1/2": "½", "1/4": "¼", "3/4": "¾", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞" };
function expectedMixed(value: number) {
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest === 0) return String(whole);
  let num = Math.round(rest * 8);
  let den = 8;
  while (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  const glyph = NAMED[`${num}/${den}`];
  assert.ok(glyph, `no glyph for ${num}/${den}`);
  return (whole === 0 ? "" : String(whole)) + glyph;
}

function insideViewBox(label: string, x: number, y: number, w: number, h: number) {
  assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${label}: (${x}, ${y}) escapes the 0..${w} by 0..${h} viewBox`);
}

function overlapArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const dx = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const dy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return dx * dy;
}

function shoelace(points: [number, number][]) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** Opening JSX tags starting with `open`, closed at the first `>` outside braces. */
function openingTags(src: string, open: string) {
  const tags: string[] = [];
  let i = src.indexOf(open);
  while (i >= 0) {
    let depth = 0;
    let j = i + open.length;
    for (; j < src.length; j += 1) {
      const ch = src[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) break;
    }
    tags.push(src.slice(i, j + 1));
    i = src.indexOf(open, j);
  }
  return tags;
}

test("the fraction writer and its plural agreement", () => {
  assert.equal(mixed(3), "3");
  assert.equal(mixed(2.5), "2½");
  assert.equal(mixed(0.5), "½");
  assert.equal(mixed(4.75), "4¾");
  assert.equal(mixed(1.125), "1⅛");
  assert.equal(amount(1, "unit"), "1 unit");
  assert.equal(amount(1.5, "unit"), "1½ units");
  assert.equal(amount(1, "square unit"), "1 square unit");
  assert.equal(amount(27, "square unit"), "27 square units");
  assert.equal(amount(1, "cubic unit"), "1 cubic unit");
  for (let eighths = 8; eighths <= 200; eighths += 1) {
    const value = eighths / 8;
    assert.equal(mixed(value), expectedMixed(value), `mixed(${value})`);
    assert.equal(amount(value, "unit"), `${expectedMixed(value)} ${value === 1 ? "unit" : "units"}`);
  }
});

test("every reachable box: the readouts are true and the net stays inside its viewBox", () => {
  let states = 0;
  for (const L of range(EDGES.L[0], EDGES.L[1])) {
    for (const W of range(EDGES.W[0], EDGES.W[1])) {
      for (const H of range(EDGES.H[0], EDGES.H[1])) {
        states += 1;
        const where = `L=${L} W=${W} H=${H}`;
        const l = L / 2;
        const w = W / 2;
        const h = H / 2;
        const f = boxFacts(L, W, H);

        // edges and face areas are exact products of the real edge lengths
        assert.equal(f.l, l, where);
        assert.equal(f.w, w, where);
        assert.equal(f.h, h, where);
        assert.equal(f.base, l * w, where);
        assert.equal(f.front, l * h, where);
        assert.equal(f.side, w * h, where);
        // surface area is the six faces added one at a time
        assert.equal(f.surface, f.base + f.base + f.front + f.front + f.side + f.side, where);
        assert.equal(f.surface, 2 * (l * w + l * h + w * h), where);
        // volume: half-unit cubes, eight to a cubic unit, agrees with l x w x h
        assert.equal(f.layerCubes, L * W, where);
        assert.equal(f.layers, H, where);
        assert.equal(f.cubes, f.layerCubes * f.layers, where);
        assert.equal(f.cubes, L * W * H, where);
        assert.equal(f.volume, f.cubes / 8, where);
        assert.equal(f.volume, l * w * h, where);
        // one layer of half-cubes is half a unit thick, so it holds half the base area
        assert.equal(f.layerCubes / 8, (l * w) / 2, where);

        // nothing the figure prints is below one, and nothing is misspelled as a plural
        for (const [value, noun] of [[l, "unit"], [w, "unit"], [h, "unit"], [f.base, "square unit"], [f.surface, "square unit"], [f.volume, "cubic unit"]] as const) {
          assert.ok(value >= 1, `${where}: ${noun} readout ${value} drops below one`);
          assert.equal(mixed(value), expectedMixed(value), where);
          assert.equal(amount(value, noun).endsWith("s"), value !== 1, `${where}: plural agreement for ${value} ${noun}`);
        }

        // the net: six faces, correct sizes, no overlap, all inside the viewBox
        const net = netLayout(L, W, H);
        assert.equal(net.faces.length, 6, where);
        const sizes: Record<string, [number, number]> = {
          top: [L, W], bottom: [L, W], front: [L, H], back: [L, H], left: [W, H], right: [W, H],
        };
        let painted = 0;
        for (const face of net.faces) {
          const [gw, gh] = sizes[face.key];
          assert.equal(face.w, gw * NET_S, `${where}: ${face.key} width`);
          assert.equal(face.h, gh * NET_S, `${where}: ${face.key} height`);
          assert.equal(face.area, (gw / 2) * (gh / 2), `${where}: ${face.key} area`);
          insideViewBox(`${face.key} top-left ${where}`, face.x, face.y, NET_W, NET_H);
          insideViewBox(`${face.key} bottom-right ${where}`, face.x + face.w, face.y + face.h, NET_W, NET_H);
          assert.ok(face.x >= NET_PAD - 1 && face.y >= NET_PAD - 1, `${where}: ${face.key} keeps the padding`);
          // the area label is centred in the face and fits inside it at 11px mono
          assert.ok(mixed(face.area).length * 7 <= face.w, `${where}: ${face.key} label ${mixed(face.area)} fits`);
          assert.ok(face.h >= 2 * NET_S, `${where}: ${face.key} is at least one unit tall`);
          painted += face.w * face.h;
        }
        for (let i = 0; i < net.faces.length; i += 1) {
          for (let j = i + 1; j < net.faces.length; j += 1) {
            assert.equal(overlapArea(net.faces[i], net.faces[j]), 0, `${where}: ${net.faces[i].key} overlaps ${net.faces[j].key}`);
          }
        }
        // the drawn net really is the surface: painted pixels = surface area x (2 x scale)^2
        assert.equal(painted, f.surface * 4 * NET_S * NET_S, where);
        assert.equal(shoelace(net.outline), painted, `${where}: the outline encloses exactly the six faces`);
        for (const [x, y] of net.outline) insideViewBox(`outline ${where}`, x, y, NET_W, NET_H);

        // the bottom face carries one layer of half-unit cubes
        assert.equal(net.bottom.key, "bottom", where);
        assert.equal((net.bottom.w / NET_S) * (net.bottom.h / NET_S), f.layerCubes, where);
        for (let i = 1; i <= L - 1; i += 1) {
          assert.ok(net.bottom.x + i * NET_S < net.bottom.x + net.bottom.w, `${where}: grid line ${i} stays on the bottom face`);
        }
        for (let j = 1; j <= W - 1; j += 1) {
          assert.ok(net.bottom.y + j * NET_S < net.bottom.y + net.bottom.h, `${where}: grid row ${j} stays on the bottom face`);
        }
      }
    }
  }
  assert.equal(states, 9 * 7 * 5);
});


/**
 * The lesson has five controls, and they split into two independent figures: the
 * net figure is a function of (L, W, H) only and the plot figure is a function of
 * `step` only, so 9 x 7 x 5 states above plus the 5 steps here plus the 5 picks
 * below cover all 9 x 7 x 5 x 5 x 5 reachable UI states without a product loop.
 */
test("every reveal step: what is drawn stays inside the viewBox and the aria-label says what is drawn", () => {
  // The grid is written out here so the geometry below is rebuilt from raw
  // numbers rather than from the lesson's own gx/gy.
  assert.deepEqual({ ...GRID }, { cols: 12, rows: 7, cell: 20, pad: 26 });
  const COLS = 12, ROWS = 7, CELL = 20, PAD = 26;
  const X = (x: number) => PAD + x * CELL;
  const Y = (y: number) => PAD + (ROWS - y) * CELL;
  assert.equal(PLOT_W, COLS * CELL + 2 * PAD);
  assert.equal(PLOT_H, ROWS * CELL + 2 * PAD);
  for (let x = 0; x <= COLS; x += 1) assert.equal(gx(x), X(x), `gx(${x})`);
  for (let y = 0; y <= ROWS; y += 1) assert.equal(gy(y), Y(y), `gy(${y})`);

  // The three rectangles the figure paints, from the corner coordinates alone.
  // SVG y grows downward, so each rect is anchored at its TOP edge.
  const lowerRect = { x: X(2), y: Y(3), w: (10 - 2) * CELL, h: (3 - 1) * CELL };
  const upperRect = { x: X(2), y: Y(6), w: (5 - 2) * CELL, h: (6 - 3) * CELL };
  const missingRect = { x: X(5), y: Y(6), w: (10 - 5) * CELL, h: (6 - 3) * CELL };
  const wholeRect = { x: X(2), y: Y(6), w: (10 - 2) * CELL, h: (6 - 1) * CELL };

  // the lesson draws exactly those rectangles
  const p = plotPieces();
  assert.deepEqual({ x: gx(PLOT.x0), y: gy(PLOT.cutY), w: p.wide * GRID.cell, h: p.lowerTall * GRID.cell }, lowerRect);
  assert.deepEqual({ x: gx(PLOT.x0), y: gy(PLOT.y1), w: p.upperWide * GRID.cell, h: p.upperTall * GRID.cell }, upperRect);
  assert.deepEqual({ x: gx(PLOT.cutX), y: gy(PLOT.y1), w: p.missingWide * GRID.cell, h: p.upperTall * GRID.cell }, missingRect);
  // and the three of them tile the enclosing rectangle with nothing left over
  assert.equal(lowerRect.w * lowerRect.h + upperRect.w * upperRect.h + missingRect.w * missingRect.h, wholeRect.w * wholeRect.h);
  assert.equal(overlapArea(lowerRect, upperRect), 0);
  assert.equal(overlapArea(lowerRect, missingRect), 0);
  assert.equal(overlapArea(upperRect, missingRect), 0);

  const steps = plotSteps();
  assert.equal(steps.length, 4, "the Next-step button clamps at four steps, so step runs 0..4");
  // each sentence, checked against arithmetic done here rather than by plotPieces
  assert.ok(steps[0].text.includes("10 − 2 = 8") && steps[0].text.includes("6 − 1 = 5"), "step 1 subtracts the coordinates");
  assert.ok(steps[1].text.includes("at y = 3") && steps[1].text.includes("8 wide and 2 tall") && steps[1].text.includes("3 wide and 3 tall"), "step 2 names the two rectangles");
  assert.ok(steps[2].text.includes("8 × 2 = 16") && steps[2].text.includes("3 × 3 = 9") && steps[2].text.includes("16 + 9 = 25"), "step 3 adds the pieces");
  assert.ok(steps[3].text.includes("8 × 5 = 40") && steps[3].text.includes("5 × 3 = 15") && steps[3].text.includes("40 − 15 = 25"), "step 4 subtracts the corner");

  const CORNERS = "(2, 1), (10, 1), (10, 3), (5, 3), (5, 6), (2, 6)";
  for (let step = 0; step <= 4; step += 1) {
    const where = `step ${step}`;

    // every mark the figure paints at this step, and where it paints it
    const rects = [
      ...(step >= 2 ? [lowerRect, upperRect] : []),
      ...(step >= 4 ? [missingRect] : []),
    ];
    for (const r of rects) {
      insideViewBox(`${where} rect top-left`, r.x, r.y, PLOT_W, PLOT_H);
      insideViewBox(`${where} rect bottom-right`, r.x + r.w, r.y + r.h, PLOT_W, PLOT_H);
    }
    const marks: [number, number][] = [
      ...(step >= 2 ? [[X(2), Y(3)], [X(10), Y(3)]] as [number, number][] : []), // the dashed cut
      ...(step >= 3 ? [[X((2 + 10) / 2), Y((1 + 3) / 2) + 4], [X((2 + 5) / 2), Y((3 + 6) / 2) + 4]] as [number, number][] : []), // the 16 and the 9
      ...(step >= 4 ? [[X((5 + 10) / 2), Y((3 + 6) / 2) + 4]] as [number, number][] : []), // the 15
    ];
    for (const [tx, ty] of marks) {
      insideViewBox(`${where} numeral baseline`, tx, ty, PLOT_W, PLOT_H);
      assert.ok(ty - 13 >= 0, `${where}: a numeral's cap height rises above the viewBox`);
    }

    // the ordered list shows exactly the steps already revealed
    assert.equal(steps.slice(0, step).length, step, where);

    // the accessible name names those marks, and only those
    const label = plotAriaLabel(step);
    assert.ok(label.startsWith(`L-shaped plot on a coordinate grid with corners at ${CORNERS}`), `${where}: the label opens with the six corners`);
    assert.equal(label.includes("cut at y = 3 into rectangles 8 by 2 and 3 by 3"), step >= 2, `${where}: cut clause`);
    assert.equal(label.includes("labeled 16 and 9 square units"), step >= 3, `${where}: area-numeral clause`);
    assert.equal(label.includes("missing corner 5 by 3 outlined and labeled 15"), step >= 4, `${where}: missing-corner clause`);
    // no number appears in the label that the figure is not painting at this step
    if (step < 3) assert.ok(!label.includes("16"), `${where}: the label names 16 before it is drawn`);
    if (step < 4) assert.ok(!label.includes("15"), `${where}: the label names 15 before it is drawn`);
  }

  // the label moves whenever the drawing moves, and only then
  assert.equal(plotAriaLabel(1), plotAriaLabel(0), "step 1 adds no marks to the figure, so the label must not change");
  for (const step of [2, 3, 4]) {
    assert.notEqual(plotAriaLabel(step), plotAriaLabel(step - 1), `step ${step} repaints the figure but the label did not change`);
  }
  assert.match(source, /aria-label=\{plotLabel\}/);
  assert.match(source, /const plotLabel = plotAriaLabel\(step\);/);
  assert.match(source, /Math\.min\(steps\.length, s \+ 1\)/);
});

test("worked example: the L-shaped plot is 16 + 9 = 25 and 40 - 15 = 25 square units", () => {
  assert.deepEqual({ ...PLOT }, { x0: 2, y0: 1, x1: 10, y1: 6, cutX: 5, cutY: 3 });
  const p = plotPieces();

  // step 1 - side lengths are differences of coordinates
  assert.equal(p.wide, 10 - 2);
  assert.equal(p.wide, 8);
  assert.equal(p.tall, 6 - 1);
  assert.equal(p.tall, 5);
  // step 2 - the two rectangles the cut at y = 3 makes
  assert.equal(p.lowerTall, 3 - 1);
  assert.equal(p.upperWide, 5 - 2);
  assert.equal(p.upperTall, 6 - 3);
  // step 3 - measure and add
  assert.equal(p.lower, 8 * 2);
  assert.equal(p.lower, 16);
  assert.equal(p.upper, 3 * 3);
  assert.equal(p.upper, 9);
  assert.equal(p.total, 16 + 9);
  assert.equal(p.total, 25);
  // step 4 - the same area by filling in the missing corner and subtracting
  assert.equal(p.whole, 8 * 5);
  assert.equal(p.whole, 40);
  assert.equal(p.missingWide, 10 - 5);
  assert.equal(p.missing, 5 * 3);
  assert.equal(p.missing, 15);
  assert.equal(p.remaining, 40 - 15);
  assert.equal(p.remaining, p.total);
  // the two pieces plus the missing corner tile the enclosing rectangle
  assert.equal(p.lower + p.upper + p.missing, p.whole);

  // the plot and every coordinate label stay inside the viewBox
  assert.equal(PLOT_W, GRID.cols * GRID.cell + 2 * GRID.pad);
  assert.equal(PLOT_H, GRID.rows * GRID.cell + 2 * GRID.pad);
  for (const { at: [x, y], dx, dy, anchor } of PLOT_CORNERS) {
    insideViewBox(`corner (${x}, ${y})`, gx(x), gy(y), PLOT_W, PLOT_H);
    const text = `(${x}, ${y})`.length * 5.5; // 9px mono
    const left = anchor === "end" ? gx(x) + dx - text : gx(x) + dx;
    assert.ok(left >= 0, `label (${x}, ${y}) runs off the left edge`);
    assert.ok(left + text <= PLOT_W, `label (${x}, ${y}) runs off the right edge`);
    assert.ok(gy(y) + dy - 9 >= 0 && gy(y) + dy <= PLOT_H, `label (${x}, ${y}) runs off vertically`);
  }
  assert.ok(gy(0) + 14 <= PLOT_H, "the x-axis numbers fit below the grid");
  assert.ok(gx(0) - 7 - 6 >= 0, "the y-axis numbers fit to the left of the grid");
  assert.deepEqual(PLOT_CORNERS.map(({ at }) => at), [[2, 1], [10, 1], [10, 3], [5, 3], [5, 6], [2, 6]]);
  assert.equal(shoelace(PLOT_CORNERS.map(({ at: [x, y] }) => [gx(x), gy(y)] as [number, number])), p.total * GRID.cell * GRID.cell);

  // the step sentences are built from the computed values, not retyped
  assert.match(source, /\$\{plot\.lower\} \+ \$\{plot\.upper\} = \$\{plot\.total\} square units/);
  assert.match(source, /\$\{plot\.whole\} − \$\{plot\.missing\} = \$\{plot\.remaining\}/);
  assert.doesNotMatch(source, /\b(?:16 \+ 9|40 − 15)\b/);
});

test("try it: wrapping a 4 by 3 by 2 box takes 52 square inches of paper", () => {
  assert.deepEqual({ ...GIFT }, { l: 4, w: 3, h: 2 });
  const g = giftChoices();
  assert.equal(g.surface, 2 * (4 * 3) + 2 * (4 * 2) + 2 * (3 * 2));
  assert.equal(g.surface, 52);
  assert.equal(g.threeFaces, 12 + 8 + 6);
  assert.equal(g.threeFaces, 26);
  assert.equal(g.volume, 4 * 3 * 2);
  assert.equal(g.volume, 24);
  assert.equal(g.edges, 4 * (4 + 3 + 2));
  assert.equal(g.edges, 36);
  assert.equal(g.choices.length, 4);
  assert.equal(new Set(g.choices).size, 4, "the four choices are distinct");
  assert.equal(g.choices[g.correct], 52, "the correct button is the surface area");
  assert.ok(g.correct >= 0 && g.correct < 4);
  // every distractor is a different, wrong quantity
  for (const wrong of [g.threeFaces, g.volume, g.edges]) assert.notEqual(wrong, g.surface);
});

test("try it: every pick gets feedback about the number that pick actually shows", () => {
  const g = giftChoices();
  const notes = giftNotes();
  assert.equal(Object.keys(notes).length, 4, "four distinct choices need four distinct notes");

  // pick runs over null plus the four buttons; the four button states are these
  for (let pick = 0; pick < 4; pick += 1) {
    const value = g.choices[pick];
    const note = notes[value];
    assert.ok(note, `button ${pick} shows ${value} but has no feedback`);
    assert.ok(note.includes(String(value)), `the feedback shown for ${value} never mentions ${value}`);
  }
  // and each note explains the quantity it is keyed to, with arithmetic recomputed here
  assert.ok(notes[26].includes("counts only three faces, 12 + 8 + 6"), "26 = 12 + 8 + 6 is three faces");
  assert.ok(notes[52].includes("2 × 12 = 24, 2 × 8 = 16 and 2 × 6 = 12, and they add to 52"), "52 = 24 + 16 + 12 is the surface area");
  assert.ok(notes[24].includes("is the volume, 4 × 3 × 2"), "24 = 4 x 3 x 2 is the volume");
  assert.ok(notes[36].includes("twelve edges, 4 × (4 + 3 + 2)"), "36 = 4 x 9 is the edge total");

  // the lesson looks the note up by the number tapped, so reordering the buttons
  // cannot pair a student's choice with somebody else's explanation
  assert.match(source, /notes\[gift\.choices\[pick\]\]/);
  assert.doesNotMatch(source, /\{notes\[pick\]\}/);
});

test("lesson source cites only brief standards and keeps its accessibility contract", () => {
  const cited = new Set([...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/g)].map((m) => m[0]));
  assert.ok(cited.size > 0, "the lesson cites at least one standard");
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  const mathCheck = source.slice(source.indexOf("<MathCheck"), source.indexOf("</MathCheck>"));
  for (const id of BRIEF_STANDARDS) assert.ok(mathCheck.includes(`(${id})`), `the Math check cites ${id}`);

  // 6.G.A.3 runs from the side to its length, never back: two corners that share
  // a coordinate need not be joined at all (in the hexagon (0,0),(2,0),(2,1),
  // (3,1),(3,2),(1,2),(1,1),(0,1) the corners (2,1) and (0,1) share y and are
  // joined by no side), so the converse must not appear.
  const flat = mathCheck.replace(/\s+/g, " ");
  assert.match(flat, /when a side joins two corners that share a second coordinate, that side is horizontal and its length is the difference of their first coordinates/);
  assert.doesNotMatch(flat, /share a second coordinate are joined/);
  assert.doesNotMatch(flat, /corners that share a (?:first|second) coordinate are/);

  const svgs = openingTags(source, "<svg");
  assert.equal(svgs.length, 2);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/);
    assert.match(tag, /role="img"/);
    assert.match(tag, /aria-label=\{/);
  }

  const buttons = openingTags(source, "<button");
  assert.ok(buttons.length >= 5, `found ${buttons.length} buttons`);
  for (const tag of buttons) assert.match(tag, /type="button"/);

  // the three steppers declare the bounds the control grid was enumerated over
  for (const [name, [min, max]] of Object.entries(EDGES)) {
    const declared = source.match(new RegExp(`<Stepper label="[^"]+" value=\\{${name}\\} min=\\{(\\d+)\\} max=\\{(\\d+)\\}`));
    assert.ok(declared, `the ${name} stepper declares an inline min and max`);
    assert.equal(Number(declared[1]), min);
    assert.equal(Number(declared[2]), max);
  }
  assert.match(source, /aria-label=\{`Increase \$\{label\}`\}/);
  assert.match(source, /aria-label=\{`Decrease \$\{label\}`\}/);
  assert.match(source, /disabled=\{value <= min\}/);
  assert.match(source, /disabled=\{value >= max\}/);

  // disclosure and choice semantics
  assert.match(source, /aria-expanded=\{revealed\} aria-controls=\{stepsId\}/);
  assert.match(source, /id=\{stepsId\}/);
  assert.match(source, /aria-pressed=\{pick === i\}/);

  assert.match(source, /^"use client";/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-䶿一-鿿]/, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form|next\/image/);
});
