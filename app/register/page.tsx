"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { CurriculumTrackSelector } from "@/components/ui/CurriculumTrackSelector";
import { GradeSelector } from "@/components/ui/GradeSelector";
import { curriculumProfileForPublisher, curriculumTrackForProfile, publisherLabels } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import type { CurriculumProfile, CurriculumRegion, LocalizedText } from "@/types";

const registerCopy = {
  eyebrow: { en: "Account access", zh: "帳戶開通", zhHans: "账户开通" },
  title: { en: "Create a student or parent account", zh: "建立學生或家長帳戶", zhHans: "建立学生或家长帐户" },
  subtitle: {
    en: "Individual learners can create a student account here.",
    zh: "個人學習者可在此建立學生帳戶。",
    zhHans: "个人学习者可在此建立学生账户。"
  },
  gradePrompt: {
    en: "School students and teachers should log in with the account issued by an administrator.",
    zh: "學校學生和教師請使用管理員開通的帳戶登入。",
    zhHans: "学校学生和教师请使用管理员开通的账户登录。"
  },
  familyPrompt: {
    en: "Families can create a parent account first, then connect children with an invite code.",
    zh: "家庭可先建立家長帳戶，再用邀請碼綁定孩子。",
    zhHans: "家庭可先建立家长账户，再用邀请码绑定孩子。"
  },
  stepCurriculum: { en: "1. Curriculum", zh: "1. 課程", zhHans: "1. 课程" },
  stepCurriculumHelp: {
    en: "Select the curriculum region and textbook version. This choice is saved to the student account.",
    zh: "選擇課程地區與教材版本；系統會保存到學生帳戶。",
    zhHans: "选择课程地区与教材版本；系统会保存到学生帐户。"
  },
  stepGrade: { en: "2. Grade", zh: "2. 年級", zhHans: "2. 年级" },
  stepGradeHelp: {
    en: "Grade labels update to match the selected curriculum path before the account is created.",
    zh: "建立帳戶前，年級標籤會根據已選課程路徑自動調整。",
    zhHans: "建立帐户前，年级标签会根据已选课程路径自动调整。"
  },
  stepDetails: { en: "3. Account details", zh: "3. 帳戶資料", zhHans: "3. 帐户资料" },
  stepDetailsHelp: {
    en: "These details create the private account used for learning, family access, and tutor history.",
    zh: "這些資料會建立私人帳戶，用於學習、家庭連結和導師紀錄。",
    zhHans: "这些资料会建立私人账户，用于学习、家庭连接和导师记录。"
  },
  accountType: { en: "1. Account type", zh: "1. 帳戶類型", zhHans: "1. 账户类型" },
  accountTypeHelp: {
    en: "Teacher and administrator accounts are not created through public registration.",
    zh: "教師和管理員帳戶不經公開註冊建立。",
    zhHans: "教师和管理员账户不经公开注册建立。"
  },
  parentAccount: { en: "Parent", zh: "家長", zhHans: "家长" },
  studentAccount: { en: "Individual student", zh: "個人學生", zhHans: "个人学生" },
  studentName: { en: "Student name", zh: "學生姓名" },
  parentName: { en: "Parent name", zh: "家長姓名", zhHans: "家长姓名" },
  username: { en: "Username or student ID", zh: "用戶名稱或學生編號", zhHans: "用户名或学生编号" },
  email: { en: "Email", zh: "電郵", zhHans: "邮箱" },
  password: { en: "Password", zh: "密碼" },
  confirmPassword: { en: "Confirm password", zh: "確認密碼" },
  gradeChoice: { en: "Selected grade", zh: "已選年級", zhHans: "已选年级" },
  submit: { en: "Create account", zh: "建立帳戶" },
  submitting: { en: "Creating...", zh: "正在建立..." },
  passwordMismatch: { en: "Passwords must match before registration can continue.", zh: "兩次輸入的密碼必須相同，才可繼續註冊。" },
  success: {
    en: "Account created. Opening the student dashboard...",
    zh: "帳戶已建立，正在開啟學生儀表板..."
  },
  parentSuccess: {
    en: "Parent account created. Opening child connection...",
    zh: "家長帳戶已建立，正在開啟孩子綁定...",
    zhHans: "家长账户已建立，正在打开孩子绑定..."
  },
  duplicate: {
    en: "An account with this email or username already exists.",
    zh: "已有帳戶使用這個電郵或用戶名稱。",
    zhHans: "已有账户使用这个邮箱或用户名。"
  },
  invalid: {
    en: "Check the name, email, username, grade, and password length before trying again.",
    zh: "請檢查姓名、電郵、用戶名稱、年級和密碼長度後再試。",
    zhHans: "请检查姓名、邮箱、用户名、年级和密码长度后再试。"
  },
  error: {
    en: "Could not create the account yet. Try again in a moment.",
    zh: "暫時未能建立帳戶，請稍後再試。"
  },
  sessionSetup: {
    en: "Login sessions are not configured yet. Set AUTH_SESSION_SECRET or NEXTAUTH_SECRET before creating accounts.",
    zh: "登入工作階段尚未設定。請先設定 AUTH_SESSION_SECRET 或 NEXTAUTH_SECRET，才可建立帳戶。"
  },
  alreadyRegistered: { en: "Already have an account?", zh: "已有帳戶？" },
  login: { en: "Log in", zh: "登入" },
  profilePreview: { en: "Live profile preview", zh: "帳戶即時預覽", zhHans: "帐户即时预览" },
  profilePreviewHelp: {
    en: "Review the account path before creating it.",
    zh: "建立帳戶前，先核對帳戶路徑。",
    zhHans: "建立账户前，先核对账户路径。"
  },
  selectedCurriculum: { en: "Saved curriculum", zh: "保存課程", zhHans: "保存课程" },
  contentStatus: { en: "Content status", zh: "內容狀態", zhHans: "内容状态" },
  privacyNote: {
    en: "Progress, mistakes, and tutor history stay tied to this private learner profile.",
    zh: "進度、錯題和導師紀錄會連繫到這個私人學生帳戶。",
    zhHans: "进度、错题和导师记录会关联到这个私人学生帐户。"
  },
  parentPrivacyNote: {
    en: "After registration, use a teacher-provided parent invite code to connect a child.",
    zh: "註冊後，請使用教師提供的家長邀請碼綁定孩子。",
    zhHans: "注册后，请使用教师提供的家长邀请码绑定孩子。"
  }
} as const;

