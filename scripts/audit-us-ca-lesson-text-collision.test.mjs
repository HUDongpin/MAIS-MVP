import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";
import { auditLessonControlStates } from "./audit-us-ca-lesson-text-collision.mjs";

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function fixture({ step = "1", extra = "" } = {}) {
  const page = await browser.newPage();
  await page.setContent(`<section data-lesson-role="opener"><div data-ccss-lesson="fixture">
    <svg viewBox="0 0 200 80" width="200" height="80"><text x="10" y="30">Alpha</text><text id="moving" x="110" y="30">Beta</text></svg>
    <input aria-label="Position" type="range" min="0" max="4" step="${step}" value="0">
    <div><button type="button" aria-pressed="false">Reflect</button></div>${extra}
    </div></section><script>
      const slider = document.querySelector('input');
      const toggle = document.querySelector('button');
      const draw = () => document.getElementById('moving').setAttribute('x', slider.value === '2' && toggle.getAttribute('aria-pressed') === 'true' ? '10' : '110');
      slider.addEventListener('input', draw);
      toggle.addEventListener('click', () => { toggle.setAttribute('aria-pressed', toggle.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); draw(); });
    </script>`);
  return page;
}

const options = { slug: "fixture", tol: 0, maxPresses: 100, maxMs: 5000 };

test("detects a collision only reachable at an interior range value with a singleton toggle enabled", async () => {
  const page = await fixture();
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.equal(result.visited, 11); // default plus 2 toggle states x 5 range values
    assert.deepEqual(result.axes.find((a) => a.kind === "range").values, ["0", "1", "2", "3", "4"]);
    assert.deepEqual(result.axes.find((a) => a.kind === "toggle").values, ["false", "true"]);
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].state, /Reflect=true.*Position=2/);
    assert.deepEqual(result.unsupported, []);
    assert.deepEqual(result.lost, []);
    assert.deepEqual(result.stuck, []);
    assert.equal(result.capped, false);
  } finally { await page.close(); }
});

test("reports an unclassified control instead of silently claiming full coverage", async () => {
  const page = await fixture({ extra: '<button type="button">Unclassified action</button>' });
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.deepEqual(result.unsupported, ["|Unclassified action"]);
  } finally { await page.close(); }
});

test("rejects a range without a finite discrete domain", async () => {
  const page = await fixture({ step: "any" });
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.equal(result.visited, 1);
    assert.deepEqual(result.stuck, ["Position (range has no finite discrete domain)"]);
  } finally { await page.close(); }
});

test("a missing opener is a coverage error", async () => {
  const page = await browser.newPage();
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.equal(result.error, "opener not found");
  } finally { await page.close(); }
});

async function withWalkthrough(sharedSvg) {
  const page = await fixture();
  await page.evaluate((shared) => {
    const root = document.querySelector('[data-ccss-lesson="fixture"]');
    root.insertAdjacentHTML("beforeend", '<svg width="100" height="40" viewBox="0 0 100 40"><rect id="worked" width="10" height="10" /></svg><div><button id="next" type="button">Next step</button><button id="reset" type="button" disabled>Start over</button></div>');
    let count = 0;
    const advance = document.getElementById("next"), reset = document.getElementById("reset");
    const update = () => {
      advance.disabled = count === 2; reset.disabled = count === 0;
      if (shared) document.getElementById("moving").setAttribute("x", String(110 + 20 * count));
      else document.getElementById("worked").setAttribute("width", String(10 + 10 * count));
    };
    advance.onclick = () => { count += 1; update(); };
    reset.onclick = () => { count = 0; update(); };
  }, sharedSvg);
  return page;
}

test("checks the full product of diagram controls and worked-example reveal steps", async () => {
  const page = await withWalkthrough(false);
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.equal(result.visited, 31);
    assert.deepEqual(result.axes.find((a) => a.kind === "walkthrough").values, ["0", "1", "2"]);
    assert.deepEqual(result.unsupported, []);
    assert.deepEqual(result.stuck, []);
  } finally { await page.close(); }
});

test("visits shared SVG reveal changes jointly instead of assuming independence", async () => {
  const page = await withWalkthrough(true);
  try {
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.equal(result.visited, 31);
    assert.deepEqual(result.axes.find((a) => a.kind === "walkthrough").values, ["0", "1", "2"]);
    assert.deepEqual(result.stuck, []);
  } finally { await page.close(); }
});

test("a reset that leaves the revealed state active is an explicit coverage failure", async () => {
  const page = await withWalkthrough(false);
  try {
    await page.evaluate(() => { document.getElementById("reset").onclick = () => {}; });
    const result = await page.evaluate(auditLessonControlStates, options);
    assert.ok(result.stuck.some((message) => message.includes("reset did not restore the observable initial state")));
  } finally { await page.close(); }
});

test("four fresh-page masks cover both unanswered groups crossed with the full range", async () => {
  const page = await browser.newPage();
  const slug = "ca-g8-ch03-transformations-similarity";
  const html = `<section data-lesson-role="opener"><div data-ccss-lesson="${slug}">
    <svg width="200" height="80"><text x="10" y="30">Alpha</text><text id="moving" x="110" y="30">Beta</text></svg>
    <input type="range" aria-label="Position" min="0" max="4" step="1" value="0">
    <div id="first"><button type="button" aria-pressed="false">A1</button><button type="button" aria-pressed="false">A2</button></div>
    <div id="second"><button type="button" aria-pressed="false">B1</button><button type="button" aria-pressed="false">B2</button></div>
    </div></section><script>(() => {
      let first = false, second = false;
      const slider = document.querySelector('input');
      const draw = () => document.getElementById('moving').setAttribute('x', first && !second && slider.value === '2' ? '10' : '110');
      slider.oninput = draw;
      ['first', 'second'].forEach(id => {
        const group = document.getElementById(id);
        group.querySelectorAll('button').forEach(button => button.onclick = () => {
          if (id === 'first') first = true; else second = true;
          group.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
          draw();
        });
      });
    })();</script>`;
  try {
    const results = [];
    for (const unansweredMask of [0, 1, 2, 3]) {
      await page.setContent(html);
      const result = await page.evaluate(auditLessonControlStates, { ...options, slug, unansweredMask });
      assert.deepEqual(result.stuck, []);
      assert.deepEqual(result.unsupported, []);
      results.push(result);
    }
    assert.equal(results.reduce((total, result) => total + result.visited, 0), 49); // 3 x 3 x 5, plus four fresh defaults
    assert.deepEqual(results.map((result) => result.findings.length > 0), [false, false, true, false]);
  } finally { await page.close(); }
});
