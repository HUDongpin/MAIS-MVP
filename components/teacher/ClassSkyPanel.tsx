"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { ClassSkyMap } from "@/lib/classSkyMap";
import type { CcssArmId } from "@/data/ccssStandards";
import type { GradeId } from "@/types";

type ClassSkyPanelProps = {
  classes: Array<{ id: string; name: string; grade: GradeId }>;
  initialClassId: string | null;
};

type ClassSkyFetch =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; classSky: ClassSkyMap; className: string; curriculumTrack: string | null };

const armColors: Record<CcssArmId, string> = {
  number: "#22d3ee",
  ratio: "#f472b6",
  algebra: "#a78bfa",
  geometry: "#34d399",
  data: "#fbbf24"
};

export function ClassSkyPanel({ classes, initialClassId }: ClassSkyPanelProps) {
  const { t } = useSettings();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialClassId && classes.some((candidate) => candidate.id === initialClassId)
      ? initialClassId
      : classes[0]?.id ?? null
  );
  const [fetchState, setFetchState] = useState<ClassSkyFetch>({ status: "idle" });
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    setFetchState({ status: "loading" });
    const load = async () => {
      try {
        const response = await fetch(`/api/teacher/classes/${encodeURIComponent(selectedClassId)}/class-sky`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Class sky request failed (${response.status}).`);
        const payload = (await response.json()) as {
          classSky?: ClassSkyMap;
          className?: string;
          curriculumTrack?: string | null;
        };
        if (cancelled) return;
        if (!payload.classSky) throw new Error("Class sky payload missing.");
        setFetchState({
          status: "ready",
          classSky: payload.classSky,
          className: payload.className ?? "",
          curriculumTrack: payload.curriculumTrack ?? null
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
  }, [selectedClassId]);

  const hoveredCluster = useMemo(() => {
    if (fetchState.status !== "ready" || !hoveredClusterId) return null;
    return fetchState.classSky.clusters.find((cluster) => cluster.id === hoveredClusterId) ?? null;
  }, [fetchState, hoveredClusterId]);

  if (!classes.length) return null;

  return (
    <section className="glass-panel min-w-0 p-6" data-class-sky-panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">
            {t({ en: "Class sky", zh: "班級星空", zhHans: "班级星空" })}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t({
              en: "The whole CCSS universe painted with class heat: bright constellations are mastered together, red rings mark where students are struggling right now.",
              zh: "以全班熱度繪製的 CCSS 宇宙：明亮星座代表全班共同掌握，紅圈標記目前有學生受困的位置。",
              zhHans: "以全班热度绘制的 CCSS 宇宙：明亮星座代表全班共同掌握，红圈标记目前有学生受困的位置。"
            })}
          </p>
        </div>
        <select
          aria-label={t({ en: "Choose class", zh: "選擇班級", zhHans: "选择班级" })}
          className="focus-ring rounded-full border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm font-black text-slate-800 dark:border-white/15 dark:bg-white/[0.08] dark:text-white"
          value={selectedClassId ?? ""}
          onChange={(event) => setSelectedClassId(event.target.value)}
          data-class-sky-selector
        >
          {classes.map((teacherClass) => (
            <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>
          ))}
        </select>
      </div>

      {fetchState.status === "loading" || fetchState.status === "idle" ? (
        <div className="mt-6 grid min-h-[16rem] place-items-center text-sm font-black text-slate-500 dark:text-slate-400" data-class-sky-loading>
          {t({ en: "Charting the class sky…", zh: "正在繪製班級星空……", zhHans: "正在绘制班级星空……" })}
        </div>
      ) : fetchState.status === "error" ? (
        <p className="mt-6 text-sm font-bold text-rose-600 dark:text-rose-300" data-class-sky-error>{fetchState.message}</p>
      ) : (
        <>
          <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-slate-950 dark:border-white/10">
            <svg
              viewBox="0 0 1520 1180"
              className="block h-auto w-full"
              role="img"
              aria-label={t({
                en: "Class sky heatmap of CCSS clusters",
                zh: "CCSS 星團的班級熱力星空",
                zhHans: "CCSS 星团的班级热力星空"
              })}
            >
              {Array.from({ length: 9 }, (_, index) => (
                <ellipse
                  key={`ring-${index}`}
                  cx={760}
                  cy={600}
                  rx={118 + (index + 1) * 84}
                  ry={(118 + (index + 1) * 84) * 0.94}
                  fill="none"
                  stroke="#9aa6c8"
                  strokeWidth={0.6}
                  opacity={0.1}
                />
              ))}
              <circle cx={760} cy={600} r={40} fill="#fff7d6" opacity={0.85} style={{ filter: "blur(2px)" }} />

              {fetchState.classSky.roads.map((road) => (
                <polyline
                  key={road.id}
                  points={road.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={armColors[road.arm]}
                  strokeWidth={1}
                  strokeDasharray="2 7"
                  opacity={0.2}
                />
              ))}

              {fetchState.classSky.clusters.map((cluster) => {
                const isHotspot = fetchState.classSky.hotspots.includes(cluster.id);
                const heatOpacity = cluster.sealed ? 0.04 : 0.06 + cluster.heat * 0.55;
                const radius = 16 + Math.sqrt(cluster.standardCount) * 6;
                return (
                  <g
                    key={cluster.id}
                    data-class-sky-cluster={cluster.id}
                    onPointerEnter={() => setHoveredClusterId(cluster.id)}
                    onPointerLeave={() => setHoveredClusterId((previous) => (previous === cluster.id ? null : previous))}
                    style={{ cursor: "pointer" }}
                  >
                    <ellipse
                      cx={cluster.x}
                      cy={cluster.y}
                      rx={radius + 16}
                      ry={radius + 8}
                      fill={armColors[cluster.arm]}
                      opacity={heatOpacity}
                      style={{ filter: "blur(5px)" }}
                    />
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={6 + cluster.heat * 8}
                      fill={armColors[cluster.arm]}
                      opacity={cluster.sealed ? 0.25 : 0.35 + cluster.heat * 0.65}
                      style={cluster.heat > 0.5 ? { filter: `drop-shadow(0 0 10px ${armColors[cluster.arm]})` } : undefined}
                    />
                    {isHotspot ? (
                      <circle cx={cluster.x} cy={cluster.y} r={18} fill="none" stroke="#fb7185" strokeWidth={2.4} strokeDasharray="6 5" data-class-sky-hotspot={cluster.id} />
                    ) : null}
                    {cluster.attemptedCount > 0 || isHotspot ? (
                      <text
                        x={cluster.x}
                        y={cluster.y - radius - 10}
                        textAnchor="middle"
                        fontSize={17}
                        fontFamily="ui-monospace, monospace"
                        fontWeight={700}
                        fill="#c7d4ff"
                      >
                        {cluster.id} · {Math.round(cluster.heat * 100)}%
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {hoveredCluster ? (
              <div className="pointer-events-none absolute left-4 top-4 z-10 w-64 rounded-2xl border border-white/15 bg-slate-950/[0.88] p-4 text-white shadow-2xl backdrop-blur-md" role="status">
                <p className="font-mono text-xs font-black" style={{ color: armColors[hoveredCluster.arm] }}>{hoveredCluster.id}</p>
                <p className="mt-1 text-lg font-black tabular-nums">{Math.round(hoveredCluster.heat * 100)}% {t({ en: "class heat", zh: "班級熱度", zhHans: "班级热度" })}</p>
                <p className="mt-1 text-xs font-bold text-slate-300">
                  {t({ en: "Mastered", zh: "已掌握", zhHans: "已掌握" })} {hoveredCluster.masteredCount} · {t({ en: "Working", zh: "進行中", zhHans: "进行中" })} {hoveredCluster.attemptedCount} · {t({ en: "Struggling", zh: "受困", zhHans: "受困" })} {hoveredCluster.strugglingCount}
                </p>
              </div>
            ) : null}

            <div className="absolute bottom-3 left-4 z-10 rounded-full border border-white/15 bg-slate-950/[0.85] px-4 py-2 text-xs font-black text-slate-200 backdrop-blur-md" data-class-sky-average>
              {t({ en: "Class illumination", zh: "班級點亮度", zhHans: "班级点亮度" })} {fetchState.classSky.illumination.averagePercent}% · {fetchState.classSky.studentCount} {t({ en: "students", zh: "位學生", zhHans: "位学生" })}
            </div>
          </div>

          {fetchState.classSky.hotspots.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2" data-class-sky-hotspot-list>
              <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-300">
                {t({ en: "Hot spots", zh: "受困熱點", zhHans: "受困热点" })}
              </span>
              {fetchState.classSky.hotspots.map((clusterId) => {
                const cluster = fetchState.classSky.clusters.find((candidate) => candidate.id === clusterId);
                if (!cluster) return null;
                return (
                  <span key={clusterId} className="inline-flex items-center gap-2 rounded-full border border-rose-300/60 bg-rose-400/10 px-3 py-1.5 text-xs font-black text-rose-700 dark:text-rose-200">
                    <span className="font-mono">{clusterId}</span>
                    {cluster.strugglingCount} {t({ en: "struggling", zh: "人受困", zhHans: "人受困" })}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              {t({ en: "No struggling clusters right now — the sky is calm.", zh: "目前沒有受困星團——星空平靜。", zhHans: "目前没有受困星团——星空平静。" })}
            </p>
          )}

          {fetchState.curriculumTrack !== "US_CA_MATH" ? (
            <p className="mt-3 rounded-2xl border border-amber-300/55 bg-amber-100/60 px-4 py-2.5 text-xs font-bold text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">
              {t({
                en: "The class sky charts CCSS (US California) classes; other curricula appear once their sky maps are charted.",
                zh: "班級星空目前對應 CCSS（美國加州）班級；其他課程的星圖繪製後亦會顯示。",
                zhHans: "班级星空目前对应 CCSS（美国加州）班级；其他课程的星图绘制后亦会显示。"
              })}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
