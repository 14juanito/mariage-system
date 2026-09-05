#!/usr/bin/env bash
# Démarre un PostgreSQL local jetable pour le développement.
#
# Utile parce que l'environnement de dev peut être éphémère (/tmp vidé entre
# les sessions) : ce script est idempotent et recrée tout au besoin.
# Il ne sert QU'au développement — la production utilise Neon.
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/18/bin}"
PGDATA="${PGDATA:-/tmp/mariage_pg_data}"
PGPORT="${PGPORT:-5440}"
PGPASS="${PGPASS:-devpassword_local_only}"
DB_NAME="${DB_NAME:-mariage_system}"

export PATH="$PG_BIN:$PATH"

if pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
  echo "✅ PostgreSQL déjà actif sur le port $PGPORT"
else
  if [ ! -d "$PGDATA" ]; then
    echo "→ Initialisation du cluster dans $PGDATA"
    initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 >/dev/null
  fi
  echo "→ Démarrage sur le port $PGPORT"
  pg_ctl -D "$PGDATA" -l /tmp/mariage_pg.log \
    -o "-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1" start >/dev/null
  # pg_ctl rend la main avant que le serveur n'accepte les connexions.
  for _ in $(seq 1 20); do
    pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

psql -h /tmp -p "$PGPORT" -U postgres -c \
  "ALTER USER postgres PASSWORD '$PGPASS';" >/dev/null

if ! psql -h /tmp -p "$PGPORT" -U postgres -lqt | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
  createdb -h /tmp -p "$PGPORT" -U postgres "$DB_NAME"
  echo "→ Base « $DB_NAME » créée"
fi

echo "✅ Prêt : postgresql://postgres:$PGPASS@127.0.0.1:$PGPORT/$DB_NAME"
echo "   Ensuite : npx prisma migrate deploy && npm run prisma:seed"
