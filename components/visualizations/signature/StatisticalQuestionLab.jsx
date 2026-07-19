'use client';

/* ============================================================================
   StatisticalQuestionLab — an interactive "bench" for WHAT MAKES A QUESTION
   STATISTICAL:

        a statistical question is one that ANTICIPATES VARIABILITY —
        you ask many, and their answers DISAGREE.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 6 lab —
   CCSS 6.SP.A.1 ("recognize a statistical question as one that anticipates
   variability in the data related to the question and accounts for it in the
   answers").

   House style: the interactive-math-bench standard — a clean stage, ONE carmine
   accent for the object in focus, dials that unlock one per lesson step,
   predict-then-check questions gated on ANSWERED (not correct), and a
   calibration challenge with a live meter and a CALIBRATED stamp that cannot
   fire falsely.

   ---------------------------------------------------------------------------
   THE SIGNATURE CENTERPIECE — "THE ANSWER SLOTS."
   ---------------------------------------------------------------------------
   A question card, and beneath it a row of the people (or dogs) you are asking,
   each holding one empty slot.  Press ASK and every slot fills with that
   respondent's own answer.  Then the lab does the only thing that matters:
   it counts the DIFFERENT answers.

        one different answer   →  the question is not statistical
        many different answers →  it is

   That is the whole test, and it is a property of the QUESTION, not of the
   data — which is why the lab lets you call it BEFORE you press ASK.

   ---------------------------------------------------------------------------
   HOW THIS LAB STAYS DISTINCT FROM ITS SIBLINGS  (the library's hard rule)
   ---------------------------------------------------------------------------
   Statistics is the largest family in this library — roughly twenty labs — so
   this one is defined as much by what it REFUSES as by what it draws.

     • Every one of those labs starts with the data already in hand.
       SamplingLab's own header says it: "nine statistics labs describe data you
       HAVE."  This lab lives BEFORE the data exists.  Its object is the
       QUESTION, and no sibling owns a question as an object.
     • DataLab owns the DOT PLOT and 6.SP.A.2 (a set of data has a centre, a
       spread and a shape).  VarianceLab owns spread as the average area of the
       deviation squares; StandardDeviationLab and TwoDistributionsLab own
       spread as a number and as a comparison.  So VARIABILITY-AS-A-PICTURE is
       thoroughly owned, and this lab must not draw it: there is NO number line
       here and NO dot plot.  The answers sit in a ROW, in respondent order — a
       SET of answers, never a distribution.  Sorting them onto an axis would be
       DataLab's picture, and this lab refuses it.  audit-statisticalquestion.mjs
       greps this source to keep that refusal true.
     • SamplingLab owns the population you cannot census and the sample that
       varies (7.SP.A.1–2).  Here every respondent is asked — there is no
       sampling, no inference, no error.

   ---------------------------------------------------------------------------
   THE IDEA, EXACTLY — AND THE TRAP THAT IS THE POINT
   ---------------------------------------------------------------------------
   A question has two parts, and the lab gives one dial to each:

        WHO you ask   (the subject)      →  one, or many?
        WHAT you ask  (the attribute)    →  does it vary among them?

   The naive rule a child reaches for is "ask lots of people ⇒ statistical."
   That rule is WRONG, and the legs attribute exists to break it:

        "How many legs do the dogs in the park have?"

   asks six dogs — plural, a real group — and collects six answers that are all
   4.  One different answer.  Not statistical.  A plural subject is NECESSARY
   but NOT SUFFICIENT; the attribute must vary too.  Both dials must be right,
   which is exactly why there are two of them:

        many subjects  AND  a varying attribute   ⟺   statistical

   ONE HONEST SUBTLETY, for whoever edits this next.  The two conditions are not
   logically independent: one respondent cannot possibly give two different
   answers, so

        the answers vary   ⇒   you asked many

   which means the SECOND condition alone already decides the verdict, and
   `asksMany` is mathematically redundant in `isStatistical`.  It is kept for a
   pedagogical reason, not a mathematical one: "I asked lots of people" is the
   belief students actually arrive with, so the lab names it, tests it, and
   breaks it.  The audit pins this implication as a theorem — and it is why a
   mutation that deletes the `asksMany` conjunct is deliberately NOT in the
   mutant list: it is an EQUIVALENT program, and demanding the suite catch it
   would be demanding it detect a difference that does not exist.

   All arithmetic here is exact integer counting (how many respondents, how many
   DISTINCT answers) — there is nothing to round and no float can appear.

   ---------------------------------------------------------------------------
   Delivered the MAIS way: ZERO dependencies — pure <canvas> + React hooks,
   styles scoped with styled-jsx.

   DROP-IN USAGE (Next.js):
     1. Save this file anywhere, e.g. app/labs/StatisticalQuestionLab.jsx
     2. Import and render it:
          import StatisticalQuestionLab from './StatisticalQuestionLab';
          export default function Page() { return <StatisticalQuestionLab />; }

   The block between MODEL:START and MODEL:END is pure, React-free, pixel-free
   JavaScript.  audit-statisticalquestion.mjs SLICES THAT BLOCK OUT OF THIS FILE
   and evaluates it, so the audit tests the code that actually ships.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ==== MODEL:START — pure math. No React, no pixels, no DOM. =============== */

