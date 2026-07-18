'use client';

/* ============================================================================
   ExtraneousLab — an interactive "bench" for EXTRANEOUS SOLUTIONS:
   the one-way gate.  If a = b then a² = b² — always, no exceptions — but the
   trip BACK is not free: a² = b² also allows a = −b.  Squaring an equation
   is a gate that lets every solution through forward and quietly admits the
   mirror equation's solutions on the way back.  The checkpoint (substitute
   into the ORIGINAL) is not paranoia; it is the mathematics.  (GRADES 9–12 ·
   CCSS HSA-REI.A.2 — solve radical equations, giving examples showing how
   extraneous solutions may arise.)

   THE SIGNATURE CENTERPIECE — "THE ONE-WAY GATE AND THE CHECKPOINT."
   √(x + 7) = x − 5 is squared into x² − 11x + 18 = 0, and two candidates
   walk out: 2 and 9.  At the checkpoint each is substituted into the
   original: 9 presents √16 = 4 against 4 — cleared, carmine.  2 presents
   √9 = 3 against −3 — an INTRUDER, stamped with where it actually lives:
   the mirror equation √(x + 7) = −(x − 5), whose square is the same.

   THE MODEL — exact integer arithmetic throughout:
     · every equation has the form √(x + p) = x + c, engineered so both
       candidates give perfect-square radicands: nothing a student checks
       ever needs a decimal.
     · sqrtInt(n) certifies square roots by bounded search and THROWS on a
       non-square — the extraction craft itself is the roots bench's story.
     · rootsOf({p, c}) finds the squared equation's two integer candidates
       by exhaustive search and asserts Vieta's checks (sum and product).
     · statusOf classifies each candidate: GENUINE (lhs = rhs) or INTRUDER
       (lhs = −rhs, the mirror) — and the audit proves every candidate is
       exactly one of the two, for every case: squaring never loses, and
       what it adds always belongs to the mirror.

   WHAT THIS LAB REFUSES TO DO (distinctness):
     · No graphs, no line-meets-anything pictures — the function benches own
       intersections; this bench certifies solutions by substitution alone.
     · No solving machinery for the quadratic — no formula, nothing is
       completed; the quadratic bench hands over the candidates, with credit.
     · No extraction machinery — √16 = 4 is certified by the roots bench's
       arithmetic (integer search), cited, never re-derived.
     · No two-pan imagery for "do it to both sides" — the equation bench
       owns that picture; here the move is named as an implication.
   COLORS: one accent. CARMINE = the genuine solution (the object). GOLD =
   the checkpoint and the mirror card (the tool). BLUE = quiet candidates.
   GREEN only on correct answers and the CALIBRATED stamp.

   THE CALIBRATION — an equation is posted with its two candidates. Rule the
   genuine solution first (it must clear the checkpoint), then rule the
   intruder. Truths are derived from statusOf at answer time; the meter is
   quantized to {0, 50, 100}; the intruder earns nothing until the genuine
   stands.  The stamp provably cannot fire falsely.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
   MODEL — exact integer arithmetic; nothing a student sees is floated.
   ========================================================================== */
const CARMINE = '#c81e4f';
const BLUE = '#3f74a6';
const GOLD = '#b98718';
const INK_HEX = '#243342';
const SLATE = '#5b6b7b';
const CALIB_STEP = 5;
const MINUS = '−'; /* U+2212 */

const fmtInt = (n) => (n < 0 ? MINUS + String(-n) : String(n));

/* the integer square root, certified by bounded search — throws on non-squares */
const sqrtInt = (n) => {
  if (n < 0) throw new Error('no real root — the bench never posts these');
  for (let r = 0; r <= n; r++) {
    if (r * r === n) return r;
    if (r * r > n) break;
  }
  throw new Error('not a perfect square — this bench only posts exact checks');
};

/* an equation √(x + p) = x + c */
const rhsText = (c) => (c === 0 ? 'x' : `x ${c < 0 ? MINUS : '+'} ${Math.abs(c)}`);
const eqText = ({ p, c }) => `√(x ${p < 0 ? MINUS : '+'} ${Math.abs(p)}) = ${rhsText(c)}`;
const mirrorText = ({ p, c }) => `√(x ${p < 0 ? MINUS : '+'} ${Math.abs(p)}) = ${MINUS}(${rhsText(c)})`;
/* the squared form: x² + (2c−1)x + (c²−p) = 0 */
const squaredCoefs = ({ p, c }) => [1, 2 * c - 1, c * c - p];
const squaredText = (eq) => {
  const [, b, k] = squaredCoefs(eq);
  const bTxt = b === 0 ? '' : ` ${b < 0 ? MINUS : '+'} ${Math.abs(b) === 1 ? 'x' : Math.abs(b) + 'x'}`;
  const kTxt = k === 0 ? '' : ` ${k < 0 ? MINUS : '+'} ${Math.abs(k)}`;
  return `x²${bTxt}${kTxt} = 0`;
};

