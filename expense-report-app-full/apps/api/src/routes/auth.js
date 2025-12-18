import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.users.findUnique({ where: { email }, include: { user_roles: { include: { role: true } } } });
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });
  const roles = user.user_roles.map(ur => ur.role.key);
  const token = jwt.sign({ id: user.id, email: user.email, roles }, process.env.JWT_SECRET || "devsecret", { expiresIn: "7d" });
  res.cookie(process.env.COOKIE_NAME || "expense_session", token, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, roles } });
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "expense_session");
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || "expense_session"];
    if (!token) return res.json({ user: null });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    res.json({ user: payload });
  } catch {
    res.json({ user: null });
  }
});
