import { getStorageReadinessSnapshot } from "@/lib/server/userStore";
import { createHealthGetHandler } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The shared reader always requests includeDiagnosticsCounts:false from the existing contract.
export const GET = createHealthGetHandler({ probe: getStorageReadinessSnapshot });
