'use client';

/* ============================================================================
   CongruenceLab — an interactive "bench" for CONGRUENCE, defined the modern
   way: two figures are CONGRUENT exactly when some sequence of rigid
   motions carries one onto the other — and a chain that lands IS the
   proof, while a mismatched side is a certificate that NO chain ever will.

        congruent  ⟺  a chain of slides, flips and turns carries A onto B
        the landed chain is the proof; the mismatched side is the alibi

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab with
   the HS hand-off — CCSS 8.G.A.2 ("Understand that a two-dimensional
   figure is congruent to another if the second can be obtained from the
   first by a sequence of rotations, reflections, and translations; given
   two congruent figures, describe a sequence that exhibits the congruence
   between them") and G-CO.B.6–8, where high school makes this DEFINITION
   the foundation of the triangle criteria.  This is the sentence no lab
   in the library states; here it is the whole lab.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE CARRYING TEST, AND THE ALIBI."
     Two figures are posted: blue A, green B.  The claim "A ≅ B" is not
     settled by looking — it is settled by CARRYING: press slides, flips
     and quarter-turns until A's carmine image lands exactly on B.  A chain
     that lands is a PROOF you constructed, and the lab records it move by
     move.  The deeper half is the impostor: a B whose SIDES do not match
     A's.  No chain can ever land there — and the lab does not make you
     exhaust your patience to believe it: rigid motions cannot change side
     lengths (the previous bench proved it live), so ONE mismatched side is
     an ALIBI — a certificate of impossibility.  Tap the mismatched side,
     and the case closes without a single press.  Congruence stops being
     "same shape, same size" (a slogan) and becomes a definition with two
     kinds of evidence: the chain, or the alibi.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • TransformationsLab (8.G.A.1/3) owns the MOVES themselves — the rules,
       the preservation inventory, the lettering.  This lab REUSES its
       moves on purpose (that is the pedagogy: the definition runs on the
       machine you already know) and owns what that lab refused to say:
       the word CONGRUENT, the definition, and the impossibility
       certificate.  No rule card, no preservation panel, no lettering
       tally returns here.
     • TriangleLab and QuadrilateralLab own their figures' theorems; the
       HS congruence criteria (SSS, SAS, ASA) belong to roadmap G7/H16
       territory and are never named — this lab is the definition, not
       the shortcuts.
     • SymmetryLab owns landing a figure on ITSELF; here A lands on B, a
       different figure in a different place, and the self-landing phrase
       stays banned.
     • MeasurementLab and DistanceLab own measuring.  Nothing is measured
       here: side comparisons are exact integer squared lengths computed
       by the model, shown as tick-marks, never as numbers with units.

   One-accent discipline: CARMINE is THE CLAIM IN MOTION — A's carried
   image and the recorded chain.  BLUE is figure A (the given); GREEN is
   figure B (the destination) and, as ever, "correct" and CALIBRATED.
   GOLD is the ALIBI — the mismatched side, when one exists.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a fourteen-year-old):
     • All vertices are INTEGER pairs; the moves are the exact integer maps
       of the sibling bench; landing is exact vertex-set equality.  The
       audit re-verifies every pair in the docket by brute-force search
       over bounded chains: the congruent cases ARE landable (a landing
       chain is exhibited), and the impostors are UNLANDABLE — not by
       failed search, but by invariant: their squared-side multisets
       differ from A's, and rigid motions provably preserve that multiset.
     • The alibi is derived, never stored: the mismatched side is found by
       comparing the two figures' sorted squared-length lists; the audit
       confirms the highlighted side is a genuine mismatch and that
       congruent pairs have none.
     • The calibration stamp needs two facts at once: the VERDICT
       (congruent / not congruent) is right, AND the EVIDENCE is right —
       a chain that has actually landed for the congruent case, or the
       alibi tapped for the impostor.  A right verdict with wrong evidence
       never stamps.  Audited over every docket case × chains × taps.
   Verified by audit-congruence.mjs (numeric proof + source greps) and
   verify-congruence.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/CongruenceLab.jsx
     2. Import and render it:
          import CongruenceLab from './CongruenceLab';
          export default function Page() { return <CongruenceLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the case, the
              chain, the verdict, the evidence, the lesson step, answers).
     MODEL  — exact integer maps and invariants; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The sibling bench's moves, reused on purpose.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the claim in motion: the carried image, the chain
const BLUE = '#3f74a6'; // figure A — the given
const GOLD = '#b98718'; // the alibi — the mismatched side
const GREEN = '#1f8a5b'; // figure B — the destination
const INK_HEX = '#1c2b3a';

const WIN = 9;
const CALIB_STEP = 5;

const MOVES = {
  tR: { label: 'slide → 1', f: ([x, y]) => [x + 1, y] },
  tL: { label: 'slide ← 1', f: ([x, y]) => [x - 1, y] },
  tU: { label: 'slide ↑ 1', f: ([x, y]) => [x, y + 1] },
  tD: { label: 'slide ↓ 1', f: ([x, y]) => [x, y - 1] },
  fy: { label: 'flip over the up axis', f: ([x, y]) => [-x, y] },
  r90: { label: 'quarter-turn about O', f: ([x, y]) => [-y, x] },
};
const MOVE_KEYS = ['tR', 'tL', 'tU', 'tD', 'fy', 'r90'];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Figures, landing, and the alibi — all derived.
   ------------------------------------------------------------------------- */
