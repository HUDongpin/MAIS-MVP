import { redirect } from "next/navigation";
import { studentResourcesPath } from "@/lib/studentResourceRoutes";

export default function LegacyStudentResourcesIndexPage() {
  redirect(studentResourcesPath);
}
