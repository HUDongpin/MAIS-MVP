import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { handlePasswordChange } from "./handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-password-change", () => handlePasswordChange(request));
}
