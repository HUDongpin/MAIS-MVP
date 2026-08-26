"use client";

import {
  ChangeEvent,
  createContext,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname } from "next/navigation";
import { NovaLensGlobalOverlay } from "@/components/ai/NovaLensGlobalOverlay";
import { cleanVoiceTranscript, voiceTranscriptMessageInput } from "@/components/ai/tutorVoiceInput";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { FunctionGraphExplorer } from "@/components/visualizations/FunctionGraphExplorer";
import {
  normalizeAITutorVisualization,
  type AITutorVisualization
} from "@/lib/aiTutorVisualization";
import { appShellSessionSyncStorageKey } from "@/lib/appShellBootstrap";
import { isImmersiveStudentPracticeGamePath } from "@/lib/gameBasedLearning";
import { isChineseLanguage, simplifyChineseText, textForLanguage, traditionalToSimplifiedMap } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  ClassAiTutorPolicy,
  CurriculumTrack,
  GradeId,
  HongKongDseMathDifficultyBand,
  HongKongDseMathLanguageVariant,
  HongKongDseMathPaperComponent,
  HongKongDseMathRagIntent,
  HongKongMathEdBDifficultyBand,
  HongKongMathEdBDocumentPurpose,
  HongKongMathEdBRagIntent,
  HongKongMathEdBStage,
  Language,
  MainlandPepDifficultyBand,
  MainlandPepRagIntent,
  NovaLensRunStatus,
  StudentSession
} from "@/types";

export type TutorDataScope = "student-dashboard" | "teacher-dashboard" | "teacher-student-profile" | "adaptive-engine";
export type TutorSelectionHelpType = "explain" | "simple-example" | "why-step" | "prerequisite-gap" | "custom";

export type TutorSelectionContext = {
  selectedText: string;
  helpType: TutorSelectionHelpType;
  lessonSlug?: string;
  topicId?: string;
  questionId?: string;
  blockId?: string;
  blockType?: string;
  surroundingText?: string;
};

type TutorEvidenceQuery = {
  conceptIds?: string[];
  chapter?: string;
  grade?: GradeId;
  topicId?: string;
  stage?: HongKongMathEdBStage;
  documentPurpose?: HongKongMathEdBDocumentPurpose;
  paperComponent?: HongKongDseMathPaperComponent;
  language?: HongKongDseMathLanguageVariant;
  intent: MainlandPepRagIntent | HongKongMathEdBRagIntent | HongKongDseMathRagIntent;
  difficultyBand?: MainlandPepDifficultyBand | HongKongMathEdBDifficultyBand | HongKongDseMathDifficultyBand;
  limit?: number;
};

export type TutorContext = {
  mode: "concept" | "question" | "figure" | "mistake" | "general";
  title: string;
  details?: string;
  curriculumTrack?: CurriculumTrack;
  topicId?: string;
  skillId?: string;
  questionId?: string;
  lessonSlug?: string;
  evidenceQuery?: TutorEvidenceQuery;
  dataScopes?: TutorDataScope[];
  targetStudentId?: string;
  selection?: TutorSelectionContext;
};

type TutorMessage = {
  id?: string;
  role: "tutor" | "student";
  content: string;
  visualization?: AITutorVisualization;
  status?: "thinking" | "typing";
};

type TutorApiResponse = {
  code?: string;
  reply?: string;
  visualization?: AITutorVisualization;
  error?: string;
  mode?: string;
};

type TutorTransportResult = {
  response: {
    ok: boolean;
    status: number;
  };
  data: TutorApiResponse;
};

type TutorStreamCallbacks = {
  onChunk?: (delta: string) => void;
};

type TutorSetupStatus = {
  state: "checking" | "configured" | "local-helper";
  model?: string;
  voice?: {
    configured: boolean;
    model?: string;
    provider?: string;
  };
  speech?: {
    configured: boolean;
    model?: string;
    provider?: string;
  };
};

type TutorSpeechApiResponse = {
  error?: string;
  transcript?: string;
};

type TutorAttachment = {
  id: string;
  name: string;
  size: number;
  file: File;
};

type SendTutorMessageOptions = {
  rawInput: string;
  contextOverride?: TutorContext;
  attachmentsOverride?: TutorAttachment[];
  clearComposer?: boolean;
};

type TutorVoiceStatus = "idle" | "listening" | "processing" | "error";
type TutorVoicePlaybackStatus = "idle" | "loading" | "playing" | "error" | "auth-required";
type TutorVoiceInputIssue = "audio-capture" | "auth-required" | "network" | "no-speech" | "not-allowed" | "not-configured" | "unsupported" | "unknown";

type TutorAudioContextWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

type TutorQwenSpeechRecorder = {
  chunks: Float32Array[];
  context: AudioContext;
  inputSampleRate: number;
  processor: ScriptProcessorNode;
  silence: GainNode;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
};

type TutorSpeechRecognitionAlternative = {
  transcript: string;
};

type TutorSpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: TutorSpeechRecognitionAlternative | undefined;
};

type TutorSpeechRecognitionResultList = {
  length: number;
  [index: number]: TutorSpeechRecognitionResult | undefined;
};

type TutorSpeechRecognitionEvent = Event & {
  results: TutorSpeechRecognitionResultList;
};

type TutorSpeechRecognitionErrorEvent = Event & {
  error?: string;
};

type TutorNativeSpeechRecognition = {
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: TutorSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: TutorSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type TutorNativeSpeechRecognitionConstructor = new () => TutorNativeSpeechRecognition;

type TutorSpeechRecognitionWindow = Window & {
  SpeechRecognition?: TutorNativeSpeechRecognitionConstructor;
  webkitSpeechRecognition?: TutorNativeSpeechRecognitionConstructor;
};

export type AITutorOpenOptions = {
  initialInput?: string;
  initialReply?: string;
  autoSend?: boolean;
  novaLensRunId?: string;
  novaLensStatus?: NovaLensRunStatus;
};

type AITutorContextValue = {
  openTutor: (context?: TutorContext, options?: AITutorOpenOptions) => void;
};

type TutorDraft = {
  userId: string;
  role: StudentSession["role"] | "guest";
  open: boolean;
  context?: TutorContext;
  input: string;
  messages: TutorMessage[];
};

const AITutorContext = createContext<AITutorContextValue | null>(null);

type TutorDraftOwner = Pick<TutorDraft, "userId" | "role">;

export type TutorSessionIdentity = {
  userId: string;
  role: StudentSession["role"];
} | null;

type TutorSessionSnapshot = {
  controller: AbortController;
  epoch: number;
  identity: TutorSessionIdentity;
};

type TutorPanelSize = {
  width: number;
  height: number;
};

type TutorPanelResizeSnapshot = TutorPanelSize & {
  pointerId: number;
  startX: number;
  startY: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
};

const legacyTutorDraftStorageKey = "mais-ai-tutor-draft-v1";
const tutorDraftStorageKeyPrefix = "mais-ai-tutor-draft-v2";
const tutorDraftMaxAgeMs = 12 * 60 * 60 * 1000;
const tutorPanelDesktopMediaQuery = "(min-width: 640px)";
const tutorPanelViewportInsetPx = 20;
const tutorPanelMinWidthPx = 360;
const tutorPanelMinHeightPx = 420;
const tutorContextModes = new Set<TutorContext["mode"]>(["concept", "question", "figure", "mistake", "general"]);
const tutorDraftRoles = new Set<TutorDraft["role"]>(["student", "teacher", "parent", "admin", "guest"]);
const tutorCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const unitedStatesMathTutorTracks = new Set<CurriculumTrack>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const tutorGradeValues = new Set<GradeId>(["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
const tutorDataScopeValues: TutorDataScope[] = ["student-dashboard", "teacher-dashboard", "teacher-student-profile", "adaptive-engine"];
const tutorDataScopeSet = new Set<TutorDataScope>(tutorDataScopeValues);
const tutorSelectionHelpTypes = new Set<TutorSelectionHelpType>(["explain", "simple-example", "why-step", "prerequisite-gap", "custom"]);
const tutorEvidenceStages = new Set<HongKongMathEdBStage>([
  "whole-curriculum",
  "primary",
  "junior-secondary",
  "senior-secondary-compulsory",
  "senior-secondary-m1",
  "senior-secondary-m2",
  "senior-secondary-support",
  "implementation"
]);
const tutorEvidenceDocumentPurposes = new Set<HongKongMathEdBDocumentPurpose>([
  "curriculum-guide",
  "learning-content-supplement",
  "curriculum-interpretation",
  "revision-comparison",
  "curriculum-assessment-guide",
  "implementation-timeline",
  "learning-diversity-support"
]);
const tutorEvidencePaperComponents = new Set<HongKongDseMathPaperComponent>(["paper-1", "paper-2", "answer-file"]);
const tutorEvidenceLanguageVariants = new Set<HongKongDseMathLanguageVariant>(["en", "zh"]);
const tutorEvidenceIntents = new Set<TutorEvidenceQuery["intent"]>([
  "tutor-explain",
  "generate-question",
  "generate-lesson",
  "exam-practice",
  "diagnose-mistake",
  "assessment-design"
]);
const tutorEvidenceDifficultyBands = new Set<NonNullable<TutorEvidenceQuery["difficultyBand"]>>(["foundation", "core", "exam", "challenge"]);
const simplifiedChineseSignalCharacters = new Set(
  Object.entries(traditionalToSimplifiedMap)
    .filter(([traditional, simplified]) => traditional !== simplified)
    .map(([, simplified]) => simplified)
);

const latestTutorDrafts = new Map<string, TutorDraft>();

function tutorSessionIdentityForUser(
  user: Pick<StudentSession, "id" | "role"> | null
): TutorSessionIdentity {
  return user ? { userId: user.id, role: user.role } : null;
}

function sameTutorSessionIdentity(
  left: TutorSessionIdentity,
  right: TutorSessionIdentity
) {
  if (!left || !right) return left === right;
  return left.userId === right.userId && left.role === right.role;
}

export function tutorSessionRequestMayContinue({
  aborted,
  currentEpoch,
  currentIdentity,
  mounted,
  snapshotEpoch,
  snapshotIdentity
}: {
  aborted: boolean;
  currentEpoch: number;
  currentIdentity: TutorSessionIdentity;
  mounted: boolean;
  snapshotEpoch: number;
  snapshotIdentity: TutorSessionIdentity;
}) {
  return Boolean(
    mounted &&
      !aborted &&
      snapshotEpoch === currentEpoch &&
      sameTutorSessionIdentity(snapshotIdentity, currentIdentity)
  );
}

function sessionSignalMatchesTutorIdentity(
  value: unknown,
  identity: TutorSessionIdentity
) {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return false;
    }
  }
  if (!parsed || typeof parsed !== "object") return false;

  const signal = parsed as { userId?: unknown; userRole?: unknown };
  if (signal.userId === null && signal.userRole === null) return identity === null;
  return Boolean(
    identity &&
      signal.userId === identity.userId &&
      signal.userRole === identity.role
  );
}

function tutorSessionAbortError() {
  return new DOMException("AI Tutor session changed.", "AbortError");
}

const tutorNames = {
  en: "Professor Nova",
  zh: "Nova 導師",
  zhHans: "Nova 导师"
} as const;

const tutorUiCopy = {
  ask: {
    en: "Ask Nova Tutor",
    zh: "詢問 Nova 導師",
    zhHans: "询问 Nova 导师"
  },
  button: {
    en: "Nova Tutor",
    zh: "Nova 導師",
    zhHans: "Nova 导师"
  },
  close: {
    en: "Close Nova Tutor",
    zh: "關閉 Nova 導師",
    zhHans: "关闭 Nova 导师"
  },
  resize: {
    en: "Resize Nova Tutor window",
    zh: "調整 Nova 導師視窗大小",
    zhHans: "调整 Nova 导师窗口大小"
  },
  liveConfigured: {
    en: "Live AI configured",
    zh: "即時 AI 已設定",
    zhHans: "即时 AI 已设置"
  },
  setupChecking: {
    en: "Checking AI Tutor setup...",
    zh: "正在檢查 AI Tutor 設定...",
    zhHans: "正在检查 AI Tutor 设置..."
  },
  thinking: {
    en: "Nova Tutor is thinking...",
    zh: "Nova 導師正在思考...",
    zhHans: "Nova 导师正在思考..."
  }
} as const;

const tutorSignatures = {
  en: "Professor Nova ✦",
  zh: "Nova 導師 ✦",
  zhHans: "Nova 导师 ✦"
} as const;

const tutorVoiceCopy = {
  addAttachments: {
    en: "Add photos and files",
    zh: "加入相片和檔案",
    zhHans: "添加照片和文件"
  },
  attachmentMenuItem: {
    en: "Add photos & files",
    zh: "加入相片和檔案",
    zhHans: "添加照片和文件"
  },
  replyVoice: {
    en: "Reply voice",
    zh: "朗讀回覆",
    zhHans: "朗读回复"
  },
  replyVoiceDescription: {
    en: "Read Nova replies aloud",
    zh: "朗讀 Nova 的回覆",
    zhHans: "朗读 Nova 的回复"
  },
  replyVoiceDisabledNote: {
    en: "Reply voice needs Qwen voice setup before learners can turn it on.",
    zh: "需要先完成 Qwen 語音設定，學生才可開啟朗讀回覆。",
    zhHans: "需要先完成 Qwen 语音设置，学生才可开启朗读回复。"
  },
  replyVoiceSignInNote: {
    en: "Sign in to hear Nova replies aloud.",
    zh: "登入後才可朗讀 Nova 的回覆。",
    zhHans: "登录后才可朗读 Nova 的回复。"
  },
  replyVoiceOff: {
    en: "Default is off. Turn on when you want spoken replies.",
    zh: "預設關閉。需要聽語音回覆時再開啟。",
    zhHans: "默认关闭。需要听语音回复时再开启。"
  },
  replyVoiceOn: {
    en: "New Nova replies will be read aloud. Turning this on can also read the latest reply.",
    zh: "Nova 之後的新回覆會朗讀；開啟時也可朗讀最近一則回覆。",
    zhHans: "Nova 之后的新回复会朗读；开启时也可朗读最近一则回复。"
  },
  replyVoiceReplay: {
    en: "Read latest reply",
    zh: "朗讀最近回覆",
    zhHans: "朗读最近回复"
  },
  replyVoiceLoading: {
    en: "Preparing reply voice...",
    zh: "正在準備朗讀...",
    zhHans: "正在准备朗读..."
  },
  replyVoicePlaying: {
    en: "Playing reply voice...",
    zh: "正在朗讀回覆...",
    zhHans: "正在朗读回复..."
  },
  replyVoiceError: {
    en: "I could not play the reply voice. Try again, or check device volume and silent mode.",
    zh: "暫時未能播放朗讀。請再試一次，或檢查裝置音量和靜音模式。",
    zhHans: "暂时未能播放朗读。请再试一次，或检查设备音量和静音模式。"
  },
  replyVoiceAuthRequired: {
    en: "Please sign in before using reply voice.",
    zh: "請先登入，才可使用朗讀回覆。",
    zhHans: "请先登录，才可使用朗读回复。"
  },
  voiceSettings: {
    en: "Voice settings",
    zh: "語音設定",
    zhHans: "语音设置"
  },
  voiceSettingsClose: {
    en: "Close voice settings",
    zh: "關閉語音設定",
    zhHans: "关闭语音设置"
  },
  voiceSettingsOpen: {
    en: "Open voice settings",
    zh: "開啟語音設定",
    zhHans: "打开语音设置"
  },
  voiceInputUnavailable: {
    en: "Voice input is unavailable on this browser.",
    zh: "此瀏覽器暫時無法使用語音輸入。",
    zhHans: "此浏览器暂时无法使用语音输入。"
  },
  voiceInputAuthRequired: {
    en: "Please sign in before using voice input.",
    zh: "請先登入，才可使用語音輸入。",
    zhHans: "请先登录，才可使用语音输入。"
  },
  voiceInputBlocked: {
    en: "Microphone access is blocked. Allow microphone permission in the browser, then tap mic again.",
    zh: "咪高峰權限被封鎖。請在瀏覽器允許咪高峰權限，然後再按一次。",
    zhHans: "麦克风权限被阻止。请在浏览器允许麦克风权限，然后再按一次。"
  },
  voiceInputNotConfigured: {
    en: "Voice recognition is not configured, and this browser has no built-in speech recognition.",
    zh: "尚未完成語音識別設定，而此瀏覽器也沒有內建語音識別。",
    zhHans: "尚未完成语音识别设置，而此浏览器也没有内置语音识别。"
  },
  voiceInputCheckMic: {
    en: "I could not access the microphone. Check the device mic and browser permission.",
    zh: "暫時無法使用咪高峰。請檢查裝置咪高峰和瀏覽器權限。",
    zhHans: "暂时无法使用麦克风。请检查设备麦克风和浏览器权限。"
  },
  voiceInputNetwork: {
    en: "Voice recognition could not connect. Try again, or type your question.",
    zh: "語音識別暫時連接不到。請再試一次，或直接輸入問題。",
    zhHans: "语音识别暂时连接不到。请再试一次，或直接输入问题。"
  },
  voiceRetry: {
    en: "Tap mic to try again, or type your question.",
    zh: "再按咪高峰重試，或直接輸入問題。",
    zhHans: "再按麦克风重试，或直接输入问题。"
  },
  voiceListening: {
    en: "Listening... tap mic to stop",
    zh: "正在聆聽...再按咪高峰停止",
    zhHans: "正在聆听...再按麦克风停止"
  },
  voiceProcessing: {
    en: "Turning speech into text...",
    zh: "正在轉成文字...",
    zhHans: "正在转成文字..."
  },
  voiceReady: {
    en: "Tap mic to speak",
    zh: "按咪高峰說話",
    zhHans: "按麦克风说话"
  },
  voiceStart: {
    en: "Start voice input",
    zh: "開始語音輸入",
    zhHans: "开始语音输入"
  },
  voiceStop: {
    en: "Stop voice input",
    zh: "停止語音輸入",
    zhHans: "停止语音输入"
  },
  voiceTryAgain: {
    en: "I did not catch that. Speak closer to the mic, then tap mic to try again.",
    zh: "我未聽清楚。請靠近咪高峰，再按一次重試。",
    zhHans: "我没听清楚。请靠近麦克风，再按一次重试。"
  }
} as const;

const tutorQuickChoiceCopy = {
  concept: {
    label: {
      en: "Concept explanation",
      zh: "概念解釋",
      zhHans: "概念解释"
    },
    prompt: {
      en: "I need a concept explanation.",
      zh: "我想先要概念解釋。",
      zhHans: "我想先要概念解释。"
    }
  },
  step: {
    label: {
      en: "Step-by-step hint",
      zh: "逐步提示",
      zhHans: "逐步提示"
    },
    prompt: {
      en: "I need a step-by-step hint.",
      zh: "我想先要逐步提示。",
      zhHans: "我想先要逐步提示。"
    }
  },
  answer: {
    label: {
      en: "Answer check",
      zh: "答案檢查",
      zhHans: "答案检查"
    },
    prompt: {
      en: "I need an answer check.",
      zh: "我想先要答案檢查。",
      zhHans: "我想先要答案检查。"
    }
  },
  revision: {
    label: {
      en: "Revision planning",
      zh: "複習計劃",
      zhHans: "复习计划"
    },
    prompt: {
      en: "I need revision planning.",
      zh: "我想先要複習計劃。",
      zhHans: "我想先要复习计划。"
    }
  },
  encouragement: {
    label: {
      en: "Encouragement",
      zh: "鼓勵支持",
      zhHans: "鼓励支持"
    },
    prompt: {
      en: "I need encouragement.",
      zh: "我想先要鼓勵支持。",
      zhHans: "我想先要鼓励支持。"
    }
  }
} as const;

type TutorQuickChoiceId = keyof typeof tutorQuickChoiceCopy;

type TutorQuickChoice = {
  id: TutorQuickChoiceId;
  label: string;
  prompt: string;
};

function MicrophoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
    </svg>
  );
}

function PaperclipIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.7-9.7a4 4 0 0 1 5.7 5.7l-9.7 9.7a2 2 0 0 1-2.8-2.8l8.9-8.9" />
    </svg>
  );
}

function VoiceSettingsIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <circle cx="22" cy="22" r="20.35" fill="#1c2635" stroke="#22d3ee" strokeWidth="2.9" />
      <circle cx="22" cy="22" r="18.25" fill="none" stroke="#67e8f9" strokeOpacity="0.32" strokeWidth="0.75" />
      <path
        d="M10.55 18.6h5.2l7.15-5.45v18l-7.15-5.45h-5.2Z"
        fill="none"
        stroke="#f8fafc"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.45"
      />
      <path d="M27.85 19.2c1.25 1.75 1.25 4.85 0 6.6" stroke="#22d3ee" strokeLinecap="round" strokeWidth="2.35" />
      <path d="M31.65 16.55c2.25 3.25 2.25 8.8 0 12.05" stroke="#22d3ee" strokeLinecap="round" strokeWidth="2.35" />
    </svg>
  );
}

function ResizeCornerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 19 19 5" />
      <path d="M5 19h9" />
      <path d="M5 19v-9" />
      <path d="M10 14h4v-4" />
    </svg>
  );
}

function VoiceLevelBars() {
  return (
    <span aria-hidden="true" className="inline-flex h-5 items-center gap-0.5 text-cyan-500 dark:text-cyan-200">
      {[8, 14, 20, 12, 17].map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-1 rounded-full bg-current animate-pulse motion-reduce:animate-none"
          style={{
            height,
            animationDelay: `${index * 120}ms`
          }}
        />
      ))}
    </span>
  );
}

function clampTutorPanelNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function canResizeTutorPanel() {
  return typeof window !== "undefined" && window.matchMedia(tutorPanelDesktopMediaQuery).matches;
}

function getTutorPanelResizeConstraints() {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const maxWidth = Math.max(280, window.innerWidth - tutorPanelViewportInsetPx * 2);
  const maxHeight = Math.max(320, viewportHeight - tutorPanelViewportInsetPx * 2);

  return {
    minWidth: Math.min(tutorPanelMinWidthPx, maxWidth),
    minHeight: Math.min(tutorPanelMinHeightPx, maxHeight),
    maxWidth,
    maxHeight
  };
}

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tutorMessage(role: TutorMessage["role"], content: string, status?: TutorMessage["status"]): TutorMessage {
  return {
    id: createMessageId(role),
    role,
    content,
    ...(status ? { status } : {})
  };
}

function NovaMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative isolate inline-grid shrink-0 place-items-center rounded-full border border-cyan-100/60 bg-slate-950 text-cyan-50 shadow-[0_0_24px_rgba(103,232,249,0.42)]",
        compact ? "h-8 w-8" : "h-10 w-10"
      )}
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_120deg,rgba(34,211,238,0.92),rgba(165,180,252,0.3),rgba(232,121,249,0.9),rgba(34,211,238,0.92))] opacity-90 blur-[1px] animate-[spin_7s_linear_infinite]" />
      <span className="absolute inset-[3px] -z-10 rounded-full bg-[radial-gradient(circle_at_28%_24%,rgba(207,250,254,0.8),transparent_24%),linear-gradient(145deg,rgba(8,13,35,0.98),rgba(46,16,101,0.9))]" />
      <span className={cn("font-black leading-none text-cyan-50 drop-shadow-[0_0_8px_rgba(207,250,254,0.95)]", compact ? "text-base" : "text-lg")}>
        ✦
      </span>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-fuchsia-200 shadow-[0_0_12px_rgba(240,171,252,0.95)]" />
    </span>
  );
}

function ThinkingNovaMark() {
  return (
    <span
      aria-hidden="true"
      className="relative isolate grid h-12 w-12 shrink-0 place-items-center rounded-full"
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.46),transparent_64%)] blur-md animate-pulse motion-reduce:animate-none" />
      <span className="absolute inset-[2px] rounded-full bg-[conic-gradient(from_90deg,rgba(103,232,249,0.98),rgba(129,140,248,0.24),rgba(232,121,249,0.95),rgba(34,211,238,0.98))] shadow-[0_0_26px_rgba(34,211,238,0.42)] animate-[spin_3.6s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute inset-[6px] rounded-full bg-slate-950 shadow-[inset_0_0_18px_rgba(103,232,249,0.28)]" />
      <span className="absolute inset-[8px] rounded-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.86),transparent_15%),radial-gradient(circle_at_72%_74%,rgba(34,211,238,0.68),transparent_34%),linear-gradient(145deg,rgba(30,27,75,0.98),rgba(8,47,73,0.96),rgba(88,28,135,0.94))]" />
      <span className="absolute inset-[9px] rounded-full border border-cyan-100/50 border-b-fuchsia-200/90 animate-[spin_2.8s_linear_infinite_reverse] motion-reduce:animate-none" />
      <span className="absolute inset-[13px] rounded-full border border-cyan-200/25 border-l-white/70 border-r-fuchsia-200/70 animate-[spin_4.5s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-fuchsia-200 shadow-[0_0_18px_rgba(240,171,252,0.96)]">
        <span className="h-1.5 w-1.5 rounded-full bg-white/95" />
      </span>
      <span className="absolute left-1 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(165,243,252,0.95)] animate-ping motion-reduce:animate-none" />
      <span className="absolute inset-[7px] overflow-hidden rounded-full">
        <span className="absolute -left-7 top-1/2 h-8 w-3 -translate-y-1/2 rotate-12 bg-white/35 blur-[2px] animate-[pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
      </span>
      <span className="relative text-xl font-black leading-none text-white drop-shadow-[0_0_10px_rgba(207,250,254,0.98)] animate-[pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none">
        ✦
      </span>
    </span>
  );
}

function ThinkingBubble({ language }: { language: Language }) {
  const label = textForLanguage({ en: "Thinking", zh: "正在思考" }, language);

  return (
    <div role="status" aria-live="polite" className="flex min-h-12 items-center gap-3">
      <ThinkingNovaMark />
      <span className="relative inline-flex overflow-hidden rounded-full">
        <span className="bg-gradient-to-r from-cyan-400 via-slate-950 to-fuchsia-500 bg-clip-text text-base font-black text-transparent animate-pulse dark:from-cyan-200 dark:via-white dark:to-fuchsia-200 motion-reduce:animate-none">
          {label}
        </span>
        <span className="ml-1 inline-flex items-end gap-0.5 text-cyan-500 dark:text-cyan-100" aria-hidden="true">
          <span className="animate-bounce [animation-delay:-0.24s] motion-reduce:animate-none">.</span>
          <span className="animate-bounce [animation-delay:-0.12s] motion-reduce:animate-none">.</span>
          <span className="animate-bounce motion-reduce:animate-none">.</span>
        </span>
      </span>
    </div>
  );
}

function TypewriterMathText({
  active,
  onDone,
  onProgress,
  text
}: {
  active: boolean;
  onDone: () => void;
  onProgress?: () => void;
  text: string;
}) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleText, setVisibleText] = useState(active ? "" : text);
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (!active) {
      setVisibleText(text);
      return;
    }

    if (!characters.length) {
      setVisibleText("");
      onDoneRef.current();
      return;
    }

    let frame = 0;
    let lastCount = 0;
    const startedAt = performance.now();
    const charactersPerSecond = 145;

    function tick(now: number) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const nextCount = Math.min(characters.length, Math.max(1, Math.floor(elapsedSeconds * charactersPerSecond)));

      if (nextCount !== lastCount) {
        lastCount = nextCount;
        setVisibleText(characters.slice(0, nextCount).join(""));
        onProgressRef.current?.();
      }

      if (nextCount < characters.length) {
        frame = requestAnimationFrame(tick);
      } else {
        setVisibleText(text);
        onDoneRef.current();
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, characters, text]);

  return <MathText text={visibleText} />;
}

function contextLabel(context: TutorContext | undefined, language: Language) {
  if (!context) return textForLanguage({ en: "this page", zh: "本頁" }, language);
  if (isChineseLanguage(language)) {
    if (context.mode === "question") return simplifyChineseText(`這道題目：${context.title}`, language);
    if (context.mode === "figure") return simplifyChineseText(`這個視覺化：${context.title}`, language);
    if (context.mode === "mistake") return simplifyChineseText(`這項錯題：${context.title}`, language);
    if (context.mode === "concept") return simplifyChineseText(`這個概念：${context.title}`, language);
    return context.title;
  }
  if (context.mode === "question") return `this question: ${context.title}`;
  if (context.mode === "figure") return `this visualization: ${context.title}`;
  if (context.mode === "mistake") return `this mistake-book item: ${context.title}`;
  if (context.mode === "concept") return `this concept: ${context.title}`;
  return context.title;
}

function guestOpeningMessage(language: Language) {
  return textForLanguage({
    en: "Hi, I am Professor Nova. You are in guest mode right now. Please sign in or register so I can use your grade, learning progress, and mistake records to give personalized step-by-step guidance.",
    zh: "你好，我是 AI Tutor。你目前處於訪客模式。請先登入或註冊學習帳戶，這樣我才能根據你的年級、學習進度和錯題紀錄，提供適合你程度的逐步引導。",
    zhHans: "你好，我是 AI Tutor。你目前处于游客模式。请先登录或注册学习账号，这样我才能根据你的年级、学习进度和错题记录，提供适合你程度的逐步引导。"
  }, language);
}

function openingMessage(context: TutorContext | undefined, language: Language, isGuestSession: boolean) {
  if (isGuestSession) return guestOpeningMessage(language);

  if (isChineseLanguage(language)) {
    return simplifyChineseText(`你好，我是${textForLanguage(tutorSignatures, language)}。我可以協助你處理${contextLabel(context, language)}。先告訴我你目前理解到哪一步，我會逐步引導你，而不是直接給答案。`, language);
  }
  return `Hi, I am ${tutorSignatures.en}, your AI Tutor. I can help with ${contextLabel(context, language)}. Share what you understand so far, and I’ll use the Socratic method to guide you step by step instead of simply giving away the answer.`;
}

