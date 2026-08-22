"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { TeacherReportsBackToTopButton } from "@/components/teacher/TeacherReportsBackToTopButton";
import {
  buildTeacherReportRequest,
  hasTeacherReportTarget,
  initialTeacherReportTarget,
  loadTeacherReportPreview,
  reduceTeacherReportFormState,
  teacherReportAssessmentsForClass,
  teacherReportAssignmentsForClass,
  teacherReportRequestKey,
  teacherReportRequestSearchParams,
  teacherReportPreviewMatchesRequest,
  teacherReportStudentsForClass,
  visibleTeacherReportPreview,
  type TeacherReportFormState
} from "@/components/teacher/teacherReportFormState";
import { textForLanguage } from "@/lib/i18n";
import { formatDateInHongKong } from "@/lib/utils";
import type { LocalizedText, TeacherReport, TeacherReportLanguage, TeacherReportPreview, TeacherReportType, TeacherReportsData } from "@/types";

const reportTypes: TeacherReportType[] = ["student", "class", "assignment", "assessment", "parent-summary"];

function reportTypeLabel(type: TeacherReportType) {
  const labels: Record<TeacherReportType, { en: string; zh: string }> = {
    student: { en: "Student report", zh: "學生學習報告" },
    class: { en: "Class weekly", zh: "班級周報" },
    assignment: { en: "Assignment", zh: "作業報告" },
    assessment: { en: "Quiz", zh: "測驗報告" },
    "parent-summary": { en: "Parent summary", zh: "家長摘要" }
  };
  return labels[type];
}

function metric(value: number | null, suffix = "") {
  return value === null ? "-" : `${value}${suffix}`;
}

function reportLanguageForApp(language: string): TeacherReportLanguage {
  if (language === "zh-Hans") return "zh-Hans";
  return language === "en" ? "en" : "zh";
}

function reportLanguageOptionsForApp(language: TeacherReportLanguage) {
  if (language === "zh") {
    return [
      { value: "zh", label: "繁體中文" },
      { value: "en", label: "英文" }
    ] satisfies { value: TeacherReportLanguage; label: string }[];
  }

  if (language === "zh-Hans") {
    return [
      { value: "zh-Hans", label: "简体中文" },
      { value: "en", label: "英文" }
    ] satisfies { value: TeacherReportLanguage; label: string }[];
  }

  return [
    { value: "en", label: "English" },
    { value: "zh", label: "繁體中文" },
    { value: "zh-Hans", label: "简体中文" }
  ] satisfies { value: TeacherReportLanguage; label: string }[];
}

function reportCopy(value: LocalizedText, language: TeacherReportLanguage) {
  return textForLanguage(value, language);
}

