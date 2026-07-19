"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // A carnival game: pay to play, win a prize with some probability
  const [cost, setCost] = useState(2);
  const [prize, setPrize] = useState(10);
  const [winPct, setWinPct] = useState(15);

  const p = winPct / 100;
  const evPlay = r2(prize * p - cost); // expected net gain per play
  const fair = r2(prize * p); // fair price

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Expected value turns probability into <strong>decision-making</strong>. Should
        you play a game, buy insurance, take a bet? Compute the{" "}
        <strong>expected payoff</strong>{" "}of each choice and compare. A game is{" "}
        <strong>fair</strong>{" "}when its expected value is zero.
      </p>

      <Figure caption="A carnival game. If the expected net gain is negative, it favors the house — don't play to win.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 text-center text-sm">
            Pay <strong>${cost}</strong>{" "}to play. Win <strong>${prize}</strong>{" "}with probability <strong>{winPct}%</strong>.
          </div>

          <div className="flex flex-col items-center gap-1 font-mono text-sm">
            <span>expected winnings = ${prize} × {r2(p)} = ${fair}</span>
            <span>expected net = ${fair} − ${cost} = <strong className="text-lg" style={{ color: evPlay >= 0 ? "var(--band-middle)" : "var(--band-upper)" }}>${evPlay}</strong>{" "}per play</span>
          </div>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: evPlay >= 0 ? "var(--band-middle)" : "var(--band-upper)" }}>
            <div className="font-bold" style={{ color: evPlay >= 0 ? "var(--band-middle)" : "var(--band-upper)" }}>
              {evPlay > 0 ? "Favorable to you — play!" : evPlay < 0 ? "Favors the house — expect to lose over time." : "A fair game — breaks even."}
            </div>
            <div className="mt-1 text-xs text-[var(--ink-faint)]">A fair price to play would be ${fair}.</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="cost $" value={cost} min={1} max={10} onChange={setCost} />
            <Stepper label="prize $" value={prize} min={5} max={50} step={5} onChange={setPrize} />
            <Stepper label="win %" value={winPct} min={5} max={60} step={5} onChange={setWinPct} />
          </div>
        </div>
      </Figure>

      <h2>Weigh the payoffs</h2>
      <p>
        Here each play has expected net ${evPlay}. If that&apos;s negative, the game
        favors the house — fun, maybe, but a losing bet long-term. The same logic
        picks insurance deductibles, compares warranties, and finds fair prices.
        Expected value even designs <strong>fair decisions</strong>: assign choices to
        equally likely outcomes so no one is favored.
      </p>

      <MathCheck>
        <p>
          <strong>Expected value guides decisions</strong>: weigh the payoffs of each
          option by their probabilities and compare (S-MD.5), find fair prices, and
          analyze strategies (S-MD.7). Probabilities also construct{" "}
          <strong>fair decision procedures</strong>{" "}(S-MD.6), like using equally
          likely outcomes to choose without bias.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
