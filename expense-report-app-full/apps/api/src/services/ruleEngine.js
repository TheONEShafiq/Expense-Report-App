import { prisma } from "../db/prisma.js";

async function getFxRateFor(date) {
  const rows = await prisma.fx_rates.findMany({ where: { as_of_date: { lte: date } }, orderBy: { as_of_date: "desc" }, take: 1 });
  const r = rows[0];
  return r ? r.usd_to_mxn_rate : 17.5;
}

function normalize(amount, from, to, rate) {
  if (from === to) return amount;
  return to === "USD" ? amount / rate : amount * rate;
}

export async function evaluateReport(reportId) {
  const report = await prisma.reports.findUnique({ where: { id: reportId }, include: { company: true, expenses: true } });
  if (!report) return;

  const rate = await getFxRateFor(report.week_start_date);
  const perDiem = await prisma.per_diem_policies.findFirst({ where: { company_id: report.company_id, active: true } });
  const limits = await prisma.preapproval_limits.findMany({ where: { company_id: report.company_id } });

  for (const line of report.expenses) {
    const limit = limits.find(l => l.category === line.category) || { limit_amount: Infinity, currency: report.company.base_currency };
    const norm = normalize(line.amount, line.currency, limit.currency, rate);
    const dayStart = new Date(line.date); dayStart.setUTCHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setUTCHours(23,59,59,999);

    const sameDay = await prisma.expenses.findMany({
      where: { user_id: report.user_id, date: { gte: dayStart, lte: dayEnd }, report_id: report.id }
    });
    const dayTotal = sameDay.reduce((sum, e) => sum + normalize(e.amount, e.currency, limit.currency, rate), 0);

    const withinLimit = norm <= limit.limit_amount;
    const withinPerDiem = perDiem ? (dayTotal <= perDiem.daily_total) : true;

    const status = (withinLimit && withinPerDiem) ? "Approved" : "Exception";
    await prisma.expenses.update({ where: { id: line.id }, data: { status } });
  }

  const refreshed = await prisma.reports.findUnique({ where: { id: reportId }, include: { expenses: true } });
  const allApproved = refreshed.expenses.every(e => e.status === "Approved");
  await prisma.reports.update({
    where: { id: reportId },
    data: { status: allApproved ? "Approved" : "In Review" }
  });

  return { status: allApproved ? "Approved" : "In Review" };
}
