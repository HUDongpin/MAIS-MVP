import {
  compileHkVisualizationDecisionContract,
  hkVisualizationDecisionContractSource,
  type HkVisualizationDecisionContract,
} from "./hk-visualization-collision-scanner";

export type HkVisualizationRgb = { b: number; g: number; r: number };

export type HkVisualizationContrastIssueCode =
  | "ambiguous-mixed-background"
  | "ambiguous-mixed-svg-background"
  | "ambiguous-positioned-overlap"
  | "ambiguous-svg-occlusion"
  | "ambiguous-svg-paint-coverage"
  | "insufficient-contrast"
  | "unsupported-backdrop-filter"
  | "unsupported-background-image"
  | "unsupported-color"
  | "unsupported-filter"
  | "unsupported-generated-content"
  | "unsupported-inset-box-shadow"
  | "unsupported-mask"
  | "unsupported-mix-blend-mode"
  | "unsupported-opacity-stacking-context"
  | "unsupported-pseudo-element-paint"
  | "unsupported-svg-paint-server"
  | "unsupported-svg-raster-background"
  | "unsupported-svg-stroke-background"
  | "unsupported-svg-use-text"
  | "unsupported-shadow-hit-test"
  | "unsupported-text-shadow"
  | "unsupported-transform-background"
  | "unsupported-form-value-geometry";

export type HkVisualizationContrastIssue = {
  code: HkVisualizationContrastIssueCode;
  message: string;
  target: string;
};

export type HkVisualizationContrastEvidence = {
  background: string;
  backgroundLuminance: number;
  contrastRatio: number;
  effectiveOpacity: number;
  foreground: string;
  requiredRatio: number;
  target: string;
};

export type HkVisualizationContrastScanResult = {
  checkedTextCount: number;
  evidence: HkVisualizationContrastEvidence[];
  issues: HkVisualizationContrastIssue[];
  worst: HkVisualizationContrastEvidence | null;
};