function buildTutorReply(input: string, context: TutorContext | undefined, language: Language) {
  const lower = input.toLowerCase();
  const asksForAnswer = /answer|solve|solution|答案|解答|點做|怎么做|如何做/.test(lower);
  const needsSupport = /tired|exhausted|stuck|hard|difficult|confused|stress|累|辛苦|唔識|不懂|困難|好難|崩潰/.test(lower);
  const asksConcept = /explain|why|concept|understand|意思|解釋|點解|為什麼|概念/.test(lower);
  const asksIdentity = /who are you|what(?:'s| is) your name|your name|are you\s+(?:professor\s+nova|(?:hk\s+)?teacher\s+chan|teacher\s+scott)|professor\s+nova.*(?:teacher\s+chan|teacher\s+scott)|(?:teacher\s+chan|teacher\s+scott).*professor\s+nova|你是.*(?:nova|chan|scott|誰|谁)|你係.*(?:nova|chan|scott|邊個|边个)|你叫|身份/i.test(input);

  if (asksIdentity) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("我是 Professor Nova，也就是 MAIS 的 AI Tutor，不是 HK Teacher Chan 或 Teacher Scott；我會以 AI Tutor 的身份陪你學數學。", language);
    }
    return "I am Professor Nova, the MAIS AI Tutor. I am not HK Teacher Chan or Teacher Scott; I will help you learn math as Professor Nova.";
  }

  if (needsSupport) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我明白。先和我一起做一小步。數學卡住通常代表題目藏了太多步驟，不代表你不擅長。讓我們縮小範圍：你能從${contextLabel(context, language)}找出第一個已知條件、公式或圖中標記嗎？`, language);
    }
    return `I hear you. Take one small step with me. In math, feeling stuck usually means the problem has too many hidden steps, not that you are bad at it. Let us reduce it: what is the first fact, formula, or diagram label you can identify from ${contextLabel(context, language)}?`;
  }

  if (context?.mode === "mistake") {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("這是一題值得重溫的錯題。先比較上次答案和正確答案，看看改變的是符號、公式、代入還是題意理解。告訴我哪一部分不確定，我會用相似例子和你重建方法。", language);
    }
    return `Good mistake to review. First compare your last answer with the correct answer. What changed: the sign, the formula, the substitution, or the interpretation? If you tell me which part feels uncertain, I will help you rebuild the method with a similar example.`;
  }

  if (context?.mode === "figure") {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("先觀察視覺化中的規律。當你拖曳、滑動或調整控制項時，有甚麼改變？嘗試說出一個保持不變的量和一個正在改變的量，這通常就是由圖像走向代數的橋樑。", language);
    }
    return `Look at the visual pattern first. What changes when you drag, slide, or adjust the controls? Try naming one quantity that stays fixed and one quantity that changes. That observation is usually the bridge from the figure to the algebra.`;
  }

  if (context?.mode === "question" || asksForAnswer) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我們走引導式路線。第一步：辨認課題和未知量。第二步：寫出相關性質或公式。第三步：小心代入。對於${contextLabel(context, language)}，題目要求的是哪個數值或關係？先回覆這一點，我再帶你做下一步。`, language);
    }
    return `Let us use a Socratic route. Step 1: identify the topic and the unknown. Step 2: write the relevant fact or formula. Step 3: substitute carefully. For ${contextLabel(context, language)}, what value or relationship is the question asking for? Reply with that, and I will guide the next step.`;
  }

  if (context?.mode === "concept" || asksConcept) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我們用學習路線：先講意思，再看視覺模型，最後連到代數。對於${contextLabel(context, language)}，可以問自己：涉及哪些物件？甚麼規則把它們連起來？某個值改變時有甚麼跟着變？用一句話說出你現在的理解，我會幫你修正。`, language);
    }
    return `Here is a learning route: start with the meaning, then the visual model, then the algebra. For ${contextLabel(context, language)}, ask yourself: what objects are involved, what rule connects them, and what changes when one value changes? Give me one sentence of your current understanding, and I will refine it.`;
  }

  if (isChineseLanguage(language)) {
    return simplifyChineseText("我們一起處理。你可以要求概念解釋、逐步提示、檢查思路或鼓勵支持。你想先要哪一種？", language);
  }
  return `Let us work on this together. I can explain the concept, ask guiding questions, check your reasoning, or help you plan revision. Which one do you want: concept explanation, step-by-step hint, answer check, or encouragement?`;
}

function tutorMessageQuickChoices(content: string, language: Language): TutorQuickChoice[] {
  const hasEnglishChoices = /concept explanation,\s*step-by-step hint,\s*answer check,\s*or\s+(?:revision planning|encouragement)/i.test(content);
  const hasChineseChoices = /概念(?:解釋|解释)[、，,]\s*逐步提示[、，,]\s*(?:答案(?:檢查|检查)|檢查思路|检查思路)[、，,]?\s*(?:還是|还是|或)\s*(?:複習計劃|复习计划|鼓勵支持|鼓励支持)/u.test(content);

  if (!hasEnglishChoices && !hasChineseChoices) return [];

  const finalChoice: TutorQuickChoiceId = /encouragement|鼓勵支持|鼓励支持/i.test(content)
    ? "encouragement"
    : "revision";

  return (["concept", "step", "answer", finalChoice] as TutorQuickChoiceId[]).map((id) => ({
    id,
    label: textForLanguage(tutorQuickChoiceCopy[id].label, language),
    prompt: textForLanguage(tutorQuickChoiceCopy[id].prompt, language)
  }));
}

function tutorDisplayText(content: string) {
  const displayText = content
    .replace(
      /Which one do you want:\s*concept explanation,\s*step-by-step hint,\s*answer check,\s*or encouragement\?/i,
      "Choose what you need first."
    )
    .replace(
      /choose what you need first:\s*concept explanation,\s*step-by-step hint,\s*answer check,\s*or revision planning\./i,
      "choose what you need first."
    )
    .replace(/\n\nReply with one of those choices, and I will guide the next step\./i, "")
    .replace(
      /你可以要求概念解釋、逐步提示、檢查思路或鼓勵支持。你想先要哪一種？/g,
      "先選擇你需要哪一種支援。"
    )
    .replace(
      /你可以要求概念解释、逐步提示、检查思路或鼓励支持。你想先要哪一种？/g,
      "先选择你需要哪一种支持。"
    )
    .replace(
      /做一小步：說清楚你想要概念解釋、逐步提示、答案檢查，還是複習計劃。/g,
      "做一小步：先選擇你需要哪一種支援。"
    )
    .replace(
      /做一小步：说清楚你想要概念解释、逐步提示、答案检查，还是复习计划。/g,
      "做一小步：先选择你需要哪一种支持。"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return displayText || content;
}

function hasChineseText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function hasLatinText(value: string) {
  return /[A-Za-z]/.test(value);
}

function inferChineseScript(value: string): Extract<Language, "zh" | "zh-Hans"> | undefined {
  let simplifiedScore = 0;
  let traditionalScore = 0;

  for (const character of Array.from(value)) {
    const simplified = traditionalToSimplifiedMap[character];
    if (simplified && simplified !== character) traditionalScore += 1;
    if (simplifiedChineseSignalCharacters.has(character)) simplifiedScore += 1;
  }

  if (simplifiedScore > traditionalScore) return "zh-Hans";
  if (traditionalScore > simplifiedScore) return "zh";
  return undefined;
}

function explicitChineseLanguagePreference(language: Language): Extract<Language, "zh" | "zh-Hans"> | undefined {
  if (language === "zh" || language === "zh-Hans") return language;
  return undefined;
}

function fallbackLanguageForInput(language: Language, input: string, messages: TutorMessage[]): Language {
  if (hasChineseText(input)) {
    const explicitPreference = explicitChineseLanguagePreference(language);
    if (explicitPreference) return explicitPreference;

    const historyText = messages
      .filter((message) => message.role === "student")
      .map((message) => message.content)
      .join("\n");
    return inferChineseScript(input) ?? inferChineseScript(historyText) ?? "zh-Hans";
  }

  if (hasLatinText(input)) return "en";
  return language;
}

function qwenSpeechLanguage(language: Language) {
  if (language === "zh" || language === "zh-Hans") return "zh";
  return "en";
}

function nativeSpeechLanguage(language: Language) {
  if (language === "zh-Hans") return "zh-CN";
  if (language === "zh") return "zh-HK";
  return "en-US";
}

function getNativeSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as TutorSpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function voiceIssueForNativeSpeechError(error: string | undefined): TutorVoiceInputIssue {
  if (error === "audio-capture") return "audio-capture";
  if (error === "network") return "network";
  if (error === "no-speech") return "no-speech";
  if (error === "not-allowed" || error === "service-not-allowed") return "not-allowed";
  return "unknown";
}

function cleanTutorSpeechText(value: string) {
  return value
    .replace(/\$\$?/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_[\]^]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") return undefined;
  const audioWindow = window as TutorAudioContextWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
}

function mergeAudioChunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function downsampleToPcm16(samples: Float32Array, inputSampleRate: number, outputSampleRate = 16000) {
  if (!samples.length || inputSampleRate <= 0) return new Int16Array();
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.max(1, Math.floor(samples.length / ratio));
  const pcm = new Int16Array(outputLength);

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(samples.length, Math.floor((outputIndex + 1) * ratio));
    let sum = 0;
    let count = 0;

    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += samples[inputIndex] ?? 0;
      count += 1;
    }

    const sample = Math.max(-1, Math.min(1, count ? sum / count : samples[start] ?? 0));
    pcm[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return pcm;
}

function pcm16ToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function visibleFallbackReason(reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return "";
  if (/LLM|provider|structured tutor reply|API request failed|HTTP \d+|request timed out|request failed|\.env|DEEPSEEK_API_KEY|QWEN_API_KEY|DeepSeek|Qwen/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanTutorString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function setHas<T extends string>(set: ReadonlySet<T>, value: unknown): value is T {
  return typeof value === "string" && (set as ReadonlySet<string>).has(value);
}

function readTutorEvidenceQuery(value: unknown): TutorEvidenceQuery | undefined {
  if (!isRecord(value)) return undefined;

  const conceptIds = Array.isArray(value.conceptIds)
    ? Array.from(new Set(value.conceptIds.map((conceptId) => cleanTutorString(conceptId, 80)).filter(Boolean))).slice(0, 8)
    : [];
  const chapter = cleanTutorString(value.chapter, 120);
  const topicId = cleanTutorString(value.topicId, 160);
  const grade = setHas(tutorGradeValues, value.grade) ? value.grade : undefined;
  const stage = setHas(tutorEvidenceStages, value.stage) ? value.stage : undefined;
  const documentPurpose = setHas(tutorEvidenceDocumentPurposes, value.documentPurpose) ? value.documentPurpose : undefined;
  const paperComponent = setHas(tutorEvidencePaperComponents, value.paperComponent) ? value.paperComponent : undefined;
  const evidenceLanguage = setHas(tutorEvidenceLanguageVariants, value.language) ? value.language : undefined;
  const intent = setHas(tutorEvidenceIntents, value.intent) ? value.intent : "tutor-explain";
  const difficultyBand = setHas(tutorEvidenceDifficultyBands, value.difficultyBand) ? value.difficultyBand : undefined;
  const limit = typeof value.limit === "number" && Number.isFinite(value.limit)
    ? Math.min(5, Math.max(1, Math.round(value.limit)))
    : undefined;

  if (!conceptIds.length && !chapter && !grade && !topicId && !stage && !documentPurpose && !paperComponent && !evidenceLanguage && !difficultyBand) {
    return undefined;
  }

  return {
    ...(conceptIds.length ? { conceptIds } : {}),
    ...(chapter ? { chapter } : {}),
    ...(grade ? { grade } : {}),
    ...(topicId ? { topicId } : {}),
    ...(stage ? { stage } : {}),
    ...(documentPurpose ? { documentPurpose } : {}),
    ...(paperComponent ? { paperComponent } : {}),
    ...(evidenceLanguage ? { language: evidenceLanguage } : {}),
    intent,
    ...(difficultyBand ? { difficultyBand } : {}),
    ...(limit ? { limit } : {})
  };
}

function isPrimaryGrade(grade: GradeId) {
  return grade === "K" || grade.startsWith("P");
}

function isJuniorSecondaryGrade(grade: GradeId) {
  return grade === "S1" || grade === "S2" || grade === "S3";
}

function hongKongStageForGrade(grade: GradeId): HongKongMathEdBStage {
  if (isPrimaryGrade(grade)) return "primary";
  if (isJuniorSecondaryGrade(grade)) return "junior-secondary";
  return "senior-secondary-compulsory";
}

function hongKongEvidenceLanguage(language: Language): HongKongDseMathLanguageVariant {
  return isChineseLanguage(language) ? "zh" : "en";
}

function tutorEvidenceSearchText(input: string, context: TutorContext | undefined, page: string) {
  return `${input} ${page} ${context?.title ?? ""} ${context?.details ?? ""}`.toLowerCase();
}

function asksForExamOrPaperEvidence(input: string, context: TutorContext | undefined, page: string) {
  return /exam|paper|dse|assessment|test|mock|past paper|考試|考试|測驗|测验|試卷|试卷|卷一|卷二|paper\s*[12]/i.test(tutorEvidenceSearchText(input, context, page));
}

function inferHongKongPaperComponent(input: string, context: TutorContext | undefined, page: string): HongKongDseMathPaperComponent | undefined {
  const searchable = tutorEvidenceSearchText(input, context, page);
  if (/paper\s*2|paper\s*ii|卷\s*二|卷二/i.test(searchable)) return "paper-2";
  if (/paper\s*1|paper\s*i\b|卷\s*一|卷一/i.test(searchable)) return "paper-1";
  return undefined;
}

function tutorRequestTitle(context: TutorContext | undefined, input: string, page: string) {
  if (context?.title) return context.title;
  const inputTitle = cleanTutorString(input, 120);
  if (inputTitle) return inputTitle;
  if (page.startsWith("/dashboard")) return "Dashboard AI Tutor question";
  if (page.startsWith("/practice")) return "Practice AI Tutor question";
  if (page.startsWith("/mistake-book")) return "Mistake Book AI Tutor question";
  return "AI Tutor question";
}

function buildTutorEvidenceQuery({
  context,
  input,
  grade,
  language,
  page,
  curriculumTrack
}: {
  context?: TutorContext;
  input: string;
  grade: GradeId;
  language: Language;
  page: string;
  curriculumTrack?: CurriculumTrack;
}): TutorEvidenceQuery | undefined {
  if (context?.evidenceQuery) {
    return {
      ...context.evidenceQuery,
      grade: context.evidenceQuery.grade ?? grade,
      topicId: context.evidenceQuery.topicId ?? context.topicId
    };
  }

  const isUnitedStatesMathTrack = curriculumTrack ? unitedStatesMathTutorTracks.has(curriculumTrack) : false;
  if (curriculumTrack !== "HK" && curriculumTrack !== "MAINLAND_PEP_HIGH" && !isUnitedStatesMathTrack) return undefined;

  const asksExam = asksForExamOrPaperEvidence(input, context, page);
  const intent = context?.mode === "mistake"
    ? "diagnose-mistake"
    : asksExam
      ? "exam-practice"
      : "tutor-explain";
  const difficultyBand = asksExam ? "exam" : "core";

  if (isUnitedStatesMathTrack) {
    return {
      grade,
      ...(context?.topicId ? { topicId: context.topicId } : {}),
      ...(context?.evidenceQuery?.chapter ? { chapter: context.evidenceQuery.chapter } : {}),
      intent: context?.mode === "mistake" ? "diagnose-mistake" : "tutor-explain",
      difficultyBand: "core"
    };
  }

  if (curriculumTrack === "HK") {
    const paperComponent = inferHongKongPaperComponent(input, context, page);
    return {
      grade,
      ...(context?.topicId ? { topicId: context.topicId } : {}),
      stage: hongKongStageForGrade(grade),
      documentPurpose: "curriculum-guide",
      ...(paperComponent ? { paperComponent } : {}),
      language: hongKongEvidenceLanguage(language),
      intent,
      difficultyBand
    };
  }

  return {
    grade,
    ...(context?.topicId ? { topicId: context.topicId } : {}),
    ...(context?.evidenceQuery?.chapter ? { chapter: context.evidenceQuery.chapter } : {}),
    intent,
    difficultyBand
  };
}

function buildTutorRequestContext({
  context,
  input,
  grade,
  language,
  page,
  curriculumTrack
}: {
  context?: TutorContext;
  input: string;
  grade: GradeId;
  language: Language;
  page: string;
  curriculumTrack?: CurriculumTrack;
}): TutorContext | undefined {
  const resolvedTrack = context?.curriculumTrack ?? curriculumTrack;
  const evidenceQuery = buildTutorEvidenceQuery({
    context,
    input,
    grade,
    language,
    page,
    curriculumTrack: resolvedTrack
  });

  if (!context && !evidenceQuery) return undefined;

  return {
    mode: context?.mode ?? "general",
    title: tutorRequestTitle(context, input, page),
    details: context?.details,
    ...(resolvedTrack ? { curriculumTrack: resolvedTrack } : {}),
    topicId: context?.topicId,
    skillId: context?.skillId,
    questionId: context?.questionId,
    lessonSlug: context?.lessonSlug,
    ...(evidenceQuery ? { evidenceQuery } : {}),
    dataScopes: context?.dataScopes,
    targetStudentId: context?.targetStudentId,
    selection: context?.selection
  };
}

function stripQuestionAnswer(context?: TutorContext) {
  if (!context?.details) return context;

  const details = context.details
    .replace(/\s*Correct answer:\s*[^.。]*(?:[.。]|$)/i, "")
    .replace(/\s*正確答案：\s*[^.。]*(?:[.。]|$)/, "")
    .replace(/\s*正确答案：\s*[^.。]*(?:[.。]|$)/, "")
    .trim();

  return {
    ...context,
    details: details || undefined
  };
}

function readApiResponse(value: unknown): TutorApiResponse {
  if (!isRecord(value)) return {};
  const visualization = normalizeAITutorVisualization(value.visualization);
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    reply: typeof value.reply === "string" ? value.reply : undefined,
    ...(visualization ? { visualization } : {}),
    error: typeof value.error === "string" ? value.error : undefined,
    mode: typeof value.mode === "string" ? value.mode : undefined
  };
}

async function tutorResponseRequiresSessionRevalidation(response: Response) {
  if (response.status === 401 || response.status === 403) return true;
  if (response.status !== 409) return false;
  try {
    const body = await response.clone().json() as { code?: unknown };
    return body.code === "authenticated-user-changed";
  } catch {
    return false;
  }
}

function readTutorStreamFinalPayload(value: unknown) {
  if (!isRecord(value)) return null;
  const status = typeof value.status === "number" && Number.isFinite(value.status)
    ? value.status
    : 200;
  return {
    status,
    body: value.body
  };
}

function parseTutorStreamEventBlock(block: string) {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) return null;
  try {
    return {
      event,
      data: JSON.parse(dataLines.join("\n")) as unknown
    };
  } catch {
    return null;
  }
}

async function readTutorStreamResponse(
  response: Response,
  callbacks: TutorStreamCallbacks = {}
): Promise<TutorTransportResult> {
  if (!response.body) {
    return {
      response: { ok: false, status: response.status },
      data: {}
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalStatus = response.status;
  let finalBody: unknown;
  let streamedReply = "";

  const consumeBlock = (block: string) => {
    const parsed = parseTutorStreamEventBlock(block);
    if (!parsed) return;
    if (parsed.event === "chunk" && isRecord(parsed.data)) {
      const delta = typeof parsed.data.delta === "string"
        ? parsed.data.delta
        : typeof parsed.data.text === "string"
          ? parsed.data.text
          : "";
      if (delta) {
        streamedReply += delta;
        callbacks.onChunk?.(delta);
      }
      return;
    }
    if (parsed.event !== "final") return;
    const finalPayload = readTutorStreamFinalPayload(parsed.data);
    if (!finalPayload) return;
    finalStatus = finalPayload.status;
    finalBody = finalPayload.body;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consumeBlock);
  }

  const remaining = `${buffer}${decoder.decode()}`;
  if (remaining.trim()) consumeBlock(remaining);

  const finalData = readApiResponse(finalBody);
  return {
    response: {
      ok: finalStatus >= 200 && finalStatus < 300,
      status: finalStatus
    },
    data: finalData.reply || !streamedReply
      ? finalData
      : {
          ...finalData,
          reply: streamedReply
        }
  };
}

function readSetupStatus(value: unknown): TutorSetupStatus {
  if (!isRecord(value)) return { state: "local-helper" };
  const voice = isRecord(value.voice)
    ? {
        configured: value.voice.configured === true,
        model: typeof value.voice.model === "string" ? value.voice.model : undefined,
        provider: typeof value.voice.provider === "string" ? value.voice.provider : undefined
      }
    : undefined;
  const speech = isRecord(value.speech)
    ? {
        configured: value.speech.configured === true,
        model: typeof value.speech.model === "string" ? value.speech.model : undefined,
        provider: typeof value.speech.provider === "string" ? value.speech.provider : undefined
      }
    : undefined;

  return {
    state: value.configured === true ? "configured" : "local-helper",
    model: typeof value.model === "string" ? value.model : undefined,
    ...(voice ? { voice } : {}),
    ...(speech ? { speech } : {})
  };
}

function readClassAiTutorPolicy(value: unknown): ClassAiTutorPolicy | null {
  if (!isRecord(value) || !isRecord(value.policy)) return null;
  const policy = value.policy;
  const mode = policy.mode === "limited" || policy.mode === "fallback-only" ? policy.mode : "open";
  return {
    classId: typeof policy.classId === "string" ? policy.classId : "default",
    mode,
    previousLiveMode: policy.previousLiveMode === "limited"
      ? "limited"
      : policy.previousLiveMode === "open"
        ? "open"
        : null,
    perStudentMinuteLimit: typeof policy.perStudentMinuteLimit === "number" ? policy.perStudentMinuteLimit : 2,
    perStudentHourLimit: typeof policy.perStudentHourLimit === "number" ? policy.perStudentHourLimit : 20,
    fallbackOnFailure: true,
    updatedBy: typeof policy.updatedBy === "string" ? policy.updatedBy : "system",
    updatedAt: typeof policy.updatedAt === "string" ? policy.updatedAt : new Date().toISOString()
  };
}

function hasStudentMessage(messages: TutorMessage[]) {
  return messages.some((message) => message.role === "student");
}

function sanitizeMessagesForDraft(messages: TutorMessage[]): TutorMessage[] {
  return messages
    .filter((message) => !(message.status === "thinking" && !message.content.trim()))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      visualization: message.visualization,
      ...(message.status === "typing" ? { status: message.status } : {})
    }));
}

function readTutorContext(value: unknown): TutorContext | undefined {
  if (!isRecord(value) || !tutorContextModes.has(value.mode as TutorContext["mode"]) || typeof value.title !== "string") {
    return undefined;
  }
  const dataScopes = Array.isArray(value.dataScopes)
    ? Array.from(new Set(value.dataScopes.filter((scope): scope is TutorDataScope => tutorDataScopeSet.has(scope as TutorDataScope))))
    : [];
  const curriculumTrack = setHas(tutorCurriculumTracks, value.curriculumTrack) ? value.curriculumTrack : undefined;
  const evidenceQuery = readTutorEvidenceQuery(value.evidenceQuery);
  const selection = readTutorSelection(value.selection);

  return {
    mode: value.mode as TutorContext["mode"],
    title: value.title,
    details: typeof value.details === "string" ? value.details : undefined,
    curriculumTrack,
    topicId: typeof value.topicId === "string" ? value.topicId : undefined,
    skillId: typeof value.skillId === "string" ? value.skillId : undefined,
    questionId: typeof value.questionId === "string" ? value.questionId : undefined,
    lessonSlug: typeof value.lessonSlug === "string" ? value.lessonSlug : undefined,
    evidenceQuery,
    dataScopes: dataScopes.length ? dataScopes : undefined,
    targetStudentId: typeof value.targetStudentId === "string" ? value.targetStudentId : undefined,
    selection
  };
}

function readTutorMessages(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): TutorMessage | null => {
      if (
        !isRecord(message) ||
        (message.role !== "tutor" && message.role !== "student") ||
        typeof message.content !== "string"
      ) {
        return null;
      }

      return {
        id: typeof message.id === "string" ? message.id : undefined,
        role: message.role,
        content: message.content,
        visualization: normalizeAITutorVisualization(message.visualization),
        ...(message.status === "typing" ? { status: message.status } : {})
      };
    })
    .filter((message): message is TutorMessage => Boolean(message));
}

function readTutorSelection(value: unknown): TutorSelectionContext | undefined {
  if (!isRecord(value)) return undefined;

  const selectedText = cleanTutorString(value.selectedText, 500);
  const lessonSlug = cleanTutorString(value.lessonSlug, 160);
  const topicId = cleanTutorString(value.topicId, 160);
  const helpType = setHas(tutorSelectionHelpTypes, value.helpType) ? value.helpType : "custom";
  const questionId = cleanTutorString(value.questionId, 160);
  const blockId = cleanTutorString(value.blockId, 160);
  const blockType = cleanTutorString(value.blockType, 80);
  const surroundingText = cleanTutorString(value.surroundingText, 900);

  if (!selectedText || !lessonSlug || !topicId) return undefined;

  return {
    selectedText,
    helpType,
    lessonSlug,
    topicId,
    ...(questionId ? { questionId } : {}),
    ...(blockId ? { blockId } : {}),
    ...(blockType ? { blockType } : {}),
    ...(surroundingText ? { surroundingText } : {})
  };
}

function isGuestSignupTutorMessage(message: TutorMessage) {
  if (message.role !== "tutor") return false;
  return /AI Tutor (?:is available|needs|required|需要).*(?:register|sign in|註冊|登入|注册|登录)|Please create a learning account|請先建立.*學習帳戶|请先建立.*学习帐户/i.test(message.content);
}

function tutorDraftOwnerForUser(user: Pick<StudentSession, "id" | "role"> | null): TutorDraftOwner {
  return user
    ? { userId: user.id, role: user.role }
    : { userId: "guest", role: "guest" };
}

function tutorDraftStorageKeyFor(owner: TutorDraftOwner) {
  return `${tutorDraftStorageKeyPrefix}:${owner.userId}`;
}

function readTutorDraft(value: unknown, owner: TutorDraftOwner): TutorDraft | null {
  if (!isRecord(value) || value.version !== 2 || typeof value.updatedAt !== "number") return null;
  if (Date.now() - value.updatedAt > tutorDraftMaxAgeMs) return null;
  if (value.userId !== owner.userId || !tutorDraftRoles.has(value.role as TutorDraft["role"]) || value.role !== owner.role) {
    return null;
  }

  const messages = readTutorMessages(value.messages).filter((message) => (
    owner.role === "guest" || !isGuestSignupTutorMessage(message)
  ));
  if (!messages.length) return null;

  return {
    userId: owner.userId,
    role: owner.role,
    open: value.open === true,
    context: readTutorContext(value.context),
    input: typeof value.input === "string" ? value.input : "",
    messages
  };
}

function removeLegacyTutorDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(legacyTutorDraftStorageKey);
  } catch {
    // Legacy cleanup is best-effort only.
  }
}

function readStoredTutorDraft(owner: TutorDraftOwner) {
  if (typeof window === "undefined") return null;

  const storageKey = tutorDraftStorageKeyFor(owner);
  const latestDraft = latestTutorDrafts.get(storageKey);
  if (latestDraft?.userId === owner.userId && latestDraft.role === owner.role) {
    return latestDraft;
  }

  try {
    removeLegacyTutorDraft();
    const value = window.localStorage.getItem(storageKey);
    const draft = value ? readTutorDraft(JSON.parse(value), owner) : null;
    if (!draft && value) window.localStorage.removeItem(storageKey);
    if (draft) latestTutorDrafts.set(storageKey, draft);
    return draft;
  } catch {
    return null;
  }
}

function rememberTutorDraft(owner: TutorDraftOwner, draft: Omit<TutorDraft, "userId" | "role">) {
  const messages = sanitizeMessagesForDraft(draft.messages).filter((message) => (
    owner.role === "guest" || !isGuestSignupTutorMessage(message)
  ));
  const storageKey = tutorDraftStorageKeyFor(owner);
  const ownedDraft: TutorDraft = {
    ...draft,
    userId: owner.userId,
    role: owner.role,
    messages
  };
  latestTutorDrafts.set(storageKey, ownedDraft);
  if (typeof window === "undefined") return;

  try {
    removeLegacyTutorDraft();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        updatedAt: Date.now(),
        userId: owner.userId,
        role: owner.role,
        open: draft.open,
        context: draft.context,
        input: draft.input,
        messages
      })
    );
  } catch {
    // Losing the draft should not block the tutor itself.
  }
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function requestTutorReply({
  input,
  messages,
  context,
  grade,
  language,
  page,
  attachments,
  expectedUserId,
  signal,
  assertSessionCurrent,
  onSessionConflict,
  onStreamChunk
}: {
  input: string;
  messages: TutorMessage[];
  context?: TutorContext;
  grade: string;
  language: string;
  page: string;
  attachments: TutorAttachment[];
  expectedUserId?: string;
  signal: AbortSignal;
  assertSessionCurrent: () => void;
  onSessionConflict: () => void;
  onStreamChunk?: (delta: string) => void;
}) {
  const payload = {
    input,
    messages: expectedUserId
      ? messages.filter((message) => !isGuestSignupTutorMessage(message))
      : messages,
    context: stripQuestionAnswer(context),
    grade,
    language,
    page,
    ...(expectedUserId ? { expectedUserId } : {})
  };

  function buildRequestInit(): RequestInit {
    return attachments.length
      ? (() => {
          const formData = new FormData();
          formData.set("payload", JSON.stringify(payload));
          attachments.forEach((attachment) => formData.append("attachments", attachment.file, attachment.name));
          return {
            method: "POST",
            headers: {
              Accept: "text/event-stream",
              ...(expectedUserId
                ? { "X-MAIS-Expected-User-Id": expectedUserId }
                : {})
            },
            body: formData,
            cache: "no-store",
            credentials: "same-origin",
            signal
          };
        })()
      : {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            ...(expectedUserId
              ? { "X-MAIS-Expected-User-Id": expectedUserId }
              : {})
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "same-origin",
          signal
        };
  }

  async function postTutorRequest(): Promise<TutorTransportResult> {
    assertSessionCurrent();
    const response = await fetch("/api/ai-tutor", buildRequestInit());
    assertSessionCurrent();
    if ((response.headers.get("content-type") ?? "").toLowerCase().includes("text/event-stream")) {
      const result = await readTutorStreamResponse(response, {
        onChunk: (delta) => {
          assertSessionCurrent();
          onStreamChunk?.(delta);
        }
      });
      if (
        result.response.status === 401 ||
        result.response.status === 403 ||
        (result.response.status === 409 && result.data.code === "authenticated-user-changed")
      ) {
        onSessionConflict();
      }
      assertSessionCurrent();
      return result;
    }

    let data: TutorApiResponse = {};
    try {
      data = readApiResponse(await response.json());
    } catch {
      data = {};
    }
    if (
      response.status === 401 ||
      response.status === 403 ||
      (response.status === 409 && data.code === "authenticated-user-changed")
    ) {
      onSessionConflict();
    }
    assertSessionCurrent();
    return {
      response: {
        ok: response.ok,
        status: response.status
      },
      data
    };
  }

  let { response, data } = await postTutorRequest();
  if (response.ok && data.mode === "registration-required" && expectedUserId) {
    assertSessionCurrent();
    const sessionResponse = await fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "X-MAIS-Expected-User-Id": expectedUserId
      },
      signal
    });
    if (await tutorResponseRequiresSessionRevalidation(sessionResponse)) {
      onSessionConflict();
    }
    assertSessionCurrent();
    if (sessionResponse.ok) {
      ({ response, data } = await postTutorRequest());
    }
  }

  if (response.ok && data.mode === "registration-required" && expectedUserId) {
    throw new Error("AI Tutor API request failed.");
  }

  if (!response.ok || !data.reply) {
    throw new Error(data.error ?? "AI Tutor API request failed.");
  }

  return {
    reply: data.reply,
    visualization: data.visualization
  };
}

function TutorVisualizationPanel({ visualization }: { visualization: AITutorVisualization }) {
  if (visualization.tool !== "show_function_graph") return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-200/80 bg-white p-2 shadow-inner shadow-cyan-900/5 dark:border-cyan-300/25 dark:bg-slate-950/80">
      <FunctionGraphExplorer
        compact
        initialCoefficients={visualization.parameters}
        showAxisLabels
        topicId="quadratic-functions"
      />
    </div>
  );
}

export function AITutorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, language, recordLearningEvent, selectedGrade, settingsReady, t } = useSettings();
  const isGuestSession = !currentUser;
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<TutorContext | undefined>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<TutorAttachment[]>([]);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceInputIssue, setVoiceInputIssue] = useState<TutorVoiceInputIssue | null>(null);
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(false);
  const [voicePlaybackStatus, setVoicePlaybackStatus] = useState<TutorVoicePlaybackStatus>("idle");
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<TutorVoiceStatus>("idle");
  const [tutorPanelSize, setTutorPanelSize] = useState<TutorPanelSize | null>(null);
  const [isTutorPanelResizing, setIsTutorPanelResizing] = useState(false);
  const [classroomPolicy, setClassroomPolicy] = useState<ClassAiTutorPolicy | null>(null);
  const classroomFallbackOnly = classroomPolicy?.mode === "fallback-only";
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const tutorPanelRef = useRef<HTMLElement | null>(null);
  const tutorPanelResizeRef = useRef<TutorPanelResizeSnapshot | null>(null);
  const tutorVoiceAbortRef = useRef<AbortController | null>(null);
  const tutorVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const tutorVoiceObjectUrlRef = useRef<string | null>(null);
  const sendTutorMessageRef = useRef<((options: SendTutorMessageOptions) => Promise<void>) | null>(null);
  const tutorSessionIdentityRef = useRef<TutorSessionIdentity>(tutorSessionIdentityForUser(currentUser));
  const tutorSessionUserRef = useRef(currentUser);
  const tutorAuthEpochRef = useRef(0);
  const tutorAccountRequestControllersRef = useRef(new Set<AbortController>());
  const tutorProviderMountedRef = useRef(true);
  const voiceInputBaseRef = useRef("");
  const nativeSpeechFinalTranscriptRef = useRef("");
  const nativeSpeechInterimTranscriptRef = useRef("");
  const nativeSpeechRecognitionIssueRef = useRef<TutorVoiceInputIssue | null>(null);
  const nativeSpeechRecognitionRef = useRef<TutorNativeSpeechRecognition | null>(null);
  const qwenSpeechRecorderRef = useRef<TutorQwenSpeechRecorder | null>(null);
  const voiceRecognitionSessionRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openRequestedRef = useRef(false);
  const [setupStatus, setSetupStatus] = useState<TutorSetupStatus>({ state: "checking" });
  const [messages, setMessages] = useState<TutorMessage[]>(
    () => [tutorMessage("tutor", openingMessage(undefined, language, isGuestSession))]
  );
  const [draftReady, setDraftReady] = useState(false);
  const [loadedDraftStorageKey, setLoadedDraftStorageKey] = useState<string | null>(null);
  const draftOwner = useMemo(() => tutorDraftOwnerForUser(currentUser), [currentUser?.id, currentUser?.role]);
  const draftStorageKey = useMemo(() => tutorDraftStorageKeyFor(draftOwner), [draftOwner.userId]);
  const latestSpeakableTutorText = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== "tutor" || !message.content.trim() || message.status === "thinking" || message.status === "typing") continue;
      if (messages.some((candidate, candidateIndex) => candidateIndex < index && candidate.role === "student")) {
        return message.content;
      }
    }

    return "";
  }, [messages]);
  const invalidateTutorAuthEpoch = useCallback(() => {
    tutorAuthEpochRef.current += 1;
    for (const controller of tutorAccountRequestControllersRef.current) {
      controller.abort(tutorSessionAbortError());
    }
    tutorAccountRequestControllersRef.current.clear();
  }, []);
  const beginTutorSessionRequest = useCallback((): TutorSessionSnapshot => {
    const controller = new AbortController();
    tutorAccountRequestControllersRef.current.add(controller);
    return {
      controller,
      epoch: tutorAuthEpochRef.current,
      identity: tutorSessionIdentityRef.current
    };
  }, []);
  const tutorSessionSnapshotIsCurrent = useCallback((snapshot: TutorSessionSnapshot) => (
    tutorSessionRequestMayContinue({
      aborted: snapshot.controller.signal.aborted,
      currentEpoch: tutorAuthEpochRef.current,
      currentIdentity: tutorSessionIdentityRef.current,
      mounted: tutorProviderMountedRef.current,
      snapshotEpoch: snapshot.epoch,
      snapshotIdentity: snapshot.identity
    })
  ), []);
  const assertTutorSessionSnapshotCurrent = useCallback((snapshot: TutorSessionSnapshot) => {
    if (!tutorSessionSnapshotIsCurrent(snapshot)) throw tutorSessionAbortError();
  }, [tutorSessionSnapshotIsCurrent]);
  const releaseTutorSessionRequest = useCallback((snapshot: TutorSessionSnapshot) => {
    tutorAccountRequestControllersRef.current.delete(snapshot.controller);
  }, []);
  const scrollMessagesToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, []);
  const invalidateVoiceCaptureSession = useCallback((_mode: "abort" | "stop" = "stop") => {
    voiceRecognitionSessionRef.current += 1;
  }, []);
  const stopTutorVoicePlayback = useCallback((nextStatus: TutorVoicePlaybackStatus = "idle") => {
    tutorVoiceAbortRef.current?.abort();
    tutorVoiceAbortRef.current = null;
    tutorVoiceAudioRef.current?.pause();
    tutorVoiceAudioRef.current = null;
    if (tutorVoiceObjectUrlRef.current) {
      URL.revokeObjectURL(tutorVoiceObjectUrlRef.current);
      tutorVoiceObjectUrlRef.current = null;
    }
    setVoicePlaybackStatus(nextStatus);
  }, []);
  const teardownQwenSpeechRecorder = useCallback((recorder: TutorQwenSpeechRecorder) => {
    recorder.processor.onaudioprocess = null;
    recorder.processor.disconnect();
    recorder.source.disconnect();
    recorder.silence.disconnect();
    recorder.stream.getTracks().forEach((track) => track.stop());
    void recorder.context.close().catch(() => undefined);
  }, []);
  const teardownNativeSpeechRecognition = useCallback((recognition: TutorNativeSpeechRecognition) => {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.abort();
    } catch {
      // Some browsers throw if recognition is already stopped.
    }
  }, []);
  const abortQwenSpeechCapture = useCallback((nextStatus: TutorVoiceStatus = "idle") => {
    const recorder = qwenSpeechRecorderRef.current;
    voiceRecognitionSessionRef.current += 1;
    setIsVoiceListening(false);
    setVoiceStatus(nextStatus);
    if (!recorder) return;

    qwenSpeechRecorderRef.current = null;
    teardownQwenSpeechRecorder(recorder);
  }, [teardownQwenSpeechRecorder]);
  const abortNativeSpeechCapture = useCallback((nextStatus: TutorVoiceStatus = "idle") => {
    const recognition = nativeSpeechRecognitionRef.current;
    voiceRecognitionSessionRef.current += 1;
    nativeSpeechFinalTranscriptRef.current = "";
    nativeSpeechInterimTranscriptRef.current = "";
    nativeSpeechRecognitionIssueRef.current = null;
    setIsVoiceListening(false);
    setVoiceStatus(nextStatus);
    if (!recognition) return;

    nativeSpeechRecognitionRef.current = null;
    teardownNativeSpeechRecognition(recognition);
  }, [teardownNativeSpeechRecognition]);
  const abortVoiceInputCapture = useCallback((nextStatus: TutorVoiceStatus = "idle") => {
    abortNativeSpeechCapture(nextStatus);
    abortQwenSpeechCapture(nextStatus);
  }, [abortNativeSpeechCapture, abortQwenSpeechCapture]);
  useLayoutEffect(() => {
    tutorProviderMountedRef.current = true;
    const nextIdentity = tutorSessionIdentityForUser(currentUser);
    if (
      tutorSessionUserRef.current !== currentUser ||
      !sameTutorSessionIdentity(tutorSessionIdentityRef.current, nextIdentity)
    ) {
      invalidateTutorAuthEpoch();
      abortVoiceInputCapture();
      stopTutorVoicePlayback();
    }
    tutorSessionIdentityRef.current = nextIdentity;
    tutorSessionUserRef.current = currentUser;
    return () => {
      tutorProviderMountedRef.current = false;
      invalidateTutorAuthEpoch();
    };
  }, [abortVoiceInputCapture, currentUser, invalidateTutorAuthEpoch, stopTutorVoicePlayback]);

  useEffect(() => {
    const quarantineTutorWork = () => {
      invalidateTutorAuthEpoch();
      abortVoiceInputCapture();
      stopTutorVoicePlayback();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== appShellSessionSyncStorageKey) return;
      if (!sessionSignalMatchesTutorIdentity(event.newValue, tutorSessionIdentityRef.current)) {
        quarantineTutorWork();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") quarantineTutorWork();
    };
    const handleBroadcastMessage = (event: MessageEvent<unknown>) => {
      if (!sessionSignalMatchesTutorIdentity(event.data, tutorSessionIdentityRef.current)) {
        quarantineTutorWork();
      }
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(appShellSessionSyncStorageKey);
      channel.addEventListener("message", handleBroadcastMessage);
    } catch {
      channel = null;
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("blur", quarantineTutorWork);
    window.addEventListener("pagehide", quarantineTutorWork);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("blur", quarantineTutorWork);
      window.removeEventListener("pagehide", quarantineTutorWork);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.removeEventListener("message", handleBroadcastMessage);
      channel?.close();
    };
  }, [abortVoiceInputCapture, invalidateTutorAuthEpoch, stopTutorVoicePlayback]);

  const loadClassroomPolicy = useCallback(async (existingSnapshot?: TutorSessionSnapshot) => {
    const snapshot = existingSnapshot ?? beginTutorSessionRequest();
    const ownsSnapshot = existingSnapshot === undefined;
    const expectedUserId = snapshot.identity?.userId;
    if (!expectedUserId) {
      if (tutorSessionSnapshotIsCurrent(snapshot)) setClassroomPolicy(null);
      if (ownsSnapshot) releaseTutorSessionRequest(snapshot);
      return null;
    }

    try {
      assertTutorSessionSnapshotCurrent(snapshot);
      const response = await fetch("/api/ai-tutor/classroom-policy", {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        signal: snapshot.controller.signal
      });
      if (await tutorResponseRequiresSessionRevalidation(response)) {
        invalidateTutorAuthEpoch();
        return null;
      }
      assertTutorSessionSnapshotCurrent(snapshot);
      if (!response.ok) return null;
      const policy = readClassAiTutorPolicy(await response.json().catch(() => null));
      assertTutorSessionSnapshotCurrent(snapshot);
      if (policy) setClassroomPolicy(policy);
      return policy;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      return null;
    } finally {
      if (ownsSnapshot) releaseTutorSessionRequest(snapshot);
    }
  }, [
    assertTutorSessionSnapshotCurrent,
    beginTutorSessionRequest,
    invalidateTutorAuthEpoch,
    releaseTutorSessionRequest,
    tutorSessionSnapshotIsCurrent
  ]);
  const submitVoiceTranscript = useCallback((transcript: string) => {
    const rawInput = voiceTranscriptMessageInput(voiceInputBaseRef.current, transcript);
    if (!rawInput) {
      setVoiceInputIssue("no-speech");
      setVoiceStatus("error");
      return;
    }

    const sendTutorMessage = sendTutorMessageRef.current;
    if (!sendTutorMessage) {
      setInput(rawInput);
      setVoiceInputIssue("unknown");
      setVoiceStatus("error");
      return;
    }

    setInput(rawInput);
    setVoiceInputIssue(null);
    setVoiceStatus("processing");
    void sendTutorMessage({ rawInput });
  }, []);
  const finishQwenSpeechCapture = useCallback(async () => {
    const recorder = qwenSpeechRecorderRef.current;
    if (!recorder) return;
    const sessionSnapshot = beginTutorSessionRequest();
    const expectedUserId = sessionSnapshot.identity?.userId;

    qwenSpeechRecorderRef.current = null;
    teardownQwenSpeechRecorder(recorder);
    setIsVoiceListening(false);
    setVoiceStatus("processing");

    if (!expectedUserId) {
      releaseTutorSessionRequest(sessionSnapshot);
      setVoiceInputIssue("auth-required");
      setVoiceStatus("error");
      return;
    }

    const pcm = downsampleToPcm16(mergeAudioChunks(recorder.chunks), recorder.inputSampleRate);
    if (pcm.length < 1600) {
      releaseTutorSessionRequest(sessionSnapshot);
      setVoiceInputIssue("no-speech");
      setVoiceStatus("error");
      return;
    }

    try {
      assertTutorSessionSnapshotCurrent(sessionSnapshot);
      const response = await fetch("/api/ai-tutor/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: JSON.stringify({
          audio: pcm16ToBase64(pcm),
          expectedUserId,
          language: qwenSpeechLanguage(language),
          sampleRate: 16000
        }),
        cache: "no-store",
        credentials: "same-origin",
        signal: sessionSnapshot.controller.signal
      });

      if (await tutorResponseRequiresSessionRevalidation(response)) {
        invalidateTutorAuthEpoch();
        return;
      }
      assertTutorSessionSnapshotCurrent(sessionSnapshot);

      if (!response.ok) {
        setVoiceInputIssue(response.status === 400 ? "no-speech" : "network");
        setVoiceStatus("error");
        return;
      }

      const payload = (await response.json()) as TutorSpeechApiResponse;
      assertTutorSessionSnapshotCurrent(sessionSnapshot);
      const finalDraft = cleanVoiceTranscript(payload.transcript ?? "");
      if (!finalDraft) {
        setVoiceInputIssue("no-speech");
        setVoiceStatus("error");
        return;
      }

      submitVoiceTranscript(finalDraft);
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        !tutorSessionSnapshotIsCurrent(sessionSnapshot)
      ) return;
      setVoiceInputIssue("network");
      setVoiceStatus("error");
    } finally {
      releaseTutorSessionRequest(sessionSnapshot);
    }
  }, [
    assertTutorSessionSnapshotCurrent,
    beginTutorSessionRequest,
    invalidateTutorAuthEpoch,
    language,
    releaseTutorSessionRequest,
    submitVoiceTranscript,
    teardownQwenSpeechRecorder,
    tutorSessionSnapshotIsCurrent
  ]);
  const startQwenSpeechCapture = useCallback(async () => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!currentUser || !navigator.mediaDevices?.getUserMedia || !AudioContextConstructor) {
      setSpeechSupported(false);
      setVoiceInputIssue("unsupported");
      setVoiceStatus("error");
      return;
    }

    stopTutorVoicePlayback();
    abortNativeSpeechCapture();
    invalidateVoiceCaptureSession("abort");
    const recordingSessionId = voiceRecognitionSessionRef.current + 1;
    voiceRecognitionSessionRef.current = recordingSessionId;
    voiceInputBaseRef.current = input.trim();
    setVoiceInputIssue(null);
    setVoiceStatus("listening");
    setIsVoiceListening(true);

    let pendingStream: MediaStream | null = null;
    let pendingContext: AudioContext | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      pendingStream = stream;
      if (voiceRecognitionSessionRef.current !== recordingSessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContextConstructor();
      pendingContext = context;
      await context.resume().catch(() => undefined);
      if (voiceRecognitionSessionRef.current !== recordingSessionId) {
        stream.getTracks().forEach((track) => track.stop());
        void context.close().catch(() => undefined);
        return;
      }
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silence = context.createGain();
      const chunks: Float32Array[] = [];

      silence.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (qwenSpeechRecorderRef.current?.processor !== processor) return;
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(silence);
      silence.connect(context.destination);
      qwenSpeechRecorderRef.current = {
        chunks,
        context,
        inputSampleRate: context.sampleRate,
        processor,
        silence,
        source,
        stream
      };
      pendingStream = null;
      pendingContext = null;
    } catch (error) {
      pendingStream?.getTracks().forEach((track) => track.stop());
      if (pendingContext) void pendingContext.close().catch(() => undefined);
      setIsVoiceListening(false);
      setVoiceInputIssue(error instanceof DOMException && error.name === "NotAllowedError" ? "not-allowed" : "audio-capture");
      setVoiceStatus("error");
    }
  }, [abortNativeSpeechCapture, currentUser, input, invalidateVoiceCaptureSession, stopTutorVoicePlayback]);
  const finishNativeSpeechCapture = useCallback(() => {
    const recognition = nativeSpeechRecognitionRef.current;
    if (!recognition) return false;

    setIsVoiceListening(false);
    setVoiceStatus("processing");
    try {
      recognition.stop();
    } catch {
      nativeSpeechRecognitionRef.current = null;
      teardownNativeSpeechRecognition(recognition);
      setVoiceInputIssue("unknown");
      setVoiceStatus("error");
    }
    return true;
  }, [teardownNativeSpeechRecognition]);
  const startNativeSpeechCapture = useCallback(() => {
    const SpeechRecognitionConstructor = getNativeSpeechRecognitionConstructor();
    if (!currentUser || !SpeechRecognitionConstructor) {
      return false;
    }

    stopTutorVoicePlayback();
    abortNativeSpeechCapture();
    abortQwenSpeechCapture();
    const recognitionSessionId = voiceRecognitionSessionRef.current + 1;
    voiceRecognitionSessionRef.current = recognitionSessionId;
    voiceInputBaseRef.current = input.trim();
    nativeSpeechFinalTranscriptRef.current = "";
    nativeSpeechInterimTranscriptRef.current = "";
    nativeSpeechRecognitionIssueRef.current = null;
    setVoiceInputIssue(null);
    setVoiceStatus("listening");
    setIsVoiceListening(true);

    let recognition: TutorNativeSpeechRecognition;
    try {
      recognition = new SpeechRecognitionConstructor();
    } catch {
      setIsVoiceListening(false);
      setVoiceInputIssue("audio-capture");
      setVoiceStatus("error");
      return false;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = nativeSpeechLanguage(language);
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      if (voiceRecognitionSessionRef.current !== recognitionSessionId) return;

      let finalTranscript = "";
      let interimTranscript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = cleanVoiceTranscript(result?.[0]?.transcript ?? "");
        if (!transcript) continue;
        if (result?.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`;
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`;
        }
      }

      nativeSpeechFinalTranscriptRef.current = cleanVoiceTranscript(finalTranscript);
      nativeSpeechInterimTranscriptRef.current = cleanVoiceTranscript(interimTranscript);
      const displayDraft = cleanVoiceTranscript(`${nativeSpeechFinalTranscriptRef.current} ${nativeSpeechInterimTranscriptRef.current}`);
      if (!displayDraft) return;

      setInput(voiceTranscriptMessageInput(voiceInputBaseRef.current, displayDraft));
      setVoiceInputIssue(null);
      setVoiceStatus("listening");
    };
    recognition.onerror = (event) => {
      if (voiceRecognitionSessionRef.current !== recognitionSessionId) return;
      const issue = voiceIssueForNativeSpeechError(event.error);
      nativeSpeechRecognitionIssueRef.current = issue;
      setVoiceInputIssue(issue);
      setVoiceStatus("error");
      setIsVoiceListening(false);
    };
    recognition.onend = () => {
      if (voiceRecognitionSessionRef.current !== recognitionSessionId) return;
      nativeSpeechRecognitionRef.current = null;
      setIsVoiceListening(false);

      const finalDraft = cleanVoiceTranscript(`${nativeSpeechFinalTranscriptRef.current} ${nativeSpeechInterimTranscriptRef.current}`);
      nativeSpeechFinalTranscriptRef.current = "";
      nativeSpeechInterimTranscriptRef.current = "";
      if (finalDraft) {
        nativeSpeechRecognitionIssueRef.current = null;
        submitVoiceTranscript(finalDraft);
        return;
      }

      const issue = nativeSpeechRecognitionIssueRef.current ?? "no-speech";
      nativeSpeechRecognitionIssueRef.current = null;
      setVoiceInputIssue(issue);
      setVoiceStatus("error");
    };

    try {
      recognition.start();
      nativeSpeechRecognitionRef.current = recognition;
      return true;
    } catch {
      teardownNativeSpeechRecognition(recognition);
      nativeSpeechRecognitionRef.current = null;
      nativeSpeechRecognitionIssueRef.current = null;
      nativeSpeechFinalTranscriptRef.current = "";
      nativeSpeechInterimTranscriptRef.current = "";
      setIsVoiceListening(false);
      setVoiceInputIssue("audio-capture");
      setVoiceStatus("error");
      return false;
    }
  }, [abortNativeSpeechCapture, abortQwenSpeechCapture, currentUser, input, language, stopTutorVoicePlayback, submitVoiceTranscript, teardownNativeSpeechRecognition]);
  const speakTutorText = useCallback(
    async (text: string, options?: { force?: boolean }) => {
      if (classroomFallbackOnly) return;
      if ((!options?.force && !voicePlaybackEnabled) || !setupStatus.voice?.configured || typeof window === "undefined") return;

      if (!currentUser) {
        setVoicePlaybackStatus("auth-required");
        return;
      }

      const speechText = cleanTutorSpeechText(text);
      if (!speechText) return;
      const sessionSnapshot = beginTutorSessionRequest();
      const expectedUserId = sessionSnapshot.identity?.userId;
      if (!expectedUserId) {
        releaseTutorSessionRequest(sessionSnapshot);
        setVoicePlaybackStatus("auth-required");
        return;
      }

      abortVoiceInputCapture();
      setVoiceStatus((current) => (current === "listening" || current === "processing" ? "idle" : current));
      stopTutorVoicePlayback();
      setVoicePlaybackStatus("loading");
      const controller = sessionSnapshot.controller;
      tutorVoiceAbortRef.current = controller;

      try {
        assertTutorSessionSnapshotCurrent(sessionSnapshot);
        const response = await fetch("/api/ai-tutor/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Expected-User-Id": expectedUserId
          },
          body: JSON.stringify({
            expectedUserId,
            text: speechText,
            language: fallbackLanguageForInput(language, speechText, [])
          }),
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal
        });

        if (await tutorResponseRequiresSessionRevalidation(response)) {
          invalidateTutorAuthEpoch();
          return;
        }
        assertTutorSessionSnapshotCurrent(sessionSnapshot);

        if (!response.ok) {
          setVoicePlaybackStatus("error");
          return;
        }

        const audioBlob = await response.blob();
        assertTutorSessionSnapshotCurrent(sessionSnapshot);

        const objectUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(objectUrl);
        tutorVoiceAudioRef.current = audio;
        tutorVoiceObjectUrlRef.current = objectUrl;
        const cleanupAudio = () => {
          if (tutorVoiceObjectUrlRef.current === objectUrl) {
            URL.revokeObjectURL(objectUrl);
            tutorVoiceObjectUrlRef.current = null;
            tutorVoiceAudioRef.current = null;
          }
        };
        audio.onended = () => {
          cleanupAudio();
          if (!tutorSessionSnapshotIsCurrent(sessionSnapshot)) return;
          setVoicePlaybackStatus((current) => (current === "playing" ? "idle" : current));
        };
        audio.onerror = () => {
          cleanupAudio();
          if (!tutorSessionSnapshotIsCurrent(sessionSnapshot)) return;
          setVoicePlaybackStatus("error");
        };
        assertTutorSessionSnapshotCurrent(sessionSnapshot);
        await audio.play();
        assertTutorSessionSnapshotCurrent(sessionSnapshot);
        setVoicePlaybackStatus("playing");
      } catch (error) {
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          !tutorSessionSnapshotIsCurrent(sessionSnapshot)
        ) return;
        stopTutorVoicePlayback("error");
      } finally {
        releaseTutorSessionRequest(sessionSnapshot);
        if (tutorVoiceAbortRef.current === controller) {
          tutorVoiceAbortRef.current = null;
        }
      }
    },
    [
      abortVoiceInputCapture,
      assertTutorSessionSnapshotCurrent,
      beginTutorSessionRequest,
      classroomFallbackOnly,
      currentUser,
      invalidateTutorAuthEpoch,
      language,
      releaseTutorSessionRequest,
      setupStatus.voice?.configured,
      stopTutorVoicePlayback,
      tutorSessionSnapshotIsCurrent,
      voicePlaybackEnabled
    ]
  );

  function handleReplyVoiceToggle() {
    if (classroomFallbackOnly) {
      setVoicePlaybackEnabled(false);
      stopTutorVoicePlayback();
      return;
    }
    if (!currentUser || !setupStatus.voice?.configured) {
      setVoicePlaybackStatus(currentUser ? "error" : "auth-required");
      return;
    }

    const next = !voicePlaybackEnabled;
    setVoicePlaybackEnabled(next);

    if (!next) {
      stopTutorVoicePlayback();
      return;
    }

    if (latestSpeakableTutorText) {
      void speakTutorText(latestSpeakableTutorText, { force: true });
    }
  }

  function handleVoiceInputToggle() {
    if (isSending) return;
    if (classroomFallbackOnly) {
      setVoiceInputIssue("not-configured");
      setVoiceStatus("error");
      return;
    }

    if (isVoiceListening) {
      setVoiceStatus("processing");
      if (nativeSpeechRecognitionRef.current) {
        finishNativeSpeechCapture();
        return;
      }
      if (qwenSpeechRecorderRef.current) {
        void finishQwenSpeechCapture();
        return;
      }
      abortVoiceInputCapture("idle");
      return;
    }

    if (currentUser && startNativeSpeechCapture()) {
      return;
    }

    if (currentUser && setupStatus.speech?.configured) {
      void startQwenSpeechCapture();
      return;
    }

    setVoiceInputIssue(currentUser ? "not-configured" : "auth-required");
    setVoiceStatus("error");
  }

  const sendTutorMessage = useCallback(
    async ({
      rawInput,
      contextOverride,
      attachmentsOverride,
      clearComposer = true
    }: SendTutorMessageOptions) => {
      const trimmed = rawInput.trim();
      if (!trimmed || isSending) return;
      const sessionSnapshot = beginTutorSessionRequest();

      const activeContext = contextOverride ?? context;
      const activeAttachments = attachmentsOverride ?? attachments;
      const fallbackLanguage = fallbackLanguageForInput(language, trimmed, messages);
      const requestContext = buildTutorRequestContext({
        context: activeContext,
        input: trimmed,
        grade: selectedGrade,
        language: fallbackLanguage,
        page: pathname,
        curriculumTrack: currentUser?.curriculumTrack
      });
      const fallbackReply = buildTutorReply(trimmed, requestContext, fallbackLanguage);
      const pendingMessageId = createMessageId("thinking");
      setMessages((current) => [
        ...current,
        tutorMessage("student", trimmed),
        { id: pendingMessageId, role: "tutor", content: "", status: "thinking" }
      ]);
      setContext(requestContext);
      if (clearComposer) {
        setInput("");
        setVoiceInputIssue(null);
        setVoiceStatus("idle");
      }
      abortVoiceInputCapture(clearComposer ? "idle" : voiceStatus);
      setIsSending(true);

      try {
        const effectiveClassroomPolicy = await loadClassroomPolicy(sessionSnapshot);
        assertTutorSessionSnapshotCurrent(sessionSnapshot);
        if ((effectiveClassroomPolicy ?? classroomPolicy)?.mode === "fallback-only") {
          const classroomReply = isChineseLanguage(fallbackLanguage)
            ? `${textForLanguage({
                en: "",
                zh: "班級即時 AI 已暫停，Nova 先用本機提示陪你完成下一步。",
                zhHans: "班级即时 AI 已暂停，Nova 先用本机提示陪你完成下一步。"
              }, fallbackLanguage)} ${fallbackReply}`
            : `Class live AI is paused. Nova will use a local tutor hint for this step. ${fallbackReply}`;
          setMessages((current) =>
            current.map((message) =>
              message.id === pendingMessageId
                ? { id: createMessageId("fallback"), role: "tutor", content: classroomReply, status: "typing" }
                : message
            )
          );
          setAttachments([]);
          return;
        }

        const reply = await requestTutorReply({
          input: trimmed,
          messages,
          context: requestContext,
          grade: selectedGrade,
          language: fallbackLanguage,
          page: pathname,
          attachments: activeAttachments,
          expectedUserId: sessionSnapshot.identity?.userId,
          signal: sessionSnapshot.controller.signal,
          assertSessionCurrent: () => assertTutorSessionSnapshotCurrent(sessionSnapshot),
          onSessionConflict: invalidateTutorAuthEpoch,
          onStreamChunk: (delta) => {
            assertTutorSessionSnapshotCurrent(sessionSnapshot);
            setMessages((current) =>
              current.map((message) =>
                message.id === pendingMessageId
                  ? {
                      ...message,
                      content: `${message.content}${delta}`,
                      status: "typing"
                    }
                  : message
              )
            );
          }
        });
        assertTutorSessionSnapshotCurrent(sessionSnapshot);

        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessageId
              ? { id: createMessageId("reply"), role: "tutor", content: reply.reply, visualization: reply.visualization, status: "typing" }
              : message
          )
        );
        setAttachments([]);
      } catch (error) {
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          !tutorSessionSnapshotIsCurrent(sessionSnapshot)
        ) return;
        const safeReason = visibleFallbackReason(error instanceof Error ? error.message : "");
        const fallbackModeLabel = setupStatus.state === "configured"
          ? textForLanguage({ en: "Nova fallback hint", zh: "Nova 暫時提示" }, fallbackLanguage)
          : textForLanguage(dictionary.aiTutor.localHelperMode, fallbackLanguage);
        const fallbackHint = textForLanguage(dictionary.aiTutor.fallbackHint, fallbackLanguage);
        const reply = isChineseLanguage(fallbackLanguage)
          ? `${fallbackModeLabel}。${fallbackHint} ${fallbackReply}`
          : `${fallbackModeLabel}${safeReason ? ` (${safeReason})` : ""}. ${fallbackHint} ${fallbackReply}`;

        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessageId
              ? { id: createMessageId("fallback"), role: "tutor", content: reply, status: "typing" }
              : message
          )
        );
        setAttachments([]);
      } finally {
        releaseTutorSessionRequest(sessionSnapshot);
        if (
          tutorProviderMountedRef.current &&
          sameTutorSessionIdentity(sessionSnapshot.identity, tutorSessionIdentityRef.current)
        ) {
          setIsSending(false);
        }
      }
    },
    [
      attachments,
      context,
      currentUser?.curriculumTrack,
      currentUser?.id,
      classroomPolicy,
      isSending,
      assertTutorSessionSnapshotCurrent,
      beginTutorSessionRequest,
      invalidateTutorAuthEpoch,
      language,
      loadClassroomPolicy,
      messages,
      pathname,
      selectedGrade,
      setupStatus.state,
      abortVoiceInputCapture,
      releaseTutorSessionRequest,
      tutorSessionSnapshotIsCurrent,
      voiceStatus
    ]
  );
  sendTutorMessageRef.current = sendTutorMessage;

  const value = useMemo<AITutorContextValue>(
    () => ({
      openTutor: (nextContext, options) => {
        const initialInput = options?.initialInput?.trim() ?? "";
        const initialReply = options?.initialReply?.trim() ?? "";
        openRequestedRef.current = true;
        recordLearningEvent({
          type: "hint-request",
          source: "ai-tutor",
          topicId: nextContext?.topicId ?? nextContext?.mode ?? "general",
          questionId: nextContext?.questionId
        });
        setContext(nextContext);
        setOpen(true);
        setVoiceInputIssue(null);
        setVoiceStatus("idle");
        abortVoiceInputCapture();
        setMessages((current) => [
          ...(hasStudentMessage(current) ? current : []),
          tutorMessage("tutor", openingMessage(nextContext, language, isGuestSession))
        ]);

        if (!initialInput) return;
        if (initialReply) {
          setInput("");
          setMessages((current) => [
            ...(hasStudentMessage(current) ? current : []),
            tutorMessage("tutor", openingMessage(nextContext, language, isGuestSession)),
            tutorMessage("student", initialInput),
            {
              id: createMessageId(options?.novaLensRunId ? `nova-lens-${options.novaLensRunId}` : "nova-lens"),
              role: "tutor",
              content: initialReply,
              status: "typing"
            }
          ]);
          return;
        }
        if (options?.autoSend) {
          setInput("");
          void sendTutorMessage({
            rawInput: initialInput,
            contextOverride: nextContext,
            attachmentsOverride: [],
            clearComposer: true
          });
          return;
        }
        setInput(initialInput);
      }
    }),
    [abortVoiceInputCapture, isGuestSession, language, recordLearningEvent, sendTutorMessage]
  );

  useEffect(() => {
    return () => {
      abortVoiceInputCapture();
      stopTutorVoicePlayback();
    };
  }, [abortVoiceInputCapture, stopTutorVoicePlayback]);

  useEffect(() => {
    setSpeechSupported(Boolean(getNativeSpeechRecognitionConstructor()) || Boolean(setupStatus.speech?.configured));
  }, [setupStatus.speech?.configured]);

  useEffect(() => {
    setMessages((current) => {
      if (hasStudentMessage(current)) return current;
      return [tutorMessage("tutor", openingMessage(context, language, isGuestSession))];
    });
  }, [context, isGuestSession, language]);

  useEffect(() => {
    if (!currentUser) return;

    setMessages((current) => {
      const messagesWithoutGuestSignup = current.filter((message) => !isGuestSignupTutorMessage(message));
      if (messagesWithoutGuestSignup.length === current.length) return current;
      return messagesWithoutGuestSignup.length
        ? messagesWithoutGuestSignup
        : [tutorMessage("tutor", openingMessage(context, language, false))];
    });
  }, [context, currentUser?.id, language]);

  useEffect(() => {
    if (!settingsReady) {
      setDraftReady(false);
      setLoadedDraftStorageKey(null);
      return;
    }

    const storedDraft = readStoredTutorDraft(draftOwner);
    const hasPendingOpenRequest = openRequestedRef.current;
    if (!storedDraft) {
      setOpen(hasPendingOpenRequest);
      if (!hasPendingOpenRequest) {
        setContext(undefined);
        setInput("");
        setMessages([tutorMessage("tutor", openingMessage(undefined, language, isGuestSession))]);
      }
      setAttachments([]);
      setAttachmentMenuOpen(false);
      setVoiceInputIssue(null);
      setVoiceStatus("idle");
      abortVoiceInputCapture();
      setIsSending(false);
      setLoadedDraftStorageKey(draftStorageKey);
      setDraftReady(true);
      openRequestedRef.current = false;
      return;
    }

    setOpen(hasPendingOpenRequest || storedDraft.open);
    if (!hasPendingOpenRequest) {
      setContext(storedDraft.context);
      setInput(storedDraft.input);
      setMessages(storedDraft.messages);
    }
    setAttachments([]);
    setAttachmentMenuOpen(false);
    setVoiceInputIssue(null);
    setVoiceStatus("idle");
    abortVoiceInputCapture();
    setIsSending(false);
    setLoadedDraftStorageKey(draftStorageKey);
    setDraftReady(true);
    openRequestedRef.current = false;
  }, [abortVoiceInputCapture, draftOwner, draftStorageKey, isGuestSession, language, settingsReady]);

  useEffect(() => {
    if (!settingsReady || !draftReady || loadedDraftStorageKey !== draftStorageKey) return;

    rememberTutorDraft(draftOwner, {
      open,
      context,
      input,
      messages
    });
  }, [context, draftOwner, draftReady, draftStorageKey, input, loadedDraftStorageKey, messages, open, settingsReady]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [isSending, messages, scrollMessagesToBottom]);

  useEffect(() => {
    let cancelled = false;

    async function loadSetupStatus() {
      try {
        const response = await fetch("/api/ai-tutor/status", {
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error("AI Tutor status unavailable.");
        const status = readSetupStatus(await response.json());
        if (!cancelled) setSetupStatus(status);
      } catch {
        if (!cancelled) setSetupStatus({ state: "local-helper" });
      }
    }

    void loadSetupStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (voicePlaybackEnabled && setupStatus.voice?.configured && currentUser) return;
    stopTutorVoicePlayback();
    if (!setupStatus.voice?.configured || !currentUser) setVoicePlaybackEnabled(false);
  }, [currentUser, setupStatus.voice?.configured, stopTutorVoicePlayback, voicePlaybackEnabled]);

  const setupStatusLabel = useMemo(() => {
    if (setupStatus.state === "checking") return t(tutorUiCopy.setupChecking);
    if (setupStatus.state === "configured") return t(tutorUiCopy.liveConfigured);
    return t(dictionary.aiTutor.localHelperMode);
  }, [setupStatus.state, t]);
  const tutorPanelOpen = open && draftReady && loadedDraftStorageKey === draftStorageKey;
  const isImmersiveGameRoute = isImmersiveStudentPracticeGamePath(pathname);
  const isAuthUtilityRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/change-password";
  const showTutorLauncher = !tutorPanelOpen && !isAuthUtilityRoute;
  const replyVoiceAvailable = Boolean(currentUser && setupStatus.voice?.configured && !classroomFallbackOnly);
  const replyVoiceNote = textForLanguage(
    classroomFallbackOnly
      ? {
          en: "Reply voice is off while class AI is paused.",
          zh: "班級 AI 暫停時不朗讀回覆。",
          zhHans: "班级 AI 暂停时不朗读回复。"
        }
      : !currentUser
      ? tutorVoiceCopy.replyVoiceSignInNote
      : !setupStatus.voice?.configured
      ? tutorVoiceCopy.replyVoiceDisabledNote
      : voicePlaybackEnabled
        ? tutorVoiceCopy.replyVoiceOn
        : tutorVoiceCopy.replyVoiceOff,
    language
  );
  const replyVoicePlaybackStatusLabel = useMemo(() => {
    if (voicePlaybackStatus === "loading") return textForLanguage(tutorVoiceCopy.replyVoiceLoading, language);
    if (voicePlaybackStatus === "playing") return textForLanguage(tutorVoiceCopy.replyVoicePlaying, language);
    if (voicePlaybackStatus === "auth-required") return textForLanguage(tutorVoiceCopy.replyVoiceAuthRequired, language);
    if (voicePlaybackStatus === "error") return textForLanguage(tutorVoiceCopy.replyVoiceError, language);
    return "";
  }, [language, voicePlaybackStatus]);
  const voiceSettingsButtonLabel = textForLanguage(
    voiceSettingsOpen ? tutorVoiceCopy.voiceSettingsClose : tutorVoiceCopy.voiceSettingsOpen,
    language
  );
  const voiceInputIssueLabel = useMemo(() => {
    if (voiceInputIssue === "auth-required") return textForLanguage(tutorVoiceCopy.voiceInputAuthRequired, language);
    if (voiceInputIssue === "not-configured") return textForLanguage(tutorVoiceCopy.voiceInputNotConfigured, language);
    if (setupStatus.state !== "checking" && !setupStatus.speech?.configured) return textForLanguage(tutorVoiceCopy.voiceInputNotConfigured, language);
    if (!speechSupported || voiceInputIssue === "unsupported") return textForLanguage(tutorVoiceCopy.voiceInputUnavailable, language);
    if (voiceInputIssue === "not-allowed") return textForLanguage(tutorVoiceCopy.voiceInputBlocked, language);
    if (voiceInputIssue === "audio-capture") return textForLanguage(tutorVoiceCopy.voiceInputCheckMic, language);
    if (voiceInputIssue === "network") return textForLanguage(tutorVoiceCopy.voiceInputNetwork, language);
    if (voiceInputIssue === "no-speech") return textForLanguage(tutorVoiceCopy.voiceTryAgain, language);
    if (voiceInputIssue === "unknown") return textForLanguage(tutorVoiceCopy.voiceRetry, language);
    return textForLanguage(tutorVoiceCopy.voiceTryAgain, language);
  }, [language, setupStatus.speech?.configured, setupStatus.state, speechSupported, voiceInputIssue]);
  const voiceStatusLabel = useMemo(() => {
    if (!currentUser) return textForLanguage(tutorVoiceCopy.voiceInputAuthRequired, language);
    if (classroomFallbackOnly) {
      return textForLanguage({
        en: "Class AI is paused",
        zh: "班級 AI 已暫停",
        zhHans: "班级 AI 已暂停"
      }, language);
    }
    if (!speechSupported) return `${voiceInputIssueLabel} · ${setupStatusLabel}`;
    if (voiceStatus === "listening") return textForLanguage(tutorVoiceCopy.voiceListening, language);
    if (voiceStatus === "processing") return textForLanguage(tutorVoiceCopy.voiceProcessing, language);
    if (voiceStatus === "error") return `${voiceInputIssueLabel} · ${setupStatusLabel}`;
    return `${textForLanguage(tutorVoiceCopy.voiceReady, language)} · ${setupStatusLabel}`;
  }, [classroomFallbackOnly, currentUser, language, setupStatusLabel, speechSupported, voiceInputIssueLabel, voiceStatus]);
  const showVoiceStatusPanel = voiceStatus === "listening" || voiceStatus === "processing" || voiceStatus === "error";

  useEffect(() => {
    if (!currentUser || !tutorPanelOpen) return;
    let cancelled = false;
    void loadClassroomPolicy();
    const interval = window.setInterval(() => {
      if (!cancelled) void loadClassroomPolicy();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUser, loadClassroomPolicy, tutorPanelOpen]);

  useEffect(() => {
    if (!classroomFallbackOnly) return;
    setAttachmentMenuOpen(false);
    setAttachments([]);
    setVoicePlaybackEnabled(false);
    stopTutorVoicePlayback();
    abortVoiceInputCapture();
  }, [abortVoiceInputCapture, classroomFallbackOnly, stopTutorVoicePlayback]);

  useEffect(() => {
    if (!tutorPanelOpen || setupStatus.state !== "configured") return;
    const controller = new AbortController();
    void fetch("/api/ai-tutor", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    }).catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [setupStatus.state, tutorPanelOpen]);

  useEffect(() => {
    if (tutorPanelOpen) return;
    abortVoiceInputCapture();
    stopTutorVoicePlayback();
    setIsVoiceListening(false);
    setVoiceSettingsOpen(false);
  }, [abortVoiceInputCapture, stopTutorVoicePlayback, tutorPanelOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isVoiceListening) {
      if (nativeSpeechRecognitionRef.current) {
        finishNativeSpeechCapture();
        return;
      }
      if (qwenSpeechRecorderRef.current) {
        void finishQwenSpeechCapture();
        return;
      }
      abortVoiceInputCapture("idle");
    }
    void sendTutorMessage({ rawInput: input });
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (classroomFallbackOnly) {
      event.currentTarget.value = "";
      setAttachmentMenuOpen(false);
      return;
    }
    if (!files.length) {
      setAttachmentMenuOpen(false);
      return;
    }

    const addedAt = Date.now();
    setAttachments((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${addedAt}-${index}`,
	        name: file.name,
	        size: file.size,
	        file
	      }))
    ].slice(0, 6));
    setAttachmentMenuOpen(false);
    event.currentTarget.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function openAttachmentPicker() {
    if (classroomFallbackOnly) return;
    attachmentInputRef.current?.click();
    setAttachmentMenuOpen(false);
  }

  return (
    <AITutorContext.Provider value={value}>
      {children}
      <NovaLensGlobalOverlay onOpenTutor={value.openTutor} />
      <button
        type="button"
        onClick={() => {
          openRequestedRef.current = true;
          recordLearningEvent({ type: "hint-request", source: "ai-tutor", topicId: "general" });
          setOpen(true);
          setContext(undefined);
          setMessages((current) =>
            hasStudentMessage(current)
              ? current
              : [tutorMessage("tutor", openingMessage(undefined, language, isGuestSession))]
          );
        }}
        aria-labelledby="ai-tutor-launcher-label"
        data-tour="student-tutor"
        className={cn(
          "focus-ring group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-[70] isolate h-14 w-14 max-w-[calc(100vw-1.5rem)] items-center justify-center gap-2 overflow-hidden rounded-full border border-cyan-200/65 bg-slate-950 p-0 text-xs font-black text-cyan-50 shadow-[0_20px_55px_rgba(8,145,178,0.35)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-fuchsia-200/80 hover:shadow-[0_24px_70px_rgba(217,70,239,0.28)] sm:bottom-5 sm:right-5 sm:h-auto sm:w-auto sm:min-w-[9.25rem] sm:px-4 sm:py-3 sm:text-sm dark:border-cyan-100/35 dark:bg-slate-950/90",
          showTutorLauncher ? (isImmersiveGameRoute ? "hidden sm:inline-flex" : "inline-flex") : "hidden"
        )}
        >
        <span id="ai-tutor-launcher-label" className="sr-only">{t(tutorUiCopy.button)}</span>
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_130deg,rgba(34,211,238,0.92),rgba(129,140,248,0.35),rgba(217,70,239,0.82),rgba(34,211,238,0.92))] opacity-75 blur-[1px] transition duration-500 group-hover:rotate-180 group-hover:opacity-100"
        />
        <span
          aria-hidden="true"
          className="absolute inset-[2px] -z-10 rounded-full bg-[radial-gradient(circle_at_26%_18%,rgba(103,232,249,0.44),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(30,27,75,0.95),rgba(83,19,97,0.92))]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-12 -z-10 w-10 rotate-12 bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-56"
        />
        <span aria-hidden="true" className="relative grid h-7 w-7 shrink-0 place-items-center sm:h-8 sm:w-8">
          <span className="absolute inset-0 rounded-full bg-cyan-300/30 blur-md transition duration-300 group-hover:bg-fuchsia-300/35" />
          <span className="absolute inset-0 rounded-full border border-cyan-100/70 border-t-fuchsia-200/90 animate-[spin_6s_linear_infinite]" />
          <span className="absolute inset-[6px] rounded-full border border-white/30 border-b-cyan-100/90 animate-[spin_4s_linear_infinite_reverse]" />
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.95)] transition duration-300 group-hover:bg-fuchsia-100 group-hover:shadow-[0_0_20px_rgba(240,171,252,0.95)]" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{t(tutorUiCopy.button)}</span>
      </button>

      {tutorPanelOpen ? (
        <aside
          role="dialog"
          data-ai-tutor-panel="true"
          data-nova-lens-ignore="true"
          aria-modal="false"
          aria-label={t(tutorUiCopy.button)}
          className={cn(
            "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[80] max-h-[calc(100dvh-1.5rem)] min-h-0 w-auto flex-col overflow-hidden rounded-[1.5rem] border border-cyan-300/35 bg-white shadow-2xl shadow-slate-950/25 dark:bg-slate-950 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[min(720px,calc(100vh-2.5rem))] sm:w-[min(420px,calc(100vw-2rem))]",
            isImmersiveGameRoute ? "hidden sm:flex" : "flex"
          )}
        >
          <div className="border-b border-slate-200/70 bg-slate-950 px-5 py-4 text-white dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{t(tutorUiCopy.button)}</p>
                <h2 className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xl font-black leading-tight sm:gap-3">
                  <span className="min-w-0">{textForLanguage(tutorNames, language)}</span>
                  <NovaMark compact />
                </h2>
              </div>
              <div className="relative flex shrink-0 items-start gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceSettingsOpen((current) => !current)}
                  aria-label={voiceSettingsButtonLabel}
                  aria-controls="ai-tutor-voice-settings"
                  aria-expanded={voiceSettingsOpen}
                  className={cn(
                    "focus-ring grid h-11 w-11 place-items-center rounded-full p-0 transition duration-200 hover:brightness-110",
                    voiceSettingsOpen ? "drop-shadow-[0_0_14px_rgba(34,211,238,0.55)]" : "drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
                  )}
                >
                  <VoiceSettingsIcon />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openRequestedRef.current = false;
                    abortVoiceInputCapture();
                    stopTutorVoicePlayback();
                    setVoiceSettingsOpen(false);
                    setOpen(false);
                  }}
                  aria-labelledby="ai-tutor-close-label"
                  className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-black hover:bg-white/20"
                >
                  <span id="ai-tutor-close-label" className="sr-only">{t(tutorUiCopy.close)}</span>
                  <span aria-hidden="true">×</span>
                </button>
                {voiceSettingsOpen ? (
                  <div
                    id="ai-tutor-voice-settings"
                    className="absolute right-0 top-12 z-20 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-cyan-100/30 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/25 dark:border-cyan-300/20 dark:bg-slate-900 dark:text-white"
                  >
                    <h3 className="text-sm font-black">{textForLanguage(tutorVoiceCopy.voiceSettings, language)}</h3>
                    <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-slate-100 p-3 dark:bg-white/[0.08]">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {textForLanguage(tutorVoiceCopy.replyVoice, language)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-300">
                          {textForLanguage(tutorVoiceCopy.replyVoiceDescription, language)}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={voicePlaybackEnabled}
                        aria-label={textForLanguage(tutorVoiceCopy.replyVoice, language)}
                        onClick={handleReplyVoiceToggle}
                        disabled={!replyVoiceAvailable}
                        className={cn(
                          "focus-ring relative h-8 w-14 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-55",
                          voicePlaybackEnabled
                            ? "border-cyan-200 bg-cyan-500"
                            : "border-slate-300 bg-slate-300 dark:border-slate-500 dark:bg-slate-600"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-md transition",
                            voicePlaybackEnabled ? "left-7 text-cyan-600" : "left-1 text-slate-500"
                          )}
                        />
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">
                      {replyVoiceNote}
                    </p>
                    {replyVoicePlaybackStatusLabel ? (
                      <p
                        role="status"
                        aria-live="polite"
                        className={cn(
                          "mt-3 rounded-2xl border px-3 py-2 text-xs font-bold leading-5",
                          voicePlaybackStatus === "error" || voicePlaybackStatus === "auth-required"
                            ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-100"
                            : "border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-300/25 dark:bg-cyan-400/10 dark:text-cyan-50"
                        )}
                      >
                        {replyVoicePlaybackStatusLabel}
                      </p>
                    ) : null}
                    {voicePlaybackEnabled && replyVoiceAvailable && latestSpeakableTutorText ? (
                      <button
                        type="button"
                        onClick={() => void speakTutorText(latestSpeakableTutorText, { force: true })}
                        disabled={voicePlaybackStatus === "loading"}
                        className="focus-ring mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
                      >
                        {textForLanguage(tutorVoiceCopy.replyVoiceReplay, language)}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {classroomFallbackOnly ? (
            <div className="border-b border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
              {textForLanguage({
                en: "Class AI is paused. Local hints stay available.",
                zh: "班級 AI 已暫停，仍可使用本機提示。",
                zhHans: "班级 AI 已暂停，仍可使用本机提示。"
              }, language)}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => {
              const quickChoices = message.role === "tutor" && !message.status
                ? tutorMessageQuickChoices(message.content, language)
                : [];
              const displayText = message.role === "tutor" ? tutorDisplayText(message.content) : message.content;

              return (
                <div
                  key={message.id ?? `${message.role}-${index}`}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-base leading-7 sm:text-lg sm:leading-8",
                    message.role === "tutor"
                      ? "whitespace-pre-line border border-cyan-200/70 bg-cyan-50 text-slate-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50"
                      : "ml-8 bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  )}
                >
                  {message.status === "thinking" ? (
                    <ThinkingBubble language={language} />
                  ) : (
                    <TypewriterMathText
                      active={message.status === "typing"}
                      text={displayText}
                      onProgress={scrollMessagesToBottom}
                      onDone={() => {
                        if (!message.id) return;
                        if (message.role === "tutor") void speakTutorText(message.content);
                        setMessages((current) =>
                          current.map((currentMessage) =>
                            currentMessage.id === message.id
                              ? { ...currentMessage, status: undefined }
                              : currentMessage
                          )
                        );
                      }}
                    />
                  )}
                  {quickChoices.length ? (
                    <div className="mt-3 grid gap-2 whitespace-normal">
                      {quickChoices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => void sendTutorMessage({ rawInput: choice.prompt })}
                          disabled={isSending}
                          className="focus-ring flex min-h-11 w-full items-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-left text-sm font-black leading-5 text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-55 dark:border-cyan-100/20 dark:bg-slate-950/55 dark:text-cyan-50 dark:hover:border-cyan-200/45 dark:hover:bg-cyan-300/10 sm:text-base"
                        >
                          <span className="min-w-0">{choice.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.visualization ? <TutorVisualizationPanel visualization={message.visualization} /> : null}
                </div>
              );
            })}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form onSubmit={handleSubmit} className="relative shrink-0 border-t border-slate-200/70 p-4 dark:border-white/10">
            <label className="sr-only" htmlFor="ai-tutor-input">{t(tutorUiCopy.ask)}</label>
            <textarea
              id="ai-tutor-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              disabled={isSending}
              placeholder={t(dictionary.aiTutor.placeholder)}
              className="focus-ring w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base leading-7 text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white sm:text-lg sm:leading-8"
            />
            {showVoiceStatusPanel ? (
              <div
                role="status"
                aria-live="polite"
                className={cn(
                  "mt-3 rounded-2xl border px-3 py-2 text-xs font-semibold leading-5",
                  voiceStatus === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-100"
                    : "border-cyan-200/80 bg-cyan-50/70 text-slate-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50"
                )}
              >
                {voiceStatus === "listening" ? (
                  <span className="flex items-center gap-2">
                    <VoiceLevelBars />
                    <span>{textForLanguage(tutorVoiceCopy.voiceListening, language)}</span>
                  </span>
                ) : voiceStatus === "processing" ? (
                  <span>{textForLanguage(tutorVoiceCopy.voiceProcessing, language)}</span>
                ) : (
                  <span>{voiceInputIssueLabel}</span>
                )}
              </div>
            ) : null}
            {attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200"
                  >
                    <span className="max-w-[11rem] truncate">{attachment.name}</span>
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">{formatAttachmentSize(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className="focus-ring -mr-1 rounded-full px-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex min-w-0 items-center gap-2">
                <input
                  ref={attachmentInputRef}
                  id="ai-tutor-attachments"
                  type="file"
                  multiple
                  disabled={classroomFallbackOnly}
                  onChange={handleAttachmentChange}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="hidden"
                />
                {attachmentMenuOpen ? (
                  <div
                    id="ai-tutor-attachment-menu"
                    className="absolute bottom-full left-0 mb-3 w-max max-w-[calc(100vw-3.5rem)] overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-2 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      className="focus-ring inline-flex max-w-full cursor-pointer items-center gap-4 whitespace-nowrap rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/[0.08]"
                      onClick={openAttachmentPicker}
                    >
                      <PaperclipIcon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 truncate">{textForLanguage(tutorVoiceCopy.attachmentMenuItem, language)}</span>
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={textForLanguage(tutorVoiceCopy.addAttachments, language)}
                  aria-haspopup="menu"
                  aria-controls="ai-tutor-attachment-menu"
                  aria-expanded={attachmentMenuOpen}
                  disabled={classroomFallbackOnly}
                  onClick={() => setAttachmentMenuOpen((current) => !current)}
                  className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-slate-100 text-2xl font-light leading-none text-slate-500 transition hover:border-cyan-300/70 hover:bg-cyan-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:border-cyan-200/50 dark:hover:bg-white/[0.12] dark:hover:text-white"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleVoiceInputToggle}
                  disabled={isSending || !speechSupported || classroomFallbackOnly}
                  aria-label={textForLanguage(isVoiceListening ? tutorVoiceCopy.voiceStop : tutorVoiceCopy.voiceStart, language)}
                  aria-pressed={isVoiceListening}
                  className={cn(
                    "focus-ring relative grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                    isVoiceListening
                      ? "border-rose-200 bg-rose-500 text-white shadow-[0_0_0_7px_rgba(244,63,94,0.14),0_14px_30px_rgba(244,63,94,0.2)]"
                      : "border-cyan-200/80 bg-slate-950 text-cyan-50 shadow-[0_0_0_7px_rgba(34,211,238,0.12),0_14px_30px_rgba(8,145,178,0.18)] hover:border-fuchsia-200/80 hover:text-fuchsia-50 dark:border-cyan-100/35"
                  )}
                >
                  {isVoiceListening ? (
                    <span className="absolute inset-0 rounded-full border border-white/40 animate-ping motion-reduce:animate-none" />
                  ) : null}
                  <MicrophoneIcon className="relative h-5 w-5" />
                </button>
                <p className="min-w-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isSending ? t(tutorUiCopy.thinking) : voiceStatusLabel}
                </p>
              </div>
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="focus-ring min-h-11 w-full shrink-0 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 sm:w-auto"
              >
                {isSending ? t(dictionary.aiTutor.sending) : t(dictionary.aiTutor.send)}
              </button>
            </div>
          </form>
        </aside>
      ) : null}
    </AITutorContext.Provider>
  );
}

export function useAITutor() {
  const context = useContext(AITutorContext);
  if (!context) {
    throw new Error("useAITutor must be used within AITutorProvider");
  }
  return context;
}
