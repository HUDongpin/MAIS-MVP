'use client';

/* ============================================================================
   MeanLab — an interactive "bench" for the ARITHMETIC MEAN (the average): the
   fair share you get when you pool everything and split it equally.  Build a row
   of towers out of unit cubes — one tower per data value — then LEVEL them: pour
   cubes off the tall towers into the short ones until every tower is the same
   height.  That common height IS the mean.  The lab's thesis is the mean's two
   working truths, told with cubes:
       mean = total ÷ n        (share the cubes out equally)
       total = mean × n        (undo it: the leveled cubes form an n × mean block)
   and the fact that makes leveling possible — the cubes GIVEN by the towers above
   the mean exactly equal the cubes NEEDED by the towers below it.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 4–6
   (CCSS 5.MD / 6.SP.B.5.c "summarize a data set... the mean as a fair or equal
   share... and relate the choice of measures of center to the shape of the
   distribution").  A child who can add and divide meets the average as a
   physical act — redistribution — and then meets its algebra: because the total
   never changes when you share it out, mean × n must give the total back, which
   is exactly the tool you need for a missing-value problem ("what score do I need
   to average an 8?").

   Deliberately DISTINCT from its sibling DataLab (which teaches mode/median/mean/
   range on a DOT PLOT and frames the mean as the BALANCE POINT / fulcrum).  This
   lab is MEAN-ONLY, its object is a row of UNIT-CUBE TOWERS (not a dot plot), and
   its story is FAIR SHARE + the algebra of totals (mean×n = total, and the
   missing value), not the horizontal balance identity.  The two labs are two
   different windows onto the same number and never repeat each other.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls (here, LENSES) that unlock one per lesson step, predict-then-check
   questions gated on ANSWERED not correct, and a calibration challenge with a
   live match meter and a CALIBRATED stamp.

   One-accent discipline: CARMINE is the one mathematical object the lab reveals —
   the MEAN: the mean line, the mean pill, the "n × mean" rectangle, the give/take
   shading, the unknown tower in the challenge, the mean readout.  Everything else
   is quiet: the cubes are slate-blue (the data), gridlines and axes are faint,
   the target in the challenge is neutral grey.  Green is reserved for CALIBRATED.

   All arithmetic is EXACT integer math, so a K-12 student never meets a float
   artefact like 4.30000000004:
     • tower heights (data values) are integers 1…10; the count n is 2…8.
     • the mean is kept as the exact fraction sum/n, reduced by an integer gcd,
       and rendered as an integer, an exact terminating decimal (integer long
       division), or a clearly-marked "≈" 2-decimal rounding.
     • total = mean × n is a pure integer identity (sum).
     • the give/take identity is checked in ×n integer units:
       Σ over v>mean of (v·n − sum)  ===  Σ over v<mean of (sum − v·n), exactly.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MeanLab.jsx
     2. Import and render it:
          import MeanLab from './MeanLab';
          export default function Page() { return <MeanLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the tower array, which
              lenses are on, the lesson step, the challenge target).
     MODEL  — the mean and its identities are exact integer arithmetic (no pixels).
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The "dials" here are LENSES, not sliders: the data is
   built by sculpting towers of unit cubes (click / drag a tower to set its
   height, +/- to add or remove towers), and each lens unlocks one per lesson
   step and overlays that idea on the picture — so the picture never runs ahead
   of the idea.  Heights are small integers so every cube is countable and every
   answer is classroom-clean.
   ------------------------------------------------------------------------- */
const HMIN = 1; // a tower is at least 1 cube tall (0 would be an invisible tower)
const HMAX = 10; // ... and at most 10 cubes
const MIN_TOWERS = 2;
const MAX_TOWERS = 8;

// a friendly starting set: clearly uneven, but it levels to a clean mean of 5
const START_DATA = [3, 8, 4, 5];

const STEP_MEET = 0; // meet the towers — build them
const STEP_TOTAL = 1; // add them all up — the total
const STEP_SHARE = 2; // share equally — mean = total ÷ n (Level animation)
const STEP_RECT = 3; // the leveled block — total = mean × n
const STEP_GIVE = 4; // give and take — the surplus above = the shortfall below
const STEP_FRAC = 5; // when it won't divide evenly — a fractional mean
const STEP_CALIB = 6; // the challenge — set the unknown tower to hit a target mean

