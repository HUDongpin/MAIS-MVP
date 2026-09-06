"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { QuestionFigure } from "@/components/practice/QuestionFigure";
import { useSettings } from "@/components/providers/AppProviders";
import {
  assessmentSourceTypeLabels,
  assessmentStatusLabels,
  assessmentSubmissionStatusLabels,
  assessmentTypeLabels
} from "@/components/teacher/teacherLabels";
import { gradeIds } from "@/data/grades";
import { visibleDifficultiesForSelection } from "@/lib/difficulty";
import { formatDifficultyLabel, formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { formatDateInHongKong } from "@/lib/utils";
import type {
  Assessment,
  AssessmentAnalysisBorderlineType,
  AssessmentEmbeddedQuestion,
  AssessmentPaperItem,
  AssessmentPaperSection,
  AssessmentSubmission,
  AssessmentType,
  Difficulty,
  GradeId,
  Language,
  LocalizedText,
  QuestionType,
  TeacherAssessmentCreateData,
  TeacherAssessmentDetailData,
  TeacherAssessmentListData,
  TeacherAssessmentQuestionOption,
  TeacherReviewLessonPlan,
  TeacherResourceLibraryData,
  TeachingResource,
  TeachingResourceType
} from "@/types";

const grades = gradeIds;
const difficulties = visibleDifficultiesForSelection;
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
const questionTypes: QuestionType[] = ["multiple-choice", "fill-in", "short-answer", "graph"];
const questionTypeLabels: Record<QuestionType, LocalizedText> = {
  "multiple-choice": { en: "Multiple choice", zh: "選擇題", zhHans: "选择题" },
  "fill-in": { en: "Fill in", zh: "填充題", zhHans: "填空题" },
  "short-answer": { en: "Short answer", zh: "短答題", zhHans: "简答题" },
  graph: { en: "Graph", zh: "圖像題", zhHans: "图像题" }
};

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return textForLanguage({ en: "Not set", zh: "未設定", zhHans: "未设定" }, language);
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function formatTimeLimit(value: number | null, language: Language) {
  if (value === null) return "--";
  return `${value} ${textForLanguage({ en: "min", zh: "分鐘", zhHans: "分钟" }, language)}`;
}

function formatAttemptLimit(value: number, language: Language) {
  return `${value}${textForLanguage({ en: "x", zh: "次", zhHans: "次" }, language)}`;
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
    <div className="soft-panel min-w-0 p-4">
      <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-3xl font-black gradient-text">{value}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function assignmentHrefForAssessment(assessment: Assessment, assignmentTitle: string) {
  return `/teacher/assignments/new?classId=${encodeURIComponent(assessment.classId)}&contentType=assessment&targetId=${encodeURIComponent(assessment.id)}&title=${encodeURIComponent(assignmentTitle)}`;
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
  const [uploadedResource, setUploadedResource] = useState<TeachingResource | null>(null);

  const topicById = useMemo(() => new Map(data.topicOptions.map((topic) => [topic.id, topic])), [data.topicOptions]);
  const fileTypes = useMemo(() => Array.from(new Set(data.resources.map((resource) => resource.fileType))).sort(), [data.resources]);
  const assignmentHrefForResource = (resource: TeachingResource) =>
    `/teacher/assignments/new?contentType=resource&targetId=${encodeURIComponent(resource.id)}&title=${encodeURIComponent(text(resource.title))}`;
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
    setUploadedResource(null);
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/resources", {
      method: "POST",
      body: form
    });
    setIsSaving(false);
    const payload = await response.json().catch(() => null) as { resource?: TeachingResource; error?: string } | null;
    if (!response.ok || !payload?.resource) {
      setError(t({ en: "Could not upload this resource. Check the file type and metadata.", zh: "未能上載此資源，請檢查檔案類型及資料。", zhHans: "未能上载此资源，请检查档案类型及资料。" }));
      return;
    }
    setUploadedResource(payload.resource);
    formElement.reset();
    router.refresh();
  };

  return (
    <div className="grid min-w-0 gap-6">
      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <p className="break-words text-sm font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300 sm:tracking-[0.24em]">{t({ en: "Resources", zh: "資料庫", zhHans: "资料库" })}</p>
        <h1 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{t({ en: "Teaching resources and papers", zh: "課件與試卷資料庫", zhHans: "课件与试卷资料库" })}</h1>
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-4">
          <StatCard label={t({ en: "Files", zh: "檔案", zhHans: "档案" })} value={String(data.totals.resources)} detail={t({ en: "Uploaded resources", zh: "已上載資源", zhHans: "已上载资源" })} />
          <StatCard label={t({ en: "This week", zh: "本週", zhHans: "本周" })} value={String(data.totals.uploadedThisWeek)} detail={t({ en: "Recent uploads", zh: "最近上載", zhHans: "最近上载" })} />
          <StatCard label={t({ en: "Assignments", zh: "作業", zhHans: "作业" })} value={String(data.totals.assignmentReferences)} detail={t({ en: "Resource links", zh: "資源引用", zhHans: "资源引用" })} />
          <StatCard label={t({ en: "Assessments", zh: "測驗", zhHans: "测验" })} value={String(data.totals.assessmentReferences)} detail={t({ en: "Paper links", zh: "試卷引用", zhHans: "试卷引用" })} />
        </div>
      </section>

      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <h2 className="break-words text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Upload resource", zh: "上載資源", zhHans: "上载资源" })}</h2>
        <form onSubmit={handleUpload} className="mt-5 grid min-w-0 gap-4 lg:grid-cols-4">
          <label className="grid min-w-0 gap-2 lg:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Title", zh: "標題", zhHans: "标题" })}</span>
            <input name="title" required className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Grade", zh: "年級", zhHans: "年级" })}</span>
            <select name="grade" defaultValue="S3" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item, language, true)}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Type", zh: "類型", zhHans: "类型" })}</span>
            <select name="type" defaultValue="slides" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {resourceTypes.map((item) => <option key={item} value={item}>{t(resourceTypeLabels[item])}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Topic", zh: "課題", zhHans: "课题" })}</span>
            <select name="topicId" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="">{t({ en: "No topic", zh: "不指定", zhHans: "不指定" })}</option>
              {data.topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{formatGradeLabel(topic.grade, language, true)} · {text(topic.title)}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Difficulty", zh: "難度", zhHans: "难度" })}</span>
            <select name="difficulty" defaultValue="Medium" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {difficulties.map((item) => <option key={item} value={item}>{formatDifficultyLabel(item, language)}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 lg:col-span-2">
            <span className="break-words text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 sm:tracking-[0.16em]">PPTX / DOCX / PDF / PNG / JPG / WEBP</span>
            <input name="file" type="file" required accept=".pptx,.docx,.pdf,.png,.jpg,.jpeg,.webp" className="focus-ring min-w-0 w-full max-w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <div className="flex min-w-0 items-end">
            <button disabled={isSaving} type="submit" className="focus-ring w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {isSaving ? t({ en: "Uploading", zh: "上載中", zhHans: "上载中" }) : t({ en: "Upload", zh: "上載", zhHans: "上载" })}
            </button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        {uploadedResource ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/60 bg-emerald-400/12 p-4 text-sm text-emerald-900 dark:text-emerald-100">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-xs font-black uppercase tracking-[0.14em]">{t({ en: "Resource ready", zh: "資源已就緒", zhHans: "资源已就绪" })}</p>
                <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{text(uploadedResource.title)}</p>
                <p className="mt-1 break-words text-xs font-bold">{uploadedResource.fileName} · {uploadedResource.fileType} · {fileSize(uploadedResource.fileSizeBytes)}</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <a href={`/api/teacher/resources/${encodeURIComponent(uploadedResource.id)}/downloads`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
                  {t({ en: "Download", zh: "下載", zhHans: "下载" })}
                </a>
                <Link href={assignmentHrefForResource(uploadedResource)} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                  {t({ en: "Create assignment", zh: "建立作業", zhHans: "建立作业" })}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <h2 className="break-words text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Resource library", zh: "資源列表", zhHans: "资源列表" })}</h2>
          <div className="grid min-w-0 w-full gap-3 md:w-auto md:grid-cols-4">
            <select value={grade} onChange={(event) => setGrade(event.target.value as GradeId | "all")} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All grades", zh: "全部年級", zhHans: "全部年级" })}</option>
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item, language, true)}</option>)}
            </select>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All topics", zh: "全部課題", zhHans: "全部课题" })}</option>
              {data.topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{text(topic.title)}</option>)}
            </select>
            <select value={fileType} onChange={(event) => setFileType(event.target.value)} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="all">{t({ en: "All file types", zh: "全部格式", zhHans: "全部格式" })}</option>
              {fileTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="soft-panel flex min-w-0 items-center gap-2 px-3 py-2 text-sm font-black">
              <input checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} type="checkbox" />
              <span className="min-w-0 break-words">{t({ en: "Recent", zh: "最近", zhHans: "最近" })}</span>
            </label>
          </div>
        </div>
        <div className="mt-5 grid min-w-0 gap-3 xl:hidden">
          {filteredResources.map((resource) => (
            <article key={resource.id} className="soft-panel min-w-0 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-black text-slate-950 dark:text-white">{text(resource.title)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{resource.id}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <a href={`/api/teacher/resources/${encodeURIComponent(resource.id)}/downloads`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                    {t({ en: "Download", zh: "下載", zhHans: "下载" })}
                  </a>
                  <Link href={assignmentHrefForResource(resource)} className="focus-ring rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                    {t({ en: "Assign", zh: "布置", zhHans: "布置" })}
                  </Link>
                </div>
              </div>
              <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Grade / topic", zh: "年級 / 課題", zhHans: "年级 / 课题" })}</dt>
                  <dd className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatGradeLabel(resource.grade, language, true)}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resource.topicId ? text(topicById.get(resource.topicId)?.title ?? { en: resource.topicId, zh: resource.topicId }) : t({ en: "No topic", zh: "不指定", zhHans: "不指定" })}</p>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Type", zh: "類型", zhHans: "类型" })}</dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">{t(resourceTypeLabels[resource.type])}</span>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "File", zh: "檔案", zhHans: "档案" })}</dt>
                  <dd className="mt-1 break-words font-bold text-slate-900 dark:text-white">
                    {resource.fileName}
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{resource.fileType} · {fileSize(resource.fileSizeBytes)}</p>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "References", zh: "引用", zhHans: "引用" })}</dt>
                  <dd className="mt-1 text-xs font-black text-slate-600 dark:text-slate-300">
                    {t({ en: "Assignment", zh: "作業", zhHans: "作业" })}: {resource.referenceCounts.assignments} · {t({ en: "Assessment", zh: "測驗", zhHans: "测验" })}: {resource.referenceCounts.assessments}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Uploaded", zh: "上載時間", zhHans: "上载时间" })}</dt>
                  <dd className="mt-1 font-bold text-slate-900 dark:text-white">{formatDate(resource.createdAt, language)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-5 hidden xl:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-3">{t({ en: "Resource", zh: "資源", zhHans: "资源" })}</th>
                <th className="py-3 pr-3">{t({ en: "Grade / topic", zh: "年級 / 課題", zhHans: "年级 / 课题" })}</th>
                <th className="py-3 pr-3">{t({ en: "Type", zh: "類型", zhHans: "类型" })}</th>
                <th className="py-3 pr-3">{t({ en: "File", zh: "檔案", zhHans: "档案" })}</th>
                <th className="py-3 pr-3">{t({ en: "References", zh: "引用", zhHans: "引用" })}</th>
                <th className="py-3 pr-3">{t({ en: "Uploaded", zh: "上載時間", zhHans: "上载时间" })}</th>
                <th className="py-3">{t({ en: "Actions", zh: "操作", zhHans: "操作" })}</th>
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
                    <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{resource.topicId ? text(topicById.get(resource.topicId)?.title ?? { en: resource.topicId, zh: resource.topicId }) : t({ en: "No topic", zh: "不指定", zhHans: "不指定" })}</p>
                  </td>
                  <td className="py-4 pr-3 align-top">
                    <span className="inline-flex max-w-full rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black leading-tight dark:border-white/10 dark:bg-white/[0.07]">{t(resourceTypeLabels[resource.type])}</span>
                  </td>
                  <td className="py-4 pr-3 align-top">
                    <p className="break-words font-bold">{resource.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resource.fileType} · {fileSize(resource.fileSizeBytes)}</p>
                  </td>
                  <td className="py-4 pr-3 align-top text-xs font-black text-slate-600 dark:text-slate-300">
                    {t({ en: "Assignment", zh: "作業", zhHans: "作业" })}: {resource.referenceCounts.assignments} · {t({ en: "Assessment", zh: "測驗", zhHans: "测验" })}: {resource.referenceCounts.assessments}
                  </td>
                  <td className="py-4 pr-3 align-top font-bold">{formatDate(resource.createdAt, language)}</td>
                  <td className="py-4 align-top">
                    <div className="grid min-w-0 gap-2">
                      <a href={`/api/teacher/resources/${encodeURIComponent(resource.id)}/downloads`} className="focus-ring inline-flex max-w-full justify-center rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black leading-tight dark:border-white/10 dark:bg-white/[0.07]">
                        {t({ en: "Download", zh: "下載", zhHans: "下载" })}
                      </a>
                      <Link href={assignmentHrefForResource(resource)} className="focus-ring inline-flex max-w-full justify-center rounded-full bg-slate-950 px-3 py-2 text-xs font-black leading-tight text-white dark:bg-white dark:text-slate-950">
                        {t({ en: "Assign", zh: "布置", zhHans: "布置" })}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredResources.length ? <p className="soft-panel mt-4 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No resources match these filters.", zh: "沒有符合篩選的資源。", zhHans: "没有符合筛选的资源。" })}</p> : null}
      </section>
    </div>
  );
}

