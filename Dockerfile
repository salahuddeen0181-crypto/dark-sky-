# DARKSKY menu — production image (used by docker-compose.yml on the server)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build --turbopack

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
# the build's files go to static-build; at start they are added to .next/static, a volume that keeps the files of
# earlier builds too: a menu page still in Cloudflare's cache right after a deploy asks for those (see Caddyfile)
COPY --from=build /app/.next/static ./static-build
RUN mkdir -p .next/static && chown node:node .next/static
COPY --from=build /app/public ./public
# what scripts/setup-db.mjs needs: the schema and the bundled menu to seed an empty database
COPY --from=build /app/scripts/setup-db.mjs /app/scripts/menu-update-2026-10-26.mjs /app/scripts/sync-media.mjs /app/scripts/menu-update-2026-10-28.mjs /app/scripts/menu-update-2026-10-28b.mjs ./scripts/
COPY --from=build /app/db ./db
COPY --from=build /app/src/lib/darksky-data.js /app/src/lib/darksky-i18n.mjs ./src/lib/
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
USER node
EXPOSE 3000
# this build's files into the shared static folder (files no build has used for 30 days go), schema + first-time
# seed (idempotent), then the server
CMD ["sh", "-c", "cp -r static-build/. .next/static/ && find .next/static -type f -mtime +30 -delete; node scripts/setup-db.mjs && exec node server.js"]
