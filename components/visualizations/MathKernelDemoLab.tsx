"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import type { ExactIntersectionResultDto } from "@/lib/math-kernel/analytic/types";
import { parseExactDemoResponse } from "@/lib/math-kernel/demo/response";
import type { MathKernelDemoPayload } from "@/lib/math-kernel/demo/types";
import { ThreeDLabCanvas } from "./three/ThreeDLabCanvas";
import {
  buildGeometryKernelDemoScene,
  type GeometryKernelDemoInput,
} from "./three/manim/mathKernelDemoScenes";
import {
  buildInteractiveAnalyticKernelDemo,
} from "./three/manim/mathKernelInteractiveDemo";
import type { MathKernelLocale } from "./three/manim/mathKernelSceneAdapter";
import type { MathSceneSpec } from "./three/manim/mathSceneTypes";

export type MathKernelDemoScene = "geometry" | "analytic";
type ExactStatus = "ready" | "loading" | "stale" | "error";

interface MathKernelDemoLabProps {
  readonly payload: MathKernelDemoPayload;
  readonly initialLocale: MathKernelLocale;
  readonly initialScene: MathKernelDemoScene;
}

const COPY: Readonly<Record<MathKernelLocale, {
  readonly title: string;
  readonly introduction: string;
  readonly localeLabel: string;
  readonly geometry: string;
  readonly analytic: string;
  readonly geometryExplanation: string;
  readonly analyticExplanation: string;
  readonly inverseSlope: string;
  readonly numericChord: string;
  readonly exactChordSquared: string;
  readonly exactLoading: string;
  readonly exactStale: string;
  readonly exactError: string;
  readonly reset: string;
  readonly canvasFallback: string;
  readonly sceneUnavailable: string;
  readonly play: string;
  readonly pause: string;
  readonly timelineAriaLabel: string;
  readonly formulaRegionAriaLabel: string;
  readonly formulaAriaLabel: string;
  readonly tokenMapsTo: string;
}>> = {
  en: {
    title: "MAIS TypeScript math kernel",
    introduction: "Exact results are computed on the server; dragging uses the browser numeric kernel.",
    localeLabel: "Language",
    geometry: "Solid geometry",
    analytic: "Analytic geometry",
    geometryExplanation: "The cube, its topology, and the exact line-plane angle come from one geometry DTO.",
    analyticExplanation: "Drag the inverse slope m. The chord moves numerically; releasing asks the server for the exact result.",
    inverseSlope: "Inverse slope m",
    numericChord: "Current rendered chord length",
    exactChordSquared: "Server exact chord length squared",
    exactLoading: "Recomputing the exact value…",
    exactStale: "Release the slider to refresh the exact value.",
    exactError: "The exact value could not be recomputed.",
    reset: "Reset",
    canvasFallback: "This browser cannot open the WebGL scene.",
    sceneUnavailable: "The math scene is unavailable.",
    play: "Play",
    pause: "Pause",
    timelineAriaLabel: "MAIS Manim timeline",
    formulaRegionAriaLabel: "Scrollable MAIS Manim formula",
    formulaAriaLabel: "MAIS Manim formula",
    tokenMapsTo: "maps to",
  },
  "zh-CN": {
    title: "MAIS TypeScript 数学内核",
    introduction: "精确结果在服务端计算；拖动时只调用浏览器数值内核。",
    localeLabel: "语言",
    geometry: "立体几何",
    analytic: "解析几何",
    geometryExplanation: "正方体拓扑、坐标和精确线面角来自同一个几何 DTO。",
    analyticExplanation: "拖动反斜率 m 时弦会数值更新；松开后由服务端返回精确结果。",
    inverseSlope: "反斜率 m",
    numericChord: "当前场景弦长",
    exactChordSquared: "服务端精确弦长平方",
    exactLoading: "正在重新计算精确值……",
    exactStale: "松开滑块即可刷新精确值。",
    exactError: "无法重新计算精确值。",
    reset: "重置",
    canvasFallback: "此浏览器无法打开 WebGL 场景。",
    sceneUnavailable: "数学场景暂时无法显示。",
    play: "播放",
    pause: "暂停",
    timelineAriaLabel: "MAIS Manim 时间轴",
    formulaRegionAriaLabel: "可滚动 MAIS Manim 公式",
    formulaAriaLabel: "MAIS Manim 公式",
    tokenMapsTo: "关联至",
  },
  "zh-HK": {
    title: "MAIS TypeScript 數學內核",
    introduction: "精確結果在伺服器計算；拖動時只調用瀏覽器數值內核。",
    localeLabel: "語言",
    geometry: "立體幾何",
    analytic: "解析幾何",
    geometryExplanation: "正方體拓撲、座標和精確線面角來自同一個幾何 DTO。",
    analyticExplanation: "拖動反斜率 m 時弦會數值更新；放開後由伺服器返回精確結果。",
    inverseSlope: "反斜率 m",
    numericChord: "目前場景弦長",
    exactChordSquared: "伺服器精確弦長平方",
    exactLoading: "正在重新計算精確值……",
    exactStale: "放開滑桿即可刷新精確值。",
    exactError: "無法重新計算精確值。",
    reset: "重設",
    canvasFallback: "此瀏覽器無法開啟 WebGL 場景。",
    sceneUnavailable: "數學場景暫時無法顯示。",
    play: "播放",
    pause: "暫停",
    timelineAriaLabel: "MAIS Manim 時間軸",
    formulaRegionAriaLabel: "可捲動 MAIS Manim 公式",
    formulaAriaLabel: "MAIS Manim 公式",
    tokenMapsTo: "對應至",
  },
};

