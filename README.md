# Mariage System

Plateforme de gestion d'invitations de mariage et de check-in QR : les mariés gèrent leurs invités, génèrent des invitations numériques élégantes (page web + PDF A4 imprimable) avec QR code unique, et l'équipe d'accueil valide les entrées le jour J via un scanner mobile — avec une garantie stricte : **une invitation = une entrée**, même en cas de scans simultanés sur deux appareils.

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR pour la page publique d'invitation, Server Actions pour les mutations, un seul process à déployer |
| UI | Tailwind CSS + shadcn/ui (composants maison, sans dépendance CLI) + Lucide Icons | Design system cohérent, léger |
| Base de données | PostgreSQL (Neon) + Prisma | Offre serverless avec pooling de connexions intégré, migrations versionnées, requêtes typées |
| Auth | Sessions maison (bcryptjs + table `sessions` + cookie httpOnly signé) | Révocation immédiate possible, aucune dépendance à un service externe |
| PDF | `@react-pdf/renderer` | Génère le PDF en JS pur — **aucun Chromium/Puppeteer requis**, donc pas de binaire système à installer dans la fonction serverless |
| QR code | `qrcode` (génération) + `jsqr` (lecture caméra côté client) | Pas de dépendance native |
| Temps réel dashboard | Polling intelligent (`/api/stats` toutes les ~5s, en pause si l'onglet est caché) | Aucune connexion persistante à maintenir — adapté à un runtime serverless sans état |

## Prérequis

- Node.js ≥ 18.18 (testé avec Node 22)
- Un serveur PostgreSQL accessible (local en dev, Neon en production)

## Installation locale

```bash
npm install
cp .env.example .env
# Éditez .env : DATABASE_URL, SESSION_SECRET (générez-en un avec `openssl rand -base64 48`)

npx prisma migrate dev   # crée le schéma
npm run prisma:seed      # crée un compte admin, un compte accueil, et un mariage de démo
npm run dev               # http://localhost:3000
```

Comptes créés par le seed (à changer immédiatement en production) :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Administrateur (mariés) | `admin@mariage-demo.test` | `changeme123` |
| Accueil (check-in) | `accueil@mariage-demo.test` | `changeme123` |

## Variables d'environnement

Voir `.env.example` pour la liste complète. Aucun secret réel ne doit être commité — `.env` est dans `.gitignore`.

- `DATABASE_URL` — connexion PostgreSQL **poolée**, utilisée par l'application (sur Neon : l'URL contenant `-pooler`). Indispensable en serverless, où chaque invocation peut ouvrir sa propre connexion.
- `DIRECT_DATABASE_URL` — connexion PostgreSQL **directe**, utilisée uniquement par `prisma migrate` (qui a besoin de sessions longues et de verrous incompatibles avec PgBouncer en mode transaction)
- `SESSION_SECRET` — chaîne aléatoire ≥ 32 caractères, signe les cookies de session
- `NEXT_PUBLIC_APP_URL` — URL publique de l'app (utilisée pour construire les liens d'invitation et le contenu des QR codes) — **doit être l'URL réelle en production**, sinon les QR codes générés pointeront vers la mauvaise adresse

## Base de données & migrations

Le schéma est défini dans [`prisma/schema.prisma`](prisma/schema.prisma) : `users`, `weddings`, `wedding_staff` (rôle ADMIN/CHECKIN par mariage), `guests`, `invitations`, `check_ins`, `audit_logs`.

```bash
npx prisma migrate dev --name <description>   # nouvelle migration en dev
npx prisma migrate deploy                       # applique les migrations en production (aucune génération, non-interactif)
npx prisma studio                                # explorer la base visuellement
```

### Le mécanisme anti double-scan

Le check-in n'utilise jamais un `SELECT` puis un `UPDATE` séparés. Une seule requête atomique :

```sql
UPDATE invitations
SET checked_in = true, checked_in_at = NOW(), checked_in_by = ?
WHERE token = ? AND status = 'ACTIVE' AND checked_in = false;
```

InnoDB verrouille la ligne pendant l'`UPDATE` : si deux scans arrivent au même instant, un seul peut matcher `checked_in = false` et gagner la course. Voir [`src/modules/check-in/service.ts`](src/modules/check-in/service.ts).

## Build & exécution

```bash
npm run build        # build local (ne touche pas à la base)
npm run start        # sert le build de production sur $PORT (3000 par défaut)
```

Sur Vercel, c'est `vercel-build` qui est utilisé à la place (voir [Déploiement](#déploiement-sur-vercel--neon)) : il ajoute la génération du client Prisma et l'application des migrations.

## Tests

```bash
npm test                    # tests unitaires (Vitest) : tokens, validation, rate limiting
npm run test:concurrency    # TEST CRITIQUE — deux scans strictement simultanés sur la même invitation
npm run test:e2e            # parcours complet via navigateur headless (nécessite `npm run dev` lancé)
```

`test:concurrency` reproduit exactement le scénario exigé : *invitation A, scan 1 → VALID, scan 2 → ALREADY_USED*, y compris dans le cas de deux requêtes strictement concurrentes (`Promise.all`). C'est la garantie la plus importante de l'application — à ne jamais casser sans la revalider.

`test:e2e` couvre : connexion admin, création d'invité (génération auto de l'invitation), consultation de la page publique, téléchargement du PDF, statistiques du dashboard, restrictions du rôle CHECKIN (accès refusé aux pages et API admin, y compris en accès direct par URL), et le cycle complet VALID → ALREADY_USED → INVALID via l'API réelle de scan.

## Déploiement sur Vercel + Neon

