// Runs the same scripted scenarios on a page and prints one JSON object of behaviour that must not change (semantics, not pixels).
import { createRequire } from "node:module";
import path from "node:path";
const file = path.resolve(process.argv[2]);
const req = createRequire("/Volumes/Starship/MAIS-MVP/package.json"), { chromium } = req("playwright");
const browser = await chromium.launch(), out = {}, errs = [];
async function open(hash, q, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1512, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push("pageerror: " + e.message));
  await page.goto("file://" + file + (q ? "?" + q : "") + (hash ? "#" + hash : ""));
  await page.waitForFunction(() => window.__galaxy && window.__galaxy.state().assetsReady && !window.__galaxy.state().moving, null, { timeout: 20000 });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const settle = async page => { await page.waitForFunction(() => !window.__galaxy.state().moving, null, { timeout: 15000 }); await page.waitForTimeout(450); };
// R1 deep link: selection + trace
{ const { ctx, page } = await open("s=4.NF.B.3&t=roots&d=2");
  out.deepTrace = await page.evaluate(() => { const t = window.__galaxy.state("trace"), s = window.__galaxy.state(); return { sel: s.selection, n: t.n, gens: t.gens, tree: t.tree, total: t.total, caption: t.caption, members: t.members.map(m => m.id).sort(), card: s.card, tab: s.tab, captions: s.captions.filter(c => !/single bodies/.test(c)) }; });
  out.deepTraceFocus = await page.evaluate(() => { const f = window.__galaxy.state("focus"); return { focus: f.focus, pinned: f.pinned }; });
  await ctx.close(); }
// R2 trace of 7.RP.A.2 roots all, course to 5.NF.B.4, path 3.NF.A.1 → 5.NF.B.4
{ const { ctx, page } = await open("s=7.RP.A.2&t=roots&d=all");
  out.trace7RP = await page.evaluate(() => { const t = window.__galaxy.state("trace"); return { n: t.n, gens: t.gens, tree: t.tree, total: t.total, drawn: t.drawn, caption: t.caption }; });
  await ctx.close(); }
{ const { ctx, page } = await open("c=5.NF.B.4");
  out.course = await page.evaluate(() => window.__galaxy.state("course"));
  await ctx.close(); }
{ const { ctx, page } = await open("s=3.NF.A.1&p=5.NF.B.4");
  out.path = await page.evaluate(() => { const p = window.__galaxy.state("path"); return { ok: p.ok, nodes: p.nodes.sort(), short: p.short, caption: p.caption, induced: p.induced.length }; });
  await ctx.close(); }
// R3 search + learner + launch + reset + facts
{ const { ctx, page } = await open("");
  out.search = await page.evaluate(() => ["4.NF.B.3", "4nf3", "HSA-SSE.A.1", "a-sse.1", "asse1", "4.NF.3c", "4.NF.B", "mp3", "times", "grade 4 area"].map(q => { const r = window.__galaxy.search(q); return [q, r.total, r.rows[0] && r.rows[0].id, r.rows[0] && r.rows[0].kind, r.rows[0] && r.rows[0].syn]; }));
  out.learner = await page.evaluate(() => { const l = window.__galaxy.state("learner"); return { mission: l.mission, tally: l.tally, counted: l.counted, ready: l.ready, locked: l.locked, complete: l.complete.length, route: l.route, review: l.review, unlocks: l.unlocks }; });
  out.facts = await page.evaluate(() => { const f = window.__galaxy.facts; return { standards: f.standards, plates: f.plates, constellations: f.constellations, clusters: f.clusters, q: +f.q.toFixed(4), roads: f.roads.count, backbone: f.backbone, checksum: f.checksum, issues: f.issues }; });
  out.layoutHash = await page.evaluate(() => { const L = window.__galaxy.state("layout"); let h = 0; for (const [id, p] of Object.entries(L.pos)) { const t = id + p.x.toFixed(3) + p.y.toFixed(3); for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0; } return h; });
  await page.click("[data-mission=launch]"); await page.waitForTimeout(2500); await settle(page);
  out.launch = await page.evaluate(() => { const l = window.__galaxy.state("learner"); return { counted: l.counted, mission: l.mission, last: l.lastLaunch, live: window.__galaxy.state().live }; });
  await page.click("[data-mission=reset]"); await page.waitForTimeout(600);
  out.reset = await page.evaluate(() => { const l = window.__galaxy.state("learner"); return { counted: l.counted, mission: l.mission, ready: l.ready.length }; });
  // R4 keyboard: Tab into the map, walk a ring, ring change, relations, Enter, Esc
  await page.focus("#map"); const walk = [];
  for (const k of ["ArrowRight", "ArrowRight", "ArrowUp", "ArrowDown", "ArrowLeft", "PageDown", "PageUp", "[", "]", "Enter"]) { await page.keyboard.press(k); await page.waitForTimeout(140); walk.push(await page.evaluate(() => { const s = window.__galaxy.state(), ad = s.activeDescendant, el = document.getElementById(ad); return [s.roving, s.selection, !!el && el.getAttribute("role")]; })); }
  out.kbdWalk = walk;
  await settle(page);
  out.afterEnter = await page.evaluate(() => { const s = window.__galaxy.state(); return { sel: s.selection, card: s.card, tab: s.tab, live: s.live }; });
  await ctx.close(); }
// R5 full keyboard reachability: every star along every ring by ArrowRight / ArrowUp
{ const { ctx, page } = await open("", "reduced=1");
  await page.focus("#map");
  out.ringWalk = await page.evaluate(async () => { const seen = new Set(), map = document.getElementById("map"), press = key => map.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); 
    for (let ring = 0; ring < 13; ring++) { let first = window.__galaxy.state().roving; seen.add(first); for (let j = 0; j < 80; j++) { press("ArrowRight"); const r = window.__galaxy.state().roving; if (r === first) break; seen.add(r); } press("ArrowUp"); }
    // walk back down to be sure inner rings were covered from wherever the mission started
    for (let ring = 0; ring < 13; ring++) press("ArrowDown");
    for (let ring = 0; ring < 13; ring++) { let first = window.__galaxy.state().roving; seen.add(first); for (let j = 0; j < 80; j++) { press("ArrowRight"); const r = window.__galaxy.state().roving; if (r === first) break; seen.add(r); } press("ArrowUp"); }
    return seen.size; });
  await ctx.close(); }
out.errors = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close();
