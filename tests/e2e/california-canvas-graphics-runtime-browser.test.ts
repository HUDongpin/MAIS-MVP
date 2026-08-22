import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import { installCaliforniaCanvasTextAudit } from "./california-canvas-text-audit";
import {
  CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PROOF_BYTES,
  assertCaliforniaCanvasGraphicsStateEvidence,
  collectCaliforniaCanvasGraphicsStateEvidence,
  consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence,
  installCaliforniaCanvasGraphicsRuntime,
  registerCaliforniaCanvasGraphicsEvidenceForContrast,
  verifyCaliforniaCanvasGraphicsStateEvidence,
  waitForCaliforniaCanvasGraphicsSettled
} from "./california-canvas-graphics-runtime";
import {
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasTerminalOperation
} from "./california-canvas-graphics-source-contract";
import * as signatureExhaustiveQa from "./california-signature-exhaustive-qa";

type BrowserGraphicsApi = {
  cancelAnimationFrame(benchId: string, handle: number): void;
  collect(
    root: HTMLElement,
    request: { benchId: string; stateKey: string; surfaceKey: string }
  ): Promise<unknown>;
  invoke(
    sourceSiteKey: string,
    context: CanvasRenderingContext2D,
    operation: CaliforniaCanvasTerminalOperation,
    thunk: () => unknown
  ): unknown;
  registerContext(bindingKey: string, context: CanvasRenderingContext2D | null): CanvasRenderingContext2D;
  requestAnimationFrame(benchId: string, callback: FrameRequestCallback): number;
  settlement(benchId: string): {
    activityAgeMs: number;
    latestSettledRafEpoch: number;
    pendingRafCount: number;
    registeredCanvasCount: number;
    signature: string;
  };
  takeContrastConsumeAck(
    root: HTMLElement,
    request: {
      evidenceSha256: string;
      receiptId: string;
      runtimeRunId: string;
      stateKey: string;
      surfaceKey: string;
    }
  ): Promise<unknown>;
};

type BrowserAuditApi = {
  contrastSurfaceOutcomes(root: HTMLElement, options?: { canvasSelector?: string }): Array<{
    hasExecutableNonTextEvidence: boolean;
    unsupportedReasons: string[];
  }>;
};

type GraphicsWindow = Window & {
  __californiaCanvasGraphicsRuntime?: BrowserGraphicsApi;
  __californiaCanvasTextAudit?: BrowserAuditApi;
  __canvasNativeFontFamilySetter?: (this: FontFace, value: string) => void;
  __canvasPaintEnvironmentFontFace?: FontFace;
};

const contract = buildCaliforniaCanvasGraphicsSourceContract();
const benchId = "AddLab";
const bindingKey = contract.bindings.find((binding) => String(binding.benchId) === benchId)!.key;
const sitesByOperation = Object.fromEntries(
  (["fill", "stroke", "fillRect", "strokeRect"] as const).map((operation) => {
    const site = contract.paintSites.find((candidate) =>
      String(candidate.benchId) === benchId &&
      candidate.role === "essential" &&
      candidate.operation === operation
    );
    if (!site) throw new Error(`AddLab has no essential ${operation} source site`);
    return [operation, site.sourceSiteKey];
  })
) as Record<CaliforniaCanvasTerminalOperation, string>;

async function newInstrumentedPage(browser: Browser, url: string, runtimeRunId?: string) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 720, width: 960 }
  });
  await installCaliforniaCanvasTextAudit(page);
  await installCaliforniaCanvasGraphicsRuntime(page, { benchIds: [benchId], contract, runtimeRunId });
  await page.goto(url);
  return page;
}

async function installHappySurface(page: Page) {
  await page.evaluate(async ({ selectedBenchId, selectedBindingKey, selectedSites }) => {
    const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime;
    if (!runtime) throw new Error("graphics runtime missing");
    document.body.style.margin = "0";
    const surface = document.createElement("section");
    surface.id = "happy";
    surface.dataset.vizSurfaceKind = "signature-canvas";
    surface.dataset.vizSurface = "true";
    surface.dataset.vizMarkCount = "4";
    surface.style.cssText = [
      "background:#fbfbf8",
      "color-scheme:light",
      "display:block",
      "padding:8px",
      "width:180px"
    ].join(";");
    const canvas = document.createElement("canvas");
    canvas.dataset.vizMark = "true";
    canvas.width = 180;
    canvas.height = 110;
    canvas.style.cssText = "display:block;width:180px;height:110px";
    surface.append(canvas);
    const learnerLabel = document.createElement("p");
    learnerLabel.textContent = "Canvas model";
    learnerLabel.style.cssText = "color:#111827;font:600 16px sans-serif;margin:4px 0 0";
    surface.append(learnerLabel);
    document.body.append(surface);
    const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
    context.clearRect(0, 0, canvas.width, canvas.height);

    await new Promise<void>((resolve) => {
      runtime.requestAnimationFrame(selectedBenchId, () => {
        context.save();
        context.translate(4, 3);
        context.beginPath();
        context.rect(8, 8, 52, 38);
        context.clip();
        const gradient = context.createLinearGradient(8, 8, 60, 46);
        gradient.addColorStop(0, "#111827");
        gradient.addColorStop(1, "#1e3a5f");
        context.fillStyle = gradient;
        context.beginPath();
        context.rect(6, 6, 58, 44);
        runtime.invoke(selectedSites.fill, context, "fill", () => context.fill());
        context.restore();

        context.globalAlpha = 0.92;
        context.shadowColor = "rgba(17, 24, 39, 0.65)";
        context.shadowBlur = 3;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.fillStyle = "#111827";
        runtime.invoke(
          selectedSites.fillRect,
          context,
          "fillRect",
          () => context.fillRect(88, 12, 44, 30)
        );

        context.globalAlpha = 1;
        context.shadowColor = "rgba(0, 0, 0, 0)";
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.strokeStyle = "#111827";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(14, 72);
        context.lineTo(62, 86);
        runtime.invoke(selectedSites.stroke, context, "stroke", () => context.stroke());

        context.lineWidth = 3;
        runtime.invoke(
          selectedSites.strokeRect,
          context,
          "strokeRect",
          () => context.strokeRect(90, 64, 46, 30)
        );
        resolve();
      });
    });
  }, {
    selectedBenchId: benchId,
    selectedBindingKey: bindingKey,
    selectedSites: sitesByOperation
  });
}

async function installNegativeSurface(
  page: Page,
  options: {
    authoredGetImageData?: boolean;
    clear?: "full" | "none" | "partial";
    fillStyle?: string;
    id: string;
    paper?: string;
    size?: number;
    unsupportedComposite?: boolean;
  }
) {
  await page.evaluate(({ selectedBindingKey, selectedSite, scenario }) => {
    const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime;
    if (!runtime) throw new Error("graphics runtime missing");
    const surface = document.createElement("section");
    surface.id = scenario.id;
    surface.dataset.vizSurfaceKind = "signature-canvas";
    surface.style.cssText = `background:${scenario.paper ?? "#fbfbf8"};color-scheme:light;padding:4px;width:80px`;
    const canvas = document.createElement("canvas");
    canvas.dataset.vizMark = "true";
    canvas.width = 80;
    canvas.height = 60;
    canvas.style.cssText = "display:block;width:80px;height:60px";
    surface.append(canvas);
    document.body.append(surface);
    const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
    if (scenario.clear === "full" || scenario.clear == null) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    } else if (scenario.clear === "partial") {
      context.clearRect(0, 0, canvas.width - 1, canvas.height - 1);
    }
    if (scenario.authoredGetImageData) context.getImageData(0, 0, 1, 1);
    if (scenario.unsupportedComposite) context.globalCompositeOperation = "multiply";
    context.fillStyle = scenario.fillStyle ?? "#111827";
    const size = scenario.size ?? 24;
    runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(12, 12, size, size));
  }, {
    scenario: options,
    selectedBindingKey: bindingKey,
    selectedSite: sitesByOperation.fillRect
  });
}

type FinalCompositorCanary =
  | "sibling-partial"
  | "pseudo-before"
  | "pseudo-after"
  | "img-cover"
  | "static-default-image"
  | "static-grid-cover"
  | "overflow-clip"
  | "clip-path"
  | "mask"
  | "opacity"
  | "filter";

