import assert from "node:assert/strict";
import test from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import {
  CaliforniaBrowserDiagnostics,
  appendCaliforniaDiagnosticFindings,
  collectVisualizationUiAuditEvidence,
  collectVisualizationUiFindings,
  installCaliforniaVisualizationUiAuditInit,
  installCaliforniaVisualizationUiAuditProtocolEpoch,
  smokePremiumDirectControls,
  smokeSignatureBenchControl,
  summarizeCaliforniaTouchAuditEvidence,
  type CaliforniaQaAxis,
  type CaliforniaQaContext,
  type CaliforniaQaViewport
} from "./california-visualization-qa-helpers";

function axis(viewport: CaliforniaQaViewport): CaliforniaQaAxis {
  return {
    id: `synthetic-${viewport}`,
    language: "en",
    locale: "en-US",
    theme: "light",
    viewport
  };
}

async function renderAndCollect(
  page: Page,
  markup: string,
  viewport: CaliforniaQaViewport,
  workspaceAncestorStyle = ""
) {
  await installCaliforniaVisualizationUiAuditInit(page);
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; min-height: 100%; }
          body { padding: 16px; font-family: Arial, sans-serif; }
          #workspace {
            position: relative;
            width: 480px;
            height: 260px;
            padding: 10px;
          }
          [data-viz-surface] {
            position: relative;
            width: 440px;
            height: 220px;
          }
        </style>
      </head>
      <body>
        <div id="workspace-ancestor" style="${workspaceAncestorStyle}">
          <main id="workspace">
            <section data-viz-surface>${markup}</section>
          </main>
        </div>
      </body>
    </html>
  `);

  // Standalone tsx/esbuild can preserve nested callback names with a module-level
  // __name helper that Playwright does not carry into the serialized page function.
  await page.evaluate("globalThis.__name = function(value) { return value; }");

  return collectVisualizationUiFindings(page.locator("#workspace"), axis(viewport));
}

function matching(findings: string[], prefix: string) {
  return findings.filter((finding) => finding.startsWith(prefix));
}

async function createCaliforniaVisualizationUiAuditPage(browser: Browser) {
  const context = await browser.newContext({ viewport: { height: 600, width: 800 } });
  assert.equal(
    installCaliforniaVisualizationUiAuditProtocolEpoch(context),
    true,
    "the protocol epoch owner must install before the BrowserContext creates a Page"
  );
  return context.newPage();
}

async function setViewportEnvironmentFixture(page: Page, body: string, head = "") {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0}
    #root{height:1600px;position:relative;width:800px}
    #candidate{height:44px;left:20px;position:absolute;top:300px;width:180px}
  </style>${head}</head><body>${body}</body></html>`);
  await page.evaluate("globalThis.__name = function(value) { return value; }");
}

async function armViewportEnvironmentFixture(page: Page, fallbackY = 310) {
  await page.evaluate(async (fallback) => {
    const candidate = document.querySelector<HTMLElement>("#candidate");
    const targetY = candidate
      ? candidate.getBoundingClientRect().top + window.scrollY + 10
      : fallback;
    window.scrollTo(0, targetY);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }, fallbackY);
}

function viewportEnvironmentFailsClosed(findings: string[], label: string) {
  return findings.some((finding) =>
    finding.includes(label) && (
      finding.startsWith("touch-target-layout-mutated:") ||
      finding.startsWith("touch-target-environment-restore-failed:") ||
      finding.startsWith("touch-target-scroll-restore-failed:")
    )
  );
}

function viewportCandidateFindings(findings: string[], label: string) {
  return findings.filter((finding) => finding.includes(label));
}

test("California viewport environment journal hard negatives and green controls", { timeout: 60_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the UI audit canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const page = await createCaliforniaVisualizationUiAuditPage(browser);
  await installCaliforniaVisualizationUiAuditInit(page);
  const audit = () => collectVisualizationUiFindings(page.locator("#root"), axis("desktop"));

  await t.test("structured replacement preserves sticky collisions, literal tags, and duplicate identities", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface>
        <span aria-label="independent-literal-{california-viewport-recheck-0}" style="position:absolute;top:1300px">LITERAL</span>
        <button id="candidate" aria-label="independent-collision-candidate">COLLIDE</button>
        <span aria-label="independent-sticky-overlay" style="font:16px/20px Arial;left:20px;position:sticky;top:0">COLLIDE</span>
        <button aria-label="independent-same-label" style="height:20px;position:absolute;top:900px;width:20px">S</button>
        <button aria-label="independent-same-label" style="height:20px;position:absolute;top:1100px;width:20px">S</button>
      </main>`);
    await armViewportEnvironmentFixture(page);
    const findings = await audit();
    assert.ok(findings.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("independent-collision-candidate") &&
      finding.includes("independent-sticky-overlay")
    ), JSON.stringify(findings));
    assert.ok(findings.some((finding) =>
      finding.startsWith("text-clipped-by-viewport:") &&
      finding.includes("independent-literal-{california-viewport-recheck-0}")
    ), JSON.stringify(findings));
    assert.equal(findings.filter((finding) =>
      finding.startsWith("touch-target-small:button(independent-same-label)")
    ).length, 2, JSON.stringify(findings));
  });

  await t.test("restore-phase head style mutation is restored and rejected", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="restore-head-candidate">Candidate</button></main>
      <script>
        globalThis.restoreHeadArmed = false;
        globalThis.restoreHeadCentered = false;
        addEventListener("scroll", () => {
          if (!globalThis.restoreHeadArmed) return;
          if (scrollY < 100) globalThis.restoreHeadCentered = true;
          if (globalThis.restoreHeadCentered && scrollY >= 300) {
            document.querySelector("#unrelated-head-style").textContent = ".unrelated{color:blue}";
            globalThis.restoreHeadArmed = false;
          }
        });
      </script>`, `<style id="unrelated-head-style">.unrelated{color:red}</style>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { restoreHeadArmed: boolean }).restoreHeadArmed = true;
    });
    const findings = await audit();
    const styleText = await page.locator("#unrelated-head-style").textContent();
    assert.ok(styleText === ".unrelated{color:red}" &&
      viewportEnvironmentFailsClosed(findings, "restore-head-candidate"), JSON.stringify({ findings, styleText }));
  });

  await t.test("every unrelated light-DOM scroller is restored exactly", async () => {
    await setViewportEnvironmentFixture(page, `
      <aside id="unrelated-scroller" style="height:40px;overflow:auto"><div style="height:400px">unrelated</div></aside>
      <main id="root" data-viz-surface><button id="candidate" aria-label="unrelated-scroll-candidate">Candidate</button></main>
      <script>
        globalThis.unrelatedScrollArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.unrelatedScrollArmed && scrollY < 100) {
            document.querySelector("#unrelated-scroller").scrollTop = 137;
            globalThis.unrelatedScrollArmed = false;
          }
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>("#unrelated-scroller")!.scrollTop = 41;
      (globalThis as typeof globalThis & { unrelatedScrollArmed: boolean }).unrelatedScrollArmed = true;
    });
    const findings = await audit();
    const scrollTop = await page.locator("#unrelated-scroller").evaluate((element) =>
      (element as HTMLElement).scrollTop
    );
    assert.ok(scrollTop === 41 && viewportEnvironmentFailsClosed(findings, "unrelated-scroll-candidate"),
      JSON.stringify({ findings, scrollTop }));
  });

  await t.test("retained shadow style, form, and scroll state are restored", async () => {
    await setViewportEnvironmentFixture(page, `
      <shadow-state-host id="shadow-state-host"></shadow-state-host>
      <main id="root" data-viz-surface><button id="candidate" aria-label="shadow-state-candidate">Candidate</button></main>
      <script>
        globalThis.shadowStateArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.shadowStateArmed || scrollY >= 100) return;
          const shadow = globalThis.shadowStateRoot;
          shadow.querySelector("style").textContent = ".shadow-copy{color:blue}";
          shadow.querySelector("input").value = "after";
          shadow.querySelector("input").indeterminate = false;
          shadow.querySelector("#shadow-scroller").scrollTop = 133;
          globalThis.shadowStateArmed = false;
        });
      </script>`);
    await page.locator("#shadow-state-host").evaluate((host) => {
      const shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `
        <style>.shadow-copy{color:red}</style>
        <input value="before"><div id="shadow-scroller" style="height:30px;overflow:auto"><div style="height:300px">x</div></div>`;
      (shadow.querySelector("input") as HTMLInputElement).indeterminate = true;
      (shadow.querySelector("#shadow-scroller") as HTMLElement).scrollTop = 29;
      (globalThis as typeof globalThis & { shadowStateRoot?: ShadowRoot }).shadowStateRoot = shadow;
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { shadowStateArmed: boolean }).shadowStateArmed = true;
    });
    const findings = await audit();
    const after = await page.locator("#shadow-state-host").evaluate(() => {
      const shadow = (globalThis as typeof globalThis & { shadowStateRoot: ShadowRoot }).shadowStateRoot;
      const input = shadow.querySelector("input") as HTMLInputElement;
      return {
        indeterminate: input.indeterminate,
        scrollTop: (shadow.querySelector("#shadow-scroller") as HTMLElement).scrollTop,
        styleText: shadow.querySelector("style")!.textContent,
        value: input.value
      };
    });
    assert.ok(after.styleText === ".shadow-copy{color:red}" && after.value === "before" &&
      after.indeterminate && after.scrollTop === 29 &&
      viewportEnvironmentFailsClosed(findings, "shadow-state-candidate"), JSON.stringify({ after, findings }));
  });

  await t.test("nested light and shadow ancestor scroll offsets round-trip", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface>
        <div id="outer" style="height:100px;left:20px;overflow:auto;position:absolute;top:300px;width:220px">
          <div style="height:700px;position:relative;width:700px"><scroll-host id="scroll-host" style="left:360px;position:absolute;top:240px"></scroll-host></div>
        </div>
      </main>`);
    await page.locator("#scroll-host").evaluate((host) => {
      host.attachShadow({ mode: "open" }).innerHTML = `
        <div id="inner" style="height:80px;overflow:auto;width:180px">
          <div style="height:500px;position:relative;width:500px">
            <button aria-label="composed-scroll-candidate" style="height:44px;left:260px;position:absolute;top:210px;width:150px">Candidate</button>
          </div>
        </div>`;
    });
    await armViewportEnvironmentFixture(page);
    const before = await page.evaluate(() => {
      const outer = document.querySelector<HTMLElement>("#outer")!;
      const inner = document.querySelector("#scroll-host")!.shadowRoot!.querySelector<HTMLElement>("#inner")!;
      outer.scrollTo(33, 79);
      inner.scrollTo(27, 61);
      return { innerLeft: inner.scrollLeft, innerTop: inner.scrollTop, outerLeft: outer.scrollLeft, outerTop: outer.scrollTop, x: scrollX, y: scrollY };
    });
    const findings = await audit();
    const after = await page.evaluate(() => {
      const outer = document.querySelector<HTMLElement>("#outer")!;
      const inner = document.querySelector("#scroll-host")!.shadowRoot!.querySelector<HTMLElement>("#inner")!;
      return { innerLeft: inner.scrollLeft, innerTop: inner.scrollTop, outerLeft: outer.scrollLeft, outerTop: outer.scrollTop, x: scrollX, y: scrollY };
    });
    assert.deepEqual(after, before, JSON.stringify(findings));
    assert.ok(!findings.some((finding) => finding.includes("composed-scroll-candidate") &&
      finding.includes("restore-failed")), JSON.stringify(findings));
  });

  await t.test("smooth snap containers and sticky or fixed paint restore without exemptions", async () => {
    await setViewportEnvironmentFixture(page, `
      <aside aria-label="snap-fixed-paint" style="font:16px/20px Arial;position:fixed;right:10px;top:10px">FIXED</aside>
      <main id="root" data-viz-surface>
        <div id="snap-scroller" style="height:120px;left:20px;overflow:auto;position:absolute;scroll-behavior:smooth;scroll-snap-type:y mandatory;top:300px;width:240px">
          <div style="height:720px;position:relative">
            <span aria-label="snap-sticky-paint" style="font:16px/20px Arial;position:sticky;top:0">STICKY</span>
            <button id="candidate" aria-label="smooth-snap-candidate" style="top:420px;scroll-snap-align:center;width:180px">Candidate</button>
          </div>
        </div>
      </main>`);
    await page.evaluate(async () => {
      const scroller = document.querySelector<HTMLElement>("#snap-scroller")!;
      scroller.style.scrollBehavior = "auto";
      scroller.scrollTop = 120;
      scroller.style.scrollBehavior = "smooth";
      window.scrollTo(0, 310);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const before = await page.evaluate(() => ({
      left: document.querySelector<HTMLElement>("#snap-scroller")!.scrollLeft,
      top: document.querySelector<HTMLElement>("#snap-scroller")!.scrollTop,
      x: window.scrollX,
      y: window.scrollY
    }));
    const findings = await audit();
    const after = await page.evaluate(() => ({
      left: document.querySelector<HTMLElement>("#snap-scroller")!.scrollLeft,
      top: document.querySelector<HTMLElement>("#snap-scroller")!.scrollTop,
      x: window.scrollX,
      y: window.scrollY
    }));
    assert.deepEqual(after, before, JSON.stringify(findings));
    assert.deepEqual(findings.filter((finding) => finding.includes("smooth-snap-candidate")), []);
  });

  await t.test("non-JSON history state is restored by deep structured identity", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="history-map-candidate">Candidate</button></main>
      <script>
        globalThis.historyMapArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.historyMapArmed && scrollY < 100) {
            history.replaceState(new Map([["after", 2]]), "", location.href);
            globalThis.historyMapArmed = false;
          }
        });
      </script>`);
    await page.evaluate(() => history.replaceState(new Map([["before", 1]]), "", "#history-map"));
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { historyMapArmed: boolean }).historyMapArmed = true;
    });
    const findings = await audit();
    const entries = await page.evaluate(() => Array.from((history.state as Map<string, number>).entries()));
    assert.ok(JSON.stringify(entries) === JSON.stringify([["before", 1]]) &&
      viewportEnvironmentFailsClosed(findings, "history-map-candidate"), JSON.stringify({ entries, findings }));
  });

  await t.test("CSSStyleSheet disabled state is restored", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="sheet-disabled-candidate">Candidate</button></main>
      <script>
        globalThis.sheetDisabledArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.sheetDisabledArmed && scrollY < 100) {
            document.querySelector("#review-sheet").sheet.disabled = true;
            globalThis.sheetDisabledArmed = false;
          }
        });
      </script>`, `<style id="review-sheet">.unrelated-disabled-rule{color:red}</style>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { sheetDisabledArmed: boolean }).sheetDisabledArmed = true;
    });
    const findings = await audit();
    const disabled = await page.locator("#review-sheet").evaluate((style) =>
      (style as HTMLStyleElement).sheet!.disabled
    );
    assert.ok(disabled === false && viewportEnvironmentFailsClosed(findings, "sheet-disabled-candidate"),
      JSON.stringify({ disabled, findings }));
  });

  await t.test("form defaults, indeterminate, and selection state are restored", async () => {
    await setViewportEnvironmentFixture(page, `
      <input id="review-check" type="checkbox"><input id="review-selection" value="abcdef">
      <textarea id="review-textarea">before</textarea>
      <select id="review-select"><option selected>A</option><option>B</option></select>
      <main id="root" data-viz-surface><button id="candidate" aria-label="form-property-candidate">Candidate</button></main>
      <script>
        globalThis.formPropertyArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.formPropertyArmed && scrollY < 100) {
            const checkbox = document.querySelector("#review-check");
            const selection = document.querySelector("#review-selection");
            checkbox.indeterminate = false;
            checkbox.defaultChecked = true;
            selection.defaultValue = "changed";
            selection.setSelectionRange(4, 6, "backward");
            document.querySelector("#review-textarea").defaultValue = "after";
            document.querySelector("#review-select").options[1].defaultSelected = true;
            globalThis.formPropertyArmed = false;
          }
        });
      </script>`);
    await page.evaluate(() => {
      const checkbox = document.querySelector<HTMLInputElement>("#review-check")!;
      const selection = document.querySelector<HTMLInputElement>("#review-selection")!;
      checkbox.indeterminate = true;
      selection.setSelectionRange(1, 3, "forward");
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { formPropertyArmed: boolean }).formPropertyArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => {
      const checkbox = document.querySelector<HTMLInputElement>("#review-check")!;
      const selection = document.querySelector<HTMLInputElement>("#review-selection")!;
      const select = document.querySelector<HTMLSelectElement>("#review-select")!;
      return {
        checkboxDefault: checkbox.defaultChecked,
        direction: selection.selectionDirection,
        end: selection.selectionEnd,
        indeterminate: checkbox.indeterminate,
        inputDefault: selection.defaultValue,
        optionDefault: select.options[1].defaultSelected,
        start: selection.selectionStart,
        textareaDefault: document.querySelector<HTMLTextAreaElement>("#review-textarea")!.defaultValue
      };
    });
    assert.deepEqual(after, {
      checkboxDefault: false,
      direction: "forward",
      end: 3,
      indeterminate: true,
      inputDefault: "abcdef",
      optionDefault: false,
      start: 1,
      textareaDefault: "before"
    });
    assert.ok(viewportEnvironmentFailsClosed(findings, "form-property-candidate"), JSON.stringify(findings));
  });

  await t.test("dialog returnValue and popover state are restored", async () => {
    await setViewportEnvironmentFixture(page, `
      <dialog id="review-dialog"></dialog><div id="review-popover" popover>Popover</div>
      <main id="root" data-viz-surface><button id="candidate" aria-label="dialog-value-candidate">Candidate</button></main>
      <script>
        globalThis.dialogValueArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.dialogValueArmed && scrollY < 100) {
            document.querySelector("#review-dialog").returnValue = "after";
            document.querySelector("#review-popover").showPopover();
            globalThis.dialogValueArmed = false;
          }
        });
      </script>`);
    await page.evaluate(() => {
      (document.querySelector("#review-dialog") as HTMLDialogElement).returnValue = "before";
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { dialogValueArmed: boolean }).dialogValueArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => ({
      popoverOpen: document.querySelector("#review-popover")!.matches(":popover-open"),
      returnValue: (document.querySelector("#review-dialog") as HTMLDialogElement).returnValue
    }));
    assert.deepEqual(after, { popoverOpen: false, returnValue: "before" });
    assert.ok(viewportEnvironmentFailsClosed(findings, "dialog-value-candidate"), JSON.stringify(findings));
  });

  await t.test("deep retained-shadow focus is restored exactly", async () => {
    await setViewportEnvironmentFixture(page, `
      <focus-host id="focus-host"></focus-host>
      <main id="root" data-viz-surface><button id="candidate" aria-label="shadow-focus-candidate">Candidate</button></main>
      <script>
        globalThis.shadowFocusArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.shadowFocusArmed && scrollY < 100) {
            globalThis.deepClosedFocusRoot.querySelector("#focus-after").focus({preventScroll:true});
            globalThis.shadowFocusArmed = false;
          }
        });
      </script>`);
    await page.locator("#focus-host").evaluate((host) => {
      const outer = host.attachShadow({ mode: "open" });
      outer.innerHTML = `<nested-focus-host id="nested-host"></nested-focus-host>`;
      const nested = outer.querySelector("#nested-host")!;
      const inner = nested.attachShadow({ mode: "closed" });
      inner.innerHTML = `<input id="focus-before"><input id="focus-after">`;
      (inner.querySelector("#focus-before") as HTMLInputElement).focus({ preventScroll: true });
      (globalThis as typeof globalThis & { deepClosedFocusRoot?: ShadowRoot }).deepClosedFocusRoot = inner;
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { shadowFocusArmed: boolean }).shadowFocusArmed = true;
    });
    const findings = await audit();
    const focusedId = await page.locator("#focus-host").evaluate(() => {
      const inner = (globalThis as typeof globalThis & { deepClosedFocusRoot: ShadowRoot }).deepClosedFocusRoot;
      return (inner.activeElement as HTMLElement | null)?.id ?? null;
    });
    assert.ok(focusedId === "focus-before" && viewportEnvironmentFailsClosed(findings, "shadow-focus-candidate"),
      JSON.stringify({ findings, focusedId }));
  });

  await t.test("existing FontFace descriptor and FontFaceSet membership are restored", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="fontface-descriptor-candidate">Candidate</button></main>
      <script>
        globalThis.fontfaceDescriptorArmed = false;
        addEventListener("scroll", () => {
          if (globalThis.fontfaceDescriptorArmed && scrollY < 100) {
            globalThis.reviewFontFace.family = "AfterFamily";
            document.fonts.add(new FontFace("ExtraFamily", "local(Arial)"));
            globalThis.fontfaceDescriptorArmed = false;
          }
        });
      </script>`);
    const before = await page.evaluate(() => {
      const face = new FontFace("BeforeFamily", "local(Arial)");
      document.fonts.add(face);
      (globalThis as typeof globalThis & { reviewFontFace: FontFace }).reviewFontFace = face;
      return Array.from(document.fonts).length;
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { fontfaceDescriptorArmed: boolean }).fontfaceDescriptorArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => ({
      family: (globalThis as typeof globalThis & { reviewFontFace: FontFace }).reviewFontFace.family,
      size: Array.from(document.fonts).length
    }));
    assert.ok(after.family === "BeforeFamily" && after.size === before &&
      viewportEnvironmentFailsClosed(findings, "fontface-descriptor-candidate"),
      JSON.stringify({ after, before, findings }));
  });

  await t.test("target removal, reparenting, and same-markup identity swap are reversed", async () => {
    await setViewportEnvironmentFixture(page, `
      <aside id="identity-parking"></aside>
      <main id="root" data-viz-surface>
        <section id="identity-home"><button id="candidate" aria-label="identity-swap-candidate">Candidate</button></section>
      </main>
      <script>
        globalThis.identitySwapArmed = false;
        globalThis.identitySwapOriginal = document.querySelector("#candidate");
        addEventListener("scroll", () => {
          if (!globalThis.identitySwapArmed || scrollY >= 100) return;
          const original = globalThis.identitySwapOriginal;
          const clone = original.cloneNode(true);
          document.querySelector("#identity-parking").append(original);
          document.querySelector("#identity-home").append(clone);
          globalThis.identitySwapArmed = false;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { identitySwapArmed: boolean }).identitySwapArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => {
      const state = globalThis as typeof globalThis & { identitySwapOriginal: Element };
      const current = document.querySelector("#identity-home > #candidate");
      return {
        identityRestored: current === state.identitySwapOriginal,
        parkingChildren: document.querySelector("#identity-parking")!.childElementCount,
        rootCandidateCount: document.querySelectorAll("#root #candidate").length
      };
    });
    assert.deepEqual(after, { identityRestored: true, parkingChildren: 0, rootCandidateCount: 1 });
    assert.ok(viewportEnvironmentFailsClosed(findings, "identity-swap-candidate"), JSON.stringify(findings));
  });

  await t.test("clean closed-shadow properties and fractional RTL scroll remain byte-stable", async () => {
    await setViewportEnvironmentFixture(page, `
      <closed-clean-host id="closed-clean-host"></closed-clean-host>
      <main id="root" data-viz-surface><button id="candidate" aria-label="closed-clean-candidate">Candidate</button></main>`);
    const before = await page.locator("#closed-clean-host").evaluate((host) => {
      const shadow = host.attachShadow({ mode: "closed" });
      shadow.innerHTML = `<textarea>stable</textarea><div id="rtl" dir="rtl" style="height:30px;overflow:auto;width:80px"><div style="height:200px;width:300px">x</div></div>`;
      const textarea = shadow.querySelector("textarea")!;
      textarea.setSelectionRange(1, 4, "forward");
      const scroller = shadow.querySelector<HTMLElement>("#rtl")!;
      scroller.scrollLeft = -17.5;
      scroller.scrollTop = 23.5;
      (globalThis as typeof globalThis & { closedCleanShadow?: ShadowRoot }).closedCleanShadow = shadow;
      return {
        direction: textarea.selectionDirection,
        end: textarea.selectionEnd,
        left: scroller.scrollLeft,
        start: textarea.selectionStart,
        top: scroller.scrollTop
      };
    });
    await armViewportEnvironmentFixture(page);
    const findings = await audit();
    const after = await page.evaluate(() => {
      const shadow = (globalThis as typeof globalThis & { closedCleanShadow: ShadowRoot }).closedCleanShadow;
      const textarea = shadow.querySelector("textarea")!;
      const scroller = shadow.querySelector<HTMLElement>("#rtl")!;
      return {
        direction: textarea.selectionDirection,
        end: textarea.selectionEnd,
        left: scroller.scrollLeft,
        start: textarea.selectionStart,
        top: scroller.scrollTop
      };
    });
    assert.deepEqual(after, before);
    assert.deepEqual(findings.filter((finding) => finding.includes("closed-clean-candidate")), []);
  });
});

