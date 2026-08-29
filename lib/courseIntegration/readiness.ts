export type ExternalIntegrationGateState = "disabled" | "unconfigured";

export const EXTERNAL_COURSE_INTEGRATION_READINESS = Object.freeze({
  lms: Object.freeze({
    provider: "unconfigured" as const,
    coursePublishing: "disabled" as const,
    packageUpload: "disabled" as const,
    externalWrites: "disabled" as const,
    rosterSync: "disabled" as const
  }),
  lti: Object.freeze({
    provider: "unconfigured" as const,
    login: "disabled" as const,
    launch: "disabled" as const,
    gradePassback: "disabled" as const,
    rosterSync: "disabled" as const
  })
});
