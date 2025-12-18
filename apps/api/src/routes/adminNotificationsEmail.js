import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js"; // implement RBAC guard
import { prisma } from "../db/prisma.js";
import { sendEmail } from "../services/notifications.js";

export const adminNotificationsRouter = Router();

// settings(key TEXT PRIMARY KEY, value JSONB)

adminNotificationsRouter.get("/email-config", requireAdmin, async (req, res) => {
  const row = await prisma.settings.findUnique({ where: { key: "email_config" } });
  const v = (row?.value || {});
  res.json({ provider: "smtp", host: v.host || "", port: v.port || 587, username: v.username || "", fromAddress: v.fromAddress || "" });
});

adminNotificationsRouter.put("/email-config", requireAdmin, async (req, res) => {
  const { host, port, username, password, fromAddress } = req.body || {};
  const value = { provider: "smtp", host, port, username, fromAddress, hasPassword: !!password };
  await prisma.settings.upsert({
    where: { key: "email_config" },
    update: { value: { ...value, password } },
    create: { key: "email_config", value: { ...value, password } },
  });
  res.json({ ok: true });
});

adminNotificationsRouter.post("/email/test", requireAdmin, async (req, res, next) => {
  try {
    const { to, subject, text } = req.body || {};
    if (!to) return res.status(400).json({ error: "to required" });
    await sendEmail(to, subject || "Test email from Expense App", text || "This is a test email.");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