export function hkVisualizationContrastRatio(foreground: HkVisualizationRgb, background: HkVisualizationRgb) {
  const linear = (channel: number) => {
    const value = Math.min(255, Math.max(0, channel)) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (color: HkVisualizationRgb) => (
    0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
  );
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

/**
 * Browser-serializable contrast scanner used by both the 918-cell release gate
 * and isolated adversarial paint fixtures. Unknown compositing is deliberately
 * a failure: claiming an exact ratio is unsafe when CSS/SVG paint cannot be
 * reduced to solid sRGB layers.
 */
function scanHkVisualizationTextContrastRuntime(
  root: Element,
  scanOptions: { authoringSelector: string },
  decisionContract: HkVisualizationDecisionContract,
): HkVisualizationContrastScanResult {
  type Rgba = { a: number; b: number; g: number; r: number };
  type Point = { x: number; y: number };
  type RectLike = {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  };
  type Candidate = { element: Element; rects: RectLike[]; svg: boolean; text: string };

  const evidence: HkVisualizationContrastEvidence[] = [];
  const issues: HkVisualizationContrastIssue[] = [];
  const issueKeys = new Set<string>();
  const colorCache = new Map<string, Rgba | null>();
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 1;
  sampleCanvas.height = 1;
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const {
    composedParentBehavior,
    multiSelectCompleteness,
    softWrapDecision,
  } = decisionContract;
  const composedParent = composedParentBehavior;

  const describe = (element: Element, text: string) => {
    const id = element.id ? `#${element.id}` : "";
    return `${element.tagName.toLowerCase()}${id} \"${text.replace(/\s+/g, " ").trim().slice(0, 70)}\"`;
  };
  const addIssue = (
    code: HkVisualizationContrastIssueCode,
    target: string,
    message: string
  ) => {
    const key = `${code}|${target}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push({ code, message: `${target}: ${message}`, target });
  };
  const parseOpacity = (value: string) => {
    if (!value.trim()) return 1;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1;
  };
  const parseColor = (value: string): Rgba | null => {
    const normalizedInput = value.trim();
    if (!normalizedInput || normalizedInput === "none" || /url\s*\(/i.test(normalizedInput)) return null;
    if (colorCache.has(normalizedInput)) return colorCache.get(normalizedInput) ?? null;
    if (!sampleContext || !CSS.supports("color", normalizedInput)) {
      colorCache.set(normalizedInput, null);
      return null;
    }
    try {
      sampleContext.clearRect(0, 0, 1, 1);
      sampleContext.globalCompositeOperation = "copy";
      sampleContext.fillStyle = normalizedInput;
      sampleContext.fillRect(0, 0, 1, 1);
      sampleContext.globalCompositeOperation = "source-over";
      const pixel = sampleContext.getImageData(0, 0, 1, 1).data;
      const color = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255 };
      colorCache.set(normalizedInput, color);
      return color;
    } catch {
      colorCache.set(normalizedInput, null);
      return null;
    }
  };
  const blend = (front: Rgba, back: Rgba): Rgba => {
    const alpha = front.a + back.a * (1 - front.a);
    if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha,
      g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha,
      b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha,
      a: alpha
    };
  };
  const linear = (channel: number) => {
    const value = Math.min(255, Math.max(0, channel)) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (color: Rgba) => (
    0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
  );
  const contrast = (foreground: Rgba, background: Rgba) => {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  };
  const colorLabel = (color: Rgba) => (
    `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`
  );
  const shadowRootsGlobalName = "__hkVisualizationShadowRootsV1";
  const recordedShadowRoots = (
    globalThis as unknown as Record<string, ShadowRoot[] | undefined>
  )[shadowRootsGlobalName] ?? [];
  const composedContains = (container: Element, candidate: Element) => {
    let current: Element | null = candidate;
    while (current) {
      if (current === container) return true;
      current = composedParent(current);
    }
    return false;
  };
  const composedClosest = (candidate: Element, selector: string) => {
    let current: Element | null = candidate;
    while (current) {
      if (current.matches(selector)) return current;
      current = composedParent(current);
    }
    return null;
  };
  const collectComposedShadowRoots = () => {
    const pendingShadowRoots: ShadowRoot[] = [];
    const seenShadowRoots = new Set<ShadowRoot>();
    const enqueueOpenShadowRoots = (scope: Element | ShadowRoot) => {
      const elements = scope instanceof Element
        ? [scope, ...Array.from(scope.querySelectorAll("*"))]
        : Array.from(scope.querySelectorAll("*"));
      for (const element of elements) {
        if (element.shadowRoot) pendingShadowRoots.push(element.shadowRoot);
      }
    };
    enqueueOpenShadowRoots(root);
    for (const shadowRoot of recordedShadowRoots) {
      if (
        shadowRoot.host.isConnected &&
        composedContains(root, shadowRoot.host)
      )
        pendingShadowRoots.push(shadowRoot);
    }
    while (pendingShadowRoots.length > 0) {
      const shadowRoot = pendingShadowRoots.shift();
      if (!shadowRoot || seenShadowRoots.has(shadowRoot)) continue;
      if (!composedContains(root, shadowRoot.host)) continue;
      seenShadowRoots.add(shadowRoot);
      enqueueOpenShadowRoots(shadowRoot);
    }
    return Array.from(seenShadowRoots);
  };
  const composedShadowRoots = collectComposedShadowRoots();
  const composedScopes: Array<Element | ShadowRoot> = [
    root,
    ...composedShadowRoots,
  ];
  const queryAllComposed = (selector: string) => {
    const matches = new Set<Element>();
    for (const scope of composedScopes) {
      for (const match of Array.from(scope.querySelectorAll(selector)))
        matches.add(match);
    }
    return Array.from(matches);
  };
  const createComposedElementsFromPoint = (
    {
      composedContains: hitTestContains,
      composedParent: hitTestParent,
      documentScope,
      onUnsupported,
      root: hitTestRoot,
      shadowRoots,
    }: {
      composedContains: (container: Element, candidate: Element) => boolean;
      composedParent: (element: Element) => Element | null;
      documentScope: Document;
      onUnsupported: (scope: Document | ShadowRoot) => void;
      root: Element;
      shadowRoots: readonly ShadowRoot[];
    },
  ) => {
    const shadowRootByHost = new Map<Element, ShadowRoot>();
    for (const shadowRoot of shadowRoots) {
      if (hitTestContains(hitTestRoot, shadowRoot.host))
        shadowRootByHost.set(shadowRoot.host, shadowRoot);
    }
    const belongsToScope = (
      scope: Document | ShadowRoot,
      candidate: Element,
    ) => {
      if (!hitTestContains(hitTestRoot, candidate)) return false;
      if (scope === documentScope) return true;
      if (!("host" in scope)) {
        onUnsupported(scope);
        return false;
      }
      let current: Element | null = candidate;
      while (current && current !== scope.host) {
        if (current.getRootNode() === scope) return true;
        current = hitTestParent(current);
      }
      return false;
    };
    return (x: number, y: number) => {
      const orderedLayers: Element[] = [];
      const seenElements = new Set<Element>();
      const activeScopes = new Set<Document | ShadowRoot>();
      const visitedScopes = new Set<Document | ShadowRoot>();
      const visitScope = (scope: Document | ShadowRoot) => {
        if (activeScopes.has(scope)) {
          onUnsupported(scope);
          return;
        }
        activeScopes.add(scope);
        visitedScopes.add(scope);
        try {
          if (typeof scope.elementsFromPoint !== "function") {
            onUnsupported(scope);
            return;
          }
          const scopeLayers = Array.from(scope.elementsFromPoint(x, y));
          for (const layer of scopeLayers) {
            if (!belongsToScope(scope, layer) || seenElements.has(layer))
              continue;
            seenElements.add(layer);
            const shadowRoot = shadowRootByHost.get(layer);
            if (shadowRoot) visitScope(shadowRoot);
            orderedLayers.push(layer);
          }
        } catch {
          onUnsupported(scope);
          return;
        } finally {
          activeScopes.delete(scope);
        }
      };
      visitScope(documentScope);
      for (const shadowRoot of shadowRootByHost.values()) {
        if (visitedScopes.has(shadowRoot)) continue;
        try {
          if (typeof shadowRoot.elementsFromPoint !== "function") {
            onUnsupported(shadowRoot);
            continue;
          }
          if (
            Array.from(shadowRoot.elementsFromPoint(x, y)).some((layer) =>
              belongsToScope(shadowRoot, layer)
            )
          )
            onUnsupported(shadowRoot);
        } catch {
          onUnsupported(shadowRoot);
        }
      }
      return orderedLayers;
    };
  };
  const composedElementsFromPoint = createComposedElementsFromPoint(
    {
      composedContains,
      composedParent,
      documentScope: document,
      onUnsupported: (() => {
        const reportedScopes = new Set<Document | ShadowRoot>();
        return (scope: Document | ShadowRoot) => {
          if (reportedScopes.has(scope)) return;
          reportedScopes.add(scope);
          const owner = scope instanceof ShadowRoot ? scope.host : root;
          addIssue(
            "unsupported-shadow-hit-test",
            describe(owner, "composed hit-test"),
            "required composed scope cannot supply elementsFromPoint evidence.",
          );
        };
      })(),
      root,
      shadowRoots: composedShadowRoots,
    },
  );
  const isVisiblePaint = (element: Element) => {
    if (
      !element.isConnected ||
      !composedContains(root, element) ||
      composedClosest(element, scanOptions.authoringSelector)
    )
      return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    let current: Element | null = element;
    let opacity = 1;
    while (current) {
      const style = getComputedStyle(current);
      if (
        style.display === "none"
        || style.contentVisibility === "hidden"
        || style.visibility === "hidden"
        || style.visibility === "collapse"
        || current.hasAttribute("hidden")
      ) return false;
      opacity *= parseOpacity(style.opacity);
      current = composedParent(current);
    }
    return opacity > 0;
  };
  const pseudoPaintIntersects = (
    owner: HTMLElement,
    style: CSSStyleDeclaration,
    textRects: readonly RectLike[],
  ) => {
    const parsePixels = (value: string) =>
      value.endsWith("px") && Number.isFinite(Number.parseFloat(value))
        ? Number.parseFloat(value)
        : null;
    const content = style.content.trim();
    const emptyGeneratedContent = content === "\"\"" || content === "''";
    const width = parsePixels(style.width);
    const height = parsePixels(style.height);
    if (width === null || height === null) return true;
    const horizontalExtras =
      style.boxSizing === "border-box"
        ? 0
        : [
            style.paddingLeft,
            style.paddingRight,
            style.borderLeftWidth,
            style.borderRightWidth,
          ].reduce((sum, value) => sum + (parsePixels(value) ?? 0), 0);
    const verticalExtras =
      style.boxSizing === "border-box"
        ? 0
        : [
            style.paddingTop,
            style.paddingBottom,
            style.borderTopWidth,
            style.borderBottomWidth,
          ].reduce((sum, value) => sum + (parsePixels(value) ?? 0), 0);
    const boxWidth = width + horizontalExtras;
    const boxHeight = height + verticalExtras;
    if (boxWidth <= 0 || boxHeight <= 0) {
      if (emptyGeneratedContent) return false;
      return true;
    }
    if (style.position !== "absolute" || style.transform !== "none") return true;
    const ownerStyle = getComputedStyle(owner);
    if (ownerStyle.position === "static") return true;
    const ownerRect = owner.getBoundingClientRect();
    const referenceLeft =
      ownerRect.left + (parsePixels(ownerStyle.borderLeftWidth) ?? 0);
    const referenceTop =
      ownerRect.top + (parsePixels(ownerStyle.borderTopWidth) ?? 0);
    const leftOffset = parsePixels(style.left);
    const rightOffset = parsePixels(style.right);
    const topOffset = parsePixels(style.top);
    const bottomOffset = parsePixels(style.bottom);
    const left =
      leftOffset !== null
        ? referenceLeft + leftOffset
        : rightOffset !== null
          ? referenceLeft + owner.clientWidth - rightOffset - boxWidth
          : null;
    const top =
      topOffset !== null
        ? referenceTop + topOffset
        : bottomOffset !== null
          ? referenceTop + owner.clientHeight - bottomOffset - boxHeight
          : null;
    if (left === null || top === null) return true;
    const pseudoRect = {
      bottom: top + boxHeight,
      left,
      right: left + boxWidth,
      top,
    };
    return textRects.some((rect) =>
      Math.min(rect.right, pseudoRect.right) -
          Math.max(rect.left, pseudoRect.left) >
        0.5 &&
      Math.min(rect.bottom, pseudoRect.bottom) -
          Math.max(rect.top, pseudoRect.top) >
        0.5,
    );
  };
  const pseudoElementAmbiguities = (
    element: Element,
    target: string,
    textRects: readonly RectLike[],
  ) => {
    if (!(element instanceof HTMLElement)) return;
    for (const pseudo of ["::before", "::after"] as const) {
      const style = getComputedStyle(element, pseudo);
      const content = style.content.trim();
      const generated = content !== "none" && content !== "normal";
      if (!generated || style.display === "none" || style.visibility === "hidden") continue;
      if (!pseudoPaintIntersects(element, style, textRects)) continue;
      const emptyGeneratedContent = content === "\"\"" || content === "''";
      if (!emptyGeneratedContent) {
        addIssue(
          "unsupported-generated-content",
          target,
          `${pseudo} generates ${JSON.stringify(content)} outside the DOM text-node scanner.`
        );
      }
      const background = parseColor(style.backgroundColor);
      const maskImage = style.maskImage || style.getPropertyValue("-webkit-mask-image");
      const backdropFilter = style.getPropertyValue("backdrop-filter")
        || style.getPropertyValue("-webkit-backdrop-filter");
      if (backdropFilter && backdropFilter !== "none") {
        addIssue(
          "unsupported-backdrop-filter",
          target,
          `${pseudo} backdrop-filter ${JSON.stringify(backdropFilter)} changes the sampled backdrop.`
        );
      }
      if (
        style.backgroundImage !== "none"
        || (background?.a ?? 0) > 0.001
        || style.boxShadow !== "none"
        || style.filter !== "none"
        || (backdropFilter && backdropFilter !== "none")
        || (maskImage && maskImage !== "none")
        || style.mixBlendMode !== "normal"
      ) {
        addIssue(
          "unsupported-pseudo-element-paint",
          target,
          `${pseudo} contributes generated paint whose exact glyph-region coverage cannot be reconstructed.`
        );
      }
    }
    const baseStyle = getComputedStyle(element);
    const fragmentPaintProperties = [
      "color",
      "font-size",
      "font-weight",
      "text-decoration-color",
      "text-decoration-line",
      "text-shadow",
      "-webkit-text-fill-color",
      "-webkit-text-stroke-color",
      "-webkit-text-stroke-width"
    ] as const;
    for (const pseudo of ["::first-line", "::first-letter"] as const) {
      const style = getComputedStyle(element, pseudo);
      const changed: string[] = fragmentPaintProperties.filter(
        (property) => style.getPropertyValue(property) !== baseStyle.getPropertyValue(property)
      );
      const fragmentBackground = parseColor(style.backgroundColor);
      if ((fragmentBackground?.a ?? 0) > 0.001 || style.backgroundImage !== "none") {
        changed.push("background-paint");
      }
      if (changed.length > 0) {
        addIssue(
          "unsupported-pseudo-element-paint",
          target,
          `${pseudo} overrides ${changed.join(", ")} outside the ordinary text-node paint model.`
        );
      }
    }
  };
  const compositingAmbiguities = (
    element: Element,
    target: string,
    textRects: readonly RectLike[] = [element.getBoundingClientRect()],
  ) => {
    const candidateRect = element.getBoundingClientRect();
    let nearestPaintedBackdrop: { fullyOpaque: boolean; covers: boolean } | null = null;
    let backdropOwner: Element | null = element;
    while (backdropOwner && !nearestPaintedBackdrop) {
      const backdropStyle = getComputedStyle(backdropOwner);
      const color = parseColor(backdropStyle.backgroundColor);
      if ((color?.a ?? 0) > 0.001 || backdropStyle.backgroundImage !== "none") {
        const rect = backdropOwner.getBoundingClientRect();
        nearestPaintedBackdrop = {
          covers: rect.left <= candidateRect.left + 0.5
            && rect.right >= candidateRect.right - 0.5
            && rect.top <= candidateRect.top + 0.5
            && rect.bottom >= candidateRect.bottom - 0.5,
          fullyOpaque: backdropStyle.backgroundImage === "none" && (color?.a ?? 0) >= 0.999
        };
      }
      backdropOwner = composedParent(backdropOwner);
    }
    const movementBackdropIsSelfContained = Boolean(
      nearestPaintedBackdrop?.fullyOpaque && nearestPaintedBackdrop.covers
    );
    let current: Element | null = element;
    while (current) {
      const style = getComputedStyle(current);
      pseudoElementAmbiguities(current, target, textRects);
      if (parseOpacity(style.opacity) < 0.999999) {
        addIssue(
          "unsupported-opacity-stacking-context",
          target,
          "CSS opacity creates a group stacking context whose contrast cannot be proven by independent alpha blending."
        );
      }
      if (style.backgroundImage !== "none") {
        addIssue(
          "unsupported-background-image",
          target,
          `background-image ${JSON.stringify(style.backgroundImage)} requires pixel-level proof.`
        );
      }
      if (style.filter !== "none") {
        addIssue("unsupported-filter", target, `filter ${JSON.stringify(style.filter)} changes rendered paint.`);
      }
      const backdropFilter = style.getPropertyValue("backdrop-filter")
        || style.getPropertyValue("-webkit-backdrop-filter");
      if (backdropFilter && backdropFilter !== "none") {
        addIssue(
          "unsupported-backdrop-filter",
          target,
          `backdrop-filter ${JSON.stringify(backdropFilter)} changes the sampled backdrop.`
        );
      }
      if (/\binset\b/i.test(style.boxShadow)) {
        addIssue(
          "unsupported-inset-box-shadow",
          target,
          `box-shadow ${JSON.stringify(style.boxShadow)} paints inside the text backdrop.`
        );
      }
      const maskImage = style.maskImage || style.getPropertyValue("-webkit-mask-image");
      if (maskImage && maskImage !== "none") {
        addIssue("unsupported-mask", target, `mask ${JSON.stringify(maskImage)} changes rendered paint coverage.`);
      }
      if (style.mixBlendMode !== "normal") {
        addIssue(
          "unsupported-mix-blend-mode",
          target,
          `mix-blend-mode ${JSON.stringify(style.mixBlendMode)} depends on the painted backdrop.`
        );
      }
      const translate = style.getPropertyValue("translate").trim();
      const rotate = style.getPropertyValue("rotate").trim();
      const scale = style.getPropertyValue("scale").trim();
      const positionedOffset = current instanceof HTMLElement
        && ["relative", "absolute", "fixed", "sticky"].includes(style.position)
        && [style.left, style.right, style.top, style.bottom].some((value) => (
          value !== "auto" && Math.abs(Number.parseFloat(value)) > 0.000001
        ));
      const movesIndependently = current instanceof HTMLElement && (
        style.transform !== "none"
        || (translate && translate !== "none")
        || (rotate && rotate !== "none")
        || (scale && scale !== "none")
        || positionedOffset
      );
      const nearestBackdropDoesNotCoverText = Boolean(
        nearestPaintedBackdrop && !nearestPaintedBackdrop.covers
      );
      if ((movesIndependently || nearestBackdropDoesNotCoverText) && !movementBackdropIsSelfContained) {
        addIssue(
          "unsupported-transform-background",
          target,
          "CSS layout/transform/translate/positioning leaves text outside the nearest painted ancestor background geometry."
        );
      }
      current = composedParent(current);
    }
  };
  const htmlBackground = (element: Element, target: string) => {
    const layers: Rgba[] = [];
    let current: Element | null = element;
    while (current) {
      const style = getComputedStyle(current);
      const color = parseColor(style.backgroundColor);
      if (color) layers.push(color);
      current = composedParent(current);
    }
    let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) background = blend(layer, background);
    if (background.a < 0.999) {
      addIssue("unsupported-color", target, "the page backdrop remains translucent after ancestor compositing.");
    }
    return background;
  };
  const pointsForRect = (rect: RectLike): Point[] => {
    const insetX = Math.min(Math.max(1, rect.width * 0.18), Math.max(1, rect.width / 2 - 0.5));
    const insetY = Math.min(Math.max(1, rect.height * 0.18), Math.max(1, rect.height / 2 - 0.5));
    const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return [
      centre,
      { x: rect.left + insetX, y: centre.y },
      { x: rect.right - insetX, y: centre.y },
      { x: centre.x, y: rect.top + insetY },
      { x: centre.x, y: rect.bottom - insetY }
    ].filter((point) => (
      point.x >= 0 && point.y >= 0 && point.x < innerWidth && point.y < innerHeight
    ));
  };
  const positionedPaintLayers = queryAllComposed("*");
  const positionedOverlap = (candidate: Element, candidateRect: RectLike, target: string) => {
    const overlapping = positionedPaintLayers.find((layer) => {
      if (
        layer === candidate ||
        composedContains(layer, candidate) ||
        composedContains(candidate, layer)
      )
        return false;
      if (!(layer instanceof HTMLElement)) return false;
      const style = getComputedStyle(layer);
      const color = parseColor(style.backgroundColor);
      if ((color?.a ?? 0) <= 0.001 && style.backgroundImage === "none") return false;
      const layerRect = layer.getBoundingClientRect();
      const geometricallyOverlaps =
        Math.min(candidateRect.right, layerRect.right) -
            Math.max(candidateRect.left, layerRect.left) >
          0.5 &&
        Math.min(candidateRect.bottom, layerRect.bottom) -
            Math.max(candidateRect.top, layerRect.top) >
          0.5;
      if (!geometricallyOverlaps) return false;
      return pointsForRect(candidateRect).some((point) => {
        if (
          point.x < layerRect.left ||
          point.x > layerRect.right ||
          point.y < layerRect.top ||
          point.y > layerRect.bottom
        )
          return false;
        const layers = composedElementsFromPoint(point.x, point.y);
        const layerIndex = layers.findIndex(
          (paint) => paint === layer || composedContains(layer, paint),
        );
        const candidateIndex = layers.findIndex(
          (paint) =>
            paint === candidate || composedContains(candidate, paint),
        );
        return layerIndex >= 0 && candidateIndex >= 0 && layerIndex < candidateIndex;
      });
    });
    if (overlapping) {
      addIssue(
        "ambiguous-positioned-overlap",
        target,
        `non-ancestor paint from ${overlapping.tagName.toLowerCase()} overlaps the text bounds.`
      );
    }
  };
  const svgStrokeHitAt = (shape: SVGElement, point: Point): boolean | null => {
    if (shape.matches("line,polyline")) return true;
    if (!(shape instanceof SVGGeometryElement)) return null;
    try {
      const matrix = shape.getScreenCTM();
      if (!matrix) return null;
      const localPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
      return shape.isPointInStroke(localPoint);
    } catch {
      return null;
    }
  };
  const svgBackgroundAt = (
    element: SVGElement,
    point: Point,
    base: Rgba,
    target: string
  ) => {
    const svg = element.ownerSVGElement;
    if (!svg) return base;
    const paintRoot = composedClosest(element, "text") ?? element;
    const shapes = composedElementsFromPoint(point.x, point.y)
      .filter((shape): shape is SVGElement => (
        shape instanceof SVGElement
        && shape.ownerSVGElement === svg
        && shape !== element
        && !composedContains(paintRoot, shape)
        && Boolean(shape.compareDocumentPosition(paintRoot) & Node.DOCUMENT_POSITION_FOLLOWING)
        && shape.matches("rect,circle,ellipse,polygon,polyline,line,path,use,image,foreignObject")
      ))
      .sort((left, right) => (
        left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      ));
    let background = base;
    for (const shape of shapes) {
      const style = getComputedStyle(shape);
      compositingAmbiguities(shape, target);
      if (shape.matches("image,use,foreignObject")) {
        addIssue(
          "unsupported-svg-raster-background",
          target,
          `${shape.tagName.toLowerCase()} paint beneath text requires rendered-pixel evidence.`
        );
        continue;
      }
      if (/url\s*\(/i.test(style.fill) || /url\s*\(/i.test(style.stroke)) {
        addIssue(
          "unsupported-svg-paint-server",
          target,
          "an SVG gradient/pattern paint server lies beneath the text."
        );
        continue;
      }
      const fill = parseColor(style.fill);
      const stroke = parseColor(style.stroke);
      const fillOpacity = parseOpacity(style.fillOpacity);
      const strokeOpacity = parseOpacity(style.strokeOpacity);
      const strokeWidth = Number.parseFloat(style.strokeWidth) || 0;
      const strokeOnlyGeometry = shape.matches("line,polyline")
        || ((fill?.a ?? 0) * fillOpacity <= 0.001
          && (stroke?.a ?? 0) * strokeOpacity > 0.001
          && strokeWidth > 0);
      const visibleStroke = (stroke?.a ?? 0) * strokeOpacity > 0.001 && strokeWidth > 0;
      const strokeHit = visibleStroke ? svgStrokeHitAt(shape, point) : false;
      if (strokeOnlyGeometry || strokeHit !== false) {
        addIssue(
          "unsupported-svg-stroke-background",
          target,
          strokeHit === null
            ? `${shape.tagName.toLowerCase()} has visible stroke paint whose point coverage cannot be certified.`
            : `${shape.tagName.toLowerCase()} stroke paint lies beneath the sampled glyph region.`
        );
        continue;
      }
      if (fill) background = blend({ ...fill, a: fill.a * fillOpacity }, background);
    }
    return background;
  };
  const svgPainterPreflight = (
    element: SVGElement,
    textRects: readonly RectLike[],
    target: string
  ) => {
    const svg = element.ownerSVGElement;
    if (!svg) return;
    const paintRoot = composedClosest(element, "text") ?? element;
    const sampledPaint = new Set<Element>();
    for (const rect of textRects) {
      for (const point of pointsForRect(rect)) {
        for (const layer of composedElementsFromPoint(point.x, point.y)) sampledPaint.add(layer);
      }
    }
    for (const shape of Array.from(svg.querySelectorAll<SVGElement>(
      "rect,circle,ellipse,polygon,polyline,line,path,use,image,foreignObject"
    ))) {
      if (shape === element || composedContains(paintRoot, shape)) continue;
      const style = getComputedStyle(shape);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || style.visibility === "collapse"
        || parseOpacity(style.opacity) <= 0
      ) continue;
      const rawRect = shape.getBoundingClientRect();
      const strokeWidth = Number.parseFloat(style.strokeWidth) || 0;
      const expansion = strokeWidth / 2;
      const shapeRect = {
        bottom: rawRect.bottom + expansion,
        left: rawRect.left - expansion,
        right: rawRect.right + expansion,
        top: rawRect.top - expansion
      };
      const overlapsText = textRects.some((textRect) => (
        Math.min(textRect.right, shapeRect.right) - Math.max(textRect.left, shapeRect.left) > 0.5
        && Math.min(textRect.bottom, shapeRect.bottom) - Math.max(textRect.top, shapeRect.top) > 0.5
      ));
      if (!overlapsText) continue;
      const beforeText = Boolean(
        shape.compareDocumentPosition(paintRoot) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (!beforeText) {
        addIssue(
          "ambiguous-svg-occlusion",
          target,
          `${shape.tagName.toLowerCase()} is painted after and intersects the text bounds.`
        );
        continue;
      }
      if (sampledPaint.has(shape)) continue;
      if (/url\s*\(/i.test(style.fill) || /url\s*\(/i.test(style.stroke)) {
        addIssue(
          "unsupported-svg-paint-server",
          target,
          "an unsampled SVG gradient/pattern paint server intersects the text bounds."
        );
      } else if (shape.matches("image,use,foreignObject")) {
        addIssue(
          "unsupported-svg-raster-background",
          target,
          `unsampled ${shape.tagName.toLowerCase()} paint intersects the text bounds.`
        );
      } else {
        const fill = parseColor(style.fill);
        const stroke = parseColor(style.stroke);
        const strokeOnly = shape.matches("line,polyline")
          || ((fill?.a ?? 0) * parseOpacity(style.fillOpacity) <= 0.001
            && (stroke?.a ?? 0) > 0.001
            && strokeWidth > 0);
        addIssue(
          strokeOnly ? "unsupported-svg-stroke-background" : "ambiguous-svg-paint-coverage",
          target,
          `unsampled ${shape.tagName.toLowerCase()} paint intersects the text bounds.`
        );
      }
    }
  };

  type FormTextControl =
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement;
  const displayedFormValue = (control: FormTextControl) => {
    if (control instanceof HTMLSelectElement) {
      if (control.multiple || control.size > 1)
        return Array.from(control.options)
          .map((option) => option.label || option.text)
          .join("\n");
      return Array.from(control.selectedOptions)
        .map((option) => option.label || option.text)
        .join(" ");
    }
    return control.value || control.placeholder;
  };
  const formTextContext = sampleContext;
  type FormValueFragment = {
    element: FormTextControl | HTMLOptionElement;
    rect: RectLike;
    text: string;
  };
  type FormValueGeometry = {
    fragments: FormValueFragment[];
    unsupportedReason: string | null;
  };
  const resolvedTextAlign = (style: CSSStyleDeclaration) => {
    if (style.textAlign === "start")
      return style.direction === "rtl" ? "right" : "left";
    if (style.textAlign === "end")
      return style.direction === "rtl" ? "left" : "right";
    return style.textAlign === "right" || style.textAlign === "center"
      ? style.textAlign
      : "left";
  };
  const formValueGlyphRects = (
    control: FormTextControl,
    rawText: string,
  ): FormValueGeometry => {
    if (!formTextContext)
      return {
        fragments: [],
        unsupportedReason: "2D text metrics are unavailable",
      };
    const controlRect = control.getBoundingClientRect();
    const style = getComputedStyle(control);
    const number = (value: string) => Number.parseFloat(value) || 0;
    const scaleX = control.offsetWidth > 0
      ? controlRect.width / control.offsetWidth
      : 1;
    const scaleY = control.offsetHeight > 0
      ? controlRect.height / control.offsetHeight
      : 1;
    const contentLeft =
      controlRect.left +
      (number(style.borderLeftWidth) + number(style.paddingLeft)) * scaleX;
    const contentRight =
      controlRect.right -
      (number(style.borderRightWidth) + number(style.paddingRight)) * scaleX;
    const contentTop =
      controlRect.top +
      (number(style.borderTopWidth) + number(style.paddingTop)) * scaleY;
    const contentBottom =
      controlRect.bottom -
      (number(style.borderBottomWidth) + number(style.paddingBottom)) * scaleY;
    const contentWidth = Math.max(0, contentRight - contentLeft);
    const contentHeight = Math.max(0, contentBottom - contentTop);
    if (contentWidth <= 1 || contentHeight <= 1)
      return {
        fragments: [],
        unsupportedReason: "form control has no measurable content box",
      };
    const fontSize = Math.max(1, number(style.fontSize) * scaleY);
    const rawLineHeight = number(style.lineHeight);
    const lineHeight = Math.max(
      fontSize,
      (rawLineHeight > 0 ? rawLineHeight : number(style.fontSize) * 1.2) *
        scaleY,
    );
    const horizontalScroll = control.scrollLeft * scaleX;
    const verticalScroll = control instanceof HTMLTextAreaElement
      ? control.scrollTop * scaleY
      : 0;
    const fragments: FormValueFragment[] = [];
    const measureLine = (
      line: string,
      textStyle: CSSStyleDeclaration,
    ) => {
      formTextContext.font =
        textStyle.font ||
        `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
      const metrics = formTextContext.measureText(line);
      const letterSpacing = number(textStyle.letterSpacing);
      const wordSpacing = number(textStyle.wordSpacing);
      const codePointGaps = Math.max(0, Array.from(line).length - 1);
      const wordGaps = (line.match(/\s+/gu) ?? []).length;
      const measuredLineWidth = Math.max(
        0,
        (metrics.width +
          codePointGaps * letterSpacing +
          wordGaps * wordSpacing) *
          scaleX,
      );
      const measuredHeight =
        (metrics.actualBoundingBoxAscent +
          metrics.actualBoundingBoxDescent) *
        scaleY;
      return {
        height: Math.max(1, measuredHeight || fontSize),
        width: measuredLineWidth,
      };
    };
    const appendClippedFragment = (
      element: FormTextControl | HTMLOptionElement,
      line: string,
      rawLeft: number,
      rawTop: number,
      glyphWidth: number,
      glyphHeight: number,
      clip: RectLike,
    ) => {
      if (!line || glyphWidth <= 0 || glyphHeight <= 0) return;
      const rawRight = rawLeft + glyphWidth;
      const rawBottom = rawTop + glyphHeight;
      const left = Math.max(clip.left, rawLeft);
      const right = Math.min(clip.right, rawRight);
      const top = Math.max(clip.top, rawTop);
      const bottom = Math.min(clip.bottom, rawBottom);
      if (right - left <= 1 || bottom - top <= 1) return;
      fragments.push({
        element,
        rect: {
          bottom,
          height: bottom - top,
          left,
          right,
          top,
          width: right - left,
        },
        text: line,
      });
    };

    if (
      control instanceof HTMLSelectElement &&
      (control.multiple || control.size > 1)
    ) {
      let eligibleOptionCount = 0;
      let measurableOptionCount = 0;
      for (const option of Array.from(control.options)) {
        const optionStyle = getComputedStyle(option);
        if (
          option.hidden ||
          optionStyle.display === "none" ||
          optionStyle.visibility === "hidden" ||
          optionStyle.visibility === "collapse"
        )
          continue;
        eligibleOptionCount += 1;
        const optionRect = option.getBoundingClientRect();
        if (optionRect.width <= 1 || optionRect.height <= 1) continue;
        const clip = {
          bottom: Math.min(contentBottom, optionRect.bottom),
          height:
            Math.min(contentBottom, optionRect.bottom) -
            Math.max(contentTop, optionRect.top),
          left: Math.max(contentLeft, optionRect.left),
          right: Math.min(contentRight, optionRect.right),
          top: Math.max(contentTop, optionRect.top),
          width:
            Math.min(contentRight, optionRect.right) -
            Math.max(contentLeft, optionRect.left),
        };
        if (clip.width <= 1 || clip.height <= 1) continue;
        measurableOptionCount += 1;
        const line = option.label || option.text;
        const measured = measureLine(line, optionStyle);
        const optionContentLeft =
          optionRect.left + number(optionStyle.paddingLeft) * scaleX;
        const optionContentRight =
          optionRect.right - number(optionStyle.paddingRight) * scaleX;
        const optionContentWidth = Math.max(
          0,
          optionContentRight - optionContentLeft,
        );
        const align = resolvedTextAlign(optionStyle);
        const alignedLeft = align === "right"
          ? optionContentRight - measured.width
          : align === "center"
            ? optionContentLeft + (optionContentWidth - measured.width) / 2
            : optionContentLeft;
        const rawTop =
          optionRect.top + (optionRect.height - measured.height) / 2;
        appendClippedFragment(
          option,
          line,
          alignedLeft,
          rawTop,
          measured.width,
          measured.height,
          clip,
        );
      }
      if (
        !multiSelectCompleteness(
          eligibleOptionCount,
          measurableOptionCount
        )
      )
        return {
          fragments: [],
          unsupportedReason: "multi-row select option geometry is unavailable",
        };
      return { fragments, unsupportedReason: null };
    }

    const hardLines = rawText.split(/\r\n?|\n/u);
    const measuredLines = hardLines.map((line) => ({
      line,
      measured: measureLine(line, style),
    }));
    const softWrapUnsupportedReason = softWrapDecision({
      contentWidth,
      isTextarea: control instanceof HTMLTextAreaElement,
      lineWidths: measuredLines.map(({ measured }) => measured.width),
      wrap: control instanceof HTMLTextAreaElement ? control.wrap : "off",
    });
    if (softWrapUnsupportedReason)
      return {
        fragments: [],
        unsupportedReason: softWrapUnsupportedReason,
      };
    for (const [lineIndex, { line, measured }] of measuredLines.entries()) {
      if (!line) continue;
      const align = resolvedTextAlign(style);
      const alignedLeft = align === "right"
        ? contentRight - measured.width
        : align === "center"
          ? contentLeft + (contentWidth - measured.width) / 2
          : contentLeft;
      const rawLeft = alignedLeft - horizontalScroll;
      const lineBoxTop = control instanceof HTMLTextAreaElement
        ? contentTop + lineIndex * lineHeight - verticalScroll
        : contentTop;
      const rawTop = control instanceof HTMLTextAreaElement
        ? lineBoxTop + Math.max(0, (lineHeight - measured.height) / 2)
        : contentTop + (contentHeight - measured.height) / 2;
      appendClippedFragment(
        control,
        line,
        rawLeft,
        rawTop,
        measured.width,
        measured.height,
        {
          bottom: contentBottom,
          height: contentHeight,
          left: contentLeft,
          right: contentRight,
          top: contentTop,
          width: contentWidth,
        },
      );
    }
    return { fragments, unsupportedReason: null };
  };

  const candidates: Candidate[] = [];
  const seenTextNodes = new Set<Text>();
  for (const textScope of composedScopes) {
    const walker = document.createTreeWalker(
      textScope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          if (
            !parent ||
            !text ||
            composedClosest(parent, "script,style") ||
            composedClosest(parent, "input,select,textarea,option") ||
            (composedClosest(parent, "svg") &&
              !composedClosest(parent, "foreignObject")) ||
            !isVisiblePaint(parent)
          )
            return NodeFilter.FILTER_REJECT;
          const range = document.createRange();
          range.selectNodeContents(node);
          return Array.from(range.getClientRects()).some(
            (rect) => rect.width > 1 && rect.height > 1,
          )
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (seenTextNodes.has(node)) continue;
      seenTextNodes.add(node);
      const parent = node.parentElement;
      if (!parent) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      candidates.push({
        element: parent,
        rects: Array.from(range.getClientRects()).filter(
          (rect) => rect.width > 1 && rect.height > 1,
        ),
        svg: false,
        text: node.textContent ?? "",
      });
    }

    const svgTextWalker = document.createTreeWalker(
      textScope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          if (
            !parent ||
            !text ||
            !composedClosest(parent, "svg") ||
            composedClosest(parent, "foreignObject") ||
            !composedClosest(parent, "text,tspan,textPath") ||
            !isVisiblePaint(parent)
          )
            return NodeFilter.FILTER_REJECT;
          const range = document.createRange();
          range.selectNodeContents(node);
          return Array.from(range.getClientRects()).some(
            (rect) => rect.width > 1 && rect.height > 1,
          )
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );
    while (svgTextWalker.nextNode()) {
      const node = svgTextWalker.currentNode as Text;
      if (seenTextNodes.has(node)) continue;
      seenTextNodes.add(node);
      const parent = node.parentElement;
      if (!(parent instanceof SVGElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 1 && rect.height > 1,
      );
      if (rects.length > 0)
        candidates.push({
          element: parent,
          rects,
          svg: true,
          text: node.textContent ?? "",
        });
    }
  }

  for (const control of queryAllComposed("input,select,textarea")) {
    if (
      !(
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) ||
      !isVisiblePaint(control)
    )
      continue;
    if (
      control instanceof HTMLInputElement &&
      [
        "button",
        "checkbox",
        "color",
        "file",
        "hidden",
        "image",
        "password",
        "radio",
        "range",
        "reset",
        "submit",
      ].includes(control.type.toLowerCase())
    )
      continue;
    const rawText = displayedFormValue(control);
    const geometry = formValueGlyphRects(control, rawText);
    if (geometry.unsupportedReason) {
      addIssue(
        "unsupported-form-value-geometry",
        describe(control, rawText),
        geometry.unsupportedReason,
      );
      continue;
    }
    for (const fragment of geometry.fragments)
      candidates.push({
        element: fragment.element,
        rects: [fragment.rect],
        svg: false,
        text: fragment.text,
      });
  }
  for (const use of queryAllComposed("svg use")) {
    if (!(use instanceof SVGUseElement)) continue;
    if (!isVisiblePaint(use)) continue;
    const href = use.getAttribute("href") ?? use.getAttribute("xlink:href") ?? "";
    if (!href.startsWith("#")) continue;
    const referenceRoot = use.getRootNode();
    const referenced =
      referenceRoot instanceof Document || referenceRoot instanceof ShadowRoot
        ? referenceRoot.getElementById(href.slice(1))
        : null;
    const referencedText = referenced?.matches("text,tspan,textPath")
      ? referenced
      : referenced?.querySelector("text,tspan,textPath");
    const text = referencedText?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!text) continue;
    addIssue(
      "unsupported-svg-use-text",
      describe(use, text),
      "SVG <use> paints cloned text through the instance tree, outside the DOM text-node scanner."
    );
  }

  for (const candidate of candidates) {
    const target = describe(candidate.element, candidate.text);
    const style = getComputedStyle(candidate.element);
    compositingAmbiguities(candidate.element, target, candidate.rects);
    if (style.textShadow !== "none") {
      addIssue("unsupported-text-shadow", target, `text-shadow ${JSON.stringify(style.textShadow)} changes glyph contrast.`);
    }
    const webkitTextFill = style.getPropertyValue("-webkit-text-fill-color").trim();
    const paint = candidate.svg
      ? style.fill
      : (webkitTextFill && webkitTextFill !== "currentcolor" ? webkitTextFill : style.color);
    if (/url\s*\(/i.test(paint)) {
      addIssue("unsupported-svg-paint-server", target, "text itself uses an SVG paint server.");
      continue;
    }
    const rawForeground = parseColor(paint);
    if (!rawForeground) {
      addIssue("unsupported-color", target, `computed text paint ${JSON.stringify(paint)} is not a solid CSS color.`);
      continue;
    }
    const fillOpacity = candidate.svg ? parseOpacity(style.fillOpacity) : 1;
    const foregroundAlpha = rawForeground.a * fillOpacity;
    const backgrounds: Rgba[] = [];
    const ratios: Array<{ background: Rgba; foreground: Rgba; ratio: number }> = [];
    const htmlBase = htmlBackground(
      candidate.svg
        ? composedParent(
            (candidate.element as SVGElement).ownerSVGElement ??
              candidate.element,
          ) ?? candidate.element
        : candidate.element,
      target
    );
    if (candidate.svg) {
      svgPainterPreflight(candidate.element as SVGElement, candidate.rects, target);
    }
    for (const rect of candidate.rects) {
      if (!candidate.svg) positionedOverlap(candidate.element, rect, target);
      for (const point of pointsForRect(rect)) {
        const background = candidate.svg
          ? svgBackgroundAt(candidate.element as SVGElement, point, htmlBase, target)
          : htmlBase;
        const foreground = blend({ ...rawForeground, a: foregroundAlpha }, background);
        backgrounds.push(background);
        ratios.push({ background, foreground, ratio: contrast(foreground, background) });
      }
    }
    if (ratios.length === 0) continue;
    const channelSpread = (channel: "r" | "g" | "b") => (
      Math.max(...backgrounds.map((color) => color[channel]))
      - Math.min(...backgrounds.map((color) => color[channel]))
    );
    if (Math.max(channelSpread("r"), channelSpread("g"), channelSpread("b")) > 4) {
      addIssue(
        candidate.svg ? "ambiguous-mixed-svg-background" : "ambiguous-mixed-background",
        target,
        "sampled glyph regions cross materially different painted backgrounds."
      );
    }
    const worstSample = [...ratios].sort((left, right) => left.ratio - right.ratio)[0];
    const fontSize = Number.parseFloat(style.fontSize) || 0;
    let effectiveFontSize = fontSize;
    if (candidate.svg) {
      const graphics = (
        composedClosest(candidate.element, "text") ?? candidate.element
      ) as SVGGraphicsElement;
      const matrix = graphics.getScreenCTM?.();
      if (matrix) {
        const scaleX = Math.hypot(matrix.a, matrix.b);
        const scaleY = Math.hypot(matrix.c, matrix.d);
        const screenScale = Math.min(scaleX, scaleY);
        if (Number.isFinite(screenScale) && screenScale > 0) effectiveFontSize *= screenScale;
      }
    }
    const fontWeight = style.fontWeight === "bold" ? 700 : Number.parseInt(style.fontWeight, 10) || 400;
    let transformed = false;
    let transformOwner: Element | null = candidate.element;
    while (transformOwner) {
      const transformStyle = getComputedStyle(transformOwner);
      const zoom = Number.parseFloat(transformStyle.getPropertyValue("zoom"));
      transformed ||= transformStyle.transform !== "none"
        || !["", "none"].includes(transformStyle.getPropertyValue("translate").trim())
        || !["", "none"].includes(transformStyle.getPropertyValue("rotate").trim())
        || !["", "none"].includes(transformStyle.getPropertyValue("scale").trim())
        || (Number.isFinite(zoom) && Math.abs(zoom - 1) > 0.000001)
        || (transformOwner instanceof SVGElement && transformOwner.hasAttribute("transform"));
      if (transformOwner === root) break;
      transformOwner = composedParent(transformOwner);
    }
    const requiredRatio = transformed
      ? 4.5
      : (effectiveFontSize >= 24 || (effectiveFontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5);
    const item: HkVisualizationContrastEvidence = {
      background: colorLabel(worstSample.background),
      backgroundLuminance: Math.round(luminance(worstSample.background) * 1000) / 1000,
      contrastRatio: Math.round(worstSample.ratio * 100) / 100,
      effectiveOpacity: Math.round(foregroundAlpha * 1000) / 1000,
      foreground: colorLabel(worstSample.foreground),
      requiredRatio,
      target
    };
    evidence.push(item);
    if (worstSample.ratio + 0.001 < requiredRatio) {
      addIssue(
        "insufficient-contrast",
        target,
        `contrast ${item.contrastRatio}:1 is below ${requiredRatio}:1.`
      );
    }
  }

  const worst = [...evidence].sort(
    (left, right) => left.contrastRatio / left.requiredRatio - right.contrastRatio / right.requiredRatio
  )[0] ?? null;
  return { checkedTextCount: evidence.length, evidence, issues, worst };
}

type HkVisualizationTextContrastEvaluator = (
  root: Element,
  scanOptions: { authoringSelector: string },
) => HkVisualizationContrastScanResult;

type HkVisualizationFunctionConstructor = (
  ...parameters: string[]
) => Function;

/**
 * Produces a closure-free evaluator whose serialized browser body contains the
 * exact statically pinned decision source. Only the module-owned runtime source
 * is embedded; scan options and learner/page data are never interpolated.
 */
export function compileHkVisualizationTextContrastScanner(
  functionConstructor: HkVisualizationFunctionConstructor = Function,
): HkVisualizationTextContrastEvaluator {
  compileHkVisualizationDecisionContract();
  if (
    scanHkVisualizationTextContrastRuntime.name !==
    "scanHkVisualizationTextContrastRuntime"
  )
    throw new Error("HK contrast scanner runtime import contract mismatch.");
  const runtimeSource = scanHkVisualizationTextContrastRuntime.toString();
  let candidate: unknown;
  try {
    candidate = functionConstructor(
      `"use strict"; return function scanHkVisualizationTextContrast(root, scanOptions) {
        const decisionContract = (${hkVisualizationDecisionContractSource});
        const runtime = (${runtimeSource});
        return runtime(root, scanOptions, decisionContract);
      };`,
    )();
  } catch (cause) {
    throw new Error(
      "HK contrast scanner serialization failed closed.",
      { cause },
    );
  }
  if (
    typeof candidate !== "function" ||
    candidate.name !== "scanHkVisualizationTextContrast"
  )
    throw new Error("HK contrast scanner serialization has an invalid shape.");
  return candidate as HkVisualizationTextContrastEvaluator;
}

export const scanHkVisualizationTextContrast =
  compileHkVisualizationTextContrastScanner();
