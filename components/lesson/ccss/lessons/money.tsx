"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Coin = { name: string; value: number; label: string; color: string };
const COINS: Coin[] = [
  { name: "penny", value: 1, label: "1¢", color: "#b06a3b" },
  { name: "nickel", value: 5, label: "5¢", color: "#9aa0a6" },
  { name: "dime", value: 10, label: "10¢", color: "#c0c4c8" },
  { name: "quarter", value: 25, label: "25¢", color: "#8a9098" },
  { name: "dollar", value: 100, label: "$1", color: "var(--band-upper)" },
];
const centCount = (count: number) => `${count} cent${count === 1 ? "" : "s"}`;

export default function Lesson() {
  const [counts, setCounts] = useState([3, 1, 2, 1, 1]);
  const totalCents = counts.reduce((s, c, i) => s + c * COINS[i].value, 0);
  const dollars = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Coins and bills each have a <strong>value in cents</strong>. Add them up
        to find the total. <strong>100 cents make one dollar</strong>, so we can
        write the amount with a <strong>$</strong>{" "}and a <strong>¢</strong>.
      </p>

      <Figure caption="Add a few of each denomination. Watch the total in dollars and cents.">
        <div className="flex flex-col items-center gap-6">
          <output className="rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-center" aria-label="Money total" aria-live="polite" aria-atomic="true">
            <div className="text-4xl font-black" style={{ color: "var(--band-upper)" }}>
              ${dollars}.{cents.toString().padStart(2, "0")}
            </div>
            <div className="font-mono text-sm text-[var(--ink-faint)]">= {totalCents}¢</div>
          </output>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {COINS.map((coin, i) => (
              <div key={coin.name} className="flex flex-col items-center gap-2">
                <div className="grid place-items-center rounded-full text-xs font-black text-white shadow-sm" style={{ width: coin.value === 100 ? 46 : 40, height: coin.value === 100 ? 32 : 40, borderRadius: coin.value === 100 ? 6 : 999, background: coin.color }}>
                  {coin.label}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCounts((p) => p.map((c, j) => (j === i ? Math.max(0, c - 1) : c)))} disabled={counts[i] <= 0} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`one fewer ${coin.name}`}>−</button>
                  <span className="w-5 text-center text-lg font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((p) => p.map((c, j) => (j === i ? Math.min(20, c + 1) : c)))} disabled={counts[i] >= 20} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`one more ${coin.name}`}>+</button>
                </div>
                <span className="text-[10px] text-[var(--ink-faint)]">{counts[i]} × {coin.value}¢ = {counts[i] * coin.value}¢</span>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Dollars and cents</h2>
      <p>
        {centCount(totalCents)} {totalCents === 1 ? "is" : "are"} the same as <strong>${dollars}.{cents.toString().padStart(2, "0")}</strong>{" "}
        because every 100 cents becomes 1 dollar. The <strong>$</strong>{" "}comes
        before dollars; the <strong>¢</strong>{" "}comes after cents.
      </p>

      <MathCheck>
        <p>
          Solving money problems means adding coin and bill values —{" "}
          <strong>pennies (1¢), nickels (5¢), dimes (10¢), quarters (25¢)</strong>,
          and dollars — and using the <strong>$</strong>{" "}and <strong>¢</strong>{" "}
          symbols (2.MD.C.8). Since 100¢ = $1, {totalCents}¢ is written{" "}
          ${dollars}.{cents.toString().padStart(2, "0")}.
        </p>
      </MathCheck>
    </div>
  );
}
