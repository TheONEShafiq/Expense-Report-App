import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor, requireAdmin } from '../lib/auth.js';

export const usersAdminRouter = Router();
usersAdminRouter.use(attachActor);

usersAdminRouter.get('/admin/users', async (req, res) => {
  const companyId = req.query.company_id ? String(req.query.company_id) : undefined;
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, include: { companies: true } });
  const filtered = companyId ? users.filter(u => u.companies.some(uc => uc.companyId === companyId)) : users;
  res.json({ data: filtered });
});

usersAdminRouter.post('/admin/users', requireAdmin, async (req, res) => {
  const { firstName, lastName, email, phone, isAdmin, assignments } = req.body || {};
  if (!firstName || !lastName || !email) return res.status(400).json({ error: 'firstName, lastName, email required' });
  if (!Array.isArray(assignments) || assignments.length === 0) return res.status(400).json({ error: 'assignments[] required' });
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const name = `${firstName} ${lastName}`.trim();
  const role = isAdmin ? 'admin' : 'employee';
  const user = await prisma.user.upsert({ where: { email }, update: { name, firstName, lastName, phone, role, active: true }, create: { name, firstName, lastName, email, phone, role, active: true } });
  for (const a of assignments) {
    if (!a.companyId) continue;
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: user.id, companyId: a.companyId } },
      update: { isPrimary: !!a.isPrimary, isApprover: !!a.isApprover, companyEmail: a.companyEmail ?? null },
      create: { userId: user.id, companyId: a.companyId, isPrimary: !!a.isPrimary, isApprover: !!a.isApprover, companyEmail: a.companyEmail ?? null }
    });
  }
  res.json({ data: await prisma.user.findUnique({ where: { id: user.id }, include: { companies: true } }) });
});

usersAdminRouter.put('/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, isAdmin, assignments } = req.body || {};
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: 'user not found' });
  const name = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : current.name;
  const role = isAdmin === true ? 'admin' : (isAdmin === false ? 'employee' : current.role);
  await prisma.user.update({ where: { id }, data: { firstName: firstName ?? current.firstName, lastName: lastName ?? current.lastName, name, phone: phone ?? current.phone, role } });
  if (Array.isArray(assignments)) {
    const existing = await prisma.userCompany.findMany({ where: { userId: id } });
    const keep = new Set(assignments.map((a:any) => a.companyId));
    for (const a of assignments) {
      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId: id, companyId: a.companyId } },
        update: { isPrimary: !!a.isPrimary, isApprover: !!a.isApprover, companyEmail: a.companyEmail ?? null },
        create: { userId: id, companyId: a.companyId, isPrimary: !!a.isPrimary, isApprover: !!a.isApprover, companyEmail: a.companyEmail ?? null }
      });
    }
    for (const e of existing) {
      if (!keep.has(e.companyId)) await prisma.userCompany.delete({ where: { userId_companyId: { userId: id, companyId: e.companyId } } }).catch(()=>{});
    }
  }
  res.json({ data: await prisma.user.findUnique({ where: { id }, include: { companies: true } }) });
});

usersAdminRouter.patch('/admin/users/:id/active', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { active } = req.body || {};
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active boolean required' });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'user not found' });
  const count = await prisma.user.count({ where: { role: 'admin', active: true } });
  if (target.role === 'admin' && active === false && count <= 2) return res.status(403).json({ error: 'minimum two admins required' });
  const out = await prisma.user.update({ where: { id }, data: { active } });
  await prisma.auditLog.create({ data: { actorUserId: (req as any).actor?.id ?? null, scope: 'admin', entityId: id, action: 'user.active.update', meta: { prev: target.active, next: active } } });
  res.json({ data: out });
});

usersAdminRouter.patch('/admin/users/:id/admin', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { isAdmin, reason } = req.body || {};
  if (typeof isAdmin !== 'boolean') return res.status(400).json({ error: 'isAdmin boolean required' });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'user not found' });
  const currentAdmins = await prisma.user.count({ where: { role: 'admin', active: true } });
  if (isAdmin === false && target.role === 'admin') {
    if (currentAdmins <= 1) return res.status(403).json({ error: 'cannot drop to zero admins' });
    if (currentAdmins <= 2) return res.status(403).json({ error: 'minimum two admins required' });
  }
  const newRole = isAdmin ? 'admin' : 'employee';
  const out = await prisma.user.update({ where: { id }, data: { role: newRole } });
  await prisma.auditLog.create({ data: { actorUserId: (req as any).actor?.id ?? null, scope: 'admin', entityId: id, action: 'user.admin.toggle', meta: { isAdmin, reason: reason ?? null, prevRole: target.role, nextRole: newRole } } });
  res.json({ data: out });
});
