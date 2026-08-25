"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  buildFluentWithin20MakingTen,
  buildFluentWithin20Strategy,
  type FluentWithin20FrameCell
} from "@/components/lesson/ccss/lessons/fluentWithin20MakingTen";

const A = "var(--band-early)";
const B = "var(--band-middle)";

function colorForCounter(counter: FluentWithin20FrameCell) {
  if (counter?.source === "first") return A;
  if (counter?.source === "second") return B;
  return "var(--surface-2)";
}

function Frame({
  cells,
  frame,
  kind
}: {
  cells: FluentWithin20FrameCell[];
  frame: "first" | "second" | "ten" | "remainder";
  kind: "operand" | "making-ten";
}) {
  return (
    <div
      data-operand-frame={kind === "operand" ? frame : undefined}
      data-making-ten-frame={kind === "making-ten" ? frame : undefined}
      className="grid gap-1 rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] p-1.5"
      style={{ gridTemplateColumns: "repeat(5, 1.5rem)", gridAutoRows: "1.5rem" }}
    >
      {cells.map((counter, index) => (
        <div
          key={index}
          data-ten-frame-cell={index + 1}
          data-operand-counter-source={kind === "operand" ? counter?.source ?? "empty" : undefined}
          data-making-ten-counter-source={kind === "making-ten" ? counter?.source ?? "empty" : undefined}
          data-making-ten-counter-role={kind === "making-ten" ? counter?.role ?? "empty" : undefined}
          className={`rounded-full border ${counter?.role === "moved" ? "ring-2 ring-white ring-offset-1 ring-offset-[var(--surface)]" : ""}`}
          style={{ borderColor: "var(--line)", background: colorForCounter(counter) }}
        />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(7);
  const sum = a + b;
  const makingTen = buildFluentWithin20MakingTen(a, b);
  const strategy = buildFluentWithin20Strategy(a, b, makingTen);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Fast adders do not count every dot — they use <strong>mental strategies</strong>.
        Doubles, near-doubles, and “make a ten” turn a hard fact into an easy
        one. Soon you just <em>know</em>{" "}the answer.
      </p>

      <Figure caption="Pick two numbers. The best mental strategy shows up automatically.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">
            <span style={{ color: A }}>{a}</span> + <span style={{ color: B }}>{b}</span> = {sum}
          </div>

          <div
            role="img"
            aria-label={`Original addends: the first ten-frame shows ${a} orange counters and the second ten-frame shows ${b} blue counters. ${a} plus ${b} equals ${sum}.`}
            data-operand-ten-frames
            className="flex w-full max-w-xl flex-col items-center gap-2"
          >
            <div aria-hidden="true" className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">
              Original addends
            </div>
            <div aria-hidden="true" className="flex max-w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">
                  First: {a}
                </span>
                <Frame cells={makingTen.originalFirstFrame} frame="first" kind="operand" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">
                  Second: {b}
                </span>
                <Frame cells={makingTen.originalSecondFrame} frame="second" kind="operand" />
              </div>
            </div>
          </div>

          {makingTen.active && makingTen.madeTenFrame && makingTen.remainderFrame && (
            <div
              role="img"
              aria-label={makingTen.ariaLabel}
              data-making-ten-diagram="active"
              className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--band-middle)] bg-[var(--surface-2)] p-3 sm:p-4"
            >
              <div
                data-making-ten-title
                aria-hidden="true"
                className="rounded-full border border-[var(--band-middle)] bg-[var(--surface)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--band-middle)]"
              >
                Another way: Make a ten
              </div>

              <div aria-hidden="true" className="flex max-w-full flex-col items-center justify-center gap-3 sm:flex-row">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">
                    Ten: {makingTen.fillEquation}
                  </span>
                  <Frame cells={makingTen.madeTenFrame} frame="ten" kind="making-ten" />
                </div>

                <div
                  data-making-ten-transfer
                  className="inline-flex min-w-24 items-center justify-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm font-black text-[var(--ink-soft)]"
                >
                  <span className="sm:hidden">↑</span>
                  <span className="hidden sm:inline">←</span>
                  Move {makingTen.moved}
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-[var(--ink-faint)]">
                    Left: {makingTen.remaining}
                  </span>
                  <Frame cells={makingTen.remainderFrame} frame="remainder" kind="making-ten" />
                </div>
              </div>

              <div aria-hidden="true" className="flex max-w-full flex-wrap items-center justify-center gap-2 text-center font-mono text-sm font-black sm:text-base">
                <span data-making-ten-split className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[var(--ink-soft)]">
                  {makingTen.splitEquation}
                </span>
                <span>→</span>
                <span data-making-ten-fill-equation className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[var(--ink-soft)]">
                  {makingTen.fillEquation}
                </span>
                <span>→</span>
                <span data-making-ten-equation className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[var(--ink)]">
                  {makingTen.makeTenEquation}
                </span>
              </div>
            </div>
          )}

          <div className="rounded-xl border-2 px-5 py-3 text-center" style={{ borderColor: B }}>
            <div className="text-sm font-black uppercase tracking-wide" style={{ color: B }}>{strategy.name}</div>
            <div className="text-[15px] text-[var(--ink-soft)]">{strategy.hint}</div>
          </div>

          <output
            data-fluent-within-20-live
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {makingTen.ariaLabel} Automatic strategy: {strategy.name}. {strategy.hint}
          </output>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} min={1} max={10} color={A} onChange={setA} />
            <Stepper label="Second" value={b} min={1} max={10} color={B} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Know it from memory</h2>
      <p>
        With practice, sums within 20 become facts you remember instantly. The
        strategies are the bridge: they help you <em>understand</em>{" "}the fact
        before you memorize it.
      </p>

      <MathCheck>
        <p>
          Fluently adding and subtracting within 20 with mental strategies —{" "}
          <strong>doubles</strong>, <strong>near-doubles</strong>, and{" "}
          <strong>making a ten</strong>{" "}— and knowing sums of two one-digit
          numbers from memory is 2.OA.B.2. Every strategy relies on the same idea:
          break a number apart and put it back together in an easier way.
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-11 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-11 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
