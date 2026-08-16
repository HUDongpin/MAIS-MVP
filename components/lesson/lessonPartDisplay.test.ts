import assert from "node:assert/strict";
import test from "node:test";
import { formatLessonPartDisplay } from "./lessonPartDisplay";

test("moves a leading keycap marker behind the left-menu title and removes it from content headings", () => {
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 0, title: "1️⃣ Counting to 120", unitIndex: 1 }),
    {
      contentTitle: "2.1 Counting to 120",
      menuTitle: "2.1 Counting to 120 1️⃣",
      ordinal: "2.1"
    }
  );
});

test("keeps complete emoji graphemes together when moving the marker", () => {
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 1, title: "🏗️ Tens and Ones", unitIndex: 1 }),
    {
      contentTitle: "2.2 Tens and Ones",
      menuTitle: "2.2 Tens and Ones 🏗️",
      ordinal: "2.2"
    }
  );
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 2, title: "👩🏽‍🔬 Compare mixtures", unitIndex: 1 }),
    {
      contentTitle: "2.3 Compare mixtures",
      menuTitle: "2.3 Compare mixtures 👩🏽‍🔬",
      ordinal: "2.3"
    }
  );
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 3, title: "🇭🇰 Place value", unitIndex: 1 }),
    {
      contentTitle: "2.4 Place value",
      menuTitle: "2.4 Place value 🇭🇰",
      ordinal: "2.4"
    }
  );
});

test("numbers titles without a leading cartoon marker", () => {
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 4, title: "Interactive lab", unitIndex: 1 }),
    {
      contentTitle: "2.5 Interactive lab",
      menuTitle: "2.5 Interactive lab",
      ordinal: "2.5"
    }
  );
});

test("moves symbol markers supplied by the existing lesson registry", () => {
  assert.deepEqual(
    formatLessonPartDisplay({ itemIndex: 0, title: "▦ Area models", unitIndex: 2 }),
    {
      contentTitle: "3.1 Area models",
      menuTitle: "3.1 Area models ▦",
      ordinal: "3.1"
    }
  );
});

test("does not mistake ordinary leading numerals or math for cartoon markers", () => {
  for (const title of ["120 chart", "1 + 2 facts", "1/2 as a fraction", "3D shapes", "+ and - facts", "× and ÷ facts"]) {
    const display = formatLessonPartDisplay({ itemIndex: 0, title, unitIndex: 0 });
    assert.equal(display.contentTitle, `1.1 ${title}`);
    assert.equal(display.menuTitle, `1.1 ${title}`);
  }
});
