# Expansion Port – Expense MVP

Mobile-first expense app: auto-approvals, per-person entertainment, GL mapping, dashboards, SMS, and QuickBooks Desktop (IIF) export.

## Local Dev
```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# open http://localhost:3000
```

## Replit Import
1) Create a GitHub repo and upload these files (unzip first).  
2) In Replit: **Create Repl → Import from GitHub** → paste repo URL.  
3) In the Replit shell:
```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Twilio (optional) → fill `api/.env` from `.env.sample`.  
Export preview: `/export-preview.html` → Download IIF (1 JE per report).
