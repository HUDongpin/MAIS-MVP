import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BOX,
  CELL,
  GAP,
  GOLD_GAP,
  GOLD_MAX,
  GOLD_MIN,
  H,
  LABEL_DY,
  LABEL_SIZE,
  PAD_X,
  PANEL_MAX,
  PANEL_MIN,
  SIDE_MAX,
  SIDE_MIN,
  TOP,
  TRY,
  TRY_CHOICES,
  W,
  WE,
  blockHeight,
  blueTiles,
  blueY,
  boxText,
  cellX,
  figureLabel,
  goldY,
  goldRows,
  maxPanels,
  panelWidth,
  panelX,
  perPanel,
  plural,
  rowWidth,
  startX,
  totalGrouped,
  totalSpread,
  tryCorrectIndex,
  trySamples,
  tryTarget,
  workedExample
} from "./ca-g6-ch03-expressions-equations-variables";

const SLUG = "ca-g6-ch03-expressions-equations-variables";
/** The standards listed in the chapter brief for us-ca-math-p6-chapter-03. */
const BRIEF_STANDARDS = [
  "6.EE.A.1", "6.EE.A.2", "6.EE.A.3", "6.EE.A.4",
  "6.EE.B.5", "6.EE.B.6", "6.EE.B.7", "6.EE.B.8",
  "6.EE.C.9"
];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

/** Opening tags for `name`, ending at the `>` that is not inside a JSX brace (arrow functions contain `>`). */
function openingTags(name: string) {
  const tags: string[] = [];
  for (let i = source.indexOf(`<${name}`); i >= 0; i = source.indexOf(`<${name}`, i + 1)) {
    let depth = 0;
    for (let j = i; j < source.length; j += 1) {
      const ch = source[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) {
        tags.push(source.slice(i, j + 1));
        break;
      }
    }
  }
  return tags;
}

/** s² by repeated addition, independent of the lesson's multiplication. */
function squareByAddition(s: number) {
  let total = 0;
  for (let i = 0; i < s; i += 1) total += s;
  return total;
}

test("every reachable (side, gold, panels) state keeps the figure's arithmetic true", () => {
  let states = 0;
  for (let s = SIDE_MIN; s <= SIDE_MAX; s += 1) {
    for (let g = GOLD_MIN; g <= GOLD_MAX; g += 1) {
      for (let n = PANEL_MIN; n <= PANEL_MAX; n += 1) {
        states += 1;

        // the exponent: s² is s used as a factor twice, i.e. s copies of s added up
        const square = squareByAddition(s);
        assert.equal(blueTiles(s), square);
        assert.equal(blueTiles(s), s ** 2);

        // one panel is the blue square plus the gold tiles
        const per = square + g;
        assert.equal(perPanel(s, g), per);

        // the distributive claim: grouping by panel and splitting by color agree,
        // and both equal n panels counted one at a time
        let byHand = 0;
        for (let i = 0; i < n; i += 1) byHand += per;
        assert.equal(totalGrouped(s, g, n), byHand);
        assert.equal(totalSpread(s, g, n), byHand);
        assert.equal(totalSpread(s, g, n), n * square + n * g);

        // the table row: column k always shows k panels' worth of tiles
        for (let k = 1; k <= PANEL_MAX; k += 1) assert.equal(k * per, squareByAddition(s) * k + g * k);

        // the inequality readout: k is the largest whole number with k·per ≤ BOX
        const k = maxPanels(s, g);
        assert.ok(Number.isInteger(k) && k >= 0);
        assert.ok(k * per <= BOX, `${k} panels of ${per} exceed the box`);
        assert.ok((k + 1) * per > BOX, `${k + 1} panels of ${per} should not fit`);

        // the box sentence tells the truth in both branches
        const used = n * per;
        const text = boxText(s, g, n);
        if (used <= BOX) {
          assert.equal(text, `${n} ${n === 1 ? "panel" : "panels"} use ${used} of the ${BOX}, leaving ${BOX - used}.`);
          assert.ok(n <= k);
        } else {
          assert.equal(text, `${n} ${n === 1 ? "panel" : "panels"} would need ${used}, which is ${used - BOX} more than the box holds.`);
          assert.ok(n > k);
        }

        // the SVG's accessible name is true in this state
        const label = figureLabel(s, g, n);
        assert.ok(label.includes(`${n} ${n === 1 ? "panel" : "panels"}`), label);
        assert.ok(label.includes(`${s} by ${s} square of ${square} blue tiles`), label);
        assert.ok(label.includes(`${g} gold ${g === 1 ? "tile" : "tiles"}`), label);
        assert.ok(label.includes(`${used} tiles altogether`), label);
      }
    }
  }
  assert.equal(states, (SIDE_MAX - SIDE_MIN + 1) * (GOLD_MAX - GOLD_MIN + 1) * (PANEL_MAX - PANEL_MIN + 1));
  assert.equal(states, 96);
  assert.equal(plural(1, "tile"), "tile");
  assert.equal(plural(0, "tile"), "tiles");
  assert.equal(plural(2, "panel"), "panels");
});

