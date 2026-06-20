import { NextResponse } from "next/server";
import {
  checkLrsConnection,
  getLrsConfigStatus,
  isLrsSmokeRequestAuthorized,
  LrsDeliveryError
} from "@/lib/server/lrsClient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isLrsSmokeRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized LRS status request." }, { status: 401 });
  }

  const configStatus = getLrsConfigStatus();
  if (configStatus.status !== "configured") {
    return NextResponse.json({
      provider: "lrs",
      status: configStatus.status,
      missing: configStatus.missing,
      configured: configStatus.configured
    }, { status: configStatus.status === "disabled" ? 200 : 503 });
  }

  try {
    const connection = await checkLrsConnection();
    return NextResponse.json({
      provider: "lrs",
      status: connection.status,
      configured: configStatus.configured,
      httpStatus: connection.status === "ok" ? connection.httpStatus : undefined
    }, { status: connection.status === "ok" ? 200 : 503 });
  } catch (error) {
    if (error instanceof LrsDeliveryError) {
      return NextResponse.json({
        provider: "lrs",
        status: "failed",
        code: error.code,
        httpStatus: error.httpStatus,
        configured: configStatus.configured
      }, { status: 502 });
    }

    return NextResponse.json({
      provider: "lrs",
      status: "failed",
      code: "unknown",
      configured: configStatus.configured
    }, { status: 502 });
  }
}
