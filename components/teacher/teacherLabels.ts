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
  lesson: { en: "Lesson", zh: "課堂" },
  practice: { en: "Practice", zh: "練習" },
  visualization: { en: "Visualization", zh: "視覺化" },
  resource: { en: "Resource", zh: "資源" },
  assessment: { en: "Assessment", zh: "測驗" }
};

export const assignmentStatusLabels: Record<AssignmentStatus, LocalizedText> = {
  draft: { en: "Draft", zh: "草稿" },
  scheduled: { en: "Scheduled", zh: "已排程" },
  active: { en: "Active", zh: "進行中" },
  closed: { en: "Closed", zh: "已關閉" }
};

export const submissionStatusLabels: Record<SubmissionStatus, LocalizedText> = {
  "not-started": { en: "Not started", zh: "未開始" },
  "in-progress": { en: "In progress", zh: "進行中" },
  submitted: { en: "Submitted", zh: "已提交" },
  graded: { en: "Graded", zh: "已批改" },
  late: { en: "Late", zh: "遲交" },
  "correction-required": { en: "Correction required", zh: "需訂正" },
  "correction-submitted": { en: "Correction submitted", zh: "已交訂正" },
  resolved: { en: "Resolved", zh: "已解決" }
};

export const teacherMessageStatusLabels: Record<TeacherMessageStatus, LocalizedText> = {
  unread: { en: "Unread", zh: "未讀" },
  open: { en: "Open", zh: "待跟進" },
  resolved: { en: "Resolved", zh: "已解決" }
};

export const assessmentTypeLabels: Record<AssessmentType, LocalizedText> = {
  quiz: { en: "Quiz", zh: "小測" },
  test: { en: "Test", zh: "測驗" },
  "mock-exam": { en: "Mock exam", zh: "模擬考試" },
  exam: { en: "Exam", zh: "考試" }
};

export const assessmentSourceTypeLabels: Record<AssessmentSourceType, LocalizedText> = {
  "question-bank": { en: "Question bank", zh: "題庫" },
  manual: { en: "Manual entry", zh: "手動輸入" },
  resource: { en: "Uploaded resource", zh: "已上載資源" },
  "mistake-generated": { en: "Mistake generated", zh: "錯題生成" },
  mixed: { en: "Free paper", zh: "自由組卷" }
};

export const assessmentStatusLabels: Record<AssessmentStatus, LocalizedText> = {
  draft: { en: "Draft", zh: "草稿" },
  scheduled: { en: "Scheduled", zh: "已排程" },
  open: { en: "Open", zh: "開放中" },
  closed: { en: "Closed", zh: "已關閉" }
};

export const assessmentSubmissionStatusLabels: Record<AssessmentSubmissionStatus, LocalizedText> = {
  "not-started": { en: "Not started", zh: "未開始" },
  "in-progress": { en: "In progress", zh: "進行中" },
  submitted: { en: "Submitted", zh: "已提交" },
  graded: { en: "Graded", zh: "已批改" },
  late: { en: "Late", zh: "遲交" }
};
