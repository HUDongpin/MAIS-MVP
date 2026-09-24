import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BARREL_B,
  EXAMPLE,
  H,
  MINUTE_MAX,
  MINUTE_MIN,
  NOT_A_FUNCTION,
  PAD_B,
  PAD_L,
  PAD_R,
  PAD_T,
  POINT_DY,
  RATE_MAX,
  RATE_MIN,
  RISE_DX,
  RUN_DY,
  RUN_MAX,
  RUN_MIN,
  START_MAX,
  START_MIN,
  START_STEP,
  TICKS,
  TICK_Y,
  TRY,
  W,
  Y_MAX,
  barrelB,
  barrelSentence,
  bDrop,
  bMinutes,
  clamp,
  compareSentence,
  differences,
  equationText,
  exampleSteps,
  figureLabel,
  fmt,
  fuller,
  nonFunctionSentence,
  plural,
  pointLabel,
  rateOfChange,
  readout,
  repeatedInput,
  riseLabel,
  ruleBadge,
  runLabel,
  scaleX,
  scaleY,
  shapeNote,
  signed,
  similarSentence,
  solveExample,
  stepCellText,
  stepLeft,
  stepSentence,
  tryChoices,
  volume,
  volumes,
  type Label
} from "./ca-g8-ch02-functions-rate-change";

const SLUG = "ca-g8-ch02-functions-rate-change";
/** Exactly the standards listed in the chapter brief for us-ca-math-s2-chapter-02. */
const BRIEF_STANDARDS = ["8.EE.B.5", "8.EE.B.6", "8.F.A.1", "8.F.A.2", "8.F.A.3", "8.F.B.4", "8.F.B.5"];
/** The ones this lesson actually develops. 8.F.B.5 belongs to "Graphs Tell Stories": no graph here ever falls or bends. */
const DEVELOPED = ["8.EE.B.5", "8.EE.B.6", "8.F.A.1", "8.F.A.2", "8.F.A.3", "8.F.B.4"];
const source = readFileSync(path.join(process.cwd(), "components/lesson/ccss/lessons", `${SLUG}.tsx`), "utf8");

/** The full reachable control grid: rate × start × marked minute × step width. */
const RATES = Array.from({ length: RATE_MAX - RATE_MIN + 1 }, (_, i) => RATE_MIN + i);
const STARTS = Array.from({ length: (START_MAX - START_MIN) / START_STEP + 1 }, (_, i) => START_MIN + i * START_STEP);
const MINUTES = Array.from({ length: MINUTE_MAX - MINUTE_MIN + 1 }, (_, i) => MINUTE_MIN + i);
const RUNS = Array.from({ length: RUN_MAX - RUN_MIN + 1 }, (_, i) => RUN_MIN + i);

/* ---------------------------------------------------------------------------
 * Independent re-implementations. Nothing below calls the lesson helper it is
 * checking: the arithmetic and the wording are written out a second time here,
 * so a mutation in the lesson has to be reproduced here to survive.
 * ------------------------------------------------------------------------ */
const litersWord = (n: number) => (n === 1 ? "1 liter" : `${n} liters`);
const minutesWord = (n: number) => (n === 1 ? "1 minute" : `${n} minutes`);
/** Where the drawn step starts: at least minute 1, and never past the right edge. */
const expectedLeft = (minute: number, run: number) => (minute < 1 ? 1 : minute > MINUTE_MAX - run ? MINUTE_MAX - run : minute);
const expectedVolume = (start: number, rate: number, minute: number) => {
  let total = start;
  for (let t = 0; t < minute; t += 1) total += rate; // repeated addition, not rate × minute
  return total;
};

function expectedStepSentence(start: number, rate: number, minute: number, run: number) {
  const left = expectedLeft(minute, run), right = left + run, rise = expectedVolume(start, rate, right) - expectedVolume(start, rate, left);
  if (rate === 0) {
    return `Every step down the table is 0. The step you set runs from minute ${left} to minute ${right}, ${minutesWord(run)} across, and rises nothing, so rise ÷ run is 0 ÷ ${run} = 0 and the line is flat.`;
  }
  return `The faint step at the far left is 1 minute across and ${litersWord(rate)} tall. The step you set, from minute ${left} to minute ${right}, is ${minutesWord(run)} across and ${litersWord(rise)} tall: the same shape at ${run} times the size. Both give the same rise ÷ run, ${rise} ÷ ${run} = ${rate} and ${rate} ÷ 1 = ${rate}, which is why the graph is straight.`;
}

