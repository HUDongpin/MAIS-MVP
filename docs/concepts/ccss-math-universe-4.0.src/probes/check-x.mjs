// ?check in WebKit and Firefox (playwright-core from AAIS), five viewports, default view and ?home=galaxy&panels=00
import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]);
const r2 = createRequire("/Volumes/Starship/From WestWorld/AAIS/node_modules/playwright-core/package.json"), pw = r2("playwright-core");
const VPS = [[1512, 860, 2, false], [1024, 700, 1, false], [768, 960, 1, false], [390, 664, 2, true], [844, 390, 2, true]];
let bad = 0;
for (const name of ["webkit", "firefox"]) {
  let browser; try { browser = await pw[name].launch(); } catch (e) { bad++; console.log(name + ": cannot launch — " + e.message.split("\n")[0] + " (counted as a failure: an engine that did not run verified nothing)"); continue; }
  for (const q of ["check", "check&home=galaxy&panels=00"]) for (const [w, h, dpr, mobile] of VPS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, ...(name === "webkit" ? { isMobile: mobile } : {}) });
    const page = await ctx.newPage(), errs = [];
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message));
    await page.goto("file://" + file + "?" + q);
    await page.waitForFunction(() => window.__check, null, { timeout: 40000 }).catch(() => {});
    const res = await page.evaluate(() => window.__check || null), fails = res ? res.results.filter(r => r.ok === false) : [{ name: "no __check", detail: "" }];
    if (fails.length || errs.length) bad++;
    console.log(`${name} ${w}x${h} ?${q}: ${res && res.pass ? "PASS" : "FAIL"} · ${res ? res.results.length : 0} checks, ${fails.length} fail, ${errs.length} errors`);
    for (const f of fails) console.log("   ✗ " + f.name + ": " + f.detail); for (const e of errs.slice(0, 4)) console.log("   ! " + e);
    await ctx.close();
  }
  await browser.close();
}
process.exit(bad ? 1 : 0);
