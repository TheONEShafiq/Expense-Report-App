import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor } from '../lib/auth.js';

export const approverRouter = Router();
approverRouter.use(attachActor);

approverRouter.get('/approver/queue', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const isApprover = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId } } });
  if (!isApprover || !isApprover.isApprover) return res.status(403).json({ error: 'not approver for company' });

  const reports = await prisma.expenseReport.findMany({
    where: { companyId, status: 'submitted' },
    orderBy: { submittedAt: 'asc' },
    include: { user: true, expenses: true }
  });

  const pending = reports
    .map(r => ({
      reportId: r.id,
      employee: r.user.name,
      submittedAt: r.submittedAt,
      counts: {
        pending: r.expenses.filter(e => e.lineStatus === 'pending').length,
        auto_approved: r.expenses.filter(e => e.lineStatus === 'auto_approved').length,
        approved: r.expenses.filter(e => e.lineStatus === 'approved').length,
        rejected: r.expenses.filter(e => e.lineStatus === 'rejected').length,
      },
      total: r.expenses.reduce((s,e)=>s+Number(e.amountUsd),0)
    }))
    .filter(x => x.counts.pending > 0 || x.counts.rejected > 0);

  res.json({ data: pending });
});

approverRouter.get('/approver/reports/:id/lines', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { id } = req.params;
  const report = await prisma.expenseReport.findUnique({ where: { id }, include: { company: true, user: true, expenses: { include: { category: true } } } });
  if (!report) return res.status(404).json({ error: 'report not found' });
  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId: report.companyId } } });
  if (!uc || !uc.isApprover) return res.status(403).json({ error: 'not approver for company' });
  res.json({ data: {
    report: { id: report.id, employee: report.user.name, submittedAt: report.submittedAt, company: report.company.name },
    lines: await Promise.all(report.expenses.map(async e => {
      const people = await prisma.expenseAttendee.findMany({ where: { expenseId: e.id } });
      return { id: e.id, date: e.txnDate, merchant: e.merchant, category: e.category.name,
        amountUsd: Number(e.amountUsd), attendeesCount: e.attendeesCount, attendees: people.map(p=>p.name),
        policyStatus: e.policyStatus, lineStatus: e.lineStatus };
    }))
  }});
});

approverRouter.post('/approver/reports/:reportId/lines/:lineId/decision', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { reportId, lineId } = req.params;
  const { decision, reason } = req.body || {};
  if (!['approved','rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved|rejected' });

  const report = await prisma.expenseReport.findUnique({ where: { id: reportId }, include: { expenses: true } });
  if (!report) return res.status(404).json({ error: 'report not found' });
  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId: report.companyId } } });
  if (!uc || !uc.isApprover) return res.status(403).json({ error: 'not approver for company' });

  const exp = await prisma.expense.findUnique({ where: { id: lineId } });
  if (!exp || exp.reportId !== reportId) return res.status(404).json({ error: 'line not found' });

  await prisma.expense.update({ where: { id: lineId }, data: { lineStatus: decision as any } });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, scope: 'expense', entityId: lineId, action: 'line.decision', meta: { decision, reason: reason || null } } });

  const remain = await prisma.expense.count({ where: { reportId, NOT: { lineStatus: { in: ['auto_approved','approved'] } } } });
  if (remain === 0) {
    await prisma.expenseReport.update({ where: { id: reportId }, data: { status: 'approved', approvedAt: new Date(), approverId: actor.id } });
  }
  res.json({ ok: true });
});
