# Testes (unit, E2E, a11y, snapshots)

## Visão geral

O projeto possui:

- **Unit/integração (Vitest)**: testes de API (supertest), motor elétrico e componentes React.
- **E2E (Playwright)**: fluxos completos no navegador (Login → Hub → Editor → Chatbot → GIS).
- **Acessibilidade (axe-core)**: checagens automáticas de violações críticas/serious.
- **Snapshots visuais (Playwright)**: baseline para páginas-chave.

Inclui também:

- **Otimização**: testes do `POST /api/optimize` (liga na lógica real).
- **Monte Carlo**: testes do `POST /api/montecarlo` (determinístico com `seed`) e fluxo E2E do botão “Rodar Simulação”.

## Comandos

- Rodar **tudo**:

```bash
npm test
```

- Rodar apenas **unit**:

```bash
npm run test:unit
```

- Rodar apenas **E2E**:

```bash
npm run test:e2e
```

- Rodar E2E em modo UI:

```bash
npm run test:e2e:ui
```

## Snapshots visuais

Por padrão, os snapshots visuais ficam **desabilitados localmente** para não bloquear o fluxo.

- Para habilitar localmente:

```powershell
$env:RUN_VISUAL='1'; npm run test:e2e
```

- Para (re)gerar baselines (Chromium):

```powershell
$env:RUN_VISUAL='1'; npx playwright test e2e/visual.e2e.spec.ts --project=chromium --update-snapshots
```

Baselines ficam em:

- `e2e/visual.e2e.spec.ts-snapshots/`

## Observação sobre a11y e contraste

O check automático desabilita a regra `color-contrast` para reduzir falsos positivos em UI com **glass/blur/gradients**.
Recomendação: validar contraste com auditoria visual e/ou ferramenta dedicada no design system.
