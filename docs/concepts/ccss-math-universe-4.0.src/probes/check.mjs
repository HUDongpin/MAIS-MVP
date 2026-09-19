// Usage: node check.mjs <page.html> [label]  — runs ?check at the five spec viewports in headless Chromium (+ WebKit with --webkit)
import { createRequire } from "node:module";
import path from "node:path";
const args = process.argv.slice(2), file = path.resolve(args[0]), label = args[1] || "page", wantWebkit = args.includes("--webkit"), extra = (args.find(a => a.startsWith("--q=")) || "").slice(4);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json");
const engines = [["chromium", req("playwright").chromium]];
if (wantWebkit) { const r2 = createRequire("/Volumes/Starship/From WestWorld/AAIS/node_modules/playwright-core/package.json"); engines.push(["webkit", r2("playwright-core").webkit]); }
const VPS = [[1512, 860, 2, false], [1024, 700, 1, false], [768, 960, 1, false], [390, 664, 2, true], [844, 390, 2, true]];
let bad = 0;
for (const [name, eng] of engines) {
  const browser = await eng.launch();
  for (const [w, h, dpr, mobile] of VPS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, ...(name === "chromium" ? { isMobile: mobile } : {}) });
    const page = await ctx.newPage(); const errs = [];
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message));
    await page.goto("file://" + file + "?check" + (extra ? "&" + extra : ""));
    await page.waitForFunction(() => window.__check, null, { timeout: 30000 }).catch(() => {});
    const res = await page.evaluate(() => window.__check || null);
    const fails = res ? res.results.filter(r => r.ok === false) : [{ name: "no __check", detail: "" }], pend = res ? res.results.filter(r => r.ok === null) : [];
    if (fails.length || errs.length) bad++;
    console.log(`${label} ${name} ${w}x${h}: ${res && res.pass ? "PASS" : "FAIL"} · ${res ? res.results.length : 0} checks, ${fails.length} fail, ${pend.length} pending, ${errs.length} console errors`);
    for (const f of fails) console.log("   ✗ " + f.name + ": " + f.detail);
    for (const p of pend) console.log("   … " + p.name + ": " + p.detail);
    for (const e of errs.slice(0, 5)) console.log("   ! " + e);
    await ctx.close();
  }
  await browser.close();
}
process.exit(bad ? 1 : 0);
