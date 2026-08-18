"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  demoHongKongTeacherAccount,
  demoMainlandStudentAccount,
  demoMainlandTeacherAccount,
  demoStudentAccount,
  demoUnitedStatesStudentAccount,
  demoUnitedStatesTeacherAccount,
  dictionary,
  useSettings
} from "@/components/providers/AppProviders";
import { PasswordInputWithReveal } from "@/components/ui/PasswordInputWithReveal";
import { recordAuthFunnelEvent } from "@/lib/authFunnelClient";
import { grades, isValidGradeId } from "@/data/grades";
import { curriculumProfileForPublisher, curriculumTrackForProfile, isTextbookPublisher, publisherLabels, regionLabels } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum, formatLearnerName } from "@/lib/i18n";
import type { CurriculumProfile, CurriculumRegion, Grade, GradeId, TextbookPublisher } from "@/types";

const authLinkCopy = {
  forgotPassword: { en: "Forgot password?", zh: "忘記密碼？" },
  registerPrompt: { en: "New to MAIS?", zh: "第一次使用妙思數？" },
  registerAction: { en: "Create an account", zh: "建立帳戶", zhHans: "建立账号" },
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
    zh: "登入後即可開啟已儲存的學生學習空間。",
    zhHans: "登录后即可打开已保存的学生学习空间。"
  },
  progressNotice: {
    en: "Log in to view your saved progress and learning analytics.",
    zh: "登入後即可查看已儲存的學習進度和學習分析。",
    zhHans: "登录后即可查看已保存的学习进度和学习分析。"
  },
  dashboardNotice: {
    en: "Log in to open the student dashboard.",
    zh: "登入後即可開啟學生儀表板。",
    zhHans: "登录后即可打开学生仪表板。"
  },
  mistakesNotice: {
    en: "Log in to review your saved mistakes.",
    zh: "登入後即可重溫已儲存錯題。",
    zhHans: "登录后即可重温已保存错题。"
  },
  signedIn: {
    en: "Signed in as",
    zh: "已登入",
    zhHans: "已登录"
  },
  switchAccount: {
    en: "Not you? Log out to switch account",
    zh: "不是你？登出以切換帳戶",
    zhHans: "不是你？登出以切换账号"
  },
  loggingOut: {
    en: "Logging out",
    zh: "登出中",
    zhHans: "登出中"
  },
  teacherAccountRequired: {
    en: "That page needs a teacher account. Log in with a teacher account to open the teacher console.",
    zh: "該頁面需要教師帳戶。請以教師帳戶登入，才可開啟教師工作台。",
    zhHans: "该页面需要教师账号。请以教师账号登录，才可打开教师工作台。"
  },
  googleDivider: { en: "or", zh: "或", zhHans: "或" },
  googleAction: { en: "Continue with Google", zh: "使用 Google 繼續", zhHans: "使用 Google 继续" },
  googleRoleLabel: { en: "Google account type", zh: "Google 帳戶類型", zhHans: "Google 账号类型" },
  googleRoleSummary: { en: "Signing in as", zh: "登入身份：", zhHans: "登录身份：" },
  googleRoleChange: { en: "Change", zh: "更改", zhHans: "更改" },
  googleRoleChangeAria: { en: "Change Google account type", zh: "更改 Google 帳戶類型", zhHans: "更改 Google 账号类型" },
  legalPrompt: { en: "By using MAIS you agree to our", zh: "使用 MAIS 即表示您同意我們的", zhHans: "使用 MAIS 即表示您同意我们的" },
  privacyLink: { en: "Privacy Policy", zh: "私隱政策", zhHans: "隐私政策" },
  termsLink: { en: "Terms of Service", zh: "服務條款", zhHans: "服务条款" },
  googleErrors: {
    setup: {
      en: "Google sign-in is not configured for this environment yet.",
      zh: "此環境尚未設定 Google 登入。",
      zhHans: "此环境尚未设置 Google 登录。"
    },
    teacherInviteRequired: {
      en: "Teacher Google sign-in requires a school invitation or an existing MAIS teacher account.",
      zh: "教師 Google 登入需要學校邀請或現有 MAIS 教師帳戶。",
      zhHans: "教师 Google 登录需要学校邀请或现有 MAIS 教师账号。"
    },
    parentalConsentRequired: {
      en: "A new student account needs a parent or guardian's consent. Please create the account on the registration page first.",
      zh: "建立新的學生帳戶需要家長或監護人同意，請先在註冊頁面建立帳戶。",
      zhHans: "创建新的学生账号需要家长或监护人同意，请先在注册页面创建账号。"
    },
    generic: {
      en: "Google sign-in could not be verified. Try again.",
      zh: "未能驗證 Google 登入，請再試一次。",
      zhHans: "未能验证 Google 登录，请再试一次。"
    }
  }
} as const;

