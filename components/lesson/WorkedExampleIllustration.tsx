import type { GradeId } from "@/types";
import type { ReactElement } from "react";
import {
  buildMathAngleContract,
  serializeMathAngleContract,
  svgAngleArcPath
} from "@/lib/mathDiagramGeometry";
import {
  buildWorkedExampleIllustrationMetadata,
  type WorkedExampleIllustrationMetadata,
  type WorkedExampleVisualKind
} from "@/components/lesson/workedExampleIllustrationMetadata";

type WorkedExampleIllustrationProps = {
  className?: string;
  content: string;
  grade: GradeId;
  publisher?: string;
  title: string;
  topicId: string;
};

const shellClassName =
  "group relative mx-auto mt-5 w-full max-w-4xl overflow-hidden rounded-2xl border border-cyan-200/70 bg-white/75 shadow-lg shadow-cyan-500/10 dark:border-cyan-300/15 dark:bg-white/[0.055]";
const captionClassName =
  "border-t border-cyan-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-cyan-300/15 dark:text-slate-300 sm:text-base sm:leading-7";

function svgTitleId(metadata: WorkedExampleIllustrationMetadata) {
  return `${metadata.id}-title`;
}

const focusBadgeTextWidth = 325;

const geometrySceneAngle = buildMathAngleContract({
  id: "worked-example-geometry-angle",
  origin: { x: 620, y: 405 },
  radius: 75,
  startRay: { x: 1, y: 0 },
  endRay: { x: 190, y: -255 },
  sweepRadians: Math.atan2(255, 190)
});

const spatialVectorTrigAngle = buildMathAngleContract({
  id: "worked-example-spatial-vector-angle",
  origin: { x: 80, y: 320 },
  radius: 50,
  startRay: { x: 1, y: 0 },
  endRay: { x: 680, y: -110 },
  sweepRadians: Math.atan2(110, 680)
});