export function TeacherAssessmentsView({ data }: { data: TeacherAssessmentListData }) {
  const { language, text, t } = useSettings();
  const classById = new Map(data.classes.map((teacherClass) => [teacherClass.id, teacherClass]));

  return (
    <div className="grid gap-6">
      <section id="assessment-analysis" className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Assessments", zh: "測驗", zhHans: "测验" })}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Quiz, test, and mock exam management", zh: "測驗與考試管理", zhHans: "测验与考试管理" })}</h1>
          </div>
          <Link href="/teacher/assessments/new" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "New assessment", zh: "新增測驗", zhHans: "新增测验" })}</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label={t({ en: "Assessments", zh: "測驗", zhHans: "测验" })} value={String(data.totals.assessments)} detail={t({ en: "Created", zh: "已建立", zhHans: "已建立" })} />
          <StatCard label={t({ en: "Open", zh: "進行中", zhHans: "进行中" })} value={String(data.totals.openAssessments)} detail={t({ en: "Scheduled or open", zh: "已排程或開放", zhHans: "已排程或开放" })} />
          <StatCard label={t({ en: "Submissions", zh: "提交", zhHans: "提交" })} value={String(data.totals.submittedCount)} detail={t({ en: "Student attempts", zh: "學生作答", zhHans: "学生作答" })} />
          <StatCard label={t({ en: "Avg score", zh: "平均分", zhHans: "平均分" })} value={data.totals.averageScore === null ? "--" : `${data.totals.averageScore}%`} detail={t({ en: "Submitted papers", zh: "已提交試卷", zhHans: "已提交试卷" })} />
        </div>
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Assessment", zh: "測驗", zhHans: "测验" })}</th>
                <th className="py-3 pr-4">{t({ en: "Class", zh: "班級", zhHans: "班级" })}</th>
                <th className="py-3 pr-4">{t({ en: "Source", zh: "來源", zhHans: "来源" })}</th>
                <th className="py-3 pr-4">{t({ en: "Settings", zh: "設定", zhHans: "设定" })}</th>
                <th className="py-3 pr-4">{t({ en: "Status", zh: "狀態", zhHans: "状态" })}</th>
                <th className="py-3 pr-4">{t({ en: "Submissions", zh: "提交", zhHans: "提交" })}</th>
                <th className="py-3">{t({ en: "Actions", zh: "操作", zhHans: "操作" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {data.assessments.map((assessment) => {
                const teacherClass = classById.get(assessment.classId);
                const assessmentTitle = text(assessment.title);
                const assignmentHref = assignmentHrefForAssessment(
                  assessment,
                  t({ en: `${assessmentTitle} assignment`, zh: `${assessmentTitle} 測驗分派`, zhHans: `${assessmentTitle} 测验分派` })
                );
                return (
                  <tr key={assessment.id}>
                    <td className="py-4 pr-4">
                      <Link href={`/teacher/assessments/${assessment.id}`} className="focus-ring rounded-xl font-black text-slate-950 underline-offset-4 hover:underline dark:text-white">
                        {assessmentTitle}
                      </Link>
                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{text(assessmentTypeLabels[assessment.type])} · {formatDate(assessment.closesAt, language)}</p>
                    </td>
                    <td className="py-4 pr-4 font-bold">{teacherClass?.name ?? assessment.classId}</td>
                    <td className="py-4 pr-4 font-bold">{text(assessmentSourceTypeLabels[assessment.sourceType])}</td>
                    <td className="py-4 pr-4 text-xs font-bold text-slate-600 dark:text-slate-300">{formatTimeLimit(assessment.timeLimitMinutes, language)} · {formatAttemptLimit(assessment.maxAttempts, language)} · {assessment.gradeWeight}%</td>
                    <td className="py-4 pr-4"><StatusPill value={assessment.status} label={text(assessmentStatusLabels[assessment.status])} /></td>
                    <td className="py-4 pr-4 font-black">{assessment.submittedCount}/{assessment.submissionCount}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/teacher/assessments/${assessment.id}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                          {t({ en: "View", zh: "查看", zhHans: "查看" })}
                        </Link>
                        {assessment.status === "draft" ? (
                          <Link href={`/teacher/assessments/${assessment.id}/edit`} className="focus-ring rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                            {t({ en: "Edit draft", zh: "編輯草稿", zhHans: "编辑草稿" })}
                          </Link>
                        ) : (
                          <Link href={assignmentHref} className="focus-ring rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                            {t({ en: "Assign", zh: "分派", zhHans: "分派" })}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.assessments.length ? <p className="soft-panel mt-4 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No assessments yet.", zh: "尚未建立測驗。", zhHans: "尚未建立测验。" })}</p> : null}
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

type BuilderQuestionResponse = {
  questions: TeacherAssessmentQuestionOption[];
  total: number;
  page: number;
  pageSize: number;
};

type GeneratedQuestion = {
  apiId: string;
  question: string;
  answer: string;
  questionEn: string;
  answerEn: string;
};

function emptySection(): AssessmentPaperSection {
  return {
    id: "section-1",
    title: { en: "Questions", zh: "題目", zhHans: "题目" },
    instructions: { en: "", zh: "", zhHans: "" },
    order: 0,
    items: []
  };
}

function itemCount(sections: AssessmentPaperSection[]) {
  return sections.reduce((sum, section) => sum + section.items.length, 0);
}

function totalPoints(sections: AssessmentPaperSection[]) {
  return sections.reduce((sum, section) => sum + section.items.reduce((sectionSum, item) => sectionSum + item.points, 0), 0);
}

function newItemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 16);
}

function questionOptionToPaperItem(question: TeacherAssessmentQuestionOption, order: number): AssessmentPaperItem {
  return {
    id: newItemId("paper-item"),
    source: question.source === "mistake" ? "mistake" : "question-bank",
    questionId: question.id,
    points: 10,
    order
  };
}

function embeddedToPaperItem(source: "manual" | "ai-generated", embeddedQuestion: AssessmentEmbeddedQuestion, points: number, order: number): AssessmentPaperItem {
  return {
    id: newItemId(source === "ai-generated" ? "ai-item" : "manual-item"),
    source,
    embeddedQuestion,
    points,
    order
  };
}

function normalizeSectionOrders(sections: AssessmentPaperSection[]) {
  return sections.map((section, sectionIndex) => ({
    ...section,
    order: sectionIndex,
    items: section.items.map((item, itemIndex) => ({ ...item, order: itemIndex }))
  }));
}

export function TeacherAssessmentNewView({ data, initialAssessment }: { data: TeacherAssessmentCreateData; initialAssessment?: Assessment }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [selectedClassId, setSelectedClassId] = useState(initialAssessment?.classId ?? data.classes[0]?.id ?? "");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>(initialAssessment?.type ?? "quiz");
  const [assessmentTitle, setAssessmentTitle] = useState(initialAssessment ? text(initialAssessment.title) : "");
  const [opensAt, setOpensAt] = useState(toDateTimeLocalInput(initialAssessment?.opensAt));
  const [closesAt, setClosesAt] = useState(toDateTimeLocalInput(initialAssessment?.closesAt));
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(String(initialAssessment?.timeLimitMinutes ?? 25));
  const [gradeWeight, setGradeWeight] = useState(String(initialAssessment?.gradeWeight ?? 10));
  const [maxAttempts, setMaxAttempts] = useState(String(initialAssessment?.maxAttempts ?? 1));
  const [randomizeQuestionOrder, setRandomizeQuestionOrder] = useState(initialAssessment?.randomizeQuestionOrder ?? true);
  const [showAnswersImmediately, setShowAnswersImmediately] = useState(initialAssessment?.showAnswersImmediately ?? false);
  const [activeStep, setActiveStep] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<"question-bank" | "mistakes">("question-bank");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionType | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [queryResult, setQueryResult] = useState<BuilderQuestionResponse>({ questions: data.questionBank, total: data.questionBank.length, page: 1, pageSize: 12 });
  const [isQuerying, setIsQuerying] = useState(false);
  const [questionCache, setQuestionCache] = useState<TeacherAssessmentQuestionOption[]>(data.questionBank);
  const [sections, setSections] = useState<AssessmentPaperSection[]>(initialAssessment?.paperSections.length ? initialAssessment.paperSections : [emptySection()]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [manualPoints, setManualPoints] = useState(10);
  const [manualText, setManualText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState("");
  const selectedClass = data.classes.find((teacherClass) => teacherClass.id === selectedClassId) ?? data.classes[0];
  const topicOptions = data.topicOptions.filter((topic) => !selectedClass || topic.grade === selectedClass.grade);
  const cachedQuestionsById = useMemo(() => new Map(questionCache.map((question) => [question.id, question])), [questionCache]);
  const currentTotalPoints = totalPoints(sections);
  const currentItemCount = itemCount(sections);

  useEffect(() => {
    if (!selectedClassId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      classId: selectedClassId,
      source: sourceFilter,
      page: String(page),
      pageSize: "12"
    });
    if (topicFilter !== "all") params.set("topicIds", topicFilter);
    if (difficultyFilter !== "all") params.set("difficulties", difficultyFilter);
    if (questionTypeFilter !== "all") params.set("questionTypes", questionTypeFilter);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    setIsQuerying(true);
    fetch(`/api/teacher/assessment-builder/questions?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("question-query-failed")))
      .then((payload: BuilderQuestionResponse) => {
        setQueryResult(payload);
        setQuestionCache((current) => {
          const merged = new Map(current.map((question) => [question.id, question]));
          payload.questions.forEach((question) => merged.set(question.id, question));
          return Array.from(merged.values());
        });
      })
      .catch((queryError) => {
        if ((queryError as Error).name !== "AbortError") {
          setQueryResult({ questions: [], total: 0, page, pageSize: 12 });
        }
      })
      .finally(() => setIsQuerying(false));
    return () => controller.abort();
  }, [selectedClassId, sourceFilter, topicFilter, difficultyFilter, questionTypeFilter, keyword, page]);

  function updateSections(updater: (current: AssessmentPaperSection[]) => AssessmentPaperSection[]) {
    setSections((current) => normalizeSectionOrders(updater(current)));
  }

  function addItemToSection(item: AssessmentPaperItem, sectionId = sections[0]?.id ?? "section-1") {
    updateSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      return { ...section, items: [...section.items, { ...item, order: section.items.length }] };
    }));
  }

  function addQuestion(question: TeacherAssessmentQuestionOption) {
    addItemToSection(questionOptionToPaperItem(question, sections[0]?.items.length ?? 0));
    setQuestionCache((current) => current.some((candidate) => candidate.id === question.id) ? current : [...current, question]);
  }

  function updateItem(sectionId: string, itemId: string, patch: Partial<AssessmentPaperItem>) {
    updateSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }
      : section));
  }

  function removeItem(sectionId: string, itemId: string) {
    updateSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
      : section));
  }

  function moveItem(sectionId: string, itemId: string, direction: -1 | 1) {
    updateSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const index = section.items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= section.items.length) return section;
      const items = [...section.items];
      const [item] = items.splice(index, 1);
      items.splice(nextIndex, 0, item);
      return { ...section, items };
    }));
  }

  function addSection() {
    updateSections((current) => [...current, {
      id: newItemId("section"),
      title: { en: `Section ${current.length + 1}`, zh: `第 ${current.length + 1} 部分`, zhHans: `第 ${current.length + 1} 部分` },
      instructions: { en: "", zh: "", zhHans: "" },
      order: current.length,
      items: []
    }]);
  }

  function addManualQuestion() {
    if (!manualPrompt.trim() || !manualAnswer.trim()) {
      setError(t({ en: "Manual question and answer are required.", zh: "請填寫手動題目與答案。", zhHans: "请填写手动题目与答案。" }));
      return;
    }
    addItemToSection(embeddedToPaperItem("manual", {
      type: "manual",
      prompt: { en: manualPrompt.trim(), zh: manualPrompt.trim() },
      answer: manualAnswer.trim(),
      explanation: { en: manualAnswer.trim(), zh: manualAnswer.trim() }
    }, manualPoints, sections[0]?.items.length ?? 0));
    setManualPrompt("");
    setManualAnswer("");
    setManualPoints(10);
    setError("");
  }

  function importManualQuestions() {
    const parsed = parseManualQuestions(manualText);
    if (!parsed.length) {
      setError(t({ en: "No valid manual questions found.", zh: "未找到有效手動題目。", zhHans: "未找到有效手动题目。" }));
      return;
    }
    updateSections((current) => current.map((section, sectionIndex) => sectionIndex === 0
      ? {
          ...section,
          items: [
            ...section.items,
            ...parsed.map((question, index) => embeddedToPaperItem("manual", {
              type: "manual",
              prompt: question.prompt,
              answer: question.answer,
              explanation: { en: question.answer, zh: question.answer }
            }, question.points, section.items.length + index))
          ]
        }
      : section));
    setManualText("");
    setError("");
  }

  async function generateQuestions() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setError("");
    const response = await fetch("/api/teacher/question-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt.trim(), chatId: selectedClassId })
    });
    setIsGenerating(false);
    const payload = await response.json().catch(() => null) as { questions?: GeneratedQuestion[]; error?: string } | null;
    if (!response.ok || !payload?.questions) {
      setError(payload?.error ?? t({ en: "AI question generation is unavailable.", zh: "AI 題目生成暫時不可用。", zhHans: "AI 题目生成暂时不可用。" }));
      return;
    }
    setGeneratedQuestions(payload.questions);
  }

  function addGeneratedQuestion(question: GeneratedQuestion) {
    addItemToSection(embeddedToPaperItem("ai-generated", {
      type: "short-answer",
      prompt: { en: question.questionEn || question.question, zh: question.question },
      answer: question.answer,
      acceptedAnswers: [question.answerEn].filter(Boolean),
      explanation: { en: question.answerEn || question.answer, zh: question.answer }
    }, 10, sections[0]?.items.length ?? 0));
  }

  function itemPrompt(item: AssessmentPaperItem) {
    if (item.embeddedQuestion) return text(item.embeddedQuestion.prompt);
    const question = item.questionId ? cachedQuestionsById.get(item.questionId) : null;
    return question ? `${text(question.topicTitle)} · ${text(question.prompt)}` : item.questionId ?? item.id;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!currentItemCount) {
      setError(t({ en: "Add at least one question before saving.", zh: "請先加入至少一題。", zhHans: "请先加入至少一题。" }));
      return;
    }
    const trimmedTitle = assessmentTitle.trim();
    if (!trimmedTitle) {
      setActiveStep(0);
      setError(t({ en: "Assessment title is required.", zh: "請填寫測驗標題。", zhHans: "请填写测验标题。" }));
      return;
    }
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const statusIntent = submitter?.value === "draft" ? "draft" : "publish";
    const response = await fetch(initialAssessment ? `/api/teacher/assessments/${initialAssessment.id}` : "/api/teacher/assessments", {
      method: initialAssessment ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        title: trimmedTitle,
        type: assessmentType,
        sourceType: "mixed",
        paperSections: sections,
        statusIntent,
        opensAt,
        closesAt,
        timeLimitMinutes: Number(timeLimitMinutes || 0),
        maxAttempts: Number(maxAttempts || 1),
        randomizeQuestionOrder,
        showAnswersImmediately,
        gradeWeight: Number(gradeWeight || 10)
      })
    });
    const payload = await response.json().catch(() => null) as { assessment?: Assessment; error?: string } | null;
    if (!response.ok || !payload?.assessment) {
      setError(t({ en: "Could not create this assessment yet.", zh: "暫時未能建立此測驗。", zhHans: "暂时未能建立此测验。" }));
      return;
    }
    router.push(`/teacher/assessments/${payload.assessment.id}`);
  };

	  return (
	    <section className="grid gap-6">
	      <div className="glass-panel p-5 sm:p-6">
	      <Link href="/teacher/assessments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assessments", zh: "返回測驗", zhHans: "返回测验" })}</Link>
	      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
	        <div>
	          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Free paper builder", zh: "自由組卷", zhHans: "自由组卷" })}</p>
	          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{initialAssessment ? t({ en: "Edit assessment", zh: "編輯測驗", zhHans: "编辑测验" }) : t({ en: "Create assessment", zh: "建立測驗", zhHans: "建立测验" })}</h1>
	        </div>
	        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
	          <StatCard label={t({ en: "Questions", zh: "題目", zhHans: "题目" })} value={String(currentItemCount)} detail={t({ en: "In paper", zh: "已加入", zhHans: "已加入" })} />
	          <StatCard label={t({ en: "Points", zh: "分數", zhHans: "分数" })} value={String(currentTotalPoints)} detail={t({ en: "Total", zh: "總分", zhHans: "总分" })} />
	        </div>
	      </div>
	      <div className="mt-5 flex flex-wrap gap-2">
	        {[
	          t({ en: "1. Setup", zh: "1. 設定", zhHans: "1. 设定" }),
	          t({ en: "2. Select", zh: "2. 選題", zhHans: "2. 选题" }),
	          t({ en: "3. Custom", zh: "3. 自訂", zhHans: "3. 自订" }),
	          t({ en: "4. Preview", zh: "4. 預覽", zhHans: "4. 预览" })
	        ].map((label, index) => (
	          <button key={label} type="button" onClick={() => setActiveStep(index)} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${activeStep === index ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{label}</button>
	        ))}
	      </div>
	      </div>
	      {!data.classes.length ? (
	        <p className="soft-panel mt-5 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Create a class before creating assessments.", zh: "請先建立班級，然後再建立測驗。", zhHans: "请先建立班级，然后再建立测验。" })}</p>
	      ) : (
	        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
	          <div className="grid gap-5">
	          {activeStep === 0 ? <div className="glass-panel grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
	            <label className="grid gap-2">
	              <span className="text-sm font-black">{t({ en: "Class", zh: "班級", zhHans: "班级" })}</span>
	              <select value={selectedClassId} disabled={Boolean(initialAssessment)} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.06]">
                {data.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Assessment type", zh: "測驗類型", zhHans: "测验类型" })}</span>
	              <select name="type" value={assessmentType} onChange={(event) => setAssessmentType(event.target.value as AssessmentType)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                {assessmentTypes.map((item) => <option key={item} value={item}>{text(assessmentTypeLabels[item])}</option>)}
              </select>
            </label>
            <label className="grid gap-2 lg:col-span-2">
	              <span className="text-sm font-black">{t({ en: "Title", zh: "標題", zhHans: "标题" })}</span>
		              <input name="title" required value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" />
	            </label>
	            <div className="grid gap-4 lg:col-span-2 lg:grid-cols-5">
	            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Opens", zh: "開始", zhHans: "开始" })}</span><input name="opensAt" type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
	            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Closes", zh: "結束", zhHans: "结束" })}</span><input name="closesAt" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
		            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Time limit", zh: "時限", zhHans: "时限" })}</span><input name="timeLimitMinutes" type="number" min="0" value={timeLimitMinutes} onChange={(event) => setTimeLimitMinutes(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
	            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Weight", zh: "比重", zhHans: "比重" })}</span><input name="gradeWeight" type="number" min="0" value={gradeWeight} onChange={(event) => setGradeWeight(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
		            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Attempts", zh: "可嘗試次數", zhHans: "可尝试次数" })}</span><input name="maxAttempts" type="number" min="1" value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
	          </div>
	          <div className="flex flex-wrap gap-3 lg:col-span-2">
		            <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="randomizeQuestionOrder" type="checkbox" checked={randomizeQuestionOrder} onChange={(event) => setRandomizeQuestionOrder(event.target.checked)} />{t({ en: "Random order", zh: "隨機題序", zhHans: "随机题序" })}</label>
		            <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="showAnswersImmediately" type="checkbox" checked={showAnswersImmediately} onChange={(event) => setShowAnswersImmediately(event.target.checked)} />{t({ en: "Show answers immediately", zh: "即時顯示答案", zhHans: "即时显示答案" })}</label>
	          </div>
	          </div> : null}
	          {activeStep === 1 ? <div className="glass-panel grid gap-4 p-5 sm:p-6">
	            <div className="grid gap-3 lg:grid-cols-5">
	              <label className="grid gap-2 lg:col-span-2"><span className="text-sm font-black">{t({ en: "Keyword", zh: "關鍵字", zhHans: "关键字" })}</span><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
	              <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Topic", zh: "課題", zhHans: "课题" })}</span><select value={topicFilter} onChange={(event) => { setTopicFilter(event.target.value); setPage(1); }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]"><option value="all">{t({ en: "All", zh: "全部", zhHans: "全部" })}</option>{topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{text(topic.title)}</option>)}</select></label>
	              <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Difficulty", zh: "難度", zhHans: "难度" })}</span><select value={difficultyFilter} onChange={(event) => { setDifficultyFilter(event.target.value as Difficulty | "all"); setPage(1); }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]"><option value="all">{t({ en: "All", zh: "全部", zhHans: "全部" })}</option>{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{formatDifficultyLabel(difficulty, language)}</option>)}</select></label>
	              <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Type", zh: "題型", zhHans: "题型" })}</span><select value={questionTypeFilter} onChange={(event) => { setQuestionTypeFilter(event.target.value as QuestionType | "all"); setPage(1); }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]"><option value="all">{t({ en: "All", zh: "全部", zhHans: "全部" })}</option>{questionTypes.map((type) => <option key={type} value={type}>{text(questionTypeLabels[type])}</option>)}</select></label>
	            </div>
	            <div className="flex flex-wrap gap-2">
	              <button type="button" onClick={() => { setSourceFilter("question-bank"); setPage(1); }} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${sourceFilter === "question-bank" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Question bank", zh: "題庫", zhHans: "题库" })}</button>
	              <button type="button" onClick={() => { setSourceFilter("mistakes"); setPage(1); }} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${sourceFilter === "mistakes" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Class mistakes", zh: "班級錯題", zhHans: "班级错题" })}</button>
	            </div>
	            <div className="grid gap-3">
	              {isQuerying ? <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Loading questions...", zh: "正在載入題目...", zhHans: "正在载入题目..." })}</p> : null}
	              {queryResult.questions.map((question) => (
	                <div key={question.id} className="soft-panel grid gap-3 p-4">
	                  <div className="flex flex-wrap items-start justify-between gap-3">
	                    <div>
	                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{formatGradeLabel(question.grade, language, true)} · {formatDifficultyLabel(question.difficulty, language)} · {text(questionTypeLabels[question.type])}{question.usageCount ? ` · ${question.usageCount}` : ""}</p>
	                      <MathText text={`${text(question.topicTitle)} · ${text(question.prompt)}`} className="mt-2 text-sm font-bold text-slate-950 dark:text-white" />
	                    </div>
	                    <button type="button" onClick={() => addQuestion(question)} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Add", zh: "加入", zhHans: "加入" })}</button>
	                  </div>
	                </div>
	              ))}
	              {!isQuerying && !queryResult.questions.length ? <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No matching questions.", zh: "沒有符合條件的題目。", zhHans: "没有符合条件的题目。" })}</p> : null}
	            </div>
	            <div className="flex items-center justify-between">
	              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black disabled:opacity-40 dark:border-white/10">{t({ en: "Previous", zh: "上一頁", zhHans: "上一页" })}</button>
	              <span className="text-sm font-black text-slate-500 dark:text-slate-400">{page} / {Math.max(1, Math.ceil(queryResult.total / queryResult.pageSize))}</span>
	              <button type="button" disabled={page >= Math.ceil(queryResult.total / queryResult.pageSize)} onClick={() => setPage((current) => current + 1)} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black disabled:opacity-40 dark:border-white/10">{t({ en: "Next", zh: "下一頁", zhHans: "下一页" })}</button>
	            </div>
	          </div> : null}
	          {activeStep === 2 ? <div className="grid gap-5">
	            <div className="glass-panel grid gap-4 p-5 sm:p-6">
	              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Manual question", zh: "手動題目", zhHans: "手动题目" })}</h2>
	              <textarea value={manualPrompt} onChange={(event) => setManualPrompt(event.target.value)} rows={3} placeholder={t({ en: "Question prompt", zh: "題目內容", zhHans: "题目内容" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" />
	              <div className="grid gap-3 sm:grid-cols-[1fr_140px]"><input value={manualAnswer} onChange={(event) => setManualAnswer(event.target.value)} placeholder={t({ en: "Answer", zh: "答案", zhHans: "答案" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /><input value={manualPoints} onChange={(event) => setManualPoints(Number(event.target.value) || 10)} type="number" min="1" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></div>
	              <button type="button" onClick={addManualQuestion} className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Add manual question", zh: "加入手動題", zhHans: "加入手动题" })}</button>
	              <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} rows={5} placeholder={t({ en: "Batch import: prompt | answer | points", zh: "批量匯入：題目 | 答案 | 分數", zhHans: "批量汇入：题目 | 答案 | 分数" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" />
	              <button type="button" onClick={importManualQuestions} className="focus-ring w-fit rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">{t({ en: "Import batch", zh: "批量匯入", zhHans: "批量汇入" })}</button>
	            </div>
	            <div className="glass-panel grid gap-4 p-5 sm:p-6">
	              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "AI generation", zh: "AI 生成題目", zhHans: "AI 生成题目" })}</h2>
	              <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={4} placeholder={t({ en: "Describe topic, level, and constraints.", zh: "描述課題、程度與限制。", zhHans: "描述课题、程度与限制。" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" />
	              <button type="button" disabled={isGenerating} onClick={generateQuestions} className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{isGenerating ? t({ en: "Generating...", zh: "生成中...", zhHans: "生成中..." }) : t({ en: "Generate", zh: "生成", zhHans: "生成" })}</button>
	              <div className="grid gap-3">
	                {generatedQuestions.map((question) => <div key={question.apiId} className="soft-panel p-4"><MathText text={question.question} className="text-sm font-bold text-slate-950 dark:text-white" /><p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{question.answer}</p><button type="button" onClick={() => addGeneratedQuestion(question)} className="focus-ring mt-3 rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black dark:border-white/10">{t({ en: "Add generated question", zh: "加入生成題", zhHans: "加入生成题" })}</button></div>)}
	              </div>
	            </div>
	          </div> : null}
	          {activeStep === 3 ? <div className="glass-panel grid gap-5 p-5 sm:p-6">
	            <div className="flex flex-wrap items-center justify-between gap-3">
	              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Paper preview", zh: "試卷預覽", zhHans: "试卷预览" })}</h2>
	              <button type="button" onClick={() => window.print()} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black dark:border-white/10">{t({ en: "Print preview", zh: "列印預覽", zhHans: "列印预览" })}</button>
	            </div>
	            {sections.map((section) => <div key={section.id} className="grid gap-3"><h3 className="text-lg font-black text-slate-950 dark:text-white">{text(section.title)}</h3>{section.items.map((item, index) => <div key={item.id} className="soft-panel p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">{index + 1} · {item.points} {t({ en: "points", zh: "分", zhHans: "分" })}</p><MathText text={itemPrompt(item)} className="mt-2 text-sm font-bold text-slate-950 dark:text-white" />{item.embeddedQuestion?.diagram ? <QuestionFigure diagram={item.embeddedQuestion.diagram} variant="day" compact language={language} /> : null}{item.embeddedQuestion ? <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案", zhHans: "答案" })}: {item.embeddedQuestion.answer}</p> : null}</div>)}</div>)}
	          </div> : null}
	          {error ? <p role="alert" className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
	          <div className="flex flex-wrap gap-3">
	            <button value="draft" className="focus-ring rounded-full border border-slate-200/80 px-6 py-3 text-sm font-black dark:border-white/10" type="submit">{t({ en: "Save draft", zh: "儲存草稿", zhHans: "保存草稿" })}</button>
	            <button value="publish" className="focus-ring rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Publish assessment", zh: "發布測驗", zhHans: "发布测验" })}</button>
	          </div>
	          </div>
	          <aside className="glass-panel h-fit p-5 sm:p-6 xl:sticky xl:top-24">
	            <div className="flex items-center justify-between gap-3">
	              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Paper basket", zh: "組卷籃", zhHans: "组卷篮" })}</h2>
	              <button type="button" onClick={addSection} className="focus-ring rounded-full border border-slate-200/80 px-3 py-2 text-xs font-black dark:border-white/10">{t({ en: "Section", zh: "分段", zhHans: "分段" })}</button>
	            </div>
	            <div className="mt-4 grid gap-4">
	              {sections.map((section) => (
	                <div key={section.id} className="grid gap-3">
	                  <input value={text(section.title)} onChange={(event) => updateSections((current) => current.map((candidate) => candidate.id === section.id ? { ...candidate, title: { en: event.target.value, zh: event.target.value } } : candidate))} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]" />
	                  {section.items.map((item, index) => (
	                    <div key={item.id} className="soft-panel grid gap-2 p-3">
	                      <p className="line-clamp-3 text-xs font-bold text-slate-700 dark:text-slate-200">{index + 1}. {itemPrompt(item)}</p>
	                      <div className="flex flex-wrap items-center gap-2">
	                        <input type="number" min="1" value={item.points} onChange={(event) => updateItem(section.id, item.id, { points: Number(event.target.value) || 1 })} className="focus-ring w-20 rounded-xl border border-slate-200/80 bg-white/80 px-2 py-1 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]" />
	                        <button type="button" onClick={() => moveItem(section.id, item.id, -1)} className="focus-ring rounded-full border border-slate-200/80 px-3 py-1 text-xs font-black dark:border-white/10">{t({ en: "Up", zh: "上移", zhHans: "上移" })}</button>
	                        <button type="button" onClick={() => moveItem(section.id, item.id, 1)} className="focus-ring rounded-full border border-slate-200/80 px-3 py-1 text-xs font-black dark:border-white/10">{t({ en: "Down", zh: "下移", zhHans: "下移" })}</button>
	                        <button type="button" onClick={() => removeItem(section.id, item.id)} className="focus-ring rounded-full border border-rose-200/80 px-3 py-1 text-xs font-black text-rose-700 dark:border-rose-300/40 dark:text-rose-200">{t({ en: "Remove", zh: "移除", zhHans: "移除" })}</button>
	                      </div>
	                    </div>
	                  ))}
	                </div>
	              ))}
	              {!currentItemCount ? <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Selected questions appear here.", zh: "已選題目會顯示在此。", zhHans: "已选题目会显示在此。" })}</p> : null}
	            </div>
	          </aside>
	        </form>
	      )}
	    </section>
  );
}

function percentValue(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

function scoreValue(score: number | null, maxScore?: number) {
  if (score === null) return "--";
  return typeof maxScore === "number" ? `${score}/${maxScore}` : String(score);
}

function borderlineLabel(type: AssessmentAnalysisBorderlineType): LocalizedText {
  const labels: Record<AssessmentAnalysisBorderlineType, LocalizedText> = {
    "pass-borderline": { en: "Pass borderline", zh: "及格臨界", zhHans: "及格临界" },
    "excellent-borderline": { en: "Excellent borderline", zh: "優秀臨界", zhHans: "优秀临界" },
    "low-score-risk": { en: "Low-score risk", zh: "低分風險", zhHans: "低分风险" }
  };
  return labels[type];
}

function bandsToText(detail: TeacherAssessmentDetailData) {
  return detail.analysis.settings.scoreBands.map((band) => `${band.label} | ${band.min} | ${band.max}`).join("\n");
}

function parseBandsText(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [label, min, max] = line.split("|").map((part) => part.trim());
      const minValue = Number(min);
      const maxValue = Number(max);
      if (!label || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) return null;
      return { label, min: minValue, max: maxValue };
    })
    .filter((band): band is { label: string; min: number; max: number } => Boolean(band));
}

function AssessmentSettingsReadyPanel({ assessment }: { assessment: Assessment }) {
  const { text, t } = useSettings();
  const assessmentTitle = text(assessment.title);
  const assignmentHref = assignmentHrefForAssessment(
    assessment,
    t({ en: `${assessmentTitle} assignment`, zh: `${assessmentTitle} 測驗分派`, zhHans: `${assessmentTitle} 测验分派` })
  );

  return (
    <section aria-live="polite" className="rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {t({ en: "Analysis settings ready", zh: "分析口徑已就緒", zhHans: "分析口径已就绪" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{assessmentTitle}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {text(assessment.examGroupName)} · {t({ en: "Pass", zh: "及格", zhHans: "及格" })} {assessment.analysisSettings.passThreshold}% · {t({ en: "Borderline", zh: "臨界", zhHans: "临界" })} ±{assessment.analysisSettings.borderlineRange}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href="#assessment-analysis" className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open analysis", zh: "查看分析", zhHans: "查看分析" })}
          </a>
          <Link href={assignmentHref} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Assign", zh: "分派", zhHans: "分派" })}
          </Link>
          <a href={`/api/teacher/assessments/${encodeURIComponent(assessment.id)}/exports`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Export CSV", zh: "匯出 CSV", zhHans: "导出 CSV" })}
          </a>
        </div>
      </div>
    </section>
  );
}

function AssessmentSettingsPanel({ detail }: { detail: TeacherAssessmentDetailData }) {
  const router = useRouter();
  const { text, t } = useSettings();
  const [passThreshold, setPassThreshold] = useState(detail.analysis.settings.passThreshold);
  const [excellentThreshold, setExcellentThreshold] = useState(detail.analysis.settings.excellentThreshold);
  const [lowScoreThreshold, setLowScoreThreshold] = useState(detail.analysis.settings.lowScoreThreshold);
  const [borderlineRange, setBorderlineRange] = useState(detail.analysis.settings.borderlineRange);
  const [scoreBands, setScoreBands] = useState(bandsToText(detail));
  const [examGroupId, setExamGroupId] = useState(detail.assessment.examGroupId);
  const [examGroupName, setExamGroupName] = useState(text(detail.assessment.examGroupName));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAssessment, setSavedAssessment] = useState<Assessment | null>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setSavedAssessment(null);
    const response = await fetch(`/api/teacher/assessments/${detail.assessment.id}/analysis-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examGroupId,
        examGroupName,
        analysisSettings: {
          passThreshold,
          excellentThreshold,
          lowScoreThreshold,
          borderlineRange,
          scoreBands: parseBandsText(scoreBands)
        }
      })
    });
    const payload = await response.json().catch(() => null) as { assessment?: Assessment; error?: string } | null;
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setSavedAssessment(payload?.assessment ?? detail.assessment);
    setStatus("saved");
    router.refresh();
  }

  return (
    <form id="assessment-settings" onSubmit={saveSettings} className="glass-panel grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Analysis settings", zh: "分析口徑", zhHans: "分析口径" })}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{text(detail.assessment.examGroupName)}</p>
        </div>
        <button type="submit" disabled={status === "saving"} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {status === "saving" ? t({ en: "Saving", zh: "儲存中", zhHans: "保存中" }) : t({ en: "Save settings", zh: "儲存口徑", zhHans: "保存口径" })}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-6">
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Exam group ID", zh: "考試組 ID", zhHans: "考试组 ID" })}</span>
          <input value={examGroupId} onChange={(event) => setExamGroupId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Exam group name", zh: "考試組名稱", zhHans: "考试组名称" })}</span>
          <input value={examGroupName} onChange={(event) => setExamGroupName(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Pass", zh: "及格", zhHans: "及格" })}</span>
          <input type="number" min="0" max="100" value={passThreshold} onChange={(event) => setPassThreshold(Number(event.target.value) || 0)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Excellent", zh: "優秀", zhHans: "优秀" })}</span>
          <input type="number" min="0" max="100" value={excellentThreshold} onChange={(event) => setExcellentThreshold(Number(event.target.value) || 0)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Low score", zh: "低分", zhHans: "低分" })}</span>
          <input type="number" min="0" max="100" value={lowScoreThreshold} onChange={(event) => setLowScoreThreshold(Number(event.target.value) || 0)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Borderline", zh: "臨界區間", zhHans: "临界区间" })}</span>
          <input type="number" min="0" max="30" value={borderlineRange} onChange={(event) => setBorderlineRange(Number(event.target.value) || 0)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Score bands", zh: "分數段", zhHans: "分数段" })}</span>
          <textarea value={scoreBands} onChange={(event) => setScoreBands(event.target.value)} rows={5} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
      </div>
      {status === "saved" ? <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">{t({ en: "Settings saved.", zh: "口徑已儲存。", zhHans: "口径已保存。" })}</p> : null}
      {status === "error" ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{t({ en: "Could not save settings.", zh: "未能儲存口徑。", zhHans: "未能保存口径。" })}</p> : null}
      {savedAssessment ? <AssessmentSettingsReadyPanel assessment={savedAssessment} /> : null}
    </form>
  );
}

function AssessmentMarkingReadyPanel({
  detail,
  submission
}: {
  detail: TeacherAssessmentDetailData;
  submission: AssessmentSubmission;
}) {
  const { text, t } = useSettings();
  const assessmentTitle = text(detail.assessment.title);

  return (
    <section aria-live="polite" className="rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {t({ en: "Marks recorded", zh: "分數已記錄", zhHans: "分数已记录" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{submission.studentName}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {assessmentTitle} · {scoreValue(submission.score, submission.maxScore)} · {text(assessmentSubmissionStatusLabels[submission.status])}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href={`#assessment-submission-${submission.id}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open row", zh: "查看提交", zhHans: "查看提交" })}
          </a>
          <Link href={`/teacher/classes/${encodeURIComponent(detail.class.id)}/students/${encodeURIComponent(submission.studentId)}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Student profile", zh: "學生檔案", zhHans: "学生档案" })}
          </Link>
          <a href="#assessment-analysis" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Class analysis", zh: "班級分析", zhHans: "班级分析" })}
          </a>
        </div>
      </div>
    </section>
  );
}

function MarkingPanel({ detail, submission, onClose }: { detail: TeacherAssessmentDetailData; submission: AssessmentSubmission; onClose: () => void }) {
  const router = useRouter();
  const { text, t } = useSettings();
  const [rows, setRows] = useState(() => detail.questionAnalytics.map((question) => {
    const answer = submission.answers.find((candidate) => candidate.questionId === question.questionId);
    return {
      questionId: question.questionId,
      pointsEarned: answer?.pointsEarned ?? 0,
      isCorrect: answer?.isCorrect ?? false,
      teacherFeedback: text(answer?.teacherFeedback ?? { en: "", zh: "", zhHans: "" })
    };
  }));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedSubmission, setSavedSubmission] = useState<AssessmentSubmission | null>(null);

  useEffect(() => {
    setRows(detail.questionAnalytics.map((question) => {
      const answer = submission.answers.find((candidate) => candidate.questionId === question.questionId);
      return {
        questionId: question.questionId,
        pointsEarned: answer?.pointsEarned ?? 0,
        isCorrect: answer?.isCorrect ?? false,
        teacherFeedback: text(answer?.teacherFeedback ?? { en: "", zh: "", zhHans: "" })
      };
    }));
    setStatus("idle");
    setSavedSubmission(null);
  }, [detail.questionAnalytics, submission, text]);

  function updateRow(questionId: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row) => row.questionId === questionId ? { ...row, ...patch } : row));
  }

  async function saveMarking() {
    setStatus("saving");
    setSavedSubmission(null);
    const response = await fetch(`/api/teacher/assessments/${detail.assessment.id}/submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: rows })
    });
    const payload = await response.json().catch(() => null) as { submission?: AssessmentSubmission; assessment?: Assessment; error?: string } | null;
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setSavedSubmission(payload?.submission ?? submission);
    setStatus("saved");
    router.refresh();
  }

  return (
    <aside className="glass-panel grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Mark paper", zh: "閱卷", zhHans: "阅卷" })}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{submission.studentName} · {scoreValue(submission.score, submission.maxScore)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black dark:border-white/10">{t({ en: "Close", zh: "關閉", zhHans: "关闭" })}</button>
          <button type="button" disabled={status === "saving"} onClick={saveMarking} className="focus-ring rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {status === "saving" ? t({ en: "Saving", zh: "儲存中", zhHans: "保存中" }) : t({ en: "Save marks", zh: "儲存分數", zhHans: "保存分数" })}
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        {detail.questionAnalytics.map((question, index) => {
          const answer = submission.answers.find((candidate) => candidate.questionId === question.questionId);
          const row = rows.find((candidate) => candidate.questionId === question.questionId);
          return (
            <div key={question.questionId} className="soft-panel grid gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-200">Q{index + 1} · {question.maxPoints} {t({ en: "points", zh: "分", zhHans: "分" })}</p>
                  <MathText text={text(question.prompt)} className="mt-2 text-sm font-bold text-slate-950 dark:text-white" />
                  <p className="mt-2 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Student answer", zh: "學生答案", zhHans: "学生答案" })}: {answer?.answer || "--"}</p>
                </div>
                <div className="grid w-full gap-2 sm:w-[260px] sm:grid-cols-[100px_1fr]">
                  <label className="grid gap-1">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Score", zh: "得分", zhHans: "得分" })}</span>
                    <input type="number" min="0" max={question.maxPoints} step="0.5" value={row?.pointsEarned ?? 0} onChange={(event) => updateRow(question.questionId, { pointsEarned: Number(event.target.value) || 0 })} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Judgement", zh: "判定", zhHans: "判定" })}</span>
                    <select value={row?.isCorrect ? "correct" : "wrong"} onChange={(event) => updateRow(question.questionId, { isCorrect: event.target.value === "correct" })} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]">
                      <option value="correct">{t({ en: "Correct", zh: "正確", zhHans: "正确" })}</option>
                      <option value="wrong">{t({ en: "Wrong", zh: "錯誤", zhHans: "错误" })}</option>
                    </select>
                  </label>
                </div>
              </div>
              <label className="grid gap-1">
                <span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Teacher note", zh: "教師批註", zhHans: "教师批注" })}</span>
                <textarea value={row?.teacherFeedback ?? ""} onChange={(event) => updateRow(question.questionId, { teacherFeedback: event.target.value })} rows={2} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
            </div>
          );
        })}
      </div>
      {status === "saved" ? <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">{t({ en: "Marks saved.", zh: "分數已儲存。", zhHans: "分数已保存。" })}</p> : null}
      {status === "error" ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{t({ en: "Could not save marks.", zh: "未能儲存分數。", zhHans: "未能保存分数。" })}</p> : null}
      {savedSubmission ? <AssessmentMarkingReadyPanel detail={detail} submission={savedSubmission} /> : null}
    </aside>
  );
}

