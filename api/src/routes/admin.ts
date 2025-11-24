import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor, requireAdmin } from '../lib/auth.js';
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

adminRouter.post('/admin/companies/create', requireAdmin, async (req, res) => {
  const { name, baseCurrency } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const curr = baseCurrency || 'USD';
  const company = await prisma.company.create({ data: { name, baseCurrency: curr } });
  // seed basic GL + mappings for new company
  const gls = [
    { name:'2000 · Employee Reimbursements Payable', number:'2000' },
    { name:'6000 · Travel Expense', number:'6000' },
    { name:'6100 · Meals & Entertainment', number:'6100' },
    { name:'6200 · Mileage Reimbursement', number:'6200' },
    { name:'6300 · Marketing & Promotion', number:'6300' },
  ];
  const created = [];
  for (const g of gls) {
    created.push(await prisma.gLAccount.create({ data: { companyId: company.id, name: g.name, number: g.number } }));
  }
  const cats = await prisma.category.findMany();
  const byName = Object.fromEntries(cats.map(c => [c.name, c]));
  const map = { 'Travel':'6000','Meals Per Diem':'6100','Entertainment Meals':'6100','Mileage':'6200','Marketing/Promotional':'6300' };
  for (const [cat, gl] of Object.entries(map)) {
    if (byName[cat]) {
      const acc = created.find(x => x.number === gl);
      if (acc) await prisma.categoryGLMapping.create({ data: { companyId: company.id, categoryId: byName[cat].id, glAccountId: acc.id } });
    }
  }
  await prisma.airlineRule.create({ data: { companyId: company.id } });
  res.json({ data: company });
});
