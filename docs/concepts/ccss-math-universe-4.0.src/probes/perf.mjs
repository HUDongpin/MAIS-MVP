import { createRequire } from "node:module";
import path from "node:path";
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
async function run(label, file, channel) {
  const browser = await chromium.launch(channel ? { channel } : {}), ctx = await browser.newContext({ viewport: { width: 1512, height: 860 }, deviceScaleFactor: 2 }), page = await ctx.newPage();
  await page.goto("file://" + path.resolve(file) + "?selftest");
  await page.waitForFunction(() => window.__selftest && window.__selftest.done, null, { timeout: 60000 });
  const st = await page.evaluate(() => window.__selftest);
  console.log(label + " selftest: " + st.legs.map(l => l.name + " p95 " + l.p95.toFixed(1) + " worst " + l.worst.toFixed(1)).join(" · ") + " · all p95 " + st.all.p95.toFixed(1));
  // a wheel sweep in and out through the split threshold at the mission, sampling world draw ms
  const page2 = await ctx.newPage(); await page2.goto("file://" + path.resolve(file));
  await page2.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 }); await page2.waitForTimeout(800);
  const box = await page2.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(), q = window.__galaxy.starScreen("4.OA.B.4"); return [r.left + q.x, r.top + q.y]; });
  await page2.mouse.move(box[0], box[1]);
  for (let i = 0; i < 40; i++) { await page2.mouse.wheel(0, -60); await page2.waitForTimeout(16); }
  for (let i = 0; i < 40; i++) { await page2.mouse.wheel(0, 60); await page2.waitForTimeout(16); }
  await page2.waitForTimeout(400);
  const d = await page2.evaluate(() => { const s = window.__galaxy.state(); return { draw: s.drawMs, gov: s.govTier, k: window.__galaxy.camera().k }; });
  console.log(label + " wheel sweep: draw ms p50 " + pct(d.draw, 0.5).toFixed(2) + " p95 " + pct(d.draw, 0.95).toFixed(2) + " max " + Math.max(...d.draw).toFixed(2) + " (" + d.draw.length + " frames)");
  await browser.close();
}
for (const ch of [null, "chrome"]) { try { await run("before " + (ch || "chromium"), process.argv[2], ch); await run("now    " + (ch || "chromium"), process.argv[3], ch); } catch (e) { console.log("skip " + ch + ": " + e.message.split("\n")[0]); } }
