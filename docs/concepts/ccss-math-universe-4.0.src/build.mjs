#!/usr/bin/env node
// Builds the single-file page ../ccss-math-universe-4.0.html from page.template.html.
// The CCSS data block is regenerated from ../ccss-math-universe-4.0.data.json (the dataset is the source of truth);
// the other JSON blocks come from the .json files next to this script. Never edit the generated page by hand.
// Usage: node build.mjs [outPath]   (default: ../ccss-math-universe-4.0.html)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const concepts = path.resolve(here, "..");
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(concepts, "ccss-math-universe-4.0.html");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
// Keep "</" and "<!--" out of the script blocks; both escapes are valid JSON.
const esc = (s) => s.replace(/<\//g, "<\\/").replace(/<!--/g, "\\u003c!--");

const data = read(path.join(concepts, "ccss-math-universe-4.0.data.json"));
const blocks = {
  "ccss-data": { dataVersion: "2026-09-11", meta: data.meta, standards: data.standards, edges: data.edges, practices: data.practices },
  "mais-demo-learner": read(path.join(here, "mais-demo-learner.json")),
  "mais-product-roads": read(path.join(here, "mais-product-roads.json")),
};

let html = fs.readFileSync(path.join(here, "page.template.html"), "utf8");
for (const [id, value] of Object.entries(blocks)) {
  const token = `{{JSON:${id}}}`;
  const count = html.split(token).length - 1;
  if (count !== 1) throw new Error(`placeholder ${token} found ${count} times`);
  const text = esc(JSON.stringify(value));
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(value)) throw new Error(`round trip failed for ${id}`);
  html = html.replace(token, () => text);
}
if (html.includes("{{JSON:")) throw new Error("unfilled placeholder");
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${Buffer.byteLength(html)} bytes)`);
