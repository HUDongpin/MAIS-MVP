import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/labLogoArt.tsx", "utf8");

function extractBlock(pattern: RegExp) {
  const match = source.match(pattern);
  assert.ok(match, `Expected labLogoArt.tsx to contain ${pattern}`);
  return match[1];
}

function extractMapValues(block: string) {
  return [...block.matchAll(/:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function extractRegistryKeys(block: string) {
  return [...block.matchAll(/"([^"]+)":\s*[a-zA-Z]/g)].map((match) => match[1]);
}

const templateBlock = extractBlock(/const templateLogoGlyphs[^=]*= \{([\s\S]*?)\n\};/);
const kindergartenBlock = extractBlock(/const kindergartenCaliforniaLogoGlyphs[^=]*= \{([\s\S]*?)\n\};/);
const fallbackBlock = extractBlock(/const fallbackLogoGlyphs = \[([^\]]+)\]/);
const registryBlock = extractBlock(/const labLogoArtByGlyph[^=]*= \{([\s\S]*?)\n\};/);

test("every visualization lab glyph resolves to illustrated sticker art", () => {
  const glyphs = new Set([
    ...extractMapValues(templateBlock),
    ...extractMapValues(kindergartenBlock),
    ...[...fallbackBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1])
  ]);
  const registryKeys = new Set(extractRegistryKeys(registryBlock));

  assert.ok(glyphs.size >= 15, "expected the catalog glyph maps to stay populated");
  const missing = [...glyphs].filter((glyph) => !registryKeys.has(glyph));
  assert.deepEqual(missing, []);
});

test("illustrated sticker art stays svg-based with shared sticker styling", () => {
  const svgCount = (source.match(/<svg viewBox="0 0 48 48"/g) ?? []).length;
  assert.ok(svgCount >= 1, "expected the shared LogoCanvas svg wrapper");
  assert.match(source, /function LogoCanvas\(/);
  assert.match(source, /function LogoSparkle\(/);
  assert.match(source, /aria-hidden="true"/);
  assert.ok(extractRegistryKeys(registryBlock).length >= 19, "expected sticker art for every catalog glyph");
});