test("California viewport non-DOM and media epoch hard negatives", { timeout: 120_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`Physical Chrome is required for viewport epoch canaries: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const page = await createCaliforniaVisualizationUiAuditPage(browser);
  await installCaliforniaVisualizationUiAuditInit(page);
  const audit = () => collectVisualizationUiFindings(page.locator("#root"), axis("desktop"));

  await t.test("FontFace metric overrides restore and reject the changed environment", async () => {
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-font-metrics-candidate">Candidate</button></main>
      <script>
        globalThis.fontMetricsArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.fontMetricsArmed || scrollY >= 100) return;
          const face = globalThis.reviewMetricFace;
          face.sizeAdjust = "140%";
          face.ascentOverride = "72%";
          face.descentOverride = "18%";
          face.lineGapOverride = "10%";
          globalThis.fontMetricsArmed = false;
        });
      </script>`);
    const before = await page.evaluate(() => {
      const face = new FontFace("ReviewMetricFamily", "local(Arial)", {
        ascentOverride: "90%",
        descentOverride: "10%",
        lineGapOverride: "0%",
        sizeAdjust: "100%"
      } as FontFaceDescriptors);
      document.fonts.add(face);
      (globalThis as typeof globalThis & { reviewMetricFace: FontFace }).reviewMetricFace = face;
      return {
        ascentOverride: face.ascentOverride,
        descentOverride: face.descentOverride,
        lineGapOverride: face.lineGapOverride,
        sizeAdjust: (face as unknown as { sizeAdjust: string }).sizeAdjust
      };
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { fontMetricsArmed: boolean }).fontMetricsArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => {
      const face = (globalThis as typeof globalThis & { reviewMetricFace: FontFace }).reviewMetricFace;
      return {
        ascentOverride: face.ascentOverride,
        descentOverride: face.descentOverride,
        lineGapOverride: face.lineGapOverride,
        sizeAdjust: (face as unknown as { sizeAdjust: string }).sizeAdjust
      };
    });
    assert.deepEqual(after, before);
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-font-metrics-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-font-metrics-candidate")));
  });

  await t.test("canvas bitmap mutation restores and remains fail closed", async () => {
    await setViewportEnvironmentFixture(page, `
      <canvas id="outside-canvas" width="4" height="4"></canvas>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-canvas-candidate">Candidate</button></main>
      <script>
        globalThis.canvasStateArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.canvasStateArmed || scrollY >= 100) return;
          const context = document.querySelector("#outside-canvas").getContext("2d");
          context.fillStyle = "rgb(0, 0, 255)";
          context.fillRect(0, 0, 4, 4);
          globalThis.canvasStateArmed = false;
        });
      </script>`);
    await page.evaluate(() => {
      const context = document.querySelector<HTMLCanvasElement>("#outside-canvas")!.getContext("2d")!;
      context.fillStyle = "rgb(255, 0, 0)";
      context.fillRect(0, 0, 4, 4);
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { canvasStateArmed: boolean }).canvasStateArmed = true;
    });
    const findings = await audit();
    const rgba = await page.evaluate(() => Array.from(
      document.querySelector<HTMLCanvasElement>("#outside-canvas")!.getContext("2d")!
        .getImageData(0, 0, 1, 1).data
    ));
    assert.deepEqual(rgba, [255, 0, 0, 255]);
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-canvas-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-canvas-candidate")));
  });

  await t.test("WAAPI state mutation restores and remains fail closed", async () => {
    await setViewportEnvironmentFixture(page, `
      <div id="outside-animation" style="height:20px;width:20px"></div>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-waapi-candidate">Candidate</button></main>
      <script>
        globalThis.animationStateArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.animationStateArmed || scrollY >= 100) return;
          globalThis.reviewAnimation.currentTime = 4321;
          globalThis.reviewAnimation.playbackRate = 2;
          globalThis.reviewAnimation.play();
          globalThis.animationStateArmed = false;
        });
      </script>`);
    await page.evaluate(() => {
      const animation = document.querySelector<HTMLElement>("#outside-animation")!.animate(
        [{ transform: "translateX(0px)" }, { transform: "translateX(100px)" }],
        { duration: 100_000, iterations: Infinity }
      );
      animation.pause();
      animation.currentTime = 37;
      (globalThis as typeof globalThis & { reviewAnimation: Animation }).reviewAnimation = animation;
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { animationStateArmed: boolean }).animationStateArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => {
      const animation = (globalThis as typeof globalThis & { reviewAnimation: Animation }).reviewAnimation;
      return {
        currentTime: Number(animation.currentTime),
        playbackRate: animation.playbackRate,
        playState: animation.playState
      };
    });
    assert.deepEqual(after, { currentTime: 37, playbackRate: 1, playState: "paused" });
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-waapi-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-waapi-candidate")));
  });

  await t.test("same-origin iframe form, canvas, and scroll state restore and fail closed", async () => {
    await setViewportEnvironmentFixture(page, `
      <iframe id="outside-frame" srcdoc="<!doctype html><style>body{height:500px}</style><input id='frame-input' value='before'><canvas id='frame-canvas' width='2' height='2'></canvas>"></iframe>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-iframe-candidate">Candidate</button></main>
      <script>
        globalThis.iframeStateArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.iframeStateArmed) return;
          const frame = document.querySelector("#outside-frame").contentWindow;
          frame.document.querySelector("#frame-input").value = "after";
          const context = frame.document.querySelector("#frame-canvas").getContext("2d");
          context.fillStyle = "rgb(0, 0, 255)";
          context.fillRect(0, 0, 2, 2);
          frame.scrollTo(0, 123);
          globalThis.iframeStateArmed = false;
        });
      </script>`);
    await page.locator("#outside-frame").contentFrame().locator("#frame-input").waitFor();
    await page.locator("#outside-frame").evaluate((frame) => {
      const context = (frame as HTMLIFrameElement).contentDocument!
        .querySelector<HTMLCanvasElement>("#frame-canvas")!.getContext("2d")!;
      context.fillStyle = "rgb(255, 0, 0)";
      context.fillRect(0, 0, 2, 2);
    });
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { iframeStateArmed: boolean }).iframeStateArmed = true;
    });
    const findings = await audit();
    const after = await page.locator("#outside-frame").evaluate((frame) => {
      const win = (frame as HTMLIFrameElement).contentWindow!;
      const context = win.document.querySelector<HTMLCanvasElement>("#frame-canvas")!.getContext("2d")!;
      return {
        rgba: Array.from(context.getImageData(0, 0, 1, 1).data),
        scrollY: win.scrollY,
        value: win.document.querySelector<HTMLInputElement>("#frame-input")!.value
      };
    });
    assert.deepEqual(after, { rgba: [255, 0, 0, 255], scrollY: 0, value: "before" });
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-iframe-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-iframe-candidate")));
  });

  await t.test("media properties restore and remain fail closed", async () => {
    await setViewportEnvironmentFixture(page, `
      <video id="outside-video"></video>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-media-candidate">Candidate</button></main>
      <script>
        globalThis.mediaStateArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.mediaStateArmed) return;
          const video = document.querySelector("#outside-video");
          video.defaultPlaybackRate = 1.75;
          video.playbackRate = 1.5;
          video.volume = 0.25;
          video.muted = true;
          globalThis.mediaStateArmed = false;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { mediaStateArmed: boolean }).mediaStateArmed = true;
    });
    const findings = await audit();
    const after = await page.locator("#outside-video").evaluate((node) => {
      const video = node as HTMLVideoElement;
      return {
        defaultPlaybackRate: video.defaultPlaybackRate,
        muted: video.muted,
        playbackRate: video.playbackRate,
        volume: video.volume
      };
    });
    assert.deepEqual(after, { defaultPlaybackRate: 1, muted: false, playbackRate: 1, volume: 1 });
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-media-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-media-candidate")));
  });

  await t.test("CSSAnimation and CSSTransition state restore and fail closed", async () => {
    await setViewportEnvironmentFixture(page, `
      <div id="outside-css-animation"></div><div id="outside-css-transition"></div>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-css-animation-candidate">Candidate</button></main>
      <script>
        globalThis.cssAnimationArmed = false;
        addEventListener("scroll", () => {
          if (!globalThis.cssAnimationArmed) return;
          for (const animation of globalThis.reviewCssAnimations) {
            animation.currentTime = 4567;
            animation.playbackRate = 2;
            animation.play();
          }
          globalThis.cssAnimationArmed = false;
        });
      </script>`, `<style>
        @keyframes review-slide { from { transform:translateX(0) } to { transform:translateX(50px) } }
        #outside-css-animation { animation: review-slide 100s linear infinite paused; height:10px; width:10px }
        #outside-css-transition { height:10px; transition: width 100s linear; width:10px }
      </style>`);
    const initialKinds = await page.evaluate(async () => {
      const transitionNode = document.querySelector<HTMLElement>("#outside-css-transition")!;
      transitionNode.getBoundingClientRect();
      transitionNode.style.width = "100px";
      transitionNode.getBoundingClientRect();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const animations = [
        ...document.querySelector<HTMLElement>("#outside-css-animation")!.getAnimations(),
        ...transitionNode.getAnimations()
      ];
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 31;
      }
      (globalThis as typeof globalThis & { reviewCssAnimations: Animation[] }).reviewCssAnimations = animations;
      return animations.map((animation) => animation.constructor.name);
    });
    assert.ok(initialKinds.includes("CSSAnimation") && initialKinds.includes("CSSTransition"));
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { cssAnimationArmed: boolean }).cssAnimationArmed = true;
    });
    const findings = await audit();
    const after = await page.evaluate(() => (
      (globalThis as typeof globalThis & { reviewCssAnimations: Animation[] }).reviewCssAnimations.map(
        (animation) => ({
          currentTime: Number(animation.currentTime),
          kind: animation.constructor.name,
          playbackRate: animation.playbackRate,
          playState: animation.playState
        })
      )
    ));
    assert.ok(after.every((state) => state.currentTime === 31 && state.playbackRate === 1 && state.playState === "paused"),
      JSON.stringify(after));
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-css-animation-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-css-animation-candidate")));
  });

  await t.test("late timer lineage remains pending through the restore fence", async () => {
    await setViewportEnvironmentFixture(page, `
      <input id="outside-late" value="before">
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-late-timer-candidate">Candidate</button></main>
      <script>
        globalThis.lateTimerArmed = false;
        globalThis.lateTimerFired = false;
        addEventListener("scroll", () => {
          if (!globalThis.lateTimerArmed || scrollY >= 100) return;
          setTimeout(() => {
            document.querySelector("#outside-late").value = "after";
            globalThis.lateTimerFired = true;
          }, 180);
          globalThis.lateTimerArmed = false;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { lateTimerArmed: boolean }).lateTimerArmed = true;
    });
    const findings = await audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { lateTimerFired?: boolean }).lateTimerFired === true
    );
    assert.equal(await page.locator("#outside-late").inputValue(), "before");
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-late-timer-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-late-timer-candidate")));
  });

  await t.test("nested eight-frame rAF lineage remains pending through the restore fence", async () => {
    await setViewportEnvironmentFixture(page, `
      <input id="outside-raf" value="before">
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-late-raf-candidate">Candidate</button></main>
      <script>
        globalThis.lateRafArmed = false;
        globalThis.lateRafFired = false;
        addEventListener("scroll", () => {
          if (!globalThis.lateRafArmed || scrollY >= 100) return;
          let frames = 0;
          const tick = () => {
            frames += 1;
            if (frames < 8) return requestAnimationFrame(tick);
            document.querySelector("#outside-raf").value = "after";
            globalThis.lateRafFired = true;
          };
          requestAnimationFrame(tick);
          globalThis.lateRafArmed = false;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { lateRafArmed: boolean }).lateRafArmed = true;
    });
    const findings = await audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { lateRafFired?: boolean }).lateRafFired === true
    );
    assert.equal(await page.locator("#outside-raf").inputValue(), "before");
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-late-raf-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-late-raf-candidate")));
  });

  await t.test("same-return CSSOM mutation increments a monotonic non-DOM epoch", async () => {
    await setViewportEnvironmentFixture(page, `
      <div class="outside-rule-target">Outside</div>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-same-cssom-candidate">Candidate</button></main>
      <script>
        globalThis.sameValueCssomArmed = false;
        globalThis.sameValueCssomTrace = [];
        addEventListener("scroll", () => {
          if (!globalThis.sameValueCssomArmed || scrollY >= 100) return;
          const rule = document.querySelector("#outside-rule-style").sheet.cssRules[0];
          rule.style.color = "blue";
          globalThis.sameValueCssomTrace.push(rule.style.color);
          queueMicrotask(() => {
            rule.style.color = "red";
            globalThis.sameValueCssomTrace.push(rule.style.color);
          });
          globalThis.sameValueCssomArmed = false;
        });
      </script>`, `<style id="outside-rule-style">.outside-rule-target { color: red; }</style>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { sameValueCssomArmed: boolean }).sameValueCssomArmed = true;
    });
    const findings = await audit();
    const trace = await page.evaluate(() =>
      (globalThis as typeof globalThis & { sameValueCssomTrace: string[] }).sameValueCssomTrace
    );
    assert.deepEqual(trace, ["blue", "red"]);
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-same-cssom-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-same-cssom-candidate")));
  });

  await t.test("print media emulation during audit remains fail closed", async () => {
    await page.emulateMedia({ media: "screen" });
    await setViewportEnvironmentFixture(page, `
      <div id="outside-print">Outside</div>
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-print-candidate">Candidate</button></main>
      <script>
        globalThis.printAuditArmed = false;
        globalThis.printAuditScroll = false;
        addEventListener("scroll", () => {
          if (globalThis.printAuditArmed) globalThis.printAuditScroll = true;
        });
      </script>`, `<style>@media print { #outside-print { width: 333px; } }</style>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { printAuditArmed: boolean }).printAuditArmed = true;
    });
    const auditPromise = audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { printAuditScroll?: boolean }).printAuditScroll === true
    );
    await page.emulateMedia({ media: "print" });
    const findings = await auditPromise;
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-print-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-print-candidate")));
    await page.emulateMedia({ media: "screen" });
  });

  await t.test("color-scheme one-way change is observed before the restore fence", async () => {
    await page.emulateMedia({ colorScheme: "light", media: "screen" });
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-color-one-way-candidate">Candidate</button></main>
      <script>
        globalThis.colorAuditArmed = false;
        globalThis.colorAuditScroll = false;
        addEventListener("scroll", () => {
          if (globalThis.colorAuditArmed) globalThis.colorAuditScroll = true;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { colorAuditArmed: boolean }).colorAuditArmed = true;
    });
    const auditPromise = audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { colorAuditScroll?: boolean }).colorAuditScroll === true
    );
    await page.emulateMedia({ colorScheme: "dark", media: "screen" });
    const findings = await auditPromise;
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-color-one-way-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-color-one-way-candidate")));
    await page.emulateMedia({ colorScheme: "light", media: "screen" });
  });

  await t.test("same-return color-scheme change increments a monotonic publisher epoch", async () => {
    await page.emulateMedia({ colorScheme: "light", media: "screen" });
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-color-roundtrip-candidate">Candidate</button></main>
      <script>
        globalThis.sameMediaArmed = false;
        globalThis.sameMediaScroll = false;
        addEventListener("scroll", () => {
          if (globalThis.sameMediaArmed) globalThis.sameMediaScroll = true;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { sameMediaArmed: boolean }).sameMediaArmed = true;
    });
    const auditPromise = audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { sameMediaScroll?: boolean }).sameMediaScroll === true
    );
    await page.emulateMedia({ colorScheme: "dark", media: "screen" });
    await page.emulateMedia({ colorScheme: "light", media: "screen" });
    const findings = await auditPromise;
    assert.equal(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches), false);
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-color-roundtrip-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-color-roundtrip-candidate")));
  });

  await t.test("pre-captured CDP color-scheme round trip increments a protocol epoch", async () => {
    const protocolSession = await page.context().newCDPSession(page);
    const rawProtocolSend = protocolSession.send.bind(protocolSession);
    const setColorScheme = (value: "dark" | "light") => rawProtocolSend(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-color-scheme", value }], media: "screen" }
    );
    try {
      await setColorScheme("light");
      await setViewportEnvironmentFixture(page, `
        <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-protocol-color-candidate">Candidate</button></main>
        <script>
          globalThis.protocolColorArmed = false;
          globalThis.protocolColorScroll = false;
          addEventListener("scroll", () => {
            if (globalThis.protocolColorArmed) globalThis.protocolColorScroll = true;
          });
        </script>`, `<style>@media (prefers-color-scheme: dark) { body { color: white; } }</style>`);
      await armViewportEnvironmentFixture(page);
      await page.evaluate(() => {
        (globalThis as typeof globalThis & { protocolColorArmed: boolean }).protocolColorArmed = true;
      });
      const auditPromise = audit();
      await page.waitForFunction(() =>
        (globalThis as typeof globalThis & { protocolColorScroll?: boolean }).protocolColorScroll === true
      );
      await setColorScheme("dark");
      await setColorScheme("light");
      const findings = await auditPromise;
      assert.equal(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches), false);
      assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-protocol-color-candidate"),
        JSON.stringify(viewportCandidateFindings(findings, "epoch-protocol-color-candidate")));
    } finally {
      await protocolSession.detach().catch(() => undefined);
    }
  });

  await t.test("layout and visual viewport mutation increments a publisher epoch", async () => {
    await page.setViewportSize({ height: 600, width: 800 });
    await setViewportEnvironmentFixture(page, `
      <main id="root" data-viz-surface><button id="candidate" aria-label="epoch-viewport-resize-candidate">Candidate</button></main>
      <script>
        globalThis.resizeAuditArmed = false;
        globalThis.resizeAuditScroll = false;
        addEventListener("scroll", () => {
          if (globalThis.resizeAuditArmed) globalThis.resizeAuditScroll = true;
        });
      </script>`);
    await armViewportEnvironmentFixture(page);
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { resizeAuditArmed: boolean }).resizeAuditArmed = true;
    });
    const auditPromise = audit();
    await page.waitForFunction(() =>
      (globalThis as typeof globalThis & { resizeAuditScroll?: boolean }).resizeAuditScroll === true
    );
    await page.setViewportSize({ height: 650, width: 850 });
    const findings = await auditPromise;
    assert.ok(viewportEnvironmentFailsClosed(findings, "epoch-viewport-resize-candidate"),
      JSON.stringify(viewportCandidateFindings(findings, "epoch-viewport-resize-candidate")));
    await page.setViewportSize({ height: 600, width: 800 });
  });
});

test("California Visualization UI audit synthetic canaries", { timeout: 30_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the UI audit canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());

  const page = await createCaliforniaVisualizationUiAuditPage(browser);

  const adjacent = await renderAndCollect(page, `
    <div style="display:flex;gap:24px;padding:24px;font-size:20px">
      <span>Adjacent left</span>
      <span>Adjacent right</span>
    </div>
  `, "desktop");
  assert.deepEqual(matching(adjacent, "dom-text-overlap:"), [], "adjacent DOM text must not collide");

  const overlappingText = await renderAndCollect(page, `
    <span style="position:absolute;left:32px;top:32px;font-size:24px">ALPHA</span>
    <span style="position:absolute;left:32px;top:32px;font-size:24px">BRAVO</span>
  `, "desktop");
  assert.ok(
    overlappingText.some((finding) => finding.startsWith("dom-text-overlap:") && finding.includes("ALPHA") && finding.includes("BRAVO")),
    "independent absolute DOM text at the same coordinates must fail"
  );

  const overlappingDivAndSvgText = await renderAndCollect(page, `
    <div style="position:absolute;left:24px;top:24px;font-size:22px">DIV ALPHA</div>
    <div style="position:absolute;left:24px;top:24px;font-size:22px">DIV BRAVO</div>
    <svg style="position:absolute;left:20px;top:90px;width:240px;height:80px" viewBox="0 0 240 80">
      <text x="12" y="36" font-size="22">SVG ALPHA</text>
      <text x="12" y="36" font-size="22">SVG BRAVO</text>
    </svg>
  `, "desktop");
  assert.ok(
    overlappingDivAndSvgText.some((finding) => finding.startsWith("dom-text-overlap:") && finding.includes("DIV ALPHA") && finding.includes("DIV BRAVO")),
    "direct text nodes in generic div elements must participate in collision checks"
  );
  assert.ok(
    overlappingDivAndSvgText.some((finding) => finding.startsWith("dom-text-overlap:") && finding.includes("SVG ALPHA") && finding.includes("SVG BRAVO")),
    "SVG text client rects must participate in collision checks"
  );

  const overlappingRelatedText = await renderAndCollect(page, `
    <p style="position:absolute;left:20px;top:20px;margin:0;font-size:20px">
      Ancestor<span style="position:absolute;left:0;top:0">Nested</span>
    </p>
    <button
      aria-label="same-control"
      style="position:absolute;left:20px;top:100px;width:160px;height:44px"
      type="button"
    >
      <span style="position:absolute;left:24px;top:10px">Layer one</span>
      <span style="position:absolute;left:24px;top:10px">Layer two</span>
    </button>
  `, "desktop");
  assert.ok(
    overlappingRelatedText.some((finding) =>
      finding.startsWith("dom-text-overlap:") && finding.includes("Ancestor") && finding.includes("Nested")
    ),
    "overlapping ancestor and descendant text must fail"
  );
  assert.ok(
    overlappingRelatedText.some((finding) =>
      finding.startsWith("dom-text-overlap:") && finding.includes("Layer one") && finding.includes("Layer two")
    ),
    "overlapping text runs inside one control must fail"
  );

  const nonOverlappingRelatedText = await renderAndCollect(page, `
    <p style="position:absolute;left:20px;top:20px;margin:0;font-size:20px">
      Ancestor <span>Nested</span>
    </p>
    <button aria-label="same-control-adjacent" type="button"
      style="position:absolute;left:20px;top:100px;display:flex;width:180px;height:44px;align-items:center;gap:16px">
      <span>Layer one</span><span>Layer two</span>
    </button>
  `, "desktop");
  assert.deepEqual(
    matching(nonOverlappingRelatedText, "dom-text-overlap:"),
    [],
    "adjacent ancestor/descendant and same-control text must remain green"
  );

  const sameParentSplitTextNodes = await renderAndCollect(page, `
    <div style="position:absolute;left:20px;top:40px;font-size:24px;white-space:pre;word-spacing:-90px">SAMEPARENTALPHA<!-- split text-node identity --> SAMEPARENTBRAVO</div>
  `, "desktop");
  assert.ok(
    sameParentSplitTextNodes.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("SAMEPARENTALPHA") &&
      finding.includes("SAMEPARENTBRAVO")
    ),
    "overlapping tokens from distinct Text nodes sharing one parent must fail"
  );

  const whitespaceGap = await renderAndCollect(page, `
    <span style="position:absolute;left:20px;top:28px;white-space:pre;font-size:20px">LEFT                    RIGHT</span>
    <span style="position:absolute;left:105px;top:28px;font-size:20px">MID</span>
  `, "desktop");
  assert.deepEqual(
    matching(whitespaceGap, "dom-text-overlap:"),
    [],
    "text collision ranges must measure non-whitespace tokens instead of the empty gap between words"
  );

  const hiddenAncestor = await renderAndCollect(page, `
    <div style="opacity:0">
      <span style="position:absolute;left:32px;top:32px;font-size:24px">HIDDEN ALPHA</span>
      <span style="position:absolute;left:32px;top:32px;font-size:24px">HIDDEN BRAVO</span>
    </div>
    <span style="position:absolute;left:20px;top:120px;font-size:20px">Visible control text</span>
  `, "desktop");
  assert.deepEqual(
    matching(hiddenAncestor, "dom-text-overlap:"),
    [],
    "text hidden by an ancestor must not participate in collision checks"
  );

  const visibleAriaHiddenAndInertText = await renderAndCollect(page, `
    <div aria-hidden="true">
      <span style="position:absolute;left:32px;top:32px;font-size:24px">ARIA TEXT ALPHA</span>
      <span style="position:absolute;left:32px;top:32px;font-size:24px">ARIA TEXT BRAVO</span>
    </div>
    <div inert>
      <span style="position:absolute;left:32px;top:112px;font-size:24px">INERT TEXT ALPHA</span>
      <span style="position:absolute;left:32px;top:112px;font-size:24px">INERT TEXT BRAVO</span>
    </div>
  `, "desktop");
  assert.ok(
    visibleAriaHiddenAndInertText.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("ARIA TEXT ALPHA") && finding.includes("ARIA TEXT BRAVO")
    ),
    "visible aria-hidden text must participate in collision checks"
  );
  assert.ok(
    visibleAriaHiddenAndInertText.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("INERT TEXT ALPHA") && finding.includes("INERT TEXT BRAVO")
    ),
    "visible inert text must participate in collision checks"
  );

  const physicallyClippedText = await renderAndCollect(page, `
    <div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">
      <span style="position:absolute;left:0;top:0;font-size:24px">PHYSICALLY CLIPPED ALPHA</span>
      <span style="position:absolute;left:0;top:0;font-size:24px">PHYSICALLY CLIPPED BRAVO</span>
    </div>
  `, "desktop");
  assert.ok(
    !physicallyClippedText.some((finding) => finding.includes("PHYSICALLY CLIPPED")),
    "computed physical clipping, rather than an sr-only class-name exemption, excludes hidden paint"
  );

  const generatedAndReplacedText = await renderAndCollect(page, `
    <style>
      [data-generated-label]::after {
        content: "GENERATED COLLISION";
        position: absolute;
        left: 20px;
        top: 20px;
        font-size: 20px;
        pointer-events: none;
      }
      [data-empty-generated-label]::after { content: ""; pointer-events: none; }
    </style>
    <div aria-label="generated-text-origin" data-generated-label></div>
    <div aria-label="empty-generated-text-origin" data-empty-generated-label></div>
    <span style="position:absolute;left:20px;top:20px;font-size:20px">DOM COLLISION</span>
    <input aria-label="placeholder-text-control" placeholder="PLACEHOLDER" value=""
      style="position:absolute;left:20px;top:80px;width:180px;height:44px">
    <span style="position:absolute;left:24px;top:90px;font-size:18px">INPUT OVERLAY</span>
    <select aria-label="closed-select-text-control"
      style="position:absolute;left:240px;top:80px;width:180px;height:44px">
      <option selected>SELECTED VALUE</option>
    </select>
    <span style="position:absolute;left:244px;top:90px;font-size:18px">SELECT OVERLAY</span>
    <input aria-label="input-value-text-control" value="CURRENT VALUE"
      style="position:absolute;left:20px;top:140px;width:180px;height:44px">
    <span style="position:absolute;left:24px;top:150px;font-size:18px">VALUE OVERLAY</span>
  `, "desktop");
  assert.ok(
    generatedAndReplacedText.some((finding) =>
      finding.startsWith("text-generated-content-unsupported:") && finding.includes("generated-text-origin")
    ),
    "visible generated and replaced form text must participate in collision evidence"
  );
  assert.ok(
    !generatedAndReplacedText.some((finding) => finding.includes("empty-generated-text-origin")),
    "empty generated content remains a product-compatible non-text decoration"
  );
  for (const [control, overlay] of [
    ["placeholder-text-control", "INPUT OVERLAY"],
    ["closed-select-text-control", "SELECT OVERLAY"],
    ["input-value-text-control", "VALUE OVERLAY"]
  ] as const) {
    assert.ok(
      generatedAndReplacedText.some((finding) =>
        finding.startsWith("dom-text-overlap:") && finding.includes(control) && finding.includes(overlay)
      ),
      `${control} conservative displayed-text paint must collide with ${overlay}`
    );
  }

  const clippedAuthorFormText = await renderAndCollect(page, `
    <input aria-label="long-input-value-control"
      value="THIS AUTHOR VALUE IS FAR LONGER THAN THE AVAILABLE INPUT WIDTH"
      style="position:absolute;left:20px;top:20px;width:82px;height:44px;font:16px Arial">
    <select aria-label="long-select-value-control"
      style="position:absolute;left:140px;top:20px;width:82px;height:44px;font:16px Arial">
      <option selected>THIS SELECTED OPTION IS FAR TOO LONG</option>
    </select>
    <select aria-label="long-select-option-label-control"
      style="position:absolute;left:260px;top:20px;width:82px;height:44px;font:16px Arial">
      <option label="THIS OPTION LABEL IS FAR TOO LONG" selected>X</option>
    </select>
  `, "desktop");
  for (const control of [
    "long-input-value-control",
    "long-select-value-control",
    "long-select-option-label-control"
  ]) {
    assert.ok(
      clippedAuthorFormText.some((finding) =>
        finding.startsWith("text-form-clipped-x:") && finding.includes(control)
      ),
      "long author form values and selected options must fail when typography exceeds the content box"
    );
  }

  const ordinaryNativeFormText = await renderAndCollect(page, `
    <select aria-label="native-select-positive"
      style="position:absolute;left:20px;top:20px;width:180px;height:44px;font:16px Arial">
      <option selected>Short choice</option>
    </select>
    <input aria-label="native-search-positive" type="search" value="Find"
      style="position:absolute;left:230px;top:20px;width:180px;height:44px;font:16px Arial">
  `, "desktop");
  for (const control of ["native-select-positive", "native-search-positive"]) {
    assert.deepEqual(
      ordinaryNativeFormText.filter((finding) => finding.includes(control)),
      [],
      "ordinary native select and search author text must remain measurable without treating browser chrome as unknown text"
    );
  }

  const degenerateFormContentBox = await renderAndCollect(page, `
    <input aria-label="degenerate-form-content-control" value="VISIBLE AUTHOR TEXT"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px;padding:0 30px;font:16px Arial">
  `, "desktop");
  assert.ok(
    degenerateFormContentBox.some((finding) =>
      finding.startsWith("text-form-measurement-unsupported:input(degenerate-form-content-control):content-box")
    ),
    "visible author form text with no measurable content box must fail closed"
  );

  const inaccessibleNativeFormChrome = await renderAndCollect(page, `
    <input aria-label="hidden-native-file-control" type="file" hidden>
    <input aria-label="display-none-native-date-control" type="date" style="display:none">
  `, "desktop");
  assert.ok(
    !inaccessibleNativeFormChrome.some((finding) =>
      finding.includes("hidden-native-file-control") || finding.includes("display-none-native-date-control")
    ),
    "inaccessible native UA form chrome must remain outside the visible-text audit"
  );

  const generatedReplacementCoverage = await renderAndCollect(page, `
    <style>
      [aria-label="marker-text-list"]::marker { content: "MARKER TEXT "; }
    </style>
    <img aria-label="broken-alt-image" src="data:image/png;base64,definitely-broken"
      alt="BROKEN AUTHOR ALT" width="100" height="30">
    <ol style="position:absolute;left:20px;top:70px">
      <li aria-label="marker-text-list">List item</li>
    </ol>
    <input aria-label="native-file-ua-control" type="file"
      style="position:absolute;left:20px;top:120px;width:180px;height:44px">
    <input aria-label="native-date-ua-control" type="date"
      style="position:absolute;left:230px;top:120px;width:180px;height:44px">
    <input aria-label="native-submit-default-label-control" type="submit"
      style="position:absolute;left:20px;top:175px;width:180px;height:44px">
    <input aria-label="native-reset-default-label-control" type="reset"
      style="position:absolute;left:230px;top:175px;width:180px;height:44px">
  `, "desktop");
  assert.ok(
    generatedReplacementCoverage.some((finding) =>
      finding.startsWith("broken-replaced-content:img(broken-alt-image)")
    ),
    "broken image alt, marker text, and inaccessible UA text must fail closed"
  );
  assert.ok(
    generatedReplacementCoverage.some((finding) =>
      finding.startsWith("text-generated-content-unsupported:li(marker-text-list):::marker")
    ),
    "broken image alt, marker text, and inaccessible UA text must fail closed"
  );
  for (const control of [
    "native-file-ua-control",
    "native-date-ua-control",
    "native-submit-default-label-control",
    "native-reset-default-label-control"
  ]) {
    assert.ok(
      generatedReplacementCoverage.some((finding) =>
        finding.startsWith("text-ua-shadow-unsupported:") && finding.includes(control)
      ),
      "broken image alt, marker text, and inaccessible UA text must fail closed"
    );
  }

  const unsupportedTextPaint = await renderAndCollect(page, `
    <span aria-label="legacy-clipped-visible-text"
      style="position:absolute;left:20px;top:20px;width:180px;height:28px;clip:rect(0px,80px,28px,0px);font-size:20px">LEGACY CLIPPED TEXT</span>
    <span aria-label="clip-path-visible-text"
      style="position:absolute;left:20px;top:60px;font-size:20px;clip-path:inset(0 20px 0 0)">CLIP PATH TEXT</span>
    <span aria-label="masked-visible-text"
      style="position:absolute;left:20px;top:100px;font-size:20px;mask-image:linear-gradient(black,transparent);-webkit-mask-image:linear-gradient(black,transparent)">MASKED TEXT</span>
    <span aria-label="rotated-visible-text"
      style="position:absolute;left:240px;top:20px;font-size:20px;transform:rotate(8deg)">ROTATED TEXT</span>
    <span aria-label="axis-translated-visible-text"
      style="position:absolute;left:240px;top:100px;font-size:20px;transform:translateX(4px)">SUPPORTED TEXT</span>
    <div aria-label="unsupported-text-paint-ancestor"
      style="position:absolute;left:20px;top:150px;transform:rotate(0.25deg);clip:rect(0px,180px,28px,0px);clip-path:inset(0);mask-image:linear-gradient(black,black);-webkit-mask-image:linear-gradient(black,black)">
      <span aria-label="ancestor-unsupported-visible-text" style="font-size:20px">ANCESTOR GEOMETRY TEXT</span>
    </div>
  `, "desktop");
  for (const [label, reason] of [
    ["legacy-clipped-visible-text", "legacy-clip"],
    ["clip-path-visible-text", "clip-path"],
    ["masked-visible-text", "mask-image"],
    ["rotated-visible-text", "non-axis-transform"]
  ] as const) {
    assert.ok(
      unsupportedTextPaint.some((finding) =>
        finding.startsWith("text-paint-unsupported:") && finding.includes(label) && finding.includes(reason)
      ),
      `visible text under legacy clip, clip-path, mask, or non-axis transform must fail closed: ${label}`
    );
  }
  assert.ok(
    !unsupportedTextPaint.some((finding) =>
      finding.startsWith("text-paint-unsupported:") && finding.includes("axis-translated-visible-text")
    ),
    "axis-aligned translated text remains a product-compatible positive"
  );
  for (const reason of ["legacy-clip", "clip-path", "mask-image", "non-axis-transform"]) {
    assert.ok(
      unsupportedTextPaint.some((finding) =>
        finding.startsWith("text-paint-unsupported:span(ancestor-unsupported-visible-text)") &&
        finding.includes("ancestor(div(unsupported-text-paint-ancestor))") && finding.includes(reason)
      ),
      `ancestor unsupported paint geometry must fail closed: ${reason}`
    );
  }

  const unsupportedScaleText = await renderAndCollect(page, `
    <span aria-label="scaled-text-control"
      style="position:absolute;left:20px;top:20px;display:inline-block;font-size:20px;transform:scaleX(.001);transform-origin:left">
      AXIS SCALED TEXT
    </span>
    <span aria-label="reflected-text-control"
      style="position:absolute;left:20px;top:70px;display:inline-block;font-size:20px;transform:scaleX(-1);transform-origin:left">
      REFLECTED TEXT
    </span>
    <span aria-label="individual-scaled-text-control"
      style="position:absolute;left:20px;top:120px;display:inline-block;font-size:20px;scale:.001;transform-origin:left">
      INDIVIDUAL SCALE TEXT
    </span>
  `, "desktop");
  assert.ok(
    unsupportedScaleText.some((finding) =>
      finding.startsWith("text-paint-degenerate:span(scaled-text-control)")
    ) && unsupportedScaleText.some((finding) =>
      finding.startsWith("text-paint-unsupported:span(scaled-text-control)") &&
      finding.includes("non-unit-transform")
    ),
    "axis scale, reflection, and degenerate text transforms must fail closed"
  );
  assert.ok(
    unsupportedScaleText.some((finding) =>
      finding.startsWith("text-paint-unsupported:span(reflected-text-control)") &&
      finding.includes("non-unit-transform")
    ),
    "axis scale, reflection, and degenerate text transforms must fail closed"
  );
  assert.ok(
    unsupportedScaleText.some((finding) =>
      finding.startsWith("text-paint-unsupported:span(individual-scaled-text-control)") &&
      finding.includes("individual-scale")
    ),
    "axis scale, reflection, and degenerate text transforms must fail closed"
  );

  const unsupportedPaintClipping = await renderAndCollect(page, `
    <div aria-label="paint-containment-ancestor"
      style="position:absolute;left:20px;top:20px;width:70px;height:28px;contain:paint;overflow:visible">
      <span aria-label="paint-contained-text" style="position:absolute;left:55px;white-space:nowrap;font-size:20px">
        PAINT CONTAINED TEXT
      </span>
    </div>
    <div aria-label="rounded-overflow-ancestor"
      style="position:absolute;left:20px;top:80px;width:70px;height:28px;overflow:hidden;border-radius:14px">
      <span aria-label="rounded-overflow-text" style="position:absolute;left:55px;white-space:nowrap;font-size:20px">
        ROUNDED OVERFLOW TEXT
      </span>
    </div>
    <div aria-label="overflow-clip-margin-ancestor"
      style="position:absolute;left:20px;top:140px;width:70px;height:28px;overflow:clip;overflow-clip-margin:8px">
      <span aria-label="overflow-clip-margin-text" style="position:absolute;left:55px;white-space:nowrap;font-size:20px">
        CLIP MARGIN TEXT
      </span>
    </div>
  `, "desktop");
  for (const [label, reason] of [
    ["paint-contained-text", "paint-containment"],
    ["rounded-overflow-text", "rounded-overflow-clip"],
    ["overflow-clip-margin-text", "overflow-clip-margin"]
  ] as const) {
    assert.ok(
      unsupportedPaintClipping.some((finding) =>
        finding.startsWith(`text-paint-unsupported:span(${label})`) && finding.includes(reason)
      ),
      "paint containment, rounded overflow, and overflow clip margins must fail closed"
    );
  }

  const nearThresholdTextCollision = await renderAndCollect(page, `
    <span style="position:absolute;left:20px;top:20px;font:20px/20px monospace;white-space:pre">AAAAAAAAAA</span>
    <span style="position:absolute;left:calc(20px + 10ch - 1.5px);top:20px;font:20px/20px monospace;white-space:pre">BBBBBBBBBB</span>
    <span style="position:absolute;left:20px;top:100px;font:20px/20px monospace;white-space:pre">CCCCCCCCCCCCCCCCCCCC</span>
    <span style="position:absolute;left:calc(20px + 18.5ch);top:100px;font:20px/20px monospace;white-space:pre">DDDDDDDDDDDDDDDDDDDD</span>
  `, "desktop");
  assert.ok(
    nearThresholdTextCollision.some((finding) =>
      finding.startsWith("dom-text-overlap:") && finding.includes("AAAAAAAAAA") && finding.includes("BBBBBBBBBB")
    ) && nearThresholdTextCollision.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("CCCCCCCCCCCCCCCCCCCC") && finding.includes("DDDDDDDDDDDDDDDDDDDD")
    ),
    "sub-two-pixel and seven-point-five-percent text collisions must fail"
  );

  const clippedByAncestor = await renderAndCollect(page, `
    <div style="position:absolute;left:20px;top:20px;width:82px;height:40px;overflow:hidden">
      <p style="width:260px;margin:0;white-space:nowrap;font-size:20px">Ancestor clips this sentence</p>
    </div>
  `, "desktop");
  assert.ok(
    clippedByAncestor.some((finding) => finding.startsWith("text-clipped-by-ancestor-x:")),
    "text clipped by a hidden-overflow ancestor must fail even when the text element itself uses visible overflow"
  );

  const desktopThirtyEightShellControls = await renderAndCollect(page, `
    <div style="display:flex;gap:16px">
      <a aria-label="shell-back" href="#labs" style="display:inline-flex;width:136px;height:38px">Back</a>
      <button aria-label="shell-copy-link" style="width:120px;height:38px" type="button">Copy link</button>
      <button aria-label="shell-copy-snapshot" style="width:91px;height:38px" type="button">Copy</button>
    </div>
  `, "desktop");
  for (const control of ["a(shell-back)", "button(shell-copy-link)", "button(shell-copy-snapshot)"]) {
    assert.ok(
      desktopThirtyEightShellControls.some((finding) =>
        finding.startsWith(`touch-target-small:${control}`) && finding.endsWith(":desktop")
      ),
      `${control} at 38px tall must fail the desktop 44px learner hit-target gate`
    );
  }

  const desktopFortyFour = await renderAndCollect(page, `
    <button aria-label="desktop-forty-four" style="width:44px;height:44px" type="button">44</button>
  `, "desktop");
  assert.ok(
    !desktopFortyFour.some((finding) => finding.startsWith("touch-target-small:button(desktop-forty-four)")),
    "a 44 by 44 desktop button must satisfy the desktop gate"
  );

  const mobileThirtyTwo = await renderAndCollect(page, `
    <button aria-label="thirty-two" style="width:32px;height:32px" type="button">32</button>
  `, "mobile");
  assert.ok(
    mobileThirtyTwo.some((finding) => finding.startsWith("touch-target-small:button(thirty-two)") && finding.endsWith(":mobile")),
    "a 32 by 32 mobile button must fail the 44px mobile gate"
  );

  const mobileFortyFour = await renderAndCollect(page, `
    <button aria-label="forty-four" style="width:44px;height:44px" type="button">44</button>
  `, "mobile");
  assert.ok(
    !mobileFortyFour.some((finding) => finding.startsWith("touch-target-small:button(forty-four)")),
    "a 44 by 44 mobile button must satisfy the mobile gate"
  );

  const desktopUndersizedSliderHitAreas = await renderAndCollect(page, `
    <label style="display:flex;width:180px;height:38px;align-items:center">
      <input aria-label="desktop-label-hit-slider" style="width:160px;height:16px" type="range" min="0" max="10" value="5">
    </label>
    <div data-viz-hit-target style="position:absolute;left:20px;top:70px;display:flex;width:180px;height:38px;align-items:center">
      <div aria-label="desktop-explicit-hit-slider" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="10" aria-valuenow="5"
        style="width:160px;height:16px"></div>
    </div>
  `, "desktop");
  assert.ok(
    desktopUndersizedSliderHitAreas.some((finding) =>
      finding.startsWith("touch-target-small:input(desktop-label-hit-slider)") && finding.endsWith(":desktop")
    ),
    "a native range with only a 38px label hit area must fail the desktop 44px gate"
  );
  assert.ok(
    desktopUndersizedSliderHitAreas.some((finding) =>
      finding.startsWith("touch-target-small:div(desktop-explicit-hit-slider)") && finding.endsWith(":desktop")
    ),
    "an ARIA slider with only a 38px explicit hit area must fail the desktop 44px gate"
  );

  const mobileThinSlider = await renderAndCollect(page, `
    <input aria-label="thin-native-slider" style="width:160px;height:16px" type="range" min="0" max="10" value="5">
    <div aria-label="thin-role-slider" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="10" aria-valuenow="5"
      style="position:absolute;left:20px;top:70px;width:160px;height:16px"></div>
  `, "mobile");
  assert.ok(
    mobileThinSlider.some((finding) => finding.startsWith("touch-target-small:input(thin-native-slider)") && finding.endsWith(":mobile")),
    "a bare 16px-tall native range must fail the 44px mobile hit-target gate"
  );
  assert.ok(
    mobileThinSlider.some((finding) => finding.startsWith("touch-target-small:div(thin-role-slider)") && finding.endsWith(":mobile")),
    "a bare 16px-tall ARIA slider must fail the 44px mobile hit-target gate"
  );

  const mobileWrappedSliders = await renderAndCollect(page, `
    <label style="display:flex;width:180px;height:44px;align-items:center">
      <input aria-label="label-hit-slider" style="width:160px;height:16px" type="range" min="0" max="10" value="5">
    </label>
    <div data-viz-hit-target style="position:absolute;left:20px;top:70px;display:flex;width:180px;height:44px;align-items:center">
      <div aria-label="explicit-hit-slider" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="10" aria-valuenow="5"
        style="width:160px;height:16px"></div>
    </div>
  `, "mobile");
  assert.ok(
    !mobileWrappedSliders.some((finding) => finding.startsWith("touch-target-small:input(label-hit-slider)")),
    "a native range may satisfy the mobile gate through its real 44px label hit area"
  );
  assert.ok(
    mobileWrappedSliders.some((finding) => finding.startsWith("touch-target-small:div(explicit-hit-slider)")),
    "a decorative data-viz-hit-target wrapper cannot lend its rectangle to an ARIA slider"
  );

  const disabledTinyControls = await renderAndCollect(page, `
    <button aria-label="disabled-tiny-button" disabled style="width:20px;height:20px" type="button">Disabled</button>
    <div aria-disabled="TRUE" style="position:absolute;left:40px;top:40px">
      <div aria-label="disabled-tiny-slider" role="slider" tabindex="-1"
        style="width:20px;height:20px"></div>
    </div>
    <button aria-disabled="true" aria-label="aria-disabled-executable-small"
      style="position:absolute;left:100px;top:40px;width:20px;height:20px" type="button">ARIA</button>
    <div inert><button aria-label="inert-disabled-control" style="width:20px;height:20px" type="button">Inert</button></div>
  `, "desktop");
  assert.ok(
    !disabledTinyControls.some((finding) => finding.includes("disabled-tiny-button")),
    "native disabled controls remain proven non-executable"
  );
  for (const control of ["disabled-tiny-slider", "aria-disabled-executable-small"]) {
    assert.ok(
      disabledTinyControls.some((finding) =>
        finding.startsWith("touch-target-small:") && finding.includes(control)
      ),
      "aria-disabled alone must not remove an executable control from the physical audit"
    );
  }
  assert.ok(
    !disabledTinyControls.some((finding) => finding.includes("inert-disabled-control")),
    "inert remains a proven physical execution fence"
  );

  const invisibleSemanticInventory = await renderAndCollect(page, `
    <button aria-label="opacity-zero-semantic-control" type="button"
      style="position:absolute;left:20px;top:20px;width:20px;height:20px;opacity:0">Ghost</button>
    <a aria-label="display-contents-semantic-control" href="#display-contents" style="display:contents">
      <span style="display:inline-block;width:20px;height:20px">Go</span>
    </a>
  `, "desktop");
  assert.ok(
    invisibleSemanticInventory.some((finding) =>
      finding.startsWith("touch-target-invisible-pointer-operable:button(opacity-zero-semantic-control)")
    ),
    "opacity:0 pointer-operable semantic controls must fail instead of leaving the inventory"
  );
  assert.ok(
    invisibleSemanticInventory.some((finding) =>
      finding.startsWith("touch-target-unsupported-geometry:a(display-contents-semantic-control)") &&
      finding.includes("display-contents") && finding.includes("zero-principal-box")
    ),
    "display:contents and zero-principal-box controls with operable descendants must fail closed"
  );

  const resolvedOpacityInput = await renderAndCollect(page, `
    <label aria-label="resolved-opacity-native-label"
      style="position:absolute;left:20px;top:20px;display:block;width:38px;height:38px">
      <input aria-label="resolved-opacity-native-control" type="checkbox"
        style="position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0">
    </label>
  `, "desktop");
  assert.ok(
    resolvedOpacityInput.some((finding) =>
      finding.startsWith("touch-target-small:input(resolved-opacity-native-control):38.0x38.0")
    ),
    "opacity-zero native input must not hide its resolved label target from the 44px audit"
  );

  const exhaustiveInteractiveRoles = await renderAndCollect(page, `
    <div style="display:grid;grid-template-columns:repeat(5,38px);gap:4px">
      <div aria-label="aria-link-small" role="link" style="width:38px;height:38px"></div>
      <div aria-checked="false" aria-label="aria-switch-small" role="switch" style="width:38px;height:38px"></div>
      <div aria-checked="false" aria-label="aria-checkbox-small" role="checkbox" style="width:38px;height:38px"></div>
      <div aria-checked="false" aria-label="aria-radio-small" role="radio" style="width:38px;height:38px"></div>
      <div aria-label="aria-spinbutton-small" aria-valuemax="9" aria-valuemin="0" aria-valuenow="1" role="spinbutton"
        style="width:38px;height:38px"></div>
      <div aria-expanded="false" aria-label="aria-combobox-small" role="combobox" style="width:38px;height:38px"></div>
      <div aria-label="aria-menuitem-small" role="menuitem" style="width:38px;height:38px"></div>
      <div aria-checked="false" aria-label="aria-menuitemcheckbox-small" role="menuitemcheckbox"
        style="width:38px;height:38px"></div>
      <div aria-checked="false" aria-label="aria-menuitemradio-small" role="menuitemradio"
        style="width:38px;height:38px"></div>
      <div aria-label="focusable-custom-small" tabindex="0" style="width:38px;height:38px"></div>
    </div>
  `, "desktop");
  for (const control of [
    "aria-link-small",
    "aria-switch-small",
    "aria-checkbox-small",
    "aria-radio-small",
    "aria-spinbutton-small",
    "aria-combobox-small",
    "aria-menuitem-small",
    "aria-menuitemcheckbox-small",
    "aria-menuitemradio-small",
    "focusable-custom-small"
  ]) {
    assert.ok(
      exhaustiveInteractiveRoles.some((finding) => finding.startsWith(`touch-target-small:div(${control})`)),
      `${control} must participate in the strict learner touch-target gate`
    );
  }

  const visibleAriaHiddenControl = await renderAndCollect(page, `
    <button aria-hidden="true" aria-label="visible-aria-hidden-small" style="width:38px;height:38px" type="button">
      Visible but removed from the accessibility tree
    </button>
    <div inert>
      <button aria-label="inert-small" style="width:38px;height:38px" type="button">Inert</button>
    </div>
    <button aria-label="physically-hidden-small" hidden style="width:38px;height:38px" type="button">Hidden</button>
  `, "desktop");
  assert.ok(
    visibleAriaHiddenControl.some((finding) =>
      finding.startsWith("touch-target-small:button(visible-aria-hidden-small)")
    ),
    "aria-hidden must not hide a visibly pointer-operable learner control from the physical hit-target audit"
  );
  assert.ok(
    !visibleAriaHiddenControl.some((finding) =>
      finding.includes("inert-small") || finding.includes("physically-hidden-small")
    ),
    "physically hidden and inert controls remain outside the pointer-operable learner target set"
  );

  const sharedAndNestedControls = await renderAndCollect(page, `
    <label aria-label="shared-label-control" role="button" tabindex="0"
      style="display:flex;width:180px;height:44px;align-items:center">
      <input aria-label="shared-label-slider" style="width:160px;height:44px" type="range" min="0" max="10" value="5">
    </label>
    <div aria-label="nested-outer-control" role="button" tabindex="0"
      style="position:absolute;left:220px;top:20px;width:100px;height:60px">
      <div aria-checked="false" aria-label="nested-inner-control" role="switch" tabindex="0"
        style="width:44px;height:44px"></div>
    </div>
  `, "desktop");
  assert.ok(
    sharedAndNestedControls.some((finding) =>
      finding.startsWith("controls-share-hit-target:") &&
      finding.includes("shared-label-control") &&
      finding.includes("shared-label-slider")
    ),
    "independently operable controls must never silently share one resolved hit target"
  );
  assert.ok(
    sharedAndNestedControls.some((finding) =>
      finding.startsWith("controls-nested:") &&
      finding.includes("nested-outer-control") &&
      finding.includes("nested-inner-control")
    ),
    "nested independently operable controls must fail explicitly"
  );

  const resolvedTargetNesting = await renderAndCollect(page, `
    <label style="display:flex;width:220px;height:60px;align-items:center;gap:8px">
      <input aria-label="resolved-label-range" type="range" min="0" max="10" value="5"
        style="width:150px;height:44px">
      <input aria-label="resolved-sibling-input" type="button" value="Sibling" style="width:44px;height:44px">
    </label>
  `, "desktop");
  assert.ok(
    resolvedTargetNesting.some((finding) =>
      finding.startsWith("controls-resolved-target-nested:") &&
      finding.includes("resolved-label-range") &&
      finding.includes("resolved-sibling-input")
    ),
    "a wrapping-label resolved target containing a sibling native control must fail explicitly"
  );

  const unsupportedTouchGeometry = await renderAndCollect(page, `
    <button aria-label="pointer-none-control" type="button"
      style="position:absolute;left:0;top:0;width:44px;height:44px;pointer-events:none"></button>
    <button aria-label="rotated-thin-control" type="button"
      style="position:absolute;left:70px;top:0;width:60px;height:16px;transform:rotate(45deg)"></button>
    <button aria-label="skewed-thin-control" type="button"
      style="position:absolute;left:150px;top:0;width:60px;height:16px;transform:skewY(45deg)"></button>
    <div style="position:absolute;left:240px;top:0;perspective:400px">
      <button aria-label="perspective-control" type="button" style="width:44px;height:44px"></button>
    </div>
    <button aria-label="clip-path-control" type="button"
      style="position:absolute;left:0;top:90px;width:44px;height:44px;clip-path:circle(20% at center)"></button>
    <button aria-label="mask-control" type="button"
      style="position:absolute;left:70px;top:90px;width:44px;height:44px;mask-image:linear-gradient(black,transparent);-webkit-mask-image:linear-gradient(black,transparent)"></button>
    <button aria-label="overlay-blocked-control" type="button"
      style="position:absolute;left:130px;top:90px;width:44px;height:44px"></button>
    <div aria-label="center-overlay" style="position:absolute;z-index:10;left:147px;top:107px;width:10px;height:10px"></div>
    <div aria-label="east-overlay" style="position:absolute;z-index:10;left:172px;top:90px;width:2px;height:44px"></div>
  `, "desktop");
  assert.ok(
    unsupportedTouchGeometry.some((finding) =>
      finding.startsWith("touch-target-pointer-events-none:button(pointer-none-control)")
    ),
    "pointer-events:none must fail closed"
  );
  for (const [control, reason] of [
    ["rotated-thin-control", "non-axis-transform"],
    ["skewed-thin-control", "non-axis-transform"],
    ["perspective-control", "perspective"],
    ["clip-path-control", "clip-path"],
    ["mask-control", "mask-image"]
  ] as const) {
    assert.ok(
      unsupportedTouchGeometry.some((finding) =>
        finding.startsWith(`touch-target-unsupported-geometry:button(${control})`) && finding.includes(reason)
      ),
      `${control} must fail closed on ${reason}`
    );
  }
  assert.ok(
    unsupportedTouchGeometry.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(overlay-blocked-control)") &&
      finding.includes("center-overlay")
    ),
    "the center of the required 44px region must remain pointer-operable"
  );
  assert.ok(
    unsupportedTouchGeometry.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(overlay-blocked-control)") &&
      finding.includes("east-overlay")
    ),
    "the cardinal points of the required 44px region must remain pointer-operable"
  );

  const fullCoreOverlayProof = await renderAndCollect(page, `
    <button aria-label="corner-overlay-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div aria-label="corner-overlay"
      style="position:absolute;z-index:10;left:20px;top:20px;width:3px;height:3px"></div>
    <div aria-label="quadrant-overlay"
      style="position:absolute;z-index:10;left:50px;top:27px;width:3px;height:3px"></div>
    <button aria-label="diagonal-overlay-control" type="button"
      style="position:absolute;left:100px;top:20px;width:44px;height:44px"></button>
    <div aria-label="diagonal-overlay"
      style="position:absolute;z-index:10;left:110px;top:26px;width:2px;height:24px;transform:rotate(45deg)"></div>
  `, "desktop");
  for (const overlay of ["corner-overlay", "quadrant-overlay"]) {
    assert.ok(
      fullCoreOverlayProof.some((finding) =>
        finding.startsWith("touch-target-core-cell-blocked:button(corner-overlay-control)") &&
        finding.includes(overlay)
      ),
      `${overlay} must not escape between the former center/cardinal probes`
    );
  }
  assert.ok(
    fullCoreOverlayProof.some((finding) =>
      finding.startsWith("touch-target-core-overlay-unsupported:button(diagonal-overlay-control)") &&
      finding.includes("diagonal-overlay") && finding.includes("non-axis-transform")
    ),
    "a narrow diagonal overlay that avoids every former probe must fail from effective core intersection"
  );

  const camouflagedCoreOverlay = await renderAndCollect(page, `
    <button aria-label="camouflaged-overlay-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px;overflow:visible">
      <span style="position:absolute;z-index:20;left:20px;top:20px;width:4px;height:4px"></span>
      <span style="position:absolute;z-index:20;left:20px;top:0;width:4px;height:4px"></span>
      <span style="position:absolute;z-index:20;right:0;top:20px;width:4px;height:4px"></span>
      <span style="position:absolute;z-index:20;left:20px;bottom:0;width:4px;height:4px"></span>
      <span style="position:absolute;z-index:20;left:0;top:20px;width:4px;height:4px"></span>
    </button>
    <div aria-label="camouflaged-foreign-overlay"
      style="position:absolute;z-index:10;left:20px;top:20px;width:44px;height:44px;pointer-events:auto"></div>
  `, "desktop");
  assert.ok(
    camouflagedCoreOverlay.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(camouflaged-overlay-control)") &&
      finding.includes("camouflaged-foreign-overlay")
    ),
    "camouflaged foreign overlay must fail every geometry-derived core cell"
  );

  const boundaryCapOverlays = Array.from({ length: 64 }, (_, index) =>
    `<i style="position:absolute;z-index:10;left:${20 + index * 0.6}px;top:20px;` +
    `width:0.2px;height:44px;pointer-events:auto"></i>`
  ).join("");
  const partitionBoundaryCap = await renderAndCollect(page, `
    <button aria-label="partition-boundary-cap-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    ${boundaryCapOverlays}
  `, "desktop");
  assert.ok(
    partitionBoundaryCap.some((finding) =>
      finding.startsWith(
        "touch-target-core-partition-limit:button(partition-boundary-cap-control):boundary-count:"
      )
    ),
    "more than 128 unique ownership boundaries must fail through the bounded partition branch"
  );

  const cellCapVertical = Array.from({ length: 49 }, (_, index) =>
    `<i style="position:absolute;z-index:10;left:${20 + index * 0.85}px;top:20px;` +
    `width:0.25px;height:44px;pointer-events:auto"></i>`
  ).join("");
  const cellCapHorizontal = Array.from({ length: 49 }, (_, index) =>
    `<b style="position:absolute;z-index:10;left:20px;top:${20 + index * 0.85}px;` +
    `width:44px;height:0.25px;pointer-events:auto"></b>`
  ).join("");
  const partitionCellCap = await renderAndCollect(page, `
    <button aria-label="partition-cell-cap-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    ${cellCapVertical}${cellCapHorizontal}
  `, "desktop");
  assert.ok(
    partitionCellCap.some((finding) =>
      finding.startsWith(
        "touch-target-core-partition-limit:button(partition-cell-cap-control):cell-product:"
      )
    ),
    "more than 32768 ownership cells must fail through the bounded product branch"
  );

  const ownedDescendantTopology = await renderAndCollect(page, `
    <button aria-label="owned-descendant-topology-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px;overflow:visible">
      <svg aria-hidden="true" viewBox="0 0 44 44"
        style="position:absolute;z-index:20;inset:0;width:44px;height:44px;overflow:visible;pointer-events:none">
        <path aria-label="owned-descendant-thin-cross" d="M22 0V44M0 22H44"
          fill="none" stroke="black" stroke-width="4" style="pointer-events:stroke"></path>
      </svg>
    </button>
    <div aria-label="owned-descendant-foreign-overlay"
      style="position:absolute;z-index:10;left:20px;top:20px;width:44px;height:44px;pointer-events:auto"></div>
  `, "desktop");
  assert.ok(
    ownedDescendantTopology.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(owned-descendant-topology-control)") &&
      finding.includes("owned-descendant-foreign-overlay")
    ),
    "ordinary owned SVG paint may remain active, but the actually exposed foreign blocker must fail"
  );

  const ownedDescendantIntercept = await renderAndCollect(page, `
    <button aria-label="owned-descendant-intercept-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px;padding:0">
      <span aria-label="owned-descendant-interceptor"
        style="position:absolute;inset:0;display:block;pointer-events:auto"></span>
    </button>
  `, "desktop");
  assert.deepEqual(
    ownedDescendantIntercept.filter((finding) => finding.includes("owned-descendant-intercept-control")),
    [],
    "an ordinary nonsemantic visual descendant remains part of its owning button activation surface"
  );

  const targetTopology = await renderAndCollect(page, `
    <svg style="position:absolute;left:20px;top:20px;width:44px;height:44px;overflow:visible" viewBox="0 0 44 44">
      <path aria-label="direct-svg-path-target" role="button" tabindex="0"
        d="M22 0V44M0 22H44" fill="none" stroke="black" stroke-width="4" style="pointer-events:stroke"></path>
    </svg>
    <div style="position:absolute;left:90px;top:20px;width:64px;font:20px/22px Arial">
      <a aria-label="fragmented-inline-target" href="#fragmented">AA AA AA AA AA AA</a>
    </div>
    <button aria-label="rectangular-outer-target" type="button"
      style="position:absolute;left:190px;top:20px;width:44px;height:44px;padding:0;border:0;background:transparent">
      <span style="display:block;width:32px;height:32px;margin:6px;border-radius:50%;background:#111;pointer-events:none"></span>
    </button>
    <svg style="position:absolute;left:260px;top:20px;width:44px;height:44px" viewBox="0 0 44 44">
      <circle aria-label="direct-svg-circle-target" role="button" tabindex="0"
        cx="22" cy="22" r="20" fill="transparent" stroke="black" stroke-width="4"></circle>
    </svg>
    <button aria-label="rounded-html-target" type="button"
      style="position:absolute;left:330px;top:20px;width:44px;height:44px;border-radius:10px">OK</button>
  `, "desktop");
  assert.ok(
    targetTopology.some((finding) =>
      finding.startsWith("touch-target-unsupported-geometry:path(direct-svg-path-target)") &&
      finding.includes("svg-target-geometry")
    ),
    "direct SVG path and circle targets must fail closed while rounded semantic HTML targets remain valid"
  );
  for (const reason of ["svg-target-geometry", "non-html-target-geometry"]) {
    assert.ok(
      targetTopology.some((finding) =>
        finding.startsWith("touch-target-unsupported-geometry:circle(direct-svg-circle-target)") &&
        finding.includes(reason)
      ),
      `a direct SVG circle cannot borrow its bounding client rectangle: ${reason}`
    );
  }
  assert.ok(
    targetTopology.some((finding) =>
      finding.startsWith("touch-target-unsupported-geometry:a(fragmented-inline-target)") &&
      finding.includes("fragmented-target-client-rects")
    ),
    "a multi-fragment inline target cannot borrow its union bounding rectangle"
  );
  assert.ok(
    !targetTopology.some((finding) => finding.includes("rectangular-outer-target")),
    "a rectangular semantic outer target may own a rounded pointer-transparent visual child"
  );
  assert.deepEqual(
    targetTopology.filter((finding) => finding.includes("rounded-html-target")),
    [],
    "a normal rounded semantic HTML button remains a fully clean single-client-rect target"
  );

  const transparentQuadrantBlocker = await renderAndCollect(page, `
    <button aria-label="transparent-quadrant-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div aria-label="transparent-quadrant-blocker"
      style="position:absolute;z-index:10;left:50px;top:27px;width:3px;height:3px;opacity:0;pointer-events:auto"></div>
  `, "desktop");
  assert.ok(
    transparentQuadrantBlocker.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(transparent-quadrant-control)") &&
      finding.includes("transparent-quadrant-blocker")
    ),
    "opacity:0 pointer blocker must remain in the pointer-operable inventory"
  );

  const candidateAncestorGeometry = await renderAndCollect(page, `
    <button aria-label="parent-geometry-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div style="position:absolute;z-index:10;left:20px;top:20px;width:44px;height:44px;pointer-events:none;transform:rotate(0.25deg);clip-path:inset(0)">
      <div aria-label="parent-geometry-overlay"
        style="position:absolute;left:30px;top:7px;width:3px;height:3px;pointer-events:auto"></div>
    </div>
  `, "desktop");
  for (const reason of ["non-axis-transform", "clip-path"]) {
    assert.ok(
      candidateAncestorGeometry.some((finding) =>
        finding.startsWith("touch-target-core-overlay-unsupported:button(parent-geometry-control)") &&
        finding.includes("parent-geometry-overlay") && finding.includes(reason)
      ),
      `candidate ancestor transform and clip geometry must fail closed: ${reason}`
    );
  }

  const ancestorPseudoBlocker = await renderAndCollect(page, `
    <style>
      [data-pseudo-quadrant]::after {
        content: "";
        position: absolute;
        z-index: 10;
        left: 30px;
        top: 7px;
        width: 3px;
        height: 3px;
        pointer-events: auto;
      }
    </style>
    <div aria-label="pseudo-quadrant-ancestor" data-pseudo-quadrant
      style="position:absolute;left:20px;top:20px;width:44px;height:44px;pointer-events:none">
      <button aria-label="pseudo-quadrant-control" type="button"
        style="position:absolute;inset:0;width:44px;height:44px;pointer-events:auto"></button>
    </div>
  `, "desktop");
  assert.ok(
    ancestorPseudoBlocker.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(pseudo-quadrant-control)") &&
      finding.includes("pseudo-quadrant-ancestor")
    ),
    "an ancestor pseudo paint that actually owns a core pixel must report its top-hit origin"
  );

  const zeroSizePseudoBlocker = await renderAndCollect(page, `
    <style>
      [data-zero-size-pseudo]::after {
        content: "";
        position: absolute;
        z-index: 10;
        left: 30px;
        top: 7px;
        width: 3px;
        height: 3px;
        pointer-events: auto;
      }
    </style>
    <button aria-label="zero-size-pseudo-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div aria-label="zero-size-pseudo-origin" data-zero-size-pseudo
      style="position:absolute;left:20px;top:20px;width:0;height:0;pointer-events:none"></div>
  `, "desktop");
  assert.ok(
    zeroSizePseudoBlocker.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(zero-size-pseudo-control)") &&
      finding.includes("zero-size-pseudo-origin")
    ),
    "zero-size pseudo origin must not hide an out-of-box top-hit blocker"
  );

  const unsupportedOverlayGeometry = await renderAndCollect(page, `
    <button aria-label="fragmented-overlay-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div style="position:absolute;z-index:10;left:50px;top:26px;width:8px;font:4px/5px Arial;white-space:normal;pointer-events:none">
      <span aria-label="fragmented-overlay" style="pointer-events:auto">AA AA AA</span>
    </div>

    <button aria-label="svg-overlay-control" type="button"
      style="position:absolute;left:100px;top:20px;width:44px;height:44px"></button>
    <svg aria-label="svg-overlay"
      style="position:absolute;z-index:10;left:130px;top:27px;width:3px;height:3px;pointer-events:auto"
      viewBox="0 0 3 3"><rect width="3" height="3"></rect></svg>

    <button aria-label="nonrect-overlay-control" type="button"
      style="position:absolute;left:180px;top:20px;width:44px;height:44px"></button>
    <div aria-label="nonrect-overlay"
      style="position:absolute;z-index:10;left:210px;top:27px;width:3px;height:3px;border-radius:50%;pointer-events:auto"></div>
  `, "desktop");
  assert.ok(
    unsupportedOverlayGeometry.some((finding) =>
      finding.startsWith("touch-target-core-overlay-unsupported:button(fragmented-overlay-control)") &&
      finding.includes("fragmented-overlay") && finding.includes("fragmented-client-rects")
    ),
    "fragmented DOM geometry must fail closed"
  );
  assert.ok(
    unsupportedOverlayGeometry.some((finding) =>
      finding.startsWith("touch-target-core-overlay-unsupported:button(svg-overlay-control)") &&
      finding.includes("svg-overlay") && finding.includes("svg-geometry")
    ),
    "SVG hit geometry must fail closed"
  );
  assert.ok(
    unsupportedOverlayGeometry.some((finding) =>
      finding.startsWith("touch-target-core-overlay-unsupported:button(nonrect-overlay-control)") &&
      finding.includes("nonrect-overlay") && finding.includes("nonrect-geometry")
    ),
    "nonrectangular DOM geometry must fail closed"
  );

  const operativeLegacyClipOverlay = await renderAndCollect(page, `
    <button aria-label="legacy-clip-overlay-control" type="button"
      style="position:absolute;left:20px;top:20px;width:44px;height:44px"></button>
    <div aria-label="legacy-clip-overlay"
      style="position:absolute;z-index:10;left:20px;top:20px;width:44px;height:44px;clip:rect(0px,3px,3px,0px);pointer-events:auto"></div>
  `, "desktop");
  assert.ok(
    operativeLegacyClipOverlay.some((finding) =>
      finding.startsWith("touch-target-core-overlay-unsupported:button(legacy-clip-overlay-control)") &&
      finding.includes("legacy-clip-overlay") && finding.includes("legacy-clip")
    ),
    "operative absolute legacy clip must fail closed as unsupported geometry"
  );

  const computedSrOnlyControls = await renderAndCollect(page, `
    <button class="sr-only" aria-label="overridden-sr-only-control" type="button"
      style="position:absolute;left:20px;top:20px;width:38px;height:38px;padding:0;margin:0;overflow:visible;clip:auto;clip-path:none"></button>
    <button class="sr-only" aria-label="static-sr-only-clip-control" type="button"
      style="position:static;display:block;width:38px;height:38px;padding:0;margin:0;overflow:visible;clip:rect(0px,0px,0px,0px);clip-path:none"></button>
    <div style="position:absolute;left:100px;top:20px;width:0;height:0;overflow:hidden">
      <button class="sr-only" aria-label="genuinely-clipped-control" type="button"
        style="position:absolute;left:0;top:0;width:44px;height:44px"></button>
    </div>
  `, "desktop");
  assert.ok(
    computedSrOnlyControls.some((finding) =>
      finding.startsWith("touch-target-small:button(overridden-sr-only-control)")
    ),
    "visible overridden sr-only control must still fail at 38px"
  );
  assert.ok(
    computedSrOnlyControls.some((finding) =>
      finding.startsWith("touch-target-small:button(static-sr-only-clip-control)")
    ),
    "legacy clip on a static sr-only override is inoperative and 38px must fail"
  );
  assert.ok(
    !computedSrOnlyControls.some((finding) => finding.includes("genuinely-clipped-control")),
    "genuinely clipped control must remain outside the learner inventory"
  );

  const overriddenAncestorVisibility = await renderAndCollect(page, `
    <div style="visibility:hidden">
      <button aria-label="visibility-override-small" type="button"
        style="visibility:visible;width:38px;height:38px"></button>
    </div>

    <button aria-label="visibility-override-overlay-control" type="button"
      style="position:absolute;left:100px;top:20px;width:44px;height:44px"></button>
    <div style="visibility:hidden">
      <div aria-label="visibility-override-overlay"
        style="visibility:visible;position:absolute;z-index:10;left:130px;top:27px;width:3px;height:3px;pointer-events:auto"></div>
    </div>

    <div style="visibility:hidden">
      <span style="visibility:visible;position:absolute;left:20px;top:110px;font-size:24px">VISIBILITY ALPHA</span>
      <span style="visibility:visible;position:absolute;left:20px;top:110px;font-size:24px">VISIBILITY BRAVO</span>
    </div>
  `, "desktop");
  assert.ok(
    overriddenAncestorVisibility.some((finding) =>
      finding.startsWith("touch-target-small:button(visibility-override-small)")
    ),
    "visibility:visible child control must override a visibility:hidden ancestor"
  );
  assert.ok(
    overriddenAncestorVisibility.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(visibility-override-overlay-control)") &&
      finding.includes("visibility-override-overlay")
    ),
    "visibility:visible quadrant overlay must remain pointer-operable"
  );
  assert.ok(
    overriddenAncestorVisibility.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("VISIBILITY ALPHA") && finding.includes("VISIBILITY BRAVO")
    ),
    "visibility:visible descendant text must participate in collision checks"
  );

  const outsideRootGeometry = await renderAndCollect(
    page,
    `<button aria-label="outside-root-control" type="button" style="width:44px;height:44px"></button>`,
    "desktop",
    "transform:rotate(0.25deg);perspective:400px;clip-path:inset(0);mask-image:linear-gradient(black,black);-webkit-mask-image:linear-gradient(black,black)"
  );
  for (const reason of ["non-axis-transform", "perspective", "clip-path", "mask-image"]) {
    assert.ok(
      outsideRootGeometry.some((finding) =>
        finding.startsWith("touch-target-unsupported-geometry:button(outside-root-control)") &&
        finding.includes(reason) && finding.includes("ancestor(div)")
      ),
      `outside-root transform, perspective, clip-path, and mask must expose ${reason}`
    );
  }

  const clippedHitTarget = await renderAndCollect(page, `
    <div style="position:absolute;left:20px;top:20px;width:180px;height:20px;overflow:hidden">
      <label style="display:flex;width:180px;height:44px;align-items:center">
        <input aria-label="clipped-wrapper-slider" style="width:160px;height:16px" type="range" min="0" max="10" value="5">
      </label>
    </div>
  `, "mobile");
  assert.ok(
    clippedHitTarget.some((finding) => finding.startsWith("touch-target-clipped:input(clipped-wrapper-slider)")),
    "a declared 44px wrapper that is partially clipped must fail explicitly"
  );
  assert.ok(
    clippedHitTarget.some((finding) => finding.startsWith("touch-target-small:input(clipped-wrapper-slider)")),
    "touch-target sizing must use the effective clipped rectangle"
  );

  const clippedText = await renderAndCollect(page, `
    <p style="width:72px;height:24px;margin:0;overflow:hidden;white-space:nowrap">Deliberately clipped sentence</p>
  `, "desktop");
  assert.ok(matching(clippedText, "text-clipped-x:").length > 0, "horizontally clipped DOM text must fail");

  const overlappingControls = await renderAndCollect(page, `
    <button aria-label="control-one" style="position:absolute;left:24px;top:24px;width:96px;height:44px" type="button">One</button>
    <button aria-label="control-two" style="position:absolute;left:24px;top:24px;width:96px;height:44px" type="button">Two</button>
  `, "desktop");
  assert.ok(
    overlappingControls.some((finding) => finding.startsWith("controls-overlap:") && finding.includes("control-one") && finding.includes("control-two")),
    "overlapping controls must fail"
  );

  await page.setContent(`
    <section id="destructive-only">
      <button type="button">Delete model</button>
      <button type="button">Clear all</button>
    </section>
  `);
  await assert.rejects(
    () => smokeSignatureBenchControl(page.locator("#destructive-only")),
    /No visible enabled reversible control/,
    "control smoke must fail instead of falling back to a filtered destructive control"
  );

  await page.setContent(`
    <section id="chinese-destructive-only">
      <button type="button">删除模型</button>
      <button type="button">清除全部</button>
      <button type="button">重置实验</button>
    </section>
  `);
  await assert.rejects(
    () => smokeSignatureBenchControl(page.locator("#chinese-destructive-only"), 500),
    /No visible enabled reversible control/,
    "Chinese destructive controls must never be used as reversible smoke actions"
  );

  await page.setContent(`
    <section id="no-op-control">
      <div data-viz-surface style="height:80px;width:120px">
        <canvas data-viz-mark height="80" width="120" style="height:80px;width:120px"></canvas>
      </div>
      <button type="button">Show guides</button>
    </section>
  `);
  await assert.rejects(
    () => smokeSignatureBenchControl(page.locator("#no-op-control"), 350),
    /without deterministic model-response evidence/,
    "a click accepted by the browser without model-response evidence must fail"
  );

  await page.setContent(`
    <section id="motion-control">
      <div data-viz-surface style="height:80px;width:120px">
        <canvas data-viz-mark height="80" width="120" style="height:80px;width:120px"></canvas>
      </div>
      <label><input aria-label="播放动画" type="checkbox">播放动画</label>
      <output>已暂停</output>
    </section>
  `);
  await page.locator("#motion-control input").evaluate((input) => {
    input.addEventListener("change", () => {
      const checkbox = input as HTMLInputElement;
      input.closest("section")!.querySelector("output")!.textContent = checkbox.checked ? "播放中" : "已暂停";
    });
  });
  assert.match(
    await smokeSignatureBenchControl(page.locator("#motion-control"), 1_000),
    /semantic-change:restored$/,
    "motion smoke must prove a response and restore the original learner state"
  );
  assert.equal(await page.locator("#motion-control input").isChecked(), false);
  assert.equal(await page.locator("#motion-control output").textContent(), "已暂停");

  await page.setContent(`
    <section id="semantic-button">
      <div data-viz-surface style="height:80px;width:120px">
        <canvas data-viz-mark height="80" width="120" style="height:80px;width:120px"></canvas>
      </div>
      <button type="button" aria-pressed="false">Show guides</button>
      <output data-viz-model-state="guides-hidden">Guides hidden</output>
    </section>
  `);
  await page.locator("#semantic-button button").evaluate((button) => {
    button.addEventListener("click", () => {
      button.setAttribute("aria-pressed", "true");
      const state = button.closest("section")!.querySelector<HTMLOutputElement>("output")!;
      state.setAttribute("data-viz-model-state", "guides-shown");
      state.textContent = "Guides shown";
    });
  });
  assert.match(
    await smokeSignatureBenchControl(page.locator("#semantic-button")),
    /semantic-change$/,
    "button smoke should preserve deterministic semantic response evidence when the DOM exposes it"
  );

  await page.setContent(`
    <section id="premium" style="width:480px;height:260px">
      <div data-viz-manim-control-dock data-viz-manim-presentation="learner"
        data-viz-manim-authoring-controls-visible="false">
      <div data-viz-manim-playback-state="paused" style="width:460px;height:220px">
        <button type="button" data-viz-manim-playback-toggle>Play</button>
        <div data-viz-manim-timeline-scrubber role="slider" tabindex="0"
          aria-label="Animation timeline" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0" style="width:240px;height:44px"></div>
        <button type="button" data-viz-three-reset-camera>Reset camera</button>
        <div data-viz-manim-authoring-control hidden style="display:none">Run from beat</div>
      </div>
      </div>
    </section>
  `);
  await page.locator("#premium").evaluate((panel) => {
    const runtime = panel.querySelector<HTMLElement>("[data-viz-manim-playback-state]")!;
    const playback = panel.querySelector<HTMLButtonElement>("[data-viz-manim-playback-toggle]")!;
    const timeline = panel.querySelector<HTMLElement>("[data-viz-manim-timeline-scrubber]")!;
    const reset = panel.querySelector<HTMLButtonElement>("[data-viz-three-reset-camera]")!;
    const localeLabels = () => {
      const lang = document.documentElement.lang.toLowerCase();
      if (lang.startsWith("zh-hans") || lang.startsWith("zh-cn")) {
        return { pause: "暂停", play: "播放" };
      }
      if (lang.startsWith("zh")) return { pause: "暫停", play: "播放" };
      return { pause: "Pause", play: "Play" };
    };
    const setPlaying = (playing: boolean) => {
      runtime.setAttribute("data-viz-manim-playback-state", playing ? "playing" : "paused");
      const labels = localeLabels();
      playback.textContent = playing ? labels.pause : labels.play;
    };
    playback.addEventListener("click", () => {
      setPlaying(runtime.getAttribute("data-viz-manim-playback-state") !== "playing");
    });
    timeline.addEventListener("keydown", (event) => {
      if (event.key === "Home") timeline.setAttribute("aria-valuenow", "0");
      if (event.key === "End") timeline.setAttribute("aria-valuenow", "1000");
    });
    reset.addEventListener("click", () => {
      timeline.setAttribute("aria-valuenow", "0");
      setPlaying(false);
    });
    window.setInterval(() => {
      if (runtime.getAttribute("data-viz-manim-playback-state") !== "playing") return;
      const current = Number(timeline.getAttribute("aria-valuenow"));
      timeline.setAttribute("aria-valuenow", String(Math.min(1000, current + 25)));
    }, 20);
  });
  for (const locale of [
    { lang: "en-US", play: "Play", reset: "Reset camera", timeline: "Animation timeline" },
    { lang: "zh-Hant-HK", play: "播放", reset: "重設視角", timeline: "動畫時間軸" },
    { lang: "zh-Hans-CN", play: "播放", reset: "重置视角", timeline: "动画时间轴" }
  ]) {
    await page.evaluate((labels) => {
      document.documentElement.lang = labels.lang;
      document.querySelector<HTMLElement>("[data-viz-manim-playback-toggle]")!.textContent = labels.play;
      document.querySelector<HTMLElement>("[data-viz-three-reset-camera]")!.textContent = labels.reset;
      document.querySelector<HTMLElement>("[data-viz-manim-timeline-scrubber]")!.setAttribute("aria-label", labels.timeline);
    }, locale);
    assert.match(
      await smokePremiumDirectControls(page.locator("#premium"), 2_000),
      /^premium-controls:timeline=\d+->\d+:state=paused$/,
      `${locale.lang} premium smoke must expose localized learner controls and exact paused state`
    );
  }
  assert.equal(await page.locator("#premium [data-viz-manim-playback-state]").getAttribute("data-viz-manim-playback-state"), "paused");

  await page.locator("#premium [data-viz-manim-playback-state]").evaluate((runtime) => {
    runtime.setAttribute("data-viz-manim-playback-state", "error");
  });
  await assert.rejects(
    () => smokePremiumDirectControls(page.locator("#premium"), 350),
    /data-viz-manim-playback-state/,
    "premium smoke must reject an error state instead of treating every non-playing state as paused"
  );
  await page.locator("#premium").evaluate((panel) => {
    panel.querySelector<HTMLElement>("[data-viz-manim-playback-state]")!.setAttribute("data-viz-manim-playback-state", "paused");
    const authoring = panel.querySelector<HTMLElement>("[data-viz-manim-authoring-control]")!;
    authoring.hidden = false;
    authoring.style.display = "block";
  });
  await assert.rejects(
    () => smokePremiumDirectControls(page.locator("#premium"), 350),
    "premium learner smoke must reject a visible authoring dock"
  );

  const diagnostics = new CaliforniaBrowserDiagnostics(page, "http://127.0.0.1:3020");
  t.after(() => diagnostics.dispose());
  const diagnosticContext: CaliforniaQaContext = {
    action: "synthetic-diagnostic-drain",
    axis: axis("desktop"),
    benchId: "synthetic",
    labId: "synthetic",
    routeKind: "directory"
  };
  const diagnosticIssues: string[] = [];
  await page.evaluate(() => console.error("synthetic-first-diagnostic"));
  assert.deepEqual(
    appendCaliforniaDiagnosticFindings({ context: diagnosticContext, diagnostics, issues: diagnosticIssues }),
    { clean: false, reportedCount: 1 },
    "the first monotonic drain must report a pending browser diagnostic"
  );
  assert.equal(diagnosticIssues.filter((issue) => issue.includes("synthetic-first-diagnostic")).length, 1);
  assert.deepEqual(
    appendCaliforniaDiagnosticFindings({ context: diagnosticContext, diagnostics, issues: diagnosticIssues }),
    { clean: true, reportedCount: 0 },
    "a second drain must not duplicate an already-consumed diagnostic"
  );
  assert.equal(diagnosticIssues.filter((issue) => issue.includes("synthetic-first-diagnostic")).length, 1);
  await page.evaluate(() => console.error("synthetic-late-diagnostic"));
  assert.deepEqual(
    appendCaliforniaDiagnosticFindings({
      context: { ...diagnosticContext, action: "visit-final-diagnostic-drain" },
      diagnostics,
      issues: diagnosticIssues
    }),
    { clean: false, reportedCount: 1 },
    "a visit-final drain must capture diagnostics emitted after the preceding action window"
  );
  assert.equal(diagnosticIssues.filter((issue) => issue.includes("synthetic-late-diagnostic")).length, 1);
  const terminal = await diagnostics.awaitTerminalQuiescence({ quietWindowMs: 50, timeout: 500 });
  assert.equal(terminal.quiescent, true, "terminal diagnostics must observe a bounded same-origin quiet window");
  assert.deepEqual(terminal.pendingRequests, [], "terminal diagnostics must report no still-pending requests in the quiet canary");
  assert.deepEqual(terminal.diagnostics, [], "terminal diagnostics must perform one final monotonic drain");
});

