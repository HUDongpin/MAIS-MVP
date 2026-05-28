export type EduHKOpenApiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type EduHKOpenApiConfig = {
  baseUrl?: string;
  appId?: string;
  apiKey?: string;
  timeoutMs: number;
};

export type EduHKGeneratedQuestion = {
  question: string;
  answer: string;
  questionEn: string;
  answerEn: string;
};

export type EduHKQuestionGenerationSlot = "primary" | "secondary";
type EduHKOpenApiEnv = Record<string, string | undefined>;

const chatCompletionsPath = "/api/v1/chat/completions";
const generatedQuestionDelimiter = "~~~@@@~~~";
const defaultTimeoutMs = 30000;

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function buildEduHKChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Missing EDUHK_LLM_BASE_URL.");
  return trimmed.endsWith(chatCompletionsPath) ? trimmed : `${trimmed}${chatCompletionsPath}`;
}

export function buildEduHKOpenApiRequestBody({
  appId,
  chatId,
  messages
}: {
  appId: string;
  chatId: string;
  messages: EduHKOpenApiMessage[];
}) {
  return {
    appId,
    stream: false,
    detail: false,
    chatId,
    messages
  };
}

export function readEduHKQuestionGeneratorConfig(
  slot: EduHKQuestionGenerationSlot = "primary",
  env: EduHKOpenApiEnv = process.env
): EduHKOpenApiConfig {
  const suffix = slot === "secondary" ? "_2" : "";
  return {
    baseUrl: readOptionalEnv(env.EDUHK_LLM_BASE_URL),
    appId: readOptionalEnv(env[`EDUHK_ITEM_GENERATE_APP_ID${suffix}`]),
    apiKey: readOptionalEnv(env[`EDUHK_ITEM_GENERATE_API_KEY${suffix}`]),
    timeoutMs: boundedNumber(env.EDUHK_LLM_PROVIDER_TIMEOUT_MS, defaultTimeoutMs, 250, 120000)
  };
}

export function missingEduHKQuestionGeneratorEnv(
  config: EduHKOpenApiConfig,
  slot: EduHKQuestionGenerationSlot = "primary"
) {
  const suffix = slot === "secondary" ? "_2" : "";
  const missing: string[] = [];
  if (!config.baseUrl) missing.push("EDUHK_LLM_BASE_URL");
  if (!config.appId) missing.push(`EDUHK_ITEM_GENERATE_APP_ID${suffix}`);
  if (!config.apiKey) missing.push(`EDUHK_ITEM_GENERATE_API_KEY${suffix}`);
  return missing;
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

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

function readStringField(value: unknown, keys: string[]) {
  if (!isRecord(value)) return "";
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.trim()) return field.trim();
  }
  return "";
}

export function extractEduHKOpenApiReply(value: unknown): string {
  const parsed = typeof value === "string" ? tryParseJson(value) ?? value : value;
  if (typeof parsed === "string") return parsed.trim();
  if (!isRecord(parsed)) return "";

  if (Array.isArray(parsed.choices)) {
    const firstChoice = parsed.choices[0];
    if (isRecord(firstChoice)) {
      if (isRecord(firstChoice.message)) {
        const messageContent = extractTextContent(firstChoice.message.content);
        if (messageContent) return messageContent;
      }

      const text = readStringField(firstChoice, ["text", "content"]);
      if (text) return text;
    }
  }

  if (isRecord(parsed.message)) {
    const messageContent = extractTextContent(parsed.message.content);
    if (messageContent) return messageContent;
  }

  const directText = readStringField(parsed, ["content", "text", "answer", "output"]);
  if (directText) return directText;

  if (isRecord(parsed.data)) {
    return readStringField(parsed.data, ["content", "text", "answer", "output"]);
  }

  return "";
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseEduHKGeneratedQuestionReply(reply: string): EduHKGeneratedQuestion {
  const parts = reply.split(generatedQuestionDelimiter).map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new Error("EDUHK_LLM_FORMAT_ERROR");
  }

  return {
    question: parts[0],
    answer: parts[1],
    questionEn: parts[2],
    answerEn: parts[3]
  };
}

export async function callEduHKOpenApiChatCompletion({
  config,
  chatId,
  messages
}: {
  config: EduHKOpenApiConfig;
  chatId: string;
  messages: EduHKOpenApiMessage[];
}) {
  const missing = missingEduHKQuestionGeneratorEnv(config);
  if (missing.length) {
    throw new Error(`Missing EdUHK OpenAPI configuration: ${missing.join(", ")}.`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(buildEduHKChatCompletionsUrl(config.baseUrl!), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(buildEduHKOpenApiRequestBody({
        appId: config.appId!,
        chatId,
        messages
      })),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`EDUHK_OPENAPI_HTTP_${response.status}`);
    }

    return tryParseJson(text) ?? text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("EDUHK_OPENAPI_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateEduHKQuestion({
  config,
  chatId,
  prompt
}: {
  config: EduHKOpenApiConfig;
  chatId: string;
  prompt: string;
}) {
  const response = await callEduHKOpenApiChatCompletion({
    config,
    chatId,
    messages: [{ role: "user", content: prompt }]
  });
  const reply = extractEduHKOpenApiReply(response);
  if (!reply) throw new Error("EDUHK_LLM_EMPTY_REPLY");
  return parseEduHKGeneratedQuestionReply(reply);
}

export async function generateEduHKQuestionPair({
  chatId,
  prompt,
  env = process.env
}: {
  chatId: string;
  prompt: string;
  env?: EduHKOpenApiEnv;
}) {
  const primaryConfig = readEduHKQuestionGeneratorConfig("primary", env);
  const secondaryConfig = readEduHKQuestionGeneratorConfig("secondary", env);
  const missing = [
    ...missingEduHKQuestionGeneratorEnv(primaryConfig, "primary"),
    ...missingEduHKQuestionGeneratorEnv(secondaryConfig, "secondary")
  ];
  if (missing.length) {
    throw new Error(`Missing EdUHK OpenAPI configuration: ${Array.from(new Set(missing)).join(", ")}.`);
  }

  const [primary, secondary] = await Promise.all([
    generateEduHKQuestion({ config: primaryConfig, chatId, prompt }),
    generateEduHKQuestion({ config: secondaryConfig, chatId, prompt })
  ]);

  return {
    primary,
    secondary
  };
}
