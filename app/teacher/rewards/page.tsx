import { redirect } from "next/navigation";
import { TeacherRewardsView } from "@/components/teacher/TeacherRewardsView";
import { getTeacherRewardsData } from "@/lib/server/userStore";
import { emptyTeacherRewardsData } from "../emptyTeacherData";
import { getTeacherFoundationForPage, getTeacherShellForLayout } from "../getTeacherFoundation";

export default async function TeacherRewardsPage() {
  const shell = await getTeacherShellForLayout();
  if (!shell.classes.length) {
    return <TeacherRewardsView rewards={emptyTeacherRewardsData()} />;
  }

  const foundation = await getTeacherFoundationForPage();
  const rewards = await getTeacherRewardsData(foundation.teacher.id);

  if (!rewards) {
    redirect("/teacher/dashboard");
  }

  return <TeacherRewardsView rewards={rewards} />;
}
