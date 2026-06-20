import Image from "next/image";
import Link from "next/link";
import livePackJson from "@/data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json";

type LessonProblem = {
  prompt: string;
  answer: string;
  explanation: string;
  title?: string;
};

type LessonContent = {
  title: string;
  objectives: string[];
  launch: string;
  conceptExplanation: string;
  workedExamples: LessonProblem[];
  guidedPractice: LessonProblem[];
  independentPractice: LessonProblem[];
  checkpointPrompts: string[];
  checkpointAnswers: string[];
  checkpointExplanations: string[];
  commonPitfalls: Array<{
    pitfall: string;
    repairMove: string;
  }>;
  teacherNotes: string[];
  exitTicket: string;
};

type LessonRecord = {
  id: string;
  metadata: {
    grade: "P6" | "S1" | "S2";
    usGradeLabel: string;
    courseLabel: string;
    sequenceNumber: number;
    domainId: string;
    domainTitle: string;
    clusterTitle: string;
    standardIds: string[];
  };
  studentLesson: {
    en: LessonContent;
  };
};

type LessonPack = {
  packageId: string;
  generatedAt: string;
  packageStatus: string;
  integrationStatus: string;
  lessons: LessonRecord[];
};

const livePack = livePackJson as LessonPack;

const gradeOrder: Array<LessonRecord["metadata"]["grade"]> = ["P6", "S1", "S2"];
const candidateIllustrationBasePath = "/lesson-illustrations/us-ca-middle-school/candidates";
const gradeAssetPrefixes = {
  P6: "p6",
  S1: "s1",
  S2: "s2"
} satisfies Record<LessonRecord["metadata"]["grade"], string>;

function lessonAnchor(lesson: LessonRecord) {
  return lesson.id.replace(/^us-ca-math-middle-school-textbooks-v2-/, "");
}

function conceptImageSrc(lesson: LessonRecord) {
  const gradePrefix = gradeAssetPrefixes[lesson.metadata.grade];
  const chapterNumber = String(lesson.metadata.sequenceNumber).padStart(2, "0");
  return `${candidateIllustrationBasePath}/${gradePrefix}-chapter-${chapterNumber}-concept.png`;
}

function conceptImageAlt(lesson: LessonRecord, content: LessonContent) {
  return `Concept visual for ${lesson.metadata.usGradeLabel} ${content.title}.`;
}

function studentSafeText(value: string) {
  if (/S18\/S05 review should sample student-facing examples before live integration\./i.test(value)) {
    return "Check that your representation, computation, and final answer agree.";
  }

  return value
    .replace(/\bS18 reviewed\b/gi, "Student edition")
    .replace(/\bS18\/S05 review\b/gi, "Student review")
    .replace(/\bbefore live integration\b/gi, "before moving on")
    .trim();
}

function lessonsByGrade() {
  return gradeOrder
    .map((grade) => ({
      grade,
      lessons: livePack.lessons
        .filter((lesson) => lesson.metadata.grade === grade)
        .sort((left, right) => left.metadata.sequenceNumber - right.metadata.sequenceNumber)
    }))
    .filter((group) => group.lessons.length > 0);
}

function StandardsList({ lesson }: { lesson: LessonRecord }) {
  return (
    <div className="flex flex-wrap gap-2">
      {lesson.metadata.standardIds.map((standardId) => (
        <span
          key={standardId}
          className="rounded-md border border-cyan-200/80 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100"
        >
          {standardId}
        </span>
      ))}
    </div>
  );
}

function ProblemBlock({
  label,
  problem
}: {
  label: string;
  problem: LessonProblem;
}) {
  const title = problem.title ? studentSafeText(problem.title) : undefined;
  const prompt = studentSafeText(problem.prompt);
  const answer = studentSafeText(problem.answer);
  const explanation = studentSafeText(problem.explanation);

  return (
    <section className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-white/10">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-fuchsia-700 dark:text-fuchsia-200">{label}</p>
      <div className="border-l-2 border-fuchsia-300/70 pl-3 dark:border-fuchsia-300/35">
        <div className="space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
          {title ? <p className="font-black text-slate-950 dark:text-white">{title}</p> : null}
          <p>{prompt}</p>
          <p>
            <span className="font-black text-slate-950 dark:text-white">Answer:</span> {answer}
          </p>
          <p>
            <span className="font-black text-slate-950 dark:text-white">Reasoning:</span> {explanation}
          </p>
        </div>
      </div>
    </section>
  );
}

