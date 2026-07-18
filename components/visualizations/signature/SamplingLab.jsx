'use client';

/* ============================================================================
   SamplingLab — an interactive "bench" for SAMPLING AND INFERENCE: the
   population you cannot census, the sample that varies, and the difference
   between noise (which shrinks) and bias (which never does).

        the pond: 200 fish, spotted fraction HIDDEN
        a dip of the net = a sample · its count is an exact "k of n"
        dips vary — that is the price of sampling, not a defect
        bigger fair dips wobble less · dock dips are steadily WRONG
        pooling a logbook beats any single dip

   Built for MAIS (math AI system, www.mais.ac), K-12.  CCSS 7.SP.A.1–2
   (and the on-ramp to S-IC.A.1).  ProbabilityLab owns the spinner and its
   convergence chart; nine statistics labs describe data you HAVE.  This
   bench owns the population/sample distinction — reasoning about data you
   can never fully have.

   THE SIGNATURE CENTERPIECE — "THE HIDDEN POND AND THE DIPPER."
     A pond of 200 fish drawn as a veiled grid — the warden knows 60 are
     spotted; the student doesn't.  The dipper nets n fish at a time
     (n = 10, 20, 40 by dial) and every dip files an exact "k of n" line
     in the logbook, plotted as a dot on the estimate strip.  Dips
     disagree; that is variation, not error.  Widen the net and the dots
     huddle.  Then the dock mode: dipping only where fish gather by the
     dock reads high EVERY time — a consistent lie that no amount of
     dipping repairs.  The reveal posts the pond's truth; pooling the
     logbook lands beside it.  The capstone posts a stranger's five-dip
     logbook: rule the pooled estimate exactly, then name the hidden pond
     it most plausibly came from — both exact, or no stamp.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • ProbabilityLab owns the spinner and the long-run frequency chart;
       nothing spins here and no convergence curve is plotted — the
       logbook is a finite list of exact fractions.
     • HistogramLab owns bars over bins; the estimate strip is unbinned
       dots.  DataLab owns the dot plot of a dataset; these dots are
       ESTIMATES, one per dip, not data values.
     • MeanLab owns the balance-point mean; the words "mean" and
       "average" never appear — the logbook is POOLED: total spotted
       over total netted.
     • VarianceLab owns MAD; BoxPlotLab owns quartiles; spread here is
       seen, never measured.  PercentageLab owns percent-of; every
       fraction on this bench stays a fraction.

   One-accent discipline: CARMINE is THE POND'S TRUTH — and the verdicts.
   GOLD is the net, the dips, the logbook dots (the tool).  BLUE is the
   quiet fish.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The pond is a fixed, exactly composed population: 200 fish, 60
       spotted; the dock holds 50 fish of which 30 are spotted.  The
       audit rebuilds it and counts.
     • The dipper takes an injectable random source; the audit drives it
       deterministically and proves every dip nets exactly n DISTINCT
       fish from the right region, and that k is the true spotted count
       of the netted fish.  Displayed numbers are integer counts only.
     • The posted logbooks are fixed; the pooled estimate is an exact
       reduced fraction of integer totals, and the named pond is the
       PROVABLY closest candidate (unique minimizer, checked by exact
       cross-multiplication).
     • The warden's stamp needs two exact rulings (the pooled estimate,
       then the pond), audited over every case × chip pair; the truth
       chip is always present and never duplicated.
   Verified by audit-sampling.mjs (numeric proof + source greps) and
   verify-sampling.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/SamplingLab.jsx
     2. Import and render it:
          import SamplingLab from './SamplingLab';
          export default function Page() { return <SamplingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the net size,
              the mode, the logbook, the lesson step, the rulings).
     MODEL  — a fixed integer population and an injectable-rng dipper.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the pond's truth, the verdicts
const BLUE = '#3f74a6'; // the quiet fish
const GOLD = '#b98718'; // the net, the dips, the logbook
const INK_HEX = '#1c2b3a';

const NET_SIZES = [10, 20, 40];
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  A fixed population; an injectable-rng dipper.
   ------------------------------------------------------------------------- */
