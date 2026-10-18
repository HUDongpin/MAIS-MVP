import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const imageSha256 = "d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889";
const sizes = [[320, 568], [390, 844], [639, 900], [640, 900], [768, 1024], [1023, 768], [1024, 768], [1440, 900], [2560, 1440]] as const;
const copy = {
  en: { descriptor: "Math AI System", lead: "Math learning should be", promise: "fun and personalized!", label: "Start Learning" },
  "zh-Hans": { descriptor: "数学人工智能系统", lead: "数学学习应该", promise: "既有趣又个性化！", label: "开始学习" },
  zh: { descriptor: "數學人工智能系統", lead: "數學學習應該", promise: "既有趣又個人化！", label: "開始學習" }
} as const;
type Locale = keyof typeof copy;

function observeFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("console", message => { if (message.type() === "error") failures.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on("requestfailed", request => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    const isAsset = ["image", "stylesheet", "font", "script"].includes(request.resourceType());
    // Navigation may cancel an in-flight Next prefetch, but failed assets must never pass.
    if (isAsset || !/ERR_ABORTED|NS_BINDING_ABORTED/u.test(reason)) failures.push(`${reason} ${request.url()}`);
  });
  return failures;
}

async function prepare(page: Page, width: number, height: number, locale: Locale = "en", dark = false) {
  await page.setViewportSize({ width, height });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#pedanova-home-hero h1")).toBeVisible();
  await page.getByRole("button", { name: /Language selector|語言選擇|语言选择/iu }).click();
  await page.getByRole("menuitemradio").nth(["en", "zh-Hans", "zh"].indexOf(locale)).click();
  await expect(page.locator("html")).toHaveAttribute("lang", { en: "en-HK", "zh-Hans": "zh-Hans-CN", zh: "zh-Hant-HK" }[locale]);
  if (dark) await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await page.mouse.move(0, 0);
  await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; });
  await page.waitForLoadState("networkidle");
}

