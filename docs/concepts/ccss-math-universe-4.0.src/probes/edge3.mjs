// Review findings on PR #256, kept as regression checks: H with the journey off, a roving star hidden by a Hide filter, the selection left
// behind by a group card (twin + address), and the phone peek after filters remove a road card. Exits non-zero on any failure or page error.
import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), errs = []; let fails = 0;
const ok = (name, cond, detail) => { if (!cond) fails++; console.log((cond ? "✓ " : "✗ ") + name + (detail !== undefined ? " — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); };
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 1512, height: 860 }, deviceScaleFactor: 1, hasTouch: !!opts.mobile, isMobile: !!opts.mobile });
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message + " @ " + (e.stack || "").split("\n")[1]));
  await page.goto("file://" + file + (opts.q ? "?" + opts.q : "") + (opts.hash ? "#" + opts.hash : ""));
  await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 });
  await page.waitForTimeout(opts.wait || 700);
  return { ctx, page };
}
const settle = async (page, ms = 450) => { await page.waitForFunction(() => !window.__galaxy.state().moving && !window.__galaxy.state("lod").animating, null, { timeout: 15000 }); await page.waitForTimeout(ms); };
const stageXY = page => page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return [r.left, r.top]; });

// 1. H with the journey off shows the whole galaxy (the region is a learner view; its button is hidden then)
{ const { ctx, page } = await open();
  await page.focus("#map"); await page.keyboard.press("+"); await settle(page); await page.keyboard.press("j"); await page.waitForTimeout(300); await page.keyboard.press("h"); await settle(page);
  const s = await page.evaluate(() => ({ rest: window.__galaxy.state().restKind, k: +window.__galaxy.camera().k.toFixed(3), journey: window.__galaxy.state().journeyOn }));
  ok("H with the journey off rests on the whole galaxy", !s.journey && s.rest === "galaxy" && Math.abs(s.k - 1) < 1e-3, s);
  await page.keyboard.press("j"); await page.waitForTimeout(300); await page.keyboard.press("h"); await settle(page);
  const t = await page.evaluate(() => ({ rest: window.__galaxy.state().restKind, k: +window.__galaxy.camera().k.toFixed(3) }));
  ok("H with the journey back on returns to the region", t.rest === "region" && t.k > 1.5, t);
  await ctx.close(); }

// 2. a Hide filter that removes the roving star moves keyboard focus to a drawn star; no ring on a hidden star, Enter never selects one
{ const { ctx, page } = await open();
  await page.evaluate(() => window.__galaxy.select("4.MD.B.4")); await page.focus("#map"); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.__galaxy.state().roving);
  await page.evaluate(() => { document.querySelector("#tab-filters").click(); document.querySelector('#filtersTabPanel [data-filter="mode:hide"]').click(); document.querySelector('#filtersTabPanel [data-filter="stream:D"]').click(); });
  await settle(page);
  const mid = await page.evaluate(() => { const s = window.__galaxy.state(), ad = document.getElementById(s.activeDescendant); return { roving: s.roving, ad: !!ad && ad.getAttribute("role") }; });
  ok("the roving star was the hidden one before the filter", before === "4.MD.B.4", before);
  ok("roving moved off the hidden star to a drawn one, and the active descendant follows", mid.roving !== "4.MD.B.4" && !/\.MD\.B\./.test(mid.roving) && mid.ad === "option", mid);
  await page.focus("#map"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250);
  const ring = await page.evaluate(() => window.__galaxy.state("focus"));
  await page.keyboard.press("Enter"); await settle(page);
  const sel = await page.evaluate(() => { const g = window.__galaxy, s = g.state(), L = g.state("layout"); return { sel: s.selection, stream: s.selection ? L.pos[s.selection].k : null }; });
  ok("Enter selects a drawn star, never one of the hidden stream", !!sel.sel && sel.stream !== "D" && ring.kbdRing === true, sel);
  await ctx.close(); }

