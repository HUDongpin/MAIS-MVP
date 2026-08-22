import assert from "node:assert/strict";
import test from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import {
  installCaliforniaCanvasTextAudit,
  type CaliforniaCanvasTextAuditPageApi
} from "./california-canvas-text-audit";
import {
  collectCaliforniaVisualizationContrastFindings,
  type CaliforniaContrastAuditResult
} from "./california-visualization-contrast-audit";

const context = {
  benchId: "contrast-audit-canvas-mode-canary",
  state: "default",
  viewport: "desktop" as const
};

const settledProof = {
  domSvg: "settled" as const,
  evidence: "Static real-Chrome Canvas audit-mode fixture is settled"
};

type CanvasProviderProbe = {
  contrastInputCalls: number;
  contrastSurfaceCalls: number;
  pending: boolean;
  signatureCalls: number;
};

type ProbeWindow = Window & {
  __californiaCanvasAuditModeProbe?: CanvasProviderProbe;
  __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi;
};

async function setFixture(page: Page) {
  await page.goto("data:text/html,<meta charset=utf-8><title>canvas-audit-mode</title>");
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          html, body { margin: 0; background: #fff; color: #000; font: 16px Arial, sans-serif; }
          #root { display: block; padding: 16px; width: 520px; }
          svg, canvas { display: block; height: 80px; margin-top: 8px; width: 320px; }
        </style>
      </head>
      <body>
        <main id="root">
          <span>DOM learner label</span>
          <svg viewBox="0 0 320 80" style="background:#fff">
            <text x="12" y="42" fill="#000" font-size="16">SVG learner label</text>
          </svg>
          <canvas data-viz-essential width="320" height="80"></canvas>
        </main>
      </body>
    </html>
  `);
}

async function newPendingProviderFixture(browser: Browser) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 720, width: 960 }
  });
  await installCaliforniaCanvasTextAudit(page);
  await setFixture(page);
  await page.evaluate(() => {
    const auditWindow = window as ProbeWindow;
    const api = auditWindow.__californiaCanvasTextAudit;
    if (!api) throw new Error("Canvas text audit fixture was not installed");

    const originalContrastInputs = api.contrastInputs.bind(api);
    const originalContrastSurfaceOutcomes = api.contrastSurfaceOutcomes.bind(api);
    const originalSignature = api.signature.bind(api);
    const probe: CanvasProviderProbe = {
      contrastInputCalls: 0,
      contrastSurfaceCalls: 0,
      pending: true,
      signatureCalls: 0
    };
    auditWindow.__californiaCanvasAuditModeProbe = probe;

    api.signature = (...args) => {
      probe.signatureCalls += 1;
      return originalSignature(...args);
    };
    api.contrastInputs = (...args) => {
      probe.contrastInputCalls += 1;
      return originalContrastInputs(...args);
    };
    api.contrastSurfaceOutcomes = (...args) => {
      probe.contrastSurfaceCalls += 1;
      const outcomes = originalContrastSurfaceOutcomes(...args);
      if (!probe.pending) {
        return outcomes.map((outcome) => ({
          ...outcome,
          hasExecutableNonTextEvidence: false,
          unsupportedReasons: [
            ...outcome.unsupportedReasons,
            "Synthetic one-shot Canvas provider was already consumed"
          ]
        }));
      }
      probe.pending = false;
      return outcomes.map((outcome) => ({
        ...outcome,
        hasExecutableNonTextEvidence: true,
        unsupportedReasons: []
      }));
    };

    const canvas = document.querySelector<HTMLCanvasElement>("#root canvas");
    const context2d = canvas?.getContext("2d");
    if (!canvas || !context2d) throw new Error("Canvas fixture is missing");
    context2d.fillStyle = "#fff";
    context2d.fillRect(0, 0, canvas.width, canvas.height);
    context2d.fillStyle = "#000";
    context2d.font = "16px Arial";
    context2d.fillText("Canvas learner label", 12, 42);
  });
  return page;
}

async function probe(page: Page) {
  return page.evaluate(() => {
    const value = (window as ProbeWindow).__californiaCanvasAuditModeProbe;
    if (!value) throw new Error("Canvas provider probe is missing");
    return { ...value };
  });
}

function canvasEvidence(result: CaliforniaContrastAuditResult) {
  return result.evidence.filter((item) => item.kind.startsWith("canvas-"));
}

async function audit(page: Page, auditCanvases?: boolean) {
  return collectCaliforniaVisualizationContrastFindings(
    page.locator("#root"),
    context,
    auditCanvases === undefined ? { settledProof } : { auditCanvases, settledProof }
  );
}

test("California base contrast audit can defer a same-root one-shot Canvas provider", {
  timeout: 30_000
}, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chrome browser is required for the Canvas audit-mode canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());

  await t.test("auditCanvases false preserves pending evidence and still audits DOM/SVG", async () => {
    const page = await newPendingProviderFixture(browser!);
    t.after(async () => page.close());

    const result = await audit(page, false);
    assert.deepEqual(await probe(page), {
      contrastInputCalls: 0,
      contrastSurfaceCalls: 0,
      pending: true,
      signatureCalls: 0
    }, "Canvas stability and one-shot provider APIs must remain completely untouched");
    assert.equal(
      result.evidence.filter((item) => item.kind === "canvas-surface").length,
      0,
      "Canvas surface count must be zero when Canvas auditing is disabled"
    );
    assert.deepEqual(canvasEvidence(result), [], "disabled mode must return no base Canvas evidence");
    assert.ok(result.evidence.some((item) => item.kind === "html-text" && item.ratios.length > 0));
    assert.ok(result.evidence.some((item) => item.kind === "svg-text-fill" && item.ratios.length > 0));
    assert.ok(result.candidateLabelCount >= 2 && result.auditedLabelCount >= 2);
    assert.equal(result.hardenedText.completed, true);
    assert.ok(result.hardenedText.candidateTextCount >= 2);
    assert.ok(result.hardenedText.auditedTextCount >= 2);

    const enabled = await audit(page, true);
    const enabledProbe = await probe(page);
    assert.equal(enabledProbe.pending, false);
    assert.ok(enabledProbe.signatureCalls >= 2, "enabled mode must run the Canvas stability gate");
    assert.equal(enabledProbe.contrastSurfaceCalls, 1);
    assert.equal(enabledProbe.contrastInputCalls, 1);
    assert.equal(enabled.evidence.filter((item) => item.kind === "canvas-surface").length, 1);
    assert.ok(canvasEvidence(enabled).length >= 2, "enabled mode must retain surface and text evidence");
  });

  await t.test("default mode is exactly enabled mode", async () => {
    const explicitPage = await newPendingProviderFixture(browser!);
    const defaultPage = await newPendingProviderFixture(browser!);
    t.after(async () => Promise.all([explicitPage.close(), defaultPage.close()]));

    const [explicitResult, defaultResult] = await Promise.all([
      audit(explicitPage, true),
      audit(defaultPage)
    ]);
    const normalize = (result: CaliforniaContrastAuditResult) => ({
      auditedLabelCount: result.auditedLabelCount,
      canvasEvidence: canvasEvidence(result),
      candidateLabelCount: result.candidateLabelCount,
      findings: result.findings,
      minRatio: result.minRatio,
      worstKind: result.worstKind,
      worstLabel: result.worstLabel
    });
    assert.deepEqual(normalize(defaultResult), normalize(explicitResult));
    const [explicitProbe, defaultProbe] = await Promise.all([probe(explicitPage), probe(defaultPage)]);
    assert.equal(explicitProbe.pending, false);
    assert.equal(defaultProbe.pending, false);
    assert.equal(explicitProbe.contrastSurfaceCalls, 1);
    assert.equal(defaultProbe.contrastSurfaceCalls, 1);
    assert.equal(explicitProbe.contrastInputCalls, 1);
    assert.equal(defaultProbe.contrastInputCalls, 1);
  });

  await t.test("a missing Canvas provider is hard red only when Canvas auditing is enabled", async () => {
    const page = await browser!.newPage({ viewport: { height: 720, width: 960 } });
    t.after(async () => page.close());
    await setFixture(page);

    const disabled = await audit(page, false);
    assert.equal(canvasEvidence(disabled).length, 0);
    assert.ok(disabled.auditedLabelCount >= 2, "DOM/SVG auditing must remain live without a Canvas provider");
    assert.equal(
      disabled.findings.some((finding) => finding.label === "Canvas text recorder"),
      false
    );

    const enabled = await audit(page, true);
    assert.ok(enabled.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.label === "Canvas text recorder"
    ), "enabled mode must fail closed when a visible Canvas has no recorder/provider");
  });
});
