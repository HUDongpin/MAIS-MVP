import assert from "node:assert/strict";
import test from "node:test";

import { readAttemptFeedback } from "@/components/practice/readAttemptFeedback";

test("attempt-feedback reader preserves optional Simplified Chinese fields", () => {
  assert.deepEqual(readAttemptFeedback({
    correct: false,
    explanation: {
      en: "Use the matching sides.",
      zh: "使用對應邊。",
      zhHans: "使用对应边。"
    },
    correctAnswer: {
      en: "right",
      zh: "右邊",
      zhHans: "右边"
    }
  }), {
    correct: false,
    explanation: {
      en: "Use the matching sides.",
      zh: "使用對應邊。",
      zhHans: "使用对应边。"
    },
    correctAnswer: {
      en: "right",
      zh: "右邊",
      zhHans: "右边"
    }
  });
});

test("attempt-feedback reader rejects the legacy raw-string answer payload", () => {
  assert.equal(readAttemptFeedback({
    correct: false,
    explanation: { en: "Review the method.", zh: "重溫方法。" },
    correctAnswer: "右边"
  }), null);
});
