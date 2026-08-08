"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const CELL = 30;
const LEFT = "var(--band-upper)";
const RIGHT = "var(--band-middle)";

export default function Lesson() {
  const [cols, setCols] = useState(7); // length
  const [rows, setRows] = useState(4); // width
  const [split, setSplit] = useState(2); // columns in the left piece

  const clampSplit = (v: number) => Math.max(0, Math.min(cols, v));
  const s = Math.min(split, cols);
  const total = rows * cols;
  const leftArea = rows * s;
  const rightArea = rows * (cols - s);

  const W = cols * CELL;
  const H = rows * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>area</strong>{" "}of a rectangle is the number of unit squares
        that cover it. If you line the squares up in equal rows, you can{" "}
        <strong>multiply</strong>{" "}instead of counting one by one.
      </p>

      <Figure caption="Drag the split to break the rectangle into two easier multiplications.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg
              width={W + 2}
              height={H + 2}
              viewBox={`0 0 ${W + 2} ${H + 2}`}
              className="mx-auto max-w-full"
              role="img"
              aria-label={s > 0 && s < cols ? `A ${rows} by ${cols} rectangle of unit squares, split after column ${s} into a ${rows} by ${s} part and a ${rows} by ${cols - s} part` : `A ${rows} by ${cols} rectangle of unit squares, not split`}
            >
              <g transform="translate(1,1)">
                {Array.from({ length: rows }, (_, r) =>
                  Array.from({ length: cols }, (_, c) => (
                    <rect
                      key={`${r}-${c}`}
                      x={c * CELL}
                      y={r * CELL}
                      width={CELL}
                      height={CELL}
                      fill={c < s ? LEFT : RIGHT}
                      opacity={0.85}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  )),
                )}
                {s > 0 && s < cols && (
                  <line x1={s * CELL} y1={0} x2={s * CELL} y2={H} stroke="var(--ink)" strokeWidth={3} />
                )}
              </g>
            </svg>
          </FigureScroll>

          <div className="text-center">
            <div className="font-mono text-xl font-bold">
              {rows} × {cols} ={" "}
              <span style={{ color: LEFT }}>{total}</span> square units
            </div>
            {s > 0 && s < cols && (
              <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
                {rows} × {cols} = {rows}×{s} + {rows}×{cols - s} ={" "}
                <span style={{ color: LEFT }}>{leftArea}</span> +{" "}
                <span style={{ color: RIGHT }}>{rightArea}</span> = {total}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Rows" value={rows} min={1} max={8} onChange={setRows} />
            <Stepper label="Columns" value={cols} min={1} max={12} onChange={(v) => { setCols(v); setSplit((p) => Math.min(p, v)); }} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                Split at column: <span className="text-[var(--ink)]">{s}</span>
              </span>
              <input
                type="range"
                min={0}
                max={cols}
                value={s}
                onChange={(e) => setSplit(clampSplit(Number(e.target.value)))}
                className="w-40 accent-[var(--band-upper)]"
                aria-label="Split column"
              />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Why area is multiplication</h2>
      <p>
        Each row has the same number of squares, and there are the same number
        of rows. That is exactly what <strong>multiplication</strong>{" "}counts:
        equal groups added together. So{" "}
        <strong>area = rows × columns</strong>.
      </p>

      <MathCheck>
        <p>
          A rectangle tiled by unit squares has area <strong>rows × columns</strong>{" "}
          because it is <strong>rows</strong>{" "}equal groups of{" "}
          <strong>columns</strong>{" "}squares (3.MD.C.7). Splitting the columns into
          two parts shows the <strong>distributive property</strong>:{" "}
          <strong>{rows} × {cols} = {rows} × {s} + {rows} × {cols - s}</strong>{" "}—
          the two colored pieces always add back to the whole, so a hard fact
          like {rows}×{cols} can be found from two easy ones.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