// 3. a group card that replaces a selected star clears it everywhere: twin option, address (s, t, p), and Back returns to the star
{ const { ctx, page } = await open({ hash: "s=4.NF.B.3&t=roots&d=2" });
  await page.focus("#map"); await page.keyboard.press("h"); await settle(page);
  const b = await page.evaluate(() => window.__galaxy.state("lod").bodies.find(x => x.shown && x.key === "K.CC")), [sx, sy] = await stageXY(page);
  await page.mouse.click(sx + b.x, sy + b.y); await settle(page, 700);
  const a = await page.evaluate(() => ({ card: window.__galaxy.state().card, sel: window.__galaxy.state().selection, twin: document.querySelectorAll("#twin [aria-selected='true']").length, hash: location.hash, trace: window.__galaxy.state().trace }));
  ok("the card replaced the star: no selection, no selected twin option", a.card === "plate" && a.sel === null && a.twin === 0 && !a.trace, a);
  ok("the address no longer carries the old star, trace or path", !/[#&](s|t|p)=/.test(a.hash), a.hash);
  // Back must stay on the page (the card pushed an entry) and restore the star; without a pushed entry Back would leave the page
  const entries = await page.evaluate(() => history.length);
  await page.goBack().catch(() => {}); await page.waitForTimeout(900);
  const back = await page.evaluate(() => (window.__galaxy ? { sel: window.__galaxy.state().selection, hash: location.hash } : { left: location.href })).catch(() => ({ left: true }));
  ok("Back returns to the star", back.sel === "4.NF.B.3", { back, entries });
  await ctx.close(); }

// 3b. the same for a card that does not move the camera (a constellation road opened from the List tab)
{ const { ctx, page } = await open({ hash: "s=4.NF.B.3" });
  await page.evaluate(() => { document.querySelector("#tab-list").click(); const d = [...document.querySelectorAll("details.maplist")].find(x => x.querySelector("[data-bb]")); d.open = true; d.querySelector("[data-bb]").click(); });
  await page.waitForTimeout(150);
  const a = await page.evaluate(() => ({ card: window.__galaxy.state().card, sel: window.__galaxy.state().selection, twin: document.querySelectorAll("#twin [aria-selected='true']").length, hash: location.hash }));
  ok("constellation-road card: selection, twin option and address cleared at once", a.card === "bb" && a.sel === null && a.twin === 0 && !/[#&]s=/.test(a.hash), a);
  await ctx.close(); }

// 4. phone: a road card removed by a filter leaves the peek row too
{ const { ctx, page } = await open({ vp: { width: 390, height: 664 }, mobile: true, wait: 2600 });
  await page.evaluate(() => { document.getElementById("sheetUp").click(); document.querySelector("#tab-list").click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const d = [...document.querySelectorAll("details.maplist")].find(x => x.querySelector("[data-road]")); d.open = true; d.querySelector("[data-road]").click(); });
  await settle(page, 600);
  const p0 = await page.evaluate(() => ({ card: window.__galaxy.state().card, peek: document.getElementById("peek1").textContent + " / " + document.getElementById("peek2").textContent }));
  await page.evaluate(() => { document.querySelector("#tab-filters").click(); document.querySelector('#filtersTabPanel [data-filter="roads"]').click(); }); // Grand Roads off recomputes the view roads
  await page.evaluate(() => document.querySelector('#filtersTabPanel [data-filter="conf:high"]').click());
  await settle(page, 500);
  const p1 = await page.evaluate(() => ({ card: window.__galaxy.state().card, peek: document.getElementById("peek1").textContent + " / " + document.getElementById("peek2").textContent }));
  ok("a road card was open and named in the peek", p0.card === "road" && /Road/.test(p0.peek), p0);
  ok("after the filter removed it, the peek no longer names the road", p1.card === null && !/Grand Road/.test(p1.peek) && p1.peek !== p0.peek, p1);
  await ctx.close(); }
for (const e of errs) console.log("! " + e);
console.log(fails || errs.length ? "FAILS: " + fails + ", page errors: " + errs.length : "ALL OK"); await browser.close();
process.exit(fails || errs.length ? 1 : 0);
