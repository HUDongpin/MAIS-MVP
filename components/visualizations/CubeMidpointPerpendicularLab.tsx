"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useReducedMotion } from "@/components/ui/Motion";
import type { CubeMidpointPerpendicularProofDto } from "@/lib/math-kernel/demo/cubeMidpointPerpendicular.types";
import { ThreeDLabCanvas } from "./three/ThreeDLabCanvas";
import {
  buildCubeMidpointPerpendicularScene,
} from "./three/manim/cubeMidpointPerpendicularScene";
import type { MathKernelLocale } from "./three/manim/mathKernelSceneAdapter";
import type { MathSceneSpec } from "./three/manim/mathSceneTypes";

interface CubeMidpointPerpendicularLabProps {
  readonly payload: CubeMidpointPerpendicularProofDto;
  readonly initialLocale: MathKernelLocale;
}

type ProofCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly problemLabel: string;
  readonly problem: string;
  readonly goalLabel: string;
  readonly goal: string;
  readonly languageLabel: string;
  readonly reduceMotion: string;
  readonly standardMotion: string;
  readonly reset: string;
  readonly canvasFallback: string;
  readonly proofTrail: string;
  readonly exactChecks: string;
  readonly dotEf: string;
  readonly dotEg: string;
  readonly directionScale: string;
  readonly angleSine: string;
  readonly interactionHint: string;
  readonly deliveryNote: string;
  readonly play: string;
  readonly pause: string;
  readonly timelineAriaLabel: string;
  readonly formulaRegionAriaLabel: string;
  readonly formulaAriaLabel: string;
  readonly tokenMapsTo: string;
  readonly subtitles: readonly string[];
};

const LOCALES: readonly MathKernelLocale[] = ["en", "zh-CN", "zh-HK"];

const LOCALE_NAMES: Readonly<Record<MathKernelLocale, string>> = Object.freeze({
  en: "English",
  "zh-CN": "简体中文",
  "zh-HK": "繁體中文",
});

