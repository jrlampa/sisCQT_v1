# sisCQT Enterprise AI — Engenharia de Redes BT

O **sisCQT Enterprise AI** é uma plataforma avançada de engenharia elétrica dedicada ao projeto, simulação e dimensionamento de redes de distribuição de Baixa Tensão (BT). Desenvolvido com uma interface **Glassmorphism Light**, o sistema une precisão normativa com uma experiência de usuário fluida e moderna.

## 🚀 Funcionalidades Principais

- **Hub de Projetos**: Gestão centralizada de estudos de rede com suporte a clonagem, edição de metadados geotécnicos (SOB, Ponto Elétrico, Coordenadas) e controle de versões.
- **Motor de Cálculo Theseus 3.1**: Algoritmo proprietário para cálculo de fluxo de carga, queda de tensão acumulada (CQT) e ocupação de transformadores baseado nas normas PRODIST e ABNT.
- **Editor de Topologia em Cascata**: Interface dinâmica para construção de redes, permitindo o controle individual de trechos, tipos de condutores e cargas (Residenciais, Especiais e IP).
- **Matriz de Comparação de Cenários**: Análise técnica lado a lado para validação de alternativas (ex: "Rede Atual" vs "Projeto de Reforço").
- **Theseus AI (Cognitivo)**: Assistente de engenharia integrado que analisa pontos críticos de sobrecarga e sugere otimizações baseadas em melhor custo-benefício.
- **Diagrama Unifilar Interativo**: Visualização gráfica da árvore de rede com indicadores de saúde térmica e níveis de tensão em tempo real.
- **Memorial Descritivo Automatizado**: Geração de relatório técnico completo, pronto para impressão, com justificativas, quadros de cargas e resumo de materiais.

## 🛠️ Stack Técnica

- **Frontend**: React 19 com TypeScript.
- **Estilização**: Tailwind CSS com efeitos de Glassmorphism (blur, transparência e camadas).
- **Gráficos**: Recharts para diagnóstico de carregamento.
- **Motor Cognitivo**: Gemini API (Integration via `GeminiService`).
- **Engenharia**: Lógica de cálculo em TypeScript (ElectricalEngine) com suporte a fatores de diversidade (DMDI).

## 📐 Metodologia de Cálculo

A plataforma utiliza o método dos momentos de carga para determinação da queda de tensão:
$$CQT = \sum (kVA \cdot L \cdot Coef_{cabo} \cdot 0.5)$$

- **Normativas suportadas**: PRODIST (Aneel) e ABNT.
- **Perfis de Carga**: Urbano Padrão, Rural e Massivos (configuráveis por cenário).
- **DMDI**: Fator de diversidade dinâmico baseado no número de consumidores e classe de carga.

## 📁 Estrutura do Projeto

- `/components`: Interface modular (Dashboard, Editor, Hub, etc).
- `/services`: Core de engenharia e integração com o motor de IA.
- `types.ts`: Definições rigorosas de contratos de dados.
- `constants.ts`: Catálogo técnico de cabos, tabelas DMDI e perfis normativos.

## ▶️ Rodando localmente (recomendado: Docker)

### Pré-requisitos

- Docker Desktop (com suporte a Docker Compose)

### Subir app + banco (PostGIS)

1) Na raiz do projeto:

```bash
docker compose up --build
```

Observação: o `docker-compose.yml` aplica o schema via **Prisma Migrations** (`prisma migrate deploy`) antes de subir a API.

2) Acesse:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`

### Extensões do banco (PostGIS + pgcrypto)

O banco sobe com scripts de init em `docker/db/init/` (executados **somente no primeiro init do volume**). Se você já tinha um volume antigo, recrie o volume para aplicar:

```bash
docker compose down -v
docker compose up --build
```

### Trabalhando com migrations (Prisma)

- Para criar uma nova migration após editar `prisma/schema.prisma`, rode localmente:

```bash
npx prisma migrate dev --name "<nome-da-migration>"
```

- Em produção/containers, o fluxo esperado é aplicar migrations com:

```bash
npm run migrate:deploy
```

---
**IM3 Brasil — Engenharia Digital**  
*Transformando dados de rede em decisões de alta performance.*
