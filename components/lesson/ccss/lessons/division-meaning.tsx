"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const GROUP = "var(--band-upper)";
const DOT = "var(--band-middle)";

export default function Lesson() {
  const [groups, setGroups] = useState(3);
  const [per, setPer] = useState(4);
  const total = groups * per;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Division</strong>{" "}splits a total into equal groups. It answers
        two questions: <strong>how many in each group?</strong>{" "}and{" "}
        <strong>how many groups?</strong>{" "}It is also the mirror of
        multiplication.
      </p>

      <Figure caption="Share the dots equally into the bins. Each bin gets the same amount.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-4">
            {Array.from({ length: groups }, (_, g) => (
              <div key={g} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-2" style={{ borderColor: GROUP }}>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(2, 1.25rem)" }}>
                  {Array.from({ length: per }, (_, i) => <div key={i} className="h-5 w-5 rounded-full" style={{ background: DOT }} />)}
                </div>
                <span className="text-xs font-bold" style={{ color: GROUP }}>{per}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {total} ÷ {groups} = <span style={{ color: GROUP }}>{per}</span>
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
              because {groups} × {per} = {total}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Groups" value={groups} min={2} max={6} onChange={setGroups} />
            <Stepper label="In each group" value={per} min={1} max={6} onChange={setPer} />
          </div>
        </div>
      </Figure>

      <h2>Division undoes multiplication</h2>
      <p>
        Sharing <strong>{total}</strong>{" "}into <strong>{groups}</strong>{" "}equal
        groups gives <strong>{per}</strong>{" "}in each. That is the same as asking{" "}
        <strong>{groups} × ? = {total}</strong>{" "}— the missing factor is the
        answer.
      </p>

      <MathCheck>
        <p>
          A quotient like <strong>{total} ÷ {groups}</strong>{" "}means the number of
          objects in each of {groups} equal shares (3.OA.A.2). It is also an{" "}
          <strong>unknown-factor problem</strong>: {total} ÷ {groups} asks{" "}
          &ldquo;{groups} times what equals {total}?&rdquo; — so the answer is{" "}
          {per}, because {groups} × {per} = {total} (3.OA.B.6). Every division
          fact comes paired with a multiplication fact.
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
