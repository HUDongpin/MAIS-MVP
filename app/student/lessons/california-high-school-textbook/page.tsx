import type { Metadata } from "next";
import { CaliforniaHighSchoolTextbookStudentPage } from "@/components/lesson/CaliforniaHighSchoolTextbookStudentPage";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California High School Mathematics Textbook",
  description: "Grade 9-12 California high-school mathematics worked examples and precise diagrams."
};

export default async function CaliforniaHighSchoolTextbookStudentLessonRoute() {
  await requireLessonAuthentication("/student/lessons/california-high-school-textbook");

  return <CaliforniaHighSchoolTextbookStudentPage />;
}
