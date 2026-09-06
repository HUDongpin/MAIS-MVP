#!/usr/bin/env node
/**
 * Browser gate for California lesson claims that must change with interaction
 * state. The broad runtime sweep catches rendering and numeric-format defects;
 * this gate exercises reveal/hide, compose/take-apart, regrouping, and other
 * semantic transitions whose text can be grammatical yet false.
 *
 * Start the app and this command with the same AUTH_SESSION_SECRET:
 *   AUTH_SESSION_SECRET=... BASE_URL=http://localhost:4327 \
 *     node scripts/audit-us-ca-lesson-semantic-states.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3318";
const userId = process.env.QA_USER_ID ?? "student-shirleen-us";
const viewport = {
  width: Number(process.env.VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.VIEWPORT_HEIGHT ?? 900)
};
assert.ok(Number.isFinite(viewport.width) && viewport.width >= 320, "VIEWPORT_WIDTH must be at least 320");
assert.ok(Number.isFinite(viewport.height) && viewport.height >= 480, "VIEWPORT_HEIGHT must be at least 480");

const { createSessionToken, SESSION_COOKIE_NAME } = await import(
  path.join(root, "lib/session.ts")
).catch(async () => import(path.join(root, "lib/session.js")));

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport });
await context.addCookies([
  {
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(userId),
    url: base,
    httpOnly: true,
    sameSite: "Lax"
  }
]);
const page = await context.newPage();
const checks = [];
const pageErrors = [];

page.on("pageerror", (error) => {
  pageErrors.push(error instanceof Error ? error.message : String(error));
});

/**
 * A Next.js lesson can expose its server-rendered buttons before React has
 * attached event handlers. Clicking that inert HTML makes a correct state
 * transition look broken, especially on the first cold route compile. React
 * stores its event props on the hydrated DOM node; waiting for that property
 * proves the control is interactive instead of merely visible.
 */
async function waitForReactHydration(lessonId) {
  await page.waitForFunction(
    (id) => {
      const core = document.querySelector(`[data-ccss-lesson="${id}"]`);
      const control = core?.querySelector("button, input, select, textarea");
      if (!(control instanceof HTMLElement)) return false;

      return Object.getOwnPropertyNames(control).some(
        (name) => name.startsWith("__reactProps$") || name.startsWith("__reactFiber$")
      );
    },
    lessonId,
    { timeout: 90_000 }
  );
}