/* ---- WHO you ask. Every respondent's answers are fixed integers: nothing is
   random, so the lab shows the same world every time and the audit can check
   the picture against the claim. ------------------------------------------ */
const SUBJECTS = [
  {
    key: 'me', label: 'me', short: 'me', kind: 'person', n: 1,
    values: { tall: [134], old: [11], legs: [2] },
  },
  {
    key: 'class', label: 'the students in my class', short: 'my class', kind: 'person', n: 9,
    values: {
      tall: [128, 135, 131, 142, 129, 138, 133, 140, 136],
      old: [11, 12, 11, 12, 11, 11, 12, 11, 12],
      legs: [2, 2, 2, 2, 2, 2, 2, 2, 2],
    },
  },
  {
    key: 'dogs', label: 'the dogs in the park', short: 'the dogs', kind: 'dog', n: 6,
    values: {
      tall: [30, 45, 38, 52, 41, 35],
      old: [3, 5, 2, 7, 4, 6],
      legs: [4, 4, 4, 4, 4, 4],
    },
  },
];

/* ---- WHAT you ask. `legs` is the whole point of the lab: a real attribute
   that genuinely does NOT vary within either group. ----------------------- */
const ATTRIBUTES = [
  { key: 'tall', label: 'tall', unit: 'cm', noun: 'height' },
  { key: 'old', label: 'old', unit: 'years', noun: 'age' },
  { key: 'legs', label: 'many legs', unit: 'legs', noun: 'number of legs' },
];

/* The question text for every (subject, attribute) pair, written out rather
   than assembled, so the grammar is always right and the audit can read it. */
const QUESTION_TEXT = {
  me: { tall: 'How tall am I?', old: 'How old am I?', legs: 'How many legs do I have?' },
  class: {
    tall: 'How tall are the students in my class?',
    old: 'How old are the students in my class?',
    legs: 'How many legs do the students in my class have?',
  },
  dogs: {
    tall: 'How tall are the dogs in the park?',
    old: 'How old are the dogs in the park?',
    legs: 'How many legs do the dogs in the park have?',
  },
};

const subjectAt = (i) => SUBJECTS[i];
const attributeAt = (i) => ATTRIBUTES[i];

/* ---- the model ---------------------------------------------------------- */
const answersOf = (si, ai) => subjectAt(si).values[attributeAt(ai).key].slice();
const questionText = (si, ai) => QUESTION_TEXT[subjectAt(si).key][attributeAt(ai).key];

/* how many DIFFERENT answers come back — the lab's entire test, as exact
   integer counting over a set */
const distinctCount = (si, ai) => new Set(answersOf(si, ai)).size;

/* the two conditions, kept SEPARATE because the lesson turns on the fact that
   the first one alone is not enough */
const asksMany = (si) => subjectAt(si).n > 1;
const attributeVaries = (si, ai) => distinctCount(si, ai) > 1;

/* THE RULE. Both, or it is not statistical. */
const isStatistical = (si, ai) => asksMany(si) && attributeVaries(si, ai);

/* why it failed — used for the verdict line, so the picture always explains
   itself rather than just judging */
