import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("data/visualizationLabEmoji.ts", "utf8");
const templateIdsSource = fs.readFileSync("components/visualizations/visualizationTemplateIds.ts", "utf8");

function extractRecordEntries(recordName: string) {
  const start = source.indexOf(`export const ${recordName}`);
  assert.notEqual(start, -1, `${recordName} export missing`);
  const block = source.slice(start, source.indexOf("};", start));
  return [...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((match) => ({ key: match[1], value: match[2] }));
}

test("emoji map covers every visualization template id", () => {
  const templateIds = [...templateIdsSource.matchAll(/^\s{2}"([^"]+)"/gm)].map((match) => match[1]);
  assert.ok(templateIds.length >= 18, `expected >= 18 template ids, saw ${templateIds.length}`);

  const templateEntries = extractRecordEntries("visualizationTemplateEmoji");
  const mappedIds = new Set(templateEntries.map((entry) => entry.key));
  for (const templateId of templateIds) {
    assert.ok(mappedIds.has(templateId), `visualizationTemplateEmoji missing "${templateId}"`);
  }
});

test("CCSS standard emoji map is large and carries grade 6-8 unlettered aliases", () => {
  const entries = extractRecordEntries("ccssStandardEmoji");
  assert.ok(entries.length >= 380, `expected >= 380 standard entries, saw ${entries.length}`);

  const keys = new Set(entries.map((entry) => entry.key));
  assert.ok(keys.has("2.MD.A.1"), "canonical clustered id missing");
  assert.ok(keys.has("6.RP.1"), "grade 6-8 unlettered alias missing");
  assert.ok(!keys.has("Modeling"), "Modeling pseudo-id must not be mapped");
});

test("every emoji value is non-ASCII", () => {
  const entries = [...extractRecordEntries("ccssStandardEmoji"), ...extractRecordEntries("visualizationTemplateEmoji")];
  for (const { key, value } of entries) {
    assert.match(value, /[^\x00-\x7F]/, `entry "${key}" has ASCII value "${value}"`);
  }
});
