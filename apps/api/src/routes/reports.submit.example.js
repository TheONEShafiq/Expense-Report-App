// Example submit route wiring (merge with your existing /reports router)import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { notifyApproversOnSubmit } from "../services/notifications.js";

export const reportsRouter = Router();

// POST /reports/:id/submit -> evaluate + notify approvers
reportsRouter.post("/:id/submit", requireAuth, async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    // TODO: your submit + evaluation logic first
    await notifyApproversOnSubmit(reportId);
    res.json({ ok: true, emailNotified: true });
  } catch (err) { next(err); }
});
