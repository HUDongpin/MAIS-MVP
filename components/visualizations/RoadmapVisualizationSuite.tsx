"use client";

import { useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";
import { grades } from "@/data/grades";
import { topics } from "@/data/topics";
import {
  fallbackTransitDetails,
  getGradeDisplayName,
  routeColors,
  topicTransitDetails
} from "@/components/learning/LearningRoadmap";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDifficultyLabel, formatGradeLabel, formatGradeRange, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { GradeId, Topic } from "@/types";

type GradeFilter = "all" | GradeId;
type TopicLabHrefResolver = (topic: Topic) => string | null;

type RoadmapVisualizationSuiteProps = {
  getTopicLabHref?: TopicLabHrefResolver;
};

const roadmapVisualizationLabelsByTopicId: Record<string, string> = Object.fromEntries(
  topics.map((topic) => [topic.id, topic.title.en])
);
const visualizationLabels = roadmapVisualizationLabelsByTopicId;

const missingVisualizationTopicIds = topics
  .map((topic) => topic.id)
  .filter((topicId) => !visualizationLabels[topicId]);

if (process.env.NODE_ENV !== "production" && missingVisualizationTopicIds.length > 0) {
  console.warn(`Missing roadmap visualization labels: ${missingVisualizationTopicIds.join(", ")}`);
}

function getRouteColor(topic: Topic) {
  const gradeIndex = grades.findIndex((grade) => grade.id === topic.grade);
  const topicIndex = topics.filter((candidate) => candidate.grade === topic.grade).findIndex((candidate) => candidate.id === topic.id);
  return routeColors[(gradeIndex * 3 + Math.max(topicIndex, 0)) % routeColors.length];
}

function getDetails(topicId: string) {
  return topicTransitDetails[topicId] ?? fallbackTransitDetails;
}

function VisualShell({
  topicId,
  color,
  large,
  children
}: {
  topicId: string;
  color: string;
  large?: boolean;
  children: ReactNode;
}) {
  const { language } = useSettings();

  return (
    <svg
      role="img"
      aria-label={isChineseLanguage(language) ? simplifyChineseText("數學視覺化", language) : `${visualizationLabels[topicId] ?? "Math"} visualization`}
      viewBox="0 0 360 220"
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner",
        large ? "h-[300px] sm:h-[340px]" : "h-44"
      )}
    >
      {isChineseLanguage(language) ? <style>{`text{display:none}`}</style> : null}
      <rect width="360" height="220" fill="#020617" />
      {Array.from({ length: 8 }, (_, index) => (
        <line key={`v-${index}`} x1={28 + index * 44} x2={28 + index * 44} y1="20" y2="200" stroke="rgba(255,255,255,.07)" />
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <line key={`h-${index}`} x1="20" x2="340" y1={36 + index * 40} y2={36 + index * 40} stroke="rgba(255,255,255,.07)" />
      ))}
      <rect x="18" y="18" width="324" height="184" rx="18" fill="none" stroke="rgba(255,255,255,.1)" />
      <circle cx="318" cy="40" r="18" fill={color} opacity="0.2" />
      <circle cx="318" cy="40" r="7" fill={color} />
      {children}
    </svg>
  );
}

