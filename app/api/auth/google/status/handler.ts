import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured } from "@/lib/server/googleOAuth";

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
