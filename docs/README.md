## Documentação do sisCQT

Esta pasta reúne documentação operacional e de deploy do **sisCQT** (SPA + API no mesmo container).

### Índice

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — build, Docker (single container), Cloud Run / Azure App Service
- [`AUTH.md`](./AUTH.md) — autenticação Entra ID (JWT), variáveis obrigatórias, mock em dev
- [`DATABASE.md`](./DATABASE.md) — Postgres/PostGIS, migrations Prisma, extensões
- [`OPERATIONS.md`](./OPERATIONS.md) — health/ready endpoints, rate limit, limites de payload, troubleshooting
- [`TESTING.md`](./TESTING.md) — suíte de testes (unit + E2E + a11y + snapshots + CI)

### Quick start (produção local)

1) Build:

```bash
npm run build
```

2) Rodar o server compilado:

```bash
npm run start:prod
```

3) Endpoints:

- `GET /api/healthz`
- `GET /api/readyz`

