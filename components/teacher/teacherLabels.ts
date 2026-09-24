import type {
  AssessmentSourceType,
  AssessmentStatus,
  AssessmentSubmissionStatus,
  AssessmentType,
  AssignmentContentType,
  AssignmentStatus,
  LocalizedText,
  SubmissionStatus,
  TeacherMessageStatus
} from "@/types";

export const assignmentContentTypeLabels: Record<AssignmentContentType, LocalizedText> = {
  lesson: { en: "Lesson", zh: "課堂", zhHans: "课堂" },
  practice: { en: "Practice", zh: "練習", zhHans: "练习" },
  visualization: { en: "Visualization", zh: "視覺化", zhHans: "可视化" },
  resource: { en: "Resource", zh: "資源", zhHans: "资源" },
  assessment: { en: "Assessment", zh: "測驗", zhHans: "测验" }
};

export const assignmentStatusLabels: Record<AssignmentStatus, LocalizedText> = {
  draft: { en: "Draft", zh: "草稿", zhHans: "草稿" },
  scheduled: { en: "Scheduled", zh: "已排程", zhHans: "已排程" },
  active: { en: "Active", zh: "進行中", zhHans: "进行中" },
  closed: { en: "Closed", zh: "已關閉", zhHans: "已关闭" }
};

export const submissionStatusLabels: Record<SubmissionStatus, LocalizedText> = {
  "not-started": { en: "Not started", zh: "未開始", zhHans: "未开始" },
  "in-progress": { en: "In progress", zh: "進行中", zhHans: "进行中" },
  submitted: { en: "Submitted", zh: "已提交", zhHans: "已提交" },
  graded: { en: "Graded", zh: "已批改", zhHans: "已批改" },
  late: { en: "Late", zh: "遲交", zhHans: "迟交" },
  "correction-required": { en: "Correction required", zh: "需訂正", zhHans: "需订正" },
  "correction-submitted": { en: "Correction submitted", zh: "已交訂正", zhHans: "已交订正" },
  resolved: { en: "Resolved", zh: "已解決", zhHans: "已解决" }
};

export const teacherMessageStatusLabels: Record<TeacherMessageStatus, LocalizedText> = {
  unread: { en: "Unread", zh: "未讀", zhHans: "未读" },
  open: { en: "Open", zh: "待跟進", zhHans: "待跟进" },
  resolved: { en: "Resolved", zh: "已解決", zhHans: "已解决" }
};

export const assessmentTypeLabels: Record<AssessmentType, LocalizedText> = {
  quiz: { en: "Quiz", zh: "小測", zhHans: "小测" },
  test: { en: "Test", zh: "測驗", zhHans: "测验" },
  "mock-exam": { en: "Mock exam", zh: "模擬考試", zhHans: "模拟考试" },
  exam: { en: "Exam", zh: "考試", zhHans: "考试" }
};

export const assessmentSourceTypeLabels: Record<AssessmentSourceType, LocalizedText> = {
  "question-bank": { en: "Question bank", zh: "題庫", zhHans: "题库" },
  manual: { en: "Manual entry", zh: "手動輸入", zhHans: "手动输入" },
  resource: { en: "Uploaded resource", zh: "已上載資源", zhHans: "已上载资源" },
  "mistake-generated": { en: "Mistake generated", zh: "錯題生成", zhHans: "错题生成" },
  mixed: { en: "Free paper", zh: "自由組卷", zhHans: "自由组卷" }
};

export const assessmentStatusLabels: Record<AssessmentStatus, LocalizedText> = {
  draft: { en: "Draft", zh: "草稿", zhHans: "草稿" },
  scheduled: { en: "Scheduled", zh: "已排程", zhHans: "已排程" },
  open: { en: "Open", zh: "開放中", zhHans: "开放中" },
  closed: { en: "Closed", zh: "已關閉", zhHans: "已关闭" }
};

export const assessmentSubmissionStatusLabels: Record<AssessmentSubmissionStatus, LocalizedText> = {
  "not-started": { en: "Not started", zh: "未開始", zhHans: "未开始" },
  "in-progress": { en: "In progress", zh: "進行中", zhHans: "进行中" },
  submitted: { en: "Submitted", zh: "已提交", zhHans: "已提交" },
  graded: { en: "Graded", zh: "已批改", zhHans: "已批改" },
  late: { en: "Late", zh: "遲交", zhHans: "迟交" }
};
