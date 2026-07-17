export const avatarUploadAccept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
export const maxAvatarUploadBytes = 5 * 1024 * 1024;

const canonicalAvatarMimeTypes = new Map([
  ["image/jpeg", "image/jpeg"],
  ["image/jpg", "image/jpeg"],
  ["image/pjpeg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/x-png", "image/png"],
  ["image/webp", "image/webp"]
]);

const mimeTypesThatNeedExtensionFallback = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "application/unknown",
  "application/x-unknown"
]);

const avatarExtensionMimeTypes = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"]
]);

function normalizedMimeType(type: string) {
  return type.trim().toLowerCase().split(";")[0] ?? "";
}

function uploadExtension(name: string) {
  return /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase() ?? "";
}

function avatarUploadMimeType(file: Pick<File, "name" | "type">) {
  const mimeType = normalizedMimeType(file.type);
  const canonicalMimeType = canonicalAvatarMimeTypes.get(mimeType);
  if (canonicalMimeType) return canonicalMimeType;
  if (!mimeTypesThatNeedExtensionFallback.has(mimeType)) return null;

  return avatarExtensionMimeTypes.get(uploadExtension(file.name)) ?? null;
}

export function isSupportedAvatarUploadFile(file: Pick<File, "name" | "size" | "type">) {
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxAvatarUploadBytes) {
    return false;
  }

  return Boolean(avatarUploadMimeType(file));
}

export function avatarUploadImageDataUrl(file: Pick<File, "name" | "type">, dataUrl: string) {
  const mimeType = avatarUploadMimeType(file);
  if (!mimeType || !/^data:[^,]*;base64,/i.test(dataUrl)) return dataUrl;

  return dataUrl.replace(/^data:[^,]*;base64,/i, `data:${mimeType};base64,`);
}
