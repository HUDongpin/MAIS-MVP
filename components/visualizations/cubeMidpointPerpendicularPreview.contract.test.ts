import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const clientPath = path.join(
  repoRoot,
  "components/visualizations/CubeMidpointPerpendicularLab.tsx",
);
const pagePath = path.join(
  repoRoot,
  "app/visualization-lab/cube-midpoint-perpendicular/page.tsx",
);

test("the proof preview has a server exact boundary and a client-only scene consumer", () => {
  assert.equal(fs.existsSync(clientPath), true, "the focused learner preview must exist");
  assert.equal(fs.existsSync(pagePath), true, "the focused preview route must exist");

  const client = fs.readFileSync(clientPath, "utf8");
  const page = fs.readFileSync(pagePath, "utf8");

  assert.match(client, /^"use client";/);
  assert.doesNotMatch(client, /\.server(?:["'])/);
  assert.doesNotMatch(client, /@cortex-js\/compute-engine/);
  assert.match(client, /buildCubeMidpointPerpendicularScene/);
  assert.match(client, /runtime="mais-manim"/);
  assert.match(client, /presentation="learner"/);
  assert.match(page, /buildCubeMidpointPerpendicularProof/);
  assert.match(page, /CubeMidpointPerpendicularLab/);
  assert.match(page, /initialLocale=/);
});

test("the preview contract exposes three subtitle languages and synchronized timeline captions", () => {
  const client = fs.readFileSync(clientPath, "utf8");

  assert.match(client, /const LOCALES[\s\S]*"en"[\s\S]*"zh-CN"[\s\S]*"zh-HK"/);
  assert.match(client, /data-cube-proof-locale/);
  assert.match(client, /data-cube-proof-active-caption/);
  assert.match(client, /data-cube-proof-caption-index/);
  assert.match(client, /data-viz-manim-timeline-active-step-index/);
  assert.match(client, /MutationObserver/);
  assert.match(client, /aria-live="polite"/);
  assert.match(client, /subtitles:/);
  assert.match(client, /English/);
  assert.match(client, /简体中文/);
  assert.match(client, /繁體中文/);
});

test("the confirmed preview includes reduced motion and excludes audio and video export", () => {
  const client = fs.readFileSync(clientPath, "utf8");
  const page = fs.readFileSync(pagePath, "utf8");
  const source = `${client}\n${page}`;

  assert.match(client, /data-cube-proof-reduced-motion-toggle/);
  assert.match(client, /data-cube-proof-reduced-motion/);
  assert.match(client, /reducedMotion/);
  assert.match(client, /data-cube-proof-reset/);
  assert.match(client, /data-cube-proof-delivery="interactive-preview"/);
  assert.match(client, /data-cube-proof-audio="none"/);
  assert.match(client, /data-cube-proof-video-export="none"/);
  assert.match(client, /motion-reduce:transition-none/);
  assert.match(client, /transition-none duration-0/);
  assert.doesNotMatch(source, /<audio\b|<video\b|MediaRecorder|speechSynthesis|\.webm\b|\.mp4\b/i);
});

test("the focused proof reserves a taller mobile scene frame for the exact formula", () => {
  const client = fs.readFileSync(clientPath, "utf8");

  for (const className of [
    "max-sm:[&_[data-viz-manim-scene-frame]]:aspect-[4/3]",
    "max-sm:[&_[data-viz-manim-formula-overlay]]:!left-3",
    "max-sm:[&_[data-viz-manim-formula-overlay]]:!right-3",
    "max-sm:[&_[data-viz-manim-formula-overlay]]:!w-auto",
    "max-sm:[&_[data-viz-manim-formula-overlay]]:!max-w-none",
    "max-sm:[&_[data-viz-manim-formula-overlay]_.katex]:!text-[0.82em]",
  ]) {
    assert.equal(
      client.includes(className),
      true,
      `${className} must keep the proof formula legible inside the mobile scene`,
    );
  }
});
