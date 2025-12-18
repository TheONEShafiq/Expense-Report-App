import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { notifyEmployeeOnApproved, notifyEmployeeOnDeclined, notifyAdminsOnApproved } from "../services/notifications.js";

export const approvalsRouter = Router();
approvalsRouter.use(requireAuth);

approvalsRouter.get("/queue", async (req, res) => {
  const userCompanies = await prisma.user_companies.findMany({ where: { user_id: req.user.id } });
  const companyIds = userCompanies.map(uc => uc.company_id);
  const rows = await prisma.reports.findMany({ where: { company_id: { in: companyIds }, status: { in: ["In Review", "Changes Requested"] } } });
  res.json(rows);
});

approvalsRouter.post("/reports/:id/approve", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.reports.update({ where: { id }, data: { status: "Approved", approved_at: new Date() } });
    await notifyEmployeeOnApproved(id);
    await notifyAdminsOnApproved(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

approvalsRouter.post("/reports/:id/decline", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { notes } = req.body || {};
    await prisma.reports.update({ where: { id }, data: { status: "Changes Requested" } });
    if (notes) await prisma.approvals.create({ data: { report_id: id, approver_id: req.user.id, decision: "Denied", notes } });
    await notifyEmployeeOnDeclined(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
