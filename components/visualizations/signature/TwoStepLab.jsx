'use client';

/* ============================================================================
   TwoStepLab — an interactive "bench" for TWO-STEP WORD PROBLEMS and for the
   question that catches you when you get one wrong:

        "Is that answer even reasonable?"

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 3 lab —
   CCSS 3.OA.D.8, all three of its clauses:
     • solve two-step word problems using the four operations
     • represent them with an EQUATION USING A LETTER for the unknown
     • assess the REASONABLENESS of answers using mental computation and
       estimation strategies including rounding

   ---------------------------------------------------------------------------
   THE ONE IDEA — "THE HALFWAY NUMBER IS NOT THE ANSWER."
   ---------------------------------------------------------------------------
   A two-step problem hides a second question behind the first. Work out step
   one, and you are holding a number — but it is not the answer, it is the
   INPUT to step two. Handing it in is the single most common way a child loses
   a mark on this standard, and they lose it while doing correct arithmetic.

   So the centerpiece is THE CHAIN: two boxes wired together, and the halfway
   number is drawn ON THE WIRE BETWEEN THEM — never in the answer box. It is
   visibly in transit. You can watch it leave box one and get eaten by box two.
   A number in transit is not a destination, and the picture says so before any
   words do.

   ---------------------------------------------------------------------------
   WHY ESTIMATION LIVES IN THIS LAB AND NOT A DIFFERENT ONE
   ---------------------------------------------------------------------------
   The standard bolts "assess reasonableness by rounding" onto two-step
   problems, and textbooks usually treat that as an unrelated chore. It is not.
   Rounding is THE DETECTOR FOR THE HALFWAY ERROR, and this lab is built to
   show exactly that: the estimate band is not decoration, it is the thing that
   catches you.

   Round each number to the nearest ten, do the same two steps in your head,
   and you get a ballpark. Because each rounding moves a number by at most 5,
   the true answer is ALWAYS within 10 of the ballpark:

        |A − estimate| = |(T − m) − (round(T) − round(m))| ≤ 5 + 5 = 10

   That is a theorem, not a hope, and the audit proves it over every story this
   lab can generate. So the band [estimate − 10, estimate + 10] is guaranteed
   to contain the true answer — which makes its CONTRAPOSITIVE the useful part
   and the thing the lab actually teaches:

        IF YOUR ANSWER IS OUTSIDE THE BAND, YOUR ANSWER IS WRONG.

   And the halfway number usually lands outside it. That is the whole lab in
   one move: the estimate catches the mistake you were most likely to make.

   HONESTY ABOUT ITS LIMITS. The band cannot catch every error — a small step
   two leaves the halfway number sitting inside the band, and an answer inside
   the band is not thereby correct (the band is a filter, not a proof). The lab
   says both of these out loud rather than overselling the trick, and
   `halfwayCaught()` computes exactly when the detector fires so the lesson can
   never claim a catch that did not happen.

   ---------------------------------------------------------------------------
   HOW IT STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
     • OperationsLab — owns the ORDER OF OPERATIONS (PEMDAS): the rule that
                       gives ONE written expression exactly one value. That is
                       a question about notation. This lab owns the STRUCTURE
                       OF A STORY — that a situation contains two questions,
                       one hidden behind the other — which no expression can
                       show you, because by the time you have the expression
                       the hard part is over.
     • RoundingLab   — owns rounding itself (whole numbers, the midpoint number
                       line). This lab never teaches how to round; it USES
                       rounding, as a detector. It draws no number line.
     • AddLab / SubtractionLab / MultiplicationLab / DivisionLab — own the four
                       operations one at a time. This lab chains two of them
                       and is about the JOIN, never the operations themselves.
     • EquationLab   — owns solving for x on a balance scale. Here the letter
                       is used to WRITE the situation down (the standard's
                       second clause), never solved for; nothing balances.

   ---------------------------------------------------------------------------
   EXACT ARITHMETIC: every quantity is a whole number of bottles. There is not
   a float anywhere in this file, which is the correct model of a shop.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* Bottles per crate — a fixed, friendly fact, not a dial. Two dials is the
   budget for a grade-3 lab, and this number is not what the lab is about. */