function expectedSimilarSentence(rate: number, run: number) {
  const rise = expectedVolume(0, rate, run); // rate added run times
  if (rate === 0) return `With nothing coming in, the step you set is ${minutesWord(run)} across and rises 0, so rise ÷ run is 0 and no triangle forms at all.`;
  return `The faint step at the left of the graph has run 1 and rise ${rate}; the step you set has run ${run} and rise ${rise}, so the two right triangles are similar and rise ÷ run is ${rise} ÷ ${run} = ${rate} either way.`;
}

function expectedFigureLabel(start: number, rate: number, minute: number, run: number) {
  const v = expectedVolume(start, rate, minute), left = expectedLeft(minute, run);
  const climb = rate === 0 ? "staying level because nothing is being added" : `climbing ${litersWord(rate)} every minute`;
  return `Graph of barrel A, drawn on a liters axis fixed from 0 to 60: a straight line beginning at ${litersWord(start)} and ${climb}, with minute ${minute} marked at ${litersWord(v)} and a step from minute ${left} to minute ${left + run} of run ${run} and rise ${expectedVolume(0, rate, run)}.`;
}

function expectedBarrelSentence(start: number, rate: number, minute: number) {
  const a = expectedVolume(start, rate, minute);
  const b = 24 - 3 * minute; // barrel B starts at 24 and loses 3 liters a minute
  const who = a > b ? "A" : b > a ? "B" : "same";
  return `B drops 6 liters every 2 minutes, so its rate of change is −6 ÷ 2 = −3 liters per minute: B is emptying while A is ${rate === 0 ? "holding steady" : "filling"}. At minute ${minute}, A holds ${litersWord(a)} and B holds ${litersWord(b)}${who === "same" ? ", the same amount" : `, so barrel ${who} holds more`}. No graph of B was needed.`;
}