async function installFinalCompositorCanary(page: Page, canary: FinalCompositorCanary) {
  await page.evaluate(async ({ kind, sourceSiteKey }) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    const canvas = surface.querySelector<HTMLCanvasElement>("canvas")!;
    surface.style.position = "relative";
    const overlayStyle = [
      "pointer-events:none",
      "z-index:20",
      "width:180px",
      "height:110px"
    ];
    const positionedOverlay = () => {
      const overlay = document.createElement("div");
      overlay.style.cssText = [
        ...overlayStyle,
        "position:absolute",
        "left:8px",
        "top:8px"
      ].join(";");
      surface.append(overlay);
      return overlay;
    };
    if (kind === "sibling-partial") {
      const overlay = positionedOverlay();
      overlay.style.width = "90px";
      overlay.style.background = "#fbfbf8";
    } else if (kind === "pseudo-before" || kind === "pseudo-after") {
      const host = positionedOverlay();
      host.id = `pseudo-host-${kind}`;
      const style = document.createElement("style");
      const pseudo = kind === "pseudo-before" ? "before" : "after";
      style.textContent = `#${host.id}::${pseudo}{content:"";position:absolute;inset:0;background:#fbfbf8}`;
      document.head.append(style);
    } else if (kind === "img-cover" || kind === "static-default-image") {
      const image = document.createElement("img");
      image.alt = "";
      image.style.cssText = [
        ...overlayStyle,
        "position:absolute",
        "left:8px",
        "top:8px",
        "background:#fbfbf8"
      ].join(";");
      image.src = kind === "img-cover"
        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='110'%3E%3Crect width='180' height='110' fill='%23fbfbf8'/%3E%3C/svg%3E"
        : canvas.toDataURL("image/png");
      surface.append(image);
      await image.decode();
      if (kind === "static-default-image") {
        const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#7c2d12";
        runtime.invoke(sourceSiteKey, context, "fillRect", () =>
          context.fillRect(142, 76, 28, 25)
        );
      }
    } else if (kind === "static-grid-cover") {
      surface.style.display = "grid";
      surface.style.gridTemplateColumns = "180px";
      canvas.style.gridArea = "1 / 1";
      const label = surface.querySelector("p");
      if (label) label.setAttribute("style",
        `${label.getAttribute("style") ?? ""};grid-column:1;grid-row:2`);
      const overlay = document.createElement("div");
      overlay.style.cssText = [
        ...overlayStyle,
        "grid-area:1 / 1",
        "background:#fbfbf8"
      ].join(";");
      surface.insertBefore(overlay, label);
    } else if (kind === "overflow-clip") {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "width:90px;height:110px;overflow:hidden";
      canvas.replaceWith(wrapper);
      wrapper.append(canvas);
    } else if (kind === "clip-path") {
      canvas.style.clipPath = "inset(0 50% 0 0)";
    } else if (kind === "mask") {
      const overlay = positionedOverlay();
      overlay.style.background = "#fbfbf8";
      overlay.style.maskImage = "linear-gradient(90deg,#000 0 50%,transparent 50% 100%)";
      (overlay.style as CSSStyleDeclaration & { webkitMaskImage: string }).webkitMaskImage =
        "linear-gradient(90deg,#000 0 50%,transparent 50% 100%)";
    } else if (kind === "opacity") {
      const overlay = positionedOverlay();
      overlay.style.width = "90px";
      overlay.style.background = "#fbfbf8";
      overlay.style.opacity = "0.65";
    } else if (kind === "filter") {
      const overlay = positionedOverlay();
      overlay.style.width = "90px";
      overlay.style.background = "#134e4a";
      overlay.style.filter = "invert(1)";
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  }, { kind: canary, sourceSiteKey: sitesByOperation.fillRect });
}

type FinalCompositorRace =
  | "source"
  | "layout"
  | "overlay"
  | "text"
  | "img-src"
  | "sibling-canvas"
  | "closed-shadow";

async function installFinalCompositorRaceFixture(page: Page, race: FinalCompositorRace) {
  await page.evaluate(async (kind) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    surface.style.position = "relative";
    if (kind === "text") {
      const text = document.createElement("div");
      text.id = "race-text";
      text.textContent = "baseline";
      text.style.cssText = [
        "position:absolute",
        "left:8px",
        "top:8px",
        "width:180px",
        "height:110px",
        "color:#fbfbf8",
        "font:16px sans-serif",
        "pointer-events:none"
      ].join(";");
      surface.append(text);
    } else if (kind === "img-src") {
      const image = document.createElement("img");
      image.id = "race-image";
      image.alt = "";
      image.style.cssText =
        "position:absolute;left:8px;top:8px;width:180px;height:110px;pointer-events:none";
      image.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='110'%3E%3C/svg%3E";
      surface.append(image);
      await image.decode();
    } else if (kind === "sibling-canvas") {
      const sibling = document.createElement("canvas");
      sibling.id = "race-sibling-canvas";
      sibling.width = 180;
      sibling.height = 110;
      sibling.style.cssText =
        "position:absolute;left:8px;top:8px;width:180px;height:110px;pointer-events:none";
      surface.append(sibling);
    } else if (kind === "closed-shadow") {
      class RaceShadowHost extends HTMLElement {
        readonly mutateRacePaint: () => void;
        constructor() {
          super();
          const shadow = this.attachShadow({ mode: "closed" });
          const cover = document.createElement("div");
          cover.style.cssText = "width:180px;height:110px;background:transparent";
          shadow.append(cover);
          this.mutateRacePaint = () => {
            cover.style.background = "#fbfbf8";
          };
        }
      }
      if (!customElements.get("race-shadow-host")) {
        customElements.define("race-shadow-host", RaceShadowHost);
      }
      const host = document.createElement("race-shadow-host");
      host.id = "race-shadow-host";
      host.style.cssText =
        "display:block;position:absolute;left:8px;top:8px;width:180px;height:110px;pointer-events:none";
      surface.append(host);
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  }, race);
}

async function mutateFinalCompositorAfterScreenshot(page: Page, race: FinalCompositorRace) {
  await page.evaluate(({ kind, sourceSiteKey }) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    const canvas = surface.querySelector<HTMLCanvasElement>("canvas[data-viz-mark]")!;
    if (kind === "source") {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#7c2d12";
      runtime.invoke(sourceSiteKey, context, "fillRect", () =>
        context.fillRect(145, 78, 24, 22)
      );
    } else if (kind === "layout") {
      canvas.style.transform = "translateX(7px)";
    } else if (kind === "overlay") {
      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:absolute;left:8px;top:8px;width:180px;height:110px;background:#fbfbf8;z-index:30";
      surface.append(overlay);
    } else if (kind === "text") {
      document.querySelector("#race-text")!.firstChild!.textContent = "changed-after-screenshot";
    } else if (kind === "img-src") {
      (document.querySelector("#race-image") as HTMLImageElement).src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='110'%3E%3Crect width='180' height='110' fill='%23fbfbf8'/%3E%3C/svg%3E";
    } else if (kind === "sibling-canvas") {
      const sibling = document.querySelector<HTMLCanvasElement>("#race-sibling-canvas")!;
      const context = sibling.getContext("2d")!;
      context.fillStyle = "#fbfbf8";
      context.fillRect(0, 0, sibling.width, sibling.height);
    } else if (kind === "closed-shadow") {
      (document.querySelector("#race-shadow-host") as HTMLElement & {
        mutateRacePaint(): void;
      }).mutateRacePaint();
    }
  }, { kind: race, sourceSiteKey: sitesByOperation.fillRect });
}

type PaintEnvironmentRace =
  | "animation"
  | "cssom"
  | "focus"
  | "fullscreen"
  | "media"
  | "scroll"
  | "view-transition"
  | "viewport";

async function installPaintEnvironmentRaceFixture(page: Page, race: PaintEnvironmentRace) {
  await page.evaluate(async (kind) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    surface.style.position = "relative";
    const cover = document.createElement("div");
    cover.id = `${kind}-environment-cover`;
    cover.style.cssText = [
      "position:absolute",
      "left:8px",
      "top:8px",
      "width:180px",
      "height:110px",
      "background:#fbfbf8",
      "z-index:99",
      "pointer-events:none"
    ].join(";");
    surface.append(cover);

    if (kind === "cssom") {
      const style = document.createElement("style");
      style.id = "environment-cssom-rule";
      style.textContent = "#cssom-environment-cover{background:#fbfbf8}";
      document.head.append(style);
      cover.style.background = "";
    } else if (kind === "scroll") {
      const spacer = document.createElement("div");
      spacer.style.height = "600px";
      document.body.insertBefore(spacer, surface);
      const tail = document.createElement("div");
      tail.style.height = "900px";
      document.body.append(tail);
      cover.remove();
      cover.style.position = "fixed";
      document.body.append(cover);
      scrollTo(0, surface.offsetTop);
      (window as Window & { __canvasEnvironmentInitialScroll?: number })
        .__canvasEnvironmentInitialScroll = scrollY;
    } else if (kind === "animation") {
      const animation = cover.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 1_000,
        fill: "both"
      });
      animation.pause();
      animation.currentTime = 0;
      (window as Window & { __canvasEnvironmentAnimation?: Animation })
        .__canvasEnvironmentAnimation = animation;
    } else if (kind === "focus") {
      for (const id of ["environment-focus-original", "environment-focus-suppress"]) {
        const button = document.createElement("button");
        button.id = id;
        button.textContent = id;
        button.style.cssText = "position:fixed;left:500px;top:500px";
        document.body.insertBefore(button, surface);
      }
      const style = document.createElement("style");
      style.textContent =
        "#environment-focus-suppress:focus~#happy #focus-environment-cover{display:none!important}";
      document.head.append(style);
      document.querySelector<HTMLElement>("#environment-focus-original")!.focus();
    } else if (kind === "viewport") {
      const style = document.createElement("style");
      style.textContent =
        "@media(max-width:800px){#viewport-environment-cover{display:none!important}}";
      document.head.append(style);
    } else if (kind === "media") {
      const style = document.createElement("style");
      style.textContent =
        "@media print{#media-environment-cover{display:none!important}}";
      document.head.append(style);
    } else if (kind === "fullscreen") {
      const toggle = document.createElement("button");
      toggle.id = "environment-fullscreen-toggle";
      toggle.textContent = "fullscreen";
      toggle.style.cssText = "position:fixed;left:500px;top:500px";
      toggle.addEventListener("click", () => void document.documentElement.requestFullscreen());
      document.body.append(toggle);
      const style = document.createElement("style");
      style.textContent =
        ":fullscreen #fullscreen-environment-cover{display:none!important}";
      document.head.append(style);
    } else if (kind === "view-transition") {
      cover.style.viewTransitionName = "canvas-environment-cover";
      const style = document.createElement("style");
      style.textContent = [
        "::view-transition-group(canvas-environment-cover){display:none!important}",
        "::view-transition-group(root){animation-duration:30s!important}",
        "::view-transition-old(root){animation-duration:30s!important}",
        "::view-transition-new(root){animation-duration:30s!important}"
      ].join("");
      document.head.append(style);
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  }, race);
}

