import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStorageReadinessSnapshot } from "@/lib/server/userStore";
import { createStorageHealthRouteHandler } from "./handler";

export const runtime = "nodejs";

export const GET = createStorageHealthRouteHandler({
  authenticate: requireAuthenticatedUser,
  readStorageReadinessSnapshot: getStorageReadinessSnapshot
});