/* the two integer candidates, by exhaustive search + Vieta assertions */
const rootsOf = (eq) => {
  const [, b, k] = squaredCoefs(eq);
  const roots = [];
  for (let x = -30; x <= 30; x++) if (x * x + b * x + k === 0) roots.push(x);
  if (roots.length !== 2) throw new Error('every posted equation has two candidates');
  if (roots[0] + roots[1] !== -b || roots[0] * roots[1] !== k) throw new Error('Vieta check failed');
  return roots;
};

/* the checkpoint: GENUINE (lhs = rhs) or INTRUDER (lhs = −rhs, the mirror) */
const statusOf = (eq, r) => {
  const lhs = sqrtInt(r + eq.p);
  const rhs = r + eq.c;
  if (lhs === rhs) return 'genuine';
  if (lhs === -rhs) return 'intruder';
  throw new Error('a candidate must satisfy the square one way or the other');
};
const genuineOf = (eq) => rootsOf(eq).filter((r) => statusOf(eq, r) === 'genuine');
const intruderOf = (eq) => rootsOf(eq).filter((r) => statusOf(eq, r) === 'intruder');

/* the lesson's fixed equation and the dial's honest stops (perfect squares) */
const MAIN = { p: 7, c: -5 };
const DIAL_STOPS = [-6, -3, 2, 9, 18]; /* x + 7 = 1, 4, 9, 16, 25 */

/* ---------------------------------------------------------------------------
   CALIBRATION — posted equations; truths derived at the checkpoint.
   ------------------------------------------------------------------------- */
const CASES = [
  { p: 7, c: -5 },
  { p: 3, c: -3 },
  { p: 2, c: 0 },
  { p: 5, c: 3 },
  { p: 6, c: 4 },
  { p: 11, c: -1 },
];
const GEN_CHIPS = [MINUS + '2', MINUS + '1', '2', '5', '6', '9'];
const INTR_CHIPS = [MINUS + '5', MINUS + '4', MINUS + '2', MINUS + '1', '1', '2'];

const labelOf = (i) => eqText(CASES[i]);
const genTruth = (i) => fmtInt(genuineOf(CASES[i])[0]);
const intrTruth = (i) => fmtInt(intruderOf(CASES[i])[0]);

const makeCase = (prev) => {
  let k = Math.floor(Math.random() * CASES.length);
  while (CASES.length > 1 && k === prev) k = Math.floor(Math.random() * CASES.length);
  return k;
};

const calibChecks = (i, gPick, iPick) => {
  if (i == null) return [false, false];
  const c1 = gPick === genTruth(i);
  const c2 = c1 && iPick === intrTruth(i);
  return [c1, c2];
};
const closeness = (i, gPick, iPick) => {
  const [c1, c2] = calibChecks(i, gPick, iPick);
  return (c1 ? 50 : 0) + (c2 ? 50 : 0);
};
const isCalibrated = (i, gPick, iPick) => calibChecks(i, gPick, iPick).every(Boolean);

