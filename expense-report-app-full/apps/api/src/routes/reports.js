import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { evaluateReport } from "../services/ruleEngine.js";
import { notifyApproversOnSubmit } from "../services/notifications.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.post("/", async (req, res) => {
  const { companyId, week_start_date, expenseIds } = req.body || {};
  const r = await prisma.reports.create({
    data: { user_id: req.user.id, company_id: Number(companyId), week_start_date: new Date(week_start_date), status: "Draft" }
  });
  if (Array.isArray(expenseIds) && expenseIds.length) {
    await prisma.expenses.updateMany({ where: { id: { in: expenseIds.map(Number) }, user_id: req.user.id }, data: { report_id: r.id } });
  }
  res.json(r);
});

reportsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    await prisma.reports.update({ where: { id: reportId }, data: { status: "In Review", submitted_at: new Date() } });
    await evaluateReport(reportId);
    await notifyApproversOnSubmit(reportId);
    res.json({ ok: true, emailNotified: true });
  } catch (e) { next(e); }
});

reportsRouter.get("/me", async (req, res) => {
  const rows = await prisma.reports.findMany({ where: { user_id: req.user.id }, orderBy: { id: "desc" } });
  res.json(rows);
});
