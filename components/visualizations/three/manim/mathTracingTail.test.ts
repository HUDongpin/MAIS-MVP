import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  appendTracingTailSample,
  buildTracingTailEvidence,
  buildTracingTailFromPoints,
  createTracingTailBuffer,
  serializeTracingTailEvidencePayload,
  TRACING_TAIL_SOURCE_CONTRACT,
  tracingTailEvidenceDataAttributes,
  visibleTracingTailSamples
} from "./mathTracingTail";

test("stores recent traced points in an immutable fixed-capacity ring buffer", () => {
  const empty = createTracingTailBuffer("probe-tail", 3);
  const one = appendTracingTailSample(empty, [0, 0, 0], 0);
  const two = appendTracingTailSample(one, [1, 0, 0], 1);
  const three = appendTracingTailSample(two, [2, 0, 0], 2);
  const four = appendTracingTailSample(three, [3, 0, 0], 3);

  assert.equal(empty.entries.length, 0);
  assert.equal(four.capacity, 3);
  assert.equal(four.entries.length, 3);
  assert.deepEqual(four.entries.map((entry) => entry.point), [
    [1, 0, 0],
    [2, 0, 0],
    [3, 0, 0]
  ]);
  assert.deepEqual(three.entries.map((entry) => entry.point), [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0]
  ]);
});

test("filters visible tracing tail samples by duration and grades opacity and stroke width", () => {
  const buffer = [
    [[0, 0, 0], 0],
    [[1, 0, 0], 1],
    [[2, 0, 0], 2],
    [[3, 0, 0], 3]
  ].reduce(
    (current, [point, timestamp]) => appendTracingTailSample(current, point as [number, number, number], timestamp as number),
    createTracingTailBuffer("probe-tail", 8)
  );
  const visible = visibleTracingTailSamples(buffer, {
    durationSeconds: 2,
    maxOpacity: 0.8,
    maxStrokeWidth: 4,
    minOpacity: 0.1,
    minStrokeWidth: 1,
    nowSeconds: 3
  });

  assert.deepEqual(visible.map((sample) => sample.point), [
    [1, 0, 0],
    [2, 0, 0],
    [3, 0, 0]
  ]);
  assert.deepEqual(visible.map((sample) => Number(sample.opacity.toFixed(3))), [0.1, 0.45, 0.8]);
  assert.deepEqual(visible.map((sample) => Number(sample.strokeWidth.toFixed(3))), [1, 2.5, 4]);
  assert.deepEqual(visible.map((sample) => Number(sample.normalizedAge.toFixed(3))), [1, 0.5, 0]);
});

test("builds a TracingTail descriptor from existing path-window points for runtime traces", () => {
  const tail = buildTracingTailFromPoints({
    durationSeconds: 1.2,
    id: "probe-trace",
    maxSampleCount: 4,
    nowSeconds: 6,
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      [4, 0, 0],
      [5, 0, 0]
    ]
  });

  assert.equal(tail.id, "probe-trace");
  assert.equal(tail.buffer.capacity, 4);
  assert.deepEqual(tail.points, [
    [2, 0, 0],
    [3, 0, 0],
    [4, 0, 0],
    [5, 0, 0]
  ]);
  assert.equal(tail.samples.at(-1)?.opacity, tail.style.maxOpacity);
  assert.equal(tail.samples[0].strokeWidth, tail.style.minStrokeWidth);
});

test("sanitizes non-finite points before they enter the tracing tail", () => {
  const buffer = appendTracingTailSample(createTracingTailBuffer("probe-tail", 3), [Number.NaN, 1, 2], 0);

  assert.deepEqual(buffer.entries[0].point, [0, 1, 2]);
});

