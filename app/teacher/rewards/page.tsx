import { redirect } from "next/navigation";
import { TeacherRewardsView } from "@/components/teacher/TeacherRewardsView";
import { getTeacherRewardsData } from "@/lib/server/userStore";
import { getTeacherFoundationForPage } from "../getTeacherFoundation";

export default async function TeacherRewardsPage() {
  const foundation = await getTeacherFoundationForPage();
  const rewards = await getTeacherRewardsData(foundation.teacher.id);

  if (!rewards) {
    redirect("/teacher");
  }

  return <TeacherRewardsView rewards={rewards} />;
}

