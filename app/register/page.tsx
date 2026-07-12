"use client";

import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { GradeSelector } from "@/components/ui/GradeSelector";
import { PasswordInputWithReveal } from "@/components/ui/PasswordInputWithReveal";
import { curriculumProfileForPublisher, curriculumTrackForProfile, publisherLabels, regionLabels } from "@/lib/curriculumProfile";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import type { CurriculumProfile, CurriculumRegion, CurriculumTrack, GradeId, Language, LocalizedText, TextbookPublisher } from "@/types";

const registerCopy = {
  title: { en: "Create a student, teacher, or parent account", zh: "建立學生、教師或家長帳戶", zhHans: "建立学生、教师或家长帐户" },
  flowTitle: { en: "Choose your curriculum", zh: "選擇你的課程", zhHans: "选择你的课程" },
  parentTitle: { en: "Create a parent account", zh: "建立家長帳戶", zhHans: "建立家长帐户" },
  subtitle: {
    en: "Students, teachers, and families can create their MAIS account here.",
    zh: "學生、教師和家庭可在此建立 MAIS 帳戶。",
    zhHans: "学生、教师和家庭可在此建立 MAIS 账户。"
  },
  gradePrompt: {
    en: "Choose the curriculum and grade you want MAIS to open first.",
    zh: "請選擇你希望 MAIS 優先開啟的課程與年級。",
    zhHans: "请选择你希望 MAIS 优先开启的课程与年级。"
  },
  familyPrompt: {
    en: "Families can create a parent account first, then connect children with an invite code.",
    zh: "家庭可先建立家長帳戶，再用邀請碼綁定孩子。",
    zhHans: "家庭可先建立家长账户，再用邀请码绑定孩子。"
  },
  stepDetailsHelp: {
    en: "These details create the private account used for learning, family access, and tutor history.",
    zh: "這些資料會建立私人帳戶，用於學習、家庭連結和導師紀錄。",
    zhHans: "这些资料会建立私人账户，用于学习、家庭连接和导师记录。"
  },
  accountType: { en: "1. Account type", zh: "1. 帳戶類型", zhHans: "1. 账户类型" },
  accountTypeHelp: {
    en: "Create a Student, Teacher, or Parent profile. Admin accounts remain invitation-only.",
    zh: "建立學生、教師或家長檔案。管理員帳戶仍需邀請開通。",
    zhHans: "建立学生、教师或家长档案。管理员账户仍需邀请开通。"
  },
  parentAccount: { en: "Parent", zh: "家長", zhHans: "家长" },
  studentAccount: { en: "Student", zh: "學生", zhHans: "学生" },
  teacherAccount: { en: "Teacher", zh: "教師", zhHans: "教师" },
  studentName: { en: "Student name", zh: "學生姓名" },
  teacherName: { en: "Teacher name", zh: "教師姓名", zhHans: "教师姓名" },
  parentName: { en: "Parent name", zh: "家長姓名", zhHans: "家长姓名" },
  username: { en: "Username or student ID", zh: "用戶名稱或學生編號", zhHans: "用户名或学生编号" },
  teacherUsername: { en: "Teacher username or work email", zh: "教師用戶名稱或工作電郵", zhHans: "教师用户名或工作邮箱" },
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
  teacherSuccess: {
    en: "Teacher account created. Opening the teacher workspace...",
    zh: "教師帳戶已建立，正在開啟教師工作台...",
    zhHans: "教师账户已建立，正在打开教师工作台..."
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
  pathReady: { en: "Learning path ready", zh: "學習路徑已準備", zhHans: "学习路径已准备" },
  summaryIdentity: { en: "Selected profile", zh: "已選身份", zhHans: "已选身份" },
  summaryIdentityStudentHelp: { en: "Private learner profile", zh: "私人學習檔案", zhHans: "私人学习档案" },
  summaryIdentityTeacherHelp: { en: "Classroom teaching profile", zh: "課堂教學檔案", zhHans: "课堂教学档案" },
  summaryIdentityParentHelp: { en: "Family access profile", zh: "家庭連結檔案", zhHans: "家庭连接档案" },
  summaryGradeHelp: { en: "Visible before the form", zh: "填寫前可先確認", zhHans: "填写前可先确认" },
  summaryCurriculumHelp: { en: "Saved to account", zh: "保存到帳戶", zhHans: "保存到账户" },
  stepperAccountType: { en: "Account type", zh: "帳戶類型", zhHans: "账户类型" },
  stepperGrade: { en: "Grade", zh: "年級", zhHans: "年级" },
  stepperCurriculum: { en: "Curriculum", zh: "課程", zhHans: "课程" },
  stepperDetails: { en: "Account details", zh: "帳戶資料", zhHans: "帐户资料" },
  stepperConnectChild: { en: "Connect child", zh: "綁定孩子", zhHans: "绑定孩子" },
  nextStep: { en: "Next step", zh: "下一步", zhHans: "下一步" },
  selectedCurriculum: { en: "Saved curriculum", zh: "保存課程", zhHans: "保存课程" },
  privacyNote: {
    en: "Progress, mistakes, and tutor history stay tied to this private learner profile.",
    zh: "進度、錯題和導師紀錄會連繫到這個私人學生帳戶。",
    zhHans: "进度、错题和导师记录会关联到这个私人学生帐户。"
  },
  teacherPrivacyNote: {
    en: "Teaching resources, class planning, and student support tools stay tied to this teacher workspace.",
    zh: "教學資源、課堂規劃和學生支援工具會連繫到這個教師工作台。",
    zhHans: "教学资源、课堂规划和学生支持工具会关联到这个教师工作台。"
  },
  parentPrivacyNote: {
    en: "After registration, use a teacher-provided parent invite code to connect a child.",
    zh: "註冊後，請使用教師提供的家長邀請碼綁定孩子。",
    zhHans: "注册后，请使用教师提供的家长邀请码绑定孩子。"
  },
  questTitle: { en: "Start your math journey", zh: "開始你的數學旅程", zhHans: "开始你的数学旅程" },
  questSubtitle: {
    en: "Choose your learner profile",
    zh: "選擇你的學習者檔案",
    zhHans: "选择你的学习者档案"
  },
  questNote: {
    en: "Complete each checkpoint to unlock a personalized learning path.",
    zh: "完成每個檢查點，解鎖個人化學習路徑。",
    zhHans: "完成每个检查点，解锁个性化学习路径。"
  }
} as const;

const registerRegionLabelOverrides: Partial<Record<CurriculumRegion, LocalizedText>> = {
  MAINLAND: { en: "China Curriculum", zh: "中國課程", zhHans: "中国课程" },
  HK: { en: "HKSAR Curriculum", zh: "香港特區課程", zhHans: "香港特区课程" }
};

const registerPublisherButtonLabelOverrides: Partial<Record<TextbookPublisher, LocalizedText>> = {
  MAINLAND_BNU: {
    en: "BNUP Mathematics",
    zh: "北師大版數學",
    zhHans: "北师大版数学"
  }
};

const registerCurriculumPublisherGroups: readonly {
  region: CurriculumRegion;
  publishers: readonly TextbookPublisher[];
}[] = [
  { region: "MAINLAND", publishers: ["MAINLAND_PEP", "MAINLAND_HJB", "MAINLAND_BNU"] },
  { region: "HK", publishers: ["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"] },
  { region: "US", publishers: ["US_CA_MATH"] }
];

const registerCurriculumPublisherOptions: readonly TextbookPublisher[] = [
  "MAINLAND_PEP",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
  "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
  "HK_UNITED_PRIME_MIA",
  "HK_EPH_MIF",
  "US_CA_MATH"
];

type RegistrationRole = "parent" | "student" | "teacher";
type RegisterStepId = "account" | "grade" | "curriculum" | "details";
type RegisterIconKind = "book" | "details" | "grade" | "profile";

function isUnitedStatesRegistrationTrack(curriculumTrack: CurriculumTrack) {
  return curriculumTrack === "US_CA_MATH" || curriculumTrack === "US_NC_MATH" || curriculumTrack === "US_AR_MATH" || curriculumTrack === "US_FL_MATH";
}

function formatRegistrationGradeLabel(grade: GradeId, language: Language, curriculumTrack: CurriculumTrack) {
  return formatGradeLabelForCurriculum(grade, language, curriculumTrack, true);
}

function StepIcon({ kind, className = "" }: { kind: RegisterIconKind; className?: string }) {
  if (kind === "book") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="none">
        <path d="M9 13c0-2.2 1.8-4 4-4h9c2.2 0 4 1.8 4 4v27c0-2.2-1.8-4-4-4h-9c-2.2 0-4 1.8-4 4V13Z" fill="currentColor" opacity="0.18" />
        <path d="M39 13c0-2.2-1.8-4-4-4h-9c-2.2 0-4 1.8-4 4v27c0-2.2 1.8-4 4-4h9c2.2 0 4 1.8 4 4V13Z" fill="currentColor" opacity="0.14" />
        <path d="M24 13v27M12 15h8M12 22h8M28 15h8M28 22h8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "grade") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="none">
        <path d="m24 8 18 8.5L24 25 6 16.5 24 8Z" fill="currentColor" opacity="0.2" />
        <path d="m13 21.5 11 5.3 11-5.3V31c-2.6 3.5-6.3 5.3-11 5.3S15.6 34.5 13 31v-9.5Z" fill="currentColor" opacity="0.16" />
        <path d="m24 8 18 8.5L24 25 6 16.5 24 8ZM13 21.5V31c2.6 3.5 6.3 5.3 11 5.3S32.4 34.5 35 31v-9.5M41 17v11" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "details") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="none">
        <path d="M15 8h18c2.2 0 4 1.8 4 4v27c0 2.2-1.8 4-4 4H15c-2.2 0-4-1.8-4-4V12c0-2.2 1.8-4 4-4Z" fill="currentColor" opacity="0.18" />
        <path d="M18 6h12v8H18V6Z" fill="currentColor" opacity="0.25" />
        <path d="M18 6h12v8H18V6ZM16 19h16M16 26h16M16 33h10" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 8h18c2.2 0 4 1.8 4 4v27c0 2.2-1.8 4-4 4H15c-2.2 0-4-1.8-4-4V12c0-2.2 1.8-4 4-4Z" stroke="currentColor" strokeWidth="3.1" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="none">
      <path d="M24 23c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8Z" fill="currentColor" opacity="0.2" />
      <path d="M10 40c1.8-7.2 7-11.2 14-11.2S36.2 32.8 38 40" fill="currentColor" opacity="0.18" />
      <path d="M24 23c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8ZM10 40c1.8-7.2 7-11.2 14-11.2S36.2 32.8 38 40" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoleIllustration({ role }: { role: RegistrationRole }) {
  if (role === "student") {
    return (
      <div aria-hidden="true" className="relative mx-auto h-36 w-full max-w-[16rem] xl:h-40 xl:max-w-[17rem] min-[1800px]:h-44 min-[1800px]:max-w-[18rem]">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 320 220" fill="none">
          <defs>
            <linearGradient id="studentCloudGradient" x1="73" x2="230" y1="64" y2="170" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d8f0ff" />
              <stop offset="1" stopColor="#abd6f8" />
            </linearGradient>
            <linearGradient id="studentMainBlue" x1="99" x2="207" y1="62" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#409df4" />
              <stop offset="0.48" stopColor="#1775d8" />
              <stop offset="1" stopColor="#0951b3" />
            </linearGradient>
            <linearGradient id="studentSideBlue" x1="82" x2="126" y1="74" y2="176" gradientUnits="userSpaceOnUse">
              <stop stopColor="#45a5f7" />
              <stop offset="1" stopColor="#1160c0" />
            </linearGradient>
            <linearGradient id="studentPocketBlue" x1="125" x2="190" y1="108" y2="168" gradientUnits="userSpaceOnUse">
              <stop stopColor="#45a7f8" />
              <stop offset="1" stopColor="#075cc3" />
            </linearGradient>
            <linearGradient id="studentPatchGradient" x1="178" x2="223" y1="79" y2="123" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a7e98d" />
              <stop offset="1" stopColor="#59c179" />
            </linearGradient>
            <linearGradient id="studentLeafGradient" x1="236" x2="280" y1="103" y2="183" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8adb7b" />
              <stop offset="1" stopColor="#55b85a" />
            </linearGradient>
            <linearGradient id="studentMetalGradient" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#f4fbff" />
              <stop offset="1" stopColor="#9fb2c4" />
            </linearGradient>
            <radialGradient id="studentBlueHighlight" cx="0" cy="0" r="1" gradientTransform="matrix(78 0 0 85 127 78)" gradientUnits="userSpaceOnUse">
              <stop stopColor="#75bdf9" stopOpacity="0.85" />
              <stop offset="1" stopColor="#75bdf9" stopOpacity="0" />
            </radialGradient>
            <filter id="studentSoftShadow" x="45" y="20" width="250" height="190" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="14" floodColor="#0a58aa" floodOpacity="0.26" stdDeviation="10" />
            </filter>
          </defs>
          <ellipse cx="160" cy="184" rx="95" ry="16" fill="#0d4d99" opacity="0.14" />
          <path
            d="M72 139c-17-2-29-15-29-32 0-18 14-32 31-32 8-27 32-46 62-46 22 0 42 10 54 26 8-5 18-8 29-8 28 0 51 22 51 50 0 25-18 45-42 49H72Z"
            fill="url(#studentCloudGradient)"
            opacity="0.9"
          />
          <g opacity="0.95">
            <path d="M236 165c-6-25 7-52 30-61 8 24-4 51-30 61Z" fill="url(#studentLeafGradient)" />
            <path d="M260 174c-3-20 10-39 30-43 6 21-8 40-30 43Z" fill="url(#studentLeafGradient)" />
            <path d="M225 174c2-23 18-40 40-42 1 23-17 41-40 42Z" fill="url(#studentLeafGradient)" />
          </g>
          <g filter="url(#studentSoftShadow)">
            <path d="M124 75c0-24 15-41 37-41 23 0 38 17 38 41" stroke="#155eb5" strokeLinecap="round" strokeWidth="15" />
            <path d="M124 75c0-24 15-41 37-41 23 0 38 17 38 41" stroke="#54adf8" strokeLinecap="round" strokeWidth="6" opacity="0.5" />
            <path
              d="M104 82c0-18 14-32 32-32h58c19 0 35 16 35 35v67c0 25-20 45-45 45h-44c-21 0-38-17-38-38V82Z"
              fill="url(#studentMainBlue)"
            />
            <path d="M104 82c0-18 14-32 32-32h58c19 0 35 16 35 35v67c0 25-20 45-45 45h-44c-21 0-38-17-38-38V82Z" fill="url(#studentBlueHighlight)" />
            <path d="M111 85c7-21 27-31 58-31h21c17 0 29 11 34 29-28 11-82 11-113 2Z" fill="#71c3ff" opacity="0.38" />
            <path d="M109 154c12 18 31 28 56 28 26 0 47-11 60-29v7c0 22-18 40-40 40h-45c-18 0-31-13-31-31v-15Z" fill="#003f9c" opacity="0.2" />
            <path d="M82 103c0-17 12-31 28-31h12v104H98c-13 0-23-10-23-23v-43c0-4 3-7 7-7Z" fill="url(#studentSideBlue)" />
            <path d="M86 106c0-12 9-22 21-22h7v80H96c-8 0-14-6-14-14v-39c0-3 2-5 4-5Z" fill="#4daef9" opacity="0.35" />
            <path d="M221 85h7c15 0 27 12 27 27v41c0 16-13 29-29 29h-14V91c0-3 4-6 9-6Z" fill="#0d64c7" />
            <path d="M225 95c11 2 19 11 19 23v37c0 8-5 15-12 18" stroke="#449bef" strokeLinecap="round" strokeWidth="5" opacity="0.38" />
            <path d="M119 128c0-13 11-24 24-24h43c15 0 27 12 27 27v33c0 19-15 34-34 34h-28c-18 0-32-14-32-32v-38Z" fill="url(#studentPocketBlue)" />
            <path d="M127 132c0-9 7-17 17-17h35c12 0 21 9 21 21v12h-73v-16Z" fill="#5eb4fb" opacity="0.33" />
            <path d="M126 121h79" stroke="#0a4faa" strokeLinecap="round" strokeWidth="3" opacity="0.45" />
            <path d="M130 153c20 7 48 7 69 0" stroke="#5db5fb" strokeLinecap="round" strokeWidth="4" opacity="0.4" />
            <rect x="183" y="80" width="44" height="44" rx="10" fill="url(#studentPatchGradient)" transform="rotate(45 183 80)" />
            <circle cx="197" cy="103" r="4" fill="#14736b" opacity="0.82" />
            <circle cx="214" cy="120" r="4" fill="#14736b" opacity="0.82" />
            <path d="M111 69c18-6 50-8 87 1" stroke="#8fd0ff" strokeLinecap="round" strokeWidth="4" opacity="0.32" />
            <path d="M113 85c-2 23-1 47 2 70" stroke="#083f93" strokeLinecap="round" strokeWidth="3" opacity="0.42" />
            <path d="M202 93c5 25 5 55 0 81" stroke="#073f91" strokeLinecap="round" strokeWidth="3" opacity="0.38" />
            <rect x="93" y="98" width="14" height="57" rx="7" fill="url(#studentMetalGradient)" />
            <rect x="195" y="139" width="13" height="49" rx="6.5" fill="url(#studentMetalGradient)" />
            <path d="M106 156l-8 16" stroke="#718497" strokeLinecap="round" strokeWidth="4" />
            <path d="M206 188l-6 14" stroke="#718497" strokeLinecap="round" strokeWidth="4" />
          </g>
        </svg>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div aria-hidden="true" className="relative mx-auto h-36 w-full max-w-[16rem] xl:h-40 xl:max-w-[17rem] min-[1800px]:h-44 min-[1800px]:max-w-[18rem]">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 320 220" fill="none">
          <defs>
            <linearGradient id="teacherBackdropGradient" x1="58" x2="258" y1="30" y2="171" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d6f7ee" />
              <stop offset="1" stopColor="#a9e9df" />
            </linearGradient>
            <linearGradient id="teacherBoardOuterGradient" x1="82" x2="244" y1="34" y2="136" gradientUnits="userSpaceOnUse">
              <stop stopColor="#20c7ae" />
              <stop offset="1" stopColor="#0a938d" />
            </linearGradient>
            <linearGradient id="teacherBoardInnerGradient" x1="94" x2="235" y1="46" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#19b9a6" />
              <stop offset="1" stopColor="#07887e" />
            </linearGradient>
            <linearGradient id="teacherDeskGradient" x1="96" x2="228" y1="145" y2="193" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffcf58" />
              <stop offset="1" stopColor="#f1a626" />
            </linearGradient>
            <linearGradient id="teacherProtractorGradient" x1="179" x2="263" y1="123" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffea9c" />
              <stop offset="1" stopColor="#ffc94a" />
            </linearGradient>
            <linearGradient id="teacherBookGradient" x1="74" x2="112" y1="137" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3da9f5" />
              <stop offset="1" stopColor="#0b62cf" />
            </linearGradient>
            <filter id="teacherSoftShadow" x="48" y="18" width="240" height="190" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="14" floodColor="#0b756f" floodOpacity="0.23" stdDeviation="10" />
            </filter>
          </defs>
          <ellipse cx="160" cy="184" rx="100" ry="15" fill="#2f7774" opacity="0.14" />
          <path
            d="M71 125c-8-35 13-70 48-79 19-5 38-1 53 9 14-15 37-22 59-15 31 10 50 42 43 74-7 35-41 59-77 55-15 11-34 15-54 11-16-4-29-12-39-23-16 2-28-6-33-32Z"
            fill="url(#teacherBackdropGradient)"
          />
          <g filter="url(#teacherSoftShadow)">
            <rect x="72" y="36" width="176" height="104" rx="14" fill="url(#teacherBoardOuterGradient)" />
            <rect x="85" y="48" width="150" height="78" rx="9" fill="url(#teacherBoardInnerGradient)" />
            <g stroke="#c8fff5" strokeWidth="1.6" opacity="0.5">
              <path d="M103 50v75" />
              <path d="M122 50v75" />
              <path d="M141 50v75" />
              <path d="M160 50v75" />
              <path d="M179 50v75" />
              <path d="M198 50v75" />
              <path d="M217 50v75" />
              <path d="M86 66h148" />
              <path d="M86 83h148" />
              <path d="M86 100h148" />
              <path d="M86 117h148" />
            </g>
            <path d="M101 94h125" stroke="#eafffb" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M122 114V57" stroke="#eafffb" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M106 108 224 64" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <path d="M119 77 C134 107 172 109 197 60" stroke="#fff199" strokeWidth="5" strokeLinecap="round" />
            <path d="m197 60-11 4 8 8" stroke="#fff199" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m119 77 3 12 8-8" stroke="#fff199" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <text x="137" y="69" fill="#f5fffe" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="900">f(x)</text>
            <text x="107" y="65" fill="#f5fffe" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="900">y</text>
            <text x="203" y="116" fill="#f5fffe" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">x</text>
            <rect x="95" y="130" width="132" height="12" rx="6" fill="#0b7d78" />
            <rect x="111" y="139" width="102" height="46" rx="13" fill="url(#teacherDeskGradient)" />
            <path d="M121 148h82" stroke="#ffe597" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
            <rect x="78" y="137" width="34" height="51" rx="8" fill="url(#teacherBookGradient)" />
            <path d="M86 146h18M86 157h18M86 168h18" stroke="#8ad2ff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <path d="M196 185a42 42 0 0 1 84 0h-84Z" fill="url(#teacherProtractorGradient)" />
            <path d="M214 185a24 24 0 0 1 48 0h-48Z" fill="#fff7cd" opacity="0.82" />
            <path d="M202 181h72" stroke="#d89d19" strokeWidth="5" strokeLinecap="round" />
            {Array.from({ length: 7 }).map((_, index) => (
              <path key={`teacher-protractor-mark-${index}`} d={`M${213 + index * 9} 181l${index - 3} -15`} stroke="#b67d12" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
            ))}
            <path d="M237 143 271 111" stroke="#ff7b64" strokeWidth="9" strokeLinecap="round" />
            <path d="m269 111 9-5-4 10" fill="#ff7b64" />
            <path d="M70 154c10-10 23-13 38-8" stroke="#6bcf71" strokeWidth="12" strokeLinecap="round" />
            <circle cx="64" cy="158" r="17" fill="#73d36d" />
            <circle cx="262" cy="151" r="22" fill="#56bd57" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="relative mx-auto h-36 w-full max-w-[16rem] xl:h-40 xl:max-w-[17rem] min-[1800px]:h-44 min-[1800px]:max-w-[18rem]">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 320 220" fill="none">
        <defs>
          <linearGradient id="parentBackdropGradient" x1="64" x2="261" y1="33" y2="169" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d6f6ec" />
            <stop offset="1" stopColor="#aee8d8" />
          </linearGradient>
          <linearGradient id="parentWallGradient" x1="111" x2="204" y1="70" y2="174" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffeec6" />
            <stop offset="0.52" stopColor="#f8dba4" />
            <stop offset="1" stopColor="#e9bd77" />
          </linearGradient>
          <linearGradient id="parentRoofGradient" x1="91" x2="231" y1="35" y2="102" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff7f67" />
            <stop offset="0.55" stopColor="#f15e4b" />
            <stop offset="1" stopColor="#d94639" />
          </linearGradient>
          <linearGradient id="parentBlueGradient" x1="126" x2="198" y1="102" y2="172" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3697dc" />
            <stop offset="1" stopColor="#0e5c98" />
          </linearGradient>
          <linearGradient id="parentShrubGradient" x1="51" x2="267" y1="130" y2="187" gradientUnits="userSpaceOnUse">
            <stop stopColor="#86d97b" />
            <stop offset="1" stopColor="#57b753" />
          </linearGradient>
          <radialGradient id="parentWallHighlight" cx="0" cy="0" r="1" gradientTransform="matrix(61 0 0 68 132 90)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff6d8" stopOpacity="0.88" />
            <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
          </radialGradient>
          <filter id="parentSoftShadow" x="39" y="21" width="250" height="185" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="14" floodColor="#8a6538" floodOpacity="0.19" stdDeviation="10" />
          </filter>
        </defs>
        <ellipse cx="160" cy="184" rx="102" ry="15" fill="#8f7449" opacity="0.13" />
        <path
          d="M68 126c-9-33 9-67 42-78 20-7 40-5 56 5 14-17 38-26 62-20 34 8 57 40 53 74-4 39-40 67-80 62-16 13-38 18-60 13-16-4-30-12-40-23-15 3-29-1-33-33Z"
          fill="url(#parentBackdropGradient)"
        />
        <g filter="url(#parentSoftShadow)">
          <circle cx="69" cy="161" r="28" fill="url(#parentShrubGradient)" />
          <circle cx="245" cy="160" r="31" fill="url(#parentShrubGradient)" />
          <circle cx="96" cy="167" r="20" fill="url(#parentShrubGradient)" />
          <circle cx="219" cy="173" r="19" fill="url(#parentShrubGradient)" />
          <path
            d="M107 84c0-7 6-13 13-13h76c7 0 13 6 13 13v83c0 8-6 14-14 14h-74c-8 0-14-6-14-14V84Z"
            fill="url(#parentWallGradient)"
          />
          <path d="M107 84c0-7 6-13 13-13h76c7 0 13 6 13 13v83c0 8-6 14-14 14h-74c-8 0-14-6-14-14V84Z" fill="url(#parentWallHighlight)" />
          <path
            d="M82 86 158 34l83 52-17 17-66-41-62 41-14-17Z"
            fill="url(#parentRoofGradient)"
          />
          <path d="M91 84 158 41l75 43" stroke="url(#parentRoofGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24" />
          <path d="M105 84 158 51l61 33" stroke="#ff9a80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" opacity="0.38" />
          <path d="M94 100 158 61l65 39" stroke="#c84235" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" opacity="0.22" />
          <path d="M100 92 158 52l64 40" stroke="#ff9a80" strokeLinecap="round" strokeWidth="8" opacity="0.35" />
          <rect x="206" y="52" width="30" height="59" rx="8" fill="url(#parentRoofGradient)" />
          <path d="M206 61c11 1 20 1 30-1" stroke="#ff9a80" strokeLinecap="round" strokeWidth="5" opacity="0.35" />
          <rect x="129" y="118" width="34" height="61" rx="11" fill="url(#parentBlueGradient)" />
          <circle cx="143" cy="150" r="5.5" fill="#f1a249" />
          <g fill="url(#parentBlueGradient)">
            <rect x="176" y="103" width="20" height="24" rx="5" />
            <rect x="204" y="103" width="20" height="24" rx="5" />
            <rect x="176" y="134" width="20" height="24" rx="5" />
            <rect x="204" y="134" width="20" height="24" rx="5" />
          </g>
          <g opacity="0.38">
            <path d="M181 107h12M209 107h11M181 138h12M209 138h11" stroke="#79c7f3" strokeLinecap="round" strokeWidth="3" />
            <path d="M133 125h25" stroke="#79c7f3" strokeLinecap="round" strokeWidth="3" />
          </g>
          <rect x="98" y="173" width="131" height="16" rx="8" fill="#ef654f" />
          <path d="M104 175h119" stroke="#ff9a80" strokeLinecap="round" strokeWidth="5" opacity="0.45" />
        </g>
      </svg>
    </div>
  );
}

function TopChipIcon({ kind, label }: { kind: "book" | "flag" | "grade"; label?: string }) {
  if (kind === "book") {
    return (
      <svg aria-hidden="true" className="h-5 w-5 text-[#1267d8]" viewBox="0 0 24 24" fill="none">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" fill="currentColor" opacity="0.9" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h4.5a2.5 2.5 0 0 1 2.5 2.5v-15Z" fill="#f5b829" />
      </svg>
    );
  }

  if (kind === "grade") {
    return <span className="grid h-5 w-5 place-items-center rounded-full bg-[#eef4ff] text-[0.68rem] font-black text-[#102454]">{label ?? "S"}</span>;
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5 text-[#2fbf79]" viewBox="0 0 24 24" fill="none">
      <path d="M6 20V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 5h10l-2.5 4L18 13H8V5Z" fill="currentColor" />
      <path d="M8 5h10l-2.5 4L18 13H8V5Z" fill="#ffd65c" opacity="0.45" />
    </svg>
  );
}

function NumberBlocks() {
  return (
    <div aria-hidden="true" className="absolute bottom-6 left-0 hidden h-36 w-[24rem] overflow-visible md:block">
      <div className="absolute bottom-0 left-0 h-28 w-60 rounded-tr-[80%] bg-[#9dd36f]" />
      <div className="absolute bottom-0 left-48 h-16 w-32 rounded-t-[100%] bg-[#e7efb4]" />
      <div className="absolute bottom-9 left-7 grid h-16 w-16 rotate-[-9deg] place-items-center rounded-2xl bg-gradient-to-br from-[#ffd847] to-[#f5aa16] text-5xl font-black text-white shadow-[0_12px_18px_rgba(178,119,8,0.25),inset_6px_6px_9px_rgba(255,255,255,0.36)] [text-shadow:0_3px_0_rgba(145,92,0,0.28)]">
        2
      </div>
      <div className="absolute bottom-5 left-[8.9rem] grid h-14 w-14 rotate-[2deg] place-items-center rounded-xl bg-gradient-to-br from-[#4ba8e8] to-[#1267d8] text-4xl font-black text-white shadow-[0_12px_18px_rgba(18,91,177,0.25),inset_5px_5px_8px_rgba(255,255,255,0.3)]">
        ×
      </div>
      <div className="absolute bottom-8 left-[13.3rem] grid h-[4.4rem] w-[4.4rem] rotate-[9deg] place-items-center rounded-2xl bg-gradient-to-br from-[#ff906f] to-[#e75d42] text-5xl font-black text-white shadow-[0_12px_18px_rgba(182,75,51,0.25),inset_6px_6px_9px_rgba(255,255,255,0.34)] [text-shadow:0_3px_0_rgba(117,49,35,0.24)]">
        8
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { language, register, t } = useSettings();
  const [accountType, setAccountType] = useState<RegistrationRole>("student");
  const [studentName, setStudentName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [curriculumProfile, setCurriculumProfile] = useState<CurriculumProfile>(() => curriculumProfileForPublisher("US_CA_MATH"));
  const [registrationGrade, setRegistrationGrade] = useState<GradeId>("K");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<RegisterStepId>("account");
  const curriculumTrack = curriculumTrackForProfile(curriculumProfile);
  const isParentRegistration = accountType === "parent";
  const isTeacherRegistration = accountType === "teacher";
  const selectedGradeLabel = formatRegistrationGradeLabel(registrationGrade, language, curriculumTrack);
  const selectedGradeChipBadge = isUnitedStatesRegistrationTrack(curriculumTrack) ? (registrationGrade === "K" ? "K" : "G") : registrationGrade.startsWith("P") ? "P" : "S";
  const selectedPublisherLabel = t(registerPublisherButtonLabelOverrides[curriculumProfile.publisher] ?? publisherLabels[curriculumProfile.publisher]);
  const displayedPublisherLabel = selectedPublisherLabel;
  const curriculumOptionLabel = (publisher: TextbookPublisher) => {
    const publisherLabel = t(registerPublisherButtonLabelOverrides[publisher] ?? publisherLabels[publisher]);

    return publisherLabel;
  };
  const stepOrder: RegisterStepId[] = ["account", "curriculum", "grade", "details"];
  const availableStepOrder = isParentRegistration ? (["account", "details"] as RegisterStepId[]) : stepOrder;
  const activeStepIndex = Math.max(0, stepOrder.indexOf(activeStep));
  const activeAvailableStepIndex = Math.max(0, availableStepOrder.indexOf(activeStep));
  const canGoPrevious = activeAvailableStepIndex > 0;
  const canGoNext = activeAvailableStepIndex < availableStepOrder.length - 1;
  const registerSteps: {
    id: RegisterStepId;
    icon: RegisterIconKind;
    summary: string;
    title: string;
    disabled?: boolean;
  }[] = [
    {
      id: "account",
      icon: "profile",
      title: t(registerCopy.stepperAccountType),
      summary: t(
        isTeacherRegistration
          ? registerCopy.summaryIdentityTeacherHelp
          : isParentRegistration
            ? registerCopy.summaryIdentityParentHelp
            : registerCopy.summaryIdentityStudentHelp
      )
    },
    {
      id: "curriculum",
      icon: "book",
      title: t(registerCopy.stepperCurriculum),
      summary: isParentRegistration ? t(registerCopy.stepperConnectChild) : displayedPublisherLabel,
      disabled: isParentRegistration
    },
    {
      id: "grade",
      icon: "grade",
      title: t(registerCopy.stepperGrade),
      summary: isParentRegistration ? t({ en: "Student only", zh: "學生帳戶適用", zhHans: "学生帐户适用" }) : selectedGradeLabel,
      disabled: isParentRegistration
    },
    {
      id: "details",
      icon: "details",
      title: t(registerCopy.stepperDetails),
      summary: studentName || t({ en: "Tell us a little more", zh: "告訴我們更多", zhHans: "告诉我们更多" })
    }
  ];

  useEffect(() => {
    if (isParentRegistration && (activeStep === "grade" || activeStep === "curriculum")) {
      setActiveStep("details");
    }
  }, [activeStep, isParentRegistration]);

  const goToStep = (step: RegisterStepId) => {
    const target = registerSteps.find((item) => item.id === step);
    if (target?.disabled) return;
    setActiveStep(step);
  };

  const goToPreviousStep = () => {
    if (!canGoPrevious) return;
    const previousStep = availableStepOrder[activeAvailableStepIndex - 1];
    if (previousStep) setActiveStep(previousStep);
  };

  const goToNextStep = () => {
    if (!canGoNext) return;
    const nextStep = availableStepOrder[activeAvailableStepIndex + 1];
    if (nextStep) setActiveStep(nextStep);
  };

  const handleAccountTypeChange = (role: RegistrationRole) => {
    setAccountType(role);
    setMessage("");
  };

  const detailsDescription = isParentRegistration
    ? registerCopy.parentPrivacyNote
    : isTeacherRegistration
      ? registerCopy.teacherPrivacyNote
      : registerCopy.stepDetailsHelp;
  const profileNameLabel = isParentRegistration
    ? registerCopy.parentName
    : isTeacherRegistration
      ? registerCopy.teacherName
      : registerCopy.studentName;
  const usernameLabel = isTeacherRegistration ? registerCopy.teacherUsername : registerCopy.username;
  const successMessage = isParentRegistration
    ? registerCopy.parentSuccess
    : isTeacherRegistration
      ? registerCopy.teacherSuccess
      : registerCopy.success;
  const successRedirect = isParentRegistration ? "/parent/connect" : isTeacherRegistration ? "/teacher/dashboard" : "/dashboard";

  const carouselCardStyle = (step: RegisterStepId): CSSProperties => {
    const stepIndex = stepOrder.indexOf(step);
    const isActive = activeStep === step;

    return {
      inset: isActive ? undefined : "0.25rem",
      opacity: isActive ? 1 : 0,
      pointerEvents: isActive ? "auto" : "none",
      position: isActive ? "relative" : "absolute",
      transform: isActive ? "translateX(0)" : `translateX(${stepIndex < activeStepIndex ? "-2rem" : "2rem"})`
    };
  };

  const renderStepActions = ({
    nextLabel,
    showBack = true,
    submit = false
  }: {
    nextLabel?: LocalizedText;
    showBack?: boolean;
    submit?: boolean;
  }) => (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showBack ? (
        <button
          type="button"
          onClick={goToPreviousStep}
          className="focus-ring inline-flex h-14 items-center justify-center rounded-2xl border border-[#dae7f6] bg-white px-6 text-sm font-black text-[#33426a] shadow-[0_10px_20px_rgba(18,58,109,0.08)] transition hover:-translate-y-0.5 hover:border-[#b9d5f4]"
        >
          {t({ en: "Back", zh: "返回", zhHans: "返回" })}
        </button>
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}

      {submit ? (
        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring inline-flex h-16 min-w-[15rem] items-center justify-center gap-8 rounded-[1.05rem] bg-gradient-to-b from-[#1682f2] to-[#075fd4] px-8 text-lg font-black text-white shadow-[0_14px_24px_rgba(5,96,214,0.28),inset_0_1px_0_rgba(255,255,255,0.34)] transition enabled:hover:-translate-y-0.5 enabled:hover:from-[#1e8efb] enabled:hover:to-[#0758c5] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? t(registerCopy.submitting) : t(registerCopy.submit)}
          <span aria-hidden="true" className="text-xl leading-none">→</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={goToNextStep}
          className="focus-ring inline-flex h-16 min-w-[15rem] items-center justify-center gap-8 rounded-[1.05rem] bg-gradient-to-b from-[#1682f2] to-[#075fd4] px-8 text-lg font-black text-white shadow-[0_14px_24px_rgba(5,96,214,0.28),inset_0_1px_0_rgba(255,255,255,0.34)] transition hover:-translate-y-0.5 hover:from-[#1e8efb] hover:to-[#0758c5]"
        >
          {t(nextLabel ?? registerCopy.nextStep)}
          <span aria-hidden="true" className="text-xl leading-none">→</span>
        </button>
      )}
    </div>
  );

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
        setMessage(t(successMessage));
        window.location.assign(successRedirect);
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
    <main data-mais-register-replica className="relative min-h-[calc(100dvh-4.25rem)] overflow-x-hidden bg-[#cceefa] p-3 text-[#081333] sm:p-4 lg:p-5 xl:p-6 min-[1800px]:p-8">
      <style>{`
        body:has([data-mais-register-replica]) footer,
        body:has([data-mais-register-replica]) button[aria-label*="AI Tutor"] {
          display: none !important;
        }

        body:has([data-mais-register-replica]) main.flex-1 {
          padding-bottom: 0 !important;
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(255,255,255,0.86),transparent_24%),radial-gradient(circle_at_88%_20%,rgba(255,255,255,0.65),transparent_22%),linear-gradient(180deg,#d9f5ff_0%,#c8ecf9_100%)]" />
      <div className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-[1490px] overflow-hidden rounded-[2rem] border border-white/75 bg-[#f8fdff] shadow-[0_26px_58px_rgba(58,112,151,0.28)] sm:min-h-[calc(100dvh-5.75rem)] lg:min-h-[calc(100dvh-6.5rem)] min-[1800px]:min-h-[calc(100dvh-4rem)]">
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,#eefaff_0%,#f9fdff_28%,#ffffff_28%,#ffffff_100%)]" />
        <NumberBlocks />

        <div className="relative grid min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-6.5rem)] lg:grid-cols-[360px_minmax(0,1fr)] min-[1800px]:min-h-[calc(100dvh-4rem)]">
          <aside className="relative z-10 border-b border-[#d8edf8] px-6 pb-6 pt-8 lg:border-b-0 lg:px-12 lg:pb-28 lg:pt-8 min-[1800px]:pb-40 min-[1800px]:pt-10">
            <svg aria-hidden="true" className="absolute left-[4.2rem] top-40 hidden h-[32rem] w-24 lg:block" viewBox="0 0 96 520" fill="none">
              <path d="M53 4C10 20 15 94 54 104c45 12 41 82-4 95-48 14-43 92 5 104 42 11 42 78 0 96-37 16-33 76 5 96" stroke="#aad4ef" strokeWidth="30" strokeLinecap="round" />
              <path d="M53 4C10 20 15 94 54 104c45 12 41 82-4 95-48 14-43 92 5 104 42 11 42 78 0 96-37 16-33 76 5 96" stroke="white" strokeWidth="5" strokeLinecap="round" strokeDasharray="18 18" />
            </svg>

            <div className="relative mt-7 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-1 lg:gap-8 min-[1800px]:mt-12 min-[1800px]:gap-11">
              {registerSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                const isComplete = index < activeStepIndex && !step.disabled;
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={step.disabled}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => goToStep(step.id)}
                    className={`focus-ring relative flex min-h-[6.5rem] items-center gap-4 rounded-[1.35rem] bg-white px-5 py-4 text-left transition min-[1800px]:min-h-[7.2rem] min-[1800px]:gap-5 ${
                      isActive
                        ? "border-2 border-[#116ee4] shadow-[0_14px_28px_rgba(17,110,228,0.18)]"
                        : "border border-[#e1e9f2] shadow-[0_10px_24px_rgba(35,75,118,0.1)] hover:-translate-y-0.5 hover:border-[#c5d9ef]"
                    } ${step.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span
                      className={`absolute -left-3 -top-5 grid h-11 w-11 place-items-center rounded-full border-[5px] border-white text-lg font-black shadow-[0_6px_14px_rgba(36,87,137,0.18)] ${
                        isActive || isComplete
                          ? "bg-gradient-to-b from-[#2187f3] to-[#0b62cf] text-white"
                          : "bg-[#bff4ee] text-[#138896]"
                      }`}
                    >
                      {isComplete ? "✓" : index + 1}
                    </span>
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ccfff3] to-[#b8eee5] text-[#10959e] shadow-[inset_6px_6px_14px_rgba(255,255,255,0.9),0_8px_18px_rgba(17,149,158,0.15)] min-[1800px]:h-[4.7rem] min-[1800px]:w-[4.7rem]">
                      <StepIcon kind={step.icon} className="h-9 w-9 min-[1800px]:h-10 min-[1800px]:w-10" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black leading-tight text-[#07112f]">{step.title}</span>
                      <span className="mt-2 block text-sm font-semibold leading-5 text-[#33426a]">{step.summary}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="relative z-10 min-h-[38rem] rounded-t-[2rem] bg-white px-6 py-7 shadow-[0_0_38px_rgba(49,91,124,0.12)] sm:px-10 lg:min-h-[calc(100dvh-6.5rem)] lg:rounded-l-[2rem] lg:rounded-r-none lg:rounded-t-none lg:px-12 lg:py-8 min-[1800px]:min-h-[40rem] min-[1800px]:px-14 min-[1800px]:py-8">
            <div className="relative z-10 mx-auto max-w-[960px]">
              <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
                <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#cdeee6] bg-[#e3fbf3] px-4 text-sm font-black text-[#286b67] shadow-[0_6px_14px_rgba(30,112,116,0.08)]">
                  <TopChipIcon kind="flag" />
                  {t(registerCopy.pathReady)}
                </span>
                <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dfe7f0] bg-white px-4 text-sm font-black text-[#26385f] shadow-[0_6px_14px_rgba(26,62,105,0.08)]">
                  <TopChipIcon kind="book" />
                  {displayedPublisherLabel}
                </span>
                <span className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dfe7f0] bg-white px-5 text-sm font-black text-[#102454] shadow-[0_6px_14px_rgba(26,62,105,0.08)]">
                  <TopChipIcon kind="grade" label={selectedGradeChipBadge} />
                  {selectedGradeLabel}
                </span>
              </div>

              <div className="relative mt-7 overflow-hidden lg:mt-8 min-[1800px]:mt-8">
                <section className="transition-all duration-300 ease-out motion-reduce:transition-none" style={carouselCardStyle("account")} aria-labelledby="register-account-type-title" aria-hidden={activeStep !== "account"} inert={activeStep !== "account" ? true : undefined}>
                  <div className="min-h-[29rem] pb-5 lg:min-h-[31.5rem] min-[1800px]:min-h-[34rem] min-[1800px]:pb-6">
                    <h1 id="register-account-type-title" className="max-w-none text-4xl font-black leading-[0.98] tracking-normal text-[#07112f] sm:text-5xl lg:whitespace-nowrap lg:text-[3.35rem] min-[1800px]:text-[3.95rem]">
                      {t(registerCopy.questTitle)}
                    </h1>
                    <p className="mt-4 text-xl font-black leading-tight text-[#3c496b] min-[1800px]:mt-5 min-[1800px]:text-2xl">
                      {t(registerCopy.questSubtitle)}
                    </p>

                    <div className="mt-6 grid gap-5 xl:grid-cols-3 min-[1800px]:mt-7 min-[1800px]:gap-5" role="radiogroup" aria-label={t(registerCopy.accountType)}>
                      {([
                        {
                          role: "student" as const,
                          label: registerCopy.studentAccount,
                          help: {
                            en: "Experience future-facing personalized learning",
                            zh: "體驗面向未來的個人化學習",
                            zhHans: "体验面向未来的个性化学习"
                          }
                        },
                        {
                          role: "teacher" as const,
                          label: registerCopy.teacherAccount,
                          help: {
                            en: "Experience future-facing personalized teaching",
                            zh: "體驗面向未來的個人化教學",
                            zhHans: "体验面向未来的个性化教学"
                          }
                        },
                        {
                          role: "parent" as const,
                          label: registerCopy.parentAccount,
                          help: {
                            en: "Experience future-facing educational innovation",
                            zh: "體驗面向未來的教育創新",
                            zhHans: "体验面向未来的教育创新"
                          }
                        }
                      ]).map((item) => {
                        const active = accountType === item.role;
                        return (
                          <button
                            key={item.role}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => handleAccountTypeChange(item.role)}
                            className={`focus-ring relative min-h-[19.5rem] rounded-[1.7rem] px-5 pb-5 pt-3 text-center transition min-[1800px]:min-h-[21.25rem] min-[1800px]:px-6 min-[1800px]:pb-6 min-[1800px]:pt-3 ${
                              active
                                ? "border-2 border-[#116ee4] bg-[#f7fbff] shadow-[0_16px_28px_rgba(17,110,228,0.16)]"
                                : "border border-[#dfe5ec] bg-white shadow-[0_14px_28px_rgba(34,67,101,0.1)] hover:-translate-y-0.5 hover:border-[#bed4ee]"
                            }`}
                          >
                            {active ? (
                              <span className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#1f83ef] to-[#075dcb] text-3xl font-black text-white shadow-[0_10px_18px_rgba(5,95,208,0.25)]">
                                ✓
                              </span>
                            ) : null}
                            <RoleIllustration role={item.role} />
                            <span className="mt-1 block text-2xl font-black leading-tight text-[#07112f] min-[1800px]:mt-2 min-[1800px]:text-3xl">
                              {t(item.label)}
                            </span>
                            <span className="mx-auto mt-2 block max-w-[15.5rem] text-base font-semibold leading-6 text-[#33426a] min-[1800px]:max-w-[16rem]">
                              {t(item.help)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex justify-center min-[1800px]:mt-7">
                      <button
                        type="button"
                        onClick={goToNextStep}
                        className="focus-ring inline-flex h-16 w-full max-w-[25rem] items-center justify-center gap-12 rounded-[1.05rem] bg-gradient-to-b from-[#1682f2] to-[#075fd4] px-8 text-xl font-black text-white shadow-[0_16px_26px_rgba(5,96,214,0.3),inset_0_1px_0_rgba(255,255,255,0.36)] transition hover:-translate-y-0.5 hover:from-[#1e8efb] hover:to-[#0758c5] min-[1800px]:max-w-[25rem]"
                      >
                        {t({ en: "Continue", zh: "繼續", zhHans: "继续" })}
                        <span aria-hidden="true" className="text-2xl leading-none min-[1800px]:text-3xl">→</span>
                      </button>
                    </div>
                  </div>
                </section>

                <section className="transition-all duration-300 ease-out motion-reduce:transition-none" style={carouselCardStyle("curriculum")} aria-labelledby="register-curriculum-title" aria-hidden={activeStep !== "curriculum"} inert={activeStep !== "curriculum" ? true : undefined}>
                  <div className="min-h-[24rem] rounded-[1.7rem] border border-[#e2eaf4] bg-[#fbfdff] p-6 shadow-[0_14px_28px_rgba(34,67,101,0.08)]">
                    <h2 id="register-curriculum-title" className="text-4xl font-black leading-tight text-[#07112f]">
                      {t(registerCopy.flowTitle)}
                    </h2>

                    <div className="mt-7">
                      <label className="grid gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.16em] text-[#116ee4]">
                          {t(registerCopy.selectedCurriculum)}
                        </span>
                        <span className="relative block">
                          <select
                            value={curriculumProfile.publisher}
                            onChange={(event) => {
                              const nextPublisher = registerCurriculumPublisherOptions.find((publisher) => publisher === event.currentTarget.value);
                              if (nextPublisher) setCurriculumProfile(curriculumProfileForPublisher(nextPublisher));
                            }}
                            className="focus-ring h-16 w-full appearance-none rounded-[1.15rem] border border-[#d9e5f2] bg-white px-5 py-3 pr-14 text-base font-black text-[#07112f] shadow-[0_10px_20px_rgba(18,58,109,0.08)] outline-none transition hover:border-[#b9d5f4]"
                          >
                            {registerCurriculumPublisherGroups.map((group) => (
                              <optgroup key={group.region} label={t(registerRegionLabelOverrides[group.region] ?? regionLabels[group.region])}>
                                {group.publishers.map((publisher) => (
                                  <option key={publisher} value={publisher}>
                                    {curriculumOptionLabel(publisher)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-[#33426a]"
                          >
                            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none">
                              <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </span>
                      </label>
                    </div>

                    {renderStepActions({ nextLabel: registerCopy.stepperGrade })}
                  </div>
                </section>

                <section className="transition-all duration-300 ease-out motion-reduce:transition-none" style={carouselCardStyle("grade")} aria-labelledby="register-grade-title" aria-hidden={activeStep !== "grade"} inert={activeStep !== "grade" ? true : undefined}>
                  <div className="min-h-[37rem] rounded-[1.7rem] border border-[#e2eaf4] bg-[#fbfdff] p-6 shadow-[0_14px_28px_rgba(34,67,101,0.08)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 id="register-grade-title" className="text-4xl font-black leading-tight text-[#07112f]">
                          {t({ en: "Choose your grade", zh: "選擇你的年級", zhHans: "选择你的年级" })}
                        </h2>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-[#dfe7f0] bg-white px-4 py-2 text-sm font-black text-[#102454] shadow-[0_6px_14px_rgba(26,62,105,0.08)]">
                        {selectedGradeLabel}
                      </span>
                    </div>

                    <div className="mt-7">
                      <GradeSelector
                        compact
                        compactLayout="grouped"
                        curriculumTrack={curriculumTrack}
                        value={registrationGrade}
                        onChange={setRegistrationGrade}
                        respectCurrentStudentProfile={false}
                        useUnitedStatesSchoolBands
                      />
                    </div>

                    {renderStepActions({ nextLabel: registerCopy.stepperDetails })}
                  </div>
                </section>

                <section className="transition-all duration-300 ease-out motion-reduce:transition-none" style={carouselCardStyle("details")} aria-label={t(registerCopy.stepperDetails)} aria-hidden={activeStep !== "details"} inert={activeStep !== "details" ? true : undefined}>
                  <div className="min-h-[37rem] rounded-[1.7rem] border border-[#e2eaf4] bg-[#fbfdff] p-6 shadow-[0_14px_28px_rgba(34,67,101,0.08)]">
                    <p className="max-w-2xl text-lg font-semibold leading-8 text-[#44516f]">
                      {t(detailsDescription)}
                    </p>

                    <div className="mt-6 grid gap-5">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-[#33426a]">{t(profileNameLabel)}</span>
                        <input
                          value={studentName}
                          onChange={(event) => setStudentName(event.target.value)}
                          autoComplete="name"
                          required
                          className="focus-ring h-[3.25rem] rounded-2xl border border-[#d9e5f2] bg-white px-4 py-3 font-semibold text-[#07112f] shadow-sm outline-none transition placeholder:text-slate-400"
                        />
                      </label>

                      <div className={`grid gap-5 ${isParentRegistration ? "" : "sm:grid-cols-2"}`}>
                        {!isParentRegistration ? (
                          <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#33426a]">{t(usernameLabel)}</span>
                            <input
                              value={username}
                              onChange={(event) => setUsername(event.target.value)}
                              autoComplete="username"
                              required
                              className="focus-ring h-[3.25rem] rounded-2xl border border-[#d9e5f2] bg-white px-4 py-3 font-semibold text-[#07112f] shadow-sm outline-none transition placeholder:text-slate-400"
                            />
                          </label>
                        ) : null}

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-[#33426a]">{t(registerCopy.email)}</span>
                          <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            autoComplete="email"
                            required
                            className="focus-ring h-[3.25rem] rounded-2xl border border-[#d9e5f2] bg-white px-4 py-3 font-semibold text-[#07112f] shadow-sm outline-none transition placeholder:text-slate-400"
                          />
                        </label>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <label htmlFor="register-password" className="text-sm font-bold text-[#33426a]">{t(registerCopy.password)}</label>
                          <PasswordInputWithReveal
                            id="register-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                            minLength={5}
                            showLabel={t({ en: "Show password", zh: "顯示密碼", zhHans: "显示密码" })}
                            hideLabel={t({ en: "Hide password", zh: "隱藏密碼", zhHans: "隐藏密码" })}
                            className="focus-ring h-[3.25rem] rounded-2xl border border-[#d9e5f2] bg-white px-4 py-3 font-semibold text-[#07112f] shadow-sm outline-none transition placeholder:text-slate-400"
                          />
                        </div>

                        <div className="grid gap-2">
                          <label htmlFor="register-confirm-password" className="text-sm font-bold text-[#33426a]">{t(registerCopy.confirmPassword)}</label>
                          <PasswordInputWithReveal
                            id="register-confirm-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                            minLength={5}
                            showLabel={t({ en: "Show confirm password", zh: "顯示確認密碼", zhHans: "显示确认密码" })}
                            hideLabel={t({ en: "Hide confirm password", zh: "隱藏確認密碼", zhHans: "隐藏确认密码" })}
                            className="focus-ring h-[3.25rem] rounded-2xl border border-[#d9e5f2] bg-white px-4 py-3 font-semibold text-[#07112f] shadow-sm outline-none transition placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {renderStepActions({ submit: true })}
                  </div>
                </section>
              </div>

              {message ? (
                <p role="status" className="relative z-20 mt-5 rounded-2xl border border-[#b8d7f7] bg-[#eef7ff] px-4 py-3 text-sm font-semibold text-[#17467e]">
                  {message}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