export function TeacherAssessmentDetailView({ detail }: { detail: TeacherAssessmentDetailData }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [isCloning, setIsCloning] = useState(false);
  const [isGeneratingReviewLesson, setIsGeneratingReviewLesson] = useState(false);
  const [reviewLessonMessage, setReviewLessonMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "rankings" | "questions" | "knowledge" | "grade" | "borderline">("overview");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const submissionRate = detail.assessment.submissionCount
    ? Math.round((detail.submittedCount / detail.assessment.submissionCount) * 100)
    : 0;
  const selectedSubmission = detail.submissions.find((submission) => submission.id === selectedSubmissionId) ?? null;
  const analyticsById = useMemo(() => new Map(detail.questionAnalytics.map((question) => [question.questionId, question])), [detail.questionAnalytics]);
  const rankingByStudentId = useMemo(() => new Map(detail.analysis.rankings.map((ranking) => [ranking.studentId, ranking])), [detail.analysis.rankings]);

  async function cloneAssessment() {
    setIsCloning(true);
    const response = await fetch(`/api/teacher/assessments/${detail.assessment.id}/copies`, { method: "POST" });
    setIsCloning(false);
    const payload = await response.json().catch(() => null) as { assessment?: Assessment } | null;
    if (response.ok && payload?.assessment) router.push(`/teacher/assessments/${payload.assessment.id}`);
  }

  async function generateReviewLesson() {
    setReviewLessonMessage("");
    setIsGeneratingReviewLesson(true);
    const response = await fetch(`/api/teacher/assessments/${encodeURIComponent(detail.assessment.id)}/review-lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, durationMinutes: 45 })
    });
    setIsGeneratingReviewLesson(false);
    const payload = await response.json().catch(() => null) as { reviewLesson?: TeacherReviewLessonPlan; error?: string } | null;
    if (!response.ok || !payload?.reviewLesson) {
      setReviewLessonMessage(t({ en: "Could not generate the review lesson.", zh: "未能生成講評方案。", zhHans: "未能生成讲评方案。" }));
      return;
    }
    router.push(`/teacher/assessments/${detail.assessment.id}/review-lessons/${payload.reviewLesson.id}`);
  }

  const summaryCards = [
    { label: t({ en: "Highest", zh: "最高分", zhHans: "最高分" }), value: percentValue(detail.analysis.summary.highestScore), detail: t({ en: "Submitted papers", zh: "已提交試卷", zhHans: "已提交试卷" }) },
    { label: t({ en: "Lowest", zh: "最低分", zhHans: "最低分" }), value: percentValue(detail.analysis.summary.lowestScore), detail: t({ en: "Submitted papers", zh: "已提交試卷", zhHans: "已提交试卷" }) },
    { label: t({ en: "Average", zh: "平均分", zhHans: "平均分" }), value: percentValue(detail.analysis.summary.averageScore), detail: t({ en: "Class mean", zh: "班級均分", zhHans: "班级均分" }) },
    { label: t({ en: "Std dev", zh: "標準差", zhHans: "标准差" }), value: detail.analysis.summary.standardDeviation === null ? "--" : String(detail.analysis.summary.standardDeviation), detail: t({ en: "Population", zh: "總體標準差", zhHans: "总体标准差" }) },
    { label: t({ en: "Pass rate", zh: "及格率", zhHans: "及格率" }), value: percentValue(detail.analysis.summary.passRate), detail: `${detail.analysis.settings.passThreshold}%` },
    { label: t({ en: "Excellent", zh: "優秀率", zhHans: "优秀率" }), value: percentValue(detail.analysis.summary.excellentRate), detail: `${detail.analysis.settings.excellentThreshold}%` },
    { label: t({ en: "Low score", zh: "低分率", zhHans: "低分率" }), value: percentValue(detail.analysis.summary.lowScoreRate), detail: `${detail.analysis.settings.lowScoreThreshold}%` },
    { label: t({ en: "Completion", zh: "完成率", zhHans: "完成率" }), value: `${submissionRate}%`, detail: `${detail.submittedCount}/${detail.assessment.submissionCount}` }
  ];
  const tabLabels = [
    { id: "overview" as const, label: t({ en: "Overview", zh: "總覽", zhHans: "总览" }) },
    { id: "rankings" as const, label: t({ en: "Rankings", zh: "班級排名", zhHans: "班级排名" }) },
    { id: "questions" as const, label: t({ en: "Items", zh: "小題分析", zhHans: "小题分析" }) },
    { id: "knowledge" as const, label: t({ en: "Knowledge", zh: "知識點", zhHans: "知识点" }) },
    { id: "grade" as const, label: t({ en: "Grade", zh: "年級對比", zhHans: "年级对比" }) },
    { id: "borderline" as const, label: t({ en: "Borderline", zh: "臨界生", zhHans: "临界生" }) }
  ];
  const assessmentTitle = text(detail.assessment.title);
  const assessmentAssignmentHref = assignmentHrefForAssessment(
    detail.assessment,
    t({ en: `${assessmentTitle} assignment`, zh: `${assessmentTitle} 測驗分派`, zhHans: `${assessmentTitle} 测验分派` })
  );

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/teacher/assessments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assessments", zh: "返回測驗", zhHans: "返回测验" })}</Link>
            <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{assessmentTitle}</h1>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{detail.class.name} · {text(assessmentTypeLabels[detail.assessment.type])} · {text(assessmentSourceTypeLabels[detail.assessment.sourceType])}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill value={detail.assessment.status} label={text(assessmentStatusLabels[detail.assessment.status])} />
            {detail.assessment.status === "draft" || detail.submittedCount === 0 ? (
              <Link href={`/teacher/assessments/${detail.assessment.id}/edit`} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">{t({ en: "Edit", zh: "編輯", zhHans: "编辑" })}</Link>
            ) : null}
            {detail.assessment.status !== "draft" ? (
              <Link href={assessmentAssignmentHref} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {t({ en: "Assign", zh: "分派", zhHans: "分派" })}
              </Link>
            ) : null}
            <button type="button" disabled={isCloning} onClick={cloneAssessment} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black disabled:opacity-50 dark:border-white/10">
              {isCloning ? t({ en: "Copying", zh: "複製中", zhHans: "复制中" }) : t({ en: "Copy", zh: "複製", zhHans: "复制" })}
            </button>
            <button type="button" disabled={isGeneratingReviewLesson} onClick={generateReviewLesson} className="focus-ring rounded-full border border-cyan-300/60 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-800 disabled:opacity-50 dark:text-cyan-100">
              {isGeneratingReviewLesson ? t({ en: "Generating", zh: "生成中", zhHans: "生成中" }) : t({ en: "Generate review lesson", zh: "生成講評方案", zhHans: "生成讲评方案" })}
            </button>
            <button type="button" onClick={() => window.print()} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">{t({ en: "Print", zh: "列印", zhHans: "列印" })}</button>
            <a href={`/api/teacher/assessments/${detail.assessment.id}/exports`} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Export CSV", zh: "匯出 CSV", zhHans: "导出 CSV" })}
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => <StatCard key={card.label} label={card.label} value={card.value} detail={card.detail} />)}
        </div>
        {reviewLessonMessage ? <p className="mt-4 text-sm font-black text-rose-700 dark:text-rose-200">{reviewLessonMessage}</p> : null}
      </section>

      <AssessmentSettingsPanel detail={detail} />

      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Exam analysis", zh: "試卷分析", zhHans: "试卷分析" })}</h2>
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">{totalPoints(detail.assessment.paperSections)} {t({ en: "points", zh: "分", zhHans: "分" })}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabLabels.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${activeTab === tab.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="soft-panel p-4">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Score distribution", zh: "分數分佈", zhHans: "分数分布" })}</h3>
              <div className="mt-4 grid gap-3">
                {detail.scoreDistribution.map((bucket) => (
                  <div key={bucket.label}>
                    <div className="mb-1 flex justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                      <span>{bucket.label}</span>
                      <span>{bucket.count} · {bucket.percentage}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${bucket.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="soft-panel p-4">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Common wrong questions", zh: "常錯題", zhHans: "常错题" })}</h3>
              <div className="mt-4 grid gap-3">
                {detail.commonWrongQuestions.map((question) => (
                  <div key={question.questionId} className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <MathText text={text(question.prompt)} className="max-w-2xl text-sm font-black text-slate-950 dark:text-white" />
                      <span className="rounded-full border border-amber-300/55 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-100">{question.correctRate ?? "--"}%</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Common wrong answer", zh: "常見錯答", zhHans: "常见错答" })}: {question.commonWrongAnswer ?? "--"}</p>
                  </div>
                ))}
                {!detail.commonWrongQuestions.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No submitted answers yet.", zh: "尚未有提交答案。", zhHans: "尚未有提交答案。" })}</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "rankings" ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Rank", zh: "名次", zhHans: "名次" })}</th><th className="py-3 pr-4">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th><th className="py-3 pr-4">{t({ en: "Score", zh: "分數", zhHans: "分数" })}</th><th className="py-3 pr-4">{t({ en: "Percentage", zh: "百分比", zhHans: "百分比" })}</th><th className="py-3 pr-4">{t({ en: "Tags", zh: "標籤", zhHans: "标签" })}</th><th className="py-3">{t({ en: "Submitted", zh: "提交時間", zhHans: "提交时间" })}</th></tr></thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                {detail.analysis.rankings.map((ranking) => (
                  <tr key={ranking.studentId}>
                    <td className="py-4 pr-4 font-black">{ranking.rank ?? "--"}</td>
                    <td className="py-4 pr-4 font-black text-slate-950 dark:text-white">{ranking.studentName}</td>
                    <td className="py-4 pr-4">{scoreValue(ranking.score, ranking.maxScore)}</td>
                    <td className="py-4 pr-4 font-black">{percentValue(ranking.percentage)}</td>
                    <td className="py-4 pr-4"><div className="flex flex-wrap gap-1.5">{ranking.borderlineTypes.map((type) => <span key={type} className="rounded-full border border-amber-300/55 bg-amber-400/12 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-100">{text(borderlineLabel(type))}</span>)}</div></td>
                    <td className="py-4">{formatDate(ranking.submittedAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "questions" ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Question", zh: "題目", zhHans: "题目" })}</th><th className="py-3 pr-4">{t({ en: "Topic", zh: "知識點", zhHans: "知识点" })}</th><th className="py-3 pr-4">{t({ en: "Score rate", zh: "得分率", zhHans: "得分率" })}</th><th className="py-3 pr-4">{t({ en: "Correct rate", zh: "正確率", zhHans: "正确率" })}</th><th className="py-3 pr-4">{t({ en: "Difficulty", zh: "難度", zhHans: "难度" })}</th><th className="py-3 pr-4">{t({ en: "Discrimination", zh: "區分度", zhHans: "区分度" })}</th><th className="py-3">{t({ en: "Common wrong", zh: "常見錯答", zhHans: "常见错答" })}</th></tr></thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                {detail.questionAnalytics.map((question) => (
                  <tr key={question.questionId}>
                    <td className="py-4 pr-4"><MathText text={text(question.prompt)} className="font-bold" /></td>
                    <td className="py-4 pr-4 font-bold">{question.topicTitle ? text(question.topicTitle) : "--"}</td>
                    <td className="py-4 pr-4 font-black">{percentValue(question.scoreRate)}</td>
                    <td className="py-4 pr-4">{percentValue(question.correctRate)} · {question.correctCount}/{question.totalResponses}</td>
                    <td className="py-4 pr-4">{percentValue(question.difficultyIndex)}</td>
                    <td className="py-4 pr-4">{percentValue(question.discriminationIndex)}</td>
                    <td className="py-4">{question.commonWrongAnswer ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "knowledge" ? (
          <div className="mt-5 grid gap-3">
            {detail.analysis.knowledgeMastery.map((topic) => (
              <div key={topic.topicId} className="soft-panel p-4">
                <div className="flex flex-wrap justify-between gap-3 text-sm font-black"><span>{text(topic.topicTitle)}</span><span>{percentValue(topic.masteryRate)}</span></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${topic.masteryRate ?? 0}%` }} /></div>
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{topic.earnedPoints}/{topic.maxPoints} · {topic.questionCount} {t({ en: "items", zh: "小題", zhHans: "小题" })}</p>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "grade" ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label={t({ en: "Grade average", zh: "年級均分", zhHans: "年级均分" })} value={percentValue(detail.analysis.gradeComparison.gradeAverageScore)} detail={text(detail.analysis.gradeComparison.scopeLabel)} />
              <StatCard label={t({ en: "Class rank", zh: "班級排名", zhHans: "班级排名" })} value={detail.analysis.gradeComparison.currentClassRank === null ? "--" : String(detail.analysis.gradeComparison.currentClassRank)} detail={`${detail.analysis.gradeComparison.classCount} ${t({ en: "classes", zh: "班級", zhHans: "班级" })}`} />
              <StatCard label={t({ en: "Papers", zh: "同卷", zhHans: "同卷" })} value={String(detail.analysis.gradeComparison.assessmentCount)} detail={text(detail.assessment.examGroupName)} />
              <StatCard label={t({ en: "Submissions", zh: "提交", zhHans: "提交" })} value={String(detail.analysis.gradeComparison.submittedCount)} detail={text(detail.analysis.gradeComparison.message)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Class", zh: "班級", zhHans: "班级" })}</th><th className="py-3 pr-4">{t({ en: "Average", zh: "均分", zhHans: "均分" })}</th><th className="py-3 pr-4">{t({ en: "Submitted", zh: "提交", zhHans: "提交" })}</th><th className="py-3">{t({ en: "Assessment", zh: "試卷", zhHans: "试卷" })}</th></tr></thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">{detail.analysis.gradeComparison.classes.map((teacherClass) => <tr key={`${teacherClass.classId}-${teacherClass.assessmentId}`}><td className="py-4 pr-4 font-black">{teacherClass.className}</td><td className="py-4 pr-4">{percentValue(teacherClass.averageScore)}</td><td className="py-4 pr-4">{teacherClass.submittedCount}/{teacherClass.studentCount}</td><td className="py-4">{teacherClass.assessmentId}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === "borderline" ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th><th className="py-3 pr-4">{t({ en: "Type", zh: "類型", zhHans: "类型" })}</th><th className="py-3 pr-4">{t({ en: "Score", zh: "分數", zhHans: "分数" })}</th><th className="py-3 pr-4">{t({ en: "Threshold", zh: "線", zhHans: "线" })}</th><th className="py-3">{t({ en: "Gap", zh: "差距", zhHans: "差距" })}</th></tr></thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                {detail.analysis.borderlineStudents.map((student) => <tr key={`${student.studentId}-${student.type}`}><td className="py-4 pr-4 font-black">{student.studentName}</td><td className="py-4 pr-4">{text(borderlineLabel(student.type))}</td><td className="py-4 pr-4">{scoreValue(student.score, student.maxScore)} · {percentValue(student.percentage)}</td><td className="py-4 pr-4">{student.threshold}%</td><td className="py-4">{student.gap > 0 ? "+" : ""}{student.gap}%</td></tr>)}
              </tbody>
            </table>
            {!detail.analysis.borderlineStudents.length ? <p className="soft-panel mt-4 p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No borderline students under the current settings.", zh: "目前口徑下沒有臨界生。", zhHans: "目前口径下没有临界生。" })}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
        <div className="glass-panel overflow-hidden p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student submissions", zh: "學生提交狀態", zhHans: "学生提交状态" })}</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Rank", zh: "名次", zhHans: "名次" })}</th><th className="py-3 pr-4">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th><th className="py-3 pr-4">{t({ en: "Status", zh: "狀態", zhHans: "状态" })}</th><th className="py-3 pr-4">{t({ en: "Score", zh: "分數", zhHans: "分数" })}</th><th className="py-3 pr-4">{t({ en: "Attempt", zh: "嘗試", zhHans: "尝试" })}</th><th className="py-3 pr-4">{t({ en: "Submitted", zh: "提交時間", zhHans: "提交时间" })}</th><th className="py-3">{t({ en: "Action", zh: "操作", zhHans: "操作" })}</th></tr></thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                {detail.submissions.map((submission) => {
                  const ranking = rankingByStudentId.get(submission.studentId);
                  return (
                    <tr key={submission.id} id={`assessment-submission-${submission.id}`}>
                      <td className="py-4 pr-4 font-black">{ranking?.rank ?? "--"}</td>
                      <td className="py-4 pr-4 font-black text-slate-950 dark:text-white">{submission.studentName}</td>
                      <td className="py-4 pr-4"><StatusPill value={submission.status} label={text(assessmentSubmissionStatusLabels[submission.status])} /></td>
                      <td className="py-4 pr-4 font-black">{scoreValue(submission.score, submission.maxScore)}</td>
                      <td className="py-4 pr-4">{submission.attemptNumber}/{detail.assessment.maxAttempts}</td>
                      <td className="py-4 pr-4">{formatDate(submission.submittedAt, language)}</td>
                      <td className="py-4"><button type="button" onClick={() => setSelectedSubmissionId(submission.id)} className="focus-ring rounded-full border border-slate-200/80 px-3 py-2 text-xs font-black dark:border-white/10">{t({ en: "Mark", zh: "閱卷", zhHans: "阅卷" })}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {selectedSubmission ? <MarkingPanel detail={detail} submission={selectedSubmission} onClose={() => setSelectedSubmissionId(null)} /> : (
          <aside className="glass-panel p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Marking panel", zh: "閱卷面板", zhHans: "阅卷面板" })}</h2>
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Choose a submission from the table.", zh: "從提交表選擇一位學生。", zhHans: "从提交表选择一位学生。" })}</p>
          </aside>
        )}
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Paper and answer key", zh: "試卷與答案", zhHans: "试卷与答案" })}</h2>
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">{totalPoints(detail.assessment.paperSections)} {t({ en: "points", zh: "分", zhHans: "分" })}</p>
        </div>
        <div className="mt-5 grid gap-5">
          {detail.assessment.paperSections.map((section) => (
            <div key={section.id} className="grid gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">{text(section.title)}</h3>
                {section.instructions ? <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{text(section.instructions)}</p> : null}
              </div>
              {section.items.map((item, index) => {
                const analytics = analyticsById.get(item.id);
                return (
                  <div key={item.id} className="soft-panel p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">{index + 1} · {item.points} {t({ en: "points", zh: "分", zhHans: "分" })}</p>
                    <MathText text={analytics ? text(analytics.prompt) : item.questionId ?? item.id} className="mt-2 text-sm font-bold text-slate-950 dark:text-white" />
                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案", zhHans: "答案" })}: {analytics?.correctAnswer ?? item.embeddedQuestion?.answer ?? "--"}</p>
                    {analytics?.explanation ? <MathText text={text(analytics.explanation)} className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400" /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
