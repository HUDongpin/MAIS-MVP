import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgressRewardsDesignPreview } from "@/components/gamification/ProgressRewardsDesignPreview";

export const metadata: Metadata = {
  title: "Progress & Rewards Design Preview | MAIS",
  description: "Local design preview for the unified MAIS student progress and rewards dashboard.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ProgressRewardsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProgressRewardsDesignPreview />;
}
