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

if (!env.DIRECT_DATABASE_URL) {
  const fallback = env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING;
  if (fallback) {
    console.log("[vercel-build] DIRECT_DATABASE_URL déduite de la connexion non poolée de Neon.");
    env.DIRECT_DATABASE_URL = fallback;
  } else if (env.DATABASE_URL) {
    // Dernier recours : migrer via l'URL poolée. Cela fonctionne sur de
    // petites migrations mais peut échouer sur des verrous longs — d'où
    // l'avertissement explicite plutôt qu'un repli silencieux.
    console.warn(
      "[vercel-build] ⚠️  Aucune connexion directe trouvée ; migration via l'URL poolée. " +
        "Définissez DIRECT_DATABASE_URL (URL Neon sans « -pooler ») pour fiabiliser les migrations.",
    );
    env.DIRECT_DATABASE_URL = env.DATABASE_URL;
  }
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
