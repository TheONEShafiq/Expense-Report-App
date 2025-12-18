# Expansion Port – Expense MVP (v14)

Mobile-first expense app with role-aware nav, Admin Dashboard, Policies, GL Mapping, **User Setup**, **Company Setup**, line-by-line approvals, SMS pings, and QuickBooks Desktop IIF (1 JE per report).

## Run (local/Replit)
```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# open http://localhost:3000/login.html
```

## Dev auth
Pages send your email via `X-Actor-Email`. Use **Login** to set email + company (stored in localStorage).

## Key pages
- `/login.html` – picks landing (admin → dashboard, approver → queue, others → add expense)
- `/` – **Admin Dashboard**
- `/user-setup.html` – **Admin: create users, assign companies, approver flags, admin toggle**
- `/company-setup.html` – **Admin: create company** (seeds GL + mappings)
- `/policies.html` – **Admin: per-diem, mileage, limits, airline rules, approvers**
- `/gl-mapping.html` – **Admin: Category → GL per company**
- `/approve.html` – **Approver: exception queue + line actions**
- `/add-expense.html`, `/my-reports.html` – Employee flows
- `/export-preview.html` – GL preview + **Download IIF (1JEPA)**

Twilio SMS is optional; fill `api/.env` from `.env.sample`.