const LOCALES: readonly MathKernelLocale[] = ["en", "zh-CN", "zh-HK"];

function sceneState(scene: MathSceneSpec) {
  return {
    comparison: 6,
    depthValue: 6,
    familyId: scene.familyId,
    mode: 0,
    primaryValue: 6,
    secondaryValue: 6,
    stateSummary: `math-kernel:${scene.sceneId}`,
    templateId: "vector-conic-3d/strategy-map" as const,
    value: 6,
  };
}

export function MathKernelDemoLab({
  payload,
  initialLocale,
  initialScene,
}: MathKernelDemoLabProps) {
  const [locale, setLocale] = useState<MathKernelLocale>(initialLocale);
  const [activeScene, setActiveScene] = useState<MathKernelDemoScene>(initialScene);
  const initialSlopeQuarter = payload.analytic.initialSlopeQuarter;
  const [slopeQuarter, setSlopeQuarter] = useState(initialSlopeQuarter);
  const [exactSlopeQuarter, setExactSlopeQuarter] = useState(initialSlopeQuarter);
  const [exactIntersection, setExactIntersection] = useState<ExactIntersectionResultDto>(
    payload.analytic.exactIntersection,
  );
  const [exactStatus, setExactStatus] = useState<ExactStatus>("ready");
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const exactRequest = useRef<AbortController | null>(null);
  const slopeQuarterRef = useRef(initialSlopeQuarter);
  const lastExactSlopeQuarter = useRef(initialSlopeQuarter);
  const inFlightSlopeQuarter = useRef<number | null>(null);

  useEffect(() => () => exactRequest.current?.abort(), []);

  const geometryScene = useMemo(() => buildGeometryKernelDemoScene({
    solution: payload.geometry.solution,
    topology: payload.geometry.topology,
    vectors: [{
      id: "A1C",
      from: "A1",
      to: "C",
      conceptId: "geometry-line-direction",
    }],
    renderEdgeLength: payload.geometry.renderEdgeLength,
    locale,
  } satisfies GeometryKernelDemoInput), [locale, payload.geometry]);

  const analyticScene = useMemo(() => buildInteractiveAnalyticKernelDemo({
    solution: payload.analytic.solution,
    conic: payload.analytic.conic,
    quadratic: payload.analytic.quadratic,
    inverseSlope: slopeQuarter / 4,
    locale,
    exactIntersection: exactStatus === "ready" && exactSlopeQuarter === slopeQuarter
      ? exactIntersection
      : null,
  }), [exactIntersection, exactSlopeQuarter, exactStatus, locale, payload.analytic, slopeQuarter]);

  const requestExact = useCallback(async (nextSlopeQuarter: number) => {
    if (lastExactSlopeQuarter.current === nextSlopeQuarter) {
      setExactStatus("ready");
      return;
    }
    if (inFlightSlopeQuarter.current === nextSlopeQuarter) return;

    exactRequest.current?.abort();
    const controller = new AbortController();
    exactRequest.current = controller;
    inFlightSlopeQuarter.current = nextSlopeQuarter;
    setExactStatus("loading");
    try {
      const response = await fetch("/api/math-kernel-demo/analytic-exact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slopeQuarter: nextSlopeQuarter }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error("Exact demo request failed.");
      }
      const intersection = parseExactDemoResponse(body, nextSlopeQuarter);
      if (intersection === null) throw new Error("Exact demo response is malformed.");
      if (slopeQuarterRef.current !== nextSlopeQuarter) return;
      setExactIntersection(intersection);
      setExactSlopeQuarter(nextSlopeQuarter);
      lastExactSlopeQuarter.current = nextSlopeQuarter;
      setExactStatus("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (slopeQuarterRef.current === nextSlopeQuarter) setExactStatus("error");
    } finally {
      if (exactRequest.current === controller) exactRequest.current = null;
      if (inFlightSlopeQuarter.current === nextSlopeQuarter) {
        inFlightSlopeQuarter.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    exactRequest.current?.abort();
    exactRequest.current = null;
    inFlightSlopeQuarter.current = null;
    slopeQuarterRef.current = initialSlopeQuarter;
    lastExactSlopeQuarter.current = initialSlopeQuarter;
    setSlopeQuarter(initialSlopeQuarter);
    setExactSlopeQuarter(initialSlopeQuarter);
    setExactIntersection(payload.analytic.exactIntersection);
    setExactStatus("ready");
    setCanvasResetKey((value) => value + 1);
  }, [initialSlopeQuarter, payload.analytic.exactIntersection]);

  const copy = COPY[locale];
  const scene = activeScene === "geometry"
    ? geometryScene.ok ? geometryScene.value : null
    : analyticScene.ok ? analyticScene.value.scene : null;
  const sceneError = activeScene === "geometry"
    ? geometryScene.ok ? null : geometryScene.error
    : analyticScene.ok ? null : analyticScene.error;
  const renderChordLength = analyticScene.ok && analyticScene.value.intersection.kind === "secant"
    ? Math.sqrt(analyticScene.value.intersection.chordLengthSquared)
    : null;
  const exactChordSquared = exactIntersection.kind === "secant"
    ? exactIntersection.chordLengthSquared
    : null;
  const analyticRenderSource = analyticScene.ok ? analyticScene.value.renderSource : "numeric";
  const analyticRenderPoints = analyticScene.ok
    ? JSON.stringify(analyticScene.value.intersection.points)
    : "unavailable";
  const exactMathJson = exactStatus === "ready" && exactSlopeQuarter === slopeQuarter && exactChordSquared
    ? JSON.stringify(exactChordSquared.mathJson)
    : "stale";

  return (
    <div
      data-math-kernel-demo
      data-math-kernel-demo-locale={locale}
      lang={locale}
      className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-5 rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                Edulab → MAIS · TypeScript
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">{copy.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{copy.introduction}</p>
            </div>
            <fieldset className="min-w-fit">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                {copy.localeLabel}
              </legend>
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    aria-pressed={locale === entry}
                    onClick={() => setLocale(entry)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                      locale === entry
                        ? "border-cyan-200 bg-cyan-300 text-slate-950"
                        : "border-slate-600 bg-slate-800 text-slate-200 hover:border-cyan-400"
                    }`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </header>

        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-2xl border border-slate-700 bg-slate-900 p-1">
            {(["geometry", "analytic"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                aria-pressed={activeScene === entry}
                onClick={() => setActiveScene(entry)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  activeScene === entry
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {entry === "geometry" ? copy.geometry : copy.analytic}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            {copy.reset}
          </button>
        </section>

        <section
          data-math-kernel-demo-scene={activeScene}
          data-math-kernel-render-source={activeScene === "analytic" ? analyticRenderSource : "exact"}
          data-math-kernel-render-points={activeScene === "analytic" ? analyticRenderPoints : "geometry-dto"}
          data-math-kernel-scene-id={scene?.sceneId ?? "unavailable"}
          className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="min-h-[28rem] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/50">
            {scene ? (
              <ThreeDLabCanvas
                key={`${activeScene}-${locale}-${canvasResetKey}`}
                accent="#22d3ee"
                fallback={(
                  <div className="grid min-h-[28rem] place-items-center p-8 text-center text-slate-300">
                    {copy.canvasFallback}
                  </div>
                )}
                label={activeScene === "geometry" ? copy.geometry : copy.analytic}
                presentation="learner"
                runtime="mais-manim"
                runtimeCopy={{
                  formulaAriaLabel: copy.formulaAriaLabel,
                  formulaRegionAriaLabel: copy.formulaRegionAriaLabel,
                  pause: copy.pause,
                  play: copy.play,
                  timelineAriaLabel: copy.timelineAriaLabel,
                  tokenMapsTo: copy.tokenMapsTo,
                }}
                scene={scene}
                state={sceneState(scene)}
              />
            ) : (
              <div
                role="alert"
                data-math-kernel-scene-error-code={sceneError?.code ?? "UNKNOWN"}
                className="grid min-h-[28rem] place-items-center p-8 text-rose-200"
              >
                {copy.sceneUnavailable}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-700 bg-slate-900/95 p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">
              {activeScene === "geometry" ? copy.geometry : copy.analytic}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {activeScene === "geometry" ? copy.geometryExplanation : copy.analyticExplanation}
            </p>

            {activeScene === "geometry" ? (
              <div className="mt-6 rounded-2xl border border-indigo-300/20 bg-indigo-300/10 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-200">sin θ</p>
                <MathText
                  text={payload.geometry.solution.answer.latex}
                  renderBareMath
                  normalizeMath={false}
                  className="text-xl font-black text-white"
                />
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <label className="block" htmlFor="math-kernel-inverse-slope">
                  <span className="flex items-center justify-between gap-4 text-sm font-black text-white">
                    {copy.inverseSlope}
                    <span className="font-mono text-cyan-300">{(slopeQuarter / 4).toFixed(2)}</span>
                  </span>
                  <input
                    id="math-kernel-inverse-slope"
                    data-math-kernel-inverse-slope
                    type="range"
                    min={-8}
                    max={8}
                    step={1}
                    value={slopeQuarter}
                    onChange={(event) => {
                      const nextSlopeQuarter = Number(event.currentTarget.value);
                      exactRequest.current?.abort();
                      exactRequest.current = null;
                      inFlightSlopeQuarter.current = null;
                      slopeQuarterRef.current = nextSlopeQuarter;
                      setSlopeQuarter(nextSlopeQuarter);
                      setExactStatus("stale");
                    }}
                    onPointerUp={(event) => void requestExact(Number(event.currentTarget.value))}
                    onKeyUp={(event) => void requestExact(Number(event.currentTarget.value))}
                    onBlur={(event) => void requestExact(Number(event.currentTarget.value))}
                    className="mt-3 w-full accent-cyan-300"
                  />
                </label>

                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">{copy.numericChord}</p>
                  <p data-math-kernel-numeric-chord className="mt-2 font-mono text-xl font-black text-white">
                    {renderChordLength === null ? "—" : renderChordLength.toFixed(8)}
                  </p>
                </div>

                <div
                  data-math-kernel-exact-status={exactStatus}
                  data-math-kernel-exact-math-json={exactMathJson}
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    {copy.exactChordSquared}
                  </p>
                  {exactStatus === "loading" ? <p className="mt-2 text-sm">{copy.exactLoading}</p> : null}
                  {exactStatus === "stale" ? <p className="mt-2 text-sm">{copy.exactStale}</p> : null}
                  {exactStatus === "error" ? <p role="alert" className="mt-2 text-sm text-rose-200">{copy.exactError}</p> : null}
                  {exactStatus === "ready" && exactChordSquared ? (
                    <MathText
                      text={exactChordSquared.latex}
                      renderBareMath
                      normalizeMath={false}
                      className="mt-2 block text-xl font-black text-white"
                    />
                  ) : null}
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
