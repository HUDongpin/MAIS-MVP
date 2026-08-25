"use client";

export const MATH_SCENE_BROWSER_VIDEO_CAPTURE_SOURCE_CONTRACT =
  "Browser video capture: composite WebGL, formula, projected labels, and one caption into a MediaRecorder WebM artifact" as const;

export type MathSceneBrowserVideoCapturePlanInput = {
  durationSeconds: number;
  familyId: string;
  fps: number;
  height: number;
  sceneId: string;
  width: number;
};

export type MathSceneBrowserVideoCapturePlan = {
  captureVersion: "mais-manim-browser-video/v1";
  durationSeconds: number;
  familyId: string;
  fileName: string;
  fps: number;
  frameCount: number;
  height: number;
  mimeTypeCandidates: string[];
  sceneId: string;
  sourceContract: typeof MATH_SCENE_BROWSER_VIDEO_CAPTURE_SOURCE_CONTRACT;
  videoBitsPerSecond: number;
  width: number;
};

export type MathSceneBrowserVideoCaptureResult = {
  blob: Blob;
  byteCount: number;
  drawnFrameCount: number;
  elapsedMilliseconds: number;
  mimeType: string;
  plan: MathSceneBrowserVideoCapturePlan;
};

export type MathSceneDeterministicFrameRenderer = (input: {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  elapsedSeconds: number;
  totalDurationSeconds: number;
}) => void;

export type CaptureMathSceneWebmInput = {
  backgroundColor: string;
  deterministicFrameRenderer?: MathSceneDeterministicFrameRenderer;
  onRecordingStart?: () => void;
  overlayRoot: HTMLElement;
  plan: MathSceneBrowserVideoCapturePlan;
  signal?: AbortSignal;
  sourceCanvas: HTMLCanvasElement;
  transparentBackground?: boolean;
};

const WEBM_MIME_TYPE_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm"
];

function finiteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeInteger(value: number, fallback: number, min: number, max: number) {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

function safeSlug(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "math-scene";
}

function targetBitrate(width: number, height: number, fps: number) {
  const pixelsPerSecond = width * height * fps;
  if (pixelsPerSecond <= 854 * 480 * 15) return 4_000_000;
  if (pixelsPerSecond <= 1280 * 720 * 30) return 8_000_000;
  if (pixelsPerSecond <= 1920 * 1080 * 60) return 16_000_000;
  return 40_000_000;
}

export function buildMathSceneBrowserVideoCapturePlan({
  durationSeconds,
  familyId,
  fps,
  sceneId,
  width
}: MathSceneBrowserVideoCapturePlanInput): MathSceneBrowserVideoCapturePlan {
  const safeWidth = safeInteger(width, 1280, 320, 3840);
  const safeHeight = Math.round(safeWidth * 9 / 16);
  const safeFps = safeInteger(fps, 30, 1, 60);
  const safeDuration = Math.max(0, finiteNumber(durationSeconds));

  return {
    captureVersion: "mais-manim-browser-video/v1",
    durationSeconds: Number(safeDuration.toFixed(3)),
    familyId,
    fileName: `${safeSlug(sceneId)}.webm`,
    fps: safeFps,
    frameCount: Math.max(1, Math.floor(safeDuration * safeFps) + 1),
    height: safeHeight,
    mimeTypeCandidates: [...WEBM_MIME_TYPE_CANDIDATES],
    sceneId,
    sourceContract: MATH_SCENE_BROWSER_VIDEO_CAPTURE_SOURCE_CONTRACT,
    videoBitsPerSecond: targetBitrate(safeWidth, safeHeight, safeFps),
    width: safeWidth
  };
}

export function plainTextMathForVideo(latex: string) {
  return latex
    .replace(/^\$|\$$/g, "")
    .replace(/\\quad/g, "   ")
    .replace(/\\pi/g, "π")
    .replace(/\\(sin|cos|tan)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/,\s*/g, ", ")
    .replace(/\s+/g, (match) => match.length > 1 ? "   " : " ")
    .trim();
}

function selectedMimeType(plan: MathSceneBrowserVideoCapturePlan) {
  if (typeof MediaRecorder === "undefined") return null;
  return plan.mimeTypeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null;
}

export function canCaptureMathSceneWebm(sourceCanvas?: HTMLCanvasElement | null) {
  return typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(sourceCanvas && typeof sourceCanvas.captureStream === "function");
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

function isTransparentColor(color: string) {
  return color === "transparent" || /rgba\([^)]*,\s*0(?:\.0+)?\s*\)/.test(color);
}

function drawOverlayElement(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  rootRect: DOMRect,
  scaleX: number,
  scaleY: number,
  text: string,
  options: { formula?: boolean; tick?: boolean } = {}
) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const style = window.getComputedStyle(element);
  const x = (rect.left - rootRect.left) * scaleX;
  const y = (rect.top - rootRect.top) * scaleY;
  const width = rect.width * scaleX;
  const height = rect.height * scaleY;
  const radius = Math.min(height / 2, 18 * Math.min(scaleX, scaleY));

  context.save();
  if (!options.tick && !isTransparentColor(style.backgroundColor)) {
    roundedRectPath(context, x, y, width, height, radius);
    context.fillStyle = style.backgroundColor || "rgba(2,6,23,0.82)";
    context.fill();
  }
  if (!options.tick && style.borderTopWidth !== "0px" && !isTransparentColor(style.borderTopColor)) {
    roundedRectPath(context, x, y, width, height, radius);
    context.strokeStyle = style.borderTopColor || "rgba(207,250,254,0.25)";
    context.lineWidth = Math.max(1, Number.parseFloat(style.borderTopWidth || "1") * Math.min(scaleX, scaleY));
    context.stroke();
  }

  const sourceFontSize = Number.parseFloat(style.fontSize || "12") || 12;
  const fontSize = Math.max(10, sourceFontSize * Math.min(scaleX, scaleY));
  context.fillStyle = style.color || "#ecfeff";
  context.font = `${options.formula ? 700 : 800} ${fontSize}px ${options.formula ? "Georgia, serif" : "system-ui, sans-serif"}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + width / 2, y + height / 2, Math.max(1, width - 12 * scaleX));
  context.restore();
}

function drawCompositeFrame(
  context: CanvasRenderingContext2D,
  input: CaptureMathSceneWebmInput,
  outputCanvas: HTMLCanvasElement
) {
  const { backgroundColor, overlayRoot, sourceCanvas, transparentBackground } = input;
  const rootRect = overlayRoot.getBoundingClientRect();
  const scaleX = outputCanvas.width / Math.max(1, rootRect.width);
  const scaleY = outputCanvas.height / Math.max(1, rootRect.height);

  context.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  if (!transparentBackground) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
  context.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height);

  const formula = overlayRoot.querySelector<HTMLElement>("[data-viz-manim-formula-overlay]");
  const formulaText = formula?.dataset.vizManimFormulaDisplayText;
  if (formula && formulaText) {
    drawOverlayElement(context, formula, rootRect, scaleX, scaleY, plainTextMathForVideo(formulaText), { formula: true });
  }

  overlayRoot.querySelectorAll<HTMLElement>("[data-viz-manim-projected-label]").forEach((label) => {
    const text = label.dataset.vizManimProjectedLabelText ?? label.textContent?.trim();
    if (!text) return;
    drawOverlayElement(context, label, rootRect, scaleX, scaleY, text, {
      tick: !label.className.includes("rounded-full")
    });
  });

  const caption = overlayRoot.querySelector<HTMLElement>("[data-viz-manim-caption]");
  const captionText = caption?.dataset.vizManimCaptionText;
  if (caption && captionText) {
    drawOverlayElement(context, caption, rootRect, scaleX, scaleY, captionText);
  }
}

function drawCaptureFrame(
  context: CanvasRenderingContext2D,
  input: CaptureMathSceneWebmInput,
  outputCanvas: HTMLCanvasElement,
  elapsedSeconds: number
) {
  if (input.deterministicFrameRenderer) {
    input.deterministicFrameRenderer({
      canvas: outputCanvas,
      context,
      elapsedSeconds,
      totalDurationSeconds: input.plan.durationSeconds
    });
    return;
  }
  drawCompositeFrame(context, input, outputCanvas);
}

function abortedError() {
  return new DOMException("Math scene video capture aborted", "AbortError");
}

export async function captureMathSceneWebm(
  input: CaptureMathSceneWebmInput
): Promise<MathSceneBrowserVideoCaptureResult> {
  const { plan, signal, sourceCanvas } = input;
  if (signal?.aborted) throw abortedError();
  if (!canCaptureMathSceneWebm(sourceCanvas)) {
    throw new Error("This browser cannot record a WebM canvas stream.");
  }

  const mimeType = selectedMimeType(plan);
  if (!mimeType) throw new Error("This browser has MediaRecorder but no supported WebM codec.");

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = plan.width;
  outputCanvas.height = plan.height;
  const outputContext = outputCanvas.getContext("2d", { alpha: input.transparentBackground === true });
  if (!outputContext) throw new Error("Unable to create the video output canvas.");
  const stagingCanvas = document.createElement("canvas");
  stagingCanvas.width = plan.width;
  stagingCanvas.height = plan.height;
  const stagingContext = stagingCanvas.getContext("2d", { alpha: input.transparentBackground === true });
  if (!stagingContext) throw new Error("Unable to create the video composition canvas.");
  stagingContext.imageSmoothingEnabled = true;
  stagingContext.imageSmoothingQuality = "high";
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  const publishStagedFrame = () => {
    outputContext.save();
    outputContext.globalCompositeOperation = "copy";
    outputContext.drawImage(stagingCanvas, 0, 0);
    outputContext.restore();
  };

  drawCaptureFrame(stagingContext, input, stagingCanvas, 0);
  publishStagedFrame();
  const stream = outputCanvas.captureStream(plan.fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: plan.videoBitsPerSecond
  });
  const chunks: BlobPart[] = [];
  let drawnFrameCount = 1;
  let animationFrameId = 0;
  let recordingError: Error | null = null;

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      recordingError = new Error("MediaRecorder failed while encoding the math scene.");
      reject(recordingError);
    }, { once: true });
    recorder.addEventListener("stop", () => resolve(), { once: true });
  });

  const abortCapture = () => {
    cancelAnimationFrame(animationFrameId);
    if (recorder.state !== "inactive") recorder.stop();
  };
  signal?.addEventListener("abort", abortCapture, { once: true });

  const startedAt = performance.now();
  const frameIntervalMilliseconds = 1_000 / plan.fps;
  const recorderStopTimeoutMilliseconds = 2_000;
  let lastDrawAt = startedAt;
  try {
    recorder.start(250);
    input.onRecordingStart?.();

    await new Promise<void>((resolve, reject) => {
      const render = (now: number) => {
        if (signal?.aborted) {
          reject(abortedError());
          return;
        }
        if (now - lastDrawAt >= frameIntervalMilliseconds || now - startedAt >= plan.durationSeconds * 1000) {
          const elapsedSeconds = Math.min(plan.durationSeconds, Math.max(0, now - startedAt) / 1_000);
          drawCaptureFrame(stagingContext, input, stagingCanvas, elapsedSeconds);
          publishStagedFrame();
          drawnFrameCount += 1;
          lastDrawAt = now;
        }
        if (now - startedAt >= plan.durationSeconds * 1000) {
          resolve();
          return;
        }
        animationFrameId = requestAnimationFrame(render);
      };
      animationFrameId = requestAnimationFrame(render);
    });

    if (recorder.state !== "inactive") {
      recorder.requestData();
      recorder.stop();
    }
    let recorderStopTimeout = 0;
    await Promise.race([
      stopped,
      new Promise<void>((resolve) => {
        recorderStopTimeout = window.setTimeout(resolve, recorderStopTimeoutMilliseconds);
      })
    ]);
    window.clearTimeout(recorderStopTimeout);
    if (recordingError) throw recordingError;
    if (signal?.aborted) throw abortedError();

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) throw new Error("The browser produced an empty WebM recording.");
    return {
      blob,
      byteCount: blob.size,
      drawnFrameCount,
      elapsedMilliseconds: Math.max(0, performance.now() - startedAt),
      mimeType,
      plan
    };
  } finally {
    cancelAnimationFrame(animationFrameId);
    signal?.removeEventListener("abort", abortCapture);
    stream.getTracks().forEach((track) => track.stop());
  }
}
