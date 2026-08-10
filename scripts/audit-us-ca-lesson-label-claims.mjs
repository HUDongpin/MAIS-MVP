#!/usr/bin/env node
/**
 * Is a figure's accessible name TRUE in every state it can be read in?
 *
 * Round 8 asked whether a label CHANGES when the figure changes
 * (`audit:us-ca-lesson-label-motion`). It never asked whether the changed label
 * is correct. Rounds 9 and 10 found wrong geometry computed from control state —
 * a marker drawn at ±10 on a ±5 grid, a polygon protruding past the cube it
 * cuts. The accessible name is that same computation surfaced as text, and it is
 * the ONLY description a screen-reader user gets.
 *
 * This drives every control to both extremes, collects every distinct accessible
 * name along the way, and checks two things:
 *
 *   1. Claims that can be RECOMPUTED from the name itself — a name that states a
 *      rectangle's sides AND its perimeter is asserting arithmetic.
 *   2. Template artifacts that should never reach a screen reader: "undefined",
 *      "NaN", "[object Object]", an unreplaced ${...}, a leftover LaTeX macro.
 *
 * What it deliberately does NOT do: flag a number in the name that is absent
 * from the figure's printed text. The first version of this gate did, and
 * produced 25 findings that were all correct content — "clock showing 3:30"
 * never prints 30, and "rectangle 6 by 3, perimeter 18" never prints 18. That
 * version also had a measurement bug: `textContent` concatenates adjacent <text>
 * nodes, so a number line reading "60 70 65 63" came back as "60706563". Absence
 * is not contradiction.
 *
 * It also reads the text each figure PRINTS, at every state its controls can
 * reach, and fails on values that cannot exist: NaN, Infinity, a division shown
 * over zero, a probability outside 0..1, an unrounded float, a percentage above
 * 100. Rounds 9 and 10 found this class of failure in the drawn geometry; this
 * is the same failure surfacing as a number.
 *
 * IF YOU TEST THIS GATE BY BREAKING A COMPONENT: confirm the dev server has
 * actually recompiled before trusting the result. Injecting `/ 0` into
 * perimeter.tsx and running immediately produced a clean pass — the gate was
 * reading the OLD bundle. The tell was that `recomputable claims` stayed at 13;
 * had the label really become "perimeter Infinity", the perimeter pattern would
 * have stopped matching and that count would have dropped. Read the page and see
 * the broken value with your own eyes first.
 *
 * Usage — AUTH_SESSION_SECRET must match the dev server's (.claude/launch.json):
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:3318 npx tsx scripts/audit-us-ca-lesson-label-claims.mjs [slug...]
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3318";
const USER_ID = process.env.QA_USER_ID ?? "student-shirleen-us";
const UP = /^(Increase|One more|More |Add one)| plus 100$/i;
const DOWN = /^(Decrease|One fewer|Fewer |Remove one)| minus 100$/i;
const MAX_SWEEPS = Number(process.env.MAX_SWEEPS ?? 12);

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));

async function slugs() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const { usCaliforniaLessonSeeds } = await import(path.join(root, "data/usCaliforniaLessons.ts"));
  return usCaliforniaLessonSeeds.map((s) => s.topicId);
}

/** Claims recomputable from the accessible name alone. */
const CLAIMS = [
  {
    name: "rectangle A by B, perimeter P => P = 2(A+B)",
    re: /rectangle\s+(\d+(?:\.\d+)?)\s*by\s*(\d+(?:\.\d+)?)[^.]*?perimeter\s+(\d+(?:\.\d+)?)/i,
    verify: (m) => {
      const [a, b, p] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return { ok: Math.abs(2 * (a + b) - p) < 1e-9, expected: String(2 * (a + b)) };
    },
  },
  {
    name: "rectangle A by B, area X => X = A*B",
    re: /rectangle\s+(\d+(?:\.\d+)?)\s*by\s*(\d+(?:\.\d+)?)[^.]*?area\s+(\d+(?:\.\d+)?)/i,
    verify: (m) => {
      const [a, b, x] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return { ok: Math.abs(a * b - x) < 1e-9, expected: String(a * b) };
    },
  },
  {
    name: "N between A and B => strictly inside",
    re: /(-?\d+(?:[,.]\d+)*)\s+between\s+(-?\d+(?:[,.]\d+)*)\s+and\s+(-?\d+(?:[,.]\d+)*)/i,
    verify: (m) => {
      const num = (s) => Number(s.replace(/,/g, ""));
      const [n, a, b] = [num(m[1]), num(m[2]), num(m[3])];
      return { ok: n > Math.min(a, b) && n < Math.max(a, b), expected: `strictly inside ${a}..${b}` };
    },
  },
  {
    name: "clock showing H:MM => hour 1-12, minutes < 60",
    re: /clock showing\s+(\d{1,2}):(\d{2})/i,
    verify: (m) => {
      const [h, mm] = [Number(m[1]), Number(m[2])];
      return { ok: h >= 1 && h <= 12 && mm < 60, expected: "hour 1-12, minutes < 60" };
    },
  },
  {
    name: "angle of D degrees => 0 < D <= 360",
    re: /angle of\s+(-?\d+(?:\.\d+)?)\s*degrees/i,
    verify: (m) => {
      const d = Number(m[1]);
      return { ok: d > 0 && d <= 360, expected: "0 < D <= 360" };
    },
  },
  {
    name: "X milliliters, which is Y liters => Y = X/1000",
    re: /(\d+(?:\.\d+)?)\s*milliliters?,?\s*which is\s*(\d+(?:\.\d+)?)\s*liters?/i,
    verify: (m) => {
      const [ml, l] = [Number(m[1]), Number(m[2])];
      return { ok: Math.abs(ml / 1000 - l) < 1e-9, expected: String(ml / 1000) };
    },
  },
];