/* The lesson draws each tile at `panelX(s, n, i) + cellX(s, j)` / `blueY(s, j)` (gold: `goldY(s, j)`),
   so these are the very functions the JSX evaluates — nothing below re-types the drawing formula. */
test("the tile layout the figure draws really is an s by s grid with the gold below it", () => {
  for (let s = SIDE_MIN; s <= SIDE_MAX; s += 1) {
    // read the layout back out of the coordinates instead of restating the formula:
    // s² blue tiles must land on s distinct columns and s distinct rows, one CELL apart, no two sharing a slot
    const slots = new Set<string>();
    const columns = new Set<number>();
    const rows = new Set<number>();
    for (let j = 0; j < s * s; j += 1) {
      slots.add(`${cellX(s, j)}|${blueY(s, j)}`);
      columns.add(cellX(s, j));
      rows.add(blueY(s, j));
    }
    assert.equal(slots.size, s * s, `two blue tiles share a slot at s = ${s}`);
    assert.equal(columns.size, s, `an s by s square needs exactly ${s} columns`);
    assert.equal(rows.size, s, `an s by s square needs exactly ${s} rows`);
    [...columns].sort((a, b) => a - b).forEach((x, k) => assert.equal(x, k * CELL, `column ${k} sits at ${x}`));
    [...rows].sort((a, b) => a - b).forEach((y, k) => assert.equal(y, TOP + k * CELL, `row ${k} sits at ${y}`));

    // reading order: each next tile is one cell right, or wraps to the left edge one cell down
    for (let j = 0; j + 1 < s * s; j += 1) {
      if (blueY(s, j + 1) === blueY(s, j)) {
        assert.equal(cellX(s, j + 1) - cellX(s, j), CELL, `tile ${j + 1} should sit one cell right of ${j}`);
      } else {
        assert.equal(cellX(s, j + 1), 0, `a new row must start at the panel's left edge`);
        assert.equal(blueY(s, j + 1) - blueY(s, j), CELL, `a new row must sit one cell down`);
      }
    }

    // the gold band begins exactly one GOLD_GAP under the bottom of the blue square
    const blueBottom = blueY(s, s * s - 1) + CELL;
    assert.equal(blueBottom, TOP + s * CELL, `${s} rows of ${CELL} starting at ${TOP}`);
    assert.equal(goldY(s, 0) - blueBottom, GOLD_GAP, "gold must start one gap below the blue square");
    for (let g = GOLD_MIN; g <= GOLD_MAX; g += 1) {
      for (let j = 0; j < g; j += 1) {
        assert.ok(goldY(s, j) >= blueBottom + GOLD_GAP, `gold tile ${j} overlaps the blue square`);
        assert.equal(goldY(s, j) - goldY(s, 0), blueY(s, j) - blueY(s, 0), "gold repeats the blue row rhythm");
      }
    }
  }
});

