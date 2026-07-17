import { handleGoogleOAuthCallback } from "./handler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGoogleOAuthCallback(request);
}
