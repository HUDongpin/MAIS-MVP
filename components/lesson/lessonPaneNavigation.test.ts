import assert from "node:assert/strict";
import test from "node:test";
import {
  createLessonContentPaneScrollRequest,
  createLessonTargetViewportRealignment
} from "@/components/lesson/lessonPaneNavigation";

test("desktop lesson jumps calculate a right-content-pane-local scroll request", () => {
  assert.deepEqual(
    createLessonContentPaneScrollRequest({
      currentScrollTop: 120,
      paneTop: 200,
      prefersReducedMotion: false,
      targetTop: 760,
      topPadding: 24
    }),
    { behavior: "smooth", top: 656 }
  );
});

test("lesson pane jumps clamp above-pane targets to a non-negative scrollTop", () => {
  assert.deepEqual(
    createLessonContentPaneScrollRequest({
      currentScrollTop: 10,
      paneTop: 200,
      prefersReducedMotion: false,
      targetTop: 100,
      topPadding: 24
    }),
    { behavior: "smooth", top: 0 }
  );
});

test("lesson pane jumps disable animation for reduced motion", () => {
  assert.deepEqual(
    createLessonContentPaneScrollRequest({
      currentScrollTop: 80,
      paneTop: 100,
      prefersReducedMotion: true,
      targetTop: 500,
      topPadding: 20
    }),
    { behavior: "auto", top: 460 }
  );
});

test("lesson pane jumps are a no-op when the requested target is missing", () => {
  assert.equal(
    createLessonContentPaneScrollRequest({
      currentScrollTop: 80,
      paneTop: 100,
      prefersReducedMotion: false,
      targetTop: null,
      topPadding: 20
    }),
    null
  );
});

test("mobile lesson jumps realign after content above the target grows", () => {
  assert.equal(
    createLessonTargetViewportRealignment({
      safeTop: 96,
      targetTop: 112,
      viewportHeight: 844
    }),
    null,
    "The initial jump must not keep scrolling while the target heading is safely visible."
  );

  assert.deepEqual(
    createLessonTargetViewportRealignment({
      safeTop: 96,
      targetTop: 920,
      viewportHeight: 844
    }),
    { behavior: "auto", block: "start" },
    "A ResizeObserver pass must restore the target after an earlier panel expands and pushes it below the viewport."
  );

  assert.equal(
    createLessonTargetViewportRealignment({
      safeTop: 96,
      targetTop: 95.5,
      viewportHeight: 844
    }),
    null,
    "Sub-pixel layout rounding near the safe edge must not create repeated corrections."
  );
});
