"use client";

import { useId, useState } from "react";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";

const ACCENT = "var(--band-middle)";
const BLUE = "var(--band-upper)";
const GOLD = "var(--band-early)";
const TINT = "color-mix(in oklab, var(--band-middle) 14%, var(--surface))";

/** Control bounds. Every control declares these inline as well; the test checks the two agree. */
export const SIDE_MIN = 2, SIDE_MAX = 5;
export const GOLD_MIN = 1, GOLD_MAX = 4;
export const PANEL_MIN = 1, PANEL_MAX = 6;
/** Tiles in the art club's box — the constant behind this chapter's inequality. */
export const BOX = 100;

/* ---- pure math: the test exercises every one of these across the whole control grid ---- */
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
/** A square panel of side s takes s times s, written s squared, blue tiles. */
export const blueTiles = (s: number) => s * s;
/** One panel: s squared blue tiles together with g gold tiles. */
export const perPanel = (s: number, g: number) => blueTiles(s) + g;
/** n panels counted panel by panel: n(s squared + g). */
export const totalGrouped = (s: number, g: number, n: number) => n * perPanel(s, g);
/** n panels counted color by color: n times s squared, plus n times g. */
export const totalSpread = (s: number, g: number, n: number) => n * blueTiles(s) + n * g;
/** The largest whole number of panels with n(s squared + g) at most box. */
export const maxPanels = (s: number, g: number, box = BOX) => Math.floor(box / perPanel(s, g));
export function boxText(s: number, g: number, n: number, box = BOX) {
  const used = totalGrouped(s, g, n);
  if (used <= box) return `${n} ${plural(n, "panel")} use ${used} of the ${box}, leaving ${box - used}.`;
  return `${n} ${plural(n, "panel")} would need ${used}, which is ${used - box} more than the box holds.`;
}
export const figureLabel = (s: number, g: number, n: number) =>
  `Mural plan: ${n} ${plural(n, "panel")}, each a ${s} by ${s} square of ${blueTiles(s)} blue ${plural(blueTiles(s), "tile")} above ${g} gold ${plural(g, "tile")}, ${totalGrouped(s, g, n)} ${plural(totalGrouped(s, g, n), "tile")} altogether`;

/* ---- figure geometry (SVG units); every coordinate is derived through these with padding ---- */
export const W = 520, H = 140;
export const PAD_X = 20, TOP = 24, CELL = 14, GOLD_GAP = 6, GAP = 12, LABEL_DY = 13, LABEL_SIZE = 10;
export const panelWidth = (s: number) => s * CELL;
export const goldRows = (s: number, g: number) => Math.ceil(g / s);
export const blockHeight = (s: number, g: number) => s * CELL + GOLD_GAP + goldRows(s, g) * CELL;
export const rowWidth = (s: number, n: number) => n * panelWidth(s) + (n - 1) * GAP;
export const startX = (s: number, n: number) => Math.max(PAD_X, (W - rowWidth(s, n)) / 2); // centred, with a padding floor
export const panelX = (s: number, n: number, i: number) => startX(s, n) + i * (panelWidth(s) + GAP);
/** Tile j of a panel: s per row, left to right then top to bottom; gold starts one GOLD_GAP below the square. */
export const cellX = (s: number, j: number) => (j % s) * CELL, cellRow = (s: number, j: number) => Math.floor(j / s);
export const blueY = (s: number, j: number) => TOP + cellRow(s, j) * CELL, goldY = (s: number, j: number) => TOP + s * CELL + GOLD_GAP + cellRow(s, j) * CELL;

