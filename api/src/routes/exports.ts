import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { attachActor } from '../lib/auth.js';

export const exportsRouter = Router();
exportsRouter.use(attachActor);

exportsRouter.get('/exports/:reportId/preview', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { reportId } = req.params;
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include: { user: true, company: true, expenses: { include: { category: true } } }
  });
  if (!report) return res.status(404).json({ error: 'report not found' });
  const isOwner = report.userId === actor.id;
  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId: report.companyId } } });
  const isApprover = !!uc?.isApprover;
  if (!isOwner && !isApprover) return res.status(403).json({ error: 'forbidden' });

  let payable = await prisma.gLAccount.findFirst({ where: { companyId: report.companyId, number: '2000' } });
  if (!payable) payable = await prisma.gLAccount.create({ data: { companyId: report.companyId, name: '2000 · Employee Reimbursements Payable', number: '2000' } });

  const mapRows = await prisma.categoryGLMapping.findMany({ where: { companyId: report.companyId } });
  const mapByCat: Record<string, string> = Object.fromEntries(mapRows.map(m => [m.categoryId, m.glAccountId]));
  const gls = await prisma.gLAccount.findMany({ where: { companyId: report.companyId } });
  const glById: Record<string, any> = Object.fromEntries(gls.map(g => [g.id, g]));

  const lines: any[] = [];
  for (const e of report.expenses) {
    const glId = mapByCat[e.categoryId];
    const debitGL = glById[glId];
    const creditGL = payable!;
    const attendees = await prisma.expenseAttendee.findMany({ where: { expenseId: e.id } });
    const perPerson = e.attendeesCount ? Number(e.amountUsd) / e.attendeesCount : Number(e.amountUsd);
    const memoParts = [ e.merchant, e.category.name, new Date(e.txnDate).toISOString().slice(0,10),
      attendees.length ? `Attendees: ${attendees.map(a=>a.name).join(', ')}` : null,
      attendees.length ? `Per-person: $${perPerson.toFixed(2)}` : null
    ].filter(Boolean);
    lines.push({
      date: e.txnDate, category: e.category.name, merchant: e.merchant,
      debitGL: debitGL ? (debitGL.number ? `${debitGL.number} · ${debitGL.name}` : debitGL.name) : 'UNMAPPED (set Category→GL)',
      creditGL: creditGL.number ? `${creditGL.number} · ${creditGL.name}` : creditGL.name,
      amountUsd: Number(e.amountUsd), memo: memoParts.join(' | '),
      attendees: attendees.map(a => a.name), perPersonUsd: attendees.length ? Number(perPerson.toFixed(2)) : null
    });
  }
  const total = lines.reduce((s,l)=>s+Number(l.amountUsd),0);
  res.json({ data: { report: { id: report.id, employee: report.user.name, company: report.company.name, status: report.status, submittedAt: report.submittedAt, approvedAt: report.approvedAt, totalUsd: total }, lines } });
});

// IIF export: ONE JE PER REPORT (1JEPA)
exportsRouter.get('/exports/:reportId/qbd.iif', async (req, res) => {
  const actor = (req as any).actor;
  if (!actor) return res.status(401).json({ error: 'unauthorized' });
  const { reportId } = req.params;
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include: { user: true, company: true, expenses: { include: { category: true } } }
  });
  if (!report) return res.status(404).json({ error: 'report not found' });
  const isOwner = report.userId === actor.id;
  const uc = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId: actor.id, companyId: report.companyId } } });
  const isApprover = !!uc?.isApprover;
  if (!isOwner && !isApprover) return res.status(403).json({ error: 'forbidden' });

  const mapRows = await prisma.categoryGLMapping.findMany({ where: { companyId: report.companyId } });
  const mapByCat: Record<string, string> = Object.fromEntries(mapRows.map(m => [m.categoryId, m.glAccountId]));
  const gls = await prisma.gLAccount.findMany({ where: { companyId: report.companyId } });
  const glById: Record<string, any> = Object.fromEntries(gls.map(g => [g.id, g]));
  let payable = gls.find(g => g.number === '2000');
  if (!payable) { payable = await prisma.gLAccount.create({ data: { companyId: report.companyId, name: '2000 · Employee Reimbursements Payable', number: '2000' } }); }

  const groups: Record<string, { gl: any, amount: number, memos: string[] }> = {};
  let total = 0;
  for (const e of report.expenses) {
    const glId = mapByCat[e.categoryId];
    const gl = glById[glId];
    const dateStr = new Date(e.txnDate).toLocaleDateString('en-US');
    const attendees = await prisma.expenseAttendee.findMany({ where: { expenseId: e.id } });
    const perPerson = e.attendeesCount ? Number(e.amountUsd)/e.attendeesCount : null;
    const memo = [ e.merchant, e.category.name, dateStr,
      attendees.length ? `Attendees: ${attendees.map(a=>a.name).join(', ')}` : null,
      perPerson != null ? `Per-person: $${perPerson.toFixed(2)}` : null
    ].filter(Boolean).join(' / ');
    const key = gl ? gl.id : 'UNMAPPED';
    if (!groups[key]) groups[key] = { gl: gl || { name: 'UNMAPPED' }, amount: 0, memos: [] };
    groups[key].amount += Number(e.amountUsd);
    if (memo) groups[key].memos.push(memo);
    total += Number(e.amountUsd);
  }
  function glLabel(gl:any){ if(!gl) return 'UNMAPPED'; return gl.number ? `${gl.number} · ${gl.name}` : gl.name; }
  function q(i:string){ return i?.replace(/\t|\n|\r/g,' ').trim() || ''; }
  const dateStr = new Date(report.submittedAt || report.approvedAt || new Date()).toLocaleDateString('en-US');
  const shortId = report.id.slice(0,8);
  const headerMemo = `Report ${shortId} · ${report.user.name} · ${report.company.name}`;
  const rows: string[] = [];
  rows.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
  rows.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
  rows.push('!ENDTRNS');
  rows.push(['TRNS','GENERAL JOURNAL', q(dateStr), q(glLabel(payable)), q(report.user.name), (-total).toFixed(2), q(headerMemo)].join('\t'));
  for (const k of Object.keys(groups)) {
    const g = groups[k];
    let memo = g.memos.join(' | ');
    if (memo.length > 200) memo = memo.slice(0,197)+'...';
    rows.push(['SPL','GENERAL JOURNAL', q(dateStr), q(glLabel(g.gl)), q(report.user.name), (g.amount).toFixed(2), q(memo)].join('\t'));
  }
  rows.push('ENDTRNS');
  const filename = `qbd_${report.company.name.replace(/[^a-z0-9]+/ig,'_')}_${shortId}_1JEPA.iif`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(rows.join('\n'));
});
