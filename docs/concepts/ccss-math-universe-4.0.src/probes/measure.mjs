// Spacing of what is drawn at the default view: nearest-neighbour distance (px) between drawn bodies/stars on the stage.
import { createRequire } from "node:module";
import path from "node:path";
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch();
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
async function run(label, file, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1, hasTouch: !!opts.mobile, isMobile: !!opts.mobile });
  const page = await ctx.newPage(); await page.goto("file://" + path.resolve(file) + (opts.q ? "?" + opts.q : ""));
  await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 });
  await page.waitForTimeout(opts.wait || 900);
  if (opts.js) { await page.evaluate(opts.js); await page.waitForTimeout(1500); }
  const r = await page.evaluate(() => {
    const g = window.__galaxy, st = g.state(), cam = g.camera(), W = cam.W, H = cam.H, lod = g.state("lod"), L = g.state("layout"), items = [];
    const closedCells = new Set(); if (lod && lod.cells) lod.cells.forEach((c, i) => { if (!(c.zoom || c.forced)) closedCells.add(i); });
    if (lod && lod.bodies) for (const b of lod.bodies) if (b.shown && b.x >= 0 && b.y >= 0 && b.x <= W && b.y <= H) items.push([b.x, b.y, b.r, "body"]);
    for (const [id, p] of Object.entries(L.pos)) { if (lod && lod.cells && closedCells.has(p.cell)) continue; const q = g.starScreen(id); if (q.visible) items.push([q.x, q.y, 0, "star"]); }
    const nn = items.map((a, i) => { let d = Infinity; items.forEach((b, j) => { if (i !== j) d = Math.min(d, Math.hypot(a[0] - b[0], a[1] - b[1])); }); return d; });
    return { stage: [Math.round(W), Math.round(H)], k: +cam.k.toFixed(2), sFit: +cam.sFit.toFixed(4), galaxyPx: Math.round(2000 * cam.sFit), drawn: items.length, bodies: items.filter(x => x[3] === "body").length, stars: items.filter(x => x[3] === "star").length, nn, maxBodyR: Math.max(0, ...items.map(x => x[2])), labels: st.placedLabels };
  });
  const nn = r.nn; delete r.nn;
  console.log(label.padEnd(44) + JSON.stringify({ ...r, nnMedian: +pct(nn, 0.5).toFixed(1), nnP10: +pct(nn, 0.1).toFixed(1), nnMin: +Math.min(...nn).toFixed(1) }));
  await ctx.close();
}
const OLD = process.argv[2], NEW = process.argv[3];
await run("4.0 before · laptop 1512x860 default", OLD, [1512, 860]);
await run("4.0 now    · laptop 1512x860 default", NEW, [1512, 860]);
await run("4.0 now    · laptop, panels collapsed", NEW, [1512, 860], { q: "panels=00" });
await run("4.0 now    · laptop, whole galaxy (key 0)", NEW, [1512, 860], { q: "home=galaxy" });
await run("4.0 before · 1280x800 default", OLD, [1280, 800]);
await run("4.0 now    · 1280x800 whole galaxy, panels open", NEW, [1280, 800], { q: "home=galaxy" });
await run("4.0 now    · 1280x800 whole galaxy, panels collapsed", NEW, [1280, 800], { q: "home=galaxy&panels=00" });
await run("4.0 now    · 1280x800 default, panels collapsed", NEW, [1280, 800], { q: "panels=00" });
await run("4.0 before · phone 390x664 after intro", OLD, [390, 664], { mobile: true, wait: 2800 });
await run("4.0 now    · phone 390x664 after intro", NEW, [390, 664], { mobile: true, wait: 2800 });
await run("4.0 before · tablet 768x960 default", OLD, [768, 960]);
await run("4.0 now    · tablet 768x960 default", NEW, [768, 960]);
await browser.close();
