"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const PAIR = "var(--band-middle)";
const LEFT = "var(--band-early)";

export default function Lesson() {
  const [n, setN] = useState(9);
  const isEven = n % 2 === 0;
  const pairs = Math.floor(n / 2);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Line objects up in <strong>pairs</strong>, two by two. If every object
        has a partner, the number is <strong>even</strong>. If one is left all
        alone, it is <strong>odd</strong>.
      </p>

      <Figure caption="Each row is a pair. A lonely object with no partner means the number is odd.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(2, 2rem)" }}>
            {Array.from({ length: n }, (_, i) => {
              const lonely = !isEven && i === n - 1;
              return <div key={i} className="h-8 w-8 rounded-full" style={{ background: lonely ? LEFT : PAIR, gridColumn: lonely ? "1 / span 2" : undefined, justifySelf: lonely ? "center" : undefined }} />;
            })}
          </div>

          <div className="text-center">
            <div className="text-4xl font-black" style={{ color: isEven ? PAIR : LEFT }}>
              {n} is {isEven ? "EVEN" : "ODD"}
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              {isEven
                ? <>{pairs} {pairs === 1 ? "pair" : "pairs"}, none left over — and {n} = {pairs} + {pairs}.</>
                : <>{pairs} {pairs === 1 ? "pair" : "pairs"} and 1 left over, with no partner.</>}
            </p>
          </div>

          <Stepper label="How many" value={n} min={1} max={20} onChange={setN} />
        </div>
      </Figure>

      <h2>Even means two equal groups</h2>
      <p>
        An even number splits into <strong>two equal groups</strong>{" "}with nothing
        left over, so it is the sum of a number with itself:{" "}
        {isEven ? `${n} = ${pairs} + ${pairs}` : `for example 8 = 4 + 4`}. Odd
        numbers always have one extra.
      </p>

      <MathCheck>
        <p>
          A group is <strong>even</strong>{" "}if its objects can be paired with none
          left over (or split into two equal groups), and <strong>odd</strong>{" "}if
          one is left over (2.OA.C.3). Even numbers can be written as a sum of two
          equal addends; odd numbers cannot. The pattern of the last digit (0, 2,
          4, 6, 8 = even) comes straight from this pairing.
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
