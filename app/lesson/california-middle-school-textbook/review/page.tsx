import type { Metadata } from "next";
import { CaliforniaMiddleSchoolTextbookPage } from "@/components/lesson/CaliforniaMiddleSchoolTextbookPage";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California Middle School Mathematics Textbook QA Review",
  description: "Noindex QA review copy for the repaired California Grade 6-8 MAIS textbook composition.",
  robots: {
    index: false,
    follow: false
  }
};

export default function CaliforniaMiddleSchoolTextbookRoute() {
  return <CaliforniaMiddleSchoolTextbookPage surface="review" />;
}
