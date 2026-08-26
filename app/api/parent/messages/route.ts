import {
  createParentMessagePostHandler,
  createParentMessagesGetHandler
} from "@/app/api/parent/messageHandlers";

export const runtime = "nodejs";

export const GET = createParentMessagesGetHandler();
export const POST = createParentMessagePostHandler();
