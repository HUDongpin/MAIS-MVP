"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const ROOT_COLOR = "var(--band-upper)";
const VERTEX_COLOR = "var(--band-early)";

/* ---------- pure helpers (exported so the test can walk every reachable state) ---------- */

export const CONTROLS = { p: { min: -4, max: 4 }, q: { min: -4, max: 4 } } as const;
export const CHECK_X = 5;
export const SVG = { w: 500, h: 290, padX: 36, padTop: 20, padBottom: 34 } as const;
export const X_LO = -6;
export const X_HI = 6;
export const SAMPLES = 96;

/** The quadratic the figure draws, built from its two roots: f(x) = (x - p)(x - q). */
export function quadAt(p: number, q: number, x: number) { return (x - p) * (x - q); }
/** Axis of symmetry: the midpoint of the two roots. */
export function axisOfSymmetry(p: number, q: number) { return (p + q) / 2; }
/** Vertex height k = pq - h², which is also the negative square -((q - p)/2)². */
export function vertexY(p: number, q: number) { const h = axisOfSymmetry(p, q); return p * q - h * h; }
export function num(n: number) { return n < 0 ? `−${Math.abs(n)}` : `${n}`; }
function signed(c: number, suffix = "") { return ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${suffix}`; }
function factor(root: number) { return root === 0 ? "x" : `(x ${root > 0 ? "−" : "+"} ${Math.abs(root)})`; }
export function factoredForm(p: number, q: number) { return p === q ? `${factor(p)}²` : `${factor(p)}${factor(q)}`; }
function xTerm(c: number) { return c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}x`; }
function constTerm(c: number) { return c === 0 ? "" : signed(c); }
export function expandedForm(p: number, q: number) { return `x²${xTerm(-(p + q))}${constTerm(p * q)}`; }
export function vertexForm(p: number, q: number) { const h = axisOfSymmetry(p, q); return `${h === 0 ? "x" : `(x ${h > 0 ? "−" : "+"} ${Math.abs(h)})`}²${constTerm(vertexY(p, q))}`; }
export function rootSentence(p: number, q: number) { return p === q ? `touches the x-axis once, at x = ${num(p)}` : `crosses the x-axis at x = ${num(Math.min(p, q))} and at x = ${num(Math.max(p, q))}`; }
export function plotBounds(p: number, q: number) {
  const ys = curve(p, q).map((pt) => pt.y);
  return { yMin: Math.min(vertexY(p, q), ...ys), yMax: Math.max(0, ...ys) };
}
export function px(x: number) { return SVG.padX + ((x - X_LO) / (X_HI - X_LO)) * (SVG.w - 2 * SVG.padX); }
export function py(y: number, b: { yMin: number; yMax: number }) {
  return SVG.padTop + ((b.yMax - y) / (b.yMax - b.yMin)) * (SVG.h - SVG.padTop - SVG.padBottom);
}
export function curve(p: number, q: number) {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => X_LO + ((X_HI - X_LO) * i) / SAMPLES).map((x) => ({ x, y: quadAt(p, q, x) }));
}
/** The axis of symmetry is a whole vertical line, so it is drawn full height and never collapses. */
export function axisLine(p: number, q: number) { return { x: px(axisOfSymmetry(p, q)), y1: SVG.padTop, y2: SVG.h - SVG.padBottom }; }

/* ---------- every sentence the figure displays, built from state so the test can read it ---------- */

export function ariaLabel(p: number, q: number) { return `Graph of y = ${expandedForm(p, q)}. The parabola ${rootSentence(p, q)}, and its lowest point is the vertex at (${num(axisOfSymmetry(p, q))}, ${num(vertexY(p, q))}).`; }
export function checkLine(p: number, q: number) {
  return `same function, one test: at x = ${CHECK_X} the factored form ${factoredForm(p, q)} gives (${CHECK_X - p})(${CHECK_X - q}) = ${quadAt(p, q, CHECK_X)}, and the standard and vertex forms give ${quadAt(p, q, CHECK_X)} as well.`;
}
export function formNotes(p: number, q: number) {
  const factored = `A product is zero only when a factor is zero, so the graph ${rootSentence(p, q)}.`;
  const standard = `The x-coefficient ${num(-(p + q))} is the opposite of the sum of the roots; the constant ${num(p * q)} is their product and equals f(0).`;
  const vertex = `This parabola opens upward and a square is never negative, so the smallest value is ${num(vertexY(p, q))}, reached at x = ${num(axisOfSymmetry(p, q))} — the midpoint of the roots.`;
  return { factored, standard, vertex };
}
/** Three cards, but only two distinct expressions in 17 of the 81 states. Say so rather than pretend. */
export function coincidence(p: number, q: number): string | null {
  if (p === q && p + q === 0) return `Both roots sit at x = 0, so all three cards show the same expression, ${factoredForm(p, q)}: there is nothing to multiply out and no square left to complete.`;
  if (p === q) return `Both roots sit at x = ${num(p)}, so the factored card and the vertex card show the same expression, ${factoredForm(p, q)} — a double root means the square is already complete.`;
  if (p + q === 0) return `The roots are opposites, so the two cross terms cancel: the standard card and the vertex card show the same expression, ${expandedForm(p, q)}.`;
  return null;
}
export function completingClause(p: number, q: number) {
  return expandedForm(p, q) === vertexForm(p, q)
    ? `Here the roots sit symmetrically about x = 0, so the square is already complete and completing it leaves ${vertexForm(p, q)} exactly as it stands`
    : `Completing the square rewrites it as ${vertexForm(p, q)}`;
}

