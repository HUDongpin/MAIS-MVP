"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TENS = "var(--band-early)";
const FORWARD = "var(--band-middle)";

export default function Lesson() {
  const [showTens, setShowTens] = useState(true);
  const [start, setStart] = useState(24);

  const forward = [start, start + 1, start + 2, start + 3].filter((n) => n <= 100);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The counting numbers keep going: 1, 2, 3, all the way to{" "}
        <strong>100</strong>. This chart holds all of them. Count by{" "}
        <strong>ones</strong>{" "}across each row, or jump by{" "}
        <strong>tens</strong>{" "}down the last column.
      </p>

      <Figure caption="Orange squares are the tens. Blue squares show counting forward from your number.">
        <div className="flex flex-col items-center gap-6">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))", maxWidth: 460 }}
          >
            {Array.from({ length: 100 }, (_, i) => {
              const n = i + 1;
              const isTen = showTens && n % 10 === 0;
              const isForward = forward.includes(n);
              return (
                <div
                  key={n}
                  className="grid aspect-square place-items-center rounded-md text-[11px] font-bold tabular-nums sm:text-xs"
                  style={{
                    background: isForward
                      ? FORWARD
                      : isTen
                        ? TENS
                        : "var(--surface-2)",
                    color: isForward || isTen ? "white" : "var(--ink-soft)",
                    outline: n === start ? "2px solid var(--ink)" : "none",
                  }}
                >
                  {n}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setShowTens((s) => !s)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: showTens ? TENS : "var(--ink-faint)" }}
            >
              {showTens ? "Hide tens (10, 20, 30…)" : "Show tens (10, 20, 30…)"}
            </button>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                Count forward from <span className="text-[var(--ink)]">{start}</span>
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStart((n) => Math.max(1, n - 1))} disabled={start <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Lower start number">−</button>
                <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: FORWARD }}>{start}</span>
                <button type="button" onClick={() => setStart((n) => Math.min(97, n + 1))} disabled={start >= 97} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Raise start number">+</button>
              </div>
            </div>
          </div>

          <p className="m-0 text-center text-lg font-bold">
            Start at {start}, then keep going:{" "}
            <span style={{ color: FORWARD }}>{forward.join(", ")}…</span>
          </p>
        </div>
      </Figure>

      <h2>Counting never needs to start over</h2>
      <p>
        You do not have to go back to 1 every time. You can start at any number
        and <strong>count on</strong>{" "}from there — {start}, {start + 1},{" "}
        {start + 2}…
      </p>

      <MathCheck>
        <p>
          The counting sequence to <strong>100</strong>{" "}works by ones and by
          tens (K.CC.A.1): each row adds one, each step down a column adds ten.
          And counting can begin from <em>any</em>{" "}number, not just 1 —{" "}
          <strong>counting forward from a given number</strong>{" "}(K.CC.A.2) is the
          idea that later becomes addition.
        </p>
      </MathCheck>
    </div>
  );
}
