import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { sessionCookie, verifySession } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        isAdmin: boolean;
        hasAccess: boolean;
      };
    }
  }
}

export function isSubscriptionActive(status?: string | null): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookie.name];
  if (!token) return next();
  const payload = verifySession(token);
  if (!payload) return next();
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { subscription: true },
  });
  if (!user || !user.active) return next();
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    hasAccess: isSubscriptionActive(user.subscription?.status),
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  if (!req.user.isAdmin) return res.status(403).json({ error: "Accès administrateur requis" });
  next();
}