async function changePaintEnvironmentForScreenshot(
  page: Page,
  race: PaintEnvironmentRace,
  phase: "hide" | "restore"
) {
  if (race === "viewport") {
    await page.setViewportSize({ height: 720, width: phase === "hide" ? 700 : 960 });
    return;
  }
  if (race === "media") {
    await page.emulateMedia({ media: phase === "hide" ? "print" : "screen" });
    return;
  }
  if (race === "focus") {
    await page.locator(
      phase === "hide" ? "#environment-focus-suppress" : "#environment-focus-original"
    ).focus();
    return;
  }
  if (race === "fullscreen") {
    if (phase === "hide") {
      await page.locator("#environment-fullscreen-toggle").click();
      await page.waitForFunction(() => document.fullscreenElement !== null);
    } else {
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => document.fullscreenElement === null);
    }
    return;
  }
  if (race === "view-transition") {
    await page.evaluate(async (selectedPhase) => {
      const transitionWindow = window as Window & {
        __canvasEnvironmentViewTransition?: ViewTransition;
      };
      if (selectedPhase === "hide") {
        if (typeof document.startViewTransition !== "function") {
          throw new Error("Document.startViewTransition unavailable");
        }
        const transition = document.startViewTransition(() => undefined);
        transitionWindow.__canvasEnvironmentViewTransition = transition;
        await transition.ready;
      } else {
        const transition = transitionWindow.__canvasEnvironmentViewTransition;
        if (!transition) throw new Error("Canvas environment View Transition missing");
        transition.skipTransition();
        await transition.finished;
      }
    }, phase);
    return;
  }
  await page.evaluate(({ kind, selectedPhase }) => {
    if (kind === "cssom") {
      const sheet = (document.querySelector("#environment-cssom-rule") as HTMLStyleElement).sheet!;
      (sheet.cssRules[0] as CSSStyleRule).style.background =
        selectedPhase === "hide" ? "transparent" : "#fbfbf8";
    } else if (kind === "scroll") {
      const initial = (window as unknown as Window & { __canvasEnvironmentInitialScroll: number })
        .__canvasEnvironmentInitialScroll;
      scrollTo(0, selectedPhase === "hide" ? 0 : initial);
    } else if (kind === "animation") {
      (window as unknown as Window & { __canvasEnvironmentAnimation: Animation })
        .__canvasEnvironmentAnimation.currentTime = selectedPhase === "hide" ? 1_000 : 0;
    }
  }, { kind: race, selectedPhase: phase });
}

function exactPaintEnvironmentDriftKind(
  expectedKind: Exclude<PaintEnvironmentRace, "view-transition">
) {
  return (error: unknown) => {
    const message = String(error);
    const match = message.match(
      /california-canvas-final-compositor-paint-environment-drift:kinds=([a-z+]+)/
    );
    assert.ok(match, `missing structured paint-environment drift error: ${message}`);
    assert.ok(
      match[1]!.split("+").includes(expectedKind),
      `expected exact ${expectedKind} drift kind, received ${match[1]}: ${message}`
    );
    return true;
  };
}

type CssomEnvironmentRace =
  | "adopted-style-sheets"
  | "delete-rule"
  | "media-list"
  | "selector-text"
  | "style-disabled"
  | "typed-om";

async function installCssomEnvironmentRaceFixture(page: Page, race: CssomEnvironmentRace) {
  await page.evaluate((kind) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    surface.style.position = "relative";
    const cover = document.createElement("div");
    cover.id = "cssom-extended-cover";
    cover.style.cssText = [
      "position:absolute",
      "left:8px",
      "top:8px",
      "width:180px",
      "height:110px",
      "z-index:99",
      "pointer-events:none"
    ].join(";");
    surface.append(cover);
    if (kind === "adopted-style-sheets") {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync("#cssom-extended-cover{background:#fbfbf8}");
      const original = [...document.adoptedStyleSheets];
      document.adoptedStyleSheets = [...original, sheet];
      (window as Window & {
        __canvasCssomAdopted?: { original: CSSStyleSheet[]; sheet: CSSStyleSheet };
      }).__canvasCssomAdopted = { original, sheet };
      return;
    }
    const style = document.createElement("style");
    style.id = "cssom-extended-style";
    style.textContent = kind === "media-list"
      ? "@media screen{#cssom-extended-cover{background:#fbfbf8}}"
      : "#cssom-extended-cover{background:#fbfbf8}";
    document.head.append(style);
  }, race);
}

async function changeCssomEnvironmentForScreenshot(
  page: Page,
  race: CssomEnvironmentRace,
  phase: "hide" | "restore"
) {
  await page.evaluate(({ kind, selectedPhase }) => {
    const hiding = selectedPhase === "hide";
    if (kind === "adopted-style-sheets") {
      const state = (window as unknown as Window & {
        __canvasCssomAdopted: { original: CSSStyleSheet[]; sheet: CSSStyleSheet };
      }).__canvasCssomAdopted;
      document.adoptedStyleSheets = hiding ? state.original : [...state.original, state.sheet];
      return;
    }
    const style = document.querySelector<HTMLStyleElement>("#cssom-extended-style")!;
    const sheet = style.sheet!;
    if (kind === "media-list") {
      (sheet.cssRules[0] as CSSMediaRule).media.mediaText = hiding ? "print" : "screen";
    } else if (kind === "delete-rule") {
      if (hiding) sheet.deleteRule(0);
      else sheet.insertRule("#cssom-extended-cover{background:#fbfbf8}", 0);
    } else if (kind === "selector-text") {
      (sheet.cssRules[0] as CSSStyleRule).selectorText =
        hiding ? "#cssom-extended-cover-hidden" : "#cssom-extended-cover";
    } else if (kind === "style-disabled") {
      style.disabled = hiding;
    } else if (kind === "typed-om") {
      const rule = sheet.cssRules[0] as CSSStyleRule & {
        styleMap: { set(property: string, value: string): void };
      };
      rule.styleMap.set("background", hiding ? "transparent" : "#fbfbf8");
    }
  }, { kind: race, selectedPhase: phase });
}

type StateEnvironmentRace =
  | "checked"
  | "hash-target"
  | "popover"
  | "sibling-canvas"
  | "value";

async function installStateEnvironmentRaceFixture(page: Page, race: StateEnvironmentRace) {
  await page.evaluate((kind) => {
    const surface = document.querySelector<HTMLElement>("#happy")!;
    surface.style.position = "relative";
    if (kind === "sibling-canvas") {
      const cover = document.createElement("canvas");
      cover.id = "state-environment-canvas-cover";
      cover.width = 180;
      cover.height = 110;
      cover.style.cssText =
        "position:absolute;left:8px;top:8px;width:180px;height:110px;z-index:99;pointer-events:none";
      surface.append(cover);
      const context = cover.getContext("2d")!;
      context.fillStyle = "#fbfbf8";
      context.fillRect(0, 0, cover.width, cover.height);
      return;
    }
    const cover = document.createElement("div");
    cover.id = "state-environment-cover";
    cover.style.cssText = [
      "position:absolute",
      "left:8px",
      "top:8px",
      "width:180px",
      "height:110px",
      "background:#fbfbf8",
      "z-index:99",
      "pointer-events:none"
    ].join(";");
    surface.append(cover);
    const style = document.createElement("style");
    if (kind === "checked") {
      const input = document.createElement("input");
      input.id = "state-environment-checked";
      input.type = "checkbox";
      input.style.cssText = "position:fixed;left:500px;top:500px";
      document.body.insertBefore(input, surface);
      style.textContent =
        "body:has(#state-environment-checked:checked) #state-environment-cover{display:none!important}";
    } else if (kind === "value") {
      const input = document.createElement("input");
      input.id = "state-environment-value";
      input.placeholder = "empty";
      input.value = "persistent";
      input.style.cssText = "position:fixed;left:500px;top:500px";
      document.body.insertBefore(input, surface);
      style.textContent =
        "body:has(#state-environment-value:placeholder-shown) #state-environment-cover{display:none!important}";
    } else if (kind === "popover") {
      const popover = document.createElement("div");
      popover.id = "state-environment-popover";
      popover.popover = "manual";
      popover.textContent = "popover";
      document.body.append(popover);
      style.textContent =
        "body:has(#state-environment-popover:popover-open) #state-environment-cover{display:none!important}";
    } else if (kind === "hash-target") {
      const target = document.createElement("div");
      target.id = "state-environment-target";
      document.body.append(target);
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      style.textContent =
        "body:has(#state-environment-target:target) #state-environment-cover{display:none!important}";
    }
    document.head.append(style);
  }, race);
}

