'use client';

/* ============================================================================
   PositionLab — an interactive "bench" for POSITION WORDS:

        above · below · beside · behind · in front of

   Built for MAIS (math AI system, www.mais.ac), K-12.  A KINDERGARTEN lab —
   CCSS K.G.A.1 ("describe the relative positions of these objects using terms
   such as above, below, beside, in front of, and next to").

   ---------------------------------------------------------------------------
   THE ONE IDEA — "A POSITION WORD NEEDS TWO THINGS."
   ---------------------------------------------------------------------------
   "Above" is not a property of the ball.  You cannot look at a ball on its own
   and say whether it is above.  Above is a word about a PAIR — the ball AND
   something else — and that is the whole lab.

   The centerpiece makes the point in the only way a five-year-old will believe:
   a shelf, a box, and one ball parked between them.  The ball has not moved,
   and it is ABOVE THE BOX and BELOW THE SHELF at the same time.  Both
   sentences are true.  Neither is about the ball.  Change what you compare it
   to and the word changes — so the word was never the ball's to begin with.

   That is the seed of every later relation in this library (comparison,
   coordinates, ordering), and it is the honest mathematical content of a
   standard that looks like pure vocabulary.

   ---------------------------------------------------------------------------
   HOW IT STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
     • SortLab   — owns BINS BY ATTRIBUTE (K.MD.B.3): to sort is to choose an
                   attribute, and colour/shape/size regroup the same objects.
                   Those are properties of ONE object. This lab owns exactly
                   what SortLab cannot express: a word that needs TWO.
     • ShapesLab — owns the NAME FUNCTION for a single shape (K.G.A.2 /
                   1.G.A.1): nameOf(sides, equal, closed). Again: one object.
     • PointLab  — owns the coordinate plane's DEFINITION (one number = a line,
                   two = a crossing). This lab has no axes, no numbers and no
                   number line at all: a five-year-old gets the relation years
                   before the coordinates.
     • CommutativeLab / AddLab / MultiplicationLab — own the SWAP button
                   (a + b = b + a: order does not matter). So this lab has NO
                   swap control, deliberately, even though swapping a position
                   pair is interesting — because here order DOES matter and the
                   word flips (ball above box ⇒ box below ball). That converse
                   is audited as a property of the model and mentioned once in
                   prose; it never becomes a device, because the device is
                   already owned. audit-position.mjs greps this source to keep
                   it that way.

   ---------------------------------------------------------------------------
   THE K-TIER DISCIPLINE (a standing project rule, and this lab obeys it)
   ---------------------------------------------------------------------------
   Labs for young children get ONE dial and say each thing ONCE.  So:
     • ONE dial — `where`, which walks the ball around the box. No second dial,
       no locked ghost dials, no lens toggles.
     • The sentence ("the ball is above the box") appears exactly ONCE, in the
       stage head. There is no facts grid repeating it, no canvas label
       repeating it, no second equation.
     • Five steps, not seven.
   The audit greps the comment-stripped source to keep all three true, because
   density creeps back in silently.

   ---------------------------------------------------------------------------
   THE MODEL, EXACTLY
   ---------------------------------------------------------------------------
   Every object sits at integer coordinates (x, y, z) — x across, y up, z into
   the scene.  All arithmetic is integer differences, so there are no floats to
   round and no artefacts to leak.

   `positionWord(a, b)` is the heart, and it is deliberately BLIND: it reads
   only the two positions.  It cannot see colour, size, or which object is the
   "important" one — so the same function that says the ball is above the box
   will say the box is below the ball, and will do it without knowing what a
   ball is.  That blindness is invariance by scope (the ShapesLab pattern), and
   the audit proves it by grepping the function's own body.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/PositionLab.jsx
     2. Import and render it:
          import PositionLab from './PositionLab';
          export default function Page() { return <PositionLab />; }

   The block between MODEL:START and MODEL:END is pure, React-free, pixel-free
   JavaScript.  audit-position.mjs SLICES THAT BLOCK OUT OF THIS FILE and
   evaluates it, so the audit tests the code that actually ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* ---- the scene. Integer coordinates: x across, y up, z into the scene. ---
   The box is the thing everything is compared to; the shelf sits two steps
   straight above it, so the ball can be sandwiched between them. */
