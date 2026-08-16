import assert from "node:assert/strict";
import test from "node:test";
import { createLessonContentPaneScrollRequest } from "@/components/lesson/lessonPaneNavigation";

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