function TopicMiniVisualization({ topicId, color, large = false }: { topicId: string; color: string; large?: boolean }) {
  const textClass = "fill-white text-[12px] font-black";
  const softTextClass = "fill-slate-300 text-[10px] font-bold";

  switch (topicId) {
    case "p1-counting-number-bonds":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <g transform="translate(42 52)">
            {Array.from({ length: 20 }, (_, index) => (
              <circle
                key={index}
                cx={(index % 10) * 20}
                cy={Math.floor(index / 10) * 24}
                r="8"
                fill={index === 0 ? "#38bdf8" : index < 6 ? "#facc15" : "rgba(255,255,255,.12)"}
                stroke={index < 6 ? "white" : "rgba(255,255,255,.35)"}
                strokeWidth="2"
              />
            ))}
          </g>
          <line x1="154" x2="228" y1="126" y2="110" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="154" x2="228" y1="136" y2="158" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <circle cx="132" cy="130" r="23" fill="#ef4444" opacity="0.92" />
          <circle cx="250" cy="110" r="21" fill="#38bdf8" opacity="0.92" />
          <circle cx="250" cy="158" r="21" fill="#facc15" opacity="0.92" />
          <text x="126" y="137" className="fill-slate-950 text-[15px] font-black">6</text>
          <text x="247" y="116" className="fill-slate-950 text-[13px] font-black">1</text>
          <text x="247" y="164" className="fill-slate-950 text-[13px] font-black">5</text>
          <rect x="94" y="186" width="172" height="28" rx="10" fill="rgba(15,23,42,.92)" stroke="rgba(103,232,249,.45)" strokeWidth="2" />
          <text x="180" y="205" textAnchor="middle" className={textClass}>1 + 5 = 6</text>
        </VisualShell>
      );
    case "p1-addition-subtraction":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="52" x2="310" y1="128" y2="128" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
          {Array.from({ length: 11 }, (_, index) => (
            <g key={index}>
              <line x1={58 + index * 24} x2={58 + index * 24} y1="116" y2="140" stroke="white" opacity="0.7" strokeWidth="2" />
              <text x={58 + index * 24} y="160" textAnchor="middle" className={softTextClass}>{index}</text>
            </g>
          ))}
          <path d="M 106 104 C 122 72 148 72 164 104" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <path d="M 164 104 C 180 72 206 72 222 104" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <path d="M 222 104 l -14 -4 l 6 13 z" fill="#f472b6" />
          <text x="104" y="56" className={textClass}>3 + 2 = 5</text>
        </VisualShell>
      );
    case "p1-shapes-patterns":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const x = 58 + index * 44;
            const shape = index % 3;
            if (shape === 0) return <circle key={index} cx={x} cy="102" r="17" fill={color} stroke="white" strokeWidth="3" />;
            if (shape === 1) return <polygon key={index} points={`${x},78 ${x - 20},122 ${x + 20},122`} fill="#f472b6" stroke="white" strokeWidth="3" />;
            return <rect key={index} x={x - 18} y="84" width="36" height="36" rx="7" fill="#f6c84c" stroke="white" strokeWidth="3" />;
          })}
          <path d="M 58 154 H 278" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
          <text x="72" y="178" className={textClass}>circle, triangle, square...</text>
        </VisualShell>
      );
    case "p1-measurement-time":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="52" y="138" width="170" height="28" rx="8" fill="rgba(255,255,255,.08)" stroke={color} strokeWidth="4" />
          {Array.from({ length: 8 }, (_, index) => (
            <line key={index} x1={70 + index * 20} x2={70 + index * 20} y1="138" y2={index % 2 ? 154 : 166} stroke="white" opacity="0.75" strokeWidth="2" />
          ))}
          <rect x="76" y="92" width="58" height="36" rx="10" fill={color} opacity="0.82" />
          <rect x="150" y="72" width="92" height="56" rx="12" fill="#f472b6" opacity="0.78" />
          <circle cx="282" cy="96" r="42" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="4" />
          <line x1="282" x2="282" y1="96" y2="70" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="282" x2="304" y1="96" y2="96" stroke="#f6c84c" strokeWidth="5" strokeLinecap="round" />
          <text x="86" y="54" className={textClass}>longer, shorter, o'clock</text>
        </VisualShell>
      );
    case "p2-place-value":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 10 }, (_, index) => (
            <rect key={index} x={60 + (index % 5) * 16} y={58 + Math.floor(index / 5) * 16} width="14" height="14" fill={color} opacity="0.72" />
          ))}
          {[0, 1, 2, 3].map((index) => (
            <rect key={index} x={168} y={56 + index * 20} width="74" height="12" rx="4" fill="#f472b6" opacity="0.82" />
          ))}
          {[0, 1, 2].map((index) => (
            <circle key={index} cx={278 + index * 18} cy="82" r="8" fill="#f6c84c" stroke="white" strokeWidth="2" />
          ))}
          <text x="74" y="150" className={softTextClass}>hundreds</text>
          <text x="176" y="150" className={softTextClass}>tens</text>
          <text x="276" y="150" className={softTextClass}>ones</text>
          <text x="126" y="188" className={textClass}>243 = 200 + 40 + 3</text>
        </VisualShell>
      );
    case "p2-multiplication-foundations":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 12 }, (_, index) => (
            <circle
              key={index}
              cx={94 + (index % 4) * 42}
              cy={66 + Math.floor(index / 4) * 42}
              r="14"
              fill={index % 2 ? "#f472b6" : color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
          <path d="M 76 174 H 244" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
          <text x="80" y="196" className={textClass}>3 rows x 4 = 12</text>
          <rect x="258" y="76" width="46" height="72" rx="14" fill="rgba(255,255,255,.08)" stroke="#f6c84c" strokeWidth="4" />
          <text x="270" y="116" className={softTextClass}>+4</text>
        </VisualShell>
      );
    case "p2-money-time":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2].map((index) => (
            <circle key={index} cx={84 + index * 58} cy="88" r={index === 0 ? 26 : 22} fill={index === 0 ? color : index === 1 ? "#f472b6" : "#f6c84c"} stroke="white" strokeWidth="3" />
          ))}
          <text x="72" y="94" className="fill-slate-950 text-[12px] font-black">$10</text>
          <text x="134" y="94" className="fill-slate-950 text-[12px] font-black">$5</text>
          <text x="192" y="94" className="fill-slate-950 text-[12px] font-black">$2</text>
          <circle cx="280" cy="96" r="42" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="4" />
          <line x1="280" x2="280" y1="96" y2="68" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="280" x2="304" y1="96" y2="118" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <text x="94" y="172" className={textClass}>pay, change, half past</text>
        </VisualShell>
      );
    case "p2-length-data":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="54" y="152" width="186" height="28" rx="8" fill="rgba(255,255,255,.08)" stroke={color} strokeWidth="4" />
          {Array.from({ length: 9 }, (_, index) => (
            <line key={index} x1={72 + index * 20} x2={72 + index * 20} y1="152" y2={index % 2 ? 166 : 180} stroke="white" opacity="0.75" strokeWidth="2" />
          ))}
          {[48, 84, 116].map((barHeight, index) => (
            <rect key={index} x={258 + index * 28} y={160 - barHeight} width="18" height={barHeight} rx="6" fill={index === 1 ? "#f472b6" : color} />
          ))}
          <line x1="252" x2="332" y1="160" y2="160" stroke="white" strokeWidth="3" opacity="0.5" />
          <text x="78" y="64" className={textClass}>measure, then chart</text>
        </VisualShell>
      );
    case "p3-multiplication-division":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2, 3].map((group) => (
            <g key={group} transform={`translate(${58 + group * 68} 70)`}>
              <circle cx="24" cy="24" r="28" fill="rgba(255,255,255,.07)" stroke={group % 2 ? "#f472b6" : color} strokeWidth="4" />
              {[0, 1, 2].map((dot) => (
                <circle key={dot} cx={12 + dot * 12} cy="24" r="5" fill="white" />
              ))}
            </g>
          ))}
          <path d="M 82 154 H 286" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
          <text x="86" y="184" className={textClass}>12 shared into 4 groups</text>
        </VisualShell>
      );
    case "p3-fractions-intro":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="62" y={58 + row * 44} width="236" height="28" rx="9" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="2" />
              {Array.from({ length: row + 2 }, (_, part) => (
                <rect
                  key={part}
                  x={62 + (236 / (row + 2)) * part}
                  y={58 + row * 44}
                  width={236 / (row + 2)}
                  height="28"
                  fill={part === 0 ? color : part === 1 ? "#f472b6" : "transparent"}
                  opacity={part < 2 ? 0.75 : 1}
                />
              ))}
              {Array.from({ length: row + 1 }, (_, part) => (
                <line key={part} x1={62 + (236 / (row + 2)) * (part + 1)} x2={62 + (236 / (row + 2)) * (part + 1)} y1={58 + row * 44} y2={86 + row * 44} stroke="white" strokeWidth="2" />
              ))}
            </g>
          ))}
          <text x="92" y="190" className={textClass}>halves, thirds, quarters</text>
        </VisualShell>
      );
    case "p3-measurement":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 80 70 h 64 v 106 h -64 z" fill="rgba(255,255,255,.07)" stroke={color} strokeWidth="4" />
          <path d="M 80 126 h 64 v 50 h -64 z" fill={color} opacity="0.38" />
          <path d="M 208 74 h 78 l -12 102 h -54 z" fill="rgba(244,114,182,.15)" stroke="#f472b6" strokeWidth="4" />
          <path d="M 218 132 h 56 l -5 44 h -46 z" fill="#f472b6" opacity="0.34" />
          {[92, 112, 132].map((y) => <line key={y} x1="150" x2="174" y1={y} y2={y} stroke="white" strokeWidth="3" opacity="0.6" />)}
          <text x="82" y="52" className={textClass}>choose sensible units</text>
          <text x="92" y="198" className={softTextClass}>cm, g, ml, kg</text>
        </VisualShell>
      );
    case "p3-geometry-patterns":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="180" x2="180" y1="42" y2="176" stroke="white" strokeWidth="3" strokeDasharray="6 7" opacity="0.7" />
          <polygon points="114,72 154,112 114,152" fill={color} opacity="0.72" stroke="white" strokeWidth="3" />
          <polygon points="246,72 206,112 246,152" fill={color} opacity="0.72" stroke="white" strokeWidth="3" />
          <path d="M 76 180 h 36 v -22 h 36 v -22 h 36" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 252 154 h 34 v 34 h -34 z" fill="none" stroke="#f6c84c" strokeWidth="4" />
          <text x="88" y="52" className={textClass}>symmetry + right angle</text>
        </VisualShell>
      );
    case "p4-large-numbers":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {["Th", "H", "T", "O"].map((label, index) => (
            <g key={label}>
              <rect x={54 + index * 62} y="64" width="52" height="76" rx="12" fill="rgba(255,255,255,.07)" stroke={index === 0 ? color : "rgba(255,255,255,.28)"} strokeWidth="3" />
              <text x={80 + index * 62} y="90" textAnchor="middle" className={softTextClass}>{label}</text>
              <text x={80 + index * 62} y="122" textAnchor="middle" className={textClass}>{[3, 6, 2, 8][index]}</text>
            </g>
          ))}
          <path d="M 80 166 C 126 196 224 196 276 164" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <path d="M 276 164 l -17 0 l 9 -13 z" fill="#f472b6" />
          <text x="78" y="48" className={textClass}>read, compare, round</text>
        </VisualShell>
      );
    case "p4-decimals":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="58" x2="302" y1="126" y2="126" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
          {Array.from({ length: 11 }, (_, index) => (
            <line key={index} x1={58 + index * 24.4} x2={58 + index * 24.4} y1={index % 5 === 0 ? 108 : 116} y2="140" stroke="white" strokeWidth={index % 5 === 0 ? 3 : 2} opacity="0.65" />
          ))}
          <text x="55" y="162" className={softTextClass}>0</text>
          <text x="170" y="162" className={softTextClass}>0.5</text>
          <text x="298" y="162" className={softTextClass}>1</text>
          <circle cx="148" cy="126" r="11" fill={color} stroke="white" strokeWidth="3" />
          <path d="M 148 104 V 70" stroke="#f472b6" strokeWidth="4" strokeDasharray="6 6" />
          <text x="122" y="60" className={textClass}>0.37</text>
        </VisualShell>
      );
    case "p4-angles":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[
            { x: 88, y: 144, endX: 138, endY: 104, label: "acute", arc: "M 110 144 A 22 22 0 0 1 122 126", stroke: color },
            { x: 180, y: 144, endX: 180, endY: 84, label: "right", arc: "M 180 124 h 20 v 20", stroke: "#f6c84c" },
            { x: 258, y: 144, endX: 210, endY: 98, label: "obtuse", arc: "M 238 144 A 38 38 0 0 0 230 118", stroke: "#f472b6" }
          ].map((angle) => (
            <g key={angle.label}>
              <line x1={angle.x} x2={angle.x + 54} y1={angle.y} y2={angle.y} stroke="white" strokeWidth="4" strokeLinecap="round" />
              <line x1={angle.x} x2={angle.endX} y1={angle.y} y2={angle.endY} stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path d={angle.arc} fill="none" stroke={angle.stroke} strokeWidth="5" />
              <text x={angle.x - 10} y="178" className={softTextClass}>{angle.label}</text>
            </g>
          ))}
          <text x="94" y="54" className={textClass}>estimate and classify</text>
        </VisualShell>
      );
    case "p4-perimeter-area":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 24 }, (_, index) => {
            const col = index % 6;
            const row = Math.floor(index / 6);
            return (
              <rect
                key={index}
                x={78 + col * 30}
                y={56 + row * 30}
                width="30"
                height="30"
                fill={index % 2 ? "rgba(34,211,238,.16)" : "rgba(244,114,182,.16)"}
                stroke="rgba(255,255,255,.24)"
              />
            );
          })}
          <rect x="78" y="56" width="180" height="120" fill="none" stroke={color} strokeWidth="6" />
          <path d="M 258 88 h 42 v 88 h -42" fill="none" stroke="#f6c84c" strokeWidth="5" strokeLinejoin="round" />
          <text x="86" y="42" className={textClass}>area counts squares</text>
          <text x="96" y="198" className={softTextClass}>perimeter follows the edge</text>
        </VisualShell>
      );
    case "p5-fractions-operations":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="62" y="60" width="236" height="30" rx="10" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="2" />
          <rect x="62" y="60" width="118" height="30" rx="10" fill={color} opacity="0.75" />
          <rect x="62" y="118" width="236" height="30" rx="10" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="2" />
          <rect x="62" y="118" width="177" height="30" rx="10" fill="#f472b6" opacity="0.7" />
          {[121, 180, 239].map((x) => (
            <line key={x} x1={x} x2={x} y1="118" y2="148" stroke="white" strokeWidth="2" />
          ))}
          <text x="96" y="106" className={textClass}>1/2 + 3/4</text>
          <path d="M 144 166 h 72" stroke="#f6c84c" strokeWidth="5" strokeLinecap="round" />
          <text x="94" y="194" className={softTextClass}>find a common partition</text>
        </VisualShell>
      );
    case "p5-volume":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 12 }, (_, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = 82 + col * 36 + row * 14;
            const y = 126 - row * 30;
            return (
              <g key={index}>
                <polygon points={`${x},${y} ${x + 20},${y - 10} ${x + 40},${y} ${x + 20},${y + 10}`} fill={color} opacity="0.58" stroke="white" strokeWidth="2" />
                <polygon points={`${x},${y} ${x + 20},${y + 10} ${x + 20},${y + 34} ${x},${y + 24}`} fill="#f472b6" opacity="0.34" stroke="white" strokeWidth="2" />
                <polygon points={`${x + 20},${y + 10} ${x + 40},${y} ${x + 40},${y + 24} ${x + 20},${y + 34}`} fill="#f6c84c" opacity="0.34" stroke="white" strokeWidth="2" />
              </g>
            );
          })}
          <text x="86" y="54" className={textClass}>layers of unit cubes</text>
          <text x="112" y="194" className={softTextClass}>length x width x height</text>
        </VisualShell>
      );
    case "p5-rates":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="74" y={64 + row * 44} width={72 + row * 38} height="24" rx="8" fill={row === 1 ? "#f472b6" : color} opacity="0.78" />
              <text x="52" y={82 + row * 44} textAnchor="middle" className={softTextClass}>{row + 1} kg</text>
              <text x={154 + row * 38} y={82 + row * 44} className={softTextClass}>${[18, 36, 54][row]}</text>
            </g>
          ))}
          <line x1="74" x2="292" y1="184" y2="184" stroke="white" opacity="0.35" strokeWidth="4" strokeLinecap="round" />
          <text x="96" y="52" className={textClass}>same unit rate</text>
        </VisualShell>
      );
    case "p5-charts-averages":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[72, 116, 84, 148, 102].map((barHeight, index) => (
            <rect key={index} x={72 + index * 42} y={168 - barHeight} width="24" height={barHeight} rx="7" fill={index === 3 ? "#f472b6" : color} opacity="0.86" />
          ))}
          <line x1="58" x2="292" y1="96" y2="96" stroke="#f6c84c" strokeWidth="5" strokeDasharray="9 7" />
          <text x="68" y="52" className={textClass}>average balances the bars</text>
          <text x="250" y="90" className={softTextClass}>mean</text>
        </VisualShell>
      );
    case "p6-percentages":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 100 }, (_, index) => {
            const col = index % 10;
            const row = Math.floor(index / 10);
            return (
              <rect
                key={index}
                x={62 + col * 12}
                y={48 + row * 12}
                width="10"
                height="10"
                rx="2"
                fill={index < 65 ? color : "rgba(255,255,255,.11)"}
                opacity={index < 65 ? 0.86 : 1}
              />
            );
          })}
          <rect x="216" y="72" width="92" height="34" rx="12" fill="#f472b6" opacity="0.82" />
          <text x="238" y="94" className="fill-slate-950 text-[14px] font-black">65%</text>
          <text x="214" y="132" className={textClass}>0.65 = 13/20</text>
        </VisualShell>
      );
    case "p6-ratio-proportion":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="66" y={62 + row * 44} width={44 + row * 22} height="24" rx="8" fill={color} />
              <rect x={114 + row * 22} y={62 + row * 44} width={88 + row * 44} height="24" rx="8" fill="#f472b6" />
              <text x="48" y={80 + row * 44} textAnchor="middle" className={softTextClass}>{row + 1}x</text>
            </g>
          ))}
          <path d="M 242 62 h 54 M 242 106 h 54 M 242 150 h 54" stroke="white" strokeWidth="3" opacity="0.35" />
          <text x="92" y="190" className={textClass}>2 : 4 = 3 : 6</text>
        </VisualShell>
      );
    case "p6-speed":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="66" x2="306" y1="166" y2="166" stroke="white" strokeWidth="3" opacity="0.5" />
          <line x1="76" x2="76" y1="48" y2="180" stroke="white" strokeWidth="3" opacity="0.5" />
          <polyline points="76,166 132,140 188,112 244,84 300,58" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {[132, 188, 244].map((x, index) => (
            <circle key={x} cx={x} cy={[140, 112, 84][index]} r="8" fill="#f472b6" stroke="white" strokeWidth="2" />
          ))}
          <text x="96" y="54" className={textClass}>distance over time</text>
          <text x="230" y="190" className={softTextClass}>speed = slope</text>
        </VisualShell>
      );
    case "p6-pre-secondary-problem-solving":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <circle cx="180" cy="108" r="28" fill={color} />
          {[
            { x: 84, y: 66, label: "draw" },
            { x: 278, y: 66, label: "table" },
            { x: 86, y: 162, label: "check" },
            { x: 278, y: 162, label: "solve" }
          ].map((node) => (
            <g key={node.label}>
              <line x1="180" y1="108" x2={node.x} y2={node.y} stroke="white" strokeWidth="3" opacity="0.48" />
              <rect x={node.x - 30} y={node.y - 16} width="60" height="32" rx="13" fill={node.label === "solve" ? "#f472b6" : "rgba(255,255,255,.09)"} stroke={node.label === "solve" ? "#f472b6" : color} strokeWidth="3" />
              <text x={node.x} y={node.y + 4} textAnchor="middle" className={node.label === "solve" ? "fill-slate-950 text-[10px] font-black" : softTextClass}>{node.label}</text>
            </g>
          ))}
          <text x="164" y="112" className="fill-slate-950 text-[11px] font-black">plan</text>
          <text x="96" y="198" className={textClass}>multi-step strategy</text>
        </VisualShell>
      );
    case "integers":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="45" x2="315" y1="118" y2="118" stroke="rgba(255,255,255,.55)" strokeWidth="4" strokeLinecap="round" />
          {[-4, -2, 0, 2, 4].map((tick, index) => (
            <g key={tick}>
              <line x1={70 + index * 55} x2={70 + index * 55} y1="106" y2="130" stroke="white" opacity="0.7" />
              <text x={70 + index * 55} y="154" textAnchor="middle" className={softTextClass}>{tick}</text>
            </g>
          ))}
          <path d="M 70 86 C 118 50 164 50 215 86" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <path d="M 215 86 l -18 -6 l 8 17 z" fill={color} />
          <text x="82" y="56" className={textClass}>-4 + 6 = 2</text>
        </VisualShell>
      );
    case "algebra-basics":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2, 3].map((index) => (
            <g key={index}>
              {Array.from({ length: index + 1 }, (_, block) => (
                <rect key={block} x={62 + index * 58 + block * 8} y={128 - block * 16} width="24" height="24" rx="5" fill={block % 2 ? "#f472b6" : color} opacity="0.9" />
              ))}
              <text x={74 + index * 58} y="178" textAnchor="middle" className={softTextClass}>n={index + 1}</text>
            </g>
          ))}
          <rect x="78" y="42" width="204" height="46" rx="16" fill="rgba(255,255,255,.08)" stroke={color} />
          <text x="180" y="70" textAnchor="middle" className={textClass}>rule: 3n + 2</text>
        </VisualShell>
      );
    case "angles":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="42" x2="318" y1="78" y2="78" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" x2="318" y1="150" y2="150" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="104" x2="264" y1="190" y2="38" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <path d="M 154 150 A 34 34 0 0 1 180 124" fill="none" stroke="#f6c84c" strokeWidth="5" />
          <path d="M 197 78 A 35 35 0 0 1 222 104" fill="none" stroke="#32c3a6" strokeWidth="5" />
          <text x="86" y="58" className={softTextClass}>parallel lines</text>
          <text x="206" y="126" className={textClass}>alternate</text>
        </VisualShell>
      );
    case "ratios":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x="68" y={64 + row * 44} width={54 + row * 28} height="24" rx="8" fill={color} />
              <rect x={126 + row * 28} y={64 + row * 44} width={108 + row * 56} height="24" rx="8" fill="#f472b6" />
              <text x="48" y={82 + row * 44} textAnchor="middle" className={softTextClass}>{row + 1}x</text>
            </g>
          ))}
          <text x="92" y="186" className={textClass}>1 : 2 stays equivalent</text>
        </VisualShell>
      );
    case "statistics-s1":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[72, 116, 84, 148, 102].map((barHeight, index) => (
            <rect key={index} x={70 + index * 43} y={168 - barHeight} width="26" height={barHeight} rx="8" fill={index === 3 ? "#f472b6" : color} opacity="0.9" />
          ))}
          <line x1="54" x2="300" y1="96" y2="96" stroke="#f6c84c" strokeWidth="4" strokeDasharray="8 7" />
          <text x="64" y="54" className={textClass}>mean line + outlier check</text>
        </VisualShell>
      );
    case "linear-equations":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="180" x2="180" y1="54" y2="166" stroke="white" strokeWidth="5" />
          <line x1="92" x2="268" y1="92" y2="92" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M 92 92 l -36 58 h 72 z" fill="rgba(34,211,238,.16)" stroke={color} strokeWidth="4" />
          <path d="M 268 92 l -36 58 h 72 z" fill="rgba(244,114,182,.16)" stroke="#f472b6" strokeWidth="4" />
          <rect x="72" y="132" width="36" height="20" rx="5" fill={color} />
          <text x="84" y="128" className={softTextClass}>x+3</text>
          <text x="246" y="128" className={softTextClass}>11</text>
          <text x="122" y="196" className={textClass}>do both sides</text>
        </VisualShell>
      );
    case "coordinates":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="58" x2="306" y1="156" y2="156" stroke="white" opacity="0.55" strokeWidth="3" />
          <line x1="180" x2="180" y1="42" y2="184" stroke="white" opacity="0.55" strokeWidth="3" />
          <polyline points="80,166 136,132 190,102 256,70" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
          {[[136, 132], [190, 102], [256, 70]].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r="8" fill="#f472b6" stroke="white" strokeWidth="2" />
          ))}
          <text x="206" y="92" className={textClass}>(2, 3)</text>
        </VisualShell>
      );
    case "transformations":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <polygon points="90,146 132,78 160,154" fill={color} opacity="0.32" stroke={color} strokeWidth="4" />
          <polygon points="220,146 178,78 150,154" fill="#f472b6" opacity="0.28" stroke="#f472b6" strokeWidth="4" />
          <line x1="180" x2="180" y1="42" y2="184" stroke="white" strokeWidth="3" strokeDasharray="6 6" opacity="0.65" />
          <path d="M 248 80 l 42 24 l -42 24 z" fill="#32c3a6" opacity="0.7" />
          <path d="M 110 190 C 160 202 214 202 268 190" fill="none" stroke={color} strokeWidth="4" />
          <text x="92" y="58" className={textClass}>reflect, move, enlarge</text>
        </VisualShell>
      );
    case "probability-s2":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2, 3, 4, 5].map((face) => (
            <rect key={face} x={64 + (face % 3) * 78} y={62 + Math.floor(face / 3) * 58} width="46" height="46" rx="10" fill={face % 2 ? "#f472b6" : color} opacity="0.85" />
          ))}
          <path d="M 68 180 H 292" stroke="white" opacity="0.35" strokeWidth="4" strokeLinecap="round" />
          <text x="92" y="198" className={textClass}>favourable / total</text>
        </VisualShell>
      );
    case "polynomials":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="78" y="60" width="96" height="96" fill={color} opacity="0.68" stroke="white" strokeWidth="3" />
          <rect x="174" y="60" width="92" height="38" fill="#f472b6" opacity="0.75" stroke="white" strokeWidth="3" />
          <rect x="78" y="156" width="96" height="24" fill="#f6c84c" opacity="0.75" stroke="white" strokeWidth="3" />
          <text x="108" y="112" className={textClass}>
            <tspan>x</tspan>
            <tspan dx="1" dy="-8" className="text-[8px]">2</tspan>
          </text>
          <text x="196" y="84" className={softTextClass}>3x</text>
          <text x="92" y="176" className={softTextClass}>2x</text>
          <text x="108" y="42" className={textClass}>expand / factor area</text>
        </VisualShell>
      );
    case "quadratic-patterns":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 74 54 C 116 190 244 190 286 54" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="180" x2="180" y1="52" y2="182" stroke="#67e8f9" strokeDasharray="5 7" opacity="0.65" />
          <circle cx="180" cy="154" r="8" fill="#22d3ee" stroke="white" strokeWidth="3" />
          <rect x="58" y="166" width="62" height="30" rx="8" fill="rgba(255,255,255,.08)" />
          <text x="70" y="186" className={softTextClass}>2nd diff</text>
          <text x="208" y="94" className={textClass}>vertex</text>
        </VisualShell>
      );
    case "trigonometry-basics":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <polygon points="84,166 276,166 276,62" fill="rgba(34,211,238,.14)" stroke="white" strokeWidth="4" />
          <path d="M 84 166 A 46 46 0 0 1 128 122" fill="none" stroke={color} strokeWidth="5" />
          <text x="128" y="188" className={softTextClass}>adjacent</text>
          <text x="286" y="122" className={softTextClass}>opposite</text>
          <text x="158" y="106" className={textClass}>sin, cos, tan</text>
        </VisualShell>
      );
    case "circles":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <circle cx="180" cy="110" r="70" fill="rgba(34,211,238,.1)" stroke={color} strokeWidth="5" />
          <line x1="114" x2="246" y1="86" y2="86" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <line x1="250" x2="316" y1="62" y2="138" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="180" x2="250" y1="110" y2="62" stroke="#f6c84c" strokeWidth="4" strokeDasharray="7 6" />
          <path d="M 146 154 A 42 42 0 0 1 214 154" fill="none" stroke="#32c3a6" strokeWidth="5" />
          <text x="68" y="48" className={textClass}>chords, tangents, arcs</text>
        </VisualShell>
      );
    case "functions":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="66" y="72" width="86" height="74" rx="20" fill="rgba(255,255,255,.08)" stroke={color} strokeWidth="4" />
          <path d="M 154 110 H 204" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M 204 92 L 234 110 L 204 128 Z" fill="white" />
          <path d="M 230 158 C 248 88 278 86 300 54" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <text x="78" y="116" className={textClass}>f(x)</text>
          <text x="230" y="184" className={softTextClass}>domain to range</text>
        </VisualShell>
      );
    case "coordinate-geometry":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="62" x2="304" y1="166" y2="166" stroke="white" opacity="0.45" strokeWidth="3" />
          <line x1="78" x2="78" y1="46" y2="182" stroke="white" opacity="0.45" strokeWidth="3" />
          <line x1="86" x2="286" y1="150" y2="64" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx="128" cy="132" r="8" fill="#f472b6" stroke="white" strokeWidth="2" />
          <circle cx="242" cy="83" r="8" fill="#f472b6" stroke="white" strokeWidth="2" />
          <circle cx="185" cy="108" r="7" fill="#f6c84c" stroke="white" strokeWidth="2" />
          <text x="196" y="132" className={textClass}>midpoint</text>
        </VisualShell>
      );
    case "more-algebra":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <rect x="58" y="58" width="92" height="48" rx="14" fill={color} opacity="0.82" />
          <rect x="210" y="58" width="92" height="48" rx="14" fill="#f472b6" opacity="0.82" />
          <rect x="126" y="132" width="108" height="48" rx="14" fill="#f6c84c" opacity="0.82" />
          <path d="M 150 82 H 210 M 104 106 L 144 132 M 256 106 L 216 132" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <text x="72" y="88" className={softTextClass}>a^m a^n</text>
          <text x="224" y="88" className={softTextClass}>factor</text>
          <text x="142" y="162" className={textClass}>same structure</text>
        </VisualShell>
      );
    case "data-handling":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <line x1="62" x2="302" y1="118" y2="118" stroke="white" opacity="0.55" strokeWidth="4" strokeLinecap="round" />
          <rect x="114" y="96" width="112" height="44" fill="rgba(34,211,238,.22)" stroke={color} strokeWidth="4" />
          <line x1="172" x2="172" y1="92" y2="144" stroke="#f472b6" strokeWidth="4" />
          {[82, 102, 240, 278].map((x) => <line key={x} x1={x} x2={x} y1="104" y2="132" stroke="white" strokeWidth="3" />)}
          <circle cx="270" cy="56" r="8" fill="#f472b6" />
          <circle cx="246" cy="76" r="6" fill={color} />
          <text x="86" y="178" className={textClass}>box plot + scatter claim</text>
        </VisualShell>
      );
    case "advanced-functions":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 54 164 C 96 166 100 58 146 84 C 196 112 184 176 302 50" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <path d="M 62 166 C 128 158 210 128 294 56" fill="none" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <path d="M 70 176 C 124 114 176 88 298 82" fill="none" stroke="#f6c84c" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <text x="72" y="48" className={textClass}>polynomial vs exp vs log</text>
        </VisualShell>
      );
    case "trigonometry-s5":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 44 110 C 76 54 112 54 144 110 S 212 166 244 110 S 312 54 344 110" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="44" x2="344" y1="110" y2="110" stroke="white" strokeWidth="3" opacity="0.4" />
          <line x1="144" x2="244" y1="184" y2="184" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <text x="162" y="202" className={softTextClass}>period</text>
          <text x="74" y="54" className={textClass}>amplitude</text>
        </VisualShell>
      );
    case "probability-s5":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <circle cx="88" cy="110" r="36" fill={color} opacity="0.28" stroke={color} strokeWidth="4" />
          <circle cx="128" cy="110" r="36" fill="#f472b6" opacity="0.28" stroke="#f472b6" strokeWidth="4" />
          <path d="M 194 72 L 266 44 M 194 72 L 266 100 M 194 148 L 266 120 M 194 148 L 266 176" stroke="white" strokeWidth="4" strokeLinecap="round" />
          {[194, 266, 266, 266, 266].map((x, index) => (
            <circle key={index} cx={x} cy={[72, 44, 100, 120, 176][index]} r="8" fill={index === 0 ? color : "#f472b6"} />
          ))}
          <text x="58" y="178" className={textClass}>given event paths</text>
        </VisualShell>
      );
    case "differentiation-intro":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 56 162 C 108 150 128 58 180 86 C 226 112 232 158 304 52" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <line x1="110" x2="276" y1="140" y2="76" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" />
          <line x1="142" x2="244" y1="122" y2="92" stroke="#f6c84c" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 7" />
          <circle cx="190" cy="96" r="8" fill="#22d3ee" stroke="white" strokeWidth="2" />
          <text x="96" y="52" className={textClass}>secant to tangent</text>
        </VisualShell>
      );
    case "calculus":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <rect key={index} x={82 + index * 28} y={152 - index * 12} width="24" height={index * 12 + 20} fill={color} opacity="0.32" stroke={color} />
          ))}
          <path d="M 70 168 C 124 150 180 118 268 58" fill="none" stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <line x1="210" x2="304" y1="98" y2="54" stroke="#f6c84c" strokeWidth="4" strokeLinecap="round" />
          <text x="92" y="46" className={textClass}>integral area + derivative rate</text>
        </VisualShell>
      );
    case "statistics-s6":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 54 168 C 98 168 106 66 180 66 C 254 66 262 168 306 168" fill="rgba(34,211,238,.16)" stroke={color} strokeWidth="5" />
          <path d="M 180 168 L 180 66" stroke="#f472b6" strokeWidth="4" strokeDasharray="7 6" />
          <path d="M 218 168 C 240 144 246 104 252 82" fill="none" stroke="#f6c84c" strokeWidth="8" strokeLinecap="round" opacity="0.85" />
          <text x="116" y="196" className={textClass}>z-score and percentile</text>
        </VisualShell>
      );
    case "exam-revision":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          {Array.from({ length: 20 }, (_, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            const fills = [color, "#f472b6", "#f6c84c", "#32c3a6"];
            return <rect key={index} x={72 + col * 42} y={48 + row * 34} width="28" height="24" rx="6" fill={fills[(index + row) % fills.length]} opacity={0.36 + (index % 4) * 0.15} />;
          })}
          <text x="88" y="198" className={textClass}>priority by skill gap</text>
        </VisualShell>
      );
    case "mixed-problem-solving":
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <circle cx="180" cy="110" r="24" fill={color} />
          {[[90, 62], [274, 62], [92, 164], [274, 164]].map(([x, y], index) => (
            <g key={index}>
              <line x1="180" y1="110" x2={x} y2={y} stroke="white" strokeWidth="3" opacity="0.55" />
              <circle cx={x} cy={y} r="22" fill={index % 2 ? "#f472b6" : "#32c3a6"} opacity="0.85" />
            </g>
          ))}
          <text x="150" y="115" className="fill-slate-950 text-[11px] font-black">plan</text>
          <text x="86" y="198" className={textClass}>choose algebra, geometry, data</text>
        </VisualShell>
      );
    default:
      return (
        <VisualShell topicId={topicId} color={color} large={large}>
          <path d="M 64 160 C 124 70 214 172 296 66" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <circle cx="124" cy="102" r="9" fill="#f472b6" stroke="white" strokeWidth="2" />
          <circle cx="214" cy="132" r="9" fill="#f6c84c" stroke="white" strokeWidth="2" />
          <text x="76" y="64" className={textClass}>Missing visualization</text>
          <text x="76" y="88" className={softTextClass}>Add a topic-specific model case.</text>
        </VisualShell>
      );
  }
}

