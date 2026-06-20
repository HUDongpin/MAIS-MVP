"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import type {
  LocalizedText,
  ParentSafeTeacherDraft,
  TeacherReviewLessonDetailData,
  TeacherReviewLessonItemCategory,
  TeacherReviewLessonMisconceptionTag,
  TeacherReviewLessonPlan,
  TeacherReviewLessonQuestionValidationStatus
} from "@/types";

const categoryOrder: TeacherReviewLessonItemCategory[] = ["must-teach", "quick-review", "individual-support"];
const categoryLabels: Record<TeacherReviewLessonItemCategory, LocalizedText> = {
  "must-teach": { en: "Must teach", zh: "必講題", zhHans: "必讲题" },
  "quick-review": { en: "Quick review", zh: "可略講", zhHans: "可略讲" },
  "individual-support": { en: "Individual support", zh: "個別輔導", zhHans: "个别辅导" }
};
const misconceptionLabels: Record<TeacherReviewLessonMisconceptionTag, LocalizedText> = {
  "conceptual-understanding": { en: "Concept", zh: "概念理解", zhHans: "概念理解" },
  "calculation-symbol": { en: "Calculation", zh: "計算符號", zhHans: "计算符号" },
  "reading-modeling": { en: "Modeling", zh: "審題建模", zhHans: "审题建模" },
  "solution-steps": { en: "Steps", zh: "步驟表達", zhHans: "步骤表达" },
  "graph-table-reading": { en: "Graph/table", zh: "圖表讀取", zhHans: "图表读取" },
  "unit-format": { en: "Unit/format", zh: "單位格式", zhHans: "单位格式" },
  "strategy-choice": { en: "Strategy", zh: "策略選擇", zhHans: "策略选择" }
};

type ReviewLessonOperation =
  | { type: "saved"; plan: TeacherReviewLessonPlan }
  | { type: "reviewed"; plan: TeacherReviewLessonPlan }
  | { type: "parent-draft"; draft: ParentSafeTeacherDraft }
  | { type: "remediation-assessment"; assessmentId: string; plan: TeacherReviewLessonPlan };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black gradient-text">{value}</p>
    </div>
  );
}

function localText(value: LocalizedText, language: "en" | "zh" | "zh-Hans") {
  if (language === "zh-Hans") return value.zhHans ?? value.zh ?? value.en;
  if (language === "zh") return value.zh ?? value.zhHans ?? value.en;
  return value.en;
}

