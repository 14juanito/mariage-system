#!/usr/bin/env node
/**
 * Crée le premier compte administrateur d'une base fraîchement migrée.
 *
 * L'application n'expose aucune page d'inscription : le compte du couple est
 * créé hors ligne, une seule fois. `prisma/seed.ts` remplit ce rôle en
 * développement, mais ses identifiants sont écrits en dur dans un dépôt
 * public — inutilisables sur une base réellement en ligne.
 *
 * Ici, l'e-mail et le mot de passe sont demandés interactivement : ils ne
 * transitent ni par le code, ni par l'historique du shell, ni par les
 * journaux de déploiement.
 *
 * Usage :
 *   node scripts/create-admin.mjs
 *
 * La chaîne de connexion est demandée si `DATABASE_URL` n'est pas définie,
 * ce qui évite de la faire passer par la ligne de commande — donc par
 * l'historique du shell, qui la conserverait en clair.
 *
 * Relancer le script sur un e-mail existant met à jour son mot de passe.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 12;

/** Lit une ligne sans l'afficher, pour ne pas laisser le mot de passe à l'écran. */
async function askHidden(rl, question) {
  stdout.write(question);
  // `readline` réaffiche chaque caractère saisi via son flux de sortie ; on
  // neutralise cet écho le temps de la saisie plutôt que d'accepter un mot de
  // passe affiché en clair dans le terminal.
  const realWrite = rl.output.write.bind(rl.output);
  rl.output.write = () => true;
  try {
    return await rl.question("");
  } finally {
    rl.output.write = realWrite;
    stdout.write("\n");
  }
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
  // La saisie masquée du mot de passe suppose un vrai terminal. Sans ce
  // garde-fou, un lancement en pipe ou via CI s'interrompt sans rien dire :
  // readline attend une entrée qui n'arrivera jamais, et Node sort en silence.
  if (!stdin.isTTY) {
    console.error(
      "\n❌ Ce script doit être lancé dans un terminal interactif" +
        " (il demande un mot de passe sans l'afficher).\n",
    );
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  // `@prisma/client` charge le `.env` du projet dès son import : sans le
  // signaler, un lancement depuis le dossier de développement viserait la base
  // locale en silence, et le compte serait créé au mauvais endroit.
  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    console.log(`\nBase détectée dans l'environnement : ${describeTarget(databaseUrl)}`);
    // Un « o » distrait a déjà envoyé deux comptes sur la base de
    // développement. Pour une base locale, on exige donc un mot qui ne peut
    // pas être tapé par réflexe.
    const answer = isLocal(databaseUrl)
      ? await rl.question(
          "⚠️  Base LOCALE : un compte créé ici ne permet PAS de se connecter au site en ligne.\n" +
            "    Tapez le mot « local » pour l'utiliser quand même, ou Entrée pour en choisir une autre : ",
        )
      : await rl.question("Créer le compte sur CETTE base ? [o/N] ");
    const confirmed = isLocal(databaseUrl)
      ? answer.trim().toLowerCase() === "local"
      : ["o", "oui"].includes(answer.trim().toLowerCase());
    if (!confirmed) databaseUrl = undefined;
  }

  if (!databaseUrl) {
    console.log(
      "\nCollez la chaîne de connexion de la base visée.\n" +
        "Vercel → Storage → votre base Neon → Quickstart → DATABASE_URL.\n" +
        "Elle ne s'affichera pas pendant la saisie.\n",
    );
    databaseUrl = (await askHidden(rl, "DATABASE_URL : ")).trim();
    if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
      console.error("\n❌ Cela ne ressemble pas à une chaîne PostgreSQL (attendu : postgresql://…).\n");
      rl.close();
      process.exit(1);
    }
    console.log(`\nCible : ${describeTarget(databaseUrl)}\n`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    // Afficher l'existant avant de demander quoi que ce soit : c'est le seul
    // moyen, sans accès au tableau de bord, de savoir si un compte doit être
    // remplacé plutôt que créé.
    const existing = await prisma.user.findMany({
      select: { email: true, name: true, staffOf: { select: { role: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (existing.length === 0) {
      console.log("\nAucun compte n'existe pour l'instant.\n");
    } else {
      console.log("\nComptes déjà présents :");
      for (const u of existing) {
        const roles = u.staffOf.map((s) => s.role).join(", ") || "aucun rôle";
        console.log(`  · ${u.email} (${u.name}) — ${roles}`);
      }
      console.log("");
    }

    const email = (await rl.question("E-mail de l'administrateur : ")).trim().toLowerCase();
    if (!/^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/.test(email)) {
      throw new Error("Adresse e-mail invalide.");
    }

    const name = (await rl.question("Nom affiché (ex. Lydie & Jackson) : ")).trim();
    if (!name) throw new Error("Le nom ne peut pas être vide.");

    const password = await askHidden(rl, `Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum) : `);
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Mot de passe trop court : ${MIN_PASSWORD_LENGTH} caractères minimum.`);
    }
    const confirmation = await askHidden(rl, "Confirmez le mot de passe : ");
    if (password !== confirmation) throw new Error("Les deux saisies diffèrent.");

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name },
      create: { email, name, passwordHash },
    });

    // Le tableau de bord suppose qu'un mariage existe. On en crée un avec des
    // valeurs manifestement provisoires, à corriger depuis /admin/wedding,
    // plutôt que de laisser l'interface sur un état vide inexploitable.
    let wedding = await prisma.wedding.findFirst();
    if (!wedding) {
      wedding = await prisma.wedding.create({
        data: {
          ownerId: user.id,
          brideName: "À compléter",
          groomName: "À compléter",
          weddingDate: new Date(),
          weddingTime: "16:00",
          venueName: "À compléter",
          venueAddress: "À compléter",
          welcomeMessage: "À compléter depuis l'espace d'administration.",
        },
      });
    }

    await prisma.weddingStaff.upsert({
      where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
      update: { role: "ADMIN" },
      create: { weddingId: wedding.id, userId: user.id, role: "ADMIN" },
    });

    console.log(`\n✅ Compte administrateur prêt : ${email}`);
    console.log("   Connectez-vous sur /login, puis complétez les informations du mariage.\n");
  } catch (error) {
    console.error(`\n❌ ${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
