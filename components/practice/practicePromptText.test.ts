import assert from "node:assert/strict";
import test from "node:test";
import { cleanPracticeQuestionPromptText } from "./practicePromptText";

test("removes generated DeepSeek activity prefixes from Practice Arena prompts", () => {
  assert.equal(
    cleanPracticeQuestionPromptText("Activity 5: DeepSeek practice: A toy store sells 6 toy cars in the morning and 6 toy cars in the afternoon. How many toy cars are sold?"),
    "A toy store sells 6 toy cars in the morning and 6 toy cars in the afternoon. How many toy cars are sold?"
  );

  assert.equal(
    cleanPracticeQuestionPromptText("Practice activity12: DeepSeek practice: What is 54 minus 50?"),
    "What is 54 minus 50?"
  );

  assert.equal(
    cleanPracticeQuestionPromptText("活動 5：DeepSeek 練習：一個盒子裡有 1 個鈕扣。盒子裡有多少個鈕扣？"),
    "一個盒子裡有 1 個鈕扣。盒子裡有多少個鈕扣？"
  );

  assert.equal(
    cleanPracticeQuestionPromptText("活动5：深度求索练习：一个盒子里有 1 个钮扣。盒子里有多少个钮扣？"),
    "一个盒子里有 1 个钮扣。盒子里有多少个钮扣？"
  );

  assert.equal(
    cleanPracticeQuestionPromptText("Activity 5: 写出有8个十和0个一的数。"),
    "写出有8个十和0个一的数。"
  );
});
