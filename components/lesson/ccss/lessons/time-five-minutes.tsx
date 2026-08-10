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

export default function Lesson() {
  const [hour, setHour] = useState(3);
  const [minute, setMinute] = useState(40);
  const [pm, setPm] = useState(false);

  const step = (d: number) => {
    let m = minute + d, h = hour;
    if (m >= 60) {
      m = 0;
      if (h === 11) setPm((period) => !period);
      h = h === 12 ? 1 : h + 1;
    }
    if (m < 0) {
      m = 55;
      if (h === 12) setPm((period) => !period);
      h = h === 1 ? 12 : h - 1;
    }
    setMinute(m); setHour(h);
  };

  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minAngle = minute * 6;
  const hh = hand(hourAngle, 46);
  const mh = hand(minAngle, 70);
  const digital = `${hour}:${minute.toString().padStart(2, "0")}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The clock face has <strong>60 minutes</strong>, and the numbers 1–12 are{" "}
        <strong>5 minutes apart</strong>. Counting by 5s around the clock lets you
        read any time to the nearest five minutes.
      </p>

      <Figure caption="Count by 5s from the 12 to the long hand. a.m. begins at midnight and ends just before noon; p.m. begins at noon and ends just before midnight.">
        <div className="flex flex-col items-center gap-6">
          <svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label={`clock showing ${digital} ${pm ? "p.m." : "a.m."}`}>
            <circle cx={CX} cy={CY} r={R} fill="var(--surface)" stroke="var(--ink-soft)" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, i) => {
              const num = i + 1;
              const p = hand(num * 30, R - 16);
              const mlabel = hand(num * 30, R - 30);
              return (
                <g key={num}>
                  <text x={p.x2} y={p.y2 + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{num}</text>
                  <text x={mlabel.x2} y={mlabel.y2 + 3} textAnchor="middle" fontSize="8" fill="var(--band-early)" fontFamily="var(--font-mono)">{(num * 5) % 60}</text>
                </g>
              );
            })}
            <line x1={CX} y1={CY} x2={mh.x2} y2={mh.y2} stroke={MIN_HAND} strokeWidth="4" strokeLinecap="round" style={{ transition: "all 0.35s ease" }} />
            <line x1={CX} y1={CY} x2={hh.x2} y2={hh.y2} stroke={HOUR_HAND} strokeWidth="6" strokeLinecap="round" style={{ transition: "all 0.35s ease" }} />
            <circle cx={CX} cy={CY} r="6" fill="var(--ink)" />
          </svg>

          <div className="text-center">
            <div className="font-mono text-4xl font-black">{digital} <span className="text-2xl">{pm ? "p.m." : "a.m."}</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => step(-5)} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold">− 5 min</button>
            <button type="button" onClick={() => step(5)} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: MIN_HAND }}>+ 5 min</button>
            <button type="button" onClick={() => setPm((p) => !p)} className="rounded-lg border-2 px-4 py-2 text-sm font-bold" style={{ borderColor: HOUR_HAND, color: HOUR_HAND }}>{pm ? "Switch to a.m." : "Switch to p.m."}</button>
          </div>
        </div>
      </Figure>

      <h2>Count by fives</h2>
      <p>
        Each number the long hand passes is another 5 minutes. At {digital}, the
        long hand is on the {minute === 0 ? 12 : minute / 5}, which is {minute}{" "}
        minutes past {hour}.
      </p>

      <MathCheck>
        <p>
          Telling and writing time from an analog clock to the nearest{" "}
          <strong>five minutes</strong>{" "}(2.MD.C.7) uses skip-counting by 5:
          count the five-minute intervals clockwise from 12 to the long hand,
          then multiply that interval count by 5. The 12 position represents 0 minutes;
          reaching it again completes 60 minutes and starts the next hour.{" "}
          <strong>a.m.</strong>{" "}starts at midnight and ends
          just before noon; <strong>p.m.</strong>{" "}starts at noon and ends just
          before midnight.
        </p>
      </MathCheck>
    </div>
  );
}
