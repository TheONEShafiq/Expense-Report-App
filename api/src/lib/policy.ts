import { prisma } from './db.js';
import { Expense } from '@prisma/client';

export async function evaluateExpense(companyId: string, exp: Pick<Expense,'categoryId'|'amountUsd'|'attendeesCount'|'isPerDiem'|'perDiemType'|'txnDate'>) {
  const categoryId = exp.categoryId;
  const amount = Number(exp.amountUsd);
  const attendees = Math.max(1, exp.attendeesCount ?? 1);
  const catThr = await prisma.policyThreshold.findUnique({ where: { companyId_categoryId: { companyId, categoryId } } });
  if (exp.isPerDiem && exp.perDiemType) {
    const ov = await prisma.perDiemOverride.findFirst({
      where: { companyId, type: exp.perDiemType, effectiveFrom: { lte: exp.txnDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: exp.txnDate } }] },
      orderBy: { effectiveFrom: 'desc' }
    });
    const global = await prisma.perDiemGlobal.findFirst({ where: { type: exp.perDiemType }, orderBy: { effectiveFrom: 'desc' } });
    const cap = ov?.dailyCapUsd ?? global?.dailyCapUsd ?? 0;
    return amount <= Number(cap) ? 'ok' : 'violation';
  }
  if (catThr?.evaluatePerPerson && catThr?.perPersonCapUsd != null) {
    const perPerson = amount / attendees;
    return perPerson <= Number(catThr.perPersonCapUsd) ? 'ok' : 'violation';
  }
  if (catThr?.perTxnCapUsd != null) {
    return amount <= Number(catThr.perTxnCapUsd) ? 'ok' : 'violation';
  }
  return 'ok';
}
