import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLLMProviderRequestBody,
  extractLLMProviderReply,
  extractLLMProviderUsage
} from "./llmProvider";

const messages = [
  { role: "system" as const, content: "Tutor rules" },
  { role: "user" as const, content: "Give one hint." }
];

test("DeepSeek request body uses the V4 Pro chat-completion contract", () => {
  const body = buildLLMProviderRequestBody({
    model: "deepseek-v4-pro",
    messages,
    maxTokens: 500,
    provider: "deepseek"
  }) as Record<string, unknown>;

  assert.equal(body.model, "deepseek-v4-pro");
  assert.equal(body.messages, messages);
  assert.deepEqual(body.thinking, { type: "enabled" });
  assert.equal(body.reasoning_effort, "high");
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 500);
  assert.equal("max_completion_tokens" in body, false);
});

test("DeepSeek JSON mode can disable thinking for short structured reranks", () => {
  const body = buildLLMProviderRequestBody({
    model: "deepseek-v4-pro",
    messages,
    maxTokens: 1200,
    provider: "deepseek",
    responseFormat: "json_object",
    deepSeekThinking: "disabled"
  }) as Record<string, unknown>;

  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal("reasoning_effort" in body, false);
  assert.equal(body.max_tokens, 1200);
});

test("OpenAI-compatible request body keeps max_completion_tokens", () => {
  const body = buildLLMProviderRequestBody({
    model: "gpt-4.1-mini",
    messages,
    maxTokens: 400,
    provider: "openai"
  }) as Record<string, unknown>;

  assert.equal(body.model, "gpt-4.1-mini");
  assert.equal(body.max_completion_tokens, 400);
  assert.equal("thinking" in body, false);
  assert.equal("max_tokens" in body, false);
});

test("provider reply extraction accepts string and array content", () => {
  assert.equal(
    extractLLMProviderReply({
      choices: [{ message: { content: "  Final hint text.  " } }]
    }),
    "Final hint text."
  );

  assert.equal(
    extractLLMProviderReply({
      choices: [{
        message: {
          content: [
            { type: "text", text: "First " },
            { content: "second" },
            " third"
          ]
        }
      }]
    }),
    "First second third"
  );

  assert.equal(
    extractLLMProviderReply({
      choices: [{ message: { reasoning_content: "thinking only", content: "" } }]
    }),
    ""
  );
});

test("provider usage extraction tolerates missing fields without inventing values", () => {
  assert.deepEqual(extractLLMProviderUsage({}), {});
  assert.deepEqual(
    extractLLMProviderUsage({
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20
      }
    }),
    {
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20
    }
  );
});
