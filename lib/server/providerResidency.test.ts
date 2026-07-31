import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  describeResidencyBlock,
  hostnameFromApiUrl,
  isProviderAllowedForRegion,
  partitionByResidency,
  readRegionAllowlist,
  resolveLearnerResidencyRegion,
  resolveProviderJurisdiction
} from "@/lib/server/providerResidency";

const residencyEnvKeys = [
  "PROVIDER_RESIDENCY_ALLOWED_US",
  "PROVIDER_RESIDENCY_ALLOWED_HK",
  "PROVIDER_RESIDENCY_ALLOWED_MAINLAND",
  "PROVIDER_RESIDENCY_HOST_OVERRIDES"
] as const;

function clearResidencyEnv() {
  for (const key of residencyEnvKeys) delete process.env[key];
}

afterEach(clearResidencyEnv);

const qwenPrc = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const qwenIntl = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const qwenUs = "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions";
const qwenRealtimePrc = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
const deepseek = "https://api.deepseek.com/chat/completions";
const deepinfra = "https://api.deepinfra.com/v1/openai/chat/completions";
const simpletex = "https://server.simpletex.cn/api/simpletex_ocr";
const mathpix = "https://api.mathpix.com/v3/text";

describe("resolveProviderJurisdiction", () => {
  it("classifies each subprocessor in the data inventory", () => {
    assert.equal(resolveProviderJurisdiction(qwenPrc), "CN");
    assert.equal(resolveProviderJurisdiction(deepseek), "CN");
    assert.equal(resolveProviderJurisdiction(simpletex), "CN");
    assert.equal(resolveProviderJurisdiction(deepinfra), "US");
    assert.equal(resolveProviderJurisdiction(mathpix), "US");
  });

  it("distinguishes the DashScope regional hosts instead of matching on 'dashscope'", () => {
    // The whole point of the gate: a substring match would call all three PRC.
    assert.equal(resolveProviderJurisdiction(qwenPrc), "CN");
    assert.equal(resolveProviderJurisdiction(qwenIntl), "SG");
    assert.equal(resolveProviderJurisdiction(qwenUs), "US");
  });

  it("classifies the realtime websocket endpoint by its host, not its scheme", () => {
    assert.equal(resolveProviderJurisdiction(qwenRealtimePrc), "CN");
  });

  it("treats unknown, empty and malformed endpoints as UNKNOWN rather than guessing", () => {
    assert.equal(resolveProviderJurisdiction("https://llm.internal.example/v1/chat"), "UNKNOWN");
    assert.equal(resolveProviderJurisdiction(""), "UNKNOWN");
    assert.equal(resolveProviderJurisdiction("not a url"), "UNKNOWN");
    assert.equal(resolveProviderJurisdiction("api.deepseek.com/chat"), "UNKNOWN");
  });

  it("does not let a lookalike hostname inherit a known jurisdiction", () => {
    assert.equal(resolveProviderJurisdiction("https://api.deepseek.com.evil.test/v1"), "UNKNOWN");
    assert.equal(resolveProviderJurisdiction("https://notdashscope.aliyuncs.com/v1"), "UNKNOWN");
  });

  it("is case-insensitive about the hostname", () => {
    assert.equal(resolveProviderJurisdiction("https://API.DeepInfra.COM/v1/openai/chat/completions"), "US");
  });

  it("honours an operator host override for a self-hosted endpoint", () => {
    process.env.PROVIDER_RESIDENCY_HOST_OVERRIDES = "llm.internal.example=US";
    assert.equal(resolveProviderJurisdiction("https://llm.internal.example/v1/chat"), "US");
  });

  it("lets an override correct a built-in classification", () => {
    process.env.PROVIDER_RESIDENCY_HOST_OVERRIDES = "api.deepinfra.com=SG";
    assert.equal(resolveProviderJurisdiction(deepinfra), "SG");
  });

  it("ignores malformed override entries", () => {
    process.env.PROVIDER_RESIDENCY_HOST_OVERRIDES = "bad-entry,another=NOWHERE,llm.ok.example=US";
    assert.equal(resolveProviderJurisdiction("https://llm.ok.example/v1"), "US");
    assert.equal(resolveProviderJurisdiction("https://another/v1"), "UNKNOWN");
  });
});

