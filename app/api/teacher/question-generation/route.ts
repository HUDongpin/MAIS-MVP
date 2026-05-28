import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { generateEduHKQuestionPair } from "@/lib/server/eduhkOpenApi";

export const runtime = "nodejs";

const maxPromptLength = 12000;
const maxChatIdLength = 160;

function readCleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function statusForGenerationError(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message.startsWith("Missing EdUHK OpenAPI configuration")) return 503;
  if (
    error.message === "EDUHK_OPENAPI_TIMEOUT" ||
    error.message.startsWith("EDUHK_OPENAPI_HTTP_") ||
    error.message === "EDUHK_LLM_EMPTY_REPLY" ||
    error.message === "EDUHK_LLM_FORMAT_ERROR"
  ) {
    return 502;
  }
  return 500;
}

function publicErrorForGenerationError(error: unknown) {
  if (!(error instanceof Error)) return "Could not generate questions.";
  if (error.message.startsWith("Missing EdUHK OpenAPI configuration")) return error.message;
  if (error.message === "EDUHK_LLM_FORMAT_ERROR") return "EdUHK response did not match the expected question format.";
  if (error.message === "EDUHK_LLM_EMPTY_REPLY") return "EdUHK response was empty.";
  if (error.message === "EDUHK_OPENAPI_TIMEOUT") return "EdUHK request timed out.";
  if (error.message.startsWith("EDUHK_OPENAPI_HTTP_")) return "EdUHK provider returned an error.";
  return "Could not generate questions.";
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    prompt?: unknown;
    chatId?: unknown;
  } | null;
  const prompt = readCleanString(body?.prompt, maxPromptLength);
  const chatId = readCleanString(body?.chatId, maxChatIdLength) || authenticated.user.id;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  try {
    const pair = await generateEduHKQuestionPair({ chatId, prompt });
    return NextResponse.json({
      questions: [
        { apiId: "api1", ...pair.primary },
        { apiId: "api2", ...pair.secondary }
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorForGenerationError(error) },
      { status: statusForGenerationError(error) }
    );
  }
}
