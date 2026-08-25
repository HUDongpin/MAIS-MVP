import { textForLanguage } from "@/lib/i18n";
import {
  buildBarChartLayout,
  buildCoordinateGridLayout,
  buildNumberLineLayout,
  buildPlaneFigureLayout,
  buildSolidFigureLayout,
  buildTenFrameLayout,
  buildQuestionDiagramSemanticSummary,
  type FigureLabel,
  type FigureTextResolver
} from "@/lib/questionFigure";
import { cn } from "@/lib/utils";
import type {
  BarChartQuestionDiagram,
  CoordinateGridQuestionDiagram,
  Language,
  NumberLineQuestionDiagram,
  PlaneFigureQuestionDiagram,
  QuestionDiagram,
  SolidFigureQuestionDiagram,
  TenFrameCounterTone,
  TenFrameQuestionDiagram
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
  theme,
  textFor
}: {
  diagram: CoordinateGridQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
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
    <svg aria-hidden="true" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
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
        {textFor(diagram.xAxisLabel)}
      </text>
      <text x={theme.isDay ? xFor(0) : xFor(0) - 4} y={plot.top - 7} textAnchor={theme.isDay ? "middle" : "end"} className={theme.axisLabelClassName}>
        {textFor(diagram.yAxisLabel)}
      </text>
    </svg>
  );
}