// the lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'total', unlock: STEP_TOTAL, color: '#5b6b7b', name: 'Total', role: 'add every cube: Σ' },
  { key: 'mean', unlock: STEP_SHARE, color: '#c81e4f', name: 'Mean line', role: 'the fair-share level' },
  { key: 'rect', unlock: STEP_RECT, color: '#c81e4f', name: 'n × mean', role: 'the leveled block = total' },
  { key: 'give', unlock: STEP_GIVE, color: '#c81e4f', name: 'Give & take', role: 'surplus fills the gaps' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. The mean and its identities, EXACT. Everything is derived from
   the integer tower array; nothing here knows a pixel.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
function reduceFrac(num, den) {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
// exact terminating decimal for num/den by integer long division; only called
// when the fraction is known to terminate, but guarded anyway.
function longDivide(num, den) {
  const intPart = Math.floor(num / den);
  let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = '';
  let guard = 0;
  while (rem !== 0 && guard < 14) {
    rem *= 10;
    frac += Math.floor(rem / den);
    rem %= den;
    guard++;
  }
  return intPart + '.' + frac;
}
function terminates(den) {
  let d = den;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
// round num/den to hundredths, formatted exactly (no float artefact)
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact terminating decimal, or "≈" 2-dp round
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}

// total and count. The mean is sum/n, kept exact via fmtRatio.
function computeMean(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  return { n, sum };
}

// the GIVE/TAKE identity in exact ×n integer units:
//   give = Σ over v>mean of (v·n − sum);  take = Σ over v<mean of (sum − v·n).
// These are equal integers (because Σ(v·n − sum) = 0), and the value-unit size
// of each is give/n cubes.  For an integer mean, give/n and take/n are whole
// cubes — literally the cubes that move when you level.
function giveTakeXn(data, sum, n) {
  let give = 0;
  let take = 0;
  for (const v of data) {
    const t = v * n - sum; // sign matches (v − mean)
    if (t > 0) give += t;
    else if (t < 0) take += -t;
  }
  return { give, take }; // give === take, always
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A MISSING-VALUE PROBLEM (the skill's sanctioned
   construction-goal alternative to curve matching, and one DataLab does NOT do):
   a target mean T is fixed, three towers are LOCKED, and the fourth is unknown —
   a "?" the student must set so the average lands exactly on T.  Because
   total = mean × n, the answer is  ? = T·n − (sum of the locked towers), which is
   the whole point of the challenge.  The generator guarantees the answer is a
   legal tower height (1…HMAX), so every target is solvable.  The meter reads
   closeness in value units; CALIBRATED is an exact hit: sum === T·n.
   ------------------------------------------------------------------------- */
const CAL_N = 4; // the challenge always uses four towers (three locked + one "?")
const CAL_SCALE = 2.5; // value-units spread across the match meter
const matchPercent = (mean, T) => 100 * Math.max(0, 1 - Math.abs(mean - T) / CAL_SCALE);
const isCalibrated = (sum, n, T) => n === CAL_N && sum === T * n;

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function makeCalib(prev) {
  let T;
  let fixed;
  let needed;
  let guard = 0;
  do {
    T = randInt(4, 6); // a friendly target average 4…6
    fixed = [randInt(1, 9), randInt(1, 9), randInt(1, 9)];
    const sf = fixed[0] + fixed[1] + fixed[2];
    needed = T * CAL_N - sf; // the unique solving height for the 4th tower
    guard++;
  } while (
    guard < 800 &&
    (needed < HMIN ||
      needed > HMAX ||
      (prev && prev.T === T && prev.fixed.join(',') === fixed.join(',')))
  );
  // start the unknown tower at a wrong height so nothing is pre-solved
  let start = needed >= 5 ? needed - 2 : needed + 2;
  start = Math.max(HMIN, Math.min(HMAX, start));
  if (start === needed) start = needed === HMIN ? HMIN + 1 : needed - 1;
  return { T, fixed, needed, unknownIndex: 3, data: [...fixed, start] };
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The MEAN is the star, in the carmine accent; the
   total and count ride along as small chips.  Rendered by a CHILD component, so
   styles are INLINED (styled-jsx only scopes a component's own JSX) — this keeps
   the readout identical in Next.js and any plain preview.
   ------------------------------------------------------------------------- */
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function MeanEquation({ meanStr, meanApprox, sum, n, showTotal }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '30px',
            fontWeight: 700,
            color: '#c81e4f',
            letterSpacing: '0.01em',
          }}
        >
          {(meanApprox ? '≈ ' : '') + meanStr}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#5b6b7b',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          mean
        </span>
      </span>
      {showTotal && (
        <span style={{ ...CHIP_BASE, color: '#3a4756', background: 'rgba(91,107,123,0.14)' }}>
          total {sum}
        </span>
      )}
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the lens unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real average
   misconceptions ("the mean is the middle number", "the mean must be a whole
   number", "a tall tower doesn't change the average much").  Next is gated on
   ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the towers',
    body:
      'Each tower is one data value, built out of unit cubes — think of it as how many cookies each ' +
      'child has. Drag a tower up or down to change its height, or use + / − to add or remove a tower. ' +
      'The towers are uneven: some children have more, some have less. The question of this lab is the ' +
      'fairest one there is — if we shared everything out equally, how much would each child get?',
    q: 'What does the HEIGHT of a tower tell you?',
    choices: ['How many cubes (the value) that tower has', 'Where the tower sits left-to-right', 'How many towers there are'],
    answer: 0,
    feedback:
      'Height is the value — the amount that tower holds. The average will ask what height they would ALL ' +
      'reach if the cubes were shared out evenly. Left-to-right position is just which tower it is.',
  },
  {
    title: 'Add up the total',
    body:
      'Before you can share, you have to pool. Turn on the Total lens: it counts EVERY cube in EVERY ' +
      'tower and adds them into one grand total, Σ (the sum). This is the pile of cubes we are about to ' +
      'redistribute. Nothing is created or destroyed when we share — the total stays exactly the same.',
    q: 'Four towers are 3, 5, 2, and 6 cubes tall. What is the total?',
    choices: ['16 — add them: 3 + 5 + 2 + 6', '6 — the tallest tower', '4 — the number of towers'],
    answer: 0,
    feedback:
      '3 + 5 + 2 + 6 = 16 cubes in the pile. The total is a sum, not the biggest tower and not the count. ' +
      'Hold onto 16 — the very next step shares those 16 cubes out equally.',
  },
  {
    title: 'Share equally — the mean',
    body:
      'Now share the pile out fairly. The MEAN is total ÷ n: pour cubes off the tall towers into the ' +
      'short ones until every tower reaches the SAME height. Press "Level" to watch it happen — the ' +
      'height they all settle on is the mean, drawn as the carmine line. Fair share = mean = (Σ) ÷ n.',
    q: 'The pile of 16 cubes is shared among 4 towers. How tall does each become?',
    choices: ['4 — because 16 ÷ 4 = 4', '16 — every tower gets the whole pile', '12 — 16 minus the 4 towers'],
    answer: 0,
    feedback:
      '16 ÷ 4 = 4. Level the towers and each one settles at 4 — that common height is the mean. Sharing ' +
      'equally is division: the total split into n equal parts.',
  },
  {
    title: 'Undo it — total = mean × n',
    body:
      'Once the towers are level, they form a solid block: n towers wide, mean tall. Turn on the ' +
      '“n × mean” lens to see it. The block holds every original cube, so its area is the total: ' +
      'total = mean × n. That is the mean read backwards — if you know the average and how many there ' +
      'are, you can recover the total. This backwards move is the key to the final challenge.',
    q: 'A class of 3 students averaged 7 points each. How many points in total?',
    choices: ['21 — total = mean × n = 7 × 3', '7 — the average is the total', '10 — 7 plus 3'],
    answer: 0,
    feedback:
      'total = mean × n = 7 × 3 = 21. Because sharing equally never changes the pile, multiplying the ' +
      'fair share back by how many gives the whole total. mean ÷ and × n are undo-moves of each other.',
  },
  {
    title: 'Give and take',
    body:
      'Why does leveling always work out exactly? Turn on the Give & take lens. Every tower ABOVE the ' +
      'mean line has surplus cubes (shaded carmine); every tower BELOW it has empty gaps to fill (dashed ' +
      'outlines). The surplus given from above is ALWAYS exactly equal to the shortfall needed below — ' +
      'that is what lets the pouring come out even, with none left over and none missing.',
    q: 'The towers above the mean have 6 surplus cubes in all. How many cubes do the towers below need?',
    choices: ['Exactly 6 — give equals take', 'Fewer than 6, some are lost', 'It depends on the tower heights'],
    answer: 0,
    feedback:
      'Exactly 6. The cubes above the line are precisely the cubes the gaps below the line are missing — ' +
      'give = take, always. That balance is the reason the fair share divides out evenly every time.',
  },
  {
    title: 'When it won’t divide evenly',
    body:
      'The total does not have to be a multiple of n. When it isn’t, the fair share lands BETWEEN whole ' +
      'cubes — the carmine line cuts through a cube, and each leveled tower gets some whole cubes plus a ' +
      'sliver. You can’t hand a child half a cookie, but the AVERAGE can still be 2.6. A mean need not be ' +
      'a whole number, and it need not be a value that any tower actually has.',
    q: 'Five children have 1, 2, 2, 4, and 4 cookies. What is the mean?',
    choices: ['2.6 — because 13 ÷ 5 = 2.6', '2 — the most common amount', '3 — you must round to a whole cookie'],
    answer: 0,
    feedback:
      '1 + 2 + 2 + 4 + 4 = 13, and 13 ÷ 5 = 2.6. The average is 2.6 cookies even though no child has 2.6 ' +
      'and you can’t split a cookie — the mean describes the fair share, not a real handful.',
  },
  {
    title: 'Challenge: hit the target average',
    body:
      'Final challenge — a missing-value problem. Three towers are locked and a target mean is fixed on ' +
      'the grey line. Set the carmine “?” tower so the average of all four lands exactly on the target. ' +
      'Use the backwards move: the four towers must total mean × n, so ? = (target × n) − (the locked ' +
      'towers). The meter reads CALIBRATED when your mean hits the target. Press “New target” for another.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MeanLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [calibInfo, setCalibInfo] = useState(null); // { T, fixed, needed, unknownIndex } during calibration
  const [levelOn, setLevelOn] = useState(false); // fair-share leveling animation
  const [lensOn, setLensOn] = useState({ total: false, mean: false, rect: false, give: false });
  const [keyboardTower, setKeyboardTower] = useState(0);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const dataRef = useRef(data); // latest data for pointer handlers
  const grabRef = useRef(null); // { i } while dragging a tower's height
  const levelTRef = useRef(0); // 0..1 leveling progress

  dataRef.current = data;

  const current = STEPS[step];
  const calib = !!current.calib;

  const { n, sum } = computeMean(data);
  const meanVal = sum / n;
  const meanFmt = fmtRatio(sum, n);
  const meanText = (meanFmt.approx ? '≈ ' : '') + meanFmt.text;
  const levelsEven = sum % n === 0; // does the mean land on a whole cube?

  const gt = giveTakeXn(data, sum, n);
  const giveFmt = fmtRatio(gt.give, n); // value-unit size of the surplus (= the shortfall)

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    total: lensOn.total && step >= STEP_TOTAL,
    mean: (lensOn.mean && step >= STEP_SHARE) || calib,
    rect: lensOn.rect && step >= STEP_RECT && !calib,
    give: lensOn.give && step >= STEP_GIVE && !calib,
  };
  const showLevel = step >= STEP_SHARE && !calib; // the Level button is available once we can share

  const target = calib && calibInfo ? calibInfo.T : null;
  const unknownIndex = calib && calibInfo ? calibInfo.unknownIndex : -1;
  const matchPct = target != null ? matchPercent(meanVal, target) : 0;
  const calibrated = target != null ? isCalibrated(sum, n, target) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    data,
    n,
    sum,
    meanVal,
    meanText,
    levelsEven,
    eff,
    gt,
    giveText: (giveFmt.approx ? '≈ ' : '') + giveFmt.text,
    calib,
    target,
    unknownIndex,
    calibrated,
  };

  /* ---- value → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F'; // the MEAN — line, block, give shading, "?" tower, readout
    const CARM_SOFT = 'rgba(200,30,79,0.16)';
    const CUBE = '#C7D8E4'; // a data cube (quiet slate-blue: this is the data)
    const CUBE_TOP = '#DDE8F0'; // cube top highlight
    const CUBE_EDGE = 'rgba(28,43,58,0.34)';
    const AXIS = 'rgba(28,43,58,0.5)';
    const GREY = 'rgba(91,107,123,0.9)'; // the neutral target in the challenge

    const S = sceneRef.current;
    ctx.clearRect(0, 0, Wd, Hd);

    /* faint quadrille backdrop behind everything */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = 0; gx <= Wd; gx += 22) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hd);
    }
    for (let gy = 0; gy <= Hd; gy += 22) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(Wd, Y);
    }
    ctx.stroke();

    /* ---- regions ----------------------------------------------------------- */
    const padL = 40; // room for the value axis
    const padR = 20;
    const padTop = 46; // room for the mean pill + total caption
    const padBottom = 40; // room for the value labels under each tower
    const baseY = Hd - padBottom; // value 0
    const topY = padTop; // value HMAX
    const unitH = (baseY - topY) / HMAX; // pixels per cube
    const yOf = (v) => baseY - v * unitH;
    const spanW = Wd - padL - padR;
    const slotW = spanW / S.n;
    const barW = Math.min(slotW * 0.62, 52);

    /* ---- value axis: faint unit gridlines + labels ------------------------ */
    ctx.strokeStyle = 'rgba(28,43,58,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = 0; v <= HMAX; v++) {
      const Y = Math.round(yOf(v)) + 0.5;
      ctx.moveTo(padL, Y);
      ctx.lineTo(Wd - padR, Y);
    }
    ctx.stroke();
    // baseline (value 0) drawn solid
    ctx.strokeStyle = AXIS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL - 6, yOf(0) + 0.5);
    ctx.lineTo(Wd - padR, yOf(0) + 0.5);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of [0, 2, 4, 6, 8, 10]) ctx.fillText(String(v), padL - 8, yOf(v));

    /* ---- Total lens caption: Σ = v1 + v2 + ... = total -------------------- */
    if (S.eff.total) {
      const terms = S.data.join(' + ');
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const label = 'Σ = ' + terms + ' = ' + S.sum;
      // keep the caption from overflowing on narrow stages
      let shown = label;
      if (ctx.measureText(shown).width > spanW) shown = 'Σ (total) = ' + S.sum;
      ctx.fillText(shown, padL, 8);
    }

    /* ---- the "n × mean" leveled block (rect lens) ------------------------- */
    if (S.eff.rect) {
      const x0 = padL + 2;
      const x1 = Wd - padR - 2;
      const yTopBlock = yOf(S.meanVal);
      ctx.save();
      ctx.fillStyle = CARM_SOFT;
      ctx.fillRect(x0, yTopBlock, x1 - x0, yOf(0) - yTopBlock);
      ctx.strokeStyle = 'rgba(200,30,79,0.55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x0 + 0.5, yTopBlock + 0.5, x1 - x0 - 1, yOf(0) - yTopBlock - 1);
      ctx.setLineDash([]);
      ctx.restore();
      // (the dimension label is drawn later, on TOP of the towers, so a tall
      //  tower can never obscure it)
    }

    /* ---- the towers of unit cubes ----------------------------------------- */
    const tv = levelTRef.current; // 0..1 leveling progress
    const cubeInset = Math.min(3, barW * 0.08);
    for (let i = 0; i < S.n; i++) {
      const v = S.data[i];
      const drawnH = v + (S.meanVal - v) * tv; // lerp height → mean when leveling
      const cx = padL + slotW * (i + 0.5);
      const left = cx - barW / 2;
      const isUnknown = S.calib && i === S.unknownIndex;
      const isLocked = S.calib && i !== S.unknownIndex;

      const full = Math.floor(drawnH + 1e-9);
      const frac = drawnH - full;

      // whole cubes
      for (let j = 0; j < full; j++) {
        const yTopCube = yOf(j + 1);
        const h = unitH;
        ctx.fillStyle = CUBE;
        ctx.fillRect(left + cubeInset, yTopCube + cubeInset, barW - 2 * cubeInset, h - 2 * cubeInset);
        // top highlight strip
        ctx.fillStyle = CUBE_TOP;
        ctx.fillRect(left + cubeInset, yTopCube + cubeInset, barW - 2 * cubeInset, Math.min(5, h * 0.28));
        ctx.strokeStyle = CUBE_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(left + cubeInset + 0.5, yTopCube + cubeInset + 0.5, barW - 2 * cubeInset - 1, h - 2 * cubeInset - 1);
      }
      // partial (fractional) cube — the "sliver" of an uneven share
      if (frac > 0.02) {
        const yTopCube = yOf(full + frac);
        const h = frac * unitH;
        ctx.fillStyle = 'rgba(200,30,79,0.14)';
        ctx.fillRect(left + cubeInset, yTopCube + cubeInset, barW - 2 * cubeInset, h - cubeInset);
        ctx.strokeStyle = 'rgba(200,30,79,0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(left + cubeInset + 0.5, yTopCube + cubeInset + 0.5, barW - 2 * cubeInset - 1, Math.max(1, h - cubeInset - 1));
        ctx.setLineDash([]);
      }

      // GIVE & TAKE lens: shade surplus above the line, outline gaps below it
      if (S.eff.give && Math.abs(v - S.meanVal) > 1e-9) {
        if (v > S.meanVal) {
          // surplus: from the mean line up to the top of this tower
          const yhi = yOf(v);
          const ylo = yOf(S.meanVal);
          ctx.fillStyle = 'rgba(200,30,79,0.28)';
          ctx.fillRect(left + cubeInset, yhi + cubeInset, barW - 2 * cubeInset, ylo - yhi - cubeInset);
        } else {
          // shortfall: the empty gap from the top of this tower up to the mean line
          const yhi = yOf(S.meanVal);
          const ylo = yOf(v);
          ctx.save();
          ctx.strokeStyle = 'rgba(91,107,123,0.75)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(left + cubeInset + 0.5, yhi + 0.5, barW - 2 * cubeInset - 1, ylo - yhi);
          ctx.restore();
        }
      }

      // the unknown "?" tower in the challenge — carmine outline + tag
      if (isUnknown) {
        ctx.save();
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(left + 0.5, yOf(v) + 0.5, barW - 1, yOf(0) - yOf(v) - 1);
        ctx.setLineDash([]);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('?', cx, yOf(v) - 6);
        ctx.restore();
      }

      // value label under each tower
      ctx.fillStyle = isUnknown ? CARMINE : INK;
      ctx.font = (isUnknown ? '700 ' : '600 ') + '12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(v), cx, yOf(0) + 8);
      if (isLocked) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 9px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillText('locked', cx, yOf(0) + 23);
      }
    }

    /* ---- the MEAN line (carmine, dashed) + pill --------------------------- */
    if (S.eff.mean) {
      const y = yOf(S.meanVal);
      ctx.save();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(Wd - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // mean pill at the right end, clamped inside the stage
      const pill = 'mean ' + S.meanText;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 20;
      const bxp = Math.min(Wd - padR - bw, Math.max(padL, Wd - padR - bw));
      let pillY = y - bh - 4;
      if (pillY < topY - 2) pillY = y + 5; // if the line is near the top, drop the pill below it
      const rr = 6;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, pillY);
      ctx.arcTo(bxp + bw, pillY, bxp + bw, pillY + bh, rr);
      ctx.arcTo(bxp + bw, pillY + bh, bxp, pillY + bh, rr);
      ctx.arcTo(bxp, pillY + bh, bxp, pillY, rr);
      ctx.arcTo(bxp, pillY, bxp + bw, pillY, rr);
      ctx.closePath();
      ctx.fillStyle = CARMINE;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, bxp + bw / 2, pillY + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ---- the "n × mean" dimension label (on top, so towers never hide it) -- */
    if (S.eff.rect) {
      const yTopBlock = yOf(S.meanVal);
      const label = 'n × mean = ' + S.n + ' × ' + S.meanText + ' = ' + S.sum + ' cubes';
      ctx.save();
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      const cxL = (padL + (Wd - padR)) / 2;
      const ly = yTopBlock + 12;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(cxL - tw / 2 - 6, ly - 9, tw + 12, 18);
      ctx.fillStyle = CARMINE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cxL, ly);
      ctx.restore();
    }

    /* ---- the challenge target line (grey, fixed) -------------------------- */
    if (S.calib && S.target != null) {
      const y = yOf(S.target);
      ctx.save();
      ctx.strokeStyle = GREY;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(Wd - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GREY;
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target ' + S.target, padL + 2, y - 3);
      ctx.restore();
    }

    /* store geometry for hit-testing */
    geoRef.current = { padL, padR, spanW, slotW, baseY, unitH, n: S.n };
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [data, step, calibInfo, lensOn, levelOn, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-enable the lens that unlocks on this step (picture keeps pace) */
  useEffect(() => {
    const l = LENSES.find((x) => x.unlock === step);
    if (l) setLensOn((prev) => (prev[l.key] ? prev : { ...prev, [l.key]: true }));
  }, [step]);

  /* set up the challenge the first time we reach it */
  useEffect(() => {
    if (current.calib && calibInfo == null) {
      const c = makeCalib(null);
      setCalibInfo(c);
      setData(c.data);
      setLevelOn(false);
      levelTRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fair-share leveling animation — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    const wantsReduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetT = levelOn ? 1 : 0;
    if (wantsReduce) {
      levelTRef.current = targetT;
      draw();
      return;
    }
    let raf;
    let last = null;
    const speed = 1.8; // per second
    const loop = (now) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      const cur = levelTRef.current;
      const next = cur + Math.sign(targetT - cur) * speed * dt;
      levelTRef.current = Math.abs(next - targetT) <= speed * dt ? targetT : next;
      draw();
      if (levelTRef.current !== targetT) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelOn, data, step, draw]);

  /* ---- interaction: sculpt a tower's height by clicking / dragging -------- */
  const towerAt = (cssX) => {
    const g = geoRef.current;
    if (!g.slotW) return -1;
    const i = Math.floor((cssX - g.padL) / g.slotW);
    return i >= 0 && i < g.n ? i : -1;
  };
  const heightAt = (cssY) => {
    const g = geoRef.current;
    if (!g.unitH) return HMIN;
    const h = Math.round((g.baseY - cssY) / g.unitH);
    return Math.max(HMIN, Math.min(HMAX, h));
  };
  const editableTower = (i) => {
    if (i < 0) return false;
    if (calib) return i === unknownIndex; // only the "?" tower is editable in the challenge
    return true;
  };
  const setTowerHeight = (i, h) => {
    setData((arr) => {
      if (arr[i] === h) return arr;
      const next = arr.slice();
      next[i] = h;
      return next;
    });
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const i = towerAt(cssX);
    if (!editableTower(i)) return;
    grabRef.current = { i };
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    setTowerHeight(i, heightAt(cssY));
  };
  const onPointerMove = (e) => {
    const grab = grabRef.current;
    if (!grab) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssY = e.clientY - rect.top;
    setTowerHeight(grab.i, heightAt(cssY));
  };
  const onPointerUp = () => {
    grabRef.current = null;
  };

  /* ---- toolbar / presets (main lesson only) ------------------------------ */
  const applyPreset = (arr) => {
    if (levelOn) setLevelOn(false);
    levelTRef.current = 0;
    setData(arr.slice(0, MAX_TOWERS).map((v) => Math.max(HMIN, Math.min(HMAX, v))));
  };
  const addTower = () => {
    if (calib || n >= MAX_TOWERS) return;
    applyPreset([...data, Math.max(HMIN, Math.min(HMAX, Math.round(meanVal) || HMIN))]);
  };
  const removeTower = () => {
    if (calib || n <= MIN_TOWERS) return;
    applyPreset(data.slice(0, n - 1));
  };
  const randomSet = () => {
    if (calib) return;
    const k = randInt(3, 6);
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(randInt(HMIN, HMAX));
    applyPreset(arr);
  };

  const toggleLens = (key, unlock) => {
    if (step < unlock || (calib && key !== 'total')) return;
    setLensOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => {
    // stepping back out of the challenge restores the lesson's towers
    if (calib) {
      setCalibInfo(null);
      setData(START_DATA);
      if (levelOn) setLevelOn(false);
      levelTRef.current = 0;
    }
    setStep((s) => Math.max(0, s - 1));
  };
  const newTarget = () => {
    const c = makeCalib(calibInfo);
    setCalibInfo(c);
    setData(c.data);
    if (levelOn) setLevelOn(false);
    levelTRef.current = 0;
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const editorTower = calib && unknownIndex >= 0 ? unknownIndex : Math.min(keyboardTower, Math.max(0, n - 1));
  const editorHeight = data[editorTower] ?? HMIN;
  const canEditTower = editorTower >= 0 && (!calib || editorTower === unknownIndex);

  /* spoken description (accessibility) */
  const spoken = calib
    ? calibInfo && unknownIndex >= 0 && target != null
      ? `Challenge: three towers are locked at ${calibInfo.fixed.join(', ')}, ` +
        `and the unknown tower is ${data[unknownIndex]}. The current average is ${meanFmt.approx ? 'about ' : ''}${meanFmt.text}, ` +
        `and the target average is ${target}.` +
        (calibrated ? ' Calibrated — the average is exactly on the target.' : '')
      : 'Challenge: preparing a new target average.'
    : `${n} towers with heights ${data.join(', ')}. Their total is ${sum} cubes, ` +
      `so the mean — the fair share — is ${meanFmt.approx ? 'about ' : ''}${meanFmt.text}. ` +
      (levelsEven ? 'It divides evenly.' : 'It does not divide evenly, so the mean is not a whole number.');

  return (
    <div className="mlab">
      <header className="head">
        <h1>The Mean — a Fair Share</h1>
        <p className="lede">
          The <em>mean</em> (the average) is what everyone gets when you pool everything and share it{' '}
          <em>equally</em>. Build a row of <span className="mono">unit-cube towers</span>, then{' '}
          <em>level</em> them: pour cubes from the tall towers into the short ones until all are the same
          height. That height is the mean — and because no cube is ever lost, <span className="mono">total = mean × n</span>.
          Each lens unlocks with the lesson, so the picture is never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <MeanEquation
                meanStr={meanFmt.text}
                meanApprox={meanFmt.approx}
                sum={sum}
                n={n}
                showTotal={eff.total}
              />
            </p>
            <p className="equation-sub mono">
              mean = {sum} ÷ {n}
              {eff.rect ? (
                <>
                  {' '}
                  &nbsp;·&nbsp; total = mean × n = <b className="carm">{meanText}</b> × {n} = {sum}
                </>
              ) : null}
              {eff.give ? (
                <>
                  {' '}
                  &nbsp;·&nbsp; give <b className="carm">{(giveFmt.approx ? '≈ ' : '') + giveFmt.text}</b> = take{' '}
                  <b className="carm">{(giveFmt.approx ? '≈ ' : '') + giveFmt.text}</b>
                </>
              ) : null}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib ? 'set the “?” tower — drag it up or down' : 'drag a tower up or down to change its height'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Total Σ</span>
              <span className="fact-v mono">{sum}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Count n</span>
              <span className="fact-v mono">{n}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Mean = Σ ÷ n</span>
              <span className="fact-v mono carm big">{meanText}</span>
            </div>
          </div>

          <div
            className="keyboard-editor"
            role="group"
            aria-label="Keyboard tower controls"
            data-viz-keyboard-equivalent="mean-towers"
          >
            <span className="editor-title">Tower height</span>
            <label className="editor-field">
              <span>Tower</span>
              <select
                value={editorTower}
                onChange={(e) => setKeyboardTower(Number(e.target.value))}
                disabled={calib}
                aria-label="Tower to edit"
              >
                {data.map((height, i) => (
                  <option key={i} value={i}>
                    {i + 1}: {height}
                  </option>
                ))}
              </select>
            </label>
            <div className="editor-range">
              <button
                type="button"
                className="editor-step"
                onClick={() => setTowerHeight(editorTower, editorHeight - 1)}
                disabled={!canEditTower || editorHeight <= HMIN}
                aria-label={`Decrease tower ${editorTower + 1} height`}
              >
                −1
              </button>
              <label>
                <span className="sr-only">Tower {editorTower + 1} height</span>
                <input
                  type="range"
                  min={HMIN}
                  max={HMAX}
                  step="1"
                  value={editorHeight}
                  onChange={(e) => setTowerHeight(editorTower, Number(e.target.value))}
                  disabled={!canEditTower}
                />
              </label>
              <output className="editor-value" aria-live="polite">
                {editorHeight}
              </output>
              <button
                type="button"
                className="editor-step"
                onClick={() => setTowerHeight(editorTower, editorHeight + 1)}
                disabled={!canEditTower || editorHeight >= HMAX}
                aria-label={`Increase tower ${editorTower + 1} height`}
              >
                +1
              </button>
            </div>
            <span className="editor-help">
              {calib ? 'Only the “?” tower moves.' : 'Choose a tower; use arrow keys or the −1/+1 buttons.'}
            </span>
          </div>

          <div className="toolbar">
            {showLevel && (
              <button
                type="button"
                className={'btn ghost' + (levelOn ? ' on' : '')}
                onClick={() => setLevelOn((f) => !f)}
              >
                {levelOn ? 'Leveled' : 'Level'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={removeTower} disabled={calib || n <= MIN_TOWERS}>
              − Tower
            </button>
            <button type="button" className="btn ghost" onClick={addTower} disabled={calib || n >= MAX_TOWERS}>
              + Tower
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 3, 5, 7])} disabled={calib}>
              Stairs
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([4, 4, 4, 9])} disabled={calib}>
              Uneven
            </button>
            <button type="button" className="btn ghost" onClick={randomSet} disabled={calib}>
              Random
            </button>
          </div>
        </section>

        {/* ---------- TUTOR ---------- */}
        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>

          <p className="eyebrow small">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="lenses" role="group" aria-label="Idea lenses">
            {LENSES.map((l) => {
              const unlocked = step >= l.unlock;
              const on = unlocked && lensOn[l.key] && (!calib || l.key === 'total' || l.key === 'mean');
              const disabled = !unlocked || (calib && l.key !== 'total');
              return (
                <button
                  type="button"
                  key={l.key}
                  className={'lens' + (on ? ' on' : '') + (!unlocked ? ' locked' : '')}
                  style={on ? { borderColor: l.color, boxShadow: `inset 0 0 0 1px ${l.color}` } : undefined}
                  onClick={() => toggleLens(l.key, l.unlock)}
                  disabled={disabled}
                  aria-pressed={on}
                >
                  <span className="lk" style={{ background: l.color }} aria-hidden="true" />
                  <span className="lname">{l.name}</span>
                  <span className="lrole">{unlocked ? l.role : 'unlocks soon'}</span>
                  <span className="lstate mono" aria-hidden="true">
                    {!unlocked ? '🔒' : on ? 'on' : 'off'}
                  </span>
                </button>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  const isChosen = chosen === i;
                  const isCorrect = i === current.answer;
                  let cls = 'choice';
                  if (chosen != null) {
                    if (isCorrect) cls += ' correct';
                    else if (isChosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && isCorrect ? '✓' : chosen != null && isChosen ? '✕' : ''}
                      </span>
                      {c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && calibInfo && (
            <div className="calib">
              <p className="calib-hint mono">
                ? = (target × n) − (locked towers) = ({target} × {CAL_N}) − ({calibInfo.fixed.join(' + ')}) ={' '}
                {target * CAL_N} − {calibInfo.fixed.reduce((a, b) => a + b, 0)}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim the average at {target}</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newTarget}>
                New target
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {hasQuestion && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setCalibInfo(null);
                  setLevelOn(false);
                  levelTRef.current = 0;
                  setLensOn({ total: false, mean: false, rect: false, give: false });
                  setData(START_DATA);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">mean = (Σx) ÷ n &nbsp;·&nbsp; total = mean × n</span> &nbsp;·&nbsp; the mean is the
        fair share: pool every value and split it equally (CCSS 5.MD / 6.SP.B.5c). Heights here are whole cubes
        1–10; the same ideas scale to any values.
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --quad: #c7d8e4;
          --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page);
          color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px;
          border-radius: 16px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .mono {
          font-family: var(--mono);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 6px;
        }
        .eyebrow.small {
          margin: 0 0 4px;
        }
        h1 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: clamp(26px, 4vw, 34px);
          margin: 0 0 6px;
        }
        .lede {
          color: var(--ink-soft);
          margin: 0 0 22px;
          max-width: 72ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .bench {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
        }
        .equation-sub .carm {
          color: var(--curve);
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: ns-resize;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 16px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 620px) {
          .facts {
            grid-template-columns: 1fr 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.big {
          font-size: 20px;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .keyboard-editor {
          margin: 12px 4px 2px;
          padding: 10px;
          display: grid;
          grid-template-columns: auto minmax(112px, 0.7fr) minmax(210px, 1.6fr);
          gap: 8px 12px;
          align-items: center;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 9px;
          background: rgba(63, 116, 166, 0.045);
        }
        .editor-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink);
        }
        .editor-field {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--ink-soft);
          font-size: 12px;
        }
        .editor-field select {
          min-height: 44px;
          max-width: 100%;
          padding: 5px 24px 5px 8px;
          border: 1px solid rgba(28, 43, 58, 0.28);
          border-radius: 7px;
          background: #fff;
          color: var(--ink);
          font: 600 13px/1.2 var(--mono);
        }
        .editor-range {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(90px, 1fr) 2ch auto;
          gap: 7px;
          align-items: center;
        }
        .editor-range label,
        .editor-range input {
          width: 100%;
          min-width: 0;
        }
        .editor-range label {
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        .editor-step {
          min-width: 44px;
          min-height: 44px;
          border: 1px solid rgba(28, 43, 58, 0.28);
          border-radius: 7px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          font: 700 12px/1 var(--mono);
        }
        .editor-step:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .editor-value {
          color: var(--curve);
          font: 700 14px/1 var(--mono);
          text-align: center;
        }
        .editor-help {
          grid-column: 1 / -1;
          color: var(--ink-soft);
          font-size: 11.5px;
          line-height: 1.35;
        }
        @media (max-width: 620px) {
          .keyboard-editor {
            grid-template-columns: 1fr;
          }
          .editor-range {
            grid-template-columns: 44px minmax(0, 1fr) 2ch 44px;
            gap: 4px;
          }
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost {
          background: transparent;
          color: var(--ink);
        }
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          filter: brightness(1.08);
        }
        .tutor {
          padding: 18px 20px 20px;
        }
        .progress {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .pip {
          height: 5px;
          flex: 1;
          border-radius: 3px;
          background: rgba(28, 43, 58, 0.14);
        }
        .pip.done {
          background: rgba(200, 30, 79, 0.45);
        }
        .pip.cur {
          background: var(--curve);
        }
        h2 {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 20px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body {
          margin: 0 0 16px;
          font-size: 14.5px;
        }
        .lenses {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 4px;
        }
        @media (max-width: 400px) {
          .lenses {
            grid-template-columns: 1fr;
          }
        }
        .lens {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 1px 8px;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.18);
          border-radius: 9px;
          background: var(--paper);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .lens:not(:disabled):hover {
          border-color: var(--ink);
        }
        .lens.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lens.on {
          background: #fff;
        }
        .lk {
          grid-row: 1 / 3;
          grid-column: 1;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .lname {
          grid-column: 2;
          grid-row: 1;
          font-weight: 700;
          font-size: 13px;
        }
        .lrole {
          grid-column: 2;
          grid-row: 2;
          font-size: 10.5px;
          color: var(--ink-soft);
        }
        .lstate {
          grid-column: 3;
          grid-row: 1 / 3;
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-soft);
        }
        .lens.on .lstate {
          color: var(--curve);
        }
        .quiz {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
        }
        .q {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        .choices {
          display: grid;
          gap: 7px;
        }
        .choice {
          text-align: left;
          font: 13.5px/1.4 system-ui, sans-serif;
          padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover {
          border-color: var(--ink);
        }
        .choice .mark {
          position: absolute;
          left: 10px;
          font-weight: 700;
        }
        .choice.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
        }
        .choice.correct .mark {
          color: var(--ok);
        }
        .choice.wrong {
          border-color: var(--ink-soft);
          background: rgba(91, 107, 123, 0.08);
        }
        .choice.wrong .mark {
          color: var(--ink-soft);
        }
        .choice.dim {
          opacity: 0.55;
        }
        .choice:disabled {
          cursor: default;
        }
        .feedback {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          background: rgba(200, 30, 79, 0.05);
          border-left: 3px solid var(--curve);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1);
          display: grid;
          gap: 10px;
        }
        .calib-hint {
          margin: 0;
          font-size: 12px;
          color: var(--ink-soft);
          background: rgba(28, 43, 58, 0.04);
          padding: 8px 10px;
          border-radius: 6px;
          line-height: 1.5;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
        }
        .nav {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .foot {
          margin-top: 24px;
          font-size: 12.5px;
          color: var(--ink-soft);
        }
        :global(.mlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .lens {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
