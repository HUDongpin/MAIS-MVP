import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Resolve the authenticated session once for the current React server request.
 * Root and nested layouts share this promise, so server-seeded app chrome does
 * not add a second auth-storage read to protected pages.
 */
export const getRequestSessionContext = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { hadSessionCookie: false, authenticated: null } as const;
  }

  // Keep the large storage/auth graph out of anonymous cold starts.
  const { getAuthenticatedUserFromToken } = await import("@/lib/server/auth");
  const authenticated = await getAuthenticatedUserFromToken(token);
  return { hadSessionCookie: true, authenticated } as const;
});

export async function getAuthenticatedRequestSession() {
  return (await getRequestSessionContext()).authenticated;
}
