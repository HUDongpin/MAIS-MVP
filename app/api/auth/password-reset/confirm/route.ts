import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { handlePasswordResetConfirm } from "./handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-password-reset-confirm", () => handlePasswordResetConfirm(request));
}
