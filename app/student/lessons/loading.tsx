import { SectionHeader } from "@/components/ui/SectionHeader";

export default function StudentLessonsLoading() {
  return (
    <div className="page-container py-10 sm:py-12">
      <SectionHeader
        eyebrow="MAIS Lesson"
        title="Opening lesson"
        description="Loading the lesson content."
      />
    </div>
  );
}
