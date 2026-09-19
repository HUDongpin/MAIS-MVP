import { NextResponse } from "next/server";
import { aiTutorPublicReadCacheHeaders } from "@/lib/aiTutorReadCache";
import { readAITutorProviderStatus } from "@/lib/llmProviderConfig";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json(readAITutorProviderStatus());
  const cacheHeaders = aiTutorPublicReadCacheHeaders();
  for (const [name, value] of Object.entries(cacheHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}
