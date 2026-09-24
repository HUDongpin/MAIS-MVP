"use client";

import { useEffect } from "react";
import { installClientErrorListeners } from "@/lib/observability/browserReporter";

export { reportClientErrorPayload } from "@/lib/observability/browserReporter";

export function ClientErrorReporter() {
  useEffect(() => installClientErrorListeners(window), []);
  return null;
}