async function changeStateEnvironmentForScreenshot(
  page: Page,
  race: StateEnvironmentRace,
  phase: "hide" | "restore"
) {
  await page.evaluate(({ kind, selectedPhase }) => {
    const hiding = selectedPhase === "hide";
    if (kind === "checked") {
      document.querySelector<HTMLInputElement>("#state-environment-checked")!.checked = hiding;
    } else if (kind === "value") {
      document.querySelector<HTMLInputElement>("#state-environment-value")!.value =
        hiding ? "" : "persistent";
    } else if (kind === "popover") {
      const popover = document.querySelector<HTMLElement>("#state-environment-popover")!;
      if (hiding) popover.showPopover();
      else popover.hidePopover();
    } else if (kind === "hash-target") {
      if (hiding) location.hash = "#state-environment-target";
      else history.replaceState(null, "", `${location.pathname}${location.search}`);
    } else if (kind === "sibling-canvas") {
      const canvas = document.querySelector<HTMLCanvasElement>(
        "#state-environment-canvas-cover"
      )!;
      const context = canvas.getContext("2d")!;
      if (hiding) context.clearRect(0, 0, canvas.width, canvas.height);
      else {
        context.fillStyle = "#fbfbf8";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, { kind: race, selectedPhase: phase });
}

test("real Chromium proves exact Canvas source replay, raster contrast and fail-closed negatives", {
  timeout: 45_000
}, async (t) => {
  let browser: Browser | undefined;
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><meta charset=utf-8><title>California Canvas graphics runtime</title>");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  ));
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const address = server.address() as AddressInfo;
  const pageUrl = `http://127.0.0.1:${address.port}/`;

  await t.test("the exhaustive one-shot gate scans the exact graphics root and parent DOM/SVG audit skips Canvas", async () => {
    const runtimeRunId = "ca-exact-root-browser-0123456789abcdef";
    const gatePage = await newInstrumentedPage(browser, pageUrl, runtimeRunId);
    await installHappySurface(gatePage);
    const body = gatePage.locator("body");
    const graphicsSurface = gatePage.locator("#happy");
    const initialParentSettle = await signatureExhaustiveQa
      .settleCaliforniaSignatureDomSvgForContrast(body);

    const parentContrast = await signatureExhaustiveQa.californiaSignatureContrastProvider.audit(
      body,
      { benchId, state: "exact-root-parent", viewport: "desktop" },
      { auditCanvases: false }
    );
    assert.equal(
      parentContrast.evidence.filter((item) => item.kind.startsWith("canvas-")).length,
      0,
      "the parent DOM/SVG pass must not perform a second Canvas scan"
    );

    const gated = await signatureExhaustiveQa.runCaliforniaCanvasGraphicsOneShotGate({
      benchId,
      contrastProvider: signatureExhaustiveQa.californiaSignatureContrastProvider,
      graphicsSurface,
      runtimeRunId,
      state: "exact-root-gate",
      viewport: "desktop"
    });
    assert.equal(gated.canvasGraphicsEvidence.canvases.length, 1);
    assert.equal(gated.canvasGraphicsContrastAck.canvases.length, 1);
    assert.equal(gated.canvasGraphicsNodeAck.consumed, true);
    assert.equal(gated.canvasGraphicsContrastAck.receiptId, gated.canvasGraphicsEvidence.receiptId);
    assert.equal(gated.canvasGraphicsNodeAck.receiptId, gated.canvasGraphicsEvidence.receiptId);
    assert.equal(gated.canvasGraphicsEvidence.runtimeRunId, runtimeRunId);
    assert.equal(gated.canvasGraphicsContrastAck.runtimeRunId, runtimeRunId);
    assert.equal(gated.canvasGraphicsNodeAck.runtimeRunId, runtimeRunId);

    const finalParentSettle = await signatureExhaustiveQa
      .settleCaliforniaSignatureDomSvgForContrast(body);
    assert.deepEqual(
      finalParentSettle.layoutSettleEvidence,
      initialParentSettle.layoutSettleEvidence,
      "exact-root Canvas consume and parent DOM/SVG audit must preserve parent settle evidence"
    );
    await gatePage.close();
  });

  await t.test("an opaque sibling cannot cover a valid internal Canvas raster and still yield an ACK", async () => {
    const coveredPage = await newInstrumentedPage(browser, pageUrl);
    await installNegativeSurface(coveredPage, { id: "covered-by-sibling" });
    await coveredPage.evaluate(() => {
      const surface = document.querySelector<HTMLElement>("#covered-by-sibling")!;
      surface.style.position = "relative";
      const cover = document.createElement("div");
      cover.id = "opaque-sibling-cover";
      cover.style.cssText = [
        "position:absolute",
        "z-index:10",
        "left:4px",
        "top:4px",
        "width:80px",
        "height:60px",
        "background:#fbfbf8"
      ].join(";");
      surface.append(cover);
    });
    const root = coveredPage.locator("#covered-by-sibling");
    const coveredEvidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root,
      stateKey: "covered-by-sibling",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    assert.deepEqual(verifyCaliforniaCanvasGraphicsStateEvidence(coveredEvidence, {
      benchId,
      capturedUrl: coveredPage.url(),
      stateKey: "covered-by-sibling",
      surfaceKey: "signature-canvas"
    }, contract), [], "the hard negative must reach the final-compositor boundary");
    await registerCaliforniaCanvasGraphicsEvidenceForContrast({
      contract,
      evidence: coveredEvidence,
      root
    });
    const outcomes = await root.evaluate((element) =>
      (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
        element as HTMLElement
      ).map((outcome) => outcome.hasExecutableNonTextEvidence)
    );
    assert.deepEqual(outcomes, [true], "the internal contrast provider is intentionally valid");
    await assert.rejects(
      consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
        benchId,
        contract,
        evidence: coveredEvidence,
        root,
        runtimeRunId: coveredEvidence.runtimeRunId,
        stateKey: coveredEvidence.stateKey,
        surfaceKey: coveredEvidence.surfaceKey
      }),
      /final-compositor-(?:comparison|mismatch|rejected)/
    );
    await coveredPage.close();
  });

  for (const canary of [
    "sibling-partial",
    "pseudo-before",
    "pseudo-after",
    "img-cover",
    "static-default-image",
    "static-grid-cover",
    "overflow-clip",
    "clip-path",
    "mask",
    "opacity",
    "filter"
  ] as const) {
    await t.test(`${canary} cannot diverge from the internal-on-paper reference`, async () => {
      const canaryPage = await newInstrumentedPage(browser, pageUrl);
      await installHappySurface(canaryPage);
      await installFinalCompositorCanary(canaryPage, canary);
      const root = canaryPage.locator("#happy");
      const canaryEvidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root,
        stateKey: canary,
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      assert.deepEqual(verifyCaliforniaCanvasGraphicsStateEvidence(canaryEvidence, {
        benchId,
        capturedUrl: canaryPage.url(),
        stateKey: canary,
        surfaceKey: "signature-canvas"
      }, contract), [], `${canary} must isolate the page compositor boundary`);
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({
        contract,
        evidence: canaryEvidence,
        root
      });
      const outcomes = await root.evaluate((element) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          element as HTMLElement
        ).map((outcome) => outcome.hasExecutableNonTextEvidence)
      );
      assert.deepEqual(outcomes, [true], `${canary} must retain valid internal evidence`);
      await assert.rejects(
        consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
          benchId,
          contract,
          evidence: canaryEvidence,
          root,
          runtimeRunId: canaryEvidence.runtimeRunId,
          stateKey: canaryEvidence.stateKey,
          surfaceKey: canaryEvidence.surfaceKey
        }),
        /final-compositor/
      );
      await canaryPage.close();
    });
  }

  for (const race of [
    "source",
    "layout",
    "overlay",
    "text",
    "img-src",
    "sibling-canvas",
    "closed-shadow"
  ] as const) {
    await t.test(`${race} mutation after the native page screenshot invalidates the receipt`, async () => {
      const racePage = await newInstrumentedPage(browser, pageUrl);
      await installHappySurface(racePage);
      await installFinalCompositorRaceFixture(racePage, race);
      const root = racePage.locator("#happy");
      const raceEvidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root,
        stateKey: `race-${race}`,
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      assert.deepEqual(verifyCaliforniaCanvasGraphicsStateEvidence(raceEvidence, {
        benchId,
        capturedUrl: racePage.url(),
        stateKey: `race-${race}`,
        surfaceKey: "signature-canvas"
      }, contract), []);
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({
        contract,
        evidence: raceEvidence,
        root
      });
      const outcomes = await root.evaluate((element) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          element as HTMLElement,
          { canvasSelector: "canvas[data-viz-mark]" }
        ).map((outcome) => outcome.hasExecutableNonTextEvidence)
      );
      assert.deepEqual(outcomes, [true]);
      const nativeScreenshot = racePage.screenshot.bind(racePage);
      racePage.screenshot = async (options) => {
        const png = await nativeScreenshot(options);
        await mutateFinalCompositorAfterScreenshot(racePage, race);
        return png;
      };
      try {
        await assert.rejects(
          consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
            benchId,
            contract,
            evidence: raceEvidence,
            root,
            runtimeRunId: raceEvidence.runtimeRunId,
            stateKey: raceEvidence.stateKey,
            surfaceKey: raceEvidence.surfaceKey
          }),
          /final-compositor|contrast-consume-ack-stale|capture-fence|source-revision|terminal-raster/
        );
      } finally {
        racePage.screenshot = nativeScreenshot;
        await racePage.close();
      }
    });
  }

  await t.test(
    "a transient same-value-restored mutation during prepare hashing invalidates capture",
    async () => {
      const prepareRacePage = await newInstrumentedPage(browser, pageUrl);
      await installHappySurface(prepareRacePage);
      await prepareRacePage.evaluate(() => {
        const surface = document.querySelector<HTMLElement>("#happy")!;
        const text = document.createElement("div");
        text.id = "prepare-race-text";
        text.style.cssText = [
          "position:absolute",
          "left:8px",
          "top:8px",
          "width:180px",
          "height:24px",
          "color:#fbfbf8",
          "pointer-events:none"
        ].join(";");
        text.append(document.createTextNode("stable-before-and-after"));
        surface.append(text);
      });
      const root = prepareRacePage.locator("#happy");
      const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root,
        stateKey: "prepare-microtask-race",
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
      const outcomes = await root.evaluate((element) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          element as HTMLElement,
          { canvasSelector: "canvas[data-viz-mark]" }
        ).map((outcome) => outcome.hasExecutableNonTextEvidence)
      );
      assert.deepEqual(outcomes, [true]);
      await prepareRacePage.evaluate(() => {
        const prototype = SubtleCrypto.prototype;
        const nativeDigest = prototype.digest;
        let mutated = false;
        prototype.digest = function(...args) {
          const result = nativeDigest.apply(this, args);
          if (!mutated) {
            mutated = true;
            queueMicrotask(() => {
              const node = document.querySelector("#prepare-race-text")!.firstChild!;
              node.textContent = "transient-during-prepare";
              node.textContent = "stable-before-and-after";
            });
          }
          return result;
        };
        (window as Window & { __restorePrepareRaceDigest?: () => void })
          .__restorePrepareRaceDigest = () => {
            prototype.digest = nativeDigest;
          };
      });
      try {
        await assert.rejects(
          consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
            benchId,
            contract,
            evidence,
            root,
            runtimeRunId: evidence.runtimeRunId,
            stateKey: evidence.stateKey,
            surfaceKey: evidence.surfaceKey
          }),
          /final-compositor-prepare-fence-drift:.*mutations=[1-9]/,
          "an equal final fence cannot erase an observed prepare-window mutation"
        );
      } finally {
        await prepareRacePage.evaluate(() => {
          (window as Window & { __restorePrepareRaceDigest?: () => void })
            .__restorePrepareRaceDigest?.();
        });
        await prepareRacePage.close();
      }
    }
  );

  for (const wrongRoot of ["parent", "child"] as const) {
    await t.test(`a ${wrongRoot} contrast root rejects the exact-root receipt and never yields an ACK`, async () => {
      const wrongRootPage = await newInstrumentedPage(
        browser,
        pageUrl,
        `ca-wrong-${wrongRoot}-root-0123456789abcdef`
      );
      await installHappySurface(wrongRootPage);
      const graphicsSurface = wrongRootPage.locator("#happy");
      const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root: graphicsSurface,
        stateKey: `wrong-${wrongRoot}-root`,
        surfaceKey: "signature-canvas",
        wait: { pollMs: 20, quietMs: 60, timeoutMs: 2_000 }
      });
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root: graphicsSurface });
      const scanRoot = wrongRoot === "parent"
        ? wrongRootPage.locator("body")
        : graphicsSurface.locator("canvas");
      const outcomes = await scanRoot.evaluate((root) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          root as HTMLElement
        ).map((outcome) => ({
          hasExecutableNonTextEvidence: outcome.hasExecutableNonTextEvidence,
          unsupportedReasons: outcome.unsupportedReasons
        }))
      );
      assert.equal(outcomes.length, 1);
      assert.equal(outcomes[0].hasExecutableNonTextEvidence, false);
      assert.match(outcomes[0].unsupportedReasons.join(" | "), /capture-root-drift/);
      await assert.rejects(
        consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
          benchId,
          contract,
          evidence,
          root: graphicsSurface,
          runtimeRunId: evidence.runtimeRunId,
          stateKey: evidence.stateKey,
          surfaceKey: evidence.surfaceKey
        }),
        /contrast-consume-ack-not-ready|contrast-consume-ack-stale/
      );
      await wrongRootPage.close();
    });
  }

  const page = await newInstrumentedPage(browser, pageUrl);
  await installHappySurface(page);
  const happy = page.locator("#happy");
  const settled = await waitForCaliforniaCanvasGraphicsSettled(happy, benchId, {
    pollMs: 20,
    quietMs: 60,
    timeoutMs: 2_000
  });
  assert.equal(settled.pendingRafCount, 0);
  assert.equal(settled.latestSettledRafEpoch, 1);
  const beforeReadback = await page.evaluate((selectedBenchId) =>
    (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!.settlement(selectedBenchId),
  benchId);
  const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
    benchId,
    root: happy,
    stateKey: "default",
    surfaceKey: "signature-canvas",
    wait: { pollMs: 20, quietMs: 60, timeoutMs: 2_000 }
  });
  const afterReadback = await page.evaluate((selectedBenchId) =>
    (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!.settlement(selectedBenchId),
  benchId);
  assert.equal(afterReadback.signature, beforeReadback.signature,
    "QA native readback must not advance the authored paint revision");
  assert.equal(evidence.sourceExpectedEssentialCount, 2_370);
  assert.equal(evidence.observedSourceSiteCount, 4);
  assert.deepEqual(evidence.observedSourceSiteKeys, Object.values(sitesByOperation).sort());
  assert.deepEqual(evidence.issues, []);
  assert.equal(evidence.canvases.length, 1);
  const happyCanvas = evidence.canvases[0];
  assert.deepEqual(happyCanvas.issues, []);
  assert.equal(happyCanvas.sourcePaintRevision, 4);
  assert.equal(happyCanvas.qaReadbackCount, 9);
  assert.equal(happyCanvas.qaReadbackMode, "native-existing-2d-context");
  assert.equal(happyCanvas.latestPaintRafEpoch, 1);
  assert.equal(happyCanvas.latestSettledRafEpoch, 1);
  assert.equal(happyCanvas.latestClearEpoch, 1);
  assert.equal(happyCanvas.latestClearWasFull, true);
  assert.ok(happyCanvas.minimumNumericNonTextContrastRatio >= 3);
  assert.ok(happyCanvas.roleConnectedCorePixelCount >= 16);
  assert.ok(happyCanvas.roleBackgroundNeighborPixelCount >= 4);
  assert.match(happyCanvas.terminalRasterSha256, /^[0-9a-f]{64}$/);
  assert.ok(happyCanvas.siteEvidence.some((site) =>
    site.operation === "fill" && site.paintServerKinds.includes("gradient:2-stops")
  ));
  assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
    benchId,
    capturedUrl: page.url(),
    stateKey: "default",
    surfaceKey: "signature-canvas"
  }, contract);

  await registerCaliforniaCanvasGraphicsEvidenceForContrast({ evidence, root: happy });
  await assert.rejects(
    consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
      benchId,
      contract,
      evidence,
      root: happy,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: "default",
      surfaceKey: "signature-canvas"
    }),
    /contrast-consume-ack-not-ready/
  );
  const firstLedgerRead = await happy.evaluate((root) =>
    (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(root as HTMLElement)
      .map((outcome) => ({
        hasExecutableNonTextEvidence: outcome.hasExecutableNonTextEvidence,
        unsupportedReasons: outcome.unsupportedReasons
      }))
  );
  assert.equal(firstLedgerRead.length, 1);
  assert.equal(firstLedgerRead[0].hasExecutableNonTextEvidence, true);
  assert.deepEqual(firstLedgerRead[0].unsupportedReasons, []);
  await assert.rejects(
    consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
      benchId,
      contract,
      evidence,
      root: page.locator("body"),
      runtimeRunId: evidence.runtimeRunId,
      stateKey: "default",
      surfaceKey: "signature-canvas"
    }),
    /contrast-consume-ack-identity-mismatch/
  );
  await assert.rejects(
    happy.evaluate((root, request) =>
      (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!.takeContrastConsumeAck(
        root as HTMLElement,
        request
      ), {
      evidenceSha256: evidence.evidenceSha256,
      receiptId: evidence.receiptId,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: "forged-state",
      surfaceKey: evidence.surfaceKey
    }),
    /contrast-consume-ack-identity-mismatch/
  );
  const ackedEvidence = await consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
    benchId,
    contract,
    evidence,
    root: happy,
    runtimeRunId: evidence.runtimeRunId,
    stateKey: "default",
    surfaceKey: "signature-canvas"
  });
  assert.equal(ackedEvidence.evidence.receiptId, evidence.receiptId);
  assert.equal(ackedEvidence.contrastConsumeAck.evidenceSha256, evidence.evidenceSha256);
  assert.equal(ackedEvidence.contrastConsumeAck.runtimeRunId, evidence.runtimeRunId);
  assert.equal(ackedEvidence.contrastConsumeAck.rootRuntimeId, evidence.rootRuntimeId);
  assert.equal(ackedEvidence.contrastConsumeAck.canvases.length, 1);
  assert.equal(
    ackedEvidence.contrastConsumeAck.canvases[0].canvasIdentity,
    evidence.canvases[0].canvasIdentity
  );
  assert.match(
    ackedEvidence.contrastConsumeAck.canvases[0].terminalPixelSnapshotSha256,
    /^[0-9a-f]{64}$/
  );
  const finalCompositor = ackedEvidence.contrastConsumeAck.canvases[0].finalCompositor;
  assert.equal(finalCompositor.version, 3);
  assert.equal(ackedEvidence.contrastConsumeAck.ackVersion, 4);
  assert.equal(finalCompositor.paintEnvironment.epoch,
    Object.values(finalCompositor.paintEnvironment.kindCounts)
      .reduce((sum, count) => sum + count, 0));
  assert.deepEqual(finalCompositor.paintEnvironment,
    ackedEvidence.contrastConsumeAck.paintEnvironment);
  assert.deepEqual(finalCompositor.backingSize, { height: 110, width: 180 });
  assert.deepEqual(finalCompositor.cssSize, { height: 110, width: 180 });
  assert.deepEqual(finalCompositor.clip, finalCompositor.canvasPageRect);
  assert.equal(finalCompositor.clip.width, 180);
  assert.equal(finalCompositor.clip.height, 110);
  assert.equal(finalCompositor.sourcePaintRevision, happyCanvas.sourcePaintRevision);
  assert.equal(finalCompositor.terminalRasterSha256, happyCanvas.terminalRasterSha256);
  assert.equal(finalCompositor.receiptId, evidence.receiptId);
  assert.equal(finalCompositor.evidenceSha256, evidence.evidenceSha256);
  assert.equal(finalCompositor.stateKey, "default");
  assert.equal(finalCompositor.capturedUrl, page.url());
  assert.equal(finalCompositor.layoutFenceAfterSha256,
    finalCompositor.layoutFenceBeforeSha256);
  assert.match(finalCompositor.reference.pngSha256, /^[0-9a-f]{64}$/);
  assert.match(finalCompositor.reference.rgbaSha256, /^[0-9a-f]{64}$/);
  assert.match(finalCompositor.compositor.pngSha256, /^[0-9a-f]{64}$/);
  assert.equal(finalCompositor.compositor.rgbaSha256,
    finalCompositor.reference.rgbaSha256);
  assert.equal(finalCompositor.comparison.pixelCount, 180 * 110);
  assert.equal(finalCompositor.comparison.changedPixelCount, 0);
  assert.equal(finalCompositor.comparison.changedPixelRatio, 0);
  assert.equal(finalCompositor.comparison.meanAbsoluteDiffRatio, 0);
  assert.equal(finalCompositor.comparison.maximumChannelDifference, 0);
  assert.ok(
    Buffer.byteLength(JSON.stringify(finalCompositor), "utf8") <=
      CALIFORNIA_CANVAS_GRAPHICS_FINAL_COMPOSITOR_MAX_PROOF_BYTES,
    "the durable nested compositor proof must stay within its bounded structured byte cap"
  );
  assert.doesNotMatch(
    JSON.stringify(ackedEvidence.contrastConsumeAck),
    /(?:reference|compositor)PngBase64/,
    "transient screenshot/reference bytes must be decoded then discarded before ACK/artifact storage"
  );
  const secondLedgerRead = await happy.evaluate((root) =>
    (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(root as HTMLElement)
      .map((outcome) => outcome.hasExecutableNonTextEvidence)
  );
  assert.deepEqual(secondLedgerRead, [false], "contrast evidence must be consumed once");
  await assert.rejects(
    registerCaliforniaCanvasGraphicsEvidenceForContrast({ evidence, root: happy }),
    /one-shot-registration-rejected/
  );
  await assert.rejects(
    consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
      benchId,
      contract,
      evidence,
      root: happy,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: "default",
      surfaceKey: "signature-canvas"
    }),
    /contrast-consume-ack-not-ready|already consumed/
  );

  const staleEvidence = await collectCaliforniaCanvasGraphicsStateEvidence({
    benchId,
    root: happy,
    stateKey: "stale-canary",
    surfaceKey: "signature-canvas",
    wait: { pollMs: 20, quietMs: 60, timeoutMs: 2_000 }
  });
  await page.evaluate(({ selectedSite }) => {
    const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
    const canvas = document.querySelector<HTMLCanvasElement>("#happy canvas")!;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#111827";
    runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(150, 12, 12, 12));
  }, { selectedSite: sitesByOperation.fillRect });
  await assert.rejects(
    registerCaliforniaCanvasGraphicsEvidenceForContrast({ evidence: staleEvidence, root: happy }),
    /registration-(stale|terminal-raster-drift)/
  );

  const pendingRafFailure = await happy.evaluate(async (root, request) => {
    const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
    const handle = runtime.requestAnimationFrame(request.benchId, () => undefined);
    try {
      await runtime.collect(root as HTMLElement, request);
      return "unexpected-pass";
    } catch (error) {
      return String(error);
    } finally {
      runtime.cancelAnimationFrame(request.benchId, handle);
    }
  }, { benchId, stateKey: "pending-raf", surfaceKey: "signature-canvas" });
  assert.match(pendingRafFailure, /raf-not-settled/);

  const negativeScenarios = [
    { id: "missing-clear", clear: "none" as const, issue: /missing-full-clear-epoch/ },
    { id: "partial-clear", clear: "partial" as const, issue: /latest-clear-epoch-not-full-canvas|missing-full-clear-epoch/ },
    { id: "wrong-paper", paper: "#ffffff", issue: /paper-color|effective-paper-background/ },
    { id: "low-contrast", fillStyle: "#e5e7eb", issue: /low-contrast|unconnected-or-tiny-core/ },
    { id: "tiny-marker", size: 1, issue: /unconnected-or-tiny-core/ },
    { id: "authored-readback", authoredGetImageData: true, issue: /unsupported-runtime-api:getImageData/ },
    { id: "unsupported-composite", unsupportedComposite: true, issue: /unsupported-composite:multiply/ }
  ];
  for (const scenario of negativeScenarios) {
    await installNegativeSurface(page, scenario);
    const root = page.locator(`#${scenario.id}`);
    const rejected = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root,
      stateKey: scenario.id,
      surfaceKey: "signature-canvas",
      wait: { pollMs: 20, quietMs: 60, timeoutMs: 2_000 }
    });
    const issues = [
      ...rejected.issues,
      ...rejected.canvases.flatMap((canvas) => canvas.issues),
      ...verifyCaliforniaCanvasGraphicsStateEvidence(rejected, {
        benchId,
        capturedUrl: page.url(),
        stateKey: scenario.id,
        surfaceKey: "signature-canvas"
      }, contract)
    ].join("|");
    assert.match(issues, scenario.issue, scenario.id);
    assert.throws(
      () => assertCaliforniaCanvasGraphicsStateEvidence(rejected, {
        benchId,
        capturedUrl: page.url(),
        stateKey: scenario.id,
        surfaceKey: "signature-canvas"
      }, contract),
      /graphics state evidence failed/
    );
  }
});

