"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [mph, setMph] = useState(60);

  // 60 mi/hr × 5280 ft/mi ÷ 3600 s/hr = ft/s
  const fps = r2((mph * 5280) / 3600);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Units aren&apos;t decoration — they <em>guide the arithmetic</em>. To
        convert, multiply by fractions equal to 1 (like{" "}
        <strong>5280 ft / 1 mi</strong>) and let the unwanted units{" "}
        <strong>cancel</strong>. Track the units and the setup is almost automatic.
      </p>

      <Figure caption="Convert a speed by chaining unit factors. Watch miles and hours cancel, leaving feet per second.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <div className="mx-auto flex min-w-max items-center justify-center gap-1 font-mono text-lg">
              <Frac top={`${mph} mi`} bot="1 hr" hi="mi,hr" />
              <span className="text-2xl">×</span>
              <Frac top="5280 ft" bot="1 mi" hi="mi" />
              <span className="text-2xl">×</span>
              <Frac top="1 hr" bot="3600 s" hi="hr" />
              <span className="text-2xl">=</span>
              <span className="rounded-lg px-3 py-2 text-2xl font-black" style={{ background: "var(--surface-2)", color: ACCENT }}>{fps} ft/s</span>
            </div>
          </FigureScroll>

          <p className="m-0 max-w-lg text-center text-[15px] text-[var(--ink-soft)]">
            The <span style={{ color: ACCENT }}>mi</span> in the numerator cancels
            the <span style={{ color: ACCENT }}>mi</span> in a denominator, and{" "}
            <span style={{ color: ACCENT }}>hr</span> cancels <span style={{ color: ACCENT }}>hr</span> — only ft and s survive.
          </p>

          <Slider label="speed (mph)" value={mph} min={10} max={120} step={5} onChange={setMph} />

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            {mph} mph ≈ <strong style={{ color: ACCENT }}>{fps} ft/s</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">(report to the nearest 0.01 — as precise as the inputs)</span>
          </div>
        </div>
      </Figure>

      <h2>Let the units do the work</h2>
      <p>
        Choosing the right <strong>quantities</strong>{" "}and units is the first
        modeling decision. A speed needs distance ÷ time; a rate of fuel use
        needs volume ÷ distance. And an answer should carry only as many digits
        as the measurements justify — {mph} mph to {fps} ft/s, not 20 decimals.
      </p>

      <MathCheck>
        <p>
          <strong>Dimensional analysis</strong>{" "}uses units to structure a
          multi-step conversion (N-Q.1): multiply by unit ratios so unwanted
          units cancel. Defining appropriate quantities and their units is part
          of building any descriptive model (N-Q.2), and the{" "}
          <strong>precision</strong>{" "}of the reported value should match the
          accuracy of the measurements it came from (N-Q.3).
        </p>
      </MathCheck>
    </div>
  );
}

function Frac({ top, bot, hi }: { top: string; bot: string; hi?: string }) {
  // Strike through the units named in `hi` (a line, not color alone) so the
  // caption's "watch miles and hours cancel" is actually drawn in the chain.
  const units = (hi ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  const mark = (text: string) =>
    text.split(" ").map((word, i) => (
      <span key={i}>
        {i > 0 ? " " : ""}
        {units.includes(word) ? (
          <span className="line-through" style={{ color: ACCENT }}>{word}</span>
        ) : (
          word
        )}
      </span>
    ));
  return (
    <span className="inline-flex flex-col items-center">
      <span className="border-b-2 border-[var(--ink-soft)] px-2 pb-0.5">{mark(top)}</span>
      <span className="px-2 pt-0.5">{mark(bot)}</span>
    </span>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
