import assert from "node:assert/strict";
import test from "node:test";
import { chromium, type Browser } from "@playwright/test";
import { isCaliforniaExactNetZeroControlledRangeNormalization } from
  "./california-canvas-graphics-runtime";
import { installCaliforniaCanvasTextAudit } from "./california-canvas-text-audit";
import {
  captureSignatureBenchDefaultState,
  collectVisualizationUiFindings,
  smokeSignatureBenchControl
} from "./california-visualization-qa-helpers";

test("California signature state and viewport probes preserve real semantic evidence", { timeout: 45_000 }, async () => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
    const page = await browser.newPage({ viewport: { height: 600, width: 800 } });
    await installCaliforniaCanvasTextAudit(page);
    await page.goto("data:text/html,<meta charset=utf-8><title>california-state-regression</title>");
    await page.evaluate("globalThis.__name = function(value) { return value; }");

    await page.setContent(`
      <section id="accessible-model-response" data-viz-signature-lab>
        <div data-viz-surface style="width:240px;height:160px">
          <div id="accessible-model-image" role="img" aria-label="Model value is zero">
            <canvas data-viz-mark height="160" style="height:160px;width:240px" width="240"></canvas>
          </div>
        </div>
        <button id="accessible-model-control" type="button">Increase model</button>
        <button data-viz-reset-model type="button">Reset</button>
      </section>
    `);
    await page.locator("#accessible-model-response").evaluate((root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#2563eb";
      context.fillRect(20, 20, 100, 80);
      root.querySelector<HTMLButtonElement>("#accessible-model-control")!.addEventListener("click", () => {
        root.querySelector<HTMLElement>("#accessible-model-image")!
          .setAttribute("aria-label", "Model value is one");
      });
    });
    const defaultState = await captureSignatureBenchDefaultState(
      page.locator("#accessible-model-response"),
      6_000
    );
    const controlEvidence = await smokeSignatureBenchControl(
      page.locator("#accessible-model-response"),
      6_000,
      { defaultState, structured: true }
    );
    assert.equal(controlEvidence.modelChanged, true);

    await page.setContent(`
      <main id="analytics-lifecycle-proof" style="height:1200px;position:relative">
        <section
          data-viz-card
          data-viz-explore-gate="dwell"
          data-viz-save-state="idle"
          style="height:1000px;position:relative"
        >
          <button style="height:44px;position:absolute;top:850px;width:140px">Settled analytics</button>
        </section>
      </main>
    `);
    await page.locator("[data-viz-card]").evaluate((card) => {
      window.setTimeout(() => {
        card.setAttribute("data-viz-explore-gate", "engaged");
        card.setAttribute("data-viz-save-state", "saving");
        window.setTimeout(() => card.setAttribute("data-viz-save-state", "saved"), 25);
      }, 75);
    });
    const lifecycleFindings = await collectVisualizationUiFindings(
      page.locator("#analytics-lifecycle-proof"),
      {
        id: "desktop-en-light",
        language: "en",
        locale: "en-HK",
        theme: "light",
        viewport: "desktop"
      }
    );
    assert.equal(
      lifecycleFindings.some((finding) =>
        finding.startsWith("touch-target-layout-mutated:button(Settled analytics)") ||
        finding.startsWith("touch-target-layout-unstable:button(Settled analytics)") ||
        finding.startsWith("touch-target-scroll-restore-failed:button(Settled analytics)") ||
        finding.startsWith("touch-target-environment-restore-failed:button(Settled analytics)")
      ),
      false,
      "a product analytics lifecycle must settle before viewport mutation journaling begins"
    );
    assert.equal(
      await page.locator("[data-viz-card]").getAttribute("data-viz-save-state"),
      "saved"
    );

    await page.setContent(`
      <main id="async-scroll-proof" style="height:1200px;position:relative">
        <div data-viz-surface style="height:160px;position:absolute;top:20px;width:240px">
          <canvas id="equivalent-scroll-redraw" height="160" style="height:160px;width:240px" width="240"></canvas>
        </div>
        <button style="height:44px;position:absolute;top:850px;width:140px">Async no-op</button>
      </main>
    `);
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#equivalent-scroll-redraw")!;
      const drawEquivalentFrame = () => {
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#2563eb";
        context.fillRect(20, 20, 100, 80);
      };
      drawEquivalentFrame();
      window.addEventListener("scroll", () => {
        Promise.resolve().then(() => undefined);
        setTimeout(() => undefined, 0);
        // Real signature benches can re-run a responsive Canvas effect after
        // the audit scrolls them into view. Assigning the already-current
        // bitmap dimensions emits MutationObserver attribute records even
        // though the geometry and final pixels remain identical.
        canvas.width = canvas.width;
        canvas.height = canvas.height;
        drawEquivalentFrame();
      });
      window.scrollTo(0, 0);
    });
    const findings = await collectVisualizationUiFindings(page.locator("#async-scroll-proof"), {
      id: "desktop-en-light",
      language: "en",
      locale: "en-HK",
      theme: "light",
      viewport: "desktop"
    });
    assert.equal(
      findings.some((finding) =>
        finding.startsWith("touch-target-layout-mutated:button(Async no-op)") ||
        finding.startsWith("touch-target-layout-unstable:button(Async no-op)") ||
        finding.startsWith("touch-target-scroll-restore-failed:button(Async no-op)") ||
        finding.startsWith("touch-target-environment-restore-failed:button(Async no-op)")
      ),
      false,
      `settled no-op async work, same-size Canvas writes, and pixel-equivalent redraws preserve the viewport environment; findings=${findings.join(" | ")}`
    );

    await page.setContent(`
      <main id="range-normalization-proof" style="height:1200px;position:relative">
        <input aria-label="First controlled range" max="10" min="0" style="position:absolute;top:20px" type="range" value="5">
        <input aria-label="Second controlled range" max="10" min="0" style="position:absolute;top:80px" type="range" value="5">
        <button style="height:44px;position:absolute;top:850px;width:180px">Range bookkeeping</button>
      </main>
    `);
    await page.locator("#range-normalization-proof").evaluate((root) => {
      let normalized = false;
      window.addEventListener("scroll", () => {
        if (normalized) return;
        normalized = true;
        for (const input of root.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
          // React's controlled-input update path temporarily detaches an input
          // from its named group, writes its already-current type, then restores
          // the original absent name. None of these writes changes final DOM,
          // form semantics, geometry, or pixels.
          input.name = "";
          input.type = "range";
          input.removeAttribute("name");
        }
      });
      window.scrollTo(0, 0);
    });
    const rangeNormalizationFindings = await collectVisualizationUiFindings(
      page.locator("#range-normalization-proof"),
      {
        id: "desktop-en-light",
        language: "en",
        locale: "en-HK",
        theme: "light",
        viewport: "desktop"
      }
    );
    assert.equal(
      rangeNormalizationFindings.some((finding) =>
        finding.startsWith("touch-target-layout-mutated:button(Range bookkeeping)") ||
        finding.startsWith("touch-target-layout-unstable:button(Range bookkeeping)") ||
        finding.startsWith("touch-target-scroll-restore-failed:button(Range bookkeeping)") ||
        finding.startsWith("touch-target-environment-restore-failed:button(Range bookkeeping)")
      ),
      false,
      `net-zero controlled-range attribute normalization is not a layout mutation; findings=${rangeNormalizationFindings.join(" | ")}`
    );
    assert.deepEqual(
      await page.locator('#range-normalization-proof input[type="range"]').evaluateAll((inputs) =>
        inputs.map((input) => ({ name: input.getAttribute("name"), type: input.getAttribute("type") }))
      ),
      [{ name: null, type: "range" }, { name: null, type: "range" }]
    );
    const directRangeNormalizationProofs = await page
      .locator('#range-normalization-proof input[type="range"]')
      .evaluateAll(async (inputs) => {
        const records: MutationRecord[] = [];
        const observer = new MutationObserver((batch) => records.push(...batch));
        for (const input of inputs) {
          observer.observe(input, { attributeOldValue: true, attributes: true });
          input.setAttribute("name", "");
          input.setAttribute("type", "range");
          input.removeAttribute("name");
        }
        await Promise.resolve();
        records.push(...observer.takeRecords());
        observer.disconnect();
        return inputs.map((input) => ({
          finalName: input.getAttribute("name"),
          finalType: input.getAttribute("type"),
          records: records.filter((record) => record.target === input).map((record) => ({
            attributeName: record.attributeName,
            oldValue: record.oldValue
          }))
        }));
      });
    assert.equal(directRangeNormalizationProofs.length, 2);
    for (const proof of directRangeNormalizationProofs) {
      assert.equal(
        isCaliforniaExactNetZeroControlledRangeNormalization(
          proof.records,
          proof.finalName,
          proof.finalType
        ),
        true,
        `Chromium's exact controlled-range normalization cohort must be recognized: ${JSON.stringify(proof)}`
      );
    }

    await page.setContent(`
      <main id="late-equivalent-redraw-proof" style="height:1200px;position:relative">
        <div data-viz-surface style="height:160px;position:absolute;top:20px;width:240px">
          <canvas id="late-equivalent-redraw" height="160" style="height:160px;width:240px" width="240"></canvas>
        </div>
        <button style="height:44px;position:absolute;top:850px;width:180px">Late canvas redraw</button>
      </main>
    `);
    await page.locator("#late-equivalent-redraw-proof").evaluate((root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("#late-equivalent-redraw")!;
      const drawEquivalentFrame = () => {
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#2563eb";
        context.fillRect(20, 20, 100, 80);
      };
      drawEquivalentFrame();
      let scheduled = false;
      window.addEventListener("scroll", () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
          canvas.width = canvas.width;
          canvas.height = canvas.height;
          drawEquivalentFrame();
        }, 75);
      });
      window.scrollTo(0, 0);
    });
    const lateRedrawFindings = await collectVisualizationUiFindings(
      page.locator("#late-equivalent-redraw-proof"),
      {
        id: "desktop-en-light",
        language: "en",
        locale: "en-HK",
        theme: "light",
        viewport: "desktop"
      }
    );
    assert.equal(
      lateRedrawFindings.some((finding) =>
        finding.startsWith("touch-target-layout-mutated:button(Late canvas redraw)") ||
        finding.startsWith("touch-target-layout-unstable:button(Late canvas redraw)") ||
        finding.startsWith("touch-target-scroll-restore-failed:button(Late canvas redraw)") ||
        finding.startsWith("touch-target-environment-restore-failed:button(Late canvas redraw)")
      ),
      false,
      `a retrying quiescence fence is not a layout mutation when its delayed Canvas redraw is pixel-equivalent and terminal; findings=${lateRedrawFindings.join(" | ")}`
    );

    await page.setContent(`
      <main id="persistent-range-mutation-proof" style="height:1200px;position:relative">
        <input aria-label="Persistent controlled range" max="10" min="0" style="position:absolute;top:20px" type="range" value="5">
        <button style="height:44px;position:absolute;top:850px;width:180px">Persistent range change</button>
      </main>
    `);
    await page.locator("#persistent-range-mutation-proof").evaluate((root) => {
      let mutated = false;
      window.addEventListener("scroll", () => {
        if (mutated) return;
        mutated = true;
        root.querySelector<HTMLInputElement>('input[type="range"]')!.name = "changed";
      });
      window.scrollTo(0, 0);
    });
    const persistentRangeFindings = await collectVisualizationUiFindings(
      page.locator("#persistent-range-mutation-proof"),
      {
        id: "desktop-en-light",
        language: "en",
        locale: "en-HK",
        theme: "light",
        viewport: "desktop"
      }
    );
    assert.equal(
      persistentRangeFindings.some((finding) =>
        finding.startsWith("touch-target-layout-mutated:button(Persistent range change)")
      ),
      true,
      `persistent controlled-range attribute drift must remain a hard finding; findings=${persistentRangeFindings.join(" | ")}`
    );
    assert.equal(
      await page.locator('#persistent-range-mutation-proof input[type="range"]').getAttribute("name"),
      null,
      "the viewport audit must restore a persistent attribute mutation after reporting it"
    );
    const persistentRangeMutationProof = await page
      .locator('#persistent-range-mutation-proof input[type="range"]')
      .evaluate(async (input) => {
        const records: MutationRecord[] = [];
        const observer = new MutationObserver((batch) => records.push(...batch));
        observer.observe(input, { attributeOldValue: true, attributes: true });
        input.setAttribute("name", "changed");
        await Promise.resolve();
        records.push(...observer.takeRecords());
        observer.disconnect();
        const proof = {
          finalName: input.getAttribute("name"),
          finalType: input.getAttribute("type"),
          records: records.map((record) => ({
            attributeName: record.attributeName,
            oldValue: record.oldValue
          }))
        };
        input.removeAttribute("name");
        return proof;
      });
    assert.equal(
      isCaliforniaExactNetZeroControlledRangeNormalization(
        persistentRangeMutationProof.records,
        persistentRangeMutationProof.finalName,
        persistentRangeMutationProof.finalType
      ),
      false,
      "a persistent range name mutation must remain a final-compositor blocker"
    );
  } finally {
    await browser?.close();
  }
});
