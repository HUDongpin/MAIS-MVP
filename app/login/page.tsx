"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  demoStudentAccount,
  dictionary,
  useSettings
} from "@/components/providers/AppProviders";
import { CurriculumTrackSelector } from "@/components/ui/CurriculumTrackSelector";
import { GradeSelector } from "@/components/ui/GradeSelector";
import { curriculumProfileForPublisher, curriculumTrackForProfile, publisherLabels } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum, formatLearnerName } from "@/lib/i18n";
import type { CurriculumProfile, CurriculumRegion, GradeId, LocalizedText, TextbookPublisher } from "@/types";

const authLinkCopy = {
  forgotPassword: { en: "Forgot password?", zh: "忘記密碼？" },
  registerPrompt: { en: "New to MAIS?", zh: "第一次使用妙思數？" },
  registerAction: { en: "Create a family or student account", zh: "建立家庭或學生帳戶", zhHans: "建立家庭或学生帐户" },
  sessionSetup: {
    en: "Login sessions are not configured yet. Set AUTH_SESSION_SECRET or NEXTAUTH_SECRET before using the student workspace.",
    zh: "登入工作階段尚未設定。請先設定 AUTH_SESSION_SECRET 或 NEXTAUTH_SECRET，才可使用學生學習空間。"
  },
  loginError: {
    en: "Could not log in yet. Try again in a moment.",
    zh: "暫時未能登入，請稍後再試。"
  },
  protectedRouteNotice: {
    en: "Log in to open your saved student workspace.",
    zh: "登入後即可開啟已儲存的學生學習空間。"
  },
  progressNotice: {
    en: "Log in to view your saved progress and learning analytics.",
    zh: "登入後即可查看已儲存的學習進度和學習分析。"
  },
  dashboardNotice: {
    en: "Log in to open the student dashboard.",
    zh: "登入後即可開啟學生儀表板。"
  },
  mistakesNotice: {
    en: "Log in to review your saved mistakes.",
    zh: "登入後即可重溫已儲存錯題。"
  },
  formalAccountHelp: {
    en: "Use the account issued by your school, family registration, or administrator.",
    zh: "請使用學校、家庭註冊或管理員開通的正式帳戶。",
    zhHans: "请使用学校、家庭注册或管理员开通的正式帐户。"
  }
} as const;

const curriculumCopy = {
  title: {
    en: "1. Curriculum",
    zh: "1. 課程",
    zhHans: "1. 课程"
  },
  gradeTitle: {
    en: "2. Grade",
    zh: "2. 年級",
    zhHans: "2. 年级"
  },
  prompt: {
    en: "This account needs a curriculum and textbook before we open the workspace.",
    zh: "此帳戶需要先選擇課程地區與教材，才可進入學習空間。",
    zhHans: "此帐户需要先选择课程地区与教材，才可进入学习空间。"
  },
  helper: {
    en: "Choose the curriculum that matches the student's textbooks. This is saved to the account.",
    zh: "請選擇與學生教材一致的課程地區與出版社；系統會保存到帳戶。",
    zhHans: "请选择与学生教材一致的课程地区与出版社；系统会保存到帐户。"
  },
  temporaryNoticeTitle: {
    en: "Curriculum update coming soon",
    zh: "本地課程即將更新",
    zhHans: "本地课程即将更新"
  },
  temporaryNoticeBody: {
    en: "Local curriculum content will be updated within one week. Please stay tuned. For now, MAIS will open the default curriculum.",
    zh: "本地課程將於一週內更新，敬請期待。目前 MAIS 會先使用默認課程。",
    zhHans: "本地课程将在一周内更新，敬请期待。目前 MAIS 会先使用默认课程。"
  },
  temporaryNoticeSelection: {
    en: "Selected course",
    zh: "已選課程",
    zhHans: "已选课程"
  },
  temporaryNoticeAction: {
    en: "Got it",
    zh: "知道了",
    zhHans: "知道了"
  }
} as const;

const loginRegionChipLabelOverrides = {
  MAINLAND: { en: "CHINA", zh: "中國", zhHans: "中国" },
  HK: { en: "HKSAR", zh: "香港特區", zhHans: "香港特区" }
} satisfies Partial<Record<CurriculumRegion, LocalizedText>>;