const PER_CRATE = 6;

/* Two dials, and the ranges are chosen so the story is always sensible:
   n ≥ 6 ⇒ T = 6n ≥ 36 > 30 ≥ m, so bottles-left is always POSITIVE. A grade-3
   shop never sells more juice than it has. */
const PARAMS = [
  { key: 'n', label: 'crates', min: 6, max: 9, step: 1, unlock: 1, role: 'how many crates arrive' },
  { key: 'm', label: 'sold', min: 12, max: 30, step: 1, unlock: 2, role: 'how many bottles are sold' },
];
const START = { n: 6, m: 24 };

/* ---- THE CHAIN — the two stages, and the number that rides between them --- */
const stepOne = (n) => PER_CRATE * n;        // T — the HALFWAY number
const stepTwo = (T, m) => T - m;             // A — the answer
const solve = (n, m) => {
  const halfway = stepOne(n);
  return { halfway, answer: stepTwo(halfway, m) };
};

/* The equation the standard asks for: a letter standing for the unknown. */
const equationOf = (n, m) => `b = ${PER_CRATE} × ${n} − ${m}`;

/* ---- THE DETECTOR — rounding as a tool, never as a topic ----------------
   RoundingLab owns HOW to round; this lab only leans on the one fact that
   makes rounding useful here: it moves a number by at most 5. */
const roundTen = (v) => Math.round(v / 10) * 10;

function estimateOf(n, m) {
  const T = stepOne(n);
  return roundTen(T) - roundTen(m);
}
const BAND = 10; // 5 from rounding T + 5 from rounding m — see the header's proof
const bandOf = (n, m) => {
  const e = estimateOf(n, m);
  return { lo: e - BAND, hi: e + BAND, est: e };
};
const inBand = (v, n, m) => {
  const b = bandOf(n, m);
  return v >= b.lo && v <= b.hi;
};
/* Does the detector actually fire on the halfway number for this story? The
   lesson may only claim a catch when this says so. */
const halfwayCaught = (n, m) => !inBand(solve(n, m).halfway, n, m);

/* ---- calibration: solve a fresh story, and be checked twice -------------
   The stamp needs BOTH the right answer AND that the answer survives its own
   reasonableness check — which it always will, by the theorem. Exact integer
   equality; no epsilon, because bottles are whole. */
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  let t;
  do {
    const n = 6 + Math.floor(rand() * 4);        // 6…9
    const m = 12 + Math.floor(rand() * 19);      // 12…30
    t = { n, m };
  } while (prev && t.n === prev.n && t.m === prev.m);
  return t;
}
const isCalibrated = (guess, n, m) => guess === solve(n, m).answer;
/* The halfway number is the wrong answer worth naming — so the lab names it. */
const isHalfway = (guess, n, m) => guess === solve(n, m).halfway;

