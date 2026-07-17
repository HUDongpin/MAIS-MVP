import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
import { test } from "node:test";

const shellSource = readFileSync(
  join(process.cwd(), "components/practice/PracticeAdventureArenaShell.tsx"),
  "utf8"
);

test("omits the old Practice Arena stats sidebar labels", () => {
  for (const sidebarLabel of ["Current Streak", "Keep it going!", "Accuracy"]) {
    ok(!shellSource.includes(sidebarLabel), `Expected PracticeAdventureArenaShell to omit ${sidebarLabel}`);
  }
});

test("omits the hero Choose Topic button label", () => {
  ok(!shellSource.includes("Choose Topic"), "Expected PracticeAdventureArenaShell to omit the hero Choose Topic button");
});

test("centers the remaining hero Start Mission button", () => {
  ok(
    shellSource.includes('className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"'),
    "Expected the hero CTA row to center the remaining Start Mission button"
  );
});

test("omits the Practice Arena grade selector panel", () => {
  for (const gradeSelectorText of ["Select Grade", "Primary", "Secondary", "role=\"radiogroup\""]) {
    ok(!shellSource.includes(gradeSelectorText), `Expected PracticeAdventureArenaShell to omit ${gradeSelectorText}`);
  }
});

test("omits the Topic Missions panel", () => {
  for (const topicMissionsText of ["Topic Missions", "adventure-topic-missions", "View all"]) {
    ok(!shellSource.includes(topicMissionsText), `Expected PracticeAdventureArenaShell to omit ${topicMissionsText}`);
  }
});
