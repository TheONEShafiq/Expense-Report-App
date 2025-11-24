import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor } from '../lib/auth.js';

export const meRouter = Router();
meRouter.use(attachActor);

meRouter.get('/me/roles', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });

  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId } } });
  const data = {
    userId: actor.id,
    email: actor.email,
    name: actor.name,
    admin: actor.role === 'admin',
    assigned: !!uc,
    approver: !!uc?.isApprover,
    companyEmail: uc?.companyEmail || null
  };
  res.json({ data });
});
