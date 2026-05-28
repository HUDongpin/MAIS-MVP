"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  assessmentSourceTypeLabels,
  assessmentStatusLabels,
  assessmentSubmissionStatusLabels,
  assessmentTypeLabels
} from "@/components/teacher/teacherLabels";
import { gradeIds } from "@/data/grades";
import { formatDifficultyLabel, formatGradeLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import type {
  Assessment,
  AssessmentSourceType,
  AssessmentType,
  Difficulty,
  GradeId,
  Language,
  LocalizedText,
  TeacherAssessmentCreateData,
  TeacherAssessmentDetailData,
  TeacherAssessmentListData,
  TeacherResourceLibraryData,
  TeachingResource,
  TeachingResourceType
} from "@/types";

const grades = gradeIds;
const difficulties: Difficulty[] = ["Foundation", "Core", "Challenge", "Exam"];
const resourceTypes: TeachingResourceType[] = ["slides", "practice", "quiz", "worksheet", "exam-paper", "marking-scheme", "image", "document", "other"];
const resourceTypeLabels: Record<TeachingResourceType, LocalizedText> = {
  slides: { en: "Slides", zh: "簡報", zhHans: "简报" },
  practice: { en: "Practice", zh: "練習", zhHans: "练习" },
  quiz: { en: "Quiz", zh: "小測", zhHans: "小测" },
  worksheet: { en: "Worksheet", zh: "工作紙", zhHans: "工作纸" },
  "exam-paper": { en: "Exam paper", zh: "試卷", zhHans: "试卷" },
  "marking-scheme": { en: "Marking scheme", zh: "評分參考", zhHans: "评分参考" },
  image: { en: "Image", zh: "圖像", zhHans: "图像" },
  document: { en: "Document", zh: "文件", zhHans: "文件" },
  other: { en: "Other", zh: "其他", zhHans: "其他" }
};
const assessmentTypes: AssessmentType[] = ["quiz", "test", "mock-exam", "exam"];
const assessmentSourceTypes: AssessmentSourceType[] = ["question-bank", "manual", "resource", "mistake-generated"];

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return textForLanguage({ en: "Not set", zh: "未設定" }, language);
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function fileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function formatTimeLimit(value: number | null, language: Language) {
  if (value === null) return "--";
  return `${value} ${textForLanguage({ en: "min", zh: "分鐘" }, language)}`;
}

function formatAttemptLimit(value: number, language: Language) {
  return `${value}${textForLanguage({ en: "x", zh: "次" }, language)}`;
}

function StatusPill({ value, label }: { value: string; label: string }) {
  const tone =
    value === "open" || value === "graded"
      ? "border-emerald-300/55 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100"
      : value === "scheduled" || value === "submitted"
        ? "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100"
        : "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>{label}</span>;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="soft-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black gradient-text">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

export function TeacherResourcesView({ data }: { data: TeacherResourceLibraryData }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [grade, setGrade] = useState<GradeId | "all">("all");
  const [topicId, setTopicId] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [recentOnly, setRecentOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const topicById = useMemo(() => new Map(data.topicOptions.map((topic) => [topic.id, topic])), [data.topicOptions]);
  const fileTypes = useMemo(() => Array.from(new Set(data.resources.map((resource) => resource.fileType))).sort(), [data.resources]);
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filteredResources = data.resources.filter((resource) => {
    const gradeMatches = grade === "all" || resource.grade === grade;
    const topicMatches = topicId === "all" || resource.topicId === topicId;
    const fileTypeMatches = fileType === "all" || resource.fileType === fileType;
    const recentMatches = !recentOnly || Date.parse(resource.createdAt) >= recentCutoff;
    return gradeMatches && topicMatches && fileTypeMatches && recentMatches;
  });

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/resources", {
      method: "POST",
      body: form
    });
    setIsSaving(false);
    if (!response.ok) {
      setError(t({ en: "Could not upload this resource. Check the file type and metadata.", zh: "未能上載此資源，請檢查檔案類型及資料。" }));
      return;
    }
    formElement.reset();
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Resources", zh: "資料庫" })}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Teaching resources and papers", zh: "課件與試卷資料庫" })}</h1>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label={t({ en: "Files", zh: "檔案" })} value={String(data.totals.resources)} detail={t({ en: "Uploaded resources", zh: "已上載資源" })} />
          <StatCard label={t({ en: "This week", zh: "本週" })} value={String(data.totals.uploadedThisWeek)} detail={t({ en: "Recent uploads", zh: "最近上載" })} />
          <StatCard label={t({ en: "Assignments", zh: "作業" })} value={String(data.totals.assignmentReferences)} detail={t({ en: "Resource links", zh: "資源引用" })} />
          <StatCard label={t({ en: "Assessments", zh: "測驗" })} value={String(data.totals.assessmentReferences)} detail={t({ en: "Paper links", zh: "試卷引用" })} />
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Upload resource", zh: "上載資源" })}</h2>
        <form onSubmit={handleUpload} className="mt-5 grid gap-4 lg:grid-cols-4">
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Title", zh: "標題" })}</span>
            <input name="title" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Grade", zh: "年級" })}</span>
            <select name="grade" defaultValue="S3" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item, language, true)}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Type", zh: "類型" })}</span>
            <select name="type" defaultValue="slides" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {resourceTypes.map((item) => <option key={item} value={item}>{t(resourceTypeLabels[item])}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Topic", zh: "課題" })}</span>
            <select name="topicId" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="">{t({ en: "No topic", zh: "不指定" })}</option>
              {data.topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{formatGradeLabel(topic.grade, language, true)} · {text(topic.title)}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Difficulty", zh: "難度" })}</span>
            <select name="difficulty" defaultValue="Core" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {difficulties.map((item) => <option key={item} value={item}>{formatDifficultyLabel(item, language)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">PPTX / DOCX / PDF / PNG / JPG / WEBP</span>
            <input name="file" type="file" required accept=".pptx,.docx,.pdf,.png,.jpg,.jpeg,.webp" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <div className="flex items-end">
            <button disabled={isSaving} type="submit" className="focus-ring w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {isSaving ? t({ en: "Uploading", zh: "上載中" }) : t({ en: "Upload", zh: "上載" })}
            </button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Resource library", zh: "資源列表" })}</h2>
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-4">
            <select value={grade} onChange={(event) => setGrade(event.target.value as GradeId | "all")} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All grades", zh: "全部年級" })}</option>
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item, language, true)}</option>)}
            </select>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All topics", zh: "全部課題" })}</option>
              {data.topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{text(topic.title)}</option>)}
            </select>
            <select value={fileType} onChange={(event) => setFileType(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All file types", zh: "全部格式" })}</option>
              {fileTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="soft-panel flex items-center gap-2 px-3 py-2 text-sm font-black">
              <input checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} type="checkbox" />
              {t({ en: "Recent", zh: "最近" })}
            </label>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:hidden">
          {filteredResources.map((resource) => (
            <article key={resource.id} className="soft-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-black text-slate-950 dark:text-white">{text(resource.title)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{resource.id}</p>
                </div>
                <a href={`/api/teacher/resources/${encodeURIComponent(resource.id)}/download`} className="focus-ring shrink-0 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                  {t({ en: "Download", zh: "下載" })}
                </a>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Grade / topic", zh: "年級 / 課題" })}</dt>
                  <dd className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatGradeLabel(resource.grade, language, true)}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resource.topicId ? text(topicById.get(resource.topicId)?.title ?? { en: resource.topicId, zh: resource.topicId }) : t({ en: "No topic", zh: "不指定" })}</p>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Type", zh: "類型" })}</dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">{t(resourceTypeLabels[resource.type])}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "File", zh: "檔案" })}</dt>
                  <dd className="mt-1 break-words font-bold text-slate-900 dark:text-white">
                    {resource.fileName}
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{resource.fileType} · {fileSize(resource.fileSizeBytes)}</p>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "References", zh: "引用" })}</dt>
                  <dd className="mt-1 text-xs font-black text-slate-600 dark:text-slate-300">
                    {t({ en: "Assignment", zh: "作業" })}: {resource.referenceCounts.assignments} · {t({ en: "Assessment", zh: "測驗" })}: {resource.referenceCounts.assessments}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Uploaded", zh: "上載時間" })}</dt>
                  <dd className="mt-1 font-bold text-slate-900 dark:text-white">{formatDate(resource.createdAt, language)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-5 hidden xl:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-3">{t({ en: "Resource", zh: "資源" })}</th>
                <th className="py-3 pr-3">{t({ en: "Grade / topic", zh: "年級 / 課題" })}</th>
                <th className="py-3 pr-3">{t({ en: "Type", zh: "類型" })}</th>
                <th className="py-3 pr-3">{t({ en: "File", zh: "檔案" })}</th>
                <th className="py-3 pr-3">{t({ en: "References", zh: "引用" })}</th>
                <th className="py-3 pr-3">{t({ en: "Uploaded", zh: "上載時間" })}</th>
                <th className="py-3">{t({ en: "Actions", zh: "操作" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {filteredResources.map((resource) => (
                <tr key={resource.id}>
                  <td className="py-4 pr-3 align-top">
                    <p className="break-words font-black text-slate-950 dark:text-white">{text(resource.title)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{resource.id}</p>
                  </td>
                  <td className="py-4 pr-3 align-top font-bold">
                    {formatGradeLabel(resource.grade, language, true)}
                    <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{resource.topicId ? text(topicById.get(resource.topicId)?.title ?? { en: resource.topicId, zh: resource.topicId }) : t({ en: "No topic", zh: "不指定" })}</p>
                  </td>
                  <td className="py-4 pr-3 align-top">
                    <span className="inline-flex max-w-full rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black leading-tight dark:border-white/10 dark:bg-white/[0.07]">{t(resourceTypeLabels[resource.type])}</span>
                  </td>
                  <td className="py-4 pr-3 align-top">
                    <p className="break-words font-bold">{resource.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resource.fileType} · {fileSize(resource.fileSizeBytes)}</p>
                  </td>
                  <td className="py-4 pr-3 align-top text-xs font-black text-slate-600 dark:text-slate-300">
                    {t({ en: "Assignment", zh: "作業" })}: {resource.referenceCounts.assignments} · {t({ en: "Assessment", zh: "測驗" })}: {resource.referenceCounts.assessments}
                  </td>
                  <td className="py-4 pr-3 align-top font-bold">{formatDate(resource.createdAt, language)}</td>
                  <td className="py-4 align-top">
                    <a href={`/api/teacher/resources/${encodeURIComponent(resource.id)}/download`} className="focus-ring inline-flex max-w-full rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black leading-tight dark:border-white/10 dark:bg-white/[0.07]">
                      {t({ en: "Download", zh: "下載" })}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredResources.length ? <p className="soft-panel mt-4 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No resources match these filters.", zh: "沒有符合篩選的資源。" })}</p> : null}
      </section>
    </div>
  );
}

export function TeacherAssessmentsView({ data }: { data: TeacherAssessmentListData }) {
  const { language, text, t } = useSettings();
  const classById = new Map(data.classes.map((teacherClass) => [teacherClass.id, teacherClass]));

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Assessments", zh: "測驗" })}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Quiz, test, and mock exam management", zh: "測驗與考試管理" })}</h1>
          </div>
          <Link href="/teacher/assessments/new" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "New assessment", zh: "新增測驗" })}</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label={t({ en: "Assessments", zh: "測驗" })} value={String(data.totals.assessments)} detail={t({ en: "Created", zh: "已建立" })} />
          <StatCard label={t({ en: "Open", zh: "進行中" })} value={String(data.totals.openAssessments)} detail={t({ en: "Scheduled or open", zh: "已排程或開放" })} />
          <StatCard label={t({ en: "Submissions", zh: "提交" })} value={String(data.totals.submittedCount)} detail={t({ en: "Student attempts", zh: "學生作答" })} />
          <StatCard label={t({ en: "Avg score", zh: "平均分" })} value={data.totals.averageScore === null ? "--" : `${data.totals.averageScore}%`} detail={t({ en: "Submitted papers", zh: "已提交試卷" })} />
        </div>
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Assessment", zh: "測驗" })}</th>
                <th className="py-3 pr-4">{t({ en: "Class", zh: "班級" })}</th>
                <th className="py-3 pr-4">{t({ en: "Source", zh: "來源" })}</th>
                <th className="py-3 pr-4">{t({ en: "Settings", zh: "設定" })}</th>
                <th className="py-3 pr-4">{t({ en: "Status", zh: "狀態" })}</th>
                <th className="py-3">{t({ en: "Submissions", zh: "提交" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {data.assessments.map((assessment) => {
                const teacherClass = classById.get(assessment.classId);
                return (
                  <tr key={assessment.id}>
                    <td className="py-4 pr-4">
                      <Link href={`/teacher/assessments/${assessment.id}`} className="focus-ring rounded-xl font-black text-slate-950 underline-offset-4 hover:underline dark:text-white">
                        {text(assessment.title)}
                      </Link>
                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{text(assessmentTypeLabels[assessment.type])} · {formatDate(assessment.closesAt, language)}</p>
                    </td>
                    <td className="py-4 pr-4 font-bold">{teacherClass?.name ?? assessment.classId}</td>
                    <td className="py-4 pr-4 font-bold">{text(assessmentSourceTypeLabels[assessment.sourceType])}</td>
                    <td className="py-4 pr-4 text-xs font-bold text-slate-600 dark:text-slate-300">{formatTimeLimit(assessment.timeLimitMinutes, language)} · {formatAttemptLimit(assessment.maxAttempts, language)} · {assessment.gradeWeight}%</td>
                    <td className="py-4 pr-4"><StatusPill value={assessment.status} label={text(assessmentStatusLabels[assessment.status])} /></td>
                    <td className="py-4 font-black">{assessment.submittedCount}/{assessment.submissionCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.assessments.length ? <p className="soft-panel mt-4 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No assessments yet.", zh: "尚未建立測驗。" })}</p> : null}
        </div>
      </section>
    </div>
  );
}

function parseManualQuestions(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [prompt, answer, points] = line.split("|").map((part) => part.trim());
      if (!prompt || !answer) return null;
      return {
        id: `manual-${index + 1}`,
        prompt: { en: prompt, zh: prompt },
        answer,
        points: Number(points) > 0 ? Number(points) : 10
      };
    })
    .filter((question): question is { id: string; prompt: { en: string; zh: string }; answer: string; points: number } => Boolean(question));
}

