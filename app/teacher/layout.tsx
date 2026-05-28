import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { canAccessTeacherArea, getAuthenticatedUserFromToken } from "@/lib/server/auth";
import { getTeacherFoundationData } from "@/lib/server/userStore";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await getAuthenticatedUserFromToken(token);

  if (!authenticated) {
    redirect("/login?next=/teacher");
  }

  if (!canAccessTeacherArea(authenticated.user)) {
    redirect("/dashboard");
  }

  const foundation = await getTeacherFoundationData(authenticated.user.id);

  if (!foundation) {
    redirect("/dashboard");
  }

  return (
    <TeacherShell user={foundation.teacher} classes={foundation.classes}>
      {children}
    </TeacherShell>
  );
}
