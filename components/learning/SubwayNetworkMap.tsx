"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "@/components/ui/Motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getMainlandHjbTransitDetails, isMainlandHjbRoadmapProfile, mainlandHjbMapDistrictLabels } from "@/data/mainlandHjbRoadmapPresentation";
import { getMainlandPepTransitDetails, isMainlandPepRoadmapProfile, mainlandPepMapDistrictLabels, type MainlandPepMapDistrictLabel } from "@/data/mainlandPepRoadmapPresentation";
import { topicsMetadata as fallbackTopics } from "@/data/topicsMetadata";
import {
  busColors,
  fallbackTransitDetails,
  getGradeDisplayName,
  routeColors,
  topicTransitDetails,
  type TransitBranch
} from "@/components/learning/LearningRoadmap";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import { cn } from "@/lib/utils";
import type { Grade, GradeId, Language, LocalizedText, RoadmapData, Topic } from "@/types";

const mapWidth = 4060;
const mapHeight = 1480;
const primaryMapRightGutter = 520;
const secondaryMapRightGutter = 620;
const terminalY = 250;
const gradeXs = [330, 897, 1463, 2030, 2597, 3163, 3730];
const sixGradeXs = [330, 1010, 1690, 2370, 3050, 3730];
const routeIndexPanelX = 54;
const routeIndexPanelWidth = 470;
const routeIndexEntryStartX = 90;
const routeIndexColumnSpacing = 120;
const routeIndexSwatchSize = 44;
const minZoom = 0.06;
const maxZoom = 1.12;
const desktopDetailZoom = 0.74;
const mobileDetailZoom = 0.66;
const dragPanThreshold = 4;

type Point = {
  x: number;
  y: number;
};

type MapLayer = "line" | "stations" | "labels";

type Viewport = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DragPanState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
  hasMoved: boolean;
  previousUserSelect: string;
};

type SelectedStation = {
  key: string;
  point: Point;
  topic: Topic;
  topicIndex: number;
  branchIndex: number;
  station: string;
  busStops: string[];
  routeColor: string;
  busColor: string;
  useGradeCodeLabel: boolean;
};

type SubwayMapBand = "primary" | "secondary";

type SubwayNetworkMapProps = {
  band: SubwayMapBand;
  grades: Grade[];
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  spineLabel: LocalizedText;
  ariaLabel: LocalizedText;
  spineColor?: string;
  embedded?: boolean;
  denseGradeFilter?: boolean;
  showBackLink?: boolean;
};

