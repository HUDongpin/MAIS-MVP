"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const MARK = "var(--band-upper)";
const POINTS = [
  { v: 1, label: "1" },
  { v: 1.25, label: "1¼" },
  { v: 1.5, label: "1½" },
  { v: 1.75, label: "1¾" },
  { v: 2, label: "2" },
];

export default function Lesson() {
  const [counts, setCounts] = useState([2, 1, 3, 1, 2]);
  const total = counts.reduce((s, n) => s + n, 0);
  const peak = Math.max(...counts);
  const modes = total === 0
    ? []
    : counts.map((c, i) => (c === peak ? i : -1)).filter((i) => i >= 0);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Rulers have marks <strong>between</strong>{" "}the inches — halves and
        quarters. Measuring to these smaller marks gives fraction lengths like{" "}
        <strong>1½</strong>{" "}or <strong>1¾</strong>{" "}inches, which you can plot on a
        line plot.
      </p>

      <Figure caption="Each X is one crayon. The scale is marked in quarter-inches.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end justify-center gap-8" style={{ minHeight: 130 }}>
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <div className="flex flex-col-reverse gap-0.5" style={{ minHeight: 100 }}>
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k} className="text-lg font-black leading-none" style={{ color: MARK }}>✕</span>)}
                </div>
                <div className="h-0.5 w-8 bg-[var(--ink-soft)]" />
                <span className="font-mono text-sm font-bold">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">length in inches</div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {total === 0 ? (
              <>No crayons are plotted yet — add a measurement to begin.</>
            ) : (
              <>
                {total} {total === 1 ? "crayon" : "crayons"} measured. {modes.length === 1 ? "The most common length is" : "The most common lengths are"}{" "}
                <strong>{joinLabels(modes.map((i) => `${POINTS[i].label} in`))}</strong>{" "}
                ({peak} at {modes.length === 1 ? "that length" : "each of those lengths"}).
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-xs font-bold text-[var(--ink-faint)]">{p.label}″</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))} disabled={counts[i] <= 0} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Remove one ${p.label}-inch crayon measurement`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.min(5, v + 1) : v)))} disabled={counts[i] >= 5} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Add one ${p.label}-inch crayon measurement`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Fractions on the ruler</h2>
      <p>
        Between 1 and 2 inches there are marks at 1¼, 1½, and 1¾. Measuring to
        these marks — and plotting them — is how data can include fraction
        lengths, not just whole numbers.
      </p>

      <MathCheck>
        <p>
          Generating measurement data by measuring lengths to the nearest{" "}
          <strong>half</strong>{" "}and <strong>quarter inch</strong>{" "}and showing it
          on a <strong>line plot</strong>{" "}marked in those fractional units is
          3.MD.B.4. The horizontal scale is a fraction number line, so an X above{" "}
          1½ means a crayon measured one and a half inches.
        </p>
      </MathCheck>
    </div>
  );
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