test("summarizes TracedPath and TracingTail evidence for browser QA", () => {
  const tail = buildTracingTailFromPoints({
    durationSeconds: 1.2,
    id: "probe-trace",
    maxSampleCount: 4,
    nowSeconds: 6,
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      [4, 0, 0],
      [5, 0, 0]
    ]
  });
  const evidence = buildTracingTailEvidence([
    {
      descriptor: tail,
      durationSeconds: 1.2,
      sourceObjectId: "moving-probe"
    }
  ]);
  const attributes = tracingTailEvidenceDataAttributes(evidence);

  assert.equal(evidence.tailCount, 1);
  assert.equal(evidence.tailIds, "probe-trace");
  assert.equal(evidence.sourceObjectIds, "moving-probe");
  assert.equal(evidence.sampleCount, 4);
  assert.equal(evidence.finiteSampleCount, 4);
  assert.equal(evidence.bufferCapacity, 4);
  assert.equal(evidence.bufferPolicySummary, "probe-trace=fixed-capacity:4:last-4");
  assert.equal(evidence.durationSummary, "probe-trace=1.200s");
  assert.equal(evidence.fillRatioSummary, "probe-trace=4/4=1.000");
  assert.equal(evidence.gradientMonotonic, true);
  assert.equal(evidence.gradientDirectionSummary, "probe-trace=opacity:nondecreasing;stroke:nondecreasing;fresh=max");
  assert.equal(evidence.gradientSummary, "probe-trace:opacity=0.120..0.720:stroke=1.000..3.500:fresh=max");
  assert.equal(evidence.stalePointSummary, "probe-trace=2.000,0.000,0.000");
  assert.equal(evidence.freshPointSummary, "probe-trace=5.000,0.000,0.000");
  assert.equal(evidence.opacityRange, "0.120..0.720");
  assert.equal(evidence.strokeWidthRange, "1.000..3.500");
  assert.equal(evidence.ageRange, "0.000..1.200");
  assert.equal(evidence.timestampRange, "4.800..6.000");
  assert.equal(evidence.sampleCadenceSummary, "probe-trace=0.400,0.400,0.400");
  assert.equal(evidence.sampleTimeOrderSummary, "probe-trace=monotonic:4");
  assert.equal(evidence.tracedPointSourceSummary, "probe-trace<-moving-probe");
  assert.equal(evidence.sourceContract, TRACING_TAIL_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "tracingTail:tails=1:samples=4:finite=4:capacity=4:ids=probe-trace:sources=moving-probe:age=0.000..1.200:opacity=0.120..0.720:stroke=1.000..3.500"
  );
  assert.equal(attributes["data-viz-manim-tracing-tail-source-contract"], TRACING_TAIL_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tracing-tail-count"], "1");
  assert.equal(attributes["data-viz-manim-tracing-tail-ids"], "probe-trace");
  assert.equal(attributes["data-viz-manim-tracing-tail-source-ids"], "moving-probe");
  assert.equal(attributes["data-viz-manim-tracing-tail-buffer-policy-summary"], evidence.bufferPolicySummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-fill-ratio-summary"], evidence.fillRatioSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-gradient-monotonic"], "true");
  assert.equal(attributes["data-viz-manim-tracing-tail-gradient-direction-summary"], evidence.gradientDirectionSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-gradient-summary"], evidence.gradientSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-stale-point-summary"], evidence.stalePointSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-fresh-point-summary"], evidence.freshPointSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-timestamp-range"], evidence.timestampRange);
  assert.equal(attributes["data-viz-manim-tracing-tail-sample-cadence-summary"], evidence.sampleCadenceSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-sample-time-order-summary"], evidence.sampleTimeOrderSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-traced-point-source-summary"], evidence.tracedPointSourceSummary);
  assert.equal(attributes["data-viz-manim-tracing-tail-summary"], evidence.summary);
});

test("serializes TracingTail entries and samples as deterministic script-safe browser QA JSON", () => {
  const tail = buildTracingTailFromPoints({
    durationSeconds: 1.2,
    id: "probe<script>-trace",
    maxSampleCount: 3,
    nowSeconds: 6,
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0]
    ]
  });
  const entries = [
    {
      descriptor: tail,
      durationSeconds: 1.2,
      sourceObjectId: "moving<script>-probe"
    }
  ];
  const json = serializeTracingTailEvidencePayload(entries);
  const parsed = JSON.parse(json) as ReturnType<typeof buildTracingTailEvidence> & {
    entries: typeof entries;
  };

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.tailCount, 1);
  assert.equal(parsed.tailIds, "probe<script>-trace");
  assert.equal(parsed.sourceObjectIds, "moving<script>-probe");
  assert.equal(parsed.sampleCount, 3);
  assert.equal(parsed.entries[0].sourceObjectId, "moving<script>-probe");
  assert.equal(parsed.entries[0].descriptor.id, "probe<script>-trace");
  assert.deepEqual(parsed.entries[0].descriptor.points, [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0]
  ]);
  assert.equal(parsed.entries[0].descriptor.samples.at(-1)?.opacity, parsed.entries[0].descriptor.style.maxOpacity);
});

test("TracingTail stays pure and updater registry consumes it for trace-recent-path", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathTracingTail.ts", "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildTracingTailEvidenceEntriesForScene/);
  assert.match(source, /serializeTracingTailEvidencePayload/);
  assert.match(source, /TRACING_TAIL_SOURCE_CONTRACT/);
  assert.match(updaterSource, /buildTracingTailFromPoints/);
});
