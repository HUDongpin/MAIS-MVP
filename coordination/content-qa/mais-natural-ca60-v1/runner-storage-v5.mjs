import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  validateProviderAttemptReceiptV2,
} from "./openai-reference-adapter-v5.mjs";
import {
  createAttemptReceiptStoreV1,
} from "./runner-storage.mjs";

function provisionalReceipt(payload) {
  const body = {
    ...structuredClone(payload),
    sequenceNumber: 1,
    previousReceiptHash: null,
  };
  return { ...body, selfHash: jcsHash(body) };
}

/**
 * A semantic V2 wrapper over the already-tested append-only/0600 store. It
 * validates a receipt before the underlying lock can append any bytes, then
 * revalidates the actual sequence/hash assigned under that lock.
 */
export function createProviderAttemptReceiptStoreV2({ repoRoot, runId }) {
  const base = createAttemptReceiptStoreV1({ repoRoot, runId });
  return Object.freeze({
    path: base.path,
    async append(payload) {
      const preflightErrors = validateProviderAttemptReceiptV2(provisionalReceipt(payload));
      if (preflightErrors.length > 0) throw new Error(`ProviderAttemptReceiptV2 rejected before append: ${preflightErrors.join("; ")}`);
      const receipt = await base.append(payload);
      const errors = validateProviderAttemptReceiptV2(receipt);
      if (errors.length > 0) throw new Error(`ProviderAttemptReceiptV2 invalid after append: ${errors.join("; ")}`);
      return receipt;
    },
    async read() {
      const receipts = await base.read();
      const errors = receipts.flatMap((receipt, index) => validateProviderAttemptReceiptV2(receipt)
        .map((error) => `attempt ${index + 1}: ${error}`));
      if (errors.length > 0) throw new Error(`ProviderAttemptReceiptV2 chain invalid: ${errors.join("; ")}`);
      return receipts;
    },
    async validate() {
      const result = await base.validate();
      const semanticErrors = result.receipts.flatMap((receipt, index) => validateProviderAttemptReceiptV2(receipt)
        .map((error) => `attempt ${index + 1}: ${error}`));
      return {
        receipts: result.receipts,
        errors: [...new Set([...result.errors, ...semanticErrors])],
      };
    },
  });
}
