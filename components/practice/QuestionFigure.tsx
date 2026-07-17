import { textForLanguage } from "@/lib/i18n";
import {
  buildCoordinateGridLayout,
  buildNumberLineLayout,
  buildPlaneFigureLayout,
  buildSolidFigureLayout,
  questionDiagramAltText,
  type FigureLabel,
  type FigureTextResolver
} from "@/lib/questionFigure";
import { cn } from "@/lib/utils";
import type {
  CoordinateGridQuestionDiagram,
  Language,
  NumberLineQuestionDiagram,
  PlaneFigureQuestionDiagram,
  QuestionDiagram,
  SolidFigureQuestionDiagram
} from "@/types";

export type QuestionFigureVariant = "default" | "day";

type FigureTheme = {
  isDay: boolean;
  mainStroke: string;
  accentStroke: string;
  thinStroke: string;
  plotFillClassName: string;
  shadedFillClassName: string;
  markerClassName: string;
  axisPointMarkerClassName: string;
  centerDotClassName: string;
  pointLabelClassName: string;
  measureLabelClassName: string;
  tickLabelClassName: string;
  axisLabelClassName: string;
};

function figureTheme(variant: QuestionFigureVariant): FigureTheme {
  const isDay = variant === "day";
  return {
    isDay,
    mainStroke: isDay ? "#475569" : "rgb(71 85 105)",
    accentStroke: isDay ? "#0891b2" : "rgb(8 145 178)",
    thinStroke: isDay ? "#64748b" : "rgb(100 116 139)",
    plotFillClassName: isDay ? "fill-white" : "fill-white dark:fill-slate-900",
    shadedFillClassName: isDay ? "fill-cyan-100/80" : "fill-cyan-500/15 dark:fill-cyan-300/20",
    markerClassName: isDay ? "fill-cyan-400 stroke-white stroke-[1.5]" : "fill-violet-600 dark:fill-violet-300",
    axisPointMarkerClassName: isDay ? "fill-pink-500 stroke-white stroke-[1.5]" : "fill-violet-600 dark:fill-violet-300",
    centerDotClassName: isDay ? "fill-slate-700" : "fill-slate-700 dark:fill-slate-100",
    pointLabelClassName: isDay ? "fill-cyan-700 text-[11px] font-black" : "fill-slate-900 text-[13px] font-bold dark:fill-white",
    measureLabelClassName: isDay ? "fill-slate-700 text-[11px] font-black" : "fill-slate-700 text-[11px] font-bold dark:fill-slate-200",
    tickLabelClassName: isDay ? "fill-slate-500 text-[9px]" : "fill-slate-500 text-[10px] dark:fill-slate-300",
    axisLabelClassName: isDay ? "fill-slate-900 text-[11px] font-black" : "fill-slate-500 text-[11px] font-bold dark:fill-slate-300"
  };
}

function figureShellClassName(variant: QuestionFigureVariant, compact: boolean) {
  if (variant === "day") {
    return cn(
      "mx-auto w-full overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-sm dark:border-slate-200/90 dark:bg-white",
      compact ? "mt-4 max-w-[34rem] p-2 sm:max-w-[36rem] sm:p-3" : "mt-5 max-w-[46rem] p-3"
    );
  }
  return "mx-auto mt-5 w-full max-w-[46rem] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/55";
}

function FigureLabels({ labels, theme }: { labels: FigureLabel[]; theme: FigureTheme }) {
  return (
    <>
      {labels.map((label) => (
        <text
          key={label.key}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="central"
          className={label.variant === "point" ? theme.pointLabelClassName : theme.measureLabelClassName}
        >
          {label.text}
        </text>
      ))}
    </>
  );
}

