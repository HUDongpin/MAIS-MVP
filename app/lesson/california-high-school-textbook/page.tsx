import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "California High School Mathematics Textbook",
  description: "Grade 9-12 California high-school mathematics worked examples and precise diagrams."
};

export default async function CaliforniaHighSchoolTextbookRoute() {
  redirect("/lesson/california-high-school-textbook/review");
}