/* ---------------------------------------------------------------------------
   THE LESSON — six steps; every scene is pinned to the words describing it.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The gate opens forward',
    body:
      '√(x + 7) = x − 5. To free the x under the radical, square both sides: ' +
      'x + 7 = (x − 5)², which settles into x² − 11x + 18 = 0. The quadratic ' +
      'bench hands back two candidates: 2 and 9.',
    mode: 'derive',
    q: 'Squaring both sides — is that step reversible?',
    choices: [
      'No — a = b forces a² = b², but a² = b² also allows a = −b; the gate is one-way',
      'Yes — every algebra step can be undone',
      'No, and therefore the answers 2 and 9 are both wrong',
    ],
    answer: 0,
    feedback:
      'Forward is safe: equal numbers have equal squares, always. Backward is ' +
      'the problem: 3² = (−3)², so knowing the squares agree cannot tell you the ' +
      'signs agreed. Every solution of the original walks through the gate — ' +
      'accompanied, possibly, by strangers whose squares happen to match.',
    note:
      'Mark the exact spot the information died: the instant both sides were ' +
      'squared, the sign of x − 5 stopped mattering. Non-reversible steps are ' +
      'legal — you just owe a checkpoint at the end for what they let in.',
  },
  {
    title: 'The checkpoint',
    body:
      'Two candidates, one original equation. Substitute each: x = 9 presents ' +
      '√16 = 4 against 9 − 5 = 4. x = 2 presents √9 = 3 against 2 − 5 = −3.',
    mode: 'check',
    q: 'The checkpoint’s ruling?',
    choices: [
      '9 clears — 4 = 4; but 2 fails — 3 ≠ −3, so 2 is extraneous',
      'Both clear — each solved the squared equation fairly',
      'Both fail — squaring ruined everything',
    ],
    answer: 0,
    feedback:
      'Nine presents matching credentials: 4 against 4. Two presents 3 against ' +
      '−3 — the magnitudes match (that is why it passed the squared equation) ' +
      'but the signs do not. The solution set of the ORIGINAL equation is {9}, ' +
      'and nothing but the original gets to decide that.',
    note:
      'The roots bench certifies the arithmetic here: √16 = 4 and √9 = 3, ' +
      'exactly. A radical sign always names the nonnegative root — that ' +
      'convention is precisely what x = 2 collides with.',
  },
  {
    title: 'Where the intruder lives',
    body:
      'x = 2 is not garbage. It is the honest solution of a different equation: ' +
      'the mirror √(x + 7) = −(x − 5). Square the mirror and you get x² − 11x + ' +
      '18 = 0 — the SAME squared form.',
    mode: 'mirror',
    q: 'Why do the two equations share one squared form?',
    choices: [
      'Because (x − 5)² = (−(x − 5))² — squaring erases exactly the difference between them',
      'Coincidence — the numbers were chosen to trick you',
      'They do not; the mirror squares to something else',
    ],
    answer: 0,
    feedback:
      'The two equations differ only by the sign of the right side, and squaring ' +
      'is blind to precisely that sign. Their solution sets {9} and {2} pour ' +
      'into one shared quadratic {2, 9}. "Extraneous" is a birth certificate: ' +
      'every intruder is a citizen of the mirror.',
    note:
      'Check the mirror’s own checkpoint: at x = 2, √9 = 3 against −(2 − 5) = 3 ' +
      '— cleared. At x = 9, 4 against −4 — refused. The two equations traded ' +
      'places perfectly, as the sign argument says they must.',
  },
  {
    title: 'Screening before solving',
    body:
      'A radical is never negative. So before any solving: a candidate that ' +
      'makes the right side negative can never clear the checkpoint.',
    mode: 'check',
    q: 'Candidate x makes x − 5 negative. What do you know, instantly?',
    choices: [
      'It cannot solve the original — √(x + 7) ≥ 0 can never equal a negative number',
      'It must be the genuine solution',
      'Nothing until the full substitution is done',
    ],
    answer: 0,
    feedback:
      'The left side is a radical: zero or positive, by definition. If the right ' +
      'side is negative at your candidate, the two sides cannot be equal — no ' +
      'arithmetic needed. At x = 2 the right side is −3: doomed on sight. The ' +
      'full substitution then merely confirms what the sign already decided.',
    note:
      'This screen catches every intruder in this family: the mirror’s citizens ' +
      'are exactly the candidates whose right side went negative. One glance at ' +
      'a sign replaces a whole substitution — cheap tests first.',
  },
  {
    title: 'Sweeping the candidates',
    body:
      'The dial walks x through honest stops (each keeps x + 7 a perfect ' +
      'square): −6, −3, 2, 9, 18. Watch the two sides side by side.',
    mode: 'dial',
    dial: true,
    q: 'At how many stops do the two sides actually agree?',
    choices: [
      'One — only x = 9; at x = 2 the sides agree in size but not in sign',
      'Two — at both 2 and 9',
      'Zero — radical equations have no solutions',
    ],
    answer: 0,
    feedback:
      'One genuine agreement: at x = 9, both sides read 4. At x = 2 the display ' +
      'shows 3 against −3 — the near-miss that squaring would have promoted to a ' +
      'solution. Everywhere else the sides are not even close. The gate added ' +
      'exactly one stranger, and the sweep finds exactly one.',
    note:
      'A picture of two meeting arcs belongs to the function benches. This sweep ' +
      'is pure substitution — five stops, ten integers, no drawing — and it ' +
      'reaches the same truth from the arithmetic side.',
  },
  {
    title: 'The gatekeeper’s stamp',
    body:
      'An equation is posted with its two candidates from the squared form. ' +
      'Run the checkpoint yourself. Rule the genuine solution first, then rule ' +
      'the intruder. Both exact, or no stamp.',
    mode: 'check',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ExtraneousLab() {
  const [dialIdx, setDialIdx] = useState(3);
  const [gPick, setGPick] = useState(null);
  const [iPick, setIPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const eq = calib && kase != null ? CASES[kase] : MAIN;
  const roots = rootsOf(eq);
  const dialX = DIAL_STOPS[dialIdx];

  const checks = calib ? calibChecks(kase, gPick, iPick) : [false, false];
  const pct = calib && kase != null ? closeness(kase, gPick, iPick) : 0;
  const calibrated = calib && kase != null ? isCalibrated(kase, gPick, iPick) : false;

  const bandLabel = calib ? `posted: ${kase != null ? labelOf(kase) : ''}` : eqText(eq);
  sceneRef.current = { eq, roots, mode: current.mode, dialX, calib, bandLabel };

  /* ---- full redraw from state ------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth;
    const H2 = stage.clientHeight;
    if (W === 0 || H2 === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H2 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = sceneRef.current;
    ctx.clearRect(0, 0, W, H2);

    /* quadrille paper */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    const gs = 26;
    ctx.beginPath();
    for (let gx = gs; gx < W; gx += gs) {
      ctx.moveTo(Math.round(gx) + 0.5, 0);
      ctx.lineTo(Math.round(gx) + 0.5, H2);
    }
    for (let gy = gs; gy < H2; gy += gs) {
      ctx.moveTo(0, Math.round(gy) + 0.5);
      ctx.lineTo(W, Math.round(gy) + 0.5);
    }
    ctx.stroke();

    const bandH = 52;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const line = (txt, y, color = INK_HEX, bold = false, x = 26) => {
      ctx.fillStyle = color;
      ctx.font = (bold ? '700' : '600') + ' 12.5px ui-monospace, monospace';
      ctx.fillText(txt, x, y);
    };
    const italicHead = (txt, y) => {
      ctx.fillStyle = SLATE;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.fillText(txt, 22, y);
    };

    if (S.mode === 'derive') {
      italicHead('the derivation, one gate marked', bandH + 10);
      line(eqText(S.eq), bandH + 34, BLUE);
      line('── square both sides ──  ⚠ one-way', bandH + 60, GOLD);
      line(`x + ${S.eq.p} = (x ${S.eq.c < 0 ? MINUS : '+'} ${Math.abs(S.eq.c)})²`, bandH + 86, INK_HEX);
      line(squaredText(S.eq), bandH + 112, INK_HEX);
      line(`candidates: x = ${S.roots.map(fmtInt).join('  or  x = ')}`, bandH + 146, BLUE, true);
      italicHead('everything above the gate is safe; everything below owes a checkpoint', bandH + 180);
    } else if (S.mode === 'check') {
      italicHead('the checkpoint — substitute into the ORIGINAL', bandH + 10);
      let y = bandH + 38;
      for (const r of [...S.roots].sort((a, b) => b - a)) {
        const lhs = sqrtInt(r + S.eq.p);
        const rhs = r + S.eq.c;
        const ok = lhs === rhs;
        if (S.calib) {
          line(`x = ${fmtInt(r)}:  √(${fmtInt(r)} ${S.eq.p < 0 ? MINUS : '+'} ${Math.abs(S.eq.p)})  vs  ${fmtInt(r)} ${S.eq.c < 0 ? MINUS : '+'} ${Math.abs(S.eq.c)}   → ?`, y, BLUE);
        } else {
          line(
            `x = ${fmtInt(r)}:  √${r + S.eq.p} = ${lhs}   vs   ${fmtInt(rhs)}   ${ok ? '✓ cleared' : `✗ intruder (${lhs} ≠ ${fmtInt(rhs)})`}`,
            y,
            ok ? CARMINE : SLATE,
            ok
          );
        }
        y += 30;
      }
      if (!S.calib) {
        italicHead('the mirror, for the record', y + 10);
        line(`${mirrorText(S.eq)} owns the intruder`, y + 34, GOLD);
      }
    } else if (S.mode === 'mirror') {
      italicHead('two equations, one squared shadow', bandH + 10);
      line(eqText(S.eq) + `   → solution {${fmtInt(genuineOf(S.eq)[0])}}`, bandH + 38, CARMINE, true);
      line(mirrorText(S.eq) + `   → solution {${fmtInt(intruderOf(S.eq)[0])}}`, bandH + 68, GOLD);
      line('└──────── both square to ────────┘', bandH + 98, SLATE);
      line(squaredText(S.eq) + `   → candidates {${S.roots.map(fmtInt).join(', ')}}`, bandH + 128, INK_HEX, true);
      italicHead('squaring pours both solution sets into one bucket', bandH + 162);
    } else {
      /* dial: the candidate sweep */
      italicHead('the sweep — both sides, side by side', bandH + 10);
      const x = S.dialX;
      const lhs = sqrtInt(x + S.eq.p);
      const rhs = x + S.eq.c;
      line(`x = ${fmtInt(x)}`, bandH + 38, BLUE, true);
      line(`left:   √(${fmtInt(x)} + ${S.eq.p}) = √${x + S.eq.p} = ${lhs}`, bandH + 68, INK_HEX);
      line(`right:  ${fmtInt(x)} ${S.eq.c < 0 ? MINUS : '+'} ${Math.abs(S.eq.c)} = ${fmtInt(rhs)}`, bandH + 96, INK_HEX);
      const agree = lhs === rhs;
      const mirror = lhs === -rhs && !agree;
      line(
        agree ? '✓ the sides agree — genuine' : mirror ? `size matches, sign does not — the mirror’s stop` : '✗ not even close',
        bandH + 130,
        agree ? CARMINE : mirror ? GOLD : SLATE,
        true
      );
      /* the stops strip */
      const y0 = H2 - 70;
      const xOf = (i) => 60 + (i * (W - 120)) / (DIAL_STOPS.length - 1);
      ctx.strokeStyle = SLATE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xOf(0), y0);
      ctx.lineTo(xOf(DIAL_STOPS.length - 1), y0);
      ctx.stroke();
      DIAL_STOPS.forEach((v, i) => {
        const hot = v === x;
        ctx.fillStyle = hot ? CARMINE : BLUE;
        ctx.beginPath();
        ctx.arc(xOf(i), y0, hot ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(fmtInt(v), xOf(i), y0 + 10);
      });
      ctx.textAlign = 'left';
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(S.bandLabel, W / 2, bandH / 2);
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
    setDialIdx(3);
    setGPick(null);
    setIPick(null);
    if (STEPS[step].calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setDialIdx(3);
    setGPick(null);
    setIPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The stamp: ${kase != null ? labelOf(kase) : ''}, candidates ${roots.map(fmtInt).join(' and ')}. Genuine ${gPick ?? 'unruled'}; intruder ${iPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.mode === 'dial'
      ? `The sweep at x = ${fmtInt(dialX)}: left ${sqrtInt(dialX + eq.p)}, right ${fmtInt(dialX + eq.c)}.`
      : `${eqText(eq)}: candidates ${roots.map(fmtInt).join(' and ')}; genuine ${fmtInt(genuineOf(eq)[0])}, intruder ${fmtInt(intruderOf(eq)[0])}.`;

  return (
    <div className="exlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Extraneous Solutions: The One-Way Gate</h1>
        <p className="lede">
          Squaring both sides never loses a solution — and that is exactly the
          danger: it also lets in the mirror equation’s solutions, whose squares
          match yours. <em>Non-reversible steps are legal; they just owe a
          checkpoint</em> — substitution into the original, where signs still exist.
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

          {current.dial && !calib && (
            <div className="dials">
              <div className="dial">
                <div className="dial-head">
                  <span className="dial-k">the candidate x</span>
                  <span className="dial-v mono">{fmtInt(dialX)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={DIAL_STOPS.length - 1}
                  step={1}
                  value={dialIdx}
                  onChange={(e) => setDialIdx(Number(e.target.value))}
                  aria-label={`Candidate, ${dialX}`}
                />
              </div>
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Scene">
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
                {current.choices.map((cq, i) => {
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
                      {cq}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
              {answered && current.note && <p className="note">{current.note}</p>}
            </div>
          )}

          {calib && kase != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted equation</span>
                <span className="target-word">{labelOf(kase)}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the genuine, cleared</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the intruder, named</li>
                </ol>
                <div className="declare" role="group" aria-label="Genuine ruling">
                  {GEN_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (gPick === c2 ? ' active' : '')}
                      onClick={() => setGPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Intruder ruling">
                  {INTR_CHIPS.map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn reason' + (iPick === c2 ? ' active' : '')}
                      onClick={() => setIPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the gate is accounted for'
                    : checks[0]
                      ? 'genuine cleared — now name the mirror’s citizen'
                      : 'substitute each candidate into the original'}
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
                  <span className="mono target-hint">the genuine · then the intruder</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setGPick(null);
                  setIPick(null);
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
                  setGPick(null);
                  setIPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">forward always · backward never · the original decides</span>{' '}
        &nbsp;·&nbsp; every intruder is the mirror equation’s honest citizen — squaring
        merged two solution sets, and the checkpoint un-merges them.
      </footer>

      <style jsx>{`
        .exlab {
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
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
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
        :global(.exlab) :focus-visible {
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
