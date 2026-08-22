import type {
  CaliforniaSignatureFinalCompositorPhase3CampaignPublication,
  CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt,
  CaliforniaSignatureFinalCompositorPhase3MeasurementDriver,
  CaliforniaSignatureFinalCompositorPhase3PlanBinding,
  CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import {
  bindCaliforniaSignatureFinalCompositorPhase3TestSourcePlan,
  disposeCaliforniaSignatureFinalCompositorPhase3TestCampaign,
  executeCaliforniaSignatureFinalCompositorPhase3TestCampaign,
  produceCaliforniaSignatureFinalCompositorPhase3TestCurrentSourceReceipt
} from "./california-signature-final-compositor-phase3-measurement-campaign.test-support";

type TestFixture = {
  bindSourcePlan(
    sourceReceipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt
  ): CaliforniaSignatureFinalCompositorPhase3PlanBinding;
  dispose(publication: CaliforniaSignatureFinalCompositorPhase3CampaignPublication): void;
  execute(options: {
    driver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver;
    nowMonotonicNs: () => bigint;
    producerIdentity: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
    sourceReceipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt;
  }): Promise<CaliforniaSignatureFinalCompositorPhase3CampaignPublication>;
  produceCurrentSourceReceipt(): Promise<
    CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt
  >;
};

export const californiaSignatureFinalCompositorPhase3MeasurementCampaignTestFixture =
  Object.freeze({
    bindSourcePlan: bindCaliforniaSignatureFinalCompositorPhase3TestSourcePlan,
    dispose: disposeCaliforniaSignatureFinalCompositorPhase3TestCampaign,
    execute: executeCaliforniaSignatureFinalCompositorPhase3TestCampaign,
    produceCurrentSourceReceipt:
      produceCaliforniaSignatureFinalCompositorPhase3TestCurrentSourceReceipt
  }) satisfies TestFixture;
