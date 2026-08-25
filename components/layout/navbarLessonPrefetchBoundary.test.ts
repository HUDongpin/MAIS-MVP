import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const navbarSource = readFileSync(
  join(process.cwd(), "components/layout/Navbar.tsx"),
  "utf8",
);

function signedInWarmupEffect(source: string) {
  const start = source.indexOf(
    "// Only warm the workspace routes for signed-in users.",
  );
  const end = source.indexOf("const handleLogout", start);

  assert.ok(
    start >= 0,
    "Navbar signed-in warmup effect must remain explicit and reviewable.",
  );
  assert.ok(
    end > start,
    "Navbar signed-in warmup effect must end before logout handling.",
  );
  return source.slice(start, end);
}

test("Navbar keeps dynamic lesson and visualization navigation click-only", () => {
  const warmupEffect = signedInWarmupEffect(navbarSource);

  assert.doesNotMatch(
    warmupEffect,
    /\blessonHref\b/,
    "Navbar must not race lesson navigation by warming the current student's dynamic direct-lesson href.",
  );
  assert.match(
    navbarSource,
    /\{ key: "lesson", href: lessonHref,/,
    "Removing the warmup must not remove the learner's lesson navigation target.",
  );
  assert.doesNotMatch(
    warmupEffect,
    /\bstudentVisualizationToolsPath\b/,
    "Navbar must not warm the dynamic visualization directory before the learner clicks it.",
  );
  assert.match(
    navbarSource,
    /\{ key: "visualization-lab", href: studentVisualizationToolsPath,/,
    "Removing the warmup must not remove the Visualization Lab navigation target.",
  );
  const clickOnlyPrimaryLinkCopies = navbarSource.match(
    /<Link\s+key=\{item\.key\}\s+href=\{item\.href\}\s+prefetch=\{false\}/g,
  );
  assert.equal(
    clickOnlyPrimaryLinkCopies?.length,
    2,
    "Desktop and mobile primary navigation must both keep prefetch disabled.",
  );
  assert.match(warmupEffect, /"\/personalized-learning"/);
  assert.match(warmupEffect, /practiceHref/);
});
