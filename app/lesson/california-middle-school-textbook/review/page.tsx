import type { Metadata } from "next";
import { CaliforniaMiddleSchoolReplacementTextbookPage } from "@/components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California Middle School Interactive Textbook Review",
  description: "Noindex review of the California Grade 6-8 English introductory chapter openers and related interactive lessons.",
  robots: {
    index: false,
    follow: false
  }
};

export default function CaliforniaMiddleSchoolTextbookRoute() {
  return <CaliforniaMiddleSchoolReplacementTextbookPage />;
}
