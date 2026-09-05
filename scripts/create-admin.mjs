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
 *   DATABASE_URL="postgresql://..." node scripts/create-admin.mjs
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

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "\n❌ DATABASE_URL manquante.\n\n" +
        "   Récupérez la chaîne de connexion de votre base Neon\n" +
        "   (Vercel → Storage → votre base → Quickstart → DATABASE_URL)\n" +
        "   puis relancez :\n\n" +
        '     DATABASE_URL="postgresql://..." node scripts/create-admin.mjs\n',
    );
    process.exit(1);
  }

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
  const prisma = new PrismaClient();

  try {
    const email = (await rl.question("E-mail de l'administrateur : ")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
