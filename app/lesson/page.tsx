import { permanentRedirect } from "next/navigation";
import { studentLessonsPath } from "@/lib/lessonLinks";

export const runtime = "nodejs";

export default function LegacyLessonEntryPage() {
  permanentRedirect(studentLessonsPath);
}
