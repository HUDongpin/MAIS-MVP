"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CX = 100, CY = 100, R = 84;
const HOUR_HAND = "var(--band-upper)";
const MIN_HAND = "var(--band-early)";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function hand(angleDeg: number, len: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x2: r3(CX + len * Math.sin(a)), y2: r3(CY - len * Math.cos(a)) };
}
function fmt(h: number, m: number) {
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default function Lesson() {
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(47);
  const [elapsed, setElapsed] = useState(25);

  const step = (d: number) => {
    let m = minute + d, h = hour;
    while (m >= 60) { m -= 60; h = h === 12 ? 1 : h + 1; }
    while (m < 0) { m += 60; h = h === 1 ? 12 : h - 1; }
    setMinute(m); setHour(h);
  };

  const totalEnd = (hour % 12) * 60 + minute + elapsed;
  const endH0 = Math.floor(totalEnd / 60) % 12;
  const endH = endH0 === 0 ? 12 : endH0;
  const endM = totalEnd % 60;

  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const hh = hand(hourAngle, 46);
  const mh = hand(minute * 6, 70);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Now the minute hand can point to <strong>any minute</strong>, not just
        the fives. Count the small ticks between the numbers. And once you can
        read a time, you can find <strong>elapsed time</strong>{" "}— how long until
        later.
      </p>

      <Figure caption="Read the exact time, then add minutes to find a later time.">
        <div className="flex flex-col items-center gap-6">
          <svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label={`clock showing ${fmt(hour, minute)}`}>
            <circle cx={CX} cy={CY} r={R} fill="var(--surface)" stroke="var(--ink-soft)" strokeWidth="3" />
            {Array.from({ length: 60 }, (_, i) => {
              const p1 = hand(i * 6, R);
              const p2 = hand(i * 6, R - (i % 5 === 0 ? 9 : 4));
              return <line key={i} x1={p1.x2} y1={p1.y2} x2={p2.x2} y2={p2.y2} stroke="var(--ink-soft)" strokeWidth={i % 5 === 0 ? 1.8 : 0.8} />;
            })}
            {Array.from({ length: 12 }, (_, i) => {
              const p = hand((i + 1) * 30, R - 20);
              return <text key={i} x={p.x2} y={p.y2 + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{i + 1}</text>;
            })}
            <line x1={CX} y1={CY} x2={mh.x2} y2={mh.y2} stroke={MIN_HAND} strokeWidth="4" strokeLinecap="round" style={{ transition: "all 0.3s ease" }} />
            <line x1={CX} y1={CY} x2={hh.x2} y2={hh.y2} stroke={HOUR_HAND} strokeWidth="6" strokeLinecap="round" style={{ transition: "all 0.3s ease" }} />
            <circle cx={CX} cy={CY} r="6" fill="var(--ink)" />
          </svg>

          <div className="font-mono text-4xl font-black">{fmt(hour, minute)}</div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => step(-5)} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-bold">−5</button>
            <button type="button" onClick={() => step(-1)} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-bold">−1</button>
            <button type="button" onClick={() => step(1)} className="rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ background: MIN_HAND }}>+1</button>
            <button type="button" onClick={() => step(5)} className="rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ background: MIN_HAND }}>+5</button>
          </div>

          <div className="rounded-2xl border-2 border-[var(--line)] px-6 py-3 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Elapsed time</div>
            <div className="font-mono text-lg font-black">{fmt(hour, minute)} + {elapsed} min = <span style={{ color: HOUR_HAND }}>{fmt(endH, endM)}</span></div>
            <input type="range" min={5} max={120} step={5} value={elapsed} onChange={(e) => setElapsed(Number(e.target.value))} className="mt-2 w-48 accent-[var(--band-upper)]" aria-label="elapsed minutes" />
          </div>
        </div>
      </Figure>

      <h2>Every minute counts</h2>
      <p>
        {/* A long tick sits at every multiple of 5, so between two numerals
            there are 4 short ticks marking 5 one-minute intervals. */}
        Between each number are 4 small ticks, splitting it into 5 one-minute
        steps. Reading to the
        minute, and adding or subtracting minutes, lets you answer &ldquo;what
        time will it be?&rdquo; and &ldquo;how long until?&rdquo;
      </p>

      <MathCheck>
        <p>
          Telling and writing time to the nearest minute (3.MD.A.1) means reading
          the minute hand exactly, counting the single-minute ticks. Elapsed-time
          problems add or subtract minutes on a number line of time: starting at{" "}
          {fmt(hour, minute)} and letting {elapsed} minutes pass gives{" "}
          {fmt(endH, endM)}.
        </p>
      </MathCheck>
    </div>
  );
}
