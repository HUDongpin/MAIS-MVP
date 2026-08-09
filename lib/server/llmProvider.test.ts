import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLLMProviderTransportPlan,
  buildLLMProviderRequestBody,
  createLLMProviderCircuitBreaker,
  extractLLMProviderReply,
  extractLLMProviderUsage,
  readAITutorImageProviderConfig,
  readAITutorTextProviderConfigs,
  readLLMProviderConfig,
  readQwenImageProviderConfig,
  readQwenTextProviderConfig,
  resolveAITutorProviderTimeoutMs,
  resolveLLMProviderName,
  resolveLLMMaxCompletionTokens,
  resolveLLMProviderTimeoutMs,
  resolveNovaQwenThinkingMode,
  resolveProviderApiPinnedIp,
  selectAvailableLLMProviderConfig
} from "./llmProvider";

const messages = [
  { role: "system" as const, content: "Tutor rules" },
  { role: "user" as const, content: "Give one hint." }
];

async function withProviderEnv(env: Record<string, string | undefined>, run: () => void | Promise<void>) {
  const keys = [
    "AI_TUTOR_QWEN_IMAGE_MODEL",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_API_URL",
    "DEEPSEEK_MODEL",
    "LLM_API_KEY",
    "LLM_API_URL",
    "LLM_MODEL",
    "QWEN_API_KEY",
    "QWEN_API_URL",
    "QWEN_IMAGE_API_URL",
    "QWEN_MODEL",
    "QWEN_IMAGE_MODEL",
    "QWEN_TEXT_API_URL",
    "QWEN_TEXT_MODEL",
    "DEEPINFRA_API_KEY",
    "DEEPINFRA_API_URL",
    "DEEPINFRA_MODEL",
    "DEEPINFRA_TEXT_MODEL",
    "DEEPINFRA_VISION_MODEL",
    "AI_TUTOR_PREFERRED_TEXT_PROVIDER"
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  keys.forEach((key) => {
    delete process.env[key];
  });
  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    await run();
  } finally {
    keys.forEach((key) => {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test("text provider config accepts legacy production LLM aliases", async () => {
  await withProviderEnv({
    LLM_API_KEY: "legacy-test-key",
    LLM_API_URL: "https://api.deepseek.com/chat/completions",
    LLM_MODEL: "legacy-deepseek-model"
  }, () => {
    const config = readLLMProviderConfig();

    assert.equal(config.apiKey, "legacy-test-key");
    assert.equal(config.apiUrl, "https://api.deepseek.com/chat/completions");
    assert.equal(config.model, "legacy-deepseek-model");
    assert.equal(config.provider, "deepseek");
  });
});

test("Qwen text fallback config uses shared DashScope credentials without exposing DeepSeek state", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key",
    QWEN_API_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    QWEN_TEXT_MODEL: "qwen3.8-max"
  }, () => {
    const config = readQwenTextProviderConfig();

    assert.equal(config.apiKey, "qwen-test-key");
    assert.equal(config.apiUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(config.model, "qwen3.8-max");
    assert.equal(config.provider, "qwen");
  });
});

test("Nova Tutor defaults text and image turns to Qwen3.8 Max", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key"
  }, () => {
    const textConfig = readQwenTextProviderConfig();
    const imageConfig = readAITutorImageProviderConfig();

    assert.equal(textConfig.model, "qwen3.8-max");
    assert.equal(imageConfig.model, "qwen3.8-max");
    assert.equal(readQwenImageProviderConfig().model, "qwen3.7-plus");
    assert.equal(textConfig.provider, "qwen");
    assert.equal(imageConfig.provider, "qwen");
  });
});

test("Qwen-specific config keeps provider identity on official workspace endpoints", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key",
    QWEN_TEXT_API_URL: "https://workspace-id.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
    QWEN_IMAGE_API_URL: "https://workspace-id.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions"
  }, () => {
    assert.equal(readQwenTextProviderConfig().provider, "qwen");
    assert.equal(readQwenImageProviderConfig().provider, "qwen");
  });
});

test("Nova text default is isolated from the shared Qwen image model", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key",
    QWEN_API_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    QWEN_IMAGE_MODEL: "custom-qwen-image-model"
  }, () => {
    const config = readQwenTextProviderConfig();

    assert.equal(config.model, "qwen3.8-max");
    assert.equal(config.provider, "qwen");
  });
});

