#!/usr/bin/env node
/**
 * Does any label in a figure land on top of another label in a reachable state?
 *
 * `audit-us-ca-lesson-figure-bounds.mjs` asks whether a drawn element leaves
 * its viewBox. This asks the neighbouring question the eye notices first: two
 * labels that are each inside the picture, and on top of each other. Both are
 * the same failure — a coordinate computed from control state with nothing
 * tying it to what else is already drawn there — and neither is visible in
 * source, because whether "r = 0.5 units = 1 m" reaches the height label
 * depends on how wide that string renders at 11px.
 *
 * Coverage is the REACHABLE grid, not a sample and not the extremes. Several
 * of these lessons clamp one control against another (g7-ch05 tops "yes
 * answers" out at the current sample size), so an axis's bounds are re-derived
 * at every prefix instead of measured once; the walk therefore visits exactly
 * the states a student can reach, including the ragged corners a Cartesian
 * product would miss.
 *
 * The walk runs inside the page, so one state costs one React commit rather
 * than one CDP round trip — which is what makes 190k states affordable.
 *
 * Usage — AUTH_SESSION_SECRET must match the dev server's (.claude/launch.json);
 * without it the server rejects the cookie, redirects to /login, and this gate
 * would audit a logged-out page:
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3188 \
 *     npx tsx scripts/audit-us-ca-lesson-text-collision.mjs [slug...]
 *
 * PW_EXECUTABLE=<chrome binary> works around a host whose ms-playwright cache
 * does not carry this repo's pinned browser revision.
 *
 * CLEARANCE=2 additionally fails labels that come within 2px of each other
 * without technically overlapping.
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3188";
const USER_ID = process.env.QA_USER_ID ?? "student-peter";
/** Overlap threshold in CSS pixels. Negative values demand clearance instead. */
const TOL = -Number(process.env.CLEARANCE ?? 0);
/** Infinite-loop guard only; a control still enabled at the cap is a failure. */
const MAX_PRESSES = Number(process.env.MAX_PRESSES ?? 2000);
/** Per-lesson wall clock. A capped lesson is reported, never counted as clean. */
const MAX_MS = Number(process.env.MAX_MS ?? 600000);

const ROUTES = [
  "/student/lessons/california-middle-school-textbook",
  "/lesson/california-high-school-textbook/review",
];

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));

/**
 * Walk one opener's reachable control grid, measuring every visible <text> in
 * every <svg> after each state. Serialized into the page, so it may not close
 * over anything in this module.
 */
