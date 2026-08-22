import { createHash } from "node:crypto";
import type { Locator } from "@playwright/test";
import {
  waitForCaliforniaCanvasStable,
  type CaliforniaCanvasTextAuditOptions,
  type CaliforniaCanvasTextAuditPageApi,
  type CaliforniaCanvasTextContrastInput
} from "./california-canvas-text-audit";
import {
  scanHkVisualizationTextContrast,
  type HkVisualizationContrastEvidence,
  type HkVisualizationContrastScanResult
} from "./hk-visualization-text-contrast-scanner";

export const CALIFORNIA_NORMAL_TEXT_CONTRAST = 4.5;
export const CALIFORNIA_LARGE_TEXT_CONTRAST = 3;
export const CALIFORNIA_NON_TEXT_CONTRAST = 3;
export const CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256 =
  "5f3c17053c2a674424384b2a5c15e4669ab31324ecd6ffd4f4a337fb8ea80056";

export const CALIFORNIA_LEARNER_CONTRAST_AUTHORING_SELECTOR = [
  "[data-viz-manim-authoring-dock]",
  "[data-viz-manim-authoring-selector]",
  "[data-viz-manim-camera-mode-control]",
  "[data-viz-manim-capture-control]",
  "[data-viz-manim-parameter-panel-control]",
  "[data-viz-manim-checkpoint-control]",
  "[data-viz-manim-history-control]",
  "[data-viz-manim-authoring-control]",
  "[data-viz-manim-scene-selector-control]",
  "[data-viz-manim-render-quality-control]",
  "[data-viz-manim-render-quality-transparent-control]",
  "[data-viz-manim-capture-screenshot]",
  "[data-viz-manim-capture-video-plan]",
  "[data-viz-manim-run-from-beat]"
].join(",");

export type CaliforniaRgba = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

export type CaliforniaContrastAuditContext = {
  benchId: string;
  state: string;
  viewport: "desktop" | "mobile";
};

export type CaliforniaContrastEvidenceKind =
  | "canvas-surface"
  | "canvas-text-fill"
  | "canvas-text-stroke"
  | "html-essential-fill"
  | "html-text"
  | "svg-essential-fill"
  | "svg-essential-stroke"
  | "svg-text-fill"
  | "svg-text-stroke";

export type CaliforniaContrastFindingKind =
  | "contrast-audit-no-labels"
  | "contrast-below-threshold"
  | "contrast-unsupported";

export type CaliforniaContrastFinding = CaliforniaContrastAuditContext & {
  detail: string;
  evidenceKind: CaliforniaContrastEvidenceKind | "audit";
  kind: CaliforniaContrastFindingKind;
  label: string;
  ratio: number | null;
  severity: "hard";
  threshold: number | null;
};

export type CaliforniaContrastEvidence = {
  background: CaliforniaRgba | null;
  backgroundSampleCount: number;
  contextKind: "canvas-2d" | "canvas-bitmaprenderer" | "canvas-unknown" | "canvas-webgl" | "canvas-webgl2" | "html" | "svg";
  effectiveFontSizePx: number | null;
  essential: boolean | null;
  foreground: CaliforniaRgba | null;
  groupId: string;
  hasExecutableContrastProvider: boolean | null;
  hasExecutableNonTextEvidence: boolean | null;
  kind: CaliforniaContrastEvidenceKind;
  label: string;
  ratio: number | null;
  ratios: readonly number[];
  reasons: readonly string[];
  sampleCount: number;
  sampleX: number | null;
  sampleY: number | null;
  threshold: number;
};

export type CaliforniaHardenedTextContrastEvidence = {
  algorithmSha256: string;
  auditedTextCount: number;
  candidateTextCount: number;
  completed: boolean;
  evidenceSha256: string;
  findingCount: number;
  minRatio: number | null;
  rawScan: HkVisualizationContrastScanResult;
  worstLabel: string | null;
  worstRequiredRatio: number | null;
};

export type CaliforniaContrastAuditResult = {
  auditedLabelCount: number;
  candidateLabelCount: number;
  evidence: CaliforniaContrastEvidence[];
  findings: CaliforniaContrastFinding[];
  hardenedText: CaliforniaHardenedTextContrastEvidence;
  minRatio: number | null;
  worstKind: CaliforniaContrastEvidenceKind | null;
  worstLabel: string | null;
};

export type CaliforniaContrastAuditOptions = Pick<
  CaliforniaCanvasTextAuditOptions,
  "pollMs" | "quietMs" | "timeoutMs"
> & {
  /** Audit Canvas stability and consume Canvas contrast providers. Defaults to true. */
  auditCanvases?: boolean;
  authoringSelector?: string;
  essentialMarkSelector?: string;
  /** Caller-owned proof that DOM/SVG layout, fonts, and animation state are settled. */
  settledProof?: {
    domSvg: "settled";
    evidence: string;
  };
};

const DEFAULT_ESSENTIAL_MARK_SELECTOR =
  "svg [data-viz-mark]:not(text):not(tspan), [data-viz-essential], [data-viz-axis]";

function incompleteHardenedTextEvidence(): CaliforniaHardenedTextContrastEvidence {
  return {
    algorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
    auditedTextCount: 0,
    candidateTextCount: 0,
    completed: false,
    evidenceSha256: "",
    findingCount: 1,
    minRatio: null,
    rawScan: { checkedTextCount: 0, evidence: [], issues: [], worst: null },
    worstLabel: null,
    worstRequiredRatio: null
  };
}

