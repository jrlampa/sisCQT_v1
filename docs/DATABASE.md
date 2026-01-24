# Banco de dados (Postgres + PostGIS) e Prisma

## Requisitos

- PostgreSQL
- Extensões:
  - `postgis` (GIS é requisito do app)
  - `pgcrypto` (recomendado)

Em desenvolvimento via Docker, as extensões são criadas por:

- `docker/db/init/01-extensions.sql`

## Prisma: migrations (produção)

Fluxo recomendado:

- **Dev (gerar migration ao mudar schema)**:

```bash
npx prisma migrate dev --name "<nome>"
```

- **Prod (aplicar migrations existentes)**:

```bash
npm run migrate:deploy
```

## Variável de conexão

- `DATABASE_URL` (formato Prisma):

```text
postgresql://USER:PASS@HOST:5432/DB
```

Em DEV (Docker Compose), você pode usar `.env`:

- copie `\.env.example` → `.env`
- ajuste `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

## Readiness do DB

O endpoint `GET /api/readyz` faz:

- `SELECT 1` (DB ok)
- valida PostGIS (por padrão) consultando `pg_extension`

Você pode desligar a checagem de PostGIS em ambientes específicos com:

- `READYZ_CHECK_POSTGIS=false`
