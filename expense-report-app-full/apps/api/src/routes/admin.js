import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.users.findMany({ select: { id: true, name: true, email: true, status: true } });
  res.json(users);
});

adminRouter.post("/users", async (req, res) => {
  const { name, email, password, roles = [], companyId } = req.body || {};
  const bcrypt = (await import("bcryptjs")).default;
  const pwd = await bcrypt.hash(password || "changeme123", 10);
  const u = await prisma.users.create({ data: { name, email, passwordHash: pwd, status: "active" } });
  for (const r of roles) {
    const role = await prisma.roles.findUnique({ where: { key: r } });
    if (role) await prisma.user_roles.create({ data: { user_id: u.id, role_id: role.id } });
  }
  if (companyId) await prisma.user_companies.create({ data: { user_id: u.id, company_id: Number(companyId) } });
  res.json({ ok: true, id: u.id });
});

adminRouter.get("/companies", async (_req, res) => {
  const rows = await prisma.companies.findMany();
  res.json(rows);
});
adminRouter.post("/companies", async (req, res) => {
  const { name, code, base_currency } = req.body || {};
  const c = await prisma.companies.create({ data: { name, code, base_currency } });
  res.json(c);
});

adminRouter.get("/gl-codes", async (req, res) => {
  const { companyId } = req.query;
  const rows = await prisma.gl_accounts.findMany({ where: { company_id: Number(companyId) } });
  res.json(rows);
});
adminRouter.post("/gl-codes", async (req, res) => {
  const { companyId, code, name } = req.body || {};
  const row = await prisma.gl_accounts.create({ data: { company_id: Number(companyId), code, name } });
  res.json(row);
});

adminRouter.get("/per-diem", async (req, res) => {
  const { companyId } = req.query;
  const rows = await prisma.per_diem_policies.findMany({ where: { company_id: Number(companyId) } });
  res.json(rows);
});
adminRouter.post("/per-diem", async (req, res) => {
  const { companyId, name, currency, daily_total } = req.body || {};
  const row = await prisma.per_diem_policies.create({ data: { company_id: Number(companyId), name, currency, daily_total: Number(daily_total) } });
  res.json(row);
});

adminRouter.get("/limits", async (req, res) => {
  const { companyId } = req.query;
  const rows = await prisma.preapproval_limits.findMany({ where: { company_id: Number(companyId) } });
  res.json(rows);
});
adminRouter.post("/limits", async (req, res) => {
  const { companyId, category, currency, limit_amount } = req.body || {};
  const row = await prisma.preapproval_limits.create({ data: { company_id: Number(companyId), category, currency, limit_amount: Number(limit_amount) } });
  res.json(row);
});
