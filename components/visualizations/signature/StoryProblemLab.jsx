'use client';

/* ============================================================================
   StoryProblemLab — an interactive "bench" for ADD & SUBTRACT WORD PROBLEMS
   WITHIN 10: turning a little STORY into a number sentence.

        3 ducks on the pond.  2 more swim over.   →   3 + 2 = 5
        5 ducks on the pond.  2 swim away.        →   5 − 2 = 3

   The one idea a five-year-old needs: a story that brings MORE together is an
   ADD; a story that TAKES SOME AWAY is a SUBTRACT. Once the child can hear
   which is which, the number sentence writes itself.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A KINDERGARTEN lab —
   CCSS K.OA.A.2 ("solve addition and subtraction word problems, and add and
   subtract within 10, e.g. by using objects or drawings to represent the
   problem"). The picture IS the "objects or drawings" the standard asks for.

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT  (the library's hard rule)
   ---------------------------------------------------------------------------
   The number-within-10 corner is crowded, so the seam is the STORY, not the
   sum:
     • AddLab / SubtractionLab — own the OPERATION on a number line (hops) and
       the fact-family/inverse. They are told a sentence; this lab MAKES one.
     • NumberBondLab — owns part–part–whole decomposition (a fan of splits).
     • TwoStepLab (grade 3) — owns MULTI-step story structure. This lab owns the
       SINGLE-step join/separate story and the one decision it turns on:
       does the story ADD or TAKE AWAY?

   So this lab owns exactly one thing no sibling owns: the STORY → SENTENCE
   translation, and the join-vs-separate DECISION that drives it. That decision
   — the operation — is the carmine math object. audit-storyproblem.mjs greps
   this source to keep the number-line/hops picture out.

   ---------------------------------------------------------------------------
   K-TIER RESTRAINT (a standing rule in this library)
   ---------------------------------------------------------------------------
   K labs must stay SIMPLE. So: ONE dial (the result, and only in the final
   challenge). Every quantity is drawn ONCE — the ducks ARE the count; there is
   no second bar or tally repeating it. Colour carries the maths: the ducks that
   were already there are calm BLUE; the ducks the story ADDS or REMOVES are
   CARMINE (the change is the thing that matters). No people are drawn — a duck
   is a hand-rolled shape a child can count. The cartoon lives INSIDE the
   countable object.

   EXACT INTEGER MATH within 10; separates never go below zero. The stamp is an
   integer identity, so it cannot fire falsely.

   The block between MODEL:START and MODEL:END is pure, React-free JavaScript;
   audit-storyproblem.mjs slices it out and evaluates it, so the audit tests the
   code that ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* An ACTION is what the story does. 'join' brings more together (ADD);
   'separate' takes some away (SUBTRACT). These are the only two, on purpose —
   the whole lesson is hearing which one a story is. */
const ACTIONS = ['join', 'separate'];
const opOf = (action) => (action === 'join' ? '+' : '−');

/* The result of a story, exactly. join adds; separate takes away and never
   goes below zero (you cannot have fewer than no ducks). */
function resultOf(action, start, change) {
  return action === 'join' ? start + change : start - change;
}

/* The number sentence a story produces, as its four parts. */
function sentenceOf(action, start, change) {
  return { start, op: opOf(action), change, result: resultOf(action, start, change) };
}

/* A story is well-formed for K if it stays within 10 and never goes negative. */
function storyValid(action, start, change) {
  if (start < 0 || change < 0 || start > 10 || change > 10) return false;
  const r = resultOf(action, start, change);
  return r >= 0 && r <= 10;
}

/* ---- the fixed lesson stories (preset, so no dials during teaching) ------
   Each is a clean within-10 scene. The join/separate mix is deliberate: the
   child meets an ADD story, then a TAKE-AWAY story, before being asked to
   tell them apart. */
const DEMO = {
  join: { action: 'join', start: 3, change: 2 },      // 3 + 2 = 5
  separate: { action: 'separate', start: 5, change: 2 }, // 5 − 2 = 3
  predict: { action: 'join', start: 4, change: 3 },   // 4 + 3 = 7
};

