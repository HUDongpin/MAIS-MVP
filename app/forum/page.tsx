import type { Metadata } from "next";
import { ForumWorkspace } from "@/components/forum/ForumWorkspace";

export const metadata: Metadata = {
  title: "Class Learning Forum | MAIS",
  description: "Class-based asynchronous and live math discussion for MAIS learners."
};

export default function ForumPage() {
  return <ForumWorkspace />;
}
