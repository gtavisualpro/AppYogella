import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signSession, sessionCookie } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeMe } from "../lib/serialize.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(200),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Champs invalides", details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Un compte existe déjà avec cet email" });

  const passwordHash = await bcrypt.hash(password, 12);
  const isFirstUser = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isAdmin: isFirstUser,
      subscription: { create: {} },
    },
    include: { subscription: true },
  });

  const token = signSession({ userId: user.id });
  res.cookie(sessionCookie.name, token, sessionCookie.options);
  res.status(201).json({ user: serializeMe(user) });
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { subscription: true } });
  if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  if (!user.active) return res.status(403).json({ error: "Ce compte a été suspendu" });

  const token = signSession({ userId: user.id });
  res.cookie(sessionCookie.name, token, sessionCookie.options);
  res.json({ user: serializeMe(user) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(sessionCookie.name, { path: sessionCookie.options.path });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  if (!user) return res.status(401).json({ error: "Authentification requise" });
  res.json({ user: serializeMe(user) });
});