function focusBadgeGlyphWeight(value: string) {
  return Array.from(value).reduce((weight, character) => {
    if (/\s/u.test(character)) return weight + 0.35;
    if (/[\u3000-\u9fff]/u.test(character)) return weight + 1;
    if (/[ilI1.,:;|]/u.test(character)) return weight + 0.35;
    if (/[mwMW@#%&]/u.test(character)) return weight + 0.9;
    return weight + 0.6;
  }, 0);
}

export function focusBadgeTextMetrics(value: string) {
  const glyphWeight = Math.max(1, focusBadgeGlyphWeight(value));
  const fontSize = Math.max(14, Math.min(28, focusBadgeTextWidth / glyphWeight));
  const estimatedWidth = fontSize * glyphWeight;

  return {
    fontSize,
    textLength: estimatedWidth > focusBadgeTextWidth ? focusBadgeTextWidth : undefined
  };
}

function FocusBadge({ focusText }: { focusText: string }) {
  const textMetrics = focusBadgeTextMetrics(focusText);

  return (
    <g>
      <rect x="1025" y="92" width="385" height="92" rx="24" fill="#ffffff" stroke="#bae6fd" strokeWidth="4" />
      <text x="1055" y="129" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800">
        Worked focus
      </text>
      <text
        x="1055"
        y="162"
        fill="#0369a1"
        fontFamily="Arial, sans-serif"
        fontSize={textMetrics.fontSize}
        fontWeight="900"
        lengthAdjust={textMetrics.textLength ? "spacingAndGlyphs" : undefined}
        textLength={textMetrics.textLength}
      >
        {focusText}
      </text>
    </g>
  );
}

function StepTiles({ labels }: { labels: [string, string, string] }) {
  return (
    <g>
      {labels.map((label, index) => (
        <g key={label} transform={`translate(${210 + index * 285} 710)`}>
          <rect width="225" height="82" rx="22" fill={index === 0 ? "#ecfeff" : index === 1 ? "#fff7ed" : "#f0fdf4"} stroke={index === 0 ? "#67e8f9" : index === 1 ? "#fdba74" : "#86efac"} strokeWidth="4" />
          <text x="112.5" y="50" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="900">
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}

function parseGroupedExpressionFocus(focusText: string) {
  const match = focusText.match(/^\(\s*(\d+)\s*\+\s*(\d+)\s*\)\s*x\s*(\d+)$/i);
  if (!match) return null;

  return {
    firstCount: Number(match[1]),
    secondCount: Number(match[2]),
    groupCount: Number(match[3])
  };
}

function GroupedExpressionScene({
  firstCount,
  focusText,
  groupCount,
  secondCount
}: {
  firstCount: number;
  focusText: string;
  groupCount: number;
  secondCount: number;
}) {
  const visibleGroups = Array.from({ length: Math.min(groupCount, 4) }, (_, index) => index);
  const squareCounters = Array.from({ length: Math.min(firstCount, 8) }, (_, index) => index);
  const circleCounters = Array.from({ length: Math.min(secondCount, 5) }, (_, index) => index);

  return (
    <>
      <g transform="translate(145 180)">
        {visibleGroups.map((group) => (
          <g key={group} transform={`translate(${group * 300} 0)`}>
            <rect width="255" height="310" rx="28" fill="#f8fafc" stroke="#0e7490" strokeWidth="5" />
            <text x="127" y="44" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="900">
              group {group + 1}
            </text>
            {squareCounters.map((counter) => (
              <rect
                key={`square-${counter}`}
                x={36 + (counter % 4) * 46}
                y={72 + Math.floor(counter / 4) * 48}
                width="34"
                height="34"
                rx="7"
                fill="#22c55e"
                stroke="#14532d"
                strokeWidth="3"
              />
            ))}
            {circleCounters.map((counter) => (
              <circle
                key={`circle-${counter}`}
                cx={62 + counter * 48}
                cy="228"
                r="19"
                fill="#f59e0b"
                stroke="#92400e"
                strokeWidth="3"
              />
            ))}
            <text x="127" y="282" textAnchor="middle" fill="#334155" fontFamily="Arial, sans-serif" fontSize="21" fontWeight="800">
              {firstCount} squares + {secondCount} circles
            </text>
          </g>
        ))}
      </g>
      <g transform="translate(1085 570)">
        <rect width="310" height="88" rx="22" fill="#ecfeff" stroke="#06b6d4" strokeWidth="5" />
        <text x="155" y="36" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="900">
          {groupCount} equal groups
        </text>
        <text x="155" y="68" textAnchor="middle" fill="#0369a1" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="900">
          {focusText}
        </text>
      </g>
      <StepTiles labels={["build groups", "multiply", "check"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function CountingScene({ focusText }: { focusText: string }) {
  const groupedExpression = parseGroupedExpressionFocus(focusText);
  if (groupedExpression) {
    return <GroupedExpressionScene focusText={focusText} {...groupedExpression} />;
  }

  const counters = Array.from({ length: 10 }, (_, index) => index);

  return (
    <>
      <g transform="translate(190 155)">
        <rect width="500" height="250" rx="28" fill="#f8fafc" stroke="#0e7490" strokeWidth="6" />
        <line x1="100" y1="0" x2="100" y2="250" stroke="#bae6fd" strokeWidth="4" />
        <line x1="200" y1="0" x2="200" y2="250" stroke="#bae6fd" strokeWidth="4" />
        <line x1="300" y1="0" x2="300" y2="250" stroke="#bae6fd" strokeWidth="4" />
        <line x1="400" y1="0" x2="400" y2="250" stroke="#bae6fd" strokeWidth="4" />
        <line x1="0" y1="125" x2="500" y2="125" stroke="#bae6fd" strokeWidth="4" />
        {counters.map((counter) => (
          <circle
            key={counter}
            cx={50 + (counter % 5) * 100}
            cy={62 + Math.floor(counter / 5) * 125}
            r="34"
            fill={counter < 7 ? "#22c55e" : "#f59e0b"}
            stroke="#0f172a"
            strokeWidth="3"
          />
        ))}
      </g>
      <g transform="translate(770 250)">
        <circle cx="140" cy="0" r="66" fill="#dbeafe" stroke="#2563eb" strokeWidth="5" />
        <circle cx="40" cy="178" r="58" fill="#dcfce7" stroke="#16a34a" strokeWidth="5" />
        <circle cx="240" cy="178" r="58" fill="#ffedd5" stroke="#ea580c" strokeWidth="5" />
        <line x1="102" y1="54" x2="65" y2="126" stroke="#64748b" strokeWidth="5" />
        <line x1="178" y1="54" x2="215" y2="126" stroke="#64748b" strokeWidth="5" />
        <text x="140" y="10" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          whole
        </text>
        <text x="40" y="188" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="900">
          part
        </text>
        <text x="240" y="188" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="900">
          part
        </text>
      </g>
      <StepTiles labels={["count", "join", "check"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function PlaceValueScene({ focusText }: { focusText: string }) {
  const numberMatch = focusText.match(/\d+/);
  const focusNumber = numberMatch ? Math.min(99, Math.max(0, Number(numberMatch[0]))) : 38;
  const tens = Math.floor(focusNumber / 10);
  const ones = focusNumber % 10;

  return (
    <>
      <g transform="translate(170 185)">
        {Array.from({ length: tens }, (_, rod) => (
          <g key={rod} transform={`translate(${(rod % 5) * 64} ${Math.floor(rod / 5) * 168})`}>
            <rect width="48" height="318" rx="12" fill="#38bdf8" stroke="#075985" strokeWidth="4" />
            {Array.from({ length: 9 }, (_, index) => (
              <line key={index} x1="0" y1={32 + index * 31} x2="48" y2={32 + index * 31} stroke="#e0f2fe" strokeWidth="3" />
            ))}
          </g>
        ))}
        {Array.from({ length: ones }, (_, index) => (
          <rect
            key={index}
            x={285 + (index % 4) * 56}
            y={22 + Math.floor(index / 4) * 62}
            width="42"
            height="42"
            rx="10"
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth="4"
          />
        ))}
      </g>
      <g transform="translate(740 230)">
        <rect width="470" height="210" rx="28" fill="#ffffff" stroke="#c084fc" strokeWidth="5" />
        <text x="95" y="58" fill="#581c87" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          tens
        </text>
        <text x="305" y="58" fill="#92400e" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          ones
        </text>
        <line x1="235" y1="24" x2="235" y2="186" stroke="#e9d5ff" strokeWidth="5" />
        <text x="117" y="142" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="56" fontWeight="900">
          {tens}
        </text>
        <text x="352" y="142" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="56" fontWeight="900">
          {ones}
        </text>
      </g>
      <StepTiles labels={["bundle", "value", "regroup"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function FractionScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(190 255)">
        <rect width="780" height="90" rx="22" fill="#f8fafc" stroke="#334155" strokeWidth="5" />
        {[1, 2, 3, 4, 5, 6].map((line) => (
          <line key={line} x1={line * 130} y1="0" x2={line * 130} y2="90" stroke="#94a3b8" strokeWidth="4" />
        ))}
        {[0, 1, 2, 3].map((part) => (
          <rect key={part} x={part * 130} y="0" width="130" height="90" fill={part % 2 === 0 ? "#a7f3d0" : "#bfdbfe"} opacity="0.95" />
        ))}
        <text x="390" y="150" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          equal parts of one whole
        </text>
      </g>
      <circle cx="1115" cy="300" r="118" fill="#fff7ed" stroke="#ea580c" strokeWidth="6" />
      <path d="M1115 300 L1115 182 A118 118 0 0 1 1233 300 Z" fill="#f97316" />
      <path d="M1115 300 L1233 300 A118 118 0 0 1 1115 418 Z" fill="#fbbf24" />
      <StepTiles labels={["parts", "whole", "compare"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function GeometryScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(190 155)">
        <rect x="0" y="195" width="410" height="210" rx="18" fill="#dbeafe" stroke="#2563eb" strokeWidth="5" />
        {Array.from({ length: 7 }, (_, index) => (
          <line key={`v-${index}`} x1={index * 58} y1="195" x2={index * 58} y2="405" stroke="#93c5fd" strokeWidth="3" />
        ))}
        {Array.from({ length: 5 }, (_, index) => (
          <line key={`h-${index}`} x1="0" y1={195 + index * 52} x2="410" y2={195 + index * 52} stroke="#93c5fd" strokeWidth="3" />
        ))}
        <path d="M620 405 L810 150 L1000 405 Z" fill="#dcfce7" stroke="#15803d" strokeWidth="7" />
        <path d="M810 405 L810 150" stroke="#16a34a" strokeWidth="4" strokeDasharray="10 10" />
        <path
          data-diagram-angle-arc
          data-math-angle-contract={serializeMathAngleContract(geometrySceneAngle)}
          d={svgAngleArcPath(geometrySceneAngle)}
          fill="none"
          stroke="#f97316"
          strokeWidth="8"
        />
      </g>
      <StepTiles labels={["draw", "measure", "check"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function CoordinateFunctionScene({ focusText }: { focusText: string }) {
  const points = [
    [0, 260],
    [95, 215],
    [190, 170],
    [285, 125],
    [380, 80]
  ];

  return (
    <>
      <g transform="translate(190 185)">
        <rect width="620" height="390" rx="24" fill="#f8fafc" stroke="#334155" strokeWidth="5" />
        {Array.from({ length: 6 }, (_, index) => (
          <line key={`x-${index}`} x1={70 + index * 92} y1="40" x2={70 + index * 92} y2="330" stroke="#cbd5e1" strokeWidth="2" />
        ))}
        {Array.from({ length: 5 }, (_, index) => (
          <line key={`y-${index}`} x1="70" y1={50 + index * 70} x2="550" y2={50 + index * 70} stroke="#cbd5e1" strokeWidth="2" />
        ))}
        <line x1="70" y1="330" x2="570" y2="330" stroke="#0f172a" strokeWidth="5" />
        <line x1="70" y1="330" x2="70" y2="25" stroke="#0f172a" strokeWidth="5" />
        <polyline
          points={points.map(([x, y]) => `${x + 110},${y + 50}`).join(" ")}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x + 110} cy={y + 50} r="12" fill="#f97316" stroke="#7c2d12" strokeWidth="3" />
        ))}
      </g>
      <g transform="translate(895 245)">
        <rect width="285" height="235" rx="22" fill="#ffffff" stroke="#bae6fd" strokeWidth="5" />
        <line x1="0" y1="70" x2="285" y2="70" stroke="#bae6fd" strokeWidth="4" />
        <line x1="142" y1="0" x2="142" y2="235" stroke="#bae6fd" strokeWidth="4" />
        <text x="72" y="47" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="900">
          input
        </text>
        <text x="214" y="47" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="900">
          output
        </text>
        {[1, 2, 3].map((row) => (
          <g key={row}>
            <text x="72" y={72 + row * 42} textAnchor="middle" fill="#334155" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="800">
              {row}
            </text>
            <text x="214" y={72 + row * 42} textAnchor="middle" fill="#334155" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="800">
              {row * 2 + 1}
            </text>
          </g>
        ))}
      </g>
      <StepTiles labels={["input", "graph", "interpret"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function AlgebraScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(245 190)">
        <line x1="320" y1="95" x2="320" y2="360" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
        <line x1="130" y1="155" x2="510" y2="155" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
        <path d="M130 155 L72 310 L188 310 Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="5" />
        <path d="M510 155 L452 310 L568 310 Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="5" />
        {[0, 1, 2].map((tile) => (
          <rect key={`x-${tile}`} x={78 + tile * 36} y="255" width="30" height="30" rx="7" fill="#3b82f6" />
        ))}
        {[0, 1, 2, 3].map((tile) => (
          <rect key={`n-${tile}`} x={462 + tile * 26} y="263" width="22" height="22" rx="5" fill="#22c55e" />
        ))}
      </g>
      <g transform="translate(875 260)">
        <rect width="330" height="150" rx="28" fill="#fff7ed" stroke="#fb923c" strokeWidth="5" />
        <text x="165" y="66" textAnchor="middle" fill="#7c2d12" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          same value
        </text>
        <text x="165" y="112" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="900">
          both sides match
        </text>
      </g>
      <StepTiles labels={["represent", "solve", "verify"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function DataProbabilityScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(190 210)">
        <rect width="520" height="340" rx="24" fill="#f8fafc" stroke="#334155" strokeWidth="5" />
        <line x1="70" y1="285" x2="470" y2="285" stroke="#0f172a" strokeWidth="5" />
        <line x1="70" y1="55" x2="70" y2="285" stroke="#0f172a" strokeWidth="5" />
        {[88, 174, 260, 346].map((x, index) => (
          <rect key={x} x={x} y={285 - [90, 150, 120, 205][index]} width="56" height={[90, 150, 120, 205][index]} rx="10" fill={["#38bdf8", "#a78bfa", "#f59e0b", "#22c55e"][index]} />
        ))}
      </g>
      <g transform="translate(860 250)">
        <circle cx="135" cy="135" r="122" fill="#ffffff" stroke="#7c3aed" strokeWidth="6" />
        <path d="M135 135 L135 13 A122 122 0 0 1 257 135 Z" fill="#a78bfa" />
        <path d="M135 135 L257 135 A122 122 0 0 1 135 257 Z" fill="#fbbf24" />
        <path d="M135 135 L135 257 A122 122 0 0 1 13 135 Z" fill="#67e8f9" />
        <line x1="135" y1="135" x2="198" y2="73" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
      </g>
      <StepTiles labels={["collect", "compare", "decide"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function RatioRatePercentScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(190 230)">
        {[0, 1].map((line) => (
          <g key={line} transform={`translate(0 ${line * 120})`}>
            <line x1="0" y1="40" x2="760" y2="40" stroke={line === 0 ? "#0e7490" : "#7c3aed"} strokeWidth="8" strokeLinecap="round" />
            {[0, 1, 2, 3, 4].map((tick) => (
              <g key={tick}>
                <line x1={tick * 190} y1="18" x2={tick * 190} y2="62" stroke="#0f172a" strokeWidth="5" />
                <text x={tick * 190} y="100" textAnchor="middle" fill="#334155" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="800">
                  {line === 0 ? tick : tick * 25}%
                </text>
              </g>
            ))}
          </g>
        ))}
      </g>
      <g transform="translate(1010 280)">
        <rect width="250" height="125" rx="24" fill="#ecfeff" stroke="#06b6d4" strokeWidth="5" />
        <rect width="150" height="125" rx="24" fill="#fb923c" opacity="0.92" />
        <text x="125" y="76" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="900">
          part / whole
        </text>
      </g>
      <StepTiles labels={["ratio", "scale", "check"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function MeasurementMoneyTimeScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(185 250)">
        <rect width="610" height="90" rx="16" fill="#fef3c7" stroke="#b45309" strokeWidth="5" />
        {Array.from({ length: 13 }, (_, index) => (
          <line key={index} x1={34 + index * 45} y1="0" x2={34 + index * 45} y2={index % 2 === 0 ? 55 : 38} stroke="#92400e" strokeWidth="4" />
        ))}
        {[0, 1, 2].map((coin) => (
          <circle key={coin} cx={135 + coin * 132} cy="220" r="45" fill="#fde68a" stroke="#a16207" strokeWidth="5" />
        ))}
      </g>
      <g transform="translate(925 205)">
        <circle cx="145" cy="145" r="132" fill="#ffffff" stroke="#0369a1" strokeWidth="6" />
        {[0, 1, 2, 3].map((tick) => (
          <line key={tick} x1="145" y1="22" x2="145" y2="48" stroke="#0f172a" strokeWidth="5" transform={`rotate(${tick * 90} 145 145)`} />
        ))}
        <line x1="145" y1="145" x2="145" y2="72" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
        <line x1="145" y1="145" x2="205" y2="145" stroke="#f97316" strokeWidth="7" strokeLinecap="round" />
      </g>
      <StepTiles labels={["unit", "measure", "read"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function SpatialVectorTrigScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(205 190)">
        <path d="M80 320 L420 320 L420 110 Z" fill="#ecfeff" stroke="#0891b2" strokeWidth="7" />
        <path d="M420 320 L760 210" stroke="#7c3aed" strokeWidth="9" strokeLinecap="round" markerEnd="url(#arrow)" />
        <path d="M80 320 L760 210" stroke="#f97316" strokeWidth="7" strokeLinecap="round" strokeDasharray="14 12" />
        <path
          data-diagram-angle-arc
          data-math-angle-contract={serializeMathAngleContract(spatialVectorTrigAngle)}
          d={svgAngleArcPath(spatialVectorTrigAngle)}
          fill="none"
          stroke="#16a34a"
          strokeWidth="7"
        />
        <rect x="390" y="290" width="30" height="30" fill="#ffffff" stroke="#0891b2" strokeWidth="4" />
      </g>
      <defs>
        <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M2 2 L10 6 L2 10 Z" fill="#7c3aed" />
        </marker>
      </defs>
      <StepTiles labels={["direction", "angle", "result"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

function ModelingReviewScene({ focusText }: { focusText: string }) {
  return (
    <>
      <g transform="translate(205 215)">
        {["facts", "model", "compute", "check"].map((label, index) => (
          <g key={label} transform={`translate(${index * 270} 0)`}>
            <rect width="210" height="150" rx="28" fill={["#ecfeff", "#fff7ed", "#f5f3ff", "#f0fdf4"][index]} stroke={["#06b6d4", "#fb923c", "#8b5cf6", "#22c55e"][index]} strokeWidth="5" />
            <text x="105" y="88" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="900">
              {label}
            </text>
            {index < 3 ? (
              <path d="M222 75 L257 75" stroke="#64748b" strokeWidth="7" strokeLinecap="round" markerEnd="url(#flowArrow)" />
            ) : null}
          </g>
        ))}
      </g>
      <defs>
        <marker id="flowArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M2 2 L10 6 L2 10 Z" fill="#64748b" />
        </marker>
      </defs>
      <StepTiles labels={["read", "choose", "explain"]} />
      <FocusBadge focusText={focusText} />
    </>
  );
}

type ExactTokenShape = "apple" | "balloon" | "bird" | "circle" | "cracker" | "cube" | "fish" | "shell" | "square" | "sticker";

function ExactToken({
  fill,
  index,
  shape,
  stroke,
  x,
  y
}: {
  fill: string;
  index: number;
  shape: ExactTokenShape;
  stroke: string;
  x: number;
  y: number;
}) {
  if (shape === "square" || shape === "cube" || shape === "cracker" || shape === "sticker") {
    const size = shape === "cube" ? 48 : shape === "cracker" ? 44 : shape === "sticker" ? 42 : 46;
    return (
      <g data-worked-object={shape} data-worked-index={index + 1}>
        <rect x={x} y={y} width={size} height={size} rx={shape === "cracker" ? 8 : 10} fill={fill} stroke={stroke} strokeWidth="4" />
        {shape === "cracker" ? <circle cx={x + size / 2} cy={y + size / 2} r="4" fill="#b45309" /> : null}
        {shape === "sticker" ? <path d={`M ${x + 21} ${y + 6} L ${x + 27} ${y + 17} L ${x + 39} ${y + 19} L ${x + 30} ${y + 28} L ${x + 33} ${y + 40} L ${x + 21} ${y + 34} L ${x + 9} ${y + 40} L ${x + 12} ${y + 28} L ${x + 3} ${y + 19} L ${x + 15} ${y + 17} Z`} fill="#fde68a" stroke="#a16207" strokeWidth="2" /> : null}
      </g>
    );
  }

  if (shape === "apple") {
    return (
      <g data-worked-object="apple" data-worked-index={index + 1}>
        <circle cx={x + 22} cy={y + 28} r="23" fill={fill} stroke={stroke} strokeWidth="4" />
        <path d={`M ${x + 22} ${y + 6} C ${x + 34} ${y - 4}, ${x + 43} ${y + 2}, ${x + 38} ${y + 14}`} fill="#86efac" stroke="#15803d" strokeWidth="3" />
        <line x1={x + 22} y1={y + 10} x2={x + 22} y2={y + 2} stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  if (shape === "balloon") {
    return (
      <g data-worked-object="balloon" data-worked-index={index + 1}>
        <ellipse cx={x + 22} cy={y + 24} rx="22" ry="28" fill={fill} stroke={stroke} strokeWidth="4" />
        <path d={`M ${x + 22} ${y + 52} C ${x + 10} ${y + 76}, ${x + 34} ${y + 88}, ${x + 22} ${y + 112}`} fill="none" stroke="#64748b" strokeWidth="3" />
      </g>
    );
  }

  if (shape === "bird") {
    return (
      <g data-worked-object="bird" data-worked-index={index + 1}>
        <ellipse cx={x + 25} cy={y + 25} rx="25" ry="19" fill={fill} stroke={stroke} strokeWidth="4" />
        <circle cx={x + 48} cy={y + 16} r="13" fill={fill} stroke={stroke} strokeWidth="4" />
        <path d={`M ${x + 58} ${y + 15} L ${x + 76} ${y + 9} L ${x + 60} ${y + 24} Z`} fill="#fbbf24" stroke="#92400e" strokeWidth="3" />
        <path d={`M ${x + 17} ${y + 26} C ${x + 28} ${y + 8}, ${x + 43} ${y + 15}, ${x + 35} ${y + 35}`} fill="#bfdbfe" stroke="#2563eb" strokeWidth="3" />
      </g>
    );
  }

  if (shape === "fish") {
    return (
      <g data-worked-object="fish" data-worked-index={index + 1}>
        <ellipse cx={x + 28} cy={y + 22} rx="30" ry="18" fill={fill} stroke={stroke} strokeWidth="4" />
        <path d={`M ${x + 3} ${y + 22} L ${x - 20} ${y + 4} L ${x - 20} ${y + 40} Z`} fill={fill} stroke={stroke} strokeWidth="4" />
        <circle cx={x + 42} cy={y + 16} r="3.5" fill="#0f172a" />
      </g>
    );
  }

  if (shape === "shell") {
    return (
      <g data-worked-object="shell" data-worked-index={index + 1}>
        <path d={`M ${x} ${y + 42} C ${x + 4} ${y + 12}, ${x + 22} ${y - 2}, ${x + 42} ${y + 42} Z`} fill={fill} stroke={stroke} strokeWidth="4" />
        {[10, 21, 32].map((offset) => (
          <line key={offset} x1={x + 21} y1={y + 4} x2={x + offset} y2={y + 40} stroke={stroke} strokeWidth="2.5" />
        ))}
      </g>
    );
  }

  return (
    <circle data-worked-object={shape} data-worked-index={index + 1} cx={x + 23} cy={y + 23} r="23" fill={fill} stroke={stroke} strokeWidth="4" />
  );
}

function ExactTokenRow({
  count,
  crossedFrom,
  fill,
  label,
  shape,
  startX,
  startY,
  stroke = "#0f172a"
}: {
  count: number;
  crossedFrom?: number;
  fill: string;
  label: string;
  shape: ExactTokenShape;
  startX: number;
  startY: number;
  stroke?: string;
}) {
  const xGap = shape === "bird" || shape === "fish" ? 82 : 62;
  const yGap = shape === "balloon" ? 128 : 70;

  return (
    <g data-worked-row={label} data-worked-count={count}>
      {Array.from({ length: count }, (_, index) => {
        const x = startX + (index % 5) * xGap;
        const y = startY + Math.floor(index / 5) * yGap;
        const crossed = typeof crossedFrom === "number" && index >= crossedFrom;

        return (
          <g key={`${label}-${index}`}>
            <ExactToken fill={fill} index={index} shape={shape} stroke={stroke} x={x} y={y} />
            {crossed ? (
              <line
                data-worked-crossed-out="true"
                x1={x - 7}
                x2={x + 56}
                y1={y + 58}
                y2={y - 4}
                stroke="#ef4444"
                strokeLinecap="round"
                strokeWidth="7"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function ExactSceneTitle({ title }: { title: string }) {
  return (
    <g data-worked-exact-scene-title="true" transform="translate(125 120)">
      <rect width="560" height="76" rx="24" fill="#ecfeff" stroke="#06b6d4" strokeWidth="5" />
      <text x="280" y="49" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="31" fontWeight="900">
        {title}
      </text>
    </g>
  );
}

function ExactEquationCard({ equation, note }: { equation: string; note: string }) {
  return (
    <g transform="translate(980 250)">
      <rect width="360" height="175" rx="30" fill="#fff7ed" stroke="#fb923c" strokeWidth="5" />
      <text x="180" y="74" textAnchor="middle" fill="#7c2d12" fontFamily="Arial, sans-serif" fontSize="39" fontWeight="900">
        {equation}
      </text>
      <text x="180" y="124" textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="900">
        {note}
      </text>
    </g>
  );
}

function GradeOneExactScene({ metadata }: { metadata: WorkedExampleIllustrationMetadata }) {
  if (metadata.sceneId === "measurement-ribbon-string-difference") {
    return (
      <>
        <ExactSceneTitle title="Compare ribbon and string" />
        <g transform="translate(175 245)" data-worked-scene={metadata.sceneId}>
          <rect x="0" y="0" width="690" height="76" rx="20" fill="#fef3c7" stroke="#b45309" strokeWidth="5" />
          {Array.from({ length: 14 }, (_, index) => (
            <g key={index}>
              <line x1={30 + index * 48} x2={30 + index * 48} y1="0" y2={index % 2 === 0 ? 54 : 34} stroke="#92400e" strokeWidth="4" />
              <text x={30 + index * 48} y="104" textAnchor="middle" fill="#334155" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="800">{index}</text>
            </g>
          ))}
          <rect x="30" y="148" width="624" height="42" rx="18" fill="#ef4444" opacity="0.92" />
          <text x="670" y="178" fill="#7f1d1d" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="900">13 ribbon units</text>
          <rect x="30" y="240" width="384" height="26" rx="13" fill="#2563eb" opacity="0.9" />
          <text x="430" y="263" fill="#1e3a8a" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="900">8 string units</text>
          <path d="M414 292 C500 338, 574 338, 654 292" fill="none" stroke="#16a34a" strokeWidth="8" strokeLinecap="round" />
          <text x="535" y="360" textAnchor="middle" fill="#14532d" fontFamily="Arial, sans-serif" fontSize="31" fontWeight="900">5 units longer</text>
        </g>
        <ExactEquationCard equation="13 - 8 = 5" note="difference" />
        <StepTiles labels={["measure", "compare", "subtract"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "geometry-equal-share-rectangles") {
    return (
      <>
        <ExactSceneTitle title="Two equal rectangle shares" />
        <g transform="translate(220 250)" data-worked-scene={metadata.sceneId}>
          <rect x="0" y="0" width="300" height="210" rx="18" fill="#dbeafe" stroke="#facc15" strokeWidth="9" />
          <rect x="350" y="0" width="300" height="210" rx="18" fill="#bbf7d0" stroke="#facc15" strokeWidth="9" />
          <line x1="150" x2="150" y1="0" y2="210" stroke="#2563eb" strokeWidth="5" strokeDasharray="12 10" />
          <line x1="500" x2="500" y1="0" y2="210" stroke="#15803d" strokeWidth="5" strokeDasharray="12 10" />
          <text x="150" y="270" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="900">blue rectangle</text>
          <text x="500" y="270" textAnchor="middle" fill="#14532d" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="900">green rectangle</text>
        </g>
        <ExactEquationCard equation="2 equal parts" note="same shape" />
        <StepTiles labels={["draw", "split", "check"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "counters-red-blue-join") {
    return (
      <>
        <ExactSceneTitle title="Join red and blue counters" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={4} fill="#ef4444" label="red counters" shape="circle" startX={215} startY={285} stroke="#991b1b" />
          <ExactTokenRow count={3} fill="#3b82f6" label="blue counters" shape="circle" startX={215} startY={380} stroke="#1e3a8a" />
        </g>
        <ExactEquationCard equation="4 + 3 = 7" note="whole set" />
        <StepTiles labels={["red part", "blue part", "whole"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "birds-fence-tree-addition") {
    return (
      <>
        <ExactSceneTitle title="Birds on fence and tree" />
        <g data-worked-scene={metadata.sceneId}>
          <rect x="190" y="430" width="555" height="24" rx="12" fill="#92400e" />
          <rect x="760" y="260" width="42" height="235" rx="18" fill="#92400e" />
          <circle cx="780" cy="250" r="92" fill="#86efac" opacity="0.78" />
          <ExactTokenRow count={5} fill="#38bdf8" label="fence birds" shape="bird" startX={205} startY={350} stroke="#075985" />
          <ExactTokenRow count={2} fill="#fbbf24" label="tree birds" shape="bird" startX={705} startY={230} stroke="#92400e" />
        </g>
        <ExactEquationCard equation="5 + 2 = 7" note="birds total" />
        <StepTiles labels={["fence", "tree", "total"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "cube-train-green-yellow-join") {
    return (
      <>
        <ExactSceneTitle title="Cube train join model" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={6} fill="#22c55e" label="green cubes" shape="cube" startX={205} startY={318} stroke="#14532d" />
          <ExactTokenRow count={2} fill="#facc15" label="yellow cubes" shape="cube" startX={577} startY={318} stroke="#a16207" />
          <line x1="200" x2="748" y1="390" y2="390" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        </g>
        <ExactEquationCard equation="6 + 2 = 8" note="cube train" />
        <StepTiles labels={["green", "yellow", "join"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "apple-basket-join") {
    return (
      <>
        <ExactSceneTitle title="Apples in the basket" />
        <g data-worked-scene={metadata.sceneId}>
          <path d="M230 438 L780 438 L710 585 L300 585 Z" fill="#fed7aa" stroke="#c2410c" strokeWidth="7" />
          <path d="M330 438 C385 330, 625 330, 680 438" fill="none" stroke="#c2410c" strokeWidth="10" strokeLinecap="round" />
          <ExactTokenRow count={4} fill="#ef4444" label="basket apples" shape="apple" startX={295} startY={365} stroke="#991b1b" />
          <ExactTokenRow count={5} fill="#f97316" label="more apples" shape="apple" startX={255} startY={245} stroke="#9a3412" />
        </g>
        <ExactEquationCard equation="4 + 5 = 9" note="apples total" />
        <StepTiles labels={["basket", "more", "total"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "fish-equation-match-join") {
    return (
      <>
        <ExactSceneTitle title="Match the fish story" />
        <g data-worked-scene={metadata.sceneId}>
          <rect x="170" y="240" width="700" height="330" rx="36" fill="#cffafe" stroke="#0891b2" strokeWidth="7" />
          <path d="M190 330 C320 290, 470 370, 610 330 C710 300, 785 320, 850 290" fill="none" stroke="#67e8f9" strokeWidth="8" opacity="0.75" />
          <ExactTokenRow count={2} fill="#fb923c" label="orange fish" shape="fish" startX={265} startY={300} stroke="#9a3412" />
          <ExactTokenRow count={6} fill="#cbd5e1" label="silver fish" shape="fish" startX={250} startY={395} stroke="#475569" />
        </g>
        <ExactEquationCard equation="2 + 6 = 8" note="matching equation" />
        <StepTiles labels={["orange", "silver", "match"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "balloon-take-away") {
    return (
      <>
        <ExactSceneTitle title="Take away balloons" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={9} crossedFrom={5} fill="#a78bfa" label="balloons" shape="balloon" startX={215} startY={225} stroke="#6d28d9" />
        </g>
        <ExactEquationCard equation="9 - 4 = 5" note="5 left" />
        <StepTiles labels={["start", "take away", "left"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "crackers-subtraction-equation") {
    return (
      <>
        <ExactSceneTitle title="Crackers subtraction" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={8} crossedFrom={5} fill="#fcd34d" label="crackers" shape="cracker" startX={205} startY={305} stroke="#b45309" />
        </g>
        <ExactEquationCard equation="8 - 3 = 5" note="crackers left" />
        <StepTiles labels={["8 crackers", "remove 3", "5 left"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "cube-train-cover-take-away") {
    return (
      <>
        <ExactSceneTitle title="Cover cubes in the train" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={10} fill="#38bdf8" label="cube train" shape="cube" startX={190} startY={325} stroke="#075985" />
          <rect x="185" y="314" width="368" height="78" rx="18" fill="#334155" opacity="0.76" />
          <text x="369" y="362" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="29" fontWeight="900">6 covered</text>
        </g>
        <ExactEquationCard equation="10 - 6 = 4" note="cubes left" />
        <StepTiles labels={["10 cubes", "cover 6", "4 left"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "sticker-take-away") {
    return (
      <>
        <ExactSceneTitle title="Sticker take-away story" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={7} crossedFrom={5} fill="#fde68a" label="stickers" shape="sticker" startX={215} startY={315} stroke="#a16207" />
        </g>
        <ExactEquationCard equation="7 - 2 = 5" note="stickers left" />
        <StepTiles labels={["7 stickers", "remove 2", "5 left"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "counter-cross-out-take-away") {
    return (
      <>
        <ExactSceneTitle title="Cross out counters" />
        <g data-worked-scene={metadata.sceneId}>
          <ExactTokenRow count={9} crossedFrom={4} fill="#22c55e" label="counters" shape="circle" startX={215} startY={305} stroke="#14532d" />
        </g>
        <ExactEquationCard equation="9 - 5 = 4" note="counters left" />
        <StepTiles labels={["9 counters", "cross 5", "4 left"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  if (metadata.sceneId === "shells-break-apart-subtraction") {
    return (
      <>
        <ExactSceneTitle title="Break apart shells" />
        <g data-worked-scene={metadata.sceneId}>
          <rect x="190" y="288" width="330" height="170" rx="28" fill="#eff6ff" stroke="#2563eb" strokeWidth="7" />
          <text x="355" y="486" textAnchor="middle" fill="#1e3a8a" fontFamily="Arial, sans-serif" fontSize="27" fontWeight="900">4 in the box</text>
          <ExactTokenRow count={4} fill="#f9a8d4" label="boxed shells" shape="shell" startX={230} startY={335} stroke="#9d174d" />
          <ExactTokenRow count={6} fill="#fef3c7" label="outside shells" shape="shell" startX={580} startY={320} stroke="#b45309" />
        </g>
        <ExactEquationCard equation="10 = 4 + 6" note="break apart" />
        <StepTiles labels={["whole", "in box", "outside"]} />
        <FocusBadge focusText={metadata.focusText} />
      </>
    );
  }

  return null;
}

function IllustrationScene({ metadata }: { metadata: WorkedExampleIllustrationMetadata }) {
  if (metadata.sceneId !== "generic") {
    return <GradeOneExactScene metadata={metadata} />;
  }

  const scenes: Record<WorkedExampleVisualKind, ReactElement> = {
    algebra: <AlgebraScene focusText={metadata.focusText} />,
    "coordinate-function": <CoordinateFunctionScene focusText={metadata.focusText} />,
    counting: <CountingScene focusText={metadata.focusText} />,
    "data-probability": <DataProbabilityScene focusText={metadata.focusText} />,
    fraction: <FractionScene focusText={metadata.focusText} />,
    geometry: <GeometryScene focusText={metadata.focusText} />,
    "measurement-money-time": <MeasurementMoneyTimeScene focusText={metadata.focusText} />,
    "modeling-review": <ModelingReviewScene focusText={metadata.focusText} />,
    "place-value": <PlaceValueScene focusText={metadata.focusText} />,
    "ratio-rate-percent": <RatioRatePercentScene focusText={metadata.focusText} />,
    "spatial-vector-trig": <SpatialVectorTrigScene focusText={metadata.focusText} />
  };

  return scenes[metadata.kind];
}

export function WorkedExampleIllustration({
  className,
  content,
  grade,
  publisher,
  title,
  topicId
}: WorkedExampleIllustrationProps) {
  const metadata = buildWorkedExampleIllustrationMetadata({ content, grade, publisher, title, topicId });
  const titleId = svgTitleId(metadata);

  return (
    <figure
      className={className ? `${shellClassName} ${className}` : shellClassName}
      data-age-band={metadata.ageBand}
      data-qa-status={metadata.qa.status}
      data-testid="generated-worked-example-illustration"
      data-visual-kind={metadata.kind}
    >
      <svg
        aria-labelledby={titleId}
        role="img"
        viewBox="0 0 1600 900"
        className="h-auto max-h-72 w-full object-contain sm:max-h-80 lg:max-h-[26rem]"
      >
        <title id={titleId}>{metadata.alt}</title>
        <rect width="1600" height="900" rx="0" fill="#f8fafc" />
        <rect x="72" y="66" width="1456" height="768" rx="42" fill="#ffffff" stroke="#cffafe" strokeWidth="8" />
        <path d="M90 648 C250 592 416 672 590 620 C810 554 996 636 1194 590 C1320 560 1436 592 1510 630 L1510 834 L90 834 Z" fill="#ecfeff" />
        {metadata.sceneId === "generic" ? (
          <g data-worked-generic-scene-title="true">
            <text x="150" y="130" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="900">
              Worked example visual
            </text>
            <text x="150" y="172" fill="#475569" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800">
              {metadata.kind.replace(/-/g, " ")} - {metadata.ageBand.replace(/-/g, " ")}
            </text>
          </g>
        ) : null}
        <IllustrationScene metadata={metadata} />
      </svg>
      <figcaption className={captionClassName}>
        {metadata.caption}
      </figcaption>
    </figure>
  );
}
