import { NextResponse } from "next/server";

const defaultDeepSeekApiUrl = "https://api.deepseek.com/chat/completions";
const defaultDeepSeekModel = "deepseek-v4-pro";
const defaultOpenAIApiUrl = "https://api.openai.com/v1/chat/completions";
const defaultOpenAIModel = "gpt-4.1-mini";

export const runtime = "nodejs";

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readProvider(apiUrl: string) {
  if (apiUrl.includes("api.deepseek.com")) return "deepseek";
  if (apiUrl.includes("openai.com")) return "openai";
  return "openai-compatible";
}

export async function GET() {
  const llmApiKey = readOptionalEnv(process.env.LLM_API_KEY);
  const openAIApiKey = readOptionalEnv(process.env.OPENAI_API_KEY);
  const usesOpenAIKeyAlias = !llmApiKey && Boolean(openAIApiKey);
  const configured = Boolean(llmApiKey ?? openAIApiKey);
  const model = readOptionalEnv(process.env.LLM_MODEL)
    ?? readOptionalEnv(process.env.OPENAI_MODEL)
    ?? (usesOpenAIKeyAlias ? defaultOpenAIModel : defaultDeepSeekModel);
  const apiUrl = readOptionalEnv(process.env.LLM_API_URL) ?? (
    usesOpenAIKeyAlias ? defaultOpenAIApiUrl : defaultDeepSeekApiUrl
  );

  return NextResponse.json({
    configured,
    mode: configured ? "live" : "local-helper",
    model,
    provider: readProvider(apiUrl)
  });
}
