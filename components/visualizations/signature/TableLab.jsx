'use client';

/* ============================================================================
   TableLab — an interactive "bench" for DATA → TABLES: how a two-way (contingency)
   frequency table organizes people classified TWO ways at once, and the one truth
   that holds every such table together — EVERY PERSON IS COUNTED EXACTLY ONCE, so
   the grand total is the same no matter how you add it up:
       Σ(row totals) = Σ(column totals) = Σ(all cells) = N.
   That invariant is the lab's thesis; the carmine accent is the GRAND TOTAL and the
   "count once" idea it stands for.  The second big idea is the classic trap of
   RELATIVE frequency: the answer to "what fraction …?" depends entirely on WHICH
   denominator you divide by — everyone (N), a row total, or a column total.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 6–9
   (CCSS 8.SP.A.4 "understand that patterns of association … can be seen by
   displaying frequencies and relative frequencies in a two-way table"; extends to
   HS S-ID.B.5 "summarize categorical data for two categories in two-way frequency
   tables … recognize possible associations").  A child who can add and take a
   fraction meets a whole survey at once, learns to read a cell, a margin, and a
   grand total, and — the payoff — sees why the totals always agree and why the
   denominator is the whole question.

   Sibling of DataLab (the parent "Data" lab: dot plots + center).  DataLab lives on
   a NUMBER LINE and is about one variable's distribution; TableLab lives in a GRID
   and is about TWO categorical variables crossed — a picture a dot plot cannot make.
   No overlap: one is spread/center of numbers, the other is structure of a table.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Two linked
   pictures of one data set (the Decimal/Percentage "one data set, two models"
   signature, retuned for a table):
     • the TABLE (top) — a 2×2 grid of joint counts with a right-hand column of ROW
       totals, a bottom row of COLUMN totals (blue margins), and the GRAND TOTAL in
       the carmine corner.  Click a cell to add a surveyed person; the margins and
       grand total re-add live and exactly.  "Count every way" animates the
       invariant: the same N reached by rows, by columns, and by cells.
     • the PROPORTION STRIP (bottom, revealed with relative frequency) — the current
       view's decomposition drawn as 100%-bars, so you SEE that a "% of a row" bar is
       a whole row's 100% while a "% of all" bar is everyone's 100%.  The bar IS the
       denominator.

   One-accent discipline: CARMINE is the mathematical object the lab reveals — the
   GRAND TOTAL N and the "counted once" invariant (the corner cell, the total
   readout, the count-every-way proof).  The MARGINS (row/column totals) are clearly
   SECONDARY and kept in a quiet BLUE (structure/position); the two crossed
   categories get calm blue/gold fills in the proportion strip so they never fight
   the accent.  GREEN is reserved for "correct", a matched target margin, and
   "CALIBRATED".

   Everything is EXACT integer arithmetic, so a K-12 student never meets a float
   artefact like 33.3000004%:
     • cell counts are integers; margins and the grand total are integer sums.
     • the grand-total invariant is exact by construction and is displayed three
       ways (Σrows, Σcols, Σcells) that are provably equal integers.
     • relative frequencies are formatted from the integer ratio count/denominator:
       shown as an exact whole or one-decimal percent when it terminates cleanly, or
       a clearly-marked "≈" rounding otherwise — never a raw float.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/TableLab.jsx
     2. Import and render it:
          import TableLab from './TableLab';
          export default function Page() { return <TableLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the 2×2 grid, the view
              mode, the lesson step, the calibration target).
     MODEL  — margins, the grand total, and relative frequencies are exact integer
              arithmetic; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The survey is a 2×2 cross of two yes/no-style categorical
   variables; the drawn table is 3×3 (interior 2×2 + a margin row + a margin
   column + the grand-total corner).  A small integer world keeps every count,
   margin, and percent classroom-clean and the dots legible in a cell.
   ------------------------------------------------------------------------- */
const MAX_CELL = 9; // most people one cell will hold (keeps dots legible)

// the two crossed variables and their categories
const ROW_VAR = 'Age group';
const COL_VAR = 'Favorite pet';
const ROW_LABELS = ['Younger', 'Older']; // grades K–5 / 6–12
const COL_LABELS = ['Cats', 'Dogs'];

// a friendly starting survey with a clear (but not extreme) association:
// younger lean cats, older lean dogs.  grid[row][col].
const START_GRID = [
  [4, 2], // Younger:  Cats 4, Dogs 2   (row total 6)
  [2, 4], // Older:    Cats 2, Dogs 4   (row total 6)
]; //        col totals: Cats 6, Dogs 6                grand total 12

// lesson steps
const STEP_MEET = 0; // meet a two-way table — build it by clicking cells
const STEP_CELL = 1; // a cell is a JOINT count (both traits at once)
const STEP_MARGIN = 2; // margins — row & column totals
const STEP_TOTAL = 3; // the grand total, counted every way  (the centerpiece)
const STEP_REL = 4; // relative frequency — share of everyone (% of all)
const STEP_COND = 5; // conditional — mind the denominator (% of a row / column)
const STEP_CALIB = 6; // build a table to match target margins (calibration)

