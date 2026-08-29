"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LocalizedText, StudentAvatarId } from "@/types";
import { avatarUploadAccept, avatarUploadImageDataUrl, isSupportedAvatarUploadFile } from "./studentProfileAvatarUpload";

type AvatarPreset = {
  id: StudentAvatarId;
  label: LocalizedText;
  className: string;
  mascot: AvatarMascot;
};

type AvatarMascot = "cosmicCat" | "orbitAlien" | "solarPup" | "mintAlien" | "skyBunny" | "novaBlob";

const avatarPresets: AvatarPreset[] = [
  {
    id: "delta",
    label: { en: "Cosmic cat", zh: "星空貓", zhHans: "星空猫" },
    className: "from-cyan-300 via-violet-400 to-fuchsia-400",
    mascot: "cosmicCat"
  },
  {
    id: "pi",
    label: { en: "Orbit alien", zh: "軌道外星人", zhHans: "轨道外星人" },
    className: "from-emerald-300 via-cyan-400 to-sky-500",
    mascot: "orbitAlien"
  },
  {
    id: "sigma",
    label: { en: "Solar pup", zh: "陽光小狗", zhHans: "阳光小狗" },
    className: "from-amber-200 via-orange-400 to-rose-400",
    mascot: "solarPup"
  },
  {
    id: "theta",
    label: { en: "Mint alien", zh: "薄荷外星人", zhHans: "薄荷外星人" },
    className: "from-lime-200 via-emerald-400 to-teal-500",
    mascot: "mintAlien"
  },
  {
    id: "function",
    label: { en: "Sky bunny", zh: "天空兔", zhHans: "天空兔" },
    className: "from-blue-300 via-indigo-400 to-violet-500",
    mascot: "skyBunny"
  },
  {
    id: "radical",
    label: { en: "Nova blob", zh: "新星外星人", zhHans: "新星外星人" },
    className: "from-rose-200 via-pink-400 to-purple-500",
    mascot: "novaBlob"
  }
];

const maxAvatarImageDataUrlLength = 900_000;
const avatarCanvasSize = 384;

function avatarFor(id?: StudentAvatarId) {
  return avatarPresets.find((avatar) => avatar.id === id) ?? avatarPresets[0];
}

