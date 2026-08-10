"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TENC = "var(--band-upper)";
const ONEC = "var(--band-early)";

const placeCount = (count: number, singular: "ten" | "one") =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

function TenRod() {
  return (
    <div className="grid overflow-hidden rounded border-2 border-white/60" style={{ gridTemplateRows: "repeat(10, 1fr)", width: 18, height: 180, background: TENC }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="border-b border-white/40" />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [n, setN] = useState(34);
  const tens = Math.floor(n / 10);
  const ones = n % 10;

  const set = (v: number) => setN(Math.max(10, Math.min(99, v)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Big numbers are built from <strong>tens</strong>{" "}and <strong>ones</strong>.
        A tall rod is a bundle of ten. The loose squares are the ones. Together
        they make any two-digit number.
      </p>

      <Figure caption="Each tall rod is one ten. Count the rods and the loose ones.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl font-black">{n}</div>

          <div className="flex min-h-[190px] items-end justify-center gap-6">
            <div className="flex items-end gap-1.5">
              {Array.from({ length: tens }, (_, i) => <TenRod key={i} />)}
              {tens === 0 && <span className="text-sm text-[var(--ink-faint)]">no tens</span>}
            </div>
            <div className="grid content-end gap-1" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              {Array.from({ length: ones }, (_, i) => (
                <div key={i} className="h-4 w-4 rounded-sm" style={{ background: ONEC }} />
              ))}
            </div>
          </div>

          <div className="font-mono text-2xl font-black">
            {n} = <span style={{ color: TENC }}>{tens} {tens === 1 ? "ten" : "tens"}</span> +{" "}
            <span style={{ color: ONEC }}>{ones} {ones === 1 ? "one" : "ones"}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => set(n - 10)} disabled={n < 20} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: TENC }}>− 10</button>
            <button type="button" onClick={() => set(n - 1)} disabled={n <= 10} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold disabled:opacity-40">− 1</button>
            <span className="w-12 text-center text-2xl font-black tabular-nums">{n}</span>
            <button type="button" onClick={() => set(n + 1)} disabled={n >= 99} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold disabled:opacity-40">+ 1</button>
            <button type="button" onClick={() => set(n + 10)} disabled={n > 89} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: TENC }}>+ 10</button>
          </div>
          <p className="m-0 text-sm text-[var(--ink-faint)]">
            Try <strong>+10</strong>{" "}and <strong>−10</strong>: only the tens
            change — the ones stay the same.
          </p>
        </div>
      </Figure>

      <h2>Ten more, ten less</h2>
      <p>
        Adding ten adds one more rod; the ones do not move. That is why{" "}
        {/* Clamping made both claims false near the ends: at n = 95 it said
            "10 more than 95 is 99". State them only where they hold. */}
        {n + 10 <= 99 && <><strong>10 more than {n}</strong>{" "}is {n + 10}{n - 10 >= 10 ? " and " : " — quick mental math."}</>}
        {n - 10 >= 10 && <><strong>10 less</strong>{" "}is {n - 10} — quick mental math.</>}
      </p>

      <MathCheck>
        <p>
          A two-digit number is <strong>some tens and some ones</strong>{" "}
          (1.NBT.B.2): {n} is {placeCount(tens, "ten")} and {placeCount(ones, "one")}. Because the ones never
          change, you can find <strong>10 more or 10 less</strong>{" "}in your head by
          changing the number of tens (1.NBT.C.5). When adding 10 crosses 99,
          ten tens regroup as one hundred, so the hundreds place changes too.
        </p>
      </MathCheck>
    </div>
  );
}
