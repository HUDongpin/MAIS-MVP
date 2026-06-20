import { GET as exportCsvReport } from "../reports/export/route";
import { GET as exportPdfReport } from "../reports/pdf/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("format") === "pdf"
    ? exportPdfReport(request)
    : exportCsvReport(request);
}