function MascotAvatar({ mascot }: { mascot: AvatarMascot }) {
  const commonProps = {
    "aria-hidden": true,
    className: "h-full w-full drop-shadow-sm",
    fill: "none",
    viewBox: "10 8 76 80"
  };

  switch (mascot) {
    case "cosmicCat":
      return (
        <svg {...commonProps}>
          <path d="M26 37 18 18l22 11" fill="#f8fafc" />
          <path d="M70 37 78 18 56 29" fill="#f8fafc" />
          <path d="M30 35 24 27l11 5" fill="#f0abfc" opacity="0.8" />
          <path d="M66 35 72 27l-11 5" fill="#f0abfc" opacity="0.8" />
          <circle cx="48" cy="53" r="29" fill="#f8fafc" />
          <circle cx="37" cy="49" r="4.6" fill="#0f172a" />
          <circle cx="59" cy="49" r="4.6" fill="#0f172a" />
          <circle cx="38.5" cy="47.5" r="1.4" fill="#ffffff" />
          <circle cx="60.5" cy="47.5" r="1.4" fill="#ffffff" />
          <path d="M47 56h2l-1 2.5Z" fill="#f472b6" />
          <path d="M42 62c3.2 3 8.8 3 12 0" stroke="#0f172a" strokeLinecap="round" strokeWidth="3" />
          <path d="M25 57h11M26 64h11M60 57h11M59 64h11" stroke="#94a3b8" strokeLinecap="round" strokeWidth="2.4" />
          <path d="M74 13v9M69.5 17.5h9" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
        </svg>
      );
    case "orbitAlien":
      return (
        <svg {...commonProps}>
          <path d="M26 62c13 9 31 10 44 1" stroke="#dffbff" strokeLinecap="round" strokeWidth="5" opacity="0.65" />
          <path d="M35 30c0-9 26-9 26 0" stroke="#dffbff" strokeLinecap="round" strokeWidth="4" />
          <circle cx="31" cy="30" r="5" fill="#dcfce7" />
          <circle cx="65" cy="30" r="5" fill="#dcfce7" />
          <path d="M23 58c0-20 10.5-32 25-32s25 12 25 32c0 17-11 26-25 26s-25-9-25-26Z" fill="#f8fafc" />
          <ellipse cx="38" cy="55" rx="7.2" ry="10.5" fill="#0f172a" />
          <ellipse cx="58" cy="55" rx="7.2" ry="10.5" fill="#0f172a" />
          <circle cx="40" cy="51" r="2" fill="#ffffff" />
          <circle cx="60" cy="51" r="2" fill="#ffffff" />
          <path d="M42 69c4 2.5 8 2.5 12 0" stroke="#22c55e" strokeLinecap="round" strokeWidth="3.2" />
          <circle cx="48" cy="39" r="3.4" fill="#67e8f9" />
        </svg>
      );
    case "solarPup":
      return (
        <svg {...commonProps}>
          <path d="M24 43c-7 9-4 26 7 28 8 1.5 13-7 10-16-2-7-10-15-17-12Z" fill="#fff7ed" opacity="0.92" />
          <path d="M72 43c7 9 4 26-7 28-8 1.5-13-7-10-16 2-7 10-15 17-12Z" fill="#fff7ed" opacity="0.92" />
          <circle cx="48" cy="52" r="29" fill="#fff7ed" />
          <path d="M29 46c2-10 10-17 19-17s17 7 19 17c-10-6-28-6-38 0Z" fill="#fed7aa" />
          <circle cx="38" cy="53" r="4.5" fill="#111827" />
          <circle cx="58" cy="53" r="4.5" fill="#111827" />
          <path d="M42 61c0-3 12-3 12 0 0 4-3 7-6 7s-6-3-6-7Z" fill="#fb7185" />
          <path d="M45 59h6l-3 3.5Z" fill="#0f172a" />
          <path d="M37 72c5.5 4.5 16.5 4.5 22 0" stroke="#fb923c" strokeLinecap="round" strokeWidth="3.2" />
          <circle cx="30" cy="59" r="3" fill="#fdba74" opacity="0.75" />
          <circle cx="66" cy="59" r="3" fill="#fdba74" opacity="0.75" />
        </svg>
      );
    case "mintAlien":
      return (
        <svg {...commonProps}>
          <path d="M35 32 25 18M61 32l10-14" stroke="#ecfeff" strokeLinecap="round" strokeWidth="4.2" />
          <circle cx="24" cy="17" r="5.5" fill="#ecfeff" />
          <circle cx="72" cy="17" r="5.5" fill="#ecfeff" />
          <path d="M21 57c0-18 10.5-30 27-30s27 12 27 30c0 19-12 28-27 28s-27-9-27-28Z" fill="#f0fdfa" />
          <path d="M28 37c8-11 32-11 40 0-10-4-30-4-40 0Z" fill="#99f6e4" />
          <circle cx="37" cy="54" r="5.5" fill="#0f172a" />
          <circle cx="59" cy="54" r="5.5" fill="#0f172a" />
          <circle cx="38.5" cy="52" r="1.6" fill="#ffffff" />
          <circle cx="60.5" cy="52" r="1.6" fill="#ffffff" />
          <path d="M42 68c3.5 3 8.5 3 12 0" stroke="#0d9488" strokeLinecap="round" strokeWidth="3.4" />
          <path d="M23 48c-8 1-11 13-2 18M73 48c8 1 11 13 2 18" stroke="#ecfeff" strokeLinecap="round" strokeWidth="5" />
        </svg>
      );
    case "skyBunny":
      return (
        <svg {...commonProps}>
          <path d="M35 42c-5-19-3-30 5-31 8-1 12 13 9 31" fill="#eff6ff" />
          <path d="M58 42c4-19 2-30-6-31-8-1-12 13-8 31" fill="#eff6ff" />
          <path d="M40 36c-2-10-1-17 2-18 3-1 5 7 3 18M54 36c2-10 1-17-2-18-3-1-5 7-3 18" stroke="#c4b5fd" strokeLinecap="round" strokeWidth="4" />
          <circle cx="48" cy="56" r="28" fill="#eff6ff" />
          <circle cx="38" cy="55" r="4.4" fill="#111827" />
          <circle cx="58" cy="55" r="4.4" fill="#111827" />
          <path d="M46 63h4l-2 3Z" fill="#fb7185" />
          <path d="M43 70c3 2.4 7 2.4 10 0" stroke="#6366f1" strokeLinecap="round" strokeWidth="3" />
          <circle cx="31" cy="63" r="4" fill="#f9a8d4" opacity="0.7" />
          <circle cx="65" cy="63" r="4" fill="#f9a8d4" opacity="0.7" />
          <path d="M72 24h8M76 20v8" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
        </svg>
      );
    case "novaBlob":
      return (
        <svg {...commonProps}>
          <path d="M31 37c-9-1-15-8-15-15 9 1 17 6 20 14" fill="#fdf2f8" />
          <path d="M65 37c9-1 15-8 15-15-9 1-17 6-20 14" fill="#fdf2f8" />
          <path d="M20 58c0-18 13-30 28-30s28 12 28 30c0 17-10 27-28 27S20 75 20 58Z" fill="#fdf2f8" />
          <path d="M33 39c7-8 23-8 30 0" stroke="#f0abfc" strokeLinecap="round" strokeWidth="5" />
          <circle cx="36" cy="55" r="5" fill="#0f172a" />
          <circle cx="60" cy="55" r="5" fill="#0f172a" />
          <circle cx="48" cy="48" r="4.5" fill="#a855f7" />
          <circle cx="49.5" cy="46.5" r="1.4" fill="#ffffff" />
          <path d="M41 68c4 3.5 10 3.5 14 0" stroke="#db2777" strokeLinecap="round" strokeWidth="3.4" />
          <circle cx="29" cy="63" r="3" fill="#f9a8d4" opacity="0.75" />
          <circle cx="67" cy="63" r="3" fill="#f9a8d4" opacity="0.75" />
        </svg>
      );
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image file."));
    image.src = dataUrl;
  });
}

