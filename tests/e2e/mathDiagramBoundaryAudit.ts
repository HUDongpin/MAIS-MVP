import type { Page } from "@playwright/test";

export type MathDiagramIssueKind =
  | "page-horizontal-overflow"
  | "masked-container-overflow"
  | "runtime-error"
  | "surface-zero-size"
  | "svg-missing-viewbox"
  | "svg-content-outside-viewport"
  | "svg-audit-incomplete"
  | "angle-contract-invalid"
  | "canvas-2d-content-outside-bitmap"
  | "canvas-2d-audit-incomplete"
  | "plot-content-outside-frame"
  | "label-label-collision"
  | "label-mark-collision"
  | "diagram-outside-container"
  | "unreachable-scroll-content"
  | "media-outside-container";

export type MathDiagramRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MathDiagramBoundaryIssue = {
  kind: MathDiagramIssueKind;
  surface: string;
  element: string;
  overflowPx: number;
  surfaceRect: MathDiagramRect;
  elementRect: MathDiagramRect;
  detail: string;
};

export type MathDiagramBoundaryResult = {
  url: string;
  documentWidth: { client: number; scroll: number };
  coverage: {
    candidateDiagramSvgCount: number;
    diagramSvgCount: number;
    zeroSizeDiagramSvgCount: number;
    candidateImageCount: number;
    imageCount: number;
    zeroSizeImageCount: number;
    candidateCanvasCount: number;
    canvasCount: number;
    zeroSizeCanvasCount: number;
    candidateCanvas2dCount: number;
    auditedCanvas2dCount: number;
    incompleteCanvas2dCount: number;
    canvas2dPaintOperationCount: number;
    candidateResponsiveDiagramContainerCount: number;
    responsiveDiagramContainerCount: number;
    zeroSizeResponsiveDiagramContainerCount: number;
    checkedGraphicElementCount: number;
    svgPaintEffectCount: number;
    auditedSvgPaintEffectCount: number;
    incompleteSvgPaintEffectCount: number;
    candidateAngleContractCount: number;
    angleContractCount: number;
    invalidAngleContractCount: number;
  };
  issues: MathDiagramBoundaryIssue[];
};

export type MathDiagramBoundaryOptions = {
  epsilonPx?: number;
  rootSelector?: string;
};

export type DiagramLayoutStabilityOptions = {
  epsilonPx?: number;
  minimumCandidateSurfaceCount?: number;
  rootSelector?: string;
  stableSampleCount?: number;
  timeoutMs?: number;
};

export type DiagramLayoutStabilityResult = {
  candidateSurfaceCount: number;
  elapsedMs: number;
  sampleCount: number;
};

const defaultRootSelector = "main";
const diagramDiscoverySelectors = {
  svg: [
    ":scope > svg",
    "svg[data-diagram-surface]",
    "[data-diagram-surface] svg",
    "svg[role='img']",
    "svg[role='group']",
    "svg[aria-label]",
    "[data-figure-stage] svg",
    "[data-question-figure] svg",
    "[data-viz-surface] svg"
  ].join(","),
  image: [
    "img[data-diagram-surface]",
    "[data-diagram-surface] img",
    "figure img",
    "[data-question-id] img",
    "img[alt]:not([alt=''])"
  ].join(","),
  canvas: [
    "canvas[data-diagram-surface]",
    "[data-diagram-surface] canvas",
    "[data-viz-surface] canvas",
    "canvas[role='img']"
  ].join(","),
  responsive: [
    "[data-diagram-surface]",
    "[data-figure-stage],[data-figure-scroll-region],[data-question-figure]",
    "[data-counting-dot-card]",
    "[data-handwriting-board]",
    "[data-metric-conversion-result-card]",
    "[data-viz-surface],[data-viz-responsive-diagram-container],[data-viz-card-formula]",
    "[data-viz-three-formula]",
    "[data-viz-manim-formula-overlay],[data-viz-manim-projected-label]",
    "[data-viz-label]"
  ].join(",")
} as const;

/**
 * Measures what the browser actually laid out. This deliberately does not
 * treat `overflow: hidden` as a fix: hidden overflow is reported separately so
 * a clipped diagram cannot pass merely because the missing pixels are masked.
 */
