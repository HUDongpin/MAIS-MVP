import { expect, test, type Page } from "@playwright/test";

const routeCases = [
  {
    label: "signature directory",
    route: "/student/tools/visualizations?grade=K&track=all&lab=us-ca-math-k-k-cc-cardinality-compare",
    signatureBenchId: "ComparingLab",
    terminalControlSelector: "[data-viz-reset-model]",
    workspaceSelector: "section[data-lab-id]"
  },
  {
    label: "verified California premium direct",
    route: "/student/tools/visualizations/us-ca-math-s4-chapter-04",
    signatureBenchId: null,
    terminalControlSelector: "[data-viz-three-reset-camera]",
    workspaceSelector: "section[data-viz-direct-optimized-route]"
  }
] as const;

type RouteCase = (typeof routeCases)[number];

test.setTimeout(120_000);

async function completeControlResetLifecycle(page: Page, routeCase: RouteCase) {
  const workspace = page.locator(routeCase.workspaceSelector).first();
  const terminalControl = workspace.locator(routeCase.terminalControlSelector).first();

  if (routeCase.signatureBenchId) {
    const switcher = workspace.locator("[data-viz-signature-switcher]").first();
    const comparingTab = switcher.locator(
      `[role="tab"][data-viz-signature-bench-id="${routeCase.signatureBenchId}"]`
    );
    await comparingTab.click();
    await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", routeCase.signatureBenchId);

    const signatureLab = switcher.locator("[data-viz-signature-lab]").first();
    const oldCanvas = await signatureLab.locator("canvas[data-viz-mark]").first().elementHandle();
    expect(oldCanvas, "ComparingLab must expose its executable learner Canvas before reset").not.toBeNull();
    const learnerControl = signatureLab
      .locator("[data-viz-surface] button:not([disabled]), [data-viz-surface] input:not([disabled])")
      .first();
    await expect(learnerControl).toBeVisible();
    await learnerControl.click();
    await terminalControl.click();
    await page.waitForFunction((canvas) => !canvas?.isConnected, oldCanvas);
    await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", routeCase.signatureBenchId);
    await expect(signatureLab.locator("canvas[data-viz-mark]").first()).toBeVisible();
    return;
  }

  await terminalControl.click();
}