/** Strings that must never reach a screen reader. */
const ARTIFACTS = [
  ["literal undefined / null / NaN", /\b(undefined|null|NaN|Infinity)\b/],
  ["[object Object]", /\[object [A-Za-z]+\]/],
  ["unreplaced template placeholder", /\$\{|\{\{|%[sd]\b/],
  ["leftover LaTeX macro", /\\[a-zA-Z]+/],
  ["empty or whitespace only", /^\s*$/],
  ["float noise (>3 decimals)", /\d\.\d{4,}/],
];

/**
 * Values a figure must never PRINT, at any state its controls can reach.
 *
 * Rounds 9 and 10 found bad geometry computed from control state. These are the
 * same class of failure surfacing as a number: a division that reached zero, a
 * probability that escaped 0..1, an unformatted float, a value that arrived as
 * NaN. Each is impossible content rather than a matter of taste.
 */
const IMPOSSIBLE = [
  ["NaN / Infinity / undefined printed", /\b(NaN|Infinity|-Infinity|undefined|null)\b/],
  ["[object Object] printed", /\[object [A-Za-z]+\]/],
  ["unreplaced template placeholder", /\$\{|\{\{/],
  ["division shown over zero", /(?:\/|÷)\s*0(?!\.\d*[1-9])(?![\d])/],
  ["negative zero", /(?<![\d.])-0(?![.\d])/],
  ["unrounded float (>4 decimals)", /\d\.\d{5,}/],
  ["probability outside 0..1", /\bP\([^)]*\)\s*=\s*(?:-\d|[2-9]\d*\.|1\.\d*[1-9])/],
  ["percentage above 100", /\b(?:1[0-9]{2,}|[2-9]\d{2,})(?:\.\d+)?%/],
];

const token = await createSessionToken(USER_ID);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  storageState: { cookies: [{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] },
});
const page = await ctx.newPage();

const seen = new Set();
const defects = [];
let pagesDriven = 0;
let presses = 0;
let claimsChecked = 0;

const list = await slugs();

function inspect(slug, label) {
  const key = `${slug}|${label}`;
  if (seen.has(key)) return;
  seen.add(key);
  for (const [name, re] of ARTIFACTS) {
    if (re.test(label)) defects.push(`  ${slug}\n      ${name}\n      name: ${JSON.stringify(label).slice(0, 110)}`);
  }
  for (const claim of CLAIMS) {
    const m = label.match(claim.re);
    if (!m) continue;
    claimsChecked += 1;
    const { ok, expected } = claim.verify(m);
    if (!ok) {
      defects.push(`  ${slug}\n      accessible name asserts arithmetic that does not hold\n      name    : ${label.slice(0, 100)}\n      rule    : ${claim.name}\n      expected: ${expected}`);
    }
  }
}

const printedSeen = new Set();
let printedStates = 0;

function inspectPrinted(slug, text) {
  const key = `${slug}|${text}`;
  if (printedSeen.has(key)) return;
  printedSeen.add(key);
  printedStates += 1;
  for (const [name, re] of IMPOSSIBLE) {
    if (re.test(text)) {
      defects.push(`  ${slug}\n      figure prints an impossible value — ${name}\n      text: ${text.slice(0, 120)}`);
    }
  }
}

const snapshot = async (slug) => {
  // Read the accessible name AND the figure's printed text. The text is joined
  // with a separator: `textContent` concatenates adjacent <text> nodes, so a
  // number line reading "60 70 65 63" comes back as the single token
  // "60706563" — which silently corrupts every numeric check downstream.
  const figures = await page.$$eval('svg[role="img"], svg[role="group"]', (nodes) =>
    nodes.map((n) => ({
      label: n.getAttribute("aria-label") ?? "",
      text: Array.from(n.querySelectorAll("text, tspan"))
        .map((t) => (t.textContent ?? "").trim())
        .filter(Boolean)
        .join(" | "),
    }))
  );
  for (const figure of figures) {
    if (figure.label) inspect(slug, figure.label);
    if (figure.text) inspectPrinted(slug, figure.text);
  }
};

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
  // A rejected cookie redirects to /login without erroring; that page has its own
  // icons and would produce a silent, meaningless pass (round 14).
  let landedPath = "";
  try { landedPath = new URL(page.url()).pathname; } catch {}
  if (landedPath !== `/student/lessons/${slug}`) {
    console.error(`\n✗ ${slug} — landed on ${page.url()}, which is not the lesson.`);
    if (!process.env.AUTH_SESSION_SECRET) {
      console.error("  AUTH_SESSION_SECRET is unset — it must match the dev server's (.claude/launch.json).");
    }
    await browser.close();
    process.exit(2);
  }

  await page.waitForSelector('svg[role="img"], svg[role="group"]', { timeout: 8000 }).catch(() => {});
  await snapshot(slug);

  let moved = false;
  for (const dir of [UP, DOWN]) {
    for (let sweep = 0; sweep < MAX_SWEEPS; sweep += 1) {
      const buttons = await page.getByRole("button", { name: dir }).all();
      let clicked = 0;
      for (const button of buttons) {
        if (!(await button.isEnabled().catch(() => false))) continue;
        if (await button.click({ timeout: 1200 }).then(() => true).catch(() => false)) {
          clicked += 1;
          presses += 1;
        }
      }
      if (!clicked) break;
      moved = true;
      await page.waitForTimeout(120);
      await snapshot(slug);
    }
  }
  if (moved) pagesDriven += 1;
}

await browser.close();

console.log(
  `audit-us-ca-lesson-label-claims: ${seen.size} accessible names and ${printedStates} printed figure states across ${list.length} pages ` +
    `(${pagesDriven} driven, ${presses} control presses, ${claimsChecked} recomputable claims)`
);

// Zero coverage is not a pass — per population, so one broken half cannot hide
// behind the other.
if (seen.size === 0) {
  console.error("✗ no accessible name was read — refusing to report a pass.");
  process.exit(2);
}
if (claimsChecked === 0) {
  console.error("✗ no recomputable claim was found — the label wording changed, so this gate proves nothing.");
  process.exit(2);
}
// Prove the checkers still fire on known-bad input.
const perimeter = CLAIMS[0];
if (perimeter.verify("rectangle 6 by 3, perimeter 20".match(perimeter.re)).ok) {
  console.error("✗ the perimeter check no longer fires on a known-bad name — refusing to report a pass.");
  process.exit(2);
}
if (!ARTIFACTS[0][1].test("counters showing undefined")) {
  console.error("✗ the artifact check no longer fires on a known-bad name — refusing to report a pass.");
  process.exit(2);
}
// The printed-value rules must each still fire, and must not fire on ordinary
// figure text. A silently dead rule is indistinguishable from clean content.
const PROBES = [
  ["NaN / Infinity / undefined printed", "total: NaN"],
  ["[object Object] printed", "value [object Object]"],
  ["unreplaced template placeholder", "count ${n} apples"],
  ["division shown over zero", "3 ÷ 0"],
  ["negative zero", "sum -0"],
  ["unrounded float (>4 decimals)", "area 3.1415926"],
  ["probability outside 0..1", "P(A) = 1.4"],
  ["percentage above 100", "score 140%"],
];
for (const [name, probe] of PROBES) {
  const rule = IMPOSSIBLE.find((r) => r[0] === name);
  if (!rule || !rule[1].test(probe)) {
    console.error(`✗ the "${name}" rule no longer fires on ${JSON.stringify(probe)} — refusing to report a pass.`);
    process.exit(2);
  }
}
for (const ordinary of ["8 | + | 3 | = | 11", "60 | 70 | 65 | 63", "P(A) = 0.35", "45%", "0.5 | 1.5 | 2"]) {
  for (const [name, re] of IMPOSSIBLE) {
    if (re.test(ordinary)) {
      console.error(`✗ the "${name}" rule fires on ordinary figure text ${JSON.stringify(ordinary)} — refusing to report a pass.`);
      process.exit(2);
    }
  }
}
if (printedStates === 0) {
  console.error("✗ no figure printed any text — the numeric checks inspected nothing.");
  process.exit(2);
}

if (defects.length) {
  console.error(`\n✗ ${defects.length} accessible-name defect(s)`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every accessible name holds its own arithmetic and carries no template artifact");