describe("readRegionAllowlist", () => {
  it("defaults US to US-only", () => {
    assert.deepEqual(readRegionAllowlist("US"), ["US"]);
  });

  it("defaults HK and MAINLAND to today's behaviour so enabling the gate is a no-op for them", () => {
    for (const region of ["HK", "MAINLAND"] as const) {
      const allowlist = readRegionAllowlist(region);
      for (const jurisdiction of ["CN", "US", "SG", "UNKNOWN"] as const) {
        assert.ok(allowlist.includes(jurisdiction), `${region} should permit ${jurisdiction} by default`);
      }
    }
  });

  it("accepts an env override and normalises whitespace and case", () => {
    process.env.PROVIDER_RESIDENCY_ALLOWED_HK = " us , sg ";
    assert.deepEqual(readRegionAllowlist("HK"), ["US", "SG"]);
  });

  it("falls back to the default when an override parses to nothing usable", () => {
    // A typo must not silently take the tutor down, nor silently drop the gate.
    process.env.PROVIDER_RESIDENCY_ALLOWED_US = "NOWHERE, ATLANTIS";
    assert.deepEqual(readRegionAllowlist("US"), ["US"]);

    process.env.PROVIDER_RESIDENCY_ALLOWED_US = "   ";
    assert.deepEqual(readRegionAllowlist("US"), ["US"]);
  });

  it("keeps the recognised entries when an override is partly invalid", () => {
    process.env.PROVIDER_RESIDENCY_ALLOWED_US = "US, ATLANTIS, SG";
    assert.deepEqual(readRegionAllowlist("US"), ["US", "SG"]);
  });

  it("scopes an override to its own region", () => {
    process.env.PROVIDER_RESIDENCY_ALLOWED_HK = "US";
    assert.deepEqual(readRegionAllowlist("HK"), ["US"]);
    assert.deepEqual(readRegionAllowlist("MAINLAND"), ["CN", "US", "SG", "UNKNOWN"]);
  });
});

describe("isProviderAllowedForRegion", () => {
  it("blocks every PRC-hosted provider for a US learner by default", () => {
    for (const endpoint of [qwenPrc, qwenRealtimePrc, deepseek, simpletex]) {
      assert.equal(isProviderAllowedForRegion(endpoint, "US"), false, endpoint);
    }
  });

  it("permits the US-hosted providers for a US learner", () => {
    for (const endpoint of [deepinfra, mathpix, qwenUs]) {
      assert.equal(isProviderAllowedForRegion(endpoint, "US"), true, endpoint);
    }
  });

  it("blocks the Singapore DashScope host for a US learner — non-PRC is not the same as US", () => {
    assert.equal(isProviderAllowedForRegion(qwenIntl, "US"), false);
  });

  it("blocks an unclassified endpoint for a US learner", () => {
    assert.equal(isProviderAllowedForRegion("https://llm.internal.example/v1", "US"), false);
  });

  it("leaves Mainland and HK learners on their current providers", () => {
    for (const region of ["HK", "MAINLAND"] as const) {
      for (const endpoint of [qwenPrc, deepseek, simpletex, deepinfra, mathpix]) {
        assert.equal(isProviderAllowedForRegion(endpoint, region), true, `${region} ${endpoint}`);
      }
    }
  });
});

