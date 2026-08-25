export const TRIG_UNIT_WAVE_VIDEO_FRAME_SOURCE_CONTRACT =
  "Deterministic Canvas 2D sine lesson: one angle drives P, Q, projection, trace, radian ticks, and one staged bilingual caption" as const;

export type TrigUnitWaveVideoPhase = "intro" | "unit-circle" | "height" | "projection" | "period";

export type TrigUnitWaveVideoFrameState = {
  angleRadians: number;
  caption: string | null;
  elapsedSeconds: number;
  heightReveal: number;
  phase: TrigUnitWaveVideoPhase;
  projectionReveal: number;
  sweepProgress: number;
  unitCircleReveal: number;
};

export type TrigUnitWaveVideoCoordinates = {
  circleCenter: { x: number; y: number };
  circlePoint: { x: number; y: number };
  circleRadius: number;
  graphEndX: number;
  graphOrigin: { x: number; y: number };
  wavePoint: { x: number; y: number };
};

export type TrigUnitWaveVideoLabelLayout = {
  pLabel: { x: number; y: number };
  qLabel: { x: number; y: number };
  sameYLabel: { x: number; y: number };
};

export type DrawTrigUnitWaveVideoFrameInput = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  elapsedSeconds: number;
  totalDurationSeconds: number;
};