function LessonSection({ lesson }: { lesson: LessonRecord }) {
  const content = lesson.studentLesson.en;
  const workedExample = content.workedExamples[0];
  const guidedPractice = content.guidedPractice[0];
  const independentPractice = content.independentPractice[0];
  const imageSrc = conceptImageSrc(lesson);

  return (
    <article
      id={lessonAnchor(lesson)}
      data-testid={`california-replacement-lesson-${lesson.metadata.grade}-${lesson.metadata.domainId}`}
      className="scroll-mt-28 rounded-lg border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.055] sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">
            {lesson.metadata.usGradeLabel} · {lesson.metadata.domainId}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{content.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {lesson.metadata.domainTitle} · {lesson.metadata.clusterTitle}
          </p>
        </div>
        <StandardsList lesson={lesson} />
      </div>

      <figure className="mt-6 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/35">
        <Image
          src={imageSrc}
          alt={conceptImageAlt(lesson, content)}
          width={1600}
          height={900}
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="h-auto w-full"
          priority={lesson.metadata.grade === "P6" && lesson.metadata.sequenceNumber === 1}
          unoptimized
        />
        <figcaption className="px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          Concept visual
        </figcaption>
      </figure>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Concept</p>
            <p className="border-l-2 border-cyan-300/70 pl-3 text-sm leading-7 text-slate-700 dark:border-cyan-300/35 dark:text-slate-200">
              {studentSafeText(content.conceptExplanation)}
            </p>
          </section>
          <ProblemBlock label="Worked example" problem={workedExample} />
          <ProblemBlock label="Guided practice" problem={guidedPractice} />
          <ProblemBlock label="Independent practice" problem={independentPractice} />
        </div>

        <aside className="space-y-5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Objectives</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {content.objectives.map((objective, index) => (
                <li key={objective}>
                  <span className="font-black text-slate-950 dark:text-white">{index + 1}.</span> {objective}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Common pitfalls</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {content.commonPitfalls.slice(0, 3).map((item) => (
                <li key={item.pitfall}>{item.pitfall}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Checkpoint</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              <p>{content.checkpointPrompts[0]}</p>
              <p>
                <span className="font-black text-slate-950 dark:text-white">Answer:</span> {studentSafeText(content.checkpointAnswers[0])}
              </p>
              <p>{studentSafeText(content.checkpointExplanations[0])}</p>
            </div>
          </div>

          <section className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Exit ticket</p>
            <p className="border-l-2 border-cyan-300/70 pl-3 text-sm leading-7 text-slate-700 dark:border-cyan-300/35 dark:text-slate-200">
              {studentSafeText(content.exitTicket)}
            </p>
          </section>
        </aside>
      </div>
    </article>
  );
}

export function CaliforniaMiddleSchoolReplacementTextbookPage() {
  const groups = lessonsByGrade();
  const totalLessons = livePack.lessons.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/80">
        <div className="page-container py-10 sm:py-12">
          <div className="grid gap-7 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                California Middle School Mathematics
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">
                Replacement Grade 6-8 Lessons
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">
                Illustrated California standards-aligned lesson coverage with worked examples, guided practice, independent practice, checkpoints, and concept visuals.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Package</p>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{livePack.packageId}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {totalLessons} lessons · G6-G8 · Student edition
              </p>
            </div>
          </div>

          <nav aria-label="California replacement middle school lessons" className="mt-8 flex flex-wrap gap-2">
            {groups.flatMap((group) =>
              group.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`#${lessonAnchor(lesson)}`}
                  className="focus-ring rounded-md border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:border-cyan-300/50 dark:hover:text-cyan-100"
                >
                  {lesson.metadata.usGradeLabel} · {lesson.metadata.domainId}
                </Link>
              ))
            )}
          </nav>
        </div>
      </section>

      <div className="page-container space-y-10 py-10 sm:py-12">
        {groups.map((group) => (
          <section key={group.grade} data-testid={`california-replacement-book-${group.grade}`} className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">
                  {group.lessons[0].metadata.usGradeLabel}
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{group.lessons[0].metadata.courseLabel}</h2>
              </div>
              <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                California standards-aligned lesson coverage · {group.lessons.length} lessons
              </p>
            </div>

            <div className="space-y-6">
              {group.lessons.map((lesson) => (
                <LessonSection key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
