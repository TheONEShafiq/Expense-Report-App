import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { generateExport } from "../services/exports.js";

export const exportsRouter = Router();
exportsRouter.use(requireAuth);

exportsRouter.post("/generate", async (req, res, next) => {
  try {
    const { companyId, period } = req.query;
    const { csv } = await generateExport(Number(companyId), String(period||"YYYY-WW"));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="export-${companyId}-${period}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});