const registerRegionChipLabelOverrides: Partial<Record<CurriculumRegion, LocalizedText>> = {
  MAINLAND: { en: "CHINA", zh: "中國", zhHans: "中国" },
  HK: { en: "HKSAR", zh: "香港特區", zhHans: "香港特区" }
};

const registerRegionLabelOverrides: Partial<Record<CurriculumRegion, LocalizedText>> = {
  MAINLAND: { en: "China Curriculum", zh: "中國課程", zhHans: "中国课程" },
  HK: { en: "HKSAR Curriculum", zh: "香港特區課程", zhHans: "香港特区课程" }
};

type RegistrationRole = "parent" | "student";

function contentStatusFor(profile: CurriculumProfile) {
  if (profile.publisher === "MAINLAND_PEP") {
    return {
      tone: "emerald",
      body: {
        en: "China PEP primary, junior-secondary, and high school learning paths are available.",
        zh: "中國人教版小學、初中及高中學習路徑已開放。",
        zhHans: "中国人教版小学、初中及高中学习路径已开放。"
      }
    } as const;
  }

  if (profile.publisher === "MAINLAND_HJB") {
    return {
      tone: "emerald",
      body: {
        en: "Shanghai Education Press primary P1-P6, junior S1-S3, and high-school S4-S6 lessons are available; junior practice remains gated for review.",
        zh: "滬教版小學 P1-P6、初中 S1-S3 及高中 S4-S6 課程已開放；初中練習題待審核後開放。",
        zhHans: "沪教版小学 P1-P6、初中 S1-S3 及高中 S4-S6 课程已开放；初中练习题待审核后开放。"
      }
    } as const;
  }

  if (profile.publisher === "MAINLAND_BNU") {
    return {
      tone: "emerald",
      body: {
        en: "BNUP P1-S6 AI-generated practice and learning content are live.",
        zh: "北師大版 P1-S6 AI 生成練習與學習內容已上線。",
        zhHans: "北师大版 P1-S6 AI 生成练习与学习内容已上线。"
      }
    } as const;
  }

  if (profile.region === "MAINLAND") {
    return {
      tone: "emerald",
      body: {
        en: "This China textbook edition is saved to the account while student-facing content remains gated.",
        zh: "此中國教材版本會保存到帳戶；學生內容仍待審核發布。",
        zhHans: "此中国教材版本会保存到账户；学生内容仍待审核发布。"
      }
    } as const;
  }

  if (profile.region === "US") {
    return {
      tone: "cyan",
      body: {
        en: "The selected U.S. standards pathway will be saved to the student account.",
        zh: "已選的美國標準路徑會保存到學生帳戶。",
        zhHans: "已选的美国标准路径会保存到学生帐户。"
      }
    } as const;
  }

  return {
    tone: "emerald",
    body: {
      en: "HKSAR P1-S6 learning paths are available for the selected DSE course.",
      zh: "已選 DSE 課程可使用香港特區小一至中六學習路徑。",
      zhHans: "已选 DSE 课程可使用香港特区小一至中六学习路径。"
    }
  } as const;
}

