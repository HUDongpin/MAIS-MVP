import { permanentRedirect } from "next/navigation";
import { decodeLessonRouteSlug, lessonHrefForSlug } from "@/lib/lessonLinks";

export const runtime = "nodejs";

type LegacyLessonPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyLessonPage({ params }: LegacyLessonPageProps) {
  const { slug } = await params;
  permanentRedirect(lessonHrefForSlug(decodeLessonRouteSlug(slug)));
}
