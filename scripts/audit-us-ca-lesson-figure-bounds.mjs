#!/usr/bin/env node
/**
 * Does any figure draw outside its own viewBox in a reachable state?
 *
 * Round 6 found complex-plane drawing a sum at ±10 on a ±5 grid, so the marker
 * left the picture entirely; round 9 found a cross-section polygon protruding
 * past the cube it cuts. Both are the same failure: coordinates computed from
 * control state, with no bound tying them to the drawing area.
 *
 * This drives every control to BOTH extremes and, at each stop, measures every
 * drawn element's bounding box against its own SVG viewBox. An element wholly
 * or partly outside is content the student cannot see.
 *
 * Usage — AUTH_SESSION_SECRET must match the dev server's (.claude/launch.json);
 * without it the server rejects the cookie, redirects to /login, and this gate
 * aborts rather than auditing a logged-out page:
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3318 npx tsx scripts/audit-us-ca-lesson-figure-bounds.mjs [slug...]
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3318";
const USER_ID = process.env.QA_USER_ID ?? "student-shirleen-us";
// Anti-aliasing and stroke width put a pixel or two outside a tight box; a real
// escape is much larger than that.
const SLACK = Number(process.env.BOUNDS_SLACK ?? 3);
// The previous gate pressed at most 12 of at most 10 controls, then called the
// resulting states "both extremes." Several live steppers span hundreds of
// unit presses, and a California page can render more than ten controls. Drive
// until the control itself reports its bound; the cap is only an infinite-loop
// guard, and reaching it while still enabled is a gate failure.
const MAX_CONTROL_PRESSES = Number(process.env.MAX_CONTROL_PRESSES ?? 1200);
const DIRECTION_CONTROLS = {
  max: /^(Increase|One more|More |Add one)| plus 100$/i,
  min: /^(Decrease|One fewer|Fewer |Remove one)| minus 100$/i,
};

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));
const { ccssLessonSequenceForTopic } = await import(path.join(root, "data/ccssLessonAssignments.ts"));

async function slugs() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const { usCaliforniaLessonSeeds } = await import(path.join(root, "data/usCaliforniaLessons.ts"));
  return usCaliforniaLessonSeeds.map((s) => s.topicId);
}

const measure = (slack) =>
  Array.from(document.querySelectorAll("svg[viewBox]")).flatMap((svg) => {
    const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) return [];
    const [vx, vy, vw, vh] = vb;
    const out = [];
    let clippedSkipped = 0;
    // getBBox() is in the element's OWN coordinate system and ignores ancestor
    // transforms, so a <g transform="translate(...)"> marker reads as wildly
    // out of bounds when it is not. Map the box through the element's matrix
    // relative to the svg before comparing.
    const root = svg.getScreenCTM();
    for (const el of svg.querySelectorAll("circle, rect, polygon, polyline, line, path, ellipse")) {
      // An element under a clipPath cannot paint outside it, so a geometric
      // overflow there is not something a reader can see. Content silently
      // REMOVED by a clip is a real defect — a solution dot clipped away while
      // the label still counts it — but that is a claim-vs-drawn question, not
      // a bounds one, and flagging clipped elements here only buries the ones
      // that do spill.
      let clipped = false;
      for (let n = el; n && n !== svg; n = n.parentElement) {
        if (n.getAttribute && (n.getAttribute("clip-path") || n.getAttribute("clipPath"))) { clipped = true; break; }
      }
      if (clipped) { clippedSkipped += 1; continue; }
      let b;
      try { b = el.getBBox(); } catch { continue; }
      if (!b || (b.width === 0 && b.height === 0)) continue;
      let corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
      const own = el.getScreenCTM && el.getScreenCTM();
      if (root && own) {
        const m = root.inverse().multiply(own);
        corners = corners.map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
      }
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const over = Math.max(vx - Math.min(...xs), vy - Math.min(...ys), Math.max(...xs) - (vx + vw), Math.max(...ys) - (vy + vh));
      if (over > slack) {
        out.push({
          label: svg.getAttribute("aria-label") ?? "(unnamed figure)",
          tag: el.tagName,
          overflowPx: Math.round(over),
          box: `${Math.round(Math.min(...xs))},${Math.round(Math.min(...ys))}`,
          viewBox: `${vx} ${vy} ${vw} ${vh}`,
        });
      }
    }
    if (clippedSkipped) out.clippedSkipped = clippedSkipped;
    return out;
  });

const token = await createSessionToken(USER_ID);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  // Presentation motion is not the subject of this gate and can keep a valid
  // endpoint button geometrically unstable while its figure is re-laying out.
  // Runtime usability is verified separately with motion enabled.
  reducedMotion: "reduce",
  storageState: { cookies: [{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] },
});
const page = await ctx.newPage();

/**
 * A rejected session cookie does not error — it redirects to /login, which
 * renders 9 of its own icon <svg viewBox>. This gate then measured the login
 * page 76 times and printed "76 with a figure inspected ✓". Loading *a* page is
 * not loading *the* page, and that distinction has to be asserted, not assumed.
 *
 * Checked per navigation rather than once at startup so it also catches a
 * session that expires mid-run.
 */