async function openCore(slug, lessonId) {
  const expectedPath = `/student/lessons/${slug}`;
  await page.goto(`${base}${expectedPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  assert.equal(
    new URL(page.url()).pathname,
    expectedPath,
    `${slug}: session did not land on the requested lesson; run the server and gate with the same AUTH_SESSION_SECRET`
  );
  const core = page.locator(`[data-ccss-lesson="${lessonId}"]`);
  await core.waitFor({ state: "visible", timeout: 90_000 });
  assert.equal(await core.count(), 1, `${slug}: expected exactly one ${lessonId} core`);
  await waitForReactHydration(lessonId);
  const pageWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  assert.ok(
    pageWidth.scroll <= pageWidth.client + 2,
    `${slug}: lesson page overflows horizontally at ${viewport.width}px (${pageWidth.scroll}px content in ${pageWidth.client}px viewport)`
  );
  return core;
}

async function coreText(core) {
  return (await core.innerText()).replace(/\s+/g, " ").trim();
}

async function contains(core, expected, message) {
  assert.match(await coreText(core), expected instanceof RegExp ? expected : new RegExp(escapeRegex(expected)), message);
}

async function omits(core, forbidden, message) {
  assert.doesNotMatch(await coreText(core), forbidden instanceof RegExp ? forbidden : new RegExp(escapeRegex(forbidden)), message);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function mathCheckText(core) {
  const heading = core.getByRole("heading", { name: "Math check", exact: true });
  await heading.waitFor({ state: "visible" });
  return (await heading.locator("xpath=..").innerText()).replace(/\s+/g, " ").trim();
}

try {
  {
    const core = await openCore("us-ca-math-p2-2-nbt-three-digit-place-value", "mental-10-100");
    const plusTen = core.getByRole("button", { name: "+ 10", exact: true });
    for (let index = 0; index < 6; index += 1) await plusTen.click();
    await contains(core, "406", "mental-10-100: six +10 actions from 346 must reach 406");
    await contains(core, "Ten tens regrouped as one hundred, so the hundreds digit changed too.", "mental-10-100: rollover explanation must match the reachable state");
    await omits(core, /Adding 10 changes only the tens digit|The rest stays put|other digits stay exactly the same|only one digit changes/i, "mental-10-100: no absolute one-digit claim may survive regrouping");
    await core.getByRole("button", { name: "− 10", exact: true }).click();
    await contains(core, "One hundred was ungrouped as ten tens, so the hundreds digit changed too.", "mental-10-100: reverse transition must explain ungrouping");
    checks.push("mental regrouping");
  }

  {
    const core = await openCore("us-ca-math-p1-1-oa-add-subtract", "missing-addend");
    await contains(core, "3 + ? = 8", "missing-addend: hidden equation must be visible");
    await omits(core, /3 \+ 5 = 8|same answer:\s*5/i, "missing-addend: solution leaked before reveal");
    await core.getByRole("button", { name: "Show the missing part", exact: true }).click();
    await contains(core, "3 + 5 = 8", "missing-addend: reveal did not show the solution");
    await core.getByRole("button", { name: "Hide the answer", exact: true }).click();
    await omits(core, /3 \+ 5 = 8|same answer:\s*5/i, "missing-addend: hide did not remove the solution from the whole core");
    await core.getByRole("button", { name: "Show the missing part", exact: true }).click();
    await core.getByRole("button", { name: "Increase Whole", exact: true }).click();
    await omits(core, /3 \+ 6 = 9/i, "missing-addend: changing a value must restore the hidden state");
    checks.push("missing-addend reveal contract");
  }

  {
    const core = await openCore("us-ca-math-p2-2-md-measure-data-money-time", "estimate-compare-length");
    await omits(core, "7 − 4 = 3", "estimate-compare-length: measurements leaked before reveal");
    await core.getByRole("button", { name: "Reveal the measurements", exact: true }).click();
    await contains(core, "7 − 4 = 3", "estimate-compare-length: reveal did not show the comparison");
    await core.getByRole("button", { name: "Hide & estimate again", exact: true }).click();
    await omits(core, "7 − 4 = 3", "estimate-compare-length: hide did not remove the comparison from the whole core");
    await core.getByRole("button", { name: "Reveal the measurements", exact: true }).click();
    await core.getByRole("button", { name: "Increase Top bar", exact: true }).click();
    await omits(core, "8 − 4 = 4", "estimate-compare-length: changing a bar must restore the hidden state");
    checks.push("length-estimation reveal contract");
  }

  {
    const core = await openCore("us-ca-math-p5-5-oa-expressions-patterns", "write-expressions");
    const expressions = ["2 × (8 + 7)", "3 × (6 + 4)", "(20 − 5) ÷ 3", "2 × (9 + 1)"];
    for (let index = 0; index < expressions.length; index += 1) {
      await core.locator(`button[aria-label^="Example ${index + 1}:"]`).click();
      await omits(core, expressions[index], `write-expressions: example ${index + 1} leaked before reveal`);
      await core.getByRole("button", { name: "Reveal the expression", exact: true }).click();
      await contains(core, expressions[index], `write-expressions: example ${index + 1} did not reveal`);
      await core.getByRole("button", { name: "Hide", exact: true }).click();
      await omits(core, expressions[index], `write-expressions: example ${index + 1} remained after hide`);
    }
    checks.push("expression reveal contracts");
  }

  {
    const core = await openCore("us-ca-math-k-k-g-shapes-position", "compose-shapes");
    assert.match(await mathCheckText(core), /two triangles can be joined to form a square/i);
    await core.getByRole("button", { name: "Join them →", exact: true }).click();
    assert.match(await mathCheckText(core), /two triangles form a square/i);
    await core.getByRole("button", { name: "← Take apart", exact: true }).click();
    assert.match(await mathCheckText(core), /two triangles can be joined to form a square/i);
    await core.getByRole("button", { name: "2 squares → rectangle", exact: true }).click();
    assert.match(await mathCheckText(core), /two squares can be joined to form a rectangle/i);
    await core.getByRole("button", { name: "Join them →", exact: true }).click();
    assert.match(await mathCheckText(core), /two squares form a rectangle/i);
    checks.push("Kindergarten composition states");
  }

  {
    const core = await openCore("us-ca-math-p1-1-g-shape-reasoning", "compose-2d");
    assert.match(await mathCheckText(core), /a square and a triangle can be joined to form a house/i);
    await core.getByRole("button", { name: "Join them →", exact: true }).click();
    assert.match(await mathCheckText(core), /a square and a triangle form a house/i);
    await core.getByRole("button", { name: "← Take apart", exact: true }).click();
    assert.match(await mathCheckText(core), /a square and a triangle can be joined to form a house/i);
    await core.getByRole("button", { name: "2 trapezoids → hexagon", exact: true }).click();
    assert.match(await mathCheckText(core), /two trapezoids can be joined to form a hexagon/i);
    await core.getByRole("button", { name: "Join them →", exact: true }).click();
    assert.match(await mathCheckText(core), /two trapezoids form a hexagon/i);
    checks.push("Grade 1 composition states");
  }

  {
    const core = await openCore("us-ca-math-p6-chapter-02", "four-quadrant-plane");
    const decreaseX = core.getByRole("button", { name: "Decrease x", exact: true });
    for (let index = 0; index < 3; index += 1) await decreaseX.click();
    await contains(core, "is on the y-axis and in no quadrant", "four-quadrant-plane: y-axis state needs truthful visible wording");
    await omits(core, "Quadrant none", "four-quadrant-plane: internal sentinel leaked into visible copy");
    const decreaseY = core.getByRole("button", { name: "Decrease y", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseY.click();
    await contains(core, "(0, 0) is at the origin, on both axes and in no quadrant", "four-quadrant-plane: origin state needs truthful visible wording");
    await core.getByRole("button", { name: "Increase x", exact: true }).click();
    await contains(core, "(1, 0) is on the x-axis and in no quadrant", "four-quadrant-plane: x-axis state needs truthful visible wording");
    await decreaseX.click();
    await core.getByRole("button", { name: "Increase y", exact: true }).click();
    await contains(core, "(0, 1) is on the y-axis and in no quadrant", "four-quadrant-plane: y-axis state should survive an origin transition");
    checks.push("origin and axis-point language");
  }

  {
    const core = await openCore("us-ca-math-s2-chapter-02", "slope-explorer");
    await contains(
      core,
      /slope = rise 4 ÷ run 6 = 2\/3 ≈ 0\.67/,
      "slope-explorer: a repeating decimal needs an approximation relation"
    );
    const increasePointTwoY = core.getByRole("button", { name: "Increase Point 2 y", exact: true });
    await increasePointTwoY.click();
    await increasePointTwoY.click();
    await contains(
      core,
      /slope = rise 6 ÷ run 6 = 1 = 1\.00/,
      "slope-explorer: an exactly represented decimal needs an equality relation"
    );
    await omits(core, /1 ≈ 1\.00/, "slope-explorer: exact slope must not be labelled approximate");
    checks.push("slope exact-versus-rounded relation");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-04", "correlation");
    await contains(core, /r ≈ 0\.97/, "correlation: default coefficient must be computed from the plotted strong-positive points");
    await core.getByRole("img", { name: /r is approximately 0\.97/ }).waitFor({ state: "visible" });
    await core.getByRole("button", { name: "none", exact: true }).click();
    await contains(core, /r = 0/, "correlation: an exact zero coefficient needs equality");
    await omits(core, /r ≈ 0|r approximately 0/i, "correlation: exact zero must not be labelled approximate");
    await core.getByRole("img", { name: /r equals 0/ }).waitFor({ state: "visible" });
    checks.push("correlation exact-zero relation");
  }

  {
    const core = await openCore("us-ca-math-s1-chapter-05", "compare-populations");
    await contains(core, /Gap ÷ MAD\s*≈ 2\.9×/i, "compare-populations: default separation must use the actual MAD rather than the old hard-coded spread");
    await contains(core, /mean absolute deviation is approximately 1\.02/i, "compare-populations: default prose must disclose the computed MAD");
    await core.getByRole("slider", { name: "shift group B", exact: true }).fill("1");
    await contains(core, /Gap ÷ MAD\s*= 0\.0×/i, "compare-populations: coincident centers need exact zero separation");
    await omits(core, /Gap ÷ MAD\s*≈ 0\.0×/i, "compare-populations: exact zero separation must not be approximate");
    checks.push("population-separation exact-zero relation");
  }

  {
    const core = await openCore("us-ca-math-s3-chapter-04", "coordinate-perimeter-area");
    for (let index = 0; index < 3; index += 1) await core.getByRole("button", { name: /Move vertex 1 right/ }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: /Move vertex 1 up/ }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: /Move vertex 2 up/ }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: /Move vertex 3 left/ }).click();
    await core.getByRole("button", { name: /Move vertex 3 up/ }).click();
    await contains(core, /perimeter\s*= 12/, "coordinate-perimeter-area: a 3-4-5 triangle needs exact perimeter 12");
    await omits(core, /perimeter\s*≈ 12|perimeter approximately 12/i, "coordinate-perimeter-area: exact integer perimeter must not be approximate");
    await core.getByRole("img", { name: /perimeter equals 12/ }).waitFor({ state: "visible" });
    checks.push("coordinate-perimeter exact relation");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-02", "trig-ratios");
    const slider = core.getByRole("slider", { name: "angle θ", exact: true });
    await slider.fill("30");
    await contains(core, /sin θ\s*= 0\.5/i, "trig-ratios: sin 30 degrees is exact");
    await contains(core, /cos θ\s*≈ 0\.87/i, "trig-ratios: cos 30 degrees remains rounded");
    await slider.fill("45");
    await contains(core, /tan θ\s*= 1/i, "trig-ratios: tan 45 degrees is exact");
    await slider.fill("60");
    await contains(core, /cos θ\s*= 0\.5/i, "trig-ratios: cos 60 degrees is exact");
    checks.push("trigonometric-ratio exact special angles");
  }

  {
    const core = await openCore("us-ca-math-s3-chapter-03", "solve-equations-steps");
    await core.getByRole("button", { name: "Decrease a, the left-side x coefficient", exact: true }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: "Decrease b, the left-side constant", exact: true }).click();
    await core.getByRole("button", { name: "Decrease c, the right-side x coefficient", exact: true }).click();
    for (let index = 0; index < 9; index += 1) await core.getByRole("button", { name: "Decrease d, the right-side constant", exact: true }).click();
    await contains(core, "x = 1/2 = 0.50 (exact decimal)", "solve-equations-steps: one-half needs exact decimal equality");
    await contains(core, "Its two-decimal form is exactly 0.50.", "solve-equations-steps: prose must call the terminating decimal exact");
    await omits(core, /1\/2 ≈ 0\.50|0\.50 to the nearest hundredth/, "solve-equations-steps: one-half must not be called rounded");
    checks.push("equation terminating-decimal relation");
  }

  {
    const core = await openCore("us-ca-math-p6-chapter-01", "ratio-double-number-line");
    await contains(core, /3\/2 spoons of sugar per cup of flour \(= 1\.50, exact decimal\)/, "ratio-double-number-line: three-halves needs exact decimal equality");
    await omits(core, /3\/2.*approximately 1\.50|≈ 1\.50/, "ratio-double-number-line: terminating unit rate must not be approximate");
    checks.push("ratio terminating-decimal relation");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-03", "volume-formulas");
    await core.getByRole("button", { name: "pyramid", exact: true }).click();
    await contains(core, /= 60\s*exact at the shown precision/, "volume-formulas: default pyramid volume is exactly 60");
    await omits(core, /≈ 60/, "volume-formulas: exact pyramid volume must not be approximate");
    await core.getByRole("button", { name: "cylinder", exact: true }).click();
    await contains(core, /≈ 141\.37\s*rounded to the nearest hundredth/, "volume-formulas: pi-based cylinder volume remains approximate");
    checks.push("volume exact-versus-rounded relation");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-03", "inverse-trig");
    await contains(core, /sin\(30°\) = 0\.5/, "inverse-trig: sin 30 degrees needs equality");
    await omits(core, /sin\(30°\) ≈ 0\.5/, "inverse-trig: exact special-angle sine must not be approximate");
    checks.push("inverse-trig exact special angle");
  }

  {
    const core = await openCore("us-ca-math-s2-chapter-01", "linear-equations");
    await core.getByRole("button", { name: "Decrease a", exact: true }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: "Decrease b", exact: true }).click();
    await core.getByRole("button", { name: "Decrease c", exact: true }).click();
    for (let index = 0; index < 5; index += 1) await core.getByRole("button", { name: "Decrease d", exact: true }).click();
    await contains(core, /x = 0\.50/, "linear-equations: one-half needs exact two-decimal equality");
    await omits(core, /x ≈ 0\.50/, "linear-equations: terminating decimal solution must not be approximate");
    checks.push("linear-equation terminating-decimal relation");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-02", "solve-right-triangles");
    await core.getByRole("slider", { name: "elevation angle", exact: true }).fill("45");
    await contains(core, /height = 50·tan 45°\s*= 50 m/, "solve-right-triangles: tan 45 degrees gives exact height");
    await contains(core, /line of sight = 50\/cos 45°\s*≈ 70\.71 m/, "solve-right-triangles: irrational line of sight remains approximate");
    await omits(core, /height = 50·tan 45°\s*≈ 50 m/, "solve-right-triangles: exact height must not be approximate");
    checks.push("right-triangle exact-versus-rounded lengths");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-04", "interpret-expressions");
    const decreaseYears = core.getByRole("button", { name: "Decrease years t", exact: true });
    await decreaseYears.click();
    await decreaseYears.click();
    await contains(core, /1000\(1 \+ 0\.05\)1 = \$1050\.00/, "interpret-expressions: one-year balance needs exact cent equality");
    await contains(core, /factor \(1\+r\)ᵗ\s*= 1\.0500/i, "interpret-expressions: one-year growth factor needs exact equality");
    await omits(core, /≈ \$1050\.00|≈ 1\.0500/, "interpret-expressions: exact one-year values must not be approximate");
    checks.push("compound-growth exact displayed values");
  }

  {
    const core = await openCore("us-ca-math-p5-5-nbt-decimals", "round-decimals");
    const decreaseTenth = core.getByRole("button", { name: "Decrease Decimal by one tenth", exact: true });
    await decreaseTenth.click();
    const increaseThousandth = core.getByRole("button", { name: "Increase Decimal", exact: true });
    for (let index = 0; index < 28; index += 1) await increaseThousandth.click();
    await core.getByRole("button", { name: "nearest tenth", exact: true }).click();
    await contains(core, /So 3\.400 = 3\.4/, "round-decimals: already-aligned value needs equality");
    await omits(core, /3\.400 ≈ 3\.4/, "round-decimals: unchanged value must not be approximate");
    checks.push("rounding unchanged-value relation");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-02", "exponential-vs-linear");
    await core.getByRole("slider", { name: "Exponential growth factor (b)", exact: true }).fill("1.5");
    const exponentialRow = core.getByRole("row").filter({ hasText: "1.5^x" });
    await contains(exponentialRow, /1\s+1\.5\s+≈ 2\.3/, "exponential-vs-linear: exact 1.5 and rounded 2.25 need different relations");
    await omits(exponentialRow, /≈ 1\.5/, "exponential-vs-linear: exact first power must not be approximate");
    checks.push("exponential-table exact-versus-rounded values");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-02", "complex-plane");
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: "Decrease Re z", exact: true }).click();
    for (let index = 0; index < 2; index += 1) await core.getByRole("button", { name: "Decrease Im z", exact: true }).click();
    await contains(core, /polar form of z\s*= 1\(cos0° \+ i·sin0°\)/i, "complex-plane: z = 1 has exact polar form");
    await omits(core, /polar form of z\s*≈ 1\(cos0°/i, "complex-plane: exact polar form must not be approximate");
    checks.push("complex-plane exact polar relation");
  }

  {
    const core = await openCore("us-ca-math-p5-5-nbt-decimals", "divide-two-digit");
    const decreaseDividend = core.getByRole("button", { name: "Decrease Dividend", exact: true });
    for (let index = 0; index < 32; index += 1) await decreaseDividend.click();
    const increaseDivisor = core.getByRole("button", { name: "Increase Divisor", exact: true });
    for (let index = 0; index < 5; index += 1) await increaseDivisor.click();
    await contains(core, /400 ÷ 20 = 20/, "divide-two-digit: friendly-number division needs equality");
    await omits(core, /400 ÷ 20 ≈ 20/, "divide-two-digit: exact estimate arithmetic must not be approximate");
    checks.push("division-estimate arithmetic relation");
  }

  {
    const core = await openCore("us-ca-math-p4-4-nbt-multi-digit", "add-subtract-bignum");
    const decreaseFirst = core.getByRole("button", { name: "Decrease First by 1", exact: true });
    for (let index = 0; index < 48; index += 1) await decreaseFirst.click();
    await core.getByRole("button", { name: "Decrease Second by 100", exact: true }).click();
    const increaseSecond = core.getByRole("button", { name: "Increase Second by 1", exact: true });
    for (let index = 0; index < 25; index += 1) await increaseSecond.click();
    await contains(core, /3,600 \+ 1,800\s*= 5,400/, "add-subtract-bignum: rounded-input arithmetic needs equality");
    await omits(core, /≈ 5,400/, "add-subtract-bignum: exact matching estimate must not be approximate");
    checks.push("multi-digit estimate arithmetic relation");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-03", "trig-identities");
    await contains(core, /\(0\.6\)² \+ \(0\.8\)² = 1/, "trig-identities: displayed 3-4-5 coordinates sum exactly to 1");
    await omits(core, /\(0\.6\)² \+ \(0\.8\)² ≈ 1/, "trig-identities: exact displayed substitution must not be approximate");
    await core.getByRole("slider", { name: "angle θ", exact: true }).fill("30");
    await core.getByRole("img", { name: /vertical leg sin θ equals 0.5/ }).waitFor({ state: "visible" });
    await contains(core, /\(0\.5\)² \+ \(0\.87\)² ≈ 1\.01/, "trig-identities: rounded special-angle substitution still needs a rounded sum");
    checks.push("trig-identity displayed-number relations");
  }

  {
    const core = await openCore("us-ca-math-s2-chapter-05", "two-way-tables");
    const decrease = core.getByRole("button", { name: "Decrease has a pet, likes animal movies", exact: true });
    while (!(await decrease.isDisabled())) await decrease.click();
    assert.equal(await decrease.isDisabled(), true, "two-way-tables: decrease action must disable at zero");
    const increase = core.getByRole("button", { name: "Increase has a pet, likes animal movies", exact: true });
    for (let index = 0; index < 100 && !(await increase.isDisabled()); index += 1) await increase.click();
    assert.equal(await increase.isDisabled(), true, "two-way-tables: increase action must disable at the two-digit upper bound");
    await contains(core, "99", "two-way-tables: upper-bound cell value must remain visible");
    checks.push("two-way-table lower and upper bounds");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-04", "compare-distributions");
    await contains(core, /Both classes center near 8/i, "compare-distributions: baseline explanation should describe the original centers");
    await core.getByRole("button", { name: "Replace Class B's score of 15 with 40", exact: true }).click();
    await omits(core, /Both classes center near 8/i, "compare-distributions: stale baseline explanation survived the outlier state");
    await contains(core, /outlier pushes Class B's mean to/i, "compare-distributions: changed state needs a truthful explanation");
    checks.push("distribution-caption state");
  }

  {
    const core = await openCore("us-ca-math-s2-chapter-04", "scientific-notation");
    for (let index = 0; index < 2; index += 1) {
      await core.getByRole("button", { name: "Decrease first exponent", exact: true }).click();
    }
    for (let index = 0; index < 5; index += 1) {
      await core.getByRole("button", { name: "Decrease second exponent", exact: true }).click();
    }
    await contains(core, /product's exponent is 3 \+ \(−2\) = 1/i, "scientific-notation: negative exponent addition needs signed grouping");
    await omits(core, /3\s*\+\s*-2|3\+-2/, "scientific-notation: raw plus-negative notation survived a reachable state");
    checks.push("scientific-notation signed exponent work");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-05", "addition-rule");
    const decreaseOverlap = core.getByRole("button", { name: "Decrease P(A∩B) %", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseOverlap.click();
    await contains(core, "No overlap, so direct addition gives the exact union probability.", "addition-rule: mutually exclusive state needs exact-addition wording");
    await omits(core, /too big by 0|You can.t just add/i, "addition-rule: zero overlap cannot be described as an overcount or as forbidding direct addition");
    const disjointDiagram = core.getByRole("img", {
      name: "Events A and B are mutually exclusive: P(A) is 50%, P(B) is 40%, and their intersection is empty.",
      exact: true
    });
    await disjointDiagram.waitFor({ state: "visible" });
    const eventCircles = disjointDiagram.locator("circle");
    assert.equal(await eventCircles.count(), 2, "addition-rule: the mutually exclusive state needs exactly two event circles");
    const circleGeometry = await eventCircles.evaluateAll((circles) => circles.map((circle) => ({
      cx: Number(circle.getAttribute("cx")),
      r: Number(circle.getAttribute("r"))
    })));
    assert.ok(
      Math.abs(circleGeometry[0].cx - circleGeometry[1].cx) >= circleGeometry[0].r + circleGeometry[1].r,
      "addition-rule: zero intersection must draw disjoint event circles"
    );
    assert.equal(await disjointDiagram.locator("text").filter({ hasText: "A∩B" }).count(), 0, "addition-rule: an empty intersection cannot retain an A∩B label");
    checks.push("addition-rule zero-overlap language and diagram");
  }

  {
    const core = await openCore("us-ca-math-p6-chapter-02", "decimal-arithmetic");
    const operations = [
      ["Addition", "Addition: line up the decimal points"],
      ["Subtraction", "Subtraction: line up the decimal points"],
      ["Multiplication", "Multiplication: count decimal places"],
      ["Division", "Division: shift, then divide"]
    ];
    for (const [buttonName, heading] of operations) {
      await core.getByRole("button", { name: buttonName, exact: true }).click();
      await core.getByRole("heading", { name: heading, exact: true }).waitFor({ state: "visible" });
    }
    checks.push("decimal-operation heading state");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-02", "exponential-vs-linear");
    await core.getByRole("slider", { name: "Linear slope (m)", exact: true }).fill("8");
    await core.getByRole("slider", { name: "Exponential growth factor (b)", exact: true }).fill("1.5");
    await contains(
      core,
      /At x = 0, the exponential starts above the line\. At each displayed integer from x = 1 through x = 6, it does not exceed the line; farther right, exponential growth eventually pulls ahead\./,
      "exponential-vs-linear: no-displayed-overtake state needs a qualified interval claim"
    );
    await omits(core, /Within this window the line is still ahead/i, "exponential-vs-linear: false whole-window claim survived");
    checks.push("exponential-linear no-overtake window");
  }

  {
    const core = await openCore("us-ca-math-s5-chapter-03", "periodic-models");
    await core.getByRole("heading", { name: "Three dials shape this sine curve", exact: true }).waitFor({ state: "visible" });
    await contains(core, "This interactive model fixes the phase shift at zero", "periodic-models: fixed phase boundary must be visible");
    await contains(core, "A fourth control for phase shift would be needed", "periodic-models: missing horizontal-shift degree of freedom must be disclosed");
    await omits(core, /Three dials, any wave/i, "periodic-models: false universality heading survived");
    checks.push("periodic-model phase boundary");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-01", "figure-symmetry");
    await contains(core, "a non-square rectangle has exactly 2 lines of symmetry and rotational symmetry of order 2", "figure-symmetry: rectangle claim must exclude the square case");
    checks.push("non-square rectangle symmetry qualifier");
  }

  {
    const core = await openCore("us-ca-math-s3-chapter-03", "matrix-equations");
    const decrease = core.getByRole("button", { name: "Decrease A row 1 column 2", exact: true });
    for (let index = 0; index < 2; index += 1) await decrease.click();
    await contains(core, "det A = 2·3 − (−1)·1 = 7", "matrix-equations: negative determinant factor needs parentheses");
    await omits(core, /−\s*-1·1|−\s+−1·1/, "matrix-equations: doubled-sign substitution survived");
    const increaseB = core.getByRole("button", { name: "Increase A row 1 column 2", exact: true });
    for (let index = 0; index < 2; index += 1) await increaseB.click();
    await core.getByRole("button", { name: "Decrease A row 1 column 1", exact: true }).click();
    const decreaseD = core.getByRole("button", { name: "Decrease A row 2 column 2", exact: true });
    for (let index = 0; index < 2; index += 1) await decreaseD.click();
    await contains(core, "det = 0 → no unique solution (A is singular)", "matrix-equations: the reachable singular state needs its no-unique-solution result");
    await contains(core, "Here det A = 0, so A⁻¹ does not exist and the system has no unique solution.", "matrix-equations: the singular figure caption must reject inverse multiplication");
    assert.equal(
      await core.getByText("Write the system as A·[x, y] = [e, f], then multiply by A⁻¹ to solve.", { exact: true }).count(),
      0,
      "matrix-equations: a singular state cannot retain the invertible-state figure caption"
    );
    checks.push("matrix determinant signed factors and singular caption");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-05", "matrices");
    const decrease = core.getByRole("button", { name: "Decrease B row 2 column 1", exact: true });
    for (let index = 0; index < 2; index += 1) await decrease.click();
    await contains(core, "the top-left is 1·2 + 2·(−1) = 0", "matrices: negative row-column factor needs parentheses");
    await omits(core, /2·-1/, "matrices: raw signed factor survived");
    await core.getByRole("button", { name: "Scale A", exact: true }).click();
    await core.getByRole("heading", { name: "Scale every entry", exact: true }).waitFor({ state: "visible" });
    await contains(core, "top-left entry is 2·1 = 2", "matrices: scaling explanation must follow the selected operation");
    await core.getByRole("button", { name: "Add A and B", exact: true }).click();
    await core.getByRole("heading", { name: "Add matching entries", exact: true }).waitFor({ state: "visible" });
    await contains(core, "top-left entry is 1 + 2 = 3", "matrices: addition explanation must follow the selected operation");
    checks.push("matrix operation-state explanations and signed factors");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-02", "triangle-area-sine");
    await core.getByRole("heading", { name: "Height hidden in the sine", exact: true }).waitFor({ state: "visible" });
    await contains(
      core,
      /sin C = h\/b \(opposite ÷ hypotenuse\), so h = b·sin C ≈ 4\.6/,
      "triangle-area-sine: the visible derivation must state the sine ratio before solving for height"
    );
    checks.push("sine-area ratio derivation");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-02", "complex-conjugates");
    const decreaseA = core.getByRole("button", { name: "Decrease a (real)", exact: true });
    const decreaseB = core.getByRole("button", { name: "Decrease b (imag)", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseA.click();
    for (let index = 0; index < 5; index += 1) await decreaseB.click();
    await contains(core, "(-1)² + (-1)² = 2", "complex-conjugates: negative squared bases need parentheses");
    await omits(core, /-1²/, "complex-conjugates: an unparenthesized negative squared base survived");
    checks.push("complex-conjugate negative-square notation");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-02", "complex-numbers");
    const decreaseB = core.getByRole("button", { name: "Decrease b (Im z)", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseB.click();
    await contains(
      core,
      "(3·1 − (−2)·(−4)) + (3·(−4) + (−2)·1)i",
      "complex-numbers: every negative factor in the product work needs parentheses"
    );
    await omits(core, /−\s+-2·|\+\s+-2·/, "complex-numbers: no reachable negative b may appear as a raw double-sign operand");
    checks.push("complex-number signed operands");
  }

  {
    const core = await openCore("us-ca-math-s1-chapter-05", "probability-basics");
    await core.getByRole("button", { name: "Reset", exact: true }).click();
    await contains(core, "flip to begin", "probability-basics: zero trials need an explicit start state");
    await contains(core, "experimental P(heads) is undefined until the first flip", "probability-basics: zero trials cannot display a fabricated experimental probability");
    await contains(core, "½ as likely as not", "probability-basics: the midpoint label must use meaningful likelihood language");
    const marker = core.locator("div.relative.h-3.rounded-full > div.absolute");
    assert.equal(await marker.count(), 0, "probability-basics: zero trials must not plot a probability marker");
    await core.getByRole("button", { name: "Flip once", exact: true }).click();
    await contains(core, /(?:0|1) \/ 1 = (?:0\.000|1\.000)/, "probability-basics: one flip needs its actual relative frequency");
    await contains(core, "experimental P(heads) — theory says 0.5", "probability-basics: post-trial text must distinguish experiment from theory");
    assert.equal(await marker.count(), 1, "probability-basics: an actual trial should plot one experimental marker");
    checks.push("probability zero-trial and one-trial states");
  }

  {
    const core = await openCore("us-ca-math-s2-chapter-04", "distance-formula");
    const decreaseY2 = core.getByRole("button", { name: "Decrease y₂", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseY2.click();
    await core.getByRole("heading", { name: "One coordinate gap", exact: true }).waitFor({ state: "visible" });
    await contains(core, "Their straight-line distance is the one nonzero coordinate gap, 6. Because the other gap is 0, no right triangle or hypotenuse is formed.", "distance-formula: an axis-aligned segment is not a nondegenerate right triangle");
    await core.getByRole("img", { name: "Points (2, 2) and (8, 2) lie on the same horizontal line; their straight-line distance is 6", exact: true }).waitFor({ state: "visible" });
    const decreaseX2 = core.getByRole("button", { name: "Decrease x₂", exact: true });
    for (let index = 0; index < 6; index += 1) await decreaseX2.click();
    await core.getByRole("heading", { name: "Coincident points", exact: true }).waitFor({ state: "visible" });
    await contains(core, "The selected points coincide. Both coordinate gaps and the straight-line distance are 0, so no triangle or hypotenuse is formed.", "distance-formula: coincident points need a zero-distance state");
    await core.getByRole("img", { name: "Both points are at (2, 2), so the distance is 0; no triangle is formed", exact: true }).waitFor({ state: "visible" });
    checks.push("distance coincident and axis-aligned states");
  }

  {
    const core = await openCore("us-ca-math-s1-chapter-04", "area-volume-surface");
    const figure = core.getByRole("img", { name: "Triangular prism: the front triangle has base 4 and a visibly perpendicular altitude 3; prism height 6; cross-section area 6; volume 36", exact: true });
    await figure.waitFor({ state: "visible" });
    assert.equal(await figure.locator('line[x1="90"][y1="50"][x2="90"][y2="130"]').count(), 1, "area-volume-surface: the triangular base needs a visible altitude");
    assert.equal(await figure.locator('polyline[points="90,120 100,120 100,130"]').count(), 1, "area-volume-surface: the altitude needs a visible right-angle marker");
    await contains(core, "triangle altitude h is perpendicular to base b", "area-volume-surface: the caption must identify which height belongs to the triangular base");
    checks.push("triangular-prism altitude contract");
  }

  {
    const core = await openCore("us-ca-math-s4-chapter-03", "solids-cross-sections");
    const sixFace = core.getByRole("button", { name: "Cube, six-face slice", exact: true });
    await sixFace.click();
    assert.equal(await sixFace.getAttribute("aria-pressed"), "true", "solids-cross-sections: the selected cube slice must expose its state");
    await contains(core, "cross-section: hexagon", "solids-cross-sections: a six-face cube slice must name the drawn hexagon");
    await core.getByRole("img", { name: "Cube, six-face slice: the cross-section drawn is a hexagon", exact: true }).waitFor({ state: "visible" });
    await omits(core, "rectangle / hexagon", "solids-cross-sections: one rendered slice cannot claim two different shapes");
    checks.push("cube six-face cross-section state");
  }

  {
    const core = await openCore("us-ca-math-s3-chapter-04", "conic-sections");
    await contains(core, "y = x²/(4p)", "conic-sections: the parabola card needs unambiguous division by 4p");
    const parabola = core.getByRole("img", {
      name: "Parabola with its vertex at the axes' origin, its focus above the vertex, and its directrix equally far below",
      exact: true
    });
    await parabola.waitFor({ state: "visible" });
    assert.equal(await parabola.locator('path[d="M 60 20 Q 120 170 180 20"]').count(), 1, "conic-sections: the parabola path must have its vertex at the axes origin");
    assert.equal(await parabola.locator('line[x1="20"][y1="95"][x2="220"][y2="95"]').count(), 1, "conic-sections: the horizontal axis must pass through the parabola vertex");
    assert.equal(await parabola.locator('circle[cx="120"][cy="95"]').count(), 1, "conic-sections: the parabola vertex must be marked at the origin");
    assert.equal(await parabola.locator('circle[cx="120"][cy="83"]').count(), 1, "conic-sections: the focus must be p above the origin");
    assert.equal(await parabola.locator('line[y1="107"][y2="107"]').count(), 1, "conic-sections: the directrix must be p below the origin");
    const hyperbolaButton = core.getByRole("button", { name: "Hyperbola", exact: true });
    await hyperbolaButton.click();
    assert.equal(await hyperbolaButton.getAttribute("aria-pressed"), "true", "conic-sections: Hyperbola must expose the selected state");
    await contains(core, "x²/a² − y²/b² = 1", "conic-sections: the selected curve and equation must agree");
    const hyperbola = core.getByRole("img", { name: "Hyperbola with two branches and its two foci marked on the horizontal axis", exact: true });
    await hyperbola.waitFor({ state: "visible" });
    const branchPaths = hyperbola.locator("path");
    assert.equal(await branchPaths.count(), 2, "conic-sections: the hyperbola needs two sampled branches");
    for (let index = 0; index < 2; index += 1) {
      const d = await branchPaths.nth(index).getAttribute("d");
      assert.ok(d?.includes("L ") && !d.includes("Q "), `conic-sections: branch ${index + 1} must be sampled from the displayed locus, not an arbitrary quadratic Bézier`);
    }
    checks.push("parabola origin/equation and hyperbola locus/focus states");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-05", "vectors");
    const decreaseTipX = core.getByRole("button", { name: "Decrease tip x", exact: true });
    const decreaseTipY = core.getByRole("button", { name: "Decrease tip y", exact: true });
    for (let index = 0; index < 5; index += 1) {
      await decreaseTipX.click();
      await decreaseTipY.click();
    }
    await contains(core, "The zero vector is a point, not an arrow; its magnitude is 0 and its direction is undefined.", "vectors: the coincident-endpoint caption must describe the zero-vector drawing");
    const zeroVectorFigure = core.getByRole("img", {
      name: "Vector from (-3, -2) to (-3, -2); components 0, 0; magnitude equals 0; direction is undefined for the zero vector.",
      exact: true
    });
    await zeroVectorFigure.waitFor({ state: "visible" });
    assert.equal(await zeroVectorFigure.locator("line[marker-end]").count(), 0, "vectors: a zero vector must not render a directional arrowhead");
    assert.equal(await zeroVectorFigure.locator("line[stroke-dasharray]").count(), 0, "vectors: a zero vector must not render degenerate component legs");
    assert.equal(await zeroVectorFigure.locator("text").filter({ hasText: /Δ[xy]=/ }).count(), 0, "vectors: a zero vector must not render overlapping component labels");
    assert.equal(await zeroVectorFigure.locator("text").filter({ hasText: "zero vector" }).count(), 1, "vectors: the coincident point must be visibly identified");
    checks.push("standalone zero-vector geometry");
  }

  {
    const core = await openCore("us-ca-math-s6-chapter-05", "vector-operations");
    await core.getByRole("heading", { name: "Add component by component", exact: true }).waitFor({ state: "visible" });
    await contains(core, "u + v = ⟨3 + (−1), 1 + 3⟩ = ⟨2, 4⟩.", "vector-operations: signed addends need unambiguous grouping");
    await core.getByRole("button", { name: "Subtract vectors", exact: true }).click();
    await core.getByRole("heading", { name: "Subtract by adding the opposite", exact: true }).waitFor({ state: "visible" });
    await contains(core, "u − v = ⟨3 − (−1), 1 − 3⟩ = ⟨4, −2⟩.", "vector-operations: subtract state must explain subtraction rather than addition");
    await core.getByRole("button", { name: "Scale vector u", exact: true }).click();
    await core.getByRole("heading", { name: "Scale every component", exact: true }).waitFor({ state: "visible" });
    assert.equal(await core.getByRole("button", { name: "Decrease v x", exact: true }).count(), 0, "vector-operations: scale state must hide irrelevant v controls");
    assert.equal(await core.getByRole("button", { name: "Decrease k", exact: true }).count(), 1, "vector-operations: scale state must expose the scalar control");
    for (let index = 0; index < 3; index += 1) await core.getByRole("button", { name: "Decrease u x", exact: true }).click();
    await core.getByRole("button", { name: "Decrease u y", exact: true }).click();
    await contains(core, "u = ⟨0, 0⟩", "vector-operations: zero-vector state must be visible");
    await contains(core, "k = 2", "vector-operations: scale state must retain the selected scalar");
    await contains(core, "k = 2 keeps the zero vector at the origin; its length remains 0 and it has no direction", "vector-operations: scaling zero cannot invent length or direction");
    const vectorFigure = core.getByRole("img", { name: "Vector u 0, 0 scaled by 2 to 0, 0 on a coordinate grid", exact: true });
    await vectorFigure.waitFor({ state: "visible" });
    assert.equal(await vectorFigure.locator("line[marker-end]").count(), 0, "vector-operations: a zero vector/result must render as points without directional arrowheads");
    checks.push("vector operation explanations and zero-vector scaling");
  }

  {
    const core = await openCore("us-ca-math-s3-chapter-03", "solve-equations-steps");
    await core.getByRole("button", { name: "Decrease c, the right-side x coefficient", exact: true }).click();
    await contains(core, "x = 8/3 ≈ 2.67 (nearest hundredth)", "solve-equations-steps: a noninteger solution must retain its exact reduced fraction");
    await contains(core, "The exact solution is x = 8/3.", "solve-equations-steps: explanatory copy must preserve exact equality");
    await contains(core, "The rounded decimal is a presentation approximation, not another equality-preserving algebra step.", "solve-equations-steps: rounded decimals cannot be called reversible algebra steps");
    await core.getByRole("button", { name: "Decrease c, the right-side x coefficient", exact: true }).click();
    const decreaseB = core.getByRole("button", { name: "Decrease b, the left-side constant", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseB.click();
    await contains(core, "3x − 2 = −1x + 10", "solve-equations-steps: the original equation needs sign-aware terms");
    await contains(core, "4x − 2 = 10 add x to both sides", "solve-equations-steps: moving a negative variable term must be described as addition");
    await contains(core, "4x = 12 add 2 to both sides", "solve-equations-steps: moving a negative constant must be described as addition");
    await contains(core, "x = 3 divide both sides by 4", "solve-equations-steps: the exact integer solution must follow the legal division step");
    const decreaseA = core.getByRole("button", { name: "Decrease a, the left-side x coefficient", exact: true });
    for (let index = 0; index < 4; index += 1) await decreaseA.click();
    await contains(core, "0 = 12 — impossible", "solve-equations-steps: equal variable coefficients with unequal constants need a no-solution conclusion");
    await contains(core, "There is no division step: dividing by zero is undefined.", "solve-equations-steps: the non-unique branch must not divide by zero");
    await omits(core, "divide both sides by 0", "solve-equations-steps: no reachable state may prescribe division by zero");
    checks.push("equation exact-fraction, signed-move, and no-division-by-zero states");
  }

  assert.deepEqual(pageErrors, [], `lesson routes raised browser exceptions:\n${pageErrors.join("\n")}`);

  console.log(`audit-us-ca-lesson-semantic-states: ${checks.length} state contracts at ${viewport.width}×${viewport.height}`);
  for (const check of checks) console.log(`  ✓ ${check}`);
  console.log("✓ no semantic state defects");
} finally {
  await browser.close();
}
