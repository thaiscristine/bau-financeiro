import { auth } from "@/auth";
import { todayISO } from "@/lib/format";
import { buildReport } from "@/lib/reports/build";
import { parseReportFilters } from "@/lib/reports/filters";
import { fetchReportRows, filterNames, listFilterOptions } from "@/lib/reports/queries";
import { reportWorkbook } from "@/lib/reports/xlsx";

// Downloads the report described by the query string, the same one /reports previews
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Faça login para baixar relatórios.", { status: 401 });

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const today = todayISO();
  const [rows, options] = await Promise.all([fetchReportRows(filters, today), listFilterOptions()]);
  const report = buildReport(filters, rows, filterNames(options), today);
  const file = await reportWorkbook(report, today);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // The plain name for old clients, the encoded one for accents
      "Content-Disposition": `attachment; filename="${report.fileName}"; filename*=UTF-8''${encodeURIComponent(report.fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