test("every drawn tile, label and panel stays inside the viewBox in every state", () => {
  for (let s = SIDE_MIN; s <= SIDE_MAX; s += 1) {
    for (let g = GOLD_MIN; g <= GOLD_MAX; g += 1) {
      // the gold tiles always have a slot, and never one row more than they need
      const rows = goldRows(s, g);
      assert.ok(rows * s >= g, `${g} gold tiles do not fit in ${rows} row(s) of ${s}`);
      assert.ok((rows - 1) * s < g);
      assert.equal(blockHeight(s, g), s * CELL + GOLD_GAP + rows * CELL);

      for (let n = PANEL_MIN; n <= PANEL_MAX; n += 1) {
        assert.equal(rowWidth(s, n), n * s * CELL + (n - 1) * GAP);
        const left = startX(s, n);
        assert.ok(left >= PAD_X - 1e-9, `row of ${n} starts at ${left}`);
        assert.ok(left + rowWidth(s, n) <= W - PAD_X + 1e-9);
        // the padding clamp never has to fire: every reachable row is genuinely centred
        assert.equal(left, (W - rowWidth(s, n)) / 2, `row of ${n} panels at s = ${s} had to be clamped`);

        for (let i = 0; i < n; i += 1) {
          const x0 = panelX(s, n, i);
          assert.ok(x0 >= left - 1e-9 && x0 + panelWidth(s) <= left + rowWidth(s, n) + 1e-9);
          // blue cells, at the coordinates the <rect> elements actually receive
          for (let j = 0; j < s * s; j += 1) {
            const x = x0 + cellX(s, j);
            const y = blueY(s, j);
            assert.ok(x >= 0 && x + CELL - 2 <= W, `blue cell ${j} at x ${x}`);
            assert.ok(y >= 0 && y + CELL - 2 <= H, `blue cell ${j} at y ${y}`);
            // and inside its own panel, so neighbouring panels never collide
            assert.ok(x >= x0 && x + CELL - 2 <= x0 + panelWidth(s), `blue cell ${j} spills out of its panel`);
          }
          // gold cells sit below the square and inside the block
          for (let j = 0; j < g; j += 1) {
            const x = x0 + cellX(s, j);
            const y = goldY(s, j);
            assert.ok(x >= 0 && x + CELL - 2 <= W, `gold cell ${j} at x ${x}`);
            assert.ok(x >= x0 && x + CELL - 2 <= x0 + panelWidth(s), `gold cell ${j} spills out of its panel`);
            assert.ok(y >= TOP + s * CELL, "gold must not overlap the blue square");
            assert.ok(y + CELL - 2 <= TOP + blockHeight(s, g));
            assert.ok(y + CELL - 2 <= H);
          }
          // the "9+2" caption under each panel, at roughly 0.62em per mono glyph
          const half = (String(s * s + "+" + g).length * LABEL_SIZE * 0.62) / 2;
          const centre = x0 + panelWidth(s) / 2;
          assert.ok(centre - half >= 0 && centre + half <= W, `caption at ${centre}`);
          assert.ok(TOP + blockHeight(s, g) + LABEL_DY + LABEL_SIZE * 0.3 <= H);
        }
      }
    }
  }
});

