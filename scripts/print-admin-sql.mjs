#!/usr/bin/env node
/**
 * Produit le SQL de création d'un compte administrateur, à exécuter depuis la
 * console web de la base.
 *
 * Certains réseaux (fournisseurs d'accès, pare-feux d'entreprise) bloquent le
 * port 5432 : la connexion TCP s'ouvre, puis le trafic PostgreSQL est coupé.
 * Aucun client — Prisma comme psql — ne peut alors atteindre la base, et les
 * scripts qui s'y connectent sont inutilisables. L'éditeur SQL de Neon passe
 * par HTTPS, qui lui reste ouvert.
 *
 * Le mot de passe ne quitte pas cette machine : seul son condensat bcrypt
 * apparaît dans le SQL, et un condensat ne permet pas de retrouver le mot de
 * passe. Le SQL produit peut donc être collé sans risque dans un navigateur.
 *
 * Usage :
 *   node scripts/print-admin-sql.mjs
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 12;

/** Lit une ligne sans l'afficher, pour ne pas laisser le mot de passe à l'écran. */
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

/** Échappe une valeur pour une chaîne littérale SQL. */
function sql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  if (!stdin.isTTY) {
    console.error("\n❌ À lancer dans un terminal interactif (saisie masquée du mot de passe).\n");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  try {
    const email = (await rl.question("E-mail de l'administrateur : ")).trim().toLowerCase();
    if (!/^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/.test(email)) throw new Error("Adresse e-mail invalide.");

    const name = (await rl.question("Nom affiché (ex. Lydie & Jackson) : ")).trim();
    if (!name) throw new Error("Le nom ne peut pas être vide.");

    const password = await askHidden(rl, `Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum) : `);
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Mot de passe trop court : ${MIN_PASSWORD_LENGTH} caractères minimum.`);
    }
    const confirmation = await askHidden(rl, "Confirmez le mot de passe : ");
    if (password !== confirmation) throw new Error("Les deux saisies diffèrent.");

    // Même coût que l'application (`hashPassword`), pour que les condensats
    // produits ici soient indiscernables de ceux créés par l'interface.
    const passwordHash = await bcrypt.hash(password, 12);

    const userId = randomUUID();
    const weddingId = randomUUID();
    const staffId = randomUUID();

    console.log(`
────────────────────────────────────────────────────────────────
 Copiez TOUT le bloc ci-dessous dans l'éditeur SQL de Neon
 (console Neon → SQL Editor), puis exécutez-le.
────────────────────────────────────────────────────────────────

-- 1. Le compte. Relancé sur un e-mail existant, il en change le mot de passe.
INSERT INTO users (id, email, name, password_hash, created_at)
VALUES (${sql(userId)}, ${sql(email)}, ${sql(name)}, ${sql(passwordHash)}, now())
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name;

-- 2. Un mariage, uniquement s'il n'en existe aucun. Les valeurs sont
--    provisoires : elles se corrigent ensuite depuis /admin/wedding.
INSERT INTO weddings (id, owner_id, bride_name, groom_name, wedding_date,
                      wedding_time, venue_name, venue_address, welcome_message,
                      created_at, updated_at)
SELECT ${sql(weddingId)}, u.id, 'À compléter', 'À compléter', CURRENT_DATE,
       '16:00', 'À compléter', 'À compléter',
       'À compléter depuis l''espace d''administration.', now(), now()
FROM users u
WHERE u.email = ${sql(email)}
  AND NOT EXISTS (SELECT 1 FROM weddings);

-- 3. Le rôle ADMIN sur ce mariage.
INSERT INTO wedding_staff (id, wedding_id, user_id, role, created_at)
SELECT ${sql(staffId)}, w.id, u.id, 'ADMIN', now()
FROM weddings w
CROSS JOIN users u
WHERE u.email = ${sql(email)}
ORDER BY w.created_at
LIMIT 1
ON CONFLICT (wedding_id, user_id) DO UPDATE SET role = 'ADMIN';

-- 4. Vérification : doit renvoyer une ligne avec le rôle ADMIN.
SELECT u.email, u.name, s.role
FROM users u
JOIN wedding_staff s ON s.user_id = u.id
WHERE u.email = ${sql(email)};

────────────────────────────────────────────────────────────────
 Le mot de passe n'apparaît nulle part ci-dessus : seul son
 condensat bcrypt y figure, et il n'est pas réversible.
────────────────────────────────────────────────────────────────
`);
  } catch (error) {
    console.error(`\n❌ ${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
