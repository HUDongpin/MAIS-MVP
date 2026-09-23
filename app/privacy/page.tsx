import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { privacyPolicy } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Privacy Policy | MAIS",
  description: "How MAIS collects, uses, protects and deletes learner data, including children's data."
};

export default function PrivacyPage() {
  return <LegalDocumentView document={privacyPolicy} />;
}
