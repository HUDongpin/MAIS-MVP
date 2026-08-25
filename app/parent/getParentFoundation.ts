import { notFound, redirect } from "next/navigation";
import { canAccessParentArea } from "@/lib/server/auth";
import { getAuthenticatedRequestSession } from "@/lib/server/requestSession";
import { getParentFoundationData } from "@/lib/server/userStore";
import { toParentFoundationSafeData } from "@/lib/server/userStore/parentSafeDto";

export async function getParentFoundationForPage(selectedStudentId?: string | null) {
  const authenticated = await getAuthenticatedRequestSession();

  if (!authenticated) {
    redirect("/login?next=/parent");
  }

  if (!canAccessParentArea(authenticated.user)) {
    redirect(authenticated.user.role === "teacher" || authenticated.user.role === "admin" ? "/teacher/dashboard" : "/dashboard");
  }

  const foundation = await getParentFoundationData(authenticated.user.id, selectedStudentId);
  if (!foundation) {
    if (selectedStudentId !== undefined && selectedStudentId !== null) notFound();
    redirect("/dashboard");
  }

  return toParentFoundationSafeData(foundation);
}
