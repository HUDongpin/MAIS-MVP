import type { ReactNode } from "react";
import type { VisualizationTemplateId } from "@/components/visualizations/visualizationTemplateIds";

// Sticker-style logo art for Visualization Lab tiles. Every glyph string the
// catalog can produce (template map, kindergarten map, fallback list) must own
// one entry in labLogoArtByGlyph; labLogoArt.test.ts enforces that invariant.

export const templateLogoGlyphs: Partial<Record<VisualizationTemplateId, string>> = {
  "number-line": "123",
  "base-ten": "10+",
  "array-area": "NxM",
  "fraction-bar": "1/2",
  "clock-money-data": "data",
  "measurement-scale": "cm",
  "angle-geometry": "shape",
  "right-triangle-pythagorean": "a2+b2",
  "coordinate-transform": "xy",
  "equation-balance": "A=B",
  "function-graph": "f(x)",
  "function-family": "f(x)",
  "complex-plane": "a+bi",
  "trig-unit-wave": "sin",
  "probability-simulation": "p",
  "statistics-distribution": "data",
  "calculus-rate-area": "dy/dx",
  "vector-conic-3d/strategy-map": "3D"
};

export const kindergartenCaliforniaLogoGlyphs: Record<string, string> = {
  "us-ca-math-k-k-cc-count-sequence": "123",
  "us-ca-math-k-k-cc-cardinality-compare": "3>2",
  "us-ca-math-k-k-oa-compose-decompose": "2+3",
  "us-ca-math-k-k-nbt-teen-numbers": "10+",
  "us-ca-math-k-k-md-attributes-data": "sort",
  "us-ca-math-k-k-g-shapes-position": "shape"
};

export const fallbackLogoGlyphs = ["123", "10+", "A=B", "xy", "f(x)", "p", "cm", "3D"] as const;

const ink = "#1e293b";
const rose = "#fb7185";
const red = "#f43f5e";
const amber = "#fbbf24";
const yellow = "#fde047";
const emerald = "#34d399";
const sky = "#38bdf8";
const skyDeep = "#0ea5e9";
const violet = "#a78bfa";
const slateLight = "#cbd5e1";

function LogoSparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -4.6 L1.3 -1.3 L4.6 0 L1.3 1.3 L0 4.6 L-1.3 1.3 L-4.6 0 L-1.3 -1.3 Z"
      fill={yellow}
      stroke={ink}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  );
}

