"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Unknown = "product" | "group" | "count";
const A = "var(--band-upper)";

export default function Lesson() {
  const [groups, setGroups] = useState(4);
  const [per, setPer] = useState(5);
  const [unknown, setUnknown] = useState<Unknown>("product");
  const total = groups * per;

  const problem =
    unknown === "product" ? { text: `${groups} baskets have ${per} apples each. How many apples in all?`, eq: `${groups} × ${per} = ?`, ans: total }
    : unknown === "count" ? { text: `${total} apples are split into ${groups} equal baskets. How many in each basket?`, eq: `${total} ÷ ${groups} = ?`, ans: per }
    : { text: `${total} apples are put ${per} to a basket. How many baskets?`, eq: `${total} ÷ ${per} = ?`, ans: groups };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplication and division live in the same stories. Sometimes you know
        the groups and need the <strong>total</strong>. Sometimes you know the
        total and need the <strong>size of a group</strong>{" "}or the{" "}
        <strong>number of groups</strong>. The unknown can be anywhere.
      </p>

      <Figure caption="Same apples, three different questions. Each is answered by × or ÷.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {([["product", "find the total"], ["count", "find each group"], ["group", "find the groups"]] as [Unknown, string][]).map(([u, lbl]) => (
              <button key={u} type="button" onClick={() => setUnknown(u)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={unknown === u ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">{problem.text}</p>

          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: groups }, (_, g) => (
              <div key={g} className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed p-1.5 text-lg" style={{ borderColor: A }}>
                <div className="flex flex-wrap justify-center" style={{ width: "3rem" }}>
                  {Array.from({ length: per }, (_, i) => <span key={i}>🍎</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">{problem.eq.replace("?", "")}= <span style={{ color: A }}>{problem.ans}</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Baskets" value={groups} min={2} max={6} onChange={setGroups} />
            <Stepper label="Apples each" value={per} min={1} max={6} onChange={setPer} />
          </div>
        </div>
      </Figure>

      <h2>Find the missing number</h2>
      <p>
        Every version uses the same three numbers: {groups}, {per}, and {total}.
        Knowing any two lets you find the third with multiplication or division.
      </p>

      <MathCheck>
        <p>
          Solving multiplication and division word problems within 100 — equal
          groups, arrays, and comparisons — is 3.OA.A.3. The unknown can be the{" "}
          <strong>product</strong>{" "}({groups} × {per} = {total}), the{" "}
          <strong>group size</strong>{" "}({total} ÷ {groups} = {per}), or the{" "}
          <strong>number of groups</strong>{" "}({total} ÷ {per} = {groups}). Finding
          that unknown in an equation is 3.OA.A.4.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
