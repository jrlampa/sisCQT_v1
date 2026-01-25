# LGPD (MVP)

Este documento descreve o mínimo implementado no siSCQT para atender um **MVP de conformidade LGPD**: transparência (políticas), exportação de dados e exclusão de conta.

> **Importante**: este documento é técnico/operacional e deve estar alinhado com as páginas legais do app (`/privacy` e `/terms`).

## O que o app armazena (alto nível)

- **Usuário**: `id`, `email`, `name`, `plan`, `authProvider`, `stripeCustomerId` (quando aplicável).
- **Projetos**: dados do editor (metadados, cenários, cabos, IPs, configurações do memorial).
- **Assinatura (Stripe)**: status/ids (não armazenamos dados de cartão).

## Páginas legais (frontend)

- **Termos**: `/terms`
- **Política de Privacidade (LGPD)**: `/privacy`

## Finalidades e bases legais (alto nível)

As finalidades principais e respectivas bases legais típicas no MVP são:

- **Execução de contrato**: autenticação/controle de acesso, uso do editor e persistência de projetos.
- **Cumprimento de obrigações / faturamento**: gestão de assinatura/cobrança quando o plano Pro estiver habilitado.
- **Legítimo interesse**: segurança, prevenção a abuso/fraude, logs técnicos, diagnóstico e melhoria contínua do serviço (observados direitos e expectativas do titular).

## Operadores / provedores (processadores)

O siSCQT pode utilizar provedores para viabilizar autenticação, banco de dados e cobrança. Em termos práticos (MVP):

- **Supabase (PostgreSQL + PostGIS)**: armazenamento de usuários/projetos/assinaturas.
- **Microsoft Entra ID**: autenticação corporativa (quando habilitado).
- **Google**: autenticação (quando habilitado).
- **Stripe**: pagamentos/assinaturas (quando habilitado).

### Stripe (pagamentos) — observações

- **Não armazenamos dados de cartão** no siSCQT.
- Persistimos apenas **identificadores e status** da assinatura para habilitar/desabilitar recursos (ex.: `stripeCustomerId`, `subscriptionId`, `status`, `priceId`).
- No checkout do plano Pro, é recomendado exigir aceite dos Termos via **clickwrap** (Stripe Checkout `consent_collection.terms_of_service = required`) e registrar versão/data dos Termos em metadata para auditoria.

## Transferência internacional

Dependendo da região/configuração dos provedores, dados podem ser processados/armazenados fora do Brasil (ex.: infraestrutura de nuvem, autenticação e pagamentos). O MVP assume esse cenário e recomenda manter medidas técnicas e contratuais compatíveis com a política e com a legislação aplicável.

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
- **Provedores**: Microsoft/Google/Stripe/Supabase podem atuar como operadores/controladores conforme contrato e políticas próprias.

