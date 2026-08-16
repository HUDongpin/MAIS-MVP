import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/lesson/LessonView.tsx", "utf8");

test("lesson score summary clears the sticky navigation and mobile safe areas without weakening dialog access", () => {
  const modalStart = source.indexOf("{isSummaryOpen && lessonPracticeSummary ? (");
  const modalEnd = source.indexOf("</AnimatePresence>", modalStart);
  assert.ok(modalStart >= 0 && modalEnd > modalStart, "LessonView must keep one bounded score-summary modal.");
  const modal = source.slice(modalStart, modalEnd);

  assert.match(
    source,
    /import \{ createPortal \} from "react-dom";/,
    "The lesson summary must escape the app shell's lower stacking context through a body portal."
  );
  assert.match(
    source,
    /createPortal\(children, document\.body\)/,
    "The mounted summary layer must share the root stacking context with global overlays."
  );
  assert.match(
    source,
    /if \(!mounted\) return null;/,
    "The body portal must wait for client mount instead of reading document during SSR."
  );
  assert.doesNotMatch(
    source,
    /isSummaryOpen \? "z-\[[^\]]+\]" : ""/,
    "Raising the isolated LessonView cannot outrank root-level AI Tutor and Nova overlays."
  );
  assert.match(
    modal,
    /px-4 pb-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\] pt-\[calc\(5rem\+env\(safe-area-inset-top\)\)\]/,
    "The overlay must reserve the 4rem navbar, a 1rem hit-target gap, and both safe areas."
  );
  assert.match(
    modal,
    /max-h-\[calc\(100dvh-6rem-env\(safe-area-inset-top\)-env\(safe-area-inset-bottom\)\)\]/,
    "The scrollable report must remain bounded by the reduced visual-viewport budget."
  );
  assert.doesNotMatch(modal, /max-h-\[calc\(100dvh-2rem\)\]/);

  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /ref=\{summaryCloseButtonRef\}/);
  assert.match(modal, /aria-label=\{t\(\{ en: "Close lesson summary", zh: "關閉課節摘要", zhHans: "关闭课时摘要" \}\)\}/);
  assert.match(modal, /min-h-11 min-w-11/, "The close control must keep a 44px pointer target.");
  assert.match(source, /summaryCloseButtonRef\.current\?\.focus\(\)/);
  assert.match(source, /if \(event\.key === "Escape"\) setIsSummaryOpen\(false\)/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
});