export async function auditMathDiagramPage(
  page: Page,
  options: MathDiagramBoundaryOptions = {}
): Promise<MathDiagramBoundaryResult> {
  return page.evaluate(({ epsilonPx, rootSelector, selectors }) => {
    type Rect = { x: number; y: number; width: number; height: number };
    type Edges = { left: number; right: number; top: number; bottom: number };
    type Issue = {
      kind:
        | "page-horizontal-overflow"
        | "masked-container-overflow"
        | "runtime-error"
        | "surface-zero-size"
        | "svg-missing-viewbox"
        | "svg-content-outside-viewport"
        | "svg-audit-incomplete"
        | "angle-contract-invalid"
        | "canvas-2d-content-outside-bitmap"
        | "canvas-2d-audit-incomplete"
        | "plot-content-outside-frame"
        | "label-label-collision"
        | "label-mark-collision"
        | "diagram-outside-container"
        | "unreachable-scroll-content"
        | "media-outside-container";
      surface: string;
      element: string;
      overflowPx: number;
      surfaceRect: Rect;
      elementRect: Rect;
      detail: string;
    };

    const root = document.querySelector(rootSelector) ?? document.body;
    const issues: Issue[] = [];
    const seenIssues = new Set<string>();
    const epsilon = epsilonPx;

    const rect = (value: DOMRect): Rect => ({
      x: Number(value.x.toFixed(3)),
      y: Number(value.y.toFixed(3)),
      width: Number(value.width.toFixed(3)),
      height: Number(value.height.toFixed(3))
    });
    const edgeOverflow = (outer: Edges, inner: Edges, expansion = 0) => Math.max(
      outer.left - (inner.left - expansion),
      outer.top - (inner.top - expansion),
      (inner.right + expansion) - outer.right,
      (inner.bottom + expansion) - outer.bottom,
      0
    );
    const intersection = (first: Edges, second: Edges): Edges => ({
      left: Math.max(first.left, second.left),
      right: Math.min(first.right, second.right),
      top: Math.max(first.top, second.top),
      bottom: Math.min(first.bottom, second.bottom)
    });
    const hasArea = (value: Edges) => value.right > value.left && value.bottom > value.top;
    const boundsFromPoints = (points: DOMPoint[]): DOMRect | null => {
      if (points.length === 0 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        return null;
      }
      const left = Math.min(...points.map((point) => point.x));
      const right = Math.max(...points.map((point) => point.x));
      const top = Math.min(...points.map((point) => point.y));
      const bottom = Math.max(...points.map((point) => point.y));
      return new DOMRect(left, top, right - left, bottom - top);
    };
    const mappedBox = (box: DOMRect | SVGRect, matrix: DOMMatrix): DOMRect | null => boundsFromPoints([
      new DOMPoint(box.x, box.y),
      new DOMPoint(box.x + box.width, box.y),
      new DOMPoint(box.x, box.y + box.height),
      new DOMPoint(box.x + box.width, box.y + box.height)
    ].map((point) => point.matrixTransform(matrix)));
    const mappedSvgViewBox = (svg: SVGSVGElement): DOMRect | null => {
      if (!svg.hasAttribute("viewBox")) return null;
      const viewBox = svg.viewBox.baseVal;
      const matrix = svg.getScreenCTM();
      if (!matrix || viewBox.width <= 0 || viewBox.height <= 0) return null;
      return mappedBox(viewBox, matrix);
    };
    const isRenderedCandidate = (element: Element) => {
      if (typeof element.checkVisibility === "function") {
        return element.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true
        });
      }
      let current: Element | null = element;
      while (current) {
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
          return false;
        }
        current = current.parentElement;
      }
      return true;
    };
    const screenStrokeExpansion = (element: SVGGraphicsElement, style: CSSStyleDeclaration) => {
      const strokeOpacity = Number.parseFloat(style.strokeOpacity || "1");
      const strokeWidth = Number.parseFloat(style.strokeWidth);
      if (style.stroke === "none" || strokeOpacity <= 0 || !Number.isFinite(strokeWidth) || strokeWidth <= 0) {
        return 0;
      }
      if (style.vectorEffect.includes("non-scaling-stroke")) return strokeWidth / 2;
      const matrix = element.getScreenCTM();
      if (!matrix) return strokeWidth / 2;
      // The largest singular value converts a user-space stroke into a safe
      // CSS-pixel expansion even under rotation, skew, or non-uniform scale.
      const firstColumn = matrix.a * matrix.a + matrix.b * matrix.b;
      const secondColumn = matrix.c * matrix.c + matrix.d * matrix.d;
      const cross = matrix.a * matrix.c + matrix.b * matrix.d;
      const discriminant = Math.sqrt(
        Math.max(0, (firstColumn - secondColumn) ** 2 + 4 * cross * cross)
      );
      const scale = Math.sqrt(Math.max(0, (firstColumn + secondColumn + discriminant) / 2));
      return strokeWidth * scale / 2;
    };
    const shortText = (value: string | null | undefined, fallback: string) => {
      const normalized = (value ?? "").replace(/\s+/gu, " ").trim();
      return (normalized || fallback).slice(0, 100);
    };
    const surfaceName = (element: Element, fallback: string) => shortText(
      element.getAttribute("aria-label") ??
        element.getAttribute("data-viz-name") ??
        element.getAttribute("data-viz-family-id") ??
        element.closest("[data-ccss-lesson]")?.getAttribute("data-ccss-lesson") ??
        element.closest("[data-question-id]")?.getAttribute("data-question-id"),
      fallback
    );
    const elementName = (element: Element) => shortText(
      element.getAttribute("data-viz-name") ??
        element.getAttribute("aria-label") ??
        element.textContent,
      element.tagName.toLowerCase()
    );
    const pushIssue = (issue: Issue) => {
      const key = `${issue.kind}|${issue.surface}|${issue.element}|${issue.detail}`;
      if (seenIssues.has(key)) return;
      seenIssues.add(key);
      issues.push(issue);
    };

    const documentClientWidth = document.documentElement.clientWidth;
    const documentScrollWidth = document.documentElement.scrollWidth;
    // Root-page width is an integer DOM invariant, not a paint-boundary
    // measurement. Keep the 1 CSS px epsilon for SVG/DOM geometry below, but
    // require the document itself to have exactly zero horizontal overflow.
    if (documentScrollWidth !== documentClientWidth) {
      const horizontalOffenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 0 &&
            (box.left < -epsilon || box.right > documentClientWidth + epsilon);
        })
        .filter((element) => !Array.from(element.children).some((child) => {
          const box = child.getBoundingClientRect();
          return box.left < -epsilon || box.right > documentClientWidth + epsilon;
        }))
        .slice(0, 12)
        .map((element) => {
          const box = element.getBoundingClientRect();
          const identity = [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : "",
            element.getAttribute("data-ccss-lesson")
              ? `[data-ccss-lesson=${element.getAttribute("data-ccss-lesson")}]`
              : "",
            element.getAttribute("data-question-id")
              ? `[data-question-id=${element.getAttribute("data-question-id")}]`
              : ""
          ].join("");
          const classHint = Array.from(element.classList).slice(0, 5).join(".");
          return `${identity}${classHint ? `.${classHint}` : ""} left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} width=${box.width.toFixed(1)}`;
        });
      const missionTrail = root.querySelector<HTMLElement>('[data-testid="mission-trail"]');
      const missionTrailDiagnostic = missionTrail
        ? (() => {
            const box = missionTrail.getBoundingClientRect();
            const avatarAnchor = missionTrail.querySelector<HTMLElement>(":scope > div[class*='absolute']");
            const avatarBox = avatarAnchor?.getBoundingClientRect();
            return `; mission trail left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} client/scroll=${missionTrail.clientWidth}/${missionTrail.scrollWidth}` +
              (avatarBox
                ? ` avatar-anchor left=${avatarBox.left.toFixed(1)} right=${avatarBox.right.toFixed(1)} width=${avatarBox.width.toFixed(1)}`
                : "");
          })()
        : "";
      const scrollWidthSources = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
        .filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + epsilon)
        .sort((first, second) => (second.scrollWidth - second.clientWidth) - (first.scrollWidth - first.clientWidth))
        .slice(0, 8)
        .map((element) => {
          const box = element.getBoundingClientRect();
          const classHint = Array.from(element.classList).slice(0, 4).join(".");
          return `${element.tagName.toLowerCase()}${classHint ? `.${classHint}` : ""} left=${box.left.toFixed(1)} right=${box.right.toFixed(1)} client/scroll=${element.clientWidth}/${element.scrollWidth} overflow-x=${getComputedStyle(element).overflowX}`;
        });
      pushIssue({
        kind: "page-horizontal-overflow",
        surface: "document",
        element: "documentElement",
        overflowPx: Number((documentScrollWidth - documentClientWidth).toFixed(3)),
        surfaceRect: { x: 0, y: 0, width: documentClientWidth, height: document.documentElement.clientHeight },
        elementRect: { x: 0, y: 0, width: documentScrollWidth, height: document.documentElement.scrollHeight },
        detail: `document.scrollWidth=${documentScrollWidth} differs from clientWidth=${documentClientWidth}` +
          (horizontalOffenders.length ? `; deepest offenders: ${horizontalOffenders.join(" | ")}` : "") +
          missionTrailDiagnostic +
          (scrollWidthSources.length ? `; scroll-width sources: ${scrollWidthSources.join(" | ")}` : "")
      });
    }

    const excludedDiagramIcon = (element: Element) => Boolean(
      element.closest("[aria-hidden='true'], button, [role='button']")
    );
    const svgCandidates = Array.from(root.querySelectorAll<SVGSVGElement>(selectors.svg))
      .filter((svg, index, all) => all.indexOf(svg) === index)
      .filter((svg) => !excludedDiagramIcon(svg))
      .filter(isRenderedCandidate);
    const imageCandidates = Array.from(root.querySelectorAll<HTMLImageElement>(
      selectors.image
    ))
      .filter((image, index, all) => all.indexOf(image) === index)
      .filter((image) => !excludedDiagramIcon(image))
      .filter((image) => image.alt.trim().length > 0 || Boolean(
        image.closest("[data-diagram-surface],figure,[data-question-id]")
      ))
      .filter(isRenderedCandidate);
    const canvasCandidates = Array.from(root.querySelectorAll<HTMLCanvasElement>(
      selectors.canvas
    ))
      .filter((canvas, index, all) => all.indexOf(canvas) === index)
      .filter((canvas) => !excludedDiagramIcon(canvas))
      .filter(isRenderedCandidate);
    const responsiveDiagramContainerCandidates = Array.from(root.querySelectorAll<HTMLElement>(
      selectors.responsive
    ))
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .filter((element) => !excludedDiagramIcon(element))
      .filter(isRenderedCandidate);

    const hasUsableSize = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.width > epsilon && box.height > epsilon;
    };
    const svgs = svgCandidates.filter(hasUsableSize);
    const images = imageCandidates.filter(hasUsableSize);
    const canvases = canvasCandidates.filter(hasUsableSize);
    const responsiveDiagramContainers = responsiveDiagramContainerCandidates.filter(hasUsableSize);

    const semanticAngleMarks = Array.from(root.querySelectorAll<SVGGraphicsElement>(
      "[data-diagram-angle-arc]"
    )).filter(isRenderedCandidate);
    let validAngleContractCount = 0;
    for (const [angleIndex, angleMark] of semanticAngleMarks.entries()) {
      const rawContract = angleMark.getAttribute("data-math-angle-contract");
      const angleName = surfaceName(angleMark, `angle mark ${angleIndex + 1}`);
      const angleRect = angleMark.getBoundingClientRect();
      const angleOwner = angleMark.ownerSVGElement?.getBoundingClientRect() ?? angleRect;
      const failAngle = (detail: string) => pushIssue({
        kind: "angle-contract-invalid",
        surface: angleName,
        element: elementName(angleMark),
        overflowPx: 0,
        surfaceRect: rect(angleOwner),
        elementRect: rect(angleRect),
        detail
      });
      if (!rawContract) {
        failAngle("semantic angle mark is missing data-math-angle-contract");
        continue;
      }
      try {
        const contract = JSON.parse(rawContract) as {
          version?: number;
          id?: string;
          space?: string;
          origin?: { x?: number; y?: number };
          radius?: number;
          start?: { x?: number; y?: number };
          end?: { x?: number; y?: number };
          startRay?: { x?: number; y?: number };
          endRay?: { x?: number; y?: number };
          sweepRadians?: number;
        };
        const finitePoint = (point: { x?: number; y?: number } | undefined) =>
          Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
        if (contract.version !== 1 || !contract.id || contract.space !== "svg" ||
          !finitePoint(contract.origin) || !finitePoint(contract.start) || !finitePoint(contract.end) ||
          !finitePoint(contract.startRay) || !finitePoint(contract.endRay) ||
          !Number.isFinite(contract.radius) || !Number.isFinite(contract.sweepRadians) || contract.radius! < 0) {
          failAngle("angle contract is malformed or contains non-finite SVG geometry");
          continue;
        }
        const origin = contract.origin as { x: number; y: number };
        const endpoints = [
          { label: "start", point: contract.start as { x: number; y: number }, ray: contract.startRay as { x: number; y: number } },
          { label: "end", point: contract.end as { x: number; y: number }, ray: contract.endRay as { x: number; y: number } }
        ];
        const contractProblems: string[] = [];
        const computedStrokeLinecap = getComputedStyle(angleMark).strokeLinecap;
        if (computedStrokeLinecap !== "butt") {
          contractProblems.push(
            `computed stroke-linecap must be butt so painted endpoints do not extend past the defining rays; received ${computedStrokeLinecap || "empty"}`
          );
        }
        for (const endpoint of endpoints) {
          const vector = { x: endpoint.point.x - origin.x, y: endpoint.point.y - origin.y };
          const rayLength = Math.hypot(endpoint.ray.x, endpoint.ray.y);
          const radiusError = Math.abs(Math.hypot(vector.x, vector.y) - contract.radius!);
          if (radiusError > 0.01) contractProblems.push(`${endpoint.label} radius error=${radiusError.toFixed(6)}`);
          if (!Number.isFinite(rayLength) || rayLength <= 1e-12) {
            contractProblems.push(`${endpoint.label} ray is degenerate`);
            continue;
          }
          const unitRay = { x: endpoint.ray.x / rayLength, y: endpoint.ray.y / rayLength };
          const rayMiss = Math.abs(vector.x * unitRay.y - vector.y * unitRay.x);
          const rayDot = vector.x * unitRay.x + vector.y * unitRay.y;
          if (rayMiss > 0.01) contractProblems.push(`${endpoint.label} ray miss=${rayMiss.toFixed(6)}`);
          if (rayDot < -0.01) contractProblems.push(`${endpoint.label} lies on the negative ray extension`);
          const expectedEndpoint = {
            x: origin.x + unitRay.x * contract.radius!,
            y: origin.y + unitRay.y * contract.radius!
          };
          const endpointError = Math.hypot(
            endpoint.point.x - expectedEndpoint.x,
            endpoint.point.y - expectedEndpoint.y
          );
          if (endpointError > 0.01) {
            contractProblems.push(`${endpoint.label} defining-ray endpoint error=${endpointError.toFixed(6)}`);
          }
        }
        const startRayLength = Math.hypot(endpoints[0].ray.x, endpoints[0].ray.y);
        const endRayLength = Math.hypot(endpoints[1].ray.x, endpoints[1].ray.y);
        if (Number.isFinite(startRayLength) && Number.isFinite(endRayLength) &&
          startRayLength > 1e-12 && endRayLength > 1e-12) {
          const startRay = { x: endpoints[0].ray.x / startRayLength, y: endpoints[0].ray.y / startRayLength };
          const endRay = { x: endpoints[1].ray.x / endRayLength, y: endpoints[1].ray.y / endRayLength };
          const cosine = Math.cos(contract.sweepRadians!);
          const sine = Math.sin(contract.sweepRadians!);
          const expectedEndRay = {
            x: startRay.x * cosine + startRay.y * sine,
            y: -startRay.x * sine + startRay.y * cosine
          };
          const sweepDirectionError = Math.hypot(expectedEndRay.x - endRay.x, expectedEndRay.y - endRay.y);
          if (sweepDirectionError > Math.max(1e-6, 0.01 / Math.max(1, contract.radius!))) {
            contractProblems.push(`signed sweep misses the end ray by ${sweepDirectionError.toFixed(6)}`);
          }
        }
        if (!(angleMark instanceof SVGPathElement) || typeof angleMark.getTotalLength !== "function") {
          contractProblems.push("semantic angle mark must be a pure SVG path");
        } else {
          const pathLength = angleMark.getTotalLength();
          if (!Number.isFinite(pathLength) || pathLength < 0) {
            contractProblems.push("painted path length is non-finite or negative");
          } else {
            const expectedPathLength = contract.radius! * Math.abs(contract.sweepRadians!);
            const pathLengthError = Math.abs(pathLength - expectedPathLength);
            const pathLengthTolerance = Math.max(0.05, expectedPathLength * 0.0005);
            if (pathLengthError > pathLengthTolerance) {
              contractProblems.push(
                `painted path length=${pathLength.toFixed(6)} expected=${expectedPathLength.toFixed(6)}`
              );
            }
            if (contract.radius! <= 1e-12 && Math.abs(contract.sweepRadians!) > 1e-12) {
              contractProblems.push("non-zero angle sweep has zero painted radius");
            }

            const pathStart = angleMark.getPointAtLength(0);
            const pathEnd = angleMark.getPointAtLength(pathLength);
            const startError = Math.hypot(pathStart.x - endpoints[0].point.x, pathStart.y - endpoints[0].point.y);
            const endError = Math.hypot(pathEnd.x - endpoints[1].point.x, pathEnd.y - endpoints[1].point.y);
            if (startError > 0.01) {
              contractProblems.push(`painted path starts ${startError.toFixed(6)} away from the contract start`);
            }
            if (endError > 0.01) {
              contractProblems.push(`painted path ends ${endError.toFixed(6)} away from the contract end`);
            }

            const sampleCount = pathLength > 0
              ? Math.min(8192, Math.max(256, Math.ceil(pathLength * 4)))
              : 1;
            let maximumRadiusError = 0;
            const mathematicalAngles: number[] = [];
            for (let sample = 0; sample <= sampleCount; sample += 1) {
              const point = angleMark.getPointAtLength(pathLength * sample / sampleCount);
              if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                maximumRadiusError = Number.POSITIVE_INFINITY;
                continue;
              }
              const relative = { x: point.x - origin.x, y: point.y - origin.y };
              maximumRadiusError = Math.max(
                maximumRadiusError,
                Math.abs(Math.hypot(relative.x, relative.y) - contract.radius!)
              );
              if (contract.radius! > 1e-12) {
                mathematicalAngles.push(Math.atan2(-relative.y, relative.x));
              }
            }
            if (maximumRadiusError > 0.02) {
              contractProblems.push(`painted path leaves its contract radius by ${maximumRadiusError.toFixed(6)}`);
            }

            if (mathematicalAngles.length > 1) {
              let paintedSweep = 0;
              for (let index = 1; index < mathematicalAngles.length; index += 1) {
                let step = mathematicalAngles[index] - mathematicalAngles[index - 1];
                while (step <= -Math.PI) step += Math.PI * 2;
                while (step > Math.PI) step -= Math.PI * 2;
                paintedSweep += step;
              }
              const paintedSweepError = Math.abs(paintedSweep - contract.sweepRadians!);
              const paintedSweepTolerance = Math.max(0.002, 0.02 / Math.max(1, contract.radius!));
              if (paintedSweepError > paintedSweepTolerance) {
                contractProblems.push(
                  `painted signed sweep=${paintedSweep.toFixed(6)} expected=${contract.sweepRadians!.toFixed(6)}`
                );
              }
            }
          }
        }
        if (contractProblems.length) {
          failAngle(`angle contract ${contract.id} failed: ${contractProblems.join("; ")}`);
          continue;
        }
        validAngleContractCount += 1;
      } catch (error) {
        failAngle(`angle contract JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    type Canvas2dBoundarySnapshot = {
      ready: boolean;
      frameEpoch: number;
      paintOperationCount: number;
      boundsBacking: Edges | null;
      overflowCssPx: Edges & { max: number };
      offendingOperations: Array<{
        operation: string;
        arguments: string;
        boundsBacking: Edges;
        overflowCssPx: Edges & { max: number };
        transform: [number, number, number, number, number, number];
        clip: { bounds: Edges | null; empty: boolean; unknown: boolean };
        pathCommands: string[];
        lineWidth: number;
        font: string;
        textAlign: string;
        textBaseline: string;
      }>;
      unsupportedOperations: string[];
      partialClearCount: number;
    };
    const canvasSnapshotSymbol = Symbol.for("mais.diagram-boundary.canvas-2d.snapshot");
    const canvas2dCandidates = canvases.filter((canvas) => {
      if (canvas.closest('[data-viz-renderer="three-r3f"]')) return false;
      return canvas.matches("canvas[role='img']") || Boolean(canvas.closest('[data-viz-surface-kind="signature-canvas"]'));
    });
    let auditedCanvas2dCount = 0;
    let canvas2dPaintOperationCount = 0;
    for (const [canvasIndex, canvas] of canvas2dCandidates.entries()) {
      const canvasName = surfaceName(canvas, `2D canvas ${canvasIndex + 1}`);
      const canvasRect = canvas.getBoundingClientRect();
      const failCanvasAudit = (detail: string) => pushIssue({
        kind: "canvas-2d-audit-incomplete",
        surface: canvasName,
        element: elementName(canvas),
        overflowPx: 0,
        surfaceRect: rect(canvasRect),
        elementRect: rect(canvasRect),
        detail
      });
      const snapshotFunction = (canvas as unknown as Record<symbol, unknown>)[canvasSnapshotSymbol];
      if (typeof snapshotFunction !== "function") {
        failCanvasAudit("2D canvas boundary init script was not installed before application paint");
        continue;
      }

      let snapshot: Canvas2dBoundarySnapshot;
      try {
        snapshot = (snapshotFunction as (this: HTMLCanvasElement) => Canvas2dBoundarySnapshot).call(canvas);
      } catch (error) {
        failCanvasAudit(`2D canvas boundary snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      canvas2dPaintOperationCount += snapshot.paintOperationCount;
      const isSignatureCanvas = Boolean(canvas.closest('[data-viz-surface-kind="signature-canvas"]'));
      const incompleteReasons: string[] = [];
      if (!snapshot.ready) incompleteReasons.push("no CanvasRenderingContext2D was observed");
      if (snapshot.unsupportedOperations.length) {
        incompleteReasons.push(`unsupported paint operations: ${snapshot.unsupportedOperations.join(", ")}`);
      }
      if (isSignatureCanvas && snapshot.paintOperationCount === 0) {
        incompleteReasons.push("signature canvas exposed no paint operations in its current frame");
      }
      if (incompleteReasons.length) {
        failCanvasAudit(incompleteReasons.join("; "));
      } else {
        auditedCanvas2dCount += 1;
      }

      if (snapshot.overflowCssPx.max <= epsilon) continue;
      const scaleX = canvas.width > 0 ? canvasRect.width / canvas.width : 1;
      const scaleY = canvas.height > 0 ? canvasRect.height / canvas.height : 1;
      const paintRect = snapshot.boundsBacking
        ? new DOMRect(
            canvasRect.left + snapshot.boundsBacking.left * scaleX,
            canvasRect.top + snapshot.boundsBacking.top * scaleY,
            (snapshot.boundsBacking.right - snapshot.boundsBacking.left) * scaleX,
            (snapshot.boundsBacking.bottom - snapshot.boundsBacking.top) * scaleY
          )
        : canvasRect;
      pushIssue({
        kind: "canvas-2d-content-outside-bitmap",
        surface: canvasName,
        element: elementName(canvas),
        overflowPx: Number(snapshot.overflowCssPx.max.toFixed(3)),
        surfaceRect: rect(canvasRect),
        elementRect: rect(paintRect),
        detail:
          `requested 2D paint crosses the canvas bitmap in CSS px ` +
          `(left=${snapshot.overflowCssPx.left.toFixed(3)}, top=${snapshot.overflowCssPx.top.toFixed(3)}, ` +
          `right=${snapshot.overflowCssPx.right.toFixed(3)}, bottom=${snapshot.overflowCssPx.bottom.toFixed(3)}); ` +
          `the browser's implicit bitmap clip cannot be used as a boundary fix` +
          snapshot.offendingOperations.slice(0, 6).map((offender, offenderIndex) => {
            const clip = offender.clip.unknown
              ? "unknown"
              : offender.clip.empty
                ? "empty"
                : offender.clip.bounds
                  ? `${offender.clip.bounds.left.toFixed(3)},${offender.clip.bounds.top.toFixed(3)},` +
                    `${offender.clip.bounds.right.toFixed(3)},${offender.clip.bounds.bottom.toFixed(3)}`
                  : "none";
            const commands = offender.pathCommands.slice(-8).join(";") || "none";
            return `; offender ${offenderIndex + 1}: ${offender.operation}(${offender.arguments}) ` +
              `boundsBacking=${offender.boundsBacking.left.toFixed(3)},${offender.boundsBacking.top.toFixed(3)},` +
              `${offender.boundsBacking.right.toFixed(3)},${offender.boundsBacking.bottom.toFixed(3)} ` +
              `overflowCss=${offender.overflowCssPx.max.toFixed(3)} ` +
              `transform=${offender.transform.map((value) => value.toFixed(3)).join(",")} ` +
              `clip=${clip} lineWidth=${offender.lineWidth.toFixed(3)} font=${offender.font} ` +
              `align=${offender.textAlign}/${offender.textBaseline} path=${commands}`;
          }).join("")
      });
    }

    let checkedGraphicElementCount = 0;
    let svgPaintEffectCount = 0;
    let auditedSvgPaintEffectCount = 0;
    let incompleteSvgPaintEffectCount = 0;
    for (const [svgIndex, svg] of svgCandidates.entries()) {
      const svgRect = svg.getBoundingClientRect();
      const name = surfaceName(svg, `svg ${svgIndex + 1}`);
      if (svgRect.width <= epsilon || svgRect.height <= epsilon) {
        pushIssue({
          kind: "surface-zero-size",
          surface: name,
          element: "svg",
          overflowPx: 0,
          surfaceRect: rect(svgRect),
          elementRect: rect(svgRect),
          detail: "rendered SVG has no usable width or height"
        });
        continue;
      }
      const mappedViewBoxRect = mappedSvgViewBox(svg);
      const svgBoundary = mappedViewBoxRect ?? svgRect;
      if (!mappedViewBoxRect) {
        pushIssue({
          kind: "svg-missing-viewbox",
          surface: name,
          element: "svg",
          overflowPx: 0,
          surfaceRect: rect(svgRect),
          elementRect: rect(svgRect),
          detail: svg.hasAttribute("viewBox")
            ? "semantic diagram SVG has an invalid or unmappable viewBox"
            : "semantic diagram SVG must expose a viewBox for responsive scaling and boundary checks"
        });
      }

      type ClipResolution = {
        hasClip: boolean;
        valid: boolean;
        bounds: DOMRect | null;
      };
      const resolveAppliedClip = (element: SVGGraphicsElement): ClipResolution => {
        const references: string[] = [];
        let owner: Element | null = element;
        while (owner) {
          const attributeReference = owner.getAttribute("clip-path") ?? owner.getAttribute("clipPath");
          const computedReference = getComputedStyle(owner).clipPath;
          const reference = attributeReference && attributeReference !== "none"
            ? attributeReference
            : computedReference !== "none"
              ? computedReference
              : "";
          if (reference) references.push(reference.trim());
          if (owner === svg) break;
          owner = owner.parentElement;
        }
        if (references.length === 0) return { hasClip: false, valid: false, bounds: null };

        let appliedBounds: Edges | null = null;
        for (const reference of references) {
          const match = reference.match(/^url\(\s*["']?#([^"')\s]+)["']?\s*\)$/u);
          const clipPath = match ? document.getElementById(match[1]) : null;
          if (!(clipPath instanceof SVGClipPathElement) || !svg.contains(clipPath)) {
            return { hasClip: true, valid: false, bounds: null };
          }
          if (clipPath.clipPathUnits.baseVal === SVGUnitTypes.SVG_UNIT_TYPE_OBJECTBOUNDINGBOX) {
            return { hasClip: true, valid: false, bounds: null };
          }

          const shapes = Array.from(clipPath.querySelectorAll<SVGGraphicsElement>(
            "rect,circle,ellipse,path,polygon,polyline,use"
          ));
          let clipBounds: Edges | null = null;
          for (const shape of shapes) {
            const style = getComputedStyle(shape);
            if (style.display === "none" || style.visibility === "hidden") continue;
            try {
              const matrix = shape.getScreenCTM();
              if (!matrix) return { hasClip: true, valid: false, bounds: null };
              const shapeBounds = mappedBox(shape.getBBox(), matrix);
              if (!shapeBounds || !hasArea(shapeBounds)) continue;
              clipBounds = clipBounds
                ? {
                    left: Math.min(clipBounds.left, shapeBounds.left),
                    right: Math.max(clipBounds.right, shapeBounds.right),
                    top: Math.min(clipBounds.top, shapeBounds.top),
                    bottom: Math.max(clipBounds.bottom, shapeBounds.bottom)
                  }
                : shapeBounds;
            } catch {
              return { hasClip: true, valid: false, bounds: null };
            }
          }
          if (!clipBounds || !hasArea(clipBounds)) {
            return { hasClip: true, valid: false, bounds: null };
          }
          appliedBounds = appliedBounds ? intersection(appliedBounds, clipBounds) : clipBounds;
          if (!hasArea(appliedBounds)) {
            return { hasClip: true, valid: false, bounds: null };
          }
        }

        return appliedBounds
          ? {
              hasClip: true,
              valid: true,
              bounds: new DOMRect(
                appliedBounds.left,
                appliedBounds.top,
                appliedBounds.right - appliedBounds.left,
                appliedBounds.bottom - appliedBounds.top
              )
            }
          : { hasClip: true, valid: false, bounds: null };
      };

      const localPaintServer = (rawReference: string, expected: "filter" | "marker") => {
        const match = rawReference.trim().match(/^url\(\s*["']?#([^"')\s]+)["']?\s*\)$/u);
        const target = match ? document.getElementById(match[1]) : null;
        if (expected === "marker" && target instanceof SVGMarkerElement && svg.contains(target)) return target;
        if (expected === "filter" && target instanceof SVGFilterElement && svg.contains(target)) return target;
        return null;
      };
      const unionRect = (first: DOMRect, second: DOMRect) => {
        const left = Math.min(first.left, second.left);
        const right = Math.max(first.right, second.right);
        const top = Math.min(first.top, second.top);
        const bottom = Math.max(first.bottom, second.bottom);
        return new DOMRect(left, top, right - left, bottom - top);
      };
      const markerPaintBounds = (
        graphic: SVGGraphicsElement,
        marker: SVGMarkerElement,
        position: "start" | "end",
        style: CSSStyleDeclaration
      ): { bounds: DOMRect | null; reason: string | null } => {
        if (!(graphic instanceof SVGGeometryElement) || typeof graphic.getTotalLength !== "function") {
          return { bounds: null, reason: `${position} marker owner is not measurable SVG geometry` };
        }
        const matrix = graphic.getScreenCTM();
        const length = graphic.getTotalLength();
        if (!matrix || !Number.isFinite(length) || length <= 0) {
          return { bounds: null, reason: `${position} marker owner has no finite path tangent` };
        }
        const delta = Math.min(length, Math.max(0.01, length * 0.001));
        const endpoint = graphic.getPointAtLength(position === "start" ? 0 : length);
        const neighbor = graphic.getPointAtLength(position === "start" ? delta : Math.max(0, length - delta));
        const tangent = position === "start"
          ? { x: neighbor.x - endpoint.x, y: neighbor.y - endpoint.y }
          : { x: endpoint.x - neighbor.x, y: endpoint.y - neighbor.y };
        if (Math.hypot(tangent.x, tangent.y) <= 1e-9) {
          return { bounds: null, reason: `${position} marker tangent is degenerate` };
        }

        const width = marker.markerWidth.baseVal.value;
        const height = marker.markerHeight.baseVal.value;
        const refX = marker.refX.baseVal.value;
        const refY = marker.refY.baseVal.value;
        if (![width, height, refX, refY].every(Number.isFinite) || width <= 0 || height <= 0) {
          return { bounds: null, reason: `${position} marker viewport or reference point is invalid` };
        }
        const viewBox = marker.viewBox.baseVal;
        const hasViewBox = marker.hasAttribute("viewBox");
        if (hasViewBox && (viewBox.width <= 0 || viewBox.height <= 0)) {
          return { bounds: null, reason: `${position} marker viewBox is invalid` };
        }
        const mapMarkerPoint = (x: number, y: number) => {
          if (!hasViewBox) return { x, y };
          const preserve = marker.preserveAspectRatio.baseVal;
          const rawScaleX = width / viewBox.width;
          const rawScaleY = height / viewBox.height;
          if (preserve.align === 1) {
            return {
              x: (x - viewBox.x) * rawScaleX,
              y: (y - viewBox.y) * rawScaleY
            };
          }
          const scale = preserve.meetOrSlice === 2
            ? Math.max(rawScaleX, rawScaleY)
            : Math.min(rawScaleX, rawScaleY);
          const spareX = width - viewBox.width * scale;
          const spareY = height - viewBox.height * scale;
          const xFactor = [2, 5, 8].includes(preserve.align) ? 0 : [3, 6, 9].includes(preserve.align) ? 0.5 : 1;
          const yFactor = preserve.align >= 2 && preserve.align <= 4 ? 0 : preserve.align <= 7 ? 0.5 : 1;
          return {
            x: (x - viewBox.x) * scale + spareX * xFactor,
            y: (y - viewBox.y) * scale + spareY * yFactor
          };
        };
        const reference = mapMarkerPoint(refX, refY);
        const markerUnitsScale = marker.markerUnits.baseVal === SVGMarkerElement.SVG_MARKERUNITS_STROKEWIDTH
          ? Number.parseFloat(style.strokeWidth)
          : 1;
        if (!Number.isFinite(markerUnitsScale) || markerUnitsScale <= 0) {
          return { bounds: null, reason: `${position} marker stroke-width units are invalid` };
        }
        const orient = marker.getAttribute("orient")?.trim() || "0";
        let angle = 0;
        if (orient === "auto" || orient === "auto-start-reverse") {
          angle = Math.atan2(tangent.y, tangent.x);
          if (orient === "auto-start-reverse" && position === "start") angle += Math.PI;
        } else {
          const degrees = Number.parseFloat(orient);
          if (!Number.isFinite(degrees)) return { bounds: null, reason: `${position} marker orientation is unsupported` };
          angle = degrees * Math.PI / 180;
        }
        if (getComputedStyle(marker).overflow === "visible") {
          const markerCoordinateBounds = hasViewBox
            ? { left: viewBox.x, right: viewBox.x + viewBox.width, top: viewBox.y, bottom: viewBox.y + viewBox.height }
            : { left: 0, right: width, top: 0, bottom: height };
          const children = Array.from(marker.querySelectorAll<SVGGraphicsElement>(
            "circle,ellipse,line,path,polygon,polyline,rect"
          ));
          if (children.length === 0 || children.some((child) => child.hasAttribute("transform") || child.hasAttribute("filter") || child.hasAttribute("mask"))) {
            return { bounds: null, reason: `${position} marker has unsupported visible-overflow contents` };
          }
          for (const child of children) {
            const childBox = child.getBBox();
            const childStyle = getComputedStyle(child);
            const stroke = childStyle.stroke === "none" ? 0 : Math.max(0, Number.parseFloat(childStyle.strokeWidth) / 2 || 0);
            if (childBox.x - stroke < markerCoordinateBounds.left - 1e-6 ||
              childBox.y - stroke < markerCoordinateBounds.top - 1e-6 ||
              childBox.x + childBox.width + stroke > markerCoordinateBounds.right + 1e-6 ||
              childBox.y + childBox.height + stroke > markerCoordinateBounds.bottom + 1e-6) {
              return { bounds: null, reason: `${position} marker paints outside its measurable viewport` };
            }
          }
        }
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const corners = [
          { x: 0, y: 0 }, { x: width, y: 0 }, { x: 0, y: height }, { x: width, y: height }
        ].map((corner) => {
          const relativeX = (corner.x - reference.x) * markerUnitsScale;
          const relativeY = (corner.y - reference.y) * markerUnitsScale;
          return new DOMPoint(
            endpoint.x + relativeX * cosine - relativeY * sine,
            endpoint.y + relativeX * sine + relativeY * cosine
          ).matrixTransform(matrix);
        });
        return { bounds: boundsFromPoints(corners), reason: null };
      };
      const filterPaintBounds = (
        graphic: SVGGraphicsElement,
        filter: SVGFilterElement
      ): { bounds: DOMRect | null; reason: string | null } => {
        const matrix = graphic.getScreenCTM();
        if (!matrix) return { bounds: null, reason: "filter owner has no screen transform" };
        let box: SVGRect;
        try {
          box = graphic.getBBox();
        } catch {
          return { bounds: null, reason: "filter owner has no measurable object bounds" };
        }
        const raw = (name: "x" | "y" | "width" | "height", fallback: string) =>
          filter.getAttribute(name) ?? fallback;
        const objectBoundingBox = filter.filterUnits.baseVal === SVGUnitTypes.SVG_UNIT_TYPE_OBJECTBOUNDINGBOX;
        const parse = (value: string, dimension: number) => {
          const normalized = value.trim();
          if (objectBoundingBox) {
            if (normalized.endsWith("%")) return Number.parseFloat(normalized) / 100 * dimension;
            return Number.parseFloat(normalized) * dimension;
          }
          if (!/^-?\d+(?:\.\d+)?$/u.test(normalized)) return Number.NaN;
          return Number(normalized);
        };
        const x = parse(raw("x", "-10%"), box.width);
        const y = parse(raw("y", "-10%"), box.height);
        const width = parse(raw("width", "120%"), box.width);
        const height = parse(raw("height", "120%"), box.height);
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
          return { bounds: null, reason: "filter region uses unsupported or invalid units" };
        }
        const local = objectBoundingBox
          ? new DOMRect(box.x + x, box.y + y, width, height)
          : new DOMRect(x, y, width, height);
        return { bounds: mappedBox(local, matrix), reason: null };
      };

      const graphics = Array.from(svg.querySelectorAll<SVGGraphicsElement>(
        "circle,ellipse,g,image,line,path,polygon,polyline,rect,text,use,foreignObject"
      )).filter((element) => !element.closest("defs,clipPath,mask,marker,pattern,symbol"));
      for (const graphic of graphics) {
        const graphicRect = graphic.getBoundingClientRect();
        if (!Number.isFinite(graphicRect.left) || !Number.isFinite(graphicRect.top)) continue;
        const style = getComputedStyle(graphic);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
        checkedGraphicElementCount += 1;
        const strokeExpansion = screenStrokeExpansion(graphic, style);
        let paintRect = new DOMRect(
          graphicRect.left - strokeExpansion,
          graphicRect.top - strokeExpansion,
          graphicRect.width + strokeExpansion * 2,
          graphicRect.height + strokeExpansion * 2
        );
        const effectLabels: string[] = [];
        const incompleteEffect = (label: string, detail: string) => {
          incompleteSvgPaintEffectCount += 1;
          pushIssue({
            kind: "svg-audit-incomplete",
            surface: name,
            element: `${graphic.tagName.toLowerCase()}: ${elementName(graphic)}`,
            overflowPx: 0,
            surfaceRect: rect(svgBoundary),
            elementRect: rect(graphicRect),
            detail: `${label} paint bounds are not reliably auditable: ${detail}`
          });
        };
        for (const [position, attribute] of [["start", "marker-start"], ["end", "marker-end"]] as const) {
          const reference = graphic.getAttribute(attribute) ?? style.getPropertyValue(attribute);
          if (!reference || reference === "none") continue;
          svgPaintEffectCount += 1;
          const marker = localPaintServer(reference, "marker");
          if (!(marker instanceof SVGMarkerElement)) {
            incompleteEffect(`${position} marker`, "reference is external, missing, or not a local SVG marker");
            continue;
          }
          const result = markerPaintBounds(graphic, marker, position, style);
          if (!result.bounds || result.reason) {
            incompleteEffect(`${position} marker`, result.reason ?? "marker bounds could not be mapped");
            continue;
          }
          auditedSvgPaintEffectCount += 1;
          effectLabels.push(`${position} marker`);
          paintRect = unionRect(paintRect, result.bounds);
        }
        const markerMid = graphic.getAttribute("marker-mid") ?? style.getPropertyValue("marker-mid");
        if (markerMid && markerMid !== "none") {
          svgPaintEffectCount += 1;
          incompleteEffect("mid marker", "path vertex enumeration is not supported");
        }
        const filterReference = graphic.getAttribute("filter") ?? style.filter;
        if (filterReference && filterReference !== "none") {
          svgPaintEffectCount += 1;
          const filter = localPaintServer(filterReference, "filter");
          if (!(filter instanceof SVGFilterElement)) {
            incompleteEffect("filter", "reference is external, missing, or not a local SVG filter");
          } else {
            const result = filterPaintBounds(graphic, filter);
            if (!result.bounds || result.reason) {
              incompleteEffect("filter", result.reason ?? "filter bounds could not be mapped");
            } else {
              auditedSvgPaintEffectCount += 1;
              effectLabels.push("filter region");
              paintRect = unionRect(paintRect, result.bounds);
            }
          }
        }
        const maskReference = graphic.getAttribute("mask") ?? style.getPropertyValue("mask");
        if (maskReference && maskReference !== "none") {
          svgPaintEffectCount += 1;
          incompleteEffect("mask", "arbitrary alpha-mask paint cannot be reduced to a reliable rectangle");
        }
        if (paintRect.width === 0 && paintRect.height === 0) continue;
        const overflow = edgeOverflow(svgBoundary, paintRect);
        if (overflow <= epsilon) continue;
        const clip = resolveAppliedClip(graphic);
        if (clip.hasClip && clip.valid && clip.bounds && edgeOverflow(svgBoundary, clip.bounds) <= epsilon) {
          continue;
        }
        pushIssue({
          kind: "svg-content-outside-viewport",
          surface: name,
          element: `${graphic.tagName.toLowerCase()}: ${elementName(graphic)}`,
          overflowPx: Number(overflow.toFixed(3)),
          surfaceRect: rect(svgBoundary),
          elementRect: rect(paintRect),
          detail: `drawn geometry${effectLabels.length ? ` including ${effectLabels.join(" and ")}` : ""} extends outside the SVG viewport and will be clipped or hidden`
        });
      }

      const plot = svg.querySelector<SVGGraphicsElement>("[data-diagram-plot]");
      if (plot) {
        const plotRect = plot.getBoundingClientRect();
        for (const mark of svg.querySelectorAll<SVGGraphicsElement>("[data-diagram-plot-mark]")) {
          const markRect = mark.getBoundingClientRect();
          const style = getComputedStyle(mark);
          const overflow = edgeOverflow(plotRect, markRect, screenStrokeExpansion(mark, style));
          if (overflow <= epsilon) continue;
          const clip = resolveAppliedClip(mark);
          if (clip.hasClip && clip.valid && clip.bounds && edgeOverflow(plotRect, clip.bounds) <= epsilon) {
            continue;
          }
          pushIssue({
            kind: "plot-content-outside-frame",
            surface: name,
            element: `${mark.tagName.toLowerCase()}: ${elementName(mark)}`,
            overflowPx: Number(overflow.toFixed(3)),
            surfaceRect: rect(plotRect),
            elementRect: rect(markRect),
            detail: "data geometry paints beyond the semantic plot rectangle without a plot-scoped clip path"
          });
        }
      }

      const labels = Array.from(svg.querySelectorAll<SVGGraphicsElement>("text,[data-viz-label]"))
        .filter((element, index, all) => all.indexOf(element) === index)
        .filter((element) => !element.closest("[data-viz-overlap-ok]"))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return box.width > epsilon && box.height > epsilon && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0;
        });
      const marks = Array.from(svg.querySelectorAll<SVGGraphicsElement>("[data-viz-mark]"))
        .filter((element) => !element.matches("text,[data-viz-label]"))
        .filter((element) => !element.closest("[data-viz-overlap-ok]"))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return box.width > epsilon && box.height > epsilon && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0;
        });
      const markContainsCompleteLabel = (mark: SVGGraphicsElement, labelRect: DOMRect) => {
        if (!(mark instanceof SVGGeometryElement) || typeof mark.isPointInFill !== "function") return false;
        const style = getComputedStyle(mark);
        const fillOpacity = Number.parseFloat(style.fillOpacity || "1");
        if (style.fill === "none" || fillOpacity <= 0) return false;
        const matrix = mark.getScreenCTM();
        if (!matrix) return false;
        let inverse: DOMMatrix;
        try {
          inverse = matrix.inverse();
        } catch {
          return false;
        }
        // Labels centred inside a filled region are often the mathematical
        // value of that region (area, bar count, set size). Treat that as an
        // intentional association only when every painted label corner stays
        // inside the fill; labels that spill out of a small region still fail.
        return [
          new DOMPoint(labelRect.left, labelRect.top),
          new DOMPoint(labelRect.right, labelRect.top),
          new DOMPoint(labelRect.left, labelRect.bottom),
          new DOMPoint(labelRect.right, labelRect.bottom)
        ].every((point) => mark.isPointInFill(point.matrixTransform(inverse)));
      };
      for (let firstIndex = 0; firstIndex < labels.length; firstIndex += 1) {
        const first = labels[firstIndex];
        const firstRect = first.getBoundingClientRect();
        for (let secondIndex = firstIndex + 1; secondIndex < labels.length; secondIndex += 1) {
          const second = labels[secondIndex];
          const secondRect = second.getBoundingClientRect();
          const overlap = intersection(firstRect, secondRect);
          const overlapWidth = overlap.right - overlap.left;
          const overlapHeight = overlap.bottom - overlap.top;
          if (overlapWidth <= epsilon || overlapHeight <= epsilon) continue;
          pushIssue({
            kind: "label-label-collision",
            surface: name,
            element: `${elementName(first)} / ${elementName(second)}`,
            overflowPx: Number(Math.max(overlapWidth, overlapHeight).toFixed(3)),
            surfaceRect: rect(firstRect),
            elementRect: rect(secondRect),
            detail: `two visible labels overlap by ${overlapWidth.toFixed(2)} x ${overlapHeight.toFixed(2)} CSS px`
          });
        }

        for (const mark of marks) {
          if (mark.contains(first) || first.contains(mark)) continue;
          const markRect = mark.getBoundingClientRect();
          if (markContainsCompleteLabel(mark, firstRect)) continue;
          const rawOverlap = intersection(firstRect, markRect);
          const clip = resolveAppliedClip(mark);
          const overlap = clip.valid && clip.bounds ? intersection(rawOverlap, clip.bounds) : rawOverlap;
          const overlapWidth = overlap.right - overlap.left;
          const overlapHeight = overlap.bottom - overlap.top;
          if (overlapWidth <= epsilon || overlapHeight <= epsilon) continue;
          pushIssue({
            kind: "label-mark-collision",
            surface: name,
            element: `${elementName(first)} / ${elementName(mark)}`,
            overflowPx: Number(Math.max(overlapWidth, overlapHeight).toFixed(3)),
            surfaceRect: rect(firstRect),
            elementRect: rect(markRect),
            detail: `a visible label overlaps a mathematical mark by ${overlapWidth.toFixed(2)} x ${overlapHeight.toFixed(2)} CSS px`
          });
        }
      }

      const semanticSvgOwner = svg.closest<HTMLElement>(
        "figure,[data-figure-stage],[data-figure-scroll-region],[data-question-figure],[data-viz-surface]," +
        "[data-ccss-lesson],article[data-question-id],.card,.glass-panel,.soft-panel"
      );
      let container = svg.parentElement;
      while (container && container !== root.parentElement) {
        const style = getComputedStyle(container);
        const ownsDiagramBoundary = container.matches(
          "figure,[data-figure-stage],[data-figure-scroll-region],[data-question-figure],[data-viz-surface]," +
          "[data-ccss-lesson],article[data-question-id],.card,.glass-panel,.soft-panel"
        );
        const containerRect = container.getBoundingClientRect();
        const horizontalCrossing = Math.max(
          containerRect.left - svgRect.left,
          svgRect.right - containerRect.right,
          0
        );
        const verticalCrossing = Math.max(
          containerRect.top - svgRect.top,
          svgRect.bottom - containerRect.bottom,
          0
        );
        const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
        const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
        const hiddenOverflowX = clipsX ? horizontalCrossing : 0;
        const hiddenOverflowY = clipsY ? verticalCrossing : 0;
        if (ownsDiagramBoundary && (hiddenOverflowX > epsilon || hiddenOverflowY > epsilon)) {
          pushIssue({
            kind: "masked-container-overflow",
            surface: name,
            element: shortText(container.getAttribute("class"), container.tagName.toLowerCase()),
            overflowPx: Number(Math.max(hiddenOverflowX, hiddenOverflowY).toFixed(3)),
            surfaceRect: rect(containerRect),
            elementRect: rect(svgRect),
            detail: "an SVG mathematical surface crosses a hidden clipping boundary"
          });
          break;
        }
        if (container === semanticSvgOwner || container === root) break;
        container = container.parentElement;
      }
    }

    for (const [index, media] of [...imageCandidates, ...canvasCandidates].entries()) {
      const mediaRect = media.getBoundingClientRect();
      const container = media.closest("figure,[data-viz-surface],[data-question-figure]") ?? media.parentElement;
      if (!container) continue;
      const containerRect = container.getBoundingClientRect();
      if (mediaRect.width <= epsilon || mediaRect.height <= epsilon) {
        pushIssue({
          kind: "surface-zero-size",
          surface: surfaceName(media, `${media.tagName.toLowerCase()} ${index + 1}`),
          element: media.tagName.toLowerCase(),
          overflowPx: 0,
          surfaceRect: rect(containerRect),
          elementRect: rect(mediaRect),
          detail: "rendered media surface has no usable width or height"
        });
        continue;
      }
      const overflow = edgeOverflow(containerRect, mediaRect);
      if (overflow > epsilon) {
        pushIssue({
          kind: "media-outside-container",
          surface: surfaceName(media, `${media.tagName.toLowerCase()} ${index + 1}`),
          element: media.tagName.toLowerCase(),
          overflowPx: Number(overflow.toFixed(3)),
          surfaceRect: rect(containerRect),
          elementRect: rect(mediaRect),
          detail: "rendered image or canvas crosses the boundary of its owning figure/surface"
        });
      }
    }

    for (const [index, diagram] of responsiveDiagramContainerCandidates.entries()) {
      const diagramRect = diagram.getBoundingClientRect();
      const semanticOwner = diagram.closest<HTMLElement>(
        "[data-question-id],[data-viz-surface],[data-figure-stage],[data-figure-scroll-region],[data-question-figure],figure"
      );
      const owner = semanticOwner && semanticOwner !== diagram
        ? semanticOwner
        : diagram.parentElement;
      if (!owner) continue;
      const ownerRect = owner.getBoundingClientRect();
      if (diagramRect.width <= epsilon || diagramRect.height <= epsilon) {
        pushIssue({
          kind: "surface-zero-size",
          surface: surfaceName(diagram, `responsive diagram ${index + 1}`),
          element: elementName(diagram),
          overflowPx: 0,
          surfaceRect: rect(ownerRect),
          elementRect: rect(diagramRect),
          detail: "rendered responsive diagram container has no usable width or height"
        });
        continue;
      }
      let clippingBoundary: HTMLElement | null = diagram;
      while (clippingBoundary && clippingBoundary !== root.parentElement) {
        const style = getComputedStyle(clippingBoundary);
        const clippingRect = clippingBoundary.getBoundingClientRect();
        const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
        const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
        const horizontalCrossing = Math.max(
          clippingRect.left - diagramRect.left,
          diagramRect.right - clippingRect.right,
          0
        );
        const verticalCrossing = Math.max(
          clippingRect.top - diagramRect.top,
          diagramRect.bottom - clippingRect.bottom,
          0
        );
        const hiddenOverflowX = clipsX
          ? Math.max(
              horizontalCrossing,
              clippingBoundary === diagram
                ? clippingBoundary.scrollWidth - clippingBoundary.clientWidth
                : 0,
              0
            )
          : 0;
        const hiddenOverflowY = clipsY
          ? Math.max(
              verticalCrossing,
              clippingBoundary === diagram
                ? clippingBoundary.scrollHeight - clippingBoundary.clientHeight
                : 0,
              0
            )
          : 0;
        if (hiddenOverflowX > epsilon || hiddenOverflowY > epsilon) {
          const overflow = Math.max(hiddenOverflowX, hiddenOverflowY);
          pushIssue({
            kind: "masked-container-overflow",
            surface: surfaceName(diagram, `responsive diagram ${index + 1}`),
            element: elementName(clippingBoundary),
            overflowPx: Number(overflow.toFixed(3)),
            surfaceRect: rect(clippingRect),
            elementRect: horizontalCrossing > epsilon || verticalCrossing > epsilon
              ? rect(diagramRect)
              : {
                  ...rect(clippingRect),
                  width: hiddenOverflowX > epsilon
                    ? Math.max(clippingRect.width, clippingBoundary.scrollWidth)
                    : clippingRect.width,
                  height: hiddenOverflowY > epsilon
                    ? Math.max(clippingRect.height, clippingBoundary.scrollHeight)
                    : clippingRect.height
                },
            detail: "an HTML mathematical surface crosses, or contains content beyond, a hidden clipping boundary"
          });
          break;
        }
        if (clippingBoundary === semanticOwner || clippingBoundary === root) break;
        clippingBoundary = clippingBoundary.parentElement;
      }
      const overflow = edgeOverflow(ownerRect, diagramRect);
      if (overflow <= epsilon) continue;
      pushIssue({
        kind: "diagram-outside-container",
        surface: surfaceName(diagram, `responsive diagram ${index + 1}`),
        element: elementName(diagram),
        overflowPx: Number(overflow.toFixed(3)),
        surfaceRect: rect(ownerRect),
        elementRect: rect(diagramRect),
        detail: "a responsive mathematical diagram crosses its owning mathematical-surface boundary"
      });
    }

    const figureStages = responsiveDiagramContainerCandidates.filter((candidate) =>
      candidate.matches("[data-figure-stage],[data-figure-scroll-region]")
    );
    for (const [index, stage] of figureStages.entries()) {
      if (stage.scrollWidth <= stage.clientWidth + epsilon) continue;
      const stageRect = stage.getBoundingClientRect();
      const scrollOriginLeft = stageRect.left + stage.clientLeft;
      const descendants = Array.from(stage.querySelectorAll<Element>("*"))
        .filter((element) => element.closest("[data-figure-stage],[data-figure-scroll-region]") === stage)
        .filter(isRenderedCandidate)
        .filter((element) => {
          let ancestor = element.parentElement;
          while (ancestor && ancestor !== stage) {
            const overflowX = getComputedStyle(ancestor).overflowX;
            if (overflowX === "auto" || overflowX === "scroll") return false;
            ancestor = ancestor.parentElement;
          }
          return true;
        })
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > epsilon && box.height > epsilon);
      const leftmost = descendants.reduce<{
        element: Element;
        box: DOMRect;
        originLeft: number;
      } | null>((current, candidate) => {
        const originLeft = candidate.box.left + stage.scrollLeft;
        return !current || originLeft < current.originLeft
          ? { ...candidate, originLeft }
          : current;
      }, null);
      if (!leftmost) continue;
      const unreachableLeft = scrollOriginLeft - leftmost.originLeft;
      if (unreachableLeft <= epsilon) continue;
      const ancestorTrail: string[] = [];
      let trailElement: Element | null = leftmost.element;
      while (trailElement && trailElement !== stage && ancestorTrail.length < 5) {
        const classes = Array.from(trailElement.classList).slice(0, 6).join(".");
        ancestorTrail.push(`${trailElement.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`);
        trailElement = trailElement.parentElement;
      }
      pushIssue({
        kind: "unreachable-scroll-content",
        surface: surfaceName(stage, `figure stage ${index + 1}`),
        element: elementName(leftmost.element),
        overflowPx: Number(unreachableLeft.toFixed(3)),
        surfaceRect: rect(stageRect),
        elementRect: rect(leftmost.box),
        detail: "an oversized centered HTML diagram begins before the horizontal scroll origin, so its left edge cannot be reached" +
          `; stage scrollLeft=${stage.scrollLeft.toFixed(1)}; ancestry=${ancestorTrail.join(" > ")}`
      });
    }

    // `overflow-x: hidden` on body/html must never turn an oversized diagram
    // into a passing page. Independently compare every rendered mathematical
    // surface with the viewport and permit the crossing only when a bounded,
    // deliberately scrollable ancestor makes all horizontal content reachable.
    const viewportSurfaceCandidates = [
      ...svgs,
      ...images,
      ...canvases,
      ...responsiveDiagramContainers
    ].filter((element, index, all) => all.indexOf(element) === index);
    for (const surface of viewportSurfaceCandidates) {
      const surfaceRect = surface.getBoundingClientRect();
      const viewportOverflow = Math.max(
        -surfaceRect.left,
        surfaceRect.right - documentClientWidth,
        0
      );
      if (viewportOverflow <= epsilon) continue;

      let ancestor = surface.parentElement;
      let hasBoundedReachableScroller = false;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        const isScrollable = style.overflowX === "auto" || style.overflowX === "scroll";
        if (
          isScrollable &&
          ancestor.scrollWidth > ancestor.clientWidth + epsilon &&
          ancestorRect.left >= -epsilon &&
          ancestorRect.right <= documentClientWidth + epsilon
        ) {
          hasBoundedReachableScroller = true;
          break;
        }
        if (ancestor === root || ancestor === document.body) break;
        ancestor = ancestor.parentElement;
      }
      if (hasBoundedReachableScroller) continue;

      pushIssue({
        kind: "page-horizontal-overflow",
        surface: surfaceName(surface, surface.tagName.toLowerCase()),
        element: elementName(surface),
        overflowPx: Number(viewportOverflow.toFixed(3)),
        surfaceRect: { x: 0, y: 0, width: documentClientWidth, height: document.documentElement.clientHeight },
        elementRect: rect(surfaceRect),
        detail: "a visible mathematical surface extends outside the viewport without a bounded local scroller; body/html clipping cannot mask it"
      });
    }

    return {
      url: window.location.href,
      documentWidth: { client: documentClientWidth, scroll: documentScrollWidth },
      coverage: {
        candidateDiagramSvgCount: svgCandidates.length,
        diagramSvgCount: svgs.length,
        zeroSizeDiagramSvgCount: svgCandidates.length - svgs.length,
        candidateImageCount: imageCandidates.length,
        imageCount: images.length,
        zeroSizeImageCount: imageCandidates.length - images.length,
        candidateCanvasCount: canvasCandidates.length,
        canvasCount: canvases.length,
        zeroSizeCanvasCount: canvasCandidates.length - canvases.length,
        candidateCanvas2dCount: canvas2dCandidates.length,
        auditedCanvas2dCount,
        incompleteCanvas2dCount: canvas2dCandidates.length - auditedCanvas2dCount,
        canvas2dPaintOperationCount,
        candidateResponsiveDiagramContainerCount: responsiveDiagramContainerCandidates.length,
        responsiveDiagramContainerCount: responsiveDiagramContainers.length,
        zeroSizeResponsiveDiagramContainerCount:
          responsiveDiagramContainerCandidates.length - responsiveDiagramContainers.length,
        checkedGraphicElementCount,
        svgPaintEffectCount,
        auditedSvgPaintEffectCount,
        incompleteSvgPaintEffectCount,
        candidateAngleContractCount: semanticAngleMarks.length,
        angleContractCount: validAngleContractCount,
        invalidAngleContractCount: semanticAngleMarks.length - validAngleContractCount
      },
      issues
    };
  }, {
    epsilonPx: options.epsilonPx ?? 1,
    rootSelector: options.rootSelector ?? defaultRootSelector,
    selectors: diagramDiscoverySelectors
  });
}