const COPY: Readonly<Record<MathKernelLocale, ProofCopy>> = Object.freeze({
  en: Object.freeze({
    eyebrow: "Spatial-vector proof · interactive preview",
    title: "Why is DB₁ perpendicular to plane EFG?",
    problemLabel: "Problem",
    problem:
      "In cube ABCD–A₁B₁C₁D₁ of edge length 2, E, F, and G are the midpoints of AB, BC, and CC₁. Prove that DB₁ is perpendicular to plane EFG.",
    goalLabel: "Vector strategy",
    goal:
      "Give the cube coordinates, form two non-collinear vectors in plane EFG, find their normal, and compare it with the direction of DB₁.",
    languageLabel: "Subtitle language",
    reduceMotion: "Use reduced motion",
    standardMotion: "Use animated steps",
    reset: "Reset proof",
    canvasFallback: "This browser cannot open the interactive WebGL proof.",
    proofTrail: "Current proof subtitle",
    exactChecks: "Exact kernel checks",
    dotEf: "DB₁ direction · EF",
    dotEg: "DB₁ direction · EG",
    directionScale: "DB₁ / normal scale",
    angleSine: "Line–plane angle sine",
    interactionHint:
      "Press Play, pause at any step, drag the timeline, or rotate the cube. The formula chip follows each proof step; the final conclusion highlights both DB₁ and plane EFG.",
    deliveryNote: "On-screen subtitles only · no narration · no video export",
    play: "Play",
    pause: "Pause",
    timelineAriaLabel: "Cube perpendicularity proof timeline",
    formulaRegionAriaLabel: "Scrollable exact cube-proof formula",
    formulaAriaLabel: "Exact cube midpoint-plane proof",
    tokenMapsTo: "maps to",
    subtitles: Object.freeze([
      "Place E at the midpoint of AB: E = (1, 0, 0).",
      "Place F at the midpoint of BC: F = (2, 1, 0).",
      "Place G at the midpoint of CC₁: G = (2, 2, 1).",
      "Build the first in-plane direction: EF = (1, 1, 0).",
      "Build a second non-collinear direction: EG = (1, 2, 1).",
      "The two directions determine plane EFG; reveal its parallelogram patch.",
      "Their cross product gives a normal n = (1, −1, 1).",
      "Move the camera to compare the normal with the cube diagonal.",
      "The target line has direction DB₁ = (2, −2, 2).",
      "The exact kernel confirms DB₁ = 2n (and both in-plane dot products are zero).",
      "A line parallel to a plane normal is perpendicular to that plane.",
      "Therefore DB₁ ⟂ plane EFG.",
    ]),
  }),
  "zh-CN": Object.freeze({
    eyebrow: "空间向量法证明 · 交互预览",
    title: "为什么 DB₁ 垂直于平面 EFG？",
    problemLabel: "题目",
    problem:
      "在棱长为 2 的正方体 ABCD–A₁B₁C₁D₁ 中，E、F、G 分别是 AB、BC、CC₁ 的中点。证明：DB₁ 垂直于平面 EFG。",
    goalLabel: "向量思路",
    goal:
      "建立正方体坐标，求平面 EFG 内两个不共线向量及其法向量，再与 DB₁ 的方向向量比较。",
    languageLabel: "字幕语言",
    reduceMotion: "使用减少动态模式",
    standardMotion: "使用分步动画",
    reset: "重置证明",
    canvasFallback: "此浏览器无法打开交互式 WebGL 证明。",
    proofTrail: "当前证明字幕",
    exactChecks: "精确内核校验",
    dotEf: "DB₁ 方向 · EF",
    dotEg: "DB₁ 方向 · EG",
    directionScale: "DB₁ / 法向量倍数",
    angleSine: "线面角正弦",
    interactionHint:
      "点击播放，可随时暂停、拖动时间轴或旋转正方体。公式 token 会随证明步骤切换；最后的结论会同时高亮 DB₁ 与平面 EFG。",
    deliveryNote: "仅屏幕字幕 · 无配音 · 无视频导出",
    play: "播放",
    pause: "暂停",
    timelineAriaLabel: "正方体垂直证明时间轴",
    formulaRegionAriaLabel: "可滚动的正方体精确证明公式",
    formulaAriaLabel: "正方体中点平面精确证明",
    tokenMapsTo: "关联至",
    subtitles: Object.freeze([
      "先确定 AB 的中点：E = (1, 0, 0)。",
      "再确定 BC 的中点：F = (2, 1, 0)。",
      "确定 CC₁ 的中点：G = (2, 2, 1)。",
      "构造平面内第一个方向：EF = (1, 1, 0)。",
      "构造另一个不共线方向：EG = (1, 2, 1)。",
      "两个方向确定平面 EFG；现在显示该平面的平行四边形片元。",
      "叉积得到平面法向量 n = (1, −1, 1)。",
      "调整镜头，比较法向量与正方体对角线的方向。",
      "目标直线的方向向量为 DB₁ = (2, −2, 2)。",
      "精确内核验证 DB₁ = 2n（并且它与两个平面内向量的点积均为 0）。",
      "直线若平行于平面的法向量，就垂直于该平面。",
      "所以 DB₁ ⟂ 平面 EFG。",
    ]),
  }),
  "zh-HK": Object.freeze({
    eyebrow: "空間向量法證明 · 互動預覽",
    title: "為甚麼 DB₁ 垂直於平面 EFG？",
    problemLabel: "題目",
    problem:
      "在棱長為 2 的正方體 ABCD–A₁B₁C₁D₁ 中，E、F、G 分別是 AB、BC、CC₁ 的中點。證明：DB₁ 垂直於平面 EFG。",
    goalLabel: "向量思路",
    goal:
      "建立正方體座標，求平面 EFG 內兩個不共線向量及其法向量，再與 DB₁ 的方向向量比較。",
    languageLabel: "字幕語言",
    reduceMotion: "使用減少動態模式",
    standardMotion: "使用分步動畫",
    reset: "重設證明",
    canvasFallback: "此瀏覽器無法開啟互動式 WebGL 證明。",
    proofTrail: "目前證明字幕",
    exactChecks: "精確內核校驗",
    dotEf: "DB₁ 方向 · EF",
    dotEg: "DB₁ 方向 · EG",
    directionScale: "DB₁ / 法向量倍數",
    angleSine: "線面角正弦",
    interactionHint:
      "按播放後可隨時暫停、拖動時間軸或旋轉正方體。公式 token 會隨證明步驟切換；最後的結論會同時高亮 DB₁ 與平面 EFG。",
    deliveryNote: "只有屏幕字幕 · 無配音 · 無影片匯出",
    play: "播放",
    pause: "暫停",
    timelineAriaLabel: "正方體垂直證明時間軸",
    formulaRegionAriaLabel: "可捲動的正方體精確證明公式",
    formulaAriaLabel: "正方體中點平面精確證明",
    tokenMapsTo: "對應至",
    subtitles: Object.freeze([
      "先確定 AB 的中點：E = (1, 0, 0)。",
      "再確定 BC 的中點：F = (2, 1, 0)。",
      "確定 CC₁ 的中點：G = (2, 2, 1)。",
      "構造平面內第一個方向：EF = (1, 1, 0)。",
      "構造另一個不共線方向：EG = (1, 2, 1)。",
      "兩個方向確定平面 EFG；現在顯示該平面的平行四邊形片元。",
      "叉積得到平面法向量 n = (1, −1, 1)。",
      "調整鏡頭，比較法向量與正方體對角線的方向。",
      "目標直線的方向向量為 DB₁ = (2, −2, 2)。",
      "精確內核驗證 DB₁ = 2n（並且它與兩個平面內向量的點積均為 0）。",
      "直線若平行於平面的法向量，就垂直於該平面。",
      "所以 DB₁ ⟂ 平面 EFG。",
    ]),
  }),
});

