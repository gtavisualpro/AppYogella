# Déploiement — Coolify + Supabase

L'application est packagée en **une seule image Docker** : le process Express
sert l'API (`/api/*`), les vidéos uploadées (`/uploads/*`) **et** le build du
front React. Un seul service, un seul domaine, donc pas de CORS et des cookies
de session same-site.

```
navigateur ──► Traefik (Coolify) ──► conteneur :3000 ──► Supabase (Postgres)
                                          │
                                          └── volume /app/uploads
```

---

## 1. En local

### Option A — Docker Compose (recommandé, rien d'autre à installer)

Lance Postgres + l'application, avec la même image que la production :

```bash
docker compose up --build
```

→ <http://localhost:3000>. La base est migrée et peuplée automatiquement au
premier démarrage.

### Option B — Supabase en local (CLI Supabase)

```bash
supabase init
supabase start          # Postgres sur 127.0.0.1:54322
```

Puis dans `server/.env` :

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public"
```

### Option C — Node en direct (itération rapide sur le front)

```bash
cd server && cp .env.example .env && npm install
npx prisma migrate dev && npm run seed && npm run dev   # :4000

cd web && npm install && npm run dev                    # :5173 (proxy → :4000)
```

Compte admin de démonstration : `estelle@yogella.fr` / `password123`.

---

## 2. Brancher Supabase (cloud)

Dans le dashboard Supabase : **Project Settings → Database → Connection string**.

Deux URLs sont nécessaires, parce que Prisma migre via une connexion directe et
tourne via le pooler :

| Variable       | Port   | Usage                                     |
| -------------- | ------ | ----------------------------------------- |
| `DATABASE_URL` | `6543` | runtime — transaction pooler (pgBouncer)   |
| `DIRECT_URL`   | `5432` | `prisma migrate deploy` — session pooler   |

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres"
```

`?pgbouncer=true` n'est pas optionnel : sans lui, Prisma prépare des requêtes
que pgBouncer ne sait pas réutiliser en mode transaction.

N'ajoutez **pas** `connection_limit=1`. C'est la recette pour du serverless, où
chaque invocation ouvre son propre client ; ici le conteneur est un process
long, et plafonner le pool à une connexion sérialiserait toutes les requêtes.

> **IPv6 — à vérifier avant le premier déploiement.** L'hôte de connexion
> directe `db.<ref>.supabase.co` n'a **pas d'enregistrement A** : il n'est
> joignable qu'en IPv6. Si votre serveur Coolify n'a pas d'IPv6 sortant,
> `prisma migrate deploy` échouera au démarrage du conteneur.
>
> ```
> $ host -t A db.<ref>.supabase.co
> db.<ref>.supabase.co has no A record
> ```
>
> Deux solutions : pointer `DIRECT_URL` sur le **session pooler**
> (`aws-0-<region>.pooler.supabase.com:5432`, qui répond en IPv4) plutôt que sur
> `db.<ref>.supabase.co`, ou activer l'add-on IPv4 de Supabase (payant). La
> première est gratuite et suffit — c'est celle retenue par défaut ici.

Le schéma est géré **par les migrations Prisma** (`server/prisma/migrations/`),
pas depuis l'éditeur SQL de Supabase — l'entrypoint du conteneur applique
`prisma migrate deploy` à chaque déploiement.

> Les tables vivent dans le schéma `public` et sont accédées via le rôle
> `postgres`, donc la Row Level Security de Supabase n'entre pas en jeu :
> l'autorisation est faite par l'API (JWT de session + `isAdmin`). Si vous
> exposez un jour ces tables à `anon`/`authenticated` via PostgREST, il faudra
> écrire les policies RLS correspondantes.

---

## 3. Déployer sur Coolify

1. **New Resource → Application → Public/Private Repository**, pointer sur ce dépôt.
2. **Build Pack : `Dockerfile`** (à la racine). Ne pas choisir Nixpacks.
3. **Ports Exposes : `3000`**.
4. **Health check path : `/api/health`** (déjà déclaré en `HEALTHCHECK` dans l'image).
5. **Persistent Storage** — indispensable, sinon les vidéos uploadées
   disparaissent à chaque déploiement :
   - Type : *Volume*
   - Destination Path : `/app/uploads`
6. **Environment Variables** :

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_URL` | URL poolée Supabase (port 6543) |
   | `DIRECT_URL` | URL directe Supabase (port 5432) |
   | `JWT_SECRET` | `openssl rand -hex 32` |
   | `WEB_ORIGIN` | `https://votre-domaine.fr` |
   | `NODE_ENV` | `production` |
   | `SEED_ON_START` | `true` au tout premier déploiement, puis `false` |
   | `STRIPE_SECRET_KEY` | facultatif |
   | `STRIPE_WEBHOOK_SECRET` | facultatif |
   | `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` | facultatif |

7. Renseigner le domaine dans **Domains**, puis **Deploy**.

`WEB_ORIGIN` doit être le domaine public : il sert d'origine CORS autorisée et
d'URL de retour pour le checkout Stripe. Il accepte une liste séparée par des
virgules si plusieurs domaines pointent sur l'application.

### Ce que fait l'entrypoint à chaque démarrage

1. Vérifie `DATABASE_URL` (et retombe sur elle si `DIRECT_URL` est absente).
2. `prisma migrate deploy`.
3. Si `SEED_ON_START=true` **et** que la table `Course` est vide, exécute le
   seed. Le garde-fou est important : `prisma/seed.ts` fait un `deleteMany` sur
   le catalogue et écraserait les données réelles à chaque redémarrage.

### Webhook Stripe

Si vous activez la facturation, pointer le webhook Stripe sur
`https://votre-domaine.fr/api/webhooks/stripe` et reporter le signing secret
dans `STRIPE_WEBHOOK_SECRET`.

---

## 4. Points d'attention

- **Uploads et scaling horizontal.** Les vidéos sont écrites sur le disque local
  (`server/src/lib/upload.ts`). Le volume Coolify suffit pour une instance ; à
  plusieurs replicas il faudra basculer sur Supabase Storage ou S3 — ce fichier
  est le seul point à modifier.
- **Cookies.** Le cookie de session est `httpOnly`, `sameSite=lax` et `secure`
  dès que `NODE_ENV=production`. L'application fait confiance aux en-têtes
  `X-Forwarded-*` de Traefik (`app.set("trust proxy", 1)`), sans quoi le cookie
  ne serait jamais posé derrière HTTPS.
- **Migrations.** Toute évolution du schéma se fait via
  `npx prisma migrate dev --name <nom>` en local, puis commit du dossier généré.
