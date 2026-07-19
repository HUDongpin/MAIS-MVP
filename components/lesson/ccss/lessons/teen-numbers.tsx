"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TEN = "var(--band-upper)";
const ONES = "var(--band-early)";

function Frame({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="grid gap-1.5 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] p-2" style={{ gridTemplateColumns: "repeat(5, 2rem)", gridAutoRows: "2rem" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="rounded-full border-2" style={{ borderColor: "var(--line)", background: i < filled ? color : "var(--surface-2)" }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [n, setN] = useState(14);
  const ones = n - 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The teen numbers all have a secret: they are just a{" "}
        <strong>ten</strong>{" "}and <strong>some more</strong>. Fill one whole
        ten-frame, and the leftover dots are the extra ones.
      </p>

      <Figure caption="A full frame of ten, plus a few extra ones. That is what a teen number is.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl font-black">{n}</div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Frame filled={10} color={TEN} />
              <span className="text-sm font-bold" style={{ color: TEN }}>1 ten</span>
            </div>
            <span className="text-3xl font-black text-[var(--ink-faint)]">+</span>
            <div className="flex flex-col items-center gap-1">
              <Frame filled={ones} color={ONES} />
              <span className="text-sm font-bold" style={{ color: ONES }}>{ones} {ones === 1 ? "one" : "ones"}</span>
            </div>
          </div>

          <div className="font-mono text-2xl font-black">
            {n} = <span style={{ color: TEN }}>10</span> +{" "}
            <span style={{ color: ONES }}>{ones}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Teen number</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setN((v) => Math.max(11, v - 1))} disabled={n <= 11} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Smaller number">−</button>
              <span className="w-10 text-center text-2xl font-black tabular-nums">{n}</span>
              <button type="button" onClick={() => setN((v) => Math.min(19, v + 1))} disabled={n >= 19} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Bigger number">+</button>
            </div>
          </div>
        </div>
      </Figure>

      <h2>Ten and some more</h2>
      <p>
        Say it out loud: <strong>{n}</strong>{" "}is <strong>ten</strong>{" "}and{" "}
        <strong>{ones}</strong>{" "}more. Seeing the ten as one full group is the
        first big step toward place value.
      </p>

      <MathCheck>
        <p>
          Each number from 11 to 19 is <strong>composed of one ten and some
          further ones</strong>{" "}(K.NBT.A.1): {n} = 10 + {ones}. Bundling ten ones
          into a single “ten” is the foundation of the base-ten system that all
          later place-value work is built on.
        </p>
      </MathCheck>
    </div>
  );
}
