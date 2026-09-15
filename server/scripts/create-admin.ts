/**
 * Crée (ou promeut) un compte administrateur.
 *
 *   npm run create-admin -- --email=x@y.fr --name="Prénom Nom"
 *
 * Le mot de passe est lu sur ADMIN_PASSWORD, ou demandé de façon masquée si la
 * variable est absente — pour qu'il ne finisse ni dans l'historique du shell ni
 * dans la liste des processus.
 *
 *   ADMIN_PASSWORD='…' npm run create-admin -- --email=x@y.fr --name="Prénom Nom"
 *
 * Si le compte existe déjà, il est promu admin ; le mot de passe n'est réécrit
 * qu'avec --reset-password. Un abonnement annuel actif est créé par défaut pour
 * donner accès au contenu premium (--no-subscription pour s'en passer).
 */
import "dotenv/config";
import readline from "node:readline";
import { Writable } from "node:stream";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Lecture masquée sur le TTY : rien ne s'affiche, rien n'est historisé. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const mutable = new Writable({
      write(chunk, _enc, cb) {
        if (!muted) process.stdout.write(chunk);
        cb();
      },
    });
    const rl = readline.createInterface({ input: process.stdin, output: mutable, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();

  if (!email || !name) {
    console.error('Usage : npm run create-admin -- --email=x@y.fr --name="Prénom Nom"');
    process.exitCode = 1;
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Adresse invalide : ${email}`);
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  let password = process.env.ADMIN_PASSWORD;
  const needsPassword = !existing || flag("reset-password");
  if (needsPassword && !password) {
    password = await promptHidden("Mot de passe : ");
  }
  if (needsPassword) {
    if (!password || password.length < 8) {
      console.error("Mot de passe absent ou trop court (8 caractères minimum).");
      process.exitCode = 1;
      return;
    }
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  const user = await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash: passwordHash!, isAdmin: true, active: true },
    update: {
      name,
      isAdmin: true,
      active: true,
      ...(flag("reset-password") && passwordHash ? { passwordHash } : {}),
    },
  });

  if (!flag("no-subscription")) {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: "ACTIVE", plan: "ANNUAL", currentPeriodEnd },
      update: { status: "ACTIVE", plan: "ANNUAL", currentPeriodEnd },
    });
  }

  console.log(
    `${existing ? "Compte promu administrateur" : "Administrateur créé"} : ${user.name} <${user.email}>`,
  );
  if (existing && !flag("reset-password")) {
    console.log("Mot de passe inchangé (utiliser --reset-password pour le remplacer).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
