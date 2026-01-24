## Autenticação (Microsoft Entra ID)

### Produção: Entra-only

Em `NODE_ENV=production`:

- **mock auth é ignorado**
- o server valida no boot as variáveis obrigatórias de auth via `assertProdAuthConfig()`

Variáveis obrigatórias:

- `MSAL_JWKS_URI` (URL JWKS)
- `MSAL_AUDIENCE` (um ou mais audiences, separados por vírgula)
- `MSAL_ISSUER` (uma ou mais URLs de issuer, separadas por vírgula)

Se alguma estiver ausente/inválida, o processo **falha ao iniciar** (intencional).

### Desenvolvimento/testes: mock opcional

Em ambiente **não-prod**:

- `ENABLE_MOCK_AUTH=true` habilita mock
- Token esperado no header:
  - `Authorization: Bearer dev-token-im3`

### Claims e domínio permitido

O backend aceita as claims (ordem de preferência):

- `upn`
- `email`
- `preferred_username`

E aplica a regra de domínio:

- deve terminar com `@im3brasil.com.br`

### Checklist rápido de troubleshooting

- **401 “Token não fornecido”**
  - faltou header `Authorization: Bearer <token>`
- **401 “Falha na autenticação”**
  - token inválido/expirado, issuer/audience não batendo, ou JWKS inacessível
- **403 “Domínio não autorizado.”**
  - `upn/email/preferred_username` não termina em `@im3brasil.com.br`

