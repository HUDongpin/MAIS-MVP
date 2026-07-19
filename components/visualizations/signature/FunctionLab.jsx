'use client';

/* ============================================================================
   FunctionLab — an interactive "bench" for WHAT A FUNCTION IS: a rule that
   assigns to each input EXACTLY ONE output — the promise, the test that
   checks it, and the non-examples that make the definition mean something.

        every input fires exactly one arrow  →  function
        one input fires two arrows           →  not a function
        two inputs share an output           →  still a function (legal!)

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab with
   the HS on-ramp — CCSS 8.F.A.1 is the anchor ("Understand that a function
   is a rule that assigns to each input exactly one output.  The graph of a
   function is the set of ordered pairs consisting of an input and the
   corresponding output"), extended by F-IF.A.1 (domain, range, the f(x)
   reading) and F-IF.A.2.  This is the concept BENEATH roughly twenty labs
   in this library — every one of them graphs functions; none of them says
   what a function is.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE ONE-OUTPUT PROMISE, AND THE GUILTY INPUT."
     A relation is drawn as an ARROW DIAGRAM — inputs on the left, outputs
     on the right, arrows between — a picture no sibling owns.  The
     function test is a POLICE CHECK run input by input: an input that
     fires TWO arrows is GUILTY, and one guilty input convicts the whole
     relation.  The two confusions that poison this topic are staged as
     opposite verdicts: MANY-TO-ONE (two inputs sharing an output — the
     squaring rule sends −2 and 2 both to 4) is LEGAL, and the lab proves
     it feels wrong precisely because it is the mirror image of the real
     crime, ONE-TO-MANY.  Then the graph arrives as THE SAME DIAGRAM WORN
     SIDEWAYS: an ordered pair is an arrow written as a dot, and the gold
     VERTICAL PROBE at x asks the same police question — "how many outputs
     does this input fire?"  The vertical-line test is not a new rule; it
     is the definition, standing upright.  The star non-example is the
     CIRCLE — whose own bench (CircleLab) already confesses in its header
     that a circle is not a function of x since most x have two y's.  It
     cites this lab's thesis; this lab returns the citation.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • LineFunctionLab, QuadraticFunctionLab, the six trig labs, Exponential,
       Logarithm, Polynomial … all GRAPH particular functions under dials.
       This lab has NO dials on any formula and never transforms anything:
       its subject is the MEMBERSHIP TEST those labs silently passed.  The
       parabola appears here only as a finite dot-set and a verdict, never
       with a/h/k machinery.
     • CircleLab owns the circle's equation and radius triangle.  Here the
       circle is a NON-EXAMPLE: no equation is manipulated, and the header
       cross-citation is the design (their "for most x there are two
       y-values" is exactly this lab's counterexample).
     • TranslateLab owns the expression tree; EquationLab owns the balance;
       TableLab owns the categorical two-way table.  The arrow diagram is
       none of these: it is a picture of a RELATION, and it is new ground.
     • PointLab owns the ordered pair as an address.  Ordered pairs appear
       here as (input, output) records of arrows — no address language, no
       route arrows, no quadrant machinery.
     • LogarithmLab owns the y = x mirror and inverses (roadmap H15 stays
       untouched): nothing here is ever reflected or inverted, and the
       horizontal-line test is deliberately NOT taught — one lab, one test.

   One-accent discipline: CARMINE is THE VERDICT — the guilty input, its
   two arrows, the "not a function" stamp of evidence.  BLUE is the
   relation under test (its dots, arrows, and curve).  GOLD is the PROBE —
   the vertical line and the police check in progress.  GREEN is reserved
   for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every relation in the lab is a finite table of INTEGER ordered pairs
       or a named curve with an EXACT output-counting rule (the circle of
       radius 5 answers "how many y's at x?" by integer comparison of x²
       against 25 — no float ever decides a verdict).  isFunction() and
       guiltyInputsOf() are pure derivations from those pairs, and the
       audit re-derives every verdict by brute force.
     • Many-to-one legality is proved structurally: the squaring relation
       ships with −2 and 2 both mapping to 4, the audit confirms it is
       many-to-one AND a function, and the one-to-many trap relation is
       confirmed to be its exact transpose.
     • The probe's count at x IS the model's count: the drawing reads
       ysCountAt(x) from the same function the verdict uses, so the picture
       and the verdict cannot disagree.
     • The calibration stamp needs two facts at once: the VERDICT on the
       posted relation is right, AND the EVIDENCE is right — for a
       non-function, the guilty input named; for a function, the explicit
       "no guilty input" plea.  Wrong evidence with a right verdict never
       stamps.  Audited over every case in the docket × every clickable
       input × both verdicts.
   Verified by audit-function.mjs (numeric proof + source greps) and
   verify-function.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FunctionLab.jsx
     2. Import and render it:
          import FunctionLab from './FunctionLab';
          export default function Page() { return <FunctionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the relation on
              stage, the probe, the lesson step, answers, the docket).
     MODEL  — finite integer pair-tables + exact output-counting rules; it
              knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  One dial: the gold probe's x position (the police
   check).  Relations are chosen by chip; nothing else turns.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the verdict: guilty input, its arrows
const BLUE = '#3f74a6'; // the relation under test
const GOLD = '#b98718'; // the probe — the check in progress
const INK_HEX = '#1c2b3a';

const PROBE = { min: -5, max: 5, step: 1 };
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Relations as finite integer pair-tables, or named curves
   with exact output-counting rules.  Every verdict is derived.
   ------------------------------------------------------------------------- */
