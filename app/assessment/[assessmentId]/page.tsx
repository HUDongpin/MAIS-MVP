import { redirect } from "next/navigation";
import { studentAssessmentHref } from "@/lib/studentAssessmentRoutes";

type LegacyStudentAssessmentPageProps = {
  params: Promise<{ assessmentId: string }>;
};

export default async function LegacyStudentAssessmentPage({ params }: LegacyStudentAssessmentPageProps) {
  const { assessmentId } = await params;
  redirect(studentAssessmentHref(assessmentId));
}
