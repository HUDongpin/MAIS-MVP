import assert from "node:assert/strict";
import test from "node:test";
import {
  combineProviderPolicyRegions,
  companyScopedProviderRequestInit,
  isAiProviderAllowedForRegion,
  providerPolicyRegionFromProfile,
  providerRequestInit,
  resolveAiServiceCompany
} from "./aiProviderCompanyPolicy";

test("US policy follows the API company, independently of its model or regional hostname", () => {
  assert.equal(resolveAiServiceCompany("https://api.deepinfra.com/v1/openai/chat/completions"), "deepinfra");
  assert.equal(isAiProviderAllowedForRegion("US", "https://api.deepinfra.com/v1/openai/chat/completions"), true);
  assert.equal(isAiProviderAllowedForRegion("US", "https://api.mathpix.com/v3/strokes"), true);
  assert.equal(isAiProviderAllowedForRegion("US", "https://api.openai.com/v1/moderations"), true);
  assert.equal(isAiProviderAllowedForRegion("US", "https://openrouter.ai/api/v1/chat/completions"), true);
  for (const url of [
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions",
    "https://workspace.maas.aliyuncs.com/v1/chat/completions",
    "wss://dashscope-us.aliyuncs.com/api-ws/v1/realtime",
    "https://api.deepseek.com/chat/completions",
    "https://server.simpletex.cn/api/simpletex_ocr",
    "https://unknown.example/v1/openai/chat/completions"
  ]) assert.equal(isAiProviderAllowedForRegion("US", url), false, url);
});

test("endpoint identity rejects lookalikes, URL credentials, non-TLS and alternate ports for US", () => {
  for (const url of [
    "https://api.deepinfra.com.evil.example/v1/chat",
    "https://api.deepinfra.com@evil.example/v1/chat",
    "https://user:password@api.deepinfra.com/v1/chat",
    "http://api.deepinfra.com/v1/chat",
    "https://api.deepinfra.com:8443/v1/chat",
    "api.deepinfra.com/v1/chat", "", "not a URL"
  ]) assert.equal(isAiProviderAllowedForRegion("US", url), false, url);
});

test("OpenRouter cannot override the US upstream-company allowlist or fall back outside it", () => {
  const request = companyScopedProviderRequestInit("US", "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", body: JSON.stringify({ model: "qwen/fixture", messages: [], provider: { only: ["alibaba"], allow_fallbacks: true } })
  });
  const body = JSON.parse(request.body as string);
  assert.deepEqual(body.provider.only, ["openai", "anthropic", "google-vertex", "amazon-bedrock", "azure", "deepinfra"]);
  assert.deepEqual(body.provider.order, body.provider.only);
  assert.equal(body.provider.allow_fallbacks, false);
  assert.equal(body.model, "qwen/fixture");
  assert.equal(request.redirect, "error");
  assert.throws(() => companyScopedProviderRequestInit("US", "https://openrouter.ai/api/v1/audio/transcriptions", { method: "POST", body: "{}" }), /permitted AI service company/);
});

test("HK and Mainland preserve all existing service-company choices", () => {
  for (const region of ["HK", "MAINLAND"] as const) {
    for (const url of ["https://api.deepseek.com/chat/completions", "https://dashscope-us.aliyuncs.com/v1/chat", "https://server.simpletex.cn/ocr", "https://custom.example/chat"]) {
      assert.equal(isAiProviderAllowedForRegion(region, url), true);
    }
  }
});

test("missing policy context cannot relax the US company restriction", () => {
  assert.equal(isAiProviderAllowedForRegion(null, "https://api.deepseek.com/chat/completions"), false);
  assert.equal(isAiProviderAllowedForRegion(null, "https://api.deepinfra.com/v1/openai/chat/completions"), true);
});

test("the trusted stored region takes precedence, with legacy-track fallback for incomplete profiles", () => {
  assert.equal(providerPolicyRegionFromProfile({ region: "US", curriculumTrack: "HK" }), "US");
  assert.equal(providerPolicyRegionFromProfile({ region: "HK", curriculumTrack: "US_CA_MATH" }), "HK");
  assert.equal(providerPolicyRegionFromProfile({ curriculumTrack: "US" }), "US");
  assert.equal(providerPolicyRegionFromProfile({ curriculumTrack: "US_FL_MATH" }), "US");
  assert.equal(providerPolicyRegionFromProfile({ curriculumTrack: "MAINLAND_PEP_HIGH" }), "MAINLAND");
  assert.equal(providerPolicyRegionFromProfile({ region: "HK", curriculumTrack: "HK" }), "HK");
  assert.equal(providerPolicyRegionFromProfile({ region: "invalid", curriculumTrack: "invalid" }), null);
  assert.equal(providerPolicyRegionFromProfile({}), null);
});

test("US and unknown included subjects cannot be relaxed by an HK actor", () => {
  assert.equal(combineProviderPolicyRegions("HK", "US"), "US");
  assert.equal(combineProviderPolicyRegions("MAINLAND", "HK"), "MAINLAND");
  assert.equal(combineProviderPolicyRegions("HK", null), null);
  assert.equal(combineProviderPolicyRegions(null, "US"), "US");
});

test("restricted requests cannot follow an unchecked provider redirect", () => {
  const init = { method: "POST", redirect: "follow" as const, body: "fixture" };
  assert.equal(providerRequestInit("US", init).redirect, "error");
  assert.equal(providerRequestInit(null, init).redirect, "error");
  assert.equal(providerRequestInit("HK", init), init);
  assert.equal(providerRequestInit("MAINLAND", init), init);
});
