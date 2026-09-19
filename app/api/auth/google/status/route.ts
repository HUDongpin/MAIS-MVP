import { googleOAuthStatusResponse } from "./handler";

export const runtime = "nodejs";

export async function GET() {
  return googleOAuthStatusResponse();
}