/* ---- worked example: every number it shows is computed from these four constants ---- */
export const WE = { side: 4, gold: 3, tiles: 76, box: BOX } as const;
export function workedExample(w: { side: number; gold: number; tiles: number; box: number } = WE) {
  const blue = blueTiles(w.side);
  const per = blue + w.gold;
  const panels = w.tiles / per;
  const fit = Math.floor(w.box / per);
  const left = w.box - fit * per;
  const steps = [
    { title: "Count one panel with an exponent", text: `The blue part is a ${w.side} by ${w.side} square, so it takes ${w.side}² = ${w.side} × ${w.side} = ${blue} blue tiles. With the gold ones, a panel is ${blue} + ${w.gold} = ${per} tiles.` },
    { title: "Write the rule for n panels", text: `Let n stand for the number of panels. Grouped by panel that is n(${w.side}² + ${w.gold}) = ${per}n; split by color it is ${blue}n + ${w.gold}n. The two forms agree for every n, so either may be used.` },
    { title: "Turn the question into an equation", text: `The ${w.tiles} tiles already on the wall mean ${per}n = ${w.tiles}. An equation is a question: which value of n makes the two sides equal?` },
    { title: "Undo the multiplication", text: `n was multiplied by ${per}, so divide both sides by ${per}: n = ${w.tiles} ÷ ${per} = ${panels}. Substitute to check: ${per} × ${panels} = ${per * panels}.` },
    { title: "Make it a constraint instead", text: `The whole box holds ${w.box} tiles, and a box sets a limit rather than a target, so the sentence becomes ${per}n ≤ ${w.box}. Since ${per} × ${fit + 1} = ${per * (fit + 1)} is too many, n ≤ ${fit}: ${fit} panels use ${fit * per} and leave ${left}, ${per - left} ${plural(per - left, "tile")} short of one more.` },
  ];
  return { blue, per, panels, fit, left, steps };
}

/* ---- try it: the correct choice is located by evaluating, never by hand-picking an index ---- */
export const TRY = { panels: 5, gold: 3 } as const;
export const trySamples = [1, 2, 3, 4, 5, 6], tryTarget = (s: number) => TRY.panels * (s * s + TRY.gold);
export const TRY_CHOICES: { text: string; at: (s: number) => number; why: string }[] = [
  { text: `${TRY.panels}s² + ${TRY.gold}`, at: (s) => TRY.panels * s * s + TRY.gold, why: `That multiplies only the blue tiles by ${TRY.panels}. Every panel also brings ${TRY.gold} gold, so those get multiplied too.` },
  { text: `${TRY.panels}s² + ${TRY.panels * TRY.gold}`, at: (s) => TRY.panels * s * s + TRY.panels * TRY.gold, why: `Yes. A panel holds s² + ${TRY.gold}, and ${TRY.panels}(s² + ${TRY.gold}) = ${TRY.panels}s² + ${TRY.panels * TRY.gold}.` },
  { text: `s² + ${TRY.panels * TRY.gold}`, at: (s) => s * s + TRY.panels * TRY.gold, why: `That counts the blue square of a single panel; ${TRY.panels} panels hold ${TRY.panels}s² blue.` },
  { text: `(${TRY.panels}s)² + ${TRY.panels * TRY.gold}`, at: (s) => (TRY.panels * s) ** 2 + TRY.panels * TRY.gold, why: `(${TRY.panels}s)² means ${TRY.panels}s × ${TRY.panels}s = ${TRY.panels * TRY.panels}s². The ${TRY.panels} multiplies the square; it does not move inside it.` },
];
export const tryCorrectIndex = (samples: number[] = trySamples) =>
  TRY_CHOICES.findIndex((choice) => samples.every((s) => choice.at(s) === tryTarget(s)));

