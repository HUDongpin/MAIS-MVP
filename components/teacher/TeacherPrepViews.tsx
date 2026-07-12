"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type {
  ClassroomWorkSample,
  Language,
  LocalizedText,
  TeacherLessonKit,
  TeacherLessonKitCreateData,
  TeacherLessonKitListData,
  TeacherLessonKitPublishResult,
  TeacherLessonKitSection,
  TeacherLiveSession,
  TextbookPublisher
} from "@/types";

const publisherLabels: Record<TextbookPublisher, LocalizedText> = {
  HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY: { en: "HK Modern", zh: "香港現代", zhHans: "香港现代" },
  HK_UNITED_PRIME_MIA: { en: "DSE UP", zh: "DSE UP", zhHans: "DSE UP" },
  HK_EPH_MIF: { en: "DSE EPH", zh: "DSE EPH", zhHans: "DSE EPH" },
  MAINLAND_PEP: { en: "PEP", zh: "人教版", zhHans: "人教版" },
  MAINLAND_BNU: { en: "BNU", zh: "北師大版", zhHans: "北师大版" },
  MAINLAND_HJB: { en: "HJB", zh: "滬教版", zhHans: "沪教版" },
  US_CA_MATH: { en: "California", zh: "加州", zhHans: "加州" },
  US_NC_MATH: { en: "North Carolina", zh: "北卡", zhHans: "北卡" },
  US_AR_MATH: { en: "Arkansas", zh: "阿肯色", zhHans: "阿肯色" },
  US_FL_MATH: { en: "Florida", zh: "佛州", zhHans: "佛州" }
};

const statusLabels: Record<TeacherLessonKit["status"], LocalizedText> = {
  draft: { en: "Draft", zh: "草稿", zhHans: "草稿" },
  generated: { en: "Generated", zh: "已生成", zhHans: "已生成" },
  reviewed: { en: "Reviewed", zh: "已審核", zhHans: "已审核" },
  published: { en: "Published", zh: "已發佈", zhHans: "已发布" }
};

const reviewLabels: Record<TeacherLessonKit["reviewStatus"], LocalizedText> = {
  "needs-review": { en: "Needs review", zh: "待審核", zhHans: "待审核" },
  approved: { en: "Approved", zh: "已確認", zhHans: "已确认" },
  rejected: { en: "Returned", zh: "已退回", zhHans: "已退回" }
};

const sectionKindLabels: Record<TeacherLessonKitSection["kind"], LocalizedText> = {
  "lesson-plan": { en: "Lesson plan", zh: "教案", zhHans: "教案" },
  "learning-guide": { en: "Learning guide", zh: "導學案", zhHans: "导学案" },
  slides: { en: "Slides", zh: "課件頁", zhHans: "课件页" },
  "blackboard-design": { en: "Board design", zh: "板書", zhHans: "板书" },
  objectives: { en: "Objectives", zh: "目標", zhHans: "目标" },
  "key-points": { en: "Key points", zh: "重難點", zhHans: "重难点" },
  "worked-examples": { en: "Worked examples", zh: "例題", zhHans: "例题" },
  "class-practice": { en: "Class practice", zh: "練習", zhHans: "练习" },
  homework: { en: "Homework", zh: "作業", zhHans: "作业" },
  "classroom-activity": { en: "Activity", zh: "活動", zhHans: "活动" }
};

const lessonTypeLabels: Record<TeacherLessonKit["lessonType"], LocalizedText> = {
  "new-lesson": { en: "New lesson", zh: "新授課", zhHans: "新授课" },
  review: { en: "Review", zh: "複習課", zhHans: "复习课" },
  practice: { en: "Practice", zh: "練習課", zhHans: "练习课" },
  "exam-prep": { en: "Exam review", zh: "考前講評", zhHans: "考前讲评" }
};

function formatLocalized(value: LocalizedText, language: Language) {
  return textForLanguage(value, language);
}

