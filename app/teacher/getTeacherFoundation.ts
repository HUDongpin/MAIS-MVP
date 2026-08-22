import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { getInternalFastNoClassTeacherShellByUserId } from "@/lib/server/internalCaliforniaFastLogin";
import { emptyTeacherFoundationData } from "./emptyTeacherData";
import type { StudentSession } from "@/types";

function canAccessTeacherArea(user?: Pick<StudentSession, "role"> | null) {
  return user?.role === "teacher" || user?.role === "admin";
}

// Invalidated via revalidateTag whenever a teacher mutates their workspace shape
// (e.g. creating a class), so new classes appear immediately instead of after the
// revalidate window.
export const teacherWorkspaceCacheTag = "teacher-workspace-data";

const cachedTeacherShellDataByUserId = unstable_cache(
  async (userId: string) => {
    const { getTeacherShellData } = await import("@/lib/server/userStore");
    return getTeacherShellData(userId);
  },
  ["teacher-shell-data-by-user-id"],
  { revalidate: 300, tags: [teacherWorkspaceCacheTag] }
);

const cachedTeacherFoundationDataByUserId = unstable_cache(
  async (userId: string) => {
    const { getTeacherFoundationData } = await import("@/lib/server/userStore");
    return getTeacherFoundationData(userId);
  },
  ["teacher-foundation-data-by-user-id"],
  { revalidate: 300, tags: [teacherWorkspaceCacheTag] }
);

export const getTeacherAuthenticationForPage = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const { getAuthenticatedUserFromToken } = await import("@/lib/server/auth");
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (!authenticated) {
    redirect("/login?next=/teacher/dashboard");
  }

  if (!canAccessTeacherArea(authenticated.user)) {
    // A teacher URL must never serve another account's student workspace. When the
    // active session is not a teacher, ask for an explicit teacher login instead.
    redirect("/login?next=/teacher/dashboard&reason=teacher-account-required");
  }

  return authenticated;
});

export const getTeacherShellForLayout = cache(async () => {
  const authenticated = await getTeacherAuthenticationForPage();

  const foundation = await cachedTeacherShellDataByUserId(authenticated.user.id).catch(() => null);
  if (foundation) return foundation;

  const fastNoClassTeacherShell = getInternalFastNoClassTeacherShellByUserId(authenticated.user.id);
  if (fastNoClassTeacherShell) return fastNoClassTeacherShell;

  // Degraded fallback: keep an authenticated teacher inside the console instead of
  // bouncing them onto the guarded student dashboard when shell data is unavailable.
  return { teacher: authenticated.user, classes: [] };
});

export const getTeacherFoundationForPage = cache(async () => {
  const authenticated = await getTeacherAuthenticationForPage();
  const foundation = await cachedTeacherFoundationDataByUserId(authenticated.user.id).catch(() => null);
  if (foundation) return foundation;

  return emptyTeacherFoundationData(authenticated.user);
});
