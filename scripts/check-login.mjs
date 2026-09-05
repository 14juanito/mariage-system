#!/usr/bin/env node
/**
 * Rejoue hors ligne la vérification que fait le serveur à la connexion.
 *
 * Une connexion refusée ne dit pas laquelle des trois causes s'applique :
 * compte absent de la base visée, mot de passe qui ne correspond pas, ou
 * application branchée sur une autre base que celle qu'on inspecte. Ce script
 * les sépare, en exécutant la même recherche et la même comparaison bcrypt
 * que `loginAction`, contre une base que l'on choisit explicitement.
 *
 * Lecture seule : il n'écrit jamais.
 *
 * Usage :
 *   node scripts/check-login.mjs
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Lit une ligne sans l'afficher, pour ne pas exposer un secret à l'écran. */
async function askHidden(rl, question) {
  stdout.write(question);
  const realWrite = rl.output.write.bind(rl.output);
  rl.output.write = () => true;
  try {
    return await rl.question("");
  } finally {
    rl.output.write = realWrite;
    stdout.write("\n");
  }
}

/** Première ligne utile d'une erreur : Prisma préfixe ses messages de sauts
 * de ligne, ce qui affichait un message vide et masquait la cause. */
function firstMeaningfulLine(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 3).join("\n   ") || "erreur sans message";
}

/** Une base servie par cette machine ne peut pas être celle du site déployé. */
function isLocal(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

/** Décrit la base visée sans jamais révéler le mot de passe de connexion. */
function describeTarget(url) {
  try {
    const u = new URL(url);
    const db = u.pathname.replace(/^\//, "") || "(défaut)";
    return `${db} sur ${u.hostname}${u.port ? ":" + u.port : ""} (utilisateur ${u.username || "?"})`;
  } catch {
    return "chaîne de connexion illisible";
  }
}

async function main() {
  if (!stdin.isTTY) {
    console.error("\n❌ À lancer dans un terminal interactif (saisie masquée du mot de passe).\n");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  // `@prisma/client` charge le `.env` du projet dès son import : sans cette
  // confirmation, on inspecterait la base de développement en croyant
  // regarder celle du site en ligne.
  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    console.log(`\nBase détectée dans l'environnement : ${describeTarget(databaseUrl)}`);
    // Même garde-fou que create-admin : inspecter la base locale par erreur
    // donne un diagnostic rassurant sur la mauvaise base.
    const answer = isLocal(databaseUrl)
      ? await rl.question(
          "⚠️  Base LOCALE : ce n'est pas celle du site en ligne.\n" +
            "    Tapez le mot « local » pour l'inspecter quand même, ou Entrée pour en choisir une autre : ",
        )
      : await rl.question("Inspecter CETTE base ? [o/N] ");
    const confirmed = isLocal(databaseUrl)
      ? answer.trim().toLowerCase() === "local"
      : ["o", "oui"].includes(answer.trim().toLowerCase());
    if (!confirmed) databaseUrl = undefined;
  }

  if (!databaseUrl) {
    console.log(
      "\nCollez la chaîne de connexion à inspecter (elle ne s'affichera pas).\n" +
        "Vercel → Storage → votre base Neon → Quickstart → DATABASE_URL.\n",
    );
    databaseUrl = (await askHidden(rl, "DATABASE_URL : ")).trim();
    if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
      console.error("\n❌ Attendu une chaîne PostgreSQL (postgresql://…).\n");
      rl.close();
      process.exit(1);
    }
  }

  console.log(`\n📍 Base inspectée : ${describeTarget(databaseUrl)}\n`);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const users = await prisma.user.findMany({
      select: { email: true, name: true, createdAt: true, staffOf: { select: { role: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Comptes présents : ${users.length}`);
    for (const u of users) {
      const roles = u.staffOf.map((s) => s.role).join(", ") || "aucun rôle";
      console.log(`  · ${u.email} (${u.name}) — ${roles} — créé ${u.createdAt.toISOString().slice(0, 19)}`);
    }
    console.log(`Mariages : ${await prisma.wedding.count()} · Invités : ${await prisma.guest.count()}\n`);

    const email = (await rl.question("E-mail à tester : ")).trim().toLowerCase();
    const password = await askHidden(rl, "Mot de passe à tester : ");

    // Même séquence que loginAction : recherche exacte, puis comparaison.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`\n❌ Aucun compte « ${email} » dans CETTE base.`);
      console.log("   → Le compte a été créé ailleurs, ou l'adresse diffère.\n");
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (ok) {
      console.log("\n✅ Compte trouvé ET mot de passe correct dans cette base.");
      console.log("   → Si la connexion échoue quand même en ligne, c'est que le site");
      console.log("     interroge une AUTRE base que celle-ci.\n");
    } else {
      console.log("\n❌ Compte trouvé, mais le mot de passe ne correspond pas.");
      console.log("   → Relancez scripts/create-admin.mjs sur cette base pour le redéfinir.\n");
    }
  } catch (error) {
    console.error(`\n❌ ${firstMeaningfulLine(error)}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