async function assertOnTheLesson(landed, slug, browser) {
  const expectedPath = `/student/lessons/${slug}`;
  let landedPath = "";
  try { landedPath = new URL(landed).pathname; } catch {}
  if (landedPath === expectedPath) return;
  console.error(`\n✗ ${slug} — landed on ${landed}`);
  console.error("  That is not the lesson. The session cookie was rejected, so this run would");
  console.error("  audit a logged-out page and report it clean.");
  if (!process.env.AUTH_SESSION_SECRET) {
    console.error("  AUTH_SESSION_SECRET is unset — it must match the dev server's (.claude/launch.json).");
  }
  await browser.close();
  process.exit(2);
}

const findings = [];
const traversalFindings = [];
let inspected = 0;
let withLessonFigure = 0;
let directionalButtonsDriven = 0;
let directionalButtonPresses = 0;
let rangeBoundsDriven = 0;
let numberBoundsDriven = 0;
let expectedLessonRoots = 0;
let mountedLessonRoots = 0;
const list = await slugs();

function coarseStepPriority(name) {
  if (/by 100|plus 100|minus 100/i.test(name)) return 4;
  if (/by (?:ten|10)|by one tenth|ten hundredths|ten thousandths/i.test(name)) return 3;
  if (/by (?:five|5)/i.test(name)) return 2;
  return 1;
}

async function driveDirectionalButtons(slug, direction) {
  // Repeat the sweep because one bounded control can change another control's
  // dynamic bound. A stable extreme is reached only when a full sweep produces
  // no presses. Coarse-step buttons go first; unit buttons land on the exact
  // endpoint afterward.
  for (let sweep = 0; sweep < 3; sweep += 1) {
    const buttons = await page.getByRole("button", { name: DIRECTION_CONTROLS[direction] }).all();
    const ranked = [];
    for (const button of buttons) {
      const name = (await button.getAttribute("aria-label").catch(() => ""))
        || (await button.textContent().catch(() => ""))
        || "(unnamed directional control)";
      ranked.push({ button, name, priority: coarseStepPriority(name) });
    }
    ranked.sort((a, b) => b.priority - a.priority);

    let sweepPresses = 0;
    for (const { button, name } of ranked) {
      let presses = 0;
      let clickBlocked = "";
      while (presses < MAX_CONTROL_PRESSES && await button.isEnabled().catch(() => false)) {
        const clicked = await button.click({ timeout: 4000 }).then(() => true).catch((error) => {
          clickBlocked = error.message.replace(/\s*\n\s*/g, " | ").slice(0, 700);
          return false;
        });
        if (!clicked) break;
        presses += 1;
        sweepPresses += 1;
      }
      if (presses > 0) directionalButtonsDriven += 1;
      directionalButtonPresses += presses;
      if (presses >= MAX_CONTROL_PRESSES && await button.isEnabled().catch(() => false)) {
        traversalFindings.push({
          slug,
          detail: `${direction} control "${name}" remained enabled after ${MAX_CONTROL_PRESSES} presses`,
        });
      } else if (clickBlocked && await button.isEnabled().catch(() => false)) {
        traversalFindings.push({
          slug,
          detail: `${direction} control "${name}" remained enabled after a click could not be completed: ${clickBlocked}`,
        });
      }
    }
    if (sweepPresses === 0) break;
  }
}

async function driveInputBounds(direction) {
  const ranges = page.locator('input[type="range"]');
  for (let index = 0, count = await ranges.count(); index < count; index += 1) {
    const input = ranges.nth(index);
    const bound = await input.getAttribute(direction);
    if (bound == null) continue;
    if (await input.fill(bound).then(() => true).catch(() => false)) rangeBoundsDriven += 1;
  }

  const numbers = page.locator('input[type="number"]');
  for (let index = 0, count = await numbers.count(); index < count; index += 1) {
    const input = numbers.nth(index);
    const bound = await input.getAttribute(direction);
    if (bound == null) continue;
    if (await input.fill(bound).then(() => true).catch(() => false)) {
      await input.blur().catch(() => {});
      numberBoundsDriven += 1;
    }
  }
}