test("the worked example matches arithmetic done independently", () => {
  assert.deepEqual({ ...WE }, { side: 4, gold: 3, tiles: 76, box: 100 });
  // one club, one box: the worked example may not invent a second tile inventory
  assert.equal(WE.box, BOX, "the worked example must use the box the opening prose names");
  assert.ok(WE.tiles <= BOX, "the wall cannot already hold more tiles than the box contains");
  const we = workedExample();
  // step 1: 4² = 4 × 4 = 16 blue, plus 3 gold, is 19 tiles in a panel
  assert.equal(4 * 4, 16);
  assert.equal(we.blue, 16);
  assert.equal(16 + 3, 19);
  assert.equal(we.per, 19);
  // step 2: 16n + 3n = 19n at a few sample values
  for (const n of [0, 1, 2, 7, 20]) assert.equal(16 * n + 3 * n, 19 * n);
  // steps 3 and 4: 19n = 76 has the solution n = 4, and 19 × 4 = 76
  assert.equal(76 / 19, 4);
  assert.equal(we.panels, 4);
  assert.equal(19 * 4, 76);
  assert.ok(Number.isInteger(we.panels));
  // step 5: 19n ≤ 100 gives n ≤ 5 because 19 × 6 = 114 > 100, and 100 − 95 = 5 is 14 short of 19
  assert.equal(19 * 6, 114);
  assert.ok(114 > 100);
  assert.equal(Math.floor(100 / 19), 5);
  assert.equal(we.fit, 5);
  assert.equal(19 * 5, 95);
  assert.equal(100 - 95, 5);
  assert.equal(we.left, 5);
  assert.equal(19 - 5, 14);
  assert.equal(we.steps.length, 5);
  assert.ok(we.steps[4].text.includes("14 tiles short of one more"));
  // the four panels on the wall are themselves a legal state of the same box
  assert.ok(we.panels <= we.fit, "the wall's panels must fit in the club's own box");
  for (const step of we.steps) assert.ok(step.title.length > 10 && step.text.length > 40);
});

test("Try it: exactly one option equals 5(s² + 3) at every value of s", () => {
  assert.deepEqual({ ...TRY }, { panels: 5, gold: 3 });
  assert.equal(TRY_CHOICES.length, 4);
  const idx = tryCorrectIndex();
  assert.equal(idx, 1);
  assert.equal(TRY_CHOICES[idx].text, "5s² + 15");
  // the target, expanded by hand: 5(s² + 3) = 5s² + 15
  for (let s = 0; s <= 12; s += 1) {
    assert.equal(tryTarget(s), 5 * (s * s + 3));
    assert.equal(tryTarget(s), 5 * s * s + 15);
    assert.equal(TRY_CHOICES[idx].at(s), tryTarget(s));
  }
  // every other option disagrees somewhere in the sample range
  const matching = TRY_CHOICES.filter((c) => trySamples.every((s) => c.at(s) === tryTarget(s)));
  assert.equal(matching.length, 1);
  TRY_CHOICES.forEach((c, i) => {
    if (i === idx) return;
    assert.ok(trySamples.some((s) => c.at(s) !== tryTarget(s)), `${c.text} is never wrong`);
  });
  // the distractors are the named misconceptions: 5s² + 3, s² + 15, (5s)² + 15
  assert.equal(TRY_CHOICES[0].at(2), 5 * 4 + 3);
  assert.equal(TRY_CHOICES[2].at(2), 4 + 15);
  assert.equal(TRY_CHOICES[3].at(2), (5 * 2) ** 2 + 15);
  assert.equal(new Set(TRY_CHOICES.map((c) => c.text)).size, 4);
  for (const c of TRY_CHOICES) assert.ok(c.why.length > 30);
});