function verdictReason(si, ai) {
  const many = asksMany(si);
  const varies = attributeVaries(si, ai);
  if (many && varies) return 'many answers, and they disagree';
  if (!many && !varies) return 'you only ask one — one answer';
  if (!many) return 'you only ask one — one answer';
  return 'you ask many, but every answer is the same';
}

/* ---- the lesson --------------------------------------------------------- */
const PARAMS = [
  { key: 'subject', label: 'who', min: 0, max: 2, step: 1, unlock: 1, role: 'who you ask' },
  { key: 'attribute', label: 'what', min: 0, max: 2, step: 1, unlock: 2, role: 'what you ask' },
];
const START = { subject: 0, attribute: 1 }; // "How old am I?" — one answer, the simplest case

const STEPS = [
  {
    title: 'A question, and who you ask',
    focus: 'meet',
    body:
      'Every question has someone to ask. This one asks exactly one person — me. Press ASK and my ' +
      'answer drops into the slot. One person, one slot, one answer. Nothing to argue about.',
    q: 'How many answers can “How old am I?” have?',
    choices: ['Exactly one', 'As many as you like', 'None — you cannot answer it'],
    answer: 0,
    feedback:
      'One. I have exactly one age, so the question has exactly one answer, and asking again will not ' +
      'change it. Statisticians call this a NON-statistical question — not because it is a bad ' +
      'question, but because there is nothing to describe. You do not need a graph to report one number.',
  },
  {
    title: 'Ask more people',
    focus: 'who',
    body:
      'The “who” dial is live. Turn it to my class and ask again. Now nine people each drop an answer ' +
      'into their own slot — and the slots do not match. Count the DIFFERENT answers underneath.',
    q: 'You ask “How old are the students in my class?” What comes back?',
    choices: [
      'Many answers, and they disagree',
      'One answer — the class has one age',
      'Nine answers, all identical',
    ],
    answer: 0,
    feedback:
      'Nine answers, and they disagree — some are 11, some are 12. THAT is a statistical question: it ' +
      'anticipates variability. You knew the answers would differ before you asked anyone, just by ' +
      'reading the question, and that expectation is the whole definition.',
  },
  {
    title: 'The trap',
    focus: 'what',
    body:
      'The “what” dial is live. Keep asking the whole class — but ask about legs instead of age. Still ' +
      'nine people. Still nine slots. Press ASK and watch what comes back.',
    q: '“How many legs do the students in my class have?” asks nine people. Is it statistical?',
    choices: [
      'No — nine answers come back, but every one of them is 2',
      'Yes — you asked nine people, so it must be',
      'Yes — legs are data, and data is statistics',
    ],
    answer: 0,
    feedback:
      'No. This is the trap, and almost everyone falls in it: “I asked lots of people” is NOT what ' +
      'makes a question statistical. Nine answers came back and every single one is 2 — ONE different ' +
      'answer. Nothing varies, so there is nothing to describe. Asking many is necessary; it is not ' +
      'enough.',
  },
  {
    title: 'Both dials, or neither',
    focus: 'rule',
    body:
      'So the question has two parts and both must be right. WHO you ask must be many. WHAT you ask ' +
      'must be something that varies among them. Turn both dials and watch the verdict: only four of ' +
      'the nine questions here are statistical.',
    q: 'Which pair of conditions makes a question statistical?',
    choices: [
      'You ask many AND the thing you ask about varies among them',
      'You ask many — that is enough on its own',
      'You ask about numbers rather than words',
    ],
    answer: 0,
    feedback:
      'Both, together. Drop either one and it fails: ask one person about a varying thing (“How tall am ' +
      'I?”) and you get one answer; ask many people about a fixed thing (“How many legs…?”) and you get ' +
      'one answer nine times. Only many × varying produces answers worth a graph.',
  },
  {
    title: 'Call it before you ask',
    focus: 'predict',
    body:
      'Here is why this matters. You never had to collect anything. Every verdict on this bench can be ' +
      'read off the QUESTION itself — you know a class has different ages and the same number of legs ' +
      'before anyone answers. Set a question, decide, then press ASK to check yourself.',
    q: 'Without asking: “How tall are the dogs in the park?”',
    choices: [
      'Statistical — dogs come in different sizes, so the answers will disagree',
      'Not statistical — you have not collected the data yet',
      'Not statistical — a park is not a big enough group',
    ],
    answer: 0,
    feedback:
      'Statistical, and you knew it without meeting a single dog. That is what “anticipates ' +
      'variability” means: the question tells you the answers will disagree. Collecting the data only ' +
      'confirms what the question already promised.',
  },
  {
    title: 'Build the question',
    focus: 'calib',
    body:
      'Final challenge. You are given a verdict to hit — including the hard one: a question that asks ' +
      'MANY and is still not statistical. Turn the two dials until your question matches, and the ' +
      'meter reads CALIBRATED. Press New goal for another.',
    calib: true,
  },
];

