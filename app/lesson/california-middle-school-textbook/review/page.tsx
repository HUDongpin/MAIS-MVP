import type { Metadata } from "next";
import { CaliforniaMiddleSchoolReplacementTextbookPage } from "@/components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California Middle School Mathematics Approved Review",
  description: "Noindex review route for the exact approved California Grade 6-8 replacement lesson package.",
  robots: {
    index: false,
    follow: false
  }
};

export default function CaliforniaMiddleSchoolTextbookRoute() {
  return <CaliforniaMiddleSchoolReplacementTextbookPage />;
}
