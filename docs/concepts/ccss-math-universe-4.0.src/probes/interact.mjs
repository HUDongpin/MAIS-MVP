import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]), outDir = path.resolve(process.argv[3]);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1512, height: 860 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(), errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message + " @ " + (e.stack || "").split("\n")[1]));
const settle = async (ms = 400) => { await page.waitForFunction(() => { const s = window.__galaxy.state(); return s.assetsReady && !s.moving && !window.__galaxy.state("lod").animating; }, null, { timeout: 15000 }); await page.waitForTimeout(ms); };
const lod = () => page.evaluate(() => window.__galaxy.state("lod"));
const st = () => page.evaluate(() => { const s = window.__galaxy.state(), c = window.__galaxy.camera(); return { k: +c.k.toFixed(3), userMoved: c.userMoved, css: s.backing.css, card: s.card, sel: s.selection, counts: s.counts, caps: s.captions, tab: s.tab, roving: s.roving, kbd: s.kbdFocus }; });
const stageBox = () => page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const log = (name, o) => console.log("— " + name + ": " + JSON.stringify(o));
await page.goto("file://" + file); await settle(900);
let L = await lod(), sb = await stageBox();
log("default", { ...(await st()), closed: L.closed, plates: L.plates });
// 1. hover a body
const b = L.bodies.find(x => x.key === "4.NF");
await page.mouse.move(sb.x + b.x + 60, sb.y + b.y + 60); await page.mouse.move(sb.x + b.x + 2, sb.y + b.y + 1, { steps: 6 }); await page.waitForTimeout(500);
log("hover 4.NF", { tip: await page.evaluate(() => document.getElementById("tip").innerText), hoverBody: (await lod()).hoverBody, cursor: await page.evaluate(() => document.getElementById("map").style.cursor) });
await page.screenshot({ path: outDir + "/i1-hover-body.png" });
// 2. click it
await page.mouse.click(sb.x + b.x + 2, sb.y + b.y + 1); await settle(700);
L = await lod();
log("after click 4.NF", { ...(await st()), bodyOpen: L.bodies.find(x => x.key === "4.NF").open, cardHead: await page.evaluate(() => document.querySelector("#starTabPanel").innerText.slice(0, 160).replace(/\n/g, " | ")) });
await page.screenshot({ path: outDir + "/i2-opened-body.png" });
// 3. key H → region
await page.focus("#map"); await page.keyboard.press("h"); await settle(700);
L = await lod(); log("after H", { ...(await st()), closed: L.closed });
// 4. select a star at region zoom → forced cells
await page.evaluate(() => window.__galaxy.select("4.NF.B.3")); await settle(700);
L = await lod(); log("select 4.NF.B.3 at region", { ...(await st()), forced: L.cells.filter(c => c.forced).map(c => c.ring + c.k), closed: L.closed });
await page.screenshot({ path: outDir + "/i3-forced-open.png" });
await page.evaluate(() => window.__galaxy.select(null)); await settle(500);
L = await lod(); log("cleared", { closed: L.closed, forced: L.cells.filter(c => c.forced).length });
// 5. keyboard roving
await page.keyboard.press("ArrowRight"); await settle(500);
L = await lod(); log("ArrowRight", { ...(await st()), forced: L.cells.filter(c => c.forced).map(c => c.ring + c.k) });
await page.screenshot({ path: outDir + "/i4-kbd.png" });
await page.keyboard.press("Escape"); await page.mouse.click(sb.x + 30, sb.y + sb.h / 2); await settle(400);
// 6. panels
await page.click("#togR"); await settle(600); log("right collapsed", { ...(await st()), togR: await page.getAttribute("#togR", "aria-expanded"), phostHidden: await page.evaluate(() => document.getElementById("phost").hidden) });
await page.click("#togL"); await settle(600); log("both collapsed", { ...(await st()), togL: await page.getAttribute("#togL", "aria-expanded") });
await page.keyboard.press("h"); await page.focus("#map"); await page.keyboard.press("h"); await settle(800);
await page.screenshot({ path: outDir + "/i5-panels-collapsed.png" });
log("region, panels collapsed", await st());
// explicit open intent brings the right panel back
await page.focus("#map"); await page.keyboard.press("l"); await settle(500); log("after L key", { phostHidden: await page.evaluate(() => document.getElementById("phost").hidden), tab: (await st()).tab, focus: await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)) });
for (const e of errs) console.log("! " + e);
await browser.close();
