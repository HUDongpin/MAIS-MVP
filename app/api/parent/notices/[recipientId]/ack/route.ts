import { createParentNoticeAckHandler } from "@/app/api/parent/handlers";

export const runtime = "nodejs";
export const POST = createParentNoticeAckHandler();
