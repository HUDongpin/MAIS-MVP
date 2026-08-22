import type { Locator, Page } from "@playwright/test";

export type CaliforniaCanvasTextFindingKind =
  | "canvas-audit-missing"
  | "canvas-audit-mask-too-large"
  | "canvas-audit-never-settled"
  | "canvas-audit-no-visible-canvas"
  | "canvas-audit-unsupported-composite"
  | "canvas-audit-unsupported-clip"
  | "canvas-audit-unsupported-state"
  | "canvas-text-dom-control-overlap"
  | "canvas-text-dom-text-overlap"
  | "canvas-text-outside-buffer"
  | "canvas-text-raster-overlap";

export type CaliforniaCanvasTextFinding = {
  benchId: string;
  canvasId?: number;
  canvasIndex?: number;
  detail: string;
  kind: CaliforniaCanvasTextFindingKind;
  otherCanvasId?: number;
  otherText?: string;
  overlapPixels?: number;
  ratio?: number;
  severity: "hard";
  state: string;
  text?: string;
  viewport: "desktop" | "mobile";
};

export type CaliforniaCanvasTextAuditContext = {
  benchId: string;
  state: string;
  viewport: "desktop" | "mobile";
};

export type CaliforniaCanvasTextAuditResult = {
  canvasCount: number;
  clippedTextLayerCount: number;
  findings: CaliforniaCanvasTextFinding[];
  textLayerCount: number;
};

export type CaliforniaCanvasStabilityResult = {
  canvasCount: number;
  elapsedMs: number;
  signature: string;
  stable: boolean;
};

export type CaliforniaCanvasTextAuditOptions = {
  /** Restrict recording analysis to matching canvases while retaining `root` as the DOM-overlap surface. */
  canvasSelector?: string;
  pollMs?: number;
  quietMs?: number;
  timeoutMs?: number;
};

type CaliforniaCanvasSelectionOptions = Pick<CaliforniaCanvasTextAuditOptions, "canvasSelector">;

export type CaliforniaCanvasContextKind = "2d" | "bitmaprenderer" | "unknown" | "webgl" | "webgl2";

export type CaliforniaCanvasTextContrastInput = {
  canvas: HTMLCanvasElement;
  canvasId: number;
  contextKind: CaliforniaCanvasContextKind;
  finalPaintPixels: number[];
  font: string;
  globalAlpha: number;
  groupId: string;
  mode: "fill" | "stroke";
  paintStyle: string | null;
  /** Packed RGBA destination pixels sampled immediately before the text paint. */
  prePaintDestinationPixels: number[];
  sampleCount: number;
  sampleX: number | null;
  sampleY: number | null;
  text: string;
  transform: [number, number, number, number, number, number];
  visibleChangedSampleCount: number;
  unsupportedReasons: string[];
};

export type CaliforniaCanvasContrastSurfaceOutcome = {
  canvas: HTMLCanvasElement;
  canvasId: number | null;
  contextKind: CaliforniaCanvasContextKind;
  essential: boolean;
  hasExecutableNonTextEvidence: boolean;
  hasExecutableTextEvidence: boolean;
  unsupportedReasons: string[];
};

export type CaliforniaCanvasTextAuditPageApi = {
  analyze(
    root: HTMLElement,
    context: CaliforniaCanvasTextAuditContext,
    options?: CaliforniaCanvasSelectionOptions
  ): CaliforniaCanvasTextAuditResult;
  /** Read the context kind acquired through the application-facing getContext hook. Never acquires a context. */
  contextKindFor(canvas: HTMLCanvasElement): CaliforniaCanvasContextKind;
  /**
   * Return pre-paint evidence for recorded 2D text. This method only reads
   * recorder state; it never acquires a Canvas context.
   */
  contrastInputs(
    root: HTMLElement,
    options?: CaliforniaCanvasSelectionOptions
  ): CaliforniaCanvasTextContrastInput[];
  /** Every visible Canvas must return one explicit modality/evidence outcome. */
  contrastSurfaceOutcomes(
    root: HTMLElement,
    options?: CaliforniaCanvasSelectionOptions
  ): CaliforniaCanvasContrastSurfaceOutcome[];
  signature(
    root: HTMLElement,
    options?: CaliforniaCanvasSelectionOptions
  ): { canvasCount: number; signature: string };
  version: 4;
};

type CaliforniaCanvasAuditWindow = Window & {
  __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi;
};

/**
 * Install before the first page navigation. The recorder is deliberately a
 * Playwright init script: signature benches draw during their first React
 * effect, before an ordinary test-side evaluate call could observe them.
 */
export async function installCaliforniaCanvasTextAudit(page: Page) {
  // tsx/esbuild may preserve its small `__name` helper inside Function#toString.
  // Define a browser-local no-op version so this init script works both under
  // the Playwright runner and the lightweight node --import tsx canary.
  const source = californiaCanvasTextAuditInit.toString();
  await page.addInitScript({
    content: `globalThis.__name = globalThis.__name || function(target) { return target; }; (${source})();`
  });
}

export async function waitForCaliforniaCanvasStable(
  root: Locator,
  options: CaliforniaCanvasTextAuditOptions = {}
): Promise<CaliforniaCanvasStabilityResult> {
  const pollMs = options.pollMs ?? 40;
  const quietMs = options.quietMs ?? 180;
  const timeoutMs = options.timeoutMs ?? 5_500;
  const startedAt = Date.now();
  let lastChangeAt = startedAt;
  let previousSignature = "";
  let canvasCount = 0;

  while (Date.now() - startedAt <= timeoutMs) {
    const snapshot = await root.evaluate((element, canvasSelector) => {
      const api = (window as CaliforniaCanvasAuditWindow).__californiaCanvasTextAudit;
      if (!api) return { canvasCount: 0, signature: "audit-missing" };
      return api.signature(element as HTMLElement, { canvasSelector });
    }, options.canvasSelector).catch(() => ({ canvasCount: 0, signature: "root-detached" }));

    canvasCount = snapshot.canvasCount;
    if (snapshot.signature !== previousSignature) {
      previousSignature = snapshot.signature;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt >= quietMs) {
      return {
        canvasCount,
        elapsedMs: Date.now() - startedAt,
        signature: previousSignature,
        stable: true
      };
    }

    await root.page().waitForTimeout(pollMs);
  }

  return {
    canvasCount,
    elapsedMs: Date.now() - startedAt,
    signature: previousSignature,
    stable: false
  };
}

/** Analyze every visible canvas below `root`, including replayable rectangular clips. */
export async function collectCaliforniaCanvasTextFindings(
  root: Locator,
  context: CaliforniaCanvasTextAuditContext,
  stabilityOptions: CaliforniaCanvasTextAuditOptions = {}
): Promise<CaliforniaCanvasTextAuditResult> {
  const stability = await waitForCaliforniaCanvasStable(root, stabilityOptions);
  if (!stability.stable) {
    return {
      canvasCount: stability.canvasCount,
      clippedTextLayerCount: 0,
      findings: [{
        ...context,
        detail: `Canvas drawing did not stay unchanged for ${stabilityOptions.quietMs ?? 180}ms within ${stabilityOptions.timeoutMs ?? 5_500}ms; last signature=${stability.signature || "empty"}.`,
        kind: "canvas-audit-never-settled",
        severity: "hard"
      }],
      textLayerCount: 0
    };
  }

  return root.evaluate((element, input) => {
    const api = (window as CaliforniaCanvasAuditWindow).__californiaCanvasTextAudit;
    if (!api) {
      return {
        canvasCount: 0,
        clippedTextLayerCount: 0,
        findings: [{
          ...input.auditContext,
          detail: "California Canvas text audit init script was not installed before navigation.",
          kind: "canvas-audit-missing" as const,
          severity: "hard" as const
        }],
        textLayerCount: 0
      };
    }
    return api.analyze(element as HTMLElement, input.auditContext, {
      canvasSelector: input.canvasSelector
    });
  }, { auditContext: context, canvasSelector: stabilityOptions.canvasSelector });
}

