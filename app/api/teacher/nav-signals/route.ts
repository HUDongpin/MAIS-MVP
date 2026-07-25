import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { teacherWorkspaceCacheTag } from "@/app/teacher/getTeacherFoundation";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import type { TeacherNavSignals } from "@/types";

export const runtime = "nodejs";

// Nav badges reuse the dashboard aggregation so the counts always match the KPI
// tiles, but stay behind a per-teacher cache so the shell never adds a fresh
// heavy aggregation to every page view.
const cachedNavSignalsByUserId = unstable_cache(
  async (userId: string): Promise<TeacherNavSignals | null> => {
    const { getTeacherDashboardData, countOpenContentSafetyAlertsForViewer } = await import("@/lib/server/userStore");
    const dashboard = await getTeacherDashboardData(userId);
    if (!dashboard) return null;
    const openSafetyAlerts = await countOpenContentSafetyAlertsForViewer(userId).catch(() => 0);
    return {
      pendingGrading: dashboard.kpis.pendingGrading,
      unrepliedMessages: dashboard.kpis.unrepliedMessages,
      openSafetyAlerts
    };
  },
  ["teacher-nav-signals-by-user-id"],
  { revalidate: 120, tags: [teacherWorkspaceCacheTag] }
);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!canAccessTeacherArea(authenticated.user)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  const signals = await cachedNavSignalsByUserId(authenticated.user.id).catch(() => null);
  if (!signals) {
    return NextResponse.json({ error: "Teacher nav signals unavailable." }, { status: 404 });
  }

  return NextResponse.json({ signals });
}