for (const slug of list) {
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt += 1) {
    try {
      await page.goto(`${BASE}/student/lessons/${slug}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      ok = true;
    } catch (error) {
      const message = error.message.split("\n")[0];
      if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(message) || attempt === 1) {
        console.error(`\n✗ ${slug} — ${message}`);
        console.error("  Aborting rather than reporting a pass over a page never loaded.");
        await browser.close();
        process.exit(2);
      }
    }
  }
  await assertOnTheLesson(page.url(), slug, browser);
  // A first SVG is not a route-complete signal: every California route mounts
  // several independently loaded CCSS lesson bodies. Require the exact assigned
  // sequence, in render order, before enumerating any controls.
  const expected = ccssLessonSequenceForTopic(slug);
  try {
    await page.waitForFunction((expected) => {
      const mounted = Array.from(document.querySelectorAll("[data-ccss-lesson]"))
        .map((element) => element.getAttribute("data-ccss-lesson"));
      return mounted.length === expected.length
        && mounted.every((value, index) => value === expected[index]);
    }, expected, { timeout: 15000 });
  } catch {
    const mounted = await page.locator("[data-ccss-lesson]").evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-ccss-lesson"))
    );
    console.error(`\n✗ ${slug} — assigned CCSS lesson sequence did not finish mounting`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  mounted:  ${JSON.stringify(mounted)}`);
    await browser.close();
    process.exit(2);
  }
  expectedLessonRoots += expected.length;
  mountedLessonRoots += await page.locator("[data-ccss-lesson]").count();
  // The lesson figures mount on hydration, after `domcontentloaded`. A fixed
  // 400ms wait was not reliably long enough — and every page carries ~24 decorative
  // icon <svg viewBox> that ARE present immediately, so the old
  // `svg[viewBox]` count reported "76 with a figure inspected" whether or not a
  // single lesson figure had rendered. Wait for the real figure, and count it
  // separately so coverage is stated rather than implied.
  await page
    .waitForSelector('svg[role="img"], svg[role="group"]', { timeout: 8000 })
    .catch(() => {});
  // Match the proven runtime gate's post-navigation settling interval. Several
  // lesson sections enter with layout motion after their SVG first mounts; an
  // immediate endpoint sweep can therefore time out on a mathematically valid
  // button because Playwright correctly reports that the target is not stable.
  await page.waitForTimeout(3000);
  if (!(await page.locator("svg[viewBox]").count())) continue;
  inspected += 1;
  if (await page.locator('svg[role="img"], svg[role="group"]').count()) withLessonFigure += 1;

  for (const direction of ["max", "min"]) {
    await driveDirectionalButtons(slug, direction);
    await driveInputBounds(direction);
    await page.waitForTimeout(300);
    for (const f of await page.evaluate(measure, SLACK)) findings.push({ slug, ...f });
  }
}

await browser.close();

console.log(`audit-us-ca-lesson-figure-bounds: ${list.length} pages requested, ${inspected} inspected, ${withLessonFigure} of them carrying a real lesson figure (the rest only decorative icons)`);
console.log(`  assigned lesson roots: ${mountedLessonRoots}/${expectedLessonRoots} mounted in exact render order`);
console.log(`  bound traversal: ${directionalButtonsDriven} directional controls, ${directionalButtonPresses} presses, ${rangeBoundsDriven} range endpoints, ${numberBoundsDriven} number-input endpoints`);
if (inspected === 0) {
  console.error("✗ nothing was inspected — refusing to report a pass.");
  process.exit(2);
}
// Decorative icons are always in bounds, so a run that saw only icons proves
// nothing about the figures this gate exists to check.
if (withLessonFigure === 0) {
  console.error("✗ no lesson figure rendered on any page — only decorative icons were measured, so this is not a pass.");
  process.exit(2);
}
if (traversalFindings.length) {
  console.error(`\n✗ ${traversalFindings.length} control(s) did not converge to a disabled bound:`);
  for (const finding of traversalFindings) console.error(`  ${finding.slug} — ${finding.detail}`);
  process.exit(2);
}
if (!findings.length) {
  console.log("✓ every drawn element stayed inside its own viewBox at both control extremes");
  process.exit(0);
}
const seen = new Set();
const unique = findings.filter((f) => {
  const k = `${f.slug}|${f.label}|${f.tag}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
console.log(`\nelements drawn outside their own viewBox: ${unique.length}\n`);
for (const f of unique) console.log(`  ${f.slug}\n      <${f.tag}> in "${f.label.slice(0, 70)}" — ${f.overflowPx}px outside viewBox ${f.viewBox}`);
process.exit(1);