function formatLessonPeriod(period: number, language: Language) {
  if (language === "en") return `Period ${period}`;
  return `${formatLocalized({ en: "Period", zh: "第", zhHans: "第" }, language)} ${period} ${formatLocalized({ en: "", zh: "課時", zhHans: "课时" }, language)}`.trim();
}

function updateTextForLanguage(value: LocalizedText, language: Language, nextText: string): LocalizedText {
  if (language === "en") return { ...value, en: nextText };
  if (language === "zh-Hans") return { ...value, zhHans: nextText };
  return { ...value, zh: nextText };
}

function formatUpdatedAt(value: string, language: Language) {
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function PrepBadge({ children, tone = "slate" }: { children: string; tone?: "slate" | "cyan" | "emerald" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
  };
  return <span className={cn("inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-black", tones[tone])}>{children}</span>;
}

function publishResultFromKit(kit: TeacherLessonKit): TeacherLessonKitPublishResult | null {
  if (kit.status !== "published") return null;
  return {
    resourceIds: kit.publishedResourceIds,
    assignmentId: kit.assignmentId,
    assessmentId: kit.assessmentId,
    liveSessionId: kit.liveSessionId
  };
}

function LessonKitPublishReadyPanel({
  kit,
  result
}: {
  kit: TeacherLessonKit;
  result: TeacherLessonKitPublishResult;
}) {
  const { t } = useSettings();

  return (
    <section aria-live="polite" className="rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{t({ en: "Publish ready", zh: "發佈已就緒", zhHans: "发布已就绪" })}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-100">
        {result.resourceIds.length} {t({ en: "resources", zh: "份資源", zhHans: "份资源" })}
        {result.assignmentId ? ` · ${t({ en: "assignment", zh: "作業", zhHans: "作业" })}` : ""}
        {result.assessmentId ? ` · ${t({ en: "assessment", zh: "測驗", zhHans: "测验" })}` : ""}
        {result.liveSessionId ? ` · ${t({ en: "live class", zh: "直播課堂", zhHans: "直播课堂" })}` : ""}
      </p>
      <div className="mt-3 grid gap-2">
        {result.liveSessionId ? (
          <Link href={`/teacher/classroom-sessions/${encodeURIComponent(result.liveSessionId)}/presenter`} className="focus-ring rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open classroom", zh: "打開課堂", zhHans: "打开课堂" })}
          </Link>
        ) : null}
        {result.assignmentId ? (
          <Link href={`/teacher/assignments/${encodeURIComponent(result.assignmentId)}`} className="focus-ring rounded-2xl border border-emerald-300/70 bg-white/75 px-4 py-3 text-center text-sm font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Open assignment", zh: "打開作業", zhHans: "打开作业" })}
          </Link>
        ) : null}
        {result.assessmentId ? (
          <Link href={`/teacher/assessments/${encodeURIComponent(result.assessmentId)}`} className="focus-ring rounded-2xl border border-emerald-300/70 bg-white/75 px-4 py-3 text-center text-sm font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Open assessment", zh: "打開測驗", zhHans: "打开测验" })}
          </Link>
        ) : null}
        <Link href={`/teacher/resources?classId=${encodeURIComponent(kit.classId)}`} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-center text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t({ en: "Open resources", zh: "打開資源庫", zhHans: "打开资源库" })}
        </Link>
      </div>
    </section>
  );
}

function lessonKitRegionForClasses(classes: TeacherLessonKitListData["classes"], fallbackRegion?: string) {
  return classes.find((teacherClass) => teacherClass.curriculumProfile?.region)?.curriculumProfile?.region ?? fallbackRegion ?? "MAINLAND";
}

const lessonKitRegionNotice = {
  en: "Lesson kit authoring currently covers Mainland (PEP / BNU) textbook chapters. Kits for your course's textbooks are on the roadmap.",
  zh: "備課包目前僅涵蓋中國內地（人教版／北師大版）教材章節。你課程對應教材的備課包正在規劃中。",
  zhHans: "备课包目前仅涵盖中国大陆（人教版／北师大版）教材章节。你课程对应教材的备课包正在规划中。"
} as const;

