"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const LIQ = "var(--band-middle)";
const MASS = "var(--band-upper)";

export default function Lesson() {
  const [mode, setMode] = useState<"volume" | "mass">("volume");
  const [ml, setMl] = useState(750); // milliliters, 0..2000
  const [grams, setGrams] = useState(1200); // 0..3000

  const liters = ml / 1000;
  const kg = grams / 1000;
  const fillPct = ml / 2000;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        We measure <strong>how much liquid</strong>{" "}in <strong>liters (L)</strong>{" "}
        and milliliters, and <strong>how heavy</strong>{" "}in <strong>grams (g)</strong>{" "}
        and kilograms. First estimate using things you know, then measure with a
        tool.
      </p>

      <Figure caption="Fill the beaker or load the scale. 1000 mL = 1 liter; 1000 g = 1 kilogram.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["volume", "Liquid volume"], ["mass", "Mass"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: mode === "volume" ? LIQ : MASS, color: "white", borderColor: mode === "volume" ? LIQ : MASS } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          {mode === "volume" ? (
            <>
              <svg width="120" height="180" viewBox="0 0 120 180" role="img" aria-label={`Beaker filled to ${ml} milliliters, which is ${liters} ${liters === 1 ? "liter" : "liters"}`}>
                <rect x="30" y="10" width="60" height="160" rx="6" fill="none" stroke="var(--ink-soft)" strokeWidth="3" />
                <rect x="33" y={13 + (1 - fillPct) * 154} width="54" height={fillPct * 154} fill={LIQ} fillOpacity={0.7} />
                {[0, 0.5, 1, 1.5, 2].map((l) => (
                  <g key={l}>
                    <line x1="90" y1={167 - (l / 2) * 154} x2="98" y2={167 - (l / 2) * 154} stroke="var(--ink-soft)" strokeWidth="1.5" />
                    <text x="102" y={170 - (l / 2) * 154} fontSize="9" fill="var(--ink-faint)" fontFamily="var(--font-mono)">{l}L</text>
                  </g>
                ))}
              </svg>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: LIQ }}>{ml} mL</div>
                <div className="font-mono text-sm text-[var(--ink-soft)]">= {liters} liters</div>
              </div>
              <input type="range" min={0} max={2000} step={50} value={ml} onChange={(e) => setMl(Number(e.target.value))} className="w-56 accent-[var(--band-middle)]" aria-label="milliliters" />
              <p className="m-0 text-sm text-[var(--ink-faint)]">A water bottle holds about 500 mL; a big soda bottle is about 2 L.</p>
            </>
          ) : (
            <>
              <div className="grid h-28 w-40 place-items-center rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)]">
                <div className="text-4xl font-black" style={{ color: MASS }}>{grams} g</div>
              </div>
              <div className="text-center font-mono text-sm text-[var(--ink-soft)]">= {kg} kilograms</div>
              <input type="range" min={0} max={3000} step={50} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="grams" />
              <p className="m-0 text-sm text-[var(--ink-faint)]">A paperclip is about 1 g; a math textbook is about 1 kg (1000 g).</p>
            </>
          )}
        </div>
      </Figure>

      <h2>Estimate, then measure</h2>
      <p>
        Knowing benchmarks — a liter of water, a kilogram textbook — lets you
        estimate before you measure. Then a beaker or a scale gives the exact
        amount.
      </p>

      <MathCheck>
        <p>
          Measuring and estimating <strong>liquid volumes</strong>{" "}(liters,
          milliliters) and <strong>masses</strong>{" "}(grams, kilograms) using
          standard units is 3.MD.A.2. Because 1 L = 1000 mL and 1 kg = 1000 g,
          {mode === "volume" ? ` ${ml} mL = ${liters} L` : ` ${grams} g = ${kg} kg`}. You
          can also add, subtract, multiply, or divide these amounts to solve
          one-step problems.
        </p>
      </MathCheck>
    </div>
  );
}
