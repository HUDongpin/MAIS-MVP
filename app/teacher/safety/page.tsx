import { TeacherSafetyAlertsView } from "@/components/teacher/TeacherSafetyAlertsView";
import { listContentSafetyAlertsForViewer } from "@/lib/server/userStore";
import { getTeacherShellForLayout } from "../getTeacherFoundation";
import type { ContentSafetyAlertsData } from "@/types";

export const dynamic = "force-dynamic";

export default async function TeacherSafetyAlertsPage() {
  const shell = await getTeacherShellForLayout();
  const initialData: ContentSafetyAlertsData = await listContentSafetyAlertsForViewer(shell.teacher.id, { limit: 200 })
    .catch(() => ({
      generatedAt: new Date().toISOString(),
      flags: [],
      counts: { new: 0, acknowledged: 0, resolved: 0, total: 0, open: 0 }
    }));

  return <TeacherSafetyAlertsView initialData={initialData} />;
}
