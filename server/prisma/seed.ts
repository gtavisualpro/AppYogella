import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");

  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", trialDays: 7 },
    update: {},
  });

  await prisma.plan.upsert({
    where: { key: "MONTHLY" },
    create: { key: "MONTHLY", label: "Mensuel", priceCents: 1200, active: true },
    update: {},
  });
  await prisma.plan.upsert({
    where: { key: "ANNUAL" },
    create: { key: "ANNUAL", label: "Annuel", priceCents: 9900, active: true },
    update: {},
  });

  const universes: [string, string, string, string, string][] = [
    ["yoga", "Yoga", "var(--color-accent-2-300)", "var(--color-accent-2-900)", "categorie"],
    ["bains-sonores", "Bains sonores", "var(--color-accent-300)", "var(--color-accent-900)", "categorie"],
    ["respiration", "Respiration", "var(--color-neutral-300)", "var(--color-neutral-900)", "categorie"],
    ["auto-massages", "Auto-massages", "var(--color-accent-200)", "var(--color-accent-900)", "categorie"],
    ["comprendre-son-corps", "Comprendre son corps", "var(--color-accent-2-200)", "var(--color-accent-2-900)", "article"],
    ["sante-femme", "Santé de la femme", "var(--color-accent-300)", "var(--color-accent-900)", "programme"],
    ["nutrition", "Nutrition", "var(--color-accent-2-400)", "var(--color-accent-2-900)", "categorie"],
    ["sommeil", "Sommeil", "var(--color-neutral-700)", "#f9f4ed", "categorie"],
    ["mental-emotions", "Mental & émotions", "var(--color-neutral-200)", "var(--color-neutral-900)", "categorie"],
    ["podcasts", "Podcasts", "var(--color-accent-100)", "var(--color-accent-900)", "categorie"],
  ];
  for (const [slug, label, bg, fg, dest] of universes) {
    await prisma.universe.upsert({
      where: { slug },
      create: { slug, label, bg, fg, dest, order: universes.findIndex((u) => u[0] === slug) },
      update: { label, bg, fg, dest },
    });
  }

  const experts = [
    { name: "Estelle", role: "Yoga, Méditation, Respiration, Bains sonores" },
    { name: "Virginie", role: "Naturopathie, Nutrition" },
    { name: "Camille", role: "Ostéopathie" },
    { name: "Julie", role: "Sage-femme" },
  ];
  await prisma.expert.deleteMany();
  await prisma.expert.createMany({ data: experts });

  await prisma.programCourse.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.watchProgress.deleteMany();
  await prisma.program.deleteMany();
  await prisma.course.deleteMany();

  const courseData = [
    { key: "yoga-doux-soir", title: "Yoga doux du soir", universe: "Yoga", durationMin: 20, premium: false },
    { key: "soulager-bas-dos", title: "Soulager le bas du dos", universe: "Yoga", durationMin: 20, premium: true },
    { key: "respirer-connecter", title: "Respirer & se connecter", universe: "Respiration", durationMin: 22, premium: false },
    { key: "ouvrir-bassin", title: "Ouvrir le bassin", universe: "Yoga", durationMin: 28, premium: true },
    {
      key: "drainage-visage",
      title: "Drainage lymphatique du visage",
      universe: "Auto-massages",
      category: "Visage",
      durationMin: 15,
      premium: true,
    },
    {
      key: "mal-au-dos-article",
      title: "Pourquoi ai-je mal au dos ?",
      universe: "Comprendre son corps",
      durationMin: 8,
      premium: false,
      kind: "ARTICLE" as const,
      authorName: "Camille",
      authorRole: "ostéopathe",
      body:
        "Camille, ostéopathe, vous explique les causes les plus fréquentes du mal de dos — posture, sédentarité, stress — et comment les soulager durablement grâce à des gestes simples au quotidien.",
    },
    { key: "detente-profonde", title: "Détente profonde", universe: "Yoga", durationMin: 20, premium: true },
    { key: "jambes-legeres", title: "Jambes légères", universe: "Auto-massages", category: "Récupération", durationMin: 20, premium: false },
    { key: "nuque-trapezes", title: "Nuque & trapèzes", universe: "Auto-massages", category: "Corps", durationMin: 15, premium: true },
    { key: "ventre-digestion", title: "Ventre & digestion", universe: "Auto-massages", category: "Drainage", durationMin: 18, premium: true },
    { key: "yoga-special-dos", title: "Yoga doux spécial dos", universe: "Yoga", durationMin: 25, premium: true },
    { key: "etirements-matin", title: "Étirements du matin", universe: "Yoga", durationMin: 15, premium: true },
    {
      key: "5-erreurs-dos",
      title: "Les 5 erreurs qui aggravent le mal de dos",
      universe: "Comprendre son corps",
      durationMin: 6,
      premium: true,
      kind: "ARTICLE" as const,
      authorName: "Camille",
      authorRole: "ostéopathe",
      body: "Les habitudes du quotidien qui abîment le dos sans qu'on s'en rende compte, et comment les corriger.",
    },
    { key: "auto-massage-bas-dos", title: "Auto-massage bas du dos", universe: "Auto-massages", category: "Corps", durationMin: 15, premium: true },
    {
      key: "asseoir-bureau",
      title: "Bien s'asseoir au bureau",
      universe: "Comprendre son corps",
      durationMin: 5,
      premium: false,
      authorName: "Camille",
      authorRole: "ostéopathe",
    },
    { key: "respiration-coherence", title: "Respiration cohérence cardiaque", universe: "Respiration", durationMin: 5, premium: false },
  ];

  const courses: Record<string, { id: string }> = {};
  for (const c of courseData) {
    const { key, ...data } = c;
    courses[key] = await prisma.course.create({ data });
  }

  const prenatal = await prisma.program.create({
    data: { title: "Yoga prénatal", description: "Un programme complet pour vivre une grossesse sereine et en pleine forme." },
  });
  const dosSerein = await prisma.program.create({ data: { title: "Dos serein", description: "8 séances ciblées" } });
  const sommeilProfond = await prisma.program.create({ data: { title: "Sommeil profond", description: "Rituels du soir" } });

  const link = (programId: string, courseKey: string, order: number) =>
    prisma.programCourse.create({ data: { programId, courseId: courses[courseKey].id, order } });

  await link(prenatal.id, "respirer-connecter", 0);
  await link(prenatal.id, "soulager-bas-dos", 1);
  await link(prenatal.id, "ouvrir-bassin", 2);
  await link(prenatal.id, "detente-profonde", 3);

  await link(dosSerein.id, "soulager-bas-dos", 0);
  await link(dosSerein.id, "mal-au-dos-article", 1);

  await link(sommeilProfond.id, "yoga-doux-soir", 0);

  const matin = await prisma.program.create({ data: { title: "Ma routine du matin", isRoutine: true } });
  await link(matin.id, "respirer-connecter", 0);
  await link(matin.id, "yoga-doux-soir", 1);

  const soir = await prisma.program.create({ data: { title: "Détente du soir", isRoutine: true } });
  await link(soir.id, "soulager-bas-dos", 0);
  await link(soir.id, "ouvrir-bassin", 1);

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "estelle@yogella.fr" },
    create: {
      name: "Estelle Marchand",
      email: "estelle@yogella.fr",
      passwordHash,
      isAdmin: true,
      subscription: { create: { status: "ACTIVE", plan: "ANNUAL", currentPeriodEnd: new Date("2027-03-15") } },
    },
    update: {},
  });

  await prisma.favorite.createMany({
    data: [
      { userId: admin.id, courseId: courses["yoga-doux-soir"].id },
      { userId: admin.id, courseId: courses["drainage-visage"].id },
      { userId: admin.id, courseId: courses["respiration-coherence"].id },
    ],
    skipDuplicates: true,
  });

  await prisma.watchProgress.create({
    data: { userId: admin.id, courseId: courses["yoga-doux-soir"].id, progressPct: 0.29, completed: false },
  });

  const demoUsers = [
    { name: "Léa Fontaine", email: "lea.fontaine@example.com", status: "ACTIVE" as const, plan: "MONTHLY" as const, active: true },
    { name: "Sarah Benali", email: "sarah.benali@example.com", status: "TRIALING" as const, plan: null, active: true },
    { name: "Claire Dupuis", email: "claire.dupuis@example.com", status: "NONE" as const, plan: null, active: false },
  ];
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { name: u.name, email: u.email, passwordHash, active: u.active },
      update: { active: u.active },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: u.status, plan: u.plan },
      update: { status: u.status, plan: u.plan },
    });
  }

  console.log("Seed complete. Admin login: estelle@yogella.fr / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
