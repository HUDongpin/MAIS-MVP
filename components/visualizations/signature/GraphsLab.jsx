'use client';

/* ============================================================================
   GraphsLab — an interactive "bench" for GRAPHS of data: the many ways to draw a
   set of counts as a picture you can read at a glance.  One categorical data set
   ("How the class gets to school": Walk / Bus / Car / Bike / Scooter) is shown
   three linked ways — a BAR graph, a PICTOGRAPH, and a CIRCLE (pie) graph — and
   the thesis of the lab is the idea that ties them together:

     A GRAPH ENCODES A COUNT AS A VISUAL MAGNITUDE, AND THAT MAGNITUDE IS ALWAYS
     PROPORTIONAL TO THE COUNT.

   The same number 6 becomes a bar of LENGTH 6, a row of ICONS (6 ÷ key), and a
   pie SLICE of ANGLE (6 ÷ total) × 360°.  Flip the view and the count never
   changes — only its costume does.  Choosing a graph is choosing how to draw the
   number, and which graph fits depends on the question you are asking.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 3–6.
   Anchor standards: CCSS 3.MD.B.3 (draw a scaled picture graph and a scaled bar
   graph to represent a data set; solve one/two-step problems using the graphs),
   2.MD.D.10 (bar/picture graphs); the circle-graph strand extends to grades 6–7
   proportional reasoning (share = part ÷ whole, angle = share × 360°, percent =
   share × 100).  A distinct, complementary sibling of DataLab: DataLab owns the
   DOT PLOT and the measures of CENTER (mean/median/mode) of NUMERICAL data; this
   lab owns the graphical DISPLAYS of CATEGORICAL data and the reading skills that
   go with them — the scale, the key, the share, and the misleading-axis trap.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  The
   Decimal/Percentage "one number, several pictures" signature is taken to its
   limit here: THREE simultaneous encodings of every count, always kept in sync.

   EXACT MATH — a K-12 student never meets a float artefact like 33.3000004:
     • counts are integers 0…12; the total is an integer.
     • a slice angle is the exact fraction (count·360)/total, and a percent is
       (count·100)/total, each reduced by an integer gcd and rendered as an
       integer, an exact terminating decimal (by integer long division), or a
       clearly-marked "≈" 2-decimal rounding — never a raw IEEE float.
     • a pictograph's icon count is the exact fraction count/key (e.g. 5 ÷ 2 = 2½,
       drawn as two whole icons and one half icon).
     • the angles of all slices provably sum to exactly 360° and the percents to
       exactly 100% because Σcount = total (checked in integer ·360 / ·100 units).

   ONE-ACCENT DISCIPLINE: the mathematical object the lab reveals is the
   PROPORTIONAL ENCODING of a chosen count, so CARMINE is the focus spotlight —
   the selected category, its three mini-encodings in the readout, the value/angle
   annotations, the calibration target and meter.  Categories carry a restrained,
   harmonious categorical palette (teal / gold / blue / violet / clay) because a
   bar graph and a pie MUST distinguish categories to be read at all — that is
   correct data-viz, not a second accent.  GREEN is reserved for "correct" and
   "CALIBRATED".

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/GraphsLab.jsx
     2. Import and render it:
          import GraphsLab from './GraphsLab';
          export default function Page() { return <GraphsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the counts array, the
              active view, the focused category, the lesson step).
     MODEL  — angles/percents/icons are exact integer arithmetic; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The categories are fixed; the "data" the student builds
   is the array of integer COUNTS, one per category.  The controls are the − / +
   steppers in the table (work in every view), plus dragging a bar's top in the
   bar view, plus a VIEW switch (Bar / Pictograph / Circle) that unlocks one view
   per lesson step so the picture never runs ahead of the idea.
   ------------------------------------------------------------------------- */
const CATS = [
  { key: 'walk', name: 'Walk', color: '#348a8c' }, // teal
  { key: 'bus', name: 'Bus', color: '#d9982b' }, // gold
  { key: 'car', name: 'Car', color: '#3f74a6' }, // blue
  { key: 'bike', name: 'Bike', color: '#8163a6' }, // violet
  { key: 'scoot', name: 'Scooter', color: '#b26a4e' }, // clay
];
const NC = CATS.length;
const CMAX = 12; // a single category's max count (bar axis top)
const START = [5, 8, 6, 3, 2]; // total 24 → clean angles 75/120/90/45/30
const KEY = 2; // pictograph: one icon stands for 2 students

const STEP_BAR = 0; // meet the data as a bar graph — length = count
const STEP_AXIS = 1; // read the scale; bars start at 0 (the truncated-axis trap)
const STEP_PICTO = 2; // pictograph — each icon is worth KEY (the key)
const STEP_PIE = 3; // circle graph — slice angle = share × 360°
const STEP_LINK = 4; // one count, three pictures (the centerpiece)
const STEP_CHOOSE = 5; // which graph fits which question
const STEP_CALIB = 6; // build the graph to match a mystery target (calibration)

