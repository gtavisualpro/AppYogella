import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadVideo } from "../lib/upload.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// ───────────────────────── Courses ─────────────────────────

adminRouter.get("/courses", async (_req, res) => {
  const courses = await prisma.course.findMany({ orderBy: { createdAt: "desc" } });
  res.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      kind: c.kind,
      universe: c.universe,
      category: c.category,
      durationMin: c.durationMin,
      meta: `${c.universe} · ${c.durationMin} min`,
      premium: c.premium,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
    })),
  });
});

const courseSchema = z.object({
  title: z.string().trim().min(1),
  durationMin: z.coerce.number().int().positive(),
  universe: z.string().trim().min(1),
  category: z.string().trim().optional(),
  premium: z.boolean().default(true),
  kind: z.enum(["COURSE", "ARTICLE"]).default("COURSE"),
  videoUrl: z.string().optional(),
  body: z.string().optional(),
  authorName: z.string().optional(),
  authorRole: z.string().optional(),
});

adminRouter.post("/courses", async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides", details: parsed.error.flatten() });
  const course = await prisma.course.create({ data: parsed.data });
  res.status(201).json({ course });
});

const courseUpdateSchema = courseSchema.partial();

adminRouter.patch("/courses/:id", async (req, res) => {
  const parsed = courseUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const course = await prisma.course
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!course) return res.status(404).json({ error: "Cours introuvable" });
  res.json({ course });
});

adminRouter.delete("/courses/:id", async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

adminRouter.post("/uploads/video", (req, res) => {
  uploadVideo(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ───────────────────────── Programs ─────────────────────────

adminRouter.get("/programs", async (_req, res) => {
  const programs = await prisma.program.findMany({
    include: { courses: { include: { course: true }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    programs: programs.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      isRoutine: p.isRoutine,
      videoIds: p.courses.map((pc) => pc.courseId),
      meta: `${p.courses.length} vidéo${p.courses.length === 1 ? "" : "s"} liée${
        p.courses.length === 1 ? "" : "s"
      }${p.description ? " · " + p.description : ""}`,
    })),
  });
});

const programSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  isRoutine: z.boolean().optional(),
});

adminRouter.post("/programs", async (req, res) => {
  const parsed = programSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const program = await prisma.program.create({ data: parsed.data });
  res.status(201).json({ program });
});

adminRouter.patch("/programs/:id", async (req, res) => {
  const parsed = programSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const program = await prisma.program
    .update({ where: { id: req.params.id }, data: parsed.data })
    .catch(() => null);
  if (!program) return res.status(404).json({ error: "Programme introuvable" });
  res.json({ program });
});

adminRouter.delete("/programs/:id", async (req, res) => {
  await prisma.program.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

adminRouter.post("/programs/:id/videos/:courseId", async (req, res) => {
  const { id: programId, courseId } = req.params;
  const count = await prisma.programCourse.count({ where: { programId } });
  const link = await prisma.programCourse
    .create({ data: { programId, courseId, order: count } })
    .catch(() => null);
  if (!link) return res.status(409).json({ error: "Déjà liée ou identifiants invalides" });
  res.status(201).json({ ok: true });
});

adminRouter.delete("/programs/:id/videos/:courseId", async (req, res) => {
  await prisma.programCourse.deleteMany({
    where: { programId: req.params.id, courseId: req.params.courseId },
  });
  res.json({ ok: true });
});

// ───────────────────────── Users ─────────────────────────

const PLAN_ORDER = ["Aucun", "Essai", "Mensuel", "Annuel"] as const;
type PlanLabel = (typeof PLAN_ORDER)[number];

function planLabelFor(status: string, plan: string | null): PlanLabel {
  if (status === "TRIALING") return "Essai";
  if (status === "ACTIVE" && plan === "MONTHLY") return "Mensuel";
  if (status === "ACTIVE" && plan === "ANNUAL") return "Annuel";
  return "Aucun";
}

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      initial: u.name.slice(0, 1).toUpperCase(),
      isAdmin: u.isAdmin,
      active: u.active,
      plan: planLabelFor(u.subscription?.status ?? "NONE", u.subscription?.plan ?? null),
    })),
    stats: {
      total: users.length,
      activeSubscriptions: users.filter((u) => u.active && u.subscription?.status !== "NONE" && u.subscription?.status).length,
    },
  });
});

