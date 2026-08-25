import assert from "node:assert/strict";
import test from "node:test";
import { hasCompletedVisualizationGuidedTimeline } from "./GuestLoginPromptGate";

function timeline(progress: string | null, stepCount: string | null) {
  const attributes = new Map<string, string>();
  if (progress !== null) attributes.set("data-viz-manim-timeline-progress", progress);
  if (stepCount !== null) attributes.set("data-viz-manim-timeline-step-count", stepCount);
  return {
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    }
  } as HTMLElement;
}

function rootWith(...timelines: HTMLElement[]) {
  return {
    querySelectorAll() {
      return timelines as unknown as NodeListOf<HTMLElement>;
    }
  } as Pick<Document, "querySelectorAll">;
}

test("recognizes completion on any bounded guided timeline", () => {
  assert.equal(
    hasCompletedVisualizationGuidedTimeline(
      rootWith(timeline("0.400", "5"), timeline("1.000", "6"))
    ),
    true
  );
});

test("does not mistake missing, invalid, or primitive timeline data for completion", () => {
  assert.equal(hasCompletedVisualizationGuidedTimeline(rootWith()), false);
  assert.equal(hasCompletedVisualizationGuidedTimeline(rootWith(timeline(null, null))), false);
  assert.equal(hasCompletedVisualizationGuidedTimeline(rootWith(timeline("1", "0"))), false);
  assert.equal(hasCompletedVisualizationGuidedTimeline(rootWith(timeline("not-a-number", "6"))), false);
  assert.equal(hasCompletedVisualizationGuidedTimeline(rootWith(timeline("0.998", "6"))), false);
});