/**
 * Waits until semantic diagram surfaces have the same geometry for consecutive
 * animation-frame samples. This catches late font/image layout, ResizeObserver
 * updates, and canvas backing-size changes that a fixed sleep can miss.
 */
export async function waitForDiagramLayoutStable(
  page: Page,
  options: DiagramLayoutStabilityOptions = {}
): Promise<DiagramLayoutStabilityResult> {
  const epsilonPx = Math.max(0.01, options.epsilonPx ?? 0.25);
  const minimumCandidateSurfaceCount = Math.max(0, Math.floor(options.minimumCandidateSurfaceCount ?? 0));
  const requiredStableSamples = Math.max(2, Math.floor(options.stableSampleCount ?? 3));
  const timeoutMs = Math.max(250, options.timeoutMs ?? 5_000);
  const rootSelector = options.rootSelector ?? defaultRootSelector;
  const startedAt = Date.now();
  let sampleCount = 0;
  let stableSampleCount = 0;
  let previousSignature = "";
  let lastState = {
    candidateSurfaceCount: 0,
    fontsStatus: "unknown",
    pendingImageCount: 0
  };

  while (Date.now() - startedAt <= timeoutMs) {
    // A progressive 3D surface can replace its SVG fallback with a Manim
    // canvas after the caller's initial freeze. Pause every newly mounted
    // public playback control before sampling so the gate still requires
    // consecutive identical frames without racing late autoplay.
    await freezeMountedManimTimelines(page);
    const sample = await page.evaluate(async ({ epsilon, selector, selectors }) => {
      const root = document.querySelector(selector) ?? document.body;
      const isRenderedCandidate = (element: Element) => {
        if (typeof element.checkVisibility === "function") {
          return element.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true
          });
        }
        let current: Element | null = element;
        while (current) {
          const style = getComputedStyle(current);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
            return false;
          }
          current = current.parentElement;
        }
        return true;
      };
      const semanticSurfaceSelector = [
        selectors.svg,
        selectors.image,
        selectors.canvas,
        selectors.responsive
      ].join(",");
      const isDiagramSurfaceCandidate = (element: Element) => {
        if (element.closest("[aria-hidden='true'], button, [role='button']")) return false;
        if (element instanceof HTMLImageElement) {
          return element.alt.trim().length > 0 || Boolean(
            element.closest("[data-diagram-surface],figure,[data-question-id]")
          );
        }
        return true;
      };

      const images = Array.from(root.querySelectorAll<HTMLImageElement>(
        selectors.image
      ))
        .filter((image, index, all) => all.indexOf(image) === index)
        .filter(isDiagramSurfaceCandidate)
        .filter(isRenderedCandidate);
      // A full-page diagram audit measures figures below the initial viewport.
      // Native lazy images there may never start loading while the test waits,
      // so promote only the inventoried mathematical images to eager loading
      // before using readiness as a stability prerequisite.
      for (const image of images) {
        if (!image.complete && image.loading === "lazy") image.loading = "eager";
      }
      await Promise.all(images
        .filter((image) => image.complete)
        .map((image) => image.decode().catch(() => undefined)));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const surfaces = Array.from(root.querySelectorAll<Element>(semanticSurfaceSelector))
        .filter((element, index, all) => all.indexOf(element) === index)
        // Course shells and embedded labs contain animated SVG icons inside
        // buttons. They are controls, not mathematical paint, and their
        // sub-pixel motion must not hold the diagram stability gate open.
        .filter(isDiagramSurfaceCandidate)
        // Projected 3D labels are intentionally recomputed from the camera on
        // every render frame. They remain part of the boundary/collision audit
        // below, but their moving screen coordinates are not a page-layout
        // stability signal; including them can make an otherwise stable Manim
        // surface time out after slider-driven camera updates.
        .filter((element) => !element.matches("[data-viz-manim-projected-label]"))
        .filter(isRenderedCandidate);
      const diagramSvgs = Array.from(root.querySelectorAll<SVGSVGElement>(selectors.svg))
        .filter((svg, index, all) => all.indexOf(svg) === index)
        .filter(isDiagramSurfaceCandidate)
        .filter(isRenderedCandidate);
      const graphics = diagramSvgs
        // Visualization renderers have their own state and WebGL gates below;
        // several intentionally animate every frame. Their outer surface still
        // participates in this layout signature, while lesson/question SVGs
        // retain an internal mutation signature.
        .filter((svg) => !svg.closest("[data-viz-surface]"))
        .flatMap((svg) => Array.from(svg.querySelectorAll<SVGGraphicsElement>(
        "circle,ellipse,image,line,path,polygon,polyline,rect,text,use,foreignObject"
      )).filter((element) => !element.closest("defs,clipPath,mask,marker,pattern,symbol")));
      const quantize = (value: number) => Number.isFinite(value)
        ? Math.round(value / epsilon) * epsilon
        : null;
      const geometry = (element: Element) => {
        const box = element.getBoundingClientRect();
        const htmlElement = element instanceof HTMLElement ? element : null;
        const canvas = element instanceof HTMLCanvasElement ? element : null;
        const ownerSvg = element instanceof SVGGraphicsElement && !(element instanceof SVGSVGElement)
          ? element.ownerSVGElement
          : null;
        const ownerBox = ownerSvg?.getBoundingClientRect();
        return [
          element.tagName,
          element.getAttribute("data-ccss-lesson") ??
            element.getAttribute("data-viz-name") ??
            element.getAttribute("data-viz-family-id") ??
            element.getAttribute("data-viz-manim-projected-label") ??
            element.getAttribute("aria-label") ??
            element.getAttribute("data-figure-scroll-region") ??
            element.getAttribute("data-figure-stage") ??
            element.getAttribute("class") ??
            "",
          quantize(ownerBox ? box.left - ownerBox.left : box.left),
          quantize(ownerBox ? box.top - ownerBox.top : box.top),
          quantize(box.width),
          quantize(box.height),
          htmlElement?.clientWidth ?? null,
          htmlElement?.clientHeight ?? null,
          htmlElement?.scrollWidth ?? null,
          htmlElement?.scrollHeight ?? null,
          canvas?.width ?? null,
          canvas?.height ?? null
        ];
      };
      // Reading a layout box for every SVG primitive can take several seconds
      // on dense textbook figures. The audit below still measures every paint
      // bound; stability only needs a cheap signature that detects geometry
      // mutations between samples while the owning SVG box and fonts settle.
      const graphicSignature = (element: SVGGraphicsElement) => [
        element.tagName,
        ...[
          "class", "style", "transform", "d", "points",
          "x", "y", "x1", "y1", "x2", "y2",
          "cx", "cy", "r", "rx", "ry", "width", "height",
          "font-size", "stroke-width", "text-anchor"
        ].map((attribute) => element.getAttribute(attribute)),
        element.tagName.toLowerCase() === "text" ? element.textContent : null
      ];
      const pendingImageCount = images.filter((image) => !image.complete).length;
      const fontsStatus = document.fonts?.status ?? "loaded";
      const signature = JSON.stringify({
        document: [
          document.documentElement.clientWidth,
          document.documentElement.clientHeight,
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight
        ],
        surfaces: surfaces.map(geometry),
        graphics: graphics.map(graphicSignature)
      });
      return {
        candidateSurfaceCount: surfaces.length,
        fontsStatus,
        pendingImageCount,
        signature
      };
    }, { epsilon: epsilonPx, selector: rootSelector, selectors: diagramDiscoverySelectors });

    sampleCount += 1;
    lastState = {
      candidateSurfaceCount: sample.candidateSurfaceCount,
      fontsStatus: sample.fontsStatus,
      pendingImageCount: sample.pendingImageCount
    };
    const resourcesReady = sample.fontsStatus === "loaded" && sample.pendingImageCount === 0;
    const coverageReady = sample.candidateSurfaceCount >= minimumCandidateSurfaceCount;
    if (resourcesReady && coverageReady && sample.signature === previousSignature) {
      stableSampleCount += 1;
    } else {
      if (
        process.env.MATH_DIAGRAM_AUDIT_DEBUG === "1" &&
        previousSignature &&
        sample.signature !== previousSignature
      ) {
        process.stdout.write(
          `[math-diagram-audit] layout changed: ${describeLayoutSignatureDelta(previousSignature, sample.signature)}\n`
        );
      }
      stableSampleCount = resourcesReady && coverageReady ? 1 : 0;
    }
    previousSignature = sample.signature;
    if (stableSampleCount >= requiredStableSamples) {
      return {
        candidateSurfaceCount: sample.candidateSurfaceCount,
        elapsedMs: Date.now() - startedAt,
        sampleCount
      };
    }
    await page.waitForTimeout(25);
  }

  throw new Error(
    `Diagram layout did not stabilize within ${timeoutMs}ms: ` +
    `candidate surfaces=${lastState.candidateSurfaceCount} ` +
    `(minimum=${minimumCandidateSurfaceCount}), fonts=${lastState.fontsStatus}, ` +
    `pending images=${lastState.pendingImageCount}, samples=${sampleCount}`
  );
}

