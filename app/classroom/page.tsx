import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentClassroomView } from "@/components/teacher/TeacherLiveView";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { getAuthenticatedUserFromToken } from "@/lib/server/auth";

export default async function ClassroomPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await getAuthenticatedUserFromToken(token);
  const params = await searchParams;
  const query = params.code ? `?code=${encodeURIComponent(params.code)}` : "";

  if (!authenticated) {
    redirect(`/login?next=/classroom${query}`);
  }

  return <StudentClassroomView initialCode={params.code ?? ""} />;
}