function sceneState(scene: MathSceneSpec) {
  return {
    comparison: 1,
    depthValue: 2,
    familyId: scene.familyId,
    mode: 0,
    primaryValue: 2,
    secondaryValue: 1,
    stateSummary: `cube-midpoint-proof:${scene.sceneId}`,
    templateId: "vector-conic-3d/strategy-map" as const,
    value: 2,
  };
}

function boundedBeatIndex(value: string | null, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}

export function CubeMidpointPerpendicularLab({
  payload,
  initialLocale,
}: CubeMidpointPerpendicularLabProps) {
  const [locale, setLocale] = useState<MathKernelLocale>(initialLocale);
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const systemReducedMotion = Boolean(useReducedMotion());
  const reducedMotion = motionOverride ?? systemReducedMotion;
  const previewRef = useRef<HTMLDivElement | null>(null);
  const copy = COPY[locale];
  const scene = useMemo(
    () => buildCubeMidpointPerpendicularScene(payload, locale, { reducedMotion }),
    [locale, payload, reducedMotion],
  );

  useEffect(() => {
    if (reducedMotion) {
      setActiveBeatIndex(copy.subtitles.length - 1);
      return;
    }

    setActiveBeatIndex(0);
    const host = previewRef.current;
    if (!host || typeof MutationObserver === "undefined") return;

    const updateCaption = () => {
      const surface = host.querySelector<HTMLElement>("[data-viz-surface]");
      if (!surface) return;
      setActiveBeatIndex(
        boundedBeatIndex(
          surface.getAttribute("data-viz-manim-timeline-active-step-index"),
          copy.subtitles.length - 1,
        ),
      );
    };

    updateCaption();
    const observer = new MutationObserver(updateCaption);
    observer.observe(host, {
      attributes: true,
      attributeFilter: ["data-viz-manim-timeline-active-step-index"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [canvasResetKey, copy.subtitles.length, locale, reducedMotion, scene.sceneId]);

  const resetProof = () => {
    setActiveBeatIndex(reducedMotion ? copy.subtitles.length - 1 : 0);
    setCanvasResetKey((value) => value + 1);
  };

  return (
    <main
      lang={locale}
      data-cube-midpoint-proof
      data-cube-midpoint-proof-locale={locale}
      data-cube-midpoint-proof-scene-id={scene.sceneId}
      data-cube-midpoint-proof-caption-step={activeBeatIndex}
      data-cube-midpoint-proof-reduced-motion={String(reducedMotion)}
      data-cube-proof-delivery="interactive-preview"
      data-cube-proof-audio="none"
      data-cube-proof-video-export="none"
      data-cube-proof-locale={locale}
      data-cube-proof-reduced-motion={String(reducedMotion)}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#07111f_0%,_#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[92rem]">
        <header className="mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/72 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {copy.interactionHint}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 xl:items-end">
              <fieldset>
                <legend className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {copy.languageLabel}
                </legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label={copy.languageLabel}>
                  {LOCALES.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      data-cube-proof-locale-option={entry}
                      aria-label={`${copy.languageLabel}: ${LOCALE_NAMES[entry]}`}
                      aria-pressed={locale === entry}
                      onClick={() => setLocale(entry)}
                      className={`rounded-full border px-3 py-2 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                        locale === entry
                          ? "border-cyan-200 bg-cyan-200 text-slate-950"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {LOCALE_NAMES[entry]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-cube-proof-reduced-motion-toggle
                  aria-pressed={reducedMotion}
                  onClick={() => setMotionOverride(!reducedMotion)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  {reducedMotion ? copy.standardMotion : copy.reduceMotion}
                </button>
                <button
                  type="button"
                  data-cube-proof-reset
                  onClick={resetProof}
                  className="rounded-full border border-indigo-200/30 bg-indigo-300/12 px-3 py-2 text-xs font-black text-indigo-100 transition hover:bg-indigo-300/20 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {copy.reset}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              {copy.problemLabel}
            </p>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-100 sm:text-base">
              {copy.problem}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              {copy.goalLabel}
            </p>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-100 sm:text-base">
              {copy.goal}
            </p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div
            ref={previewRef}
            data-cube-proof-preview
            className="min-w-0 overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-slate-950 shadow-2xl shadow-cyan-950/30 max-sm:[&_[data-viz-manim-scene-frame]]:aspect-[4/3] max-sm:[&_[data-viz-manim-formula-overlay]]:!left-3 max-sm:[&_[data-viz-manim-formula-overlay]]:!right-3 max-sm:[&_[data-viz-manim-formula-overlay]]:!w-auto max-sm:[&_[data-viz-manim-formula-overlay]]:!max-w-none max-sm:[&_[data-viz-manim-formula-overlay]_.katex]:!text-[0.82em]"
          >
            <ThreeDLabCanvas
              key={`${scene.sceneId}-${locale}-${reducedMotion ? "reduced" : "animated"}-${canvasResetKey}`}
              accent="#22d3ee"
              coverageTier="premium-3d"
              fallback={(
                <div className="grid min-h-[28rem] place-items-center p-8 text-center text-slate-300">
                  {copy.canvasFallback}
                </div>
              )}
              label={copy.title}
              presentation="learner"
              regionalPriority="cross-region"
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
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-3xl border border-cyan-200/18 bg-cyan-300/[0.08] p-5 shadow-xl shadow-cyan-950/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                  {copy.proofTrail}
                </p>
                <span className="rounded-full bg-cyan-200 px-2.5 py-1 font-mono text-[11px] font-black text-slate-950">
                  {activeBeatIndex + 1} / {copy.subtitles.length}
                </span>
              </div>
              <p
                data-cube-proof-active-caption
                data-cube-proof-caption-index={activeBeatIndex}
                aria-live="polite"
                className="mt-4 min-h-24 text-lg font-black leading-8 text-white"
              >
                {copy.subtitles[activeBeatIndex]}
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span
                  className={`block h-full rounded-full bg-cyan-300 ${
                    reducedMotion
                      ? "transition-none duration-0"
                      : "transition-[width] duration-300 motion-reduce:transition-none motion-reduce:duration-0"
                  }`}
                  style={{ width: `${((activeBeatIndex + 1) / copy.subtitles.length) * 100}%` }}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">
                {copy.exactChecks}
              </p>
              <dl className="mt-4 grid gap-3">
                {[
                  [copy.dotEf, payload.checks.db1DotEf.latex, "db1-dot-ef"],
                  [copy.dotEg, payload.checks.db1DotEg.latex, "db1-dot-eg"],
                  [copy.directionScale, payload.checks.db1NormalScale.latex, "normal-scale"],
                  [copy.angleSine, payload.checks.linePlaneAngleSin.latex, "angle-sine"],
                ].map(([label, latex, id]) => (
                  <div
                    key={id}
                    data-cube-proof-exact-check={id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.045] px-3 py-2.5"
                  >
                    <dt className="text-xs font-bold leading-5 text-slate-300">{label}</dt>
                    <dd className="shrink-0 rounded-lg bg-slate-950 px-2.5 py-1 text-lg font-black text-cyan-200">
                      <MathText text={latex} renderBareMath normalizeMath={false} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center text-xs font-bold leading-5 text-slate-400">
              {copy.deliveryNote}
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
