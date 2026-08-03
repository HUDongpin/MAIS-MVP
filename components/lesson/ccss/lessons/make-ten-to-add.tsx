"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const C1 = "var(--band-early)"; // first number
const C2 = "var(--band-middle)"; // second number (the movers)

function Frame({ cells }: { cells: (string | null)[] }) {
  return (
    <div
      className="grid gap-1.5 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] p-2"
      style={{ gridTemplateColumns: "repeat(5, 2.25rem)", gridAutoRows: "2.25rem" }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className="rounded-full border-2"
          style={{
            borderColor: "var(--line)",
            background: c ?? "var(--surface-2)",
          }}
        />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(5);
  const [madeTen, setMadeTen] = useState(false);

  const sum = a + b;
  const need = 10 - a; // how many more to fill the first ten-frame
  const canMakeTen = need > 0 && need <= b; // a < 10 and enough movers in b
  const rest = b - need; // what is left in the second frame after making ten

  // Build the two ten-frames
  const first: (string | null)[] = Array.from({ length: 10 }, (_, i) => {
    if (i < a) return C1;
    if (madeTen && canMakeTen && i < a + need) return C2; // moved counters
    return null;
  });
  const second: (string | null)[] = Array.from({ length: 10 }, (_, i) => {
    const shown = madeTen && canMakeTen ? rest : b;
    return i < shown ? C2 : null;
  });

  const setNum = (setter: (n: number) => void) => (n: number) => {
    setter(n);
    setMadeTen(false);
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Adding is easy when one number is <strong>10</strong>. So here is a
        trick: <strong>make a ten first</strong>. Fill the first frame up to 10,
        then add the little bit that is left.
      </p>

      <Figure caption="The orange counters are the first number. The blue ones move over to finish the ten.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center font-mono text-3xl font-black">
            <span style={{ color: C1 }}>{a}</span> +{" "}
            <span style={{ color: C2 }}>{b}</span> ={" "}
            <span>{sum}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Frame cells={first} />
            <Frame cells={second} />
          </div>

          {madeTen && canMakeTen && (
            <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
              {a} + {b} = <strong>10</strong>{" "}+ {rest} = <strong>{sum}</strong>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setMadeTen((m) => !m)}
              disabled={!canMakeTen}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: C2 }}
            >
              {madeTen ? "Put them back" : "Make a ten →"}
            </button>
            {!canMakeTen && (
              <span className="text-sm text-[var(--ink-faint)]">
                Pick a first number under 10 with enough to fill it.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={a} min={5} max={9} color={C1} onChange={setNum(setA)} />
            <Stepper label="Second number" value={b} min={2} max={9} color={C2} onChange={setNum(setB)} />
          </div>
        </div>
      </Figure>

      <h2>Break it to make it easy</h2>
      <p>
        {/* When the second number is too small to finish the ten, the split
            story is simply not available — it used to be told anyway, printing
            "take 5 from 2" beside a figure showing 5 + 2 = 7. */}
        {rest >= 0 ? (
          <>
            To make ten from <strong>{a}</strong>, you need <strong>{need}</strong>{" "}
            more. So split the second number: take <strong>{need}</strong>{" "}from{" "}
            <strong>{b}</strong>{" "}to finish the ten, and <strong>{rest}</strong>{" "}
            is left over. Now it is just <strong>10 + {rest}</strong>.
          </>
        ) : (
          <>
            To make ten from <strong>{a}</strong>, you would need <strong>{need}</strong>{" "}
            more — but the second number is only <strong>{b}</strong>, so there is
            not enough to finish the ten. Add them straight away instead:{" "}
            <strong>{a} + {b} = {a + b}</strong>. Try a bigger second number to see
            the make-a-ten trick.
          </>
        )}
      </p>

      <MathCheck>
        <p>
          Making a ten works because you can <strong>regroup</strong>{" "}the addends
          without changing the total (the <strong>associative property</strong>).
          Nothing is reordered here — reordering would be the commutative
          property, which the guided practice on this page names separately.{" "}
          {/* The h2 paragraph above was branched for the too-small case in an
              earlier pass, but this block was not — it kept telling the split
              story, so First = 5 with Second = 2 read "We split 2 into 5 + 2". */}
          {rest >= 0 ? (
            <>
              We split <strong>{b}</strong>{" "}into <strong>{need} + {rest}</strong>,
              add the <strong>{need}</strong>{" "}to <strong>{a}</strong>{" "}to get a full{" "}
              <strong>10</strong>, and then <strong>10 + {rest}</strong>{" "}
              is easy to see.
            </>
          ) : (
            <>
              Here <strong>{b}</strong>{" "}is smaller than the <strong>{need}</strong>{" "}
              needed to finish the ten, so there is nothing to split — add
              directly: <strong>{a} + {b} = {a + b}</strong>.
            </>
          )}{" "}
          The total never changes — we only regrouped the same
          counters (1.OA.C.6).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