describe("partitionByResidency", () => {
  type Candidate = { name: string; apiUrl: string };
  const apiUrlOf = (candidate: Candidate) => candidate.apiUrl;

  const qwenCandidate: Candidate = { name: "qwen", apiUrl: qwenPrc };
  const deepinfraCandidate: Candidate = { name: "deepinfra", apiUrl: deepinfra };
  const deepseekCandidate: Candidate = { name: "deepseek", apiUrl: deepseek };

  it("keeps only the permitted candidates for a US learner", () => {
    const decision = partitionByResidency(
      [qwenCandidate, deepinfraCandidate, deepseekCandidate],
      "US",
      apiUrlOf
    );

    assert.deepEqual(decision.allowed.map((candidate) => candidate.name), ["deepinfra"]);
    assert.deepEqual(
      decision.blocked.map((entry) => [entry.candidate.name, entry.jurisdiction]),
      [["qwen", "CN"], ["deepseek", "CN"]]
    );
  });

  it("preserves the caller's preference order among the survivors", () => {
    process.env.PROVIDER_RESIDENCY_ALLOWED_US = "US, SG";
    const intlCandidate: Candidate = { name: "qwen-intl", apiUrl: qwenIntl };

    const decision = partitionByResidency(
      [intlCandidate, deepinfraCandidate],
      "US",
      apiUrlOf
    );

    assert.deepEqual(decision.allowed.map((candidate) => candidate.name), ["qwen-intl", "deepinfra"]);
  });

  it("returns an empty allowed list rather than falling back when nothing qualifies", () => {
    const decision = partitionByResidency([qwenCandidate, deepseekCandidate], "US", apiUrlOf);

    assert.deepEqual(decision.allowed, []);
    assert.equal(decision.blocked.length, 2);
  });

  it("passes everything through for a Mainland learner", () => {
    const decision = partitionByResidency(
      [qwenCandidate, deepinfraCandidate, deepseekCandidate],
      "MAINLAND",
      apiUrlOf
    );

    assert.equal(decision.allowed.length, 3);
    assert.deepEqual(decision.blocked, []);
  });

  it("reports the region and allowlist it applied", () => {
    const decision = partitionByResidency([qwenCandidate], "US", apiUrlOf);
    assert.equal(decision.region, "US");
    assert.deepEqual(decision.allowlist, ["US"]);
  });

  it("handles an empty candidate list without throwing", () => {
    const decision = partitionByResidency([], "US", apiUrlOf);
    assert.deepEqual(decision.allowed, []);
    assert.deepEqual(decision.blocked, []);
  });
});

describe("describeResidencyBlock", () => {
  it("names the region and the jurisdictions that were rejected", () => {
    const decision = partitionByResidency(
      [{ apiUrl: qwenPrc }, { apiUrl: qwenIntl }],
      "US",
      (candidate) => candidate.apiUrl
    );

    const message = describeResidencyBlock(decision);
    assert.match(message, /region US/);
    assert.match(message, /Allowed jurisdictions: US/);
    assert.match(message, /CN, SG/);
  });

  it("does not leak the configured endpoint", () => {
    const decision = partitionByResidency([{ apiUrl: qwenPrc }], "US", (candidate) => candidate.apiUrl);
    const message = describeResidencyBlock(decision);
    assert.ok(!message.includes("dashscope"), "endpoint host must not appear in an operator message");
  });

  it("describes the no-providers-configured case distinctly", () => {
    const decision = partitionByResidency<{ apiUrl: string }>([], "US", (candidate) => candidate.apiUrl);
    assert.match(describeResidencyBlock(decision), /\(none configured\)/);
  });
});

describe("resolveLearnerResidencyRegion", () => {
  it("prefers the stored curriculum region", () => {
    assert.equal(
      resolveLearnerResidencyRegion({ profileRegion: "US", curriculumTrack: "HK" }),
      "US"
    );
  });

  it("falls back to the curriculum track so an unpopulated profile cannot bypass the gate", () => {
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "US_CA_MATH" }), "US");
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "US_FL_MATH" }), "US");
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "MAINLAND_PEP_HIGH" }), "MAINLAND");
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "HK" }), "HK");
  });

  it("treats a null profile region as absent rather than as a region", () => {
    assert.equal(
      resolveLearnerResidencyRegion({ profileRegion: null, curriculumTrack: "US_NC_MATH" }),
      "US"
    );
  });

  it("returns null when neither is known", () => {
    assert.equal(resolveLearnerResidencyRegion({}), null);
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "" }), null);
    assert.equal(resolveLearnerResidencyRegion({ curriculumTrack: "SOMETHING_ELSE" }), null);
  });
});

describe("hostnameFromApiUrl", () => {
  it("extracts and lowercases the host", () => {
    assert.equal(hostnameFromApiUrl("https://API.Example.COM/path"), "api.example.com");
  });

  it("returns null for input it cannot parse", () => {
    assert.equal(hostnameFromApiUrl(""), null);
    assert.equal(hostnameFromApiUrl("nonsense"), null);
  });
});
