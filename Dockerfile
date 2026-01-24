# syntax=docker/dockerfile:1

##
## Base (compartilhada)
##
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

##
## Dependências (inclui dev deps para build/dev)
##
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

##
## Dev (para docker-compose com hot reload)
##
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000 8080
CMD ["npm", "run", "dev"]

##
## Build (gera dist/client + dist/server)
##
FROM deps AS build
COPY . .
RUN npm run build

##
## Produção (Cloud Run / Azure App Service)
##
FROM node:20-alpine AS prod
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Necessário para Prisma Client e (opcional) migrations
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY --from=build /app/metadata.json ./metadata.json

EXPOSE 8080
ENV PORT=8080

# Opcional: execute migrations no startup (RUN_MIGRATIONS=true)
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then npm run migrate:deploy; fi; exec node dist/server/server.js"]