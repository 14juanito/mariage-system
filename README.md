# Mariage System

Plateforme de gestion d'invitations de mariage et de check-in QR : les mariés gèrent leurs invités, génèrent des invitations numériques élégantes (page web + PDF A4 imprimable) avec QR code unique, et l'équipe d'accueil valide les entrées le jour J via un scanner mobile — avec une garantie stricte : **une invitation = une entrée**, même en cas de scans simultanés sur deux appareils.

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR pour la page publique d'invitation, Server Actions pour les mutations, un seul process à déployer |
| UI | Tailwind CSS + shadcn/ui (composants maison, sans dépendance CLI) + Lucide Icons | Design system cohérent, léger |
| Base de données | MySQL + Prisma | Compatible Hostinger, migrations versionnées, requêtes typées |
| Auth | Sessions maison (bcryptjs + table `sessions` + cookie httpOnly signé) | Révocation immédiate possible, aucune dépendance à un service externe |
| PDF | `@react-pdf/renderer` | Génère le PDF en JS pur — **aucun Chromium/Puppeteer requis**, compatible hébergement mutualisé |
| QR code | `qrcode` (génération) + `jsqr` (lecture caméra côté client) | Pas de dépendance native |
| Temps réel dashboard | Polling intelligent (`/api/stats` toutes les ~5s, en pause si l'onglet est caché) | Fiable sur un hébergement mutualisé, où les connexions persistantes (WebSocket) ne sont pas garanties |

Ces choix sont documentés en détail dans le plan d'architecture initial du projet (comparatif Next.js / Vite+Express / Laravel, contraintes Hostinger Premium).

## Prérequis

- Node.js ≥ 18.18 (testé avec Node 22)
- Un serveur MySQL/MariaDB accessible (local en dev, celui fourni par Hostinger en prod)

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

- `DATABASE_URL` — chaîne de connexion MySQL (`mysql://user:password@host:port/db`)
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
npm run build
npm run start        # sert le build de production sur $PORT (3000 par défaut)
```

Le build utilise `output: "standalone"` (voir `next.config.ts`) : `.next/standalone` contient une application Node autonome avec ses `node_modules` nécessaires, prête à être copiée sur le serveur.

## Tests

```bash
npm test                    # tests unitaires (Vitest) : tokens, validation, rate limiting
npm run test:concurrency    # TEST CRITIQUE — deux scans strictement simultanés sur la même invitation
npm run test:e2e            # parcours complet via navigateur headless (nécessite `npm run dev` lancé)
```

`test:concurrency` reproduit exactement le scénario exigé : *invitation A, scan 1 → VALID, scan 2 → ALREADY_USED*, y compris dans le cas de deux requêtes strictement concurrentes (`Promise.all`). C'est la garantie la plus importante de l'application — à ne jamais casser sans la revalider.

`test:e2e` couvre : connexion admin, création d'invité (génération auto de l'invitation), consultation de la page publique, téléchargement du PDF, statistiques du dashboard, restrictions du rôle CHECKIN (accès refusé aux pages et API admin, y compris en accès direct par URL), et le cycle complet VALID → ALREADY_USED → INVALID via l'API réelle de scan.

## Déploiement sur Hostinger (offre Premium — hébergement mutualisé Node.js)

1. **Base de données MySQL** : créez une base et un utilisateur dédié depuis hPanel → Bases de données. Notez l'hôte, le nom, l'utilisateur et le mot de passe.
2. **Application Node.js** : dans hPanel → Node.js, créez une application, pointez-la vers ce dépôt (déploiement Git pris en charge par Hostinger) ou uploadez le contenu de `.next/standalone` + `.next/static` + `public/` + `src/assets/fonts/`.
3. **Variables d'environnement** : renseignez `DATABASE_URL`, `SESSION_SECRET` (une valeur différente de celle du dev), `NEXT_PUBLIC_APP_URL` (votre domaine réel, en `https://`), `NODE_ENV=production` dans l'interface Node.js de hPanel.
4. **Migrations** : exécutez `npx prisma migrate deploy` (via le terminal SSH si disponible sur votre offre, sinon via une tâche de démarrage) avant le premier lancement.
5. **Domaine & HTTPS** : associez votre domaine à l'application et activez le certificat SSL gratuit fourni par Hostinger.
6. **Démarrage** : la commande de démarrage est `node .next/standalone/server.js` (ou `npm run start` selon ce que l'interface Node.js de Hostinger attend).

> ⚠️ Les caractéristiques exactes (accès SSH, cron, limites mémoire) varient selon le plan exact et peuvent évoluer — vérifiez-les dans hPanel avant le déploiement. Ce projet a été conçu pour **ne dépendre d'aucun binaire système** (pas de Chromium/Puppeteer, pas de Redis, pas de Docker) afin de rester compatible avec un hébergement mutualisé standard.

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

- **`P3014` / shadow database lors de `prisma migrate dev`** : l'utilisateur MySQL de dev doit pouvoir créer des bases temporaires. En production, utilisez `prisma migrate deploy` (n'a pas besoin de shadow database).
- **QR codes qui pointent vers `localhost`** : vérifiez `NEXT_PUBLIC_APP_URL` en production — c'est cette variable qui est encodée dans chaque QR code et chaque lien copié.
- **PDF non généré / police introuvable** : vérifiez que `src/assets/fonts/` a bien été déployé (voir `outputFileTracingIncludes` dans `next.config.ts`) — le rendu PDF ne dépend d'aucun service externe, tout est local.
- **Page "Une erreur est survenue"** : les erreurs serveur inattendues sont interceptées par `src/app/error.tsx` (jamais de stack trace brute affichée à l'utilisateur) ; le détail est journalisé côté serveur (console).
