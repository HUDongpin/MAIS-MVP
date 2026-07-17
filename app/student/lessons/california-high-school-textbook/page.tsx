import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California High School Mathematics Textbook",
  description: "Grade 9-12 California high-school mathematics worked examples and precise diagrams."
};

export default async function CaliforniaHighSchoolTextbookStudentLessonRoute() {
  await requireLessonAuthentication("/student/lessons/california-high-school-textbook");

  redirect(studentRoadmapPath);
}
