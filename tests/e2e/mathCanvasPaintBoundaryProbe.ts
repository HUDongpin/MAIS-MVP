import type { BrowserContext } from "@playwright/test";

/**
 * Installs before application code so a 2D canvas cannot hide requested paint
 * outside its bitmap behind the browser's implicit canvas clip.
 *
 * The probe records geometry in backing-store coordinates. The audit converts
 * the result to CSS pixels so the same one-pixel tolerance works at every DPR.
 */
export async function installMathCanvasPaintBoundaryProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    type Point = { x: number; y: number };
    type Bounds = { left: number; top: number; right: number; bottom: number };
    type PathSegment = {
      start: Point;
      end: Point;
      startTangent: Point | null;
      endTangent: Point | null;
    };
    type PathSubpath = {
      segments: PathSegment[];
      closed: boolean;
    };
    type ClipState = { bounds: Bounds | null; empty: boolean; unknown: boolean };
    type PaintOffender = {
      operation: string;
      arguments: string;
      boundsBacking: Bounds;
      overflowBacking: Bounds & { max: number };
      transform: [number, number, number, number, number, number];
      clip: ClipState;
      pathCommands: string[];
      lineWidth: number;
      font: string;
      textAlign: CanvasTextAlign;
      textBaseline: CanvasTextBaseline;
    };
    type Tracker = {
      canvas: HTMLCanvasElement;
      clip: ClipState;
      clipStack: ClipState[];
      currentPoint: Point | null;
      frame: number;
      operations: number;
      offenders: PaintOffender[];
      paint: Bounds | null;
      partialClears: number;
      path: Bounds | null;
      pathCommands: string[];
      pathHasGeometry: boolean;
      pathSubpaths: PathSubpath[];
      activeSubpath: PathSubpath | null;
      subpathStart: Point | null;
      unsupported: Set<string>;
    };

    const snapshotSymbol = Symbol.for("mais.diagram-boundary.canvas-2d.snapshot");
    const installedSymbol = Symbol.for("mais.diagram-boundary.canvas-2d.installed");
    const proto = CanvasRenderingContext2D.prototype;
    if ((proto as unknown as Record<symbol, unknown>)[installedSymbol]) return;
    Object.defineProperty(proto, installedSymbol, { configurable: true, value: true });

    const trackers = new WeakMap<CanvasRenderingContext2D, Tracker>();
    const contextsByCanvas = new WeakMap<HTMLCanvasElement, Set<CanvasRenderingContext2D>>();
    const emptyClip = (): ClipState => ({ bounds: null, empty: false, unknown: false });
    const copyClip = (clip: ClipState): ClipState => ({
      bounds: clip.bounds ? { ...clip.bounds } : null,
      empty: clip.empty,
      unknown: clip.unknown
    });
    const merge = (first: Bounds | null, second: Bounds | null): Bounds | null => {
      if (!first) return second ? { ...second } : null;
      if (!second) return { ...first };
      return {
        left: Math.min(first.left, second.left),
        top: Math.min(first.top, second.top),
        right: Math.max(first.right, second.right),
        bottom: Math.max(first.bottom, second.bottom)
      };
    };
    const intersect = (first: Bounds, second: Bounds): Bounds | null => {
      const result = {
        left: Math.max(first.left, second.left),
        top: Math.max(first.top, second.top),
        right: Math.min(first.right, second.right),
        bottom: Math.min(first.bottom, second.bottom)
      };
      return result.right >= result.left && result.bottom >= result.top ? result : null;
    };
    const trackerFor = (ctx: CanvasRenderingContext2D): Tracker => {
      let tracker = trackers.get(ctx);
      if (!tracker) {
        tracker = {
          canvas: ctx.canvas,
          clip: emptyClip(),
          clipStack: [],
          currentPoint: null,
          frame: 0,
          operations: 0,
          offenders: [],
          paint: null,
          partialClears: 0,
          path: null,
          pathCommands: [],
          pathHasGeometry: false,
          pathSubpaths: [],
          activeSubpath: null,
          subpathStart: null,
          unsupported: new Set()
        };
        trackers.set(ctx, tracker);
        const contexts = contextsByCanvas.get(ctx.canvas) ?? new Set<CanvasRenderingContext2D>();
        contexts.add(ctx);
        contextsByCanvas.set(ctx.canvas, contexts);
      }
      return tracker;
    };
    const resetPaintFrame = (tracker: Tracker) => {
      tracker.frame += 1;
      tracker.operations = 0;
      tracker.offenders = [];
      tracker.paint = null;
      tracker.partialClears = 0;
      tracker.unsupported.clear();
    };
    const resetBitmapState = (tracker: Tracker) => {
      resetPaintFrame(tracker);
      tracker.clip = emptyClip();
      tracker.clipStack = [];
      tracker.currentPoint = null;
      tracker.path = null;
      tracker.pathCommands = [];
      tracker.pathHasGeometry = false;
      tracker.pathSubpaths = [];
      tracker.activeSubpath = null;
      tracker.subpathStart = null;
    };
    const point = (ctx: CanvasRenderingContext2D, x: number, y: number): Point => {
      const matrix = ctx.getTransform();
      return { x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f };
    };
    const vector = (ctx: CanvasRenderingContext2D, x: number, y: number): Point => {
      const matrix = ctx.getTransform();
      return { x: matrix.a * x + matrix.c * y, y: matrix.b * x + matrix.d * y };
    };
    const unit = (value: Point): Point | null => {
      const length = Math.hypot(value.x, value.y);
      return Number.isFinite(length) && length > 1e-9
        ? { x: value.x / length, y: value.y / length }
        : null;
    };
    const boundsForPoints = (points: Point[]): Bounds | null => {
      if (!points.length || points.some((value) => !Number.isFinite(value.x) || !Number.isFinite(value.y))) return null;
      return {
        left: Math.min(...points.map((value) => value.x)),
        top: Math.min(...points.map((value) => value.y)),
        right: Math.max(...points.map((value) => value.x)),
        bottom: Math.max(...points.map((value) => value.y))
      };
    };
    const addDevicePathPoints = (tracker: Tracker, values: Point[]) => {
      tracker.path = merge(tracker.path, boundsForPoints(values));
    };
    const addUserPathPoints = (ctx: CanvasRenderingContext2D, values: Point[]) => {
      addDevicePathPoints(trackerFor(ctx), values.map((value) => point(ctx, value.x, value.y)));
    };
    const distance = (first: Point, second: Point) => Math.hypot(first.x - second.x, first.y - second.y);
    const beginTrackedSubpath = (tracker: Tracker, start: Point) => {
      const subpath: PathSubpath = { segments: [], closed: false };
      tracker.pathSubpaths.push(subpath);
      tracker.activeSubpath = subpath;
      tracker.currentPoint = start;
      tracker.subpathStart = start;
      return subpath;
    };
    const addTrackedSegment = (
      tracker: Tracker,
      start: Point,
      end: Point,
      startTangent: Point | null,
      endTangent: Point | null
    ) => {
      const subpath = tracker.activeSubpath ?? beginTrackedSubpath(tracker, start);
      subpath.segments.push({ start, end, startTangent, endTangent });
      tracker.currentPoint = end;
    };
    const addTrackedLine = (tracker: Tracker, start: Point, end: Point) => {
      const tangent = unit({ x: end.x - start.x, y: end.y - start.y });
      addTrackedSegment(tracker, start, end, tangent, tangent);
    };
    const rootsInUnitInterval = (a: number, b: number, c: number) => {
      const tolerance = 1e-12 * Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c));
      if (Math.abs(a) <= tolerance) {
        if (Math.abs(b) <= tolerance) return [];
        const root = -c / b;
        return root > 0 && root < 1 ? [root] : [];
      }
      const discriminant = b * b - 4 * a * c;
      if (discriminant < -tolerance) return [];
      if (Math.abs(discriminant) <= tolerance) {
        const root = -b / (2 * a);
        return root > 0 && root < 1 ? [root] : [];
      }
      const squareRoot = Math.sqrt(Math.max(0, discriminant));
      // The q form avoids losing the smaller root when b and sqrt(D) nearly cancel.
      const q = -0.5 * (b + Math.sign(b || 1) * squareRoot);
      const roots = q === 0 ? [-b / (2 * a)] : [q / a, c / q];
      return Array.from(new Set(roots.filter((root) => Number.isFinite(root) && root > 0 && root < 1)));
    };
    const quadraticBounds = (start: Point, control: Point, end: Point) => {
      const evaluate = (t: number): Point => ({
        x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
        y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y
      });
      const parameters = [0, 1];
      for (const coordinate of ["x", "y"] as const) {
        const denominator = start[coordinate] - 2 * control[coordinate] + end[coordinate];
        if (Math.abs(denominator) <= 1e-12) continue;
        const t = (start[coordinate] - control[coordinate]) / denominator;
        if (t > 0 && t < 1) parameters.push(t);
      }
      return boundsForPoints(Array.from(new Set(parameters)).map(evaluate));
    };
    const cubicBounds = (start: Point, first: Point, second: Point, end: Point) => {
      const evaluate = (t: number): Point => ({
        x: (1 - t) ** 3 * start.x + 3 * (1 - t) ** 2 * t * first.x +
          3 * (1 - t) * t ** 2 * second.x + t ** 3 * end.x,
        y: (1 - t) ** 3 * start.y + 3 * (1 - t) ** 2 * t * first.y +
          3 * (1 - t) * t ** 2 * second.y + t ** 3 * end.y
      });
      const parameters = [0, 1];
      for (const coordinate of ["x", "y"] as const) {
        const a = -start[coordinate] + 3 * first[coordinate] - 3 * second[coordinate] + end[coordinate];
        const b = 2 * (start[coordinate] - 2 * first[coordinate] + second[coordinate]);
        const c = first[coordinate] - start[coordinate];
        parameters.push(...rootsInUnitInterval(a, b, c));
      }
      return boundsForPoints(Array.from(new Set(parameters)).map(evaluate));
    };
    const transformScale = (ctx: CanvasRenderingContext2D) => {
      const matrix = ctx.getTransform();
      const first = matrix.a * matrix.a + matrix.b * matrix.b;
      const second = matrix.c * matrix.c + matrix.d * matrix.d;
      const cross = matrix.a * matrix.c + matrix.b * matrix.d;
      const discriminant = Math.sqrt(Math.max(0, (first - second) ** 2 + 4 * cross * cross));
      return Math.sqrt(Math.max(0, (first + second + discriminant) / 2));
    };
    const transformIsConformal = (ctx: CanvasRenderingContext2D) => {
      const matrix = ctx.getTransform();
      const first = Math.hypot(matrix.a, matrix.b);
      const second = Math.hypot(matrix.c, matrix.d);
      const tolerance = Math.max(1, first, second) * 1e-6;
      return Math.abs(first - second) <= tolerance && Math.abs(matrix.a * matrix.c + matrix.b * matrix.d) <= tolerance;
    };
    const miterStrokeBounds = (
      ctx: CanvasRenderingContext2D,
      tracker: Tracker,
      halfWidth: number
    ): { bounds: Bounds | null; incomplete: boolean } => {
      if (ctx.lineJoin !== "miter" || halfWidth <= 0) return { bounds: null, incomplete: false };
      let result: Bounds | null = null;
      let incomplete = false;
      const conformal = transformIsConformal(ctx);
      const addJoin = (incoming: PathSegment, outgoing: PathSegment) => {
        const vertex = incoming.end;
        if (distance(vertex, outgoing.start) > 1e-6 || !incoming.endTangent || !outgoing.startTangent) {
          incomplete = true;
          return;
        }
        const first = incoming.endTangent;
        const second = outgoing.startTangent;
        const cross = first.x * second.y - first.y * second.x;
        const dot = first.x * second.x + first.y * second.y;
        if (Math.abs(cross) <= 1e-9) {
          // Collinear continuation has no join protrusion. A reversal is a cusp
          // whose browser miter fallback is not stable enough to infer here.
          if (dot < 0) incomplete = true;
          return;
        }
        if (!conformal) {
          // The miter limit is evaluated before a non-uniform transform. A
          // square with the maximum singular-value radius is a safe upper bound.
          const radius = halfWidth * Math.max(1, ctx.miterLimit);
          result = merge(result, {
            left: vertex.x - radius,
            top: vertex.y - radius,
            right: vertex.x + radius,
            bottom: vertex.y + radius
          });
          return;
        }
        const side = -Math.sign(cross);
        const firstNormal = { x: -first.y * side, y: first.x * side };
        const secondNormal = { x: -second.y * side, y: second.x * side };
        const firstOffset = {
          x: vertex.x + firstNormal.x * halfWidth,
          y: vertex.y + firstNormal.y * halfWidth
        };
        const secondOffset = {
          x: vertex.x + secondNormal.x * halfWidth,
          y: vertex.y + secondNormal.y * halfWidth
        };
        const delta = { x: secondOffset.x - firstOffset.x, y: secondOffset.y - firstOffset.y };
        const alongFirst = (delta.x * second.y - delta.y * second.x) / cross;
        const miter = {
          x: firstOffset.x + first.x * alongFirst,
          y: firstOffset.y + first.y * alongFirst
        };
        const miterRatio = distance(vertex, miter) / halfWidth;
        if (!Number.isFinite(miterRatio)) {
          incomplete = true;
          return;
        }
        // When the miter limit is exceeded, Canvas falls back to a bevel. The
        // generic half-width expansion already contains that bevel geometry.
        if (miterRatio <= ctx.miterLimit + 1e-9) result = merge(result, boundsForPoints([miter]));
      };

      for (const subpath of tracker.pathSubpaths) {
        for (let index = 1; index < subpath.segments.length; index += 1) {
          addJoin(subpath.segments[index - 1], subpath.segments[index]);
        }
        if (subpath.closed && subpath.segments.length > 1) {
          addJoin(subpath.segments[subpath.segments.length - 1], subpath.segments[0]);
        }
      }
      return { bounds: result, incomplete };
    };
    const visibleShadow = (ctx: CanvasRenderingContext2D) => {
      const color = ctx.shadowColor.replace(/\s/gu, "").toLowerCase();
      return color !== "transparent" && color !== "rgba(0,0,0,0)" && color !== "#00000000";
    };
    const describeArguments = (args: unknown[]) => args.map((value) => {
      if (typeof value === "number") return Number.isFinite(value) ? Number(value.toFixed(4)) : String(value);
      if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}...` : value;
      if (typeof value === "boolean") return value;
      return Object.prototype.toString.call(value);
    }).join(",");
    const appendPathCommand = (tracker: Tracker, operation: string, args: unknown[]) => {
      if (tracker.pathCommands.length >= 64) return;
      tracker.pathCommands.push(`${operation}(${describeArguments(args)})`);
    };
    const nonExpandingCompositeOperations = new Set<GlobalCompositeOperation>([
      "destination-in",
      "destination-out",
      "source-atop",
      "source-in"
    ]);
    const replacingCompositeOperations = new Set<GlobalCompositeOperation>(["copy"]);
    const expandingCompositeOperations = new Set<GlobalCompositeOperation>([
      "source-over",
      "source-out",
      "destination-over",
      "destination-atop",
      "lighter",
      "xor",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity"
    ]);
    const recordPaint = (
      ctx: CanvasRenderingContext2D,
      bounds: Bounds | null,
      stroke = false,
      operation = stroke ? "stroke" : "fill",
      args: unknown[] = []
    ) => {
      const tracker = trackerFor(ctx);
      tracker.operations += 1;
      const compositor = ctx.globalCompositeOperation;
      const knownCompositor = nonExpandingCompositeOperations.has(compositor) ||
        replacingCompositeOperations.has(compositor) || expandingCompositeOperations.has(compositor);
      if (!knownCompositor) {
        tracker.unsupported.add(`globalCompositeOperation:${String(compositor)}`);
        return;
      }
      if (tracker.clip.unknown) return;
      if (nonExpandingCompositeOperations.has(compositor)) {
        // These Porter-Duff modes can only retain or remove destination
        // coverage. Keeping the previous conservative bounds cannot hide a
        // newly painted overflow and avoids treating an eraser as new ink.
        return;
      }
      const replacesWholeBitmap = replacingCompositeOperations.has(compositor) &&
        tracker.clip.bounds === null && !tracker.clip.empty;
      if (!bounds || ctx.globalAlpha <= 0 || tracker.clip.empty) {
        if (replacesWholeBitmap) {
          tracker.paint = null;
          tracker.offenders = [];
        }
        return;
      }
      let painted = { ...bounds };
      if (stroke) {
        const expansion = Math.max(0, ctx.lineWidth * transformScale(ctx) / 2);
        painted = {
          left: painted.left - expansion,
          top: painted.top - expansion,
          right: painted.right + expansion,
          bottom: painted.bottom + expansion
        };
        if (operation === "stroke") {
          const miter = miterStrokeBounds(ctx, tracker, expansion);
          painted = merge(painted, miter.bounds)!;
          if (miter.incomplete) tracker.unsupported.add("stroke-miter-join-audit-incomplete");
        }
      }
      if (visibleShadow(ctx) && (ctx.shadowBlur > 0 || ctx.shadowOffsetX !== 0 || ctx.shadowOffsetY !== 0)) {
        const blurExpansion = Math.max(0, ctx.shadowBlur * 2);
        const shadow = {
          left: painted.left + ctx.shadowOffsetX - blurExpansion,
          top: painted.top + ctx.shadowOffsetY - blurExpansion,
          right: painted.right + ctx.shadowOffsetX + blurExpansion,
          bottom: painted.bottom + ctx.shadowOffsetY + blurExpansion
        };
        painted = merge(painted, shadow)!;
      }
      if (ctx.filter !== "none") tracker.unsupported.add(`filter:${ctx.filter}`);
      if (tracker.clip.bounds) {
        const clipped = intersect(painted, tracker.clip.bounds);
        if (!clipped) return;
        painted = clipped;
      }
      if (replacesWholeBitmap) {
        tracker.paint = { ...painted };
        tracker.offenders = [];
      } else {
        tracker.paint = merge(tracker.paint, painted);
      }
      const overflowBacking = {
        left: Math.max(0, -painted.left),
        top: Math.max(0, -painted.top),
        right: Math.max(0, painted.right - ctx.canvas.width),
        bottom: Math.max(0, painted.bottom - ctx.canvas.height),
        max: 0
      };
      overflowBacking.max = Math.max(
        overflowBacking.left,
        overflowBacking.top,
        overflowBacking.right,
        overflowBacking.bottom
      );
      if (overflowBacking.max > 1e-6 && tracker.offenders.length < 32) {
        const matrix = ctx.getTransform();
        tracker.offenders.push({
          operation,
          arguments: describeArguments(args),
          boundsBacking: { ...painted },
          overflowBacking,
          transform: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
          clip: copyClip(tracker.clip),
          pathCommands: operation === "fill" || operation === "stroke" ? [...tracker.pathCommands] : [],
          lineWidth: ctx.lineWidth,
          font: ctx.font,
          textAlign: ctx.textAlign,
          textBaseline: ctx.textBaseline
        });
      }
    };
    const recordUnsupportedPaint = (ctx: CanvasRenderingContext2D, operation: string) => {
      const tracker = trackerFor(ctx);
      tracker.operations += 1;
      tracker.unsupported.add(operation);
    };
    const sampleDeviceCurve = (
      tracker: Tracker,
      evaluator: (t: number) => Point,
      count = 128
    ) => addDevicePathPoints(tracker, Array.from({ length: count + 1 }, (_, index) => evaluator(index / count)));
    const sampleUserCurve = (
      ctx: CanvasRenderingContext2D,
      evaluator: (t: number) => Point,
      count = 128
    ) => addUserPathPoints(ctx, Array.from({ length: count + 1 }, (_, index) => evaluator(index / count)));
    const normalizeArcSweep = (start: number, end: number, anticlockwise: boolean) => {
      const full = Math.PI * 2;
      const raw = end - start;
      if (!anticlockwise) {
        if (raw >= full) return full;
        const normalized = raw % full;
        return normalized < 0 ? normalized + full : normalized;
      }
      if (raw <= -full) return -full;
      const normalized = raw % full;
      return normalized > 0 ? normalized - full : normalized;
    };
    const wrap = (name: keyof CanvasRenderingContext2D, after: (ctx: CanvasRenderingContext2D, args: unknown[]) => void) => {
      const original = proto[name] as unknown as (...args: unknown[]) => unknown;
      Object.defineProperty(proto, name, {
        configurable: true,
        writable: true,
        value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          const result = original.apply(this, args);
          after(this, args);
          return result;
        }
      });
    };

    wrap("beginPath", (ctx) => {
      const tracker = trackerFor(ctx);
      tracker.path = null;
      tracker.pathCommands = [];
      tracker.pathHasGeometry = false;
      tracker.currentPoint = null;
      tracker.pathSubpaths = [];
      tracker.activeSubpath = null;
      tracker.subpathStart = null;
    });
    wrap("moveTo", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "moveTo", args);
      const next = point(ctx, Number(args[0]), Number(args[1]));
      addDevicePathPoints(tracker, [next]);
      beginTrackedSubpath(tracker, next);
    });
    wrap("lineTo", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "lineTo", args);
      const next = point(ctx, Number(args[0]), Number(args[1]));
      if (tracker.currentPoint) {
        addDevicePathPoints(tracker, [tracker.currentPoint, next]);
        if (distance(tracker.currentPoint, next) > 1e-9) {
          addTrackedLine(tracker, tracker.currentPoint, next);
          tracker.pathHasGeometry = true;
        } else {
          tracker.currentPoint = next;
        }
      } else {
        addDevicePathPoints(tracker, [next]);
        beginTrackedSubpath(tracker, next);
      }
    });
    wrap("closePath", (ctx) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "closePath", []);
      if (tracker.currentPoint && tracker.subpathStart) {
        addDevicePathPoints(tracker, [tracker.currentPoint, tracker.subpathStart]);
        if (distance(tracker.currentPoint, tracker.subpathStart) > 1e-9) {
          addTrackedLine(tracker, tracker.currentPoint, tracker.subpathStart);
          tracker.pathHasGeometry = true;
        }
        if (tracker.activeSubpath) tracker.activeSubpath.closed = true;
        tracker.currentPoint = tracker.subpathStart;
      }
    });
    wrap("rect", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "rect", args);
      const [x, y, width, height] = args.map(Number);
      const corners = [point(ctx, x, y), point(ctx, x + width, y), point(ctx, x + width, y + height), point(ctx, x, y + height)];
      addDevicePathPoints(tracker, corners);
      const subpath = beginTrackedSubpath(tracker, corners[0]);
      for (let index = 0; index < corners.length; index += 1) {
        addTrackedLine(tracker, corners[index], corners[(index + 1) % corners.length]);
      }
      subpath.closed = true;
      tracker.currentPoint = corners[0];
      if (Math.abs(width) > 1e-9 || Math.abs(height) > 1e-9) tracker.pathHasGeometry = true;
    });
    if (typeof proto.roundRect === "function") {
      wrap("roundRect", (ctx, args) => {
        const tracker = trackerFor(ctx);
        appendPathCommand(tracker, "roundRect", args);
        const [x, y, width, height] = args.map(Number);
        const corners = [point(ctx, x, y), point(ctx, x + width, y), point(ctx, x + width, y + height), point(ctx, x, y + height)];
        addDevicePathPoints(tracker, corners);
        // The axis-aligned rectangle is a conservative join model for the
        // rounded path: its 90-degree miter bounds contain every rounded corner.
        const subpath = beginTrackedSubpath(tracker, corners[0]);
        for (let index = 0; index < corners.length; index += 1) {
          addTrackedLine(tracker, corners[index], corners[(index + 1) % corners.length]);
        }
        subpath.closed = true;
        tracker.currentPoint = corners[0];
        if (Math.abs(width) > 1e-9 || Math.abs(height) > 1e-9) tracker.pathHasGeometry = true;
      });
    }
    wrap("arc", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "arc", args);
      const [cx, cy, radius, start, end] = args.slice(0, 5).map(Number);
      const sweep = normalizeArcSweep(start, end, Boolean(args[5]));
      const startPoint = point(ctx, cx + radius * Math.cos(start), cy + radius * Math.sin(start));
      if (!tracker.currentPoint) beginTrackedSubpath(tracker, startPoint);
      else if (distance(tracker.currentPoint, startPoint) > 1e-9) {
        addTrackedLine(tracker, tracker.currentPoint, startPoint);
        tracker.pathHasGeometry = true;
      }
      sampleUserCurve(ctx, (t) => ({
        x: cx + radius * Math.cos(start + sweep * t),
        y: cy + radius * Math.sin(start + sweep * t)
      }), 256);
      const finalAngle = start + sweep;
      const finalPoint = point(ctx, cx + radius * Math.cos(finalAngle), cy + radius * Math.sin(finalAngle));
      if (Math.abs(sweep) > 1e-9 && radius > 0) {
        const direction = Math.sign(sweep);
        addTrackedSegment(
          tracker,
          startPoint,
          finalPoint,
          unit(vector(ctx, -radius * Math.sin(start) * direction, radius * Math.cos(start) * direction)),
          unit(vector(ctx, -radius * Math.sin(finalAngle) * direction, radius * Math.cos(finalAngle) * direction))
        );
        tracker.pathHasGeometry = true;
      } else {
        tracker.currentPoint = finalPoint;
      }
    });
    wrap("ellipse", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "ellipse", args);
      const [cx, cy, radiusX, radiusY, rotation, start, end] = args.slice(0, 7).map(Number);
      const sweep = normalizeArcSweep(start, end, Boolean(args[7]));
      const ellipsePoint = (angle: number) => ({
        x: cx + radiusX * Math.cos(angle) * Math.cos(rotation) - radiusY * Math.sin(angle) * Math.sin(rotation),
        y: cy + radiusX * Math.cos(angle) * Math.sin(rotation) + radiusY * Math.sin(angle) * Math.cos(rotation)
      });
      const startPoint = point(ctx, ellipsePoint(start).x, ellipsePoint(start).y);
      if (!tracker.currentPoint) beginTrackedSubpath(tracker, startPoint);
      else if (distance(tracker.currentPoint, startPoint) > 1e-9) {
        addTrackedLine(tracker, tracker.currentPoint, startPoint);
        tracker.pathHasGeometry = true;
      }
      sampleUserCurve(ctx, (t) => ellipsePoint(start + sweep * t), 256);
      const finalAngle = start + sweep;
      const finalUserPoint = ellipsePoint(finalAngle);
      const finalPoint = point(ctx, finalUserPoint.x, finalUserPoint.y);
      if (Math.abs(sweep) > 1e-9 && radiusX > 0 && radiusY > 0) {
        const direction = Math.sign(sweep);
        const tangent = (angle: number) => vector(
          ctx,
          (-radiusX * Math.sin(angle) * Math.cos(rotation) - radiusY * Math.cos(angle) * Math.sin(rotation)) * direction,
          (-radiusX * Math.sin(angle) * Math.sin(rotation) + radiusY * Math.cos(angle) * Math.cos(rotation)) * direction
        );
        addTrackedSegment(tracker, startPoint, finalPoint, unit(tangent(start)), unit(tangent(finalAngle)));
        tracker.pathHasGeometry = true;
      } else {
        tracker.currentPoint = finalPoint;
      }
    });
    wrap("quadraticCurveTo", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "quadraticCurveTo", args);
      const control = point(ctx, Number(args[0]), Number(args[1]));
      const end = point(ctx, Number(args[2]), Number(args[3]));
      const start = tracker.currentPoint ?? control;
      if (!tracker.currentPoint) beginTrackedSubpath(tracker, start);
      tracker.path = merge(tracker.path, quadraticBounds(start, control, end));
      if (distance(start, end) > 1e-9 || distance(start, control) > 1e-9) {
        addTrackedSegment(
          tracker,
          start,
          end,
          unit(distance(start, control) > 1e-9
            ? { x: control.x - start.x, y: control.y - start.y }
            : { x: end.x - start.x, y: end.y - start.y }),
          unit(distance(control, end) > 1e-9
            ? { x: end.x - control.x, y: end.y - control.y }
            : { x: end.x - start.x, y: end.y - start.y })
        );
        tracker.pathHasGeometry = true;
      } else {
        tracker.currentPoint = end;
      }
    });
    wrap("bezierCurveTo", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "bezierCurveTo", args);
      const firstControl = point(ctx, Number(args[0]), Number(args[1]));
      const secondControl = point(ctx, Number(args[2]), Number(args[3]));
      const end = point(ctx, Number(args[4]), Number(args[5]));
      const start = tracker.currentPoint ?? firstControl;
      if (!tracker.currentPoint) beginTrackedSubpath(tracker, start);
      tracker.path = merge(tracker.path, cubicBounds(start, firstControl, secondControl, end));
      if (distance(start, end) > 1e-9 || distance(start, firstControl) > 1e-9 || distance(end, secondControl) > 1e-9) {
        const startDirection = distance(start, firstControl) > 1e-9
          ? { x: firstControl.x - start.x, y: firstControl.y - start.y }
          : distance(start, secondControl) > 1e-9
            ? { x: secondControl.x - start.x, y: secondControl.y - start.y }
            : { x: end.x - start.x, y: end.y - start.y };
        const endDirection = distance(secondControl, end) > 1e-9
          ? { x: end.x - secondControl.x, y: end.y - secondControl.y }
          : distance(firstControl, end) > 1e-9
            ? { x: end.x - firstControl.x, y: end.y - firstControl.y }
            : { x: end.x - start.x, y: end.y - start.y };
        addTrackedSegment(tracker, start, end, unit(startDirection), unit(endDirection));
        tracker.pathHasGeometry = true;
      } else {
        tracker.currentPoint = end;
      }
    });
    wrap("arcTo", (ctx, args) => {
      const tracker = trackerFor(ctx);
      appendPathCommand(tracker, "arcTo", args);
      const first = point(ctx, Number(args[0]), Number(args[1]));
      const second = point(ctx, Number(args[2]), Number(args[3]));
      const radius = Number(args[4]) * transformScale(ctx);
      if (!tracker.currentPoint) {
        addDevicePathPoints(tracker, [first]);
        beginTrackedSubpath(tracker, first);
        return;
      }
      const start = tracker.currentPoint;
      const firstLength = distance(start, first);
      const secondLength = distance(first, second);
      const firstDirection = firstLength > 0 ? { x: (start.x - first.x) / firstLength, y: (start.y - first.y) / firstLength } : null;
      const secondDirection = secondLength > 0 ? { x: (second.x - first.x) / secondLength, y: (second.y - first.y) / secondLength } : null;
      const cross = firstDirection && secondDirection
        ? firstDirection.x * secondDirection.y - firstDirection.y * secondDirection.x
        : 0;
      if (!firstDirection || !secondDirection || radius <= 0 || Math.abs(cross) < 1e-9) {
        addDevicePathPoints(tracker, [start, first]);
        if (distance(start, first) > 1e-9) {
          addTrackedLine(tracker, start, first);
          tracker.pathHasGeometry = true;
        } else {
          tracker.currentPoint = first;
        }
        return;
      }
      if (!transformIsConformal(ctx)) {
        tracker.unsupported.add("arcTo(non-conformal-transform)");
        addDevicePathPoints(tracker, [start, first, second]);
        addTrackedLine(tracker, start, first);
        tracker.pathHasGeometry = true;
        return;
      }
      const dot = Math.max(-1, Math.min(1, firstDirection.x * secondDirection.x + firstDirection.y * secondDirection.y));
      const angle = Math.acos(dot);
      const tangentDistance = radius / Math.tan(angle / 2);
      const tangentStart = {
        x: first.x + firstDirection.x * tangentDistance,
        y: first.y + firstDirection.y * tangentDistance
      };
      const tangentEnd = {
        x: first.x + secondDirection.x * tangentDistance,
        y: first.y + secondDirection.y * tangentDistance
      };
      const bisectorLength = Math.hypot(firstDirection.x + secondDirection.x, firstDirection.y + secondDirection.y);
      if (!Number.isFinite(tangentDistance) || bisectorLength < 1e-9) {
        addDevicePathPoints(tracker, [start, first]);
        addTrackedLine(tracker, start, first);
        tracker.pathHasGeometry = true;
        return;
      }
      const centerDistance = radius / Math.sin(angle / 2);
      const center = {
        x: first.x + (firstDirection.x + secondDirection.x) / bisectorLength * centerDistance,
        y: first.y + (firstDirection.y + secondDirection.y) / bisectorLength * centerDistance
      };
      const startAngle = Math.atan2(tangentStart.y - center.y, tangentStart.x - center.x);
      const sweep = cross < 0 ? angle : -angle;
      addDevicePathPoints(tracker, [start, tangentStart]);
      if (distance(start, tangentStart) > 1e-9) addTrackedLine(tracker, start, tangentStart);
      sampleDeviceCurve(tracker, (t) => ({
        x: center.x + radius * Math.cos(startAngle + sweep * t),
        y: center.y + radius * Math.sin(startAngle + sweep * t)
      }), 128);
      const direction = Math.sign(sweep);
      const endAngle = startAngle + sweep;
      addTrackedSegment(
        tracker,
        tangentStart,
        tangentEnd,
        unit({ x: -Math.sin(startAngle) * direction, y: Math.cos(startAngle) * direction }),
        unit({ x: -Math.sin(endAngle) * direction, y: Math.cos(endAngle) * direction })
      );
      tracker.pathHasGeometry = true;
    });
    wrap("fill", (ctx, args) => {
      const tracker = trackerFor(ctx);
      if (args[0] instanceof Path2D) {
        recordUnsupportedPaint(ctx, "fill(Path2D)");
        return;
      }
      recordPaint(ctx, tracker.pathHasGeometry ? tracker.path : null, false, "fill", args);
    });
    wrap("stroke", (ctx, args) => {
      const tracker = trackerFor(ctx);
      if (args[0] instanceof Path2D) {
        recordUnsupportedPaint(ctx, "stroke(Path2D)");
        return;
      }
      recordPaint(ctx, tracker.pathHasGeometry ? tracker.path : null, true, "stroke", args);
    });
    for (const method of ["fillRect", "strokeRect"] as const) {
      wrap(method, (ctx, args) => {
        const [x, y, width, height] = args.map(Number);
        recordPaint(ctx, boundsForPoints([
          point(ctx, x, y), point(ctx, x + width, y), point(ctx, x + width, y + height), point(ctx, x, y + height)
        ]), method === "strokeRect", method, args);
      });
    }
    for (const method of ["fillText", "strokeText"] as const) {
      wrap(method, (ctx, args) => {
        const text = String(args[0]);
        const x = Number(args[1]);
        const y = Number(args[2]);
        const metrics = ctx.measureText(text);
        recordPaint(ctx, boundsForPoints([
          point(ctx, x - metrics.actualBoundingBoxLeft, y - metrics.actualBoundingBoxAscent),
          point(ctx, x + metrics.actualBoundingBoxRight, y + metrics.actualBoundingBoxDescent)
        ]), method === "strokeText", method, args);
      });
    }
    wrap("clip", (ctx, args) => {
      const tracker = trackerFor(ctx);
      if (args[0] instanceof Path2D) {
        tracker.clip = { bounds: null, empty: false, unknown: true };
        tracker.unsupported.add("clip(Path2D)");
        return;
      }
      if (!tracker.pathHasGeometry || !tracker.path) {
        tracker.clip = { bounds: null, empty: true, unknown: false };
        return;
      }
      if (tracker.clip.empty) return;
      if (tracker.clip.unknown) return;
      const next = tracker.clip.bounds ? intersect(tracker.clip.bounds, tracker.path) : { ...tracker.path };
      tracker.clip = next
        ? { bounds: next, empty: false, unknown: false }
        : { bounds: null, empty: true, unknown: false };
    });
    wrap("save", (ctx) => { const tracker = trackerFor(ctx); tracker.clipStack.push(copyClip(tracker.clip)); });
    wrap("restore", (ctx) => {
      const tracker = trackerFor(ctx);
      const restored = tracker.clipStack.pop();
      if (restored) tracker.clip = restored;
    });
    wrap("clearRect", (ctx, args) => {
      const tracker = trackerFor(ctx);
      const [x, y, width, height] = args.map(Number);
      const matrix = ctx.getTransform();
      const corners = boundsForPoints([
        point(ctx, x, y), point(ctx, x + width, y), point(ctx, x + width, y + height), point(ctx, x, y + height)
      ]);
      const axisAligned = Math.abs(matrix.b) <= 1e-9 && Math.abs(matrix.c) <= 1e-9;
      const clearsBitmap = tracker.clip.bounds === null && !tracker.clip.empty && !tracker.clip.unknown && axisAligned && corners &&
        corners.left <= 0.01 && corners.top <= 0.01 &&
        corners.right >= ctx.canvas.width - 0.01 && corners.bottom >= ctx.canvas.height - 0.01;
      if (clearsBitmap) resetPaintFrame(tracker);
      else tracker.partialClears += 1;
    });
    for (const method of ["drawImage", "putImageData"] as const) {
      wrap(method, (ctx) => recordUnsupportedPaint(ctx, method));
    }
    if (typeof proto.reset === "function") wrap("reset", (ctx) => resetBitmapState(trackerFor(ctx)));

    const canvasProto = HTMLCanvasElement.prototype;
    const originalGetContext = canvasProto.getContext;
    Object.defineProperty(canvasProto, "getContext", {
      configurable: true,
      writable: true,
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        const context = (originalGetContext as unknown as (...values: unknown[]) => unknown).apply(this, args);
        if (context instanceof CanvasRenderingContext2D) trackerFor(context);
        return context;
      }
    });
    for (const property of ["width", "height"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(canvasProto, property);
      if (!descriptor?.get || !descriptor.set) continue;
      Object.defineProperty(canvasProto, property, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(this: HTMLCanvasElement, value: number) {
          descriptor.set!.call(this, value);
          for (const ctx of contextsByCanvas.get(this) ?? []) resetBitmapState(trackerFor(ctx));
        }
      });
    }

    Object.defineProperty(HTMLCanvasElement.prototype, snapshotSymbol, {
      configurable: true,
      value: function (this: HTMLCanvasElement) {
        const contexts = Array.from(contextsByCanvas.get(this) ?? []);
        const tracker = contexts[0] ? trackerFor(contexts[0]) : null;
        const box = this.getBoundingClientRect();
        const scaleX = box.width > 0 && this.width > 0 ? this.width / box.width : 1;
        const scaleY = box.height > 0 && this.height > 0 ? this.height / box.height : 1;
        const paint = tracker?.paint ?? null;
        const overflow = paint ? {
          left: Math.max(0, -paint.left / scaleX),
          top: Math.max(0, -paint.top / scaleY),
          right: Math.max(0, (paint.right - this.width) / scaleX),
          bottom: Math.max(0, (paint.bottom - this.height) / scaleY)
        } : { left: 0, top: 0, right: 0, bottom: 0 };
        const maxOverflow = Math.max(overflow.left, overflow.top, overflow.right, overflow.bottom);
        const offendingOperations = (tracker?.offenders ?? []).map((offender) => ({
          ...offender,
          overflowCssPx: {
            left: offender.overflowBacking.left / scaleX,
            top: offender.overflowBacking.top / scaleY,
            right: offender.overflowBacking.right / scaleX,
            bottom: offender.overflowBacking.bottom / scaleY,
            max: Math.max(
              offender.overflowBacking.left / scaleX,
              offender.overflowBacking.top / scaleY,
              offender.overflowBacking.right / scaleX,
              offender.overflowBacking.bottom / scaleY
            )
          }
        }));
        const unsupportedOperations = new Set(tracker?.unsupported ?? []);
        if (this.width <= 0 || this.height <= 0) {
          unsupportedOperations.add(`canvas-backing-store-zero:${this.width}x${this.height}`);
        }
        const isCandidate = this.matches("canvas[role='img']") ||
          Boolean(this.closest('[data-viz-surface-kind="signature-canvas"]'));
        if (tracker && tracker.operations === 0 && isCandidate) {
          const blankPolicy = this.getAttribute("data-diagram-blank-policy");
          if (blankPolicy === null) unsupportedOperations.add("blank-canvas-without-policy");
          else if (blankPolicy !== "intentional-empty-v1") {
            unsupportedOperations.add(`blank-canvas-policy-invalid:${blankPolicy}`);
          }
        }
        const snapshot = {
          ready: Boolean(tracker),
          frameEpoch: tracker?.frame ?? 0,
          paintOperationCount: tracker?.operations ?? 0,
          boundsBacking: paint,
          overflowCssPx: { ...overflow, max: maxOverflow },
          offendingOperations,
          unsupportedOperations: Array.from(unsupportedOperations),
          partialClearCount: tracker?.partialClears ?? 0
        };
        this.dataset.vizCanvas2dBoundaryReady = String(snapshot.ready);
        this.dataset.vizCanvas2dOverflowCssPx = maxOverflow.toFixed(3);
        this.dataset.vizCanvas2dPaintOperationCount = String(snapshot.paintOperationCount);
        this.dataset.vizCanvas2dUnsupportedOperations = snapshot.unsupportedOperations.join(",") || "none";
        return snapshot;
      }
    });
  });
}