function CoordinateGridFigure({
  diagram,
  theme
}: {
  diagram: CoordinateGridQuestionDiagram;
  theme: FigureTheme;
}) {
  const layout = buildCoordinateGridLayout(diagram);
  const { plot, xTicks, yTicks, xFor, yFor } = layout;
  const isDay = theme.isDay;
  const gridColor = isDay ? "#d8e0ea" : "rgb(203 213 225)";
  const gridOpacity = isDay ? 1 : 0.65;
  const gridStrokeWidth = isDay ? 0.8 : 1;
  const axisStrokeWidth = isDay ? 1.3 : 2;
  const graphStrokeWidth = isDay ? 3.4 : 4;

  return (
    <svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
      <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} rx={isDay ? 0 : 8} className={theme.plotFillClassName} />
      {xTicks.map((tick) => (
        <line key={`x-${tick}`} x1={xFor(tick)} x2={xFor(tick)} y1={plot.top} y2={plot.top + plot.height} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity={gridOpacity} />
      ))}
      {yTicks.map((tick) => (
        <line key={`y-${tick}`} x1={plot.left} x2={plot.left + plot.width} y1={yFor(tick)} y2={yFor(tick)} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity={gridOpacity} />
      ))}
      {layout.showYAxis ? (
        <line x1={xFor(0)} x2={xFor(0)} y1={plot.top} y2={plot.top + plot.height} stroke={theme.mainStroke} strokeWidth={axisStrokeWidth} />
      ) : null}
      {layout.showXAxis ? (
        <line x1={plot.left} x2={plot.left + plot.width} y1={yFor(0)} y2={yFor(0)} stroke={theme.mainStroke} strokeWidth={axisStrokeWidth} />
      ) : null}
      {layout.renderedLines.map(({ line, lineKey, quadraticPath, pointsAttr, showValueMarkers }) => {
        const lineStyle = {
          fill: "none",
          stroke: theme.accentStroke,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: graphStrokeWidth
        } as const;

        return quadraticPath ? (
          <path key={lineKey} d={quadraticPath} {...lineStyle} />
        ) : (
          <g key={lineKey}>
            <polyline points={pointsAttr} {...lineStyle} />
            {showValueMarkers ? line.points.map((point, pointIndex) => (
              <circle
                key={`${lineKey}-value-${pointIndex}`}
                cx={xFor(point.x)}
                cy={yFor(point.y)}
                r="3.6"
                className={isDay ? "fill-pink-500 stroke-white stroke-[1.5]" : "fill-cyan-600 stroke-white stroke-[1.5] dark:fill-cyan-400 dark:stroke-slate-950"}
              />
            )) : null}
          </g>
        );
      })}
      {layout.labeledPoints.map((point) => (
        <g key={point.label}>
          <circle
            cx={point.anchor.x}
            cy={point.anchor.y}
            r="5"
            className={isDay && point.onXAxis ? theme.axisPointMarkerClassName : theme.markerClassName}
          />
          <text
            x={point.placement.x}
            y={point.placement.y}
            textAnchor="middle"
            dominantBaseline="central"
            className={theme.pointLabelClassName}
          >
            {point.label}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text key={`x-label-${tick}`} x={xFor(tick)} y={plot.top + plot.height + 16} textAnchor="middle" className={theme.tickLabelClassName}>
          {tick}
        </text>
      ))}
      {yTicks.map((tick) => (
        <text key={`y-label-${tick}`} x={plot.left - 10} y={yFor(tick) + 4} textAnchor="end" className={theme.tickLabelClassName}>
          {tick}
        </text>
      ))}
      <text x={plot.left + plot.width + 14} y={yFor(0) + 4} className={theme.axisLabelClassName}>
        x
      </text>
      <text x={theme.isDay ? xFor(0) : xFor(0) - 4} y={plot.top - 7} textAnchor={theme.isDay ? "middle" : "end"} className={theme.axisLabelClassName}>
        y
      </text>
    </svg>
  );
}

