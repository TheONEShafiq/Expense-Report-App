import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../db/prisma.js";
import { putObject } from "../lib/s3.js";

const upload = multer({ storage: multer.memoryStorage() });
export const receiptsRouter = Router();
receiptsRouter.use(requireAuth);

receiptsRouter.post("/", upload.single("file"), async (req, res) => {
  const { expenseId } = req.body || {};
  const file = req.file;
  if (!file) return res.status(400).json({ error: "file required" });
  const key = `receipts/${expenseId}/${Date.now()}-${file.originalname}`;
  await putObject({ Bucket: process.env.S3_BUCKET || "receipts", Key: key, Body: file.buffer, ContentType: file.mimetype });
  const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
  const row = await prisma.receipts.create({
    data: { expense_id: Number(expenseId), url, mime: file.mimetype, size: file.size },
  });
  res.json(row);
});
