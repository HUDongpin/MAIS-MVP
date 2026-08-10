import { equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { buildPracticeReadAloudText, practiceReadAloudLanguageCode } from "./practiceReadAloud";

test("maps UI languages to spoken language codes", () => {
  equal(practiceReadAloudLanguageCode("en"), "en-US");
  equal(practiceReadAloudLanguageCode("zh"), "zh-HK");
  equal(practiceReadAloudLanguageCode("zh-Hans"), "zh-CN");
});

test("builds English utterances with numbered choices", () => {
  const spoken = buildPracticeReadAloudText({
    promptText: "Which card has more dots?",
    optionTexts: ["12", "10"],
    language: "en"
  });
  equal(spoken, "Which card has more dots? Choice 1: 12. Choice 2: 10.");
});

test("reads the mathematical diagram before the answer choices", () => {
  const spoken = buildPracticeReadAloudText({
    promptText: "How many counters are shown?",
    diagramText: "A ten-frame with 2 red counters and 3 blue counters.",
    optionTexts: ["4", "5"],
    language: "en"
  });

  equal(
    spoken,
    "How many counters are shown? Diagram: A ten-frame with 2 red counters and 3 blue counters. Choice 1: 4. Choice 2: 5."
  );
});

test("builds Chinese utterances with Chinese ordinals and full-width punctuation", () => {
  const traditional = buildPracticeReadAloudText({
    promptText: "哪張卡的點較多？",
    optionTexts: ["12", "10"],
    language: "zh"
  });
  ok(traditional.includes("選項一：12"));
  ok(traditional.includes("選項二：10"));

  const simplified = buildPracticeReadAloudText({
    promptText: "哪张卡的点较多？",
    optionTexts: ["12"],
    language: "zh-Hans"
  });
  ok(simplified.includes("选项一：12"));

  const diagram = buildPracticeReadAloudText({
    promptText: "共有多少個計數片？",
    diagramText: "十格陣，內有 5 個計數片。",
    optionTexts: [],
    language: "zh"
  });
  ok(diagram.includes("圖示：十格陣"));
});

test("skips empty options and works without any options", () => {
  const spoken = buildPracticeReadAloudText({
    promptText: "Count to five.",
    optionTexts: ["", "  "],
    language: "en"
  });
  equal(spoken, "Count to five.");
});
