import { createRequire } from "node:module";
import path from "node:path";
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch();
for (const [w, h] of [[1512, 860], [1280, 800], [1100, 700], [1024, 700], [844, 390], [768, 960], [700, 900], [390, 664], [320, 568]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }), page = await ctx.newPage();
  await page.goto("file://" + path.resolve(process.argv[2])); await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady, null, { timeout: 20000 }); await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const hdr = document.getElementById("hdr"), vis = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const kids = [...hdr.children].filter(vis).map(el => { const b = el.getBoundingClientRect(); return { id: el.id || el.className, x0: Math.round(b.left), x1: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; });
    const overlaps = []; for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) if (Math.min(kids[i].x1, kids[j].x1) - Math.max(kids[i].x0, kids[j].x0) > 1) overlaps.push(kids[i].id + "×" + kids[j].id);
    const small = [...document.querySelectorAll("#hdr button, #zoomStack button")].filter(vis).map(el => { const b = el.getBoundingClientRect(); return [el.id || el.dataset.act, Math.round(b.width), Math.round(b.height)]; }).filter(x => x[1] < 44 || x[2] < 44);
    const clipped = kids.filter(k => k.x1 > innerWidth + 0.5 || k.x0 < -0.5).map(k => k.id);
    return { mode: window.__galaxy.state().mode, over: hdr.scrollWidth - hdr.clientWidth, overlaps, clipped, small, toggles: ["togL", "togR", "regionBtn"].map(id => { const e = document.getElementById(id); return id + ":" + (vis(e) ? "shown" : "hidden"); }).join(" "), search: (() => { const s = document.getElementById("searchBox"); return vis(s) ? Math.round(s.getBoundingClientRect().width) : null; })(), tight: hdr.classList.contains("tight") };
  });
  console.log(`${w}x${h} ` + JSON.stringify(r));
  await ctx.close();
}
await browser.close();