function describeLayoutSignatureDelta(previousSignature: string, nextSignature: string) {
  try {
    const previous = JSON.parse(previousSignature) as {
      document: unknown[];
      surfaces: unknown[][];
      graphics: unknown[][];
    };
    const next = JSON.parse(nextSignature) as typeof previous;
    const collections = ["document", "surfaces", "graphics"] as const;
    const changes: string[] = [];
    for (const collection of collections) {
      const before = previous[collection];
      const after = next[collection];
      const count = Math.max(before.length, after.length);
      for (let index = 0; index < count; index += 1) {
        if (JSON.stringify(before[index]) === JSON.stringify(after[index])) continue;
        changes.push(
          `${collection}[${index}] ${JSON.stringify(before[index])} -> ${JSON.stringify(after[index])}`
        );
        if (changes.length >= 4) return changes.join(" | ");
      }
    }
    return changes.join(" | ") || "signature bytes changed without a parsed geometry delta";
  } catch {
    return "signature changed but could not be parsed for diagnostics";
  }
}

export async function setAllRangeInputs(
  page: Page,
  target: "min" | "q1" | "mid" | "q3" | "max",
  rootSelector = "main",
  timeoutMs = 10_000
): Promise<number> {
  // AppShell and feature pages can each render a semantic <main>. The feature
  // surface is the innermost/last match, so scope control mutation there.
  const root = page.locator(rootSelector).last();
  const startedAt = Date.now();
  const effectiveTimeoutMs = Math.max(250, timeoutMs);
  let lastControlCount = 0;
  let lastMismatches: string[] = [];
  const recentSignatures: string[] = [];

  while (Date.now() - startedAt <= effectiveTimeoutMs) {
    const result = await root.evaluate(async (rootElement, requestedTarget) => {
      const expectedValue = (control: HTMLInputElement) => {
        const probe = document.createElement("input");
        probe.type = "range";
        probe.min = control.min;
        probe.max = control.max;
        probe.step = control.step;
        const minimum = Number(control.min || "0");
        const maximum = Number(control.max || "100");
        const fraction = requestedTarget === "min"
          ? 0
          : requestedTarget === "q1"
            ? 0.25
            : requestedTarget === "mid"
              ? 0.5
              : requestedTarget === "q3"
                ? 0.75
                : 1;
        probe.value = String(minimum + (maximum - minimum) * fraction);
        return probe.value;
      };
      const controls = Array.from(rootElement.querySelectorAll<HTMLInputElement>('input[type="range"]'));
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter && controls.length > 0) {
        throw new Error("HTMLInputElement.value setter is unavailable");
      }
      // Dispatch one controlled input at a time and let React commit before
      // resolving the next live node. Dispatching every synthetic input in one
      // JavaScript turn can batch sibling slider updates against stale state,
      // which makes two otherwise independent controls oscillate forever.
      for (let index = 0; index < controls.length; index += 1) {
        const control = Array.from(
          rootElement.querySelectorAll<HTMLInputElement>('input[type="range"]')
        )[index];
        if (!control) continue;
        const nextValue = expectedValue(control);
        if (control.value !== nextValue) {
          setter?.call(control, nextValue);
          // React's controlled range input consumes the bubbling input event. A
          // second synthetic change event can synchronously re-enter its change
          // plugin and pin the renderer, so emit the browser event the slider
          // actually produces while dragging.
          control.dispatchEvent(new Event("input", { bubbles: true }));
          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        }
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      // React may replace a controlled input after the event. Re-query before
      // validating so the assertion observes the live controls, not stale nodes.
      const finalControls = Array.from(rootElement.querySelectorAll<HTMLInputElement>('input[type="range"]'));
      const states = finalControls.map((control, index) => {
        const expected = expectedValue(control);
        const label = control.getAttribute("aria-label") || control.id || `range ${index + 1}`;
        return {
          expected,
          label,
          max: control.max || "100",
          min: control.min || "0",
          value: control.value
        };
      });
      return {
        allAtTarget: states.every((state) => state.value === state.expected),
        count: finalControls.length,
        mismatches: states
          .filter((state) => state.value !== state.expected)
          .map((state) => `${state.label}: value=${state.value}, expected=${state.expected}, min=${state.min}, max=${state.max}`),
        signature: JSON.stringify(states)
      };
    }, target);

    lastControlCount = result.count;
    lastMismatches = result.mismatches;
    recentSignatures.push(result.signature);
    if (recentSignatures.length > 4) recentSignatures.shift();
    // The page-side transaction already waits for two animation frames after
    // each React-controlled input and validates freshly queried live nodes.
    // A second outer pass can consume the entire timeout in throttled/headless
    // tabs even though every committed control is already exact.
    if (result.allAtTarget) return result.count;
    await page.waitForTimeout(25);
  }

  throw new Error(
    `Range controls did not settle at ${target} within ${effectiveTimeoutMs}ms: ` +
    `controls=${lastControlCount}; ${lastMismatches.slice(0, 8).join(" | ") || "state kept changing"}; ` +
    `recent=${recentSignatures.join(" -> ")}`
  );
}

export async function disableDiagramAuditMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
  // CSS cannot stop the requestAnimationFrame-driven MAIS Manim timeline.
  // Freeze any mounted scene through its public playback control so geometry
  // stability checks measure one deterministic frame instead of timing out on
  // an intentionally moving curve or label.
  await freezeMountedManimTimelines(page);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  ));
}

async function freezeMountedManimTimelines(page: Page) {
  await page.locator("[data-viz-manim-playback-toggle]").evaluateAll((buttons) => {
    for (const button of buttons) {
      if (button.textContent?.trim() === "Pause") {
        (button as HTMLButtonElement).click();
      }
    }
  });
}
