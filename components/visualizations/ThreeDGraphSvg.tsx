import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  buildThreeDGraphCameraFromView,
  buildThreeDGraphScene,
  defaultThreeDGraphView,
  formatThreeDGraphSummary,
  rotateThreeDGraphView,
  type ThreeDGraphSceneOptions,
  type ThreeDGraphView
} from "@/components/visualizations/ThreeDGraphSvgGeometry";

export type ThreeDGraphSvgProps = ThreeDGraphSceneOptions & {
  accent?: string;
  className?: string;
  embedded?: boolean;
  showHint?: boolean;
};

function lineProps(line: { x1: number; x2: number; y1: number; y2: number }) {
  return {
    x1: line.x1.toFixed(2),
    x2: line.x2.toFixed(2),
    y1: line.y1.toFixed(2),
    y2: line.y2.toFixed(2)
  };
}

function GraphMarks({ accent = "#f6b739", camera, meshResolution = 25, panelScale = 1, showHint = true, surfaceScale = 1 }: ThreeDGraphSvgProps) {
  const [view, setView] = useState<ThreeDGraphView>(defaultThreeDGraphView);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    view: ThreeDGraphView;
  } | null>(null);
  const activeCamera = useMemo(() => camera ?? buildThreeDGraphCameraFromView(view), [camera, view]);
  const scene = useMemo(
    () => buildThreeDGraphScene({ camera: activeCamera, meshResolution, panelScale, surfaceScale }),
    [activeCamera, meshResolution, panelScale, surfaceScale]
  );
  const summary = formatThreeDGraphSummary({
    meshResolution: scene.summary.meshResolution,
    panelScale: scene.summary.panelScale,
    surfaceScale: scene.summary.surfaceScale
  });

  function handlePointerDown(event: PointerEvent<SVGGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setView(rotateThreeDGraphView(drag.view, {
      deltaX: event.clientX - drag.startX,
      deltaY: event.clientY - drag.startY
    }));
  }

  function handlePointerUp(event: PointerEvent<SVGGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    const dragByKey = {
      ArrowLeft: { deltaX: -28, deltaY: 0 },
      ArrowRight: { deltaX: 28, deltaY: 0 },
      ArrowUp: { deltaX: 0, deltaY: -28 },
      ArrowDown: { deltaX: 0, deltaY: 28 }
    }[event.key];

    if (dragByKey) {
      event.preventDefault();
      setView((current) => rotateThreeDGraphView(current, dragByKey));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setView(defaultThreeDGraphView);
    }
  }

  return (
    <g
      data-viz-mark
      data-viz-name="three-d-wireframe-surface"
      data-viz-azimuth-degrees={view.azimuthDegrees.toFixed(2)}
      data-viz-drag-enabled="true"
      data-viz-elevation-scale={view.elevationScale.toFixed(2)}
      data-viz-formula={scene.summary.formula}
      data-viz-keyboard-enabled="true"
      data-viz-mesh-resolution={scene.summary.meshResolution}
      data-viz-panel-count={scene.panelColumns.length}
      data-viz-panel-scale={scene.summary.panelScale.toFixed(2)}
      data-viz-peak-z={scene.summary.peakZ.toFixed(2)}
      data-viz-state-summary={summary}
      data-viz-surface-scale={scene.summary.surfaceScale.toFixed(2)}
      focusable="true"
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="application"
      tabIndex={0}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      <rect x="0" y="0" width="640" height="360" fill="#0b1420" />
      <rect x="34" y="28" width="572" height="292" rx="28" fill="#0b1420" stroke="#17283a" strokeWidth="2" />
      <g data-viz-name="base-grid" opacity="0.72">
        {scene.baseGridLines.map((line) => (
          <line key={line.id} {...lineProps(line)} stroke="#c68b28" strokeWidth="1.2" strokeLinecap="round" />
        ))}
      </g>
      <g data-viz-name="axis-box" opacity="0.88">
        {scene.axisBoxEdges.map((line) => (
          <line key={line.id} {...lineProps(line)} stroke="#31475f" strokeWidth="2" strokeLinecap="round" />
        ))}
      </g>
      <g data-viz-name="height-panels">
        {scene.panelColumns.map((column, index) => {
          const warm = index > scene.panelColumns.length * 0.62;

          return (
            <g key={column.id} data-viz-panel-height={column.height.toFixed(2)} data-viz-panel-id={column.id}>
              <path d={column.leftFace} fill={warm ? "#caad43" : "#0e6884"} opacity="0.54" stroke="#10283c" strokeWidth="1" />
              <path d={column.rightFace} fill={warm ? "#e2bd47" : "#1288a4"} opacity="0.58" stroke="#10283c" strokeWidth="1" />
              <path d={column.topFace} fill={warm ? "#f0cf62" : "#48c7a8"} opacity="0.62" stroke="#10283c" strokeWidth="1" />
            </g>
          );
        })}
      </g>
      <g data-viz-name="surface-wireframe" opacity="0.96">
        {scene.meshRows.map((path) => (
          <path key={path.id} d={path.d} fill="none" stroke={accent} strokeWidth="1.45" strokeLinecap="round" opacity="0.9" />
        ))}
        {scene.meshColumns.map((path) => (
          <path key={path.id} d={path.d} fill="none" stroke={accent} strokeWidth="1.45" strokeLinecap="round" opacity="0.9" />
        ))}
      </g>
      <g data-viz-name="axis-labels" fill="#90a1b4" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fontWeight="700">
        <text x="126" y="282" fontSize="22">x</text>
        <text x="498" y="282" fontSize="22">y</text>
        <text x="320" y="48" textAnchor="middle" fontSize="24">z</text>
      </g>
      {showHint ? (
        <text
          x="22"
          y="342"
          fill="#748394"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          fontSize="19"
          letterSpacing="3"
        >
          drag to rotate · scroll panels →
        </text>
      ) : null}
    </g>
  );
}

export function ThreeDGraphSvg({ className, embedded = true, ...props }: ThreeDGraphSvgProps) {
  if (embedded) return <GraphMarks {...props} />;

  return (
    <svg data-viz-surface role="img" aria-label="3D graph SVG" viewBox="0 0 640 360" className={className}>
      <GraphMarks {...props} />
    </svg>
  );
}