async function captureFloatingOccluderEvidence(page: Page, routeCase: RouteCase) {
  return page.evaluate(({ terminalControlSelector, workspaceSelector }) => {
    type Rect = { bottom: number; height: number; left: number; right: number; top: number; width: number };
    const rectRecord = (rect: DOMRect): Rect => ({
      bottom: Number(rect.bottom.toFixed(3)),
      height: Number(rect.height.toFixed(3)),
      left: Number(rect.left.toFixed(3)),
      right: Number(rect.right.toFixed(3)),
      top: Number(rect.top.toFixed(3)),
      width: Number(rect.width.toFixed(3))
    });
    const describe = (element: Element) => {
      const html = element as HTMLElement;
      const label = element.getAttribute("aria-label") ??
        element.getAttribute("aria-labelledby") ??
        (html.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}` +
        `${element.getAttribute("role") ? `[role=${element.getAttribute("role")}]` : ""}` +
        `(${label.slice(0, 100) || "unlabelled"})`;
    };
    const visible = (element: Element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const intersection = (left: DOMRect, right: DOMRect) => {
      const x1 = Math.max(left.left, right.left);
      const y1 = Math.max(left.top, right.top);
      const x2 = Math.min(left.right, right.right);
      const y2 = Math.min(left.bottom, right.bottom);
      return {
        area: Math.max(0, x2 - x1) * Math.max(0, y2 - y1),
        x1,
        x2,
        y1,
        y2
      };
    };

    const workspaceElement = document.querySelector<HTMLElement>(workspaceSelector);
    const overlay = document.querySelector<HTMLElement>('[data-tour="student-tutor"]');
    if (!workspaceElement) throw new Error("Visualization learner workspace is missing.");
    if (!overlay || !visible(overlay)) throw new Error("Visible Nova Tutor launcher is missing.");
    const terminalControl = workspaceElement.querySelector<HTMLElement>(terminalControlSelector);
    if (!terminalControl || !visible(terminalControl)) throw new Error("Terminal learner control is missing.");

    const overlayRect = overlay.getBoundingClientRect();
    const workspaceRect = workspaceElement.getBoundingClientRect();
    const terminalControlRect = terminalControl.getBoundingClientRect();
    const candidates = Array.from(new Set(workspaceElement.querySelectorAll<HTMLElement>([
      "button",
      "input",
      "select",
      "[role='button']",
      "[role='slider']",
      "[role='tab']"
    ].join(",")))).filter(visible);
    const overlaps: Array<{ control: string; controlRect: Rect; hitStack: string[]; overlapArea: number }> = [];
    const interceptions: Array<{ control: string; point: { x: number; y: number }; stack: string[] }> = [];
    const smallTargets: Array<{ control: string; rect: Rect }> = [];

    for (const control of candidates) {
      const controlRect = control.getBoundingClientRect();
      if (controlRect.width < 44 || controlRect.height < 44) {
        smallTargets.push({ control: describe(control), rect: rectRecord(controlRect) });
      }
      const overlap = intersection(controlRect, overlayRect);
      if (overlap.area > 0) {
        const x = (overlap.x1 + overlap.x2) / 2;
        const y = (overlap.y1 + overlap.y2) / 2;
        const stack = document.elementsFromPoint(x, y);
        overlaps.push({
          control: describe(control),
          controlRect: rectRecord(controlRect),
          hitStack: stack.slice(0, 8).map(describe),
          overlapArea: Number(overlap.area.toFixed(3))
        });
      }

      const viewportLeft = Math.max(0, controlRect.left);
      const viewportRight = Math.min(window.innerWidth, controlRect.right);
      const viewportTop = Math.max(0, controlRect.top);
      const viewportBottom = Math.min(window.innerHeight, controlRect.bottom);
      if (viewportRight <= viewportLeft || viewportBottom <= viewportTop) continue;
      const points = [
        { x: (viewportLeft + viewportRight) / 2, y: (viewportTop + viewportBottom) / 2 },
        { x: viewportLeft + 2, y: viewportTop + 2 },
        { x: viewportRight - 2, y: viewportTop + 2 },
        { x: viewportLeft + 2, y: viewportBottom - 2 },
        { x: viewportRight - 2, y: viewportBottom - 2 }
      ];
      for (const point of points) {
        const stack = document.elementsFromPoint(point.x, point.y);
        const overlayIndex = stack.findIndex((entry) => entry === overlay || overlay.contains(entry));
        const controlIndex = stack.findIndex((entry) => entry === control || control.contains(entry));
        if (overlayIndex >= 0 && (controlIndex < 0 || overlayIndex < controlIndex)) {
          interceptions.push({
            control: describe(control),
            point: { x: Number(point.x.toFixed(3)), y: Number(point.y.toFixed(3)) },
            stack: stack.slice(0, 8).map(describe)
          });
          break;
        }
      }
    }

    return {
      candidateCount: candidates.length,
      documentTerminalGap: Number((
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      ).toFixed(3)),
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth
      ),
      interceptions,
      novaRect: rectRecord(overlayRect),
      overlaps,
      smallTargets,
      terminalControl: describe(terminalControl),
      terminalControlNovaHorizontalOverlap: Number(Math.max(
        0,
        Math.min(terminalControlRect.right, overlayRect.right) - Math.max(terminalControlRect.left, overlayRect.left)
      ).toFixed(3)),
      terminalControlRect: rectRecord(terminalControlRect),
      viewport: { height: window.innerHeight, width: window.innerWidth },
      workspaceRect: rectRecord(workspaceRect),
      workspaceTerminalGap: Number((window.innerHeight - workspaceRect.bottom).toFixed(3))
    };
  }, routeCase);
}

function expectClearLearnerControls(
  evidence: Awaited<ReturnType<typeof captureFloatingOccluderEvidence>>,
  context: string
) {
  expect(evidence.candidateCount, context).toBeGreaterThan(0);
  expect(evidence.overlaps, context).toEqual([]);
  expect(evidence.interceptions, context).toEqual([]);
  expect(evidence.smallTargets, context).toEqual([]);
  expect(evidence.horizontalOverflow, context).toBeLessThanOrEqual(0);
}

for (const routeCase of routeCases) {
  test(`${routeCase.label} learner controls clear the visible Nova launcher after reset and at terminal scroll`, async ({ page }, testInfo) => {
    // The unrelated guest-account prompt opens after ten seconds and owns a
    // full-screen pointer trap. Mark only that prompt dismissed so this test
    // can measure the persistent Nova launcher without a second overlay.
    await page.addInitScript(() => {
      window.sessionStorage.setItem("mais-guest-login-prompt-dismissed:visualization", "true");
    });
    await page.goto(routeCase.route, { waitUntil: "domcontentloaded" });

    const workspace = page.locator(routeCase.workspaceSelector).first();
    const terminalControl = workspace.locator(routeCase.terminalControlSelector).first();
    const novaLauncher = page.locator('[data-tour="student-tutor"]').last();
    await expect(workspace).toBeVisible();
    await expect(terminalControl).toBeVisible({ timeout: 30_000 });
    await expect(novaLauncher).toBeVisible();

    await completeControlResetLifecycle(page, routeCase);
    const afterReset = await captureFloatingOccluderEvidence(page, routeCase);

    await page.evaluate(async () => {
      window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const documentTerminal = await captureFloatingOccluderEvidence(page, routeCase);

    await workspace.evaluate(async (element) => {
      element.scrollIntoView({ behavior: "instant", block: "end" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const workspaceTerminal = await captureFloatingOccluderEvidence(page, routeCase);

    await testInfo.attach("floating-occluder-evidence", {
      body: Buffer.from(`${JSON.stringify({ afterReset, documentTerminal, workspaceTerminal }, null, 2)}\n`),
      contentType: "application/json"
    });
    expectClearLearnerControls(afterReset, `${testInfo.project.name}/${routeCase.label}/after-reset: ${JSON.stringify(afterReset)}`);
    expectClearLearnerControls(
      documentTerminal,
      `${testInfo.project.name}/${routeCase.label}/document-terminal: ${JSON.stringify(documentTerminal)}`
    );
    expect(
      Math.abs(documentTerminal.documentTerminalGap),
      `Document terminal scroll must reach the real maximum: ${JSON.stringify(documentTerminal)}`
    ).toBeLessThanOrEqual(1);
    expectClearLearnerControls(
      workspaceTerminal,
      `${testInfo.project.name}/${routeCase.label}/workspace-terminal: ${JSON.stringify(workspaceTerminal)}`
    );
    expect(
      Math.min(
        Math.abs(workspaceTerminal.workspaceTerminalGap),
        Math.abs(workspaceTerminal.documentTerminalGap)
      ),
      `Workspace terminal evidence must use the closest achievable bottom: ${JSON.stringify(workspaceTerminal)}`
    ).toBeLessThanOrEqual(1);
    if (routeCase.signatureBenchId) {
      expect(
        afterReset.terminalControlNovaHorizontalOverlap,
        `Signature footer controls must stay outside Nova's fixed right-side lane: ${JSON.stringify(afterReset)}`
      ).toBe(0);
    }
  });
}