const isFunction = (pairs) => {
  const seen = new Map();
  for (const [x, y] of pairs) {
    if (seen.has(x) && seen.get(x) !== y) return false;
    seen.set(x, y);
  }
  /* an input listed twice with the SAME output is one arrow, not two */
  return true;
};
const guiltyInputsOf = (pairs) => {
  const outs = new Map();
  for (const [x, y] of pairs) {
    if (!outs.has(x)) outs.set(x, new Set());
    outs.get(x).add(y);
  }
  return [...outs.entries()].filter(([, ys]) => ys.size > 1).map(([x]) => x).sort((a, b) => a - b);
};
const domainOf = (pairs) => [...new Set(pairs.map(([x]) => x))].sort((a, b) => a - b);
const rangeOf = (pairs) => [...new Set(pairs.map(([, y]) => y))].sort((a, b) => a - b);
const ysAt = (pairs, x) => [...new Set(pairs.filter(([px]) => px === x).map(([, y]) => y))];

/* the pair-table relations of the lesson */
const RELATIONS = {
  clean: {
    label: 'the doubling rule',
    pairs: [[-2, -4], [-1, -2], [0, 0], [1, 2], [2, 4]],
  },
  crime: {
    label: 'the split arrow',
    pairs: [[-2, 1], [-1, 3], [1, 2], [1, 4], [2, 0]],
  },
  squares: {
    label: 'the squaring rule',
    pairs: [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]],
  },
  transpose: {
    label: 'the squaring rule, arrows reversed',
    pairs: [[4, -2], [1, -1], [0, 0], [1, 1], [4, 2]],
  },
};

/* the named curves of the graph act: each answers "how many y's at integer
   x?" EXACTLY, and lists its plotted dots for the finite view */