export default function RegisterPage() {
  const { language, register, selectedGrade, t } = useSettings();
  const [accountType, setAccountType] = useState<RegistrationRole>("student");
  const [studentName, setStudentName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [curriculumProfile, setCurriculumProfile] = useState<CurriculumProfile>(() => curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"));
  const [registrationGrade, setRegistrationGrade] = useState(selectedGrade);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const curriculumTrack = curriculumTrackForProfile(curriculumProfile);
  const isParentRegistration = accountType === "parent";
  const contentStatus = contentStatusFor(curriculumProfile);
  const contentStatusClassName = contentStatus.tone === "cyan"
      ? "border-cyan-300/45 bg-cyan-400/10 text-cyan-800 dark:border-cyan-300/20 dark:text-cyan-100"
      : "border-emerald-300/45 bg-emerald-400/10 text-emerald-800 dark:border-emerald-300/20 dark:text-emerald-100";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      if (password !== confirmPassword) {
        setMessage(t(registerCopy.passwordMismatch));
        return;
      }

      const result = await register({
        role: accountType,
        name: studentName,
        username: isParentRegistration ? email : username,
        email,
        password,
        grade: isParentRegistration ? undefined : registrationGrade,
        curriculumProfile: isParentRegistration ? undefined : curriculumProfile
      });

      if (result.ok) {
        setMessage(t(isParentRegistration ? registerCopy.parentSuccess : registerCopy.success));
        window.location.assign(isParentRegistration ? "/parent/connect" : "/dashboard");
        return;
      }

      setMessage(
        result.reason === "duplicate"
          ? t(registerCopy.duplicate)
          : result.reason === "invalid"
            ? t(registerCopy.invalid)
            : result.reason === "setup"
              ? t(registerCopy.sessionSetup)
              : t(registerCopy.error)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(registerCopy.eyebrow)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(registerCopy.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            <span className="block">{t(registerCopy.subtitle)}</span>
            <span className="block">{t(registerCopy.gradePrompt)}</span>
            <span className="block">{t(registerCopy.familyPrompt)}</span>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <section className="rounded-3xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05] sm:p-5" aria-labelledby="register-account-type-title">
              <p id="register-account-type-title" className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t(registerCopy.accountType)}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t(registerCopy.accountTypeHelp)}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t(registerCopy.accountType)}>
                {([
                  { role: "student" as const, label: registerCopy.studentAccount },
                  { role: "parent" as const, label: registerCopy.parentAccount }
                ]).map((item) => {
                  const active = accountType === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setAccountType(item.role)}
                      className={`focus-ring rounded-full px-4 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950" : "border border-slate-200/80 bg-white/75 text-slate-700 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"}`}
                    >
                      {t(item.label)}
                    </button>
                  );
                })}
              </div>
            </section>

            {!isParentRegistration ? (
            <section className="rounded-3xl border border-cyan-200/70 bg-cyan-50/55 p-4 dark:border-cyan-300/15 dark:bg-cyan-950/20 sm:p-5" aria-labelledby="register-curriculum-title">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p id="register-curriculum-title" className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                    {t(registerCopy.stepCurriculum)}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {t(registerCopy.stepCurriculumHelp)}
                  </p>
                </div>
              </div>
              <CurriculumTrackSelector
                value={curriculumProfile}
                onChange={setCurriculumProfile}
                text={t}
                regionChipLabelOverrides={registerRegionChipLabelOverrides}
                regionLabelOverrides={registerRegionLabelOverrides}
                embedMainlandCoursePicker={false}
                courseSelectionMode="buttons"
                embedButtonCoursePicker={false}
              />
            </section>
            ) : null}

            {!isParentRegistration ? (
            <section className="rounded-3xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05] sm:p-5" aria-labelledby="register-grade-title">
              <p id="register-grade-title" className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t(registerCopy.stepGrade)}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t(registerCopy.stepGradeHelp)}
              </p>
              <div className="mt-4">
                <GradeSelector compact curriculumTrack={curriculumTrack} value={registrationGrade} onChange={setRegistrationGrade} respectCurrentStudentProfile={false} />
              </div>
            </section>
            ) : null}

            <section className="rounded-3xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05] sm:p-5" aria-labelledby="register-details-title">
              <p id="register-details-title" className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t(registerCopy.stepDetails)}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t(registerCopy.stepDetailsHelp)}
              </p>

              <div className="mt-5 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(isParentRegistration ? registerCopy.parentName : registerCopy.studentName)}</span>
                  <input
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    autoComplete="name"
                    required
                    className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  />
                </label>

                <div className={`grid gap-5 ${isParentRegistration ? "" : "sm:grid-cols-2"}`}>
                  {!isParentRegistration ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(registerCopy.username)}</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      required
                      className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>
                  ) : null}

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(registerCopy.email)}</span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                      className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(registerCopy.password)}</span>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={5}
                      className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(registerCopy.confirmPassword)}</span>
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={5}
                      className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    />
                  </label>
                </div>
              </div>
            </section>

            {message ? (
              <p role="status" className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:border-cyan-300/20 dark:text-cyan-100">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-black text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t(registerCopy.submitting) : t(registerCopy.submit)}
            </button>

            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t(registerCopy.alreadyRegistered)}{" "}
              <Link href="/login" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(registerCopy.login)}
              </Link>
            </p>
          </form>
        </section>

        <aside className="glass-panel p-6 lg:sticky lg:top-24">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(registerCopy.profilePreview)}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {t(registerCopy.profilePreviewHelp)}
          </p>

          <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t(isParentRegistration ? registerCopy.parentAccount : dictionary.common.selectedLearner)}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {studentName.trim() || t(isParentRegistration ? registerCopy.parentAccount : dictionary.common.selectedLearner)}
            </p>
          </div>

          {!isParentRegistration ? (
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t(registerCopy.selectedCurriculum)}
              </p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                {t(registerRegionLabelOverrides[curriculumProfile.region] ?? { en: "U.S. Curriculum", zh: "美國課程", zhHans: "美国课程" })}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                {t(publisherLabels[curriculumProfile.publisher])}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t(registerCopy.gradeChoice)}
              </p>
              <p className="mt-2 text-lg font-black text-cyan-700 dark:text-cyan-200">
                {formatGradeLabelForCurriculum(registrationGrade, language, curriculumTrack, true)}
              </p>
            </div>
          </div>
          ) : (
          <div className="mt-4 rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-4 text-sm font-semibold leading-6 text-cyan-800 dark:border-cyan-300/20 dark:text-cyan-100">
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              {t({ en: "Next step", zh: "下一步", zhHans: "下一步" })}
            </p>
            <p className="mt-2">
              {t(registerCopy.parentPrivacyNote)}
            </p>
          </div>
          )}

          {!isParentRegistration ? (
          <div className={`mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ${contentStatusClassName}`}>
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              {t(registerCopy.contentStatus)}
            </p>
            <p className="mt-2">
              {t(contentStatus.body)}
            </p>
          </div>
          ) : null}

          <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(isParentRegistration ? registerCopy.parentPrivacyNote : registerCopy.privacyNote)}</p>
        </aside>
      </div>
    </div>
  );
}
