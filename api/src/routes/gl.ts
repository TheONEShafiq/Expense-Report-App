import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor, requireAdmin } from '../lib/auth.js';

export const glRouter = Router();
glRouter.use(attachActor);

glRouter.get('/admin/gl', async (req, res) => {
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const [categories, accounts, mappings] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.gLAccount.findMany({ where: { companyId }, orderBy: [{ number: 'asc' }, { name: 'asc' }] }),
    prisma.categoryGLMapping.findMany({ where: { companyId } }),
  ]);
  res.json({ data: { categories, accounts, mappings } });
});

glRouter.post('/admin/gl/accounts', requireAdmin, async (req, res) => {
  const { companyId, id, name, number, active } = req.body || {};
  if (!companyId || !name) return res.status(400).json({ error: 'companyId, name required' });
  if (id) {
    const existing = await prisma.gLAccount.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) return res.status(404).json({ error: 'account not found for company' });
    const upd = await prisma.gLAccount.update({ where: { id }, data: { name, number: number ?? existing.number, active: active ?? existing.active } });
    return res.json({ data: upd });
  } else {
    const created = await prisma.gLAccount.create({ data: { companyId, name, number: number ?? null } });
    return res.json({ data: created });
  }
});

glRouter.post('/admin/gl/mappings', requireAdmin, async (req, res) => {
  const { companyId, items } = req.body || {};
  if (!companyId || !Array.isArray(items)) return res.status(400).json({ error: 'companyId, items[] required' });
  const ops = items.map((it:any) => prisma.categoryGLMapping.upsert({
    where: { companyId_categoryId: { companyId, categoryId: it.categoryId } },
    update: { glAccountId: it.glAccountId },
    create: { companyId, categoryId: it.categoryId, glAccountId: it.glAccountId }
  }));
  await prisma.$transaction(ops);
  res.json({ ok: true });
});