function evidenceKindForHardenedText(
  evidence: HkVisualizationContrastEvidence | undefined,
  target: string
): CaliforniaContrastEvidenceKind {
  if (/^(?:text|tspan|textpath|use)(?:#|\s|\")/i.test(target)) return "svg-text-fill";
  if (evidence?.target && /^(?:text|tspan|textpath|use)(?:#|\s|\")/i.test(evidence.target)) {
    return "svg-text-fill";
  }
  return "html-text";
}

export function summarizeCaliforniaHardenedTextContrastScan(
  scan: HkVisualizationContrastScanResult,
  context: CaliforniaContrastAuditContext
) {
  const candidateTargets = new Set([
    ...scan.evidence.map((item) => item.target),
    ...scan.issues.map((item) => item.target)
  ]);
  const evidenceByTarget = new Map<string, HkVisualizationContrastEvidence[]>();
  for (const item of scan.evidence) {
    const targetEvidence = evidenceByTarget.get(item.target) ?? [];
    targetEvidence.push(item);
    evidenceByTarget.set(item.target, targetEvidence);
  }
  const hardenedFindings: CaliforniaContrastFinding[] = scan.issues.map((issue) => {
    const targetEvidence = evidenceByTarget.get(issue.target) ?? [];
    const evidence = issue.code === "insufficient-contrast"
      ? targetEvidence.reduce<HkVisualizationContrastEvidence | undefined>((worst, item) => (
          !worst || item.contrastRatio / item.requiredRatio < worst.contrastRatio / worst.requiredRatio
            ? item
            : worst
        ), undefined)
      : targetEvidence.at(-1);
    return {
      ...context,
      detail: `hardened-text/${issue.code}: ${issue.message}`,
      evidenceKind: evidenceKindForHardenedText(evidence, issue.target),
      kind: issue.code === "insufficient-contrast" ? "contrast-below-threshold" : "contrast-unsupported",
      label: issue.target,
      ratio: evidence?.contrastRatio ?? null,
      severity: "hard",
      threshold: evidence?.requiredRatio ?? null
    };
  });
  if (candidateTargets.size === 0 || scan.checkedTextCount === 0) {
    hardenedFindings.push({
      ...context,
      detail: candidateTargets.size === 0
        ? "Hardened text scanner found no visible learner HTML/SVG text candidate."
        : "Hardened text scanner discovered candidates but produced no executable numeric evidence.",
      evidenceKind: "audit",
      kind: "contrast-audit-no-labels",
      label: "hardened HTML/SVG text contrast audit",
      ratio: null,
      severity: "hard",
      threshold: null
    });
  }
  const minEvidence = scan.worst ??
    [...scan.evidence].sort((left, right) => left.contrastRatio - right.contrastRatio)[0] ?? null;
  const hardenedText: CaliforniaHardenedTextContrastEvidence = {
    algorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
    auditedTextCount: scan.checkedTextCount,
    candidateTextCount: candidateTargets.size,
    completed: true,
    evidenceSha256: createHash("sha256").update(JSON.stringify({
      algorithmSha256: CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
      evidence: scan.evidence,
      issues: scan.issues,
      worst: scan.worst
    })).digest("hex"),
    findingCount: hardenedFindings.length,
    minRatio: minEvidence?.contrastRatio ?? null,
    rawScan: scan,
    worstLabel: minEvidence?.target ?? null,
    worstRequiredRatio: minEvidence?.requiredRatio ?? null
  };
  return { findings: hardenedFindings, hardenedText };
}

function mergeHardenedTextContrast(
  base: CaliforniaContrastAuditResult,
  context: CaliforniaContrastAuditContext,
  scan: HkVisualizationContrastScanResult
): CaliforniaContrastAuditResult {
  const { findings: hardenedFindings, hardenedText } =
    summarizeCaliforniaHardenedTextContrastScan(scan, context);
  const minEvidence = [...scan.evidence].sort((left, right) => left.contrastRatio - right.contrastRatio)[0] ?? null;
  const hardenedIsLower = hardenedText.minRatio !== null && (
    base.minRatio === null || hardenedText.minRatio < base.minRatio
  );
  return {
    ...base,
    findings: [...base.findings, ...hardenedFindings],
    hardenedText,
    minRatio: hardenedIsLower ? hardenedText.minRatio : base.minRatio,
    worstKind: hardenedIsLower
      ? evidenceKindForHardenedText(scan.worst ?? minEvidence ?? undefined, hardenedText.worstLabel ?? "")
      : base.worstKind,
    worstLabel: hardenedIsLower ? hardenedText.worstLabel : base.worstLabel
  };
}

export function summarizeCaliforniaBaseContrastEvidence(
  evidence: readonly CaliforniaContrastEvidence[],
  context: CaliforniaContrastAuditContext
) {
  const groups = new Map<string, CaliforniaContrastEvidence[]>();
  for (const item of evidence) {
    const group = groups.get(item.groupId) ?? [];
    group.push(item);
    groups.set(item.groupId, group);
  }
  const findings: CaliforniaContrastFinding[] = [];
  let auditedLabelCount = 0;
  let minRatio: number | null = null;
  let worstKind: CaliforniaContrastEvidenceKind | null = null;
  let worstLabel: string | null = null;
  let worstRequiredRatio: number | null = null;
  for (const group of groups.values()) {
    const groupReasons = Array.from(new Set(group.flatMap((item) => item.reasons)));
    if (groupReasons.length > 0) {
      const representative = group[0]!;
      findings.push({
        ...context,
        detail: groupReasons.join("; "),
        evidenceKind: representative.kind,
        kind: "contrast-unsupported",
        label: representative.label,
        ratio: null,
        severity: "hard",
        threshold: representative.threshold
      });
      continue;
    }
    const numeric = group.filter((item) => item.ratios.length > 0);
    if (numeric.length === 0) continue;
    auditedLabelCount += 1;
    for (const item of numeric) {
      const ratio = Math.min(...item.ratios);
      if (minRatio === null || ratio < minRatio) {
        minRatio = ratio;
        worstKind = item.kind;
        worstLabel = item.label;
        worstRequiredRatio = item.threshold;
      }
      if (ratio < item.threshold) {
        findings.push({
          ...context,
          detail: `${item.kind} contrast ${ratio.toFixed(4)} is below ${item.threshold.toFixed(2)}:1`,
          evidenceKind: item.kind,
          kind: "contrast-below-threshold",
          label: item.label,
          ratio,
          severity: "hard",
          threshold: item.threshold
        });
      }
    }
  }
  if (groups.size === 0) {
    findings.push({
      ...context,
      detail: "No visible HTML/SVG/recorded-Canvas learner label or explicit essential mark was available for contrast audit.",
      evidenceKind: "audit",
      kind: "contrast-audit-no-labels",
      label: "contrast audit",
      ratio: null,
      severity: "hard",
      threshold: null
    });
  }
  return {
    auditedLabelCount,
    candidateLabelCount: groups.size,
    findings,
    minRatio,
    worstKind,
    worstLabel,
    worstRequiredRatio
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function compositeCaliforniaRgba(
  foreground: CaliforniaRgba,
  background: CaliforniaRgba
): CaliforniaRgba {
  const foregroundAlpha = clamp(foreground.alpha, 0, 1);
  const backgroundAlpha = clamp(background.alpha, 0, 1);
  const alpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
  if (alpha <= 0) return { alpha: 0, blue: 0, green: 0, red: 0 };
  const channel = (foregroundChannel: number, backgroundChannel: number) => (
    foregroundChannel * foregroundAlpha +
    backgroundChannel * backgroundAlpha * (1 - foregroundAlpha)
  ) / alpha;
  return {
    alpha,
    blue: channel(foreground.blue, background.blue),
    green: channel(foreground.green, background.green),
    red: channel(foreground.red, background.red)
  };
}

export function californiaRelativeLuminance(color: Pick<CaliforniaRgba, "blue" | "green" | "red">) {
  const linear = (channel: number) => {
    const value = clamp(channel, 0, 255) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue);
}

export function californiaContrastRatio(
  foreground: Pick<CaliforniaRgba, "blue" | "green" | "red">,
  background: Pick<CaliforniaRgba, "blue" | "green" | "red">
) {
  const foregroundLuminance = californiaRelativeLuminance(foreground);
  const backgroundLuminance = californiaRelativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

export function californiaContrastPasses(ratio: number, threshold: number) {
  return Number.isFinite(ratio) && ratio >= threshold;
}

export function californiaTextContrastThreshold(fontSizePx: number, fontWeight: number) {
  const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  return isLarge ? CALIFORNIA_LARGE_TEXT_CONTRAST : CALIFORNIA_NORMAL_TEXT_CONTRAST;
}

/**
 * Audit visible learner text and explicitly marked essential visualization
 * geometry. The Canvas recorder must be installed before navigation so 2D
 * labels can be compared with pixels captured before fillText/strokeText.
 */
export async function collectCaliforniaVisualizationContrastFindings(
  root: Locator,
  context: CaliforniaContrastAuditContext,
  options: CaliforniaContrastAuditOptions = {}
): Promise<CaliforniaContrastAuditResult> {
  // esbuild may leave its helper in Function#toString. Establish the browser
  // serialization precondition here so every caller receives the same helper,
  // including direct node --import tsx contract tests.
  await root.page().evaluate(
    "globalThis.__name = globalThis.__name || function(value) { return value; };"
  );
  if (options.settledProof?.domSvg !== "settled" || !options.settledProof.evidence.trim()) {
    return {
      auditedLabelCount: 0,
      candidateLabelCount: 1,
      evidence: [],
      findings: [{
        ...context,
        detail: "DOM/SVG contrast audit requires an explicit settled proof for layout, fonts, and animation state.",
        evidenceKind: "audit",
        kind: "contrast-unsupported",
        label: "DOM/SVG settled proof",
        ratio: null,
        severity: "hard",
        threshold: null
      }],
      hardenedText: incompleteHardenedTextEvidence(),
      minRatio: null,
      worstKind: null,
      worstLabel: null
    };
  }
  const auditCanvases = options.auditCanvases !== false;
  if (auditCanvases && await root.locator("canvas").count() > 0) {
    const stability = await waitForCaliforniaCanvasStable(root, options);
    if (!stability.stable) {
      return {
        auditedLabelCount: 0,
        candidateLabelCount: 1,
        evidence: [],
        findings: [{
          ...context,
          detail: `Canvas contrast evidence did not settle within ${options.timeoutMs ?? 5_500}ms; last signature=${stability.signature || "empty"}.`,
          evidenceKind: "audit",
          kind: "contrast-unsupported",
          label: "Canvas contrast stability",
          ratio: null,
          severity: "hard",
          threshold: null
        }],
        hardenedText: incompleteHardenedTextEvidence(),
        minRatio: null,
        worstKind: null,
        worstLabel: null
      };
    }
  }
  const hardenedTextScan = await root.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector: options.authoringSelector ?? CALIFORNIA_LEARNER_CONTRAST_AUTHORING_SELECTOR
  });
  const base = await root.evaluate(californiaVisualizationContrastAuditInPage, {
    auditCanvases,
    context,
    essentialMarkSelector: options.essentialMarkSelector ?? DEFAULT_ESSENTIAL_MARK_SELECTOR,
    thresholds: {
      largeText: CALIFORNIA_LARGE_TEXT_CONTRAST,
      nonText: CALIFORNIA_NON_TEXT_CONTRAST,
      normalText: CALIFORNIA_NORMAL_TEXT_CONTRAST
    }
  });
  return mergeHardenedTextContrast(base, context, hardenedTextScan);
}

type BrowserAuditInput = {
  auditCanvases: boolean;
  context: CaliforniaContrastAuditContext;
  essentialMarkSelector: string;
  thresholds: {
    largeText: number;
    nonText: number;
    normalText: number;
  };
};

/** Self-contained browser body serialized by Playwright. */
function californiaVisualizationContrastAuditInPage(
  root: HTMLElement,
  input: BrowserAuditInput
): CaliforniaContrastAuditResult {
  type Rgba = CaliforniaRgba;
  type Outcome = {
    background?: Rgba | null;
    backgroundSampleCount?: number;
    contextKind?: CaliforniaContrastEvidence["contextKind"];
    effectiveFontSizePx?: number | null;
    essential?: boolean | null;
    foreground?: Rgba | null;
    hasExecutableContrastProvider?: boolean | null;
    hasExecutableNonTextEvidence?: boolean | null;
    groupId: string;
    kind: CaliforniaContrastEvidenceKind;
    label: string;
    ratios: number[];
    reasons: string[];
    sampleCount?: number;
    sampleX?: number | null;
    sampleY?: number | null;
    threshold: number;
  };
  type FlatBackground = { color: Rgba; reasons: string[] };
  type SamplePoint = { x: number; y: number };

  const transparent: Rgba = { alpha: 0, blue: 0, green: 0, red: 0 };
  const white: Rgba = { alpha: 1, blue: 255, green: 255, red: 255 };
  const outcomes: Outcome[] = [];

  function clampInPage(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function over(foreground: Rgba, background: Rgba): Rgba {
    const foregroundAlpha = clampInPage(foreground.alpha, 0, 1);
    const backgroundAlpha = clampInPage(background.alpha, 0, 1);
    const alpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
    if (alpha <= 0) return { ...transparent };
    const channel = (foregroundChannel: number, backgroundChannel: number) => (
      foregroundChannel * foregroundAlpha +
      backgroundChannel * backgroundAlpha * (1 - foregroundAlpha)
    ) / alpha;
    return {
      alpha,
      blue: channel(foreground.blue, background.blue),
      green: channel(foreground.green, background.green),
      red: channel(foreground.red, background.red)
    };
  }

  function luminance(color: Rgba) {
    const linear = (channel: number) => {
      const value = clampInPage(channel, 0, 255) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue);
  }

  function contrast(foreground: Rgba, background: Rgba) {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  }

  function parseCssColor(rawValue: string): { color: Rgba | null; reason?: string } {
    const value = rawValue.trim().toLowerCase();
    if (value === "none") return { color: null };
    if (value === "transparent") return { color: { ...transparent } };
    if (!value || /(?:url|gradient|pattern|paint|var)\s*\(/i.test(value)) {
      return { color: null, reason: `unsupported paint server ${JSON.stringify(rawValue)}` };
    }
    const hex = value.match(/^#([0-9a-f]{3,8})$/i)?.[1];
    if (hex) {
      const expanded = hex.length === 3 || hex.length === 4
        ? Array.from(hex, (character) => character + character).join("")
        : hex;
      if (expanded.length === 6 || expanded.length === 8) {
        return {
          color: {
            alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
            blue: Number.parseInt(expanded.slice(4, 6), 16),
            green: Number.parseInt(expanded.slice(2, 4), 16),
            red: Number.parseInt(expanded.slice(0, 2), 16)
          }
        };
      }
    }
    const srgb = value.match(/^color\(srgb\s+([^)]*)\)$/i);
    if (srgb) {
      const [channelsPart, alphaPart] = srgb[1].split("/").map((part) => part.trim());
      const channels = channelsPart.split(/\s+/).map(Number);
      const alpha = alphaPart === undefined
        ? 1
        : alphaPart.endsWith("%")
          ? Number.parseFloat(alphaPart) / 100
          : Number(alphaPart);
      if (channels.length === 3 && channels.every(Number.isFinite) && Number.isFinite(alpha)) {
        return {
          color: {
            alpha: clampInPage(alpha, 0, 1),
            blue: clampInPage(channels[2], 0, 1) * 255,
            green: clampInPage(channels[1], 0, 1) * 255,
            red: clampInPage(channels[0], 0, 1) * 255
          }
        };
      }
    }
    if (/^rgba?\(/i.test(value)) {
      const components = value.match(/[-+]?\d*\.?\d+%?/g) ?? [];
      if (components.length >= 3) {
        const rgb = components.slice(0, 3).map((component) => component.endsWith("%")
          ? Number.parseFloat(component) * 2.55
          : Number.parseFloat(component));
        const alphaComponent = components[3];
        const alpha = alphaComponent === undefined
          ? 1
          : alphaComponent.endsWith("%")
            ? Number.parseFloat(alphaComponent) / 100
            : Number.parseFloat(alphaComponent);
        if (rgb.every(Number.isFinite) && Number.isFinite(alpha)) {
          return {
            color: {
              alpha: clampInPage(alpha, 0, 1),
              blue: clampInPage(rgb[2], 0, 255),
              green: clampInPage(rgb[1], 0, 255),
              red: clampInPage(rgb[0], 0, 255)
            }
          };
        }
      }
    }
    return { color: null, reason: `unparseable effective color ${JSON.stringify(rawValue)}` };
  }

  function parseOpacity(rawValue: string, label: string, reasons: string[]) {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) {
      reasons.push(`${label} is not numeric (${JSON.stringify(rawValue)})`);
      return 1;
    }
    return clampInPage(value, 0, 1);
  }

  function styleEffectReasons(element: Element, includeBackgroundImage: boolean) {
    const style = getComputedStyle(element);
    const reasons: string[] = [];
    if (includeBackgroundImage && style.backgroundImage !== "none") {
      reasons.push(`${element.tagName.toLowerCase()} uses background image/gradient ${JSON.stringify(style.backgroundImage)}`);
    }
    if (style.filter !== "none") reasons.push(`${element.tagName.toLowerCase()} uses filter ${JSON.stringify(style.filter)}`);
    if (style.boxShadow !== "none" && /(?:^|,)\s*inset\b|\binset\b/i.test(style.boxShadow)) {
      reasons.push(`${element.tagName.toLowerCase()} uses inset box-shadow ${JSON.stringify(style.boxShadow)}`);
    }
    if (style.clipPath !== "none") {
      reasons.push(`${element.tagName.toLowerCase()} uses clip-path ${JSON.stringify(style.clipPath)}`);
    }
    const backdropFilter = style.getPropertyValue("backdrop-filter") || style.getPropertyValue("-webkit-backdrop-filter");
    if (backdropFilter && backdropFilter !== "none") {
      reasons.push(`${element.tagName.toLowerCase()} uses backdrop filter ${JSON.stringify(backdropFilter)}`);
    }
    if (style.mixBlendMode !== "normal") {
      reasons.push(`${element.tagName.toLowerCase()} uses mix-blend-mode ${JSON.stringify(style.mixBlendMode)}`);
    }
    if (style.backgroundBlendMode && style.backgroundBlendMode !== "normal") {
      reasons.push(`${element.tagName.toLowerCase()} uses background-blend-mode ${JSON.stringify(style.backgroundBlendMode)}`);
    }
    const maskImage = style.getPropertyValue("mask-image") || style.getPropertyValue("-webkit-mask-image");
    if (maskImage && maskImage !== "none") {
      reasons.push(`${element.tagName.toLowerCase()} uses mask image ${JSON.stringify(maskImage)}`);
    }
    const mask = element.getAttribute("mask");
    if (mask && mask !== "none") reasons.push(`${element.tagName.toLowerCase()} uses SVG mask ${JSON.stringify(mask)}`);
    if (element instanceof HTMLElement) {
      for (const pseudo of ["::before", "::after"] as const) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        const content = pseudoStyle.content.trim();
        const generated = content !== "none" && content !== "normal";
        if (
          !generated ||
          pseudoStyle.display === "none" ||
          pseudoStyle.visibility === "hidden" ||
          Number.parseFloat(pseudoStyle.opacity) === 0
        ) {
          continue;
        }
        const pseudoBackground = parseCssColor(pseudoStyle.backgroundColor);
        const hasPaint = pseudoStyle.backgroundImage !== "none" ||
          Boolean(pseudoBackground.color && pseudoBackground.color.alpha > 0) ||
          pseudoStyle.boxShadow !== "none" || pseudoStyle.borderTopStyle !== "none" ||
          pseudoStyle.borderRightStyle !== "none" || pseudoStyle.borderBottomStyle !== "none" ||
          pseudoStyle.borderLeftStyle !== "none";
        const hasContent = Boolean(
          content !== '""' && content !== "''"
        );
        if (hasContent || hasPaint) {
          reasons.push(`${element.tagName.toLowerCase()} ${pseudo} generated content makes the painted background/text ambiguous`);
        }
      }
    }
    return reasons;
  }

  function renderTreeEffectReasons(element: Element, allowFirstOpacity: boolean) {
    const reasons: string[] = [];
    let current: Element | null = element;
    let first = true;
    while (current) {
      reasons.push(...styleEffectReasons(current, false));
      const style = getComputedStyle(current);
      const opacity = parseOpacity(style.opacity, `${current.tagName.toLowerCase()} opacity`, reasons);
      if (opacity < 0.999999 && !(first && allowFirstOpacity)) {
        reasons.push(`${current.tagName.toLowerCase()} ancestor opacity ${opacity} changes the rendered contrast as a group`);
      }
      current = current.parentElement;
      first = false;
    }
    return Array.from(new Set(reasons));
  }

  function flatCssBackground(element: Element | null, skipFirstOpacity = true): FlatBackground {
    let current = element;
    let color = { ...transparent };
    const reasons: string[] = [];
    let first = true;
    while (current && color.alpha < 0.999999) {
      const style = getComputedStyle(current);
      reasons.push(...styleEffectReasons(current, true));
      const opacity = parseOpacity(style.opacity, `${current.tagName.toLowerCase()} opacity`, reasons);
      if (opacity < 0.999999 && !(first && skipFirstOpacity)) {
        reasons.push(`${current.tagName.toLowerCase()} ancestor opacity ${opacity} makes the effective background group-dependent`);
      }
      const parsed = parseCssColor(style.backgroundColor);
      if (parsed.reason) reasons.push(`${current.tagName.toLowerCase()} background: ${parsed.reason}`);
      if (parsed.color) color = over(color, parsed.color);
      current = current.parentElement;
      first = false;
    }
    if (color.alpha < 0.999999) color = over(color, white);
    return { color, reasons: Array.from(new Set(reasons)) };
  }

  function isVisuallyPresent(element: Element) {
    for (let current: Element | null = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (
        style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" ||
        Number.parseFloat(style.opacity) === 0 || current.hasAttribute("hidden")
      ) return false;
    }
    return Array.from(element.getClientRects()).some((rect) =>
      rect.width > 0 && rect.height > 0 ||
      element instanceof SVGGeometryElement && (rect.width > 0 || rect.height > 0)
    );
  }

  function releaseRange(range: Range) {
    // Range.detach() was deprecated long ago and is absent in current Chrome.
    // Treat it as an optional legacy hint so text geometry remains executable
    // across both the acceptance browser and newer local Chrome releases.
    if (typeof range.detach === "function") range.detach();
  }

  function textPaintsAtPoint(candidate: Element, point: SamplePoint) {
    const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      const parent = text.parentElement;
      if (
        !parent || !shortLabel(text.textContent ?? "") ||
        parent.closest("svg,canvas,script,style,template,noscript,.sr-only") ||
        !isVisuallyPresent(parent)
      ) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      const paints = Array.from(range.getClientRects()).some((rect) =>
        rect.width > 0 && rect.height > 0 &&
        point.x >= rect.left && point.x <= rect.right &&
        point.y >= rect.top && point.y <= rect.bottom
      );
      releaseRange(range);
      if (paints) return true;
    }
    return false;
  }

  function elementPaintsAtPoint(candidate: Element, point: SamplePoint) {
    if (!isVisuallyPresent(candidate)) return false;
    if (
      candidate instanceof HTMLCanvasElement || candidate instanceof HTMLImageElement ||
      candidate instanceof HTMLVideoElement || candidate instanceof SVGImageElement ||
      candidate instanceof SVGForeignObjectElement
    ) return true;
    if (candidate instanceof SVGGeometryElement) {
      const matrix = candidate.getScreenCTM();
      if (!matrix) return true;
      try {
        const local = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
        return candidate.isPointInFill(local) || candidate.isPointInStroke(local);
      } catch {
        return true;
      }
    }
    const style = getComputedStyle(candidate);
    const background = parseCssColor(style.backgroundColor);
    if (style.backgroundImage !== "none") return true;
    if (background.color && background.color.alpha > 0) return true;
    if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) return true;
    const borderPainted = ["Top", "Right", "Bottom", "Left"].some((side) =>
      style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none" &&
      Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
    );
    if (borderPainted) return true;
    return textPaintsAtPoint(candidate, point);
  }

  /**
   * Prove that the audited element itself paints a fully opaque, flat backdrop
   * beneath its text. In that narrow case, lower non-ancestor siblings cannot
   * contribute to the text background even though elementsFromPoint still
   * reports them below the element. Any translucency or unsupported paint
   * effect keeps the conservative lower-stack rejection active.
   */
  function hasProvenOpaqueOwnBackdrop(element: Element) {
    const style = getComputedStyle(element);
    const parsed = parseCssColor(style.backgroundColor);
    const ownOpacity = Number.parseFloat(style.opacity);
    const backgroundClip = style.backgroundClip ||
      style.getPropertyValue("-webkit-background-clip");
    return Boolean(
      parsed.color && parsed.color.alpha >= 0.999999 &&
      Number.isFinite(ownOpacity) && ownOpacity >= 0.999999 &&
      style.backgroundImage === "none" &&
      backgroundClip !== "text" &&
      backgroundClip !== "border-area" &&
      styleEffectReasons(element, true).length === 0
    );
  }

  /** Reject non-ancestor backdrops and any final painted occluder above the target. */
  function finalStackReasons(element: Element, points: SamplePoint[]) {
    const reasons: string[] = [];
    let foundOwnPaintInStack = false;
    const ownBackdropOccludesLowerPaint = hasProvenOpaqueOwnBackdrop(element);
    const authoredStyleAttribute = element.getAttribute("style");
    const restoreAuthoredStyleAttribute = () => {
      if (authoredStyleAttribute === null) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", authoredStyleAttribute);
      }
    };
    const elementsFromPointIncludingPointerTransparentTarget = (point: SamplePoint) => {
      const directStack = document.elementsFromPoint(point.x, point.y);
      if (directStack.some((candidate) => candidate === element || element.contains(candidate))) {
        return directStack;
      }
      if (!(element instanceof HTMLElement || element instanceof SVGElement) ||
          getComputedStyle(element).pointerEvents !== "none") {
        return directStack;
      }
      // pointer-events:none changes hit testing, not paint. Temporarily make the
      // audited target hit-testable so the final stack can still prove whether
      // its visible text is clear or covered, then restore the authored style.
      // Mutating `element.style` and then removing the attribute leaves
      // `style=""` in Chromium after the evaluate task commits. Replace the
      // complete attribute instead so a previously absent attribute remains
      // absent across the browser task boundary.
      element.setAttribute(
        "style",
        `${authoredStyleAttribute ?? ""};pointer-events:auto!important;`
      );
      try {
        return document.elementsFromPoint(point.x, point.y);
      } finally {
        restoreAuthoredStyleAttribute();
      }
    };
    // elementsFromPoint only has defined hit-test evidence inside the current
    // viewport. Text below the fold still receives the full paint/background
    // contrast audit, but an empty off-viewport stack is not an occlusion.
    const viewportPoints = points.filter((point) =>
      point.x >= 0 && point.x < window.innerWidth &&
      point.y >= 0 && point.y < window.innerHeight
    );
    for (const point of viewportPoints.slice(0, 12)) {
      const stack = elementsFromPointIncludingPointerTransparentTarget(point);
      const ownIndex = stack.findIndex((candidate) => candidate === element || element.contains(candidate));
      if (ownIndex < 0) {
        continue;
      }
      foundOwnPaintInStack = true;
      for (const candidate of stack.slice(0, ownIndex)) {
        if (candidate === element || element.contains(candidate) || candidate.contains(element)) continue;
        if (elementPaintsAtPoint(candidate, point)) {
          reasons.push(
            `${candidate.tagName.toLowerCase()} is a final painted occluder above ${element.tagName.toLowerCase()}`
          );
          break;
        }
      }
      if (!ownBackdropOccludesLowerPaint) {
        for (const candidate of stack.slice(ownIndex + 1)) {
          if (candidate === element || element.contains(candidate)) continue;
          if (candidate.contains(element)) break;
          if (elementPaintsAtPoint(candidate, point)) {
            reasons.push(
              `${candidate.tagName.toLowerCase()} is a non-ancestor painted backdrop beneath ${element.tagName.toLowerCase()}`
            );
            break;
          }
        }
      }
    }
    if (viewportPoints.length > 0 && !foundOwnPaintInStack && !(element instanceof SVGElement)) {
      reasons.push(`${element.tagName.toLowerCase()} is absent from the hit-test stack at all visible paint samples`);
    }
    // The hit-test shim is evidence-only. Reassert the exact authored style
    // attribute after every sample so even a browser-created empty attribute
    // cannot leak into the product-state fingerprint.
    restoreAuthoredStyleAttribute();
    return Array.from(new Set(reasons));
  }

  function shortLabel(value: string) {
    return value.replace(/\s+/g, " ").trim().slice(0, 90);
  }

  function minimumRenderedScale(a: number, b: number, c: number, d: number) {
    if (![a, b, c, d].every(Number.isFinite)) return null;
    const trace = a * a + b * b + c * c + d * d;
    const determinantSquared = (a * d - b * c) ** 2;
    const discriminant = Math.max(0, trace * trace - 4 * determinantSquared);
    const eigenvalue = (trace - Math.sqrt(discriminant)) / 2;
    if (!Number.isFinite(eigenvalue) || eigenvalue <= 0) return null;
    const scale = Math.sqrt(eigenvalue);
    return Number.isFinite(scale) && scale > 0 ? scale : null;
  }

  function fontWeight(style: CSSStyleDeclaration) {
    const fontSize = Number.parseFloat(style.fontSize);
    const numericWeight = Number.parseFloat(style.fontWeight);
    const weight = Number.isFinite(numericWeight)
      ? numericWeight
      : style.fontWeight === "bold" || style.fontWeight === "bolder" ? 700 : 400;
    return { fontSize, weight };
  }

  function htmlEffectiveFontSize(element: Element, style: CSSStyleDeclaration) {
    const { fontSize } = fontWeight(style);
    if (!Number.isFinite(fontSize) || fontSize <= 0) return null;
    let scale = 1;
    for (let current: Element | null = element; current; current = current.parentElement) {
      const currentStyle = getComputedStyle(current);
      if (currentStyle.perspective !== "none") return null;
      if (currentStyle.transform !== "none") {
        try {
          const matrix = new DOMMatrixReadOnly(currentStyle.transform);
          if (!matrix.is2D) return null;
          const localScale = minimumRenderedScale(matrix.a, matrix.b, matrix.c, matrix.d);
          if (localScale === null) return null;
          scale *= localScale;
        } catch {
          return null;
        }
      }
      const zoomValue = Number.parseFloat(currentStyle.getPropertyValue("zoom"));
      if (Number.isFinite(zoomValue) && zoomValue > 0 && Math.abs(zoomValue - 1) > 1e-9) {
        scale *= zoomValue;
      }
    }
    const rendered = fontSize * scale;
    return Number.isFinite(rendered) && rendered > 0 ? rendered : null;
  }

  function svgEffectiveFontSize(element: SVGTextContentElement, style: CSSStyleDeclaration) {
    const { fontSize } = fontWeight(style);
    const matrix = element.getScreenCTM();
    if (!Number.isFinite(fontSize) || fontSize <= 0 || !matrix) return null;
    const scale = minimumRenderedScale(matrix.a, matrix.b, matrix.c, matrix.d);
    if (scale === null) return null;
    const rendered = fontSize * scale;
    return Number.isFinite(rendered) && rendered > 0 ? rendered : null;
  }

  function textThreshold(style: CSSStyleDeclaration, effectiveFontSizePx: number | null) {
    const { weight } = fontWeight(style);
    if (effectiveFontSizePx === null) return input.thresholds.normalText;
    const isLarge = effectiveFontSizePx >= 24 || (effectiveFontSizePx >= 18.66 && weight >= 700);
    return isLarge ? input.thresholds.largeText : input.thresholds.normalText;
  }

  function textForegroundEffects(element: Element) {
    const style = getComputedStyle(element);
    const reasons = renderTreeEffectReasons(element, true);
    if (style.textShadow !== "none") reasons.push(`text uses shadow ${JSON.stringify(style.textShadow)}`);
    if (style.textDecorationLine && style.textDecorationLine !== "none") {
      reasons.push(`text uses decoration ${JSON.stringify(style.textDecorationLine)} without separate decoration paint evidence`);
    }
    const backgroundClip = style.getPropertyValue("background-clip") || style.getPropertyValue("-webkit-background-clip");
    if (backgroundClip === "text") reasons.push("text uses background-clip:text");
    const textStrokeWidth = Number.parseFloat(style.getPropertyValue("-webkit-text-stroke-width"));
    if (Number.isFinite(textStrokeWidth) && textStrokeWidth > 0) {
      reasons.push(`HTML text uses -webkit-text-stroke-width ${textStrokeWidth}px`);
    }
    const ownOpacity = parseOpacity(style.opacity, "text opacity", reasons);
    const ownBackground = parseCssColor(style.backgroundColor);
    if (ownOpacity < 0.999999 && ownBackground.color && ownBackground.color.alpha > 0) {
      reasons.push(`text opacity ${ownOpacity} also composites its own background as an unresolved group`);
    }
    return { ownOpacity, reasons };
  }

  function htmlTextPaint(style: CSSStyleDeclaration, reasons: string[]) {
    const webkitFill = style.getPropertyValue("-webkit-text-fill-color").trim();
    const rawPaint = webkitFill && webkitFill !== "currentcolor" ? webkitFill : style.color;
    const parsed = parseCssColor(rawPaint);
    if (parsed.reason) reasons.push(`HTML text paint: ${parsed.reason}`);
    if (webkitFill && webkitFill !== "currentcolor" && parsed.color?.alpha === 0) {
      reasons.push("HTML text -webkit-text-fill-color is transparent and terminal visible text paint is not proven");
    }
    return parsed;
  }

  function ratiosForPaint(
    paint: Rgba,
    backgrounds: FlatBackground[]
  ): { ratios: number[]; reasons: string[] } {
    const reasons = backgrounds.flatMap((background) => background.reasons);
    if (reasons.length > 0) return { ratios: [], reasons: Array.from(new Set(reasons)) };
    if (paint.alpha <= 0) return { ratios: [], reasons: [] };
    const ratios = backgrounds.map((background) => {
      const renderedForeground = over(paint, background.color);
      return contrast(renderedForeground, background.color);
    });
    return { ratios, reasons: [] };
  }

  function addOutcome(outcome: Outcome) {
    outcomes.push({
      ...outcome,
      background: outcome.background ?? null,
      backgroundSampleCount: outcome.backgroundSampleCount ?? 0,
      contextKind: outcome.contextKind ?? (
        outcome.kind.startsWith("svg-") ? "svg" :
          outcome.kind.startsWith("canvas-") ? "canvas-unknown" : "html"
      ),
      effectiveFontSizePx: outcome.effectiveFontSizePx ?? null,
      essential: outcome.essential ?? null,
      foreground: outcome.foreground ?? null,
      hasExecutableContrastProvider: outcome.hasExecutableContrastProvider ?? null,
      hasExecutableNonTextEvidence: outcome.hasExecutableNonTextEvidence ?? null,
      reasons: Array.from(new Set(outcome.reasons.filter(Boolean)))
    });
  }

  function auditHtmlTextNode(node: Text, index: number) {
    const parent = node.parentElement;
    const label = shortLabel(node.textContent ?? "");
    if (
      !parent || !label || parent.closest("svg,canvas,script,style,template,noscript,.sr-only") ||
      !isVisuallyPresent(parent)
    ) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const visibleRects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
    const hasVisibleRect = visibleRects.length > 0;
    releaseRange(range);
    if (!hasVisibleRect) return;
    const style = getComputedStyle(parent);
    const effectiveFontSizePx = htmlEffectiveFontSize(parent, style);
    const effects = textForegroundEffects(parent);
    const reasons = [
      ...effects.reasons,
      ...finalStackReasons(parent, visibleRects.map((rect) => ({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })))
    ];
    const parsed = htmlTextPaint(style, reasons);
    const background = flatCssBackground(parent);
    if (!parsed.color) {
      addOutcome({
        groupId: `html:${index}`,
        kind: "html-text",
        label,
        ratios: [],
        reasons: reasons.length > 0 ? reasons : ["HTML text has no defensible solid foreground color"],
        contextKind: "html",
        effectiveFontSizePx,
        sampleCount: visibleRects.length,
        sampleX: visibleRects[0] ? visibleRects[0].left + visibleRects[0].width / 2 : null,
        sampleY: visibleRects[0] ? visibleRects[0].top + visibleRects[0].height / 2 : null,
        threshold: textThreshold(style, effectiveFontSizePx)
      });
      return;
    }
    const foreground = { ...parsed.color, alpha: parsed.color.alpha * effects.ownOpacity };
    const assessed = ratiosForPaint(foreground, [background]);
    addOutcome({
      background: background.color,
      backgroundSampleCount: 1,
      contextKind: "html",
      effectiveFontSizePx,
      foreground,
      groupId: `html:${index}`,
      kind: "html-text",
      label,
      ratios: assessed.ratios,
      reasons: [...reasons, ...assessed.reasons],
      sampleCount: visibleRects.length,
      sampleX: visibleRects[0] ? visibleRects[0].left + visibleRects[0].width / 2 : null,
      sampleY: visibleRects[0] ? visibleRects[0].top + visibleRects[0].height / 2 : null,
      threshold: textThreshold(style, effectiveFontSizePx)
    });
  }

  function auditFormControlText(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    index: number
  ) {
    if (!isVisuallyPresent(element)) return;
    const usesPlaceholder = !(element instanceof HTMLSelectElement) &&
      element.value === "" && Boolean(element.placeholder);
    const label = shortLabel(
      element instanceof HTMLSelectElement
        ? element.selectedOptions[0]?.textContent ?? ""
        : element.value || element.placeholder
    );
    if (!label) return;
    const style = getComputedStyle(element);
    const textStyle = usesPlaceholder ? getComputedStyle(element, "::placeholder") : style;
    const effectiveFontSizePx = htmlEffectiveFontSize(element, textStyle);
    const effects = textForegroundEffects(element);
    const rect = element.getBoundingClientRect();
    const reasons = [
      ...effects.reasons,
      ...finalStackReasons(element, [{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }])
    ];
    if (usesPlaceholder) {
      if (textStyle.textShadow !== "none") {
        reasons.push(`placeholder text uses shadow ${JSON.stringify(textStyle.textShadow)}`);
      }
      const placeholderBackgroundClip = textStyle.getPropertyValue("background-clip") ||
        textStyle.getPropertyValue("-webkit-background-clip");
      if (placeholderBackgroundClip === "text") reasons.push("placeholder text uses background-clip:text");
      const placeholderStrokeWidth = Number.parseFloat(textStyle.getPropertyValue("-webkit-text-stroke-width"));
      if (Number.isFinite(placeholderStrokeWidth) && placeholderStrokeWidth > 0) {
        reasons.push(`placeholder text uses -webkit-text-stroke-width ${placeholderStrokeWidth}px`);
      }
    }
    const parsed = htmlTextPaint(textStyle, reasons);
    if (!parsed.color) reasons.push("form-control text has no defensible solid foreground color");
    const background = flatCssBackground(element);
    const pseudoOpacity = usesPlaceholder
      ? parseOpacity(textStyle.opacity, "placeholder opacity", reasons)
      : 1;
    const foreground = parsed.color
      ? { ...parsed.color, alpha: parsed.color.alpha * effects.ownOpacity * pseudoOpacity }
      : null;
    const assessed = foreground
      ? ratiosForPaint(
          foreground,
          [background]
        )
      : { ratios: [] as number[], reasons: [] as string[] };
    addOutcome({
      background: background.color,
      backgroundSampleCount: 1,
      contextKind: "html",
      effectiveFontSizePx,
      foreground,
      groupId: `form:${index}`,
      kind: "html-text",
      label,
      ratios: assessed.ratios,
      reasons: [...reasons, ...assessed.reasons],
      sampleCount: 1,
      sampleX: rect.left + rect.width / 2,
      sampleY: rect.top + rect.height / 2,
      threshold: textThreshold(textStyle, effectiveFontSizePx)
    });
  }

  function svgAncestorEffectReasons(element: SVGElement) {
    const reasons: string[] = [];
    let current: Element | null = element;
    let first = true;
    while (current && current instanceof SVGElement) {
      reasons.push(...styleEffectReasons(current, false));
      const style = getComputedStyle(current);
      const opacity = parseOpacity(style.opacity, `${current.tagName.toLowerCase()} opacity`, reasons);
      if (!first && opacity < 0.999999) {
        reasons.push(`${current.tagName.toLowerCase()} ancestor opacity ${opacity} requires unresolved group compositing`);
      }
      const clipPath = style.clipPath || current.getAttribute("clip-path") || "none";
      if (clipPath !== "none") reasons.push(`${current.tagName.toLowerCase()} uses clip-path ${JSON.stringify(clipPath)}`);
      if (current instanceof SVGSVGElement) break;
      current = current.parentElement;
      first = false;
    }
    const owner = element.ownerSVGElement ?? (element instanceof SVGSVGElement ? element : null);
    if (owner?.parentElement) reasons.push(...renderTreeEffectReasons(owner.parentElement, false));
    return Array.from(new Set(reasons));
  }

  function svgPaintAtPoint(element: SVGGeometryElement, point: SamplePoint) {
    const reasons = svgAncestorEffectReasons(element);
    const matrix = element.getScreenCTM();
    if (!matrix) return { color: null as Rgba | null, reasons: [...reasons, "SVG geometry has no screen transform"] };
    let localPoint: DOMPoint;
    try {
      localPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
    } catch (error) {
      return { color: null as Rgba | null, reasons: [...reasons, `SVG geometry transform is singular (${String(error)})`] };
    }
    let inFill = false;
    let inStroke = false;
    try {
      inFill = element.isPointInFill(localPoint);
      inStroke = element.isPointInStroke(localPoint);
    } catch (error) {
      return { color: null as Rgba | null, reasons: [...reasons, `SVG geometry hit testing failed (${String(error)})`] };
    }
    const style = getComputedStyle(element);
    const ownOpacity = parseOpacity(style.opacity, "SVG geometry opacity", reasons);
    let color = { ...transparent };
    if (inFill) {
      const parsed = parseCssColor(style.fill);
      if (parsed.reason) reasons.push(`SVG fill: ${parsed.reason}`);
      if (parsed.color) {
        const fillOpacity = parseOpacity(style.fillOpacity, "SVG fill opacity", reasons);
        color = over({ ...parsed.color, alpha: parsed.color.alpha * fillOpacity }, color);
      }
    }
    if (inStroke) {
      const parsed = parseCssColor(style.stroke);
      if (parsed.reason) reasons.push(`SVG stroke: ${parsed.reason}`);
      if (parsed.color) {
        const strokeOpacity = parseOpacity(style.strokeOpacity, "SVG stroke opacity", reasons);
        color = over({ ...parsed.color, alpha: parsed.color.alpha * strokeOpacity }, color);
      }
    }
    color.alpha *= ownOpacity;
    return { color: color.alpha > 0 ? color : null, reasons };
  }

  function pointInsideClientRect(element: Element, point: SamplePoint) {
    const rect = element.getBoundingClientRect();
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  }

  function svgBackgroundAt(target: SVGElement, point: SamplePoint): FlatBackground {
    const owner = target.ownerSVGElement ?? (target instanceof SVGSVGElement ? target : null);
    if (!owner) return { color: white, reasons: ["SVG target has no owner SVG background"] };
    const cssBackground = flatCssBackground(owner);
    let color = cssBackground.color;
    const reasons = [...cssBackground.reasons, ...finalStackReasons(target, [point])];
    const graphics = Array.from(owner.querySelectorAll<SVGElement>(
      "rect,circle,ellipse,line,path,polygon,polyline,use,image,foreignObject"
    ));
    for (const graphic of graphics) {
      if (graphic === target || graphic.contains(target)) continue;
      const position = graphic.compareDocumentPosition(target);
      if (!isVisuallyPresent(graphic) || !pointInsideClientRect(graphic, point)) continue;
      if (
        graphic instanceof SVGImageElement || graphic instanceof SVGForeignObjectElement ||
        graphic instanceof SVGUseElement
      ) {
        reasons.push(
          position & Node.DOCUMENT_POSITION_FOLLOWING
            ? `${graphic.tagName.toLowerCase()} beneath SVG label/mark makes its destination background unsupported`
            : `${graphic.tagName.toLowerCase()} is a final painted occluder above the SVG label/mark`
        );
        continue;
      }
      if (!(graphic instanceof SVGGeometryElement)) {
        reasons.push(`${graphic.tagName.toLowerCase()} beneath SVG label/mark cannot be hit-tested`);
        continue;
      }
      const painted = svgPaintAtPoint(graphic, point);
      reasons.push(...painted.reasons);
      if (painted.color) {
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) color = over(painted.color, color);
        else reasons.push(`${graphic.tagName.toLowerCase()} is a final painted occluder above the SVG label/mark`);
      }
    }
    return { color, reasons: Array.from(new Set(reasons)) };
  }

  function svgTextSamplePoints(element: SVGTextContentElement) {
    const points: SamplePoint[] = [];
    const matrix = element.getScreenCTM();
    if (!matrix) return points;
    let characterCount = 0;
    try {
      characterCount = element.getNumberOfChars();
    } catch {
      characterCount = 0;
    }
    const step = Math.max(1, Math.ceil(characterCount / 60));
    for (let index = 0; index < characterCount; index += step) {
      try {
        const extent = element.getExtentOfChar(index);
        const point = new DOMPoint(extent.x + extent.width / 2, extent.y + extent.height / 2)
          .matrixTransform(matrix);
        if ([point.x, point.y].every(Number.isFinite)) points.push({ x: point.x, y: point.y });
      } catch {
        // A missing extent is handled by the fallback / hard unsupported path.
      }
    }
    if (points.length === 0) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) points.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    return points;
  }

  function auditSvgText(element: SVGTextElement, index: number) {
    const label = shortLabel(element.textContent ?? "");
    if (!label || !isVisuallyPresent(element)) return;
    const style = getComputedStyle(element);
    const reasons = svgAncestorEffectReasons(element);
    if (style.textShadow !== "none") reasons.push(`SVG text uses shadow ${JSON.stringify(style.textShadow)}`);
    const points = svgTextSamplePoints(element);
    if (points.length === 0) reasons.push("SVG text has no defensible rendered character sample point");
    const backgrounds = points.map((point) => svgBackgroundAt(element, point));
    const ownOpacity = parseOpacity(style.opacity, "SVG text opacity", reasons);
    const effectiveFontSizePx = svgEffectiveFontSize(element, style);
    const threshold = textThreshold(style, effectiveFontSizePx);
    const paints = [
      { kind: "svg-text-fill" as const, opacity: style.fillOpacity, value: style.fill },
      { kind: "svg-text-stroke" as const, opacity: style.strokeOpacity, value: style.stroke }
    ];
    const hasVisibleFillAndStroke = paints.every((paint) => {
      const parsed = parseCssColor(paint.value);
      return Boolean(parsed.color && parsed.color.alpha > 0 && Number.parseFloat(paint.opacity) > 0);
    });
    let activePaintCount = 0;
    for (const paint of paints) {
      const parsed = parseCssColor(paint.value);
      if (parsed.reason) {
        activePaintCount += 1;
        addOutcome({
          background: backgrounds[0]?.color ?? null,
          backgroundSampleCount: backgrounds.length,
          contextKind: "svg",
          effectiveFontSizePx,
          groupId: `svg-text:${index}`,
          kind: paint.kind,
          label,
          ratios: [],
          reasons: [...reasons, `${paint.kind}: ${parsed.reason}`],
          sampleCount: points.length,
          sampleX: points[0]?.x ?? null,
          sampleY: points[0]?.y ?? null,
          threshold
        });
        continue;
      }
      if (!parsed.color || parsed.color.alpha === 0) continue;
      activePaintCount += 1;
      const paintReasons = [...reasons];
      if (paint.kind === "svg-text-stroke" && hasVisibleFillAndStroke) {
        paintReasons.push(
          "SVG text stroke overlaps its fill, but the stroke's terminal destination paint is not executable"
        );
      }
      const paintOpacity = parseOpacity(paint.opacity, `${paint.kind} opacity`, reasons);
      const assessed = ratiosForPaint(
        { ...parsed.color, alpha: parsed.color.alpha * paintOpacity * ownOpacity },
        backgrounds
      );
      const foreground = { ...parsed.color, alpha: parsed.color.alpha * paintOpacity * ownOpacity };
      addOutcome({
        background: backgrounds[0]?.color ?? null,
        backgroundSampleCount: backgrounds.length,
        contextKind: "svg",
        effectiveFontSizePx,
        foreground,
        groupId: `svg-text:${index}`,
        kind: paint.kind,
        label,
        ratios: assessed.ratios,
        reasons: [...paintReasons, ...assessed.reasons],
        sampleCount: points.length,
        sampleX: points[0]?.x ?? null,
        sampleY: points[0]?.y ?? null,
        threshold
      });
    }
    if (activePaintCount === 0) {
      addOutcome({
        background: backgrounds[0]?.color ?? null,
        backgroundSampleCount: backgrounds.length,
        contextKind: "svg",
        effectiveFontSizePx,
        groupId: `svg-text:${index}`,
        kind: "svg-text-fill",
        label,
        ratios: [],
        reasons: [...reasons, "SVG text has neither a visible solid fill nor stroke"],
        sampleCount: points.length,
        sampleX: points[0]?.x ?? null,
        sampleY: points[0]?.y ?? null,
        threshold
      });
    }
  }

  function svgGeometrySamplePoints(element: SVGGeometryElement, mode: "fill" | "stroke") {
    const points: SamplePoint[] = [];
    const matrix = element.getScreenCTM();
    if (!matrix) return points;
    if (mode === "stroke") {
      try {
        const length = element.getTotalLength();
        if (Number.isFinite(length) && length > 0) {
          for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
            const local = element.getPointAtLength(length * fraction);
            if (!element.isPointInStroke(local)) continue;
            const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix);
            if ([screen.x, screen.y].every(Number.isFinite)) points.push({ x: screen.x, y: screen.y });
          }
        }
      } catch {
        // The bbox grid below remains a second defensible geometry probe.
      }
    }
    let box: DOMRect | SVGRect;
    try {
      box = element.getBBox();
    } catch {
      return points;
    }
    const fractions = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    for (const xFraction of fractions) {
      for (const yFraction of fractions) {
        const local = new DOMPoint(
          box.x + box.width * xFraction,
          box.y + box.height * yFraction
        );
        let painted = false;
        try {
          painted = mode === "fill" ? element.isPointInFill(local) : element.isPointInStroke(local);
        } catch {
          painted = false;
        }
        if (!painted) continue;
        const screen = local.matrixTransform(matrix);
        if ([screen.x, screen.y].every(Number.isFinite)) points.push({ x: screen.x, y: screen.y });
      }
    }
    return points;
  }

  function auditSvgEssentialMark(element: SVGElement, index: number) {
    const label = shortLabel(
      element.getAttribute("data-viz-name") || element.getAttribute("aria-label") ||
      `${element.tagName.toLowerCase()} mark ${index + 1}`
    );
    if (!isVisuallyPresent(element)) return;
    if (!(element instanceof SVGGeometryElement)) {
      const descendantGeometry = Array.from(element.querySelectorAll<SVGGeometryElement>(
        "rect,circle,ellipse,line,path,polygon,polyline"
      ));
      if (descendantGeometry.length > 0) {
        descendantGeometry.forEach((geometry, childIndex) => auditSvgEssentialMark(geometry, index * 1_000 + childIndex));
        return;
      }
      addOutcome({
        groupId: `svg-mark:${index}`,
        kind: "svg-essential-fill",
        label,
        ratios: [],
        reasons: [`Explicit essential SVG mark ${element.tagName.toLowerCase()} has no auditable geometry`],
        threshold: input.thresholds.nonText
      });
      return;
    }
    const style = getComputedStyle(element);
    const reasons = svgAncestorEffectReasons(element);
    const ownOpacity = parseOpacity(style.opacity, "SVG mark opacity", reasons);
    const paints = [
      { kind: "svg-essential-fill" as const, mode: "fill" as const, opacity: style.fillOpacity, value: style.fill },
      { kind: "svg-essential-stroke" as const, mode: "stroke" as const, opacity: style.strokeOpacity, value: style.stroke }
    ];
    const hasVisibleFillAndStroke = paints.every((paint) => {
      if (paint.mode === "fill" && element.tagName.toLowerCase() === "line") return false;
      const parsed = parseCssColor(paint.value);
      return Boolean(parsed.color && parsed.color.alpha > 0 && Number.parseFloat(paint.opacity) > 0);
    });
    let activePaintCount = 0;
    for (const paint of paints) {
      const parsed = parseCssColor(paint.value);
      if (parsed.reason) {
        activePaintCount += 1;
        addOutcome({
          groupId: `svg-mark:${index}`,
          kind: paint.kind,
          label,
          ratios: [],
          reasons: [...reasons, `${paint.kind}: ${parsed.reason}`],
          threshold: input.thresholds.nonText
        });
        continue;
      }
      if (!parsed.color || parsed.color.alpha === 0) continue;
      const points = svgGeometrySamplePoints(element, paint.mode);
      if (points.length === 0) {
        if (paint.mode === "fill" && element.tagName.toLowerCase() === "line") continue;
        activePaintCount += 1;
        addOutcome({
          groupId: `svg-mark:${index}`,
          kind: paint.kind,
          label,
          ratios: [],
          reasons: [...reasons, `${paint.kind} has no defensible painted geometry sample`],
          threshold: input.thresholds.nonText
        });
        continue;
      }
      activePaintCount += 1;
      const paintReasons = [...reasons];
      if (paint.mode === "stroke" && hasVisibleFillAndStroke) {
        paintReasons.push(
          "SVG mark stroke overlaps its fill, but the stroke's terminal destination paint is not executable"
        );
      }
      const paintOpacity = parseOpacity(paint.opacity, `${paint.kind} opacity`, reasons);
      const assessed = ratiosForPaint(
        { ...parsed.color, alpha: parsed.color.alpha * paintOpacity * ownOpacity },
        points.map((point) => svgBackgroundAt(element, point))
      );
      const foreground = { ...parsed.color, alpha: parsed.color.alpha * paintOpacity * ownOpacity };
      const backgrounds = points.map((point) => svgBackgroundAt(element, point));
      addOutcome({
        background: backgrounds[0]?.color ?? null,
        backgroundSampleCount: backgrounds.length,
        contextKind: "svg",
        foreground,
        groupId: `svg-mark:${index}`,
        kind: paint.kind,
        label,
        ratios: assessed.ratios,
        reasons: [...paintReasons, ...assessed.reasons],
        sampleCount: points.length,
        sampleX: points[0]?.x ?? null,
        sampleY: points[0]?.y ?? null,
        threshold: input.thresholds.nonText
      });
    }
    if (activePaintCount === 0) {
      addOutcome({
        groupId: `svg-mark:${index}`,
        kind: "svg-essential-fill",
        label,
        ratios: [],
        reasons: [...reasons, "Essential SVG mark has no sampled visible solid fill or stroke"],
        threshold: input.thresholds.nonText
      });
    }
  }

  function auditHtmlEssentialMark(element: HTMLElement, index: number) {
    if (!isVisuallyPresent(element)) return;
    const label = shortLabel(
      element.getAttribute("data-viz-name") || element.getAttribute("aria-label") ||
      `${element.tagName.toLowerCase()} mark ${index + 1}`
    );
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const sample = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const reasons = [
      ...renderTreeEffectReasons(element, true),
      ...styleEffectReasons(element, true),
      ...finalStackReasons(element, [sample])
    ];
    const hasBorder = ["top", "right", "bottom", "left"].some((side) =>
      style.getPropertyValue(`border-${side}-style`) !== "none" &&
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0
    );
    const hasOutline = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
    if (hasBorder || hasOutline) {
      reasons.push(
        "Essential HTML mark uses border/outline geometry without executable edge paint/destination contrast evidence"
      );
    }
    const parsed = parseCssColor(style.backgroundColor);
    if (parsed.reason) reasons.push(`essential HTML mark background: ${parsed.reason}`);
    if (!parsed.color || parsed.color.alpha === 0) {
      reasons.push("Essential HTML mark has no defensible solid background paint");
      addOutcome({
        contextKind: "html",
        groupId: `html-mark:${index}`,
        kind: "html-essential-fill",
        label,
        ratios: [],
        reasons,
        sampleCount: 1,
        sampleX: sample.x,
        sampleY: sample.y,
        threshold: input.thresholds.nonText
      });
      return;
    }
    const ownOpacity = parseOpacity(style.opacity, "essential HTML mark opacity", reasons);
    const background = flatCssBackground(element.parentElement);
    const foreground = { ...parsed.color, alpha: parsed.color.alpha * ownOpacity };
    const assessed = ratiosForPaint(
      foreground,
      [background]
    );
    addOutcome({
      background: background.color,
      backgroundSampleCount: 1,
      contextKind: "html",
      foreground,
      groupId: `html-mark:${index}`,
      kind: "html-essential-fill",
      label,
      ratios: assessed.ratios,
      reasons: [...reasons, ...assessed.reasons],
      sampleCount: 1,
      sampleX: sample.x,
      sampleY: sample.y,
      threshold: input.thresholds.nonText
    });
  }

  function unpackCanvasPixel(value: number): Rgba {
    return {
      alpha: ((value >>> 24) & 0xff) / 255,
      blue: (value >>> 16) & 0xff,
      green: (value >>> 8) & 0xff,
      red: value & 0xff
    };
  }

  function canvasFontMetrics(canvasInput: CaliforniaCanvasTextContrastInput) {
    const font = canvasInput.font;
    const sizeMatch = font.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|\/|$)/i);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : Number.NaN;
    const weightMatch = font.match(/(?:^|\s)([1-9]00|bold|bolder)(?:\s|$)/i)?.[1]?.toLowerCase();
    const fontWeight = weightMatch === "bold" || weightMatch === "bolder"
      ? 700
      : weightMatch ? Number(weightMatch) : 400;
    const transformScale = minimumRenderedScale(
      canvasInput.transform[0], canvasInput.transform[1],
      canvasInput.transform[2], canvasInput.transform[3]
    );
    const rect = canvasInput.canvas.getBoundingClientRect();
    const style = getComputedStyle(canvasInput.canvas);
    const edgeValues = [
      style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft,
      style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth
    ].map(Number.parseFloat);
    let cssMappingProven = edgeValues.every((value) => Number.isFinite(value) && value === 0);
    for (let current: Element | null = canvasInput.canvas; current; current = current.parentElement) {
      const currentStyle = getComputedStyle(current);
      if (currentStyle.perspective !== "none") cssMappingProven = false;
      if (currentStyle.transform !== "none") {
        try {
          const matrix = new DOMMatrixReadOnly(currentStyle.transform);
          if (!matrix.is2D || Math.abs(matrix.b) > 1e-9 || Math.abs(matrix.c) > 1e-9) {
            cssMappingProven = false;
          }
        } catch {
          cssMappingProven = false;
        }
      }
    }
    const cssScaleX = rect.width / canvasInput.canvas.width;
    const cssScaleY = rect.height / canvasInput.canvas.height;
    const cssScale = cssMappingProven && cssScaleX > 0 && cssScaleY > 0
      ? Math.min(cssScaleX, cssScaleY)
      : null;
    const effectiveFontSizePx = Number.isFinite(fontSize) && transformScale !== null && cssScale !== null
      ? fontSize * transformScale * cssScale
      : null;
    const threshold = effectiveFontSizePx !== null &&
      (effectiveFontSizePx >= 24 || (effectiveFontSizePx >= 18.66 && fontWeight >= 700))
      ? input.thresholds.largeText
      : input.thresholds.normalText;
    return { effectiveFontSizePx, threshold };
  }

  function auditCanvasInput(canvasInput: CaliforniaCanvasTextContrastInput) {
    const kind = canvasInput.mode === "fill" ? "canvas-text-fill" : "canvas-text-stroke";
    const reasons = [...canvasInput.unsupportedReasons];
    const metrics = canvasFontMetrics(canvasInput);
    const parsed = canvasInput.paintStyle === null
      ? { color: null as Rgba | null, reason: "Canvas text has an unknown gradient/pattern paint server" }
      : parseCssColor(canvasInput.paintStyle);
    if (parsed.reason) reasons.push(`Canvas text paint: ${parsed.reason}`);
    if (!parsed.color || parsed.color.alpha === 0) {
      if (parsed.color?.alpha === 0 && reasons.length === 0) return;
      addOutcome({
        contextKind: "canvas-2d",
        effectiveFontSizePx: metrics.effectiveFontSizePx,
        groupId: `canvas:${canvasInput.groupId}`,
        kind,
        label: canvasInput.text,
        ratios: [],
        reasons: reasons.length > 0 ? reasons : ["Canvas text has no visible solid paint"],
        sampleCount: canvasInput.sampleCount,
        sampleX: canvasInput.sampleX,
        sampleY: canvasInput.sampleY,
        threshold: metrics.threshold
      });
      return;
    }
    const canvasStyleReasons = renderTreeEffectReasons(canvasInput.canvas, true);
    const canvasOpacity = parseOpacity(getComputedStyle(canvasInput.canvas).opacity, "Canvas element opacity", canvasStyleReasons);
    if (canvasOpacity < 0.999999) {
      canvasStyleReasons.push(`Canvas element opacity ${canvasOpacity} requires unresolved group compositing`);
    }
    const destinationPixels = canvasInput.prePaintDestinationPixels.map(unpackCanvasPixel);
    if (destinationPixels.length === 0) reasons.push("Canvas text has no defensible pre-paint destination pixels");
    const needsCssBackground = destinationPixels.some((pixel) => pixel.alpha < 0.999999);
    const cssBackground = needsCssBackground ? flatCssBackground(canvasInput.canvas) : null;
    if (cssBackground) reasons.push(...cssBackground.reasons);
    if (needsCssBackground) {
      const rect = canvasInput.canvas.getBoundingClientRect();
      reasons.push(...finalStackReasons(canvasInput.canvas, [{
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }]));
    }
    reasons.push(...canvasStyleReasons);
    const backgrounds = destinationPixels.map((pixel) =>
      pixel.alpha >= 0.999999
        ? pixel
        : over(pixel, cssBackground?.color ?? white)
    );
    const foreground = {
      ...parsed.color,
      alpha: parsed.color.alpha * canvasInput.globalAlpha
    };
    const ratios = reasons.length === 0
      ? backgrounds.map((background) => contrast(over(foreground, background), background))
      : [];
    addOutcome({
      background: backgrounds[0] ?? null,
      backgroundSampleCount: backgrounds.length,
      contextKind: "canvas-2d",
      effectiveFontSizePx: metrics.effectiveFontSizePx,
      foreground,
      groupId: `canvas:${canvasInput.groupId}`,
      kind,
      label: canvasInput.text,
      ratios,
      reasons,
      sampleCount: canvasInput.sampleCount,
      sampleX: canvasInput.sampleX,
      sampleY: canvasInput.sampleY,
      threshold: metrics.threshold
    });
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  let htmlTextIndex = 0;
  while (textNode) {
    auditHtmlTextNode(textNode as Text, htmlTextIndex);
    htmlTextIndex += 1;
    textNode = walker.nextNode();
  }

  Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="range"]):not([type="color"]):not([type="checkbox"]):not([type="radio"]),select,textarea'
  )).forEach(auditFormControlText);

  Array.from(root.querySelectorAll<SVGTextElement>("svg text")).forEach(auditSvgText);

  Array.from(root.querySelectorAll<Element>(input.essentialMarkSelector)).forEach((element, index) => {
    if (element instanceof HTMLCanvasElement || element instanceof SVGTextElement || element instanceof SVGTSpanElement) return;
    if (element instanceof SVGElement) auditSvgEssentialMark(element, index);
    else if (element instanceof HTMLElement) auditHtmlEssentialMark(element, index);
  });

  if (input.auditCanvases) {
    const canvases = Array.from(root.querySelectorAll("canvas")).filter(isVisuallyPresent);
    const auditWindow = window as Window & { __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi };
    const canvasApi = auditWindow.__californiaCanvasTextAudit;
    if (!canvasApi && canvases.length > 0) {
      addOutcome({
        groupId: "canvas:missing-recorder",
        kind: "canvas-text-fill",
        label: "Canvas text recorder",
        ratios: [],
        reasons: ["California Canvas text recorder was not installed before navigation"],
        threshold: input.thresholds.normalText
      });
    } else if (canvasApi) {
      canvasApi.contrastSurfaceOutcomes(root).forEach((surface, index) => {
        const contextKind = surface.contextKind === "2d" ? "canvas-2d" :
          surface.contextKind === "bitmaprenderer" ? "canvas-bitmaprenderer" :
            surface.contextKind === "webgl" ? "canvas-webgl" :
              surface.contextKind === "webgl2" ? "canvas-webgl2" : "canvas-unknown";
        addOutcome({
          contextKind,
          essential: surface.essential,
          groupId: `canvas-surface:${surface.canvasId ?? index}`,
          hasExecutableContrastProvider:
            surface.hasExecutableNonTextEvidence || surface.hasExecutableTextEvidence,
          hasExecutableNonTextEvidence: surface.hasExecutableNonTextEvidence,
          kind: "canvas-surface",
          label: `Canvas ${surface.canvasId ?? index + 1} ${surface.contextKind} modality`,
          ratios: [],
          reasons: surface.unsupportedReasons,
          sampleCount: 0,
          sampleX: null,
          sampleY: null,
          threshold: input.thresholds.nonText
        });
      });
      canvasApi.contrastInputs(root).forEach(auditCanvasInput);
    }
  }

  const groups = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    const group = groups.get(outcome.groupId) ?? [];
    group.push(outcome);
    groups.set(outcome.groupId, group);
  }

  const findings: CaliforniaContrastFinding[] = [];
  const evidence: CaliforniaContrastEvidence[] = outcomes.map((outcome) => ({
    background: outcome.background ?? null,
    backgroundSampleCount: outcome.backgroundSampleCount ?? 0,
    contextKind: outcome.contextKind ?? "html",
    effectiveFontSizePx: outcome.effectiveFontSizePx ?? null,
    essential: outcome.essential ?? null,
    foreground: outcome.foreground ?? null,
    groupId: outcome.groupId,
    hasExecutableContrastProvider: outcome.hasExecutableContrastProvider ?? null,
    hasExecutableNonTextEvidence: outcome.hasExecutableNonTextEvidence ?? null,
    kind: outcome.kind,
    label: outcome.label,
    ratio: outcome.ratios.length > 0 ? Math.min(...outcome.ratios) : null,
    ratios: outcome.ratios,
    reasons: outcome.reasons,
    sampleCount: outcome.sampleCount ?? 0,
    sampleX: outcome.sampleX ?? null,
    sampleY: outcome.sampleY ?? null,
    threshold: outcome.threshold
  }));
  let auditedLabelCount = 0;
  let minRatio: number | null = null;
  let worstKind: CaliforniaContrastEvidenceKind | null = null;
  let worstLabel: string | null = null;
  for (const group of groups.values()) {
    const groupReasons = Array.from(new Set(group.flatMap((outcome) => outcome.reasons)));
    if (groupReasons.length > 0) {
      const representative = group[0];
      findings.push({
        ...input.context,
        detail: groupReasons.join("; "),
        evidenceKind: representative.kind,
        kind: "contrast-unsupported",
        label: representative.label,
        ratio: null,
        severity: "hard",
        threshold: representative.threshold
      });
      continue;
    }
    const numericOutcomes = group.filter((outcome) => outcome.ratios.length > 0);
    if (numericOutcomes.length === 0) continue;
    auditedLabelCount += 1;
    for (const outcome of numericOutcomes) {
      const ratio = Math.min(...outcome.ratios);
      if (minRatio === null || ratio < minRatio) {
        minRatio = ratio;
        worstKind = outcome.kind;
        worstLabel = outcome.label;
      }
      if (ratio < outcome.threshold) {
        findings.push({
          ...input.context,
          detail: `${outcome.kind} contrast ${ratio.toFixed(4)} is below ${outcome.threshold.toFixed(2)}:1`,
          evidenceKind: outcome.kind,
          kind: "contrast-below-threshold",
          label: outcome.label,
          ratio,
          severity: "hard",
          threshold: outcome.threshold
        });
      }
    }
  }

  if (groups.size === 0) {
    findings.push({
      ...input.context,
      detail: "No visible HTML/SVG/recorded-Canvas learner label or explicit essential mark was available for contrast audit.",
      evidenceKind: "audit",
      kind: "contrast-audit-no-labels",
      label: "contrast audit",
      ratio: null,
      severity: "hard",
      threshold: null
    });
  }

  return {
    auditedLabelCount,
    candidateLabelCount: groups.size,
    evidence,
    findings,
    hardenedText: {
      algorithmSha256: "browser-base-audit-only",
      auditedTextCount: 0,
      candidateTextCount: 0,
      completed: false,
      evidenceSha256: "",
      findingCount: 1,
      minRatio: null,
      rawScan: { checkedTextCount: 0, evidence: [], issues: [], worst: null },
      worstLabel: null,
      worstRequiredRatio: null
    },
    minRatio,
    worstKind,
    worstLabel
  };
}