export function TeacherAssessmentNewView({ data }: { data: TeacherAssessmentCreateData }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [sourceType, setSourceType] = useState<AssessmentSourceType>("question-bank");
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id ?? "");
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");
  const selectedClass = data.classes.find((teacherClass) => teacherClass.id === selectedClassId) ?? data.classes[0];
  const questionOptions = data.questionBank.filter((question) => !selectedClass || question.grade === selectedClass.grade).slice(0, 16);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/teacher/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        title: form.get("title"),
        type: form.get("type"),
        sourceType,
        sourceResourceId: form.get("sourceResourceId"),
        questionIds: form.getAll("questionIds").map(String),
        manualQuestions: parseManualQuestions(manualText),
        opensAt: form.get("opensAt"),
        closesAt: form.get("closesAt"),
        timeLimitMinutes: Number(form.get("timeLimitMinutes") || 0),
        maxAttempts: Number(form.get("maxAttempts") || 1),
        randomizeQuestionOrder: form.get("randomizeQuestionOrder") === "on",
        showAnswersImmediately: form.get("showAnswersImmediately") === "on",
        gradeWeight: Number(form.get("gradeWeight") || 10)
      })
    });
    const payload = await response.json().catch(() => null) as { assessment?: Assessment; error?: string } | null;
    if (!response.ok || !payload?.assessment) {
      setError(t({ en: "Could not create this assessment yet.", zh: "暫時未能建立此測驗。" }));
      return;
    }
    router.push(`/teacher/assessments/${payload.assessment.id}`);
  };

  return (
    <section className="glass-panel p-5 sm:p-6">
      <Link href="/teacher/assessments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assessments", zh: "返回測驗" })}</Link>
      <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Create assessment", zh: "建立測驗" })}</h1>
      {!data.classes.length ? (
        <p className="soft-panel mt-5 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Create a class before creating assessments.", zh: "請先建立班級，然後再建立測驗。" })}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Class", zh: "班級" })}</span>
              <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                {data.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Assessment type", zh: "測驗類型" })}</span>
              <select name="type" defaultValue="quiz" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                {assessmentTypes.map((item) => <option key={item} value={item}>{text(assessmentTypeLabels[item])}</option>)}
              </select>
            </label>
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-black">{t({ en: "Title", zh: "標題" })}</span>
              <input name="title" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {assessmentSourceTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSourceType(item)}
                className={`focus-ring rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${sourceType === item ? "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}
              >
                {text(assessmentSourceTypeLabels[item])}
              </button>
            ))}
          </div>

          {sourceType === "resource" ? (
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Uploaded paper/resource", zh: "已上載試卷 / 資源" })}</span>
              <select name="sourceResourceId" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                {data.resources.map((resource) => <option key={resource.id} value={resource.id}>{formatGradeLabel(resource.grade, language, true)} · {text(resource.title)} · {resource.fileType}</option>)}
              </select>
            </label>
          ) : null}

          {sourceType === "question-bank" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {questionOptions.map((question) => (
                <label key={question.id} className="soft-panel flex gap-3 p-3 text-sm font-bold">
                  <input name="questionIds" value={question.id} type="checkbox" defaultChecked={questionOptions.indexOf(question) < 4} />
                  <span>{text(question.topicTitle)} · {text(question.prompt)}</span>
                </label>
              ))}
            </div>
          ) : null}

          {sourceType === "manual" ? (
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Manual questions", zh: "手動題目" })}</span>
              <textarea
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                rows={6}
                placeholder={t({ en: "One per line: prompt | answer | points", zh: "每行一題：題目 | 答案 | 分數" })}
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]"
              />
            </label>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Opens", zh: "開始" })}</span><input name="opensAt" type="datetime-local" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Closes", zh: "結束" })}</span><input name="closesAt" type="datetime-local" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Time limit", zh: "時限" })}</span><input name="timeLimitMinutes" type="number" min="0" defaultValue="25" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Weight", zh: "比重" })}</span><input name="gradeWeight" type="number" min="0" defaultValue="10" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Attempts", zh: "可嘗試次數" })}</span><input name="maxAttempts" type="number" min="1" defaultValue="1" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="randomizeQuestionOrder" type="checkbox" defaultChecked />{t({ en: "Random order", zh: "隨機題序" })}</label>
            <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="showAnswersImmediately" type="checkbox" />{t({ en: "Show answers immediately", zh: "即時顯示答案" })}</label>
          </div>
          {error ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
          <button className="focus-ring w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Create assessment", zh: "建立測驗" })}</button>
        </form>
      )}
    </section>
  );
}

export function TeacherAssessmentDetailView({ detail }: { detail: TeacherAssessmentDetailData }) {
  const { language, text, t } = useSettings();
  const submissionRate = detail.assessment.submissionCount
    ? Math.round((detail.submittedCount / detail.assessment.submissionCount) * 100)
    : 0;

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/teacher/assessments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assessments", zh: "返回測驗" })}</Link>
            <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{text(detail.assessment.title)}</h1>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{detail.class.name} · {text(assessmentTypeLabels[detail.assessment.type])} · {text(assessmentSourceTypeLabels[detail.assessment.sourceType])}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill value={detail.assessment.status} label={text(assessmentStatusLabels[detail.assessment.status])} />
            <a href={`/api/teacher/assessments/${detail.assessment.id}/export`} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Export CSV", zh: "匯出 CSV" })}
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label={t({ en: "Average", zh: "平均分" })} value={detail.averageScore === null ? "--" : `${detail.averageScore}%`} detail={t({ en: "Submitted papers", zh: "已提交試卷" })} />
          <StatCard label={t({ en: "Completion", zh: "完成率" })} value={`${submissionRate}%`} detail={`${detail.submittedCount}/${detail.assessment.submissionCount}`} />
          <StatCard label={t({ en: "Questions", zh: "題目" })} value={String(detail.questionAnalytics.length)} detail={detail.sourceResource ? text(detail.sourceResource.title) : text(assessmentSourceTypeLabels[detail.assessment.sourceType])} />
          <StatCard label={t({ en: "Weight", zh: "比重" })} value={`${detail.assessment.gradeWeight}%`} detail={formatTimeLimit(detail.assessment.timeLimitMinutes, language)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="glass-panel p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Score distribution", zh: "分數分佈" })}</h2>
          <div className="mt-5 grid gap-3">
            {detail.scoreDistribution.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                  <span>{bucket.label}</span>
                  <span>{bucket.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${detail.submissions.length ? Math.round((bucket.count / detail.submissions.length) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Common wrong questions", zh: "常錯題" })}</h2>
          <div className="mt-5 grid gap-3">
            {detail.commonWrongQuestions.map((question) => (
              <div key={question.questionId} className="soft-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-2xl text-sm font-black text-slate-950 dark:text-white">{text(question.prompt)}</p>
                  <span className="rounded-full border border-amber-300/55 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-100">{question.correctRate ?? "--"}%</span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Common wrong answer", zh: "常見錯答" })}: {question.commonWrongAnswer ?? "--"}</p>
              </div>
            ))}
            {!detail.commonWrongQuestions.length ? <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No submitted answers yet.", zh: "尚未有提交答案。" })}</p> : null}
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Per-question correctness", zh: "每題正確率" })}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Question", zh: "題目" })}</th>
                <th className="py-3 pr-4">{t({ en: "Correct rate", zh: "正確率" })}</th>
                <th className="py-3 pr-4">{t({ en: "Correct", zh: "答對" })}</th>
                <th className="py-3">{t({ en: "Common wrong", zh: "常見錯答" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {detail.questionAnalytics.map((question) => (
                <tr key={question.questionId}>
                  <td className="py-4 pr-4 font-bold">{text(question.prompt)}</td>
                  <td className="py-4 pr-4 font-black">{question.correctRate === null ? "--" : `${question.correctRate}%`}</td>
                  <td className="py-4 pr-4">{question.correctCount}/{question.totalResponses}</td>
                  <td className="py-4">{question.commonWrongAnswer ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student submissions", zh: "學生提交狀態" })}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Student", zh: "學生" })}</th>
                <th className="py-3 pr-4">{t({ en: "Status", zh: "狀態" })}</th>
                <th className="py-3 pr-4">{t({ en: "Score", zh: "分數" })}</th>
                <th className="py-3 pr-4">{t({ en: "Attempt", zh: "嘗試" })}</th>
                <th className="py-3">{t({ en: "Submitted", zh: "提交時間" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {detail.submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="py-4 pr-4 font-black text-slate-950 dark:text-white">{submission.studentName}</td>
                  <td className="py-4 pr-4"><StatusPill value={submission.status} label={text(assessmentSubmissionStatusLabels[submission.status])} /></td>
                  <td className="py-4 pr-4 font-black">{submission.score === null ? "--" : `${submission.score}/${submission.maxScore}`}</td>
                  <td className="py-4 pr-4">{submission.attemptNumber}/{detail.assessment.maxAttempts}</td>
                  <td className="py-4">{formatDate(submission.submittedAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
