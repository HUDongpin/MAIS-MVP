"use client";

import { useCallback, useRef } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { MathUniverseMap, UniverseStar } from "@/lib/mathUniverseMap";
import type { CcssArmId } from "@/data/ccssStandards";
import { localeForLanguage } from "@/lib/i18n";
import type { GradeId } from "@/types";

type MathUniversePosterProps = {
  map: MathUniverseMap;
  studentName: string | null;
  studentGrade: GradeId;
  onClose: () => void;
};

const armColors: Record<CcssArmId, string> = {
  number: "#22d3ee",
  ratio: "#f472b6",
  algebra: "#a78bfa",
  geometry: "#34d399",
  data: "#fbbf24"
};

function posterStarColor(star: UniverseStar) {
  switch (star.status) {
    case "lit": return armColors[star.arm];
    case "fading": return "#fbbf24";
    case "unstable": return "#fb7185";
    case "current": return "#ffffff";
    case "igniting": return "#8b93b8";
    case "charted": return "#39415f";
    default: return "#232a45";
  }
}

function posterStarRadius(star: UniverseStar) {
  switch (star.status) {
    case "current": return 6.4;
    case "lit": return 4.8;
    case "fading": return 4.4;
    case "unstable": return 4.2;
    case "igniting": return 3.4;
    case "charted": return 2.6;
    default: return 2;
  }
}

