#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL n'est pas défini — configurez la connexion Supabase/Postgres." >&2
  exit 1
fi

# `prisma migrate deploy` exige une connexion directe (non poolée). Sur une base
# locale, DATABASE_URL fait déjà l'affaire.
if [ -z "$DIRECT_URL" ]; then
  DIRECT_URL="$DATABASE_URL"
  export DIRECT_URL
fi

# Journalise la cible de chaque URL sans jamais révéler le mot de passe : une
# erreur d'authentification vient presque toujours d'un utilisateur tronqué
# (le pooler Supabase exige postgres.<project-ref>) ou d'un port erroné.
describe_url() {
  printf '  %-12s %s\n' "$1" "$(printf '%s' "$2" | sed -E 's#(://[^:]*):[^@]*@#\1:****@#')"
}
echo "Connexions configurées :"
describe_url "DATABASE_URL" "$DATABASE_URL"
describe_url "DIRECT_URL" "$DIRECT_URL"

echo "Application des migrations Prisma… (via DIRECT_URL)"
npx prisma migrate deploy

# SEED_ON_START peuple la base de démonstration, mais uniquement si elle est
# vide : prisma/seed.ts fait un deleteMany sur le catalogue et écraserait les
# données réelles à chaque redémarrage.
if [ "$SEED_ON_START" = "true" ]; then
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.course.count()
      .then((n) => { process.exitCode = n === 0 ? 0 : 1; })
      .catch((e) => { console.error(e); process.exitCode = 1; })
      .finally(() => p.\$disconnect());
  "; then
    echo "Base vide — seed des données de démonstration…"
    npx tsx prisma/seed.ts
  else
    echo "Base déjà peuplée — seed ignoré."
  fi
fi

exec "$@"
