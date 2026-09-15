# syntax=docker/dockerfile:1
#
# Image unique Yogella : l'API Express sert aussi le build du SPA.
# Un seul service, un seul domaine dans Coolify — pas de CORS, cookies same-site.

# ─── 1. Build du front ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS web-build
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
# --include=dev est obligatoire : Coolify injecte NODE_ENV=production comme ENV
# de build, et dans ce mode npm ci saute les devDependencies — or tsc, vite et
# @vitejs/plugin-react en font partie.
RUN npm ci --include=dev
COPY web/ ./
RUN npm run build

# ─── 2. Build de l'API ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS server-build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
# Idem : le runtime a besoin de la CLI Prisma et de tsx, qu'un NODE_ENV=production
# injecté au build pourrait écarter.
RUN npm ci --include=dev
# Le client Prisma est généré avant la compilation TS (les types en dépendent).
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# ─── 3. Runtime ───────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    WEB_DIST_DIR=/app/web \
    UPLOAD_DIR=/app/uploads

# node_modules embarque la CLI Prisma : l'entrypoint applique les migrations.
COPY --from=server-build /build/server/node_modules ./node_modules
COPY --from=server-build /build/server/dist ./dist
COPY --from=server-build /build/server/package.json ./package.json
COPY server/prisma ./prisma
COPY --from=web-build /build/web/dist ./web
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/uploads \
    && chown -R node:node /app/uploads

USER node
EXPOSE 3000

# Coolify lit ce healthcheck pour valider un déploiement avant de basculer le trafic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/index.js"]
