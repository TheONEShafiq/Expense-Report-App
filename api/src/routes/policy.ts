import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor, requireAdmin } from '../lib/auth.js';

export const policyRouter = Router();
policyRouter.use(attachActor);

policyRouter.get('/admin/lookups', async (req, res) => {
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const [categories, users, ucs] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.userCompany.findMany({ where: { companyId } }),
  ]);
  res.json({ data: { categories, users, userCompanies: ucs } });
});

policyRouter.get('/admin/policies', async (req, res) => {
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const [perDiemOv, mileageOv, thresholds, airline, ucs] = await Promise.all([
    prisma.perDiemOverride.findMany({ where: { companyId }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.mileageOverride.findMany({ where: { companyId }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.policyThreshold.findMany({ where: { companyId } }),
    prisma.airlineRule.findFirst({ where: { companyId } }),
    prisma.userCompany.findMany({ where: { companyId } }),
  ]);
  res.json({ data: { perDiemOv, mileageOv, thresholds, airline, userCompanies: ucs } });
});

policyRouter.post('/admin/per-diem', requireAdmin, async (req, res) => {
  const { companyId, type, dailyCapUsd, effectiveFrom, effectiveTo } = req.body || {};
  if (!companyId || !type || dailyCapUsd == null || !effectiveFrom) return res.status(400).json({ error: 'companyId, type, dailyCapUsd, effectiveFrom required' });
  const rec = await prisma.perDiemOverride.create({ data: { companyId, type, dailyCapUsd, effectiveFrom: new Date(effectiveFrom), effectiveTo: effectiveTo ? new Date(effectiveTo) : null } });
  res.json({ data: rec });
});

policyRouter.post('/admin/mileage', requireAdmin, async (req, res) => {
  const { companyId, rateUsdPerMile, effectiveFrom, effectiveTo } = req.body || {};
  if (!companyId || rateUsdPerMile == null || !effectiveFrom) return res.status(400).json({ error: 'companyId, rateUsdPerMile, effectiveFrom required' });
  const rec = await prisma.mileageOverride.create({ data: { companyId, rateUsdPerMile, effectiveFrom: new Date(effectiveFrom), effectiveTo: effectiveTo ? new Date(effectiveTo) : null } });
  res.json({ data: rec });
});

policyRouter.post('/admin/airline', requireAdmin, async (req, res) => {
  const { companyId, allowFirstClass } = req.body || {};
  if (!companyId || typeof allowFirstClass !== 'boolean') return res.status(400).json({ error: 'companyId, allowFirstClass required' });
  const rule = await prisma.airlineRule.upsert({ where: { id: `${companyId}-airline` }, create: { id: `${companyId}-airline`, companyId, allowFirstClass }, update: { allowFirstClass } });
  res.json({ data: rule });
});

policyRouter.post('/admin/thresholds', requireAdmin, async (req, res) => {
  const { companyId, items } = req.body || {};
  if (!companyId || !Array.isArray(items)) return res.status(400).json({ error: 'companyId, items[] required' });
  const ops = items.map((it:any) => prisma.policyThreshold.upsert({
    where: { companyId_categoryId: { companyId, categoryId: it.categoryId } },
    update: { perTxnCapUsd: it.perTxnCapUsd, perPersonCapUsd: it.perPersonCapUsd ?? null, evaluatePerPerson: !!it.evaluatePerPerson },
    create: { companyId, categoryId: it.categoryId, perTxnCapUsd: it.perTxnCapUsd, perPersonCapUsd: it.perPersonCapUsd ?? null, evaluatePerPerson: !!it.evaluatePerPerson }
  }));
  await prisma.$transaction(ops);
  res.json({ ok: true });
});

policyRouter.post('/admin/approvers', requireAdmin, async (req, res) => {
  const { companyId, items } = req.body || {};
  if (!companyId || !Array.isArray(items)) return res.status(400).json({ error: 'companyId, items[] required' });
  for (const it of items) {
    await prisma.userCompany.update({
      where: { userId_companyId: { userId: it.userId, companyId } },
      data: { isApprover: !!it.isApprover }
    }).catch(async () => {
      await prisma.userCompany.create({ data: { userId: it.userId, companyId, isApprover: !!it.isApprover } });
    });
  }
  res.json({ ok: true });
});
