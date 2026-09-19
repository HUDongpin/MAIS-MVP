import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]), outDir = path.resolve(process.argv[3]);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), errs = []; let fails = 0;
const ok = (name, cond, detail) => { if (!cond) fails++; console.log((cond ? "✓ " : "✗ ") + name + (detail !== undefined ? " — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); };
async function open(opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.vp || { width: 1512, height: 860 }, deviceScaleFactor: opts.dpr || 1, hasTouch: !!opts.mobile, isMobile: !!opts.mobile, reducedMotion: opts.rm ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message + " @ " + (e.stack || "").split("\n")[1]));
  await page.goto("file://" + file + (opts.q ? "?" + opts.q : "") + (opts.hash ? "#" + opts.hash : ""));
  await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 });
  await page.waitForTimeout(opts.wait || 700);
  return { ctx, page };
}
const settle = async (page, ms = 450) => { await page.waitForFunction(() => !window.__galaxy.state().moving && !window.__galaxy.state("lod").animating, null, { timeout: 15000 }); await page.waitForTimeout(ms); };
const S = page => page.evaluate(() => { const s = window.__galaxy.state(), c = window.__galaxy.camera(); return { k: +c.k.toFixed(3), cx: +c.cx.toFixed(1), cy: +c.cy.toFixed(1), userMoved: c.userMoved, css: s.backing.css, card: s.card, sel: s.selection, sheet: s.sheet, rest: s.restKind, panels: s.panels, bodies: s.bodies, counts: s.counts, fx: s.fxRunning, tab: s.tab }; });
const lod = page => page.evaluate(() => window.__galaxy.state("lod"));
const stageXY = page => page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return [r.left, r.top]; });

// R5 filters: Hide mode with a stream off hides that stream's bodies; Dim mode dims them
{ const { ctx, page } = await open();
  await page.evaluate(() => { document.querySelector("#tab-filters").click(); });
  const hasD = await page.evaluate(() => !!document.querySelector("#filtersTabPanel input"));
  await page.evaluate(() => document.querySelector('#filtersTabPanel [data-filter="stream:D"]').click());
  await settle(page);
  let L = await lod(page); const dBodies = L.bodies.filter(b => b.k === "D");
  ok("filters dim: D bodies still shown (dimmed)", hasD && dBodies.every(b => b.shown), dBodies.length + " D bodies");
  await page.evaluate(() => document.querySelector('#filtersTabPanel [data-filter="mode:hide"]').click());
  await settle(page); L = await lod(page);
  ok("filters hide: D bodies not shown, others shown", L.bodies.filter(b => b.k === "D").every(b => !b.shown) && L.bodies.filter(b => b.k !== "D").every(b => b.shown || b.open));
  const chk = await page.evaluate(() => { const b = window.__galaxy.state("lod").bodies.find(x => x.k === "D" && x.x > 0 && x.y > 0); return b ? [b.x, b.y, b.key] : null; });
  const [sx, sy] = await stageXY(page); await page.mouse.move(sx + chk[0], sy + chk[1]); await page.waitForTimeout(400);
  ok("hidden body is not hoverable", (await page.evaluate(() => window.__galaxy.state().hoverBody)) === null, chk[2]);
  await page.screenshot({ path: outDir + "/e1-filter-hide.png" });
  await ctx.close(); }

// R6 reduced motion: region default, LOD cuts, no fx loop, zoom button is instant
{ const { ctx, page } = await open({ rm: true });
  let s = await S(page); ok("reduced: opens on the region", s.rest === "region" && s.k > 1.5 && !s.userMoved, s);
  ok("reduced: fx loop inactive", s.fx === false);
  const b = (await lod(page)).bodies.find(x => x.key === "4.NBT"), [sx, sy] = await stageXY(page);
  await page.mouse.click(sx + b.x, sy + b.y); await page.waitForTimeout(120);
  const L = await lod(page); ok("reduced: body opens at once (no easing)", L.bodies.find(x => x.key === "4.NBT").open && !L.animating && L.cells.every(c => c.openT === 0 || c.openT === 1));
  ok("reduced: 0 running CSS animations", (await page.evaluate(() => document.getAnimations().length)) === 0);
  await ctx.close(); }

// R7 phone: intro lands on My mission; tap a body opens it and leaves the sheet at peek; tap a star selects
{ const { ctx, page } = await open({ vp: { width: 390, height: 664 }, dpr: 2, mobile: true, wait: 2600 });
  let s = await S(page); ok("phone: rests near the mission after the intro", s.userMoved && s.k > 1.5 && s.sheet === "peek", { k: s.k, sheet: s.sheet });
  const L = await lod(page), [sx, sy] = await stageXY(page), b = L.bodies.filter(x => x.shown && x.x > 40 && x.x < 350 && x.y > 60 && x.y < 380).sort((p, q) => q.nn - p.nn)[0];
  await page.touchscreen.tap(sx + b.x, sy + b.y); await settle(page, 700);
  s = await S(page); const L2 = await lod(page);
  ok("phone: tapped body is open, its card is set, the sheet stays at peek", L2.bodies.find(x => x.key === b.key).open && s.card === "plate" && s.sheet === "peek", { key: b.key, card: s.card, sheet: s.sheet, k: s.k });
  ok("phone: peek names the constellation", /·/.test(await page.evaluate(() => document.getElementById("peek1").textContent)), await page.evaluate(() => document.getElementById("peek1").textContent + " / " + document.getElementById("peek2").textContent));
  await page.screenshot({ path: outDir + "/e2-phone-opened.png" });
  const star = await page.evaluate(() => { const L = window.__galaxy.state("layout"), c = window.__galaxy.camera(); for (const [id, p] of Object.entries(L.pos)) { const q = window.__galaxy.starScreen(id); if (q.visible && q.x > 40 && q.x < 350 && q.y > 60 && q.y < 420) return [id, q.x, q.y]; } return null; });
  if (star) { await page.waitForTimeout(400); await page.touchscreen.tap(sx + star[1], sy + star[2]); await settle(page, 500); s = await S(page); ok("phone: tapping a star of the open constellation selects a star", !!s.sel, { tapped: star[0], sel: s.sel, sheet: s.sheet }); }
  await ctx.close(); }

