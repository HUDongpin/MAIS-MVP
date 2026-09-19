import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]), outDir = path.resolve(process.argv[3]);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), errs = []; let fails = 0;
const ok = (name, cond, detail) => { if (!cond) fails++; console.log((cond ? "✓ " : "✗ ") + name + (detail !== undefined ? " — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); };
const ctx = await browser.newContext({ viewport: { width: 1512, height: 860 }, deviceScaleFactor: 2 }), page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message + " @ " + (e.stack || "").split("\n")[1]));
await page.goto("file://" + file); await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 }); await page.waitForTimeout(800);
const settle = async (ms = 450) => { await page.waitForFunction(() => !window.__galaxy.state().moving && !window.__galaxy.state("lod").animating, null, { timeout: 15000 }); await page.waitForTimeout(ms); };
const lod = () => page.evaluate(() => window.__galaxy.state("lod"));
// R12 mouse-only: select at region zoom forces cells; badges sit on drawn stars; clearing closes them again
await page.evaluate(() => window.__galaxy.select("4.NF.B.3")); await settle();
let L = await lod(); const f = await page.evaluate(() => window.__galaxy.state("focus"));
ok("selection at the region zoom forces its cells open", L.cells.filter(c => c.forced).length >= 3 && f.pinned, L.cells.filter(c => c.forced).map(c => c.ring + c.k));
const badgeOK = await page.evaluate(() => { const f = window.__galaxy.state("focus"), lod = window.__galaxy.state("lod"), L = window.__galaxy.state("layout"); return f.badges.length > 0 && f.badges.every(b => { const p = L.pos[b.star], c = lod.cells[p.cell]; return c.zoom || c.forced; }); });
ok("numbered badges land on stars that are drawn", badgeOK, f.badges.map(b => b.star + ":" + b.text));
await page.evaluate(() => window.__galaxy.select(null)); await settle();
L = await lod(); ok("clearing the selection closes them", L.cells.filter(c => c.forced).length === 0 && L.closed === L.plates, { forced: L.cells.filter(c => c.forced).length, closed: L.closed });
// R13 body hover lights its roads and its name; screenshot for the record
const b = L.bodies.find(x => x.key === "4.NBT"), box = await page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return [r.left, r.top]; });
await page.mouse.move(box[0] + b.x + 50, box[1] + b.y + 40); await page.mouse.move(box[0] + b.x + 1, box[1] + b.y + 1, { steps: 5 }); await page.waitForTimeout(500);
const lab = await page.evaluate(() => window.__galaxy.state("labels").filter(l => l.kind === "body" && /4\.NBT/.test(l.text)).map(l => l.text + " (tier " + l.tier + ")"));
ok("hovered body is named with its progress line at tier 1", lab.length === 1 && /lit/.test(lab[0]) && /tier 1/.test(lab[0]), lab);
await page.screenshot({ path: outDir + "/e4-hover-roads.png" });
// R14 Launch from the region view: burst and ship play at bodies, the mission body changes, no errors
await page.mouse.move(box[0] + 5, box[1] + 300);
await page.click("[data-mission=launch]"); await page.waitForTimeout(450); await page.screenshot({ path: outDir + "/e5-launch-mid.png" });
await page.waitForTimeout(2300); await settle();
const after = await page.evaluate(() => { const l = window.__galaxy.state("learner"), lod = window.__galaxy.state("lod"); return { mission: l.mission, counted: l.counted, k: +window.__galaxy.camera().k.toFixed(2), closed: lod.closed }; });
ok("Launch at the constellation level works (next mission, counted + 1)", after.mission === "3.OA.D.8" && after.counted === 98, after);
await page.screenshot({ path: outDir + "/e6-launch-after.png" });
// R15 zoom with the + button until stars open around the view centre, check the LOD hysteresis is stable under ±4 % wheel jitter
await page.focus("#map"); await page.keyboard.press("h"); await settle();
const flips = await page.evaluate(async () => { const g = window.__galaxy, stage = document.getElementById("stage"), r = stage.getBoundingClientRect(); let changes = 0, prev = JSON.stringify(g.state("lod").cells.map(c => c.zoom));
  const wheel = dy => stage.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
  for (let i = 0; i < 40; i++) wheel(-14); // zoom in to about the first split
  await new Promise(z => setTimeout(z, 400)); prev = JSON.stringify(g.state("lod").cells.map(c => c.zoom));
  for (let i = 0; i < 30; i++) { wheel(i % 2 ? 26 : -26); await new Promise(z => setTimeout(z, 20)); const cur = JSON.stringify(g.state("lod").cells.map(c => c.zoom)); if (cur !== prev) { changes++; prev = cur; } }
  return { changes, k: +g.camera().k.toFixed(3) }; });
ok("±4 % zoom jitter never flips a cell between bodies and stars", flips.changes === 0, flips);
for (const e of errs) console.log("! " + e);
console.log(fails || errs.length ? "FAILS: " + fails + ", page errors: " + errs.length : "ALL OK"); await browser.close();
process.exit(fails || errs.length ? 1 : 0); // a failed assertion or a captured console/page error fails the run
