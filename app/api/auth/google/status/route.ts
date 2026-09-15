import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured } from "@/lib/server/googleOAuth";

export const runtime = "nodejs";

export function googleOAuthStatusResponse(env?: Record<string, string | undefined>) {
  return NextResponse.json(
    { available: isGoogleOAuthConfigured(env) },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function GET() {
  return googleOAuthStatusResponse();
}