function TopicCard({
  topic,
  active,
  onSelect
}: {
  topic: Topic;
  active: boolean;
  onSelect: () => void;
}) {
  const { language, text, t } = useSettings();
  const color = getRouteColor(topic);
  const details = getDetails(topic.id);
  const topicTitle = text(topic.title);
  const actionLabel = active ? t({ en: "Showing in spotlight", zh: "正在上方顯示" }) : t({ en: "View model", zh: "查看模型" });
  const branchLabels = isChineseLanguage(language)
    ? details.branches.map((_, branchIndex) => simplifyChineseText(`${topicTitle}重點${branchIndex + 1}`, language))
    : details.branches.map((branch) => branch.station);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={isChineseLanguage(language) ? simplifyChineseText(`查看${topicTitle}視覺化模型`, language) : `View ${topicTitle} visualization model`}
      className={cn(
        "focus-ring group flex h-full flex-col overflow-hidden rounded-3xl border p-3 text-left shadow-lg transition hover:-translate-y-1",
        active
          ? "border-cyan-300 bg-white/90 shadow-cyan-500/20 ring-2 ring-cyan-300/35 dark:border-cyan-300/45 dark:bg-slate-950/55"
          : "border-slate-200/70 bg-white/75 shadow-slate-900/5 hover:border-cyan-300/70 dark:border-white/10 dark:bg-slate-950/55"
      )}
    >
      <div className="relative">
        <TopicMiniVisualization topicId={topic.id} color={color} />
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 shadow-lg">
          {t({ en: "Preview", zh: "預覽" })}
        </span>
        {active ? (
          <span className="absolute right-3 top-3 rounded-full bg-cyan-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-lg shadow-cyan-500/20">
            {t({ en: "Selected", zh: "已選" })}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
	              {isChineseLanguage(language) ? simplifyChineseText(`${formatGradeLabel(topic.grade, language, true)}路線`, language) : `${formatGradeLabel(topic.grade, language, true)} route`}
            </p>
            <h3 className="mt-1 text-lg font-black leading-tight text-slate-950 dark:text-white">
              {topicTitle}
            </h3>
          </div>
          <span
            className="mt-1 h-3 w-12 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
	          {isChineseLanguage(language) ? text(topic.description) : visualizationLabels[topic.id] ?? text(topic.description)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
	          {branchLabels.map((branchLabel) => (
	            <span
	              key={branchLabel}
              className="rounded-full border border-slate-200/70 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
            >
	              {branchLabel}
	            </span>
	          ))}
        </div>
        <span
          className={cn(
            "mt-auto inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-black transition",
            active
              ? "bg-cyan-300 text-slate-950"
              : "border border-cyan-300/35 bg-cyan-400/10 text-cyan-700 group-hover:bg-cyan-300 group-hover:text-slate-950 dark:text-cyan-200"
          )}
        >
          {actionLabel}
        </span>
      </div>
    </button>
  );
}

function Spotlight({
  topic,
  spotlightRef,
  getTopicLabHref
}: {
  topic: Topic;
  spotlightRef: RefObject<HTMLElement | null>;
  getTopicLabHref?: TopicLabHrefResolver;
}) {
  const { language, text, t } = useSettings();
  const color = getRouteColor(topic);
  const details = getDetails(topic.id);
  const labHref = getTopicLabHref?.(topic) ?? null;
  const labJumpLabel = isChineseLanguage(language)
    ? simplifyChineseText(`前往${text(topic.title)}視覺化例子`, language)
    : `Open ${text(topic.title)} visualization lab example`;
  const localizedStops = isChineseLanguage(language)
    ? ["核心概念", "視覺模型", "練習檢查"].map((stop) => simplifyChineseText(stop, language))
    : null;
  const visualizationArtwork = <TopicMiniVisualization topicId={topic.id} color={color} large />;

  function handleLabJump(event: MouseEvent<HTMLAnchorElement>) {
    if (!labHref?.startsWith("#")) return;

    const target = document.getElementById(labHref.slice(1));
    if (!target) return;

    event.preventDefault();
    window.history.pushState(null, "", labHref);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      ref={spotlightRef}
      tabIndex={-1}
      className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-4 shadow-xl shadow-cyan-950/20 outline-none transition focus:ring-4 focus:ring-cyan-300/45 sm:p-5"
      aria-live="polite"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
        {labHref ? (
          <a
            href={labHref}
            onClick={handleLabJump}
            className="focus-ring block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/10"
            aria-label={labJumpLabel}
            title={labJumpLabel}
          >
            {visualizationArtwork}
          </a>
        ) : (
          visualizationArtwork
        )}
        <div className="flex flex-col justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1.5 text-xs font-black text-slate-950" style={{ backgroundColor: color }}>
	                {formatGradeLabel(topic.grade, language, true)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-slate-200">
	                {formatDifficultyLabel(topic.difficulty, language)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-slate-200">
	                {topic.minutes} {t(dictionary.common.minutes)}
              </span>
            </div>
	            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-cyan-300">{t({ en: "Selected roadmap visualization", zh: "已選路線圖視覺化" })}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-white">{text(topic.title)}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{text(topic.description)}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
	            {details.branches.map((branch, branchIndex) => {
                const stationLabel = isChineseLanguage(language) ? simplifyChineseText(`${text(topic.title)}重點${branchIndex + 1}`, language) : branch.station;
                const stops = localizedStops ?? branch.busStops;

                return (
	              <div key={branch.station} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
	                <div className="flex items-center gap-3">
	                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black text-slate-950" style={{ backgroundColor: routeColors[(branchIndex + 2) % routeColors.length] }}>
	                    {branchIndex + 1}
	                  </span>
	                  <p className="text-sm font-black text-white">{stationLabel}</p>
	                </div>
	                <div className="mt-3 flex flex-wrap gap-2">
	                  {stops.map((stop) => (
	                    <span key={stop} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-slate-300">
	                      {stop}
	                    </span>
	                  ))}
	                </div>
	              </div>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RoadmapVisualizationSuite({ getTopicLabHref }: RoadmapVisualizationSuiteProps = {}) {
  const { language, text, t } = useSettings();
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [activeTopicId, setActiveTopicId] = useState(topics[0]?.id ?? "integers");
  const spotlightRef = useRef<HTMLElement | null>(null);

  const visibleGrades = useMemo(
    () => grades.filter((grade) => gradeFilter === "all" || grade.id === gradeFilter),
    [gradeFilter]
  );
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const stationCount = topics.reduce((sum, topic) => sum + getDetails(topic.id).branches.length, 0);

  function revealTopic(topicId: string) {
    setActiveTopicId(topicId);
    window.setTimeout(() => {
      spotlightRef.current?.focus({ preventScroll: true });
      spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="space-y-7">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
	            {t({ en: "Roadmap visualization suite", zh: "路線圖視覺化組合" })}
	          </p>
	          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
	            {t({
                en: "P1-S6 math knowledge, organized as visual routes",
                zh: "小一至中六數學知識，以視覺路線整理"
              })}
	          </h2>
	          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
	            {t({
                en: "Every topic from the P1-S6 math roadmap now has a matching visualization card. Choose a grade, open a route, and use the station list to connect the visual model to the required subconcepts.",
                zh: "小一至中六數學路線圖中的每個課題都有對應視覺卡。選擇年級、開啟路線，並用站點清單把視覺模型連到所需子概念。"
              })}
	          </p>
        </div>
        <div className="grid grid-cols-3 items-start gap-3 self-start">
          {[
	            [String(topics.length), t({ en: "topic routes", zh: "課題路線" })],
	            [String(stationCount), t({ en: "roadmap stations", zh: "路線站點" })],
	            [formatGradeRange(language, true), t({ en: "coverage", zh: "覆蓋範圍" })]
          ].map(([value, label]) => (
            <div key={label} className="flex h-[94px] flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white/75 p-3 text-center shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-slate-950/55">
              <p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase leading-4 tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setGradeFilter("all")}
          className={cn(
            "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-black transition",
            gradeFilter === "all"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
              : "border border-slate-200/70 bg-white/75 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
          )}
        >
	          {t({ en: "All routes", zh: "全部路線" })}
        </button>
        {grades.map((grade) => (
          <button
            key={grade.id}
            type="button"
            onClick={() => {
              setGradeFilter(grade.id);
              setActiveTopicId(topics.find((topic) => topic.grade === grade.id)?.id ?? activeTopicId);
            }}
            className={cn(
              "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-black transition",
              gradeFilter === grade.id
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "border border-slate-200/70 bg-white/75 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
            )}
          >
	            {formatGradeLabel(grade.id, language, true)}
          </button>
        ))}
      </div>

      {missingVisualizationTopicIds.length > 0 ? (
        <p className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm font-bold text-amber-700 dark:text-amber-200">
          {t({
            en: `${missingVisualizationTopicIds.length} roadmap topic needs a visualization label before release.`,
            zh: `${missingVisualizationTopicIds.length} 個路線課題需要補上視覺化標籤才可發布。`
          })}
        </p>
      ) : null}

      <Spotlight topic={activeTopic} spotlightRef={spotlightRef} getTopicLabHref={getTopicLabHref} />

      <div className="space-y-8">
        {visibleGrades.map((grade) => {
          const gradeTopics = topics.filter((topic) => topic.grade === grade.id);

          return (
            <section key={grade.id} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
	                    {isChineseLanguage(language) ? simplifyChineseText(`${formatGradeLabel(grade.id, language, true)}總站`, language) : `${formatGradeLabel(grade.id, language, true)} terminal`}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                    {getGradeDisplayName(text(grade.name), grade.id)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(grade.focus)}</p>
                </div>
                <span className={cn("h-2 w-full rounded-full bg-gradient-to-r sm:w-56", grade.color)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gradeTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    active={topic.id === activeTopic.id}
                    onSelect={() => revealTopic(topic.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