const BOX = { key: 'box', label: 'the box', x: 0, y: 0, z: 0 };
const SHELF = { key: 'shelf', label: 'the shelf', x: 0, y: 2, z: 0 };

/* The six spots the ball can occupy, each one step from the box along exactly
   ONE axis — which is what makes its position word unambiguous. */
const SPOTS = [
  { key: 'above',  x: 0,  y: 1,  z: 0 },
  { key: 'beside', x: -1, y: 0,  z: 0 },
  { key: 'front',  x: 0,  y: 0,  z: -1 },
  { key: 'behind', x: 0,  y: 0,  z: 1 },
  { key: 'right',  x: 1,  y: 0,  z: 0 },
  { key: 'below',  x: 0,  y: -1, z: 0 },
];
const START = { where: 0 };            // the ball starts above the box
const ballAt = (where) => SPOTS[Math.max(0, Math.min(SPOTS.length - 1, where))];

/* ---- THE HEART ----------------------------------------------------------
   The position word for a compared to b. It reads TWO POSITIONS AND NOTHING
   ELSE — no colour, no size, no name, no notion of which object matters. That
   blindness is the point: the word belongs to the pair, not to either object.

   When objects differ on more than one axis the vertical relation is reported
   first, then depth, then across. That is a deliberate modelling choice (a
   ball off to one side but far below a shelf reads as "below the shelf", which
   is what a child says), and it is documented rather than hidden. For the six
   spots the ball can actually occupy, exactly one axis ever differs from the
   box, so no priority is needed there at all. */
function positionWord(a, b) {
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const dx = a.x - b.x;
  if (dy > 0) return 'above';
  if (dy < 0) return 'below';
  if (dz > 0) return 'behind';
  if (dz < 0) return 'in front of';
  if (dx !== 0) return 'beside';
  return 'on';
}

/* The converse. Swapping the pair flips the word — "the ball is above the box"
   and "the box is below the ball" are the same fact said twice. This is a
   PROPERTY the audit checks over every pair of positions; it is deliberately
   NOT a swap button (that device belongs to CommutativeLab and friends, where
   swapping changes nothing — here it changes everything). */
const OPPOSITE = {
  above: 'below',
  below: 'above',
  behind: 'in front of',
  'in front of': 'behind',
  beside: 'beside',
  on: 'on',
};

/* The full sentence a child reads. Built from the word, never stored. */
function sentence(subject, a, b) {
  return `${subject} is ${positionWord(a, b)} ${b.label}`;
}

/* ---- calibration: a construction goal — put the ball where the word says --
   Exact by construction: the stamp is a string equality on the computed word,
   so it cannot fire on a near-miss. There is no meter tolerance to tune. */
const GOALS = ['behind', 'below', 'beside', 'in front of', 'above'];
function makeTarget(prev, rnd) {
  const rand = rnd || Math.random;
  let t;
  do { t = GOALS[Math.floor(rand() * GOALS.length)]; } while (prev && t === prev);
  return t;
}
function isCalibrated(where, goal) {
  return positionWord(ballAt(where), BOX) === goal;
}
/* Which spots satisfy a goal — 'beside' has two (either side), which is true
   and worth saying out loud rather than hiding. */
function spotsFor(goal) {
  const out = [];
  for (let i = 0; i < SPOTS.length; i++) if (isCalibrated(i, goal)) out.push(i);
  return out;
}