function BarChartView({
  diagram,
  theme,
  textFor
}: {
  diagram: BarChartQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
}) {
  const layout = buildBarChartLayout(diagram, textFor);
  const baseline = layout.plot.top + layout.plot.height;
  const gridStroke = theme.isDay ? "#d8e0ea" : "rgb(203 213 225)";

  return (
    <div className="grid gap-2">
      <svg aria-hidden="true" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
        <rect x={0} y={0} width={layout.viewBox.width} height={layout.viewBox.height} rx={theme.isDay ? 0 : 8} className={theme.plotFillClassName} />
        <text x={layout.viewBox.width / 2} y={24} textAnchor="middle" className={theme.pointLabelClassName}>
          {layout.title}
        </text>
        {layout.yTicks.map((tick) => (
          <g key={`bar-y-${tick.value}`}>
            <line x1={layout.plot.left} x2={layout.plot.left + layout.plot.width} y1={tick.y} y2={tick.y} stroke={gridStroke} strokeWidth={1} />
            <text x={layout.plot.left - 8} y={tick.y + 4} textAnchor="end" className={theme.tickLabelClassName}>
              {tick.value}
            </text>
          </g>
        ))}
        <line x1={layout.plot.left} x2={layout.plot.left} y1={layout.plot.top} y2={baseline} stroke={theme.mainStroke} strokeWidth={2} />
        <line x1={layout.plot.left} x2={layout.plot.left + layout.plot.width} y1={baseline} y2={baseline} stroke={theme.mainStroke} strokeWidth={2} />
        {layout.bars.map((bar) => (
          <rect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.fill} rx={2} />
        ))}
        {layout.categories.map((category) => (
          <text key={category.key} x={category.x} y={category.y} textAnchor="middle" className={theme.tickLabelClassName}>
            {category.text}
          </text>
        ))}
        <text x={layout.plot.left + layout.plot.width / 2} y={layout.viewBox.height - 20} textAnchor="middle" className={theme.axisLabelClassName}>
          {layout.xAxisLabel}
        </text>
        <text
          x={16}
          y={layout.plot.top + layout.plot.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${layout.plot.top + layout.plot.height / 2})`}
          className={theme.axisLabelClassName}
        >
          {layout.yAxisLabel}
        </text>
      </svg>
      <ul aria-hidden="true" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {layout.legend.map((entry) => (
          <li key={entry.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.fill }} />
            {entry.text}
          </li>
        ))}
      </ul>
    </div>
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
    <svg aria-hidden="true" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
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
    <svg aria-hidden="true" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
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
    <svg aria-hidden="true" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} className="h-auto w-full">
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

/**
 * Counter fills. Kept as literal hex rather than Tailwind classes because the
 * tone a spec names ("red") has to be the colour a learner sees and the colour
 * the alt text says — one table, no theme-dependent drift.
 */
const tenFrameToneFills: Record<TenFrameCounterTone, { day: string; night: string }> = {
  red: { day: "#e23b3b", night: "#f26d6d" },
  blue: { day: "#2f6bec", night: "#6d97f5" },
  orange: { day: "#f2601f", night: "#f5854f" },
  green: { day: "#0f9d58", night: "#3fbf7f" },
  purple: { day: "#8b46d6", night: "#ab74e6" },
  yellow: { day: "#e0a106", night: "#f0c53c" }
};

function TenFrameView({
  diagram,
  theme,
  textFor
}: {
  diagram: TenFrameQuestionDiagram;
  theme: FigureTheme;
  textFor: FigureTextResolver;
}) {
  const layout = buildTenFrameLayout(diagram, textFor);
  const isDay = theme.isDay;
  const frameStroke = isDay ? "#dbe2ec" : "rgb(148 163 184)";
  const emptyFill = isDay ? "#eef1f7" : "rgba(148, 163, 184, 0.22)";
  const counterHalo = isDay ? "#ffffff" : "rgba(15, 23, 42, 0.85)";
  const fillFor = (tone: TenFrameCounterTone) => (isDay ? tenFrameToneFills[tone].day : tenFrameToneFills[tone].night);

  return (
    <div className="grid gap-3">
      {/*
        Frames wrap rather than sharing one viewBox. Side by side when there is
        room; stacked on a phone, where squeezing two frames into one row left
        counters too small for a five-year-old to pick out. `min-w-[13rem]`
        is what forces the wrap instead of the shrink.
      */}
      <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
        {layout.frames.map((frame) => (
          <svg
            key={frame.key}
            aria-hidden="true"
            viewBox={`0 0 ${frame.viewBox.width} ${frame.viewBox.height}`}
            // Counters stay finger-sized instead of ballooning to fill the
            // figure shell the way a coordinate grid wants to.
            style={{ maxWidth: `${frame.viewBox.width * 1.8}px` }}
            className="h-auto w-full min-w-[13rem] flex-1"
          >
            <rect
              x={frame.frame.x}
              y={frame.frame.y}
              width={frame.frame.width}
              height={frame.frame.height}
              rx={12}
              className={theme.plotFillClassName}
              stroke={frameStroke}
              strokeWidth={2}
            />
            {frame.cells.map((cell) => (
              <circle
                key={cell.key}
                cx={cell.cx}
                cy={cell.cy}
                r={cell.r}
                fill={cell.tone ? fillFor(cell.tone) : emptyFill}
                stroke={cell.tone ? counterHalo : "none"}
                strokeWidth={cell.tone ? 2.5 : 0}
              />
            ))}
          </svg>
        ))}
      </div>
      {layout.legend.length ? (
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {layout.legend.map((entry) => (
            <li key={entry.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: fillFor(entry.tone) }}
              />
              {entry.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
  const semantics = buildQuestionDiagramSemanticSummary(diagram, language);

  return (
    <figure className={figureShellClassName(variant, compact)}>
      {diagram.kind === "coordinate-grid" ? <CoordinateGridFigure diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "bar-chart" ? <BarChartView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "plane-figure" ? <PlaneFigureView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "number-line" ? <NumberLineView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "solid-figure" ? <SolidFigureView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      {diagram.kind === "ten-frame" ? <TenFrameView diagram={diagram} theme={theme} textFor={textFor} /> : null}
      <figcaption className="mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
        {semantics.caption}
      </figcaption>
      {semantics.table ? (
        <table className="sr-only">
          <caption>{semantics.table.caption}</caption>
          <thead>
            <tr>
              {semantics.table.headers.map((header, index) => <th key={`${index}-${header}`} scope="col">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {semantics.table.rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => index === 0
                  ? <th key={`${row.key}-${index}`} scope="row">{cell}</th>
                  : <td key={`${row.key}-${index}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}