const loginPublisherDetailOverrides = {
  MAINLAND_HJB: {
    en: "HJB mathematic pathway",
    zh: "滬教版數學課程路徑",
    zhHans: "沪教版数学课程路径"
  }
} satisfies Partial<Record<TextbookPublisher, LocalizedText>>;

const defaultLoginGrade: GradeId = "S4";

function defaultLoginCurriculumProfile() {
  return curriculumProfileForPublisher("MAINLAND_PEP");
}

function workspaceForRole(role?: "student" | "teacher" | "parent" | "admin") {
  if (role === "teacher" || role === "admin") return "/teacher";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

function safeWorkspaceTarget(value: string | null, role?: "student" | "teacher" | "parent" | "admin") {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return workspaceForRole(role);
}

const missionCopy = {
  label: {
    en: "Mission",
    zh: "使命",
    zhHans: "使命"
  },
  lines: {
    en: ["Accelerate", "the world's transition", "to personalized", "learning and teaching."],
    zh: ["加速世界", "邁向個人化", "學習與教學。"],
    "zh-Hans": ["加速世界", "迈向个性化", "学习与教学。"]
  }
} as const;

const futureExpansionCopy = {
  eyebrow: {
    en: "Future 3-year market plan",
    zh: "未來 3 年市場計劃",
    zhHans: "未来 3 年市场计划"
  },
  title: {
    en: "Future markets MAIS plans to support",
    zh: "MAIS 未來 3 年內計劃支持的市場",
    zhHans: "MAIS 未来 3 年内计划支持的市场"
  },
  body: {
    en: "MAIS is preparing a wider international learning network for families, schools, and education partners.",
    zh: "MAIS 正在準備更廣泛的國際學習網絡，服務家庭、學校與教育合作夥伴。",
    zhHans: "MAIS 正在准备更广泛的国际学习网络，服务家庭、学校与教育合作伙伴。"
  },
  timelineValue: {
    en: "3",
    zh: "3",
    zhHans: "3"
  },
  timelineLabel: {
    en: "years",
    zh: "年",
    zhHans: "年"
  },
  marketsLabel: {
    en: "Planned markets",
    zh: "計劃市場",
    zhHans: "计划市场"
  },
  modelTitle: {
    en: "Hybrid public-good and SaaS model",
    zh: "公益與 SaaS 混合模式",
    zhHans: "公益与 SaaS 混合模式"
  },
  modelBody: {
    en: "In some regions, MAIS will operate as an NGO. In other regions, MAIS will operate through a SaaS model. MAIS provides free sponsorship for families in need. This is exactly our founding purpose as education researchers and developers: education is not only a social responsibility, but also an expression of love❤️.",
    zh: "在部分地區，MAIS 會以 NGO 的形式運營；在其他地區，MAIS 會以 SaaS 形式運營。MAIS 為有需要的家庭提供免費資助。這正是我們作為教育研究者和開發者的初衷：教育不僅是一種社會責任，更是愛的體現❤️。",
    zhHans: "在部分地区，MAIS 会以 NGO 的形式运营；在其他地区，MAIS 会以 SaaS 形式运营。MAIS 为有需要的家庭提供免费资助。这正是我们作为教育研究者和开发者的初衷：教育不仅是一种社会责任，更是爱的体现❤️。"
  },
  invitationTitle: {
    en: "Referrals, angel investment, and donations",
    zh: "推薦使用、天使投資與慈善捐贈",
    zhHans: "推荐使用、天使投资与慈善捐赠"
  },
  invitationBody: {
    en: "Please recommend MAIS to people who need it. Conversations about angel investment and philanthropic donations are also welcome.",
    zh: "歡迎推薦給有需要的人使用；也歡迎聯絡洽談天使投資和慈善捐贈。",
    zhHans: "欢迎推荐给有需要的人使用；也欢迎联系洽谈天使投资和慈善捐赠。"
  },
  markets: [
    { key: "uk", flag: "🇬🇧", label: { en: "United Kingdom", zh: "英國", zhHans: "英国" } },
    { key: "france", flag: "🇫🇷", label: { en: "France", zh: "法國", zhHans: "法国" } },
    { key: "germany", flag: "🇩🇪", label: { en: "Germany", zh: "德國", zhHans: "德国" } },
    { key: "saudi-arabia", flag: "🇸🇦", label: { en: "Saudi Arabia", zh: "沙特", zhHans: "沙特" } },
    { key: "uae", flag: "🇦🇪", label: { en: "UAE", zh: "阿聯酋", zhHans: "阿联酋" } },
    { key: "qatar", flag: "🇶🇦", label: { en: "Qatar", zh: "卡塔爾", zhHans: "卡塔尔" } },
    { key: "vietnam", flag: "🇻🇳", label: { en: "Vietnam", zh: "越南", zhHans: "越南" } },
    { key: "korea", flag: "🇰🇷", label: { en: "Korea", zh: "韓國", zhHans: "韩国" } },
    { key: "japan", flag: "🇯🇵", label: { en: "Japan", zh: "日本", zhHans: "日本" } },
    { key: "macau", flag: "🇲🇴", label: { en: "Macau region", zh: "澳門地區", zhHans: "澳门地区" } },
    { key: "malaysia", flag: "🇲🇾", label: { en: "Malaysia", zh: "馬來西亞", zhHans: "马来西亚" } },
    { key: "mexico", flag: "🇲🇽", label: { en: "Mexico", zh: "墨西哥", zhHans: "墨西哥" } }
  ]
} as const;

export default function LoginPage() {
  const { currentUser, language, login, logout, selectedGrade, setSelectedGrade, settingsReady, t } = useSettings();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCurriculumProfile, setSelectedCurriculumProfile] = useState<CurriculumProfile>(defaultLoginCurriculumProfile);
  const [curriculumSelectorProfile, setCurriculumSelectorProfile] = useState<CurriculumProfile>(defaultLoginCurriculumProfile);
  const [curriculumNoticeProfile, setCurriculumNoticeProfile] = useState<CurriculumProfile | null>(null);
  const [pendingCurriculumUser, setPendingCurriculumUser] = useState<{ name: string; username: string; grade: GradeId } | null>(null);
  const [loginSelectedGrade, setLoginSelectedGrade] = useState<GradeId>(selectedGrade);
  const [error, setError] = useState("");
  const [nextTarget, setNextTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectNotice =
    nextTarget.startsWith("/progress")
      ? t(authLinkCopy.progressNotice)
      : nextTarget.startsWith("/dashboard")
        ? t(authLinkCopy.dashboardNotice)
        : nextTarget.startsWith("/mistake-book")
          ? t(authLinkCopy.mistakesNotice)
          : nextTarget
            ? t(authLinkCopy.protectedRouteNotice)
            : "";
  const currentWorkspaceHref = workspaceForRole(currentUser?.role);
  const missionLines = missionCopy.lines[language];
  const registeredStudentProfile = currentUser?.role === "student" ? currentUser : null;
  const displayedCurriculumProfile = registeredStudentProfile?.curriculumProfile ?? curriculumSelectorProfile;
  const displayedCurriculumTrack = curriculumTrackForProfile(displayedCurriculumProfile);
  const displayedLoginGrade = registeredStudentProfile?.grade ?? loginSelectedGrade;

  useEffect(() => {
    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "";
    setNextTarget(nextPath);

    if (!settingsReady) return;
    if (currentUser && nextPath) {
      const targetPath = safeWorkspaceTarget(nextPath, currentUser.role);
      const redirectPath = currentUser.passwordMustChange ? `/change-password?next=${encodeURIComponent(targetPath)}` : targetPath;
      const redirectKey = `mais-login-redirect:${currentUser.id}:${redirectPath}`;
      const lastAttempt = Number(window.sessionStorage.getItem(redirectKey) ?? "0");
      if (Date.now() - lastAttempt > 2500) {
        window.sessionStorage.setItem(redirectKey, String(Date.now()));
        window.location.replace(redirectPath);
      }
      return;
    }

    if (!currentUser) {
      setSelectedGrade(defaultLoginGrade);
      setLoginSelectedGrade(defaultLoginGrade);
    }
  }, [currentUser, settingsReady, setSelectedGrade]);

  const submitLogin = async ({
    loginIdentifier,
    loginPassword,
    grade,
    curriculumProfile
  }: {
    loginIdentifier: string;
    loginPassword: string;
    grade: GradeId;
    curriculumProfile: CurriculumProfile;
  }) => {
    setError("");
    setIsSubmitting(true);

    try {
      const loginUsername = loginIdentifier.trim() === formatLearnerName(demoStudentAccount.username, language) ? demoStudentAccount.username : loginIdentifier;
      const result = await login(loginUsername, loginPassword, grade, curriculumProfile);
      if (result.ok) {
        setPendingCurriculumUser(null);
        const nextPath = new URLSearchParams(window.location.search).get("next");
        const targetPath = safeWorkspaceTarget(nextPath, result.role);
        window.location.assign(result.passwordMustChange ? `/change-password?next=${encodeURIComponent(targetPath)}` : targetPath);
        return;
      }

      if (result.requiresCurriculumTrack && result.pendingUser) {
        setPendingCurriculumUser(result.pendingUser);
        setLoginSelectedGrade(result.pendingUser.grade);
        setSelectedGrade(result.pendingUser.grade);
        setError("");
        return;
      }

      setError(
        result.reason === "setup"
          ? t(authLinkCopy.sessionSetup)
          : result.reason === "error"
            ? t(authLinkCopy.loginError)
            : t(dictionary.login.invalid)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitLogin({
      loginIdentifier: identifier,
      loginPassword: password,
      grade: loginSelectedGrade,
      curriculumProfile: selectedCurriculumProfile
    });
  };

  const handleLogout = async () => {
    await logout();
    setPassword("");
    setIdentifier("");
    setSelectedCurriculumProfile(defaultLoginCurriculumProfile());
    setCurriculumSelectorProfile(defaultLoginCurriculumProfile());
    setLoginSelectedGrade(defaultLoginGrade);
    setSelectedGrade(defaultLoginGrade);
    setPendingCurriculumUser(null);
  };

  const handleCurriculumSelection = (profile: CurriculumProfile) => {
    if (registeredStudentProfile) return;
    setCurriculumNoticeProfile(null);
    setSelectedCurriculumProfile(profile);
    setCurriculumSelectorProfile(profile);
  };

  const renderFutureExpansionPanel = (className = "") => (
    <section
      className={[
        "overflow-hidden rounded-3xl border border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/75 to-indigo-50/80 p-5 shadow-sm shadow-cyan-900/5 dark:border-cyan-300/15 dark:from-slate-950/70 dark:via-cyan-950/30 dark:to-indigo-950/35 sm:p-6",
        className
      ].filter(Boolean).join(" ")}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
            {t(futureExpansionCopy.eyebrow)}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {t(futureExpansionCopy.title)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {t(futureExpansionCopy.body)}
          </p>
        </div>
        <div className="grid w-24 shrink-0 place-items-center rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-center shadow-sm shadow-cyan-900/5 dark:border-white/10 dark:bg-white/[0.07]">
          <span className="text-4xl font-black leading-none text-cyan-700 dark:text-cyan-200">
            {t(futureExpansionCopy.timelineValue)}
          </span>
          <span className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
            {t(futureExpansionCopy.timelineLabel)}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {t(futureExpansionCopy.marketsLabel)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {futureExpansionCopy.markets.map((market) => (
            <span
              key={market.key}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-200/80 bg-white/75 px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm shadow-cyan-900/5 dark:border-cyan-300/15 dark:bg-white/[0.07] dark:text-slate-100"
            >
              {"flag" in market ? (
                <span aria-hidden="true" className="text-base leading-none">
                  {market.flag}
                </span>
              ) : null}
              {t(market.label)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">01</p>
          <h3 className="mt-2 text-base font-black text-slate-950 dark:text-white">
            {t(futureExpansionCopy.modelTitle)}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {t(futureExpansionCopy.modelBody)}
          </p>
        </article>
        <article className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">02</p>
          <h3 className="mt-2 text-base font-black text-slate-950 dark:text-white">
            {t(futureExpansionCopy.invitationTitle)}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {t(futureExpansionCopy.invitationBody)}
          </p>
        </article>
      </div>
    </section>
  );

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(dictionary.common.siteName)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(dictionary.login.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t(dictionary.login.subtitle)}
          </p>

          {redirectNotice ? (
            <p className="mt-5 rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-700 dark:text-cyan-100">
              {redirectNotice}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(dictionary.login.username)}</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t(dictionary.login.password)}
                </label>
                <Link href="/forgot-password" className="focus-ring rounded-full px-2 py-1 text-xs font-black text-cyan-700 transition hover:bg-cyan-400/10 dark:text-cyan-200">
                  {t(authLinkCopy.forgotPassword)}
                </Link>
              </div>
              <input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            <p className="text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              {t(authLinkCopy.formalAccountHelp)}
            </p>

            {pendingCurriculumUser ? (
              <div className="grid gap-3 rounded-2xl border border-amber-300/55 bg-amber-400/10 p-4">
                <div>
                  <p className="text-sm font-black text-amber-800 dark:text-amber-100">{t(curriculumCopy.prompt)}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-100/80">{t(curriculumCopy.helper)}</p>
                </div>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-black text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t(dictionary.login.signingIn) : pendingCurriculumUser ? t({ en: "Save curriculum and log in", zh: "保存課程並登入", zhHans: "保存课程并登录" }) : t(dictionary.login.submit)}
            </button>

            <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-cyan-300/20 dark:text-slate-200">
              <span>{t(authLinkCopy.registerPrompt)} </span>
              <Link href="/register" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(authLinkCopy.registerAction)}
              </Link>
            </div>
          </form>

          {renderFutureExpansionPanel("mt-7 hidden lg:block")}
        </section>

        <aside className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(curriculumCopy.title)}
          </p>
          <div className="mt-4">
            <CurriculumTrackSelector
              value={displayedCurriculumProfile}
              onChange={handleCurriculumSelection}
              onRegionChange={handleCurriculumSelection}
              text={t}
              regionChipLabelOverrides={loginRegionChipLabelOverrides}
              publisherDetailOverrides={loginPublisherDetailOverrides}
              showRegionTitles={false}
              courseSelectionMode="buttons"
              compact
              locked={Boolean(registeredStudentProfile)}
            />
          </div>

          <div className="mt-6 border-t border-slate-200/70 pt-6 dark:border-white/10">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
              {t(curriculumCopy.gradeTitle)}
            </p>
            <div className="mt-4">
              <GradeSelector compact locked curriculumTrack={displayedCurriculumTrack} value={displayedLoginGrade} onChange={setLoginSelectedGrade} respectCurrentStudentProfile={false} />
            </div>
          </div>

          {pendingCurriculumUser ? (
            <p className="mt-5 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-xs font-bold leading-5 text-amber-800 dark:text-amber-100">
              {t(curriculumCopy.helper)}
            </p>
          ) : null}

          <div className="relative mt-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-white dark:shadow-black/10">
            <div className="relative overflow-hidden px-6 py-7 sm:py-8">
              <div className="relative">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
                    {t(missionCopy.label)}
                  </p>
                  <p className="mt-5 text-3xl font-black leading-[1.04] tracking-normal text-slate-950 sm:text-4xl">
                    {missionLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {currentUser ? (
            <div className="mt-6 border-t border-slate-200/70 pt-6 dark:border-white/10">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t(dictionary.login.signedIn)}</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{formatLearnerName(currentUser.name, language)}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-600 dark:text-cyan-300">{formatGradeLabelForCurriculum(currentUser.grade, language, currentUser.curriculumTrack, true)}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{t(publisherLabels[currentUser.curriculumProfile.publisher])}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={currentWorkspaceHref}
                  className="focus-ring rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
                >
                  {t(dictionary.login.continue)}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="focus-ring rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  {t(dictionary.login.logout)}
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        {renderFutureExpansionPanel("lg:hidden")}
      </div>

      {curriculumNoticeProfile ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="curriculum-update-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-cyan-200/70 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {t(curriculumCopy.temporaryNoticeSelection)}
            </p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
              {t(publisherLabels[curriculumNoticeProfile.publisher])}
            </p>
            <h2 id="curriculum-update-title" className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {t(curriculumCopy.temporaryNoticeTitle)}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {t(curriculumCopy.temporaryNoticeBody)}
            </p>
            <button
              type="button"
              onClick={() => setCurriculumNoticeProfile(null)}
              className="focus-ring mt-6 inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
            >
              {t(curriculumCopy.temporaryNoticeAction)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