/* ---- the lesson. Five steps. One idea each. ---------------------------- */
const STEPS = [
  {
    title: 'A ball and a box',
    focus: 'meet',
    body:
      'Here is a box, and here is a ball. The ball is sitting up high. We can say where it is with one ' +
      'word: the ball is ABOVE the box.',
    q: 'Where is the ball?',
    choices: ['Above the box', 'Below the box', 'Behind the box'],
    answer: 0,
    feedback:
      'The ball is above the box. Notice we needed BOTH things to say it — the ball and the box. ' +
      '“Above” is not something the ball is on its own.',
  },
  {
    title: 'Move the ball',
    focus: 'move',
    body:
      'Now you can move the ball. Slide the dial and watch the sentence at the top change. The ball ' +
      'never changes — it is the same ball. Only the word changes.',
    q: 'Put the ball at the bottom spot. Now which word is right?',
    choices: ['Below the box', 'Above the box', 'Beside the box'],
    answer: 0,
    feedback:
      'Below. The same ball is above the box in one spot and below it in another — so the word was ' +
      'never about the ball. It is about the ball AND the box together.',
  },
  {
    title: 'Behind and in front',
    focus: 'depth',
    body:
      'Some spots are not up or down or sideways — they are further away, or nearer to you. When the ' +
      'ball goes BEHIND the box, the box hides part of it. When it comes IN FRONT OF the box, the ball ' +
      'hides part of the box instead.',
    q: 'The box is hiding part of the ball. Where is the ball?',
    choices: ['Behind the box', 'In front of the box', 'Above the box'],
    answer: 0,
    feedback:
      'Behind. Whoever does the hiding is in front. That is how your eyes tell near from far — the ' +
      'nearer thing wins, and covers up the one behind it.',
  },
  {
    title: 'Two words at once',
    focus: 'two',
    body:
      'A shelf has appeared above the box. Park the ball in the middle spot, between them, and read ' +
      'BOTH sentences. The ball is not moving. It is above the box AND below the shelf — at the very ' +
      'same time.',
    q: 'The ball is above the box. Can it also be below the shelf at the same time?',
    choices: [
      'Yes — both are true at once',
      'No — it has to be one or the other',
      'Only if the ball moves',
    ],
    answer: 0,
    feedback:
      'Both are true, and the ball never moved. That is the big idea: a word like “above” needs TWO ' +
      'things. Change what you compare the ball to, and the word changes. It works backwards, too — ' +
      'if the ball is above the box, then the box is below the ball. Same fact, said from the other side.',
  },
  {
    title: 'Put the ball there',
    focus: 'calib',
    body:
      'Last one. You get a word. Move the ball until it is really in that spot, and the sentence at the ' +
      'top will match. Press New word to play again.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PositionLab() {
  const [where, setWhere] = useState(START.where);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;
  const ball = ballAt(where);

  sceneRef.current = { where, focus, target };

  const calibrated = target ? isCalibrated(where, target) : false;
  const pct = calibrated ? 100 : 0;

  /* ---- the scene renderer: full redraw from the snapshot ----------------- */
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

    const S = sceneRef.current;
    const B = ballAt(S.where);                 // from the snapshot, never the closure
    const showShelf = S.focus === 'two';

    const INK = '#1c2b3a';
    const CARM = '#c81e4f';
    const STEP = Math.min(W, H) * 0.19;        // one grid step, in pixels
    const cx = W / 2, cy = H / 2 + STEP * 0.25;
    const px = (o) => [cx + o.x * STEP, cy - o.y * STEP];

    // quadrille paper — the house ground
    ctx.save();
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.lineWidth = 1;
    const g = STEP / 2;
    for (let x = (cx % g); x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = (cy % g); y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    const boxW = STEP * 1.15, boxH = STEP * 0.92;
    const [bx, by] = px(BOX);

    const drawShelf = () => {
      const [sx, sy] = px(SHELF);
      ctx.save();
      ctx.fillStyle = '#c9b48a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(sx - boxW * 1.5, sy - STEP * 0.10, boxW * 3, STEP * 0.20);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    };

    const drawBox = () => {
      ctx.save();
      // a plain crate, drawn with a lid edge so "behind" reads as depth
      ctx.fillStyle = '#b9c9d6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.rect(bx - boxW / 2, by - boxH / 2, boxW, boxH);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - boxW / 2, by - boxH / 2 + STEP * 0.16);
      ctx.lineTo(bx + boxW / 2, by - boxH / 2 + STEP * 0.16);
      ctx.strokeStyle = 'rgba(28,43,58,0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    };

    const drawBall = () => {
      // behind / in front sit at the box's centre and are told apart by WHO
      // HIDES WHOM — so they are nudged just enough to be seen, never enough
      // to look like "beside".
      let [x, y] = px(B);
      if (B.key === 'behind') { x = bx + boxW * 0.30; y = by - boxH * 0.42; }
      if (B.key === 'front')  { x = bx - boxW * 0.26; y = by + boxH * 0.34; }
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, STEP * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = CARM;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // a soft highlight so it reads as a ball, not a disc
      ctx.beginPath();
      ctx.arc(x - STEP * 0.10, y - STEP * 0.11, STEP * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fill();
      ctx.restore();
    };

    /* PAINT ORDER IS THE MATHEMATICS HERE: "behind" means the box is painted
       last and covers the ball; "in front of" means the ball is painted last
       and covers the box. The picture does not illustrate the word — it IS
       the word. */
    if (showShelf) drawShelf();
    if (B.key === 'behind') { drawBall(); drawBox(); }
    else { drawBox(); drawBall(); }
  }, []);

  useEffect(() => { draw(); }, [where, step, target, focus, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (current.calib && !target) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the two-words step needs the ball between the shelf and the box; the build
     step starts somewhere that does not already match */
  useEffect(() => {
    if (focus === 'two') setWhere(0);
    if (focus === 'depth') setWhere(3);
    if (focus === 'calib') setWhere(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* THE sentence — said once, here, and nowhere else. */
  const mainSentence = sentence('the ball', ball, BOX);
  const shelfSentence = sentence('the ball', ball, SHELF);
  const spoken = focus === 'two' ? `${mainSentence}. And ${shelfSentence}.` : `${mainSentence}.`;

  return (
    <div className="poslab">
      <header className="head">
        <h1>Where Is It?</h1>
        <p className="lede">
          Above, below, beside, behind, in front of. A word like <em>above</em> is never about
          one thing on its own — it always needs two. Move the ball and watch the words
          change.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="say">{mainSentence}</p>
            {focus === 'two' && <p className="say second">{shelfSentence}</p>}
          </div>

          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={spoken} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
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

          <p className="eyebrow small">Step {step + 1} of {STEPS.length}</p>
          <h2>{current.title}</h2>
          <p className="body">{current.body}</p>

          {/* THE one dial */}
          <label className={'dial' + (step >= 1 ? '' : ' locked')}>
            <span className="drole">{step >= 1 ? 'move the ball' : 'unlocks next'}</span>
            <input
              type="range"
              min={0}
              max={SPOTS.length - 1}
              step={1}
              value={where}
              disabled={step < 1}
              aria-label="Move the ball around the box"
              onChange={(e) => setWhere(parseInt(e.target.value, 10))}
            />
          </label>

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
                    <button
                      type="button"
                      key={i}
                      className={cls}
                      onClick={() => choose(i)}
                      disabled={chosen != null}
                    >
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

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Put the ball <span className="goal">{target}</span> the box.
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="meter-row">
                {calibrated ? (
                  <span className="stamp">THAT’S IT</span>
                ) : (
                  <span className="target-hint">keep moving the ball…</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setTarget(makeTarget(target)); setWhere(0); }}
              >
                New word
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
                  setWhere(START.where);
                }}
              >
                Start again
              </button>
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .poslab {
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
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px;
        }
        .eyebrow.small { margin: 0 0 4px; }
        h1 {
          font-family: var(--serif); font-weight: 600;
          font-size: clamp(26px, 4vw, 34px); margin: 0 0 6px;
        }
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 62ch; }
        .bench {
          display: grid; grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px; align-items: start;
        }
        @media (max-width: 920px) { .bench { grid-template-columns: 1fr; } }
        .panel {
          background: #fff; border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px; box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel { padding: 14px; }
        .stage-head { margin-bottom: 10px; min-height: 30px; }
        .say {
          font-family: var(--serif); color: var(--curve);
          font-size: clamp(20px, 3.4vw, 27px); font-weight: 600; margin: 0;
        }
        .say.second { color: var(--ink-soft); font-size: clamp(16px, 2.6vw, 20px); margin-top: 2px; }
        .stage {
          position: relative; width: min(100%, 520px); aspect-ratio: 1 / 1;
          margin: 0 auto; border: 1px solid var(--quad); border-radius: 8px;
          overflow: hidden; background: var(--paper);
        }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .btn {
          font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px;
          border-radius: 8px; cursor: pointer; border: 1px solid var(--ink);
          background: var(--ink); color: #fff;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn:not(:disabled):hover { filter: brightness(1.08); }
        .tutor { padding: 18px 20px 20px; }
        .progress { display: flex; gap: 6px; margin-bottom: 14px; }
        .pip { height: 5px; flex: 1; border-radius: 3px; background: rgba(28, 43, 58, 0.14); }
        .pip.done { background: rgba(200, 30, 79, 0.45); }
        .pip.cur { background: var(--curve); }
        h2 {
          font-family: var(--serif); font-weight: 600; font-size: 20px;
          margin: 0 0 10px; padding-bottom: 9px;
          border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body { margin: 0 0 16px; font-size: 15px; }
        .dial { display: grid; gap: 3px; margin-bottom: 6px; }
        .dial.locked { opacity: 0.5; }
        .drole { font-size: 11px; color: var(--ink-soft); }
        .dial input[type='range'] { width: 100%; accent-color: var(--curve); cursor: pointer; }
        .dial input[type='range']:disabled { cursor: not-allowed; }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); }
        .q { font-size: 14.5px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice {
          text-align: left; font: 14px/1.4 system-ui, sans-serif;
          padding: 10px 11px 10px 30px; border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px; background: var(--paper); color: var(--ink);
          cursor: pointer; position: relative;
          transition: border-color 0.15s, background 0.15s;
        }
        .choice:not(:disabled):hover { border-color: var(--ink); }
        .choice .mark { position: absolute; left: 10px; font-weight: 700; }
        .choice.correct { border-color: var(--ok); background: rgba(31, 138, 91, 0.08); }
        .choice.correct .mark { color: var(--ok); }
        .choice.wrong { border-color: var(--ink-soft); background: rgba(91, 107, 123, 0.08); }
        .choice.wrong .mark { color: var(--ink-soft); }
        .choice.dim { opacity: 0.55; }
        .choice:disabled { cursor: default; }
        .feedback {
          margin: 12px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--ink);
          background: rgba(200, 30, 79, 0.05); border-left: 3px solid var(--curve);
          padding: 10px 12px; border-radius: 0 6px 6px 0;
        }
        .calib {
          margin-top: 16px; padding-top: 14px;
          border-top: 1px solid rgba(28, 43, 58, 0.1); display: grid; gap: 10px;
        }
        .calib-goal { margin: 0; font-size: 16px; }
        .calib-goal .goal { color: var(--curve); font-weight: 700; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(31, 138, 91, 0.55), var(--ok));
          transition: width 0.2s ease-out;
        }
        .meter-row { display: flex; justify-content: flex-end; align-items: center; min-height: 26px; }
        .target-hint { color: var(--ink-soft); font-size: 12.5px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 5px 9px;
          transform: rotate(-3deg);
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        :global(.poslab) :focus-visible {
          outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn, .meter-fill, .choice { transition: none; }
        }
      `}</style>
    </div>
  );
}