const CURVES = {
  line: {
    label: 'a line',
    ysCountAt: (x) => 1, // a tilted line: one y for every x
    guilty: [],
    fn: true,
  },
  parabola: {
    label: 'a parabola',
    ysCountAt: (x) => 1, // an upward parabola, scaled for the window; still one y per x
    guilty: [],
    fn: true,
  },
  circle: {
    label: 'the circle',
    /* x² + y² = 16: two y's when x² < 16, one at x = ±4, none beyond */
    ysCountAt: (x) => (x * x < 16 ? 2 : x * x === 16 ? 1 : 0),
    guilty: [-3, -2, -1, 0, 1, 2, 3],
    fn: false,
  },
  sideways: {
    label: 'a sideways parabola',
    /* x = y²/4 − 4 …: two y's when x > −4, one at x = −4, none below */
    ysCountAt: (x) => (x > -4 ? 2 : x === -4 ? 1 : 0),
    guilty: [-3, -2, -1, 0, 1, 2, 3, 4, 5],
    fn: false,
  },
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The gatekeeper."  A relation is posted; rule on
   it (function / not), then present the EVIDENCE: the guilty input, or the
   explicit plea that none exists.
   ------------------------------------------------------------------------- */
const DOCKET = [
  { id: 'd1', kind: 'pairs', pairs: [[-3, 2], [-1, 2], [0, 5], [2, -1], [4, 0]] }, // many-to-one: function
  { id: 'd2', kind: 'pairs', pairs: [[-2, 3], [0, 1], [2, -2], [2, 4], [3, 0]] }, // guilty x = 2
  { id: 'd3', kind: 'pairs', pairs: [[-4, -4], [-2, 0], [0, 0], [2, 0], [4, 4]] }, // function
  { id: 'd4', kind: 'pairs', pairs: [[-3, -1], [-3, 3], [0, 2], [1, 1], [4, -2]] }, // guilty x = −3
  { id: 'd5', kind: 'pairs', pairs: [[-5, 1], [-1, -3], [1, 3], [3, 3], [5, -5]] }, // function
  { id: 'd6', kind: 'pairs', pairs: [[-4, 2], [-1, 0], [0, -3], [0, 3], [3, 1]] }, // guilty x = 0
];
function makeCase(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
const calibChecks = (kase, verdict, evidence) => {
  if (!kase) return [false, false];
  const fn = isFunction(kase.pairs);
  const guilty = guiltyInputsOf(kase.pairs);
  const verdictOK = verdict != null && verdict === (fn ? 'function' : 'not');
  const evidenceOK =
    verdictOK &&
    (fn ? evidence === 'none' : evidence != null && evidence !== 'none' && guilty.includes(evidence));
  return [verdictOK, evidenceOK];
};
const closeness = (kase, verdict, evidence) =>
  Math.round((100 * calibChecks(kase, verdict, evidence).filter(Boolean).length) / 2);
const isCalibrated = (kase, verdict, evidence) => calibChecks(kase, verdict, evidence).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the scene is pinned; the reveal
   lives in the feedback.  The distractors are the real beliefs: that
   sharing an output is the crime, that the vertical-line test is a new
   rule, that a curve can be "mostly" a function.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The promise',
    body:
      'A relation, drawn as arrows: inputs on the left, outputs on the right. This one keeps ' +
      'the promise every function makes — EACH input fires EXACTLY ONE arrow. Feed it −2, you ' +
      'get −4. Feed it −2 tomorrow, you get −4 again.',
    scene: { kind: 'pairs', rel: 'clean' },
    q: 'What exactly does a relation have to promise to be called a FUNCTION?',
    choices: [
      'Each input fires exactly one arrow — one output, every time',
      'Each output is hit by exactly one arrow',
      'The arrows never cross when you draw them',
    ],
    answer: 0,
    feedback:
      'One input, one output — that is the entire definition, and it is a promise about ' +
      'INPUTS, not outputs. Outputs may be shared (wait two steps); drawings may tangle. The ' +
      'only thing that can break a function is an input that cannot make up its mind.',
  },
  {
    title: 'The crime',
    body:
      'Same picture, one change: look at input 1. It fires TWO arrows — to 2 and to 4. Ask ' +
      'this relation "what is f(1)?" and it gives two answers at once.',
    scene: { kind: 'pairs', rel: 'crime' },
    q: 'Is this relation a function?',
    choices: [
      'No — the input 1 fires two arrows, and one guilty input convicts it',
      'Yes — most inputs behave, so it mostly is',
      'Yes — 1 just has two outputs',
    ],
    answer: 0,
    feedback:
      'Not a function, and there is no "mostly": the promise is each input, every input. One ' +
      'split arrow is enough to convict, because anyone asking f(1) gets two contradictory ' +
      'answers. The guilty input wears carmine — that is the picture to remember.',
  },
  {
    title: 'Sharing is legal',
    body:
      'The squaring rule: −2 and 2 BOTH land on 4. Two arrows arrive at one output. It feels ' +
      'like last step’s crime — look carefully at why it is not.',
    scene: { kind: 'pairs', rel: 'squares' },
    q: 'Two inputs share the output 4. Is the squaring rule still a function?',
    choices: [
      'Yes — each input still fires exactly ONE arrow; sharing an output breaks nothing',
      'No — outputs must be used once each',
      'Only if we remove one of the two arrows',
    ],
    answer: 0,
    feedback:
      'Still a function — ask f(−2), get 4; ask f(2), get 4; nobody gets two answers. ' +
      'MANY-TO-ONE is legal; ONE-TO-MANY is the crime; they are mirror images, and confusing ' +
      'them is the single most common error in this topic. (Reverse all the arrows of the ' +
      'squaring rule and you get last step’s criminal — try to see it.)',
  },
  {
    title: 'The graph is the diagram, sideways',
    body:
      'Each arrow becomes a DOT: input across, output up — the ordered pair (input, output). ' +
      'The gold PROBE is the police check standing upright: park it on an input and count the ' +
      'dots it spears.',
    scene: { kind: 'dots', rel: 'transpose' },
    probe: true,
    q: 'Park the probe on x = 1 and on x = 4. What does it find?',
    choices: [
      'Two dots at each — this relation is not a function',
      'One dot everywhere — a function',
      'The probe cannot check dots',
    ],
    answer: 0,
    feedback:
      'Two dots at x = 1 (outputs −1 and 1) and two at x = 4 (outputs −2 and 2): guilty twice ' +
      'over. This dot-set is the squaring rule with its arrows REVERSED — reversing a legal ' +
      'many-to-one manufactures an illegal one-to-many. The probe is not a new test: it is ' +
      'the definition, asking its one question at each x.',
  },
  {
    title: 'The vertical line test — and the circle',
    body:
      'Now whole curves. Sweep the probe: a curve is a function of x exactly when the probe ' +
      'NEVER spears two points. Try all four — the circle is the famous casualty.',
    scene: { kind: 'curve', rel: 'line' },
    probe: true,
    chips: ['line', 'parabola', 'circle', 'sideways'],
    q: 'The circle — function of x, or not?',
    choices: [
      'Not a function of x — for most x the probe spears two y’s',
      'A function — it is such a smooth, famous curve',
      'A function everywhere except the very top',
    ],
    answer: 0,
    feedback:
      'Not a function of x. Park the probe anywhere strictly inside the circle’s width and it ' +
      'spears two points — an upper y and a lower y. The Circle bench itself declares this in ' +
      'its own header ("for most x there are two y-values") and draws its curve ' +
      'parametrically for exactly this reason. Famous and smooth buy no pardon; the parabola ' +
      'passes, the sideways parabola fails.',
  },
  {
    title: 'Domain and range',
    body:
      'Two shadows of the arrow diagram: the DOMAIN is the set of inputs that fire arrows; ' +
      'the RANGE is the set of outputs that get hit. Back to the squaring rule to read them ' +
      'off.',
    scene: { kind: 'pairs', rel: 'squares' },
    q: 'The squaring rule’s five arrows use inputs {−2, −1, 0, 1, 2}. Its RANGE is…',
    choices: [
      '{0, 1, 4} — only the outputs actually hit, each listed once',
      '{−2, −1, 0, 1, 2} — same as the inputs',
      '{0, 1, 1, 4, 4} — one entry per arrow',
    ],
    answer: 0,
    feedback:
      'The range is {0, 1, 4}: the set of outputs that actually receive an arrow, and a set ' +
      'lists each member once — 4 is hit twice but counted once. Domain and range are ' +
      'bookkeeping on the SAME arrows; no new machinery, just two honest lists.',
  },
  {
    title: 'The gatekeeper',
    body:
      'A relation is posted at the gate. Rule on it — function or not — then present your ' +
      'EVIDENCE: tap the guilty input, or enter the plea that no guilty input exists.',
    scene: { kind: 'pairs', rel: 'clean' },
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FunctionLab() {
  const [relKey, setRelKey] = useState('clean');
  const [curveKey, setCurveKey] = useState('line');
  const [probeX, setProbeX] = useState(1);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [evidence, setEvidence] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const dragRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;
  const scene = current.scene;

  const pairs = calib && kase ? kase.pairs : scene.kind !== 'curve' ? RELATIONS[relKey].pairs : null;
  const curve = scene.kind === 'curve' ? CURVES[curveKey] : null;

  const checks = calib ? calibChecks(kase, verdict, evidence) : [false, false];
  const pct = calib && kase ? closeness(kase, verdict, evidence) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, verdict, evidence) : false;

  sceneRef.current = {
    kind: calib ? 'dots' : scene.kind,
    pairs,
    curveKey,
    probeX,
    probe: !!current.probe || calib,
    calib,
    evidence,
  };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;

    ctx.clearRect(0, 0, W, H);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = gs; y < H; y += gs) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    const bandH = 54;

    if (S.kind === 'pairs') {
      /* ---- the arrow diagram ---- */
      const p = S.pairs;
      const ins = domainOf(p);
      const outs = rangeOf(p);
      const guilty = guiltyInputsOf(p);
      const leftX = W * 0.3;
      const rightX = W * 0.7;
      const topY = bandH + 40;
      const botY = H - 44;
      const yFor = (list, v) => topY + ((botY - topY) * (list.indexOf(v) + 0.5)) / list.length;

      /* column plates */
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('inputs', leftX, topY - 16);
      ctx.fillText('outputs', rightX, topY - 16);

      /* arrows first (under the nodes) */
      for (const [x, y] of p) {
        const gy = guilty.includes(x);
        ctx.strokeStyle = gy ? CARMINE : BLUE;
        ctx.lineWidth = gy ? 2.6 : 2;
        const y1 = yFor(ins, x);
        const y2 = yFor(outs, y);
        ctx.beginPath();
        ctx.moveTo(leftX + 16, y1);
        ctx.lineTo(rightX - 16, y2);
        ctx.stroke();
        /* arrowhead */
        const ang = Math.atan2(y2 - y1, rightX - 16 - (leftX + 16));
        ctx.fillStyle = gy ? CARMINE : BLUE;
        ctx.beginPath();
        ctx.moveTo(rightX - 16, y2);
        ctx.lineTo(rightX - 16 - 10 * Math.cos(ang - 0.4), y2 - 10 * Math.sin(ang - 0.4));
        ctx.lineTo(rightX - 16 - 10 * Math.cos(ang + 0.4), y2 - 10 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
      }
      /* nodes */
      const node = (x0, v, gy, picked) => {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = gy ? CARMINE : BLUE;
        ctx.lineWidth = gy ? 2.6 : 2;
        ctx.beginPath();
        ctx.arc(x0, v, 14, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        if (picked) {
          ctx.strokeStyle = GOLD;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x0, v, 19, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };
      for (const x of ins) {
        const gy = guilty.includes(x);
        node(leftX, yFor(ins, x), gy, S.calib && S.evidence === x);
        ctx.fillStyle = gy ? CARMINE : INK;
        ctx.font = '700 13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(x), leftX, yFor(ins, x));
      }
      for (const y of outs) {
        node(rightX, yFor(outs, y), false, false);
        ctx.fillStyle = INK;
        ctx.font = '700 13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(y), rightX, yFor(outs, y));
      }
      /* verdict band */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (S.calib) {
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 14px system-ui, sans-serif';
        ctx.fillText('the gatekeeper’s docket — rule on it, then tap your evidence', W / 2, bandH / 2);
      } else if (guilty.length > 0) {
        ctx.fillStyle = CARMINE;
        ctx.font = '600 15.5px system-ui, sans-serif';
        ctx.fillText(
          `not a function — input ${guilty.join(' and ')} fires two arrows`,
          W / 2,
          bandH / 2
        );
      } else {
        ctx.fillStyle = BLUE;
        ctx.font = '600 15.5px system-ui, sans-serif';
        ctx.fillText('a function — every input fires exactly one arrow', W / 2, bandH / 2);
      }
    } else {
      /* ---- the graph view: dots or curve, with the probe ---- */
      const cx = W / 2;
      const cy = bandH + (H - bandH) / 2;
      const k = Math.min((W - 80) / 12, (H - bandH - 60) / 12);
      const px = (X, Y) => [cx + X * k, cy - Y * k];

      /* axes */
      ctx.strokeStyle = 'rgba(91,107,123,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 6 * k, cy);
      ctx.lineTo(cx + 6 * k, cy);
      ctx.moveTo(cx, cy - 5.4 * k);
      ctx.lineTo(cx, cy + 5.4 * k);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = -5; x <= 5; x++) {
        if (x === 0) continue;
        ctx.fillText(String(x), cx + x * k, cy + 5);
      }

      let count = null;
      if (S.kind === 'dots') {
        const guilty = guiltyInputsOf(S.pairs);
        for (const [x, y] of S.pairs) {
          const gy = guilty.includes(x);
          const [dx, dy] = px(x, y);
          ctx.fillStyle = gy ? CARMINE : BLUE;
          ctx.beginPath();
          ctx.arc(dx, dy, 6.4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (S.calib && S.evidence === x) {
            ctx.strokeStyle = GOLD;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(dx, dy, 11, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        count = ysAt(S.pairs, S.probeX).length;
      } else {
        /* the named curve, drawn per-pixel from its shape */
        const c = CURVES[S.curveKey];
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.6;
        if (S.curveKey === 'line') {
          ctx.beginPath();
          const [x1, y1] = px(-5.5, -5.5 - 1);
          const [x2, y2] = px(5.5, 5.5 - 1);
          ctx.moveTo(x1, Math.min(Math.max(y1, bandH), H));
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (S.curveKey === 'parabola') {
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) {
            const X = -5.5 + (11 * i) / 120;
            const Y = (X * X) / 3 - 3;
            const [dx, dy] = px(X, Y);
            if (i === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
          }
          ctx.stroke();
        } else if (S.curveKey === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, 4 * k, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          /* sideways parabola: x = y²/4 − 4 */
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) {
            const Y = -5.2 + (10.4 * i) / 120;
            const X = (Y * Y) / 4 - 4;
            const [dx, dy] = px(X, Y);
            if (i === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
          }
          ctx.stroke();
        }
        count = c.ysCountAt(S.probeX);
      }

      /* the probe */
      if (S.probe) {
        const [pxx] = px(S.probeX, 0);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(pxx, bandH + 8);
        ctx.lineTo(pxx, H - 10);
        ctx.stroke();
        ctx.setLineDash([]);
        /* spear marks where the probe crosses the relation */
        if (S.kind === 'dots') {
          for (const y of ysAt(S.pairs, S.probeX)) {
            const [dx, dy] = px(S.probeX, y);
            ctx.strokeStyle = GOLD;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(dx, dy, 10, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }

      /* verdict band */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (S.probe && count != null) {
        const bad = count > 1;
        ctx.fillStyle = bad ? CARMINE : count === 1 ? BLUE : INK_SOFT;
        ctx.font = '600 15.5px system-ui, sans-serif';
        ctx.fillText(
          count === 0
            ? `the probe at x = ${S.probeX} finds nothing — no arrow uses this input`
            : count === 1
              ? `the probe at x = ${S.probeX} finds exactly one output — the promise holds here`
              : `the probe at x = ${S.probeX} finds ${count} outputs — guilty`,
          W / 2,
          bandH / 2
        );
      }
    }
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    const s = STEPS[step].scene;
    if (s.rel && s.kind !== 'curve') setRelKey(s.rel);
    if (s.kind === 'curve') setCurveKey(s.rel);
    setProbeX(1);
    if (STEPS[step].calib) {
      setKase(makeCase(null));
      setVerdict(null);
      setEvidence(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: drag the probe; tap an input as evidence ------------ */
  const probeFromEvent = (e) => {
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const bandH = 54;
    const k = Math.min((rect.width - 80) / 12, (rect.height - bandH - 60) / 12);
    const cx = rect.width / 2;
    return Math.max(PROBE.min, Math.min(PROBE.max, Math.round((e.clientX - rect.left - cx) / k)));
  };
  const onPointerDown = (e) => {
    const S = sceneRef.current;
    if (S.calib && S.pairs) {
      /* evidence tap: nearest input node (dots view) */
      const stage = stageRef.current;
      const rect = stage.getBoundingClientRect();
      const bandH = 54;
      const k = Math.min((rect.width - 80) / 12, (rect.height - bandH - 60) / 12);
      const cx = rect.width / 2;
      const cy = bandH + (rect.height - bandH) / 2;
      for (const [x, y] of S.pairs) {
        const dx = cx + x * k - (e.clientX - rect.left);
        const dy = cy - y * k - (e.clientY - rect.top);
        if (dx * dx + dy * dy < 16 * 16) {
          setEvidence(x);
          return;
        }
      }
    }
    if (!S.probe) return;
    dragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setProbeX(probeFromEvent(e));
  };
  const onPointerMove = (e) => {
    if (dragRef.current) setProbeX(probeFromEvent(e));
  };
  const onPointerUp = () => {
    dragRef.current = false;
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setProbeX(1);
    setVerdict(null);
    setEvidence(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const liveGuilty = pairs ? guiltyInputsOf(pairs) : [];
  const spoken = calib
    ? `The gatekeeper: a posted relation of ${kase ? kase.pairs.length : 0} pairs. Verdict ${verdict ?? 'pending'}, evidence ${
        evidence == null ? 'none yet' : evidence === 'none' ? 'no guilty input' : `input ${evidence}`
      }. ${calibrated ? 'Calibrated.' : ''}`
    : scene.kind === 'curve'
      ? `${CURVES[curveKey].label}: the probe at x = ${probeX} finds ${CURVES[curveKey].ysCountAt(probeX)} output(s). ${
          CURVES[curveKey].fn ? 'A function of x.' : 'Not a function of x.'
        }`
      : `${RELATIONS[relKey].label}: ${
          liveGuilty.length > 0 ? `not a function — input ${liveGuilty.join(', ')} fires two arrows` : 'a function'
        }. Domain ${domainOf(pairs).join(', ')}; range ${rangeOf(pairs).join(', ')}.`;

  return (
    <div className="fnlab">
      <header className="head">
        <h1>The Function: One Input, One Output</h1>
        <p className="lede">
          A function is a <em>promise</em>: each input gets <em>exactly one</em> output. Sharing
          an output is legal; a split arrow is the crime. The vertical-line test is the same
          promise, checked <span className="mono">x</span> by <span className="mono">x</span> —
          and the circle famously fails it.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {(current.probe || calib) && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the probe’s input x</span>
                  <span className="dial-v mono">{probeX}</span>
                </div>
                <input
                  type="range"
                  min={PROBE.min}
                  max={PROBE.max}
                  step={PROBE.step}
                  value={probeX}
                  onChange={(e) => setProbeX(Number(e.target.value))}
                  aria-label={`Probe input x, ${probeX}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Relations">
            {current.chips &&
              current.chips.map((ck) => (
                <button
                  type="button"
                  key={ck}
                  className={'chipbtn' + (curveKey === ck ? ' active' : '')}
                  onClick={() => setCurveKey(ck)}
                >
                  {CURVES[ck].label}
                </button>
              ))}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
            {(current.probe || calib) && <span className="hint">drag the gold probe, or work its dial</span>}
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Posted at the gate</span>
                <span className="target-word mono">
                  {kase.pairs.map(([a, b]) => `(${a},${b})`).join(' ')}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the verdict</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the evidence</li>
                </ol>
                <div className="declare" role="group" aria-label="Verdict">
                  <button
                    type="button"
                    className={'declbtn' + (verdict === 'function' ? ' active' : '')}
                    onClick={() => setVerdict('function')}
                  >
                    function
                  </button>
                  <button
                    type="button"
                    className={'declbtn' + (verdict === 'not' ? ' active' : '')}
                    onClick={() => setVerdict('not')}
                  >
                    not a function
                  </button>
                  <button
                    type="button"
                    className={'declbtn' + (evidence === 'none' ? ' active' : '')}
                    onClick={() => setEvidence('none')}
                  >
                    no guilty input
                  </button>
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'ruled, with evidence — the gate opens'
                    : verdict == null
                      ? 'rule first: function, or not?'
                      : verdict === 'not'
                        ? 'tap the guilty input on the graph'
                        : 'enter the plea: no guilty input'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">verdict · then evidence</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase.id));
                  setVerdict(null);
                  setEvidence(null);
                }}
              >
                Next case
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
                  setKase(null);
                  setVerdict(null);
                  setEvidence(null);
                  setRelKey('clean');
                  setProbeX(1);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">one input · one output · every time</span> &nbsp;·&nbsp; a
        function assigns each input exactly one output; the graph is its set of ordered pairs;
        the vertical line test is the definition standing upright (CCSS 8.F.A.1, F-IF.A.1–2).
        Sharing outputs is legal; splitting inputs is the crime.
      </footer>

      <style jsx>{`
        .fnlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
          --gold: #b98718;
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
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 400px;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .dial-v {
          font-size: 13px;
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .hint {
          font-size: 12px;
          font-style: italic;
          color: var(--ink-soft);
        }
        .chipbtn {
          font: 600 12.5px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
          color: var(--blue);
        }
        .chipbtn:hover {
          border-color: var(--ink);
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
          background: var(--carmine);
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
          padding-top: 6px;
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
          border-left: 3px solid var(--carmine);
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
        .target-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .target-word {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.5;
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font: 700 12.5px/1 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
          white-space: nowrap;
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
        :global(.fnlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