function PlaneFigureView({
  diagram,
  theme,
  textFor
}: {
  diagram: PlaneFigureQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
}) {
  const layout = buildPlaneFigureLayout(diagram, textFor);

  return (
    <svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
      <rect x={0} y={0} width={layout.viewBox.width} height={layout.viewBox.height} rx={theme.isDay ? 0 : 8} className={theme.plotFillClassName} />
      {layout.polygons.map((polygon) => (
        <polygon
          key={polygon.key}
          points={polygon.pointsAttr}
          className={polygon.shaded ? theme.shadedFillClassName : "fill-none"}
          stroke={theme.mainStroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      {layout.circles.map((circle) => (
        <circle key={circle.key} cx={circle.cx} cy={circle.cy} r={circle.r} fill="none" stroke={theme.mainStroke} strokeWidth={2} />
      ))}
      {layout.segments.map((segment) => (
        <line
          key={segment.key}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          stroke={theme.mainStroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={segment.dashed ? "5 4" : undefined}
        />
      ))}
      {layout.decorationStrokes.map((stroke) => (
        <line key={stroke.key} x1={stroke.x1} y1={stroke.y1} x2={stroke.x2} y2={stroke.y2} stroke={theme.accentStroke} strokeWidth={1.6} strokeLinecap="round" />
      ))}
      {layout.anglePaths.map((arc) => (
        <path key={arc.key} d={arc.d} fill="none" stroke={theme.accentStroke} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      {layout.centerDots.map((dot) => (
        <circle key={dot.key} cx={dot.x} cy={dot.y} r={2.2} className={theme.centerDotClassName} />
      ))}
      {layout.markers.map((marker) => (
        <circle key={marker.key} cx={marker.x} cy={marker.y} r={3.4} className={theme.markerClassName} />
      ))}
      <FigureLabels labels={layout.labels} theme={theme} />
    </svg>
  );
}

function NumberLineView({
  diagram,
  theme,
  textFor
}: {
  diagram: NumberLineQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
}) {
  const layout = buildNumberLineLayout(diagram, textFor);

  return (
    <svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
      <rect x={0} y={0} width={layout.viewBox.width} height={layout.viewBox.height} rx={theme.isDay ? 0 : 8} className={theme.plotFillClassName} />
      <line x1={layout.axis.x1} y1={layout.axis.y} x2={layout.axis.x2} y2={layout.axis.y} stroke={theme.mainStroke} strokeWidth={2} />
      {layout.arrowPaths.map((path, index) => (
        <path key={`arrow-${index}`} d={path} fill="none" stroke={theme.mainStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {layout.ticks.map((tick) => (
        <g key={tick.key}>
          <line x1={tick.x} y1={tick.y1} x2={tick.x} y2={tick.y2} stroke={theme.mainStroke} strokeWidth={1.4} />
          {tick.labelText ? (
            <text x={tick.x} y={tick.labelY} textAnchor="middle" className={theme.tickLabelClassName}>
              {tick.labelText}
            </text>
          ) : null}
        </g>
      ))}
      {layout.highlights.map((highlight) => (
        <line key={highlight.key} x1={highlight.x1} y1={highlight.y} x2={highlight.x2} y2={highlight.y} stroke={theme.accentStroke} strokeWidth={3.2} strokeLinecap="round" />
      ))}
      {layout.highlightCaps.map((cap) => (
        <line key={cap.key} x1={cap.x} y1={cap.y1} x2={cap.x} y2={cap.y2} stroke={theme.accentStroke} strokeWidth={2} strokeLinecap="round" />
      ))}
      {layout.points.map((point) => (
        <circle
          key={point.key}
          cx={point.x}
          cy={point.y}
          r={4.6}
          className={point.marker === "open" ? cn(theme.plotFillClassName) : theme.markerClassName}
          stroke={point.marker === "open" ? theme.accentStroke : undefined}
          strokeWidth={point.marker === "open" ? 2 : undefined}
        />
      ))}
      <FigureLabels labels={layout.labels} theme={theme} />
    </svg>
  );
}

function SolidFigureView({
  diagram,
  theme,
  textFor
}: {
  diagram: SolidFigureQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
}) {
  const layout = buildSolidFigureLayout(diagram, textFor);

  return (
    <svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
      <rect x={0} y={0} width={layout.viewBox.width} height={layout.viewBox.height} rx={theme.isDay ? 0 : 8} className={theme.plotFillClassName} />
      {layout.circles.map((circle) => (
        <circle key={circle.key} cx={circle.cx} cy={circle.cy} r={circle.r} fill="none" stroke={theme.mainStroke} strokeWidth={2} />
      ))}
      {layout.paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke={theme.mainStroke}
          strokeWidth={path.dashed ? 1.5 : 2}
          strokeDasharray={path.dashed ? "5 4" : undefined}
          strokeLinecap="round"
        />
      ))}
      {layout.strokes.map((stroke) => (
        <line
          key={stroke.key}
          x1={stroke.x1}
          y1={stroke.y1}
          x2={stroke.x2}
          y2={stroke.y2}
          stroke={stroke.thin ? theme.thinStroke : theme.mainStroke}
          strokeWidth={stroke.thin ? 1.3 : stroke.dashed ? 1.5 : 2}
          strokeDasharray={stroke.dashed ? "5 4" : undefined}
          strokeLinecap="round"
        />
      ))}
      {layout.centerDots.map((dot) => (
        <circle key={dot.key} cx={dot.x} cy={dot.y} r={2.2} className={theme.centerDotClassName} />
      ))}
      <FigureLabels labels={layout.labels} theme={theme} />
    </svg>
  );
}

type QuestionFigureProps = {
  diagram: QuestionDiagram;
  variant?: QuestionFigureVariant;
  compact?: boolean;
  language?: Language;
};

export function QuestionFigure({ diagram, variant = "default", compact = false, language = "en" }: QuestionFigureProps) {
  const theme = figureTheme(variant);
  const textFor: FigureTextResolver = (value) => (typeof value === "string" ? value : textForLanguage(value, language));
  const altText = textForLanguage(questionDiagramAltText(diagram), language);

  return (
    <div className={figureShellClassName(variant, compact)} role="img" aria-label={altText}>
      {diagram.kind === "coordinate-grid" ? <CoordinateGridFigure diagram={diagram} theme={theme} /> : null}
      {diagram.kind === "plane-figure" ? <PlaneFigureView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "number-line" ? <NumberLineView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "solid-figure" ? <SolidFigureView diagram={diagram} theme={theme} textFor={textFor} /> : null}
    </div>
  );
}