// the four ways to read the same table; each view unlocks with the lesson so the
// picture is never ahead of the idea.
const VIEWS = [
  { key: 'count', unlock: STEP_MEET, name: 'Counts', role: 'how many people' },
  { key: 'all', unlock: STEP_REL, name: '% of all', role: 'share of everyone (÷ N)' },
  { key: 'row', unlock: STEP_COND, name: '% of row', role: 'share within an age group' },
  { key: 'col', unlock: STEP_COND, name: '% of column', role: 'share within a pet' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Margins, grand total, and relative frequencies — all EXACT.
   Everything is derived from the integer grid; nothing here knows a pixel.
   ------------------------------------------------------------------------- */
// row totals, column totals, grand total.  The grand total is computed from the
// cells; the lab's whole point is that rows and columns re-add to the same value.
function totalsOf(grid) {
  const rowTotals = grid.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = [0, 0];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) colTotals[c] += grid[r][c];
  const N = rowTotals[0] + rowTotals[1];
  const cellSum = grid[0][0] + grid[0][1] + grid[1][0] + grid[1][1];
  return { rowTotals, colTotals, N, cellSum };
}

// EXACT percent of a ratio count/den, formatted with integer arithmetic:
//   • an exact whole percent when 100·count is divisible by den,
//   • else an exact one-decimal percent when 1000·count is divisible by den,
//   • else a clearly-marked "≈" one-decimal rounding.
// Returns { text (no % sign), approx }.  den === 0 → an em dash.
function pct(count, den) {
  if (den === 0) return { text: '—', approx: false };
  if ((count * 100) % den === 0) return { text: String((count * 100) / den), approx: false };
  const tenths = Math.round((count * 1000) / den); // percent × 10, rounded
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  const approx = (count * 1000) % den !== 0;
  return { text: whole + '.' + frac, approx };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): the four target MARGINS are fixed on the frame — target row
   totals on the right, target column totals on the bottom, their shared grand
   total in the corner — and the student fills ANY interior whose four margins
   match.  Feasible targets are generated so at least one interior of small
   integer cells exists; the reveal is that there is usually MORE than one such
   interior — the margins do not fix the inside, and that leftover freedom is
   exactly what "association" measures.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 8; // total margin error spread across the meter

// feasibility: some interior a=grid[0][0] gives all four cells in [0, MAX_CELL].
function targetFeasible(R1, R2, C1, C2, N) {
  const aLo = Math.max(0, R1 + C1 - N);
  const aHi = Math.min(R1, C1);
  for (let a = aLo; a <= aHi; a++) {
    const cells = [a, R1 - a, C1 - a, N - R1 - C1 + a]; // yc, yd, oc, od
    if (cells.every((x) => x >= 0 && x <= MAX_CELL)) return true;
  }
  return false;
}

function makeTarget(prev) {
  for (let tries = 0; tries < 500; tries++) {
    const N = 10 + Math.floor(Math.random() * 7); // grand total 10…16
    const R1 = 3 + Math.floor(Math.random() * (N - 5)); // 3 … N-3
    const R2 = N - R1;
    const C1 = 3 + Math.floor(Math.random() * (N - 5));
    const C2 = N - C1;
    if (!targetFeasible(R1, R2, C1, C2, N)) continue;
    if (prev && prev.N === N && prev.rows[0] === R1 && prev.cols[0] === C1) continue;
    return { rows: [R1, R2], cols: [C1, C2], N };
  }
  return { rows: [6, 6], cols: [6, 6], N: 12 }; // always-feasible fallback
}

// total absolute margin error between the built table and the target.
function marginError(rowTotals, colTotals, target) {
  return (
    Math.abs(rowTotals[0] - target.rows[0]) +
    Math.abs(rowTotals[1] - target.rows[1]) +
    Math.abs(colTotals[0] - target.cols[0]) +
    Math.abs(colTotals[1] - target.cols[1])
  );
}
const matchPercent = (err) => 100 * Math.max(0, 1 - err / MATCH_SCALE);
const isCalibrated = (err, N) => N > 0 && err === 0;

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The GRAND TOTAL is the star, in the carmine accent;
   the margins ride along as blue chips.  Rendered by a CHILD component, so styles
   are INLINED (styled-jsx only scopes a component's own JSX) — this keeps the
   readout identical in Next.js and any plain preview.
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
function TableEquation({ N, exists, rowTotals, colTotals, showMargins }) {
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
          {exists ? 'N = ' + N : 'N = 0'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#5b6b7b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          grand total
        </span>
      </span>
      {showMargins && (
        <>
          <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.12)' }}>
            rows {rowTotals[0]} + {rowTotals[1]}
          </span>
          <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.12)' }}>
            cols {colTotals[0]} + {colTotals[1]}
          </span>
        </>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the matching view unlocks with the step;
   the reveal lives in `feedback` (shown after answering); distractors are real
   table misconceptions ("a person goes in two cells — one per question", "the
   grand total is the biggest cell", "% of the younger who like cats means that
   cell ÷ N").  Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet a two-way table',
    body:
      'A survey asked every student two questions: which age group, and cats or dogs? A two-way ' +
      'table sorts them by BOTH at once — one variable across the columns (Cats / Dogs), the other ' +
      'down the rows (Younger / Older). Click a cell to drop in a student; click a dot to take one ' +
      'out. Because each student has exactly one age AND one pet, they land in exactly one cell.',
    q: 'A student is Younger and likes Dogs. How many of the four inner cells do they go in?',
    choices: ['Exactly one — the Younger, Dogs cell', 'Two — one for age, one for pet', 'It depends how strongly they like dogs'],
    answer: 0,
    feedback:
      'Exactly one. Each person has one answer to each question, so the pair (Younger, Dogs) names a ' +
      'single cell. That "counted once" fact is the quiet rule the whole table depends on — you will ' +
      'see why it matters at the grand total.',
  },
  {
    title: 'A cell is a joint count',
    body:
      'Read one inner cell. It counts the students who match BOTH labels — the ones at the crossing ' +
      'of that row and that column. The top-left cell is "Younger AND Cats." A cell is never about one ' +
      'label alone; it is always the overlap of a row-answer and a column-answer.',
    q: 'In this table  —  Younger: Cats 4, Dogs 2 ; Older: Cats 2, Dogs 4  —  how many are Older AND like Cats?',
    choices: ['2 — the Older row, Cats column cell', '6 — all the Cat lovers', '2 — because Older has fewer'],
    answer: 0,
    feedback:
      'It is 2: the number sitting where the Older row meets the Cats column. "All the cat lovers" (6) ' +
      'adds BOTH age groups — that is a column total, not a single cell. A cell is always the overlap of ' +
      'one row and one column.',
  },
  {
    title: 'Margins — the row and column totals',
    body:
      'Add across a row and you get how many students are in that age group; add down a column and you ' +
      'get how many like that pet. These sums sit in the margins — the extra blue column on the right ' +
      '(row totals) and blue row along the bottom (column totals). They summarize one variable at a time.',
    q: 'To find the total number of OLDER students, what do you add?',
    choices: ['The two cells in the Older row: Older-Cats + Older-Dogs', 'The two cells in the Cats column', 'Every cell in the whole table'],
    answer: 0,
    feedback:
      'Add along the Older ROW: Older-Cats + Older-Dogs. That row total ignores the pet entirely and just ' +
      'counts older students. Adding the whole table would give the grand total; adding the Cats column ' +
      'would give cat lovers of every age.',
  },
  {
    title: 'The grand total, counted every way',
    body:
      'Here is the idea that holds a two-way table together. Add up the row totals. Add up the column ' +
      'totals. Add up all four cells. You always get the SAME number, N — because every student is ' +
      'counted once and only once, so no matter which way you sweep the table, you sweep past each person ' +
      'exactly one time. Press "Count every way" to watch the three sums land on the same N.',
    q: 'Why must (row total + row total) always equal (column total + column total)?',
    choices: [
      'Both add up every student exactly once, just in a different order',
      'Because the table is a square',
      'It is a coincidence that stops working for big surveys',
    ],
    answer: 0,
    feedback:
      'Both are just the whole survey re-added in a different order — rows group people by age, columns ' +
      'group them by pet, but every person is in exactly one group each way, so both totals count everyone ' +
      'once. That is why Σrows = Σcols = Σcells = N, always. (It has nothing to do with the table being ' +
      'square — a 3×5 table obeys the same law.)',
  },
  {
    title: 'Relative frequency — share of everyone',
    body:
      'A relative frequency turns a count into a share: divide the cell by the grand total N. Switch the ' +
      'view to "% of all" and each cell becomes its slice of everyone; the four slices add to 100%, the ' +
      'whole survey. The strip below shows it — one bar, split into the four cells, filling exactly one ' +
      'whole. This is the JOINT relative frequency.',
    q: 'Out of  N = 20  students, 5 are Younger and like Dogs. What share of ALL students is that?',
    choices: ['25% — because 5 ÷ 20 = 0.25', '5% — you read the count as a percent', '50% — Dogs is half the table'],
    answer: 0,
    feedback:
      'It is 5 ÷ 20 = 0.25 = 25%. A count becomes a share only when you divide by the total — here the ' +
      'total is everyone, N = 20. The raw count 5 is not "5%"; and "Dogs is half" ignores how many actually ' +
      'chose dogs.',
  },
  {
    title: 'Conditional — mind the denominator',
    body:
      'Now the trap that catches everyone. "What fraction of the YOUNGER students like cats?" does NOT ' +
      'divide by N — it divides by the YOUNGER row total, because you are only looking inside that group. ' +
      'Switch to "% of row": every row becomes its own 100%. "% of column" makes each column its own 100%. ' +
      'The strip shows the denominator as the whole bar. Choosing the denominator IS the question.',
    q: 'Younger: Cats 4, Dogs 2 (6 younger in all). What fraction of the YOUNGER students like cats?',
    choices: ['4 out of 6 ≈ 66.7% — divide by the younger total', '4 out of 12 ≈ 33.3% — divide by everyone', '4% — read the cell as a percent'],
    answer: 0,
    feedback:
      '"Of the younger students" sets the denominator to the younger total, 6: it is 4 ÷ 6 ≈ 66.7%. ' +
      'Dividing by 12 answers a different question ("share of everyone who are younger cat-lovers"). Same ' +
      'cell, different denominators, different meanings — that is the heart of reading a table.',
  },
  {
    title: 'Build a table to match the margins',
    body:
      'Final challenge. The grey frame fixes the four target margins — row totals on the right, column ' +
      'totals at the bottom, the grand total in the corner. Fill the four cells so all four of YOUR margins ' +
      'match. The meter reads CALIBRATED when every margin lands. Then look for a second, different filling ' +
      'with the same margins: the margins do not fix the inside — that freedom is what association is.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function TableLab() {
  const [grid, setGrid] = useState(() => START_GRID.map((r) => r.slice()));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [view, setView] = useState('count'); // 'count' | 'all' | 'row' | 'col'
  const [countOn, setCountOn] = useState(false); // "count every way" animation
  const [target, setTarget] = useState(null); // calibration target margins
  const [, force] = useState(0); // nudge a redraw after imperative mutations
  void force;

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry, written by draw(), read by handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const gridRef = useRef(grid); // latest grid for pointer handlers
  const hoverCellRef = useRef(null); // { r, c } of hovered interior cell or null
  const countPhaseRef = useRef(0); // 0=rows 1=cols 2=cells, -1=show all (reduced motion)

  gridRef.current = grid;

  const current = STEPS[step];
  const calib = !!current.calib;

  const { rowTotals, colTotals, N, cellSum } = totalsOf(grid);
  const exists = N > 0;

  // which reading-views are unlocked at this step
  const unlockedViews = VIEWS.filter((v) => step >= v.unlock).map((v) => v.key);
  // margins show from the margins step onward (and always during calibration)
  const showMargins = step >= STEP_MARGIN || calib;
  // the carmine grand total shows from the grand-total step onward
  const showTotal = step >= STEP_TOTAL || calib;
  // the effective view (guard against a locked view lingering after a restart)
  const effView = unlockedViews.includes(view) ? view : 'count';
  const stripShown = (effView === 'all' || effView === 'row' || effView === 'col') && exists;

  const err = calib && target ? marginError(rowTotals, colTotals, target) : 0;
  const matchPct = calib && target ? matchPercent(err) : 0;
  const calibrated = calib && target ? isCalibrated(err, N) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    grid,
    rowTotals,
    colTotals,
    N,
    exists,
    showMargins,
    showTotal,
    view: effView,
    stripShown,
    countOn,
    calib,
    target,
    calibrated,
    rowLabels: ROW_LABELS,
    colLabels: COL_LABELS,
  };

  /* ---- grid → screen transform + full redraw from state ------------------- */
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
    const CARMINE = '#C81E4F'; // the GRAND TOTAL — corner, total, count-once proof
    const BLUE = '#3F74A6'; // the MARGINS — row & column totals
    const GOLD = '#D9982B';
    const OK = '#1F8A5B';
    const CELL_BG = '#ffffff';
    const GRID_LINE = 'rgba(28,43,58,0.22)';

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

    /* ---- layout regions ---------------------------------------------------- */
    const pad = 12;
    const headerH = 46; // top band: column headers + column-variable name
    const rowLabW = 96; // left band: row headers + row-variable name
    const gx0 = pad + rowLabW;
    const gy0 = pad + headerH;
    const gridBottom = S.stripShown ? gy0 + (Hd - gy0 - pad) * 0.64 : Hd - pad - 6;
    const gridW = Wd - pad - gx0;
    const gridH = gridBottom - gy0;
    const cw = gridW / 3; // 2 interior columns + 1 margin column
    const ch = gridH / 3; // 2 interior rows + 1 margin row
    const cellX = (c) => gx0 + c * cw; // c: 0,1 interior; 2 margin
    const cellY = (r) => gy0 + r * ch; // r: 0,1 interior; 2 margin

    geoRef.current = { gx0, gy0, cw, ch, gridBottom, interiorRight: gx0 + 2 * cw, interiorBottom: gy0 + 2 * ch };

    /* ---- cell backgrounds -------------------------------------------------- */
    // interior cells
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const hov = S.hoverCell && S.hoverCell.r === r && S.hoverCell.c === c;
        ctx.fillStyle = hov ? 'rgba(63,116,166,0.10)' : CELL_BG;
        ctx.fillRect(cellX(c), cellY(r), cw, ch);
      }
    }
    // margin cells (row totals column, column totals row) — tinted blue when shown
    if (S.showMargins) {
      ctx.fillStyle = 'rgba(63,116,166,0.08)';
      for (let r = 0; r < 2; r++) ctx.fillRect(cellX(2), cellY(r), cw, ch); // right margin
      for (let c = 0; c < 2; c++) ctx.fillRect(cellX(c), cellY(2), cw, ch); // bottom margin
    }
    // grand-total corner — carmine when shown
    if (S.showTotal) {
      ctx.fillStyle = 'rgba(200,30,79,0.10)';
      ctx.fillRect(cellX(2), cellY(2), cw, ch);
    }

    /* ---- calibration target: highlight matched margins green --------------- */
    if (S.calib && S.target) {
      const matched = [
        S.rowTotals[0] === S.target.rows[0],
        S.rowTotals[1] === S.target.rows[1],
        S.colTotals[0] === S.target.cols[0],
        S.colTotals[1] === S.target.cols[1],
      ];
      ctx.fillStyle = 'rgba(31,138,91,0.14)';
      if (matched[0]) ctx.fillRect(cellX(2), cellY(0), cw, ch);
      if (matched[1]) ctx.fillRect(cellX(2), cellY(1), cw, ch);
      if (matched[2]) ctx.fillRect(cellX(0), cellY(2), cw, ch);
      if (matched[3]) ctx.fillRect(cellX(1), cellY(2), cw, ch);
    }

    /* ---- count-every-way highlight bands ----------------------------------- */
    if (S.countOn && S.exists) {
      const phase = countPhaseRef.current;
      ctx.save();
      ctx.fillStyle = 'rgba(200,30,79,0.12)';
      if (phase === 0 || phase === -1) for (let r = 0; r < 2; r++) ctx.fillRect(cellX(2), cellY(r), cw, ch);
      if (phase === 1 || phase === -1) for (let c = 0; c < 2; c++) ctx.fillRect(cellX(c), cellY(2), cw, ch);
      if (phase === 2 || phase === -1) for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) ctx.fillRect(cellX(c), cellY(r), cw, ch);
      ctx.restore();
    }

    /* ---- grid lines -------------------------------------------------------- */
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let c = 0; c <= 3; c++) {
      const X = Math.round(cellX(c)) + 0.5;
      ctx.moveTo(X, gy0);
      ctx.lineTo(X, gridBottom);
    }
    for (let r = 0; r <= 3; r++) {
      const Y = Math.round(cellY(r)) + 0.5;
      ctx.moveTo(gx0, Y);
      ctx.lineTo(gx0 + 3 * cw, Y);
    }
    ctx.stroke();
    // heavier separators between the interior and the margins
    if (S.showMargins) {
      ctx.strokeStyle = 'rgba(63,116,166,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const Xs = Math.round(cellX(2)) + 0.5;
      ctx.moveTo(Xs, gy0);
      ctx.lineTo(Xs, gridBottom);
      const Ys = Math.round(cellY(2)) + 0.5;
      ctx.moveTo(gx0, Ys);
      ctx.lineTo(gx0 + 3 * cw, Ys);
      ctx.stroke();
    }

    /* ---- headers & variable names ------------------------------------------ */
    // column-variable name (top, spanning the two interior columns)
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(COL_VAR.toUpperCase(), cellX(0) + cw, pad - 1);
    // column headers (Cats, Dogs)
    ctx.fillStyle = INK;
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    for (let c = 0; c < 2; c++) ctx.fillText(S.colLabels[c], cellX(c) + cw / 2, gy0 - 6);
    if (S.showMargins) {
      ctx.fillStyle = BLUE;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('Total', cellX(2) + cw / 2, gy0 - 6);
    }

    // row-variable name (left, rotated) + row headers
    ctx.save();
    ctx.translate(pad + 12, gy0 + ch); // vertical center of the interior rows
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(ROW_VAR.toUpperCase(), 0, 0);
    ctx.restore();

    ctx.fillStyle = INK;
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < 2; r++) ctx.fillText(S.rowLabels[r], gx0 - 8, cellY(r) + ch / 2);
    if (S.showMargins) {
      ctx.fillStyle = BLUE;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('Total', gx0 - 8, cellY(2) + ch / 2);
    }

    /* ---- interior cell contents (dots or a percentage) --------------------- */
    const dots = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const n = S.grid[r][c];
        const cx = cellX(c) + cw / 2;
        const cyC = cellY(r) + ch / 2;

        if (S.view === 'count') {
          // little person-dots, laid out in a centered mini-grid
          const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
          const rows = Math.ceil(n / cols) || 1;
          const availW = cw * 0.62;
          const availH = ch * 0.58;
          const sx = cols > 1 ? availW / (cols - 1) : 0;
          const sy = rows > 1 ? availH / (rows - 1) : 0;
          let dr = Math.min(cols > 1 ? sx : availW, rows > 1 ? sy : availH) * 0.32;
          dr = Math.max(3.5, Math.min(dr, 9));
          const blockW = sx * (cols - 1);
          const blockH = sy * (rows - 1);
          let k = 0;
          const dotsCyOffset = -ch * 0.02;
          for (let rr = 0; rr < rows && k < n; rr++) {
            for (let cc = 0; cc < cols && k < n; cc++, k++) {
              const px = cx - blockW / 2 + cc * sx;
              const py = cyC + dotsCyOffset - blockH / 2 + rr * sy;
              ctx.beginPath();
              ctx.arc(px, py, dr, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(28,43,58,0.80)';
              ctx.fill();
              ctx.lineWidth = 1.2;
              ctx.strokeStyle = 'rgba(251,251,248,0.9)';
              ctx.stroke();
              dots.push({ r, c, x: px, y: py, rad: dr });
            }
          }
          // small count number, top-left of the cell
          ctx.fillStyle = n > 0 ? INK : 'rgba(28,43,58,0.35)';
          ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(n), cellX(c) + 6, cellY(r) + 5);
        } else {
          // a percentage — denominator depends on the view (the whole lesson)
          const den = S.view === 'all' ? S.N : S.view === 'row' ? S.rowTotals[r] : S.colTotals[c];
          const p = pct(n, den);
          ctx.fillStyle = CARMINE;
          ctx.font = '700 20px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText((p.approx ? '≈' : '') + p.text + '%', cx, cyC + 1);
          // the fraction underneath makes the denominator explicit
          ctx.fillStyle = INK_SOFT;
          ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textBaseline = 'top';
          ctx.fillText(n + ' / ' + (den || 0), cx, cyC + 12);
        }
      }
    }

    /* ---- margin numbers (row & column totals, blue) ------------------------ */
    if (S.showMargins) {
      ctx.fillStyle = BLUE;
      ctx.font = '700 20px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < 2; r++) ctx.fillText(String(S.rowTotals[r]), cellX(2) + cw / 2, cellY(r) + ch / 2);
      for (let c = 0; c < 2; c++) ctx.fillText(String(S.colTotals[c]), cellX(c) + cw / 2, cellY(2) + ch / 2);
    }

    /* ---- grand total in the corner (carmine) ------------------------------- */
    if (S.showTotal) {
      ctx.fillStyle = CARMINE;
      ctx.font = '800 24px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(S.N), cellX(2) + cw / 2, cellY(2) + ch / 2);
    } else if (S.showMargins) {
      // before the grand-total step the corner is a quiet placeholder
      ctx.fillStyle = 'rgba(28,43,58,0.28)';
      ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cellX(2) + cw / 2, cellY(2) + ch / 2);
    }

    /* ---- calibration target margins on the frame (grey, fixed) ------------- */
    if (S.calib && S.target) {
      ctx.fillStyle = 'rgba(91,107,123,0.9)';
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // row target labels — just above each right-margin number
      for (let r = 0; r < 2; r++) ctx.fillText('target ' + S.target.rows[r], cellX(2) + cw / 2, cellY(r) + 5);
      for (let c = 0; c < 2; c++) ctx.fillText('target ' + S.target.cols[c], cellX(c) + cw / 2, cellY(2) + 5);
      ctx.fillStyle = CARMINE;
      ctx.fillText('target ' + S.target.N, cellX(2) + cw / 2, cellY(2) + 5);
    }

    /* ---- count-every-way caption pill -------------------------------------- */
    if (S.countOn && S.exists) {
      const phase = countPhaseRef.current;
      let label;
      if (phase === -1) {
        label = 'rows ' + S.rowTotals[0] + '+' + S.rowTotals[1] + '=' + S.N + '   ·   cols ' +
          S.colTotals[0] + '+' + S.colTotals[1] + '=' + S.N + '   ·   cells ' +
          S.grid[0][0] + '+' + S.grid[0][1] + '+' + S.grid[1][0] + '+' + S.grid[1][1] + '=' + S.N;
      } else if (phase === 0) {
        label = 'by rows:  ' + S.rowTotals[0] + ' + ' + S.rowTotals[1] + '  =  ' + S.N;
      } else if (phase === 1) {
        label = 'by columns:  ' + S.colTotals[0] + ' + ' + S.colTotals[1] + '  =  ' + S.N;
      } else {
        label = 'by cells:  ' + S.grid[0][0] + ' + ' + S.grid[0][1] + ' + ' + S.grid[1][0] + ' + ' + S.grid[1][1] + '  =  ' + S.N;
      }
      ctx.font = '700 13px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(label).width;
      const bw = tw + 24;
      const bh = 26;
      const bx = Math.max(pad, Math.min((Wd - bw) / 2, Wd - pad - bw));
      const by = gridBottom - bh - 8;
      ctx.fillStyle = 'rgba(200,30,79,0.95)';
      const rr = 8;
      ctx.beginPath();
      ctx.moveTo(bx + rr, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr);
      ctx.arcTo(bx, by + bh, bx, by, rr);
      ctx.arcTo(bx, by, bx + bw, by, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 0.5);
    }

    /* ---- empty-state prompt ------------------------------------------------ */
    if (!S.exists) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click a cell to add a student', gx0 + cw, gy0 + ch);
    }

    /* ====================== PROPORTION STRIP (bottom) ===================== */
    if (S.stripShown) {
      const sTop = gridBottom + 30;
      const sBottom = Hd - pad - 4;
      const sLeft = gx0;
      const sRight = Wd - pad;
      const sW = sRight - sLeft;

      // caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const cap =
        S.view === 'all'
          ? 'each cell as a share of everyone — the whole bar is N (100%)'
          : S.view === 'row'
            ? 'each age group is its own 100% — the bar IS the denominator'
            : 'each pet is its own 100% — the bar IS the denominator';
      ctx.fillText(cap, sLeft, sTop - 8);

      const CAT = BLUE; // Cats split color
      const DOG = GOLD; // Dogs split color
      const Y_YOUNG = '#7ba0c9'; // Younger split color (a lighter blue)
      const Y_OLD = '#345f86'; // Older split color (a darker blue)

      // helper: draw one 100% bar of segments [{frac, color, label}]
      const drawBar = (x, y, w, h, total, segs) => {
        // frame
        ctx.strokeStyle = 'rgba(28,43,58,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (total <= 0) return;
        let cursor = x;
        for (const seg of segs) {
          const segW = (seg.count / total) * w;
          if (segW <= 0) continue;
          ctx.fillStyle = seg.color;
          ctx.fillRect(cursor, y, segW, h);
          // percent label if the segment is wide enough
          const p = pct(seg.count, total);
          if (segW > 34) {
            ctx.fillStyle = '#fff';
            ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((p.approx ? '≈' : '') + p.text + '%', cursor + segW / 2, y + h / 2);
          }
          cursor += segW;
        }
      };

      if (S.view === 'all') {
        // one bar, four cells in reading order
        const h = Math.min(40, sBottom - sTop);
        const y = sTop + (sBottom - sTop - h) / 2;
        drawBar(sLeft, y, sW, h, S.N, [
          { count: S.grid[0][0], color: 'rgba(63,116,166,0.55)' }, // younger cats
          { count: S.grid[0][1], color: 'rgba(217,152,43,0.55)' }, // younger dogs
          { count: S.grid[1][0], color: 'rgba(63,116,166,0.95)' }, // older cats
          { count: S.grid[1][1], color: 'rgba(217,152,43,0.95)' }, // older dogs
        ]);
      } else {
        // two bars — one per age group (row view) or per pet (column view), each
        // its own 100%.  A per-bar label sits ABOVE each bar; the top offset keeps
        // the first bar's label clear of the strip caption above it.
        const isRow = S.view === 'row';
        const gap = 16; // room for the second bar's label in the gap
        const top0 = sTop + 14; // clear the caption
        const h = Math.min(26, (sBottom - top0 - gap) / 2);
        for (let i = 0; i < 2; i++) {
          const y = top0 + i * (h + gap);
          const total = isRow ? S.rowTotals[i] : S.colTotals[i];
          const name = isRow ? S.rowLabels[i] : S.colLabels[i];
          ctx.fillStyle = INK_SOFT;
          ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(name + ' (' + total + ')', sLeft, y - 3);
          const segs = isRow
            ? [
                { count: S.grid[i][0], color: CAT },
                { count: S.grid[i][1], color: DOG },
              ]
            : [
                { count: S.grid[0][i], color: Y_YOUNG },
                { count: S.grid[1][i], color: Y_OLD },
              ];
          drawBar(sLeft, y, sW, h, total, segs);
        }
      }
    }

    /* store dot geometry for hit-testing */
    geoRef.current.dots = dots;
  }, []);

  /* redraw whenever state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [grid, step, view, target, countOn, showMargins, showTotal, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-advance the view to keep the picture level with the lesson */
  useEffect(() => {
    if (step === STEP_REL) setView('all');
    else if (step === STEP_COND) setView('row');
    else if (step <= STEP_TOTAL) setView('count');
    else if (calib) setView('count');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* set up the calibration target the first time we reach it; start empty so the
     build is clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setGrid([
        [0, 0],
        [0, 0],
      ]);
      setCountOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the "count every way" animation — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    if (!countOn) {
      countPhaseRef.current = 0;
      return;
    }
    const wantsReduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (wantsReduce) {
      countPhaseRef.current = -1; // show all three sums at once
      draw();
      return;
    }
    let raf;
    let start = null;
    const PHASE = 1.4; // seconds per phase
    const loop = (now) => {
      if (start == null) start = now;
      const t = (now - start) / 1000;
      const phase = Math.floor(t / PHASE) % 3;
      if (phase !== countPhaseRef.current) countPhaseRef.current = phase;
      draw();
      raf = requestAnimationFrame(loop);
    };
    countPhaseRef.current = 0;
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [countOn, grid, step, draw]);

  /* keep the scene's hover cell fresh for the renderer */
  sceneRef.current.hoverCell = hoverCellRef.current;

  /* ---- interaction: click a cell to add, click a dot to remove ----------- */
  const cellAt = (cssX, cssY) => {
    const g = geoRef.current;
    if (!g.cw) return null;
    if (cssX < g.gx0 || cssX >= g.interiorRight || cssY < g.gy0 || cssY >= g.interiorBottom) return null;
    const c = Math.floor((cssX - g.gx0) / g.cw);
    const r = Math.floor((cssY - g.gy0) / g.ch);
    if (r < 0 || r > 1 || c < 0 || c > 1) return null;
    return { r, c };
  };
  const hitDot = (cssX, cssY) => {
    const g = geoRef.current;
    if (!g.dots) return null;
    for (const d of g.dots) {
      if (Math.hypot(cssX - d.x, cssY - d.y) <= d.rad + 3) return d;
    }
    return null;
  };
  const addAt = (r, c) => {
    const cur = gridRef.current;
    if (cur[r][c] >= MAX_CELL) return;
    const next = cur.map((row) => row.slice());
    next[r][c] += 1;
    setGrid(next);
  };
  const removeAt = (r, c) => {
    const cur = gridRef.current;
    if (cur[r][c] <= 0) return;
    const next = cur.map((row) => row.slice());
    next[r][c] -= 1;
    setGrid(next);
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // only interact through the count view; the % views are read-only pictures
    if (sceneRef.current.view !== 'count') return;
    const dot = hitDot(cssX, cssY);
    if (dot) {
      removeAt(dot.r, dot.c);
      return;
    }
    const cell = cellAt(cssX, cssY);
    if (cell) addAt(cell.r, cell.c);
  };

  const onContextMenu = (e) => {
    // right-click removes one from the cell under the cursor (a convenience)
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const cell = cellAt(cssX, cssY);
    if (cell && sceneRef.current.view === 'count') {
      e.preventDefault();
      removeAt(cell.r, cell.c);
    }
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const cell = sceneRef.current.view === 'count' ? cellAt(cssX, cssY) : null;
    const prev = hoverCellRef.current;
    const changed = (!!cell !== !!prev) || (cell && prev && (cell.r !== prev.r || cell.c !== prev.c));
    if (changed) {
      hoverCellRef.current = cell;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverCellRef.current != null) {
      hoverCellRef.current = null;
      draw();
    }
  };

  /* ---- toolbar / presets ------------------------------------------------- */
  const applyPreset = (g) => {
    if (countOn) setCountOn(false);
    setGrid(g.map((r) => r.slice()));
  };
  const randomTable = () => {
    const g = [
      [Math.floor(Math.random() * 7), Math.floor(Math.random() * 7)],
      [Math.floor(Math.random() * 7), Math.floor(Math.random() * 7)],
    ];
    applyPreset(g);
  };
  const clearTable = () =>
    applyPreset([
      [0, 0],
      [0, 0],
    ]);

  const setViewSafe = (key) => {
    if (!unlockedViews.includes(key)) return;
    setView(key);
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

  const restart = () => {
    setStep(0);
    setAnswers({});
    setTarget(null);
    setCountOn(false);
    setView('count');
    setGrid(START_GRID.map((r) => r.slice()));
  };

  /* spoken description (accessibility) */
  const spoken = !exists
    ? 'The two-way table is empty. Click a cell to add a student.'
    : `A two-way table of ${N} student${N === 1 ? '' : 's'}, crossing age group with favorite pet. ` +
      `Younger: ${grid[0][0]} like cats, ${grid[0][1]} like dogs. Older: ${grid[1][0]} like cats, ${grid[1][1]} like dogs. ` +
      (showMargins ? `Row totals ${rowTotals[0]} and ${rowTotals[1]}; column totals ${colTotals[0]} and ${colTotals[1]}. ` : '') +
      (showTotal ? `The grand total is ${N}, whether you add the rows, the columns, or all the cells.` : '');

  return (
    <div className="tlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Two-Way Tables — Counted Once, Add Every Way</h1>
        <p className="lede">
          A survey classifies people <em>two ways at once</em> — here, age group crossed with favorite
          pet. Build the <span className="mono">two-way table</span>, read a <em>cell</em>, a{' '}
          <em>margin</em>, and the <em>grand&nbsp;total</em>, and discover the rule that ties it together:
          every person is <em>counted exactly once</em>, so <span className="mono">Σrows = Σcols = Σcells = N</span>.
          Then meet the trap that catches everyone — a &ldquo;% of what?&rdquo; depends entirely on which
          total you divide by.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <TableEquation N={N} exists={exists} rowTotals={rowTotals} colTotals={colTotals} showMargins={showMargins} />
            </p>
            <p className="equation-sub mono">
              {exists ? (
                showTotal ? (
                  <>
                    {N} = <b className="blue">{rowTotals[0]}+{rowTotals[1]}</b> (rows) ={' '}
                    <b className="blue">{colTotals[0]}+{colTotals[1]}</b> (cols) ={' '}
                    <b className="carm">{grid[0][0]}+{grid[0][1]}+{grid[1][0]}+{grid[1][1]}</b> (cells)
                  </>
                ) : (
                  'each cell counts people with both traits'
                )
              ) : (
                'add students to build the table'
              )}
            </p>
          </div>

          <div
            className={'stage' + (stripShown ? ' has-strip' : '')}
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onContextMenu={onContextMenu}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {effView === 'count' ? 'click a cell to add · click a dot (or right-click) to remove' : 'reading view — switch to Counts to edit'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — every margin matches the target, grand total ${target ? target.N : ''}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Grand total</span>
              <span className="fact-v mono carm big">{exists ? N : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Row totals</span>
              <span className="fact-v mono blue">{exists ? rowTotals[0] + ' , ' + rowTotals[1] : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Col totals</span>
              <span className="fact-v mono blue">{exists ? colTotals[0] + ' , ' + colTotals[1] : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Cells add to</span>
              <span className="fact-v mono">{exists ? cellSum : '—'}</span>
            </div>
          </div>

          {/* view-mode segmented control drives the picture */}
          <div className="views" role="group" aria-label="Reading views">
            {VIEWS.map((v) => {
              const unlocked = step >= v.unlock;
              const on = effView === v.key;
              return (
                <button
                  type="button"
                  key={v.key}
                  className={'seg' + (on ? ' on' : '') + (!unlocked ? ' locked' : '')}
                  onClick={() => setViewSafe(v.key)}
                  disabled={!unlocked}
                  aria-pressed={on}
                  title={unlocked ? v.role : 'unlocks soon'}
                >
                  <span className="seg-name">{v.name}</span>
                  {!unlocked && (
                    <span className="seg-lock" aria-hidden="true">
                      🔒
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="toolbar">
            {step >= STEP_TOTAL && (
              <button
                type="button"
                className={'btn ghost' + (countOn ? ' on' : '')}
                onClick={() => setCountOn((f) => !f)}
                disabled={!exists || effView !== 'count'}
                title={effView !== 'count' ? 'switch to Counts to see the sums' : undefined}
              >
                {countOn ? 'Counting…' : 'Count every way'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => applyPreset([[3, 3], [3, 3]])}>
              No link
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([[5, 1], [1, 5]])}>
              Strong link
            </button>
            <button type="button" className="btn ghost" onClick={randomTable}>
              Random
            </button>
            <button type="button" className="btn ghost" onClick={clearTable} disabled={!exists}>
              Clear
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
                  <span className="mono target-hint">
                    {!exists ? 'fill the cells' : err + ' off across the margins'}
                  </span>
                )}
              </div>
              <p className="calib-note mono">
                target rows {target.rows[0]} , {target.rows[1]} · cols {target.cols[0]} , {target.cols[1]} · N {target.N}
              </p>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setGrid([
                    [0, 0],
                    [0, 0],
                  ]);
                  setCountOn(false);
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          cell = both traits &nbsp;·&nbsp; margin = one variable&apos;s total &nbsp;·&nbsp; N = Σrows = Σcols = Σcells
        </span>{' '}
        &nbsp;·&nbsp; a relative frequency is count ÷ (the total you choose): everyone, a row, or a column (CCSS 8.SP.4,
        HS S-ID.5). Counts here are whole numbers; the same ideas scale to any survey.
      </footer>

      <style jsx>{`
        .tlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --margin: #3f74a6;
          --gold: #d9982b;
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
        .equation-sub .blue {
          color: var(--margin);
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5.4;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage.has-strip {
          aspect-ratio: 8 / 7;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
          .stage.has-strip {
            aspect-ratio: 3 / 4;
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
        .fact-v.blue {
          color: var(--margin);
          font-weight: 600;
        }
        .views {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin: 12px 4px 0;
        }
        .seg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: 600 12.5px/1 system-ui, sans-serif;
          padding: 8px 12px;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 999px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s, opacity 0.15s;
        }
        .seg:not(:disabled):hover {
          border-color: var(--ink);
        }
        .seg.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
        }
        .seg.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .seg-lock {
          font-size: 10px;
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
        .calib-note {
          margin: 0;
          font-size: 11.5px;
          color: var(--ink-soft);
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
        :global(.tlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .seg {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
