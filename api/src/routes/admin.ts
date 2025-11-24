import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor } from '../lib/auth.js';
import { z } from 'zod';

export const adminRouter = Router();
adminRouter.use(attachActor);

const filtersSchema = z.object({ year: z.coerce.number().int().min(2000).max(2999), company_id: z.string().optional() });

adminRouter.get('/admin/dashboard/employee-totals', async (req, res) => {
  const parsed = filtersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { year, company_id } = parsed.data;
  const whereCompany = company_id ? "AND er.companyId = ?" : "";
  const params: any[] = [];
  if (company_id) params.push(company_id);
  params.push(year);
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH e AS (
      SELECT er.companyId AS company_id, ex.reportId AS report_id, ex.txnDate AS txn_date,
             DATE(substr(ex.txnDate, 1, 7) || '-01') AS month, er.userId AS user_id, ex.amountUsd AS amount_usd
      FROM Expense ex JOIN ExpenseReport er ON er.id = ex.reportId
      WHERE er.status IN ('approved','exported') ${whereCompany}
        AND CAST(STRFTIME('%Y', ex.txnDate) AS INT) = ?
    )
    SELECT company_id, user_id, month, SUM(amount_usd) AS total_month
    FROM e GROUP BY company_id, user_id, month
    ORDER BY company_id, user_id, month
  `, ...params);
  return res.json({ data: rows });
});

adminRouter.get('/admin/dashboard/company-category', async (req, res) => {
  const parsed = filtersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { year, company_id } = parsed.data;
  const whereCompany = company_id ? "AND er.companyId = ?" : "";
  const params: any[] = [];
  if (company_id) params.push(company_id);
  params.push(year);
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH e AS (
      SELECT er.companyId AS company_id, ex.categoryId AS category_id,
             DATE(substr(ex.txnDate, 1, 7) || '-01') AS month, ex.amountUsd AS amount_usd
      FROM Expense ex JOIN ExpenseReport er ON er.id = ex.reportId
      WHERE er.status IN ('approved','exported') ${whereCompany}
        AND CAST(STRFTIME('%Y', ex.txnDate) AS INT) = ?
    )
    SELECT company_id, category_id, month, SUM(amount_usd) AS total_month
    FROM e GROUP BY company_id, category_id, month
    ORDER BY company_id, category_id, month
  `, ...params);
  return res.json({ data: rows });
});

adminRouter.get('/admin/dashboard/per-diem', async (req, res) => {
  const parsed = filtersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { year, company_id } = parsed.data;
  const whereCompany = company_id ? "AND er.companyId = ?" : "";
  const params: any[] = [];
  if (company_id) params.push(company_id);
  params.push(year);
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH claims AS (
      SELECT er.companyId AS company_id, er.userId AS user_id,
             ex.perDiemType AS per_diem_type, DATE(ex.txnDate) AS txn_date,
             SUM(ex.amountUsd) AS claimed_usd
      FROM Expense ex JOIN ExpenseReport er ON er.id = ex.reportId
      WHERE er.status IN ('approved','exported') AND ex.isPerDiem = 1 ${whereCompany}
        AND CAST(STRFTIME('%Y', ex.txnDate) AS INT) = ?
      GROUP BY 1,2,3,4
    ),
    rate AS (
      SELECT type AS per_diem_type, dailyCapUsd AS daily_cap_usd,
             effectiveFrom AS effective_from, COALESCE(effectiveTo, '2999-12-31') AS effective_to
      FROM PerDiemGlobal
    )
    SELECT c.company_id, c.user_id, DATE(substr(c.txn_date, 1, 7) || '-01') AS month,
           c.per_diem_type, SUM(c.claimed_usd) AS total_claimed_usd,
           COUNT(DISTINCT c.txn_date) * r.daily_cap_usd AS allowed_cap_usd,
           (SUM(c.claimed_usd) - COUNT(DISTINCT c.txn_date) * r.daily_cap_usd) AS variance_usd
    FROM claims c JOIN rate r
      ON r.per_diem_type = c.per_diem_type
     AND c.txn_date BETWEEN r.effective_from AND r.effective_to
    GROUP BY 1,2,3,4, r.daily_cap_usd
    ORDER BY company_id, user_id, month, per_diem_type
  `, ...params);
  return res.json({ data: rows });
});

adminRouter.get('/admin/companies', async (_req, res) => {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' }});
  res.json({ data: companies });
});