export function TeacherPrepListView({ data }: { data: TeacherLessonKitListData }) {
  const { currentUser, language, text, t } = useSettings();
  const [classId, setClassId] = useState("all");
  const [publisher, setPublisher] = useState("all");
  const [status, setStatus] = useState("all");
  // The center's labels must follow the teacher's course region instead of being
  // hard-coded to Mainland China branding for every account.
  const region = lessonKitRegionForClasses(data.classes, currentUser?.curriculumProfile?.region);
  const isMainlandRegion = region === "MAINLAND";

  const kits = data.kits.filter((kit) =>
    (classId === "all" || kit.classId === classId) &&
    (publisher === "all" || kit.publisher === publisher) &&
            (status === "all" || kit.status === status)
  );
  const metricCards = [
    { label: t({ en: "Lesson kits", zh: "備課包", zhHans: "备课包" }), value: data.totals.kits },
    { label: t({ en: "Needs review", zh: "待審核", zhHans: "待审核" }), value: data.totals.needsReview },
    { label: t({ en: "Published", zh: "已發佈", zhHans: "已发布" }), value: data.totals.published },
    {
      label: isMainlandRegion
        ? t({ en: "Mainland chapters", zh: "內地章節", zhHans: "内地章节" })
        : t({ en: "Textbook chapters", zh: "教材章節", zhHans: "教材章节" }),
      value: data.totals.mainlandTopics
    }
  ];

  return (
    <div className="grid min-w-0 gap-5">
      <section className="glass-panel min-w-0 overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300 sm:tracking-[0.22em]">
              {isMainlandRegion
                ? t({ en: "Mainland teacher prep", zh: "內地教師備課", zhHans: "大陆教师备课" })
                : t({ en: "Teacher prep", zh: "教師備課", zhHans: "教师备课" })}
            </p>
            <h1 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Lesson Kit Center", zh: "備課中心", zhHans: "备课中心" })}</h1>
          </div>
          <Link href="/teacher/lesson-kits/new" className="focus-ring rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
            {t({ en: "New lesson kit", zh: "新建備課包", zhHans: "新建备课包" })}
          </Link>
        </div>
        {!isMainlandRegion ? (
          <p className="mt-4 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-800 dark:border-amber-300/25 dark:text-amber-100">
            {t(lessonKitRegionNotice)}
          </p>
        ) : null}
        <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-4">
          {metricCards.map(({ label, value }) => (
            <div key={label} className="soft-panel min-w-0 p-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel min-w-0 overflow-hidden p-4">
        <div className={cn("grid min-w-0 gap-3", isMainlandRegion ? "md:grid-cols-3" : "md:grid-cols-2")}>
          <select value={classId} onChange={(event) => setClassId(event.target.value)} className="focus-ring h-11 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            <option value="all">{t({ en: "All classes", zh: "全部班級", zhHans: "全部班级" })}</option>
            {data.classes.map((teacherClass) => (
              <option key={teacherClass.id} value={teacherClass.id}>
                {teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}
              </option>
            ))}
          </select>
          {isMainlandRegion ? (
            <select value={publisher} onChange={(event) => setPublisher(event.target.value)} className="focus-ring h-11 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
              <option value="all">{t({ en: "All textbooks", zh: "全部教材", zhHans: "全部教材" })}</option>
              <option value="MAINLAND_PEP">{text(publisherLabels.MAINLAND_PEP)}</option>
              <option value="MAINLAND_BNU">{text(publisherLabels.MAINLAND_BNU)}</option>
            </select>
          ) : null}
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="focus-ring h-11 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            <option value="all">{t({ en: "All statuses", zh: "全部狀態", zhHans: "全部状态" })}</option>
            <option value="draft">{text(statusLabels.draft)}</option>
            <option value="generated">{text(statusLabels.generated)}</option>
            <option value="reviewed">{text(statusLabels.reviewed)}</option>
            <option value="published">{text(statusLabels.published)}</option>
          </select>
        </div>
      </section>

      <section className="grid min-w-0 gap-3">
        {kits.map((kit) => (
          <Link key={kit.id} href={`/teacher/lesson-kits/${kit.id}`} className="focus-ring soft-panel block min-w-0 p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <PrepBadge tone="cyan">{text(publisherLabels[kit.publisher])}</PrepBadge>
                  <PrepBadge tone={kit.status === "published" ? "emerald" : kit.reviewStatus === "needs-review" ? "amber" : "slate"}>{text(statusLabels[kit.status])}</PrepBadge>
                  <PrepBadge>{text(reviewLabels[kit.reviewStatus])}</PrepBadge>
                </div>
                <h2 className="mt-3 break-words text-lg font-black text-slate-950 dark:text-white">{text(kit.lessonTitle)}</h2>
                <p className="mt-1 break-words text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {kit.className} · {formatGradeLabel(kit.grade, language, true)} · {text(kit.chapterTitle)} · {formatLessonPeriod(kit.lessonPeriod, language)}
                </p>
              </div>
              <p className="text-xs font-bold text-slate-400">{formatUpdatedAt(kit.updatedAt, language)}</p>
            </div>
          </Link>
        ))}
        {!kits.length ? <div className="soft-panel p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No matching lesson kits", zh: "暫無匹配備課包", zhHans: "暂无匹配备课包" })}</div> : null}
      </section>
    </div>
  );
}