export default function Lesson() {
  const [s, setS] = useState(3);
  const [g, setG] = useState(2);
  const [n, setN] = useState(4);
  const [revealed, setRevealed] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const blue = blueTiles(s);
  const per = perPanel(s, g);
  const total = totalGrouped(s, g, n);
  const fit = maxPanels(s, g);
  const cols = Array.from({ length: PANEL_MAX }, (_, k) => k + 1);
  const we = workedExample();
  const correct = tryCorrectIndex();
  const cards: { head: string; value: string; note: string; color: string }[] = [
    { head: "One panel", value: `${s}² + ${g} = ${per}`, note: `${s} × ${s} = ${blue} blue, plus ${g} gold`, color: BLUE },
    { head: `${n} ${plural(n, "panel")}`, value: `${total}`, note: `${plural(total, "tile")} in all: ${n} × ${per}`, color: ACCENT },
    { head: `Box of ${BOX} tiles`, value: `n ≤ ${fit}`, note: boxText(s, g, n), color: GOLD },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The art club is tiling a mural out of identical square panels: a square of blue tiles with a few gold tiles below it.
        Nobody has settled yet on how big a panel should be, how much gold it gets, or how many panels the wall can take — so
        each of those enters the plan as a <strong>letter</strong> instead of a number. A square of side <strong>s</strong> needs{" "}
        <strong>s²</strong> blue tiles, one panel needs <strong>s² + g</strong>, and <strong>n</strong> panels need{" "}
        <strong>n(s² + g)</strong>. That is an <strong>expression</strong>: a rule with room in it for numbers you have not chosen.
      </p>
      <p>
        This chapter is about what you can do with such a rule — rewrite it in a different but always-equal form, evaluate it once
        the numbers arrive, set it equal to a total and <em>solve</em> for the missing value, or compare it against a limit, since
        the club owns only {BOX} tiles.
      </p>

      <Figure caption="Change the panel size, the gold tiles, or the number of panels. Both ways of counting, the table, and the box limit all follow from the same rule.">
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(s, g, n)}>
            {Array.from({ length: n }, (_, i) => (
              <g key={i}>
                {Array.from({ length: blue }, (_, j) => (
                  <rect key={`b${j}`} x={panelX(s, n, i) + cellX(s, j)} y={blueY(s, j)} width={CELL - 2} height={CELL - 2} rx={2} fill={BLUE} opacity={0.85} />
                ))}
                {Array.from({ length: g }, (_, j) => (
                  <rect key={`g${j}`} x={panelX(s, n, i) + cellX(s, j)} y={goldY(s, j)} width={CELL - 2} height={CELL - 2} rx={2} fill={GOLD} />
                ))}
                <text x={panelX(s, n, i) + panelWidth(s) / 2} y={TOP + blockHeight(s, g) + LABEL_DY} textAnchor="middle" fontSize={LABEL_SIZE} fontFamily="var(--font-mono)" fill="var(--ink-faint)">{blue}+{g}</text>
              </g>
            ))}
          </svg>

          <div className="w-full max-w-md rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-base font-black" style={{ color: ACCENT }}>{n}({s}² + {g}) = {n} × {per} = {total}</div>
            <div className="mt-1 font-mono text-base font-black">{n} × {s}² + {n} × {g} = {n * blue} + {n * g} = {totalSpread(s, g, n)}</div>
            <div className="mt-1 text-xs text-[var(--ink-soft)]">Count panel by panel or color by color — the same {total} {plural(total, "tile")} either way.</div>
          </div>

          <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
            {cards.map((card) => (
              <div key={card.head} className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-center">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{card.head}</div>
                <div className="font-mono text-lg font-black" style={{ color: card.color }}>{card.value}</div>
                <div className="text-xs text-[var(--ink-soft)]">{card.note}</div>
              </div>
            ))}
          </div>

          <FigureScroll>
            <table className="mx-auto border-collapse text-center font-mono text-sm">
              <thead><tr>
                  <th scope="col" className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Panels (n)</th>
                  {cols.map((k) => (
                    <th key={k} scope="col" className="w-12 px-2 py-1" style={k === n ? { background: TINT, color: ACCENT } : undefined}>{k}</th>
                  ))}
              </tr></thead>
              <tbody><tr>
                  <th scope="row" className="px-2 py-1 text-left text-xs font-semibold">Tiles used</th>
                  {cols.map((k) => (
                    <td key={k} className="px-2 py-1 tabular-nums" style={k === n ? { background: TINT, fontWeight: 800 } : undefined}>{k * per}</td>
                  ))}
              </tr></tbody>
            </table>
          </FigureScroll>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Tiles per side" value={s} min={2} max={5} color={BLUE} onChange={setS} />
            <Stepper label="Gold tiles per panel" value={g} min={1} max={4} color={GOLD} onChange={setG} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Panels: <span className="text-[var(--ink)]">{n}</span></span>
              <input type="range" min={1} max={6} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-40 accent-[var(--band-middle)]" aria-label="Number of panels" />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Worked example: from a panel to an answer</h2>
      <p>
        The club settles on panels: a <strong>{WE.side} by {WE.side}</strong> square of blue tiles with <strong>{WE.gold} gold
        tiles</strong> below. Its wall already carries <strong>{WE.tiles}</strong> tiles. How many panels is that, and how many will the whole {BOX}-tile box allow?
      </p>
      <div className="card p-4">
        <ol id={stepsId} className="m-0 list-decimal space-y-2 pl-6" aria-live="polite">
          {we.steps.slice(0, revealed).map((step) => (
            <li key={step.title}><strong>{step.title}.</strong> {step.text}</li>
          ))}
        </ol>
        {revealed === 0 && <p className="m-0 text-sm text-[var(--ink-soft)]">Reveal the reasoning one step at a time.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setRevealed((r) => Math.min(we.steps.length, r + 1))} disabled={revealed >= we.steps.length} aria-expanded={revealed > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-[var(--brand-ink)] disabled:opacity-40" style={{ background: ACCENT }}>
            {revealed >= we.steps.length ? "All steps shown" : `Next step (${revealed + 1} of ${we.steps.length})`}
          </button>
          <button type="button" onClick={() => setRevealed(0)} disabled={revealed === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>
        Another mural uses <strong>{TRY.panels} panels</strong>, each a square of side <em>s</em> with <strong>{TRY.gold} gold
        tiles</strong>. Which expression counts all of its tiles?
      </p>
      <div className="flex flex-wrap gap-2">
        {TRY_CHOICES.map((choice, i) => (
          <button key={choice.text} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border-2 px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { background: `color-mix(in oklab, ${i === correct ? BLUE : "var(--ink-faint)"} 14%, var(--surface))`, borderColor: i === correct ? BLUE : "var(--ink-faint)", color: "var(--ink)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            {choice.text}
          </button>
        ))}
      </div>
      {pick !== null && (
        <p className="mt-3 rounded-xl px-4 py-3 text-[15px]" style={{ background: TINT }} role="status">
          <strong>{pick === correct ? "Correct." : "Not quite."}</strong> {TRY_CHOICES[pick].why}
        </p>
      )}

      <h2>Where this chapter goes</h2>
      <p>
        Each lesson ahead slows down one piece of the mural rule. <strong>Exponents</strong> stays with s²: what the small raised
        number means and how to evaluate it. <strong>Variables &amp; Expressions</strong> is about writing a rule with a letter in
        it and substituting a value. <strong>Equivalent Expressions</strong> is the reason n(s² + g) and n·s² + n·g are
        interchangeable — the distributive property and like terms. <strong>One-Step Equations</strong> answers &ldquo;which value
        makes this true?&rdquo; by undoing a single operation. <strong>Inequalities</strong> handles limits like the {BOX}-tile box
        and graphs their solutions on a number line. <strong>Dependent &amp; Independent Variables</strong> comes back to the table
        above, where the panels you choose decide the total you get.
      </p>

      <MathCheck>
        <p>
          An exponent is shorthand for repeated multiplication, so a panel of side {s} holds {s}² = {s} × {s} = {blue} blue tiles
          (6.EE.A.1). Letters let a single rule describe every mural the club might build (6.EE.B.6), and choosing values for those
          letters and computing is what <em>evaluating</em> an expression means (6.EE.A.2): at s = {s}, g = {g}, n = {n} the rule
          gives {total}. Counting panel by panel gives n(s² + g) and counting color by color gives n·s² + n·g; the distributive
          property guarantees those two agree (6.EE.A.3), and agreeing at <em>every</em> value of the letters is exactly what makes
          expressions equivalent (6.EE.A.4).
        </p>
        <p>
          The same rule answers questions about any panel, so say which one first. For the worked example above — side {WE.side}{" "}
          with {WE.gold} gold, hence {WE.side}² + {WE.gold} = {we.per} tiles a panel — asking which n uses exactly {WE.tiles} tiles
          turns that rule into the equation {we.per}n = {WE.tiles}. Solving means finding the value that makes the two sides equal
          (6.EE.B.5); dividing both sides by {we.per} undoes the multiplication and gives n = {we.panels}, the px = q case
          (6.EE.B.7). For the panel you have set right now, {s}² + {g} = {per}, a box holding only {BOX} tiles is a constraint
          rather than an exact demand, so it becomes the inequality n({s}² + {g}) ≤ {BOX}, whose whole-number solutions run from 0
          to {fit} (6.EE.B.8). The table reads that same rule as a relationship: n is the independent variable you set, and the total is
          the dependent variable the rule returns (6.EE.C.9).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
