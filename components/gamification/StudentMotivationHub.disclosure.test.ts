import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = readFileSync(join(process.cwd(), "components/gamification/StudentMotivationHub.tsx"), "utf8");

test("StudentMotivationHub keeps motivation details behind a collapsed disclosure shell", () => {
  const detailsIndex = source.indexOf("<details");
  const summaryIndex = source.indexOf("<summary");
  const contentIndex = source.indexOf("id={expandedContentId}");
  const questsIndex = source.indexOf("Daily quests");
  const badgesIndex = source.indexOf('en: "Badges"');

  assert.ok(detailsIndex >= 0, "expected a details disclosure wrapper");
  assert.ok(summaryIndex > detailsIndex, "expected a summary trigger inside the disclosure");
  assert.ok(source.includes("Open motivation hub"), "expected collapsed open copy");
  assert.ok(source.includes("Hide motivation hub"), "expected expanded hide copy");
  assert.ok(contentIndex > summaryIndex, "expected expanded content after the summary trigger");
  assert.ok(questsIndex > contentIndex, "expected daily quests to render inside expanded content");
  assert.ok(badgesIndex > contentIndex, "expected badges to render inside expanded content");
});
