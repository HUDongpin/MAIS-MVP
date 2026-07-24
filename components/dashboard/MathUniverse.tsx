"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { MathUniversePoster } from "@/components/dashboard/MathUniversePoster";
import { cn } from "@/lib/utils";
import {
  buildMathUniverseMap,
  universeHeight,
  universeRoadForCluster,
  universeWidth
} from "@/lib/mathUniverseMap";
import type {
  MathUniverseMap,
  UniverseRoad,
  UniverseSkillStateInput,
  UniverseStar,
  UniverseTopicInput
} from "@/lib/mathUniverseMap";
import type { CcssArmId } from "@/data/ccssStandards";
import type { GradeId, LocalizedText, ThemeMode } from "@/types";

type MathUniverseProps = {
  currentSkillId: string | null;
  studentGrade: GradeId;
  studentId: string | null;
  studentName: string | null;
  theme: ThemeMode;
};

type UniverseFetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; topics: UniverseTopicInput[]; states: UniverseSkillStateInput[] };

type CameraTarget = { x: number; y: number; k: number };

const armColors: Record<CcssArmId, string> = {
  number: "#22d3ee",
  ratio: "#f472b6",
  algebra: "#a78bfa",
  geometry: "#34d399",
  data: "#fbbf24"
};

const armNames: Record<CcssArmId, LocalizedText> = {
  number: { en: "Number & Base Ten", zh: "數與位值", zhHans: "数与位值" },
  ratio: { en: "Fractions → Ratios", zh: "分數→比例", zhHans: "分数→比例" },
  algebra: { en: "Operations → Algebra", zh: "運算→代數", zhHans: "运算→代数" },
  geometry: { en: "Geometry & Measurement", zh: "幾何與量度", zhHans: "几何与测量" },
  data: { en: "Data → Statistics", zh: "數據→統計", zhHans: "数据→统计" }
};

const universeVisitStoragePrefix = "hk-math-math-universe-visit";

const statusLabels: Record<UniverseStar["status"], LocalizedText> = {
  lit: { en: "Lit — mastered", zh: "已點亮——已掌握", zhHans: "已点亮——已掌握" },
  fading: { en: "Fading — review due", zh: "轉暗——待複習", zhHans: "转暗——待复习" },
  unstable: { en: "Unstable — repair", zh: "不穩定——待修補", zhHans: "不稳定——待修补" },
  current: { en: "Current mission", zh: "當前任務", zhHans: "当前任务" },
  confirming: { en: "Confirming — almost mastered", zh: "鞏固中——即將掌握", zhHans: "巩固中——即将掌握" },
  igniting: { en: "Igniting — in progress", zh: "點燃中", zhHans: "点燃中" },
  charted: { en: "Charted — ahead on your route", zh: "已標記——航線前方", zhHans: "已标记——航线前方" },
  sealed: { en: "Sealed — uncharted space", zh: "封存——未知宇宙", zhHans: "封存——未知宇宙" }
};

function universeVisitStorageKey(studentId: string | null) {
  return `${universeVisitStoragePrefix}:${studentId ?? "guest"}`;
}

function starVisual(star: UniverseStar, theme: ThemeMode) {
  const armColor = armColors[star.arm];
  switch (star.status) {
    case "lit":
      return { r: 4.6, fill: armColor, opacity: 1, glow: armColor };
    case "fading":
      return { r: 4.2, fill: "#fbbf24", opacity: 0.95, glow: "#fbbf24" };
    case "unstable":
      return { r: 4.2, fill: "#fb7185", opacity: 0.95, glow: "#fb7185" };
    case "current":
      return { r: 6.2, fill: theme === "dark" ? "#ffffff" : "#0f172a", opacity: 1, glow: armColor };
    case "confirming":
      return { r: 4.2, fill: "#38bdf8", opacity: 0.98, glow: "#38bdf8" };
    case "igniting":
      return { r: 3.6, fill: theme === "dark" ? "#8b93b8" : "#64748b", opacity: 0.95, glow: null };
    case "charted":
      return { r: 2.8, fill: theme === "dark" ? "#39415f" : "#94a3b8", opacity: 0.9, glow: null };
    default:
      return { r: 2.2, fill: theme === "dark" ? "#232a45" : "#cbd5e1", opacity: 0.55, glow: null };
  }
}

