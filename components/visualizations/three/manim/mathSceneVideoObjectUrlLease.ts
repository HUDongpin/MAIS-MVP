import type { MathSceneVideoExportError } from "./mathSceneVideoExportContract";

export type MathSceneVideoObjectUrlAdapter = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
};

export type MathSceneVideoDownloadLease = {
  blob: Blob;
  generation: number;
  isCurrent: () => boolean;
  url: string;
};

export type MathSceneVideoObjectUrlLeaseSnapshot = {
  activeLeaseCount: number;
  disposed: boolean;
  generation: number;
  hasReadyBlob: boolean;
  readyByteLength: number;
  readyMimeType: string | null;
};

export type MathSceneVideoLeaseOperation<T> =
  | { ok: true; value: T }
  | { error: MathSceneVideoExportError; ok: false };

export type MathSceneVideoObjectUrlLeaseManager = {
  handleRetry: () => void;
  handleSceneSwitch: () => void;
  handleUnmount: () => void;
  replaceReadyBlob: (blob: Blob) => MathSceneVideoLeaseOperation<{ generation: number }>;
  snapshot: () => MathSceneVideoObjectUrlLeaseSnapshot;
  withDownloadLease: <T>(
    action: (lease: MathSceneVideoDownloadLease) => T | Promise<T>
  ) => Promise<MathSceneVideoLeaseOperation<T>>;
};

function leaseError(
  code: Extract<
    MathSceneVideoExportError["code"],
    | "OBJECT_URL_LEASE_UNAVAILABLE"
    | "OBJECT_URL_LEASE_DISPOSED"
    | "VIDEO_BLOB_EMPTY"
    | "VIDEO_MIME_MISMATCH"
  >,
  message: string,
  path: string
): MathSceneVideoLeaseOperation<never> {
  return { error: { code, message, path }, ok: false };
}

export function createMathSceneVideoObjectUrlLeaseManager(
  adapter: MathSceneVideoObjectUrlAdapter
): MathSceneVideoObjectUrlLeaseManager {
  let disposed = false;
  let generation = 0;
  let readyBlob: Blob | null = null;
  let nextLeaseId = 1;
  const activeLeases = new Map<number, string>();

  function revokeLease(leaseId: number) {
    const url = activeLeases.get(leaseId);
    if (!url) return;
    activeLeases.delete(leaseId);
    try {
      adapter.revokeObjectURL(url);
    } catch {
      // Revocation remains logically complete even when the host adapter throws.
    }
  }

  function revokeAll() {
    for (const leaseId of [...activeLeases.keys()]) revokeLease(leaseId);
  }

  function clearReadyState() {
    const hadState = readyBlob !== null || activeLeases.size > 0;
    revokeAll();
    readyBlob = null;
    if (hadState) generation += 1;
  }

  function snapshot(): MathSceneVideoObjectUrlLeaseSnapshot {
    return {
      activeLeaseCount: activeLeases.size,
      disposed,
      generation,
      hasReadyBlob: readyBlob !== null,
      readyByteLength: readyBlob?.size ?? 0,
      readyMimeType: readyBlob?.type || null
    };
  }

  function replaceReadyBlob(blob: Blob): MathSceneVideoLeaseOperation<{ generation: number }> {
    if (disposed) {
      return leaseError("OBJECT_URL_LEASE_DISPOSED", "Object URL lease manager is disposed.", "manager");
    }
    if (!(blob instanceof Blob) || blob.size <= 0) {
      return leaseError("VIDEO_BLOB_EMPTY", "Ready video Blob must be non-empty.", "blob");
    }
    if (!blob.type.toLowerCase().startsWith("video/webm")) {
      return leaseError("VIDEO_MIME_MISMATCH", "Ready video Blob must use a WebM MIME type.", "blob.type");
    }

    revokeAll();
    generation += 1;
    readyBlob = blob;
    return { ok: true, value: { generation } };
  }

  async function withDownloadLease<T>(
    action: (lease: MathSceneVideoDownloadLease) => T | Promise<T>
  ): Promise<MathSceneVideoLeaseOperation<T>> {
    if (disposed) {
      return leaseError("OBJECT_URL_LEASE_DISPOSED", "Object URL lease manager is disposed.", "manager");
    }
    const blob = readyBlob;
    if (!blob) {
      return leaseError("OBJECT_URL_LEASE_UNAVAILABLE", "No ready video Blob is available for download.", "blob");
    }

    let url: string;
    try {
      url = adapter.createObjectURL(blob);
      if (typeof url !== "string" || url.length === 0) throw new TypeError("Object URL adapter returned no URL.");
    } catch {
      return leaseError("OBJECT_URL_LEASE_UNAVAILABLE", "Could not create a temporary download URL.", "adapter.createObjectURL");
    }

    const leaseId = nextLeaseId;
    nextLeaseId += 1;
    const leaseGeneration = generation;
    activeLeases.set(leaseId, url);
    try {
      const value = await action({
        blob,
        generation: leaseGeneration,
        isCurrent: () => !disposed && readyBlob === blob && generation === leaseGeneration,
        url
      });
      return { ok: true, value };
    } catch {
      return leaseError("OBJECT_URL_LEASE_UNAVAILABLE", "Temporary download action failed safely.", "download");
    } finally {
      revokeLease(leaseId);
    }
  }

  return {
    handleRetry: () => {
      if (!disposed) clearReadyState();
    },
    handleSceneSwitch: () => {
      if (!disposed) clearReadyState();
    },
    handleUnmount: () => {
      if (disposed) return;
      clearReadyState();
      disposed = true;
    },
    replaceReadyBlob,
    snapshot,
    withDownloadLease
  };
}