test("Nova image model is isolated from other Qwen vision consumers", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key",
    QWEN_IMAGE_MODEL: "shared-qwen-vision-model"
  }, () => {
    assert.equal(readQwenImageProviderConfig().model, "shared-qwen-vision-model");
    assert.equal(readAITutorImageProviderConfig().model, "qwen3.8-max");
  });

  await withProviderEnv({
    QWEN_API_KEY: "qwen-test-key",
    QWEN_IMAGE_MODEL: "shared-qwen-vision-model",
    AI_TUTOR_QWEN_IMAGE_MODEL: "nova-qwen-vision-model"
  }, () => {
    assert.equal(readQwenImageProviderConfig().model, "shared-qwen-vision-model");
    assert.equal(readAITutorImageProviderConfig().model, "nova-qwen-vision-model");
  });
});

test("provider circuit breaker skips an open primary and selects the fallback", () => {
  let now = 1_000;
  const primary = {
    apiKey: "deepseek-test-key",
    apiUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    provider: "deepseek" as const
  };
  const fallback = {
    apiKey: "qwen-test-key",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen3.8-max",
    provider: "qwen" as const
  };
  const circuitBreaker = createLLMProviderCircuitBreaker({
    failureThreshold: 1,
    cooldownMs: 60_000,
    now: () => now
  });

  assert.equal(selectAvailableLLMProviderConfig([primary, fallback], circuitBreaker), primary);

  circuitBreaker.recordFailure(primary);

  assert.equal(circuitBreaker.isOpen(primary), true);
  assert.equal(selectAvailableLLMProviderConfig([primary, fallback], circuitBreaker), fallback);

  now += 60_001;

  assert.equal(circuitBreaker.isOpen(primary), false);
  assert.equal(selectAvailableLLMProviderConfig([primary, fallback], circuitBreaker), primary);
});

test("text provider config prefers DEEPSEEK variables over legacy LLM aliases", async () => {
  await withProviderEnv({
    DEEPSEEK_API_KEY: "deepseek-test-key",
    DEEPSEEK_API_URL: "https://api.deepseek.com/chat/completions",
    DEEPSEEK_MODEL: "deepseek-v4-pro",
    LLM_API_KEY: "legacy-test-key",
    LLM_API_URL: "https://example.invalid/chat",
    LLM_MODEL: "legacy-model"
  }, () => {
    const config = readLLMProviderConfig();

    assert.equal(config.apiKey, "deepseek-test-key");
    assert.equal(config.apiUrl, "https://api.deepseek.com/chat/completions");
    assert.equal(config.model, "deepseek-v4-pro");
    assert.equal(config.provider, "deepseek");
  });
});

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

test("Qwen request body uses DashScope chat-completion limits", () => {
  const body = buildLLMProviderRequestBody({
    model: "qwen3.8-max",
    messages,
    maxTokens: 400,
    provider: "qwen"
  }) as Record<string, unknown>;

  assert.equal(body.model, "qwen3.8-max");
  assert.equal(body.max_tokens, 400);
  assert.equal(body.stream, false);
  assert.equal("thinking" in body, false);
  assert.equal("max_completion_tokens" in body, false);
});

test("Qwen request body can disable thinking for latency-bound Nova Tutor calls", () => {
  const body = buildLLMProviderRequestBody({
    model: "qwen3.8-max",
    messages,
    maxTokens: 400,
    provider: "qwen",
    qwenThinking: "disabled"
  }) as Record<string, unknown>;

  assert.equal(body.enable_thinking, false);
  assert.equal("thinking" in body, false);
  assert.equal("reasoning_effort" in body, false);
});

test("Nova disables Qwen thinking only for the selected hybrid Qwen3.8 Max model", () => {
  assert.equal(resolveNovaQwenThinkingMode("qwen", "qwen3.8-max"), "disabled");
  assert.equal(resolveNovaQwenThinkingMode("qwen", " QWEN3.8-MAX "), "disabled");
  assert.equal(resolveNovaQwenThinkingMode("qwen", "qwen3-max-thinking"), undefined);
  assert.equal(resolveNovaQwenThinkingMode("deepinfra", "qwen3.8-max"), undefined);
  assert.equal(resolveNovaQwenThinkingMode("openai-compatible", "qwen3.8-max"), undefined);
});

test("provider timeout keeps AI Tutor below the serverless hard timeout edge", () => {
  assert.equal(resolveLLMProviderTimeoutMs(undefined), 8_000);
  assert.equal(resolveLLMProviderTimeoutMs("60000"), 12_000);
  assert.equal(resolveLLMProviderTimeoutMs("50"), 250);
  assert.equal(resolveLLMProviderTimeoutMs("not-a-number"), 8_000);
});

