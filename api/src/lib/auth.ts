import { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';

export async function attachActor(req: Request, _res: Response, next: NextFunction) {
  const email = req.header('x-actor-email');
  if (email) {
    const actor = await prisma.user.findUnique({ where: { email } });
    (req as any).actor = actor || null;
  } else {
    (req as any).actor = null;
  }
  next();
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const actor = (req as any).actor;
  if (!actor || actor.role !== 'admin') {
    return res.status(403).json({ error: 'admin required' });
  }
  next();
}
