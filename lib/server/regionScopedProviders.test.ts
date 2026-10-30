import assert from "node:assert/strict";
import test from "node:test";
import { fetchCompanyAllowedProvider } from "@/lib/aiProviderCompanyPolicy";
import { fetchLLMProviderResponse, resetDashScopeRegionalPreferenceForTests } from "./llmProvider";
import {
  readRegionScopedAITutorProviderStatus,
  readRegionScopedGeneralProviderConfig,
  readRegionScopedTutorImageConfig,
  readRegionScopedTutorTextProviders
} from "./regionScopedProviders";

async function configured(run: () => void | Promise<void>) {
  const values = {
    QWEN_API_KEY: "fixture-qwen", QWEN_API_URL: "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions",
    QWEN_TEXT_API_URL: "", QWEN_IMAGE_API_URL: "", QWEN_REALTIME_API_URL: "", QWEN_ASR_REALTIME_API_URL: "",
    DEEPINFRA_API_KEY: "fixture-deepinfra", DEEPINFRA_API_URL: "https://api.deepinfra.com/v1/openai/chat/completions",
    DEEPINFRA_MODEL: "Qwen/fixture", AI_TUTOR_PREFERRED_TEXT_PROVIDER: "qwen", AI_TUTOR_PROVIDER_PROFILE: "runtime",
    OPENROUTER_API_KEY: "fixture-openrouter", OPENROUTER_API_URL: "https://openrouter.ai/api/v1/chat/completions", OPENROUTER_MODEL: "qwen/fixture", OPENROUTER_TEXT_MODEL: "", OPENROUTER_VISION_MODEL: "",
    DEEPSEEK_API_KEY: "fixture-deepseek", DEEPSEEK_API_URL: "https://api.deepseek.com/chat/completions"
  };
  const previous = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
  Object.assign(process.env, values);
  try { await run(); } finally {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
    resetDashScopeRegionalPreferenceForTests();
  }
}

test("US text and vision use the requested OpenRouter gateway even for a Qwen model", () => configured(() => {
  assert.deepEqual(readRegionScopedTutorTextProviders("US").map(c => c.provider), ["openrouter"]);
  assert.equal(readRegionScopedTutorImageConfig("US")?.provider, "openrouter");
  assert.equal(readRegionScopedGeneralProviderConfig("US")?.provider, "openrouter");
  assert.equal(readRegionScopedGeneralProviderConfig("US")?.model, "qwen/fixture");
}));

test("HK and Mainland preserve preferred and generic provider behavior", () => configured(() => {
  for (const region of ["HK", "MAINLAND"] as const) {
    assert.deepEqual(readRegionScopedTutorTextProviders(region).map(c => c.provider), ["qwen", "deepinfra"]);
    assert.equal(readRegionScopedTutorImageConfig(region)?.provider, "qwen");
    assert.equal(readRegionScopedGeneralProviderConfig(region)?.provider, "deepseek");
  }
}));

test("missing US keys never select an otherwise configured forbidden provider", () => configured(() => {
  delete process.env.OPENROUTER_API_KEY;
  assert.ok(readRegionScopedTutorTextProviders("US").every(c => c.provider === "openrouter" && !c.apiKey));
  assert.equal(readRegionScopedTutorImageConfig("US")?.apiKey, undefined);
  assert.equal(readRegionScopedGeneralProviderConfig("US")?.apiKey, undefined);
  const status = readRegionScopedAITutorProviderStatus("US");
  assert.equal(status.text.configured, false);
  assert.equal(status.voice.configured, false);
  assert.equal(status.speech.configured, false);
}));

test("a custom compatible endpoint cannot claim the US identity of its configuration slot", () => configured(() => {
  process.env.OPENROUTER_API_URL = "https://custom.example/v1/openai/chat/completions";
  assert.deepEqual(readRegionScopedTutorTextProviders("US"), []);
  assert.equal(readRegionScopedTutorImageConfig("US"), null);
  assert.equal(readRegionScopedGeneralProviderConfig("US"), null);
  assert.equal(readRegionScopedAITutorProviderStatus("US").text.readiness, "blocked-by-region-policy");
}));

test("US capabilities report Alibaba voice and speech as unavailable", () => configured(() => {
  const us = readRegionScopedAITutorProviderStatus("US");
  assert.equal(us.text.provider, "openrouter");
  assert.equal(us.text.configured, true);
  assert.equal(us.image.provider, "openrouter");
  assert.equal(us.voice.readiness, "blocked-by-region-policy");
  assert.equal(us.speech.readiness, "blocked-by-region-policy");
  assert.equal(readRegionScopedAITutorProviderStatus("HK").voice.configured, true);
}));

test("the transport rejects Alibaba US before any fetch or regional retry", async () => {
  const old = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("blocked fixture", { status: 403 }); };
  try {
    await assert.rejects(async () => fetchLLMProviderResponse({ provider: "qwen", apiKey: "fixture", apiUrl: "https://dashscope-us.aliyuncs.com/v1/chat", model: "qwen" }, { method: "POST", body: "private fixture" }, undefined, "US"), /permitted AI service company/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = old; }
});

test("OpenRouter requires an explicit model and cannot silently use configured DeepInfra", () => configured(() => {
  delete process.env.OPENROUTER_MODEL;
  assert.equal(readRegionScopedGeneralProviderConfig("US")?.apiKey, undefined);
  assert.equal(readRegionScopedAITutorProviderStatus("US").text.readiness, "missing-model");
}));

test("US generic and LLM requests reject redirects while HK retains its request settings", async () => {
  const old = globalThis.fetch;
  const calls: Array<{ url: string; redirect: RequestRedirect | undefined }> = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), redirect: init?.redirect }); return new Response("fixture"); };
  try {
    await fetchLLMProviderResponse({ provider: "deepinfra", apiUrl: "https://api.deepinfra.com/v1/chat", model: "Qwen/model" }, { method: "POST", redirect: "follow" }, undefined, "US");
    await fetchCompanyAllowedProvider("US", "https://api.mathpix.com/v3/strokes", { method: "POST", redirect: "follow" });
    await fetchCompanyAllowedProvider("HK", "https://server.simpletex.cn/ocr", { method: "POST", redirect: "follow" });
    assert.deepEqual(calls.map(c => c.redirect), ["error", "error", "follow"]);
    await assert.rejects(async () => fetchCompanyAllowedProvider("US", "https://unknown.example/chat", { body: "private fixture" }), /permitted AI service company/);
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = old; }
});