export function TeacherPrepNewView({ data }: { data: TeacherLessonKitCreateData }) {
  const router = useRouter();
  const { currentUser, language, text, t } = useSettings();
  const firstClass = data.classes[0];
  const region = lessonKitRegionForClasses(data.classes, currentUser?.curriculumProfile?.region);
  const isMainlandRegion = region === "MAINLAND";
  const [classId, setClassId] = useState(firstClass?.id ?? "");
  const [publisher, setPublisher] = useState<TextbookPublisher>("MAINLAND_PEP");
  const [topicId, setTopicId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedClass = data.classes.find((teacherClass) => teacherClass.id === classId);
  const topicOptions = data.topicOptions.filter((topic) =>
    (!selectedClass || topic.grade === selectedClass.grade) &&
    topic.publisher === publisher
  );
  const effectiveTopicId = topicId || topicOptions[0]?.id || "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/teacher/lesson-kits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        publisher,
        topicId: effectiveTopicId,
        lessonPeriod: Number(form.get("lessonPeriod") ?? 1),
        lessonType: form.get("lessonType"),
        durationMinutes: Number(form.get("durationMinutes") ?? 45)
      })
    });
    const payload = await response.json().catch(() => null) as { kit?: TeacherLessonKit; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.kit) {
      setError(payload?.error ?? t({ en: "Could not create lesson kit", zh: "建立失敗", zhHans: "创建失败" }));
      return;
    }
    router.push(`/teacher/lesson-kits/${payload.kit.id}`);
  }

  return (
    <form onSubmit={submit} className="glass-panel grid min-w-0 max-w-full gap-5 overflow-hidden p-5">
      <div className="min-w-0">
        <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300 sm:tracking-[0.22em]">{t({ en: "New lesson kit", zh: "新建備課包", zhHans: "新建备课包" })}</p>
        <h1 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white">{t({ en: "New lesson kit", zh: "新建備課包", zhHans: "新建备课包" })}</h1>
      </div>
      {!isMainlandRegion ? (
        <p className="rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-800 dark:border-amber-300/25 dark:text-amber-100">
          {t(lessonKitRegionNotice)}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          {t({ en: "Class", zh: "班級", zhHans: "班级" })}
          <select value={classId} onChange={(event) => { setClassId(event.target.value); setTopicId(""); }} className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            {data.classes.map((teacherClass) => (
              <option key={teacherClass.id} value={teacherClass.id}>
                {teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          {t({ en: "Textbook", zh: "教材", zhHans: "教材" })}
          <select value={publisher} onChange={(event) => { setPublisher(event.target.value as TextbookPublisher); setTopicId(""); }} className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            <option value="MAINLAND_PEP">{text(publisherLabels.MAINLAND_PEP)}</option>
            <option value="MAINLAND_BNU">{text(publisherLabels.MAINLAND_BNU)}</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200 md:col-span-2">
          {t({ en: "Chapter", zh: "章節", zhHans: "章节" })}
          <select value={effectiveTopicId} onChange={(event) => setTopicId(event.target.value)} className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            {topicOptions.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {formatGradeLabel(topic.grade, language, true)} · {text(topic.title)}
              </option>
            ))}
          </select>
          {!topicOptions.length ? (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-200">
              {t({
                en: "No chapters are available for this class and textbook yet, so a lesson kit cannot be created.",
                zh: "此班級與教材暫無可用章節，因此暫時無法建立備課包。",
                zhHans: "此班级与教材暂无可用章节，因此暂时无法创建备课包。"
              })}
            </span>
          ) : null}
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          {t({ en: "Period", zh: "課時", zhHans: "课时" })}
          <input name="lessonPeriod" type="number" min={1} max={12} defaultValue={1} className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          {t({ en: "Duration", zh: "時長", zhHans: "时长" })}
          <input name="durationMinutes" type="number" min={20} max={120} defaultValue={45} className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200 md:col-span-2">
          {t({ en: "Lesson type", zh: "課型", zhHans: "课型" })}
          <select name="lessonType" defaultValue="new-lesson" className="focus-ring h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            <option value="new-lesson">{text(lessonTypeLabels["new-lesson"])}</option>
            <option value="review">{text(lessonTypeLabels.review)}</option>
            <option value="practice">{text(lessonTypeLabels.practice)}</option>
            <option value="exam-prep">{text(lessonTypeLabels["exam-prep"])}</option>
          </select>
        </label>
      </div>
      {error ? <p className="break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">{error}</p> : null}
      <button disabled={busy || !classId || !effectiveTopicId} className="focus-ring h-12 min-w-0 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
        {busy ? t({ en: "Creating...", zh: "正在建立...", zhHans: "创建中..." }) : t({ en: "Create lesson kit", zh: "建立備課包", zhHans: "创建备课包" })}
      </button>
    </form>
  );
}

export function TeacherPrepDetailView({ initialKit }: { initialKit: TeacherLessonKit }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [kit, setKit] = useState(initialKit);
  const [activeId, setActiveId] = useState(initialKit.sections[0]?.id ?? "");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [publishResult, setPublishResult] = useState<TeacherLessonKitPublishResult | null>(() => publishResultFromKit(initialKit));
  const activeSection = kit.sections.find((section) => section.id === activeId) ?? kit.sections[0];

  function updateActiveContent(value: string) {
    setKit((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSection?.id
          ? { ...section, content: updateTextForLanguage(section.content, language, value) }
          : section
      )
    }));
  }

  async function patchKit(body: Record<string, unknown>) {
    const response = await fetch(`/api/teacher/lesson-kits/${kit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null) as { kit?: TeacherLessonKit; error?: string } | null;
    if (!response.ok || !payload?.kit) throw new Error(payload?.error ?? t({ en: "Update failed", zh: "更新失敗", zhHans: "更新失败" }));
    setKit(payload.kit);
    setActiveId(payload.kit.sections.find((section) => section.id === activeSection?.id)?.id ?? payload.kit.sections[0]?.id ?? "");
    return payload.kit;
  }

  async function runAction(action: "save" | "approve" | "generate" | "publish") {
    setBusy(action);
    setMessage("");
    try {
      if (action === "save") {
        await patchKit({ sections: kit.sections });
        setMessage(t({ en: "Saved", zh: "已儲存", zhHans: "已保存" }));
      }
      if (action === "approve") {
        await patchKit({ reviewStatus: "approved" });
        setMessage(t({ en: "Review approved", zh: "已確認審核", zhHans: "已确认审核" }));
      }
      if (action === "generate") {
        const response = await fetch(`/api/teacher/lesson-kits/${kit.id}/generation-runs`, { method: "POST" });
        const payload = await response.json().catch(() => null) as { kit?: TeacherLessonKit; error?: string } | null;
        if (!response.ok || !payload?.kit) throw new Error(payload?.error === "missing-config" ? t({ en: "LLM environment variables are missing. You can continue editing manually.", zh: "LLM 環境變數缺失，可繼續手動編輯。", zhHans: "LLM 环境变量缺失，可继续手动编辑。" }) : payload?.error ?? t({ en: "Generation failed", zh: "生成失敗", zhHans: "生成失败" }));
        setKit(payload.kit);
        setActiveId(payload.kit.sections[0]?.id ?? "");
        setMessage(t({ en: "Generated and ready for review", zh: "已生成，待審核", zhHans: "已生成，待审核" }));
      }
      if (action === "publish") {
        const response = await fetch(`/api/teacher/lesson-kits/${kit.id}/publications`, { method: "POST" });
        const payload = await response.json().catch(() => null) as { kit?: TeacherLessonKit; result?: TeacherLessonKitPublishResult; error?: string } | null;
        if (!response.ok || !payload?.kit) throw new Error(payload?.error === "needs-review" ? t({ en: "Approve the review first", zh: "請先確認審核", zhHans: "请先确认审核" }) : payload?.error ?? t({ en: "Publish failed", zh: "發佈失敗", zhHans: "发布失败" }));
        setKit(payload.kit);
        setPublishResult(payload.result ?? publishResultFromKit(payload.kit));
        setMessage(t({ en: "Published", zh: "已發佈", zhHans: "已发布" }));
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t({ en: "Action failed", zh: "操作失敗", zhHans: "操作失败" }));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <PrepBadge tone="cyan">{text(publisherLabels[kit.publisher])}</PrepBadge>
              <PrepBadge tone={kit.status === "published" ? "emerald" : "amber"}>{text(statusLabels[kit.status])}</PrepBadge>
              <PrepBadge>{text(reviewLabels[kit.reviewStatus])}</PrepBadge>
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{text(kit.lessonTitle)}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{kit.className} · {text(kit.chapterTitle)} · {formatLessonPeriod(kit.lessonPeriod, language)}</p>
          </div>
          <Link href="/teacher/lesson-kits" className="focus-ring rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">{t({ en: "Back to list", zh: "返回列表", zhHans: "返回列表" })}</Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="glass-panel h-fit p-3">
          {kit.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={cn(
                "focus-ring mb-2 w-full rounded-2xl px-3 py-3 text-left text-sm font-black transition",
                activeSection?.id === section.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-950/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]"
              )}
            >
              {text(sectionKindLabels[section.kind])}
            </button>
          ))}
        </aside>

        <main className="glass-panel min-w-0 p-5">
          {activeSection ? (
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{text(sectionKindLabels[activeSection.kind])}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{text(activeSection.title)}</h2>
              </div>
              <textarea
                value={text(activeSection.content)}
                onChange={(event) => updateActiveContent(event.target.value)}
                rows={8}
                className="focus-ring min-h-[220px] rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm font-semibold leading-7 text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
              <div className="grid gap-3">
                {activeSection.items.map((item, index) => (
                  <div key={`${activeSection.id}-item-${index}`} className="soft-panel p-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {text(item)}
                  </div>
                ))}
              </div>
              {activeSection.questions?.length ? (
                <div className="grid gap-3">
                  {activeSection.questions.map((question, index) => (
                    <div key={`${question.questionId ?? activeSection.id}-${index}`} className="soft-panel p-4">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{text(question.prompt)}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案", zhHans: "答案" })}: {question.answer}</p>
                      {question.explanation ? <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Explanation", zh: "解析", zhHans: "解析" })}: {text(question.explanation)}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </main>

        <aside className="glass-panel h-fit p-4">
          <div className="grid gap-3">
            <button disabled={Boolean(busy)} onClick={() => runAction("save")} className="focus-ring h-11 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200">
              {busy === "save" ? t({ en: "Saving...", zh: "正在儲存...", zhHans: "保存中..." }) : t({ en: "Save", zh: "儲存", zhHans: "保存" })}
            </button>
            <button disabled={Boolean(busy)} onClick={() => runAction("generate")} className="focus-ring h-11 rounded-2xl border border-cyan-200 bg-cyan-50 text-sm font-black text-cyan-700 disabled:opacity-50 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200">
              {busy === "generate" ? t({ en: "Generating...", zh: "正在生成...", zhHans: "生成中..." }) : t({ en: "Generate with AI", zh: "AI 生成", zhHans: "AI 生成" })}
            </button>
            <button disabled={Boolean(busy)} onClick={() => runAction("approve")} className="focus-ring h-11 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700 disabled:opacity-50 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
              {t({ en: "Approve review", zh: "確認審核", zhHans: "确认审核" })}
            </button>
            <button disabled={Boolean(busy) || kit.reviewStatus !== "approved"} onClick={() => runAction("publish")} className="focus-ring h-11 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {busy === "publish" ? t({ en: "Publishing...", zh: "正在發佈...", zhHans: "发布中..." }) : t({ en: "Publish and start class", zh: "發佈並開始授課", zhHans: "发布并开始授课" })}
            </button>
            {message ? <p className="rounded-2xl bg-slate-950/[0.04] px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{message}</p> : null}
            {publishResult ? <LessonKitPublishReadyPanel kit={kit} result={publishResult} /> : null}
            {kit.liveSessionId ? (
              <div className="grid gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                <Link href={`/teacher/classroom-sessions/${kit.liveSessionId}/presenter`} className="focus-ring rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">{t({ en: "Presenter screen", zh: "大屏授課", zhHans: "大屏授课" })}</Link>
                <Link href={`/teacher/classroom-sessions/${kit.liveSessionId}/controller`} className="focus-ring rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">{t({ en: "Mobile controller", zh: "移動控課", zhHans: "移动控课" })}</Link>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function TeacherLivePresentView({ session }: { session: TeacherLiveSession }) {
  const { text, t } = useSettings();
  const selectedSamples = session.workSamples.filter((sample) => sample.status === "selected");
  return (
    <div className="grid gap-5">
      <section className="glass-panel p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Present</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{text(session.lessonTitle)}</h1>
        <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{session.className} · {t({ en: "Class code", zh: "課堂碼", zhHans: "课堂码" })} {session.joinCode}</p>
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel min-h-[520px] p-6">
          {(session.slideSections ?? []).map((section) => (
            <article key={section.id} className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{text(sectionKindLabels[section.kind])}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text(section.title)}</h2>
              <p className="mt-4 text-lg font-semibold leading-9 text-slate-700 dark:text-slate-200">{text(section.content)}</p>
              <div className="mt-5 grid gap-3">
                {section.items.map((item, index) => (
                  <div key={`${section.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white/75 p-4 text-base font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">{text(item)}</div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="glass-panel p-5">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Student work on screen", zh: "學生成果上屏", zhHans: "学生成果上屏" })}</h2>
          <div className="mt-4 grid gap-4">
            {selectedSamples.map((sample) => <WorkSampleCard key={sample.id} sample={sample} />)}
            {!selectedSamples.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No selected work yet", zh: "暫無選中作品", zhHans: "暂无选中作品" })}</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function WorkSampleCard({ sample }: { sample: ClassroomWorkSample }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sample.imageDataUrl} alt={sample.caption || sample.studentName} className="h-56 w-full object-contain bg-slate-100 dark:bg-slate-950/60" />
      <div className="p-3">
        <p className="text-sm font-black text-slate-950 dark:text-white">{sample.studentName}</p>
        {sample.caption ? <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{sample.caption}</p> : null}
      </div>
    </div>
  );
}

export function TeacherLiveControllerView({ session: initialSession }: { session: TeacherLiveSession }) {
  const { text, t } = useSettings();
  const [samples, setSamples] = useState(initialSession.workSamples);
  const [busy, setBusy] = useState("");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");

  async function updateSample(sampleId: string, status: "selected" | "hidden" | "submitted") {
    setBusy(sampleId);
    const response = await fetch(`/api/classroom/live/${initialSession.id}/work-samples`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleId, status })
    });
    const payload = await response.json().catch(() => null) as { samples?: ClassroomWorkSample[]; error?: string } | null;
    setBusy("");
    if (!response.ok || !payload?.samples) {
      setMessage(payload?.error ?? t({ en: "Update failed", zh: "更新失敗", zhHans: "更新失败" }));
      return;
    }
    setSamples(payload.samples);
    setMessage(status === "selected" ? t({ en: "Sent to screen", zh: "已上屏", zhHans: "已上屏" }) : t({ en: "Updated", zh: "已更新", zhHans: "已更新" }));
  }

  async function upload(file: File | null) {
    if (!file) return;
    setBusy("upload");
    const reader = new FileReader();
    reader.onload = async () => {
      const response = await fetch(`/api/classroom/live/${initialSession.id}/work-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: String(reader.result), caption })
      });
      const payload = await response.json().catch(() => null) as { sample?: ClassroomWorkSample; error?: string } | null;
      setBusy("");
      if (!response.ok || !payload?.sample) {
        setMessage(payload?.error ?? t({ en: "Upload failed", zh: "上載失敗", zhHans: "上传失败" }));
        return;
      }
      setSamples((current) => [payload.sample as ClassroomWorkSample, ...current]);
      setCaption("");
      setMessage(t({ en: "Uploaded", zh: "已上載", zhHans: "已上传" }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-5">
      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Controller</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text(initialSession.lessonTitle)}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{initialSession.className} · {t({ en: "Class code", zh: "課堂碼", zhHans: "课堂码" })} {initialSession.joinCode}</p>
          </div>
          <Link href={`/teacher/classroom-sessions/${initialSession.id}/presenter`} className="focus-ring rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Screen", zh: "大屏", zhHans: "大屏" })}</Link>
        </div>
      </section>
      <section className="glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={t({ en: "Work note", zh: "作品說明", zhHans: "作品说明" })} className="focus-ring h-11 rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
          <label className="focus-ring flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">
            {busy === "upload" ? t({ en: "Uploading...", zh: "正在上載...", zhHans: "上传中..." }) : t({ en: "Upload work", zh: "上載作品", zhHans: "上传作品" })}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => upload(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{message}</p> : null}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {samples.map((sample) => (
          <div key={sample.id} className="soft-panel overflow-hidden">
            <WorkSampleCard sample={sample} />
            <div className="grid grid-cols-3 gap-2 p-3">
              <button disabled={busy === sample.id} onClick={() => updateSample(sample.id, "selected")} className="focus-ring rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{t({ en: "Screen", zh: "上屏", zhHans: "上屏" })}</button>
              <button disabled={busy === sample.id} onClick={() => updateSample(sample.id, "submitted")} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200">{t({ en: "Candidate", zh: "候選", zhHans: "候选" })}</button>
              <button disabled={busy === sample.id} onClick={() => updateSample(sample.id, "hidden")} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200">{t({ en: "Hide", zh: "隱藏", zhHans: "隐藏" })}</button>
            </div>
          </div>
        ))}
        {!samples.length ? <div className="soft-panel p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No work yet", zh: "暫無作品", zhHans: "暂无作品" })}</div> : null}
      </section>
    </div>
  );
}
