import { createParentMessageReplyPostHandler } from "@/app/api/parent/messageHandlers";

export const runtime = "nodejs";

export const POST = createParentMessageReplyPostHandler();
