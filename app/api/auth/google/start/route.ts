import {
  handleGoogleOAuthStart,
  handleGoogleOAuthStartPost
} from "./handler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGoogleOAuthStart(request);
}

export async function POST(request: Request) {
  return handleGoogleOAuthStartPost(request);
}