const applyMove = (pts, key) => pts.map(MOVES[key].f);
const applyChain = (base, chain) => chain.reduce((p, key) => applyMove(p, key), base);
const inWindow = (pts) => pts.every(([x, y]) => Math.abs(x) <= WIN && Math.abs(y) <= WIN);
const canPress = (base, chain, key) => inWindow(applyMove(applyChain(base, chain), key));
const sameSet = (a, b) => {
  const key = (pts) => pts.map(([x, y]) => `${x},${y}`).sort().join('|');
  return key(a) === key(b);
};
/* squared side lengths, in edge order (for the alibi) and sorted (for the verdict) */
const edgesSq = (pts) =>
  pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  });
const sortedEdges = (pts) => edgesSq(pts).slice().sort((a, b) => a - b);
/* rigid motions preserve the sorted edge multiset — so a mismatch is an
   ALIBI: no chain can ever land.  The alibi is B's first edge whose squared
   length appears in B more often than in A. */
function alibiEdge(A, B) {
  const eA = edgesSq(A);
  const eB = edgesSq(B);
  const countIn = (arr, v) => arr.filter((x) => x === v).length;
  for (let i = 0; i < eB.length; i++) {
    if (countIn(eB, eB[i]) > countIn(eA, eB[i])) return i;
  }
  return eB.length !== eA.length ? 0 : null;
}
const edgeMultisetsMatch = (A, B) => sortedEdges(A).join(',') === sortedEdges(B).join(',');

/* the case table: A is always the same right triangle; B varies */
const A_BASE = [[1, 1], [4, 1], [1, 3]];
const CASES = {
  slid: { label: 'B, across the floor', B: [[-6, -3], [-3, -3], [-6, -1]] }, // A slid by (−7, −4)
  turned: { label: 'B, turned', B: [[-1, 1], [-1, 4], [-3, 1]] }, // A quarter-turned
  flipped: { label: 'B, facing the other way', B: [[-1, -2], [-4, -2], [-1, 0]] }, // A flipped then slid
  impostor: { label: 'B, the impostor', B: [[-6, 2], [-2, 2], [-6, 5]] }, // legs 4 and 3 — not A's 3 and 2
};
const caseIds = Object.keys(CASES);

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The gatekeeper of ≅."  A case is posted; rule on
   it, then present the evidence: a landed chain, or the tapped alibi.
   ------------------------------------------------------------------------- */
