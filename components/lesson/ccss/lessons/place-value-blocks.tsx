"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const U = 11; // pixels per unit cube
const FILL = "var(--band-early)";
const EDGE = "color-mix(in oklab, var(--band-early) 55%, #000)";

function HundredFlat() {
  return (
    <svg width={10 * U} height={10 * U} role="img" aria-label="one hundred">
      <rect width={10 * U} height={10 * U} fill={FILL} />
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={i * U}
          y1={0}
          x2={i * U}
          y2={10 * U}
          stroke={EDGE}
          strokeWidth={i % 10 === 0 ? 1.5 : 0.75}
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={i * U}
          x2={10 * U}
          y2={i * U}
          stroke={EDGE}
          strokeWidth={i % 10 === 0 ? 1.5 : 0.75}
        />
      ))}
    </svg>
  );
}

function TenRod() {
  return (
    <svg width={U} height={10 * U} role="img" aria-label="one ten">
      <rect width={U} height={10 * U} fill={FILL} />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={0} y1={i * U} x2={U} y2={i * U} stroke={EDGE} strokeWidth={0.75} />
      ))}
      <rect width={U} height={10 * U} fill="none" stroke={EDGE} strokeWidth={1.5} />
    </svg>
  );
}

function OneUnit() {
  return (
    <svg width={U} height={U} role="img" aria-label="one">
      <rect width={U} height={U} fill={FILL} stroke={EDGE} strokeWidth={1} />
    </svg>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  // "Hundreds" names the place; one press moves a single "hundred".
  const SINGULAR: Record<string, string> = { Hundreds: "hundred", Tens: "ten", Ones: "one" };
  const one = SINGULAR[label] ?? label;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`One fewer ${one}`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-black tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(9, value + 1))}
          disabled={value === 9}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`One more ${one}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Lesson() {
  const [h, setH] = useState(2);
  const [t, setT] = useState(4);
  const [o, setO] = useState(3);

  const value = 100 * h + 10 * t + o;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every whole number is built from <strong>hundreds</strong>,{" "}
        <strong>tens</strong>, and <strong>ones</strong>. A single cube is one.
        Ten ones make a <em>rod</em>{" "}of ten. Ten rods make a <em>flat</em>{" "}of
        one hundred. Change the amounts and watch the number change.
      </p>

      <Figure caption="The digits of a number tell you how many hundreds, tens, and ones to grab.">
        <div className="flex flex-col gap-6">
          <div className="text-center" aria-live="polite">
            <div className="font-black tabular-nums" style={{ fontSize: "3.5rem" }}>
              {value}
            </div>
            <div className="text-[15px] font-semibold text-[var(--ink-soft)]">
              {h} hundred{h === 1 ? "" : "s"} + {t} ten{t === 1 ? "" : "s"} +{" "}
              {o} one{o === 1 ? "" : "s"}
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-faint)]">
              {100 * h} + {10 * t} + {o} = {value}
            </div>
          </div>

          <div className="flex min-h-[130px] flex-wrap items-end justify-center gap-4 rounded-xl bg-[var(--surface-2)] p-4">
            <div className="flex flex-wrap items-end gap-1.5">
              {Array.from({ length: h }, (_, i) => <HundredFlat key={i} />)}
            </div>
            <div className="flex items-end gap-1.5">
              {Array.from({ length: t }, (_, i) => <TenRod key={i} />)}
            </div>
            <div
              className="grid content-end gap-1"
              style={{ gridTemplateColumns: "repeat(2, auto)" }}
            >
              {Array.from({ length: o }, (_, i) => <OneUnit key={i} />)}
            </div>
            {value === 0 && (
              <span className="text-sm text-[var(--ink-faint)]">
                Add some blocks to build a number.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="Hundreds" value={h} onChange={setH} />
            <Stepper label="Tens" value={t} onChange={setT} />
            <Stepper label="Ones" value={o} onChange={setO} />
          </div>
        </div>
      </Figure>

      <h2>Why the position matters</h2>
      <p>
        The <strong>same digit</strong>{" "}means different amounts depending on
        where it sits. In <strong>243</strong>, the 2 is worth two hundreds, but
        in <strong>324</strong>{" "}that same 2 is worth two tens. Position tells you
        the size of each group.
      </p>

      <MathCheck>
        <p>
          A base-ten numeral is shorthand for a sum:{" "}
          <strong>243 = 200 + 40 + 3</strong>. Each place is worth{" "}
          <strong>ten times</strong>{" "}the place to its right, because ten ones
          bundle into one ten and ten tens bundle into one hundred (2.NBT.A.1).
          The blocks are an exact picture of that bundling — no rounding, no
          approximation.
        </p>
      </MathCheck>
    </div>
  );
}
