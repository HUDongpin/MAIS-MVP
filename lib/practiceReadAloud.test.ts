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
  equal(spoken, "Which card has more dots?. Choice 1: 12. Choice 2: 10");
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
});

test("skips empty options and works without any options", () => {
  const spoken = buildPracticeReadAloudText({
    promptText: "Count to five.",
    optionTexts: ["", "  "],
    language: "en"
  });
  equal(spoken, "Count to five.");
});