async function inspect(page: Page, locale: Locale, width: number, dark = false) {
  const hero = page.locator("#pedanova-home-hero");
  const cta = hero.locator("a");
  await expect(cta).toHaveAttribute("href", "/login");
  await expect(cta).toHaveAccessibleName(copy[locale].label);
  await expect(hero.locator("img")).toHaveAttribute("alt", "");
  await expect(hero.locator("img")).toHaveAttribute("aria-hidden", "true");
  await expect(hero.locator(".pedanova-mobile-photo")).toHaveAttribute("aria-hidden", "true");

  // Decode the layer actually visible at this breakpoint, including the CSS photo.
  const visibleImage = await hero.evaluate(async (element, mobile) => {
    const image = element.querySelector<HTMLImageElement>("img")!;
    const photo = element.querySelector<HTMLElement>(".pedanova-mobile-photo")!;
    const css = getComputedStyle(photo).backgroundImage;
    const match = /^url\(["']?(.*?)["']?\)$/u.exec(css);
    if (!match) throw new Error("Selected mobile image URL is missing");
    const original = new Image(); original.src = match[1];
    await original.decode();
    if (!mobile) await image.decode();
    return { originalSrc: original.src, desktopSrc: image.currentSrc, originalWidth: original.naturalWidth, originalHeight: original.naturalHeight,
      activeLoaded: mobile ? original.complete && original.naturalWidth > 0 : image.complete && image.naturalWidth > 0,
      imageDisplay: getComputedStyle(image).display, photoDisplay: getComputedStyle(photo).display };
  }, width < 1024);
  expect(visibleImage.activeLoaded).toBe(true);
  if (width >= 1024) {
    const displayed = new URL(visibleImage.desktopSrc, page.url());
    const selectedSource = displayed.pathname === "/_next/image" ? displayed.searchParams.get("url") : displayed.href;
    expect(selectedSource, "visible desktop image must identify its underlying asset").toBeTruthy();
    expect(new URL(selectedSource!, page.url()).href).toBe(new URL(visibleImage.originalSrc, page.url()).href);
  }
  expect([visibleImage.originalWidth, visibleImage.originalHeight]).toEqual([1842, 854]);
  const original = await page.request.get(visibleImage.originalSrc);
  expect(original.ok()).toBe(true);
  expect(createHash("sha256").update(await original.body()).digest("hex")).toBe(imageSha256);
  expect(visibleImage.imageDisplay === "none").toBe(width < 1024);
  expect(visibleImage.photoDisplay === "none").toBe(width >= 1024);

  const m = await hero.evaluate(element => {
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const composition = element.querySelector(".pedanova-copy-composition")!;
    const headline = composition.querySelector("h1")!;
    const button = composition.querySelector("a")!;
    const nodes = { brand: composition.querySelector("p")!, descriptor: composition.querySelectorAll("p")[1],
      lead: headline.querySelector('[aria-hidden="true"] > span:first-child')!, promise: headline.querySelector('[aria-hidden="true"] > span:last-child')!,
      label: button.querySelector("span:nth-child(2)")!, badge: button.querySelector("span:last-child")! };
    const text = Object.fromEntries(Object.entries(nodes).map(([name, node]) => [name, (node as HTMLElement).innerText]));
    const boxes = Object.fromEntries(Object.entries(nodes).map(([name, node]) => [name, rect(node)]));
    const textRects = Object.fromEntries(Object.entries(nodes).map(([name, node]) => {
      const range = document.createRange(); range.selectNodeContents(node);
      return [name, Array.from(range.getClientRects()).filter(r => r.width && r.height).map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom }))];
    }));
    const hidden = Object.entries(nodes).filter(([, node]) => getComputedStyle(node).display === "none" || getComputedStyle(node).visibility === "hidden" || node.getClientRects().length === 0).map(([name]) => name);
    return { hero: rect(element), frame: rect(element.querySelector(".pedanova-hero-frame")!), image: rect(element.querySelector("img")!),
      photo: rect(element.querySelector(".pedanova-mobile-photo")!), headline: rect(headline), button: rect(button),
      headerBottom: document.querySelector("header")!.getBoundingClientRect().bottom, footerTop: document.querySelector("footer")!.getBoundingClientRect().top,
      viewportWidth: innerWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dark: document.documentElement.classList.contains("dark"), text, boxes, textRects, hidden,
      colors: [nodes.brand, nodes.lead, nodes.label].map(node => getComputedStyle(node).color),
      weights: [nodes.brand, nodes.lead, nodes.label].map(node => getComputedStyle(node).fontWeight) };
  });
  expect(m.text).toEqual({ brand: "MAIS", ...copy[locale], badge: "XP" });
  expect(m.dark).toBe(dark);
  expect(m.hidden).toEqual([]);
  expect(m.overflow).toBeLessThanOrEqual(1);
  expect(m.colors).toEqual(["rgb(13, 32, 53)", "rgb(13, 32, 53)", "rgb(5, 9, 29)"]);
  expect(m.weights).toEqual(["900", "700", "900"]);
  expect(Math.abs(m.hero.y - m.headerBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.footerTop - m.hero.bottom)).toBeLessThanOrEqual(1);
  for (const [name, ranges] of Object.entries(m.textRects)) {
    expect(ranges.length, `${name} has rendered text`).toBeGreaterThan(0);
    for (const r of ranges) {
      expect(r.x, `${name} left edge`).toBeGreaterThanOrEqual(-1);
      expect(r.right, `${name} right edge`).toBeLessThanOrEqual(m.viewportWidth + 1);
      expect(r.y, `${name} top edge`).toBeGreaterThanOrEqual(m.hero.y - 1);
      expect(r.bottom, `${name} bottom edge`).toBeLessThanOrEqual(m.hero.bottom + 1);
      if (name === "label") {
        expect(r.x).toBeGreaterThanOrEqual(m.button.x - 1);
        expect(r.right).toBeLessThanOrEqual(m.button.right + 1);
      }
    }
  }
  for (const [a, b] of [[m.boxes.brand, m.boxes.descriptor], [m.boxes.brand, m.headline], [m.boxes.descriptor, m.headline], [m.headline, m.button]]) {
    const overlap = Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
    expect(overlap, "copy blocks must not overlap").toBe(false);
  }
  expect(m.boxes.badge.x).toBeGreaterThanOrEqual(0);
  expect(m.boxes.badge.right).toBeLessThanOrEqual(width);
  if (width < 1024) {
    expect(m.photo.height).toBeGreaterThan(0);
    expect(m.photo.y).toBeGreaterThanOrEqual(m.boxes.descriptor.bottom + 7);
    expect(m.photo.bottom).toBeLessThanOrEqual(m.headline.y - 7);
    expect(m.headline.bottom).toBeLessThanOrEqual(m.boxes.badge.y - 7);
  } else {
    expect(Math.abs(m.image.y - m.hero.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(m.image.bottom - m.hero.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(m.frame.height - m.frame.width * 854 / 1842)).toBeLessThanOrEqual(1);
    expect(m.boxes.brand.y).toBeGreaterThan(m.hero.y + m.hero.height * 0.2);
  }
  return { visibleImage, layout: m };
}

for (const locale of ["en", "zh-Hans", "zh"] as const) {
  for (const [width, height] of sizes) {
    test(`homepage ${locale} ${width}x${height} keeps the selected image and copy readable`, async ({ page }, testInfo) => {
      const failures = observeFailures(page);
      await prepare(page, width, height, locale);
      const measured = await inspect(page, locale, width);
      await testInfo.attach("homepage-layout", { body: Buffer.from(JSON.stringify(measured)), contentType: "application/json" });
      expect(failures).toEqual([]);
    });
  }
}
for (const [width, height] of [[390, 844], [1440, 900]] as const) {
  test(`homepage dark ${width}x${height} preserves readable copy`, async ({ page }) => {
    const failures = observeFailures(page);
    await prepare(page, width, height, "en", true);
    await inspect(page, "en", width, true);
    expect(failures).toEqual([]);
  });
}
test("homepage CTA has visible keyboard focus and opens login", async ({ page }) => {
  const failures = observeFailures(page);
  await prepare(page, 1440, 900);
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  const cta = page.locator("#pedanova-home-hero a");
  let reached = false;
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press("Tab");
    reached = await cta.evaluate(element => element === document.activeElement);
    if (reached) break;
  }
  expect(reached).toBe(true);
  await expect(cta).toBeFocused();
  expect(await cta.evaluate(element => element.matches(":focus-visible"))).toBe(true);
  await expect(cta).toHaveCSS("box-shadow", /4px/u);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/login", { waitUntil: "networkidle" });
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(failures).toEqual([]);
});
test.describe("touch", () => {
  test.use({ hasTouch: true });
  test("homepage phone CTA opens login by touch", async ({ page }) => {
    const failures = observeFailures(page);
    await prepare(page, 320, 568);
    const cta = page.locator("#pedanova-home-hero a");
    await cta.scrollIntoViewIfNeeded();
    await cta.tap();
    await page.waitForURL("**/login", { waitUntil: "networkidle" });
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(failures).toEqual([]);
  });
});
