import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { readStoredMediaObject } from "@/lib/server/mediaObjectStore";

export const runtime = "nodejs";

function statusForReadResult(status: "not-found" | "forbidden" | "expired" | "rejected") {
  if (status === "forbidden") return 403;
  if (status === "expired") return 410;
  if (status === "rejected") return 500;
  return 404;
}

export async function GET(_request: Request, { params }: { params: Promise<{ objectKey?: string[] }> }) {
  const authenticated = await requireAuthenticatedUser(_request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { objectKey = [] } = await params;
  const joinedObjectKey = objectKey.join("/");
  const result = await readStoredMediaObject({
    objectKey: joinedObjectKey,
    requester: {
      id: authenticated.user.id,
      role: authenticated.user.role
    }
  });

  if (result.status !== "ok") {
    return NextResponse.json(
      { code: result.code, error: result.message },
      { status: statusForReadResult(result.status) }
    );
  }

  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(result.bytes.byteLength),
      "Content-Type": result.metadata.mimeType,
      "X-Media-Retention-Expires-At": result.metadata.retentionExpiresAt,
      "X-Media-Scan-Status": result.metadata.scanStatus
    }
  });
}