const BASE_WIDTH = 854;
const BASE_HEIGHT = 480;
const CIRCLE_CENTER = { x: 150, y: 240 } as const;
const CIRCLE_RADIUS = 93;
const GRAPH_ORIGIN = { x: 334, y: 240 } as const;
const GRAPH_END_X = 772;
const TAU = Math.PI * 2;
const UNIT_CIRCLE_START = 0.6;
const HEIGHT_START = 2.2;
const PROJECTION_START = 4.1;
const PERIOD_START = 10.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function smoothStep(start: number, end: number, value: number) {
  if (end <= start) return value >= end ? 1 : 0;
  const normalized = clamp((value - start) / (end - start), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function safeDuration(value: number) {
  return Math.max(PERIOD_START, Number.isFinite(value) ? value : PERIOD_START);
}

export function buildTrigUnitWaveVideoFrameState(
  elapsedSeconds: number,
  totalDurationSeconds: number
): TrigUnitWaveVideoFrameState {
  const duration = safeDuration(totalDurationSeconds);
  const elapsed = clamp(elapsedSeconds, 0, duration);
  const sweepProgress = clamp((elapsed - PROJECTION_START) / (PERIOD_START - PROJECTION_START), 0, 1);
  let phase: TrigUnitWaveVideoPhase;
  let caption: string | null;

  if (elapsed < UNIT_CIRCLE_START) {
    phase = "intro";
    caption = null;
  } else if (elapsed < HEIGHT_START) {
    phase = "unit-circle";
    caption = "先认识单位圆 / Start with the unit circle";
  } else if (elapsed < PROJECTION_START) {
    phase = "height";
    caption = "圆上点 P 的高度就是 sin t / P's height is sin t";
  } else if (elapsed < PERIOD_START) {
    phase = "projection";
    caption = "保持同高投影，Q 画出正弦波 / Same-height projection: Q draws the sine wave";
  } else {
    phase = "period";
    caption = "一圈 2π，对应一个完整周期 / One turn, one full period";
  }

  return {
    angleRadians: sweepProgress * TAU,
    caption,
    elapsedSeconds: elapsed,
    heightReveal: smoothStep(1.7, HEIGHT_START, elapsed),
    phase,
    projectionReveal: smoothStep(PROJECTION_START, PROJECTION_START + 0.35, elapsed),
    sweepProgress,
    unitCircleReveal: smoothStep(UNIT_CIRCLE_START, 1.35, elapsed)
  };
}

export function trigUnitWaveVideoCoordinates(angleRadians: number): TrigUnitWaveVideoCoordinates {
  const angle = clamp(angleRadians, 0, TAU);
  const y = CIRCLE_CENTER.y - CIRCLE_RADIUS * Math.sin(angle);
  return {
    circleCenter: { ...CIRCLE_CENTER },
    circlePoint: {
      x: CIRCLE_CENTER.x + CIRCLE_RADIUS * Math.cos(angle),
      y
    },
    circleRadius: CIRCLE_RADIUS,
    graphEndX: GRAPH_END_X,
    graphOrigin: { ...GRAPH_ORIGIN },
    wavePoint: {
      x: GRAPH_ORIGIN.x + (GRAPH_END_X - GRAPH_ORIGIN.x) * (angle / TAU),
      y
    }
  };
}

export function trigUnitWaveVideoLabelLayout(
  angleRadians: number,
  projectionReveal = 1
): TrigUnitWaveVideoLabelLayout {
  const coordinates = trigUnitWaveVideoCoordinates(angleRadians);
  const reveal = clamp(projectionReveal, 0, 1);
  const pLabelStart = {
    x: coordinates.circlePoint.x + 2,
    y: coordinates.circlePoint.y - 23
  };
  const pHorizontalDirection = coordinates.circlePoint.x > coordinates.circleCenter.x + 8
    ? -1
    : 1;
  const pVerticalDirection = coordinates.circlePoint.y <= coordinates.circleCenter.y
    ? 1
    : -1;
  const pLabelTarget = {
    x: coordinates.circlePoint.x + pHorizontalDirection * 48,
    y: coordinates.circlePoint.y + pVerticalDirection * 28
  };

  return {
    pLabel: {
      x: pLabelStart.x + (pLabelTarget.x - pLabelStart.x) * reveal,
      y: pLabelStart.y + (pLabelTarget.y - pLabelStart.y) * reveal
    },
    qLabel: {
      x: coordinates.wavePoint.x + 28,
      y: coordinates.wavePoint.y + (coordinates.wavePoint.y <= coordinates.graphOrigin.y + 0.5 ? -28 : 28)
    },
    sameYLabel: {
      x: (coordinates.circlePoint.x + coordinates.wavePoint.x) / 2,
      y: coordinates.circlePoint.y - pVerticalDirection * 28
    }
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawLine(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  width: number,
  alpha = 1
) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.restore();
}

function drawPill(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  options: { alpha?: number; fontSize?: number; maxWidth?: number } = {}
) {
  const fontSize = options.fontSize ?? 11;
  const alpha = options.alpha ?? 1;
  context.save();
  context.globalAlpha = alpha;
  context.font = `800 ${fontSize}px system-ui, -apple-system, "PingFang SC", sans-serif`;
  const horizontalPadding = 9;
  const measuredWidth = context.measureText(text).width;
  const width = Math.min(options.maxWidth ?? 520, measuredWidth + horizontalPadding * 2);
  const height = fontSize + 12;
  roundedRectPath(context, centerX - width / 2, centerY - height / 2, width, height, height / 2);
  context.fillStyle = "rgba(2, 6, 23, 0.88)";
  context.fill();
  context.strokeStyle = "rgba(165, 243, 252, 0.30)";
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = "#ecfeff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, centerX, centerY, Math.max(1, width - horizontalPadding * 2));
  context.restore();
}

function drawFormula(context: CanvasRenderingContext2D) {
  roundedRectPath(context, 13, 12, 330, 52, 16);
  context.fillStyle = "rgba(2, 6, 23, 0.86)";
  context.fill();
  context.strokeStyle = "rgba(165, 243, 252, 0.20)";
  context.lineWidth = 1;
  context.stroke();
  context.font = "700 14px Georgia, 'Times New Roman', serif";
  context.fillStyle = "#f8fafc";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("P(t) = (cos t, sin t);   Q(t) = (t, sin t);   y = sin t", 30, 38, 296);
}

function drawAxesAndTicks(context: CanvasRenderingContext2D, reveal: number) {
  const axisColor = "#cbd5e1";
  drawLine(context, { x: 42, y: CIRCLE_CENTER.y }, { x: 263, y: CIRCLE_CENTER.y }, axisColor, 1.5, 0.42 * reveal);
  drawLine(context, { x: CIRCLE_CENTER.x, y: 125 }, { x: CIRCLE_CENTER.x, y: 356 }, axisColor, 1.5, 0.42 * reveal);
  drawLine(context, { x: GRAPH_ORIGIN.x, y: GRAPH_ORIGIN.y }, { x: GRAPH_END_X + 11, y: GRAPH_ORIGIN.y }, axisColor, 1.5, 0.58 * reveal);
  drawLine(context, { x: GRAPH_ORIGIN.x, y: 125 }, { x: GRAPH_ORIGIN.x, y: 356 }, axisColor, 1.5, 0.42 * reveal);

  const tickLabels = ["0", "π/2", "π", "3π/2", "2π"];
  context.save();
  context.globalAlpha = 0.92 * reveal;
  context.font = "800 10px system-ui, -apple-system, 'PingFang SC', sans-serif";
  context.fillStyle = "#cffafe";
  context.textAlign = "center";
  context.textBaseline = "top";
  for (let index = 0; index < tickLabels.length; index += 1) {
    const x = GRAPH_ORIGIN.x + (GRAPH_END_X - GRAPH_ORIGIN.x) * index / (tickLabels.length - 1);
    drawLine(context, { x, y: GRAPH_ORIGIN.y - 7 }, { x, y: GRAPH_ORIGIN.y + 7 }, axisColor, 1.5, 0.72);
    context.fillText(tickLabels[index], x, GRAPH_ORIGIN.y + 13);
  }
  context.textAlign = "right";
  context.fillText("t（弧度 / radians）", GRAPH_END_X + 52, GRAPH_ORIGIN.y + 37);
  context.restore();
}

function drawSineCurve(
  context: CanvasRenderingContext2D,
  endAngle: number,
  color: string,
  width: number,
  alpha: number
) {
  const samples = Math.max(2, Math.ceil(160 * endAngle / TAU));
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  for (let index = 0; index <= samples; index += 1) {
    const angle = endAngle * index / samples;
    const x = GRAPH_ORIGIN.x + (GRAPH_END_X - GRAPH_ORIGIN.x) * angle / TAU;
    const y = GRAPH_ORIGIN.y - CIRCLE_RADIUS * Math.sin(angle);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.restore();
}

function drawAngleArc(context: CanvasRenderingContext2D, angleRadians: number, alpha: number) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = "#fb7185";
  context.lineWidth = 7;
  context.lineCap = "round";
  context.beginPath();
  context.arc(CIRCLE_CENTER.x, CIRCLE_CENTER.y, 33, 0, -angleRadians, true);
  context.stroke();
  context.restore();
}

export function drawTrigUnitWaveVideoFrame({
  canvas,
  context,
  elapsedSeconds,
  totalDurationSeconds
}: DrawTrigUnitWaveVideoFrameInput) {
  const state = buildTrigUnitWaveVideoFrameState(elapsedSeconds, totalDurationSeconds);
  const coordinates = trigUnitWaveVideoCoordinates(state.angleRadians);
  const labels = trigUnitWaveVideoLabelLayout(state.angleRadians, state.projectionReveal);
  const scaleX = canvas.width / BASE_WIDTH;
  const scaleY = canvas.height / BASE_HEIGHT;

  context.save();
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  context.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  context.fillStyle = "#020617";
  context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  drawFormula(context);
  drawAxesAndTicks(context, Math.max(0.2, state.unitCircleReveal));

  context.save();
  context.globalAlpha = 0.9 * state.unitCircleReveal;
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(CIRCLE_CENTER.x, CIRCLE_CENTER.y, CIRCLE_RADIUS, 0, TAU);
  context.stroke();
  context.restore();

  drawSineCurve(context, TAU, "#67e8f9", 4, 0.18 * state.unitCircleReveal);

  if (state.unitCircleReveal > 0.08) {
    drawPill(context, "单位圆 / Unit circle", 72, 126, { alpha: state.unitCircleReveal, fontSize: 10 });
  }

  if (state.heightReveal > 0.02) {
    drawLine(context, coordinates.circleCenter, coordinates.circlePoint, "#fb7185", 7, state.heightReveal);
    drawAngleArc(context, state.angleRadians, state.heightReveal);
    context.save();
    context.globalAlpha = state.heightReveal;
    context.fillStyle = "#fde047";
    context.beginPath();
    context.arc(coordinates.circlePoint.x, coordinates.circlePoint.y, 11, 0, TAU);
    context.fill();
    context.restore();
    drawPill(context, "P(t) 圆上点 / point", labels.pLabel.x, labels.pLabel.y, {
      alpha: state.heightReveal,
      fontSize: 9
    });
  }

  if (state.projectionReveal > 0.02) {
    drawLine(context, coordinates.circlePoint, coordinates.wavePoint, "#67e8f9", 3, 0.78 * state.projectionReveal);
    drawSineCurve(context, state.angleRadians, "#67e8f9", 5, state.projectionReveal);
    context.save();
    context.globalAlpha = state.projectionReveal;
    context.fillStyle = "#fde047";
    context.beginPath();
    context.arc(coordinates.wavePoint.x, coordinates.wavePoint.y, 11, 0, TAU);
    context.fill();
    context.restore();
    drawPill(context, "同高 / same y", labels.sameYLabel.x, labels.sameYLabel.y, {
      alpha: state.projectionReveal,
      fontSize: 9
    });
    drawPill(context, "Q(t)", labels.qLabel.x, labels.qLabel.y, {
      alpha: state.projectionReveal,
      fontSize: 9
    });
    drawPill(context, "正弦波 / sine wave", 760, 126, {
      alpha: state.projectionReveal,
      fontSize: 10
    });
  }

  if (state.caption) {
    drawPill(context, state.caption, BASE_WIDTH / 2, 450, { fontSize: 11, maxWidth: 650 });
  }

  context.restore();
}

function xmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgSinePath(endAngle: number) {
  const safeEnd = clamp(endAngle, 0, TAU);
  const sampleCount = Math.max(2, Math.ceil(180 * Math.max(safeEnd, 0.01) / TAU));
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = safeEnd * index / sampleCount;
    const x = GRAPH_ORIGIN.x + (GRAPH_END_X - GRAPH_ORIGIN.x) * angle / TAU;
    const y = GRAPH_ORIGIN.y - CIRCLE_RADIUS * Math.sin(angle);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function svgAnglePath(angleRadians: number) {
  const safeAngle = clamp(angleRadians, 0, TAU);
  const sampleCount = Math.max(2, Math.ceil(48 * Math.max(safeAngle, 0.01) / TAU));
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = safeAngle * index / sampleCount;
    const x = CIRCLE_CENTER.x + 33 * Math.cos(angle);
    const y = CIRCLE_CENTER.y - 33 * Math.sin(angle);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function svgPill(text: string, centerX: number, centerY: number, options: {
  alpha?: number;
  fontSize?: number;
  maxWidth?: number;
} = {}) {
  const alpha = clamp(options.alpha ?? 1, 0, 1);
  const fontSize = options.fontSize ?? 11;
  const width = Math.min(options.maxWidth ?? 560, Math.max(54, 18 + text.length * fontSize * 0.58));
  const height = fontSize + 12;
  const x = centerX - width / 2;
  const y = centerY - height / 2;
  return [
    `<g opacity="${alpha.toFixed(3)}">`,
    `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height}" rx="${(height / 2).toFixed(2)}" fill="#020617" fill-opacity="0.88" stroke="#a5f3fc" stroke-opacity="0.30"/>`,
    `<text x="${centerX.toFixed(2)}" y="${centerY.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" class="pill" font-size="${fontSize}">${xmlText(text)}</text>`,
    "</g>"
  ].join("");
}

export function renderTrigUnitWaveSvgFrame({
  elapsedSeconds,
  totalDurationSeconds
}: {
  elapsedSeconds: number;
  totalDurationSeconds: number;
}) {
  const state = buildTrigUnitWaveVideoFrameState(elapsedSeconds, totalDurationSeconds);
  const coordinates = trigUnitWaveVideoCoordinates(state.angleRadians);
  const labels = trigUnitWaveVideoLabelLayout(state.angleRadians, state.projectionReveal);
  const reveal = Math.max(0.2, state.unitCircleReveal);
  const tickLabels = ["0", "π/2", "π", "3π/2", "2π"];
  const ticks = tickLabels.map((label, index) => {
    const x = GRAPH_ORIGIN.x + (GRAPH_END_X - GRAPH_ORIGIN.x) * index / (tickLabels.length - 1);
    return `<line x1="${x.toFixed(2)}" y1="233" x2="${x.toFixed(2)}" y2="247" class="axis tick"/><text x="${x.toFixed(2)}" y="259" text-anchor="middle" class="tick-label">${label}</text>`;
  }).join("");
  const dynamicParts: string[] = [];

  if (state.heightReveal > 0.02) {
    dynamicParts.push(
      `<g opacity="${state.heightReveal.toFixed(3)}">`,
      `<line x1="${coordinates.circleCenter.x}" y1="${coordinates.circleCenter.y}" x2="${coordinates.circlePoint.x.toFixed(2)}" y2="${coordinates.circlePoint.y.toFixed(2)}" class="radius"/>`,
      `<path d="${svgAnglePath(state.angleRadians)}" class="angle-arc"/>`,
      `<circle cx="${coordinates.circlePoint.x.toFixed(2)}" cy="${coordinates.circlePoint.y.toFixed(2)}" r="11" class="point"/>`,
      "</g>",
      svgPill("P(t) 圆上点 / point", labels.pLabel.x, labels.pLabel.y, {
        alpha: state.heightReveal,
        fontSize: 9
      })
    );
  }

  if (state.projectionReveal > 0.02) {
    dynamicParts.push(
      `<g opacity="${state.projectionReveal.toFixed(3)}">`,
      `<line x1="${coordinates.circlePoint.x.toFixed(2)}" y1="${coordinates.circlePoint.y.toFixed(2)}" x2="${coordinates.wavePoint.x.toFixed(2)}" y2="${coordinates.wavePoint.y.toFixed(2)}" class="projection"/>`,
      `<path data-role="sine-trace" d="${svgSinePath(state.angleRadians)}" class="sine-trace"/>`,
      `<circle cx="${coordinates.wavePoint.x.toFixed(2)}" cy="${coordinates.wavePoint.y.toFixed(2)}" r="11" class="point"/>`,
      "</g>",
      svgPill("同高 / same y", labels.sameYLabel.x, labels.sameYLabel.y, {
        alpha: state.projectionReveal,
        fontSize: 9
      }),
      svgPill("Q(t)", labels.qLabel.x, labels.qLabel.y, {
        alpha: state.projectionReveal,
        fontSize: 9
      }),
      svgPill("正弦波 / sine wave", 760, 126, {
        alpha: state.projectionReveal,
        fontSize: 10
      })
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BASE_WIDTH} ${BASE_HEIGHT}" width="${BASE_WIDTH}" height="${BASE_HEIGHT}">`,
    "<style>",
    ".pill,.tick-label{fill:#ecfeff;font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-weight:800}.tick-label{font-size:10px}.axis{stroke:#cbd5e1;stroke-width:1.5;opacity:.55}.tick{opacity:.75}.radius{stroke:#fb7185;stroke-width:7;stroke-linecap:round}.angle-arc{fill:none;stroke:#fb7185;stroke-width:7;stroke-linecap:round}.projection{stroke:#67e8f9;stroke-width:3;opacity:.82}.sine-trace{fill:none;stroke:#67e8f9;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}.point{fill:#fde047}",
    "</style>",
    `<rect width="${BASE_WIDTH}" height="${BASE_HEIGHT}" fill="#020617"/>`,
    `<rect x="13" y="12" width="330" height="52" rx="16" fill="#020617" fill-opacity="0.86" stroke="#a5f3fc" stroke-opacity="0.20"/>`,
    `<text x="30" y="38" dominant-baseline="middle" fill="#f8fafc" font-family="Georgia,'Times New Roman',serif" font-size="14" font-weight="700">P(t) = (cos t, sin t);   Q(t) = (t, sin t);   y = sin t</text>`,
    `<g opacity="${reveal.toFixed(3)}">`,
    `<line x1="42" y1="240" x2="263" y2="240" class="axis"/><line x1="150" y1="125" x2="150" y2="356" class="axis"/>`,
    `<line x1="334" y1="240" x2="783" y2="240" class="axis"/><line x1="334" y1="125" x2="334" y2="356" class="axis"/>`,
    ticks,
    `<text x="824" y="277" text-anchor="end" class="tick-label">t（弧度 / radians）</text>`,
    "</g>",
    `<circle cx="150" cy="240" r="93" fill="none" stroke="#67e8f9" stroke-width="5" opacity="${(0.9 * state.unitCircleReveal).toFixed(3)}"/>`,
    `<path d="${svgSinePath(TAU)}" fill="none" stroke="#67e8f9" stroke-width="4" opacity="${(0.18 * state.unitCircleReveal).toFixed(3)}"/>`,
    state.unitCircleReveal > 0.08
      ? svgPill("单位圆 / Unit circle", 72, 126, { alpha: state.unitCircleReveal, fontSize: 10 })
      : "",
    ...dynamicParts,
    state.caption ? svgPill(state.caption, BASE_WIDTH / 2, 450, { fontSize: 11, maxWidth: 650 }) : "",
    "</svg>"
  ].join("");
}