function makeCase(prevId) {
  let id;
  do {
    id = caseIds[Math.floor(Math.random() * caseIds.length)];
  } while (id === prevId);
  return id;
}
const calibChecks = (caseId, chain, verdict, tapped) => {
  if (!caseId) return [false, false];
  const B = CASES[caseId].B;
  const congruent = edgeMultisetsMatch(A_BASE, B);
  const verdictOK = verdict != null && verdict === (congruent ? 'congruent' : 'not');
  const landed = sameSet(applyChain(A_BASE, chain), B);
  const alibi = alibiEdge(A_BASE, B);
  const evidenceOK = verdictOK && (congruent ? landed : tapped != null && tapped === alibi);
  return [verdictOK, evidenceOK];
};
const closeness = (caseId, chain, verdict, tapped) =>
  Math.round((100 * calibChecks(caseId, chain, verdict, tapped).filter(Boolean).length) / 2);
const isCalibrated = (caseId, chain, verdict, tapped) =>
  calibChecks(caseId, chain, verdict, tapped).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that congruent means "looks the
   same", that a flipped copy is not congruent, that you must try forever
   to prove impossibility.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The claim, and the test',
    body:
      'Blue triangle A, green triangle B — B is A, slid across the floor. The claim "A ≅ B" ' +
      '(A is CONGRUENT to B) has an exact meaning on this bench: some chain of moves carries ' +
      'A onto B. Press slides until the carmine copy lands.',
    caseId: 'slid',
    chips: ['tR', 'tL', 'tU', 'tD'],
    q: 'What does "A ≅ B" MEAN, on this definition?',
    choices: [
      'Some sequence of slides, flips and turns carries A exactly onto B',
      'A and B look alike if you squint',
      'A and B have the same area',
    ],
    answer: 0,
    feedback:
      'A sequence of rigid motions carrying one onto the other — that is the modern ' +
      'definition, word for word (8.G.A.2). "Same shape and size" is the slogan; the chain is ' +
      'the substance. And note what your landed chain is: a PROOF, constructed by you, ' +
      'recorded move by move.',
  },
  {
    title: 'Turned is still congruent',
    body:
      'B now sits turned a quarter. Slides alone will never land A on it — you need the turn. ' +
      'Find a chain. (One answer: quarter-turn, then slides.)',
    caseId: 'turned',
    chips: ['tR', 'tL', 'tU', 'tD', 'r90'],
    q: 'Before you land it: is the turned B congruent to A?',
    choices: [
      'Yes — a turn is a rigid motion, so a chain through it still counts',
      'No — it points a different way',
      'Only if you turn it back first',
    ],
    answer: 0,
    feedback:
      'Congruent. The definition never asks figures to point the same way — it asks for a ' +
      'carrying chain, and turns are legal moves. "Points differently" fools the eye; the ' +
      'chain settles it. Land it and you have exhibited the congruence, exactly as the ' +
      'standard phrases it.',
  },
  {
    title: 'Flipped is still congruent',
    body:
      'B now faces the other way — a mirror-image copy. No amount of sliding and turning ' +
      'lands a flag on its mirror twin; you need the flip.',
    caseId: 'flipped',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'r90'],
    q: 'A mirror-image copy — congruent, or not?',
    choices: [
      'Congruent — reflections are rigid motions too; the definition says so',
      'Not congruent — it is backwards',
      'Congruent only in the mirror',
    ],
    answer: 0,
    feedback:
      'Congruent. This is the definition’s sharpest edge, and students split here: a flipped ' +
      'copy FEELS different, but reflections preserve every length and angle, so the ' +
      'definition admits them. (Geometry that refuses flips has a name — "directly ' +
      'congruent" — and it waits in high school. Here, the flip is a citizen.)',
  },
  {
    title: 'The impostor, and the alibi',
    body:
      'A new B — and something is off. Chain all you like: it will never land. You do not ' +
      'have to try forever: TAP the side of B that could never match. One mismatched side ' +
      'closes the case.',
    caseId: 'impostor',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'r90'],
    tapAlibi: true,
    q: 'Why is ONE mismatched side a complete proof that NO chain will ever land?',
    choices: [
      'Rigid motions never change side lengths — so a length A does not have can never appear',
      'Because after ten tries you may give up',
      'It is not a proof, just a strong hint',
    ],
    answer: 0,
    feedback:
      'The previous bench proved it live: every slide, flip and turn keeps every length. So ' +
      'the carried copy of A always has exactly A’s sides — and B owns a side A cannot ' +
      'produce. That is an ALIBI: a certificate of impossibility, better than a thousand ' +
      'failed attempts. Impossibility proved by invariant is one of mathematics’ great moves.',
  },
  {
    title: 'Two kinds of evidence',
    body:
      'The whole lab in one card: CONGRUENT is proved by a landed chain; NOT CONGRUENT is ' +
      'proved by an alibi. Looking closely is how you guess; evidence is how you know.',
    caseId: 'turned',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'r90'],
    q: 'Which of these is EVIDENCE, in this lab’s sense?',
    choices: [
      'A landed chain, or a mismatched side — each settles its case completely',
      'A very careful look',
      'Measuring with a good ruler',
    ],
    answer: 0,
    feedback:
      'The chain and the alibi. Both are checkable by anyone, neither depends on eyesight, ' +
      'and each settles its side of the question completely — which is what "proof" means. ' +
      'The gatekeeper’s stamp on the next step accepts nothing less.',
  },
  {
    title: 'The gatekeeper of ≅',
    body:
      'A case is posted at the gate. Rule on it — congruent or not — then present your ' +
      'evidence: land the chain, or tap the alibi side.',
    caseId: 'slid',
    chips: ['tR', 'tL', 'tU', 'tD', 'fy', 'r90'],
    tapAlibi: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function CongruenceLab() {
  const [caseId, setCaseId] = useState('slid');
  const [chain, setChain] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [tapped, setTapped] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef([]);

  const current = STEPS[step];
  const calib = !!current.calib;
  const B = CASES[caseId].B;
  const aSideSquares = edgesSq(A_BASE);
  const bSideSquares = edgesSq(B);
  const img = applyChain(A_BASE, chain);
  const landed = sameSet(img, B);

  const checks = calib ? calibChecks(caseId, chain, verdict, tapped) : [false, false];
  const pct = calib ? closeness(caseId, chain, verdict, tapped) : 0;
  const calibrated = calib ? isCalibrated(caseId, chain, verdict, tapped) : false;

  sceneRef.current = { B, img, landed, tapped, calib, tapAlibi: !!current.tapAlibi, caseId };

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

    const bandH = 58;
    const cx = W / 2;
    const cy = bandH + (H - bandH) / 2;
    const k = Math.min((W - 40) / (2 * WIN + 2), (H - bandH - 36) / (2 * WIN + 2));
    const px = (X, Y) => [cx + X * k, cy - Y * k];

    /* grid + axes */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.55)';
    ctx.beginPath();
    for (let v = -WIN; v <= WIN; v++) {
      const [gx] = px(v, 0);
      ctx.moveTo(gx, cy - WIN * k);
      ctx.lineTo(gx, cy + WIN * k);
      const [, gy] = px(0, v);
      ctx.moveTo(cx - WIN * k, gy);
      ctx.lineTo(cx + WIN * k, gy);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - WIN * k, cy);
    ctx.lineTo(cx + WIN * k, cy);
    ctx.moveTo(cx, cy - WIN * k);
    ctx.lineTo(cx, cy + WIN * k);
    ctx.stroke();

    const poly = (pts, stroke, fill, width, dash) => {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach(([X, Y], i) => {
        const [dx, dy] = px(X, Y);
        if (i === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      });
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    };

    /* B — the destination */
    poly(S.B, GREEN, 'rgba(31,138,91,0.08)', 2.4);
    /* A — the given */
    poly(A_BASE, BLUE, 'rgba(63,116,166,0.13)', 2.2);
    /* the carried image */
    poly(S.img, CARMINE, 'rgba(200,30,79,0.12)', 2.6, S.landed ? null : [7, 4]);

    /* labels */
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const centroid = (pts) => {
      let sx = 0;
      let sy = 0;
      for (const [x, y] of pts) {
        sx += x;
        sy += y;
      }
      return px(sx / pts.length, sy / pts.length);
    };
    const [ax, ay] = centroid(A_BASE);
    ctx.fillStyle = BLUE;
    ctx.fillText('A', ax, ay + 5);
    const [bx, by] = centroid(S.B);
    ctx.fillStyle = GREEN;
    ctx.fillText('B', bx, by + 5);

    /* the alibi affordance: B's edges are tappable; the true alibi glows
       gold once tapped */
    geomRef.current = [];
    if (S.tapAlibi) {
      S.B.forEach((p, i) => {
        const q = S.B[(i + 1) % S.B.length];
        const [x1, y1] = px(p[0], p[1]);
        const [x2, y2] = px(q[0], q[1]);
        geomRef.current.push({ x1, y1, x2, y2, i });
        if (S.tapped === i) {
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        const edgeLength = Math.hypot(x2 - x1, y2 - y1) || 1;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const normalX = -(y2 - y1) / edgeLength;
        const normalY = (x2 - x1) / edgeLength;
        const outwardSign = (normalX * (midX - bx) + normalY * (midY - by)) >= 0 ? 1 : -1;
        const labelX = Math.max(12, Math.min(W - 12, midX + normalX * outwardSign * 14));
        const labelY = Math.max(bandH + 12, Math.min(H - 12, midY + normalY * outwardSign * 14));
        ctx.fillStyle = S.tapped === i ? GOLD : GREEN;
        ctx.font = '700 12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), labelX, labelY);
      });
    }

    /* ---- the readout band ---- */
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    if (S.landed) {
      ctx.fillStyle = CARMINE;
      ctx.font = '700 15.5px ui-monospace, monospace';
      ctx.fillText('landed — the chain is the proof: A ≅ B', W / 2, bandH / 2);
    } else if (S.tapped != null && alibiEdge(A_BASE, S.B) === S.tapped) {
      ctx.fillStyle = GOLD;
      ctx.font = '700 15.5px ui-monospace, monospace';
      ctx.fillText('the alibi: a side A can never produce — no chain will land', W / 2, bandH / 2);
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.fillText('carry the carmine copy — or find the side that closes the case', W / 2, bandH / 2);
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
    setChain([]);
    setTapped(null);
    setVerdict(null);
    setCaseId(STEPS[step].calib ? makeCase(null) : STEPS[step].caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const press = (key) => {
    if (!canPress(A_BASE, chain, key)) return;
    setChain((c) => [...c, key]);
  };
  const undo = () => setChain((c) => c.slice(0, -1));
  const onPointerDown = (e) => {
    if (!sceneRef.current.tapAlibi) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const g of geomRef.current) {
      /* distance from the tap to the segment */
      const dx = g.x2 - g.x1;
      const dy = g.y2 - g.y1;
      const t = Math.max(0, Math.min(1, ((mx - g.x1) * dx + (my - g.y1) * dy) / (dx * dx + dy * dy)));
      const qx = g.x1 + t * dx;
      const qy = g.y1 + t * dy;
      if ((mx - qx) ** 2 + (my - qy) ** 2 < 100) {
        setTapped(g.i);
        return;
      }
    }
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setChain([]);
    setTapped(null);
    setVerdict(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The gatekeeper: case "${CASES[caseId].label}". Verdict ${verdict ?? 'pending'}; chain of ${chain.length} moves${
        landed ? ', landed' : ''
      }; ${tapped != null ? `side ${tapped + 1} tapped` : 'no side tapped'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Case "${CASES[caseId].label}": ${landed ? 'the chain has landed — congruence exhibited.' : `chain of ${chain.length} moves so far.`}`;

  return (
    <div className="cglab">
      <header className="head">
        <h1>Congruence: Carry It, or Close the Case</h1>
        <p className="lede">
          <span className="mono">A ≅ B</span> means: some chain of slides, flips and turns
          carries A <em>exactly onto</em> B. A landed chain is the <em>proof</em>; one
          mismatched side is the <em>alibi</em> that no chain will ever land.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar" role="group" aria-label="Moves">
            {current.chips.map((key) => (
              <button
                type="button"
                key={key}
                className={'chipbtn' + (key === 'fy' ? ' neg' : '')}
                disabled={!canPress(A_BASE, chain, key)}
                onClick={() => press(key)}
              >
                {MOVES[key].label}
              </button>
            ))}
            <button type="button" className="btn ghost" onClick={undo} disabled={chain.length === 0}>
              Undo
            </button>
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
          {current.tapAlibi && (
            <div
              className="side-picker"
              role="group"
              aria-label={`Figure A has squared side lengths ${aSideSquares.join(', ')}. Choose the alibi side of figure B.`}
              data-viz-keyboard-equivalent="congruence-alibi-sides"
            >
              <span className="picker-label">Choose a side of B:</span>
              {B.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={'side-btn' + (tapped === i ? ' active' : '')}
                  aria-pressed={tapped === i}
                  aria-label={`Select side ${i + 1} of figure B, from (${B[i][0]}, ${B[i][1]}) to (${B[(i + 1) % B.length][0]}, ${B[(i + 1) % B.length][1]}), squared length ${bSideSquares[i]}, as the alibi`}
                  onClick={() => setTapped(i)}
                >
                  Side {i + 1} · d²={bSideSquares[i]}
                </button>
              ))}
            </div>
          )}
          {current.tapAlibi && (
            <p className="hint">suspicious? select a side of B on the diagram or with the side buttons</p>
          )}
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

          {calib && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Posted at the gate</span>
                <span className="target-word">{CASES[caseId].label}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the verdict</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the evidence — a landed chain, or the alibi
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Verdict">
                  <button
                    type="button"
                    className={'declbtn' + (verdict === 'congruent' ? ' active' : '')}
                    onClick={() => setVerdict('congruent')}
                  >
                    congruent
                  </button>
                  <button
                    type="button"
                    className={'declbtn' + (verdict === 'not' ? ' active' : '')}
                    onClick={() => setVerdict('not')}
                  >
                    not congruent
                  </button>
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'ruled, with evidence — the gate opens'
                    : verdict == null
                      ? 'rule first — then prove it'
                      : verdict === 'congruent'
                        ? 'now land the chain'
                        : 'now tap the alibi side of B'}
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
                  setCaseId(makeCase(caseId));
                  setChain([]);
                  setVerdict(null);
                  setTapped(null);
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
                  setChain([]);
                  setVerdict(null);
                  setTapped(null);
                  setCaseId('slid');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">carry it — or close the case</span> &nbsp;·&nbsp; two figures are
        congruent when a sequence of rigid motions carries one onto the other (CCSS 8.G.A.2,
        G-CO.B); the landed chain exhibits it, and one unmatchable side proves it impossible.
        Evidence, either way.
      </footer>

      <style jsx>{`
        .cglab {
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
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .hint {
          margin: 8px 6px 0;
          font-size: 12px;
          font-style: italic;
          color: var(--ink-soft);
        }
        .side-picker {
          margin: 10px 4px 0;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }
        .picker-label {
          color: var(--ink-soft);
          font-size: 12px;
          font-weight: 650;
        }
        .side-btn {
          min-width: 44px;
          min-height: 44px;
          padding: 7px 11px;
          border: 1.5px solid rgba(185, 135, 24, 0.55);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          font: 650 12px/1 system-ui, sans-serif;
        }
        .side-btn.active {
          border-color: var(--gold);
          background: rgba(185, 135, 24, 0.14);
          color: #765400;
        }
        .chipbtn {
          min-width: 44px;
          min-height: 44px;
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.neg {
          border-color: rgba(200, 30, 79, 0.55);
          color: var(--carmine);
        }
        .chipbtn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chipbtn:not(:disabled):hover {
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
        :global(.cglab) :focus-visible {
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
