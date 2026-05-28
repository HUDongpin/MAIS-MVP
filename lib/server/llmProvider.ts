export type LLMProviderContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type LLMProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | LLMProviderContentPart[];
};

export type LLMProviderName = "deepseek" | "openai" | "openai-compatible";
export type LLMProviderResponseFormat = "json_object";
export type LLMProviderThinkingMode = "enabled" | "disabled";

export type LLMProviderConfig = {
  apiKey?: string;
  apiUrl: string;
  model: string;
  provider: LLMProviderName;
};

export type LLMProviderUsage = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
};

const defaultDeepSeekApiUrl = "https://api.deepseek.com/chat/completions";
const defaultDeepSeekModel = "deepseek-v4-pro";
const defaultOpenAIApiUrl = "https://api.openai.com/v1/chat/completions";
const defaultOpenAIModel = "gpt-4.1-mini";

export function boundedLLMNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isDeepSeekApiUrl(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname === "api.deepseek.com";
  } catch {
    return apiUrl.includes("api.deepseek.com");
  }
}

export function readLLMProviderConfig(): LLMProviderConfig {
  const llmApiKey = readOptionalEnv(process.env.LLM_API_KEY);
  const openAIApiKey = readOptionalEnv(process.env.OPENAI_API_KEY);
  const usesOpenAIKeyAlias = !llmApiKey && Boolean(openAIApiKey);
  const apiUrl = readOptionalEnv(process.env.LLM_API_URL) ?? (
    usesOpenAIKeyAlias ? defaultOpenAIApiUrl : defaultDeepSeekApiUrl
  );
  const model = readOptionalEnv(process.env.LLM_MODEL)
    ?? readOptionalEnv(process.env.OPENAI_MODEL)
    ?? (usesOpenAIKeyAlias ? defaultOpenAIModel : defaultDeepSeekModel);
  const provider = isDeepSeekApiUrl(apiUrl)
    ? "deepseek"
    : apiUrl.includes("openai.com")
      ? "openai"
      : "openai-compatible";

  return {
    apiKey: llmApiKey ?? openAIApiKey,
    apiUrl,
    model,
    provider
  };
}

export function buildLLMProviderRequestBody({
  model,
  messages,
  maxTokens,
  provider,
  responseFormat,
  deepSeekThinking
}: {
  model: string;
  messages: LLMProviderMessage[];
  maxTokens: number;
  provider: LLMProviderName;
  responseFormat?: LLMProviderResponseFormat;
  deepSeekThinking?: LLMProviderThinkingMode;
}) {
  const structuredOutput = responseFormat ? { response_format: { type: responseFormat } } : {};

  if (provider === "deepseek") {
    const thinkingMode = deepSeekThinking ?? "enabled";
    return {
      model,
      messages,
      ...structuredOutput,
      thinking: { type: thinkingMode },
      ...(thinkingMode === "enabled" ? { reasoning_effort: "high" } : {}),
      stream: false,
      max_tokens: maxTokens
    };
  }

  return {
    model,
    messages,
    ...structuredOutput,
    max_completion_tokens: maxTokens
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractLLMTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!isRecord(part)) return "";
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function extractLLMProviderReply(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) return "";

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return "";

  return extractLLMTextContent(firstChoice.message.content);
}

export function extractLLMProviderFinishReason(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) return null;

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice)) return null;

  return typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : null;
}

export function extractLLMProviderUsage(value: unknown): LLMProviderUsage {
  if (!isRecord(value) || !isRecord(value.usage)) return {};
  return {
    promptTokens: typeof value.usage.prompt_tokens === "number" ? value.usage.prompt_tokens : null,
    completionTokens: typeof value.usage.completion_tokens === "number" ? value.usage.completion_tokens : null,
    totalTokens: typeof value.usage.total_tokens === "number" ? value.usage.total_tokens : null
  };
}
