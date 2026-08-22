import { expect, test, type Browser, type Page } from "@playwright/test";

import { installMathCanvasPaintBoundaryProbe } from "./mathCanvasPaintBoundaryProbe";

type Bounds = { left: number; top: number; right: number; bottom: number };
type CanvasBoundarySnapshot = {
  ready: boolean;
  paintOperationCount: number;
  boundsBacking: Bounds | null;
  overflowCssPx: Bounds & { max: number };
  unsupportedOperations: string[];
};

const snapshotSymbolDescription = "mais.diagram-boundary.canvas-2d.snapshot";

async function isolatedCanvasPage(
  browser: Browser,
  attributes = "width=\"100\" height=\"100\""
) {
  const context = await browser.newContext({ viewport: { width: 320, height: 240 } });
  await installMathCanvasPaintBoundaryProbe(context);
  const page = await context.newPage();
  await page.setContent(`
    <style>html,body{margin:0}canvas{display:block;width:100px;height:100px}</style>
    <canvas id="subject" role="img" aria-label="synthetic mathematical canvas" ${attributes}></canvas>
  `);
  return { context, page };
}

async function canvasSnapshot(page: Page) {
  return page.evaluate((description) => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject");
    if (!canvas) throw new Error("synthetic canvas is missing");
    const snapshot = (canvas as unknown as Record<symbol, unknown>)[Symbol.for(description)];
    if (typeof snapshot !== "function") throw new Error("canvas boundary snapshot is missing");
    return (snapshot as (this: HTMLCanvasElement) => CanvasBoundarySnapshot).call(canvas);
  }, snapshotSymbolDescription);
}

test("zero-sized canvas backing stores fail closed", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser, "width=\"0\" height=\"100\"");
  await page.evaluate(() => document.querySelector<HTMLCanvasElement>("#subject")?.getContext("2d"));

  const snapshot = await canvasSnapshot(page);
  expect(snapshot.ready).toBe(true);
  expect(snapshot.unsupportedOperations).toContain("canvas-backing-store-zero:0x100");

  await context.close();
});

test("blank candidate canvases require the versioned intentional-empty policy", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);
  await page.evaluate(() => document.querySelector<HTMLCanvasElement>("#subject")?.getContext("2d"));

  const undeclared = await canvasSnapshot(page);
  expect(undeclared.paintOperationCount).toBe(0);
  expect(undeclared.unsupportedOperations).toContain("blank-canvas-without-policy");

  await page.locator("#subject").evaluate((canvas) => {
    canvas.setAttribute("data-diagram-blank-policy", "intentional-empty-v1");
  });
  const declared = await canvasSnapshot(page);
  expect(declared.unsupportedOperations).not.toContain("blank-canvas-without-policy");

  await context.close();
});

test("destination-out erasing cannot create painted overflow", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillRect(20, 20, 20, 20);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(98, 20, 20, 20);
  });

  const snapshot = await canvasSnapshot(page);
  expect(snapshot.paintOperationCount).toBe(2);
  expect(snapshot.overflowCssPx.max).toBe(0);
  expect(snapshot.unsupportedOperations).toEqual([]);

  await context.close();
});

test("copy replaces stale painted overflow instead of unioning it", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillRect(98, 20, 20, 20);
    ctx.globalCompositeOperation = "copy";
    ctx.fillRect(20, 20, 20, 20);
  });

  const snapshot = await canvasSnapshot(page);
  expect(snapshot.paintOperationCount).toBe(2);
  expect(snapshot.boundsBacking).toEqual({ left: 20, top: 20, right: 40, bottom: 40 });
  expect(snapshot.overflowCssPx.max).toBe(0);
  expect(snapshot.unsupportedOperations).toEqual([]);

  await context.close();
});

test("unrecognized compositors fail closed", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    const ctx = canvas.getContext("2d")!;
    Object.defineProperty(ctx, "globalCompositeOperation", {
      configurable: true,
      get: () => "future-compositor"
    });
    ctx.fillRect(20, 20, 20, 20);
  });

  const snapshot = await canvasSnapshot(page);
  expect(snapshot.unsupportedOperations).toContain("globalCompositeOperation:future-compositor");

  await context.close();
});

function quadraticAt(start: number, control: number, end: number, t: number) {
  return (1 - t) ** 2 * start + 2 * (1 - t) * t * control + t ** 2 * end;
}

function cubicAt(start: number, first: number, second: number, end: number, t: number) {
  return (1 - t) ** 3 * start +
    3 * (1 - t) ** 2 * t * first +
    3 * (1 - t) * t ** 2 * second +
    t ** 3 * end;
}

function cubicDerivativeRoots(start: number, first: number, second: number, end: number) {
  const a = -start + 3 * first - 3 * second + end;
  const b = 2 * (start - 2 * first + second);
  const c = first - start;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((t) => t > 0 && t < 1);
}

test("quadratic and cubic bounds use analytic interior extrema", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);

  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(10, 40);
    ctx.quadraticCurveTo(37, -53, 92, 45);
    ctx.fill();
  });
  const quadratic = await canvasSnapshot(page);
  const quadraticT = (40 - (-53)) / (40 - 2 * (-53) + 45);
  expect(quadratic.boundsBacking?.top).toBeCloseTo(quadraticAt(40, -53, 45, quadraticT), 9);

  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    canvas.width = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(8, 70);
    ctx.bezierCurveTo(31, -80, 73, 160, 96, 10);
    ctx.fill();
  });
  const cubic = await canvasSnapshot(page);
  const candidates = [0, 1, ...cubicDerivativeRoots(70, -80, 160, 10)];
  const cubicValues = candidates.map((t) => cubicAt(70, -80, 160, 10, t));
  expect(cubic.boundsBacking?.top).toBeCloseTo(Math.min(...cubicValues), 9);
  expect(cubic.boundsBacking?.bottom).toBeCloseTo(Math.max(...cubicValues), 9);

  await context.close();
});

test("an acute miter join cannot silently pass with half-line-width expansion", async ({ browser }) => {
  const { context, page } = await isolatedCanvasPage(browser);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#subject")!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 4;
    ctx.lineJoin = "miter";
    ctx.miterLimit = 10;
    ctx.beginPath();
    ctx.moveTo(18, 35);
    ctx.lineTo(5, 50);
    ctx.lineTo(18, 48);
    ctx.stroke();
  });

  const snapshot = await canvasSnapshot(page);
  const failedClosed = snapshot.overflowCssPx.max > 0 ||
    snapshot.unsupportedOperations.some((operation) => operation.startsWith("stroke-miter-join-audit-incomplete"));
  expect(failedClosed).toBe(true);

  await context.close();
});