/** Browser-only, self-contained body serialized by page.addInitScript. */
function californiaCanvasTextAuditInit() {
  type MatrixTuple = [number, number, number, number, number, number];
  type DeviceBounds = {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  type DevicePoint = { x: number; y: number };
  type PathPointState = DevicePoint;
  type RasterMutationRecord = {
    bounds: DeviceBounds | null;
    operation: string;
    revision: number;
    unsupportedReason: string | null;
  };
  type RectanglePathRecord = {
    height: number;
    transform: MatrixTuple;
    width: number;
    x: number;
    y: number;
  };
  type RectangularClipRecord = {
    fillRule: CanvasFillRule;
    rectangles: RectanglePathRecord[];
  };
  type ClipAuditState = {
    clips: RectangularClipRecord[];
    unsupportedReasons: string[];
  };
  type CurrentPathAuditState = {
    currentPoint: PathPointState | null;
    deviceBounds: DeviceBounds | null;
    dirtyBoundsReasons: string[];
    maxTransformScale: number;
    rectangles: RectanglePathRecord[];
    subpathStart: PathPointState | null;
    unsupportedReasons: string[];
  };
  type TextRecord = {
    clipState: ClipAuditState;
    direction: CanvasDirection;
    filter: string;
    font: string;
    fontKerning?: string;
    fontStretch?: string;
    fontVariantCaps?: string;
    globalAlpha: number;
    globalCompositeOperation: GlobalCompositeOperation;
    glyphBoundsProxy: DeviceBounds | null;
    lang?: string;
    letterSpacing?: string;
    lineJoin: CanvasLineJoin;
    lineWidth: number;
    maxWidth?: number;
    miterLimit: number;
    mode: "fill" | "stroke";
    order: number;
    paintStyle: string | CanvasGradient | CanvasPattern;
    prePaintContrast: {
      bounds: { height: number; width: number; x: number; y: number } | null;
      destinationPixels: number[];
      unsupportedReasons: string[];
    };
    nonTextRevisionAtPaint: number;
    shadowBlur: number;
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    text: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    textRendering?: string;
    transform: MatrixTuple;
    wordSpacing?: string;
    x: number;
    y: number;
  };
  type ContextAuditState = {
    canvasId: number;
    clearCount: number;
    clipState: ClipAuditState;
    context: CanvasRenderingContext2D;
    currentPath: CurrentPathAuditState;
    drawRevision: number;
    epoch: number;
    lastDrawAt: number;
    nonTextMutations: RasterMutationRecord[];
    nonTextRevision: number;
    order: number;
    resourceLimitReasons: string[];
    savedClipStates: ClipAuditState[];
    texts: TextRecord[];
    unsupportedRasterReasons: string[];
  };
  type MaskPixel = { alpha: number; x: number; y: number };
  type MaskResult = {
    pixels: MaskPixel[];
    oversizedMaskReason?: string;
    unsupportedClipReasons: string[];
    unsupportedCompositeOperation?: GlobalCompositeOperation;
    unsupportedStateReasons: string[];
  };
  type TextLayer = {
    clipDepth: number;
    decorativePairComplete: boolean;
    key: string;
    lastMode: "fill" | "stroke";
    lastOrder: number;
    mask: Map<string, MaskPixel>;
    text: string;
    unsupportedClipReasons: string[];
    unsupportedCompositeOperations: GlobalCompositeOperation[];
    unsupportedMaskReasons: string[];
    unsupportedStateReasons: string[];
  };

  const auditWindow = window as CaliforniaCanvasAuditWindow;
  if (auditWindow.__californiaCanvasTextAudit?.version === 4) return;

  const proto = CanvasRenderingContext2D.prototype;
  const canvasProto = HTMLCanvasElement.prototype;
  const nativeBeginPath = proto.beginPath;
  const nativeClearRect = proto.clearRect;
  const nativeClip = proto.clip;
  const nativeClosePath = proto.closePath;
  const nativeDrawImage = proto.drawImage;
  const nativeFillText = proto.fillText;
  const nativeGetContext = canvasProto.getContext;
  const nativeRect = proto.rect;
  const nativeRestore = proto.restore;
  const nativeSave = proto.save;
  const nativeStrokeText = proto.strokeText;
  const nativeSetAttribute = Element.prototype.setAttribute;
  const nativeRemoveAttribute = Element.prototype.removeAttribute;
  const contextStates = new WeakMap<CanvasRenderingContext2D, ContextAuditState>();
  const canvasStates = new WeakMap<HTMLCanvasElement, ContextAuditState>();
  const canvasContextKinds = new WeakMap<HTMLCanvasElement, CaliforniaCanvasContextKind>();
  let nextCanvasId = 1;
  let suspended = false;

  const MAX_MASK_DIMENSION = 1_024;
  const MAX_MASK_AREA = 524_288;
  const MAX_TEXT_RECORDS_PER_CANVAS = 256;
  const MAX_TEXT_LAYERS_PER_CANVAS = 192;
  const MAX_TOTAL_MASK_PIXELS_PER_CANVAS = 131_072;
  const MAX_PRE_PAINT_DESTINATION_COLORS = 4_096;
  const MAX_POST_TEXT_RASTER_MUTATIONS = 1_024;

  function appendUniqueReason(reasons: string[], reason: string) {
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  function markRasterMutation(state: ContextAuditState) {
    state.drawRevision += 1;
    state.lastDrawAt = performance.now();
  }

  function emptyCurrentPathState(): CurrentPathAuditState {
    return {
      currentPoint: null,
      deviceBounds: null,
      dirtyBoundsReasons: [],
      maxTransformScale: 1,
      rectangles: [],
      subpathStart: null,
      unsupportedReasons: []
    };
  }

  function resetRecordedPixels(state: ContextAuditState) {
    state.epoch += 1;
    state.order = 0;
    state.resourceLimitReasons = [];
    state.texts = [];
    state.unsupportedRasterReasons = [];
    state.nonTextMutations = [];
    state.nonTextRevision = 0;
  }

  function discardRecordedTextAfterUnsupportedPartialClear(state: ContextAuditState) {
    state.epoch += 1;
    state.order = 0;
    state.texts = [];
    state.nonTextMutations = [];
  }

  function resetRecordedContext(state: ContextAuditState) {
    resetRecordedPixels(state);
    state.clipState = { clips: [], unsupportedReasons: [] };
    state.currentPath = emptyCurrentPathState();
    state.savedClipStates = [];
  }

  function stateFor(context: CanvasRenderingContext2D) {
    let state = contextStates.get(context);
    if (!state) {
      state = {
        canvasId: nextCanvasId,
        clearCount: 0,
        clipState: { clips: [], unsupportedReasons: [] },
        context,
        currentPath: emptyCurrentPathState(),
        drawRevision: 0,
        epoch: 0,
        lastDrawAt: performance.now(),
        nonTextMutations: [],
        nonTextRevision: 0,
        order: 0,
        resourceLimitReasons: [],
        savedClipStates: [],
        texts: [],
        unsupportedRasterReasons: []
      };
      nextCanvasId += 1;
      contextStates.set(context, state);
      canvasStates.set(context.canvas, state);
    }
    return state;
  }

  // Register contexts only when application code explicitly asks for 2D. The
  // analyzer itself never calls canvas.getContext("2d") on an unbound canvas:
  // doing so would permanently prevent that canvas from later becoming WebGL.
  canvasProto.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ...options: unknown[]
  ) {
    const result = Reflect.apply(nativeGetContext, this, [contextId, ...options]);
    if (!suspended && result !== null) {
      const normalized = contextId.toLowerCase();
      const kind: CaliforniaCanvasContextKind = normalized === "2d"
        ? "2d"
        : normalized === "webgl2"
          ? "webgl2"
          : normalized === "webgl" || normalized === "experimental-webgl"
            ? "webgl"
            : normalized === "bitmaprenderer"
              ? "bitmaprenderer"
              : "unknown";
      // A Canvas can acquire only one context mode. Preserve the first
      // successful application acquisition; later same-kind lookups are reads.
      if (!canvasContextKinds.has(this)) canvasContextKinds.set(this, kind);
      if (kind === "2d" && result instanceof CanvasRenderingContext2D) stateFor(result);
    }
    return result;
  } as HTMLCanvasElement["getContext"];

  function nativeTwoDimensionalContext(
    canvas: HTMLCanvasElement,
    options?: CanvasRenderingContext2DSettings
  ) {
    return Reflect.apply(
      nativeGetContext,
      canvas,
      options === undefined ? ["2d"] : ["2d", options]
    ) as CanvasRenderingContext2D | null;
  }

  function transformedPoint(matrix: DOMMatrix | MatrixTuple, x: number, y: number) {
    const a = Array.isArray(matrix) ? matrix[0] : matrix.a;
    const b = Array.isArray(matrix) ? matrix[1] : matrix.b;
    const c = Array.isArray(matrix) ? matrix[2] : matrix.c;
    const d = Array.isArray(matrix) ? matrix[3] : matrix.d;
    const e = Array.isArray(matrix) ? matrix[4] : matrix.e;
    const f = Array.isArray(matrix) ? matrix[5] : matrix.f;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  }

  function finiteMatrixTuple(context: CanvasRenderingContext2D) {
    try {
      const matrix = matrixTuple(context);
      return matrix.every(Number.isFinite)
        ? { matrix, reason: null }
        : { matrix: null, reason: "non-finite transform" };
    } catch (error) {
      return { matrix: null, reason: `unreadable transform (${String(error)})` };
    }
  }

  function transformScaleUpperBound(matrix: MatrixTuple) {
    const [a, b, c, d] = matrix;
    return Math.sqrt(a * a + b * b + c * c + d * d);
  }

  function boundsFromPoints(points: DevicePoint[]): DeviceBounds | null {
    if (points.length === 0 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      return null;
    }
    return {
      bottom: Math.max(...points.map((point) => point.y)),
      left: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y))
    };
  }

  function unionDeviceBounds(left: DeviceBounds | null, right: DeviceBounds | null) {
    if (!left) return right ? { ...right } : null;
    if (!right) return { ...left };
    return {
      bottom: Math.max(left.bottom, right.bottom),
      left: Math.min(left.left, right.left),
      right: Math.max(left.right, right.right),
      top: Math.min(left.top, right.top)
    };
  }

  function expandedDeviceBounds(bounds: DeviceBounds, expansionX: number, expansionY: number) {
    return {
      bottom: bounds.bottom + expansionY,
      left: bounds.left - expansionX,
      right: bounds.right + expansionX,
      top: bounds.top - expansionY
    };
  }

  function transformedRectangleBounds(
    matrix: MatrixTuple,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (![x, y, width, height, ...matrix].every(Number.isFinite)) return null;
    return boundsFromPoints([
      transformedPoint(matrix, x, y),
      transformedPoint(matrix, x + width, y),
      transformedPoint(matrix, x + width, y + height),
      transformedPoint(matrix, x, y + height)
    ]);
  }

  function boundsIntersect(left: DeviceBounds, right: DeviceBounds) {
    return left.left < right.right && right.left < left.right &&
      left.top < right.bottom && right.top < left.bottom;
  }

  function boundsForMaskPixels(pixels: MaskPixel[]) {
    if (pixels.length === 0) return null;
    return boundsFromPoints(pixels.flatMap((pixel) => [
      { x: pixel.x, y: pixel.y },
      { x: pixel.x + 1, y: pixel.y + 1 }
    ]));
  }

  function addPathBounds(state: CurrentPathAuditState, bounds: DeviceBounds | null) {
    if (!bounds) return;
    state.deviceBounds = unionDeviceBounds(state.deviceBounds, bounds);
  }

  function appendPathDirtyReason(state: CurrentPathAuditState, reason: string) {
    appendUniqueReason(state.dirtyBoundsReasons, reason);
  }

  function recordPathTransformScale(state: CurrentPathAuditState, matrix: MatrixTuple) {
    const scale = transformScaleUpperBound(matrix);
    if (Number.isFinite(scale)) state.maxTransformScale = Math.max(state.maxTransformScale, scale);
    else appendPathDirtyReason(state, "current path uses a non-finite transform scale");
  }

  function pathMatrix(
    context: CanvasRenderingContext2D,
    state: CurrentPathAuditState,
    operation: string
  ) {
    const result = finiteMatrixTuple(context);
    if (!result.matrix) {
      appendPathDirtyReason(state, `${operation} uses ${result.reason ?? "an indeterminate transform"}`);
      return null;
    }
    recordPathTransformScale(state, result.matrix);
    return result.matrix;
  }

  function recordPathPoint(
    state: CurrentPathAuditState,
    matrix: MatrixTuple,
    x: number,
    y: number
  ) {
    if (![x, y].every(Number.isFinite)) return null;
    const point = transformedPoint(matrix, x, y);
    if (![point.x, point.y].every(Number.isFinite)) return null;
    return point;
  }

  function inverseTransformedPoint(matrix: MatrixTuple, point: DevicePoint) {
    const [a, b, c, d, e, f] = matrix;
    const determinant = a * d - b * c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
    const translatedX = point.x - e;
    const translatedY = point.y - f;
    const result = {
      x: (d * translatedX - c * translatedY) / determinant,
      y: (-b * translatedX + a * translatedY) / determinant
    };
    return Number.isFinite(result.x) && Number.isFinite(result.y) ? result : null;
  }

  function paintFootprint(
    context: CanvasRenderingContext2D,
    sourceBounds: DeviceBounds,
    strokeExpansion = 0
  ): { bounds: DeviceBounds | null; unsupportedReason: string | null } {
    if (context.globalCompositeOperation !== "source-over") {
      return {
        bounds: null,
        unsupportedReason: `composite operation ${context.globalCompositeOperation} has destination-wide effects or unproven bounds`
      };
    }
    const matrixResult = finiteMatrixTuple(context);
    if (!matrixResult.matrix) {
      return { bounds: null, unsupportedReason: matrixResult.reason ?? "indeterminate transform" };
    }
    const numericState = [
      context.shadowBlur,
      context.shadowOffsetX,
      context.shadowOffsetY,
      strokeExpansion
    ];
    if (!numericState.every(Number.isFinite)) {
      return { bounds: null, unsupportedReason: "non-finite shadow or stroke expansion" };
    }
    const filterBounds = filterExpansion(context.filter);
    if (filterBounds.reasons.length > 0) {
      return { bounds: null, unsupportedReason: filterBounds.reasons.join("; ") };
    }
    const expansionX = 1 + Math.max(0, strokeExpansion) + Math.abs(context.shadowOffsetX) +
      context.shadowBlur * 4 + filterBounds.expansion;
    const expansionY = 1 + Math.max(0, strokeExpansion) + Math.abs(context.shadowOffsetY) +
      context.shadowBlur * 4 + filterBounds.expansion;
    return {
      bounds: expandedDeviceBounds(sourceBounds, expansionX, expansionY),
      unsupportedReason: null
    };
  }

  function noteNonTextMutation(
    state: ContextAuditState,
    operation: string,
    result: { bounds: DeviceBounds | null; unsupportedReason: string | null } | null
  ) {
    state.nonTextRevision += 1;
    if (state.texts.length === 0 || result === null) return;
    if (state.nonTextMutations.length >= MAX_POST_TEXT_RASTER_MUTATIONS) {
      appendUniqueReason(
        state.resourceLimitReasons,
        `Canvas post-text raster recorder exceeded ${MAX_POST_TEXT_RASTER_MUTATIONS} mutations without a proven full-buffer reset`
      );
      return;
    }
    state.nonTextMutations.push({
      bounds: result.bounds ? { ...result.bounds } : null,
      operation,
      revision: state.nonTextRevision,
      unsupportedReason: result.unsupportedReason
    });
  }

  function clearCoversBackingBuffer(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (![x, y, width, height].every(Number.isFinite)) return false;
    const matrix = context.getTransform();
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return false;
    const localCorners = [
      [0, 0],
      [context.canvas.width, 0],
      [context.canvas.width, context.canvas.height],
      [0, context.canvas.height]
    ].map(([canvasX, canvasY]) => {
      const translatedX = canvasX - matrix.e;
      const translatedY = canvasY - matrix.f;
      return {
        x: (matrix.d * translatedX - matrix.c * translatedY) / determinant,
        y: (-matrix.b * translatedX + matrix.a * translatedY) / determinant
      };
    });
    const minimumX = Math.min(x, x + width);
    const maximumX = Math.max(x, x + width);
    const minimumY = Math.min(y, y + height);
    const maximumY = Math.max(y, y + height);
    const tolerance = 0.01;
    return localCorners.every((point) =>
      point.x >= minimumX - tolerance && point.x <= maximumX + tolerance &&
      point.y >= minimumY - tolerance && point.y <= maximumY + tolerance
    );
  }

  proto.clearRect = function (x, y, width, height) {
    if (!suspended) {
      const state = stateFor(this);
      // clearRect obeys the current clip. A full-size clear under any active
      // clip is not proof that the entire backing buffer was erased.
      if (
        state.clipState.clips.length === 0 &&
        state.clipState.unsupportedReasons.length === 0 &&
        clearCoversBackingBuffer(this, x, y, width, height)
      ) {
        // clearRect erases pixels but does not reset the current path, clipping
        // region, or save/restore stack.
        resetRecordedPixels(state);
      } else {
        const matrixResult = finiteMatrixTuple(this);
        const rectangle = matrixResult.matrix
          ? transformedRectangleBounds(matrixResult.matrix, x, y, width, height)
          : null;
        const mutation = rectangle
          ? { bounds: expandedDeviceBounds(rectangle, 1, 1), unsupportedReason: null }
          : { bounds: null, unsupportedReason: matrixResult.reason ?? "clearRect bounds are indeterminate" };
        const intersectsRecordedProxy = mutation.bounds !== null && state.texts.some((record) =>
          record.glyphBoundsProxy !== null && boundsIntersect(mutation.bounds!, record.glyphBoundsProxy)
        );
        if (mutation.unsupportedReason) {
          appendUniqueReason(
            state.unsupportedRasterReasons,
            `A partial or clipped clearRect has indeterminate device bounds: ${mutation.unsupportedReason}`
          );
        } else if (intersectsRecordedProxy) {
          appendUniqueReason(
            state.unsupportedRasterReasons,
            "A partial or clipped clearRect dirty region intersects a recorded glyph proxy; exact surviving glyph geometry cannot be proven"
          );
          // Preserve the bounded animation contract once a partial clear is
          // already known to touch recorded text. Disjoint partial clears keep
          // their records and are checked against the terminal mask instead.
          discardRecordedTextAfterUnsupportedPartialClear(state);
        }
        noteNonTextMutation(state, "clearRect(...)", mutation);
      }
      state.clearCount += 1;
      markRasterMutation(state);
    }
    return Reflect.apply(nativeClearRect, this, [x, y, width, height]);
  };

  // Assigning either backing-buffer dimension resets the real 2D context even
  // when the assigned value is unchanged. Track that reset without calling
  // getContext() from the setter (which could otherwise steal a WebGL canvas).
  for (const dimension of ["width", "height"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension);
    if (!descriptor?.get || !descriptor.set) continue;
    Object.defineProperty(HTMLCanvasElement.prototype, dimension, {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(this: HTMLCanvasElement, value: number) {
        Reflect.apply(descriptor.set!, this, [value]);
        const state = canvasStates.get(this);
        if (state && !suspended) {
          resetRecordedContext(state);
          state.clearCount += 1;
          markRasterMutation(state);
        }
      }
    });
  }

  function recordAttributeDimensionReset(canvas: HTMLCanvasElement, name: string) {
    if (name.toLowerCase() !== "width" && name.toLowerCase() !== "height") return;
    const state = canvasStates.get(canvas);
    if (!state || suspended) return;
    resetRecordedContext(state);
    state.clearCount += 1;
    markRasterMutation(state);
  }

  canvasProto.setAttribute = function (name: string, value: string) {
    const result = Reflect.apply(nativeSetAttribute, this, [name, value]);
    recordAttributeDimensionReset(this, name);
    return result;
  };

  canvasProto.removeAttribute = function (name: string) {
    const result = Reflect.apply(nativeRemoveAttribute, this, [name]);
    recordAttributeDimensionReset(this, name);
    return result;
  };

  const mutableContextPrototype = proto as unknown as Record<string, (...args: unknown[]) => unknown>;
  const nativeReset = mutableContextPrototype.reset;
  if (typeof nativeReset === "function") {
    mutableContextPrototype.reset = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = Reflect.apply(nativeReset, this, args);
      if (!suspended) {
        const state = stateFor(this);
        resetRecordedContext(state);
        state.clearCount += 1;
        markRasterMutation(state);
      }
      return result;
    };
  }

  function matrixTuple(context: CanvasRenderingContext2D): MatrixTuple {
    const matrix = context.getTransform();
    return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
  }

  function cloneClipState(state: ClipAuditState): ClipAuditState {
    return {
      clips: state.clips.map((clip) => ({
        fillRule: clip.fillRule,
        rectangles: clip.rectangles.map((rectangle) => ({
          ...rectangle,
          transform: [...rectangle.transform] as MatrixTuple
        }))
      })),
      unsupportedReasons: [...state.unsupportedReasons]
    };
  }

  proto.save = function () {
    const result = Reflect.apply(nativeSave, this, []);
    if (!suspended) {
      const state = stateFor(this);
      state.savedClipStates.push(cloneClipState(state.clipState));
    }
    return result;
  };

  proto.restore = function () {
    const result = Reflect.apply(nativeRestore, this, []);
    if (!suspended) {
      const state = stateFor(this);
      const restoredClipState = state.savedClipStates.pop();
      if (restoredClipState) state.clipState = restoredClipState;
    }
    return result;
  };

  proto.beginPath = function () {
    const result = Reflect.apply(nativeBeginPath, this, []);
    if (!suspended) {
      stateFor(this).currentPath = emptyCurrentPathState();
    }
    return result;
  };

  proto.rect = function (x, y, width, height) {
    const result = Reflect.apply(nativeRect, this, [x, y, width, height]);
    if (!suspended) {
      const path = stateFor(this).currentPath;
      const matrix = pathMatrix(this, path, "rect(...)");
      if (matrix) {
        const bounds = transformedRectangleBounds(matrix, x, y, width, height);
        if (bounds) {
          addPathBounds(path, bounds);
          path.rectangles.push({ height, transform: matrix, width, x, y });
          const start = recordPathPoint(path, matrix, x, y);
          path.currentPoint = start;
          path.subpathStart = start;
        } else {
          appendPathDirtyReason(path, "rect(...) has non-finite geometry");
          appendUniqueReason(path.unsupportedReasons, "rect(...) has non-finite geometry and cannot be replayed");
        }
      } else {
        appendUniqueReason(path.unsupportedReasons, "rect(...) uses an indeterminate transform and cannot be replayed");
      }
    }
    return result;
  };

  proto.clip = function (this: CanvasRenderingContext2D, ...args: Parameters<CanvasRenderingContext2D["clip"]>) {
    const result = Reflect.apply(nativeClip, this, args);
    if (!suspended) {
      const state = stateFor(this);
      const firstArgument = args[0] as Path2D | CanvasFillRule | undefined;
      const usesCurrentPath = firstArgument === undefined || typeof firstArgument === "string";
      if (!usesCurrentPath) {
        state.clipState.unsupportedReasons.push(
          "clip(Path2D, fillRule?) cannot be inspected or replayed by the Canvas audit"
        );
      } else if (state.currentPath.unsupportedReasons.length > 0) {
        state.clipState.unsupportedReasons.push(...state.currentPath.unsupportedReasons);
      } else {
        state.clipState.clips.push({
          fillRule: typeof firstArgument === "string" ? firstArgument : "nonzero",
          rectangles: state.currentPath.rectangles.map((rectangle) => ({
            ...rectangle,
            transform: [...rectangle.transform] as MatrixTuple
          }))
        });
      }
    }
    return result;
  } as CanvasRenderingContext2D["clip"];

  const mutablePrototype = proto as unknown as Record<string, (...args: unknown[]) => unknown>;

  function markNonRectangularPath(path: CurrentPathAuditState, methodName: string) {
    appendUniqueReason(
      path.unsupportedReasons,
      `${methodName}(...) created a non-rectangular current path that cannot be replayed exactly`
    );
  }

  function finitePathNumbers(path: CurrentPathAuditState, operation: string, values: unknown[]) {
    if (values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return values as number[];
    }
    appendPathDirtyReason(path, `${operation} uses non-finite or non-numeric coordinates`);
    return null;
  }

  function pathMethod(methodName: string, record: (
    context: CanvasRenderingContext2D,
    path: CurrentPathAuditState,
    args: unknown[]
  ) => void) {
    const nativeMethod = mutablePrototype[methodName];
    if (typeof nativeMethod !== "function") return;
    mutablePrototype[methodName] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = Reflect.apply(nativeMethod, this, args);
      if (!suspended) {
        const path = stateFor(this).currentPath;
        markNonRectangularPath(path, methodName);
        record(this, path, args);
      }
      return result;
    };
  }

  pathMethod("moveTo", (context, path, args) => {
    const numbers = finitePathNumbers(path, "moveTo(...)", args.slice(0, 2));
    const matrix = pathMatrix(context, path, "moveTo(...)");
    if (!numbers || !matrix) return;
    const point = recordPathPoint(path, matrix, numbers[0], numbers[1]);
    if (!point) {
      appendPathDirtyReason(path, "moveTo(...) produced an indeterminate device point");
      return;
    }
    path.currentPoint = point;
    path.subpathStart = point;
  });

  pathMethod("lineTo", (context, path, args) => {
    const numbers = finitePathNumbers(path, "lineTo(...)", args.slice(0, 2));
    const matrix = pathMatrix(context, path, "lineTo(...)");
    if (!numbers || !matrix) return;
    const point = recordPathPoint(path, matrix, numbers[0], numbers[1]);
    if (!point) {
      appendPathDirtyReason(path, "lineTo(...) produced an indeterminate device point");
      return;
    }
    if (path.currentPoint) addPathBounds(path, boundsFromPoints([path.currentPoint, point]));
    else path.subpathStart = point;
    path.currentPoint = point;
  });

  pathMethod("quadraticCurveTo", (context, path, args) => {
    const numbers = finitePathNumbers(path, "quadraticCurveTo(...)", args.slice(0, 4));
    const matrix = pathMatrix(context, path, "quadraticCurveTo(...)");
    if (!numbers || !matrix) return;
    const control = recordPathPoint(path, matrix, numbers[0], numbers[1]);
    const end = recordPathPoint(path, matrix, numbers[2], numbers[3]);
    if (!control || !end || !path.currentPoint) {
      appendPathDirtyReason(path, "quadraticCurveTo(...) has no provable finite current/control/end points");
      return;
    }
    // A Bezier curve stays inside the convex hull of its control points.
    addPathBounds(path, boundsFromPoints([path.currentPoint, control, end]));
    path.currentPoint = end;
  });

  pathMethod("bezierCurveTo", (context, path, args) => {
    const numbers = finitePathNumbers(path, "bezierCurveTo(...)", args.slice(0, 6));
    const matrix = pathMatrix(context, path, "bezierCurveTo(...)");
    if (!numbers || !matrix) return;
    const firstControl = recordPathPoint(path, matrix, numbers[0], numbers[1]);
    const secondControl = recordPathPoint(path, matrix, numbers[2], numbers[3]);
    const end = recordPathPoint(path, matrix, numbers[4], numbers[5]);
    if (!firstControl || !secondControl || !end || !path.currentPoint) {
      appendPathDirtyReason(path, "bezierCurveTo(...) has no provable finite current/control/end points");
      return;
    }
    addPathBounds(path, boundsFromPoints([path.currentPoint, firstControl, secondControl, end]));
    path.currentPoint = end;
  });

  pathMethod("arc", (context, path, args) => {
    const numbers = finitePathNumbers(path, "arc(...)", args.slice(0, 5));
    const matrix = pathMatrix(context, path, "arc(...)");
    if (!numbers || !matrix) return;
    const [x, y, radius, startAngle, endAngle] = numbers;
    const circleBounds = transformedRectangleBounds(matrix, x - radius, y - radius, radius * 2, radius * 2);
    const start = recordPathPoint(path, matrix, x + radius * Math.cos(startAngle), y + radius * Math.sin(startAngle));
    const end = recordPathPoint(path, matrix, x + radius * Math.cos(endAngle), y + radius * Math.sin(endAngle));
    if (!circleBounds || !start || !end) {
      appendPathDirtyReason(path, "arc(...) produced indeterminate device bounds");
      return;
    }
    addPathBounds(path, circleBounds);
    if (path.currentPoint) addPathBounds(path, boundsFromPoints([path.currentPoint, start]));
    else path.subpathStart = start;
    path.currentPoint = end;
  });

  pathMethod("ellipse", (context, path, args) => {
    const numbers = finitePathNumbers(path, "ellipse(...)", args.slice(0, 7));
    const matrix = pathMatrix(context, path, "ellipse(...)");
    if (!numbers || !matrix) return;
    const [x, y, radiusX, radiusY, rotation, startAngle, endAngle] = numbers;
    // The rotated ellipse is contained by a square whose half-extent is the
    // larger radius; transforming that square is deliberately conservative.
    const radius = Math.max(radiusX, radiusY);
    const ellipseBounds = transformedRectangleBounds(matrix, x - radius, y - radius, radius * 2, radius * 2);
    const localPoint = (angle: number) => ({
      x: x + radiusX * Math.cos(angle) * Math.cos(rotation) - radiusY * Math.sin(angle) * Math.sin(rotation),
      y: y + radiusX * Math.cos(angle) * Math.sin(rotation) + radiusY * Math.sin(angle) * Math.cos(rotation)
    });
    const localStart = localPoint(startAngle);
    const localEnd = localPoint(endAngle);
    const start = recordPathPoint(path, matrix, localStart.x, localStart.y);
    const end = recordPathPoint(path, matrix, localEnd.x, localEnd.y);
    if (!ellipseBounds || !start || !end) {
      appendPathDirtyReason(path, "ellipse(...) produced indeterminate device bounds");
      return;
    }
    addPathBounds(path, ellipseBounds);
    if (path.currentPoint) addPathBounds(path, boundsFromPoints([path.currentPoint, start]));
    else path.subpathStart = start;
    path.currentPoint = end;
  });

  pathMethod("roundRect", (context, path, args) => {
    const numbers = finitePathNumbers(path, "roundRect(...)", args.slice(0, 4));
    const matrix = pathMatrix(context, path, "roundRect(...)");
    if (!numbers || !matrix) return;
    const [x, y, width, height] = numbers;
    const bounds = transformedRectangleBounds(matrix, x, y, width, height);
    const start = recordPathPoint(path, matrix, x, y);
    if (!bounds || !start) {
      appendPathDirtyReason(path, "roundRect(...) produced indeterminate device bounds");
      return;
    }
    addPathBounds(path, bounds);
    path.currentPoint = start;
    path.subpathStart = start;
  });

  pathMethod("arcTo", (context, path, args) => {
    const numbers = finitePathNumbers(path, "arcTo(...)", args.slice(0, 5));
    const matrix = pathMatrix(context, path, "arcTo(...)");
    if (!numbers || !matrix) return;
    const [x1, y1, x2, y2, radius] = numbers;
    const first = recordPathPoint(path, matrix, x1, y1);
    if (!first) {
      appendPathDirtyReason(path, "arcTo(...) produced an indeterminate first point");
      return;
    }
    if (!path.currentPoint) {
      path.currentPoint = first;
      path.subpathStart = first;
      return;
    }
    const current = inverseTransformedPoint(matrix, path.currentPoint);
    if (!current) {
      appendPathDirtyReason(path, "arcTo(...) cannot invert the current transform for its existing path point");
      return;
    }
    const fromFirst = { x: current.x - x1, y: current.y - y1 };
    const toSecond = { x: x2 - x1, y: y2 - y1 };
    const fromLength = Math.hypot(fromFirst.x, fromFirst.y);
    const toLength = Math.hypot(toSecond.x, toSecond.y);
    if (radius === 0 || fromLength === 0 || toLength === 0) {
      addPathBounds(path, boundsFromPoints([path.currentPoint, first]));
      path.currentPoint = first;
      return;
    }
    const firstUnit = { x: fromFirst.x / fromLength, y: fromFirst.y / fromLength };
    const secondUnit = { x: toSecond.x / toLength, y: toSecond.y / toLength };
    const unitCross = firstUnit.x * secondUnit.y - firstUnit.y * secondUnit.x;
    const dot = Math.max(-1, Math.min(1, firstUnit.x * secondUnit.x + firstUnit.y * secondUnit.y));
    if (unitCross === 0) {
      addPathBounds(path, boundsFromPoints([path.currentPoint, first]));
      path.currentPoint = first;
      return;
    }
    const halfAngle = Math.acos(dot) / 2;
    const sine = Math.sin(halfAngle);
    const tangent = Math.tan(halfAngle);
    const bisector = { x: firstUnit.x + secondUnit.x, y: firstUnit.y + secondUnit.y };
    const bisectorLength = Math.hypot(bisector.x, bisector.y);
    if (sine < 1e-12 || Math.abs(tangent) < 1e-12 || bisectorLength < 1e-12) {
      appendPathDirtyReason(path, "arcTo(...) has numerically indeterminate tangent geometry");
      return;
    }
    const tangentDistance = radius / tangent;
    const centerDistance = radius / sine;
    const firstTangent = {
      x: x1 + firstUnit.x * tangentDistance,
      y: y1 + firstUnit.y * tangentDistance
    };
    const secondTangent = {
      x: x1 + secondUnit.x * tangentDistance,
      y: y1 + secondUnit.y * tangentDistance
    };
    const center = {
      x: x1 + bisector.x / bisectorLength * centerDistance,
      y: y1 + bisector.y / bisectorLength * centerDistance
    };
    const circleBounds = transformedRectangleBounds(
      matrix,
      center.x - radius,
      center.y - radius,
      radius * 2,
      radius * 2
    );
    const firstTangentDevice = recordPathPoint(path, matrix, firstTangent.x, firstTangent.y);
    const secondTangentDevice = recordPathPoint(path, matrix, secondTangent.x, secondTangent.y);
    if (!circleBounds || !firstTangentDevice || !secondTangentDevice) {
      appendPathDirtyReason(path, "arcTo(...) produced indeterminate tangent bounds");
      return;
    }
    addPathBounds(path, circleBounds);
    addPathBounds(path, boundsFromPoints([path.currentPoint, firstTangentDevice]));
    path.currentPoint = secondTangentDevice;
  });

  proto.closePath = function () {
    const result = Reflect.apply(nativeClosePath, this, []);
    if (!suspended) {
      const path = stateFor(this).currentPath;
      if (path.currentPoint && path.subpathStart) {
        addPathBounds(path, boundsFromPoints([path.currentPoint, path.subpathStart]));
        path.currentPoint = path.subpathStart;
      }
    }
    return result;
  };

  function buildTextRecord(
    context: CanvasRenderingContext2D,
    mode: "fill" | "stroke",
    text: string,
    x: number,
    y: number,
    order: number,
    maxWidth?: number
  ): TextRecord {
    const state = stateFor(context);
    const dynamicContext = context as unknown as Record<string, unknown>;
    const optionalString = (property: string) => {
      const value = dynamicContext[property];
      return typeof value === "string" ? value : undefined;
    };
    return {
      clipState: cloneClipState(state.clipState),
      direction: context.direction,
      filter: context.filter,
      font: context.font,
      fontKerning: optionalString("fontKerning"),
      fontStretch: optionalString("fontStretch"),
      fontVariantCaps: optionalString("fontVariantCaps"),
      globalAlpha: context.globalAlpha,
      globalCompositeOperation: context.globalCompositeOperation,
      glyphBoundsProxy: null,
      lang: optionalString("lang"),
      letterSpacing: optionalString("letterSpacing"),
      lineJoin: context.lineJoin,
      lineWidth: context.lineWidth,
      maxWidth,
      miterLimit: context.miterLimit,
      mode,
      order,
      paintStyle: mode === "fill" ? context.fillStyle : context.strokeStyle,
      prePaintContrast: { bounds: null, destinationPixels: [], unsupportedReasons: [] },
      nonTextRevisionAtPaint: state.nonTextRevision,
      shadowBlur: context.shadowBlur,
      shadowColor: context.shadowColor,
      shadowOffsetX: context.shadowOffsetX,
      shadowOffsetY: context.shadowOffsetY,
      text,
      textAlign: context.textAlign,
      textBaseline: context.textBaseline,
      textRendering: optionalString("textRendering"),
      transform: matrixTuple(context),
      wordSpacing: optionalString("wordSpacing"),
      x,
      y
    };
  }

  function prepareTextRecord(
    context: CanvasRenderingContext2D,
    mode: "fill" | "stroke",
    text: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    if (suspended || text.trim() === "") return null;
    const state = stateFor(context);
    if (state.texts.length >= MAX_TEXT_RECORDS_PER_CANVAS) return null;
    const record = buildTextRecord(context, mode, text, x, y, state.order + 1, maxWidth);
    record.prePaintContrast = capturePrePaintContrast(context, record);
    const evidenceBounds = record.prePaintContrast.bounds;
    record.glyphBoundsProxy = evidenceBounds
      ? {
          bottom: evidenceBounds.y + evidenceBounds.height,
          left: evidenceBounds.x,
          right: evidenceBounds.x + evidenceBounds.width,
          top: evidenceBounds.y
        }
      : null;
    return record;
  }

  function recordText(
    context: CanvasRenderingContext2D,
    mode: "fill" | "stroke",
    text: string,
    x: number,
    y: number,
    maxWidth: number | undefined,
    preparedRecord: TextRecord | null
  ) {
    if (suspended || text.trim() === "") return;
    const state = stateFor(context);
    markRasterMutation(state);
    if (state.texts.length >= MAX_TEXT_RECORDS_PER_CANVAS) {
      appendUniqueReason(
        state.resourceLimitReasons,
        `Canvas text recorder exceeded ${MAX_TEXT_RECORDS_PER_CANVAS} records without a proven full-buffer reset`
      );
      return;
    }
    state.order += 1;
    const record = preparedRecord ?? buildTextRecord(context, mode, text, x, y, state.order, maxWidth);
    record.order = state.order;
    state.texts.push(record);
  }

  proto.fillText = function (text, x, y, maxWidth) {
    const stringText = String(text);
    const preparedRecord = prepareTextRecord(this, "fill", stringText, x, y, maxWidth);
    const result = maxWidth === undefined
      ? Reflect.apply(nativeFillText, this, [text, x, y])
      : Reflect.apply(nativeFillText, this, [text, x, y, maxWidth]);
    recordText(this, "fill", stringText, x, y, maxWidth, preparedRecord);
    return result;
  };

  proto.strokeText = function (text, x, y, maxWidth) {
    const stringText = String(text);
    const preparedRecord = prepareTextRecord(this, "stroke", stringText, x, y, maxWidth);
    const result = maxWidth === undefined
      ? Reflect.apply(nativeStrokeText, this, [text, x, y])
      : Reflect.apply(nativeStrokeText, this, [text, x, y, maxWidth]);
    recordText(this, "stroke", stringText, x, y, maxWidth, preparedRecord);
    return result;
  };

  function rectangleRasterMutation(
    context: CanvasRenderingContext2D,
    args: unknown[],
    stroke: boolean
  ): { bounds: DeviceBounds | null; unsupportedReason: string | null } {
    const values = args.slice(0, 4);
    if (values.length !== 4 || !values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return { bounds: null, unsupportedReason: "rectangle coordinates are non-finite or non-numeric" };
    }
    const matrixResult = finiteMatrixTuple(context);
    if (!matrixResult.matrix) {
      return { bounds: null, unsupportedReason: matrixResult.reason ?? "indeterminate transform" };
    }
    const [x, y, width, height] = values as number[];
    const sourceBounds = transformedRectangleBounds(matrixResult.matrix, x, y, width, height);
    if (!sourceBounds) return { bounds: null, unsupportedReason: "rectangle device bounds are indeterminate" };
    const strokeExpansion = stroke
      ? context.lineWidth * Math.max(1, context.miterLimit) * transformScaleUpperBound(matrixResult.matrix) / 2
      : 0;
    return paintFootprint(context, sourceBounds, strokeExpansion);
  }

  function currentPathRasterMutation(
    context: CanvasRenderingContext2D,
    state: ContextAuditState,
    methodName: "fill" | "stroke",
    args: unknown[]
  ) {
    const firstArgument = args[0];
    if (firstArgument !== undefined && typeof firstArgument !== "string") {
      return {
        bounds: null,
        unsupportedReason: `${methodName}(Path2D) bounds are opaque to the Canvas recorder`
      };
    }
    const path = state.currentPath;
    if (path.dirtyBoundsReasons.length > 0) {
      return {
        bounds: null,
        unsupportedReason: `${methodName}(current path) bounds are indeterminate: ${path.dirtyBoundsReasons.join("; ")}`
      };
    }
    if (!path.deviceBounds) return null;
    const matrixResult = finiteMatrixTuple(context);
    if (!matrixResult.matrix) {
      return { bounds: null, unsupportedReason: matrixResult.reason ?? "indeterminate transform" };
    }
    const strokeExpansion = methodName === "stroke"
      ? context.lineWidth * Math.max(1, context.miterLimit) *
        Math.max(path.maxTransformScale, transformScaleUpperBound(matrixResult.matrix)) / 2
      : 0;
    return paintFootprint(context, path.deviceBounds, strokeExpansion);
  }

  for (const methodName of ["fill", "stroke"] as const) {
    const nativeMethod = mutableContextPrototype[methodName];
    if (typeof nativeMethod !== "function") continue;
    mutableContextPrototype[methodName] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = Reflect.apply(nativeMethod, this, args);
      if (!suspended) {
        const state = stateFor(this);
        const mutation = currentPathRasterMutation(this, state, methodName, args);
        noteNonTextMutation(
          state,
          typeof args[0] === "object" ? `${methodName}(Path2D)` : `${methodName}(current path)`,
          mutation
        );
        markRasterMutation(state);
      }
      return result;
    };
  }

  for (const methodName of ["fillRect", "strokeRect"] as const) {
    const nativeMethod = mutableContextPrototype[methodName];
    if (typeof nativeMethod !== "function") continue;
    mutableContextPrototype[methodName] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = Reflect.apply(nativeMethod, this, args);
      if (!suspended) {
        const state = stateFor(this);
        noteNonTextMutation(state, `${methodName}(...)`, rectangleRasterMutation(this, args, methodName === "strokeRect"));
        markRasterMutation(state);
      }
      return result;
    };
  }

  const nativePutImageData = mutableContextPrototype.putImageData;
  if (typeof nativePutImageData === "function") {
    mutableContextPrototype.putImageData = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      const result = Reflect.apply(nativePutImageData, this, args);
      if (!suspended) {
        const state = stateFor(this);
        const imageData = args[0];
        const dx = args[1];
        const dy = args[2];
        const sourceBounds = imageData instanceof ImageData && typeof dx === "number" && Number.isFinite(dx) &&
          typeof dy === "number" && Number.isFinite(dy)
          ? {
              bottom: dy + imageData.height,
              left: dx,
              right: dx + imageData.width,
              top: dy
            }
          : null;
        noteNonTextMutation(
          state,
          "putImageData(...)",
          sourceBounds
            ? { bounds: expandedDeviceBounds(sourceBounds, 1, 1), unsupportedReason: null }
            : { bounds: null, unsupportedReason: "putImageData source or destination bounds are indeterminate" }
        );
        markRasterMutation(state);
      }
      return result;
    };
  }

  proto.drawImage = function (
    this: CanvasRenderingContext2D,
    ...args: Parameters<CanvasRenderingContext2D["drawImage"]>
  ) {
    const result = Reflect.apply(nativeDrawImage, this, args);
    if (!suspended) {
      const state = stateFor(this);
      noteNonTextMutation(state, "drawImage(...)", {
        bounds: null,
        unsupportedReason: "drawImage(...) image sampling, source cropping, and transformed destination bounds are indeterminate"
      });
      markRasterMutation(state);
      const source = args[0];
      if (source instanceof HTMLCanvasElement) {
        const sourceState = canvasStates.get(source);
        if (
          sourceState &&
          (
            sourceState.texts.length > 0 ||
            sourceState.resourceLimitReasons.length > 0 ||
            sourceState.unsupportedRasterReasons.length > 0
          )
        ) {
          appendUniqueReason(
            state.unsupportedRasterReasons,
            `drawImage(Canvas ${sourceState.canvasId}) copied recorded or indeterminate text; transformed text propagation is unsupported`
          );
        }
      }
    }
    return result;
  } as CanvasRenderingContext2D["drawImage"];

  type VisualRect = {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  };

  function intersectVisualRects(left: VisualRect, right: VisualRect): VisualRect | null {
    const x = Math.max(left.left, right.left);
    const y = Math.max(left.top, right.top);
    const rightEdge = Math.min(left.right, right.right);
    const bottom = Math.min(left.bottom, right.bottom);
    if (rightEdge <= x || bottom <= y) return null;
    return {
      bottom,
      height: bottom - y,
      left: x,
      right: rightEdge,
      top: y,
      width: rightEdge - x
    };
  }

  function effectiveVisualRect(element: Element, initialRect: VisualRect = element.getBoundingClientRect()) {
    // Off-screen layout remains auditable: Playwright can scroll a Locator into
    // view later, and viewport coordinates are still comparable. Only actual
    // CSS/ancestor clipping removes painted geometry here.
    let rect: VisualRect | null = initialRect.width > 0 && initialRect.height > 0 ? initialRect : null;
    if (!rect) return null;

    let current: Element | null = element;
    while (current) {
      const target = current as HTMLElement;
      const style = getComputedStyle(current);
      // aria-hidden and inert affect semantics/interaction, not paint. They must
      // not remove visually rendered text from a collision audit.
      if (
        target.hidden || style.display === "none" || style.contentVisibility === "hidden" ||
        Number(style.opacity) <= 0 ||
        (current === element && (style.visibility === "hidden" || style.visibility === "collapse"))
      ) return null;

      if (current !== element) {
        const clipX = ["auto", "clip", "hidden", "scroll"].includes(style.overflowX);
        const clipY = ["auto", "clip", "hidden", "scroll"].includes(style.overflowY);
        if (clipX || clipY) {
          const ancestorRect = current.getBoundingClientRect();
          const clipRect: VisualRect = {
            bottom: clipY ? ancestorRect.bottom : rect.bottom,
            height: clipY ? ancestorRect.height : rect.height,
            left: clipX ? ancestorRect.left : rect.left,
            right: clipX ? ancestorRect.right : rect.right,
            top: clipY ? ancestorRect.top : rect.top,
            width: clipX ? ancestorRect.width : rect.width
          };
          rect = intersectVisualRects(rect, clipRect);
          if (!rect) return null;
        }
      }
      current = current.parentElement;
    }
    return rect;
  }

  function isVisible(element: Element) {
    return effectiveVisualRect(element) !== null;
  }

  function visibleCanvases(root: HTMLElement, canvasSelector?: string) {
    if (canvasSelector) {
      const selected = [
        ...(root instanceof HTMLCanvasElement && root.matches(canvasSelector) ? [root] : []),
        ...Array.from(root.querySelectorAll(canvasSelector)).filter(
          (element): element is HTMLCanvasElement => element instanceof HTMLCanvasElement
        )
      ];
      return Array.from(new Set(selected)).filter(isVisible);
    }
    const canvases = [
      ...(root instanceof HTMLCanvasElement ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLCanvasElement>("canvas"))
    ];
    return Array.from(new Set(canvases)).filter(isVisible);
  }

  function canvasViewportMappingReasons(canvas: HTMLCanvasElement) {
    const reasons: string[] = [];
    const style = getComputedStyle(canvas);
    const boxLengths = [
      style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth,
      style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft
    ].map((value) => Number.parseFloat(value) || 0);
    if (boxLengths.some((value) => Math.abs(value) > 0.01)) {
      reasons.push("Canvas viewport mapping with CSS border or padding is unsupported");
    }

    for (let current: Element | null = canvas; current; current = current.parentElement) {
      const currentStyle = getComputedStyle(current);
      if (currentStyle.perspective !== "none") {
        reasons.push("Canvas viewport mapping below CSS perspective is unsupported");
      }
      if (currentStyle.transform !== "none") {
        try {
          const matrix = new DOMMatrixReadOnly(currentStyle.transform);
          const simplePositiveScaleOrTranslation = matrix.is2D &&
            Math.abs(matrix.b) <= 1e-7 && Math.abs(matrix.c) <= 1e-7 &&
            matrix.a > 0 && matrix.d > 0;
          if (!simplePositiveScaleOrTranslation) {
            reasons.push(`Canvas viewport mapping below non-axis-aligned CSS transform ${currentStyle.transform} is unsupported`);
          }
        } catch {
          reasons.push(`Canvas viewport mapping below unreadable CSS transform ${currentStyle.transform} is unsupported`);
        }
      }
    }
    return Array.from(new Set(reasons));
  }

  function decorativePairKey(record: TextRecord) {
    return JSON.stringify([
      record.text,
      record.x,
      record.y,
      record.maxWidth ?? null,
      record.font,
      record.textAlign,
      record.textBaseline,
      record.direction,
      record.filter,
      record.fontKerning,
      record.fontStretch,
      record.fontVariantCaps,
      record.lang,
      record.letterSpacing,
      record.lineJoin,
      record.lineWidth,
      record.miterLimit,
      record.shadowBlur,
      record.shadowColor,
      record.shadowOffsetX,
      record.shadowOffsetY,
      record.textRendering,
      record.wordSpacing,
      record.globalAlpha,
      record.globalCompositeOperation,
      record.transform,
      record.clipState
    ]);
  }

  function hasTransparentShadow(record: TextRecord) {
    return record.shadowBlur === 0 && record.shadowOffsetX === 0 && record.shadowOffsetY === 0 &&
      /(?:rgba\([^)]*,\s*0(?:\.0+)?\)|transparent)/i.test(record.shadowColor);
  }

  function isDecorativePair(previous: TextLayer, record: TextRecord) {
    return !previous.decorativePairComplete && previous.lastOrder + 1 === record.order && previous.lastMode !== record.mode &&
      previous.key === decorativePairKey(record) && record.globalCompositeOperation === "source-over" &&
      hasTransparentShadow(record);
  }

  function fontPixels(font: string) {
    const match = font.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|\/|$)/i);
    return match ? Number(match[1]) : 16;
  }

  const destinationDependentCompositeOperations = new Set<GlobalCompositeOperation>([
    "destination-atop",
    "destination-in",
    "destination-out",
    "destination-over",
    "source-atop",
    "source-in",
    "source-out",
    "xor"
  ]);

  const replayStringProperties = [
    "fontKerning",
    "fontStretch",
    "fontVariantCaps",
    "lang",
    "letterSpacing",
    "textRendering",
    "wordSpacing"
  ] as const;

  function applyReplayTextState(target: CanvasRenderingContext2D, record: TextRecord) {
    const reasons: string[] = [];
    target.font = record.font;
    target.textAlign = record.textAlign;
    target.textBaseline = record.textBaseline;
    target.direction = record.direction;
    target.filter = record.filter;
    target.shadowBlur = record.shadowBlur;
    target.shadowColor = record.shadowColor;
    target.shadowOffsetX = record.shadowOffsetX;
    target.shadowOffsetY = record.shadowOffsetY;
    target.lineJoin = record.lineJoin;
    target.lineWidth = record.lineWidth;
    target.miterLimit = record.miterLimit;
    const dynamicTarget = target as unknown as Record<string, unknown>;
    for (const property of replayStringProperties) {
      const value = record[property];
      if (value === undefined) continue;
      // Chrome exposes an empty string on a freshly acquired product context
      // but the identical default reads back as 0px after assignment.
      if ((property === "letterSpacing" || property === "wordSpacing") && value === "") continue;
      if (!(property in dynamicTarget)) {
        reasons.push(`${property}=${JSON.stringify(value)} is unavailable on the replay context`);
        continue;
      }
      try {
        dynamicTarget[property] = value;
        if (dynamicTarget[property] !== value) {
          reasons.push(`${property} normalized from ${JSON.stringify(value)} to ${JSON.stringify(dynamicTarget[property])}`);
        }
      } catch (error) {
        reasons.push(`${property}=${JSON.stringify(value)} could not be replayed (${String(error)})`);
      }
    }
    return reasons;
  }

  function filterExpansion(filter: string) {
    if (filter.trim() === "" || filter === "none") return { expansion: 0, reasons: [] as string[] };
    if (/\b(?:url|var|calc)\s*\(/i.test(filter)) {
      return { expansion: 0, reasons: [`filter=${JSON.stringify(filter)} has indeterminate bounds`] };
    }
    const supported = new Set([
      "blur", "brightness", "contrast", "drop-shadow", "grayscale",
      "hue-rotate", "invert", "opacity", "saturate", "sepia"
    ]);
    const names = Array.from(filter.matchAll(/([a-z-]+)\s*\(/gi), (match) => match[1].toLowerCase());
    const unsupported = names.filter((name) => !supported.has(name));
    if (names.length === 0 || unsupported.length > 0) {
      return {
        expansion: 0,
        reasons: [`filter=${JSON.stringify(filter)} cannot be replayed with proven finite bounds`]
      };
    }
    const spatial = /\b(?:blur|drop-shadow)\s*\(/i.test(filter);
    const lengths = Array.from(filter.matchAll(/(-?\d+(?:\.\d+)?)px/gi), (match) => Math.abs(Number(match[1])));
    if (spatial && lengths.length === 0) {
      return { expansion: 0, reasons: [`filter=${JSON.stringify(filter)} has unsupported spatial units`] };
    }
    return { expansion: lengths.reduce((total, value) => total + value * 4, 0), reasons: [] as string[] };
  }

  function maskFor(record: TextRecord): MaskResult {
    if (record.globalAlpha === 0) {
      return { pixels: [], unsupportedClipReasons: [], unsupportedStateReasons: [] };
    }
    const numericState = [
      record.globalAlpha, record.lineWidth, record.miterLimit, record.shadowBlur,
      record.shadowOffsetX, record.shadowOffsetY, record.x, record.y,
      ...(record.maxWidth === undefined ? [] : [record.maxWidth]), ...record.transform
    ];
    const unsupportedStateReasons = numericState.every(Number.isFinite)
      ? []
      : ["Text uses non-finite coordinates, transform, width, alpha, shadow, or stroke state"];
    const filterBounds = filterExpansion(record.filter);
    unsupportedStateReasons.push(...filterBounds.reasons);
    if (unsupportedStateReasons.length > 0) {
      return { pixels: [], unsupportedClipReasons: [], unsupportedStateReasons };
    }
    const measureCanvas = document.createElement("canvas");
    const measureContext = nativeTwoDimensionalContext(measureCanvas);
    if (!measureContext) {
      return {
        pixels: [], unsupportedClipReasons: [],
        unsupportedStateReasons: ["A native 2D measurement context was unavailable"]
      };
    }
    unsupportedStateReasons.push(...applyReplayTextState(measureContext, record));
    if (unsupportedStateReasons.length > 0) {
      return { pixels: [], unsupportedClipReasons: [], unsupportedStateReasons };
    }
    const metrics = measureContext.measureText(record.text);
    const size = fontPixels(record.font);
    const measuredWidth = Math.max(
      metrics.width,
      Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight),
      size * 0.25
    );
    const naturalWidth = record.maxWidth === undefined
      ? measuredWidth
      : Math.min(measuredWidth, record.maxWidth);
    const naturalHeight = Math.max(
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      size
    );
    const localPadX = naturalWidth + size * 3 + record.lineWidth * 2;
    const localPadY = naturalHeight + size * 3 + record.lineWidth * 2;
    const localCorners = [
      transformedPoint(record.transform, record.x - localPadX, record.y - localPadY),
      transformedPoint(record.transform, record.x + localPadX, record.y - localPadY),
      transformedPoint(record.transform, record.x + localPadX, record.y + localPadY),
      transformedPoint(record.transform, record.x - localPadX, record.y + localPadY)
    ];
    const shadowExpansionX = Math.abs(record.shadowOffsetX) + record.shadowBlur * 4;
    const shadowExpansionY = Math.abs(record.shadowOffsetY) + record.shadowBlur * 4;
    const minX = Math.floor(Math.min(...localCorners.map((point) => point.x)) - 3 - shadowExpansionX - filterBounds.expansion);
    const minY = Math.floor(Math.min(...localCorners.map((point) => point.y)) - 3 - shadowExpansionY - filterBounds.expansion);
    const maxX = Math.ceil(Math.max(...localCorners.map((point) => point.x)) + 3 + shadowExpansionX + filterBounds.expansion);
    const maxY = Math.ceil(Math.max(...localCorners.map((point) => point.y)) + 3 + shadowExpansionY + filterBounds.expansion);
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (
      ![minX, minY, maxX, maxY, width, height].every(Number.isFinite) ||
      width < 1 || height < 1 || width > MAX_MASK_DIMENSION || height > MAX_MASK_DIMENSION ||
      width * height > MAX_MASK_AREA
    ) {
      return {
        pixels: [],
        oversizedMaskReason: `Required text mask ${width}x${height} exceeds ${MAX_MASK_DIMENSION}px per axis / ${MAX_MASK_AREA}px total`,
        unsupportedClipReasons: [],
        unsupportedStateReasons: []
      };
    }
    const scratch = document.createElement("canvas");
    scratch.width = width;
    scratch.height = height;
    const nullableContext = nativeTwoDimensionalContext(scratch, { willReadFrequently: true });
    if (!nullableContext) {
      return {
        pixels: [], unsupportedClipReasons: [],
        unsupportedStateReasons: ["A native 2D replay context was unavailable"]
      };
    }
    // A non-null alias keeps the strict narrowing valid inside replay(), whose
    // closure outlives this guard from TypeScript's control-flow perspective.
    const context: CanvasRenderingContext2D = nullableContext;

    function replay(options: { applyClips: boolean; composite: GlobalCompositeOperation }) {
      context.clearRect(0, 0, width, height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      if (options.applyClips) {
        for (const clip of record.clipState.clips) {
          context.beginPath();
          for (const rectangle of clip.rectangles) {
            const [clipA, clipB, clipC, clipD, clipE, clipF] = rectangle.transform;
            context.setTransform(clipA, clipB, clipC, clipD, clipE - minX, clipF - minY);
            context.rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
          }
          context.clip(clip.fillRule);
        }
      }

      const [a, b, c, d, e, f] = record.transform;
      context.setTransform(a, b, c, d, e - minX, f - minY);
      const replayReasons = applyReplayTextState(context, record);
      if (replayReasons.length > 0) throw new Error(replayReasons.join("; "));
      context.globalAlpha = record.globalAlpha;
      context.globalCompositeOperation = options.composite;
      context.fillStyle = record.mode === "fill" ? record.paintStyle : "rgba(0, 0, 0, 0)";
      context.strokeStyle = record.mode === "stroke" ? record.paintStyle : "rgba(0, 0, 0, 0)";
      if (record.mode === "fill") {
        if (record.maxWidth === undefined) context.fillText(record.text, record.x, record.y);
        else context.fillText(record.text, record.x, record.y, record.maxWidth);
      } else if (record.maxWidth === undefined) {
        context.strokeText(record.text, record.x, record.y);
      } else {
        context.strokeText(record.text, record.x, record.y, record.maxWidth);
      }
      const data = context.getImageData(0, 0, width, height).data;
      let maximumAlpha = 0;
      for (let index = 3; index < data.length; index += 4) {
        maximumAlpha = Math.max(maximumAlpha, data[index]);
      }
      if (maximumAlpha === 0) return [] as MaskPixel[];

      // Preserve the old full-opacity antialias threshold while scaling it to
      // the effective paint alpha. Otherwise valid 1%-47% alpha text silently
      // disappears from the audit.
      const alphaThreshold = Math.max(1, Math.ceil(maximumAlpha * 0.18));
      const pixels: MaskPixel[] = [];
      for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
          const alpha = data[(py * width + px) * 4 + 3];
          if (alpha < alphaThreshold) continue;
          pixels.push({ alpha, x: minX + px, y: minY + py });
        }
      }
      return pixels;
    }

    suspended = true;
    try {
      const hasUnsupportedClip = record.clipState.unsupportedReasons.length > 0;
      const hasUnsupportedComposite = destinationDependentCompositeOperations.has(
        record.globalCompositeOperation
      );
      if (hasUnsupportedClip || hasUnsupportedComposite) {
        const sourcePixels = replay({ applyClips: false, composite: "source-over" });
        if (sourcePixels.length === 0) {
          return { pixels: [], unsupportedClipReasons: [], unsupportedStateReasons: [] };
        }
        return {
          pixels: [],
          unsupportedClipReasons: [...record.clipState.unsupportedReasons],
          unsupportedCompositeOperation: hasUnsupportedComposite
            ? record.globalCompositeOperation
            : undefined,
          unsupportedStateReasons: []
        };
      }

      return {
        pixels: replay({ applyClips: true, composite: record.globalCompositeOperation }),
        unsupportedClipReasons: [],
        unsupportedStateReasons: []
      };
    } finally {
      suspended = false;
    }
  }

  function capturePrePaintContrast(
    context: CanvasRenderingContext2D,
    record: TextRecord
  ): TextRecord["prePaintContrast"] {
    const unsupportedReasons: string[] = [];
    if (record.globalAlpha === 0) {
      return { bounds: null, destinationPixels: [], unsupportedReasons };
    }
    if (typeof record.paintStyle !== "string") {
      unsupportedReasons.push(
        record.paintStyle instanceof CanvasGradient
          ? "Canvas text uses a gradient paint server"
          : record.paintStyle instanceof CanvasPattern
            ? "Canvas text uses a pattern paint server"
            : "Canvas text uses an unknown non-solid paint server"
      );
    }
    if (record.filter.trim() !== "" && record.filter !== "none") {
      unsupportedReasons.push(`Canvas text filter ${JSON.stringify(record.filter)} changes effective paint color`);
    }
    if (!hasTransparentShadow(record)) {
      unsupportedReasons.push("Canvas text uses a visible or indeterminate shadow");
    }
    if (record.globalCompositeOperation !== "source-over") {
      unsupportedReasons.push(
        `Canvas text composite operation ${record.globalCompositeOperation} is not a defensible source-over contrast model`
      );
    }
    if (record.clipState.unsupportedReasons.length > 0) {
      unsupportedReasons.push(...record.clipState.unsupportedReasons.map(
        (reason) => `Canvas text clipping is unsupported for contrast: ${reason}`
      ));
    }
    if (unsupportedReasons.length > 0) {
      return { bounds: null, destinationPixels: [], unsupportedReasons };
    }

    // Keep the draw hook bounded and timing-light: record one conservative
    // destination rectangle. Exact glyph replay and terminal visibility checks
    // happen only when contrastInputs() is requested by the test.
    const numericState = [record.x, record.y, record.lineWidth, ...record.transform];
    if (!numericState.every(Number.isFinite)) {
      return {
        bounds: null,
        destinationPixels: [],
        unsupportedReasons: ["Canvas pre-paint bounds use non-finite text coordinates or transform"]
      };
    }
    let metrics: TextMetrics;
    try {
      metrics = context.measureText(record.text);
    } catch (error) {
      return {
        bounds: null,
        destinationPixels: [],
        unsupportedReasons: [`Canvas text measurement failed before paint (${String(error)})`]
      };
    }
    const fontSize = fontPixels(record.font);
    const naturalWidth = Math.max(
      metrics.width,
      Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight),
      fontSize * 0.25
    );
    const drawnWidth = record.maxWidth === undefined ? naturalWidth : Math.min(naturalWidth, record.maxWidth);
    const padX = drawnWidth + fontSize * 2 + record.lineWidth * 2;
    const padY = Math.max(
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      fontSize
    ) + fontSize * 2 + record.lineWidth * 2;
    const corners = [
      transformedPoint(record.transform, record.x - padX, record.y - padY),
      transformedPoint(record.transform, record.x + padX, record.y - padY),
      transformedPoint(record.transform, record.x + padX, record.y + padY),
      transformedPoint(record.transform, record.x - padX, record.y + padY)
    ];
    const minX = Math.max(0, Math.floor(Math.min(...corners.map((point) => point.x)) - 2));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((point) => point.y)) - 2));
    const maxX = Math.min(context.canvas.width - 1, Math.ceil(Math.max(...corners.map((point) => point.x)) + 2));
    const maxY = Math.min(context.canvas.height - 1, Math.ceil(Math.max(...corners.map((point) => point.y)) + 2));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (
      ![minX, minY, maxX, maxY, width, height].every(Number.isFinite) ||
      width < 1 || height < 1 || width > MAX_MASK_DIMENSION || height > MAX_MASK_DIMENSION ||
      width * height > MAX_MASK_AREA
    ) {
      return {
        bounds: null,
        destinationPixels: [],
        unsupportedReasons: [
          `Canvas pre-paint destination rectangle ${width}x${height} exceeds the bounded evidence budget`
        ]
      };
    }

    let imageData: ImageData;
    try {
      imageData = context.getImageData(minX, minY, width, height);
    } catch (error) {
      return {
        bounds: null,
        destinationPixels: [],
        unsupportedReasons: [
          `Canvas pre-paint destination pixels are unreadable or tainted (${String(error)})`
        ]
      };
    }

    const destinationPixels: number[] = [];
    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
      const offset = pixelIndex * 4;
      const red = imageData.data[offset];
      const green = imageData.data[offset + 1];
      const blue = imageData.data[offset + 2];
      const alpha = imageData.data[offset + 3];
      destinationPixels.push((red | (green << 8) | (blue << 16) | (alpha << 24)) >>> 0);
    }
    return {
      bounds: { height, width, x: minX, y: minY },
      destinationPixels,
      unsupportedReasons
    };
  }

  function textLayers(records: TextRecord[]) {
    type WorkingTextLayer = TextLayer & { records: TextRecord[] };
    const layers: WorkingTextLayer[] = [];
    const limitReasons: string[] = [];
    for (const record of records) {
      const key = decorativePairKey(record);
      let layer = layers.at(-1);
      if (!layer || !isDecorativePair(layer, record)) {
        if (layers.length >= MAX_TEXT_LAYERS_PER_CANVAS) {
          limitReasons.push(
            `Canvas text audit exceeded ${MAX_TEXT_LAYERS_PER_CANVAS} distinct text layers`
          );
          return { layers: [] as TextLayer[], limitReasons };
        }
        layer = {
          clipDepth: record.clipState.clips.length + record.clipState.unsupportedReasons.length,
          decorativePairComplete: false,
          key,
          lastMode: record.mode,
          lastOrder: record.order,
          mask: new Map(),
          records: [record],
          text: record.text,
          unsupportedClipReasons: [],
          unsupportedCompositeOperations: [],
          unsupportedMaskReasons: [],
          unsupportedStateReasons: []
        };
        layers.push(layer);
      } else {
        layer.decorativePairComplete = true;
        layer.lastMode = record.mode;
        layer.lastOrder = record.order;
        layer.records.push(record);
      }
    }

    let totalMaskPixels = 0;
    for (const layer of layers) {
      for (const record of layer.records) {
        const maskResult = maskFor(record);
        for (const reason of maskResult.unsupportedClipReasons) {
          if (!layer.unsupportedClipReasons.includes(reason)) layer.unsupportedClipReasons.push(reason);
        }
        if (
          maskResult.unsupportedCompositeOperation &&
          !layer.unsupportedCompositeOperations.includes(maskResult.unsupportedCompositeOperation)
        ) {
          layer.unsupportedCompositeOperations.push(maskResult.unsupportedCompositeOperation);
        }
        if (
          maskResult.oversizedMaskReason &&
          !layer.unsupportedMaskReasons.includes(maskResult.oversizedMaskReason)
        ) layer.unsupportedMaskReasons.push(maskResult.oversizedMaskReason);
        for (const reason of maskResult.unsupportedStateReasons) {
          if (!layer.unsupportedStateReasons.includes(reason)) layer.unsupportedStateReasons.push(reason);
        }
        totalMaskPixels += maskResult.pixels.length;
        if (totalMaskPixels > MAX_TOTAL_MASK_PIXELS_PER_CANVAS) {
          limitReasons.push(
            `Canvas text masks exceeded ${MAX_TOTAL_MASK_PIXELS_PER_CANVAS} aggregate glyph pixels`
          );
          return { layers: [] as TextLayer[], limitReasons };
        }
        for (const pixel of maskResult.pixels) {
          const pixelKey = `${pixel.x},${pixel.y}`;
          const previous = layer.mask.get(pixelKey);
          if (!previous || previous.alpha < pixel.alpha) layer.mask.set(pixelKey, pixel);
        }
      }
    }
    return { layers: layers.filter((layer) =>
      layer.mask.size > 0 ||
      layer.unsupportedClipReasons.length > 0 ||
      layer.unsupportedCompositeOperations.length > 0 ||
      layer.unsupportedMaskReasons.length > 0 ||
      layer.unsupportedStateReasons.length > 0
    ), limitReasons };
  }

  function shortText(text: string) {
    return text.replace(/\s+/g, " ").trim().slice(0, 70);
  }

  function visibleDomTextLayers(root: HTMLElement) {
    const result: Array<{ rects: VisualRect[]; text: string }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const controlSelector = 'button,a[href],input,select,textarea,[role="button"],[role="slider"],[role="tab"]';
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      const rawText = node.textContent ?? "";
      const text = rawText.replace(/\s+/g, " ").trim();
      if (
        parent && text &&
        !parent.closest("canvas,script,style,template,noscript,.sr-only") &&
        !parent.closest(controlSelector)
      ) {
        const rects: VisualRect[] = [];
        for (const token of rawText.matchAll(/\S+/gu)) {
          const start = token.index ?? 0;
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + token[0].length);
          for (const rawRect of Array.from(range.getClientRects())) {
            const visibleRect = effectiveVisualRect(parent, rawRect);
            if (visibleRect && visibleRect.width > 0 && visibleRect.height > 0) rects.push(visibleRect);
          }
          range.detach();
        }
        if (rects.length > 0) result.push({ rects, text: shortText(text) });
      }
      node = walker.nextNode();
    }
    return result;
  }

  function terminalTextContrastInput(
    canvas: HTMLCanvasElement,
    state: ContextAuditState,
    record: TextRecord,
    groupId: string
  ): CaliforniaCanvasTextContrastInput {
    const unsupportedReasons = [...record.prePaintContrast.unsupportedReasons];

    let maskResult: MaskResult;
    try {
      maskResult = maskFor(record);
    } catch (error) {
      maskResult = {
        pixels: [],
        unsupportedClipReasons: [],
        unsupportedStateReasons: [`Canvas terminal glyph replay failed (${String(error)})`]
      };
    }
    unsupportedReasons.push(...maskResult.unsupportedClipReasons.map(
      (reason) => `Canvas text clipping is unsupported for contrast: ${reason}`
    ));
    if (maskResult.unsupportedCompositeOperation) {
      unsupportedReasons.push(
        `Canvas text composite operation ${maskResult.unsupportedCompositeOperation} is unsupported for contrast`
      );
    }
    if (maskResult.oversizedMaskReason) unsupportedReasons.push(maskResult.oversizedMaskReason);
    unsupportedReasons.push(...maskResult.unsupportedStateReasons);

    // Use the executable glyph replay as the device-space mask proxy. The
    // one-pixel boxes around its extrema form a conservative glyph region:
    // a later known dirty region may be ignored only when the two regions are
    // provably disjoint. Opaque operations remain hard red regardless of
    // where their caller intended to paint.
    const terminalGlyphBounds = boundsForMaskPixels(maskResult.pixels) ?? record.glyphBoundsProxy;
    for (const mutation of state.nonTextMutations) {
      if (mutation.revision <= record.nonTextRevisionAtPaint) continue;
      if (mutation.unsupportedReason) {
        appendUniqueReason(
          unsupportedReasons,
          `Post-text ${mutation.operation} dirty region is indeterminate: ${mutation.unsupportedReason}`
        );
      } else if (mutation.bounds && terminalGlyphBounds && boundsIntersect(mutation.bounds, terminalGlyphBounds)) {
        appendUniqueReason(
          unsupportedReasons,
          `Post-text ${mutation.operation} dirty region intersects the terminal glyph mask; terminal visibility is not proven`
        );
      }
    }

    const bounds = record.prePaintContrast.bounds;
    const inBounds = maskResult.pixels.filter((pixel) =>
      pixel.x >= 0 && pixel.y >= 0 && pixel.x < canvas.width && pixel.y < canvas.height
    );
    if (inBounds.length === 0) unsupportedReasons.push("Canvas text has no in-buffer terminal glyph samples");
    if (!bounds) unsupportedReasons.push("Canvas text has no bounded pre-paint destination rectangle");

    let finalImageData: ImageData | null = null;
    if (bounds) {
      try {
        finalImageData = state.context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
      } catch (error) {
        unsupportedReasons.push(`Canvas terminal pixels are unreadable or tainted (${String(error)})`);
      }
    }

    const prePaintDestinationPixels = new Set<number>();
    const finalPaintPixels = new Set<number>();
    let sampleX: number | null = null;
    let sampleY: number | null = null;
    let sampleCount = 0;
    let visibleChangedSampleCount = 0;
    if (bounds && finalImageData) {
      for (const pixel of inBounds) {
        const localX = pixel.x - bounds.x;
        const localY = pixel.y - bounds.y;
        if (localX < 0 || localY < 0 || localX >= bounds.width || localY >= bounds.height) {
          appendUniqueReason(
            unsupportedReasons,
            "Exact terminal glyph pixels escaped the bounded pre-paint evidence rectangle"
          );
          continue;
        }
        const pixelIndex = localY * bounds.width + localX;
        const prePaint = record.prePaintContrast.destinationPixels[pixelIndex];
        const offset = pixelIndex * 4;
        const red = finalImageData.data[offset];
        const green = finalImageData.data[offset + 1];
        const blue = finalImageData.data[offset + 2];
        const alpha = finalImageData.data[offset + 3];
        const finalPaint = (red | (green << 8) | (blue << 16) | (alpha << 24)) >>> 0;
        if (prePaint === undefined) {
          appendUniqueReason(unsupportedReasons, "Pre-paint destination evidence is incomplete");
          continue;
        }
        prePaintDestinationPixels.add(prePaint);
        finalPaintPixels.add(finalPaint);
        sampleCount += 1;
        if (prePaint !== finalPaint) visibleChangedSampleCount += 1;
        if (sampleX === null) {
          sampleX = pixel.x;
          sampleY = pixel.y;
        }
        if (
          prePaintDestinationPixels.size > MAX_PRE_PAINT_DESTINATION_COLORS ||
          finalPaintPixels.size > MAX_PRE_PAINT_DESTINATION_COLORS
        ) {
          appendUniqueReason(
            unsupportedReasons,
            `Canvas terminal text evidence exceeded ${MAX_PRE_PAINT_DESTINATION_COLORS} distinct RGBA colors`
          );
          break;
        }
      }
    }
    if (sampleCount > 0 && visibleChangedSampleCount === 0) {
      unsupportedReasons.push(
        "No terminal glyph sample differs from its pre-paint destination; the text is fully hidden or indistinguishable"
      );
    }

    return {
      canvas,
      canvasId: state.canvasId,
      contextKind: "2d",
      finalPaintPixels: Array.from(finalPaintPixels),
      font: record.font,
      globalAlpha: record.globalAlpha,
      groupId,
      mode: record.mode,
      paintStyle: typeof record.paintStyle === "string" ? record.paintStyle : null,
      prePaintDestinationPixels: Array.from(prePaintDestinationPixels),
      sampleCount,
      sampleX,
      sampleY,
      text: shortText(record.text),
      transform: [...record.transform],
      visibleChangedSampleCount,
      unsupportedReasons: Array.from(new Set(unsupportedReasons))
    };
  }

  const api: CaliforniaCanvasTextAuditPageApi = {
    version: 4,
    contextKindFor(canvas) {
      return canvasContextKinds.get(canvas) ?? "unknown";
    },
    contrastSurfaceOutcomes(root, options = {}) {
      return visibleCanvases(root, options.canvasSelector).map((canvas) => {
        const contextKind = canvasContextKinds.get(canvas) ?? "unknown";
        const state = canvasStates.get(canvas);
        const essential = canvas.matches("[data-viz-mark],[data-viz-essential],[data-viz-axis]") ||
          Boolean(canvas.closest("[data-viz-surface][data-viz-mark-count]"));
        const unsupportedReasons: string[] = [];
        const hasExecutableTextEvidence = Boolean(state && state.texts.length > 0);
        if (contextKind === "webgl" || contextKind === "webgl2") {
          unsupportedReasons.push(
            "Visible WebGL visualization has no executable material/background and terminal-raster contrast provider"
          );
        } else if (contextKind !== "2d") {
          unsupportedReasons.push(`Visible Canvas context modality ${contextKind} has no contrast provider`);
        }
        if (contextKind === "2d" && essential) {
          unsupportedReasons.push(
            "Essential 2D Canvas geometry has no executable actual-paint/destination non-text contrast provider"
          );
        }
        if (contextKind === "2d" && !essential && !hasExecutableTextEvidence) {
          unsupportedReasons.push(
            "Visible 2D Canvas has neither recorded text contrast evidence nor an executable non-text contrast provider"
          );
        }
        return {
          canvas,
          canvasId: state?.canvasId ?? null,
          contextKind,
          essential,
          hasExecutableNonTextEvidence: false,
          hasExecutableTextEvidence,
          unsupportedReasons
        };
      });
    },
    contrastInputs(root, options = {}) {
      const inputs: CaliforniaCanvasTextContrastInput[] = [];
      for (const canvas of visibleCanvases(root, options.canvasSelector)) {
        const state = canvasStates.get(canvas);
        if (!state) continue;
        if (state.resourceLimitReasons.length > 0 || state.unsupportedRasterReasons.length > 0) {
          inputs.push({
            canvas,
            canvasId: state.canvasId,
            contextKind: "2d",
            finalPaintPixels: [],
            font: "16px sans-serif",
            globalAlpha: 1,
            groupId: `${state.canvasId}:unsupported-recorder-state`,
            mode: "fill",
            paintStyle: null,
            prePaintDestinationPixels: [],
            sampleCount: 0,
            sampleX: null,
            sampleY: null,
            text: "Canvas text recorder state",
            transform: [1, 0, 0, 1, 0, 0],
            visibleChangedSampleCount: 0,
            unsupportedReasons: [
              ...state.resourceLimitReasons,
              ...state.unsupportedRasterReasons
            ]
          });
        }

        let groupIndex = 0;
        let previous: {
          decorativePairComplete: boolean;
          groupId: string;
          key: string;
          lastMode: "fill" | "stroke";
          lastOrder: number;
        } | null = null;
        for (const record of state.texts) {
          const key = decorativePairKey(record);
          const continuesDecorativePair = previous !== null &&
            !previous.decorativePairComplete &&
            previous.lastOrder + 1 === record.order &&
            previous.lastMode !== record.mode &&
            previous.key === key &&
            record.globalCompositeOperation === "source-over" &&
            hasTransparentShadow(record);
          let groupId: string;
          if (!continuesDecorativePair || previous === null) {
            groupIndex += 1;
            previous = {
              decorativePairComplete: false,
              groupId: `${state.canvasId}:${groupIndex}`,
              key,
              lastMode: record.mode,
              lastOrder: record.order
            };
            groupId = previous.groupId;
          } else {
            previous.decorativePairComplete = true;
            previous.lastMode = record.mode;
            previous.lastOrder = record.order;
            groupId = previous.groupId;
          }
          inputs.push(terminalTextContrastInput(canvas, state, record, groupId));
        }
      }
      return inputs;
    },
    signature(root, options = {}) {
      const canvases = visibleCanvases(root, options.canvasSelector);
      const parts = canvases.map((canvas) => {
        const state = canvasStates.get(canvas);
        return state
          ? `${state.canvasId}:${canvas.width}x${canvas.height}:${state.epoch}:${state.order}:` +
            `${state.clearCount}:${state.drawRevision}:${state.resourceLimitReasons.length}:` +
            `${state.unsupportedRasterReasons.length}`
          : `missing:${canvas.width}x${canvas.height}`;
      });
      return { canvasCount: canvases.length, signature: parts.join("|") };
    },
    analyze(root, context, options = {}) {
      const canvases = visibleCanvases(root, options.canvasSelector);
      const findings: CaliforniaCanvasTextFinding[] = [];
      let clippedTextLayerCount = 0;
      let textLayerCount = 0;
      const auditedCanvases: Array<{
        canvas: HTMLCanvasElement;
        canvasIndex: number;
        layers: TextLayer[];
        mappingSupported: boolean;
        rect: DOMRect;
        scaleX: number;
        scaleY: number;
        state: ContextAuditState;
        visibleRect: VisualRect;
      }> = [];

      if (canvases.length === 0) {
        findings.push({
          ...context,
          detail: "No visible canvas was found below the requested audit root.",
          kind: "canvas-audit-no-visible-canvas",
          severity: "hard"
        });
      }

      const controls = Array.from(root.querySelectorAll<HTMLElement>(
        'button,a[href],input,select,textarea,[role="button"],[role="slider"],[role="tab"]'
      )).flatMap((control) => {
        const style = getComputedStyle(control);
        const rect = effectiveVisualRect(control);
        return rect && style.pointerEvents !== "none" && !control.closest(".sr-only")
          ? [{ control, rect }]
          : [];
      });

      canvases.forEach((canvas, canvasIndex) => {
        const state = canvasStates.get(canvas);
        if (!state) {
          findings.push({
            ...context,
            canvasIndex,
            detail: "Visible canvas has no recorder state; install the init script before its first draw.",
            kind: "canvas-audit-missing",
            severity: "hard"
          });
          return;
        }

        const layerResult = state.resourceLimitReasons.length > 0
          ? { layers: [] as TextLayer[], limitReasons: [...state.resourceLimitReasons] }
          : textLayers(state.texts);
        const { layers } = layerResult;
        for (const reason of layerResult.limitReasons) {
          findings.push({
            ...context,
            canvasId: state.canvasId,
            canvasIndex,
            detail: reason,
            kind: "canvas-audit-mask-too-large",
            severity: "hard"
          });
        }
        for (const reason of state.unsupportedRasterReasons) {
          findings.push({
            ...context,
            canvasId: state.canvasId,
            canvasIndex,
            detail: reason,
            kind: "canvas-audit-unsupported-state",
            severity: "hard"
          });
        }
        textLayerCount += layers.length;
        clippedTextLayerCount += layers.filter((layer) => layer.clipDepth > 0).length;

        const canvasRect = canvas.getBoundingClientRect();
        const canvasVisibleRect = effectiveVisualRect(canvas, canvasRect) ?? canvasRect;
        const mappingReasons = canvasViewportMappingReasons(canvas);
        for (const reason of mappingReasons) {
          findings.push({
            ...context,
            canvasId: state.canvasId,
            canvasIndex,
            detail: reason,
            kind: "canvas-audit-unsupported-state",
            severity: "hard"
          });
        }
        const scaleX = canvasRect.width / Math.max(1, canvas.width);
        const scaleY = canvasRect.height / Math.max(1, canvas.height);
        auditedCanvases.push({
          canvas,
          canvasIndex,
          layers,
          mappingSupported: mappingReasons.length === 0,
          rect: canvasRect,
          scaleX,
          scaleY,
          state,
          visibleRect: canvasVisibleRect
        });

        for (const layer of layers) {
          if (layer.unsupportedClipReasons.length > 0) {
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `Text uses clipping geometry that cannot be replayed exactly: ${layer.unsupportedClipReasons.join("; ")}.`,
              kind: "canvas-audit-unsupported-clip",
              severity: "hard",
              text: shortText(layer.text)
            });
          }
          if (layer.unsupportedCompositeOperations.length > 0) {
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `Text uses destination-dependent Canvas composite operation(s) ${layer.unsupportedCompositeOperations.join(", ")}; visibility cannot be proven by transparent-surface replay.`,
              kind: "canvas-audit-unsupported-composite",
              severity: "hard",
              text: shortText(layer.text)
            });
          }
          if (layer.unsupportedStateReasons.length > 0) {
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `Text uses Canvas state that cannot be replayed exactly: ${layer.unsupportedStateReasons.join("; ")}.`,
              kind: "canvas-audit-unsupported-state",
              severity: "hard",
              text: shortText(layer.text)
            });
          }
          if (layer.unsupportedMaskReasons.length > 0) {
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `${layer.unsupportedMaskReasons.join("; ")}.`,
              kind: "canvas-audit-mask-too-large",
              severity: "hard",
              text: shortText(layer.text)
            });
          }
          const outside = Array.from(layer.mask.values()).filter((pixel) =>
            pixel.x < 0 || pixel.y < 0 || pixel.x >= canvas.width || pixel.y >= canvas.height
          );
          if (outside.length >= 2) {
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `${outside.length} rendered glyph pixels fall outside the ${canvas.width}x${canvas.height} backing buffer.`,
              kind: "canvas-text-outside-buffer",
              severity: "hard",
              text: shortText(layer.text)
            });
          }
        }

        for (let leftIndex = 0; leftIndex < layers.length; leftIndex += 1) {
          const left = layers[leftIndex];
          for (let rightIndex = leftIndex + 1; rightIndex < layers.length; rightIndex += 1) {
            const right = layers[rightIndex];
            const smaller = left.mask.size <= right.mask.size ? left : right;
            const larger = smaller === left ? right : left;
            let intersection = 0;
            for (const key of smaller.mask.keys()) {
              if (larger.mask.has(key)) intersection += 1;
            }
            const ratio = intersection / Math.max(1, smaller.mask.size);
            if (intersection < 4 || ratio < 0.02) continue;
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `${intersection} glyph pixels overlap (${(ratio * 100).toFixed(1)}% of the smaller text layer).`,
              kind: "canvas-text-raster-overlap",
              otherText: shortText(right.text),
              overlapPixels: intersection,
              ratio,
              severity: "hard",
              text: shortText(left.text)
            });
          }
        }

        for (const layer of layers) {
          if (layer.mask.size === 0) continue;
          if (mappingReasons.length > 0) continue;
          for (const { control, rect: controlRect } of controls) {
            if (control.contains(canvas) || canvas.contains(control)) continue;
            let overlapPixels = 0;
            for (const pixel of layer.mask.values()) {
              if (pixel.x < 0 || pixel.y < 0 || pixel.x >= canvas.width || pixel.y >= canvas.height) continue;
              const viewportX = canvasRect.left + (pixel.x + 0.5) * scaleX;
              const viewportY = canvasRect.top + (pixel.y + 0.5) * scaleY;
              if (
                viewportX >= canvasVisibleRect.left && viewportX <= canvasVisibleRect.right &&
                viewportY >= canvasVisibleRect.top && viewportY <= canvasVisibleRect.bottom &&
                viewportX >= controlRect.left && viewportX <= controlRect.right &&
                viewportY >= controlRect.top && viewportY <= controlRect.bottom
              ) overlapPixels += 1;
            }
            const ratio = overlapPixels / layer.mask.size;
            if (overlapPixels < 6 || ratio < 0.08) continue;
            const controlName = (
              control.getAttribute("aria-label") ?? control.textContent ?? control.tagName.toLowerCase()
            ).replace(/\s+/g, " ").trim().slice(0, 70);
            findings.push({
              ...context,
              canvasId: state.canvasId,
              canvasIndex,
              detail: `${overlapPixels} glyph pixels overlap interactive control ${JSON.stringify(controlName)} (${(ratio * 100).toFixed(1)}%).`,
              kind: "canvas-text-dom-control-overlap",
              overlapPixels,
              ratio,
              severity: "hard",
              text: shortText(layer.text)
            });
          }
        }
      });

      // Canvas elements can be stacked in one visualization. Compare their
      // text masks in viewport coordinates rather than assuming each backing
      // buffer is an isolated plane.
      for (let leftIndex = 0; leftIndex < auditedCanvases.length; leftIndex += 1) {
        const leftCanvas = auditedCanvases[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < auditedCanvases.length; rightIndex += 1) {
          const rightCanvas = auditedCanvases[rightIndex];
          if (!leftCanvas.mappingSupported || !rightCanvas.mappingSupported) continue;
          const canvasesIntersect = !(
            leftCanvas.visibleRect.right <= rightCanvas.visibleRect.left ||
            rightCanvas.visibleRect.right <= leftCanvas.visibleRect.left ||
            leftCanvas.visibleRect.bottom <= rightCanvas.visibleRect.top ||
            rightCanvas.visibleRect.bottom <= leftCanvas.visibleRect.top
          );
          if (!canvasesIntersect) continue;
          for (const leftLayer of leftCanvas.layers) {
            for (const rightLayer of rightCanvas.layers) {
              const source = leftLayer.mask.size <= rightLayer.mask.size
                ? { canvas: leftCanvas, layer: leftLayer, target: rightCanvas, targetLayer: rightLayer }
                : { canvas: rightCanvas, layer: rightLayer, target: leftCanvas, targetLayer: leftLayer };
              let intersection = 0;
              for (const pixel of source.layer.mask.values()) {
                const viewportX = source.canvas.rect.left + (pixel.x + 0.5) * source.canvas.scaleX;
                const viewportY = source.canvas.rect.top + (pixel.y + 0.5) * source.canvas.scaleY;
                if (
                  viewportX < source.canvas.visibleRect.left || viewportX > source.canvas.visibleRect.right ||
                  viewportY < source.canvas.visibleRect.top || viewportY > source.canvas.visibleRect.bottom ||
                  viewportX < source.target.visibleRect.left || viewportX > source.target.visibleRect.right ||
                  viewportY < source.target.visibleRect.top || viewportY > source.target.visibleRect.bottom
                ) continue;
                const targetX = Math.floor((viewportX - source.target.rect.left) / source.target.scaleX);
                const targetY = Math.floor((viewportY - source.target.rect.top) / source.target.scaleY);
                if (source.targetLayer.mask.has(`${targetX},${targetY}`)) intersection += 1;
              }
              const ratio = intersection / Math.max(1, source.layer.mask.size);
              if (intersection < 4 || ratio < 0.02) continue;
              findings.push({
                ...context,
                canvasId: leftCanvas.state.canvasId,
                canvasIndex: leftCanvas.canvasIndex,
                detail: `${intersection} glyph pixels overlap a text layer on stacked Canvas ${rightCanvas.state.canvasId} (${(ratio * 100).toFixed(1)}%).`,
                kind: "canvas-text-raster-overlap",
                otherCanvasId: rightCanvas.state.canvasId,
                otherText: shortText(rightLayer.text),
                overlapPixels: intersection,
                ratio,
                severity: "hard",
                text: shortText(leftLayer.text)
              });
            }
          }
        }
      }

      const domTextLayers = visibleDomTextLayers(root);
      for (const audited of auditedCanvases) {
        if (!audited.mappingSupported) continue;
        for (const layer of audited.layers) {
          if (layer.mask.size === 0) continue;
          for (const domText of domTextLayers) {
            let overlapPixels = 0;
            for (const pixel of layer.mask.values()) {
              const viewportX = audited.rect.left + (pixel.x + 0.5) * audited.scaleX;
              const viewportY = audited.rect.top + (pixel.y + 0.5) * audited.scaleY;
              if (
                viewportX < audited.visibleRect.left || viewportX > audited.visibleRect.right ||
                viewportY < audited.visibleRect.top || viewportY > audited.visibleRect.bottom
              ) continue;
              if (domText.rects.some((rect) =>
                viewportX >= rect.left && viewportX <= rect.right &&
                viewportY >= rect.top && viewportY <= rect.bottom
              )) overlapPixels += 1;
            }
            const ratio = overlapPixels / layer.mask.size;
            if (overlapPixels < 6 || ratio < 0.08) continue;
            findings.push({
              ...context,
              canvasId: audited.state.canvasId,
              canvasIndex: audited.canvasIndex,
              detail: `${overlapPixels} glyph pixels overlap visible DOM text ${JSON.stringify(domText.text)} (${(ratio * 100).toFixed(1)}%).`,
              kind: "canvas-text-dom-text-overlap",
              otherText: domText.text,
              overlapPixels,
              ratio,
              severity: "hard",
              text: shortText(layer.text)
            });
          }
        }
      }

      return { canvasCount: canvases.length, clippedTextLayerCount, findings, textLayerCount };
    }
  };

  Object.defineProperty(auditWindow, "__californiaCanvasTextAudit", {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}
