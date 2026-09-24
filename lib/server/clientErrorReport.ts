import { normalizeClientErrorPayload, type ClientErrorReport } from "../observability/errorPolicy";

export { clientErrorSources as allowedClientErrorSources } from "../observability/errorPolicy";
export type { ClientErrorReport } from "../observability/errorPolicy";
export const normalizeClientErrorReport = normalizeClientErrorPayload;

export function clientErrorFromReport(report: ClientErrorReport): Error {
  const error = new Error(report.message);
  error.name = report.name;
  error.stack = undefined;
  return error;
}