test("lesson source cites only brief standards and carries the required attributes", () => {
  assert.ok(source.startsWith('"use client";'));
  assert.match(source, /export default function Lesson\(\)/u);

  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/gu)].map((m) => m[0]);
  assert.ok(cited.length > 0);
  for (const id of cited) assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not in the chapter brief`);
  for (const id of BRIEF_STANDARDS) assert.ok(cited.includes(id), `${id} from the brief is never cited`);

  // the tiles are drawn through the exported helpers, so the layout tests bind to the real coordinates
  assert.match(source, /x=\{panelX\(s, n, i\) \+ cellX\(s, j\)\} y=\{blueY\(s, j\)\}/u);
  assert.match(source, /x=\{panelX\(s, n, i\) \+ cellX\(s, j\)\} y=\{goldY\(s, j\)\}/u);

  // no literal white ink: --ink-soft and --band-* invert between themes, so paired tokens only
  assert.doesNotMatch(source, /color: "white"/u, "use var(--ink) or var(--brand-ink), not literal white");
  assert.doesNotMatch(source, /\btext-white\b/u, "use text-[var(--brand-ink)], not text-white");

  const svgs = openingTags("svg");
  assert.equal(svgs.length, 1);
  for (const tag of svgs) {
    assert.match(tag, /viewBox=/u);
    assert.match(tag, /role="img"/u);
    assert.match(tag, /aria-label=\{figureLabel\(s, g, n\)\}/u);
  }

  const buttons = openingTags("button");
  assert.ok(buttons.length >= 5, "steppers, the worked example and Try it all need buttons");
  for (const tag of buttons) assert.match(tag, /type="button"/u);
  assert.equal(buttons.filter((tag) => /aria-label=\{`(?:Increase|Decrease)/u.test(tag)).length, 2);
  for (const tag of buttons.filter((t) => /aria-label=\{`(?:Increase|Decrease)/u.test(t))) assert.match(tag, /disabled=/u);
  assert.equal(buttons.filter((tag) => /aria-pressed=/u.test(tag)).length, 1);
  assert.equal(buttons.filter((tag) => /aria-expanded=/u.test(tag)).length, 1);
  assert.match(source, /aria-controls=\{stepsId\}/u);
  assert.match(source, /id=\{stepsId\}/u);

  assert.doesNotMatch(source, /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/u, "no CJK characters");
  assert.doesNotMatch(source, /Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form|next\/image/u);
  assert.doesNotMatch(source, /bg-linear-|inset-shadow-|text-shadow-|field-sizing-|not-\[/u);

  // the inline control bounds are the ones the grid test enumerated
  const stepper = (label: string) => {
    const m = source.match(new RegExp(`label="${label}" value=\\{\\w+\\} min=\\{(\\d+)\\} max=\\{(\\d+)\\}`, "u"));
    assert.ok(m, `${label} stepper must declare inline min/max`);
    return [Number(m[1]), Number(m[2])];
  };
  assert.deepEqual(stepper("Tiles per side"), [SIDE_MIN, SIDE_MAX]);
  assert.deepEqual(stepper("Gold tiles per panel"), [GOLD_MIN, GOLD_MAX]);
  const range = source.match(/type="range" min=\{(\d+)\} max=\{(\d+)\} value=\{n\}/u);
  assert.ok(range, "the panels range input must declare inline min/max");
  assert.deepEqual([Number(range[1]), Number(range[2])], [PANEL_MIN, PANEL_MAX]);
});

test("the Math check names the panel behind every rule it states, so \"the rule\" never means two things at once", () => {
  const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

  // The worked example's panel is fixed (WE.side, WE.gold) while the inequality's
  // panel is whatever the sliders say. In 90 of the 96 states those differ, so the
  // callout must say which panel each sentence is about.
  let differing = 0, states = 0;
  for (let s = SIDE_MIN; s <= SIDE_MAX; s += 1) {
    for (let g = GOLD_MIN; g <= GOLD_MAX; g += 1) {
      for (let n = PANEL_MIN; n <= PANEL_MAX; n += 1) {
        states += 1;
        if (perPanel(s, g) !== WE.side ** 2 + WE.gold) differing += 1;
      }
    }
  }
  assert.equal(states, 96);
  assert.equal(differing, 90, "the two panels really do disagree in 90 of the 96 states");

  // The equation sentence must derive its per-panel count on screen, not print a bare 19.
  assert.match(source, /\{WE\.side\}² \+ \{WE\.gold\} = \{we\.per\} tiles a panel/u,
    "the worked example's equation must show where its per-panel count comes from");
  assert.match(source, /For the worked example above/u, "and must say which panel it is about");
  // The inequality sentence must do the same for the live panel.
  assert.match(source, /For the panel you have set right now, \{s\}² \+ \{g\} = \{per\}/u,
    "the inequality must name the live panel it applies to");
  // The old ambiguous opening must not come back.
  assert.equal(source.split("tiles turns the rule into the equation").length - 1, 0);

  assert.equal(workedExample().per, WE.side ** 2 + WE.gold);
});
