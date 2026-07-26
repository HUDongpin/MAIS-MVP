import assert from "node:assert/strict";
import test from "node:test";

import { firstVisibleFocusTarget } from "@/components/lesson/worlds/lessonMenuVisibility";

/**
 * Stand-in for a DOM element: the only thing the focus chooser asks of a
 * candidate is whether it occupies space, so a fake with `getClientRects` is
 * enough to exercise the choice without a browser.
 */
function element(name: string, { onScreen }: { onScreen: boolean }) {
  return {
    name,
    getClientRects: () => (onScreen ? [{}] : [])
  } as unknown as HTMLElement & { name: string };
}

function lookup(map: Record<string, ReturnType<typeof element>[]>) {
  return (id: string) => map[id] ?? [];
}

test("focus skips a hidden duplicate and lands on the on-screen copy of the same id", () => {
  // React's streaming SSR can leave a second, hidden copy of a control in the
  // document. getElementById would return whichever sorts first — here the
  // hidden one — and the keyboard user would be stranded on the control that
  // just disappeared.
  const hiddenCopy = element("hide-ssr-copy", { onScreen: false });
  const visibleCopy = element("hide-real", { onScreen: true });

  const target = firstVisibleFocusTarget(
    ["lesson-world-menu-hide"],
    lookup({ "lesson-world-menu-hide": [hiddenCopy, visibleCopy] })
  );

  assert.equal(target, visibleCopy, "should focus the copy that is actually on screen");
});

test("focus falls through to the next control when the first is off-screen at this width", () => {
  // The rail is the wide-screen affordance and the pill the narrow one; only
  // one of them occupies space at any given viewport.
  const rail = element("rail", { onScreen: false });
  const pill = element("pill", { onScreen: true });

  const target = firstVisibleFocusTarget(
    ["lesson-world-menu-rail", "lesson-world-menu-pill"],
    lookup({ "lesson-world-menu-rail": [rail], "lesson-world-menu-pill": [pill] })
  );

  assert.equal(target, pill);
});

test("focus prefers the earlier id when both controls are on screen", () => {
  const rail = element("rail", { onScreen: true });
  const pill = element("pill", { onScreen: true });

  const target = firstVisibleFocusTarget(
    ["lesson-world-menu-rail", "lesson-world-menu-pill"],
    lookup({ "lesson-world-menu-rail": [rail], "lesson-world-menu-pill": [pill] })
  );

  assert.equal(target, rail, "id order encodes the preference");
});

test("focus returns null rather than focusing something invisible", () => {
  const target = firstVisibleFocusTarget(
    ["lesson-world-menu-rail", "lesson-world-menu-pill"],
    lookup({
      "lesson-world-menu-rail": [element("rail", { onScreen: false })],
      "lesson-world-menu-pill": [element("pill", { onScreen: false })]
    })
  );

  assert.equal(target, null);
});

test("focus handles an id with no matching element at all", () => {
  const target = firstVisibleFocusTarget(["lesson-world-menu-hide"], lookup({}));
  assert.equal(target, null);
});