/* ---- calibration: build a question to order -----------------------------
   The goals are the three genuinely different reasoning paths, not three
   flavours of the same one. The third is the trap from step 2, run backwards:
   the student must deliberately construct a plural question that fails. ---- */
const GOALS = [
  {
    key: 'stat',
    label: 'a STATISTICAL question',
    hint: 'ask many, about something that varies',
    test: (si, ai) => isStatistical(si, ai),
    conds: (si, ai) => [asksMany(si), attributeVaries(si, ai)],
    condLabels: ['you ask many', 'the answers disagree'],
  },
  {
    key: 'one',
    label: 'a question that is NOT statistical because you ask only ONE',
    hint: 'one respondent — the attribute does not matter',
    test: (si, ai) => !asksMany(si),
    conds: (si, ai) => [!asksMany(si), true],
    condLabels: ['you ask only one', '—'],
  },
  {
    key: 'trap',
    label: 'a question that asks MANY and is STILL not statistical',
    hint: 'a whole group, but ask about something none of them differ on',
    test: (si, ai) => asksMany(si) && !attributeVaries(si, ai),
    conds: (si, ai) => [asksMany(si), !attributeVaries(si, ai)],
    condLabels: ['you ask many', 'every answer is the same'],
  },
];
const goalOf = (key) => GOALS.find((g) => g.key === key);

/* The meter counts the goal's own conditions met — so it can only read 100%
   when every condition holds, which is exactly when the goal is satisfied. */
function matchPercent(si, ai, goalKey) {
  const g = goalOf(goalKey);
  const cs = g.conds(si, ai);
  return Math.round((100 * cs.filter(Boolean).length) / cs.length);
}
const isCalibrated = (si, ai, goalKey) => goalOf(goalKey).test(si, ai);

function makeGoal(prev, rnd) {
  const rand = rnd || Math.random;
  let g;
  do { g = GOALS[Math.floor(rand() * GOALS.length)]; } while (prev && g.key === prev);
  return g.key;
}

/* Every goal must be reachable, or the challenge could ask the impossible. */
function goalSolutions(goalKey) {
  const out = [];
  for (let s = 0; s < SUBJECTS.length; s++) {
    for (let a = 0; a < ATTRIBUTES.length; a++) {
      if (goalOf(goalKey).test(s, a)) out.push([s, a]);
    }
  }
  return out;
}

