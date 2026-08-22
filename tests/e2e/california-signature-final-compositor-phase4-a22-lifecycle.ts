import type {
  CaliforniaPhase4A22LifecycleLease
} from "./california-signature-final-compositor-phase4-a22-lifecycle-contract";

/**
 * Diagnostic production boundary. A22 has not yet installed the process-held
 * lifecycle authority, so ordinary imports cannot turn caller-controlled
 * ambient state or copied receipt bytes into provenance.
 */
export async function publishCaliforniaPhase4A22DiagnosticLifecycle():
Promise<CaliforniaPhase4A22LifecycleLease> {
  if (arguments.length !== 0) {
    throw new Error(
      "California Phase4 A22 lifecycle publisher takes no caller-authored authority or receipt"
    );
  }
  throw new Error(
    "California Phase4 A22 lifecycle HOLD: no in-process lifecycle authority is installed; " +
    "formal execution authorization remains false"
  );
}