const hongKongMapDistrictLabels = [
  { x: 120, y: 110, label: { en: "New Territories", zh: "新界" } },
  { x: 1800, y: 560, label: { en: "Kowloon", zh: "九龍", zhHans: "九龙" } },
  { x: 2480, y: 1260, label: { en: "Hong Kong Island", zh: "香港島", zhHans: "香港岛" } }
] satisfies MainlandPepMapDistrictLabel[];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function FullscreenPortal({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (enabled && mounted) return createPortal(children, document.body);
  return <>{children}</>;
}

function routeCode(topic: Topic, topicIndex: number) {
  return `Subway ${topic.grade}-${topicIndex + 1}`;
}

function formatRoadmapGradeLabel(grade: GradeId, language: Language, useGradeCodeLabel = false) {
  return useGradeCodeLabel ? grade : formatGradeLabel(grade, language, true);
}

function localizedRouteCode(topic: Topic, topicIndex: number, language: Language, useGradeCodeLabel = false) {
  if (isChineseLanguage(language)) return simplifyChineseText(`${formatRoadmapGradeLabel(topic.grade, language, useGradeCodeLabel)}路線${topicIndex + 1}`, language);
  return routeCode(topic, topicIndex);
}

function getRouteColor(gradeIndex: number, topicIndex: number) {
  return routeColors[(gradeIndex * 3 + topicIndex) % routeColors.length];
}

function getMapGradeXs(gradeCount: number) {
  if (gradeCount === sixGradeXs.length) return sixGradeXs;
  if (gradeCount <= gradeXs.length) return gradeXs.slice(0, gradeCount);
  const lastX = gradeXs[gradeXs.length - 1];
  const extraStep = gradeXs[gradeXs.length - 1] - gradeXs[gradeXs.length - 2];
  return Array.from({ length: gradeCount }, (_, index) => gradeXs[index] ?? lastX + extraStep * (index - gradeXs.length + 1));
}

function getLastGradeX(mapGradeXs: readonly number[]) {
  return mapGradeXs[mapGradeXs.length - 1] ?? gradeXs[0];
}

function getRoutePoints(gradeX: number, topicIndex: number, band: SubwayMapBand) {
  const x = gradeX;
  const y = terminalY;
  const primaryOuterBranch: Point[] = [
    { x, y },
    { x: x + 270, y: y + 220 },
    { x: x + 360, y: y + 400 },
    { x: x + 360, y: y + 660 },
    { x: x + 240, y: y + 900 }
  ];
  const secondaryRightOuterBranch: Point[] = [
    { x, y },
    { x: x + 270, y: y + 220 },
    { x: x + 360, y: y + 400 },
    { x: x + 360, y: y + 660 },
    { x: x + 240, y: y + 900 }
  ];
  const secondaryLeftOuterBranch: Point[] = [
    { x, y },
    { x: x - 250, y: y + 220 },
    { x: x - 300, y: y + 400 },
    { x: x - 300, y: y + 660 },
    { x: x - 210, y: y + 900 }
  ];
  const patterns: Point[][] = [
    [
      { x, y },
      { x: x + 120, y: y + 160 },
      { x: x + 250, y: y + 300 },
      { x: x + 250, y: y + 480 },
      { x: x + 90, y: y + 650 }
    ],
    [
      { x, y },
      { x, y: y + 180 },
      { x, y: y + 360 },
      { x, y: y + 540 },
      { x, y: y + 720 }
    ],
    [
      { x, y },
      { x: x - 120, y: y + 160 },
      { x: x - 250, y: y + 300 },
      { x: x - 250, y: y + 480 },
      { x: x - 90, y: y + 650 }
    ],
    [
      { x, y },
      { x: x + 180, y: y + 230 },
      { x: x + 320, y: y + 405 },
      { x: x + 320, y: y + 640 },
      { x: x + 170, y: y + 870 }
    ],
    [
      { x, y },
      { x: x - 180, y: y + 230 },
      { x: x - 320, y: y + 405 },
      { x: x - 320, y: y + 640 },
      { x: x - 170, y: y + 870 }
    ]
  ];

  if (band === "primary" && topicIndex % patterns.length === 3) {
    return primaryOuterBranch;
  }

  if (band === "secondary" && topicIndex % patterns.length === 3) {
    return secondaryRightOuterBranch;
  }

  if (band === "secondary" && topicIndex % patterns.length === 4) {
    return secondaryLeftOuterBranch;
  }

  return patterns[topicIndex % patterns.length];
}

function pathFromPoints(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function splitLabel(label: string, maxLineLength = 13) {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function localizedMapBranchStation({
  branch,
  topic,
  branchIndex,
  language,
  text
}: {
  branch?: TransitBranch;
  topic: Topic;
  branchIndex: number;
  language: ReturnType<typeof useSettings>["language"];
  text: ReturnType<typeof useSettings>["text"];
}) {
  const station = branch?.stationLabel ? text(branch.stationLabel) : branch?.station ?? `Station ${branchIndex + 1}`;
  if (!isChineseLanguage(language)) return station;
  if (hasCjkText(station)) return simplifyChineseText(station, language);
  return simplifyChineseText(`${text(topic.title)}重點${branchIndex + 1}`, language);
}

function localizedMapBranchStops({
  branch,
  language,
  text
}: {
  branch?: TransitBranch;
  language: ReturnType<typeof useSettings>["language"];
  text: ReturnType<typeof useSettings>["text"];
}) {
  const stops = branch?.busStopLabels?.length ? branch.busStopLabels.map((stop) => text(stop)) : branch?.busStops ?? [];
  if (!isChineseLanguage(language)) return stops;
  if (stops.some(hasCjkText)) return stops.map((stop) => simplifyChineseText(stop, language));
  return ["核心概念", "視覺模型", "練習檢查"].map((stop) => simplifyChineseText(stop, language));
}

function StationLabel({
  point,
  label,
  index,
  busColor,
  stationKey,
  selected,
  onSelect
}: {
  point: Point;
  label: string;
  index: number;
  busColor: string;
  stationKey: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { language } = useSettings();
  const lines = splitLabel(label);
  const rightSide = index % 2 !== 0;
  const longestLine = Math.max(...lines.map((line) => line.length));
  const width = Math.max(136, Math.min(226, longestLine * 11 + 54));
  const height = lines.length * 21 + 16;
  const x = rightSide ? point.x + 28 : point.x - width - 28;
  const y = point.y - height / 2;
  const textX = x + 42;

  return (
    <g
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer outline-none"
      aria-label={isChineseLanguage(language) ? simplifyChineseText(`顯示${label}支線`, language) : `Show minibus route for ${label}`}
    >
      <path
        d={`M ${point.x} ${point.y} L ${rightSide ? x : x + width} ${point.y}`}
        stroke={selected ? busColor : "#94a3b8"}
        strokeWidth={selected ? "4" : "2"}
        strokeDasharray="5 5"
        opacity={selected ? "1" : "0.75"}
        pointerEvents="none"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="14"
        fill={selected ? "rgba(255,251,235,.98)" : "rgba(255,255,255,.96)"}
        stroke={selected ? busColor : "#cbd5e1"}
        strokeWidth={selected ? "4" : "2"}
        pointerEvents="none"
      />
      <rect x={x + 10} y={point.y - 13} width="24" height="26" rx="8" fill={busColor} pointerEvents="none" />
      <text x={x + 22} y={point.y + 6} textAnchor="middle" className="fill-slate-950 text-[15px] font-black" pointerEvents="none">
        {isChineseLanguage(language) ? "支" : "B"}
      </text>
      <text x={textX} y={y + 24} className="fill-slate-950 text-[18px] font-black" pointerEvents="none">
        {lines.map((line, lineIndex) => (
          <tspan key={line} x={textX} dy={lineIndex === 0 ? 0 : 21}>
            {line}
          </tspan>
        ))}
      </text>
      <rect
        data-station-key={stationKey}
        x={x}
        y={y}
        width={width}
        height={height}
        rx="14"
        fill="transparent"
        pointerEvents="all"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      />
    </g>
  );
}

function TopicRoute({
  topic,
  gradeIndex,
  gradeX,
  topicIndex,
  band,
  layer,
  selectedStationKey,
  showRouteLabel,
  showStationLabels,
  stationLabelStride,
  useGradeCodeLabel,
  onSelectStation
}: {
  topic: Topic;
  gradeIndex: number;
  gradeX: number;
  topicIndex: number;
  band: SubwayMapBand;
  layer: MapLayer;
  selectedStationKey?: string;
  showRouteLabel: boolean;
  showStationLabels: boolean;
  stationLabelStride: number;
  useGradeCodeLabel: boolean;
  onSelectStation: (station: SelectedStation) => void;
}) {
  const { language, text } = useSettings();
  const details = getMainlandHjbTransitDetails(topic) ?? getMainlandPepTransitDetails(topic) ?? topicTransitDetails[topic.id] ?? fallbackTransitDetails;
  const points = getRoutePoints(gradeX, topicIndex, band);
  const stationPoints = points.slice(1);
  const color = getRouteColor(gradeIndex, topicIndex);
  const labelPoint = stationPoints[1] ?? stationPoints[0];
  const labelAnchor = topicIndex % 2 === 0 ? "start" : "end";
  const labelX = labelPoint.x + (topicIndex % 2 === 0 ? 24 : -24);

  if (layer === "line") {
    return (
      <g>
        <path d={pathFromPoints(points)} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="18" />
        <path d={pathFromPoints(points)} fill="none" stroke="rgba(255,255,255,.65)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      </g>
    );
  }

  if (layer === "stations") {
    return (
      <g>
        {stationPoints.map((point, stationIndex) => {
	          const branch = details.branches[stationIndex];
	          const station = localizedMapBranchStation({ branch, topic, branchIndex: stationIndex, language, text });
          const stationKey = `${topic.id}-${stationIndex}`;
          const busColor = busColors[(topicIndex + stationIndex) % busColors.length];
          const selected = selectedStationKey === stationKey;
          const selectedStation: SelectedStation = {
            key: stationKey,
            point,
            topic,
            topicIndex,
            branchIndex: stationIndex,
            station,
	            busStops: localizedMapBranchStops({ branch, language, text }),
            routeColor: color,
            busColor,
            useGradeCodeLabel
          };
          return (
            <g
              key={`${topic.id}-${station}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectStation(selectedStation)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStation(selectedStation);
                }
              }}
              className="cursor-pointer outline-none"
	              aria-label={isChineseLanguage(language) ? simplifyChineseText(`顯示${station}支線`, language) : `Show minibus route for ${station}`}
            >
              {selected ? <circle cx={point.x} cy={point.y} r="32" fill={busColor} opacity="0.25" /> : null}
              <circle cx={point.x} cy={point.y} r="21" fill="white" opacity="0.96" />
              <circle cx={point.x} cy={point.y} r={selected ? "21" : "17"} className="fill-white stroke-slate-950" strokeWidth={selected ? "7" : "5"} />
              <circle cx={point.x} cy={point.y} r="7" fill={color} />
              <circle cx={point.x + 25} cy={point.y + 23} r="12" fill={busColor} stroke="white" strokeWidth="3" />
              <text x={point.x + 25} y={point.y + 28} textAnchor="middle" className="fill-slate-950 text-[13px] font-black">
	                {isChineseLanguage(language) ? "支" : "B"}
              </text>
              <circle
                data-station-key={stationKey}
                cx={point.x}
                cy={point.y}
                r="46"
                fill="transparent"
                pointerEvents="all"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectStation(selectedStation);
                }}
              />
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <g>
      {showRouteLabel ? (
      <g>
        <rect
          x={labelAnchor === "start" ? labelX - 12 : labelX - 190}
          y={labelPoint.y + 24}
          width="202"
          height="56"
          rx="18"
          className="fill-white/95 stroke-slate-300"
        />
        <text
          x={labelX}
          y={labelPoint.y + 47}
          textAnchor={labelAnchor}
          className="fill-slate-950 text-[17px] font-black"
        >
	          {localizedRouteCode(topic, topicIndex, language, useGradeCodeLabel)}
        </text>
        <text
          x={labelX}
          y={labelPoint.y + 68}
          textAnchor={labelAnchor}
          className="fill-slate-600 text-[15px] font-bold"
        >
          {text(topic.title)}
        </text>
      </g>
      ) : null}

      {showStationLabels ? stationPoints.map((point, stationIndex) => {
	        const branch = details.branches[stationIndex];
	        const station = localizedMapBranchStation({ branch, topic, branchIndex: stationIndex, language, text });
        const stationKey = `${topic.id}-${stationIndex}`;
        const showStaggeredLabel = stationLabelStride <= 1 || stationIndex % stationLabelStride === topicIndex % stationLabelStride || selectedStationKey === stationKey;
        if (!showStaggeredLabel) return null;
        const busColor = busColors[(topicIndex + stationIndex) % busColors.length];
        const selectedStation: SelectedStation = {
          key: stationKey,
          point,
          topic,
          topicIndex,
          branchIndex: stationIndex,
          station,
	          busStops: localizedMapBranchStops({ branch, language, text }),
          routeColor: color,
          busColor,
          useGradeCodeLabel
        };
        return (
          <g key={`${topic.id}-${station}-label`}>
            <StationLabel
              point={point}
              label={station}
              index={stationIndex + topicIndex}
              busColor={busColor}
              stationKey={stationKey}
              selected={selectedStationKey === stationKey}
              onSelect={() => onSelectStation(selectedStation)}
            />
          </g>
        );
      }) : null}
    </g>
  );
}

function BusRouteContent({ station, onClose, layout = "stack" }: { station: SelectedStation; onClose?: () => void; layout?: "stack" | "wide" | "compact" }) {
  const { language, text } = useSettings();
  const isChinese = isChineseLanguage(language);
  const isWideLayout = layout === "wide";
  const isCompactLayout = layout === "compact";
  const busRouteLabel = isChinese
    ? simplifyChineseText(`支線${station.topicIndex + 1}-${station.branchIndex + 1}`, language)
    : `BUS ${formatRoadmapGradeLabel(station.topic.grade, language, station.useGradeCodeLabel)}${station.topicIndex + 1}-${String.fromCharCode(65 + station.branchIndex)}`;
  const busRouteActionLabel = isChinese
    ? simplifyChineseText(`關閉${busRouteLabel}`, language)
    : `Close ${busRouteLabel} minibus route`;

  return (
    <div className={cn(isWideLayout && "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.56fr)] xl:items-start xl:gap-6")}>
      <div>
        <div className={cn("flex items-center", isCompactLayout ? "gap-2" : "gap-3")}>
          <span className={cn("rounded-full", isCompactLayout ? "h-3 w-9" : "h-4 w-12")} style={{ backgroundColor: station.routeColor }} />
          <span className={cn("font-black uppercase text-slate-400", isCompactLayout ? "text-[10px] tracking-[0.14em]" : "text-xs tracking-[0.18em]")}>
	            {localizedRouteCode(station.topic, station.topicIndex, language, station.useGradeCodeLabel)}
          </span>
        </div>

        <h2 className={cn("font-black leading-tight text-white", isCompactLayout ? "mt-2 text-xl" : "mt-3 text-2xl")}>{station.station}</h2>
        <p className={cn("font-semibold text-slate-300", isCompactLayout ? "mt-1 text-xs leading-5" : "mt-2 text-sm")}>{text(station.topic.title)}</p>
      </div>

      <div className={cn(
        "border border-white/10 bg-slate-950/60",
        isCompactLayout ? "mt-4 rounded-xl p-3" : "rounded-2xl p-4",
        isWideLayout ? "mt-5 xl:mt-0" : !isCompactLayout && "mt-5"
      )}>
        <div className={cn("flex flex-wrap items-center", isCompactLayout ? "gap-2" : "gap-3")}>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={busRouteActionLabel}
              className={cn(
                "focus-ring rounded-full font-black text-slate-950 transition hover:-translate-y-0.5 hover:brightness-105",
                isCompactLayout ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs"
              )}
              style={{ backgroundColor: station.busColor }}
            >
              {busRouteLabel}
            </button>
          ) : (
            <span className={cn("rounded-full font-black text-slate-950", isCompactLayout ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs")} style={{ backgroundColor: station.busColor }}>
              {busRouteLabel}
            </span>
          )}
	          <span className={cn("font-bold uppercase text-slate-400", isCompactLayout ? "text-[10px] tracking-[0.12em]" : "text-xs tracking-[0.16em]")}>{isChineseLanguage(language) ? simplifyChineseText("附屬路線", language) : "attached route"}</span>
        </div>

        <div className={cn("relative", isCompactLayout ? "mt-4 space-y-3 pl-3" : "mt-5 space-y-4 pl-4")}>
          <span className={cn("absolute rounded-full", isCompactLayout ? "bottom-4 left-[1.05rem] top-4 w-1" : "bottom-5 left-[1.3rem] top-5 w-1.5")} style={{ backgroundColor: station.busColor }} />
          {station.busStops.map((stop) => (
            <div key={stop} className={cn("relative flex items-center", isCompactLayout ? "min-h-8 gap-2" : "min-h-10 gap-3")}>
              <span className={cn("z-10 grid shrink-0 place-items-center rounded-full border-2 border-white bg-slate-950", isCompactLayout ? "h-7 w-7" : "h-8 w-8")}>
                <span className={cn("rounded-full", isCompactLayout ? "h-2.5 w-2.5" : "h-3 w-3")} style={{ backgroundColor: station.busColor }} />
              </span>
              <span className={cn("border border-white/10 bg-white/[0.06] font-bold text-white", isCompactLayout ? "rounded-xl px-2.5 py-1.5 text-xs leading-5" : "rounded-2xl px-3 py-2 text-sm")}>
                {stop}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BusDetailPanel({ station, onClose, layout = "side" }: { station?: SelectedStation; onClose?: () => void; layout?: "side" | "wide" | "compact" }) {
  const { language } = useSettings();
  const isWideLayout = layout === "wide";
  const isCompactLayout = layout === "compact";

  if (!station) {
    return (
      <aside
        className={cn(
          "rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 text-slate-200",
          !isWideLayout && "xl:sticky xl:top-24",
          isWideLayout && "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.48fr)] xl:items-center xl:gap-6"
        )}
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">{isChineseLanguage(language) ? simplifyChineseText("支線詳情", language) : "Minibus details"}</p>
          <h2 className="mt-3 text-2xl font-black text-white">{isChineseLanguage(language) ? simplifyChineseText("選擇一個站點", language) : "Select a Subway station"}</h2>
          <p className={cn("mt-3 text-sm leading-6 text-slate-300", isWideLayout && "max-w-3xl")}>
            {isChineseLanguage(language)
              ? simplifyChineseText("完整路線圖預設保持簡潔。點擊站點圓點或標籤，即可查看該概念連接的支線。", language)
              : "The full Subway map stays clean by default. Click a station circle or its label to reveal the attached minibus route for that specific concept."}
          </p>
        </div>
        <div className={cn("rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4", isWideLayout ? "mt-5 xl:mt-0" : "mt-5")}>
          <p className="text-sm font-bold text-cyan-100">{isChineseLanguage(language) ? simplifyChineseText("介面規則", language) : "UI rule"}</p>
          <p className="mt-2 text-xs leading-5 text-cyan-50/80">
            {isChineseLanguage(language)
              ? simplifyChineseText("支線內容以站點詳情儲存，但每次只在此面板展開一條路線，讓完整知識圖可用而不造成文字重疊。", language)
              : "Bus routes are stored as station-level details, but only one route expands in this panel at a time. This keeps the complete knowledge graph available without text collisions."}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      key={station.key}
      className={cn(
        "border border-white/10 bg-white/[0.07] text-slate-200 shadow-xl shadow-black/20 transition",
        isCompactLayout ? "max-h-[calc(100vh-12rem)] overflow-y-auto rounded-[1.25rem] p-4" : "rounded-[1.5rem] p-5",
        !isWideLayout && !isCompactLayout && "xl:sticky xl:top-24"
      )}
    >
      <BusRouteContent station={station} onClose={onClose} layout={isCompactLayout ? "compact" : isWideLayout ? "wide" : "stack"} />

      {!isCompactLayout ? (
        <p className={cn("mt-4 text-xs leading-5 text-slate-400", isWideLayout && "rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3")}>
          {isChineseLanguage(language)
            ? simplifyChineseText("此站點面板會顯示支線內容，主地圖則保持清晰可讀。", language)
            : "This station-linked panel is where the minibus layer appears. The main map remains a readable Subway overview."}
        </p>
      ) : null}
    </aside>
  );
}

function MobileBusDrawer({ station, onClose }: { station?: SelectedStation; onClose: () => void }) {
  const { language } = useSettings();

  return (
    <AnimatePresence>
      {station ? (
        <motion.aside
          key={station.key}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 z-[260] max-h-[72vh] overflow-y-auto rounded-t-[2rem] border border-white/10 bg-slate-950/95 p-5 pb-[calc(5rem+env(safe-area-inset-bottom))] text-slate-200 shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" />
          <div className="mb-3 flex items-start justify-between gap-4">
	            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">{isChineseLanguage(language) ? simplifyChineseText("支線路線", language) : "Minibus route"}</p>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-black text-white"
            >
	              {isChineseLanguage(language) ? simplifyChineseText("關閉", language) : "Close"}
            </button>
          </div>
          <BusRouteContent station={station} onClose={onClose} />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function MapMiniNavigator({
  viewport,
  zoom,
  grades,
  mapGradeXs,
  mapCanvasWidth,
  onPan,
  ariaLabel,
  spineColor
}: {
  viewport: Viewport;
  zoom: number;
  grades: Grade[];
  mapGradeXs: readonly number[];
  mapCanvasWidth: number;
  onPan: (x: number, y: number) => void;
  ariaLabel: string;
  spineColor: string;
}) {
  const { language } = useSettings();
  const miniWidth = 240;
  const miniHeight = 88;
  const scaleX = miniWidth / mapCanvasWidth;
  const scaleY = miniHeight / mapHeight;
  const visibleWidth = viewport.width / zoom;
  const visibleHeight = viewport.height / zoom;
  const spineStartX = mapGradeXs[0] ?? gradeXs[0];
  const spineEndX = getLastGradeX(mapGradeXs);
  const rectX = clamp(viewport.left / zoom, 0, mapCanvasWidth) * scaleX;
  const rectY = clamp(viewport.top / zoom, 0, mapHeight) * scaleY;
  const rectWidth = clamp(visibleWidth, 80, mapCanvasWidth) * scaleX;
  const rectHeight = clamp(visibleHeight, 80, mapHeight) * scaleY;

  function handleMiniMapClick(event: ReactMouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * mapCanvasWidth;
    const y = ((event.clientY - rect.top) / rect.height) * mapHeight;
    onPan(x, y);
  }

  return (
    <div className="pointer-events-auto hidden rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/15 sm:block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{isChineseLanguage(language) ? simplifyChineseText("縮圖", language) : "Mini map"}</span>
        <span className="text-[10px] font-black text-slate-900">{Math.round(zoom * 100)}%</span>
      </div>
      <svg
        width={miniWidth}
        height={miniHeight}
        viewBox={`0 0 ${miniWidth} ${miniHeight}`}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={handleMiniMapClick}
        className="cursor-crosshair rounded-xl bg-slate-50"
      >
        <rect width={miniWidth} height={miniHeight} rx="12" fill="#f8fafc" />
        <path
          d={`M ${spineStartX * scaleX} ${terminalY * scaleY} L ${spineEndX * scaleX} ${terminalY * scaleY}`}
          fill="none"
          stroke={spineColor}
          strokeLinecap="round"
          strokeWidth="3"
        />
        {grades.map((grade, index) => {
          const x = mapGradeXs[index] ?? spineEndX;
          return (
          <g key={grade.id}>
            <circle cx={x * scaleX} cy={terminalY * scaleY} r="4.5" fill="#020617" />
            <text x={x * scaleX} y={terminalY * scaleY - 8} textAnchor="middle" className="fill-slate-700 text-[6px] font-black">
              {grade.id}
            </text>
          </g>
          );
        })}
        <rect
          x={rectX}
          y={rectY}
          width={Math.min(rectWidth, miniWidth - rectX)}
          height={Math.min(rectHeight, miniHeight - rectY)}
          rx="4"
          fill="rgba(34,211,238,.16)"
          stroke="#0891b2"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function FullscreenIcon({ expanded }: { expanded: boolean }) {
  if (expanded) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6">
        <path d="M9 3v6H3" />
        <path d="M15 3v6h6" />
        <path d="M9 21v-6H3" />
        <path d="M15 21v-6h6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6">
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M16 21h5v-5" />
      <path d="M3 3l6 6" />
      <path d="M21 3l-6 6" />
      <path d="M3 21l6-6" />
      <path d="M21 21l-6-6" />
    </svg>
  );
}

export function SubwayNetworkMap({
  band,
  grades,
  eyebrow,
  title,
  description,
  spineLabel,
  ariaLabel,
  spineColor = "#22d3ee",
  embedded = false,
  denseGradeFilter,
  showBackLink = true
}: SubwayNetworkMapProps) {
  const { currentUser, language, text, t } = useSettings();
  const mapCanvasWidth = mapWidth + (band === "primary" ? primaryMapRightGutter : secondaryMapRightGutter);
  const mapGradeXs = useMemo(() => getMapGradeXs(grades.length), [grades.length]);
  const spineStartX = mapGradeXs[0] ?? gradeXs[0];
  const spineEndX = getLastGradeX(mapGradeXs);
  const isMainlandPepMap = isMainlandPepRoadmapProfile(currentUser?.curriculumProfile);
  const isMainlandHjbMap = isMainlandHjbRoadmapProfile(currentUser?.curriculumProfile);
  const useDenseGradeFilter = denseGradeFilter ?? isMainlandHjbMap;
  const mapDistrictLabels = isMainlandHjbMap ? mainlandHjbMapDistrictLabels : isMainlandPepMap ? mainlandPepMapDistrictLabels : hongKongMapDistrictLabels;
  // Roadmap terminals use grade codes in every language so labels fit on dense maps.
  const useGradeCodeLabel = true;
  const effectiveEyebrow = isMainlandPepMap
    ? band === "primary"
      ? { en: "Mainland PEP primary network", zh: "內地人教版小學網絡", zhHans: "内地人教版小学网络" }
      : { en: "Mainland PEP secondary network", zh: "內地人教版中學網絡", zhHans: "内地人教版中学网络" }
    : isMainlandHjbMap
    ? band === "primary"
      ? { en: "Mainland HJB primary network", zh: "內地滬教版小學網絡", zhHans: "内地沪教版小学网络" }
      : { en: "Mainland HJB secondary network", zh: "內地滬教版中學網絡", zhHans: "内地沪教版中学网络" }
    : eyebrow;
  const effectiveTitle = isMainlandPepMap
    ? band === "primary"
      ? { en: "PEP Primary Mathematics Subway Map", zh: "人教版小學數學路線圖", zhHans: "人教版小学数学路线图" }
      : { en: "PEP Secondary Mathematics Subway Map", zh: "人教版中學數學路線圖", zhHans: "人教版中学数学路线图" }
    : isMainlandHjbMap
    ? band === "primary"
      ? { en: "HJB Primary Mathematics Roadmap", zh: "滬教版小學數學路線圖", zhHans: "沪教版小学数学路线图" }
      : { en: "HJB Secondary Mathematics Roadmap", zh: "滬教版中學數學路線圖", zhHans: "沪教版中学数学路线图" }
    : title;
  const effectiveDescription = isMainlandPepMap
    ? band === "primary"
      ? {
          en: "P1-P6 Mainland PEP textbook-unit routes connect core concepts, station-level subskills, Lesson entries, and Practice Arena topics.",
          zh: "小一至小六內地人教版教材單元會連成專屬路線，串起核心概念、站點子技能、課節入口與練習場題組。",
          zhHans: "P1-P6内地人教版教材单元会连成专属路线，串起核心概念、站点子技能、课节入口与练习场题组。"
        }
      : {
          en: "S1-S6 Mainland PEP textbook-unit routes cover junior and senior secondary concepts, station-level subskills, Lesson entries, and Practice Arena topics.",
          zh: "中一至中六內地人教版教材單元會連成專屬路線，覆蓋初中與高中核心概念、站點子技能、課節入口與練習場題組。",
          zhHans: "S1-S6内地人教版教材单元会连成专属路线，覆盖初中与高中核心概念、站点子技能、课节入口与练习场题组。"
        }
    : isMainlandHjbMap
    ? band === "primary"
      ? {
          en: "P1-P6 Shanghai Education Press textbook-unit routes connect core concepts, station-level subskills, Lesson entries, and approved practice checkpoints.",
          zh: "小一至小六滬教版教材單元會連成專屬路線，串起核心概念、站點子技能、課節入口與已審核練習檢查。",
          zhHans: "P1-P6沪教版教材单元会连成专属路线，串起核心概念、站点子技能、课节入口与已审核练习检查。"
        }
      : {
          en: "S1-S6 Shanghai Education Press routes cover junior lesson-first units and senior approved practice-backed units by grade.",
          zh: "中一至中六滬教版路線按年級呈現：初中先以課節學習為主，高中連接已審核練習單元。",
          zhHans: "S1-S6沪教版路线按年级呈现：初中先以课节学习为主，高中连接已审核练习单元。"
        }
    : description;
  const effectiveSpineLabel = isMainlandPepMap
    ? band === "primary"
      ? { en: "PEP primary spine", zh: "人教版小學主線", zhHans: "人教版小学主线" }
      : { en: "PEP secondary spine", zh: "人教版中學主線", zhHans: "人教版中学主线" }
    : isMainlandHjbMap
    ? band === "primary"
      ? { en: "HJB primary spine", zh: "滬教版小學主線", zhHans: "沪教版小学主线" }
      : { en: "HJB secondary spine", zh: "滬教版中學主線", zhHans: "沪教版中学主线" }
    : spineLabel;
  const effectiveAriaLabel = isMainlandPepMap
    ? band === "primary"
      ? { en: "Mainland PEP primary mathematics Subway map showing P1 to P6 textbook-unit routes", zh: "顯示小一至小六人教版教材單元路線的小學數學地圖", zhHans: "显示P1至P6人教版教材单元路线的小学数学地图" }
      : { en: "Mainland PEP secondary mathematics Subway map showing S1 to S6 textbook-unit routes", zh: "顯示中一至中六人教版教材單元路線的中學數學地圖", zhHans: "显示S1至S6人教版教材单元路线的中学数学地图" }
    : isMainlandHjbMap
    ? band === "primary"
      ? { en: "Mainland HJB primary mathematics roadmap showing P1 to P6 textbook-unit routes", zh: "顯示小一至小六滬教版教材單元路線的小學數學地圖", zhHans: "显示P1至P6沪教版教材单元路线的小学数学地图" }
      : { en: "Mainland HJB secondary mathematics roadmap showing S1 to S6 textbook-unit routes", zh: "顯示中一至中六滬教版教材單元路線的中學數學地圖", zhHans: "显示S1至S6沪教版教材单元路线的中学数学地图" }
    : ariaLabel;
  const mapScrollerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const dragPanRef = useRef<DragPanState | null>(null);
  const suppressMapClickRef = useRef(false);
  const suppressMapClickTimerRef = useRef<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<SelectedStation | undefined>();
  const [roadmapTopics, setRoadmapTopics] = useState<Topic[]>(() => fallbackTopics.filter((topic) => topic.curriculumTrack === "HK"));
  const [zoom, setZoom] = useState(0.24);
  const [viewport, setViewport] = useState<Viewport>({ left: 0, top: 0, width: 900, height: 560 });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const gridPatternId = `${band}-map-grid`;
  const firstGradeLabel = formatRoadmapGradeLabel(grades[0]?.id ?? "S1", language, useGradeCodeLabel);
  const [activeDenseGradeId, setActiveDenseGradeId] = useState(grades[0]?.id ?? "P1");
  const miniMapAriaLabel = t({
    en: `Pan the ${band} map`,
    zh: band === "primary" ? "移動小學地圖" : "移動中學地圖"
  });

  const updateViewport = useCallback(() => {
    const scroller = mapScrollerRef.current;
    if (!scroller) return;
    setViewport({
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
      width: scroller.clientWidth,
      height: scroller.clientHeight
    });
  }, []);

  const clearSuppressMapClickTimer = useCallback(() => {
    if (suppressMapClickTimerRef.current === null) return;
    window.clearTimeout(suppressMapClickTimerRef.current);
    suppressMapClickTimerRef.current = null;
  }, []);

  const suppressNextMapClick = useCallback(() => {
    suppressMapClickRef.current = true;
    clearSuppressMapClickTimer();
    suppressMapClickTimerRef.current = window.setTimeout(() => {
      suppressMapClickRef.current = false;
      suppressMapClickTimerRef.current = null;
    }, 120);
  }, [clearSuppressMapClickTimer]);

  const finishMapDrag = useCallback((updateDraggingState = true) => {
    const dragState = dragPanRef.current;
    if (dragState) document.body.style.userSelect = dragState.previousUserSelect;
    dragPanRef.current = null;
    if (updateDraggingState) setIsDraggingMap(false);
  }, []);

  const handleMapPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMapExpanded || event.pointerType !== "mouse" || event.button !== 0) return;
    const scroller = mapScrollerRef.current;
    if (!scroller) return;

    suppressMapClickRef.current = false;
    clearSuppressMapClickTimer();
    dragPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
      hasMoved: false,
      previousUserSelect: document.body.style.userSelect
    };
    document.body.style.userSelect = "none";
  }, [clearSuppressMapClickTimer, isMapExpanded]);

  const handleMapPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragPanRef.current;
    const scroller = mapScrollerRef.current;
    if (!dragState || !scroller || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.hasMoved && Math.hypot(deltaX, deltaY) < dragPanThreshold) return;

    if (!dragState.hasMoved) {
      dragState.hasMoved = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setIsDraggingMap(true);
      suppressNextMapClick();
    }

    event.preventDefault();
    scroller.scrollLeft = dragState.scrollLeft - deltaX;
    scroller.scrollTop = dragState.scrollTop - deltaY;
  }, [suppressNextMapClick]);

  const handleMapPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragPanRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragState.hasMoved) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextMapClick();
    }
    finishMapDrag();
  }, [finishMapDrag, suppressNextMapClick]);

  const handleMapClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressMapClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressMapClickRef.current = false;
    clearSuppressMapClickTimer();
  }, [clearSuppressMapClickTimer]);

  const scrollToMapPoint = useCallback((x: number, y: number, targetZoom = zoom, behavior: ScrollBehavior = "smooth") => {
    const scroller = mapScrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: Math.max(0, x * targetZoom - scroller.clientWidth / 2),
      top: Math.max(0, y * targetZoom - scroller.clientHeight * 0.42),
      behavior
    });
    window.setTimeout(updateViewport, behavior === "auto" ? 20 : 260);
  }, [updateViewport, zoom]);

  const fitMap = useCallback((behavior: ScrollBehavior = "smooth") => {
    const scroller = mapScrollerRef.current;
    if (!scroller) return;
    const targetZoom = clamp(Math.min((scroller.clientWidth - 28) / mapCanvasWidth, (scroller.clientHeight - 28) / mapHeight), minZoom, 0.34);
    setZoom(targetZoom);
    window.setTimeout(() => {
      scroller.scrollTo({ left: 0, top: 0, behavior });
      updateViewport();
    }, 20);
  }, [mapCanvasWidth, updateViewport]);

  const changeZoom = useCallback((delta: number) => {
    const scroller = mapScrollerRef.current;
    if (!scroller) return;
    const centerX = (scroller.scrollLeft + scroller.clientWidth / 2) / zoom;
    const centerY = (scroller.scrollTop + scroller.clientHeight / 2) / zoom;
    const nextZoom = clamp(zoom + delta, minZoom, maxZoom);
    setZoom(nextZoom);
    window.setTimeout(() => scrollToMapPoint(centerX, centerY, nextZoom), 20);
  }, [scrollToMapPoint, zoom]);

  const jumpToGrade = useCallback((gradeIndex: number) => {
    const gradeId = grades[gradeIndex]?.id;
    if (gradeId && useDenseGradeFilter) setActiveDenseGradeId(gradeId);
    const nextZoom = typeof window !== "undefined" && window.innerWidth < 768 ? mobileDetailZoom : desktopDetailZoom;
    setZoom(nextZoom);
    window.setTimeout(() => scrollToMapPoint(mapGradeXs[gradeIndex] ?? spineEndX, terminalY + 430, nextZoom), 20);
  }, [grades, mapGradeXs, scrollToMapPoint, spineEndX, useDenseGradeFilter]);

  const handleSelectStation = useCallback((station: SelectedStation) => {
    const shouldSelectStation = selectedStation?.key !== station.key;
    setSelectedStation(shouldSelectStation ? station : undefined);
    if (shouldSelectStation && typeof window !== "undefined" && window.innerWidth < 768) {
      const nextZoom = Math.max(zoom, mobileDetailZoom);
      setZoom(nextZoom);
      window.setTimeout(() => scrollToMapPoint(station.point.x, station.point.y, nextZoom), 20);
    }
  }, [scrollToMapPoint, selectedStation?.key, zoom]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoadmap() {
      try {
        const response = await fetch("/api/roadmap", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { roadmap?: RoadmapData };
        if (!cancelled && body.roadmap) setRoadmapTopics(body.roadmap.topics);
      } catch {
        if (!cancelled) setRoadmapTopics(fallbackTopics.filter((topic) => topic.curriculumTrack === (currentUser?.curriculumTrack ?? "HK")));
      }
    }

    void loadRoadmap();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.curriculumProfile?.publisher, currentUser?.curriculumTrack]);

  useEffect(() => {
    if (!grades.some((grade) => grade.id === activeDenseGradeId)) {
      setActiveDenseGradeId(grades[0]?.id ?? "P1");
    }
  }, [activeDenseGradeId, grades]);

  useEffect(() => {
    const timer = window.setTimeout(() => fitMap("auto"), 80);
    window.addEventListener("resize", updateViewport);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateViewport);
    };
  }, [fitMap, updateViewport]);

  useEffect(() => {
    if (!isMapExpanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => fitMap("auto"), 80);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMapExpanded(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [fitMap, isMapExpanded]);

  useEffect(() => {
    updateViewport();
  }, [updateViewport, zoom]);

  useEffect(() => {
    if (!isMapExpanded) finishMapDrag();
  }, [finishMapDrag, isMapExpanded]);

  useEffect(() => {
    return () => {
      clearSuppressMapClickTimer();
      finishMapDrag(false);
    };
  }, [clearSuppressMapClickTimer, finishMapDrag]);

  const displayedRoadmapTopics = useMemo(
    () => useDenseGradeFilter ? roadmapTopics.filter((topic) => topic.grade === activeDenseGradeId) : roadmapTopics,
    [activeDenseGradeId, roadmapTopics, useDenseGradeFilter]
  );
  const routeEntries = useMemo(() => grades.flatMap((grade, gradeIndex) =>
    displayedRoadmapTopics
      .filter((topic) => topic.grade === grade.id)
      .map((topic, topicIndex) => ({ topic, gradeIndex, topicIndex }))
  ), [displayedRoadmapTopics, grades]);
  const mapCenterX = zoom > 0 ? (viewport.left + viewport.width / 2) / zoom : spineStartX;
  const focusedGradeIndex = grades.reduce((closestIndex, _grade, gradeIndex) => {
    const closestDistance = Math.abs((mapGradeXs[closestIndex] ?? spineStartX) - mapCenterX);
    const candidateDistance = Math.abs((mapGradeXs[gradeIndex] ?? spineEndX) - mapCenterX);
    return candidateDistance < closestDistance ? gradeIndex : closestIndex;
  }, 0);
  const detailLabelGradeRadius = zoom >= 0.9 ? 1 : 0;
  const selectedTopicId = selectedStation?.topic.id;
  const canShowRouteLabels = zoom >= 0.32 && zoom < 0.52;
  const canShowStationLabels = zoom >= 0.52;
  const stationLabelStride = zoom >= 0.86 ? 1 : 2;
  const mapMode = zoom < 0.42 ? "Overview" : "Detail";
  const mapModeLabel = mapMode === "Overview" ? t({ en: "Overview", zh: "總覽", zhHans: "总览" }) : t({ en: "Detail", zh: "細節", zhHans: "细节" });
  const showFullscreenControl = band === "primary" || band === "secondary";
  const mapShellClassName = isMapExpanded
    ? "fixed inset-0 z-[220] flex min-h-0 flex-col bg-slate-950 p-3 sm:p-5"
    : "min-w-0";
  const mapFrameClassName = isMapExpanded
    ? "relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white shadow-2xl shadow-cyan-950/30"
    : "relative overflow-hidden rounded-[2rem] border border-white/10 bg-white";
  const mapScrollerStyle: CSSProperties = isMapExpanded
    ? { height: "100%" }
    : {
        height: mapMode === "Overview" ? Math.max(340, mapHeight * zoom + 28) : "62vh",
        minHeight: mapMode === "Overview" ? 340 : 460,
        maxHeight: 720
      };
  const mapScrollerClassName = cn(
    "overflow-auto p-3",
    isMapExpanded && "cursor-grab",
    isDraggingMap && "cursor-grabbing select-none"
  );
  const mapScrollerInteractionStyle: CSSProperties = isMapExpanded
    ? {
        cursor: isDraggingMap ? "grabbing" : "grab",
        userSelect: isDraggingMap ? "none" : undefined
      }
    : {};
  const TitleTag = embedded ? "h2" : "h1";

  return (
    <div className={embedded ? "py-0" : "page-container py-10 sm:py-12"}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
            {t(effectiveEyebrow)}
          </p>
          <TitleTag className={cn("mt-3 font-black tracking-tight text-slate-950 dark:text-white", embedded ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl")}>
            {t(effectiveTitle)}
          </TitleTag>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t(effectiveDescription)}
          </p>
        </div>

        {showBackLink ? (
        <Link
          href={studentRoadmapPath}
          className="focus-ring inline-flex w-fit rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-800 shadow-lg transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
        >
          {t({ en: "Back to Learning Path", zh: "返回學習路徑", zhHans: "返回学习路径" })}
        </Link>
        ) : null}
      </div>

      <section className="mt-8 rounded-[2rem] border border-cyan-300/25 bg-slate-950/80 p-4 shadow-xl shadow-cyan-950/20 backdrop-blur-2xl sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">{t({ en: "Network legend", zh: "網絡圖例", zhHans: "网络图例" })}</p>
            <h2 className="mt-2 text-2xl font-black text-white">{t({ en: "Complete Subway map with station-linked minibuses", zh: "完整路線圖與站點支線", zhHans: "完整路线图与站点支线" })}</h2>
          </div>
          <div className="grid gap-3 text-sm font-bold text-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
              <span className="h-3 w-12 rounded-full" style={{ backgroundColor: spineColor }} />
              {t(effectiveSpineLabel)}
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
              <span className="h-3 w-12 rounded-full bg-[#e31b23]" />
              {t({ en: "Subway concept route", zh: "概念路線", zhHans: "概念路线" })}
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
              <span className="h-8 w-8 rounded-xl bg-white text-center text-sm font-black leading-8 text-slate-950">{firstGradeLabel}</span>
              {t({ en: "Grade interchange", zh: "年級轉乘站", zhHans: "年级转乘站" })}
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6c84c] text-xs font-black text-slate-950">{isChineseLanguage(language) ? "支" : "B"}</span>
              {t({ en: "Click for minibus route", zh: "點擊查看支線", zhHans: "点击查看支线" })}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <FullscreenPortal enabled={isMapExpanded}>
          <div ref={mapShellRef} className={mapShellClassName}>
            <div className="mb-3 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fitMap()}
                  className="focus-ring rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 transition hover:-translate-y-0.5"
                >
	                  {t({ en: "Fit Map", zh: "顯示全圖", zhHans: "显示全图" })}
                </button>
                <button
                  type="button"
                  onClick={() => changeZoom(-0.12)}
                  className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-lg font-black text-white"
	                  aria-label={t({ en: "Zoom out", zh: "縮小", zhHans: "缩小" })}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => changeZoom(0.12)}
                  className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-lg font-black text-white"
	                  aria-label={t({ en: "Zoom in", zh: "放大", zhHans: "放大" })}
                >
                  +
                </button>
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
		                  {mapModeLabel} · {Math.round(zoom * 100)}%
                </span>
                {useDenseGradeFilter ? (
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100">
                    {t({ en: "Showing", zh: "正在顯示", zhHans: "正在显示" })} {formatRoadmapGradeLabel(activeDenseGradeId, language, useGradeCodeLabel)}
                  </span>
                ) : null}
                {showFullscreenControl ? (
                  <button
                    type="button"
                    aria-pressed={isMapExpanded}
                    aria-label={isMapExpanded ? t({ en: "Exit full-screen roadmap", zh: "離開全螢幕路線圖", zhHans: "离开全屏路线图" }) : t({ en: "Open full-screen roadmap", zh: "開啟全螢幕路線圖", zhHans: "开启全屏路线图" })}
                    onClick={() => setIsMapExpanded((current) => !current)}
                    className="focus-ring inline-flex h-11 items-center gap-3 whitespace-nowrap rounded-xl border border-white/15 bg-slate-900/65 px-4 text-sm font-black text-white shadow-inner shadow-white/5 transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
                  >
                    <span>{isMapExpanded ? t({ en: "Exit full screen", zh: "離開全螢幕", zhHans: "离开全屏" }) : t({ en: "Full screen", zh: "全螢幕", zhHans: "全屏" })}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-slate-950/45 text-white">
                      <FullscreenIcon expanded={isMapExpanded} />
                    </span>
                  </button>
                ) : null}
              </div>

              <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1 lg:shrink-0 lg:overflow-visible lg:pb-0">
                {grades.map((grade, gradeIndex) => (
                  <button
                    type="button"
                    key={grade.id}
                    onClick={() => jumpToGrade(gradeIndex)}
                    aria-pressed={useDenseGradeFilter ? activeDenseGradeId === grade.id : undefined}
                    className={cn(
                      "focus-ring grid h-9 min-w-10 shrink-0 place-items-center rounded-full border px-3 text-xs font-black transition hover:-translate-y-0.5",
                      useDenseGradeFilter && activeDenseGradeId === grade.id
                        ? "border-cyan-200 bg-cyan-300 text-slate-950 shadow-glow"
                        : "border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]"
                    )}
                  >
	                    {formatRoadmapGradeLabel(grade.id, language, useGradeCodeLabel)}
                  </button>
                ))}
              </div>
            </div>

            <div className={mapFrameClassName}>
              <div
                ref={mapScrollerRef}
                data-map-scroller
                onScroll={updateViewport}
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={handleMapPointerEnd}
                onPointerCancel={handleMapPointerEnd}
                onLostPointerCapture={handleMapPointerEnd}
                onClickCapture={handleMapClickCapture}
                className={mapScrollerClassName}
                style={{ ...mapScrollerStyle, ...mapScrollerInteractionStyle }}
              >
                <div
                  className="relative"
	                  style={{
	                    width: mapCanvasWidth * zoom,
	                    height: mapHeight * zoom
	                  }}
	                >
          <svg
            width={mapCanvasWidth}
            height={mapHeight}
            viewBox={`0 0 ${mapCanvasWidth} ${mapHeight}`}
            role="img"
		            aria-label={t(effectiveAriaLabel)}
            className="max-w-none rounded-[1.5rem]"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left"
            }}
	          >
	            <defs>
	              <pattern id={gridPatternId} width="80" height="80" patternUnits="userSpaceOnUse">
	                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#d9e2ea" strokeWidth="1" />
	              </pattern>
              <filter id="route-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.18" />
              </filter>
            </defs>

	            <rect width={mapCanvasWidth} height={mapHeight} rx="36" fill="#f8fbfd" />
	            <rect width={mapCanvasWidth} height={mapHeight} rx="36" fill={`url(#${gridPatternId})`} opacity="0.7" />
            <path d={`M0 430 C520 350 760 485 1220 420 C1690 352 2040 290 2500 390 C2940 486 3220 320 ${mapCanvasWidth} 386 L${mapCanvasWidth} 1480 L0 1480 Z`} fill="#d7f1f5" opacity="0.9" />
            <path d="M1970 40 C2260 140 2320 280 2260 510 C2180 812 2380 954 2720 1070 C3010 1168 3210 1280 3360 1430" fill="none" stroke="#c7d2da" strokeLinecap="round" strokeWidth="22" opacity="0.9" />

	            {mapDistrictLabels.map((district) => (
	              <text key={`${district.x}-${district.y}-${district.label.en}`} x={district.x} y={district.y} className="fill-slate-300 text-[58px] font-black">
	                {t(district.label)}
	              </text>
	            ))}

            <g filter="url(#route-shadow)">
	              <path
		                d={`M ${spineStartX} ${terminalY} L ${spineEndX} ${terminalY}`}
	                fill="none"
	                stroke={spineColor}
                strokeLinecap="round"
                strokeWidth="24"
              />
              <path
                d={`M ${spineStartX} ${terminalY} L ${spineEndX} ${terminalY}`}
                fill="none"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="5"
                opacity="0.75"
              />

              {routeEntries.map(({ topic, gradeIndex, topicIndex }) => (
                <TopicRoute
                  key={`${topic.id}-line`}
	                  topic={topic}
	                  gradeIndex={gradeIndex}
	                  gradeX={mapGradeXs[gradeIndex] ?? spineEndX}
                  topicIndex={topicIndex}
                  band={band}
                  layer="line"
                  selectedStationKey={selectedStation?.key}
                  showRouteLabel={false}
                  showStationLabels={false}
                  stationLabelStride={1}
                  useGradeCodeLabel={useGradeCodeLabel}
                  onSelectStation={handleSelectStation}
                />
              ))}
              {routeEntries.map(({ topic, gradeIndex, topicIndex }) => (
                <TopicRoute
                  key={`${topic.id}-stations`}
	                  topic={topic}
	                  gradeIndex={gradeIndex}
	                  gradeX={mapGradeXs[gradeIndex] ?? spineEndX}
                  topicIndex={topicIndex}
                  band={band}
                  layer="stations"
                  selectedStationKey={selectedStation?.key}
                  showRouteLabel={false}
                  showStationLabels={false}
                  stationLabelStride={1}
                  useGradeCodeLabel={useGradeCodeLabel}
                  onSelectStation={handleSelectStation}
                />
              ))}
              {routeEntries.map(({ topic, gradeIndex, topicIndex }) => {
                const gradeInLabelFocus = Math.abs(gradeIndex - focusedGradeIndex) <= detailLabelGradeRadius;
                const selectedTopic = selectedTopicId === topic.id;
                const showStationLabelsForTopic = canShowStationLabels && (gradeInLabelFocus || selectedTopic);

                return (
                  <TopicRoute
                    key={`${topic.id}-labels`}
                    topic={topic}
                    gradeIndex={gradeIndex}
                    gradeX={mapGradeXs[gradeIndex] ?? spineEndX}
                    topicIndex={topicIndex}
                    band={band}
                    layer="labels"
                    selectedStationKey={selectedStation?.key}
                    showRouteLabel={canShowRouteLabels}
                    showStationLabels={showStationLabelsForTopic}
                    stationLabelStride={stationLabelStride}
                    useGradeCodeLabel={useGradeCodeLabel}
                    onSelectStation={handleSelectStation}
                  />
                );
              })}
            </g>

            {grades.map((grade, gradeIndex) => {
              const x = mapGradeXs[gradeIndex] ?? spineEndX;
              return (
                <g key={grade.id}>
                  <rect x={x - 48} y={terminalY - 48} width="96" height="96" rx="26" className="fill-slate-950 stroke-white" strokeWidth="8" />
                  <text x={x} y={terminalY + 12} textAnchor="middle" className="fill-white text-[42px] font-black">
	                    {formatRoadmapGradeLabel(grade.id, language, useGradeCodeLabel)}
                  </text>
                  <text x={x} y={terminalY - 70} textAnchor="middle" className="fill-slate-950 text-[28px] font-black">
                    {useGradeCodeLabel ? grade.id : getGradeDisplayName(text(grade.name), grade.id)}
                  </text>
                </g>
              );
            })}

            <g>
              <rect x={routeIndexPanelX} y="1204" width={routeIndexPanelWidth} height="266" rx="24" className="fill-white/95 stroke-slate-300" />
	              <text x="90" y="1254" className="fill-slate-950 text-[28px] font-black">{isChineseLanguage(language) ? simplifyChineseText("路線索引", language) : "Route Index"}</text>
              {grades.slice(0, 3).map((grade, gradeIndex) => (
                <g key={grade.id}>
                  <rect x={routeIndexEntryStartX + gradeIndex * routeIndexColumnSpacing} y="1286" width={routeIndexSwatchSize} height={routeIndexSwatchSize} rx="12" className="fill-slate-950" />
	                  <text x={routeIndexEntryStartX + routeIndexSwatchSize / 2 + gradeIndex * routeIndexColumnSpacing} y="1317" textAnchor="middle" className="fill-white text-[22px] font-black">{formatRoadmapGradeLabel(grade.id, language, useGradeCodeLabel)}</text>
                  <text x={routeIndexEntryStartX + gradeIndex * routeIndexColumnSpacing} y="1360" className="fill-slate-700 text-[17px] font-bold">
	                    {roadmapTopics.filter((topic) => topic.grade === grade.id).length} {isChineseLanguage(language) ? simplifyChineseText("路線", language) : "routes"}
                  </text>
                </g>
              ))}
              {grades.slice(3).map((grade, offset) => (
                <g key={grade.id}>
                  <rect x={routeIndexEntryStartX + offset * routeIndexColumnSpacing} y="1374" width={routeIndexSwatchSize} height={routeIndexSwatchSize} rx="12" className="fill-slate-950" />
	                  <text x={routeIndexEntryStartX + routeIndexSwatchSize / 2 + offset * routeIndexColumnSpacing} y="1405" textAnchor="middle" className="fill-white text-[22px] font-black">{formatRoadmapGradeLabel(grade.id, language, useGradeCodeLabel)}</text>
                  <text x={routeIndexEntryStartX + offset * routeIndexColumnSpacing} y="1448" className="fill-slate-700 text-[17px] font-bold">
	                    {roadmapTopics.filter((topic) => topic.grade === grade.id).length} {isChineseLanguage(language) ? simplifyChineseText("路線", language) : "routes"}
                  </text>
                </g>
              ))}
            </g>
          </svg>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-4 right-4 z-20">
                <MapMiniNavigator
                  viewport={viewport}
                  zoom={zoom}
	                  grades={grades}
	                  mapGradeXs={mapGradeXs}
                  mapCanvasWidth={mapCanvasWidth}
                  onPan={(x, y) => scrollToMapPoint(x, y)}
                  ariaLabel={miniMapAriaLabel}
                  spineColor={spineColor}
                />
              </div>
              {isMapExpanded && selectedStation ? (
                <div className="pointer-events-auto absolute bottom-44 right-4 z-20 hidden w-[min(19rem,calc(100%-2rem))] xl:block">
                  <BusDetailPanel station={selectedStation} onClose={() => setSelectedStation(undefined)} layout="compact" />
                </div>
              ) : null}
            </div>
          </div>
          </FullscreenPortal>

          {!isMapExpanded ? (
            <div className="hidden xl:block">
              <BusDetailPanel station={selectedStation} onClose={() => setSelectedStation(undefined)} layout="wide" />
            </div>
          ) : null}
        </div>
      </section>
      <MobileBusDrawer station={selectedStation} onClose={() => setSelectedStation(undefined)} />
    </div>
  );
}