function LogoCanvas({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const countingBlocksArt = (
  <LogoCanvas>
    <g stroke={ink} strokeWidth={2.3} strokeLinejoin="round">
      <g transform="rotate(-8 13 30)">
        <rect x="5" y="22" width="16" height="16" rx="4.5" fill={rose} />
        <text x="13" y="30.8" fill="#fff" fontSize="10.5" fontWeight={800} textAnchor="middle" dominantBaseline="middle" stroke="none">1</text>
      </g>
      <g transform="rotate(9 35 32)">
        <rect x="27" y="24" width="16" height="16" rx="4.5" fill={amber} />
        <text x="35" y="32.8" fill="#fff" fontSize="10.5" fontWeight={800} textAnchor="middle" dominantBaseline="middle" stroke="none">3</text>
      </g>
      <g transform="rotate(3 24 18)">
        <rect x="16" y="10" width="16" height="16" rx="4.5" fill={sky} />
        <text x="24" y="18.8" fill="#fff" fontSize="10.5" fontWeight={800} textAnchor="middle" dominantBaseline="middle" stroke="none">2</text>
      </g>
    </g>
    <LogoSparkle x={42.4} y={9} s={0.9} />
  </LogoCanvas>
);

const baseTenArt = (
  <LogoCanvas>
    <rect x="8" y="7" width="11" height="35" rx="3.5" fill={emerald} stroke={ink} strokeWidth={2.3} />
    <path d="M8 14 h11 M8 21 h11 M8 28 h11 M8 35 h11" stroke={ink} strokeWidth={1.7} strokeLinecap="round" />
    <rect x="26" y="29" width="12" height="12" rx="3.2" fill={amber} stroke={ink} strokeWidth={2.3} />
    <circle cx="32" cy="14" r="7.4" fill={red} stroke={ink} strokeWidth={2.3} />
    <path d="M32 10.4 v7.2 M28.4 14 h7.2" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
  </LogoCanvas>
);

const dotArrayArt = (
  <LogoCanvas>
    <rect x="7" y="7" width="34" height="34" rx="9" fill="#fff" stroke={ink} strokeWidth={2.4} />
    <g stroke={ink} strokeWidth={1.6}>
      <circle cx="15.5" cy="15.5" r="3.4" fill={rose} />
      <circle cx="24" cy="15.5" r="3.4" fill={amber} />
      <circle cx="32.5" cy="15.5" r="3.4" fill={sky} />
      <circle cx="15.5" cy="24" r="3.4" fill={sky} />
      <circle cx="24" cy="24" r="3.4" fill={emerald} />
      <circle cx="32.5" cy="24" r="3.4" fill={rose} />
      <circle cx="15.5" cy="32.5" r="3.4" fill={amber} />
      <circle cx="24" cy="32.5" r="3.4" fill={rose} />
      <circle cx="32.5" cy="32.5" r="3.4" fill={violet} />
    </g>
  </LogoCanvas>
);

const fractionPieArt = (
  <LogoCanvas>
    <circle cx="21" cy="27" r="14" fill={yellow} stroke={ink} strokeWidth={2.4} />
    <path d="M21 27 L21 13 A14 14 0 0 1 34.5 23.4 Z" fill="#fff" stroke={ink} strokeWidth={2} />
    <path d="M28 19 L28 5 A14 14 0 0 1 41.5 15.4 Z" fill={rose} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
    <LogoSparkle x={9.5} y={9.5} s={0.85} />
  </LogoCanvas>
);

const dataBarsArt = (
  <LogoCanvas>
    <rect x="10" y="27" width="7.4" height="13" rx="2.4" fill={sky} stroke={ink} strokeWidth={2.1} />
    <rect x="20.4" y="20" width="7.4" height="20" rx="2.4" fill={amber} stroke={ink} strokeWidth={2.1} />
    <rect x="30.8" y="12" width="7.4" height="28" rx="2.4" fill={emerald} stroke={ink} strokeWidth={2.1} />
    <path d="M7 40 H41.5" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
    <path d="M11 21 L22 13.5 L28 16.5 L37 7.5" stroke={red} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31.6 7 L37 7.5 L36.4 12.9" stroke={red} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />
  </LogoCanvas>
);

const rulerMeasureArt = (
  <LogoCanvas>
    <g transform="rotate(-10 24 27)">
      <rect x="4.5" y="20.5" width="39" height="13.5" rx="3.6" fill={amber} stroke={ink} strokeWidth={2.3} />
      <path d="M11 20.5 v5.4 M17.5 20.5 v7.8 M24 20.5 v5.4 M30.5 20.5 v7.8 M37 20.5 v5.4" stroke={ink} strokeWidth={1.9} strokeLinecap="round" />
    </g>
    <path d="M12 41.5 H31" stroke={red} strokeWidth={2.8} strokeLinecap="round" />
    <circle cx="12" cy="41.5" r="2.1" fill={red} />
    <circle cx="31" cy="41.5" r="2.1" fill={red} />
    <LogoSparkle x={41.5} y={9} s={0.9} />
  </LogoCanvas>
);

const shapeTrioArt = (
  <LogoCanvas>
    <rect x="6.5" y="21" width="16.5" height="16.5" rx="3.6" fill={amber} stroke={ink} strokeWidth={2.3} transform="rotate(-8 14.75 29.25)" />
    <circle cx="32.5" cy="29.5" r="10" fill={sky} stroke={ink} strokeWidth={2.3} />
    <path d="M24 5.5 L33.5 21.5 L14.5 21.5 Z" fill={rose} stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
    <LogoSparkle x={42.5} y={11} s={0.9} />
  </LogoCanvas>
);

const pythagorasArt = (
  <LogoCanvas>
    <rect x="10.5" y="34" width="10" height="10" rx="2.4" fill={amber} stroke={ink} strokeWidth={2.1} />
    <rect x="34" y="21.5" width="10" height="10" rx="2.4" fill={sky} stroke={ink} strokeWidth={2.1} />
    <path d="M10 32 L32 32 L32 10 Z" fill={violet} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
    <path d="M27.5 32 V27.5 H32" stroke={ink} strokeWidth={1.8} fill="none" />
    <LogoSparkle x={12} y={11} s={0.9} />
  </LogoCanvas>
);

const coordinateStarArt = (
  <LogoCanvas>
    <path d="M9 5.5 V39 H43" stroke={ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 5.5 l-3.2 4.8 M9 5.5 l3.2 4.8 M43 39 l-4.8 -3.2 M43 39 l-4.8 3.2" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
    <path d="M9 16.5 H29 M29 39 V16.5" stroke={slateLight} strokeWidth={1.9} strokeDasharray="3 3.6" />
    <path d="M29 9.4 L31 13.9 L36 14.5 L32.4 17.9 L33.3 22.8 L29 20.4 L24.7 22.8 L25.6 17.9 L22 14.5 L27 13.9 Z" fill={amber} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
  </LogoCanvas>
);

const balanceScaleArt = (
  <LogoCanvas>
    <path d="M24 9 V37" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
    <path d="M14.5 41 H33.5" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
    <path d="M8.5 13.5 H39.5" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
    <path d="M8.5 13.5 V19 M39.5 13.5 V19" stroke={ink} strokeWidth={2} strokeLinecap="round" />
    <circle cx="8.5" cy="25" r="6" fill={rose} stroke={ink} strokeWidth={2.2} />
    <circle cx="39.5" cy="25" r="6" fill={sky} stroke={ink} strokeWidth={2.2} />
    <circle cx="24" cy="26" r="6.4" fill={yellow} stroke={ink} strokeWidth={2.2} />
    <path d="M21.2 24.2 h5.6 M21.2 27.8 h5.6" stroke={ink} strokeWidth={2} strokeLinecap="round" />
  </LogoCanvas>
);

const functionCurveArt = (
  <LogoCanvas>
    <path d="M8.5 6 V39.5 H42" stroke={slateLight} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 35.5 C 19 9 27 43 38.5 13.5" stroke={red} strokeWidth={3.5} strokeLinecap="round" />
    <circle cx="38.5" cy="13.5" r="3.5" fill={amber} stroke={ink} strokeWidth={2} />
    <LogoSparkle x={17} y={13} s={0.85} />
  </LogoCanvas>
);

const complexSpiralArt = (
  <LogoCanvas>
    <path d="M24 6.5 V41.5 M6.5 24 H41.5" stroke={slateLight} strokeWidth={2.1} strokeLinecap="round" />
    <path d="M24.5 24.5 c3.4 -0.6 4.6 3.4 1.6 5 c-4.6 2.4 -9.4 -2.4 -7.4 -7 c2.6 -6 11 -6.6 14.8 -1.6 c4.2 5.4 1.6 13.6 -4.8 16.4" stroke={violet} strokeWidth={3.2} strokeLinecap="round" fill="none" />
    <circle cx="28.7" cy="37.3" r="3.1" fill={amber} stroke={ink} strokeWidth={1.9} />
    <LogoSparkle x={39} y={9.5} s={0.9} />
  </LogoCanvas>
);

const sineWaveArt = (
  <LogoCanvas>
    <path d="M4.5 24 H43.5" stroke={slateLight} strokeWidth={2} strokeDasharray="3 3.8" strokeLinecap="round" />
    <path d="M4.5 24 Q 11.5 5.5 18.5 24 T 32.5 24 Q 36 33.2 39.5 28.4" stroke={skyDeep} strokeWidth={3.4} strokeLinecap="round" fill="none" />
    <circle cx="11.5" cy="14.6" r="2.9" fill={amber} stroke={ink} strokeWidth={1.8} />
    <circle cx="25.5" cy="33.4" r="2.9" fill={rose} stroke={ink} strokeWidth={1.8} />
    <LogoSparkle x={41} y={11} s={0.9} />
  </LogoCanvas>
);

const probabilityDieArt = (
  <LogoCanvas>
    <g transform="rotate(-8 24 24)">
      <rect x="10" y="10" width="28" height="28" rx="7.5" fill="#fff" stroke={ink} strokeWidth={2.5} />
      <circle cx="17.4" cy="17.4" r="2.7" fill={red} />
      <circle cx="30.6" cy="17.4" r="2.7" fill={red} />
      <circle cx="24" cy="24" r="2.7" fill={red} />
      <circle cx="17.4" cy="30.6" r="2.7" fill={red} />
      <circle cx="30.6" cy="30.6" r="2.7" fill={red} />
    </g>
    <LogoSparkle x={42} y={10.5} s={0.95} />
  </LogoCanvas>
);

const calculusAreaArt = (
  <LogoCanvas>
    <path d="M9 33.5 C 18 29.5 24 14.5 39.5 12.5 V39 H9 Z" fill={emerald} opacity={0.4} />
    <path d="M9 33.5 C 18 29.5 24 14.5 39.5 12.5" stroke="#10b981" strokeWidth={3.3} strokeLinecap="round" fill="none" />
    <path d="M8.5 6 V39.5 H42" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31 17.5 V39" stroke={amber} strokeWidth={2.2} strokeDasharray="3 3.4" strokeLinecap="round" />
    <LogoSparkle x={15} y={12} s={0.85} />
  </LogoCanvas>
);

const isoCubeArt = (
  <LogoCanvas>
    <path d="M24 7 L39 14.8 L24 22.6 L9 14.8 Z" fill="#7dd3fc" stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
    <path d="M9 14.8 L24 22.6 V39.5 L9 31.7 Z" fill={sky} stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
    <path d="M39 14.8 L24 22.6 V39.5 L39 31.7 Z" fill="#0284c7" stroke={ink} strokeWidth={2.3} strokeLinejoin="round" />
    <LogoSparkle x={42.4} y={8.6} s={0.9} />
  </LogoCanvas>
);

const compareStacksArt = (
  <LogoCanvas>
    <g stroke={ink} strokeWidth={2}>
      <circle cx="11" cy="14" r="4.6" fill={rose} />
      <circle cx="11" cy="24" r="4.6" fill={rose} />
      <circle cx="11" cy="34" r="4.6" fill={rose} />
      <circle cx="37" cy="19" r="4.6" fill={sky} />
      <circle cx="37" cy="29" r="4.6" fill={sky} />
    </g>
    <path d="M20.5 15 L29 24 L20.5 33" stroke={amber} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
  </LogoCanvas>
);

const composeGroupsArt = (
  <LogoCanvas>
    <rect x="4.5" y="13.5" width="39" height="21" rx="10.5" fill="#fff" stroke={ink} strokeWidth={2.3} />
    <g stroke={ink} strokeWidth={1.8}>
      <circle cx="11.5" cy="24" r="3.3" fill={rose} />
      <circle cx="18.5" cy="24" r="3.3" fill={rose} />
      <circle cx="30" cy="19.8" r="3.3" fill={sky} />
      <circle cx="37" cy="24" r="3.3" fill={sky} />
      <circle cx="30" cy="28.2" r="3.3" fill={sky} />
    </g>
    <circle cx="24" cy="24" r="4.6" fill={yellow} stroke={ink} strokeWidth={1.8} />
    <path d="M24 21.6 v4.8 M21.6 24 h4.8" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
    <LogoSparkle x={41} y={9} s={0.85} />
  </LogoCanvas>
);

const sortBinsArt = (
  <LogoCanvas>
    <g stroke={ink} strokeWidth={2.1}>
      <rect x="5.5" y="28.5" width="10.5" height="13" rx="3" fill="#e2e8f0" />
      <rect x="18.75" y="28.5" width="10.5" height="13" rx="3" fill="#e2e8f0" />
      <rect x="32" y="28.5" width="10.5" height="13" rx="3" fill="#e2e8f0" />
    </g>
    <path d="M10.75 21.5 v4 M24 21.5 v4 M37.25 21.5 v4" stroke={slateLight} strokeWidth={1.9} strokeDasharray="2.4 2.6" strokeLinecap="round" />
    <circle cx="10.75" cy="13.5" r="4.7" fill={rose} stroke={ink} strokeWidth={2.1} />
    <path d="M24 8.4 L28.6 16.6 H19.4 Z" fill={amber} stroke={ink} strokeWidth={2.1} strokeLinejoin="round" />
    <rect x="32.7" y="9" width="9.2" height="9.2" rx="2.4" fill={sky} stroke={ink} strokeWidth={2.1} transform="rotate(9 37.3 13.6)" />
  </LogoCanvas>
);

export const labLogoArtByGlyph: Record<string, ReactNode> = {
  "123": countingBlocksArt,
  "10+": baseTenArt,
  "NxM": dotArrayArt,
  "1/2": fractionPieArt,
  "data": dataBarsArt,
  "cm": rulerMeasureArt,
  "shape": shapeTrioArt,
  "a2+b2": pythagorasArt,
  "xy": coordinateStarArt,
  "A=B": balanceScaleArt,
  "f(x)": functionCurveArt,
  "a+bi": complexSpiralArt,
  "sin": sineWaveArt,
  "p": probabilityDieArt,
  "dy/dx": calculusAreaArt,
  "3D": isoCubeArt,
  "3>2": compareStacksArt,
  "2+3": composeGroupsArt,
  "sort": sortBinsArt
};
