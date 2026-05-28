"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { curriculumProfileLabel } from "@/lib/curriculumProfile";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LocalizedText, StudentAvatarId } from "@/types";

type AvatarPreset = {
  id: StudentAvatarId;
  symbol: string;
  label: LocalizedText;
  className: string;
};

const avatarPresets: AvatarPreset[] = [
  {
    id: "delta",
    symbol: "∆",
    label: { en: "Delta gradient", zh: "Delta 漸層" },
    className: "from-cyan-300 via-violet-400 to-fuchsia-400"
  },
  {
    id: "pi",
    symbol: "π",
    label: { en: "Pi focus", zh: "Pi 專注" },
    className: "from-emerald-300 via-cyan-400 to-sky-500"
  },
  {
    id: "sigma",
    symbol: "Σ",
    label: { en: "Sigma mastery", zh: "Sigma 掌握" },
    className: "from-amber-200 via-orange-400 to-rose-400"
  },
  {
    id: "theta",
    symbol: "θ",
    label: { en: "Theta explorer", zh: "Theta 探索" },
    className: "from-lime-200 via-emerald-400 to-teal-500"
  },
  {
    id: "function",
    symbol: "f",
    label: { en: "Function lab", zh: "函數實驗" },
    className: "from-blue-300 via-indigo-400 to-violet-500"
  },
  {
    id: "radical",
    symbol: "√",
    label: { en: "Radical spark", zh: "根號靈感" },
    className: "from-rose-200 via-pink-400 to-purple-500"
  }
];

const avatarUploadAccept = "image/jpeg,image/png,image/webp";
const maxAvatarUploadBytes = 5 * 1024 * 1024;
const maxAvatarImageDataUrlLength = 900_000;
const avatarCanvasSize = 384;