/** Generous per-glyph advance: every label here is digits, parens and lower-case latin, all under 0.62em. */
const CHAR_W = 0.62;
type Box = { name: string; x0: number; x1: number; y0: number; y1: number };
function boxOf(label: Label, fontSize: number): Box {
  const w = label.text.length * CHAR_W * fontSize;
  const x0 = label.anchor === "end" ? label.x - w : label.anchor === "middle" ? label.x - w / 2 : label.x;
  return { name: `"${label.text}"`, x0, x1: x0 + w, y0: label.y - fontSize, y1: label.y + fontSize * 0.22 };
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test("the control grid the test enumerates is the one the lesson declares inline", () => {
  assert.ok(source.includes(`value={rate} min={${RATE_MIN}} max={${RATE_MAX}} color={ACCENT} onChange={setRate}`));
  assert.ok(source.includes(`value={start} min={${START_MIN}} max={${START_MAX}} step={${START_STEP}} color={ACCENT} onChange={setStart}`));
  assert.ok(source.includes(`value={runWidth} min={${RUN_MIN}} max={${RUN_MAX}} color={RIVAL} onChange={setRunWidth}`));
  assert.ok(source.includes(`type="range" min={${MINUTE_MIN}} max={${MINUTE_MAX}}`));
  assert.deepEqual(RATES, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(STARTS, [0, 4, 8, 12, 16, 20]);
  assert.deepEqual(MINUTES, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(RUNS, [1, 2, 3]);
  assert.equal(RATES.length * STARTS.length * MINUTES.length * RUNS.length, 882);
});

test("the stepper clamps at both bounds and disables there", () => {
  assert.equal(clamp(7, 0, 6), 6);
  assert.equal(clamp(-1, 0, 6), 0);
  assert.equal(clamp(3, 0, 6), 3);
  assert.equal(clamp(24, 0, 20), 20);
  // Twenty presses of "+" from the floor can never leave the declared range.
  for (const [min, max, step] of [[RATE_MIN, RATE_MAX, 1], [START_MIN, START_MAX, START_STEP], [RUN_MIN, RUN_MAX, 1]]) {
    let up = min, down = max;
    for (let i = 0; i < 20; i += 1) {
      up = clamp(up + step, min, max);
      down = clamp(down - step, min, max);
      assert.ok(up >= min && up <= max, `stepper ran past ${max}`);
      assert.ok(down >= min && down <= max, `stepper ran past ${min}`);
    }
    assert.equal(up, max);
    assert.equal(down, min);
  }
  assert.ok(source.includes("onClick={() => onChange(clamp(value - step, min, max))} disabled={value <= min}"));
  assert.ok(source.includes("onClick={() => onChange(clamp(value + step, min, max))} disabled={value >= max}"));
});

test("the liters axis is fixed, so no two settings can draw the same picture", () => {
  // Tall enough for the highest reachable reading, and divisible by 4 so the tick labels are whole liters.
  assert.equal(START_MAX + RATE_MAX * MINUTE_MAX, 56);
  assert.ok(Y_MAX >= 56, "the fixed axis must cover the fullest barrel");
  assert.equal(Y_MAX % 4, 0);
  assert.deepEqual(TICKS, [0, 15, 30, 45, 60]);
  assert.equal(scaleX(MINUTE_MIN), PAD_L);
  assert.equal(scaleX(MINUTE_MAX), W - PAD_R);
  assert.equal(scaleY(0), H - PAD_B);
  assert.equal(scaleY(Y_MAX), PAD_T);

  // One liter is the same number of pixels in every state.
  const perLiter = (H - PAD_T - PAD_B) / Y_MAX;
  for (const rate of RATES) {
    for (const start of STARTS) {
      for (const minute of MINUTES.slice(0, MINUTE_MAX)) {
        const climb = scaleY(volume(start, rate, minute)) - scaleY(volume(start, rate, minute + 1));
        assert.ok(Math.abs(climb - rate * perLiter) < 1e-9, `rate ${rate} climbs ${climb}px, not ${rate * perLiter}px`);
      }
    }
  }
  // A steeper rate is always a visibly steeper line.
  for (let r = RATE_MIN; r < RATE_MAX; r += 1) {
    assert.ok(r * perLiter < (r + 1) * perLiter, `rate ${r} must draw flatter than rate ${r + 1}`);
  }
  // Every one of the 42 settings paints a distinct polyline.
  const seen = new Map<string, string>();
  for (const rate of RATES) {
    for (const start of STARTS) {
      const fingerprint = volumes(start, rate).map((v, t) => `${scaleX(t).toFixed(4)},${scaleY(v).toFixed(4)}`).join(" ");
      const clash = seen.get(fingerprint);
      assert.equal(clash, undefined, `rate ${rate}, start ${start} draws exactly the same line as ${clash}`);
      seen.set(fingerprint, `rate ${rate}, start ${start}`);
    }
  }
  assert.equal(seen.size, 42);
});

test("every reachable state keeps the barrel figure true and inside its viewBox", () => {
  for (const rate of RATES) {
    for (const start of STARTS) {
      const table = volumes(start, rate);
      const where = `rate ${rate}, start ${start}`;

      // The table is the linear rule, and its first differences are the rate.
      assert.equal(table.length, MINUTE_MAX + 1, where);
      table.forEach((v, t) => assert.equal(v, expectedVolume(start, rate, t), `${where}, minute ${t}`));
      const gaps = differences(start, rate);
      assert.equal(gaps.length, MINUTE_MAX, where);
      gaps.forEach((d, i) => {
        assert.equal(d, rate, `${where}: step ${i} is not the rate`);
        assert.equal(stepCellText(d), rate === 0 ? "0" : `+${rate}`, `${where}: printed step cell`);
      });

      // Rise over run is the same rate between EVERY pair of table minutes.
      for (let a = 0; a <= MINUTE_MAX; a += 1) {
        for (let b = a + 1; b <= MINUTE_MAX; b += 1) {
          assert.equal(rateOfChange(table[a], table[b], a, b), rate, `${where}: slope from ${a} to ${b}`);
        }
      }

      assert.equal(ruleBadge(start, rate), `× ${rate}, then + ${start}`, where);
      assert.equal(equationText(start, rate), start === 0 ? `liters = ${rate} × minutes` : `liters = ${rate} × minutes + ${start}`, where);

      for (const minute of MINUTES) {
        const v = volume(start, rate, minute);
        assert.equal(v, expectedVolume(start, rate, minute), `${where}, minute ${minute}`);
        if (start === 0 && minute > 0) assert.equal(v / minute, rate, `${where}: unit rate at minute ${minute}`);
        if (start > 0 && rate > 0 && minute > 0) assert.notEqual(v / minute, rate, `${where}: must not be proportional`);
        assert.equal(readout(v), litersWord(v), `${where}, minute ${minute}`);

        // Comparing with barrel B, which is only ever given as a table.
        assert.equal(barrelB(minute), 24 - 3 * minute, `barrel B at minute ${minute}`);
        assert.ok(barrelB(minute) > 0, `barrel B must never read empty inside the window (minute ${minute})`);
        assert.equal(fuller(start, rate, minute), v > barrelB(minute) ? "A" : barrelB(minute) > v ? "B" : "same", `${where}, minute ${minute}`);
        assert.equal(barrelSentence(start, rate, minute), expectedBarrelSentence(start, rate, minute), `${where}, minute ${minute}`);

        for (const run of RUNS) {
          const left = stepLeft(minute, run), right = left + run;
          assert.equal(left, expectedLeft(minute, run), `${where}: step start at minute ${minute}, run ${run}`);
          assert.ok(left >= 1 && right <= MINUTE_MAX, `${where}: step ${left}-${right} leaves the domain`);
          assert.equal(right - left, run, `${where}: the drawn run must be ${run} minutes`);
          assert.equal(table[right] - table[left], rate * run, `${where}: the drawn rise must be rate × run`);

          // Every sentence and label the figure paints, against text written out a second time.
          const runLab = runLabel(start, rate, minute, run), riseLab = riseLabel(start, rate, minute, run), pointLab = pointLabel(start, rate, minute);
          assert.equal(runLab.text, `run ${run}`);
          assert.equal(riseLab.text, `rise ${expectedVolume(0, rate, run)}`);
          assert.equal(pointLab.text, `(${minute}, ${expectedVolume(start, rate, minute)})`);
          assert.equal(stepSentence(start, rate, minute, run), expectedStepSentence(start, rate, minute, run), `${where}, minute ${minute}, run ${run}`);
          assert.equal(similarSentence(rate, run), expectedSimilarSentence(rate, run), `rate ${rate}, run ${run}`);

          // The accessible description never lies: start, climb rate, marked point and step, all of it.
          const spoken = figureLabel(start, rate, minute, run);
          assert.equal(spoken, expectedFigureLabel(start, rate, minute, run), `${where}, minute ${minute}, run ${run}`);
          assert.equal(spoken.includes("staying level"), rate === 0, spoken);
          if (rate > 0) assert.ok(spoken.includes(`climbing ${litersWord(rate)} every minute`), spoken);
          assert.ok(!/\b1 liters\b/.test(spoken), `${spoken} must not say "1 liters"`);
          assert.ok(!/\b(?:0|[2-9]|\d\d+) liter\b/.test(spoken), `${spoken} must not use a singular after a plural count`);

          // Painted geometry: the anchors of the step, the marked dot, and the three labels.
          const geometry = [scaleX(left), scaleX(right), scaleX(minute)];
          geometry.forEach((x) => assert.ok(x >= PAD_L && x <= W - PAD_R, `${where}: x=${x} left the plot`));
          [table[left], table[right], v].forEach((liters) => {
            const y = scaleY(liters);
            assert.ok(y >= PAD_T && y <= H - PAD_B, `${where}: y=${y} left the plot`);
          });
          assert.equal(runLab.y, scaleY(table[left]) + RUN_DY, "the run label must sit BELOW the run segment");
          assert.equal(riseLab.x, scaleX(right) + RISE_DX, "the rise label must sit RIGHT of the rise segment");
          assert.equal(pointLab.y, scaleY(v) - POINT_DY, "the point label must sit ABOVE the marked point");

          const boxes: Box[] = [
            boxOf(runLab, 11),
            boxOf(pointLab, 12),
            ...(rate > 0 ? [boxOf(riseLab, 11)] : []),
            ...TICKS.map((t) => boxOf({ x: PAD_L - 8, y: scaleY(t) + 4, anchor: "end", text: `${t}` }, 11)),
            ...MINUTES.map((t) => boxOf({ x: scaleX(t), y: TICK_Y, anchor: "middle", text: `${t}` }, 11)),
            boxOf({ x: (PAD_L + W - PAD_R) / 2, y: H - 4, anchor: "middle", text: "minutes" }, 11),
            boxOf({ x: 4, y: PAD_T - 14, anchor: "start", text: "liters" }, 11)
          ];
          for (const box of boxes) {
            assert.ok(box.x0 >= 0 && box.x1 <= W, `${where}, minute ${minute}, run ${run}: ${box.name} leaves the ${W}px viewBox (${box.x0}..${box.x1})`);
            assert.ok(box.y0 >= 0 && box.y1 <= H, `${where}, minute ${minute}, run ${run}: ${box.name} leaves the ${H}px viewBox (${box.y0}..${box.y1})`);
          }
          for (let i = 0; i < boxes.length; i += 1) {
            for (let j = i + 1; j < boxes.length; j += 1) {
              assert.ok(
                !overlaps(boxes[i], boxes[j]),
                `${where}, minute ${minute}, run ${run}: ${boxes[i].name} and ${boxes[j].name} are painted on top of each other`
              );
            }
          }
        }
      }

      // The prose that names the shape of the graph.
      const note = shapeNote(start, rate);
      if (rate === 0) {
        assert.ok(note.includes("flat line") && note.includes("rate of change 0"), note);
      } else if (start === 0) {
        assert.ok(note.includes("proportional") && !note.includes("not proportional"), note);
        assert.ok(note.includes(`liters = ${rate} × minutes`), note);
      } else {
        assert.ok(note.includes("not proportional"), note);
        assert.ok(note.includes(`liters = ${rate} × minutes + ${start}`), note);
      }
    }
  }
});

test("barrel B's table recovers its rate of change by division", () => {
  const minutes = bMinutes();
  assert.deepEqual(minutes, [0, 2, 4, 6]);
  assert.equal(bDrop(), -6);
  // Independent: each printed jump is 6 liters down over 2 minutes, i.e. -3 per minute.
  for (let i = 1; i < minutes.length; i += 1) {
    assert.equal(barrelB(minutes[i]) - barrelB(minutes[i - 1]), -6);
    assert.equal((barrelB(minutes[i]) - barrelB(minutes[i - 1])) / BARREL_B.every, -3);
    assert.equal(BARREL_B.rate, -3);
  }
  assert.deepEqual(minutes.map(barrelB), [24, 18, 12, 6]);
  assert.equal(signed(bDrop()), "−6");
  assert.equal(plural(BARREL_B.rate, "liter"), "liters");
  assert.equal(
    compareSentence(),
    "dividing −6 by 2 recovers its rate of −3 liters per minute, so two functions given in different forms can still be compared"
  );
});

test("the non-example really is not a function", () => {
  const hit = repeatedInput(NOT_A_FUNCTION) ?? { x: -1, ys: [] as number[] };
  assert.equal(hit.x, 2, "the non-example table must repeat minute 2");
  assert.deepEqual(hit.ys, [30, 34]);
  // Independent count: minute 2 is the only input listed twice, and its two outputs differ.
  const inputs = NOT_A_FUNCTION.map(([x]) => x);
  assert.deepEqual(inputs, [0, 1, 2, 2, 3]);
  assert.equal(inputs.filter((x) => x === 2).length, 2);
  assert.notEqual(NOT_A_FUNCTION[2][1], NOT_A_FUNCTION[3][1]);
  assert.equal(
    nonFunctionSentence(),
    "Minute 2 is listed twice, once at 30 and once at 34 liters. One input, two different outputs: this rule is not a function. The barrel rule never does that — name a minute and it answers with exactly one reading."
  );
  // The barrel rule itself never repeats an input, in any state.
  for (const rate of RATES) {
    for (const start of STARTS) {
      const rows = volumes(start, rate).map((v, t) => [t, v] as const);
      assert.equal(repeatedInput(rows), null, `rate ${rate}, start ${start}: the barrel rule must stay a function`);
    }
  }
});

test("the worked example's candle arithmetic is right at every step", () => {
  const ex = solveExample();
  // Recomputed here from the two readings (2 h, 17 cm) and (5 h, 11 cm).
  assert.equal(EXAMPLE.t1, 2);
  assert.equal(EXAMPLE.h1, 17);
  assert.equal(EXAMPLE.t2, 5);
  assert.equal(EXAMPLE.h2, 11);
  assert.equal(EXAMPLE.target, 7);
  assert.equal(ex.rise, 11 - 17);
  assert.equal(ex.rise, -6);
  assert.equal(ex.run, 5 - 2);
  assert.equal(ex.run, 3);
  assert.equal(ex.rate, -6 / 3);
  assert.equal(ex.rate, -2);
  assert.equal(ex.start, 17 + 2 * 2); // undo two hours of burning 2 cm per hour
  assert.equal(ex.start, 21);
  assert.equal(ex.check, 21 - 2 * 5);
  assert.equal(ex.check, EXAMPLE.h2);
  assert.equal(ex.height, 21 - 2 * 7);
  assert.equal(ex.height, 7);
  assert.equal(ex.burnout, 21 / 2);
  assert.equal(ex.burnout, 10.5);
  assert.equal(fmt(ex.rate), "−2");
  assert.equal(fmt(ex.burnout), "10.5");
  assert.equal(signed(ex.rise), "−6");
});

test("every line the worked example prints says what the arithmetic says", () => {
  const steps = exampleSteps();
  assert.equal(steps.length, 6);
  assert.deepEqual(steps.map((s) => s.title), [
    "Find the two changes",
    "Divide to get the rate of change",
    "Back up to hour 0",
    "Write the rule",
    "Check the other reading",
    "Predict and finish"
  ]);
  // Written out by hand from 17 cm at 2 h and 11 cm at 5 h: rate −2, start 21.
  assert.equal(steps[0].math, "Δ height = 11 − 17 = −6 cm     Δ time = 5 − 2 = 3 h");
  assert.equal(steps[1].math, "−6 ÷ 3 = −2 cm per hour");
  assert.equal(steps[2].math, "17 − (−2)(2) = 21 cm");
  assert.equal(steps[3].math, "h = −2t + 21");
  assert.equal(steps[4].math, "(−2)(5) + 21 = 11 cm");
  assert.equal(steps[5].math, "h(7) = 7 cm     −2t + 21 = 0 → t = 10.5 h");
  assert.ok(steps[1].note.includes("loses 2 cm each hour"), steps[1].note);
  assert.ok(steps[2].note.includes("undo 2 hours of burning"), steps[2].note);
  assert.ok(steps[4].note.includes("second measurement, 11 cm"), steps[4].note);
  assert.ok(steps[5].note.includes("After 7 hours the candle is 7 cm tall"), steps[5].note);
  // Step 2's division is rise ÷ run, never run ÷ rise.
  assert.ok(!steps[1].math.startsWith("3 ÷"), steps[1].math);
});

test("the Try it answer is the mathematically correct comparison", () => {
  const { options, pRate, qRate, correct } = tryChoices();
  assert.equal(options.length, 4);
  // P is y = 4x + 3; Q's table is (0, 7), (2, 15), (4, 23).
  assert.equal(TRY.p.rate, 4);
  assert.equal(pRate, 4);
  assert.equal((15 - 7) / (2 - 0), 4);
  assert.equal((23 - 15) / (4 - 2), 4);
  assert.equal((23 - 7) / (4 - 0), 4); // Q really is linear, so any pair gives the same rate
  assert.equal(qRate, 4);
  assert.equal(correct, 2);
  assert.equal(options[correct].label, "They change at the same rate");
  assert.ok(options[correct].why.includes("8 ÷ 2 = 4"));
  // The two distractors that name a winner are both wrong because the rates tie.
  assert.notEqual(pRate > qRate, true);
  assert.notEqual(qRate > pRate, true);
});

test("the lesson source obeys the gates the audits enforce", () => {
  const cited = [...source.matchAll(/\b(?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+\b/g)].map((m) => m[0]);
  assert.ok(cited.length > 0, "the lesson must cite the standards it develops");
  for (const id of new Set(cited)) {
    assert.ok(BRIEF_STANDARDS.includes(id), `${id} is not one of this chapter's standards`);
  }
  assert.deepEqual([...new Set(cited)].sort(), DEVELOPED, "the lesson must cite exactly the standards it develops");
  assert.ok(!cited.includes("8.F.B.5"), "no graph here ever falls or bends, so 8.F.B.5 stays with Graphs Tell Stories");

  const svgs = [...source.matchAll(/<svg\b/g)];
  assert.equal(svgs.length, 1, "the lesson has exactly one central figure svg");
  for (const match of svgs) {
    const tag = source.slice(match.index ?? 0, source.indexOf(">", match.index ?? 0));
    assert.ok(tag.includes("viewBox="), `svg without a viewBox: ${tag}`);
    assert.ok(tag.includes('role="img"'), `svg without role="img": ${tag}`);
    assert.ok(tag.includes("aria-label="), `svg without an aria-label: ${tag}`);
  }

  const buttons = [...source.matchAll(/<button\b/g)];
  // reveal, start over, the non-function disclosure, the mapped Try it choice, and the two stepper arrows
  assert.equal(buttons.length, 6, "the lesson needs its reveal, reset, disclosure, choice and stepper buttons");
  for (const match of buttons) {
    assert.ok(
      source.startsWith('<button type="button"', match.index ?? 0),
      `every button must declare type="button" (offset ${match.index})`
    );
  }

  // The JSX must print through the tested builders, never re-inline a sentence.
  for (const fragment of [
    "aria-label={figureLabel(start, rate, minute, runWidth)}",
    ">{runLab.text}<",
    ">{riseLab.text}<",
    ">{pointLab.text}<",
    "{ruleBadge(start, rate)}",
    "{readout(litres)}",
    "{stepCellText(d)}",
    "{stepSentence(start, rate, minute, runWidth)}",
    "{barrelSentence(start, rate, minute)}",
    "{nonFunctionSentence()}",
    "{similarSentence(rate, runWidth)}",
    "{compareSentence()}",
    "{equationText(start, rate)}",
    "{s.math}"
  ]) {
    assert.ok(source.includes(fragment), `the figure must render ${fragment}`);
  }

  // The drawn geometry goes through the same scale functions the grid loop checks, at the same minutes.
  for (const fragment of [
    "<line x1={scaleX(0)} y1={scaleY(table[0])} x2={scaleX(MINUTE_MAX)} y2={scaleY(table[MINUTE_MAX])}",
    "<circle key={t} cx={scaleX(t)} cy={scaleY(v)} r={3.5}",
    "<circle cx={scaleX(minute)} cy={scaleY(litres)} r={7}",
    "<line x1={scaleX(left)} y1={scaleY(table[left])} x2={scaleX(right)} y2={scaleY(table[left])}",
    "<line x1={scaleX(right)} y1={scaleY(table[left])} x2={scaleX(right)} y2={scaleY(table[right])}",
    "<line x1={scaleX(0)} y1={scaleY(table[0])} x2={scaleX(1)} y2={scaleY(table[0])}",
    "<line x1={scaleX(1)} y1={scaleY(table[0])} x2={scaleX(1)} y2={scaleY(table[1])}"
  ]) {
    assert.ok(source.includes(fragment), `the figure must draw ${fragment}`);
  }

  assert.ok(source.startsWith('"use client";'), "the lesson is a client component");
  assert.ok(source.includes("export default function Lesson()"), "the default export must be Lesson");
  assert.ok(source.includes("aria-pressed={pick === i}"), "the choice buttons must expose their selected state");
  assert.ok(source.includes("aria-controls={stepsId}") && source.includes("id={stepsId}"), "the reveal must control a real element");
  assert.ok(source.includes("aria-controls={trapId}") && source.includes("id={trapId}"), "the non-function disclosure must control a real element");
  assert.ok(!/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(source), "no CJK or fullwidth characters in a California lesson");
  assert.ok(!/Math\.random|fetch\(|localStorage|dangerouslySetInnerHTML|<form\b/.test(source), "no forbidden runtime features");
});