function ReviewLessonOperationPanel({
  operation,
  assessmentId
}: {
  operation: ReviewLessonOperation;
  assessmentId: string;
}) {
  const { text, t } = useSettings();
  const title = operation.type === "parent-draft" ? text(operation.draft.title) : text(operation.plan.title);
  const isRemediation = operation.type === "remediation-assessment";
  const isParentDraft = operation.type === "parent-draft";
  const headline = operation.type === "reviewed"
    ? t({ en: "Review lesson approved", zh: "講評方案已審核", zhHans: "讲评方案已审核" })
    : operation.type === "parent-draft"
      ? t({ en: "Parent draft published", zh: "家長稿已發佈", zhHans: "家长稿已发布" })
      : operation.type === "remediation-assessment"
        ? t({ en: "Remediation draft ready", zh: "補救草稿已就緒", zhHans: "补救草稿已就绪" })
        : t({ en: "Review lesson saved", zh: "講評方案已保存", zhHans: "讲评方案已保存" });
  const detail = operation.type === "parent-draft"
    ? `${operation.draft.className} · ${t({ en: "Notice", zh: "通知", zhHans: "通知" })} ${operation.draft.status}`
    : `${operation.plan.className} · ${operation.plan.durationMinutes} ${t({ en: "min", zh: "分鐘", zhHans: "分钟" })} · ${operation.plan.status}`;

  return (
    <section aria-live="polite" className="mt-4 rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{headline}</p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">{detail}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href="#review-lesson-follow-up" className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Follow-up", zh: "跟進", zhHans: "跟进" })}
          </a>
          {isRemediation ? (
            <Link href={`/teacher/assessments/${encodeURIComponent(operation.assessmentId)}/edit`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
              {t({ en: "Open draft", zh: "打開草稿", zhHans: "打开草稿" })}
            </Link>
          ) : null}
          {isParentDraft ? (
            <Link href={`/teacher/operations/notices#notice-${encodeURIComponent(operation.draft.noticeId)}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
              {t({ en: "Notice receipts", zh: "通知回執", zhHans: "通知回执" })}
            </Link>
          ) : null}
          <Link href={`/teacher/assessments/${encodeURIComponent(assessmentId)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Assessment", zh: "測驗", zhHans: "测验" })}
          </Link>
          <a href={`/api/teacher/review-lessons/${encodeURIComponent(isParentDraft ? operation.draft.sourceReviewLessonId : operation.plan.id)}/exports?format=markdown`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            Markdown
          </a>
        </div>
      </div>
    </section>
  );
}

export function TeacherReviewLessonView({ data }: { data: TeacherReviewLessonDetailData }) {
  const { language, text, t } = useSettings();
  const [plan, setPlan] = useState<TeacherReviewLessonPlan>(data.reviewLesson);
  const [activeCategory, setActiveCategory] = useState<TeacherReviewLessonItemCategory>("must-teach");
  const [title, setTitle] = useState(text(data.reviewLesson.title));
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [isPublishingParentDraft, setIsPublishingParentDraft] = useState(false);
  const [parentSafeDraft, setParentSafeDraft] = useState<ParentSafeTeacherDraft | null>(data.parentSafeDraft);
  const [createdRemediationAssessmentId, setCreatedRemediationAssessmentId] = useState(plan.remediationAssessmentId ?? "");
  const [message, setMessage] = useState("");
  const [lastOperation, setLastOperation] = useState<ReviewLessonOperation | null>(null);

  const counts = useMemo(() => {
    return categoryOrder.reduce<Record<TeacherReviewLessonItemCategory, number>>((memo, category) => {
      memo[category] = plan.items.filter((item) => item.category === category).length;
      return memo;
    }, { "must-teach": 0, "quick-review": 0, "individual-support": 0 });
  }, [plan.items]);
  const activeItems = plan.items.filter((item) => item.category === activeCategory);
  const reviewedRemediationCount = plan.remediationQuestions.filter((question) => question.validationStatus === "validated").length;
  const remediationAssessmentId = plan.remediationAssessmentId ?? createdRemediationAssessmentId;
  const followUpSteps = [
    {
      label: t({ en: "Teacher review", zh: "教師審核", zhHans: "教师审核" }),
      value: plan.status === "reviewed"
        ? t({ en: "Reviewed", zh: "已審核", zhHans: "已审核" })
        : t({ en: "Pending", zh: "待審核", zhHans: "待审核" }),
      ready: plan.status === "reviewed"
    },
    {
      label: t({ en: "Parent-safe draft", zh: "家長安全稿", zhHans: "家长安全稿" }),
      value: parentSafeDraft
        ? t({ en: "Published", zh: "已發佈", zhHans: "已发布" })
        : t({ en: "Not published", zh: "未發佈", zhHans: "未发布" }),
      ready: Boolean(parentSafeDraft)
    },
    {
      label: t({ en: "Remediation draft", zh: "補救測驗草稿", zhHans: "补救测验草稿" }),
      value: remediationAssessmentId
        ? t({ en: "Created", zh: "已建立", zhHans: "已创建" })
        : `${reviewedRemediationCount}/${plan.remediationQuestions.length}`,
      ready: Boolean(remediationAssessmentId)
    }
  ];

  function updateItemCategory(itemId: string, category: TeacherReviewLessonItemCategory) {
    setPlan((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, category } : item)
    }));
  }

  function updateItemNotes(itemId: string, value: string) {
    setPlan((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, teacherNotes: { en: value, zh: value, zhHans: value } } : item)
    }));
  }

  function updatePracticeStatus(questionId: string, status: TeacherReviewLessonQuestionValidationStatus) {
    setPlan((current) => ({
      ...current,
      remediationQuestions: current.remediationQuestions.map((question) => question.id === questionId ? { ...question, validationStatus: status } : question)
    }));
  }

  async function savePlan(nextStatus: TeacherReviewLessonPlan["status"] = plan.status) {
    setMessage("");
    setLastOperation(null);
    setIsSaving(true);
    const response = await fetch(`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status: nextStatus,
        objectives: plan.objectives,
        timeline: plan.timeline,
        items: plan.items,
        slides: plan.slides,
        boardColumns: plan.boardColumns,
        variationQuestions: plan.variationQuestions,
        remediationQuestions: plan.remediationQuestions,
        individualGroups: plan.individualGroups
      })
    });
    setIsSaving(false);
    const payload = await response.json().catch(() => null) as { reviewLesson?: TeacherReviewLessonPlan; error?: string } | null;
    if (!response.ok || !payload?.reviewLesson) {
      setMessage(t({ en: "Could not save the review lesson.", zh: "未能保存講評方案。", zhHans: "未能保存讲评方案。" }));
      return;
    }
    setPlan(payload.reviewLesson);
    setTitle(text(payload.reviewLesson.title));
    setLastOperation({ type: payload.reviewLesson.status === "reviewed" && nextStatus === "reviewed" ? "reviewed" : "saved", plan: payload.reviewLesson });
    setMessage(t({ en: "Saved.", zh: "已保存。", zhHans: "已保存。" }));
  }

  async function createRemediationAssessment() {
    setMessage("");
    setLastOperation(null);
    setIsCreatingAssessment(true);
    const response = await fetch(`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}/remediation-assessments`, { method: "POST" });
    setIsCreatingAssessment(false);
    const payload = await response.json().catch(() => null) as { assessment?: { id: string }; reviewLesson?: TeacherReviewLessonPlan; error?: string } | null;
    if (!response.ok || !payload?.assessment) {
      setMessage(response.status === 409
        ? t({ en: "Review at least one remediation question before creating a draft assessment.", zh: "請先審核至少一道補救題。", zhHans: "请先审核至少一道补救题。" })
        : t({ en: "Could not create remediation draft.", zh: "未能建立補救測驗草稿。", zhHans: "未能建立补救测验草稿。" }));
      return;
    }
    if (payload.reviewLesson) setPlan(payload.reviewLesson);
    setCreatedRemediationAssessmentId(payload.assessment.id);
    setLastOperation({
      type: "remediation-assessment",
      assessmentId: payload.assessment.id,
      plan: payload.reviewLesson ?? plan
    });
    setMessage(t({ en: "Remediation assessment draft created. Open it when you are ready to edit and publish.", zh: "補救測驗草稿已建立，可打開編輯及發布。", zhHans: "补救测验草稿已创建，可打开编辑并发布。" }));
  }

  async function publishParentDraft() {
    setMessage("");
    setLastOperation(null);
    setIsPublishingParentDraft(true);
    const response = await fetch(`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}/parent-draft`, { method: "POST" });
    setIsPublishingParentDraft(false);
    const payload = await response.json().catch(() => null) as { draft?: ParentSafeTeacherDraft; error?: string } | null;
    if (!response.ok || !payload?.draft) {
      setMessage(response.status === 409
        ? t({ en: "Mark this review lesson as reviewed before publishing a parent-safe draft.", zh: "請先標記講評方案已審核，再發佈家長安全版本。", zhHans: "请先标记讲评方案已审核，再发布家长安全版本。" })
        : t({ en: "Could not publish the parent-safe draft.", zh: "未能發佈家長安全版本。", zhHans: "未能发布家长安全版本。" }));
      return;
    }
    setParentSafeDraft(payload.draft);
    setLastOperation({ type: "parent-draft", draft: payload.draft });
    setMessage(t({ en: "Parent-safe draft published.", zh: "家長安全版本已發佈。", zhHans: "家长安全版本已发布。" }));
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link href={`/teacher/assessments/${data.assessment.id}`} className="text-sm font-black text-cyan-700 dark:text-cyan-200">
              {t({ en: "Back to assessment", zh: "返回測驗", zhHans: "返回测验" })}
            </Link>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="focus-ring mt-4 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-2xl font-black text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              {data.class.name} · {text(data.assessment.title)} · {plan.durationMinutes} {t({ en: "min", zh: "分鐘", zhHans: "分钟" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isSaving} onClick={() => savePlan()} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black disabled:opacity-50 dark:border-white/10">
              {isSaving ? t({ en: "Saving", zh: "保存中", zhHans: "保存中" }) : t({ en: "Save", zh: "保存", zhHans: "保存" })}
            </button>
            <button type="button" disabled={isSaving} onClick={() => savePlan("reviewed")} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {t({ en: "Mark reviewed", zh: "標記已審核", zhHans: "标记已审核" })}
            </button>
            {plan.status === "reviewed" ? (
              <button type="button" disabled={isPublishingParentDraft || Boolean(parentSafeDraft)} onClick={publishParentDraft} className="focus-ring rounded-full border border-emerald-300/60 bg-emerald-300/10 px-5 py-3 text-sm font-black text-emerald-800 disabled:opacity-55 dark:text-emerald-100">
                {parentSafeDraft
                  ? t({ en: "Parent draft published", zh: "家長版本已發佈", zhHans: "家长版本已发布" })
                  : isPublishingParentDraft
                    ? t({ en: "Publishing", zh: "發佈中", zhHans: "发布中" })
                    : t({ en: "Publish parent draft", zh: "發佈家長版本", zhHans: "发布家长版本" })}
              </button>
            ) : null}
            <a href={`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}/exports?format=markdown`} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">
              Markdown
            </a>
            <a href={`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}/exports?format=pptx`} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">
              PPTX
            </a>
            <a href={`/api/teacher/review-lessons/${encodeURIComponent(plan.id)}/exports?format=json`} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black dark:border-white/10">
              JSON
            </a>
          </div>
        </div>
        {plan.sourceSnapshotStale ? (
          <p className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-300/12 px-4 py-3 text-sm font-black text-amber-800 dark:text-amber-100">
            {t({ en: "Source assessment has changed since this plan was generated.", zh: "來源測驗在生成後已有變更。", zhHans: "来源测验在生成后已有变更。" })}
          </p>
        ) : null}
        {parentSafeDraft ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/60 bg-emerald-300/12 px-4 py-3 text-sm font-black text-emerald-800 dark:text-emerald-100">
            {t({ en: "Parent-safe draft is visible to linked guardians.", zh: "家長安全版本已對已連結監護人可見。", zhHans: "家长安全版本已对已关联监护人可见。" })}
          </p>
        ) : null}
        {message ? <p className="mt-4 text-sm font-black text-cyan-700 dark:text-cyan-200">{message}</p> : null}
        {lastOperation ? <ReviewLessonOperationPanel operation={lastOperation} assessmentId={data.assessment.id} /> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <StatCard label={t(categoryLabels["must-teach"])} value={String(counts["must-teach"])} />
          <StatCard label={t(categoryLabels["quick-review"])} value={String(counts["quick-review"])} />
          <StatCard label={t(categoryLabels["individual-support"])} value={String(counts["individual-support"])} />
          <StatCard label={t({ en: "Remediation reviewed", zh: "已審核補救題", zhHans: "已审核补救题" })} value={`${reviewedRemediationCount}/${plan.remediationQuestions.length}`} />
        </div>
      </section>

      <section id="review-lesson-follow-up" className="glass-panel scroll-mt-24 p-5 sm:p-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{t({ en: "Follow-up operations", zh: "課後跟進", zhHans: "课后跟进" })}</p>
            <h2 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Close the review loop", zh: "完成講評閉環", zhHans: "完成讲评闭环" })}</h2>
          </div>
          {remediationAssessmentId ? (
            <Link href={`/teacher/assessments/${encodeURIComponent(remediationAssessmentId)}/edit`} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Open remediation draft", zh: "打開補救草稿", zhHans: "打开补救草稿" })}
            </Link>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {followUpSteps.map((step) => (
            <div key={step.label} className={`soft-panel min-w-0 p-4 ${step.ready ? "border-emerald-300/55 bg-emerald-400/10" : ""}`}>
              <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{step.label}</p>
              <p className={`mt-2 break-words text-lg font-black ${step.ready ? "text-emerald-800 dark:text-emerald-100" : "text-slate-950 dark:text-white"}`}>{step.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={isSaving || plan.status === "reviewed"} onClick={() => savePlan("reviewed")} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black disabled:opacity-50 dark:border-white/10">
            {t({ en: "Mark reviewed", zh: "標記已審核", zhHans: "标记已审核" })}
          </button>
          <button type="button" disabled={isPublishingParentDraft || plan.status !== "reviewed" || Boolean(parentSafeDraft)} onClick={publishParentDraft} className="focus-ring rounded-full border border-emerald-300/60 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-800 disabled:opacity-50 dark:text-emerald-100">
            {parentSafeDraft ? t({ en: "Parent draft published", zh: "家長稿已發佈", zhHans: "家长稿已发布" }) : t({ en: "Publish parent draft", zh: "發佈家長稿", zhHans: "发布家长稿" })}
          </button>
          <button type="button" disabled={isCreatingAssessment || reviewedRemediationCount === 0 || Boolean(remediationAssessmentId)} onClick={createRemediationAssessment} className="focus-ring rounded-full border border-cyan-300/60 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-800 disabled:opacity-50 dark:text-cyan-100">
            {remediationAssessmentId
              ? t({ en: "Remediation draft ready", zh: "補救草稿已就緒", zhHans: "补救草稿已就绪" })
              : isCreatingAssessment
                ? t({ en: "Creating", zh: "建立中", zhHans: "创建中" })
                : t({ en: "Create remediation draft", zh: "建立補救草稿", zhHans: "创建补救草稿" })}
          </button>
        </div>
      </section>

      <section id="review-lesson-triage" className="glass-panel scroll-mt-24 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Question triage", zh: "題目分流", zhHans: "题目分流" })}</h2>
          <div className="flex flex-wrap gap-2">
            {categoryOrder.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${activeCategory === category ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200/80 dark:border-white/10"}`}
              >
                {t(categoryLabels[category])} · {counts[category]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          {activeItems.map((item) => (
            <article key={item.id} className="soft-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <MathText text={text(item.prompt)} className="text-sm font-black text-slate-950 dark:text-white" />
                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Correct", zh: "答對", zhHans: "答对" })}: {item.correctCount}/{item.totalResponses} · {t({ en: "Common wrong", zh: "常見錯答", zhHans: "常见错答" })}: {item.commonWrongAnswer ?? "--"}
                  </p>
                </div>
                <select value={item.category} onChange={(event) => updateItemCategory(item.id, event.target.value as TeacherReviewLessonItemCategory)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]">
                  {categoryOrder.map((category) => <option key={category} value={category}>{t(categoryLabels[category])}</option>)}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.misconceptionTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-100">{t(misconceptionLabels[tag])}</span>
                ))}
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{text(item.categoryReason)}</p>
              <MathText text={text(item.teachingScript)} className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300" />
              {item.wrongStudentNames.length ? (
                <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t({ en: "Teacher-only support list", zh: "教師私下輔導名單", zhHans: "教师私下辅导名单" })}: {item.wrongStudentNames.join(", ")}
                </p>
              ) : null}
              <textarea
                value={localText(item.teacherNotes, language)}
                onChange={(event) => updateItemNotes(item.id, event.target.value)}
                placeholder={t({ en: "Teacher notes", zh: "教師備註", zhHans: "教师备注" })}
                className="focus-ring mt-3 min-h-20 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]"
              />
            </article>
          ))}
          {!activeItems.length ? <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No questions in this group.", zh: "此分類暫無題目。", zhHans: "此分类暂无题目。" })}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Blackboard plan", zh: "板書方案", zhHans: "板书方案" })}</h2>
            <button type="button" onClick={() => window.print()} className="focus-ring rounded-full border border-slate-200/80 px-4 py-2 text-sm font-black dark:border-white/10">{t({ en: "Print", zh: "列印", zhHans: "打印" })}</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {plan.boardColumns.map((column) => (
              <div key={column.id} className="soft-panel p-4">
                <h3 className="font-black text-slate-950 dark:text-white">{text(column.title)}</h3>
                <div className="mt-3 grid gap-2">
                  {column.blocks.map((block, index) => <p key={`${column.id}-${index}`} className="text-sm font-bold text-slate-600 dark:text-slate-300">{text(block)}</p>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Slides", zh: "課件", zhHans: "课件" })}</h2>
          <div className="mt-5 grid gap-3">
            {plan.slides.map((slide) => (
              <div key={slide.id} className="soft-panel p-4">
                <p className="font-black text-slate-950 dark:text-white">{text(slide.title)}</p>
                <ul className="mt-2 grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                  {slide.bullets.map((bullet, index) => <li key={`${slide.id}-${index}`}>{text(bullet)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="review-lesson-remediation" className="glass-panel scroll-mt-24 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Remediation practice", zh: "課後補救", zhHans: "课后补救" })}</h2>
          <div className="flex flex-wrap gap-2">
            {remediationAssessmentId ? (
              <Link href={`/teacher/assessments/${encodeURIComponent(remediationAssessmentId)}/edit`} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {t({ en: "Open draft assessment", zh: "打開測驗草稿", zhHans: "打开测验草稿" })}
              </Link>
            ) : null}
            <button type="button" disabled={isCreatingAssessment || reviewedRemediationCount === 0 || Boolean(remediationAssessmentId)} onClick={createRemediationAssessment} className="focus-ring rounded-full border border-slate-200/80 px-5 py-3 text-sm font-black disabled:opacity-50 dark:border-white/10">
              {remediationAssessmentId
                ? t({ en: "Draft created", zh: "草稿已建立", zhHans: "草稿已创建" })
                : isCreatingAssessment
                  ? t({ en: "Creating", zh: "建立中", zhHans: "创建中" })
                  : t({ en: "Create draft assessment", zh: "建立測驗草稿", zhHans: "创建测验草稿" })}
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {plan.remediationQuestions.map((question, index) => (
            <div key={question.id} className="soft-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">{index + 1} · {question.source}</p>
                  <MathText text={text(question.prompt)} className="mt-2 text-sm font-bold text-slate-950 dark:text-white" />
                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案", zhHans: "答案" })}: {question.answer || "--"}</p>
                </div>
                <select value={question.validationStatus} onChange={(event) => updatePracticeStatus(question.id, event.target.value as TeacherReviewLessonQuestionValidationStatus)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]">
                  <option value="validated">{t({ en: "Reviewed", zh: "已審核", zhHans: "已审核" })}</option>
                  <option value="needs-teacher-review">{t({ en: "Needs review", zh: "待審核", zhHans: "待审核" })}</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
