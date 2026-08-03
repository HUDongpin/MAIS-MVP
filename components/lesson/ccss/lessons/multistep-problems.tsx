"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const S1 = "var(--band-middle)";
const S2 = "var(--band-upper)";

export default function Lesson() {
  const [students, setStudents] = useState(53);
  const [perVan, setPerVan] = useState(8);

  const vans = Math.floor(students / perVan);
  const leftover = students % perVan;
  const vansNeeded = leftover > 0 ? vans + 1 : vans;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Real problems often take several steps, and division does not always come
        out even. The <strong>remainder</strong>{" "}is what is left over — and what
        you do with it depends on the question.
      </p>

      <Figure caption="Fill each van with the same number. The leftover decides how many vans you really need.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {students} students go on a trip. Each van holds {perVan}. How many
            vans are needed so everyone has a seat?
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: vansNeeded }, (_, i) => {
              const filled = i < vans ? perVan : leftover;
              return (
                <div key={i} className="flex flex-col items-center gap-1 rounded-lg border-2 p-1.5" style={{ borderColor: i < vans ? S1 : S2 }}>
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(4, 0.5rem)" }}>
                    {Array.from({ length: perVan }, (_, k) => <div key={k} className="h-2 w-2 rounded-full" style={{ background: k < filled ? (i < vans ? S1 : S2) : "var(--surface-2)" }} />)}
                  </div>
                  <span className="text-[10px] font-bold">{filled}</span>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <div className="font-mono text-xl font-black">{students} ÷ {perVan} = {vans} R {leftover}</div>
            <p className="mt-1 max-w-md text-[15px] text-[var(--ink-soft)]">
              {leftover > 0
                ? <>{vans} full vans carry {vans * perVan}, and {leftover} student{leftover === 1 ? "" : "s"} still need a seat — so you need <strong style={{ color: S2 }}>{vansNeeded} vans</strong>{" "}(round up!).</>
                : <>It comes out even: exactly <strong style={{ color: S2 }}>{vans} vans</strong>.</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Students" value={students} min={10} max={80} onChange={setStudents} />
            <Stepper label="Per van" value={perVan} min={4} max={12} onChange={setPerVan} />
          </div>
        </div>
      </Figure>

      <h2>What to do with the remainder</h2>
      <p>
        {leftover > 0 ? (
          <>Here the leftover means you need one <em>more</em>{" "}van, so you round up.</>
        ) : (
          <>Here the division comes out even, so there is no leftover to round up — {vans} vans hold everyone exactly.</>
        )}{" "}
        In other problems the remainder might be the answer, or you might drop it.
        Estimating first ({students} ÷ {perVan} is about {Math.round(students / perVan)}) helps you check.
      </p>

      <MathCheck>
        <p>
          Multistep word problems use the four operations, and answers must be
          reasonable — checked with <strong>estimation</strong>{" "}and mental math
          (4.OA.A.3). When you divide, the <strong>remainder</strong>{" "}must be
          interpreted: here {students} ÷ {perVan} = {vans}
          {leftover > 0 ? (
            <> R {leftover}, and since every student needs a seat you round up to {vansNeeded}.</>
          ) : (
            <> exactly, so no rounding is needed — {vansNeeded} vans seat everyone.</>
          )}
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
