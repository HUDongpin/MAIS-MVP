"use client";

import type { PointerEvent, ReactNode, Ref } from "react";
import { useMemo, useRef, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import { angleAt, clamp, distance, formatNumber } from "@/lib/math";

type PointKey = "A" | "B" | "C";
type Point = { x: number; y: number };
type Points = Record<PointKey, Point>;
type ShapePatternKind = "circle" | "triangle" | "square";

const primaryGeometryTopicIds = new Set([
  "p1-shapes-patterns",
  "p2-multiplication-foundations",
  "p2-length-data",
  "p3-fractions-intro",
  "p3-geometry-patterns",
  "p4-angles",
  "p4-perimeter-area",
  "p5-fractions-operations",
  "p5-volume"
]);

const initialPoints: Points = {
  A: { x: 160, y: 88 },
  B: { x: 88, y: 340 },
  C: { x: 424, y: 310 }
};

const viewWidth = 500;
const viewHeight = 420;
const p1PatternSequence: ShapePatternKind[] = ["circle", "triangle", "square", "circle", "triangle", "square", "circle"];
const p1ShapeChoices: ShapePatternKind[] = ["circle", "triangle", "square"];
const p1AnswerSlot: Point = { x: 542, y: 132 };
const p1ShapeFacts: Record<ShapePatternKind, { corners: number; sides: number; swatch: string }> = {
  circle: { corners: 0, sides: 0, swatch: "bg-sky-400" },
  triangle: { corners: 3, sides: 3, swatch: "bg-pink-400" },
  square: { corners: 4, sides: 4, swatch: "bg-yellow-400" }
};

function toUnitLength(value: number) {
  return value / 28;
}

function getSvgPoint(svg: SVGSVGElement | null, event: { clientX: number; clientY: number }) {
  const screenMatrix = svg?.getScreenCTM();
  if (!svg || !screenMatrix) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(screenMatrix.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

function Shell({
  ariaLabel,
  children,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  svgRef
}: {
  ariaLabel: string;
  children: ReactNode;
  onPointerLeave?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGSVGElement>) => void;
  svgRef?: Ref<SVGSVGElement>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
      <svg
        data-viz-surface
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        viewBox="0 0 640 360"
        className="h-[340px] w-full touch-none sm:h-[380px]"
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
        {children}
      </svg>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  onChange,
  onCommit
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
      <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="mt-4 w-full accent-cyan-500"
      />
    </label>
  );
}

function PrimaryGeometryLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const degreeUnit = t({ en: "deg", zh: "度" });
  const p1SvgRef = useRef<SVGSVGElement | null>(null);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(4);
  const [parts, setParts] = useState(4);
  const [shaded, setShaded] = useState(2);
  const [angle, setAngle] = useState(90);
  const [heightLayers, setHeightLayers] = useState(3);
  const [lengths, setLengths] = useState([6, 9, 12]);
  const [symmetrySpaces, setSymmetrySpaces] = useState(3);
  const [growingSteps, setGrowingSteps] = useState(3);
  const [rightAngleMarker, setRightAngleMarker] = useState(4);
  const [p1Answer, setP1Answer] = useState<ShapePatternKind | null>(null);
  const [p1Checked, setP1Checked] = useState(false);
  const [p1DraggingShape, setP1DraggingShape] = useState<ShapePatternKind | null>(null);
  const [p1DragPosition, setP1DragPosition] = useState<Point | null>(null);

  function recordChange(type: "visualization-slider" | "visualization-probe" | "visualization-drag" = "visualization-slider") {
    recordLearningEvent({ type, source: "geometry", topicId });
  }

  function p1ShapeLabel(shape: ShapePatternKind) {
    if (shape === "circle") return t({ en: "circle", zh: "圓形" });
    if (shape === "triangle") return t({ en: "triangle", zh: "三角形" });
    return t({ en: "square", zh: "正方形" });
  }

  function chooseP1Shape(shape: ShapePatternKind) {
    setP1Answer(shape);
    setP1Checked(false);
    recordChange("visualization-probe");
  }

  function startP1Drag(shape: ShapePatternKind, event: PointerEvent<SVGGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const svgPoint = getSvgPoint(p1SvgRef.current, event);
    setP1Answer(shape);
    setP1Checked(false);
    setP1DraggingShape(shape);
    setP1DragPosition(svgPoint ? { x: clamp(svgPoint.x, 70, 570), y: clamp(svgPoint.y, 82, 292) } : p1AnswerSlot);
    recordChange("visualization-drag");
  }

  function moveP1Drag(event: PointerEvent<SVGSVGElement>) {
    if (!p1DraggingShape) return;
    const svgPoint = getSvgPoint(p1SvgRef.current, event);
    if (!svgPoint) return;
    setP1DragPosition({ x: clamp(svgPoint.x, 70, 570), y: clamp(svgPoint.y, 82, 292) });
  }

  function finishP1Drag() {
    if (p1DraggingShape && p1DragPosition && distance(p1DragPosition, p1AnswerSlot) < 86) {
      setP1Answer(p1DraggingShape);
    }
    setP1DraggingShape(null);
    setP1DragPosition(null);
  }

  function renderP1Shape(
    shape: ShapePatternKind,
    x: number,
    y: number,
    {
      draggable = false,
      key,
      selected = false,
      size = 28
    }: {
      draggable?: boolean;
      key?: string | number;
      selected?: boolean;
      size?: number;
    } = {}
  ) {
    const stroke = selected ? "#a7f3d0" : "white";
    const strokeWidth = selected ? 7 : 5;

    return (
      <g
        key={key}
        data-viz-mark
        data-viz-name={`p1 ${shape}`}
        className={draggable ? "cursor-grab active:cursor-grabbing" : undefined}
        onPointerDown={draggable ? (event) => startP1Drag(shape, event) : undefined}
      >
        {shape === "circle" ? (
          <circle cx={x} cy={y} r={size} fill="#38bdf8" stroke={stroke} strokeWidth={strokeWidth} />
        ) : shape === "triangle" ? (
          <polygon points={`${x},${y - size - 10} ${x - size - 8},${y + size + 10} ${x + size + 8},${y + size + 10}`} fill="#f472b6" stroke={stroke} strokeWidth={strokeWidth} />
        ) : (
          <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx="10" fill="#facc15" stroke={stroke} strokeWidth={strokeWidth} />
        )}
        {selected ? <circle cx={x} cy={y} r={size + 17} fill="none" stroke="#a7f3d0" strokeDasharray="8 8" strokeWidth="4" opacity="0.8" /> : null}
      </g>
    );
  }

  if (topicId === "p1-shapes-patterns") {
    const expectedShape: ShapePatternKind = "triangle";
    const answerFacts = p1Answer ? p1ShapeFacts[p1Answer] : null;
    const answerIsCorrect = p1Answer === expectedShape;
    const feedback = !p1Checked
      ? p1Answer
        ? t({
            en: `${p1ShapeLabel(p1Answer)} selected. Check whether it continues the pattern.`,
            zh: `已選擇${p1ShapeLabel(p1Answer)}。檢查它是否能延續規律。`
          })
        : t({ en: "Choose a shape for the next empty space.", zh: "為下一個空格選擇一個圖形。" })
      : !p1Answer
        ? t({ en: "Choose a shape first, then check the pattern.", zh: "先選擇圖形，再檢查規律。" })
        : answerIsCorrect
          ? t({ en: "Correct. The pattern repeats circle, triangle, square, so triangle comes next.", zh: "正確。規律是圓形、三角形、正方形重複，所以下一個是三角形。" })
          : t({ en: "Try again. After the circle, the repeating pattern starts again with triangle.", zh: "再試一次。圓形之後，重複規律會從三角形開始。" });

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell
          ariaLabel={t({ en: "Primary 1 shape and repeating pattern model", zh: "小一圖形與重複規律模型" })}
          svgRef={p1SvgRef}
          onPointerMove={moveP1Drag}
          onPointerUp={finishP1Drag}
          onPointerLeave={finishP1Drag}
        >
          {p1PatternSequence.map((shape, index) => renderP1Shape(shape, 86 + index * 60, 132, { key: `${shape}-${index}` }))}
          <g data-viz-mark data-viz-name="p1 answer slot">
            <circle cx={p1AnswerSlot.x} cy={p1AnswerSlot.y} r="40" fill="rgba(255,255,255,.04)" stroke={p1Checked && answerIsCorrect ? "#86efac" : "#67e8f9"} strokeDasharray="9 8" strokeWidth="5" />
            <text x={p1AnswerSlot.x} y={p1AnswerSlot.y + 8} textAnchor="middle" className="fill-cyan-100 text-xl font-black">?</text>
          </g>
          {p1Answer && !p1DraggingShape ? renderP1Shape(p1Answer, p1AnswerSlot.x, p1AnswerSlot.y, { key: "answer", selected: p1Checked }) : null}
          <path data-viz-mark d="M 76 210 H 570" stroke="white" opacity="0.35" strokeWidth="6" strokeLinecap="round" />
          <text x="80" y="80" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Name the shape, continue the pattern", zh: "說出圖形，延續規律" })}</text>
          <text x="198" y="246" className="fill-white text-2xl font-black">{p1ShapeChoices.map(p1ShapeLabel).join(" - ")}</text>
          <text x={p1AnswerSlot.x} y="212" textAnchor="middle" className="fill-cyan-100 text-xs font-black uppercase tracking-[0.16em]">{t({ en: "next", zh: "下一個" })}</text>
          {p1ShapeChoices.map((shape, index) => {
            const x = 214 + index * 106;
            return (
              <g key={`choice-${shape}`}>
                {renderP1Shape(shape, x, 292, { draggable: true, selected: p1Answer === shape && !p1Checked, size: 22 })}
                <text x={x} y="342" textAnchor="middle" className="fill-white/75 text-xs font-black">{p1ShapeLabel(shape)}</text>
              </g>
            );
          })}
          {p1DraggingShape && p1DragPosition ? renderP1Shape(p1DraggingShape, p1DragPosition.x, p1DragPosition.y, { key: "dragging", selected: true, size: 26 }) : null}
        </Shell>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "P1 focus", zh: "小一重點" })}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t({ en: "This model uses 2D shapes and a repeating sequence, not triangle angle measurement.", zh: "這個模型使用平面圖形和重複規律，而不是三角形角度量度。" })}</p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Shape facts", zh: "圖形資料" })}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {p1ShapeChoices.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  aria-pressed={p1Answer === shape}
                  onClick={() => chooseP1Shape(shape)}
                  className={`focus-ring rounded-2xl border px-2 py-3 text-center text-xs font-black transition ${
                    p1Answer === shape
                      ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "border-slate-200/70 bg-slate-50 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200"
                  }`}
                >
                  <span className={`mx-auto mb-2 block h-4 w-4 rounded-full ${p1ShapeFacts[shape].swatch}`} />
                  {p1ShapeLabel(shape)}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">
              <div className="flex justify-between gap-3">
                <span>{t({ en: "Selected", zh: "已選" })}</span>
                <strong>{p1Answer ? p1ShapeLabel(p1Answer) : t({ en: "none", zh: "未選" })}</strong>
              </div>
              {answerFacts ? (
                <div className="mt-2 flex justify-between gap-3">
                  <span>{t({ en: "Corners / sides", zh: "角 / 邊" })}</span>
                  <strong>{answerFacts.corners} / {answerFacts.sides}</strong>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setP1Checked(true);
                recordChange("visualization-probe");
              }}
              className="focus-ring mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
            >
              {t({ en: "Check the next shape", zh: "檢查下一個圖形" })}
            </button>
            <p
              role="status"
              aria-live="polite"
              className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                p1Checked && answerIsCorrect
                  ? "bg-emerald-400/15 text-emerald-700 dark:text-emerald-200"
                  : p1Checked
                    ? "bg-amber-400/15 text-amber-700 dark:text-amber-200"
                    : "bg-cyan-400/10 text-cyan-700 dark:text-cyan-200"
              }`}
            >
              {feedback}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (topicId === "p2-multiplication-foundations") {
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 2 multiplication array", zh: "小二乘法陣列" })}>
          {Array.from({ length: rows }, (_, row) => (
            Array.from({ length: columns }, (_, col) => (
              <circle data-viz-mark key={`${row}-${col}`} cx={126 + col * 62} cy={100 + row * 54} r="19" fill={row % 2 ? "#f472b6" : "#38bdf8"} stroke="white" strokeWidth="3" />
            ))
          ))}
          <text x="82" y="58" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Rows and columns", zh: "行與列" })}</text>
          <text x="430" y="102" className="fill-white text-4xl font-black">{rows} x {columns} = {rows * columns}</text>
        </Shell>
        <div className="space-y-4">
          <SliderControl label={t({ en: "Rows", zh: "行" })} value={rows} min={1} max={5} onChange={setRows} onCommit={() => recordChange()} />
          <SliderControl label={t({ en: "Columns", zh: "列" })} value={columns} min={1} max={6} onChange={setColumns} onCommit={() => recordChange()} />
        </div>
      </div>
    );
  }

  if (topicId === "p2-length-data") {
    const lengthLabels = ["A", "B", "C"];
    const totalLength = lengths.reduce((sum, value) => sum + value, 0);
    const longestIndex = lengths.indexOf(Math.max(...lengths));
    const barBaseline = 304;
    const barScale = 8;

    function updateLength(index: number, value: number) {
      setLengths((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
    }

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 2 length and data model", zh: "小二長度與數據模型" })}>
          <rect data-viz-mark x="82" y="104" width="360" height="44" rx="12" fill="rgba(255,255,255,.08)" stroke="#38bdf8" strokeWidth="5" />
          {Array.from({ length: 13 }, (_, index) => (
            <line key={index} x1={104 + index * 25} x2={104 + index * 25} y1="104" y2={index % 2 ? 132 : 148} stroke="white" opacity="0.75" strokeWidth="2" />
          ))}
          {[0, 3, 6, 9, 12].map((tick) => (
            <text key={tick} x={104 + tick * 25} y="174" textAnchor="middle" className="fill-white/60 text-xs font-black">{tick}</text>
          ))}
          {lengths.map((value, index) => (
            <g key={lengthLabels[index]}>
              <rect
                data-viz-mark
                x={110 + index * 84}
                y={barBaseline - value * barScale}
                width="42"
                height={value * barScale}
                rx="10"
                fill={index === 1 ? "#f472b6" : "#38bdf8"}
              />
              <text x={131 + index * 84} y={barBaseline - value * barScale - 12} textAnchor="middle" className="fill-white text-sm font-black">{value} cm</text>
              <text x={131 + index * 84} y={barBaseline + 22} textAnchor="middle" className="fill-white/70 text-sm font-black">{lengthLabels[index]}</text>
            </g>
          ))}
          <line data-viz-mark x1="92" x2="408" y1={barBaseline} y2={barBaseline} stroke="white" strokeWidth="4" opacity="0.42" />
          <text x="84" y="76" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Measure in cm, show as bars", zh: "用厘米量度，畫成棒形圖" })}</text>
        </Shell>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Lengths in cm", zh: "厘米長度" })}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {lengths.map((value, index) => (
                <div key={lengthLabels[index]} className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/[0.08]">
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lengthLabels[index]}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value} cm</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
              {t({ en: "Longest", zh: "最長" })}: {lengthLabels[longestIndex]} · {t({ en: "Total", zh: "總長" })}: {totalLength} cm
            </p>
          </div>
          {lengths.map((value, index) => (
            <SliderControl
              key={lengthLabels[index]}
              label={t({ en: `Object ${lengthLabels[index]}`, zh: `物件 ${lengthLabels[index]}` })}
              value={value}
              min={1}
              max={12}
              onChange={(nextValue) => updateLength(index, nextValue)}
              onCommit={() => recordChange()}
            />
          ))}
        </div>
      </div>
    );
  }

  if (topicId === "p3-fractions-intro" || topicId === "p5-fractions-operations") {
    const maxParts = topicId === "p3-fractions-intro" ? 6 : 12;
    const safeShaded = Math.min(shaded, parts);
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Fraction bar model", zh: "分數條模型" })}>
          <rect data-viz-mark x="82" y="126" width="476" height="72" rx="18" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="4" />
          {Array.from({ length: parts }, (_, index) => (
            <rect data-viz-mark key={index} x={82 + (476 / parts) * index} y="126" width={476 / parts} height="72" fill={index < safeShaded ? (index % 2 ? "#f472b6" : "#38bdf8") : "transparent"} opacity="0.82" />
          ))}
          {Array.from({ length: parts - 1 }, (_, index) => (
            <line key={index} x1={82 + (476 / parts) * (index + 1)} x2={82 + (476 / parts) * (index + 1)} y1="126" y2="198" stroke="white" strokeWidth="3" />
          ))}
          <text x="86" y="82" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{topicId === "p5-fractions-operations" ? t({ en: "Common partition for operations", zh: "運算用共同分割" }) : t({ en: "Equal parts make fractions", zh: "平均分成分數" })}</text>
          <text x="274" y="276" className="fill-white text-4xl font-black">{safeShaded}/{parts}</text>
        </Shell>
        <div className="space-y-4">
          <SliderControl label={t({ en: "Equal parts", zh: "平均分幾份" })} value={parts} min={2} max={maxParts} onChange={setParts} onCommit={() => recordChange()} />
          <SliderControl label={t({ en: "Shaded parts", zh: "塗色份數" })} value={safeShaded} min={1} max={parts} onChange={setShaded} onCommit={() => recordChange()} />
        </div>
      </div>
    );
  }

  if (topicId === "p3-geometry-patterns") {
    const mirrorX = 320;
    const triangleGap = symmetrySpaces * 12;
    const leftApex = mirrorX - triangleGap;
    const leftBase = leftApex - 74;
    const rightApex = mirrorX + triangleGap;
    const rightBase = rightApex + 74;
    const stepSize = 32;
    const pathStartX = 96;
    const pathStartY = 272;
    const growingPath = Array.from({ length: growingSteps }, (_, index) => {
      const currentX = pathStartX + index * stepSize;
      const currentY = pathStartY - index * stepSize;
      return `H ${currentX + stepSize} V ${currentY - stepSize}`;
    }).join(" ");
    const markerSize = rightAngleMarker * 12;

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 3 symmetry and right angle model", zh: "小三對稱與直角模型" })}>
          <line data-viz-mark x1="320" x2="320" y1="72" y2="260" stroke="white" strokeWidth="5" strokeDasharray="9 9" opacity="0.66" />
          <polygon data-viz-mark points={`${leftBase},96 ${leftApex},162 ${leftBase},228`} fill="#38bdf8" opacity="0.76" stroke="white" strokeWidth="4" />
          <polygon data-viz-mark points={`${rightBase},96 ${rightApex},162 ${rightBase},228`} fill="#38bdf8" opacity="0.76" stroke="white" strokeWidth="4" />
          <path data-viz-mark d={`M ${pathStartX} ${pathStartY} ${growingPath}`} fill="none" stroke="#f472b6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          {Array.from({ length: growingSteps }, (_, index) => (
            <circle data-viz-mark key={index} cx={pathStartX + index * stepSize} cy={pathStartY - index * stepSize} r="6" fill="#f9a8d4" stroke="white" strokeWidth="2" />
          ))}
          <rect data-viz-mark x="470" y={250 - markerSize} width={markerSize} height={markerSize} fill="none" stroke="#facc15" strokeWidth="6" />
          <text x="86" y="56" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Symmetry, right angle, growing path", zh: "對稱、直角、增長路徑" })}</text>
          <text x="250" y="292" className="fill-white text-lg font-black">{growingSteps} {t({ en: "steps", zh: "級" })}</text>
          <text x="456" y="292" className="fill-white text-lg font-black">90 {degreeUnit}</text>
        </Shell>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Pattern facts", zh: "規律資料" })}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/[0.08]">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">{t({ en: "Mirror", zh: "鏡線" })}</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{symmetrySpaces}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/[0.08]">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">{t({ en: "Steps", zh: "級數" })}</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{growingSteps}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/[0.08]">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">{t({ en: "Angle", zh: "角" })}</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">90</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
              {t({ en: "Each triangle stays the same distance from the mirror line.", zh: "兩個三角形與鏡線保持相同距離。" })}
            </p>
          </div>
          <SliderControl label={t({ en: "Mirror distance", zh: "鏡線距離" })} value={symmetrySpaces} min={2} max={6} onChange={setSymmetrySpaces} onCommit={() => recordChange()} />
          <SliderControl label={t({ en: "Growing steps", zh: "增長級數" })} value={growingSteps} min={2} max={5} onChange={setGrowingSteps} onCommit={() => recordChange()} />
          <SliderControl label={t({ en: "Right-angle marker", zh: "直角標記" })} value={rightAngleMarker} min={3} max={6} onChange={setRightAngleMarker} onCommit={() => recordChange()} />
        </div>
      </div>
    );
  }

  if (topicId === "p4-angles") {
    const radians = (angle * Math.PI) / 180;
    const endX = 156 + Math.cos(radians) * 150;
    const endY = 226 - Math.sin(radians) * 150;
    const angleType = angle < 90 ? t({ en: "acute", zh: "銳角" }) : angle === 90 ? t({ en: "right", zh: "直角" }) : t({ en: "obtuse", zh: "鈍角" });
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 4 angle comparison", zh: "小四角度比較" })}>
          <line data-viz-mark x1="156" x2="450" y1="226" y2="226" stroke="white" strokeWidth="8" strokeLinecap="round" />
          <line data-viz-mark x1="156" x2={endX} y1="226" y2={endY} stroke="white" strokeWidth="8" strokeLinecap="round" />
          <path data-viz-mark d={`M 218 226 A 62 62 0 0 0 ${156 + Math.cos(radians) * 62} ${226 - Math.sin(radians) * 62}`} fill="none" stroke="#f472b6" strokeWidth="8" />
          <text x="82" y="56" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Estimate and classify", zh: "估計和分類" })}</text>
          <text x="362" y="126" className="fill-white text-4xl font-black">{angle} {degreeUnit}</text>
          <text x="370" y="170" className="fill-amber-200 text-2xl font-black">{angleType}</text>
        </Shell>
        <SliderControl label={t({ en: "Angle size", zh: "角度大小" })} value={angle} min={20} max={160} onChange={setAngle} onCommit={() => recordChange()} />
      </div>
    );
  }

  if (topicId === "p4-perimeter-area") {
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 4 perimeter and area grid", zh: "小四周界與面積方格" })}>
          {Array.from({ length: rows }, (_, row) => (
            Array.from({ length: columns }, (_, col) => (
              <rect data-viz-mark key={`${row}-${col}`} x={92 + col * 42} y={82 + row * 42} width="42" height="42" fill={(row + col) % 2 ? "rgba(244,114,182,.2)" : "rgba(56,189,248,.22)"} stroke="rgba(255,255,255,.35)" />
            ))
          ))}
          <rect data-viz-mark x="92" y="82" width={columns * 42} height={rows * 42} fill="none" stroke="#22d3ee" strokeWidth="7" />
          <text x="430" y="120" className="fill-white text-3xl font-black">{rows * columns} {t({ en: "squares", zh: "格" })}</text>
          <text x="430" y="164" className="fill-white/70 text-xl font-bold">{t({ en: "perimeter", zh: "周界" })} {2 * (rows + columns)}</text>
        </Shell>
        <div className="space-y-4">
          <SliderControl label={t({ en: "Rows", zh: "行" })} value={rows} min={1} max={5} onChange={setRows} onCommit={() => recordChange()} />
          <SliderControl label={t({ en: "Columns", zh: "列" })} value={columns} min={1} max={7} onChange={setColumns} onCommit={() => recordChange()} />
        </div>
      </div>
    );
  }

  if (topicId === "p5-volume") {
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Shell ariaLabel={t({ en: "Primary 5 volume layer model", zh: "小五體積分層模型" })}>
          {Array.from({ length: heightLayers }, (_, layer) => (
            Array.from({ length: 4 }, (_, col) => (
              Array.from({ length: 3 }, (_, row) => {
                const x = 118 + col * 44 + row * 18 + layer * 10;
                const y = 218 - row * 28 - layer * 34;
                return (
                  <g data-viz-mark key={`${layer}-${row}-${col}`}>
                    <polygon points={`${x},${y} ${x + 24},${y - 12} ${x + 48},${y} ${x + 24},${y + 12}`} fill="#38bdf8" opacity="0.58" stroke="white" strokeWidth="2" />
                    <polygon points={`${x},${y} ${x + 24},${y + 12} ${x + 24},${y + 40} ${x},${y + 28}`} fill="#f472b6" opacity="0.34" stroke="white" strokeWidth="2" />
                    <polygon points={`${x + 24},${y + 12} ${x + 48},${y} ${x + 48},${y + 28} ${x + 24},${y + 40}`} fill="#facc15" opacity="0.34" stroke="white" strokeWidth="2" />
                  </g>
                );
              })
            ))
          ))}
          <text x="86" y="74" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Count layers of unit cubes", zh: "數小立方體分層" })}</text>
          <text x="408" y="120" className="fill-white text-3xl font-black">{4 * 3 * heightLayers} cubes</text>
        </Shell>
        <SliderControl label={t({ en: "Layers", zh: "層數" })} value={heightLayers} min={1} max={5} onChange={setHeightLayers} onCommit={() => recordChange()} />
      </div>
    );
  }

  return null;
}

export function GeometryExplorer({ topicId = "angles" }: { topicId?: string }) {
  if (primaryGeometryTopicIds.has(topicId)) return <PrimaryGeometryLab topicId={topicId} />;
  return <SecondaryGeometryExplorer topicId={topicId} />;
}

function SecondaryGeometryExplorer({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [points, setPoints] = useState<Points>(initialPoints);
  const [dragging, setDragging] = useState<PointKey | null>(null);

  const measures = useMemo(() => {
    const AB = distance(points.A, points.B);
    const BC = distance(points.B, points.C);
    const CA = distance(points.C, points.A);
    return {
      AB: toUnitLength(AB),
      BC: toUnitLength(BC),
      CA: toUnitLength(CA),
      angleA: angleAt(points.A, points.B, points.C),
      angleB: angleAt(points.B, points.A, points.C),
      angleC: angleAt(points.C, points.A, points.B)
    };
  }, [points]);

  function eventToPoint(event: PointerEvent<SVGSVGElement>): Point {
    const svgPoint = getSvgPoint(svgRef.current, event);
    if (!svgPoint) return { x: 0, y: 0 };

    return {
      x: clamp(svgPoint.x, 30, viewWidth - 30),
      y: clamp(svgPoint.y, 30, viewHeight - 30)
    };
  }

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const nextPoint = eventToPoint(event);
    setPoints((current) => ({ ...current, [dragging]: nextPoint }));
  }

  function startDragging(key: PointKey) {
    recordLearningEvent({
      type: "visualization-drag",
      source: "geometry",
      topicId
    });
    setDragging(key);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-950 p-3 dark:border-white/10">
        <svg
          data-viz-surface
          ref={svgRef}
          role="img"
          aria-label={t({ en: "Draggable triangle geometry explorer", zh: "可拖曳三角形幾何探索器" })}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="h-[360px] w-full touch-none sm:h-[420px]"
          onPointerMove={handleMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          <defs>
            <linearGradient id="triangleFill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0.34)" />
              <stop offset="55%" stopColor="rgba(139, 92, 246, 0.30)" />
              <stop offset="100%" stopColor="rgba(244, 114, 182, 0.26)" />
            </linearGradient>
            <filter id="triangleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {Array.from({ length: 11 }, (_, index) => index * 50).map((value) => (
            <g key={value}>
              <line x1={value} x2={value} y1="0" y2={viewHeight} className="stroke-white/10" />
              <line y1={value} y2={value} x1="0" x2={viewWidth} className="stroke-white/10" />
            </g>
          ))}
          <polygon
            data-viz-mark
            points={`${points.A.x},${points.A.y} ${points.B.x},${points.B.y} ${points.C.x},${points.C.y}`}
            fill="url(#triangleFill)"
            stroke="#22d3ee"
            strokeWidth="3"
            filter="url(#triangleGlow)"
          />
          <line data-viz-mark x1={points.A.x} y1={points.A.y} x2={points.C.x} y2={points.C.y} stroke="#f472b6" strokeDasharray="6 8" opacity="0.7" />
          {(Object.keys(points) as PointKey[]).map((key) => (
            <g key={key}>
              <motion.circle
                data-viz-mark
                cx={points[key].x}
                cy={points[key].y}
                r="15"
                fill={dragging === key ? "#f472b6" : "#22d3ee"}
                stroke="white"
                strokeWidth="3"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startDragging(key);
                }}
                initial={false}
                animate={{ cx: points[key].x, cy: points[key].y }}
              />
              <text x={points[key].x + 20} y={points[key].y - 18} className="fill-white text-sm font-black">{key}</text>
            </g>
          ))}
          <text x="20" y="32" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Drag the vertices to test angle and side relationships", zh: "拖曳頂點，測試角和邊的關係" })}</text>
        </svg>
      </div>
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Triangle measures", zh: "三角形度量" })}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t({ en: "The side lengths are scaled units. Angles update from vector calculations.", zh: "邊長使用比例單位，角度會按向量計算即時更新。" })}</p>
        </div>
        <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-5 text-sm dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex justify-between"><span>AB</span><strong>{formatNumber(measures.AB)} {t({ en: "units", zh: "單位" })}</strong></div>
          <div className="flex justify-between"><span>BC</span><strong>{formatNumber(measures.BC)} {t({ en: "units", zh: "單位" })}</strong></div>
          <div className="flex justify-between"><span>CA</span><strong>{formatNumber(measures.CA)} {t({ en: "units", zh: "單位" })}</strong></div>
        </div>
        <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-5 text-sm dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex justify-between"><span>Angle A</span><strong>{formatNumber(measures.angleA, 1)} deg</strong></div>
          <div className="flex justify-between"><span>Angle B</span><strong>{formatNumber(measures.angleB, 1)} deg</strong></div>
          <div className="flex justify-between"><span>Angle C</span><strong>{formatNumber(measures.angleC, 1)} deg</strong></div>
          <div className="mt-1 flex justify-between border-t border-slate-200/70 pt-3 dark:border-white/10"><span>{t({ en: "Angle sum", zh: "內角和" })}</span><strong>{formatNumber(measures.angleA + measures.angleB + measures.angleC, 1)} deg</strong></div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPoints(initialPoints);
            recordLearningEvent({
              type: "visualization-reset",
              source: "geometry",
              topicId
            });
          }}
          className="focus-ring w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
        >
          {t({ en: "Reset triangle", zh: "重設三角形" })}
        </button>
      </div>
    </div>
  );
}