/** Worked example: ticket revenue R(d) = (12 - d)(40 + 5d) for a discount of d dollars. */
export const TICKETS = { price: 12, sold: 40, extra: 5 } as const;
export function ticketRevenue(d: number) { return (TICKETS.price - d) * (TICKETS.sold + TICKETS.extra * d); }
export function workedExample() {
  const { price, sold, extra } = TICKETS;
  const a = -extra;                  // leading coefficient of the expanded form
  const b = price * extra - sold;    // coefficient of d
  const c = price * sold;            // revenue with no discount at all
  const inner = b / a;               // d² + (b/a)d once a is pulled out front
  const half = inner / 2;            // the number that goes inside the completed square
  const [best, max] = [-half, c - a * half * half];
  return { a, b, c, inner, half, best, max, bestPrice: price - best, bestSold: sold + extra * best, zeroHigh: price, zeroLow: -sold / extra };
}
export function steps() {
  const ex = workedExample();
  const { price, sold, extra } = TICKETS;
  return [
    { title: "Name what changes", math: `price = ${price} − d dollars,  tickets = ${sold} + ${extra}d`, note: `Every dollar off the $${price} ticket brings ${extra} more buyers, so both factors move together as the discount d moves.` },
    { title: "Revenue is price times tickets", math: `R(d) = (${price} − d)(${sold} + ${extra}d)`, note: `That product is already factored, so revenue is zero exactly when a factor is zero: at d = ${ex.zeroHigh} (the ticket is free) and at d = ${num(ex.zeroLow)}, where raising the price by $${Math.abs(ex.zeroLow)} would empty the room.` },
    { title: "Multiply out to standard form", math: `R(d) = ${num(ex.a)}d²${signed(ex.b, "d")}${signed(ex.c)}`, note: `The constant ${ex.c} is R(0) = ${price} × ${sold}: this week's revenue, with no discount at all.` },
    { title: "Pull the leading coefficient out of the d terms", math: `R(d) = ${num(ex.a)}(d²${signed(ex.inner, "d")})${signed(ex.c)}`, note: `Only the d² and d terms go inside the parentheses, and ${ex.b} ÷ ${num(ex.a)} = ${num(ex.inner)}.` },
    { title: "Complete the square inside the parentheses", math: `d²${signed(ex.inner, "d")} = (d${signed(ex.half)})²${signed(-ex.half * ex.half)}`, note: `Half of ${num(ex.inner)} is ${num(ex.half)}, and ${num(ex.half)} squared is ${ex.half * ex.half}. Adding then subtracting that ${ex.half * ex.half} changes nothing but lets the first two terms fold into one square.` },
    { title: "Distribute, then read the vertex", math: `R(d) = ${num(ex.a)}(d${signed(-ex.best)})²${signed(ex.max)}`, note: `${num(ex.a)} × ${num(-ex.half * ex.half)} = ${ex.max - ex.c}, and ${ex.max - ex.c} + ${ex.c} = ${ex.max}. A square is never negative and ${num(ex.a)} times it is never positive, so R(d) can never beat $${ex.max} — and it reaches $${ex.max} exactly at d = ${ex.best}: price $${ex.bestPrice}, ${ex.bestSold} tickets, ${ex.bestPrice} × ${ex.bestSold} = ${ex.max}. The midpoint of the two zeros, (${ex.zeroHigh} + ${num(ex.zeroLow)})/2 = ${ex.best}, says the very same thing.` },
  ];
}

/** The same cancellation the figure shows at opposite roots, one size up. */
export const GEO = { r: 3, n: 3 } as const;
export const CANCEL = { p: CONTROLS.p.min, q: CONTROLS.q.max } as const;
export function geometricSum(r: number, n: number) { let s = 0; for (let i = 0; i < n; i += 1) s += r ** i; return s; }
/** Only meaningful for r other than 1: at r = 1 the divisor is zero and the sum is simply a times n. */
export function geometricClosed(r: number, n: number) { return (r ** n - 1) / (r - 1); }

