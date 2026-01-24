# Operação (health, ready, segurança, troubleshooting)

## Endpoints de health/readiness

- **Liveness**: `GET /api/healthz`
  - sempre retorna `200 { success: true }`
- **Readiness**: `GET /api/readyz`
  - retorna `200 { success: true }` quando DB responde (e PostGIS ok, por padrão)
  - retorna `503 { success: false, error: 'readyz falhou', details }` quando falha

## Endpoints do motor elétrico (CQT)

- **Cálculo**: `POST /api/calculate`
- **Otimização (real)**: `POST /api/optimize`
  - dimensiona cabos iterativamente usando `ElectricalEngine.optimize` (roda em worker quando `ENABLE_ENGINE_WORKER=true`)
- **Monte Carlo (sob demanda)**: `POST /api/montecarlo`
  - simulação estocástica com RNG **seeded** (determinística quando `seed` é enviado)

Configurações:

- `READYZ_TIMEOUT_MS` (default `2000`)
- `READYZ_CHECK_POSTGIS` (`true` por padrão; use `false` se quiser desligar)

## Hardening HTTP

Ativo no server:

- `helmet`
- `compression`
- `express-rate-limit` em `/api`
- limites:
  - `JSON_BODY_LIMIT` (default `2mb`)
  - `URLENCODED_BODY_LIMIT` (default `2mb`)
- proxy:
  - `TRUST_PROXY` (default: `1` em produção; `false` em dev)

Desligar rate limit:

- `RATE_LIMIT_DISABLED=true`

## Logs

O middleware de erro (`middlewares/errorHandler.ts`) loga:

- **>= 500** como `console.error`
- **< 500** como `console.warn`

## Troubleshooting rápido

- **`readyz` falha com “Extensão PostGIS não encontrada”**
  - habilite `postgis` no banco
  - ou, temporariamente, use `READYZ_CHECK_POSTGIS=false`
- **429 “Muitas requisições”**
  - ajuste `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`
  - ou `RATE_LIMIT_DISABLED=true` (não recomendado em produção)
- **SPA não carrega em produção**
  - confirme que `npm run build` gerou `dist/client`
  - confirme que o runtime está servindo `dist/client` (via `NODE_ENV=production`)

## Testes operacionais

- Rodar suíte completa: `npm test`
- E2E (browser): `npm run test:e2e`
- Snapshots visuais locais:
  - PowerShell: `$env:RUN_VISUAL='1'; npm run test:e2e`
