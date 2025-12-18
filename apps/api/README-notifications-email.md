# Notifications (Email via SMTP) – One-way

## Install
```bash
cd apps/api
npm i nodemailer
```

## Configure
Add env vars in `.env` from `.env.example`:

```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM="Expense App <no-reply@yourdomain.com>"
APP_PUBLIC_URL=http://localhost:5173
```

## Wire-up checklist
1. **Mount routes** in your Express server:
   ```js
   import { approvalsRouter } from "./src/routes/approvals.js";
   import { adminNotificationsRouter } from "./src/routes/adminNotificationsEmail.js";
   app.use("/approvals", approvalsRouter);
   app.use("/admin/notifications", adminNotificationsRouter);
   // For submit route: copy from src/routes/reports.submit.example.js
   ```
2. Ensure your submit flow sets line statuses and report status before notifying.
3. Ensure RBAC middlewares `requireAuth` and `requireAdmin` are wired.
4. Test via Admin → Notifications page: send test email.
5. Submit a report → approver email; approve/decline → employee email; approve → admin email.

## Remove Twilio (if present)
```bash
npm uninstall twilio
# delete any twilio-specific files and env vars
```
