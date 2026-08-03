"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const TOP = "var(--band-early)";
const BOT = "var(--band-middle)";
const UNIT = 30; // px per length unit

export default function Lesson() {
  const [top, setTop] = useState(6);
  const [bot, setBot] = useState(9);

  const topWord = top > bot ? "longer" : top < bot ? "shorter" : "the same length as";
  const botWord = bot > top ? "longer" : bot < top ? "shorter" : "the same length as";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        How long is long? To compare two things, we line them up at the same
        starting line. The one that reaches further is <strong>longer</strong>;
        the one that stops sooner is <strong>shorter</strong>.
      </p>

      <Figure caption="Both pencils start at the same line on the left, so the tips show which is longer.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 10 * UNIT + 40 }}>
              <Bar label="Red pencil" units={top} color={TOP} />
              <Bar label="Blue pencil" units={bot} color={BOT} />
              {/* start line */}
              <div className="relative h-0">
                <div className="absolute -top-[92px] left-[6px] h-[92px] w-0.5 bg-[var(--ink-faint)]" />
              </div>
            </div>
          </FigureScroll>

          <p className="m-0 text-center text-xl font-bold">
            The <span style={{ color: TOP }}>red pencil</span> is{" "}
            <strong>{topWord}</strong>{" "}
            {top === bot ? "" : "than"} the{" "}
            <span style={{ color: BOT }}>blue pencil</span>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Slider label="Red length" value={top} color={TOP} onChange={setTop} />
            <Slider label="Blue length" value={bot} color={BOT} onChange={setBot} />
          </div>
        </div>
      </Figure>

      <h2>Longer, shorter, the same</h2>
      <p>
        Length is something we can <strong>measure</strong>{" "}— and so are weight,
        height, and how much a cup holds. To compare, we look at just one of
        these at a time and line the objects up fairly.
      </p>

      <MathCheck>
        <p>
          Objects have <strong>measurable attributes</strong>{" "}like length,
          height, and weight (K.MD.A.1). To compare two objects directly, align
          them at a common starting point and see which has <em>more</em>{" "}of that
          attribute — here, {top === bot ? "the two pencils are the same length" : `the ${top > bot ? "red" : "blue"} pencil is longer`}
          {" "}(K.MD.A.2). Lining up the ends fairly is what makes the comparison
          honest.
        </p>
      </MathCheck>
    </div>
  );
}

function Bar({ label, units, color }: { label: string; units: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 rounded-r-full rounded-l-md transition-all" style={{ width: units * UNIT, background: color }} />
      <span className="whitespace-nowrap text-sm font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

function Slider({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}: <span style={{ color }}>{value}</span>
      </span>
      <input type="range" min={2} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-44" style={{ accentColor: color }} aria-label={label} />
    </div>
  );
}