test("AI Tutor text provider timeout preserves the Qwen-only deadline cap", () => {
  assert.equal(resolveAITutorProviderTimeoutMs(undefined), 8_000);
  assert.equal(resolveAITutorProviderTimeoutMs("60000"), 12_000);
  assert.equal(resolveAITutorProviderTimeoutMs("50"), 250);
  assert.equal(resolveAITutorProviderTimeoutMs("not-a-number"), 8_000);
});

test("DeepSeek resolved-IP transport preserves HTTPS server name and host metadata", () => {
  const config = {
    apiKey: "deepseek-test-key",
    apiUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    provider: "deepseek" as const
  };

  assert.equal(resolveProviderApiPinnedIp(" 171.108.209.197 "), "171.108.209.197");
  assert.equal(resolveProviderApiPinnedIp("api.deepseek.com"), undefined);

  assert.deepEqual(
    buildLLMProviderTransportPlan(config, "171.108.209.197"),
    {
      mode: "pinned-ip",
      requestHostname: "171.108.209.197",
      requestPort: 443,
      servername: "api.deepseek.com",
      hostHeader: "api.deepseek.com"
    }
  );

  assert.deepEqual(
    buildLLMProviderTransportPlan({ ...config, provider: "qwen" }, "171.108.209.197"),
    { mode: "fetch" }
  );
});

test("provider completion budget stays aligned with concise tutor replies", () => {
  assert.equal(resolveLLMMaxCompletionTokens(undefined), 450);
  assert.equal(resolveLLMMaxCompletionTokens("900"), 600);
  assert.equal(resolveLLMMaxCompletionTokens("50"), 100);
  assert.equal(resolveLLMMaxCompletionTokens("not-a-number"), 450);
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

test("deepinfra api url resolves to the deepinfra provider", () => {
  assert.equal(resolveLLMProviderName("https://api.deepinfra.com/v1/openai/chat/completions"), "deepinfra");
});

test("text candidates stay qwen-first until deepinfra is preferred", async () => {
  await withProviderEnv({ QWEN_API_KEY: "qwen-key", DEEPINFRA_API_KEY: "di-key" }, () => {
    const configs = readAITutorTextProviderConfigs();
    assert.equal(configs.preferredProvider, "qwen");
    assert.equal(configs.primary.provider, "qwen");
    assert.deepEqual(configs.candidates.map((candidate) => candidate.provider), ["qwen", "deepinfra"]);
  });
});

test("deepinfra preference makes it primary when its key is configured", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-key",
    DEEPINFRA_API_KEY: "di-key",
    AI_TUTOR_PREFERRED_TEXT_PROVIDER: "deepinfra"
  }, () => {
    const configs = readAITutorTextProviderConfigs();
    assert.equal(configs.preferredProvider, "deepinfra");
    assert.equal(configs.primary.provider, "deepinfra");
    assert.equal(configs.primary.model, "Qwen/Qwen3-VL-30B-A3B-Instruct");
    assert.deepEqual(configs.candidates.map((candidate) => candidate.provider), ["deepinfra", "qwen"]);
  });
});

test("keyless deepinfra preference falls back to the configured qwen primary", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-key",
    AI_TUTOR_PREFERRED_TEXT_PROVIDER: "deepinfra"
  }, () => {
    const configs = readAITutorTextProviderConfigs();
    assert.equal(configs.preferredProvider, "deepinfra");
    assert.equal(configs.primary.provider, "qwen");
  });
});

test("image provider config prefers deepinfra vision when configured and preferred", async () => {
  await withProviderEnv({
    QWEN_API_KEY: "qwen-key",
    DEEPINFRA_API_KEY: "di-key",
    DEEPINFRA_VISION_MODEL: "Qwen/Qwen3-VL-235B-A22B-Instruct",
    AI_TUTOR_PREFERRED_TEXT_PROVIDER: "deepinfra"
  }, () => {
    const config = readAITutorImageProviderConfig();
    assert.equal(config.provider, "deepinfra");
    assert.equal(config.model, "Qwen/Qwen3-VL-235B-A22B-Instruct");
  });
});

test("deepinfra request body uses openai-compatible max_tokens without thinking fields", () => {
  const body = buildLLMProviderRequestBody({
    model: "Qwen/Qwen3-VL-30B-A3B-Instruct",
    messages,
    maxTokens: 450,
    provider: "deepinfra"
  }) as Record<string, unknown>;
  assert.equal(body.max_tokens, 450);
  assert.equal(body.stream, false);
  assert.equal("thinking" in body, false);
});
