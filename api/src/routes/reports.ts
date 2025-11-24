import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor } from '../lib/auth.js';
import { evaluateExpense } from '../lib/policy.js';
import { notifyApproversOnSubmit } from '../lib/notify.js';

export const reportsRouter = Router();
reportsRouter.use(attachActor);

reportsRouter.get('/health', (_req, res) => res.json({ ok: true }));

reportsRouter.post('/expenses', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { companyId, merchant, txnDate, categoryId, amountUsd, attendeesCount, attendees } = req.body || {};
  if (!companyId || !merchant || !txnDate || !categoryId || amountUsd == null) {
    return res.status(400).json({ error: 'companyId, merchant, txnDate, categoryId, amountUsd required' });
  }
  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId } } });
  if (!uc) return res.status(403).json({ error: 'not assigned to company' });

  let report = await prisma.expenseReport.findFirst({ where: { userId: actor.id, companyId, status: 'draft' } });
  if (!report) {
    report = await prisma.expenseReport.create({ data: { userId: actor.id, companyId, status: 'draft' } });
  }
  let exp = await prisma.expense.create({ data: { reportId: report.id, categoryId, merchant, txnDate: new Date(txnDate), amountUsd, attendeesCount: attendeesCount ?? (Array.isArray(attendees) ? Math.max(1, attendees.length) : 1) } });
  if (Array.isArray(attendees) && attendees.length) {
    await prisma.expenseAttendee.createMany({ data: attendees.filter((n:any)=>String(n||'').trim()).map((name:any) => ({ expenseId: exp.id, name: String(name).trim() })) });
    exp = await prisma.expense.update({ where: { id: exp.id }, data: { attendeesCount: attendees.length } });
  }
  return res.json({ data: { reportId: report.id, expenseId: exp.id } });
});

reportsRouter.get('/me/draft-report', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const report = await prisma.expenseReport.findFirst({ where: { userId: actor.id, companyId, status: 'draft' } });
  if (!report) return res.json({ data: { report: null, expenses: [], total: 0 } });
  const exps = await prisma.expense.findMany({ where: { reportId: report.id }, include: { category: true } });
  const total = exps.reduce((s, e) => s + Number(e.amountUsd), 0);
  return res.json({ data: { report, expenses: exps.map(e => ({ id: e.id, merchant: e.merchant, txnDate: e.txnDate, amountUsd: Number(e.amountUsd), attendeesCount: e.attendeesCount, categoryName: e.category.name })), total } });
});

reportsRouter.delete('/expenses/:id', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { id } = req.params;
  const exp = await prisma.expense.findUnique({ where: { id } });
  if (!exp) return res.status(404).json({ error: 'not found' });
  const rep = await prisma.expenseReport.findUnique({ where: { id: exp.reportId } });
  if (!rep || rep.userId !== actor.id || rep.status !== 'draft') return res.status(403).json({ error: 'cannot delete' });
  await prisma.expense.delete({ where: { id } });
  return res.json({ ok: true });
});

reportsRouter.post('/reports/:id/submit', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { id } = req.params;
  const report = await prisma.expenseReport.findUnique({ where: { id }, include: { expenses: true } });
  if (!report) return res.status(404).json({ error: 'report not found' });
  if (report.userId !== actor.id) return res.status(403).json({ error: 'not your report' });
  for (const e of report.expenses) {
    const status = await evaluateExpense(report.companyId, e);
    await prisma.expense.update({ where: { id: e.id }, data: { policyStatus: status, lineStatus: status === 'ok' ? 'auto_approved' : 'pending' }});
  }
  const updated = await prisma.expenseReport.update({ where: { id }, data: { status: 'submitted', submittedAt: new Date() } });
  notifyApproversOnSubmit(updated.companyId, updated.id).catch(err => console.error('[notify] failed', err));
  res.json({ ok: true });
});

reportsRouter.post('/reports/:id/reopen', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { id } = req.params;
  const report = await prisma.expenseReport.findUnique({ where: { id }, include: { expenses: true } });
  if (!report) return res.status(404).json({ error: 'report not found' });
  if (report.userId !== actor.id) return res.status(403).json({ error: 'not your report' });
  if (report.status !== 'rejected' && report.status !== 'submitted') return res.status(400).json({ error: 'only submitted/rejected reports can be reopened to draft' });
  await prisma.expense.updateMany({ where: { reportId: id }, data: { lineStatus: 'pending' } });
  const r = await prisma.expenseReport.update({ where: { id }, data: { status: 'draft', submittedAt: null, approvedAt: null } });
  res.json({ data: r });
});

reportsRouter.get('/me/reports', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const companyId = String(req.query.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'company_id required' });
  const reports = await prisma.expenseReport.findMany({ where: { userId: actor.id, companyId }, orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }], });
  const totals = await prisma.expense.groupBy({ by: ['reportId'], where: { reportId: { in: reports.map(r => r.id) } }, _sum: { amountUsd: true } });
  const byRep = Object.fromEntries(totals.map(t => [t.reportId, Number(t._sum.amountUsd || 0)]));
  res.json({ data: reports.map(r => ({ ...r, totalUsd: byRep[r.id] || 0 })) });
});

reportsRouter.get('/reports/:id/lines', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { id } = req.params;
  const r = await prisma.expenseReport.findUnique({ where: { id }, include: { user: true, company: true, expenses: { include: { category: true } } } });
  if (!r) return res.status(404).json({ error: 'not found' });
  if (r.userId !== actor.id) return res.status(403).json({ error: 'forbidden' });
  res.json({ data: {
    report: { id: r.id, company: r.company.name, status: r.status, submittedAt: r.submittedAt, approvedAt: r.approvedAt, totalUsd: r.expenses.reduce((s,e)=>s+Number(e.amountUsd),0) },
    lines: await Promise.all(r.expenses.map(async e => {
      const people = await prisma.expenseAttendee.findMany({ where: { expenseId: e.id } });
      return { id: e.id, date: e.txnDate, merchant: e.merchant, category: e.category.name, amountUsd: Number(e.amountUsd), attendeesCount: e.attendeesCount, attendees: people.map(p=>p.name), lineStatus: e.lineStatus, policyStatus: e.policyStatus };
    }))
  }});
});
