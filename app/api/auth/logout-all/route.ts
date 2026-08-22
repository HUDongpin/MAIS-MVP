import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { handleLogoutAll } from "./handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-logout-all", () => handleLogoutAll(request));
}