const DRIVE = async ({ slug, tol, maxPresses, maxMs }) => {
  const root_ = document.querySelector(`[data-lesson-role="opener"] [data-ccss-lesson="${slug}"]`);
  if (!root_) return { slug, error: "opener not found" };
  const settle = () => Promise.resolve(); // React flushes discrete events synchronously
  const buttons = () => [...root_.querySelectorAll('button[type="button"]')];
  const aria = (b) => (b.getAttribute("aria-label") || "").trim();
  const tail = (b) => aria(b).replace(/^(increase|decrease)\s*/i, "").trim().toLowerCase();

  // A lesson mounts and unmounts buttons as its own state changes, which shifts
  // every later index, so controls are addressed by a stable key.
  const idOf = (b) => `${aria(b)}|${(b.textContent || "").replace(/\s+/g, " ").trim()}`;
  const refTo = (b) => ({ key: idOf(b), nth: buttons().filter((o) => idOf(o) === idOf(b)).indexOf(b), el: b });
  const get = (ref) => {
    if (ref.el && ref.el.isConnected) return ref.el;
    const same = buttons().filter((b) => idOf(b) === ref.key);
    ref.el = same[ref.nth] ?? same[0] ?? null;
    return ref.el;
  };

  const bs = buttons();
  const axes = [];
  for (const up of bs.filter((b) => /^increase/i.test(aria(b)))) {
    const down = bs.find((b) => /^decrease/i.test(aria(b)) && tail(b) === tail(up));
    if (down) axes.push({ kind: "stepper", name: tail(up), up: refTo(up), down: refTo(down) });
  }
  const inStepper = new Set(axes.flatMap((a) => [a.up.el, a.down.el]));
  const groups = new Map();
  for (const b of bs) {
    if (!b.hasAttribute("aria-pressed") || inStepper.has(b)) continue;
    if (!groups.has(b.parentElement)) groups.set(b.parentElement, []);
    groups.get(b.parentElement).push(refTo(b));
  }
  let gi = 0;
  const choices = [];
  for (const [, members] of groups) if (members.length >= 2) choices.push({ kind: "choice", name: `choice${gi++}`, members });
  // Choice groups are walked OUTSIDE the steppers. Some lessons let a button
  // write the same state a stepper owns — g9-ch02's sequence terms set the day —
  // and with the buttons on the inside, pressing one moved an axis the walk
  // believed it was holding still: the position it recorded was fiction and the
  // walk ran for millions of states without reaching the stepper's bound.
  // Outermost, a button press is always followed by a full re-walk of the
  // steppers from their own low bound, so every recorded position is real.
  axes.unshift(...choices);

  const seen = new Map();
  const lost = new Set();
  const stuck = new Set();
  const stateText = () => axes.map((a) => `${a.name}=${a.at}`).join(", ");
  let visited = 0, presses = 0, capped = false;
  const t0 = performance.now();

  const measure = () => {
    [...root_.querySelectorAll("svg")].forEach((svg, si) => {
      const items = [];
      for (const t of svg.querySelectorAll("text")) {
        const st = getComputedStyle(t);
        if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) continue;
        const r = t.getBoundingClientRect();
        const s = (t.textContent || "").replace(/\s+/g, " ").trim();
        if (!s || r.width <= 0 || r.height <= 0) continue;
        items.push({ s, l: r.left, t: r.top, r: r.right, b: r.bottom });
      }
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const A = items[i], B = items[j];
          const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l);
          const oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
          if (ox > tol && oy > tol) {
            const key = `${si}|${A.s}|${B.s}`;
            if (!seen.has(key)) seen.set(key, { svg: si, a: A.s, b: B.s, ox: +ox.toFixed(1), oy: +oy.toFixed(1), state: stateText() });
          }
        }
      }
    });
  };

  const walk = async (k) => {
    if (capped) return;
    if (k === axes.length) {
      measure();
      visited += 1;
      if (performance.now() - t0 > maxMs) capped = true;
      return;
    }
    const a = axes[k];
    if (a.kind === "choice") {
      for (let m = 0; m < a.members.length; m += 1) {
        const el = get(a.members[m]);
        if (!el) { lost.add(`${a.name}[${m}]`); continue; }
        el.click(); presses += 1; await settle();
        a.at = m;
        await walk(k + 1);
        if (capped) return;
      }
      return;
    }
    const down = () => get(a.down), up = () => get(a.up);
    if (!down() || !up()) { lost.add(a.name); return; }
    let g = 0;
    while (!down().disabled && g++ < maxPresses) { down().click(); presses += 1; await settle(); }
    if (g >= maxPresses) stuck.add(`${a.name} (never reached its low bound)`);
    a.at = 0;
    for (g = 0; g < maxPresses; g += 1) {
      await walk(k + 1);
      if (capped) return;
      if (!up() || up().disabled) break;
      up().click(); presses += 1; await settle();
      a.at += 1;
    }
    if (g >= maxPresses) stuck.add(`${a.name} (never reached its high bound)`);
  };

  await walk(0);
  return {
    slug,
    axes: axes.map(({ kind, name }) => ({ kind, name })),
    svgs: root_.querySelectorAll("svg").length,
    texts: root_.querySelectorAll("svg text").length,
    visited, presses, capped,
    lost: [...lost], stuck: [...stuck],
    ms: Math.round(performance.now() - t0),
    findings: [...seen.values()],
  };
};