### 1. Créer la base Neon

Depuis le dashboard Vercel : **Storage → Create Database → Neon**. L'intégration renseigne automatiquement `DATABASE_URL` et `DIRECT_DATABASE_URL` (ainsi que d'autres variables `POSTGRES_*` non utilisées ici) dans le projet.

Si vous créez la base directement sur [neon.tech](https://neon.tech) plutôt que via l'intégration, récupérez les deux chaînes de connexion dans **Connection Details** : celle avec `-pooler` → `DATABASE_URL`, celle sans → `DIRECT_DATABASE_URL`.

### 2. Déployer l'application

```bash
git push          # puis « Import Project » sur vercel.com, ou :
npx vercel        # déploiement de prévisualisation
npx vercel --prod # déploiement en production
```

Vercel détecte Next.js automatiquement. Le script `vercel-build` (dans `package.json`) prend le pas sur `build` et enchaîne :

```
prisma generate && prisma migrate deploy && next build
```

`prisma generate` est indispensable car Vercel met `node_modules` en cache : sans lui, le client Prisma généré peut être périmé. `prisma migrate deploy` applique les migrations en attente à chaque déploiement — si une migration échoue, le déploiement échoue **avant** que du code ne tourne contre un schéma obsolète.

### 3. Variables d'environnement (Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | fournie par Neon (URL **avec** `-pooler`) |
| `DIRECT_DATABASE_URL` | fournie par Neon (URL **sans** `-pooler`) |
| `SESSION_SECRET` | `openssl rand -base64 48` — **différent** de celui du dev |
| `NEXT_PUBLIC_APP_URL` | l'URL réelle du site (`https://…`) |

> ⚠️ `NEXT_PUBLIC_APP_URL` est encodée dans chaque QR code. Si vous branchez un domaine personnalisé après le premier déploiement, mettez cette variable à jour **et redéployez**, sinon les QR codes déjà distribués pointeront vers l'ancienne adresse.

### 4. Créer le premier compte

Le seed crée des comptes de démonstration ; ne l'exécutez pas tel quel en production. Pointez `.env` sur la base de production le temps d'une commande :

```bash
DATABASE_URL="<url-neon-pooler>" DIRECT_DATABASE_URL="<url-neon-directe>" npm run prisma:seed
```

…puis **changez immédiatement les deux mots de passe** depuis l'interface, ou adaptez `prisma/seed.ts` avec vos propres identifiants avant de l'exécuter.

### Limites connues en serverless

- **Rate limiting par instance** : le compteur vit en mémoire de chaque fonction (voir `src/lib/rate-limit.ts`). Il freine le bruit mais n'est pas une limite globale stricte. Les garanties fortes (bcrypt, sessions en base, UPDATE atomique du check-in) ne dépendent pas de lui.
- **Démarrage à froid** : la première requête après une période d'inactivité peut prendre 1 à 2 s. Le jour J, l'usage continu du scanner garde les fonctions chaudes.

## Rôles

- **ADMIN** (les mariés) : configuration du mariage, CRUD invités, génération/désactivation d'invitations, statistiques, gestion de l'équipe, réinitialisation de check-in (avec motif obligatoire, journalisée).
- **CHECKIN** (accueil) : accès exclusif à `/admin/check-in`. Toute tentative d'accès à une autre page admin ou API redirige/retourne 401 — vérifié côté serveur (middleware + garde par page + garde par action), jamais seulement caché côté interface. Voir `npm run test:e2e` (`scripts/test-role-checkin.mjs`).

## Structure du projet

```
src/
├── app/                  # Routes (App Router) : pages admin, page publique /invitation/[token], routes API
├── components/ui/        # Composants shadcn/ui (boutons, dialogs, tables…)
├── components/shared/     # Composants métier (tableaux, formulaires, scanner QR, dashboard live…)
├── modules/               # Logique métier par domaine : auth, wedding, guests, invitations, check-in
├── lib/                   # Prisma client, validation zod, rate limiting, audit log, utilitaires
├── assets/fonts/          # Polices auto-hébergées (Cormorant Garamond, Inter) pour le rendu PDF
└── middleware.ts          # Garde-fou d'authentification (Edge, redirige si aucune session)
prisma/                    # Schéma, migrations, seed
scripts/                   # Test de concurrence critique + smoke tests E2E
```

## Dépannage

- **`P3014` / shadow database lors de `prisma migrate dev`** : l'utilisateur PostgreSQL de dev doit pouvoir créer des bases temporaires. En production, c'est `prisma migrate deploy` qui tourne (pas de shadow database requise).
- **`prisma migrate` qui échoue ou se bloque en production** : vérifiez que `DIRECT_DATABASE_URL` pointe bien sur l'URL **sans** `-pooler`. Les migrations ne peuvent pas passer par PgBouncer en mode transaction.
- **`too many connections`** : à l'inverse, vérifiez que `DATABASE_URL` (celle qu'utilise l'app) est bien l'URL **avec** `-pooler`.
- **QR codes qui pointent vers `localhost`** : vérifiez `NEXT_PUBLIC_APP_URL` en production — c'est cette variable qui est encodée dans chaque QR code et chaque lien copié.
- **PDF non généré / police introuvable** : vérifiez que `src/assets/fonts/` a bien été déployé (voir `outputFileTracingIncludes` dans `next.config.ts`) — le rendu PDF ne dépend d'aucun service externe, tout est local.
- **Page "Une erreur est survenue"** : les erreurs serveur inattendues sont interceptées par `src/app/error.tsx` (jamais de stack trace brute affichée à l'utilisateur) ; le détail est journalisé côté serveur (console).
