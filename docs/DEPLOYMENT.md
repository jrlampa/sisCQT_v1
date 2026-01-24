# Deploy (Cloud Run / Azure App Service)

## Objetivo

- **Single container** servindo:
  - SPA (build Vite) em `dist/client`
  - API (Express) em `dist/server`
- Porta: `PORT` (padrão `8080`)

## Segredos/variáveis

- **Nunca** versione `.env` com segredos.
- Para DEV com Docker Compose, use `.env` (copie de `\.env.example`).

## Scripts (package.json)

- **Build completo**: `npm run build`
  - `build:client` → `dist/client`
  - `build:server` → `dist/server`
- **Start produção**: `npm run start:prod` (equivalente a `node dist/server/server.js`)
- **Start produção + migrations**: `npm run start:prod:migrate`
- **Aplicar migrations**: `npm run migrate:deploy`

## Dockerfile (multi-stage)

O `Dockerfile` possui targets:

- **`dev`**: para hot reload (usado no `docker-compose.yml`)
- **`prod`**: para produção (Cloud Run / Azure App Service)

Build da imagem prod:

```bash
docker build -t siscqt:prod --target prod .
```

Rodar localmente (prod):

```bash
docker run --rm -p 8080:8080 ^
  -e NODE_ENV=production ^
  -e PORT=8080 ^
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB" ^
  -e MSAL_JWKS_URI="..." ^
  -e MSAL_AUDIENCE="..." ^
  -e MSAL_ISSUER="..." ^
  siscqt:prod
```

## Migrations no startup

O `CMD` da imagem prod aceita:

- `RUN_MIGRATIONS=true` → roda `npm run migrate:deploy` antes de iniciar o server

Exemplo:

```bash
docker run --rm -p 8080:8080 ^
  -e NODE_ENV=production ^
  -e RUN_MIGRATIONS=true ^
  -e DATABASE_URL="postgresql://..." ^
  -e MSAL_JWKS_URI="..." ^
  -e MSAL_AUDIENCE="..." ^
  -e MSAL_ISSUER="..." ^
  siscqt:prod
```

## Cloud Run

- Configure variáveis de ambiente (Auth + DB).
- Configure **health check** apontando para `GET /api/healthz`.
- Para readiness, use `GET /api/readyz`.

## Azure App Service (container)

- Configure `PORT=8080` (ou a porta exigida pelo ambiente).
- Configure variáveis de ambiente (Auth + DB).
- Use `GET /api/healthz` e `GET /api/readyz` para monitoramento.
