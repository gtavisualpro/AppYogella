import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { youtubeThumbnail } from "../lib/youtube.js";
import { serializeCourse } from "../lib/courseSerialize.js";

/**
 * Couverture d'un programme : l'image choisie par l'admin, sinon la vignette de
 * la première séance (elle-même issue de YouTube si le cours en vient).
 */
function programCover(p: {
  coverUrl: string | null;
  courses: { course: { thumbnailUrl: string | null; youtubeId: string | null } }[];
}): string | null {
  if (p.coverUrl) return p.coverUrl;
  for (const pc of p.courses) {
    if (pc.course.thumbnailUrl) return pc.course.thumbnailUrl;
    if (pc.course.youtubeId) return youtubeThumbnail(pc.course.youtubeId);
  }
  return null;
}

export const catalogRouter = Router();

catalogRouter.get("/universes", async (_req, res) => {
  const universes = await prisma.universe.findMany({ orderBy: { order: "asc" } });
  res.json({ universes });
});

catalogRouter.get("/courses", async (req, res) => {
  const { universe, category, search, kind } = req.query as Record<string, string | undefined>;
  const hasAccess = req.user?.hasAccess ?? false;

  const courses = await prisma.course.findMany({
    where: {
      ...(universe ? { universe } : {}),
      ...(category && category !== "Tous" ? { category } : {}),
      ...(kind ? { kind: kind as "COURSE" | "ARTICLE" } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ courses: courses.map((c) => serializeCourse(c, hasAccess)) });
});

catalogRouter.get("/courses/:id", async (req, res) => {
  const hasAccess = req.user?.hasAccess ?? false;
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: "Cours introuvable" });
  res.json({ course: serializeCourse(course, hasAccess, { includeMedia: true }) });
});

catalogRouter.get("/programs", async (req, res) => {
  const routine = req.query.routine;
  const programs = await prisma.program.findMany({
    where: routine !== undefined ? { isRoutine: routine === "true" } : {},
    include: { courses: { include: { course: true }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const hasAccess = req.user?.hasAccess ?? false;
  res.json({
    programs: programs.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      coverUrl: programCover(p),
      isRoutine: p.isRoutine,
      sessionCount: p.courses.length,
      totalDurationMin: p.courses.reduce((n, pc) => n + pc.course.durationMin, 0),
      meta: `${p.courses.length} séance${p.courses.length === 1 ? "" : "s"}${
        p.courses.length ? " · " + minMaxDuration(p.courses.map((pc) => pc.course.durationMin)) : ""
      }`,
      locked: p.courses.length > 0 && p.courses.every((pc) => pc.course.premium && !hasAccess),
    })),
  });
});

function minMaxDuration(durations: number[]): string {
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  return min === max ? `${min} min` : `${min}-${max} min`;
}

catalogRouter.get("/programs/:id", async (req, res) => {
  const hasAccess = req.user?.hasAccess ?? false;
  const program = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: { courses: { include: { course: true }, orderBy: { order: "asc" } } },
  });
  if (!program) return res.status(404).json({ error: "Programme introuvable" });

  let progressByCourse = new Map<string, boolean>();
  if (req.user) {
    const rows = await prisma.watchProgress.findMany({
      where: { userId: req.user.id, courseId: { in: program.courses.map((pc) => pc.courseId) } },
    });
    progressByCourse = new Map(rows.map((r) => [r.courseId, r.completed]));
  }

  res.json({
    program: {
      id: program.id,
      title: program.title,
      description: program.description,
      coverUrl: programCover(program),
      isRoutine: program.isRoutine,
      sessions: program.courses.map((pc, i) => ({
        ...serializeCourse(pc.course, hasAccess),
        order: i + 1,
        title: `${i + 1}. ${pc.course.title}`,
        done: progressByCourse.get(pc.courseId) ?? false,
      })),
    },
  });
});

catalogRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { key: "asc" } });
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  res.json({
    plans: plans.map((p) => ({
      key: p.key,
      title: p.label,
      price: (p.priceCents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",") + " €",
      priceCents: p.priceCents,
    })),
    trialDays: settings?.trialDays ?? 0,
  });
});

catalogRouter.get("/experts", async (_req, res) => {
  const experts = await prisma.expert.findMany();
  res.json({
    experts: experts.map((e) => ({ ...e, initial: e.name.slice(0, 1).toUpperCase() })),
  });
});
