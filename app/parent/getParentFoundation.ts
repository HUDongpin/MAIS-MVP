import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { canAccessParentArea, getAuthenticatedUserFromToken } from "@/lib/server/auth";
import { getParentFoundationData } from "@/lib/server/userStore";
import { toParentFoundationSafeData } from "@/lib/server/userStore/parentSafeDto";

export async function getParentFoundationForPage(selectedStudentId?: string | null) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (!authenticated) {
    redirect("/login?next=/parent");
  }

  if (!canAccessParentArea(authenticated.user)) {
    redirect(authenticated.user.role === "teacher" || authenticated.user.role === "admin" ? "/teacher/dashboard" : "/dashboard");
  }

  const foundation = await getParentFoundationData(authenticated.user.id, selectedStudentId);
  if (!foundation) {
    redirect("/dashboard");
  }

  return toParentFoundationSafeData(foundation);
}
