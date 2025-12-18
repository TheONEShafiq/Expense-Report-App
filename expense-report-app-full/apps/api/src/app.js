import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { authRouter } from "./routes/auth.js";
import { reportsRouter } from "./routes/reports.js";
import { approvalsRouter } from "./routes/approvals.js";
import { adminRouter } from "./routes/admin.js";
import { adminNotificationsRouter } from "./routes/adminNotificationsEmail.js";
import { expensesRouter } from "./routes/expenses.js";
import { receiptsRouter } from "./routes/receipts.js";
import { exportsRouter } from "./routes/exports.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/reports", reportsRouter);
app.use("/approvals", approvalsRouter);
app.use("/admin", adminRouter);
app.use("/admin/notifications", adminNotificationsRouter);
app.use("/expenses", expensesRouter);
app.use("/receipts", receiptsRouter);
app.use("/exports", exportsRouter);

export default app;
