#!/usr/bin/env node
/**
 * Runtime QA gate for the California math lesson page.
 *
 * The static gates (`audit-us-ca-lesson-content`, `audit-ccss-lesson-interaction`)
 * read source. They cannot see a readout whose control is a bespoke component,
 * or whose plural noun is separated from its value by markup — and that is
 * exactly where the remaining defects were. This gate renders each lesson,
 * drives every control to its minimum, and reads what a student would see.
 *
 * Checks:
 *   1. the page renders (no redirect to /login, an <h1> is present)
 *   2. no uncaught console/page errors
 *   3. no "1 <plural-noun>" anywhere in the rendered text
 *
 * Auth uses the repo's own e2e session-token mechanism; no credentials are
 * entered. Requires a dev server — pass its origin as BASE_URL.
 *
 * Usage:
 *   BASE_URL=http://localhost:3318 node scripts/audit-us-ca-lesson-page-runtime.mjs [slug...]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3318";
const SHOTS = process.env.SHOT_DIR ?? path.join(root, ".tmp/lesson-page-runtime");
const USER_ID = process.env.QA_USER_ID ?? "student-shirleen-us";
const VIEWPORT = {
  width: Number(process.env.VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.VIEWPORT_HEIGHT ?? 900),
};
const MAX_CONTROL_PRESSES = Number(process.env.MAX_CONTROL_PRESSES ?? 1200);
const DIRECTION_CONTROLS = {
  max: /^(Increase|One more|More |Add one)| plus 100$/i,
  min: /^(Decrease|One fewer|Fewer |Remove one)| minus 100$/i,
};

const NOUNS = [
  "cubes", "counters", "squares", "units", "sides", "corners", "parts", "pieces",
  "rows", "columns", "shares", "tens", "ones", "hundreds", "groups", "objects",
  "items", "apples", "spoons", "cups", "batches", "steps", "jumps", "minutes",
  "hours", "degrees", "points", "packs", "pens", "triangles", "circles",
  "rectangles", "blocks", "tiles", "dots", "bars", "students", "vans", "seats",
  "coins", "cents", "miles", "copies", "layers", "faces", "edges", "terms",
  "factors", "multiples", "solutions", "roots", "trials", "cookies", "rods"
];
const ONE_PLURAL = new RegExp(String.raw`(?<![\d.])\b1 (${NOUNS.join("|")})\b`, "g");
// Plural verbs governed by a singular count — "1 apple cost $1", "there are 1 layer".
const ONE_VERB = /(?<![\d.])\b1 [a-z]+ (?:cost|are|were|have|do|make|give|fit|weigh)\b|\bthere are 1\b/g;
// A ratio of a quantity to itself where both sides are zero is not a ratio.
const ZERO_RATIO = /\b0\s*:\s*0\b/g;
// A computed readout that fell over. Only NaN and Infinity are unambiguous:
// "undefined" is correct mathematical prose here ("division by 0 is undefined",
// "a vertical line's slope is undefined", "the undefined notions of point and
// line"), and "-0" matches inside words like "day-0". Both were 100% false
// positives on this corpus, so they are not worth the noise.
const NOT_A_NUMBER = /\bNaN\b|\bInfinity\b/g;

const { createSessionToken, SESSION_COOKIE_NAME } = await import(
  path.join(root, "lib/session.ts")
).catch(async () => import(path.join(root, "lib/session.js")));

async function lessonSlugs() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const { usCaliforniaLessonSeeds } = await import(path.join(root, "data/usCaliforniaLessons.ts"));
  return usCaliforniaLessonSeeds.map((seed) => seed.topicId);
}

const slugs = await lessonSlugs();
mkdirSync(SHOTS, { recursive: true });

const token = await createSessionToken(USER_ID);
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: VIEWPORT });
await context.addCookies([
  { name: SESSION_COOKIE_NAME, value: token, url: BASE, httpOnly: true, sameSite: "Lax" }
]);

const findings = [];
const retried = [];
const infraNoise = [];
let directionalButtonRuns = 0;
let directionalButtonPresses = 0;
let rangeBoundsDriven = 0;
let numberBoundsDriven = 0;
const page = await context.newPage();
let pageIssues = [];
page.on("console", (m) => {
  if (m.type() === "error") {
    const text = m.text();
    // A dead or restarting dev server produces resource-load failures that have
    // nothing to do with content. Counting them as content defects is how a
    // sweep reported "5 runtime content defects" for a server that had died
    // mid-run. Infrastructure noise is tallied separately and reported, so a
    // degraded run is visible without being mistaken for a finding.
    if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_ABORTED|Failed to load resource/i.test(text)) {
      infraNoise.push(text.slice(0, 120));
    } else {
      pageIssues.push(text);
    }
  }
});
page.on("pageerror", (e) => pageIssues.push(`pageerror: ${e.message}`));

for (const slug of slugs) {
  pageIssues = [];
  const url = `${BASE}/student/lessons/${slug}`;
  // A cold Next route compiles once and can exceed the timeout on first visit;
  // that is not a content defect and not a dead server. Retry a timeout once,
  // fail immediately on a refused connection, and report anything that fails
  // twice. The sibling label-motion gate got this and this one did not.
  let navigated = false;
  let navError = "";
  for (let attempt = 0; attempt < 2 && !navigated; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      navigated = true;
    } catch (error) {
      navError = error.message.split("\n")[0].slice(0, 120);
      if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(navError)) break;
      if (attempt === 0) retried.push(slug);
    }
  }
  if (!navigated) {
    findings.push({ rule: "render", slug, detail: `navigation failed twice: ${navError}` });
    continue;
  }
  await page.waitForTimeout(3000);

  const expectedPath = `/student/lessons/${slug}`;
  const landedPath = new URL(page.url()).pathname;
  if (landedPath !== expectedPath) {
    findings.push({ rule: "render", slug, detail: `landed on ${landedPath}, not ${expectedPath} — session or routing rejected the request` });
    continue;
  }
  const heading = (await page.locator("h1").first().textContent().catch(() => ""))?.trim();
  if (!heading) findings.push({ rule: "render", slug, detail: "no <h1> rendered" });

  // Drive the controls to each extreme in turn. A readout can be correct at the
  // seed value and wrong at either end — the minimum is where singular/plural
  // and degenerate values break, the maximum is where formatting and overflow do.
  const coarseStepPriority = (name) => {
    if (/by 100|plus 100|minus 100/i.test(name)) return 4;
    if (/by (?:ten|10)|by one tenth|ten hundredths|ten thousandths/i.test(name)) return 3;
    if (/by (?:five|5)/i.test(name)) return 2;
    return 1;
  };

  async function driveControls(direction) {
    // A 14-click sample is not an extreme for live controls spanning 100, 999,
    // or 9,999. Drive coarse steps first and unit steps second until the button
    // itself is disabled. Repeat to settle dynamic bounds changed by another
    // control. If an apparent bound control never disables, fail the gate.
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
        let clickBlocked = false;
        while (presses < MAX_CONTROL_PRESSES && await button.isEnabled().catch(() => false)) {
          const clicked = await button.click({ timeout: 4000 }).then(() => true).catch(() => false);
          if (!clicked) { clickBlocked = true; break; }
          presses += 1;
          sweepPresses += 1;
        }
        if (presses > 0) directionalButtonRuns += 1;
        directionalButtonPresses += presses;
        if (presses >= MAX_CONTROL_PRESSES && await button.isEnabled().catch(() => false)) {
          findings.push({
            rule: "control-traversal",
            slug,
            detail: `[toward ${direction}] "${name}" remained enabled after ${MAX_CONTROL_PRESSES} presses`,
          });
        } else if (clickBlocked && await button.isEnabled().catch(() => false)) {
          findings.push({
            rule: "control-traversal",
            slug,
            detail: `[toward ${direction}] "${name}" remained enabled after a click could not be completed`,
          });
        }
      }
      if (sweepPresses === 0) break;
    }

    const ranges = page.locator('input[type="range"]');
    for (let i = 0, n = await ranges.count(); i < n; i += 1) {
      const bound = await ranges.nth(i).getAttribute(direction);
      if (bound == null) continue;
      if (await ranges.nth(i).fill(bound).then(() => true).catch(() => false)) rangeBoundsDriven += 1;
    }
    const numbers = page.locator('input[type="number"]');
    for (let i = 0, n = await numbers.count(); i < n; i += 1) {
      const bound = await numbers.nth(i).getAttribute(direction);
      if (bound == null) continue;
      if (await numbers.nth(i).fill(bound).then(() => true).catch(() => false)) {
        await numbers.nth(i).blur().catch(() => {});
        numberBoundsDriven += 1;
      }
    }
    await page.waitForTimeout(900);
  }

  const scan = (text, re, rule, extreme) => {
    for (const match of text.matchAll(re)) {
      const start = Math.max(0, match.index - 60);
      findings.push({
        rule,
        slug,
        detail: `[at ${extreme}] "${match[0]}" — …${text.slice(start, match.index + 40).replace(/\s+/g, " ")}…`
      });
    }
  };

  for (const extreme of ["min", "max"]) {
    await driveControls(extreme);
    const text = await page.locator("body").innerText().catch(() => "");
    scan(text, ONE_PLURAL, "plural-agreement", extreme);
    scan(text, ONE_VERB, "subject-verb-agreement", extreme);
    scan(text, ZERO_RATIO, "degenerate-value", extreme);
    scan(text, NOT_A_NUMBER, "non-finite-readout", extreme);
    const pageWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (pageWidth.scroll > pageWidth.client + 2) {
      findings.push({
        rule: "horizontal-overflow",
        slug,
        detail: `[at ${extreme}] ${pageWidth.scroll}px content in ${pageWidth.client}px viewport`,
      });
    }
    if (process.env.SHOTS === "1") {
      await page.screenshot({ path: path.join(SHOTS, `${slug}-${extreme}.png`), fullPage: true });
    }
  }

  for (const issue of pageIssues) {
    findings.push({ rule: "console-error", slug, detail: issue.slice(0, 160) });
  }
}

await browser.close();

console.log(`audit-us-ca-lesson-page-runtime: ${slugs.length} lesson pages driven to both control extremes at ${VIEWPORT.width}×${VIEWPORT.height}`);
console.log(`  bound traversal: ${directionalButtonRuns} nonempty directional-control traversals, ${directionalButtonPresses} presses, ${rangeBoundsDriven} range endpoints, ${numberBoundsDriven} number-input endpoints`);
if (infraNoise.length) {
  console.log(`  resource-load failures ignored as infrastructure noise: ${infraNoise.length}`);
  console.log("  (a dead dev server, not lesson content — re-run against a healthy server to trust this result)");
}
if (retried.length) console.log(`  loaded on a retry after a first-visit compile timeout: ${retried.length}`);
if (!findings.length) {
  console.log("✓ no runtime content defects");
  process.exit(0);
}
const byRule = new Map();
for (const finding of findings) byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
for (const [rule, list] of [...byRule].sort()) {
  console.log(`\n${rule}: ${list.length}`);
  for (const finding of list.slice(0, 25)) console.log(`  ${finding.slug} — ${finding.detail}`);
  if (list.length > 25) console.log(`  ... ${list.length - 25} more`);
}
console.log(`\n✗ ${findings.length} runtime content defect(s)`);
process.exit(1);
