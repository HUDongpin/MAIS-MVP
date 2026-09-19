import { createRequire } from "node:module";
import path from "node:path";
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch();
async function run(file) {
  const out = {};
  for (const [id, v] of [["4.NF.B.3", "-420,-150,6"], ["7.RP.A.2", "-560,40,5"], ["K.CC.A.1", "120,-150,7"], ["HSF-IF.C.7", "-700,-420,6"]]) {
    const ctx = await browser.newContext({ viewport: { width: 1512, height: 860 } }), page = await ctx.newPage();
    await page.goto("file://" + path.resolve(file) + "#s=" + id + "&v=" + v);
    await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 }); await page.waitForTimeout(900);
    out[id] = await page.evaluate(() => ({ sel: window.__galaxy.state().selection, k: +window.__galaxy.camera().k.toFixed(2), portals: window.__galaxy.state("portals").map(p => [p.kind, (p.ids || []).join("+"), Math.round(p.x0), Math.round(p.y0)]) }));
    await ctx.close();
  }
  return out;
}
const a = await run(process.argv[2]), b = await run(process.argv[3]);
for (const id of Object.keys(a)) console.log(id, "portals:", a[id].portals.length, "vs", b[id].portals.length, JSON.stringify(a[id]) === JSON.stringify(b[id]) ? "IDENTICAL" : "DIFFERENT\n  " + JSON.stringify(a[id]) + "\n  " + JSON.stringify(b[id]));
await browser.close();