/* ---- the lesson --------------------------------------------------------- */
const STEPS = [
  {
    title: 'A story with a hidden question',
    focus: 'meet',
    body:
      'A shop gets some crates of juice. Every crate holds 6 bottles. Later that day, some bottles are ' +
      'sold. The question is: how many bottles are LEFT? Read it twice — there is a second question ' +
      'hiding inside it.',
    q: 'To find how many bottles are left, what must you work out FIRST?',
    choices: [
      'How many bottles arrived altogether',
      'How many bottles were sold',
      'How many crates the shop has',
    ],
    answer: 0,
    feedback:
      'You cannot subtract the sold bottles from anything until you know how many arrived. That is what ' +
      'makes this a TWO-step problem: the first question is hidden, and nobody asks it out loud. You ' +
      'have to notice it.',
  },
  {
    title: 'Step one — the halfway number',
    focus: 'one',
    body:
      'The crates dial is live. Step one fills the first box: 6 bottles in each crate, so 6 × crates ' +
      'bottles arrive. Watch where that number goes — it does not stay in the box. It gets on the wire.',
    q: 'With 6 crates of 6 bottles, how many bottles arrived?',
    choices: ['36', '12', '30'],
    answer: 0,
    feedback:
      '6 × 6 = 36 bottles arrived. Now look at the picture: 36 is sitting on the WIRE, not in the answer ' +
      'box. It is on its way somewhere. A number in transit is not an answer.',
  },
  {
    title: 'The halfway trap',
    focus: 'two',
    body:
      'The sold dial is live, and step two can run: the bottles that arrived go in, the sold ones come ' +
      'off, and what is left drops into the answer box. Now the trap. Almost everyone who gets this ' +
      'wrong does the arithmetic perfectly — and hands in the number on the wire.',
    q: '36 bottles arrived and 24 were sold. Is the answer 36?',
    choices: [
      'No — 36 is only halfway; the answer is 12',
      'Yes — 6 × 6 = 36, and that is correct arithmetic',
      'Yes, because 36 is the biggest number in the story',
    ],
    answer: 0,
    feedback:
      '36 is right — for step one. It is the wrong ANSWER, from perfectly right arithmetic, which is ' +
      'what makes this mistake so easy to make and so hard to spot. 36 − 24 = 12 bottles are left. The ' +
      'story asked what is LEFT, and 36 never left anything.',
  },
  {
    title: 'Is that reasonable?',
    focus: 'check',
    body:
      'Here is how you catch yourself. Round each number to the nearest ten and redo the story in your ' +
      'head: about 40 arrived, about 20 sold, so about 20 left. That ballpark comes with a band, and the ' +
      'true answer is ALWAYS inside it — rounding can only move things a little.',
    q: 'Your estimate says “about 20 left”. You wrote 36. What does that tell you?',
    choices: [
      '36 is outside the band, so 36 must be wrong',
      '36 is close enough to 20 to be fine',
      'Nothing — estimates are only guesses',
    ],
    answer: 0,
    feedback:
      'The band catches you. This is why rounding is in this lesson and not off in a corner by itself: ' +
      'it is the detector for the halfway mistake. Two honest warnings, though. An answer INSIDE the ' +
      'band is not proved right — the band is a filter, not a proof. And if very few bottles were sold, ' +
      'the halfway number sits inside the band and slips through. The check catches big mistakes, which ' +
      'is exactly what the halfway mistake usually is.',
  },
  {
    title: 'Your turn',
    focus: 'calib',
    body:
      'A fresh story. Work out both steps, then type how many bottles are left. The estimate band is on ' +
      'your side — check your answer against it before you commit. Press New story for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

export default function TwoStepLab() {
  const [n, setN] = useState(START.n);
  const [m, setM] = useState(START.m);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);
  const [guess, setGuess] = useState('');

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const S = solve(n, m);
  const band = bandOf(n, m);

  sceneRef.current = { n, m, focus };

  const g = guess === '' ? null : parseInt(guess, 10);
  const calibrated = target && g != null ? isCalibrated(g, n, m) : false;
  const guessedHalfway = target && g != null ? isHalfway(g, n, m) : false;
  const guessInBand = target && g != null ? inBand(g, n, m) : false;

  /* ---- the chain ---------------------------------------------------------- */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (W === 0 || H === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const Q = sceneRef.current;
    const Ln = Q.n, Lm = Q.m;
    const LS = solve(Ln, Lm);
    const showTwo = Q.focus !== 'meet' && Q.focus !== 'one';

    const INK = '#1c2b3a', SOFT = '#5b6b7b', CARM = '#c81e4f', WIRE = '#2f6f9f';

    const boxW = Math.min(150, W * 0.26), boxH = 66;
    const cy = H * 0.42;
    const b1x = W * 0.12, b2x = W * 0.56;

    const box = (x, label, sub, on) => {
      ctx.save();
      ctx.fillStyle = on ? '#fff' : '#f4f6f7';
      ctx.strokeStyle = on ? INK : 'rgba(28,43,58,0.3)';
      ctx.lineWidth = on ? 2 : 1.2;
      ctx.beginPath(); ctx.roundRect(x, cy - boxH / 2, boxW, boxH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? INK : SOFT;
      ctx.font = '600 13px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + boxW / 2, cy - 8);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = SOFT;
      ctx.fillText(sub, x + boxW / 2, cy + 12);
      ctx.restore();
    };

    box(b1x, `${PER_CRATE} × ${Ln}`, 'step one', true);
    box(b2x, showTwo ? `− ${Lm}` : '?', 'step two', showTwo);

    /* THE WIRE — and the halfway number riding it. This is the lab: the number
       is drawn IN TRANSIT, never in the answer box, because it is not an
       answer. */
    ctx.save();
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b1x + boxW, cy); ctx.lineTo(b2x, cy); ctx.stroke();
    const midX = (b1x + boxW + b2x) / 2;
    ctx.beginPath(); ctx.moveTo(b2x - 9, cy - 5); ctx.lineTo(b2x, cy); ctx.lineTo(b2x - 9, cy + 5); ctx.stroke();
    // the chip on the wire
    ctx.fillStyle = '#eaf2f8';
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = 1.5;
    const cw = 46;
    ctx.beginPath(); ctx.roundRect(midX - cw / 2, cy - 26, cw, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = WIRE;
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(LS.halfway), midX, cy - 12);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('halfway — not the answer', midX, cy + 22);
    ctx.restore();

    // the answer box
    if (showTwo) {
      const ax = b2x + boxW + 26;
      ctx.save();
      ctx.fillStyle = 'rgba(200,30,79,0.06)';
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 2.2;
      const aw = Math.min(96, W - ax - 12);
      ctx.beginPath(); ctx.roundRect(ax, cy - boxH / 2, aw, boxH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CARM;
      ctx.font = '700 22px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(LS.answer), ax + aw / 2, cy + 2);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('bottles left', ax + aw / 2, cy + 20);
      ctx.restore();
    }

    /* the estimate band — the detector, drawn as a real interval */
    if (Q.focus === 'check' || Q.focus === 'calib') {
      const bd = bandOf(Ln, Lm);
      const by = H - 42;
      const lo = 0, hi = 60;
      const bx = (v) => 40 + ((v - lo) / (hi - lo)) * (W - 80);
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.3)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx(lo), by); ctx.lineTo(bx(hi), by); ctx.stroke();
      // the band
      ctx.fillStyle = 'rgba(31,138,91,0.18)';
      ctx.fillRect(bx(Math.max(lo, bd.lo)), by - 13, bx(Math.min(hi, bd.hi)) - bx(Math.max(lo, bd.lo)), 26);
      ctx.strokeStyle = '#1f8a5b';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(bx(Math.max(lo, bd.lo)), by - 13, bx(Math.min(hi, bd.hi)) - bx(Math.max(lo, bd.lo)), 26);
      ctx.fillStyle = '#1f8a5b';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`about ${bd.est} — reasonable answers land in here`, (bx(bd.lo) + bx(bd.hi)) / 2, by - 20);
      // the true answer
      ctx.fillStyle = CARM;
      ctx.beginPath(); ctx.arc(bx(LS.answer), by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      ctx.fillText(String(LS.answer), bx(LS.answer), by + 26);
      // the halfway number, and whether the detector fires
      const caught = halfwayCaught(Ln, Lm);
      ctx.fillStyle = caught ? WIRE : 'rgba(47,111,159,0.45)';
      ctx.beginPath(); ctx.arc(bx(Math.min(hi, LS.halfway)), by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(caught ? `${LS.halfway} — caught!` : `${LS.halfway} — slips through`,
        bx(Math.min(hi, LS.halfway)), by + 26);
      ctx.restore();
    }
  }, []);

  useEffect(() => { draw(); }, [n, m, step, focus, draw]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) {
      const t = makeTarget(null); setTarget(t); setN(t.n); setM(t.m); setGuess('');
    }
    /* Step 4's question quotes concrete numbers ("your estimate says about 20;
       you wrote 36"), so the scene must actually BE that story when the step
       opens — otherwise a dial left elsewhere makes the tutor contradict the
       canvas, which is worse than asking nothing. Exploring from there is the
       student's own business; arriving to a lie is not. */
    if (current.focus === 'check') { setN(START.n); setM(START.m); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = `${PER_CRATE} times ${n} is ${S.halfway}. ${S.halfway} minus ${m} is ${S.answer} bottles left.`;

  return (
    <div className="tslab">
      <header className="head">
        <h1>The Halfway Trap</h1>
        <p className="lede">
          Some problems ask you two questions and only tell you about one of them. Work out the
          first, and you are holding a number — but it is <em>not</em> the answer. Here is how to
          spot the second question, and how rounding catches you when you forget it.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <p className="story">
            The shop gets <strong>{n}</strong> crates of juice. Each crate holds{' '}
            <strong>{PER_CRATE}</strong> bottles. Then <strong>{m}</strong> bottles are sold.
            How many are left?
          </p>
          <p className="eq mono">{equationOf(n, m)}</p>
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`A two-step chain. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
        </section>

        <aside className="panel tutor">
          <div className="progress" role="list" aria-label="Lesson progress">
            {STEPS.map((_, i) => (
              <span key={i} role="listitem"
                className={'pip' + (i === step ? ' cur' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined} />
            ))}
          </div>
          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              const val = d.key === 'n' ? n : m;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input type="range" min={d.min} max={d.max} step={d.step} value={val}
                    disabled={!unlocked} aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => (d.key === 'n' ? setN(+e.target.value) : setM(+e.target.value))} />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((c, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (chosen === i) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && chosen === i ? '✕' : ''}
                      </span>{c}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && target && (
            <div className="calib">
              <label className="ask">
                How many bottles are left?
                <input type="number" inputMode="numeric" value={guess} placeholder="?"
                  aria-label="Your answer: how many bottles are left"
                  onChange={(e) => setGuess(e.target.value)} />
              </label>
              {g != null && (
                <p className={'verdict' + (calibrated ? ' ok' : guessedHalfway ? ' halfway' : ' no')}>
                  {calibrated
                    ? `Yes — ${S.answer} bottles left. Both steps, in the right order.`
                    : guessedHalfway
                      ? `That is the halfway number. ${S.halfway} bottles arrived — but the story asked how many are LEFT. One more step.`
                      : guessInBand
                        ? `Not quite. It is at least reasonable — ${g} sits inside the band — so check your arithmetic, not your plan.`
                        : `Outside the band. The estimate says about ${band.est}, so ${g} cannot be right whatever the arithmetic says.`}
                </p>
              )}
              {calibrated && <span className="stamp">SOLVED</span>}
              <button type="button" className="btn ghost"
                onClick={() => { const t = makeTarget(target); setTarget(t); setN(t.n); setM(t.m); setGuess(''); }}>
                New story
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canNext}>{hasQuestion && !answered ? 'Answer to continue' : 'Next →'}</button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setTarget(null); setGuess(''); setN(START.n); setM(START.m);
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .tslab {
          --page:#eff1ee; --paper:#fbfbf8; --ink:#1c2b3a; --ink-soft:#5b6b7b;
          --curve:#c81e4f; --quad:#c7d8e4; --ok:#1f8a5b; --wire:#2f6f9f;
          --mono: ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page); color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px; border-radius:16px; max-width:1120px; margin:0 auto;
        }
        .mono { font-family: var(--mono); }
        .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px;
          overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
        .eyebrow { font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--ink-soft); margin:0 0 6px; }
        .eyebrow.small { margin:0 0 4px; }
        h1 { font-family:var(--serif); font-weight:600; font-size:clamp(24px,3.6vw,32px); margin:0 0 6px; }
        .lede { color:var(--ink-soft); margin:0 0 22px; max-width:66ch; }
        .bench { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:22px; align-items:start; }
        @media (max-width:920px){ .bench{ grid-template-columns:1fr; } }
        .panel { background:#fff; border:1px solid rgba(28,43,58,.15); border-radius:12px; box-shadow:0 1px 2px rgba(28,43,58,.05); }
        .stage-panel { padding:14px; }
        .story { margin:0 0 4px; font-size:15px; line-height:1.5; }
        .story strong { color:var(--curve); }
        .eq { margin:0 0 10px; font-size:13px; color:var(--ink-soft); }
        .stage { position:relative; width:100%; aspect-ratio:16/9; border:1px solid var(--quad);
          border-radius:8px; overflow:hidden; background:var(--paper); }
        .stage canvas { display:block; width:100%; height:100%; }
        .btn { font:600 13px/1 system-ui,sans-serif; padding:9px 14px; border-radius:8px; cursor:pointer;
          border:1px solid var(--ink); background:var(--ink); color:#fff; transition:all .15s; }
        .btn.ghost { background:transparent; color:var(--ink); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .tutor { padding:18px 20px 20px; }
        .progress { display:flex; gap:6px; margin-bottom:14px; }
        .pip { height:5px; flex:1; border-radius:3px; background:rgba(28,43,58,.14); }
        .pip.done { background:rgba(200,30,79,.45); }
        .pip.cur { background:var(--curve); }
        h2 { font-family:var(--serif); font-weight:600; font-size:20px; margin:0 0 10px;
          padding-bottom:9px; border-bottom:3px double rgba(200,30,79,.45); }
        .body { margin:0 0 16px; font-size:14.5px; }
        .dials { display:grid; gap:11px; }
        .dial { display:grid; grid-template-columns:48px 1fr 30px; grid-template-rows:auto auto; align-items:center; gap:2px 10px; }
        .dial.locked { opacity:.5; }
        .dk { grid-row:1/3; font-size:12px; font-weight:600; font-family:var(--mono); }
        .drole { grid-column:2/4; font-size:11px; color:var(--ink-soft); }
        .dial input[type='range'] { grid-column:2; width:100%; accent-color:var(--ink); cursor:pointer; }
        .dv { grid-column:3; font-family:var(--mono); text-align:right; font-size:13px; }
        .quiz { margin-top:16px; padding-top:14px; border-top:1px solid rgba(28,43,58,.1); }
        .q { font-size:14px; font-weight:600; margin:0 0 10px; }
        .choices { display:grid; gap:7px; }
        .choice { text-align:left; font:13.5px/1.4 system-ui,sans-serif; padding:9px 11px 9px 30px;
          border:1px solid rgba(28,43,58,.2); border-radius:8px; background:var(--paper); color:var(--ink);
          cursor:pointer; position:relative; transition:border-color .15s,background .15s; }
        .choice .mark { position:absolute; left:10px; font-weight:700; }
        .choice.correct { border-color:var(--ok); background:rgba(31,138,91,.08); }
        .choice.correct .mark { color:var(--ok); }
        .choice.wrong { border-color:var(--ink-soft); background:rgba(91,107,123,.08); }
        .choice.wrong .mark { color:var(--ink-soft); }
        .choice.dim { opacity:.55; }
        .feedback { margin:12px 0 0; font-size:13px; line-height:1.55; background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve); padding:10px 12px; border-radius:0 6px 6px 0; }
        .calib { margin-top:16px; padding-top:14px; border-top:1px solid rgba(28,43,58,.1); display:grid; gap:10px; justify-items:start; }
        .ask { display:grid; gap:5px; font-size:14px; font-weight:600; width:100%; }
        .ask input { font:600 18px var(--mono); padding:8px 10px; width:110px; border-radius:8px;
          border:1px solid rgba(28,43,58,.3); background:var(--paper); color:var(--ink); }
        .verdict { margin:0; font-size:13px; line-height:1.5; padding:9px 11px; border-radius:0 6px 6px 0; }
        .verdict.ok { background:rgba(31,138,91,.08); border-left:3px solid var(--ok); }
        .verdict.halfway { background:rgba(47,111,159,.08); border-left:3px solid var(--wire); }
        .verdict.no { background:rgba(91,107,123,.08); border-left:3px solid var(--ink-soft); }
        .stamp { font:700 12px/1 var(--mono); letter-spacing:.16em; color:var(--ok);
          border:2px solid var(--ok); border-radius:6px; padding:4px 8px; transform:rotate(-3deg); }
        .nav { margin-top:20px; display:flex; justify-content:space-between; gap:10px; }
        :global(.tslab) :focus-visible { outline:2px solid var(--ink); outline-offset:2px; border-radius:4px; }
        @media (prefers-reduced-motion:reduce){ .btn,.choice{ transition:none; } }
      `}</style>
    </div>
  );
}
