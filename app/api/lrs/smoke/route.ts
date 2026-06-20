import { NextResponse } from "next/server";
import { isLrsSmokeRequestAuthorized, LrsDeliveryError, sendLrsSmokeStatement } from "@/lib/server/lrsClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isLrsSmokeRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized LRS smoke request." }, { status: 401 });
  }

  try {
    const result = await sendLrsSmokeStatement();
    return NextResponse.json({
      provider: "lrs",
      status: result.status,
      attempted: result.attempted,
      accepted: result.accepted
    }, { status: result.status === "sent" ? 200 : 503 });
  } catch (error) {
    if (error instanceof LrsDeliveryError) {
      return NextResponse.json({
        provider: "lrs",
        status: "failed",
        code: error.code,
        httpStatus: error.httpStatus
      }, { status: 502 });
    }

    return NextResponse.json({ provider: "lrs", status: "failed", code: "unknown" }, { status: 502 });
  }
}