const userUpdateSchema = z.object({
  active: z.boolean().optional(),
  cyclePlan: z.boolean().optional(),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { subscription: true } });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  if (parsed.data.active !== undefined) {
    await prisma.user.update({ where: { id: user.id }, data: { active: parsed.data.active } });
  }

  if (parsed.data.cyclePlan) {
    const current = planLabelFor(user.subscription?.status ?? "NONE", user.subscription?.plan ?? null);
    const next = PLAN_ORDER[(PLAN_ORDER.indexOf(current) + 1) % PLAN_ORDER.length];
    const data =
      next === "Aucun"
        ? { status: "NONE" as const, plan: null }
        : next === "Essai"
        ? { status: "TRIALING" as const, plan: null }
        : next === "Mensuel"
        ? { status: "ACTIVE" as const, plan: "MONTHLY" as const }
        : { status: "ACTIVE" as const, plan: "ANNUAL" as const };
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  }

  const updated = await prisma.user.findUnique({ where: { id: user.id }, include: { subscription: true } });
  res.json({
    user: {
      id: updated!.id,
      name: updated!.name,
      email: updated!.email,
      active: updated!.active,
      plan: planLabelFor(updated!.subscription?.status ?? "NONE", updated!.subscription?.plan ?? null),
    },
  });
});

// ───────────────────────── Plans & settings ─────────────────────────

adminRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { key: "asc" } });
  const counts = await prisma.subscription.groupBy({
    by: ["plan"],
    where: { status: "ACTIVE" },
    _count: true,
  });
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  res.json({
    plans: plans.map((p) => ({
      key: p.key,
      title: p.label,
      price: (p.priceCents / 100).toFixed(2).replace(".", ",") + " €",
      priceCents: p.priceCents,
      active: p.active,
      subscriberCount: counts.find((c) => c.plan === p.key)?._count ?? 0,
    })),
    trialDays: settings?.trialDays ?? 0,
  });
});

const planUpdateSchema = z.object({
  price: z.string().optional(),
  active: z.boolean().optional(),
});

adminRouter.patch("/plans/:key", async (req, res) => {
  const key = req.params.key.toUpperCase();
  if (key !== "MONTHLY" && key !== "ANNUAL") return res.status(400).json({ error: "Formule inconnue" });
  const parsed = planUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });

  const data: { priceCents?: number; active?: boolean } = {};
  if (parsed.data.price !== undefined) {
    const cents = Math.round(parseFloat(parsed.data.price.replace(",", ".").replace(/[^\d.]/g, "")) * 100);
    if (Number.isFinite(cents) && cents > 0) data.priceCents = cents;
  }
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const plan = await prisma.plan.update({ where: { key }, data });
  res.json({ plan });
});

adminRouter.patch("/settings", async (req, res) => {
  const parsed = z.object({ trialDays: z.number().int().min(0).max(60) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Champs invalides" });
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", trialDays: parsed.data.trialDays },
    update: { trialDays: parsed.data.trialDays },
  });
  res.json({ settings });
});

// ───────────────────────── Stats ─────────────────────────

adminRouter.get("/stats", async (_req, res) => {
  const plans = await prisma.plan.findMany();
  const counts = await prisma.subscription.groupBy({ by: ["plan", "status"], _count: true });
  const activeMonthly = counts.find((c) => c.plan === "MONTHLY" && c.status === "ACTIVE")?._count ?? 0;
  const activeAnnual = counts.find((c) => c.plan === "ANNUAL" && c.status === "ACTIVE")?._count ?? 0;
  const trialCount = counts.filter((c) => c.status === "TRIALING").reduce((n, c) => n + c._count, 0);
  const monthly = plans.find((p) => p.key === "MONTHLY");
  const annual = plans.find((p) => p.key === "ANNUAL");
  const mrr =
    (monthly ? (activeMonthly * monthly.priceCents) / 100 : 0) +
    (annual ? (activeAnnual * annual.priceCents) / 100 / 12 : 0);

  res.json({
    mrr: Math.round(mrr).toLocaleString("fr-FR") + " €",
    activeCount: activeMonthly + activeAnnual,
    trialCount,
  });
});
