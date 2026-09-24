// Usage: node shot.mjs <page.html> <out.png> [--vp=1512x860@2] [--q=query] [--js=expr to run before the shot] [--wait=ms] [--mobile]
import { createRequire } from "node:module";
import path from "node:path";
const args = process.argv.slice(2), file = path.resolve(args[0]), out = path.resolve(args[1]);
const opt = k => { const a = args.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : null; };
const [vw, rest] = (opt("vp") || "1512x860@2").split("x"), [vh, dpr] = rest.split("@"), mobile = args.includes("--mobile");
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: +vw, height: +vh }, deviceScaleFactor: +(dpr || 2), hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage(), errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n")));
await page.goto("file://" + file + (opt("q") ? "?" + opt("q") : "") + (opt("hash") ? "#" + opt("hash") : ""));
await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 }).catch(e => errs.push("wait: " + e.message));
await page.waitForTimeout(+(opt("wait") || 900));
if (opt("js")) { const r = await page.evaluate(opt("js")).catch(e => "EVAL ERROR " + e.message); if (r !== undefined) console.log("js →", typeof r === "string" ? r : JSON.stringify(r)); await page.waitForTimeout(+(opt("wait2") || 1500)); }
await page.screenshot({ path: out });
const st = await page.evaluate(() => { const g = window.__galaxy, s = g.state(), c = g.camera(); return { k: +c.k.toFixed(3), s: +c.s.toFixed(4), levelG: s.levelG, counts: s.counts, labels: s.placedLabels, mode: s.mode, css: s.backing.css, captions: s.captions }; }).catch(e => ({ error: e.message }));
console.log(JSON.stringify(st)); for (const e of errs) console.log("! " + e);
await browser.close();
