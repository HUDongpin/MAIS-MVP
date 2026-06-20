import { redirect } from "next/navigation";

export default async function TeacherPrepPage() {
  redirect("/teacher/lesson-kits");
}