export const TRY = { p: 3, q: -7 } as const;
export function tryItOptions() {
  const { p, q } = TRY;
  const mid = (p + q) / 2;
  const options = [
    { value: (q - p) / 2, why: `(${num(q)} − ${num(p)})/2 = ${num((q - p) / 2)} is half the signed gap between the roots, not the point midway between them — you subtracted the roots where you needed to average them.` },
    { value: mid, why: `The axis of symmetry is the average of the roots: (${num(p)} + ${num(q)})/2 = ${num(p + q)}/2 = ${num(mid)}, so the vertex is (${num(mid)}, ${num(vertexY(p, q))}).` },
    { value: p, why: `x = ${num(p)} is a root, where the parabola meets the x-axis, not the line halfway between the two roots.` },
    { value: (p - q) / 2, why: `(${num(p)} + ${Math.abs(q)})/2 drops the minus sign on the root at x = ${num(q)}.` },
  ];
  return { options, correct: options.findIndex((o) => o.value === mid) };
}

export default function Lesson() {
  const [p, setP] = useState(-1);
  const [q, setQ] = useState(3);
  const [shown, setShown] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const stepsId = useId();

  const h = axisOfSymmetry(p, q);
  const k = vertexY(p, q);
  const bounds = plotBounds(p, q);
  const yZero = py(0, bounds);
  const axis = axisLine(p, q);
  const notes = formNotes(p, q);
  const same = coincidence(p, q);
  const ex = workedExample();
  const tryIt = tryItOptions();
  const stepList = steps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A drama club is deciding how much to knock off the price of a ticket. Cut the price and more people come, so the money taken in is price times attendance, and <em>both</em> of those move when the discount moves. Multiply two changing linear amounts and you get a <strong>quadratic</strong>. The useful part is that the same quadratic can be written several ways, and each way hands you a different fact for free: one form tells you when the revenue is zero, another tells you the discount that makes it as large as possible.
      </p>
      <p>
        That is what this chapter means by <strong>structure</strong>. An expression is not a wall of symbols; it is built from parts you can see, name and regroup. The figure below builds a quadratic out of its two roots and then shows the very same function in three costumes at once. Move either root and watch all three rewrite themselves together.
      </p>

      <Figure caption="Step either root left or right. Factored, standard and vertex form always describe the identical parabola — and when two of them turn out to be the identical expression, the figure says so.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={SVG.w} height={SVG.h} viewBox={`0 0 ${SVG.w} ${SVG.h}`} role="img" aria-label={ariaLabel(p, q)}>
            <line x1={SVG.padX} y1={yZero} x2={SVG.w - SVG.padX} y2={yZero} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={px(0)} y1={SVG.padTop} x2={px(0)} y2={SVG.h - SVG.padBottom} stroke="var(--line)" strokeWidth={1.5} />
            {[-4, -2, 2, 4].map((tick) => <text key={tick} x={px(tick)} y={yZero + 15} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{num(tick)}</text>)}
            <line x1={axis.x} y1={axis.y1} x2={axis.x} y2={axis.y2} stroke={VERTEX_COLOR} strokeWidth={1.5} strokeDasharray="4 4" />
            <polyline points={curve(p, q).map((pt) => `${px(pt.x).toFixed(1)},${py(pt.y, bounds).toFixed(1)}`).join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={px(p)} cy={yZero} r={5} fill={ROOT_COLOR} stroke="var(--surface)" strokeWidth={2} />
            <circle cx={px(q)} cy={yZero} r={5} fill={ROOT_COLOR} stroke="var(--surface)" strokeWidth={2} />
            <circle cx={px(h)} cy={py(k, bounds)} r={5} fill={VERTEX_COLOR} stroke="var(--surface)" strokeWidth={2} />
          </svg>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
            <span style={{ color: ROOT_COLOR }}>roots</span>
            <span style={{ color: VERTEX_COLOR }}>vertex, on the dashed axis of symmetry</span>
          </div>

          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            <FormCard color={ROOT_COLOR} name="factored form" body={factoredForm(p, q)} note={notes.factored} />
            <FormCard color={ACCENT} name="standard form" body={expandedForm(p, q)} note={notes.standard} />
            <FormCard color={VERTEX_COLOR} name="vertex form" body={vertexForm(p, q)} note={notes.vertex} />
          </div>
          {same ? <p className="max-w-2xl text-center text-sm text-[var(--ink-soft)]">{same}</p> : null}

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-2 text-center font-mono text-sm">{checkLine(p, q)}</div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="first root p" value={p} min={-4} max={4} color={ROOT_COLOR} onChange={setP} />
            <Stepper label="second root q" value={q} min={-4} max={4} color={ROOT_COLOR} onChange={setQ} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: how big a discount?</h2>
      <p>
        Tickets are ${TICKETS.price} and the club expects {TICKETS.sold} people. Their survey says each dollar of discount brings {TICKETS.extra} extra people. What discount takes in the most money? Reveal the reasoning one move at a time.
      </p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(stepList.length, s + 1))} disabled={shown >= stepList.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown === 0 ? "Show the first step" : shown < stepList.length ? "Next step" : "All steps shown"}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {stepList.length} steps shown</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {stepList.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div>
              <div className="font-mono text-base font-black">{s.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>
        A parabola crosses the x-axis at x = {num(TRY.p)} and at x = {num(TRY.q)}. The zeros alone do not pin down the function — every nonzero multiple a&thinsp;{factoredForm(TRY.p, TRY.q)} crosses at exactly those two points — so take the simplest one, g(x) = {factoredForm(TRY.p, TRY.q)}. Where is its axis of symmetry? (Every one of those multiples has the same answer.)
      </p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={o.value} type="button" onClick={() => setChoice(i)} aria-pressed={choice === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={choice === i ? { background: i === tryIt.correct ? ROOT_COLOR : VERTEX_COLOR, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>x = {num(o.value)}</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">
        {choice === null ? "Pick the line the parabola is symmetric about." : choice === tryIt.correct ? `Correct. ${tryIt.options[choice].why}` : `Not quite. ${tryIt.options[choice].why}`}
      </p>

      <h2>Where this chapter goes</h2>
      <p>
        Each lesson ahead takes one move out of this picture and makes it a skill. <strong>Reading an Expression&apos;s Parts</strong> stays with the first question the figure asks: what does each piece <em>mean</em>? It reads the growth expression P(1 + r)ᵗ the way we just read {factoredForm(p, q)} — as a few named parts, not a string of symbols. <strong>Completing the Square</strong> slows down the rewrite that produced {vertexForm(p, q)} here and turns it into a reliable procedure, one that works even when the roots are not whole numbers.
      </p>
      <p>
        <strong>Summing a Geometric Series</strong> then reuses a move you can already watch in this figure. Step the roots to {num(CANCEL.p)} and {num(CANCEL.q)}: multiplying {factoredForm(CANCEL.p, CANCEL.q)} produces the two cross terms {num(-CANCEL.q)}x and {num(-CANCEL.p)}x, which add to nothing, leaving {expandedForm(CANCEL.p, CANCEL.q)}. That same bookkeeping — every middle term added once and subtracted once — is what makes (r − 1)(1 + r + r²) collapse to r³ − 1, so 1 + {GEO.r} + {GEO.r ** 2} = {geometricSum(GEO.r, GEO.n)} can also be reached as ({GEO.r}³ − 1)/({GEO.r} − 1) = {GEO.r ** GEO.n - 1}/{GEO.r - 1} = {geometricClosed(GEO.r, GEO.n)}. That lesson turns the shortcut into a formula for any number of terms, good whenever r ≠ 1 — at r = 1 the divisor r − 1 is zero and you are just adding the same term over and over.
      </p>

      <MathCheck>
        <p>
          The three expressions in the figure are one function written three ways, so they agree at every input: at x = {CHECK_X} all three give {quadAt(p, q, CHECK_X)}. Reading the parts of {factoredForm(p, q)} tells you what the graph does, because a product is zero exactly when one of its factors is zero, so the parabola {rootSentence(p, q)} (A-SSE.1). Multiplying the factors out gives {expandedForm(p, q)}, where the x-coefficient {num(-(p + q))} is the opposite of the sum of the roots and the constant {num(p * q)} is their product — the structure of the factored form is still visible in the standard form (A-SSE.2). {completingClause(p, q)}; since a square is never negative and this parabola opens upward, the function can never dip below {num(k)}, and it hits {num(k)} exactly when x = {num(h)}, the midpoint of the roots (A-SSE.3). The worked example runs that same rewrite on R(d) = ({TICKETS.price} − d)({TICKETS.sold} + {TICKETS.extra}d) and proves no discount beats ${ex.max}. Choosing the form that makes an answer visible is the chapter&apos;s one idea.
        </p>
      </MathCheck>
    </div>
  );
}

function FormCard({ color, name, body, note }: { color: string; name: string; body: string; note: string }) {
  return (
    <div className="rounded-xl border-l-4 bg-[var(--surface-2)] px-4 py-2" style={{ borderColor: color }}>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{name}</div>
      <div className="font-mono text-lg font-black">{body}</div>
      <div className="mt-1 text-xs text-[var(--ink-faint)]">{note}</div>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={{ color }}>{num(value)}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
