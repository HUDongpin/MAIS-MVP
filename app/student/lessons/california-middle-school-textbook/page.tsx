import type { Metadata } from "next";
import { CaliforniaMiddleSchoolReplacementTextbookPage } from "@/components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California Middle School Mathematics",
  description: "California standards-aligned Grade 6-8 interactive textbook: chapter openers, interactive CCSS lessons, and hand-checked chapter checks."
};

export default async function CaliforniaMiddleSchoolTextbookStudentLessonRoute() {
  await requireLessonAuthentication("/student/lessons/california-middle-school-textbook");

  return <CaliforniaMiddleSchoolReplacementTextbookPage />;
}
