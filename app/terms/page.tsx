import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { termsOfService } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Terms of Service | MAIS",
  description: "The terms covering use of the MAIS mathematics learning platform."
};

export default function TermsPage() {
  return <LegalDocumentView document={termsOfService} />;
}
