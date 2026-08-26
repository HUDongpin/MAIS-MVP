import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { handleLogout } from "./handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-logout", () => handleLogout(request));
}
