"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const PART_A = "var(--band-early)";
const PART_B = "var(--band-middle)";
const WHOLE = "var(--band-upper)";

function Dots({ n, color }: { n: number; color: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-1" style={{ maxWidth: 92 }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [whole, setWhole] = useState(5);
  const [partA, setPartA] = useState(2);

  const a = Math.min(partA, whole);
  const b = whole - a;

  const ways = Array.from({ length: whole + 1 }, (_, i) => [i, whole - i]);
  const apples = (count: number) => `${count} ${count === 1 ? "apple" : "apples"}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A whole number can be written as the sum of two whole-number parts. One
        part may be <strong>0</strong>, so a part does not always have to be smaller
        than the whole. Show <strong>{whole}</strong>{" "}as two parts — that is a{" "}
        <strong>number bond</strong>. Put the parts together and you get the whole
        again.
      </p>

      <Figure caption="The top circle is the whole. The two bottom circles are its parts. They always add back to the whole.">
        <div className="flex flex-col items-center gap-6">
          {/* bond diagram */}
          <div className="flex flex-col items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full text-3xl font-black text-white" style={{ background: WHOLE }}>
              {whole}
            </div>
            <svg width="150" height="34" viewBox="0 0 150 34" aria-hidden="true">
              <line x1="75" y1="0" x2="30" y2="34" stroke="var(--line)" strokeWidth="3" />
              <line x1="75" y1="0" x2="120" y2="34" stroke="var(--line)" strokeWidth="3" />
            </svg>
            <div className="flex gap-10">
              <div className="grid h-16 w-16 place-items-center rounded-full text-2xl font-black text-white" style={{ background: PART_A }}>{a}</div>
              <div className="grid h-16 w-16 place-items-center rounded-full text-2xl font-black text-white" style={{ background: PART_B }}>{b}</div>
            </div>
          </div>

          <div className="flex items-start justify-center gap-10">
            <Dots n={a} color={PART_A} />
            <Dots n={b} color={PART_B} />
          </div>

          <div className="font-mono text-2xl font-black">
            <span style={{ color: PART_A }}>{a}</span> +{" "}
            <span style={{ color: PART_B }}>{b}</span> ={" "}
            <span style={{ color: WHOLE }}>{whole}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="Whole" value={whole} min={2} max={10} color={WHOLE} onChange={(v) => { setWhole(v); setPartA((p) => Math.min(p, v)); }} />
            <Stepper label="First part" value={a} min={0} max={whole} color={PART_A} onChange={setPartA} />
          </div>

          {/* all ways to make the whole */}
          <div className="w-full">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              All color-coded part pairs for {whole}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {ways.map(([x, y]) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setPartA(x)}
                  aria-pressed={x === a} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold"
                  style={
                    x === a
                      ? { borderColor: WHOLE, background: "color-mix(in oklab, var(--band-upper) 12%, var(--surface))" }
                      : { borderColor: "var(--line)", color: "var(--ink-soft)" }
                  }
                >
                  {x} + {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Figure>

      <h2>A story for every bond</h2>
      <p>
        Number bonds tell little stories: “I have <strong>{apples(a)}</strong>{" "}that
        are red and <strong>{apples(b)}</strong>{" "}that are green. How many apples
        are there in all?{" "}
        {a} + {b} = <strong>{whole}</strong>.” Set the whole to{" "}
        <strong>10</strong>{" "}to find the <strong>ten-partners</strong>{" "}— the two
        numbers that make a ten.
      </p>

      <MathCheck>
        <p>
          A number ≤ 10 can be <strong>decomposed into pairs in more than one
          way</strong>{" "}(K.OA.A.3) — here, the buttons show {ways.length}{" "}
          color-coded arrangements, including ones with a zero part. For example,{" "}
          {a} + {b} and {b} + {a} use the same two parts in swapped colors and
          make the same whole. The
          bond is a picture of addition and subtraction with objects (K.OA.A.1)
          and of put-together / take-apart word problems (K.OA.A.2). When the
          whole is 10, one part tells you the number that <strong>makes 10</strong>{" "}
          (K.OA.A.4); practicing small bonds builds fluency within 5 (K.OA.A.5).
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
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
