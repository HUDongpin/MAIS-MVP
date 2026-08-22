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
  | "unsupported-text-shadow"
  | "unsupported-transform-background";

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
export function scanHkVisualizationTextContrast(
  root: Element,
  scanOptions: { authoringSelector: string }
): HkVisualizationContrastScanResult {
  type Rgba = { a: number; b: number; g: number; r: number };
  type Point = { x: number; y: number };
  type Candidate = { element: Element; rects: DOMRect[]; svg: boolean; text: string };

  const evidence: HkVisualizationContrastEvidence[] = [];
  const issues: HkVisualizationContrastIssue[] = [];
  const issueKeys = new Set<string>();
  const colorCache = new Map<string, Rgba | null>();
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 1;
  sampleCanvas.height = 1;
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });

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
  const isVisiblePaint = (element: Element) => {
    if (!element.isConnected || element.closest(scanOptions.authoringSelector)) return false;
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
      current = current.parentElement;
    }
    return opacity > 0;
  };
  const pseudoElementAmbiguities = (element: Element, target: string) => {
    if (!(element instanceof HTMLElement)) return;
    for (const pseudo of ["::before", "::after"] as const) {
      const style = getComputedStyle(element, pseudo);
      const content = style.content.trim();
      const generated = content !== "none" && content !== "normal";
      if (!generated || style.display === "none" || style.visibility === "hidden") continue;
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
  const compositingAmbiguities = (element: Element, target: string) => {
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
      backdropOwner = backdropOwner.parentElement;
    }
    const movementBackdropIsSelfContained = Boolean(
      nearestPaintedBackdrop?.fullyOpaque && nearestPaintedBackdrop.covers
    );
    let current: Element | null = element;
    while (current) {
      const style = getComputedStyle(current);
      pseudoElementAmbiguities(current, target);
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
      current = current.parentElement;
    }
  };
  const htmlBackground = (element: Element, target: string) => {
    const layers: Rgba[] = [];
    let current: Element | null = element;
    while (current) {
      const style = getComputedStyle(current);
      const color = parseColor(style.backgroundColor);
      if (color) layers.push(color);
      current = current.parentElement;
    }
    let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) background = blend(layer, background);
    if (background.a < 0.999) {
      addIssue("unsupported-color", target, "the page backdrop remains translucent after ancestor compositing.");
    }
    return background;
  };
  const pointsForRect = (rect: DOMRect): Point[] => {
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
  const positionedPaintLayers = Array.from(root.querySelectorAll("*"));
  const positionedOverlap = (candidate: Element, candidateRect: DOMRect, target: string) => {
    const overlapping = positionedPaintLayers.find((layer) => {
      if (layer === candidate || layer.contains(candidate) || candidate.contains(layer)) return false;
      if (!(layer instanceof HTMLElement)) return false;
      const style = getComputedStyle(layer);
      const color = parseColor(style.backgroundColor);
      if ((color?.a ?? 0) <= 0.001 && style.backgroundImage === "none") return false;
      const layerRect = layer.getBoundingClientRect();
      return Math.min(candidateRect.right, layerRect.right) - Math.max(candidateRect.left, layerRect.left) > 0.5
        && Math.min(candidateRect.bottom, layerRect.bottom) - Math.max(candidateRect.top, layerRect.top) > 0.5;
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
    const paintRoot = element.closest("text") ?? element;
    const shapes = document.elementsFromPoint(point.x, point.y)
      .filter((shape): shape is SVGElement => (
        shape instanceof SVGElement
        && shape.ownerSVGElement === svg
        && shape !== element
        && !paintRoot.contains(shape)
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
    textRects: readonly DOMRect[],
    target: string
  ) => {
    const svg = element.ownerSVGElement;
    if (!svg) return;
    const paintRoot = element.closest("text") ?? element;
    const sampledPaint = new Set<Element>();
    for (const rect of textRects) {
      for (const point of pointsForRect(rect)) {
        for (const layer of document.elementsFromPoint(point.x, point.y)) sampledPaint.add(layer);
      }
    }
    for (const shape of Array.from(svg.querySelectorAll<SVGElement>(
      "rect,circle,ellipse,polygon,polyline,line,path,use,image,foreignObject"
    ))) {
      if (shape === element || paintRoot.contains(shape)) continue;
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

  const candidates: Candidate[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (
        !parent
        || !text
        || parent.closest("script,style")
        || (parent.closest("svg") && !parent.closest("foreignObject"))
        || !isVisiblePaint(parent)
      ) return NodeFilter.FILTER_REJECT;
      const range = document.createRange();
      range.selectNodeContents(node);
      return Array.from(range.getClientRects()).some((rect) => rect.width > 1 && rect.height > 1)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    candidates.push({
      element: parent,
      rects: Array.from(range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1),
      svg: false,
      text: node.textContent ?? ""
    });
  }
  const svgTextWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (
        !parent
        || !text
        || !parent.closest("svg")
        || parent.closest("foreignObject")
        || !parent.closest("text,tspan,textPath")
        || !isVisiblePaint(parent)
      ) return NodeFilter.FILTER_REJECT;
      const range = document.createRange();
      range.selectNodeContents(node);
      return Array.from(range.getClientRects()).some((rect) => rect.width > 1 && rect.height > 1)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  while (svgTextWalker.nextNode()) {
    const node = svgTextWalker.currentNode as Text;
    const parent = node.parentElement;
    if (!(parent instanceof SVGElement)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1);
    if (rects.length > 0) candidates.push({ element: parent, rects, svg: true, text: node.textContent ?? "" });
  }

  for (const use of Array.from(root.querySelectorAll<SVGUseElement>("svg use"))) {
    if (!isVisiblePaint(use)) continue;
    const href = use.getAttribute("href") ?? use.getAttribute("xlink:href") ?? "";
    if (!href.startsWith("#")) continue;
    const referenced = document.getElementById(href.slice(1));
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
    compositingAmbiguities(candidate.element, target);
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
        ? (candidate.element as SVGElement).ownerSVGElement?.parentElement ?? candidate.element
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
      const graphics = (candidate.element.closest("text") ?? candidate.element) as SVGGraphicsElement;
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
      transformOwner = transformOwner.parentElement;
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
