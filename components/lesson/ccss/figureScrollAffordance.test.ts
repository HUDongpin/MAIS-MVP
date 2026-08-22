import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const scrollSource = readFileSync("components/lesson/ccss/FigureScroll.tsx", "utf8");
const lessonsDir = "components/lesson/ccss/lessons";

test("a figure that overflows tells the student it can be panned", () => {
  // The hint is measured, not guessed from a breakpoint: whether a figure
  // overflows depends on the figure's own width, not the width of the screen.
  assert.match(scrollSource, /scrollWidth > node\.clientWidth/, "Overflow must be measured, not assumed.");
  assert.match(scrollSource, /ResizeObserver/, "Interactive figures redraw, so the measurement has to re-run.");
  assert.match(
    scrollSource,
    /mask-image:linear-gradient\(to_right,black_calc\(100%-2\.5rem\),transparent\)/,
    "Wide figures should use the same trailing-edge fade as the visualization lab rail."
  );
  // A fade that never goes away would keep implying there is more to see.
  assert.match(scrollSource, /const showFade = isOverflowing && !atEnd;/);
});

test("a pannable figure is reachable by keyboard and announced, but only while it pans", () => {
  assert.match(scrollSource, /data-figure-scroll-region/u);
  assert.match(scrollSource, /role=\{isOverflowing \? "region" : undefined\}/);
  assert.match(scrollSource, /tabIndex=\{isOverflowing \? 0 : undefined\}/);
  assert.match(scrollSource, /aria-label=\{isOverflowing \? "Scrollable diagram/);
});

test("CCSS lesson figures route their horizontal scrolling through FigureScroll", () => {
  // A raw `overflow-x-auto` div inside a lesson is a scroller with no affordance
  // — the state every one of these was in before. Keep them going through the
  // shared component so the hint cannot be forgotten on the next ported lesson.
  const offenders: string[] = [];
  for (const file of readdirSync(lessonsDir)) {
    if (!file.endsWith(".tsx")) continue;
    const source = readFileSync(join(lessonsDir, file), "utf8");
    if (source.includes('className="w-full overflow-x-auto"')) offenders.push(file);
  }

  assert.deepEqual(
    offenders,
    [],
    `These lesson figures scroll horizontally without the pan affordance: ${offenders.join(", ")}`
  );
});

test("every lesson that renders FigureScroll imports it", () => {
  const missing: string[] = [];
  for (const file of readdirSync(lessonsDir)) {
    if (!file.endsWith(".tsx")) continue;
    const source = readFileSync(join(lessonsDir, file), "utf8");
    if (!source.includes("<FigureScroll>")) continue;
    if (!source.includes('from "@/components/lesson/ccss/FigureScroll"')) missing.push(file);
  }

  assert.deepEqual(missing, [], `Missing FigureScroll import: ${missing.join(", ")}`);
});