type GoogleLoginRole = "student" | "parent" | "teacher";

const googleLoginRoles = [
  { key: "student", label: { en: "Student", zh: "學生", zhHans: "学生" } },
  { key: "parent", label: { en: "Parent", zh: "家長", zhHans: "家长" } },
  { key: "teacher", label: { en: "Teacher", zh: "教師", zhHans: "教师" } }
] as const satisfies readonly { key: GoogleLoginRole; label: { en: string; zh: string; zhHans: string } }[];

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

const loginSetupCopy = {
  courseLabel: { en: "Course", zh: "課程", zhHans: "课程" },
  gradeLabel: { en: "Grade", zh: "年級", zhHans: "年级" },
  courseLocked: { en: "Course locked after registration", zh: "註冊後課程固定", zhHans: "注册后课程固定" }
} as const;

const loginPublisherGroups = [
  { region: "MAINLAND", publishers: ["MAINLAND_PEP", "MAINLAND_HJB", "MAINLAND_BNU"] },
  { region: "HK", publishers: ["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"] },
  { region: "US", publishers: ["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"] }
] as const satisfies readonly { region: CurriculumRegion; publishers: readonly TextbookPublisher[] }[];

const hiddenLoginPublisherOptions = new Set<TextbookPublisher>(["US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const loginSelectOptionClassName = "bg-white text-slate-950 dark:bg-slate-950 dark:text-white";

const visibleLoginPublisherGroups = loginPublisherGroups
  .map((group) => ({
    ...group,
    publishers: group.publishers.filter((publisher) => !hiddenLoginPublisherOptions.has(publisher))
  }))
  .filter((group) => group.publishers.length > 0);

const defaultLoginGrade: GradeId = "K";
const defaultNonUnitedStatesLoginGrade: GradeId = "S4";
const floridaLoginGrades = new Set<GradeId>(["P6", "S1", "S2"]);

const exampleAccountsEnabledAtBuild =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS === "true";

const demoCtaEnabledAtBuild =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_DEMO_CTA === "true";

const exampleAccountRows = [
  {
    key: "us-ca-grade-1",
    label: { en: "California Math Grade 1", zh: "加州數學 Grade 1", zhHans: "加州数学 Grade 1" },
    curriculumProfile: curriculumProfileForPublisher("US_CA_MATH"),
    grade: "P1",
    accounts: [
      { key: "us-ca-student", roleLabel: { en: "Student", zh: "學生", zhHans: "学生" }, account: demoUnitedStatesStudentAccount },
      { key: "us-ca-teacher", roleLabel: { en: "Teacher", zh: "教師", zhHans: "教师" }, account: demoUnitedStatesTeacherAccount }
    ]
  },
  {
    key: "us-ca-k-12",
    label: { en: "California Math K-12", zh: "California Math K-12", zhHans: "California Math K-12" },
    curriculumProfile: curriculumProfileForPublisher("US_CA_MATH"),
    grade: "K",
    accounts: [
      { key: "us-ca-k12-student", roleLabel: { en: "Student", zh: "學生", zhHans: "学生" }, account: { username: "Student Jon", password: "12345" } },
      { key: "us-ca-k12-teacher", roleLabel: { en: "Teacher", zh: "教師", zhHans: "教师" }, account: { username: "Teacher Rhi", password: "12345" } }
    ]
  },
  {
    key: "mainland-pep-s4",
    label: { en: "Mainland PEP S4", zh: "中國內地人教版 S4", zhHans: "中国大陆人教版 S4" },
    curriculumProfile: curriculumProfileForPublisher("MAINLAND_PEP"),
    grade: "S4",
    accounts: [
      { key: "mainland-student", roleLabel: { en: "Student", zh: "學生", zhHans: "学生" }, account: demoMainlandStudentAccount },
      { key: "mainland-teacher", roleLabel: { en: "Teacher", zh: "教師", zhHans: "教师" }, account: demoMainlandTeacherAccount }
    ]
  },
  {
    key: "hk-up-s4",
    label: { en: "Hong Kong DSE UP S4", zh: "中國香港 DSE UP S4", zhHans: "中国香港 DSE UP S4" },
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S4",
    accounts: [
      { key: "hk-student", roleLabel: { en: "Student", zh: "學生", zhHans: "学生" }, account: demoStudentAccount },
      { key: "hk-teacher", roleLabel: { en: "Teacher", zh: "教師", zhHans: "教师" }, account: demoHongKongTeacherAccount }
    ]
  }
] as const satisfies readonly {
  key: string;
  label: { en: string; zh: string; zhHans: string };
  curriculumProfile: CurriculumProfile;
  grade: GradeId;
  accounts: readonly {
    key: string;
    roleLabel: { en: string; zh: string; zhHans: string };
    account: { username: string; password: string };
  }[];
}[];

const demoAccountHelpCopy = {
  title: { en: "Example accounts", zh: "示例帳戶", zhHans: "示例账号" },
  useAccount: { en: "Use example account", zh: "使用示例帳戶", zhHans: "使用示例账号" }
} as const;

const demoCtaCopy = {
  title: { en: "Just exploring?", zh: "想先體驗一下？", zhHans: "想先体验一下？" },
  body: {
    en: "Open a sample California Math Grade 1 classroom with one click — no account needed.",
    zh: "一鍵開啟加州數學一年級示範課室，毋須建立帳戶。",
    zhHans: "一键打开加州数学一年级示范课堂，无需创建账号。"
  },
  action: { en: "Explore a demo classroom", zh: "體驗示範課室", zhHans: "体验示范课堂" }
} as const;

function defaultLoginCurriculumProfile() {
  return curriculumProfileForPublisher("US_CA_MATH");
}

function loginGradeForCurriculumProfile(profile: CurriculumProfile, grade: GradeId): GradeId {
  if (profile.publisher === "US_FL_MATH" && !floridaLoginGrades.has(grade)) return "P6";
  if (profile.region !== "US" && grade === "K") return defaultNonUnitedStatesLoginGrade;
  return grade;
}

function loginGradeOptionsForCurriculumProfile(profile: CurriculumProfile): Grade[] {
  if (profile.publisher === "US_FL_MATH") return grades.filter((grade) => floridaLoginGrades.has(grade.id));
  if (profile.region === "US") return grades;
  return grades.filter((grade) => grade.id !== "K");
}

function workspaceForRole(role?: "student" | "teacher" | "parent" | "admin") {
  if (role === "teacher" || role === "admin") return "/teacher/dashboard";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

function nextPathStartsWith(value: string, root: string) {
  return value === root || value.startsWith(`${root}/`);
}

function safeWorkspaceTarget(value: string | null, role?: "student" | "teacher" | "parent" | "admin") {
  if (!value?.startsWith("/") || value.startsWith("//")) return workspaceForRole(role);
  if (role === "teacher" || role === "admin") return nextPathStartsWith(value, "/teacher") ? value : workspaceForRole(role);
  if (role === "parent") return nextPathStartsWith(value, "/parent") ? value : workspaceForRole(role);
  if (role === "student" && (nextPathStartsWith(value, "/teacher") || nextPathStartsWith(value, "/parent"))) {
    return workspaceForRole(role);
  }
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, language, login, logout, setSelectedGrade, settingsReady, t, theme } = useSettings();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [googleRole, setGoogleRole] = useState<GoogleLoginRole>("student");
  const [showGoogleRolePicker, setShowGoogleRolePicker] = useState(false);
  const [demoModeRequested, setDemoModeRequested] = useState(false);
  const [selectedCurriculumProfile, setSelectedCurriculumProfile] = useState<CurriculumProfile>(defaultLoginCurriculumProfile);
  const [curriculumSelectorProfile, setCurriculumSelectorProfile] = useState<CurriculumProfile>(defaultLoginCurriculumProfile);
  const [curriculumNoticeProfile, setCurriculumNoticeProfile] = useState<CurriculumProfile | null>(null);
  const [pendingCurriculumUser, setPendingCurriculumUser] = useState<{ name: string; username: string; grade: GradeId } | null>(null);
  const [loginSelectedGrade, setLoginSelectedGrade] = useState<GradeId>(defaultLoginGrade);
  const [selectedExampleAccountKey, setSelectedExampleAccountKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [nextTarget, setNextTarget] = useState("");
  const [loginReason, setLoginReason] = useState("");
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
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const hasLoginInteractionRef = useRef(false);
  const registeredStudentProfile = currentUser?.role === "student" ? currentUser : null;
  const selectedExampleAccount = exampleAccountRows
    .flatMap((row) => row.accounts.map((entry) => ({ ...entry, row })))
    .find((entry) => entry.key === selectedExampleAccountKey) ?? null;
  const displayedCurriculumProfile = registeredStudentProfile?.curriculumProfile ?? selectedExampleAccount?.row.curriculumProfile ?? curriculumSelectorProfile;
  const displayedCurriculumTrack = curriculumTrackForProfile(displayedCurriculumProfile);
  const displayedLoginGrade = selectedExampleAccount?.row.grade ?? loginSelectedGrade;
  const displayedLoginGradeOptions = loginGradeOptionsForCurriculumProfile(displayedCurriculumProfile);
  const displayedLoginGradeSelectValue = displayedLoginGradeOptions.some((grade) => grade.id === displayedLoginGrade)
    ? displayedLoginGrade
    : displayedLoginGradeOptions[0]?.id ?? defaultLoginGrade;
  const exampleSelectionLocked = Boolean(selectedExampleAccount);
  const exampleAccountButtonsDisabled = !isHydrated || isSubmitting;
  const courseSelectionLocked = Boolean(registeredStudentProfile || selectedExampleAccount);
  const showExampleAccounts = exampleAccountsEnabledAtBuild || demoModeRequested;
  const showDemoCta = demoCtaEnabledAtBuild || demoModeRequested;
  const activeGoogleRoleLabel = (googleLoginRoles.find((role) => role.key === googleRole) ?? googleLoginRoles[0]).label;
  const demoCtaRow = exampleAccountRows.find((row) => row.key === "us-ca-grade-1") ?? exampleAccountRows[0];
  const demoCtaEntry = demoCtaRow.accounts.find((entry) => entry.roleLabel.en === "Student") ?? demoCtaRow.accounts[0];
  const googleLoginParams = new URLSearchParams({ role: googleRole, language, theme });
  if (nextTarget) googleLoginParams.set("next", nextTarget);
  if (googleRole === "student") {
    googleLoginParams.set("grade", displayedLoginGrade);
    googleLoginParams.set("curriculumTrack", displayedCurriculumTrack);
  }
  const googleLoginHref = `/api/auth/google/start?${googleLoginParams.toString()}`;
  const googleErrorMessage =
    googleError === "setup"
      ? t(authLinkCopy.googleErrors.setup)
      : googleError === "teacher_invite_required"
        ? t(authLinkCopy.googleErrors.teacherInviteRequired)
        : googleError === "parental_consent_required"
          ? t(authLinkCopy.googleErrors.parentalConsentRequired)
          : googleError
            ? t(authLinkCopy.googleErrors.generic)
            : "";

  const formatLoginGradeOption = (grade: Grade) => {
    if (displayedCurriculumProfile.region === "US") return formatGradeLabelForCurriculum(grade.id, language, displayedCurriculumTrack);

    const curriculumLabel = formatGradeLabelForCurriculum(grade.id, language, displayedCurriculumTrack, false);
    const gradeName = t(grade.name);
    if (curriculumLabel === gradeName || curriculumLabel !== grade.id) return curriculumLabel;
    return `${curriculumLabel} / ${gradeName}`;
  };

  useEffect(() => {
    setIdentifier(identifierInputRef.current?.value ?? "");
    setPassword(passwordInputRef.current?.value ?? "");
    const params = new URLSearchParams(window.location.search);
    setNextTarget(params.get("next") ?? "");
    setLoginReason(params.get("reason") ?? "");
    setGoogleError(params.get("googleError") ?? "");
    setDemoModeRequested(params.get("demo") === "1");
    setIsHydrated(true);
  }, []);

  const handleSignedInLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setError("");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!settingsReady) return;

    if (!currentUser && !hasLoginInteractionRef.current) {
      setSelectedGrade(defaultLoginGrade);
      setLoginSelectedGrade(defaultLoginGrade);
      setSelectedExampleAccountKey(null);
    }
  }, [currentUser, settingsReady, setSelectedGrade]);

  const submitLogin = async ({
    loginIdentifier,
    loginPassword,
    grade,
    curriculumProfile,
    source = "credentials"
  }: {
    loginIdentifier: string;
    loginPassword: string;
    grade?: GradeId;
    curriculumProfile?: CurriculumProfile;
    source?: "credentials" | "example-tile" | "demo-cta";
  }) => {
    setError("");
    setIsSubmitting(true);

    try {
      const loginUsername = loginIdentifier.trim() === formatLearnerName(demoStudentAccount.username, language) ? demoStudentAccount.username : loginIdentifier;
      const result = await login(loginUsername, loginPassword, grade, curriculumProfile);
      const funnelOutcome = result.ok
        ? "success"
        : result.requiresCurriculumTrack && result.pendingUser
          ? "pending_curriculum"
          : result.reason === "invalid"
            ? "invalid"
            : "error";
      recordAuthFunnelEvent("login_submit", `${source}:${funnelOutcome}`);
      if (result.ok) {
        setPendingCurriculumUser(null);
        const nextPath = new URLSearchParams(window.location.search).get("next");
        const targetPath = safeWorkspaceTarget(nextPath, result.role);
        const routeTarget = result.passwordMustChange ? `/change-password?next=${encodeURIComponent(targetPath)}` : targetPath;
        router.prefetch(routeTarget);
        router.replace(routeTarget);
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
    if (!isHydrated) return;
    const formData = new FormData(event.currentTarget);
    const submittedIdentifier = formData.get("username");
    const submittedPassword = formData.get("password");
    const loginIdentifier = typeof submittedIdentifier === "string" ? submittedIdentifier : identifier;
    const loginPassword = typeof submittedPassword === "string" ? submittedPassword : password;

    if (selectedExampleAccount) {
      await submitLogin({
        loginIdentifier,
        loginPassword,
        grade: selectedExampleAccount.row.grade,
        curriculumProfile: selectedExampleAccount.row.curriculumProfile,
        source: "example-tile"
      });
      return;
    }

    if (pendingCurriculumUser) {
      const submittedGrade = formData.get("grade");
      const submittedPublisher = formData.get("curriculumPublisher");
      const submittedCurriculumProfile =
        typeof submittedPublisher === "string" && isTextbookPublisher(submittedPublisher)
          ? curriculumProfileForPublisher(submittedPublisher)
          : selectedCurriculumProfile;
      const submittedLoginGrade = isValidGradeId(submittedGrade) ? submittedGrade : loginSelectedGrade;
      await submitLogin({
        loginIdentifier,
        loginPassword,
        grade: loginGradeForCurriculumProfile(submittedCurriculumProfile, submittedLoginGrade),
        curriculumProfile: submittedCurriculumProfile
      });
      return;
    }

    await submitLogin({ loginIdentifier, loginPassword });
  };

  const handleCurriculumSelection = (profile: CurriculumProfile) => {
    if (registeredStudentProfile) return;
    hasLoginInteractionRef.current = true;
    setSelectedExampleAccountKey(null);
    setCurriculumNoticeProfile(null);
    setSelectedCurriculumProfile(profile);
    setCurriculumSelectorProfile(profile);
    const nextLoginGrade = loginGradeForCurriculumProfile(profile, loginSelectedGrade);
    setLoginSelectedGrade(nextLoginGrade);
    setSelectedGrade(nextLoginGrade);
  };

  const fillExampleAccount = (
    account: { username: string; password: string },
    row: (typeof exampleAccountRows)[number],
    accountKey: string,
    source: "example-tile" | "demo-cta" = "example-tile"
  ) => {
    if (isSubmitting) return;
    hasLoginInteractionRef.current = true;
    setIdentifier(account.username);
    setPassword(account.password);
    setSelectedCurriculumProfile(row.curriculumProfile);
    setCurriculumSelectorProfile(row.curriculumProfile);
    setLoginSelectedGrade(row.grade);
    setSelectedGrade(row.grade);
    setPendingCurriculumUser(null);
    setError("");
    setSelectedExampleAccountKey(accountKey);
    void submitLogin({
      loginIdentifier: account.username,
      loginPassword: account.password,
      grade: row.grade,
      curriculumProfile: row.curriculumProfile,
      source
    });
  };

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-3xl gap-6">
        <section className="glass-panel p-6 sm:p-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(dictionary.login.title)}
          </h1>

          {currentUser ? (
            <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-300/20 dark:text-emerald-100">
              <span>
                <span className="font-bold">{t(authLinkCopy.signedIn)}</span>
                <span className="ml-2">{formatLearnerName(currentUser.name, language)}</span>
              </span>
              <button
                type="button"
                onClick={handleSignedInLogout}
                disabled={isLoggingOut}
                className="focus-ring rounded-full border border-emerald-400/60 bg-white/75 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white/[0.08] dark:text-emerald-100 dark:hover:bg-white/[0.14]"
              >
                {isLoggingOut ? t(authLinkCopy.loggingOut) : t(authLinkCopy.switchAccount)}
              </button>
            </div>
          ) : null}

          {loginReason === "teacher-account-required" ? (
            <p className="mt-5 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-300/25 dark:text-amber-100">
              {t(authLinkCopy.teacherAccountRequired)}
            </p>
          ) : null}

          {!currentUser && redirectNotice ? (
            <p className="mt-5 rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-700 dark:text-cyan-100">
              {redirectNotice}
            </p>
          ) : null}

          <form method="post" action="/api/auth/login" onSubmit={handleSubmit} className="mt-8 grid gap-3">
            <label htmlFor="login-identifier" className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(dictionary.login.username)}</span>
              <input
                id="login-identifier"
                ref={identifierInputRef}
                name="username"
                type="text"
                value={identifier}
                onChange={(event) => {
                  hasLoginInteractionRef.current = true;
                  setSelectedExampleAccountKey(null);
                  setPendingCurriculumUser(null);
                  setIdentifier(event.target.value);
                }}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="focus-ring block w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t(dictionary.login.password)}
                </label>
                <Link href="/forgot-password" className="focus-ring inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-400/10 dark:text-cyan-200">
                  {t(authLinkCopy.forgotPassword)}
                </Link>
              </div>
              <PasswordInputWithReveal
                id="login-password"
                ref={passwordInputRef}
                name="password"
                value={password}
                onChange={(event) => {
                  hasLoginInteractionRef.current = true;
                  setSelectedExampleAccountKey(null);
                  setPassword(event.target.value);
                }}
                autoComplete="current-password"
                required
                showLabel={t({ en: "Show password", zh: "顯示密碼", zhHans: "显示密码" })}
                hideLabel={t({ en: "Hide password", zh: "隱藏密碼", zhHans: "隐藏密码" })}
                className="focus-ring block w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            {pendingCurriculumUser ? (
              <div className="grid gap-3 rounded-2xl border border-amber-300/55 bg-amber-400/10 p-4">
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-100">{t(curriculumCopy.prompt)}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-amber-700 dark:text-amber-100/80">{t(curriculumCopy.helper)}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label htmlFor="login-curriculum" className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(loginSetupCopy.courseLabel)}</label>
                    <span className="relative block">
                      <select
                        id="login-curriculum"
                        name="curriculumPublisher"
                        value={displayedCurriculumProfile.publisher}
                        disabled={courseSelectionLocked}
                        onChange={(event) => {
                          const nextPublisher = event.currentTarget.value;
                          if (!isTextbookPublisher(nextPublisher)) return;
                          handleCurriculumSelection(curriculumProfileForPublisher(nextPublisher));
                        }}
                        className="focus-ring min-h-14 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 pr-11 text-sm font-semibold text-slate-950 shadow-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:disabled:bg-white/[0.04] dark:disabled:text-slate-400"
                      >
                        {visibleLoginPublisherGroups.map((group) => (
                          <optgroup key={group.region} label={t(regionLabels[group.region])} className={loginSelectOptionClassName}>
                            {group.publishers.map((publisher) => (
                              <option key={publisher} value={publisher} className={loginSelectOptionClassName}>
                                {t(publisherLabels[publisher])}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-lg font-black text-slate-400 dark:text-slate-300">
                        ⌄
                      </span>
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="login-grade" className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(loginSetupCopy.gradeLabel)}</label>
                    <span className="relative block">
                      <select
                        id="login-grade"
                        name="grade"
                        value={displayedLoginGradeSelectValue}
                        disabled={exampleSelectionLocked}
                        onChange={(event) => {
                          const nextGrade = event.currentTarget.value;
                          if (!isValidGradeId(nextGrade)) return;
                          hasLoginInteractionRef.current = true;
                          setSelectedExampleAccountKey(null);
                          setLoginSelectedGrade(nextGrade);
                          setSelectedGrade(nextGrade);
                        }}
                        className="focus-ring min-h-14 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 pr-11 text-sm font-semibold text-slate-950 shadow-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:disabled:bg-white/[0.04] dark:disabled:text-slate-400"
                      >
                        {displayedLoginGradeOptions.map((grade) => (
                          <option key={grade.id} value={grade.id} className={loginSelectOptionClassName}>
                            {formatLoginGradeOption(grade)}
                          </option>
                        ))}
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-lg font-black text-slate-400 dark:text-slate-300">
                        ⌄
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            {googleErrorMessage ? (
              <p role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
                {googleErrorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!isHydrated || isSubmitting}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {!isHydrated
                ? t({ en: "Preparing secure login", zh: "準備安全登入", zhHans: "准备安全登录" })
                : isSubmitting
                  ? t(dictionary.login.signingIn)
                  : pendingCurriculumUser
                    ? t({ en: "Save curriculum and log in", zh: "保存課程並登入", zhHans: "保存课程并登录" })
                    : t(dictionary.login.submit)}
            </button>

            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span>{t(authLinkCopy.googleDivider)}</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>

              <Link
                href={googleLoginHref}
                onClick={() => recordAuthFunnelEvent("login_google_start", googleRole)}
                className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200/80 bg-white px-5 py-3 font-semibold text-slate-950 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white dark:text-slate-950"
              >
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-slate-200 text-sm font-bold text-blue-600">
                  G
                </span>
                {t(authLinkCopy.googleAction)}
              </Link>

              <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-300">
                {t(authLinkCopy.googleRoleSummary)}{" "}
                <span className="font-bold text-slate-700 dark:text-slate-100">{t(activeGoogleRoleLabel)}</span>
                <button
                  type="button"
                  aria-expanded={showGoogleRolePicker}
                  aria-label={t(authLinkCopy.googleRoleChangeAria)}
                  onClick={() => setShowGoogleRolePicker((open) => !open)}
                  className="focus-ring ml-2 inline-flex min-h-8 items-center rounded-full px-2 py-1 font-semibold text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200"
                >
                  {t(authLinkCopy.googleRoleChange)}
                </button>
              </p>

              {showGoogleRolePicker ? (
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t(authLinkCopy.googleRoleLabel)}>
                  {googleLoginRoles.map((role) => {
                    const selected = googleRole === role.key;
                    return (
                      <button
                        key={role.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setGoogleRole(role.key)}
                        className={`focus-ring min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                            : "border-slate-200/80 bg-white/75 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                        }`}
                      >
                        {t(role.label)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
              <span>{t(authLinkCopy.registerPrompt)}</span>
              <Link href="/register" className="focus-ring inline-flex min-h-11 items-center rounded-full px-2 py-2 font-bold text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(authLinkCopy.registerAction)}
              </Link>
            </p>

            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{t(authLinkCopy.legalPrompt)}</span>
              <Link href="/privacy" className="focus-ring rounded-full px-1 font-bold text-cyan-700 underline-offset-4 transition hover:underline dark:text-cyan-200">
                {t(authLinkCopy.privacyLink)}
              </Link>
              <Link href="/terms" className="focus-ring rounded-full px-1 font-bold text-cyan-700 underline-offset-4 transition hover:underline dark:text-cyan-200">
                {t(authLinkCopy.termsLink)}
              </Link>
            </p>
          </form>
        </section>

      </div>

      {showDemoCta ? (
      <section
        aria-labelledby="login-demo-cta-title"
        className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-300/70 bg-cyan-50/85 p-5 shadow-sm shadow-cyan-900/10 dark:border-cyan-300/20 dark:bg-cyan-950/20 sm:p-6"
      >
        <div className="min-w-56 flex-1">
          <h2 id="login-demo-cta-title" className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            {t(demoCtaCopy.title)}
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
            {t(demoCtaCopy.body)}
          </p>
        </div>
        <button
          type="button"
          disabled={exampleAccountButtonsDisabled}
          onClick={() => fillExampleAccount(demoCtaEntry.account, demoCtaRow, demoCtaEntry.key, "demo-cta")}
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
        >
          {t(demoCtaCopy.action)}
        </button>
      </section>
      ) : null}

      {showExampleAccounts ? (
      <section
        aria-labelledby="login-example-accounts-title"
        className="mx-auto mt-6 max-w-3xl rounded-3xl border border-cyan-300/70 bg-cyan-50/85 p-5 shadow-sm shadow-cyan-900/10 dark:border-cyan-300/20 dark:bg-cyan-950/20 sm:p-6"
      >
        <h2 id="login-example-accounts-title" className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          {t(demoAccountHelpCopy.title)}
        </h2>
        <div className="mt-4 grid gap-4">
          {exampleAccountRows.map((row) => (
            <div key={row.key} className="grid gap-3 border-t border-cyan-200/80 pt-4 first:border-t-0 first:pt-0 dark:border-cyan-100/15">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">{t(row.label)}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {row.accounts.map(({ account, key, roleLabel }) => {
                  const selected = selectedExampleAccountKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={exampleAccountButtonsDisabled}
                      onClick={() => fillExampleAccount(account, row, key)}
                      aria-label={`${t(demoAccountHelpCopy.useAccount)}: ${account.username} (${t(row.label)})`}
                      className={`focus-ring min-h-24 rounded-2xl border px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-white/80 bg-white/85 hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:shadow-cyan-900/10 dark:border-white/10 dark:bg-white/[0.07] dark:hover:bg-white/[0.12]"
                      }`}
                    >
                      <span className={`block text-xs font-bold uppercase tracking-[0.1em] ${selected ? "text-cyan-200 dark:text-cyan-700" : "text-cyan-700 dark:text-cyan-200"}`}>
                        {t(roleLabel)}
                      </span>
                      <span className="mt-1.5 block break-words text-xl font-bold leading-tight">
                        {account.username}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {curriculumNoticeProfile ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="curriculum-update-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-cyan-200/70 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {t(curriculumCopy.temporaryNoticeSelection)}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
              {t(publisherLabels[curriculumNoticeProfile.publisher])}
            </p>
            <h2 id="curriculum-update-title" className="mt-5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t(curriculumCopy.temporaryNoticeTitle)}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {t(curriculumCopy.temporaryNoticeBody)}
            </p>
            <button
              type="button"
              onClick={() => setCurriculumNoticeProfile(null)}
              className="focus-ring mt-6 inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
            >
              {t(curriculumCopy.temporaryNoticeAction)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