const POND_TOTAL = 200;
const POND_SPOTTED = 60;
const DOCK_TOTAL = 50;
const DOCK_SPOTTED = 30;
/* fish i: dock if i < 50; spotted by exact quota within each region */
const buildPond = () => {
  const fish = [];
  for (let i = 0; i < POND_TOTAL; i++) {
    const dock = i < DOCK_TOTAL;
    const spotted = dock
      ? i % 5 < 3 /* 30 of the 50 dock fish */
      : (i - DOCK_TOTAL) % 5 === 0; /* 30 of the 150 open-water fish */
    fish.push({ dock, spotted });
  }
  return fish;
};
const POND = buildPond();
/* one dip: n distinct fish from the chosen region, by partial shuffle */
const drawDip = (n, mode, rng = Math.random) => {
  const pool = POND.map((f, i) => i).filter((i) => (mode === 'dock' ? POND[i].dock : true));
  for (let j = 0; j < n; j++) {
    const r = j + Math.floor(rng() * (pool.length - j));
    [pool[j], pool[r]] = [pool[r], pool[j]];
  }
  const picked = pool.slice(0, n);
  const k = picked.filter((i) => POND[i].spotted).length;
  return { k, n, mode, picked };
};
const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
const fracText = (num, den) => {
  const g = gcdInt(num, den) || 1;
  return `${num / g}/${den / g}`;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The warden's stamp."  A stranger's logbook is
   posted; rule the pooled estimate, then name the hidden pond.
   ------------------------------------------------------------------------- */
const PONDS = [20, 60, 100, 150]; /* spotted fish, each out of 200 */
const POND_CHIPS = PONDS.map((s) => `${s} of 200`);
const CASES = [
  { draws: [12, 14, 11, 13, 15], n: 40 },
  { draws: [21, 19, 22, 18, 20], n: 40 },
  { draws: [4, 6, 5, 3, 7], n: 40 },
  { draws: [29, 31, 30, 32, 28], n: 40 },
  { draws: [13, 11, 12, 14, 10], n: 40 },
];
function makeCase(prev) {
  let i;
  do {
    i = Math.floor(Math.random() * CASES.length);
  } while (prev != null && i === prev);
  return i;
}
const pooledOf = (i) => {
  const { draws, n } = CASES[i];
  return { num: draws.reduce((a, b) => a + b, 0), den: draws.length * n };
};
const pooledTruth = (i) => {
  const p = pooledOf(i);
  return fracText(p.num, p.den);
};
const pooledChips = (i) => {
  const { draws, n } = CASES[i];
  const cands = [
    pooledTruth(i),
    fracText(draws[0], n),
    fracText(Math.max(...draws), n),
    fracText(Math.min(...draws), n),
  ];
  const seen = new Set();
  const out = [];
  for (const c of cands) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
    if (out.length === 4) break;
  }
  const val = (t) => {
    const [a, b] = t.split('/').map(Number);
    return [a, b];
  };
  return out.sort((x, y) => {
    const [a, b] = val(x);
    const [c, d] = val(y);
    return a * d - c * b;
  });
};
/* the pond: the unique candidate closest to the pooled total (out of 200) */
const pondTruthIdx = (i) => {
  const p = pooledOf(i); /* den is 200 for every posted case */
  let best = 0;
  for (let j = 1; j < PONDS.length; j++) {
    if (Math.abs(PONDS[j] - p.num) < Math.abs(PONDS[best] - p.num)) best = j;
  }
  return best;
};
const pondTruth = (i) => POND_CHIPS[pondTruthIdx(i)];
const calibChecks = (i, poolPick, pondPick) => {
  if (i == null) return [false, false];
  const poolOK = poolPick != null && poolPick === pooledTruth(i);
  const pondOK = poolOK && pondPick != null && pondPick === pondTruth(i);
  return [poolOK, pondOK];
};
const closeness = (i, p, q) =>
  Math.round((100 * calibChecks(i, p, q).filter(Boolean).length) / 2);