async function prepareAvatarImage(file: File) {
  if (!isSupportedAvatarUploadFile(file)) {
    throw new Error("Unsupported profile image.");
  }

  const image = await loadImage(avatarUploadImageDataUrl(file, await readFileAsDataUrl(file)));
  const canvas = document.createElement("canvas");
  canvas.width = avatarCanvasSize;
  canvas.height = avatarCanvasSize;

  const context = canvas.getContext("2d");
  if (!context || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("Could not prepare profile image.");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, avatarCanvasSize, avatarCanvasSize);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, avatarCanvasSize, avatarCanvasSize);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  if (dataUrl.length > maxAvatarImageDataUrlLength) {
    throw new Error("Prepared profile image is too large.");
  }

  return dataUrl;
}

type StudentProfilePanelForUserProps = {
  userId: string;
  initialName: string;
  initialAvatarId?: StudentAvatarId;
  initialAvatarImageDataUrl?: string;
};

export function StudentProfilePanel() {
  const { currentUser } = useSettings();

  if (!currentUser || currentUser.role !== "student") return null;

  return (
    <StudentProfilePanelForUser
      key={`${currentUser.id}:${currentUser.role}`}
      userId={currentUser.id}
      initialName={currentUser.name}
      initialAvatarId={currentUser.avatarId}
      initialAvatarImageDataUrl={currentUser.avatarImageDataUrl}
    />
  );
}