test("real Chromium rejects same-value-restored paint-environment races by exact drift kind", {
  timeout: 45_000
}, async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><meta charset=utf-8><title>Canvas paint environment</title>");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
    headless: true
  });
  t.after(async () => {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  });
  const pageUrl = `http://127.0.0.1:${address.port}/`;

  for (const race of [
    "cssom",
    "scroll",
    "animation",
    "focus",
    "viewport",
    "media",
    "view-transition",
    "fullscreen"
  ] as const) {
    await t.test(`${race} changes during screenshot cannot be erased by restoring the same value`,
      async () => {
        const page = await newInstrumentedPage(browser, pageUrl);
        await installHappySurface(page);
        await installPaintEnvironmentRaceFixture(page, race);
        const root = page.locator("#happy");
        const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
          benchId,
          root,
          stateKey: `paint-environment-${race}`,
          surfaceKey: "signature-canvas",
          wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
        });
        await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
        const outcomes = await root.evaluate((element) =>
          (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
            element as HTMLElement,
            { canvasSelector: "canvas[data-viz-mark]" }
          ).map((outcome) => outcome.hasExecutableNonTextEvidence)
        );
        assert.deepEqual(outcomes, [true]);
        const nativeScreenshot = page.screenshot.bind(page);
        page.screenshot = async (options) => {
          await changePaintEnvironmentForScreenshot(page, race, "hide");
          try {
            return await nativeScreenshot(options);
          } finally {
            await changePaintEnvironmentForScreenshot(page, race, "restore");
          }
        };
        try {
          await assert.rejects(
            consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
              benchId,
              contract,
              evidence,
              root,
              runtimeRunId: evidence.runtimeRunId,
              stateKey: evidence.stateKey,
              surfaceKey: evidence.surfaceKey
            }),
            exactPaintEnvironmentDriftKind(
              race === "view-transition" ? "animation" : race
            )
          );
        } finally {
          page.screenshot = nativeScreenshot;
          await page.close();
        }
      });
  }

  await t.test(
    "FontFace and FontFaceSet lifecycle mutations remain monotonic after returning to empty",
    async () => {
      const page = await newInstrumentedPage(
        browser,
        pageUrl,
        "ca-fontface-lifecycle-0123456789abcdef"
      );
      await installHappySurface(page);
      await page.evaluate(async () => {
        const face = new FontFace("CanvasDetachedLifecycleFace", "local(Arial)");
        document.fonts.add(face);
        await face.load();
        await document.fonts.ready;
        document.fonts.delete(face);
        document.fonts.clear();
        await document.fonts.load("12px CanvasDetachedLifecycleFace");
        if ([...document.fonts].length !== 0) {
          throw new Error("FontFace lifecycle fixture did not return to an empty set");
        }
      });
      const root = page.locator("#happy");
      const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root,
        stateKey: "paint-environment-fontface-lifecycle",
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
      assert.deepEqual(await root.evaluate((element) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          element as HTMLElement,
          { canvasSelector: "canvas[data-viz-mark]" }
        ).map((outcome) => outcome.hasExecutableNonTextEvidence)
      ), [true]);
      const acked = await consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
        benchId,
        contract,
        evidence,
        root,
        runtimeRunId: evidence.runtimeRunId,
        stateKey: evidence.stateKey,
        surfaceKey: evidence.surfaceKey
      });
      assert.ok(acked.contrastConsumeAck.paintEnvironment.kindCounts.font >= 5);
      assert.match(
        acked.contrastConsumeAck.paintEnvironment.fontFingerprintSha256,
        /^[0-9a-f]{64}$/
      );
      await page.close();
    }
  );

  await t.test(
    "a cross-realm pre-captured native FontFace setter makes custom-font capture fail closed",
    async () => {
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 720, width: 960 }
      });
      await page.addInitScript(() => {
        (window as GraphicsWindow).__canvasNativeFontFamilySetter =
          Object.getOwnPropertyDescriptor(FontFace.prototype, "family")!.set;
      });
      await installCaliforniaCanvasTextAudit(page);
      await installCaliforniaCanvasGraphicsRuntime(page, {
        benchIds: [benchId],
        contract,
        runtimeRunId: "ca-fontface-race-0123456789abcdef"
      });
      await page.goto(pageUrl);
      await installHappySurface(page);
      await page.evaluate(async () => {
        const surface = document.querySelector<HTMLElement>("#happy")!;
        surface.style.overflow = "hidden";
        surface.style.position = "relative";
        const realm = document.createElement("iframe");
        realm.hidden = true;
        document.body.append(realm);
        const fontRealm = realm.contentWindow as Window & { FontFace: typeof FontFace };
        const crossRealmFace = new fontRealm.FontFace(
          "CanvasCrossRealmInventoryFace",
          "local(Arial)"
        );
        document.fonts.add(crossRealmFace);
        await crossRealmFace.load();
        const face = new FontFace("CanvasPaintEnvironmentFace", "local(Arial)", {
          ascentOverride: "normal",
          descentOverride: "normal",
          lineGapOverride: "normal",
          sizeAdjust: "1000%"
        } as FontFaceDescriptors & { sizeAdjust: string });
        document.fonts.add(face);
        await face.load();
        await document.fonts.ready;
        (window as GraphicsWindow).__canvasPaintEnvironmentFontFace = face;
        const cover = document.createElement("span");
        cover.id = "fontface-environment-cover";
        cover.textContent = "M";
        cover.style.cssText = [
          "background:#fbfbf8",
          "color:#fbfbf8",
          "display:inline-block",
          "font-family:CanvasPaintEnvironmentFace,monospace",
          "font-size:120px",
          "height:110px",
          "line-height:110px",
          "overflow:hidden",
          "position:absolute",
          "right:-100px",
          "top:8px",
          "white-space:nowrap",
          "z-index:99"
        ].join(";");
        surface.append(cover);
        await new Promise<void>((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        ));
      });
      const baseline = await page.evaluate(() => {
        const cover = document.querySelector<HTMLElement>("#fontface-environment-cover")!
          .getBoundingClientRect();
        const canvas = document.querySelector<HTMLCanvasElement>("#happy canvas")!
          .getBoundingClientRect();
        return {
          coverFullyCoversCanvas: cover.left <= canvas.left && cover.right >= canvas.right &&
            cover.top <= canvas.top && cover.bottom >= canvas.bottom,
          family: (window as GraphicsWindow).__canvasPaintEnvironmentFontFace!.family,
          fontCount: [...document.fonts].length,
          fontsStatus: document.fonts.status
        };
      });
      assert.equal(baseline.coverFullyCoversCanvas, true, JSON.stringify(baseline));
      assert.equal(baseline.fontsStatus, "loaded");
      assert.equal(baseline.fontCount, 2);
      await page.evaluate(async () => {
        const face = (window as GraphicsWindow).__canvasPaintEnvironmentFontFace!;
        const setter = (window as GraphicsWindow).__canvasNativeFontFamilySetter!;
        Reflect.apply(setter, face, ["CanvasPaintEnvironmentFaceHidden"]);
        await new Promise<void>((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        ));
        const cover = document.querySelector<HTMLElement>("#fontface-environment-cover")!
          .getBoundingClientRect();
        const canvas = document.querySelector<HTMLCanvasElement>("#happy canvas")!
          .getBoundingClientRect();
        if (cover.right > canvas.left && cover.left < canvas.right &&
            cover.bottom > canvas.top && cover.top < canvas.bottom) {
          throw new Error("Cross-realm native FontFace setter did not hide the cover");
        }
        Reflect.apply(setter, face, ["CanvasPaintEnvironmentFace"]);
        await new Promise<void>((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        ));
      });

      const root = page.locator("#happy");
      const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root,
        stateKey: "paint-environment-fontface-native-setter",
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
      assert.deepEqual(await root.evaluate((element) =>
        (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
          element as HTMLElement,
          { canvasSelector: "canvas[data-viz-mark]" }
        ).map((outcome) => outcome.hasExecutableNonTextEvidence)
      ), [true]);

      try {
        await assert.rejects(
          consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
            benchId,
            contract,
            evidence,
            root,
            runtimeRunId: evidence.runtimeRunId,
            stateKey: evidence.stateKey,
            surfaceKey: evidence.surfaceKey
          }),
          (error) => {
            const message = String(error);
            const match = message.match(
              /california-canvas-final-compositor-paint-environment-drift:kinds=([a-z+]+):/
            );
            assert.ok(match, `missing structured FontFace drift error: ${message}`);
            assert.equal(match[1], "font", `unexpected FontFace drift kind: ${message}`);
            return true;
          }
        );
      } finally {
        await page.close();
      }
    }
  );

  for (const race of [
    "adopted-style-sheets",
    "delete-rule",
    "media-list",
    "selector-text",
    "style-disabled",
    "typed-om"
  ] as const) {
    await t.test(`${race} CSSOM changes cannot be erased after the compositor screenshot`,
      async () => {
        const page = await newInstrumentedPage(browser, pageUrl);
        await installHappySurface(page);
        await installCssomEnvironmentRaceFixture(page, race);
        const root = page.locator("#happy");
        const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
          benchId,
          root,
          stateKey: `paint-environment-cssom-${race}`,
          surfaceKey: "signature-canvas",
          wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
        });
        await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
        assert.deepEqual(await root.evaluate((element) =>
          (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
            element as HTMLElement,
            { canvasSelector: "canvas[data-viz-mark]" }
          ).map((outcome) => outcome.hasExecutableNonTextEvidence)
        ), [true]);
        const nativeScreenshot = page.screenshot.bind(page);
        page.screenshot = async (options) => {
          await changeCssomEnvironmentForScreenshot(page, race, "hide");
          try {
            return await nativeScreenshot(options);
          } finally {
            await changeCssomEnvironmentForScreenshot(page, race, "restore");
          }
        };
        try {
          await assert.rejects(
            consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
              benchId,
              contract,
              evidence,
              root,
              runtimeRunId: evidence.runtimeRunId,
              stateKey: evidence.stateKey,
              surfaceKey: evidence.surfaceKey
            }),
            exactPaintEnvironmentDriftKind("cssom")
          );
        } finally {
          page.screenshot = nativeScreenshot;
          await page.close();
        }
      });
  }

  for (const race of [
    "checked",
    "value",
    "popover",
    "hash-target",
    "sibling-canvas"
  ] as const) {
    await t.test(`${race} page state cannot be restored after hiding paint for the screenshot`,
      async () => {
        const page = await newInstrumentedPage(browser, pageUrl);
        await installHappySurface(page);
        await installStateEnvironmentRaceFixture(page, race);
        const root = page.locator("#happy");
        const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
          benchId,
          root,
          stateKey: `paint-environment-state-${race}`,
          surfaceKey: "signature-canvas",
          wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
        });
        await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
        assert.deepEqual(await root.evaluate((element) =>
          (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
            element as HTMLElement,
            { canvasSelector: "canvas[data-viz-mark]" }
          ).map((outcome) => outcome.hasExecutableNonTextEvidence)
        ), [true]);
        const nativeScreenshot = page.screenshot.bind(page);
        page.screenshot = async (options) => {
          await changeStateEnvironmentForScreenshot(page, race, "hide");
          try {
            return await nativeScreenshot(options);
          } finally {
            await changeStateEnvironmentForScreenshot(page, race, "restore");
          }
        };
        try {
          await assert.rejects(
            consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
              benchId,
              contract,
              evidence,
              root,
              runtimeRunId: evidence.runtimeRunId,
              stateKey: evidence.stateKey,
              surfaceKey: evidence.surfaceKey
            }),
            (error) => {
              const message = String(error);
              const match = message.match(
                /california-canvas-final-compositor-paint-environment-drift:kinds=([a-z+]+)/
              );
              assert.ok(match, `missing structured state drift error: ${message}`);
              assert.ok(match[1]!.split("+").includes("state"),
                `expected state drift for ${race}, received ${match[1]}: ${message}`);
              return true;
            }
          );
        } finally {
          page.screenshot = nativeScreenshot;
          await page.close();
        }
      });
  }
});

