import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../db/prisma.js";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.post("/", async (req, res) => {
  const { companyId, date, category, amount, currency, description } = req.body || {};
  const row = await prisma.expenses.create({
    data: {
      user_id: req.user.id,
      company_id: Number(companyId),
      date: new Date(date),
      category,
      amount: Number(amount),
      currency,
      description,
      status: "Draft",
    },
  });
  res.json(row);
});

expensesRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const exp = await prisma.expenses.findUnique({ where: { id } });
  if (!exp || exp.user_id !== req.user.id) return res.status(404).json({ error: "not found" });
  if (!["Draft", "Denied", "Exception"].includes(exp.status)) return res.status(400).json({ error: "cannot edit" });

  const { date, category, amount, currency, description } = req.body || {};
  const updated = await prisma.expenses.update({
    where: { id },
    data: {
      date: date ? new Date(date) : exp.date,
      category: category ?? exp.category,
      amount: amount != null ? Number(amount) : exp.amount,
      currency: currency ?? exp.currency,
      description: description ?? exp.description,
    },
  });
  res.json(updated);
});
