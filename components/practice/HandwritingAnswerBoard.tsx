"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  sanitizeHandwritingStrokes,
  type HandwritingPoint,
  type HandwritingRecognitionAlternative,
  type HandwritingRecognitionResult,
  type HandwritingStroke,
  type HandwritingTool
} from "@/lib/handwritingRecognition";
import { cn, localize } from "@/lib/utils";
import type { Language, LocalizedText } from "@/types";

type RecognitionStatus =
  | {
      type: "success";
      text: string;
      provider: string;
      confidence: number | null;
    }
  | {
      type: "low-confidence";
      alternatives: HandwritingRecognitionAlternative[];
    }
  | {
      type: "error";
      message?: string;
    };

type HandwritingAnswerBoardProps = {
  answerInputId: string;
  value: string;
  isShortAnswer: boolean;
  language: Language;
  placeholder: string;
  resetToken: number;
  showAnswerInput?: boolean;
  answerLabel?: LocalizedText;
  onAnswerChange: (value: string) => void;
  onBeginAttempt: () => void;
  onDraftInteraction: () => void;
};

const penWidth = 4;
const eraserWidth = 24;
const ocrImagePaddingCssPx = 32;
const ocrInkAlphaThreshold = 12;
const ocrWhiteThreshold = 245;
const handwritingOcrDebugEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_HANDWRITING_RECOGNITION_DEBUG === "true";

const copy = {
  boardLabel: { en: "Handwriting board", zh: "手寫板" },
  canvasLabel: { en: "Handwriting draft canvas", zh: "手寫草稿畫布" },
  answerLabel: { en: "Handwritten answer text", zh: "手寫答案文字" },
  pen: { en: "Use pen tool", zh: "使用筆工具" },
  eraser: { en: "Use eraser tool", zh: "使用擦膠工具" },
  convert: { en: "Convert to text", zh: "轉換文字" },
  convertAria: { en: "Convert handwriting to answer text", zh: "將手寫內容轉換為答案文字" },
  converting: { en: "Converting", zh: "轉換中" },
  convertSuccess: { en: "Converted to", zh: "已轉換為" },
  convertLowConfidence: { en: "Low confidence. Choose a suggestion or edit the answer text.", zh: "信心較低。請選擇建議答案或自行修改答案文字。" },
  convertError: { en: "Draw clearer separated digits, then convert again.", zh: "請把數字分開寫清楚，然後再轉換。" },
  noVisibleInk: { en: "Write with the pen before converting.", zh: "請先用筆寫下答案，再轉換。" },
  reviewAnswer: { en: "Review before checking the answer.", zh: "提交前請先檢查答案。" },
  useSuggestion: { en: "Use suggestion", zh: "使用建議" },
  undo: { en: "Undo last handwriting stroke", zh: "復原上一筆手寫" },
  clear: { en: "Clear handwriting board", zh: "清空手寫板" },
  collapse: { en: "Collapse handwriting canvas", zh: "收起手寫畫布" },
  expand: { en: "Expand handwriting canvas", zh: "展開手寫畫布" }
} satisfies Record<string, LocalizedText>;

