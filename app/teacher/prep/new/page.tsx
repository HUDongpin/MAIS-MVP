import { redirect } from "next/navigation";

export default async function NewTeacherPrepPage() {
  redirect("/teacher/lesson-kits/new");
}