function avatarFor(id?: StudentAvatarId) {
  return avatarPresets.find((avatar) => avatar.id === id) ?? avatarPresets[0];
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
  if (!avatarUploadAccept.split(",").includes(file.type) || file.size > maxAvatarUploadBytes) {
    throw new Error("Unsupported profile image.");
  }

  const image = await loadImage(await readFileAsDataUrl(file));
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

export function StudentProfilePanel() {
  const { currentUser, language, selectedGrade, t, text, updateProfile } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAvatarId, setDraftAvatarId] = useState<StudentAvatarId>("delta");
  const [draftAvatarImageDataUrl, setDraftAvatarImageDataUrl] = useState<string | undefined>();
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setDraftName(currentUser?.name ?? "");
    setDraftAvatarId(currentUser?.avatarId ?? "delta");
    setDraftAvatarImageDataUrl(currentUser?.avatarImageDataUrl);
    setUploadError("");
  }, [currentUser?.id, currentUser?.name, currentUser?.avatarId, currentUser?.avatarImageDataUrl]);

  useEffect(() => {
    setStatus("idle");
  }, [currentUser?.id]);

  const activeAvatar = avatarFor(draftAvatarId);
  const cleanDraftName = draftName.trim().replace(/\s+/g, " ");
  const currentAvatarImageDataUrl = currentUser?.avatarImageDataUrl ?? "";
  const draftAvatarImageValue = draftAvatarImageDataUrl ?? "";
  const uploadErrorCopy = t({ en: "Choose a JPG, PNG, or WebP image under 5 MB.", zh: "請選擇 5 MB 以下的 JPG、PNG 或 WebP 圖像。" });
  const isDirty = Boolean(
    currentUser &&
      (cleanDraftName !== currentUser.name ||
        draftAvatarId !== currentUser.avatarId ||
        draftAvatarImageValue !== currentAvatarImageDataUrl)
  );
  const canSave = isDirty && cleanDraftName.length >= 2 && cleanDraftName.length <= 48 && !isSaving && !isPreparingImage;
  const gradeLabel = formatGradeLabel(currentUser?.grade ?? selectedGrade, language, true);
  const courseLabel = currentUser ? t(curriculumProfileLabel(currentUser.curriculumProfile)) : "";
  const localizedName = useMemo(
    () => formatLearnerName(currentUser?.name ?? t(dictionary.aiTutor.student), language),
    [currentUser?.name, language, t]
  );

  if (!currentUser || currentUser.role !== "student") return null;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setStatus("idle");
    const result = await updateProfile({
      name: cleanDraftName,
      avatarId: draftAvatarId,
      avatarImageDataUrl: draftAvatarImageDataUrl ?? null
    });
    setStatus(result.ok ? "saved" : "error");
    setIsSaving(false);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsPreparingImage(true);
    setUploadError("");
    setStatus("idle");

    try {
      setDraftAvatarImageDataUrl(await prepareAvatarImage(file));
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
            "grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] text-4xl font-black text-white shadow-glow ring-1 ring-white/35",
            draftAvatarImageDataUrl ? "bg-slate-100 dark:bg-slate-900" : `bg-gradient-to-br ${activeAvatar.className}`
          )}
          aria-hidden="true"
        >
          {draftAvatarImageDataUrl ? (
            <img src={draftAvatarImageDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            activeAvatar.symbol
          )}
        </div>
        <div className="min-w-0">
          <p id="student-profile-title" className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t({ en: "Student profile", zh: "學生檔案" })}
          </p>
          <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{localizedName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{gradeLabel}</p>
          <p className="mt-1 break-words text-sm font-semibold text-cyan-600 [overflow-wrap:anywhere] dark:text-cyan-300">{courseLabel}</p>
        </div>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-600 dark:text-slate-300">
        {t({ en: "Display name", zh: "顯示名稱" })}
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
        <legend className="text-sm font-bold text-slate-600 dark:text-slate-300">{t({ en: "Avatar", zh: "頭像" })}</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {avatarPresets.map((avatar) => {
            const selected = !draftAvatarImageDataUrl && avatar.id === draftAvatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                aria-pressed={selected}
                aria-label={text(avatar.label)}
                onClick={() => {
                  setDraftAvatarId(avatar.id);
                  setDraftAvatarImageDataUrl(undefined);
                  setUploadError("");
                  setStatus("idle");
                }}
                className={cn(
                  "focus-ring grid h-12 place-items-center rounded-2xl border text-xl font-black text-white transition hover:-translate-y-0.5",
                  `bg-gradient-to-br ${avatar.className}`,
                  selected ? "border-white shadow-glow ring-2 ring-cyan-300/80" : "border-white/20 opacity-80 hover:opacity-100"
                )}
              >
                {avatar.symbol}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={Boolean(draftAvatarImageDataUrl)}
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparingImage}
            className={cn(
              "focus-ring col-span-3 flex min-h-12 items-center justify-center rounded-2xl border border-dashed px-3 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70",
              draftAvatarImageDataUrl
                ? "border-cyan-300 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-300/70 dark:bg-cyan-300/10 dark:text-cyan-100"
                : "border-slate-300 bg-white/80 text-slate-700 hover:border-cyan-300 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200"
            )}
          >
            {isPreparingImage
              ? t({ en: "Preparing photo...", zh: "正在準備相片..." })
              : draftAvatarImageDataUrl
                ? t({ en: "Photo selected", zh: "已選相片" })
                : t({ en: "Upload photo", zh: "上載相片" })}
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
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="focus-ring rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-950"
        >
          {isSaving ? t({ en: "Saving...", zh: "正在儲存..." }) : t({ en: "Save profile", zh: "儲存檔案" })}
        </button>
        {status === "saved" ? <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{t({ en: "Saved", zh: "已儲存" })}</span> : null}
        {status === "error" ? <span className="text-sm font-bold text-rose-600 dark:text-rose-300">{t({ en: "Could not save", zh: "無法儲存" })}</span> : null}
      </div>
    </section>
  );
}