test("real Chromium adversarial proof-chain canaries reject stale or visually false receipts", {
  timeout: 45_000
}, async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><meta charset=utf-8><title>Canvas adversarial runtime</title>");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
    headless: true
  });
  t.after(async () => {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  });
  const pageUrl = `http://127.0.0.1:${address.port}/`;

  await t.test("row-edge pixels cannot wrap into a forged connected component", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await page.evaluate(({ selectedBindingKey, selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const root = document.createElement("section");
      root.id = "row-wrap";
      root.dataset.vizSurfaceKind = "signature-canvas";
      root.style.cssText = "background:#fbfbf8;padding:2px;width:10px;color-scheme:light";
      const canvas = document.createElement("canvas");
      canvas.dataset.vizMark = "true";
      canvas.width = 10;
      canvas.height = 5;
      canvas.style.cssText = "display:block;width:10px;height:5px";
      root.append(canvas);
      document.body.append(root);
      const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
      context.clearRect(0, 0, 10, 5);
      context.fillStyle = "#111827";
      context.beginPath();
      context.rect(9, 0, 1, 2);
      context.rect(0, 1, 1, 2);
      runtime.invoke(selectedSite, context, "fill", () => context.fill());
    }, { selectedBindingKey: bindingKey, selectedSite: sitesByOperation.fill });
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root: page.locator("#row-wrap"),
      stateKey: "row-wrap",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    assert.throws(() => assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
      benchId,
      capturedUrl: page.url(),
      stateKey: "row-wrap",
      surfaceKey: "signature-canvas"
    }, contract), /unconnected-or-tiny-core/);
    await page.close();
  });

  await t.test("a tiny high-contrast gradient sliver cannot bless a mostly low-contrast mark", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await page.evaluate(({ selectedBindingKey, selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const root = document.createElement("section");
      root.id = "low-coverage-gradient";
      root.dataset.vizSurfaceKind = "signature-canvas";
      root.style.cssText = "background:#fbfbf8;padding:2px;width:120px;color-scheme:light";
      const canvas = document.createElement("canvas");
      canvas.dataset.vizMark = "true";
      canvas.width = 120;
      canvas.height = 40;
      canvas.style.cssText = "display:block;width:120px;height:40px";
      root.append(canvas);
      document.body.append(root);
      const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
      context.clearRect(0, 0, 120, 40);
      const gradient = context.createLinearGradient(10, 0, 90, 0);
      gradient.addColorStop(0, "#111827");
      gradient.addColorStop(0.08, "#111827");
      gradient.addColorStop(0.12, "#e5e7eb");
      gradient.addColorStop(1, "#e5e7eb");
      context.fillStyle = gradient;
      runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(10, 5, 80, 30));
    }, { selectedBindingKey: bindingKey, selectedSite: sitesByOperation.fillRect });
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root: page.locator("#low-coverage-gradient"),
      stateKey: "low-coverage-gradient",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    assert.throws(() => assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
      benchId,
      capturedUrl: page.url(),
      stateKey: "low-coverage-gradient",
      surfaceKey: "signature-canvas"
    }, contract), /insufficient-contrast-core-coverage/);
    await page.close();
  });

  await t.test("clip-constrained clear cannot claim a full-canvas clear epoch", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await page.evaluate(({ selectedBindingKey, selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const root = document.createElement("section");
      root.id = "clipped-clear";
      root.dataset.vizSurfaceKind = "signature-canvas";
      root.style.cssText = "background:#fbfbf8;padding:2px;width:40px;color-scheme:light";
      const canvas = document.createElement("canvas");
      canvas.dataset.vizMark = "true";
      canvas.width = 40;
      canvas.height = 20;
      canvas.style.cssText = "display:block;width:40px;height:20px";
      root.append(canvas);
      document.body.append(root);
      const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
      context.clearRect(0, 0, 40, 20);
      context.fillStyle = "#111827";
      runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(30, 4, 8, 8));
      context.beginPath();
      context.rect(0, 0, 20, 20);
      context.clip();
      context.clearRect(0, 0, 40, 20);
      runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(4, 4, 8, 8));
    }, { selectedBindingKey: bindingKey, selectedSite: sitesByOperation.fillRect });
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root: page.locator("#clipped-clear"),
      stateKey: "clipped-clear",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    assert.equal(evidence.canvases[0].latestClearWasFull, false);
    assert.throws(() => assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
      benchId,
      capturedUrl: page.url(),
      stateKey: "clipped-clear",
      surfaceKey: "signature-canvas"
    }, contract), /missing-full-clear-epoch/);
    await page.close();
  });

  await t.test("ancestor compositing and any Canvas paper-layer paint invalidate paper proof", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await page.evaluate(({ selectedBindingKey, selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      for (const definition of [
        { id: "ancestor-opacity", parentStyle: "opacity:.35", wrapperStyle: "", canvasStyle: "" },
        {
          id: "canvas-background-image",
          parentStyle: "",
          wrapperStyle: "",
          canvasStyle: "background-image:linear-gradient(#000,#000)"
        },
        {
          id: "intermediate-translucent-background",
          parentStyle: "",
          wrapperStyle: "background:rgba(0,0,0,.25)",
          canvasStyle: ""
        },
        {
          id: "intermediate-background-image",
          parentStyle: "",
          wrapperStyle: "background-image:linear-gradient(#000,#fff)",
          canvasStyle: ""
        },
        {
          id: "intermediate-inset-shadow",
          parentStyle: "",
          wrapperStyle: "box-shadow:inset 0 0 0 100px rgba(0,0,0,.25)",
          canvasStyle: ""
        }
      ]) {
        const parent = document.createElement("div");
        parent.style.cssText = definition.parentStyle;
        const root = document.createElement("section");
        root.id = definition.id;
        root.dataset.vizSurfaceKind = "signature-canvas";
        root.style.cssText = "background:#fbfbf8;padding:2px;width:80px;color-scheme:light";
        const canvas = document.createElement("canvas");
        canvas.dataset.vizMark = "true";
        canvas.width = 80;
        canvas.height = 40;
        canvas.style.cssText = `display:block;width:80px;height:40px;${definition.canvasStyle}`;
        const wrapper = document.createElement("div");
        wrapper.style.cssText = definition.wrapperStyle;
        wrapper.append(canvas);
        root.append(wrapper);
        parent.append(root);
        document.body.append(parent);
        const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
        context.clearRect(0, 0, 80, 40);
        context.fillStyle = "#111827";
        runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(10, 10, 20, 16));
      }
    }, { selectedBindingKey: bindingKey, selectedSite: sitesByOperation.fillRect });
    for (const id of [
      "ancestor-opacity",
      "canvas-background-image",
      "intermediate-translucent-background",
      "intermediate-background-image",
      "intermediate-inset-shadow"
    ]) {
      const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
        benchId,
        root: page.locator(`#${id}`),
        stateKey: id,
        surfaceKey: "signature-canvas",
        wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
      });
      assert.equal(evidence.canvases[0].paperProof.paperOpaque, false, id);
      assert.throws(() => assertCaliforniaCanvasGraphicsStateEvidence(evidence, {
        benchId,
        capturedUrl: page.url(),
        stateKey: id,
        surfaceKey: "signature-canvas"
      }, contract), /paper-background-mismatch-or-transparent|unresolved-compositing/, id);
    }
    await page.close();
  });

  await t.test("raw contrast registration cannot bypass semantic verification", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await installNegativeSurface(page, { id: "raw-missing-clear", clear: "none" });
    const root = page.locator("#raw-missing-clear");
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root,
      stateKey: "raw-missing-clear",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    await assert.rejects(
      registerCaliforniaCanvasGraphicsEvidenceForContrast({ evidence, root }),
      /semantic|missing-full-clear|registration-rejected/
    );
    await page.close();
  });

  await t.test("post-contrast mutation prevents the browser ACK and final Node consume", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await installNegativeSurface(page, { id: "ack-post-consume-mutation" });
    const root = page.locator("#ack-post-consume-mutation");
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root,
      stateKey: "ack-post-consume-mutation",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
    const outcomes = await root.evaluate((element) =>
      (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
        element as HTMLElement
      ).map((outcome) => outcome.hasExecutableNonTextEvidence)
    );
    assert.deepEqual(outcomes, [true]);
    await page.evaluate(({ selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const canvas = document.querySelector<HTMLCanvasElement>(
        "#ack-post-consume-mutation canvas"
      )!;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#111827";
      runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(50, 12, 16, 16));
    }, { selectedSite: sitesByOperation.fillRect });
    await assert.rejects(
      consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
        benchId,
        contract,
        evidence,
        root,
        runtimeRunId: evidence.runtimeRunId,
        stateKey: evidence.stateKey,
        surfaceKey: evidence.surfaceKey
      }),
      /contrast-consume-ack-stale|capture-fence|source-revision|terminal-raster/
    );
    await page.close();
  });

  await t.test("a multi-Canvas receipt ACK is unavailable until every exact pending Canvas is consumed", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await page.evaluate(({ selectedBindingKey, selectedSite }) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const root = document.createElement("section");
      root.id = "ack-multi-canvas";
      root.dataset.vizSurfaceKind = "signature-canvas";
      root.style.cssText = "background:#fbfbf8;padding:4px;width:170px;color-scheme:light";
      for (const suffix of ["a", "b"]) {
        const canvas = document.createElement("canvas");
        canvas.id = `ack-multi-${suffix}`;
        canvas.dataset.vizMark = "true";
        canvas.width = 80;
        canvas.height = 40;
        canvas.style.cssText = "display:block;width:80px;height:40px";
        root.append(canvas);
        const context = runtime.registerContext(selectedBindingKey, canvas.getContext("2d"));
        context.clearRect(0, 0, 80, 40);
        context.fillStyle = "#111827";
        runtime.invoke(selectedSite, context, "fillRect", () => context.fillRect(8, 8, 24, 20));
      }
      document.body.append(root);
    }, { selectedBindingKey: bindingKey, selectedSite: sitesByOperation.fillRect });
    const root = page.locator("#ack-multi-canvas");
    const evidence = await collectCaliforniaCanvasGraphicsStateEvidence({
      benchId,
      root,
      stateKey: "ack-multi-canvas",
      surfaceKey: "signature-canvas",
      wait: { pollMs: 10, quietMs: 20, timeoutMs: 1_000 }
    });
    assert.equal(evidence.canvases.length, 2);
    await registerCaliforniaCanvasGraphicsEvidenceForContrast({ contract, evidence, root });
    const first = await root.evaluate((element) =>
      (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
        element as HTMLElement,
        { canvasSelector: "#ack-multi-a" }
      ).map((outcome) => outcome.hasExecutableNonTextEvidence)
    );
    assert.deepEqual(first, [true]);
    await assert.rejects(
      consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
        benchId,
        contract,
        evidence,
        root,
        runtimeRunId: evidence.runtimeRunId,
        stateKey: evidence.stateKey,
        surfaceKey: evidence.surfaceKey
      }),
      /contrast-consume-ack-not-ready/
    );
    const second = await root.evaluate((element) =>
      (window as GraphicsWindow).__californiaCanvasTextAudit!.contrastSurfaceOutcomes(
        element as HTMLElement,
        { canvasSelector: "#ack-multi-b" }
      ).map((outcome) => outcome.hasExecutableNonTextEvidence)
    );
    assert.deepEqual(second, [true]);
    const consumed = await consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
      benchId,
      contract,
      evidence,
      root,
      runtimeRunId: evidence.runtimeRunId,
      stateKey: evidence.stateKey,
      surfaceKey: evidence.surfaceKey
    });
    assert.equal(consumed.contrastConsumeAck.canvases.length, 2);
    assert.ok(consumed.contrastConsumeAck.canvases.every((canvas) =>
      canvas.finalCompositor.comparison.changedPixelCount === 0 &&
      canvas.finalCompositor.reference.rgbaSha256 ===
        canvas.finalCompositor.compositor.rgbaSha256
    ));
    assert.equal(new Set(consumed.contrastConsumeAck.canvases.map((canvas) =>
      canvas.finalCompositor.bindingSha256
    )).size, 2);
    await page.close();
  });

  await t.test("all asynchronous digests are fenced against a later exact source paint", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await installNegativeSurface(page, { id: "digest-race" });
    const result = await page.locator("#digest-race").evaluate(async (root, request) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const canvas = (root as HTMLElement).querySelector("canvas")!;
      const context = canvas.getContext("2d")!;
      const prototype = SubtleCrypto.prototype;
      const nativeDigest = prototype.digest;
      let calls = 0;
      prototype.digest = function(...args) {
        calls += 1;
        if (calls === 2) {
          context.fillStyle = "#111827";
          runtime.invoke(
            request.sourceSiteKey,
            context,
            "fillRect",
            () => context.fillRect(50, 10, 20, 16)
          );
        }
        return nativeDigest.apply(this, args);
      };
      try {
        await runtime.collect(root as HTMLElement, {
          benchId: request.benchId,
          stateKey: "digest-race",
          surfaceKey: "signature-canvas"
        });
        return "unexpected-pass";
      } catch (error) {
        return String(error);
      } finally {
        prototype.digest = nativeDigest;
      }
    }, { benchId, sourceSiteKey: sitesByOperation.fillRect });
    assert.match(result, /capture-fence|revision|stale/);
    await page.close();
  });

  await t.test("all asynchronous digests are fenced against an uninstrumented same-size backing-store reset", async () => {
    const page = await newInstrumentedPage(browser, pageUrl);
    await installNegativeSurface(page, { id: "digest-reset-race" });
    const result = await page.locator("#digest-reset-race").evaluate(async (root, request) => {
      const runtime = (window as GraphicsWindow).__californiaCanvasGraphicsRuntime!;
      const canvas = (root as HTMLElement).querySelector("canvas")!;
      const textAudit = (window as unknown as {
        __californiaCanvasTextAudit?: { signature?: unknown };
      }).__californiaCanvasTextAudit;
      if (textAudit) textAudit.signature = undefined;
      const prototype = SubtleCrypto.prototype;
      const nativeDigest = prototype.digest;
      let calls = 0;
      prototype.digest = function(...args) {
        calls += 1;
        if (calls === 2) canvas.width = canvas.width;
        return nativeDigest.apply(this, args);
      };
      try {
        await runtime.collect(root as HTMLElement, {
          benchId: request.benchId,
          stateKey: "digest-reset-race",
          surfaceKey: "signature-canvas"
        });
        return "unexpected-pass";
      } catch (error) {
        return String(error);
      } finally {
        prototype.digest = nativeDigest;
      }
    }, { benchId });
    assert.match(result, /capture-fence|terminal-raster|revision|stale/);
    await page.close();
  });
});
