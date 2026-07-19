"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // 2x2: rows = has umbrella?, cols = rains?
  const g = [[15, 25], [10, 50]]; // [umbrella][rain]
  const [condOn, setCondOn] = useState<"rain" | "umbrella">("rain");

  const total = g.flat().reduce((a, b) => a + b, 0);
  // P(umbrella | rain): among rain days, fraction with umbrella
  const rainTotal = g[0][1] + g[1][1];
  const umbTotal = g[0][0] + g[0][1];
  const pUmbGivenRain = r2(g[0][1] / rainTotal);
  const pRainGivenUmb = r2(g[0][1] / umbTotal);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Conditional probability</strong>{" "}P(A | B) asks: given that B
        happened, how likely is A? You <strong>restrict to the B outcomes</strong>{" "}
        and find A&apos;s fraction among them:{" "}
        <strong>P(A | B) = P(A and B) / P(B)</strong>.
      </p>

      <Figure caption="Conditioning zooms into one row or column — then A's share of that subset is P(A | B).">
        <div className="flex flex-col items-center gap-6">
          <table className="border-collapse text-center font-mono text-sm">
            <thead><tr className="text-[var(--ink-faint)]"><th className="p-2" /><th className="p-2">rain</th><th className="p-2">no rain</th></tr></thead>
            <tbody>
              <tr><th className="p-2 text-right">umbrella</th>
                <td className="p-2 text-lg font-black" style={{ background: condOn === "rain" ? "color-mix(in srgb, var(--band-high) 25%, transparent)" : "transparent" }}>{g[0][1]}</td>
                <td className="p-2 text-lg font-black" style={{ background: condOn === "umbrella" ? "color-mix(in srgb, var(--band-high) 25%, transparent)" : "transparent" }}>{g[0][0]}</td></tr>
              <tr><th className="p-2 text-right">no umbrella</th>
                <td className="p-2 text-lg" style={{ background: condOn === "rain" ? "color-mix(in srgb, var(--band-high) 12%, transparent)" : "transparent" }}>{g[1][1]}</td>
                <td className="p-2 text-lg">{g[1][0]}</td></tr>
            </tbody>
          </table>

          <div className="flex gap-2">
            <button type="button" onClick={() => setCondOn("rain")} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={condOn === "rain" ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>given rain</button>
            <button type="button" onClick={() => setCondOn("umbrella")} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={condOn === "umbrella" ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>given umbrella</button>
          </div>

          <div className="rounded-2xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            {condOn === "rain"
              ? <>P(umbrella | rain) = {g[0][1]}/{rainTotal} = <strong style={{ color: ACCENT }}>{pUmbGivenRain}</strong></>
              : <>P(rain | umbrella) = {g[0][1]}/{umbTotal} = <strong style={{ color: ACCENT }}>{pRainGivenUmb}</strong></>}
          </div>
        </div>
      </Figure>

      <h2>Order matters</h2>
      <p>
        P(umbrella | rain) = {pUmbGivenRain} is <em>not</em>{" "}the same as
        P(rain | umbrella) = {pRainGivenUmb} — conditioning on a different event uses a
        different subset as the denominator. As a fraction of outcomes, P(A | B)
        counts the A-and-B cases out of all the B cases. Confusing the two directions
        is a classic mistake.
      </p>

      <MathCheck>
        <p>
          <strong>Conditional probability</strong>{" "}P(A | B) = P(A and B)/P(B)
          (S-CP.3) measures A&apos;s likelihood given B occurred. Computed as a{" "}
          <strong>fraction of B&apos;s outcomes</strong>{" "}that are also A (S-CP.6),
          it&apos;s directional: P(A | B) generally differs from P(B | A).
        </p>
      </MathCheck>
    </div>
  );
}