export function HandwritingAnswerBoard({
  answerInputId,
  value,
  isShortAnswer,
  language,
  placeholder,
  resetToken,
  showAnswerInput = true,
  answerLabel = copy.answerLabel,
  onAnswerChange,
  onBeginAttempt,
  onDraftInteraction
}: HandwritingAnswerBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<HandwritingStroke | null>(null);
  const strokesRef = useRef<HandwritingStroke[]>([]);
  const canvasSizeRef = useRef({ width: 800, height: 256, pixelRatio: 1 });
  const [tool, setTool] = useState<HandwritingTool>("pen");
  const [strokes, setStrokes] = useState<HandwritingStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<HandwritingStroke | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus | null>(null);
  const hasDraft = strokes.length > 0 || Boolean(activeStroke);
  const hasVisibleInkDraft = strokes.some(strokeHasVisiblePenInk) || strokeHasVisiblePenInk(activeStroke);

  const drawStroke = useCallback((context: CanvasRenderingContext2D, stroke: HandwritingStroke) => {
    if (!stroke.points.length) return;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = "#0f172a";
    context.lineWidth = stroke.tool === "eraser" ? eraserWidth : penWidth;

    if (stroke.points.length === 1) {
      const [point] = stroke.points;
      context.beginPath();
      context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
      context.fillStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : "#0f172a";
      context.fill();
      context.restore();
      return;
    }

    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    context.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || collapsed) return;

    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context || rect.width <= 0 || rect.height <= 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvasSizeRef.current = { width: rect.width, height: rect.height, pixelRatio };
    const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    strokes.forEach((stroke) => drawStroke(context, stroke));
    if (activeStroke) drawStroke(context, activeStroke);
  }, [activeStroke, collapsed, drawStroke, strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (collapsed) return;
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [collapsed, redraw]);

  useEffect(() => {
    setStrokes([]);
    strokesRef.current = [];
    setActiveStroke(null);
    setRecognitionStatus(null);
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
  }, [resetToken]);

  function selectTool(nextTool: HandwritingTool) {
    setTool(nextTool);
    onBeginAttempt();
  }

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): HandwritingPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function startStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    onBeginAttempt();
    onDraftInteraction();
    setRecognitionStatus(null);
    const nextStroke = {
      tool,
      points: [pointFromEvent(event)]
    };
    activeStrokeRef.current = nextStroke;
    setActiveStroke(nextStroke);
  }

  function continueStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    setActiveStroke((current) => {
      const baseStroke = activeStrokeRef.current ?? current;
      if (!baseStroke) return current;
      const nextStroke = { ...baseStroke, points: [...baseStroke.points, point] };
      activeStrokeRef.current = nextStroke;
      return nextStroke;
    });
  }

  function finishStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const completedStroke = activeStrokeRef.current;
    activePointerIdRef.current = null;
    activeStrokeRef.current = null;
    setActiveStroke(null);
    if (completedStroke?.points.length) {
      const nextStrokes = [...strokesRef.current, completedStroke];
      strokesRef.current = nextStrokes;
      setStrokes(nextStrokes);
    }
  }

  function undoStroke() {
    onBeginAttempt();
    onDraftInteraction();
    setRecognitionStatus(null);
    setActiveStroke(null);
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    const nextStrokes = strokesRef.current.slice(0, -1);
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }

  function clearBoard() {
    onBeginAttempt();
    onDraftInteraction();
    setRecognitionStatus(null);
    setActiveStroke(null);
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    strokesRef.current = [];
    setStrokes([]);
  }

  function buildCanvasFromStrokes(visibleStrokes: HandwritingStroke[]) {
    if (!visibleStrokes.some(strokeHasVisiblePenInk)) return null;

    const { width, height, pixelRatio } = canvasSizeRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    visibleStrokes.forEach((stroke) => drawStroke(context, stroke));
    return canvas;
  }

  function buildOcrImageDataUrl(visibleStrokes: HandwritingStroke[]) {
    const canvas = canvasRef.current ?? buildCanvasFromStrokes(visibleStrokes);
    if (!canvas) return undefined;

    const fallback = () => canvas.toDataURL("image/png");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || canvas.width <= 0 || canvas.height <= 0) return fallback();

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const bounds = findInkPixelBounds(imageData.data, canvas.width, canvas.height);
      if (!bounds) return fallback();

      const pixelRatio = window.devicePixelRatio || 1;
      const padding = Math.max(16, Math.round(ocrImagePaddingCssPx * pixelRatio));
      const cropWidth = bounds.maxX - bounds.minX + 1;
      const cropHeight = bounds.maxY - bounds.minY + 1;
      const output = document.createElement("canvas");
      output.width = cropWidth + padding * 2;
      output.height = cropHeight + padding * 2;

      const outputContext = output.getContext("2d");
      if (!outputContext) return fallback();

      outputContext.fillStyle = "#ffffff";
      outputContext.fillRect(0, 0, output.width, output.height);
      outputContext.drawImage(
        canvas,
        bounds.minX,
        bounds.minY,
        cropWidth,
        cropHeight,
        padding,
        padding,
        cropWidth,
        cropHeight
      );
      return output.toDataURL("image/png");
    } catch {
      return fallback();
    }
  }

  async function convertHandwritingToText() {
    onBeginAttempt();
    onDraftInteraction();
    setIsConverting(true);
    setRecognitionStatus(null);

    try {
      const visibleStrokes = activeStrokeRef.current?.points.length
        ? [...strokesRef.current, activeStrokeRef.current]
        : strokesRef.current;
      if (!visibleStrokes.some(strokeHasVisiblePenInk)) {
        setRecognitionStatus({ type: "error", message: localize(copy.noVisibleInk, language) });
        return;
      }

      const imageDataUrl = buildOcrImageDataUrl(visibleStrokes);
      const response = await fetch("/api/handwriting-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strokes: sanitizeHandwritingStrokes(visibleStrokes),
          imageDataUrl,
          language
        })
      });

      if (!response.ok) {
        setRecognitionStatus({ type: "error", message: await readRecognitionErrorMessage(response) });
        return;
      }

      const result = await response.json() as HandwritingRecognitionResult;
      const alternatives = result.alternatives.filter((alternative) => alternative.text.trim().length > 0);

      if (result.accepted && result.text.trim()) {
        onAnswerChange(result.text);
        setRecognitionStatus({
          type: "success",
          text: result.text,
          provider: result.provider,
          confidence: result.confidence
        });
        return;
      }

      if (alternatives.length) {
        setRecognitionStatus({ type: "low-confidence", alternatives });
        return;
      }

      setRecognitionStatus({ type: "error", message: result.reason });
    } catch {
      setRecognitionStatus({ type: "error" });
    } finally {
      setIsConverting(false);
    }
  }

  function useRecognitionAlternative(alternative: HandwritingRecognitionAlternative) {
    onBeginAttempt();
    onAnswerChange(alternative.text);
    setRecognitionStatus({
      type: "success",
      text: alternative.text,
      provider: alternative.provider,
      confidence: alternative.confidence ?? null
    });
  }

  return (
    <div role="group" aria-label={localize(copy.boardLabel, language)} className="soft-panel mt-3 overflow-hidden p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-200">
          {localize(copy.boardLabel, language)}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={localize(copy.convertAria, language)}
            title={localize(copy.convertAria, language)}
            disabled={!hasVisibleInkDraft || isConverting}
            onClick={convertHandwritingToText}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300 bg-cyan-500 px-4 py-2 text-sm font-black text-white shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:bg-cyan-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 dark:border-cyan-200/40 dark:bg-cyan-300 dark:text-slate-950 dark:enabled:hover:bg-cyan-200 dark:disabled:border-white/10 dark:disabled:bg-white/[0.06] dark:disabled:text-slate-500"
          >
            <SparklesIcon />
            <span>{localize(isConverting ? copy.converting : copy.convert, language)}</span>
          </button>
          <ToolButton
            active={tool === "pen"}
            ariaLabel={copy.pen}
            language={language}
            onClick={() => selectTool("pen")}
          >
            <PenIcon />
          </ToolButton>
          <ToolButton
            active={tool === "eraser"}
            ariaLabel={copy.eraser}
            language={language}
            onClick={() => selectTool("eraser")}
          >
            <EraserIcon />
          </ToolButton>
          <ToolButton
            ariaLabel={copy.undo}
            language={language}
            disabled={!strokes.length}
            onClick={undoStroke}
          >
            <UndoIcon />
          </ToolButton>
          <ToolButton
            ariaLabel={copy.clear}
            language={language}
            disabled={!hasDraft}
            onClick={clearBoard}
          >
            <TrashIcon />
          </ToolButton>
          <ToolButton
            ariaLabel={collapsed ? copy.expand : copy.collapse}
            language={language}
            onClick={() => setCollapsed((current) => !current)}
          >
            <ChevronIcon expanded={!collapsed} />
          </ToolButton>
        </div>
      </div>

      {!collapsed ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={localize(copy.canvasLabel, language)}
          data-testid="handwriting-draft-canvas"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          className="mt-3 h-64 w-full touch-none rounded-2xl border border-slate-200 bg-white shadow-inner shadow-slate-900/5 dark:border-white/10 sm:h-72"
        />
      ) : null}

      {recognitionStatus ? (
        <div
          role="status"
          className={cn(
            "mt-3 rounded-2xl border px-4 py-3 text-sm font-bold",
            recognitionStatus.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
              : recognitionStatus.type === "low-confidence"
                ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
          )}
        >
          {recognitionStatus.type === "success" ? (
            <>
              <p>{`${localize(copy.convertSuccess, language)} "${recognitionStatus.text}". ${localize(copy.reviewAnswer, language)}`}</p>
              <RecognitionDebug provider={recognitionStatus.provider} confidence={recognitionStatus.confidence} />
            </>
          ) : recognitionStatus.type === "low-confidence" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>{localize(copy.convertLowConfidence, language)}</span>
              {recognitionStatus.alternatives.slice(0, 4).map((alternative) => (
                <button
                  key={`${alternative.provider}-${alternative.text}-${alternative.confidence ?? "unknown"}`}
                  type="button"
                  onClick={() => useRecognitionAlternative(alternative)}
                  className="focus-ring rounded-full border border-sky-300 bg-white/80 px-3 py-1 text-sm font-black text-sky-800 transition hover:bg-sky-100 dark:border-sky-200/30 dark:bg-white/10 dark:text-sky-100"
                  aria-label={`${localize(copy.useSuggestion, language)} ${alternative.text}`}
                >
                  {alternative.text}
                </button>
              ))}
              <RecognitionDebug
                provider={recognitionStatus.alternatives[0]?.provider}
                confidence={recognitionStatus.alternatives[0]?.confidence ?? null}
              />
            </div>
          ) : (
            <p>{recognitionStatus.message || localize(copy.convertError, language)}</p>
          )}
        </div>
      ) : null}

      {showAnswerInput ? (
        <>
          <label htmlFor={answerInputId} className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300">
            {localize(answerLabel, language)}
          </label>
          {isShortAnswer ? (
            <textarea
              id={answerInputId}
              value={value}
              rows={2}
              onChange={(event) => onAnswerChange(event.target.value)}
              onFocus={onBeginAttempt}
              placeholder={placeholder}
              className="focus-ring mt-2 w-full resize-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
            />
          ) : (
            <input
              id={answerInputId}
              value={value}
              onChange={(event) => onAnswerChange(event.target.value)}
              onFocus={onBeginAttempt}
              placeholder={placeholder}
              className="focus-ring mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function findInkPixelBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3];
      if (alpha < ocrInkAlphaThreshold) continue;

      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (red >= ocrWhiteThreshold && green >= ocrWhiteThreshold && blue >= ocrWhiteThreshold) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return maxX >= minX && maxY >= minY ? { minX, minY, maxX, maxY } : null;
}

function strokeHasVisiblePenInk(stroke: HandwritingStroke | null | undefined) {
  return Boolean(stroke && (stroke.tool ?? "pen") === "pen" && stroke.points.length > 0);
}

async function readRecognitionErrorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error.trim();
  } catch {
    // The route normally returns JSON, but the generic localized copy is safer than showing raw HTML.
  }

  return undefined;
}

function RecognitionDebug({ provider, confidence }: { provider?: string; confidence?: number | null }) {
  if (!handwritingOcrDebugEnabled || !provider) return null;

  const confidenceLabel = typeof confidence === "number" ? `, confidence ${confidence.toFixed(2)}` : "";
  return (
    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
      {`Debug: ${provider}${confidenceLabel}`}
    </span>
  );
}

function ToolButton({
  active,
  ariaLabel,
  language,
  disabled,
  children,
  onClick
}: {
  active?: boolean;
  ariaLabel: LocalizedText;
  language: Language;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const label = localize(ariaLabel, language);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring grid h-11 w-11 place-items-center rounded-full border text-slate-700 shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-100",
        active
          ? "border-cyan-300 bg-cyan-400/18 text-cyan-800 dark:border-cyan-200/35 dark:bg-cyan-300/15 dark:text-cyan-100"
          : "border-slate-200/80 bg-white/80 hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-violet-200/40 dark:hover:bg-white/[0.12]"
      )}
    >
      {children}
    </button>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M12 3l1.6 4.7L18 9.2l-4.4 1.6L12 15l-1.6-4.2L6 9.2l4.4-1.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="m5 19 4.2-1 9.6-9.6a2.5 2.5 0 0 0-3.5-3.5L5.8 14.5 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="m4 15 8.5-8.5a2.8 2.8 0 0 1 4 0l2.1 2.1a2.8 2.8 0 0 1 0 4L12.2 19H7.8L4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 10 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M8 8H4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 8A8 8 0 1 1 6 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
