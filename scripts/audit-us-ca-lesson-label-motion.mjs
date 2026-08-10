#!/usr/bin/env node
/**
 * Empirical detector for the biggest defect class of round 8: an accessible
 * name that never changes while the figure it names does.
 *
 * Source review finds these one file at a time and misses the ones nobody
 * thought to open. This drives each lesson page's controls and compares, for
 * every figure, its aria-label before and after — flagging any figure whose
 * VISIBLE text changed while its accessible name did not.
 *
 * Two rounds of this QA effort reported findings measured on source that the
 * render path contradicted. This measures the render path.
 *
 * Usage — AUTH_SESSION_SECRET must match the dev server's (.claude/launch.json);
 * without it the server rejects the cookie, redirects to /login, and this gate
 * aborts rather than auditing a logged-out page:
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3318 npx tsx scripts/audit-us-ca-lesson-label-motion.mjs [slug...]
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3318";
const USER_ID = process.env.QA_USER_ID ?? "student-shirleen-us";
const INCREASE_CONTROLS = /^(Increase|One more|More |Add one)| plus 100$/i;

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));

async function slugs() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const { usCaliforniaLessonSeeds } = await import(path.join(root, "data/usCaliforniaLessons.ts"));
  return usCaliforniaLessonSeeds.map((s) => s.topicId);
}

const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();

const token = await createSessionToken(USER_ID);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  storageState: { cookies: [{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] },
});
const page = await ctx.newPage();

const findings = [];
let pagesInspected = 0;
const pagesWithNoFigure = [];
const pagesWithNoControl = [];
const retried = [];
const list = await slugs();

for (const slug of list) {
  // A swallowed navigation error made this gate report "clean" against a dead
  // dev server — it found zero figures and concluded there was nothing wrong.
  // A gate that cannot fail is not evidence.
  // A dead server and a first-visit compile look the same from here, so the two
  // are told apart by behaviour: a refused connection aborts immediately, a
  // timeout gets one retry (Next compiles a cold route once, then serves it).
  let navigated = false;
  for (let attempt = 0; attempt < 2 && !navigated; attempt += 1) {
    try {
      await page.goto(`${BASE}/student/lessons/${slug}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      navigated = true;
    } catch (error) {
      const message = error.message.split("\n")[0];
      const refused = /ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(message);
      if (refused) {
        console.error(`\n✗ ${slug} — ${message}`);
        console.error("  The dev server is not reachable. Aborting rather than reporting a pass.");
        await browser.close();
        process.exit(2);
      }
      if (attempt === 1) {
        console.error(`\n✗ ${slug} — navigation failed twice: ${message}`);
        console.error("  Aborting rather than reporting a pass over a page never loaded.");
        await browser.close();
        process.exit(2);
      }
      retried.push(slug);
    }
  }
  // A rejected session cookie does not error — it redirects to /login. This
  // gate then found zero figures on all 76 pages, and only its zero-coverage
  // guard stopped it reporting a pass. Assert we are on the lesson, per
  // navigation, so a session that expires mid-run is caught too.
  const landed = page.url();
  const expectedPath = `/student/lessons/${slug}`;
  let landedPath = "";
  try { landedPath = new URL(landed).pathname; } catch {}
  if (landedPath !== expectedPath) {
    console.error(`\n✗ ${slug} — landed on ${landed}`);
    console.error("  That is not the lesson. The session cookie was rejected, so this run would");
    console.error("  audit a logged-out page.");
    if (!process.env.AUTH_SESSION_SECRET) {
      console.error("  AUTH_SESSION_SECRET is unset — it must match the dev server's (.claude/launch.json).");
    }
    await browser.close();
    process.exit(2);
  }

  // `domcontentloaded` is not enough by itself: the interactive lesson figures
  // mount on hydration. A fixed 500ms wait found zero
  // figures on all 76 pages while the DOM had them a beat later — and because
  // zero figures is indistinguishable from a clean page, this gate's own
  // zero-coverage guard was the only thing that caught it. Wait for the figure
  // itself instead of guessing a duration.
  await page
    .waitForSelector('svg[role="img"], svg[role="group"]', { timeout: 8000 })
    .catch(() => {});

  // snapshot every figure: its accessible name and the text inside it
  const snap = async () =>
    page.$$eval('svg[role="img"], svg[role="group"]', (nodes) =>
      nodes.map((n) => ({
        label: n.getAttribute("aria-label") ?? "",
        text: (n.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    );

  const before = await snap();
  if (!before.length) { pagesWithNoFigure.push(slug); continue; }
  pagesInspected += 1;

  // Change every discoverable state family once, then read again. The old
  // `slice(0, 12)` silently skipped later components on dense lesson pages and
  // ignored range, number, select, and choice controls entirely.
  const ups = await page.getByRole("button", { name: INCREASE_CONTROLS }).all();
  let pressed = 0;
  for (const b of ups) {
    if (await b.isEnabled().catch(() => false)) {
      if (await b.click({ timeout: 1500 }).then(() => true).catch(() => false)) pressed += 1;
    }
  }
  const ranges = page.locator('input[type="range"]');
  for (let index = 0, count = await ranges.count(); index < count; index += 1) {
    const input = ranges.nth(index);
    const max = await input.getAttribute("max");
    if (max != null && await input.inputValue().catch(() => "") !== max) {
      if (await input.fill(max).then(() => true).catch(() => false)) pressed += 1;
    }
  }
  const numbers = page.locator('input[type="number"]');
  for (let index = 0, count = await numbers.count(); index < count; index += 1) {
    const input = numbers.nth(index);
    const max = await input.getAttribute("max");
    if (max != null && await input.inputValue().catch(() => "") !== max) {
      if (await input.fill(max).then(() => true).catch(() => false)) {
        await input.blur().catch(() => {});
        pressed += 1;
      }
    }
  }
  const selects = page.locator("select");
  for (let index = 0, count = await selects.count(); index < count; index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").all();
    if (options.length < 2) continue;
    const lastValue = await options[options.length - 1].getAttribute("value");
    if (lastValue != null && await select.inputValue().catch(() => "") !== lastValue) {
      if (await select.selectOption(lastValue).then(() => true).catch(() => false)) pressed += 1;
    }
  }
  // Element handles stay attached to the original options while aria-pressed
  // changes after each click; nth-of-a-changing-selector locators can skip half
  // the choices.
  const choices = await page.$$('button[aria-pressed="false"]');
  for (const choice of choices) {
    if (await choice.isEnabled().catch(() => false)) {
      if (await choice.click().then(() => true).catch(() => false)) pressed += 1;
    }
  }
  if (!pressed) { pagesWithNoControl.push(slug); continue; }
  await page.waitForTimeout(400);
  const after = await snap();

  for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
    const b = before[i], a = after[i];
    // the figure's own content moved but its accessible name did not
    if (b.text && a.text && b.text !== a.text && b.label && b.label === a.label) {
      findings.push({ slug, index: i, label: norm(b.label).slice(0, 90) });
    }
  }
}

await browser.close();

// Say what was actually covered. Silent zero-coverage is how the first version
// of this script reported a clean run over a server that was not running.
console.log(`audit-us-ca-lesson-label-motion: ${list.length} lesson pages requested`);
console.log(`  inspected (had at least one figure): ${pagesInspected}`);
if (pagesWithNoFigure.length) console.log(`  skipped, no role=img/group figure on screen: ${pagesWithNoFigure.length}`);
if (pagesWithNoControl.length) console.log(`  skipped, no enabled state-changing control: ${pagesWithNoControl.length}`);
if (retried.length) console.log(`  loaded on a retry after a first-visit compile timeout: ${retried.length}`);
if (pagesInspected === 0) {
  console.error("✗ nothing was inspected — refusing to report a pass.");
  process.exit(2);
}
if (!findings.length) {
  console.log("✓ every figure whose content moved also updated its accessible name");
  process.exit(0);
}
const byLabel = new Map();
for (const f of findings) byLabel.set(f.label, [...(byLabel.get(f.label) ?? []), f.slug]);
console.log(`\nstatic accessible name on a figure whose content changed: ${findings.length}\n`);
for (const [label, slugsFor] of byLabel) console.log(`  "${label}"\n      ${[...new Set(slugsFor)].join(", ")}`);
process.exit(1);
