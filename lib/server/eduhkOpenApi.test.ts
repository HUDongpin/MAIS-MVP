import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEduHKChatCompletionsUrl,
  buildEduHKOpenApiRequestBody,
  extractEduHKOpenApiReply,
  missingEduHKQuestionGeneratorEnv,
  parseEduHKGeneratedQuestionReply,
  readEduHKQuestionGeneratorConfig
} from "./eduhkOpenApi";

test("EdUHK endpoint builder accepts base URLs and full endpoint URLs", () => {
  assert.equal(
    buildEduHKChatCompletionsUrl("https://example.edu.hk"),
    "https://example.edu.hk/api/v1/chat/completions"
  );
  assert.equal(
    buildEduHKChatCompletionsUrl("https://example.edu.hk/"),
    "https://example.edu.hk/api/v1/chat/completions"
  );
  assert.equal(
    buildEduHKChatCompletionsUrl("https://example.edu.hk/api/v1/chat/completions"),
    "https://example.edu.hk/api/v1/chat/completions"
  );
});

test("EdUHK request body matches the prior app gateway contract", () => {
  assert.deepEqual(
    buildEduHKOpenApiRequestBody({
      appId: "app-1",
      chatId: "teacher-1",
      messages: [{ role: "user", content: "prompt" }]
    }),
    {
      appId: "app-1",
      stream: false,
      detail: false,
      chatId: "teacher-1",
      messages: [{ role: "user", content: "prompt" }]
    }
  );
});

test("EdUHK config reader keeps primary and secondary app env names separate", () => {
  const env = {
    EDUHK_LLM_BASE_URL: "https://example.edu.hk",
    EDUHK_ITEM_GENERATE_APP_ID: "app-1",
    EDUHK_ITEM_GENERATE_API_KEY: "key-1",
    EDUHK_ITEM_GENERATE_APP_ID_2: "app-2",
    EDUHK_ITEM_GENERATE_API_KEY_2: "key-2",
    EDUHK_LLM_PROVIDER_TIMEOUT_MS: "45000"
  };

  assert.deepEqual(readEduHKQuestionGeneratorConfig("primary", env), {
    baseUrl: "https://example.edu.hk",
    appId: "app-1",
    apiKey: "key-1",
    timeoutMs: 45000
  });
  assert.deepEqual(readEduHKQuestionGeneratorConfig("secondary", env), {
    baseUrl: "https://example.edu.hk",
    appId: "app-2",
    apiKey: "key-2",
    timeoutMs: 45000
  });
  assert.deepEqual(
    missingEduHKQuestionGeneratorEnv({ timeoutMs: 30000 }, "secondary"),
    ["EDUHK_LLM_BASE_URL", "EDUHK_ITEM_GENERATE_APP_ID_2", "EDUHK_ITEM_GENERATE_API_KEY_2"]
  );
});

test("EdUHK reply extraction handles chat-completion-shaped responses", () => {
  assert.equal(
    extractEduHKOpenApiReply({
      choices: [{ message: { content: "  Q~~~@@@~~~A~~~@@@~~~QE~~~@@@~~~AE  " } }]
    }),
    "Q~~~@@@~~~A~~~@@@~~~QE~~~@@@~~~AE"
  );
  assert.equal(
    extractEduHKOpenApiReply(JSON.stringify({ data: { text: "raw text" } })),
    "raw text"
  );
});

test("EdUHK generated question parser preserves the four expected fields", () => {
  assert.deepEqual(
    parseEduHKGeneratedQuestionReply("題目~~~@@@~~~答案~~~@@@~~~Question~~~@@@~~~Answer"),
    {
      question: "題目",
      answer: "答案",
      questionEn: "Question",
      answerEn: "Answer"
    }
  );
  assert.throws(
    () => parseEduHKGeneratedQuestionReply("題目~~~@@@~~~答案"),
    /EDUHK_LLM_FORMAT_ERROR/
  );
});
