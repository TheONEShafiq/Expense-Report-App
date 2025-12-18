import { getMailer } from "../lib/mailer.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

const mailer = getMailer();

export async function sendEmail(to, subject, text) {
  return mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text });
}

export const emailTemplates = {
  submissionToApprover: ({ employeeName, weekLabel, reportId }) => ({
    subject: `Expense report needs review`,
    text: `Expense report for ${employeeName} (Week of ${weekLabel}) is ready for your review. Open: ${env.APP_PUBLIC_URL}/reports/${reportId}`,
  }),
  approvedToEmployee: ({ weekLabel, reportId }) => ({
    subject: `Expense report approved`,
    text: `Your expense report (Week of ${weekLabel}) is approved. Details: ${env.APP_PUBLIC_URL}/reports/${reportId}`,
  }),
  declinedToEmployee: ({ weekLabel, reportId }) => ({
    subject: `Changes needed: expense report`,
    text: `Your expense report (Week of ${weekLabel}) needs changes or was declined. Review: ${env.APP_PUBLIC_URL}/reports/${reportId}`,
  }),
  approvedToAdmin: ({ employeeName, weekLabel, reportId }) => ({
    subject: `Approved expense report – ${employeeName} (${weekLabel})`,
    text: `Report approved for ${employeeName} (Week of ${weekLabel}). View/export: ${env.APP_PUBLIC_URL}/reports/${reportId}`,
  }),
};

const iso = (d) => new Date(d).toISOString().slice(0,10);

export async function notifyApproversOnSubmit(reportId) {
  const report = await prisma.reports.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!report) return;
  const approverIds = await prisma.user_roles.findMany({ where: { role: { key: "approver" } }, select: { user_id: true } });
  const approvers = await prisma.users.findMany({
    where: {
      id: { in: approverIds.map(r => r.user_id) },
      user_companies: { some: { company_id: report.company_id } },
      status: "active",
      email: { not: null },
    },
    select: { id: true, email: true },
  });
  if (!approvers.length) return;
  const { subject, text } = emailTemplates.submissionToApprover({
    employeeName: report.user?.name ?? "Employee",
    weekLabel: iso(report.week_start_date),
    reportId,
  });
  await Promise.all(approvers.map(a => sendEmail(a.email, subject, text)));
}

export async function notifyEmployeeOnApproved(reportId) {
  const report = await prisma.reports.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!report?.user?.email) return;
  const { subject, text } = emailTemplates.approvedToEmployee({ weekLabel: iso(report.week_start_date), reportId });
  await sendEmail(report.user.email, subject, text);
}

export async function notifyEmployeeOnDeclined(reportId) {
  const report = await prisma.reports.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!report?.user?.email) return;
  const { subject, text } = emailTemplates.declinedToEmployee({ weekLabel: iso(report.week_start_date), reportId });
  await sendEmail(report.user.email, subject, text);
}

export async function notifyAdminsOnApproved(reportId) {
  const report = await prisma.reports.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!report) return;
  const adminIds = await prisma.user_roles.findMany({ where: { role: { key: "admin" } }, select: { user_id: true } });
  const admins = await prisma.users.findMany({
    where: {
      id: { in: adminIds.map(r => r.user_id) },
      user_companies: { some: { company_id: report.company_id } },
      status: "active",
      email: { not: null },
    },
    select: { id: true, email: true },
  });
  if (!admins.length) return;
  const { subject, text } = emailTemplates.approvedToAdmin({
    employeeName: report.user?.name ?? "Employee",
    weekLabel: iso(report.week_start_date),
    reportId,
  });
  await Promise.all(admins.map(a => sendEmail(a.email, subject, text)));
}
