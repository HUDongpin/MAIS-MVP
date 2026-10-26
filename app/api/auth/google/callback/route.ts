import { runCredentialMutation } from "@/lib/server/requestMutationActor";
import { handleGoogleOAuthCallback } from "./handler";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runCredentialMutation(() => handleGoogleOAuthCallback(request));
}