/* ---- the one dial: the RESULT, used only in the challenge --------------- */
const RESULT_DIAL = { key: 'result', label: 'how many now?', min: 0, max: 10, step: 1 };

/* ---- calibration: read a story, choose the action, set the result -------
   A construction goal: the grey story fixes an action + numbers; the child
   picks join/separate AND dials the result. CALIBRATED only when BOTH match —
   the operation is half the answer, which is the whole point of K.OA.A.2. */
function makeStory(prev, rnd) {
  const rand = rnd || Math.random;
  const pick = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  let s;
  do {
    const action = ACTIONS[pick(0, 1)];
    const start = pick(2, 8);
    // change chosen so the story stays valid within 10 and non-negative
    const change = action === 'join' ? pick(1, 10 - start) : pick(1, start);
    s = { action, start, change, result: resultOf(action, start, change) };
  } while (
    prev && s.action === prev.action && s.start === prev.start && s.change === prev.change
  );
  return s;
}
const isCalibrated = (story, chosenAction, chosenResult) =>
  chosenAction === story.action && chosenResult === story.result;

/* ---- the lesson ---------------------------------------------------------- */
const STEPS = [
  {
    title: 'A story on the pond',
    focus: 'join',
    demo: DEMO.join,
    body:
      'Three ducks are on the pond. Two more swim over to join them. Press play and watch — then ' +
      'count. When more come together, the group gets BIGGER.',
    q: 'Three ducks, and two more come. How many ducks now?',
    choices: ['5', '3', '1'],
    answer: 0,
    feedback:
      'Five ducks. Two swam over to join three, and now there are more than before. A story where ' +
      'more come together is an ADD: 3 + 2 = 5.',
  },
  {
    title: 'More come means ADD',
    focus: 'join-op',
    demo: DEMO.join,
    body:
      'When a story brings more together — more swim over, more are given, more arrive — you ADD. ' +
      'The plus sign is carmine here because choosing it is the real thinking; the counting is easy ' +
      'once you know it is an add.',
    q: 'Which sign matches “2 MORE swim over”?',
    choices: ['+  (add)', '−  (take away)', 'neither'],
    answer: 0,
    feedback:
      'More coming together is +. The story tells you the operation before you count: “more”, ' +
      '“swim over”, “arrive”, “altogether” all mean add.',
  },
  {
    title: 'Some swim away',
    focus: 'separate',
    demo: DEMO.separate,
    body:
      'Now a different story. Five ducks are on the pond, and two swim AWAY. Press play. When some ' +
      'leave, the group gets SMALLER — that is a take-away.',
    q: 'Five ducks, and two swim away. How many are left?',
    choices: ['3', '7', '5'],
    answer: 0,
    feedback:
      'Three ducks are left. Two leaving a group of five takes away, so it is a SUBTRACT: 5 − 2 = 3. ' +
      '“Swim away”, “eat some”, “give away”, “how many left” all mean take away.',
  },
  {
    title: 'Which story is it?',
    focus: 'decide',
    demo: DEMO.predict,
    body:
      'Here is the whole trick. Before you count, listen: does the story bring MORE together, or ' +
      'TAKE SOME AWAY? That choice — add or subtract — is the math. Four ducks, three more swim over.',
    q: 'Four ducks, three MORE swim over. Add or take away?',
    choices: ['Add — more come together', 'Take away — some leave', 'You cannot tell'],
    answer: 0,
    feedback:
      'Add. “More swim over” brings them together, so 4 + 3 = 7. You knew the operation from the ' +
      'story, before counting a single duck.',
  },
  {
    title: 'Write the sentence',
    focus: 'sentence',
    demo: DEMO.predict,
    body:
      'Every story becomes one number sentence: the start, the sign the story chose, how many ' +
      'changed, and the result. Four ducks, three more: 4 + 3 = 7. The sentence is just the story in ' +
      'number-words.',
    q: 'Which number sentence matches “4 ducks, 3 more swim over”?',
    choices: ['4 + 3 = 7', '4 − 3 = 1', '3 + 4 = 8'],
    answer: 0,
    feedback:
      '4 + 3 = 7. The story starts at 4, MORE come so the sign is +, three change, and seven is the ' +
      'result. Story to sentence, every time.',
  },
  {
    title: 'You tell the story',
    focus: 'calib',
    body:
      'Last one. Read the story, choose ADD or TAKE AWAY, and set the dial to how many there are now. ' +
      'Get BOTH right — the sign and the number — to earn the stamp. Press New story for another.',
    calib: true,
  },
];

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function StoryProblemLab() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [story, setStory] = useState(null);
  const [chosenAction, setChosenAction] = useState('join');
  const [result, setResult] = useState(0);
  const [play, setPlay] = useState(0); // 0..1 animation of the change set

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(null);

  const current = STEPS[step];
  const focus = current.focus;
  const scene = current.calib ? story : current.demo;

  sceneRef.current = { scene, play, focus, calib: !!current.calib, chosenAction };

  const calibrated = current.calib && story
    ? isCalibrated(story, chosenAction, result) : false;

  /* ---- the renderer: a pond, blue ducks (here) + carmine ducks (change) -- */
  const draw = useCallback(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const S = sceneRef.current;
    const BLUE = '#3a6ea5', CARM = '#c81e4f', INK = '#1c2b3a', SOFT = '#5b6b7b';
    const POND = '#dcebf4';

    // the pond
    ctx.fillStyle = POND;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.56, W * 0.42, H * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!S.scene) return;
    const { action, start, change } = S.scene;
    const result = resultOf(action, start, change);

    /* one hand-rolled duck — the cartoon lives INSIDE the countable object.
       alpha lets the change set fade in (join) or out (separate). */
    const duck = (cx, cy, color, alpha) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      // a little water ripple under each duck, so the pond reads as water
      ctx.strokeStyle = 'rgba(58,110,165,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 15, 22, 5, 0, 0, Math.PI * 2); ctx.stroke();
      // body
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy, 21, 15, 0, 0, Math.PI * 2); ctx.fill();
      // head
      ctx.beginPath(); ctx.arc(cx + 16, cy - 13, 11, 0, Math.PI * 2); ctx.fill();
      // beak
      ctx.fillStyle = '#e6a531';
      ctx.beginPath();
      ctx.moveTo(cx + 25, cy - 15); ctx.lineTo(cx + 36, cy - 12); ctx.lineTo(cx + 25, cy - 8);
      ctx.closePath(); ctx.fill();
      // eye
      ctx.fillStyle = '#1c2b3a'; ctx.beginPath(); ctx.arc(cx + 18, cy - 15, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + 18.8, cy - 15.8, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    // lay ducks out in a gentle two-row grid inside the pond
    const total = start + change;
    const cols = Math.min(5, Math.max(3, total));
    const gapX = (W * 0.62) / cols;
    const x0 = W / 2 - (gapX * (cols - 1)) / 2;
    const rowY = [H * 0.46, H * 0.66];
    const pos = (i) => {
      const r = Math.floor(i / cols), c = i % cols;
      return [x0 + c * gapX, rowY[r] + (r === 1 ? 0 : 0)];
    };

    // BLUE = the ducks that were already there (the "start")
    for (let i = 0; i < start; i++) { const [px, py] = pos(i); duck(px, py, BLUE, 1); }

    // CARMINE = the change set. join fades IN with play; separate fades OUT.
    const changeAlpha = action === 'join' ? S.play : 1 - S.play;
    if (action === 'join') {
      for (let i = 0; i < change; i++) { const [px, py] = pos(start + i); duck(px, py, CARM, changeAlpha); }
    } else {
      // separate: the last `change` of the CURRENT ducks are the ones leaving
      for (let i = 0; i < change; i++) { const [px, py] = pos(start - change + i); duck(px, py, CARM, changeAlpha); }
    }

    // the story's number line of meaning: start OP change (= result once played)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 26px ui-monospace, Menlo, monospace';
    const op = opOf(action);
    const shown = S.play >= 1 || !S.calib ? `${start} ${op} ${change} = ${result}` : `${start} ${op} ${change} = ?`;
    // in the challenge, keep the result hidden until the child commits
    const label = S.calib ? `${start} ${op === '+' ? '+' : '−'} ${change}` : shown;
    ctx.fillStyle = INK;
    // start (blue) and change (carmine) coloured to match the ducks
    const y = H * 0.9;
    ctx.font = '700 24px ui-monospace, Menlo, monospace';
    const partStart = `${start}`, partOp = ` ${op} `, partChange = `${change}`;
    const wS = ctx.measureText(partStart).width, wO = ctx.measureText(partOp).width, wC = ctx.measureText(partChange).width;
    // the RESULT stays hidden until the story is PLAYED (teaching) or the child
    // commits (challenge) — showing "= 5" before the predict-then-check would
    // hand over the answer the question is asking for.
    const showResult = !S.calib && S.play >= 1;
    const tail = showResult ? ` = ${result}` : ' = ?';
    const wT = ctx.measureText(tail).width;
    const totalW = wS + wO + wC + wT;
    let x = W / 2 - totalW / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = BLUE; ctx.fillText(partStart, x, y); x += wS;
    ctx.fillStyle = CARM; ctx.fillText(partOp, x, y); x += wO;      // the OPERATION is carmine — the decision
    ctx.fillStyle = CARM; ctx.fillText(partChange, x, y); x += wC;
    if (tail) { ctx.fillStyle = INK; ctx.fillText(tail, x, y); }
    void label;
  }, []);

  useEffect(() => { draw(); }, [step, story, result, chosenAction, play, focus, draw]);
  useEffect(() => {
    const st = stageRef.current;
    if (!st || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(st);
    return () => ro.disconnect();
  }, [draw]);

  /* a fresh story on entering the challenge */
  useEffect(() => {
    if (current.calib && !story) { const s = makeStory(null); setStory(s); setChosenAction('join'); setResult(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* reset the play animation whenever the scene changes */
  useEffect(() => { setPlay(current.calib ? 1 : 0); }, [step]); // eslint-disable-line

  const playStory = () => {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPlay(1); return; }
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1200);
      setPlay(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const choose = (i) => { if (answers[step] == null) setAnswers((p) => ({ ...p, [step]: i })); };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));
  const answered = answers[step] != null;
  const canNext = step < STEPS.length - 1 && (!current.q || answered);

  const spoken = (() => {
    if (!scene) return 'A pond of ducks.';
    const { action, start, change } = scene;
    return `${start} ducks, and ${change} ${action === 'join' ? 'more swim over' : 'swim away'}. ` +
      (current.calib ? 'Choose add or take away, and how many now.' : `That is ${start} ${opOf(action)} ${change} = ${resultOf(action, start, change)}.`);
  })();

  return (
    <div className="splab">
      <header className="head">
        <h1>Story Problems on the Pond</h1>
        <p className="lede">
          A little story becomes a number sentence. When more ducks <em>swim over</em>, you{' '}
          <strong>add</strong>; when some <em>swim away</em>, you <strong>take away</strong>. The
          hardest part isn’t counting — it’s hearing which one the story is.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`A pond of ducks. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          {!current.calib && (
            <div className="toolbar">
              <button type="button" className="btn" onClick={playStory}>▶ Play the story</button>
            </div>
          )}
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

          {current.q && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
                  const chosen = answers[step];
                  let cls = 'choice';
                  if (chosen != null) {
                    if (i === current.answer) cls += ' correct';
                    else if (i === chosen) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button type="button" key={i} className={cls} onClick={() => choose(i)} disabled={chosen != null}>
                      <span className="mark" aria-hidden="true">
                        {chosen != null && i === current.answer ? '✓' : chosen != null && i === chosen ? '✕' : ''}
                      </span>{ch}
                    </button>
                  );
                })}
              </div>
              {answered && <p className="feedback">{current.feedback}</p>}
            </div>
          )}

          {current.calib && story && (
            <div className="calib">
              <p className="calib-goal">
                <span className="mono">{story.start}</span> ducks, and{' '}
                <span className="mono">{story.change}</span>{' '}
                {story.action === 'join' ? 'more swim over' : 'swim away'}.
              </p>
              <div className="opchoice" role="group" aria-label="Add or take away">
                <button type="button"
                  className={'opbtn' + (chosenAction === 'join' ? ' on' : '')}
                  onClick={() => setChosenAction('join')}>+ add</button>
                <button type="button"
                  className={'opbtn' + (chosenAction === 'separate' ? ' on' : '')}
                  onClick={() => setChosenAction('separate')}>− take away</button>
              </div>
              <label className="dial">
                <span className="drole">{RESULT_DIAL.label}</span>
                <input type="range" min={RESULT_DIAL.min} max={RESULT_DIAL.max} step={RESULT_DIAL.step}
                  value={result} aria-label="how many now" onChange={(e) => setResult(parseInt(e.target.value, 10))} />
                <output className="dv">{result}</output>
              </label>
              <div className="verdict">
                <span className="mono">
                  you said {story.start} {opOf(chosenAction)} {story.change} = {result}
                </span>
                {calibrated
                  ? <span className="stamp">CALIBRATED</span>
                  : <span className="mono hint">
                      {chosenAction !== story.action ? 'check the sign first' : 'set how many now'}
                    </span>}
              </div>
              <button type="button" className="btn ghost"
                onClick={() => { const s = makeStory(story); setStory(s); setChosenAction('join'); setResult(0); }}>
                New story
              </button>
            </div>
          )}

          <div className="nav">
            <button type="button" className="btn ghost" onClick={goBack} disabled={step === 0}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext} disabled={!canNext}>
                {current.q && !answered ? 'Answer to continue' : 'Next →'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => {
                setStep(0); setAnswers({}); setStory(null); setResult(0); setChosenAction('join');
              }}>Restart lab</button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">more come → +  ·  some leave → −</span> &nbsp;·&nbsp;
        a story becomes a number sentence, drawn live on a dependency-free canvas.
      </footer>

      <style jsx>{`
        .splab{
          --page:#eff1ee;--paper:#fbfbf8;--ink:#1c2b3a;--ink-soft:#5b6b7b;
          --curve:#c81e4f;--quad:#c7d8e4;--ok:#1f8a5b;--blue:#3a6ea5;
          --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --serif:'Iowan Old Style',Palatino,Georgia,serif;
          background:var(--page);color:var(--ink);
          font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;
          padding:28px 18px 44px;border-radius:16px;max-width:1120px;margin:0 auto;
        }
        .mono{font-family:var(--mono);}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        .eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 6px;}
        .eyebrow.small{margin:0 0 4px;}
        h1{font-family:var(--serif);font-weight:600;font-size:clamp(26px,4vw,34px);margin:0 0 6px;}
        .lede{color:var(--ink-soft);margin:0 0 22px;max-width:64ch;}
        .bench{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
        @media (max-width:920px){.bench{grid-template-columns:1fr;}}
        .panel{background:#fff;border:1px solid rgba(28,43,58,.15);border-radius:12px;box-shadow:0 1px 2px rgba(28,43,58,.05);}
        .stage-panel{padding:14px;}
        .stage{position:relative;width:100%;aspect-ratio:16/12;border:1px solid var(--quad);border-radius:8px;overflow:hidden;
          background:radial-gradient(120% 120% at 30% 18%,#fdfefe 0%,#eef6fb 60%,#e3eef5 100%);}
        .stage canvas{display:block;width:100%;height:100%;}
        .toolbar{margin:12px 4px 2px;display:flex;gap:9px;flex-wrap:wrap;}
        .btn{font:600 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:8px;cursor:pointer;
          border:1px solid var(--ink);background:var(--ink);color:#fff;transition:filter .15s;}
        .btn.ghost{background:transparent;color:var(--ink);}
        .btn:disabled{border-color:#596979;background:#596979;color:#fff;cursor:not-allowed;}
        .btn.ghost:disabled{border-color:#83909d;background:#f0f2f3;color:#596979;}
        .btn:not(:disabled):hover{filter:brightness(1.08);}
        .tutor{padding:18px 20px 20px;}
        .progress{display:flex;gap:6px;margin-bottom:14px;}
        .pip{height:6px;flex:1;border-radius:3px;background:rgba(28,43,58,.14);}
        .pip.done{background:rgba(200,30,79,.45);}
        .pip.cur{background:var(--curve);}
        h2{font-family:var(--serif);font-weight:600;font-size:21px;margin:0 0 10px;padding-bottom:9px;border-bottom:3px double rgba(200,30,79,.45);}
        .body{margin:0 0 16px;font-size:15px;}
        .quiz{margin-top:6px;}
        .q{font-size:15px;font-weight:600;margin:0 0 10px;}
        .choices{display:grid;gap:8px;}
        .choice{text-align:left;font:15px/1.4 system-ui,sans-serif;padding:12px 12px 12px 32px;
          border:1px solid rgba(28,43,58,.2);border-radius:8px;background:var(--paper);color:var(--ink);
          cursor:pointer;position:relative;transition:border-color .15s,background .15s;}
        .choice:not(:disabled):hover{border-color:var(--ink);}
        .choice .mark{position:absolute;left:11px;font-weight:700;}
        .choice.correct{border-color:var(--ok);background:rgba(31,138,91,.08);}
        .choice.correct .mark{color:var(--ok);}
        .choice.wrong{border-color:var(--ink-soft);background:rgba(91,107,123,.08);}
        .choice.wrong .mark{color:var(--ink-soft);}
        .choice.dim{border-color:#b7c0c8;background:#f0f2f3;color:#596979;}
        .choice:disabled{cursor:default;}
        .feedback{margin:12px 0 0;font-size:13.5px;line-height:1.55;background:rgba(200,30,79,.05);
          border-left:3px solid var(--curve);padding:11px 13px;border-radius:0 6px 6px 0;}
        .calib{margin-top:6px;display:grid;gap:12px;}
        .calib-goal{margin:0;font-size:16px;background:rgba(58,110,165,.08);border-radius:8px;padding:12px 14px;}
        .calib-goal .mono{color:var(--blue);font-weight:700;}
        .opchoice{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .opbtn{font:700 15px/1 system-ui,sans-serif;padding:12px;border-radius:8px;cursor:pointer;
          border:2px solid rgba(28,43,58,.2);background:var(--paper);color:var(--ink);transition:all .15s;}
        .opbtn.on{border-color:var(--curve);background:rgba(200,30,79,.08);color:var(--curve);}
        .dial{display:grid;grid-template-columns:1fr 40px;grid-template-rows:auto auto;align-items:center;gap:2px 10px;}
        .drole{grid-column:1/3;font-size:13px;color:var(--ink-soft);}
        .dial input[type=range]{grid-column:1;width:100%;accent-color:var(--curve);cursor:pointer;}
        .dv{grid-column:2;font-family:var(--mono);text-align:right;font-size:18px;font-weight:700;}
        .verdict{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px;flex-wrap:wrap;}
        .hint{color:var(--ink-soft);font-size:12.5px;}
        .stamp{font:700 12px/1 var(--mono);letter-spacing:.16em;color:var(--ok);border:2px solid var(--ok);border-radius:6px;padding:5px 9px;transform:rotate(-3deg);}
        .nav{margin-top:20px;display:flex;justify-content:space-between;gap:10px;}
        .foot{margin-top:24px;font-size:12.5px;color:var(--ink-soft);}
        :global(.splab) :focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:4px;}
        @media (prefers-reduced-motion:reduce){.btn,.choice,.opbtn{transition:none;}}
      `}</style>
    </div>
  );
}
