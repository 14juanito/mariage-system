#!/usr/bin/env node
/**
 * Build exécuté par Vercel (script `vercel-build` de package.json).
 *
 * Enchaîne : client Prisma → migrations → build Next, en normalisant d'abord
 * les variables de connexion.
 *
 * Pourquoi ce script plutôt qu'une simple chaîne de commandes : l'intégration
 * Neon de Vercel ne crée pas de variable nommée `DIRECT_DATABASE_URL` (le nom
 * qu'attend `directUrl` dans schema.prisma). Elle expose la connexion non
 * poolée sous un nom qui varie selon la version de l'intégration. Sans ce
 * repli, le déploiement échoue sur « Environment variable not found », alors
 * que la base est correctement provisionnée.
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };

/** Une variable vide vaut une variable absente (Vercel peut fournir ""). */
const value = (name) => {
  const v = env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

const pooled = value("DATABASE_URL") ?? value("POSTGRES_PRISMA_URL");
// Lu avant toute réécriture d'`env` : sert à savoir si la valeur retenue vient
// du nom attendu ou d'un repli sur un alias Neon.
const explicitDirect = value("DIRECT_DATABASE_URL");
const direct = explicitDirect ?? value("DATABASE_URL_UNPOOLED") ?? value("POSTGRES_URL_NON_POOLING");

// Sans URL de base, inutile d'aller plus loin : Prisma échouerait de toute
// façon, mais avec un message obscur (« resolved to an empty string ») qui
// n'indique pas quoi corriger.
if (!pooled && !direct) {
  console.error(
    "\n[vercel-build] ❌ Aucune URL de base de données dans l'environnement.\n" +
      "   Attendu : DATABASE_URL (et idéalement la connexion non poolée).\n" +
      "   Sur Vercel : onglet Storage du projet → Connect Store → base Neon,\n" +
      "   puis relancez le déploiement (Deployments → ⋯ → Redeploy).\n",
  );
  process.exit(1);
}

if (!pooled) {
  console.error("\n[vercel-build] ❌ DATABASE_URL manquante (seule la connexion directe est définie).\n");
  process.exit(1);
}

env.DATABASE_URL = pooled;

if (direct) {
  env.DIRECT_DATABASE_URL = direct;
  if (!explicitDirect) {
    console.log("[vercel-build] DIRECT_DATABASE_URL déduite de la connexion non poolée de Neon.");
  }
} else {
  // Dernier recours : migrer via l'URL poolée. Cela fonctionne sur de petites
  // migrations mais peut échouer sur des verrous longs — d'où l'avertissement
  // explicite plutôt qu'un repli silencieux.
  console.warn(
    "[vercel-build] ⚠️  Aucune connexion directe trouvée ; migration via l'URL poolée. " +
      "Définissez DIRECT_DATABASE_URL (URL Neon sans « -pooler ») pour fiabiliser les migrations.",
  );
  env.DIRECT_DATABASE_URL = pooled;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) {
    console.error(`[vercel-build] Échec : ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["next", "build"]);
