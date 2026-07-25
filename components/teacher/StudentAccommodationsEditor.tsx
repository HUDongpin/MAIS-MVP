"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  accommodationAnswerChoiceOptions,
  accommodationCalculatorPolicyLabels,
  accommodationCalculatorPolicyValues,
  accommodationExtendedTimeLabels,
  accommodationExtendedTimeValues,
  defaultStudentAccommodations
} from "@/lib/accommodations";
import { formatDateInHongKong } from "@/lib/utils";
import type {
  AccommodationCalculatorPolicy,
  AccommodationExtendedTime,
  StudentAccommodations,
  StudentAccommodationsProfile
} from "@/types";

function accommodationsFromProfile(profile: StudentAccommodationsProfile): StudentAccommodations {
  return {
    extendedTime: profile.extendedTime,
    readAloud: profile.readAloud,
    maxAnswerChoices: profile.maxAnswerChoices,
    calculatorPolicy: profile.calculatorPolicy,
    notes: profile.notes
  };
}

function answerChoiceLabel(value: number, t: (value: { en: string; zh: string; zhHans?: string }) => string) {
  if (value <= 0) return t({ en: "Show all options", zh: "顯示全部選項", zhHans: "显示全部选项" });
  return t({ en: `${value} options`, zh: `${value} 個選項`, zhHans: `${value} 个选项` });
}

const controlClassName =
  "focus-ring min-h-11 w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]";
const labelClassName = "text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

export function StudentAccommodationsEditor({
  studentId,
  profile
}: {
  studentId: string;
  profile: StudentAccommodationsProfile;
}) {
  const router = useRouter();
  const { language, t } = useSettings();
  const [accommodations, setAccommodations] = useState<StudentAccommodations>(() => accommodationsFromProfile(profile));
  const [hasPlan, setHasPlan] = useState(profile.hasPlan);
  const [updatedAt, setUpdatedAt] = useState(profile.updatedAt);
  const [updatedByName, setUpdatedByName] = useState(profile.updatedByName);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const update = <Key extends keyof StudentAccommodations>(key: Key, value: StudentAccommodations[Key]) => {
    setAccommodations((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/accommodations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accommodations)
      });
      const payload = await response.json().catch(() => null) as { profile?: StudentAccommodationsProfile } | null;
      if (!response.ok || !payload?.profile) {
        setIsError(true);
        setMessage(t({ en: "Could not save these accommodations yet.", zh: "暫時未能儲存這些調適安排。", zhHans: "暂时未能保存这些调适安排。" }));
        return;
      }

      setAccommodations(accommodationsFromProfile(payload.profile));
      setHasPlan(payload.profile.hasPlan);
      setUpdatedAt(payload.profile.updatedAt);
      setUpdatedByName(payload.profile.updatedByName);
      setMessage(t({ en: "Accommodations saved. They now follow this student.", zh: "已儲存調適安排，會跟隨此學生。", zhHans: "已保存调适安排，会跟随此学生。" }));
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(t({ en: "Could not save these accommodations yet.", zh: "暫時未能儲存這些調適安排。", zhHans: "暂时未能保存这些调适安排。" }));
    } finally {
      setIsSaving(false);
    }
  };

  const resetToStandard = () => {
    setAccommodations({ ...defaultStudentAccommodations });
    setMessage("");
    setIsError(false);
  };

  const updatedLabel = updatedAt
    ? formatDateInHongKong(updatedAt, language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section className="glass-panel p-5" aria-labelledby="accommodations-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="accommodations-heading" className="text-2xl font-black text-slate-950 dark:text-white">
            {t({ en: "Accommodations", zh: "調適安排", zhHans: "调适安排" })}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t({
              en: "IEP / 504 supports that follow this student into every class and lesson.",
              zh: "IEP / 504 支援，會跟隨此學生進入每個班級和課節。",
              zhHans: "IEP / 504 支持，会跟随此学生进入每个班级和课节。"
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
            hasPlan
              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
          }`}
        >
          {hasPlan
            ? t({ en: "Active plan", zh: "已設定", zhHans: "已设定" })
            : t({ en: "No plan set", zh: "未設定", zhHans: "未设定" })}
        </span>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2">
            <span className={labelClassName}>{t({ en: "Extended time", zh: "延長時間", zhHans: "延长时间" })}</span>
            <select
              value={accommodations.extendedTime}
              onChange={(event) => update("extendedTime", event.target.value as AccommodationExtendedTime)}
              className={controlClassName}
            >
              {accommodationExtendedTimeValues.map((value) => (
                <option key={value} value={value}>{t(accommodationExtendedTimeLabels[value])}</option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2">
            <span className={labelClassName}>{t({ en: "Answer choices (multiple choice)", zh: "選項數量（選擇題）", zhHans: "选项数量（选择题）" })}</span>
            <select
              value={String(accommodations.maxAnswerChoices)}
              onChange={(event) => update("maxAnswerChoices", Number(event.target.value))}
              className={controlClassName}
            >
              {accommodationAnswerChoiceOptions.map((value) => (
                <option key={value} value={value}>{answerChoiceLabel(value, t)}</option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2">
            <span className={labelClassName}>{t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}</span>
            <select
              value={accommodations.calculatorPolicy}
              onChange={(event) => update("calculatorPolicy", event.target.value as AccommodationCalculatorPolicy)}
              className={controlClassName}
            >
              {accommodationCalculatorPolicyValues.map((value) => (
                <option key={value} value={value}>{t(accommodationCalculatorPolicyLabels[value])}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 items-center gap-3 self-end rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.06]">
            <input
              type="checkbox"
              checked={accommodations.readAloud}
              onChange={(event) => update("readAloud", event.target.checked)}
              className="focus-ring size-5 rounded border-slate-300 text-violet-600"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {t({ en: "Read-aloud (text-to-speech)", zh: "朗讀支援（文字轉語音）", zhHans: "朗读支持（文字转语音）" })}
            </span>
          </label>
        </div>

        <label className="grid gap-2">
          <span className={labelClassName}>{t({ en: "Notes", zh: "備註", zhHans: "备注" })}</span>
          <textarea
            value={accommodations.notes}
            onChange={(event) => update("notes", event.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t({ en: "e.g. 504 plan reference or context for other teachers", zh: "例如：504 計劃編號或給其他老師的背景說明", zhHans: "例如：504 计划编号或给其他老师的背景说明" })}
            className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400" aria-live="polite">
            {message ? (
              <span className={isError ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}>{message}</span>
            ) : updatedLabel ? (
              t({
                en: `Last updated ${updatedLabel}${updatedByName ? ` by ${updatedByName}` : ""}`,
                zh: `最後更新：${updatedLabel}${updatedByName ? `（${updatedByName}）` : ""}`,
                zhHans: `最后更新：${updatedLabel}${updatedByName ? `（${updatedByName}）` : ""}`
              })
            ) : (
              t({ en: "Not yet set for this student.", zh: "尚未為此學生設定。", zhHans: "尚未为此学生设定。" })
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetToStandard}
              disabled={isSaving}
              className="focus-ring min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition enabled:hover:-translate-y-0.5 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
            >
              {t({ en: "Reset to standard", zh: "重設為標準", zhHans: "重设为标准" })}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="focus-ring min-h-11 rounded-full bg-violet-600 px-5 text-sm font-black text-white shadow-[0_6px_0_#6d28d9] transition enabled:hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isSaving ? t({ en: "Saving…", zh: "儲存中…", zhHans: "保存中…" }) : t({ en: "Save accommodations", zh: "儲存調適安排", zhHans: "保存调适安排" })}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
