import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export function lessonLoginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export async function requireLessonAuthentication(nextPath: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect(lessonLoginHref(nextPath));
  }

  const { getAuthenticatedUserFromToken } = await import("@/lib/server/auth");
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (!authenticated) {
    redirect(lessonLoginHref(nextPath));
  }

  return authenticated;
}
