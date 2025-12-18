import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { notifyEmployeeOnApproved, notifyEmployeeOnDeclined, notifyAdminsOnApproved } from "../services/notifications.js";

export const approvalsRouter = Router();

// POST /approvals/reports/:id/approve
approvalsRouter.post("/reports/:id/approve", requireAuth, async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    // TODO: set report status -> Approved; persist line decisions
    await notifyEmployeeOnApproved(reportId);
    await notifyAdminsOnApproved(reportId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /approvals/reports/:id/decline
approvalsRouter.post("/reports/:id/decline", requireAuth, async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    // TODO: set report status -> Changes Requested / Declined with notes
    await notifyEmployeeOnDeclined(reportId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
