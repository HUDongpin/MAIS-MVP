#!/usr/bin/env node
// Latency + math-accuracy probe for Nova Tutor LLM provider candidates
// (consultation Q3: "run a latency + math-accuracy probe against the top
// candidates with real K-12 items" before switching the live default).
//
// Reads provider credentials ONLY from the environment — never prints keys.
// Providers with no key are skipped, so this is safe to run at any stage of
// provisioning. No student data is involved; the items below are synthetic
// K-12 questions with unambiguous numeric answers.
//
// Usage:
//   node scripts/probe-tutor-providers.mjs            # probe configured providers
//   node scripts/probe-tutor-providers.mjs --list     # show provider readiness only
//   PROBE_RUNS=3 node scripts/probe-tutor-providers.mjs   # repeat each item N times
//
// Env per provider (any subset):
//   DEEPINFRA_API_KEY [DEEPINFRA_API_URL DEEPINFRA_TEXT_MODEL]
//   QWEN_API_KEY      [QWEN_TEXT_API_URL QWEN_TEXT_MODEL]
//   DEEPSEEK_API_KEY  [DEEPSEEK_API_URL DEEPSEEK_MODEL]

const items = [
  { grade: "K", prompt: "What is 3 + 2? Reply with only the number.", answer: "5" },
  { grade: "1", prompt: "What is 8 + 5? Reply with only the number.", answer: "13" },
  { grade: "1", prompt: "What is 14 - 6? Reply with only the number.", answer: "8" },
  { grade: "2", prompt: "What is 7 + 8 + 3? Reply with only the number.", answer: "18" },
  { grade: "2", prompt: "There are 4 rows of 5 chairs. How many chairs? Reply with only the number.", answer: "20" },
  { grade: "3", prompt: "What is 6 x 7? Reply with only the number.", answer: "42" },
  { grade: "3", prompt: "What is 56 divided by 8? Reply with only the number.", answer: "7" },
  { grade: "4", prompt: "What is 3/4 of 24? Reply with only the number.", answer: "18" },
  { grade: "4", prompt: "Round 4,678 to the nearest hundred. Reply with only the number.", answer: "4700" },
  { grade: "5", prompt: "What is 2.5 + 3.75? Reply with only the number.", answer: "6.25" },
  { grade: "5", prompt: "What is 1/2 + 1/3, as a fraction a/b in lowest terms? Reply with only the fraction.", answer: "5/6" },
  { grade: "6", prompt: "A shirt costs $20 and is 25% off. What is the sale price in dollars? Reply with only the number.", answer: "15" },
  { grade: "6", prompt: "What is the unit rate: 180 miles in 3 hours? Reply with only the number of miles per hour.", answer: "60" },
  { grade: "7", prompt: "Solve for x: 3x + 5 = 26. Reply with only the number.", answer: "7" },
  { grade: "7", prompt: "What is (-8) + 15? Reply with only the number.", answer: "7" },
  { grade: "8", prompt: "What is the slope of the line through (0, 2) and (4, 10)? Reply with only the number.", answer: "2" },
  { grade: "8", prompt: "Solve for x: 2(x - 3) = 10. Reply with only the number.", answer: "8" },
  { grade: "HS", prompt: "What is the positive solution of x^2 - 9 = 0? Reply with only the number.", answer: "3" },
  { grade: "HS", prompt: "If f(x) = 2x^2 - 3, what is f(4)? Reply with only the number.", answer: "29" },
  { grade: "HS", prompt: "What is the sum of the interior angles of a hexagon, in degrees? Reply with only the number.", answer: "720" }
];

function env(name) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const providers = [
  {
    name: "deepinfra",
    apiKey: env("DEEPINFRA_API_KEY"),
    apiUrl: env("DEEPINFRA_API_URL") ?? "https://api.deepinfra.com/v1/openai/chat/completions",
    model: env("DEEPINFRA_TEXT_MODEL") ?? env("DEEPINFRA_MODEL") ?? "Qwen/Qwen3-VL-30B-A3B-Instruct"
  },
  {
    name: "qwen",
    apiKey: env("QWEN_API_KEY"),
    apiUrl: env("QWEN_TEXT_API_URL") ?? env("QWEN_API_URL") ?? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: env("QWEN_TEXT_MODEL") ?? env("QWEN_MODEL") ?? "qwen3.8-max"
  },
  {
    name: "deepseek",
    apiKey: env("DEEPSEEK_API_KEY"),
    apiUrl: env("DEEPSEEK_API_URL") ?? "https://api.deepseek.com/chat/completions",
    model: env("DEEPSEEK_MODEL") ?? "deepseek-v4-pro"
  }
];

