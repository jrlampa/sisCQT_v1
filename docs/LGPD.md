# LGPD (MVP)

Este documento descreve o mínimo implementado no siSCQT para atender um **MVP de conformidade LGPD**: transparência (políticas), exportação de dados e exclusão de conta.

## O que o app armazena (alto nível)

- **Usuário**: `id`, `email`, `name`, `plan`, `authProvider`, `stripeCustomerId` (quando aplicável).
- **Projetos**: dados do editor (metadados, cenários, cabos, IPs, configurações do memorial).
- **Assinatura (Stripe)**: status/ids (não armazenamos dados de cartão).

## Páginas legais (frontend)

- **Termos**: `/terms`
- **Política de Privacidade (LGPD)**: `/privacy`

## Direitos do titular (DSR) — endpoints

> Todos exigem autenticação (`Authorization: Bearer <token>`).

- **Exportar meus dados (LGPD)**: `GET /api/privacy/export`
  - Retorna JSON com dados do usuário + projetos + assinaturas (quando houver).
  - A UI disponibiliza um botão “Baixar meus dados”.

- **Excluir minha conta (LGPD)**: `POST /api/privacy/delete`
  - Body: `{ "confirm": true }`
  - Remove assinaturas (tabela local), projetos e o usuário.
  - Best-effort: tenta cancelar assinatura no Stripe quando configurado.

## Observações importantes

- **Retenção**: em produção, recomenda-se uma política de retenção de logs e backups (fora do escopo do MVP).
- **Segredos**: use Secret Manager/variáveis do Cloud Run (não commitar `.env`).
- **Provedores**: Microsoft/Google/Stripe/Supabase atuam como operadores/controladores conforme contrato e políticas próprias.

