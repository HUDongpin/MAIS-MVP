import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCaliforniaCanvasGraphicsSourceContract } from
  "./california-canvas-graphics-source-contract";

const source = (benchId: string) =>
  readFileSync(`components/visualizations/signature/${benchId}.jsx`, "utf8");

test("K2 Canvas benches separate paper decoration from strengthened mathematical marks", () => {
  const contract = buildCaliforniaCanvasGraphicsSourceContract(process.cwd());
  const sitesFor = (benchId: string) => contract.paintSites.filter((site) => site.benchId === benchId);

  for (const benchId of [
    "LengthComparisonLab",
    "SortLab",
    "PositionLab",
    "ShapesLab",
    "ComposingShapesLab"
  ]) {
    const sites = sitesFor(benchId);
    assert.ok(sites.some((site) => site.role === "essential"), `${benchId} must retain essential marks`);
    assert.ok(sites.some((site) => site.role === "decorative"), `${benchId} must classify paper decoration`);
    for (const site of sites.filter((candidate) =>
      candidate.paintExpression?.includes("199,216,228")
    )) {
      assert.equal(site.role, "decorative", `${site.sourceSiteKey} is quadrille-paper decoration`);
    }
  }

  const length = source("LengthComparisonLab");
  assert.match(length, /const GOLD = '#74520b';/i);
  assert.match(length, /const OK = '#176248';/i);
  assert.match(length, /the gold start line[\s\S]{0,160}ctx\.lineWidth = 4;/);
  assert.match(length, /\.btn:disabled \{[\s\S]{0,80}opacity: 1;/);
  assert.match(length, /\.dial\.locked \{[\s\S]{0,40}opacity: 1;/);
  assert.match(length, /\.choice\.dim \{[\s\S]{0,40}opacity: 1;/);

  const sort = source("SortLab");
  assert.match(sort, /ctx\.strokeStyle = isFocus \|\| isMost \? CARMINE : INK_SOFT;/);
  assert.match(sort, /ctx\.lineWidth = 3\.2;[\s\S]{0,100}ctx\.strokeStyle = p\.stroke;/);
  assert.match(sort, /blue: \{ fill: '#4a83bd', stroke: '#10263a'/i);
  assert.match(sort, /yellow: \{ fill: '#eab63f', stroke: '#3b2600'/i);
  assert.match(sort, /green: \{ fill: '#46b184', stroke: '#082218'/i);
  assert.match(sort, /const terminalLabels = \[\];/);
  assert.match(sort, /for \(const drawTerminalLabel of terminalLabels\) drawTerminalLabel\(\);/);
  assert.doesNotMatch(sort, /pick below or click an object/);
  assert.match(sort, /\.hint \{[\s\S]{0,260}background: #fbfbf8;[\s\S]{0,100}border: 1px solid #c7d0d7;/);
  assert.match(sort, /\.seg\.locked \{[\s\S]{0,60}opacity: 1;/);
  assert.match(sort, /\.btn:disabled \{[\s\S]{0,60}opacity: 1;/);
  assert.match(sort, /\.choice\.dim \{[\s\S]{0,40}opacity: 1;/);

  const position = source("PositionLab");
  assert.match(position, /const BALL_EDGE = '#07131f';/i);
  assert.match(position, /ctx\.lineWidth = 3\.2;[\s\S]{0,100}ctx\.strokeStyle = BALL_EDGE;/);
  assert.match(position, /\.dial\.locked \{ opacity: 1; \}/);
  assert.match(position, /\.btn:disabled \{[\s\S]{0,40}opacity: 1;/);
  assert.match(position, /\.choice\.dim \{[\s\S]{0,40}opacity: 1;/);

  const shapes = source("ShapesLab");
  const getContextIndex = shapes.indexOf("const ctx = cv.getContext('2d');");
  const resizeGuardIndex = shapes.indexOf("if (cv.width !== Math.round(W * dpr)");
  assert.ok(
    resizeGuardIndex >= 0 && getContextIndex > resizeGuardIndex,
    "ShapesLab must size the Canvas before the graphics runtime registers its 2-D context"
  );
  assert.match(shapes, /const iMinX = Math\.ceil\(-cx \/ scale\);/);
  assert.match(shapes, /const iMaxX = Math\.floor\(\(W - cx\) \/ scale\);/);
  assert.match(shapes, /\.dial\.locked,[\s\S]{0,80}opacity: 1;/);
  assert.match(shapes, /\.btn:disabled \{[\s\S]{0,40}opacity: 1;/);
  assert.match(shapes, /\.choice\.dim \{[\s\S]{0,40}opacity: 1;/);

  const composing = source("ComposingShapesLab");
  assert.match(composing, /const SEAM = '#445565';/);
  assert.match(composing, /ctx\.lineWidth = 2\.4;[\s\S]{0,100}ctx\.strokeStyle = SEAM;/);
  assert.match(composing, /ctx\.strokeStyle = isWhole \? CARMINE : INK_SOFT;/);
  assert.match(composing, /function seamEdgesOf\(list\)/);
  assert.match(composing, /entry\.owners\.size > 1/);
  assert.match(composing, /if \(!g\.joined \|\| !g\.seamEdges\.length\) continue;/);
  assert.match(composing, /\.hint \{[\s\S]{0,220}background: #fbfbf8;[\s\S]{0,100}border: 1px solid #c7d0d7;/);
  assert.match(composing, /\.block\.locked \{[\s\S]{0,40}opacity: 1;/);
  assert.match(composing, /\.btn:disabled \{[\s\S]{0,40}opacity: 1;/);
  assert.match(composing, /\.choice\.dim \{[\s\S]{0,40}opacity: 1;/);
});
