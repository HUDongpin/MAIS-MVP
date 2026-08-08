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
 * Usage:
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3318 node scripts/audit-us-ca-lesson-figure-bounds.mjs [slug...]
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

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));

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
    // getBBox() is in the element's OWN coordinate system and ignores ancestor
    // transforms, so a <g transform="translate(...)"> marker reads as wildly
    // out of bounds when it is not. Map the box through the element's matrix
    // relative to the svg before comparing.
    const root = svg.getScreenCTM();
    for (const el of svg.querySelectorAll("circle, rect, polygon, polyline, line, path, ellipse")) {
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
    return out;
  });

const token = await createSessionToken(USER_ID);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  storageState: { cookies: [{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] },
});
const page = await ctx.newPage();

const findings = [];
let inspected = 0;
const list = await slugs();

for (const slug of list) {
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt += 1) {
    try {
      await page.goto(`${BASE}/student/lessons/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
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
  await page.waitForTimeout(400);
  if (!(await page.locator("svg[viewBox]").count())) continue;
  inspected += 1;

  for (const dir of [/^(Increase|One more|More )/i, /^(Decrease|One fewer|Fewer )/i]) {
    const buttons = await page.getByRole("button", { name: dir }).all();
    for (const b of buttons.slice(0, 10)) {
      for (let n = 0; n < 12; n += 1) {
        if (!(await b.isEnabled().catch(() => false))) break;
        await b.click({ timeout: 1200 }).catch(() => {});
      }
    }
    await page.waitForTimeout(300);
    for (const f of await page.evaluate(measure, SLACK)) findings.push({ slug, ...f });
  }
}

await browser.close();

console.log(`audit-us-ca-lesson-figure-bounds: ${list.length} pages requested, ${inspected} with a figure inspected`);
if (inspected === 0) {
  console.error("✗ nothing was inspected — refusing to report a pass.");
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