function normalizeAnswer(text) {
  const trimmed = text.trim().replace(/[,$]/g, "").replace(/\s+/g, " ");
  const fraction = trimmed.match(/-?\d+\s*\/\s*\d+/);
  if (fraction) return fraction[0].replace(/\s+/g, "");
  const number = trimmed.match(/-?\d+(?:\.\d+)?/g);
  return number ? number[number.length - 1] : trimmed.toLowerCase();
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function probeProvider(provider, runs) {
  const results = [];
  for (const item of items) {
    for (let run = 0; run < runs; run += 1) {
      const startedAt = performance.now();
      let ok = false;
      let correct = false;
      let error = null;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        const response = await fetch(provider.apiUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: "system", content: "You are a math tutor. Answer with only the requested value, no explanation." },
              { role: "user", content: item.prompt }
            ],
            ...(provider.name === "qwen" && provider.model.trim().toLowerCase() === "qwen3.8-max"
              ? { enable_thinking: false }
              : {}),
            stream: false,
            max_tokens: 64
          })
        });
        clearTimeout(timer);
        ok = response.ok;
        if (response.ok) {
          const payload = await response.json();
          const reply = payload?.choices?.[0]?.message?.content ?? "";
          const replyText = typeof reply === "string"
            ? reply
            : Array.isArray(reply) ? reply.map((part) => part?.text ?? "").join("") : "";
          correct = normalizeAnswer(replyText) === normalizeAnswer(item.answer);
        } else {
          error = `http-${response.status}`;
        }
      } catch (caught) {
        error = caught?.name === "AbortError" ? "timeout" : (caught?.code ?? caught?.message ?? "error");
      }
      results.push({ grade: item.grade, ok, correct, error, latencyMs: Math.round(performance.now() - startedAt) });
    }
  }
  return results;
}

function summarize(provider, results) {
  const latencies = results.filter((r) => r.ok).map((r) => r.latencyMs).sort((a, b) => a - b);
  const attempts = results.length;
  const okCount = results.filter((r) => r.ok).length;
  const correctCount = results.filter((r) => r.correct).length;
  const errors = results.filter((r) => r.error).reduce((acc, r) => {
    acc[r.error] = (acc[r.error] ?? 0) + 1;
    return acc;
  }, {});
  return {
    provider: provider.name,
    model: provider.model,
    attempts,
    httpOkRate: attempts ? Number((okCount / attempts).toFixed(3)) : 0,
    accuracy: attempts ? Number((correctCount / attempts).toFixed(3)) : 0,
    latencyMs: {
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      max: latencies.length ? latencies[latencies.length - 1] : null
    },
    errors
  };
}

const listOnly = process.argv.includes("--list");
const runs = Math.max(1, Math.min(5, Number(process.env.PROBE_RUNS) || 1));

console.log("Nova Tutor provider probe — 20 synthetic K-12 items, no student data, keys never printed.\n");
for (const provider of providers) {
  console.log(`- ${provider.name}: ${provider.apiKey ? "configured" : "SKIPPED (no key)"} model=${provider.model}`);
}
if (listOnly) process.exit(0);

const summaries = [];
for (const provider of providers) {
  if (!provider.apiKey) continue;
  console.log(`\nProbing ${provider.name} (${items.length} items x ${runs} run${runs > 1 ? "s" : ""})...`);
  const results = await probeProvider(provider, runs);
  const summary = summarize(provider, results);
  summaries.push(summary);
  console.log(JSON.stringify(summary, null, 2));
}

if (!summaries.length) {
  console.log("\nNo providers configured — set at least one *_API_KEY and re-run.");
  process.exit(2);
}

console.log("\n=== Comparison (7.5s deadline: p90 should sit well under 7500ms) ===");
for (const summary of summaries) {
  console.log(
    `${summary.provider.padEnd(10)} accuracy=${String(summary.accuracy).padEnd(6)} p50=${summary.latencyMs.p50}ms p90=${summary.latencyMs.p90}ms okRate=${summary.httpOkRate}`
  );
}
