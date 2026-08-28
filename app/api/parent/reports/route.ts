import { createParentReportsGetHandler } from "@/app/api/parent/handlers";

export const runtime = "nodejs";
export const GET = createParentReportsGetHandler();