export function MathUniversePoster({ map, studentName, studentGrade, onClose }: MathUniversePosterProps) {
  const { language, t } = useSettings();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const posterDate = new Intl.DateTimeFormat(localeForLanguage(language), {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date());
  const displayName = studentName?.trim() || t({ en: "My", zh: "我的", zhHans: "我的" });
  const title = t({
    en: `${displayName}'s Math Universe`,
    zh: `${displayName}的數學宇宙`,
    zhHans: `${displayName}的数学宇宙`
  });
  const completedCount = map.clusters.filter((cluster) => cluster.complete).length;

  const downloadPng = useCallback(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 840 * 2;
      canvas.height = 1120 * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = "math-universe-poster.png";
      anchor.click();
    };
    image.src = url;
  }, []);

  const openPrintView = useCallback(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) return;
    printWindow.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>body{margin:0;display:grid;place-items:center;background:#fff}svg{width:100%;max-width:840px;height:auto}` +
      `@media print{body{background:#fff}}</style></head><body>${serialized}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [title]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} data-universe-poster>
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/15 shadow-2xl">
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 840 1120"
            className="block h-auto w-full"
            role="img"
            aria-label={title}
          >
            <rect width="840" height="1120" fill="#070b1e" />
            <rect x="24" y="24" width="792" height="1072" fill="none" stroke="#2c3352" strokeWidth="1.6" rx="18" />

            <text x="420" y="96" textAnchor="middle" fontSize="34" fontWeight="800" fill="#f5f8ff" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
              {title}
            </text>
            <text x="420" y="128" textAnchor="middle" fontSize="15" fontWeight="600" fill="#9aa6c8" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
              {t({ en: "Every CCSS standard is a star", zh: "每個 CCSS 標準都是一顆星", zhHans: "每个 CCSS 标准都是一颗星" })} · {posterDate}
            </text>

            <g transform="translate(28 160) scale(0.516)">
              {map.roads.map((road) => (
                <polyline
                  key={road.id}
                  points={road.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={armColors[road.arm]}
                  strokeWidth={1.4}
                  strokeDasharray="3 9"
                  opacity={0.28}
                />
              ))}
              <circle cx={760} cy={600} r={40} fill="#fff7d6" opacity={0.9} />
              {map.stars.map((star) => (
                <circle
                  key={star.id}
                  cx={star.x.toFixed(1)}
                  cy={star.y.toFixed(1)}
                  r={posterStarRadius(star)}
                  fill={posterStarColor(star)}
                  opacity={star.status === "sealed" ? 0.4 : 1}
                />
              ))}
              {map.clusters
                .filter((cluster) => cluster.litCount > 0)
                .map((cluster) => (
                  <text
                    key={cluster.id}
                    x={cluster.x}
                    y={cluster.y - (34 + cluster.standardCount * 0.9)}
                    textAnchor="middle"
                    fontSize="19"
                    fontWeight="700"
                    fill="#c7d4ff"
                    fontFamily="ui-monospace, monospace"
                  >
                    {cluster.id} {cluster.complete ? "★" : `${cluster.litCount}/${cluster.standardCount}`}
                  </text>
                ))}
            </g>

            <text x="420" y="812" textAnchor="middle" fontSize="26" fontWeight="800" fill="#f5f8ff" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
              {map.illumination.percent}% {t({ en: "of the universe illuminated", zh: "的宇宙已被點亮", zhHans: "的宇宙已被点亮" })}
            </text>
            <text x="420" y="844" textAnchor="middle" fontSize="16" fontWeight="600" fill="#9aa6c8" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
              {map.illumination.litCount} / {map.illumination.totalCount} {t({ en: "stars lit", zh: "顆星已點亮", zhHans: "颗星已点亮" })} · {completedCount} {t({ en: "constellations complete", zh: "個星座完成", zhHans: "个星座完成" })} · {t({ en: "Grade", zh: "年級", zhHans: "年级" })} {studentGrade}
            </text>

            <rect x="120" y="880" width="600" height="12" rx="6" fill="#1c2342" />
            <rect x="120" y="880" width={Math.max(12, 600 * (map.illumination.percent / 100))} height="12" rx="6" fill="url(#poster-progress)" />
            <defs>
              <linearGradient id="poster-progress" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#22d3ee" />
                <stop offset="0.55" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#f472b6" />
              </linearGradient>
            </defs>

            {(Object.keys(armColors) as CcssArmId[]).map((arm, index) => (
              <g key={arm} transform={`translate(${140 + index * 120} 940)`}>
                <circle cx="0" cy="0" r="6" fill={armColors[arm]} />
                <text x="12" y="5" fontSize="13" fontWeight="700" fill="#9aa6c8" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
                  {{
                    number: t({ en: "Number", zh: "數", zhHans: "数" }),
                    ratio: t({ en: "Fractions", zh: "分數", zhHans: "分数" }),
                    algebra: t({ en: "Algebra", zh: "代數", zhHans: "代数" }),
                    geometry: t({ en: "Geometry", zh: "幾何", zhHans: "几何" }),
                    data: t({ en: "Data", zh: "數據", zhHans: "数据" })
                  }[arm]}
                </text>
              </g>
            ))}

            <text x="420" y="1044" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5a6690" fontFamily="Avenir Next, Avenir, Futura, system-ui, sans-serif">
              MAIS · {t({ en: "Math Universe", zh: "數學宇宙", zhHans: "数学宇宙" })} · {t({ en: "Keep your stars burning", zh: "讓星星持續發光", zhHans: "让星星持续发光" })}
            </text>
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={downloadPng}
            data-universe-poster-download
            className={cn(
              "focus-ring rounded-full px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5",
              "bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 shadow-lg shadow-cyan-400/20"
            )}
          >
            {t({ en: "Download PNG", zh: "下載 PNG", zhHans: "下载 PNG" })}
          </button>
          <button
            type="button"
            onClick={openPrintView}
            data-universe-poster-print
            className="focus-ring rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            {t({ en: "Print for the fridge", zh: "打印貼上冰箱", zhHans: "打印贴上冰箱" })}
          </button>
          <button
            type="button"
            onClick={onClose}
            data-universe-poster-close
            className="focus-ring rounded-full border border-white/25 bg-transparent px-5 py-3 text-sm font-black text-slate-200 transition hover:-translate-y-0.5 hover:text-white"
          >
            {t({ en: "Close", zh: "關閉", zhHans: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );
}