/* ==== MODEL:END ========================================================== */

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function StatisticalQuestionLab() {
  const [subject, setSubject] = useState(START.subject);
  const [attribute, setAttribute] = useState(START.attribute);
  const [asked, setAsked] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [goal, setGoal] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const focus = current.focus;

  const S = subjectAt(subject);
  const A = attributeAt(attribute);
  const vals = answersOf(subject, attribute);
  const distinct = distinctCount(subject, attribute);
  const stat = isStatistical(subject, attribute);

  sceneRef.current = { subject, attribute, asked, focus };

  const pct = goal ? matchPercent(subject, attribute, goal) : 0;
  const calibrated = goal ? isCalibrated(subject, attribute, goal) : false;

  /* asking is a fresh act for every new question */
  useEffect(() => { setAsked(false); }, [subject, attribute]);

  useEffect(() => {
    if (current.calib && !goal) setGoal(makeGoal(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* per-step setup: seed the question each step's copy actually talks about */
  useEffect(() => {
    if (focus === 'meet') { setSubject(0); setAttribute(1); }
    else if (focus === 'who') { setSubject(1); setAttribute(1); }
    else if (focus === 'what') { setSubject(1); setAttribute(2); }
    else if (focus === 'predict') { setSubject(2); setAttribute(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- render ------------------------------------------------------------ */
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

    const Sc = sceneRef.current;              // the snapshot — never the closure
    const sub = subjectAt(Sc.subject);
    const att = attributeAt(Sc.attribute);
    const v = answersOf(Sc.subject, Sc.attribute);
    const nDistinct = distinctCount(Sc.subject, Sc.attribute);
    const isStat = isStatistical(Sc.subject, Sc.attribute);

    const CARM = '#C81E4F';
    const INK = '#1C2B3A';
    const SOFT = '#5B6B7B';
    const BLUE = '#3A546E';
    const OK = '#1F8A5B';

    /* quadrille paper */
    ctx.save();
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    /* ---- the respondents, in a ROW, in respondent order ------------------
       Deliberately NOT on a number line and NOT sorted: this is a SET of
       answers, not a distribution. The dot plot belongs to DataLab. */
    const n = sub.n;
    const top = 74;
    const maxW = W - 40;
    // Size the row to FIT, never to a fixed minimum: nine respondents at a hard
    // 34px floor overflow a phone-width canvas and the far slots fall off the
    // edge. Solve for the width the row can actually afford, then clamp.
    const gap = n > 6 ? 5 : 8;
    const slotW = Math.max(18, Math.min(64, Math.floor((maxW - (n - 1) * gap) / Math.max(n, 1))));
    const rowW = n * slotW + (n - 1) * gap;
    const x0 = (W - rowW) / 2;
    const figY = top + 26;
    const slotY = figY + 46;

    for (let i = 0; i < n; i++) {
      const cx = x0 + i * (slotW + gap) + slotW / 2;

      // the respondent: a plain figure, person or dog
      ctx.save();
      ctx.fillStyle = 'rgba(58,84,110,0.85)';
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.lineWidth = 1.2;
      if (sub.kind === 'person') {
        ctx.beginPath(); ctx.arc(cx, figY, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 8, figY + 24); ctx.quadraticCurveTo(cx, figY + 6, cx + 8, figY + 24);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.ellipse(cx, figY + 12, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 11, figY + 4, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(58,84,110,0.85)'; ctx.lineWidth = 2;
        for (const lx of [-7, -2, 4, 9]) {
          ctx.beginPath(); ctx.moveTo(cx + lx, figY + 17); ctx.lineTo(cx + lx, figY + 24); ctx.stroke();
        }
      }
      ctx.restore();

      // the answer slot
      const filled = Sc.asked;
      ctx.save();
      rr(cx - slotW / 2 + 2, slotY, slotW - 4, 30, 6);
      ctx.fillStyle = filled ? (isStat ? 'rgba(200,30,79,0.10)' : 'rgba(58,84,110,0.10)') : 'rgba(255,255,255,0.75)';
      ctx.fill();
      ctx.setLineDash(filled ? [] : [4, 4]);
      ctx.strokeStyle = filled ? (isStat ? CARM : BLUE) : 'rgba(91,107,123,0.6)';
      ctx.lineWidth = filled ? 1.8 : 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (filled) {
        ctx.fillStyle = isStat ? CARM : BLUE;
        ctx.font = '700 14px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v[i]), cx, slotY + 16);
      }
      ctx.restore();
    }

    // what unit the slots hold
    ctx.save();
    ctx.fillStyle = SOFT;
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${sub.n} asked · answers in ${att.unit}`, W / 2, slotY + 38);
    ctx.restore();

    /* ---- the tally: how many DIFFERENT answers — the whole test ---------- */
    const tallyY = slotY + 74;
    if (Sc.asked) {
      const uniq = [...new Set(v)];
      ctx.save();
      ctx.fillStyle = INK;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('different answers', W / 2, tallyY);
      ctx.restore();

      // the distinct answers as chips — still a SET, still unsorted onto no axis
      const shown = uniq.slice(0, 9);
      const cg = shown.length > 6 ? 5 : 7;
      const cw = Math.max(22, Math.min(44, Math.floor((W - 40 - (shown.length - 1) * cg) / shown.length)));
      const tw = shown.length * cw + (shown.length - 1) * cg;
      let cx0 = (W - tw) / 2;
      for (const u of shown) {
        ctx.save();
        rr(cx0, tallyY + 20, cw, 26, 6);
        ctx.fillStyle = isStat ? 'rgba(200,30,79,0.12)' : 'rgba(58,84,110,0.12)';
        ctx.fill();
        ctx.strokeStyle = isStat ? CARM : BLUE;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = isStat ? CARM : BLUE;
        ctx.font = '700 13px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(u), cx0 + cw / 2, tallyY + 33);
        ctx.restore();
        cx0 += cw + cg;
      }
      if (uniq.length > shown.length) {
        ctx.save();
        ctx.fillStyle = SOFT;
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${uniq.length - shown.length}`, cx0 + 2, tallyY + 33);
        ctx.restore();
      }

      // the count, big — and the verdict
      const vy = tallyY + 60;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isStat ? CARM : BLUE;
      ctx.font = '700 26px "Iowan Old Style", Palatino, Georgia, serif';
      ctx.fillText(String(nDistinct), W / 2, vy);
      ctx.restore();

      const label = isStat ? 'STATISTICAL' : 'NOT STATISTICAL';
      const why = verdictReason(Sc.subject, Sc.attribute);
      ctx.save();
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      const lw = ctx.measureText(label).width;
      rr(W / 2 - lw / 2 - 10, vy + 38, lw + 20, 24, 6);
      ctx.fillStyle = isStat ? 'rgba(200,30,79,0.10)' : 'rgba(91,107,123,0.10)';
      ctx.fill();
      ctx.strokeStyle = isStat ? CARM : SOFT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = isStat ? CARM : SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, W / 2, vy + 50);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = SOFT;
      ctx.font = '12.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(why, W / 2, vy + 70);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = SOFT;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('press ASK to collect the answers —', W / 2, tallyY + 4);
      ctx.fillText('but you can already call it from the question alone', W / 2, tallyY + 22);
      ctx.restore();
    }

    /* the question card sits at the top: carmine, the one accent = the OBJECT */
    ctx.save();
    const qt = questionText(Sc.subject, Sc.attribute);
    // Shrink the question to FIT the stage. The card was sized to the canvas but
    // the text was drawn at a fixed 15px and centred, so the longest question
    // ("How many legs do the students in my class have?") spilled off BOTH edges
    // at phone width and read as "...many legs do the students in my clas".
    let qSize = 15;
    ctx.font = `600 ${qSize}px "Iowan Old Style", Palatino, Georgia, serif`;
    while (ctx.measureText(qt).width > W - 44 && qSize > 9) {
      qSize -= 0.5;
      ctx.font = `600 ${qSize}px "Iowan Old Style", Palatino, Georgia, serif`;
    }
    const qw = ctx.measureText(qt).width;
    const cardW = Math.min(W - 12, qw + 28);
    rr((W - cardW) / 2, 16, cardW, 40, 8);
    ctx.fillStyle = 'rgba(200,30,79,0.06)';
    ctx.fill();
    ctx.strokeStyle = CARM;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = CARM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(qt, W / 2, 37);
    ctx.restore();
    void OK;
  }, []);

  useEffect(() => { draw(); }, [subject, attribute, asked, step, focus, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'subject') setSubject(v);
    else setAttribute(v);
  };
  const dialValue = (key) => (key === 'subject' ? subject : attribute);
  const dialText = (key) =>
    key === 'subject' ? subjectAt(subject).short : attributeAt(attribute).label;

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));
  const goBack = () => setStep((n) => Math.max(0, n - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = asked
    ? `${questionText(subject, attribute)} ${S.n} asked, ${distinct} different ${
        distinct === 1 ? 'answer' : 'answers'
      }. ${stat ? 'Statistical' : 'Not statistical'}: ${verdictReason(subject, attribute)}.`
    : `${questionText(subject, attribute)} Not yet asked.`;

  const headline = questionText(subject, attribute);

  return (
    <div className="sqlab">
      <header className="head">
        <h1>What Makes a Question Statistical?</h1>
        <p className="lede">
          Statistics does not begin with data — it begins with a <em>question</em>. A question is{' '}
          <strong>statistical</strong> when it anticipates variability: you ask many, and you already
          know the answers will disagree. Turn the two dials, press ASK, and count the different
          answers. Then meet the trap: asking lots of people is <em>not</em> enough.
        </p>
      </header>

      <div className="bench">
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">{headline}</p>
            <p className="equation-sub mono">
              {S.n} asked · {asked ? `${distinct} different` : 'not asked yet'}
            </p>
          </div>

          <div className="stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={`Statistical question bench. ${spoken}`} role="img" />
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Who you ask</span>
              <span className="fact-v mono">{S.label} · {S.n}</span>
            </div>
            <div className="fact">
              <span className="fact-k">What you ask</span>
              <span className="fact-v mono">{A.noun}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Ask many?</span>
              <span className="fact-v mono">{asksMany(subject) ? 'yes' : 'no — only one'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Do the answers disagree?</span>
              <span className="fact-v mono">
                {asked ? (attributeVaries(subject, attribute) ? 'yes' : 'no — all the same') : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Different answers</span>
              <span className="fact-v mono">{asked ? distinct : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Verdict</span>
              <span className={'fact-v mono' + (asked && stat ? ' hot' : '')}>
                {asked ? (stat ? 'STATISTICAL' : 'not statistical') : '—'}
              </span>
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn' + (asked ? ' ghost' : '')}
              onClick={() => setAsked(true)}
              disabled={asked}
            >
              {asked ? 'Asked ✓' : 'ASK'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setAsked(false)} disabled={!asked}>
              Clear the slots
            </button>
          </div>
        </section>

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

          <div className="dials">
            {PARAMS.map((d) => {
              const unlocked = step >= d.unlock;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={dialValue(d.key)}
                    disabled={!unlocked}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? dialText(d.key) : '🔒'}</output>
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

          {current.calib && goal && (
            <div className="calib">
              <p className="calib-goal">
                Build: <span className="goal">{goalOf(goal).label}</span>
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct + '%' }} />
              </div>
              <ul className="conds">
                {goalOf(goal).conds(subject, attribute).map((c, i) => {
                  const lbl = goalOf(goal).condLabels[i];
                  if (lbl === '—') return null;
                  return (
                    <li key={i} className={c ? 'met' : ''}>
                      <span aria-hidden="true">{c ? '✓' : '○'}</span> {lbl}
                    </li>
                  );
                })}
              </ul>
              <div className="meter-row">
                <span className="mono">match {pct}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{goalOf(goal).hint}</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={() => setGoal(makeGoal(goal))}>
                New goal
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
                  setStep(0); setAnswers({}); setGoal(null);
                  setSubject(START.subject); setAttribute(START.attribute); setAsked(false);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">statistical ⟺ ask many AND the answers disagree</span> &nbsp;·&nbsp;
        the question, before the data.
      </footer>

      <style jsx>{`
        .sqlab {
          --page: #eff1ee; --paper: #fbfbf8; --ink: #1c2b3a; --ink-soft: #5b6b7b;
          --curve: #c81e4f; --quad: #c7d8e4; --ok: #1f8a5b;
          --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
          --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
          background: var(--page); color: var(--ink);
          font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif;
          padding: 28px 18px 44px; border-radius: 16px; max-width: 1120px; margin: 0 auto;
        }
        .mono { font-family: var(--mono); }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-soft); margin: 0 0 6px;
        }
        .eyebrow.small { margin: 0 0 4px; }
        h1 { font-family: var(--serif); font-weight: 600; font-size: clamp(26px, 4vw, 34px); margin: 0 0 6px; }
        .lede { color: var(--ink-soft); margin: 0 0 22px; max-width: 68ch; }
        .bench { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; align-items: start; }
        /* minmax(0, 1fr), never a bare fr: an fr track has min-width:auto, so it
           refuses to shrink below its content's min-content — and the canvas carries a
           large INTRINSIC width (its width attribute = clientWidth x dpr), which props
           the column open. Measured: a 306px bench holding a 512px column, pushing the
           whole page into a horizontal scroll at phone width.
           NOTE: no backticks in here. This block is a styled-jsx template literal, so a
           backtick in a CSS comment terminates the string and the whole lab fails to
           compile — which renders a blank page that still measures as "no overflow". */
        @media (max-width: 920px) { .bench { grid-template-columns: minmax(0, 1fr); } }
        .panel {
          background: #fff; border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px; box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel { padding: 14px; }
        .stage-head {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 12px; flex-wrap: wrap; margin-bottom: 10px;
        }
        .equation {
          font-family: var(--serif); color: var(--curve); font-size: 17px; font-weight: 600; margin: 0;
        }
        .equation-sub { color: var(--ink-soft); font-size: 12.5px; margin: 0; }
        .stage {
          position: relative; width: 100%; aspect-ratio: 3 / 2; min-height: 320px;
          border: 1px solid var(--quad); border-radius: 8px; overflow: hidden; background: var(--paper);
        }
        .stage canvas { display: block; width: 100%; height: 100%; }
        .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 14px 4px 4px; }
        @media (max-width: 460px) { .facts { grid-template-columns: minmax(0, 1fr); } }
        .fact { display: flex; flex-direction: column; gap: 1px; padding: 6px 0; border-top: 1px solid rgba(28, 43, 58, 0.08); }
        .fact-k { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); }
        .fact-v { font-size: 13.5px; font-variant-numeric: tabular-nums; }
        .fact-v.hot { color: var(--curve); font-weight: 700; }
        .toolbar { margin: 12px 4px 2px; display: flex; gap: 9px; flex-wrap: wrap; }
        .btn {
          font: 600 13px/1 system-ui, sans-serif; padding: 9px 14px; border-radius: 8px;
          cursor: pointer; border: 1px solid var(--ink); background: var(--ink); color: #fff;
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
          font-family: var(--serif); font-weight: 600; font-size: 20px; margin: 0 0 10px;
          padding-bottom: 9px; border-bottom: 3px double rgba(200, 30, 79, 0.45);
        }
        .body { margin: 0 0 16px; font-size: 14.5px; }
        .dials { display: grid; gap: 12px; margin-bottom: 6px; }
        .dial {
          display: grid; grid-template-columns: 40px 1fr 78px; grid-template-rows: auto auto;
          align-items: center; gap: 2px 10px;
        }
        .dial.locked { opacity: 0.5; }
        .dk { grid-row: 1 / 3; font-family: var(--serif); font-style: italic; font-size: 16px; }
        .drole { grid-column: 2 / 4; font-size: 11px; color: var(--ink-soft); }
        .dial input[type='range'] { grid-column: 2; width: 100%; accent-color: var(--ink); cursor: pointer; }
        .dv {
          grid-column: 3; font-family: var(--mono); text-align: right; font-size: 12px; color: var(--ink);
        }
        .quiz { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); }
        .q { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
        .choices { display: grid; gap: 7px; }
        .choice {
          text-align: left; font: 13.5px/1.4 system-ui, sans-serif; padding: 9px 11px 9px 30px;
          border: 1px solid rgba(28, 43, 58, 0.2); border-radius: 8px; background: var(--paper);
          color: var(--ink); cursor: pointer; position: relative;
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
          margin: 12px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink);
          background: rgba(200, 30, 79, 0.05); border-left: 3px solid var(--curve);
          padding: 10px 12px; border-radius: 0 6px 6px 0;
        }
        .calib { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(28, 43, 58, 0.1); display: grid; gap: 10px; }
        .calib-goal { margin: 0; font-size: 14px; }
        .calib-goal .goal { color: var(--curve); font-weight: 700; }
        .meter { height: 12px; border-radius: 6px; background: rgba(28, 43, 58, 0.1); overflow: hidden; }
        .meter-fill {
          height: 100%; background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .conds { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; font-size: 12.5px; color: var(--ink-soft); }
        .conds li.met { color: var(--ok); font-weight: 600; }
        .meter-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
        .target-hint { color: var(--ink-soft); font-size: 12px; }
        .stamp {
          font: 700 12px/1 var(--mono); letter-spacing: 0.16em; color: var(--ok);
          border: 2px solid var(--ok); border-radius: 6px; padding: 4px 8px; transform: rotate(-3deg);
        }
        .nav { margin-top: 20px; display: flex; justify-content: space-between; gap: 10px; }
        .foot { margin-top: 24px; font-size: 12.5px; color: var(--ink-soft); }
        :global(.sqlab) :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) { .btn, .meter-fill, .choice { transition: none; } }
      `}</style>
    </div>
  );
}