function ReportPreview({ preview }: { preview: TeacherReportPreview }) {
  const metricCards = [
    { label: reportCopy({ en: "Learning time", zh: "學習時長" }, preview.language), value: metric(preview.metrics.learningMinutes, "m") },
    { label: reportCopy({ en: "Mastery change", zh: "掌握度變化" }, preview.language), value: `${preview.metrics.masteryChange > 0 ? "+" : ""}${preview.metrics.masteryChange}` },
    { label: reportCopy({ en: "Average mastery", zh: "平均掌握" }, preview.language), value: metric(preview.metrics.averageMastery, "%") },
    { label: reportCopy({ en: "Accuracy", zh: "準確率" }, preview.language), value: metric(preview.metrics.accuracy, "%") },
    { label: reportCopy({ en: "Completion", zh: "完成率" }, preview.language), value: metric(preview.metrics.completionRate, "%") }
  ];

  return (
    <article className="glass-panel p-6 print:border-0 print:bg-white print:text-slate-950 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 print:text-slate-500 dark:text-cyan-300">{preview.subjectName}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white print:text-slate-950">{preview.title}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400 print:text-slate-600">{preview.subtitle}</p>
        </div>
        <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300 print:border-slate-300 print:text-slate-600">
          {formatDateInHongKong(preview.generatedAt, preview.language, { dateStyle: "medium" })}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06] print:border-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 print:text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white print:text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ReportList title={reportCopy({ en: "Strengths", zh: "強項" }, preview.language)} items={preview.strengths} />
        <ReportList title={reportCopy({ en: "Weaknesses", zh: "弱項" }, preview.language)} items={preview.weaknesses} />
        <ReportList title={reportCopy({ en: "Mistake types", zh: "錯題類型" }, preview.language)} items={preview.mistakeTypes.length ? preview.mistakeTypes : [reportCopy({ en: "No repeated mistake type yet", zh: "暫未有重複錯題類型" }, preview.language)]} />
        <ReportList title={reportCopy({ en: "Suggested practice", zh: "建議練習" }, preview.language)} items={preview.suggestedPractice} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06] print:border-slate-200">
        <p className="text-sm font-black text-slate-950 dark:text-white print:text-slate-950">{reportCopy({ en: "Teacher remarks", zh: "教師備註" }, preview.language)}</p>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300 print:text-slate-700">{preview.teacherRemarks || "-"}</p>
      </div>
    </article>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06] print:border-slate-200">
      <h3 className="text-base font-black text-slate-950 dark:text-white print:text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300 print:text-slate-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export function TeacherReportsView({ reports }: { reports: TeacherReportsData }) {
  const { currentUser, language: appLanguage, t, text } = useSettings();
  const appReportLanguage = reportLanguageForApp(appLanguage);
  const reportsHeading = currentUser?.curriculumProfile?.region === "US"
    ? { en: "Learning reports", zh: "學習報告" }
    : { en: "Bilingual learning reports", zh: "學習報告" };
  const [type, setType] = useState<TeacherReportType>(reports.defaultPreview?.type ?? "class");
  const [language, setLanguage] = useState<TeacherReportLanguage>(appReportLanguage);
  const requestedClassId = useSearchParams().get("classId");
  const [remarks, setRemarks] = useState("");
  const reportCatalog = useMemo(() => ({
    classes: reports.classes,
    students: reports.students,
    assignments: reports.assignments,
    assessments: reports.assessments
  }), [reports.assessments, reports.assignments, reports.classes, reports.students]);
  const [formState, setFormState] = useState<TeacherReportFormState>(() => {
    const target = initialTeacherReportTarget(reportCatalog, requestedClassId);
    const initialRequest = buildTeacherReportRequest({
      type,
      language: appReportLanguage,
      remarks: "",
      target
    });
    const initialPreview = teacherReportPreviewMatchesRequest(reports.defaultPreview, initialRequest)
      ? reports.defaultPreview
      : null;
    return {
      target,
      previewState: {
        preview: initialPreview,
        error: null
      },
      activePreviewRequestKey: initialPreview
        ? teacherReportRequestKey(initialRequest)
        : null,
      activePreviewGeneration: initialPreview ? 0 : null
    };
  });
  const { target, previewState } = formState;
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [reportHistory, setReportHistory] = useState(reports.reportHistory);
  const [latestSavedReportId, setLatestSavedReportId] = useState<string | null>(null);
  const previousAppReportLanguageRef = useRef(appReportLanguage);
  const previousRequestedClassIdRef = useRef(requestedClassId);
  const latestReportTypeRef = useRef(type);
  const previewGenerationRef = useRef(0);
  latestReportTypeRef.current = type;
  // The shell's "Class focus" navigates client-side without remounting this view,
  // so follow actual param changes. Catalog refreshes preserve a still-owned
  // manual class selection and report-type changes do not run this effect.
  useEffect(() => {
    const requestedClassChanged = previousRequestedClassIdRef.current !== requestedClassId;
    previousRequestedClassIdRef.current = requestedClassId;
    setFormState((current) => reduceTeacherReportFormState(current, {
      type: "catalog-synchronized",
      requestedClassId,
      requestedClassChanged,
      reportType: latestReportTypeRef.current,
      catalog: reportCatalog
    }));
  }, [reportCatalog, requestedClassId]);
  const reportLanguageOptions = useMemo(() => reportLanguageOptionsForApp(appReportLanguage), [appReportLanguage]);
  const visibleStudents = useMemo(
    () => teacherReportStudentsForClass(reports.students, target.classId),
    [reports.students, target.classId]
  );
  const visibleAssignments = useMemo(
    () => teacherReportAssignmentsForClass(reports.assignments, target.classId),
    [reports.assignments, target.classId]
  );
  const visibleAssessments = useMemo(
    () => teacherReportAssessmentsForClass(reports.assessments, target.classId),
    [reports.assessments, target.classId]
  );
  // Exports need the same target selection as previews; without one, the export
  // links must be disabled with an explanation instead of silently doing nothing.
  const hasExportTarget = hasTeacherReportTarget(type, target, reportCatalog);
  const reportRequest = useMemo(
    () => buildTeacherReportRequest({ type, language, remarks, target }),
    [language, remarks, target, type]
  );
  const visiblePreview = hasExportTarget
    ? visibleTeacherReportPreview(formState, reportRequest)
    : null;
  const csvUrl = useMemo(
    () => `/api/teacher/report-exports?${teacherReportRequestSearchParams(reportRequest, "csv").toString()}`,
    [reportRequest]
  );
  const pdfUrl = useMemo(
    () => `/api/teacher/report-exports?${teacherReportRequestSearchParams(reportRequest, "pdf").toString()}`,
    [reportRequest]
  );

  function clearPreviewFor(nextType: TeacherReportType) {
    setFormState((current) => reduceTeacherReportFormState(current, {
      type: "preview-invalidated",
      reportType: nextType,
      catalog: reportCatalog
    }));
  }

  function updateTarget(resolveTarget: (current: typeof target) => typeof target) {
    setFormState((current) => reduceTeacherReportFormState(current, {
      type: "target-selected",
      target: resolveTarget(current.target),
      reportType: type,
      catalog: reportCatalog
    }));
  }

  async function saveReport() {
    setIsSaving(true);
    setSaveMessage("");
    const response = await fetch("/api/teacher/saved-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportRequest)
    });
    const payload = await response.json().catch(() => null) as { report?: TeacherReport } | null;
    setIsSaving(false);
    if (response.ok && payload?.report) {
      setReportHistory((current) => [payload.report!, ...current.filter((report) => report.id !== payload.report!.id)].slice(0, 12));
      setLatestSavedReportId(payload.report.id);
      setSaveMessage(t({ en: "Report saved and added to history.", zh: "報告已儲存並加入紀錄。" }));
      return;
    }
    setSaveMessage(t({ en: "Could not save this report yet.", zh: "暫時未能儲存此報告。" }));
  }

  useEffect(() => {
    if (previousAppReportLanguageRef.current === appReportLanguage) return;
    previousAppReportLanguageRef.current = appReportLanguage;
    setLanguage(appReportLanguage);
    setFormState((current) => (
      current.previewState.preview?.language === appReportLanguage
        ? current
        : reduceTeacherReportFormState(current, {
          type: "preview-invalidated",
          reportType: type,
          catalog: reportCatalog
        })
    ));
  }, [appReportLanguage, reportCatalog, type]);

  useEffect(() => {
    const controller = new AbortController();

    if (!hasExportTarget) {
      setFormState((current) => reduceTeacherReportFormState(current, {
        type: "preview-invalidated",
        reportType: type,
        catalog: reportCatalog
      }));
      setIsLoading(false);
      return () => controller.abort();
    }

    const requestKey = teacherReportRequestKey(reportRequest);
    const generation = ++previewGenerationRef.current;
    setFormState((current) => reduceTeacherReportFormState(current, {
      type: "preview-load-start",
      requestKey,
      generation
    }));
    setIsLoading(true);
    async function loadPreview() {
      try {
        const result = await loadTeacherReportPreview({
          fetcher: fetch,
          url: `/api/teacher/report-previews?${teacherReportRequestSearchParams(reportRequest).toString()}`,
          request: reportRequest,
          signal: controller.signal
        });
        if (result.status === "aborted") return;
        if (result.status === "loaded") {
          setFormState((current) => reduceTeacherReportFormState(current, {
            type: "preview-load-succeeded",
            requestKey: result.requestKey,
            generation,
            preview: result.preview
          }));
          return;
        }
        setFormState((current) => reduceTeacherReportFormState(current, {
          type: "preview-load-failed",
          requestKey: result.requestKey,
          generation,
          reason: result.reason
        }));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    const previewTimer = window.setTimeout(loadPreview, reports.defaultPreview ? 0 : 200);
    return () => {
      window.clearTimeout(previewTimer);
      controller.abort();
    };
  }, [hasExportTarget, reportCatalog, reportRequest, reports.defaultPreview, type]);

  return (
    <div className="grid gap-7">
      <section className="glass-panel p-6 sm:p-8 print:hidden">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Reports", zh: "報告與溝通" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          {t(reportsHeading)}
        </h1>
      </section>

      <section className="glass-panel p-5 sm:p-6 print:hidden">
        <div className="grid gap-4 xl:grid-cols-[190px_160px_1fr_1fr]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Type", zh: "類型" })}</span>
            <select value={type} onChange={(event) => {
              const nextType = event.target.value as TeacherReportType;
              setType(nextType);
              clearPreviewFor(nextType);
            }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {reportTypes.map((item) => <option key={item} value={item}>{text(reportTypeLabel(item))}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Language", zh: "語言" })}</span>
            <select value={language} onChange={(event) => {
              setLanguage(event.target.value as TeacherReportLanguage);
              clearPreviewFor(type);
            }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {reportLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級" })}</span>
            <select value={target.classId} onChange={(event) => {
              setFormState((current) => reduceTeacherReportFormState(current, {
                type: "class-requested",
                classId: event.target.value,
                reportType: type,
                catalog: reportCatalog
              }));
            }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {reports.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>)}
            </select>
          </label>
          {type === "student" || type === "parent-summary" ? (
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Student", zh: "學生" })}</span>
              <select value={target.studentId} onChange={(event) => {
                const studentId = event.target.value;
                updateTarget((current) => ({ ...current, studentId }));
              }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {visibleStudents.map((student) => <option key={student.id} value={student.studentId}>{text(student.label)}</option>)}
              </select>
            </label>
          ) : type === "assignment" ? (
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Assignment", zh: "作業" })}</span>
              <select value={target.assignmentId} onChange={(event) => {
                const assignmentId = event.target.value;
                updateTarget((current) => ({ ...current, assignmentId }));
              }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {visibleAssignments.map((assignment) => <option key={assignment.id} value={assignment.assignmentId}>{text(assignment.label)}</option>)}
              </select>
            </label>
          ) : type === "assessment" ? (
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Quiz", zh: "測驗" })}</span>
              <select value={target.assessmentId} onChange={(event) => {
                const assessmentId = event.target.value;
                updateTarget((current) => ({ ...current, assessmentId }));
              }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {visibleAssessments.map((assessment) => <option key={assessment.id} value={assessment.assessmentId}>{text(assessment.label)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <label className="mt-4 grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Teacher remarks", zh: "教師備註" })}</span>
          <textarea value={remarks} onChange={(event) => {
            setRemarks(event.target.value);
            clearPreviewFor(type);
          }} rows={3} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          {hasExportTarget ? (
            <>
              <a href={pdfUrl} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {t({ en: "Export PDF", zh: "匯出 PDF" })}
              </a>
              <a href={csvUrl} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
                {t({ en: "Export CSV", zh: "匯出 CSV" })}
              </a>
            </>
          ) : (
            <>
              <button type="button" disabled className="focus-ring cursor-not-allowed rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white opacity-50 dark:bg-white dark:text-slate-950">
                {t({ en: "Export PDF", zh: "匯出 PDF" })}
              </button>
              <button type="button" disabled className="focus-ring cursor-not-allowed rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black opacity-50 dark:border-white/10 dark:bg-white/[0.07]">
                {t({ en: "Export CSV", zh: "匯出 CSV" })}
              </button>
            </>
          )}
          <button type="button" onClick={saveReport} disabled={isSaving || isLoading || !hasExportTarget} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07]">
            {isSaving ? t({ en: "Saving", zh: "儲存中" }) : t({ en: "Save report", zh: "儲存報告" })}
          </button>
          {isLoading ? <span className="self-center text-sm font-bold text-cyan-700 dark:text-cyan-200">{t({ en: "Updating", zh: "更新中" })}</span> : null}
        </div>
        {!hasExportTarget ? (
          <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-200">
            {t({
              en: "Select a class with students (or a student, assignment, or assessment) to enable exports.",
              zh: "請先選擇有學生的班級（或學生、作業、測驗），才可匯出報告。",
              zhHans: "请先选择有学生的班级（或学生、作业、测验），才可导出报告。"
            })}
          </p>
        ) : null}
        {saveMessage ? <p role="status" className="mt-3 text-sm font-bold text-cyan-700 dark:text-cyan-200">{saveMessage}</p> : null}
      </section>

      {previewState.error ? (
        <section role="alert" aria-live="assertive" className="glass-panel border border-rose-300/70 p-6 text-sm font-bold text-rose-700 dark:border-rose-300/30 dark:text-rose-200">
          {previewState.error === "invalid-target"
            ? (type === "student" || type === "parent-summary"
              ? t({
                en: "Select a valid class and student pair to preview this report.",
                zh: "請選擇有效的班級與學生配對，以預覽此報告。",
                zhHans: "请选择有效的班级与学生配对，以预览此报告。"
              })
              : t({
                en: "Select a valid report target to load this preview.",
                zh: "請選擇有效的報告對象，以載入預覽。",
                zhHans: "请选择有效的报告对象，以加载预览。"
              }))
            : t({
              en: "Could not load this report preview. Check the target and try again.",
              zh: "暫時未能載入此報告預覽，請檢查對象後再試。",
              zhHans: "暂时无法加载此报告预览，请检查对象后重试。"
            })}
        </section>
      ) : visiblePreview ? <ReportPreview preview={visiblePreview} /> : (
        <section className="glass-panel p-6 text-sm font-bold text-slate-500 dark:text-slate-400">
          {isLoading ? t({ en: "Updating report preview.", zh: "正在更新報告預覽。" }) : t({ en: "No report preview available.", zh: "暫未有報告預覽。" })}
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6 print:hidden">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Saved reports", zh: "已儲存報告" })}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reportHistory.slice(0, 6).map((report) => (
            <article key={report.id} className="soft-panel p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-black text-slate-950 dark:text-white">{text(report.title)}</p>
                {report.id === latestSavedReportId ? (
                  <span className="shrink-0 rounded-full border border-emerald-300/60 bg-emerald-300/12 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-100">
                    {t({ en: "Saved", zh: "已儲存" })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">{text(reportTypeLabel(report.type))}</p>
              <p className="mt-3 line-clamp-3 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{text(report.summary)}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateInHongKong(report.generatedAt, language, { dateStyle: "medium", timeStyle: "short" })}</p>
            </article>
          ))}
          {!reportHistory.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Saved reports will appear here.", zh: "已儲存報告會顯示在這裡。" })}</p> : null}
        </div>
      </section>
      <TeacherReportsBackToTopButton />
    </div>
  );
}