export function MathUniverse({ currentSkillId, studentGrade, studentId, studentName, theme }: MathUniverseProps) {
  const [posterOpen, setPosterOpen] = useState(false);
  const { t, text } = useSettings();
  const [fetchState, setFetchState] = useState<UniverseFetchState>({ status: "loading" });
  const [activeRoadId, setActiveRoadId] = useState<UniverseRoad["id"] | null>(null);
  const [activePreset, setActivePreset] = useState<"universe" | "frontier" | "mission">("universe");
  const [hovered, setHovered] = useState<{ star: UniverseStar; left: number; top: number } | null>(null);
  const [journeyDelta, setJourneyDelta] = useState<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraGroupRef = useRef<SVGGElement | null>(null);
  const cameraRef = useRef<CameraTarget>({ x: universeWidth / 2, y: 600, k: 1 });
  const tweenRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; cameraX: number; cameraY: number } | null>(null);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/adaptive-learning/universe", { cache: "no-store" });
        if (!response.ok) throw new Error(`Universe request failed (${response.status}).`);
        const payload = (await response.json()) as {
          universe?: { topics?: UniverseTopicInput[]; states?: UniverseSkillStateInput[] };
        };
        if (cancelled) return;
        setFetchState({
          status: "ready",
          topics: payload.universe?.topics ?? [],
          states: payload.universe?.states ?? []
        });
      } catch (error) {
        if (cancelled) return;
        setFetchState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const map: MathUniverseMap | null = useMemo(() => {
    if (fetchState.status !== "ready") return null;
    return buildMathUniverseMap({
      topics: fetchState.topics,
      states: fetchState.states,
      studentGrade,
      currentSkillId
    });
  }, [currentSkillId, fetchState, studentGrade]);

  const currentRoadId = useMemo(() => universeRoadForCluster(map?.currentClusterId ?? null), [map]);

  // Journey delta: remember the lit-star total per student and surface the growth.
  useEffect(() => {
    if (!map || typeof window === "undefined") return;
    const key = universeVisitStorageKey(studentId);
    try {
      const raw = window.localStorage.getItem(key);
      const previous = raw ? (JSON.parse(raw) as { litCount?: number }) : null;
      if (previous && typeof previous.litCount === "number" && map.illumination.litCount > previous.litCount) {
        setJourneyDelta(map.illumination.litCount - previous.litCount);
      }
      window.localStorage.setItem(
        key,
        JSON.stringify({ litCount: map.illumination.litCount, at: new Date().toISOString() })
      );
    } catch {
      // Storage unavailable: the journey line simply stays hidden.
    }
  }, [map, studentId]);

  const applyCamera = useCallback(() => {
    const group = cameraGroupRef.current;
    if (!group) return;
    const { x, y, k } = cameraRef.current;
    group.setAttribute(
      "transform",
      `translate(${universeWidth / 2} 600) scale(${k}) translate(${-x} ${-y})`
    );
    const labelScale = 1 / Math.pow(k, 0.78);
    group.querySelectorAll<SVGTextElement>("[data-universe-label]").forEach((label) => {
      const lx = label.getAttribute("data-lx");
      const ly = label.getAttribute("data-ly");
      if (lx && ly) {
        label.setAttribute("transform", `translate(${lx} ${ly}) scale(${labelScale.toFixed(3)}) translate(${-Number(lx)} ${-Number(ly)})`);
      }
      label.setAttribute("opacity", k >= 1.6 ? "1" : k >= 1.05 ? "0.5" : "0");
    });
  }, []);

  const flyTo = useCallback(
    (target: CameraTarget) => {
      if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
      if (reducedMotion) {
        cameraRef.current = { ...target };
        applyCamera();
        return;
      }
      const from = { ...cameraRef.current };
      const started = performance.now();
      const duration = 750;
      const step = (nowMs: number) => {
        const progress = Math.min(1, (nowMs - started) / duration);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        cameraRef.current = {
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
          k: from.k + (target.k - from.k) * eased
        };
        applyCamera();
        if (progress < 1) tweenRef.current = requestAnimationFrame(step);
      };
      tweenRef.current = requestAnimationFrame(step);
    },
    [applyCamera, reducedMotion]
  );

  useEffect(() => {
    applyCamera();
    return () => {
      if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
    };
  }, [applyCamera, map, theme]);

  const presets = useMemo(() => {
    const universePreset: CameraTarget = { x: universeWidth / 2, y: 600, k: 1 };
    if (!map) return { universe: universePreset, frontier: universePreset, mission: universePreset };
    const frontierClusters = map.clusters.filter((cluster) => cluster.gradeBand === map.frontierGradeBand);
    const frontier: CameraTarget = frontierClusters.length
      ? {
          x: frontierClusters.reduce((sum, cluster) => sum + cluster.x, 0) / frontierClusters.length,
          y: frontierClusters.reduce((sum, cluster) => sum + cluster.y, 0) / frontierClusters.length,
          k: 2.3
        }
      : universePreset;
    const currentCluster = map.clusters.find((cluster) => cluster.id === map.currentClusterId) ?? null;
    const mission: CameraTarget = currentCluster ? { x: currentCluster.x, y: currentCluster.y, k: 4.6 } : frontier;
    return { universe: universePreset, frontier, mission };
  }, [map]);

  const activeRoad = useMemo(
    () => (map && activeRoadId ? map.roads.find((road) => road.id === activeRoadId) ?? null : null),
    [activeRoadId, map]
  );
  const roadClusterIds = useMemo(
    () => (activeRoad ? new Set(activeRoad.clusterIds) : null),
    [activeRoad]
  );

  const completedClusters = useMemo(
    () => (map ? map.clusters.filter((cluster) => cluster.complete) : []),
    [map]
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cameraX: cameraRef.current.x,
      cameraY: cameraRef.current.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      const svgElement = svgRef.current;
      if (!drag || !svgElement) return;
      const scaleFactor = universeWidth / svgElement.getBoundingClientRect().width;
      cameraRef.current.x = drag.cameraX - ((event.clientX - drag.pointerX) * scaleFactor) / cameraRef.current.k;
      cameraRef.current.y = drag.cameraY - ((event.clientY - drag.pointerY) * scaleFactor) / cameraRef.current.k;
      applyCamera();
    },
    [applyCamera]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = Math.min(7, Math.max(0.55, cameraRef.current.k * Math.exp(-event.deltaY * 0.0012)));
      cameraRef.current.k = next;
      applyCamera();
    };
    svgElement.addEventListener("wheel", onWheel, { passive: false });
    return () => svgElement.removeEventListener("wheel", onWheel);
  }, [applyCamera, map]);

  const onStarHover = useCallback(
    (star: UniverseStar, event: ReactPointerEvent<SVGCircleElement>) => {
      const container = svgRef.current?.parentElement;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      let left = event.clientX - bounds.left + 16;
      const top = Math.max(8, event.clientY - bounds.top - 12);
      if (left + 250 > bounds.width) left -= 280;
      setHovered({ star, left, top });
    },
    []
  );

  const isDark = theme === "dark";
  const hudCardClass = isDark
    ? "border-white/15 bg-slate-950/[0.82] text-white"
    : "border-cyan-100/90 bg-white/[0.86] text-slate-950";
  const hudMutedClass = isDark ? "text-slate-300" : "text-slate-600";
  const chipClass = isDark
    ? "border-white/[0.14] bg-white/[0.07] text-slate-200 hover:bg-white/[0.14]"
    : "border-slate-300/80 bg-white/[0.8] text-slate-700 hover:bg-cyan-50";
  const chipActiveClass = isDark
    ? "border-cyan-200/70 text-cyan-100 shadow-[0_0_14px_rgba(103,232,249,0.3)]"
    : "border-cyan-500/70 text-cyan-800 shadow-[0_0_14px_rgba(14,165,233,0.25)]";

  if (fetchState.status === "loading") {
    return (
      <div className={cn("grid min-h-[24rem] place-items-center rounded-[1.5rem] border p-6 text-sm font-black", hudCardClass)} data-universe-loading>
        {t({ en: "Charting the Math Universe…", zh: "正在繪製數學宇宙……", zhHans: "正在绘制数学宇宙……" })}
      </div>
    );
  }

  if (fetchState.status === "error" || !map) {
    return (
      <div className={cn("rounded-[1.5rem] border p-6", hudCardClass)} data-universe-error>
        <p className="text-sm font-black">
          {t({ en: "The universe map could not load.", zh: "宇宙星圖載入失敗。", zhHans: "宇宙星图载入失败。" })}
        </p>
        {fetchState.status === "error" ? <p className={cn("mt-2 text-xs font-bold", hudMutedClass)}>{fetchState.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="relative min-w-0" data-math-universe>
      <style>{`
        @keyframes math-universe-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        @keyframes math-universe-road-dash {
          to { stroke-dashoffset: -48; }
        }
        .math-universe-pulse { animation: math-universe-pulse 2.1s ease-in-out infinite; }
        .math-universe-road { stroke-dasharray: 14 10; animation: math-universe-road-dash 2.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .math-universe-pulse, .math-universe-road { animation: none; }
        }
      `}</style>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          ["universe", { en: "Whole universe", zh: "整個宇宙", zhHans: "整个宇宙" }],
          ["frontier", { en: "My frontier", zh: "我的前線", zhHans: "我的前线" }],
          ["mission", { en: "Current mission", zh: "當前任務", zhHans: "当前任务" }]
        ] as const).map(([preset, label]) => (
          <button
            key={preset}
            type="button"
            aria-pressed={activePreset === preset}
            data-universe-preset={preset}
            onClick={() => {
              setActivePreset(preset);
              flyTo(presets[preset]);
            }}
            className={cn(
              "focus-ring rounded-full border px-4 py-2 text-xs font-black transition hover:-translate-y-0.5",
              chipClass,
              activePreset === preset && chipActiveClass
            )}
          >
            {t(label)}
          </button>
        ))}
        <span className={cn("mx-1 hidden text-xs font-black uppercase sm:inline", hudMutedClass)}>
          {t({ en: "Roads", zh: "航路", zhHans: "航路" })}
        </span>
        {map.roads.map((road) => (
          <button
            key={road.id}
            type="button"
            aria-pressed={activeRoadId === road.id}
            data-universe-road={road.id}
            onClick={() => {
              setActiveRoadId((previous) => (previous === road.id ? null : road.id));
              const points = road.points;
              if (points.length && activeRoadId !== road.id) {
                const mid = points[Math.floor(points.length / 2)];
                flyTo({ x: (mid.x + universeWidth / 2) / 2, y: (mid.y + 600) / 2, k: 1.45 });
              }
            }}
            className={cn(
              "focus-ring rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5",
              chipClass,
              activeRoadId === road.id && chipActiveClass
            )}
            style={{ borderColor: activeRoadId === road.id ? armColors[road.arm] : undefined }}
          >
            {text(road.name)}
            {currentRoadId === road.id ? <span aria-hidden="true" style={{ color: armColors[road.arm] }}> ●</span> : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPosterOpen(true)}
          data-universe-poster-open
          className={cn("focus-ring ml-auto rounded-full border px-4 py-2 text-xs font-black transition hover:-translate-y-0.5", chipClass)}
        >
          {t({ en: "Export poster", zh: "匯出海報", zhHans: "导出海报" })}
        </button>
      </div>

      {posterOpen && map ? (
        <MathUniversePoster
          map={map}
          studentName={studentName}
          studentGrade={studentGrade}
          onClose={() => setPosterOpen(false)}
        />
      ) : null}

      <div className={cn("relative overflow-hidden rounded-[1.5rem] border", isDark ? "border-white/10 bg-slate-950/60" : "border-cyan-100/90 bg-sky-50/70")}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${universeWidth} ${universeHeight}`}
          className="block h-auto w-full cursor-grab touch-none active:cursor-grabbing"
          role="img"
          aria-label={t({
            en: "Math Universe: every CCSS domain as a spiral arm, every grade as a ring of stars",
            zh: "數學宇宙：每個 CCSS 領域是一條旋臂，每個年級是一圈星環",
            zhHans: "数学宇宙：每个 CCSS 领域是一条旋臂，每个年级是一圈星环"
          })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHovered(null)}
        >
          <g ref={cameraGroupRef}>
            {Array.from({ length: 150 }, (_, index) => {
              const dx = (Math.abs(Math.sin(index * 127.13)) % 1) * universeWidth;
              const dy = (Math.abs(Math.sin((index + 500) * 311.7)) % 1) * universeHeight;
              return (
                <circle
                  key={`dust-${index}`}
                  cx={dx.toFixed(1)}
                  cy={dy.toFixed(1)}
                  r={index % 11 === 0 ? 1.3 : 0.7}
                  fill={isDark ? "#c7d4ff" : "#94a3b8"}
                  opacity={0.25}
                />
              );
            })}

            <circle cx={universeWidth / 2} cy={600} r={44} fill={isDark ? "#fff7d6" : "#f59e0b"} opacity={isDark ? 0.9 : 0.5} style={{ filter: "blur(2px)" }} />

            {Array.from({ length: 9 }, (_, index) => (
              <ellipse
                key={`ring-${index}`}
                cx={universeWidth / 2}
                cy={600}
                rx={118 + (index + 1) * 84}
                ry={(118 + (index + 1) * 84) * 0.94}
                fill="none"
                stroke={isDark ? "#9aa6c8" : "#475569"}
                strokeWidth={0.5}
                opacity={0.08}
              />
            ))}

            {activeRoad ? (
              <>
                <polyline
                  points={activeRoad.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={armColors[activeRoad.arm]}
                  strokeWidth={7}
                  opacity={0.14}
                  strokeLinecap="round"
                  style={{ filter: "blur(4px)" }}
                />
                <polyline
                  className="math-universe-road"
                  points={activeRoad.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={armColors[activeRoad.arm]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${armColors[activeRoad.arm]})` }}
                />
              </>
            ) : null}

            {map.clusters.map((cluster) => {
              const dimmedByRoad = roadClusterIds ? !roadClusterIds.has(cluster.id) : false;
              return (
                <g key={cluster.id} data-universe-cluster={cluster.id} opacity={cluster.fog || cluster.sealed ? (dimmedByRoad ? 0.2 : 0.42) : dimmedByRoad ? 0.24 : 1} style={{ transition: "opacity 300ms ease" }}>
                  <ellipse
                    cx={cluster.x}
                    cy={cluster.y}
                    rx={30 + cluster.standardCount * 1.1}
                    ry={24 + cluster.standardCount * 0.8}
                    fill={armColors[cluster.arm]}
                    opacity={cluster.litCount ? 0.1 : 0.045}
                    style={{ filter: "blur(6px)" }}
                  />
                  <text
                    x={cluster.x}
                    y={cluster.y - (30 + cluster.standardCount * 0.9)}
                    textAnchor="middle"
                    fontSize={11}
                    fill={isDark ? "#9aa6c8" : "#475569"}
                    fontFamily="ui-monospace, monospace"
                    fontWeight={600}
                    data-universe-label="1"
                    data-lx={cluster.x.toFixed(1)}
                    data-ly={(cluster.y - (30 + cluster.standardCount * 0.9)).toFixed(1)}
                    opacity={0}
                  >
                    {cluster.id} · {cluster.litCount}/{cluster.standardCount}
                    {cluster.complete ? " ★" : ""}
                  </text>
                </g>
              );
            })}

            {map.stars.map((star) => {
              const cluster = map.clusters.find((candidate) => candidate.id === star.clusterId);
              const dimmedByRoad = roadClusterIds ? !roadClusterIds.has(star.clusterId) : false;
              const fogged = Boolean(cluster && (cluster.fog || cluster.sealed));
              const visual = starVisual(star, theme);
              return (
                <g key={star.id} opacity={fogged ? (dimmedByRoad ? 0.2 : 0.45) : dimmedByRoad ? 0.24 : 1} style={{ transition: "opacity 300ms ease" }}>
                  {star.status === "current" ? (
                    <>
                      <circle cx={star.x} cy={star.y} r={18} fill={visual.fill} opacity={0.12} className="math-universe-pulse" />
                      <circle cx={star.x} cy={star.y} r={11} fill="none" stroke={visual.fill} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.9} />
                    </>
                  ) : null}
                  {star.status === "fading" ? (
                    <circle cx={star.x} cy={star.y} r={12} fill="#fbbf24" opacity={0.18} className="math-universe-pulse" />
                  ) : null}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={visual.r}
                    fill={visual.fill}
                    opacity={visual.opacity}
                    data-universe-star-status={star.status}
                    style={visual.glow ? { filter: `drop-shadow(0 0 ${star.status === "current" ? 12 : 8}px ${visual.glow})` } : undefined}
                  />
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={10}
                    fill="transparent"
                    onPointerEnter={(event) => onStarHover(star, event)}
                    onPointerLeave={() => setHovered(null)}
                    style={{ cursor: "pointer" }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {hovered ? (
          <div
            className={cn("pointer-events-none absolute z-30 w-[15.5rem] rounded-2xl border p-3 shadow-2xl backdrop-blur-md", hudCardClass)}
            style={{ left: hovered.left, top: hovered.top }}
            role="status"
          >
            <p className="font-mono text-[0.68rem] font-black" style={{ color: armColors[hovered.star.arm] }}>
              {hovered.star.code}
            </p>
            <p className="mt-1 text-sm font-black leading-tight">
              {hovered.star.title ??
                t({
                  en: "Sealed star chart — revealed as your route approaches",
                  zh: "星圖封存——航線接近時揭曉",
                  zhHans: "星图封存——航线接近时揭晓"
                })}
            </p>
            <p className={cn("mt-1.5 text-xs font-bold", hudMutedClass)}>{t(statusLabels[hovered.star.status])}</p>
          </div>
        ) : null}

        <div className={cn("absolute left-4 top-3 z-20 rounded-2xl border px-4 py-3 backdrop-blur-md", hudCardClass)} data-universe-illumination>
          <p className={cn("text-[0.62rem] font-black uppercase", hudMutedClass)}>
            {t({ en: "Universe illuminated", zh: "宇宙點亮進度", zhHans: "宇宙点亮进度" })}
          </p>
          <p className="mt-0.5 text-lg font-black tabular-nums">
            {map.illumination.percent}% · {map.illumination.litCount}/{map.illumination.totalCount}
          </p>
          {journeyDelta > 0 ? (
            <p className="mt-0.5 text-xs font-black text-emerald-500 dark:text-emerald-300" data-universe-journey>
              {t({ en: `+${journeyDelta} stars since your last visit`, zh: `距上次造訪 +${journeyDelta} 顆星`, zhHans: `距上次造访 +${journeyDelta} 颗星` })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" data-universe-atlas>
        <span className={cn("text-xs font-black uppercase", hudMutedClass)}>
          {t({ en: "Star atlas", zh: "星圖收藏", zhHans: "星图收藏" })} · {completedClusters.length}
        </span>
        {completedClusters.slice(0, 8).map((cluster) => (
          <span
            key={cluster.id}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black", chipClass)}
            style={{ borderColor: armColors[cluster.arm] }}
            data-universe-atlas-badge={cluster.id}
          >
            <span aria-hidden="true" style={{ color: armColors[cluster.arm] }}>★</span>
            {cluster.id}
          </span>
        ))}
        {completedClusters.length > 8 ? (
          <span className={cn("text-xs font-black", hudMutedClass)}>+{completedClusters.length - 8}</span>
        ) : null}
        <span className={cn("ml-auto hidden text-xs font-bold sm:inline", hudMutedClass)}>
          {t({ en: "Arms:", zh: "旋臂：", zhHans: "旋臂：" })}{" "}
          {(Object.keys(armNames) as CcssArmId[]).map((arm, index) => (
            <span key={arm}>
              {index ? " · " : ""}
              <span style={{ color: armColors[arm] }}>●</span> {text(armNames[arm])}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