// R8 tooltip 1.4.13 on a body: hoverable (the pointer can rest on it), dismissible with Esc, persistent
{ const { ctx, page } = await open();
  const b = (await lod(page)).bodies.find(x => x.key === "5.NBT"), [sx, sy] = await stageXY(page);
  await page.mouse.move(sx + b.x - 80, sy + b.y - 80); await page.mouse.move(sx + b.x, sy + b.y, { steps: 8 }); await page.waitForTimeout(450);
  const tip = await page.evaluate(() => { const t = document.getElementById("tip"), r = t.getBoundingClientRect(); return { hidden: t.hidden, text: t.innerText, x: r.left + r.width / 2, y: r.top + r.height / 2, aria: t.getAttribute("aria-hidden") }; });
  ok("body tooltip shows name, count and how to open it", !tip.hidden && /5\.NBT/.test(tip.text) && /stars/.test(tip.text) && /open/.test(tip.text) && tip.aria === "true", tip.text.replace(/\n/g, " | "));
  await page.mouse.move(tip.x, tip.y, { steps: 10 }); await page.waitForTimeout(900);
  ok("tooltip stays while the pointer rests on it (hoverable)", !(await page.evaluate(() => document.getElementById("tip").hidden)));
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  ok("Esc dismisses it and empties it", await page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden && t.textContent === ""; }));
  await ctx.close(); }

// R9 panels: persisted across a reload; ?panels forces; collapsed content is out of the tab order
{ const ctx = await browser.newContext({ viewport: { width: 1512, height: 860 } });
  let { page } = await open({ ctx });
  await page.click("#togL"); await page.click("#togR"); await settle(page);
  let s = await S(page); ok("both panels collapse; the stage takes the width", s.css[0] > 1400 && !s.panels.left && !s.panels.right, s.css);
  ok("collapsed panels are hidden from the a11y tree and the tab order", await page.evaluate(() => document.getElementById("railL").hidden && document.getElementById("phost").hidden && document.getElementById("togL").getAttribute("aria-expanded") === "false"));
  await page.close(); ({ page } = await open({ ctx }));
  s = await S(page); ok("the choice is remembered on reload", !s.panels.left && !s.panels.right && s.css[0] > 1400, s.panels);
  await page.close(); ({ page } = await open({ ctx, q: "panels=11" }));
  s = await S(page); ok("?panels=11 forces both open", s.panels.left && s.panels.right && s.css[0] < 900, s.css);
  await ctx.close(); }

// R11 resize: untouched region view re-fits; after a user zoom the zoom level k is kept
{ const { ctx, page } = await open();
  const a = await S(page); await page.setViewportSize({ width: 1300, height: 760 }); await page.waitForTimeout(700);
  const b = await S(page); ok("resize while untouched keeps resting on the region", b.rest === "region" && !b.userMoved && b.cx === 0 && b.cy === 0, { before: a.k, after: b.k, css: b.css });
  await page.focus("#map"); await page.keyboard.press("+"); await settle(page); const c = await S(page);
  await page.setViewportSize({ width: 1512, height: 860 }); await page.waitForTimeout(700); const d = await S(page);
  ok("after a user zoom a resize keeps k", Math.abs(c.k - d.k) < 0.01 && d.userMoved, { k0: c.k, k1: d.k });
  await page.keyboard.press("0"); await settle(page); const e = await S(page); ok("0 → whole galaxy rests as galaxy", e.rest === "galaxy" && Math.abs(e.k - 1) < 1e-6);
  await page.keyboard.press("h"); await settle(page); const f = await S(page); ok("H → back to the same region view as at load", f.rest === "region" && Math.abs(f.k - a.k) < 1e-6, { load: a.k, now: f.k });
  // journey off: button hidden, H falls back to the galaxy
  await page.keyboard.press("j"); await page.waitForTimeout(300);
  ok("journey off hides My grade region", await page.evaluate(() => document.getElementById("regionBtn").hidden));
  await page.keyboard.press("h"); await settle(page); const g2 = await S(page); ok("journey off: H falls back to the whole galaxy", g2.rest === "galaxy" && Math.abs(g2.k - 1) < 1e-3, { rest: g2.rest, k: g2.k });
  await ctx.close(); }

// R10 figure mode: HUD hidden, rests on the region, no intro
{ const { ctx, page } = await open({ q: "figure&freeze=0" });
  const s = await S(page); ok("figure: region default, HUD hidden", s.rest === "region" && await page.evaluate(() => getComputedStyle(document.getElementById("hdr")).visibility === "hidden"), { k: s.k });
  await page.screenshot({ path: outDir + "/e3-figure.png" });
  await ctx.close(); }
for (const e of errs) console.log("! " + e);
console.log(fails || errs.length ? "FAILS: " + fails + ", page errors: " + errs.length : "ALL OK"); await browser.close();
process.exit(fails || errs.length ? 1 : 0); // a failed assertion or a captured console/page error fails the run