const isCalibrated = (i, p, q) => calibChecks(i, p, q).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that disagreement means error,
   that consistency means truth, that one dip is as good as five.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The pond you cannot drain',
    body:
      'A pond holds 200 fish; some are spotted. The warden wants the spotted fraction ' +
      'without draining the pond. The only tool is a net that lifts a few fish at a time.',
    q: 'Why settle for a sample at all?',
    choices: [
      'The whole pond is out of reach — a fair sample is the only affordable look at it',
      'Samples are more accurate than counting everyone',
      'No reason; the warden should drain the pond',
    ],
    answer: 0,
    feedback:
      'Censuses are expensive, slow, or impossible — most of what we know about ponds, ' +
      'people, and planets comes from samples. The entire craft is in the word FAIR: a ' +
      'sample earns its inference only if every fish had an equal chance of meeting ' +
      'the net.',
  },
  {
    title: 'One dip is a guess',
    body:
      'Dip the net — twenty fish come up, and the logbook files the count. Dip again. ' +
      'And again. Read the strip of estimates.',
    dip: true,
    q: 'Two dips disagree. Is the net broken?',
    choices: [
      'No — estimates VARY from dip to dip; variation is the normal price of sampling, not a mistake',
      'Yes — a working method gives one answer',
      'The second dip must have scared the fish',
    ],
    answer: 0,
    feedback:
      'Different fish come up, so different counts come up — sampling variation is built ' +
      'in, and no honest method hides it. The real questions are the next two: how much ' +
      'do fair dips wobble, and does the wobble ever LIE on purpose?',
  },
  {
    title: 'More net, less wobble',
    body:
      'The net now comes in three sizes: 10, 20, 40. File several dips at each size and ' +
      'compare the strips.',
    dip: true,
    sizeDial: true,
    q: 'Which net size wobbles least?',
    choices: [
      'The 40-net — bigger fair samples huddle tighter around the pond’s truth, predictably',
      'The 10-net — fewer fish, fewer ways to err',
      'All the same — chance is chance',
    ],
    answer: 0,
    feedback:
      'Bigger dips wobble less, and the shrinking is lawful — quadruple the net and the ' +
      'wobble roughly halves. That predictability is what makes inference possible: the ' +
      'warden can buy exactly as much certainty as the survey budget allows.',
  },
  {
    title: 'The dock mistake',
    body:
      'A lazier plan: dip only beside the dock, where fish crowd to be fed. Switch modes ' +
      'and file a few dock dips. They agree with each other beautifully.',
    dip: true,
    sizeDial: true,
    modeChips: true,
    q: 'Dock dips are consistent. Are they good?',
    choices: [
      'No — consistently WRONG: spotted fish crowd the dock, and no number of dock dips repairs the slant',
      'Yes — consistency is what accuracy means',
      'Yes, if the net is big enough',
    ],
    answer: 0,
    feedback:
      'The dock reads high every time — 3 in 5 of its fish are spotted, against the ' +
      'pond’s hidden truth. Noise shrinks with bigger nets; BIAS does not. A thousand ' +
      'dips from the dock are a thousand copies of the same lie, which is why fair ' +
      'randomness, not effort, is what buys truth.',
  },
  {
    title: 'The reveal, and the pool',
    body:
      'The warden opens the books: 60 of 200 fish are spotted. Now look back at a ' +
      'logbook of five fair 40-dips — say 12, 14, 11, 13, 15 spotted.',
    reveal: true,
    q: 'What is the best use of the five dips?',
    choices: [
      'Pool them — 65 spotted of 200 netted, an exact 13/40, the steadiest estimate the logbook can give',
      'Keep only the biggest dip; more spotted fish means more information',
      'Report all five and let the reader pick',
    ],
    answer: 0,
    feedback:
      'Pooling treats the five dips as one big fair dip: 65 of 200, which reduces to ' +
      '13/40 — a hair from the true 60 of 200. Single dips wobble; the pool steadies. ' +
      'That is inference in one move: combine fairly gathered evidence, then state the ' +
      'estimate with its source.',
  },
  {
    title: 'The warden’s stamp',
    body:
      'A stranger’s logbook is posted: five dips of 40 from one hidden pond. Rule the ' +
      'pooled estimate exactly, then name the pond it most plausibly came from.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function SamplingLab() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [mode, setMode] = useState('fair');
  const [logbook, setLogbook] = useState([]);
  const [lastDip, setLastDip] = useState(null);
  const [poolPick, setPoolPick] = useState(null);
  const [pondPick, setPondPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(kase, poolPick, pondPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, poolPick, pondPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, poolPick, pondPick) : false;

  sceneRef.current = {
    logbook,
    lastDip,
    reveal: !!current.reveal,
    calib,
    kase,
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

    const bandH = 52;
    const logW = Math.min(230, W * 0.33);
    const pondX0 = 20;
    const pondX1 = W - logW - 18;
    const pondY0 = bandH + 16;
    const pondY1 = H - 96;

    /* the pond: a 20×10 grid of fish */
    const cols = 20;
    const rows = 10;
    const fx = (i) => pondX0 + ((i % cols) + 0.5) * ((pondX1 - pondX0) / cols);
    const fy = (i) => pondY0 + (Math.floor(i / cols) + 0.5) * ((pondY1 - pondY0) / rows);
    const inNet = new Set(S.lastDip ? S.lastDip.picked : []);
    for (let i = 0; i < POND_TOTAL; i++) {
      const f = POND[i];
      const netted = inNet.has(i);
      if (S.reveal || S.calib || netted) {
        ctx.fillStyle = f.spotted ? CARMINE : BLUE;
      } else {
        ctx.fillStyle = 'rgba(91,107,123,0.28)'; /* veiled */
      }
      ctx.beginPath();
      ctx.arc(fx(i), fy(i), netted ? 5 : 3.2, 0, 2 * Math.PI);
      ctx.fill();
      if (netted) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    /* the dock */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    const dockX1 = pondX0 + ((pondX1 - pondX0) / cols) * 10;
    const dockY1 = pondY0 + ((pondY1 - pondY0) / rows) * 5;
    ctx.strokeRect(pondX0 + 2, pondY0 + 2, dockX1 - pondX0 - 4, dockY1 - pondY0 - 4);
    ctx.setLineDash([]);
    ctx.fillStyle = GOLD;
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('the dock', pondX0 + 6, pondY0 + 16);

    /* the estimate strip */
    const stripY = H - 56;
    ctx.strokeStyle = 'rgba(91,107,123,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pondX0, stripY);
    ctx.lineTo(pondX1, stripY);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0', pondX0, stripY + 6);
    ctx.fillText('all spotted', pondX1 - 20, stripY + 6);
    ctx.fillText('the estimate strip', (pondX0 + pondX1) / 2, stripY + 18);
    const sx = (num, den) => pondX0 + (num / den) * (pondX1 - pondX0);
    for (const d of S.logbook) {
      ctx.fillStyle = d.mode === 'dock' ? 'rgba(28,43,58,0.7)' : 'rgba(185,135,24,0.85)';
      ctx.beginPath();
      ctx.arc(sx(d.k, d.n), stripY - 8 - (d.n === 40 ? 8 : d.n === 10 ? 0 : 4), 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (S.reveal) {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx(POND_SPOTTED, POND_TOTAL), stripY - 26);
      ctx.lineTo(sx(POND_SPOTTED, POND_TOTAL), stripY + 4);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.fillText('the truth: 60 of 200', sx(POND_SPOTTED, POND_TOTAL), stripY - 40);
    }

    /* the logbook */
    const tx = W - logW + 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.fillText('the logbook', tx, bandH + 8);
    ctx.font = '600 11px ui-monospace, monospace';
    let rowY = bandH + 28;
    const shown = S.calib && S.kase != null
      ? CASES[S.kase].draws.map((k) => ({ k, n: CASES[S.kase].n, mode: 'fair' }))
      : S.logbook.slice(-9);
    for (let d = 0; d < shown.length; d++) {
      const dip = shown[d];
      ctx.fillStyle = dip.mode === 'dock' ? INK_HEX : GOLD;
      ctx.fillText(
        `dip ${d + 1} · ${dip.k} of ${dip.n}${dip.mode === 'dock' ? ' · dock' : ''}`,
        tx,
        rowY
      );
      rowY += 17;
    }
    if (S.calib && S.kase != null) {
      ctx.fillStyle = CARMINE;
      ctx.fillText('pooled: ? · pond: ?', tx, rowY + 6);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib
        ? 'a stranger’s logbook · five dips of 40 · pond hidden'
        : S.reveal
          ? 'the books are open: 60 of 200 spotted'
          : `the pond keeps its secret · ${S.logbook.length} dip${S.logbook.length === 1 ? '' : 's'} filed`,
      W / 2,
      bandH / 2
    );
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
    const st = STEPS[step];
    setSizeIdx(1);
    setMode('fair');
    setLogbook([]);
    setLastDip(null);
    setPoolPick(null);
    setPondPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const dip = () => {
    const d = drawDip(NET_SIZES[sizeIdx], mode);
    setLastDip(d);
    setLogbook((prev) => [...prev, d]);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setLogbook([]);
    setLastDip(null);
    setPoolPick(null);
    setPondPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: a logbook of ${kase != null ? CASES[kase].draws.map((k) => `${k}`).join(', ') : ''} spotted, each of 40. Pooled ${poolPick ?? 'unruled'}; pond ${pondPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : `${logbook.length} dips filed${lastDip ? `; the last netted ${lastDip.k} spotted of ${lastDip.n}${lastDip.mode === 'dock' ? ', at the dock' : ''}` : ''}${current.reveal ? '; the truth is 60 of 200' : ''}.`;

  return (
    <div className="smlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Sampling: The Hidden Pond and the Dipper</h1>
        <p className="lede">
          The pond’s truth is out of reach; a dip of the net is a <em>sample</em>. Dips
          vary — that is the price, not a defect. Bigger fair dips huddle; dock dips lie
          consistently; and a pooled logbook beats any single dip.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          {current.sizeDial && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the net</span>
                  <span className="dial-v mono">{NET_SIZES[sizeIdx]} fish</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={NET_SIZES.length - 1}
                  step={1}
                  value={sizeIdx}
                  onChange={(e) => setSizeIdx(Number(e.target.value))}
                  aria-label={`Net size, ${NET_SIZES[sizeIdx]} fish`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="The dipper">
            {current.dip && (
              <button type="button" className="btn" onClick={dip}>
                Dip the net
              </button>
            )}
            {current.modeChips &&
              ['fair', 'dock'].map((m) => (
                <button
                  type="button"
                  key={m}
                  className={'chipbtn' + (mode === m ? ' active' : '')}
                  onClick={() => setMode(m)}
                >
                  {m === 'fair' ? 'fair dips' : 'dock dips'}
                </button>
              ))}
            <button type="button" className="btn ghost" onClick={reset}>
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

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted logbook</span>
                <span className="target-word mono">
                  {CASES[kase].draws.join(', ')} of {CASES[kase].n}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the pooled estimate, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the hidden pond, named</li>
                </ol>
                <div className="declare" role="group" aria-label="Pooled ruling">
                  {pooledChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (poolPick === c2 ? ' active' : '')}
                      onClick={() => setPoolPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Pond ruling">
                  {POND_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (pondPick === c2 ? ' active' : '')}
                      onClick={() => setPondPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the survey is filed'
                    : checks[0]
                      ? 'pooled — now name the pond'
                      : 'total spotted over total netted'}
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
                  <span className="mono target-hint">the pool · then the pond</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setPoolPick(null);
                  setPondPick(null);
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
                  setPoolPick(null);
                  setPondPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">dips vary · nets steady · docks lie · pools tell</span>{' '}
        &nbsp;·&nbsp; a fair sample is the only affordable look at a population, and its
        wobble — unlike the dock’s slant — shrinks on schedule.
      </footer>

      <style jsx>{`
        .smlab {
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
          display: grid;
          gap: 8px;
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
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
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
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
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
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
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
        :global(.smlab) :focus-visible {
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
