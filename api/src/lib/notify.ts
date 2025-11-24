import { prisma } from './db.js';
import twilio from 'twilio';

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const FROM = process.env.TWILIO_FROM || '';
const hasTwilio = SID && TOKEN && FROM;
const client = hasTwilio ? twilio(SID, TOKEN) : null;

export async function notifyApproversOnSubmit(companyId: string, reportId: string) {
  const report = await prisma.expenseReport.findUnique({ where: { id: reportId }, include: { user: true, expenses: true, company: true } });
  if (!report) return;
  const exceptions = report.expenses.filter(e => e.lineStatus === 'pending').length;
  const total = report.expenses.reduce((s, e) => s + Number(e.amountUsd), 0);
  const shortId = report.id.slice(0, 8);
  const msg = `Expense report ${shortId} from ${report.user.name} submitted for ${report.company.name}. Total $${total.toFixed(2)}. Exceptions: ${exceptions}.`;
  const ucs = await prisma.userCompany.findMany({ where: { companyId, isApprover: true }, include: { user: true } });
  const targets = ucs.map(uc => uc.user).filter(u => u?.phone);
  if (targets.length === 0) { console.log('[notify] No approver phones.'); return; }
  if (!hasTwilio) { console.log('[notify] Twilio not configured. Would send:', { to: targets.map(t=>t.phone), body: msg }); return; }
  await Promise.all(targets.map(t => client!.messages.create({ from: FROM, to: t.phone!, body: msg })));
}
