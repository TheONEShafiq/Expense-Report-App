import { stringify } from "csv-stringify/sync";
import { prisma } from "../db/prisma.js";

export async function generateExport(companyId, period) {
  const approved = await prisma.reports.findMany({
    where: { company_id: Number(companyId), status: "Approved" },
    include: { expenses: true, user: true }
  });

  const rows = [];
  for (const r of approved) {
    for (const e of r.expenses) {
      rows.push([r.id, r.week_start_date.toISOString().slice(0,10), e.date.toISOString().slice(0,10), e.category, e.amount, e.currency, r.user.name]);
    }
  }
  const csv = stringify(rows, { header: true, columns: ["report_id","week","date","category","amount","currency","employee"] });
  return { csv };
}
