import path from "node:path";

import { createDeepSeekProviderAdapter } from "./f3-provider-adapter.mjs";
import { runF3ProviderSmoke, writeF3ProviderSmokeReceipt } from "./f3-provider-smoke.mjs";

function optionValue(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

try {
  if (process.argv.some((argument) => ["--production", "--deploy", "--candidate-content"].includes(argument))) {
    throw new Error("Provider smoke is synthetic-only; production, deployment, and candidate content are forbidden.");
  }
  const outputPath = path.resolve(optionValue("--output"));
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim() === "") throw new Error("DEEPSEEK_API_KEY is not configured in the runtime environment.");
  const adapter = createDeepSeekProviderAdapter({ apiKey, model: "deepseek-v4-pro" });
  const receipt = await runF3ProviderSmoke({ providerAdapter: adapter });
  await writeF3ProviderSmokeReceipt(outputPath, receipt);
  process.stdout.write(JSON.stringify({ status: receipt.status, provider: receipt.provider, model: receipt.model, httpStatus: receipt.httpStatus, validJson: receipt.validJson, receiptSha256: receipt.receiptSha256, secretPersisted: false }) + "\n");
} catch (error) {
  process.stderr.write(`F3 provider smoke failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
