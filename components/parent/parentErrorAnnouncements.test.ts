import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Every failure the parent console can surface is written into a single `message`
 * state and rendered as a red paragraph. Those paragraphs carried no ARIA role, so
 * a parent using a screen reader got no signal at all that sending a message,
 * sending a reply, or linking a child had failed — the form simply appeared to do
 * nothing.
 *
 * `app/login/page.tsx` already renders its form errors as `<p role="alert">`; this
 * keeps the parent console to the same convention.
 *
 * The assertions are on source rather than a render because this repo's component
 * gate runs `node --test` over plain modules with no DOM harness — and the defect
 * is in the markup, which is exactly what source can see.
 */

const parentViewsSource = readFileSync(
  join(process.cwd(), "components", "parent", "ParentViews.tsx"),
  "utf8"
);

const errorParagraph = /<p role="alert" className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">\{message\}<\/p>/g;

test("every parent console error paragraph is announced", () => {
  const announced = parentViewsSource.match(errorParagraph) ?? [];
  assert.equal(
    announced.length,
    2,
    "both parent error surfaces (message compose/reply, and connect child) must render role=\"alert\""
  );
});

test("no parent error paragraph renders without an alert role", () => {
  // Catches a third surface being added later in the same un-announced shape.
  const unannounced = parentViewsSource.match(
    /<p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">\{message\}<\/p>/g
  );
  assert.equal(
    unannounced,
    null,
    "found a parent error paragraph with no role=\"alert\""
  );
});

test("every failure path writes into an announced message channel", () => {
  // The three failures a parent can actually hit. If a new setMessage failure is
  // added, this count moves and the author has to confirm it renders announced.
  const failures = [
    "Could not send this parent message.",
    "Could not send reply.",
    "Invite code could not be linked."
  ];
  for (const failure of failures) {
    assert.ok(
      parentViewsSource.includes(failure),
      `expected failure copy to still exist: ${failure}`
    );
  }

  const setMessageCalls = parentViewsSource.match(/setMessage\(t\(\{/g) ?? [];
  assert.equal(
    setMessageCalls.length,
    failures.length,
    "a setMessage failure path was added or removed — confirm it renders through an announced paragraph"
  );
});

test("the parent console matches the login form's error convention", () => {
  const loginSource = readFileSync(join(process.cwd(), "app", "login", "page.tsx"), "utf8");
  assert.match(
    loginSource,
    /<p role="alert"/,
    "login page is the convention this suite anchors to; if it changed, revisit the parent console too"
  );
});