function StudentProfilePanelForUser({
  userId,
  initialName,
  initialAvatarId,
  initialAvatarImageDataUrl
}: StudentProfilePanelForUserProps) {
  const { currentUser, language, t, text, updateProfile } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftName, setDraftName] = useState(initialName);
  const [draftAvatarId, setDraftAvatarId] = useState<StudentAvatarId>(initialAvatarId ?? "delta");
  const [draftAvatarImagePreviewUrl, setDraftAvatarImagePreviewUrl] = useState<string | undefined>(initialAvatarImageDataUrl);
  const [freshAvatarImageDataUrl, setFreshAvatarImageDataUrl] = useState<string | undefined>();
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setDraftName(currentUser?.name ?? "");
    setDraftAvatarId(currentUser?.avatarId ?? "delta");
    setDraftAvatarImagePreviewUrl(currentUser?.avatarImageDataUrl);
    setFreshAvatarImageDataUrl(undefined);
    setUploadError("");
  }, [currentUser?.id, currentUser?.name, currentUser?.avatarId, currentUser?.avatarImageDataUrl]);

  useEffect(() => {
    setStatus("idle");
  }, [currentUser?.id]);

  const activeAvatar = avatarFor(draftAvatarId);
  const cleanDraftName = draftName.trim().replace(/\s+/g, " ");
  const currentAvatarImageDataUrl = currentUser?.avatarImageDataUrl ?? "";
  const draftAvatarImageValue = draftAvatarImagePreviewUrl ?? "";
  const uploadErrorCopy = t({ en: "Choose a JPG, PNG, or WebP image under 5 MB.", zh: "請選擇 5 MB 以下的 JPG、PNG 或 WebP 圖像。", zhHans: "请选择 5 MB 以下的 JPG、PNG 或 WebP 图像。" });
  const isDirty = Boolean(
    currentUser &&
      (cleanDraftName !== currentUser.name ||
        draftAvatarId !== currentUser.avatarId ||
        draftAvatarImageValue !== currentAvatarImageDataUrl)
  );
  const canSave = isDirty && cleanDraftName.length >= 2 && cleanDraftName.length <= 48 && !isSaving && !isPreparingImage;
  const localizedName = useMemo(
    () => formatLearnerName(currentUser?.name ?? t(dictionary.aiTutor.student), language),
    [currentUser?.name, language, t]
  );

  if (!currentUser || currentUser.role !== "student" || currentUser.id !== userId) return null;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setStatus("idle");
    try {
      const avatarImageDataUrl = freshAvatarImageDataUrl
        ? freshAvatarImageDataUrl
        : !draftAvatarImagePreviewUrl && currentAvatarImageDataUrl
          ? null
          : undefined;
      const result = await updateProfile({
        name: cleanDraftName,
        avatarId: draftAvatarId,
        avatarImageDataUrl
      });
      setStatus(result.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsPreparingImage(true);
    setUploadError("");
    setStatus("idle");

    try {
      const dataUrl = await prepareAvatarImage(file);
      setDraftAvatarImagePreviewUrl(dataUrl);
      setFreshAvatarImageDataUrl(dataUrl);
    } catch {
      setUploadError(uploadErrorCopy);
    } finally {
      setIsPreparingImage(false);
    }
  };

  return (
    <section aria-labelledby="student-profile-title">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] text-white shadow-glow ring-1 ring-white/35",
            draftAvatarImagePreviewUrl ? "bg-slate-100 dark:bg-slate-900" : `bg-gradient-to-br ${activeAvatar.className}`
          )}
          aria-hidden="true"
        >
          {draftAvatarImagePreviewUrl ? (
            <img key={currentUser.id} src={draftAvatarImagePreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MascotAvatar mascot={activeAvatar.mascot} />
          )}
        </div>
        <div className="min-w-0">
          <p id="student-profile-title" className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t({ en: "Student profile", zh: "學生檔案", zhHans: "学生档案" })}
          </p>
          <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{localizedName}</h2>
        </div>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-600 dark:text-slate-300">
        {t({ en: "Display name", zh: "顯示名稱", zhHans: "显示名称" })}
        <input
          value={draftName}
          onChange={(event) => {
            setDraftName(event.target.value);
            setStatus("idle");
          }}
          maxLength={48}
          className="focus-ring mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none transition dark:border-white/10 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-slate-600 dark:text-slate-300">{t({ en: "Avatar", zh: "頭像", zhHans: "头像" })}</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {avatarPresets.map((avatar) => {
            const selected = !draftAvatarImagePreviewUrl && avatar.id === draftAvatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                aria-pressed={selected}
                aria-label={text(avatar.label)}
                onClick={() => {
                  setDraftAvatarId(avatar.id);
                  setDraftAvatarImagePreviewUrl(undefined);
                  setFreshAvatarImageDataUrl(undefined);
                  setUploadError("");
                  setStatus("idle");
                }}
                className={cn(
                  "focus-ring grid h-12 place-items-center overflow-hidden rounded-2xl border text-white transition hover:-translate-y-0.5",
                  `bg-gradient-to-br ${avatar.className}`,
                  selected ? "border-white shadow-glow ring-2 ring-cyan-300/80" : "border-white/20 opacity-80 hover:opacity-100"
                )}
              >
                <MascotAvatar mascot={avatar.mascot} />
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={Boolean(draftAvatarImagePreviewUrl)}
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparingImage}
            className={cn(
              "focus-ring flex min-h-12 items-center justify-center rounded-2xl border border-dashed px-3 text-center text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70",
              draftAvatarImagePreviewUrl
                ? "border-cyan-300 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-300/70 dark:bg-cyan-300/10 dark:text-cyan-100"
                : "border-slate-300 bg-white/80 text-slate-700 hover:border-cyan-300 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200"
            )}
          >
            {isPreparingImage
              ? t({ en: "Preparing photo...", zh: "正在準備相片...", zhHans: "正在准备相片..." })
              : draftAvatarImagePreviewUrl
                ? t({ en: "Photo selected", zh: "已選相片", zhHans: "已选相片" })
                : t({ en: "Upload photo", zh: "上載相片", zhHans: "上载相片" })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="focus-ring flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-950"
          >
            {isSaving ? t({ en: "Saving...", zh: "正在儲存...", zhHans: "正在保存..." }) : t({ en: "Save profile", zh: "儲存檔案", zhHans: "保存档案" })}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={avatarUploadAccept}
            onChange={handleAvatarUpload}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        {uploadError ? <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">{uploadError}</p> : null}
        {status === "saved" ? <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">{t({ en: "Saved", zh: "已儲存", zhHans: "已保存" })}</p> : null}
        {status === "error" ? <p className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-300">{t({ en: "Could not save", zh: "無法儲存", zhHans: "无法保存" })}</p> : null}
      </fieldset>
    </section>
  );
}