test("California Visualization UI audit post-review adversarial contracts", { timeout: 30_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the UI audit canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());
  const page = await createCaliforniaVisualizationUiAuditPage(browser);

  await t.test("inventoried focusable controls cannot silently disappear", async () => {
    const findings = await renderAndCollect(page, `
      <button aria-label="post-opacity-focus-trap" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px;opacity:0;pointer-events:none">X</button>
      <button aria-label="post-zero-box-focus-trap" type="button"
        style="position:absolute;left:90px;top:20px;width:0;height:0;padding:0;border:0;overflow:hidden"></button>
      <button hidden aria-label="post-hidden-override-small" type="button"
        style="display:block;position:absolute;left:140px;top:20px;width:20px;height:20px">H</button>
      <iframe aria-label="post-default-focusable-iframe" srcdoc="<button>inside</button>"
        style="position:absolute;left:200px;top:20px;width:20px;height:20px;border:0"></iframe>
    `, "desktop");
    assert.ok(findings.some((finding) =>
      finding.startsWith("touch-target-invisible-focusable:button(post-opacity-focus-trap)") &&
      finding.endsWith("keyboard-focus-trap")
    ));
    assert.ok(findings.some((finding) =>
      finding.startsWith("touch-target-unsupported-geometry:button(post-zero-box-focus-trap)") &&
      finding.includes("zero-principal-box")
    ));
    assert.ok(findings.some((finding) =>
      finding.startsWith("touch-target-small:button(post-hidden-override-small)")
    ));
    assert.ok(findings.some((finding) =>
      finding.startsWith("touch-target-small:iframe(post-default-focusable-iframe)")
    ));
  });

  await t.test("open and retained closed shadow controls and text are audited", async () => {
    await renderAndCollect(page, `
      <open-audit-host style="position:absolute;left:20px;top:20px;display:block"></open-audit-host>
      <closed-audit-host style="position:absolute;left:100px;top:20px;display:block;width:100px;height:44px"></closed-audit-host>
      <nested-audit-host style="position:absolute;left:180px;top:20px;display:block"></nested-audit-host>
      <shadow-text-host style="position:absolute;left:20px;top:100px;display:block"></shadow-text-host>
    `, "desktop");
    await page.evaluate(() => {
      const openHost = document.querySelector("open-audit-host");
      const closedHost = document.querySelector("closed-audit-host");
      const nestedHost = document.querySelector("nested-audit-host");
      const textHost = document.querySelector("shadow-text-host");
      if (!openHost || !closedHost || !nestedHost || !textHost) throw new Error("missing synthetic shadow hosts");
      openHost.attachShadow({ mode: "open" }).innerHTML =
        `<button aria-label="post-open-shadow-small" style="width:20px;height:20px">OPEN SHADOW TEXT</button>`;
      closedHost.attachShadow({ mode: "closed" }).innerHTML =
        `<div style="display:flex;gap:16px">
           <button aria-label="post-closed-shadow-positive" style="width:44px;height:44px;padding:0">OK</button>
           <button aria-label="post-closed-shadow-small" style="width:20px;height:20px;padding:0">S</button>
         </div>`;
      const nestedOpen = nestedHost.attachShadow({ mode: "open" });
      nestedOpen.innerHTML = `<deep-closed-audit-host style="display:block"></deep-closed-audit-host>`;
      const deepClosedHost = nestedOpen.querySelector("deep-closed-audit-host");
      if (!deepClosedHost) throw new Error("missing nested closed host");
      deepClosedHost.attachShadow({ mode: "closed" }).innerHTML =
        `<button aria-label="post-nested-closed-shadow-small" style="width:20px;height:20px">DEEP</button>`;
      textHost.attachShadow({ mode: "closed" }).innerHTML =
        `<span style="position:absolute;left:0;top:0;font:20px Arial">SHADOW ALPHA</span>
         <span style="position:absolute;left:0;top:0;font:20px Arial">SHADOW BRAVO</span>`;
    });
    const findings = await collectVisualizationUiFindings(page.locator("#workspace"), axis("desktop"));
    assert.ok(findings.some((finding) => finding.includes("post-open-shadow-small")));
    assert.ok(findings.some((finding) => finding.includes("post-closed-shadow-small")));
    assert.ok(findings.some((finding) => finding.includes("post-nested-closed-shadow-small")));
    assert.deepEqual(findings.filter((finding) => finding.includes("post-closed-shadow-positive")), []);
    assert.ok(findings.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("SHADOW ALPHA") && finding.includes("SHADOW BRAVO")
    ));

    const latePage = await createCaliforniaVisualizationUiAuditPage(browser);
    try {
      await latePage.setContent(`
        <main id="workspace" style="position:relative;width:480px;height:260px">
          <section data-viz-surface style="position:relative;width:440px;height:220px">
            <late-closed-host aria-label="post-unobserved-closed-host"
              style="display:block;width:44px;height:44px"></late-closed-host>
          </section>
        </main>
        <script>
          document.querySelector("late-closed-host").attachShadow({ mode: "closed" }).innerHTML =
            '<button aria-label="inaccessible-late-closed-button">Hidden from late audit</button>';
        </script>
      `);
      await latePage.evaluate("globalThis.__name = function(value) { return value; }");
      const lateFindings = await collectVisualizationUiFindings(
        latePage.locator("#workspace"),
        axis("desktop")
      );
      assert.ok(lateFindings.some((finding) =>
        finding.startsWith("shadow-observation-unavailable:late-closed-host(post-unobserved-closed-host)") &&
        finding.endsWith("early-registry-required")
      ));
    } finally {
      await latePage.close();
    }

    const earlyPage = await createCaliforniaVisualizationUiAuditPage(browser);
    try {
      await installCaliforniaVisualizationUiAuditInit(earlyPage);
      const earlyHtml = `
        <main id="workspace" style="position:relative;width:480px;height:260px">
          <section data-viz-surface style="position:relative;width:440px;height:220px">
            <early-closed-host style="display:block;width:44px;height:44px"></early-closed-host>
          </section>
        </main>
        <script>
          document.querySelector("early-closed-host").attachShadow({ mode: "closed" }).innerHTML =
            '<button aria-label="post-navigation-early-closed-small" style="width:20px;height:20px">E</button>';
        </script>
      `;
      await earlyPage.goto(`data:text/html,${encodeURIComponent(earlyHtml)}`, { waitUntil: "domcontentloaded" });
      await earlyPage.evaluate("globalThis.__name = function(value) { return value; }");
      const earlyFindings = await collectVisualizationUiFindings(
        earlyPage.locator("#workspace"),
        axis("desktop")
      );
      assert.ok(earlyFindings.some((finding) => finding.includes("post-navigation-early-closed-small")));
      assert.equal(await earlyPage.evaluate(() => Boolean(
        (globalThis as typeof globalThis & {
          __californiaVisualizationUiAuditRegistry?: { earlyInstalled?: boolean };
        }).__californiaVisualizationUiAuditRegistry?.earlyInstalled
      )), true);
    } finally {
      await earlyPage.close();
    }
  });

  await t.test("native activation regions and native option ownership remain exact", async () => {
    const explicitLabel = await renderAndCollect(page, `
      <input id="post-external-check" aria-label="post-external-check" type="checkbox"
        style="position:absolute;left:20px;top:34px">
      <label for="post-external-check"
        style="position:absolute;left:20px;top:20px;width:100px;height:44px;padding-left:28px;background:#ddd">Toggle</label>
    `, "desktop");
    assert.deepEqual(explicitLabel.filter((finding) => finding.includes("post-external-check")), []);

    const implicitLabel = await renderAndCollect(page, `
      <label aria-label="post-implicit-label" style="position:absolute;left:20px;top:20px;width:120px;height:44px">
        <input aria-label="post-implicit-check" type="checkbox" style="margin:14px 8px">Toggle
      </label>
    `, "desktop");
    assert.deepEqual(implicitLabel.filter((finding) => finding.includes("post-implicit-check")), []);

    const undersizedLabel = await renderAndCollect(page, `
      <input id="post-small-label-check" aria-label="post-small-label-check" type="checkbox"
        style="position:absolute;left:20px;top:30px">
      <label for="post-small-label-check"
        style="position:absolute;left:20px;top:20px;width:80px;height:38px;padding-left:24px">Small</label>
    `, "desktop");
    assert.ok(undersizedLabel.some((finding) =>
      finding.startsWith("touch-target-small:input(post-small-label-check)") && finding.includes("38.0")
    ));

    const disjointLabels = await renderAndCollect(page, `
      <input id="post-disjoint-label-check" aria-label="post-disjoint-label-check" type="checkbox"
        style="position:absolute;left:100px;top:30px">
      <label for="post-disjoint-label-check"
        style="position:absolute;left:20px;top:20px;width:30px;height:44px">L</label>
      <label for="post-disjoint-label-check"
        style="position:absolute;left:55px;top:20px;width:30px;height:44px">R</label>
    `, "desktop");
    assert.ok(disjointLabels.some((finding) =>
      finding.startsWith("touch-target-small:input(post-disjoint-label-check)") && finding.includes("30.0x44.0")
    ), "disjoint labels must never be rectangle-unioned into one 60px target");

    const nativeListbox = await renderAndCollect(page, `
      <select aria-label="post-native-listbox" multiple size="3"
        style="position:absolute;left:20px;top:20px;width:110px;height:80px;font:16px Arial">
        <option selected>A</option>
        <option>THIS UNSELECTED VISIBLE OPTION IS FAR TOO LONG</option>
        <option>B</option>
      </select>
    `, "desktop");
    assert.ok(nativeListbox.some((finding) =>
      finding.startsWith("text-form-clipped-x:select(post-native-listbox)")
    ));
    assert.ok(!nativeListbox.some((finding) =>
      finding.startsWith("touch-target-core-owned-descendant-intercepts:select(post-native-listbox)")
    ));
  });

  await t.test("only real top-hit geometry blocks the complete core", async () => {
    const harmlessPseudo = await renderAndCollect(page, `
      <button aria-label="post-pseudo-safe" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px">Safe</button>
      <div class="post-distant-pseudo" style="position:absolute;left:350px;top:180px;width:1px;height:1px"></div>
    `, "desktop", `.post-distant-pseudo::before { content:""; position:absolute; width:0; height:0; pointer-events:auto; }`);
    assert.deepEqual(harmlessPseudo.filter((finding) => finding.includes("post-pseudo-safe")), []);

    const behindRounded = await renderAndCollect(page, `
      <div style="position:absolute;left:20px;top:20px;width:44px;height:44px;border-radius:50%;background:#eee;z-index:1"></div>
      <button aria-label="post-rounded-behind-safe" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px;z-index:2">Front</button>
    `, "desktop");
    assert.deepEqual(behindRounded.filter((finding) => finding.includes("post-rounded-behind-safe")), []);

    const behindBoundaryCandidates = Array.from({ length: 129 }, (_, index) =>
      `<i style="position:absolute;z-index:1;left:${20 + index * 0.2}px;top:20px;` +
      `width:0.1px;height:44px;pointer-events:auto"></i>`
    ).join("");
    const capBehind = await renderAndCollect(page, `
      ${behindBoundaryCandidates}
      <button aria-label="post-129-behind-safe" type="button"
        style="position:absolute;z-index:2;left:20px;top:20px;width:44px;height:44px">Front</button>
    `, "desktop");
    assert.deepEqual(capBehind.filter((finding) => finding.includes("post-129-behind-safe")), []);

    const actualTopHit = await renderAndCollect(page, `
      <button aria-label="post-actual-top-hit-blocked" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px">Blocked</button>
      <div aria-label="post-actual-top-hit-blocker"
        style="position:absolute;z-index:3;left:36px;top:36px;width:3px;height:3px;pointer-events:auto"></div>
    `, "desktop");
    assert.ok(actualTopHit.some((finding) =>
      finding.startsWith("touch-target-core-cell-blocked:button(post-actual-top-hit-blocked)") &&
      finding.includes("post-actual-top-hit-blocker")
    ));

    const roundedAncestor = await renderAndCollect(page, `
      <div aria-label="post-rounded-safe-ancestor"
        style="position:absolute;left:20px;top:20px;width:100px;height:100px;padding:28px;border-radius:20px;overflow:hidden">
        <button aria-label="post-rounded-safe-control" type="button" style="width:44px;height:44px">Safe</button>
      </div>
      <div aria-label="post-rounded-clipping-ancestor"
        style="position:absolute;left:170px;top:20px;width:54px;height:54px;border-radius:20px;overflow:hidden">
        <button aria-label="post-rounded-clipped-control" type="button"
          style="position:absolute;left:0;top:0;width:44px;height:44px">Clipped</button>
      </div>
    `, "desktop");
    assert.deepEqual(roundedAncestor.filter((finding) => finding.includes("post-rounded-safe-control")), []);
    assert.ok(roundedAncestor.some((finding) =>
      finding.includes("post-rounded-clipped-control") && finding.includes("rounded-overflow-clip")
    ));
  });

  await t.test("owned descendants distinguish decoration from independent activation", async () => {
    const ordinary = await renderAndCollect(page, `
      <button aria-label="post-ordinary-owned-control" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px;padding:0">
        <span aria-label="post-ordinary-owned-span"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
    `, "desktop");
    assert.deepEqual(ordinary.filter((finding) => finding.includes("post-ordinary-owned-control")), []);

    const semantic = await renderAndCollect(page, `
      <button aria-label="post-semantic-owner" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px;padding:0">
        <span aria-label="post-semantic-owned-button" role="button"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
    `, "desktop");
    assert.ok(semantic.some((finding) =>
      finding.startsWith("touch-target-core-owned-descendant-intercepts:button(post-semantic-owner)") &&
      finding.includes("post-semantic-owned-button")
    ));

    await renderAndCollect(page, `
      <button aria-label="post-listener-owner" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px;padding:0">
        <span id="post-listener-owned-span" aria-label="post-listener-owned-span"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
      <button aria-label="post-react-owner" type="button"
        style="position:absolute;left:90px;top:20px;width:44px;height:44px;padding:0">
        <span id="post-react-owned-span" aria-label="post-react-owned-span"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
      <button aria-label="post-cursor-owner" type="button"
        style="position:absolute;left:160px;top:20px;width:44px;height:44px;padding:0">
        <span aria-label="post-cursor-owned-span"
          style="position:absolute;inset:0;pointer-events:auto;cursor:pointer"></span>
      </button>
      <button aria-label="post-property-owner" type="button"
        style="position:absolute;left:230px;top:20px;width:44px;height:44px;padding:0">
        <span id="post-property-owned-span" aria-label="post-property-owned-span"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
      <button aria-label="post-removed-listener-owner" type="button"
        style="position:absolute;left:300px;top:20px;width:44px;height:44px;padding:0">
        <span id="post-removed-listener-span" aria-label="post-removed-listener-span"
          style="position:absolute;inset:0;pointer-events:auto"></span>
      </button>
    `, "desktop");
    await page.evaluate(() => {
      const listener = document.querySelector("#post-listener-owned-span");
      const react = document.querySelector("#post-react-owned-span") as HTMLElement & Record<string, unknown> | null;
      const property = document.querySelector<HTMLElement>("#post-property-owned-span");
      const removed = document.querySelector("#post-removed-listener-span");
      if (!listener || !react || !property || !removed) throw new Error("missing owned descendant fixtures");
      listener.addEventListener("click", () => undefined);
      react["__reactProps$synthetic"] = { onClick: window.setTimeout };
      property.onclick = () => undefined;
      const removedCallback = () => undefined;
      removed.addEventListener("click", removedCallback, { capture: true });
      removed.removeEventListener("click", removedCallback, { capture: true });
    });
    const activeFindings = await collectVisualizationUiFindings(page.locator("#workspace"), axis("desktop"));
    for (const [owner, descendant] of [
      ["post-listener-owner", "post-listener-owned-span"],
      ["post-react-owner", "post-react-owned-span"],
      ["post-cursor-owner", "post-cursor-owned-span"],
      ["post-property-owner", "post-property-owned-span"]
    ] as const) {
      assert.ok(activeFindings.some((finding) =>
        finding.startsWith(`touch-target-core-owned-descendant-intercepts:button(${owner})`) &&
        finding.includes(descendant)
      ), `${descendant} must remain an independently active top hit`);
    }
    assert.deepEqual(
      activeFindings.filter((finding) => finding.includes("post-removed-listener-owner")),
      [],
      "add then exact removeEventListener must restore an ordinary owned descendant to decorative status"
    );
  });

  await t.test("touch audit receipts expose partition and device-pixel fallback cost", async () => {
    await renderAndCollect(page, `
      <button aria-label="post-telemetry-partition-control" type="button"
        style="position:absolute;left:20px;top:20px;width:44px;height:44px">Partition</button>
    `, "desktop");
    const partition = await collectVisualizationUiAuditEvidence(
      page.locator("#workspace"),
      axis("desktop")
    );
    assert.equal(partition.touchAudit.auditedControlCount, 1);
    assert.equal(partition.touchAudit.devicePixelFallbackControlCount, 0);
    assert.ok(partition.touchAudit.coreHitTestCount > 0);

    await renderAndCollect(page, `
      <style>
        [data-post-telemetry-pseudo]::after {
          content:"";
          position:absolute;
          left:30px;
          top:7px;
          width:3px;
          height:3px;
          pointer-events:auto;
        }
      </style>
      <div data-post-telemetry-pseudo style="position:absolute;left:20px;top:20px;width:44px;height:44px;pointer-events:none">
        <button aria-label="post-telemetry-pseudo-control" type="button"
          style="position:absolute;inset:0;width:44px;height:44px">Pseudo</button>
      </div>
    `, "desktop");
    const pseudo = await collectVisualizationUiAuditEvidence(
      page.locator("#workspace"),
      axis("desktop")
    );
    assert.equal(pseudo.touchAudit.auditedControlCount, 1);
    assert.equal(pseudo.touchAudit.devicePixelFallbackControlCount, 1);
    assert.equal(pseudo.touchAudit.pseudoFallbackControlCount, 1);
    assert.ok(pseudo.touchAudit.coreHitTestCount >= 44 * 44);
    assert.match(pseudo.touchAudit.algorithmSha256, /^[a-f0-9]{64}$/);
    assert.match(pseudo.touchAudit.receiptSha256, /^[a-f0-9]{64}$/);

    const summary = summarizeCaliforniaTouchAuditEvidence([
      { completed: true, findingCount: partition.findings.length, state: "partition", touchAudit: partition.touchAudit },
      { completed: true, findingCount: pseudo.findings.length, state: "pseudo", touchAudit: pseudo.touchAudit }
    ]);
    assert.equal(summary.auditCount, 2);
    assert.equal(summary.fallbackAuditCount, 1);
    assert.equal(summary.fallbackControlCount, 1);
    assert.equal(summary.missingEvidenceCount, 0);
    assert.ok(summary.durationP50Ms !== null && summary.durationP50Ms >= 0);
    assert.ok(summary.durationP95Ms !== null && summary.durationP95Ms >= summary.durationP50Ms!);
    assert.ok(summary.durationMaxMs !== null && summary.durationMaxMs >= summary.durationP95Ms!);
    assert.match(summary.receiptSetSha256, /^[a-f0-9]{64}$/);
  });

  await t.test("visible text uses real paint runs and fails closed on unsupported paint", async () => {
    const formGap = await renderAndCollect(page, `
      <input aria-label="post-short-form-value" value="A"
        style="position:absolute;left:20px;top:20px;width:220px;height:44px;padding:8px;font-size:16px">
      <span style="position:absolute;left:205px;top:32px;font-size:12px">FAR Z</span>
    `, "desktop");
    assert.ok(!formGap.some((finding) =>
      finding.startsWith("dom-text-overlap:") && finding.includes("post-short-form-value")
    ));

    const unsupportedPaint = await renderAndCollect(page, `
      <span aria-label="post-stroked-text" style="position:absolute;left:20px;top:20px;font-size:24px;-webkit-text-stroke:4px #c00">STROKE</span>
      <span aria-label="post-shadowed-text" style="position:absolute;left:20px;top:70px;font-size:24px;text-shadow:40px 0 #c00">SHADOW</span>
      <span aria-label="post-filtered-text" style="position:absolute;left:20px;top:120px;font-size:24px;filter:blur(2px)">FILTER</span>
      <span aria-label="post-off-workspace-text" style="position:absolute;left:-300px;top:180px;font-size:20px">OFF WORKSPACE</span>
    `, "desktop");
    for (const [label, reason] of [
      ["post-stroked-text", "text-stroke"],
      ["post-shadowed-text", "text-shadow"],
      ["post-filtered-text", "filter"],
      ["post-off-workspace-text", "text-outside-workspace"]
    ] as const) {
      assert.ok(
        unsupportedPaint.some((finding) => finding.includes(label) && finding.includes(reason)),
        `${label} must expose ${reason}`
      );
    }
  });

  await t.test("form glyph runs honor vertical centering, alignment, indentation, scrolling, and lines", async () => {
    const verticalMisses = await renderAndCollect(page, `
      <input aria-label="post-centered-input" value="CENTERGLYPH"
        style="position:absolute;left:20px;top:20px;width:150px;height:44px;padding:0;border:0;font:16px/16px Arial">
      <span style="position:absolute;left:20px;top:20px;font:8px/8px Arial">INPUT TOP MISS</span>
      <span style="position:absolute;left:20px;top:56px;font:8px/8px Arial">INPUT BOTTOM MISS</span>
      <select aria-label="post-centered-select"
        style="position:absolute;left:220px;top:20px;width:150px;height:44px;padding:0;border:0;font:16px/16px Arial">
        <option selected>SELECTGLYPH</option>
      </select>
      <span style="position:absolute;left:220px;top:20px;font:8px/8px Arial">SELECT TOP MISS</span>
      <span style="position:absolute;left:220px;top:56px;font:8px/8px Arial">SELECT BOTTOM MISS</span>
    `, "desktop");
    for (const label of ["post-centered-input", "post-centered-select"]) {
      assert.ok(!verticalMisses.some((finding) =>
        finding.startsWith("dom-text-overlap:") && finding.includes(label) && finding.includes("MISS")
      ), `${label} must use its vertically centered glyph line rather than the whole content box`);
    }

    const verticalHits = await renderAndCollect(page, `
      <input aria-label="post-centered-input-hit" value="CENTERGLYPH"
        style="position:absolute;left:20px;top:20px;width:150px;height:44px;padding:0;border:0;font:16px/16px Arial">
      <span style="position:absolute;left:20px;top:34px;font:16px/16px Arial">CENTERGLYPH</span>
      <select aria-label="post-centered-select-hit"
        style="position:absolute;left:220px;top:20px;width:150px;height:44px;padding:0;border:0;font:16px/16px Arial">
        <option selected>SELECTGLYPH</option>
      </select>
      <span style="position:absolute;left:220px;top:34px;font:16px/16px Arial">SELECTGLYPH</span>
    `, "desktop");
    for (const label of ["post-centered-input-hit", "post-centered-select-hit"]) {
      assert.ok(verticalHits.some((finding) =>
        finding.startsWith("dom-text-overlap:") && finding.includes(label)
      ), `${label} must collide with a genuine centered-line overlay`);
    }

    const positionedGlyphs = await renderAndCollect(page, `
      <input aria-label="post-right-aligned-input" value="RIGHT"
        style="position:absolute;left:20px;top:90px;width:180px;height:44px;padding:0;border:0;font:16px/16px Arial;text-align:right">
      <span style="position:absolute;left:156px;top:104px;font:16px/16px Arial">RIGHT</span>
      <input aria-label="post-rtl-start-input" value="RTL"
        style="position:absolute;left:220px;top:90px;width:180px;height:44px;padding:0;border:0;font:16px/16px Arial;direction:rtl;text-align:start">
      <span style="position:absolute;left:370px;top:104px;font:16px/16px Arial">RTL</span>
      <input aria-label="post-indented-input" value="INDENT"
        style="position:absolute;left:20px;top:160px;width:180px;height:44px;padding:0;border:0;font:16px/16px Arial;text-indent:40px">
      <span style="position:absolute;left:60px;top:174px;font:16px/16px Arial">INDENT</span>
    `, "desktop");
    for (const label of ["post-right-aligned-input", "post-rtl-start-input", "post-indented-input"]) {
      assert.ok(positionedGlyphs.some((finding) =>
        finding.startsWith("dom-text-overlap:") && finding.includes(label)
      ), `${label} must expose its computed horizontal glyph position`);
    }

    await renderAndCollect(page, `
      <input id="post-scrolled-input" aria-label="post-scrolled-input" value="AAAA BBBB CCCC DDDD"
        style="position:absolute;left:20px;top:20px;width:100px;height:44px;padding:0;border:0;font:16px/16px Arial;white-space:pre">
      <span style="position:absolute;left:20px;top:34px;font:16px/16px Arial">DDDD</span>
      <textarea aria-label="post-multiline-textarea"
        style="position:absolute;left:180px;top:20px;width:160px;height:70px;padding:0;border:0;font:16px/20px Arial">FIRST LINE&#10;SECOND LINE</textarea>
      <span style="position:absolute;left:180px;top:40px;font:16px/20px Arial">SECOND LINE</span>
    `, "desktop");
    await page.locator("#post-scrolled-input").evaluate((element) => {
      const input = element as HTMLInputElement;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.scrollLeft = input.scrollWidth;
    });
    const scrolledAndMultiline = await collectVisualizationUiFindings(page.locator("#workspace"), axis("desktop"));
    assert.ok(scrolledAndMultiline.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("post-scrolled-input") && finding.includes("DDDD")
    ));
    assert.ok(scrolledAndMultiline.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("post-multiline-textarea") && finding.includes("SECOND LINE")
    ));
  });

  await t.test("viewport-only control text is remeasured after reversible centered scrolling", async () => {
    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}</style></head>
        <body>
          <main id="post-viewport-workspace" data-viz-surface style="height:1200px;position:relative">
            <button aria-label="post-viewport-only" type="button"
              style="height:44px;position:absolute;top:300px;width:100px">Viewport only</button>
          </main>
        </body>
      </html>
    `);
    await page.evaluate(() => window.scrollTo(0, 340));
    const originalWindowScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    const viewportOnly = await collectVisualizationUiFindings(
      page.locator("#post-viewport-workspace"),
      axis("desktop")
    );
    assert.deepEqual(
      viewportOnly.filter((finding) => finding.includes("post-viewport-only")),
      [],
      "a viewport-only 44px control must be centered, settled, and text-remeasured before acceptance"
    );
    assert.deepEqual(
      await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
      originalWindowScroll,
      "the viewport-only audit must restore both window scroll axes exactly"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}</style></head>
        <body>
          <main id="post-nested-workspace" data-viz-surface style="height:1400px;position:relative">
            <div id="post-nested-scroller"
              style="height:120px;overflow:auto;position:absolute;top:300px;width:300px">
              <div style="height:600px;position:relative">
                <button aria-label="post-nested-viewport-only" type="button"
                  style="height:44px;position:absolute;top:120px;width:140px">Nested viewport only</button>
              </div>
            </div>
          </main>
        </body>
      </html>
    `);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>("#post-nested-scroller")!.scrollTo(13, 100);
      window.scrollTo(0, 340);
    });
    const originalNestedScroll = await page.evaluate(() => ({
      ancestorLeft: document.querySelector<HTMLElement>("#post-nested-scroller")!.scrollLeft,
      ancestorTop: document.querySelector<HTMLElement>("#post-nested-scroller")!.scrollTop,
      windowX: window.scrollX,
      windowY: window.scrollY
    }));
    const nestedViewportOnly = await collectVisualizationUiFindings(
      page.locator("#post-nested-workspace"),
      axis("desktop")
    );
    assert.deepEqual(
      nestedViewportOnly.filter((finding) => finding.includes("post-nested-viewport-only")),
      [],
      "a nested-scroll partial control must be remeasured in its centered settled geometry"
    );
    assert.deepEqual(
      await page.evaluate(() => ({
        ancestorLeft: document.querySelector<HTMLElement>("#post-nested-scroller")!.scrollLeft,
        ancestorTop: document.querySelector<HTMLElement>("#post-nested-scroller")!.scrollTop,
        windowX: window.scrollX,
        windowY: window.scrollY
      })),
      originalNestedScroll,
      "every ancestor and window scroll axis must be restored exactly"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}</style></head>
        <body>
          <main id="post-viewport-negatives" data-viz-surface style="height:1200px;position:relative">
            <span aria-label="post-plain-offscreen-text"
              style="position:absolute;top:900px">Plain offscreen text</span>
            <div style="height:4px;overflow:hidden;position:absolute;top:40px;width:160px">
              <button aria-label="post-css-clipped-control" type="button"
                style="height:44px;width:140px">CSS clipped</button>
            </div>
          </main>
        </body>
      </html>
    `);
    await page.evaluate(() => window.scrollTo(0, 0));
    const negatives = await collectVisualizationUiFindings(
      page.locator("#post-viewport-negatives"),
      axis("desktop")
    );
    assert.ok(negatives.some((finding) =>
      finding.startsWith("text-clipped-by-viewport:") && finding.includes("post-plain-offscreen-text")
    ), "plain offscreen text must not inherit the interactive viewport recheck exemption");
    assert.ok(negatives.some((finding) =>
      finding.startsWith("touch-target-clipped:button(post-css-clipped-control)")
    ), "a real overflow-hidden clip must remain red after viewport recheck support");

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0}</style></head>
        <body>
          <main id="post-mutating-workspace" data-viz-surface style="height:1200px;position:relative">
            <button id="post-mutating-control" aria-label="post-mutating-viewport-control" type="button"
              style="height:44px;position:absolute;top:300px;width:120px">Mutation</button>
          </main>
          <script>
            window.addEventListener("scroll", () => {
              const target = document.querySelector("#post-mutating-control");
              if (target && window.scrollY < 340) target.style.top = "320px";
            });
          </script>
        </body>
      </html>
    `);
    await page.evaluate(() => window.scrollTo(0, 340));
    const mutatingOriginalScroll = await page.evaluate(() => window.scrollY);
    const mutating = await collectVisualizationUiFindings(
      page.locator("#post-mutating-workspace"),
      axis("desktop")
    );
    assert.ok(mutating.some((finding) =>
      finding.startsWith("touch-target-layout-mutated:button(post-mutating-viewport-control):viewport-recheck")
    ), "scroll-driven layout mutation must fail closed even when it becomes frame-stable");
    assert.equal(await page.evaluate(() => window.scrollY), mutatingOriginalScroll);
  });

  await t.test("viewport recheck preserves original findings and reverses document-wide side effects", async () => {
    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>
          *{box-sizing:border-box}html,body{margin:0}
          #post-fixed-root{height:1200px;position:relative;width:800px}
          #post-fixed-candidate{font:16px/20px Arial;height:44px;left:20px;padding:0;position:absolute;text-align:left;top:300px;width:180px}
          #post-fixed-overlay{font:16px/20px Arial;left:20px;position:fixed;top:2px;z-index:20}
        </style></head>
        <body>
          <main id="post-fixed-root" data-viz-surface>
            <button id="post-fixed-candidate" aria-label="post-fixed-collision-candidate" disabled>OVERLAP LABEL</button>
            <span id="post-fixed-overlay" aria-label="post-fixed-collision-overlay">OVERLAP LABEL</span>
          </main>
        </body>
      </html>
    `);
    await page.evaluate(() => {
      window.scrollTo(0, 310);
      document.querySelector("#post-fixed-candidate")!.removeAttribute("disabled");
    });
    const fixedCollision = await collectVisualizationUiFindings(
      page.locator("#post-fixed-root"),
      axis("desktop")
    );
    assert.ok(fixedCollision.some((finding) =>
      finding.startsWith("dom-text-overlap:") &&
      finding.includes("post-fixed-collision-candidate") &&
      finding.includes("post-fixed-collision-overlay")
    ), "centering a viewport-only control must not erase a collision visible at the user's original scroll position");
    assert.equal(await page.evaluate(() => window.scrollY), 310);

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <style id="post-dynamic-font">.post-font-target{font:30px/30px Arial}</style>
          <style>
            *{box-sizing:border-box}html,body{margin:0}
            #post-font-root{height:1200px;position:relative;width:800px}
            #post-font-candidate{height:44px;left:20px;padding:0;position:absolute;top:300px;width:100px}
          </style>
        </head>
        <body>
          <main id="post-font-root" data-viz-surface>
            <input id="post-font-candidate" class="post-font-target" aria-label="post-external-font-candidate" value="LONG LABEL">
          </main>
          <script>
            window.__postArmFontMutation = false;
            window.addEventListener("scroll", () => {
              if (window.__postArmFontMutation && window.scrollY < 300) {
                document.querySelector("#post-dynamic-font").textContent = ".post-font-target{font:12px/12px Arial}";
              }
            });
          </script>
        </body>
      </html>
    `);
    await page.evaluate(() => {
      window.scrollTo(0, 310);
      (window as Window & { __postArmFontMutation?: boolean }).__postArmFontMutation = true;
    });
    const fontMutation = await collectVisualizationUiFindings(
      page.locator("#post-font-root"),
      axis("desktop")
    );
    assert.ok(fontMutation.some((finding) =>
      finding.startsWith("text-form-clipped-x:") && finding.includes("post-external-font-candidate")
    ), "the original large-font clipping must remain in evidence");
    assert.ok(fontMutation.some((finding) =>
      finding.startsWith("touch-target-layout-mutated:") && finding.includes("post-external-font-candidate")
    ), "a head stylesheet/font mutation caused by artificial scrolling must fail closed");
    assert.deepEqual(
      await page.evaluate(() => ({
        fontSize: getComputedStyle(document.querySelector("#post-font-candidate")!).fontSize,
        scrollY: window.scrollY,
        styleText: document.querySelector("#post-dynamic-font")!.textContent
      })),
      {
        fontSize: "30px",
        scrollY: 310,
        styleText: ".post-font-target{font:30px/30px Arial}"
      },
      "document/head/style/font state and scroll must be restored even after a failed recheck"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <style id="post-cssom-style">.post-cssom-target{font:30px/30px Arial}</style>
          <style>
            *{box-sizing:border-box}html,body{margin:0}
            #post-cssom-root{height:1200px;position:relative;width:800px}
            #post-cssom-candidate{height:44px;left:20px;padding:0;position:absolute;top:300px;width:100px}
          </style>
        </head>
        <body>
          <main id="post-cssom-root" data-viz-surface>
            <input id="post-cssom-candidate" class="post-cssom-target" aria-label="post-cssom-environment-candidate" value="LONG LABEL">
          </main>
          <script>
            window.__postArmCssomMutation = false;
            window.addEventListener("scroll", () => {
              if (!window.__postArmCssomMutation || window.scrollY >= 300) return;
              window.__postArmCssomMutation = false;
              const sheet = document.querySelector("#post-cssom-style").sheet;
              sheet.deleteRule(0);
              sheet.insertRule(".post-cssom-target{font:12px/12px Arial}", 0);
              const adopted = new CSSStyleSheet();
              adopted.replaceSync(".post-cssom-target{transform:translateX(1px)}");
              document.adoptedStyleSheets = [...document.adoptedStyleSheets, adopted];
              document.fonts.add(new FontFace("PostViewportMutation", "local(Arial)"));
            });
          </script>
        </body>
      </html>
    `);
    const cssomBefore = await page.evaluate(() => ({
      adopted: document.adoptedStyleSheets.length,
      fonts: Array.from(document.fonts).length,
      rules: Array.from((document.querySelector("#post-cssom-style") as HTMLStyleElement).sheet!.cssRules)
        .map((rule) => rule.cssText),
      scrollY: (window.scrollTo(0, 310), window.scrollY)
    }));
    await page.evaluate(() => {
      (window as Window & { __postArmCssomMutation?: boolean }).__postArmCssomMutation = true;
    });
    const cssomMutation = await collectVisualizationUiFindings(
      page.locator("#post-cssom-root"),
      axis("desktop")
    );
    assert.ok(cssomMutation.some((finding) =>
      finding.startsWith("touch-target-layout-mutated:") && finding.includes("post-cssom-environment-candidate")
    ), "CSSOM, adopted stylesheet, and FontFaceSet mutations must fail closed");
    assert.deepEqual(
      await page.evaluate(() => ({
        adopted: document.adoptedStyleSheets.length,
        fonts: Array.from(document.fonts).length,
        rules: Array.from((document.querySelector("#post-cssom-style") as HTMLStyleElement).sheet!.cssRules)
          .map((rule) => rule.cssText),
        scrollY: window.scrollY
      })),
      cssomBefore,
      "CSSOM rules, adopted stylesheets, FontFaceSet membership, and scroll must all restore"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>
          *{box-sizing:border-box}html,body{margin:0}
          #post-overlay-root{height:1200px;position:relative;width:800px}
          #post-overlay-candidate{height:44px;left:20px;position:absolute;top:300px;width:160px}
        </style></head>
        <body>
          <main id="post-overlay-root" data-viz-surface>
            <button id="post-overlay-candidate" aria-label="post-overlay-history-candidate">Overlay history</button>
            <dialog id="post-scroll-dialog">Dialog</dialog>
            <div id="post-scroll-popover" popover>Popover</div>
          </main>
          <script>
            window.__postArmOverlayMutation = false;
            window.addEventListener("scroll", () => {
              if (!window.__postArmOverlayMutation || window.scrollY >= 300) return;
              window.__postArmOverlayMutation = false;
              document.querySelector("#post-scroll-dialog").showModal();
              document.querySelector("#post-scroll-popover").showPopover();
              history.pushState({ artificial: true }, "", "#artificial-viewport-audit");
            });
          </script>
        </body>
      </html>
    `);
    const overlayBefore = await page.evaluate(() => {
      window.scrollTo(0, 310);
      return {
        dialogOpen: (document.querySelector("#post-scroll-dialog") as HTMLDialogElement).open,
        href: location.href,
        popoverOpen: document.querySelector("#post-scroll-popover")!.matches(":popover-open"),
        scrollY: window.scrollY,
        state: history.state
      };
    });
    await page.evaluate(() => {
      (window as Window & { __postArmOverlayMutation?: boolean }).__postArmOverlayMutation = true;
    });
    const overlayMutation = await collectVisualizationUiFindings(
      page.locator("#post-overlay-root"),
      axis("desktop")
    );
    assert.ok(overlayMutation.some((finding) =>
      finding.startsWith("touch-target-layout-mutated:") && finding.includes("post-overlay-history-candidate")
    ));
    assert.ok(overlayMutation.some((finding) =>
      finding.startsWith("touch-target-environment-restore-failed:") && finding.includes("post-overlay-history-candidate")
    ), "an irreversible extra history entry must remain fail-closed even after current URL/state restoration");
    assert.deepEqual(
      await page.evaluate(() => ({
        dialogOpen: (document.querySelector("#post-scroll-dialog") as HTMLDialogElement).open,
        href: location.href,
        popoverOpen: document.querySelector("#post-scroll-popover")!.matches(":popover-open"),
        scrollY: window.scrollY,
        state: history.state
      })),
      overlayBefore,
      "dialog, popover, current history URL/state, and scroll must restore before the audit returns"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>
          *{box-sizing:border-box}html,body{margin:0}
          #post-shadow-root{height:1200px;position:relative;width:1000px}
          #post-shadow-scroller{height:120px;left:20px;overflow:auto;position:absolute;top:300px;width:220px}
          #post-shadow-content{height:700px;position:relative;width:900px}
          #post-shadow-host{display:block;left:420px;position:absolute;top:260px}
        </style></head>
        <body><main id="post-shadow-root" data-viz-surface>
          <div id="post-shadow-scroller"><div id="post-shadow-content"><post-shadow-host id="post-shadow-host"></post-shadow-host></div></div>
        </main></body>
      </html>
    `);
    await page.locator("#post-shadow-host").evaluate((host) => {
      host.attachShadow({ mode: "open" }).innerHTML =
        `<button aria-label="post-direct-shadow-viewport" style="height:44px;width:160px">Shadow viewport</button>`;
    });
    await page.evaluate(() => {
      document.querySelector<HTMLElement>("#post-shadow-scroller")!.scrollTo(37, 81);
      window.scrollTo(0, 310);
    });
    const shadowScrollBefore = await page.evaluate(() => ({
      left: document.querySelector<HTMLElement>("#post-shadow-scroller")!.scrollLeft,
      top: document.querySelector<HTMLElement>("#post-shadow-scroller")!.scrollTop,
      windowX: window.scrollX,
      windowY: window.scrollY
    }));
    const shadowFindings = await collectVisualizationUiFindings(
      page.locator("#post-shadow-root"),
      axis("desktop")
    );
    assert.deepEqual(
      await page.evaluate(() => ({
        left: document.querySelector<HTMLElement>("#post-shadow-scroller")!.scrollLeft,
        top: document.querySelector<HTMLElement>("#post-shadow-scroller")!.scrollTop,
        windowX: window.scrollX,
        windowY: window.scrollY
      })),
      shadowScrollBefore,
      "a direct ShadowRoot child must restore every composed light-DOM scroll ancestor"
    );
    assert.ok(!shadowFindings.some((finding) =>
      finding.includes("post-direct-shadow-viewport") && finding.startsWith("touch-target-scroll-restore-failed:")
    ));

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>
          *{box-sizing:border-box}html,body{margin:0}
          #post-tag-root{height:1600px;position:relative;width:800px}
          #post-tag-candidate{height:44px;left:20px;position:absolute;top:300px;width:160px}
          .post-same{height:20px;position:absolute;width:20px}
          .post-same-one{top:900px}.post-same-two{top:1100px}
        </style></head>
        <body><main id="post-tag-root" data-viz-surface>
          <span aria-label="post-literal-{california-viewport-recheck-0}-unrelated" style="position:absolute;top:1300px">LITERAL TOKEN</span>
          <button id="post-tag-candidate" aria-label="post-tag-candidate">Tag candidate</button>
          <button class="post-same post-same-one" aria-label="post-same-label-control">S</button>
          <button class="post-same post-same-two" aria-label="post-same-label-control">S</button>
        </main></body>
      </html>
    `);
    await page.evaluate(() => window.scrollTo(0, 310));
    const structuredFindings = await collectVisualizationUiFindings(
      page.locator("#post-tag-root"),
      axis("desktop")
    );
    assert.ok(structuredFindings.some((finding) =>
      finding.startsWith("text-clipped-by-viewport:") &&
      finding.includes("post-literal-{california-viewport-recheck-0}-unrelated")
    ), "user text resembling an internal identifier must remain unrelated evidence");
    assert.equal(
      structuredFindings.filter((finding) =>
        finding.startsWith("touch-target-small:button(post-same-label-control)")
      ).length,
      2,
      "two same-label controls must retain two identity-distinct failure receipts"
    );

    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><style>
          *{box-sizing:border-box}html,body{margin:0}
          #post-multiple-root{height:1800px;position:relative;width:800px}
          .post-multiple{height:44px;position:absolute;width:160px}
          #post-multiple-first{top:300px}#post-multiple-second{top:920px}
        </style></head>
        <body><main id="post-multiple-root" data-viz-surface>
          <button id="post-multiple-first" class="post-multiple" aria-label="post-multiple-first">First viewport</button>
          <button id="post-multiple-second" class="post-multiple" aria-label="post-multiple-second">Second viewport</button>
        </main></body>
      </html>
    `);
    await page.evaluate(() => window.scrollTo(0, 310));
    const multipleBefore = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    const multipleFindings = await collectVisualizationUiFindings(
      page.locator("#post-multiple-root"),
      axis("desktop")
    );
    assert.deepEqual(
      multipleFindings.filter((finding) =>
        finding.includes("post-multiple-first") || finding.includes("post-multiple-second")
      ),
      [],
      "multiple clean viewport-only controls remain green after identity-scoped rechecks"
    );
    assert.deepEqual(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })), multipleBefore);
  });

  await t.test("workspace and traversal limits fail closed", async () => {
    const clipped = await renderAndCollect(page, `
      <span aria-label="post-workspace-clipped-text"
        style="position:absolute;left:-50px;top:20px;font:20px Arial">WORKSPACE CLIP</span>
      <input aria-label="post-workspace-clipped-form" value="FORM CLIP"
        style="position:absolute;left:-50px;top:70px;width:120px;height:44px;padding:0;border:0;font:16px/16px Arial">
    `, "desktop");
    for (const label of ["post-workspace-clipped-text", "post-workspace-clipped-form"]) {
      assert.ok(clipped.some((finding) =>
        finding.startsWith("text-outside-workspace:") && finding.includes(label)
      ));
      assert.ok(clipped.some((finding) =>
        finding.startsWith("text-clipped-by-viewport:") && finding.includes(label)
      ));
    }

    const deepMarkup = `${"<div>".repeat(270)}<button aria-label="post-too-deep-control" style="width:44px;height:44px">Deep</button>${"</div>".repeat(270)}`;
    const traversal = await renderAndCollect(page, deepMarkup, "desktop");
    assert.ok(traversal.some((finding) =>
      finding === "ui-audit-traversal-limit:elements:depth-cap-256"
    ));
    assert.ok(traversal.some((finding) =>
      finding === "ui-audit-traversal-limit:text:depth-cap-256"
    ));
  });
});
