import { createParentChildSummaryGetHandler } from "@/app/api/parent/handlers";

export const runtime = "nodejs";
export const GET = createParentChildSummaryGetHandler();
