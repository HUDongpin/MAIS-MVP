import type { Metadata } from "next";
import { CaliforniaHighSchoolTextbookPage } from "@/components/lesson/CaliforniaHighSchoolTextbookPage";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California High School Mathematics Textbook QA Review",
  description: "Noindex QA review copy for the repaired California Grade 9-12 MAIS textbook composition.",
  robots: {
    index: false,
    follow: false
  }
};

export default function CaliforniaHighSchoolTextbookReviewRoute() {
  return <CaliforniaHighSchoolTextbookPage />;
}
