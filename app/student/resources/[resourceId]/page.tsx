import { redirect } from "next/navigation";
import { studentResourceHref } from "@/lib/studentResourceRoutes";

type LegacyStudentResourcePageProps = {
  params: Promise<{ resourceId: string }>;
};

export default async function LegacyStudentResourcePage({ params }: LegacyStudentResourcePageProps) {
  const { resourceId } = await params;
  redirect(studentResourceHref(resourceId));
}