const VIEWS = [
  { key: 'bar', name: 'Bar', unlock: STEP_BAR },
  { key: 'picto', name: 'Pictograph', unlock: STEP_PICTO },
  { key: 'pie', name: 'Circle', unlock: STEP_PIE },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Exact integer arithmetic for every encoding; nothing here
   knows a pixel.
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
// exact terminating decimal for num/den by integer long division
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
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact decimal, or "≈" 2-dp rounding
function fmtRatio(num, den) {
  if (den === 0) return { text: '—', approx: false };
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
// render an exact icon count as a whole/half/quarter-friendly string (key ≤ 4)
function fmtIcons(count, key) {
  const whole = Math.floor(count / key);
  const rem = count % key;
  if (rem === 0) return String(whole);
  const f = reduceFrac(rem, key); // e.g. 1/2, 1/4, 3/4
  const glyph = f.num === 1 && f.den === 2 ? '½' : f.num === 1 && f.den === 4 ? '¼' : f.num === 3 && f.den === 4 ? '¾' : f.num + '/' + f.den;
  return (whole === 0 ? '' : whole) + glyph;
}

// the derived numbers for a data set of category counts
function computeStats(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  let maxC = 0;
  let minC = Infinity;
  for (const c of counts) {
    if (c > maxC) maxC = c;
    if (c < minC) minC = c;
  }
  if (!isFinite(minC)) minC = 0;
  const modeIdx = [];
  const leastIdx = [];
  if (total > 0) {
    for (let i = 0; i < counts.length; i++) if (counts[i] === maxC) modeIdx.push(i);
    for (let i = 0; i < counts.length; i++) if (counts[i] === minC) leastIdx.push(i);
  }
  return { total, maxC, minC, modeIdx, leastIdx };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION / MATCH goal: a faint dashed TARGET bar
   sits behind each category (the calibration always uses the bar view, the most
   readable display). The student reads each target off the scale and sets the
   counts to match.  The meter reads closeness by total absolute difference, and
   CALIBRATED is an exact hit: every count equals its target.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 28; // total |count−target| spread across the meter (wide enough
// that the meter gives feedback from the very first correction of the flat start set)
function totalDiff(counts, target) {
  let d = 0;
  for (let i = 0; i < counts.length; i++) d += Math.abs(counts[i] - (target ? target[i] : 0));
  return d;
}
const matchPercent = (counts, target) =>
  target ? 100 * Math.max(0, 1 - totalDiff(counts, target) / MATCH_SCALE) : 0;
const isCalibrated = (counts, target) => !!target && totalDiff(counts, target) === 0;

function makeTargets(prev) {
  let t;
  let guard = 0;
  do {
    t = CATS.map(() => 2 + Math.floor(Math.random() * 9)); // each 2…10
    guard++;
  } while (prev && t.join(',') === prev.join(',') && guard < 20);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Encoding readout. The focused category's ONE count is shown in its
   THREE costumes at once (bar length, icon row, pie angle), in the carmine
   accent — the thesis made continuously visible.  Rendered by a CHILD component,
   so styles are INLINED (styled-jsx only scopes a component's own JSX) — this
   keeps the readout identical in Next.js and any plain preview.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f';
const INK = '#1c2b3a';
const INK_SOFT = '#5b6b7b';

function MiniBar({ count }) {
  const w = 52;
  const fill = Math.max(0, Math.min(1, count / CMAX)) * w;
  return (
    <svg width={w} height="14" viewBox={`0 0 ${w} 14`} aria-hidden="true" style={{ display: 'block' }}>
      <rect x="0" y="3" width={w} height="8" rx="2" fill="rgba(28,43,58,0.10)" />
      <rect x="0" y="3" width={fill} height="8" rx="2" fill={CARMINE} />
    </svg>
  );
}
function MiniIcons({ count }) {
  const whole = Math.floor(count / KEY);
  const frac = (count % KEY) / KEY;
  const cells = [];
  const cap = Math.ceil(CMAX / KEY);
  for (let i = 0; i < cap; i++) {
    let f = 0;
    if (i < whole) f = 1;
    else if (i === whole) f = frac;
    cells.push(f);
  }
  return (
    <svg width={cap * 12} height="14" viewBox={`0 0 ${cap * 12} 14`} aria-hidden="true" style={{ display: 'block' }}>
      {cells.map((f, i) => (
        <g key={i}>
          <rect x={i * 12} y="2" width="10" height="10" rx="2.5" fill="none" stroke="rgba(28,43,58,0.18)" />
          {f > 0 && <rect x={i * 12} y="2" width={10 * f} height="10" rx={f === 1 ? 2.5 : 0} fill={CARMINE} />}
        </g>
      ))}
    </svg>
  );
}
function MiniWedge({ count, total }) {
  const R = 8;
  const cx = 9;
  const cy = 9;
  if (total <= 0 || count <= 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(28,43,58,0.18)" />
      </svg>
    );
  }
  const share = count / total;
  const a = share * 2 * Math.PI;
  const start = -Math.PI / 2;
  const x1 = cx + R * Math.cos(start);
  const y1 = cy + R * Math.sin(start);
  const x2 = cx + R * Math.cos(start + a);
  const y2 = cy + R * Math.sin(start + a);
  const large = a > Math.PI ? 1 : 0;
  const d =
    share >= 1
      ? `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(28,43,58,0.18)" />
      <path d={d} fill={CARMINE} />
    </svg>
  );
}
const ENC_LABEL = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: INK_SOFT,
};
const ENC_VAL = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
  fontSize: '13px',
  fontWeight: 700,
  color: INK,
};
function EncodingReadout({ focusIdx, counts, total }) {
  if (focusIdx == null) {
    return (
      <span style={{ color: INK_SOFT, fontSize: '13px', fontStyle: 'italic' }}>
        Click a category to see its count in all three graphs.
      </span>
    );
  }
  const cat = CATS[focusIdx];
  const count = counts[focusIdx];
  const iconsTxt = fmtIcons(count, KEY);
  const angle = fmtRatio(count * 360, total);
  const pct = fmtRatio(count * 100, total);
  const enc = { display: 'inline-flex', alignItems: 'center', gap: '7px' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '7px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '999px',
            background: CARMINE,
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12.5px',
            fontWeight: 700,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: cat.color, boxShadow: '0 0 0 1.5px #fff' }} />
          {cat.name}
        </span>
        <span style={{ ...ENC_VAL, fontSize: '26px', color: CARMINE }}>{count}</span>
        <span style={{ ...ENC_LABEL }}>students</span>
      </span>
      <span style={enc}>
        <MiniBar count={count} />
        <span style={ENC_VAL}>{count}</span>
        <span style={ENC_LABEL}>length</span>
      </span>
      <span style={enc}>
        <MiniIcons count={count} />
        <span style={ENC_VAL}>{iconsTxt}</span>
        <span style={ENC_LABEL}>icons&nbsp;×{KEY}</span>
      </span>
      <span style={enc}>
        <MiniWedge count={count} total={total} />
        <span style={ENC_VAL}>
          {angle.approx ? '≈' : ''}
          {angle.text}°
        </span>
        <span style={ENC_LABEL}>
          {pct.approx ? '≈' : ''}
          {pct.text}%
        </span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the view it teaches unlocks with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   graph-reading misconceptions ("taller = longer/faster", "read icons as 1 each",
   "a bigger count is always a bigger slice", "the axis can start anywhere").
   Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A bar graph: length shows the count',
    body:
      'A bar graph turns counts into bars. Each category gets one bar, and the bar’s LENGTH stands ' +
      'for its count — a longer bar means a bigger count. Lined up on the same baseline, the bars let ' +
      'you compare categories at a glance: the tallest bar is the most common. Change a count with the ' +
      '− / + buttons in the table, or drag a bar’s top.',
    q: 'On this bar graph, what does a TALLER bar mean?',
    choices: ['More students chose that way to get to school', 'That way is longer or faster', 'That bar is nearer the top of the page'],
    answer: 0,
    feedback:
      'Bar length encodes the COUNT — how many. The tallest bar is the most common category. Height ' +
      'here is a number of students, not a distance, a speed, or a position on the page.',
  },
  {
    title: 'Read the scale — and start at zero',
    body:
      'One rule keeps a bar graph honest: the SCALE starts at ZERO. Press ' +
      '“Zoom axis” — small differences suddenly look huge, though no count changed.',
    q: 'A graph zooms its scale to start at 5 instead of 0. What happens?',
    choices: ['Differences between the bars look bigger than they really are', 'The counts in the data change', 'The tallest bar becomes the shortest'],
    answer: 0,
    feedback:
      'The data is unchanged; only the picture lies. Check that the scale ' +
      'starts at 0 before you trust a bar graph.',
  },
  {
    title: 'Pictograph: each icon stands for many',
    body:
      'A KEY tells you how many each icon is worth — here ' + KEY + ' students. ' +
      'Read icons through the key, never as 1 each.',
    q: 'Each icon stands for 2 students. A category’s row has 4 icons. How many students is that?',
    choices: ['8 — because 4 icons × 2 each', '4 — one student per icon', '2 — the key number'],
    answer: 0,
    feedback:
      'Multiply by the key: 4 icons × 2 = 8 students. The power of a scaled pictograph is that one icon ' +
      'can stand for many, so a few icons show a big count — but you must read them through the key.',
  },
  {
    title: 'Circle graph: a slice of the whole',
    body:
      'A circle (pie) graph shows how one whole is divided into parts. Each slice is proportional to its ' +
      'SHARE of the total: angle = (count ÷ total) × 360°, and percent = (count ÷ total) × 100%. What ' +
      'sets a slice is the share, not the raw count — the slices always add up to the full 360°.',
    q: 'Two classes each had 6 walkers. Class A has 12 students, class B has 30. Whose WALK slice is bigger?',
    choices: ['Class A — 6 of 12 is a half; 6 of 30 is much less', 'They tie — both had 6 walkers', 'Class B — it has more students in total'],
    answer: 0,
    feedback:
      'A slice is set by the SHARE, not the count. 6 of 12 = 50% (a half-circle, 180°); 6 of 30 = 20% ' +
      '(72°). The same 6 walkers make very different slices because the wholes differ. A circle graph ' +
      'is about parts of a whole.',
  },
  {
    title: 'One count, three pictures',
    body:
      'Here is the big idea. Click a category and watch it three ways at once (top readout): its bar ' +
      'LENGTH, its number of ICONS, and its pie ANGLE. Now flip the view — Bar, Pictograph, Circle — and ' +
      'its count never changes; only the picture does. Every graph is the same number wearing a ' +
      'different costume, because length, icon-count, and angle are all PROPORTIONAL to the count.',
    q: 'You switch a category’s display from a bar graph to a circle graph. Its count is 6 either way. What changed?',
    choices: ['Only how the 6 is drawn — as a length, then as an angle', 'The value 6 became a different number', 'The category lost some students'],
    answer: 0,
    feedback:
      'The count is the invariant; only the encoding changes. 6 might be 6 units of bar length, 3 icons ' +
      'at a key of 2, or a 90° slice of a 24-student whole — three pictures of one number. Choosing a ' +
      'graph is choosing how to draw the count.',
  },
  {
    title: 'Which graph fits?',
    body:
      'Different graphs answer different questions. A BAR graph compares separate categories (which is ' +
      'most common?). A CIRCLE graph shows parts of one whole (what fraction took the bus?). A LINE ' +
      'graph shows change over time (how did bus riders change month by month?). Match the graph to the ' +
      'question and to the kind of data.',
    q: 'You want to show what FRACTION of the class uses each way to school. Which graph fits best?',
    choices: ['A circle (pie) graph — it shows parts of a whole', 'A line graph — it shows change over time', 'No graph can show a fraction'],
    answer: 0,
    feedback:
      'Parts of one whole → a circle graph, where every slice is a share of 360°. A bar graph is better ' +
      'for comparing counts side by side; a line graph is for change over time. The right display ' +
      'depends on the question you are asking.',
  },
  {
    title: 'Build the graph to match',
    body:
      'Final challenge. A faint dashed TARGET bar sits behind each category. Read each target off the ' +
      'scale and set the counts — with the − / + buttons or by dragging the bars — until every bar ' +
      'reaches its target. The meter reads CALIBRATED when the whole graph matches. Press “New target” ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function GraphsLab() {
  const [counts, setCounts] = useState(START);
  const [step, setStep] = useState(0);
  const [view, setView] = useState('bar');
  const [focus, setFocus] = useState(1); // Bus — a populated readout from the start
  const [answers, setAnswers] = useState({});
  const [zoomAxis, setZoomAxis] = useState(false); // the truncated-axis demo
  const [target, setTarget] = useState(null);
  const [, force] = useState(0);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // hit-test geometry, written by draw()
  const sceneRef = useRef({}); // snapshot the renderer reads
  const countsRef = useRef(counts);
  const grabRef = useRef(null); // { i, moved } while dragging a bar top

  countsRef.current = counts;

  const current = STEPS[step];
  const calib = !!current.calib;
  const effView = calib ? 'bar' : view; // calibration is always read on bars

  const st = computeStats(counts);
  const { total, maxC, minC, modeIdx, leastIdx } = st;

  const matchPct = calib ? matchPercent(counts, target) : 0;
  const calibrated = calib ? isCalibrated(counts, target) : false;

  const modeNames = total > 0 ? modeIdx.map((i) => CATS[i].name).join(', ') : '—';
  const leastNames = total > 0 ? leastIdx.map((i) => CATS[i].name).join(', ') : '—';

  // snapshot for the renderer (never reads stale values)
  sceneRef.current = {
    counts,
    total,
    maxC,
    view: effView,
    focus,
    zoomAxis: zoomAxis && effView === 'bar' && !calib ? true : false,
    calib,
    target,
    modeIdx,
  };

  /* ---- full redraw from state -------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const PAPER = '#FBFBF8';
    const AXIS = 'rgba(28,43,58,0.55)';
    const S = sceneRef.current;

    ctx.clearRect(0, 0, Wd, Hd);

    /* faint quadrille backdrop */
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

    const hexA = (hex, a) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    geoRef.current = { view: S.view };

    if (S.view === 'bar') drawBar(ctx, Wd, Hd, S, hexA, AXIS);
    else if (S.view === 'picto') drawPicto(ctx, Wd, Hd, S, hexA);
    else drawPie(ctx, Wd, Hd, S, hexA);

    /* ---------- BAR ---------- */
    function drawBar(ctx, Wd, Hd, S, hexA, AXIS) {
      const padL = 40;
      const padR = 20;
      const padT = 20;
      const padB = 46;
      const plotW = Wd - padL - padR;
      const plotH = Hd - padT - padB;
      const baseY = padT + plotH;

      // axis range — honest [0, CMAX] or the misleading zoomed window
      let lo = 0;
      let hi = CMAX;
      if (S.zoomAxis && S.total > 0) {
        lo = Math.max(0, Math.min(...S.counts) - 1);
        hi = Math.max(...S.counts) + 1;
        if (hi <= lo) hi = lo + 1;
      }
      const yOf = (v) => baseY - ((v - lo) / (hi - lo)) * plotH;

      // gridlines + scale labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      const nTicks = hi - lo;
      const tickStep = nTicks > 8 ? 2 : 1;
      for (let v = lo; v <= hi; v += tickStep) {
        const Y = Math.round(yOf(v)) + 0.5;
        ctx.strokeStyle = v === lo ? AXIS : 'rgba(28,43,58,0.09)';
        ctx.lineWidth = v === lo ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(padL, Y);
        ctx.lineTo(Wd - padR, Y);
        ctx.stroke();
        ctx.fillStyle = INK_SOFT;
        ctx.fillText(String(v), padL - 7, yOf(v));
      }

      // zoomed-axis warning: a broken-axis mark + tint
      if (S.zoomAxis && S.total > 0) {
        ctx.fillStyle = 'rgba(200,30,79,0.06)';
        ctx.fillRect(padL, padT, plotW, plotH);
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        const zY = baseY;
        ctx.beginPath();
        ctx.moveTo(padL - 6, zY - 3);
        ctx.lineTo(padL + 6, zY + 3);
        ctx.moveTo(padL - 6, zY - 8);
        ctx.lineTo(padL + 6, zY - 2);
        ctx.stroke();
        ctx.fillStyle = CARMINE;
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('⚠ axis starts at ' + lo + ', not 0', padL + 6, padT + 10);
      }

      // caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('bar graph — each bar’s height is its count', padL, 3);

      // bars
      const slotW = plotW / NC;
      const barW = Math.min(slotW * 0.6, 64);
      const bars = [];
      for (let i = 0; i < NC; i++) {
        const cx = padL + slotW * (i + 0.5);
        const val = S.counts[i];
        const topY = yOf(Math.max(val, lo));
        const h = Math.max(0, baseY - topY);
        const x = cx - barW / 2;
        const isFocus = S.focus === i;
        const col = CATS[i].color;

        // calibration target bar (dashed, behind)
        if (S.calib && S.target) {
          const tTop = yOf(S.target[i]);
          ctx.save();
          ctx.strokeStyle = 'rgba(91,107,123,0.85)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(x - 3, tTop, barW + 6, baseY - tTop);
          ctx.setLineDash([]);
          ctx.restore();
        }

        ctx.fillStyle = isFocus ? col : hexA(col, 0.82);
        ctx.fillRect(x, topY, barW, h);
        if (isFocus) {
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x - 1, topY - 1, barW + 2, h + 2);
        }

        // value label above the bar
        ctx.fillStyle = isFocus ? CARMINE : INK;
        ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (val > 0 || !S.calib) ctx.fillText(String(val), cx, topY - 4);

        // category label below the axis
        ctx.fillStyle = isFocus ? CARMINE : INK_SOFT;
        ctx.font = (isFocus ? '700 ' : '600 ') + '12px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(CATS[i].name, cx, baseY + 8);
        // swatch dot under the name
        ctx.beginPath();
        ctx.arc(cx, baseY + 30, 4, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        bars.push({ i, x, w: barW, topY, baseY, lo, hi, plotH, padT });
      }
      geoRef.current = { view: 'bar', bars, baseY, padT, plotH, lo, hi };
    }

    /* ---------- PICTOGRAPH ---------- */
    function drawPicto(ctx, Wd, Hd, S, hexA) {
      const padL = 14;
      const padR = 16;
      const padT = 34;
      const padB = 30;
      const labelW = 74;
      const rowsH = Hd - padT - padB;
      const rowH = rowsH / NC;
      const iconMax = Math.ceil(CMAX / KEY); // most icons a row can need
      const gridL = padL + labelW;
      const avail = Wd - gridL - padR;
      const cell = Math.min(avail / iconMax, rowH * 0.82, 40);
      const iconS = cell * 0.82;

      // key note
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('pictograph — ', padL, 8);
      const kw = ctx.measureText('pictograph — ').width;
      // a little key icon
      const ky = 10;
      ctx.fillStyle = INK_SOFT;
      roundRect(ctx, padL + kw, ky, iconS * 0.7, iconS * 0.7, 3);
      ctx.fill();
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(' = ' + KEY + ' students (the key)', padL + kw + iconS * 0.7 + 2, 8);

      const rows = [];
      for (let i = 0; i < NC; i++) {
        const cyRow = padT + rowH * (i + 0.5);
        const val = S.counts[i];
        const col = CATS[i].color;
        const isFocus = S.focus === i;

        // focus band
        if (isFocus) {
          ctx.fillStyle = 'rgba(200,30,79,0.06)';
          ctx.fillRect(padL - 4, cyRow - rowH / 2 + 3, Wd - padL - padR + 8, rowH - 6);
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2;
          strokeRoundRect(ctx, padL - 4, cyRow - rowH / 2 + 3, Wd - padL - padR + 8, rowH - 6, 7);
        }

        // row label + swatch
        ctx.fillStyle = isFocus ? CARMINE : INK;
        ctx.font = (isFocus ? '700 ' : '600 ') + '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.beginPath();
        ctx.arc(padL + 7, cyRow, 5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.fillStyle = isFocus ? CARMINE : INK;
        ctx.fillText(CATS[i].name, padL + 18, cyRow + 0.5);

        // icons: whole + partial
        const whole = Math.floor(val / KEY);
        const frac = (val % KEY) / KEY;
        for (let k = 0; k < iconMax; k++) {
          const ix = gridL + cell * k + (cell - iconS) / 2;
          const iy = cyRow - iconS / 2;
          let f = 0;
          if (k < whole) f = 1;
          else if (k === whole) f = frac;
          // ghost slot
          ctx.strokeStyle = 'rgba(28,43,58,0.12)';
          ctx.lineWidth = 1;
          strokeRoundRect(ctx, ix, iy, iconS, iconS, iconS * 0.28);
          if (f > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(ix, iy, iconS * f, iconS);
            ctx.clip();
            ctx.fillStyle = col;
            roundRect(ctx, ix, iy, iconS, iconS, iconS * 0.28);
            ctx.fill();
            ctx.restore();
          }
        }

        // count in students at the right end
        const iconsTxt = fmtIcons(val, KEY);
        ctx.fillStyle = isFocus ? CARMINE : INK_SOFT;
        ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(iconsTxt + ' → ' + val, gridL + cell * iconMax + 6, cyRow);

        rows.push({ i, y0: cyRow - rowH / 2, y1: cyRow + rowH / 2 });
      }
      geoRef.current = { view: 'picto', rows };
    }

    /* ---------- CIRCLE (PIE) ---------- */
    function drawPie(ctx, Wd, Hd, S, hexA) {
      const padT = 26;
      const legendW = Math.min(150, Wd * 0.32);
      const areaW = Wd - legendW;
      const cx = areaW * 0.5;
      const cy = padT + (Hd - padT) * 0.5;
      const R = Math.min(areaW * 0.42, (Hd - padT) * 0.42);

      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('circle graph — each slice is its share of 360°', 12, 3);

      const start = -Math.PI / 2;
      const slices = [];

      if (S.total <= 0) {
        ctx.strokeStyle = 'rgba(28,43,58,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('add students to fill the circle', cx, cy);
        geoRef.current = { view: 'pie', slices: [], cx, cy, R };
        return;
      }

      let acc = 0;
      for (let i = 0; i < NC; i++) {
        const val = S.counts[i];
        if (val <= 0) {
          slices.push({ i, a0: acc, a1: acc, val });
          continue;
        }
        const a = (val / S.total) * 2 * Math.PI;
        const a0 = acc;
        const a1 = acc + a;
        const mid = start + (a0 + a1) / 2;
        const isFocus = S.focus === i;
        const ox = isFocus ? Math.cos(mid) * 9 : 0;
        const oy = isFocus ? Math.sin(mid) * 9 : 0;
        const col = CATS[i].color;

        ctx.beginPath();
        ctx.moveTo(cx + ox, cy + oy);
        ctx.arc(cx + ox, cy + oy, R, start + a0, start + a1);
        ctx.closePath();
        ctx.fillStyle = isFocus ? col : hexA(col, 0.86);
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 2;
        ctx.stroke();
        if (isFocus) {
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // percent label inside big-enough slices
        if (a > 0.42) {
          const pct = fmtRatio(val * 100, S.total);
          const lr = R * 0.62;
          const lx = cx + ox + Math.cos(mid) * lr;
          const ly = cy + oy + Math.sin(mid) * lr;
          ctx.fillStyle = '#fff';
          ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((pct.approx ? '≈' : '') + pct.text + '%', lx, ly);
        }
        acc = a1;
        slices.push({ i, a0, a1, val });
      }

      // focused slice: angle annotation near the center
      if (S.focus != null && S.counts[S.focus] > 0) {
        const val = S.counts[S.focus];
        const ang = fmtRatio(val * 360, S.total);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(CATS[S.focus].name + ': ' + (ang.approx ? '≈' : '') + ang.text + '°', cx, cy + R + 8);
      }

      // legend
      const lx = areaW + 6;
      let ly = padT + 6;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < NC; i++) {
        const isFocus = S.focus === i;
        ctx.fillStyle = CATS[i].color;
        roundRect(ctx, lx, ly - 6, 12, 12, 3);
        ctx.fill();
        ctx.fillStyle = isFocus ? CARMINE : INK;
        ctx.font = (isFocus ? '700 ' : '600 ') + '12px system-ui, sans-serif';
        ctx.fillText(CATS[i].name + '  ' + S.counts[i], lx + 18, ly);
        ly += 26;
      }
      // whole
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText('whole = ' + S.total, lx, ly + 2);
      ctx.fillText('= 360°', lx, ly + 18);

      geoRef.current = { view: 'pie', slices, cx, cy, R, start };
    }

    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
    function strokeRoundRect(ctx, x, y, w, h, r) {
      roundRect(ctx, x, y, w, h, r);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    draw();
  }, [counts, step, view, focus, zoomAxis, target, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* switch to the view a step teaches, and unlock it */
  useEffect(() => {
    if (step === STEP_PICTO) setView('picto');
    else if (step === STEP_PIE) setView('pie');
    else if (step <= STEP_AXIS) setView('bar');
    else if (step === STEP_CHOOSE) setView('bar');
    // STEP_LINK: leave the current view so the student can flip freely
    if (step !== STEP_AXIS) setZoomAxis(false);
  }, [step]);

  /* set up the calibration target on arrival, from a flat starting graph */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTargets(null));
      setCounts([4, 4, 4, 4, 4]);
      setView('bar');
      setZoomAxis(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const clampCount = (v) => Math.max(0, Math.min(CMAX, v));

  const setCount = (i, v) => {
    const next = countsRef.current.slice();
    next[i] = clampCount(v);
    setCounts(next);
  };
  const bump = (i, d) => {
    setFocus(i);
    setCount(i, countsRef.current[i] + d);
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;

    if (g.view === 'bar' && g.bars) {
      for (const b of g.bars) {
        if (cssX >= b.x - 4 && cssX <= b.x + b.w + 4 && cssY >= b.padT && cssY <= b.baseY + 34) {
          setFocus(b.i);
          grabRef.current = { i: b.i, moved: false };
          if (e.currentTarget.setPointerCapture) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
          // clicking sets the count to the value at the cursor height
          return;
        }
      }
    } else if (g.view === 'picto' && g.rows) {
      for (const r of g.rows) if (cssY >= r.y0 && cssY <= r.y1) return setFocus(r.i);
    } else if (g.view === 'pie' && g.slices && g.slices.length) {
      const dx = cssX - g.cx;
      const dy = cssY - g.cy;
      if (Math.hypot(dx, dy) <= g.R + 10) {
        let ang = Math.atan2(dy, dx) - g.start;
        ang = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        for (const s of g.slices) {
          if (s.val > 0 && ang >= s.a0 && ang < s.a1) return setFocus(s.i);
        }
      }
    }
  };

  const onPointerMove = (e) => {
    const grab = grabRef.current;
    if (!grab) return;
    const g = geoRef.current;
    if (g.view !== 'bar' || !g.bars) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssY = e.clientY - rect.top;
    const b = g.bars.find((x) => x.i === grab.i);
    if (!b) return;
    // value at cursor height, snapped to integers within [lo, hi]
    const frac = (b.baseY - cssY) / b.plotH;
    const v = Math.round(b.lo + frac * (b.hi - b.lo));
    if (clampCount(v) !== countsRef.current[grab.i]) {
      grab.moved = true;
      setCount(grab.i, v);
    }
  };
  const onPointerUp = () => {
    grabRef.current = null;
  };

  /* ---- toolbar / presets ------------------------------------------------- */
  const applyPreset = (arr) => setCounts(arr.map(clampCount));
  const evenSet = () => applyPreset([5, 5, 5, 5, 5]);
  const skewSet = () => applyPreset([2, 11, 3, 1, 1]);
  const randomSet = () => applyPreset(CATS.map(() => 1 + Math.floor(Math.random() * CMAX)));
  const resetData = () => {
    if (calib) {
      setCounts([4, 4, 4, 4, 4]);
    } else {
      setCounts(START);
      setZoomAxis(false);
    }
  };

  const chooseView = (v, unlock) => {
    if (step < unlock || calib) return;
    setView(v);
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const focusCat = focus != null ? CATS[focus] : null;

  /* spoken description (accessibility) */
  const viewName = effView === 'bar' ? 'bar graph' : effView === 'picto' ? 'pictograph' : 'circle graph';
  const spoken =
    total === 0
      ? 'The data set is empty. Use the plus buttons to add students to each category.'
      : `A ${viewName} of ${total} students across ${NC} categories. ` +
        `The most common is ${modeNames}. ` +
        (focusCat
          ? `${focusCat.name} has ${counts[focus]} students — a bar of length ${counts[focus]}, ` +
            `${fmtIcons(counts[focus], KEY)} icons, and a ${fmtRatio(counts[focus] * 360, total).text}-degree slice.`
          : '');

  return (
    <div className="glab">
      <header className="head">
        <h1>Graphs — One Count, Three Pictures</h1>
        <p className="lede">
          A graph turns a table of counts into a <em>picture</em> you can read at a glance. Build one data
          set — <span className="mono">how the class gets to school</span> — and see it three ways: a{' '}
          <em>bar graph</em>, a <em>pictograph</em>, and a <em>circle graph</em>. The bar’s length, the row
          of icons, and the pie’s angle are all the <em>same number</em> in a different costume. Each view
          unlocks with the lesson, so the picture never runs ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <EncodingReadout focusIdx={focus} counts={counts} total={total} />
            </p>
          </div>

          <div className="viewbar" role="group" aria-label="Choose a graph type">
            {VIEWS.map((v) => {
              const unlocked = step >= v.unlock;
              const active = effView === v.key;
              return (
                <button
                  type="button"
                  key={v.key}
                  className={'seg' + (active ? ' on' : '') + (!unlocked || calib ? ' locked' : '')}
                  onClick={() => chooseView(v.key, v.unlock)}
                  disabled={!unlocked || calib}
                  aria-pressed={active}
                >
                  {v.name}
                  {!unlocked && <span className="lock" aria-hidden="true"> 🔒</span>}
                </button>
              );
            })}
            {effView === 'bar' && step >= STEP_AXIS && !calib && (
              <button
                type="button"
                className={'seg axis' + (zoomAxis ? ' warn' : '')}
                onClick={() => setZoomAxis((z) => !z)}
                aria-pressed={zoomAxis}
                title="Toggle a misleading zoomed axis"
              >
                {zoomAxis ? 'Zoomed axis ⚠' : 'Zoom axis'}
              </button>
            )}
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
              {effView === 'bar' ? 'drag bars · keyboard table controls below' : 'focus categories with the buttons below'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the graph matches the target.' : ''}
          </p>

          {/* frequency table — the counts, always editable */}
          <div className="tablewrap" data-viz-keyboard-equivalent="graph-table">
            <table className="freq">
              <thead>
                <tr>
                  <th className="c-cat">Category</th>
                  <th className="c-cnt">Count</th>
                  <th className="c-enc">
                    {effView === 'bar' ? 'Bar length' : effView === 'picto' ? 'Icons (×' + KEY + ')' : 'Slice'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATS.map((c, i) => {
                  const val = counts[i];
                  const isFocus = focus === i;
                  const enc =
                    effView === 'bar'
                      ? val + ' units'
                      : effView === 'picto'
                      ? fmtIcons(val, KEY) + ' icons'
                      : total > 0
                      ? (fmtRatio(val * 360, total).approx ? '≈' : '') +
                        fmtRatio(val * 360, total).text +
                        '° · ' +
                        (fmtRatio(val * 100, total).approx ? '≈' : '') +
                        fmtRatio(val * 100, total).text +
                        '%'
                      : '—';
                  return (
                    <tr key={c.key} className={isFocus ? 'rf' : ''}>
                      <td className="c-cat">
                        <button
                          type="button"
                          className="catfocus"
                          aria-pressed={isFocus}
                          onClick={() => setFocus((prev) => (prev === i ? null : i))}
                        >
                          <span className="sw" style={{ background: c.color }} aria-hidden="true" />
                          {c.name}
                        </button>
                      </td>
                      <td className="c-cnt">
                        <span className="stepper">
                          <button
                            type="button"
                            aria-label={'one fewer ' + c.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              bump(i, -1);
                            }}
                            disabled={val <= 0}
                          >
                            −
                          </button>
                          <span className="cval mono">{val}</span>
                          <button
                            type="button"
                            aria-label={'one more ' + c.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              bump(i, +1);
                            }}
                            disabled={val >= CMAX}
                          >
                            +
                          </button>
                        </span>
                      </td>
                      <td className="c-enc mono">{enc}</td>
                    </tr>
                  );
                })}
                <tr className="totalrow">
                  <td className="c-cat">Total</td>
                  <td className="c-cnt mono">{total}</td>
                  <td className="c-enc mono">{effView === 'pie' ? '360° · 100%' : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Total students</span>
              <span className="fact-v mono big">{total}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Most common</span>
              <span className="fact-v">{modeNames}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Fewest</span>
              <span className="fact-v">{leastNames}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Whole → circle</span>
              <span className="fact-v mono">{total} = 360°</span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={evenSet} disabled={calib}>
              Even
            </button>
            <button type="button" className="btn ghost" onClick={skewSet} disabled={calib}>
              One big
            </button>
            <button type="button" className="btn ghost" onClick={randomSet} disabled={calib}>
              Random
            </button>
            <button type="button" className="btn ghost" onClick={resetData}>
              Reset
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

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">read each dashed target</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTargets(target));
                  setCounts([4, 4, 4, 4, 4]);
                }}
              >
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
                  setTarget(null);
                  setView('bar');
                  setZoomAxis(false);
                  setFocus(1);
                  setCounts(START);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          bar length · icon count · slice angle = (count ÷ total) × 360°
        </span>{' '}
        &nbsp;·&nbsp; all three are proportional to the count. Scaled bar &amp; picture graphs: CCSS 3.MD.B.3;
        circle graphs &amp; percent extend to grades 6–7. Counts here are whole students; the same graphs
        work for any data.
      </footer>

      <style jsx>{`
        .glab {
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
          min-height: 40px;
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .viewbar {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .seg {
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 8px 13px;
          border-radius: 8px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
        }
        .seg.on {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .seg.locked {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .seg.axis {
          margin-left: auto;
          border-style: dashed;
        }
        .seg.axis.warn {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .seg:not(:disabled):hover {
          border-color: var(--ink);
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
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
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
        .tablewrap {
          margin: 14px 2px 2px;
          overflow-x: auto;
        }
        .freq {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .freq th {
          text-align: left;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          padding: 4px 8px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.14);
        }
        .freq td {
          padding: 5px 8px;
          border-bottom: 1px solid rgba(28, 43, 58, 0.07);
        }
        .freq tr.rf td {
          background: rgba(200, 30, 79, 0.06);
        }
        .freq tr.rf .c-cat {
          box-shadow: inset 3px 0 0 var(--curve);
          font-weight: 700;
        }
        .c-cat {
          white-space: nowrap;
        }
        .catfocus {
          display: inline-flex;
          align-items: center;
          min-width: 44px;
          min-height: 44px;
          padding: 3px 7px;
          border: 1px solid transparent;
          border-radius: 7px;
          background: transparent;
          color: var(--ink);
          font: inherit;
          cursor: pointer;
        }
        .catfocus:hover,
        .catfocus[aria-pressed='true'] {
          border-color: rgba(200, 30, 79, 0.35);
          background: rgba(200, 30, 79, 0.06);
        }
        .c-enc {
          color: var(--ink-soft);
          white-space: nowrap;
        }
        .sw {
          display: inline-block;
          width: 11px;
          height: 11px;
          border-radius: 3px;
          margin-right: 7px;
          vertical-align: -1px;
        }
        .stepper {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .stepper button {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          border: 1px solid rgba(28, 43, 58, 0.25);
          background: #fff;
          color: var(--ink);
          font: 700 15px/1 system-ui, sans-serif;
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s, opacity 0.12s;
        }
        .stepper button:not(:disabled):hover {
          border-color: var(--ink);
          background: var(--paper);
        }
        .stepper button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .cval {
          min-width: 18px;
          text-align: center;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .totalrow td {
          border-top: 2px solid rgba(28, 43, 58, 0.16);
          border-bottom: none;
          font-weight: 700;
          padding-top: 7px;
        }
        .totalrow {
          cursor: default;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
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
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.big {
          font-size: 20px;
          font-weight: 700;
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
        .quiz {
          margin-top: 4px;
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
        :global(.glab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg,
          .stepper button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