const only = process.argv.slice(2);
const token = await createSessionToken({ userId: USER_ID, sessionRevision: 1 });
// A machine whose ms-playwright cache is newer than this repo's Playwright
// pin has the browser, just not at the revision path Playwright asks for.
// PW_EXECUTABLE points at the binary rather than making the gate unrunnable.
const browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  storageState: { cookies: [{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] },
});
const page = await ctx.newPage();

const abort = async (lines) => {
  for (const line of lines) console.error(line);
  await browser.close();
  process.exit(2);
};

let audited = 0, states = 0;
const failures = [];
const unsound = [];

for (const route of ROUTES) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 180000 });
  } catch (error) {
    const message = error.message.split("\n")[0];
    await abort([
      `\n✗ ${route} — ${message}`,
      /ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(message)
        ? "  The dev server is not reachable. Aborting rather than reporting a pass."
        : "  Navigation failed. Aborting rather than reporting a pass over a page never loaded.",
    ]);
  }
  // A rejected session cookie does not error, it redirects to /login — where
  // this gate would find zero openers and call that clean.
  let landed = "";
  try { landed = new URL(page.url()).pathname; } catch {}
  if (landed !== route) {
    await abort([
      `\n✗ ${route} — landed on ${page.url()}`,
      "  That is not the textbook. The session cookie was rejected.",
      process.env.AUTH_SESSION_SECRET ? "" : "  AUTH_SESSION_SECRET is unset — it must match the dev server's (.claude/launch.json).",
    ].filter(Boolean));
  }
  // The openers mount on hydration; waiting a fixed beat found zero of them.
  await page
    .waitForSelector('[data-lesson-role="opener"] [data-ccss-lesson][data-ccss-diagram-hydrated="true"]', { timeout: 180000 })
    .catch(() => {});
  const slugs = await page.$$eval('[data-lesson-role="opener"] [data-ccss-lesson]', (els) => els.map((e) => e.getAttribute("data-ccss-lesson")));
  if (slugs.length === 0) await abort([`\n✗ ${route} — no chapter openers found. Zero coverage is not a pass.`]);

  for (const slug of slugs) {
    if (only.length && !only.includes(slug)) continue;
    const r = await page.evaluate(DRIVE, { slug, tol: TOL, maxPresses: MAX_PRESSES, maxMs: MAX_MS });
    if (r.error) await abort([`\n✗ ${slug} — ${r.error}`]);
    audited += 1;
    states += r.visited;
    if (r.visited === 0) unsound.push(`${slug}: visited no states`);
    if (r.texts === 0) unsound.push(`${slug}: figure has no <text> to check`);
    if (r.capped) unsound.push(`${slug}: hit the ${MAX_MS}ms cap after ${r.visited} states — coverage is partial`);
    for (const s of r.stuck) unsound.push(`${slug}: ${s}`);
    for (const l of r.lost) unsound.push(`${slug}: control "${l}" vanished mid-walk`);
    const mark = r.findings.length ? "✗" : "✓";
    console.log(`${mark} ${slug.padEnd(52)} ${String(r.visited).padStart(6)} states ${String(r.ms).padStart(6)}ms`);
    for (const f of r.findings) {
      failures.push({ slug, ...f });
      console.log(`    "${f.a}"  overlaps  "${f.b}"  by ${f.ox}x${f.oy}px   @ ${f.state}`);
    }
  }
}

await browser.close();

if (audited === 0) {
  console.error("\n✗ audited no lessons. Zero coverage is not a pass.");
  process.exit(2);
}
console.log(`\n${audited} chapter openers, ${states} reachable states${TOL < 0 ? `, clearance ${-TOL}px` : ""}.`);
if (unsound.length) {
  console.error(`\n✗ ${unsound.length} coverage problem(s) — this run proves less than it looks like:`);
  for (const u of unsound) console.error(`  - ${u}`);
}
if (failures.length) console.error(`\n✗ ${failures.length} colliding label pair(s).`);
if (failures.length || unsound.length) process.exit(1);
console.log("clean — no figure label overlaps another in any reachable state.");
